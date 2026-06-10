---
title: "ESP32-S3 + GC9A01 schermo tondo: bussola con HMC5883L — tutorial completo (e perché non usarla per navigare)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/hmc5883l
category: esp32
date: 2026-06-10
intro: "Ho costruito una bussola elettronica con ESP32-S3 + schermo tondo GC9A01 + HMC5883L, ma alla fine ho scoperto che la precisione lascia a desiderare. Questo articolo documenta per intero cablaggio, calibrazione e codice, spiegando anche perché questa soluzione è adatta solo a dimostrazioni sperimentali e non a applicazioni di navigazione reali."
image: "https://img.lingflux.com/2026/06/79dbcadeea8dba2436b055a92f76fc20.jpg"
---



# ESP32-S3 + GC9A01 + HMC5883L: cronaca di una bussola su schermo tondo — si può fare, è bella, ma la precisione è quel che è (tutorial completo)

Difficoltà: ⭐⭐⭐☆☆ (accessibile con un po' di esperienza)
Tempo stimato: 45 minuti
Ambiente di test: Arduino IDE 2.3.8 · Arduino_GFX_Library v1.6.5 · Adafruit_HMC5883_U v1.2.4

---

> ⚠️ **Conclusione anticipata:** La bussola realizzata con questa soluzione ha un aspetto molto accattivante e la direzione generale è corretta, ma la precisione tipica si aggira tra ±5° e ±15°, fortemente influenzata dai campi magnetici circostanti. Va benissimo per imparare le procedure di driver, fare dimostrazioni o usarla come soprammobile da scrivania. Per la navigazione outdoors, orientamento di droni o qualsiasi scenario che richieda precisione rigorosa — **non consigliata**. Più avanti spiego perché.

> **TL;DR (guida rapida):**
> 1. Prima esegui una scansione I2C per confermare l'indirizzo del chip — `0x0D` è il QMC5883L (clone), `0x1E` è il vero HMC5883L; installa la libreria corrispondente al modello, altrimenti le letture saranno tutte errate
> 2. Collega i 12 fili secondo la tabella (8 per lo schermo + 4 per il sensore; 3.3V/GND possono essere condivisi)
> 3. Modifica `DECLINATION_DEG` con la declinazione magnetica della tua città (Pechino circa -6.5°, Tokyo circa -7.5°; link di consultazione alla fine dell'articolo)
> 4. All'accensione tieni premuto il tasto BOOT (GPIO0) per avviare la calibrazione rotazionale di 15 secondi: ruota lentamente di 360° mantenendo il dispositivo in piano
> 5. Rilasciando il tasto, i dati di calibrazione vengono salvati automaticamente in NVS; non si perdono spegnendo e riaccendendo, la prossima volta sono subito disponibili

---

## Premessa

Quando ho comprato questo schermo tondo GC9A01, l'ho guardato per un po' — 1.28 pollici, 240×240, un cerchio perfetto. Non era forse un quadrante da bussola per natura?

Così ho trascorso un fine settimana per realizzarlo, ho aperto la app bussola del telefono per confrontare... beh, la direzione generale dell'ago era giusta, ma c'era una leggera deviazione, circa una decina di gradi. Dopo un paio di giri in più, ho notato che l'ago non si muoveva più. Ho spento e riacceso, e continuava a non girare granché...

"Sicuramente non è calibrato bene." Ho ricalibrato, cambiato posizione di misurazione, fatto girare il dispositivo a confronto con l'iPhone — la differenza era sempre lì. Non era un errore nel codice, ma un limite intrinseco di questo modulo sensore. Si può osservare che anche l'avvicinamento del telefono lo influenza.

Quindi questo articolo ha due scopi: primo, realizzare per intero la bussola su schermo tondo, con codice funzionante, calibrazione superata ed effetto visivo davvero bello; secondo, spiegare chiaramente i suoi limiti di precisione, così saprai "dove si inciampa" prima di iniziare — invece di scoprire dopo che l'ago non coincide con Google Maps.

Se vuoi imparare i metodi di driver per GC9A01 + HMC5883L, o creare un soprammobile da scrivania d'effetto, questo progetto vale assolutamente la pena. Se invece il tuo obiettivo è la "precisione di navigazione", ti consiglio di saltare direttamente alla sezione "Adatto a un progetto serio?" più avanti, e poi decidere se continuare.

---

## Risultato dell'esperimento

![](https://img.lingflux.com/2026/06/61587ad00164cf25e866feb4066e069f.jpg)

Sullo schermo tondo GC9A01 viene visualizzato in tempo reale un quadrante da bussola: l'ago rosso indica il nord, al centro un numero verde mostra l'azimut corrente (0°~359°), lettere gialle indicano la direzione cardinale più vicina tra le otto (N / NE / E / SE / S / SW / W / NW). All'accensione, tenendo premuto il tasto BOOT si accede alla modalità di calibrazione rotazionale di 15 secondi: lo schermo mostra una barra di avanzamento e il range magnetico in tempo reale; completata la calibrazione, il movimento dell'ago è fluido, circa 25 fps, senza le vibrazioni irregolari tipiche della mancanza di calibrazione.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/DDc_7iRCPy8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

> **Sulla precisione, chiariamo subito:** Un HMC5883L calibrato, in condizioni ideali (lontano da metalli e altre fonti magnetiche), ha un errore di azimut di circa ±5°. Avvicinandosi al case del computer, al caricabatterie, alle casse o a un cacciavite, l'errore sale facilmente oltre ±15°. Nell'uso quotidiano su scrivania "la direzione generale è corretta", ma il modulo che ho comprato non so se sia originale, a volte si blocca e non si muove; per la precisione alla decina di gradi non c'è da aspettarsi miracoli. È un limite hardware intrinseco, non un problema di codice; la sezione "Adatto a un progetto serio?" più avanti lo spiega nel dettaglio.

---

## Descrizione dei componenti

**Schermo TFT tondo GC9A01**

Immagina uno schermo da smartwatch circolare con diametro di 3.2 cm — il GC9A01 è esattamente questo: interfaccia SPI, risoluzione 240×240, il driver è integrato nel controller dello schermo e l'ESP32 spinge direttamente i pixel, senza RAM esterna. L'ho scelto perché la forma circolare è naturalmente adatta a una UI tipo bussola, e perché Arduino_GFX_Library offre un supporto completo: bastano poche righe di codice per il driver.

| Parametro | Specifica |
| --- | --- |
| Risoluzione | 240 × 240 px |
| Interfaccia | SPI (fino a 80 MHz) |
| Alimentazione | 3.3V |
| Controllo retroilluminazione | Livello alto per accendere |
| Consumo tipico | Circa 20 mA (massima luminosità) |



**Modulo schermo GC9A01 (8 pin)**

| Etichetta pin | Funzione |
| --- | --- |
| VCC | Alimentazione 3.3V |
| GND | Terra |
| SCL / CLK | Clock SPI |
| SDA / MOSI | Dati SPI (master→slave) |
| CS | Chip select, attivo basso |
| DC | Selezione dato/comando |
| RST | Reset hardware, attivo basso |
| BL | Controllo retroilluminazione, livello alto per accendere |



**Magnetometro a tre assi HMC5883L / QMC5883L**

Il magnetometro è il "naso" della bussola, responsabile di percepire l'intensità del campo magnetico terrestre nelle tre direzioni X/Y/Z, per poi calcolare tramite funzioni trigonometriche inverse la direzione in cui si è orientati. Interfaccia I2C, alimentazione 3.3V, lettura di un dato richiede solo pochi millisecondi.

Va precisato: la stragrande maggioranza dei moduli in vendita etichettati come "HMC5883L" monta in realtà il chip QMC5883L della società QST — i due sono compatibili sui pin, ma i registri sono completamente diversi e richiedono librerie driver differenti. **Non avere fretta di installare la libreria: segui la procedura di scansione I2C descritta sotto per confermare quale chip hai tra le mani, poi installa la libreria corrispondente — risparmierai la maggior parte del tempo di troubleshooting.**

| Parametro | HMC5883L (originale) | QMC5883L (clone) |
| --- | --- | --- |
| Indirizzo I2C | 0x1E | 0x0D |
| Range di misura | ±8 Gauss | ±8 Gauss |
| Risoluzione | 2 mGauss | 2 mGauss |
| Densità di rumore | ~2 mGauss/√Hz | ~2 mGauss/√Hz |



**Modulo magnetometro HMC5883L / QMC5883L (4 pin comunemente usati)**

| Etichetta pin | Funzione |
| --- | --- |
| VCC | Alimentazione 3.3V |
| GND | Terra |
| SDA | Dati I2C |
| SCL | Clock I2C |
| DRDY | Interrupt dati pronti (non usato in questo progetto, può restare scollegato) |

Le prestazioni di base dei due chip sono simili; per dimostrazioni sperimentali vanno entrambi bene. Tuttavia va detto chiaramente: indipendentemente dal chip, un modulo magnetometrico a questo prezzo non ha compensazione della deriva termica on-chip, né fusione sensori, ma solo misurazione magnetica bidimensionale di base — questo determina il suo limite di precisione e anche il fatto che sia adatto solo a dimostrazioni e apprendimento, non ad applicazioni di navigazione reale.

---

## Lista componenti (BOM)

| Componente | Modello / Specifica | Quantità | Prezzo indicativo |
| --- | --- | --- | --- |
| Scheda di sviluppo | ESP32-S3 (qualsiasi scheda) | 1 | ¥25~40 |
| Schermo TFT tondo | GC9A01, 1.28 pollici, 240×240 | 1 | ¥12~20 |
| Modulo magnetometro | HMC5883L o QMC5883L | 1 | ¥3~8 |
| Cavi Dupont | Maschio-femmina, 20cm | Alcuni | ¥3 |

---

## Cablaggio

> Ti consiglio di controllare filo per filo contro la tabella dopo aver collegato tutto. Questo passaggio risolve l'80% dei problemi di "perché non funziona".

**Schermo tondo GC9A01 → ESP32-S3**

| Pin schermo | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (oppure collegato direttamente a 3.3V per retroilluminazione sempre accesa) |

**HMC5883L / QMC5883L → ESP32-S3**

| Pin sensore | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO14 |
| SCL | GPIO13 |



---

## Librerie da installare

Prima di installare, fai una cosa — conferma il modello del tuo chip magnetometrico. Carica il codice seguente, apri il monitor seriale (115200) e guarda l'indirizzo I2C stampato:

```cpp
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(13, 14);  // SDA=13, SCL=14, coerente con questo progetto

  Serial.println("Scansione I2C...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("Trovato dispositivo a 0x%02X\n", addr);
    }
  }
  Serial.println("Fatto.");
}

void loop() {}
```

- Se stampa `0x1E` → è il vero HMC5883L, installa **Adafruit HMC5883 Unified** (di Adafruit)
- Se stampa `0x0D` → è il QMC5883L, devi sostituire nel codice `#include` e l'oggetto sensore con la libreria corrispondente (vedi la FAQ n. 3)

Dopo aver confermato il chip, apri Arduino IDE → Gestore librerie, cerca e installa:

| Nome libreria | Chip compatibile | Versione testata |
| --- | --- | --- |
| Arduino_GFX_Library | — | v1.6.5 |
| Adafruit HMC5883 Unified | HMC5883L (0x1E) | v1.2.4 |
| Adafruit Unified Sensor | Richiesta da entrambi | v1.1.15 |

Se hai un QMC5883L (0x0D), nella sezione FAQ trovi una soluzione alternativa.

---

## Codice completo

```cpp
#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>
#include <Preferences.h>
#include <math.h>

// ─── Passo 1: definizione dei pin ────────────────────────────────
#define TFT_SCK  12
#define TFT_MOSI 11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7
#define I2C_SDA  14
#define I2C_SCL  13

// Tenere premuto questo tasto all'accensione per entrare in modalità calibrazione (tasto BOOT, GPIO0, nessun pulsante aggiuntivo necessario)
#define CAL_BTN   0

// Declinazione magnetica (ovest è negativo) — Strumento di consultazione: https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
// Pechino ≈ -6.5°, Shanghai ≈ -5.5°, Canton ≈ -3°, Tokyo ≈ -7.5°
// Se non modifichi questo valore, la bussola sarà sfasata di X gradi, tutte le direzioni saranno errate
#define DECLINATION_DEG  (-3.0f)

// ─── Passo 2: inizializzazione dell'oggetto display ────────────────────────────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01  *gfx = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas con doppio buffer: si disegna prima un frame intero in memoria, poi lo si invia allo schermo in un'unica volta, risolvendo il problema dello sfarfallio
// Occupazione memoria: 240×240×2 = 115 KB (PSRAM o SRAM interna dell'ESP32-S3 sono sufficienti)
Arduino_Canvas  *canvas = new Arduino_Canvas(240, 240, gfx, 0, 0);

// ─── Oggetto sensore ──────────────────────────────────
Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);

// ─── Parametri di calibrazione (offset ferro duro + scala ferro dolce, salvati in NVS) ───────────────────
Preferences prefs;
float calOffX = 0, calOffY = 0;
float calSclX = 1, calSclY = 1;

// ─── Parametri filtro passa-basso EMA ────────────────────────────
float gSmooth    = 0;
bool  gFirstRead = true;

// alpha più piccolo = più morbido (ma risposta più lenta); per uso su scrivania usare 0.15, per uso manuale in movimento si può salire a 0.25
#define EMA_ALPHA  0.15f

// ─── Definizione colori (formato RGB565) ────────────────────────────────
#define C_BG      0x0000   // Sfondo nero
#define C_RING    0x4208   // Anello esterno grigio scuro
#define C_TICK    0x7BEF   // Piccoli tacche grigie
#define C_MAJOR   0xFFFF   // Tacche principali / etichette bianche
#define C_NORTH   0xF800   // N rosso
#define C_NDL_N   0xF800   // Ago rosso (estremità nord)
#define C_NDL_S   0xCE79   // Ago argento (estremità sud)
#define C_DEG     0x07E0   // Gradi verdi
#define C_DIR     0xFFE0   // Lettere di direzione gialle

const char* kDir[] = {"N","NE","E","SE","S","SW","W","NW"};

#define CX 120   // Centro X
#define CY 120   // Centro Y
#define R  100   // Raggio del quadrante

// ─────────────────────────────────────────────
//  Lettura dell'azimut (con correzione calibrazione ferro duro/dolce)
// ─────────────────────────────────────────────
float readHeading() {
  sensors_event_t ev;
  mag.getEvent(&ev);

  // Sottrae l'offset ferro duro, eliminando le interferenze di campi magnetici fissi circostanti (viti, colonnine, ecc.)
  float x = ev.magnetic.x - calOffX;
  float y = ev.magnetic.y - calOffY;
  // Normalizzazione ferro dolce: mappa la risposta magnetica ellittica di nuovo a forma circolare
  if (calSclX > 0.01f) x /= calSclX;
  if (calSclY > 0.01f) y /= calSclY;

  float h = atan2f(y, x) + DECLINATION_DEG * (float)M_PI / 180.0f;
  if (h <  0)               h += 2.0f * (float)M_PI;
  if (h > 2.0f*(float)M_PI) h -= 2.0f * (float)M_PI;
  return h * 180.0f / (float)M_PI;
}

// ─────────────────────────────────────────────
//  Filtro passa-basso EMA (gestione corretta del salto 0°/360°)
// ─────────────────────────────────────────────
float emaFilter(float newAngle) {
  if (gFirstRead) { gFirstRead = false; return newAngle; }
  float d = newAngle - gSmooth;
  if (d >  180.0f) d -= 360.0f;   // Ad esempio da 359° a 1°, la differenza dovrebbe essere +2°, non -358°
  if (d < -180.0f) d += 360.0f;
  float r = gSmooth + d * EMA_ALPHA;
  if (r <   0.0f) r += 360.0f;
  if (r >= 360.0f) r -= 360.0f;
  return r;
}

// ─────────────────────────────────────────────
//  Rendering frame completo (disegna il frame intero poi lo invia, elimina lo sfarfallio)
// ─────────────────────────────────────────────
void drawFrame(float angle) {
  canvas->fillScreen(C_BG);

  // Anello esterno (4 pixel di larghezza, per dare un effetto bordo al quadrante)
  for (int r = R; r > R - 4; r--)
    canvas->drawCircle(CX, CY, r, C_RING);

  // Tacche: una ogni 10°, allungate ogni 30°, bianche ogni 90°
  for (int deg = 0; deg < 360; deg += 10) {
    float rad = deg * (float)M_PI / 180.0f;
    int   len = (deg % 30 == 0) ? 12 : 6;
    canvas->drawLine(
      CX + (int)(cosf(rad) * (R - 5)),    CY + (int)(sinf(rad) * (R - 5)),
      CX + (int)(cosf(rad) * (R-5-len)),  CY + (int)(sinf(rad) * (R-5-len)),
      (deg % 90 == 0) ? C_MAJOR : C_TICK
    );
  }

  // Etichette N/E/S/W, N in rosso per evidenziarlo
  canvas->setTextSize(2);
  canvas->setTextColor(C_NORTH); canvas->setCursor(CX-6,    CY-R+20);  canvas->print("N");
  canvas->setTextColor(C_MAJOR); canvas->setCursor(CX+R-32, CY-7);     canvas->print("E");
                                 canvas->setCursor(CX-6,    CY+R-32);  canvas->print("S");
                                 canvas->setCursor(CX-R+20, CY-7);     canvas->print("W");

  // Ago (3 pixel di larghezza, più visibile)
  float rad  = angle * (float)M_PI / 180.0f;
  float perp = rad + (float)M_PI / 2.0f;
  int   pdx  = (int)roundf(cosf(perp));
  int   pdy  = (int)roundf(sinf(perp));
  int   nx   = CX + (int)(sinf(rad) * 68);   // Ago rosso (estremità nord)
  int   ny   = CY - (int)(cosf(rad) * 68);
  int   sx   = CX - (int)(sinf(rad) * 42);   // Ago argento (estremità sud, più corto)
  int   sy   = CY + (int)(cosf(rad) * 42);
  for (int d = -1; d <= 1; d++) {
    canvas->drawLine(CX+pdx*d, CY+pdy*d, nx+pdx*d, ny+pdy*d, C_NDL_N);
    canvas->drawLine(CX+pdx*d, CY+pdy*d, sx+pdx*d, sy+pdy*d, C_NDL_S);
  }

  // Piccolo cerchio centrale (decorativo)
  canvas->fillCircle(CX, CY, 9, C_RING);
  canvas->drawCircle(CX, CY, 9, 0xA534);
  canvas->fillCircle(CX, CY, 3, C_MAJOR);

  // Visualizzazione centrale dei gradi (verde) e della direzione cardinale (giallo)
  canvas->setTextSize(2);
  canvas->setTextColor(C_DEG);
  char buf[8]; sprintf(buf, "%3d", (int)angle);
  canvas->setCursor(CX - 18, CY - 14); canvas->print(buf);

  int   idx = ((int)(angle + 22.5f) % 360) / 45;
  int   w   = strlen(kDir[idx]) * 6;
  canvas->setTextSize(1);
  canvas->setTextColor(C_DIR);
  canvas->setCursor(CX - w/2, CY + 6); canvas->print(kDir[idx]);

  canvas->flush();   // ← Invia l'intero frame allo schermo in un'unica volta, questa riga è la chiave per eliminare lo sfarfallio
}

// ─────────────────────────────────────────────
//  Calibrazione rotazionale di 15 secondi
//  Principio: registra i valori massimi/minimi del sensore in tutte le direzioni,
//            calcola l'offset ferro duro (offset) e la scala ferro dolce (scale)
// ─────────────────────────────────────────────
void runCalibration() {
  float minX =  1e6f, maxX = -1e6f;
  float minY =  1e6f, maxY = -1e6f;
  const uint32_t DUR = 15000;
  uint32_t t0 = millis();

  while (millis() - t0 < DUR) {
    sensors_event_t ev; mag.getEvent(&ev);
    if (ev.magnetic.x < minX) minX = ev.magnetic.x;
    if (ev.magnetic.x > maxX) maxX = ev.magnetic.x;
    if (ev.magnetic.y < minY) minY = ev.magnetic.y;
    if (ev.magnetic.y > maxY) maxY = ev.magnetic.y;

    // Visualizzazione in tempo reale della schermata di avanzamento calibrazione
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR);  canvas->setTextSize(2);
    canvas->setCursor(15, 60);  canvas->print("CALIBRATING");
    canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
    canvas->setCursor(8, 95);   canvas->print("Slowly rotate 360 deg");
    canvas->setCursor(18, 109); canvas->print("Keep device level");
    // Barra di avanzamento
    int p = (millis() - t0) * (R*2-2) / DUR;
    canvas->drawRect(20, 130, R*2, 14, C_MAJOR);
    canvas->fillRect(21, 131, p, 12, 0x07E0);
    // Visualizzazione in tempo reale del range magnetico (aiuta a confermare se si è compiuto un giro completo)
    char b[44];
    canvas->setTextColor(0x7BEF);
    sprintf(b, "X[%.1f ~ %.1f]", minX, maxX);
    canvas->setCursor(8, 157); canvas->print(b);
    sprintf(b, "Y[%.1f ~ %.1f]", minY, maxY);
    canvas->setCursor(8, 170); canvas->print(b);
    canvas->flush();
    delay(50);
  }

  // Calcolo offset e scala
  calOffX = (maxX + minX) / 2.0f;
  calOffY = (maxY + minY) / 2.0f;
  calSclX = (maxX - minX) / 2.0f;  if (calSclX < 0.01f) calSclX = 1.0f;
  calSclY = (maxY - minY) / 2.0f;  if (calSclY < 0.01f) calSclY = 1.0f;

  // Salvataggio in NVS (non si perde spegnendo)
  prefs.begin("compass", false);
  prefs.putFloat("offX", calOffX);  prefs.putFloat("offY", calOffY);
  prefs.putFloat("sclX", calSclX);  prefs.putFloat("sclY", calSclY);
  prefs.end();

  // Schermata risultato calibrazione
  canvas->fillScreen(C_BG);
  canvas->setTextColor(0x07E0); canvas->setTextSize(2);
  canvas->setCursor(30, 88); canvas->print("CAL DONE!");
  canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
  char b[44];
  sprintf(b, "offX = %.1f", calOffX); canvas->setCursor(10, 120); canvas->print(b);
  sprintf(b, "offY = %.1f", calOffY); canvas->setCursor(10, 133); canvas->print(b);
  sprintf(b, "sclX = %.1f", calSclX); canvas->setCursor(10, 148); canvas->print(b);
  sprintf(b, "sclY = %.1f", calSclY); canvas->setCursor(10, 161); canvas->print(b);
  canvas->flush();
  delay(3000);
}

// ─────────────────────────────────────────────
//  Carica i dati di calibrazione salvati precedentemente da NVS
// ─────────────────────────────────────────────
void loadCalibration() {
  prefs.begin("compass", true);
  calOffX = prefs.getFloat("offX", 0.0f);
  calOffY = prefs.getFloat("offY", 0.0f);
  calSclX = prefs.getFloat("sclX", 1.0f);
  calSclY = prefs.getFloat("sclY", 1.0f);
  prefs.end();
  if (calSclX < 0.01f) calSclX = 1.0f;
  if (calSclY < 0.01f) calSclY = 1.0f;
  Serial.printf("[CAL] off=(%.2f, %.2f)  scl=(%.2f, %.2f)\n",
                calOffX, calOffY, calSclX, calSclY);
}

// ─────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TFT_BL, OUTPUT); digitalWrite(TFT_BL, HIGH);  // Accendi retroilluminazione
  pinMode(CAL_BTN, INPUT_PULLUP);

  gfx->begin();
  canvas->begin();       // Alloca il frame buffer, a questo punto consuma circa 115 KB di memoria

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000); // Modalità rapida 400 kHz, riduce la latenza di lettura I2C

  if (!mag.begin()) {
    // Se il sensore non viene trovato, lo schermo mostra un messaggio di errore rosso
    canvas->fillScreen(0xF800);
    canvas->setTextColor(0xFFFF); canvas->setTextSize(2);
    canvas->setCursor(10, 100); canvas->print("SENSOR ERROR");
    canvas->setCursor(10, 125); canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(500);
  }

  loadCalibration();

  // Tenere premuto BOOT(GPIO0) all'accensione → entra in calibrazione rotazionale
  if (digitalRead(CAL_BTN) == LOW) {
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR); canvas->setTextSize(1);
    canvas->setCursor(10, 112); canvas->print("Release to start cal...");
    canvas->flush();
    while (digitalRead(CAL_BTN) == LOW) delay(10);
    delay(500);
    runCalibration();
  }

  // Scarta le prime letture di riscaldamento instabili
  for (int i = 0; i < 8; i++) {
    sensors_event_t ev; mag.getEvent(&ev); delay(15);
  }
  gSmooth    = readHeading();
  gFirstRead = false;
}

// ─────────────────────────────────────────────
//  Loop: lettura → filtro → rendering, ciclo a circa 25fps
// ─────────────────────────────────────────────
void loop() {
  float raw = readHeading();
  gSmooth   = emaFilter(raw);
  drawFrame(gSmooth);
  delay(30);  // 30ms ≈ 33fps, effettivamente con il tempo di rendering circa 25fps
}
```

### Spiegazione del codice

**Perché usare il Canvas?** `Arduino_Canvas` equivale ad allocare in memoria un "foglio di brutta" di 115KB, disegnare prima il frame completo, poi inviarlo allo schermo in un'unica volta con `canvas->flush()`. Se si disegna direttamente sullo schermo, ogni tratto viene visualizzato immediatamente, causando un evidente sfarfallio quando l'ago ruota. Il Canvas risolve questo problema, al costo di un maggiore utilizzo di memoria.

**Cosa fa `readHeading()`?** Partendo dai valori di intensità del campo magnetico X/Y letti dal sensore, sottrae l'offset ferro duro (eliminando le interferenze di campi magnetici fissi), divide per il coefficiente di scala ferro dolce (correggendo la diversa sensibilità tra assi) e infine aggiunge la correzione della declinazione magnetica, ottenendo l'angolo rispetto al nord vero.

**Perché `emaFilter()` deve gestire il wrapping?** Se l'ago passa da 359° a 1°, la differenza tra le due letture è -358°; se si fa direttamente una media ponderata, l'ago girerebbe nella direzione opposta per un intero giro. Il codice prima limita la differenza all'intervallo [-180°, +180°], poi applica la smoothing, gestendo così correttamente l'attraversamento dello 0°.

**Qual è il principio della calibrazione?** Ruotando di 360° nel piano orizzontale, le letture X/Y del sensore delineano un'ellisse (idealmente un cerchio). Registrando i valori massimi e minimi, il punto medio è l'offset ferro duro e il raggio è il coefficiente di scala ferro dolce. Al termine della calibrazione, i dati vengono salvati in NVS (simile alla EEPROM dei telefoni); al prossimo accensione vengono caricati automaticamente, senza dover ricalibrare ogni volta.

---

## Risoluzione dei problemi comuni

Niente panico, il 90% dei problemi deriva da questi punti.

**Lo schermo è completamente nero o bianco, non mostra nulla.** Controlla prima che il pin BL (retroilluminazione) sia a livello alto — se è collegato a GPIO7, conferma che nel codice ci sia `digitalWrite(TFT_BL, HIGH)`; se è collegato direttamente a 3.3V, la retroilluminazione dovrebbe essere sempre accesa, per cui lo schermo nero indica un problema con altri pin. Poi verifica contro la tabella di cablaggio, filo per filo, che CS, DC e RST siano collegati ai GPIO corretti; l'inversione di CS e DC è un errore molto frequente.

**Il monitor seriale stampa `SENSOR ERROR` e lo schermo mostra un errore in rosso.** Il magnetometro non risponde, molto probabilmente è un problema di cablaggio I2C — SDA/SCL invertiti, o collegati a GPIO diversi. Conferma che `Wire.begin(13, 14)` corrisponda ai pin effettivamente collegati. Un'altra possibilità è che il modulo non sia alimentato a 3.3V; misura con un multimetro il pin VCC.

**L'ago salta in modo casuale, è completamente impreciso, o rimane fermo in una direzione.** La causa più probabile è che il tuo modulo sia un QMC5883L (0x0D), ma il codice usa la libreria per HMC5883L — le definizioni dei registri delle due librerie sono completamente diverse, per cui i valori letti sono senza senso. Esegui prima la scansione I2C per confermare l'indirizzo; se è 0x0D, devi sostituire `#include <Adafruit_HMC5883_U.h>` e l'oggetto sensore con la sintassi della libreria QMC5883LCompass; online si trovano esempi pronti di adattamento.

**Dopo la calibrazione, la direzione è ancora sfasata di 10°~20°.** Controlla di aver modificato `DECLINATION_DEG` con il valore della tua città; una differenza di 5° su questo parametro causa uno scostamento sistematico di tutte le direzioni. Tokyo circa -7.5°, Pechino circa -6.5°; per il valore esatto usa lo strumento NOAA linkato alla fine dell'articolo. Un'altra causa è la presenza di campi magnetici intensi nelle vicinanze durante la calibrazione (telefono, cacciavite, magnete delle casse); cambia posizione e ricalibra in uno spazio aperto.

**Errore di compilazione `Adafruit_HMC5883_U.h: No such file or directory`.** La libreria non è installata o è stata installata quella sbagliata. Apri Arduino IDE → Strumenti → Gestione librerie, cerca `HMC5883`, installa Adafruit HMC5883 Unified e la sua dipendenza Adafruit Unified Sensor.

---

## Domande frequenti (FAQ)

**D: Qual è la differenza tra HMC5883L e QMC5883L? Si può usare la stessa libreria?**
R: Non sono intercambiabili. I due chip sono completamente compatibili sui pin (aspetto identico una volta saldati), ma gli indirizzi dei registri interni sono diversi, il protocollo di driver è diverso, e usare la libreria sbagliata produce solo valori senza senso. L'indirizzo I2C di HMC5883L è 0x1E, quello di QMC5883L è 0x0D; con una scansione I2C si conferma in un secondo.

**D: Il pin BL della retroilluminazione si può collegare direttamente a 3.3V, oppure deve andare a un GPIO?**
R: Il collegamento diretto a 3.3V va benissimo, lo schermo rimarrà sempre acceso. Il vantaggio di usare un GPIO è poter controllare la luminosità da codice o spegnere la retroilluminazione in modalità sleep per risparmiare energia. Se non ti serve questa funzionalità, collega a 3.3V e risparmi un GPIO.

**D: Come trovo il valore esatto di `DECLINATION_DEG` per la mia città?**
R: Usa lo strumento di calcolo della declinazione magnetica fornito da NOAA (vedi riferimenti alla fine dell'articolo), inserisci le coordinate della tua città, seleziona il modello WMM, e otterrai la declinazione magnetica precisa per la data corrente. Est è positivo, ovest è negativo. Le città del Giappone orientale si situano generalmente tra -7° e -8°, la costa orientale cinese circa tra -5° e -6°.

**D: Cosa cambia aumentando o diminuendo `EMA_ALPHA`?**
R: Più alpha è grande, più l'ago risponde velocemente, ma è più soggetto a tremolii; più è piccolo, più l'ago è fluido, ma con un evidente ritardo nella rotazione. 0.15 è adatto per una posizione fissa su scrivania; per l'uso manuale in movimento, si può salire a 0.25 ~ 0.3. Il range va da 0.0 (completamente fermo) a 1.0 (nessun filtro, valore grezzo).

**D: Dove vengono salvati i dati di calibrazione? Se cambio computer e ricarico il codice, rimangono?**
R: I dati di calibrazione sono salvati nella NVS dell'ESP32 (memoria non volatile, simile alla EEPROM); il caricamento di nuovo codice non cancella la NVS, al prossimo avvio vengono caricati automaticamente. Vengono persi solo eseguendo un'operazione di "cancellazione completa della Flash", nel qual caso basta ricalibrare una volta.

**D: 115 KB di frame buffer sono troppi? L'ESP32-C3 può usarlo?**
R: L'ESP32-S3 ha 512KB di SRAM, 115KB non sono un problema. L'ESP32-C3 ha solo 400KB di SRAM; considerando il codice e lo stack, nella pratica risulta piuttosto stretto — si consiglia la versione con PSRAM oppure di passare a uno schermo più piccolo. L'ESP32 originale (WROOM / WROVER) ha ancora meno SRAM; la versione WROVER con PSRAM funziona, la versione WROOM senza PSRAM va molto probabilmente in crash per OOM.

**D: La mia bussola differisce di una decina di gradi rispetto al telefono, è normale?**
R: Con questa soluzione, una differenza di una decina di gradi è del tutto normale, non è un bug. Per HMC5883L/QMC5883L in un ambiente reale con interferenze, ±10°~±15° è un range di errore comune. Se l'errore è stabilmente entro ±5°, la calibrazione è già buona. Per ridurre ulteriormente l'errore serve un sensore più preciso con fusione a nove assi; non basta intervenire sui parametri.

**D: Si può usare questa soluzione per un prodotto di navigazione o orientamento serio?**
R: Non consigliato. La precisione è solo di ±5°~±15°, fortemente influenzata dall'ambiente magnetico circostante, e non c'è compensazione dell'inclinazione — appena il dispositivo non è strettamente orizzontale, l'errore aumenta in modo significativo. Per dimostrazioni, apprendimento dei principi o come soprammobile da scrivania è più che sufficiente; per applicazioni che richiedono una precisione di navigazione reale, conviene passare a soluzioni come ICM-20948 con fusione hardware dei sensori.

---

## HMC5883L è adatto a un progetto serio?

Conclusione diretta: no.

Per dimostrazioni sperimentali va bene — imparare le procedure di driver, mostrare progetti maker, come soprammobile da scrivania — tutto ok. Ma se stai sviluppando un prodotto che ha realmente bisogno di rilevare la direzione, questa soluzione ha tre problemi insormontabili:

Primo, nessuna compensazione dell'inclinazione. Appena il modulo non è perfettamente orizzontale, l'errore di azimut aumenta rapidamente — un'inclinazione di 20° può causare una deviazione di direzione superiore a 10°. L'iPhone compensa questo errore in tempo reale con l'accelerometro; questo modulo da solo non può farlo, serve un MPU6050 aggiuntivo e modificare l'algoritmo.

Secondo, forte influenza del campo magnetico ambientale. L'alimentatore del computer vicino, il cavo USB, il supporto metallico — tutti inquinano le letture, e questa interferenza è dinamica; una calibrazione salvata nella NVS non può compensare un campo magnetico che cambia in tempo reale durante il movimento.

Terzo, qualità dei moduli in vendita molto disomogenea. La maggior parte sono cloni QMC5883L, privi della compensazione della deriva termica on-chip presente nell'HMC5883L originale; con il variare della temperatura, le letture tendono a derappare.

Se il tuo progetto richiede un rilevamento affidabile della direzione, una scelta più appropriata è l'ICM-20948 (nove assi integrati + fusione DMP hardware), oppure usare direttamente un modulo GPS combinato con il calcolo dell'orientamento tra due coordinate — la precisione e la stabilità sono di tutt'altro livello.

Il posizionamento corretto di questo progetto è: un campione di apprendimento piccolo ma completo. Ti fa percorrere per intero la catena "driver magnetometro → calibrazione ferro duro → filtro → display", e questa conoscenza si applica integralmente anche a sensori migliori.

---

## Possibili sviluppi

Completata la versione base, ci sono alcune direzioni da esplorare:

Aggiungere un sensore a sei assi MPU6050, leggendo i dati dell'accelerometro per la compensazione dell'inclinazione. È uno dei limiti principali citati sopra — la versione attuale ha solo il campo magnetico 2D, e il dispositivo appena è un po' inclinato produce un errore evidente; con la compensazione dell'inclinazione, anche tenendolo in verticale la precisione si mantiene. È anche una delle ragioni fondamentali per cui la bussola dell'iPhone è stabile. È il passo più valevole per "aggiornare questo progetto da giocattolo a utilizzabile".

Collegare un modulo SD card, usare LVGL o una mappa disegnata da te con la direzione della bussola sovrapposta, per realizzare un navigatore offline. L'area di visualizzazione dello schermo tondo è limitata, ma per mostrare una freccia con la direzione corrente e quella del traguardo è più che sufficiente.

Inviare i dati dell'azimut tramite Wi-Fi a un broker MQTT, integrandoli in Home Assistant o nella tua dashboard, per realizzare un sensore di direzione da scrivania, utile per determinare l'esposizione di porte e finestre o l'allineamento di un'antenna.

---

## Riferimenti

- Datasheet originale HMC5883L (Honeywell): https://cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf
- Datasheet QMC5883L (QST): https://datasheetspdf.com/pdf/1309218/QST/QMC5883L/1
- Arduino_GFX_Library GitHub: https://github.com/moononournation/Arduino_GFX
- Adafruit_HMC5883_U GitHub: https://github.com/adafruit/Adafruit_HMC5883_U
- Pagina prodotto ESP32-S3 (Espressif): https://www.espressif.com/en/products/socs/esp32-s3
- Strumento di consultazione della declinazione magnetica (NOAA): https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
