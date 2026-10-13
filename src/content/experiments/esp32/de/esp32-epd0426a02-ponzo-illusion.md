---
title: "ESP32-S3 steuert ein 4,26\" SSD1677 EPD0426A02 E-Paper-Display und spielt die Ponzo-Korridor-Illusion｜Komplettes SPI + GxEPD2 Tutorial"
boardId: esp32s3
moduleId: display/epd-4inch26-epd0426a02
category: esp32
date: 2026-10-13
intro: "Steuere das E-Paper-Display EPD0426A02 (800×480, SSD1677-Controller) mit einem ESP32-S3 über SPI an und spiele die Vier-Frames-Animation der Ponzo-Korridor-Illusion per GxEPD2-Partial-Refresh ab. Mit kompletter Verkabelung, Arduino-Code und Fehlersuche bei weißem oder verstümmeltem Bild."
image: "https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg"
---

> **Kurzfassung**: 8 Kabel anschließen, 2 Bibliotheken installieren, einen Sketch flashen — und dein ESP32-S3 spielt die Ponzo-Korridor-Illusion auf einem 4,26-Zoll-E-Paper ab. Nebenbei lernst du Partial Refresh, die nützlichste E-Paper-Fähigkeit überhaupt.

```
Schwierigkeit: ⭐⭐☆☆☆ (anfängertauglich, solange du VCC nicht an 5V klemmst)
Zeitaufwand: 40 Minuten (10 Verkabeln + 15 Umgebung einrichten + 15 Flashen & Staunen)
Getestet mit: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + GxEPD2 1.6.9
```

> **TL;DR (Schnellstart):**
>
> 1. Verkabelung: MOSI → GPIO11, SCK → GPIO12, CS → GPIO10, DC → GPIO9, RST → GPIO8, BUSY → GPIO7
> 2. VCC an 3,3V (5V killt das Panel — frag nicht, woher ich das weiß)
> 3. Zwei Bibliotheken installieren: GxEPD2 (≥ 1.5.3) + Adafruit_GFX (kommt automatisch mit GxEPD2 mit)
> 4. Board "ESP32S3 Dev Module" wählen, flashen, und abwarten, bis dein Gehirn hereingelegt wird

---

## Einleitung: Ein Korridor, der die Menschheit seit über 100 Jahren an der Nase herumführt

Du kennst dieses Bild garantiert: zwei absolut identische Liniensegmente — doch sobald die Perspektivlinien eines Korridors darum gezeichnet werden, wirkt das „weiter entfernte" länger. Du weißt, dass sie gleich lang sind, aber deine Augen weigern sich standhaft, das zuzugeben. Das ist die klassische Ponzo-Illusion: Dein Gehirn schaltet automatisch in den „Perspektiven-Interpretationsmodus" und übersetzt „weit weg" in „größer".

Ich hatte schon lange vor, diese Illusion mit eigenen Händen zu „materialisieren". Zufällig lagen ein 4,26-Zoll-E-Paper EPD0426A02 (800×480, SSD1677-Controller) und ein ESP32-S3 auf meinem Tisch. Die Persönlichkeit von E-Paper — langsame Wechsel, und das Bild bleibt sogar ohne Strom erhalten — passt perfekt zu einer Illusions-Demo: Das Publikum hat reichlich Zeit, an der Realität zu zweifeln, und danach ziehst du einfach den Stecker und stellst es auf den Tisch, wo es den nächsten Gast hereingelegt.

Dieser Artikel führt dich von null an: 8 Kabel anschließen, 2 Bibliotheken installieren, einen Sketch flashen — und dieses E-Paper erteilt deinem Gehirn eine Lektion. Nebenbei schaltest du die praktischste E-Paper-Fähigkeit frei: Partial Refresh.

## Endergebnis

Nach dem Flashen spielt das Display automatisch eine ca. 40-sekündige Animation mit vier Frames ab: Erst fragt es „Sind diese beiden Linien gleich lang?", dann löst es auf und bleibt schließlich auf der Korridor-Illusions-Szene stehen (der MCU geht in Leerlauf; das Bild bleibt bis zum manuellen Reset erhalten).

![](https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg)

Hier das Storyboard der vier Frames. Die Übergänge laufen per Partial Refresh, die Liniensegmente selbst bleiben stocksteif:

| Frame  | Inhalt                                                       | Dauer   |
| ------ | ------------------------------------------------------------ | ------- |
| 1      | Nur die Segmente A und B, "Are these two lines the same length?" | 7 s |
| 2      | Horizontale gestrichelte Hilfslinien dazu, "Yes - exactly equal." | 7 s  |
| 3      | Die Perspektivlinien betreten die Bühne, "And now?"          | 10 s    |
| 4      | Hilfslinien + Perspektive gemeinsam, "Same lines - your brain was fooled." | 7 s |
| Finale | Reine Illusionsszene + großer Titel "Ponzo illusion", dann Leerlauf | Bleibt stehen |

![](https://img.lingflux.com/2026/10/68b443e3994d10b40d287b13965c7c93.jpg)

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/OTnjpqa3W_M?si=bx7XbbxggXATzQhh" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


## Bauteilbeschreibung

### EPD0426A02 E-Paper — eine „elektronische Tafel", die ohne Strom nichts vergisst

Das EPD0426A02 ist ein 4,26-Zoll-E-Paper-Modul von Osptek (Shenzhen). Seine Aufgabe ist es, die vom ESP32-S3 gesendeten Bilddaten auf den Bildschirm zu „drucken". In diesem Projekt spielt es die Vier-Frames-Illusionsanimation ab und hält das Bild langfristig.

Salopp gesagt: Es ist ein Cousin des Kindle-Bildschirms — eine „elektronische Tafel". Schreiben, Strom weg, Schrift bleibt; für neuen Inhalt wird die ganze Fläche „gelöscht und neu beschrieben" (deshalb flackert E-Paper beim Refresh ein paar Mal). Langsames Aktualisieren ist sein Charakter; kein Stromverbrauch ist seine Superkraft.

Kennwerte:

| Merkmal                    | Wert                                                        |
| -------------------------- | ----------------------------------------------------------- |
| Größe / Auflösung          | 4,26 Zoll, 800 × 480 (Querformat), 219 DPI                  |
| Treiber-IC                 | SSD1677 (960-Source-×-680-Gate-Controller, SPI-Schnittstelle) |
| Anzeigefähigkeit           | S/W-bistabil, native 4 Graustufen (2 Bit/px)                |
| Schnittstelle              | 24-poliges FPC, 4-Draht-SPI (nur Schreiben)                 |
| Spitzenstrom beim Refresh  | ca. 50 mA                                                   |
| Deep-Sleep-Strom           | ca. 3 µA (Bild wird ohne Verbrauch gehalten)                |
| Ausgelegte Lebensdauer     | 5 Jahre / 1.000.000 Refreshes (25 ℃ / 60 %rH)               |

Warum dieses Panel? 800×480 ist für E-Paper dieser Größe hochauflösend — Perspektivlinien werden gestochen scharf; 3 µA Deep Sleep machen „Vorstellung vorbei, Stecker ziehen, weiter Leute hereinlegen" völlig stromlos möglich; und GxEPD2 unterstützt es seit v1.5.3 nativ (Treiberklasse `GxEPD2_426_GDEQ0426T82`) — kein eigener Treiber nötig.

### Pin-Beschreibung

Die Adapterplatine des EPD0426A02 führt 8 Pins heraus, jeder mit eigener Aufgabe:

| Pin        | Aufgabe                                                    |
| ---------- | ---------------------------------------------------------- |
| VCC        | 3,3V-Versorgung (⚠️ niemals an 5V)                          |
| GND        | Gemeinsame Masse — dieselbe Sprache wie das Board sprechen |
| MOSI (DIN) | SPI-Daten — der MCU schiebt Pixel ins Panel                |
| SCK (SCL)  | SPI-Takt — legt fest, wie schnell jedes Bit geht           |
| CS         | Chip Select — auf LOW = „dieser Bus gehört jetzt dir"      |
| DC         | Daten/Befehl-Umschaltung: HIGH=Pixeldaten, LOW=Befehl      |
| RST        | Hardware-Reset — vor der Initialisierung einmal ziehen     |
| BUSY       | Busy-Signal: HIGH = Refresh läuft, bitte nicht stören      |

Ein Hinweis: Das BUSY-Signal dieses Panels ist **active-high** (busy = HIGH), obwohl der Pin oft `BUSY_N` heißt — das exakte Gegenteil der Intuition. Zum Glück hat GxEPD2 dieses Schlagloch schon für uns zugeschüttet; man muss nur wissen, dass es existiert.

## Stückliste (BOM)

| Nr. | Bauteil          | Modell / Spezifikation                                       | Anzahl | Hinweise                               |
| --- | ---------------- | ------------------------------------------------------------ | ------ | -------------------------------------- |
| 1   | Entwicklungsboard| ESP32-S3 (ESP32-S3-DevKitC / Arduino Nano ESP32 gehen beide) | 1      | USB-Seriell-Wandler an Bord genügt     |
| 2   | E-Paper-Modul    | EPD0426A02 (SSD1677, 800×480)                                | 1      | Mit Adapterplatine, 8 Stiftleisten     |
| 3   | Dupont-Kabel     | Buchse-Buchse oder Stecker-Stecker                           | 8      | 6 Signale + Versorgung/Masse           |
| 4   | USB-Kabel        | Type-C oder Micro (je nach Board)                            | 1      | Stromversorgung + Flashen              |

## Verkabelung

![](https://img.lingflux.com/2026/10/3ae30dc6faad42836102413a774bc830.jpg)

Der Schaltplan hat Vorrang, die Tabelle dient zum Nachprüfen:

| E-Paper-Pin | ESP32-S3 GPIO | Hinweise                           |
| ----------- | ------------- | ---------------------------------- |
| VCC         | 3V3           | ⚠️ 3,3V — 5V killt das Panel        |
| GND         | GND           | Beliebiges GND                     |
| MOSI (DIN)  | GPIO11        | SPI-Daten                          |
| SCK (SCL)   | GPIO12        | SPI-Takt                           |
| CS          | GPIO10        | Chip Select                        |
| DC          | GPIO9         | Daten/Befehl                       |
| RST         | GPIO8         | Reset                              |
| BUSY        | GPIO7         | Busy-Signal (Eingang)              |

**Nach dem Verkabeln jede Verbindung einzeln prüfen — das spart 80 % der Debug-Zeit.** Ein falsch verkabeltes E-Paper wirft keine Fehler und qualmt nicht; es zeigt einfach schweigend ein weißes oder verstümmeltes Bild — du kannst nicht unterscheiden, ob der Code oder die Verkabelung schuld ist. Und noch etwas: Beim ESP32-S3 sind die Standard-I2C-Pins des Arduino-Frameworks GPIO8 (SDA) und GPIO9 (SCL), die dieser Sketch an RST und DC vergibt. Mit angeschlossenem Display müssen I2C-Geräte also per `Wire.begin(SDA, SCL)` auf andere freie GPIOs umgelegt werden.

Bei einem **Arduino Nano ESP32** sind die Aufdrucke D4~D7 und A4/A5 keine echten GPIO-Nummern. Zuordnungstabelle:

| E-Paper-Pin | Echter GPIO | Nano-ESP32-Aufdruck |
| ----------- | ----------- | ------------------- |
| MOSI        | GPIO11      | A4                  |
| SCK         | GPIO12      | A5                  |
| CS          | GPIO10      | D7                  |
| DC          | GPIO9       | D6                  |
| RST         | GPIO8       | D5                  |
| BUSY        | GPIO7       | D4                  |

## Zu installierende Bibliotheken

Arduino IDE öffnen → Werkzeuge → Bibliotheken verwalten, und installieren:

| Bibliothek   | Autor             | Versionsanforderung                                  | Zweck                          |
| ------------ | ----------------- | ---------------------------------------------------- | ------------------------------ |
| esp32        | Espressif Systems | 3.3.10 (mit Arduino IDE 2.3.x verifiziert)           | ESP32-S3-Board-Support         |
| GxEPD2       | Jean-Marc Zingg   | **1.6.9** (enthält die Treiberklasse `GxEPD2_426_GDEQ0426T82`) | E-Paper-Treiber |
| Adafruit_GFX | Adafruit          | Wird mit GxEPD2 automatisch installiert              | Grafik-API (Linien, Fonts)     |

Danach **ESP32S3 Dev Module** unter Werkzeuge → Board wählen, seriellen Port anschließen, fertig zum Flashen.

## Kompletter Code

Direkt kopieren und flashen (die Datei entspricht `arduino/GxEPD2_CorridorIllusion/GxEPD2_CorridorIllusion.ino` im Projekt):

```cpp
/*
 * EPD0426A02 (4,26" 480x800 SPI E-Paper, SSD1677) — Korridor-Illusion (Ponzo-Illusion) Demo
 * Board: ESP32-S3 (Arduino IDE, "ESP32S3 Dev Module" wählen)
 * Treiberbibliothek: GxEPD2, mit der eingebauten Treiberklasse GxEPD2_426_GDEQ0426T82
 *
 * Pinbelegung identisch zum Referenzbeispiel:
 *   BUSY -> GPIO7    DC -> GPIO9     CS -> GPIO10
 *   SCK  -> GPIO12   MOSI -> GPIO11  RST -> GPIO8
 *
 * Ablauf der Vorstellung (ein Durchlauf, keine Schleife):
 *   Frame 1: zwei gleich lange dicke Segmente A & B     "Are these two lines the same length?"
 *   Frame 2: horizontale gestrichelte Hilfslinien       "Yes - exactly equal."
 *   Frame 3: Segmente bleiben, Korridor-Perspektive     "And now?"
 *   Frame 4: Perspektive + Hilfslinien, die Auflösung   "Same lines - your brain was fooled."
 *   Zuletzt zurück zu Frame 3 (Illusionsszene), stehen bleiben
 *
 * Die Zeichenfläche ist 800x480 Querformat (rotation 0 = native Controller-Ausrichtung).
 */

#include <Arduino.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>

// ---------------- Pindefinitionen (stimmen mit board_pins.h des ESP-IDF-Projekts überein) ----------------
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_SCK  12
#define EPD_MOSI 11

// Vollbild-Puffermodus (page_height = HEIGHT, 48000 Bytes)
GxEPD2_BW<GxEPD2_426_GDEQ0426T82, GxEPD2_426_GDEQ0426T82::HEIGHT> display(
  GxEPD2_426_GDEQ0426T82(/*CS=*/EPD_CS, /*DC=*/EPD_DC, /*RST=*/EPD_RST, /*BUSY=*/EPD_BUSY));

// ---------------- Szenengeometrie (800x480 Querformat) ----------------
static const int16_t W = 800;
static const int16_t H = 480;

static const int16_t VPX = 700, VPY = 240;   // Fluchtpunkt, linker Korridor
static const int16_t VP2X = 1600, VP2Y = 240; // 2. Fluchtpunkt (weit rechts außerhalb), Linien der rechten Wand
static const int16_t VP0X = -900, VP0Y = 260; // 3. Fluchtpunkt (weit links außerhalb), Linien der linken Wand
static const int16_t XN  = 150;              // x der nahen Ecke (Segment A)
static const int16_t XF  = 520;              // x der fernen Ecke (Segment B)
static const int16_t Y1  = 190;              // oberer Endpunkt der Segmente
static const int16_t Y2  = 290;              // unterer Endpunkt (beide Segmente sind 100px lang)

static const int16_t SEG_W = 6;              // Segmentdicke
static const uint32_t FRAME_MS  = 7000;      // Haltezeit pro Frame
static const uint32_t FRAME3_MS = 10000;      // Frame 3 bleibt etwas länger

// Experiment: Das Datenblatt verlangt, das VCOM-Kontrollregister (0x2B) fest mit 0x04, 0x63
// zu beschreiben; der GxEPD2-Treiber sendet das nicht, also patchen wir es manuell nach
// (muss nach display.init() aufgerufen werden, weil SWRESET dieses Register löscht)
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

// y-Wert des Punkts mit x auf der Geraden von (px, py) zum Fluchtpunkt (vpx, vpy)
static int16_t onLineYVP(int16_t x, int16_t px, int16_t py, int16_t vpx, int16_t vpy)
{
  float t = (float)(x - px) / (float)(vpx - px);
  return (int16_t)(py + (vpy - py) * t);
}

// Linker Korridor: zum Fluchtpunkt VP
static int16_t onLineY(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VPX, VPY);
}

// Rechte Wand: zum 2. Fluchtpunkt VP2
static int16_t onLineY2(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP2X, VP2Y);
}

// Linke Wand: zum 3. Fluchtpunkt VP0
static int16_t onLineY0(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP0X, VP0Y);
}

// ---------------- Zeichenelemente ----------------

// Die beiden Segmente — in jedem Frame exakt gleiche Koordinaten und Dicke
static void drawSegments()
{
  display.fillRect(XN - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // Segment A
  display.fillRect(XF - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // Segment B

  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(XN - 34, Y2 + 30);
  display.print("A");
  display.setCursor(XF + 16, Y2 + 30);
  display.print("B");
}

// Horizontale gestrichelte Ausrichtungshilfen, die beweisen, dass beide Segment-Endpunkte
// auf derselben Horizontale liegen
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

// Korridor-Perspektivlinien
static void drawPerspective()
{
  const int16_t topX = XN, topY = 40;    // nahe Ecke oben
  const int16_t botX = XN, botY = 440;   // nahe Ecke unten

  int16_t ftY = onLineY(XF, topX, topY); // ferne Ecke oben y
  int16_t fbY = onLineY(XF, botX, botY); // ferne Ecke unten y

  // Decke / Boden (2px)
  display.drawLine(topX, topY, XF, ftY, GxEPD_BLACK);
  display.drawLine(topX, topY + 1, XF, ftY + 1, GxEPD_BLACK);
  display.drawLine(botX, botY, XF, fbY, GxEPD_BLACK);
  display.drawLine(botX, botY - 1, XF, fbY - 1, GxEPD_BLACK);

  // Nahe Ecke (2px) / ferne Ecke (1px)
  display.drawLine(XN, topY, XN, botY, GxEPD_BLACK);
  display.drawLine(XN + 1, topY, XN + 1, botY, GxEPD_BLACK);
  display.drawLine(XF, ftY, XF, fbY, GxEPD_BLACK);

  // Horizontale Perspektivlinien durch die Segment-Endpunkte (bis zur fernen Wand)
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XF, onLineY(XF, XN, ys[i]), GxEPD_BLACK);
  }

  // Vertikale Unterteilungen (Mauerfugen)
  static const int16_t divX[] = {260, 350, 420, 470, 500};
  for (uint8_t i = 0; i < sizeof(divX) / sizeof(divX[0]); i++)
  {
    int16_t x = divX[i];
    display.drawLine(x, onLineY(x, topX, topY), x, onLineY(x, botX, botY), GxEPD_BLACK);
  }

  // ---- Rechte Wand: von der fernen Ecke (XF) bis zum rechten Bildschirmrand, konvergiert auf VP2 ----
  const int16_t XR = W - 1;

  // Deckenlinie / Bodenlinie (bis zum rechten Rand fortgesetzt)
  display.drawLine(XF, ftY, XR, onLineY2(XR, XF, ftY), GxEPD_BLACK);
  display.drawLine(XF, fbY, XR, onLineY2(XR, XF, fbY), GxEPD_BLACK);

  // Horizontale Linien durch die Segment-Endpunkte, auf der rechten Wand fortgesetzt
  for (int i = 0; i < 2; i++)
  {
    int16_t yAtXF = onLineY(XF, XN, ys[i]); // y, an dem die Perspektivlinie der linken Wand die ferne Ecke erreicht
    display.drawLine(XF, yAtXF, XR, onLineY2(XR, XF, yAtXF), GxEPD_BLACK);
  }

  // Vertikale Unterteilungen der rechten Wand (Fugen), verbinden Decken- und Bodenlinie
  static const int16_t divXR[] = {600, 660, 710, 750, 780};
  for (uint8_t i = 0; i < sizeof(divXR) / sizeof(divXR[0]); i++)
  {
    int16_t x = divXR[i];
    display.drawLine(x, onLineY2(x, XF, ftY), x, onLineY2(x, XF, fbY), GxEPD_BLACK);
  }

  // ---- Linke Wand: von der nahen Ecke (XN) bis zum linken Bildschirmrand, konvergiert auf VP0 ----
  const int16_t XL = 0;

  // Deckenlinie / Bodenlinie (bis zum linken Rand fortgesetzt)
  display.drawLine(XN, topY, XL, onLineY0(XL, XN, topY), GxEPD_BLACK);
  display.drawLine(XN, botY, XL, onLineY0(XL, XN, botY), GxEPD_BLACK);

  // Horizontale Linien durch die Segment-Endpunkte, auf der linken Wand fortgesetzt
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XL, onLineY0(XL, XN, ys[i]), GxEPD_BLACK);
  }

  // Vertikale Unterteilungen der linken Wand (Fugen)
  static const int16_t divXL[] = {30, 80, 120};
  for (uint8_t i = 0; i < sizeof(divXL) / sizeof(divXL[0]); i++)
  {
    int16_t x = divXL[i];
    display.drawLine(x, onLineY0(x, XN, topY), x, onLineY0(x, XN, botY), GxEPD_BLACK);
  }
}

// Kopftext
static void drawTitle(const char *text)
{
  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(20, 34);
  display.print(text);
}

// Großer Titel für den letzten Halte-Frame: größere Schrift, oben horizontal zentriert
// (die obere Mitte liegt über der Deckenlinie und überlappt die Perspektive nie)
static void drawTitleBig(const char *text)
{
  display.setFont(&FreeSansBold18pt7b);
  display.setTextColor(GxEPD_BLACK);
  int16_t tbx, tby;
  uint16_t tbw, tbh;
  display.getTextBounds(text, 0, 0, &tbx, &tby, &tbw, &tbh);
  display.setCursor((W - tbw) / 2 - tbx + 200, 48 - tby); // Grundlinie bei ca. y=48
  display.print(text);
}

// Zeichnet die ganze Szene nach Framenummer (1..4), immer in absoluten Vollfenster-Koordinaten
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
    case 5: // letzter Halte-Frame: Illusionsszene + großer Titel, kein "And now?"
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
  drawSegments(); // in jedem Frame zuletzt gezeichnet, Koordinaten für immer unverändert
}

// Frame mit Voll-Refresh anzeigen
static void showFrameFull(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.display(); // Vollbild-Refresh
}

// Frame mit Partial-Refresh anzeigen: Vollfenster zeichnen, mit displayWindow() nur den
// geänderten Bereich aktualisieren (Vollbild-Fenster = partieller Refresh über alles)
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

  // ESP32 benutzerdefiniertes SPI-Pin-Mapping: SCK, MISO(-1 = ungenutzt), MOSI, SS
  SPI.begin(EPD_SCK, -1, EPD_MOSI, EPD_CS);

  display.init(115200);
  display.setRotation(0); // natives Querformat 800x480
  display.setTextColor(GxEPD_BLACK);

  epdWriteVCOMControl(); // 0x2B-VCOM-Kontrollregister nachpatchen

  // ---- Ein Durchlauf: Frame 1 -> 2 -> 3 -> 4 ----
  // Frame 1: Eröffnung mit Voll-Refresh
  showFrameFull(1);
  Serial.println("[EPD] frame 1 (full refresh)");
  delay(FRAME_MS);

  // Frames 2 -> 3 -> 4: Partial Refresh, Segmente reglos
  showFramePartial(2);
  Serial.println("[EPD] frame 2 (partial)");
  delay(FRAME_MS);

  showFramePartial(3);
  Serial.println("[EPD] frame 3 (partial)");
  delay(FRAME3_MS);

  showFramePartial(4);
  Serial.println("[EPD] frame 4 (partial, reveal)");
  delay(FRAME_MS);

  // Zum Schluss die Illusionsszene halten (Frame 5: Korridor + großer Titel
  // "Ponzo illusion", kein "And now?")
  showFramePartial(5);
  Serial.println("[EPD] final frame 5 (illusion + title), hold");
  delay(1000);

  // Demo vorbei, Bild bleibt auf dem Schirm (kein Deep Sleep)
  Serial.println("[EPD] done, holding frame");
}

void loop()
{
  // Bild wird bereits gehalten; hier einfach vor sich hin dümpeln
}
```

### Code-Erklärung

Der Sketch hat gut 300 Zeilen — sieht lang aus, tut aber nur sechs Dinge:

1. **Pins und Display-Objekt (die `#define`-Gruppe + die `GxEPD2_BW`-Deklaration)**: 6 Makros für die 6 Signalkabel; `GxEPD2_BW<..., HEIGHT>` ist der „Vollbild-Puffermodus" — ein kompletter 48.000-Byte-Frame liegt auf einmal im RAM, was der ESP32-S3 locker wegsteckt. Andere Pins gewünscht? Einfach die 6 Makros ändern.
2. **Vier-Frames-Storyboard (`drawFrame`)**: im Kern eine switch-Tabelle. Beachte: `drawSegments()` steht außerhalb des switch und wird in jedem Frame zuletzt gezeichnet — die Segment-Koordinaten ändern sich nie, nur die Hilfslinien und die Perspektive drumherum. Das ist das eiserne Gesetz, damit die Illusion „ehrlich" bleibt.
3. **Perspektiv-Mathe (`drawPerspective` + die drei `onLineY`-Funktionen)**: Im Kern eine Zweipunkte-Geradengleichung aus der Mittelstufe. Jede der drei Wände läuft auf ihren eigenen „Fluchtpunkt" zu (einen Schnittpunkt außerhalb der Zeichenfläche) — so entsteht natürliche Tiefe. Fluchtpunkte außerhalb des Bildschirms (VP2 bei x=1600, VP0 bei x=-900) lassen die Perspektive sogar noch natürlicher wirken.
4. **Partial Refresh (`displayWindow` in `showFramePartial`)**: Erst wird der ganze Frame im Speicher neu gezeichnet, dann nur die geänderten Pixel ans Panel geschoben. Zwischen Frame 2 und 4 bewegen sich die Segmente kein Haar — nur Hilfslinien und Perspektive flackern. Das ist die Seele des Partial Refresh gegenüber dem Voll-Refresh: schnell (~0,42 s pro Update) und ohne augenblendendes Flackern.
5. **Der 0x2B-VCOM-Patch (`epdWriteVCOMControl`)**: Das SSD1677-Datenblatt verlangt das Schreiben von `0x04, 0x63` in Register `0x2B` (zur Unterdrückung von Störungen beim ACVCOM-Umschalten), doch weder GxEPD2 noch die Hersteller-Demo senden diesen Befehl. Die Folge des Auslassens ist hinterhältig: Nach Ende der Demo verschlechtert sich das Bild bei angeschlossener VCC langsam im Minutenbereich. Man muss es nach jedem `display.init()` erneut senden, denn der Software-Reset (0x12) löscht das Register. Diese Falle hat mich einen ganzen Tag gekostet — Details im Abschnitt Fehlersuche.

## Fehlersuche

Keine Panik — 90 % der Probleme stecken in diesen fünf Stellen. Von oben nach unten abarbeiten:

**1. Nach dem Flashen weißes Bild, nichts zu sehen**

Noch nicht am Leben zweifeln. In der Reihenfolge der Wahrscheinlichkeit prüfen: ① Hat eines der 6 Signalkabel Wackelkontakt (Dupont-Kabel lockern sich auf Breadboards mit der Zeit)? ② Liegt VCC wirklich an 3,3V? ③ Druckt der serielle Monitor direkt nach dem Flashen `[EPD] frame 1`? Wenn seriell gar nichts kommt, läuft das Programm nicht und das Panel ist unschuldig. E-Paper wirft keine Fehler — ein weißer Bildschirm *ist* seine Fehlermeldung.

**2. Compilerfehler: `'GxEPD2_426_GDEQ0426T82' does not name a type`**

Dein GxEPD2 ist älter als 1.5.3. Öffne den Bibliotheksverwalter und aktualisiere GxEPD2 auf die neueste Version — diese Treiberklasse existiert erst seit v1.5.3.

**3. Die Demo ist durch, aber das Bild verschlechtert sich langsam beim Dastehen (im Zehn-Minuten-Bereich)**

Das ist die 0x2B-Geschichte. Stelle sicher, dass `epdWriteVCOMControl()` nach jedem `display.init()` aufgerufen wird — der Software-Reset löscht das Register; erst init, dann patchen. Falsche Reihenfolge = genauso gut wie nie gesendet. Mit korrektem Patch bleibt ein bestromtes Standbild felsenfest.

**4. Nur die halbe Anzeige sichtbar oder vertikal versetzt**

Zu neun von zehn Fällen Rotation oder Auflösung. Dieser Sketch nutzt `setRotation(0)` (natives Querformat 800×480); falls ein früherer Sketch die Rotation auf 1 oder 3 gestellt hat, zurückstellen. (Auf der ESP-IDF-Seite gibt es eine seitenweise rendernde Variante für knappen Speicher; der Arduino-Vollbild-Puffermodus hat dieses Problem nicht.)

**5. Upload schlägt fehl / serieller Port nicht gefunden**

Halte die BOOT-Taste am Board gedrückt, während du USB einsteckst, um in den Download-Modus zu kommen. Wenn es immer noch nicht klappt, wechsle das Kabel — viele „Ladekabel" führen nur Strom, keine Datenleitungen. Der häufigste Unfall meiner Flash-Karriere.

## FAQ

**F: Läuft der Sketch auch auf einem normalen ESP32 (kein S3) oder ESP32-C3?**
A: Ja. Der Code nutzt nichts S3-Spezifisches; jeder ESP32 mit Arduino-Framework-Support läuft — einfach die Drähte auf freie GPIOs deines Boards umziehen. Der Vollbild-Puffer braucht ca. 48 KB RAM, was selbst der klassische ESP32 (520 KB SRAM) locker hat.

**F: Kann ich andere GPIO-Pins verwenden? Wie?**
A: Klar. Ändere die 6 `#define` am Anfang des Sketches (EPD_CS / EPD_DC / EPD_RST / EPD_BUSY / EPD_SCK / EPD_MOSI) und verkabele entsprechend neu. Beim ESP32-S3 meide die Strapping-Pins GPIO0/3/45/46, GPIO19/20 (USB) und Pins, die von Flash/PSRAM belegt sind — Details im Schaltplan deines Boards.

**F: E-Paper braucht Sekunden pro Refresh und flackert ein paar Mal — normal?**
A: Langsamer Voll-Refresh ist normale Physik: Jeder Refresh „presst" alle 480 Pixelzeilen neu. Bei diesem Panel misst ein Voll-Refresh ca. 2 Sekunden (ca. 1,5 s mit schnellen Wellenformen). Das Flackern ist das Standardverfahren zum Entfernen von Geisterbildern, kein Defekt. Zu langsam? Nutze den Partial Refresh (`displayWindow`) dieses Sketches — gemessen ca. 0,42 s pro Update, fast ohne Flackern.

**F: Verträgt das Panel 5V?**
A: Nein. VCC des EPD0426A02 muss 3,3V sein, Punkt. 5V lässt es nicht sofort qualmen, zerstört aber die interne Hochvolt-Treiberschaltung des Panels — das zeigt sich nach ein paar Nutzungen als lokale Bildstörung, und die Garantie greift nicht. Lieber dunkel als 5V.

**F: Das Bild verschlechtert sich langsam, wenn es nach der Demo bestromt bleibt — wie löse ich das endgültig?**
A: Schreibe die beiden Bytes 0x04, 0x63 in Register 0x2B des SSD1677 (das Datenblatt sagt wörtlich „reduce glitch when ACVCOM toggle") und sende sie nach jedem Software-Reset erneut. Genau das macht `epdWriteVCOMControl()` im Sketch. Eine physikalischere Alternative wäre, VCC mit einem P-MOSFET zu trennen — aber wenn zwei Software-Bytes reichen, muss man den Lötkolben nicht anwerfen.

**F: Warum sagst du 4 Graustufen? Auf der Produktseite stehen 16!**
A: SSD1677-Pixel haben physikalisch nur schwarze/weiße stabile Zustände, und der Datenpfad ist 2 Bit/px — nativ also 4 Graustufen (schwarz/dunkelgrau/hellgrau/weiß). Graustufen entstehen durch Wellenformtabellen (LUTs), die innerhalb eines Frames unterschiedlich viele und gepolte Pulse auf verschiedene Pixel anwenden; die wahrgenommenen 16 Stufen werden per Bayer-4×4-Ordered-Dithering auf den nativen 4 simuliert. Dieser Illusions-Sketch nutzt nur Rein-Schwarz-Weiß und ist unbetroffen — aber merke dir diese Obergrenze, wenn du Fotos zeigen willst.

**F: Partial Refresh hinterlässt mit der Zeit Geisterbilder — was tun?**
A: Geisterbild-Ansammlung liegt in der Natur des Partial Refresh. Die praktische Strategie: „nach einer Serie partieller Refreshs einmal voll refreshen" — `display.clearScreen()` oder einfach einmal Vollschwarz und Vollweiß durchlaufen lassen, um die Geister wegzuwaschen. Dieser Sketch refresht nur 4-mal, Geisterbilder sind vernachlässigbar.

**F: Ich will Länge/Position der Segmente ändern oder die Texte auf Deutsch umstellen — wo bearbeite ich das?**
A: Alle Segmentparameter stecken in der Konstantengruppe „Szenengeometrie": `XN`/`XF` sind die horizontalen Positionen, `Y1`/`Y2` die oberen/unteren Endpunkte (Länge = Y2 - Y1), `SEG_W` die Dicke. Die Texte stehen im switch von `drawFrame`. Halte nach dem Ändern die Koordinaten beider Segmente konsistent — sonst hört die Illusion auf, „ehrlich" zu sein.

## Weitere Ideen

- Illusion wechseln: Ersetze Ponzo durch die Müller-Lyer-Pfeil-Illusion oder die Ebbinghaus-Größenillusion — einfach die Geometriefunktionen in `drawFrame` umschreiben
- Manueller Frame-Wechsel: Einen Touch-Button oder ein Poti anschließen, sodass das Publikum „Auflösung!" ruft und erst dann Frame 3 startet — maximale Zeremonie
- Partial-Refresh-Stoppuhr: Mit dem `displayWindow`-Trick dieses Sketches eine E-Stoppuhr bauen, die alle 0,42 s einen Strich weitergeht — und die kognitive Dissonanz von „bewegtem" E-Paper genießen
- Graustufenfotos: GxEPD2_4G dazunehmen und ein Foto mit 4 Graustufen + Bayer-Dithering aufs E-Paper „drucken" — Kindle-Wallpaper-Feeling
- Batterie-Tischobjekt: 18650 + Deep Sleep, nur wenige Sekunden pro Tag aufwachen, um das Bild zu aktualisieren — eine Zelle hält monatelang, und dein Illusionskorridor legt Leute rund um die Uhr herein

## Referenzen

- Offizielle Produktseite des SSD1677-Treiber-ICs (Solomon Systech): https://www.solomon-systech.com/product/ssd1677/
- GxEPD2-Treiberbibliothek auf GitHub (komplette Panel-Liste): https://github.com/ZinggJM/GxEPD2
- Adafruit_GFX-Grafikbibliothek auf GitHub: https://github.com/adafruit/Adafruit-GFX-Library
- Offizielle Produktseite des ESP32-S3-SoC (Espressif): https://www.espressif.com/en/products/socs/esp32-s3
- Schwesternbibliothek GxEPD2_4G (für Graustufenfotos mit 4 Stufen + Dithering): https://github.com/ZinggJM/GxEPD2_4G
