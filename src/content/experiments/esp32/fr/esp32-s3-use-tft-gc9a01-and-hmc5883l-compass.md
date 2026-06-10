---
title: "ESP32-S3 + GC9A01 écran rond : boussole HMC5883L qui rate sa cible — fun à faire, mais ne comptez pas dessus dehors (tutoriel complet)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/hmc5883l
category: esp32
date: 2026-06-10
intro: "Réalisation d'une boussole électronique avec ESP32-S3 + écran rond GC9A01 + HMC5883L — le résultat est joli, mais la précision est décevante. Cet article documente intégralement le câblage, l'étalonnage et le code, tout en expliquant pourquoi cette solution convient uniquement pour l'expérimentation et la démonstration, pas pour la navigation sérieuse."
image: "https://img.lingflux.com/2026/06/79dbcadeea8dba2436b055a92f76fc20.jpg"
---



# ESP32-S3 + GC9A01 + HMC5883L — boussole sur écran rond : ça marche, c'est joli, mais la précision... vous voyez le genre (tutoriel complet)

Difficulté : ⭐⭐⭐☆☆ (accessible avec quelques bases)
Temps estimé : 45 minutes
Environnement de test : Arduino IDE 2.3.8 · Arduino_GFX_Library v1.6.5 · Adafruit_HMC5883_U v1.2.4

---

> ⚠️ **Conclusion d'entrée de jeu :** la boussole réalisée avec cette solution a belle allure, la direction générale est correcte, mais la précision typique se situe entre ±5° et ±15°, fortement influencée par le champ magnétique ambiant. Pour apprendre les méthodes de pilotage, faire une démo ou un bibelot de bureau — c'est largement suffisant. Pour la navigation en extérieur, le guidage de drones ou toute application exigeant de la précision — **déconseillé**, les explications suivent.

> **TL;DR (démarrage rapide) :**
> 1. Lancez d'abord un scan I2C pour confirmer l'adresse du composant — `0x0D` correspond à un QMC5883L (clone), `0x1E` est un vrai HMC5883L ; installez la bibliothèque correspondante, sinon les lectures seront incohérentes
> 2. Câblez les 12 fils selon le tableau (8 pour l'écran + 4 pour le capteur, 3.3V/GND peuvent être partagés)
> 3. Modifiez `DECLINATION_DEG` avec la déclinaison magnétique de votre ville (Pékin ≈ -6.5°, Tokyo ≈ -7.5°, lien de recherche en fin d'article)
> 4. Au démarrage, maintenez la touche BOOT (GPIO0) pour lancer l'étalonnage par rotation de 15 secondes — tournez lentement sur un tour complet en gardant l'appareil à l'horizontale
> 5. Relâchez ; les données d'étalonnage sont sauvegardées en NVS, elles survivent à la mise hors tension — pas besoin de réétalonner au prochain démarrage

---

## Préambule

Quand j'ai acheté cet écran rond GC9A01, je l'ai regardé un moment — 1,28 pouce, 240×240, un cercle parfait. N'est-ce pas le cadran de boussole idéal ?

J'ai passé un week-end à le réaliser, puis j'ai comparé avec mon téléphone... bon, l'aiguille pointe dans la bonne direction générale, mais elle décale un peu, une dizaine de degrés environ. Après quelques tours supplémentaires, j'ai remarqué qu'elle ne bougeait plus. Mise hors tension, redémarrage — toujours pas grand-chose...

« C'est sûrement un problème d'étalonnage. » J'ai réétalonné, changé d'endroit, fait des cercles face à l'iPhone — l'écart persiste. Ce n'est pas une erreur de code, c'est la limitation intrinsèque de ce module de capteur. J'ai aussi observé qu'un téléphone à proximité l'influence.

Cet article a donc deux objectifs : d'abord, réaliser intégralement la boussole sur écran rond, avec un code fonctionnel, un étalonnage qui passe, et un rendu vraiment joli ; ensuite, expliquer clairement ses limites de précision pour que vous sachiez « où ça rate » avant de vous lancer — plutôt que de découvrir après coup que l'aiguille ne correspond pas à Google Maps.

Si vous voulez apprendre à piloter un GC9A01 + HMC5883L, ou fabriquer un bibelot de bureau spectaculaire, ce projet vaut totalement le coup. Si votre objectif est la « précision de navigation », sautez directement à la section « Convient-il pour un projet sérieux ? » avant de décider si vous continuez.

---

## Résultat de l'expérience

![111111 (1)](https://img.lingflux.com/2026/06/61587ad00164cf25e866feb4066e069f.jpg)

L'écran rond GC9A01 affiche en temps réel un cadran de boussole : l'aiguille rouge pointe vers le nord, le chiffre vert au centre indique l'azimut actuel (0°~359°), les lettres jaunes indiquent la direction la plus proche parmi les huit points cardinaux (N / NE / E / SE / S / SW / W / NW). Au démarrage, maintenir la touche BOOT lance le mode d'étalonnage par rotation de 15 secondes — l'écran affiche une barre de progression et la plage du champ magnétique en temps réel ; une fois l'étalonnage terminé, l'aiguille est fluide (~25 fps), sans les saccades observées sans étalonnage.



> **Sur la précision, soyons clairs :** un HMC5883L étalonné dans un environnement idéal (loin des métaux et autres sources magnétiques) présente une erreur d'azimut d'environ ±5°. À proximité d'un boîtier d'ordinateur, d'un chargeur, d'un haut-parleur ou d'un tournevis, l'erreur monte facilement au-delà de ±15°. En utilisation de bureau au quotidien, « la direction générale est bonne », mais je ne suis pas sûr que mon module soit un original — il arrive parfois qu'il se bloque. Ne comptez pas sur une précision à l'unité près. C'est une limitation matérielle intrinsèque, pas un problème de code — la section « Convient-il pour un projet sérieux ? » y revient en détail.

---

## Description des composants

**Écran TFT rond GC9A01**

Imaginez un écran de montre circulaire de 3,2 cm de diamètre — c'est exactement ça. Interface SPI, résolution 240×240, le contrôleur d'écran intègre le driver, l'ESP32 pousse directement les pixels, pas besoin de RAM externe. Deux raisons de ce choix : d'abord, la forme ronde est naturellement adaptée à une UI de boussole ; ensuite, Arduino_GFX_Library le prend entièrement en charge — le code de pilotage tient en quelques lignes.

| Paramètre | Spécification |
| --- | --- |
| Résolution | 240 × 240 px |
| Interface | SPI (jusqu'à 80 MHz) |
| Alimentation | 3.3V |
| Rétroéclairage | Actif à l'état haut |
| Consommation typique | ~20 mA (pleine luminosité) |



**Module écran GC9A01 (8 broches)**

| Broche | Fonction |
| --- | --- |
| VCC | Alimentation 3.3V |
| GND | Masse |
| SCL / CLK | Horloge SPI |
| SDA / MOSI | Données SPI (maître → esclave) |
| CS | Chip select, actif à l'état bas |
| DC | Sélection donnée/commande |
| RST | Reset matériel, actif à l'état bas |
| BL | Rétroéclairage, actif à l'état haut |



**Magnétomètre 3 axes HMC5883L / QMC5883L**

Le magnétomètre est le « nez » de la boussole : il mesure l'intensité du champ magnétique terrestre sur les axes X/Y/Z, puis un calcul trigonométrique inverse détermine la direction vers laquelle vous êtes orienté. Interface I2C, alimentation 3.3V, lecture en quelques millisecondes.

Précision importante : la grande majorité des modules vendus sous la référence « HMC5883L » embarquent en réalité une puce QMC5883L du fabricant QST — les deux sont compatibles broche à broche, mais les registres sont totalement différents et nécessitent des bibliothèques distinctes. **N'installez pas la bibliothèque dans la précipitation — suivez d'abord la procédure de scan I2C ci-dessous pour identifier votre puce, puis installez la bibliothèque correspondante — ça vous fera gagner la moitié du temps de débogage.**

| Paramètre | HMC5883L (original) | QMC5883L (clone) |
| --- | --- | --- |
| Adresse I2C | 0x1E | 0x0D |
| Plage de mesure | ±8 Gauss | ±8 Gauss |
| Résolution | 2 mGauss | 2 mGauss |
| Densité de bruit | ~2 mGauss/√Hz | ~2 mGauss/√Hz |



**Module magnétomètre HMC5883L / QMC5883L (4 broches courantes)**

| Broche | Fonction |
| --- | --- |
| VCC | Alimentation 3.3V |
| GND | Masse |
| SDA | Données I2C |
| SCL | Horloge I2C |
| DRDY | Interruption « données prêtes » (non utilisé dans ce projet, connexion facultative) |

Les performances de base des deux puces sont similaires ; pour la démonstration et l'expérimentation, les deux conviennent. Il faut cependant être clair : quelle que soit la puce, un magnétomètre à ce prix n'a ni compensation thermique intégrée ni fusion de capteurs — il ne fait que des mesures 2D élémentaires du champ magnétique. Cela fixe son plafond de précision et le cantonne à la démonstration et à l'apprentissage, pas à la navigation réelle.

---

## Nomenclature (BOM)

| Composant | Modèle / Spécification | Quantité | Prix indicatif |
| --- | --- | --- | --- |
| Carte de développement | ESP32-S3 (variante quelconque) | 1 | ¥25~40 |
| Écran TFT rond | GC9A01, 1,28 pouce, 240×240 | 1 | ¥12~20 |
| Module magnétomètre | HMC5883L ou QMC5883L | 1 | ¥3~8 |
| Fils dupont | Mâle-femelle, 20 cm | Quelques-uns | ¥3 |

---

## Câblage

> Après le câblage, vérifiez chaque fil en vous aidant du tableau — cette étape élimine 80 % des « pourquoi ça ne marche pas ».

**Écran rond GC9A01 → ESP32-S3**

| Broche écran | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (ou directement 3.3V pour un rétroéclairage permanent) |

**HMC5883L / QMC5883L → ESP32-S3**

| Broche capteur | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO14 |
| SCL | GPIO13 |



---

## Bibliothèques à installer

Avant l'installation, une chose à faire — confirmez le modèle de votre puce magnétomètre. Téléversez le code ci-dessous, ouvrez le moniteur série (115200), et repérez l'adresse I2C affichée :

```cpp
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(13, 14);  // SDA=13, SCL=14, conforme à ce projet

  Serial.println("Scanning I2C...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("Found device at 0x%02X\n", addr);
    }
  }
  Serial.println("Done.");
}

void loop() {}
```

- S'il affiche `0x1E` → c'est un vrai HMC5883L, installez **Adafruit HMC5883 Unified** (par Adafruit)
- S'il affiche `0x0D` → c'est un QMC5883L, il faut remplacer le `#include` et l'objet capteur dans le code par la bibliothèque correspondante (voir FAQ n° 3)

Une fois la puce confirmée, ouvrez Arduino IDE → Gestionnaire de bibliothèques, recherchez et installez :

| Bibliothèque | Puce concernée | Version testée |
| --- | --- | --- |
| Arduino_GFX_Library | — | v1.6.5 |
| Adafruit HMC5883 Unified | HMC5883L (0x1E) | v1.2.4 |
| Adafruit Unified Sensor | Requise dans les deux cas | v1.1.15 |

Si vous avez un QMC5883L (0x0D), une solution de remplacement est proposée dans la FAQ plus bas.

---

## Code complet

```cpp
#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>
#include <Preferences.h>
#include <math.h>

// ─── Étape 1 : définition des broches ────────────────────────────────
#define TFT_SCK  12
#define TFT_MOSI 11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7
#define I2C_SDA  14
#define I2C_SCL  13

// Maintenir cette touche au démarrage pour entrer en mode étalonnage (touche BOOT, GPIO0, pas besoin de bouton supplémentaire)
#define CAL_BTN   0

// Déclinaison magnétique (négatif = ouest) — outil de recherche : https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
// Pékin ≈ -6.5°, Shanghai ≈ -5.5°, Guangzhou ≈ -3°, Tokyo ≈ -7.5°
// Si vous ne modifiez pas cette valeur, la boussole sera décalée de X degrés dans toutes les directions
#define DECLINATION_DEG  (-3.0f)

// ─── Étape 2 : initialisation de l'affichage ────────────────────────────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01  *gfx = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Double tampon Canvas : on dessine d'abord une image complète en mémoire, puis on la pousse à l'écran en une seule fois — résout le scintillement
// Occupation mémoire : 240×240×2 = 115 Ko (la PSRAM ou SRAM interne de l'ESP32-S3 est suffisante)
Arduino_Canvas  *canvas = new Arduino_Canvas(240, 240, gfx, 0, 0);

// ─── Objet capteur ──────────────────────────────────
Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);

// ─── Paramètres d'étalonnage (offset fer dur + échelle fer doux, stockés en NVS) ───────────────────
Preferences prefs;
float calOffX = 0, calOffY = 0;
float calSclX = 1, calSclY = 1;

// ─── Paramètres du filtre passe-bas EMA ────────────────────────────
float gSmooth    = 0;
bool  gFirstRead = true;

// Plus alpha est petit, plus c'est lisse (mais la réponse est plus lente) ; 0.15 pour une utilisation posée sur bureau, 0.25 pour une utilisation en main
#define EMA_ALPHA  0.15f

// ─── Définition des couleurs (format RGB565) ────────────────────────────────
#define C_BG      0x0000   // Fond noir
#define C_RING    0x4208   // Anneau gris foncé
#define C_TICK    0x7BEF   // Petits traits gris
#define C_MAJOR   0xFFFF   // Graduations principales / étiquettes blanches
#define C_NORTH   0xF800   // N en rouge
#define C_NDL_N   0xF800   // Aiguille rouge (côté nord)
#define C_NDL_S   0xCE79   // Aiguille argentée (côté sud)
#define C_DEG     0x07E0   // Degrés en vert
#define C_DIR     0xFFE0   // Lettres de direction en jaune

const char* kDir[] = {"N","NE","E","SE","S","SW","W","NW"};

#define CX 120   // Centre X
#define CY 120   // Centre Y
#define R  100   // Rayon du cadran

// ─────────────────────────────────────────────
//  Lecture de l'azimut (avec correction fer dur/fer doux)
// ─────────────────────────────────────────────
float readHeading() {
  sensors_event_t ev;
  mag.getEvent(&ev);

  // Soustraire l'offset fer dur pour éliminer l'interférence du champ magnétique fixe environnant (vis, colonnettes, etc.)
  float x = ev.magnetic.x - calOffX;
  float y = ev.magnetic.y - calOffY;
  // Normalisation fer doux : ramener la réponse elliptique du champ à un cercle
  if (calSclX > 0.01f) x /= calSclX;
  if (calSclY > 0.01f) y /= calSclY;

  float h = atan2f(y, x) + DECLINATION_DEG * (float)M_PI / 180.0f;
  if (h <  0)               h += 2.0f * (float)M_PI;
  if (h > 2.0f*(float)M_PI) h -= 2.0f * (float)M_PI;
  return h * 180.0f / (float)M_PI;
}

// ─────────────────────────────────────────────
//  Filtre passe-bas EMA (gestion correcte du saut 0°/360°)
// ─────────────────────────────────────────────
float emaFilter(float newAngle) {
  if (gFirstRead) { gFirstRead = false; return newAngle; }
  float d = newAngle - gSmooth;
  if (d >  180.0f) d -= 360.0f;   // Par exemple de 359° à 1°, la différence doit être +2°, pas -358°
  if (d < -180.0f) d += 360.0f;
  float r = gSmooth + d * EMA_ALPHA;
  if (r <   0.0f) r += 360.0f;
  if (r >= 360.0f) r -= 360.0f;
  return r;
}

// ─────────────────────────────────────────────
//  Rendu complet d'une image (dessiner l'image entière avant de la pousser à l'écran, élimine le scintillement)
// ─────────────────────────────────────────────
void drawFrame(float angle) {
  canvas->fillScreen(C_BG);

  // Anneau extérieur (4 pixels de large, effet de bordure autour du cadran)
  for (int r = R; r > R - 4; r--)
    canvas->drawCircle(CX, CY, r, C_RING);

  // Graduations : un trait tous les 10°, allongé tous les 30°, blanc tous les 90°
  for (int deg = 0; deg < 360; deg += 10) {
    float rad = deg * (float)M_PI / 180.0f;
    int   len = (deg % 30 == 0) ? 12 : 6;
    canvas->drawLine(
      CX + (int)(cosf(rad) * (R - 5)),    CY + (int)(sinf(rad) * (R - 5)),
      CX + (int)(cosf(rad) * (R-5-len)),  CY + (int)(sinf(rad) * (R-5-len)),
      (deg % 90 == 0) ? C_MAJOR : C_TICK
    );
  }

  // Étiquettes N/E/S/W, N en rouge pour plus de visibilité
  canvas->setTextSize(2);
  canvas->setTextColor(C_NORTH); canvas->setCursor(CX-6,    CY-R+20);  canvas->print("N");
  canvas->setTextColor(C_MAJOR); canvas->setCursor(CX+R-32, CY-7);     canvas->print("E");
                                 canvas->setCursor(CX-6,    CY+R-32);  canvas->print("S");
                                 canvas->setCursor(CX-R+20, CY-7);     canvas->print("W");

  // Aiguille (3 pixels de large, plus lisible visuellement)
  float rad  = angle * (float)M_PI / 180.0f;
  float perp = rad + (float)M_PI / 2.0f;
  int   pdx  = (int)roundf(cosf(perp));
  int   pdy  = (int)roundf(sinf(perp));
  int   nx   = CX + (int)(sinf(rad) * 68);   // Aiguille rouge (côté nord)
  int   ny   = CY - (int)(cosf(rad) * 68);
  int   sx   = CX - (int)(sinf(rad) * 42);   // Aiguille argentée (côté sud, plus courte)
  int   sy   = CY + (int)(cosf(rad) * 42);
  for (int d = -1; d <= 1; d++) {
    canvas->drawLine(CX+pdx*d, CY+pdy*d, nx+pdx*d, ny+pdy*d, C_NDL_N);
    canvas->drawLine(CX+pdx*d, CY+pdy*d, sx+pdx*d, sy+pdy*d, C_NDL_S);
  }

  // Petit cercle central d'axe (décoratif)
  canvas->fillCircle(CX, CY, 9, C_RING);
  canvas->drawCircle(CX, CY, 9, 0xA534);
  canvas->fillCircle(CX, CY, 3, C_MAJOR);

  // Affichage central : degrés en vert et lettre de direction en jaune
  canvas->setTextSize(2);
  canvas->setTextColor(C_DEG);
  char buf[8]; sprintf(buf, "%3d", (int)angle);
  canvas->setCursor(CX - 18, CY - 14); canvas->print(buf);

  int   idx = ((int)(angle + 22.5f) % 360) / 45;
  int   w   = strlen(kDir[idx]) * 6;
  canvas->setTextSize(1);
  canvas->setTextColor(C_DIR);
  canvas->setCursor(CX - w/2, CY + 6); canvas->print(kDir[idx]);

  canvas->flush();   // ← Pousse l'image complète à l'écran en une seule fois — clé pour éliminer le scintillement
}

// ─────────────────────────────────────────────
//  Étalonnage par rotation de 15 secondes
//  Principe : enregistrer les valeurs max/min du capteur dans toutes les directions,
//            calculer l'offset fer dur et l'échelle fer doux
// ─────────────────────────────────────────────
void runCalibration() {
  float minX =  1e6f, maxX = -1e6f;
  float minY =  1e6f, maxY = -1e6f;
  const uint32_t DUR = 15000;
  uint32_t t0 = millis();

  while (millis() - t0 < DUR) {
    sensors_event_t ev; mag.getEvent(&ev);
    if (ev.magnetic.x < minX) minX = ev.magnetic.x;
    if (ev.magnetic.x > maxX) maxX = ev.magnetic.x;
    if (ev.magnetic.y < minY) minY = ev.magnetic.y;
    if (ev.magnetic.y > maxY) maxY = ev.magnetic.y;

    // Affichage en temps réel de l'avancement de l'étalonnage
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR);  canvas->setTextSize(2);
    canvas->setCursor(15, 60);  canvas->print("CALIBRATING");
    canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
    canvas->setCursor(8, 95);   canvas->print("Slowly rotate 360 deg");
    canvas->setCursor(18, 109); canvas->print("Keep device level");
    // Barre de progression
    int p = (millis() - t0) * (R*2-2) / DUR;
    canvas->drawRect(20, 130, R*2, 14, C_MAJOR);
    canvas->fillRect(21, 131, p, 12, 0x07E0);
    // Affichage en temps réel de la plage du champ magnétique (pour vérifier qu'on a fait un tour complet)
    char b[44];
    canvas->setTextColor(0x7BEF);
    sprintf(b, "X[%.1f ~ %.1f]", minX, maxX);
    canvas->setCursor(8, 157); canvas->print(b);
    sprintf(b, "Y[%.1f ~ %.1f]", minY, maxY);
    canvas->setCursor(8, 170); canvas->print(b);
    canvas->flush();
    delay(50);
  }

  // Calcul de l'offset et de l'échelle
  calOffX = (maxX + minX) / 2.0f;
  calOffY = (maxY + minY) / 2.0f;
  calSclX = (maxX - minX) / 2.0f;  if (calSclX < 0.01f) calSclX = 1.0f;
  calSclY = (maxY - minY) / 2.0f;  if (calSclY < 0.01f) calSclY = 1.0f;

  // Sauvegarde en NVS (persistant après mise hors tension)
  prefs.begin("compass", false);
  prefs.putFloat("offX", calOffX);  prefs.putFloat("offY", calOffY);
  prefs.putFloat("sclX", calSclX);  prefs.putFloat("sclY", calSclY);
  prefs.end();

  // Écran de résultat d'étalonnage
  canvas->fillScreen(C_BG);
  canvas->setTextColor(0x07E0); canvas->setTextSize(2);
  canvas->setCursor(30, 88); canvas->print("CAL DONE!");
  canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
  char b[44];
  sprintf(b, "offX = %.1f", calOffX); canvas->setCursor(10, 120); canvas->print(b);
  sprintf(b, "offY = %.1f", calOffY); canvas->setCursor(10, 133); canvas->print(b);
  sprintf(b, "sclX = %.1f", calSclX); canvas->setCursor(10, 148); canvas->print(b);
  sprintf(b, "sclY = %.1f", calSclY); canvas->setCursor(10, 161); canvas->print(b);
  canvas->flush();
  delay(3000);
}

// ─────────────────────────────────────────────
//  Chargement depuis la NVS des données d'étalonnage précédemment sauvegardées
// ─────────────────────────────────────────────
void loadCalibration() {
  prefs.begin("compass", true);
  calOffX = prefs.getFloat("offX", 0.0f);
  calOffY = prefs.getFloat("offY", 0.0f);
  calSclX = prefs.getFloat("sclX", 1.0f);
  calSclY = prefs.getFloat("sclY", 1.0f);
  prefs.end();
  if (calSclX < 0.01f) calSclX = 1.0f;
  if (calSclY < 0.01f) calSclY = 1.0f;
  Serial.printf("[CAL] off=(%.2f, %.2f)  scl=(%.2f, %.2f)\n",
                calOffX, calOffY, calSclX, calSclY);
}

// ─────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TFT_BL, OUTPUT); digitalWrite(TFT_BL, HIGH);  // Allumer le rétroéclairage
  pinMode(CAL_BTN, INPUT_PULLUP);

  gfx->begin();
  canvas->begin();       // Allouer le tampon d'image, consomme environ 115 Ko de mémoire

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000); // Mode rapide 400 kHz, réduit la latence de lecture I2C

  if (!mag.begin()) {
    // Capteur introuvable — afficher un message d'erreur en rouge sur l'écran
    canvas->fillScreen(0xF800);
    canvas->setTextColor(0xFFFF); canvas->setTextSize(2);
    canvas->setCursor(10, 100); canvas->print("SENSOR ERROR");
    canvas->setCursor(10, 125); canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(500);
  }

  loadCalibration();

  // Maintenir BOOT(GPIO0) au démarrage → lancer l'étalonnage par rotation
  if (digitalRead(CAL_BTN) == LOW) {
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR); canvas->setTextSize(1);
    canvas->setCursor(10, 112); canvas->print("Release to start cal...");
    canvas->flush();
    while (digitalRead(CAL_BTN) == LOW) delay(10);
    delay(500);
    runCalibration();
  }

  // Ignorer les premières lectures instables (phase de chauffe)
  for (int i = 0; i < 8; i++) {
    sensors_event_t ev; mag.getEvent(&ev); delay(15);
  }
  gSmooth    = readHeading();
  gFirstRead = false;
}

// ─────────────────────────────────────────────
//  Loop : lecture → filtrage → rendu, boucle à ~25 fps
// ─────────────────────────────────────────────
void loop() {
  float raw = readHeading();
  gSmooth   = emaFilter(raw);
  drawFrame(gSmooth);
  delay(30);  // 30ms ≈ 33fps, en pratique ~25fps avec le temps de rendu
}
```

### Explications du code

**Pourquoi utiliser un Canvas ?** `Arduino_Canvas` réserve en mémoire un « brouillon » de 115 Ko, dessine l'image complète, puis la pousse à l'écran d'un coup via `canvas->flush()`. Si on dessine directement à l'écran, chaque trait apparaît immédiatement et l'aiguille scintille visiblement en tournant. Le Canvas résout ce problème, au prix d'une occupation mémoire supplémentaire.

**Que fait `readHeading()` ?** Les intensités du champ magnétique X/Y lues par le capteur sont corrigées : soustraction de l'offset fer dur (élimination de l'interférence magnétique fixe), division par le facteur d'échelle fer doux (correction de la sensibilité inégale entre les axes), puis ajout de la correction de déclinaison magnétique — pour obtenir l'angle par rapport au nord vrai.

**Pourquoi `emaFilter()` gère-t-il le passage 0°/360° ?** Si l'aiguille passe de 359° à 1°, la différence brute est de -358°. En faisant une moyenne pondérée directement, l'aiguille ferait un grand tour en sens inverse. Le code ramène d'abord la différence dans l'intervalle [-180°, +180°] avant de lisser — ce qui gère correctement le franchissement de 0°.

**Quel est le principe de l'étalonnage ?** En tournant dans le plan horizontal, les lectures X/Y du capteur tracent une ellipse (idéalement un cercle). En enregistrent les valeurs max et min, le centre de l'ellipse donne l'offset fer dur, et les demi-axes donnent les facteurs d'échelle fer doux. Une fois l'étalonnage terminé, les données sont sauvegardées en NVS (l'équivalent de l'EEPROM sur un téléphone), chargées automatiquement au prochain démarrage — pas besoin de réétalonner à chaque fois.

---

## Dépannage des problèmes courants

Pas de panique, 90 % des problèmes viennent d'ici.

**L'écran est tout noir ou tout blanc, rien ne s'affiche.** Vérifiez d'abord que la broche BL (rétroéclairage) est à l'état haut — si elle est connectée à GPIO7, confirmez que le code contient `digitalWrite(TFT_BL, HIGH)` ; si elle est directement sur 3.3V, le rétroéclairage devrait être constant — un écran noir signifie qu'une autre broche est en cause. Vérifiez ensuite chaque fil CS, DC et RST par rapport au tableau de câblage — CS et DC inversés est une erreur très fréquente.

**Le moniteur série affiche `SENSOR ERROR`, l'écran montre une erreur en rouge.** Le magnétomètre ne répond pas — probablement un problème de câblage I2C : SDA/SCL inversés, ou connectés aux mauvaises broches GPIO. Confirmez que `Wire.begin(13, 14)` correspond aux broches effectivement câblées. Autre possibilité : le module n'est pas alimenté en 3.3V — vérifiez avec un multimètre la broche VCC.

**L'aiguille saute dans tous les sens, est totalement imprécise, ou reste figée dans une direction.** La cause la plus probable : votre module est un QMC5883L (0x0D) mais le code utilise la bibliothèque HMC5883L — les deux bibliothèques définissent des registres totalement différents, les valeurs lues sont incohérentes. Lancez d'abord un scan I2C pour confirmer l'adresse. Si c'est 0x0D, il faut remplacer `#include <Adafruit_HMC5883_U.h>` et l'objet capteur par la syntaxe de la bibliothèque QMC5883LCompass — des exemples d'adaptation se trouvent en ligne.

**Après étalonnage, la direction est encore décalée de 10°~20°.** Vérifiez que `DECLINATION_DEG` est bien paramétré pour votre ville — une erreur de 5° décale systématiquement toutes les directions. Tokyo ≈ -7.5°, Pékin ≈ -6.5°, la valeur exacte s'obtient avec l'outil NOAA en fin d'article. Autre raison possible : la présence d'un champ magnétique intense à proximité lors de l'étalonnage (téléphone, tournevis, aimant de haut-parleur) — changez d'endroit et réétalonnez.

**Erreur de compilation `Adafruit_HMC5883_U.h: No such file or directory`.** La bibliothèque n'est pas installée ou la mauvaise version l'est. Ouvrez Arduino IDE → Outils → Gérer les bibliothèques, recherchez `HMC5883`, installez Adafruit HMC5883 Unified ainsi que sa dépendance Adafruit Unified Sensor.

---

## FAQ

**Q : Quelle est la différence entre HMC5883L et QMC5883L ? Peut-on utiliser la même bibliothèque ?**
R : Non, ils ne sont pas interchangeables. Les deux sont compatibles broche à broche (même aspect physique une fois soudés), mais les adresses des registres internes et le protocole de pilotage diffèrent — une mauvaise bibliothèque produit des valeurs sans signification. L'adresse I2C du HMC5883L est 0x1E, celle du QMC5883L est 0x0D — un scan I2C tranche la question en une seconde.

**Q : La broche BL de rétroéclairage peut-elle être connectée directement au 3.3V, ou faut-il obligatoirement un GPIO ?**
R : Le 3.3V direct fonctionne parfaitement — l'écran reste allumé en permanence. L'avantage d'un GPIO est de pouvoir contrôler la luminosité ou éteindre le rétroéclairage en veille pour économiser l'énergie. Si vous n'avez pas besoin de ces fonctions, le 3.3V libère un GPIO.

**Q : Comment trouver la valeur exacte de `DECLINATION_DEG` pour ma ville ?**
R : Utilisez l'outil de calcul de déclinaison magnétique du NOAA (lien en références) — entrez les coordonnées de votre ville, sélectionnez le modèle WMM, il fournira la déclinaison magnétique exacte à la date du jour. Est = valeur positive, Ouest = valeur négative. Les villes de l'est du Japon sont généralement entre -7° et -8°, la côte est de la Chine entre -5° et -6°.

**Q : Que se passe-t-il si j'augmente ou diminue `EMA_ALPHA` ?**
R : Plus alpha est grand, plus l'aiguille réagit vite, mais plus elle a tendance à trembler ; plus alpha est petit, plus le mouvement est fluide, mais avec une traînée perceptible lors des rotations. 0.15 convient pour un usage posé sur un bureau ; en utilisation nomade à la main, montez à 0.25 ~ 0.3. La plage va de 0.0 (immobile) à 1.0 (sans filtrage, valeur brute).

**Q : Où sont stockées les données d'étalonnage ? Survivent-elles à un reflash du code depuis un autre ordinateur ?**
R : Les données d'étalonnage sont stockées dans la NVS de l'ESP32 (mémoire non volatile, similaire à l'EEPROM) — le téléversement d'un nouveau code n'efface pas la NVS, les données sont chargées au prochain démarrage. Elles ne sont perdues que si vous effectuez un « Erase Flash » complet, auquel cas il faudra réétalonner.

**Q : Le tampon d'image de 115 Ko est-il trop volumineux ? Un ESP32-C3 peut-il l'utiliser ?**
R : L'ESP32-S3 dispose de 512 Ko de SRAM — 115 Ko ne pose aucun problème. L'ESP32-C3 n'a que 400 Ko de SRAM ; avec le code et la pile, c'est plutôt serré en pratique — préférez une version avec PSRAM ou un écran plus petit. L'ESP32 original (WROOM / WROVER) a encore moins de SRAM — la version WROVER avec PSRAM fonctionne, la version WROOM sans PSRAM plantera très probablement par manque de mémoire (OOM).

**Q : Pourquoi ma boussole diffère de celle du téléphone de 10 à 15 degrés — est-ce normal ?**
R : Avec cette solution, un écart de 10 à 15 degrés est tout à fait normal — ce n'est pas un bug. Dans un environnement réel avec des interférences, une erreur de ±10°~±15° est courante pour le HMC5883L/QMC5883L. Si l'erreur reste dans ±5°, l'étalonnage est déjà plutôt bon. Pour réduire encore l'erreur, il faut passer à un capteur de meilleure précision avec fusion 9 axes — le réglage logiciel seul ne suffira pas.

**Q : Peut-on utiliser cette solution pour un produit de navigation ou d'orientation sérieux ?**
R : Déconseillé. La précision n'est que de ±5°~±15°, fortement influencée par le champ magnétique ambiant, et il n'y a pas de compensation d'inclinaison — dès que l'appareil n'est pas strictement horizontal, l'erreur augmente sensiblement. Pour de la démonstration, l'apprentissage des principes ou un bibelot de bureau, c'est amplement suffisant ; pour de la navigation réelle, tournez-vous vers un ICM-20948 avec fusion de capteurs matérielle.

---

## Le HMC5883L convient-il pour un projet sérieux ?

Réponse directe : non.

Pour l'expérimentation et la démonstration, pas de problème — apprendre les méthodes de pilotage, présenter un projet maker, un bibelot de bureau — tout ça fonctionne. Mais si vous développez un produit nécessitant réellement une détection d'orientation, cette solution bute sur trois problèmes incontournables :

Premièrement, l'absence de compensation d'inclinaison. Dès que le module n'est pas à l'horizontale, l'erreur d'azimut augmente rapidement — une inclinaison de 20° peut engendrer plus de 10° de déviation directionnelle. L'iPhone compense cette erreur en temps réel grâce à son accéléromètre ; ce module seul n'en est pas capable — il faudrait ajouter un MPU6050 et adapter l'algorithme.

Deuxièmement, une forte sensibilité au champ magnétique ambiant. L'alimentation d'un ordinateur voisin, un câble USB, un support métallique polluent les lectures — et cette interférence est dynamique : un étalonnage ponctuel stocké en NVS ne compense pas un champ magnétique qui varie en temps réel lors des déplacements.

Troisièmement, une qualité de module très inégale sur le marché. La plupart sont des clones QMC5883L sans la compensation thermique intégrée de l'HMC5883L original — les lectures dérivent avec les variations de température.

Si votre projet exige une détection d'orientation fiable, des choix plus appropriés sont l'ICM-20948 (capteur 9 axes intégré avec fusion DMP matérielle) ou un module GPS combiné au calcul de cap entre deux coordonnées — la précision et la stabilité ne sont pas du même ordre.

Le positionnement correct de ce projet est : un exemple d'apprentissage complet, petit mais qui couvre tout. Il vous fait parcourir intégralement la chaîne « pilotage de magnétomètre → étalonnage fer dur → filtrage → affichage » — ces connaissances s'appliquent telles quelles à un meilleur capteur.

---

## Pistes d'extension

Une fois la version de base terminée, plusieurs directions s'offrent à vous :

Ajouter un capteur 6 axes MPU6050 pour lire les données d'accéléromètre et implémenter une compensation d'inclinaison. C'est l'une des limitations majeures évoquées plus haut — la version actuelle ne dispose que d'un champ magnétique 2D, et une légère inclinaison de l'appareil produit déjà une erreur sensible ; avec la compensation d'inclinaison, la boussole reste précise même tenue verticalement — c'est l'une des raisons principales de la stabilité de la boussole de l'iPhone. C'est l'amélioration la plus worthwhile pour faire passer ce projet « du jouet à l'utilisable ».

Connecter un module SD card et superposer une boussole sur une carte dessinée avec LVGL ou personnalisée, pour créer un navigateur hors ligne. La surface d'affichage de l'écran rond est limitée, mais afficher la direction actuelle et un cap vers la cible sous forme de flèche est tout à fait faisable.

Pousser les données d'azimut via Wi-Fi vers un broker MQTT, les intégrer dans Home Assistant ou votre propre tableau de bord — pour en faire un capteur d'orientation de bureau, déterminer l'exposition des fenêtres ou aligner une antenne.

---

## Références

- Datasheet HMC5883L (Honeywell) : https://cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf
- Datasheet QMC5883L (QST) : https://datasheetspdf.com/pdf/1309218/QST/QMC5883L/1
- Arduino_GFX_Library GitHub : https://github.com/moononournation/Arduino_GFX
- Adafruit_HMC5883_U GitHub : https://github.com/adafruit/Adafruit_HMC5883_U
- Page produit ESP32-S3 (Espressif) : https://www.espressif.com/en/products/socs/esp32-s3
- Outil de calcul de déclinaison magnétique (NOAA) : https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
