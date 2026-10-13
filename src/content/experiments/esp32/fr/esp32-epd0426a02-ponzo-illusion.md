---
title: "L'ESP32-S3 pilote un écran e-ink EPD0426A02 SSD1677 de 4,26\" pour jouer l'illusion du corridor de Ponzo｜Tutoriel complet SPI + GxEPD2"
boardId: esp32s3
moduleId: display/epd-4inch26-epd0426a02
category: esp32
date: 2026-10-13
intro: "Pilotez l'écran e-ink EPD0426A02 (800×480, contrôleur SSD1677) depuis un ESP32-S3 en SPI et jouez l'animation en quatre images de l'illusion du corridor de Ponzo grâce au rafraîchissement partiel de GxEPD2. Câblage complet, code Arduino et dépannage des écrans blancs ou brouillés inclus."
image: "https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg"
---

> **Résumé en une phrase** : branchez 8 fils, installez 2 bibliothèques, flashez un sketch — et votre ESP32-S3 joue l'illusion du corridor de Ponzo sur un e-ink de 4,26", tout en vous enseignant le rafraîchissement partiel, la compétence e-paper la plus utile qui soit.

```
Difficulté : ⭐⭐☆☆☆ (accessible aux débutants, tant que VCC ne va pas sur 5V)
Temps estimé : 40 minutes (10 de câblage + 15 d'environnement + 15 de flashage et de spectacle)
Testé avec : Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + GxEPD2 1.6.9
```

> **TL;DR (démarrage rapide) :**
>
> 1. Câblage : MOSI → GPIO11, SCK → GPIO12, CS → GPIO10, DC → GPIO9, RST → GPIO8, BUSY → GPIO7
> 2. VCC sur 3,3V (le 5V grille la dalle — ne demandez pas comment je le sais)
> 3. Installez deux bibliothèques : GxEPD2 (≥ 1.5.3) + Adafruit_GFX (s'installe automatiquement avec GxEPD2)
> 4. Sélectionnez la carte "ESP32S3 Dev Module", flashez, et attendez que votre cerveau se fasse avoir

---

## Introduction : un corridor qui trompe l'humanité depuis plus de 100 ans

Vous connaissez forcément cette image : deux segments rigoureusement identiques, mais dès qu'on dessine les lignes de perspective d'un corridor autour, celui qui est « plus loin » paraît plus long. Vous savez qu'ils sont égaux, et pourtant vos yeux refusent de l'admettre — c'est la classique illusion de Ponzo. Votre cerveau active automatiquement le mode « inférence de perspective » et traduit « lointain » par « plus grand ».

Je cherchais depuis longtemps l'occasion de « matérialiser » cette illusion de mes propres mains. Il se trouve que j'avais sous la main un e-ink EPD0426A02 de 4,26" (800×480, contrôleur SSD1677) et un ESP32-S3. Le tempérament de l'e-paper — des changements lents, et une image qui survit à la coupure de courant — se marie à merveille avec une démo d'illusion : le public a tout le temps de douter de la réalité et, une fois terminé, on débranche et on le pose sur la table pour tromper l'invité suivant.

Cet article vous guide de zéro : branchez 8 fils, installez 2 bibliothèques, flashez un sketch, et laissez cet écran donner une leçon à votre cerveau. En chemin, vous maîtriserez la compétence e-paper la plus pratique : le rafraîchissement partiel.

## Résultat final

Après le flashage, l'écran joue automatiquement une animation d'environ 40 secondes en quatre images : il demande d'abord « ces deux lignes font-elles la même longueur ? », révèle ensuite la réponse, puis reste figé sur la scène du corridor (le MCU passe en veille ; l'image tient jusqu'à un reset manuel).

![](https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg)

Voici le storyboard des quatre images. Les transitions se font en rafraîchissement partiel et les segments ne bougent pas d'un poil :

| Image  | Contenu                                                       | Durée  |
| ------ | ------------------------------------------------------------- | ------ |
| 1      | Seulement les segments A et B, "Are these two lines the same length?" | 7 s |
| 2      | Des guides horizontaux en pointillés s'ajoutent, "Yes - exactly equal." | 7 s |
| 3      | Les lignes de perspective entrent en scène, "And now?"        | 10 s   |
| 4      | Guides + perspective ensemble, "Same lines - your brain was fooled." | 7 s |
| Finale | Scène d'illusion pure + grand titre "Ponzo illusion", puis veille | Maintenu |

![](https://img.lingflux.com/2026/10/68b443e3994d10b40d287b13965c7c93.jpg)

## Description des composants

### E-ink EPD0426A02 — un « tableau noir électronique » qui se souvient sans courant

L'EPD0426A02 est un module papier électronique de 4,26 pouces fabriqué par Osptek (Shenzhen). Son rôle est d'« imprimer » sur la dalle les données d'image envoyées par l'ESP32-S3. Dans ce projet, il joue l'animation d'illusion en quatre images et conserve l'image sur la durée.

En termes simples : c'est un cousin de l'écran du Kindle — un « tableau noir électronique ». On écrit, on coupe le courant, le texte reste ; pour changer le contenu, on « efface et réécrit » toute la dalle (d'où les quelques clignotements lors du rafraîchissement). Rafraîchir lentement, c'est son caractère ; ne rien consommer, c'est son super-pouvoir.

Caractéristiques clés :

| Élément                      | Paramètre                                                  |
| ---------------------------- | ---------------------------------------------------------- |
| Taille / Résolution          | 4,26 pouces, 800 × 480 (paysage), 219 DPI                  |
| Circuit de pilotage          | SSD1677 (contrôleur 960 source × 680 gate, interface SPI)  |
| Capacité d'affichage         | N/B bi-stable, 4 niveaux de gris natifs (2 bits/px)        |
| Interface                    | FPC 24 broches, SPI 4 fils (écriture seule)                |
| Courant de crête en rafraîchissement | ~50 mA                                             |
| Courant en sommeil profond   | ~3 µA (image maintenue sans consommation)                  |
| Durée de vie nominale        | 5 ans / 1 000 000 de rafraîchissements (25 ℃ / 60 %HR)     |

Pourquoi celui-ci ? 800×480, c'est de la haute définition pour un e-paper de cette taille : les lignes de perspective ressortent bien nettes ; les 3 µA de sommeil profond rendent l'usage « finir le spectacle, débrancher, continuer à tromper les gens » totalement indolore côté batterie ; et GxEPD2 le prend en charge nativement depuis la v1.5.3 (classe de pilote `GxEPD2_426_GDEQ0426T82`) — aucun pilote à écrire.

### Description des broches

La carte adaptatrice de l'EPD0426A02 sort 8 broches, chacune avec son rôle :

| Broche     | Rôle                                                         |
| ---------- | ------------------------------------------------------------ |
| VCC        | Alimentation 3,3V (⚠️ jamais de 5V)                           |
| GND        | Masse commune — parler la même langue que la carte           |
| MOSI (DIN) | Données SPI — le MCU pousse les pixels vers la dalle         |
| SCK (SCL)  | Horloge SPI — fixe la cadence de chaque bit                  |
| CS         | Chip select — à l'état bas = « ce bus est à toi »            |
| DC         | Bascule données/commande : haut=données pixel, bas=commande  |
| RST        | Reset matériel — à impulser avant l'initialisation           |
| BUSY       | Signal d'occupation : haut = rafraîchissement en cours, ne pas déranger |

Une remarque : le BUSY de cette dalle est **actif à l'état haut** (occupé = haut), alors que la broche s'appelle souvent `BUSY_N` — l'exact contraire de l'intuition. Heureusement, GxEPD2 a déjà comblé ce nid-de-poule pour nous ; il suffit de savoir qu'il existe.

## Liste du matériel (BOM)

| N°  | Composant        | Modèle / Spécification                                       | Qté | Remarques                                |
| --- | ---------------- | ------------------------------------------------------------ | --- | ---------------------------------------- |
| 1   | Carte de dev     | ESP32-S3 (ESP32-S3-DevKitC / Arduino Nano ESP32 conviennent) | 1   | Le convertisseur USB-série intégré suffit |
| 2   | Module e-paper   | EPD0426A02 (SSD1677, 800×480)                                | 1   | Avec carte adaptatrice, 8 broches        |
| 3   | Fils Dupont      | Femelle-femelle ou mâle-mâle                                 | 8   | 6 signaux + alimentation et masse        |
| 4   | Câble USB        | Type-C ou Micro (selon la carte)                             | 1   | Alimentation + flashage                  |

## Câblage

![](https://img.lingflux.com/2026/10/3ae30dc6faad42836102413a774bc830.jpg)

Le schéma de câblage fait foi ; le tableau sert de vérification :

| Broche e-paper | GPIO de l'ESP32-S3 | Remarques                        |
| -------------- | ------------------ | -------------------------------- |
| VCC            | 3V3                | ⚠️ 3,3V — le 5V grille la dalle   |
| GND            | GND                | N'importe quel GND               |
| MOSI (DIN)     | GPIO11             | Données SPI                      |
| SCK (SCL)      | GPIO12             | Horloge SPI                      |
| CS             | GPIO10             | Chip select                      |
| DC             | GPIO9              | Données/Commande                 |
| RST            | GPIO8              | Reset                            |
| BUSY           | GPIO7              | Signal d'occupation (entrée)     |

**Après le câblage, revérifiez chaque connexion une par une — cela économise 80 % du temps de débogage.** Un e-paper mal câblé ne renvoie pas d'erreur et ne fume pas ; il affiche juste silencieusement un écran blanc ou brouillé — impossible de savoir si c'est le code ou le câblage. Autre point : sur l'ESP32-S3, les broches I2C par défaut du framework Arduino sont GPIO8 (SDA) et GPIO9 (SCL), que ce sketch attribue à RST et DC. Une fois l'écran branché, tout périphérique I2C doit donc être remappé sur d'autres GPIO libres via `Wire.begin(SDA, SCL)`.

Si vous utilisez un **Arduino Nano ESP32**, les sérigraphies D4~D7 et A4/A5 ne sont pas les vrais numéros GPIO. Table de correspondance :

| Broche e-paper | GPIO réel | Sérigraphie Nano ESP32 |
| -------------- | --------- | ---------------------- |
| MOSI           | GPIO11    | A4                     |
| SCK            | GPIO12    | A5                     |
| CS             | GPIO10    | D7                     |
| DC             | GPIO9     | D6                     |
| RST            | GPIO8     | D5                     |
| BUSY           | GPIO7     | D4                     |

## Bibliothèques à installer

Ouvrez Arduino IDE → Outils → Gérer les bibliothèques, et installez :

| Bibliothèque | Auteur            | Version requise                                      | Rôle                           |
| ------------ | ----------------- | ---------------------------------------------------- | ------------------------------ |
| esp32        | Espressif Systems | 3.3.10 (vérifié avec Arduino IDE 2.3.x)              | Support de la carte ESP32-S3   |
| GxEPD2       | Jean-Marc Zingg   | **1.6.9** (inclut la classe `GxEPD2_426_GDEQ0426T82`) | Pilote e-paper                 |
| Adafruit_GFX | Adafruit          | S'installe automatiquement avec GxEPD2               | API de dessin (lignes, polices) |

Sélectionnez ensuite **ESP32S3 Dev Module** dans Outils → Carte, branchez le port série, et c'est parti pour le flashage.

## Code complet

Copiez et flashez directement (le fichier correspond à `arduino/GxEPD2_CorridorIllusion/GxEPD2_CorridorIllusion.ino` du projet) :

```cpp
/*
 * EPD0426A02 (e-paper SPI 4,26" 480x800, SSD1677) — Démo illusion du corridor (illusion de Ponzo)
 * Carte : ESP32-S3 (Arduino IDE, sélectionner "ESP32S3 Dev Module")
 * Bibliothèque de pilote : GxEPD2, avec la classe intégrée GxEPD2_426_GDEQ0426T82
 *
 * Définition des broches identique à l'exemple de référence :
 *   BUSY -> GPIO7    DC -> GPIO9     CS -> GPIO10
 *   SCK  -> GPIO12   MOSI -> GPIO11  RST -> GPIO8
 *
 * Déroulé du spectacle (un seul passage, pas de boucle) :
 *   Image 1 : deux segments épais de même longueur A & B  "Are these two lines the same length?"
 *   Image 2 : guides horizontaux en pointillés ajoutés    "Yes - exactly equal."
 *   Image 3 : segments immobiles, perspective du corridor "And now?"
 *   Image 4 : perspective + guides, la révélation         "Same lines - your brain was fooled."
 *   Enfin retour à l'image 3 (scène d'illusion), maintien
 *
 * Le canevas est en paysage 800x480 (rotation 0 = orientation native du contrôleur).
 */

#include <Arduino.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>

// ---------------- Définition des broches (conforme à board_pins.h du projet ESP-IDF) ----------------
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_SCK  12
#define EPD_MOSI 11

// Mode tampon plein écran (page_height = HEIGHT, 48000 octets)
GxEPD2_BW<GxEPD2_426_GDEQ0426T82, GxEPD2_426_GDEQ0426T82::HEIGHT> display(
  GxEPD2_426_GDEQ0426T82(/*CS=*/EPD_CS, /*DC=*/EPD_DC, /*RST=*/EPD_RST, /*BUSY=*/EPD_BUSY));

// ---------------- Géométrie de la scène (800x480 paysage) ----------------
static const int16_t W = 800;
static const int16_t H = 480;

static const int16_t VPX = 700, VPY = 240;   // point de fuite, corridor gauche
static const int16_t VP2X = 1600, VP2Y = 240; // 2e point de fuite (très loin à droite, hors écran), lignes du mur droit
static const int16_t VP0X = -900, VP0Y = 260; // 3e point de fuite (très loin à gauche, hors écran), lignes du mur gauche
static const int16_t XN  = 150;              // x du coin proche (segment A)
static const int16_t XF  = 520;              // x du coin lointain (segment B)
static const int16_t Y1  = 190;              // extrémité haute des segments
static const int16_t Y2  = 290;              // extrémité basse (les deux segments font 100px)

static const int16_t SEG_W = 6;              // épaisseur des segments
static const uint32_t FRAME_MS  = 7000;      // durée de maintien par image
static const uint32_t FRAME3_MS = 10000;      // l'image 3 reste un peu plus longtemps

// Expérience : la fiche technique exige d'écrire 0x04, 0x63 dans le registre de contrôle
// VCOM (0x2B) ; le pilote GxEPD2 ne l'envoie pas, on le patche donc à la main
// (à appeler après display.init(), car SWRESET efface ce registre)
static void epdWriteVCOMControl()
{
  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));
  digitalWrite(EPD_CS, LOW);
  digitalWrite(EPD_DC, LOW);
  SPI.transfer(0x2B);
  digitalWrite(EPD_DC, HIGH);
  SPI.transfer(0x04);
  SPI.transfer(0x63);
  digitalWrite(EPD_CS, HIGH);
  SPI.endTransaction();
}

// valeur y du point d'abscisse x sur la droite de (px, py) vers le point de fuite (vpx, vpy)
static int16_t onLineYVP(int16_t x, int16_t px, int16_t py, int16_t vpx, int16_t vpy)
{
  float t = (float)(x - px) / (float)(vpx - px);
  return (int16_t)(py + (vpy - py) * t);
}

// Corridor gauche : vers le point de fuite VP
static int16_t onLineY(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VPX, VPY);
}

// Mur droit : vers le 2e point de fuite VP2
static int16_t onLineY2(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP2X, VP2Y);
}

// Mur gauche : vers le 3e point de fuite VP0
static int16_t onLineY0(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP0X, VP0Y);
}

// ---------------- Éléments de dessin ----------------

// Les deux segments — coordonnées et épaisseur strictement identiques à chaque image
static void drawSegments()
{
  display.fillRect(XN - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // segment A
  display.fillRect(XF - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // segment B

  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(XN - 34, Y2 + 30);
  display.print("A");
  display.setCursor(XF + 16, Y2 + 30);
  display.print("B");
}

// Guides d'alignement horizontaux en pointillés, prouvant que les extrémités des deux
// segments partagent la même horizontale
static void drawGuides()
{
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    for (int16_t x = 0; x < W; x += 12)
    {
      display.drawFastHLine(x, ys[i], 6, GxEPD_BLACK);
    }
  }
}

// Lignes de perspective du corridor
static void drawPerspective()
{
  const int16_t topX = XN, topY = 40;    // haut du coin proche
  const int16_t botX = XN, botY = 440;   // bas du coin proche

  int16_t ftY = onLineY(XF, topX, topY); // y haut du coin lointain
  int16_t fbY = onLineY(XF, botX, botY); // y bas du coin lointain

  // Plafond / sol (2px)
  display.drawLine(topX, topY, XF, ftY, GxEPD_BLACK);
  display.drawLine(topX, topY + 1, XF, ftY + 1, GxEPD_BLACK);
  display.drawLine(botX, botY, XF, fbY, GxEPD_BLACK);
  display.drawLine(botX, botY - 1, XF, fbY - 1, GxEPD_BLACK);

  // Coin proche (2px) / coin lointain (1px)
  display.drawLine(XN, topY, XN, botY, GxEPD_BLACK);
  display.drawLine(XN + 1, topY, XN + 1, botY, GxEPD_BLACK);
  display.drawLine(XF, ftY, XF, fbY, GxEPD_BLACK);

  // Lignes de perspective horizontales par les extrémités des segments (jusqu'au mur lointain)
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XF, onLineY(XF, XN, ys[i]), GxEPD_BLACK);
  }

  // Subdivisions verticales (joints de briques du mur)
  static const int16_t divX[] = {260, 350, 420, 470, 500};
  for (uint8_t i = 0; i < sizeof(divX) / sizeof(divX[0]); i++)
  {
    int16_t x = divX[i];
    display.drawLine(x, onLineY(x, topX, topY), x, onLineY(x, botX, botY), GxEPD_BLACK);
  }

  // ---- Mur droit : du coin lointain (XF) au bord droit de l'écran, convergeant vers VP2 ----
  const int16_t XR = W - 1;

  // Ligne de plafond / ligne de sol (prolongées jusqu'au bord droit)
  display.drawLine(XF, ftY, XR, onLineY2(XR, XF, ftY), GxEPD_BLACK);
  display.drawLine(XF, fbY, XR, onLineY2(XR, XF, fbY), GxEPD_BLACK);

  // Lignes horizontales par les extrémités des segments, prolongées sur le mur droit
  for (int i = 0; i < 2; i++)
  {
    int16_t yAtXF = onLineY(XF, XN, ys[i]); // y où la perspective du mur gauche atteint le coin lointain
    display.drawLine(XF, yAtXF, XR, onLineY2(XR, XF, yAtXF), GxEPD_BLACK);
  }

  // Subdivisions verticales du mur droit (joints), reliant plafond et sol
  static const int16_t divXR[] = {600, 660, 710, 750, 780};
  for (uint8_t i = 0; i < sizeof(divXR) / sizeof(divXR[0]); i++)
  {
    int16_t x = divXR[i];
    display.drawLine(x, onLineY2(x, XF, ftY), x, onLineY2(x, XF, fbY), GxEPD_BLACK);
  }

  // ---- Mur gauche : du coin proche (XN) au bord gauche de l'écran, convergeant vers VP0 ----
  const int16_t XL = 0;

  // Ligne de plafond / ligne de sol (prolongées jusqu'au bord gauche)
  display.drawLine(XN, topY, XL, onLineY0(XL, XN, topY), GxEPD_BLACK);
  display.drawLine(XN, botY, XL, onLineY0(XL, XN, botY), GxEPD_BLACK);

  // Lignes horizontales par les extrémités des segments, prolongées sur le mur gauche
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XL, onLineY0(XL, XN, ys[i]), GxEPD_BLACK);
  }

  // Subdivisions verticales du mur gauche (joints)
  static const int16_t divXL[] = {30, 80, 120};
  for (uint8_t i = 0; i < sizeof(divXL) / sizeof(divXL[0]); i++)
  {
    int16_t x = divXL[i];
    display.drawLine(x, onLineY0(x, XN, topY), x, onLineY0(x, XN, botY), GxEPD_BLACK);
  }
}

// Texte d'en-tête
static void drawTitle(const char *text)
{
  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(20, 34);
  display.print(text);
}

// Grand titre de l'image finale : police plus grande, centré horizontalement en haut
// (la zone centrale haute se situe au-dessus de la ligne de plafond, sans chevaucher la perspective)
static void drawTitleBig(const char *text)
{
  display.setFont(&FreeSansBold18pt7b);
  display.setTextColor(GxEPD_BLACK);
  int16_t tbx, tby;
  uint16_t tbw, tbh;
  display.getTextBounds(text, 0, 0, &tbx, &tby, &tbw, &tbh);
  display.setCursor((W - tbw) / 2 - tbx + 200, 48 - tby); // ligne de base vers y=48
  display.print(text);
}

// Dessine la scène complète selon le numéro d'image (1..4), toujours en coordonnées
// absolues pleine fenêtre
static void drawFrame(uint8_t frame)
{
  display.fillScreen(GxEPD_WHITE);
  switch (frame)
  {
    case 1:
      drawTitle("Are these two lines the same length?");
      break;
    case 2:
      drawTitle("Yes - exactly equal.");
      drawGuides();
      break;
    case 3:
      drawTitle("And now?");
      drawPerspective();
      break;
    case 5: // image finale : scène d'illusion + grand titre, sans "And now?"
      drawTitleBig("Ponzo illusion");
      drawPerspective();
      break;
    case 4:
    default:
      drawTitle("Same lines - your brain was fooled.");
      drawPerspective();
      drawGuides();
      break;
  }
  drawSegments(); // toujours dessiné en dernier dans chaque image, coordonnées immuables
}

// Affiche une image avec rafraîchissement complet
static void showFrameFull(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.display(); // rafraîchissement plein écran
}

// Affiche une image en rafraîchissement partiel : dessine la fenêtre complète, puis
// displayWindow() ne rafraîchit que la zone modifiée (fenêtre plein écran = partiel total)
static void showFramePartial(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.displayWindow(0, 0, W, H);
}

void setup()
{
  Serial.begin(115200);
  delay(500);
  Serial.println("[EPD] EPD0426A02 Corridor Illusion (GxEPD2 / GDEQ0426T82)");

  // Mappage SPI personnalisé ESP32 : SCK, MISO(-1 = inutilisé), MOSI, SS
  SPI.begin(EPD_SCK, -1, EPD_MOSI, EPD_CS);

  display.init(115200);
  display.setRotation(0); // paysage natif 800x480
  display.setTextColor(GxEPD_BLACK);

  epdWriteVCOMControl(); // patch du registre de contrôle VCOM 0x2B

  // ---- Un seul passage : image 1 -> 2 -> 3 -> 4 ----
  // Image 1 : ouverture en rafraîchissement complet
  showFrameFull(1);
  Serial.println("[EPD] frame 1 (full refresh)");
  delay(FRAME_MS);

  // Images 2 -> 3 -> 4 : rafraîchissement partiel, segments de marbre
  showFramePartial(2);
  Serial.println("[EPD] frame 2 (partial)");
  delay(FRAME_MS);

  showFramePartial(3);
  Serial.println("[EPD] frame 3 (partial)");
  delay(FRAME3_MS);

  showFramePartial(4);
  Serial.println("[EPD] frame 4 (partial, reveal)");
  delay(FRAME_MS);

  // Pour finir, maintien de la scène d'illusion (image 5 : corridor + grand titre
  // "Ponzo illusion", sans "And now?")
  showFramePartial(5);
  Serial.println("[EPD] final frame 5 (illusion + title), hold");
  delay(1000);

  // Démo terminée, l'image reste à l'écran (pas de sommeil profond)
  Serial.println("[EPD] done, holding frame");
}

void loop()
{
  // L'image est déjà maintenue à l'écran ; ici on tourne les pouces
}
```

### Explication du code

Le sketch fait 300 et quelques lignes — ça a l'air long, mais il ne fait que six choses :

1. **Broches et objet d'affichage (le groupe de `#define` + la déclaration `GxEPD2_BW`)** : 6 macros pour les 6 fils de signal ; `GxEPD2_BW<..., HEIGHT>` est le « mode tampon plein écran » — une image entière de 48 000 octets tient en RAM d'un coup, ce que l'ESP32-S3 encaisse sans sourciller. Envie d'autres broches ? Modifiez ces 6 macros et c'est réglé.
2. **Storyboard des quatre images (`drawFrame`)** : en gros, une table switch. Notez que `drawSegments()` est hors du switch et se dessine en dernier à chaque image — les coordonnées des segments ne changent jamais ; seuls les guides et la perspective autour changent. C'est la loi d'airain qui rend l'illusion « honnête ».
3. **Les maths de la perspective (`drawPerspective` + les trois fonctions `onLineY`)** : au cœur, l'équation de la droite passant par deux points, niveau collège. Chacun des trois murs converge vers son propre « point de fuite » (une intersection hors du canevas), ce qui donne aux lignes une profondeur naturelle. Placer les points de fuite hors de l'écran (VP2 à x=1600, VP0 à x=-900) rend même la perspective plus naturelle.
4. **Rafraîchissement partiel (`displayWindow` dans `showFramePartial`)** : on redessine d'abord l'image entière en mémoire, puis on ne pousse vers la dalle que les pixels modifiés. Entre les images 2 et 4, les segments ne bougent pas d'un cheveu — seuls les guides et la perspective clignotent. C'est l'âme du rafraîchissement partiel face au complet : rapide (~0,42 s par mise à jour) et sans flash qui crève les yeux.
5. **Le patch VCOM 0x2B (`epdWriteVCOMControl`)** : la fiche technique du SSD1677 exige d'écrire `0x04, 0x63` dans le registre `0x2B` (pour supprimer les parasites lors de la bascule d'ACVCOM), mais ni GxEPD2 ni la démo du fabricant n'envoient cette commande. Les conséquences de l'omission sont sournoises : une fois la démo finie, tant que VCC reste branché, l'image se dégrade lentement à l'échelle des minutes. Il faut le renvoyer après chaque `display.init()`, car le reset logiciel (0x12) efface ce registre. Ce piège m'a coûté une journée entière — détails dans la section dépannage.

## Dépannage

Pas de panique — 90 % des problèmes viennent de ces cinq endroits. Vérifiez de haut en bas :

**1. Après le flashage, écran blanc, rien ne s'affiche**

Ne remettez pas encore votre existence en question. Vérifiez par ordre de probabilité : ① L'un des 6 fils de signal fait-il faux contact (les Dupont se desserrent sur la breadboard avec le temps) ? ② VCC est-il bien sur 3,3V ? ③ Le moniteur série imprime-t-il `[EPD] frame 1` juste après le flashage ? S'il n'y a aucune sortie série, le programme ne tourne pas et la dalle est innocente. L'e-paper ne renvoie jamais d'erreur : un écran blanc *est* son message d'erreur.

**2. Erreur de compilation : `'GxEPD2_426_GDEQ0426T82' does not name a type`**

Votre GxEPD2 est antérieur à la 1.5.3. Ouvrez le gestionnaire de bibliothèques et mettez GxEPD2 à jour vers la dernière version — cette classe de pilote n'existe que depuis la v1.5.3.

**3. La démo est finie, mais l'image se dégrade doucement en restant affichée (échelle d'une dizaine de minutes)**

C'est l'affaire du 0x2B. Vérifiez que `epdWriteVCOMControl()` est appelé après chaque `display.init()` — le reset logiciel efface ce registre ; d'abord init, ensuite le patch. Ordre inversé = comme si vous ne l'aviez jamais envoyé. Avec le patch correct, une image alimentée au repos reste stable comme un roc.

**4. Seule la moitié de l'image s'affiche, ou elle est décalée verticalement**

Neuf fois sur dix, c'est la rotation ou la résolution. Ce sketch utilise `setRotation(0)` (paysage natif 800×480) ; si un sketch précédent a laissé la rotation à 1 ou 3, remettez-la à zéro. (Côté ESP-IDF, il existe une variante à rendu paginé pour la mémoire serrée ; le mode tampon plein écran d'Arduino n'a pas ce problème.)

**5. Échec du téléversement / port série introuvable**

Maintenez le bouton BOOT de la carte enfoncé tout en branchant l'USB pour entrer en mode téléchargement. Si ça ne marche toujours pas, changez de câble — beaucoup de « câbles de charge » n'ont que l'alimentation, sans lignes de données. L'accident le plus fréquent de ma carrière de flasheur.

## FAQ

**Q : Un ESP32 classique (pas S3) ou un ESP32-C3 peut-il exécuter ce sketch ?**
R : Oui. Le code n'utilise rien de spécifique au S3 ; n'importe quel ESP32 pris en charge par le framework Arduino fonctionne — il suffit de déplacer les fils vers des GPIO libres de votre carte. Le tampon plein écran réclame environ 48 Ko de RAM, ce que même l'ESP32 classique (520 Ko de SRAM) peut se permettre.

**Q : Puis-je utiliser d'autres broches GPIO ? Comment ?**
R : Bien sûr. Modifiez les 6 `#define` en tête du sketch (EPD_CS / EPD_DC / EPD_RST / EPD_BUSY / EPD_SCK / EPD_MOSI) et recâblez en conséquence. Sur l'ESP32-S3, évitez les broches de strapping GPIO0/3/45/46, GPIO19/20 (USB) et les broches occupées par Flash/PSRAM — voyez le schéma de votre carte.

**Q : L'e-paper met des secondes à rafraîchir et clignote plusieurs fois, c'est normal ?**
R : Le rafraîchissement complet lent, c'est de la physique normale : chaque rafraîchissement « represse » les 480 lignes de pixels. Sur cette dalle, un rafraîchissement complet mesure environ 2 secondes (environ 1,5 s avec les formes d'onde rapides). Les clignotements sont la procédure standard d'effacement des rémanences, pas une panne. Trop lent ? Utilisez le rafraîchissement partiel (`displayWindow`) de ce sketch — mesuré à environ 0,42 s par mise à jour, presque sans clignotement.

**Q : La dalle supporte-t-elle le 5V ?**
R : Non. Le VCC de l'EPD0426A02 doit être de 3,3V, point final. Le 5V ne la fait pas fumer instantanément, mais endommage le circuit interne de pilotage haute tension — le symptôme apparaît comme un brouillage localisé après quelques utilisations, et la garantie ne couvre pas. Plutôt un écran éteint que du 5V.

**Q : L'écran se dégrade lentement s'il reste alimenté après la démo — comment régler ça définitivement ?**
R : Écrivez les deux octets 0x04, 0x63 dans le registre 0x2B du SSD1677 (la fiche technique dit littéralement « reduce glitch when ACVCOM toggle »), et renvoyez-les après chaque reset logiciel. C'est exactement ce que fait `epdWriteVCOMControl()`. Une alternative plus physique consiste à couper VCC avec un P-MOSFET, mais quand deux octets logiciels suffisent, inutile de chauffer le fer à souder.

**Q : Pourquoi dites-vous 4 niveaux de gris ? La page produit annonce 16 niveaux !**
R : Les pixels du SSD1677 n'ont physiquement que deux états stables (noir/blanc) et le chemin de données est de 2 bits/px — nativement, ce sont donc 4 niveaux de gris (noir/gris foncé/gris clair/blanc). Les niveaux de gris sont obtenus par des tables de formes d'onde (LUT) qui appliquent des impulsions de nombre et de polarité différents à chaque pixel dans une même image ; les 16 niveaux perçus sont simulés sur ces 4 par un tramage ordonné Bayer 4×4. Ce sketch d'illusion n'utilise que du noir et blanc pur, donc il n'est pas concerné — mais gardez ce plafond en tête quand vous voudrez afficher des photos.

**Q : Le rafraîchissement partiel laisse des rémanences à la longue — que faire ?**
R : L'accumulation de rémanences est inhérente au rafraîchissement partiel. La stratégie pratique : « après une série de partiels, faire un rafraîchissement complet » — `display.clearScreen()`, ou tout simplement un passage tout noir puis tout blanc pour laver les fantômes. Ce sketch ne rafraîchit que 4 fois, la rémanence est négligeable.

**Q : Je veux modifier la longueur/position des segments, ou passer les textes en français — où est-ce que j'édite ?**
R : Tous les paramètres des segments sont dans le groupe de constantes « Géométrie de la scène » : `XN`/`XF` sont les positions horizontales, `Y1`/`Y2` les extrémités haute et basse (longueur = Y2 - Y1), `SEG_W` l'épaisseur. Les textes sont dans le switch de `drawFrame`. Après modification, gardez la cohérence des coordonnées entre les deux segments — sinon l'illusion cesse d'être « honnête ».

## Pour aller plus loin

- Changer d'illusion : remplacez Ponzo par l'illusion des flèches de Müller-Lyer ou celle des cercles d'Ebbinghaus — il suffit de réécrire les fonctions géométriques de `drawFrame`
- Avance manuelle des images : branchez un bouton tactile ou un potentiomètre pour que le public crie « révélation ! » et que l'image 3 se déclenche — cérémonie maximale
- Chronomètre à rafraîchissement partiel : réutilisez l'astuce `displayWindow` de ce sketch pour construire un chrono électronique qui avance d'un cran toutes les 0,42 s, et savourez la dissonance cognitive de l'e-paper « en mouvement »
- Photos en niveaux de gris : ajoutez GxEPD2_4G et « imprimez » une photo sur l'e-paper avec 4 niveaux de gris + tramage Bayer — ambiance fond d'écran de Kindle
- Objet de bureau sur batterie : 18650 + sommeil profond, réveil de quelques secondes par jour pour mettre à jour l'image — une pile tient des mois, et votre corridor d'illusion peut tromper les gens 24h/24 et 7j/7

## Références

- Page produit officielle du circuit SSD1677 (Solomon Systech) : https://www.solomon-systech.com/product/ssd1677/
- Bibliothèque de pilotes GxEPD2 sur GitHub (liste complète des dalles prises en charge) : https://github.com/ZinggJM/GxEPD2
- Bibliothèque graphique Adafruit_GFX sur GitHub : https://github.com/adafruit/Adafruit-GFX-Library
- Page produit officielle du SoC ESP32-S3 (Espressif) : https://www.espressif.com/en/products/socs/esp32-s3
- Bibliothèque sœur GxEPD2_4G (pour les photos en gris à 4 niveaux + tramage) : https://github.com/ZinggJM/GxEPD2_4G
