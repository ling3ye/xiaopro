---
title: "ESP32-S3 bringt das TK015F5785-Runddisplay zum Leuchten (JD9855 QSPI) | Komplettes Tutorial für Lookup-Table-Farbanimationen"
boardId: esp32s3
moduleId: display/tft15-jd9855
category: esp32
date: 2026-07-30
intro: "Mit dem ESP32-S3 über QSPI das 1,5\" TK015F5785-Runddisplay zum Leuchten bringen (der Treiber ist tatsächlich JD9855, nicht das vom Hersteller angegebene ST77916). Ein handgeschriebener Single-File-Treiber plus drei Lookup-Table-Animationen (Plasma / Regenbogen-Palette / radiale Wellen); direkt in der Arduino IDE kompilieren und flashen, inklusive Troubleshooting-Leitfaden."
image: "https://img.lingflux.com/2026/07/8f43dd78cc005af725bd601e0a262621.jpg"
---

Schwierigkeit: ⭐⭐⭐☆☆ (mit Mikrocontroller-Vorkenntnissen schneller zu meistern; auch absolute Anfänger können es durch reines Übernehmen zum Laufen bringen)
Geschätzte Zeit: 30–45 Minuten (ohne die Wartezeit auf die Lieferung)
Testumgebung: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 (basiert auf ESP-IDF v5, es muss diese Hauptversion sein — der Grund wird weiter unten erklärt)

---

> **Kurz zusammengefasst**: Mit dem ESP32-S3 über QSPI das 1,5\" TK015F5785-Runddisplay zum Leuchten bringen — der Hersteller nennt ST77916 als Treiber, aber erst das Auslesen der IC ID zeigt, dass es in Wirklichkeit JD9855 ist. In diesem Tutorial schreiben wir mit dem in ESP-IDF integrierten `esp_lcd_panel_io` einen handgeschriebenen Mini-Treiber aus wenigen Dutzend Zeilen in einer einzigen Datei und lassen drei Lookup-Table-Animationen laufen (Plasma-Strom / Regenbogen-Palette / radiale Wellen) — ganz ohne zusätzliche Bibliotheken und ohne Aufrufe von `sin`/`atan2`/`sqrt` zur Laufzeit. Nach 30 Minuten flimmert das gesamte Display in seidig weichen Farben.

---

## Einleitung

Ich hatte anfangs auch gedacht, ein Runddisplay zum Leuchten zu bringen, sei eine „fünfminütige Sache": Strom dran, irgendeinen Farbblock hinschicken, fertig. Denn der Hersteller sagte, der Treiberchip sei ST77916, und dieser ist in der GFX library for Arduino enthalten. Nach dem Hochladen des Codes wechselte das Display aber von Schwarz nach komplett Weiß — also … gar nicht erst zum Laufen zu bringen. Später habe ich beim Hersteller den ESP-IDF-Treibercode angefordert und dabei herausgefunden, dass der eigentliche Treiber dieses Displays JD9855 ist. Die IC ID des Displays (der Rückgabewert lautet `FF 98 55 00`) bestätigte ebenfalls, dass der Treiberchip tatsächlich JD9855 ist. Damit jeder es leicht nachbauen kann, habe ich direkt mit dem in ESP-IDF integrierten `esp_lcd_panel_io` einen handgemachten Mini-Treiber aus wenigen Dutzend Zeilen geschrieben — keine Bibliothek installieren, keine Schriftarten konfigurieren, nicht einmal eine separate Header-Datei nötig; alles steckt in einer einzigen .ino und läuft.

Dieses Tutorial fasst den kompletten Ablauf zusammen, wie man dieses 1,5\" TK015F5785-Runddisplay vom Zustand „nach dem Auspacken ein Stück schwarzes Glas" bis hin zu „voller fließender Farbanimationen" bringt — inklusive Verkabelung, Treiberprinzip und drei seidig weichen Animationsalgorithmen ohne Aufrufe von `sin`/`atan2`/`sqrt`. Wer Schritt für Schritt mitmacht, hat sein Runddisplay innerhalb von 30 Minuten am Laufen.

> **TL;DR (für alle, die es eilig haben):**
>
> 1. Verkabelung: SCLK→GPIO6, D0→GPIO15, D1→GPIO7, D2→GPIO11, D3→GPIO12, CS→GPIO16
> 2. In der Arduino IDE: Board = **ESP32S3 Dev Module**, USB CDC On Boot = **Enabled**
> 3. Keine Drittanbieter-Bibliothek nötig; der Code nutzt ausschließlich das in ESP-IDF integrierte `esp_lcd_panel_io`; die Core-Version muss **v3.x** sein
> 4. Die gesamte .ino kopieren, einfügen, kompilieren, flashen — nach dem Einschalten zeigt das Display sofort eine vollflächig fließende Farbanimation; bleibt das Bild aus, sind Sie in eine Falle getappt, siehe unten unter „Troubleshooting"

---

## Versuchsergebnis

Nach dem Einschalten spielt das Display automatisch drei Farbanimationen ab, die von Lookup-Table-Algorithmen erzeugt werden, jeweils etwa 6 Sekunden lang — durchgehend ohne Ruckeln und ohne das Tearing-Gefühl eines zeilenweisen Aufbaus:

- **Plasma-Strom**: Farben fließen kontinuierlich wie eine Flüssigkeit
- **Regenbogen-Palette**: Das volle Farbspektrum rotiert langsam um den Mittelpunkt, wie eine unaufhörlich drehende Palette
- **Radiale Wellen**: Farb-Ringe breiten sich wellenförmig vom Mittelpunkt nach außen aus

Beim Einschalten startet sofort die Vollbild-Animation, kein weiterer Eingriff nötig — hervorragend als Verifikations-Versuch im Sinne von „dieses Display lebt wirklich".

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/cqIo77cn1oA?si=Y7RjMyDpAsaN92ug" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Komponentenbeschreibung

> Das Entwicklungsboard (ESP32-S3) wird hier nicht weiter ausgeführt; erläutert werden nur die Kernkomponenten außerhalb des Boards.

### TK015F5785-Runddisplay

Das TK015F5785 ist ein rundes 1,5\"-**IPS**-Display (Treiberchip JD9855). Es ist dafür zuständig, die vom ESP32-S3 gesendeten Pixeldaten als Bild darzustellen, und dient in diesem Projekt als visuelle Endstufe für die drei Lookup-Table-Animationen. Sofern nicht anders angegeben, stammen die Werte in der folgenden Tabelle aus dem vom Hersteller bereitgestellten Modul-Datenblatt:

| Parameter           | Wert / Beschreibung                                            | Quelle                       |
| ------------------- | -------------------------------------------------------------- | ---------------------------- |
| Abmessung           | 1,5 Zoll                                                       | Hersteller-Datenblatt        |
| LCD-Typ             | IPS, voller Blickwinkel                                        | Hersteller-Datenblatt        |
| Auflösung           | 360 × 360                                                      | Hersteller-Datenblatt        |
| Treiberchip         | JD9855 (gleiches Modell auch als ST77916-Variante; maßgeblich ist die gemessene IC ID) | Hersteller-Datenblatt + Messung |
| Aktiver Bereich     | Φ38,16 mm (Durchmesser)                                        | Hersteller-Datenblatt        |
| Außenmaße           | 44,32 × 44,32 × 3,5 mm                                         | Hersteller-Datenblatt        |
| Pixelabstand        | 0,106 × 0,106 mm                                               | Hersteller-Datenblatt        |
| Farbanzahl          | 65K Farben (RGB565, 16 Bit/Pixel)                              | Hersteller-Datenblatt        |
| Helligkeit          | 500 cd/m²                                                      | Hersteller-Datenblatt        |
| Hintergrundlicht    | 4 weiße LEDs parallel                                          | Hersteller-Datenblatt        |
| Arbeitstemperatur   | -20 ~ 60 °C                                                    | Hersteller-Datenblatt        |
| Schnittstellentyp   | QSPI (SCLK + D0~D3 + CS)                                       | Messung in diesem Tutorial   |
| Kommunikations-Takt | 20 MHz (Testwert in diesem Tutorial)                           | Messung                      |

> **Vor der Bestellung unbedingt die Variante klären**: Das Modul-Datenblatt des Herstellers beschreibt dieses Display als „Schnittstelle RGB / Treiberchip ST77916 **oder** JD9855" — was bedeutet, dass das gleiche Modell TK015F5785 je nach Treiber-IC- und Schnittstellenkombination ausgeliefert wird. Dieses Tutorial bezieht sich auf die **JD9855 + QSPI**-Variante (in der Einleitung wurde gerade durch das Auslesen der IC ID = `FF 98 55 00` bestätigt, dass der Chip eben nicht das vom Hersteller ursprünglich genannte ST77916 ist). Wer die ST77916- oder RGB-Schnittstellen-Variante erworben hat, muss sowohl die Initialisierungssequenz der Register als auch die Verkabelung ändern und darf den Code dieses Tutorials nicht einfach übernehmen.

Die physisch sichtbare Fläche des Runddisplays ist ein Kreis mit dem Durchmesser Φ38,16 mm; umgerechnet mit 0,106 mm/Pixel ergibt das exakt einen Pixelradius von 180 px — deshalb wird im Code mit `R2MAX = 180²` dafür gesorgt, dass Pixel außerhalb des Kreises bewusst schwarz gesetzt werden, damit der Rand des Kreises sauber erscheint (siehe auch Punkt 4 unter „Troubleshooting").

Der Auswahlgrund ist unmittelbar: Die QSPI-Schnittstelle hat gegenüber dem klassischen SPI drei Datenleitungen mehr, die Bandbreite beim Schieben von Daten ist viermal so hoch wie bei normalem SPI; bei einer Pixelmenge wie 360×360 würde eine einphasige SPI-Übertragung eine sehr unschöne Framerate liefern.

### Pin-Beschreibung

| Pin                   | Funktion                                              |
| --------------------- | ----------------------------------------------------- |
| SCLK                  | QSPI-Taktsignal                                       |
| D0 / D1 / D2 / D3     | Vier QSPI-Datenleitungen (parallele Übertragung im Quad Mode) |
| CS                    | Chip-Select, auf LOW gezogen wird das Display ausgewählt |
| BL (Hintergrundlicht) | Hintergrundlicht-Steuerung, bei einigen Modulen nicht herausgeführt |
| VCC                   | Versorgung, in der Regel 3,3 V                        |
| GND                   | Gemeinsame Masse                                      |

### JD9855 (Treiberchip)

Der JD9855 ist ein vom Chiphersteller Jadard vorgestellter, in das Display-Modul integrierter Single-Chip-TFT-LCD-Treiber-IC mit eingebautem Display-Buffer (GRAM). Er ist dafür zuständig, die empfangenen Pixeldaten in den Buffer zu schreiben und die Flüssigkristallzellen zur Farbdarstellung anzusteuern; in diesem Projekt führt er die vom `esp_lcd_panel_io` gesendete Initialisierungssequenz der Register sowie den RAMWR-Pixel-Schreibbefehl aus.

Zum Glück ist für den JD9855 **ein öffentliches Datenblatt verfügbar** (Preliminary V0.00, veröffentlicht vom Chiphersteller Jadard im Oktober 2023). Laut Datenblatt lauten die wichtigsten Spezifikationen:

| Parameter                    | Wert / Beschreibung                                                                                       | Datenblatt-Abschnitt |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------- |
| Treiberfähigkeit             | Single-Chip-SOC treibt a-Si-TFT, max. 360 RGB×390 (Dual-Gate=780) Punkte, 540 Source-Treiber-Kanäle       | Features / Intro     |
| Integrierter Frame-Buffer    | 360×390×18 Bit (ca. 315 KB GRAM)                                                                          | Features             |
| Unterstützte Schnittstellen  | 8080-Parallel (8-bit), RGB (6-bit), SPI (8/9-bit, 2-lane), **QSPI (mit DDR-Unterstützung)**, MIPI-DSI     | System Interface     |
| Farbformat                   | RGB565 (16-bit) / RGB666 (18-bit)                                                                         | Color Format         |
| I/O-Spannung                 | 1,65 V ~ 3,3 V                                                                                            | Features             |
| Arbeitstemperatur            | -40 ~ +85 °C                                                                                              | Features             |

Das Datenblatt führt die Bitdefinitionen und das Timing der Befehle 0x2A (CASET), 0x2B (RASET), 0x2C (RAMWR), 0x36 (MADCTL), 0x3A (COLMOD) usw. sauber auf — genau diese Standardbefehle werden im Code dieses Tutorials verwendet. **Zu beachten ist jedoch**: Das Datenblatt macht den Befehlssatz und das Timing öffentlich, aber Parameter wie Gamma-Korrektur, Spannungs-Boost oder herstellerspezifische Unterkommandos (in der Initialisierungssequenz dieses Textes beispielsweise `0xDE` / `0xDF` / `0xC3` als Register mit „Command-Bank-Wechsel") bleiben dennoch eine privat vom Panel-Hersteller für sein eigenes Display Stück für Stück abgestimmte Initialisierungstabelle. Man kann das Display einfach zum Leuchten bringen, indem man genau die vom Hersteller gelieferte Sequenz übernimmt; die Bedeutung jedes einzelnen Befehls muss man nicht im Detail verstehen.

---

## Stückliste (BOM)

| Komponente                                  | Menge | Bemerkung                                                                                                |
| ------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| ESP32-S3-Entwicklungsboard                  | 1     | Empfehlung: Variante mit PSRAM, damit die Winkeltabelle dorthin ausweichen kann                          |
| TK015F5785-Runddisplay-Modul (JD9855 / QSPI) | 1     | Unbedingt die Variante JD9855 + QSPI bestätigen (gleiches Modell auch als ST77916/RGB-Variante, siehe Komponentenbeschreibung) |
| Dupont-Kabel (Buchse-Buchse, je nach Stiftleiste des Moduls) | ab 6 | SCLK / D0~D3 / CS insgesamt 6 Stück, plus VCC / GND                                                      |

---

## Verkabelung

| Display-Pin           | An ESP32-S3-Pin                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| SCLK                  | GPIO6                                                                    |
| D0                    | GPIO15                                                                   |
| D1                    | GPIO7                                                                    |
| D2                    | GPIO11                                                                   |
| D3                    | GPIO12                                                                   |
| CS                    | GPIO16                                                                   |
| BL (Hintergrundlicht) | Bei diesem Modul nicht herausgeführt, nicht per Software steuerbar; dauerhaft an bei Stromversorgung |
| VCC                   | 3,3 V                                                                    |
| GND                   | GND                                                                      |

Es empfiehlt sich, nach der Verkabelung jeden Pin einzeln zu kontrollieren — das spart 80 % der Fehlersuchezeit. Da QSPI vier Datenleitungen besitzt, führt das Vertauschen von zweien davon oft nicht zu einem schwarzen Bild, sondern zu Fehlfarben, was deutlich schwerer zu diagnostizieren ist als ein komplett schwarzer Bildschirm.

---

## Zu installierende Bibliotheken

Die gute Nachricht: **Es muss keine Drittanbieter-Bibliothek installiert werden.** Der gesamte Treiber ruft direkt die in ESP-IDF integrierten Header `driver/spi_master.h`, `esp_lcd_panel_io.h` und `esp_heap_caps.h` auf; diese Header-Dateien gehören zum Arduino-ESP32-Core und sind bereits enthalten.

Die einzige harte Anforderung: Der **ESP32-Board-Core in der Arduino IDE muss v3.x sein** (basiert auf ESP-IDF v5). Der v2.x-Core basiert auf ESP-IDF v4.4; das API `esp_lcd_panel_io_tx_param` / `esp_lcd_panel_io_tx_color` hat in älteren Versionen ein anderes Verhalten und andere Header-Pfade, sodass beim Kompilieren „Symbol nicht gefunden" oder „Funktionssignatur passt nicht" gemeldet wird.

Update-Weg: Arduino IDE → Werkzeuge → Board → Board-Verwalter, nach „esp32" suchen und das espressif-Core-Paket auf Version 3.x oder neuer aktualisieren.

---

## Vollständiger Code

> Der Code ist eine einzige Datei; in eine neue .ino kopieren und kompilieren. Achtung: Der CS-Pin ist `16` (in einer alten Version wurde er fälschlich als nicht existierendes `160` angegeben; siehe Punkt 1 unter „Troubleshooting").

```cpp
/*
 * =============================================================================
 *  TK015F5785-Runddisplay (JD9855, QSPI) Single-File-Farbdemo — Arduino-IDE-Version
 * =============================================================================
 *
 *  ✦ Single-File: Treiber + Demo, alles in dieser einen .ino, einfach kopieren und einfügen, keine externen Dateien nötig.
 *
 *  Demo-Effekt (3 Szenen automatisch im Loop, jeweils ca. 6 Sekunden, alles seidig weich und durchgehend):
 *    [1] Plasma-Strom       — Farben fließen wie eine Flüssigkeit (sin-Lookup-Table)
 *    [2] Regenbogen-Palette — volles Farbspektrum + langsame Rotation (vorab berechnete Winkel-Lookup-Table)
 *    [3] Radiale Wellen     — farbige Ringe vom Zentrum nach außen (r²-Phase)
 *
 *  Beim Einschalten sofort ein vollflächig fließendes Farbbild — anschaulicher Beweis dafür, dass „Display an + Farben korrekt"; gut als Anlauf-Demo.
 *
 *  Performance-Schlüssel: Die Operationen pro Pixel in allen drei Szenen bestehen nur aus „Lookup-Table + Ganzzahl-Addition/Subtraktion"; ohne Aufrufe von sin/atan2/sqrt,
 *                         daher ist das Rendern jedes Frames sehr schnell, das zeilenweise Schreiben ist mit bloßem Auge nicht erkennbar, alles seidig weich.
 *
 *  Hardware: ESP32-S3 + TK015F5785 (JD9855, QSPI)
 *    SCLK=6  D0=15  D1=7  D2=11  D3=12  CS=16  Hintergrundlicht=-1 (nicht herausgeführt, nicht steuerbar)
 *  Abhängigkeiten: Nur den esp32-Board-Core v3.x der Arduino-IDE, keine externe Bibliothek / keine Schriftart / keine externen Header.
 *  Upload: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled, Seriell 115200.
 * =============================================================================
 */

#include <Arduino.h>
#include <math.h>
#include <initializer_list>
#include "driver/spi_master.h"
#include "esp_lcd_panel_io.h"
#include "esp_heap_caps.h"

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/* ----------------------------- Pin-Konfiguration ----------------------------- */
/* identisch zu HelloWorld / Testprogramm, bei geänderter Verkabelung synchron anpassen */
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1      /* Hintergrundlicht, -1 bedeutet keine Steuerung */ // Aktuelles Modul hat nichts herausgeführt, daher nicht steuerbar

/* =====================================================================
 *  Display-Treiber (JD9855 QSPI) — einfach übernehmen, in der Regel keine Anpassung nötig
 *  Prinzip: Arduino-ESP32 3.x basiert auf ESP-IDF, ruft direkt esp_lcd_panel_io auf, um QSPI anzusteuern.
 * ===================================================================== */
#define JD9855_SWRESET 0x01
#define JD9855_CASET   0x2A
#define JD9855_RASET   0x2B
#define JD9855_RAMWR   0x2C
#define JD9855_MADCTL  0x36
#define JD9855_COLMOD  0x3A
#define JD9855_SLPOUT  0x11
#define JD9855_DISPON  0x29

class JD9855_QSPI {
public:
    static constexpr int H_RES = 360;
    static constexpr int V_RES = 360;

    /* Standard-RGB565 */
    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b)
    {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1)
    {
        if (backlight >= 0) { pinMode(backlight, OUTPUT); digitalWrite(backlight, HIGH); }

        spi_bus_config_t buscfg = {};
        buscfg.sclk_io_num  = sclk;
        buscfg.data0_io_num = d0;
        buscfg.data1_io_num = d1;
        buscfg.data2_io_num = d2;
        buscfg.data3_io_num = d3;
        buscfg.max_transfer_sz = H_RES * V_RES * 2;
        esp_err_t ret = spi_bus_initialize(SPI2_HOST, &buscfg, SPI_DMA_CH_AUTO);
        if (ret != ESP_OK) { log_e("spi_bus_initialize: %s", esp_err_to_name(ret)); return false; }

        esp_lcd_panel_io_spi_config_t io_config = {};
        io_config.cs_gpio_num        = cs;
        io_config.dc_gpio_num        = -1;
        io_config.spi_mode           = 3;
        io_config.pclk_hz            = 20 * 1000 * 1000;
        io_config.trans_queue_depth  = 10;
        io_config.lcd_cmd_bits       = 32;
        io_config.lcd_param_bits     = 8;
        io_config.flags.quad_mode    = true;
        ret = esp_lcd_new_panel_io_spi(SPI2_HOST, &io_config, &io);
        if (ret != ESP_OK) { log_e("esp_lcd_new_panel_io_spi: %s", esp_err_to_name(ret)); return false; }

        sendCmd(JD9855_SWRESET);
        delay(20);
        sendInitCommands();
        return true;
    }

    /* RGB565-Puffer (Little-Endian) in einen rechteckigen Bereich schieben */
    void pushRect(int x, int y, int w, int h, const uint16_t *data)
    {
        if (w <= 0 || h <= 0) return;
        setAddrWindow(x, y, x + w - 1, y + h - 1);
        size_t n = (size_t)w * h;
        ensureDmaBuf(n * 2);
        for (size_t i = 0; i < n; i++) {
            uint16_t c = data[i];
            dma_buf[i * 2]     = c >> 8;
            dma_buf[i * 2 + 1] = c & 0xFF;
        }
        sendColor(JD9855_RAMWR, dma_buf, n * 2);
    }

    /* Vollbild füllen (zeilenweise, sehr geringer Speicherbedarf) */
    void fillScreen(uint16_t color)
    {
        uint8_t hi = color >> 8, lo = color & 0xFF;
        const int BUF_PIX = H_RES;
        ensureDmaBuf(BUF_PIX * 2);
        for (int i = 0; i < BUF_PIX; i++) { dma_buf[i*2] = hi; dma_buf[i*2+1] = lo; }
        for (int y = 0; y < V_RES; y++) {
            setAddrWindow(0, y, H_RES - 1, y);
            sendColor(JD9855_RAMWR, dma_buf, BUF_PIX * 2);
        }
    }

private:
    esp_lcd_panel_io_handle_t io = nullptr;
    uint8_t *dma_buf = nullptr;
    size_t   dma_buf_size = 0;

    void ensureDmaBuf(size_t need)
    {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1)
    {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data)
    {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    /* JD9855-Initialisierungssequenz vom Hersteller (portiert aus dem ESP-IDF-Treiber esp_lcd_jd9855) */
    void sendInitCommands()
    {
        sendCmd(0xFF, {0x20, 0x10, 0x00});
        sendCmd(JD9855_MADCTL, {0x00});
        sendCmd(JD9855_COLMOD, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0xDF, {0x98, 0x55});
        sendCmd(0xCE, {0x0D, 0x00});
        sendCmd(0xD8, {0x08, 0x00});
        sendCmd(0xB2, {0x30});
        sendCmd(0xB7, {0x01, 0x35, 0x01, 0x5D});
        sendCmd(0xBB, {0x1B, 0x64, 0xE3, 0x34, 0x3E, 0xF3});
        sendCmd(0xBC, {0x00, 0x1A, 0xF3, 0xC0});
        sendCmd(0xC0, {0x22, 0xC1});
        sendCmd(0xC3, {0x00, 0x01, 0x8D, 0x0B, 0x08, 0x48, 0x07, 0x04, 0x62, 0x30, 0x30});
        sendCmd(0xC4, {0x40, 0x00, 0xAD, 0x68, 0x37, 0x07, 0x04, 0x16, 0x43, 0x07, 0x04});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xD3, {0x28, 0x13});
        sendCmd(0xD9, {0x00, 0x00, 0xFF, 0x00, 0xF0, 0x00});
        sendCmd(0xDE, {0x01});
        sendCmd(0xB7, {0x17, 0xA7, 0x64, 0x3B, 0x06, 0x36, 0x18, 0x18});
        sendCmd(0xBE, {0x00});
        sendCmd(0xC1, {0x04, 0x40, 0x90, 0x08});
        sendCmd(0xC2, {0x00, 0x16, 0xDA, 0xE7});
        sendCmd(0xC4, {0x72, 0x12});
        sendCmd(0xC7, {0x00, 0x00, 0x02, 0x32, 0x10, 0x32});
        sendCmd(0xC8, {0x00, 0x00, 0x0B, 0x32, 0x12, 0x2E});
        sendCmd(0xC9, {0x00, 0x0A, 0x08, 0x06, 0x04});
        sendCmd(0xCA, {0x1E, 0x1F, 0x10, 0x17, 0x18});
        sendCmd(0xCB, {0x01, 0x0B, 0x09, 0x07, 0x05});
        sendCmd(0xCC, {0x1E, 0x1F, 0x11, 0x17, 0x18});
        sendCmd(0xCD, {0x31, 0x25, 0x27, 0x29, 0x2B});
        sendCmd(0xCE, {0x3F, 0x3E, 0x21, 0x37, 0x38});
        sendCmd(0xCF, {0x30, 0x24, 0x26, 0x28, 0x2A});
        sendCmd(0xD0, {0x3F, 0x3E, 0x20, 0x37, 0x38});
        sendCmd(0xD1, {0x06, 0x30, 0xA5, 0xDB, 0x30});
        sendCmd(0xD3, {0x3B, 0x08, 0x00, 0x00, 0x00, 0x00});
        sendCmd(0xD4, {0x67, 0x00, 0x00, 0x01, 0x00, 0x01});
        sendCmd(0xD5, {0x10, 0x10, 0x07, 0x07, 0x0F, 0x94, 0x26});
        sendCmd(0xD6, {0x00, 0x00, 0x40});
        sendCmd(0xD7, {0x01, 0x84, 0x20});
        sendCmd(0xDE, {0x02});
        sendCmd(0xB6, {0x1C});
        sendCmd(0xDE, {0x00});
        sendCmd(0x2A, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x2B, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x35);
        sendCmd(0x36, {0x00});
        sendCmd(0x3A, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0x11);            /* Sleep verlassen */
        delay(120);
        sendCmd(0x29);            /* Display einschalten */
        delay(10);
    }
};

/* =====================================================================
 *  Demo-Teil — hier besonders ansehen
 *  Idee: In jedem Frame zeilenweise die Farbe jedes Pixels berechnen und zum Display schieben.
 *        Alle „nur vom Ort, nicht von der Zeit abhängigen" Größen (sin, Farbton, Winkel) werden vorab als Lookup-Table berechnet,
 *        zur Laufzeit macht jeder Pixel nur „Lookup-Table + Ganzzahl-Addition/Subtraktion", daher sind alle drei Szenen seidig weich.
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     /* 360 */
static constexpr int H = JD9855_QSPI::V_RES;     /* 360 */
static constexpr int CX = W / 2;                  /* Mittelpunkt x */
static constexpr int CY = H / 2;                  /* Mittelpunkt y */
static constexpr int RADIUS = 180;                /* Sichtbarer Radius des Runddisplays */
static constexpr int R2MAX  = RADIUS * RADIUS;    /* r²-Schwellwert außerhalb des Kreises (180²=32400) */

static const int BLOCK_H = 40;             /* Pro Durchgang 40 Zeilen rendern + schieben, reduziert die Anzahl der Übertragungen drastisch */
uint16_t blockBuf[W * BLOCK_H];            /* Block-Puffer (360*40*2=28 KB, internes RAM, kein PSRAM nötig) */
uint8_t  sinTab[256];       /* sin-Lookup-Table: sinTab[i] = sin(i/256*2π)*127+128 */
uint16_t hsvTab[256];       /* Farbton (0-255) -> RGB565-Lookup-Table (Sättigung/Helligkeit maximal) */
uint8_t *angleTab = nullptr;/* Lookup-Table des Winkels jedes Pixels relativ zum Mittelpunkt (360*360 B), damit die Palette-Szene atan2 nicht aufruft */

/* HSV(0-359, 0-255, 0-255) -> RGB565 */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v)
{
    uint8_t region = h / 60;
    uint8_t rem    = (h - region * 60) * 255 / 60;
    uint8_t p = (uint16_t)v * (255 - s) / 255;
    uint8_t q = (uint16_t)v * (255 - (uint16_t)s * rem / 255) / 255;
    uint8_t t = (uint16_t)v * (255 - (uint16_t)s * (255 - rem) / 255) / 255;
    uint8_t r, g, b;
    switch (region) {
        case 0:  r = v; g = t; b = p; break;
        case 1:  r = q; g = v; b = p; break;
        case 2:  r = p; g = v; b = t; break;
        case 3:  r = p; g = q; b = v; break;
        case 4:  r = t; g = p; b = v; break;
        default: r = v; g = p; b = q; break;
    }
    return JD9855_QSPI::color565(r, g, b);
}

/* Beim Start die beiden Tabellen sin / Farbton erzeugen, danach beim Rendern nur Lookup */
void buildTables()
{
    for (int i = 0; i < 256; i++) {
        float s = sinf(i / 256.0f * 2.0f * (float)M_PI);
        sinTab[i] = (uint8_t)(s * 127.0f + 128.0f);
    }
    for (int h = 0; h < 256; h++) {
        hsvTab[h] = hsvTo565(h * 360 / 256, 255, 255);
    }
}

/* Für jedes Pixel den Winkel relativ zum Mittelpunkt vorab berechnen (atan2), als Lookup-Table mit Werten 0-255 speichern.
   Die Palette-Szene nutzt zur Laufzeit nur die Tabelle, statt in jedem Frame atan2f aufzurufen (das war früher die Ursache fürs Ruckeln).
   Wird nur einmal in setup berechnet, die Dauer spielt keine Rolle. Bevorzugt im internen RAM (~126 KB), sonst Ausweichen auf PSRAM;
   ist beides nicht verfügbar, auf nullptr setzen, die Szene fällt dann auf atan2f zurück (noch sichtbar, aber ruckelig). */
void buildAngleTable()
{
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab-Zuweisung fehlgeschlagen, Palette-Szene wird langsamer")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   /* -0.5..0.5 */
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);        /* ringförmig auf 0-255 abbilden */
        }
    }
    Serial.printf("[INIT] Winkeltabelle %d KB bereit (Palette-Szene wird seidig weich)\n", (int)(n / 1024));
}

inline uint8_t sin8(int phase) { return sinTab[(uint8_t)phase]; }

/* ---- Szene 1: Plasma-Strom (reine Lookup-Table) ---- */
inline uint16_t plasmaPixel(int x, int y, int t)
{
    int v = sin8(x * 3 + t)
          + sin8(y * 3 - t * 2)
          + sin8((x + y) * 2 + t / 2)
          + sin8((x - y) * 2 - t / 2);
    return hsvTab[(uint8_t)(v / 4 + t)];
}

/* ---- Szene 2: Regenbogen-Palette (Winkel-Lookup-Table + r², rein ganzzahlig) ---- */
inline uint16_t wheelPixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;                 /* Außerhalb des Kreises schwarz setzen, sauberer Rand */
    int ang = angleTab ? angleTab[y * W + x]
                       : (int)(atan2f((float)dy, (float)dx) / (2.0f * (float)M_PI) * 256.0f);
    int hue = ang + r2 / 200 + t;             /* Farbton radial überlagern, Spiral-Palette erzeugen */
    return hsvTab[(uint8_t)hue];
}

/* ---- Szene 3: Radiale Wellen (r² direkt als Phase, keine Wurzel nötig) ---- */
inline uint16_t ripplePixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;
    int v = sin8(r2 / 80 - t * 3);            /* Wellenphase: breitet sich mit Abstand + Zeit aus */
    return hsvTab[(uint8_t)(v + r2 / 400)];
}

/* Ein Frame rendern: jedes Mal BLOCK_H Zeilen berechnen, dann als Ganzes schieben (9 Übertragungen statt 360, spart Befehls-Overhead und hebt die Framerate,
   und lässt jeweils 40 Zeilen gleichzeitig auffrischen, was den Eindruck des zeilenweisen Aufbaus stark abschwächt). sceneId wählt die Pixel-Funktion (0=plasma 1=wheel 2=ripple) */
void renderFrame(int sceneId, int t)
{
    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = (H - by < BLOCK_H) ? (H - by) : BLOCK_H;
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            for (int x = 0; x < W; x++) {
                uint16_t c;
                switch (sceneId) {
                    case 0:  c = plasmaPixel(x, yy, t); break;
                    case 1:  c = wheelPixel(x, yy, t);  break;
                    default: c = ripplePixel(x, yy, t); break;
                }
                blockBuf[y * W + x] = c;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* Szenennamen */
const char *SCENE_NAMES[] = { "Plasma-Strom", "Regenbogen-Palette", "Radiale Wellen" };
const int      N_SCENES   = 3;
const uint32_t SCENE_MS   = 6000;    /* Jede Szene bleibt 6 Sekunden stehen */

int      curScene   = 0;
uint32_t sceneStart = 0;

/* ----------------------------- setup ------------------------------- */
void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[TK015F5785] Single-File-Farbdemo (JD9855 QSPI)"));

    Serial.println(F("[LCD] begin..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] init FAILED! Pins/Board-Core-Version prüfen (esp32 v3.x nötig)"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] init OK"));

    buildTables();
    buildAngleTable();          /* Winkeltabelle vorab berechnen, damit die Palette-Szene seidig weich läuft */
    lcd.fillScreen(0);
    sceneStart = millis();
    Serial.printf("[DEMO] Szene 1/%d: %s\n", N_SCENES, SCENE_NAMES[curScene]);
}

/* ----------------------------- loop -------------------------------- */
void loop()
{
    int t = (int)(millis() / 12);     /* Fortschritts-Schrittweite der Animation, größer = schneller */

    renderFrame(curScene, t);

    if (millis() - sceneStart >= SCENE_MS) {
        sceneStart = millis();
        curScene   = (curScene + 1) % N_SCENES;
        Serial.printf("[DEMO] Szene %d/%d: %s\n",
                      curScene + 1, N_SCENES, SCENE_NAMES[curScene]);
    }
}
```

### Code-Erläuterung

Im ersten Schritt wird in `JD9855_QSPI::begin()` mit `spi_bus_initialize` eine QSPI-Bus über vier Datenleitungen aufgebaut und anschließend mit `esp_lcd_new_panel_io_spi` ein LCD-IO-Gerät mit `quad_mode = true` angemeldet — dieser Schritt ist der Schlüssel, damit der Treiber überhaupt läuft. Ohne aktivierten `quad_mode` ist von den vier Datenleitungen nur eine wirklich aktiv, und die Framerate stürzt auf einen unbrauchbaren Wert ab.

Im zweiten Schritt kopiert `sendInitCommands()` die vom Panel-Hersteller bereitgestellte Register-Initialisierungstabelle eins zu eins und sendet sie Befehl für Befehl über `esp_lcd_panel_io_tx_param`. Die Bedeutung jedes Registers muss nicht verstanden werden; wer das Display wechselt, ändert diesen Abschnitt nicht.

Der dritte Schritt ist der eigentliche Clou dieses Codes: Keine der drei Animationsszenen ruft zur Laufzeit langsame Funktionen wie `sin`, `atan2` oder `sqrt` auf, sondern berechnet sie bereits in der `setup()`-Phase als Lookup-Tabellen (`sinTab`, `hsvTab`, `angleTab`). Zur Laufzeit macht jeder Pixel nur „Lookup-Table + Ganzzahl-Addition/Subtraktion" — und genau deshalb bleiben 360×360 = 129.600 Pixel pro Frame seidig weich und ohne Tearing.

Im vierten Schritt schiebt `renderFrame()` nicht zeilenweise, sondern sammelt erst `BLOCK_H = 40` Zeilen und ruft dann blockweise `pushRect` auf. Für 360 Zeilen genügen so 9 Übertragungen, was im Vergleich zu 360 einzelnen Übertragungen eine Menge SPI-Befehls-Overhead einspart.

---

## Troubleshooting

Keine Panik — die folgenden Probleme machen den Großteil der Fehler beim Inbetriebnehmen eines Runddisplays aus:

**1. Nach dem Einschalten komplett schwarz und auf der seriellen Konsole erscheint auch kein `[LCD] init OK`.** Zuerst prüfen, ob der CS-Pin richtig angeschlossen ist — das ist die Falle, in die man beim Draft dieses Codes am leichtesten tappt: `PIN_LCD_CS` war zeitweise fälschlich als `160` angegeben (eine nicht existierende GPIO-Nummer); im Code-Block dieses Artikels ist der Wert bereits auf `16` korrigiert. Wer den Code von anderswo als alte Version kopiert hat, sollte unbedingt sicherstellen, dass diese Zeile `16` und nicht `160` lautet.

**2. Display leuchtet, aber mit Fehlfarben und gestörten Farben.** Sehr wahrscheinlich ist die Reihenfolge der vier Datenleitungen D0~D3 vertauscht. QSPI ist empfindlich gegenüber der Reihenfolge der Leitungen — etwas anderes als ein falsch angeschlossenes MOSI/MISO bei normalem SPI. Am besten jede Leitung anhand der Verkabelungstabelle einzeln kontrollieren und nicht „nach Gefühl" einstecken.

**3. Der Compiler meldet einen Fehler und vermisst `esp_lcd_panel_io.h`.** Das bedeutet, dass der aktuelle Arduino-ESP32-Core noch v2.x ist (basiert auf ESP-IDF v4.4). Im Board-Verwalter den esp32-Core von espressif auf v3.x oder neuer aktualisieren und dann erneut kompilieren.

**4. Die vier Ecken des Runddisplays sind dauerhaft schwarz — ist es etwa falsch angeschlossen?** Das ist das normale Verhalten, kein Fehler. Im Code ist `R2MAX = 180²` gesetzt; Pixel außerhalb dieses Radius werden bewusst schwarz gehalten, weil die physisch sichtbare Fläche des Runddisplays ohnehin ein Kreis ist und die vier Ecken ohnehin vom Rahmen verdeckt werden. So wird der Rand sogar sauberer.

**5. Auf der seriellen Konsole erscheint `angleTab-Zuweisung fehlgeschlagen`, die Palette-Szene wird ruckelig.** Dann reicht das interne RAM nicht aus, um diese rund 126 KB (360×360 Byte) große Winkeltabelle zu reservieren. Der Code enthält bereits eine Ausweich-Logik: Zuerst wird das interne RAM versucht, bei Misserfolg auf PSRAM ausgewichen, und wenn das auch nicht klappt, wird direkt zur Laufzeit `atan2f` berechnet (sichtbar, aber spürbar langsamer). Wenn Ihr Entwicklungsboard keinen PSRAM hat und die Palette-Szene Ihnen immer ruckeliger vorkommt als die anderen beiden, ist das der Grund; ein Board mit PSRAM behebt das Problem nachhaltig.

**6. Das Hintergrundlicht brennt dauerhaft und lässt sich nicht ausschalten.** Im Code ist `PIN_LCD_BL` auf `-1` gesetzt, und der Kommentar sagt ebenfalls „Aktuelles Modul hat nichts herausgeführt, daher nicht steuerbar" — falls Ihr Modul tatsächlich einen Pin für die Hintergrundlicht-Steuerung herausführt, ändern Sie dieses Makro auf die entsprechende GPIO-Nummer und übergeben es in `begin()`, dann lässt sich die Helligkeit per Software regeln bzw. ein- und ausschalten.

---

## FAQ — Fragen und Antworten

**F: Wie bringt der ESP32 ein rundes Display zum Leuchten?** A: Der Kern besteht darin, über die QSPI-Schnittstelle + `esp_lcd_panel_io` direkt mit dem Treiberchip zu sprechen und sich nicht auf eine allgemeine Grafikbibliothek wie TFT_eSPI zu verlassen. Bei der Verkabelung sind die fünf Leitungen SCLK/D0~D3/CS korrekt zuzuordnen; die Register-Initialisierungstabelle wird einfach als die vom Panel-Hersteller gelieferte Sequenz übernommen — und schon leuchtet das Display.

**F: Welche Bibliothek wird für ein JD9855-getriebenes Runddisplay verwendet?** A: Es wird keine zusätzliche Bibliothek gebraucht. Der JD9855 ist weder in TFT_eSPI noch in der offiziellen LVGL-Treiberliste enthalten; am sichersten ist es, wie in diesem Artikel, direkt die im ESP-IDF enthaltene `esp_lcd_panel_io`-API aufzurufen und die wenige Dutzend Zeilen Initialisierungscode selbst zu schreiben.

**F: Worin unterscheidet sich die Verkabelung eines QSPI-Displays von der eines normalen SPI-Displays?** A: Ein normales SPI hat nur eine Datenleitung (MOSI), QSPI hat vier (D0~D3), die parallel übertragen; die Bandbreite ist viermal so hoch wie bei normalem SPI. Dafür steigen die Leitungen um drei, und in `esp_lcd_panel_io_spi_config_t` muss `flags.quad_mode` auf `true` gesetzt werden.

**F: Wieso bleibt ein ESP32-S3-Runddisplay dauerhaft schwarz?** A: Die drei häufigsten Ursachen, nach Wahrscheinlichkeit geordnet: Der CS-Pin ist falsch angeschlossen oder die Nummer ist im Code falsch; die Board-Core-Version liegt unter v3.x, wodurch die Initialisierung fehlschlägt; die Spannungsversorgung ist instabil (bei längeren QSPI-Leitungsführungen besonders spürbar). Ob auf der seriellen Konsole `[LCD] init OK` erscheint, hilft schnell einzuordnen, ob das Problem in der Treiber-Schicht oder in der Verkabelung liegt.

**F: Wie treibt man in Arduino ein Display mit esp_lcd_panel_io an?** A: In drei Schritten: Mit `spi_bus_initialize` den SPI-Bus aufbauen, mit `esp_lcd_new_panel_io_spi` das LCD-IO-Handle erzeugen (in diesem Schritt werden CS/Taktfrequenz/SPI-Modus/quad_mode festgelegt) und schließlich über `esp_lcd_panel_io_tx_param` Befehle bzw. über `esp_lcd_panel_io_tx_color` Pixeldaten senden.

**F: Kann man bei einem ESP32-Runddisplay die TFT_eSPI-Bibliothek verwenden?** A: TFT_eSPI richtet sich vor allem an die Treiberchips in seiner integrierten Support-Liste; ein exotischer QSPI-Treiber wie der JD9855 gehört nicht dazu. Wenn man es trotzdem erzwingt, muss man meist die Treiber-Schicht selbst anpassen — es ist entspannter, direkt die native ESP-IDF-API per Hand zu verwenden.

**F: Reicht der Speicher für ein 360×360-Runddisplay aus?** A: Ja, aber auf die Art der Reservierung achten. Ein kompletter Frame-Buffer benötigt 360×360×2 Byte ≈ 253 KB. In diesem Artikel kommt ein blockweises Rendering zum Einsatz (jeweils 40 Zeilen, rund 28 KB), zusammen mit der optionalen 126 KB großen Winkel-Lookup-Table passt das im Wesentlichen ins interne RAM — es ist nicht nötig, nur für dieses Display extra PSRAM aufzulöten (außer man möchte auch die Winkeltabelle unbesorgt im internen RAM belassen).

---

## Erweiterte Spielereien

Sobald die Basis-Demo läuft, bietet dieses Runddisplay noch viele weitere Möglichkeiten zum Ausprobieren:

- Die drei Lookup-Table-Szenen durch Echtzeit-Datenvisualisierungen ersetzen (CPU-Last, Wetter, Herzfrequenz usw.; die runde Form eignet sich hervorragend für Armaturen)
- Touch oder Drehgeber anschließen und daraus ein interaktives rundes Bedienfeld bauen
- Mit dem gleichen `esp_lcd_panel_io`-Ansatz auch Displays mit anderen QSPI-Treiberchips portieren
- `BLOCK_H` und `pclk_hz` erhöhen, um einen Framerate-Stresstest durchzuführen und die maximale Wiederholfrequenz Ihres konkreten Moduls herauszufinden

---

## Referenzen

- <cite index="3-1">Die offizielle ESP-IDF-Dokumentation zum LCD-Peripheriegerät beschreibt die esp_lcd-Komponente als ein von Espressif bereitgestelltes, chipübergreifendes Universal-API zur Unterstützung verschiedenster Displays wie SPI-LCD, I80-LCD, RGB/SRGB-LCD usw.</cite>: [ESP-IDF LCD Peripheral (ESP32-S3)](https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32s3/api-reference/peripherals/lcd.html)
- [Offizielles Datenblatt der ESP32-S3-Serie (PDF, Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Offizielles GitHub-Repository espressif/arduino-esp32](https://github.com/espressif/arduino-esp32)
- <cite index="3-2">Das öffentliche Datenblatt des JD9855 (Preliminary V0.00, veröffentlicht vom Chiphersteller Jadard am 17.10.2023; unten ein von OSPTek gespiegeltes PDF) listet 540 Source-Treiber-Kanäle, eine Auflösung von 360 RGB×390, integrierten GRAM, mehrere Schnittstellen (8080/SPI/QSPI/MIPI-DSI) sowie das vollständige Timing der Befehle CASET/RASET/RAMWR usw.</cite>: [JD9855 Data Sheet (Preliminary V0.00, PDF)](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
