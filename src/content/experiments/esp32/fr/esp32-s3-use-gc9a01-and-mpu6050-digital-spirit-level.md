---
title: "ESP32-S3 + GC9A01 + MPU6050 : tutoriel complet de niveau à bulle numérique | SPI + I2C + Arduino"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-03
intro: "Utilisez l'ESP32-S3 pour piloter l'écran LCD circulaire GC9A01 et le capteur six axes MPU6050, afficher en temps réel les angles de tangage, de roulis et la température, pour créer un niveau à bulle numérique à la fois élégant et pratique."
image: "https://img.lingflux.com/2026/06/64f482f7efccfdc6b16f216a95efc28e.jpg"
---

# ESP32-S3 + GC9A01 + MPU6050 : tutoriel complet du niveau à bulle numérique (SPI + I2C + Arduino)

Difficulté : ⭐⭐☆☆☆ (accessible aux débutants)
Temps estimé : 45 minutes
Environnement de test : Arduino IDE 2.3.8 | Arduino_GFX_Library v1.6.5 | MPU6050_light v1.2.1

---

> **Résumé en une phrase** : L'ESP32-S3 pilote l'écran TFT circulaire GC9A01 et le capteur six axes MPU6050 pour créer un niveau à bulle en temps réel dont la couleur change selon l'angle d'inclinaison (vert → jaune → rouge), avec le tableau de câblage complet et le code Arduino.

---

> **TL;DR (démarrage rapide) :**
>
> 1. Câblage MPU6050 : SDA → GPIO 15, SCL → GPIO 16, AD0 → GND (adresse I2C fixe 0x68)
> 2. Câblage GC9A01 : CLK → GPIO 12, MOSI → GPIO 11, CS → GPIO 9, DC → GPIO 10, RST → GPIO 18, BL → GPIO 7
> 3. Installer les bibliothèques : `GFX Library for Arduino` (auteur moononournation) + `MPU6050_light` (auteur rfetick)
> 4. Téléverser le code, après la mise sous tension **garder l'appareil à plat et immobile environ 1 seconde** jusqu'à la disparition du message de calibrage, puis incliner pour voir la bulle bouger

---

## Introduction

Vous est-il déjà arrivé d'installer une étagère à mains nues, en vous disant « ça a l'air à peu près de niveau », pour découvrir ensuite que tout glisse d'un côté ?

C'est exactement mon cas. Impossible de trouver un niveau traditionnel à emprunter, alors j'ai fouillé ma boîte de composants — et j'y ai trouvé un écran circulaire GC9A01 et un MPU6050 qui prenaient la poussière dans un coin. Les deux réunis formaient justement tous les ingrédients nécessaires pour un niveau à bulle numérique.

Mieux encore, l'écran circulaire est visuellement parfait pour un niveau à bulle : bulle centrée = vert, légèrement décalée = jaune, inclinaison excessive = rouge. Tout se lit d'un coup d'œil, sans aucun mode d'emploi.

Objectif de cet article : **partir de zéro, câblage → installation des bibliothèques → téléversement du code → voir la bulle bouger**, en suivant les étapes pour reproduire le résultat.

---

## Résultat de l'expérience

![](https://img.lingflux.com/2026/06/09a4ed83eaa702df1ded539d608c9323.jpg)

L'écran affiche en temps réel quatre éléments :

- **Bulle centrale** : se déplace selon l'inclinaison de l'appareil, avec un code couleur à trois niveaux (vert = de niveau / jaune = légèrement incliné / rouge = inclinaison marquée)
- **Angle d'inclinaison composé** (°) : valeur combinée du tangage et du roulis, affichée en grand format
- **Valeurs Pitch / Roll individuelles** : lectures séparées de l'angle de tangage et de roulis
- **Température de la puce** : lecture du capteur de température intégré au MPU6050 (normalement plus élevée que la température ambiante, explication ci-dessous)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30s2V_TAoMo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## Description des composants

### Écran TFT circulaire GC9A01

Imaginez **un écran de téléphone spécialement découpé en forme ronde** — la résolution 240×240 n'est pas exceptionnelle, mais posé derrière son verre circulaire sur la table, il constitue un cadran de niveau absolument parfait.

| Paramètre | Valeur |
| --- | --- |
| Résolution | 240 × 240 px (zone d'affichage circulaire) |
| Interface | SPI (jusqu'à 80 MHz) |
| Alimentation | 3.3V |
| Profondeur de couleur | 65K couleurs (RGB565) |
| Type de panneau | IPS |

Pourquoi ce choix : le cadran circulaire s'adapte naturellement à la forme d'un niveau à bulle, et l'interface SPI haute vitesse permet facilement une animation à 20 fps.

### Capteur inertiel six axes MPU6050

Imaginez **la combinaison du gyroscope et de l'accéléromètre de votre téléphone** — la rotation automatique de l'écran, le compteur de pas d'une application de sport, tout cela utilise des puces similaires. Le MPU6050 intègre un accéléromètre trois axes (détecte la direction d'inclinaison) et un gyroscope trois axes (détecte la vitesse de rotation) dans une seule puce de 4 mm × 4 mm, avec en bonus un capteur de température.

| Paramètre | Valeur |
| --- | --- |
| Plage de l'accéléromètre | ±2 / ±4 / ±8 / ±16 g (configurable) |
| Plage du gyroscope | ±250 / ±500 / ±1000 / ±2000 °/s (configurable) |
| Résolution ADC | 16 bits |
| Interface | I2C (jusqu'à 400 kHz mode rapide) |
| Alimentation | 3.3V (plage VDD : 2,375 à 3,46 V) |
| Adresse I2C | 0x68 (AD0 = GND) / 0x69 (AD0 = VCC) |

Pourquoi ce choix : prix très bas, excellent support de bibliothèques, `MPU6050_light` fournit directement les angles fusionnés, pas besoin d'écrire son propre filtre de Kalman.

---

## Nomenclature (BOM)

| Composant | Modèle / Spécification | Quantité |
| --- | --- | --- |
| Carte de développement | ESP32-S3 | 1 |
| Écran TFT circulaire | GC9A01 240×240 IPS | 1 |
| Capteur six axes | Module MPU6050 | 1 |
| Fils de connexion | Câbles Dupont | Selon besoin |

---

## Description des broches des composants

### Broches GC9A01

| Désignation broche | Fonction |
| --- | --- |
| VCC | Alimentation principale 3.3V |
| GND | Masse |
| SCL / CLK | Horloge SPI (SCLK) |
| SDA / MOSI | Données SPI maître vers esclave |
| CS | Sélection de puce (actif à l'état bas) |
| DC | Commutation données / commande |
| RST | Réinitialisation matérielle (actif à l'état bas) |
| BL | Rétroéclairage |

### Broches MPU6050

| Désignation broche | Fonction |
| --- | --- |
| VCC | Alimentation principale 3.3V |
| GND | Masse |
| SDA | Ligne de données I2C |
| SCL | Ligne d'horloge I2C |
| INT | Sortie d'interruption (non connectée en mode polling) |
| AD0 | Sélection d'adresse I2C (connecté à GND = 0x68) |
| XDA / XCL | Interface I2C auxiliaire (non utilisée dans ce projet) |

---

## Câblage

> Il est recommandé de suivre le tableau ci-dessous ligne par ligne. Cochez chaque fil une fois connecté — cela évite 80 % des problèmes de dépannage.

### MPU6050 → ESP32-S3

| Broche MPU6050 | Broche ESP32-S3 | Remarque |
| --- | --- | --- |
| VCC | 3.3V | Alimentation principale |
| GND | GND | Masse commune |
| SDA | GPIO 15 | Ligne de données I2C |
| SCL | GPIO 16 | Ligne d'horloge I2C |
| AD0 | GND | Fixe l'adresse I2C à 0x68 |
| INT / XDA / XCL | Non connecté | Non requis pour ce projet |

**À propos des résistances de tirage I2C** : la pratique standard consiste à placer une résistance de tirage de 4,7 kΩ sur chaque ligne SDA et SCL vers le 3,3V, ce qui améliore nettement la stabilité en lecture rapide. Cet exemple omet cette étape, mais pour un projet finalisé, il est recommandé de les ajouter.

### GC9A01 → ESP32-S3

| Broche GC9A01 | Broche ESP32-S3 | Remarque |
| --- | --- | --- |
| VCC | 3.3V | Alimentation principale |
| GND | GND | Masse commune |
| SCL / CLK | GPIO 12 | Horloge SPI |
| SDA / MOSI | GPIO 11 | Données SPI |
| CS | GPIO 9 | Sélection de puce |
| DC | GPIO 10 | Commutation données / commande |
| RST | GPIO 18 | Réinitialisation matérielle |
| BL | GPIO 7 | Rétroéclairage (optionnel, certains modules n'ont pas cette broche. Contrôlé par niveau haut/bas dans le code, ou connecté directement au 3,3V pour un rétroéclairage permanent) |



---

## Bibliothèques à installer

Dans l'Arduino IDE, allez dans le menu **Outils → Gérer les bibliothèques** et recherchez puis installez :

| Nom de la bibliothèque | Auteur | Version testée |
| --- | --- | --- |
| GFX Library for Arduino | moononournation | v1.6.5 |
| MPU6050_light | rfetick | v1.2.1 |

Des versions différentes peuvent entraîner des changements d'API. Il est recommandé d'installer les versions indiquées dans le tableau. Après l'installation, redémarrez l'Arduino IDE avant d'ouvrir le projet.



---

## Code complet

```cpp
/**
 * ESP32-S3 + GC9A01 + MPU6050 Niveau à bulle numérique
 * Digital Spirit Level
 *
 * Câblage :
 *   GC9A01  → SCL=12, SDA=11, CS=9, DC=10, RST=18, BL=7
 *   MPU6050 → SDA=15, SCL=16, AD0=GND (adresse I2C 0x68)
 */

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <MPU6050_light.h>

// ---- Définition des couleurs (format RGB565) ----
#define COLOR_BG       0x0863   // Fond sombre
#define COLOR_GRID     0x1A69   // Lignes de la grille
#define COLOR_GREEN    0x07E6   // Bulle centrée → vert
#define COLOR_YELLOW   0xFEA0   // Légère inclinaison → jaune
#define COLOR_RED      0xF820   // Inclinaison excessive → rouge
#define COLOR_TEXT     0xC618   // Texte courant
#define COLOR_ACCENT   0xFD20   // Réticule central

// ---- Broches SPI GC9A01 ----
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---- Broches I2C MPU6050 (doivent correspondre au tableau de câblage) ----
#define MPU_SDA  15   // SDA → GPIO 15
#define MPU_SCL  16   // SCL → GPIO 16

// ---- Initialisation du pilote d'affichage ----
// Étape 1 : créer le bus SPI, ordre des paramètres : DC, CS, SCK, MOSI, MISO
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA,
    GFX_NOT_DEFINED
);
// Étape 2 : créer l'objet écran GC9A01 (rotation=0, panneau IPS=true)
Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST, 0, true
);
// Étape 3 : créer le Canvas hors écran 240×240 (double tampon, anti-déchirure)
Arduino_Canvas *canvas = new Arduino_Canvas(
    240, 240, gfx
);

// ---- MPU6050 ----
MPU6050 mpu(Wire);

// ---- Contrôle de la fréquence d'images ----
const int16_t cx = 120, cy = 120;    // Coordonnées du centre de l'écran (pixels)
unsigned long lastFrame = 0;
const int frameDelay = 1000 / 20;    // Fréquence cible : 20 fps → 50 ms par image

// ---- Déclarations anticipées des fonctions ----
void drawGrid();
void drawBubble(float pitch, float roll);
void drawReadouts(float pitch, float roll, float temp);

// =============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("=== ESP32-S3 Niveau à bulle numérique — Démarrage ===");

    // Étape 1 : initialiser l'écran et le rétroéclairage
    gfx->begin();
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);    // Allumer le rétroéclairage
    canvas->begin();
    Serial.println("[OK] Écran initialisé");

    // Étape 2 : initialiser l'I2C, scanner le bus (pour vérifier le câblage lors du débogage)
    Wire.begin(MPU_SDA, MPU_SCL);
    Serial.print("[DBG] Scan du bus I2C SDA=");
    Serial.print(MPU_SDA);
    Serial.print(" SCL=");
    Serial.println(MPU_SCL);

    byte found = 0;
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            Serial.print("  Périphérique I2C trouvé, adresse : 0x");
            Serial.println(addr, HEX);
            found++;
        }
    }
    if (found == 0) {
        Serial.println("[ERROR] Aucun périphérique I2C trouvé ! Vérifiez le câblage.");
    }

    // Étape 3 : initialiser le MPU6050
    byte status = mpu.begin();
    if (status == 0) {
        Serial.println("[OK] MPU6050 connecté");
    } else {
        Serial.println("[ERROR] MPU6050 ne répond pas ! Vérifiez le câblage ou l'adresse I2C.");
    }

    // Étape 4 : calibrage automatique du gyroscope (garder l'appareil à plat et immobile environ 1 seconde)
    Serial.println("[DBG] Calibrage en cours, gardez l'appareil à plat, ne pas le déplacer...");
    canvas->fillScreen(COLOR_BG);
    canvas->setTextColor(COLOR_TEXT);
    canvas->setTextSize(1);
    canvas->setCursor(60, 110);
    canvas->print("Calibrating...");
    canvas->setCursor(55, 125);
    canvas->print("Keep device flat");
    canvas->flush();

    delay(1000);
    mpu.calcOffsets();    // Calcul automatique des offsets de l'accéléromètre et du gyroscope

    Serial.print("[DBG] Offset accéléromètre : ");
    Serial.print(mpu.getAccXoffset());  Serial.print(", ");
    Serial.print(mpu.getAccYoffset());  Serial.print(", ");
    Serial.println(mpu.getAccZoffset());
    Serial.print("[DBG] Offset gyroscope : ");
    Serial.print(mpu.getGyroXoffset()); Serial.print(", ");
    Serial.print(mpu.getGyroYoffset()); Serial.print(", ");
    Serial.println(mpu.getGyroZoffset());
    Serial.println("[OK] Calibrage terminé, démarrage !");
}

// =============================================================
static int logCnt = 0;    // Compteur de limitation des logs de débogage

void loop() {
    unsigned long now = millis();
    if (now - lastFrame < frameDelay) return;    // Limitation de la fréquence d'images
    lastFrame = now;

    // Étape 1 : lire les capteurs
    mpu.update();
    float pitch = mpu.getAngleY();     // Angle de tangage (inclinaison avant/arrière)
    float roll  = -mpu.getAngleX();    // Angle de roulis (inclinaison gauche/droite, signe inversé pour correspondre à la direction visuelle)
    float temp  = mpu.getTemp();       // Température de la puce (normalement plus élevée que la température ambiante)

    // Log de débogage : affiché toutes les 20 images (environ 1 seconde), sans impact sur la fréquence d'images
    if (++logCnt >= 20) {
        logCnt = 0;
        Serial.print("[DBG] pitch="); Serial.print(pitch, 2);
        Serial.print(" roll=");       Serial.print(roll,  2);
        Serial.print(" temp=");       Serial.print(temp,  1);
        Serial.print(" | accX=");     Serial.print(mpu.getAccX(), 2);
        Serial.print(" accY=");       Serial.print(mpu.getAccY(), 2);
        Serial.print(" accZ=");       Serial.println(mpu.getAccZ(), 2);
    }

    // Étape 2 : écrêtage — au-delà de ±45° la bulle reste en bord de cadran, elle ne sort pas du cercle
    pitch = constrain(pitch, -45.0f, 45.0f);
    roll  = constrain(roll,  -45.0f, 45.0f);

    // Étape 3 : dessiner l'image courante
    canvas->fillScreen(COLOR_BG);        // Effacer le canvas
    drawGrid();                          // Grille de graduation
    drawBubble(pitch, roll);             // Bulle
    drawReadouts(pitch, roll, temp);     // Valeurs numériques
    canvas->flush();                     // Envoyer à l'écran
}

// =============================================================
// Dessiner les cercles de graduation et le réticule central
void drawGrid() {
    canvas->drawCircle(cx, cy,  25, COLOR_GRID);
    canvas->drawCircle(cx, cy,  50, COLOR_GRID);
    canvas->drawCircle(cx, cy,  80, COLOR_GRID);
    canvas->drawCircle(cx, cy, 105, COLOR_GRID);
    canvas->drawFastHLine(15, cy,  210, COLOR_GRID);
    canvas->drawFastVLine(cx, 15,  210, COLOR_GRID);
    // Réticule central (couleur d'accentuation, plus visible que la grille)
    canvas->drawFastHLine(cx - 5, cy,     10, COLOR_ACCENT);
    canvas->drawFastVLine(cx,     cy - 5, 10, COLOR_ACCENT);
}

// Mapper la position de la bulle selon les angles pitch/roll et colorer selon la distance
void drawBubble(float pitch, float roll) {
    // Mapping linéaire ±45° vers ±90 px de décalage
    int16_t bx = cx + (int16_t)(roll  / 45.0f * 90.0f);
    int16_t by = cy + (int16_t)(pitch / 45.0f * 90.0f);

    // Calculer la distance en pixels entre la bulle et le centre, déterminer la couleur
    float dist = sqrt((float)((bx - cx) * (bx - cx) + (by - cy) * (by - cy)));
    uint16_t color;
    if      (dist < 10) color = COLOR_GREEN;    // ≈ ±5° : de niveau
    else if (dist < 40) color = COLOR_YELLOW;   // ≈ ±20° : légèrement incliné
    else                color = COLOR_RED;       // Au-delà de ±20° : inclinaison marquée

    // Ligne du centre à la bulle + bulle pleine + contour blanc
    canvas->drawLine(cx, cy, bx, by, COLOR_GRID);
    canvas->fillCircle(bx, by, 8, color);
    canvas->drawCircle(bx, by, 8, 0xFFFF);
}

// Dessiner les valeurs d'angle, le texte d'état et la température
void drawReadouts(float pitch, float roll, float temp) {
    float total = sqrt(pitch * pitch + roll * roll);    // Angle d'inclinaison composé

    canvas->setTextSize(1);
    canvas->setTextColor(COLOR_TEXT);

    // Titre en haut
    canvas->setCursor(55, 18);
    canvas->print("DIGITAL LEVEL");

    // Angle composé : grande police, couleur synchronisée avec la bulle
    canvas->setTextSize(2);
    uint16_t color;
    if      (total < 1)  color = COLOR_GREEN;
    else if (total < 10) color = COLOR_YELLOW;
    else                 color = COLOR_RED;
    canvas->setTextColor(color);
    canvas->setCursor(75, 155);
    canvas->print(total, 1);
    canvas->print((char)247);    // Symbole ° (ASCII 247)

    // Texte d'état
    canvas->setTextSize(1);
    canvas->setCursor(80, 178);
    if      (total < 1)  canvas->print("  LEVEL");
    else if (total < 10) canvas->print(" TILTED");
    else                 canvas->print("  STEEP");

    // Lectures individuelles Pitch / Roll
    canvas->setTextColor(COLOR_TEXT);
    canvas->setCursor(20, 195);
    canvas->print("P:"); canvas->print(pitch, 1);
    canvas->print(" R:"); canvas->print(roll,  1);

    // Température (température de jonction de la puce, normalement plus élevée que la température ambiante)
    canvas->setCursor(60, 210);
    canvas->print("T:"); canvas->print(temp, 1);
    canvas->print("C");
}
```

---

## Explication du code

**Séquence d'initialisation (setup)**

Le setup procède en quatre étapes dans l'ordre : initialisation de l'écran → scan I2C → initialisation du MPU6050 → calibrage du gyroscope. La position dans laquelle vous placez le module à ce moment définira le point central de référence.

L'écran utilise `Arduino_Canvas` pour le double tamponnage hors écran — tous les tracés sont d'abord effectués en mémoire, puis envoyés d'un coup à l'écran via `flush()`, évitant ainsi les déchirures ou les images intermédiaires.

La partie scan I2C affiche dans le moniteur série les adresses des périphériques détectés. Lors du premier débogage, ouvrez le moniteur série pour confirmer que le MPU6050 est bien connecté (normalement `Found I2C device at 0x68`).

`mpu.calcOffsets()` effectue un calibrage automatique d'environ 1 seconde, pendant lequel l'appareil doit rester à plat et immobile. **Le calibrage est relancé à chaque mise sous tension**, donc à chaque démarrage, posez l'appareil à plat et attendez que le message de calibrage disparaisse avant de l'utiliser.

**Boucle principale (loop)**

La fréquence d'images est verrouillée à 20 fps. Chaque image effectue quatre opérations : lecture des capteurs → écrêtage → dessin → envoi à l'écran.

Le signe négatif devant `roll = -mpu.getAngleX()` sert à faire correspondre le sens de déplacement de la bulle sur l'écran avec la direction réelle d'inclinaison. Sans cette inversion, la bulle irait dans la direction opposée. Si votre orientation de montage est différente, vous pouvez ajuster le signe vous-même.

La couleur de la bulle est déterminée en trois paliers : distance au centre <10 px vert, <40 px jaune, sinon rouge, ce qui correspond approximativement à ±5°, ±20° et au-delà de ±20°.

---

## Dépannage des problèmes courants

Pas de panique, 90 % des problèmes viennent du câblage et des adresses :

**L'écran est tout blanc / tout noir, rien ne s'affiche**

Vérifiez d'abord que VCC est bien connecté au 3,3V et non au 5V (le GC9A01 ne tolère pas les hautes tensions), et que la broche de rétroéclairage BL est bien connectée. Vérifiez ensuite que les trois fils CS, DC et RST ne sont pas inversés — CS mal connecté = l'écran ne répond pas, RST laissé flottant = bloqué en état de réinitialisation. Vous pouvez d'abord connecter BL directement au 3,3V pour un rétroéclairage permanent : si l'écran s'allume en blanc, c'est que l'écran fonctionne mais que l'initialisation SPI a échoué.

**Le moniteur série affiche `[ERROR] Aucun périphérique I2C trouvé`**

Utilisez un multimètre pour vérifier la présence de 3,3V sur la broche VCC du MPU6050. Confirmez également que SDA et SCL ne sont pas inversés (SDA → GPIO 15, SCL → GPIO 16). **AD0 doit être explicitement connecté à GND** — à l'état flottant, l'adresse de certains modules est instable et le bus I2C ne répondra pas.

**La bulle tremble constamment et ne se stabilise pas**

L'appareil n'était pas complètement immobile lors du calibrage à la mise sous tension. Remettez sous tension, posez sur une surface plane et attendez que le message de calibrage disparaisse. Si la table vibre (imprimante ou ventilateur à proximité), changez d'emplacement.

**La direction du Pitch ou du Roll est inversée**

Selon l'orientation de montage de la carte, ajustez le signe devant l'angle correspondant dans le code : changez `pitch = mpu.getAngleY()` en `pitch = -mpu.getAngleY()`, ou ajustez la ligne `roll`, jusqu'à obtenir la bonne direction.

**La température est supérieure de plus de dix degrés à la température ambiante**

C'est normal. Le MPU6050 mesure la température de jonction de la puce, qui est couramment 10 à 20 °C plus élevée que la température ambiante. Elle est donnée à titre indicatif uniquement. Si vous avez besoin d'une température ambiante précise, utilisez un capteur indépendant (par ex. DS18B20).

**L'image clignote ou présente des déchirures**

Le code utilise déjà le double tamponnage `Arduino_Canvas`, normalement sans déchirure. Si le problème persiste, vérifiez que les câbles Dupont SPI sont bien branchés, que la longueur des fils ne dépasse pas 20 cm, et ajoutez si nécessaire un condensateur de découplage de 100 nF près des broches d'alimentation.

---

## FAQ

**Q : Quelle est la fréquence de mise à jour des angles du MPU6050 ?**
R : `MPU6050_light` lit en mode I2C rapide à 400 kHz, avec un taux d'échantillonnage des données brutes allant jusqu'à 1 kHz. Ce code limite la fréquence d'affichage à 20 fps, soit une fréquence de rafraîchissement effective de 20 Hz. Pour une fréquence plus élevée, réduisez la valeur de `frameDelay` — en pratique, jusqu'à 40 fps reste stable (limité par la vitesse de transfert SPI vers l'écran).

**Q : Peut-on utiliser d'autres GPIO ?**
R : Oui, il suffit de modifier les macros `#define` en haut du code. Pour les broches SPI du GC9A01, il est recommandé d'utiliser le SPI matériel de l'ESP32-S3 (GPIO 11 / 12 correspondent au SPI2, offrant les meilleures performances) ; pour les broches I2C du MPU6050, n'importe quel GPIO convient, il suffit que le code et le câblage soient cohérents.

**Q : Peut-on remplacer le GC9A01 par un écran carré ?**
R : Oui. Remplacez `Arduino_GC9A01` par le pilote correspondant (par exemple `Arduino_ST7789` pour un ST7789), modifiez la largeur et la hauteur de `Arduino_Canvas` ainsi que les coordonnées du centre `cx/cy`. La logique de dessin reste identique.

**Q : Le 3,3V de l'ESP32-S3 est-il suffisant pour alimenter simultanément le GC9A01 et le MPU6050 ?**
R : Oui. Le rétroéclairage du GC9A01 consomme environ 20 mA, le MPU6050 a une consommation typique de 3,5 mW (environ 1 mA), soit un total bien inférieur à la limite de courant habituelle de 300 à 500 mA de la broche 3,3V de la carte.

**Q : Peut-on connecter deux MPU6050 sur le même bus I2C ?**
R : Oui. Connectez le AD0 du premier à GND (adresse 0x68) et le AD0 du second à VCC (adresse 0x69), en partageant les mêmes lignes SDA/SCL. Dans le code, déclarez deux objets `MPU6050` et initialisez-les avec des adresses différentes.

**Q : Faut-il recalibrer à chaque redémarrage ?**
R : Oui, ce code appelle `mpu.calcOffsets()` dans `setup()` à chaque mise sous tension pour effectuer un calibrage dynamique. Si votre usage est une installation fixe, vous pouvez sauvegarder les offsets en EEPROM et les lire directement au démarrage suivant, évitant ainsi le temps d'attente de calibrage.

---

## Pistes d'extension

- Ajouter un bouton pour basculer entre les modes d'affichage (niveau à bulle / courbe d'angle en temps réel / thermomètre)
- Sauvegarder les valeurs de calibrage de référence en EEPROM pour compenser l'angle d'une surface de montage fixe
- Connecter un buzzer passif qui émet un signal sonore lorsque l'appareil est de niveau
- Changer le skin du cadran circulaire pour en faire un compas magnétique ou un afficheur de force G

---

## Références

- [MPU-6000 / MPU-6050 Fiche technique — InvenSense (TDK)](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [GC9A01A Datasheet — Galaxycore](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [MPU6050_light GitHub — rfetick](https://github.com/rfetick/MPU6050_light)
- [ESP32-S3 Manuel de référence technique — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3 Page produit — Espressif](https://www.espressif.com/en/products/socs/esp32-s3)
