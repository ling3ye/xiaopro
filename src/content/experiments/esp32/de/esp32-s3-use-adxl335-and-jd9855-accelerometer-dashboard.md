---
title: "ESP32-S3 + ADXL335 treibt JD9855-Runddisplay als 3-Achsen-Beschleunigungs-Dashboard an | Warum Schütteln stärker sichtbar ist als Neigen"
boardId: esp32s3
moduleId: display/tft15-jd9855
moduleIds:
  - display/tft15-jd9855
  - sensor/adxl335
category: esp32
date: 2026-08-05
intro: "Mit ESP32-S3 + ADXL335 (GY-61) ein JD9855-QSPI-Runddisplay als Echtzeit-3-Achsen-Beschleunigungs-Dashboard betreiben – inkl. Verdrahtung, vollständigem Arduino-Code und Fehlerbehandlung. Außerdem die physikalische Erklärung, warum \"Schütteln stärker als Neigen\" sichtbar ist."
image: "https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg"
---

> Schwierigkeit: ⭐⭐☆☆☆ (grundlegende Arduino-Erfahrung reicht aus)
> Geschätzte Zeit: 30–40 Minuten (inkl. Kalibrierung und Fehlersuche)
> Testumgebung: Arduino IDE 2.3.8 · ESP32 Arduino Core 3.3.10

---

> **TL;DR (Schnellstart):**
> 1. Verdrahte Display (QSPI, 6 Leitungen) und ADXL335 (analoge Eingänge X/Y/Z) gemäß Tabelle
> 2. GPIO5 / GPIO9 / GPIO10 liegen alle im ADC1-Bereich des ESP32-S3 – kein Konflikt mit Wi-Fi
> 3. Nach dem Einschalten Gerät flach und ruhig liegen lassen, damit das Programm den Nullpunkt automatisch kalibriert (ca. 1 Sekunde)
> 4. Gerät langsam neigen oder kräftig schütteln und die Reaktion der dreifarbigen Ringe + zentralen Nadel auf dem Runddisplay beobachten

---

## Einleitung

Zwei Tage gebastelt – die 3-Achsen-Daten des ADXL335 live auf ein 360×360-Runddisplay gezaubert. Wenn man das Gerät langsam neigt, bewegt sich die Nadel kaum; einmal kurz gezuckt oder kräftig geschüttelt – zack, dreht sich die Nadel um eine halbe Umdrehung. Ich dachte zuerst, die Kalibrierung sei falsch. Nach etwas Recherche wurde mir klar: Dieses Ding ist von Haus aus keine reine „Neige-Messstation" – es misst Beschleunigung, und je heftiger man schüttelt, desto extremer fallen die Werte aus. Das ist Design, kein Bug. Außerdem habe ich festgestellt, dass meine selbstgebaute ESP32-S3-Platine Strommäßig nicht ganz reicht – sobald Sensor und Display kommen, wird es zeitweise spürbar dunkler. Da ist wohl ein Upgrade meiner ESP32-S3-Platine fällig.

Dieser Artikel enthält also neben kompletter Verdrahtung, Code und Fallstrichen auch eine Erklärung, **warum Schütteln viel deutlicher sichtbar ist als Neigen** – damit du bei der Reproduktion nicht am selben Punkt zweifelst.

---

## Ergebnis des Experiments

Das 360×360-Runddisplay zeigt in Echtzeit die 3-Achsen-Beschleunigungsdaten des ADXL335 (Achtung: Beschleunigung, kein reiner Lagewinkel): Die äußeren Ringe in Rot/Grün/Blau entsprechen den X-/Y-/Z-Achsen, die farbige Nadel in der Mitte zeigt in Richtung der aktuellen resultierenden Kraft. Je heftiger man schüttelt, desto stärker schlägt die Nadel aus. Am Rand läuft zusätzlich ein atmender Lichteffekt als Deko.

![](https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg)

---

## Bauteile

> Die ESP32-S3-Platine braucht keine Vorstellung – wer diesen Artikel liest, hat schon mit ESP32 gearbeitet. Hier gehen wir nur auf die beiden anderen Kernkomponenten ein.

### ADXL335-Beschleunigungssensor (GY-61-Modul)

Der ADXL335 macht etwas Ähnliches wie eine Waage – er weiß nicht, ob du „gerade" stehst, sondern nur, wie groß die aktuelle Kraft ist, und zerlegt diese in X-/Y-/Z-Komponenten. Es handelt sich um einen 3-Achsen-MEMS-Beschleunigungssensor mit analoger Ausgangsspannung, der die resultierende Kraft auf das Gerät (Schwerkraftkomponente + Beschleunigung durch Bewegung) in drei analoge Spannungssignale umwandelt.

| Parameter | Wert |
| --- | --- |
| Typ | 3-Achsen-MEMS-Beschleunigungssensor, analoger Ausgang |
| Messbereich | ±3.6g (typisch) / ±3g (mindestgarantiert) |
| Empfindlichkeit | 300 mV/g (typisch bei VS = 3V, proportional zur Versorgung) |
| Versorgungsspannung | 1.8V – 3.6V |
| Bandbreite (GY-61-Moduldefault) | ca. 50Hz (durch onboard 0.1μF-Filterkondensator festgelegt) |
| Rauschdichte | X/Y ca. 270 µg/√Hz, Z ca. 550 µg/√Hz (Z ca. 2× so hoch wie X/Y) |

Warum dieses Modul? Einfach: günstig, analoger Ausgang, einfache Verdrahtung – jeder ADC-Pin liest die Daten. Ideal für kleine Visualisierungs-Spielzeuge. Wer keine professionelle Lageberechnung braucht, kommt damit vollständig hin.

### Pin-Belegung

**ADXL335 (GY-61)**

| Modul-Pin | Beschreibung |
| --- | --- |
| VCC / GND | 3.3V-Versorgung |
| X / Y / Z | drei analoge Ausgänge, an ADC-Pins anschließen |
| ST | Self-Test-Pin, in der Regel unbeschaltet |

### TK015F5785-Runddisplay (JD9855-Treiber, QSPI-Interface)

Dieses Display kannst du dir als „Leinwand, die nur vier Datenleitungen versteht" vorstellen – der JD9855 ist der Treiberchip, der die vom MCU kommenden Farbdaten auf jeden Pixel schiebt; das QSPI-Interface (4-Draht-Seriell) liefert mit weniger Pins höhere Bildraten. Es ist ein rundes 1.5″ TFT mit 360×360 Auflösung, das über fünf Signalleitungen (SCLK/D0-D3/CS) + Versorgung angesteuert wird – ein zusätzlicher DC-Pin (Data/Command) ist nicht nötig.

| Parameter | Wert |
| --- | --- |
| Größe | 1.5″ rundes IPS |
| Auflösung | 360 × 360 |
| Treiberchip | JD9855 |
| Interface | QSPI (4-Draht) |
| Versorgung | 3.3V |
| Helligkeit/Kontrast | gemäß Datenblatt des Verkäufers (verschiedene Chargen können abweichen) |

Auch die Wahl ist direkt eingängig: Ein Runddisplay eignet sich für Dashboard-artige Visualisierungen von Natur aus ästhetisch, QSPI belegt nur 5 GPIOs und ist damit stromsparender als parallele Interfaces – und der DMA des ESP32-S3 kommt problemlos mit.

### Pin-Belegung

**Display TK015F5785 (JD9855 QSPI)**

| Display-Pin | Beschreibung |
| --- | --- |
| SCLK | QSPI-Takt |
| D0 ~ D3 | QSPI 4-Draht-Daten |
| CS | Chip-Select |
| VCC / GND | 3.3V-Versorgung |

---

## Stückliste (BOM)

| Bauteil | Modell/Parameter | Menge | ca. Preis | Verwendung |
| --- | --- | --- | --- | --- |
| Mainboard | ESP32-S3-Entwicklerboard | 1 | ca. 30–50 Yuan | MCU + Wi-Fi/Bluetooth-Reserve |
| Runddisplay | TK015F5785 (JD9855, 360×360, QSPI) | 1 | je nach Verkäufer | Anzeige |
| Beschleunigungssensor | ADXL335 (GY-61-Modul) | 1 | ca. 8–15 Yuan | Erfassung der 3-Achsen-Beschleunigung |
| Dupont-Kabel | Buchse-auf-Buchse | mehrere | – | Verdrahtung |

---

## Verdrahtung

**Display → ESP32-S3**

| Display-Pin | ESP32-S3-Pin |
| --- | --- |
| SCLK | GPIO6 |
| D0 | GPIO15 |
| D1 | GPIO7 |
| D2 | GPIO11 |
| D3 | GPIO12 |
| CS | GPIO16 |
| VCC | 3.3V |
| GND | GND |

**ADXL335 → ESP32-S3**

| Modul-Pin | ESP32-S3-Pin |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| X | GPIO5 (ADC1) |
| Y | GPIO9 (ADC1) |
| Z | GPIO10 (ADC1) |

Empfehlung: Nach der Verdrahtung jeden Pin einzeln abgleichen – das spart 80 % der Fehlerbehandlung. Besonders die vier D0~D3-Leitungen des Displays: Einer vertauscht → meist Pixelmüll oder schwarzer Bildschirm.

---

## Benötigte Bibliotheken

Es müssen keine Drittanbieter-Bibliotheken installiert werden. Der Display-Treiber ruft direkt die ESP-IDF-eigenen `esp_lcd_panel_io`- und `driver/spi_master`-Schnittstellen auf und ist handgeschrieben – in der Bibliotheksverwaltung musst du nichts suchen.

Die einzige versionssensible Stelle:

- Arduino IDE: 2.3.8 (getestet)
- ESP32-Boardpaket (esp32 by Espressif Systems): **3.3.10** (basierend auf ESP-IDF 5.x) – muss v3.x sein, da das `quad_mode`-Flag und einige DMA-Schnittstellen im alten v2.x-Core nicht vollständig vorhanden sind
- Board-Auswahl: ESP32S3 Dev Module, USB CDC On Boot auf Enabled setzen

---

## Code

```cpp
/*
 * =============================================================================
 *  ADXL335 + TK015F5785 Runddisplay —— 3-Achsen-Beschleunigungs-Dashboard
 *  =====================================================================
 *
 *  Einzelne Szene: 3-Achsen-Beschleunigungs-Dashboard —— zeigt Echtzeitdaten
 *  der drei Achsen + Ausrichtung der resultierenden Kraft, zentrale Nadel
 *  zeigt in Richtung der resultierenden Kraft
 *
 *  Hardware: ESP32-S3 + TK015F5785 (JD9855 QSPI) + ADXL335 (GY-61)
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                          Verdrahtung                                │
 *  ├─────────────────────────────────────────────────────────────────────┤
 *  │  【Display TK015F5785】        │  【ADXL335 (GY-61)】                 │
 *  │  SCLK  → GPIO6                 │  VCC → 3.3V                         │
 *  │  D0    → GPIO15                │  GND → GND                          │
 *  │  D1    → GPIO7                 │  X   → GPIO5 (ADC)                  │
 *  │  D2    → GPIO11                │  Y   → GPIO9 (ADC)                  │
 *  │  D3    → GPIO12                │  Z   → GPIO10 (ADC)                  │
 *  │  CS    → GPIO16                │                                      │
 *  │  VCC   → 3.3V                  │                                      │
 *  │  GND   → GND                   │                                      │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 *  Abhängigkeiten: nur ESP32-Core v3.x in Arduino IDE
 *  Upload: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled
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
// Display-Pins
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1

// ADXL335-Pins (analoge Eingänge)
#define PIN_ACCEL_X    5
#define PIN_ACCEL_Y    9
#define PIN_ACCEL_Z    10

/* =====================================================================
 *  JD9855-QSPI-Display-Treiberklasse
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

    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b) {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1) {
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
        io_config.pclk_hz            = 20 * 1000 * 1000;  // 40MHz sind mit dieser Verdrahtung instabil, 20MHz sind der stabile Wert
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

    void pushRect(int x, int y, int w, int h, const uint16_t *data) {
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

    void fillScreen(uint16_t color) {
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

    void ensureDmaBuf(size_t need) {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1) {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data) {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    void sendInitCommands() {
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
        sendCmd(0x11);
        delay(120);
        sendCmd(0x29);
        delay(10);
    }
};

/* =====================================================================
 *  Globale Variablen
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     // 360
static constexpr int H = JD9855_QSPI::V_RES;     // 360
static constexpr int CX = W / 2;                  // Mittelpunkt x = 180
static constexpr int CY = H / 2;                  // Mittelpunkt y = 180
static constexpr int RADIUS = 180;
static constexpr int R2MAX  = RADIUS * RADIUS;

static const int BLOCK_H = 40;
uint16_t blockBuf[W * BLOCK_H];

// Winkel-Lookuptabelle pro Pixel relativ zum Mittelpunkt (atan2 zu 0-255 vorberechnet),
// damit das Rendering nicht pro Pixel atan2f aufruft
uint8_t *angleTab = nullptr;

// Beschleunigungssensor-Daten (gefiltert)
float accelX = 0, accelY = 0, accelZ = 0;
// Rohcenter-Werte des Sensors (ADC-Wert im Ruhezustand, kalibrierungsbedürftig)
int accelXCenter = 2048, accelYCenter = 2048, accelZCenter = 2730;

// Farbdefinitionen
uint16_t COLOR_BLACK;
uint16_t COLOR_WHITE;
uint16_t COLOR_LIGHT_GRAY;

/* =====================================================================
 *  Hilfsfunktionen
 * ===================================================================== */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v) {
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

void initColors() {
    COLOR_BLACK      = JD9855_QSPI::color565(0, 0, 0);
    COLOR_WHITE      = JD9855_QSPI::color565(255, 255, 255);
    COLOR_LIGHT_GRAY = JD9855_QSPI::color565(100, 100, 110);
}

/* =====================================================================
 *  Beschleunigungssensor: Auslesen und Filterung
 * ===================================================================== */
void readAccelerometer() {
    // Roh-ADC-Werte lesen (ESP32-S3 ADC 12-Bit, 0-4095)
    int rawX = analogRead(PIN_ACCEL_X);
    int rawY = analogRead(PIN_ACCEL_Y);
    int rawZ = analogRead(PIN_ACCEL_Z);

    // In normalisierte Werte -1.0 bis 1.0 umrechnen
    // ADXL335 bei 3.3V-Versorgung: ca. 330mV pro g, Mitte ca. 1.65V
    // ADC 3.3V = 4095, also ca. 409 ADC-Einheiten pro g
    float newX = (rawX - accelXCenter) / 409.0f;
    float newY = (rawY - accelYCenter) / 409.0f;
    float newZ = (rawZ - accelZCenter) / 409.0f;

    // Begrenzen
    newX = constrain(newX, -1.5f, 1.5f);
    newY = constrain(newY, -1.5f, 1.5f);
    newZ = constrain(newZ, -1.5f, 1.5f);

    // Tiefpassfilter (Glättung)
    const float alpha = 0.3f;
    accelX = accelX * (1 - alpha) + newX * alpha;
    accelY = accelY * (1 - alpha) + newY * alpha;
    accelZ = accelZ * (1 - alpha) + newZ * alpha;
}

/* Pro Pixel den Winkel (atan2) zum Mittelpunkt vorab berechnen und als 0-255-Tabelle speichern.
   Zur Laufzeit wird pro Pixel nur ein Tabellen-Lookup zum Bogenmaß durchgeführt, kein atan2f
   mehr pro Frame – das war früher der Hauptgrund für Ruckeln.
   Wird nur einmal in setup berechnet. Bevorzugt internes RAM (~126KB), bei Bedarf PSRAM;
   wenn beide nicht verfügbar sind, wird nullptr gesetzt und das Rendering fällt auf
   atan2f zurück (läuft weiterhin, nur langsamer). */
void buildAngleTable() {
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab: Speicherzuweisung fehlgeschlagen, Rendern wird langsamer")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   // -0.5..0.5
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);
        }
    }
    Serial.printf("[INIT] Winkeltabelle %d KB bereit\n", (int)(n / 1024));
}

/* =====================================================================
 *  Szene: 3-Achsen-Beschleunigungs-Dashboard
 *  Zeigt Echtzeitdaten der drei Achsen mit dynamischer Nadel und Zahlenwerten
 * ===================================================================== */
void renderGaugeScene() {
    // ---- Konstanten pro Frame (vor die Schleife ziehen, um Neu berechnung pro Pixel zu vermeiden) ----
    int t = millis() / 50;
    float breathe   = (sinf(t * 0.1f) + 1) / 2;
    float tiltAngle = atan2f(accelY, accelX);
    float tiltMag   = sqrtf(accelX * accelX + accelY * accelY);
    tiltMag = min(1.0f, tiltMag);
    float xAngle    = accelX * M_PI / 2;
    float yAngle    = -M_PI / 2 + accelY * M_PI / 2;
    float zVal      = (accelZ + 1) / 2;
    float fillAngle = -M_PI + zVal * 2 * M_PI;
    const float A8SCALE = M_PI / 128.0f;   // Winkel-Tabelle (0-255) -> Bogenmaß

    // Radien-Schwellen alle als r^2 (Integer-Vergleich), um pro Pixel sqrtf zu sparen – nur das
    // zentrale Nadel-Feld braucht ein float r
    const int R2_TICK_LO  = 160 * 160, R2_TICK_HI  = 175 * 175;
    const int R2_X_LO     = 135 * 135, R2_X_HI     = 155 * 155;
    const int R2_Y_LO     =  95 *  95, R2_Y_HI     = 115 * 115;
    const int R2_Z_LO     =  55 *  55, R2_Z_HI     =  75 *  75;
    const int R2_NDL_LO   =   5 *   5, R2_NDL_HI   =  50 *  50;
    const int R2_BR_LO    = 175 * 175, R2_BR_HI    = 180 * 180;
    const int R2_145_LO = 145 * 145, R2_145_HI = 146 * 146;
    const int R2_105_LO = 105 * 105, R2_105_HI = 106 * 106;
    const int R2_65_LO  =  65 *  65, R2_65_HI  =  66 *  66;
    const int R2_165    = 165 * 165;

    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = min(BLOCK_H, H - by);
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            const uint8_t *angRow = angleTab ? &angleTab[yy * W] : nullptr;  // Zeilenzeiger einmal pro Zeile holen
            for (int x = 0; x < W; x++) {
                int dx = x - CX, dy = yy - CY;
                int r2 = dx * dx + dy * dy;

                if (r2 > R2MAX) {
                    blockBuf[y * W + x] = COLOR_BLACK;
                    continue;
                }

                float angle = angRow ? ((int8_t)angRow[x] * A8SCALE)
                                     : atan2f((float)dy, (float)dx);

                // dunkler Hintergrund
                uint16_t color = JD9855_QSPI::color565(15, 20, 30);

                // äußere Skala
                if (r2 > R2_TICK_LO && r2 < R2_TICK_HI) {
                    int deg = (int)((angle + M_PI) * 180 / M_PI) % 30;
                    if (deg < 3 || (r2 > R2_165 && deg % 10 < 2)) {
                        color = COLOR_LIGHT_GRAY;
                    }
                }

                // X-Achse (äußerer Ring, rot)
                if (r2 > R2_X_LO && r2 < R2_X_HI) {
                    float angleDiff = fabsf(angle - xAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(100 + tt * 155, 30, 30);
                    } else if (r2 >= R2_145_LO && r2 < R2_145_HI) {
                        color = JD9855_QSPI::color565(60, 20, 20);
                    }
                }

                // Y-Achse (mittlerer Ring, grün)
                if (r2 > R2_Y_LO && r2 < R2_Y_HI) {
                    float angleDiff = fabsf(angle - yAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(30, 100 + tt * 155, 30);
                    } else if (r2 >= R2_105_LO && r2 < R2_105_HI) {
                        color = JD9855_QSPI::color565(20, 60, 20);
                    }
                }

                // Z-Achse (innerer Ring, blau)
                if (r2 > R2_Z_LO && r2 < R2_Z_HI) {
                    if (angle < fillAngle || angle < -M_PI + 0.1) {
                        color = JD9855_QSPI::color565(30, 80, 200);
                    } else if (r2 >= R2_65_LO && r2 < R2_65_HI) {
                        color = JD9855_QSPI::color565(20, 30, 80);
                    }
                }

                // zentrale Nadel (zeigt in Richtung der resultierenden Kraft) —— nur hier ist float r nötig
                if (r2 > R2_NDL_LO && r2 < R2_NDL_HI) {
                    float r = sqrtf((float)r2);
                    float angleDiff = fabsf(angle - tiltAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    float needleWidth = 0.15f * (1 - r / 50);

                    if (angleDiff < needleWidth && r < 45 * tiltMag + 10) {
                        int hue = (int)(tiltAngle * 180 / M_PI + 180) % 360;
                        color = hsvTo565(hue, 200, 255);
                    }
                }

                // Mittelpunkt
                if (r2 < 64) {
                    color = COLOR_WHITE;
                }

                // atmender Lichteffekt (Deko; breathe wurde außerhalb der Schleife berechnet)
                if (r2 > R2_BR_LO && r2 < R2_BR_HI) {
                    int hue = ((int)(angle * 180 / M_PI) + t * 2) % 360;
                    color = hsvTo565(hue, 255, 100 + breathe * 100);
                }

                blockBuf[y * W + x] = color;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* =====================================================================
 *  Hauptprogramm
 * ===================================================================== */
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[ADXL335 + TK015F5785] 3-Achsen-Beschleunigungs-Dashboard"));

    // Farben initialisieren
    initColors();

    // ADC initialisieren (ESP32-S3)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);  // Bereich 0-3.3V
    pinMode(PIN_ACCEL_X, INPUT);
    pinMode(PIN_ACCEL_Y, INPUT);
    pinMode(PIN_ACCEL_Z, INPUT);

    // Kalibrierung: Mittelwert im Ruhezustand einlesen
    Serial.println(F("[ACCEL] Kalibrierung, Gerät flach und ruhig halten..."));
    delay(500);
    long sumX = 0, sumY = 0, sumZ = 0;
    for (int i = 0; i < 100; i++) {
        sumX += analogRead(PIN_ACCEL_X);
        sumY += analogRead(PIN_ACCEL_Y);
        sumZ += analogRead(PIN_ACCEL_Z);
        delay(10);
    }
    accelXCenter = sumX / 100;
    accelYCenter = sumY / 100;
    accelZCenter = sumZ / 100 - 409;  // Z-Achse liegt im Ruhezustand bei ca. 1g, 1g-Offset abziehen
    Serial.printf("[ACCEL] Kalibrierung fertig: X=%d, Y=%d, Z=%d\n", accelXCenter, accelYCenter, accelZCenter);

    // Display initialisieren
    Serial.println(F("[LCD] Initialisierung..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] Initialisierung fehlgeschlagen!"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] Initialisierung erfolgreich"));

    buildAngleTable();   // Winkel pro Pixel vorab berechnen, damit das Dashboard flüssig rendert

    lcd.fillScreen(COLOR_BLACK);
    Serial.println(F("[DEMO] 3-Achsen-Beschleunigungs-Dashboard"));
}

void loop() {
    // Beschleunigungssensor auslesen
    readAccelerometer();

    // Dashboard rendern
    renderGaugeScene();

    // Debug-Info ausgeben (einmal pro Sekunde)
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint > 1000) {
        lastPrint = millis();
        Serial.printf("X=%.2f  Y=%.2f  Z=%.2f\n", accelX, accelY, accelZ);
    }
}
```

### Code-Erklärung

- **Display-Treiber**: Die Klasse `JD9855_QSPI` ruft direkt die ESP-IDF-Schnittstelle `esp_lcd_panel_io_spi` auf, komplett ohne Drittanbieter-Grafikbibliothek. `pclk_hz` wurde absichtlich vom üblichen 40MHz auf 20MHz reduziert – bei längeren Leitungen wird 40MHz leicht instabil (Pixelmüll). Das ist der nach Tests stabile Wert. Bei kurzen Leitungen und guten Display-Kabeln kannst du selbst nach oben experimentieren.
- **Winkel-Lookuptabelle `buildAngleTable()`**: Hier entscheidet sich die Performance des gesamten Renderings. Im ersten Schritt wird in `setup()` für jeden der 360×360 Pixel der Winkel relativ zum Mittelpunkt einmal vorab berechnet und zu einer 0-255-Ein-Byte-Tabelle komprimiert. Im zweiten Schritt macht das Rendering pro Pixel nur einen Array-Lookup, anstatt langsam `atan2f()` aufzurufen. Diese Optimierung entscheidet direkt über die Bildrate des Dashboards.
- **`readAccelerometer()` – Lesen und Filtern**: 1) Roh-ADC-Werte lesen. 2) Mit dem Faktor 409 counts/g in einen normalisierten Wert -1..1 umrechnen (dieser Faktor ergibt sich aus der typischen ADXL335-Empfindlichkeit 300mV/g × ADC-Vollausschlag 3.3V beim 12-Bit-ADC des ESP32-S3 – in der Praxis am eigenen Modul nachkalibrieren). 3) Tiefpass erster Ordnung (`alpha = 0.3`) zum Glätten.
- **Warum „Schütteln" deutlicher wirkt als „Neigen" – und wo das im Code sichtbar wird**: Die Zeile `xAngle = accelX * M_PI / 2` bildet ±1g linear auf ±90° ab. Bei langsamem Neigen ist accelX theoretisch auf ±1g begrenzt, entspricht also exakt ±90°. Beim Schütteln addiert sich die Trägheitsbeschleunigung zur Schwerkraft, accelX liegt tatsächlich häufig über ±1 und wird durch `constrain()` auf ±1.5g begrenzt – der resultierende Winkelausschlag ist also deutlich heftiger als beim langsamen Neigen. Das ist keine Bildlogik-Entscheidung, sondern liegt an der Physik des Beschleunigungssensors.
- **Rendering der Z-Achse**: `zVal` bildet accelZ von -1..1 auf 0..1 ab und daraus ergibt sich ein Füllwinkel `fillAngle`. Im Grunde wird der Z-Wert als „Fortschrittsring" dargestellt. Wenn dieser Ring leicht wackelt, ist das völlig normal (Erklärung in den FAQ unten).

---

## Fehlerbehandlung

Keine Panik – 80 % der Probleme liegen an diesen Stellen:

1. **Display bleibt dunkel oder zeigt Pixelmüll**: Zuerst prüfen, ob die vier QSPI-Datenleitungen D0~D3 vertauscht sind; dann CS/SCLK separat kontrollieren; zuletzt sicherstellen, dass die Display-Versorgung stabil bei 3.3V liegt (große Restwelligkeit führt ebenfalls zu Pixelmüll).
2. **ADXL335-Werte bleiben bei ca. 2048 stehen**: Prüfen, ob der ADC-Pin wirklich verbunden ist oder das Modul nicht richtig versorgt wird. GPIO5/9/10 liegen alle im ADC1-Bereich des ESP32-S3 und sind nicht von ADC2/Wi-Fi betroffen – diese Fehlerquelle kannst du also ausschließen.
3. **Z-Achse springt ständig**: Das ist eine werksseitige Eigenschaft des ADXL335. Die Rauschdichte der Z-Achse ist von Natur aus höher als die der X/Y-Achsen – kein Verdrahtungs- oder Codeproblem. Abhilfe: Filterkoeffizient `alpha` kleiner setzen (z.B. von 0.3 auf 0.1) oder im Code mehrfach abtasten und mitteln (Oversampling).
4. **Langsames Neigen zeigt keine Wirkung, erst Schütteln**: Das ist die physikalische Natur des Beschleunigungssensors – er misst die „resultierende Kraft", keinen reinen Lagewinkel. Nur in Kombination mit einem Gyroskop (Sensorfusion) erhältst du eine stabile, bewegungsunabhängige Lagewinkel-Ausgabe.
5. **Compilerfehler: `esp_lcd_panel_io.h` nicht gefunden**: ESP32-Boardpaket im Arduino IDE prüfen – muss v3.x (basierend auf ESP-IDF 5.x) sein, alte Cores haben diese Schnittstellen nicht.
6. **Nach der Kalibrierung ist der Mittelwert deutlich verschoben**: Während der Kalibrierung war das Gerät schräg oder in Bewegung. Beim Einschalten flach auf den Tisch legen und während dieser einen Sekunde nicht anfassen.

---

## FAQ

**F: Misst der ADXL335 nun Neigung oder Bewegung?**
A: Streng genommen misst er „spezifische Kraft" (Schwerkraftkomponente + Bewegungsbeschleunigung) und kann die beiden nicht trennen. Langsames Neigen verändert die Schwerkraftkomponente um max. ±1g, beim Schütteln addiert sich die Bewegungsbeschleunigung – die Werte überschreiten häufig ±1g. Daher wirkt „Schütteln" visuell deutlich stärker als „langsames Neigen". Für reine Lagewinkel brauchst du eine 6-Achsen-IMU mit Gyroskop (z.B. MPU6050) und Sensorfusion.

**F: Warum springt der Z-Wert ständig, während X/Y relativ stabil bleiben?**
A: Das ist eine werksseitige Eigenschaft des ADXL335 – laut Datenblatt ist die Ausgangsrauschdichte der Z-Achse etwa doppelt so hoch wie die der X/Y-Achsen. Kein Verdrahtungs- oder Codeproblem. Lässt sich durch stärkeren Tiefpass oder ADC-Oversampling mildern, aber nicht vollständig beseitigen.

**F: Wie schnelle Bewegungen kann das GY-61-Modul erfassen?**
A: Der onboard-Filterkondensator (0.1μF) begrenzt die Bandbreite jeder Achse auf ca. 50Hz – für alltägliche Schüttel-/Neigebewegungen völlig ausreichend. Für hochfrequente Schwingungen brauchst du einen kleineren Filterkondensator.

**F: Kollidieren GPIO5/9/10 des ESP32-S3 als ADC mit Wi-Fi?**
A: Nein. Diese drei Pins liegen alle in ADC1 (GPIO1~10) des ESP32-S3. Nur ADC2 (GPIO11~20) wird während des Wi-Fi-Betriebs eingeschränkt – in diesem Projekt also kein Problem.

**F: Warum muss das Gerät während der Kalibrierung flach und ruhig liegen?**
A: Der Code mittelt nach dem Einschalten 100 aufeinanderfolgende Samples und nimmt diesen Mittelwert als „0g"-Referenz. Ist das Gerät während der Kalibrierung schräg oder in Bewegung, driftet die Referenz – und alle nachfolgenden Umrechnungen wandern mit.

**F: Muss für diesen Code eine zusätzliche Drittanbieter-Bibliothek installiert werden?**
A: Nein. Der Display-Treiber ruft direkt die ESP-IDF-eigenen Schnittstellen `esp_lcd_panel_io` und `spi_master` auf. Solange das ESP32-Boardpaket im Arduino IDE v3.x ist, reicht das – in der Bibliotheksverwaltung muss nichts installiert werden.

---

## Erweiterte Ideen

- Eine 6-Achsen-IMU (z.B. MPU6050) ergänzen und per Sensorfusion ein wirklich stabiles, erschütterungsunabhängiges Lage-Dashboard bauen
- Die „Schüttelintensität" separat extrahieren und einen einfachen „Erschütterungsdetektor" bauen, der bei Überschreitung eines Schwellenwerts die Farbe ändert oder Alarm gibt
- Einen Piezo- oder RGB-LED-Anschluss ergänzen, der bei einem eingestellten Neigungswinkel Alarm schlägt – als einfache Wasserwaage
- Bewegungsdaten auf eine SD-Karte loggen, nachträglich exportieren und als Kurve auswerten

---

## Referenzen

- [ADXL335 offizielle Produktseite und Datenblatt (Analog Devices)](https://www.analog.com/en/products/adxl335.html)
- [GY-61 / ADXL335 Breakout – Filterkondensator und Bandbreite (Adafruit)](https://www.adafruit.com/product/163)
- [Datenblatt des JD9855-QSPI-Treiberchips](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
- [ESP32-S3-Datenblatt (Espressif, ADC1/ADC2-Pin-Belegung)](https://documentation.espressif.com/esp32-s3_datasheet_en.pdf)
