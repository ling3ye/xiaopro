---
title: "Accendere il display RGB ST7262 con ESP32-S3 + cruscotto LVGL: tutorial completo (Waveshare Touch-LCD-5B / 1024×600)"
boardId: esp32s3
moduleId: display/tft50-st7262
category: esp32
date: 2026-08-03
intro: "Con ESP-IDF, accendi da zero il display RGB sulla Waveshare ESP32-S3-Touch-LCD-5B (5 pollici 1024×600, ST7262 RGB direct drive), colleghi LVGL e ci realizzi un cruscotto di telemetria veicolo animato. Spiega il controllo della retroilluminazione via CH422G, la taratura di PCLK, il doppio framebuffer in PSRAM e le animazioni con easing, completo di codice ESP-IDF e checklist anti-trappole."
image: "https://img.lingflux.com/2026/08/b7d201de3550e7561294441b57a205de.jpg"
---

Difficoltà: ⭐⭐⭐☆☆ (basta sapere un po' di C e aver toccato ESP-IDF)
Tempo stimato: 2-3 ore (ambiente di sviluppo incluso)
Ambiente di test: ESP-IDF 5.3.x (oppure 5.2.7 aggiungendo una riga di macro) + LVGL ^9.3 + espressif/esp_lvgl_port 2.8

---

> **In una frase**: con ESP-IDF accendi da zero il display RGB sulla Waveshare ESP32-S3-Touch-LCD-5B (5 pollici 1024×600, ST7262 pure RGB direct drive), passando dallo schermo nero fino a collegare LVGL e realizzare un cruscotto di telemetria veicolo animato. Tutte le trappole in cui sono caduto (la truffa della risoluzione, white screen da PCLK, white screen di memoria LVGL, tearing e scattosità) e il codice per riempirle sono qui.

---

> **TL;DR (avvio rapido):**
> 1. **Conosci la base**: 5B è **1024×600**, driver IC **ST7262**, pure RGB direct drive — non credere agli 800×480 di default negli esempi ufficiali.
> 2. **PCLK a 16MHz**: non copiare i 21MHz definiti dalla scheda, con il framebuffer in PSRAM la banda non basta e va tutto bianco.
> 3. **Retroilluminazione via CH422G**: non è un GPIO normale e non è PWM, scrivi un byte all'indirizzo I²C `0x38` per accendere/spegnere.
> 4. **Per far girare LVGL servono due macro**: `LV_USE_CLIB_MALLOC=y` + `SPIRAM_USE_MALLOC=y`, altrimenti white screen + reboot del watchdog.
> 5. `idf.py build flash monitor`, accendi, stappa lo champagne.

---

## Premessa

Questo weekend ero fuori casa, un amico aveva comprato una **ESP32-S3-Touch-LCD-5B** di Waveshare: il firmware ufficiale le si flashava sopra e il display funzionava, ma non riusciva ad accenderla da codice, mentre con gli esempi ufficiali era tutta nera o bianca, proprio non ci capiva niente. Così l'ho presa in mano e ho iniziato a sbattermici. È una scheda di sviluppo con display touch capacitivo RGB da 5 pollici, 1024×600. Non costa tanto, ma il setup è parecchio ricco — CAN, RS485, RTC, caricabatterie Li-ion, e di serie 16MB Flash + 8MB PSRAM.

Quindi l'ho presa per provare ad accenderla, visto che ultimamente mi piace un sacco accendere display. Ma il processo per accenderla aveva più trappole del previsto. La cosa più demotivante è questa: **se segui la documentazione e gli esempi ufficiali Waveshare, non si accende.** Non è che sei tu a essere scarso, è che le risorse ufficiali non sono pensate per questa 5B.

Ho diviso il processo in tre esempi progressivi, il codice è su GitHub ([cartella completa del progetto](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B), i tre esempi sono tutti lì):

1. **Accendere il display**: nel modo più semplice, mostra una riga Hello World → [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
2. **Collegare LVGL**: realizza un tachimetro semicircolare con animazione della lancetta → [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
3. **Trasformarlo in cruscotto**: diventa un pannello di telemetria veicolo con un certo design → [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

**Obiettivo di questo articolo**: consegnarti le trappoli capitate in questi tre passi, il motivo del codice per riempirle, e una checklist anti-trappole pronta da copiare, così ti risparmi qualche nottata in bianco.

---

## Risultato dell'esperimento

Alla fine ottieni un **cruscotto di telemetria veicolo animato**: cinque schede dati — giri motore, acceleratore, temperatura acqua, velocità, tensione — con numeri che si avvicinano al valore con easing, barre di avanzamento che diventano rosse in sovraccarico e lancette animate fluidamente senza tearing.

![](https://img.lingflux.com/2026/08/032db1082c643b3c0cc44b993101ead1.jpg)

---

## 1. Descrizione della scheda: prima conosci bene questa 5B

Prima di cadere nelle trappole, mettiamo sul tavolo le specifiche hardware della ESP32-S3-Touch-LCD-5B. Le trappole successive — quanto PCLK impostare, se la memoria basta, quali pin condividono lo stesso bus I²C — dipendono praticamente tutte da questa tabella, consultarla renderà tutto molto più scorrevole.

### Display (la prima cosa da riconoscere è questa)

| Voce | Specifica |
| --- | --- |
| Dimensione | 5 pollici |
| Tipo pannello | IPS |
| Risoluzione | **1024 × 600** (verificato, la documentazione ufficiale non distingue la 5B ma il default è 800×480 — questa è la grande trappola del capitolo 1) |
| Colori visualizzabili | 65K colori |
| Interfaccia | RGB (parallelo), driver IC **ST7262**, pure RGB direct drive, **non serve inviare comandi di init via SPI** |
| Angolo di visuale | 175° |
| Luminosità | 550 cd/m² |
| Touch | Touch capacitivo (pannello glass incluso) |
| IC boost retroilluminazione | AP3032KTR-G1 |

> **ST7262** è un driver IC per pannelli LCD con interfaccia RGB (prodotto da Sitronix), riceve il segnale RGB parallelo e pilota i cristalli liquidi; in questo progetto **non devi inviargli alcun comando di inizializzazione** — gli dai alimentazione, i tempi giusti e i dati, e si accende da solo. Questo ti risparmia un sacco di grattacapi.

### Chip principale (MCU)

| Voce | Specifica |
| --- | --- |
| Modulo | ESP32-S3-WROOM-1-**N16R8** |
| Core | Xtensa 32-bit LX7 dual core, fino a 240 MHz |
| Flash | **16 MB** |
| PSRAM | **8 MB** (octal SPI) |
| SRAM interna | 512 KB |
| Wireless | Wi-Fi 2.4 GHz (802.11 b/g/n), Bluetooth 5 (LE), antenna onboard |
| USB | USB Full-Speed, Type-C onboard |

> La **PSRAM** è un blocco di memoria esterna al chip, "grande ma lento". L'intera immagine dello schermo (framebuffer) sta in questi 8MB, e la DMA la spara continuamente verso il display. **Quegli 8MB di PSRAM sono il posto dove vive l'intero framebuffer.** Configurare la PSRAM come quad è una trappola comune (vedi capitolo 7).

### Touch

| Voce | Specifica |
| --- | --- |
| IC touch | **GT911** |
| Tipo | Capacitivo |
| Punti supportati | Touch a 5 punti |
| Interfaccia | I²C |
| Indirizzo I²C | **0x5D** |

> **GT911** è un controller touch capacitivo, converte la posizione del dito in coordinate digitali e li comunica via I²C. In questo progetto condivide lo stesso bus I²C con RTC e CH422G (GPIO8/GPIO9), quindi gli indirizzi vanno pianificati. **Questa serie di esempi non gestisce ancora il touch**, è un todo successivo.

### Alimentazione e interfacce

| Voce | Specifica |
| --- | --- |
| Alimentazione | Type-C 5V / DC 7–36V / singola cella Li-ion 3.7V (MX1.25) |
| Consumo | 5V / 450 mA (tipico) |
| CAN | Compatibile CAN 2.0 (TJA1051, resistenza di terminazione 120Ω disattivata di default) |
| RS485 | Transceiver SP3485 (resistenza di terminazione 120Ω disattivata di default) |
| Temperatura di funzionamento | 0 °C ~ 65 °C |
| Dimensioni | Scheda nuda 112.4 × 75.1 mm / con custodia 116.3 × 79 mm |

---

## 2. Mappatura delle risorse onboard (già sulla scheda, senza fili)

> ⚠️ **Questa è una scheda di sviluppo, i componenti sono già saldati, le tabelle seguenti sono la mappatura delle risorse onboard, per controllare i pin / configurare l'SDK, non per attaccare jumper.** Devi solo: collegare l'alimentazione via Type-C e collegare la USB al PC per flashare il firmware.

### Pin dell'interfaccia RGB del display

> La tabella segue la documentazione ufficiale ed è stata verificata su hardware reale. Nota: GPIO0 è un pin strapping (vedi la checklist anti-trappole del capitolo 7).

| ESP32-S3 GPIO | Segnale LCD | Descrizione |
| --- | --- | --- |
| GPIO0  | G3    | Green dato bit3 |
| GPIO1  | R3    | Red dato bit3 |
| GPIO2  | R4    | Red dato bit4 |
| GPIO3  | VSYNC | Sincronismo verticale |
| GPIO4  | TP_IRQ | Interrupt touch |
| GPIO5  | DE    | Data enable |
| GPIO7  | PCLK  | Pixel clock (16MHz verificato stabile) |
| GPIO10 | B7    | Blue dato bit7 |
| GPIO14 | B3    | Blue dato bit3 |
| GPIO17 | B6    | Blue dato bit6 |
| GPIO18 | B5    | Blue dato bit5 |
| GPIO21 | G7    | Green dato bit7 |
| GPIO38 | B4    | Blue dato bit4 |
| GPIO39 | G2    | Green dato bit2 |
| GPIO40 | R7    | Red dato bit7 |
| GPIO41 | R6    | Red dato bit6 |
| GPIO42 | R5    | Red dato bit5 |
| GPIO45 | G4    | Green dato bit4 |
| GPIO46 | HSYNC | Sincronismo orizzontale |
| GPIO47 | G6    | Green dato bit6 |
| GPIO48 | G5    | Green dato bit5 |

### Touch / RTC / I²C esterno (bus condiviso)

| ESP32-S3 GPIO | Segnale | Descrizione |
| --- | --- | --- |
| GPIO8 | SDA / TP_SDA / RTC_SDA | Dati I²C (condiviso da touch GT911, RTC PCF85063, I²C esterno) |
| GPIO9 | SCL / TP_SCL / RTC_SCL | Clock I²C (condiviso come sopra) |
| GPIO4 | TP_IRQ | Interrupt touch |

### USB / SD / RS485 / CAN

| Funzione | ESP32-S3 GPIO | Descrizione |
| --- | --- | --- |
| USB D- / D+ | GPIO19 / GPIO20 | USB full-speed |
| SD MOSI / SCK / MISO | GPIO11 / GPIO12 / GPIO13 | Scheda SD (SPI) |
| SD CS | (CH422G EXIO4) | Attivo low, controllato dall'IO expander, non è il CS SPI nativo |
| RS485 RXD / TXD | GPIO43 / GPIO44 | SP3485 |
| CAN TX / RX | GPIO15 / GPIO16 | TJA1051 |

### Un chip che non puoi evitare: l'IO expander CH422G

Sulla scheda, retroilluminazione e reset sono tutti collegati a questo chip, il **CH422G**, che si pilota via I²C. La sua stranezza è: **non ha un puntatore di registro, usa direttamente l'indirizzo I²C come comando**.

> **CH422G** è un IO expander con interfaccia I²C che raccoglie i segnali sparsi di retroilluminazione, reset display, reset touch e chip select della SD; in questo progetto lo usi per accendere la retroilluminazione e resettare il display.

| Pin CH422G | Funzione | Descrizione |
| --- | --- | --- |
| EXIO0 | DI0  | Ingresso digitale 0 |
| EXIO1 | TP_RST | Reset touch |
| EXIO2 | DISP | Enable retroilluminazione (solo on/off, **non regolabile in luminosità**) |
| EXIO3 | LCD_RST | Reset display |
| EXIO4 | SD_CS | Chip select SD (attivo low) |
| EXIO5 | DI1  | Ingresso digitale 1 |
| OD0   | DO0  | Uscita digitale 0 |
| OD1   | DO1  | Uscita digitale 1 |

---

## 3. Cosa installare: toolchain ESP-IDF + componenti

Questa scheda **non richiede librerie**, ma usa **ESP-IDF** (il framework ufficiale Espressif) invece di Arduino. Motivo: con la combinazione RGB direct drive + framebuffer in PSRAM + LVGL, le decine di interruttori in sdkconfig (PCLK, modalità PSRAM, memory pool) si controllano molto meglio in ESP-IDF, mentre in Arduino tararli è parecchio scomodo.

**Checklist (segui la verifica, ti risparmia l'80% del tempo di debug):**

- [ ] **ESP-IDF 5.3.x** (consigliato). Con la 5.2.7 funziona, ma serve aggiungere una macro (vedi capitolo 7).
- [ ] **LVGL ^9.3** (`esp_lvgl_port` 2.8 dipende dalle costanti di colore aggiunte in 9.3).
- [ ] **espressif/esp_lvgl_port 2.8** (gestisce per te il clock di LVGL, il task dedicato e i lock).
- [ ] **Utenti Windows**: usate PowerShell + profilo EIM, **non eseguite `idf.py` in Git Bash** (rileva `MSYSTEM` e si rifiuta di funzionare).

Le versioni dei componenti vanno appaiate per generazione: `esp_lvgl_port` 2.8 con LVGL `^9.3`; se le spannì, la compilazione ti sputa `RGB565_SWAPPED undeclared`.

---

## 4. Primo passo: accendere il display (non copiare l'esempio ufficiale)

> 📦 **Codice completo di questo capitolo**: [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld) — nel modo più semplice, accende il display e mostra una riga Hello World.

Questa è la trappola più grossa di tutta la faccenda, e la prima che voglio raccontare.

**Gli esempi ESP-IDF ufficiali Waveshare (es. `08_lvgl_Porting`) e la documentazione sono scritti praticamente tutti per 800×480.** Il ramo `#else` di default è proprio 800×480. La documentazione ufficiale si limita a etichettare tutta la serie da 5 pollici come "800×480 o 1024×600", e **non distingue quale sia la 5B**.

Se prendi l'esempio ufficiale e lo flashi sulla 5B senza pensarci, ottieni un'immagine parecchio confusa: **schermo quasi tutto nero con una striscia bianca sul lato destro** (nero + bianco). Non è rotta, è "mandare un segnale 800×480 a un pannello 1024×600" — il pannello è più largo del segnale, quindi la parte aggiuntiva a destra non ha segnale e si mostra così.

In più, nella convenzione di naming Waveshare **il suffisso "B" indica spesso uno schermo quadrato** (es. la 4B è 480×480 quadrato), così ho sospettato che la 5B fosse uno schermo quadrato 720×720 con init via SPI. Dopo aver sbattuto un po' in giro ho confermato: **la 5B è proprio 1024×600, driver IC ST7262, pure RGB direct drive, non serve alcun comando di init via SPI.** Questo è importante, risparmia un sacco di grattacapi.

Quindi il primo passo è sempre: **non credere alla risoluzione dell'esempio ufficiale, verifica tu stesso quanto è quella che hai in mano.**

Un modo rozzo per verificarlo è proprio quello sopra — mandare segnale 800×480 e vedere la striscia bianca a destra, per deduzione inversa confermi che è 1024×600 (solo se il pannello è più largo del segnale si comporta così).

### 4.1 Sequenza di avvio (lo scheletro in 6 step)

Una volta capita la bestia, si accende. La sequenza di avvio si riduce a 6 step: **tirare su il bus I²C → resettare il display via CH422G → creare il pannello RGB → disegnare l'immagine → accendere la retroilluminazione → CPU libera, la DMA si rinfresca da sola**.

Tra questi, "disegnare l'immagine e solo alla fine accendere la retroilluminazione" è fondamentale — evita il frame corroto all'accensione. Nel codice, l'ordine di accensione è fisso:

```c
/* Primo step: tira su il bus I²C (GPIO8/9, condiviso con il touch GT911 e l'RTC).*/
i2c_master_bus_handle_t i2c_bus = NULL;
i2c_master_bus_config_t bus_cfg = {
    .sda_io_num = 8, .scl_io_num = 9, .clk_source = I2C_CLK_SRC_DEFAULT,
    .flags.enable_internal_pullup = true,
};
i2c_new_master_bus(&bus_cfg, &i2c_bus);

/* Secondo step: pilota il CH422G — prima reset, poi rilascio (in questo step la retro è ancora spenta).*/
ch422g_handle_t io = {0};
ch422g_init(&io, i2c_bus);
ch422g_set_outputs(&io, 0);                              /* EXIO tutti a low: reset + retro spenta */
vTaskDelay(pdMS_TO_TICKS(10));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST); /* rilascia reset, retro ancora spenta */
vTaskDelay(pdMS_TO_TICKS(120));                          /* aspetta che il pannello parta */

/* Terzo step: crea il pannello RGB, disegna l'immagine nel framebuffer PSRAM (vedi paragrafo successivo)... */

/* Quarto step: immagine pronta, solo alla fine accendi la retro — scrivi alto EXIO2. */
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

> **Regola d'oro dell'ordine: la retroilluminazione si accende sempre per ultima.** Durante il reset tutti gli EXIO sono a low (retro spenta), dopo il rilascio del reset disegni l'immagine e solo quando è pronta scrivi alto EXIO2. Al contrario, accendere prima la retro e poi disegnare fa vedere un frame corroto all'avvio.

### 4.2 Come fa la retroilluminazione ad "accendersi scrivendo alto": il driver minimo del CH422G

Il "scrivi alto e si accende" della retro, nel codice si riduce a due cose: scrivere un driver per il CH422G e chiamarlo nella sequenza di avvio nell'ordine giusto. Il cuore del driver è un solo punto — **l'indirizzo è il registro**: scrivi la modalità su `0x24` e un byte su `0x38` (quel byte è il livello delle 8 uscite). Il driver minimo è così (versione completa nel repo, `main/ch422g.c`):

```c
/* CH422G "registro" = l'indirizzo I²C a 7-bit del device stesso (non c'è un byte di registro separato).*/
#define CH422G_REG_MODE  0x24   /* scrivi 0x01 -> EXIO0..7 in uscita push-pull */
#define CH422G_REG_OUT   0x38   /* scrivi un byte -> livello di EXIO0..7 */

/* Bit di uscita EXIO: bit n = livello di EXIO_n (1 = alto).*/
#define CH422G_TP_RST   (1u << 1)   /* EXIO1 reset touch */
#define CH422G_BL       (1u << 2)   /* EXIO2 enable retroilluminazione */
#define CH422G_LCD_RST  (1u << 3)   /* EXIO3 reset display */

/* Per ognuno dei due "l'indirizzo è il registro" crea un handle dispositivo I²C.*/
esp_err_t ch422g_init(ch422g_handle_t *ch, i2c_master_bus_handle_t bus) {
    i2c_device_config_t mode_cfg = { .device_address = CH422G_REG_MODE, .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &mode_cfg, &ch->dev_mode);
    i2c_device_config_t out_cfg  = { .device_address = CH422G_REG_OUT,  .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &out_cfg,  &ch->dev_out);

    uint8_t mode = 0x01;                              /* modalità uscita push-pull */
    i2c_master_transmit(ch->dev_mode, &mode, 1, -1);
    uint8_t zero = 0;
    i2c_master_transmit(ch->dev_out,  &zero, 1, -1);  /* all'avvio tutto a zero */
    return ESP_OK;
}

/* Un byte è il livello delle 8 uscite — questo è "usare l'indirizzo come comando".*/
esp_err_t ch422g_set_outputs(ch422g_handle_t *ch, uint8_t exio_mask) {
    return i2c_master_transmit(ch->dev_out, &exio_mask, 1, -1);
}
```

### 4.3 Creare il pannello RGB (il cuore di questo capitolo)

La creazione del pannello è il cuore dell'intero capitolo, le tre trappole successive spiegano riga per riga perché si compilano così:

```c
#define LCD_H_RES        1024
#define LCD_V_RES        600
#define LCD_PIXEL_CLK_HZ (16 * 1000 * 1000)   /* ← trappola 1: 16MHz, non i 21MHz definiti dalla scheda */

/* In RGB565 il verde è a 6 bit (0..63), rosso e blu a 5 bit (0..31), per il bianco puro serve 31,63,31 (← trappola 2).*/
#define RGB565(r, g, b)   ((((r) & 0x1F) << 11) | (((g) & 0x3F) << 5) | ((b) & 0x1F))
#define COLOR_BG          RGB565(2, 8, 20)     /* sfondo blu scuro */
#define COLOR_FG          RGB565(31, 63, 31)   /* bianco vero */

esp_lcd_rgb_panel_config_t panel_cfg = {
    .data_width = 16,                          /* RGB565 = 16 bit */
    .bounce_buffer_size_px = 10 * LCD_H_RES,   /* bounce in SRAM: evita il white screen a 16MHz per banda insufficiente */
    .disp_gpio_num = -1,                       /* la retro è sul CH422G, non è un GPIO */
    .pclk_gpio_num  = 7, .vsync_gpio_num = 3, .hsync_gpio_num = 46, .de_gpio_num = 5,
    .data_gpio_nums = {
        14, 38, 18, 17, 10,        /* B3..B7 */
        39,  0, 45, 48, 47, 21,    /* G2..G7 */
         1,  2, 42, 41, 40,        /* R3..R7 */
    },
    .timings = {
        .pclk_hz = LCD_PIXEL_CLK_HZ,           /* ← trappola 1 */
        .h_res = LCD_H_RES, .v_res = LCD_V_RES,
        .hsync_pulse_width = 30, .hsync_back_porch = 40, .hsync_front_porch = 220,
        .vsync_pulse_width = 4,  .vsync_back_porch  = 8,  .vsync_front_porch = 4,
        .flags.pclk_active_neg = true,
    },
    .flags.fb_in_psram = true,                 /* framebuffer dell'intero schermo ~1.17MB in PSRAM */
};
esp_lcd_new_rgb_panel(&panel_cfg, &panel);
esp_lcd_panel_init(panel);                     /* ← trappola 3: dopo aver creato il pannello, aggiungi questa riga */
```

Una volta creato il pannello, puoi scrivere i pixel direttamente sul framebuffer — il pannello RGB di ESP-IDF non offre primitive di disegno oltre a `draw_bitmap`, quindi l'esempio helloworld porta con sé due piccoli strumenti, `lcd_fill` / `lcd_draw_text` (font bitmap, vedi `lcd_draw.c` nel repo):

```c
/* Ottieni il framebuffer in PSRAM e disegna Hello World.*/
void *fb = NULL;
esp_lcd_rgb_panel_get_frame_buffer(panel, 1, &fb);
lcd_draw_init((uint16_t *)fb, LCD_H_RES, LCD_V_RES);
lcd_fill(COLOR_BG);
lcd_draw_text((LCD_H_RES - tw) / 2, (LCD_V_RES - th) / 2, "Hello World!", 5, COLOR_FG);

/* Immagine pronta, alla fine accendi la retro. Da qui la DMA rinfresca il display dalla PSRAM da sola, la CPU riposa.*/
vTaskDelay(pdMS_TO_TICKS(60));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

### 4.4 Le tre trappole in cui sono davvero caduto

**Trappola 1: PCLK copiato troppo alto, schermo tutto bianco.** Copiando la definizione della scheda Arduino ufficiale, il pixel clock (PCLK) era 21MHz, e il display risultava **tutto bianco** (non nero). La verità: l'immagine è in PSRAM e la DMA deve leggerla in continuazione e spedirla allo schermo. 21MHz × 16 bit ≈ 336 Mbit/s di banda, per il percorso "PSRAM → DMA → schermo" è **troppo**, appena la banda non regge lo schermo non riceve un sincronismo valido e mostra un "nessun segnale" bianco. **Scendi a 16MHz, va in stabilità.**

**Trappola 2: il bianco diventa rosa, per poco riposizionavo i pin.** Dopo l'accensione, il testo bianco si vedeva rosa; la prima reazione è stata che i pin del verde fossero invertiti — sbagliato. La vera causa è che **in RGB565 il verde è a 6 bit (0–63), mentre rosso e blu sono a 5 bit (0–31)**. In `RGB565(31, 31, 31)` il 31 del verde, sulla scala 0–63, è meno della metà; rosso e blu al massimo, il verde a metà, il mix viene rosa. Cambiando in `RGB565(31, 63, 31)` si ottiene il vero bianco. Le deviazioni di colore sono di due tipi: **il bianco tende al ciano = problema di ordine dei pin**; **il bianco tende al rosa = valore RGB565 errato**.

**Trappola 3: dimenticata una riga di init.** Il flusso canonico è "crea pannello → reset → init → abilita display"; io all'inizio avevo chiamato solo il passo di creazione. Nella maggior parte dei casi, dopo la creazione, parte automaticamente la scansione, ma aggiungere una riga `esp_lcd_panel_init()` esclude il rischio che "la DMA non sia partita" — senza di essa a volte si accende e a volte no.

### 4.4 Una dritta che vale oro: guarda prima "come non si accende"

Davanti a un "non si accende", la mossa più utile è **guardare prima in che modo esatto non si accende**:

- **Nessuna retroilluminazione** → roba del CH422G / sequenza di reset
- **Retro accesa ma tutta bianca/grigia** → segnale RGB non corretto (la più comune, controlla PCLK e i timing)
- **Retro accesa ma schermo corroto/tremolante** → il segnale c'è, i parametri di timing sono un po' fuori
- **Retro accesa ma colore errato (bianco tende al ciano)** → l'ordine dei canali RGB è invertito

Una sola osservazione così spaccia il problema in due e ti risparmia un sacco di congetture a caso.

---

## 5. Secondo passo: collegare LVGL e fare l'animazione della lancetta

> 📦 **Codice completo di questo capitolo**: [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer) — collega LVGL e realizza un tachimetro semicircolare con animazione della lancetta.

Dopo averlo acceso, volevo fare un'interfaccia in movimento e sono andato su **LVGL** (una libreria grafica molto popolare nell'embedded). L'integrazione usa il componente ufficiale `espressif/esp_lvgl_port`, che si occupa per te di clock di LVGL, task dedicato e lock, e spara sul display l'immagine disegnata.

> **LVGL** è una libreria grafica embedded open source che si occupa di disegnare gli elementi UI come pulsanti, barre di avanzamento e animazioni; in questo progetto la usi per fare il tachimetro e il cruscotto, invece di scrivere il codice di disegno riga per riga.

L'integrazione in sé non è lunga, il cuore è creare il pannello RGB (nell'esempio speedometer c'è una riga in più rispetto a helloworld, `.num_fbs = 2`, cioè il doppio framebuffer anti-tearing di cui parliamo dopo) e poi passarlo a `esp_lvgl_port`:

```c
const lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
lvgl_port_init(&lvgl_cfg);

const lvgl_port_display_cfg_t disp_cfg = {
    .panel_handle  = panel,
    .buffer_size   = LCD_H_RES * LCD_V_RES, /* Schermo intero: requisito fisso della direct mode */
    .hres          = LCD_H_RES, .vres = LCD_V_RES,
    .color_format  = LV_COLOR_FORMAT_RGB565,
    .flags = {
        .direct_mode = true,   /* Disegna direttamente nel framebuffer del pannello, risparmia una copia */
        .buff_dma    = false,
        .buff_spiram = true,   /* Buffer di disegno in PSRAM (← trappola 1: serve prima abilitare SPIRAM_USE_MALLOC)*/
        .swap_bytes  = false,  /* Pannello RGB parallelo, niente scambio di byte order */
    },
};
const lvgl_port_display_rgb_cfg_t rgb_cfg = {
    .flags = {
        .bb_mode       = true,  /* Con bounce buffer → usa la sincronia on_bounce_frame_finish */
        .avoid_tearing = true,  /* Cambia fb sul bordo del frame → previene il tearing (vedi fine capitolo)*/
    },
};
lvgl_port_add_disp_rgb(&disp_cfg, &rgb_cfg);

/* Qualsiasi chiamata lv_* va preceduta dall'acquisizione di questo lock, per evitare collisioni con il task di rendering di esp_lvgl_port.*/
lvgl_port_lock(0);
dashboard_create();   /* crea il tachimetro + avvia l'animazione della lancetta */
lvgl_port_unlock();
```

I tre flag sono la quintessenza di questo pezzo: `direct_mode` fa disegnare LVGL direttamente nel framebuffer del pannello (una copia intera schermo in meno); `avoid_tearing` fa scambiare i due fb sul bordo del frame (anti-tearing); `buff_spiram` sposta il buffer di disegno in PSRAM — quest'ultimo sembra innocuo, ma è proprio quello che introduce la trappola più grossa qui sotto.

### 5.1 Trappola 1 (la più subdola): white screen + reboot del watchdog

Dopo aver flashato, lo schermo prima è nero per due secondi, poi **tutto bianco**, e non si muove più. I sintomi sono **identici** al white screen da PCLK troppo alto di prima, e stavo per tuffarmi di nuovo a tarare i timing.

**Per fortuna stavolta ho aperto prima il log seriale**, e ho visto subito una riga chiave:

```
E task_wdt: CPU 0: taskLVGL
```

Il task di LVGL ha fatto scattare il watchdog ed è stato giudicato bloccato dal sistema. **È un blocco software, non un problema di segnale.** Seguendo lo stack di chiamate, ho visto che LVGL, la prima volta che disegna l'intero schermo, richiede temporaneamente un buffer di disegno da MB; ma LVGL di default usa il **suo memory pool interno, di soli 64KB** — 1MB non entra in 64KB, quindi si riavvolge su stesso, non finisce di disegnare, il task si blocca e il watchdog si arrabbia.

La cosa interessante è che io avevo messo il buffer di display in PSRAM, com'è possibile che la memoria non bastasse? Perché il **buffer di display** (per "rinfrescare lo schermo") e il **memory pool di disegno interno di LVGL** (per "calcolare l'immagine") sono due cose diverse, non confonderli. La soluzione è solo due interruttori:

```
CONFIG_LV_USE_CLIB_MALLOC=y    # LVGL usa la malloc di sistema invece del pool da 64KB
CONFIG_SPIRAM_USE_MALLOC=y     # Consente alla malloc di sistema di pescare blocchi grandi dalla PSRAM
```

> **Qui c'è una distinzione ancora più cruciale: anche quando si dice "white screen", ci sono almeno due cause completamente diverse.** Una è un problema di segnale/banda RGB (quella del PCLK di prima), l'altra è un blocco software in cui non si arriva a disegnare (questa). **Guarda sempre prima il log seriale per distinguerle**, non iniziare a tarare i timing appena vedi un white screen.

### 5.2 Trappole 2 e 3: versione componente e macro IDF non allineate

- **Trappola 2 (versioni componente da appaiare)**: `esp_lvgl_port` 2.8 usa internamente costanti di colore introdotte solo in LVGL 9.3. Fissare LVGL a `~9.2` dà `RGB565_SWAPPED undeclared`, spostalo a `^9.3` e passa.
- **Trappola 3 (macro IDF non allineata)**: il nuovo `esp_lvgl_port` controlla la macro `SOC_LCDCAM_RGB_LCD_SUPPORTED`, ma **solo da IDF 5.3 ha questo nome**, in 5.2.7 porta ancora quello vecchio, e a runtime ti dice "This target does not support RGB". La soluzione è aggiungere prima di `project()` nel CMakeLists top-level una riga `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)`.

### 5.3 "Scattosità" e "tearing": nessuno dei due è un problema di velocità di calcolo

Quando il tachimetro parte, si presentano due nuovi problemi: la lancetta si muove **non abbastanza fluida** e c'è **tearing** (una riga orizzontale sfasata a metà schermo). Entrambi **non c'entrano nulla con "quanto veloce calcoli"**.

**Prima la scattosità.** Ho calcolato prima il refresh rate fisico del display: PCLK 16MHz ÷ pixel totali per frame ≈ **20Hz**. Cioè questo schermo al massimo ridisegna l'immagine 20 volte al secondo, per quanto veloce sia il software non serve, è un soffitto hardware. Quindi "fluidità o no" non è un problema di frame rate, è un problema di **curva di animazione**. Una lancetta che scorre a velocità costante fino in fondo e inverte istantaneamente è particolarmente rigida; con `ease-in-out` (decelerazione alle estremità, accelerazione al centro) le transizioni diventano naturali.

```c
/* Tachimetro a 270°: modalità ROUND_INNER, parte da 135°, lascia un gap di 90° in basso.*/
lv_obj_t *scale = lv_scale_create(scr);
lv_obj_set_size(scale, 460, 460);
lv_scale_set_mode(scale, LV_SCALE_MODE_ROUND_INNER);
lv_scale_set_range(scale, 0, 120);
lv_scale_set_angle_range(scale, 270);
lv_scale_set_rotation(scale, 135);          /* Angolo iniziale, decide il verso del gap */
lv_scale_set_total_tick_count(scale, 25);   /* Un tacca ogni 5 km/h */
lv_scale_set_major_tick_every(scale, 4);    /* Una tacca principale ogni 4 → 0,20,...,120 */

/* Chiamata a ogni frame dell'animazione: punta la lancetta su v. Il valore numerico si aggiorna solo quando cambia la parte intera.*/
static void gauge_set_value(void *var, int32_t v) {
    gauge_ctx_t *g = (gauge_ctx_t *)var;
    lv_scale_set_line_needle_value(g->scale, g->needle, 150, v);  /* Lancetta, lunga 150px */
    int vi = (int)v;
    if (vi != g->last_int) {                 /* Se la parte intera non cambia, non toccare la label, evita il ridisegno */
        g->last_int = vi;
        lv_snprintf(s_value_buf, sizeof(s_value_buf), "%03d", vi);
        lv_label_set_text(g->value_label, s_value_buf);
    }
}

/* 0 → 120 → 0, loop infinito. La fluidità sta tutta nell'ultima riga.*/
lv_anim_t a;
lv_anim_init(&a);
lv_anim_set_var(&a, &s_ctx);
lv_anim_set_exec_cb(&a, gauge_set_value);
lv_anim_set_values(&a, 0, 120);
lv_anim_set_duration(&a, 2500);                       /* 2.5s a salire */
lv_anim_set_playback_duration(&a, 2500);              /* ritorno: 0→120→0 */
lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out);    /* ← decelera alle estremità, così le transizioni non sono rigide */
lv_anim_set_repeat_count(&a, LV_ANIM_REPEAT_INFINITE);
lv_anim_start(&a);
```

La chiave è proprio `lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out)`. Il `playback_duration` fa sì che l'animazione, arrivata a 120, inverta automaticamente verso 0; nell'istante di inversione la velocità si invertirebbe in modo brusco; l'`ease-in-out` la fa prima decelerare a 0 e poi riaccelerare in direzione opposta, cosicché a occhio nudo quasi non si nota il cambio di verso.

**Ora il tearing.** La causa è che era stato preparato solo un buffer immagine: la DMA lo sta spedendo fuori in continuazione, LVGL nel frattempo ci scrive dentro quello nuovo, senza sincronizzazione, e la DMA consegna un frame "mezzo nuovo e mezzo vecchio". La soluzione è **doppio buffer + sincronismo su vertical blank per lo switch**: due immagini, la DMA spedirà sempre solo quella completa. **Nota: su questo schermo bisogna conservare un piccolo buffer chiamato bounce buffer** (per evitare il white screen a 16MHz), quindi si usa "doppio buffer + bounce insieme", non si può disabilitare il bounce come farebbe l'esempio ufficiale.

> Su questo schermo, **la fluidità viene dalla curva di easing, l'assenza di tearing dal doppio buffer**; nessuno dei due c'entra con la velocità di calcolo.

---

## 6. Terzo passo: realizzare un cruscotto di telemetria veicolo

> 📦 **Codice completo di questo capitolo**: [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry) — trasforma il tutto in un pannello di telemetria veicolo a cinque schede con un certo design.

Alla fine ho sostituito il tachimetro con un vero e proprio **pannello di telemetria veicolo**: cinque dati — giri motore, acceleratore, temperatura acqua, velocità, tensione — ogni scheda ha numero grande, barra di avanzamento, scala min/max, e quando il valore va in sovraccarico diventa rosso. I dati sono casuali simulati, ma il movimento deve essere naturale.

### 6.1 Come si costruisce una scheda

Ogni scheda è solo un **contenitore `lv_obj` privo dello stile di default**, dentro cui metti label, unità, numero grande, barra e tacche min/max. Le coordinate sono tutte fisse, basate su bordo da 1px e stratificazione a tinta unita (niente ombre). Il cuore è così (versione completa in `make_card` dentro `lvgl_dashboard.c`):

```c
static void make_card(lv_obj_t *parent, int i) {
    const metric_cfg_t *c = &CFG[i];      /* Geometria/intervallo/soglie di pericolo/colore sono tutti nella tabella di config */
    metric_t *m = &s_m[i];
    m->accent = lv_color_hex(c->accent_hex);

    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_remove_style_all(card);                       /* Pulisce lo stile di default, si imposta tutto a mano */
    lv_obj_set_pos(card, c->x, c->y);                    /* Coordinate fisse, senza layout flex automatico */
    lv_obj_set_size(card, c->w, c->h);
    lv_obj_set_style_bg_color(card, COL_CARD, 0);
    lv_obj_set_style_radius(card, 18, 0);
    lv_obj_set_style_border_color(card, COL_BORDER, 0);  /* Stratificazione con bordo 1px, senza ombra */
    lv_obj_set_style_border_width(card, 1, 0);

    lv_obj_t *lab = lv_label_create(card);
    lv_label_set_text(lab, c->label);
    lv_obj_align(lab, LV_ALIGN_TOP_LEFT, 0, 0);          /* Label in alto a sinistra; stessa idea per l'unità in alto a destra */

    lv_obj_t *val = lv_label_create(card);
    lv_obj_set_style_text_font(val, &lv_font_montserrat_48, 0);  /* Numero grande */
    lv_obj_align(val, LV_ALIGN_TOP_LEFT, 0, c->value_y);
    m->value = val;

    /* Barra: il trough e l'indicator si colorano separatamente, in caso di pericolo l'indicator diventa rosso.*/
    lv_obj_t *bar = lv_bar_create(card);
    lv_obj_remove_style_all(bar);
    lv_bar_set_range(bar, c->min, c->max);
    lv_obj_set_size(bar, c->w - 2 * c->pad, c->big ? 14 : 10);
    lv_obj_align(bar, LV_ALIGN_BOTTOM_LEFT, 0, -24);
    lv_obj_set_style_bg_color(bar, COL_BAR_BG, 0);                /* trough */
    lv_obj_set_style_bg_color(bar, m->accent, LV_PART_INDICATOR); /* indicator */
    m->bar = bar;
}
```

### 6.2 Per rendere i numeri "vivi": avvicinamento con easing, non velocità costante

L'approccio più istintivo è "dai un valore nuovo casuale e lascia che il display lo rincorra a velocità costante". Ma una corsa a velocità costante, arrivata al target, azzera la velocità di colpo e sembra molto meccanica. Io uso un **avvicinamento con easing**: per ogni dato memorizzo il valore attualmente mostrato `current` e il target `target`; a ogni refresh mi avvicino di 1/6 della differenza (decadimento esponenziale, più si avvicina più rallenta). Ogni 1.2 secondi circa, faccio fare una passeggiata casuale partendo da vicino al valore corrente per generare un nuovo target, non saltando a caso su tutto l'intervallo — in questo modo somiglia a dati reali di un'auto:

```c
/* Ogni 30 tick (~1.2s) cambia il target: cammino casuale dal valore corrente, ampiezza = 1/3 dell'intervallo.*/
if (tick % 30 == 0) {
    int span = (m->max - m->min) / 3;
    m->target = clampi(m->current + rnd_range(-span, span), m->min, m->max);
}
/* Avvicinamento con easing: insegui 1/6 della differenza; se la differenza è piccola, attacca direttamente il target per non restare sempre un po' indietro.*/
int diff = m->target - m->current;
if (diff > -6 && diff < 6) m->current = m->target;
else                       m->current += diff / 6;   /* ← È questo il decadimento esponenziale */

/* La barra si aggiorna a ogni frame (è la parte "viva" visiva). In caso di pericolo l'indicator diventa rosso.*/
bool danger = in_danger(m);   /* RPM≥6800 / temp acqua≥105 / tensione≤10.8 oppure ≥14.6 */
lv_bar_set_value(m->bar, m->current, LV_ANIM_OFF);
lv_obj_set_style_bg_color(m->bar, danger ? COL_DANGER : m->accent, LV_PART_INDICATOR);
```

Stesso principio dell'`ease-in-out` della lancetta — si tratta di decelerare alle transizioni. Il controllo `danger` fa diventare rossa la barra quando va in sovraccarico, ed è da qui che arriva l'effetto "rosso in sovraccarico" del pannello.

### 6.3 Una piccola ottimizzazione comoda: se non è cambiato, non ridisegnare

Aggiorno ogni 40 millisecondi, ma spesso due calcoli consecutivi danno lo stesso intero (soprattutto quando ci si avvicina al target e ci si ferma). Ogni chiamata a `lv_label_set_text` duplica la stringa e marca il ridisegno: tutto lavoro inutile. Quindi aggiungo una riga: **solo quando il testo mostrato è davvero cambiato aggiorna**:

```c
/* Lettura numerica: solo se la stringa formattata è davvero cambiata fai set_text.*/
char buf[12];
fmt_scaled(m->current, m->scale, buf, sizeof(buf));
if (strcmp(buf, m->last_text) != 0) {
    strcpy(m->last_text, buf);             /* Salvala, la prossima volta la confronti */
    lv_label_set_text(m->value, buf);      /* strdup + marca redraw, solo quando cambia davvero */
}
lv_obj_set_style_text_color(m->value, danger ? COL_DANGER : COL_VALUE, 0);
```

### 6.4 Qualche compromesso per l'UI embedded

Su uno schermo piccolo a risoluzione fissa, **coordinate scritte direttamente** sono più prevedibili e meno rognose del layout flex automatico; le schede **non hanno ombra** (l'ombra di LVGL a 20Hz costa un po'), basta la stratificazione tramite bordo e tinta unita; il decimale della tensione usa uno scaling intero del tipo "memorizza 142 per rappresentare 14.2", risparmiando un sacco di calcoli in virgola mobile. L'approccio con scaling intero infila geometria/intervallo/soglie di pericolo/colore/scale di ogni metrica in una sola tabella di configurazione:

```c
/* Tabella di configurazione, una metrica per riga. Coordinate/intervallo/soglie di pericolo/colore/scale sono tutti in tabella, comodissimi da ritoccare in blocco.*/
static const metric_cfg_t CFG[] = {
    /* label      unit    x   y    w   h  pad v_y  min  max  dHi  dLo init accent   sc big */
    { "ENGINE",  "RPM",  24, 84, 478,242, 28, 78,    0,8000,6800,  0, 850,0xFF5A3C, 1, 1 },
    { "BATTERY", "V",   688,346, 312,230, 24, 64,  100, 150, 146,108, 124,0xB08CFF,10, 0 },
    /*                                                                  ↑ scale=10: 124 rappresenta 12.4V */
    /* ... le altre tre righe seguono la stessa idea */
};

/* A display si divide di nuovo indietro: 124 → "12.4". Tutto intero, niente calcoli in virgola mobile.*/
static void fmt_scaled(int32_t v, int32_t scale, char *buf, size_t n) {
    if (scale == 10) lv_snprintf(buf, n, "%d.%d", (int)(v / 10), (int)(v % 10));
    else             lv_snprintf(buf, n, "%d", (int)v);
}
```

Con `scale=10` si memorizza x10, con `scale=1` si memorizza il valore originale: l'easing, il judgement di pericolo e la barra girano tutti su questi interi, solo nell'ultimo istante della formattazione in stringa si "traduce" di nuovo nel formato con la virgola.

---

## 7. Risoluzione dei problemi comuni (niente panico, i problemi sono questi)

> Niente panico, il 90% dei problemi sta in questi punti. Davanti a un fenomeno strano **guarda prima il log seriale, calcola prima i parametri fisici**, non avere fretta di cambiare codice.

**Sullo schermo**

- L'esempio/documentazione ufficiale usa 800×480 di default, **usato direttamente sulla 5B avrai sfondo nero + striscia bianca a destra**. La 5B è **1024×600, ST7262, pure RGB direct drive**, senza init via SPI.
- La retroilluminazione passa per EXIO2 del **CH422G**, non è un GPIO normale e non è PWM (**solo on/off, non regolabile in luminosità**).
- Il chip touch GT911 (indirizzo I²C 0x5D) condivide il bus I²C con RTC e CH422G, fai attenzione alla pianificazione degli indirizzi; questa serie di esempi **non gestisce ancora il touch**, è un todo successivo.

**Ambiente di build (Windows)**

- **Non eseguire `idf.py` in Git Bash**, rileva `MSYSTEM` e smette di funzionare. Usa PowerShell + profilo EIM, prima di richiamarlo fai `unset MSYSTEM` (oppure `$env:MSYSTEM=$null`).
- La seriale è occupata e ti dice "port is busy", il più delle volte è il monitor precedente non chiuso bene; controlla che non ci siano residui prima di flashare.
- Hai modificato `sdkconfig.defaults` e non ha effetto? IDF non rimescola automaticamente i defaults dentro un `sdkconfig` già esistente, **cancella il sdkconfig e fallo rigenerare dai defaults**.

**Accendere lo schermo**

- **Non copiare i 21MHz della scheda, con framebuffer in PSRAM parti da 16MHz**, se è ancora bianco scendi a 12MHz.
- Non configurare male la PSRAM: N16R8 è **octal** (`SPIRAM_MODE_OCT`), non quad.
- Dopo aver creato il pannello **non dimenticare la riga `esp_lcd_panel_init()`**.
- Ricorda che GPIO0 è un pin strapping (al boot deve essere alto), dopo il boot usarlo come dato RGB non è un problema, ma non collegarci circuiti che lo tirerebbero basso al boot.
- Sulle deviazioni di colore distingui prima i due tipi: **bianco tende al ciano = ordine dei pin**; **bianco tende al rosa = valore del canale verde in RGB565** (il verde è a 6 bit 0–63, per il bianco puro serve `31,63,31`).

**Far girare LVGL**

- **Quasi sempre vanno attivati `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`**, altrimenti il pool interno di 64KB di LVGL non riesce a contenere il disegno dell'intero schermo, e il sintomo è white screen + reboot del watchdog.
- Le versioni dei componenti devono essere della stessa generazione: `esp_lvgl_port` 2.8 con LVGL `^9.3`.
- Per IDF 5.2 con il nuovo componente, aggiungi `SOC_LCDCAM_RGB_LCD_SUPPORTED=1` nel CMakeLists top-level.
- **Tra versioni diverse, LVGL / esp_lvgl_port cambiano i nomi delle API**, non scrivere a memoria, vai a leggerti gli header effettivi che hai scaricato.

**Fluidità e tearing**

- Calcola prima il refresh rate fisico del pannello (questo è circa 20Hz), gran parte delle ottimizzazioni al di sotto sono questioni di design dell'animazione.
- Per la fluidità la prima scelta è `ease-in-out`, non metterti a inseguire il frame rate.
- Tearing = buffer singolo + nessuna sincronizzazione, la soluzione è doppio framebuffer + `avoid_tearing`, **mantenendo il bounce buffer**.

---

## 8. FAQ

**D: Qual è la risoluzione della Waveshare ESP32-S3-Touch-LCD-5B? 800×480 oppure 1024×600?**
R: La 5B è **1024×600**. La documentazione ufficiale Waveshare etichetta tutta la serie da 5 pollici come "800×480 o 1024×600" senza distinguere la 5B. Metodo di verifica: flashaci dentro un segnale 800×480, lo schermo avrà sfondo nero + striscia bianca a destra, segno che il pannello è più largo del segnale: quindi è 1024×600. Non usare direttamente i 800×480 dell'esempio ufficiale.

**D: Lo schermo è tutto bianco, perché?**
R: Guarda prima il log seriale per distinguere due tipi di white screen. (1) Nessun errore watchdog → quasi sempre il segnale RGB non arriva, hai copiato il PCLK a 21MHz che è troppo alto, scendi a 16MHz. (2) Sul seriale c'è `task_wdt: taskLVGL` → il pool di memoria LVGL è troppo piccolo e si blocca; attiva `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`.

**D: La retroilluminazione si può regolare in luminosità? Perché non trovo il pin PWM?**
R: No. La retroilluminazione è su EXIO2 dell'IO expander CH422G, ha solo due stati on/off, non è PWM. Per regolarla dovresti modificare l'hardware della scheda (aggiungendo un buck-boost regolabile), a livello software non si può fare.

**D: Qual è il refresh rate di questo schermo? Perché la lancetta sembra scattosa?**
R: Circa **20Hz** (PCLK 16MHz ÷ pixel totali per frame). È un soffitto fisico, per quanto veloce sia il software non lo superi. La scattosità il più delle volte non è un problema di frame rate, ma di curva di animazione troppo rigida — cambia l'animazione della lancetta da lineare a `ease-in-out`, alle transizioni rallenta in modo naturale e diventa subito fluida.

**D: Si può accendere in Arduino IDE? Perché usi ESP-IDF?**
R: In teoria sì (Arduino-ESP32 sotto usa comunque ESP-IDF), ma la combinazione RGB direct drive + framebuffer in PSRAM + LVGL in Arduino rende molto scombo tarare sdkconfig; interruttori come PCLK, modalità PSRAM e memory pool si controllano molto meglio in ESP-IDF. Questo tutorial è basato su ESP-IDF.

**D: Flasho LVGL e ottengo white screen + reboot del watchdog, cosa faccio?**
R: Otto su dieci è il pool interno di 64KB di LVGL che non contiene il disegno dell'intero schermo. In sdkconfig attiva due interruttori: `CONFIG_LV_USE_CLIB_MALLOC=y` (LVGL passa alla malloc di sistema) e `CONFIG_SPIRAM_USE_MALLOC=y` (consente alla malloc di pescare blocchi grandi dalla PSRAM). Su ESP32-S3 + PSRAM + schermo grande è praticamente obbligatorio.

**D: La PSRAM si configura come quad o octal? Cosa succede se sbagli?**
R: La N16R8 è **octal** (`SPIRAM_MODE_OCT`). Se la configuri come quad la banda non basta, e il sintomo è che appena alzi un po' il PCLK si corrompe/va bianco, oppure il funzionamento è instabile.

**D: IDF 5.2.7 mi dà "This target does not support RGB", come si risolve?**
R: Il nuovo esp_lvgl_port controlla la macro `SOC_LCDCAM_RGB_LCD_SUPPORTED`, che solo da IDF 5.3 ha questo nome; in 5.2.7 porta ancora quello vecchio. Aggiungi prima di `project()` nel CMakeLists top-level la riga `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)`.

---

## 9. Estensioni possibili

Accenderlo è solo il punto di partenza, questa scheda si può spingere oltre in tanti modi:

- **Gestire il touch**: il GT911 è già sul bus I²C (GPIO8/9), basta aggiungere un driver per fare interazioni a pulsanti.
- **Leggere risorse dalla SD**: lo slot SD onboard (SPI) può caricare immagini e font, dicendo addio all'idea di stipare tutto in Flash.
- **Collegare il bus CAN**: con la TJA1051 onboard e il driver TWAI di ESP-IDF puoi costruire un vero lettore OBD per l'auto, e i numeri sul cruscotto non saranno più valori simulati.
- **Andare su RS485**: il transceiver SP3485 per sensori industriali / dispositivi Modbus.
- **Aggiungere l'RTC per il tempo offline**: anche la PCF85063 è sullo stesso bus I²C, puoi fare un data logger con timestamp reale.

---

## 10. Riferimenti

**Datasheet ufficiali e pagine prodotto**

- [ESP32-S3 Datasheet (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Datasheet modulo ESP32-S3-WROOM-1](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)
- [Pagina prodotto ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3)
- [Wiki Waveshare ESP32-S3-Touch-LCD-5B](https://docs.waveshare.net/ESP32-S3-Touch-LCD-5/?variant=ESP32-S3-LCD-5B-touch)

**Librerie open source e framework**

- [Documentazione ufficiale ESP-IDF](https://docs.espressif.com/projects/esp-idf/) (RGB LCD Panel, configurazione PSRAM, driver I²C Master)
- [espressif/esp_lvgl_port (GitHub)](https://github.com/espressif/esp_lvgl_port)
- [Documentazione ufficiale LVGL](https://docs.lvgl.io/) (controllo scale, animazione anim, barra bar)

**Codice di questo progetto**

- Il codice completo, la riproduzione di ogni trappola e la configurazione finale sono su GitHub, con tanto di docs in ogni cartella di esempio:
  - [Cartella completa del progetto (con i tre esempi)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)
  - [01 HelloWorld — accendere il display](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
  - [02 Speedometer — il tachimetro](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
  - [03 VehicleTelemetry — il cruscotto di telemetria veicolo](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

---

## Per chiudere

A guardarla indietro, tutto il percorso è su tre livelli: **accendere lo schermo → collegare LVGL → costruire l'interfaccia**. Ogni livello ha la sua trappola dedicata, ma le trappole spesso si somigliano (due tipi di white screen, due tipi di deviazione cromatica), e la cosa che più di tutte ti fa lavorare per niente è scambiare una trappola per un'altra.

Se potessi lasciarti una sola frase per chi viene dopo, sarebbe questa — quella che ho dovuto imparare davvero solo dopo essere caduto ripetutamente in queste tre trappole:

> **Davanti a un fenomeno strano, guarda prima il log seriale e calcola prima i parametri fisici, non avere fretta di cambiare codice.** La trappola della risoluzione dell'esempio ufficiale, il white screen del PCLK e il white screen della memoria LVGL sembrano tutti "schermo rotto", ma una è documentazione sbagliata, un'altra è banda hardware e un'altra è un blocco software; se le affronti nella direzione sbagliata, ti fotti una nottata intera.
