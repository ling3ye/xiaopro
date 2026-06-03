---
title: "ESP32-S3 + GC9A01 + MPU6050: Livella Digitale Completa | SPI + I2C + Arduino"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-03
intro: "Usa ESP32-S3 per pilotare il display LCD circolare GC9A01 e il sensore a 6 assi MPU6050, mostrando in tempo reale l'angolo di beccheggio, rollio e temperatura, per realizzare una livella digitale bella e funzionale."
image: "https://img.lingflux.com/2026/06/64f482f7efccfdc6b16f216a95efc28e.jpg"
---

# Tutorial Completo: Livella Digitale con ESP32-S3 + GC9A01 + MPU6050 (SPI + I2C + Arduino)

Difficoltà: ⭐⭐☆☆☆ (adatta ai principianti)
Tempo stimato: 45 minuti
Ambiente di test: Arduino IDE 2.3.8 | Arduino_GFX_Library v1.6.5 | MPU6050_light v1.2.1

---

> **Riassunto in una frase**: ESP32-S3 pilota il TFT circolare GC9A01 + il sensore a 6 assi MPU6050 per creare una livella a bolla in tempo reale, con il colore della bolla che cambia in base all'inclinazione (verde → giallo → rosso), completa di tabella di collegamento e codice Arduino.

---

> **TL;DR (avvio rapido):**
>
> 1. Collegamento MPU6050: SDA → GPIO 15, SCL → GPIO 16, AD0 → GND (indirizzo I2C fisso 0x68)
> 2. Collegamento GC9A01: CLK → GPIO 12, MOSI → GPIO 11, CS → GPIO 9, DC → GPIO 10, RST → GPIO 18, BL → GPIO 7
> 3. Installa le librerie: `GFX Library for Arduino` (autore moononournation) + `MPU6050_light` (autore rfetick)
> 4. Carica il codice, dopo l'accensione **mantieni il dispositivo in piano e fermo per circa 1 secondo** finché non scompare il messaggio di calibrazione, poi inclinalo per vedere la bolla muoversi

---

## Introduzione

Ti è mai capitato di montare una mensola a mano libera, pensando "più o meno è in piano", per poi scoprire che tutto scivola da una parte?

Sono esattamente così. Non avendo una livella tradizionale a portata di mano, ho frugato nella scatola dei componenti — e ho trovato il display circolare GC9A01 e il modulo MPU6050 che prendevano polvere in un angolo. Insieme, erano tutto ciò che serviva per una livella digitale fai-da-te.

Inoltre, il display circolare è perfetto per una livella a bolla: bolla al centro = verde, leggermente spostata = giallo, troppo inclinata = rosso. Tutto intuitivo, senza bisogno di istruzioni.

Obiettivo di questo tutorial: **partire da zero, collegamenti → librerie → codice → bolla che si muove**, seguendo i passaggi puoi riprodurre tutto.

---

## Risultato finale

![](https://img.lingflux.com/2026/06/09a4ed83eaa702df1ded539d608c9323.jpg)

Lo schermo mostra in tempo reale quattro informazioni:

- **Bolla centrale**: si muove con l'inclinazione del dispositivo, con indicazione a tre colori (verde = in piano / giallo = leggermente inclinato / rosso = inclinazione evidente)
- **Angolo di inclinazione combinato** (°): valore combinato di Pitch e Roll, mostrato a caratteri grandi
- **Valori Pitch / Roll**: letture separate di beccheggio e rollio
- **Temperatura del chip**: lettura del sensore di temperatura integrato nel MPU6050 (è normale che sia più alta della temperatura ambiente, vedi spiegazione più avanti)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30s2V_TAoMo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## Descrizione dei componenti

### Display TFT circolare GC9A01

Immaginalo come **uno schermo da smartphone tagliato a forma circolare** — la risoluzione 240×240 non è eccezionale, ma con il vetro circolare appoggiato sul tavolo, come quadrante di una livella è semplicemente perfetto.

| Parametro | Valore |
| --- | --- |
| Risoluzione | 240 × 240 px (area di visualizzazione circolare) |
| Interfaccia | SPI (fino a 80 MHz) |
| Alimentazione | 3.3V |
| Profondità colore | 65K colori (RGB565) |
| Tipo pannello | IPS |

Perché l'abbiamo scelto: il quadrante circolare si adatta naturalmente alla forma di una livella a bolla, e l'interfaccia SPI ad alta velocità gestisce agevolmente animazioni a 20fps.

### Sensore inerziale a 6 assi MPU6050

Immaginalo come **la combinazione di giroscopio e accelerometro del tuo smartphone** — la rotazione automatica dello schermo e il conta-passi usano chip dello stesso tipo. Il MPU6050 integra un accelerometro a tre assi (rileva la direzione di inclinazione) e un giroscopio a tre assi (rileva la velocità di rotazione) in un singolo chip da 4mm × 4mm, con in omaggio anche un sensore di temperatura.

| Parametro | Valore |
| --- | --- |
| Range accelerometro | ±2 / ±4 / ±8 / ±16 g (configurabile) |
| Range giroscopio | ±250 / ±500 / ±1000 / ±2000 °/s (configurabile) |
| Risoluzione ADC | 16 bit |
| Interfaccia | I2C (fino a 400 kHz modalità veloce) |
| Alimentazione | 3.3V (VDD: 2.375 ~ 3.46V) |
| Indirizzo I2C | 0x68 (AD0 = GND) / 0x69 (AD0 = VCC) |

Perché l'abbiamo scelto: costo molto basso, ottime librerie disponibili, `MPU6050_light` restituisce direttamente gli angoli fusionati senza dover implementare un filtro di Kalman.

---

## Lista componenti (BOM)

| Componente | Modello / Specifiche | Quantità |
| --- | --- | --- |
| Scheda di sviluppo | ESP32-S3 | 1 |
| Display TFT circolare | GC9A01 240×240 IPS | 1 |
| Sensore a 6 assi | Modulo MPU6050 | 1 |
| Cavi | Pontetti Dupont | alcuni |

---

## Descrizione pin dei componenti

### Pin GC9A01

| Etichetta pin | Funzione |
| --- | --- |
| VCC | Alimentazione principale 3.3V |
| GND | Massa |
| SCL / CLK | Clock SPI (SCLK) |
| SDA / MOSI | Dati SPI Master Out Slave In |
| CS | Chip Select (attivo basso) |
| DC | Commutazione Dati / Comando |
| RST | Reset hardware (attivo basso) |
| BL | Controllo retroilluminazione |

### Pin MPU6050

| Etichetta pin | Funzione |
| --- | --- |
| VCC | Alimentazione principale 3.3V |
| GND | Massa |
| SDA | Linea dati I2C |
| SCL | Linea clock I2C |
| INT | Output interrupt (non collegato in modalità polling) |
| AD0 | Selezione indirizzo I2C (collegato a GND = 0x68) |
| XDA / XCL | Interfaccia I2C ausiliaria (non usata in questo progetto) |

---

## Schema dei collegamenti

> Si consiglia di collegare i fili seguendo la tabella riga per riga, spuntando ogni filo completato. Questo riduce l'80% del tempo di troubleshooting.

### MPU6050 → ESP32-S3

| Pin MPU6050 | Pin ESP32-S3 | Note |
| --- | --- | --- |
| VCC | 3.3V | Alimentazione principale |
| GND | GND | Massa comune |
| SDA | GPIO 15 | Linea dati I2C |
| SCL | GPIO 16 | Linea clock I2C |
| AD0 | GND | Fissa l'indirizzo I2C a 0x68 |
| INT / XDA / XCL | Non collegato | Non necessari per questo progetto |

**Sulle resistenze di pull-up I2C**: la pratica standard prevede di collegare una resistenza di pull-up da 4.7kΩ su ciascuna linea SDA e SCL verso 3.3V, per migliorare significativamente la stabilità contro le interferenze durante letture ad alta velocità. In questo esempio sono state omesse, ma se intendi realizzare un prodotto finito, si consiglia di aggiungerle.

### GC9A01 → ESP32-S3

| Pin GC9A01 | Pin ESP32-S3 | Note |
| --- | --- | --- |
| VCC | 3.3V | Alimentazione principale |
| GND | GND | Massa comune |
| SCL / CLK | GPIO 12 | Clock SPI |
| SDA / MOSI | GPIO 11 | Dati SPI |
| CS | GPIO 9 | Chip Select |
| DC | GPIO 10 | Commutazione Dati / Comando |
| RST | GPIO 18 | Reset hardware |
| BL | GPIO 7 | Retroilluminazione (opzionale, alcuni moduli non hanno questo pin. Controllabile via software con livello alto/basso, o collegato direttamente a 3.3V per retroilluminazione sempre accesa) |



---

## Librerie da installare

Nel menu di Arduino IDE **Strumenti → Gestione librerie** cerca e installa:

| Nome libreria | Autore | Versione testata |
| --- | --- | --- |
| GFX Library for Arduino | moononournation | v1.6.5 |
| MPU6050_light | rfetick | v1.2.1 |

Versioni diverse potrebbero avere API modificate, si consiglia di installare le versioni indicate nella tabella. Dopo l'installazione riavvia Arduino IDE prima di aprire il progetto.



---

## Codice completo

```cpp
/**
 * ESP32-S3 + GC9A01 + MPU6050 Livella Digitale
 * Digital Spirit Level
 *
 * Collegamenti:
 *   GC9A01  → SCL=12, SDA=11, CS=9, DC=10, RST=18, BL=7
 *   MPU6050 → SDA=15, SCL=16, AD0=GND (indirizzo I2C 0x68)
 */

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <MPU6050_light.h>

// ---- Definizioni colori (formato RGB565) ----
#define COLOR_BG       0x0863   // Sfondo scuro
#define COLOR_GRID     0x1A69   // Linee griglia
#define COLOR_GREEN    0x07E6   // Bolla centrata → verde
#define COLOR_YELLOW   0xFEA0   // Leggermente inclinata → giallo
#define COLOR_RED      0xF820   // Inclinazione eccessiva → rosso
#define COLOR_TEXT     0xC618   // Testo normale
#define COLOR_ACCENT   0xFD20   // Croce centrale

// ---- Pin SPI GC9A01 ----
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---- Pin I2C MPU6050 (devono corrispondere alla tabella di collegamento) ----
#define MPU_SDA  15   // SDA → GPIO 15
#define MPU_SCL  16   // SCL → GPIO 16

// ---- Inizializzazione driver display ----
// Primo passo: crea il bus SPI, ordine parametri: DC, CS, SCK, MOSI, MISO
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA,
    GFX_NOT_DEFINED
);
// Secondo passo: crea l'oggetto schermo GC9A01 (rotation=0, pannello IPS=true)
Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST, 0, true
);
// Terzo passo: crea Canvas 240×240 off-screen (doppio buffer, previene tearing)
Arduino_Canvas *canvas = new Arduino_Canvas(
    240, 240, gfx
);

// ---- MPU6050 ----
MPU6050 mpu(Wire);

// ---- Controllo framerate ----
const int16_t cx = 120, cy = 120;    // Coordinate centro schermo (pixel)
unsigned long lastFrame = 0;
const int frameDelay = 1000 / 20;    // Framerate target: 20fps → 50ms per frame

// ---- Dichiarazione anticipata funzioni ----
void drawGrid();
void drawBubble(float pitch, float roll);
void drawReadouts(float pitch, float roll, float temp);

// =============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("=== ESP32-S3 Livella Digitale - Avvio ===");

    // Primo passo: inizializza schermo e retroilluminazione
    gfx->begin();
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);    // Accendi retroilluminazione
    canvas->begin();
    Serial.println("[OK] Schermo inizializzato");

    // Secondo passo: inizializza I2C, scansione bus (utile per verificare i collegamenti durante il debug)
    Wire.begin(MPU_SDA, MPU_SCL);
    Serial.print("[DBG] Scansione bus I2C SDA=");
    Serial.print(MPU_SDA);
    Serial.print(" SCL=");
    Serial.println(MPU_SCL);

    byte found = 0;
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            Serial.print("  Trovato dispositivo I2C, indirizzo: 0x");
            Serial.println(addr, HEX);
            found++;
        }
    }
    if (found == 0) {
        Serial.println("[ERROR] Nessun dispositivo I2C trovato! Controlla i collegamenti.");
    }

    // Terzo passo: inizializza MPU6050
    byte status = mpu.begin();
    if (status == 0) {
        Serial.println("[OK] MPU6050 connesso");
    } else {
        Serial.println("[ERROR] MPU6050 non risponde! Controlla collegamenti o indirizzo I2C.");
    }

    // Quarto passo: calibrazione automatica giroscopio (mantieni il dispositivo piano e fermo per circa 1 secondo)
    Serial.println("[DBG] Calibrazione in corso, mantieni il dispositivo in piano, non muoverlo...");
    canvas->fillScreen(COLOR_BG);
    canvas->setTextColor(COLOR_TEXT);
    canvas->setTextSize(1);
    canvas->setCursor(60, 110);
    canvas->print("Calibrating...");
    canvas->setCursor(55, 125);
    canvas->print("Keep device flat");
    canvas->flush();

    delay(1000);
    mpu.calcOffsets();    // Calcola automaticamente l'offset di accelerometro e giroscopio

    Serial.print("[DBG] Offset accelerometro: ");
    Serial.print(mpu.getAccXoffset());  Serial.print(", ");
    Serial.print(mpu.getAccYoffset());  Serial.print(", ");
    Serial.println(mpu.getAccZoffset());
    Serial.print("[DBG] Offset giroscopio: ");
    Serial.print(mpu.getGyroXoffset()); Serial.print(", ");
    Serial.print(mpu.getGyroYoffset()); Serial.print(", ");
    Serial.println(mpu.getGyroZoffset());
    Serial.println("[OK] Calibrazione completata, avvio!");
}

// =============================================================
static int logCnt = 0;    // Contatore throttle log debug

void loop() {
    unsigned long now = millis();
    if (now - lastFrame < frameDelay) return;    // Throttle framerate
    lastFrame = now;

    // Primo passo: leggi sensore
    mpu.update();
    float pitch = mpu.getAngleY();     // Beccheggio (inclinazione avanti/indietro)
    float roll  = -mpu.getAngleX();    // Rollio (inclinazione sinistra/destra, negato per allineare la direzione visiva)
    float temp  = mpu.getTemp();       // Temperatura chip (più alta della temperatura ambiente, è normale)

    // Log debug: stampa ogni 20 frame (circa 1 secondo), non influisce sul framerate
    if (++logCnt >= 20) {
        logCnt = 0;
        Serial.print("[DBG] pitch="); Serial.print(pitch, 2);
        Serial.print(" roll=");       Serial.print(roll,  2);
        Serial.print(" temp=");       Serial.print(temp,  1);
        Serial.print(" | accX=");     Serial.print(mpu.getAccX(), 2);
        Serial.print(" accY=");       Serial.print(mpu.getAccY(), 2);
        Serial.print(" accZ=");       Serial.println(mpu.getAccZ(), 2);
    }

    // Secondo passo: limita i valori — oltre ±45° la bolla rimane al bordo, non esce dal cerchio
    pitch = constrain(pitch, -45.0f, 45.0f);
    roll  = constrain(roll,  -45.0f, 45.0f);

    // Terzo passo: disegna il frame corrente
    canvas->fillScreen(COLOR_BG);        // Pulisci canvas
    drawGrid();                          // Griglia con tacche
    drawBubble(pitch, roll);             // Bolla
    drawReadouts(pitch, roll, temp);     // Valori numerici
    canvas->flush();                     // Invia allo schermo
}

// =============================================================
// Disegna cerchi di sfondo con tacche e mirino centrale
void drawGrid() {
    canvas->drawCircle(cx, cy,  25, COLOR_GRID);
    canvas->drawCircle(cx, cy,  50, COLOR_GRID);
    canvas->drawCircle(cx, cy,  80, COLOR_GRID);
    canvas->drawCircle(cx, cy, 105, COLOR_GRID);
    canvas->drawFastHLine(15, cy,  210, COLOR_GRID);
    canvas->drawFastVLine(cx, 15,  210, COLOR_GRID);
    // Mirino centrale (colore accent, più visibile della griglia)
    canvas->drawFastHLine(cx - 5, cy,     10, COLOR_ACCENT);
    canvas->drawFastVLine(cx,     cy - 5, 10, COLOR_ACCENT);
}

// Mappa la posizione della bolla in base all'angolo pitch/roll e colora in base alla distanza
void drawBubble(float pitch, float roll) {
    // ±45° mappati linearmente su ±90px di offset
    int16_t bx = cx + (int16_t)(roll  / 45.0f * 90.0f);
    int16_t by = cy + (int16_t)(pitch / 45.0f * 90.0f);

    // Calcola distanza in pixel della bolla dal centro, determina il colore
    float dist = sqrt((float)((bx - cx) * (bx - cx) + (by - cy) * (by - cy)));
    uint16_t color;
    if      (dist < 10) color = COLOR_GREEN;    // Entro ~±5°: in piano
    else if (dist < 40) color = COLOR_YELLOW;   // Entro ~±20°: leggermente inclinato
    else                color = COLOR_RED;       // Oltre ±20°: inclinazione evidente

    // Linea dal centro alla bolla + bolla piena + bordo bianco
    canvas->drawLine(cx, cy, bx, by, COLOR_GRID);
    canvas->fillCircle(bx, by, 8, color);
    canvas->drawCircle(bx, by, 8, 0xFFFF);
}

// Disegna i valori angolari, testo di stato e temperatura
void drawReadouts(float pitch, float roll, float temp) {
    float total = sqrt(pitch * pitch + roll * roll);    // Inclinazione combinata

    canvas->setTextSize(1);
    canvas->setTextColor(COLOR_TEXT);

    // Titolo in alto
    canvas->setCursor(55, 18);
    canvas->print("DIGITAL LEVEL");

    // Angolo combinato: font grande, colore sincronizzato con la bolla
    canvas->setTextSize(2);
    uint16_t color;
    if      (total < 1)  color = COLOR_GREEN;
    else if (total < 10) color = COLOR_YELLOW;
    else                 color = COLOR_RED;
    canvas->setTextColor(color);
    canvas->setCursor(75, 155);
    canvas->print(total, 1);
    canvas->print((char)247);    // Simbolo ° (ASCII 247)

    // Testo di stato
    canvas->setTextSize(1);
    canvas->setCursor(80, 178);
    if      (total < 1)  canvas->print("  LEVEL");
    else if (total < 10) canvas->print(" TILTED");
    else                 canvas->print("  STEEP");

    // Letture Pitch / Roll
    canvas->setTextColor(COLOR_TEXT);
    canvas->setCursor(20, 195);
    canvas->print("P:"); canvas->print(pitch, 1);
    canvas->print(" R:"); canvas->print(roll,  1);

    // Temperatura (temperatura di giunzione del chip, più alta della temperatura ambiente, è normale)
    canvas->setCursor(60, 210);
    canvas->print("T:"); canvas->print(temp, 1);
    canvas->print("C");
}
```

---

## Spiegazione del codice

**Sequenza di inizializzazione (setup)**

Il setup procede in quattro passaggi: inizializzazione schermo → scansione I2C → inizializzazione MPU6050 → calibrazione giroscopio. La posizione in cui si trova il modulo al momento della calibrazione diventerà il punto di riferimento centrale.

Lo schermo utilizza `Arduino_Canvas` per il doppio buffer off-screen — tutto il disegno avviene prima in memoria, poi viene inviato allo schermo con `flush()`, evitando tearing o frame intermedi.

Il blocco di scansione I2C stampa sulla seriale gli indirizzi dei dispositivi trovati; al primo avvio puoi aprire il monitor seriale per confermare che il MPU6050 sia collegato correttamente (dovrebbe stampare `Found I2C device at 0x68`).

`mpu.calcOffsets()` esegue la calibrazione automatica in circa 1 secondo, durante i quali il dispositivo deve restare orizzontale e fermo. **La calibrazione viene ripetuta ad ogni accensione**, quindi ad ogni avvio posiziona il dispositivo in piano e aspetta che il messaggio scompaia prima dell'uso.

**Ciclo principale (loop)**

Il framerate è bloccato a 20fps; ogni frame esegue quattro operazioni: lettura sensore → limitazione valori → disegno → invio schermo.

`roll = -mpu.getAngleX()` ha un segno negativo — serve ad allineare la direzione di movimento della bolla sullo schermo con l'inclinazione reale; senza il negativo la bolla si muoverebbe nella direzione opposta. Se il tuo orientamento di installazione è diverso, puoi regolare il segno.

La bolla ha tre soglie di colore: distanza dal centro <10px verde, <40px giallo, oltre rosso, corrispondendo approssimativamente a ±5°, ±20° e oltre ±20°.

---

## Risoluzione problemi comuni

Non preoccuparti, il 90% dei problemi riguarda collegamenti e indirizzi:

**Schermo completamente bianco / nero, nessuna visualizzazione**

Verifica prima che VCC sia collegato a 3.3V e non a 5V (il GC9A01 non tollera tensioni superiori), e che il pin BL della retroilluminazione sia collegato. Controlla anche che i pin CS, DC e RST non siano invertiti — CS sbagliato e lo schermo non risponde, RST flottante rimane bloccato in reset. Puoi provare a collegare BL direttamente a 3.3V: se lo schermo si illumina di bianco, il display funziona ed è l'inizializzazione SPI a essere fallita.

**Il monitor seriale stampa `[ERROR] Nessun dispositivo I2C trovato`**

Misura con un multimetro la tensione sul pin VCC del MPU6050 per verificare che ci siano 3.3V. Conferma che SDA e SCL non siano invertiti (SDA → GPIO 15, SCL → GPIO 16). **AD0 deve essere esplicitamente collegato a GND** — se lasciato flottante, l'indirizzo su alcuni moduli diventa instabile e il bus I2C non risponde.

**La bolla trema continuamente, non si stabilizza**

Il dispositivo non era completamente fermo durante la calibrazione iniziale. Riavvia, posizionalo su un piano livellato e aspetta che il messaggio di calibrazione scompaia prima dell'uso. Se il piano vibra (stampante o ventilatore nelle vicinanze), cambia posizione.

**La direzione di Pitch o Roll è invertita**

In base all'orientamento di installazione della scheda, regola il segno davanti all'angolo corrispondente nel codice: cambia `pitch = mpu.getAngleY()` in `pitch = -mpu.getAngleY()`, oppure regola la riga di `roll`, finché la direzione non è corretta.

**La temperatura è più alta della temperatura ambiente di una decina di gradi**

È normale. Il MPU6050 misura la temperatura di giunzione del chip, che è tipicamente 10~20°C superiore alla temperatura ambiente. Valore solo indicativo. Se necessiti di una temperatura ambiente precisa, collega un sensore esterno (es. DS18B20).

**L'immagine lampeggia o presenta tearing**

Il codice utilizza il doppio buffer con `Arduino_Canvas`, quindi normalmente non dovrebbe esserci tearing. Se il problema persiste, controlla che i pontetti Dupont SPI non siano allentati, che i cavi non superino i 20cm, e se necessario aggiungi un condensatore di disaccoppiamento da 100nF vicino ai pin di alimentazione.

---

## FAQ

**D: Qual è la frequenza di aggiornamento degli angoli del MPU6050?**
R: `MPU6050_light` legge in modalità veloce I2C a 400kHz, con un campionamento dati grezzi fino a 1kHz. Il framerate di questo codice è limitato a 20fps (20Hz effettivi). Se necessiti di una frequenza superiore, riduci il valore di `frameDelay`; testando, fino a 40fps è stabile (limitato dalla velocità di trasferimento SPI verso lo schermo).

**D: Posso usare altri pin GPIO?**
R: Sì, modifica le macro `#define` in cima al codice. Per i pin SPI del GC9A01 si consiglia di usare lo SPI hardware dell'ESP32-S3 (GPIO 11/12 sono SPI2, prestazioni migliori); per l'I2C del MPU6050 qualsiasi GPIO va bene, basta che codice e collegamenti siano coerenti.

**D: Posso sostituire il GC9A01 con uno schermo quadrato?**
R: Sì. Sostituisci `Arduino_GC9A01` con il driver corrispondente (es. ST7789 usa `Arduino_ST7789`), modifica larghezza e altezza di `Arduino_Canvas` e le coordinate del centro `cx/cy`. La logica di disegno non cambia.

**D: I 3.3V dell'ESP32-S3 bastano per alimentare GC9A01 e MPU6050 contemporaneamente?**
R: Sì. La retroilluminazione del GC9A01 assorbe circa 20mA, il MPU6050 ha un consumo tipico di 3.5mW (circa 1mA), totale molto inferiore al limite tipico di 300~500mA del pin 3.3V della scheda.

**D: Posso collegare due MPU6050 sullo stesso bus I2C?**
R: Sì. Uno con AD0 a GND (indirizzo 0x68), l'altro con AD0 a VCC (indirizzo 0x69), condividendo le stesse linee SDA/SCL. Nel codice dichiara due oggetti `MPU6050` e inizializzali con indirizzi diversi.

**D: Devo ricalibrare ad ogni riavvio?**
R: Sì, questo codice esegue la calibrazione dinamica chiamando `mpu.calcOffsets()` nel `setup()` ad ogni accensione. Se il tuo scenario è un'installazione fissa, puoi salvare gli offset nella EEPROM e leggerli al successivo avvio, eliminando il tempo di attesa per la calibrazione.

---

## Idee per sviluppi futuri

- Aggiungere un pulsante per cambiare modalità di visualizzazione (livella / grafico angoli in tempo reale / termometro)
- Salvare i valori di calibrazione in EEPROM per compensare l'inclinazione della superficie di installazione
- Collegare un buzzer passivo per emettere un segnale acustico quando il dispositivo è in piano
- Cambiare la skin del quadrante circolare, creando una bussola magnetica o un display G-Force

---

## Riferimenti

- [MPU-6000 / MPU-6050 Product Specification — InvenSense (TDK)](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [GC9A01A Datasheet — Galaxycore](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [MPU6050_light GitHub — rfetick](https://github.com/rfetick/MPU6050_light)
- [ESP32-S3 Technical Reference Manual — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3 Product Page — Espressif](https://www.espressif.com/en/products/socs/esp32-s3)
