---
title: "ESP32-S3 + INMP441 + GC9A01 Spettroanalizzatore audio circolare fai-da-te | Tutorial completo I2S + FFT + SPI"
boardId: esp32s3
moduleId: audio/inmp441
category: esp32
date: 2026-06-08
intro: "Legge l'audio I2S dal microfono digitale INMP441 con ESP32-S3, analizza con FFT a 512 punti e disegna in tempo reale 16 barre spettrali arcobaleno sul display TFT circolare GC9A01. Include cablaggio completo, installazione librerie e commenti al codice."
image: "https://img.lingflux.com/2026/06/7747ada90e61ba2360585e6934fbf7a7.jpg"
---

> **Riassunto in una frase**: ESP32-S3 + microfono INMP441 + schermo circolare GC9A01, costruisci uno spettroanalizzatore audio circolare che "balla", tutorial completo I2S + FFT + SPI.

# Tutorial completo: costruire uno spettroanalizzatore audio circolare che "balla" con ESP32-S3 + INMP441 + GC9A01 (I2S + FFT + SPI)

Difficoltà: ⭐⭐⭐☆☆ (accessibile con un minimo di esperienza Arduino)
Tempo stimato: 45 minuti
Ambiente di test:
Arduino IDE 2.3.8
GFX Library for Arduino v1.6.5
arduinoFFT v2.0.4

---

> **TL;DR (versione senza preamboli):**
> 1. **Cablaggio**: INMP441 SD→GPIO4, WS→GPIO5, SCK→GPIO6, **L/R deve essere collegato a GND**
> 2. **Cablaggio**: GC9A01 SCL→GPIO12, SDA→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 3. **Installare le librerie**: GFX Library for Arduino (autore moononournation) + `arduinoFFT` (autore kosme)
> 4. **Incollare il codice, caricare, parlare davanti al microfono**, le barre arcobaleno nel cerchio inizieranno a ballare

---

## Introduzione

Da quando ho comprato uno schermo circolare da 1,28 pollici, mi sono divertito parecchio: la forma circolare offre possibilità molto diverse rispetto a quella quadrata. Ora, combinandolo con il modulo microfono INMP441, voglio realizzare qualcosa di davvero bello: **visualizzazione spettrale audio in tempo reale**.

Quando senti "spettroanalizzatore", probabilmente ti viene in mente lo stile rétro di Winamp con le sue classiche barre verticali (lo avevo installato sul PC, potevo stare a guardare le barre che ballavano per un pomeriggio intero mentre ascoltavo musica). Ma uno spettro circolare è tutta un'altra cosa: 16 barre colorate che si irradiano dal centro verso l'esterno, più il volume è alto più le barre sono lunghe, e sulla sommità di ciascuna barra c'è un puntino bianco di picco che scende lentamente... a dire il vero, sono rimasto incantato a fissarlo per cinque minuti senza andare a mangiare.

Questo articolo ti guiderà passo dopo passo nell'uso di **ESP32-S3 + microfono digitale INMP441 + schermo TFT circolare GC9A01**, dal cablaggio al codice, per realizzare uno spettroanalizzatore arcobaleno circolare che risponde al suono in tempo reale. Un maker con un minimo di esperienza può vedere i risultati entro 45 minuti.

---

## Effetto del progetto

![](https://img.lingflux.com/2026/06/21a134efbde1457cff0817a7e18879f3.jpg)

- Acquisizione audio in tempo reale dal microfono (44,1 kHz, 16 bit)
- Analisi FFT a 512 punti, suddivisa in 16 bande di frequenza
- Barre arcobaleno sul display circolare irradiate dall'interno verso l'esterno, con picchi bianchi a discesa lenta
- Frequenza di aggiornamento di circa 20 fps, perfettamente fluida a occhio nudo

---

## Descrizione dei componenti

### Display TFT circolare GC9A01

Se lo schermo rettangolare normale è come un "cellulare con tastiera", il GC9A01 è come il "quadrante di uno smartwatch": **LCD circolare da 1,28 pollici, il driver si chiama proprio GC9A01, interfaccia SPI, alimentazione a 3,3 V**, si pilota con soli 8 fili.

| Parametro | Valore |
| --- | --- |
| Dimensioni schermo | 1,28 pollici |
| Risoluzione | 240 × 240 pixel |
| Interfaccia | SPI (4 fili) |
| Tensione di lavoro | 3,3 V |
| Driver IC | GC9A01 |
| Tipo pannello | IPS (visualizzazione completa) |

Perché sceglierlo: è il piccolo schermo circolare più comune sul mercato, supportato nativamente dalla libreria Arduino_GFX, si inizializza con 5 righe di codice, con pochissimi problemi noti.

---

### Microfono digitale MEMS INMP441

L'INMP441 è un **microfono MEMS omnidirezionale digitale**: in parole povere, **genera direttamente un segnale digitale I2S, senza bisogno di ADC**. È come avere un interprete simultaneo che traduce in tempo reale ciò che dici in un formato digitale comprensibile dal MCU, eliminando tutta la complessità dei segnali analogici.

| Parametro | Valore |
| --- | --- |
| Interfaccia | I2S (audio digitale) |
| Tensione di lavoro | 1,8 V ~ 3,3 V |
| Risposta in frequenza | 60 Hz ~ 15 kHz |
| Rapporto segnale/rumore | 61 dBA |
| Sensibilità | -26 dBFS (valore tipico) |
| Direzionalità | Omnidirezionale |

Perché sceglierlo: l'interfaccia I2S è pulita, non richiede ADC aggiuntivo, il rapporto segnale/rumore di 61 dBA è nettamente superiore rispetto alla maggior parte delle capsule microfoniche analogiche economiche, più che sufficiente per uno spettroanalizzatore.

> Vale la pena notare che l'INMP441 era originariamente prodotto da InvenSense (poi acquisita da TDK), che lo ha ufficialmente dichiarato nello stato **Obsolete (discontinuato/fuori produzione)**. Presso i principali distributori di componenti elettronici come Mouser e DigiKey, è già contrassegnato come fuori produzione. Tuttavia, sui mercati online si trovano ancora in abbondanza moduli INMP441 blu/neri a pochi yuan. Questo accade perché sul mercato continentale esistono ancora grandi scorte di **giacenze di magazzino**, oppure sono presenti sul mercato alcuni **chip compatibili/ricondizionati di produzione nazionale** che continuano a usare questo nome. Se lo scopo è un progetto DIY personale, un tutorial o un piccolo demo, i moduli attualmente in vendita funzionano ancora perfettamente.
>
> **Pertanto, se devi sviluppare un prodotto commerciale, questo modulo non è la scelta consigliata.**

---

## Lista componenti (BOM)

| Componente | Modello / Specifiche | Quantità |
| --- | --- | --- |
| Scheda di sviluppo | ESP32-S3 (con USB-C) | 1 |
| Display TFT circolare | GC9A01, 1,28 pollici, 240×240 | 1 |
| Microfono digitale | Modulo I2S INMP441 | 1 |
| Cavi dupont |  | alcuni |

---

## Descrizione pin dei componenti

### Pin del display GC9A01

| Pin | Descrizione funzione |
| --- | --- |
| VCC | Alimentazione positiva (collegare a 3,3 V) |
| GND | Alimentazione negativa (masse) |
| SCL / CLK | Clock SPI |
| SDA / MOSI | Dati SPI (trasmissione dal master) |
| CS | Chip select (attivo basso) |
| DC | Selezione dati / comando |
| RST | Reset (attivato con livello basso) |
| BL | Controllo retroilluminazione (collegare a 3,3 V per sempre accesa, oppure a un GPIO per regolazione PWM) |

### Pin del microfono INMP441

| Pin | Descrizione funzione |
| --- | --- |
| VDD | Alimentazione positiva (collegare a 3,3 V) |
| GND | Alimentazione negativa (masse) |
| SD | Uscita dati I2S (collegare all'ingresso dati ESP32) |
| WS | Word clock / sincronizzazione frame (selezione canale sinistro/destro) |
| SCK | Bit clock |
| L/R | Selezione canale: GND = canale sinistro, 3,3 V = canale destro, **non lasciare flottante** |

---

## Schema di cablaggio

**Si consiglia di verificare ogni filo con la tabella subito dopo averlo collegato: si risparmia l'80% del tempo di troubleshooting.**

### Cablaggio display GC9A01

| Pin modulo | ESP32-S3 | Colore filo (riferimento) |
| --- | --- | --- |
| VCC | 3,3 V | Rosso |
| GND | GND | Grigio |
| SCL / CLK | GPIO12 | Giallo |
| SDA / MOSI | GPIO11 | Blu |
| CS | GPIO9 | Verde |
| DC | GPIO10 | Arancione |
| RST | GPIO18 | Viola |
| BL | GPIO7 / 3,3 V | Ciano |

### Cablaggio microfono INMP441

| Pin modulo | ESP32-S3 | Colore filo (riferimento) |
| --- | --- | --- |
| VDD | 3,3 V | Rosso |
| GND | GND | Grigio |
| SD | GPIO4 | Blu |
| WS | GPIO5 | Verde |
| SCK | GPIO6 | Giallo |
| L/R | GND (canale sinistro) | Grigio |

> Attenzione: **il pin L/R deve essere collegato, non può essere lasciato flottante.** Un pin L/R flottante provoca una selezione del canale indefinita, acquisendo solo rumore casuale; le barre dello spettro balleranno senza alcuna correlazione con il suono reale — non chiedetemi come lo so.

####

- Assicurarsi di utilizzare l'alimentazione a **3,3 V**, non collegare a 5 V
- Il pin L/R dell'INMP441 collegato a GND = uscita canale sinistro
- Collegare prima tutti i fili, verificare alimentazione e massa con un multimetro prima di accendere, per evitare cortocircuiti

---

## Librerie da installare

In **Arduino IDE → Strumenti → Gestore librerie** cercare e installare:

| Libreria | Autore | Versione testata | Utilizzo |
| --- | --- | --- | --- |
| `Arduino_GFX_Library` | moononournation | v1.6.5 | Driver display GC9A01 |
| `arduinoFFT` | kosme | v2.0.4 | Trasformata di Fourier veloce |

> Il driver I2S (`driver/i2s.h`) è una libreria integrata di ESP32, non necessita di installazione aggiuntiva.
>
> Si raccomanda Arduino IDE **versione 2.3.x o superiore**; la versione precedente 1.x ha un supporto instabile per ESP32-S3.

---

## Codice completo

```cpp
#include <Arduino_GFX_Library.h>
#include <driver/i2s.h>
#include <arduinoFFT.h>

// ====== Passo 1: Definire i pin del display ======
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// ====== Passo 2: Definire i pin del microfono ======
#define I2S_WS    5
#define I2S_SD    4
#define I2S_SCK   6
#define I2S_PORT  I2S_NUM_0

// ====== Parametri FFT ======
#define SAMPLES   512
#define BANDS     16

// ====== Inizializzare il display GC9A01 ======
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0, true);

// ====== Buffer FFT ======
double vReal[SAMPLES];
double vImag[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>(
  vReal, vImag, SAMPLES, 44100);

// ====== Energia per banda e picchi ======
float bandValues[BANDS];
float peakValues[BANDS];
int16_t sampleBuf[SAMPLES];

// ====== Utilità colore: HSL → RGB565 ======
uint16_t hslToRgb565(float h, float s, float l) {
  float c = (1.0f - fabsf(2.0f * l - 1.0f)) * s;
  float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
  float m = l - c / 2.0f;
  float r, g, b;
  if (h < 60)       { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  uint8_t R = (uint8_t)((r + m) * 31);
  uint8_t G = (uint8_t)((g + m) * 63);
  uint8_t B = (uint8_t)((b + m) * 31);
  return (R << 11) | (G << 5) | B;
}

// ====== Passo 3: Inizializzare il microfono I2S ======
void setupMicrophone() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

void setup() {
  Serial.begin(115200);

  // Passo 4: Accendere la retroilluminazione, inizializzare il display
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  gfx->begin();
  gfx->fillScreen(0x0000);

  // Passo 5: Inizializzare il microfono
  setupMicrophone();

  memset(peakValues, 0, sizeof(peakValues));
}

// ====== Disegnare lo spettro circolare ======
void drawCircularSpectrum() {
  int cx = 120, cy = 120;
  int innerR = 25;
  int maxLen = 85;
  float angleStep = 2.0f * PI / BANDS;
  float barWidth = angleStep * 0.7f;

  gfx->fillScreen(0x0000);

  for (int i = 0; i < BANDS; i++) {
    float angle = i * angleStep - PI / 2.0f;
    float hue = (float)i / BANDS * 360.0f;
    float val = bandValues[i];
    int barLen = (int)(val * maxLen);

    for (int r = innerR; r < innerR + barLen; r += 2) {
      float t = (float)(r - innerR) / maxLen;
      uint16_t color = hslToRgb565(hue, 1.0f, 0.3f + t * 0.3f);
      float x1 = cx + cosf(angle - barWidth/2) * r;
      float y1 = cy + sinf(angle - barWidth/2) * r;
      float x2 = cx + cosf(angle + barWidth/2) * r;
      float y2 = cy + sinf(angle + barWidth/2) * r;
      gfx->drawLine(x1, y1, x2, y2, color);
    }

    if (peakValues[i] > 0.02f) {
      int peakR = innerR + (int)(peakValues[i] * maxLen) + 3;
      float px = cx + cosf(angle) * peakR;
      float py = cy + sinf(angle) * peakR;
      gfx->fillCircle(px, py, 2, 0xFFFF);
    }

    peakValues[i] *= 0.95f;
    if (bandValues[i] > peakValues[i]) {
      peakValues[i] = bandValues[i];
    }
  }
}

void loop() {
  // Passo 6: Leggere i dati I2S dal microfono
  size_t bytes_read = 0;
  i2s_read(I2S_PORT, sampleBuf, sizeof(sampleBuf),
           &bytes_read, portMAX_DELAY);

  // Passo 7: Riempire la parte reale della FFT con i campioni
  for (int i = 0; i < SAMPLES; i++) {
    vReal[i] = (double)sampleBuf[i];
    vImag[i] = 0.0;
  }

  // Passo 8: Eseguire la FFT
  FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  FFT.compute(FFT_FORWARD);
  FFT.complexToMagnitude();

  // Passo 9: Mappare i risultati FFT su 16 bande
  memset(bandValues, 0, sizeof(bandValues));
  int specLen = SAMPLES / 2;
  for (int i = 0; i < BANDS; i++) {
    int start = (int)(pow((float)i / BANDS, 1.8f) * specLen * 0.7f);
    int end   = (int)(pow((float)(i+1) / BANDS, 1.8f) * specLen * 0.7f);
    if (end <= start) end = start + 1;
    float sum = 0;
    for (int j = start; j < end && j < specLen; j++) {
      sum += (float)vReal[j];
    }
    float avg = sum / (end - start);
    bandValues[i] = constrain(avg / 5000.0f, 0.0f, 1.0f);
  }

  // Passo 10: Disegnare lo spettro circolare
  drawCircularSpectrum();
}
```

---

## Spiegazione del codice

**1. Perché SAMPLES = 512?**
512 è una potenza di 2 e l'algoritmo FFT è più efficiente con questa lunghezza. Con una frequenza di campionamento di 44,1 kHz, una FFT a 512 punti offre una risoluzione in frequenza di circa 86 Hz, più che sufficiente. Con 256 sarebbe più veloce ma con meno dettaglio in frequenza; con 1024 sarebbe più fine ma il framerate diminuirebbe sensibilmente.

**2. Perché la distribuzione delle bande usa pow(..., 1.8)?**
Una suddivisione lineare delle frequenze riempirebbe le bande alte di troppi dati, lasciando quelle basse vuote. La distribuzione esponenziale rende le bande di bassa frequenza più strette (più dettagliate) e quelle di alta frequenza più ampie (assorbendo il rumore), avvicinandosi alla curva di percezione uditiva umana e risultando più "naturale" visivamente.

**3. Da dove deriva la normalizzazione dividendo per 5000?**
Questo valore dipende dalla distanza del microfono dalla sorgente sonora e dal volume ambientale: scenari diversi richiedono regolazioni manuali. Se le barre sono sempre al massimo (energia saturata), aumentare il valore 5000; se le barre sono troppo basse e appena visibili, diminuirlo.

**4. A cosa serve peakValues[i] *= 0.95?**
È la tecnica classica del "peak hold + decay lento": quando il suono si ferma improvvisamente, il punto bianco di picco non scompare istantaneamente, ma si riduce moltiplicando per 0,95 ad ogni fotogramma, scendendo gradualmente. L'effetto visivo è più fluido, simile a quello dei dispositivi audio professionali.

---

## Risoluzione dei problemi più comuni

**Niente panico, il 90% dei problemi deriva da questi punti:**

**Lo schermo è completamente nero, non mostra nulla**
Verificare prima che la retroilluminazione (pin BL) sia effettivamente alta (se il modulo non ha il pin BL si può ignorare), poi controllare che i quattro fili SPI (SCK / MOSI / CS / DC) siano collegati correttamente e non abbiano contatti deboli. Misurare con il multimetro che VCC abbia 3,3 V. Se la retroilluminazione è accesa ma lo schermo è nero, molto probabilmente CS o DC sono invertiti, provare a scambiarli.

**Le barre dello spettro sono ferme oppure ballano senza correlazione con il suono**
Prima cosa: **verificare che il pin L/R dell'INMP441 sia collegato a GND**, è l'errore più frequente. Un pin L/R flottante provoca una selezione del canale anomala, acquisendo solo rumore casuale. Dopo aver collegato L/R, verificare i numeri GPIO dei tre fili SD / WS / SCK.

**Tutte le barre dello spettro sono al massimo (energia sempre massima)**
Aumentare il valore `5000` nel codice `bandValues[i] = constrain(avg / 5000.0f, ...)`, per esempio a `15000` o `30000`. Anche un microfono troppo vicino alla sorgente sonora può causare questo problema: provare prima ad allontanare il microfono di 30 cm.

**Le barre dello spettro reagiscono ma solo poche si muovono**
Probabilmente la sorgente sonora utilizzata per il test ha uno spettro di frequenza troppo stretto (per esempio solo un fischietto a tono singolo). Provare con un brano musicale a spettro completo (con bassi, voce e strumenti acuti) e verificare che tutte le bande rispondano.

**Compilazione fallita: errore sulla classe template ArduinoFFT**
Verificare di aver installato `arduinoFFT` (versione kosme) **v2.x**. La sintassi v1.x è `ArduinoFFT FFT` (senza parametro template), mentre v2.x usa `ArduinoFFT<double>`; le API delle due versioni non sono compatibili. Aggiornare direttamente all'ultima versione dal Gestore librerie.

---

## FAQ

**D: Cosa succede se non collego il pin L/R dell'INMP441?**
R: La selezione del canale rimane flottante, il comportamento del microfono è indefinito; nella pratica si acquisisce quasi sempre rumore casuale e le barre dello spettro ballano in modo del tutto indipendente dal suono. Collegare a GND = canale sinistro, collegare a 3,3 V = canale destro; scegliere una delle due opzioni, ma non lasciare scollegato.

**D: Posso cambiare SAMPLES a 1024? Quali sono le conseguenze?**
R: Sì, la risoluzione in frequenza passa da circa 86 Hz a circa 43 Hz, con maggior dettaglio sulle basse frequenze. Il compromesso è che il tempo di acquisizione e calcolo per ogni fotogramma raddoppia, e il framerate scende da circa 20 fps a circa 10 fps. Per la visualizzazione spettrale, 10 fps sono ancora accettabili a occhio nudo.

**D: Con solo 3,3 V, l'INMP441 funziona correttamente?**
R: Assolutamente sì. L'INMP441 supporta alimentazione da 1,8 V a 3,3 V; 3,3 V è la tensione di lavoro più comune, non serve un modulo di regolazione di tensione aggiuntivo.

**D: L'utilizzo della CPU di ESP32-S3 è elevato? Può interferire con altri task?**
R: Una FFT a 512 punti alla frequenza di 240 MHz di ESP32-S3 utilizza circa il 10%-15% del tempo CPU su un singolo core. Se è necessario eseguire anche Wi-Fi o Bluetooth, si consiglia di assegnare FFT + disegno al Core 0 e i task di rete al Core 1, in modo che non interferiscano tra loro.

**D: Posso sostituire il GC9A01 con un ST7789 o un altro driver di display?**
R: Sì. Arduino_GFX_Library supporta decine di driver; basta sostituire `Arduino_GC9A01` nel codice con la classe corrispondente (per esempio `Arduino_ST7789`), modificare i parametri di risoluzione e adattare il cablaggio secondo il datasheet del nuovo display. Nota: con un display non circolare è necessario ricalcolare le coordinate del centro.

**D: Quando è tutto silenzioso c'è "rumore di fondo", le barre non vanno a zero. Cosa fare?**
R: L'INMP441 ha un rumore intrinseco (SNR 61 dBA significa che una minima quantità di rumore ambientale viene sempre acquisita). Si può aggiungere una soglia di rumore: prima della mappatura aggiungere una riga `if (avg < 200) avg = 0;`, così in condizioni di silenzio le barre andranno completamente a zero. Anche aumentare il divisore di normalizzazione può aiutare.

**D: Quale versione del driver I2S utilizza ESP32-S3?**
R: Questo articolo utilizza il driver I2S legacy in stile ESP-IDF v4.x (`i2s_driver_install` / `i2s_read`). ESP-IDF v5.x ha introdotto la nuova API I2S (`i2s_new_channel` ecc.); se il pacchetto di supporto della scheda ESP32-S3 è stato aggiornato alla versione 3.x, sarà necessario riscrivere la funzione `setupMicrophone()` secondo la nuova API.

---

## Idee per sviluppi futuri

- Passare a 32 bande di frequenza, abbinato a uno schermo circolare più grande (per esempio GC9A01A da 2,1 pollici), per uno spettro più dettagliato
- Aggiungere pulsanti touch per cambiare modalità di visualizzazione (radiazione circolare / barre verticali / forma d'onda oscilloscopio)
- Connettersi via Wi-Fi per inviare i dati spettrali a un browser e renderizzarli nuovamente in una pagina web
- Utilizzare due moduli INMP441 per audio stereo, con canale sinistro e destro in colori diversi

---

## Riferimenti

- [Datasheet ufficiale INMP441 — TDK InvenSense](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [Datasheet driver GC9A01](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [arduinoFFT GitHub — kosme](https://github.com/kosme/arduinoFFT)
- [Scheda tecnica ESP32-S3 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Documentazione driver I2S ESP-IDF — Espressif](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)