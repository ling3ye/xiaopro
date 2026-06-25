---
title: "ESP32-S3 con schermo circolare GC9A01 + MQ135: guida completa per dashboard qualità dell'aria (LVGL v9 + interfaccia SPI + Arduino C++)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-25
intro: "ESP32-S3 + sensore di gas MQ135 + schermo circolare GC9A01 da 1,28 pollici con LVGL v9 per creare una dashboard qualità dell'aria con arco animato, grafico a trend in tempo reale e effetto glow pulsante, inclusi cablaggio completo, codice e risoluzione problemi."
image: "https://img.lingflux.com/2026/06/4217f9f4026039eeca35a691450313dc.jpg"
---





> Difficoltà: ⭐⭐☆☆☆ (basta qualche cavo dupont per iniziare)
> Tempo stimato: 45 minuti
> Ambiente di test: Arduino IDE 2.3.8 · ESP32 Arduino Core 3.x · lvgl v9.5.0 · Arduino_GFX_Library v1.6.5

---

> **TL;DR (vuoi solo farlo funzionare? leggi qui)**
>
> **Gestione delle aspettative:** questo progetto è solo a scopo educativo, da tavolo e puro piacere visivo. **Non usarlo mai per rilevare davvero fughe di gas pericolose!** La sua precisione è più o meno "alchemica".
>
> 1. **Cablaggio:** MQ135 A0 → GPIO 13; GC9A01 collegato come da tabella a GPIO 7 / 9 / 10 / 11 / 12 / 18
> 2. **Librerie:** cerca `lvgl` (scegli v9.x) + `Arduino_GFX_Library` nel gestore librerie Arduino
> 3. **Configura lv_conf.h:** attiva `LV_FONT_MONTSERRAT_14` e `LV_FONT_MONTSERRAT_28` (cambia 0 → 1)
> 4. Flash → lo schermo si accende, l'indicatore inizia a girare

---

## Introduzione

Tra i miei sensori che raccoglievano polvere ne ho trovato uno specializzato nel monitoraggio della qualità dell'aria: il modulo MQ135. Volevo verificare la qualità dell'aria nel mio laboratorio, quindi l'ho collegato per fare qualche prova. Il manuale diceva che questo modulo richiede 24 ore di preriscaldamento, quindi mi sembrava più un giocattolo. Tuttavia, questo modulo è sensibile a diversi gas; anche se non necessariamente preciso, quando il valore aumenta significa che qualche gas è presente, potrebbe essere anidride carbonica, ammoniaca, benzene, alcol, fumo. Per giudicare se una stanza necessita ventilazione basandosi su valori relativi, dovrebbe andare bene.

Così è nato questo progetto: ESP32-S3 + sensore di gas MQ135 + schermo circolare GC9A01 da 1,28 pollici, con la famosa libreria grafica LVGL v9, per creare un indicatore di qualità dell'aria con arco, grafico a trend in tempo reale e che "respira" cambiando colore.

Obiettivo di questo articolo: **dallo zero al funzionamento completo, riprodurre interamente questo effetto.**

---

## Risultato sperimentale

Lo schermo circolare mostra in tempo reale il valore ADC della qualità dell'aria attuale, lo stato di qualità (ECCellenTE / BUONO / ACCETtabile / MODERATO / SCARSO / PERICOLO) e il grafico storico del trend; il colore dell'indicatore passa dal verde al rosco in base alla qualità dell'aria, con un effetto glow "respirante" sul bordo esterno. Nell'angolo in basso a sinistra dello schermo vengono registrati anche i valori minimi e massimi dall'accensione.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/2M6HRdpfW-Q" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## Descrizione dei componenti

> La scheda di sviluppo (ESP32-S3) non viene presentata in questo articolo, di seguito sono descritti solo i due moduli che i principianti potrebbero non aver mai utilizzato.

### Sensore di gas MQ135

Il MQ135 è un sensore gas che rileva le variazioni di concentrazione di gas nocivi come CO₂, ammoniaca, benzene nell'aria. In questo progetto serve per emettere un valore ADC analogico 0-4095 che riflette il livello di qualità dell'ambiente attuale.

In parole povere: **è un "naso" chimico**, più l'aria è inquinata, più alta è la tensione in uscita e maggiore è il valore ADC.

| Parametro | Valore |
|------|-----|
| Tensione di lavoro standard | 5V (filo riscaldante) / uscita analogica compatibile 3,3V |
| Interfaccia di uscita | Analogica (A0) + Digitale (D0) |
| Tempo di preriscaldamento | 24-48 ore (precisione completa) / circa 3 minuti (riferimento trend) |
| Gas rilevabili | CO₂, NH₃, NOₓ, benzene, alcol, fumo |

**Informazioni sull'alimentazione 3,3V:** La tensione standard del MQ135 è 5V; con alimentazione 3,3V la potenza del filo riscaldante è circa il 44% dello standard, la sensibilità diminuisce e le letture sono più basse, ma è sufficiente per mostrare il trend e rilevare variazioni relative. Per la massima precisione, si consiglia di alimentare VCC con 5V separatamente; l'uscita analogica A0 non supera 3,3V, quindi può essere collegata direttamente all'ESP32-S3 senza partitore di tensione.

Motivo della scelta: **economico (meno di 5 yuan), modulare, pronto all'uso con pochi cablaggi**, sufficiente per questo progetto "estetico".

**Utilizzo corretto del MQ135 per giudizi indoor**

```
✅ Adatto per:
  - Monitoraggio trend della qualità dell'aria (valori relativi)
  - Determinazione soglie per attivare ventilazione/allarme
  - Indicatore di "inquinamento complessivo" da più gas nocivi

❌ Non adatto per:
  - Misurazione precisa di concentrazione di singolo gas
  - Verifica di sicurezza di livello medico/industriale
  - Valori precisi di CO₂ (errore fino a ±300ppm o più)
```

---

### Schermo TFT circolare GC9A01 da 1,28 pollici

Il GC9A01 è uno schermo TFT LCD circolare da 1,28 pollici che riceve dati immagine tramite interfaccia SPI e li renderizza. In questo progetto serve per mostrare l'interfaccia UI dell'indicatore con effetti animati.

Analogia: **è quel tipo di quadrante circolare sugli smartwatch su cui puoi disegnare contenuti liberamente.**

| Parametro | Valore |
|------|-----|
| Dimensione schermo | 1,28 pollici |
| Risoluzione | 240 × 240 pixel |
| Interfaccia | SPI (fino a 80 MHz) |
| Chip driver | GC9A01 |
| Tensione di lavoro | 3,3V |
| Controllo retroilluminazione | Supportato (pin BL, dimmerazione PWM possibile) |

Motivo della scelta: **aspetto circolare unico, dimensioni compatte, uso diretto a 3,3V, supporto nativo da Arduino_GFX_Library**, con LVGL fa un figurone per l'effetto visivo dell'indicatore.

---

## BOM (Bill of Materials)

| Componente | Modello / Specifiche | Quantità |
|------|------------|------|
| Scheda principale | ESP32-S3 (con USB-C) | 1 |
| Schermo TFT circolare | GC9A01 1,28" 240×240 | 1 |
| Sensore gas | Modulo MQ135 | 1 |
| Cavi di connessione | Cavi dupont | Alcuni |



---

## Descrizione pin dei componenti

### Pin del modulo MQ135

| Pin | Descrizione |
|------|------|
| VCC | Alimentazione (in questo progetto a 3,3V, standard è 5V) |
| GND | Terra |
| A0 | Uscita segnale analogico, collegare a pin ADC dell'ESP32-S3 |
| D0 | Uscita digitale (non usata in questo progetto) restituisce **livello alto/basso (HIGH / LOW)** |

### Pin del modulo GC9A01

| Etichetta pin | Descrizione |
|---------|------|
| VCC | Alimentazione 3,3V |
| GND | Terra |
| SCL / CLK | Clock SPI |
| SDA / MOSI | Dati SPI |
| CS | Chip Select (attivo basso) |
| DC | Selezione dati/comando |
| RST | Reset (reset attivo basso) |
| BL | Controllo retroilluminazione (HIGH = acceso) (opzionale, non tutti i moduli lo hanno) |

---

## Schema di collegamento

### MQ135 → ESP32-S3

| MQ135 | ESP32-S3 |
|-------|----------|
| VCC | 5V |
| GND | GND |
| A0 | GPIO 13 |

### GC9A01 → ESP32-S3

| Pin GC9A01 | GPIO ESP32-S3 |
|------------|---------------|
| VCC | 3,3V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL (retroilluminazione) | GPIO 7 (se presente, altrimenti non collegare) |

> **Promemoria pratico:** Dopo il cablaggio, **confronta riga per riga con le due tabelle sopra**, puoi risparmiare l'80% del tempo di debug. L'errore più frequente è invertire DC e CS - una volta scambiati, lo schermo diventa tutto bianco o tutto nero, sembra "rotto", ma in realtà i cavi sono solo sbagliati.

---

## Librerie da installare

Apri Arduino IDE → Strumenti → Gestione librerie, cerca e installa queste due:

| Libreria | Autore | Versione testata in questo articolo |
|------|------|-----------------|
| `lvgl` | LVGL | v9.5.0 |
| `Arduino_GFX_Library` | Moon On Our Nation | v1.6.5 |

**Dopo aver installato lvgl, c'è un passaggio obbligatorio:**

1. Trova la directory della libreria lvgl (solitamente in `Documenti/Arduino/libraries/lvgl/`)
2. Copia `lv_conf_template.h` che c'è dentro, rinominala in `lv_conf.h`, mettila nella stessa directory di `lvgl/`
3. Apri `lv_conf.h`, trova queste due righe, cambia `0` in `1`:
   ```c
   #define LV_FONT_MONTSERRAT_14  1
   #define LV_FONT_MONTSERRAT_28  1
   ```
4. Apri `lv_conf.h`, trova all'inizio ` #if 0 ` e cambialo in ` #if 1`

> Se dimentichi questo passaggio e fai direttamente il flash, la compilazione darà errore `lv_font_montserrat_28 undeclared`. Non chiedermi come lo so.

---

## Codice completo

```cpp
/*
 * ESP32-S3 + GC9A01 dashboard qualità dell'aria su schermo circolare v3.1
 * "Stile tech minimale" - arco di progresso + grafico trend real-time + glow pulsante
 *
 * Ambiente di test: Arduino IDE 2.3.2 / ESP32 Core 3.x
 * Librerie dipendenti: lvgl v9.2.x + Arduino_GFX_Library v1.4.x
 */

#include <Arduino.h>
#include <lvgl.h>
#include <Arduino_GFX_Library.h>
#include <math.h>

// ===================== Definizione pin =====================
#define TFT_SCK    12   // Clock SPI
#define TFT_MOSI   11   // Dati SPI
#define TFT_CS     9    // Chip Select
#define TFT_DC     10   // Selezione dati/comando (se invertito lo schermo diventa tutto bianco)
#define TFT_RST    18   // Reset
#define TFT_BL     7    // Retroilluminazione - deve essere HIGH per accendersi, se dimentichi questo pin è inutile
#define MQ135_PIN  13   // Ingresso analogico MQ135 (canale ADC2, funziona normalmente senza Wi-Fi)

#define SCREEN_WIDTH   240
#define SCREEN_HEIGHT  240

// ===================== Inizializzazione driver display =====================
Arduino_ESP32SPI bus = Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01 gfx = Arduino_GC9A01(&bus, TFT_RST, 0, true);

// ===================== Buffer disegno LVGL =====================
// 40 righe di buffer occupano circa 19KB su ESP32-S3, buon equilibrio velocità/memoria
#define DRAW_BUF_LINES 40
alignas(4) static uint16_t draw_buf[SCREEN_WIDTH * DRAW_BUF_LINES];

// ===================== Dati storici trend =====================
#define TREND_POINTS 40    // Mantiene gli ultimi 40 punti di campionamento (× 300ms ≈ 12 secondi di storia su schermo)
static int trendData[TREND_POINTS] = {0};
static int trendIdx = 0;
static bool trendFull = false;
static lv_point_precise_t trendLinePoints[TREND_POINTS];

// ===================== Handle oggetti UI LVGL =====================
static lv_obj_t *arc_bg;          // Sfondo arco traccia (colore scuro)
static lv_obj_t *arc_main;        // Arco principale + piccolo pallino knob all'estremità
static lv_obj_t *glow_circle;     // Cerchio bordo glow esterno (respira)
static lv_obj_t *center_circle;   // Piastra base disco centrale
static lv_obj_t *label_value;     // Numero grande centrale (valore ADC)
static lv_obj_t *label_unit;      // Etichetta unità "ADC"
static lv_obj_t *label_status;    // Testo stato (ECCellenTE / BUONO...)
static lv_obj_t *dot_status;      // Pallino stato
static lv_obj_t *label_title;     // Titolo superiore "AIR QUALITY"
static lv_obj_t *label_score;     // Punteggio pulizia inferiore
static lv_obj_t *label_minmax;    // Valori min/max
static lv_obj_t *trend_line;      // Linea trend
static lv_obj_t *trend_container; // Container ritaglio linea

// ===================== Stato sensore =====================
static float smoothedValue = 0.0f; // Valore mediato per ponderazione esponenziale
static bool firstSample = true;    // Flag primo frame, evita animazione che parte da 0
static int minValue = 4095;        // Valore ADC minimo dall'accensione
static int maxValue = 0;          // Valore ADC massimo dall'accensione
static float displayValue = 0.0f;  // Per interpolazione animazione UI

// ===================== Callback timer LVGL =====================
static uint32_t my_tick_cb(void) { return millis(); }

// ===================== Callback flush: LVGL finisce di renderizzare un'area e la invia allo schermo =====================
void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = area->x2 - area->x1 + 1;
  uint32_t h = area->y2 - area->y1 + 1;
  gfx.draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)px_map, w, h);
  lv_display_flush_ready(disp); // Dice a LVGL: quest'area è finita, puoi continuare con la prossima
}

// ===================== Sistema colori: valore ADC → colore stato =====================
// Valore più alto = aria peggiore = colore più rosso, sei livelli corrispondono a sei stati
uint32_t getColorHex(int v) {
  if (v < 600)  return 0x00E5A0; // ECCellenTE: verde fresco
  if (v < 1200) return 0x22C55E; // BUONO: verde chiaro
  if (v < 2000) return 0xA3E635; // ACCETTabile: verde-giallo
  if (v < 2800) return 0xEAB308; // MODERATO: giallo
  if (v < 3500) return 0xF97316; // SCARSO: arancione
  return 0xFF3355;                // PERICOLO: rosso (apri subito le finestre)
}

lv_color_t getColor(int v) {
  return lv_color_hex(getColorHex(v));
}

// Colore di base arco traccia (versione scura del colore stato, con sfondo scuro)
uint32_t getDimColorHex(int v) {
  if (v < 600)  return 0x0A2A20;
  if (v < 1200) return 0x0A2A15;
  if (v < 2000) return 0x1A2A10;
  if (v < 2800) return 0x2A2208;
  if (v < 3500) return 0x2A1808;
  return 0x2A0A10;
}

const char* getStatusText(int v) {
  if (v < 600)  return "ECCellenTE";
  if (v < 1200) return "BUONO";
  if (v < 2000) return "ACCETTabile";
  if (v < 2800) return "MODERATO";
  if (v < 3500) return "SCARSO";
  return "PERICOLO";
}

// Conversione valore ADC in percentuale pulizia (ADC più basso = più pulito = punteggio più alto)
int adcToScore(int adc) {
  adc = constrain(adc, 0, 4095);
  return constrain(100 - (adc * 100 / 4095), 0, 100);
}

// ===================== Creazione interfaccia UI =====================
void create_ui() {
  lv_obj_t *scr = lv_screen_active();

  // Primo passaggio: sfondo scuro
  lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(scr, lv_color_hex(0x050810), 0);

  // Secondo passaggio: bordo glow esterno più esterno (colore segue stato, animazione respirante)
  glow_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(glow_circle);
  lv_obj_set_size(glow_circle, 234, 234);
  lv_obj_center(glow_circle);
  lv_obj_set_style_radius(glow_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(glow_circle, LV_OPA_TRANSP, 0);
  lv_obj_set_style_border_width(glow_circle, 2, 0);
  lv_obj_set_style_border_opa(glow_circle, LV_OPA_20, 0);
  lv_obj_set_style_border_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(glow_circle, 30, 0);
  lv_obj_set_style_shadow_spread(glow_circle, 2, 0);
  lv_obj_set_style_shadow_opa(glow_circle, LV_OPA_30, 0);
  lv_obj_set_style_shadow_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_clear_flag(glow_circle, LV_OBJ_FLAG_SCROLLABLE);

  // Terzo passaggio: colore base arco traccia (mostra area scura "non ancora raggiunta")
  arc_bg = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_bg);
  lv_obj_set_size(arc_bg, 210, 210);
  lv_obj_center(arc_bg);
  lv_arc_set_range(arc_bg, 0, 100);
  lv_arc_set_bg_angles(arc_bg, 135, 45);
  lv_arc_set_value(arc_bg, 0);
  lv_obj_set_style_arc_width(arc_bg, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(0x0A2A20), LV_PART_MAIN);
  lv_obj_set_style_arc_rounded(arc_bg, true, LV_PART_MAIN);
  lv_obj_set_style_arc_width(arc_bg, 0, LV_PART_INDICATOR);
  lv_obj_set_style_arc_opa(arc_bg, LV_OPA_TRANSP, LV_PART_INDICATOR);
  lv_obj_set_style_bg_opa(arc_bg, LV_OPA_TRANSP, LV_PART_KNOB);
  lv_obj_clear_flag(arc_bg, LV_OBJ_FLAG_CLICKABLE);

  // Quarto passaggio: arco principale (valore real-time + piccolo pallino knob all'estremità)
  arc_main = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_main);
  lv_obj_set_size(arc_main, 210, 210);
  lv_obj_center(arc_main);
  lv_arc_set_range(arc_main, 0, 4095);
  lv_arc_set_bg_angles(arc_main, 135, 45);
  lv_arc_set_value(arc_main, 0);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_opa(arc_main, LV_OPA_TRANSP, LV_PART_MAIN);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_INDICATOR);
  lv_obj_set_style_arc_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_INDICATOR);
  lv_obj_set_style_arc_rounded(arc_main, true, LV_PART_INDICATOR);

  // knob = piccolo punto luminoso all'estremità, bordo bianco + interno riempito colore stato + ombra glow
  lv_obj_set_style_bg_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_bg_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_pad_all(arc_main, 5, LV_PART_KNOB);
  lv_obj_set_style_radius(arc_main, LV_RADIUS_CIRCLE, LV_PART_KNOB);
  lv_obj_set_style_border_width(arc_main, 3, LV_PART_KNOB);
  lv_obj_set_style_border_color(arc_main, lv_color_hex(0xFFFFFF), LV_PART_KNOB);
  lv_obj_set_style_border_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_shadow_width(arc_main, 18, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_shadow_opa(arc_main, LV_OPA_70, LV_PART_KNOB);
  lv_obj_set_style_shadow_spread(arc_main, 2, LV_PART_KNOB);
  lv_obj_clear_flag(arc_main, LV_OBJ_FLAG_CLICKABLE);

  // Quinto passaggio: disco centrale (contiene valore, linea trend, testo stato)
  center_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(center_circle);
  lv_obj_set_size(center_circle, 140, 140);
  lv_obj_center(center_circle);
  lv_obj_set_style_radius(center_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(center_circle, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(center_circle, lv_color_hex(0x080E1A), 0);
  lv_obj_set_style_bg_grad_color(center_circle, lv_color_hex(0x0C1628), 0);
  lv_obj_set_style_bg_grad_dir(center_circle, LV_GRAD_DIR_VER, 0);
  lv_obj_set_style_border_width(center_circle, 1, 0);
  lv_obj_set_style_border_color(center_circle, lv_color_hex(0x1A3050), 0);
  lv_obj_set_style_border_opa(center_circle, LV_OPA_60, 0);
  lv_obj_set_style_pad_all(center_circle, 0, 0);
  lv_obj_clear_flag(center_circle, LV_OBJ_FLAG_SCROLLABLE);

  // Numero grande centrale
  label_value = lv_label_create(center_circle);
  lv_label_set_text(label_value, "0");
  lv_obj_set_style_text_font(label_value, &lv_font_montserrat_28, 0);
  lv_obj_set_style_text_color(label_value, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_value, LV_ALIGN_CENTER, 0, -26);

  // Etichetta unità
  label_unit = lv_label_create(center_circle);
  lv_label_set_text(label_unit, "ADC");
  lv_obj_set_style_text_font(label_unit, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_unit, lv_color_hex(0x506878), 0);
  lv_obj_align(label_unit, LV_ALIGN_CENTER, 0, -6);

  // Container linea trend (responsabile ritaglio, evita che la linea esca dai bordi)
  trend_container = lv_obj_create(center_circle);
  lv_obj_remove_style_all(trend_container);
  lv_obj_set_size(trend_container, 110, 30);
  lv_obj_align(trend_container, LV_ALIGN_CENTER, 0, 16);
  lv_obj_set_style_bg_opa(trend_container, LV_OPA_TRANSP, 0);
  lv_obj_set_style_pad_all(trend_container, 0, 0);
  lv_obj_set_style_clip_corner(trend_container, true, 0);
  lv_obj_set_style_radius(trend_container, 4, 0);
  lv_obj_clear_flag(trend_container, LV_OBJ_FLAG_SCROLLABLE);

  // Linea base riferimento sotto la linea trend
  static lv_point_precise_t refPts[2] = {{0, 28}, {110, 28}};
  lv_obj_t *refLine = lv_line_create(trend_container);
  lv_line_set_points(refLine, refPts, 2);
  lv_obj_set_style_line_color(refLine, lv_color_hex(0x1A2535), 0);
  lv_obj_set_style_line_width(refLine, 1, 0);

  // Linea trend (inizializza tutti i punti in basso)
  for (int i = 0; i < TREND_POINTS; i++) {
    trendLinePoints[i].x = (int32_t)(i * 110 / (TREND_POINTS - 1));
    trendLinePoints[i].y = 28;
  }
  trend_line = lv_line_create(trend_container);
  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
  lv_obj_set_style_line_color(trend_line, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_line_width(trend_line, 2, 0);
  lv_obj_set_style_line_rounded(trend_line, true, 0);
  lv_obj_set_style_line_opa(trend_line, LV_OPA_70, 0);

  // Pallino stato
  dot_status = lv_obj_create(center_circle);
  lv_obj_remove_style_all(dot_status);
  lv_obj_set_size(dot_status, 8, 8);
  lv_obj_set_style_radius(dot_status, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(dot_status, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(dot_status, 8, 0);
  lv_obj_set_style_shadow_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_opa(dot_status, LV_OPA_50, 0);
  lv_obj_align(dot_status, LV_ALIGN_CENTER, -42, 42);

  // Testo stato
  label_status = lv_label_create(center_circle);
  lv_label_set_text(label_status, "ECCellenTE");
  lv_obj_set_style_text_font(label_status, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_status, LV_ALIGN_CENTER, 3, 42);

  // Titolo superiore
  label_title = lv_label_create(scr);
  lv_label_set_text(label_title, "AIR QUALITY");
  lv_obj_set_style_text_font(label_title, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_title, lv_color_hex(0x4A6070), 0);
  lv_obj_set_style_text_letter_space(label_title, 3, 0);
  lv_obj_align(label_title, LV_ALIGN_TOP_MID, 0, 60);

  // Punteggio inferiore
  label_score = lv_label_create(scr);
  lv_label_set_text(label_score, "100% PULITO");
  lv_obj_set_style_text_font(label_score, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_score, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_score, LV_ALIGN_BOTTOM_MID, 0, -8);

  // Record MIN/MAX (sopra il punteggio inferiore)
  label_minmax = lv_label_create(scr);
  lv_label_set_text(label_minmax, "L:-- H:--");
  lv_obj_set_style_text_font(label_minmax, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_minmax, lv_color_hex(0x3A4A5A), 0);
  lv_obj_align(label_minmax, LV_ALIGN_BOTTOM_MID, 0, -24);
}

// ===================== Aggiorna dati linea trend =====================
void updateTrend(int value) {
  trendData[trendIdx] = value;
  trendIdx = (trendIdx + 1) % TREND_POINTS;
  if (trendIdx == 0) trendFull = true;

  int count = trendFull ? TREND_POINTS : trendIdx;
  if (count < 2) return;

  // Trova range dati, per normalizzare ad altezza linea
  int vMin = 4095, vMax = 0;
  for (int i = 0; i < count; i++) {
    if (trendData[i] < vMin) vMin = trendData[i];
    if (trendData[i] > vMax) vMax = trendData[i];
  }
  // Garantisce oscillazione minima - altrimenti quando aria troppo stabile linea diventa piatta morta
  if (vMax - vMin < 50) vMax = vMin + 50;

  int chartW = 110;
  int chartH = 26;

  for (int i = 0; i < TREND_POINTS; i++) {
    int x = i * chartW / (TREND_POINTS - 1);
    int y;
    if (i < count) {
      int dataIdx = trendFull ? (trendIdx + i) % TREND_POINTS : i;
      int normalized = (trendData[dataIdx] - vMin) * chartH / (vMax - vMin);
      y = chartH - normalized + 1; // asse Y invertito: valore più alto = punto più in alto
    } else {
      y = chartH + 1; // posizioni senza dati prima messe in basso
    }
    trendLinePoints[i].x = x;
    trendLinePoints[i].y = y;
  }

  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
}

// ===================== Aggiorna display UI =====================
void update_ui(int value, int raw) {
  value = constrain(value, 0, 4095);
  raw   = constrain(raw, 0, 4095);

  // Animazione fluida: ogni frame avvicina al valore obiettivo del 18%, cambio numeri fluido non brusco
  float diff = (float)value - displayValue;
  displayValue += diff * 0.18f;
  int dispVal = (int)(displayValue + 0.5f);

  lv_color_t c  = getColor(dispVal);
  uint32_t dimC = getDimColorHex(dispVal);
  int score     = adcToScore(dispVal);

  // Aggiorna record min/max
  if (raw < minValue) minValue = raw;
  if (raw > maxValue) maxValue = raw;

  // Arco principale + knob colore segue stato
  lv_arc_set_value(arc_main, dispVal);
  lv_obj_set_style_arc_color(arc_main, c, LV_PART_INDICATOR);
  lv_obj_set_style_bg_color(arc_main, c, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, c, LV_PART_KNOB);

  // Colore base traccia
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(dimC), LV_PART_MAIN);

  // Cerchio glow esterno: colore segue stato + funzione sin simula trasparenza respirante
  lv_obj_set_style_border_color(glow_circle, c, 0);
  lv_obj_set_style_shadow_color(glow_circle, c, 0);
  static uint32_t breathCount = 0;
  breathCount++;
  float sinVal = sinf((breathCount * 6) % 360 * 3.14159f / 180.0f);
  lv_opa_t breathOpa = (lv_opa_t)(LV_OPA_20 + (int)(sinVal * 25.0f));
  lv_obj_set_style_shadow_opa(glow_circle, breathOpa, 0);
  lv_opa_t borderOpa = (lv_opa_t)(LV_OPA_10 + (int)(sinVal * 15.0f));
  lv_obj_set_style_border_opa(glow_circle, borderOpa, 0);

  // Valore centrale
  lv_label_set_text_fmt(label_value, "%d", dispVal);
  lv_obj_set_style_text_color(label_value, c, 0);

  // Testo stato + pallino (ombra pallino respira pure)
  lv_label_set_text(label_status, getStatusText(dispVal));
  lv_obj_set_style_text_color(label_status, c, 0);
  lv_obj_set_style_bg_color(dot_status, c, 0);
  lv_obj_set_style_shadow_color(dot_status, c, 0);
  lv_opa_t dotOpa = (lv_opa_t)(LV_OPA_30 + (int)(sinVal * 40.0f));
  lv_obj_set_style_shadow_opa(dot_status, dotOpa, 0);

  // Colore linea trend
  lv_obj_set_style_line_color(trend_line, c, 0);

  // MIN/MAX
  lv_label_set_text_fmt(label_minmax, "L:%d  H:%d", minValue, maxValue);

  // Punteggio pulizia inferiore
  const char *statusWord;
  if (score >= 80)      statusWord = "PULITO";
  else if (score >= 60) statusWord = "ACCETTabile";
  else if (score >= 40) statusWord = "NVISTO";
  else if (score >= 20) statusWord = "SPORCO";
  else                  statusWord = "TOSSICO";
  lv_label_set_text_fmt(label_score, "%d%% %s", score, statusWord);
  lv_obj_set_style_text_color(label_score, c, 0);
}

// ===================== setup =====================
void setup() {
  Serial.begin(115200);
  delay(200);

  // Primo passaggio: porta retroilluminazione alta, senza questo lo schermo rimane sempre nero
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // Secondo passaggio: configura ADC (precisione 12 bit, range 0-3,3V)
  // Nota: ADC_11db in ESP32 Core 3.x equivale a ADC_ATTEN_DB_12, compatibile con vecchia sintassi
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Terzo passaggio: avvia schermo, frequenza SPI 40MHz
  gfx.begin(40000000);

  // Quarto passaggio: inizializza LVGL
  lv_init();
  lv_tick_set_cb(my_tick_cb);

  lv_display_t *disp = lv_display_create(SCREEN_WIDTH, SCREEN_HEIGHT);
  lv_display_set_color_format(disp, LV_COLOR_FORMAT_RGB565);
  lv_display_set_buffers(disp, draw_buf, NULL, sizeof(draw_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(disp, my_disp_flush);

  // Quinto passaggio: costruisci interfaccia, inizializza a valore 0
  create_ui();
  displayValue = 0;
  update_ui(0, 0);

  Serial.println("[SYS] Indicatore v3.1 Pronto!");
}

// ===================== loop =====================
void loop() {
  static uint32_t lastSensorMs = 0;
  static uint32_t lastTrendMs  = 0;
  static uint32_t lastLogMs    = 0;

  uint32_t now = millis();

  // Ogni 50ms: leggi sensore + aggiorna UI (circa 20fps, fluido senza lag)
  if (now - lastSensorMs >= 50) {
    int raw = analogRead(MQ135_PIN);
    raw = constrain(raw, 0, 4095);

    if (firstSample) {
      // Primo frame assegna direttamente, salta transizione animazione da 0
      smoothedValue = raw;
      displayValue  = raw;
      firstSample   = false;
    } else {
      // Media ponderata esponenziale: nuovo valore 12%, vecchio valore 88%, fluida ma non lenta
      smoothedValue = smoothedValue * 0.88f + raw * 0.12f;
    }

    update_ui((int)smoothedValue, raw);
    lastSensorMs = now;
  }

  // Ogni 300ms: pusha un punto dati alla linea trend (40 punti × 300ms ≈ 12 secondi coprono una schermata di storia)
  if (now - lastTrendMs >= 300) {
    updateTrend((int)smoothedValue);
    lastTrendMs = now;
  }

  // Ogni 1s: output seriale log debug (apri monitor seriale per vedere quando hai problemi)
  if (now - lastLogMs >= 1000) {
    Serial.printf("SCORE=%d%%  ADC=%d  SMOOTH=%d  L=%d H=%d [%s]\n",
                  adcToScore((int)smoothedValue),
                  analogRead(MQ135_PIN),
                  (int)smoothedValue,
                  minValue, maxValue,
                  getStatusText((int)smoothedValue));
    lastLogMs = now;
  }

  lv_timer_handler(); // Scheduler interno LVGL, deve essere chiamato periodicamente, non dimenticare
  delay(5);
}
```

### Spiegazione del codice

Qualche scelta di design chiave, altrimenti il codice potrebbe confondere:

**① Perché usare media ponderata esponenziale invece di mostrare direttamente l'ADC grezzo?**

L'uscita analogica del MQ135 ha un certo rumore, mostrare direttamente il numero farebbe saltare continuamente i valori. La formula della media ponderata esponenziale (EMA):

```
nuovo valore medio = vecchio valore medio × 0,88 + valore grezzo × 0,12
```

Il peso 0,12 significa che i nuovi dati hanno influenza minore, il cambiamento dei valori è graduale ma segue il trend. Se vuoi una risposta più sensibile, aumenta `0,12f` (max 1,0 = nessuna smoothing); se vuoi più stabilità, aumenta `0,88f`.

**② Come si realizza l'effetto respirante?**

In `update_ui()` si usa `sinf()` per generare un valore che cicla da −1 a +1, mappato al range di trasparenza (`LV_OPA_20` ~ `LV_OPA_45`), il contatore incrementa a ogni chiamata. La trasparenza del bordo esterno e dell'ombra così sfuma ciclicamente, come se "respirasse".

**③ Perché la linea trend a volte è piatta?**

Quando l'ambiente è molto stabile e la differenza tra massimo e minimo storico è piccola, la linea viene forzata ad almeno 50 ADC di range:

```cpp
if (vMax - vMin < 50) vMax = vMin + 50;
```

Così anche se l'aria non cambia, la linea non diventa una linea piatta morta, ma si possono notare piccole oscillazioni.

---

## Risoluzione problemi comuni

Non preoccuparti, l'80% dei problemi viene da questi punti:

**Schermo tutto nero, nessuna reazione**
Prima cosa: controlla se il pin BL è collegato a GPIO 7 e se nel codice viene eseguito `digitalWrite(TFT_BL, HIGH)`. Se la retroilluminazione non è accesa, lo schermo sarà sicuramente nero - non è che lo schermo è rotto, è che la retroilluminazione non è stata alzata.

**Schermo tutto bianco o tutto rosso (c'è colore ma nessun contenuto)**
Nel 90% dei casi i pin DC e CS sono invertiti. Controlla questi due cavi confrontando con la tabella di collegamento, o scambiali direttamente per provare.

**Errore di compilazione: `lv_font_montserrat_28 undeclared`**
`lv_conf.h` non è configurato correttamente, o è nella posizione sbagliata. Torna alla sezione "Librerie da installare", segui i passaggi per cambiare le opzioni font da 0 a 1.

**Lettura ADC sempre 0 o 4095 senza cambiamenti**
Usa un multimetro per misurare la tensione di uscita del pin A0 del MQ135, normalmente dovrebbe oscillare tra 0,5V-2,5V. Se è 0V controlla il cablaggio VCC; se è a scala massima (3,3V), il sensore potrebbe non essere preriscaldato a sufficienza - nuovi sensori appena accesi hanno letture instabili, aspetta 3 minuti e riprova.

**Valore visualizzato trema molto**
Nel codice aumenta il coefficiente smoothing `0.88f` (ad esempio `0,95f`), aumenta la stabilità ma il prezzo è una risposta più lenta.

**LVGL durante compilazione dice memoria insufficiente o si blocca in runtime**
Riduci `DRAW_BUF_LINES` da 40 a meno (ad esempio 20), riduce l'occupazione del buffer. La RAM standard dell'ESP32-S3 è sufficiente, solo con schede con RAM minore si incontrerà questo problema.

---

## FAQ

**D: GPIO 13 è fisso? Posso usare un altro pin ADC?**
R: Sì puoi cambiare. Sull'ESP32-S3 i GPIO 1-10 appartengono ad ADC1, i GPIO 11-20 appartengono ad ADC2. Questo progetto non usa Wi-Fi, quindi i pin ADC2 (incluso GPIO 13) non hanno conflitti e funzionano normalmente. Se in futuro vuoi aggiungere Wi-Fi, si consiglia di spostare il sensore su un pin ADC1 (GPIO 1-10), evitando errori di lettura quando il Wi-Fi occupa ADC2.

**D: MQ135 alimentato a 3,3V, le letture sono precise o no?**
R: Non molto precise, ma sufficienti per mostrare il trend. La tensione nominale del MQ135 è 5V; con alimentazione 3,3V la potenza del filo riscaldante è circa il 44% dello standard, la sensibilità diminuisce e i valori assoluti sono più bassi. Se vuoi convertire in concentrazione ppm, si consiglia di alimentare VCC con 5V separatamente; l'uscita analogica A0 non supera 3,3V, quindi non serve un circuito partitore aggiuntivo.

**D: LVGL deve essere obbligatoriamente v9? v8 può funzionare?**
R: v8 non può eseguire direttamente questo codice. v9 ha introdotto `lv_display_t`, `lv_display_create` e altre nuove API che non esistono in v8; compilare direttamente darà molti errori. Si consiglia vivamente di installare la versione v9.2.x o successive, non downgrade.

**D: I quattro angoli dello schermo circolare hanno "buchi" neri, è saldato male?**
R: Fenomeno normale, non un problema. GC9A01 ha area di visualizzazione circolare, il buffer sottostante è quadrato 240×240, i quattro angoli sono strutture fisiche di schermatura dello schermo, non hanno pixel reali, non mostrare contenuto è corretto.

**D: Quando il sensore viene appena acceso il valore salta molto, quanto tempo aspettare perché si stabilizzi?**
R: Il MQ135 necessita preriscaldamento. Per nuovi sensori si consiglia continuità elettrica 24-48 ore prima che le letture si stabilizzino; sensori già usati si stabilizzano dopo circa 3 minuti di alimentazione. Puoi aggiungere `delay(180000)` (3 minuti) alla fine di `setup()`, oppure aggiungere uno stato "Preriscaldamento" nell'UI, iniziare采集 ufficialmente dopo il tempo.

**D: Lo refresh dello schermo è un po' lento, come velocizzare?**
R: Due direzioni: ① Aumenta la frequenza SPI in `gfx.begin(40000000)` a 80MHz (GC9A01 supporta fino a 80MHz, ma alcune schede con qualità cablaggio scarsa possono essere instabili, testare prima); ② Aumenta `DRAW_BUF_LINES` (ad esempio a 60), riduci il numero di refresh parziali LVGL, il prezzo è occupare circa 9KB RAM in più.

---

## Sviluppi successivi

Una volta funzionante, puoi continuare a espandere in queste direzioni:

- Collega BME280, aggiungi temperatura e umidità, dashboard mostra una riga di dati in più
- Invia dati ADC tramite Wi-Fi a Home Assistant, crea grafico storico a lungo termine
- Aggiungi pulsante per cambiare modalità display (indicatore / modalità numeri grandi / solo linea trend)
- Sostituisci con sensore MQ-7, specializzato nel monitoraggio concentrazione monossido di carbonio
- Aggiungi buzzer, quando qualità aria entra in zona PERICOLO attiva allarme

---

## Riferimenti

- [Manuale chip driver GC9A01 (Galaxycore ufficiale)](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Specifiche sensore MQ135 (Winsen ufficiale)](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ135%20(Ver1.4)%20-%20Manual.pdf)
- [GitHub Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Documentazione LVGL v9](https://docs.lvgl.io/9.0/)
<!-- - [Manuale tecnico ESP32-S3 (Espressif ufficiale)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf) -->
