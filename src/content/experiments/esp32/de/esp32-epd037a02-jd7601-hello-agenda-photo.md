---
title: "ESP32-S3 steuert das sechsfarbige E-Paper EPD037A02 (JD7601): einmalige Demo mit drei Bildschirmen – Hello, englischer Stundenplan und vorkonvertiertes Foto (SPI + Arduino)"
boardId: esp32s3
moduleId: display/epd-3inch7-epd037a02-jd7601
category: esp32
date: 2026-11-20
intro: "Steuere das sechsfarbige E-Paper EPD037A02 mit ESP32-S3 und Adafruit GFX. Enthalten sind SPI-Verkabelung, Arduino-Konfiguration und der vollständige Code für eine einmalige Abfolge aus Hello, englischem Stundenplan und vorkonvertiertem Foto. Ideal für alle mit Erfahrung beim Hochladen von Arduino-Sketches, die Sechsfarb-E-Paper und Fotokonvertierung kennenlernen möchten."
image: "https://img.lingflux.com/2026/11/ff03861dd789ec83465baba962075e98.jpg"
---

Schwierigkeit: ⭐⭐ (Erfahrung beim Hochladen von Arduino-Sketches genügt)<br>
Zeitaufwand: Beim ersten Mal dauern Verkabelung, Bibliotheksinstallation und Upload etwa 30 Minuten (Schätzwert, nicht gestoppt). Die drei Bildschirme laufen in etwa 1–1,5 Minuten durch (15–25 Sekunden Vollaktualisierung pro Bildschirm plus zwei Wartezeiten von 3 Sekunden).<br>
Testumgebung: Arduino IDE 2.3.8; esp32 Arduino Core 3.3.10; Adafruit GFX Library 1.13.0

> **Kurzfassung**: Das sechsfarbige E-Paper EPD037A02 wird mit ESP32-S3, SPI und Adafruit GFX angesteuert und zeigt nacheinander Hello, einen englischen Stundenplan und ein Foto.

## Schnellstart

- Lade den gesamten Ordner `EPD_3in7_Showcase_JD7601` von [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601) herunter (er liegt im LingShunLAB-Repository unter `Handbook/Arduino/ESP32-S3/`; du kannst das Repository klonen oder vollständig als ZIP herunterladen). Die Hauptdatei `.ino`, die Treiberdateien `.h/.cpp` und `photo_data.h` müssen in diesem Ordner liegen. Der Ordnername muss mit dem Dateinamen der Hauptdatei `.ino` übereinstimmen.
- Verkabelung: BUSY, RST, DC, CS, MOSI und SCK jeweils mit GPIO7, 8, 9, 10, 11 und 12 verbinden; VDD mit 3.3 V und GND mit der gemeinsamen Masse des Boards.
- Installiere esp32 Arduino Core 3.3.10, Adafruit GFX Library 1.13.0 sowie die Abhängigkeit Adafruit BusIO 1.17.4.
- Wähle als Board `ESP32S3 Dev Module`, kompiliere und lade den Sketch hoch und öffne anschließend den seriellen Monitor mit 115200.
- `HOLD_MS` beträgt standardmäßig 3000 ms. Das ist die zusätzliche Wartezeit nach der Aktualisierung eines Bildschirms, nicht das Intervall zwischen den Bildschirmwechseln.

## Einleitung

Ich wollte mit dem ESP32-S3 eine E-Paper-Demokarte bauen: zuerst Hello anzeigen, danach einen englischen Stundenplan und schließlich auf einem Foto stehen bleiben.

Mein OSPTEK EPD037A02 ist ein SPI-Display mit 480×720 und sechs Farben. GxEPD2 enthält keinen Treiber für dieses Display, daher habe ich den Panel-Treiber selbst geschrieben. Er übernimmt nur das SPI-Timing und das Frameformat des JD7601. Text und Grafik erledigt Adafruit GFX. Dieser Artikel enthält Verkabelung, Bibliothekskonfiguration und den vollständigen Code für alle drei Bildschirme.

## Endergebnis

Das Programm spielt die Folge Hello → englischer Stundenplan → Foto genau einmal ab. Nach der Aktualisierung der ersten beiden Bildschirme wartet es jeweils 3000 ms. Zum Schluss bleibt das Foto stehen; `loop()` aktualisiert das Display nicht weiter.

![](https://img.lingflux.com/2026/11/dc08d160b6bc55bc5a237bcadf4abc9f.jpg)



## Bauteile
### Sechsfarbiges E-Paper EPD037A02

Das EPD037A02 ist ein 3.7-Zoll-E-Paper-Modul mit sechs Farben von OSPTEK. E-Paper nutzt Umgebungslicht zur Farbdarstellung und behält das Bild auch ohne Stromversorgung. In diesem Beispiel zeigt es Text, sechs Farbfelder, einen Stundenplan und ein bereits konvertiertes Foto.

Es kennt nur Schwarz, Weiß, Gelb, Rot, Blau und Grün, aber keine Graustufen. Zwischentöne eines Fotos müssen durch eine Mischung von Pixeln verschiedener Farben simuliert werden. Deshalb lässt sich eine JPG-Datei nicht direkt an das Display senden; sie muss zuerst in das Frameformat des Panels umgewandelt werden.

| Parameter | Spezifikation |
| --- | --- |
| Modell | EPD037A02 |
| Größe und Auflösung | 3.7 Zoll, 480×720 |
| Farben | Schwarz, Weiß, Gelb, Rot, Blau, Grün |
| Pixelformat | 4 Bit/Pixel, zwei Pixel pro Byte |
| Schnittstelle | 4-Draht-SPI, 1× 8-polige Stiftleiste mit 2.54 mm |
| Vollaktualisierung | Etwa 15–25 Sekunden |
| Versorgung | 3.3 V |

Dieses Display eignet sich für die Demo, weil sich damit Text, Grafik und Sechsfarb-Fotos auf einem Bildschirm testen lassen. Nachteilig ist die langsame Aktualisierung, die keine Animationen zulässt.

## Materialliste

| Material | Anzahl | Hinweis |
| --- | --- | --- |
| ESP32-S3-Entwicklungsboard | 1 | Im Beispiel wird `ESP32S3 Dev Module` ausgewählt |
| EPD037A02-Modul mit SPI-Adapterplatine | 1 | Sechsfarbiges E-Paper mit 480×720 |
| Dupont-Kabel, 2.54 mm | 8 Stück | 6 Signalleitungen, 1 Versorgung, 1 Masse |
| USB-Datenkabel | 1 | Versorgung, Upload und serielle Ausgabe |

### Pin-Beschreibung

| Display-Pin | Richtung | Funktion |
| --- | --- | --- |
| BUSY | Display → ESP32-S3 | High bedeutet bereit, Low bedeutet beschäftigt |
| CS | ESP32-S3 → Display | Chip Select, Low-aktiv, wird manuell vom Programm gesteuert |
| DC | ESP32-S3 → Display | Low sendet Befehle, High sendet Daten |
| RST | ESP32-S3 → Display | Reset, Low-aktiv |
| SDA / MOSI | ESP32-S3 → Display | SPI-Daten |
| CLK / SCK | ESP32-S3 → Display | SPI-Takt |
| VDD | Versorgung | Ausschließlich 3.3 V |
| GND | Versorgung | Gemeinsame Masse mit dem Board |

Dieses Display empfängt nur Daten und sendet keine zurück; MISO muss daher nicht angeschlossen werden. BS0 auf der Adapterplatine liegt über einen 10-kΩ-Widerstand an Masse und stellt fest den 4-Draht-SPI-Modus ein. Dieser Modus benötigt DC zur Unterscheidung von Befehlen und Daten, weshalb dieser Pin nicht weggelassen werden darf.

## Verkabelung

Trenne zuerst die Stromversorgung des Boards und nimm dann die Verbindungen gemäß Tabelle vor.

| Display-Pin | ESP32-S3 | Zweck |
| --- | --- | --- |
| BUSY | GPIO7 | Bereitschafts-/Beschäftigtstatus des Panels lesen |
| CS | GPIO10 | Manuelles Chip Select |
| DC | GPIO9 | Befehle und Daten unterscheiden |
| RST | GPIO8 | Panel-Reset |
| SDA / MOSI | GPIO11 | SPI-Daten |
| CLK / SCK | GPIO12 | SPI-Takt |
| VDD | 3.3 V | Modulversorgung |
| GND | GND | Gemeinsame Masse |

**VDD darf nur mit 3.3 V und niemals mit 5 V verbunden werden.** Prüfe nach der Verkabelung jede Leitung, insbesondere ob SDA und CLK vertauscht sind.

Nach dem Anschließen:

1. Verbinde das Board per USB und wähle in der Arduino IDE `ESP32S3 Dev Module` sowie den passenden Port.
2. Öffne das vollständige Beispiel, kompiliere es und lade es hoch.
3. Öffne den seriellen Monitor mit 115200 Baud. Falls die ersten Logmeldungen fehlen, drücke RESET am Board, um das Programm neu zu starten. Es läuft nur einmal ab; wer den Monitor zu spät öffnet, verpasst die vorherigen Ausgaben.
4. Die serielle Schnittstelle sollte nacheinander Folgendes ausgeben: Informationen zum Framebuffer, Abschluss der Panel-Initialisierung, zwei Meldungen „Aktualisierung abgeschlossen“ (der Foto-Bildschirm gibt keine Aktualisierungsdauer aus) und schließlich `Done. Last picture stays on screen.`. Gleichzeitig zeigt das Display die drei Bildschirme in der richtigen Reihenfolge. Nur wenn beides stimmt, funktioniert das Beispiel.

## Benötigte Bibliotheken

Suche im „Boardverwalter“ der Arduino IDE nach `esp32` und installiere esp32 Arduino Core von Espressif Systems; in diesem Artikel wird Version 3.3.10 verwendet.

Suche danach im „Bibliotheksverwalter“ nach den folgenden Bibliotheken und installiere sie. Wenn bei der Installation von Adafruit GFX Abhängigkeiten angeboten werden, installiere alle, damit Adafruit BusIO ebenfalls eingerichtet wird.

| Bibliothek | Getestete Version | Quelle |
| --- | --- | --- |
| Adafruit GFX Library | 1.13.0 | [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library) |
| Adafruit BusIO | 1.17.4 | [Adafruit_BusIO](https://github.com/adafruit/Adafruit_BusIO) |
| SPI | Mit esp32 Core 3.3.10 | In [arduino-esp32](https://github.com/espressif/arduino-esp32) enthalten, keine separate Installation nötig |
| EPD037A02_GFX | Keine Version angegeben | Im Projekt enthalten, im selben Verzeichnis wie die Hauptdatei `.ino`; nicht ins Bibliotheksverzeichnis kopieren |

Adafruit GFX zeichnet Text und Grafik. `EPD037A02_GFX` übernimmt Panel-Initialisierung, SPI-Übertragung, Sechsfarb-Kodierung und Aktualisierung. Die Befehle unterscheiden sich je nach Panel-Modell; diese Ebene lässt sich daher nicht einfach durch die Bibliothek eines anderen E-Papers ersetzen.

## Vollständiger Code

Der Quellcode des Beispiels liegt auf [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601). Ordner und Hauptprogramm heißen beide `EPD_3in7_Showcase_JD7601`; diese Namen müssen übereinstimmen, damit die Arduino IDE das Beispiel öffnen kann. Die wichtigsten Dateien:

```text
EPD_3in7_Showcase_JD7601/
├── EPD_3in7_Showcase_JD7601.ino
├── EPD037A02_GFX.h
├── EPD037A02_GFX.cpp
├── photo_data.h
└── tool/
    ├── epd_photo.py                  # Skript zur Fotokonvertierung
    └── 02-driver-dog-car-480x720.png # Originalbild des Beispielfotos
```

Der Code der ersten drei Dateien folgt unten. `photo_data.h` umfasst mehr als zehntausend Zeilen und wird hier nicht abgedruckt. Lade die Datei aus dem Repository herunter; ohne sie lässt sich das Programm nicht kompilieren.

Sie enthält ein 172800 Byte großes Array `photo_driver`, das aus `tool/02-driver-dog-car-480x720.png` erzeugt wurde. Gespeichert ist der konvertierte Panel-Frame, nicht der Inhalt der PNG-Datei.

Der folgende Code entspricht logisch dem Quellcode im Repository; nur einige Kommentare wurden angepasst. Maßgeblich ist das Repository.

### Hauptprogramm EPD_3in7_Showcase_JD7601.ino

```cpp
/*
 * EPD_3in7_Showcase — Hello + englischer Stundenplan + ein Foto
 * Display: OSPTEK 3.7" E6, 480×720, JD7601
 * Controller: ESP32-S3
 *
 * Einsteiger müssen nur diese Datei ändern. Die Schriften stammen aus Adafruit GFX;
 * eine eigene Zeichenbibliothek ist nicht nötig.
 * Installation: Im Bibliotheksverwalter der Arduino IDE nach Adafruit GFX Library suchen.
 * Öffnen: Den ganzen Showcase-Ordner herunterladen und diese .ino öffnen;
 * nicht nur die Hauptdatei kopieren.
 */

#include "EPD037A02_GFX.h"
#include "photo_data.h"

// Pin-Reihenfolge: CS, DC, RST, BUSY, SCK, MOSI; Versorgung ausschließlich mit 3.3V.
EPD037A02_GFX epd(10, 9, 8, 7, 12, 11);
#define HOLD_MS 3000

// Die y-Koordinate der eingebauten 5×7-Schrift liegt am oberen Textrand;
// ein Zeichen belegt 6×8 Pixel.
void text(const char *s, int x, int y, uint8_t size, uint8_t color) {
  epd.setFont();                 // GFX-Schrift verwenden, kein zusätzliches setFont(Zeichensatz)
  epd.setTextSize(size);
  epd.setTextColor(color);
  epd.setCursor(x, y);
  epd.print(s);
}

void textCenter(const char *s, int y, uint8_t size, uint8_t color) {
  int w = strlen(s) * 6 * size;
  text(s, (480 - w) / 2, y, size, color);
}

void drawHello() {
  epd.fillScreen(EPD_WHITE);
  epd.drawRect(0, 0, 480, 720, EPD_BLACK);
  textCenter("HELLO", 65, 9, EPD_BLACK);
  textCenter("WORLD", 150, 9, EPD_RED);
  epd.fillRect(40, 245, 400, 4, EPD_BLACK);

  // Die sechs Farbfelder prüfen zugleich Farbzuordnung und Bildausrichtung.
  const uint8_t colors[6] = {
    EPD_BLACK, EPD_WHITE, EPD_YELLOW, EPD_RED, EPD_BLUE, EPD_GREEN
  };
  const char *labels[6] = { "K", "W", "Y", "R", "B", "G" };
  for (int i = 0; i < 6; i++) {
    int x = 16 + i * 76;
    epd.fillRect(x, 295, 68, 110, colors[i]);
    epd.drawRect(x, 295, 68, 110, EPD_BLACK);
    text(labels[i], x + 22, 430, 4, EPD_BLACK);
  }
  textCenter("3.7INCH 480X720", 525, 4, EPD_BLACK);
  textCenter("E6 6-COLOR EPD", 570, 4, EPD_BLACK);
  textCenter("ESP32-S3 OK", 640, 4, EPD_BLUE);
}

// Für einen anderen Stundenplan nur diese Zeilen ändern.
const char *subjects[6] = {
  "MATH", "CHINESE", "ENGLISH", "PHYSICS", "CHEMISTRY", "STUDY HALL"
};
const char *rooms[6] = {
  "ROOM 302", "ROOM 302", "AUDIO LAB", "PHYS LAB", "CHEM LAB", "ROOM 302"
};
const char *times[6] = { "08:00", "08:55", "NOW", "11:05", "14:00", "14:55" };
const uint8_t bars[6] = {
  EPD_BLUE, EPD_RED, EPD_RED, EPD_BLACK, EPD_YELLOW, EPD_WHITE
};

void drawAgenda() {
  epd.fillScreen(EPD_WHITE);
  epd.fillRect(0, 0, 480, 100, EPD_BLACK);
  text("MON - NOV 9", 24, 20, 4, EPD_WHITE);
  text("WEEK 12 - 6 CLASSES", 24, 65, 2, EPD_YELLOW);

  for (int i = 0; i < 6; i++) {
    int y = 115 + i * 92;
    bool now = (i == 2);
    epd.fillRoundRect(18, y, 444, 80, 5, now ? EPD_RED : EPD_WHITE);
    if (!now) epd.drawRoundRect(18, y, 444, 80, 5, EPD_BLACK);
    if (bars[i] != EPD_WHITE) epd.fillRect(20, y + 2, 9, 76, bars[i]);

    uint8_t fg = now ? EPD_WHITE : EPD_BLACK;
    text(subjects[i], 45, y + 12, 3, fg);
    text(rooms[i], 45, y + 47, 2, fg);
    text(times[i], 365, y + 25, 2, fg);
  }
  text("NEXT 11:05 PHYSICS", 20, 688, 2, EPD_BLACK);
}

bool showScreen(uint8_t index) {
  switch (index) {
    case 0: drawHello();  return epd.display();
    case 1: drawAgenda(); return epd.display();
    case 2: return epd.displayRawFrame(photo_driver, PHOTO_DRIVER_BYTES);
    default: return false;
  }
}

void setup() {
  // Schritt 1: Serielle Schnittstelle öffnen, um später die Fehlerstelle zu erkennen.
  Serial.begin(115200);
  delay(500);
  Serial.println("Showcase: Hello -> English agenda -> portrait");

  // Schritt 2: Framebuffer reservieren, SPI initialisieren, Panel zurücksetzen und initialisieren.
  if (!epd.begin()) {
    Serial.println("Init failed: check 3V3, GND, wiring and BUSY.");
    return;
  }

  // Schritt 3: Jeden der drei Bildschirme einmal anzeigen. Bei einem Fehler anhalten.
  for (uint8_t i = 0; i < 3; i++) {
    if (!showScreen(i)) {
      Serial.println("Refresh failed; stopped. Check wiring and BUSY.");
      return;
    }
    if (i < 2) delay(HOLD_MS);   // Wartezeit nach der Aktualisierung, kein Wechselzyklus
  }
  Serial.println("Done. Last picture stays on screen.");
}

void loop() {
  // Nur einmal abspielen. Stundenplan oben in subjects / rooms / times ändern.
}

// Schritt 4: Foto-Frames mit falscher Größe oder Länge bereits beim Kompilieren abweisen.
static_assert(PHOTO_DRIVER_W == 480 && PHOTO_DRIVER_H == 720,
              "Photo must be 480x720");
static_assert(PHOTO_DRIVER_BYTES == EPD037A02_BUF_BYTES,
              "Photo must be 172800 bytes");
```

### Panel-Treiberschnittstelle EPD037A02_GFX.h

```cpp
/*
 * EPD037A02_GFX — Panel-Treiberklasse für Adafruit_GFX
 * OSPTEK 3.7" E6 E-Paper, 480×720, sechs Farben (JD7601 / IST7601 / IST7163)
 *
 * Die Panel-Ebene wird hier selbst implementiert; die Grafikebene erbt
 * direkt von Adafruit_GFX.
 * Dadurch stehen drawLine, fillCircle, setFont und print sofort zur Verfügung.
 *
 * MIT / CC BY 4.0, wie die übrigen Materialien im Repository.
 */

#ifndef EPD037A02_GFX_H
#define EPD037A02_GFX_H

#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>

/* ------------------------------ Panel-Konstanten ------------------------------ */

#define EPD037A02_WIDTH    480
#define EPD037A02_HEIGHT   720
#define EPD037A02_BUF_BYTES ((size_t)EPD037A02_WIDTH * EPD037A02_HEIGHT / 2) /* 172800 */

// Ein Byte enthält zwei benachbarte Pixel derselben Spalte.
// Falls das Bild in Tests um 1–2 px versetzt ist, diesen Wert auf 1 ändern.
#ifndef EPD037A02_SWAP_NIBBLE
#define EPD037A02_SWAP_NIBBLE 0
#endif

// 4-Bit-Farbwerte des JD7601. 0x4 ist ungültig;
// nicht als fortlaufende Nummerierung von 0 bis 5 verwenden.
enum EPDColor : uint8_t {
  EPD_BLACK  = 0x0,
  EPD_WHITE  = 0x1,
  EPD_YELLOW = 0x2,
  EPD_RED    = 0x3,
  EPD_BLUE   = 0x5,
  EPD_GREEN  = 0x6,
};

/* -------------------------------- Treiberklasse -------------------------------- */
/*
 * Verwendung:
 *   EPD037A02_GFX display(10, 9, 8, 7);    // cs, dc, rst, busy
 *   display.begin();                       // Framebuffer + Reset + INIT
 *   display.setRotation(0);                // 0/2 = 480×720, 1/3 = 720×480
 *   display.fillScreen(EPD_WHITE);
 *   display.setFont(&FreeSansBold24pt7b);
 *   display.setCursor(20, 120);  display.print("Hello");
 *   display.display();                     // Senden + Vollaktualisierung (15–25 s)
 *
 * Farben sind 4-Bit-Indizes, nur sechs Farben, kein RGB565.
 * Auch 16-Bit-Farbwerte kompilieren, aber nur die unteren 4 Bit werden ausgewertet;
 * das Ergebnis ist dann nicht sinnvoll.
 */
class EPD037A02_GFX : public Adafruit_GFX {
 public:
  EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                int8_t sck = -1, int8_t mosi = -1, SPIClass *spi = &SPI);
  ~EPD037A02_GFX();

  // Framebuffer reservieren, GPIO/SPI initialisieren, Panel zurücksetzen und initialisieren.
  // Bei Speichermangel oder fehlender BUSY-Antwort Rückgabe false; das Display bleibt unverändert.
  bool begin(uint32_t spi_hz = 2000000);

  // Framebuffer an das Display senden und vollständig aktualisieren.
  // Blockiert 15–25 s; bei BUSY-Timeout Rückgabe false.
  bool display();

  // Einen bereits gepackten nativen 480×720-Frame direkt senden,
  // ohne einen zweiten Framebuffer für das Foto zu reservieren.
  bool displayRawFrame(const uint8_t *frame, size_t bytes);

  // Tiefschlaf des Panels. Zum Aufwecken erneut mit Strom versorgen
  // oder RST betätigen und begin() erneut aufrufen.
  bool sleep();

  // Nur den Framebuffer löschen, ohne sofort zu aktualisieren.
  // Bei Geisterbildern kann clear() gefolgt von display() einen weißen Bildschirm erzeugen.
  void clear(uint16_t color = EPD_WHITE);

  // drawPixel ist die von Adafruit_GFX geforderte rein virtuelle Funktion;
  // fillScreen wird mit memset überschrieben und ist dadurch schneller.
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void fillScreen(uint16_t color) override;

  // RGB auf die nächstgelegene der sechs Farben quantisieren; für einfache Bilder nützlich.
  static uint8_t fromRGB(uint8_t r, uint8_t g, uint8_t b);

  uint8_t *buffer() const { return _buf; }
  bool ready() const { return _buf != nullptr; }
  uint32_t lastRefreshMs() const { return _lastRefreshMs; }
  void setVerbose(bool v) { _verbose = v; }

 private:
  int8_t _cs, _dc, _rst, _busy, _sck, _mosi;
  SPIClass *_spi;
  uint32_t _spiHz;
  uint8_t *_buf;
  uint32_t _lastRefreshMs;
  bool _verbose;

  void _alloc();
  void _spiSend(const uint8_t *buf, size_t len);
  void _cmd(uint8_t c);
  void _data(uint8_t d);
  void _dataBuf(const uint8_t *buf, size_t len);
  bool _waitBusy(const char *what, uint32_t timeout_ms = 60000);
  bool _reset();
  bool _initPanel();
};

#endif /* EPD037A02_GFX_H */
```

### Panel-Treiberimplementierung EPD037A02_GFX.cpp

```cpp
/*
 * EPD037A02_GFX.cpp — Panel-Ebene: SPI, Timing, Frameformat
 * Diese Ebene erledigt nur drei Dinge: Bytes senden, auf BUSY warten
 * und (x,y) in einen Framebuffer-Index umrechnen.
 * Grafik, Schriften und Drehung übernimmt Adafruit_GFX.
 */

#include "EPD037A02_GFX.h"

#include <string.h>
#include <pgmspace.h>

#if defined(ESP32)
#include <esp32-hal-psram.h>
#endif

namespace {
// Zwei Pixel pro Byte: Eine vertikale Spalte mit 720 Pixeln belegt 360 Byte.
const size_t kColBytes  = EPD037A02_HEIGHT / 2;
const size_t kChunk     = 2048;    // Limit pro SPI-Übertragung, wie im Herstellerbeispiel
const uint32_t kBusyTmo = 60000;   // Vollaktualisierung maximal 25 s, hier mit Reserve
}  // namespace

EPD037A02_GFX::EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                             int8_t sck, int8_t mosi, SPIClass *spi)
    : Adafruit_GFX(EPD037A02_WIDTH, EPD037A02_HEIGHT),
      _cs(cs), _dc(dc), _rst(rst), _busy(busy), _sck(sck), _mosi(mosi),
      _spi(spi), _spiHz(2000000), _buf(nullptr), _lastRefreshMs(0),
      _verbose(true) {}

EPD037A02_GFX::~EPD037A02_GFX() {
  if (_buf) {
    free(_buf);   // Auch mit ps_malloc reservierter Speicher wird mit free() freigegeben
    _buf = nullptr;
  }
}

/* ============================ Speicher / Initialisierung ============================ */

void EPD037A02_GFX::_alloc() {
  if (_buf) return;
#if defined(ESP32)
  if (psramFound()) _buf = (uint8_t *)ps_malloc(EPD037A02_BUF_BYTES);
#endif
  if (!_buf) _buf = (uint8_t *)malloc(EPD037A02_BUF_BYTES);
}

bool EPD037A02_GFX::begin(uint32_t spi_hz) {
  // Schritt 1: 172800 Byte Framebuffer reservieren und zunächst weiß füllen.
  _spiHz = spi_hz;
  _alloc();
  if (!_buf) {
    if (_verbose) {
      Serial.printf("[EPD] Framebuffer-Reservierung fehlgeschlagen, %u Byte erforderlich\n",
                    (unsigned)EPD037A02_BUF_BYTES);
    }
    return false;
  }

  // malloc setzt den Speicher nicht auf null; weiß füllen,
  // damit kein nicht initialisierter Speicher auf dem Display landet.
  clear(EPD_WHITE);

  // Schritt 2: Pins konfigurieren. CS manuell steuern, MISO nicht anschließen.
  pinMode(_cs, OUTPUT);   digitalWrite(_cs, HIGH);
  pinMode(_dc, OUTPUT);   digitalWrite(_dc, HIGH);
  pinMode(_rst, OUTPUT);  digitalWrite(_rst, HIGH);
  pinMode(_busy, INPUT);

  // Parameterreihenfolge: SCK, MISO, MOSI, SS. -1 für SS übergeben;
  // CS nicht der Peripherie überlassen.
  _spi->begin(_sck, -1, _mosi, -1);

  if (_verbose) {
    Serial.printf("[EPD] Framebuffer %u B, SPI %lu Hz\n",
                  (unsigned)EPD037A02_BUF_BYTES, (unsigned long)_spiHz);
  }

  // Schritt 3: Panel zurücksetzen und Initialisierungsbefehle senden.
  return _initPanel();
}

bool EPD037A02_GFX::_initPanel() {
  if (!_reset()) return false;

  _cmd(0xE9); _data(0x01);   // Hersteller-INIT: Initialisierungsbefehl des JD7601

  if (_verbose) Serial.println("[EPD] Panel-Initialisierung abgeschlossen");
  return true;
}

/* ================================ Low-Level-SPI ================================ */

void EPD037A02_GFX::_spiSend(const uint8_t *buf, size_t len) {
  digitalWrite(_cs, LOW);
  _spi->beginTransaction(SPISettings(_spiHz, MSBFIRST, SPI_MODE0));
  _spi->writeBytes(buf, len);
  _spi->endTransaction();
  digitalWrite(_cs, HIGH);
}

void EPD037A02_GFX::_cmd(uint8_t c) {
  digitalWrite(_dc, LOW);    // DC=L: Befehl
  _spiSend(&c, 1);
}

void EPD037A02_GFX::_data(uint8_t d) {
  digitalWrite(_dc, HIGH);   // DC=H: Daten
  _spiSend(&d, 1);
}

void EPD037A02_GFX::_dataBuf(const uint8_t *buf, size_t len) {
  digitalWrite(_dc, HIGH);
  while (len) {
    size_t n = (len > kChunk) ? kChunk : len;
    _spiSend(buf, n);
    buf += n;
    len -= n;
  }
}

// BUSY High = bereit, Low = beschäftigt. Der Fließtext in Note 6-4 des Datenblatts
// beschreibt es umgekehrt; maßgeblich sind die Pin-Tabelle und die Praxis.
bool EPD037A02_GFX::_waitBusy(const char *what, uint32_t timeout_ms) {
  uint32_t t0 = millis();
  while (digitalRead(_busy) == LOW) {
    if (millis() - t0 > timeout_ms) {
      if (_verbose) Serial.printf("[EPD] BUSY-Timeout: %s\n", what);
      return false;
    }
    delay(2);
  }
  return true;
}

// RESET-Ablauf des Herstellers: Low 20 → High 10 → Low 20 → High 10 ms,
// danach auf BUSY warten.
bool EPD037A02_GFX::_reset() {
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);

  if (digitalRead(_busy) == LOW) {
    if (_verbose) Serial.println("[EPD] Warte auf High an BUSY (max. 10 s); bei Timeout 3V3 / GND / Flachbandkabel prüfen");
    if (!_waitBusy("reset", 10000)) return false;
  }
  delay(10);
  return true;
}

/* ============================ Ablauf der Bildaktualisierung ============================ */

bool EPD037A02_GFX::display() {
  if (!_buf) return false;
  uint32_t t0 = millis();

  _cmd(0x10);                             // DTM: RAM-Schreiben vorbereiten
  if (!_waitBusy("DTM")) return false;
  _dataBuf(_buf, EPD037A02_BUF_BYTES);

  _cmd(0x04);                             // PON: Hochspannung einschalten
  if (!_waitBusy("PON")) return false;
  delay(10);

  _cmd(0x12); _data(0x00);                // DRF: Aktualisierung starten
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;

  _cmd(0x02); _data(0x00);                // POF: Hochspannung ausschalten
  if (!_waitBusy("POF")) return false;
  delay(20);

  _lastRefreshMs = millis() - t0;
  if (_verbose) Serial.printf("[EPD] Aktualisierung abgeschlossen %lu ms\n", (unsigned long)_lastRefreshMs);
  return true;
}

bool EPD037A02_GFX::displayRawFrame(const uint8_t *frame, size_t bytes) {
  if (!frame || bytes != EPD037A02_BUF_BYTES) return false;

  _cmd(0x10);
  if (!_waitBusy("DTM")) return false;

  // Jeweils 2048 Byte von Flash nach RAM kopieren und dann über SPI senden;
  // DMA liest nicht direkt aus Flash.
  uint8_t chunk[kChunk];
  digitalWrite(_dc, HIGH);
  for (size_t off = 0; off < bytes; off += sizeof(chunk)) {
    size_t n = bytes - off;
    if (n > sizeof(chunk)) n = sizeof(chunk);
    memcpy_P(chunk, frame + off, n);
    _spiSend(chunk, n);
  }

  _cmd(0x04);
  if (!_waitBusy("PON")) return false;
  delay(10);
  _cmd(0x12); _data(0x00);
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;
  _cmd(0x02); _data(0x00);
  if (!_waitBusy("POF")) return false;
  delay(20);
  return true;
}

bool EPD037A02_GFX::sleep() {
  _cmd(0x07); _data(0xA5);
  if (_verbose) Serial.println("[EPD] Tiefschlaf aktiviert");
  return true;
}

/* ==================================== Zeichnen ==================================== */

void EPD037A02_GFX::clear(uint16_t color) {
  if (!_buf) return;
  uint8_t c = (uint8_t)(color & 0x0F);
  memset(_buf, (int)((c << 4) | c), EPD037A02_BUF_BYTES);
}

void EPD037A02_GFX::fillScreen(uint16_t color) { clear(color); }

void EPD037A02_GFX::drawPixel(int16_t x, int16_t y, uint16_t color) {
  if (!_buf) return;
  if (x < 0 || y < 0 || x >= _width || y >= _height) return;

  // Zuerst die von rotation beeinflussten logischen Koordinaten
  // in die natürlichen Panel-Koordinaten umrechnen.
  int16_t dx, dy;
  switch (rotation & 3) {
    case 0:  dx = x;                 dy = y;                 break;
    case 1:  dx = WIDTH - 1 - y;     dy = x;                 break;
    case 2:  dx = WIDTH - 1 - x;     dy = HEIGHT - 1 - y;    break;
    default: dx = y;                 dy = HEIGHT - 1 - x;    break;
  }

  // Das Panel speichert Daten in vertikalen Spalten und durchläuft jede Spalte
  // von unten nach oben; deshalb ist zusätzlich eine Y-Spiegelung nötig.
  // Bei zeilenweiser horizontaler Ausgabe dreht sich das Bild um 90°
  // und wiederholt sich versetzt.
  const int16_t fy = HEIGHT - 1 - dy;
  size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);

#if EPD037A02_SWAP_NIBBLE
  const bool lowNibble = ((fy & 1) == 0);
#else
  const bool lowNibble = ((fy & 1) != 0);
#endif

  // Das Byte in zwei Nibbles aufteilen und nur das Nibble des Zielpixels ändern.
  const uint8_t c = (uint8_t)(color & 0x0F);
  if (lowNibble) _buf[i] = (uint8_t)((_buf[i] & 0xF0) | c);
  else           _buf[i] = (uint8_t)((_buf[i] & 0x0F) | (c << 4));
}

/* ======================== RGB-Quantisierung auf sechs Farben ======================== */

struct EPDRgbRef { uint8_t r, g, b, code; };

// Die Referenzfarben entsprechen der typischen Darstellung von Spectra 6 / E6;
// etwas dunklere Werte kommen der Wahrnehmung näher.
static const EPDRgbRef kRefs[6] = {
    {  0,   0,   0, EPD_BLACK  },
    {255, 255, 255, EPD_WHITE  },
    {255, 232,   0, EPD_YELLOW },
    {190,  30,  45, EPD_RED    },
    { 35,  70, 150, EPD_BLUE   },
    { 40, 110,  60, EPD_GREEN  },
};

uint8_t EPD037A02_GFX::fromRGB(uint8_t r, uint8_t g, uint8_t b) {
  // Gewichteter euklidischer Abstand, Grün erhält ein höheres Gewicht.
  int32_t best = INT32_MAX;
  uint8_t code = EPD_BLACK;
  for (int k = 0; k < 6; k++) {
    int32_t dr = (int32_t)r - kRefs[k].r;
    int32_t dg = (int32_t)g - kRefs[k].g;
    int32_t db = (int32_t)b - kRefs[k].b;
    int32_t d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < best) { best = d; code = kRefs[k].code; }
  }
  return code;
}
```

### Erläuterung des Codes

**Wie Pixel gespeichert werden.** `drawPixel()` ist die fehleranfälligste Stelle. Das Display hat 480×720 Pixel mit jeweils 4 Bit; ein Frame belegt daher 480×720÷2 = 172800 Byte.

Anders als übliche Displays wird es nicht zeilenweise beschrieben, sondern empfängt Daten in vertikalen Spalten: insgesamt 480 Spalten mit jeweils 360 Byte, jede Spalte von unten nach oben. Deshalb spiegelt der Code zunächst Y mit `fy = HEIGHT-1-dy` und berechnet dann die Byteposition mit `i = dx*360 + (fy>>1)`.

**Farbkodierung.** Die Kodierung der sechs Farben ist nicht fortlaufend: Schwarz, Weiß, Gelb und Rot sind `0x0～0x3`, Blau und Grün sind `0x5` und `0x6`; `0x4` ist ungültig. Verwende beim Zeichnen Aufzählungswerte wie `EPD_BLACK` statt eigener Nummern.

**Aktualisierung der drei Bildschirme.** Die `for`-Schleife in `setup()` läuft dreimal. Die ersten beiden Bildschirme werden zunächst im Framebuffer gezeichnet und anschließend mit `display()` gesendet und aktualisiert. Der dritte Bildschirm ruft `displayRawFrame()` auf, kopiert die Daten aus `photo_data.h` in 2048-Byte-Blöcken von Flash nach RAM und sendet sie über SPI.

**Speicher.** Der Foto-Bildschirm benötigt keinen Framebuffer, die ersten beiden jedoch schon. Das Programm benötigt daher durchgehend 172800 Byte für den Framebuffer. Falls PSRAM vorhanden ist, wird dieser bevorzugt; andernfalls oder bei fehlgeschlagener Reservierung kommt internes RAM zum Einsatz.

**Wartezeit.** Jede Bildschirmaktualisierung dauert 15–25 Sekunden; `HOLD_MS` ist nur die zusätzliche Wartezeit danach. Das tatsächliche Intervall zwischen den ersten beiden Bildschirmen beträgt somit Aktualisierungszeit plus 3 Sekunden. Das Programm läuft nicht in einer Schleife; zum erneuten Abspielen drückst du RESET am Board.

**Stundenplan ändern.** Bearbeite die Arrays `subjects`, `rooms` und `times`; ihre sechs Zeilen gehören jeweils zusammen. `bars` legt die Farbe des Balkens links neben jeder Zeile fest. Die hervorgehobene „aktuelle Unterrichtsstunde“ ist immer die dritte Zeile (`i == 2`). Das Datum im Titel, `WEEK 12` und `NEXT 11:05 PHYSICS` am unteren Rand sind feste Texte. Das Beispiel liest keine Uhr und aktualisiert sich nicht automatisch.

### Wie ein Foto in Panel-Daten umgewandelt wird

Das Foto wird nicht auf dem Board verarbeitet. Der Computer wandelt es zuerst in ein sechsfarbiges Punktraster um; der ESP32-S3 sendet lediglich die fertigen Daten an das Display.

```text
JPG/PNG → mittig zuschneiden und auf 480×720 skalieren
→ Belichtung, Kontrast und Sättigung anpassen → Sechsfarb-Dithering → in Panel-Farbwerte umsetzen
→ vertikale Spalten anordnen, Y spiegeln, zwei Pixel pro Byte zusammenfassen
→ 172800-Byte-Array (photo_data.h) → in Flash kompilieren
→ ESP32-S3 sendet die Daten über SPI an das Display
```

Beim Dithering werden Pixel unterschiedlicher Farben abwechselnd angeordnet, damit das Auge das Punktraster als Übergangston wahrnimmt. Dadurch entstehen keine zusätzlichen Farben: Jedes Pixel bleibt nach der Konvertierung Schwarz, Weiß, Gelb, Rot, Blau oder Grün. Das Skript berechnet Farbabstände anhand des tatsächlichen, etwas dunkleren Erscheinungsbilds des E-Papers, gibt aber Panel-Farbwerte aus.

Pixelanordnung und Farbkodierung wurden bereits unter „Wie Pixel gespeichert werden“ und „Farbkodierung“ erläutert; das Skript packt die Daten nach denselben Regeln. Die erzeugten Daten lassen sich daher direkt an das Panel senden, ohne dass das Board JPG dekodieren oder Dithering berechnen muss.

### Foto austauschen

Sichere zuerst die ursprüngliche Datei `photo_data.h`, da der folgende Befehl sie überschreibt. Auf dem Computer werden Python 3, Pillow und numpy benötigt (`pip install pillow numpy`). Zum Ausführen des Beispiels müssen sie nicht installiert sein.

Führe im Beispielordner Folgendes aus:

```bash
cd EPD_3in7_Showcase_JD7601
python3 tool/epd_photo.py mein_foto.jpg --header photo_data.h --header-name photo_driver
```

- Der Arrayname muss `photo_driver` bleiben. Daraus erzeugt das Skript `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H` und `PHOTO_DRIVER_BYTES`, die vom `static_assert` am Ende des Hauptprogramms verwendet werden.
- Standardmäßig wird mittig auf 480×720 zugeschnitten. Wenn die Ränder erhalten bleiben sollen, kannst du `--fit contain` (mit weißen Rändern) oder `--fit stretch` (verzerrendes Strecken) hinzufügen.
- Die Ausgabe ist immer 480×720 und 172800 Byte groß. Danach einfach neu kompilieren und hochladen; ein Dateisystem-Upload ist nicht erforderlich.

## Häufige Probleme und Lösungen

### Compilerfehler undefined reference to EPD037A02_GFX

Symptom: Beim Linken werden Funktionen wie `begin()` und `display()` nicht gefunden.

Ursache: `EPD037A02_GFX.cpp` wird nicht kompiliert. Arduino kompiliert `.cpp`-Dateien nur im Stammverzeichnis des Sketches und im Unterverzeichnis `src/`; Dateien in anderen Unterverzeichnissen wie `driver/` werden nicht kompiliert.

Lösung: Lege die Hauptdatei `.ino` sowie die Treiberdateien `.h` und `.cpp` in dasselbe Verzeichnis, öffne das Beispiel erneut und kompiliere noch einmal.

### Keine Ausgabe im seriellen Monitor

Symptom: Der Upload ist abgeschlossen, doch die serielle Ausgabe bleibt leer.

Ursache: Falsche Baudrate; bei Verwendung des integrierten USB-Anschlusses ist USB CDC nicht aktiviert; oder der Monitor wurde zu spät geöffnet und das Programm hat seine Ausgaben bereits beendet.

Lösung: Stelle 115200 Baud ein und prüfe den Port. Beim integrierten USB-Anschluss setze `USB CDC On Boot` in der Arduino IDE auf `Enabled` und lade den Sketch erneut hoch. Alternativ kannst du gemäß Board-Anleitung den UART-Anschluss verwenden. Drücke abschließend RESET, um das Programm neu zu starten.

### Serielle Ausgabe vorhanden, Display bleibt weiß

Symptom: Das Programm läuft, aber das Display zeigt kein Bild.

Ursache: Häufig sind SDA und CLK vertauscht, CS oder DC falsch angeschlossen oder die gemeinsame Masse fehlt.

Lösung: Trenne die Stromversorgung und prüfe alle 8 Leitungen einzeln. Miss, ob VDD 3.3 V beträgt, und prüfe die Durchgängigkeit von GND. Außerdem muss der vierte Parameter von `SPI.begin()` im Treiber `-1` sein; `_spiSend()` schaltet CS manuell auf Low und High.

### Serielle Meldung: BUSY-Timeout während reset

Symptom: Das Log bleibt bei „Warte auf High an BUSY“ stehen, meldet anschließend einen Timeout bei `reset` und gibt schließlich `Init failed` aus.

Ursache: BUSY bleibt dauerhaft Low. Möglicherweise ist das Display nicht versorgt, BUSY falsch oder nicht richtig angeschlossen oder das Flachbandkabel hat einen Wackelkontakt.

Lösung: Prüfe, ob VDD mit 3.3 V verbunden ist, das Flachbandkabel vollständig sitzt und BUSY mit GPIO7 verbunden ist. Prüfe dies zuerst, ohne den Aktualisierungscode zu ändern. Nach der Korrektur erneut mit Strom versorgen und hochladen.

### Timeout bei DRF oder teilweise gestörtes Bild

Symptom: Die Initialisierung funktioniert, aber während der Aktualisierung tritt ein Timeout auf oder Teile des Bildes sind fehlerhaft.

Häufige Ursachen: Unzureichender Versorgungsstrom, zu lange Dupont-Kabel oder zu hohe SPI-Geschwindigkeit.

Lösung: Verkürze die Dupont-Kabel, prüfe den Massekontakt und verwende einen USB-Anschluss oder ein Netzteil mit stabiler Versorgung. Behalte die Standard-SPI-Geschwindigkeit von 2 MHz bei. Falls du den Parameter von `epd.begin()` geändert hast, entferne ihn zunächst, um den Standardwert wiederherzustellen.

### Bild um 90° gedreht und etwa dreifach wiederholt

Symptom: Text und Farbfelder sind erkennbar, aber falsch ausgerichtet und versetzt wiederholt.

Ursache: Die Framedaten sind zeilenweise angeordnet, während das Panel vertikale Spalten erwartet. Mit dem Treiber aus diesem Artikel sollte das nicht passieren; typischerweise tritt es nach eigenen Treiberänderungen oder mit einer alten Treiberversion auf.

Lösung: Prüfe, ob `drawPixel()` die Zeile `size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);` enthält und ob `kColBytes = EPD037A02_HEIGHT / 2`, also 360, gilt.

### Keine Wiederholungen, aber Bild steht auf dem Kopf

Symptom: Die Buchstabenreihenfolge stimmt, nur das gesamte Bild ist vertikal gespiegelt.

Ursache: Das Panel durchläuft jede Spalte von unten nach oben, und die Y-Spiegelung fehlt im Code.

Lösung: Prüfe, ob `drawPixel()` die Zeile `const int16_t fy = HEIGHT - 1 - dy;` enthält und die nachfolgende Adress- und Nibble-Berechnung jeweils `fy` verwendet. Drehe nicht einfach die Bytereihenfolge um.

### Feine Linien sind versetzt, Striche sehen wie Kammzähne aus

Symptom: Die Gesamtposition stimmt, aber benachbarte Pixel sind um 1–2 px versetzt.

Ursache: Möglicherweise ist die Reihenfolge von hohem und niedrigem Nibble innerhalb eines Bytes vertauscht.

Lösung: Ändere `EPD037A02_SWAP_NIBBLE` in `EPD037A02_GFX.h` von `0` auf `1`. Dadurch wird nur die Reihenfolge der beiden Pixel innerhalb eines Bytes vertauscht, nicht das ganze Bild gespiegelt.

### Compilerfehler Photo must be 480x720 oder Photo must be 172800 bytes

Symptom: Eine der beiden `static_assert`-Prüfungen schlägt an.

Ursache: Das ersetzte `photo_data.h` hat nicht 480×720 oder die Framelänge beträgt nicht 172800 Byte.

Lösung: Erzeuge die Datei mit dem obigen Konvertierungsbefehl neu und behalte `--header-name photo_driver` bei. Prüfe anschließend, ob `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H` und `PHOTO_DRIVER_BYTES` jeweils 480, 720 und 172800 sind.

## FAQ

**Kann ich andere Pins für das EPD037A02 verwenden?**

Ja. Passe gleichzeitig die Verkabelung und `EPD037A02_GFX epd(10, 9, 8, 7, 12, 11)` an; die Parameterreihenfolge lautet CS, DC, RST, BUSY, SCK, MOSI. Beim ESP32-S3 solltest du GPIO0, 45 und 46 (Boot), GPIO19 und 20 (USB) sowie GPIO26～37 (durch Flash/PSRAM belegt) vermeiden; prüfe zusätzlich den Schaltplan deines Boards. Ich habe nur mit der Gruppe GPIO7～12 kompiliert und keine anderen Pins getestet.

**Wie hoch ist die SPI-Geschwindigkeit? Kann ich 8 MHz verwenden?**

Das Beispiel verwendet standardmäßig 2 MHz, Mode 0 und MSB zuerst. Zur Erhöhung kannst du den Parameter von `epd.begin()` ändern, beispielsweise `epd.begin(4000000)`; beginne am besten mit 4 MHz. Bei Störpixeln oder Bildfehlern gehe zurück auf 2 MHz. 8 MHz habe ich mit diesem Drei-Bildschirme-Beispiel nicht getestet.

**Ist eine Versorgung mit 5 V möglich? Wie hoch ist der Strom während der Aktualisierung?**

Nein. VDD darf nur mit 3.3 V versorgt werden, und GND muss eine gemeinsame Masse mit dem Board haben. Während der Aktualisierung steigt die Last des Hochspannungswandlers; deshalb sollten die Dupont-Kabel kurz und die Versorgung stabil sein. Den Spitzenstrom bei der Aktualisierung habe ich nicht gemessen und gebe daher keinen Schätzwert an.

**Wie viel RAM und Flash werden belegt? Wird die CPU vollständig ausgelastet?**

Ergebnis dieses Builds: Flash 525724 Byte (40%), globale Variablen 23576 Byte (7%). Zur Laufzeit werden zusätzlich 172800 Byte für den Framebuffer reserviert; beim Senden des Fotos kommen 2048 Byte temporärer Puffer hinzu. Die Aktualisierung blockiert: Währenddessen kann `loop()` nichts anderes erledigen. Plane daher keine Aufgaben mit strengen Timing-Anforderungen. Die CPU-Auslastung habe ich nicht gemessen.

**Funktionieren GxEPD2 oder ein normaler ESP32?**

In der von mir geprüften Version GxEPD2 1.6.9 gibt es keine Treiberklasse für dieses Sechsfarb-Panel mit 480×720 und JD7601; es lässt sich daher nicht direkt verwenden. Ein normaler ESP32 ist theoretisch möglich, erfordert aber Änderungen am plattformspezifischen SPI- und PSRAM-Code. Außerdem muss das RAM den 172800 Byte großen Framebuffer aufnehmen können. Andere Controller habe ich nicht getestet.

**Das Display zeigt überhaupt nichts an. Welche Leitungen zuerst prüfen?**

Miss zuerst, ob VDD 3.3 V beträgt, und prüfe danach GND, BUSY, CS, DC, SDA und CLK. Stelle die serielle Schnittstelle auf 115200. Bei einem Timeout in `reset` oder `DRF` folge dem entsprechenden Abschnitt oben. Wenn überhaupt keine serielle Ausgabe erscheint, prüfe zuerst Port und USB-CDC-Einstellungen und nicht zuerst das Frameformat.

**Kann das Display direkt Chinesisch oder JPG-Dateien anzeigen?**

Nein. Die Oberfläche verwendet die in GFX integrierte 5×7-Schrift; alle Beispieltexte sind englisch, ein chinesischer Zeichensatz ist nicht vorhanden. Auch JPG-Dateien lassen sich nicht direkt senden. Sie müssen zuerst in einen Panel-Frame mit 480×720 und 172800 Byte umgewandelt werden. Das mitgelieferte `photo_data.h` ist bereits konvertiert; das Austauschen wird oben unter „Foto austauschen“ beschrieben.

**Warum läuft das Beispiel nur einmal und stoppt dann? Bleibt das Foto ohne Strom erhalten?**

Das Beispiel ist bewusst auf einen einmaligen Durchlauf ausgelegt: `loop()` ist leer und am Ende bleibt das Foto stehen. E-Paper behält sein Bild auch ohne Stromversorgung. Zum Wiederholen drückst du RESET; für einen automatischen Zyklus musst du eine eigene Auslösung ergänzen. Den Abstand für eine kontinuierliche Wiederholung habe ich nicht getestet.

## Weitere Ideen

- Ersetze den festen Stundenplan durch Eingaben über die serielle Schnittstelle und binde nach dem Layouttest echte Daten an.
- Ergänze eine Taste zum manuellen Wechsel zwischen Hello, Stundenplan und Foto.
- Ergänze eine RTC, damit Datum und „aktuelle Unterrichtsstunde“ automatisch aktualisiert werden.
- Speichere mehrere Fotos in LittleFS oder auf einer SD-Karte und baue einen digitalen Bilderrahmen mit Blättern per Taste.

## Referenzen

- [Quellcode des Beispiels in diesem Artikel (GitHub)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601): vollständige Dateien der Drei-Bildschirme-Demo und Skript zur Fotokonvertierung.

- [Offizielle Produktseite zum Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3): Informationen zum Controller-Chip.

- [Offizielles Datenblatt zum Espressif ESP32-S3](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf): GPIO, SPI und elektrische Parameter.

- [Adafruit GFX Library GitHub](https://github.com/adafruit/Adafruit-GFX-Library): Text- und Grafikschnittstellen.

- [Adafruit BusIO GitHub](https://github.com/adafruit/Adafruit_BusIO): Abhängigkeit von Adafruit GFX.

- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32): Arduino-Kern und SPI-Unterstützung.

- [Dokumentation zu Adafruit-GFX-Schriften](https://learn.adafruit.com/adafruit-gfx-graphics-library/using-fonts): Verwendung der integrierten Schriften und FreeFont.

- [Open-Source-Materialien und Beispiele des Herstellers](https://gitee.com/osptek/display-epd-3.7inch-480x720): Datenblatt, Schaltplan und Herstellerbeispiele.
