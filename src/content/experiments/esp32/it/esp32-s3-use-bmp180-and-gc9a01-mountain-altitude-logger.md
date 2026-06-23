---
title: "ESP32-S3 con display circolare GC9A01 + BMP180: tutorial completo per un data logger di altitudine da montagna fai-da-te (SPI + I2C + Arduino)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/bmp180
category: esp32
date: 2026-06-23
intro: "Usa l'ESP32-S3 per pilotare un display circolare a colori GC9A01 da 1.28 pollici, abbinato al sensore barometrico BMP180, per realizzare un registratore di altitudine da montagna con sfondo montano dinamico, altitudine in tempo reale, dislivello cumulato e pressione atmosferica. Include codice Arduino completo e schema dei collegamenti."
image: "https://img.lingflux.com/2026/06/cc83e55f42460646d2fd372496989222.jpg"
---


> Difficoltà: ⭐⭐⭐☆☆ (se hai saldato un paio di jumper Dupont, sei a posto)
> Tempo stimato: 45 minuti
> Ambiente di test: Arduino IDE 2.3.2 · Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · ESP32 Arduino Core 3.0.x

---

> **TL;DR (per iniziare subito):**
> 1. **Collegare il display**: GC9A01 → CS/GPIO9, DC/GPIO10, SCK/GPIO12, MOSI/GPIO11, RST/GPIO18, BL/GPIO7
> 2. **Collegare il sensore**: BMP180 → SDA/GPIO13, SCL/GPIO14
> 3. **Il retroilluminazione va forzata alta**: nel `setup()` inserire `digitalWrite(TFT_BL, HIGH)`, senza questa riga lo schermo resta sempre nero
> 4. **Installare due librerie**: Arduino_GFX_Library (autore moononournation) + Adafruit BMP085 Library
> 5. **Caricare direttamente**, aprire il Monitor Seriale (115200): quando compare `inizializzazione completata, ingresso nel loop principale` è andato

---

## Premessa

Mi piace molto fare trekking, ma ultimamente riesco a salire solo sul Baiyun Mountain. Nello zaino ci finiscono power bank, telefono, crema solare, ma nemmeno un aggeggio che mi dica in tempo reale "quanti metri hai già salito". Le app del telefono vogliono la connessione, il segnale GPS va e viene, e ogni volta che tiro fuori lo smartphone ho la fastidiosa sensazione di "essere lì per fare la foto di rito". Così ho deciso di costruirmi un registratore di altitudine da montagna.

Tornato a casa, frugando nella scatola dei componenti ho trovato un display circolare GC9A01 che prendeva polvere da un pezzo: quella forma rotonda assomiglia tantissimo al quadrante di un orologio da alpinismo. Aggiungendo un sensore barometrico BMP180 e un ESP32-S3, tre soli pezzi per meno di 50 yuan (pochi euro): il risultato è molto meglio di quanto mi aspettassi.

Obiettivo di questo articolo: partire da zero, collegare questi tre componenti, caricare il codice e ottenere un registratore di altitudine che mostri in tempo reale altitudine, dislivello cumulato in salita/discesa e pressione, con uno sfondo montano che cambia colore in base alla quota. Seguendo passo passo riuscirete a riprodurlo.

---

## Risultato finale

Risultato: il display circolare GC9A01 mostra in tempo reale l'altitudine attuale (m), il dislivello cumulato in salita (freccia arancione verso l'alto), il dislivello cumulato in discesa (freccia blu verso il basso) e la pressione atmosferica istantanea. Lo sfondo è un paesaggio montano che cambia dinamicamente colore in base alla quota: alle basse altitudini prevale un marrone caldo, alle alte quote sfuma nel blu scuro, e la linea delle nevi eterne scende man mano che si sale. Sul bordo dello schermo un anello dorato di avanzamento traccia il progresso; tenendo premuto il tasto BOOT per 2 secondi si azzera e si ricalibra.

![](https://img.lingflux.com/2026/06/9cedc6308f5ac8b32bb260be186b9298.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/BbqvEXOn6Xo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Descrizione dei componenti

> L'ESP32-S3 non ha bisogno di presentazioni: se siete arrivati a leggere questo articolo, vuol dire che avete già usato un ESP32. Qui parliamo solo degli altri due comprimari.

### Sensore barometrico BMP180

Il BMP180 è un sensore di pressione MEMS: misura la pressione atmosferica e da questa risale all'altitudine. In questo progetto campiona pressione e altitudine una volta al secondo, fornendo i dati a tutta la plancia.

Per capirci: è come una "mini stazione meteo tascabile": misurando la pressione atmosferica ricava a quale altezza ti trovi. Il principio è lo stesso per cui, in aereo durante salita e discesa, ti si tappano le orecchie: minore pressione, maggiore altitudine. Poiché la temperatura influenza la lettura della pressione, il sensore integra anche un termometro per la correzione e restituire dati di altitudine più precisi.

| Parametro | Valore |
| --- | --- |
| Tensione di lavoro | 1.8 V – 3.6 V (alimentare a 3.3 V) |
| Protocollo di comunicazione | I2C (indirizzo fisso 0x77) |
| Range di pressione | 300 – 1100 hPa |
| Precisione altitudine | modalità standard ±1 m, modalità ad alta precisione ±0.5 m |
| Assorbimento di corrente | 0.1 µA in standby; 650 µA di picco (durante la conversione); 3–32 µA medi a 1 Hz (in base alla modalità) |

Perché l'ho scelto: modulo economico, libreria Adafruit ben supportata, precisione più che sufficiente per registrare un'escursione. Se serve maggiore precisione o anche i dati di umidità, si può passare al BMP280 o al BME280, ma quella è un'altra storia.

### Display TFT circolare a colori GC9A01

Il GC9A01 è il controller IC del display TFT a colori circolare da 1.28 pollici: riceve i dati via SPI e pilota un pannello circolare da 240×240 pixel. In questo progetto si occupa di renderizzare lo sfondo montano dinamico e i dati di altitudine in tempo reale.

Per capirci: immaginate il quadrante rotondo di uno smartwatch, è esattamente questo. Comunica via SPI, ha una frequenza di aggiornamento veloce e la forma circolare si presta in modo naturale a una plancia; con il doppio buffer Canvas di Arduino_GFX_Library le animazioni risultano fluidissime e senza sfarfallii.

| Parametro | Valore |
| --- | --- |
| Dimensione display | 1.28 pollici (circolare) |
| Risoluzione | 240 × 240 pixel |
| Controller IC | GC9A01 |
| Interfaccia | SPI (fino a 80 MHz) |
| Tensione di lavoro | 3.3 V |
| Profondità colore | 16 bit RGB565 (65536 colori) |

Perché l'ho scelto: il display circolare sposa alla perfezione il tema "orologio da montagna", il diametro basta appena per inserire l'altitudine a caratteri grandi, gli indicatori di salita/discesa e l'anello di avanzamento senza affollare lo schermo.

---

## Lista componenti (BOM)

| Componente | Modello / Specifiche | Quantità |
| --- | --- | --- |
| Scheda di sviluppo | ESP32-S3 (consigliata la versione con USB-C) | 1 |
| Sensore di pressione | Modulo BMP180 (modulo con resistori di pull-up I2C già montati) | 1 |
| Display a colori circolare | GC9A01 TFT 1.28", 240×240 | 1 |
| Cavi di collegamento | Jumper Dupont (femmina-femmina) | alcuni |
| Alimentazione | Cavo dati USB-C + computer / alimentatore | 1 |

---

## Descrizione dei pin dei componenti

### Pin del GC9A01

| Pin del display | Funzione |
| --- | --- |
| VCC | Polo positivo alimentazione, collegare a 3.3 V |
| GND | Polo negativo alimentazione |
| SCL / CLK | Linea di clock SPI |
| SDA / MOSI | Linea dati SPI (master→slave) |
| CS | Chip select (attivo basso) |
| DC | Selezione dato / comando |
| RST | Reset (attivato a livello basso) |
| BL | Controllo retroilluminazione, **si accende solo con livello alto** |

### Pin del BMP180

| Pin del sensore | Funzione |
| --- | --- |
| VCC | Polo positivo alimentazione, collegare a 3.3 V |
| GND | Polo negativo alimentazione |
| SCL | Linea di clock I2C |
| SDA | Linea dati I2C |

---

## Schema dei collegamenti

### GC9A01 → ESP32-S3

| Pin GC9A01 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL (retroilluminazione) | GPIO 7 |

### BMP180 → ESP32-S3

| Pin BMP180 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL | GPIO 14 |
| SDA | GPIO 13 |



> **Dopo aver cablato tutto, conviene ricontrollare i collegamenti uno per uno: risparmia l'80% del tempo di troubleshooting.** Ci sono due punti in cui è facilissimo cadere in trappola: primo, collegare BL (retroilluminazione) a GPIO7 non basta, nel codice serve anche `digitalWrite(TFT_BL, HIGH)` perché si accenda; secondo, SCL/SDA del GC9A01 viaggiano sul bus **SPI**, mentre SCL/SDA del BMP180 viaggiano sul bus **I2C**: i nomi sono uguali ma si tratta di due bus completamente indipendenti e i pin non vanno mai mischiati.

---

## Librerie da installare

Aprire Arduino IDE → Strumenti → Gestione librerie, cercare e installare le seguenti tre:

| Libreria | Autore | Uso |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | Driver del display GC9A01 + rendering Canvas a doppio buffer |
| Adafruit BMP085 Library | Adafruit | Driver del sensore barometrico BMP180 / BMP085 |
| Adafruit Unified Sensor | Adafruit | Dipendenza della libreria precedente, installare insieme |

> **Versioni testate con successo**: Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · Arduino IDE 2.3.2 · ESP32 Arduino Core 3.0.x
> Se usate una vecchia versione di ESP32 Core (serie 1.x), alcune modalità di inizializzazione SPI differiscono leggermente; conviene aggiornare direttamente alla 3.x ed evitare problemi.

---

## Codice completo

```cpp
/*
  ============================================================
  Registratore di altitudine da montagna (Mountain Altitude Logger)
  ============================================================
  Hardware: ESP32-S3 + display circolare GC9A01 (240x240) + sensore barometrico BMP180
  ============================================================
*/

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>

// ===================== Passo 1: definizione di pin e parametri =====================
#define TFT_CS    9    // chip select del display
#define TFT_DC    10   // selezione dato/comando
#define TFT_SCK   12   // clock SPI
#define TFT_MOSI  11   // dati SPI (master→slave)
#define TFT_RST   18   // reset del display
#define TFT_BL    7    // controllo retroilluminazione (si accende a livello alto, va forzata alta!)
#define TFT_MISO  -1   // MISO non serve (scrivo solo sul display, non leggo)

#define BMP_SDA   13   // linea dati I2C del BMP180
#define BMP_SCL   14   // linea di clock I2C del BMP180

#define BTN_PIN   0    // tasto BOOT integrato, pressione lunga 2 secondi per azzerare la calibrazione
#define CALIBRATION_HOLD_MS 2000  // soglia di pressione prolungata (millisecondi)

#define FILTER_SIZE 5     // finestra del filtro a media mobile (media degli ultimi 5 campioni)
#define DEAD_ZONE   0.3f  // zona morta per dislivello cumulato (ignora oscillazioni inferiori a 0.3m)
#define ALT_RANGE_MAX 3000.0f  // altitudine di fondo scala dell'anello di avanzamento (3000m)

// ===================== Passo 2: oggetti driver hardware =====================
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, TFT_MISO);
Arduino_GFX *gfx = new Arduino_GC9A01(bus, TFT_RST, 0 /* orientamento */, true /* modalità IPS */);
// Doppio buffer Canvas: tutto il disegno va prima su un canvas in memoria, infine flush() lo spinge in un colpo solo sul display, eliminando lo sfarfallio
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

Adafruit_BMP085 bmp;

// ===================== Passo 3: struttura dati =====================
struct AltitudeData {
  float currentAltitude = 0;       // altitudine attuale (dopo filtraggio)
  float maxAltitude = 0;           // altitudine massima di questa registrazione
  float totalAscent = 0;           // dislivello cumulato in salita
  float totalDescent = 0;          // dislivello cumulato in discesa
  float currentPressure = 1013.25; // pressione attuale (hPa)

  // Di seguito i "valori visualizzati" usati per l'interpolazione dell'animazione, così i numeri passano in modo fluido senza salti
  float displayedAltitude = 0;
  float displayedAscent = 0;
  float displayedDescent = 0;
  float displayedPressure = 1013.25;
} data;

// Buffer circolare per la media mobile
float altBuffer[FILTER_SIZE] = {0};
int filterIndex = 0;
int filterCount = 0;

// Costanti di colore (inizializzate in setup() con color565() per non occupare risorse in anticipo)
uint16_t COLOR_WHITE, COLOR_BLACK, COLOR_CREAM_GREEN;

// Stato del tasto
unsigned long btnPressStart = 0;
bool btnIsPressed = false;
bool calibrationTriggered = false;


// ============================================================
//                   Modulo 1: lettura del sensore
// ============================================================

void initSensor() {
  Serial.print("[Sensor] Inizializzazione del bus I2C (SDA=");
  Serial.print(BMP_SDA);
  Serial.print(", SCL=");
  Serial.print(BMP_SCL);
  Serial.println(")...");

  Wire.begin(BMP_SDA, BMP_SCL);

  Serial.println("[Sensor] Connessione al sensore BMP180 in corso...");
  if (!bmp.begin()) {
    // Se il programma si blocca qui stampando ERROR, il cablaggio del sensore ha un problema
    // Il display non si accende perché il programma non arriva più avanti
    while (1) {
      Serial.println("[ERROR] Inizializzazione BMP180 fallita! Controllare cablaggio, alimentazione (3.3V) e pin I2C.");
      delay(2000);
    }
  }
  Serial.println("[Sensor] BMP180 connesso con successo!");
}

// Legge una volta da BMP180 la pressione grezza e l'altitudine
void sampleSensor(float &rawAltitude, float &rawPressure) {
  rawPressure = bmp.readPressure() / 100.0f;  // Pa -> hPa
  rawAltitude = bmp.readAltitude(101325);      // 101325 Pa = pressione standard al livello del mare
}


// ============================================================
//                   Modulo 2: elaborazione dati
// ============================================================

// Media mobile: media le ultime FILTER_SIZE letture per ridurre il rumore del sensore
float smoothAltitude(float raw) {
  altBuffer[filterIndex] = raw;
  filterIndex = (filterIndex + 1) % FILTER_SIZE;
  if (filterCount < FILTER_SIZE) filterCount++;

  float sum = 0;
  for (int i = 0; i < filterCount; i++) sum += altBuffer[i];
  return sum / filterCount;
}

// Aggiorna le statistiche: altitudine massima, dislivello cumulato in salita e in discesa
void updateStats(float smoothedAltitude) {
  static bool firstSample = true;
  static float lastAltitude = 0;

  if (firstSample) {
    lastAltitude = smoothedAltitude;
    data.maxAltitude = smoothedAltitude;
    firstSample = false;
  }

  float delta = smoothedAltitude - lastAltitude;
  // Considera solo le variazioni oltre la zona morta, per evitare che le micro-oscillazioni in piano facciano crescere a vuoto il dislivello
  if (delta > DEAD_ZONE) {
    data.totalAscent += delta;
  } else if (delta < -DEAD_ZONE) {
    data.totalDescent += -delta;
  }

  if (smoothedAltitude > data.maxAltitude) {
    data.maxAltitude = smoothedAltitude;
  }

  lastAltitude = smoothedAltitude;
  data.currentAltitude = smoothedAltitude;
}


// ============================================================
//                   Modulo 3: tasto e calibrazione
// ============================================================

void showCalibrationFlash();  // dichiarazione anticipata

// Attivato da pressione prolungata del tasto BOOT: azzera salita/discesa e riparte dall'altitudine attuale come nuovo riferimento
void doCalibration() {
  Serial.println("[Button] Pressione prolungata rilevata, azzeramento e calibrazione altitudine in corso...");
  data.totalAscent = 0;
  data.totalDescent = 0;
  data.displayedAscent = 0;
  data.displayedDescent = 0;
  data.maxAltitude = data.currentAltitude;

  showCalibrationFlash();
  Serial.println("[Button] Calibrazione completata.");
}

// Rileva lo stato del tasto, BOOT è attivo basso
void handleButton() {
  bool pressed = (digitalRead(BTN_PIN) == LOW);

  if (pressed && !btnIsPressed) {
    btnIsPressed = true;
    btnPressStart = millis();
    calibrationTriggered = false;
  } else if (pressed && btnIsPressed) {
    // Pressione prolungata oltre la soglia e non ancora attivata: esegue la calibrazione
    if (!calibrationTriggered && (millis() - btnPressStart >= CALIBRATION_HOLD_MS)) {
      doCalibration();
      calibrationTriggered = true;  // evita attivazioni ripetute durante la stessa pressione prolungata
    }
  } else if (!pressed && btnIsPressed) {
    btnIsPressed = false;
  }
}


// ============================================================
//                   Modulo 4: rendering UI
// ============================================================

// Interpolazione lineare tra due colori RGB565 (t da 0.0 a 1.0)
uint16_t lerpColor(uint16_t colorA, uint16_t colorB, float t) {
  t = constrain(t, 0.0, 1.0);
  uint8_t r1 = (colorA >> 11) & 0x1F, g1 = (colorA >> 5) & 0x3F, b1 = colorA & 0x1F;
  uint8_t r2 = (colorB >> 11) & 0x1F, g2 = (colorB >> 5) & 0x3F, b2 = colorB & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// Disegna lo sfondo del cielo sfumato: alle basse quote un marrone caldo, alle alte un blu che sfuma verso il profondo
void drawSkyBackground(float altitudeRatio) {
  uint16_t topLow     = canvas->color565(176, 196, 210);  // cielo in cima a bassa quota: azzurro tenue
  uint16_t topHigh    = canvas->color565(30, 30, 90);     // cielo in cima ad alta quota: blu scuro
  uint16_t bottomLow  = canvas->color565(210, 200, 180);  // orizzonte a bassa quota: grigio caldo
  uint16_t bottomHigh = canvas->color565(70, 90, 140);    // orizzonte ad alta quota: grigio-bluastro

  uint16_t topColor    = lerpColor(topLow, topHigh, altitudeRatio);
  uint16_t bottomColor = lerpColor(bottomLow, bottomHigh, altitudeRatio);

  for (int y = 0; y < 240; y++) {
    float t = (float)y / 240.0;
    canvas->drawFastHLine(0, y, 240, lerpColor(topColor, bottomColor, t));
  }
}

// Disegna una singola cima (con linea delle nevi); greenFraction controlla la posizione della linea delle nevi: più alta è la quota, più la linea scende
void drawSnowyPeak(int16_t apexX, int16_t apexY, int16_t baseLeftX, int16_t baseRightX,
                    int16_t baseY, uint16_t bodyColor, float greenFraction) {
  canvas->fillTriangle(apexX, apexY, baseLeftX, baseY, baseRightX, baseY, bodyColor);

  greenFraction = constrain(greenFraction, 0.05f, 0.85f);
  int16_t snowY      = apexY + (baseY - apexY) * greenFraction;
  int16_t snowLeftX  = apexX + (baseLeftX - apexX) * greenFraction;
  int16_t snowRightX = apexX + (baseRightX - apexX) * greenFraction;

  canvas->fillTriangle(apexX, apexY, snowLeftX, snowY, snowRightX, snowY, COLOR_CREAM_GREEN);
}

// Disegna tre cime sfalsate a diverse profondità
void drawMountains(float altitudeRatio) {
  float greenRatio = 1.0f - altitudeRatio;  // più alta è la quota, minore è la zona vegetata e più bassa la linea delle nevi

  drawSnowyPeak(60,  110, -20, 140, 240, canvas->color565(60, 75, 65),  greenRatio * 0.7);
  drawSnowyPeak(200, 130, 150, 260, 240, canvas->color565(70, 85, 75),  greenRatio * 0.6);
  drawSnowyPeak(130, 70,  40,  220, 240, canvas->color565(45, 55, 50),  greenRatio);
}

// Disegna un arco (funzione di base per l'anello di avanzamento)
void drawRingArc(int16_t cx, int16_t cy, int16_t radius, int16_t thickness,
                  float startDeg, float endDeg, uint16_t color) {
  for (float deg = startDeg; deg <= endDeg; deg += 1.0) {
    float rad = deg * PI / 180.0;
    int16_t x0 = cx + cos(rad) * (radius - thickness / 2);
    int16_t y0 = cy + sin(rad) * (radius - thickness / 2);
    int16_t x1 = cx + cos(rad) * (radius + thickness / 2);
    int16_t y1 = cy + sin(rad) * (radius + thickness / 2);
    canvas->drawLine(x0, y0, x1, y1, color);
  }
}

// Disegna l'anello di avanzamento dell'altitudine sul bordo dello schermo, accendendo un arco dorato in base alla quota
void drawProgressRing(float altitudeRatio) {
  int16_t cx = 120, cy = 120, radius = 115, thickness = 6;
  // Disegna prima un anello di base grigio
  drawRingArc(cx, cy, radius, thickness, -90, 269, canvas->color565(50, 50, 60));
  // Sovrappone in oro la parte di progresso già salita
  float endAngle = -90 + altitudeRatio * 359.0;
  drawRingArc(cx, cy, radius, thickness, -90, endAngle, canvas->color565(255, 200, 80));
}

// Disegna testo con contorno nero, per evitare che il bianco si confonda con sfondi chiari
void drawTextWithHalo(int16_t x, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  canvas->setTextColor(haloColor);
  // Disegna il contorno spostando di 1 pixel in su, giù, sinistra, destra
  canvas->setCursor(x - 1, y); canvas->print(text);
  canvas->setCursor(x + 1, y); canvas->print(text);
  canvas->setCursor(x, y - 1); canvas->print(text);
  canvas->setCursor(x, y + 1); canvas->print(text);

  canvas->setTextColor(textColor);
  canvas->setCursor(x, y);
  canvas->print(text);
}

// Disegna testo centrato, calcolando automaticamente l'offset in base alla larghezza del testo
void drawCenteredText(int16_t centerX, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  int16_t x1, y1;
  uint16_t w, h;
  canvas->getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  drawTextWithHalo(centerX - w / 2, y, text, textSize, textColor, haloColor);
}

// Disegna la sovrapposizione di tutti i dati testuali
void drawDataOverlay() {
  char buf[32];

  // Caratteri grandi al centro del display: valore dell'altitudine attuale
  sprintf(buf, "%d", (int)round(data.displayedAltitude));
  drawCenteredText(120, 68, buf, 4, COLOR_WHITE, COLOR_BLACK);
  drawCenteredText(120, 104, "m", 2, COLOR_WHITE, COLOR_BLACK);

  // A sinistra: triangolo arancione verso l'alto + dislivello cumulato in salita
  int16_t ascX = 58, ascY = 138;
  canvas->fillTriangle(ascX, ascY - 8, ascX - 7, ascY + 5, ascX + 7, ascY + 5,
                       canvas->color565(255, 140, 60));
  sprintf(buf, "%dm", (int)round(data.displayedAscent));
  drawTextWithHalo(ascX + 13, ascY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // A destra: triangolo blu verso il basso + dislivello cumulato in discesa
  int16_t desX = 150, desY = 138;
  canvas->fillTriangle(desX, desY + 8, desX - 7, desY - 5, desX + 7, desY - 5,
                       canvas->color565(120, 180, 255));
  sprintf(buf, "%dm", (int)round(data.displayedDescent));
  drawTextWithHalo(desX + 13, desY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // In basso a caratteri piccoli: pressione in tempo reale
  sprintf(buf, "Press: %.1f hPa", data.displayedPressure);
  drawCenteredText(120, 162, buf, 1, COLOR_WHITE, COLOR_BLACK);
}

// Funzione di rendering principale: disegna in ordine sfondo -> montagne -> anello di avanzamento -> numeri, infine flush sul display
void renderUI() {
  float altitudeRatio = constrain(data.displayedAltitude / ALT_RANGE_MAX, 0.0f, 1.0f);

  drawSkyBackground(altitudeRatio);
  drawMountains(altitudeRatio);
  drawProgressRing(altitudeRatio);
  drawDataOverlay();

  canvas->flush();  // Spinge in un colpo solo il buffer di memoria del Canvas sul display fisico
}

// Animazione lampeggiante in caso di calibrazione riuscita
void showCalibrationFlash() {
  for (int i = 0; i < 2; i++) {
    canvas->fillScreen(COLOR_WHITE);
    canvas->flush();
    delay(120);

    canvas->fillScreen(COLOR_BLACK);
    canvas->setTextColor(COLOR_WHITE);
    canvas->setTextSize(2);
    canvas->setCursor(48, 112);
    canvas->print("Calibrated!");
    canvas->flush();
    delay(120);
  }
  delay(300);
}


// ============================================================
//                       setup / loop
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- [System] Avvio del registratore di montagna ---");

  // Retroilluminazione forzata alta: senza questo passaggio il display resta sempre nero
  Serial.println("[TFT] Configurazione pin di retroilluminazione...");
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  pinMode(BTN_PIN, INPUT_PULLUP);  // pull-up interno del tasto BOOT

  // Inizializzazione del driver del display
  Serial.println("[TFT] Inizializzazione del Canvas...");
  if (!canvas->begin()) {
    Serial.println("[ERROR] Inizializzazione del driver del display fallita! Verificare la configurazione dei pin SPI.");
  } else {
    Serial.println("[TFT] Driver del display inizializzato con successo.");
  }

  COLOR_WHITE       = canvas->color565(255, 255, 255);
  COLOR_BLACK       = canvas->color565(0, 0, 0);
  COLOR_CREAM_GREEN = canvas->color565(205, 235, 195);  // colore della neve sulle vette (verde-bianco tenue)

  canvas->fillScreen(COLOR_BLACK);
  canvas->flush();

  // Inizializzazione del sensore
  initSensor();

  // Prima lettura all'accensione, per inizializzare tutti i valori visualizzati
  Serial.println("[Sensor] Lettura dei dati iniziali all'accensione...");
  float rawAlt, rawPress;
  sampleSensor(rawAlt, rawPress);

  Serial.print("[Sensor] Lettura all'accensione -> pressione: ");
  Serial.print(rawPress);
  Serial.print(" hPa | altitudine: ");
  Serial.print(rawAlt);
  Serial.println(" m");

  data.currentAltitude   = rawAlt;
  data.maxAltitude       = rawAlt;
  data.displayedAltitude = rawAlt;
  data.currentPressure   = rawPress;
  data.displayedPressure = rawPress;

  // Precompila il buffer del filtro con l'altitudine di partenza, per evitare che all'avvio il valore salti da 0 all'altitudine reale
  for (int i = 0; i < FILTER_SIZE; i++) altBuffer[i] = rawAlt;
  filterCount = FILTER_SIZE;

  Serial.println("--- [System] Inizializzazione completata, ingresso nel loop principale ---");
}

// Timer di campionamento del sensore (una lettura ogni 1 secondo)
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL = 1000;

// Timer di rendering del display (circa 33 fps)
unsigned long lastRenderTime = 0;
const unsigned long RENDER_INTERVAL = 30;

void loop() {
  handleButton();

  unsigned long now = millis();

  // --- Task a bassa frequenza: campionamento del sensore ogni 1 secondo ---
  if (now - lastSampleTime >= SAMPLE_INTERVAL) {
    lastSampleTime = now;

    float rawAltitude, rawPressure;
    sampleSensor(rawAltitude, rawPressure);

    float smoothed = smoothAltitude(rawAltitude);
    updateStats(smoothed);
    data.currentPressure = rawPressure;

    // Log seriale in tempo reale, per verificare in fase di debug il corretto funzionamento del sensore
    Serial.print("[Loop] Grezzo: ");  Serial.print(rawAltitude);
    Serial.print("m | Filtrato: ");  Serial.print(data.currentAltitude);
    Serial.print("m | Pressione: "); Serial.print(data.currentPressure);
    Serial.print(" hPa | Salita: "); Serial.println(data.totalAscent);
  }

  // --- Task ad alta frequenza: rendering UI a circa 33 fps ---
  if (now - lastRenderTime >= RENDER_INTERVAL) {
    lastRenderTime = now;

    // Interpolazione a smoothing esponenziale: fa sì che i numeri visualizzati seguano con fluidità i valori reali; il coefficiente 0.12 controlla la velocità di inseguimento
    data.displayedAltitude += (data.currentAltitude  - data.displayedAltitude) * 0.12f;
    data.displayedAscent   += (data.totalAscent      - data.displayedAscent)   * 0.12f;
    data.displayedDescent  += (data.totalDescent     - data.displayedDescent)  * 0.12f;
    data.displayedPressure += (data.currentPressure  - data.displayedPressure) * 0.12f;

    renderUI();
  }

  delay(2);
}
```

---

## Spiegazione del codice

L'intero codice è suddiviso in quattro moduli, logicamente indipendenti:

**Modulo 1: lettura del sensore** — `initSensor()` inizializza il bus I2C e verifica che il BMP180 sia presente; in caso di fallimento entra in un ciclo infinito che stampa l'errore senza procedere (per localizzare il problema rapidamente). `sampleSensor()` legge ogni volta la pressione grezza (da Pa a hPa) e l'altitudine (calcolata rispetto alla pressione standard al livello del mare di 101325 Pa).

**Modulo 2: elaborazione dati** — `smoothAltitude()` applica una media mobile a 5 punti per ridurre il rumore del sensore; `updateStats()` accumula il dislivello in salita/discesa con una zona morta di 0.3 m, per evitare che le micro-oscillazioni sul pianoro facciano crescere a vuoto i totali.

**Modulo 3: tasto e calibrazione** — `handleButton()` rileva se il tasto BOOT viene tenuto premuto per più di 2000 millisecondi e attiva `doCalibration()`, che azzera salita/discesa e ricomincia le statistiche dall'altitudine attuale come nuovo riferimento. Il flag `calibrationTriggered` impedisce attivazioni multiple durante una singola pressione prolungata.

**Modulo 4: rendering UI** — usa il doppio buffer `Arduino_Canvas`: in ogni frame vengono prima disegnati in memoria lo sfondo sfumato, le vette (con linea delle nevi dinamica), l'anello di avanzamento sul bordo e i numeri; infine `canvas->flush()` spinge tutto in un colpo solo sul display, eliminando del tutto lo sfarfallio del refresh riga per riga. I numeri vengono interpolati con smoothing esponenziale (coefficiente 0.12) per animazioni naturali, non scattose.

Nel `loop()` un doppio timer separa il "campionamento a bassa frequenza (una volta al secondo)" dal "rendering ad alta frequenza (circa 33 fps)", senza che i due si blocchino a vicenda: il risultato è molto fluido.

---

## Risoluzione dei problemi / Errori comuni

Niente panico: il 90% dei problemi sta nei punti che seguono.

**Problema 1: schermo completamente nero, nemmeno la retroilluminazione**

Verificare che nel `setup()` alla riga GPIO 7 sia presente `digitalWrite(TFT_BL, HIGH)`. La retroilluminazione non si accende da sola: senza questa riga lo schermo resta sempre nero. Inoltre accertarsi che VCC sia collegato a 3.3 V e non a 5 V: 5 V brucerebbe il display.

**Problema 2: la retroilluminazione c'è ma schermo tutto bianco o tutto nero, nessuna immagine**

Aprire il Monitor Seriale (baud 115200) e cercare la stringa `[ERROR]`. Se compare `Inizializzazione del driver del display fallita`, i pin SPI sono collegati male: controllare uno per uno i cinque fili CS / DC / SCK / MOSI / RST rispetto alla tabella dei collegamenti.

**Problema 3: la seriale continua a stampare `Inizializzazione BMP180 fallita`, il programma si blocca e lo schermo resta spento**

Se l'inizializzazione del BMP180 fallisce si entra in un ciclo infinito e il display non si accende. La causa nel 99% dei casi è il cablaggio I2C: SDA su GPIO13, SCL su GPIO14, alimentazione a 3.3 V e accertarsi che i resistori di pull-up sul modulo siano saldati (i moduli preassemblati li hanno di solito già montati).

**Problema 4: lo schermo funziona, ma l'altitudine è molto diversa da quella reale**

Il BMP180 calcola l'altitudine rispetto alla pressione standard al livello del mare (101325 Pa); la pressione locale reale varia con il meteo, quindi uno scarto di ±30 m è del tutto normale. Se conoscete l'altitudine esatta in cui vi trovate, potete sostituire il parametro di `bmp.readAltitude(101325)` con la pressione QNH al livello del mare misurata localmente (in Pa, ricavabile da un'app meteo; conversione: hPa × 100 = Pa).

**Problema 5: il dislivello cumulato in salita continua a crescere, anche se sono fermo**

Il rumore del sensore supera la zona morta (0.3 m). Si può aumentare `DEAD_ZONE` nel codice, per esempio a `0.8f` o `1.0f`; oppure portare `FILTER_SIZE` da 5 a 8 per aumentare lo smoothing: entrambi gli interventi riducono l'incremento fittizio.

**Problema 6: il refresh dello schermo sfarfalla**

Con il doppio buffer Canvas in uso normale non dovrebbe succedere. Se succede comunque, verificare che `canvas->flush()` sia chiamato in fondo a `renderUI()` e che in nessun'altra parte del codice si agisca direttamente su `gfx` scavalcando il Canvas.

---

## FAQ

**D: Posso sostituire il display circolare GC9A01 con un display quadrato di altro modello?**
R: Sì. Arduino_GFX_Library supporta decine di controller di display (ST7789, ILI9341 e altri): basta sostituire il nome della classe nella riga `Arduino_GC9A01` con quella del controller corrispondente, cambiare le dimensioni del Canvas da 240×240 alla risoluzione del nuovo display e il codice UI resta praticamente uguale.

**D: Posso sostituire il BMP180 con un BMP280 o un BME280?**
R: Sì, ma serve cambiare libreria. Per il BMP280 si usa la libreria `Adafruit_BMP280`, per il BME280 la `Adafruit_BME280`; la modalità di chiamata di `readAltitude()` differisce leggermente. Il BMP280 ha precisione maggiore e assorbimento in standby di circa 2.74 µA; il BME280 in più legge l'umidità ed è leggermente più costoso.

**D: Qual è la precisione altimetrica del BMP180? In casa i valori continuano a variare: è normale?**
R: In modalità standard il BMP180 ha precisione ±1 m, in modalità ad alta risoluzione arriva a ±0.5 m. Le oscillazioni delle letture in casa sono del tutto normali: aprire una finestra, chiudere una porta, il flusso del condizionatore provocano micro-variazioni di pressione che si ripercuotono sull'altitudine. Questo progetto adotta una media mobile a 5 punti più una zona morta di 0.3 m per smorzare queste oscillazioni, con buoni risultati nell'uso reale.

**D: L'ESP32-S3 può usare contemporaneamente SPI (display) e I2C (sensore)?**
R: Certo, senza alcun problema. SPI e I2C sono bus periferici indipendenti: in questo progetto il GC9A01 è su SPI (GPIO11/12) e il BMP180 su I2C (GPIO13/14), ciascuno sul proprio bus senza interferenze. L'ESP32-S3 pilota entrambi i bus contemporaneamente senza difficoltà.

**D: Cos'è `Arduino_Canvas` nel codice? Posso rimuoverlo e disegnare direttamente con `gfx`?**
R: `Arduino_Canvas` è il canvas a doppio buffer fornito da Arduino_GFX_Library: tutte le istruzioni di disegno finiscono prima su un canvas virtuale in memoria e, chiamando `flush()`, vengono spinte in un colpo solo sul display, eliminando lo sfarfallio del refresh riga per riga. Rimuoverlo e operare direttamente su `gfx` funziona ancora, ma con uno sfondo sfumato a tutto schermo lo sfarfallio diventa molto evidente e l'esperienza peggiora parecchio: sconsigliato.

**D: L'ESP32-S3 si può alimentare a batteria agli ioni di litio e portare in montagna?**
R: Sì. Una soluzione comune è una batteria Li-ion 3.7 V + modulo di carica/scarica TP4056 + LDO ME6211 per stabilizzare a 3.3 V. Con la configurazione di questo progetto, l'assorbimento complessivo di ESP32-S3 + GC9A01 + BMP180 è di circa 80–120 mA; una batteria da 500 mAh offre in teoria un'autonomia di 4–6 ore, sufficiente per un'escursione diurna. Per maggiore autonomia si può ridurre la luminosità della retroilluminazione (PWM su GPIO7) o allungare l'intervallo di campionamento del sensore.

---

## Spunti di sviluppo

Finita questa versione, ci si può ancora sbizzarrire:

- **Aggiungere una scheda SD per registrare la traccia**: ogni 10 secondi salvare timestamp + altitudine + pressione in un file CSV, da importare poi in un software di tracce GPS per l'analisi dei dati
- **Aggiungere un modulo GPS per il posizionamento integrato**: il BMP180 risente della deriva meteorologica, l'altitudine GPS ha precisione di circa ±10 m ma è più stabile; i due si completano a vicenda
- **Collegare un giroscopio MPU6050 come pedometro**: rilevare il ritmo dei passi per stimarne il numero e trasformare il tutto in un completo computerino da trekking
- **Inviare i dati via BLE al telefono**: usare il BLE dell'ESP32-S3 per spedire i dati in tempo reale a un'app, da affiancare alla mappa per mostrare la traccia completa

---

## Riferimenti

- [Datasheet ufficiale BMP180 (Bosch Sensortec)](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp180-ds000.pdf)
- [Datasheet del controller GC9A01 (Galaxycore)](http://www.galaxycore.com/file/pdf/GC9A01A.pdf)
- [Pagina GitHub di Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Pagina GitHub di Adafruit BMP085 Library](https://github.com/adafruit/Adafruit-BMP085-Library)
- [Pagina prodotto ufficiale Espressif ESP32-S3](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
