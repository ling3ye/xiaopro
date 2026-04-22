---
title: "ESP32 steuert ILI9341 Display ueber 8-Bit-Parallelbus"
boardId: esp32
moduleId: display/tft204-ili9341
category: esp32
date: 2026-02-27
intro: "Ausfuehrliche Anleitung, wie der ESP32 ein ILI9341 Display ueber den 8-Bit-Parallelbus ansteuert. Gegenueber der SPI-Seriellanbindung bietet der Parallelmodus extrem hohe Bildraten – ideal fuer dynamische Darstellungen."
image: "https://img.lingflux.com/2026/04/09744a0e9009ab9ac1938e81cf1e6ac4.png"
---

Dieser Artikel zeigt dir im Detail, wie du mit einem ESP32 ein ILI9341 Display ueber den **8-Bit-Parallelbus (8-bit Parallel)** ansteuerst. Im Vergleich zur gaengigen SPI-Schnittstelle liefert der Parallelmodus extrem hohe Bildraten und eignet sich hervorragend fuer dynamische Inhalte.

## Entwicklungsumgebung

OS: MacOS

Arduino IDE Version: 2.3.7

esp32 Version:  3.3.5

TFT_eSPI Version: 2.5.43




## BOM

ESP32 x1

2.4 inch TFT Display x1

Dupont-Kabel xN



## Verkabelung

| TFT-Pin         | **ESP32-Pin** | **Beschreibung**                                            |
| --------------- | ------------- | ----------------------------------------------------------- |
| **VCC (3V3/5V)**| **3V3 / VIN** | Display-Stromversorgung (am besten erst 3.3V probieren)     |
| **GND**         | **GND**       | Gemeinsame Masse                                            |
| **LCD_D0**      | **GPIO 26**   | Datenbit 0                                                  |
| **LCD_D1**      | **GPIO 25**   | Datenbit 1                                                  |
| **LCD_D2**      | **GPIO 19**   | Datenbit 2                                                  |
| **LCD_D3**      | **GPIO 18**   | Datenbit 3                                                  |
| **LCD_D4**      | **GPIO 5**    | Datenbit 4                                                  |
| **LCD_D5**      | **GPIO 21**   | Datenbit 5                                                  |
| **LCD_D6**      | **GPIO 22**   | Datenbit 6                                                  |
| **LCD_D7**      | **GPIO 23**   | Datenbit 7                                                  |
| **LCD_CS**      | **GPIO 32**   | Chip Select                                                 |
| **LCD_RTS**     | **GPIO 33**   | Reset                                                       |
| **LCD_RS (DC)** | **GPIO 14**   | Daten/Befehl-Umschaltung (Register Select)                  |
| **LCD_WR**      | **GPIO 27**   | Write Enable (Schreibsteuerung)                             |
| **LCD_RD**      | **GPIO 2**    | Read Enable (wenn ID nicht gelesen werden muss, an 3.3V)    |




## Benoetigte Bibliotheken

### Arduino IDE Boards Manager: esp32

Zwingend erforderlich ist die esp32-Bibliothek von Espressif Systems. Hier installieren wir die aktuellste Version.

### Arduino IDE Library Manager: TFT_eSPI

Ebenfalls zwingend: die Bibliothek TFT_eSPI.



## TFT_eSPI-Konfiguration – Datei „User_Setup.h"

TFT_eSPI ist das absolute Swiss-Army-Messer fuer Display-Ansteuerung am ESP32. Allerdings werden Pin-Definitionen, Board-Auswahl und Display-Treiber alle in dieser einen Datei `User_Setup.h` konfiguriert – sie richtig anzupassen ist daher extrem wichtig.

Die Datei befindet sich hier:

Documents > Arduino > libraries > TFT_eSPI > User_Setup.h

**Vorgehen:** Datei oeffnen, gesamten Inhalt loeschen, den folgenden Code einfuegen und speichern:

```c++
// =========================================================================
//   User_Setup.h - Display driver configuration file for TFT_eSPI library
//   User_Setup.h - Konfigurationsdatei fuer den Display-Treiber der TFT_eSPI-Bibliothek
//
//   Hardware: ESP32 (No PSRAM or not using GPIO 16/17)
//   Hardware: ESP32 (kein PSRAM oder GPIO 16/17 nicht genutzt)
//
//   Driver: ILI9341 (8-bit parallel mode)
//   Treiber: ILI9341 (8-Bit-Parallelmodus)
// =========================================================================

// -------------------------------------------------------------------------
// 1. Driver Type Definition
//    Treibertyp-Definition
// -------------------------------------------------------------------------
#define ILI9341_DRIVER       // Generischer ILI9341-Treiber

// -------------------------------------------------------------------------
// 2. Color Order Definition
//    Farbreihenfolge-Definition
// -------------------------------------------------------------------------
// If colors are inverted (e.g., red becomes blue), change this.
// Falls die Farben vertauscht sind (z. B. Rot wird Blau), hier aendern.
#define TFT_RGB_ORDER TFT_BGR  // Die meisten ILI9341-Displays nutzen BGR-Reihenfolge
// #define TFT_RGB_ORDER TFT_RGB

// -------------------------------------------------------------------------
// 3. Screen Resolution
//    Bildschirmaufloesung
// -------------------------------------------------------------------------
#define TFT_WIDTH  240
#define TFT_HEIGHT 320

// -------------------------------------------------------------------------
// 4. Interface Configuration (Critical)
//    Schnittstellenkonfiguration (kritisch)
// -------------------------------------------------------------------------
#define ESP32_PARALLEL       // ESP32-Parallelmodus aktivieren
#define TFT_PARALLEL_8_BIT   // 8-Bit-Parallelbus verwenden

// -------------------------------------------------------------------------
// 5. Pin Definitions
//    Pin-Definitionen
// -------------------------------------------------------------------------

// --- Steuerpins ---
// Optimization: CS/RST moved to GPIO 32+, keeping low GPIOs for data bus and WR.
// Optimierung: CS/RST auf GPIO 32+ verschoben, niedrige GPIOs fuer Datenbus und WR freigehalten.

#define TFT_CS   32  // Chip Select
#define TFT_RST  33  // Reset

// Data/Command selection - Must be in GPIO 0-31 (or RS)
// Daten/Befehl-Auswahl – muss im Bereich GPIO 0-31 liegen (auch RS genannt)
#define TFT_DC   14

// Write signal - Critical pin, must be in GPIO 0-31 and keep connections short
// Schreibsignal – kritischer Pin, muss im Bereich GPIO 0-31 liegen, Leitungen moeglichst kurz halten
#define TFT_WR   27

// Read signal - If not reading screen data, can connect to 3.3V, but must be defined in library
// Lesesignal – wenn keine Display-Daten gelesen werden, kann dieser Pin an 3.3V; muss aber in der Bibliothek definiert sein
#define TFT_RD    2

// --- Datenbus-Pins D0 - D7 ---
// Must be within GPIO 0-31 range.
// Muessen im Bereich GPIO 0-31 liegen.
// Avoided GPIO 16, 17 (PSRAM/Flash) and 12 (Strap).
// GPIO 16, 17 (PSRAM/Flash) und 12 (Strap) wurden vermieden.

#define TFT_D0   26
#define TFT_D1   25
#define TFT_D2   19
#define TFT_D3   18
#define TFT_D4    5  // Hinweis: GPIO 5 ist ein Strap-Pin; sicherstellen, dass das Display ihn beim Einschalten nicht auf High zieht
#define TFT_D5   21
#define TFT_D6   22
#define TFT_D7   23

// -------------------------------------------------------------------------
// 6. Backlight Control (Optional)
//    Hintergrundbeleuchtung-Steuerung (optional)
// -------------------------------------------------------------------------
// If your screen has a BLK or LED pin, connect it to an ESP32 pin and define it here.
// Falls dein Display einen BLK- oder LED-Pin hat, mit einem ESP32-Pin verbinden und hier definieren.
// #define TFT_BL   4            // Beispiel: verbunden mit GPIO 4
// #define TFT_BACKLIGHT_ON HIGH // High-Pegel schaltet Hintergrundbeleuchtung ein

// -------------------------------------------------------------------------
// 7. Font Loading
//    Schriftarten laden
// -------------------------------------------------------------------------
// Enable as needed; enabling more fonts consumes more Flash memory.
// Nach Bedarf aktivieren; je mehr Schriften, desto mehr Flash-Speicher wird belegt.

#define LOAD_GLCD   // Font 1. Original Glcd font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts. Include access to the 48 Adafruit_GFX free fonts FF1 to FF48

#define SMOOTH_FONT // Glattes Schriftarten-Laden aktivieren

// -------------------------------------------------------------------------
// 8. Other Settings
//    Weitere Einstellungen
// -------------------------------------------------------------------------
// In parallel mode, SPI frequency is usually ignored as speed is determined by CPU register write speed.
// Kept here for compatibility.
// Im Parallelmodus wird die SPI-Frequenz meist ignoriert, da die Geschwindigkeit durch die CPU-Register-Schreibgeschwindigkeit bestimmt wird.
// Aus Kompatibilitaetsgruenden hier beibehalten.
#define SPI_FREQUENCY       27000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY  2500000

// --- Touchscreen-Einstellungen ---
// If you use XPT2046 touch function.
// Parallel screens usually have a separate SPI interface for touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).
// Falls du die XPT2046-Touch-Funktion nutzt.
// Parallel-Displays haben fuer Touch meist eine eigene SPI-Schnittstelle (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).

// If using touch, uncomment below and set pins (can use VSPI default pins).
// Wenn Touch verwendet wird, Kommentare unten aufheben und Pins setzen (VSPI-Standardpins koennen verwendet werden).

// #define TOUCH_CS 22
// WARNING: You used TFT_D6 on GPIO 22 above. If using touch, find another pin or use SoftSPI.
// Warnung: TFT_D6 oben belegt bereits GPIO 22. Wenn Touch genutzt wird, einen anderen Pin waehlen oder SoftSPI verwenden.
```



## Beispielprogramm oeffnen

Ueber diesen Pfad das Beispielprogramm oeffnen – damit kannst du alles testen:

Arduino IDE: File -> Examples -> TFT_eSPI -> 320 x 240 -> TFT_graphicstest_one_lib



## Hochladen – Compiler-Fehler beheben

Wenn deine ESP32-Board-Bibliothek auf **Version 3.0.0 oder neuer** aktualisiert wurde, wirst du beim Kompilieren von TFT_eSPI hoechstwahrscheinlich folgenden Fehler sehen:

```tex
In file included from /Users/shawn/Documents/Arduino/libraries/TFT_eSPI/TFT_eSPI.cpp:24:

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c: In member function 'uint8_t TFT_eSPI::readByte()':

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c:113:9: error: 'gpio_input_get' was not declared in this scope; did you mean 'gpio_num_t'?
113 |   reg = gpio_input_get(); // Read three times to allow for bus access time
|         ^~~~~~~~~~~~~~
|         gpio_num_t
exit status 1

Compilation error: exit status 1
```



`error: 'gpio_input_get' was not declared in this scope`

### Fehlerursache

`gpio_input_get()` war ein Makro bzw. eine Funktion aus dem alten ESP-IDF-Framework. In den neuen **ESP32 Arduino Core 3.0.x**-Versionen hat Espressif die Low-Level-APIs massiv umgebaut und viele alte Funktionen entfernt bzw. geaendert. TFT_eSPI ruft diese Funktion auf, findet sie aber nicht mehr – und bricht mit einem Fehler ab.

Man kann das Problem durch ein Downgrade der esp32-Bibliothek auf 2.0.x loesen – das ist der einfachste Weg. Ich moechte dir aber eine Alternative zeigen, bei der du die TFT_eSPI-Bibliothek direkt patchst:

Finde und oeffne folgende Datei:

Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c

Fuege ganz am Anfang des Codes die folgende Makro-Definition ein und speichere die Datei:

```c++
#if !defined(gpio_input_get)
  #define gpio_input_get() GPIO.in
#endif
```



## Erneutes Hochladen – gespiegeltes Bild beheben

Jetzt kompiliert alles fehlerfrei und laesst sich erfolgreich auf das Board spielen. Das Display leuchtet auch schon. Aber Vorsicht, noch nicht zu frueh freuen! Genauer Blick aufs Display zeigt: Der Text ist gespiegelt.

Im Beispielprogramm folgende Aenderung vornehmen – ungefaehr bei Zeile 102:

```
void loop(void) {
  for (uint8_t rotation = 4; rotation < 8; rotation++) {
    tft.setRotation(rotation);
    testText();
    delay(2000);
  }
}
```



## Finales Hochladen

Jetzt stimmt die Darstellung. Herzlichen Glueckwunsch – du hast dieses 2.4-Zoll-TFT-Display (ILI9341) erfolgreich zum Leuchten gebracht!




## Haeufige Probleme (FAQ)

Die haeufigsten Probleme aus der Entwicklungspraxis – hier als Schnellreferenz.

### Q1: Display leuchtet weiss, zeigt aber keinen Inhalt?

- **A1**: In 90 % der Faelle ist der Parallelmodus nicht aktiviert. Bitte pruefe noch einmal, ob in User_Setup.h die Zeile `#define ESP32_PARALLEL` auskommentiert wurde (also aktiv ist).
- **A2**: Pruefe, ob TFT_RST (GPIO 33) guten Kontakt hat.

### Q2: Farben stimmen nicht – Rot wird zu Blau?

- **A**: Das liegt an der RGB/BGR-Reihenfolge. In User_Setup.h die Zeile `#define TFT_RGB_ORDER TFT_RGB` auf `TFT_BGR` aendern (oder umgekehrt).

### Q3: Wird Touch in dieser Konfiguration unterstuetzt?

- **A**: Dieser Artikel konfiguriert nur die Display-Ansteuerung. ILI9341-Displays haben haeufig einen zusaetzlichen XPT2046-Touch-Chip, der eine eigene SPI-Schnittstelle nutzt. Du musst die Touch-Pins (T_CLK, T_CS, T_DIN, T_DO, T_IRQ) separat anschliessen und in User_Setup.h den Kommentar bei `TOUCH_CS` entfernen. **Achtung:** Touch nutzt SPI und darf die Parallel-Datenleitungen D0-D7 nicht teilen.

### Q4: Warum nicht einfach VSPI/HSPI verwenden?

- **A**: Die theoretische Bildrate des Parallelmodus (8-bit) ist ein Vielfaches von SPI – ideal fuer UIs mit hohen Frameraten oder Retro-Spielemulatoren.
