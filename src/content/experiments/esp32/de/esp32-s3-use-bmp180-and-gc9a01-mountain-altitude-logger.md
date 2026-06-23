---
title: "ESP32-S3 mit GC9A01 Runddisplay + BMP180: DIY-Höhenmesser fürs Bergsteigen (SPI + I2C + Arduino)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/bmp180
category: esp32
date: 2026-06-23
intro: "Mit dem ESP32-S3 das GC9A01 1,28-Zoll-Runddisplay ansteuern und zusammen mit dem BMP180-Drucksensor einen Höhenmesser fürs Bergsteigen bauen – mit dynamischer Berglandschaft als Hintergrund, aktueller Höhe, kumulierte Steigung/Abstieg und Luftdruckanzeige. Inklusive komplettem Arduino-Code und Verkabelung."
image: "https://img.lingflux.com/2026/06/cc83e55f42460646d2fd372496989222.jpg"
---

> Schwierigkeit: ⭐⭐⭐☆☆ (schaffst du locker, wenn du schon mal ein paar Dupont-Kabel verlötet hast)
> Geschätzte Zeit: 45 Minuten
> Getestet mit: Arduino IDE 2.3.2 · Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · ESP32 Arduino Core 3.0.x

---

> **TL;DR (Schnellstart):**
> 1. **Display verkabeln**: GC9A01 → CS/GPIO9, DC/GPIO10, SCK/GPIO12, MOSI/GPIO11, RST/GPIO18, BL/GPIO7
> 2. **Sensor verkabeln**: BMP180 → SDA/GPIO13, SCL/GPIO14
> 3. **Hintergrundbeleuchtung muss HIGH sein**: `digitalWrite(TFT_BL, HIGH)` in `setup()` einfügen – ohne diese Zeile bleibt der Bildschirm für immer schwarz
> 4. **Zwei Libraries installieren**: Arduino_GFX_Library (von moononournation) + Adafruit BMP085 Library
> 5. **Direkt flashen**, den Seriellen Monitor öffnen (115200) – sobald `Initialisierung abgeschlossen, Eintritt in die Hauptschleife` erscheint, hat es geklappt

---

## Einleitung

Ich wandere sehr gerne, aber in letzter Zeit komme ich nur noch auf den Baiyun-Berg. Im Rucksack: Powerbank, Smartphone, Sonnencreme – aber nichts, was mir in Echtzeit sagt: „Du bist schon soundso viele Höhenmeter geklettert." Handy-Apps brauchen Internet, das GPS-Signal ist mal gut, mal schlecht, und jedes Mal, wenn ich das Handy zücke, fühlt es sich an wie „Ich bin nur hier, um ein Foto zu machen". Also wollte ich einen eigenen Höhenmesser bauen.

Zurück zu Hause habe ich in meiner Bastelkiste gewühlt und ein GC9A01-Runddisplay gefunden, das schon ewig Staub ansetzt – die runde Form erinnert stark an das Zifferblatt einer Höhenmesser-Uhr. Zusammen mit dem BMP180-Drucksensor und einem ESP32-S3 kostet das Ganze weniger als 50 Yuan, und das Ergebnis ist viel besser, als ich erwartet hatte.

Ziel dieses Artikels: Von Grund auf diese drei Bauteile verkabeln, den Code flashen und einen Höhenmesser bekommen, der Echtzeit-Höhe, kumulierte Steigung/Abstieg und Luftdruck anzeigt – mit einem Hintergrund, der sich je nach Höhe dynamisch verfärbt. Schritt für Schritt zum Nachbauen.

---

## Ergebnis des Experiments

Das Endergebnis: Das GC9A01-Runddisplay zeigt in Echtzeit die aktuelle Höhe (m), die kumulierte Steigung (oranger Pfeil nach oben), die kumulierte Abstiegsleistung (blauer Pfeil nach unten) und den aktuellen Luftdruck. Der Hintergrund ist ein Bergpanorama, das sich je nach Höhenverhältnis dynamisch verfärbt – in niedrigen Lagen warmbraun, in großen Höhen immer tiefblauer, und die Schneegrenze am Gipfel wandert mit steigender Höhe nach unten. Am Bildschirmrand zeigt ein goldener Fortschrittsring die Höhenentwicklung, und ein 2 Sekunden langes Drücken der BOOT-Taste setzt die Zähler auf null.

![](https://img.lingflux.com/2026/06/9cedc6308f5ac8b32bb260be186b9298.jpg)

---

## Bauteile im Überblick

> Der ESP32-S3 braucht wohl keine große Vorstellung – wenn du diesen Artikel liest, hast du schon mal mit einem ESP32 gearbeitet. Hier geht's nur um die beiden anderen Mitwirkenden.

### BMP180-Drucksensor

Der BMP180 ist ein MEMS-Drucksensor, der den Luftdruck misst und daraus die Höhe berechnet. In diesem Projekt erfasst er einmal pro Sekunde Luftdruck und Höhe und liefert damit die Datenbasis für das ganze Dashboard.

Einfach gesagt: Er ist wie eine „Mini-Wetterstation", die du bei dir trägst – durch die Messung des Luftdrucks errechnet sie, auf welcher Höhe du stehst. Das Prinzip ist dasselbe wie beim Ohrendruck beim Starten und Landen im Flugzeug: niedrigerer Druck bedeutet größere Höhe. Da die Temperatur die Druckmessung beeinflusst, ist intern noch ein Temperatursensor verbaut, der die Werte korrigiert und die Höhenangabe präziser macht.

| Kennwert | Wert |
| --- | --- |
| Betriebsspannung | 1,8 V – 3,6 V (einfach an 3,3 V anschließen) |
| Kommunikationsprotokoll | I2C (feste Adresse 0x77) |
| Luftdruckmessbereich | 300 – 1100 hPa |
| Höhengenauigkeit | Standardmodus ±1 m, hochgenauer Modus ±0,5 m |
| Stromaufnahme | 0,1 µA Standby; 650 µA Spitze (während der Wandlung); 3–32 µA Ø bei 1 Hz (modusabhängig) |

Warum dieses Modell: günstig, hervorragend durch die Adafruit-Library unterstützt, für Wanderaufzeichnungen völlig ausreichend. Wenn du mehr Genauigkeit oder zusätzlich Luftfeuchtigkeit brauchst, kannst du auf BMP280 oder BME280 upgraden – aber das ist ein anderer Artikel.

### GC9A01 rundes TFT-Farbdisplay

Der GC9A01 ist der Treiber-IC des 1,28-Zoll-runden TFT-Farbdisplays. Er empfängt die SPI-Daten und treibt das runde 240×240-Pixel-Panel an. In diesem Projekt übernimmt er das Rendern des dynamischen Berg-Hintergrunds und der Echtzeit-Höhendaten.

Einfach gesagt: Stell dir das runde Zifferblatt einer Smartwatch vor – genau das ist es. Er kommuniziert über SPI, hat eine hohe Bildrate, und die runde Form eignet sich von Natur aus hervorragend für Dashboards. Mit dem Canvas-Doppelbuffering der Arduino_GFX_Library laufen die Animationen flüssig und ohne Flackern.

| Kennwert | Wert |
| --- | --- |
| Displaygröße | 1,28 Zoll (rund) |
| Auflösung | 240 × 240 Pixel |
| Treiber-IC | GC9A01 |
| Schnittstelle | SPI (bis zu 80 MHz) |
| Betriebsspannung | 3,3 V |
| Farbtiefe | 16-Bit RGB565 (65536 Farben) |

Warum dieses Modell: Ein Runddisplay und das Thema „Bergsteiger-Uhr" passen perfekt zusammen. Der Durchmesser reicht genau aus, um große Höhenzahlen, Steigungs-/Abstiegsanzeigen und den Fortschrittsring unterzubringen – ohne dass es eng wirkt.

---

## Stückliste (BOM)

| Bauteil | Modell / Spezifikation | Stückzahl |
| --- | --- | --- |
| Hauptplatine | ESP32-S3 (empfohlen: Version mit USB-C) | 1 |
| Drucksensor | BMP180-Modul (fertiges Modul mit I2C-Pullup-Widerständen) | 1 |
| Rund-Farbdisplay | GC9A01 1,28 Zoll TFT, 240×240 | 1 |
| Verbindungskabel | Dupont-Kabel (weiblich-weiblich) | mehrere |
| Stromversorgung | USB-C-Datenkabel + PC / Netzteil | 1 |

---

## Pin-Belegung der Bauteile

### GC9A01-Pins

| Display-Pin | Funktion |
| --- | --- |
| VCC | Versorgungsspannung, an 3,3 V |
| GND | Masse |
| SCL / CLK | SPI-Taktleitung |
| SDA / MOSI | SPI-Datenleitung (Master → Slave) |
| CS | Chip-Select (aktiv Low) |
| DC | Daten-/Befehls-Auswahl |
| RST | Reset (Trigger Low) |
| BL | Hintergrundbeleuchtung, **leuchtet nur bei HIGH** |

### BMP180-Pins

| Sensor-Pin | Funktion |
| --- | --- |
| VCC | Versorgungsspannung, an 3,3 V |
| GND | Masse |
| SCL | I2C-Taktleitung |
| SDA | I2C-Datenleitung |

---

## Verkabelung

### GC9A01 → ESP32-S3

| GC9A01-Pin | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3,3 V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL (Hintergrundbeleuchtung) | GPIO 7 |

### BMP180 → ESP32-S3

| BMP180-Pin | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3,3 V |
| GND | GND |
| SCL | GPIO 14 |
| SDA | GPIO 13 |



> **Nach dem Verkabeln am besten alles noch einmal Punkt für Punkt durchgehen – das erspart dir 80 % der Fehlersuche.** An zwei Stellen gibt es typische Stolpersteine: Erstens reicht es nicht, BL (Hintergrundbeleuchtung) an GPIO7 anzuschließen – im Code muss zusätzlich `digitalWrite(TFT_BL, HIGH)` stehen, sonst bleibt es dunkel. Zweitens: SCL/SDA des GC9A01 laufen über **SPI**, SCL/SDA des BMP180 über **I2C**. Die Namen sind gleich, aber es sind zwei völlig unabhängige Busse – die Pins dürfen auf keinen Fall verwechselt werden.

---

## Benötigte Libraries

Öffne in der Arduino IDE → Werkzeuge → Bibliotheken verwalten, suche und installiere die folgenden drei:

| Library | Autor | Zweck |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | GC9A01-Display-Treiber + Canvas-Doppelbuffering |
| Adafruit BMP085 Library | Adafruit | Treiber für BMP180 / BMP085-Drucksensor |
| Adafruit Unified Sensor | Adafruit | Abhängigkeit der vorherigen Library, zusammen installieren |

> **Getestete Versionen**: Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · Arduino IDE 2.3.2 · ESP32 Arduino Core 3.0.x
> Falls du noch eine ältere ESP32-Core-Version (1.x-Serie) nutzt, unterscheidet sich die SPI-Initialisierung leicht. Am besten direkt auf 3.x upgraden, dann umgehst du die typischen Stolpersteine.

---

## Kompletter Code

```cpp
/*
  ============================================================
  Höhenmesser fürs Bergsteigen (Mountain Altitude Logger)
  ============================================================
  Hardware: ESP32-S3 + GC9A01-Runddisplay (240x240) + BMP180-Drucksensor
  ============================================================
*/

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>

// ===================== Schritt 1: Pin- und Parameterdefinitionen =====================
#define TFT_CS    9    // Chip-Select des Displays
#define TFT_DC    10   // Daten-/Befehls-Auswahl
#define TFT_SCK   12   // SPI-Takt
#define TFT_MOSI  11   // SPI-Daten (Master → Slave)
#define TFT_RST   18   // Reset des Displays
#define TFT_BL    7    // Hintergrundbeleuchtung (leuchtet bei HIGH, muss HIGH sein!)
#define TFT_MISO  -1   // MISO wird nicht benötigt (nur Schreiben, nicht Lesen)

#define BMP_SDA   13   // BMP180 I2C-Datenleitung
#define BMP_SCL   14   // BMP180 I2C-Taktleitung

#define BTN_PIN   0    // Interne BOOT-Taste, 2 s gedrückt halten = Kalibrierung/Reset
#define CALIBRATION_HOLD_MS 2000  // Schwellenwert für langen Tastendruck (Millisekunden)

#define FILTER_SIZE 5     // Fenster des gleitenden Mittelwerts (Mittel über die letzten 5 Messungen)
#define DEAD_ZONE   0.3f  // Totzone für kumulierte Steigung/Abstieg (Schwingungen unter 0,3 m ignorieren)
#define ALT_RANGE_MAX 3000.0f  // Höhengrenze für einen vollen Fortschrittsring (3000 m)

// ===================== Schritt 2: Hardware-Treiberobjekte =====================
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, TFT_MISO);
Arduino_GFX *gfx = new Arduino_GC9A01(bus, TFT_RST, 0 /* Ausrichtung */, true /* IPS-Modus */);
// Canvas-Doppelbuffering: Alle Zeichenoperationen werden erst in einen Speicher-Canvas geschrieben
// und beim flush() in einem Rutsch auf das Display gepusht – so wird das Flackern vermieden
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

Adafruit_BMP085 bmp;

// ===================== Schritt 3: Datenstruktur =====================
struct AltitudeData {
  float currentAltitude = 0;       // Aktuelle Höhe (gefiltert)
  float maxAltitude = 0;           // Höchste Höhe dieser Aufzeichnung
  float totalAscent = 0;           // Kumulierte Steigung
  float totalDescent = 0;          // Kumulierter Abstieg
  float currentPressure = 1013.25; // Aktueller Luftdruck (hPa)

  // Die folgenden „Anzeigewerte" dienen der Animationsinterpolation, damit die
  // Zahlen weich übergehen und nicht plötzlich springen
  float displayedAltitude = 0;
  float displayedAscent = 0;
  float displayedDescent = 0;
  float displayedPressure = 1013.25;
} data;

// Ringpuffer für den gleitenden Mittelwert
float altBuffer[FILTER_SIZE] = {0};
int filterIndex = 0;
int filterCount = 0;

// Farbkonstanten (werden in setup() mit color565() initialisiert, um Ressourcen früh zu schonen)
uint16_t COLOR_WHITE, COLOR_BLACK, COLOR_CREAM_GREEN;

// Tastenstatus
unsigned long btnPressStart = 0;
bool btnIsPressed = false;
bool calibrationTriggered = false;


// ============================================================
//                   Modul 1: Sensor auslesen
// ============================================================

void initSensor() {
  Serial.print("[Sensor] Initialisiere I2C-Bus (SDA=");
  Serial.print(BMP_SDA);
  Serial.print(", SCL=");
  Serial.print(BMP_SCL);
  Serial.println(")...");

  Wire.begin(BMP_SDA, BMP_SCL);

  Serial.println("[Sensor] Verbinde mit BMP180-Sensor...");
  if (!bmp.begin()) {
    // Wenn das Programm hier hängen bleibt und ständig ERROR ausgibt,
    // liegt ein Verkabelungsfehler beim Sensor vor.
    // Das Display bleibt ebenfalls dunkel, weil der Code nie weiterläuft.
    while (1) {
      Serial.println("[ERROR] BMP180-Initialisierung fehlgeschlagen! Verkabelung, Versorgung (3,3 V) und I2C-Pins prüfen.");
      delay(2000);
    }
  }
  Serial.println("[Sensor] BMP180 erfolgreich verbunden!");
}

// Einmal den Roh-Luftdruck und die Roh-Höhe vom BMP180 lesen
void sampleSensor(float &rawAltitude, float &rawPressure) {
  rawPressure = bmp.readPressure() / 100.0f;  // Pa → hPa
  rawAltitude = bmp.readAltitude(101325);      // 101325 Pa = Standard-Luftdruck auf Meereshöhe
}


// ============================================================
//                   Modul 2: Datenverarbeitung
// ============================================================

// Gleitender Mittelwert: Mittel über die letzten FILTER_SIZE Messungen, reduziert Sensorrauschen
float smoothAltitude(float raw) {
  altBuffer[filterIndex] = raw;
  filterIndex = (filterIndex + 1) % FILTER_SIZE;
  if (filterCount < FILTER_SIZE) filterCount++;

  float sum = 0;
  for (int i = 0; i < filterCount; i++) sum += altBuffer[i];
  return sum / filterCount;
}

// Statistik aktualisieren: maximale Höhe, kumulierte Steigung, kumulierter Abstieg
void updateStats(float smoothedAltitude) {
  static bool firstSample = true;
  static float lastAltitude = 0;

  if (firstSample) {
    lastAltitude = smoothedAltitude;
    data.maxAltitude = smoothedAltitude;
    firstSample = false;
  }

  float delta = smoothedAltitude - lastAltitude;
  // Nur Änderungen außerhalb der Totzone zählen – verhindert, dass kleine
  // Schwankungen in der Ebene die Steigung künstlich hochtreiben
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
//                   Modul 3: Taste und Kalibrierung
// ============================================================

void showCalibrationFlash();  // Vorwärtsdeklaration

// Bei langem Druck auf BOOT: Steigung/Abstieg zurücksetzen und mit aktueller Höhe neu beginnen
void doCalibration() {
  Serial.println("[Taste] Langer Druck erkannt, Höhen-Kalibrierung auf null...");
  data.totalAscent = 0;
  data.totalDescent = 0;
  data.displayedAscent = 0;
  data.displayedDescent = 0;
  data.maxAltitude = data.currentAltitude;

  showCalibrationFlash();
  Serial.println("[Taste] Kalibrierung abgeschlossen.");
}

// Tastenstatus abfragen, BOOT-Taste ist aktiv Low
void handleButton() {
  bool pressed = (digitalRead(BTN_PIN) == LOW);

  if (pressed && !btnIsPressed) {
    btnIsPressed = true;
    btnPressStart = millis();
    calibrationTriggered = false;
  } else if (pressed && btnIsPressed) {
    // Bei Überschreiten des Schwellenwerts und noch nicht ausgelöst: Kalibrierung durchführen
    if (!calibrationTriggered && (millis() - btnPressStart >= CALIBRATION_HOLD_MS)) {
      doCalibration();
      calibrationTriggered = true;  // Verhindert mehrfaches Auslösen während eines Drucks
    }
  } else if (!pressed && btnIsPressed) {
    btnIsPressed = false;
  }
}


// ============================================================
//                   Modul 4: UI-Rendering
// ============================================================

// Lineare Interpolation zwischen zwei RGB565-Farben (t von 0.0 bis 1.0)
uint16_t lerpColor(uint16_t colorA, uint16_t colorB, float t) {
  t = constrain(t, 0.0, 1.0);
  uint8_t r1 = (colorA >> 11) & 0x1F, g1 = (colorA >> 5) & 0x3F, b1 = colorA & 0x1F;
  uint8_t r2 = (colorB >> 11) & 0x1F, g2 = (colorB >> 5) & 0x3F, b2 = colorB & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// Verlaufshimmel-Hintergrund zeichnen: niedrige Lage warmbraun, hohe Lage tiefblau
void drawSkyBackground(float altitudeRatio) {
  uint16_t topLow     = canvas->color565(176, 196, 210);  // Zenit in niedriger Lage: helles Blau
  uint16_t topHigh    = canvas->color565(30, 30, 90);     // Zenit in großer Höhe: tiefes Blau
  uint16_t bottomLow  = canvas->color565(210, 200, 180);  // Horizont in niedriger Lage: warmes Grau
  uint16_t bottomHigh = canvas->color565(70, 90, 140);    // Horizont in großer Höhe: blaugrau

  uint16_t topColor    = lerpColor(topLow, topHigh, altitudeRatio);
  uint16_t bottomColor = lerpColor(bottomLow, bottomHigh, altitudeRatio);

  for (int y = 0; y < 240; y++) {
    float t = (float)y / 240.0;
    canvas->drawFastHLine(0, y, 240, lerpColor(topColor, bottomColor, t));
  }
}

// Einzelnen Berg mit Schneegrenze zeichnen; greenFraction steuert die Position der Schneegrenze
// – je höher, desto tiefer liegt die Schneegrenze
void drawSnowyPeak(int16_t apexX, int16_t apexY, int16_t baseLeftX, int16_t baseRightX,
                    int16_t baseY, uint16_t bodyColor, float greenFraction) {
  canvas->fillTriangle(apexX, apexY, baseLeftX, baseY, baseRightX, baseY, bodyColor);

  greenFraction = constrain(greenFraction, 0.05f, 0.85f);
  int16_t snowY      = apexY + (baseY - apexY) * greenFraction;
  int16_t snowLeftX  = apexX + (baseLeftX - apexX) * greenFraction;
  int16_t snowRightX = apexX + (baseRightX - apexX) * greenFraction;

  canvas->fillTriangle(apexX, apexY, snowLeftX, snowY, snowRightX, snowY, COLOR_CREAM_GREEN);
}

// Drei gestaffelte Berge in verschiedenen Tiefen zeichnen
void drawMountains(float altitudeRatio) {
  float greenRatio = 1.0f - altitudeRatio;  // Je größer die Höhe, desto weniger Vegetation und desto tiefer die Schneegrenze

  drawSnowyPeak(60,  110, -20, 140, 240, canvas->color565(60, 75, 65),  greenRatio * 0.7);
  drawSnowyPeak(200, 130, 150, 260, 240, canvas->color565(70, 85, 75),  greenRatio * 0.6);
  drawSnowyPeak(130, 70,  40,  220, 240, canvas->color565(45, 55, 50),  greenRatio);
}

// Einen Kreisbogen zeichnen (Basisfunktion für den Fortschrittsring)
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

// Höhen-Fortschrittsring am Bildschirmrand zeichnen, goldenen Bogen je nach Höhenverhältnis aufleuchten lassen
void drawProgressRing(float altitudeRatio) {
  int16_t cx = 120, cy = 120, radius = 115, thickness = 6;
  // Zuerst einen grauen Grundring zeichnen
  drawRingArc(cx, cy, radius, thickness, -90, 269, canvas->color565(50, 50, 60));
  // Dann den bereits zurückgelegten Fortschritt gold überlagern
  float endAngle = -90 + altitudeRatio * 359.0;
  drawRingArc(cx, cy, radius, thickness, -90, endAngle, canvas->color565(255, 200, 80));
}

// Text mit schwarzer Kontur zeichnen, damit weiße Schrift auf hellem Hintergrund lesbar bleibt
void drawTextWithHalo(int16_t x, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  canvas->setTextColor(haloColor);
  // Kontur: je 1 Pixel nach oben/unten/links/rechts versetzt
  canvas->setCursor(x - 1, y); canvas->print(text);
  canvas->setCursor(x + 1, y); canvas->print(text);
  canvas->setCursor(x, y - 1); canvas->print(text);
  canvas->setCursor(x, y + 1); canvas->print(text);

  canvas->setTextColor(textColor);
  canvas->setCursor(x, y);
  canvas->print(text);
}

// Text zentriert zeichnen, Versatz wird automatisch anhand der Textbreite berechnet
void drawCenteredText(int16_t centerX, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  int16_t x1, y1;
  uint16_t w, h;
  canvas->getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  drawTextWithHalo(centerX - w / 2, y, text, textSize, textColor, haloColor);
}

// Komplette Text-Overlay-Ebene zeichnen
void drawDataOverlay() {
  char buf[32];

  // Großer Wert in der Bildschirmmitte: aktuelle Höhe
  sprintf(buf, "%d", (int)round(data.displayedAltitude));
  drawCenteredText(120, 68, buf, 4, COLOR_WHITE, COLOR_BLACK);
  drawCenteredText(120, 104, "m", 2, COLOR_WHITE, COLOR_BLACK);

  // Links: oranges, nach oben zeigendes Dreieck + kumulierte Steigung
  int16_t ascX = 58, ascY = 138;
  canvas->fillTriangle(ascX, ascY - 8, ascX - 7, ascY + 5, ascX + 7, ascY + 5,
                       canvas->color565(255, 140, 60));
  sprintf(buf, "%dm", (int)round(data.displayedAscent));
  drawTextWithHalo(ascX + 13, ascY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // Rechts: blaues, nach unten zeigendes Dreieck + kumulierter Abstieg
  int16_t desX = 150, desY = 138;
  canvas->fillTriangle(desX, desY + 8, desX - 7, desY - 5, desX + 7, desY - 5,
                       canvas->color565(120, 180, 255));
  sprintf(buf, "%dm", (int)round(data.displayedDescent));
  drawTextWithHalo(desX + 13, desY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // Kleine Schrift unten: aktueller Luftdruck
  sprintf(buf, "Press: %.1f hPa", data.displayedPressure);
  drawCenteredText(120, 162, buf, 1, COLOR_WHITE, COLOR_BLACK);
}

// Haupt-Render-Funktion: der Reihe nach Hintergrund → Berge → Fortschrittsring → Zahlen zeichnen,
// zum Schluss flush, um auf das Display zu pushen
void renderUI() {
  float altitudeRatio = constrain(data.displayedAltitude / ALT_RANGE_MAX, 0.0f, 1.0f);

  drawSkyBackground(altitudeRatio);
  drawMountains(altitudeRatio);
  drawProgressRing(altitudeRatio);
  drawDataOverlay();

  canvas->flush();  // Canvas-Speicherpuffer in einem Rutsch auf das physische Display pushen
}

// Blink-Animation bei erfolgreicher Kalibrierung
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
  Serial.println("\n--- [System] Höhenmesser startet ---");

  // Hintergrundbeleuchtung auf HIGH – ohne diesen Schritt bleibt das Display für immer schwarz
  Serial.println("[TFT] Konfiguriere Pin der Hintergrundbeleuchtung...");
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  pinMode(BTN_PIN, INPUT_PULLUP);  // BOOT-Taste mit internem Pullup

  // Display-Treiber initialisieren
  Serial.println("[TFT] Initialisiere Canvas...");
  if (!canvas->begin()) {
    Serial.println("[ERROR] Initialisierung des Display-Treibers fehlgeschlagen! Bitte SPI-Pin-Konfiguration prüfen.");
  } else {
    Serial.println("[TFT] Display-Treiber erfolgreich initialisiert.");
  }

  COLOR_WHITE       = canvas->color565(255, 255, 255);
  COLOR_BLACK       = canvas->color565(0, 0, 0);
  COLOR_CREAM_GREEN = canvas->color565(205, 235, 195);  // Schnee auf dem Gipfel (hellgrün-weiß)

  canvas->fillScreen(COLOR_BLACK);
  canvas->flush();

  // Sensor initialisieren
  initSensor();

  // Erste Messung beim Start lesen, um alle Anzeigewerte zu initialisieren
  Serial.println("[Sensor] Lese erste Messung beim Start...");
  float rawAlt, rawPress;
  sampleSensor(rawAlt, rawPress);

  Serial.print("[Sensor] Messung beim Start → Luftdruck: ");
  Serial.print(rawPress);
  Serial.print(" hPa | Höhe: ");
  Serial.print(rawAlt);
  Serial.println(" m");

  data.currentAltitude   = rawAlt;
  data.maxAltitude       = rawAlt;
  data.displayedAltitude = rawAlt;
  data.currentPressure   = rawPress;
  data.displayedPressure = rawPress;

  // Filter-Puffer mit der Starthöhe vorbelegen, damit der Wert beim Start nicht
  // von 0 auf die tatsächliche Höhe springt
  for (int i = 0; i < FILTER_SIZE; i++) altBuffer[i] = rawAlt;
  filterCount = FILTER_SIZE;

  Serial.println("--- [System] Initialisierung abgeschlossen, Eintritt in die Hauptschleife ---");
}

// Timer für Sensor-Messung (alle 1 Sekunde)
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL = 1000;

// Timer für Display-Rendering (ca. 33 fps)
unsigned long lastRenderTime = 0;
const unsigned long RENDER_INTERVAL = 30;

void loop() {
  handleButton();

  unsigned long now = millis();

  // --- Aufgabe mit niedriger Frequenz: alle 1 Sekunde den Sensor abfragen ---
  if (now - lastSampleTime >= SAMPLE_INTERVAL) {
    lastSampleTime = now;

    float rawAltitude, rawPressure;
    sampleSensor(rawAltitude, rawPressure);

    float smoothed = smoothAltitude(rawAltitude);
    updateStats(smoothed);
    data.currentPressure = rawPressure;

    // Echtzeit-Log auf der seriellen Konsole – beim Debuggen prüfen, ob der Sensor funktioniert
    Serial.print("[Loop] Roh: ");   Serial.print(rawAltitude);
    Serial.print("m | gefiltert: "); Serial.print(data.currentAltitude);
    Serial.print("m | Druck: ");    Serial.print(data.currentPressure);
    Serial.print(" hPa | Steigung: "); Serial.println(data.totalAscent);
  }

  // --- Aufgabe mit hoher Frequenz: UI mit ca. 33 fps rendern ---
  if (now - lastRenderTime >= RENDER_INTERVAL) {
    lastRenderTime = now;

    // Exponentielle Glättung: Anzeigewerte weich an die tatsächlichen Werte annähern,
    // Faktor 0.12 steuert die Nachführgeschwindigkeit
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

## Code-Erklärung

Der Code ist in vier Module unterteilt, die sich logisch nicht in die Quere kommen:

**Modul 1: Sensor auslesen** — `initSensor()` initialisiert den I2C-Bus und prüft, ob der BMP180 erreichbar ist; schlägt das fehl, gerät der Code in eine Endlosschleife und gibt den Fehler aus, läuft also nicht weiter (hilft beim schnellen Eingrenzen). `sampleSensor()` liefert jeweils den Roh-Luftdruck (Pa → hPa) und die Höhe (bezogen auf den Standard-Luftdruck auf Meereshöhe von 101325 Pa).

**Modul 2: Datenverarbeitung** — `smoothAltitude()` glättet mit einem 5-Punkt-gleitenden Mittelwert das Sensorrauschen; `updateStats()` addiert Steigung/Abstieg mit einer 0,3-m-Totzone, damit kleine Schwankungen auf ebenem Untergrund die kumulierten Werte nicht künstlich aufblähen.

**Modul 3: Taste und Kalibrierung** — `handleButton()` erkennt, ob die BOOT-Taste länger als 2000 Millisekunden gedrückt bleibt, und löst `doCalibration()` aus, das Steigung/Abstieg zurücksetzt und mit der aktuellen Höhe als neuer Basis neu startet. Das Flag `calibrationTriggered` verhindert ein mehrfaches Auslösen während eines einzigen langen Drucks.

**Modul 4: UI-Rendering** — Mit `Arduino_Canvas`-Doppelbuffering wird jeder Frame erst im Speicher komplett aufgebaut (Hintergrund-Verlauf, Berge mit dynamischer Schneegrenze, Rand-Fortschrittsring, Zahlen), bevor `canvas->flush()` alles in einem Rutsch aufs Display schiebt – das Flackern beim zeilenweisen Aktualisieren wird damit vollständig beseitigt. Die Zahlen werden per exponentieller Glättung (Faktor 0,12) animiert, die Übergänge wirken natürlich und nicht abgehackt.

In `loop()` trennen zwei Timer „niederfrequente Abfrage (1× pro Sekunde)" und „hochfrequentes Rendering (ca. 33 fps)", sodass sie sich gegenseitig nicht blockieren – insgesamt läuft alles sehr flüssig.

---

## Häufige Probleme / Fehlerbehebung

Keine Panik – 90 % aller Probleme stecken in den folgenden Punkten:

**Problem 1: Display komplett schwarz, nicht einmal Hintergrundbeleuchtung**

Prüfe, ob GPIO 7 in `setup()` `digitalWrite(TFT_BL, HIGH)` ausführt. Die Hintergrundbeleuchtung geht nicht von selbst an – fehlt diese Zeile, bleibt das Display für immer schwarz. Stelle außerdem sicher, dass VCC an 3,3 V angeschlossen ist, nicht an 5 V – 5 V zerstört das Display.

**Problem 2: Hintergrundbeleuchtung da, aber alles weiß oder schwarz, kein Bild**

Öffne den Seriellen Monitor (Baudrate 115200) und schaue nach, ob `[ERROR]` auftaucht. Erscheint `Initialisierung des Display-Treibers fehlgeschlagen`, sind die SPI-Pins falsch belegt – gleiche anhand der Verkabelungstabelle die fünf Leitungen CS / DC / SCK / MOSI / RST einzeln ab.

**Problem 3: Auf der seriellen Konsole erscheint ständig `BMP180-Initialisierung fehlgeschlagen`, das Programm bleibt hängen und das Display leuchtet nicht**

Schlägt die BMP180-Initialisierung fehl, läuft der Code in eine Endlosschleife und das Display bleibt dunkel. In 99 % der Fälle liegt es an der I2C-Verkabelung: SDA an GPIO13, SCL an GPIO14, Versorgung über 3,3 V – und prüfe, ob die Pullup-Widerstände auf dem Modul verlötet sind (bei ordentlichen Fertigmodulen meist schon dabei).

**Problem 4: Anzeige funktioniert, aber die Höhenwerte weichen stark von der Realität ab**

Der BMP180 rechnet die Höhe auf Basis des Standard-Luftdrucks auf Meereshöhe (101325 Pa). Der tatsächliche lokale Luftdruck schwankt mit dem Wetter, eine Abweichung von ±30 m ist völlig normal. Kennst du deine exakte aktuelle Höhe, kannst du den Parameter von `bmp.readAltitude(101325)` durch den lokal gemessenen QNH-Luftdruck auf Meereshöhe ersetzen (Einheit Pa; aus einer Wetter-App: hPa × 100 = Pa).

**Problem 5: Die kumulierte Steigung steigt ständig, obwohl du dich nicht bewegst**

Das Sensorrauschen überschreitet die Totzone (0,3 m). Erhöhe in deinem Code den Wert von `DEAD_ZONE`, etwa auf `0.8f` oder `1.0f`; oder setze `FILTER_SIZE` von 5 auf 8, um die Glättung zu verstärken – beide Wege verringern das künstliche Aufblähen.

**Problem 6: Beim Aktualisieren des Bildes flackert es**

Mit dem Canvas-Doppelbuffering dürfte es im Normalfall nicht flackern. Falls doch: Prüfe, ob `canvas->flush()` am Ende von `renderUI()` aufgerufen wird und ob es woanders Code gibt, der direkt mit `gfx` arbeitet und damit den Canvas umgeht.

---

## FAQ

**F: Kann ich das GC9A01-Runddisplay gegen ein quadratisches Display eines anderen Modells tauschen?**
A: Ja. Die Arduino_GFX_Library unterstützt Dutzende von Display-Treiber-ICs (ST7789, ILI9341 usw.). Tausche in der Zeile `Arduino_GC9A01` den Klassennamen gegen den passenden Treiber aus, passe die Canvas-Größe von 240×240 auf die jeweilige Auflösung an – am UI-Code musst du fast nichts ändern.

**F: Kann ich den BMP180 durch einen BMP280 oder BME280 ersetzen?**
A: Ja, du musst dann aber eine andere Library nutzen. Für den BMP280 nimmst du `Adafruit_BMP280`, für den BME280 `Adafruit_BME280` – der Aufruf von `readAltitude()` unterscheidet sich leicht. Der BMP280 ist genauer und braucht im Standby etwa 2,74 µA; der BME280 kann zusätzlich die Luftfeuchtigkeit lesen, ist aber etwas teurer.

**F: Wie genau ist der BMP180, und ist es normal, dass der Wert in der Wohnung ständig springt?**
A: Im Standardmodus liegt die Genauigkeit bei ±1 m, im hochauflösenden Modus bei ±0,5 m. Dass die Werte in der Wohnung schwanken, ist völlig normal – ein offenes Fenster, eine geschlossene Tür oder die Klimaanlage erzeugen kleine Luftdruckschwankungen, die sich auf die Höhenablesung auswirken. Dieses Projekt dämpft diese Schwankungen mit einem 5-Punkt-gleitenden Mittelwert und einer 0,3-m-Totzone – im praktischen Einsatz ist das Ergebnis schon recht ordentlich.

**F: Können SPI (Display) und I2C (Sensor) am ESP32-S3 gleichzeitig genutzt werden?**
A: Gar kein Problem. SPI und I2C sind unabhängige Peripheriebusse. In diesem Projekt läuft der GC9A01 über SPI (GPIO11/12) und der BMP180 über I2C (GPIO13/14) – jeder auf seinem eigenen Bus, ohne sich zu stören. Der ESP32-S3 treibt beide Busse parallel problemlos.

**F: Was ist das `Arduino_Canvas` im Code – kann ich es weglassen und direkt mit `gfx` zeichnen?**
A: `Arduino_Canvas` ist ein doppelt gepufferter Canvas aus der Arduino_GFX_Library – alle Zeichenbefehle werden erst in einen virtuellen Canvas im Speicher geschrieben und beim Aufruf von `flush()` in einem Rutsch aufs Display gepusht, was das Flackern beim zeilenweisen Aktualisieren beseitigt. Lässt du ihn weg und arbeitest direkt mit `gfx`, funktioniert es zwar, aber beim Zeichnen eines bildfüllenden Verlaufshintergrunds flackert es deutlich – die Bedienbarkeit leidet erheblich. Davon ist abzuraten.

**F: Kann ich den ESP32-S3 mit einem Lithium-Akku betreiben und damit wandern gehen?**
A: Ja. Eine übliche Lösung: 3,7-V-Lithium-Akku + TP4056-Lade-/Entlademodul + ME6211-LDO auf 3,3 V. Mit dieser Projektkonfiguration zieht die Kombination aus ESP32-S3 + GC9A01 + BMP180 etwa 80–120 mA; ein 500-mAh-Akku reicht theoretisch 4–6 Stunden – genug für eine Tagestour. Brauchst du mehr Laufzeit, kannst du die Display-Hintergrundbeleuchtung dimmen (PWM-Dimming auf GPIO7) oder das Abfrageintervall des Sensors vergrößern.

---

## Weiterführende Ideen

Wenn du diese Version gebaut hast, geht es hier noch weiter:

- **SD-Karte für die Streckenaufzeichnung**: Alle 10 Sekunden Zeitstempel + Höhe + Luftdruck in eine CSV-Datei schreiben und zu Hause in eine GPS-Track-Software zur Analyse importieren
- **GPS-Modul zur fusionierten Positionsbestimmung**: Der BMP180 driftet mit dem Wetter; die GPS-Höhe ist mit ca. ±10 m zwar ungenauer, dafür stabiler – beide kombiniert ergänzen sich gut
- **Lagesensor MPU6050 als Schrittzähler**: Den Schrittrhythmus erkennen und die Schrittzahl schätzen – schon wird daraus ein vollwertiger Wander-Computer
- **Daten per BLE ans Smartphone**: Mit dem BLE des ESP32-S3 die Echtzeitdaten an eine Handy-App senden und auf einer Karte die komplette Strecke anzeigen

---

## Referenzen

- [BMP180 Offizielles Datenblatt (Bosch Sensortec)](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp180-ds000.pdf)
- [Datenblatt des GC9A01-Treiber-ICs (Galaxycore)](http://www.galaxycore.com/file/pdf/GC9A01A.pdf)
- [Arduino_GFX_Library auf GitHub](https://github.com/moononournation/Arduino_GFX)
- [Adafruit BMP085 Library auf GitHub](https://github.com/adafruit/Adafruit-BMP085-Library)
- [Offizielle Espressif ESP32-S3-Produktseite](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
