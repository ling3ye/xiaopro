---
title: "ESP32-S3 pilota il display LCD monocromatico riflettivo ST7305 da 4,2 pollici: 15 esempi completi (SPI a 4 fili + Arduino)"
boardId: esp32s3
moduleId: display/lcd42-st7305-reflective
category: esp32
date: 2026-11-06
intro: "Usa un Arduino Nano ESP32 (ESP32-S3) con SPI a 4 fili per pilotare un display LCD monocromatico riflettivo ST7305 da 4,2 pollici 300×400: cablaggio, flash, 15 esempi di visualizzazione e risoluzione dei problemi. Perfetto per i maker Arduino che vogliono giocare con uno schermo riflettivo senza retroilluminazione."
image: "https://img.lingflux.com/2026/11/e43d291425c39954fa157a9adb62fddb.jpg"
---

> **In una frase**: Un Arduino Nano ESP32 (ESP32-S3) più un display LCD monocromatico riflettivo ST7305 da 4,2 pollici — un solo file `.ino` fa girare il driver e una demo a carosello automatico di 15 pagine, senza alcuna libreria di display di terze parti.

```text
Difficoltà: ⭐⭐☆☆☆ (se sai infilare cavi dupont e usare l'Arduino IDE, ce la fai)
Tempo stimato: 30 minuti (senza contare il tempo passato a lottare con i falsi contatti)
Ambiente di test: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10
```

> **TL;DR (avvio rapido):**
>
> 1. Cablaggio: SCLK → D7/GPIO10, MOSI → D5/GPIO8, CS → D6/GPIO9, DC → D4/GPIO7, RES → D3/GPIO6.
> 2. VCI su 3.3V, e il display condivide la massa con la scheda; TE e BLC restano scollegati. Attenzione: sul Nano ESP32, D5 è GPIO8, non GPIO11.
> 3. Installa il package di schede `esp32 by Espressif Systems`; non servono U8g2, Adafruit GFX né altre librerie di display.
> 4. Apri il `ST7305_RLCD_Demo.ino` incluso, seleziona la scheda `Arduino Nano ESP32`, compila e flasha.
> 5. Imposta il monitor seriale a 115200 baud; lo schermo fa poi un carosello automatico su 15 esempi. Le pagine animate usano HPM; le pagine statiche vengono scritte sullo schermo una sola volta.

## Introduzione: uno schermo tanto più leggibile quanto meno brilla

Guardare un LCD normale di sera a volte è come se qualcuno puntasse una piccola torcia direttamente nei tuoi occhi. Un display e-ink è comodo, certo, ma guardarlo aggiornare un'animazione è come aspettare l'autobus — sai che arriva, ma non può arrivare più in fretta.

Gli schermi totalmente riflettivi prendono una terza strada: invece di illuminare i pixel con una retroilluminazione, riflettono la luce ambientale, come un foglio di carta che il tuo programma può riscrivere. Con molta luce, l'immagine diventa persino più nitida; quando è troppo buio, accendi semplicemente una lampada — non dimostrare la tua forza di volontà strizzando gli occhi.

Questa volta ho usato un Arduino Nano ESP32 (il cui microcontrollore è un ESP32-S3) per pilotare un Mono TFT riflettivo da 4,2 pollici, 300×400, con controller ST7305. L'obiettivo non era fermarsi dopo un `Hello World`, ma provare testo, scala di grigi, geometria, animazione, frame rate e rotazione in quattro versi attraverso 15 esempi.

Il "riposa gli occhi" qui si riferisce alla visione senza retroilluminazione, per riflessione della luce ambientale — non è una certificazione medica. Quando i tuoi occhi hanno bisogno di riposo, nessuno schermo, per quanto avanzato, può battere le palpebre al posto tuo.

## Il risultato: 15 demo dello ST7305 in carosello automatico

Dopo aver flashato un unico file `.ino`, lo schermo parte dalla pagina iniziale e scorre automaticamente attraverso 15 pagine — senza pulsanti, comandi seriali, rete né risorse di immagini esterne.

![Carosello delle 15 demo dello ST7305](https://img.lingflux.com/2026/11/26bdefa52b9c1d4b6e779c08f9744255.jpg)

|    # | Demo          | Cosa guardare                                          | Durata  | FPS obiettivo |
| ---: | ------------- | ------------------------------------------------------ | ------: | ------------: |
|    1 | Hello World   | Testo grande, bordi, sfondo ditherato e uno smiley     |  3,5 s  |       statica |
|    2 | Dither Gray   | 17 livelli di dithering Bayer 4×4, gradiente e cerchi grigi | 6,5 s |     statica |
|    3 | Geometry      | Linee, rettangoli, cerchi, triangoli e poligoni        |     5 s |       statica |
|    4 | Pixel Grid    | Bordi, rapporto d'aspetto, diagonali e centratura geometrica | 5 s |     statica |
|    5 | Text & Font   | ASCII 5×7, scaling intero e testo invertito            |   5,5 s |       statica |
|    6 | Dashboard UI  | Card, barre di avanzamento, interruttori, batteria e dati live | 9 s | 4 FPS |
|    7 | Frame Rate    | FPS reale, costo per trama e grafico storico a 54 punti |   8,5 s | senza limiti |
|    8 | Fine Patterns | Scacchiere da 1/2/4 pixel e sfarfallio di linee sottili |    6 s |        2 FPS  |
|    9 | Bounce        | Rimbalzi, collisioni, ghosting di movimento e contatore |    9 s |       20 FPS  |
|   10 | Starfield     | Volo in prospettiva attraverso 56 stelle               |     9 s |       20 FPS  |
|   11 | Game of Life  | Gioco della vita di Conway su un toro 34×34            |    12 s |        3 FPS  |
|   12 | Uptime Clock  | Un orologio di uptime basato su `esp_timer`            |     9 s |        4 FPS  |
|   13 | Retro Desktop | Un desktop retrò in stile Macintosh                    |   6,5 s |       statica |
|   14 | Inversion     | Inversione bianco/nero a schermo intero e controllo contrasto | 6 s |      2 FPS  |
|   15 | Rotation      | Commutazione 0°/90°/180°/270° in quattro versi         |    12 s |        4 FPS  |

L'FPS obiettivo è il ritmo a cui il programma disegna e invia trame — non è la frequenza di refresh ottica del pannello di vetro. La pagina 7 misura "disegno + trasferimento SPI di una trama completa da 15000 byte", non un benchmark gonfiato per vantarsi.

Video dimostrativo su YouTube:

<iframe width="560" height="315" src="https://www.youtube.com/embed/IWZMK5AJsvI?si=pXumVzEKfuIYEra9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Descrizione dei componenti

### Mono TFT riflettivo da 4,2 pollici: uno schermo bianco e nero "sviluppato" dalla luce ambientale

Il Mono TFT riflettivo da 4,2 pollici è un LCD monocromatico riflettivo senza retroilluminazione. Presenta immagini in bianco e nero usando la luce ambientale, e in questo progetto mostra i 15 pattern di test e le pagine animate.

Pensalo come un foglio di carta che obbedisce a un microcontrollore: migliore è la luce ambientale, più rilassata è la lettura; senza luce ambientale, non si trasforma da solo in una torcia.

| Parametro        | Questo display                       |
| ---------------- | ------------------------------------ |
| Codice           | W420HC018MONO-12Z                    |
| Dimensione       | 4,2 pollici                          |
| Risoluzione      | 300×400 pixel, bianco/nero 1 bit     |
| Tipo di display  | Totalmente riflettivo, normalmente bianco, senza retroilluminazione |
| IC driver        | Sitronix ST7305                      |
| Interfaccia host | SPI a 4 fili singolo, sola scrittura |
| Alimentazione    | 2.8V/3.3V — qui si usa 3.3V          |
| Area attiva      | 63,6×84,84 mm                        |
| Temp. di lavoro  | -20℃～+70℃                           |

Perché questo: 300×400 basta per un cruscotto completo, l'SPI a 4 fili occupa pochi pin, e senza circuito di retroilluminazione è ideale per dati ambientali, orologi e quadri a bassa frequenza di refresh.

### Definizione dei pin

Tutti i segnali escono tramite un cavo FPC da 12 pin; con la scheda adattatrice puoi collegare lo schermo alla tua scheda con cavi dupont:

| Pin FPC   | Nome  | Funzione                    | Uso in questo esempio   |
| --------: | ----- | --------------------------- | ------------------------ |
|  1, 5, 12 | GND   | Massa di alimentazione      | A GND della scheda       |
|      2, 3 | NC    | Non connesso                | Lasciare libero          |
|         4 | VCI   | Alimentazione del display   | A 3.3V                   |
|         6 | TE    | Uscita di sincronismo trama | Inutilizzato, in aria    |
|         7 | DC    | Selezione comando/dati      | A GPIO7                  |
|         8 | CS    | Chip select SPI, attivo basso | A GPIO9                |
|         9 | SCL   | Clock SPI                   | A GPIO10                 |
|        10 | SDA   | Ingresso dati SPI, ossia MOSI | A GPIO8                |
|        11 | RESET | Reset hardware, attivo basso | A GPIO6                 |

Attenzione: qui `SDA` è il MOSI dell'SPI, non I²C. Stesso nome, lavoro diverso — non lasciarlo andare a fare parentela con i tuoi sensori I²C.

### ST7305: il "selezionatore" che traduce i byte in pixel bianco e nero

Lo ST7305 è il controller/driver IC per TFT monocromatico a ultra basso consumo di Sitronix. Riceve i comandi dall'host, gestisce la RAM del display e pilota il pannello — in questo progetto trasforma i dati di trama inviati dall'ESP32-S3 in pixel bianco e nero sullo schermo.

| Parametro              | Valore / configurazione in questo progetto    |
| ---------------------- | -------------------------------------------- |
| Capacità max.          | 408×408 pixel mono                           |
| Profondità di pixel    | 1 bit/pixel                                  |
| Ciclo min. scrittura SPI | 30 ns — circa 33 MHz max.                  |
| SPI in questo progetto | Mode 0, 20 MHz, MSB prima                    |
| Frame rate HPM         | 16 Hz o 32 Hz; configurato a 16 Hz qui       |
| Frame rate LPM         | 0,25～8 Hz; configurato a 8 Hz all'init      |
| Trama completa qui     | 15000 byte                                   |

Non l'abbiamo scelto perché ha tanti registri e sembra professionale — ma perché il modulo lo incapsula già molto bene: all'host bastano SPI, DC, CS e RESET per rinfrescare tutto lo schermo.

### Scheda adattatrice FPC: tradurre il "fino cavo piatto" in "cavi dupont"

Una scheda adattatrice FPC è una scheda di conversione di interfaccia per cavi che porta il FPC da 12 pin dello schermo su pin header comodi per sperimentare, così che in questo progetto lo schermo si può collegare alla scheda con normali cavi dupont.

| Parametro      | Uso in questo progetto                     |
| -------------- | ----------------------------------------- |
| Lato schermo   | FPC da 12 pin                             |
| Lato esperimento | GND, VCC, SCL, SDA, RES, DC, CS, BLC    |
| Segnali richiesti | 5 linee di controllo + 3.3V + GND       |
| Possono restare liberi | TE, BLC                              |

La usiamo per non dover saldare a mano quel cavo piatto così fino. Stiamo facendo un esperimento di display, non ci stiamo iscrivendo a un doppio esame di vista e saldatura.

## BOM

| Componente                              | Quantità | Necessità   | Note                                           |
| --------------------------------------- | -------: | ----------- | ---------------------------------------------- |
| Scheda Arduino Nano ESP32               |        1 | Necessaria  | Il microcontrollore è un ESP32-S3              |
| Display mono riflettivo ST7305 da 4,2"  |        1 | Necessario  | 300×400, alimentato a 3.3V                     |
| Scheda adattatrice FPC corrispondente   |        1 | Consigliata | Serve solo a comodità di cablaggio; va bene anche un connettore FPC |
| Cavi dupont                             |     7+   | Necessari   | Il più corti possibile — meno problemi di contatto e segnale |

## Cablaggio: SPI a 4 fili dell'ESP32-S3 allo ST7305

![Cablaggio dello ST7305 su un Arduino Nano ESP32](https://img.lingflux.com/2026/11/a029c2eab88f09f46c951a53287b647e.jpg)

```text
Arduino Nano ESP32                         Scheda adattatrice ST7305
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

| Serigrafia adattatore | FPC schermo | Serigrafia Nano ESP32 | ESP32-S3 GPIO | Uso                  |
| ---------------------- | ----------: | ---------------------- | ------------: | -------------------- |
| SCL                    |       PIN9  | D7                     |        GPIO10 | Clock SPI            |
| SDA                    |      PIN10  | D5                     |         GPIO8 | SPI MOSI             |
| CS                     |       PIN8  | D6                     |         GPIO9 | Chip select          |
| DC                     |       PIN7  | D4                     |         GPIO7 | Selezione comando/dati |
| RES                    |      PIN11  | D3                     |         GPIO6 | Reset hardware       |
| VCC/VCI                |       PIN4  | 3V3                    |  alim. 3.3V   | Alimentazione display |
| GND                    |  PIN1/5/12  | GND                    |           GND | Massa comune         |
| TE                     |       PIN6  | non connesso           |             — | Sincronismo trama inutilizzato qui |
| BLC                    |          —  | non connesso           |             — | Display riflettivo senza retroilluminazione |

**In questo esempio VCI va su 3.3V — non collegarlo a 5V, VBUS né VIN.**

### Senza circuito driver aggiuntivo: l'ESP32-S3 pilota il FPC del display direttamente

Con alimentazione a 3.3V, questo display può essere pilotato direttamente dai GPIO dell'ESP32-S3: collega SCL, SDA, CS, DC e RESET del FPC ai rispettivi GPIO, VCI a 3.3V e condividi GND. Non serve interporre un chip di traslazione di livello, una scheda driver dedicata per display né alcun altro circuito periferico.

La "connessione diretta" qui si riferisce alla connessione **elettrica** — non significa infilare il cavo piatto nudo e morbido direttamente nei pin header della scheda. In pratica serve comunque un connettore FPC da 12 pin, uno zoccolo saldato o una scheda adattatrice per portare fuori i contatti del cavo piatto in modo affidabile. La scheda adattatrice di questo articolo è solo un adattatore meccanico per usare cavi dupont; non è un circuito driver di cui il display abbia bisogno per funzionare. Se cabli direttamente da un connettore FPC, segui i numeri PIN FPC della tabella sopra — la corrispondenza dei segnali è identica.

Il punto dove il cablaggio fallisce più facilmente: il codice vuole i numeri GPIO del chip, non i numeri stampati nella serigrafia della scheda. Qui `D5 = GPIO8`, mentre `GPIO11 = A4`. Se cabli MOSI su GPIO11 per errore, il programma gira comunque e il monitor seriale stampa allegramente — mentre lo schermo resta silenzioso come una bolletta della luce non pagata.

Dopo il cablaggio, ricontrolla nell'ordine "alimentazione → massa comune → SCLK → MOSI → CS → DC → RESET" — risparmia circa l'80% del tempo di debug. Per l'FPC, conferma anche il verso di inserimento, che sia infilato a fondo e bloccato; uno scatto allentato può mettere in sciopero tutto lo schermo.

## Librerie da installare: solo il package di schede ESP32

Questa demo Arduino dello ST7305 non dipende da U8g2, Adafruit GFX, TFT_eSPI né da alcuna libreria di font aggiuntiva. Il driver, il font ASCII 5×7, le primitive grafiche e le 15 pagine vivono in un unico file `.ino`.

### Passo 1: installa l'Arduino IDE

Questo articolo usa Arduino IDE 2.3.8, scaricabile dal sito ufficiale di Arduino.

### Passo 2: installa l'ESP32 Arduino Core

Apri il Gestore Schede, cerca e installa:

```text
esp32 by Espressif Systems (versione testata in questo articolo: 3.3.10)
```

Scegli nel Gestore Schede la stessa versione usata qui — minimizza le differenze di API e di configurazione di default tra package di schede.

### Passo 3: seleziona scheda e porta

```text
Scheda: Arduino Nano ESP32
Porta: scegli la porta che appare dopo aver collegato la scheda
Monitor seriale: 115200
```

L'`SPI` standard di Arduino, i timer e `esp_timer` vengono tutti con l'ambiente della scheda — non serve andare nel Gestore Librerie a "installare a caso qualche libreria dal nome simile".

### In più: e se preferisci una libreria esistente?

Questo tutorial usa un driver in un solo file affinché inizializzazione, framebuffer e mapping dei pixel restino leggibili direttamente — non significa che lo ST7305 non possa usare librerie. Se vuoi sviluppare a partire da questo progetto, considera queste opzioni:

| Opzione                                                      | Ideale per                                | Cosa controllare nell'uso                                    |
| ------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| [U8g2](https://github.com/olikraus/u8g2) v2.36 o più recente | Testo, grafica di base e font ricchi      | Fornisce `U8G2_ST7305_300X400_1_4W_HW_SPI`, con supporto per SPI hardware a 4 fili a questa risoluzione; controlla la versione della libreria all'installazione e cambia CS, DC, RESET e i pin SPI sui GPIO usati in questo articolo |
| [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library) | Se vuoi un driver Arduino dedicato per ST7305 | Fornisce wrapper come `ST7305_4p2_BW_DisplayDriver`; verifica risoluzione, sequenza di inizializzazione e configurazione dei pin in `DisplayConfig.h` — questo articolo non l'ha testata su questo modulo |
| LVGL + driver basso livello ST7305                           | UI complesse, widget e gestione di pagine | LVGL si occupa dell'UI e non sostituisce il driver dello ST7305; bisogna collegare il driver di questo articolo (o quello del produttore) alla callback di flush di LVGL, e valutare l'uso del framebuffer e il refresh reale |

Non dare per scontato che librerie grafiche generiche come Adafruit GFX, TFT_eSPI o Arduino_GFX pilotino lo ST7305 appena installate — verifica prima se la versione attuale supporta esplicitamente questo controller; altrimenti dovrai adattarlo tu. Anche cambiando libreria, i vincoli hardware — alimentazione 3.3V, SPI a 4 fili, HPM/LPM e il mapping di pixel di 2 righe × 4 colonne — non spariscono.

**Scelta rapida:** soprattutto testo e grafica di base → prova prima U8g2; UI complessa → considera LVGL; controllo totale su inizializzazione, invio di trame complete e ritmo delle animazioni → l'approccio a file singolo di questo articolo è il più diretto.

## Codice completo: programma Arduino in un solo file ST7305_RLCD_Demo

Codice sorgente completo e pronto da flashare:

```c
/*
 * ST7305 LCD monocromatico totalmente riflettivo da 4,2" 300x400 — demo Arduino completa in un solo file
 *
 * Stesse funzioni della versione ESP-IDF: driver + primitive grafiche + demo a carosello automatico di 15 pagine.
 * L'intero programma è questo unico file .ino, senza dipendenze da librerie di terze parti, facile da condividere.
 *
 * Cablaggio (serigrafia dell'Arduino Nano ESP32):
 *   SCLK = GPIO10 (D7)   MOSI = GPIO8 (D5)   CS  = GPIO9 (D6)
 *   DC   = GPIO7  (D4)   RES  = GPIO6 (D3)   VCI = 3.3V  GND = GND
 *
 * Preparazione dell'Arduino IDE:
 *   1. Installa "esp32 by Espressif Systems" nel Gestore Schede
 *   2. Seleziona la scheda "Arduino Nano ESP32" e la sua porta seriale
 *   3. Questo file deve stare in una cartella con lo stesso nome (l'IDE lo chiederà all'apertura del .ino — clicca "OK")
 */
#include <Arduino.h>
#include <SPI.h>
#include "esp_timer.h"   /* esp_timer_get_time() */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>

/* ================= Modificabile dall'utente: pin e clock SPI ================= */
#define PIN_SCLK        10
#define PIN_MOSI         8
#define PIN_CS           9
#define PIN_DC           7
#define PIN_RES          6
#define SPI_CLOCK_HZ     20000000UL   /* 20 MHz; consigliati 20~30 MHz */

/* ================= Parametri base dello ST7305 ================= */
#define ST7305_LCD_WIDTH      300
#define ST7305_LCD_HEIGHT     400
#define ST7305_DATA_WIDTH     75      /* 300/4 = 75 byte per riga */
#define ST7305_BUFFER_LENGTH  15000   /* 75 * 200 */
#define ST7305_COLOR_WHITE    0x00
#define ST7305_COLOR_BLACK    0x01

#define LOGI(fmt, ...) Serial.printf("[st7305] " fmt "\r\n", ##__VA_ARGS__)

/* Dispositivo driver (istanza singola, framebuffer da 15000 byte incorporato) */
typedef struct {
    int gpio_dc;
    int gpio_res;
    int gpio_cs;
    uint32_t clock_hz;
    uint8_t rotation;                      /* 0=0° 1=90° 2=180° 3=270° (senso orario) */
    uint8_t buffer[ST7305_BUFFER_LENGTH];
} st7305_dev_t;

typedef st7305_dev_t *st7305_handle_t;

static st7305_dev_t lcd_dev;               /* istanza globale unica */

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

/* Scrivere registro (comando): DC=LOW */
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);
    spi_write_byte(dev, reg);
}

/* Scrivere parametro (dato): DC=HIGH */
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
 * Sequenza di inizializzazione dello ST7305: coincide con il codice di inizializzazione ad alta frequenza di scansione del produttore HSD 4,2" 300x400;
 * MADCTL=0x48 (MX=1, DO=1), ritardo di sleep-out di 255 ms, finestra colonne CASET 0x12~0x2B.
 */
static void initial_st7305(st7305_handle_t dev)
{
    /* reset hardware */
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
    WR(0xB0, 0x64);         /* Gate Line: 400 righe (da impostare prima dello Sleep-out) */

    write_register(dev, 0x11);  /* Sleep out */
    delay(255);

    WR(0xC9, 0x00);         /* Source Voltage Select: gruppo 1 */
    WR(0x36, 0x48);         /* MADCTL: MX=1, DO=1 */
    WR(0x3A, 0x11);         /* Data Format: 3-write 24-bit */
    WR(0xB9, 0x20);         /* Modalità Mono (retaggio del produttore) */
    WR(0xB8, 0x29);         /* Panel: dot_1 inversione + scansione Frame */

    write_register(dev, 0x21);  /* Inverse ON */

    /* WRITE RAM finestra indirizzi 300*400 */
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

    /* Solo MOSI, niente MISO; CS pilotato manualmente via software */
    SPI.begin(gpio_sclk, -1, gpio_mosi, -1);

    initial_st7305(dev);
    memset(dev->buffer, 0, ST7305_BUFFER_LENGTH);
    LOGI("ST7305 init OK (%dx%d)", ST7305_LCD_WIDTH, ST7305_LCD_HEIGHT);
    return dev;
}

/** Riempire il framebuffer (0x00 = tutto bianco / 0xFF = tutto nero) */
void st7305_fill(st7305_handle_t dev, uint8_t data)
{
    memset(dev->buffer, data, ST7305_BUFFER_LENGTH);
}

/** Cancellare il framebuffer (tutto bianco) */
void st7305_clear(st7305_handle_t dev)
{
    st7305_fill(dev, 0x00);
}
/**
 * Impostare l'orientamento del display: 0=0°, 1=90° orario, 2=180°, 3=270° orario.
 * La rotazione è implementata tramite il mapping delle coordinate del framebuffer; a 90°/270° la risoluzione logica è 400x300.
 * Influisce solo sul disegno successivo; non cancella il framebuffer né aggiorna lo schermo immediatamente.
 */
void st7305_set_rotation(st7305_handle_t dev, uint8_t rotation)
{
    if (rotation <= 3) dev->rotation = rotation;
}

/** Ottenere l'orientamento attuale (0~3) */
uint8_t st7305_get_rotation(st7305_handle_t dev)
{
    return dev->rotation;
}

/** Ottenere larghezza/altezza logica dell'orientamento attuale */
int st7305_get_width(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
}

int st7305_get_height(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
}

/**
 * I pixel logici vengono prima mappati sulle coordinate fisiche 300x400 secondo l'orientamento, poi scritti nel framebuffer:
 *   Un byte (8 bit) corrisponde a 2 righe × 4 colonne di pixel:
 *     riga0: BIT7 BIT5 BIT3 BIT1   (bit pari -> riga successiva)
 *     riga1: BIT6 BIT4 BIT2 BIT0
 *   1 = nero, 0 = bianco
 */
void st7305_write_point(st7305_handle_t dev, int x, int y, uint16_t color)
{
    int logical_width = (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
    int logical_height = (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
    if (x < 0 || y < 0 || x >= logical_width || y >= logical_height) return;

    int physical_x;
    int physical_y;
    switch (dev->rotation) {
    case 1: /* 90° orario, logico 400x300 */
        physical_x = ST7305_LCD_WIDTH - 1 - y;
        physical_y = x;
        break;
    case 2: /* 180°, logico 300x400 */
        physical_x = ST7305_LCD_WIDTH - 1 - x;
        physical_y = ST7305_LCD_HEIGHT - 1 - y;
        break;
    case 3: /* 270° orario, logico 400x300 */
        physical_x = y;
        physical_y = ST7305_LCD_HEIGHT - 1 - x;
        break;
    default: /* 0°, logico 300x400 */
        physical_x = x;
        physical_y = y;
        break;
    }

    int real_x = physical_x / 4;
    int real_y = physical_y / 2;
    int index = real_y * ST7305_DATA_WIDTH + real_x;
    int one_two = physical_y % 2;          /* 0 o 1 */
    int line_bit_4 = physical_x % 4;       /* 0~3 */
    int bit = 7 - (line_bit_4 * 2 + one_two);

    if (color) dev->buffer[index] |= (1 << bit);
    else dev->buffer[index] &= ~(1 << bit);
}

/** Impostare la finestra indirizzi ed emettere RAMWR */
static void set_address_window(st7305_handle_t dev)
{
    write_params(dev, 0x2A, (uint8_t[]){0x12, 0x2A}, 2); /* CASET 0x12~0x2A */
    write_params(dev, 0x2B, (uint8_t[]){0x00, 0xC7}, 2); /* RASET 0~199 */
    write_register(dev, 0x2C); /* RAMWR */
}

/** Refresh a trama intera: spingere il framebuffer da 15000 byte sullo schermo */
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

/** Entrare in modalità basso consumo LPM (0x39); risparmio energetico, il frame rate è fissato da B2h */
void st7305_low_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x39);
}

/** Entrare in modalità alto consumo HPM (0x38); per contenuti in movimento, 16/32 Hz */
void st7305_high_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x38);
}

/** Display on/off (0x29 / 0x28) */
void st7305_display_on(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x29 : 0x28);
}

/** Inversione on/off (0x21 / 0x20); un pannello normalmente bianco ha bisogno dell'inversione per mostrare il nero */
void st7305_display_inversion(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x21 : 0x20);
}

/** Ottenere il puntatore al framebuffer (uso avanzato: manipolare direttamente i dati bitmap) */
uint8_t *st7305_get_buffer(st7305_handle_t dev)
{
    return dev->buffer;
}

/* ================= Primitive grafiche (portate da ST73XX_UI) ================= */

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

    if (y0 == y2) { /* fondo piatto */
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

    /* riempimento a linee di scansione */
    for (int y = min_y; y <= max_y; y++) {
        int cnt = 0;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            int yi = points[2 * i + 1], yj = points[2 * j + 1];
            int xi = points[2 * i], xj = points[2 * j];
            if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
                xs[cnt++] = xi + (int)((int64_t)(y - yi) * (xj - xi) / (yj - yi));
            }
        }
        /* ordinamento per inserzione */
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

/* ================= Demo: carosello automatico di 15 pagine =================
 * Testo, scala di grigi a dithering ordinato, pattern di test, benchmark di performance, campioni di UI e piccole animazioni.
 * Senza font né risorse esterne. */

#define W ST7305_LCD_WIDTH
#define H ST7305_LCD_HEIGHT
#define BLACK ST7305_COLOR_BLACK
#define WHITE ST7305_COLOR_WHITE
#define ARRAY_LEN(a) ((int)(sizeof(a) / sizeof((a)[0])))

/* Classico font ASCII 5x7, codifica per colonne, LSB in alto. */
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
        /* tabella dei tick in senso orario; evita float e libm. */
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

    /* freccia asimmetrica + marcatori ai quattro angoli rendono ogni orientamento inequivocabile. */
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
    uint16_t target_fps; /* 0 = renderizza una sola volta, 65535 = senza limiti */
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

/* ================= Punti di ingresso Arduino ================= */

static st7305_handle_t lcd;

void setup(void)
{
    Serial.begin(115200);
    lcd = st7305_init(PIN_DC, PIN_RES, PIN_CS, PIN_SCLK, PIN_MOSI, SPI_CLOCK_HZ);

    /* L'animazione ha bisogno di HPM; le pagine statiche conservano la loro immagine anche in LPM. */
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    lcd_demo_run(lcd);
}
```

Non è pseudocodice né un estratto didattico che conserva solo le funzioni chiave — è il programma completo in un solo file con driver di basso livello, primitive grafiche, font incorporato e carosello di 15 pagine. Per la pubblicazione dell'articolo, è consigliabile offrire questo `.ino` come allegato o in un repository di codice compagno, per evitare che i lettori ricucino frammenti sparsi dal corpo dell'articolo.

Metti il file in una cartella con lo stesso nome:

```text
ST7305_RLCD_Demo/
└── ST7305_RLCD_Demo.ino
```

Apri il `.ino` nell'Arduino IDE, seleziona `Arduino Nano ESP32` e la sua porta seriale, poi compila e carica.

### Flusso minimo di avvio: prima inizializza, poi il carosello di 15 pagine

Ecco il punto di ingresso del programma completo. Il vero lavoro lo fanno `st7305_init()` e `lcd_demo_run()` — il primo "sveglia lo schermo", il secondo "fa fare numeri allo schermo".

```cpp
static st7305_handle_t lcd;

void setup(void)
{
    // Passo 1: apri una porta seriale a 115200 per vedere i log
    Serial.begin(115200);

    // Passo 2: inizializza SPI e lo ST7305 con il cablaggio sopra
    lcd = st7305_init(
        PIN_DC, PIN_RES, PIN_CS,
        PIN_SCLK, PIN_MOSI,
        SPI_CLOCK_HZ
    );

    // Passo 3: le pagine animate hanno bisogno di refresh — passa a HPM (modalità alto refresh)
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    // Passo 4: questo fa carosello per sempre — non serve una macchina a stati
    lcd_demo_run(lcd);
}
```

I pin e il clock SPI sono raggruppati in testa al file — cambiali per primi quando cambi scheda:

```cpp
// Qui vanno i numeri GPIO — non copiare i numeri D dalla serigrafia del Nano
#define PIN_SCLK        10          // D7
#define PIN_MOSI         8          // D5 — importante: NON GPIO11
#define PIN_CS           9          // D6
#define PIN_DC           7          // D4
#define PIN_RES          6          // D3
#define SPI_CLOCK_HZ     20000000UL // 20 MHz — prima stabile, poi veloce
```

### Nota di codice 1: perché una trama fa esattamente 15000 byte

Questo schermo ha 300×400 = 120000 pixel; ogni pixel è solo nero o bianco, quindi teoricamente occupa 1 bit:

```text
120000 bit ÷ 8 = 15000 byte
```

Con il formato dati di questo esempio, un byte (8 bit) dello ST7305 corrisponde a 2 righe × 4 colonne di pixel:

```text
Riga 0: BIT7  BIT5  BIT3  BIT1
Riga 1: BIT6  BIT4  BIT2  BIT0
```

Quindi ogni riga non è il solito 300÷8, ma 300÷4 = 75 byte; verticalmente i pixel sono raggruppati in coppie di righe, dando 400÷2 = 200 gruppi:

```cpp
#define ST7305_DATA_WIDTH     75      // 300 ÷ 4
#define ST7305_BUFFER_LENGTH  15000   // 75 × 200
```

Il framebuffer è come disegnare prima su una brutta copia e poi consegnarla allo schermo in un colpo solo. Così il disegno non si ingarbuglia con il timing SPI e il codice resta più facile da mantenere.

### Nota di codice 2: come una coordinata atterra su un bit preciso del framebuffer

Dopo la rotazione, le coordinate logiche vengono rimappate sulle coordinate fisiche 300×400, poi si calcolano la posizione del byte e la posizione del bit:

```cpp
// Passo 1: calcola in quale byte cade questo pixel
int real_x = physical_x / 4;
int real_y = physical_y / 2;
int index = real_y * ST7305_DATA_WIDTH + real_x;

// Passo 2: calcola quale bit occupa in quel byte
int one_two = physical_y % 2;
int line_bit_4 = physical_x % 4;
int bit = 7 - (line_bit_4 * 2 + one_two);

// Passo 3: metti il bit a 1 per il nero, a 0 per il bianco
if (color) dev->buffer[index] |= (1 << bit);
else       dev->buffer[index] &= ~(1 << bit);
```

Questa disposizione interlacciata è il punto dove i principianti sbagliano più spesso i conti. Se la grafica esce storta, spezzettata in codici a barre o sfasata a righe alternate — controlla qui per primo, non correre a "regolare alla cieca" i registri di inizializzazione.

### Nota di codice 3: cosa fanno davvero DC e CS

`DC` è come l'etichetta su un pacco: `LOW` significa "questo è un comando", `HIGH` significa "questi sono dati immagine". `CS` è come l'appello — lo schermo riceve dati solo finché è tirato basso.

```cpp
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);          // DC=LOW: segue un comando
    spi_write_byte(dev, reg);
}

static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);         // DC=HIGH: segue un parametro
    spi_write_byte(dev, data);
}
```

Nell'invio di una trama completa, il programma scrive 15000 byte di fila invece di aprire una transazione SPI per ogni pixel:

```cpp
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);             // Passo 1: delimitare la finestra di scrittura a schermo intero
    dc_data(dev);                        // Passo 2: dire allo schermo che seguono dati
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH); // Passo 3: spedire la trama intera
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}
```

A 20 MHz, il tempo teorico di trasferimento SPI puro di 15000 byte è di circa 6 ms; in pratica si sommano comandi, disegno e scheduling del programma. La pagina 7 mostra il costo reale misurato — non si spacciano valori teorici per FPS misurati.

### Nota di codice 4: HPM, LPM e le immagini statiche non sono la stessa cosa

Alla fine dell'inizializzazione, il pannello entra in LPM; questa demo passa a HPM in `setup()` affinché le pagine animate abbiano condizioni di refresh del pannello più adatte.

```cpp
st7305_high_power_mode(lcd);  // invia 0x38 per entrare in HPM
```

Con `B2h=0x05`, in questo esempio HPM è configurato a 16 Hz e LPM a 8 Hz. Il `target_fps` del programma controlla solo quanto velocemente disegna l'host — non può ordinare alla risposta fisica del cristallo liquido di superare i limiti del pannello.

Una pagina statica con `target_fps=0` significa: disegna una volta e conserva l'immagine, senza rinvii. Ma tutto il carosello resta in HPM — non torna automaticamente in LPM a ogni pagina statica. Per un vero prodotto a basso consumo, conviene aggiungere anche commutazione di modalità e refresh parziale seguendo il timing del datasheet.

### Nota di codice 5: come le 15 demo fanno il carosello automatico

Tutte le pagine vivono nell'array `pages[]`; ogni voce contiene nome, funzione di disegno, durata e FPS obiettivo:

```cpp
static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    // le altre 12 pagine seguono lo stesso schema: funzione, durata, FPS obiettivo
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};
```

Vuoi un altro ordine? Scambia le voci dell'array. Vuoi qualche secondo in più di campo stellato? Cambia `duration_ms`. Vuoi una pagina tua? Scrivi una funzione di disegno con la stessa firma e registrala nell'array. Non serve sparpagliare la pianificazione del carosello dappertutto.

### Nota di codice 6: perché la rotazione in quattro versi non si affida a indovinelli MADCTL

Il programma imposta l'orientamento 0~3 tramite `st7305_set_rotation(lcd, rotation)` e mappa le coordinate nella scrittura nel framebuffer:

| `rotation` | Orientamento   | Risoluzione logica |
| ---------: | -------------- | ------------------ |
|          0 | 0°             | 300×400            |
|          1 | 90° orario     | 400×300            |
|          2 | 180°           | 300×400            |
|          3 | 270° orario    | 400×300            |

Impostare l'orientamento influisce solo sul disegno successivo — non cancella né aggiorna lo schermo automaticamente. Dopo il cambio, devi cancellare il framebuffer e ridisegnare l'immagine completa; all'inizio di ogni pagina del carosello, il programma resetta anche l'orientamento a 0, affinché la pagina precedente non "inclini" la successiva.

## Risoluzione dei problemi: lo ST7305 non mostra nulla, mostra spazzatura o sfarfalla

Niente panico — l'80% dei problemi di "lo schermo non si accende" viene da questi pochi punti; solo il restante 20% fa portare la colpa ai registri di inizializzazione.

### 1. Il seriale dice che l'inizializzazione è riuscita, ma lo schermo resta tutto bianco

L'SPI in sola scrittura non ha rilettura MISO — l'host dirà "trasferimento completato" anche se ha mandato i dati nel nulla. Prima controlla se `D5 → GPIO8` è cablato correttamente, poi misura se VCI è 3.3V, se le masse sono condivise e se l'FPC è bloccato. Togliere completamente alimentazione per qualche secondo e ridarla è più radicale che premere solo RESET.

### 2. Lo schermo mostra contenuto, ma si corrompe casualmente o a volte si blocca

Abbassa temporaneamente `SPI_CLOCK_HZ` da 20 MHz a 5 MHz, accorcia i cavi dupont e risistema i connettori. Se si riprende a velocità minore, sistema prima lunghezza cavi, contatti e integrità del segnale — non partire cambiando le tensioni Gate/Source.

### 3. La grafica esce sfasata, a strisce, o il testo sembra sminuzzato

Controlla `DTFORM=0x11`, la finestra indirizzi di colonna e il mapping dei bit di pixel di 2 righe × 4 colonne. Conferma anche che le coordinate logiche non escano dai limiti: 0°/180° è 300×400, 90°/270° è 400×300.

### 4. Quasi invisibile al buio

È uno schermo totalmente riflettivo senza retroilluminazione — non ha improvvisamente imparato l'invisibilità. Aggiungi illuminazione ambientale, e non trattare BLC come una linea di retroilluminazione obbligatoria: in questo esempio BLC può restare in aria.

### 5. L'animazione lascia scie o i pattern fini sfarfallano

Le scacchiere fitte, l'alternanza di fasi e l'inversione rapida a trama intera sono stress test per progettazione — non tutte le UI saranno così. Abbassa il `target_fps` delle pagine animate, riduci l'inversione ad alta frequenza su grandi aree e conferma di essere in HPM; se il ghosting è marcato, non continuare ad accelerare contro la fisica del pannello.

### 6. Dopo il passaggio al cinese escono solo punti interrogativi o quadratini

Il font incorporato ha solo 96 caratteri ASCII 5×7 — niente cinese. Servirebbe importare un font cinese ritagliato e disegnare via `st7305_write_point()`; non infilarci direttamente una libreria di font grande completa, o il firmware avrà più "peso" della UI.

### 7. Vuoi confermare che l'hardware è vivo senza guardare prima pagine complesse

Fai prima un test alternato tutto-nero / tutto-bianco, aggirando temporaneamente la logica di testo, coordinate e animazione:

```cpp
// Passo 1: riempire la trama di 1 — test tutto-nero
st7305_fill(lcd, 0xFF);
st7305_display(lcd);
delay(2000);

// Passo 2: cancellare la trama a 0 — test tutto-bianco
st7305_fill(lcd, 0x00);
st7305_display(lcd);
delay(2000);
```

Se tutto-nero e tutto-bianco funzionano, ripristina il carosello di 15 pagine. Diagnosticare è come andare dal dottore: prima gli esami semplici, non andare dritto alla grande operazione.

## FAQ: domande frequenti su ESP32-S3 e ST7305

**D: Si possono spostare i pin SPI dello ST7305 su altri GPIO?**
R: Sì. L'ESP32-S3 può rimappare l'SPI attraverso la GPIO Matrix — cambia `PIN_SCLK`, `PIN_MOSI`, `PIN_CS`, `PIN_DC`, `PIN_RES` e ricabla di conseguenza. Evita i pin già usati dalla scheda, i pin di boot e quelli legati all'USB; dopo un cambio di scheda, consulta sempre il pinout ufficiale di quella scheda — non copiare alla cieca solo perché "tutto è ESP32-S3".

**D: Perché lo schermo ST7305 deve avere 3.3V? Può prendere 5V?**
R: In questo esempio il VCI del modulo usa 3.3V, e i GPIO dell'ESP32-S3 sono anch'essi logica a 3.3V — non mettere 5V direttamente su VCI né su alcun pin di segnale. L'alimentazione deve anche condividere la massa; con solo 3.3V collegato e GND dimenticato, i segnali non hanno riferimento comune.

**D: Qual è la frequenza di refresh reale dello ST7305 — scrivere 20 FPS nel codice significa 20 Hz?**
R: No. In questo esempio l'HPM del pannello è configurato a 16 Hz; `target_fps=20` è solo il ritmo obiettivo dell'host per generare e inviare al massimo 20 trame al secondo. A 20 MHz di SPI, inviare 15000 byte richiede circa 6 ms in teoria; l'FPS reale è la misurazione "disegno + SPI" della pagina 7, e la risposta ottica è ulteriormente limitata dalla modalità del pannello.

**D: Quanta memoria dell'ESP32-S3 occupa il framebuffer da 15000 byte?**
R: Il framebuffer fisso è 15000 byte, circa 14,65 KiB, più la tabella dei font, lo stato delle pagine e le variabili temporanee di disegno. La demo usa un'istanza globale statica, quindi niente allocazione dinamica dell'intero buffer a ogni trama.

**D: Altre schede ESP32-S3 possono usare direttamente questo codice Arduino dello ST7305?**
R: La logica del driver è riutilizzabile, ma selezione scheda e mapping GPIO vanno cambiati. Con una scheda diversa dal Nano ESP32, selezionala nell'Arduino IDE e cambia i 5 GPIO di controllo per corrispondere al tuo cablaggio reale; l'alimentazione resta 3.3V come richiede il modulo.

**D: Lo schermo ST7305 non mostra proprio nulla — quale parametro cambio per primo?**
R: Per prima cosa non toccare i registri di tensione. Segui l'ordine "alimentazione 3.3V → massa comune → FPC/cavi dupont → D5=GPIO8 → abbassare SPI a 5 MHz → test tutto-nero/tutto-bianco". Solo dopo aver verificato la catena hardware guarda la sequenza di inizializzazione e il framebuffer.

**D: Perché questo schermo monocromatico a 1 bit può mostrare 17 livelli di grigio?**
R: Non ha veri pixel a scala di grigi — usa un dithering ordinato Bayer 4×4 per controllare la densità dei punti neri e bianchi, così che l'occhio umano percepisca 17 livelli di luminosità (0–16) a distanza. Da vicino, restano solo punti neri e bianchi — "turni di lavoro" per creare senso di profondità.

**D: La demo dello ST7305 può mostrare direttamente caratteri cinesi?**
R: Non direttamente. Il font incorporato copre ASCII 32–126; i caratteri cinesi vengono sostituiti da `?`. Servirebbero glifi cinesi ritagliati e una funzione di disegno, oppure ponticellare l'interfaccia di disegno esistente a una libreria di font.

**D: Bisogna usare uno schermo totalmente riflettivo in una stanza buia?**
R: Ha bisogno di luce ambientale — più buio non è meglio. L'illuminazione interna normale o gli ambienti luminosi lo rendono più leggibile; al buio aggiungi illuminazione esterna, perché questo esempio non ha retroilluminazione e BLC non è collegato.

## Per andare oltre: cos'altro puoi fare dopo aver acceso lo ST7305

- Collega un sensore di temperatura/umidità e sostituisci i dati demo della pagina 6 con dati ambientali reali.
- Aggiungi pulsanti o un encoder rotativo per passare manualmente tra le 15 pagine e regolare la durata.
- Implementa il refresh parziale: usa CASET/RASET per definire una finestra, combinato con `WRMEMC 0x3C`, per ridurre i trasferimenti di trama completa.
- Cabla il sincronismo trama TE, scrivi le trame dopo il V-Blank e approfondisci il controllo del tearing sui contenuti in movimento.
- Aggiungi un font cinese ritagliato per fare un cartello meteo, un calendario o un orologio a bassa frequenza di refresh.
- Torna in LPM sulle pagine statiche seguendo il timing del datasheet, e misura davvero il consumo totale — non accontentarti delle parole "basso consumo".

## Riferimenti

- [Datasheet dello ST7305 (Sitronix)](https://www.sitronix.com.tw/): le definizioni dei registri, il timing HPM/LPM e il flusso di inizializzazione seguono il datasheet ufficiale
- [Libreria U8g2](https://github.com/olikraus/u8g2): include il costruttore `U8G2_ST7305_300X400_1_4W_HW_SPI` dalla v2.36
- [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library): wrapper driver Arduino di terze parti per lo ST7305
- [Documentazione ufficiale dell'Arduino Nano ESP32](https://docs.arduino.cc/hardware/nano-esp32/): corrispondenza tra serigrafia della scheda e GPIO

Se hai acceso anche il tuo, inizia a controllare dalla griglia di pixel della pagina 4 e dal test di frame rate della pagina 7, poi aggiungi la tua UI in `pages[]`. Uno schermo con solo bianco e nero può comunque tenere allegramente occupati un cruscotto, animazioni e un desktop retrò.
