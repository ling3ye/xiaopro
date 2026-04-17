---
title: "ESP32-S3 + piccolo schermo a colori da $3 con animazioni LVGL | Guida per principianti in 10 minuti"
boardId: esp32s3
moduleId: display/tft096-st7735s
category: esp32
date: 2026-04-10
intro: "Usare l'ESP32-S3 per pilotare uno schermo TFT ST7735S da 0.96 pollici con animazioni LVGL. Dai collegamenti al codice completo, con guida ai troubleshooting. Ideale per principianti di Arduino e sviluppo embedded."
image: "https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png"
---

# ESP32-S3 + piccolo schermo a colori da $3 con animazioni LVGL! Guida per principianti in 10 minuti (edizione 2026 con troubleshooting)

> **In una frase**: ESP32-S3 che pilota uno schermo TFT ST7735S da 0.96 pollici + animazioni LVGL, 5 pin essenziali da collegare + guida completa per evitare tutti gli errori più comuni

## Risultato finale

![image-20260410152138611](https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png)

> Uno schermo da 0.96 pollici, grande quanto un'unghia, che riesce a far girare animazioni LVGL fluidissime. Questo articolo ti spiega tutto, dai collegamenti al codice, e ti fa evitare tutti gli errori in anticipo.



------

Youtube：

<iframe width="560" height="315" src="https://www.youtube.com/embed/CQLLgFDcRxQ?si=FN2UYXNuTbGifnBN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

------

## Cosa imparerai

1. Come usare l'ESP32-S3 per pilotare uno schermo TFT ST7735S da 0.96 pollici tramite SPI
2. Come configurare la libreria Arduino_GFX (e perché non usiamo TFT_eSPI)
3. Il flusso completo per portare LVGL v9 su un piccolo schermo
4. Un esempio di UI LVGL con doppia animazione (movimento orizzontale + rimbalzo verticale)



## Lista BOM

| Componente                       | Quantità | Note                                     |
| -------------------------------- | -------- | ---------------------------------------- |
| Scheda di sviluppo ESP32-S3      | 1        | Qualsiasi variante S3 va bene            |
| Schermo TFT IPS ST7735S 0.96"    | 1        | Risoluzione 80×160, interfaccia SPI, 8Pin |
| Cavi Dupont (femmina-femmina)    | alcuni    | 8 cavi sono sufficienti                  |





## Specifiche dello schermo

![image-20260410113243742](https://img.lingflux.com/2026/04/e66957af12d082ebd30b5b8cdb06de8c.png)

> Non devi ricordare tutto, concentrati sui parametri contrassegnati con *****, sono quelli che ti serviranno quando scrivi il codice.

| Parametro         | Specifica               | Note                                                               |
| ----------------- | ----------------------- | ------------------------------------------------------------------ |
| Dimensioni        | 0.96" TFT IPS           | Ampio angolo di visione, buona resa cromatica                     |
| Risoluzione       | 80(H) × 160(V)          | ***** Nel codice `screenWidth=160, screenHeight=80` (orizzontale) |
| Chip driver       | ST7735S                 | ***** Da abbinare alla libreria corretta                           |
| Interfaccia       | SPI a 4 fili            | Fino a 40MHz (consigliato testare prima con frequenza predefinita) |
| Tensione lavoro   | **3.3V**                | ***** NON collegare MAI a 5V!                                      |
| Numero pin        | 8Pin                    | Include il pin di controllo retroilluminazione BLK                 |



| Parametro                | Specifica                      |
| ------------------------ | ------------------------------- |
| Area display             | 10.8(H) × 21.7(V) mm           |
| Dimensioni pannello      | 19(H) × 24(V) × 2.7(D) mm      |
| Pitch pixel              | 0.135(H) × 0.1356(V) mm        |
| Corrente di lavoro       | 20mA                            |
| Tipo retroilluminazione  | 1 LED                           |
| Temperatura di lavoro    | -20 ~ 70°C                      |
| Dimensioni PCB           | 30.00 × 24.04 mm                |
| Diametro fori di montaggio | 2 mm                          |
| Passo pin header         | 2.54 mm                         |

**Definizione interfaccia:**

| N. | Pin | Descrizione                                                        |
| -- | --- | ------------------------------------------------------------------ |
| 1  | GND | Massa                                                              |
| 2  | VCC | Alimentazione positiva (3.3V)                                      |
| 3  | SCL | Segnale di clock SPI                                               |
| 4  | SDA | Segnale dati SPI                                                   |
| 5  | RES | Reset (reset a livello basso)                                      |
| 6  | DC  | Selezione registro/dati (basso=comando, alto=dati)                 |
| 7  | CS  | Chip Select (abilitato a livello basso)                             |
| 8  | BLK | Controllo retroilluminazione (livello alto = accesa; se non controllata, collega a 3.3V) |




## Collegamenti

| Pin ESP32-S3 | Pin ST7735S | Descrizione                                           |
| ------------ | ----------- | ----------------------------------------------------- |
| GND          | GND         | Massa comune                                          |
| **3.3V**     | VCC         | **VIETATO collegare a 5V**                            |
| GPIO 12      | SCL         | Clock SPI                                             |
| GPIO 11      | SDA         | Dati SPI (MOSI)                                       |
| GPIO 21      | RES         | Reset                                                 |
| GPIO 47      | DC          | Selezione comando/dati                                |
| GPIO 38      | CS          | Chip Select                                           |
| GPIO 48      | BLK         | Retroilluminazione (se non la controlli, collega direttamente a 3.3V) |



### Note sui collegamenti

- **Alimentazione**: collega SOLO a 3.3V, a 5V lo schermo si brucia
- **Pin BLK (retroilluminazione)**: se non hai bisogno di controllare la retroilluminazione via software, collegalo direttamente a 3.3V per tenerla sempre accesa
- **CS (Chip Select)**: attivo a livello basso
- **RES (Reset)**: l'inizializzazione all'accensione richiede un reset a livello basso
- **Scelta dei pin**: i pin sopra indicati usano i pin predefiniti di SPI2 (FSPI) dell'ESP32-S3. Se cambi pin, devi aggiornare anche le definizioni delle macro nel codice



## Installazione delle librerie

Installa le seguenti due librerie nell'Arduino IDE:

1. **Arduino_GFX_Library** — cerca "GFX Library for Arduino" e installa
2. **LVGL** — cerca `lvgl` e installa (serve la versione **v9.x**)

> **Perché usare Arduino_GFX invece di TFT_eSPI?**
>
> Premesso che a me TFT_eSPI piace molto, l'ho usato per pilotare tanti schermi, e entrambe le librerie possono pilotare lo schermo ST7735S, ma il modo di configurarle è molto diverso:
>
> **Il problema di TFT_eSPI: devi modificare manualmente i file sorgente della libreria**
>
> TFT_eSPI richiede di aprire il file `User_Setup.h` nella cartella di installazione della libreria e modificare a mano la definizione dei pin e la selezione del chip driver. Questo significa che:
>
> 1. Devi trovare il percorso di installazione della libreria (diverso su ogni sistema: `Documents/Arduino/libraries/` oppure `.platformio/packages/`)
>
> 2. Devi cercare la riga giusta in un file di configurazione di centinaia di righe, commentare i valori predefiniti e decommentare quelli che ti servono
>
> 3. Se lavori con più progetti che usano schermi diversi, ogni volta devi ri-modificare questo file
>
> 4. **Dopo un aggiornamento della libreria, la configurazione viene sovrascritta**, e il tuo progetto improvvisamente non compila più
>
>    È il lamentela più comune: "Ho seguito il tutorial video ma ho lo schermo bianco" — quasi sempre il problema è `User_Setup.h` modificato male o non caricato.
>
>    **L'approccio di Arduino_GFX: i pin si definiscono direttamente nel codice**
>
>    Al confronto, con Arduino_GFX tutta la configurazione avviene nel tuo file `.ino`:
>
>    ```c
>    // Tutti i pin e i parametri del driver definiti direttamente nel codice, senza modificare alcun file della libreria
>    Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
>    Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
>    ```
>
>    - Vuoi cambiare pin? Modifica una riga `#define`
>
>    - Vuoi cambiare schermo? Cambia `Arduino_ST7735` con `Arduino_ILI9341` o un altro driver
>
>    - Aggiornamento della libreria? Non influenza il tuo codice
>
>    - Più progetti contemporanei? Ogni progetto ha la sua configurazione, senza interferenze
>
>    **Inoltre, la compatibilità di TFT_eSPI con l'ESP32-S3 sta diventando problematica**, ci sono diverse segnalazioni su GitHub di errori di compilazione con ESP32 Arduino Core 3.x, perché il produttore ufficiale ESP32 (Espressif) ha cambiato molte API. Arduino_GFX è ancora manutenuto attivamente e ha un supporto migliore per i chip più recenti.





## Ambiente di sviluppo

L'ambiente di sviluppo usato per questo esempio:

MacOS - v15.1.1

Arduino IDE - v2.3.8

Libreria scheda: esp32 (by Espressif Systems) - v3.3.7

Libreria driver schermo: GFX Library for Arduino (by Moon on our nation) - v1.6.5

Libreria grafica: LVGL (by kisvegabor) - v9.5.0



## Codice completo



```c
#include <Arduino_GFX_Library.h>
#include <lvgl.h>

// --- Pin e inizializzazione GFX ---
#define TFT_CS 38
#define TFT_RST 21
#define TFT_DC 47
#define TFT_MOSI 11
#define TFT_SCLK 12
#define TFT_BLK 48

#define BLACK   0x0000
#define WHITE   0xFFFF
#define ROTATION 1

Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);

static const uint32_t screenWidth  = 160;
static const uint32_t screenHeight = 80;

void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = lv_area_get_width(area);
  uint32_t h = lv_area_get_height(area);
  uint32_t stride = lv_draw_buf_width_to_stride(w, LV_COLOR_FORMAT_RGB565);
  uint8_t * row_ptr = px_map;
  
  for (uint32_t y = 0; y < h; y++) {
    gfx->draw16bitRGBBitmap(area->x1, area->y1 + y, (uint16_t *)row_ptr, w, 1);
    row_ptr += stride;
  }
  lv_display_flush_ready(display);
}

// ==========================================
// Definizione delle funzioni di callback per le animazioni (per ricevere i cambiamenti dei valori delle animazioni LVGL)
// ==========================================

// Callback: cambia la coordinata X dell'oggetto (movimento orizzontale)
static void anim_x_cb(void * var, int32_t v) {
  lv_obj_set_x((lv_obj_t *)var, v);
}

// Callback: cambia la coordinata Y dell'oggetto (movimento verticale)
static void anim_y_cb(void * var, int32_t v) {
  lv_obj_set_y((lv_obj_t *)var, v);
}

void setup() {
  Serial.begin(115200);
  pinMode(TFT_BLK, OUTPUT);
  digitalWrite(TFT_BLK, HIGH);

  gfx->begin();
  gfx->fillScreen(BLACK);

  lv_init();
  lv_display_t *display = lv_display_create(screenWidth, screenHeight);
  lv_display_set_color_format(display, LV_COLOR_FORMAT_RGB565);

  static lv_color_t buf[screenWidth * screenHeight / 10];
  lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(display, my_disp_flush);

  // Imposta lo sfondo dello schermo su bianco standard
  lv_obj_set_style_bg_color(lv_scr_act(), lv_color_hex(0xFFFFFF), 0);

  // ==========================================
  // Layout UI avanzato: crea un contenitore trasparente per racchiudere gli elementi
  // ==========================================
  
  // 1. Crea un contenitore trasparente (dimensioni 100x60)
  lv_obj_t * cont = lv_obj_create(lv_scr_act());
  lv_obj_set_size(cont, 100, 60);
  lv_obj_set_style_bg_opa(cont, 0, 0);             // Sfondo completamente trasparente
  lv_obj_set_style_border_width(cont, 0, 0);       // Rimuovi il bordo
  lv_obj_set_style_pad_all(cont, 0, 0);            // Rimuovi il padding interno
  lv_obj_align(cont, LV_ALIGN_CENTER, 0, 0);       // Centra il contenitore

  // 2. Metti il quadrato verde nel contenitore e allinealo in alto al centro
  lv_obj_t *rect = lv_obj_create(cont);
  lv_obj_set_size(rect, 30, 30);
  lv_obj_set_style_bg_color(rect, lv_color_hex(0x00FF00), 0);
  lv_obj_set_style_border_width(rect, 0, 0);
  lv_obj_align(rect, LV_ALIGN_TOP_MID, 0, 0);

  // 3. Metti il testo nel contenitore e allinealo in basso al centro
  lv_obj_t * label = lv_label_create(cont);
  lv_label_set_text(label, "hello world!");
  lv_obj_set_style_text_color(label, lv_color_hex(0x000000), 0);
  lv_obj_align(label, LV_ALIGN_BOTTOM_MID, 0, 0);


  // ==========================================
  // Aggiungi doppia animazione (motore di animazione LVGL v9)
  // ==========================================

  // Animazione A: fa muovere l'intero contenitore (quadrato + testo) avanti e indietro
  lv_anim_t a_x;
  lv_anim_init(&a_x);
  lv_anim_set_var(&a_x, cont);                       // Associa l'oggetto animazione: contenitore
  lv_anim_set_values(&a_x, -30, 30);                 // Sposta 30 a sinistra dal centro, poi 30 a destra
  lv_anim_set_time(&a_x, 2000);                      // Tempo per un singolo spostamento: 2000 ms (2 secondi)
  lv_anim_set_playback_time(&a_x, 2000);             // Anche il ritorno dura 2000 ms
  lv_anim_set_repeat_count(&a_x, LV_ANIM_REPEAT_INFINITE); // Ciclo infinito
  lv_anim_set_path_cb(&a_x, lv_anim_path_ease_in_out);     // Usa la curva "ease-in-out" per un movimento fluido e naturale
  lv_anim_set_exec_cb(&a_x, anim_x_cb);              // Associa la funzione callback per l'asse X definita sopra
  lv_anim_start(&a_x);                               // Avvia l'animazione!

  // Animazione B: fa rimbalzare il quadrato verde su e giù
  lv_anim_t a_y;
  lv_anim_init(&a_y);
  lv_anim_set_var(&a_y, rect);                       // Associa l'oggetto animazione: solo il quadrato verde
  lv_anim_set_values(&a_y, 0, 10);                   // Offset verso il basso da 0 a 10 pixel
  lv_anim_set_time(&a_y, 300);                       // Rimbalzo velocissimo, 300 ms per volta
  lv_anim_set_playback_time(&a_y, 300);              
  lv_anim_set_repeat_count(&a_y, LV_ANIM_REPEAT_INFINITE); 
  lv_anim_set_path_cb(&a_y, lv_anim_path_ease_in_out); 
  lv_anim_set_exec_cb(&a_y, anim_y_cb);              // Associa la funzione callback per l'asse Y definita sopra
  lv_anim_start(&a_y);                               // Avvia l'animazione!
}

// Registra il tempo dell'ultimo ciclo
uint32_t last_tick = 0;
void loop() {
  // 1. Calcola quanti millisecondi sono passati dall'ultimo ciclo di loop
  uint32_t current_tick = millis();
  uint32_t elapsed_time = current_tick - last_tick;
  last_tick = current_tick;

  // 2. Comunica a LVGL il tempo trascorso (questo è il segreto assoluto per far funzionare le animazioni!)
  lv_tick_inc(elapsed_time);

  // 3. LVGL elabora le animazioni e ridisegna l'interfaccia
  lv_timer_handler();
  
  // 4. Una piccola pausa per evitare di saturare la CPU
  delay(5);
}
```





## Spiegazione delle righe chiave del codice

> Ecco i punti dove i principianti sbagliano più spesso. Controlla il tuo codice riga per riga:

### 1. I parametri di offset nell'inizializzazione GFX



```c
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
```

Gli ultimi 4 numeri `26, 1, 26, 1` corrispondono rispettivamente a `col_offset1, row_offset1, col_offset2, row_offset2`. **Se lo schermo mostra un'immagine spostata (il contenuto è schiacciato in un angolo o ci sono bordi neri), modifica questi 4 valori.** Moduli ST7735S di produttori diversi hanno offset differenti; quelli indicati qui sono i più comuni.

### 2. Dimensioni dello schermo — attenzione all'orientamento orizzontale

```c
#define ROTATION 1  // Rotazione orizzontale
static const uint32_t screenWidth  = 160;  // Dopo la rotazione, la larghezza diventa 160
static const uint32_t screenHeight = 80;   // L'altezza diventa 80
```

Lo schermo fisico è 80×160 (verticale), con `ROTATION=1` ruota di 90° e diventa 160×80. **Le dimensioni del display di LVGL devono corrispondere all'orientamento dopo la rotuzione**, altrimenti l'immagine sarà distorta.

### 3. Callback flush — il ponte tra LVGL e GFX

```c
void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  ...
  lv_display_flush_ready(display);  // Questa riga non si può dimenticare!
}
```

`lv_display_flush_ready()` dice a LVGL "questa area è stata disegnata, puoi passare alla prossima". **Se dimentichi questa riga = lo schermo non si aggiorna mai.**

### 4. Alimentazione del tempo nel loop

```c
lv_tick_inc(elapsed_time);
lv_timer_handler();
```

Queste due righe sono il "cuore" delle animazioni LVGL. `lv_tick_inc` alimenta il tempo, `lv_timer_handler` attiva il ridisegno dell'interfaccia. **Se manca una sola di queste due righe, le animazioni non si muoveranno.**





## Risoluzione dei problemi comuni

| Sintomo                                                   | Possibile causa                                                      | Soluzione                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Schermo bianco (retroilluminazione accesa ma nessun contenuto)** | Callback flush non collegata correttamente oppure `lv_display_flush_ready()` mancante | Verifica che `my_disp_flush` sia impostata correttamente come flush_cb           |
| **Schermo con artefatti / blocchi di colori casuali**     | Pin SPI collegati male o contatto precario                           | Ricontrolla i collegamenti, assicurati che i cavi Dupont siano ben inseriti      |
| **Immagine spostata / bordi neri**                        | Parametri di offset ST7735S non corretti                             | Regola i parametri `col_offset` e `row_offset` nel costruttore di `Arduino_ST7735` |
| **Colori invertiti (il blu diventa rosso, ecc.)**         | Impostazione RGB/BGR sbagliata                                       | Controlla il parametro dell'ordine dei colori nell'inizializzazione GFX          |
| **Immagine capovolta**                                    | Parametro di rotazione non corretto                                  | Prova a cambiare `ROTATION` a 0 oppure 3                                         |
| **Errore di compilazione: lvgl.h non trovato**            | Libreria LVGL non installata oppure versione sbagliata               | Assicurati di aver installato **LVGL v9.x** (non v8)                             |
| **Le animazioni non si muovono, l'interfaccia è statica** | Nel loop manca `lv_tick_inc()` oppure `lv_timer_handler()`           | Assicurati che entrambe le righe siano presenti                                  |
