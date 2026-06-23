---
title: "ESP32-S3 + écran rond GC9A01 + BMP180 : tutoriel complet d'altimètre de randonnée DIY (SPI + I2C + Arduino)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/bmp180
category: esp32
date: 2026-06-23
intro: "Pilotez l'écran couleur rond GC9A01 1,28 pouces avec un ESP32-S3, couplé au capteur de pression BMP180, pour réaliser un altimètre de randonnée avec fond de paysage montagneux dynamique, altitude en temps réel, dénivelé cumulé et pression atmosphérique. Code Arduino complet et schéma de câblage inclus."
image: "https://img.lingflux.com/2026/06/cc83e55f42460646d2fd372496989222.jpg"
---

> Difficulté : ⭐⭐⭐☆☆ (accessible si vous avez déjà soudé quelques fils Dupont)
> Temps estimé : 45 minutes
> Environnement de test : Arduino IDE 2.3.2 · Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · ESP32 Arduino Core 3.0.x

---

> **TL;DR (démarrage rapide) :**
> 1. **Câblage de l'écran** : GC9A01 → CS/GPIO9, DC/GPIO10, SCK/GPIO12, MOSI/GPIO11, RST/GPIO18, BL/GPIO7
> 2. **Câblage du capteur** : BMP180 → SDA/GPIO13, SCL/GPIO14
> 3. **Le rétroéclairage doit être forcé à l'état HAUT** : ajoutez `digitalWrite(TFT_BL, HIGH)` dans `setup()`, sans cette ligne l'écran reste désespérément noir
> 4. **Installez deux bibliothèques** : Arduino_GFX_Library (par moononournation) + Adafruit BMP085 Library
> 5. **Téléversez directement**, ouvrez le moniteur série (115200), quand vous voyez `Initialisation terminée, entrée dans la boucle principale` c'est gagné

---

## Préambule

J'aime beaucoup la randonnée, mais ces derniers temps je me contente de gravir le Baiyun Mountain, sac à dos rempli d'une batterie externe, d'un téléphone et de crème solaire, sans pour autant posséder le moindre appareil capable de me dire en temps réel « tu as gravi tant de mètres ». Les applications mobiles réclament une connexion, le signal GPS est capricieux, et chaque fois que je sors mon smartphone, j'ai cette désagréable impression d'être « juste là pour la photo ». J'ai donc décidé de me fabriquer mon propre altimètre de randonnée.

En rentrant, en fouillant ma boîte à composants, je tombe sur un écran rond GC9A01 qui prenait la poussière depuis trop longtemps — sa forme circulaire rappelle étrangement le cadran d'une montre d'alpinisme. Associé à un capteur de pression BMP180 et à un ESP32-S3, trois composants pour moins de 50 yuans au total, le résultat a largement dépassé mes attentes.

Objectif de cet article : partir de zéro, câbler ces trois composants ensemble, téléverser le code et obtenir un altimètre de randonnée qui affiche en temps réel l'altitude, le dénivelé positif/négatif cumulé et la pression, avec un fond de paysage qui change de couleur en fonction de l'altitude. Suivez le guide, vous pourrez reproduire le projet sans difficulté.

---

## Résultat de l'expérience

Résultat final : l'écran rond GC9A01 affiche en temps réel l'altitude courante (m), le dénivelé positif cumulé (flèche orange vers le haut), le dénivelé négatif cumulé (flèche bleue vers le bas) et la pression instantanée. Le fond de l'écran est un paysage de montagnes dont les couleurs évoluent dynamiquement avec le rapport d'altitude — des tons brun chaud à basse altitude, qui virent progressivement au bleu profond en hauteur, tandis que la ligne de neige au sommet descend à mesure que l'altitude augmente. Un anneau de progression doré suit l'avancée en altitude sur le bord de l'écran ; un appui long de 2 secondes sur le bouton BOOT permet de remettre à zéro et de recalculer.

![](https://img.lingflux.com/2026/06/9cedc6308f5ac8b32bb260be186b9298.jpg)

---

## Présentation des composants

> Inutile de présenter la carte de développement ESP32-S3 : si vous lisez cet article, c'est que vous avez déjà utilisé un ESP32. Voici donc les deux autres acteurs de ce projet.

### Capteur de pression BMP180

Le BMP180 est un capteur de pression MEMS qui mesure la pression atmosphérique et en déduit l'altitude. Dans ce projet, son rôle est d'échantillonner la pression et l'altitude une fois par seconde, fournissant ainsi la source de données de tout le tableau de bord.

En termes simples : c'est comme une « mini station météo » de poche — en mesurant la pression atmosphérique, il remonte à l'altitude à laquelle vous vous trouvez. Le principe est le même que celui qui fait que vos oreilles se bouchent lors de la montée ou la descente d'un avion : plus la pression baisse, plus l'altitude augmente. La température influençant la mesure de pression, le capteur intègre également un thermomètre pour corriger les relevés et rendre l'altitude plus précise.

| Caractéristique | Valeur |
| --- | --- |
| Tension de fonctionnement | 1,8 V ~ 3,6 V (alimentation en 3,3 V) |
| Protocole de communication | I2C (adresse fixe 0x77) |
| Plage de pression | 300 ~ 1100 hPa |
| Précision d'altitude | Mode standard ±1 m, mode haute précision ±0,5 m |
| Courant consommé | 0,1 µA en veille ; 650 µA en crête (pendant la conversion) ; 3–32 µA en moyenne à 1 Hz (selon le mode) |

Pourquoi le choisir : le module est bon marché, la bibliothèque Adafruit est parfaitement supportée, et la précision est largement suffisante pour enregistrer une randonnée. Si vous avez besoin d'une meilleure précision ou de données d'humidité, vous pouvez passer au BMP280 ou au BME280 — mais ce sera pour un autre article.

### Écran TFT couleur rond GC9A01

Le GC9A01 est le circuit pilote de l'écran TFT couleur rond de 1,28 pouce : il reçoit les données SPI et commande le panneau d'affichage circulaire de 240×240 pixels. Dans ce projet, son rôle est de dessiner le fond de montagnes dynamique et d'afficher les données d'altitude en temps réel.

En termes simples : imaginez le cadran rond d'une montre connectée, et vous y êtes. Il communique via le protocole SPI, son taux de rafraîchissement est rapide, et son format circulaire est tout indiqué pour un tableau de bord. Couplé au double buffer Canvas de la Arduino_GFX_Library, les animations sont fluides et sans scintillement.

| Caractéristique | Valeur |
| --- | --- |
| Taille d'écran | 1,28 pouce (rond) |
| Résolution | 240 × 240 pixels |
| Circuit pilote | GC9A01 |
| Interface | SPI (jusqu'à 80 MHz) |
| Tension de fonctionnement | 3,3 V |
| Profondeur de couleur | 16 bits RGB565 (65 536 couleurs) |

Pourquoi le choisir : l'écran rond s'accorde naturellement au thème « montre de montagne », son diamètre permet de caser sans encombrement le grand chiffre d'altitude, les indicateurs de dénivelé et l'anneau de progression.

---

## Liste de composants (BOM)

| Composant | Référence / Spécification | Quantité |
| --- | --- | --- |
| Carte de développement | ESP32-S3 (version USB-C recommandée) | 1 |
| Capteur de pression | Module BMP180 (module prêt à l'emploi avec résistances de tirage I2C) | 1 |
| Écran couleur rond | GC9A01 TFT 1,28 pouce, 240×240 | 1 |
| Fils de connexion | Fils Dupont (femelle-femelle) | Plusieurs |
| Alimentation | Câble de données USB-C + ordinateur / chargeur | 1 |

---

## Description des broches

### Broches du GC9A01

| Broche de l'écran | Description |
| --- | --- |
| VCC | Pôle positif de l'alimentation, à connecter au 3,3 V |
| GND | Pôle négatif de l'alimentation |
| SCL / CLK | Ligne d'horloge SPI |
| SDA / MOSI | Ligne de données SPI (maître → esclave) |
| CS | Chip select (actif à l'état bas) |
| DC | Sélection données / commande |
| RST | Reset (déclenché à l'état bas) |
| BL | Contrôle du rétroéclairage, **s'allume à l'état HAUT** |

### Broches du BMP180

| Broche du capteur | Description |
| --- | --- |
| VCC | Pôle positif de l'alimentation, à connecter au 3,3 V |
| GND | Pôle négatif de l'alimentation |
| SCL | Ligne d'horloge I2C |
| SDA | Ligne de données I2C |

---

## Câblage

### GC9A01 → ESP32-S3

| Broche GC9A01 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3,3 V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL (rétroéclairage) | GPIO 7 |

### BMP180 → ESP32-S3

| Broche BMP180 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3,3 V |
| GND | GND |
| SCL | GPIO 14 |
| SDA | GPIO 13 |



> **Une fois le câblage terminé, vérifiez chaque fil un par un : cela vous évitera 80 % du temps de débogage.** Deux pièges sont particulièrement fréquents : d'abord, brancher le BL (rétroéclairage) sur GPIO7 ne suffit pas, il faut aussi l'accompagner dans le code d'un `digitalWrite(TFT_BL, HIGH)` pour qu'il s'allume ; ensuite, les SCL/SDA du GC9A01 empruntent le **protocole SPI**, tandis que les SCL/SDA du BMP180 empruntent le **protocole I2C** — bien que les noms soient identiques, ce sont deux bus totalement indépendants et les broches ne doivent absolument pas être mélangées.

---

## Bibliothèques à installer

Ouvrez Arduino IDE → Outils → Gérer les bibliothèques, recherchez et installez les trois suivantes :

| Bibliothèque | Auteur | Rôle |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | Pilote de l'écran GC9A01 + rendu Canvas à double buffer |
| Adafruit BMP085 Library | Adafruit | Pilote du capteur de pression BMP180 / BMP085 |
| Adafruit Unified Sensor | Adafruit | Dépendance de la précédente, à installer avec |

> **Versions testées avec succès** : Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · Arduino IDE 2.3.2 · ESP32 Arduino Core 3.0.x
> Si vous utilisez une ancienne version de l'ESP32 Core (série 1.x), l'initialisation SPI diffère légèrement ; il est conseillé de passer directement à la version 3.x pour éviter les ennuis.

---

## Code complet

```cpp
/*
  ============================================================
  Altimètre de randonnée (Mountain Altitude Logger)
  ============================================================
  Matériel : ESP32-S3 + écran rond GC9A01 (240x240) + capteur de pression BMP180
  ============================================================
*/

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>

// ===================== Étape 1 : définition des broches et paramètres =====================
#define TFT_CS    9    // chip select de l'écran
#define TFT_DC    10   // sélection données/commande
#define TFT_SCK   12   // horloge SPI
#define TFT_MOSI  11   // données SPI (maître → esclave)
#define TFT_RST   18   // reset de l'écran
#define TFT_BL    7    // contrôle du rétroéclairage (s'allume à l'état HAUT, il faut le forcer !)
#define TFT_MISO  -1   // pas besoin de MISO (écriture seule, pas de lecture)

#define BMP_SDA   13   // ligne de données I2C du BMP180
#define BMP_SCL   14   // ligne d'horloge I2C du BMP180

#define BTN_PIN   0    // bouton BOOT intégré, appui long 2 s pour remise à zéro/calibration
#define CALIBRATION_HOLD_MS 2000  // seuil de déclenchement de l'appui long (millisecondes)

#define FILTER_SIZE 5     // fenêtre du filtre moyenne glissante (moyenne des 5 derniers échantillons)
#define DEAD_ZONE   0.3f  // zone morte du dénivelé cumulé (ignore les fluctuations < 0,3 m)
#define ALT_RANGE_MAX 3000.0f  // altitude maximale correspondant au cercle complet de l'anneau (3000 m)

// ===================== Étape 2 : objets pilotes matériels =====================
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, TFT_MISO);
Arduino_GFX *gfx = new Arduino_GC9A01(bus, TFT_RST, 0 /* rotation */, true /* mode IPS */);
// Double buffer Canvas : tout le dessin est d'abord écrit dans un canevas en mémoire,
// puis flush() pousse l'ensemble d'un coup à l'écran, éliminant le scintillement
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

Adafruit_BMP085 bmp;

// ===================== Étape 3 : structure de données =====================
struct AltitudeData {
  float currentAltitude = 0;       // altitude courante (après filtrage)
  float maxAltitude = 0;           // altitude maximale de cet enregistrement
  float totalAscent = 0;           // dénivelé positif cumulé
  float totalDescent = 0;          // dénivelé négatif cumulé
  float currentPressure = 1013.25; // pression courante (hPa)

  // Les « valeurs affichées » ci-dessous servent à l'interpolation d'animation,
  // pour que les chiffres passent en douceur sans saccades
  float displayedAltitude = 0;
  float displayedAscent = 0;
  float displayedDescent = 0;
  float displayedPressure = 1013.25;
} data;

// Tampon circulaire pour la moyenne glissante
float altBuffer[FILTER_SIZE] = {0};
int filterIndex = 0;
int filterCount = 0;

// Constantes de couleur (initialisées avec color565() dans setup() pour éviter d'allouer les ressources trop tôt)
uint16_t COLOR_WHITE, COLOR_BLACK, COLOR_CREAM_GREEN;

// État du bouton
unsigned long btnPressStart = 0;
bool btnIsPressed = false;
bool calibrationTriggered = false;


// ============================================================
//                   Module 1 : lecture du capteur
// ============================================================

void initSensor() {
  Serial.print("[Sensor] Initialisation du bus I2C (SDA=");
  Serial.print(BMP_SDA);
  Serial.print(", SCL=");
  Serial.print(BMP_SCL);
  Serial.println(")...");

  Wire.begin(BMP_SDA, BMP_SCL);

  Serial.println("[Sensor] Connexion au capteur BMP180...");
  if (!bmp.begin()) {
    // Si le programme reste bloqué ici en imprimant ERROR, c'est que le câblage du capteur pose problème
    // L'écran ne s'allumera pas non plus, car le code n'ira jamais plus loin
    while (1) {
      Serial.println("[ERROR] Échec de l'initialisation du BMP180 ! Vérifiez le câblage, l'alimentation (3,3 V) et les broches I2C.");
      delay(2000);
    }
  }
  Serial.println("[Sensor] BMP180 connecté avec succès !");
}

// Lit une fois la pression et l'altitude brutes depuis le BMP180
void sampleSensor(float &rawAltitude, float &rawPressure) {
  rawPressure = bmp.readPressure() / 100.0f;  // conversion Pa → hPa
  rawAltitude = bmp.readAltitude(101325);      // 101325 Pa = pression standard au niveau de la mer
}


// ============================================================
//                   Module 2 : traitement des données
// ============================================================

// Moyenne glissante : moyenne des FILTER_SIZE dernières lectures pour réduire le bruit du capteur
float smoothAltitude(float raw) {
  altBuffer[filterIndex] = raw;
  filterIndex = (filterIndex + 1) % FILTER_SIZE;
  if (filterCount < FILTER_SIZE) filterCount++;

  float sum = 0;
  for (int i = 0; i < filterCount; i++) sum += altBuffer[i];
  return sum / filterCount;
}

// Met à jour les statistiques : altitude maximale, dénivelé positif et négatif cumulés
void updateStats(float smoothedAltitude) {
  static bool firstSample = true;
  static float lastAltitude = 0;

  if (firstSample) {
    lastAltitude = smoothedAltitude;
    data.maxAltitude = smoothedAltitude;
    firstSample = false;
  }

  float delta = smoothedAltitude - lastAltitude;
  // On ne comptabilise que les variations dépassant la zone morte,
  // pour éviter que les micro-fluctuations sur le plat ne gonflent artificiellement le dénivelé
  if (delta > DEAD_ZONE) {
    data.totalAscent += delta;
  } else if (delta < -DEAD_ZONE) {
    data.totalDescent += -delta;
  }

  if (smoothedAltitude > data.maxAltitude) {
    data.maxAltitude = smoothedAltitude;
  }

  lastAltitude = smoothedAltitude;
  data.currentAltitude = smoothedAltitude;
}


// ============================================================
//                   Module 3 : bouton et calibration
// ============================================================

void showCalibrationFlash();  // déclaration anticipée

// Déclenché par un appui long sur BOOT : remet à zéro le dénivelé et reprend l'altitude courante comme référence
void doCalibration() {
  Serial.println("[Button] Appui long détecté, calibration (remise à zéro) de l'altitude en cours...");
  data.totalAscent = 0;
  data.totalDescent = 0;
  data.displayedAscent = 0;
  data.displayedDescent = 0;
  data.maxAltitude = data.currentAltitude;

  showCalibrationFlash();
  Serial.println("[Button] Calibration terminée.");
}

// Détecte l'état du bouton, le bouton BOOT est actif à l'état bas
void handleButton() {
  bool pressed = (digitalRead(BTN_PIN) == LOW);

  if (pressed && !btnIsPressed) {
    btnIsPressed = true;
    btnPressStart = millis();
    calibrationTriggered = false;
  } else if (pressed && btnIsPressed) {
    // Appui long dépassant le seuil et pas encore déclenché : exécute la calibration
    if (!calibrationTriggered && (millis() - btnPressStart >= CALIBRATION_HOLD_MS)) {
      doCalibration();
      calibrationTriggered = true;  // évite les déclenchements répétés pendant l'appui long
    }
  } else if (!pressed && btnIsPressed) {
    btnIsPressed = false;
  }
}


// ============================================================
//                   Module 4 : rendu de l'interface
// ============================================================

// Interpolation linéaire entre deux couleurs RGB565 (t de 0.0 à 1.0)
uint16_t lerpColor(uint16_t colorA, uint16_t colorB, float t) {
  t = constrain(t, 0.0, 1.0);
  uint8_t r1 = (colorA >> 11) & 0x1F, g1 = (colorA >> 5) & 0x3F, b1 = colorA & 0x1F;
  uint8_t r2 = (colorB >> 11) & 0x1F, g2 = (colorB >> 5) & 0x3F, b2 = colorB & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// Dessine le fond de ciel en dégradé : brun chaud à basse altitude, bleu profond en hauteur
void drawSkyBackground(float altitudeRatio) {
  uint16_t topLow     = canvas->color565(176, 196, 210);  // zénith à basse altitude : bleu pâle
  uint16_t topHigh    = canvas->color565(30, 30, 90);     // zénith à haute altitude : bleu profond
  uint16_t bottomLow  = canvas->color565(210, 200, 180);  // horizon à basse altitude : gris chaud
  uint16_t bottomHigh = canvas->color565(70, 90, 140);    // horizon à haute altitude : gris bleuté

  uint16_t topColor    = lerpColor(topLow, topHigh, altitudeRatio);
  uint16_t bottomColor = lerpColor(bottomLow, bottomHigh, altitudeRatio);

  for (int y = 0; y < 240; y++) {
    float t = (float)y / 240.0;
    canvas->drawFastHLine(0, y, 240, lerpColor(topColor, bottomColor, t));
  }
}

// Dessine un sommet individuel (avec ligne de neige), greenFraction contrôle la position de la ligne de neige ;
// plus l'altitude est élevée, plus la ligne de neige descend
void drawSnowyPeak(int16_t apexX, int16_t apexY, int16_t baseLeftX, int16_t baseRightX,
                    int16_t baseY, uint16_t bodyColor, float greenFraction) {
  canvas->fillTriangle(apexX, apexY, baseLeftX, baseY, baseRightX, baseY, bodyColor);

  greenFraction = constrain(greenFraction, 0.05f, 0.85f);
  int16_t snowY      = apexY + (baseY - apexY) * greenFraction;
  int16_t snowLeftX  = apexX + (baseLeftX - apexX) * greenFraction;
  int16_t snowRightX = apexX + (baseRightX - apexX) * greenFraction;

  canvas->fillTriangle(apexX, apexY, snowLeftX, snowY, snowRightX, snowY, COLOR_CREAM_GREEN);
}

// Dessine trois sommets à différentes distances pour l'effet de profondeur
void drawMountains(float altitudeRatio) {
  float greenRatio = 1.0f - altitudeRatio;  // plus l'altitude est élevée, moins il y a de végétation et plus la ligne de neige descend

  drawSnowyPeak(60,  110, -20, 140, 240, canvas->color565(60, 75, 65),  greenRatio * 0.7);
  drawSnowyPeak(200, 130, 150, 260, 240, canvas->color565(70, 85, 75),  greenRatio * 0.6);
  drawSnowyPeak(130, 70,  40,  220, 240, canvas->color565(45, 55, 50),  greenRatio);
}

// Dessine un arc de cercle (fonction de base de l'anneau de progression)
void drawRingArc(int16_t cx, int16_t cy, int16_t radius, int16_t thickness,
                  float startDeg, float endDeg, uint16_t color) {
  for (float deg = startDeg; deg <= endDeg; deg += 1.0) {
    float rad = deg * PI / 180.0;
    int16_t x0 = cx + cos(rad) * (radius - thickness / 2);
    int16_t y0 = cy + sin(rad) * (radius - thickness / 2);
    int16_t x1 = cx + cos(rad) * (radius + thickness / 2);
    int16_t y1 = cy + sin(rad) * (radius + thickness / 2);
    canvas->drawLine(x0, y0, x1, y1, color);
  }
}

// Dessine l'anneau de progression d'altitude sur le bord de l'écran,
// allumant un arc doré selon le rapport d'altitude
void drawProgressRing(float altitudeRatio) {
  int16_t cx = 120, cy = 120, radius = 115, thickness = 6;
  // Dessine d'abord l'anneau de fond gris
  drawRingArc(cx, cy, radius, thickness, -90, 269, canvas->color565(50, 50, 60));
  // Puis recouvre en or la partie de progression déjà gravie
  float endAngle = -90 + altitudeRatio * 359.0;
  drawRingArc(cx, cy, radius, thickness, -90, endAngle, canvas->color565(255, 200, 80));
}

// Dessine un texte avec un contour noir, pour éviter que le texte blanc se fonde dans un fond clair
void drawTextWithHalo(int16_t x, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  canvas->setTextColor(haloColor);
  // Dessine le contour avec un décalage de 1 pixel dans les quatre directions
  canvas->setCursor(x - 1, y); canvas->print(text);
  canvas->setCursor(x + 1, y); canvas->print(text);
  canvas->setCursor(x, y - 1); canvas->print(text);
  canvas->setCursor(x, y + 1); canvas->print(text);

  canvas->setTextColor(textColor);
  canvas->setCursor(x, y);
  canvas->print(text);
}

// Dessine un texte centré, en calculant automatiquement le décalage à partir de la largeur du texte
void drawCenteredText(int16_t centerX, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  int16_t x1, y1;
  uint16_t w, h;
  canvas->getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  drawTextWithHalo(centerX - w / 2, y, text, textSize, textColor, haloColor);
}

// Dessine la couche de superposition de toutes les données textuelles
void drawDataOverlay() {
  char buf[32];

  // Grand chiffre au centre : valeur d'altitude courante
  sprintf(buf, "%d", (int)round(data.displayedAltitude));
  drawCenteredText(120, 68, buf, 4, COLOR_WHITE, COLOR_BLACK);
  drawCenteredText(120, 104, "m", 2, COLOR_WHITE, COLOR_BLACK);

  // À gauche : triangle orange vers le haut + dénivelé positif cumulé
  int16_t ascX = 58, ascY = 138;
  canvas->fillTriangle(ascX, ascY - 8, ascX - 7, ascY + 5, ascX + 7, ascY + 5,
                       canvas->color565(255, 140, 60));
  sprintf(buf, "%dm", (int)round(data.displayedAscent));
  drawTextWithHalo(ascX + 13, ascY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // À droite : triangle bleu vers le bas + dénivelé négatif cumulé
  int16_t desX = 150, desY = 138;
  canvas->fillTriangle(desX, desY + 8, desX - 7, desY - 5, desX + 7, desY - 5,
                       canvas->color565(120, 180, 255));
  sprintf(buf, "%dm", (int)round(data.displayedDescent));
  drawTextWithHalo(desX + 13, desY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // Petit texte en bas : pression en temps réel
  sprintf(buf, "Press: %.1f hPa", data.displayedPressure);
  drawCenteredText(120, 162, buf, 1, COLOR_WHITE, COLOR_BLACK);
}

// Fonction de rendu principale : dessine dans l'ordre fond → montagnes → anneau de progression → chiffres,
// puis flush pousse le tout à l'écran
void renderUI() {
  float altitudeRatio = constrain(data.displayedAltitude / ALT_RANGE_MAX, 0.0f, 1.0f);

  drawSkyBackground(altitudeRatio);
  drawMountains(altitudeRatio);
  drawProgressRing(altitudeRatio);
  drawDataOverlay();

  canvas->flush();  // pousse le tampon mémoire du Canvas d'un coup vers l'écran physique
}

// Animation de clignotement en cas de calibration réussie
void showCalibrationFlash() {
  for (int i = 0; i < 2; i++) {
    canvas->fillScreen(COLOR_WHITE);
    canvas->flush();
    delay(120);

    canvas->fillScreen(COLOR_BLACK);
    canvas->setTextColor(COLOR_WHITE);
    canvas->setTextSize(2);
    canvas->setCursor(48, 112);
    canvas->print("Calibrated!");
    canvas->flush();
    delay(120);
  }
  delay(300);
}


// ============================================================
//                       setup / loop
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- [System] Démarrage de l'altimètre de randonnée ---");

  // Rétroéclairage forcé à l'état HAUT, sans cette étape l'écran reste éternellement noir
  Serial.println("[TFT] Configuration de la broche de rétroéclairage...");
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  pinMode(BTN_PIN, INPUT_PULLUP);  // pull-up interne du bouton BOOT

  // Initialisation du pilote d'écran
  Serial.println("[TFT] Initialisation du Canvas...");
  if (!canvas->begin()) {
    Serial.println("[ERROR] Échec de l'initialisation du pilote d'écran ! Vérifiez la configuration des broches SPI.");
  } else {
    Serial.println("[TFT] Pilote d'écran initialisé avec succès.");
  }

  COLOR_WHITE       = canvas->color565(255, 255, 255);
  COLOR_BLACK       = canvas->color565(0, 0, 0);
  COLOR_CREAM_GREEN = canvas->color565(205, 235, 195);  // couleur de neige au sommet (vert-blanc pâle)

  canvas->fillScreen(COLOR_BLACK);
  canvas->flush();

  // Initialisation du capteur
  initSensor();

  // Lecture des premières données au démarrage, pour initialiser toutes les valeurs affichées
  Serial.println("[Sensor] Lecture des données initiales au démarrage...");
  float rawAlt, rawPress;
  sampleSensor(rawAlt, rawPress);

  Serial.print("[Sensor] Lecture au démarrage → Pression : ");
  Serial.print(rawPress);
  Serial.print(" hPa | Altitude : ");
  Serial.print(rawAlt);
  Serial.println(" m");

  data.currentAltitude   = rawAlt;
  data.maxAltitude       = rawAlt;
  data.displayedAltitude = rawAlt;
  data.currentPressure   = rawPress;
  data.displayedPressure = rawPress;

  // Pré-remplit le tampon du filtre avec l'altitude au démarrage,
  // pour éviter que la valeur ne saute de 0 à l'altitude réelle au lancement
  for (int i = 0; i < FILTER_SIZE; i++) altBuffer[i] = rawAlt;
  filterCount = FILTER_SIZE;

  Serial.println("--- [System] Initialisation terminée, entrée dans la boucle principale ---");
}

// Minuteur d'échantillonnage du capteur (toutes les 1 seconde)
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL = 1000;

// Minuteur de rendu de l'écran (environ 33 fps)
unsigned long lastRenderTime = 0;
const unsigned long RENDER_INTERVAL = 30;

void loop() {
  handleButton();

  unsigned long now = millis();

  // --- Tâche basse fréquence : échantillonnage du capteur toutes les 1 seconde ---
  if (now - lastSampleTime >= SAMPLE_INTERVAL) {
    lastSampleTime = now;

    float rawAltitude, rawPressure;
    sampleSensor(rawAltitude, rawPressure);

    float smoothed = smoothAltitude(rawAltitude);
    updateStats(smoothed);
    data.currentPressure = rawPressure;

    // Journal série en temps réel, pour vérifier au débogage que le capteur fonctionne
    Serial.print("[Loop] Brut : ");  Serial.print(rawAltitude);
    Serial.print("m | Filtré : ");   Serial.print(data.currentAltitude);
    Serial.print("m | Pression : "); Serial.print(data.currentPressure);
    Serial.print(" hPa | D+ : ");    Serial.println(data.totalAscent);
  }

  // --- Tâche haute fréquence : rendu de l'interface à environ 33 fps ---
  if (now - lastRenderTime >= RENDER_INTERVAL) {
    lastRenderTime = now;

    // Lissage exponentiel : les chiffres affichés suivent en douceur la valeur réelle,
    // le coefficient 0.12 contrôle la vitesse de suivi
    data.displayedAltitude += (data.currentAltitude  - data.displayedAltitude) * 0.12f;
    data.displayedAscent   += (data.totalAscent      - data.displayedAscent)   * 0.12f;
    data.displayedDescent  += (data.totalDescent     - data.displayedDescent)  * 0.12f;
    data.displayedPressure += (data.currentPressure  - data.displayedPressure) * 0.12f;

    renderUI();
  }

  delay(2);
}
```

---

## Explications du code

Le code se divise en quatre modules indépendants sur le plan logique :

**Module 1 : lecture du capteur** — `initSensor()` initialise le bus I2C et vérifie que le BMP180 est en ligne ; en cas d'échec, il entre dans une boucle infinie qui imprime l'erreur sans aller plus loin (pratique pour cibler rapidement le problème). `sampleSensor()` renvoie à chaque appel la pression brute (Pa convertis en hPa) et l'altitude (calculée en prenant comme référence la pression standard au niveau de la mer de 101325 Pa).

**Module 2 : traitement des données** — `smoothAltitude()` applique un filtre moyenne glissante sur 5 points pour réduire le bruit du capteur ; `updateStats()` cumule le dénivelé positif/négatif avec une zone morte de 0,3 m, pour éviter que les micro-fluctuations sur le plat ne gonflent artificiellement les totaux.

**Module 3 : bouton et calibration** — `handleButton()` détecte un appui long sur BOOT de plus de 2000 millisecondes et déclenche `doCalibration()` qui remet à zéro le dénivelé et reprend les statistiques en prenant l'altitude courante comme nouvelle référence. Le drapeau `calibrationTriggered` empêche plusieurs déclenchements pendant un même appui long.

**Module 4 : rendu de l'interface** — utilise le double buffer `Arduino_Canvas`. Chaque image dessine d'abord en mémoire le dégradé de fond, les sommets (avec leur ligne de neige dynamique), l'anneau de progression périphérique et les chiffres, puis `canvas->flush()` pousse l'ensemble d'un coup à l'écran, éliminant complètement le scintillement du rafraîchissement ligne par ligne. Les chiffres utilisent un lissage exponentiel (coefficient 0,12) pour l'interpolation d'animation, les changements sont naturels et sans à-coups.

Dans `loop()`, un double minuteur sépare l'« échantillonnage basse fréquence (1 fois par seconde) » du « rendu haute fréquence (environ 33 fps) ». Les deux tâches ne se bloquent pas mutuellement, l'ensemble est très fluide.

---

## Problèmes courants / Dépannage

Pas de panique, 90 % des soucis viennent des points ci-dessous :

**Problème 1 : écran totalement noir, pas même de rétroéclairage**

Vérifiez que GPIO7 exécute bien `digitalWrite(TFT_BL, HIGH)` dans `setup()`. Le rétroéclairage ne s'allume pas tout seul : sans cette ligne, l'écran restera noir. Confirmez aussi que VCC est branché sur le 3,3 V et non sur le 5 V — 5 V grillerait l'écran.

**Problème 2 : rétroéclairage présent mais écran tout blanc ou tout noir, sans aucune image**

Ouvrez le moniteur série (115200 bauds) et regardez s'il y a des mentions `[ERROR]`. Si `Échec de l'initialisation du pilote d'écran` apparaît, c'est que les broches SPI sont mal câblées ; vérifiez une à une les cinq lignes CS / DC / SCK / MOSI / RST par rapport au tableau de câblage.

**Problème 3 : le moniteur série imprime en boucle `Échec de l'initialisation du BMP180`, le programme reste bloqué et l'écran ne s'allume pas**

L'échec d'initialisation du BMP180 fait entrer le programme dans une boucle infinie, l'écran ne s'allume donc pas. Dans 99 % des cas, c'est un problème de câblage I2C : SDA sur GPIO13, SCL sur GPIO14, alimentation en 3,3 V, et vérifiez que les résistances de tirage du module sont bien soudées (les modules commercialisés les ont généralement déjà).

**Problème 4 : affichage normal, mais l'altitude s'écarte fortement de la réalité**

Le BMP180 calcule l'altitude en prenant pour référence la pression standard au niveau de la mer (101325 Pa). La pression locale réelle fluctue avec la météo, un écart de ±30 m est donc normal. Si vous connaissez l'altitude exacte actuelle, vous pouvez remplacer le paramètre `bmp.readAltitude(101325)` par la valeur réelle du QNH local (pression ramenée au niveau de la mer, en Pa ; à récupérer d'une application météo ; conversion : hPa × 100 = Pa).

**Problème 5 : le dénivelé positif cumulé ne cesse d'augmenter alors que vous n'avez pas bougé**

Le bruit du capteur dépasse la zone morte (0,3 m). Vous pouvez augmenter `DEAD_ZONE` dans le code, par exemple à `0.8f` ou `1.0f` ; ou passer `FILTER_SIZE` de 5 à 8 pour renforcer le lissage. Les deux méthodes réduisent les incréments fantômes.

**Problème 6 : l'image scintille lors du rafraîchissement**

Avec le double buffer Canvas, il ne devrait normalement pas y avoir de scintillement. Si c'est tout de même le cas, vérifiez que `canvas->flush()` est bien appelé à la fin de `renderUI()`, et qu'aucune autre partie du code ne manipule directement `gfx` en contournant le Canvas.

---

## FAQ

**Q : L'écran rond GC9A01 peut-il être remplacé par un autre écran carré ?**
R : Oui. Arduino_GFX_Library prend en charge des dizaines de circuits pilotes (ST7789, ILI9341, etc.). Remplacez la ligne `Arduino_GC9A01` par le nom de classe du pilote correspondant, ajustez la taille du Canvas de 240×240 à la résolution appropriée, et le code de l'interface ne demande quasiment aucune modification.

**Q : Le BMP180 peut-il être remplacé par un BMP280 ou un BME280 ?**
R : Oui, mais il faut changer de bibliothèque. Le BMP280 utilise la bibliothèque `Adafruit_BMP280`, le BME280 la bibliothèque `Adafruit_BME280`, et l'appel à `readAltitude()` diffère légèrement. Le BMP280 est plus précis, avec une consommation en veille d'environ 2,74 µA ; le BME280 y ajoute la lecture de l'humidité, pour un prix un peu plus élevé.

**Q : Quelle est la précision d'altitude du BMP180, et est-il normal que les chiffres sautent sans cesse lors d'un test en intérieur ?**
R : Le BMP180 offre une précision de ±1 m en mode standard et jusqu'à ±0,5 m en mode haute résolution. Les fluctuations des relevés en intérieur sont tout à fait normales : ouvrir une fenêtre, fermer une porte ou le flux d'un climatiseur provoquent des micro-variations de pression qui se répercutent sur l'altitude. Ce projet utilise une moyenne glissante sur 5 points avec une zone morte de 0,3 m pour amortir ces fluctuations, ce qui se révèle suffisant à l'usage.

**Q : Le SPI (écran) et l'I2C (capteur) de l'ESP32-S3 peuvent-ils être utilisés simultanément ?**
R : Aucun problème. SPI et I2C sont des bus périphériques indépendants : ici, le GC9A01 passe par le SPI (GPIO11/12) et le BMP180 par l'I2C (GPIO13/14), chacun sur son propre bus, sans interférence. L'ESP32-S3 pilote sans difficulté les deux bus en parallèle.

**Q : Que fait `Arduino_Canvas` dans le code, et peut-on le supprimer pour dessiner directement avec `gfx` ?**
R : `Arduino_Canvas` est un canevas à double buffer fourni par Arduino_GFX_Library : toutes les instructions de dessin sont d'abord écrites dans un canevas virtuel en mémoire, puis poussées d'un seul coup à l'écran lors de l'appel à `flush()`, éliminant le scintillement du rafraîchissement ligne par ligne. Le supprimer pour manipuler directement `gfx` fonctionne d'un point de vue fonctionnel, mais le scintillement devient très prononcé lors du dessin d'un fond en dégradé plein écran — l'expérience en pâtirait fortement, ce n'est donc pas recommandé.

**Q : L'ESP32-S3 peut-il être alimenté par une batterie lithium pour partir en randonnée ?**
R : Oui. Une batterie lithium 3,7 V + un module de charge/décharge TP4056 + un régulateur LDO ME6211 abaissant la tension à 3,3 V est une solution courante. Dans la configuration de ce projet, l'ESP32-S3 + GC9A01 + BMP180 consomme environ 80 ~ 120 mA ; une batterie de 500 mAh offre théoriquement 4 ~ 6 heures d'autonomie, suffisant pour une randonnée d'une journée. Pour aller plus loin, vous pouvez baisser la luminosité du rétroéclairage (modulation PWM sur GPIO7) ou espacer l'intervalle d'échantillonnage du capteur.

---

## Aller plus loin

Une fois cette version terminée, vous pouvez continuer à bricoler :

- **Ajouter une carte SD pour enregistrer la trace** : écrire toutes les 10 secondes l'horodatage + altitude + pression dans un fichier CSV, à importer au retour dans un logiciel de trace GPS pour l'analyse
- **Ajouter un module GPS pour une localisation hybride** : le BMP180 dérive avec la météo, l'altitude GPS a une précision d'environ ±10 m mais est plus stable ; la fusion des deux compense leurs défauts respectifs
- **Brancher un gyroscope MPU6050 pour le comptage de pas** : détecter le rythme des foulées pour estimer le nombre de pas, et transformer le tout en un véritable ordinateur de bord de randonnée
- **Envoyer les données en BLE vers le téléphone** : utiliser le BLE de l'ESP32-S3 pour transmettre les données en temps réel à une application mobile, et afficher la trace complète sur une carte

---

## Références

- [Fiche technique officielle du BMP180 (Bosch Sensortec)](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp180-ds000.pdf)
- [Fiche technique du circuit pilote GC9A01 (Galaxycore)](http://www.galaxycore.com/file/pdf/GC9A01A.pdf)
- [Page GitHub d'Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Page GitHub de la bibliothèque Adafruit BMP085](https://github.com/adafruit/Adafruit-BMP085-Library)
- [Page produit officielle de l'ESP32-S3 (Espressif)](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
