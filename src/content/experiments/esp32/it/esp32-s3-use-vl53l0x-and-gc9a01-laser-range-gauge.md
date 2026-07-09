---
title: "ESP32-S3 con GC9A01 display circolare + VL53L0X-V2 misura della distanza laser — tutorial completo (cablaggio SPI + insidie I2C)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/vl53l0x
category: esp32
date: 2026-07-09
intro: "Usa l'ESP32-S3 per pilotare un GC9A01 da 1.28 pollici circolare, insieme al sensore VL53L0X-V2 per la misura della distanza laser, e costruisci un tachimetro cyberpunk con ago che si muove in tempo reale e un arco che cambia colore in base alla distanza. In guida: risoluzione dei conflitti di pin SPI+I2C e tutto il codice sorgente Arduino."
image: "https://img.lingflux.com/2026/07/68114f0f73885a81414b9432bd0d95eb.jpg"
---



# ESP32-S3 con GC9A01 display circolare + VL53L0X-V2 misura della distanza laser: dal cablaggio all'accensione di un tachimetro cyberpunk (codice completo)

Difficoltà: ⭐⭐⭐☆☆ (adatto a un maker con un po' di basi, serve un po' di pazienza con i cavetti)
Tempo stimato: 45 minuti
Ambiente di test: Arduino IDE 2.3.8 + ESP32 Core 3.3.10 + Arduino_GFX_Library v1.6.5 + Adafruit_VL53L0X v1.2.5

---

> **TL;DR (avvio rapido):**
>
> 1. Cablaggio schermo: GPIO12→SCL, GPIO11→SDA, GPIO9→CS, GPIO10→DC, GPIO18→RST, GPIO7→BL
> 2. Cablaggio sensore: GPIO13→SDA, GPIO14→SCL (**attenzione, non sono i pin I2C predefiniti**, perché GPIO9 è già usato dal CS dello schermo)
> 3. Installa due librerie: `Arduino_GFX_Library`, `Adafruit_VL53L0X`
> 4. Prima carica lo "sketch di test del sensore": quando la porta seriale mostra i valori di distanza, carica il programma principale
> 5. Carica il programma principale: sul display circolare apparirà un tachimetro lidar con ago rotante e colore variabile

---

## Premessa: perché sbattersi con questo tachimetro circolare

I moduli per la misura della distanza laser (ToF) sono molto usati, ma la maggior parte della gente si ferma alla fase "stampo i numeri sulla porta seriale". L'obiettivo di questo progetto è semplice: sfruttare le prestazioni dell'ESP32-S3 e l'impatto visivo del GC9A01 circolare per trasformare dati di distanza astratti in un tachimetro ad alta frequenza di aggiornamento, utile e dall'estetica cyberpunk.

La difficoltà centrale del progetto non sta nella logica, ma nel conflitto di pin tra l'interfaccia SPI dello schermo e l'interfaccia I2C del sensore. Per risolvere il problema dell'inizializzazione fallita causata dai pin predefiniti della scheda "in conflitto tra loro", ho rimappato l'hardware. Seguono la guida agli errori comuni e l'implementazione del programma principale.

## Anteprima del risultato finale

Il risultato finale è questo: sul display circolare viene disegnato un quadrante ad arco simile al contagiri di un'auto da corsa; l'ago punta in tempo reale alla distanza attualmente misurata, il colore dell'arco passa dal rosso (vicino/pericolo) al verde (lontano/sicuro) e al centro compaiono i millimetri esatti e il testo di stato (DANGER / WARNING / CAUTION / SAFE / CLEAR). Muovi la mano davanti al sensore e l'ago ondeggia in tempo reale — piuttosto rilassante.

## Descrizione dei componenti

Della scheda di sviluppo (ESP32-S3) non parliamo oltre, concentriamoci sugli altri due protagonisti.

### GC9A01 240×240 display circolare

Il GC9A01 è un chip display driver pensato apposta per gli schermi circolari: si occupa di "tradurre" i dati pixel che gli invii nell'immagine sul display — tu gli dici cosa disegnare, lui si occupa di come disegnarlo; tutto il refresh e la scansione intermedia sono gestiti da lui, tu ti limiti a chiamare le API.

| Parametro | Valore               |
| --------- | -------------------- |
| Risoluzione | 240×240            |
| Dimensioni | 1.28 pollici       |
| Interfaccia | SPI                |
| Profondità colore | 65K colori (RGB565) |
| Libreria driver | Arduino_GFX_Library |

L'abbiamo scelto perché costa poco, un display circolare è naturalmente bello per un tachimetro e l'interfaccia SPI è sufficientemente veloce da non lasciare scie durante la rotazione dell'ago.

### Sensore per la misura della distanza laser VL53L0X-V2

Il VL53L0X è un sensore per la misura della distanza laser basato sul principio del tempo di volo (ToF); in parole povere: emette un raggio laser infrarosso invisibile, cronometra il tempo che il laser impiega a colpire un oggetto e tornare indietro riflesso, e da questo risale alla distanza — è la stessa idea dell'ecolocalizzazione dei pipistrelli, solo che usa la luce invece del suono.

| Parametro | Valore                                              |
| --------- | --------------------------------------------------- |
| Range di misura | 30mm～1200mm (in modalità long range fino a circa 2000mm) |
| Precisione | ±3%                                               |
| Interfaccia di comunicazione | I2C (fino a 400kHz)                       |
| Lunghezza d'onda del laser | 940nm (invisibile a occhio nudo, laser Class 1, sicuro) |

L'abbiamo scelto perché non è influenzato dal colore o dal materiale del bersaglio (rispetto ai sensori a ultrasuoni, è quasi insensibile alla superficie), è così piccolo da entrare in qualsiasi scatola e l'interfaccia I2C richiede solo due fili segnale.

> 💡 **Piccola nota: questo modulo di solito non ha il coperchio ottico (io quando l'ho comprato me ne sono dimenticato)**
>
> Nella fase di test a nudo va tutto benissimo, ma ci sono alcune insidie da conoscere in anticipo:
>
> - **Non toccare la superficie del chip con le dita**: le due finestrelle di grandi quanto un seme di sesamo sul chip (una emette, l'altra riceve) temono polvere, unto e umidità. Quando sono sporche, la polvere riflette il laser indietro causando "crosstalk": la misura inspiegabilmente si accorcia, i numeri ballano e nei casi gravi il sensore smette di funzionare.
> - **Se si sporca, non strofinare a caso**: non pulirlo mai con l'orlo della maglia o con un fazzoletto di carta (si graffia subito). Per la polvere usa un **pompetta (palloncino soffia-aria)**, per l'unto usa un bastoncino di cotone imbevuto di un goccio di **alcol isopropilico (senza acqua)** passato con estrema delicatezza, poi lascia asciugare.
> - **Sotto luce forte "diventa cieco"**: la luce solare e le vecchie lampadine a incandescenza contengono infrarossi; a nudo, senza coperchio, la portata massima crolla sensibilmente. Sul tavolo di casa non si nota, ma se lo porti fuori sappilo.
>
> Se in futuro vuoi chiuderlo in un box per uso prolungato: **non incollare nastro adesivo trasparente o vetro normale davanti al chip** — i materiali comuni riflettono l'infrarosso, il sensore interpreterà il coperchio come un ostacolo e si bloccherà a `0mm` o a pochi centimetri. O gli fai un foro per farlo sporgere, o ti procuri un **filtro passa-infrarossi 940nm** e lo incolli il più vicino possibile (distanza inferiore a 1mm).

## BOM (lista componenti)

| Componente                     | Quantità | Note                                   |
| ------------------------------ | -------- | -------------------------------------- |
| Scheda di sviluppo ESP32-S3    | 1        | qualsiasi modello con GPIO sufficienti |
| GC9A01 display circolare 1.28" (SPI) | 1        | verifica che sia la versione SPI, non quella a bus parallelo |
| Modulo VL53L0X-V2 ToF          | 1        | versione per breadboard               |
| Cavetti jumper                 | alcuni   |                                        |

## Descrizione dei pin dei componenti

### Pin del GC9A01

| Pin       | Funzione                                                      |
| --------- | ------------------------------------------------------------- |
| VCC       | Polo positivo dell'alimentazione, collega a 3.3V              |
| GND       | Massa                                                         |
| SCL/CLK   | Linea di clock SPI                                            |
| SDA/MOSI  | Linea dati SPI                                                |
| CS        | Chip select, il chip lavora con livello basso                |
| DC        | Pin di selezione dato/comando                                 |
| RST       | Pin di reset                                                  |
| BL        | Pin di controllo retroilluminazione (su alcuni moduli non è esposto, puoi ignorarlo) |

### Pin del VL53L0X-V2

| Pin   | Funzione                                                              |
| ----- | --------------------------------------------------------------------- |
| VIN   | Polo positivo dell'alimentazione                                      |
| GND   | Massa                                                                 |
| SCL   | Ingresso clock seriale I2C                                            |
| SDA   | Dati seriali I2C                                                      |
| GPIO1 | Pin di uscita interrupt, indica che i dati sono pronti (in questo progetto non serve, lascialo scollegato) |
| XSHUT | Pin di spegnimento, tenuto alto in condizioni normali, messo basso entra in modalità shutdown (in questo progetto non serve, lascialo scollegato) |

## Modalità di cablaggio

Ti consiglio di collegare una riga alla volta secondo la tabella e spuntare ogni cavetto man mano: risparmi l'80% del tempo di debugging.

### ESP32-S3 → schermo GC9A01

| Schermo GC9A01 | ESP32-S3                                                     |
| -------------- | ------------------------------------------------------------ |
| VCC            | 3.3V                                                         |
| GND            | GND                                                          |
| SCL / CLK      | GPIO12                                                       |
| SDA / MOSI     | GPIO11                                                       |
| CS             | GPIO9                                                        |
| DC             | GPIO10                                                       |
| RST            | GPIO18                                                       |
| BL             | GPIO7 (controllato dal codice) oppure diretto a 3.3V (alcune schede non hanno un controllo retroilluminazione separato) |

### ESP32-S3 → sensore VL53L0X-V2

| VL53L0X-V2 | ESP32-S3                     |
| ---------- | ---------------------------- |
| VIN        | 3.3V                         |
| GND        | GND                          |
| SDA        | GPIO13                       |
| SCL        | GPIO14                       |
| GPIO1      | non collegato                |
| XSHUT      | non collegato (tenuto alto internamente di default) |

> ⚠️ **Attenzione**: i pin I2C predefiniti dell'ESP32-S3 sono in genere GPIO8 (SDA) / GPIO9 (SCL), ma in questo progetto GPIO9 è già occupato dal CS dello schermo, quindi l'I2C del sensore è stato spostato manualmente su GPIO13/GPIO14. Nel codice, `Wire.begin(I2C_SDA, I2C_SCL)` specifica questi due pin: in fase di cablaggio non fare il furbo tornando ai pin predefiniti, altrimenti schermo e sensore si scontreranno e nessuno dei due funzionerà.

## Librerie da installare

In Arduino IDE cerca e installa tramite il "Gestore librerie":

- `Arduino_GFX_Library` (autore moononournation) — versione testata v1.6.5
- `Adafruit_VL53L0X` (autore Adafruit) — versione testata v1.2.5; durante l'installazione ti chiederà di installare anche `Adafruit BusIO`, installalo

Versione IDE: Arduino IDE 2.3.8, il pacchetto di supporto alla scheda ESP32 usato è il 3.3.10. Versioni troppo distanti potrebbero avere API incompatibili, ti consiglio di allinearti.

## Codice completo

### Programma principale del tachimetro

```cpp
/*
 * ═══════════════════════════════════════════════════════
 *  Tachimetro Cyber · Cyber Gauge Dashboard
 *  Display circolare GC9A01 (240×240) + VL53L0X-V2 misura distanza laser
 *  MCU: ESP32-S3
 *  Libreria driver: Arduino_GFX_Library v1.6.5
 * ═══════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <Arduino_GFX_Library.h>

// ───────── Definizione colori (in Arduino_GFX v1.6.5 vanno definiti a mano) ─────────
#define BLACK       0x0000
#define WHITE       0xFFFF
#define RED         0xF800
#define GREEN       0x07E0
#define BLUE        0x001F
#define CYAN        0x07FF
#define YELLOW      0xFFE0
#define ORANGE      0xFD20
#define DARKGREY    0x4208
#define LIGHTGREY   0xC618

// Colori tema cyber
#define CYBER_BG      0x0841    // Sfondo profondo
#define CYBER_PANEL   0x1082    // Colore pannello
#define CYBER_BLUE    0x06DF    // Blu fluo
#define CYBER_CYAN    0x07F5    // Ciano fluo
#define CYBER_GREEN   0x47E0    // Verde fluo
#define CYBER_RED     0xF806    // Rosso di allarme
#define CYBER_ORANGE  0xFB40    // Arancione
#define CYBER_YELLOW  0xFF80    // Giallo
#define CYBER_DIM     0x4A49    // Colore smorzato

// ───────── Definizione pin ─────────
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// Il VL53L0X usa un I2C separato, per evitare il GPIO9 già usato dal TFT_CS
#define I2C_SDA   13
#define I2C_SCL   14

// ───────── Dimensioni schermo ─────────
#define SCREEN_W  240
#define SCREEN_H  240
#define CX        120     // Coordinata X del centro
#define CY        120     // Coordinata Y del centro

// ───────── Parametri del tachimetro ─────────
#define GAUGE_R       95      // Raggio dell'arco di scala
#define GAUGE_WIDTH   10      // Spessore dell'arco
#define NEEDLE_LEN    78      // Lunghezza dell'ago
#define START_ANGLE   135     // Angolo di partenza (gradi)
#define END_ANGLE     405     // Angolo di fine (gradi)
#define MAX_DIST      800     // Distanza massima visualizzata mm
#define MIN_DIST      20      // Distanza minima mm
#define TICK_COUNT    16      // Numero di tacche

// ───────── Oggetti globali ─────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1 /* MISO */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0 /* rotation */, true /* IPS */
);

Adafruit_VL53L0X lox = Adafruit_VL53L0X();
Arduino_Canvas *canvas;   // Canvas offscreen, elimina lo sfarfallio

// ───────── Variabili di stato ─────────
float currentAngle = START_ANGLE;
float targetAngle  = START_ANGLE;
int   currentDist  = 0;
int   lastDist     = -1;

// ═══════════════════════════════════════
//  Funzioni di utilità
// ═══════════════════════════════════════

// Miscelazione di due colori RGB565
uint16_t blendColor(uint16_t c1, uint16_t c2, float t) {
  uint8_t r1 = (c1 >> 11) & 0x1F, g1 = (c1 >> 5) & 0x3F, b1 = c1 & 0x1F;
  uint8_t r2 = (c2 >> 11) & 0x1F, g2 = (c2 >> 5) & 0x3F, b2 = c2 & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// Colore in base alla distanza (vicino=rosso, lontano=verde)
uint16_t getDistColor(int dist) {
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  if (ratio < 0.15)  return CYBER_RED;
  if (ratio < 0.30)  return blendColor(CYBER_RED, CYBER_ORANGE, (ratio - 0.15) / 0.15);
  if (ratio < 0.50)  return blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.30) / 0.20);
  if (ratio < 0.70)  return blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.50) / 0.20);
  return blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.70) / 0.30);
}

// Restituisce il testo di stato
const char* getStatusText(int dist) {
  if (dist < 100) return "DANGER";
  if (dist < 200) return "WARNING";
  if (dist < 400) return "CAUTION";
  if (dist < 600) return "SAFE";
  return "CLEAR";
}

// ═══════════════════════════════════════
//  Funzioni di disegno
// ═══════════════════════════════════════

// Disegna un arco spesso (simulato con segmenti corti)
void drawArc(Arduino_Canvas *c, int cx, int cy, int r,
             float startDeg, float endDeg, int thickness,
             uint16_t color) {
  float step = 1.5;  // Angolo per passo
  for (float a = startDeg; a <= endDeg; a += step) {
    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// Disegna un arco sfumato
void drawGradientArc(Arduino_Canvas *c, int cx, int cy, int r,
                     float startDeg, float endDeg, int thickness) {
  float totalAngle = endDeg - startDeg;
  float step = 1.5;

  for (float a = startDeg; a <= endDeg; a += step) {
    float ratio = (a - startDeg) / totalAngle;
    uint16_t color;

    // Rosso -> arancione -> giallo -> ciano -> verde
    if (ratio < 0.2)       color = blendColor(CYBER_RED, CYBER_ORANGE, ratio / 0.2);
    else if (ratio < 0.4)  color = blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.2) / 0.2);
    else if (ratio < 0.6)  color = blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.4) / 0.2);
    else                   color = blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.6) / 0.4);

    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// Disegna le tacche di scala
void drawTicks(Arduino_Canvas *c) {
  float totalAngle = END_ANGLE - START_ANGLE;

  for (int i = 0; i <= TICK_COUNT; i++) {
    float angle = START_ANGLE + (float)i / TICK_COUNT * totalAngle;
    float rad = angle * DEG_TO_RAD;
    float ratio = (float)i / TICK_COUNT;

    // Colore della tacca
    uint16_t color;
    if (ratio < 0.2)       color = CYBER_RED;
    else if (ratio < 0.4)  color = CYBER_ORANGE;
    else if (ratio < 0.6)  color = CYBER_YELLOW;
    else if (ratio < 0.8)  color = CYBER_CYAN;
    else                   color = CYBER_GREEN;

    // Tacca lunga/corta
    bool isMajor = (i % 4 == 0);
    int innerR  = GAUGE_R + 4;
    int outerR  = innerR + (isMajor ? 12 : 6);
    int thick   = isMajor ? 2 : 1;

    int x1 = CX + cos(rad) * innerR;
    int y1 = CY + sin(rad) * innerR;
    int x2 = CX + cos(rad) * outerR;
    int y2 = CY + sin(rad) * outerR;

    // Disegna la tacca
    for (int t = 0; t < thick; t++) {
      c->drawLine(x1 + t, y1, x2 + t, y2, color);
    }

    // Etichetta numerica sulle tacche principali
    if (isMajor) {
      int labelR = outerR + 12;
      int lx = CX + cos(rad) * labelR;
      int ly = CY + sin(rad) * labelR;
      int val = (float)i / TICK_COUNT * MAX_DIST;

      c->setTextColor(CYBER_DIM);
      c->setTextSize(1);
      c->setCursor(lx - 8, ly - 4);
      c->print(val);
    }
  }
}

// Disegna l'ago
void drawNeedle(Arduino_Canvas *c, float angleDeg, uint16_t color) {
  float rad = angleDeg * DEG_TO_RAD;

  // Punta dell'ago
  int tipX = CX + cos(rad) * NEEDLE_LEN;
  int tipY = CY + sin(rad) * NEEDLE_LEN;

  // Base dell'ago (due punti perpendicolari alla direzione dell'ago)
  float perpRad = rad + PI / 2;
  int baseW = 4;
  int bx1 = CX + cos(perpRad) * baseW;
  int by1 = CY + sin(perpRad) * baseW;
  int bx2 = CX - cos(perpRad) * baseW;
  int by2 = CY - sin(perpRad) * baseW;

  // Disegna l'ago triangolare
  c->fillTriangle(tipX, tipY, bx1, by1, bx2, by2, color);

  // Ghiera centrale decorativa
  c->fillCircle(CX, CY, 7, CYBER_PANEL);
  c->drawCircle(CX, CY, 7, color);
  c->fillCircle(CX, CY, 3, color);
}

// Disegna l'intero tachimetro
void drawDashboard(int dist) {
  canvas->fillScreen(CYBER_BG);

  // Ghiera esterna decorativa
  canvas->drawCircle(CX, CY, 118, CYBER_PANEL);

  // Arco di sfondo (binario scuro)
  drawArc(canvas, CX, CY, GAUGE_R,
          START_ANGLE, END_ANGLE, GAUGE_WIDTH, CYBER_PANEL);

  // Arco sfumato (completo)
  drawGradientArc(canvas, CX, CY, GAUGE_R,
                  START_ANGLE, END_ANGLE, GAUGE_WIDTH);

  // Tacche
  drawTicks(canvas);

  // Calcola l'angolo dell'ago
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  targetAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);

  // Interpolazione smussata
  currentAngle += (targetAngle - currentAngle) * 0.15;

  // Recupera il colore
  uint16_t needleColor = getDistColor(dist);

  // Disegna l'ago
  drawNeedle(canvas, currentAngle, WHITE);

  // ── Area numerica centrale ──
  // Valore della distanza
  canvas->setTextColor(WHITE);
  canvas->setTextSize(3);
  String distStr = String(dist);
  int textW = distStr.length() * 18;
  canvas->setCursor(CX - textW / 2, CY + 16);
  canvas->print(distStr);

  // Unità
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 6, CY + 42);
  canvas->print("mm");

  // Titolo
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 30, CY - 28);
  canvas->print("LASER RANGE");

  // Indicatore di stato
  canvas->setTextColor(needleColor);
  canvas->setTextSize(1);
  const char* status = getStatusText(dist);
  int sLen = strlen(status);
  canvas->setCursor(CX - sLen * 3, CY + 56);
  canvas->print(status);

  // Invia allo schermo
  canvas->flush();
}

// ═══════════════════════════════════════
//  setup() & loop()
// ═══════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n═══ Cyber Gauge Dashboard ═══");

  // Primo passo: accendi la retroilluminazione
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // Secondo passo: inizializza lo schermo
  gfx->begin();
  gfx->fillScreen(BLACK);
  gfx->setRotation(0);

  // Terzo passo: crea il canvas offscreen (doppio buffer anti-sfarfallio)
  canvas = new Arduino_Canvas(SCREEN_W, SCREEN_H, gfx);
  canvas->begin();

  // Schermata di avvio
  canvas->fillScreen(CYBER_BG);
  canvas->setTextColor(CYBER_BLUE);
  canvas->setTextSize(2);
  canvas->setCursor(40, 100);
  canvas->print("CYBER");
  canvas->setCursor(40, 125);
  canvas->print("GAUGE");
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(55, 160);
  canvas->print("Booting...");
  canvas->flush();

  delay(1000);

  // Quarto passo: inizializza I2C e sensore (usa pin personalizzati, non quelli predefiniti)
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("Inizializzazione VL53L0X fallita!");
    canvas->fillScreen(CYBER_BG);
    canvas->setTextColor(CYBER_RED);
    canvas->setTextSize(1);
    canvas->setCursor(50, 110);
    canvas->print("SENSOR ERROR");
    canvas->setCursor(40, 130);
    canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(100);
  }

  Serial.println("VL53L0X pronto ✓");

  // Quinto passo: avvia la modalità di misura continua
  lox.startRangeContinuous();

  Serial.println("Avvio tachimetro completato!");
}

void loop() {
  // Leggi la distanza
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();

    // Filtra i valori non validi
    if (dist > 0 && dist < 8190) {
      // Filtro di smussatura semplice, per evitare numeri ballerini
      currentDist = currentDist * 0.7 + dist * 0.3;
      currentDist = constrain(currentDist, MIN_DIST, MAX_DIST);

      // Ridisegna solo quando la distanza cambia oltre una soglia, per risparmiare prestazioni
      if (abs(currentDist - lastDist) > 2) {
        drawDashboard(currentDist);
        lastDist = currentDist;

        Serial.printf("Distanza: %d mm\n", currentDist);
      }
    }
  }

  delay(30);  // ~33 FPS
}
```

### Sketch di test del sensore (consigliato eseguirlo prima)

Prima di lanciare il programma principale, ti consiglio vivamente di caricare prima questo sketch minimale per confermare che il sensore funzioni: se qualcosa va storto, sarà più facile isolarlo senza dover pescare nel mucchio di codice di disegno.

```cpp
/*
 *  Test del sensore VL53L0X
 */

#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define I2C_SDA  13
#define I2C_SCL  14

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Test del sensore VL53L0X");

  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("❌ Sensore non trovato, controlla il cablaggio!");
    while (1);
  }

  Serial.println("✓ Sensore pronto, inizio misurazione...");
  lox.startRangeContinuous();
}

void loop() {
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();
    Serial.printf("Distanza: %d mm\n", dist);
  }
  delay(100);
}
```

### Spiegazione del codice

Ecco alcuni punti chiave che rischiano di far venire le vertigini, li isoliamo:

- **`blendColor()`**: mescola due colori RGB565 in proporzione `t`, serve per realizzare l'arco sfumato rosso→arancione→giallo→ciano→verde. Invece di saltare da un colore all'altro, appare fluido.
- **`Arduino_Canvas` (canvas offscreen)**: tutto viene prima disegnato su un canvas in memoria e infine inviato allo schermo in un colpo solo con `flush()`, invece di disegnare tratto per tratto direttamente a schermo — senza questo accorgimento, durante la rotazione dell'ago vedresti sfarfallii e strappi evidenti.
- **Filtro di smussatura `currentDist * 0.7 + dist * 0.3`**: le letture grezze del sensore hanno piccole oscillazioni; qui applichiamo un semplice filtro passa-basso del primo ordine per rendere il movimento dell'ago più fluido e non farlo sobbalzare.
- **`I2C_SDA=13, I2C_SCL=14`**: l'insidia già ribadita più volte nella sezione cablaggio, la ribadiamo ancora — non sono i pin I2C predefiniti dell'ESP32-S3, sono stati cambiati a mano perché il GPIO9 predefinito è occupato dal CS dello schermo.

## Risoluzione dei problemi comuni

Niente panico, l'80% dei problemi si risolve qui:

1. **Dopo il flash lo schermo resta nero**
   Controlla prima che `TFT_BL` (retroilluminazione) sia collegato bene o che nel codice venga eseguito `digitalWrite(TFT_BL, HIGH)`; poi verifica che il pin RST non abbia un contatto lasco: un RST allentato è la causa più comune di schermo nero sui display circolari.

2. **La porta seriale stampa "Inizializzazione VL53L0X fallita!"**
   Nel 99% dei casi è un problema di cablaggio: verifica che VIN/GND non siano invertiti, che SDA/SCL siano davvero su GPIO13/GPIO14 (e non sui GPIO8/9 predefiniti) e che i cavetti jumper non siano laschi. Puoi prima lanciare lo "sketch di test del sensore" da solo per escludere le interferenze dello schermo.

3. **Lo schermo si accende, ma ci sono disturbi/strisce/colori sbagliati**
   Probabilmente la linea di clock SPI o quella dati hanno un contatto lasco, oppure i cavetti jumper sono troppo lunghi e il segnale si degrada. Verifica che SCL/SDA corrispondano a GPIO12/GPIO11 e tieni i cavetti entro i 15 cm.

4. **L'ago salta all'impazzata e i numeri cambiano di continuo**
   Il coefficiente del filtro non basta oppure davanti al sensore ci sono oggetti riflettenti/trasparenti che creano disturbo. Puoi cambiare i pesi `currentDist * 0.7 + dist * 0.3` in `0.85/0.15`: il filtro diventa più forte (al prezzo di una risposta più lenta).

5. **Errore di compilazione: non trova `Adafruit_VL53L0X.h` o `Arduino_GFX_Library.h`**
   Significa che la libreria non è installata correttamente: cerca il nome esatto nel Gestore librerie e reinstallala, attenzione a non installare una fork di terze parti con lo stesso nome.

6. **L'angolo dell'ago o i numeri di scala non corrispondono**
   Verifica che `MAX_DIST` non sia stato ridotto senza aggiornare di conseguenza le etichette di scala: i due devono rimanere coerenti, altrimenti i numeri della scala e la posizione effettiva dell'ago risulteranno sfasati.

## FAQ

**D: Quali sono i pin I2C predefiniti dell'ESP32-S3?**
R: Di solito GPIO8 (SDA) e GPIO9 (SCL), ma in questo progetto GPIO9 è occupato dal CS dello schermo, quindi l'I2C del sensore è stato spostato su GPIO13/GPIO14.

**D: Fino a che distanza riesce a misurare il VL53L0X e con che precisione?**
R: La portata effettiva dichiarata è circa 30mm～1200mm (in modalità long range fino a 2000mm), con una precisione di circa ±3%.

**D: Il GC9A01 circolare supporta il touch?**
R: Il GC9A01 è solo un chip display driver, senza funzionalità touch; alcuni moduli sul mercato integrano un chip touch capacitivo aggiuntivo, verifica il modello specifico prima di acquistarlo se vuoi la versione touch.

**D: Il laser del VL53L0X fa male agli occhi?**
R: No, è un prodotto laser Class 1, con lunghezza d'onda 940nm invisibile a occhio nudo e potenza estremamente bassa, conforme agli standard di sicurezza per l'occhio umano: nell'uso normale non c'è nulla da temere.

**D: Lo schermo GC9A01 non si accende ma l'alimentazione è a posto, perché?**
R: La causa più comune è il contatto lasco del pin RST (reset) oppure il pin BL della retroilluminazione non tirato alto: controlla prima questi due punti.

**D: Perché nel codice si usa il canvas offscreen `Arduino_Canvas` invece di disegnare direttamente sullo schermo?**
R: Disegnare direttamente sullo schermo provoca sfarfallii e strappi evidenti durante la rotazione dell'ago e il ridisegno dell'arco; usando il canvas come doppio buffer e facendo un unico flush alla fine, l'immagine risulta pulita.

**D: Ci sono differenze tra VL53L0X-V2 e il VL53L0X normale?**
R: Il principio di misura e la piedinatura sono identici; la V2 di solito è una revisione del produttore del modulo su layout PCB e circuito di stabilizzazione della tensione. Per i dettagli, fai riferimento alla documentazione del modulo specifico che hai acquistato.

**D: L'alimentazione USB dell'ESP32-S3 basta per questo progetto?**
R: Sì, basta: il consumo complessivo di schermo e sensore è basso, una normale alimentazione USB 5V/500mA non ha problemi.

## Idee per estendere il progetto

- Collega un buzzer e fai suonare un allarme quando la distanza entra nella zona DANGER: in un attimo diventa un rudimentale sensore di parcheggio
- Salva i dati storici di distanza e disegna un grafico in tempo reale per osservare la traiettoria di un oggetto in movimento
- Aggiungi due pulsanti per cambiare l'unità di visualizzazione (mm / cm / inch)
- Stampaci un case, attaccalo con una ventosa al parabrezza e usalo davvero come sensore di retromarcia

## Riferimenti

- [Scheda tecnica ufficiale ST VL53L0X](https://www.st.com/en/imaging-and-photonics-solutions/vl53l0x.html)
- [Repository GitHub Adafruit_VL53L0X](https://github.com/adafruit/Adafruit_VL53L0X)
- [Repository GitHub Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Pagina prodotto ufficiale Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3)
