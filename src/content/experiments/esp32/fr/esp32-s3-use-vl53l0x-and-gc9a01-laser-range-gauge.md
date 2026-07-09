---
title: "ESP32-S3 + écran rond GC9A01 + VL53L0X-V2 : tuto complet de mesure de distance par laser (câblage SPI + pièges I2C)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/vl53l0x
category: esp32
date: 2026-07-09
intro: "Pilotez un écran rond GC9A01 1.28 pouce avec un ESP32-S3, couplé au capteur de mesure de distance par laser VL53L0X-V2, pour réaliser un tableau de bord cyberpunk dont l'aiguille bouge en temps réel et dont l'arc change de couleur selon la distance. Avec les pièges de conflit de broches SPI+I2C et tout le code source Arduino."
image: "https://img.lingflux.com/2026/07/68114f0f73885a81414b9432bd0d95eb.jpg"
---



# ESP32-S3 pilote écran rond GC9A01 + VL53L0X-V2 mesure de distance par laser : du câblage à l'allumage du tableau de bord cyberpunk (tout le code inclus)

Difficulté : ⭐⭐⭐☆☆ (accessible à un maker avec quelques bases, demande un peu de patience pour le câblage)
Temps estimé : 45 minutes
Environnement de test : Arduino IDE 2.3.8 + ESP32 Core 3.3.10 + Arduino_GFX_Library v1.6.5 + Adafruit_VL53L0X v1.2.5

---

> **TL;DR (démarrage rapide) :**
>
> 1. Câblage écran : GPIO12→SCL, GPIO11→SDA, GPIO9→CS, GPIO10→DC, GPIO18→RST, GPIO7→BL
> 2. Câblage capteur : GPIO13→SDA, GPIO14→SCL (**attention, ce ne sont pas les broches I2C par défaut**, car GPIO9 est déjà pris par le CS de l'écran)
> 3. Installez deux bibliothèques : `Arduino_GFX_Library`, `Adafruit_VL53L0X`
> 4. Flashez d'abord le « code de test du capteur », vérifiez que la distance s'affiche sur le port série, puis flashez le programme principal
> 5. Flashez le programme principal : un tableau de bord laser avec aiguille rotative et couleurs changeantes apparaît sur l'écran rond

---

## Préambule : pourquoi se prendre la tête avec ce tableau de bord rond

Les modules de mesure de distance par laser (ToF) sont très populaires, mais la plupart des utilisateurs en restent au stade du « chiffre imprimé sur le port série ». L'objectif de ce projet est simple : exploiter la puissance de l'ESP32-S3 et l'attrait visuel de l'écran rond GC9A01 pour transformer des données de distance abstraites en un tableau de bord haute fréquence de rafraîchissement, à la fois utile et résolument cyberpunk.

La vraie difficulté du projet n'est pas logicielle, mais matérielle : le conflit de broches entre l'interface SPI de l'écran et l'interface I2C du capteur. Pour résoudre les échecs d'initialisation causés par le chevauchement des broches par défaut de la carte, j'ai remappé les broches matérielles. Voici le guide complet des pièges et astuces, ainsi que l'implémentation du programme principal.

## Aperçu du résultat final

Le résultat ressemble à ceci : sur l'écran rond, un cadran à arc gradué façon compteur de tours d'une voiture de course. L'aiguille pointe en temps réel vers la distance mesurée, la couleur de l'arc passe du rouge (proche/danger) au vert (loin/sûr), et le centre affiche la valeur en millimètres avec un texte d'état (DANGER / WARNING / CAUTION / SAFE / CLEAR). Passez la main devant le capteur, l'aiguille suit en direct — c'est plutôt satisfaisant.

## Description des composants

Pas besoin de présenter la carte de développement (ESP32-S3), concentrons-nous sur les deux vedettes.

### GC9A01 écran rond 240×240

Le GC9A01 est un circuit driver d'affichage conçu spécifiquement pour les écrans ronds. Il « traduit » les données de pixels que vous lui envoyez en image à l'écran — vous dites quoi dessiner, lui s'occupe du comment. Tout le balayage et le rafraîchissement sont gérés en interne, vous n'avez qu'à appeler les API.

| Paramètre       | Valeur              |
| --------------- | ------------------- |
| Résolution      | 240×240             |
| Dimensions      | 1.28 pouce          |
| Interface       | SPI                 |
| Profondeur      | 65K couleurs (RGB565) |
| Bibliothèque    | Arduino_GFX_Library |

Je l'ai choisi pour son prix abordable, parce qu'un écran rond fait un tableau de bord magnifique par nature, et parce que l'interface SPI est assez rapide pour que l'aiguille tourne sans traînée.

### VL53L0X-V2 capteur de mesure de distance par laser

Le VL53L0X est un capteur de mesure de distance par laser basé sur le principe du temps de vol (ToF). En langage clair : il émet un faisceau laser infrarouge invisible, chronomètre le temps mis par le laser pour atteindre l'objet puis revenir, et en déduit la distance — exactement comme l'écholocalisation des chauves-souris, sauf qu'il utilise la lumière au lieu du son.

| Paramètre             | Valeur                                                |
| --------------------- | ----------------------------------------------------- |
| Plage de mesure       | 30mm～1200mm (jusqu'à environ 2000mm en mode longue portée) |
| Précision             | ±3%                                                   |
| Interface             | I2C (jusqu'à 400kHz)                                  |
| Longueur d'onde laser | 940nm (invisible à l'œil humain, laser Class 1, sûr)  |

Je l'ai choisi car il n'est pas sensible à la couleur ni au matériau de la cible (contrairement à la mesure ultrasonore, la mesure infrarouge se fiche presque de l'état de surface), il est assez petit pour tenir dans n'importe quel boîtier, et l'I2C ne réclame que deux fils de signal.

> 💡 **Petit rappel : ce module est généralement vendu sans hublot optique (j'ai oublié de l'acheter en même temps)**
>
> En phase de test, l'utiliser « à nu » ne pose aucun problème, mais quelques pièges méritent d'être connus à l'avance :
>
> - **Ne touchez pas la surface de la puce avec les doigts** : les deux minuscules hublots en verre (un émetteur, un récepteur), plus petits qu'une graine de sésame, craignent la poussière, le gras et l'humidité. Une fois sales, la poussière renvoie le laser et provoque de la « diaphonie (crosstalk) » : la distance mesurée devient étrangement courte, les chiffres sautent, et dans les cas graves la mesure tombe en panne.
> - **Si ça devient sale, n'essuyez pas n'importe comment** : ne frottez surtout pas avec le coin d'un vêtement ou un mouchoir en papier (ça raye). Pour de la poussière, utilisez une **poire à air (soufflette)** ; pour du gras, imbibez très légèrement un coton-tige d'**alcool absolu (éthanol anhydre)** et passez-le avec une extrême douceur, puis laissez sécher.
> - **Sous forte lumière, il devient « aveugle »** : la lumière du soleil et les vieilles ampoules à incandescence contiennent de l'infrarouge ; sans hublot, la portée maximale chute sensiblement. Sur un bureau en intérieur, c'est imperceptible ; en extérieur, soyez-en conscient.
>
> Si plus tard vous comptez l'installer dans un boîtier pour un usage prolongé : **ne collez surtout pas du ruban adhésif transparent ou du verre ordinaire devant la puce** — ces matériaux réfléchissent l'infrarouge et le capteur prendra le hublot pour un obstacle, se bloquant à `0mm` ou à quelques centimètres. Soit vous laissez un trou pour le laisser dépasser, soit vous achetez un **filtre optique infrarouge 940nm** et vous le collez le plus près possible (écart inférieur à 1mm).

## BOM (liste des composants)

| Composant                       | Quantité | Remarque                                    |
| ------------------------------- | -------- | ------------------------------------------- |
| Carte de développement ESP32-S3 | 1        | N'importe quel modèle avec assez de GPIO    |
| Écran rond GC9A01 1.28" (SPI)   | 1        | Vérifiez qu'il s'agit bien de la version SPI, pas parallèle |
| Module télémètre VL53L0X-V2 ToF | 1        | Version platine d'essai / breadboard        |
| Fils Dupont                     | plusieurs |                                             |

## Description des broches des composants

### Broches du GC9A01

| Broche    | Rôle                                                           |
| --------- | -------------------------------------------------------------- |
| VCC       | Pôle positif de l'alimentation, sur 3.3V                       |
| GND       | Masse                                                          |
| SCL/CLK   | Ligne d'horloge SPI                                            |
| SDA/MOSI  | Ligne de données SPI                                           |
| CS        | Chip Select, la puce travaille quand le niveau est bas         |
| DC        | Broche de bascule Données/Commande                            |
| RST       | Broche de reset                                                |
| BL        | Broche de contrôle du rétroéclairage (parfois non cassée sur certains modules, peut être ignorée) |

### Broches du VL53L0X-V2

| Broche | Rôle                                                                                         |
| ------ | -------------------------------------------------------------------------------------------- |
| VIN    | Pôle positif de l'alimentation                                                               |
| GND    | Masse                                                                                        |
| SCL    | Horloge série I2C (entrée)                                                                   |
| SDA    | Données série I2C                                                                            |
| GPIO1  | Broche de sortie d'interruption, signale que les données sont prêtes (inutilisée ici, laisser flottante) |
| XSHUT  | Broche d'arrêt, tirée à l'état haut par défaut pour un fonctionnement normal, mise bas pour l'arrêt (inutilisée ici, laisser flottante) |

## Méthode de câblage

Je recommande de câbler ligne par ligne selon le tableau ci-dessous, en cochant chaque fil au fur et à mesure — ça vous épargnera 80 % du temps de débogage.

### ESP32-S3 vers l'écran GC9A01

| Écran GC9A01 | ESP32-S3                                                        |
| ------------ | --------------------------------------------------------------- |
| VCC          | 3.3V                                                            |
| GND          | GND                                                             |
| SCL / CLK    | GPIO12                                                          |
| SDA / MOSI   | GPIO11                                                          |
| CS           | GPIO9                                                           |
| DC           | GPIO10                                                          |
| RST          | GPIO18                                                          |
| BL           | GPIO7 (contrôlé par code) ou directement sur 3.3V (certaines cartes n'ont pas de contrôle de rétroéclairage indépendant) |

### ESP32-S3 vers le capteur VL53L0X-V2

| VL53L0X-V2 | ESP32-S3                                |
| ---------- | --------------------------------------- |
| VIN        | 3.3V                                    |
| GND        | GND                                     |
| SDA        | GPIO13                                  |
| SCL        | GPIO14                                  |
| GPIO1      | Non connectée (flottante)               |
| XSHUT      | Non connectée (tirée à l'état haut en interne par défaut) |

> ⚠️ **Attention** : les broches I2C par défaut de l'ESP32-S3 sont habituellement GPIO8 (SDA) / GPIO9 (SCL), mais dans ce projet GPIO9 est déjà occupée par le CS de l'écran. L'I2C du capteur a donc été manuellement déplacé sur GPIO13/GPIO14. Le code précise ces deux broches via `Wire.begin(I2C_SDA, I2C_SCL)`. Au moment du câblage, ne revenez pas aux broches par défaut pour gagner du temps, sinon l'écran et le capteur se marcheront dessus et ni l'un ni l'autre ne fonctionnera.

## Bibliothèques à installer

Dans l'IDE Arduino, recherchez et installez-les via le « Gestionnaire de bibliothèques » :

- `Arduino_GFX_Library` (par moononournation) — version testée v1.6.5
- `Adafruit_VL53L0X` (par Adafruit) — version testée v1.2.5 ; lors de l'installation, il vous sera proposé d'installer aussi `Adafruit BusIO`, acceptez.

Version de l'IDE : Arduino IDE 2.3.8, et le paquet de support de la carte ESP32 utilisé est le 3.3.10. Si vos versions sont trop éloignées, vous risquez des incompatibilités d'API — mieux vaut aligner les versions.

## Code complet

### Programme principal du tableau de bord

```cpp
/*
 * ═══════════════════════════════════════════════════════
 *  Tableau de bord cyberpunk · Cyber Gauge Dashboard
 *  Écran rond GC9A01 (240×240) + VL53L0X-V2 mesure de distance par laser
 *  MCU : ESP32-S3
 *  Bibliothèque : Arduino_GFX_Library v1.6.5
 * ═══════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <Arduino_GFX_Library.h>

// ───────── Définitions de couleurs (Arduino_GFX v1.6.5 nécessite définition manuelle)─────────
#define BLACK       0x0000
#define WHITE       0xFFFF
#define RED         0xF800
#define GREEN       0x07E0
#define BLUE        0x001F
#define CYAN        0x07FF
#define YELLOW      0xFFE0
#define ORANGE      0xFD20
#define DARKGREY    0x4208
#define LIGHTGREY   0xC618

// Couleurs du thème cyberpunk
#define CYBER_BG      0x0841    // Fond profond
#define CYBER_PANEL   0x1082    // Couleur du panneau
#define CYBER_BLUE    0x06DF    // Bleu fluo
#define CYBER_CYAN    0x07F5    // Cyan fluo
#define CYBER_GREEN   0x47E0    // Vert fluo
#define CYBER_RED     0xF806    // Rouge d'alerte
#define CYBER_ORANGE  0xFB40    // Orange
#define CYBER_YELLOW  0xFF80    // Jaune
#define CYBER_DIM     0x4A49    // Teinte atténuée

// ───────── Définitions des broches ─────────
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// Le VL53L0X utilise un I2C séparé pour éviter GPIO9 (occupé par TFT_CS)
#define I2C_SDA   13
#define I2C_SCL   14

// ───────── Dimensions de l'écran ─────────
#define SCREEN_W  240
#define SCREEN_H  240
#define CX        120     // Centre X
#define CY        120     // Centre Y

// ───────── Paramètres du tableau de bord ─────────
#define GAUGE_R       95      // Rayon de l'arc gradué
#define GAUGE_WIDTH   10      // Largeur de l'arc
#define NEEDLE_LEN    78      // Longueur de l'aiguille
#define START_ANGLE   135     // Angle de départ (degrés)
#define END_ANGLE     405     // Angle de fin (degrés)
#define MAX_DIST      800     // Distance max affichée (mm)
#define MIN_DIST      20      // Distance min (mm)
#define TICK_COUNT    16      // Nombre de graduations

// ───────── Objets globaux ─────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1 /* MISO */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0 /* rotation */, true /* IPS */
);

Adafruit_VL53L0X lox = Adafruit_VL53L0X();
Arduino_Canvas *canvas;   // Canevas hors écran, pour éliminer le scintillement

// ───────── Variables d'état ─────────
float currentAngle = START_ANGLE;
float targetAngle  = START_ANGLE;
int   currentDist  = 0;
int   lastDist     = -1;

// ═══════════════════════════════════════
//  Fonctions utilitaires
// ═══════════════════════════════════════

// Mélange de deux couleurs RGB565
uint16_t blendColor(uint16_t c1, uint16_t c2, float t) {
  uint8_t r1 = (c1 >> 11) & 0x1F, g1 = (c1 >> 5) & 0x3F, b1 = c1 & 0x1F;
  uint8_t r2 = (c2 >> 11) & 0x1F, g2 = (c2 >> 5) & 0x3F, b2 = c2 & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// Couleur selon la distance (proche=rouge, loin=vert)
uint16_t getDistColor(int dist) {
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  if (ratio < 0.15)  return CYBER_RED;
  if (ratio < 0.30)  return blendColor(CYBER_RED, CYBER_ORANGE, (ratio - 0.15) / 0.15);
  if (ratio < 0.50)  return blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.30) / 0.20);
  if (ratio < 0.70)  return blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.50) / 0.20);
  return blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.70) / 0.30);
}

// Texte d'état
const char* getStatusText(int dist) {
  if (dist < 100) return "DANGER";
  if (dist < 200) return "WARNING";
  if (dist < 400) return "CAUTION";
  if (dist < 600) return "SAFE";
  return "CLEAR";
}

// ═══════════════════════════════════════
//  Fonctions de dessin
// ═══════════════════════════════════════

// Dessine un arc épais (simulé par plusieurs segments courts)
void drawArc(Arduino_Canvas *c, int cx, int cy, int r,
             float startDeg, float endDeg, int thickness,
             uint16_t color) {
  float step = 1.5;  // Angle par pas
  for (float a = startDeg; a <= endDeg; a += step) {
    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// Dessine un arc en dégradé
void drawGradientArc(Arduino_Canvas *c, int cx, int cy, int r,
                     float startDeg, float endDeg, int thickness) {
  float totalAngle = endDeg - startDeg;
  float step = 1.5;

  for (float a = startDeg; a <= endDeg; a += step) {
    float ratio = (a - startDeg) / totalAngle;
    uint16_t color;

    // Rouge -> Orange -> Jaune -> Cyan -> Vert
    if (ratio < 0.2)       color = blendColor(CYBER_RED, CYBER_ORANGE, ratio / 0.2);
    else if (ratio < 0.4)  color = blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.2) / 0.2);
    else if (ratio < 0.6)  color = blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.4) / 0.2);
    else                   color = blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.6) / 0.4);

    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// Dessine les graduations
void drawTicks(Arduino_Canvas *c) {
  float totalAngle = END_ANGLE - START_ANGLE;

  for (int i = 0; i <= TICK_COUNT; i++) {
    float angle = START_ANGLE + (float)i / TICK_COUNT * totalAngle;
    float rad = angle * DEG_TO_RAD;
    float ratio = (float)i / TICK_COUNT;

    // Couleur de la graduation
    uint16_t color;
    if (ratio < 0.2)       color = CYBER_RED;
    else if (ratio < 0.4)  color = CYBER_ORANGE;
    else if (ratio < 0.6)  color = CYBER_YELLOW;
    else if (ratio < 0.8)  color = CYBER_CYAN;
    else                   color = CYBER_GREEN;

    // Graduations longues / courtes
    bool isMajor = (i % 4 == 0);
    int innerR  = GAUGE_R + 4;
    int outerR  = innerR + (isMajor ? 12 : 6);
    int thick   = isMajor ? 2 : 1;

    int x1 = CX + cos(rad) * innerR;
    int y1 = CY + sin(rad) * innerR;
    int x2 = CX + cos(rad) * outerR;
    int y2 = CY + sin(rad) * outerR;

    // Trace la graduation
    for (int t = 0; t < thick; t++) {
      c->drawLine(x1 + t, y1, x2 + t, y2, color);
    }

    // Étiquette numérique pour les graduations principales
    if (isMajor) {
      int labelR = outerR + 12;
      int lx = CX + cos(rad) * labelR;
      int ly = CY + sin(rad) * labelR;
      int val = (float)i / TICK_COUNT * MAX_DIST;

      c->setTextColor(CYBER_DIM);
      c->setTextSize(1);
      c->setCursor(lx - 8, ly - 4);
      c->print(val);
    }
  }
}

// Dessine l'aiguille
void drawNeedle(Arduino_Canvas *c, float angleDeg, uint16_t color) {
  float rad = angleDeg * DEG_TO_RAD;

  // Pointe de l'aiguille
  int tipX = CX + cos(rad) * NEEDLE_LEN;
  int tipY = CY + sin(rad) * NEEDLE_LEN;

  // Base de l'aiguille (deux points perpendiculaires à l'axe)
  float perpRad = rad + PI / 2;
  int baseW = 4;
  int bx1 = CX + cos(perpRad) * baseW;
  int by1 = CY + sin(perpRad) * baseW;
  int bx2 = CX - cos(perpRad) * baseW;
  int by2 = CY - sin(perpRad) * baseW;

  // Dessine l'aiguille triangulaire
  c->fillTriangle(tipX, tipY, bx1, by1, bx2, by2, color);

  // Cercle décoratif central
  c->fillCircle(CX, CY, 7, CYBER_PANEL);
  c->drawCircle(CX, CY, 7, color);
  c->fillCircle(CX, CY, 3, color);
}

// Dessine le tableau de bord complet
void drawDashboard(int dist) {
  canvas->fillScreen(CYBER_BG);

  // Décoration de l'anneau extérieur
  canvas->drawCircle(CX, CY, 118, CYBER_PANEL);

  // Arc de fond (rail sombre)
  drawArc(canvas, CX, CY, GAUGE_R,
          START_ANGLE, END_ANGLE, GAUGE_WIDTH, CYBER_PANEL);

  // Arc en dégradé (complet)
  drawGradientArc(canvas, CX, CY, GAUGE_R,
                  START_ANGLE, END_ANGLE, GAUGE_WIDTH);

  // Graduations
  drawTicks(canvas);

  // Calcul de l'angle de l'aiguille
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  targetAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);

  // Interpolation lissée
  currentAngle += (targetAngle - currentAngle) * 0.15;

  // Couleur
  uint16_t needleColor = getDistColor(dist);

  // Dessine l'aiguille
  drawNeedle(canvas, currentAngle, WHITE);

  // ── Zone numérique centrale ──
  // Valeur de la distance
  canvas->setTextColor(WHITE);
  canvas->setTextSize(3);
  String distStr = String(dist);
  int textW = distStr.length() * 18;
  canvas->setCursor(CX - textW / 2, CY + 16);
  canvas->print(distStr);

  // Unité
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 6, CY + 42);
  canvas->print("mm");

  // Titre
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 30, CY - 28);
  canvas->print("LASER RANGE");

  // Indicateur d'état
  canvas->setTextColor(needleColor);
  canvas->setTextSize(1);
  const char* status = getStatusText(dist);
  int sLen = strlen(status);
  canvas->setCursor(CX - sLen * 3, CY + 56);
  canvas->print(status);

  // Pousse vers l'écran
  canvas->flush();
}

// ═══════════════════════════════════════
//  setup() & loop()
// ═══════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n═══ Cyber Gauge Dashboard ═══");

  // Étape 1 : allumer le rétroéclairage
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // Étape 2 : initialiser l'écran
  gfx->begin();
  gfx->fillScreen(BLACK);
  gfx->setRotation(0);

  // Étape 3 : créer le canevas hors écran (double buffer anti-scintillement)
  canvas = new Arduino_Canvas(SCREEN_W, SCREEN_H, gfx);
  canvas->begin();

  // Écran de démarrage
  canvas->fillScreen(CYBER_BG);
  canvas->setTextColor(CYBER_BLUE);
  canvas->setTextSize(2);
  canvas->setCursor(40, 100);
  canvas->print("CYBER");
  canvas->setCursor(40, 125);
  canvas->print("GAUGE");
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(55, 160);
  canvas->print("Booting...");
  canvas->flush();

  delay(1000);

  // Étape 4 : initialiser l'I2C et le capteur (attention, broches personnalisées, pas celles par défaut)
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("Échec d'initialisation du VL53L0X !");
    canvas->fillScreen(CYBER_BG);
    canvas->setTextColor(CYBER_RED);
    canvas->setTextSize(1);
    canvas->setCursor(50, 110);
    canvas->print("SENSOR ERROR");
    canvas->setCursor(40, 130);
    canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(100);
  }

  Serial.println("VL53L0X prêt ✓");

  // Étape 5 : démarrer le mode de mesure continue
  lox.startRangeContinuous();

  Serial.println("Tableau de bord démarré !");
}

void loop() {
  // Lecture de la distance
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();

    // Filtrage des valeurs invalides
    if (dist > 0 && dist < 8190) {
      // Filtrage passe-bas simple pour éviter les chiffres qui sautent
      currentDist = currentDist * 0.7 + dist * 0.3;
      currentDist = constrain(currentDist, MIN_DIST, MAX_DIST);

      // Ne redessine que si la distance change au-delà d'un seuil, pour économiser des ressources
      if (abs(currentDist - lastDist) > 2) {
        drawDashboard(currentDist);
        lastDist = currentDist;

        Serial.printf("Distance : %d mm\n", currentDist);
      }
    }
  }

  delay(30);  // ~33 FPS
}
```

### Code de test du capteur (à lancer en premier)

Avant de flasher le programme principal, il est fortement recommandé de flasher d'abord ce code minimal afin de confirmer que le capteur fonctionne. En cas de souci, le débogage sera plus simple, sans avoir à chercher au milieu du code de dessin.

```cpp
/*
 *  Test du capteur VL53L0X
 */

#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define I2C_SDA  13
#define I2C_SCL  14

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Test du capteur VL53L0X");

  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("❌ Capteur introuvable, vérifiez le câblage !");
    while (1);
  }

  Serial.println("✓ Capteur prêt, lancement des mesures...");
  lox.startRangeContinuous();
}

void loop() {
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();
    Serial.printf("Distance : %d mm\n", dist);
  }
  delay(100);
}
```

### Explication du code

Quelques points clés qui peuvent prêter à confusion, mis en évidence :

- **`blendColor()`** : mélange deux couleurs RGB565 selon un ratio `t`, utilisé pour produire l'arc en dégradé rouge→orange→jaune→cyan→vert. On ne change pas brutalement de couleur, ce qui rend le rendu plus fluide.
- **`Arduino_Canvas` (canevas hors écran)** : tous les tracés sont d'abord dessinés dans un canevas en mémoire, puis poussés d'un seul coup vers l'écran via `flush()`, plutôt que d'être tracés un par un directement à l'écran. Sans cela, la rotation de l'aiguille produirait un scintillement et des déchirements (tearing) visibles.
- **Filtrage lissé `currentDist * 0.7 + dist * 0.3`** : les relevés bruts du capteur présentent de petites oscillations. On applique ici un filtre passe-bas du premier ordre pour rendre le mouvement de l'aiguille plus fluide et éviter les saccades nerveuses.
- **`I2C_SDA=13, I2C_SCL=14`** : le piège déjà martelé dans la section câblage, on le rappelle — ce ne sont pas les broches I2C par défaut de l'ESP32-S3 ; elles ont été redéfinies manuellement parce que la GPIO9 par défaut est occupée par le CS de l'écran.

## Dépannage des problèmes courants

Pas de panique, 80 % des problèmes viennent de ces quelques points :

1. **L'écran reste noir après le flash**
   Vérifiez d'abord que `TFT_BL` (rétroéclairage) est correctement câblé, et que `digitalWrite(TFT_BL, HIGH)` est bien exécuté dans le code ; vérifiez ensuite que la broche RST n'a pas de mauvais contact — un RST desserré est la cause la plus fréquente d'écran rond noir.

2. **Le port série affiche « Échec d'initialisation du VL53L0X ! »**
   Dans 99 % des cas, c'est un problème de câblage : confirmez que VIN/GND ne sont pas inversés, que SDA/SCL sont bien sur GPIO13/GPIO14 (et non sur les GPIO8/9 par défaut), et que les fils Dupont ne sont pas desserrés. Vous pouvez lancer isolément le « code de test du capteur » pour écarter l'interférence de l'écran.

3. **L'écran s'allume mais affiche des parasites / des bandes / des couleurs erronées**
   C'est probablement un mauvais contact sur l'horloge SPI ou la ligne de données, ou des fils Dupont trop longs qui atténuent le signal. Vérifiez que SCL/SDA correspondent à GPIO12/GPIO11, et gardez les fils Dupont sous 15 cm si possible.

4. **L'aiguille s'agite frénétiquement, les chiffres changent sans arrêt**
   Le coefficient de filtrage est insuffisant, ou un objet réfléchissant/transparent perturbe le capteur devant. Vous pouvez remplacer les poids `currentDist * 0.7 + dist * 0.3` par `0.85/0.15` pour un filtrage plus fort (au prix d'une réponse plus lente).

5. **Erreur de compilation : `Adafruit_VL53L0X.h` ou `Arduino_GFX_Library.h` introuvable**
   La bibliothèque n'est pas correctement installée. Allez dans le gestionnaire de bibliothèques, recherchez le nom exact et réinstallez ; attention à ne pas installer un fork tiers du même nom.

6. **L'angle de l'aiguille ne correspond pas aux graduations**
   Vérifiez si `MAX_DIST` a été réduit sans ajuster les étiquettes de graduation : les deux doivent rester cohérents, sinon les chiffres et la position réelle de l'aiguille seront décalés.

## FAQ

**Q : Quelles sont les broches I2C par défaut de l'ESP32-S3 ?**
R : En général, GPIO8 (SDA) et GPIO9 (SCL), mais dans ce projet GPIO9 est occupée par le CS de l'écran, donc l'I2C du capteur a été déplacé sur GPIO13/GPIO14.

**Q : Quelle est la portée maximale et la précision du VL53L0X ?**
R : Plage de mesure efficace d'environ 30mm～1200mm selon les spécifications officielles (jusqu'à 2000mm en mode longue portée), avec une précision d'environ ±3 %.

**Q : L'écran rond GC9A01 gère-t-il le tactile ?**
R : Le GC9A01 lui-même est uniquement un circuit driver d'affichage, sans fonction tactile ; certains modules du marché intègrent en plus une puce capacitive, à vérifier auprès du modèle précis avant achat.

**Q : Le laser du VL53L0X est-il dangereux pour les yeux ?**
R : Non, c'est un produit laser Class 1, à la longueur d'onde 940nm invisible pour l'œil humain, de puissance extrêmement faible et conforme aux normes de sécurité oculaire — aucune inquiétude à avoir en usage normal.

**Q : L'écran GC9A01 ne s'allume pas alors que l'alimentation est bonne, pourquoi ?**
R : La cause la plus courante est un mauvais contact sur la broche RST (reset), ou bien la broche BL (rétroéclairage) qui n'est pas tirée à l'état haut. Commencez par vérifier ces deux points.

**Q : Pourquoi utiliser un canevas hors écran `Arduino_Canvas` plutôt que de dessiner directement à l'écran ?**
R : Parce que dessiner directement à l'écran provoque un scintillement et des déchirements (tearing) visibles pendant la rotation de l'aiguille et le redessin de l'arc. Le canevas fait office de double buffer : on dessine tout en mémoire puis on rafraîchit d'un seul coup, pour une image nette.

**Q : Y a-t-il une différence entre le VL53L0X-V2 et le VL53L0X classique ?**
R : Le principe de mesure et le brochage sont identiques ; la version V2 est généralement une révision du fabricant du module au niveau du circuit imprimé et de la régulation. Pour les différences précises, référez-vous à la documentation du module que vous avez acheté.

**Q : L'alimentation USB suffit-elle pour ce projet sur ESP32-S3 ?**
R : Oui, la consommation globale de l'écran et du capteur est faible : une alimentation USB 5V/500mA standard suffit largement.

## Pistes d'extension

- Ajouter un buzzer qui déclenche une alarme quand la distance entre dans la zone DANGER — et vous obtenez un radar de recul simplifié.
- Enregistrer les données historiques de distance et tracer une courbe en temps réel pour visualiser la trajectoire d'un objet en mouvement.
- Ajouter deux boutons pour basculer l'unité d'affichage (mm / cm / inch).
- Fabriquer un boîtier à ventouser pour le coller sur le pare-brise et l'utiliser réellement comme radar de recul.

## Références

- [ST VL53L0X fiche technique officielle](https://www.st.com/en/imaging-and-photonics-solutions/vl53l0x.html)
- [Dépôt GitHub Adafruit_VL53L0X](https://github.com/adafruit/Adafruit_VL53L0X)
- [Dépôt GitHub Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Page produit officielle Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3)
