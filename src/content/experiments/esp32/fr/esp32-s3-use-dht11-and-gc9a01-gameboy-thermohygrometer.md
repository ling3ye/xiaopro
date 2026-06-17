---
title: "DHT11 + GC9A01 écran rond : thermohygromètre rétro pixel façon Game Boy | ESP32-S3 câblage SPI + code Arduino complet"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/dht11
category: esp32
date: 2026-06-18
intro: "Pilotez un écran rond GC9A01 240×240 avec un ESP32-S3 et un capteur DHT11, pour reproduire la palette quatre tons vert crème classique du Game Boy DMG : un thermohygromètre de bureau rétro pixel qui clignote en cas d'alerte. Table de câblage complète, installation des bibliothèques Arduino et code entièrement commenté, adapté aux débutants."
image: "https://img.lingflux.com/2026/06/4d154493c9e833bc839cec1050f749f6.jpg"
---

# DHT11 + GC9A01 écran rond : thermohygromètre rétro pixel façon Game Boy (tuto complet) (ESP32-S3 · câblage SPI · code Arduino)

---

## TL;DR · Aperçu en trois minutes

> Pas le temps de lire tout l'article ? Les étapes clés sont ici, les plus à l'aise peuvent foncer :
>
> 1. **Câblage** : broche DATA du DHT11 → GPIO 47 ; écran rond GC9A01 en SPI : SCK→GPIO12, MOSI→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 2. **Installer deux bibliothèques** : dans l'IDE Arduino, recherchez et installez `Arduino_GFX_Library` (Moon On Our Nation) et `DHT sensor library` (Adafruit)
> 3. **Coller le code complet à la fin de l'article**, choisir la carte `ESP32S3 Dev Module` dans l'IDE Arduino
> 4. **Compiler et téléverser**, attendre environ 30 secondes pour le flash
> 5. **Vérifier à la mise sous tension** : l'écran rond s'allume en fond vert crème, la moitié supérieure affiche la température (°C), la moitié inférieure l'humidité (%), clignotement d'alerte automatique en cas de valeur extrême ✅

---

## Préambule : un thermohygromètre qui « joue »

Franchement, j'ai essayé pas mal de solutions pour afficher température et humidité : grands écrans OLED, petits afficheurs 7 segments, voire du simple `Serial.print`… À chaque fois que je voyais quelques chiffres tout seuls sur l'écran, je ressentais une espèce de vide indicible. Ce n'était pas inutilisable, mais il manquait cette petite **âme**.

Jusqu'au jour où j'ai ressorti mon Game Boy d'enfance. Cet écran jaune-vert classique m'a soudainement inspiré : **puisque c'est juste pour afficher des chiffres, pourquoi ne pas le faire de façon plus rétro, plus ludique ?**

C'est ainsi qu'est né ce projet : piloter un LCD rond GC9A01 avec un ESP32-S3, couplé à un capteur de température et d'humidité DHT11, le tout en dessinant une police pixel à la main, pour transporter la palette quatre tons vert emblématique du Game Boy DMG sur l'écran rond — un **thermohygromètre rétro pixel** qu'on a envie de regarder deux fois quand il est posé sur le bureau.

Pas de bibliothèque UI toute faite, pas de framework compliqué : uniquement des `fillRect()` pour « empiler » les chiffres pixel par pixel. Cette méthode un peu bourrine a finalement le plus de cachet.

**Objectif de cet article** : même sans aucune base, tu pourras suivre le flux de bout en bout et finir par voir la température et l'humidité en temps réel sur l'écran rond GC9A01, avec un rendu suffisamment classes.

---

## Résultat de l'expérience

![](https://img.lingflux.com/2026/06/755f0087c027a35770edb0fd87a81a35.jpg)

Le résultat final en une phrase : **écran rond 240×240, fond vert crème, gros chiffres pixel de température et d'humidité centrés, transitions en douceur lors des changements de valeur, clignotement d'alerte hors limites, environ 30fps, sans aucun déchirement ni scintillement**.

---

## Présentation des composants

Avant d'acheter les pièces, faisons connaissance avec les trois protagonistes du jour.

### ESP32-S3 · la seule partie « intelligente » du projet

L'ESP32-S3 est une puce double mode Wi-Fi + Bluetooth d'Espressif, mais ici on n'utilise pas ses capacités réseau : on mise sur ses **GPIO abondants, sa mémoire généreuse et son bus SPI suffisamment rapide**.

> Pour comprendre par analogie : si l'écran rond GC9A01 est un téléviseur, l'ESP32-S3 est le décodeur qui y envoie le signal du programme — tout le « contenu » vient de lui, l'écran se contente de « diffuser ».

Caractéristiques clés :
- Fréquence 240 MHz (double cœur Xtensa LX7)
- Mémoire 512 KB de SRAM, plus PSRAM en option
- SPI matériel pris en charge, jusqu'à 80 MHz
- Tension de fonctionnement 3,3V, GPIO tolérant 3,3V (⚠️ ne jamais appliquer de signal 5V)

---

### Écran rond GC9A01 · la source du look rétro pixel

Le GC9A01 est un driver de LCD IPS rond de résolution **240×240**, généralement vendu en petit module rond d'environ 1,28 pouce de diamètre, avec une interface SPI 4 fils standard.

> Pour comprendre par analogie : tu connais ces vieux cadrans de montres mécaniques ? Le GC9A01 remplace le cadran par un petit écran couleur programmable capable d'afficher n'importe quoi — rond, c'est juste élégant.

Caractéristiques clés :
- Résolution : 240 × 240 pixels, zone visible ronde
- Interface : SPI 4 fils (jusqu'à 80 MHz d'horloge)
- Profondeur de couleur : RGB565 16 bits (65 536 couleurs)
- Tension de fonctionnement : 3,3V (VCC et niveaux logiques en 3,3V, **ne pas mettre 5V !**)
- Rétroéclairage : broche dédiée (BL), allumé au niveau haut

---

### DHT11 · le petit voisin curieux

Le DHT11 est un capteur numérique bon marché qui combine température + humidité. Une seule ligne de données suffit pour renvoyer les deux valeurs, ce qui le rend particulièrement simple à utiliser.

> Pour comprendre par analogie : le DHT11 est comme un petit voisin logé chez toi, qui te scrute sans cesse pour te rapporter « il fait combien de degrés, et l'air est-il chargé d'eau ». Sa précision est moyenne, mais suffisante, et il est silencieux.

Caractéristiques clés :
- Plage de température : 0 ~ 50°C, précision ±2°C
- Plage d'humidité : 20 % ~ 90 % RH, précision ±5 % RH
- Intervalle d'échantillonnage : 1 seconde minimum (le code lit toutes les 2 secondes)
- Interface de données : protocole numérique à un seul fil (variante 1-Wire)
- Tension de fonctionnement : 3,3V ou 5V (ici alimenté en 3,3V)

---

## BOM (liste des composants)

| Composant | Référence / Spécification | Quantité | Remarque |
| :--- | :--- | :---: | :--- |
| Carte de développement | ESP32-S3 Dev Module | 1 | Vérifier la présence d'un port de flash USB-C embarqué |
| Écran couleur rond | GC9A01 · 1,28 pouce · 240×240 SPI | 1 | Choisir une version avec broche BL à l'achat |
| Capteur température/humidité | Module DHT11 (version module avec résistance de tirage) | 1 | Version module recommandée, pas de résistance externe à ajouter |
| Fils de raccordement | Fils Dupont (mâle-mâle / mâle-femelle) | Plusieurs | Prévoir des deux types |

---

## Câblage

### DHT11 → ESP32-S3

| Broche DHT11 | Broche ESP32-S3 | Remarque |
| :--- | :--- | :--- |
| GND | GND | Masse commune |
| VCC | 3V3 | Alimentation du capteur (3,3V) |
| DAT (DATA) | GPIO 47 | Bus de données |

### Écran rond GC9A01 → ESP32-S3

| Broche GC9A01 | Broche ESP32-S3 | Remarque |
| :--- | :--- | :--- |
| VCC | 3.3V | Alimentation principale de l'écran (⚠️ impérativement 3.3V, pas 5V) |
| GND | GND | Masse commune |
| SCL / CLK | GPIO 12 | Ligne d'horloge SPI |
| SDA / MOSI | GPIO 11 | Ligne de données SPI |
| CS | GPIO 9 | Sélection de puce (actif à l'état bas) |
| DC | GPIO 10 | Bascule données/commande |
| RST | GPIO 18 | Reset matériel |
| BL | GPIO 7 | Contrôle du rétroéclairage (cette broche peut être absente ; le code la maintient haute pour rester allumée ; peut aussi être directement reliée au 3.3V) |

> 💡 **Rappel pratique** : une fois le câblage terminé, ne te précipite pas à la mise sous tension — vérifie chaque ligne du tableau ci-dessus. Confirme surtout que VCC est bien sur **3.3V et non 5V** (un GC9A01 branché en 5V est quasiment foutu), et que la broche DAT du DHT11 est bien sur le bon GPIO. Ceux qui sont déjà tombés dans ce piège connaissent ce sentiment de désespoir : « je mets sous tension, et l'écran ne s'allume plus jamais ».



---

## Installation des bibliothèques requises

Ouvre l'IDE Arduino, va dans **Outils → Gérer les bibliothèques**, recherche et installe les deux bibliothèques suivantes :

**1. Arduino_GFX_Library**

- Mot-clé de recherche : `Arduino_GFX`
- Auteur : `Moon On Our Nation`
- Rôle : pilote l'écran rond GC9A01, intègre la fonction Canvas à double tampon (la clé pour éliminer le scintillement)

**2. DHT sensor library**

- Mot-clé de recherche : `DHT sensor library`
- Auteur : `Adafruit`
- Lors de l'installation, à la question « Installer les dépendances ? », choisis **Install all** (ça installera au passage Adafruit Unified Sensor)

> Une fois l'installation terminée, il est conseillé de redémarrer l'IDE Arduino pour s'assurer que les fichiers de bibliothèque sont correctement chargés.

---

## Code complet

Structure du code :
- **Phase d'initialisation** : allumer le rétroéclairage → initialiser l'écran → lire les premières données du DHT11
- **Boucle principale** : lire le capteur toutes les 2 secondes, rendre une image toutes les 33 ms (environ 30fps)
- **Mécanisme de rendu** : dessiner d'abord sur le Canvas en mémoire, puis tout envoyer à l'écran en une fois pour éliminer déchirements et scintillements
- **Police pixel** : 5×7 pour les libellés, 5×9 pour les gros chiffres, le tout tracé à la main via `fillRect()` case par case
- **Animation d'alerte** : si température supérieure à 35°C ou inférieure à 5°C, humidité supérieure à 85% ou inférieure à 20%, les chiffres clignotent à intervalles de 400 ms

```cpp
/**
 * ╔══════════════════════════════════════════════════╗
 * ║   Thermohygromètre rond ESP32-S3 · ÉDITION PIXEL ║
 * ║   RÉTRO GAME BOY                                 ║
 * ║   Matériel : ESP32-S3 + GC9A01(240×240) + DHT11  ║
 * ║   Bibliothèques : Arduino_GFX_Library + DHT      ║
 * ║                (Adafruit)                        ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Palette — quatre tons vert classiques du Game Boy DMG :
 *   PAL_BG      #CADC9F  Vert crème jaune (fond, source du côté rétro)
 *   PAL_LITE    #9BBC0F  Vert le plus clair (décor en surbrillance)
 *   PAL_MID     #8BAC0F  Vert clair (points décoratifs)
 *   PAL_DARK    #306230  Vert moyen (texte des libellés / séparateurs)
 *   PAL_DARKEST #0F380F  Vert encre (chiffres principaux / cadre, contraste max)
 *
 * Logique d'alerte (technique classique sur machine monochrome) :
 *   Température >35°C ou <5°C → les chiffres clignotent à 400 ms d'intervalle
 *   Humidité >85% ou <20%  → idem
 */

#include <Arduino_GFX_Library.h>
#include <DHT.h>

// ══════════════════════════════════════════
// Étape 1 : définition des broches
//   Change les numéros ici pour modifier les broches, sans toucher au reste
// ══════════════════════════════════════════
#define DHTPIN    47      // Broche DATA du DHT11
#define DHTTYPE   DHT11

#define TFT_SCK   12     // Horloge SPI du GC9A01
#define TFT_MOSI  11     // Données SPI du GC9A01
#define TFT_CS    9      // Sélection de puce GC9A01
#define TFT_DC    10     // Données/commande GC9A01
#define TFT_RST   18     // Reset matériel GC9A01
#define TFT_BL    7      // Rétroéclairage GC9A01 (HIGH = allumé)

// ══════════════════════════════════════════
// Étape 2 : palette quatre tons vert Game Boy (DMG)
//   Format couleur : RGB565 (16 bits)
//   Ne modifie pas les couleurs ici, sinon ce n'est plus du Game Boy :)
// ══════════════════════════════════════════
#define PAL_BG       0xCF69   // Vert crème jaune — fond
#define PAL_LITE     0x9DC2   // Vert le plus clair — décor en surbrillance (peu utilisé pour l'instant)
#define PAL_MID      0x8D42   // Vert clair — point clignotant de la barre supérieure
#define PAL_DARK     0x3306   // Vert moyen — libellés / séparateurs
#define PAL_DARKEST  0x11C2   // Vert encre — chiffres principaux / cadre

// ══════════════════════════════════════════
// Étape 3 : constantes d'écran et facteurs d'échelle de la police
// ══════════════════════════════════════════
#define CX  120        // Centre X (milieu exact de l'écran)
#define CY  120        // Centre Y (milieu exact de l'écran)

#define BOLD_SCALE  6  // Facteur d'agrandissement des gros chiffres (5×9 × 6 = 30×54 pixels)
#define DOT_INSET   1  // Rétraction de 1 px à l'intérieur de chaque case pour laisser un interstice de couleur de fond et obtenir un effet de grille matricielle
#define UNIT_SCALE  2  // Taille de la police des unités (°C / %)
#define LBL_SCALE   2  // Taille de la police des libellés (TEMP / HUM)

// ══════════════════════════════════════════
// Étape 4 : initialisation des objets matériels
// ══════════════════════════════════════════
DHT dht(DHTPIN, DHTTYPE);

// Bus SPI matériel
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, GFX_NOT_DEFINED);

// Driver GC9A01 (dernier paramètre true = pas de rotation, couleurs inversées liées)
Arduino_GFX *display = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas à double tampon : on dessine l'image complète en mémoire, puis flush() l'envoie en une fois à l'écran
//   C'est le moyen clé d'éliminer le scintillement, semblable au rendu hors écran des moteurs de jeux
Arduino_GFX *gfx = new Arduino_Canvas(240, 240, display);

// ══════════════════════════════════════════
// Variables d'état globales
// ══════════════════════════════════════════
float g_temp = 0, g_hum = 0;          // Valeurs réelles lues du capteur
float g_dispTemp = 0, g_dispHum = 0;  // Valeurs affichées (transition en douceur, évite les sauts brusques)
bool  g_hasData = false;              // Au moins une donnée valide obtenue ?

// ══════════════════════════════════════════
// Prototypes de fonctions (indique au compilateur « ces fonctions existent plus bas »)
// ══════════════════════════════════════════
const uint8_t* glyph(char ch);
int16_t  pixelAdvance(char ch, uint8_t scale);
int16_t  pixelTextWidth(const char *s, uint8_t scale);
void     drawPixelText(const char *s, int16_t x, int16_t y,
                       uint8_t scale, uint16_t c);
void     drawCenteredPixel(const char *s, int16_t y,
                           uint8_t scale, uint16_t c);
const uint8_t* boldGlyph(char ch);
int16_t  boldAdvance(char ch, uint8_t scale);
int16_t  boldTextWidth(const char *s, uint8_t scale);
void     drawBoldText(const char *s, int16_t x, int16_t y,
                      uint8_t scale, uint16_t c);
void     drawBezel();
void     drawTopBar(unsigned long t);
void     drawValue(const char *num, const char *unit,
                   int16_t yTop, uint16_t col);
void     drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c);
uint16_t tempColor(unsigned long t);
uint16_t humColor(unsigned long t);
void     drawScene(unsigned long t);

// ══════════════════════════════════════════
// setup() — exécutée une seule fois à la mise sous tension
// ══════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=============================");
  Serial.println("  Thermohygromètre pixel GAME BOY");
  Serial.println("=============================");

  // 1. Allumer le rétroéclairage
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 2. Initialiser l'écran
  if (!gfx->begin()) {
    Serial.println("[ERROR] Échec de l'initialisation de l'écran ! Vérifiez le câblage puis remettez sous tension.");
    while (true) delay(500);   // Bloque ici, évite de tourner dans le vide
  }
  gfx->fillScreen(PAL_BG);
  gfx->flush();
  Serial.println("[OK] Initialisation de l'écran terminée");

  // 3. Initialiser le DHT11, attendre 2 secondes pour stabiliser le capteur puis lire une première valeur
  dht.begin();
  Serial.println("[OK] DHT11 initialisé, lecture en cours...");
  delay(2000);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    g_temp = g_dispTemp = t;
    g_hum  = g_dispHum  = h;
    g_hasData = true;
    Serial.printf("[DATA] Lecture initiale T=%.1f°C  H=%.1f%%\n", t, h);
  } else {
    Serial.println("[WARN] Échec de la lecture initiale, l'écran affiche --.- en attente d'une prochaine valeur valide");
  }
}

// ══════════════════════════════════════════
// loop() — lit le capteur toutes les 2 s, rend une image toutes les 33 ms (environ 30fps)
// ══════════════════════════════════════════
unsigned long lastRead  = 0;
unsigned long lastFrame = 0;

void loop() {
  unsigned long now = millis();

  // Lecture du capteur toutes les 2 secondes (intervalle min du DHT11 : 1 s, 2 s est plus stable)
  if (now - lastRead >= 2000) {
    lastRead = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      g_temp = t;
      g_hum  = h;
      g_hasData = true;
      Serial.printf("[DATA] T=%.1f°C  H=%.1f%%\n", t, h);
    } else {
      // En cas d'échec, on ne met pas à jour, on conserve la dernière valeur valide
      Serial.println("[WARN] Échec de lecture du DHT11, conservation de la dernière valeur");
    }
  }

  // La valeur affichée suit la valeur réelle avec un lissage à 8 % (elle s'en rapproche doucement à chaque image)
  //   Analogie : comme l'aiguille d'un vieux cadran qui ne saute pas instantanément vers la nouvelle position
  g_dispTemp += (g_temp - g_dispTemp) * 0.08f;
  g_dispHum  += (g_hum  - g_dispHum)  * 0.08f;

  // Rendu à environ 30fps (une image toutes les 33 ms)
  if (now - lastFrame >= 33) {
    lastFrame = now;
    drawScene(now);
    gfx->flush();    // Envoie tout le Canvas mémoire d'un coup vers l'écran physique
  }
}

// ══════════════════════════════════════════
// drawScene() — rend tout le contenu d'une image
//   Ordre de dessin : couleur de fond → cadre rond → barre supérieure → zone température → séparateur → zone humidité
// ══════════════════════════════════════════
void drawScene(unsigned long t) {
  // 1. Effacer l'écran (fond vert crème)
  gfx->fillScreen(PAL_BG);

  // 2. Dessiner le cadre rond et les points décoratifs
  drawBezel();

  // 3. Dessiner la barre supérieure (titre + voyant de fonctionnement)
  drawTopBar(t);

  // 4. Zone température
  char num[8];
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispTemp);
  else           strcpy(num, "--.-");       // Placeholder affiché sans donnée

  drawCenteredPixel("TEMP", 44, LBL_SCALE, PAL_DARK);
  drawValue(num, "*C", 62, tempColor(t));   // '*' est mappé dans cette police sur le cercle du degré °

  // 5. Séparateur en pointillé au milieu
  drawDottedH(80, 160, 118, PAL_DARK);

  // 6. Zone humidité
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispHum);
  else           strcpy(num, "--.-");

  drawCenteredPixel("HUM", 124, LBL_SCALE, PAL_DARK);
  drawValue(num, "%", 142, humColor(t));
}

// ──────────────────────────────────────────
// Cadre rond : liseré vert encre double trait + quatre petits carrés décoratifs à 45°
// ──────────────────────────────────────────
void drawBezel() {
  gfx->drawCircle(CX, CY, 116, PAL_DARKEST);
  gfx->drawCircle(CX, CY, 115, PAL_DARKEST);

  // Quatre petits carrés en diagonale à 45° (cos45° ≈ 0,707)
  const int r = 104, d = (int)(r * 0.707f);
  gfx->fillRect(CX + d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // Haut droite
  gfx->fillRect(CX - d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // Haut gauche
  gfx->fillRect(CX + d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // Bas droite
  gfx->fillRect(CX - d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // Bas gauche
}

// ──────────────────────────────────────────
// Barre supérieure : titre centré "DHT11" + point clignotant à gauche toutes les 500 ms (indique que le système tourne)
// ──────────────────────────────────────────
void drawTopBar(unsigned long t) {
  drawCenteredPixel("DHT11", 12, 1, PAL_DARK);

  // Point clignotant (allumé/éteint en alternance) : change de couleur toutes les 500 ms
  bool on = (t / 500) % 2 == 0;
  uint16_t c = on ? PAL_DARKEST : PAL_MID;
  int16_t tw = pixelTextWidth("DHT11", 1);
  int16_t sx = CX - tw / 2;         // Coordonnée X de l'extrémité gauche du titre
  gfx->fillRect(sx - 12, 13, 4, 4, c);
}

// ──────────────────────────────────────────
// Ligne de valeur : le gros chiffre est centré horizontalement, l'unité °C/% apparaît en petit exposant en haut à droite
//   Ainsi le chiffre reste centré, non décalé par l'unité
// ──────────────────────────────────────────
void drawValue(const char *num, const char *unit,
               int16_t yTop, uint16_t col) {
  int16_t nw = boldTextWidth(num, BOLD_SCALE);
  int16_t sx = CX - nw / 2;                  // X de départ centré du chiffre

  drawBoldText(num, sx, yTop, BOLD_SCALE, col);
  // L'unité est collée à droite du chiffre, remontée de 2 px pour un effet d'exposant
  drawPixelText(unit, sx + nw + 3, yTop + 2, UNIT_SCALE, col);
}

// ──────────────────────────────────────────
// Ligne pointillée horizontale en pixels (petits carrés 2×2, espacés de 5 px)
// ──────────────────────────────────────────
void drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c) {
  for (int16_t x = x0; x <= x1; x += 5) {
    gfx->fillRect(x, y, 2, 2, c);
  }
}

// ══════════════════════════════════════════
// Mappage de couleur — normal = vert encre ; extrême = « clignotement éteint » à 400 ms d'intervalle pour alerter
// ══════════════════════════════════════════
uint16_t tempColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispTemp > 35.0f || g_dispTemp < 5.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;   // Éteint = même couleur que le fond
  return PAL_DARKEST;
}

uint16_t humColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispHum > 85.0f || g_dispHum < 20.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;
  return PAL_DARKEST;
}

// ══════════════════════════════════════════
// Police pixel 5×7 (pour libellés/unités)
//   7 lignes par caractère, les 5 bits bas de chaque ligne = colonnes 0~4 (bit4 = colonne la plus à gauche)
//   Caractères spéciaux : '*' est mappé sur le cercle du degré °, '.' est dessiné comme un petit carré sur la ligne de base
// ══════════════════════════════════════════
const uint8_t EMPTY[7] = {0, 0, 0, 0, 0, 0, 0};

const uint8_t* glyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[7]={0x0E,0x11,0x13,0x15,0x19,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[7]={0x04,0x0C,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[7]={0x0E,0x11,0x01,0x02,0x04,0x08,0x1F}; return g; }
    case '3': { static const uint8_t g[7]={0x1F,0x02,0x04,0x02,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[7]={0x02,0x06,0x0A,0x12,0x1F,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[7]={0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E}; return g; }
    case '6': { static const uint8_t g[7]={0x06,0x08,0x10,0x1E,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[7]={0x1F,0x01,0x02,0x04,0x08,0x08,0x08}; return g; }
    case '8': { static const uint8_t g[7]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[7]={0x0E,0x11,0x11,0x1F,0x01,0x02,0x0C}; return g; }
    case '-': { static const uint8_t g[7]={0x00,0x00,0x00,0x0E,0x00,0x00,0x00}; return g; }
    case '%': { static const uint8_t g[7]={0x18,0x18,0x08,0x04,0x02,0x03,0x03}; return g; }
    case '*': { static const uint8_t g[7]={0x00,0x0E,0x11,0x0E,0x00,0x00,0x00}; return g; } // ° cercle du degré
    case 'C': { static const uint8_t g[7]={0x0E,0x11,0x10,0x10,0x10,0x11,0x0E}; return g; }
    case 'D': { static const uint8_t g[7]={0x1E,0x11,0x11,0x11,0x11,0x11,0x1E}; return g; }
    case 'E': { static const uint8_t g[7]={0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F}; return g; }
    case 'H': { static const uint8_t g[7]={0x11,0x11,0x11,0x1F,0x11,0x11,0x11}; return g; }
    case 'I': { static const uint8_t g[7]={0x0E,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case 'M': { static const uint8_t g[7]={0x11,0x1B,0x15,0x15,0x11,0x11,0x11}; return g; }
    case 'N': { static const uint8_t g[7]={0x11,0x19,0x15,0x13,0x11,0x11,0x11}; return g; }
    case 'O': { static const uint8_t g[7]={0x0E,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case 'P': { static const uint8_t g[7]={0x1E,0x11,0x11,0x1E,0x10,0x10,0x10}; return g; }
    case 'T': { static const uint8_t g[7]={0x1F,0x04,0x04,0x04,0x04,0x04,0x04}; return g; }
    case 'U': { static const uint8_t g[7]={0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    default:  return EMPTY;
  }
}

// Avance d'un seul caractère (largeur en pixels + espacement à droite)
int16_t pixelAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale + (scale >> 1) + gap;   // Le point décimal est un peu plus étroit
  return 5 * scale + gap;
}

// Calcule la largeur totale en pixels d'une chaîne de texte
int16_t pixelTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += pixelAdvance(*s, scale);
  return w;
}

// Dessine du texte matriciel 5×7 case par case
void drawPixelText(const char *s, int16_t x, int16_t y,
                   uint8_t scale, uint16_t c) {
  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      gfx->fillRect(x, y + 5 * scale, scale, scale, c);   // Le point décimal sur la ligne de base
      x += 2 * scale + (scale >> 1) + scale;
      continue;
    }
    const uint8_t *g = glyph(ch);
    for (uint8_t r = 0; r < 7; ++r) {
      uint8_t bits = g[r];
      for (uint8_t col = 0; col < 5; ++col) {
        if (bits & (0x10 >> col)) {
          gfx->fillRect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    x += 5 * scale + scale;
  }
}

// Dessine du texte 5×7 centré horizontalement
void drawCenteredPixel(const char *s, int16_t y, uint8_t scale, uint16_t c) {
  int16_t w = pixelTextWidth(s, scale);
  drawPixelText(s, CX - w / 2, y, scale, c);
}

// ══════════════════════════════════════════
// Police gros chiffres matriciels 5×9 (réservée aux valeurs vedettes température/humidité)
//
//   Particularités de conception :
//   · Rétraction de DOT_INSET px à l'intérieur de chaque case pour laisser un interstice de couleur de fond et obtenir un effet de grille matricielle LCD
//   · '2' avec angle en haut + barre oblique en escalier case par case + base pleine double ligne
//   · '5' avec barre pleine d'un seul tenant en haut et en bas
//   · '.' ne passe pas par la table de glyphes : drawBoldText dessine directement une case unique sur la ligne de base
// ══════════════════════════════════════════
const uint8_t* boldGlyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[9]={0x0C,0x04,0x04,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[9]={0x0E,0x11,0x01,0x02,0x04,0x08,0x10,0x1F,0x1F}; return g; }
    case '3': { static const uint8_t g[9]={0x0E,0x11,0x01,0x01,0x06,0x01,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[9]={0x02,0x06,0x0A,0x12,0x12,0x1F,0x02,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[9]={0x1F,0x10,0x10,0x1E,0x01,0x01,0x01,0x11,0x1F}; return g; }
    case '6': { static const uint8_t g[9]={0x0E,0x11,0x10,0x10,0x1E,0x11,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[9]={0x1F,0x01,0x02,0x02,0x04,0x04,0x08,0x08,0x10}; return g; }
    case '8': { static const uint8_t g[9]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x0F,0x01,0x01,0x11,0x0E}; return g; }
    case '-': { static const uint8_t g[9]={0x00,0x00,0x00,0x00,0x1F,0x00,0x00,0x00,0x00}; return g; }
    default:  return nullptr;
  }
}

// Avance d'un seul gros chiffre
int16_t boldAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale;    // Point décimal = 1 case de large + 1 case d'espacement
  return 5 * scale + gap;
}

// Calcule la largeur totale d'une chaîne de gros chiffres
int16_t boldTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += boldAdvance(*s, scale);
  return w;
}

// Dessine des gros chiffres matriciels 5×9 case par case (rétraction de DOT_INSET à l'intérieur de chaque case pour laisser l'interstice de couleur de fond)
void drawBoldText(const char *s, int16_t x, int16_t y,
                  uint8_t scale, uint16_t c) {
  int8_t dot = scale - 2 * DOT_INSET;      // Côté réel du carré allumé (après rétraction)
  if (dot < 1) dot = 1;                    // Au moins 1 px, pour qu'il ne disparaisse pas

  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      // Point décimal : dessine un seul carré rétracté à la ligne 7 (ligne de base)
      gfx->fillRect(x + DOT_INSET, y + 7 * scale + DOT_INSET, dot, dot, c);
      x += 2 * scale;
      continue;
    }
    const uint8_t *g = boldGlyph(ch);
    if (g) {
      for (uint8_t r = 0; r < 9; ++r) {
        uint8_t bits = g[r];
        for (uint8_t col = 0; col < 5; ++col) {
          if (bits & (0x10 >> col)) {
            gfx->fillRect(
              x + col * scale + DOT_INSET,
              y + r   * scale + DOT_INSET,
              dot, dot, c);
          }
        }
      }
    }
    x += 5 * scale + scale;
  }
}
```

---

## Dépannage des problèmes courants

Pas de panique, 90 % des soucis viennent de ces quelques points, les passer en revue résout la plupart des cas :

**L'écran ne s'allume pas du tout à la mise sous tension (pas même le rétroéclairage)**

La broche BL est probablement mal raccordée, ou la ligne `digitalWrite(TFT_BL, HIGH)` du code n'a pas pris effet. Vérifie d'abord le fil entre GPIO7 et BL, puis essaie de relier BL directement au 3.3V (en contournant le contrôle logiciel). Si le rétroéclairage s'allume mais que l'écran reste noir, voir ci-dessous.

**Rétroéclairage allumé mais écran tout noir, ou « neige » à l'écran**

Le câblage SPI pose problème, vérifie en priorité SCK (GPIO12), MOSI (GPIO11), CS (GPIO9) et DC (GPIO10). DC et CS s'inversent facilement ; une erreur sur l'une de ces deux broches donne un écran noir, ou un affichage totalement perturbé. Par ailleurs, le dernier paramètre `true/false` du driver GC9A01 contrôle l'inversion des couleurs — si l'image ressemble à un négatif, passe `true` à `false` (ou inversement).

**Couleurs globalement décalées, pas du vert crème**

Problème d'ordre des octets en RGB565. Arduino_GFX_Library gère généralement ça tout seul, mais si les couleurs sont complètement fausses, tu peux essayer de remplacer le `true` final par `false` lors de la construction d'`Arduino_GC9A01`.

**Le moniteur série affiche en boucle `[WARN] Échec de lecture du DHT11`**

- Vérifie que la broche DAT est bien sur GPIO47
- Si tu utilises un DHT11 nu (pas la version module), il faut une résistance de tirage de 10 kΩ entre DAT et VCC ; la version module l'a généralement déjà soudée
- Le `delay(2000)` après `dht.begin()` ne doit pas être supprimé : le DHT11 a besoin d'environ 1 seconde de stabilisation à la mise sous tension, sinon tu liras des NaN
- Vérifie que VCC est bien sur 3.3V (pour ce projet). Si ton DHT11 ne supporte que le 5V, alimente-le en 5V et insère une résistance en série entre DAT et GPIO47 pour faire une conversion de niveau (ou change simplement pour un DHT11 version module, souvent utilisable en 3.3V)

**Les chiffres se mettent à jour, mais l'image scintille ou se déchire nettement**

Le double tampon du Canvas fonctionne-t-il correctement ? Vérifie que `gfx->flush()` n'a pas été oublié dans le code, et surtout **dessine toujours sur l'objet Canvas `gfx->`, jamais sur `display->`**. Par ailleurs, sélectionne bien le bon modèle de carte pour l'ESP32-S3 (`ESP32S3 Dev Module`), sinon la vitesse SPI sera incorrecte.

**Erreur de compilation : `'drawScene' was not declared in this scope`**

C'est un problème d'ordre de déclaration des fonctions. Assure-toi que la liste des prototypes en haut du code contient bien `void drawScene(unsigned long t);`, ou déplace la définition de la fonction `drawScene` avant `loop()`.

---

## FAQ

**Q : Peut-on remplacer les numéros de GPIO par d'autres ?**
R : Oui, il suffit de modifier les `#define` en haut du code, sans rien changer d'autre. La broche DAT du DHT11 peut aller sur n'importe quel GPIO ; pour SCK/MOSI du GC9A01, mieux vaut utiliser les broches SPI matérielles par défaut de l'ESP32-S3 (GPIO 11/12) pour la vitesse maximale. Les autres broches fonctionnent aussi, mais nécessitent une configuration SPI logicielle supplémentaire.

**Q : Peut-on remplacer le DHT11 par un DHT22 ?**
R : Tout à fait. Il suffit de modifier la ligne 16 du code en `#define DHTTYPE DHT22`, le reste est inchangé. Le DHT22 est plus précis (température ±0,5°C, humidité ±2~5 % RH) avec un intervalle d'échantillonnage minimal de 2 secondes (le code est déjà réglé sur 2 secondes, c'est donc parfaitement compatible).

**Q : Quelle est la fréquence d'horloge SPI maximale prise en charge par le GC9A01 ?**
R : La spécification officielle du GC9A01 accepte jusqu'à 100 MHz d'horloge SPI ; en pratique, l'ESP32-S3 à 80 MHz se passe généralement sans souci. Arduino_GFX_Library utilise par défaut la vitesse maximale du SPI matériel, aucune configuration manuelle n'est nécessaire.

**Q : Quelle est la tension des GPIO de l'ESP32-S3 ? Peut-on raccorder directement des appareils 5V ?**
R : Les GPIO de l'ESP32-S3 fonctionnent en 3,3V et **ne tolèrent pas les signaux 5V** ; brancher directement un appareil en logique 5V peut endommager la puce. L'écran rond GC9A01 est également un composant 3,3V. Si ton DHT11 est alimenté en 5V, le niveau haut de la broche DAT avoisine 4,5V : il est conseillé d'ajouter un pont diviseur (10 kΩ + 20 kΩ) ou un module de conversion de niveau pour abaisser la tension.

**Q : Quel est environ le framerate et le taux d'occupation CPU du code ?**
R : Le code actuel tourne à environ 30fps (intervalle de 33 ms par image), le rendu de chaque image prend environ 8~15 ms (selon la vitesse SPI), avec un taux d'occupation CPU d'environ 20~40 %. Le second cœur du double cœur ESP32-S3 reste totalement libre ; si besoin, tu peux placer la lecture du capteur sur le Core 0 et le rendu sur le Core 1 pour gagner encore en fluidité.

**Q : Que faire si la température et l'humidité affichent toujours `--.-` sans se rafraîchir ?**
R : Cela signifie que `g_hasData` reste à `false`, c'est-à-dire que le DHT11 n'a jamais renvoyé de valeur valide. Vérifie dans l'ordre : ① confirmer que DAT est sur GPIO47 ; ② le DHT11 version module n'a pas besoin de résistance de tirage supplémentaire, la version nue nécessite une 10 kΩ ; ③ avec le moniteur série (115200 bauds), regarde s'il y a des sorties `[DATA]` ou `[WARN]` pour savoir si le problème vient du capteur ou du câblage ; ④ vérifie la tension de VCC (3,3V recommandée).

**Q : Que signifie le paramètre `true` dans le code (constructeur du GC9A01) ?**
R : Le quatrième paramètre de `new Arduino_GC9A01(bus, TFT_RST, 0, true)` contrôle l'inversion des couleurs (différence de sortie RGB entre panneau IPS et panneau TN). Avec `true`, les couleurs sont rendues normalement ; avec `false`, on obtient une inversion des couleurs façon « effet négatif ». Si les couleurs de ton écran semblent inversées, remplace `true` par `false`.

---

## Références

- [Documentation et exemples officiels d'Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Documentation de la bibliothèque Adafruit DHT sensor library](https://github.com/adafruit/DHT-sensor-library)
- [Fiche technique du GC9A01 (PDF officiel)](https://www.waveshare.com/w/upload/5/5e/GC9A01A.pdf)
- [Spécifications officielles du DHT11 (fabricant Aosong)](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf)
- [Manuel de référence technique ESP32-S3 d'Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_cn.pdf)
