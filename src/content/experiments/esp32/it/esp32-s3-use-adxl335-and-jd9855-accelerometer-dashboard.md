---
title: "ESP32-S3 + ADXL335 pilotano un display rotondo JD9855 come cruscotto di accelerazione a 3 assi｜Perché «scuotere» si vede più di «inclinare»"
boardId: esp32s3
moduleId: display/tft15-jd9855
moduleIds:
  - display/tft15-jd9855
  - sensor/adxl335
category: esp32
date: 2026-08-05
intro: "Usa ESP32-S3 + ADXL335 (GY-61) per pilotare un display QSPI rotondo JD9855 come cruscotto di accelerazione a 3 assi in tempo reale, con schema di cablaggio, codice Arduino completo e risoluzione dei problemi, e spiega bene la fisica dell'accelerometro dietro al fatto che «scuotere si vede più di inclinare»."
image: "https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg"
---

> Difficoltà: ⭐⭐☆☆☆ (basta un po' di esperienza base con Arduino)
> Tempo stimato: 30-40 minuti (inclusi calibrazione e debug)
> Ambiente di test: Arduino IDE 2.3.8 · ESP32 Arduino Core 3.3.10

---

> **TL;DR (per partire veloci):**
> 1. Collega lo schermo (QSPI a 6 fili) e l'ADXL335 (tre ingressi analogici X/Y/Z) seguendo la tabella di cablaggio
> 2. GPIO5 / GPIO9 / GPIO10 cadono tutti nel range ADC1 dell'ESP32-S3, niente conflitti con il Wi-Fi
> 3. Dopo l'alimentazione tieni il dispositivo piano e fermo, così il programma campiona e calibra automaticamente il punto zero (circa 1 secondo)
> 4. Inclina lentamente oppure scuoti con forza il dispositivo e osserva sul display rotondo la variazione coordinata degli anelli tricolore + puntatore centrale

---

## Premessa

Dopo due giorni di sbattimenti, ho piazzato i dati a tre assi dell'ADXL335 in tempo reale su un display rotondo da 360×360: inclinando piano il dispositivo, il puntatore quasi non si muove; basta un colpo di mano o una scrollata decisa e il puntatore scatta fuori per tre quarti di giro. All'inizio pensavo fosse una calibrazione sbagliata, poi ho cercato in giro e ho capito — quest'affare per principio fisico non è un «inclinometro» puro, misura accelerazione: più forte scuoti, più la lettura esagera, ed è di design, non un bug. Ho anche scoperto che la mia scheda di sviluppo ESP32-S3 fatta a mano non se la passa troppo bene sul fronte alimentazione: quando collego il sensore lo schermo ha dei cali di luminosità evidenti. Pare proprio che debba aggiornare la mia scheda ESP32-S3.

Quindi in questo articolo, oltre al cablaggio completo, al codice e agli inciampi, voglio spiegare per bene il «perché scuotere si vede più di inclinare», così non ti metti a dubitare dell'universo quando riproduci l'esperimento.

---

## Risultato dell'esperimento

Questo display rotondo 360×360 mostra in tempo reale i dati di accelerazione a tre assi dell'ADXL335 (nota: accelerazione, non angolo di assetto puro): gli anelli esterni rosso/verde/blu corrispondono rispettivamente agli assi X / Y / Z, e il puntatore colorato centrale indica la direzione della forza risultante. Più forte scuoti, più l'oscillazione del puntatore è esagerata; sul bordo c'è anche un effetto luminoso a respirazione come decorazione.

![](https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg)

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/B2hNfww6fXo?si=yirZlC1QrNw2urEF" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## Descrizione dei componenti

> La scheda di sviluppo ESP32-S3 non ha bisogno di presentazioni: se sei arrivato a leggere questo articolo, vuol dire che hai già usato un ESP32. Qui sotto parlo solo degli altri due componenti principali.

### Accelerometro ADXL335 (modulo GY-61)

L'ADXL335 fa qualcosa di simile a una bilancia pesapersoni — non sa se sei «dritto o storto», sa solo quanta forza sta subendo in questo momento, e ti restituisce questa forza scomposta nelle tre componenti X/Y/Z. È un accelerometro MEMS a tre assi con uscita analogica, che converte la forza risultante subita dal dispositivo (componente gravitazionale + accelerazione generata dal movimento) in tre segnali di tensione.

| Parametro | Valore |
| --- | --- |
| Tipo | Accelerometro MEMS a tre assi con uscita analogica |
| Range | ±3.6g (tipico) / ±3g (minimo garantito) |
| Sensibilità | 300 mV/g (valore tipico con VS = 3V, proporzionale all'alimentazione) |
| Tensione di lavoro | 1.8V ~ 3.6V |
| Banda (default modulo GY-61) | circa 50Hz (determinata dal condensatore di filtraggio da 0.1μF a bordo) |
| Densità di rumore | X/Y circa 270 µg/√Hz, Z circa 550 µg/√Hz (Z è circa 2× X/Y) |

Il motivo per usarlo è semplice: è economico, l'uscita analogica semplifica il cablaggio e basta un qualsiasi pin ADC per leggerlo; è perfetto per progettini di visualizzazione «giocattolo», e se non cerchi calcolo d'assetto professionale è più che sufficiente.

### Descrizione dei pin

**ADXL335 (GY-61)**

| Pin modulo | Descrizione |
| --- | --- |
| VCC / GND | Alimentazione 3.3V |
| X / Y / Z | Tre uscite analogiche, da collegare a pin ADC |
| ST | Pin di self-test, di solito non collegato |

### Display rotondo TK015F5785 (driver JD9855, interfaccia QSPI)

Questo schermo si può intendere come una «tela che riconosce solo i segnali di quattro linee dati»: il JD9855 è il chip driver, che si occupa di spostare i dati colore inviati dal MCU su ogni singolo pixel dello schermo; l'interfaccia QSPI (seriale a quattro linee) permette velocità di refresh più alte usando meno pin. È un display TFT rotondo da circa 1.5 pollici e risoluzione 360×360, si pilota tramite cinque linee di segnale SCLK/D0-D3/CS + alimentazione, senza bisogno di un pin DC (dati/comando) aggiuntivo.

| Parametro | Valore |
| --- | --- |
| Dimensione | 1.5 pollici IPS rotondo |
| Risoluzione | 360 × 360 |
| Chip driver | JD9855 |
| Interfaccia | QSPI (quattro linee) |
| Alimentazione | 3.3V |
| Luminosità/contrasto | Fare riferimento al datasheet fornito dal venditore (può variare tra lotti) |

Il motivo per cui l'ho scelto è altrettanto diretto: uno schermo rotondo è naturalmente bello per le visualizzazioni stile cruscotto, l'interfaccia QSPI occupa solo 5 GPIO ed è più parsimoniosa del classico parallelo, e il DMA dell'ESP32-S3 riesce a tenergli dietro.

### Descrizione dei pin

**Schermo TK015F5785 (JD9855 QSPI)**

| Pin schermo | Descrizione |
| --- | --- |
| SCLK | Clock QSPI |
| D0 ~ D3 | Quattro linee dati QSPI |
| CS | Chip select |
| VCC / GND | Alimentazione 3.3V |

---

## Lista della spesa (BOM)

| Componente | Modello/parametro | Quantità | Prezzo indicativo | Uso |
| --- | --- | --- | --- | --- |
| Scheda principale | Scheda di sviluppo ESP32-S3 | 1 | circa 30-50 yuan | MCU + riserva Wi-Fi/Bluetooth |
| Schermo rotondo | TK015F5785 (JD9855, 360×360, QSPI) | 1 | dipende dal venditore | Display |
| Accelerometro | ADXL335 (modulo GY-61) | 1 | circa 8-15 yuan | Acquisizione accelerazione a 3 assi |
| Ponteggi Dupont | femmina-femmina | alcuni | - | Cablaggio |

---

## Modalità di cablaggio

**Schermo → ESP32-S3**

| Pin schermo | Pin ESP32-S3 |
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

| Pin modulo | Pin ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| X | GPIO5 (ADC1) |
| Y | GPIO9 (ADC1) |
| Z | GPIO10 (ADC1) |

Meglio ricontrollare uno per uno dopo aver collegato: risparmia l'80% del tempo di debug — in particolare i quattro fili D0~D3 dello schermo, se ne inverti uno lo schermo molto probabilmente sgranocchia o non si accende proprio.

---

## Librerie da installare

Non c'è bisogno di installare nessuna libreria di terze parti. Il driver dello schermo chiama direttamente le interfacce `esp_lcd_panel_io` e `driver/spi_master` native di ESP-IDF scrivendo a mano il driver QSPI; nello Library Manager non devi cercare nulla.

Le uniche versioni a cui prestare attenzione:

- Arduino IDE: 2.3.8 (testato OK)
- Pacchetto di supporto schede ESP32 (esp32 by Espressif Systems): **3.3.10** (basato su ESP-IDF 5.x) — deve essere v3.x, perché il flag `quad_mode` usato dal codice e parte delle interfacce DMA nel core v2.x più vecchio non sono necessariamente presenti
- Selezione scheda: ESP32S3 Dev Module, USB CDC On Boot impostato su Enabled

---

## Codice

```cpp
/*
 * =============================================================================
 *  ADXL335 + TK015F5785 schermo rotondo —— cruscotto di accelerazione a 3 assi
 *  =====================================================================
 *
 *  Scena singola: cruscotto di accelerazione a 3 assi —— mostra in tempo reale i dati a 3 assi + direzione della forza risultante, il puntatore centrale indica la direzione della forza risultante
 *
 *  Hardware: ESP32-S3 + TK015F5785 (JD9855 QSPI) + ADXL335 (GY-61)
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                          Schema di cablaggio                        │
 *  ├─────────────────────────────────────────────────────────────────────┤
 *  │  【Schermo TK015F5785】        │  【ADXL335 (GY-61)】                 │
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
 *  Dipendenze: solo il core scheda esp32 di Arduino IDE v3.x
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

/* ----------------------------- Configurazione pin ----------------------------- */
// Pin dello schermo
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1

// Pin ADXL335 (ingressi analogici)
#define PIN_ACCEL_X    5
#define PIN_ACCEL_Y    9
#define PIN_ACCEL_Z    10

/* =====================================================================
 *  Classe driver schermo JD9855 QSPI
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
        io_config.pclk_hz            = 20 * 1000 * 1000;  // il cablaggio non regge 40MHz, si torna a 20MHz stabili
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
 *  Variabili globali
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     // 360
static constexpr int H = JD9855_QSPI::V_RES;     // 360
static constexpr int CX = W / 2;                  // centro x = 180
static constexpr int CY = H / 2;                  // centro y = 180
static constexpr int RADIUS = 180;
static constexpr int R2MAX  = RADIUS * RADIUS;

static const int BLOCK_H = 40;
uint16_t blockBuf[W * BLOCK_H];

// Look-up table dell'angolo di ogni pixel rispetto al centro (atan2 precalcolato in 0-255), così il rendering non chiama atan2f pixel per pixel
uint8_t *angleTab = nullptr;

// Dati accelerometro (dopo filtraggio)
float accelX = 0, accelY = 0, accelZ = 0;
// Valore centrale grezzo dell'accelerometro (valore ADC a riposo, da calibrare)
int accelXCenter = 2048, accelYCenter = 2048, accelZCenter = 2730;

// Definizioni colori
uint16_t COLOR_BLACK;
uint16_t COLOR_WHITE;
uint16_t COLOR_LIGHT_GRAY;

/* =====================================================================
 *  Funzioni di utility
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
 *  Lettura e filtraggio accelerometro
 * ===================================================================== */
void readAccelerometer() {
    // Lettura valori ADC grezzi (ADC ESP32-S3 a 12 bit, 0-4095)
    int rawX = analogRead(PIN_ACCEL_X);
    int rawY = analogRead(PIN_ACCEL_Y);
    int rawZ = analogRead(PIN_ACCEL_Z);

    // Conversione in valore normalizzato da -1.0 a 1.0
    // ADXL335 con alimentazione 3.3V: circa 330mV per g, centro a circa 1.65V
    // ADC 3.3V = 4095, quindi circa 409 unità ADC per g
    float newX = (rawX - accelXCenter) / 409.0f;
    float newY = (rawY - accelYCenter) / 409.0f;
    float newZ = (rawZ - accelZCenter) / 409.0f;

    // Limitazione
    newX = constrain(newX, -1.5f, 1.5f);
    newY = constrain(newY, -1.5f, 1.5f);
    newZ = constrain(newZ, -1.5f, 1.5f);

    // Filtraggio a basso taglio (smussamento)
    const float alpha = 0.3f;
    accelX = accelX * (1 - alpha) + newX * alpha;
    accelY = accelY * (1 - alpha) + newY * alpha;
    accelZ = accelZ * (1 - alpha) + newZ * alpha;
}

/* Precalcola l'angolo di ogni pixel rispetto al centro (atan2), memorizzandolo in una LUT 0-255.
   A runtime ogni pixel rilegge solo la tabella per tornare in radianti, senza chiamare atan2f ad ogni frame — quello era il colpevole del lag originale.
   Calcolata una sola volta nel setup. Priorità alla RAM interna (~126KB), fallback su PSRAM;
   se manca entrambe imposta nullptr e il rendering degrada su atan2f (vedibile comunque, solo più lento). */
void buildAngleTable() {
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab: allocazione fallita, il rendering sarà più lento")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   // -0.5..0.5
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);
        }
    }
    Serial.printf("[INIT] Tabella angoli %d KB pronta\n", (int)(n / 1024));
}

/* =====================================================================
 *  Scena: cruscotto di accelerazione a 3 assi
 *  Mostra i dati a 3 assi in tempo reale, con puntatore dinamico e valori
 * ===================================================================== */
void renderGaugeScene() {
    // ---- Costanti per frame (portate fuori dal ciclo, per non ricalcolarle per ogni pixel) ----
    int t = millis() / 50;
    float breathe   = (sinf(t * 0.1f) + 1) / 2;
    float tiltAngle = atan2f(accelY, accelX);
    float tiltMag   = sqrtf(accelX * accelX + accelY * accelY);
    tiltMag = min(1.0f, tiltMag);
    float xAngle    = accelX * M_PI / 2;
    float yAngle    = -M_PI / 2 + accelY * M_PI / 2;
    float zVal      = (accelZ + 1) / 2;
    float fillAngle = -M_PI + zVal * 2 * M_PI;
    const float A8SCALE = M_PI / 128.0f;   // LUT angoli (0-255) -> radianti

    // Le soglie di raggio sono tutte in r^2 (confronti interi), per evitare sqrtf per ogni pixel — solo il piccolo blocco del puntatore centrale ha bisogno di float r
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
            const uint8_t *angRow = angleTab ? &angleTab[yy * W] : nullptr;  // puntatore inizio riga preso una volta per riga
            for (int x = 0; x < W; x++) {
                int dx = x - CX, dy = yy - CY;
                int r2 = dx * dx + dy * dy;

                if (r2 > R2MAX) {
                    blockBuf[y * W + x] = COLOR_BLACK;
                    continue;
                }

                float angle = angRow ? ((int8_t)angRow[x] * A8SCALE)
                                     : atan2f((float)dy, (float)dx);

                // Sfondo scuro
                uint16_t color = JD9855_QSPI::color565(15, 20, 30);

                // Scala di bordo esterno
                if (r2 > R2_TICK_LO && r2 < R2_TICK_HI) {
                    int deg = (int)((angle + M_PI) * 180 / M_PI) % 30;
                    if (deg < 3 || (r2 > R2_165 && deg % 10 < 2)) {
                        color = COLOR_LIGHT_GRAY;
                    }
                }

                // Asse X (anello esterno, rosso)
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

                // Asse Y (anello medio, verde)
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

                // Asse Z (anello interno, blu)
                if (r2 > R2_Z_LO && r2 < R2_Z_HI) {
                    if (angle < fillAngle || angle < -M_PI + 0.1) {
                        color = JD9855_QSPI::color565(30, 80, 200);
                    } else if (r2 >= R2_65_LO && r2 < R2_65_HI) {
                        color = JD9855_QSPI::color565(20, 30, 80);
                    }
                }

                // Puntatore centrale (punta la direzione della forza risultante) — solo qui serve float r
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

                // Punto centrale
                if (r2 < 64) {
                    color = COLOR_WHITE;
                }

                // Decorazione luminosa a respirazione (breathe già calcolato fuori dal ciclo)
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
 *  Programma principale
 * ===================================================================== */
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[ADXL335 + TK015F5785] cruscotto di accelerazione a 3 assi"));

    // Inizializzazione colori
    initColors();

    // Inizializzazione ADC (ESP32-S3)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);  // range 0-3.3V
    pinMode(PIN_ACCEL_X, INPUT);
    pinMode(PIN_ACCEL_Y, INPUT);
    pinMode(PIN_ACCEL_Z, INPUT);

    // Calibrazione: lettura del valore centrale a riposo
    Serial.println(F("[ACCEL] Calibrazione, tieni il dispositivo piano e fermo..."));
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
    accelZCenter = sumZ / 100 - 409;  // A riposo l'asse Z è circa 1g, tolto l'offset di 1g
    Serial.printf("[ACCEL] Calibrazione completata: X=%d, Y=%d, Z=%d\n", accelXCenter, accelYCenter, accelZCenter);

    // Inizializzazione schermo
    Serial.println(F("[LCD] Inizializzazione..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] Inizializzazione fallita!"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] Inizializzazione riuscita"));

    buildAngleTable();   // Precalcola gli angoli di ogni pixel, così il rendering del cruscotto non va a scatti

    lcd.fillScreen(COLOR_BLACK);
    Serial.println(F("[DEMO] cruscotto di accelerazione a 3 assi"));
}

void loop() {
    // Lettura accelerometro
    readAccelerometer();

    // Rendering del cruscotto
    renderGaugeScene();

    // Stampa info di debug (una volta al secondo)
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint > 1000) {
        lastPrint = millis();
        Serial.printf("X=%.2f  Y=%.2f  Z=%.2f\n", accelX, accelY, accelZ);
    }
}
```

### Note sul codice

- **Parte driver dello schermo**: la classe `JD9855_QSPI` chiama direttamente le interfacce `esp_lcd_panel_io_spi` di ESP-IDF scrivendo a mano il driver, senza dipendere da librerie grafiche di terze parti. `pclk_hz` è stato volutamente abbassato dai canonici 40MHz a 20MHz perché con cablaggio lungo i 40MHz tendono a far sgranocchiare lo schermo: è il valore stabile dopo test sul campo, se il tuo cablaggio è corto e la qualità dei cavi schermo buona puoi provare a spingerlo più in alto.
- **Look-up table degli angoli `buildAngleTable()`**: questa è la chiave di prestazione dell'intero rendering. Primo passo: nel `setup()` si precalcolano gli angoli di ogni pixel 360×360 rispetto al centro, comprimendoli in una LUT a un byte 0-255; secondo passo: durante il rendering ogni pixel fa solo una lettura di array, senza più chiamare il lento `atan2f()` per ogni pixel. Questa ottimizzazione determina direttamente la fluidità del refresh del cruscotto.
- **`readAccelerometer()` lettura e filtraggio**: primo passo lettura del valore ADC grezzo; secondo passo conversione della tensione in un valore normalizzato -1~1 con il fattore 409 counts/g (questo coefficiente deriva dalla sensibilità tipica di 300mV/g dell'ADXL335 × il valore teorico a fondo scala 3.3V dell'ADC a 12 bit dell'ESP32-S3, in pratica conviene tararlo sul proprio modulo); terzo passo filtraggio a basso taglio del primo ordine (`alpha = 0.3`) per smussare i glitch.
- **Perché «scuotere» fa più effetto di «inclinarsi», e dove si vede nel codice**: la riga `xAngle = accelX * M_PI / 2` mappa linearmente ±1g di accelX su ±90°. Inclinando piano accelX ha come tetto teorico ±1g, che corrisponde esattamente a ±90°; ma scuotendo, l'accelerazione inerziale si somma alla gravità e la lettura effettiva di accelX supera spesso ±1, finendo limitata da `constrain()` a ±1.5g: l'angolo ottenuto oscilla quindi molto più violentemente che con l'inclinazione lenta — non è un problema di logica di disegno, è determinato dalle caratteristiche fisiche dell'accelerometro.
- **Rendering dell'asse Z**: `zVal` riporta accelZ da -1~1 a 0~1 e poi lo converte in un angolo di riempimento `fillAngle`: in pratica mostra il valore dell'asse Z come un «anello di avanzamento»; se noti che questo anello tremola leggermente in continuazione, è normale (più sotto nelle FAQ c'è la spiegazione).

---

## Risoluzione dei problemi comuni

Niente panico, l'80% dei problemi sta in questi punti:

1. **Schermo spento o sgranocchiato**: prima controlla che le quattro linee dati D0~D3 del QSPI non siano invertite, poi verifica che CS/SCLK siano collegati indipendentemente e correttamente, infine conferma che l'alimentazione dello schermo sia stabile a 3.3V (anche ripple elevato sull'alimentazione causa sgranocchiamento).
2. **La lettura dell'ADXL335 resta bloccata intorno a 2048 senza muoversi**: verifica di non esserti collegato a un pin ADC non funzionante, oppure che il modulo stesso non abbia problemi di alimentazione; in questo progetto GPIO5/9/10 cadono tutti nel range ADC1 dell'ESP32-S3, non risentono dell'occupazione di ADC2 da parte del Wi-Fi, quindi puoi escludere questa possibilità.
3. **Il valore dell'asse Z saltella in continuazione**: è una caratteristica di progetto originale dell'ADXL335: la densità di rumore dell'asse Z è naturalmente più alta degli assi X/Y, non è un problema di cablaggio o di codice. Puoi mitigarla abbassando il coefficiente di filtraggio `alpha` (ad esempio da 0.3 a 0.1) oppure facendo la media di più campioni nel codice (oversampling).
4. **Inclinando piano niente reazione, solo scuotendo si vede qualcosa**: è la natura fisica dell'accelerometro — misura la «forza risultante», non l'angolo di assetto puro. Solo abbinando un giroscopio e facendo fusione sensoriale puoi ottenere un assetto stabile non disturbato dal movimento.
5. **Errore di compilazione, non trova `esp_lcd_panel_io.h`**: controlla la versione del pacchetto di supporto schede ESP32 in Arduino IDE, deve essere v3.x (basato su ESP-IDF 5.x); i core più vecchi non hanno queste interfacce.
6. **Dopo la calibrazione il valore centrale è chiaramente sfasato**: durante la fase di calibrazione il dispositivo non era in piano oppure stava muovendosi; conviene appoggiarlo su un tavolo piano prima di alimentare e, in quel secondo di calibrazione, cercare di non toccarlo.

---

## FAQ - Domande e risposte

**D: L'ADXL335 misura l'inclinazione o il movimento?**
R: In senso stretto misura la «forza specifica» (combinazione di componente gravitazionale + accelerazione di movimento), e non può separare le due. Un'inclinazione lenta e continua cambia al massimo la componente gravitazionale di ±1g, mentre scuotendo ci si somma l'accelerazione di movimento, spesso superando ±1g: per questo visivamente «scuotere» è molto più evidente di «inclinarsi piano». Se vuoi un angolo di assetto puro, devi passare a una IMU a 6 assi con giroscopio (come la MPU6050) ed eseguire la fusione sensoriale.

**D: Perché la lettura dell'asse Z saltella sempre, mentre X/Y sono relativamente stabili?**
R: È una caratteristica di progetto originale dell'ADXL335 — il datasheet mostra che la densità di rumore in uscita dell'asse Z è circa il doppio rispetto agli assi X/Y: non è un problema di cablaggio né di codice. Si può mitigare aumentando il filtraggio a basso taglio o con oversampling ADC, ma non si elimina del tutto.

**D: Quanto velocemente riesce a misurare il modulo GY-61?**
R: Il condensatore di filtraggio a bordo è 0.1μF, che limita la banda di ogni asse a circa 50Hz: per le scuotimenti e gli inclinamenti di tutti i giorni è più che sufficiente; se devi misurare vibrazioni più alte, devi sostituire il condensatore di filtraggio con uno di capacità più piccola.

**D: I GPIO5/9/10 dell'ESP32-S3 usati come ADC vanno in conflitto con il Wi-Fi?**
R: No. Questi tre pin cadono tutti nel range ADC1 dell'ESP32-S3 (GPIO1~10); solo ADC2 (GPIO11~20) è soggetto a limitazioni quando il Wi-Fi è attivo. In questo progetto non devi preoccuparti di questo problema.

**D: Perché durante la calibrazione devo tenere il dispositivo piano e fermo?**
R: Dopo l'alimentazione il codice campiona 100 volte consecutive e ne fa la media, usando quel valore medio come riferimento di «0g». Se durante la calibrazione il dispositivo è storto o si muove, il riferimento si sposta e tutti i calcoli successivi si spostano di conseguenza.

**D: Questo codice richiede librerie di terze parti aggiuntive?**
R: No. Il driver dello schermo chiama direttamente le interfacce native `esp_lcd_panel_io` e `spi_master` di ESP-IDF, scrivendolo a mano: basta che il pacchetto di supporto schede ESP32 in Arduino IDE sia v3.x, nello Library Manager non devi installare nulla.

---

## Idee per andare oltre

- Aggiungere una IMU a 6 assi (come la MPU6050) per fare fusione sensoriale e ottenere un vero cruscotto di assetto stabile, non disturbato dalle oscillazioni
- Estrarre a sé l'«intensità della scrollata» per realizzare un rudimentale «rilevatore di urti» che cambia colore o suona oltre una soglia
- Collegare un buzzer o un LED RGB che suoni quando l'inclinazione supera una soglia impostata, da usare come livella semplice
- Registrare i dati di movimento su una SD card per poi esportarli e rivederli come curva

---

## Riferimenti

- [Pagina prodotto e datasheet ufficiale ADXL335 (Analog Devices)](https://www.analog.com/en/products/adxl335.html)
- [Condensatore di filtraggio a bordo e nota sulla banda dei breakout GY-61 / ADXL335 (Adafruit)](https://www.adafruit.com/product/163)
- [Datasheet del chip driver JD9855 QSPI](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
- [Datasheet della serie ESP32-S3 (Espressif, ripartizione pin ADC1/ADC2)](https://documentation.espressif.com/esp32-s3_datasheet_en.pdf)
