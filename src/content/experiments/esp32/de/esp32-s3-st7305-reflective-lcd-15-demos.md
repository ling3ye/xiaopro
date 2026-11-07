---
title: "ESP32-S3 steuert das reflektive 4,2-Zoll-Mono-LCD ST7305 an: 15 komplette Beispiele (4-Draht-SPI + Arduino)"
boardId: esp32s3
moduleId: display/lcd42-st7305-reflective
category: esp32
date: 2026-11-06
intro: "Mit einem Arduino Nano ESP32 (ESP32-S3) und 4-Draht-SPI das reflektive 4,2-Zoll-Monochromdisplay ST7305 mit 300×400 Pixeln ansteuern: Verkabelung, Flashen, 15 Anzeigebeispiele und Fehlersuche – ideal für Arduino-Maker, die mit backlightlosen reflektiven Displays experimentieren wollen."
image: "https://img.lingflux.com/2026/11/e43d291425c39954fa157a9adb62fddb.jpg"
---

> **Kurzfassung in einem Satz**: Arduino Nano ESP32 (ESP32-S3) + 4,2-Zoll-ST7305-Reflexionsdisplay (monochrom): Eine einzige `.ino`-Datei bringt Treiber + 15-seitige Demo-Rotation zum Laufen – ganz ohne fremde Display-Bibliotheken.

```text
Schwierigkeit: ⭐⭐☆☆☆ (wer Jumperkabel stecken und die Arduino IDE bedienen kann, schafft das)
Zeitbedarf: 30 Minuten (ohne die Zeit, die man mit wackeligen Kontakten ringt)
Testumgebung: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10
```

> **TL;DR (Schnellstart):**
>
> 1. Verkabelung: SCLK → D7/GPIO10, MOSI → D5/GPIO8, CS → D6/GPIO9, DC → D4/GPIO7, RES → D3/GPIO6.
> 2. VCI an 3.3V, Display und Board teilen sich Masse; TE und BLC bleiben frei. Wichtig: Beim Nano ESP32 ist D5 = GPIO8, nicht GPIO11.
> 3. Das Boardpaket `esp32 by Espressif Systems` installieren; U8g2, Adafruit GFX oder andere Display-Bibliotheken werden NICHT gebraucht.
> 4. Die mitgelieferte `ST7305_RLCD_Demo.ino` öffnen, Board `Arduino Nano ESP32` wählen, kompilieren und flashen.
> 5. Den seriellen Monitor auf 115200 Baud stellen; das Display rotiert dann automatisch durch 15 Beispiele. Animierte Seiten nutzen HPM; statische Seiten werden nur einmal aufs Display geschrieben.

## Vorwort: Ein Display, das nicht leuchtet – und gerade deshalb besser lesbar ist

Ein normales LCD am Abend anzusehen fühlt sich manchmal an, als würde dir jemand eine kleine Taschenlampe direkt in die Augen halten. Ein E-Ink-Display ist zwar angenehm, aber seine Animationen abzuwarten ist wie auf den Bus zu warten – du weißt, er kommt, aber schneller wird er nicht.

Vollreflektive Displays gehen einen dritten Weg: Statt Pixel mit einer Hintergrundbeleuchtung zu leuchten, reflektieren sie das Umgebungslicht – wie ein Blatt Papier, das dein Programm immer wieder neu beschreiben kann. Bei viel Licht wird das Bild sogar klarer; wenn es zu dunkel ist, mach einfach eine Lampe an – beweise keine Willensstärke durch Zusammenkneifen der Augen.

Diesmal habe ich einen Arduino Nano ESP32 (im Kern ein ESP32-S3) benutzt, um ein 4,2-Zoll-, 300×400-, ST7305-gesteuertes vollreflektives Mono-TFT anzutreiben. Ziel war nicht, nach einem `Hello World` Feierabend zu machen, sondern mit 15 Beispielen Text, Graustufen, Geometrie, Animation, Bildrate und Vier-Wege-Rotation durchzuprobieren.

Das "schont die Augen" meint hier das Betrachten ohne Hintergrundbeleuchtung über Umgebungslicht – keine medizinische Wirksamkeitszertifizierung. Wenn deine Augen Pause brauchen, kann auch das beste Display nicht für dich blinzeln.

## Das Ergebnis: 15 ST7305-Beispiele im automatischen Karussell

Nach dem Flashen einer einzigen `.ino`-Datei startet das Display mit der Startseite und läuft automatisch durch 15 Seiten – ohne Taster, serielle Befehle, Netzwerk oder externe Bilddateien.

![ST7305 – 15 Beispiele im Karussell](https://img.lingflux.com/2026/11/26bdefa52b9c1d4b6e779c08f9744255.jpg)

|    # | Beispiel      | Worauf achten                                        | Verweilzeit | Ziel-FPS   |
| ---: | ------------- | ---------------------------------------------------- | ----------: | ---------: |
|    1 | Hello World   | Großer Text, Rahmen, geditherter Hintergrund und Smiley |  3,5 s  |     statisch |
|    2 | Dither Gray   | 17 Stufen 4×4-Bayer geordnetes Dithering, Verlauf, Graukreise (kein natives Graustufenbild; physische Pixel bleiben 1-Bit) |  6,5 s  |     statisch |
|    3 | Geometry      | Linien, Rechtecke, Kreise, Dreiecke und Polygone     |       5 s |     statisch |
|    4 | Pixel Grid    | Kanten, Seitenverhältnis, Diagonalen und geometrische Zentrierung | 5 s | statisch |
|    5 | Text & Font   | 5×7-ASCII, Integer-Skalierung und invertierter Text  |     5,5 s |     statisch |
|    6 | Dashboard UI  | Karten, Fortschrittsbalken, Schalter, Akku und Live-Daten |    9 s |      4 FPS   |
|    7 | Frame Rate    | Echte FPS, Frame-Kosten und ein 54-Punkte-Verlaufsgraph |  8,5 s | ungedrosselt |
|    8 | Fine Patterns | 1/2/4-Pixel-Schachbretter und Feinlinien-Flimmern    |       6 s |      2 FPS   |
|    9 | Bounce        | Hüpfen, Kollisionen, Bewegungsgeister-Beobachtung und Trefferzähler |      9 s |     20 FPS   |
|   10 | Starfield     | Perspektivischer Flug durch 56 Sterne                |       9 s |     20 FPS   |
|   11 | Game of Life  | Conways Spiel des Lebens auf einem 34×34-Torus       |      12 s |      3 FPS   |
|   12 | Uptime Clock  | Eine Laufzeituhr auf Basis von `esp_timer`           |       9 s |      4 FPS   |
|   13 | Retro Desktop | Ein Retro-Desktop im Macintosh-Stil                  |     6,5 s |     statisch |
|   14 | Inversion     | Vollbild-Schwarz/Weiß-Invertierung und Kontrastcheck |       6 s |      2 FPS   |
|   15 | Rotation      | Umschalten zwischen 0°/90°/180°/270°                 |      12 s |      4 FPS   |

Die Ziel-FPS ist das Tempo, in dem das Programm Frames zeichnet und sendet – nicht die optische Bildwiederholrate des Glaspanels. Seite 7 misst „Zeichnen + eine komplette 15000-Byte-SPI-Frame-Übertragung", kein aufgehübschtes Benchmark zum Angeben.

YouTube-Demovideo:

<iframe width="560" height="315" src="https://www.youtube.com/embed/IWZMK5AJsvI?si=pXumVzEKfuIYEra9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Bauteil-Beschreibung

### 4,2-Zoll-Reflexions-Mono-TFT: Ein Schwarz-Weiß-Display, das vom Umgebungslicht „entwickelt" wird

Das 4,2-Zoll-vollreflektive Mono-TFT ist ein backlightloses reflektives Monochrom-LCD. Es nutzt Umgebungslicht, um Schwarz-Weiß-Bilder darzustellen, und zeigt in diesem Projekt die 15 Testmuster und animierten Seiten an.

Stell es dir wie ein Blatt Papier vor, das auf einen Mikrocontroller hört: Je besser das Umgebungslicht, desto entspannter das Lesen; ohne Umgebungslicht verwandelt es sich auch nicht von selbst in eine Taschenlampe.

| Parameter         | Dieses Display                      |
| ----------------- | ----------------------------------- |
| Modul-Teilenummer | W420HC018MONO-12Z                   |
| Größe             | 4,2 Zoll                            |
| Auflösung         | 300×400 Pixel, 1 Bit schwarz-weiß   |
| Anzeigeart        | Vollreflektiv, normal-weiß, ohne Hintergrundbeleuchtung |
| Treiber-IC        | Sitronix ST7305                     |
| Host-Schnittstelle | Einfaches 4-Draht-SPI, nur Schreiben |
| Display-Versorgung | 2.8V/3.3V – hier werden 3.3V genutzt |
| Aktive Fläche     | 63,6×84,84 mm                       |
| Betriebstemperatur | -20℃～+70℃                         |

Warum dieses: 300×400 reicht für ein komplettes Armaturenbrett-Layout, 4-Draht-SPI belegt nur wenige Pins, und ganz ohne Backlight-Schaltung eignet es sich bestens für Umgebungsdaten, Uhren und Anzeigen mit niedriger Bildrate.

### Pinbelegung

Alle Signale kommen über ein 12-poliges FPC-Kabel heraus; mit der Adapterplatine lässt sich das Display mit Jumperkabeln ans Board anschließen:

| FPC-Pin   | Name  | Funktion                    | In diesem Beispiel     |
| --------: | ----- | --------------------------- | ---------------------- |
|  1, 5, 12 | GND   | Versorgungsmasse            | An Board-GND           |
|      2, 3 | NC    | Nicht verbunden             | Frei lassen            |
|         4 | VCI   | Display-Versorgung          | An 3.3V                |
|         6 | TE    | Frame-Sync-Ausgang          | Ungenutzt, offen       |
|         7 | DC    | Befehl/Daten-Auswahl        | An GPIO7               |
|         8 | CS    | SPI-Chip-Select, LOW-aktiv  | An GPIO9               |
|         9 | SCL   | SPI-Takt                    | An GPIO10              |
|        10 | SDA   | SPI-Dateneingang, also MOSI | An GPIO8               |
|        11 | RESET | Hardware-Reset, LOW-aktiv   | An GPIO6               |

Achtung: `SDA` ist hier SPI-MOSI, nicht I²C. Gleicher Name, andere Arbeit – lass es nicht mit deinen I²C-Sensoren verwandtschaftlich anbandeln.

### ST7305: Der „Sortierer", der Bytes in Schwarz-Weiß-Pixel übersetzt

Der ST7305 ist Sitronix' Ultra-Low-Power-Monochrom-TFT-Controller/Treiber-IC. Er nimmt Befehle vom Host entgegen, verwaltet den Display-RAM und treibt das Panel – in diesem Projekt verwandelt er die vom ESP32-S3 gesendeten Frame-Daten in Schwarz-Weiß-Pixel auf dem Display.

| Parameter            | Wert / Konfiguration in diesem Projekt       |
| -------------------- | -------------------------------------------- |
| Max. Treiberleistung | 408×408 Monopixel                            |
| Pixeltiefe           | 1 Bit/Pixel                                  |
| Min. SPI-Schreibzyklus | 30 ns – etwa 33 MHz maximal                |
| SPI in diesem Projekt | Mode 0, 20 MHz, MSB first                   |
| HPM-Bildrate         | 16 Hz oder 32 Hz; hier auf 16 Hz konfiguriert |
| LPM-Bildrate         | 0,25～8 Hz; hier beim Init auf 8 Hz konfiguriert |
| Volles Frame hier    | 15000 Bytes                                  |

Nicht etwa, weil viele Register professionell aussehen – sondern weil das Modul alles schön gekapselt hat: Der Host braucht nur SPI, DC, CS und RESET, um das ganze Display zu aktualisieren.

### FPC-Adapterplatine: Vom „feinen Flachbandkabel" zum „Jumperkabel"

Eine FPC-Adapterplatine ist eine Kabel-Interface-Wandlerplatine, die das 12-polige FPC des Displays auf experimentierfreundliche Stiftleisten führt, sodass das Display in diesem Projekt mit gewöhnlichen Jumperkabeln ans Board angeschlossen werden kann.

| Parameter        | Verwendung in diesem Projekt            |
| ---------------- | --------------------------------------- |
| Display-Seite    | 12-poliges FPC                          |
| Experiment-Seite | GND, VCC, SCL, SDA, RES, DC, CS, BLC    |
| Nötige Signale   | 5 Steuerleitungen + 3.3V + GND          |
| Kann offen bleiben | TE, BLC                               |

Wir benutzen sie, damit niemand das feine Flachbandkabel von Hand löten muss. Wir machen hier ein Display-Experiment, wir melden uns nicht für eine Doppelprüfung aus Augenheilkunde und Löten an.

## BOM

| Bauteil                            | Anzahl | Pflicht     | Anmerkungen                                  |
| ---------------------------------- | -----: | ----------- | -------------------------------------------- |
| Arduino-Nano-ESP32-Board           |      1 | Pflicht     | Der MCU ist ein ESP32-S3                     |
| 4,2-Zoll-ST7305-Reflexions-Monodisplay |  1 | Pflicht     | 300×400, mit 3.3V versorgt                   |
| Passende FPC-Adapterplatine        |      1 | Empfohlen   | Macht nur die Verkabelung bequem; ein FPC-Stecker geht auch |
| Jumperkabel                        |   7+   | Pflicht     | So kurz wie möglich – weniger Kontakt- und Signalprobleme |

## Verkabelung: ESP32-S3 per 4-Draht-SPI mit dem ST7305 verbinden

![Verkabelung des ST7305 mit einem Arduino Nano ESP32](https://img.lingflux.com/2026/11/a029c2eab88f09f46c951a53287b647e.jpg)

```text
Arduino Nano ESP32                         ST7305-Adapterplatine
┌──────────────────┐                     ┌──────────────────┐
│ D7  / GPIO10     │ ───── SCLK ───────► │ SCL              │
│ D5  / GPIO8      │ ───── MOSI ───────► │ SDA              │
│ D6  / GPIO9      │ ───── CS ─────────► │ CS               │
│ D4  / GPIO7      │ ───── DC ─────────► │ DC               │
│ D3  / GPIO6      │ ───── RESET ──────► │ RES              │
│ 3V3              │ ───── 3.3V ───────► │ VCC / VCI        │
│ GND              │ ───── GND ────────► │ GND              │
└──────────────────┘                     └──────────────────┘
```

| Adapter-Aufdruck | Display-FPC | Nano-ESP32-Aufdruck | ESP32-S3 GPIO | Zweck                |
| ---------------- | ----------: | ------------------- | ------------: | -------------------- |
| SCL              |       PIN9  | D7                  |        GPIO10 | SPI-Takt             |
| SDA              |      PIN10  | D5                  |         GPIO8 | SPI MOSI             |
| CS               |       PIN8  | D6                  |         GPIO9 | Chip-Select          |
| DC               |       PIN7  | D4                  |         GPIO7 | Befehl/Daten-Auswahl |
| RES              |      PIN11  | D3                  |         GPIO6 | Hardware-Reset       |
| VCC/VCI          |       PIN4  | 3V3                 |  3.3V-Versorgung | Display-Versorgung |
| GND              |  PIN1/5/12  | GND                 |           GND | Gemeinsame Masse     |
| TE               |       PIN6  | nicht verbunden     |             — | Frame-Sync hier ungenutzt |
| BLC              |          —  | nicht verbunden     |             — | Reflexionsdisplay ohne Hintergrundbeleuchtung |

**In diesem Beispiel geht VCI an 3.3V – nicht an 5V, VBUS oder VIN anschließen.**

### Keine zusätzliche Treiberschaltung nötig: Der ESP32-S3 steuert das Display-FPC direkt an

Bei 3.3V-Versorgung kann dieses Display direkt von den GPIOs des ESP32-S3 angesteuert werden: Verbinde SCL, SDA, CS, DC und RESET am FPC mit den passenden GPIOs, VCI mit 3.3V und teile GND. Dazwischen braucht es keinen Pegelwandler-Chip, kein dediziertes Display-Treiberboard und keine sonstige Peripherieschaltung.

„Direkte Verbindung" meint hier die **elektrische** Verbindung – nicht, das weiche blanke Flachbandkabel direkt in die Stiftleiste des Boards zu stecken. In der Praxis brauchst du trotzdem einen 12-poligen FPC-Stecker, eine gelötete Fassung oder eine Adapterplatine, um die Kontakte des Flachbandkabels zuverlässig herauszuführen. Die Adapterplatine in diesem Artikel ist nur ein mechanischer Adapter für Jumperkabel; sie ist keine Treiberschaltung, die das Display zum Arbeiten bräuchte. Wenn du direkt von einem FPC-Stecker aus verkabelst, folge den FPC-PIN-Nummern in der Tabelle oben – die Signalbeziehungen sind identisch.

Die Stelle, an der die Verkabelung am leichtesten schiefgeht: Der Code will die GPIO-Nummern des Chips, nicht die Zahlen aus dem Board-Aufdruck. Hier ist `D5 = GPIO8`, während `GPIO11 = A4` ist. Wenn du MOSI versehentlich an GPIO11 verdrahtest, läuft das Programm weiter und der serielle Monitor druckt fröhlich weiter – während das Display so still bleibt wie bei unbezahlter Stromrechnung.

Nach dem Verkabeln in der Reihenfolge „Versorgung → gemeinsame Masse → SCLK → MOSI → CS → DC → RESET" nochmal prüfen – das spart etwa 80% der Debugging-Zeit. Beim FPC außerdem Einführrichtung, vollständigen Sitz und Verriegelung kontrollieren; eine Rastung zu locker kann das ganze Display lahmlegen.

## Benötigte Bibliotheken: Nur das ESP32-Board-Support-Paket

Dieses ST7305-Arduino-Beispiel hängt nicht von U8g2, Adafruit GFX, TFT_eSPI oder einer zusätzlichen Font-Bibliothek ab. Treiber, 5×7-ASCII-Font, Grafikprimitiven und alle 15 Seiten leben in einer einzigen `.ino`-Datei.

### Schritt 1: Arduino IDE installieren

Dieser Artikel nutzt Arduino IDE 2.3.8 – Download von der offiziellen Arduino-Website.

### Schritt 2: ESP32 Arduino Core installieren

Den Boardverwalter öffnen, suchen und installieren:

```text
esp32 by Espressif Systems (getestete Version in diesem Artikel: 3.3.10)
```

Im Boardverwalter dieselbe Version wie hier wählen – das minimiert API- und Default-Config-Unterschiede zwischen Boardpaketen.

### Schritt 3: Board und seriellen Port wählen

```text
Board: Arduino Nano ESP32
Port: den Port wählen, der nach dem Anschluss des Boards erscheint
Serieller Monitor: 115200
```

Arduinos Standard-`SPI`, die Timer und `esp_timer` kommen alle mit der Board-Umgebung – kein Grund, im Bibliotheksverwalter „auf gut Glück ein paar ähnlich klingende Bibliotheken zu installieren".

### Ergänzung: Was, wenn du lieber eine fertige Bibliothek nutzen willst?

Dieses Tutorial nutzt einen Single-File-Treiber, damit Initialisierung, Framebuffer und Pixel-Mapping direkt lesbar bleiben – es heißt nicht, dass der ST7305 keine Bibliothek nutzen könnte. Wenn du auf diesem Projekt aufbauen willst, erwäge diese Optionen:

| Option                                                       | Am besten für                             | Worauf beim Einsatz achten                                   |
| ------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| [U8g2](https://github.com/olikraus/u8g2) v2.36 oder neuer    | Text, Grundgrafiken und reichhaltige Fonts | Stellt `U8G2_ST7305_300X400_1_4W_HW_SPI` bereit, mit Unterstützung für 4-Draht-Hardware-SPI in dieser Auflösung; beim Installieren die Bibliotheksversion prüfen und CS, DC, RESET sowie die SPI-Pins auf die in diesem Artikel genutzten GPIOs ändern |
| [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library) | Wenn du einen dedizierten ST7305-Arduino-Treiber direkt nutzen willst | Bietet Wrapper wie `ST7305_4p2_BW_DisplayDriver`; Auflösung, Initsequenz und Pin-Konfiguration in `DisplayConfig.h` prüfen – dieser Artikel hat sie auf diesem Modul nicht getestet |
| LVGL + ST7305-Low-Level-Treiber                              | Komplexe UIs, Widgets und Seitenverwaltung | LVGL übernimmt die UI und ersetzt nicht den ST7305-Treiber; der Treiber aus diesem Artikel (oder der Herstellertreiber) muss an LVGLs Flush-Callback angeschlossen werden, und Framebuffer-Verbrauch sowie tatsächliche Refresh-Performance sollten bewertet werden |

Nicht davon ausgehen, dass generische Grafikbibliotheken wie Adafruit GFX, TFT_eSPI oder Arduino_GFX den ST7305 gleich nach der Installation ansteuern – erst prüfen, ob die aktuelle Version diesen Controller ausdrücklich unterstützt; sonst musst du selbst anpassen. Selbst beim Bibliothekswechsel verschwinden die Hardware-Zwänge nicht: 3.3V-Versorgung, 4-Draht-SPI, HPM/LPM und das 2-Zeilen-×-4-Spalten-Pixel-Mapping.

**Kurzempfehlung:** Hauptsächlich Text und Grundgrafiken → erst U8g2 probieren; komplexe UI → LVGL erwägen; volle Kontrolle über Init, Vollbild-Übertragung und Animationspacing → der Single-File-Ansatz dieses Artikels ist am direktesten.

## Vollständiger Code: ST7305_RLCD_Demo als Single-File-Arduino-Programm

Vollständiger, flashbarer Quellcode:

```c
/*
 * ST7305 4,2-Zoll 300x400 vollreflektives Mono-LCD — komplette Single-File-Arduino-Demo
 *
 * Gleiche Funktionen wie die ESP-IDF-Version: Treiber + Grafikprimitiven + 15-seitige Auto-Karussell-Demo.
 * Das ganze Programm ist nur diese eine .ino-Datei — keine Drittanbieter-Bibliotheken nötig, leicht zu teilen.
 *
 * Verdrahtung (Arduino-Nano-ESP32-Aufdruck):
 *   SCLK = GPIO10 (D7)   MOSI = GPIO8 (D5)   CS  = GPIO9 (D6)
 *   DC   = GPIO7  (D4)   RES  = GPIO6 (D3)   VCI = 3.3V  GND = GND
 *
 * Arduino IDE vorbereiten:
 *   1. Im Boardverwalter "esp32 by Espressif Systems" installieren
 *   2. Board "Arduino Nano ESP32" wählen und den passenden seriellen Port auswählen
 *   3. Diese Datei muss in einem gleichnamigen Ordner liegen (die IDE fragt beim Öffnen der .ino — auf "OK" klicken)
 */
#include <Arduino.h>
#include <SPI.h>
#include "esp_timer.h"   /* esp_timer_get_time() */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>

/* ================= Vom Nutzer änderbar: Pins und SPI-Takt ================= */
#define PIN_SCLK        10
#define PIN_MOSI         8
#define PIN_CS           9
#define PIN_DC           7
#define PIN_RES          6
#define SPI_CLOCK_HZ     20000000UL   /* 20 MHz in diesem Beispiel; bei Bildstörungen zuerst auf 8/5 MHz senken */

/* ================= ST7305 Grundparameter ================= */
#define ST7305_LCD_WIDTH      300
#define ST7305_LCD_HEIGHT     400
#define ST7305_DATA_WIDTH     75      /* 300/4 = 75 Bytes pro Zeile */
#define ST7305_BUFFER_LENGTH  15000   /* 75 * 200 */
#define ST7305_COLOR_WHITE    0x00
#define ST7305_COLOR_BLACK    0x01

#define LOGI(fmt, ...) Serial.printf("[st7305] " fmt "\r\n", ##__VA_ARGS__)

/* Treibergerät (Einzelinstanz, 15000-Byte-Framebuffer eingebettet) */
typedef struct {
    int gpio_dc;
    int gpio_res;
    int gpio_cs;
    uint32_t clock_hz;
    uint8_t rotation;                      /* 0=0° 1=90° 2=180° 3=270° (im Uhrzeigersinn) */
    uint8_t buffer[ST7305_BUFFER_LENGTH];
} st7305_dev_t;

typedef st7305_dev_t *st7305_handle_t;

static st7305_dev_t lcd_dev;               /* global einzige Instanz */

static inline void dc_cmd(st7305_handle_t dev)  { digitalWrite(dev->gpio_dc, LOW); }
static inline void dc_data(st7305_handle_t dev) { digitalWrite(dev->gpio_dc, HIGH); }

static void spi_write_byte(st7305_handle_t dev, uint8_t data)
{
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.transfer(data);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/* Register schreiben (Befehl): DC=LOW */
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);
    spi_write_byte(dev, reg);
}

/* Parameter schreiben (Daten): DC=HIGH */
static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);
    spi_write_byte(dev, data);
}

static void write_params(st7305_handle_t dev, uint8_t reg, const uint8_t *params, size_t len)
{
    write_register(dev, reg);
    for (size_t i = 0; i < len; i++) write_parameter(dev, params[i]);
}

/**
 * ST7305-Initsequenz: stimmt mit dem High-Scan-Rate-Init-Code des Herstellers HSD 4.2" 300x400 überein;
 * MADCTL=0x48 (MX=1, DO=1), 255 ms Sleep-out-Verzögerung, CASET-Spaltenfenster 0x12~0x2B.
 */
static void initial_st7305(st7305_handle_t dev)
{
    /* Hardware-Reset */
    digitalWrite(dev->gpio_res, HIGH); delay(10);
    digitalWrite(dev->gpio_res, LOW);  delay(10);
    digitalWrite(dev->gpio_res, HIGH); delay(10);

#define WR(reg, ...) do { \
        const uint8_t p[] = {__VA_ARGS__}; \
        write_params(dev, reg, p, sizeof(p)); \
    } while (0)

    WR(0xD6, 0x17, 0x02);   /* NVM Load Control */
    WR(0xD1, 0x01);         /* Booster Enable */
    WR(0xC0, 0x11, 0x04);   /* Gate Voltage: VGH=16.5V, VGL=-7V */
    WR(0xC1, 0x41, 0x41, 0x41, 0x41);  /* VSHP 5.0V x4 */
    WR(0xC2, 0x19, 0x19, 0x19, 0x19);  /* VSLP 0.5V x4 */
    WR(0xC4, 0x41, 0x41, 0x41, 0x41);  /* VSHN -3.8V x4 */
    WR(0xC5, 0x19, 0x19, 0x19, 0x19);  /* VSLN 0.5V x4 */
    WR(0xD8, 0xA6, 0xE9);   /* OSC: HPM~51Hz / LPM~1Hz */
    WR(0xB2, 0x05);         /* Frame Rate: HPM=16Hz, LPM=8Hz */
    WR(0xB3, 0xE5, 0xF6, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45); /* Gate EQ HPM */
    WR(0xB4, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45);             /* Gate EQ LPM */
    WR(0x62, 0x32, 0x03, 0x1F); /* Gate Timing Control */
    WR(0xB7, 0x13);         /* Source EQ Enable */
    WR(0xB0, 0x64);         /* Gate Line: 400 Zeilen (muss vor Sleep-out gesetzt werden) */

    write_register(dev, 0x11);  /* Sleep out */
    delay(255);

    WR(0xC9, 0x00);         /* Source Voltage Select: Gruppe 1 */
    WR(0x36, 0x48);         /* MADCTL: MX=1, DO=1 */
    WR(0x3A, 0x11);         /* Data Format: 3-write 24-bit */
    WR(0xB9, 0x20);         /* Mono-Modus (Hersteller-Relikt) */
    WR(0xB8, 0x29);         /* Panel: 1-Dot-Treiberpolaritätsinversion + Frame-Scan */

    write_register(dev, 0x21);  /* Inverse ON */

    /* WRITE RAM 300*400 Adressfenster */
    WR(0x2A, 0x12, 0x2B);   /* CASET */
    WR(0x2B, 0x00, 0xC7);   /* RASET 0~199 */
    WR(0x35, 0x00);         /* TE ON（V-Blank） */
    WR(0xD0, 0xFF);         /* Auto power down */

    write_register(dev, 0x39);  /* LPM */
    write_register(dev, 0x29);  /* DISPLAY ON */
#undef WR
}

st7305_handle_t st7305_init(int gpio_dc, int gpio_res, int gpio_cs,
                            int gpio_sclk, int gpio_mosi, uint32_t clock_hz)
{
    st7305_handle_t dev = &lcd_dev;
    dev->gpio_dc = gpio_dc;
    dev->gpio_res = gpio_res;
    dev->gpio_cs = gpio_cs;
    dev->clock_hz = clock_hz;
    dev->rotation = 0;

    pinMode(gpio_dc, OUTPUT);
    pinMode(gpio_res, OUTPUT);
    pinMode(gpio_cs, OUTPUT);
    digitalWrite(gpio_cs, HIGH);
    digitalWrite(gpio_res, HIGH);

    /* Nur MOSI, kein MISO; CS wird per Software manuell gesteuert */
    SPI.begin(gpio_sclk, -1, gpio_mosi, -1);

    initial_st7305(dev);
    memset(dev->buffer, 0, ST7305_BUFFER_LENGTH);
    LOGI("ST7305 init OK (%dx%d)", ST7305_LCD_WIDTH, ST7305_LCD_HEIGHT);
    return dev;
}

/** Framebuffer füllen (0x00 = ganz weiß / 0xFF = ganz schwarz) */
void st7305_fill(st7305_handle_t dev, uint8_t data)
{
    memset(dev->buffer, data, ST7305_BUFFER_LENGTH);
}

/** Framebuffer löschen (ganz weiß) */
void st7305_clear(st7305_handle_t dev)
{
    st7305_fill(dev, 0x00);
}
/**
 * Anzeigerichtung setzen: 0=0°, 1=90° im Uhrzeigersinn, 2=180°, 3=270° im Uhrzeigersinn.
 * Die Drehung wird über die Framebuffer-Koordinatenabbildung umgesetzt; bei 90°/270° ist die logische Auflösung 400x300.
 * Wirkt sich nur auf das nachfolgende Zeichnen aus; löscht weder den Framebuffer noch aktualisiert sie den Bildschirm sofort.
 */
void st7305_set_rotation(st7305_handle_t dev, uint8_t rotation)
{
    if (rotation <= 3) dev->rotation = rotation;
}

/** Aktuelle Richtung abrufen (0~3) */
uint8_t st7305_get_rotation(st7305_handle_t dev)
{
    return dev->rotation;
}

/** Logische Breite/Höhe der aktuellen Richtung abrufen */
int st7305_get_width(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
}

int st7305_get_height(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
}

/**
 * Logische Pixel werden zuerst je nach Richtung auf die physischen 300x400-Koordinaten abgebildet und dann in den Framebuffer geschrieben:
 *   Ein Byte (8 Bit) entspricht 2 Zeilen × 4 Spalten Pixel:
 *     Zeile0: BIT7 BIT5 BIT3 BIT1   (gerade Bits -> nächste Zeile)
 *     Zeile1: BIT6 BIT4 BIT2 BIT0
 *   1 = schwarz, 0 = weiß
 */
void st7305_write_point(st7305_handle_t dev, int x, int y, uint16_t color)
{
    int logical_width = (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
    int logical_height = (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
    if (x < 0 || y < 0 || x >= logical_width || y >= logical_height) return;

    int physical_x;
    int physical_y;
    switch (dev->rotation) {
    case 1: /* 90° im Uhrzeigersinn, logisch 400x300 */
        physical_x = ST7305_LCD_WIDTH - 1 - y;
        physical_y = x;
        break;
    case 2: /* 180°, logisch 300x400 */
        physical_x = ST7305_LCD_WIDTH - 1 - x;
        physical_y = ST7305_LCD_HEIGHT - 1 - y;
        break;
    case 3: /* 270° im Uhrzeigersinn, logisch 400x300 */
        physical_x = y;
        physical_y = ST7305_LCD_HEIGHT - 1 - x;
        break;
    default: /* 0°, logisch 300x400 */
        physical_x = x;
        physical_y = y;
        break;
    }

    int real_x = physical_x / 4;
    int real_y = physical_y / 2;
    int index = real_y * ST7305_DATA_WIDTH + real_x;
    int one_two = physical_y % 2;          /* 0 oder 1 */
    int line_bit_4 = physical_x % 4;       /* 0~3 */
    int bit = 7 - (line_bit_4 * 2 + one_two);

    if (color) dev->buffer[index] |= (1 << bit);
    else dev->buffer[index] &= ~(1 << bit);
}

/** Adressfenster setzen und RAMWR ausgeben */
static void set_address_window(st7305_handle_t dev)
{
    write_params(dev, 0x2A, (uint8_t[]){0x12, 0x2A}, 2); /* CASET 0x12~0x2A */
    write_params(dev, 0x2B, (uint8_t[]){0x00, 0xC7}, 2); /* RASET 0~199 */
    write_register(dev, 0x2C); /* RAMWR */
}

/** Vollbild-Refresh: den 15000-Byte-Framebuffer auf den Bildschirm schieben */
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);
    dc_data(dev);
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/** In den Low-Power-Modus LPM (0x39) wechseln; stromsparend, Bildrate wird durch B2h bestimmt */
void st7305_low_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x39);
}

/** In den High-Power-Modus HPM (0x38) wechseln; für bewegte Inhalte, 16/32 Hz */
void st7305_high_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x38);
}

/** Anzeige ein/aus (0x29 / 0x28) */
void st7305_display_on(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x29 : 0x28);
}

/** Invertierung ein/aus (0x21 / 0x20); ein normal-weißes Panel braucht Invertierung, um Schwarz anzuzeigen */
void st7305_display_inversion(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x21 : 0x20);
}

/** Framebuffer-Zeiger holen (fortgeschritten: Bitmap-Daten direkt manipulieren) */
uint8_t *st7305_get_buffer(st7305_handle_t dev)
{
    return dev->buffer;
}

/* ================= Grafikprimitiven (portiert aus ST73XX_UI) ================= */

#define SWAP_INT(a, b) do { int _t = (a); (a) = (b); (b) = _t; } while (0)

void ui_draw_fast_hline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x + i, y, color);
}

void ui_draw_fast_vline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x, y + i, color);
}

void ui_draw_line(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    int dx = abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    int dy = -abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    int err = dx + dy, e2;

    while (1) {
        st7305_write_point(dev, x1, y1, color);
        if (x1 == x2 && y1 == y2) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
    }
}

void ui_draw_triangle(st7305_handle_t dev, int x1, int y1, int x2, int y2,
                      int x3, int y3, uint16_t color)
{
    ui_draw_line(dev, x1, y1, x2, y2, color);
    ui_draw_line(dev, x2, y2, x3, y3, color);
    ui_draw_line(dev, x3, y3, x1, y1, color);
}

void ui_draw_filled_triangle(st7305_handle_t dev, int x0, int y0, int x1, int y1,
                             int x2, int y2, uint16_t color)
{
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }
    if (y1 > y2) { SWAP_INT(y1, y2); SWAP_INT(x1, x2); }
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }

    if (y0 == y2) { /* flacher Boden */
        int xs = x0, xe = x0;
        if (x1 < xs) xs = x1;
        if (x1 > xe) xe = x1;
        if (x2 < xs) xs = x2;
        if (x2 > xe) xe = x2;
        ui_draw_fast_hline(dev, xs, y0, xe - xs + 1, color);
        return;
    }

    int total = y2 - y0;
    for (int i = 0; i <= total; i++) {
        int y = y0 + i;
        int second_half = (i > y1 - y0) || (y1 == y0);
        int seg = second_half ? (y2 - y1) : (y1 - y0);
        if (seg == 0) continue;
        int ax = x0 + (int)((x2 - x0) * (int64_t)i / total);
        int bx = second_half ? x1 + (int)((x2 - x1) * (int64_t)(i - (y1 - y0)) / seg)
                             : x0 + (int)((x1 - x0) * (int64_t)i / seg);
        if (ax > bx) SWAP_INT(ax, bx);
        ui_draw_fast_hline(dev, ax, y, bx - ax + 1, color);
    }
}

void ui_draw_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    ui_draw_fast_hline(dev, x1, y1, x2 - x1 + 1, color);
    ui_draw_fast_hline(dev, x1, y2, x2 - x1 + 1, color);
    ui_draw_fast_vline(dev, x1, y1, y2 - y1 + 1, color);
    ui_draw_fast_vline(dev, x2, y1, y2 - y1 + 1, color);
}

void ui_draw_filled_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    for (int y = y1; y <= y2; y++) {
        ui_draw_fast_hline(dev, x1, y, x2 - x1 + 1, color);
    }
}

void ui_draw_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    int x = 0, y = r, d = 3 - 2 * r;
    while (x <= y) {
        st7305_write_point(dev, xc + x, yc + y, color);
        st7305_write_point(dev, xc - x, yc + y, color);
        st7305_write_point(dev, xc + x, yc - y, color);
        st7305_write_point(dev, xc - x, yc - y, color);
        st7305_write_point(dev, xc + y, yc + x, color);
        st7305_write_point(dev, xc - y, yc + x, color);
        st7305_write_point(dev, xc + y, yc - x, color);
        st7305_write_point(dev, xc - y, yc - x, color);
        if (d < 0) {
            d += 4 * x + 6;
        } else {
            d += 4 * (x - y) + 10;
            y--;
        }
        x++;
    }
}
static int int_sqrt(int x)
{
    int r = 0;
    while ((r + 1) * (r + 1) <= x) r++;
    return r;
}

void ui_draw_filled_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    for (int y = -r; y <= r; y++) {
        int w = int_sqrt(r * r - y * y);
        ui_draw_fast_hline(dev, xc - w, yc + y, 2 * w + 1, color);
    }
}

void ui_draw_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;
    for (int i = 0; i < n; i++) {
        int x1 = points[2 * i], y1 = points[2 * i + 1];
        int x2 = points[2 * ((i + 1) % n)], y2 = points[2 * ((i + 1) % n) + 1];
        ui_draw_line(dev, x1, y1, x2, y2, color);
    }
}

void ui_draw_filled_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;

    int min_y = points[1], max_y = points[1];
    for (int i = 1; i < n; i++) {
        if (points[2 * i + 1] < min_y) min_y = points[2 * i + 1];
        if (points[2 * i + 1] > max_y) max_y = points[2 * i + 1];
    }

    int *xs = (int *)malloc(n * sizeof(int));
    if (!xs) return;

    /* Scanline-Füllung */
    for (int y = min_y; y <= max_y; y++) {
        int cnt = 0;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            int yi = points[2 * i + 1], yj = points[2 * j + 1];
            int xi = points[2 * i], xj = points[2 * j];
            if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
                xs[cnt++] = xi + (int)((int64_t)(y - yi) * (xj - xi) / (yj - yi));
            }
        }
        /* Insertion Sort */
        for (int i = 1; i < cnt; i++) {
            int key = xs[i], k = i - 1;
            while (k >= 0 && xs[k] > key) { xs[k + 1] = xs[k]; k--; }
            xs[k + 1] = key;
        }
        for (int i = 0; i + 1 < cnt; i += 2) {
            ui_draw_fast_hline(dev, xs[i], y, xs[i + 1] - xs[i] + 1, color);
        }
    }
    free(xs);
}

/* ================= Demo: 15-seitiges Auto-Karussell =================
 * Text, geordnete Dither-Graustufen, Testmuster, Performance-Benchmark, UI-Beispiele und kleine Animationen.
 * Keine externen Fonts oder Assets. */

#define W ST7305_LCD_WIDTH
#define H ST7305_LCD_HEIGHT
#define BLACK ST7305_COLOR_BLACK
#define WHITE ST7305_COLOR_WHITE
#define ARRAY_LEN(a) ((int)(sizeof(a) / sizeof((a)[0])))

/* Klassischer 5x7-ASCII-Font, spaltenkodiert, LSB oben. */
static const uint8_t font5x7[96][5] = {
    {0x00,0x00,0x00,0x00,0x00},{0x00,0x00,0x5f,0x00,0x00},
    {0x00,0x07,0x00,0x07,0x00},{0x14,0x7f,0x14,0x7f,0x14},
    {0x24,0x2a,0x7f,0x2a,0x12},{0x23,0x13,0x08,0x64,0x62},
    {0x36,0x49,0x55,0x22,0x50},{0x00,0x05,0x03,0x00,0x00},
    {0x00,0x1c,0x22,0x41,0x00},{0x00,0x41,0x22,0x1c,0x00},
    {0x14,0x08,0x3e,0x08,0x14},{0x08,0x08,0x3e,0x08,0x08},
    {0x00,0x50,0x30,0x00,0x00},{0x08,0x08,0x08,0x08,0x08},
    {0x00,0x60,0x60,0x00,0x00},{0x20,0x10,0x08,0x04,0x02},
    {0x3e,0x51,0x49,0x45,0x3e},{0x00,0x42,0x7f,0x40,0x00},
    {0x42,0x61,0x51,0x49,0x46},{0x21,0x41,0x45,0x4b,0x31},
    {0x18,0x14,0x12,0x7f,0x10},{0x27,0x45,0x45,0x45,0x39},
    {0x3c,0x4a,0x49,0x49,0x30},{0x01,0x71,0x09,0x05,0x03},
    {0x36,0x49,0x49,0x49,0x36},{0x06,0x49,0x49,0x29,0x1e},
    {0x00,0x36,0x36,0x00,0x00},{0x00,0x56,0x36,0x00,0x00},
    {0x08,0x14,0x22,0x41,0x00},{0x14,0x14,0x14,0x14,0x14},
    {0x00,0x41,0x22,0x14,0x08},{0x02,0x01,0x51,0x09,0x06},
    {0x32,0x49,0x79,0x41,0x3e},{0x7e,0x11,0x11,0x11,0x7e},
    {0x7f,0x49,0x49,0x49,0x36},{0x3e,0x41,0x41,0x41,0x22},
    {0x7f,0x41,0x41,0x22,0x1c},{0x7f,0x49,0x49,0x49,0x41},
    {0x7f,0x09,0x09,0x09,0x01},{0x3e,0x41,0x49,0x49,0x7a},
    {0x7f,0x08,0x08,0x08,0x7f},{0x00,0x41,0x7f,0x41,0x00},
    {0x20,0x40,0x41,0x3f,0x01},{0x7f,0x08,0x14,0x22,0x41},
    {0x7f,0x40,0x40,0x40,0x40},{0x7f,0x02,0x0c,0x02,0x7f},
    {0x7f,0x04,0x08,0x10,0x7f},{0x3e,0x41,0x41,0x41,0x3e},
    {0x7f,0x09,0x09,0x09,0x06},{0x3e,0x41,0x51,0x21,0x5e},
    {0x7f,0x09,0x19,0x29,0x46},{0x46,0x49,0x49,0x49,0x31},
    {0x01,0x01,0x7f,0x01,0x01},{0x3f,0x40,0x40,0x40,0x3f},
    {0x1f,0x20,0x40,0x20,0x1f},{0x3f,0x40,0x38,0x40,0x3f},
    {0x63,0x14,0x08,0x14,0x63},{0x07,0x08,0x70,0x08,0x07},
    {0x61,0x51,0x49,0x45,0x43},{0x00,0x7f,0x41,0x41,0x00},
    {0x02,0x04,0x08,0x10,0x20},{0x00,0x41,0x41,0x7f,0x00},
    {0x04,0x02,0x01,0x02,0x04},{0x40,0x40,0x40,0x40,0x40},
    {0x00,0x01,0x02,0x04,0x00},{0x20,0x54,0x54,0x54,0x78},
    {0x7f,0x48,0x44,0x44,0x38},{0x38,0x44,0x44,0x44,0x20},
    {0x38,0x44,0x44,0x48,0x7f},{0x38,0x54,0x54,0x54,0x18},
    {0x08,0x7e,0x09,0x01,0x02},{0x0c,0x52,0x52,0x52,0x3e},
    {0x7f,0x08,0x04,0x04,0x78},{0x00,0x44,0x7d,0x40,0x00},
    {0x20,0x40,0x44,0x3d,0x00},{0x7f,0x10,0x28,0x44,0x00},
    {0x00,0x41,0x7f,0x40,0x00},{0x7c,0x04,0x18,0x04,0x78},
    {0x7c,0x08,0x04,0x04,0x78},{0x38,0x44,0x44,0x44,0x38},
    {0x7c,0x14,0x14,0x14,0x08},{0x08,0x14,0x14,0x18,0x7c},
    {0x7c,0x08,0x04,0x04,0x08},{0x48,0x54,0x54,0x54,0x20},
    {0x04,0x3f,0x44,0x40,0x20},{0x3c,0x40,0x40,0x20,0x7c},
    {0x1c,0x20,0x40,0x20,0x1c},{0x3c,0x40,0x30,0x40,0x3c},
    {0x44,0x28,0x10,0x28,0x44},{0x0c,0x50,0x50,0x50,0x3c},
    {0x44,0x64,0x54,0x4c,0x44},{0x00,0x08,0x36,0x41,0x00},
    {0x00,0x00,0x7f,0x00,0x00},{0x00,0x41,0x36,0x08,0x00},
    {0x08,0x04,0x08,0x10,0x08},{0x00,0x00,0x00,0x00,0x00}
};

static const uint8_t bayer4[4][4] = {
    {0, 8, 2, 10}, {12, 4, 14, 6}, {3, 11, 1, 9}, {15, 7, 13, 5}
};

static void text_char(st7305_handle_t d, int x, int y, char c, int scale, uint16_t color)
{
    if ((unsigned char)c < 32 || (unsigned char)c > 127) c = '?';
    const uint8_t *glyph = font5x7[(unsigned char)c - 32];
    for (int col = 0; col < 5; col++) {
        for (int row = 0; row < 7; row++) {
            if (glyph[col] & (1U << row)) {
                if (scale == 1) st7305_write_point(d, x + col, y + row, color);
                else ui_draw_filled_rectangle(d, x + col * scale, y + row * scale,
                    x + (col + 1) * scale - 1, y + (row + 1) * scale - 1, color);
            }
        }
    }
}

static void text(st7305_handle_t d, int x, int y, const char *s, int scale, uint16_t color)
{
    while (*s) {
        text_char(d, x, y, *s++, scale, color);
        x += 6 * scale;
    }
}

static int text_width(const char *s, int scale)
{
    int n = (int)strlen(s);
    return n ? (n * 6 - 1) * scale : 0;
}
static void text_center(st7305_handle_t d, int y, const char *s, int scale, uint16_t color)
{
    text(d, (W - text_width(s, scale)) / 2, y, s, scale, color);
}

static void gray_rect(st7305_handle_t d, int x0, int y0, int x1, int y1, int level)
{
    if (x0 > x1) { int t = x0; x0 = x1; x1 = t; }
    if (y0 > y1) { int t = y0; y0 = y1; y1 = t; }
    if (level <= 0) return;
    if (level >= 16) {
        ui_draw_filled_rectangle(d, x0, y0, x1, y1, BLACK);
        return;
    }
    for (int y = y0; y <= y1; y++) {
        for (int x = x0; x <= x1; x++) {
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, x, y, BLACK);
        }
    }
}

static void gray_circle(st7305_handle_t d, int cx, int cy, int r, int level)
{
    for (int y = -r; y <= r; y++) {
        for (int x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r && level > bayer4[(cy + y) & 3][(cx + x) & 3]) {
                st7305_write_point(d, cx + x, cy + y, BLACK);
            }
        }
    }
}

static void hline(st7305_handle_t d, int x0, int x1, int y, uint16_t color)
{
    ui_draw_fast_hline(d, x0, y, x1 - x0 + 1, color);
}

static void vline(st7305_handle_t d, int x, int y0, int y1, uint16_t color)
{
    ui_draw_fast_vline(d, x, y0, y1 - y0 + 1, color);
}

static void chrome(st7305_handle_t d, int page, const char *title, const char *subtitle)
{
    char buf[24];
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 31, BLACK);
    text(d, 8, 8, title, 2, WHITE);
    snprintf(buf, sizeof(buf), "%02d/15", page + 1);
    text(d, 251, 11, buf, 1, WHITE);
    text(d, 8, 39, subtitle, 1, BLACK);
    hline(d, 0, W - 1, 51, BLACK);
    hline(d, 8, W - 9, 376, BLACK);
    text(d, 8, 384, "ST7305 RLCD TEST SUITE", 1, BLACK);
    for (int i = 0; i < 15; i++) {
        int x = 210 + i * 6;
        if (i == page) ui_draw_filled_rectangle(d, x, 385, x + 3, 391, BLACK);
        else ui_draw_rectangle(d, x, 385, x + 3, 391, BLACK);
    }
}

static uint32_t rng_state = 0x7305u;
static uint32_t demo_rand(void)
{
    rng_state ^= rng_state << 13;
    rng_state ^= rng_state >> 17;
    rng_state ^= rng_state << 5;
    return rng_state;
}

static int wave(int tick, int period)
{
    int p = tick % (period * 2);
    return p < period ? p : period * 2 - p;
}

static void page_hello(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 2);
    ui_draw_filled_rectangle(d, 12, 12, 287, 387, WHITE);
    ui_draw_rectangle(d, 12, 12, 287, 387, BLACK);
    ui_draw_rectangle(d, 16, 16, 283, 383, BLACK);
    text_center(d, 54, "ST7305  /  RLCD", 2, BLACK);
    hline(d, 42, 258, 82, BLACK);
    text_center(d, 112, "HELLO", 7, BLACK);
    text_center(d, 174, "WORLD!", 7, BLACK);
    text_center(d, 247, "300 x 400  MONOCHROME", 2, BLACK);
    text_center(d, 278, "15 PAGES / AUTO CAROUSEL", 1, BLACK);
    gray_circle(d, 150, 330, 28, 5);
    ui_draw_circle(d, 150, 330, 29, BLACK);
    ui_draw_filled_circle(d, 140, 321, 3, BLACK);
    ui_draw_filled_circle(d, 160, 321, 3, BLACK);
    ui_draw_line(d, 136, 338, 142, 343, BLACK);
    ui_draw_line(d, 142, 343, 158, 343, BLACK);
    ui_draw_line(d, 158, 343, 164, 338, BLACK);
}

static void page_gray(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 1, "DITHER GRAY", "17 LEVELS / STATIC 4x4 BAYER MATRIX");
    for (int i = 0; i < 17; i++) {
        int x = 14 + i * 16;
        gray_rect(d, x, 72, x + 14, 128, i);
        ui_draw_rectangle(d, x, 72, x + 14, 128, BLACK);
    }
    text(d, 14, 136, "0%", 1, BLACK);
    text(d, 139, 136, "50", 1, BLACK);
    text(d, 259, 136, "100%", 1, BLACK);
    text(d, 14, 159, "GRADIENT", 1, BLACK);
    for (int y = 0; y < 36; y++) {
        for (int x = 0; x < 272; x++) {
            int level = x / 17;
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, 14 + x, 176 + y, BLACK);
        }
    }
    ui_draw_rectangle(d, 13, 175, 286, 212, BLACK);
    text(d, 14, 230, "DITHERED FILLS FOR UI DEPTH", 1, BLACK);
    gray_circle(d, 58, 294, 39, 3);
    gray_circle(d, 150, 294, 39, 7);
    gray_circle(d, 242, 294, 39, 12);
    ui_draw_circle(d, 58, 294, 40, BLACK);
    ui_draw_circle(d, 150, 294, 40, BLACK);
    ui_draw_circle(d, 242, 294, 40, BLACK);
    text_center(d, 347, "NO GRAY PIXELS - JUST BLACK + WHITE", 1, BLACK);
}

static void page_geometry(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 2, "GEOMETRY", "LINES / CIRCLES / TRIANGLES / POLYGONS");
    ui_draw_line(d, 12, 65, 285, 350, BLACK);
    ui_draw_line(d, 285, 65, 12, 350, BLACK);
    ui_draw_rectangle(d, 20, 75, 126, 164, BLACK);
    gray_rect(d, 23, 78, 123, 161, 4);
    ui_draw_filled_rectangle(d, 43, 97, 104, 139, BLACK);
    ui_draw_circle(d, 213, 122, 48, BLACK);
    ui_draw_circle(d, 213, 122, 38, BLACK);
    gray_circle(d, 213, 122, 27, 8);
    ui_draw_triangle(d, 24, 323, 87, 188, 143, 323, BLACK);
    ui_draw_filled_triangle(d, 176, 310, 219, 212, 271, 310, BLACK);
    const int p[] = {152,77, 168,95, 162,117, 143,117, 136,95};
    ui_draw_filled_polygon(d, p, 5, BLACK);
    text_center(d, 348, "BRESENHAM + SCANLINE FILL", 1, BLACK);
}

static void page_grid(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 3, "PIXEL GRID", "CHECK EDGES, ASPECT RATIO AND DIAGONALS");
    ui_draw_rectangle(d, 0, 58, 299, 367, BLACK);
    for (int x = 19; x < W; x += 20) gray_rect(d, x, 59, x, 366, 4);
    for (int y = 78; y < 367; y += 20) gray_rect(d, 1, y, 298, y, 4);
    ui_draw_line(d, 0, 58, 299, 367, BLACK);
    ui_draw_line(d, 299, 58, 0, 367, BLACK);
    ui_draw_circle(d, 150, 213, 100, BLACK);
    ui_draw_rectangle(d, 50, 113, 250, 313, BLACK);
    ui_draw_filled_rectangle(d, 0, 58, 5, 63, BLACK);
    ui_draw_filled_rectangle(d, 294, 58, 299, 63, BLACK);
    ui_draw_filled_rectangle(d, 0, 362, 5, 367, BLACK);
    ui_draw_filled_rectangle(d, 294, 362, 299, 367, BLACK);
    ui_draw_filled_rectangle(d, 145, 208, 155, 218, WHITE);
    ui_draw_rectangle(d, 145, 208, 155, 218, BLACK);
}

static void page_text(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 4, "TEXT & FONT", "BUILT-IN 5x7 ASCII / INTEGER SCALING");
    text_center(d, 69, "BIG TEXT 2X", 2, BLACK);
    text_center(d, 96, "HUGE 4X", 4, BLACK);
    hline(d, 18, 281, 135, BLACK);
    text(d, 14, 148, "Regular: ABCDEFGHIJKLM", 1, BLACK);
    text(d, 14, 162, "         NOPQRSTUVWXYZ", 1, BLACK);
    text(d, 14, 179, "Lower:  abcdefghijklm", 1, BLACK);
    text(d, 14, 193, "        nopqrstuvwxyz", 1, BLACK);
    text(d, 14, 214, "Digits: 0123456789", 2, BLACK);
    text(d, 14, 241, "Symbols: !#$%&*+-/<=>?", 1, BLACK);
    gray_rect(d, 14, 265, 285, 304, 12);
    text_center(d, 273, "DITHERED TEXT PANEL", 2, BLACK);
    ui_draw_filled_rectangle(d, 14, 318, 285, 348, BLACK);
    text_center(d, 327, "REVERSED TEXT", 2, WHITE);
    text_center(d, 359, "NO EXTERNAL FONT REQUIRED", 1, BLACK);
}
static void draw_toggle(st7305_handle_t d, int x, int y, bool on)
{
    ui_draw_rectangle(d, x, y, x + 35, y + 16, BLACK);
    if (on) {
        ui_draw_filled_rectangle(d, x + 2, y + 2, x + 32, y + 14, BLACK);
        ui_draw_filled_circle(d, x + 26, y + 8, 5, WHITE);
    } else {
        ui_draw_filled_circle(d, x + 9, y + 8, 5, BLACK);
    }
}

static void page_ui(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 5, "DESKTOP UI", "DITHERED CARDS / GAUGES / LIVE WIDGETS");
    gray_rect(d, 17, 67, 188, 191, 5);
    ui_draw_filled_rectangle(d, 13, 63, 184, 187, WHITE);
    ui_draw_rectangle(d, 13, 63, 184, 187, BLACK);
    text(d, 23, 74, "ENVIRONMENT", 2, BLACK);
    hline(d, 23, 174, 96, BLACK);
    text(d, 23, 109, "23.6", 4, BLACK);
    text(d, 107, 109, "C", 2, BLACK);
    text(d, 23, 145, "HUMIDITY  48%", 1, BLACK);
    text(d, 23, 161, "PRESSURE  1013", 1, BLACK);

    gray_rect(d, 200, 67, 290, 191, 7);
    ui_draw_filled_rectangle(d, 196, 63, 286, 187, WHITE);
    ui_draw_rectangle(d, 196, 63, 286, 187, BLACK);
    text(d, 207, 74, "POWER", 1, BLACK);
    int battery = 20 + wave(frame, 40) * 70 / 40;
    ui_draw_rectangle(d, 210, 99, 267, 121, BLACK);
    ui_draw_filled_rectangle(d, 267, 104, 271, 116, BLACK);
    ui_draw_filled_rectangle(d, 213, 102, 213 + battery * 50 / 100, 118, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%d%%", battery);
    text(d, 241 - text_width(buf, 2) / 2, 134, buf, 2, BLACK);
    text(d, 207, 160, "SOLAR  ON", 1, BLACK);

    ui_draw_filled_rectangle(d, 13, 204, 286, 294, WHITE);
    ui_draw_rectangle(d, 13, 204, 286, 294, BLACK);
    text(d, 24, 216, "SYSTEM ACTIVITY", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        int value = 12 + wave(frame + i * 17, 50) * 180 / 50;
        text(d, 24, 240 + i * 16, i == 0 ? "CPU" : (i == 1 ? "MEM" : "SPI"), 1, BLACK);
        gray_rect(d, 62, 240 + i * 16, 256, 248 + i * 16, 3);
        ui_draw_filled_rectangle(d, 62, 240 + i * 16, 62 + value, 248 + i * 16, BLACK);
    }
    text(d, 22, 316, "WIFI", 1, BLACK);
    draw_toggle(d, 63, 311, true);
    text(d, 118, 316, "SYNC", 1, BLACK);
    draw_toggle(d, 160, 311, (frame / 12) & 1);
    text(d, 215, 316, "LIVE", 1, BLACK);
    if ((frame / 4) & 1) ui_draw_filled_circle(d, 276, 319, 5, BLACK);
    else ui_draw_circle(d, 276, 319, 5, BLACK);
    text_center(d, 351, "A TINY REFLECTIVE DASHBOARD", 1, BLACK);
}

typedef struct {
    uint32_t last_us;
    uint32_t average_us;
    uint16_t history[54];
    int history_pos;
} perf_t;
static perf_t perf;

static void perf_record(uint32_t elapsed_us)
{
    perf.last_us = elapsed_us;
    perf.average_us = perf.average_us ? (perf.average_us * 7 + elapsed_us) / 8 : elapsed_us;
    perf.history[perf.history_pos] = (uint16_t)(elapsed_us / 100);
    perf.history_pos = (perf.history_pos + 1) % ARRAY_LEN(perf.history);
}

static void page_fps(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 6, "FRAME RATE", "UNTHROTTLED FULL-FRAME DRAW + SPI BENCHMARK");
    char buf[40];
    uint32_t avg = perf.average_us ? perf.average_us : 1;
    uint32_t fps10 = 10000000UL / avg;
    snprintf(buf, sizeof(buf), "%lu.%lu FPS", (unsigned long)(fps10 / 10), (unsigned long)(fps10 % 10));
    text_center(d, 66, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "LAST %lu.%lu ms   AVG %lu.%lu ms",
        (unsigned long)(perf.last_us / 1000), (unsigned long)((perf.last_us % 1000) / 100),
        (unsigned long)(avg / 1000), (unsigned long)((avg % 1000) / 100));
    text_center(d, 108, buf, 1, BLACK);
    text(d, 16, 132, "UPDATE TIME HISTORY", 1, BLACK);
    ui_draw_rectangle(d, 15, 148, 285, 254, BLACK);
    gray_rect(d, 16, 174, 284, 174, 3);
    gray_rect(d, 16, 201, 284, 201, 3);
    gray_rect(d, 16, 227, 284, 227, 3);
    int previous_x = -1, previous_y = -1;
    for (int i = 0; i < ARRAY_LEN(perf.history); i++) {
        int index = (perf.history_pos + i) % ARRAY_LEN(perf.history);
        int value = perf.history[index];
        int y = 250 - value * 95 / 150;
        if (y < 151) y = 151;
        if (y > 250) y = 250;
        int x = 20 + i * 5;
        ui_draw_filled_circle(d, x, y, 1, BLACK);
        if (previous_x >= 0) ui_draw_line(d, previous_x, previous_y, x, y, BLACK);
        previous_x = x; previous_y = y;
    }
    snprintf(buf, sizeof(buf), "FRAME: %d", frame + 1);
    text(d, 17, 271, buf, 1, BLACK);
    text(d, 17, 291, "15000 BYTES PER UPDATE", 2, BLACK);
    text(d, 17, 317, "SPI: 20 MHz   PANEL: 16 Hz", 1, BLACK);
    text(d, 17, 337, "CPU number is bus throughput,", 1, BLACK);
    text(d, 17, 351, "not the optical panel limit.", 1, BLACK);
    int scan = 20 + (frame * 7) % 260;
    vline(d, scan, 149, 253, BLACK);
    (void)elapsed;
}

static void page_patterns(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 7, "FINE PATTERNS", "1/2/4 PIXEL CHECKERS + LINE RESOLUTION");
    int phase = frame & 1;
    const int boxes[4][4] = {{12,66,146,184},{153,66,287,184},{12,194,146,332},{153,194,287,332}};
    for (int b = 0; b < 4; b++) {
        for (int y = boxes[b][1]; y <= boxes[b][3]; y++) {
            for (int x = boxes[b][0]; x <= boxes[b][2]; x++) {
                bool black = false;
                if (b == 0) black = ((x ^ y) & 1) == phase;
                if (b == 1) black = (((x / 2) ^ (y / 2)) & 1) == phase;
                if (b == 2) black = (((x / 4) ^ (y / 4)) & 1) == phase;
                if (b == 3) black = ((x + phase) % 4 == 0) || ((y + phase) % 4 == 0);
                if (black) st7305_write_point(d, x, y, BLACK);
            }
        }
        ui_draw_rectangle(d, boxes[b][0] - 1, boxes[b][1] - 1, boxes[b][2] + 1, boxes[b][3] + 1, BLACK);
    }
    text_center(d, 343, "CHECKER / 2PX / 4PX / GRID", 1, BLACK);
    text_center(d, 358, phase ? "PHASE B - CHECK FOR FLICKER" : "PHASE A - CHECK FOR FLICKER", 1, BLACK);
}

static struct { int x, y, vx, vy, hits; } bounce;

static void page_bounce(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 8, "BOUNCE TEST", "MOVEMENT, COLLISIONS AND PANEL GHOSTING");
    const int left = 10, right = 289, top = 65, bottom = 355;
    ui_draw_rectangle(d, left, top, right, bottom, BLACK);
    for (int y = top + 10; y < bottom; y += 20) gray_rect(d, left + 1, y, right - 1, y, 2);
    if (frame > 0) {
        bounce.x += bounce.vx;
        bounce.y += bounce.vy;
        if (bounce.x <= left + 2 || bounce.x + 91 >= right - 1) {
            bounce.vx = -bounce.vx;
            bounce.x += bounce.vx * 2;
            bounce.hits++;
        }
        if (bounce.y <= top + 2 || bounce.y + 43 >= bottom - 1) {
            bounce.vy = -bounce.vy;
            bounce.y += bounce.vy * 2;
            bounce.hits++;
        }
    }
    gray_rect(d, bounce.x + 5, bounce.y + 5, bounce.x + 96, bounce.y + 48, 5);
    ui_draw_filled_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, WHITE);
    ui_draw_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, BLACK);
    text(d, bounce.x + 9, bounce.y + 10, "RLCD", 3, BLACK);
    char buf[24];
    snprintf(buf, sizeof(buf), "WALL HITS: %d", bounce.hits);
    text_center(d, 360, buf, 1, BLACK);
}

#define STAR_COUNT 56
static struct { int x, y, z; } stars[STAR_COUNT];

static void star_reset(int i, bool initial)
{
    stars[i].x = (int)(demo_rand() % 401) - 200;
    stars[i].y = (int)(demo_rand() % 401) - 200;
    stars[i].z = initial ? 30 + (int)(demo_rand() % 220) : 250;
}
static void page_stars(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    ui_draw_filled_rectangle(d, 0, 0, W - 1, H - 1, BLACK);
    text(d, 10, 12, "STARFIELD", 2, WHITE);
    text(d, 190, 17, "56 STARS / HPM", 1, WHITE);
    hline(d, 10, 289, 38, WHITE);
    for (int i = 0; i < STAR_COUNT; i++) {
        int old_z = stars[i].z;
        stars[i].z -= 7;
        if (stars[i].z < 20) star_reset(i, false);
        int z = stars[i].z;
        int x = 150 + stars[i].x * 110 / z;
        int y = 207 + stars[i].y * 110 / z;
        int ox = 150 + stars[i].x * 110 / old_z;
        int oy = 207 + stars[i].y * 110 / old_z;
        if (x > 2 && x < 297 && y > 44 && y < 370) {
            ui_draw_line(d, ox, oy, x, y, WHITE);
            if (z < 80) ui_draw_filled_circle(d, x, y, 2, WHITE);
            else st7305_write_point(d, x, y, WHITE);
        }
    }
    hline(d, 10, 289, 377, WHITE);
    text(d, 10, 385, "WARP THROUGH A MONOCHROME GALAXY", 1, WHITE);
}

#define LIFE_W 34
#define LIFE_H 34
static uint8_t life[LIFE_H][LIFE_W];
static uint8_t life_next[LIFE_H][LIFE_W];
static int generation;

static void life_seed(void)
{
    memset(life, 0, sizeof(life));
    rng_state = 0x42030040u;
    for (int y = 2; y < LIFE_H - 2; y++) {
        for (int x = 2; x < LIFE_W - 2; x++) life[y][x] = (demo_rand() % 100) < 28;
    }
    generation = 0;
}

static void life_step(void)
{
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            int neighbors = 0;
            for (int dy = -1; dy <= 1; dy++) {
                for (int dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    int yy = (y + dy + LIFE_H) % LIFE_H;
                    int xx = (x + dx + LIFE_W) % LIFE_W;
                    neighbors += life[yy][xx];
                }
            }
            life_next[y][x] = neighbors == 3 || (neighbors == 2 && life[y][x]);
        }
    }
    memcpy(life, life_next, sizeof(life));
    generation++;
}

static void page_life(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 10, "GAME OF LIFE", "CONWAY CELLULAR AUTOMATON / TORUS WORLD");
    if (frame > 0) life_step();
    const int cell = 8, ox = 14, oy = 62;
    gray_rect(d, ox - 3, oy - 3, ox + LIFE_W * cell + 1, oy + LIFE_H * cell + 1, 3);
    ui_draw_rectangle(d, ox - 2, oy - 2, ox + LIFE_W * cell, oy + LIFE_H * cell, BLACK);
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            if (life[y][x]) ui_draw_filled_rectangle(d, ox + x * cell + 1, oy + y * cell + 1,
                ox + x * cell + 6, oy + y * cell + 6, BLACK);
        }
    }
    char buf[32];
    snprintf(buf, sizeof(buf), "GENERATION %d", generation);
    text_center(d, 352, buf, 1, BLACK);
}

static void page_clock(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 11, "UPTIME CLOCK", "ESP-TIMER / NO RTC OR NETWORK REQUIRED");
    int total = (int)(elapsed / 1000000);
    int seconds = total % 60, minutes = (total / 60) % 60, hours = total / 3600;
    int cx = 150, cy = 177, radius = 101;
    ui_draw_circle(d, cx, cy, radius, BLACK);
    ui_draw_circle(d, cx, cy, radius - 2, BLACK);
    for (int i = 0; i < 60; i++) {
        /* Lookup-Tabelle für Tick-Marken im Uhrzeigersinn; vermeidet Floats und libm. */
        static const int8_t sx[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
        static const int8_t sy[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
        if (i % 5 == 0) {
            int k = i / 5;
            int x = cx + sx[k] * 88 / 100, y = cy + sy[k] * 88 / 100;
            ui_draw_filled_circle(d, x, y, 3, BLACK);
        }
    }
    static const int8_t sec_x[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
    static const int8_t sec_y[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
    int sk = (seconds / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[sk] * 76 / 100, cy + sec_y[sk] * 76 / 100, BLACK);
    int mk = (minutes / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[mk] * 53 / 100, cy + sec_y[mk] * 53 / 100, BLACK);
    ui_draw_filled_circle(d, cx, cy, 5, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%02d:%02d:%02d", hours, minutes, seconds);
    text_center(d, 301, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "RENDER FRAME %d", frame + 1);
    text_center(d, 343, buf, 1, BLACK);
    text_center(d, 359, "1-BIT DOES NOT MEAN BORING", 1, BLACK);
}

static void tiny_mac(st7305_handle_t d, int x, int y)
{
    ui_draw_rectangle(d, x, y, x + 37, y + 47, BLACK);
    ui_draw_filled_rectangle(d, x + 4, y + 4, x + 33, y + 31, BLACK);
    ui_draw_filled_rectangle(d, x + 6, y + 6, x + 31, y + 29, WHITE);
    ui_draw_filled_rectangle(d, x + 11, y + 12, x + 13, y + 15, BLACK);
    ui_draw_filled_rectangle(d, x + 24, y + 12, x + 26, y + 15, BLACK);
    ui_draw_line(d, x + 12, y + 23, x + 16, y + 25, BLACK);
    ui_draw_line(d, x + 16, y + 25, x + 22, y + 25, BLACK);
    ui_draw_line(d, x + 22, y + 25, x + 26, y + 23, BLACK);
    ui_draw_filled_rectangle(d, x + 7, y + 38, x + 23, y + 41, BLACK);
}

static void page_retro(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 3);
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 21, WHITE);
    hline(d, 0, W - 1, 22, BLACK);
    text(d, 9, 7, "*  File  Edit  View  Special", 1, BLACK);
    text(d, 258, 7, "12:00", 1, BLACK);
    text(d, 181, 34, "RLCD OS", 2, BLACK);
    text(d, 184, 55, "System 1.0", 1, BLACK);
    tiny_mac(d, 228, 77);

    gray_rect(d, 17, 39, 212, 278, 8);
    ui_draw_filled_rectangle(d, 12, 34, 207, 273, WHITE);
    ui_draw_rectangle(d, 12, 34, 207, 273, BLACK);
    ui_draw_filled_rectangle(d, 13, 35, 206, 51, BLACK);
    text(d, 54, 39, "CONTROL PANEL", 1, WHITE);
    ui_draw_rectangle(d, 16, 38, 20, 47, WHITE);
    text(d, 24, 65, "Desktop Pattern", 1, BLACK);
    for (int y = 0; y < 36; y++) for (int x = 0; x < 56; x++) {
        if (((x / 4) ^ (y / 4)) & 1) st7305_write_point(d, 25 + x, 82 + y, BLACK);
    }
    gray_rect(d, 94, 82, 177, 117, 6);
    ui_draw_rectangle(d, 24, 81, 81, 118, BLACK);
    ui_draw_rectangle(d, 93, 81, 178, 118, BLACK);
    hline(d, 22, 196, 130, BLACK);
    text(d, 24, 141, "Double-Click Speed", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        ui_draw_rectangle(d, 26 + i * 51, 163, 37 + i * 51, 174, BLACK);
        if (i == 1) ui_draw_filled_rectangle(d, 28 + i * 51, 165, 35 + i * 51, 172, BLACK);
    }
    text(d, 24, 190, "Key Repeat Rate", 1, BLACK);
    gray_rect(d, 25, 211, 187, 218, 4);
    ui_draw_filled_rectangle(d, 25, 211, 110, 218, BLACK);
    ui_draw_rectangle(d, 25, 210, 188, 219, BLACK);
    text(d, 24, 237, "Reflective. Silent. Timeless.", 1, BLACK);

    ui_draw_filled_rectangle(d, 24, 294, 195, 353, WHITE);
    ui_draw_rectangle(d, 24, 294, 195, 353, BLACK);
    ui_draw_filled_rectangle(d, 25, 295, 194, 310, BLACK);
    text(d, 65, 299, "HELLO, WORLD!", 1, WHITE);
    text(d, 36, 322, "1 bit. Infinite ideas.", 1, BLACK);
    text(d, 36, 338, "OK", 1, BLACK);
    ui_draw_rectangle(d, 135, 324, 180, 344, BLACK);

    text(d, 236, 348, "TRASH", 1, BLACK);
    ui_draw_rectangle(d, 244, 305, 265, 337, BLACK);
    hline(d, 240, 269, 302, BLACK);
    vline(d, 250, 309, 333, BLACK);
    vline(d, 258, 309, 333, BLACK);
}
static void page_inverse(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 13, "BLACK & WHITE", "POLARITY / CONTRAST / FULL-SCREEN INVERSION");
    bool invert = (frame / 2) & 1;
    if (!invert) {
        ui_draw_filled_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "BLACK", 6, WHITE);
        text_center(d, 155, "ON", 4, WHITE);
        text_center(d, 205, "WHITE", 6, WHITE);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, WHITE);
        text_center(d, 289, "REVERSED", 3, BLACK);
    } else {
        ui_draw_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "WHITE", 6, BLACK);
        text_center(d, 155, "ON", 4, BLACK);
        text_center(d, 205, "BLACK", 6, BLACK);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, BLACK);
        text_center(d, 289, "REVERSED", 3, WHITE);
    }
    text_center(d, 357, invert ? "PHASE B" : "PHASE A", 1, BLACK);
}

static void page_rotation(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame;
    static const int angles[4] = {0, 90, 180, 270};
    uint8_t rotation = (uint8_t)((elapsed / 3000000) & 3);
    st7305_set_rotation(d, rotation);

    int width = st7305_get_width(d);
    int height = st7305_get_height(d);
    int cx = width / 2;
    int cy = height / 2 - 5;
    char buf[40];

    ui_draw_rectangle(d, 0, 0, width - 1, height - 1, BLACK);
    ui_draw_filled_rectangle(d, 0, 0, width - 1, 39, BLACK);
    snprintf(buf, sizeof(buf), "ROTATION %d DEG", angles[rotation]);
    text(d, (width - text_width(buf, 2)) / 2, 11, buf, 2, WHITE);
    snprintf(buf, sizeof(buf), "LOGICAL %d x %d / FRAMEBUFFER MAPPING", width, height);
    text(d, (width - text_width(buf, 1)) / 2, 50, buf, 1, BLACK);

    /* Asymmetrischer Pfeil + vier Eckmarkierungen machen jede Richtung eindeutig. */
    ui_draw_circle(d, cx, cy, 43, BLACK);
    ui_draw_line(d, cx, cy + 25, cx, cy - 28, BLACK);
    ui_draw_line(d, cx, cy - 28, cx - 13, cy - 14, BLACK);
    ui_draw_line(d, cx, cy - 28, cx + 13, cy - 14, BLACK);
    text(d, cx - text_width("UP", 2) / 2, cy - 10, "UP", 2, BLACK);
    snprintf(buf, sizeof(buf), "%d", angles[rotation]);
    text(d, cx - text_width(buf, 6) / 2, cy + 57, buf, 6, BLACK);

    text(d, 12, 70, "A / TOP LEFT", 1, BLACK);
    text(d, width - 12 - text_width("B / TOP RIGHT", 1), 70, "B / TOP RIGHT", 1, BLACK);
    text(d, 12, height - 39, "C / BOTTOM LEFT", 1, BLACK);
    text(d, width - 12 - text_width("D / BOTTOM RIGHT", 1), height - 39,
        "D / BOTTOM RIGHT", 1, BLACK);
    ui_draw_filled_rectangle(d, 3, 3, 9, 9, WHITE);
    ui_draw_filled_rectangle(d, width - 10, height - 10, width - 4, height - 4, BLACK);
    hline(d, 12, width - 13, height - 25, BLACK);
    text(d, (width - text_width("AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1)) / 2,
        height - 15, "AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1, BLACK);
}

typedef void (*page_draw_t)(st7305_handle_t, int, int64_t);
typedef struct {
    const char *name;
    page_draw_t draw;
    uint32_t duration_ms;
    uint16_t target_fps; /* 0 = nur einmal rendern, 65535 = ungedrosselt */
} demo_page_t;

static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    {"Geometry", page_geometry, 5000, 0},
    {"Pixel grid", page_grid, 5000, 0},
    {"Text", page_text, 5500, 0},
    {"Dashboard UI", page_ui, 9000, 4},
    {"Frame rate", page_fps, 8500, UINT16_MAX},
    {"Fine patterns", page_patterns, 6000, 2},
    {"Bounce", page_bounce, 9000, 20},
    {"Starfield", page_stars, 9000, 20},
    {"Game of Life", page_life, 12000, 3},
    {"Uptime clock", page_clock, 9000, 4},
    {"Retro desktop", page_retro, 6500, 0},
    {"Inversion", page_inverse, 6000, 2},
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};

static void page_reset(int page)
{
    if (page == 6) memset(&perf, 0, sizeof(perf));
    if (page == 8) bounce = (typeof(bounce)){25, 85, 3, 2, 0};
    if (page == 9) {
        rng_state = 0x51a7f13du;
        for (int i = 0; i < STAR_COUNT; i++) star_reset(i, true);
    }
    if (page == 10) life_seed();
}

void lcd_demo_run(st7305_handle_t lcd)
{
    if (!lcd) return;
    int page = 0;
    while (1) {
        const demo_page_t *p = &pages[page];
        st7305_set_rotation(lcd, 0);
        page_reset(page);
        LOGI("Page %d/%d: %s", page + 1, ARRAY_LEN(pages), p->name);
        int64_t started = (int64_t)esp_timer_get_time();
        uint32_t wake = millis();
        int frame = 0;
        while (1) {
            int64_t draw_started = (int64_t)esp_timer_get_time();
            st7305_clear(lcd);
            p->draw(lcd, frame, draw_started - started);
            st7305_display(lcd);
            perf_record((uint32_t)(esp_timer_get_time() - draw_started));

            if (p->target_fps == 0) {
                delay(p->duration_ms);
                break;
            }
            frame++;
            if (esp_timer_get_time() - started >= (int64_t)p->duration_ms * 1000) break;
            if (p->target_fps != UINT16_MAX) {
                uint32_t interval = 1000 / p->target_fps;
                if (!interval) interval = 1;
                wake += interval;
                int32_t wait = (int32_t)(wake - millis());
                if (wait > 0) delay(wait);
            }
            yield();
        }
        page = (page + 1) % ARRAY_LEN(pages);
    }
}

/* ================= Arduino-Einstiegspunkte ================= */

static st7305_handle_t lcd;

void setup(void)
{
    Serial.begin(115200);
    lcd = st7305_init(PIN_DC, PIN_RES, PIN_CS, PIN_SCLK, PIN_MOSI, SPI_CLOCK_HZ);

    /* Animation braucht HPM; statische Seiten behalten ihr Bild auch in LPM. */
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    lcd_demo_run(lcd);
}
```

Das ist weder Pseudocode noch ein Lehr-Auszug, der nur die Schlüsselfunktionen behält – es ist das komplette Single-File-Programm mit Low-Level-Treiber, Grafikprimitiven, eingebautem Font und dem 15-seitigen Karussell. Beim Veröffentlichen ist es am besten, diese `.ino` als Anhang oder in einem Begleit-Repository anzubieten, damit Leser keine verstreuten Schnipsel aus dem Artikeltext zusammenstückeln müssen.

Lege die Datei in einen gleichnamigen Ordner:

```text
ST7305_RLCD_Demo/
└── ST7305_RLCD_Demo.ino
```

Öffne die `.ino` in der Arduino IDE, wähle `Arduino Nano ESP32` und den passenden seriellen Port, dann kompilieren und hochladen.

### Minimaler Startablauf: Erst initialisieren, dann ins 15-Seiten-Karussell

Hier der Einstiegspunkt des kompletten Programms. Die eigentliche Arbeit machen `st7305_init()` und `lcd_demo_run()` – ersteres „weckt das Display auf", letzteres „lässt das Display Kunststücke vorführen".

```cpp
static st7305_handle_t lcd;

void setup(void)
{
    // Schritt 1: seriellen Port mit 115200 öffnen, damit man Logs sieht
    Serial.begin(115200);

    // Schritt 2: SPI und den ST7305 mit der Verkabelung von oben initialisieren
    lcd = st7305_init(
        PIN_DC, PIN_RES, PIN_CS,
        PIN_SCLK, PIN_MOSI,
        SPI_CLOCK_HZ
    );

    // Schritt 3: animierte Seiten brauchen Refresh – in den HPM (High-Refresh-Modus) wechseln
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    // Schritt 4: läuft hier endlos im Karussell – kein Zustandsautomat nötig
    lcd_demo_run(lcd);
}
```

Pins und SPI-Takt stehen gesammelt am Dateianfang – beim Boardwechsel hier zuerst anpassen:

```cpp
// Hier gehören GPIO-Nummern hin – nicht die D-Nummern aus dem Nano-Aufdruck abtippen
#define PIN_SCLK        10          // D7
#define PIN_MOSI         8          // D5 – wichtig: NICHT GPIO11
#define PIN_CS           9          // D6
#define PIN_DC           7          // D4
#define PIN_RES          6          // D3
#define SPI_CLOCK_HZ     20000000UL // 20 MHz – erst stabil, dann schnell
```

### Code-Anmerkung 1: Warum ein Frame genau 15000 Bytes groß ist

Dieses Display hat 300×400 = 120000 Pixel; jedes Pixel ist nur schwarz oder weiß und belegt theoretisch 1 Bit:

```text
120000 Bit ÷ 8 = 15000 Bytes
```

Im Datenformat dieses Beispiels entspricht ein Byte (8 Bit) des ST7305 2 Zeilen × 4 Spalten Pixel:

```text
Zeile 0: BIT7  BIT5  BIT3  BIT1
Zeile 1: BIT6  BIT4  BIT2  BIT0
```

Also ist jede Zeile nicht das übliche 300÷8, sondern 300÷4 = 75 Bytes; vertikal werden Pixel in Zweier-Zeilen gruppiert, was 400÷2 = 200 Gruppen ergibt:

```cpp
#define ST7305_DATA_WIDTH     75      // 300 ÷ 4
#define ST7305_BUFFER_LENGTH  15000   // 75 × 200
```

Der Framebuffer ist wie ein Entwurfspapier, auf dem man erst zeichnet und dann dem Display auf einmal übergibt. So verheddert sich das Zeichnen nicht mit dem SPI-Timing, und der Code bleibt pflegbar.

Die 17 Helligkeitsstufen in diesem Beispiel werden durch eine 4×4-Bayer-Matrix erzeugt, die die Dichte schwarzer und weißer Punkte steuert — die Pixeltiefe erhöht sich nicht, daher bleibt der 300×400-Framebuffer bei 15000 Bytes. Die „17 Stufen" sind die theoretische Anzahl der Dither-Muster; die tatsächlich erkennbaren Abstufungen hängen auch vom Betrachtungsabstand und der Panel-Darstellung ab.

`INVON/INVOFF` steuert die Schwarz-Weiß-Anzeigeinversion; `Dot Inversion` ist ein LCD-Treiberpolaritätsmechanismus — das sind nicht dieselben Konzepte, und es ist auch keine „zeitgesteuerte Vollbild-Inversion zur Geisterbildbeseitigung".

### Code-Anmerkung 2: Wie eine Koordinate auf einem bestimmten Bit im Framebuffer landet

Nach der Rotation werden logische Koordinaten zurück auf physische 300×400-Koordinaten abgebildet, dann werden Byte-Position und Bit-Position berechnet:

```cpp
// Schritt 1: berechnen, in welchem Byte dieses Pixel landet
int real_x = physical_x / 4;
int real_y = physical_y / 2;
int index = real_y * ST7305_DATA_WIDTH + real_x;

// Schritt 2: berechnen, welches Bit es in diesem Byte belegt
int one_two = physical_y % 2;
int line_bit_4 = physical_x % 4;
int bit = 7 - (line_bit_4 * 2 + one_two);

// Schritt 3: Bit setzen für Schwarz, löschen für Weiß
if (color) dev->buffer[index] |= (1 << bit);
else       dev->buffer[index] &= ~(1 << bit);
```

Diese verschachtelte Anordnung ist die Stelle, an der Anfänger die Rechnung am häufigsten verhauen. Wenn Grafiken schräg, zu Barcode zerhackt oder zeilenversetzt erscheinen – hier zuerst prüfen, nicht gleich an den Init-Registern „blind herumdrehen".

### Code-Anmerkung 3: Womit DC und CS eigentlich beschäftigt sind

`DC` ist wie das Etikett auf einem Paket: `LOW` heißt „das ist ein Befehl", `HIGH` heißt „das sind Bilddaten". `CS` ist wie der Appell – nur solange es LOW gezogen ist, ist das Display mit Empfangen dran.

```cpp
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);          // DC=LOW: es folgt ein Befehl
    spi_write_byte(dev, reg);
}

static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);         // DC=HIGH: es folgt ein Parameter
    spi_write_byte(dev, data);
}
```

Beim Senden eines vollen Frames schreibt das Programm 15000 Bytes am Stück, statt pro Pixel eine eigene SPI-Transaktion zu öffnen:

```cpp
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);             // Schritt 1: das Vollbild-Schreibfenster abstecken
    dc_data(dev);                        // Schritt 2: dem Display sagen, dass Daten folgen
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH); // Schritt 3: den ganzen Frame rausschicken
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}
```

Bei 20 MHz beträgt die theoretische reine SPI-Übertragungszeit für 15000 Bytes etwa 6 ms; in der Praxis kommen Befehle, Zeichnen und Programm-Scheduling dazu. Seite 7 zeigt die echten gemessenen Kosten – hier werden keine theoretischen Werte als gemessene FPS ausgegeben.

Die im Datenblatt angegebene untere Schreibzyklusgrenze entspricht etwa 33,3 MHz — das ist die Timing-Spezifikation des ST7305-Controllers, keine Garantie, dass beliebige Dupont-Kabel, Adapterplatinen oder Stromversorgungen diese Geschwindigkeit stabil erreichen. Dieses Beispiel verwendet 20 MHz; bei Bildstörungen, Verschiebungen oder instabilem Start sollte zuerst die Taktfrequenz gesenkt werden, um Verkabelung und Signalintegrität zu prüfen.

### Code-Anmerkung 4: HPM, LPM und statische Bilder sind nicht dasselbe

Am Ende der Initialisierung geht das Panel in LPM; diese Demo wechselt in `setup()` nach HPM, damit animierte Seiten geeignetere Panel-Refresh-Bedingungen bekommen.

```cpp
st7305_high_power_mode(lcd);  // 0x38 senden, um nach HPM zu wechseln
```

Mit `B2h=0x05` ist HPM hier auf 16 Hz und LPM auf 8 Hz konfiguriert. Das `target_fps` im Programm steuert nur, wie schnell der Host zeichnet – es kann der physikalischen Reaktion des Flüssigkristalls nicht befehlen, die Panel-Grenzen zu überbrechen.

Eine statische Seite mit `target_fps=0` bedeutet: einmal zeichnen und das Bild behalten, ohne erneutes Senden. Das ganze Karussell bleibt aber in HPM – es wechselt nicht auf jeder statischen Seite automatisch zurück nach LPM. Für ein echtes Low-Power-Produkt solltest du zusätzlich Moduswechsel und Partial-Refresh nach dem Timing des Datenblatts einbauen.

### Code-Anmerkung 5: Wie die 15 Beispiele automatisch rotieren

Alle Seiten leben im Array `pages[]`; jeder Eintrag enthält Name, Zeichenfunktion, Verweilzeit und Ziel-FPS:

```cpp
static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    // die anderen 12 Seiten folgen demselben Muster: Funktion, Verweilzeit, Ziel-FPS
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};
```

Andere Reihenfolge? Array-Einträge tauschen. Ein paar Sekunden mehr Sternenhimmel? `duration_ms` ändern. Eine eigene Seite? Eine Zeichenfunktion mit derselben Signatur schreiben und im Array registrieren. Kein Grund, die Karussell-Planung überall zu verstreuen.

### Code-Anmerkung 6: Warum die Vier-Wege-Rotation nicht auf MADCTL-Rätselraten beruht

Das Programm setzt die Richtung 0~3 über `st7305_set_rotation(lcd, rotation)` und bildet Koordinaten beim Schreiben in den Framebuffer ab:

| `rotation` | Anzeigerichtung     | Logische Auflösung |
| ---------: | ------------------- | ------------------ |
|          0 | 0°                  | 300×400            |
|          1 | 90° im Uhrzeigersinn | 400×300           |
|          2 | 180°                | 300×400            |
|          3 | 270° im Uhrzeigersinn | 400×300          |

Das Setzen der Richtung wirkt nur auf nachfolgendes Zeichnen – es löscht oder aktualisiert das Display nicht automatisch. Nach einem Wechsel solltest du den Framebuffer leeren und das Bild komplett neu zeichnen; am Anfang jeder Karussell-Seite setzt das Programm die Richtung auch auf 0 zurück, damit die vorherige Seite die nächste nicht „schief stellt".

## Fehlersuche: Der ST7305 zeigt nichts, zeigt Müll oder flackert

Keine Panik – 80% der „Display leuchtet nicht"-Probleme kommen aus diesen wenigen Stellen; nur die restlichen 20% müssen die Init-Register für die Schuld herhalten.

### 1. Der serielle Monitor meldet erfolgreiche Initialisierung, aber das Display bleibt ganz weiß

Schreib-only-SPI hat kein MISO-Rücklesen – der Host sagt „Übertragung fertig", selbst wenn er die Daten ins Nichts geschickt hat. Erst prüfen, ob `D5 → GPIO8` richtig verdrahtet ist, dann messen, ob VCI 3.3V ist, ob Masse geteilt wird und ob das FPC verriegelt ist. Ein paar Sekunden komplett vom Strom trennen und neu starten ist gründlicher als nur RESET zu drücken.

### 2. Das Display zeigt Inhalte, verstümmelt aber zufällig oder friert gelegentlich ein

`SPI_CLOCK_HZ` vorübergehend von 20 MHz auf 5 MHz senken, Jumperkabel kürzen und Stecker neu festsitzen. Wenn es bei niedrigerer Geschwindigkeit wieder geht, zuerst Kabellänge, Kontakte und Signalintegrität beheben – nicht mit den Gate/Source-Spannungen anfangen.

### 3. Grafiken sind versetzt, gestreift, oder Text wirkt zerhackt

`DTFORM=0x11`, das Spalten-Adressfenster und das 2-Zeilen-×-4-Spalten-Pixel-Bitmapping prüfen. Auch sicherstellen, dass logische Koordinaten im Bereich bleiben: 0°/180° ist 300×400, 90°/270° ist 400×300.

### 4. Im Dunkeln fast unsichtbar

Das ist ein vollreflektives Display ohne Hintergrundbeleuchtung – es hat nicht plötzlich Unsichtbarkeit gelernt. Umgebungsbeleuchtung dazugeben, und BLC nicht für eine Pflicht-Backlight-Leitung halten: In diesem Beispiel kann BLC offen bleiben.

### 5. Animation hinterlässt Schleier oder feine Muster flimmern

Dichte Schachbretter, Phasenwechsel und schnelle Vollbild-Invertierung sind bewusste Stresstests – nicht jede UI sieht so aus. `target_fps` der animierten Seiten senken, großflächige hochfrequente Invertierung reduzieren und HPM bestätigen; bei deutlichem Ghosting nicht weiter gegen die Panel-Physik anschreien.

Dieser Treiber benötigt keine periodischen Vollbild-Schwarz-Weiß-Inversionen zur Geisterbildbeseitigung, wie es bei manchen E-Paper-Displays üblich ist. Animierte Seiten löschen und zeichnen den Framebuffer jedes Frame neu — das ist normale Bildaktualisierung; statische Seiten werden einmal geschrieben und der Controller scannt sie kontinuierlich. Bei anhaltenden Geisterbildern sollten die Hersteller-Initialisierungsparameter, HPM/LPM-Einstellungen und der Aktualisierungsrhythmus überprüft werden, anstatt eine zeitgesteuerte Inversionsblitz hinzuzufügen.

### 6. Nach dem Umstellen auf Chinesisch nur Fragezeichen oder Kästchen

Der eingebaute Font hat nur 96 5×7-ASCII-Zeichen – kein Chinesisch. Dafür müsstest du einen zugeschnittenen chinesischen Zeichensatz importieren und über `st7305_write_point()` zeichnen; nicht einfach eine komplette große Font-Bibliothek hineinstopfen, sonst hat die Firmware mehr „Gewicht" als die UI.

### 7. Du willst erst bestätigen, dass die Hardware lebt, ohne komplexe Seiten anzusehen

Zuerst einen Wechseltest ganz schwarz / ganz weiß fahren und dabei Text-, Koordinaten- und Animationslogik vorübergehend umgehen:

```cpp
// Schritt 1: ganzen Frame auf 1 setzen – Test Vollschwarz
st7305_fill(lcd, 0xFF);
st7305_display(lcd);
delay(2000);

// Schritt 2: ganzen Frame auf 0 setzen – Test Vollweiß
st7305_fill(lcd, 0x00);
st7305_display(lcd);
delay(2000);
```

Wenn Vollschwarz und Vollweiß funktionieren, das 15-Seiten-Karussell wiederherstellen. Fehlersuche ist wie beim Arzt: erst die einfachen Untersuchungen, nicht gleich die große Operation.

## FAQ: Häufige Fragen zu ESP32-S3 und ST7305

**F: Können die SPI-Pins des ST7305 auf andere GPIOs gelegt werden?**
A: Ja. Der ESP32-S3 kann SPI über die GPIO-Matrix umleiten – ändere `PIN_SCLK`, `PIN_MOSI`, `PIN_CS`, `PIN_DC`, `PIN_RES` und verkable entsprechend um. Pins vermeiden, die das Board schon belegt, Bootstrap- und USB-bezogene Pins; nach einem Boardwechsel immer das offizielle Pinout dieses Boards prüfen – nicht blind kopieren, nur weil „alles ESP32-S3" ist.

**F: Warum muss das ST7305-Display 3.3V haben? Geht auch 5V?**
A: In diesem Beispiel nutzt das Modul-VCI 3.3V, und ESP32-S3-GPIOs sind auch 3.3V-Logik – keine 5V direkt auf VCI oder Signalpins geben. Die Versorgung muss außerdem die Masse teilen; mit nur 3.3V angeschlossen und GND vergessen, haben die Signale keine gemeinsame Referenz.

**F: Wie hoch ist die echte Bildwiederholrate des ST7305 – bedeutet 20 FPS im Code 20 Hz?**
A: Nein. In diesem Beispiel ist das Panel-HPM auf 16 Hz konfiguriert; `target_fps=20` ist nur das Zieltempo des Hosts, höchstens 20 Frames pro Sekunde zu erzeugen und zu senden. Bei 20 MHz SPI dauert das Senden von 15000 Bytes theoretisch etwa 6 ms; die echten FPS sind die „Zeichnen + SPI"-Messung auf Seite 7, und die optische Reaktion wird zusätzlich vom Panel-Modus begrenzt.

**F: Wie viel ESP32-S3-Speicher frisst der 15000-Byte-Framebuffer?**
A: Der feste Framebuffer ist 15000 Bytes, etwa 14,65 KiB, dazu kommen Font-Tabelle, Seitenzustand und temporäre Zeichenvariablen. Die Demo nutzt eine statische globale Instanz, sodass nicht pro Frame der ganze Puffer dynamisch allokiert wird.

**F: Können andere ESP32-S3-Boards diesen ST7305-Arduino-Code direkt verwenden?**
A: Die Treiberlogik ist wiederverwendbar, aber Board-Auswahl und GPIO-Mapping müssen geändert werden. Bei einem Nicht-Nano-ESP32-Board dieses Board in der Arduino IDE wählen und die 5 Steuer-GPIOs an deine tatsächliche Verkabelung anpassen; die Versorgung bleibt 3.3V, wie das Modul es verlangt.

**F: Das ST7305-Display zeigt überhaupt nichts – welchen Parameter zuerst ändern?**
A: Zuerst keine Spannungsregister anfassen. In der Reihenfolge „3.3V-Versorgung → gemeinsame Masse → FPC/Jumperkabel → D5=GPIO8 → SPI auf 5 MHz senken → Vollschwarz/Vollweiß-Test" vorgehen. Erst wenn die Hardware-Kette steht, Initsequenz und Framebuffer prüfen.

**F: Warum kann dieses 1-Bit-Monodisplay 17 Graustufen zeigen?**
A: Es hat keine echten Graustufen-Pixel – es nutzt ein 4×4-Bayer-Ordered-Dithering, um die Dichte schwarzer und weißer Punkte zu steuern, sodass das menschliche Auge aus etwas Abstand 17 Helligkeitsstufen (0–16) wahrnimmt. Vergrößert sieht man immer noch nur schwarze und weiße Punkte – „Schichtarbeit", um Tiefe vorzutäuschen.

**F: Kann das ST7305-Beispiel direkt Chinesisch anzeigen?**
A: Nicht direkt. Der eingebaute Font deckt ASCII 32–126 ab; chinesische Zeichen werden durch `?` ersetzt. Dafür müsstest du zugeschnittene chinesische Glyphen und eine Zeichenfunktion hinzufügen oder die bestehende Zeichenschnittstelle an eine Font-Bibliothek anbinden.

**F: Muss ein vollreflektives Display in einem dunklen Raum benutzt werden?**
A: Es braucht Umgebungslicht – dunkler ist nicht besser. Normale Raumbeleuchtung oder helle Umgebungen machen es leichter lesbar; im Dunkeln solltest du externe Beleuchtung dazugeben, denn dieses Beispiel hat keine Hintergrundbeleuchtung und BLC ist nicht angeschlossen.

## Ausblick: Was kannst du nach dem Anleuchten des ST7305 noch tun?

- Einen Temperatur-/Feuchtesensor anschließen und die Demo-Daten auf Seite 6 durch echte Umgebungsdaten ersetzen.
- Taster oder einen Drehencoder hinzufügen, um manuell durch die 15 Seiten zu schalten und die Verweilzeit anzupassen.
- Partial-Refresh implementieren: mit CASET/RASET ein Fenster setzen, kombiniert mit `WRMEMC 0x3C`, um Vollbild-Übertragungen zu reduzieren.
- Den TE-Frame-Sync anschließen, Frames nach dem V-Blank schreiben und die Tearing-Kontrolle bei bewegten Inhalten weiter erforschen.
- Einen zugeschnittenen chinesischen Zeichensatz hinzufügen und ein Wetter-Schild, Kalender oder eine Uhr mit niedriger Bildrate bauen.
- Auf statischen Seiten nach dem Datenblatt-Timing zurück nach LPM wechseln und den Gesamtstromverbrauch wirklich messen – dich nicht nur von den Worten „stromsparend" berieseln lassen.

## Referenzen

- [ST7305-Datenblatt (Sitronix)](https://www.sitronix.com.tw/): Registerdefinitionen, HPM/LPM-Timing und der Init-Ablauf folgen dem offiziellen Datenblatt
- [U8g2-Bibliothek](https://github.com/olikraus/u8g2): enthält den Konstruktor `U8G2_ST7305_300X400_1_4W_HW_SPI` seit v2.36
- [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library): ein Drittanbieter-Arduino-Treiber-Wrapper für den ST7305
- [Offizielle Arduino-Nano-ESP32-Dokumentation](https://docs.arduino.cc/hardware/nano-esp32/): Zuordnung von Board-Aufdruck und GPIO

Wenn du deins auch zum Leuchten gebracht hast, fang mit dem Pixelraster auf Seite 4 und dem Bildraten-Test auf Seite 7 an zu prüfen, und füge dann deine eigene UI in `pages[]` hinzu. Ein Display mit nur Schwarz und Weiß kann ein Armaturenbrett, Animationen und einen Retro-Desktop trotzdem ganz schön beschäftigt halten.
