---
title: "ESP32-S3 pilota il display rotondo TK015F5785 (JD9855 QSPI) | tutorial completo di animazioni colorate con lookup table"
boardId: esp32s3
moduleId: display/tft15-jd9855
category: esp32
date: 2026-07-30
intro: "Usa ESP32-S3 per accendere tramite QSPI il display rotondo TK015F5785 da 1,5 pollici (il driver in realtà è JD9855, non lo ST77916 dichiarato dal produttore), driver scritto a mano a file singolo + tre animazioni con lookup table (Plasma / ruota arcobaleno / increspature radiali), compilazione e flash diretta in Arduino IDE, con guida ai problemi più comuni."
image: "https://img.lingflux.com/2026/07/8f43dd78cc005af725bd601e0a262621.jpg"
---

Difficoltà: ⭐⭐⭐☆☆ (più facile per chi ha già basi di microcontrollori, ma anche un principiante può farlo funzionare copiando)
Tempo stimato: 30-45 minuti (escluso il tempo di attesa per la spedizione da Taobao)
Ambiente di test: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 (basato su ESP-IDF v5, deve essere questa major version, il motivo è spiegato più avanti)

---

> **In una sola frase**: usa ESP32-S3 per accendere tramite QSPI il display rotondo TK015F5785 da 1,5 pollici — il produttore dichiara come driver ST77916, ma leggendo l'IC ID si scopre che in realtà è JD9855. In questo articolo si usa `esp_lcd_panel_io` integrato in ESP-IDF per scrivere a mano un mini driver a file singolo di poche decine di righe e far girare tre animazioni con lookup table (flusso Plasma / ruota arcobaleno / increspature radiali), senza installare nessuna libreria e senza chiamare `sin`/`atan2`/`sqrt` a runtime; in 30 minuti si ottiene uno schermo pieno di animazioni fluidissime.

---

## Premessa

Anch'io all'inizio pensavo che accendere un display rotondo fosse roba da cinque minuti: "collego l'alimentazione e gli mando un blocco di colore qualsiasi". Perché il produttore diceva che il driver era ST77916, presente nella GFX library for Arduino. Invece, dopo aver caricato il codice, lo schermo è passato gradualmente da nero a bianco pieno, quindi… mi sono proprio bloccato. In seguito, chiedendo al produttore il codice driver per ESP-IDF, ho scoperto che il driver di questo schermo è in realtà JD9855; e leggendo l'IC ID dello schermo (il codice restituito dall'IC ID è `FF 98 55 00`) si conferma che il chip driver è proprio JD9855. Per rendere semplice la replica per tutti, ho usato direttamente `esp_lcd_panel_io` integrato in ESP-IDF per scrivere a mano un mini driver di poche decine di righe — senza installare librerie, senza configurare font e senza nemmeno un header file dedicato: basta mettere tutto in un .ino e funziona.

Questo tutorial raccoglie il processo completo per portare questo display rotondo TK015F5785 da 1,5 pollici dallo stato di "vetro nero appena arrivato" a "schermo pieno di animazioni colorate fluide", inclusi collegamento, principio del driver e tre algoritmi di animazione fluidi che non chiamano `sin`/`atan2`/`sqrt`. Seguendo la guida, entro 30 minuti anche il vostro display rotondo si metterà in moto.

> **TL;DR (chi ha fretta guardi qui):**
>
> 1. Collegamento: SCLK→GPIO6, D0→GPIO15, D1→GPIO7, D2→GPIO11, D3→GPIO12, CS→GPIO16
> 2. In Arduino IDE scegliere Board = **ESP32S3 Dev Module**, USB CDC On Boot = **Enabled**
> 3. Non serve installare nessuna libreria di terzi: il codice si basa interamente su `esp_lcd_panel_io` integrato in ESP-IDF; la versione del core deve essere **v3.x**
> 4. Copiate l'intero .ino, compilate e fate il flash: all'accensione avrete subito uno schermo pieno di animazioni colorate fluenti; se non c'è immagine vuol dire che siete incappati in un problema, scorrete giù fino a "Risoluzione dei problemi comuni"

---

## Effetto dell'esperimento

Dopo l'accensione, il display riproduce automaticamente in ciclo tre animazioni colorate generate da algoritmi con lookup table, ciascuna della durata di 6 secondi, senza alcun senso di scatto né l'effetto tearing del disegno riga per riga:

- **Flusso Plasma**: i colori scorrono in modo continuo come un liquido
- **Ruota arcobaleno**: l'intero spettro cromatico ruota lentamente attorno al centro, come una tavolozza che gira senza sosta
- **Increspature radiali**: onde di colore si espandono dal centro verso l'esterno

Subito dopo l'accensione parte a schermo pieno, senza operazioni aggiuntive: ideale come esperimento di verifica che "questo schermo è davvero vivo".

---

## Descrizione dei componenti

> La scheda di sviluppo (ESP32-S3) non viene trattata qui; si illustrano solo i componenti principali oltre alla scheda.

### Display rotondo TK015F5785

La TK015F5785 è un display rotondo **IPS** da 1,5 pollici (driver JD9855) che si occupa di mostrare come immagine i dati pixel inviati dall'ESP32-S3; in questo progetto ha il ruolo di output visivo finale delle tre animazioni con lookup table. I parametri nella tabella seguente, se non diversamente indicato, provengono dal datasheet del modulo fornito dal produttore:

| Parametro            | Valore / Descrizione                                                                       | Fonte                          |
| -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------ |
| Dimensione           | 1,5 pollici                                                                                | Datasheet produttore           |
| Tipo LCD             | IPS, angolo di visuale completo                                                            | Datasheet produttore           |
| Risoluzione          | 360 × 360                                                                                  | Datasheet produttore           |
| Driver chip          | JD9855 (lo stesso modulo esiste anche in versione ST77916; fare riferimento all'IC ID misurato) | Datasheet produttore + misurazione |
| Area visibile        | Φ38,16 mm (diametro)                                                                       | Datasheet produttore           |
| Dimensioni esterne   | 44,32 × 44,32 × 3,5 mm                                                                     | Datasheet produttore           |
| Passo pixel          | 0,106 × 0,106 mm                                                                           | Datasheet produttore           |
| Numero di colori     | 65K colori (RGB565, 16 bit/pixel)                                                          | Datasheet produttore           |
| Luminosità           | 500 cd/m²                                                                                  | Datasheet produttore           |
| Retroilluminazione   | 4 LED bianchi in parallelo                                                                | Datasheet produttore           |
| Temperatura di funzionamento | -20 ~ 60 ℃                                                                         | Datasheet produttore           |
| Tipo di interfaccia  | QSPI (SCLK + D0~D3 + CS)                                                                   | Misurazione in questo tutorial |
| Clock di comunicazione | 20 MHz (valore testato in questo tutorial)                                               | Misurazione                    |

> **Prima dell'ordine, verificate assolutamente la versione**: il datasheet del modulo del produttore classifica questo display come "interfaccia RGB / driver ST77916 **oppure** JD9855" — il che significa che lo stesso modello TK015F5785 viene venduto in diverse combinazioni di driver IC e interfaccia. Questo tutorial riguarda la versione **JD9855 + QSPI** (nella premessa è proprio leggendo l'IC ID = `FF 98 55 00` che si è confermato come il chip non fosse lo ST77916 inizialmente indicato dal produttore). Se avete acquistato la versione ST77916 o quella con interfaccia RGB, sia la sequenza dei registri di inizializzazione sia il cablaggio vanno cambiati: non si può copiare tale e quale il codice di questo articolo.

L'area visibile fisica del display rotondo è un cerchio di diametro Φ38,16 mm che, alla risoluzione di 0,106 mm/pixel, corrisponde esattamente a un raggio di 180 pixel — per questo nel codice `R2MAX = 180²` serve a impostare attivamente a nero i pixel esterni al cerchio, in modo da avere un bordo rotondo pulito (vedi il punto 4 di "Risoluzione dei problemi comuni").

Il motivo per cui si è scelto questo display è molto diretto: l'interfaccia QSPI ha 3 linee dati in più rispetto al SPI tradizionale e la banda per trasmettere i dati è 4 volte quella del SPI normale; con una quantità di pixel come 360×360, usare ancora un SPI a linea singola darebbe un framerate davvero brutto.

### Descrizione dei pin

| Pin               | Funzione                                                       |
| ----------------- | -------------------------------------------------------------- |
| SCLK              | Linea di clock QSPI                                            |
| D0 / D1 / D2 / D3 | Le quattro linee dati QSPI (trasmissione parallela in Quad Mode) |
| CS                | Chip select, attivo basso per selezionare il display           |
| BL (retroilluminazione) | Controllo retroilluminazione; su alcuni moduli questo pin non è esposto |
| VCC               | Alimentazione, di solito 3,3 V                                 |
| GND               | Massa comune                                                   |

### JD9855 (driver chip)

Il JD9855 è un driver IC per LCD TFT a chip singolo integrato nel modulo display, prodotto dal costruttore di chip Jadard; dispone di un buffer display integrato (GRAM) e si occupa di scrivere nel buffer i dati pixel ricevuti e di pilotare le celle a cristalli liquidi per la visualizzazione dei colori. In questo progetto il suo ruolo è eseguire la sequenza di registri di inizializzazione e i comandi di scrittura pixel RAMWR inviati tramite `esp_lcd_panel_io`.

Per fortuna il JD9855 **ha un datasheet pubblico** (versione Preliminary V0.00 pubblicata dal costruttore di chip Jadard a ottobre 2023). Secondo il datasheet, le sue specifiche chiave sono le seguenti:

| Parametro             | Valore / Descrizione                                                                              | Fonte datasheet    |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------ |
| Capacità di pilotaggio | Driver SOC a chip singolo per a-Si TFT, massimo 360 RGB×390 (Dual-Gate=780) punti, 540 vie di pilotaggio source | Features / Intro   |
| Frame buffer integrato | 360×390×18 bit (circa 315 KB di GRAM)                                                             | Features           |
| Interfacce supportate | 8080 parallelo (8-bit), RGB (6-bit), SPI (8/9-bit, 2-lane), **QSPI (con supporto DDR)**, MIPI-DSI | System Interface   |
| Formato colore        | RGB565 (16-bit) / RGB666 (18-bit)                                                                 | Color Format       |
| Tensione I/O          | 1,65 V ~ 3,3 V                                                                                    | Features           |
| Temperatura di funzionamento | -40 ~ +85 ℃                                                                                | Features           |

Questo datasheet elenca in modo chiaro le definizioni di bit e i tempi dei comandi come 0x2A (CASET), 0x2B (RASET), 0x2C (RAMWR), 0x36 (MADCTL), 0x3A (COLMOD) — nel codice di questo articolo si usano proprio questi comandi standard. **Va precisato**: il datasheet rende pubblici l'instruction set e i tempi, ma i parametri di taratura del pannello come correzione Gamma, boost di alimentazione e i sottocomandi definiti da ciascun produttore (come i registri `0xDE` / `0xDF` / `0xC3` con "cambio Bank di comandi" presenti nella sequenza di inizializzazione di questo articolo) restano tabelle di inizializzazione private che il produttore del pannello taratura pezzo per pezzo in base al proprio schermo; per questa parte basta copiare la sequenza fornita dal produttore per accendere il display, senza dover approfondire il significato di ogni singolo comando.

---

## BOM

| Componente                                                | Quantità | Note                                                                                  |
| --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| Scheda di sviluppo ESP32-S3                               | 1        | Consigliata una versione con PSRAM, utile come fallback per la lookup table degli angoli |
| Modulo display rotondo TK015F5785 (JD9855 / QSPI)         | 1        | Verificate assolutamente che sia la versione JD9855+QSPI (lo stesso modello esiste anche nelle versioni ST77916/RGB, vedi la descrizione dei componenti) |
| Cavetti Dupont (femmina-femmina, in base ai pin del modulo) | da 6 in su | SCLK / D0~D3 / CS sono 6 in totale, più VCC / GND                                    |

---

## Modalità di collegamento

| Pin display                | Collega al pin ESP32-S3                                   |
| -------------------------- | --------------------------------------------------------- |
| SCLK                       | GPIO6                                                     |
| D0                         | GPIO15                                                    |
| D1                         | GPIO7                                                     |
| D2                         | GPIO11                                                    |
| D3                         | GPIO12                                                    |
| CS                         | GPIO16                                                    |
| BL (retroilluminazione)    | Non esposto su questo modulo, non controllabile via software: si accende appena arriva alimentazione |
| VCC                        | 3,3 V                                                     |
| GND                        | GND                                                       |

Dopo aver collegato tutto, conviene ricontrollare cavo per cavo: si risparmia l'80% del tempo di debug — la QSPI ha quattro linee dati e scambiare due fili spesso non dà schermo nero ma schermo "a neve", più difficile da diagnosticare rispetto al nero totale.

---

## Librerie da installare

Buone notizie: **non serve installare nessuna libreria di terzi**. L'intero driver richiama direttamente `driver/spi_master.h`, `esp_lcd_panel_io.h`, `esp_heap_caps.h` integrati in ESP-IDF, header file forniti già insieme al core di Arduino ESP32.

L'unico requisito vincolante: in Arduino IDE il **core della scheda ESP32 deve essere v3.x** (basato su ESP-IDF v5). Il core v2.x poggia su ESP-IDF v4.4; le API `esp_lcd_panel_io_tx_param` / `esp_lcd_panel_io_tx_color` nelle vecchie versioni hanno comportamento e percorso degli header diversi, quindi compilando direttamente si ottengono errori del tipo "simbolo non trovato" o "firma di funzione non corrispondente".

Procedura di aggiornamento: Arduino IDE → Strumenti → Scheda → Gestore schede, cercare "esp32" e aggiornare il pacchetto core di espressif a una versione 3.x o superiore.

---

## Codice completo

> Il codice è a file singolo: basta copiarlo e incollarlo in un nuovo .ino per compilarlo. Nota: il pin CS è `16` (in una vecchia versione c'era per errore il valore inesistente `160`; vedi il punto 1 di "Risoluzione dei problemi comuni").

```cpp
/*
 * =============================================================================
 *  Demo colorato a file singolo per display rotondo TK015F5785 (JD9855, QSPI) — versione Arduino IDE
 * =============================================================================
 *
 *  ✦ File singolo: driver + demo sono tutti in questo .ino, basta copiare e incollare, senza alcun file esterno.
 *
 *  Effetto demo (3 scene in ciclo automatico, circa 6 secondi ciascuna, tutte fluide e continue):
 *    [1] Flusso Plasma       — colori che scorrono come un liquido (lookup table di sin)
 *    [2] Ruota arcobaleno    — spettro completo + rotazione lenta (lookup table di angoli precalcolata)
 *    [3] Increspature radiali — onde colorate dal centro verso l'esterno (fase su r²)
 *
 *  Subito dopo l'accensione si ha uno schermo pieno di colori fluenti, prova evidente che "lo schermo si accende + i colori sono corretti", ideale come demo di accensione.
 *
 *  Chiave prestazionale: le operazioni per pixel di tutte e tre le scene sono "lookup table + addizioni/sottrazioni intere", senza chiamare sin/atan2/sqrt,
 *           per cui il rendering di ogni frame è molto rapido, l'occhio non percepisce la scansione riga per riga e tutto risulta fluido.
 *
 *  Hardware: ESP32-S3 + TK015F5785 (JD9855, QSPI)
 *    SCLK=6  D0=15  D1=7  D2=11  D3=12  CS=16  retroilluminazione=-1 (non esposta, non controllabile)
 *  Dipendenze: solo il core scheda esp32 di Arduino IDE v3.x, nessuna libreria esterna / nessun font / nessun header esterno.
 *  Upload: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled, seriale 115200.
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
/* Uguale ai programmi HelloWorld / di test; in caso di cambio cablaggio, aggiornare di conseguenza */
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1      /* Retroilluminazione, -1 = non controllata */ // Il modulo attuale non la espone, quindi non è controllabile

/* =====================================================================
 *  Driver display (JD9855 QSPI) — basta copiarlo tale e quale, in genere non serve modificarlo
 *  Principio: Arduino-ESP32 3.x si basa su ESP-IDF, richiama direttamente esp_lcd_panel_io per pilotare la QSPI.
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

    /* RGB565 standard */
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

    /* Invia un buffer RGB565 (little-endian) a un'area rettangolare */
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

    /* Riempie tutto lo schermo (riga per riga, occupazione di memoria minima) */
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

    /* Sequenza di inizializzazione del produttore JD9855 (portata dal driver esp_lcd_jd9855 di ESP-IDF) */
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
        sendCmd(0x11);            /* Esci dallo sleep */
        delay(120);
        sendCmd(0x29);            /* Accendi il display */
        delay(10);
    }
};

/* =====================================================================
 *  Parte demo — il cuore da guardare
 *  Idea: per ogni frame calcola riga per riga il colore di ciascun pixel e lo invia allo schermo.
 *       Tutte le grandezze "che dipendono dalla posizione ma non dal tempo" (sin, hue, angolo) sono precalcolate in lookup table,
 *       a runtime ogni pixel fa solo "lookup table + addizioni/sottrazioni intere", quindi tutte e tre le scene sono fluide.
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     /* 360 */
static constexpr int H = JD9855_QSPI::V_RES;     /* 360 */
static constexpr int CX = W / 2;                  /* x del centro */
static constexpr int CY = H / 2;                  /* y del centro */
static constexpr int RADIUS = 180;                /* raggio visibile del display rotondo */
static constexpr int R2MAX  = RADIUS * RADIUS;    /* soglia r² per l'esterno del cerchio (180²=32400) */

static const int BLOCK_H = 40;             /* Renderizza e invia 40 righe per batch, riducendo molto il numero di invii */
uint16_t blockBuf[W * BLOCK_H];            /* Buffer a blocchi (360*40*2=28KB, RAM interna, senza PSRAM) */
uint8_t  sinTab[256];       /* Lookup table del seno: sinTab[i] = sin(i/256*2π)*127+128 */
uint16_t hsvTab[256];       /* Lookup table hue (0-255) -> RGB565 (saturazione/luminosità massime) */
uint8_t *angleTab = nullptr;/* Lookup table dell'angolo di ogni pixel rispetto al centro (360*360B), per non chiamare atan2 nella scena del disco */

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

/* Genera all'avvio le due tabelle sin / hue, dopodiché il rendering fa solo lookup */
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

/* Precalcola l'angolo di ogni pixel rispetto al centro (atan2) e lo salva in una lookup table 0-255.
   A runtime la scena del disco fa solo lookup, senza chiamare atan2f a ogni frame (quella era la vera causa dei rallentamenti).
   Viene calcolata una sola volta nel setup, il tempo non conta. È messa preferibilmente in RAM interna (~126KB); in caso contrario fallback su PSRAM;
   se manca anche quella, resta nullptr e la scena degrada a atan2f (si vede comunque, ma scatta). */
void buildAngleTable()
{
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] allocazione angleTab fallita, la scena del disco sarà più lenta")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   /* -0.5..0.5 */
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);        /* Mappa ad anello su 0-255 */
        }
    }
    Serial.printf("[INIT] tabella angoli %d KB pronta (la scena del disco sarà fluida)\n", (int)(n / 1024));
}

inline uint8_t sin8(int phase) { return sinTab[(uint8_t)phase]; }

/* ---- Scena 1: flusso Plasma (solo lookup table) ---- */
inline uint16_t plasmaPixel(int x, int y, int t)
{
    int v = sin8(x * 3 + t)
          + sin8(y * 3 - t * 2)
          + sin8((x + y) * 2 + t / 2)
          + sin8((x - y) * 2 - t / 2);
    return hsvTab[(uint8_t)(v / 4 + t)];
}

/* ---- Scena 2: ruota arcobaleno (lookup table angoli + r², solo interi) ---- */
inline uint16_t wheelPixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;                 /* Nero fuori dal cerchio, bordo pulito */
    int ang = angleTab ? angleTab[y * W + x]
                       : (int)(atan2f((float)dy, (float)dx) / (2.0f * (float)M_PI) * 256.0f);
    int hue = ang + r2 / 200 + t;             /* Hue cumulata lungo il raggio, forma una ruota a spirale */
    return hsvTab[(uint8_t)hue];
}

/* ---- Scena 3: increspature radiali (r² direttamente come fase, senza radice) ---- */
inline uint16_t ripplePixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;
    int v = sin8(r2 / 80 - t * 3);            /* Fase dell'increspatura: si propaga con distanza + tempo */
    return hsvTab[(uint8_t)(v + r2 / 400)];
}

/* Renderizza un frame: calcola BLOCK_H righe e le invia in blocco (9 invii al posto di 360, riduce l'overhead dei comandi e alza il framerate,
   e fa aggiornare contemporaneamente blocchi di 40 righe, attenuando molto l'effetto scansione riga per riga). sceneId sceglie la funzione pixel (0=plasma 1=wheel 2=ripple) */
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

/* Nomi delle scene */
const char *SCENE_NAMES[] = { "Flusso Plasma", "Ruota arcobaleno", "Increspature radiali" };
const int      N_SCENES   = 3;
const uint32_t SCENE_MS   = 6000;    /* Ogni scena dura 6 secondi */

int      curScene   = 0;
uint32_t sceneStart = 0;

/* ----------------------------- setup ------------------------------- */
void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[TK015F5785] demo colorato a file singolo (JD9855 QSPI)"));

    Serial.println(F("[LCD] begin..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] init FALLITA! Controllare pin/versione core (serve esp32 v3.x)"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] init OK"));

    buildTables();
    buildAngleTable();          /* Precalcola la tabella degli angoli per rendere fluida la scena del disco */
    lcd.fillScreen(0);
    sceneStart = millis();
    Serial.printf("[DEMO] scena 1/%d: %s\n", N_SCENES, SCENE_NAMES[curScene]);
}

/* ----------------------------- loop -------------------------------- */
void loop()
{
    int t = (int)(millis() / 12);     /* Passo di avanzamento dell'animazione, più alto = più veloce */

    renderFrame(curScene, t);

    if (millis() - sceneStart >= SCENE_MS) {
        sceneStart = millis();
        curScene   = (curScene + 1) % N_SCENES;
        Serial.printf("[DEMO] scena %d/%d: %s\n",
                      curScene + 1, N_SCENES, SCENE_NAMES[curScene]);
    }
}
```

### Spiegazione del codice

Primo passo: in `JD9855_QSPI::begin()` si usa prima `spi_bus_initialize` per avviare un bus QSPI su 4 linee dati, poi `esp_lcd_new_panel_io_spi` per agganciare un device LCD IO con `quad_mode = true` — questo passaggio è la chiave perché l'intero driver funzioni; senza `quad_mode` abilitato, delle quattro linee dati solo una trasmette davvero e il framerate crolla a livelli inguardabili.

Secondo passo: `sendInitCommands()` copia tale e quale la tabella di inizializzazione dei registri fornita dal produttore del pannello, inviando i comandi uno a uno tramite `esp_lcd_panel_io_tx_param`; non serve capire il significato di ciascun registro e, se si cambia schermo, questa parte non va toccata.

Terzo passo, ed è il vero punto forte di questo codice: nessuna delle tre scene di animazione chiama a runtime funzioni lente come `sin`, `atan2`, `sqrt`; invece nella fase di `setup()` vengono tutte precalcolate in lookup table (`sinTab`, `hsvTab`, `angleTab`) e a runtime ogni pixel fa solo "lookup table + addizioni/sottrazioni intere". Ecco perché con 360×360 = 129.600 pixel per frame si riesce a mantenere un'animazione fluida senza tearing.

Quarto passo: `renderFrame()` non invia i dati riga per riga, ma accumula `BLOCK_H = 40` righe e poi fa un'unica `pushRect` in blocco; per 360 righe bastano 9 invii, risparmiando parecchio overhead di comandi SPI rispetto ai 360 invii riga per riga.

---

## Risoluzione dei problemi comuni

Niente panico: i problemi qui sotto coprono la maggioranza degli errori in cui ci si imbatte quando il display rotondo non si accende:

**1. Dopo l'alimentazione schermo tutto nero, e sulla seriale non compare `[LCD] init OK`** Per prima cosa verificate che il pin CS sia collegato bene — questo è proprio il punto in cui è più facile inciampare nelle bozze di questo codice: `PIN_LCD_CS` in passato era stato scritto per errore come `160` (un numero di GPIO inesistente); nel blocco di codice di questo articolo è già stato corretto in `16`. Se state copiando una vecchia versione da un'altra fonte, accertatevi che quella riga sia `16` e non `160`.

**2. Lo schermo si illumina ma mostra neve/colori sballati** Molto probabilmente le quattro linee dati D0~D3 sono in ordine scambiato. La QSPI è sensibile all'ordine dei fili, non è come scambiare MOSI/MISO su un SPI normale: conviene ricontrollare cavo per cavo usando la tabella di collegamento, senza affidarsi al "a occhio".

**3. Errore di compilazione, non trova `esp_lcd_panel_io.h`** Significa che il core di Arduino ESP32 in uso è ancora v2.x (basato su ESP-IDF v4.4). Andate nel Gestore schede e aggiornate il core esp32 di espressif a v3.x o superiore prima di ricompilare.

**4. I quattro angoli del display rotondo restano sempre neri, è un collegamento sbagliato?** È normale, non è un guasto. Nel codice `R2MAX = 180²`: i pixel oltre quel raggio vengono impostati attivamente a nero, perché l'area visibile fisica del display rotondo è di per sé un cerchio e i quattro angoli sono già coperti dalla cornice; così facendo il bordo risulta più pulito.

**5. La seriale stampa `allocazione angleTab fallita` e la scena del disco rallenta** Significa che la RAM interna non basta ad allocare questa tabella degli angoli di circa 126 KB (360×360 byte). Il codice implementa già una logica di fallback: prima prova la RAM interna, in caso di fallimento passa alla PSRAM e, se nemmeno quella c'è, ricalcola con `atan2f` sul momento (si vede, ma rallenta in modo evidente). Se la vostra scheda non ha PSRAM e la scena del disco vi sembra sempre più scattosa delle altre due, questo è il motivo; con una scheda dotata di PSRAM il problema si risolve alla radice.

**6. La retroilluminazione resta sempre accesa e non si spegne** Nel codice `PIN_LCD_BL` è impostato a `-1` e il commento dice "Il modulo attuale non la espone, quindi non è controllabile" — se il vostro modulo espone davvero il pin di controllo della retroilluminazione, modificate questa macro con il numero di GPIO corrispondente e passatelo in `begin()` per ottenere dimmerazione/on-off via software.

---

## Domande e risposte (FAQ)

**D: Come accende un ESP32 un display rotondo?** R: Il cuore è usare l'interfaccia QSPI + `esp_lcd_panel_io` per collegarsi direttamente al chip driver, senza dipendere da librerie grafiche generiche come TFT_eSPI; nel cablaggio collegare bene i cinque fili SCLK/D0~D3/CS e copiare la sequenza di inizializzazione fornita dal produttore del pannello per accendere il display.

**D: Quale libreria si usa per un display rotondo con driver JD9855?** R: Non serve una libreria aggiuntiva. Il JD9855 non è supportato nativamente dalle librerie grafiche più diffuse (come TFT_eSPI o la lista driver ufficiale di LVGL); l'approccio più sicuro è quello di questo articolo, richiamare direttamente le API `esp_lcd_panel_io` integrate in ESP-IDF e scrivere a mano poche decine di righe di codice di inizializzazione.

**D: Che differenza c'è nel cablaggio tra uno schermo QSPI e uno SPI normale?** R: Lo SPI normale ha una sola linea dati (MOSI), la QSPI ne ha 4 (D0~D3) in trasmissione parallela, con una banda 4 volte superiore; il prezzo da pagare sono 3 fili in più e, in `esp_lcd_panel_io_spi_config_t`, l'obbligo di impostare `flags.quad_mode` a `true`.

**D: Quali cause per uno schermo nero persistente su display rotondo ESP32-S3?** R: Le tre cause più comuni, in ordine di probabilità: pin CS collegato male o numero errato nel codice, versione del core della scheda inferiore a v3.x che fa fallire l'inizializzazione, alimentazione instabile (più evidente con i tracciati QSPI più lunghi). La presenza o meno di `[LCD] init OK` sulla seriale permette di capire in fretta se si tratta di un problema a livello driver o di cablaggio.

**D: Come si usa esp_lcd_panel_io in Arduino per pilotare uno schermo?** R: In tre passaggi: `spi_bus_initialize` crea il bus SPI, `esp_lcd_new_panel_io_spi` crea l'handle LCD IO (in questo passaggio si specificano CS/frequenza di clock/modalità SPI/quad_mode) e infine `esp_lcd_panel_io_tx_param` invia i comandi mentre `esp_lcd_panel_io_tx_color` invia i dati pixel.

**D: Si può usare la libreria TFT_eSPI con un display rotondo ESP32?** R: TFT_eSPI è rivolto principalmente ai chip driver presenti nella sua lista di supporto integrata; driver QSPI poco diffusi come il JD9855 non ne fanno parte. Provare a forzarlo richiede in genere di modificare da sé il codice a livello driver, il che risulta meno comodo che scrivere a mano le API native ESP-IDF.

**D: La memoria basta per un display rotondo a 360×360?** R: Sì, ma bisogna prestare attenzione a come si alloca. Un buffer unico per tutto lo schermo richiede 360×360×2 byte ≈ 253 KB; questo articolo usa un rendering a blocchi (40 righe per blocco, circa 28 KB) più l'opzionale lookup table degli angoli da 126 KB, che la RAM interna riesce in genere a contenere: non serve montare PSRAM apposta per questo display (a meno che non vogliate tenere tranquillamente anche la tabella degli angoli in RAM interna).

---

## Approfondimenti

Una volta fatta funzionare la demo di base, ci sono parecchie direzioni in cui continuare a smanettare con questo display rotondo:

- Sostituire le tre scene con lookup table con visualizzazioni di dati in tempo reale (carico CPU, meteo, frequenza cardiaca, ecc.: la forma rotonda si presta molto ai cruscotti)
- Aggiungere touch/encoder rotativi per realizzare un pannello di controllo rotondo interattivo
- Usare la stessa idea di esp_lcd_panel_io per portare schermi con altri chip driver QSPI
- Aumentare BLOCK_H e pclk_hz per fare stress test sul framerate e trovare la massima frequenza di aggiornamento del vostro modulo specifico

---

## Riferimenti

- <cite index="3-1">La documentazione ufficiale della periferica LCD di ESP-IDF illustra come il componente esp_lcd sia un insieme di API generiche cross-chip fornite da Espressif per supportare diversi tipi di schermo (SPI LCD, I80 LCD, RGB/SRGB LCD, ecc.)</cite>: [ESP-IDF LCD Peripheral (ESP32-S3)](https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32s3/api-reference/peripherals/lcd.html)
- [Datasheet ufficiale della serie ESP32-S3 (PDF, Espressif ufficiale)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Repository GitHub ufficiale espressif/arduino-esp32](https://github.com/espressif/arduino-esp32)
- <cite index="3-2">Il datasheet pubblico del JD9855 (versione Preliminary V0.00 pubblicata dal costruttore di chip Jadard in data 2023-10-17; di seguito il mirror PDF ospitato da OSPTek) elenca le 540 vie di pilotaggio source, la risoluzione 360RGB×390, la GRAM integrata, le molteplici interfacce 8080/SPI/QSPI/MIPI-DSI e i tempi completi dei comandi CASET/RASET/RAMWR e altri</cite>: [JD9855 Data Sheet (Preliminary V0.00, PDF)](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
