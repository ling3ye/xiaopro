---
title: "ESP32-S3 + PCM5102A riproduce MP3｜Cablaggio I2S + codice Arduino completo"
boardId: esp32s3
moduleId: audio/pcm5102a
category: esp32
date: 2026-04-22
intro: "Collega l'ESP32-S3 a un modulo DAC PCM5102A tramite I2S e riproduci MP3 via Wi-Fi con la libreria ESP32-audioI2S. Meno di 10 fili, meno di 50 righe di codice — ideale per principianti."
image: "https://img.lingflux.com/2026/04/0c35d50bc32e0bd67636e15a21d5e2ed.png"
---

# ESP32-S3 + PCM5102A Lettore MP3 — Tutorial completo di cablaggio I2S e codice Arduino

> **Riassunto in una riga：** Usa una scheda ESP32-S3, collegala a un modulo DAC PCM5102A tramite I2S e riproduci MP3 via Wi-Fi con la libreria ESP32-audioI2S. Meno di 10 fili, meno di 50 righe di codice — perfetto per i principianti.

---

## TL;DR（Avvio rapido）

Vuoi solo l'essenziale？ Eccolo：

1. Collega GPIO17（BCK）、GPIO16（LCK）、GPIO15（DIN） dell'ESP32-S3 ai pin BCK、LCK、DIN del PCM5102A
2. Collega il pin XMT del PCM5102A a 3.3V（o impostalo su HIGH tramite GPIO7 nel codice）. Gli altri pin di controllo（FMT/SCL/DMP/FLT）tutti a GND
3. Installa la libreria Arduino：ESP32-audioI2S（di schreibfaul1）
4. Copia il codice, modifica le credenziali Wi-Fi, flasha e ascolta

---

**ESP32-S3 + PCM5102A** è una delle combinazioni con il miglior rapporto qualità-prezzo per i progetti audio fai-da-te. L'ESP32-S3 gestisce la connessione Wi-Fi, il download MP3 e la decodifica audio, mentre il PCM5102A converte il segnale digitale in audio analogico per cuffie o altoparlanti. L'intero setup costa solo pochi euro, ma la qualità del suono supera ampiamente le alternative nella stessa fascia di prezzo.

Tutti i cablaggi e il codice di questo tutorial sono stati testati e verificati — segui i passaggi per ottenere lo stesso risultato.

---

## Risultato finale

Una volta alimentato, l'ESP32-S3 si connette automaticamente al Wi-Fi, recupera uno stream audio MP3 dalla rete e lo riproduce tramite il PCM5102A. Il suono esce dalle cuffie o dall'altoparlante. Nessun pulsante, nessun touchscreen — collega e ascolta.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/CjGkTj7KaQo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Introduzione al modulo audio PCM5102A

### Cos'è il PCM5102A？

Il **PCM5102A** è un chip **DAC**（Convertitore Digitale-Analogico）stereo ad alte prestazioni prodotto da Texas Instruments.

Il tuo ESP32-S3 produce **segnali audio digitali**（zeri e uni in formato I2S）, ma cuffie e altoparlanti capiscono solo **segnali analogici**（forme d'onda che variano nel tempo）. Il PCM5102A funge da "interprete" tra i due, convertendo i dati digitali in audio analogico in tempo reale.

### Specifiche principali del PCM5102A

| Parametro | Specifica |
|---|---|
| Interfaccia | I2S（compatibile nativo ESP32） |
| Frequenze di campionamento | 8kHz – 384kHz |
| Gamma dinamica | 112dB（dettagli fini, rumore di fondo estremamente basso） |
| Tensione di funzionamento | 3.3V alimentazione singola（perfetta per ESP32） |
| MCLK | PLL integrato, nessun clock master esterno richiesto |
| Uscita | Driver differenziale integrato, forte immunità al rumore |

**Perché scegliere il PCM5102A？** Economico, facile da usare, funziona a 3.3V, non richiede clock esterno, e una gamma dinamica di 112dB è impressionante per l'audio su microcontrollore — il compagno DAC I2S più popolare per i progetti ESP32.

### Funzioni dei pin del PCM5102A

| Pin | Funzione | Connessione ESP32-S3 | Note |
|---|---|---|---|
| **3.3V** | Alimentazione logica（3.3V） | ESP32 3.3V | Obbligatorio |
| **GND** | Massa | ESP32 GND | Obbligatorio — la massa comune è cruciale |
| **BCK** | Clock bit I2S | GPIO17 | Segnale I2S principale |
| **LCK** | Clock canale DX/SX I2S（LRCK/WS） | GPIO16 | Segnale I2S principale |
| **DIN** | Ingresso dati audio I2S | GPIO15 | Segnale I2S principale |
| **XMT** | Controllo mute soft（HIGH = uscita normale） | 3.3V o GPIO7 | **Deve essere HIGH, altrimenti nessun suono** |
| **FMT** | Selezione formato audio（LOW = I2S） | GND | Collega a massa |
| **SCL** | Clock master di sistema（PLL interno disponibile） | GND | Collega a massa |
| **DMP** | Controllo de-enfasi | GND | Collega a massa |
| **FLT** | Modalità filtro digitale | GND | Collega a massa |

> **Regola d'oro：** Collega al GND tutti e quattro i pin di controllo — FMT, SCL, DMP, FLT. Semplice, stabile, infallibile.

---

## Lista dei materiali（BOM）

| Componente | Quantità | Note |
|---|---|---|
| Scheda ESP32-S3 | × 1 | Qualsiasi ESP32-S3 DevKit va bene |
| Modulo audio PCM5102A | × 1 | Disponibile online, ~1–2€ |
| Cavi ponte（Dupont） | Diversi | Maschio-maschio / maschio-femmina a seconda della scheda |
| Cuffie o piccolo altoparlante | × 1 | Cuffie 3.5mm o altoparlante passivo |

---

## Cablaggio：ESP32-S3 verso PCM5102A

Il cablaggio è la parte più soggetta a errori di questo progetto. Dopo aver collegato tutto, **verifica ogni connessione con la tabella** — risparmierai l'80% del tempo di risoluzione dei problemi.

| ESP32-S3 GPIO | Pin PCM5102A | Descrizione |
|---|---|---|
| 3.3V | **3.3V** | Alimentazione logica |
| GND | **GND** | Massa（deve essere comune！） |
| **GPIO 17** | **BCK** | Clock bit I2S |
| **GPIO 16** | **LCK** | Clock canale DX/SX（LRCK/WS） |
| **GPIO 15** | **DIN** | Ingresso dati audio I2S |
| **GPIO 7** | **XMT** | Controllo mute soft（HIGH nel codice；o collega direttamente a 3.3V） |
| GND | FMT / SCL / DMP / FLT | Pin formato e controllo（tutti a GND） |

---

## Libreria Arduino richiesta

Cerca e installa nel Gestore Librerie dell'IDE Arduino：

**ESP32-audioI2S**（di schreibfaul1）

In alternativa, scarica lo ZIP da GitHub e installa manualmente：[https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

---

## Codice Arduino completo（Testato e verificato）

Questo codice è stato testato su ESP32-S3 + PCM5102A. Copia, aggiorna le credenziali Wi-Fi e carica：

```cpp
// Altri esperimenti su www.lingflux.com

#include <Arduino.h>
#include <WiFi.h>
#include <Audio.h>

// ── Impostazioni Wi-Fi（modifica con le tue）─────────────────────
const char* ssid     = "IL_TUO_WIFI";
const char* password = "LA_TUA_PASSWORD";

// ── Definizione pin I2S ──────────────────────────────────────
#define I2S_BCLK  17   // BCK：clock bit
#define I2S_LRCK  16   // LCK：clock canale sinistro/destro
#define I2S_DOUT  15   // DIN：dati audio
#define XMT        7   // XMT：controllo mute soft（HIGH = uscita normale）

Audio audio;

void setup() {
  Serial.begin(115200);

  // Passo 1：Imposta XMT su HIGH per disattivare il mute del PCM5102A
  pinMode(XMT, OUTPUT);
  digitalWrite(XMT, HIGH);

  // Passo 2：Connessione al Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connessione al Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connesso！");

  // Passo 3：Configura pin I2S e volume
  audio.setPinout(I2S_BCLK, I2S_LRCK, I2S_DOUT);
  audio.setVolume(18);  // Range volume 0–21, 18 è un default confortevole

  // Passo 4：Riproduci MP3 in streaming
  audio.connecttohost("https://pixabay.com/music/download/id-219731.mp3");
  Serial.println("Riproduzione audio avviata...");
}

void loop() {
  // Chiamare continuamente per mantenere decodifica e riproduzione（non rimuovere！）
  audio.loop();
}

// Callback di debug：stampa lo stato della libreria（utile per il troubleshooting）
void audio_info(const char *info) {
  Serial.print("Audio Info: ");
  Serial.println(info);
}
```

**Spiegazione del codice：**

- `audio.setVolume(18)`：Il range del volume è 0–21. 18 è un buon valore predefinito — regola a piacere.
- `connecttohost()`：Supporta link diretti HTTP/HTTPS di MP3. Se l'URL scade, sostituiscilo con un altro.
- `audio.loop()`：Deve essere chiamato continuamente in `loop()` — gestisce la decodifica e l'output del flusso audio. Non rimuoverlo e non aggiungere operazioni bloccanti.

---

## Domande frequenti e risoluzione problemi（FAQ）

### Q：Dopo il cablaggio e l'accensione, nessun suono. Cosa controllo？

È il problema più comune per i principianti. Controlla in questo ordine — risolve il 90% dei casi：

**① Verifica la massa comune** Il GND dell'ESP32-S3 e del PCM5102A devono essere collegati con un cavo ponte. Senza massa comune, il segnale non può chiudere il circuito e nessun suono uscirà. È la cosa che i principianti dimenticano più spesso.

**② Verifica i pin I2S** Se una delle tre linee I2S（BCK, LCK, DIN）è scambiata o invertita, avrai silenzio totale o rumore continuo. Verifica con questa tabella：

| ESP32-S3 GPIO | Pin PCM5102A |
| ------------- | ------------- |
| GPIO 17       | BCK           |
| GPIO 16       | LCK           |
| GPIO 15       | DIN           |

**③ Verifica che XMT sia su HIGH** XMT è il pin di mute soft del PCM5102A：LOW = mutato, HIGH = riproduzione normale. Se dimentichi di portarlo a HIGH, il chip rimarrà permanentemente mutato. Soluzione：aggiungi `digitalWrite(7, HIGH)` nel codice o collega XMT direttamente a 3.3V.

------

### Q：Durante la riproduzione sento leggeri click o crepitii. Qual è la causa？

È uno dei temi più discussi nei progetti audio ESP32. Diverse cause possibili — classificate per probabilità：

**Causa 1：Sottoesecuzione del buffer I2S（Buffer Underrun）**（più probabile）

Quando l'ESP32 decodifica MP3 o legge dalla rete/SD, picchi improvvisi di carico CPU, buffer troppo piccoli o decodifica troppo lenta possono causare brevi interruzioni dei dati. Quando il PCM5102A riceve clock continui ma la linea dati va brevemente a zero, produce click riproducibili.

Soluzione：Aumenta `dma_buf_count`（8–16 raccomandato）e `dma_buf_len`（256–1024）in `i2s_config`. Se usi `xTaskCreate`, alza la priorità del task audio sopra il Wi-Fi e altri task in background.

**Causa 2：Incompatibilità di frequenza di campionamento o profondità bit**

Quando la frequenza di campionamento del file（44.1kHz / 48kHz）non corrisponde alla configurazione I2S dell'ESP32, o mescolando 24 bit e 16 bit.

Soluzione：Converti tutti i file audio in 44.1kHz, 16 bit, stereo（ffmpeg per elaborazione batch）. Imposta esplicitamente `bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT`.

**Causa 3：Problemi di integrità del segnale hardware**

Cavi I2S troppo lunghi senza resistenze di smorzamento in serie possono causare ringing sui bordi del segnale. L'attività Wi-Fi/CPU dell'ESP32 può anche iniettare rumore tramite l'alimentazione 3.3V condivisa.

Soluzione：Aggiungi resistenze in serie da 33–100Ω su BCK, LCK, DIN（vicino all'ESP32）. Aggiungi condensatori di disaccoppiamento dedicati da 10μF + 0.1μF per il PCM5102A.

**Causa 4：Attivazione dell'auto-mute interno del PCM5102A**

Quando i dati DIN scendono brevemente a zero o a livello basso, la logica di mute intelligente del chip si attiva, producendo un leggero pop.

Soluzione：Aggiungi transizioni di dissolvenza in entrata/uscita（fade in/out）all'inizio e alla fine della riproduzione.

**Diagnosi rapida：** Testa con un file WAV standard（44.1kHz 16 bit）per bypassare la decodifica MP3. Se i click persistono nella stessa posizione, è probabilmente un problema di buffer. Poi aggiungi gradualmente decodifica MP3 e streaming di rete per restringere la causa.

------

### Q：La riproduzione online si interrompe o va a scatti. Cosa posso fare？

Lo streaming dipende dalla qualità della rete. Prova prima con un link MP3 diretto più veloce. Se la rete non è il problema, passa a file locali da SD card o SPIFFS.

------

### Q：Posso usare altri GPIO per l'I2S？

Sì. La periferica I2S dell'ESP32-S3 supporta il mapping GPIO arbitrario — cambia semplicemente i valori di `#define I2S_BCLK`, `I2S_LRCK`, `I2S_DOUT` nel codice.

------

### Q：Quali frequenze di campionamento supporta il PCM5102A？

Il PCM5102A supporta 8kHz, 16kHz, 32kHz, 44.1kHz, 48kHz, 96kHz, 192kHz e 384kHz — coprendo tutte le esigenze di riproduzione MP3（generalmente 44.1kHz）.

------

### Q：Posso alimentare il PCM5102A a 5V？

Alcuni moduli PCM5102A con LDO integrato accettano un ingresso 5V e lo regolano internamente a 3.3V. Se il tuo modulo ha solo un pin 3.3V（nessun pin 5V）, usa il 3.3V. Raccomandiamo l'alimentazione a 3.3V per maggiore stabilità e compatibilità dei livelli logici con l'ESP32-S3.

------

### Q：L'utilizzo della CPU è alto durante la riproduzione MP3？

La libreria ESP32-audioI2S sfrutta l'architettura dual-core dell'ESP32-S3, eseguendo la decodifica audio su un core separato con un impatto minimo sul loop principale. L'utilizzo tipico della CPU è tra il 10% e il 30%.

------

### Q：Posso pilotare uno schermo TFT mentre riproduco audio？

Sì. L'ESP32-S3 ha prestazioni sufficienti per gestire simultaneamente l'output audio I2S e il display TFT via SPI. Assicurati solo che `loop()` non contenga operazioni bloccanti lunghe — priverebbero `audio.loop()` e causerebbero interruzioni o click.

------

### Q：Qual è l'interfaccia di uscita del PCM5102A？ Posso collegare un amplificatore？

Il modulo PCM5102A fornisce tipicamente un'uscita analogica stereo 3.5mm standard per cuffie o altoparlanti passivi. Per un amplificatore, usa l'interfaccia LINE OUT del modulo — il livello di uscita è più adatto all'ingresso dell'amplificatore e offre una migliore qualità sonora.

------

### Q：ESP32-S3 vs ESP32 originale per l'audio I2S — qual è la differenza？

L'ESP32-S3 funziona a 240MHz dual-core（più veloce delle varianti ESP32 originali）, rendendo la decodifica MP3 più fluida con meno perdita di frame e click. Ha anche più risorse GPIO — ideale per progetti che combinano audio, display e rete.

---

## Riferimenti

- **Datasheet PCM5102A（Texas Instruments）：**
  [https://www.ti.com/lit/ds/symlink/pcm5102a.pdf](https://www.ti.com/lit/ds/symlink/pcm5102a.pdf)

- **Libreria ESP32-audioI2S（GitHub, di schreibfaul1）：**
  [https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

- **Documentazione tecnica ESP32-S3 di Espressif：**
  [https://www.espressif.com/en/products/socs/esp32-s3](https://www.espressif.com/en/products/socs/esp32-s3)

---

*Per altri esperimenti e tutorial ESP32, visita [www.lingflux.com](http://www.lingflux.com)*
