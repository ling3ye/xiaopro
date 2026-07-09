---
title: "ESP32-S3 mit GC9A01 Runddisplay + VL53L0X-V2 Laser-Abstandsmessung – Komplett-Tutorial (SPI-Verkabelung + I2C-Tipps)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/vl53l0x
category: esp32
date: 2026-07-09
intro: "Mit dem ESP32-S3 das GC9A01 1,28 Zoll Runddisplay ansteuern und zusammen mit dem VL53L0X-V2 Laser-Abstandssensor ein Cyberpunk-Laser-Messuhr-Dashboard bauen, dessen Zeiger live schwingt und deren Bogenfarbe mit der Entfernung wechselt – inklusive SPI+I2C Pin-Konflikt-Tipps und komplettem Arduino-Quellcode."
image: "https://img.lingflux.com/2026/07/68114f0f73885a81414b9432bd0d95eb.jpg"
---



# ESP32-S3 mit GC9A01 Runddisplay + VL53L0X-V2 Laser-Abstandsmessung: Von der Verkabelung bis zur Cyberpunk-Messuhr (kompletter Code)

Schwierigkeit: ⭐⭐⭐☆☆ (für Maker mit etwas Grundwegen gut machbar, etwas Geduld beim Verdrahten ist hilfreich)
Geschätzte Zeit: 45 Minuten
Getestete Umgebung: Arduino IDE 2.3.8 + ESP32 Core 3.3.10 + Arduino_GFX_Library v1.6.5 + Adafruit_VL53L0X v1.2.5

---

> **TL;DR (schneller Start):**
>
> 1. Display-Verkabelung: GPIO12→SCL, GPIO11→SDA, GPIO9→CS, GPIO10→DC, GPIO18→RST, GPIO7→BL
> 2. Sensor-Verkabelung: GPIO13→SDA, GPIO14→SCL (**Achtung: nicht die Standard-I2C-Pins**, da GPIO9 bereits vom Display-CS belegt ist)
> 3. Zwei Bibliotheken installieren: `Arduino_GFX_Library`, `Adafruit_VL53L0X`
> 4. Zuerst den „Sensor-Testcode" flashen – erst wenn in der seriellen Schnittstelle Entfernungen erscheinen, das Hauptprogramm flashen
> 5. Hauptprogramm flashen – auf dem Runddisplay erscheint eine Laser-Radar-Messuhr mit drehendem Zeiger und wechselnder Farbe

---

## Vorwort: Warum das Runddisplay-Messuhr-Projekt?

Laser-Abstandsmess-Module (ToF) hat jeder schon oft gesehen, doch meist bleibt man bei der Phase „Entfernung als Zahl auf der seriellen Schnittstelle ausgeben" stecken. Das Ziel dieses Projekts ist simpel: die Leistung des ESP32-S3 und die visuellen Stärken des GC9A01-Runddisplays nutzen, um abstrakte Entfernungsdaten in eine hochaktualisierende Messuhr mit echtem Praxisnutzen und Cyberpunk-Flair zu verwandeln.

Die eigentliche Schwierigkeit liegt nicht in der Logik, sondern im Pin-Konflikt zwischen der SPI-Schnittstelle des Displays und der I2C-Schnittstelle des Sensors. Um das Problem zu lösen, dass sich die Standard-Pins des Boards gegenseitig blockieren und die Initialisierung scheitert, habe ich die Hardware-Pin-Zuordnung neu angepasst. Nachfolgend der komplette Leitfaden zu Stolperfallen und die Implementierung des Hauptprogramms.

## Was am Ende herauskommt

Das finale Ergebnis sieht so aus: Auf dem Runddisplay wird ein bogenförmiges Skaleninstrument ähnlich einem Drehzahlmesser gezeichnet, dessen Zeiger in Echtzeit auf die aktuell gemessene Entfernung zeigt. Die Farbe des Bogens geht von Rot (nah/gefährlich) über zu Grün (weit/sicher). In der Mitte erscheinen der konkrete Millimeter-Wert und ein Status-Text (DANGER / WARNING / CAUTION / SAFE / CLEAR). Wenn du mit der Hand vor dem Sensor winkst, schwingt der Zeiger live mit – ziemlich befriedigend.

## Bauteile im Überblick

Das Entwicklerboard (ESP32-S3) braucht keine große Vorstellung, schauen wir uns die beiden Hauptakteure an.

### GC9A01 240×240 Runddisplay

Der GC9A01 ist ein Display-Treiber-IC, der speziell für runde Bildschirme gedacht ist. Er „übersetzt" die Pixel-Daten, die du schickst, in das Bild auf dem Display – du sagst, was gezeichnet werden soll, der Chip kümmert sich um das Wie, incl. Refresh und Scanning. Du sprichst einfach nur die API an.

| Parameter        | Wert                       |
| ---------------- | -------------------------- |
| Auflösung        | 240×240                    |
| Größe            | 1,28 Zoll                  |
| Schnittstelle    | SPI                        |
| Farbtiefe        | 65K Farben (RGB565)        |
| Treiber-Bibliothek | Arduino_GFX_Library       |

Wir wählen ihn, weil er günstig ist, ein rundes Display für eine Messuhr einfach gut aussieht und die SPI-Schnittstelle schnell genug arbeitet, dass der Zeiger beim Drehen nicht nachzieht.

### VL53L0X-V2 Laser-Abstandssensor

Der VL53L0X ist ein Laser-Abstandssensor, der auf dem Laufzeit-Prinzip (ToF) basiert. Einfach gesagt: Er sendet einen für das menschliche Auge unsichtbaren Infrarot-Laserstrahl aus, misst die Zeit, bis der Strahl vom Objekt reflektiert zurückkommt, und errechnet daraus die Entfernung – wie die Echoortung einer Fledermaus, nur dass hier Licht statt Schall verwendet wird.

| Parameter      | Wert                                                     |
| -------------- | -------------------------------------------------------- |
| Messbereich    | 30mm–1200mm (im Langstrecken-Modus bis ca. 2000mm)       |
| Genauigkeit    | ±3%                                                      |
| Schnittstelle  | I2C (bis zu 400kHz)                                      |
| Laser-Wellenlänge | 940nm (für Menschen unsichtbar, Class 1 Laser, sicher) |

Gewählt haben wir ihn, weil er unabhängig von Farbe und Material des Ziels ist (im Vergleich zu Ultraschall ist er bei der Oberfläche kaum wählerisch), so klein ist, dass er in jedes Gehäuse passt, und I2C nur zwei Signalleitungen benötigt.

> 💡 **Kleiner Hinweis: Das Modul kommt meist ohne optische Abdeckung (ich hab beim Kauf auch vergessen, eine mitzubestellen)**
>
> In der Entwicklungs- und Testphase funktioniert das „nackte" Modul problemlos, aber ein paar kleine Stolpersteine solltest du vorher kennen:
>
> - **Nicht mit dem Finger auf die Chip-Oberfläche fassen**: Die beiden glasgroßen Fenster auf dem Chip (je eines zum Senden und Empfangen, kleiner als ein Sesamkorn) empfindlich gegen Staub, Fett und Feuchtigkeit. Sind sie verschmutzt, streut der Staub das Laserlicht zurück und verursacht „Crosstalk" – die Messung wird plötzlich zu kurz, die Werte springen wild, im schlimmsten Fall fällt der Sensor ganz aus.
> - **Falls schmutzig, nicht blind herumwischen**: Auf keinen Fall mit Ärmel oder Taschentuch drüberreiben (so verkratzt man die Glasoberfläche). Bei Staub einfach mit einem **Blasebalg** pusten, bei Fett mit einem Wattestäbchen und einem Tropfen **reinem Alkohol** sehr vorsichtig abwischen, dann trocknen lassen.
> - **Bei starkem Licht „erblindet" der Sensor**: Sonnenlicht und alte Glühbirnen enthalten Infrarotanteile. Ohne Abdeckung schrumpft die maximale Reichweite deutlich. Auf dem Schreibtisch im Innenraum merkt man das kaum, beim Einsatz draußen solltest du das aber im Hinterkopf behalten.
>
> Falls du das Ganze später in ein Gehäuse einbauen und dauerhaft nutzen willst: **Bitte kein normales transparentes Klebeband oder eine normale Glasscheibe direkt vor den Chip kleben** – normale Materialien reflektieren Infrarotlicht, und der Sensor hält die Abdeckung für ein Hindernis und bleibt bei `0mm` oder wenigen Zentimetern stehen. Entweder lässt du ein Loch, durch das der Sensor herausguckt, oder du besorgst dir ein **940nm Infrarot-Filterglas** und setzt es so nah wie möglich ein (Abstand unter 1mm).

## BOM-Liste (Bauteile)

| Bauteil                    | Anzahl | Hinweis                              |
| -------------------------- | ------ | ------------------------------------ |
| ESP32-S3 Entwicklerboard   | 1      | beliebiges Modell mit genug GPIOs    |
| GC9A01 1,28 Zoll Runddisplay (SPI) | 1 | auf SPI-Version achten, nicht Parallel-Version |
| VL53L0X-V2 ToF Sensor-Modul | 1    | Steckbrett-Variante                  |
| Dupont-Kabel               | einige |                                      |

## Pin-Beschreibung der Bauteile

### GC9A01 Pins

| Pin       | Funktion                                                       |
| --------- | -------------------------------------------------------------- |
| VCC       | Versorgungsspannung, an 3,3V                                  |
| GND       | Masse                                                          |
| SCL/CLK   | SPI-Takt-Leitung                                               |
| SDA/MOSI  | SPI-Daten-Leitung                                              |
| CS        | Chip-Select, aktiv bei Low                                     |
| DC        | Umschaltung Daten-/Kommando-Modus                              |
| RST       | Reset-Pin                                                      |
| BL        | Hintergrundbeleuchtung (manche Module haben ihn nicht herausgeführt, dann ignorieren) |

### VL53L0X-V2 Pins

| Pin    | Funktion                                                              |
| ------ | --------------------------------------------------------------------- |
| VIN    | Versorgungsspannung                                                   |
| GND    | Masse                                                                 |
| SCL    | I2C Serial-Clock-Eingang                                              |
| SDA    | I2C Serial-Data                                                       |
| GPIO1  | Interrupt-Ausgang, zeigt an, ob Daten bereit sind (in diesem Projekt nicht verwendet, offen lassen) |
| XSHUT  | Shutdown-Pin, intern hochgezogen für Normalbetrieb, auf Low für Shutdown-Modus (in diesem Projekt nicht verwendet, offen lassen) |

## Verkabelung

Am besten Zeile für Zeile nach der Tabelle verkabeln und jeden Anschluss abhaken – das spart 80 % der Fehlersuche.

### ESP32-S3 mit GC9A01-Display

| GC9A01 Display | ESP32-S3                                                      |
| -------------- | ------------------------------------------------------------- |
| VCC            | 3,3V                                                          |
| GND            | GND                                                           |
| SCL / CLK      | GPIO12                                                        |
| SDA / MOSI     | GPIO11                                                        |
| CS             | GPIO9                                                         |
| DC             | GPIO10                                                        |
| RST            | GPIO18                                                        |
| BL             | GPIO7 (per Code gesteuert) oder direkt an 3,3V (manche Boards haben keine separate Hintergrundbeleuchtung) |

### ESP32-S3 mit VL53L0X-V2 Sensor

| VL53L0X-V2 | ESP32-S3                         |
| ---------- | -------------------------------- |
| VIN        | 3,3V                             |
| GND        | GND                              |
| SDA        | GPIO13                           |
| SCL        | GPIO14                           |
| GPIO1      | nicht verbunden, offen lassen    |
| XSHUT      | nicht verbunden, offen lassen (intern hochohmig hochgezogen) |

> ⚠️ **Achtung**: Die Standard-I2C-Pins des ESP32-S3 sind normalerweise GPIO8 (SDA) / GPIO9 (SCL). In diesem Projekt ist GPIO9 jedoch bereits vom Display-CS belegt, daher wurde das I2C des Sensors manuell auf GPIO13/GPIO14 verlegt. Im Code wird mit `Wire.begin(I2C_SDA, I2C_SCL)` genau auf diese beiden Pins verwiesen. Bitte aus Bequemlichkeit nicht wieder auf die Standard-Pins zurückgreifen, sonst kommen sich Display und Sensor in die Quere und beide funktionieren nicht.

## Zu installierende Bibliotheken

In der Arduino IDE über den „Bibliotheksverwalter" suchen und installieren:

- `Arduino_GFX_Library` (von moononournation) – getestete Version v1.6.5
- `Adafruit_VL53L0X` (von Adafruit) – getestete Version v1.2.5; bei der Installation wird angeboten, auch `Adafruit BusIO` zu installieren – bitte mit installieren

IDE-Version: Arduino IDE 2.3.8, das ESP32-Board-Support-Paket ist 3.3.10. Bei zu großen Versionsabweichungen kann es zu Inkompatibilitäten in der API kommen, am besten die Versionen angleichen.

## Vollständiger Code

### Messuhr-Hauptprogramm

```cpp
/*
 * ═══════════════════════════════════════════════════════
 *  Cyber-Messuhr · Cyber Gauge Dashboard
 *  Runddisplay GC9A01 (240×240) + VL53L0X-V2 Laser-Abstandsmessung
 *  MCU: ESP32-S3
 *  Treiber-Bibliothek: Arduino_GFX_Library v1.6.5
 * ═══════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <Arduino_GFX_Library.h>

// ───────── Farbdefinitionen (Arduino_GFX v1.6.5 braucht manuelle Defines) ─────────
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

// Cyber-Farbpalette
#define CYBER_BG      0x0841    // tiefer Hintergrund
#define CYBER_PANEL   0x1082    // Panel-Farbe
#define CYBER_BLUE    0x06DF    // Neonschwarzlicht-Blau
#define CYBER_CYAN    0x07F5    // Neon-Cyan
#define CYBER_GREEN   0x47E0    // Neon-Grün
#define CYBER_RED     0xF806    // Warn-Rot
#define CYBER_ORANGE  0xFB40    // Orange
#define CYBER_YELLOW  0xFF80    // Gelb
#define CYBER_DIM     0x4A49    // gedimmte Farbe

// ───────── Pin-Definitionen ─────────
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// VL53L0X läuft separat über I2C, um GPIO9 (TFT_CS) nicht zu belegen
#define I2C_SDA   13
#define I2C_SCL   14

// ───────── Display-Maße ─────────
#define SCREEN_W  240
#define SCREEN_H  240
#define CX        120     // Mittelpunkt X
#define CY        120     // Mittelpunkt Y

// ───────── Messuhr-Parameter ─────────
#define GAUGE_R       95      // Radius des Skalenbogens
#define GAUGE_WIDTH   10      // Bogen-Dicke
#define NEEDLE_LEN    78      // Zeiger-Länge
#define START_ANGLE   135     // Startwinkel (Grad)
#define END_ANGLE     405     // Endwinkel (Grad)
#define MAX_DIST      800     // maximale Anzeige-Entfernung mm
#define MIN_DIST      20      // minimale Entfernung mm
#define TICK_COUNT    16      // Anzahl Skalenstriche

// ───────── Globale Objekte ─────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1 /* MISO */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0 /* rotation */, true /* IPS */
);

Adafruit_VL53L0X lox = Adafruit_VL53L0X();
Arduino_Canvas *canvas;   // Offscreen-Canvas gegen Flackern

// ───────── Zustandsvariablen ─────────
float currentAngle = START_ANGLE;
float targetAngle  = START_ANGLE;
int   currentDist  = 0;
int   lastDist     = -1;

// ═══════════════════════════════════════
//  Hilfsfunktionen
// ═══════════════════════════════════════

// RGB565-Farb-Mischung
uint16_t blendColor(uint16_t c1, uint16_t c2, float t) {
  uint8_t r1 = (c1 >> 11) & 0x1F, g1 = (c1 >> 5) & 0x3F, b1 = c1 & 0x1F;
  uint8_t r2 = (c2 >> 11) & 0x1F, g2 = (c2 >> 5) & 0x3F, b2 = c2 & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// Farbe passend zur Entfernung (nah=Rot, weit=Grün)
uint16_t getDistColor(int dist) {
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  if (ratio < 0.15)  return CYBER_RED;
  if (ratio < 0.30)  return blendColor(CYBER_RED, CYBER_ORANGE, (ratio - 0.15) / 0.15);
  if (ratio < 0.50)  return blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.30) / 0.20);
  if (ratio < 0.70)  return blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.50) / 0.20);
  return blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.70) / 0.30);
}

// Statustext abhängig von Entfernung
const char* getStatusText(int dist) {
  if (dist < 100) return "DANGER";
  if (dist < 200) return "WARNING";
  if (dist < 400) return "CAUTION";
  if (dist < 600) return "SAFE";
  return "CLEAR";
}

// ═══════════════════════════════════════
//  Zeichen-Funktionen
// ═══════════════════════════════════════

// Dicken Bogen zeichnen (mit vielen kurzen Segmenten simuliert)
void drawArc(Arduino_Canvas *c, int cx, int cy, int r,
             float startDeg, float endDeg, int thickness,
             uint16_t color) {
  float step = 1.5;  // Winkel pro Schritt
  for (float a = startDeg; a <= endDeg; a += step) {
    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// Bogen mit Farbverlauf zeichnen
void drawGradientArc(Arduino_Canvas *c, int cx, int cy, int r,
                     float startDeg, float endDeg, int thickness) {
  float totalAngle = endDeg - startDeg;
  float step = 1.5;

  for (float a = startDeg; a <= endDeg; a += step) {
    float ratio = (a - startDeg) / totalAngle;
    uint16_t color;

    // Rot -> Orange -> Gelb -> Cyan -> Grün
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

// Skalenstriche zeichnen
void drawTicks(Arduino_Canvas *c) {
  float totalAngle = END_ANGLE - START_ANGLE;

  for (int i = 0; i <= TICK_COUNT; i++) {
    float angle = START_ANGLE + (float)i / TICK_COUNT * totalAngle;
    float rad = angle * DEG_TO_RAD;
    float ratio = (float)i / TICK_COUNT;

    // Farbe des Skalenstrichs
    uint16_t color;
    if (ratio < 0.2)       color = CYBER_RED;
    else if (ratio < 0.4)  color = CYBER_ORANGE;
    else if (ratio < 0.6)  color = CYBER_YELLOW;
    else if (ratio < 0.8)  color = CYBER_CYAN;
    else                   color = CYBER_GREEN;

    // lange/kurze Striche
    bool isMajor = (i % 4 == 0);
    int innerR  = GAUGE_R + 4;
    int outerR  = innerR + (isMajor ? 12 : 6);
    int thick   = isMajor ? 2 : 1;

    int x1 = CX + cos(rad) * innerR;
    int y1 = CY + sin(rad) * innerR;
    int x2 = CX + cos(rad) * outerR;
    int y2 = CY + sin(rad) * outerR;

    // Skalenstrich zeichnen
    for (int t = 0; t < thick; t++) {
      c->drawLine(x1 + t, y1, x2 + t, y2, color);
    }

    // Zahlenbeschriftung an Hauptstrichen
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

// Zeiger zeichnen
void drawNeedle(Arduino_Canvas *c, float angleDeg, uint16_t color) {
  float rad = angleDeg * DEG_TO_RAD;

  // Zeigerspitze
  int tipX = CX + cos(rad) * NEEDLE_LEN;
  int tipY = CY + sin(rad) * NEEDLE_LEN;

  // Zeigerbasis (zwei Punkte senkrecht zur Zeiger-Richtung)
  float perpRad = rad + PI / 2;
  int baseW = 4;
  int bx1 = CX + cos(perpRad) * baseW;
  int by1 = CY + sin(perpRad) * baseW;
  int bx2 = CX - cos(perpRad) * baseW;
  int by2 = CY - sin(perpRad) * baseW;

  // Dreieckigen Zeiger zeichnen
  c->fillTriangle(tipX, tipY, bx1, by1, bx2, by2, color);

  // Mittige Dekoration
  c->fillCircle(CX, CY, 7, CYBER_PANEL);
  c->drawCircle(CX, CY, 7, color);
  c->fillCircle(CX, CY, 3, color);
}

// Komplettes Dashboard zeichnen
void drawDashboard(int dist) {
  canvas->fillScreen(CYBER_BG);

  // Äußerer Deko-Ring
  canvas->drawCircle(CX, CY, 118, CYBER_PANEL);

  // Hintergrundbogen (dunkle Schiene)
  drawArc(canvas, CX, CY, GAUGE_R,
          START_ANGLE, END_ANGLE, GAUGE_WIDTH, CYBER_PANEL);

  // Bogen mit Verlauf (komplett)
  drawGradientArc(canvas, CX, CY, GAUGE_R,
                  START_ANGLE, END_ANGLE, GAUGE_WIDTH);

  // Skala
  drawTicks(canvas);

  // Zeigerwinkel berechnen
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  targetAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);

  // Weiche Interpolation
  currentAngle += (targetAngle - currentAngle) * 0.15;

  // Farbe bestimmen
  uint16_t needleColor = getDistColor(dist);

  // Zeiger zeichnen
  drawNeedle(canvas, currentAngle, WHITE);

  // ── Zentrale Zahlen-Anzeige ──
  // Entfernungswert
  canvas->setTextColor(WHITE);
  canvas->setTextSize(3);
  String distStr = String(dist);
  int textW = distStr.length() * 18;
  canvas->setCursor(CX - textW / 2, CY + 16);
  canvas->print(distStr);

  // Einheit
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 6, CY + 42);
  canvas->print("mm");

  // Titel
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 30, CY - 28);
  canvas->print("LASER RANGE");

  // Status-Anzeige
  canvas->setTextColor(needleColor);
  canvas->setTextSize(1);
  const char* status = getStatusText(dist);
  int sLen = strlen(status);
  canvas->setCursor(CX - sLen * 3, CY + 56);
  canvas->print(status);

  // Ans Display schicken
  canvas->flush();
}

// ═══════════════════════════════════════
//  setup() & loop()
// ═══════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n═══ Cyber Gauge Dashboard ═══");

  // Schritt 1: Hintergrundbeleuchtung einschalten
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // Schritt 2: Display initialisieren
  gfx->begin();
  gfx->fillScreen(BLACK);
  gfx->setRotation(0);

  // Schritt 3: Offscreen-Canvas anlegen (Double-Buffering gegen Flackern)
  canvas = new Arduino_Canvas(SCREEN_W, SCREEN_H, gfx);
  canvas->begin();

  // Boot-Bildschirm
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

  // Schritt 4: I2C und Sensor initialisieren (Achtung: hier eigene Pins, nicht die Standard-Pins)
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("VL53L0X Initialisierung fehlgeschlagen!");
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

  Serial.println("VL53L0X bereit ✓");

  // Schritt 5: Continuous-Messung starten
  lox.startRangeContinuous();

  Serial.println("Messuhr-Start abgeschlossen!");
}

void loop() {
  // Entfernung auslesen
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();

    // Ungültige Werte herausfiltern
    if (dist > 0 && dist < 8190) {
      // Einfache Glättung gegen wild springende Werte
      currentDist = currentDist * 0.7 + dist * 0.3;
      currentDist = constrain(currentDist, MIN_DIST, MAX_DIST);

      // Nur neu zeichnen, wenn die Entfernung sich über dem Schwellwert ändert – spart Leistung
      if (abs(currentDist - lastDist) > 2) {
        drawDashboard(currentDist);
        lastDist = currentDist;

        Serial.printf("Entfernung: %d mm\n", currentDist);
      }
    }
  }

  delay(30);  // ~33 FPS
}
```

### Sensor-Testcode (bitte zuerst laufen lassen)

Bevor du das Hauptprogramm flashst, empfehle ich dringend, diesen Minimalcode zu flashen, um sicherzustellen, dass der Sensor ordnungsgemäß funktioniert. So lässt sich ein Problem auch isoliert eingrenzen, ohne im Grafik-Code die Nadel im Heuhaufen suchen zu müssen.

```cpp
/*
 *  VL53L0X Sensor testen
 */

#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define I2C_SDA  13
#define I2C_SCL  14

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("VL53L0X Sensor-Test");

  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("❌ Sensor nicht gefunden, bitte Verkabelung prüfen!");
    while (1);
  }

  Serial.println("✓ Sensor bereit, beginne mit Messung...");
  lox.startRangeContinuous();
}

void loop() {
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();
    Serial.printf("Entfernung: %d mm\n", dist);
  }
  delay(100);
}
```

### Code-Erklärung

Ein paar leicht verwirrende Stellen, kurz herausgegriffen:

- **`blendColor()`**: Mischt zwei RGB565-Farben im Verhältnis `t` und erzeugt so den farbverlaufenden Bogen von Rot → Orange → Gelb → Cyan → Grün. Statt die Farbe hart zu wechseln, wirkt der Übergang so sanft.
- **`Arduino_Canvas` (Offscreen-Canvas)**: Alle Zeichenschritte laufen erst im Arbeitsspeicher auf einen Canvas und werden erst am Ende per `flush()` aufs Display gepusht – statt jeden Strich einzeln direkt zu zeichnen. Ohne diesen Trick würde der Zeiger beim Drehen stark flackern und zerreißen.
- **Glättungs-Filter `currentDist * 0.7 + dist * 0.3`**: Rohwerte des Sensors schwanken leicht. Mit diesem einfachen Tiefpass-Filter 1. Ordnung schwingt der Zeiger weicher und zuckt nicht nervös hin und her.
- **`I2C_SDA=13, I2C_SCL=14`**: Die oben beim Verdrahten schon mehrfach betonte Falle – hier nochmal als Erinnerung: Das sind nicht die Standard-I2C-Pins des ESP32-S3. Sie wurden nur deshalb manuell umgemappt, weil der Standard-Pin GPIO9 vom Display-CS belegt ist.

## Häufige Probleme und Lösungen

Keine Panik, in acht von zehn Fällen liegt es an einem dieser Punkte:

1. **Display bleibt nach dem Flashen schwarz**
   Zuerst prüfen, ob `TFT_BL` (Hintergrundbeleuchtung) richtig angeschlossen ist und ob `digitalWrite(TFT_BL, HIGH)` im Code auch erreicht wird. Danach prüfen, ob der RST-Pin schlechten Kontakt hat – ein wackliger RST ist die häufigste Ursache für ein schwarzes Runddisplay.

2. **Serielle Ausgabe zeigt „VL53L0X Initialisierung fehlgeschlagen!"**
   Zu 99 % ein Verkabelungsproblem: Prüfen, ob VIN/GND nicht vertauscht sind, ob SDA/SCL wirklich an GPIO13/GPIO14 anliegen (nicht an den Standard-Pins GPIO8/9) und ob Dupont-Kabel fest sitzen. Am besten isoliert den „Sensor-Testcode" laufen lassen, um das Display als Fehlerquelle auszuschließen.

3. **Display leuchtet, aber mit Fehlern, Streifen oder falschen Farben**
   Meist schlechter Kontakt an SPI-Takt- oder Daten-Leitung, oder die Dupont-Kabel sind zu lang und das Signal wird zu schwach. Prüfen, ob SCL/SDA wirklich mit GPIO12/GPIO11 verbunden sind, und Kabel nach Möglichkeit unter 15 cm halten.

4. **Zeiger zuckt wild, die Zahlen springen dauernd**
   Entweder ist der Filter-Koeffizient zu schwach, oder vor dem Sensor stehen reflektierende/transparente Gegenstände, die stören. Du kannst die Gewichte in `currentDist * 0.7 + dist * 0.3` auf `0.85/0.15` setzen – die Filterung wird stärker (dafür reagiert die Anzeige träger).

5. **Beim Kompilieren wird `Adafruit_VL53L0X.h` oder `Arduino_GFX_Library.h` nicht gefunden**
   Die Bibliothek wurde nicht korrekt installiert. Im Bibliotheksverwalter unter exakt diesem Namen neu installieren, und darauf achten, nicht versehentlich einen gleichnamigen Drittanbieter-Fork zu erwischen.

6. **Zeigerwinkel und Skalen-Zahlen passen nicht zusammen**
   Prüfen, ob `MAX_DIST` verkleinert wurde, ohne dass die Skalenbeschriftung mit angepasst wurde. Beide müssen zusammenpassen, sonst passen Skalen-Zahlen und tatsächliche Zeiger-Position nicht mehr zusammen.

## FAQ

**F: Welche sind die Standard-I2C-Pins des ESP32-S3?**
A: Normalerweise GPIO8 (SDA) und GPIO9 (SCL). In diesem Projekt ist GPIO9 jedoch vom Display-CS belegt, deshalb wurde das Sensor-I2C auf GPIO13/GPIO14 verlegt.

**F: Wie weit und wie genau misst der VL53L0X?**
A: Laut Datenblatt liegt der effektive Messbereich bei ca. 30mm–1200mm (im Langstrecken-Modus bis zu 2000mm), die Genauigkeit bei etwa ±3%.

**F: Unterstützt das GC9A01-Runddisplay Touch?**
A: Der GC9A01 selbst ist ein reiner Display-Treiber ohne Touch-Funktion. Manche Module auf dem Markt haben zusätzlich einen kapazitiven Touch-Controller integriert – vor dem Kauf prüfen, ob es sich um eine Touch-Variante handelt.

**F: Kann der Laser des VL53L0X die Augen verletzen?**
A: Nein. Es handelt sich um ein Class 1 Laser-Produkt, die Wellenlänge von 940nm ist für das menschliche Auge unsichtbar, die Leistung ist sehr gering und entspricht den Augensicherheits-Standards. Bei normaler Nutzung besteht kein Grund zur Sorge.

**F: Das GC9A01-Display bleibt dunkel, obwohl die Stromversorgung stimmt – woran liegt das?**
A: Meistens hat der RST-(Reset-)Pin schlechten Kontakt, oder der Hintergrundbeleuchtungs-Pin BL wurde nicht auf High gezogen. Diese beiden Stellen zuerst prüfen.

**F: Warum wird im Code ein Offscreen-Canvas `Arduino_Canvas` verwendet, statt direkt aufs Display zu zeichnen?**
A: Direktes Zeichnen führt beim Drehen des Zeigers und beim Neuzeichnen des Bogens zu sichtbarem Flackern und Tearing. Mit einem Canvas als Double-Buffer wird erst fertig gezeichnet und dann auf einen Schlag aktualisiert – so bleibt das Bild sauber.

**F: Gibt es einen Unterschied zwischen VL53L0X-V2 und dem normalen VL53L0X?**
A: Messprinzip und Pin-Belegung sind gleich. Die V2-Version ist in der Regel eine überarbeitete Modul-Variante der Hersteller mit optimiertem Platinen-Layout und Spannungsversorgung. Die genauen Unterschiede bitte den Datenblättern des jeweils gekauften Moduls entnehmen.

**F: Reicht beim ESP32-S3 die USB-Stromversorgung für dieses Projekt?**
A: Ja. Display und Sensor zusammen verbrauchen nicht viel Strom, eine normale USB-5V/500mA-Versorgung reicht völlig aus.

## Erweiterte Spielideen

- Einen Buzzer anschließen und in der DANGER-Zone Alarm geben – schon hast du einen einfachen Einpark-Radar.
- Verlaufsdaten der Entfernung speichern und als Live-Kurve zeichnen, um Bewegungen sichtbar zu machen.
- Zwei Tasten ergänzen und die Anzeige-Einheit umschalten (mm / cm / inch).
- Ein Gehäuse bauen, das an der Windschutzscheibe saugt – dann wirklich als Rückfahr-Radar einsetzen.

## Referenzen

- [ST VL53L0X offizielles Datenblatt](https://www.st.com/en/imaging-and-photonics-solutions/vl53l0x.html)
- [Adafruit_VL53L0X GitHub Repository](https://github.com/adafruit/Adafruit_VL53L0X)
- [Arduino_GFX_Library GitHub Repository](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 offizielle Produktseite](https://www.espressif.com/en/products/socs/esp32-s3)
