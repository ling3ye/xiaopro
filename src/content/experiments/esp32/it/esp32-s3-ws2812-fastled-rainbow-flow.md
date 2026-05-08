---
title: "ESP32-S3 guida completa: effetto arcobaleno rotante con anello WS2812 e FastLED (protocollo single-wire)"
boardId: esp32s3
moduleId: lighting/ws2812b-40led-ring
category: esp32
date: 2026-05-08
intro: "Guida ESP32-S3 per pilotare un anello WS2812 con la libreria FastLED e realizzare un effetto arcobaleno rotante non bloccante. Collegamento a 3 fili, riproducibile in 30 minuti anche per principianti."
image: "https://img.lingflux.com/2026/05/d991a873016f98577b8ed80aefa9d67b.jpg"
---



# ESP32-S3 guida completa: effetto arcobaleno rotante con anello WS2812 e FastLED

Difficoltà: ⭐⭐☆☆☆ (adatto ai principianti)
Tempo stimato: 30 minuti
Ambiente di test: Arduino IDE 2.3.8 + FastLED v3.10.3 + ESP32 Arduino Core 3.3.8

---

> **TL;DR (guida rapida):**
>
> 1. Collegamenti: anello WS2812 `DIN` → ESP32-S3 `GPIO40`, `VCC` → 5V, `GND` → GND
> 2. Installa la libreria: cerca `FastLED` nel gestore librerie di Arduino (autore Daniel Garcia), installa l'ultima versione
> 3. Modifica nel codice `NUM_LEDS` (numero di LED) e `LED_PIN` (pin) secondo le tue esigenze
> 4. Carica il codice, alimenta la scheda e l'anello inizierà a ruotare

---

## Introduzione

Avevo un anello WS2812 che raccoglieva polvere in casa da un bel po', in attesa di "avere tempo per giocarci". Visto che era ormai tempo di fare pulizia, ho colto l'occasione per preparare un esempio semplice.

La cosa più interessante delle strisce/anelli/pannelli WS2812 è che l'intero dispositivo richiede **un solo filo dati**, più l'alimentazione, per un totale di soli 3 fili. Ogni LED può essere controllato individualmente grazie al chip driver integrato. Niente decoder, niente shift register, basta una manciata di righe di codice.

Obiettivo di questo articolo: usare un ESP32-S3 con la libreria FastLED per realizzare un effetto arcobaleno rotante lungo l'anello, completamente non bloccante, così da poter aggiungere facilmente altre funzionalità in seguito.

---

## Risultato dell'esperimento

![](https://img.lingflux.com/2026/05/b9b24692bd3fe29d05bafd71a1a6ee89.jpg)

I 40 LED dell'anello si accendono contemporaneamente con colori distribuiti in gradazione arcobaleno; l'intera tonalità ruota in modo continuo, creando l'effetto di un anello di luce colorata in movimento.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/kA8XlvHq3_I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## Descrizione del componente

### Anello WS2812

L'anello WS2812 funziona come un gioco del telefono senza fili: invii tutti i dati al primo LED, che tiene per sé la propria informazione sul colore e passa il resto al successivo; il secondo LED fa lo stesso e così via lungo tutta la catena. Questa configurazione è chiamata daisy-chain (collegamento a catena) e permette di controllare decine (o addirittura centinaia) di LED con un solo filo dati, ognuno con il proprio colore indipendente.

```
Esempio: sequenza dati: [rosso, blu, verde, giallo]
         ↓
   LED ¹ prende "rosso" → accende rosso → passa [blu, verde, giallo] al successivo
         ↓
   LED ² prende "blu" → accende blu → passa [verde, giallo] al successivo
         ↓
   LED ³ prende "verde" → accende verde → passa [giallo] al successivo
   ...
   ...
   ...
```

| Parametro | Valore |
| --- | --- |
| Tensione di alimentazione | 5V |
| Corrente massima per LED | 60mA (20mA per R/G/B, tutti accesi) |
| Livello segnale dati | Compatibile con logica 3.3V (nessun convertitore di livello necessario) |
| Protocollo di comunicazione | Single-wire NZR (Non-Return-to-Zero) |
| Ordine dei colori | GRB |
| Frequenza di aggiornamento | 400Hz / 800Hz (a seconda del modello) |

> Perché sceglierlo: collegamento estremamente semplice (un solo filo dati), supporto nativo in FastLED, ampia documentazione della community, poche insidie per i principianti.

---

**Quanti LED può pilotare teoricamente e nella pratica una singola linea dati WS2812B (un GPIO)?**

### Limite teorico

**Quasi nessun limite rigido** (può pilotare diverse migliaia di LED). Il WS2812B utilizza una connessione daisy-chain: il pin DO di ogni LED è collegato al pin DI del successivo, e i dati vengono trasmessi uno ad uno lungo la catena. Finché il microcontrollore riesce a inviare frame di dati completi in tempo, il concatenamento può proseguire indefinitamente.

### Numero consigliato nella pratica (una linea dati)

| Scenario d'uso | Quantità massima consigliata | Note |
| --- | --- | --- |
| **Animazione fluida/giochi** (alta frequenza di aggiornamento) | **300~600 LED** | Gamma consigliata, la frequenza di aggiornamento si mantiene sopra i 30~60fps |
| **Effetti generici/luce d'atmosfera** | **800~1200 LED** | Limite superiore più comune, frequenza di aggiornamento circa 15~30fps |
| **Situazione limite** | **2000~4000+ LED** | Possibile, ma frequenza di aggiornamento molto bassa (<10fps), il segnale può dare problemi |
| **Progetti professionali/large-scale** | Diverse migliaia~decine di migliaia | È necessario **utilizzare più linee dati** in parallelo (ESP32 è ideale) |

### Fattori limitanti principali

1. **Frequenza di aggiornamento (il più importante)** Ogni LED richiede circa 30μs di dati (24 bit).
   - 1000 LED ≈ 30ms → circa 33fps
   - 2000 LED ≈ 60ms → circa 16fps (scattoso e visibile)
2. **Qualità del segnale**
   - Se il cavo dati è troppo lungo (>10~15 metri) o ci sono troppi LED, gli ultimi LED possono mostrare pixel difettosi, colori errati o sfarfallio.
   - Si consiglia di aggiungere un **ripetitore di segnale** (74HCT245 / SN74AHCT125, ecc.) o un **modulo ripetitore** ogni 500~1000 LED circa.
3. **Alimentazione** (non è un limite della linea dati, ma va risolto)
   - Ogni LED acceso in bianco pieno assorbe fino a circa 60mA (in media generalmente 20~30mA).
   - È **obbligatorio inserire punti di alimentazione multipli** (ogni 1~2 metri), altrimenti la caduta di tensione provoca attenuazione e alterazione del colore verso la fine della catena.

---

## Lista componenti (BOM)

| Componente | Specifiche | Quantità |
| --- | --- | --- |
| Scheda di sviluppo ESP32-S3 | Qualsiasi versione con pin GPIO | ×1 |
| Anello WS2812 | 40 LED (o altro numero, basta modificare una riga nel codice) | ×1 |
| Cavi jumper | Maschio-femmina / maschio-maschio, secondo le necessità | alcuni |

---

## Descrizione dei pin del componente

L'anello WS2812 ha solitamente i seguenti 4 pin:

| Etichetta pin | Descrizione |
| --- | --- |
| VCC / 5V | Polo positivo dell'alimentazione, collegare a 5V |
| GND | Polo negativo dell'alimentazione, collegare a GND |
| DIN / Data In | Ingresso dati, collegare a un GPIO dell'ESP32-S3 |
| DOUT / Data Out | Uscita dati, utilizzato per collegare più anelli in cascata, non collegato in questo progetto |

> ⚠️ Alcuni anelli riportano solo `+`, `-`, `Data`; la corrispondenza è la stessa, non farti confondere.

---

## Schema dei collegamenti

| Pin anello WS2812 | ESP32-S3 |
| --- | --- |
| VCC / 5V | 5V (pin 5V della scheda o alimentazione esterna 5V) |
| GND | GND |
| DIN | GPIO40 |

> 💡 **Consiglio: ricontrolla tutti i collegamenti uno per uno dopo aver finito**, questo risolve l'80% dei problemi di debug. Fai particolare attenzione a non collegare VCC a 3.3V: i LED si accenderebbero ma i colori sarebbero sbiaditi e la luminosità ridotta, sprecando inutilmente tempo di debug.

---

## Librerie necessarie

Cerca **`FastLED`** nel gestore librerie di Arduino IDE, l'autore è **Daniel Garcia**; installa l'ultima versione (versione testata in questo articolo: v3.10.3).

Percorso di installazione: `Strumenti` → `Gestione librerie` → cerca `FastLED` → Installa

---

## Codice completo

```cpp
/*
 * ESP32-S3 anello arcobaleno rotante WS2812
 * Versione non bloccante con FastLED: non blocca loop(), comodo per aggiungere
 * pulsanti, sensori e altre funzionalità in seguito
 */

#include <FastLED.h>

// ===== Modifica qui in base alla tua configurazione =====
#define LED_PIN     40       // Pin GPIO collegato al filo dati
#define NUM_LEDS    40       // Numero di LED sull'anello
#define BRIGHTNESS  204      // Luminosità globale, range 0 (spento) ~ 255 (massimo)
// ====================================

#define LED_TYPE    WS2812B
#define COLOR_ORDER GRB      // L'ordine dei colori del WS2812 è GRB, non RGB, attento a non invertirlo

CRGB leds[NUM_LEDS];         // Array dei colori per ogni LED

uint8_t gHue = 0;            // Tonalità iniziale dell'arcobaleno, incrementata ad ogni frame per l'effetto "rotante"

void setup() {
    // Primo passo: dai 1 secondo all'hardware per avviarsi, evita picchi di corrente
    // all'accensione che potrebbero causare sfarfallio dei LED
    delay(1000);

    // Secondo passo: inizializza FastLED, indica quale pin, tipo di LED e quantità
    FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS)
           .setCorrection(TypicalLEDStrip);  // Correzione automatica della temperatura di colore,
                                              // rende il bianco più naturale

    // Terzo passo: imposta la luminosità globale (più comodo che modificare i valori RGB)
    FastLED.setBrightness(BRIGHTNESS);
}

void loop() {
    // Quarto passo: riempi l'intero anello con una gradazione arcobaleno
    // gHue è la tonalità iniziale, 255/NUM_LEDS è l'intervallo di tonalità tra ogni LED
    fill_rainbow(leds, NUM_LEDS, gHue, 255 / NUM_LEDS);

    // Quinto passo: invia i dati dei colori all'anello
    FastLED.show();

    // Sesto passo: ogni 10ms incrementa la tonalità di +1,
    // valore più piccolo = rotazione più veloce, valore più grande = più lenta
    EVERY_N_MILLISECONDS(10) {
        gHue++;
    }
}
```

### Spiegazione del codice

| Riga chiave | Cosa fa |
| --- | --- |
| `fill_rainbow(...)` | Funzione integrata di FastLED, calcola automaticamente i colori della gradazione arcobaleno e riempie l'array, senza dover scrivere calcoli HSV a mano |
| `FastLED.show()` | Invia i dati dei colori dell'array `leds[]` tramite GPIO40; prima di questa chiamata i LED non cambieranno |
| `EVERY_N_MILLISECONDS(10)` | Timer non bloccante integrato in FastLED, equivalente a "esegui ogni 10ms", non blocca `loop()` |
| `gHue++` | Incrementa la tonalità di +1; al frame successivo `fill_rainbow` parte da una tonalità diversa, creando l'effetto di rotazione |
| `setCorrection(TypicalLEDStrip)` | Correzione automatica della temperatura di colore dei LED, evita che il bianco misto tenda al verde, adatto per WS2812 |

> Per modificare la velocità di rotazione: cambia il valore dentro `EVERY_N_MILLISECONDS(10)`, **10 → 5** raddoppia la velocità, **10 → 20** la dimezza.

---

## Risoluzione dei problemi comuni

Niente panico, il 90% dei problemi deriva da questi punti:

**Problema 1: I LED non si accendono affatto dopo l'accensione**

- Verifica che DIN sia collegato a `GPIO40` (il pin definito in `LED_PIN` nel codice)
- Assicurati che VCC sia collegato a **5V** e non a 3.3V
- Controlla che GND sia collegato correttamente: senza massa comune, il segnale dati non viene trasmesso

**Problema 2: Solo alcuni LED si accendono, o i colori lampeggiano in modo casuale**

- Molto probabilmente alimentazione insufficiente. 40 LED accesi in bianco pieno assorbono fino a 2.4A; la porta USB con i suoi 500mA non basta. Si consiglia un'alimentazione esterna da 5V con almeno 2A

**Problema 3: I colori sono strani, il rosso appare verde**

- La definizione di `COLOR_ORDER` è errata. Il WS2812B usa l'ordine GRB; prova a cambiare `GRB` in `RGB` nel codice, o viceversa

**Problema 4: Errore di compilazione `FastLED.h: No such file`**

- La libreria non è installata. Riapri il gestore librerie, verifica che FastLED risulti "Installata", poi riavvia Arduino IDE

**Problema 5: Il caricamento funziona ma i LED non si muovono**

- Verifica che `NUM_LEDS` corrisponda al numero effettivo di LED del tuo anello; un numero errato causa visualizzazioni anomale

---

## FAQ

**D: Qual è la differenza tra WS2812 e WS2812B, il codice è compatibile?**
R: Il WS2812B è la versione aggiornata del WS2812, con package più piccolo e temporizzazioni leggermente diverse, ma FastLED supporta entrambi. Imposta `LED_TYPE` su `WS2812B` e non è necessario modificare altro nel codice.

**D: Il mio anello ha solo 12/16/24 LED, come modifico il codice?**
R: Cambia solo una riga: `#define NUM_LEDS 24`, sostituisci con il numero effettivo di LED del tuo anello, il resto rimane invariato.

**D: Posso usare un pin diverso da GPIO40?**
R: Sì, la maggior parte dei GPIO dell'ESP32-S3 può essere utilizzata (evita i pin 0, 3, 45, 46 e altri legati all'avvio). Cambia il numero in `#define LED_PIN 40` e collega il filo dati al pin corrispondente.

**D: Posso pilotare più anelli contemporaneamente?**
R: Sì. Collega ogni anello a un GPIO indipendente, chiama `addLeds` una volta in più nel codice e assegna segmenti separati dell'array `leds[]`.

**D: L'anello ha bisogno di alimentazione separata?**
R: Se il numero di LED è ≤ 8 e la luminosità non è al massimo, il pin 5V della scheda di sviluppo può bastare. Oltre 8 LED o con bianco pieno, si consiglia vivamente un'alimentazione esterna da 5V con almeno 2A, collegando il GND dell'alimentazione esterna al GND della scheda (massa comune).

**D: Cos'è `EVERY_N_MILLISECONDS`, perché non usare direttamente `delay()`?**
R: `EVERY_N_MILLISECONDS` è un timer non bloccante integrato in FastLED; `loop()` continua ad essere eseguito normalmente e il codice al suo interno viene eseguito solo ogni intervallo specificato. Con `delay()` l'intero programma si bloccherebbe, impedendo di gestire simultaneamente pulsanti, comunicazione seriale e altre attività.

**D: Posso invertire la direzione di rotazione dell'arcobaleno?**
R: Sì, sostituisci `gHue++` con `gHue--` e la rotazione si invertirà.

---

## Estensioni e spunti

- Aggiungere un pulsante per cambiare effetto (respirazione / scorrimento / arcobaleno, commutabile liberamente)
- Collegare un modulo microfono per un effetto LED spettro audio reattivo
- Concatenare più anelli in cascata, collegando il DIN al DOUT del precedente, per ottenere una striscia più lunga
- Collegare un display OLED per mostrare il nome dell'effetto corrente e il valore della luminosità

---

## Riferimenti

- [FastLED GitHub ufficiale](https://github.com/FastLED/FastLED)
- [Datasheet WS2812B (WorldSemi ufficiale)](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf)
- [Espressif manuale di riferimento tecnico ESP32-S3](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [Espressif pagina prodotto ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3)
