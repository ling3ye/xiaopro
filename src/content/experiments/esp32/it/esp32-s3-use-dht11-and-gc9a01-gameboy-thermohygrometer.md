---
title: "Display tondo DHT11 + GC9A01: termoigrometro pixel retro stile Game Boy | cablaggio SPI + codice Arduino completo su ESP32-S3"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/dht11
category: esp32
date: 2026-06-18
intro: "Usa l'ESP32-S3 per pilotare il display tondo GC9A01 240×240 insieme al sensore DHT11, ricreando la classica palette a quattro toni verde crema del Game Boy DMG: un termoigrometro da scrivania in stile pixel retro che lampeggia per segnalare allarmi. Inclusi tabella di cablaggio completa, installazione librerie Arduino e codice interamente commentato, adatto ai principianti."
image: "https://img.lingflux.com/2026/06/4d154493c9e833bc839cec1050f749f6.jpg"
---

# Display tondo DHT11 + GC9A01: termoigrometro pixel retro stile Game Boy (tutorial completo) (ESP32-S3 · cablaggio SPI · codice Arduino)

---

## TL;DR · Panoramica di tre minuti

> Non hai tempo per leggere tutto? I passaggi chiave sono qui sotto: chi ha già un po' di basi può volare dritto alla meta.
>
> 1. **Cablaggio**: pin dati DHT11 → GPIO 47; display tondo GC9A01 via SPI: SCK→GPIO12, MOSI→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 2. **Installa due librerie**: cerca e installa nell'Arduino IDE `Arduino_GFX_Library` (Moon On Our Nation) e `DHT sensor library` (Adafruit)
> 3. **Incolla il codice completo** a fondo articolo e nell'Arduino IDE seleziona la scheda `ESP32S3 Dev Module`
> 4. **Compila e carica**, attendi circa 30 secondi per il completamento del flash
> 5. **Verifica all'accensione**: il display tondo si illumina con lo sfondo verde crema, la metà superiore mostra la temperatura (°C), la metà inferiore l'umidità (%), con lampeggio di allarme automatico sui valori estremi ✅

---

## Premessa: un termoigrometro che "sa giocare"

A dire il vero ho provato non poche soluzioni per visualizzare temperatura e umidità: grandi display OLED, piccoli display a segmenti, perfino la stampa su seriale… ogni volta che vedevo quei numerini solitari sullo schermo provavo una specie di vuoto, difficile da spiegare. Non che non funzionassero, è che mancavano un po' di **anima**.

Finché un giorno ho tirato fuori il Game Boy della mia infanzia: quel classico schermo giallo-verde crema mi ha improvvisamente ispirato. **Se dobbiamo comunque mostrare dei numeri, perché non farlo in modo un po' più retro, un po' più divertente?**

Così è nato questo progetto: usare un ESP32-S3 per pilotare un LCD tondo GC9A01, abbinato al sensore di temperatura e umidità DHT11, disegnando a mano i font pixel e trasferendo sul display tondo quell'iconica palette a quattro toni di verde del Game Boy DMG, per realizzare un **termoigrometro pixel retro** che, una volta posizionato sulla scrivania, attira inevitabilmente un secondo sguardo.

Niente libreria UI già pronta, niente framework complesso: solo `fillRect()` per "costruire" i numeri pixel su pixel. Questo metodo un po' artigianale è in realtà quello con più carattere.

**Obiettivo di questo articolo**: portare a termine l'intero processo anche partendo da zero, fino a vedere temperatura e umidità in tempo reale sul display tondo GC9A01, con un risultato visivo che sia decisamente d'effetto.

---

## Risultato dell'esperimento

![](https://img.lingflux.com/2026/06/755f0087c027a35770edb0fd87a81a35.jpg)

In una frase: **display tondo 240×240, sfondo verde crema, valori grandi di temperatura e umidità centrati, con transizione fluida al variare dei valori, lampeggio di allarme automatico oltre i limiti, frequenza di circa 30fps, senza alcuno tearing o sfarfallio**.

---

## Descrizione dei componenti

Prima di comprere i pezzi, conosciamo i tre protagonisti di oggi.

### ESP32-S3 · L'unica parte "intelligente" di questo progetto

L'ESP32-S3 è un chip Wi-Fi + Bluetooth dual-mode prodotto da Espressif, ma oggi non useremo le sue capacità di rete, bensì i suoi **GPIO abbondanti, la memoria generosa e un bus SPI sufficientemente veloce**.

> Per capire con un'analogia: se il display tondo GC9A01 è un televisore, l'ESP32-S3 è il decoder che gli infila dentro il segnale con i programmi: tutto il "contenuto" parte da lì, lo schermo si limita a "riprodurlo".

Parametri chiave:
- Frequenza 240 MHz (dual core Xtensa LX7)
- Memoria 512 KB SRAM, con PSRAM opzionale
- Supporta SPI hardware, fino a 80 MHz
- Tensione di lavoro 3.3V, GPIO tolleranti a 3.3V (⚠️ non collegare segnali a 5V)

---

### Display tondo GC9A01 · La fonte del fascino pixel retro

Il GC9A01 è un driver per LCD IPS tondo con risoluzione **240×240**, normalmente realizzato come modulino tondo da circa 1.28 pollici di diametro, con interfaccia SPI standard a 4 fili.

> Per capire con un'analogia: avete presente i quadranti dei vecchi orologi meccanici? Il GC9A01 sostituisce quel quadrante con uno schermo colorato programmabile che può mostrare qualsiasi contenuto — tondo, ed è proprio questa la sua eleganza.

Parametri chiave:
- Risoluzione: 240 × 240 pixel, area visibile circolare
- Interfaccia: SPI a 4 fili (supporta clock fino a 80 MHz)
- Profondità di colore: RGB565 a 16 bit (65536 colori)
- Tensione di lavoro: 3.3V (sia VCC sia la logica sono a 3.3V, **non collegarlo a 5V!**)
- Retroilluminazione: controllata da un pin dedicato (BL), accesa con livello alto

---

### DHT11 · Il vicino un po' ficcanaso

Il DHT11 è un sensore digitale economico che integra temperatura + umidità: con un solo filo dati riporta entrambe le misure, risultando comodissimo da usare.

> Per capire con un'analogia: il DHT11 è come un vicino di casa che vive nella tua stanza e non fa che riferirti "quanti gradi ci sono e quanta acqua c'è nell'aria": la precisione è modesta, ma basta, ed è silenzioso.

Parametri chiave:
- Range di temperatura: 0 ~ 50°C, precisione ±2°C
- Range di umidità: 20% ~ 90% RH, precisione ±5% RH
- Intervallo di campionamento: minimo 1 secondo (nel codice impostato a una lettura ogni 2 secondi)
- Interfaccia dati: protocollo digitale single-bus (variante 1-Wire)
- Tensione di lavoro: 3.3V o 5V entrambi accettati (in questo progetto collegato a 3.3V)

---

## Tabella BOM (lista componenti)

| Componente | Modello / Specifiche | Quantità | Note |
| :--- | :--- | :---: | :--- |
| Scheda di sviluppo | ESP32-S3 Dev Module | 1 | Verifica la presenza della porta USB-C per il flash |
| Display colorato tondo | GC9A01 · 1.28" · 240×240 SPI | 1 | Scegli la versione con pin BL all'acquisto |
| Sensore temperatura/umidità | Modulo DHT11 (versione modulo con resistenza di pull-up) | 1 | Consigliata la versione modulo, evita di dover aggiungere resistenze esterne |
| Cavetti | Ponticelli Dupont (maschio-maschio / maschio-femmina) | alcuni | Tienine pronti entrambi i tipi |

---

## Modalità di cablaggio

### DHT11 → ESP32-S3

| Pin DHT11 | Pin ESP32-S3 | Note |
| :--- | :--- | :--- |
| GND | GND | massa comune |
| VCC | 3V3 | alimentazione sensore (3.3V) |
| DAT (DATA) | GPIO 47 | bus dati |

### Display tondo GC9A01 → ESP32-S3

| Pin GC9A01 | Pin ESP32-S3 | Note |
| :--- | :--- | :--- |
| VCC | 3.3V | alimentazione principale dello schermo (⚠️ collega assolutamente 3.3V, non 5V) |
| GND | GND | massa comune |
| SCL / CLK | GPIO 12 | linea di clock SPI |
| SDA / MOSI | GPIO 11 | linea dati SPI |
| CS | GPIO 9 | segnale di chip select (attivo basso) |
| DC | GPIO 10 | commutazione dati/comando |
| RST | GPIO 18 | reset hardware |
| BL | GPIO 7 | controllo retroilluminazione (potrebbe non esserci questo pin; nel codice viene tenuto alto e sempre acceso; in alternativa si può collegare direttamente a 3.3V) |

> 💡 **Promemoria pratico**: dopo aver completato il cablaggio, non alimentare subito — ricontrolla riga per riga la tabella qui sopra, confermando in particolare che VCC sia collegato a **3.3V e non a 5V** (un GC9A01 collegato a 5V è praticamente da buttare) e che il DAT del DHT11 sia sul GPIO corretto. Chi è già caduto in questa trappola conosce la disperazione di "alimenti e lo schermo non si accende mai più".

---

## Installazione delle librerie necessarie

Apri Arduino IDE, vai su **Strumenti → Gestione librerie** e cerca/installa le seguenti due librerie:

**1. Arduino_GFX_Library**

- Parola chiave di ricerca: `Arduino_GFX`
- Autore: `Moon On Our Nation`
- Funzione: pilota il display tondo GC9A01, include la funzionalità Canvas a doppio buffer (la chiave per eliminare lo sfarfallio)

**2. DHT sensor library**

- Parola chiave di ricerca: `DHT sensor library`
- Autore: `Adafruit`
- Se durante l'installazione viene chiesto "Installare le dipendenze?", seleziona **Install all** (per installare anche Adafruit Unified Sensor)

> Dopo l'installazione conviene riavviare Arduino IDE, per assicurarsi che i file delle librerie vengano caricati correttamente.

---

## Codice completo

Spiegazione della struttura del codice:
- **Fase di inizializzazione**: accensione retroilluminazione → inizializzazione schermo → prima lettura dei dati dal DHT11
- **Ciclo principale**: lettura del sensore ogni 2 secondi, rendering di un frame ogni 33ms (circa 30fps)
- **Meccanismo di rendering**: prima si disegna sulla Canvas in memoria, poi si fa un unico flush sullo schermo, eliminando tearing e sfarfallio
- **Font pixel**: 5×7 per le etichette testuali, 5×9 per i valori grandi, tutto disegnato cella per cella a mano con `fillRect()`
- **Animazione di allarme**: temperatura sopra 35°C o sotto 5°C, umidità sopra 85% o sotto 20%: i numeri lampeggiano a intervalli di 400ms

```cpp
/**
 * ╔══════════════════════════════════════════════════╗
 * ║   Termoigrometro tondo ESP32-S3 · GAME BOY pixel  ║
 * ║   Hardware: ESP32-S3 + GC9A01(240×240) + DHT11    ║
 * ║   Librerie: Arduino_GFX_Library + DHT(Adafruit)   ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Schema colore — quattro toni di verde classici del Game Boy DMG:
 *   PAL_BG      #CADC9F  verde-giallo crema (colore di sfondo, fonte della nostalgia)
 *   PAL_LITE    #9BBC0F  verde più chiaro   (decorazioni in evidenza)
 *   PAL_MID     #8BAC0F  verde chiaro       (puntini decorativi)
 *   PAL_DARK    #306230  verde medio        (testo etichette / linee separatorie)
 *   PAL_DARKEST #0F380F  verde scuro        (numeri principali / cornice, massimo contrasto)
 *
 * Logica di allarme (tecnica classica delle macchine monocromatiche):
 *   Temperatura >35°C o <5°C → il numero lampeggia a intervalli di 400ms
 *   Umidità >85% o <20%  → come sopra
 */

#include <Arduino_GFX_Library.h>
#include <DHT.h>

// ══════════════════════════════════════════
// Passo 1: definizione dei pin
//   Cambia i numeri qui per cambiare pin, senza toccare altro
// ══════════════════════════════════════════
#define DHTPIN    47      // pin dati DHT11
#define DHTTYPE   DHT11

#define TFT_SCK   12     // clock SPI GC9A01
#define TFT_MOSI  11     // dati SPI GC9A01
#define TFT_CS    9      // chip select GC9A01
#define TFT_DC    10     // dati/comando GC9A01
#define TFT_RST   18     // reset hardware GC9A01
#define TFT_BL    7      // retroilluminazione GC9A01 (HIGH = accesa)

// ══════════════════════════════════════════
// Passo 2: palette a quattro toni di verde Game Boy (DMG)
//   Formato colore: RGB565 (16 bit)
//   Non cambiare i colori qui, altrimenti non è più stile Game Boy :)
// ══════════════════════════════════════════
#define PAL_BG       0xCF69   // verde-giallo crema — colore di sfondo
#define PAL_LITE     0x9DC2   // verde più chiaro   — decorazioni in evidenza (per ora poco usato)
#define PAL_MID      0x8D42   // verde chiaro       — puntino lampeggiante nella barra superiore
#define PAL_DARK     0x3306   // verde medio        — etichette/linee separatorie
#define PAL_DARKEST  0x11C2   // verde scuro        — numeri principali/cornice

// ══════════════════════════════════════════
// Passo 3: costanti dello schermo e fattori di scala del font
// ══════════════════════════════════════════
#define CX  120        // centro X (al centro dello schermo)
#define CY  120        // centro Y (al centro dello schermo)

#define BOLD_SCALE  6  // fattore di scala dei numeri grandi (glifo 5×9 × 6 = 30×54 pixel)
#define DOT_INSET   1  // ogni cella pixel rientra di 1px, lasciando una fessura del colore di sfondo, per un effetto griglia a punti
#define UNIT_SCALE  2  // dimensione del carattere dell'unità (°C / %)
#define LBL_SCALE   2  // dimensione del carattere dell'etichetta (TEMP / HUM)

// ══════════════════════════════════════════
// Passo 4: inizializzazione degli oggetti hardware
// ══════════════════════════════════════════
DHT dht(DHTPIN, DHTTYPE);

// Bus SPI hardware
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, GFX_NOT_DEFINED);

// Driver GC9A01 (l'ultimo parametro true = nessuna rotazione, colori correlati all'inversione)
Arduino_GFX *display = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Doppio buffer Canvas: disegna prima un frame completo in memoria, flush() lo invia in una volta sola allo schermo
//   È il metodo chiave per eliminare lo sfarfallio, simile al rendering off-screen dei motori di gioco
Arduino_GFX *gfx = new Arduino_Canvas(240, 240, display);

// ══════════════════════════════════════════
// Variabili di stato globali
// ══════════════════════════════════════════
float g_temp = 0, g_hum = 0;          // letture reali del sensore
float g_dispTemp = 0, g_dispHum = 0;  // valori mostrati sullo schermo (con transizione fluida, per evitare salti dei numeri)
bool  g_hasData = false;              // se è stato ottenuto almeno un dato valido

// ══════════════════════════════════════════
// Prototipi di funzione (dicono al compilatore "qui sotto ci sono queste funzioni")
// ══════════════════════════════════════════
const uint8_t* glyph(char ch);
int16_t  pixelAdvance(char ch, uint8_t scale);
int16_t  pixelTextWidth(const char *s, uint8_t scale);
void     drawPixelText(const char *s, int16_t x, int16_t y,
                       uint8_t scale, uint16_t c);
void     drawCenteredPixel(const char *s, int16_t y,
                           uint8_t scale, uint16_t c);
const uint8_t* boldGlyph(char ch);
int16_t  boldAdvance(char ch, uint8_t scale);
int16_t  boldTextWidth(const char *s, uint8_t scale);
void     drawBoldText(const char *s, int16_t x, int16_t y,
                      uint8_t scale, uint16_t c);
void     drawBezel();
void     drawTopBar(unsigned long t);
void     drawValue(const char *num, const char *unit,
                   int16_t yTop, uint16_t col);
void     drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c);
uint16_t tempColor(unsigned long t);
uint16_t humColor(unsigned long t);
void     drawScene(unsigned long t);

// ══════════════════════════════════════════
// setup() — eseguito una sola volta all'accensione
// ══════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=============================");
  Serial.println("  Termoigrometro pixel GAME BOY");
  Serial.println("=============================");

  // 1. Accendi la retroilluminazione
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 2. Inizializza lo schermo
  if (!gfx->begin()) {
    Serial.println("[ERRORE] Inizializzazione schermo fallita! Controlla il cablaggio e riavvia.");
    while (true) delay(500);   // blocca qui, per evitare di andare oltre a caso
  }
  gfx->fillScreen(PAL_BG);
  gfx->flush();
  Serial.println("[OK] Inizializzazione schermo completata");

  // 3. Inizializza il DHT11, attendi 2 secondi per la stabilizzazione del sensore e poi leggi un valore iniziale
  dht.begin();
  Serial.println("[OK] DHT11 inizializzato, lettura in corso...");
  delay(2000);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    g_temp = g_dispTemp = t;
    g_hum  = g_dispHum  = h;
    g_hasData = true;
    Serial.printf("[DATI] Lettura iniziale T=%.1f°C  H=%.1f%%\n", t, h);
  } else {
    Serial.println("[AVVISO] Lettura iniziale fallita, lo schermo mostra --.- in attesa della prossima lettura valida");
  }
}

// ══════════════════════════════════════════
// loop() — legge il sensore ogni 2 secondi, renderizza un frame ogni 33ms (circa 30fps)
// ══════════════════════════════════════════
unsigned long lastRead  = 0;
unsigned long lastFrame = 0;

void loop() {
  unsigned long now = millis();

  // Leggi il sensore una volta ogni 2 secondi (l'intervallo di campionamento del DHT11 è minimo 1 secondo, 2 secondi è più stabile)
  if (now - lastRead >= 2000) {
    lastRead = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      g_temp = t;
      g_hum  = h;
      g_hasData = true;
      Serial.printf("[DATI] T=%.1f°C  H=%.1f%%\n", t, h);
    } else {
      // In caso di lettura fallita non aggiornare i valori, continua a mostrare l'ultima lettura valida
      Serial.println("[AVVISO] Lettura DHT11 fallita, mantengo il valore precedente");
    }
  }

  // Il valore mostrato segue quello reale con un'interpolazione all'8% (si avvicina gradualmente a ogni frame)
  //   Analogia: come la lancetta di un vecchio quadrante, non salta subito alla nuova posizione
  g_dispTemp += (g_temp - g_dispTemp) * 0.08f;
  g_dispHum  += (g_hum  - g_dispHum)  * 0.08f;

  // Rendering a circa 30fps (un frame ogni 33ms)
  if (now - lastFrame >= 33) {
    lastFrame = now;
    drawScene(now);
    gfx->flush();    // Invia la Canvas in memoria allo schermo fisico in una volta sola
  }
}

// ══════════════════════════════════════════
// drawScene() — renderizza tutto il contenuto di un frame
//   Ordine di disegno: sfondo → cornice circolare → barra superiore → area temperatura → linea separatrice → area umidità
// ══════════════════════════════════════════
void drawScene(unsigned long t) {
  // 1. Pulizia schermo (sfondo verde crema)
  gfx->fillScreen(PAL_BG);

  // 2. Disegna la cornice circolare e i puntini decorativi
  drawBezel();

  // 3. Disegna la barra superiore (titolo + spia di funzionamento)
  drawTopBar(t);

  // 4. Area temperatura
  char num[8];
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispTemp);
  else           strcpy(num, "--.-");       // in assenza di dati mostra un segnaposto

  drawCenteredPixel("TEMP", 44, LBL_SCALE, PAL_DARK);
  drawValue(num, "*C", 62, tempColor(t));   // '*' in questo font corrisponde al cerchietto dei gradi °

  // 5. Linea tratteggiata centrale separatrice
  drawDottedH(80, 160, 118, PAL_DARK);

  // 6. Area umidità
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispHum);
  else           strcpy(num, "--.-");

  drawCenteredPixel("HUM", 124, LBL_SCALE, PAL_DARK);
  drawValue(num, "%", 142, humColor(t));
}

// ──────────────────────────────────────────
// Cornice circolare: bordo doppio verde scuro + quattro quadratini decorativi a 45° sulle diagonali
// ──────────────────────────────────────────
void drawBezel() {
  gfx->drawCircle(CX, CY, 116, PAL_DARKEST);
  gfx->drawCircle(CX, CY, 115, PAL_DARKEST);

  // Quattro piccoli quadratini a 45° sulle diagonali (cos45° ≈ 0.707)
  const int r = 104, d = (int)(r * 0.707f);
  gfx->fillRect(CX + d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // in alto a destra
  gfx->fillRect(CX - d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // in alto a sinistra
  gfx->fillRect(CX + d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // in basso a destra
  gfx->fillRect(CX - d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // in basso a sinistra
}

// ──────────────────────────────────────────
// Barra superiore: titolo centrato "DHT11" + spia lampeggiante a sinistra con cadenza 500ms (indica che il sistema è in esecuzione)
// ──────────────────────────────────────────
void drawTopBar(unsigned long t) {
  drawCenteredPixel("DHT11", 12, 1, PAL_DARK);

  // Puntino lampeggiante (acceso/spento alternati): cambia colore ogni 500ms
  bool on = (t / 500) % 2 == 0;
  uint16_t c = on ? PAL_DARKEST : PAL_MID;
  int16_t tw = pixelTextWidth("DHT11", 1);
  int16_t sx = CX - tw / 2;         // coordinata X dell'estremità sinistra del titolo
  gfx->fillRect(sx - 12, 13, 4, 4, c);
}

// ──────────────────────────────────────────
// Riga del valore: il numero grande è centrato orizzontalmente, l'unità °C/% è un piccolo apice in alto a destra
//   In questo modo il numero resta centrato e non viene spostato dall'unità
// ──────────────────────────────────────────
void drawValue(const char *num, const char *unit,
               int16_t yTop, uint16_t col) {
  int16_t nw = boldTextWidth(num, BOLD_SCALE);
  int16_t sx = CX - nw / 2;                  // X di partenza del numero centrato

  drawBoldText(num, sx, yTop, BOLD_SCALE, col);
  // L'unità è attaccata alla destra del numero, rialzata di 2px, per dare un effetto apice
  drawPixelText(unit, sx + nw + 3, yTop + 2, UNIT_SCALE, col);
}

// ──────────────────────────────────────────
// Linea orizzontale a punti (piccoli quadratini 2×2, intervallo 5px)
// ──────────────────────────────────────────
void drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c) {
  for (int16_t x = x0; x <= x1; x += 5) {
    gfx->fillRect(x, y, 2, 2, c);
  }
}

// ══════════════════════════════════════════
// Mappatura colori — normale = verde scuro; estremo = "lampeggia spento" a intervalli di 400ms come allarme
// ══════════════════════════════════════════
uint16_t tempColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispTemp > 35.0f || g_dispTemp < 5.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;   // spento = stesso colore dello sfondo
  return PAL_DARKEST;
}

uint16_t humColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispHum > 85.0f || g_dispHum < 20.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;
  return PAL_DARKEST;
}

// ══════════════════════════════════════════
// Font pixel 5×7 (per etichette/unità)
//   7 righe per carattere, i 5 bit bassi di ogni riga = colonne 0~4 (bit4 = colonna più a sinistra)
//   Caratteri speciali: '*' corrisponde al cerchietto dei gradi °, '.' viene disegnato come un piccolo quadratino sulla linea di base
// ══════════════════════════════════════════
const uint8_t EMPTY[7] = {0, 0, 0, 0, 0, 0, 0};

const uint8_t* glyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[7]={0x0E,0x11,0x13,0x15,0x19,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[7]={0x04,0x0C,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[7]={0x0E,0x11,0x01,0x02,0x04,0x08,0x1F}; return g; }
    case '3': { static const uint8_t g[7]={0x1F,0x02,0x04,0x02,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[7]={0x02,0x06,0x0A,0x12,0x1F,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[7]={0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E}; return g; }
    case '6': { static const uint8_t g[7]={0x06,0x08,0x10,0x1E,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[7]={0x1F,0x01,0x02,0x04,0x08,0x08,0x08}; return g; }
    case '8': { static const uint8_t g[7]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[7]={0x0E,0x11,0x11,0x1F,0x01,0x02,0x0C}; return g; }
    case '-': { static const uint8_t g[7]={0x00,0x00,0x00,0x0E,0x00,0x00,0x00}; return g; }
    case '%': { static const uint8_t g[7]={0x18,0x18,0x08,0x04,0x02,0x03,0x03}; return g; }
    case '*': { static const uint8_t g[7]={0x00,0x0E,0x11,0x0E,0x00,0x00,0x00}; return g; } // ° cerchietto dei gradi
    case 'C': { static const uint8_t g[7]={0x0E,0x11,0x10,0x10,0x10,0x11,0x0E}; return g; }
    case 'D': { static const uint8_t g[7]={0x1E,0x11,0x11,0x11,0x11,0x11,0x1E}; return g; }
    case 'E': { static const uint8_t g[7]={0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F}; return g; }
    case 'H': { static const uint8_t g[7]={0x11,0x11,0x11,0x1F,0x11,0x11,0x11}; return g; }
    case 'I': { static const uint8_t g[7]={0x0E,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case 'M': { static const uint8_t g[7]={0x11,0x1B,0x15,0x15,0x11,0x11,0x11}; return g; }
    case 'N': { static const uint8_t g[7]={0x11,0x19,0x15,0x13,0x11,0x11,0x11}; return g; }
    case 'O': { static const uint8_t g[7]={0x0E,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case 'P': { static const uint8_t g[7]={0x1E,0x11,0x11,0x1E,0x10,0x10,0x10}; return g; }
    case 'T': { static const uint8_t g[7]={0x1F,0x04,0x04,0x04,0x04,0x04,0x04}; return g; }
    case 'U': { static const uint8_t g[7]={0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    default:  return EMPTY;
  }
}

// Avanzamento di un singolo carattere (larghezza in pixel + spaziatura a destra)
int16_t pixelAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale + (scale >> 1) + gap;   // il punto decimale è più stretto
  return 5 * scale + gap;
}

// Calcola la larghezza totale in pixel di un testo
int16_t pixelTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += pixelAdvance(*s, scale);
  return w;
}

// Disegna un testo a matrice di punti 5×7, cella per cella
void drawPixelText(const char *s, int16_t x, int16_t y,
                   uint8_t scale, uint16_t c) {
  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      gfx->fillRect(x, y + 5 * scale, scale, scale, c);   // il punto decimale è sulla linea di base
      x += 2 * scale + (scale >> 1) + scale;
      continue;
    }
    const uint8_t *g = glyph(ch);
    for (uint8_t r = 0; r < 7; ++r) {
      uint8_t bits = g[r];
      for (uint8_t col = 0; col < 5; ++col) {
        if (bits & (0x10 >> col)) {
          gfx->fillRect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    x += 5 * scale + scale;
  }
}

// Disegna un testo 5×7 centrato orizzontalmente
void drawCenteredPixel(const char *s, int16_t y, uint8_t scale, uint16_t c) {
  int16_t w = pixelTextWidth(s, scale);
  drawPixelText(s, CX - w / 2, y, scale, c);
}

// ══════════════════════════════════════════
// Font numeri grandi a matrice di punti 5×9 (esclusivo per i valori hero di temperatura/umidità)
//
//   Caratteristiche di design:
//   · Ogni cella rientra di DOT_INSET px, lasciando una fessura del colore di sfondo, per un effetto griglia a punti LCD
//   · '2' con spigolo superiore + tratto obliquo a gradini cella per cella + fondo doppio pieno
//   · '5' con cima e fondo come righe piene intere
//   · '.' non passa dalla tabella dei glifi, viene disegnato direttamente da drawBoldText come singola cella sulla linea di base
// ══════════════════════════════════════════
const uint8_t* boldGlyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[9]={0x0C,0x04,0x04,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[9]={0x0E,0x11,0x01,0x02,0x04,0x08,0x10,0x1F,0x1F}; return g; }
    case '3': { static const uint8_t g[9]={0x0E,0x11,0x01,0x01,0x06,0x01,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[9]={0x02,0x06,0x0A,0x12,0x12,0x1F,0x02,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[9]={0x1F,0x10,0x10,0x1E,0x01,0x01,0x01,0x11,0x1F}; return g; }
    case '6': { static const uint8_t g[9]={0x0E,0x11,0x10,0x10,0x1E,0x11,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[9]={0x1F,0x01,0x02,0x02,0x04,0x04,0x08,0x08,0x10}; return g; }
    case '8': { static const uint8_t g[9]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x0F,0x01,0x01,0x11,0x0E}; return g; }
    case '-': { static const uint8_t g[9]={0x00,0x00,0x00,0x00,0x1F,0x00,0x00,0x00,0x00}; return g; }
    default:  return nullptr;
  }
}

// Avanzamento di un singolo carattere del numero grande
int16_t boldAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale;    // punto decimale = 1 cella di larghezza + 1 di spaziatura
  return 5 * scale + gap;
}

// Calcola la larghezza totale del testo del numero grande
int16_t boldTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += boldAdvance(*s, scale);
  return w;
}

// Disegna il numero grande a matrice di punti 5×9 cella per cella (ogni cella rientra di DOT_INSET, lasciando che la fessura mostri il colore di sfondo)
void drawBoldText(const char *s, int16_t x, int16_t y,
                  uint8_t scale, uint16_t c) {
  int8_t dot = scale - 2 * DOT_INSET;      // lato effettivo del quadratino acceso (dopo il rientro)
  if (dot < 1) dot = 1;                    // almeno 1px, non farlo scomparire

  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      // Punto decimale: disegna un singolo quadratino rientrato sulla riga 7 (linea di base)
      gfx->fillRect(x + DOT_INSET, y + 7 * scale + DOT_INSET, dot, dot, c);
      x += 2 * scale;
      continue;
    }
    const uint8_t *g = boldGlyph(ch);
    if (g) {
      for (uint8_t r = 0; r < 9; ++r) {
        uint8_t bits = g[r];
        for (uint8_t col = 0; col < 5; ++col) {
          if (bits & (0x10 >> col)) {
            gfx->fillRect(
              x + col * scale + DOT_INSET,
              y + r   * scale + DOT_INSET,
              dot, dot, c);
          }
        }
      }
    }
    x += 5 * scale + scale;
  }
}
```

---

## Risoluzione dei problemi comuni

Niente panico: il 90% dei problemi dipende da queste cause, e controllandole una per una in genere si risolve:

**Lo schermo dopo l'alimentazione non si accende affatto (nessuna retroilluminazione)**

Probabilmente il pin BL non è collegato bene, oppure la riga `digitalWrite(TFT_BL, HIGH)` nel codice non ha avuto effetto. Controlla prima il cavetto da GPIO7 a BL, poi prova a collegare BL direttamente a 3.3V (ignorando il controllo via codice). Se la retroilluminazione si accende ma lo schermo rimane completamente nero, vedi sotto.

**La retroilluminazione è accesa ma lo schermo è completamente nero, oppure mostra "neve"**

C'è un problema con il cablaggio SPI: controlla in particolare SCK (GPIO12), MOSI (GPIO11), CS (GPIO9) e DC (GPIO10). DC e CS si scambiano facilmente: se questi due sono sbagliati lo schermo resta nero oppure la visualizzazione è completamente sballata. Inoltre, l'ultimo parametro `true/false` del driver GC9A01 controlla l'inversione di colore: se i colori sembrano quelli di una pellicola negativa, cambia `true` in `false` (o viceversa).

**Lo schermo ha una tinta generale sbagliata, non è verde crema**

È un problema di ordine dei byte RGB565. In genere Arduino_GFX_Library lo gestisce, ma se i colori sono completamente sballati puoi provare, nella costruzione di `Arduino_GC9A01`, a sostituire l'ultimo `true` con `false`.

**La seriale continua a stampare `[AVVISO] Lettura DHT11 fallita`**

- Verifica che il pin DAT sia collegato a GPIO47
- Se usi un DHT11 "sciolto" (non in versione modulo), devi collegare una resistenza di pull-up da 10kΩ tra DAT e VCC; le versioni modulo in genere la hanno già saldata
- Il `delay(2000)` dopo `dht.begin()` non va cancellato: il DHT11 ha bisogno di circa 1 secondo di stabilizzazione all'accensione, troppa fretta porta a leggere NaN
- Conferma che VCC sia a 3.3V (in questo progetto); se il tuo DHT11 supporta solo 5V, collega VCC a 5V e inserisci in serie una resistenza tra DAT e GPIO47 come adattatore di livello (oppure passa direttamente a un modulo DHT11, in genere utilizzabile a 3.3V)

**I numeri si aggiornano, ma lo schermo ha un evidente sfarfallio/tearing**

Il doppio buffer Canvas funziona correttamente? Verifica che nel codice non manchi `gfx->flush()` e che **tu disegni usando l'oggetto Canvas `gfx->`, non `display->`**. Inoltre, sull'ESP32-S3 va selezionato il modello di scheda corretto (`ESP32S3 Dev Module`), altrimenti la velocità SPI non sarà quella giusta.

**Errore di compilazione: `'drawScene' was not declared in this scope`**

È un problema di ordine delle dichiarazioni delle funzioni: assicurati che la lista dei prototipi all'inizio del codice contenga `void drawScene(unsigned long t);`, oppure sposta la definizione di `drawScene` prima di `loop()`.

---

## FAQ

**D: I pin GPIO possono essere cambiati con altri numeri?**
R: Sì, basta modificare le definizioni `#define` all'inizio del codice, senza toccare altro. Il DAT del DHT11 può essere collegato a qualsiasi GPIO; per SCK/MOSI del GC9A01 conviene usare i pin predefiniti dell'SPI hardware dell'ESP32-S3 (GPIO 11/12) per ottenere la massima velocità, ma anche altri pin funzionano, purché si configuri un SPI software aggiuntivo.

**D: Posso sostituire il DHT11 con un DHT22?**
R: Assolutamente sì. Basta cambiare la riga 16 del codice in `#define DHTTYPE DHT22`, tutto il resto rimane invariato. Il DHT22 ha precisione maggiore (temperatura ±0.5°C, umidità ±2~5% RH) e un intervallo di campionamento minimo di 2 secondi (nel codice è già impostato a 2 secondi, quindi perfettamente compatibile).

**D: Qual è il clock SPI massimo supportato dal GC9A01?**
R: Le specifiche ufficiali del GC9A01 supportano un clock SPI fino a 100 MHz; in uso reale, con l'ESP32-S3 a 80 MHz in genere non ci sono problemi. Arduino_GFX_Library usa in modo predefinito la massima velocità dell'SPI hardware, senza bisogno di configurazione manuale.

**D: Qual è la tensione dei GPIO dell'ESP32-S3? Si possono collegare direttamente dispositivi a 5V?**
R: I GPIO dell'ESP32-S3 lavorano a 3.3V e **non tollerano segnali a 5V**: collegarli direttamente a dispositivi logici a 5V può danneggiare il chip. Anche il display tondo GC9A01 è un componente a 3.3V. Se alimenti il DHT11 a 5V, il livello alto del pin DAT è di circa 4.5V: conviene usare un partitore resistivo (10kΩ + 20kΩ) o un modulo convertitore di livello per abbassare la tensione.

**D: A quanto ammontano il framerate e l'occupazione di CPU del codice?**
R: Il codice attuale gira a circa 30fps (un frame ogni 33ms), con un tempo di rendering per frame di circa 8~15ms (in funzione della velocità SPI) e un'occupazione di CPU di circa 20~40%. Sul dual core dell'ESP32-S3 l'altro core rimane completamente libero: se serve, si può spostare il task di lettura del sensore sul Core 0 e il rendering sul Core 1, aumentando ulteriormente la fluidità.

**D: Se i valori di temperatura e umidità restano sempre su `--.-` senza aggiornarsi, cosa fare?**
R: Significa che `g_hasData` resta sempre `false`, cioè il DHT11 non ha mai restituito una lettura valida. Procedi in ordine: ① conferma che DAT sia su GPIO47; ② il DHT11 in versione modulo non richiede resistenza di pull-up aggiuntiva, la versione sciolta sì (10kΩ); ③ con il monitor seriale (baud 115200) verifica se esce qualcosa come `[DATI]` o `[AVVISO]`, per capire se il problema è nel sensore o nel cablaggio; ④ conferma la tensione di VCC (consigliata 3.3V).

**D: Cosa significa il parametro `true` nel codice (costruttore GC9A01)?**
R: Il quarto parametro di `new Arduino_GC9A01(bus, TFT_RST, 0, true)` controlla l'inversione di colore (differenza di output RGB tra pannelli IPS e pannelli TN). Con `true` i colori sono normali, con `false` compare un'inversione di colore tipo "effetto pellicola negativa". Se sul tuo schermo i colori sembrano invertiti, cambia `true` in `false`.

---

## Riferimenti

- [Documentazione ed esempi ufficiali di Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Documentazione della libreria Adafruit DHT sensor library](https://github.com/adafruit/DHT-sensor-library)
- [Datasheet del GC9A01 (PDF ufficiale)](https://www.waveshare.com/w/upload/5/5e/GC9A01A.pdf)
- [Specifiche ufficiali del DHT11 (produttore Aosong)](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf)
- [Manuale di riferimento tecnico ESP32-S3 di Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_cn.pdf)
