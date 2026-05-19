---
title: "ESP32-S3 guida al display circolare GC9A01: animazione cardiode in coordinate polari in 30 minuti"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-05-19
intro: "Usa ESP32-S3 per pilotare lo schermo TFT circolare GC9A01 da 1.28 pollici con un'animazione cardiode in coordinate polari. Include collegamento completo, codice con doppio buffer zero-sfarfallio e guida alla risoluzione dei problemi."
image: "https://img.lingflux.com/2026/05/a6a0b0037d4fd0650665e49e7364d65d.jpg"
---

# ESP32-S3 guida completa al display circolare GC9A01 da 1.28 pollici (SPI + Arduino IDE)

Difficoltà: ⭐⭐☆☆☆ (adatto ai principianti)
Tempo stimato: 30 minuti
Ambiente di test:
Arduino IDE 2.3.8
Arduino_GFX_Library 1.6.5
ESP32 Arduino Core 3.3.8

---

> **TL;DR**: usa ESP32-S3 per pilotare il display circolare GC9A01 da 1.28 pollici con un'animazione cardiode in coordinate polari — doppio buffer zero-sfarfallio, collegamento + codice completo + guida alla risoluzione dei problemi, tutto in 30 minuti.

---

## Introduzione

Si avvicina il "520" (in cinese suona come "ti amo"), e ti chiedi cosa regalare alla tua ragazza? Non riesci a trovare l'ispirazione.

Poi ti ricordi che al liceo, studiando le coordinate polari, c'era una curve nel libro di testo — la cardioide. Puoi creare un'animazione in coordinate polari che disegna un cuore per esprimere i tuoi sentimenti. (Il classico ragionamento da ingegnere, tutto nella sua testa... auto-soddisfazione al 100%).

Obiettivo di questo articolo: farti partire da zero e in 30 minuti usare ESP32-S3 per pilotare questo display circolare da 1.28", con un'animazione in coordinate polari — e capire il perché di ogni passo. (Sperando che dopo averlo regalato alla persona speciale, non dovrai inginocchiarti sulla tastiera! :P)

(E lei, vedendo questo cuore, probabilmente penserà: "Ma cos'è questa roba?!" — e ti manderà a comprare durian)

---

## Risultato dell'esperimento

Sullo schermo circolare verrà disegnata in tempo reale una **cardioide** rotante, con una griglia in coordinate polari e un punto di tracciamento animato, come un mini oscilloscopio che disegna curve matematiche. Nessuno sfarfallio per tutta la durata, frame rate bloccato a 16fps fluido.

![](https://img.lingflux.com/2026/05/8db744891e99902a8045e4e1242911d1.jpg)

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/fcqwhO5Vr7U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Descrizione dei componenti

### Display TFT circolare GC9A01 da 1.28 pollici

GC9A01 è il chip driver, il pannello IPS circolare è lo schermo; sono saldati insieme su un piccolo modulo. Devi solo "alimentarlo" con i dati immagine tramite il protocollo SPI, e lui si occupa di accendere ogni singolo pixel.

| Parametro | Valore |
| --- | --- |
| Risoluzione | 240 × 240 pixel |
| Profondità colore | 16-bit RGB565, 65536 colori |
| Interfaccia | SPI a 4 fili, massimo 80MHz |
| Tensione di lavoro | 3.3V (collega direttamente a ESP32-S3, nessuna conversione di livello necessaria) |
| Tipo pannello | IPS, angolo di visuale quasi 180° |
| Dimensioni modulo | circa 36mm di diametro |

Perché sceglierlo: economico (circa 5-15 yuan), ampiamente disponibile, la forma circolare è naturalmente adatta per progetti tipo cruscotti e orologi, e la risoluzione 240×240 è perfetta per la memoria di ESP32-S3.

---

## Lista componenti (BOM)

| Componente | Quantità | Note |
| --- | --- | --- |
| Scheda di sviluppo ESP32-S3 | 1 | Qualsiasi versione con pin SPI |
| Modulo display circolare GC9A01 1.28" | 1 | Verifica che il modulo abbia il pin BL |
| Cavi jumper | alcuni | Femmina-femmina o femmina-maschio, secondo il tipo di pin della scheda |

---

## Descrizione pin del componente

| Pin modulo GC9A01 | Funzione |
| --- | --- |
| VCC | Alimentazione positiva (3.3V) |
| GND | Alimentazione negativa (massa) |
| SCL / CLK | Segnale di clock SPI |
| SDA / MOSI | Ingresso dati SPI (master → slave) |
| CS | Chip select, lo schermo risponde allo SPI quando basso |
| DC | Selezione dati/comando: alto = dati, basso = comando |
| RST | Reset hardware, attivato da livello basso |
| BL | Controllo retroilluminazione, collega a livello alto per accendere lo schermo |

---

## Schema di collegamento

> Si consiglia di collegare seguendo la tabella riga per riga, spuntando ogni filo collegato. Risparmia l'80% del tempo di debugging.

| Display GC9A01 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (controllato da codice) oppure collega direttamente a 3.3V |

> **⚠️ Attenzione**: il pin BL (retroilluminazione) è facile da dimenticare. Se lo ometti, lo schermo rimarrà nero all'accensione — non è un problema di codice né lo schermo è rotto. Controlla prima questo. Alcuni moduli non hanno il pin BL esposto, il che significa che è già collegato internamente a 3.3V, quindi se il tuo modulo non ha il pin BL, puoi ignorarlo.

---

## Librerie da installare

Apri Arduino IDE → Strumenti → Gestore librerie, cerca e installa:

| Libreria | Autore | Versione testata |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | 1.6.5 |

> Non installare TFT_eSPI: con ESP32 Core 3.x, le definizioni di macro e l'inizializzazione DMA di TFT_eSPI sono in conflitto con la nuova versione ESP32, causando errori di compilazione o crash all'accensione. Arduino_GFX_Library supporta nativamente C++ moderno e canvas in memoria, ed è attualmente la scelta più comoda per progetti con display. (Data di redazione: 2026-05-18)

---

## Codice completo

```cpp
/**
 * ESP32-S3 + GC9A01 display circolare 1.28" — animazione coordinate polari
 * Doppio buffer zero-sfarfallio, bloccato a 16fps
 * Collegamento: SCL=GPIO12, SDA=GPIO11, CS=GPIO9, DC=GPIO10, RST=GPIO18, BL=GPIO7
 */

#include <Arduino_GFX_Library.h>

// ---------------------------------------------------
// Passo 1: aggiungi manualmente le macro dei colori
// La nuova versione di Arduino_GFX ha rimosso l'esportazione globale di BLACK / WHITE ecc.
// Senza questa sezione, la compilazione restituisce "BLACK was not declared in this scope"
// ---------------------------------------------------
#ifndef BLACK
#define BLACK       0x0000
#endif
#ifndef WHITE
#define WHITE       0xFFFF
#endif
#ifndef RED
#define RED         0xF800
#endif
#ifndef GREEN
#define GREEN       0x07E0
#endif
#ifndef BLUE
#define BLUE        0x001F
#endif
#ifndef YELLOW
#define YELLOW      0xFFE0
#endif
#ifndef CYAN
#define CYAN        0x07FF
#endif
#ifndef MAGENTA
#define MAGENTA     0xF81F
#endif
#ifndef GRAY
#define GRAY        0x8410
#endif
#ifndef DARKGRAY
#define DARKGRAY    0x2104
#endif

// ---------------------------------------------------
// Passo 2: definisci la combinazione di colori (sfondo blu scuro + primario arancione-rosso)
// ---------------------------------------------------
#define COLOR_BG        0x1123   // Sfondo blu scuro-nero
#define COLOR_GRID      0x19E5   // Griglia grigio-blu
#define COLOR_PRIMARY   0xE73C   // Curva arancione-rosso
#define COLOR_ACCENT    0xFDE0   // Raggio polare dorato
#define COLOR_TEXT      0xF7BE   // Testo grigio chiaro

// ---------------------------------------------------
// Passo 3: definisci i pin fisici
// ---------------------------------------------------
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---------------------------------------------------
// Passo 4: istanzia il bus SPI e il driver del display
// ---------------------------------------------------
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA, GFX_NOT_DEFINED /* MISO non necessario */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST,
    0,    /* angolo di rotazione */
    true  /* schermo IPS */
);

// ---------------------------------------------------
// Passo 5: alloca il canvas con doppio buffer (240×240×2 Byte = 115.2KB SRAM)
// Tutti i disegni vengono prima scritti in memoria, poi inviati
// allo schermo in un'unica operazione, eliminando completamente lo sfarfallio
// ---------------------------------------------------
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

// ---------------------------------------------------
// Variabili di animazione
// ---------------------------------------------------
float angle = 0.0f;
const float  a_scale    = 50.0f;  // Coefficiente di scala della cardioide (unità: pixel)
const int16_t cx        = 120;    // Centro X
const int16_t cy        = 120;    // Centro Y

unsigned long lastFrameTime = 0;
const int frameDelay = 1000 / 16; // Blocca a 16fps

// Interruttori di funzionalità (cambia a false per disabilitare un livello)
const bool showGrid     = true;
const bool showCurve    = true;
const bool showRadius   = true;
const bool showTelemetry= true;

void setup() {
    Serial.begin(115200);

    // Inizializza il driver del display
    gfx->begin();

    // Accendi la retroilluminazione (saltare questo passaggio = schermo nero)
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);

    // Inizializza il canvas con doppio buffer
    if (!canvas->begin()) {
        Serial.println("Allocazione memoria canvas fallita! Scrittura diretta sullo schermo (con sfarfallio)");
    } else {
        Serial.println("Doppio buffer avviato con successo, rendering zero-sfarfallio pronto.");
    }
}

void loop() {
    // Limitazione frame rate
    unsigned long now = millis();
    if (now - lastFrameTime < frameDelay) return;
    lastFrameTime = now;

    // Pulisci il frame
    canvas->fillScreen(COLOR_BG);

    // --- Livello 1: griglia coordinate polari ---
    if (showGrid) {
        canvas->drawCircle(cx, cy,  30, COLOR_GRID);
        canvas->drawCircle(cx, cy,  60, COLOR_GRID);
        canvas->drawCircle(cx, cy,  90, COLOR_GRID);
        canvas->drawCircle(cx, cy, 110, COLOR_GRID);
        canvas->drawFastHLine(10, cy, 220, COLOR_GRID);
        canvas->drawFastVLine(cx, 10, 220, COLOR_GRID);
    }

    // --- Livello 2: traccia completa della cardioide r = a*(1 - cos θ) ---
    if (showCurve) {
        int16_t lx = 0, ly = 0;
        for (int16_t deg = 0; deg <= 360; deg += 3) {
            float rad = deg * DEG_TO_RAD;
            float r   = a_scale * (1.0f - cos(rad));
            int16_t x = cx + (int16_t)(r * cos(rad));
            int16_t y = cy - (int16_t)(r * sin(rad)); // Asse Y dello schermo verso il basso, inverti
            if (deg > 0) canvas->drawLine(lx, ly, x, y, COLOR_PRIMARY);
            lx = x; ly = y;
        }
    }

    // --- Livello 3: punto di tracciamento corrente e raggio polare ---
    float rad_a  = angle * DEG_TO_RAD;
    float active_r = a_scale * (1.0f - cos(rad_a));
    int16_t px = cx + (int16_t)(active_r * cos(rad_a));
    int16_t py = cy - (int16_t)(active_r * sin(rad_a));

    if (showRadius) canvas->drawLine(cx, cy, px, py, COLOR_ACCENT);
    canvas->fillCircle(px, py, 5, COLOR_TEXT);

    // --- Livello 4: visualizzazione valori ---
    if (showTelemetry) {
        canvas->setTextColor(COLOR_TEXT);
        canvas->setTextSize(1);
        canvas->setCursor(50, 25);
        canvas->print("Polar Coordinates");
        canvas->setCursor(28, 185);
        canvas->print("r = a * (1 - cos(theta))");
        canvas->setCursor(40, 200);
        canvas->print("th:"); canvas->print((int)angle);
        canvas->print("  r:"); canvas->print((int)active_r);
        canvas->print("px");
    }

    // Incremento angolo (ogni frame +6°, un giro completo in circa 1 secondo)
    angle += 6.0f;
    if (angle >= 360.0f) angle -= 360.0f;

    // Invia il canvas in memoria allo schermo fisico in un'unica operazione
    canvas->flush();
}
```

### Spiegazione del codice

**Meccanismo a doppio buffer**: tutte le operazioni di disegno avvengono sul `canvas` (in memoria), e solo l'ultima riga `canvas->flush()` invia effettivamente il frame completo allo schermo. Invece di cancellare la lavagna per poi riscrivere, è come scrivere su un foglio di brutta e poi incollarlo tutto intero — lo schermo non vede mai uno stato "a metà", lo sfarfallio è zero.

**Equazione della cardioide** `r = a * (1 - cos θ)`: questa è un'equazione in coordinate polari, dove `r` è la distanza dal centro e `θ` è l'angolo. Convertendo ogni valore di θ nell'equazione nelle coordinate XY dello schermo e collegando i punti, si ottiene la curva a forma di cuore.

**Blocco frame rate**: `frameDelay = 1000 / 16` controlla l'intervallo minimo tra i frame a circa 62ms. Per accelerare l'animazione, aumenta il valore di incremento `+= 6.0f`; per maggiore fluidità, puoi portare targetFPS a 30, ma occupa più CPU.

**Partizione di flash**: Arduino IDE → Strumenti → Partition Scheme, seleziona **Huge APP (3MB No OTA)**. Il canvas da 115KB richiede sufficiente SRAM; la partizione predefinita può occasionalmente causare spazio heap insufficiente.

---

## Risoluzione dei problemi più comuni

Non panico, il 90% dei problemi deriva da questi punti:

**Schermo nero all'accensione, nessun errore sulla porta seriale**
Controlla prima il pin BL — la retroilluminazione non accesa è la causa più comune. Verifica che GPIO7 abbia eseguito `digitalWrite(TFT_BL, HIGH)`, oppure collega direttamente BL a 3.3V per escludere problemi di codice.

**Schermo acceso ma tutto bianco/rosso/effetto neve**
L'ordine dei collegamenti SPI è errato. CS e DC si confondono facilmente (entrambi sono linee di controllo, sembrano uguali). Verifica con le definizioni macro nel codice (CS=GPIO9, DC=GPIO10), non affidarti solo alla tabella dei collegamenti — il codice è il riferimento.

**Errore di compilazione: `BLACK was not declared in this scope`**
Stai usando Arduino_GFX versione >= 1.3, che ha rimosso l'esportazione globale delle macro dei colori. La sezione `#ifndef BLACK` in cima al codice deve essere mantenuta, non può essere rimossa.

**Allocazione memoria canvas fallita, la porta seriale indica scrittura diretta**
Significa che la SRAM disponibile è inferiore a 115KB. Controlla: ① la partizione è Huge APP; ② non ci sono grandi array altrove che occupano memoria; ③ in rari casi il PSRAM della scheda non è abilitato (attivalo nelle impostazioni della Board).

**Animazione scattosa, non sembra 16fps**
Hai aggiunto `delay()` nel `loop()`? Se sì, rimuovilo. La limitazione del frame rate usa già `millis()`, la combinazione dei due raddoppia l'intervallo tra i frame.

---

## FAQ

**D: Posso cambiare i pin CS e DC con altri GPIO?**
R: Sì, modifica `#define TFT_CS` e `#define TFT_DC` in cima al codice, qualsiasi GPIO libero va bene. Per SCL e SDA si consiglia di usare i pin SPI hardware (ESP32-S3 SPI2 predefinito: SCLK=12, MOSI=11) per ottenere la massima velocità; con altri pin si passa a SPI software, con calo di velocità evidente.

**D: Quali frame rate supporta lo schermo?**
R: L'interfaccia SPI di GC9A01 ha una frequenza di clock massima teorica di 80MHz, corrispondente a un limite di circa 40fps per lo schermo completo 240×240. Questo codice blocca a 16fps per lasciare margine CPU sui moduli ESP32-S3 di fascia bassa. Se la tua scheda funziona a 240MHz, puoi cambiare `targetFPS` a 30-40 senza problemi.

**D: Posso pilotare due schermi contemporaneamente?**
R: Sì, due schermi condividono SCL/SDA, assegna a ciascuno un pin CS indipendente, istanzia due oggetti `Arduino_GC9A01` separati e alterna il CS per attivare lo schermo desiderato. Nota la memoria: due Canvas richiedono 230KB di SRAM, devi abilitare PSRAM.

**D: Alimentazione a 3.3V o 5V?**
R: Il modulo GC9A01 funziona a 3.3V, collega direttamente al pin 3.3V di ESP32-S3. Non collegare mai a 5V, danneggeresti il chip driver.

**D: Come visualizzare caratteri cinesi?**
R: Arduino_GFX_Library include solo font ASCII per impostazione predefinita. Per visualizzare caratteri cinesi servono file di font aggiuntivi (es. font U8g2) oppure usare il framework LVGL. I font aumentano significativamente l'occupazione di Flash; si consiglia l'approccio LVGL + SPIFFS. Se c'è tempo, ne faremo un articolo dedicato.

**D: Lo schermo GC9A01 non ha capacità di output audio, solo display. Qual è la relazione con i progetti audio I2S?**
R: Nessuna relazione. GC9A01 è puramente un display, l'interfaccia SPI trasmette solo dati immagine. Se vuoi riprodurre audio contemporaneamente, serve un modulo DAC I2S aggiuntivo (es. MAX98357A); i due sistemi funzionano in modo completamente indipendente, senza interferenza tra i pin.

---

## Idee per estensioni

- Trasformalo in un **orologio analogico**: disegna tacche e lancette, con un modulo RTC DS3231 per leggere l'ora in tempo reale
- Aggiungi una **modalità rosa**: imposta `showTangent` a false, cambia la curva in `r = a * sin(k * θ)`, con diversi valori di k il numero di petali cambia
- Aggiungi **pulsanti per cambiare** tema animazione: tre pulsanti per alternare cardioide / curva rosa / figure di Lissajous
- Integra con **Wi-Fi ESP32**: recupera dati da un'API meteo e mostra temperatura e umidità sul display circolare tipo cruscotto
- Compra **due schermi circolari**: uno per ogni occhio, per creare un effetto stereo

---

## Riferimenti

- [Datasheet chip driver GC9A01 (Galaxycore ufficiale)](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Pagina GitHub Arduino_GFX_Library (moononournation)](https://github.com/moononournation/Arduino_GFX)
- [Pagina prodotto Espressif ESP32-S3](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
- [Note di rilascio ESP32 Arduino Core 3.x](https://github.com/espressif/arduino-esp32/releases)
