---
title: "ESP32-S3 + MAX98357A: Costruisci un simulatore di suono del motore V8 — tutorial completo (audio digitale I2S + encoder rotativo KY-040 per controllare l'acceleratore)"
boardId: esp32s3
moduleId: audio/max98357a
moduleIds:
  - audio/max98357a
  - sensor/ky-040
category: esp32
date: 2026-07-14
intro: "Usa l'ESP32-S3 per pilotare il modulo amplificatore MAX98357A, insieme all'encoder rotativo KY-040, e sintetizza in tempo reale e puramente via codice il suono di un motore V8: l'acceleratore è controllato manualmente dall'encoder e il suono esce in tempo reale dall'altoparlante. Include collegamenti completi, codice e note di troubleshooting."
image: "https://img.lingflux.com/2026/07/6c72c55fa63614eb8c2086c24d993d5f.jpg"
---

> **TL;DR (per iniziare in fretta):**
>
> 1. Collegamenti: BCLK del MAX98357A → GPIO16, LRC → GPIO17, DIN → GPIO15; CLK del KY-040 → GPIO5, DT → GPIO6, SW → GPIO7
> 2. Come scheda seleziona **ESP32S3 Dev Module**, come PSRAM seleziona **QSPI PSRAM** (sbagli e vai in OOM, non chiedermi come lo so)
> 3. Ruotare l'encoder in senso orario = ridurre l'acceleratore, in senso antiorario = aumentare l'acceleratore, pressione = ritorno al minimo
> 4. Flasha, alimenta, goditi il tuo "veicolo elettrico V8"

---

Difficoltà: ⭐⭐⭐☆☆ (richiede di saper fare i collegamenti di base su Arduino e il flashing)
Tempo previsto: 45 minuti
Ambiente di test: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + ESP32-S3-WROOM-1-N16R8 (16MB Flash + 8MB PSRAM)

---

## Premessa

Chi ha mai guidato una bicicletta elettrica conosce quell'imbarazzo: ti avvicini silenziosamente ai pedoni da dietro, loro si spaventano a morte, si girano e ti lanciano un'occhiata del tipo "perché non fai rumore?" — e tu puoi solo rispondere con un sorriso imbarazzato, perché la tua bici davvero... non fa rumore.

I veicoli elettrici fanno risparmiare carburante e sono ecologici, ma c'è una cosa che fa impazzire: sono troppo silenziosi. Così silenziosi da sembrare un fantasma che scivola lungo la strada.

Così ho cominciato a chiedermi: se non possiamo contare sul suono naturale del motore, possiamo **crearne uno** da soli? Non il "bip-bip" di un clacson economico, ma... il rombo di un motore V8? Profondo, potente, che tuona quando schiacci l'acceleratore.

L'obiettivo di questo articolo è: usare **ESP32-S3 + modulo amplificatore MAX98357A + encoder rotativo KY-040** per sintetizzare puramente via codice il rombo di un motore V8, con l'acceleratore controllato manualmente dall'encoder e il suono riprodotto in tempo reale dall'altoparlante. Niente campionamenti, niente file audio da riprodurre: tutto è generato in tempo reale tramite calcoli matematici.



---

## Effetto dell'esperimento

Ruotando l'encoder KY-040 si aumenta l'acceleratore: l'altoparlante passa gradualmente dal rombo profondo del minimo al frastuono del motore ad alti regimi; premendo il pulsante dell'encoder, l'acceleratore torna immediatamente a zero, ripristinando il regime di minimo. L'intera transizione del suono è fluida, senza salti bruschi, e il risultato suona piuttosto convincente.


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30IWSgfp3IY?si=XXwD3KaDonejM5WD" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## Descrizione dei componenti

> La scheda di sviluppo (ESP32-S3) non viene descritta, ci concentriamo sugli altri due protagonisti.

### MAX98357A — Il traduttore di segnali digitali

Immagina di avere una registrazione digitale (una sequenza di 0 e 1), ma l'altoparlante capisce solo segnali analogici (variazioni di tensione). Il MAX98357A è l'**interprete simultaneo** tra i due: riceve l'audio digitale inviato dall'ESP32-S3 tramite il protocollo I2S, lo converte in tempo reale in corrente analogica capace di pilotare l'altoparlante, e integra un amplificatore da 3W, senza bisogno di circuiti di amplificazione aggiuntivi.

| Parametro | Valore |
|-----------|--------|
| Tensione di alimentazione | 2.5V ~ 5.5V |
| Potenza di uscita | 3.2W (carico 4Ω, alimentazione 5V) |
| Frequenze di campionamento supportate | 8kHz ~ 96kHz |
| Protocollo di comunicazione | I2S |
| Guadagno selezionabile | 3dB / 6dB / 9dB / 12dB / 15dB |
| Controllo del mute | Il pin SD portato basso silenzia l'uscita |

I motivi per sceglierlo sono semplici: **connessione I2S diretta, senza filtro, package modularizzato, 3W sufficienti per l'uso in bici**, e su Taobao lo trovi per meno di dieci yuan.

### Descrizione dei pin

| Etichetta pin | Funzione |
|---------------|----------|
| VIN | Polo positivo dell'alimentazione, collegato a 5V |
| GND | Massa dell'alimentazione |
| BCLK | Clock di bit I2S |
| LRC | Clock di parola I2S (selezione canale sinistro/destro) |
| DIN | Ingresso dati audio digitali I2S |
| SD | Controllo del mute, flottante o a livello alto = funzionamento normale, basso = mute |
| GAIN | Selezione del guadagno, flottante = 9dB di default |

> **Nota**: il pin SD, sia lasciato non collegato sia collegato a 3.3V, riproduce comunque l'audio; se i collegamenti sono corretti ma non senti suono, controlla prima che il pin SD non sia stato inavvertitamente portato basso.

---

### KY-040 — Il "pomello del volume" a rotazione infinita

Un normale potenziometro si blocca quando raggiunge il limite, invece il KY-040 è un encoder a rotazione infinita a 360°: non fornisce la posizione assoluta, ma ti dice "in che direzione e di quanti scatti hai girato". In questo progetto lo uso per controllare l'acceleratore: **senso orario = ridurre l'acceleratore, senso antiorario = aumentare l'acceleratore, pressione del pulsante = ritorno al minimo**, con una sensazione tattile simile a quella di girare un vero pomello dell'acceleratore.

| Parametro | Valore |
|-----------|--------|
| Tensione di funzionamento | 3.3V ~ 5V |
| Passi per giro | 20 passi |
| Segnali di uscita | Fase A (CLK) / Fase B (DT) / Pulsante (SW) |
| Tipo di interfaccia | GPIO digitale (con pull-up interno) |

Motivo della scelta: **economico, comune, con pulsante incluso**, a interruzione non impegna la CPU, e con l'architettura di task FreeRTOS non dà alcun problema.

### Descrizione dei pin

| Etichetta pin | Funzione |
|---------------|----------|
| CLK (Fase A) | Uscita fase A dell'encoder rotativo, collegata al pin di interrupt |
| DT (Fase B) | Uscita fase B dell'encoder rotativo, per determinare la direzione di rotazione |
| SW | Uscita pulsante, livello basso quando premuto |
| + | Polo positivo dell'alimentazione, collegato a 3.3V |
| GND | Massa dell'alimentazione |

---

## Lista componenti (BOM)

| Componente | Modello/specifica | Quantità | Note |
|------------|-------------------|----------|------|
| Scheda di sviluppo | ESP32-S3-WROOM-1-N16R8 | 1 | 16MB Flash + 8MB PSRAM, la PSRAM è obbligatoria |
| Modulo amplificatore I2S | MAX98357A | 1 | Include basetta del modulo, la versione senza saldature è più comoda |
| Modulo encoder rotativo | KY-040 | 1 | Con pulsante |
| Altoparlante piccolo | 4Ω 3W | 1 | Oppure 8Ω, il volume sarà leggermente più basso |
| Cavetti jumper | Maschio-maschio / maschio-femmina | diversi | Per i collegamenti |
| Breadboard | qualsiasi | 1 | Facoltativa, fissa i collegamenti più comodamente |

---

## Modalità di collegamento

### MAX98357A ↔ ESP32-S3

| MAX98357A | ESP32-S3 |
|-----------|----------|
| VIN | 5V |
| GND | GND |
| BCLK | GPIO16 |
| LRC | GPIO17 |
| DIN | GPIO15 |

### KY-040 ↔ ESP32-S3

| KY-040 | ESP32-S3 |
|--------|----------|
| CLK | GPIO5 |
| DT | GPIO6 |
| SW | GPIO7 |
| + | 3.3V |
| GND | GND |

> Ti consiglio di spuntare ogni filo sulla tabella man mano che lo colleghi: questa abitudine ti fa risparmiare l'80% del tempo di debugging. Soprattutto il GND: avere tutti i moduli con massa comune è il prerequisito per un audio corretto — quando tutti parlano la stessa lingua, il segnale passa in modo preciso.

---

## Librerie da installare

Questo progetto **non dipende da alcuna libreria audio di terze parti**: l'audio è interamente sintetizzato in tempo reale dal codice, e si usa solo il `driver/i2s.h` incluso nell'ESP32 Arduino Core.

Ti basta verificare il seguente ambiente in Arduino IDE:

| Voce | Requisito |
|------|-----------|
| Arduino IDE | 2.3.8 (test superato) |
| ESP32 Arduino Core | 3.3.10 (cerca `esp32` nel Board Manager e installa) |
| Opzione scheda | ESP32S3 Dev Module |
| **Opzione PSRAM** | **QSPI PSRAM** (se sbagli questa vai direttamente in OOM, vedi le note di troubleshooting) |
| Flash Size | 16MB |
| Upload Speed | 921600 |

Nel menu **Strumenti (Tools)** di Arduino IDE controlla ogni voce, in particolare la riga della PSRAM.

---

## Codice completo + spiegazione

```cpp
/*
 * ESP32-S3 + MAX98357A + encoder rotativo KY-040
 * Simulatore del suono di un motore V8
 *
 * Collegamenti:
 *   MAX98357A    ESP32-S3
 *   VIN       -> 5V
 *   GND       -> GND
 *   BCLK      -> GPIO16
 *   LRC       -> GPIO17
 *   DIN       -> GPIO15
 *
 *   KY-040       ESP32-S3
 *   CLK       -> GPIO5
 *   DT        -> GPIO6
 *   SW        -> GPIO7  (pressione azzera l'acceleratore)
 *   +         -> 3.3V
 *   GND       -> GND
 *
 * Istruzioni d'uso:
 *   Rotazione in senso orario = riduce l'acceleratore
 *   Rotazione in senso antiorario = aumenta l'acceleratore
 *   Pressione dell'encoder = azzera l'acceleratore (ritorno al minimo)
 *
 * Baud rate seriale: 115200
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// -----------------------------------------------
// Se riscontri riavvi per Brownout, imposta qui a 1 per test temporanei
// Per l'uso finale mantieni 0: non è consigliabile disabilitare a lungo
// la protezione di sottotensione
// -----------------------------------------------
#define DISABLE_BROWNOUT_FOR_TEST 0

#if DISABLE_BROWNOUT_FOR_TEST
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

// ================= Passo 1: definizione pin I2S =================
#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

// ================= Passo 2: definizione pin KY-040 =================
#define ENCODER_CLK_PIN   5
#define ENCODER_DT_PIN    6
#define ENCODER_SW_PIN    7

// ================= Parametri acceleratore da encoder =================
// Variazione di acceleratore per ogni scatto (range 0.0~1.0)
// Riduci questo valore = servono più scatti per arrivare all'acceleratore massimo, sensazione più fine
#define ENCODER_STEP_SIZE     0.1f

// Coefficiente di smoothing dell'acceleratore (più alto = risposta più veloce, più basso = transizione più fluida)
#define ENCODER_SMOOTHING     1.2f

// Tempo di debounce dell'encoder (microsecondi), evita che una rotazione venga letta più volte
#define ENCODER_DEBOUNCE_US   200

// Tempo di debounce del pulsante (millisecondi)
#define BUTTON_DEBOUNCE_MS    200

// ================= Parametri base audio =================
#define SAMPLE_RATE     22050   // Frequenza di campionamento, in Hz
#define DMA_BUF_COUNT   8       // Numero di buffer DMA
#define DMA_BUF_LEN     256     // Numero di campioni per ogni buffer DMA

// ================= Parametri regime motore =================
#define RPM_IDLE        800.0f    // Regime di minimo (RPM)
#define RPM_MAX         8000.0f   // Regime massimo (RPM)
#define RPM_SMOOTHING   0.006f    // Coefficiente di smoothing del regime, più basso = più simile a un motore reale
#define NUM_CYLINDERS   8         // V8 = 8 cilindri

// ================= Ritmo dei colpi di scarico =================
// Al minimo 2 colpi al secondo, al massimo 7.6 colpi al secondo
#define THUMP_HZ_IDLE   2.0f
#define THUMP_HZ_MAX    7.6f

// ================= Parametri di volume =================
#define MASTER_VOLUME       1.00f
#define PCM_OUTPUT_SCALE    26000.0f   // Coefficiente di scala finale verso PCM a 16 bit

// Volume del suono motore di fondo (minimo / massimo)
#define BACKGROUND_GAIN_IDLE  0.45f
#define BACKGROUND_GAIN_MAX   0.60f

// Volume del livello principale di colpi (minimo / massimo)
#define THUMP_LAYER_GAIN_IDLE 0.75f
#define THUMP_LAYER_GAIN_MAX  1.05f

// ================= Parametri del colpo tipo scarico dritto racing =================
// I seguenti parametri controllano la forma d'onda di ogni colpo di scarico, regolali con cautela
#define THUMP_ATTACK_MS       5.0f    // Tempo di attacco (ms)
#define THUMP_BODY_MS         38.0f   // Durata del corpo (ms)
#define THUMP_TAIL_MS         62.0f   // Tempo di decadimento della coda (ms)

#define THUMP_F_START         105.0f  // Frequenza iniziale del colpo (Hz)
#define THUMP_F_BODY          82.0f   // Frequenza del corpo (Hz)
#define THUMP_F_END           64.0f   // Frequenza della coda (Hz)

#define THUMP_NOISE_MIX       0.22f   // Proporzione di rumore miscelato (simula il flusso di scarico)
#define THUMP_TONE2_MIX       0.30f   // Proporzione di seconda armonica
#define THUMP_TONE3_MIX       0.16f   // Proporzione di terza armonica
#define THUMP_SUB_MIX         0.08f   // Proporzione sub-bassa (accentua la sensazione grave)

#define THUMP_DRIVE           2.10f   // Saturazione della forma d'onda (intensità del soft-clip tanh)
#define THUMP_BURST_MIX       0.28f   // Proporzione di rumore di flusso nella fase di burst

#define THUMP_REBOUND_DELAY_MS 30.0f  // Ritardo del rimbalzo di scarico (ms), simula la risonanza del tubo
#define THUMP_REBOUND_GAIN     0.18f  // Guadagno del rimbalzo

#define THUMP_ALT_GAIN         0.94f  // Differenza di guadagno tra cilindri alternati, simula accensione non uniforme
#define THUMP_SWING            0.06f  // Swing del ritmo, aumenta il groove

#define THUMP_TABLE_GAIN       2.50f  // Guadagno complessivo della tabella della forma d'onda del colpo

// ================= Definizione delle tabelle di lookup =================
#define SINE_TABLE_SIZE 2048     // Dimensione della tabella del seno (più grande = più precisione, più memoria)
#define THUMP_TABLE_MAX 8000     // Numero massimo di campioni nella tabella del colpo

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

// Buffer di uscita stereo (DMA_BUF_LEN campioni per ciascun canale, L e R)
static int16_t stereoBuffer[DMA_BUF_LEN * 2];

// ================= Variabili di stato globali =================
volatile float throttleValue  = 0.0f;   // Valore di acceleratore attuale, filtrato (0.0~1.0)
volatile float targetThrottle = 0.0f;   // Acceleratore obiettivo impostato dall'encoder
volatile float targetRPM      = RPM_IDLE;
volatile float currentRPM     = RPM_IDLE;
volatile float currentThumpHz = THUMP_HZ_IDLE;

uint32_t noiseSeed = 123456789;

// Tabella degli sfasamenti dei cilindri del V8 (simula accensione a intervalli di 90°)
float cylinderPhase[NUM_CYLINDERS];

const float firingAngles[NUM_CYLINDERS] = {
  0.0f, 90.0f, 150.0f, 210.0f,
  270.0f, 330.0f, 390.0f, 450.0f
};

// ================= Variabili relative all'interrupt dell'encoder =================
volatile int encoderPosition = 0;
volatile unsigned long lastEncoderInterruptUs = 0;
volatile bool encoderButtonPressed = false;
volatile unsigned long lastButtonPressMs = 0;

// ================= Funzioni di utilità =================

// Limita un valore a un range
static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// Funzione a gradino smussato, rende la transizione più fluida (curva a S)
static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

// Calcola rapidamente il seno tramite tabella di lookup, molto più veloce di sinf(): indispensabile per l'audio in tempo reale
float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;

  // Interpolazione lineare per maggiore precisione
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

// Generatore di rumore pseudocasuale (metodo di congruenza lineare, veloce, usato per simulare il flusso d'aria)
float pseudoRandom() {
  noiseSeed = noiseSeed * 1664525UL + 1013904223UL;
  return ((float)(noiseSeed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// Pseudocasuale con seed indipendente (usato nella generazione della forma d'onda del colpo, per avere suono coerente ogni volta)
float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= Interrupt dell'encoder: determina la direzione di rotazione =================
void IRAM_ATTR encoderISR() {
  unsigned long nowUs = micros();

  // Debounce: se due interrupt sono troppo ravvicinati li ignora, per evitare doppi trigger dovuti a rimbalzi meccanici
  if (nowUs - lastEncoderInterruptUs < ENCODER_DEBOUNCE_US) return;
  lastEncoderInterruptUs = nowUs;

  // Si attiva sul fronte di discesa di CLK; in quel momento si legge il livello del pin DT per capire la direzione
  // DT = LOW  -> senso orario -> riduce l'acceleratore
  // DT = HIGH -> senso antiorario -> aumenta l'acceleratore
  int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState == LOW) {
    encoderPosition--;  // Senso orario: riduce l'acceleratore
  } else {
    encoderPosition++;  // Senso antiorario: aumenta l'acceleratore
  }
}

// ================= Interrupt del pulsante: alla pressione azzera l'acceleratore =================
void IRAM_ATTR buttonISR() {
  unsigned long nowMs = millis();
  if (nowMs - lastButtonPressMs < BUTTON_DEBOUNCE_MS) return;
  lastButtonPressMs = nowMs;
  encoderButtonPressed = true;
}

// ================= Inizializza i pin e gli interrupt dell'encoder =================
void initEncoder() {
  pinMode(ENCODER_CLK_PIN, INPUT_PULLUP);
  pinMode(ENCODER_DT_PIN,  INPUT_PULLUP);
  pinMode(ENCODER_SW_PIN,  INPUT_PULLUP);

  // Il fronte di discesa di CLK attiva il rilevamento della rotazione
  attachInterrupt(digitalPinToInterrupt(ENCODER_CLK_PIN), encoderISR, FALLING);
  // Il fronte di discesa di SW attiva il rilevamento del pulsante (livello basso quando premuto)
  attachInterrupt(digitalPinToInterrupt(ENCODER_SW_PIN),  buttonISR, FALLING);

  Serial.println("Inizializzazione encoder KY-040 completata");
}

// ================= Passo 3: precalcola la tabella di lookup del seno =================
// Calcola in anticipo 2048 valori di sin e li salva in memoria; in riproduzione si fa solo lookup, risparmiando CPU
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

// ================= Inizializza gli sfasamenti degli 8 cilindri =================
void initCylinderPhases() {
  for (int i = 0; i < NUM_CYLINDERS; i++) {
    // Converte l'angolo in fase 0.0~1.0 (720° corrisponde a un ciclo di combustione completo)
    cylinderPhase[i] = firingAngles[i] / 720.0f;
  }
}

// ================= Genera la forma d'onda dell'impulso di scarico di un singolo cilindro =================
// phase è la fase attuale 0.0~1.0; restituisce l'ampiezza in quell'istante
float generateCylinderPulse(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float pulse = 0.0f;

  if (phase < 0.30f) {
    // Primi 30%: rapida salita, simula l'urto di apertura della valvola di scarico
    float t = phase / 0.30f;
    pulse = sinf(M_PI * t) * expf(-2.2f * t) * 1.35f;
  } else if (phase < 0.50f) {
    // 30%~50%: lieve rimbalzo, simula la contropressione del tubo
    float t = (phase - 0.30f) / 0.20f;
    pulse = -0.25f * sinf(M_PI * 2.0f * t) * expf(-5.0f * t);
  }
  // Ultimi 50%: silenzio, in attesa dello scarico successivo

  return pulse;
}

// ================= Passo 4: precalcola la tabella della forma d'onda del colpo =================
// Precalcola un intero "colpo" e lo salva in un array; in riproduzione basta leggerlo, risparmiando CPU
void buildStraightPipeThumpTable() {
  int attackS  = (int)(THUMP_ATTACK_MS  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(THUMP_BODY_MS    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(THUMP_TAIL_MS    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(THUMP_REBOUND_DELAY_MS * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen  = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;  // Aggiunge la coda del rimbalzo

  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1   = 0.0f;  // Fase della frequenza fondamentale
  float phase2   = 0.0f;  // Fase della seconda armonica
  float phase3   = 0.0f;  // Fase della terza armonica
  float phaseSub = 0.0f;  // Fase sub-bassa

  float noiseLP1 = 0.0f;  // Stato del filtro passa-basso 1
  float noiseLP2 = 0.0f;  // Stato del filtro passa-basso 2
  uint32_t seed  = 24681357;

  for (int i = 0; i < totalLen; i++) {

    // --- Calcola l'inviluppo principale (attacco -> corpo -> decadimento) ---
    float env1 = 0.0f;

    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;  // Quadrato per rendere l'attacco più deciso
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    // --- Calcola l'inviluppo del rimbalzo (una piccola eco ritardata) ---
    int j = i - reboundS;
    float env2 = 0.0f;

    if (j >= 0) {
      if (j < attackS) {
        float x = (float)j / (float)attackS;
        env2 = smoothstep01(x);
        env2 = env2 * env2;
      } else if (j < attackS + bodyS) {
        float x = (float)(j - attackS) / (float)bodyS;
        env2 = 1.0f - 0.28f * x;
      } else if (j < mainLen) {
        float x = (float)(j - attackS - bodyS) / (float)tailS;
        env2 = 0.72f * expf(-3.8f * x);
      }
      env2 *= THUMP_REBOUND_GAIN;  // Il rimbalzo è molto più basso del corpo
    }

    float env = clampf(env1 + env2, 0.0f, 1.5f);

    // --- La frequenza scende nel tempo (simula l'abbassamento del tono dopo il rilascio della pressione di scarico) ---
    float freq = THUMP_F_END;
    if (i < attackS) {
      freq = THUMP_F_START;
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      freq = THUMP_F_START + (THUMP_F_BODY - THUMP_F_START) * x;
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      freq = THUMP_F_BODY + (THUMP_F_END - THUMP_F_BODY) * x;
    }

    float inc1 = freq / (float)SAMPLE_RATE;

    phase1   += inc1;       if (phase1   >= 1.0f) phase1   -= 1.0f;
    phase2   += inc1 * 2.0f; if (phase2  >= 1.0f) phase2   -= 1.0f;
    phase3   += inc1 * 3.0f; if (phase3  >= 1.0f) phase3   -= 1.0f;
    phaseSub += inc1 * 0.5f; if (phaseSub >= 1.0f) phaseSub -= 1.0f;

    // --- Sintesi della parte tonale: fondamentale + armoniche + sub-bassa ---
    float base = fastSin(phase1);
    base = tanhf(base * THUMP_DRIVE);  // Soft-clip, simula la distorsione non lineare dello scarico

    float tonal =
        0.82f          * base
      + THUMP_TONE2_MIX * fastSin(phase2)
      + THUMP_TONE3_MIX * fastSin(phase3)
      + THUMP_SUB_MIX   * fastSin(phaseSub);

    // --- Sintesi della parte di rumore: simula il sibilo del flusso d'aria in uscita ---
    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);   // Due stadi di passa-basso, spostano il rumore verso il basso
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;     // Effetto passa-banda

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;  // Nella seconda metà il rumore di flusso si attenua

    float air = bandNoise * (THUMP_NOISE_MIX * (0.25f * env + THUMP_BURST_MIX * 0.75f * earlyEnv));

    // --- Miscela tono e flusso, poi un altro soft-clip asimmetrico ---
    float sample = tonal * env + air;
    sample += 0.08f * env * env1;  // Leggera sovrapposizione non lineare, per dare più corpo al suono

    if (sample > 0.0f) {
      sample = tanhf(sample * 1.15f) * 1.05f;  // Mezzo ciclo positivo spinto un po' più su
    } else {
      sample = tanhf(sample * 0.85f);           // Mezzo ciclo negativo compresso un po'
    }

    sample *= THUMP_TABLE_GAIN;
    thumpTable[i] = clampf(sample, -1.0f, 1.0f);
  }

  thumpTableLen = totalLen;

  Serial.printf("Tabella colpi generata, lunghezza=%d campioni, circa %d ms\n",
    thumpTableLen,
    (int)((float)thumpTableLen * 1000.0f / SAMPLE_RATE));
}

// ================= Passo 5: inizializza il driver I2S =================
void initI2S() {
  i2s_config_t i2s_config = {
    .mode                = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate         = SAMPLE_RATE,
    .bits_per_sample     = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format      = I2S_CHANNEL_FMT_RIGHT_LEFT,   // Stereo (un canale L e uno R)
    .communication_format= I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags    = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count       = DMA_BUF_COUNT,
    .dma_buf_len         = DMA_BUF_LEN,
    .use_apll            = false,
    .tx_desc_auto_clear  = true,   // Azzera automaticamente dopo l'invio, per evitare rumore
    .fixed_mclk          = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK,
    .ws_io_num    = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num  = I2S_PIN_NO_CHANGE  // Solo invio, non riceve
  };

  esp_err_t err;

  err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("Installazione driver I2S fallita: %d\n", (int)err);
    while (1) delay(100);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("Impostazione pin I2S fallita: %d\n", (int)err);
    while (1) delay(100);
  }

  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("Inizializzazione I2S completata");
}

// ================= Aggiornamento acceleratore (chiamato ogni 20ms da throttleTask) =================
void updateThrottle() {

  // Gestione pulsante: alla pressione azzera posizione encoder e acceleratore
  if (encoderButtonPressed) {
    encoderButtonPressed = false;
    encoderPosition = 0;
    targetThrottle  = 0.0f;
    Serial.println(">>> Pulsante premuto: acceleratore azzerato!");
  }

  // Limita il range della posizione dell'encoder, per evitare di sforare 0~massimo
  int maxSteps = (int)(1.0f / ENCODER_STEP_SIZE);  // Default: 10 scatti per arrivare al massimo

  if (encoderPosition < 0)        encoderPosition = 0;
  if (encoderPosition > maxSteps) encoderPosition = maxSteps;

  // Converte gli scatti in un valore di acceleratore 0.0~1.0
  targetThrottle = clampf((float)encoderPosition * ENCODER_STEP_SIZE, 0.0f, 1.0f);

  // Smoothing: ogni volta avanza di un piccolo passo, per evitare salti improvvisi che produrrebbero clic nel suono
  throttleValue += (targetThrottle - throttleValue) * ENCODER_SMOOTHING;
  throttleValue  = clampf(throttleValue, 0.0f, 1.0f);

  // Calcola il regime obiettivo in base all'acceleratore
  targetRPM = RPM_IDLE + throttleValue * (RPM_MAX - RPM_IDLE);
}

// ================= Task di generazione audio (core 1, priorità massima) =================
void audioTask(void *param) {
  float crankPhase = 0.0f;   // Fase dell'albero motore, pilotata da tutti i cilindri

  float bgLpf    = 0.0f;    // Stato del filtro passa-basso del suono di fondo
  float bgHpfIn  = 0.0f;    // Ingresso del filtro passa-alto del suono di fondo
  float bgHpfOut = 0.0f;    // Uscita del filtro passa-alto del suono di fondo

  int   playPosA = -1;       // Posizione di riproduzione attuale della voce di colpo A (-1 = non attiva)
  int   playPosB = -1;       // Voce di colpo B (fade-out del colpo precedente)
  float gainA    = 1.0f;
  float gainB    = 0.55f;

  int  samplesToNextTrigger = 0;   // Campioni mancanti al prossimo trigger del colpo
  bool altToggle = false;          // Flag di alternanza dei cilindri

  float thumpLpf  = 0.0f;   // Stato del filtro passa-basso del colpo
  float outHpfIn  = 0.0f;   // Ingresso del filtro passa-alto di uscita
  float outHpfOut = 0.0f;   // Uscita del filtro passa-alto di uscita

  uint32_t jitterSeed = 987654321;

  unsigned long audioStartMs = millis();

  Serial.println("Task audio avviato");

  while (true) {

    // --- Inseguimento smussato del regime (simula l'inerzia di un motore reale) ---
    currentRPM += (targetRPM - currentRPM) * RPM_SMOOTHING;

    // Valore normalizzato del regime attuale nel range 0.0~1.0
    float rpmNorm = clampf((currentRPM - RPM_IDLE) / (RPM_MAX - RPM_IDLE), 0.0f, 1.0f);

    // Incremento di fase dell'albero motore per ogni campione (ciclo a 4 tempi / 2)
    float cycleIncrement = ((currentRPM / 60.0f) / (float)SAMPLE_RATE) / 2.0f;

    // Frequenza del colpo attuale
    float thumpHz = THUMP_HZ_IDLE + rpmNorm * (THUMP_HZ_MAX - THUMP_HZ_IDLE);
    currentThumpHz = thumpHz;

    // Il volume varia con il regime
    float bgGain = BACKGROUND_GAIN_IDLE + rpmNorm * (BACKGROUND_GAIN_MAX - BACKGROUND_GAIN_IDLE);
    float thumpLayerGain = THUMP_LAYER_GAIN_IDLE + rpmNorm * (THUMP_LAYER_GAIN_MAX - THUMP_LAYER_GAIN_IDLE);

    // La frequenza di taglio del passa-basso sale con il regime (ad alti giri il suono di fondo è più luminoso)
    float bgLpfAlpha = 0.16f + 0.55f * rpmNorm;

    // Fade-in di avvio (per evitare il pop all'accensione)
    float fadeIn = clampf((float)(millis() - audioStartMs) / 1800.0f, 0.0f, 1.0f);

    // --- Genera audio campione per campione ---
    for (int i = 0; i < DMA_BUF_LEN; i++) {

      // ====================================================
      // Livello 1: suono motore di fondo — somma degli impulsi di scarico degli 8 cilindri
      // ====================================================
      float bg = 0.0f;

      for (int cyl = 0; cyl < NUM_CYLINDERS; cyl++) {
        float phase = crankPhase - cylinderPhase[cyl];
        while (phase < 0.0f) phase += 1.0f;
        while (phase >= 1.0f) phase -= 1.0f;

        float pulse = generateCylinderPulse(phase);
        float cylGain = (cyl % 2 == 0) ? 1.0f : 0.82f;  // Leggera differenza tra cilindri pari e dispari, più realistico
        bg += pulse * cylGain;
      }

      bg /= (float)NUM_CYLINDERS * 0.42f;

      // Aggiunge il livello armonico (enfatizza le basse frequenze, riduce il ronzio delle armoniche superiori)
      float basePhase  = crankPhase * 4.0f;
      float harmonics  = 0.0f;

      harmonics += fastSin(basePhase)        * 1.00f;
      harmonics += fastSin(basePhase * 0.5f) * 0.60f;   // Mezza frequenza: accentua la sensazione grave
      harmonics += fastSin(basePhase * 1.5f) * 0.28f;
      harmonics += fastSin(basePhase * 2.0f) * (0.25f + 0.10f * rpmNorm);
      harmonics += fastSin(basePhase * 3.0f) * (0.08f + 0.08f * rpmNorm);
      harmonics += fastSin(basePhase * 4.0f) * (0.03f * rpmNorm);  // La 4ª armonica è la causa del ronzio, tenuta molto bassa
      harmonics /= 2.4f;

      bg = bg * 0.55f + harmonics * 0.45f;
      bg = tanhf(bg * (1.05f + rpmNorm * 0.8f));  // Soft-clip, simula la non linearità dello scarico

      // Aggiunge rumore meccanico alle basse frequenze (rombo, non sibilo)
      float rumble   = pseudoRandom();
      float rumble2  = pseudoRandom();
      bg += (rumble * 0.6f + rumble2 * 0.4f) * (0.008f + 0.018f * rpmNorm);

      // Filtro passa-basso (rende il suono più smorzato, come se arrivasse da dentro il tubo di scarico)
      float bgLpfAlpha2 = 0.18f + 0.45f * rpmNorm;
      bgLpf += bgLpfAlpha2 * (bg - bgLpf);
      bg = bgLpf;

      // Leggero passa-alto (rimuove l'offset DC)
      float bgHp = 0.992f * (bgHpfOut + bg - bgHpfIn);
      bgHpfIn  = bg;
      bgHpfOut = bgHp;
      bg = bg * 0.92f + bgHp * 0.08f;

      bg *= bgGain;

      // ====================================================
      // Livello 2: colpo principale — effetto scarico dritto racing
      // ====================================================

      // Quando il timer scade, attiva un nuovo colpo
      if (samplesToNextTrigger <= 0) {

        // Fa andare in fade-out il colpo precedente come voce B (per sovrapporre le code)
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.50f;
        }

        playPosA = 0;

        // Alternanza pari/dispari: simula la lieve differenza di forza tra le accensioni dei cilindri del V8
        gainA = altToggle ? THUMP_ALT_GAIN : 1.0f;

        // Calcola l'intervallo al prossimo trigger (aggiunge Swing e jitter per dare più groove al ritmo)
        float intervalSamples = (float)SAMPLE_RATE / thumpHz;
        float swingFactor = altToggle ? (1.0f - THUMP_SWING) : (1.0f + THUMP_SWING);
        float jitter = 1.0f + localRandSigned(jitterSeed) * 0.025f;

        samplesToNextTrigger = (int)clampf(intervalSamples * swingFactor * jitter, 1.0f, 999999.0f);
        altToggle = !altToggle;
      }

      samplesToNextTrigger--;

      float thump = 0.0f;

      // Legge la voce A
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) {
          thump += thumpTable[playPosA++] * gainA;
        } else {
          playPosA = -1;
        }
      }

      // Legge la voce B (code in fade-out del colpo precedente)
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) {
          thump += thumpTable[playPosB++] * gainB;
          gainB *= 0.9992f;  // Lento fade-out
        } else {
          playPosB = -1;
        }
      }

      // Passa-basso che arrotonda i bordi del colpo, rendendolo meno duro
      thumpLpf += 0.58f * (thump - thumpLpf);
      thump = thumpLpf * thumpLayerGain;

      // ====================================================
      // Livello 3: miscela dei due livelli e uscita
      // ====================================================
      float sample = bg + thump;

      // Passa-alto finale di uscita (rimuove la deriva DC alle basse frequenze)
      float outHp = 0.988f * (outHpfOut + sample - outHpfIn);
      outHpfIn  = sample;
      outHpfOut = outHp;
      sample = sample * 0.86f + outHp * 0.14f;

      // Soft-clip generale (evita clipping quando i due livelli si sommano)
      sample = tanhf(sample * (1.05f + 0.22f * rpmNorm));

      sample *= MASTER_VOLUME * fadeIn;
      sample  = clampf(sample, -0.98f, 0.98f);

      // Converte in PCM a 16 bit, canali L e R uguali (altoparlante mono)
      int16_t out = (int16_t)(sample * PCM_OUTPUT_SCALE);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;

      // Avanza la fase dell'albero motore
      crankPhase += cycleIncrement;
      if (crankPhase >= 1.0f) crankPhase -= 1.0f;
    }

    // Scrive questo blocco di dati audio nel DMA I2S; poi genera il blocco successivo
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= Task acceleratore (core 0, priorità bassa) =================
void throttleTask(void *param) {
  while (true) {
    updateThrottle();
    vTaskDelay(pdMS_TO_TICKS(20));  // Aggiorna l'acceleratore ogni 20ms, sufficientemente fluido
  }
}

// ================= Task di monitoraggio seriale (core 0, priorità minima) =================
void monitorTask(void *param) {
  char buf[128];

  while (true) {
    int rpmInt      = (int)(currentRPM + 0.5f);
    int targetInt   = (int)(targetRPM  + 0.5f);
    int throttlePct = (int)(throttleValue * 100.0f + 0.5f);
    int thumpHz10   = (int)(currentThumpHz * 10.0f + 0.5f);

    snprintf(buf, sizeof(buf),
      "RPM=%d  obiettivo=%d  acceleratore=%d%%  encoder=%d  freqColpo=%d.%dHz",
      rpmInt, targetInt, throttlePct, encoderPosition,
      thumpHz10 / 10, thumpHz10 % 10);

    Serial.println(buf);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

// ================= setup: inizializzazione del sistema =================
void setup() {
#if DISABLE_BROWNOUT_FOR_TEST
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  Serial.begin(115200);
  delay(1000);

  // All'avvio controlla lo stato della memoria (se PSRAM è 0, significa che non è stata attivata: torna a impostare QSPI)
  Serial.printf("SRAM su chip libera: %d byte\n", ESP.getFreeHeap());
  Serial.printf("PSRAM esterna libera: %d byte\n", ESP.getFreePsram());

  Serial.println("====================================");
  Serial.println("Simulatore di suono V8 ESP32-S3");
  Serial.println("Colpo principale: scarico dritto racing");
  Serial.println("Controllo acceleratore: encoder rotativo KY-040");
  Serial.println("====================================");

  initEncoder();
  initSineTable();
  initCylinderPhases();
  buildStraightPipeThumpTable();
  initI2S();

  // Task audio: core 1, priorità massima, stack 12KB
  xTaskCreatePinnedToCore(audioTask,    "AudioTask", 12288, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  // Task acceleratore: core 0, priorità 2, stack 3KB
  xTaskCreatePinnedToCore(throttleTask, "Throttle",  3072,  NULL, 2,                        NULL, 0);
  // Task monitoraggio: core 0, priorità minima, stack 4KB (non troppo piccolo, altrimenti overflow dello stack)
  xTaskCreatePinnedToCore(monitorTask,  "Monitor",   4096,  NULL, 1,                        NULL, 0);

  Serial.println("Avvio del sistema completato. Ruota l'encoder per controllare l'acceleratore, premi per azzerarlo");
}

// loop praticamente inattivo: tutto il lavoro è delegato ai task FreeRTOS
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

### Spiegazione del codice

L'intero programma è composto da tre task paralleli, gestiti dallo scheduler FreeRTOS, che non si intralciano a vicenda:

| Task | Su quale core | Priorità | Cosa fa |
|------|---------------|----------|---------|
| `audioTask` | Core 1 | Massima | Sintetizza l'audio campione per campione, lo scrive nel DMA I2S |
| `throttleTask` | Core 0 | Media | Legge l'encoder ogni 20ms e aggiorna l'acceleratore |
| `monitorTask` | Core 0 | Minima | Stampa lo stato sulla seriale ogni 700ms |

**La logica centrale della sintesi sonora si divide in tre livelli:**

**Livello 1: il suono motore di fondo.** Ciascuno degli 8 cilindri mantiene una propria fase; ogni cilindro, seguendo gli angoli di accensione del V8 (0°, 90°, 150°...450°), attiva in sequenza la forma d'onda dell'impulso di scarico. La somma degli output degli 8 cilindri produce quel rombo grave e continuo. Sopra gli impulsi dei cilindri si aggiungono la fondamentale e alcune armoniche, per dare più stratificazione al suono del motore.

**Livello 2: il colpo principale.** A intervalli regolari (la frequenza è decisa da `thumpHz`), si legge dalla tabella precalcolata della forma d'onda un "colpo" completo e lo si riproduce. Il colpo stesso è composto da tre fasi di inviluppo — attacco, corpo, decadimento — con una discesa di frequenza (simula il rilascio della pressione di scarico) e un ritardo di rimbalzo (simula la risonanza del tubo): il risultato ricorda il suono di uno scarico dritto racing.

**Livello 3: miscela e uscita.** Sommati i due livelli, si applica un soft-clip generale per evitare il clipping, poi si moltiplica per il coefficiente di fade-in (per evitare il pop all'accensione) e infine si scrive il dato come PCM stereo a 16 bit verso l'I2S.



## Strumento di debug dei campioni di colpo (facoltativo)

Per trovare più in fretta il suono di scarico più adatto, ho preparato una versione separata di codice di test a rotazione seriale: integra 30 set di parametri predefiniti, commutabili con comandi seriali, per confrontare direttamente quale "colpo" ti soddisfa di più. Nel programma principale, alla fine, viene usato il preset numero 23, "Scarico dritto racing".

```c
/*
 * ESP32-S3 + MAX98357A
 * Tester a rotazione dei campioni di colpo V2
 * 30 campioni + volume notevolmente aumentato
 *
 * Collegamenti:
 *   BCLK -> GPIO16
 *   LRC  -> GPIO17
 *   DIN  -> GPIO15
 *
 * Comandi seriali (115200):
 *   n     successivo
 *   p     precedente
 *   r     ripeti
 *   s     ferma la rotazione automatica
 *   a     avvia la rotazione automatica
 *   b     attiva/disattiva lo strato di fondo
 *   1~30  salta al numero corrispondente
 *   h     aiuto
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

#define SAMPLE_RATE     22050
#define DMA_BUF_COUNT   8
#define DMA_BUF_LEN     256

#define PRESET_PLAY_MS  5000
#define SLOW_PART_MS    2500
#define TEST_SLOW_HZ    2.2f
#define TEST_FAST_HZ    5.0f

#define SINE_TABLE_SIZE 2048
#define THUMP_TABLE_MAX 8000

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

static int16_t stereoBuffer[DMA_BUF_LEN * 2];

volatile int requestedPresetIndex = 0;
volatile uint32_t presetStartMs = 0;
volatile bool backgroundEnabled = true;

bool autoPlay = true;
uint32_t lastSwitchMs = 0;
String cmdBuffer;

static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;
  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= Struttura dei parametri dei campioni =================
struct ThumpPreset {
  const char* name;
  float attackMs;
  float bodyMs;
  float tailMs;
  float fStart;
  float fBody;
  float fEnd;
  float noiseMix;
  float tone2Mix;
  float tone3Mix;
  float subMix;
  float drive;
  float burstMix;
  float reboundDelayMs;
  float reboundGain;
  float altGain;
  float swing;
  float gain;
  float rumbleGain;
};

//  nome                         atk  body tail  fS   fB   fE  noise t2   t3   sub  drv  burst rebMs rebG  alt   swng  gain  rumble
const ThumpPreset presets[] = {
  {"01 Profondo grande cilindrata",               12,  65, 100,  55,  42,  34,  0.18, 0.24, 0.08, 0.28, 1.7, 0.18, 44, 0.22, 1.00, 0.00, 2.8, 0.20},
  {"02 Più rotondo e denso",                      14,  75, 130,  52,  40,  32,  0.12, 0.18, 0.04, 0.32, 1.5, 0.10, 50, 0.18, 1.00, 0.00, 2.9, 0.16},
  {"03 Tromba corta potenziata A",                 7,  42,  65, 100,  80,  65,  0.16, 0.30, 0.14, 0.06, 1.6, 0.16, 32, 0.14, 1.00, 0.00, 2.6, 0.12},
  {"04 Tromba corta potenziata B",                 5,  35,  55, 120,  95,  78,  0.14, 0.36, 0.20, 0.04, 1.7, 0.12, 26, 0.12, 1.00, 0.00, 2.5, 0.10},
  {"05 V8 americano al minimo",                    9,  55,  95,  72,  56,  44,  0.22, 0.26, 0.10, 0.14, 1.8, 0.24, 42, 0.30, 0.80, 0.20, 2.7, 0.22},
  {"06 Più gorgogliante irregolare",              11,  58, 105,  68,  52,  42,  0.24, 0.22, 0.08, 0.18, 1.8, 0.22, 54, 0.38, 0.72, 0.26, 2.8, 0.24},
  {"07 Doppio colpo con controspinta evidente",    8,  48,  85,  80,  62,  48,  0.20, 0.26, 0.12, 0.12, 1.7, 0.20, 58, 0.48, 0.88, 0.14, 2.6, 0.18},
  {"08 Ruvido ed esplosivo",                       6,  40,  68,  90,  72,  56,  0.28, 0.32, 0.16, 0.08, 2.2, 0.32, 34, 0.22, 0.90, 0.10, 2.5, 0.15},
  {"09 Estremamente spesso e sordo",              16,  85, 150,  48,  38,  30,  0.08, 0.14, 0.02, 0.36, 1.6, 0.06, 58, 0.20, 1.00, 0.00, 3.0, 0.14},
  {"10 Colpo breve e potente",                     4,  28,  45, 100,  78,  60,  0.14, 0.38, 0.20, 0.04, 1.8, 0.12, 22, 0.10, 1.00, 0.00, 2.4, 0.10},
  {"11 Scarico rauco",                             8,  50,  88,  82,  64,  50,  0.32, 0.24, 0.10, 0.10, 1.9, 0.34, 40, 0.26, 0.86, 0.12, 2.6, 0.16},
  {"12 Cannone grave",                            13,  68, 115,  58,  46,  36,  0.14, 0.20, 0.06, 0.30, 1.8, 0.14, 48, 0.26, 1.00, 0.00, 2.9, 0.20},
  {"13 Colpo medio secco",                         6,  36,  58, 130, 100,  78,  0.10, 0.40, 0.24, 0.02, 1.6, 0.08, 28, 0.10, 1.00, 0.00, 2.4, 0.08},
  {"14 Doppio impulso gorgogliante",               7,  44,  78,  85,  66,  52,  0.18, 0.28, 0.14, 0.10, 1.8, 0.20, 20, 0.45, 0.82, 0.18, 2.6, 0.16},
  {"15 Vecchio V8 lasco",                         10,  60, 108,  72,  55,  44,  0.24, 0.22, 0.08, 0.16, 1.7, 0.20, 52, 0.32, 0.68, 0.30, 2.7, 0.22},
  {"16 Test ultra spesso",                        15,  95, 160,  54,  42,  32,  0.06, 0.14, 0.02, 0.38, 1.6, 0.04, 64, 0.18, 1.00, 0.00, 3.2, 0.12},
  {"17 Stile Harley-Davidson",                     8,  52,  90,  78,  58,  46,  0.26, 0.24, 0.10, 0.16, 1.9, 0.26, 48, 0.35, 0.65, 0.32, 2.8, 0.25},
  {"18 Sportivo acuto ad alti giri",               4,  30,  50, 140, 110,  88,  0.12, 0.42, 0.28, 0.02, 1.8, 0.10, 20, 0.08, 1.00, 0.00, 2.3, 0.08},
  {"19 Diesel ciac-ciac",                         14,  48,  80,  65,  50,  42,  0.30, 0.18, 0.06, 0.20, 2.0, 0.28, 38, 0.40, 0.75, 0.22, 2.7, 0.20},
  {"20 Cruiser grande cilindrata",                12,  72, 125,  60,  45,  36,  0.16, 0.20, 0.06, 0.34, 1.7, 0.12, 55, 0.24, 1.00, 0.00, 3.0, 0.18},
  {"21 Ultra brutale esplosivo",                   3,  25,  40, 110,  85,  68,  0.35, 0.34, 0.18, 0.06, 2.5, 0.40, 18, 0.15, 0.92, 0.08, 2.4, 0.12},
  {"22 Grande cilindrata delicato",               16,  90, 140,  50,  40,  34,  0.10, 0.16, 0.04, 0.30, 1.4, 0.06, 60, 0.16, 1.00, 0.00, 3.0, 0.10},
  {"23 Scarico dritto racing",                     5,  38,  62, 105,  82,  64,  0.22, 0.30, 0.16, 0.08, 2.1, 0.28, 30, 0.18, 0.94, 0.06, 2.5, 0.14},
  {"24 Profondo + forte controspinta",            10,  58,  95,  65,  50,  40,  0.18, 0.22, 0.08, 0.22, 1.8, 0.16, 65, 0.52, 0.85, 0.16, 2.8, 0.20},
  {"25 Esplosione di flusso d'aria",               6,  35,  55,  88,  68,  52,  0.38, 0.20, 0.08, 0.10, 1.7, 0.45, 28, 0.14, 1.00, 0.00, 2.5, 0.12},
  {"26 Sensazione 3 cilindri ciac-ciac",          10,  45,  75,  74,  58,  46,  0.20, 0.22, 0.10, 0.14, 1.8, 0.20, 36, 0.30, 0.60, 0.35, 2.6, 0.18},
  {"27 Test subwoofer ultra grave",               18, 100, 180,  42,  32,  26,  0.06, 0.12, 0.02, 0.42, 1.5, 0.04, 70, 0.20, 1.00, 0.00, 3.4, 0.08},
  {"28 Colpo a segno",                             5,  32,  48,  95,  75,  58,  0.16, 0.34, 0.18, 0.06, 2.0, 0.16, 24, 0.12, 1.00, 0.00, 2.6, 0.10},
  {"29 Rombo a tutto spettro",                     8,  55,  90,  85,  65,  50,  0.20, 0.28, 0.14, 0.18, 1.9, 0.22, 42, 0.28, 0.88, 0.12, 2.8, 0.20},
  {"30 Test contrasto estremo",                    3,  20,  35, 150, 120,  90,  0.40, 0.44, 0.28, 0.02, 2.4, 0.45, 16, 0.08, 1.00, 0.00, 2.2, 0.06},
};

const int NUM_PRESETS = sizeof(presets) / sizeof(presets[0]);

// ================= Inizializzazione =================
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

void initI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = DMA_BUF_COUNT,
    .dma_buf_len = DMA_BUF_LEN,
    .use_apll = false,
    .tx_desc_auto_clear = true,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_BCLK,
    .ws_io_num = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S OK");
}

// ================= Costruzione della tabella della forma d'onda =================
void buildThumpTable(int presetIndex) {
  const ThumpPreset &p = presets[presetIndex];

  int attackS  = (int)(p.attackMs  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(p.bodyMs    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(p.tailMs    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(p.reboundDelayMs * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;
  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1 = 0, phase2 = 0, phase3 = 0, phaseSub = 0;
  float noiseLP1 = 0, noiseLP2 = 0;
  uint32_t seed = 24681357;

  for (int i = 0; i < totalLen; i++) {
    float env1 = 0.0f;
    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    int j = i - reboundS;
    float env2 = 0.0f;
    if (j >= 0) {
      if (j < attackS) {
        float x = (float)j / (float)attackS;
        env2 = smoothstep01(x); env2 *= env2;
      } else if (j < attackS + bodyS) {
        float x = (float)(j - attackS) / (float)bodyS;
        env2 = 1.0f - 0.28f * x;
      } else if (j < mainLen) {
        float x = (float)(j - attackS - bodyS) / (float)tailS;
        env2 = 0.72f * expf(-3.8f * x);
      }
      env2 *= p.reboundGain;
    }

    float env = env1 + env2;
    env = clampf(env, 0.0f, 1.5f);

    float freq = p.fEnd;
    if (i < attackS) freq = p.fStart;
    else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      freq = p.fStart + (p.fBody - p.fStart) * x;
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      freq = p.fBody + (p.fEnd - p.fBody) * x;
    }

    float inc1 = freq / (float)SAMPLE_RATE;
    phase1 += inc1;       if (phase1 >= 1.0f) phase1 -= 1.0f;
    phase2 += inc1 * 2;   if (phase2 >= 1.0f) phase2 -= 1.0f;
    phase3 += inc1 * 3;   if (phase3 >= 1.0f) phase3 -= 1.0f;
    phaseSub += inc1 * 0.5f; if (phaseSub >= 1.0f) phaseSub -= 1.0f;

    float base = fastSin(phase1);
    base = tanhf(base * p.drive);

    float tonal = 0.82f * base
                + p.tone2Mix * fastSin(phase2)
                + p.tone3Mix * fastSin(phase3)
                + p.subMix   * fastSin(phaseSub);

    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;

    float air = bandNoise * (p.noiseMix * (0.25f * env + p.burstMix * 0.75f * earlyEnv));

    float sample = tonal * env + air;
    sample += 0.08f * env * env1;

    if (sample > 0.0f) sample = tanhf(sample * 1.15f) * 1.05f;
    else sample = tanhf(sample * 0.85f);

    sample *= p.gain;
    sample = clampf(sample, -1.0f, 1.0f);

    thumpTable[i] = sample;
  }

  thumpTableLen = totalLen;
}

// ================= Controllo seriale =================
void showHelp() {
  Serial.println();
  Serial.println("===== Comandi =====");
  Serial.println("n     successivo");
  Serial.println("p     precedente");
  Serial.println("r     ripeti");
  Serial.println("s     ferma la rotazione automatica");
  Serial.println("a     avvia la rotazione automatica");
  Serial.println("b     attiva/disattiva lo sfondo");
  Serial.println("1~30  salta al numero");
  Serial.println("h     aiuto");
  Serial.println("================");
}

void printPresetInfo(int idx) {
  Serial.println();
  Serial.println("========================================");
  Serial.print("Campione #");
  Serial.print(idx + 1);
  Serial.print(" / ");
  Serial.println(NUM_PRESETS);
  Serial.println(presets[idx].name);
  Serial.print("Primi 2.5s colpi lenti, poi 2.5s colpi veloci - Sfondo: ");
  Serial.println(backgroundEnabled ? "ON" : "OFF");
  Serial.println("========================================");
}

void requestPreset(int idx) {
  while (idx < 0) idx += NUM_PRESETS;
  while (idx >= NUM_PRESETS) idx -= NUM_PRESETS;
  requestedPresetIndex = idx;
  presetStartMs = millis();
  lastSwitchMs = millis();
  printPresetInfo(idx);
}

void processCommand(String cmd) {
  cmd.trim();
  cmd.toLowerCase();
  if (cmd.length() == 0) return;

  if (cmd == "n") { requestPreset(requestedPresetIndex + 1); return; }
  if (cmd == "p") { requestPreset(requestedPresetIndex - 1); return; }
  if (cmd == "r") { requestPreset(requestedPresetIndex); return; }
  if (cmd == "s") { autoPlay = false; Serial.println("Rotazione automatica fermata"); return; }
  if (cmd == "a") { autoPlay = true; lastSwitchMs = millis(); Serial.println("Rotazione automatica avviata"); return; }
  if (cmd == "b") { backgroundEnabled = !backgroundEnabled; Serial.print("Sfondo: "); Serial.println(backgroundEnabled ? "ON" : "OFF"); return; }
  if (cmd == "h") { showHelp(); return; }

  int n = cmd.toInt();
  if (n >= 1 && n <= NUM_PRESETS) { requestPreset(n - 1); return; }

  Serial.print("Sconosciuto: ");
  Serial.println(cmd);
}

// ================= Task audio =================
void audioTask(void *param) {
  int loadedPreset = -1;
  ThumpPreset currentPreset;

  int playPosA = -1, playPosB = -1;
  float gainA = 1.0f, gainB = 0.5f;
  int samplesToNextTrigger = 0;
  bool altToggle = false;

  float thumpLP = 0.0f;
  float hpIn = 0.0f, hpOut = 0.0f;
  float bgPhase1 = 0, bgPhase2 = 0;
  float bgNoise1 = 0, bgNoise2 = 0;
  uint32_t bgSeed = 123456789;

  while (true) {
    int req = requestedPresetIndex;

    if (req != loadedPreset) {
      currentPreset = presets[req];
      buildThumpTable(req);
      loadedPreset = req;
      playPosA = -1; playPosB = -1;
      gainA = 1.0f; gainB = 0.5f;
      samplesToNextTrigger = 0;
      altToggle = false;
      thumpLP = 0.0f;
    }

    uint32_t ageMs = millis() - presetStartMs;
    float baseHz = (ageMs < SLOW_PART_MS) ? TEST_SLOW_HZ : TEST_FAST_HZ;
    float speedNorm = (ageMs < SLOW_PART_MS) ? 0.25f : 0.70f;

    for (int i = 0; i < DMA_BUF_LEN; i++) {
      if (samplesToNextTrigger <= 0) {
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.55f;
        }
        playPosA = 0;
        gainA = altToggle ? currentPreset.altGain : 1.0f;

        float intervalSamples = (float)SAMPLE_RATE / baseHz;
        float swingFactor = altToggle ? (1.0f - currentPreset.swing) : (1.0f + currentPreset.swing);
        if (swingFactor < 0.2f) swingFactor = 0.2f;
        samplesToNextTrigger = (int)(intervalSamples * swingFactor);
        if (samplesToNextTrigger < 1) samplesToNextTrigger = 1;
        altToggle = !altToggle;
      }
      samplesToNextTrigger--;

      float thump = 0.0f;
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) { thump += thumpTable[playPosA] * gainA; playPosA++; }
        else playPosA = -1;
      }
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) { thump += thumpTable[playPosB] * gainB; playPosB++; gainB *= 0.9993f; }
        else playPosB = -1;
      }

      thumpLP += 0.55f * (thump - thumpLP);
      thump = thumpLP;

      float bg = 0.0f;
      if (backgroundEnabled) {
        float bgFreq = 28.0f + speedNorm * 36.0f;
        bgPhase1 += bgFreq / (float)SAMPLE_RATE;
        if (bgPhase1 >= 1.0f) bgPhase1 -= 1.0f;
        bgPhase2 += (bgFreq * 2.1f) / (float)SAMPLE_RATE;
        if (bgPhase2 >= 1.0f) bgPhase2 -= 1.0f;
        float white = localRandSigned(bgSeed);
        bgNoise1 += 0.06f * (white - bgNoise1);
        bgNoise2 += 0.015f * (bgNoise1 - bgNoise2);
        bg = fastSin(bgPhase1) * 0.65f + fastSin(bgPhase2) * 0.18f + bgNoise2 * 0.07f;
        bg = tanhf(bg * 1.35f) * currentPreset.rumbleGain;
      }

      float sample = thump + bg;

      float hp = 0.985f * (hpOut + sample - hpIn);
      hpIn = sample;
      hpOut = hp;
      sample = sample * 0.82f + hp * 0.18f;

      // ★ Punto chiave: il guadagno di uscita finale è notevolmente aumentato
      sample *= 1.8f;

      sample = tanhf(sample * 1.1f);
      sample = clampf(sample, -0.98f, 0.98f);

      // ★ Uscita a piena scala
      int16_t out = (int16_t)(sample * 30000.0f);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;
    }

    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= setup / loop =================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("====================================");
  Serial.println("Tester a rotazione dei campioni di colpo V2");
  Serial.println("30 campioni + versione ad alto volume");
  Serial.println("====================================");

  initSineTable();
  initI2S();
  showHelp();
  requestPreset(0);

  xTaskCreatePinnedToCore(audioTask, "Audio", 10240, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  Serial.println("Inizio riproduzione...");
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r' || c == '\n') {
      if (cmdBuffer.length() > 0) {
        processCommand(cmdBuffer);
        cmdBuffer = "";
      }
    } else {
      cmdBuffer += c;
    }
  }

  if (autoPlay) {
    if (millis() - lastSwitchMs >= PRESET_PLAY_MS) {
      int nextIdx = requestedPresetIndex + 1;
      if (nextIdx >= NUM_PRESETS) nextIdx = 0;
      requestPreset(nextIdx);
    }
  }

  delay(10);
}
```




---

## Risoluzione dei problemi comuni

Non temere, il 90% dei problemi nasce da questi punti; con una verifica mirata si risolvono quasi tutti:

**Altoparlante completamente muto dopo l'alimentazione**

Per prima cosa controlla il pin SD. Se il pin SD del MAX98357A viene inavvertitamente portato basso (ad esempio tocca il GND o non è lasciato flottante), il modulo entra in modalità mute. Lascia il pin SD flottante o collegalo a 3.3V, poi riavvia e riprova. Quindi, con il monitor seriale, verifica che l'inizializzazione I2S non abbia restituito errori e che nel log non compaia la stringa "Installazione driver I2S fallita".

**Il suono è molto basso, quasi inudibile**

Per prima cosa conferma l'impedenza dell'altoparlante. Con un altoparlante da 4Ω il MAX98357A eroga 3W, con uno da 8Ω solo circa 1.4W: il volume si dimezza. Poi controlla che il VIN sia collegato a 5V: a 3.3V la potenza cala drasticamente. Puoi anche alzare nel codice `PCM_OUTPUT_SCALE` da 26000 a 30000, ma senza superare 32767, oltre vai in overflow e in distorsione.

**La direzione di rotazione dell'encoder è invertita (orario diminuisce, antiorario aumenta)**

In `encoderISR()` scambia `encoderPosition++` con `encoderPosition--`, oppure scambia direttamente i collegamenti fisici di CLK e DT: scegli una delle due.

**Subito dopo l'accensione va in crash e si riavvia, la seriale mostra `Stack canary watchpoint triggered`**

È l'overflow dello stack di uno dei task FreeRTOS; il messaggio di errore riporta il nome del task (ad esempio `Monitor`). Trova il task corrispondente e aumenta la dimensione dello stack nel `xTaskCreatePinnedToCore` (il terzo numero): il task Monitor richiede almeno 4096, se non basta metti 8192.

**La seriale mostra `OOM: failed to allocate XXX bytes`**

Overflow di memoria. Verifica in questo ordine:

1. In Arduino IDE, **Strumenti → PSRAM** deve essere selezionato, e deve essere **QSPI PSRAM** (non OPI)
2. Aggiungi all'inizio di `setup()` la riga `Serial.printf("PSRAM: %d\n", ESP.getFreePsram());`, riflasha e guarda la seriale: se stampa 0 significa che la PSRAM non è stata attivata, torna a correggere l'opzione
3. Conferma che il modello della tua scheda abbia la PSRAM esterna (in ESP32-S3-WROOM-1-**N16R8** la R8 indica proprio 8MB di PSRAM)

**Nel suono ci sono clic o rumore a intervalli regolari**

Nella maggior parte dei casi è un problema di massa comune. Il GND dell'ESP32-S3 e il GND del MAX98357A devono essere collegati allo stesso filo, non a due masse separate di alimentatori diversi. Con un multimetro misura la resistenza tra i due GND: dovrebbe essere vicina a 0Ω.

---

## FAQ

**D: I GPIO16/17/15 dell'ESP32-S3 sono occupati, posso usare altri pin?**
R: Sì, i pin I2S possono essere mappati liberamente su qualsiasi GPIO. Modifica le tre macro `I2S_BCLK`, `I2S_LRC`, `I2S_DOUT` in cima al codice con i numeri di pin che vuoi usare. Tieni però presente che GPIO 0, 1, 2, 3, 43, 44 hanno usi speciali, meglio evitarli.

**D: Posso collegare due altoparlanti per fare lo stereo?**
R: Il MAX98357A è un amplificatore mono; per lo stereo servono due moduli, uno sul canale sinistro e uno sul destro, distinguibili tramite il collegamento del pin GAIN (uno collegato a GND = canale destro, uno flottante = canale sinistro). Nel codice i due canali PCM sono attualmente uguali (`stereoBuffer[i*2] = stereoBuffer[i*2+1] = out`); per uno stereo reale va modificata anche la logica di sintesi.

**D: La frequenza di campionamento di 22050Hz basta? Posso passare a 44100Hz?**
R: 22050Hz è più che sufficiente per contenuti medio-gravi come il suono di un motore: riesce a ricostruire fino a 11025Hz, e la percezione umana del rombo del motore si concentra soprattutto tra 50Hz e 4kHz. In teoria si può passare a 44100Hz, ma il carico sulla CPU raddoppia: conviene prima verificare la stabilità, modificando in modo coerente `SAMPLE_RATE` e il campo `sample_rate` della configurazione I2S.

**D: Collegando l'alimentazione a 5V rischio di bruciare l'ESP32-S3?**
R: Il VIN del MAX98357A va a 5V, ma i suoi pin di segnale (BCLK, LRC, DIN) lavorano a 3.3V e possono essere collegati direttamente ai GPIO dell'ESP32-S3, senza conversione di livello. I GPIO dell'ESP32-S3 erogano 3.3V e il MAX98357A li riconosce: sicuro.

**D: Il suono al minimo è troppo basso, non si sente bene, posso alzarlo?**
R: Regola `BACKGROUND_GAIN_IDLE` (default 0.45) e `THUMP_LAYER_GAIN_IDLE` (default 0.75), alzali entrambi, ad esempio a 0.6 e 1.0: il volume al minimo aumenterà in modo evidente. Dopo la modifica ricordati di verificare che a acceleratore massimo non ci sia clipping; in caso, abbassa leggermente `PCM_OUTPUT_SCALE`.

**D: L'encoder KY-040 a ogni scatto varia l'acceleratore del 10%, è troppo, posso renderlo più fine?**
R: Riduci `ENCODER_STEP_SIZE` da 0.1 a, ad esempio, 0.05: diventerà il 5% per scatto e serviranno 20 scatti per arrivare al massimo, con sensibilità più fine.

**D: Il programma può girare su ESP32 (non S3)?**
R: In teoria sì, l'API I2S è standard, ma i normali ESP32 non hanno PSRAM esterna o ne hanno poca: questo progetto potrebbe rimanere senza memoria. Ti consiglio almeno un modello con PSRAM, ad esempio ESP32-WROVER. Anche i numeri dei GPIO vanno rimappati in base alla tua scheda.

---

## Estensioni

Dopo la versione base, puoi espandere il progetto in queste direzioni:

- **Collega un sensore di velocità**: monta un sensore di Hall sulla ruota; più la velocità è alta, più l'acceleratore sale automaticamente, a mani libere
- **Cambia in V6 / 4 cilindri in linea / suono moto**: modifica `NUM_CYLINDERS` e `firingAngles`, con un'altra serie di angoli di accensione ottieni un motore diverso
- **Aggiungi uno schermo TFT**: visualizza il contagiri e la percentuale di acceleratore, per un effetto cruscotto
- **Aggiungi un involucro impermeabile**: per l'uso su un veicolo elettrico, anche sotto la pioggia serve un'impermeabilizzazione curata, altrimenti l'acqua dentro al circuito è un problema peggiore del silenzio

---

## Riferimenti

- [Scheda tecnica del MAX98357A (Analog Devices)](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [Pagina prodotto del MAX98357A (Analog Devices)](https://www.analog.com/en/products/max98357a.html)
- [Manuale di riferimento tecnico dell'ESP32-S3 (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [Pagina prodotto dell'ESP32-S3-WROOM-1 (Espressif)](https://www.espressif.com/en/products/modules/esp32-s3)
- [GitHub di ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
- [Documentazione API di creazione task FreeRTOS](https://www.freertos.org/a00125.html)
