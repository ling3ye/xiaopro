---
title: "Clessidra elettronica con ESP32 e MAX7219｜Collegamento SPI + codice del motore fisico a rotazione 45°"
boardId: esp32
moduleId: lighting/max7219-dot-matrix
category: esp32
date: 2026-07-29
intro: "Con una scheda ESP32 e due moduli MAX7219 8×8, replica passo dopo passo la celebre clessidra elettronica. Spiega il principio del motore fisico a rotazione 45°, il collegamento SPI a catena (daisy-chain) e il codice completo Arduino C++, con guida ai problemi più comuni. Ideale per maker che sanno già caricare uno sketch."
image: "https://img.lingflux.com/2026/07/47600d4280d7a2274f9f47a726329beb.jpg"
---

> **TL;DR (avvio rapido):**
>
> 1. Collegamenti: ESP32 `GPIO23→DIN`, `GPIO18→CLK`, `GPIO5→CS`; i due MAX7219 si collegano a catena tramite `DOUT→DIN`
> 2. Alimentazione: `5V→VCC`, `GND→GND` (non invertire la polarità, altrimenti rischi di bruciare i moduli)
> 3. Librerie: cerca `MD_MAX72xx` nel Library Manager di Arduino e installala; `SPI.h` è inclusa nell'IDE, non serve installarla a parte
> 4. Dopo il caricamento dello sketch, la matrice inizierà a far "cadere la sabbia" da sola, senza bisogno di pulsanti o sensori

---

Difficoltà: ⭐⭐⭐☆☆ (bastano i primi sketch caricati con Arduino IDE)
Tempo stimato: 40 minuti (collegamenti 15 min + caricamento e debug 25 min)
Ambiente di test: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + MD_MAX72xx v3.5.1

---

## Premessa

Anche voi, scorrendo la rete, vi sarete imbattuti in quelle clessidre elettroniche in cui i granelli di sabbia cadono uno a uno e, inclinandole, la sabbia si accumula in piccoli pendii naturali: fa venire voglia di provarci, vero? Il mio primo pensiero è stato: "Serve di sicuro un giroscopio e un sacco di formule fisiche". Ma una volta messo mano al progetto ho capito che la vera difficoltà non stava nell'hardware, bensì nel far "fingere" a due matrici quadrate, nel codice, di essere state ruotate di 45° per comporre la sagoma di una clessidra. Questo articolo raccoglie le insidie che ho incontrato e la logica fisica che ho dovuto chiarirmi: seguendolo, potrete realizzare anche voi con una scheda ESP32 e due MAX7219 un oggetto da tavolo che "fa cadere la sabbia".

## Risultato dell'esperimento

All'accensione, la matrice entra automaticamente in un ciclo: prima la sabbia cade in modo stabile in posizione verticale, poi simula un'inclinazione verso sinistra e verso destra, accumulandosi con angolazioni naturali, infine si "capovolge" e la clessidra si gira per ricominciare da capo. L'intera sequenza non richiede di premere alcun pulsante; l'esperimento attuale non usa un giroscopio: il capovolgimento si basa su angolazioni definite nel codice. È integrato nello sketch uno stato di "pseudo-giroscopio" che cambia automaticamente configurazione.

---

## Descrizione dei componenti

> La scheda di sviluppo (ESP32) dovrebbe essere nota a tutti, quindi non mi dilungherò; parliamo soprattutto del MAX7219.

### MAX7219 — il "traduttore" della matrice LED

Il MAX7219 è un chip driver per LED che, con pochissimi pin, controlla un'intera matrice 8×8 = 64 LED; in questo progetto serve a "tradurre" i pochi GPIO dell'ESP32 in una vera e propria tela su cui disegnare — senza di esso dovreste tirare 64 fili per accendere ogni singolo LED, e solo a pensarci vengono le tristezze.

Potete immaginarlo come un "traduttore": l'ESP32 deve solo inviare semplici comandi SPI (quale riga e quali punti accendere), e il MAX7219 si occupa di distribuire in sequenza la corrente ai LED corrispondenti tramite scansione, a una velocità tale che l'occhio umano non percepisce alcun sfarfallio.

| Parametro | Valore |
| --- | --- |
| Modalità di pilotaggio | SPI (tre fili: DIN/CLK/CS) |
| LED controllati per modulo | 64 (8×8) |
| Tensione di funzionamento | 4,0 V ~ 5,5 V |
| Modalità di collegamento a catena | il DOUT si collega al DIN del modulo successivo, catena (daisy-chain) |
| Regolazione luminosità | 16 livelli (in questo articolo si usa il livello 5) |

È stato scelto perché economico, diffusissimo e supportato da librerie mature; inoltre, due moduli affiancati possono essere "ruotati fisicamente di 45°" per comporre il profilo a rombo della clessidra: difficile battere il rapporto qualità/prezzo.

### Descrizione dei pin

La disposizione dei pin più comune sui moduli MAX7219 è la seguente (alcuni produttori cambiano l'ordine delle serigrafie: fate riferimento alle indicazioni sul retro del modulo):

| Pin | Funzione |
| --- | --- |
| VCC / GND | Polo positivo e negativo dell'alimentazione |
| DIN | Ingresso dati (si collega al DOUT del modulo precedente o al microcontrollore) |
| DOUT | Uscita dati (si collega al DIN del modulo successivo, per la catena) |
| CS | Segnale di chip-select |
| CLK | Segnale di clock |

## Lista componenti (BOM)

| Componente | Quantità | Note |
| --- | --- | --- |
| Scheda di sviluppo ESP32 | 1 | qualsiasi modello, basta che abbia GPIO liberi |
| Modulo matrice 8×8 MAX7219 | 2 | consigliati stesso lotto e stesso modello, per colore/luminosità uniformi |
| Cavetti jumper / Dupont | alcuni | preferibilmente femmina-femmina, per avere i ponticelli tra moduli più ordinati |

## Schema di collegamento

Le tabelle di testo si leggono con fatica, quindi è bene prima seguire lo schema qui sopra per farsi un'idea e poi ricontrollare cavo per cavo con la tabella sottostante.

| ESP32 | Modulo 1 (MAX7219 #1) | Modulo 2 (MAX7219 #2) |
| --- | --- | --- |
| 5V | VCC (IN) → VCC (OUT) | ← VCC (IN) |
| GND | GND (IN) → GND (OUT) | ← GND (IN) |
| GPIO23 | DIN → DOUT | → DIN |
| GPIO5 | CS (IN) → CS (OUT) | → CS (IN) |
| GPIO18 | CLK (IN) → CLK (OUT) | → CLK (IN) |

**Consiglio: una volta finito, ricontrolla cavo per cavo; risparmia l'80% del tempo di debug** — in particolare occhio a non invertire VCC/GND e a non scambiare il verso IN/OUT dei moduli: sono i due errori che costringono più spesso a rifare i collegamenti.

## Librerie da installare

Apri Arduino IDE → Library Manager e installa le seguenti librerie:

- `MD_MAX72xx` (autore MajicDesigns, ultima versione stabile v3.5.1) — la libreria principale per pilotare la matrice MAX7219
- `SPI.h` — inclusa nell'IDE Arduino, non serve installarla separatamente

Nota: la libreria `MD_MAX72xx` include un esempio ufficiale Hourglass (clessidra); se il codice di questo articolo non funziona come previsto, confrontatelo con l'esempio della libreria per capire se è stato scelto un `HARDWARE_TYPE` sbagliato.

## Codice completo + spiegazione

```cpp
/*
  ================================================================
   Clessidra elettronica con doppio 8x8 MAX7219 ed ESP32 (versione a rotazione 45°)
  ================================================================

  Layout hardware:
  ------------------------------------------------------------
  Due moduli 8x8 MAX7219 standard, collegati in catena DIN→DOUT:
     [ESP32] --DIN--> [Modulo 1 (imbuto superiore)] --DOUT--> [Modulo 2 (imbuto inferiore)]

  L'indirizzamento nativo di MD_MAX72XX è «riga 0~7, colonna 0~(8*num_dispositivi-1)»,
  quindi 2 dispositivi forniscono naturalmente uno spazio 8 righe x 16 colonne:
     Modulo 1 occupa le colonne 0~7   (dopo rotazione 45° è l'"imbuto superiore", punta in riga 7, colonna 7)
     Modulo 2 occupa le colonne 8~15  (dopo rotazione 45° è l'"imbuto inferiore", punta in riga 0, colonna 8)

  Ciascun modulo è ruotato fisicamente di 45° e i due sono uniti: solo le celle
  (riga 7, colonna 7) e (riga 0, colonna 8) sono fisicamente adiacenti — questo è
  il "collo" della clessidra, l'unico passaggio in cui un granello può attraversare
  passando da un modulo all'altro. Tra la colonna 7 e la colonna 8 non esiste altra
  adiacenza fisica (i due rombi si toccano in un solo vertice), quindi nel codice
  occorre disabilitare esplicitamente ogni altro "teletrasporto" tra le colonne.

  Intuizione fisica della direzione di gravità:
  ------------------------------------------------------------
  Poiché l'intero modulo è ruotato fisicamente di 45°, la direzione di riga e colonna
  del modulo non è più verticale, ma punta rispettivamente verso il basso-sinistra a 45°
  e il basso-destra a 45° nel "mondo reale". Quindi:
     - entrambe le componenti +1 (riga+1 e colonna+1) — corrisponde al "basso" reale
     - solo riga +1 (colonna invariata) — corrisponde al "basso-sinistra" reale (accumulo naturale della sabbia)
     - solo colonna +1 (riga invariata) — corrisponde al "basso-destra" reale (accumulo naturale della sabbia)
  Da qui derivano il "vettore gravità" e la "componente di scivolamento laterale" di questo
  codice. Quando si capovolge la clessidra (gravityDir da +1 a -1), entrambe le componenti
  cambiano segno e il significato fisico resta coerente.

  Anti-immagine fantasma / anti-caduta troppo veloce in un singolo frame:
  ------------------------------------------------------------
  Ogni frame esegue la scansione delle celle in ordine inverso "verso valle -> verso monte"
  della gravità (con gravityDir=+1 si scorre da riga 7,colonna 15 verso riga 0,colonna 0;
  dopo il capovolgimento si scorre al contrario), in modo da garantire che:
     1) ciascun granello si sposti al massimo di una cella per frame, senza giudizi
        concatenati che provocherebbero "teletrasporto";
     2) la verifica che la cella destinazione sia occupata avvenga sempre sullo stato
        finale già determinato del frame corrente, senza duplicati o granelli persi
        causati da due granelli che contendono la stessa destinazione nello stesso frame.

  Pin (mantenuti invariati rispetto al cablaggio verificato):
     DATA_PIN 23 (MOSI)   CLK_PIN 18 (SCK)   CS_PIN 5 (CS)

  Giroscopio:
  ------------------------------------------------------------
  Non è ancora collegato un giroscopio reale; questo codice integra uno stato di
  "pseudo-giroscopio" (fakeGyroX / fakeGyroZ) che, in base al tempo, esegue in ciclo:
     caduta stabile in verticale -> inclinazione su un lato -> raddrizzamento ->
     capovolgimento completo -> (ripete al contrario)
  Quando in futuro si collegherà un sensore reale (es. MPU6050), basterà collegare
  readRealGyro() e sostituire gli angoli reali a fakeGyroX/fakeGyroZ; il resto del
  motore fisico non richiederà modifiche.
  ================================================================
*/

#include <MD_MAX72xx.h>
#include <SPI.h>

// ---------------- Configurazione hardware ----------------
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES   2          // Solo 2 moduli 8x8

#define DATA_PIN  23  // VSPI MOSI
#define CLK_PIN   18  // VSPI SCK
#define CS_PIN    5   // VSPI CS0

MD_MAX72XX mx = MD_MAX72XX(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

// ---------------- Correzione dell'orientamento di visualizzazione ----------------
// Se dopo l'accensione l'immagine risulta "capovolta" o "i due moduli scambiati",
// basta modificare queste due macro, senza toccare l'algoritmo fisico sottostante.
#define FLIP_ROW           true   // Capovolgere la direzione delle righe? (7-row)
#define SWAP_MODULE_ORDER  false  // Se il modulo 2 viene prima del modulo 1 nella catena, mettere true

// ---------------- Griglia logica ----------------
#define ROWS 8
#define COLS 16
// Collo: uscita modulo 1 (7,7) <-> ingresso modulo 2 (0,8)
#define NECK_A_R 7
#define NECK_A_C 7
#define NECK_B_R 0
#define NECK_B_C 8

bool sand[ROWS][COLS];

// ---------------- Parametri del motore fisico ----------------
#define SAND_TOTAL        42     // Numero totale di granelli, regolabile per gusto visivo (consigliato 30~50)
#define TICK_MS           130    // Passo di calcolo fisico (ms), più piccolo = flusso più veloce.
                                  // Aumentando a ~130ms l'occhio distingue chiaramente ogni granello
                                  // che cade cella dopo cella, e tra i granelli in caduta dal collo
                                  // si forma naturalmente una cella vuota di intervallo
                                  // (se ne vedono cadere 2~3 punti a intervalli). Se sembra ancora
                                  // troppo veloce, aumentare ulteriormente (range consigliato 100~180).
const float LATERAL_FRICTION = 0.85f;  // "Attrito" di scivolamento laterale: non ogni frame si scivola, crea pause naturali

int   gravityDir  = 1;     // +1 = verticale (modulo 1 -> modulo 2)   -1 = invertito (modulo 2 -> modulo 1)
float targetBias  = 0.0f;  // Inclinazione obiettivo [-1,1]
float currentBias = 0.0f;  // Inclinazione corrente livellata (avvicina lentamente a targetBias, per evitare bruschi)

unsigned long lastTickMs = 0;

// ================================================================
//                        Motore fisico della sabbia
// ================================================================

inline int moduleOf(int c) { return (c < 8) ? 1 : 2; }

// È una transizione di collo legittima (l'unica coppia che può attraversare i moduli, bidirezionale)
inline bool isNeckPair(int r, int c, int nr, int nc) {
  if (r == NECK_A_R && c == NECK_A_C && nr == NECK_B_R && nc == NECK_B_C) return true;
  if (r == NECK_B_R && c == NECK_B_C && nr == NECK_A_R && nc == NECK_A_C) return true;
  return false;
}

inline bool canMove(int r, int c, int nr, int nc) {
  if (nr < 0 || nr > 7 || nc < 0 || nc > 15) return false;   // Fuori limite
  if (sand[nr][nc]) return false;                             // Destinazione già occupata
  if (moduleOf(c) != moduleOf(nc)) {                          // Tra moduli diversi?
    if (!isNeckPair(r, c, nr, nc)) return false;              // Solo il collo lo permette
  }
  return true;
}

inline bool tryMove(int r, int c, int nr, int nc) {
  if (!canMove(r, c, nr, nc)) return false;
  sand[r][c]   = false;
  sand[nr][nc] = true;
  return true;
}

// Calcola la cella destinazione "direttamente sotto" (direzione principale della gravità).
// Punto chiave: stando sulla punta del collo, (riga+g, colonna+g) esce subito fuori dai limiti
// (es. 7+1=8 supera 0~7), quindi va reindirizzata esplicitamente alla cella opposta del collo,
// altrimenti il granello resta bloccato sulla punta e non può attraversare.
inline void primaryTarget(int r, int c, int g, int &nr, int &nc) {
  if (g == 1  && r == NECK_A_R && c == NECK_A_C) { nr = NECK_B_R; nc = NECK_B_C; return; }
  if (g == -1 && r == NECK_B_R && c == NECK_B_C) { nr = NECK_A_R; nc = NECK_A_C; return; }
  nr = r + g;
  nc = c + g;
}

float random01() { return random(0, 10001) / 10000.0f; }

// Decisone di un passo per un singolo granello: prima si tenta il "direttamente sotto",
// se bloccato si scivola lateralmente a sinistra/destra in base all'inclinazione
void moveGrain(int r, int c) {
  int g = gravityDir;
  int pnr, pnc;
  primaryTarget(r, c, g, pnr, pnc);

  // Più l'inclinazione è forte, più il granello tende a "saltare il diretto sotto e
  // scivolare subito lateralmente", simulando lo spostamento della componente di gravità reale
  bool primaryFirst = random01() < (1.0f - fabsf(currentBias) * 0.6f);

  if (primaryFirst) {
    if (tryMove(r, c, pnr, pnc)) return;
  }

  // Scivolamento laterale: componente A (solo riga) / componente B (solo colonna),
  // l'ordine di tentativo è deciso dall'inclinazione
  if (random01() < LATERAL_FRICTION) {
    bool aFirst = random01() < (0.5f - currentBias * 0.5f);
    int arn = r + g, acn = c;      // Componente A: basso-sinistra (o basso-destra, in base al verso di rotazione)
    int brn = r,     bcn = c + g;  // Componente B: l'altro lato

    if (aFirst) {
      if (tryMove(r, c, arn, acn)) return;
      if (tryMove(r, c, brn, bcn)) return;
    } else {
      if (tryMove(r, c, brn, bcn)) return;
      if (tryMove(r, c, arn, acn)) return;
    }
  }

  // Salvaguardia: se a causa dell'inclinazione si è saltato il tentativo diretto verso il basso,
  // qui se ne fa un altro, in modo che se sotto è davvero libero il granello alla fine cada
  // (non resti bloccato dalla logica di inclinazione)
  if (!primaryFirst) {
    tryMove(r, c, pnr, pnc);
  }
}

// Calcolo completo di un frame: scansione inversa "verso valle -> verso monte" della gravità,
// anti-immagine fantasma / anti-caduta troppo veloce
void updateSand() {
  int rStart, rEnd, rStep, cStart, cEnd, cStep;
  if (gravityDir == 1) {
    // Verso valle = righe e colonne più grandi -> da (7,15) verso (0,0)
    rStart = 7; rEnd = -1; rStep = -1;
    cStart = 15; cEnd = -1; cStep = -1;
  } else {
    // Dopo capovolgimento verso valle = righe e colonne più piccole -> da (0,0) verso (7,15)
    rStart = 0; rEnd = 8; rStep = 1;
    cStart = 0; cEnd = 16; cStep = 1;
  }

  for (int r = rStart; r != rEnd; r += rStep) {
    for (int c = cStart; c != cEnd; c += cStep) {
      if (sand[r][c]) moveGrain(r, c);
    }
  }

  // L'inclinazione si avvicina dolcemente al valore obiettivo, così le transizioni di
  // inclinazione/raddrizzamento risultano più fluide, senza scatti
  currentBias += (targetBias - currentBias) * 0.05f;
}

void initHourglass() {
  memset(sand, 0, sizeof(sand));
  int placed = 0;
  // All'accensione il primo segmento è una caduta "dall'alto verso il basso" con dir=-1
  // (modulo 2 -> modulo 1), quindi i granelli iniziali si mettono nel modulo 2 (colonne 8~15).
  // Il riempimento è il mirror del "riempimento originale del modulo 1" rispetto a (r,c)->(7-r,15-c),
  // perfettamente simmetrico rispetto al capovolgimento: all'accensione si è già nello stato
  // corretto di "modulo superiore pieno, sabbia che cade verso il basso".
  for (int r = ROWS - 1; r >= 0 && placed < SAND_TOTAL; r--) {
    for (int c = 15; c >= 8 && placed < SAND_TOTAL; c--) {   // Riempi solo il modulo 2
      sand[r][c] = true;
      placed++;
    }
  }
}

// ================================================================
//                    Stato di pseudo-giroscopio (in assenza di sensore reale)
// ================================================================
struct GyroPhase {
  unsigned long durationMs;
  int8_t        dir;      // Direzione di gravità in questa fase
  float         bias;     // Inclinazione obiettivo in questa fase
  const char*   name;
  float         gx, gz;   // Letture simulate di giroscopio/accelerometro, solo per debug su seriale
};

GyroPhase phases[] = {
  // — Primo segmento: dall'alto verso il basso (dir=-1, modulo 2 -> modulo 1) —
  { 16000, -1,  0.00f, "UPRIGHT_POUR(invertito) caduta stabile in verticale",  0.0f, -1.0f },
  {  4000, -1,  0.85f, "TILT_RIGHT     inclina a destra",          0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          raddrizza",              0.0f, -1.0f },
  {  4000, -1, -0.85f, "TILT_LEFT      inclina a sinistra",         -0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          raddrizza",              0.0f, -1.0f },
  {  1400,  1,  0.00f, "FLIP           capovolgimento completo",      0.0f,  0.2f },
  // — Secondo segmento: dal basso verso l'alto (dir=+1, modulo 1 -> modulo 2) —
  { 16000,  1,  0.00f, "UPRIGHT_POUR   caduta stabile in verticale",     0.0f,  1.0f },
  {  4000,  1,  0.85f, "TILT_RIGHT     inclina a destra",          0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          raddrizza",              0.0f,  1.0f },
  {  4000,  1, -0.85f, "TILT_LEFT      inclina a sinistra",         -0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          raddrizza",              0.0f,  1.0f },
  { 1400, -1,  0.00f, "FLIP           capovolgimento completo",      0.0f, -0.2f },
};
const int NUM_PHASES = sizeof(phases) / sizeof(phases[0]);

int phaseIndex = 0;
unsigned long phaseStartMs = 0;

void updateFakeGyro() {
  unsigned long now = millis();
  if (now - phaseStartMs >= phases[phaseIndex].durationMs) {
    phaseIndex = (phaseIndex + 1) % NUM_PHASES;
    phaseStartMs = now;

    gravityDir = phases[phaseIndex].dir;
    targetBias = phases[phaseIndex].bias;

    Serial.print("[GYRO STATE] -> ");
    Serial.print(phases[phaseIndex].name);
    Serial.print("   gx=");
    Serial.print(phases[phaseIndex].gx, 2);
    Serial.print("g  gz=");
    Serial.println(phases[phaseIndex].gz, 2);
  }
}

// ================================================================
//                          Renderizza sulla matrice
// ================================================================
void render() {
  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::OFF);   // Disabilita l'auto-refresh: si aggiorna tutto in un colpo solo alla fine, per evitare sfarfallii
  mx.clear();

  for (int r = 0; r < ROWS; r++) {
    for (int c = 0; c < COLS; c++) {
      if (!sand[r][c]) continue;

      int dispRow = FLIP_ROW ? (7 - r) : r;
      int dispCol = c;
      if (SWAP_MODULE_ORDER) {
        dispCol = (c < 8) ? (c + 8) : (c - 8);
      }
      mx.setPoint(dispRow, dispCol, true);
    }
  }

  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::ON);
}

// ================================================================
//                             Programma principale
// ================================================================
void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  mx.begin();
  mx.control(MD_MAX72XX::INTENSITY, 5);   // Luminosità 0~15, regolabile
  mx.clear();

  initHourglass();

  phaseIndex = 0;
  phaseStartMs = millis();
  gravityDir = phases[0].dir;
  targetBias = phases[0].bias;
  currentBias = 0;

  lastTickMs = millis();

  Serial.println("=== Clessidra elettronica ESP32 doppio 8x8 MAX7219 avviata ===");
  Serial.print("[GYRO STATE] -> ");
  Serial.println(phases[0].name);
}

void loop() {
  unsigned long now = millis();

  updateFakeGyro();     // Pilota la macchina a stati / pseudo-giroscopio

  if (now - lastTickMs >= TICK_MS) {
    lastTickMs = now;
    updateSand();        // Calcola un frame fisico
    render();             // Mostra sulla matrice
  }
}
```

### Spiegazione del codice

Il codice sembra lungo, ma in realtà si divide in tre blocchi:

**Primo passo, "saldate" le due matrici in un sistema di coordinate della clessidra.** `MD_MAX72XX` vede naturalmente i due moduli come una grande griglia 8 righe × 16 colonne, ma fisicamente i due moduli sono ruotati di 45° e poi uniti, e solo la coppia di celle `(7,7)` e `(0,8)` è davvero adiacente — è il "collo della clessidra" definito da `NECK_A / NECK_B`, e `isNeckPair()` serve proprio a far la guardia a questo varco, impedendo ai granelli di "tagliare la strada" tra i moduli altrove.

**Secondo passo, fate in modo che i granelli cadano cella dopo cella con disciplina.** `moveGrain()` prima tenta la destinazione direttamente in basso, e solo se è bloccata scivola lateralmente in base all'inclinazione corrente; `updateSand()` invece scorre la griglia rigorosamente in ordine "prima verso valle", per evitare che due granelli si contendano la stessa cella nello stesso frame. È la parte più interessante di tutto il codice: con una regola molto semplice (prima in basso, poi scivolamento laterale, quindi una salvaguardia) si ricostruisce una fisica apparentemente complessa come "la sabbia si accumula con un angolo naturale".

**Terzo passo, "alimentate" i parametri con la macchina a stati di pseudo-giroscopio.** L'array `phases[]` mette in fila, in ordine di tempo, un'intera sequenza di configurazioni (verticale, inclinazione, raddrizzamento, capovolgimento), e `updateFakeGyro()` non è altro che un timer: allo scadere passa alla fase successiva e aggiorna `gravityDir` e `targetBias`. Quando collegherete un vero giroscopio, basterà sostituire queste due variabili con l'angolo calcolato in tempo reale dal sensore, senza dover toccare in alcun modo il motore fisico.

## Risoluzione dei problemi più comuni

Niente panico: il 90% dei problemi dipende da questi pochi punti:

**La matrice resta completamente spenta**
Per prima cosa verificate che VCC/GND non siano invertiti o allentati, poi controllate che `DATA_PIN`/`CLK_PIN`/`CS_PIN` corrispondano ai collegamenti reali (in questo articolo, di default, 23/18/5).

**L'immagine è capovolta o i due moduli risultano scambiati**
Non serve ricollegare nulla: modificate le macro `FLIP_ROW` o `SWAP_MODULE_ORDER` nel codice e ricaricate lo sketch.

**I granelli si "fondono" in una macchia e il movimento è troppo veloce**
Aumentate `TICK_MS` dal valore predefinito di 130 a 150~180: il flusso rallenterà in modo evidente e sembrerà più granuloso.

**Errore di compilazione: non trova `MD_MAX72xx.h`**
Significa che la libreria non è installata: tornate nel Library Manager e reinstallate `MD_MAX72xx` (attenzione a maiuscole/minuscole e ortografia).

**I granelli si bloccano al collo (riga 7 colonna 7 o riga 0 colonna 8) e non cadono**
Molto probabilmente `HARDWARE_TYPE` ha il modello sbagliato: i moduli MAX7219 possono essere di diversi tipi (`FC16_HW`, `GENERIC_HW`, `PAROLA_HW`, ecc.); quando i collegamenti sono corretti ma la visualizzazione è confusa, provateli a turno.

**All'accensione compaiono caratteri casuali o riavvii occasionali**
Verificate che i cavetti jumper facciano buono contatto, in particolare con breadboard o fili lunghi; meglio tenere corta la catena daisy-chain.

## Domande frequenti (FAQ)

**D: È obbligatorio usare i pin GPIO23/18/5 per collegare l'ESP32 al MAX7219?**
R: No. Il codice di questo articolo usa un SPI implementato in software (al costruttore si passano direttamente i tre pin DATA/CLK/CS), quindi è sufficiente cambiare i tre `#define` per usare qualsiasi altro GPIO libero, senza essere vincolati ai pin dell'SPI hardware.

**D: Quanti moduli MAX7219 si possono mettere in catena al massimo?**
R: In teoria il chip ne supporta diverse decine; in pratica si è limitati dal refresh rate e dall'integrità del segnale. Nella maggior parte dei progetti 4~8 moduli sono stabili; in questo articolo se ne usano 2, quindi basta cambiare `MAX_DEVICES` nel valore corrispondente e cablare correttamente la catena.

**D: Quale `HARDWARE_TYPE` scegliere?**
R: Dipende dalla serigrafia interna del modulo acquistato; i due più comuni sono `FC16_HW` e `GENERIC_HW`. Sbagliare non brucia nulla: al massimo la visualizzazione risulta sfasata o speculare. Senza toccare i collegamenti, basta cambiare questa macro e ricaricare lo sketch.

**D: Perché la matrice mostra sempre caratteri casuali o resta vuota?**
R: Prima guardate se nel Monitor Seriale compaiono i log `[GYRO STATE]`: se ci sono, il programma gira ed è un problema di mappatura di visualizzazione (`FLIP_ROW`/`SWAP_MODULE_ORDER`/`HARDWARE_TYPE`); se non ci sono, lo sketch non gira: controllate alimentazione e caricamento.

**D: Si può aggiungere un vero giroscopio per ottenere una versione "sensibile all'inclinazione"?**
R: Sì, il codice ha già l'interfaccia predisposta. Basta aggiungere un sensore come l'MPU6050, leggere l'inclinazione in tempo reale e sostituire l'assegnazione di `gravityDir` e `targetBias` dentro `updateFakeGyro()`: il motore fisico resta invariato.

**D: Qual è il consumo complessivo e si può alimentare con un power bank?**
R: Due moduli 8×8 a luminosità media (livello 5 di default nel codice) assorbono in genere nell'ordine delle centinaia di milliampere; un power bank o un caricabatterie da 5V/1A è più che sufficiente. Se aumentate la luminosità o aggiungete altri moduli, conviene un adattatore con corrente più elevata, per non sovraccaricare a lungo il pin a 5V dell'ESP32.

## Estensioni

- Collegare un vero giroscopio MPU6050 per far capovolgere la clessidra in base all'inclinazione della mano, dicendo addio allo script dello "pseudo-giroscopio"
- Usare altri moduli MAX7219 per comporre una matrice più grande e riprodurre semplici animazioni o testo scorrevole
- Aggiungere un cicalino che suoni quando la sabbia è finita, trasformandola in un vero timer
- Aggiungere un pulsante per mettere in pausa o capovolgere manualmente, senza dover attendere il cambio automatico della macchina a stati

## Riferimenti

- [Scheda tecnica ufficiale MAX7219/MAX7221 (Analog Devices / Maxim Integrated)](https://www.analog.com/media/en/technical-documentation/data-sheets/max7219-max7221.pdf)
- [Pagina GitHub della libreria open source MD_MAX72xx](https://github.com/MajicDesigns/MD_MAX72XX) (include l'esempio ufficiale Hourglass, utile per confronti)
- Documentazione ufficiale dei prodotti e dei pin ESP32 (sito Espressif)
