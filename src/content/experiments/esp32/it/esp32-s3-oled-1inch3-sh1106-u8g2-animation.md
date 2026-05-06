---
title: "ESP32-S3 + 1.3\" SH1106 OLED Polpo Cybernetico | Tutorial I2C + U8g2 con Animazione"
boardId: esp32s3
moduleId: display/oled13-sh1106
category: esp32
date: 2026-05-06
intro: "ESP32-S3 pilotando un OLED SH1106 da 1.3 pollici, con la libreria U8g2 per realizzare un'animazione di un polpo che nuota + effetto particelle di bolle. Collegamento I2C a 4 fili, algoritmo di moto con curve di Lissajous, guida alla risoluzione dei problemi comuni inclusa."
image: "https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg"
---

# Tutorial completo ESP32-S3 con OLED SH1106 1.3" — Animazione Polpo Cybernetico (I2C + U8g2)

Difficolta: (adatto ai principianti)
Tempo stimato: 30 minuti
Ambiente di test: Arduino IDE 2.3.8 · U8g2 v2.35.30 · ESP32 Board Package 3.3.8

---

> **TL;DR (Guida rapida):**
>
> 1. Collegamento: SDA -> GPIO 8, SCL -> GPIO 9, VCC -> 3.3V, GND -> GND
> 2. Installa la libreria: U8g2 (autore oliver)
> 3. Nel costruttore, cambia l'indirizzo I2C in `0x3C * 2`, e l'inizializzazione Wire in `Wire.begin(8, 9)`
> 4. Carica il codice, il polpo iniziera a nuotare
> 5. Il codice utilizza un algoritmo di moto con curve di Lissajous; se sei interessato all'algoritmo, puoi approfondire i dettagli

---

## Introduzione

Ti e mai capitato di vedere su qualche negozio online quei piccoli display OLED — grandi quanto un'unghia, ma nei video del venditore mostrano animazioni fluide di ogni tipo, sembrando fantastiche e divertenti.

Dopo aver visto quel video, il pomeriggio seguente ho ordinato un OLED SH1106 da 1.3 pollici. E poi ho incontrato il problema classico: lo schermo arriva, il codice viene caricato con successo, si accende — ma non mostra nulla.

Dopo un pomeriggio di tentativi, ho scoperto che i problemi principali erano due: **i pin I2C non sono quelli predefiniti 21/22**, e **il chip driver SH1106 non e un SSD1306** — si somigliano ma non sono intercambiabili.

Chiariti questi due punti, tutto il resto e andato liscio. L'obiettivo di questo articolo: portarti a far nuotare un polpo sul tuo display OLED in meno di 30 minuti, con tanto di bolle.



---

## Risultato dell'esperimento



![ESP32-canva-017-1inch3-oled (1) (1)](https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg)



Un polpo di 32x32 pixel nuota sullo schermo, con una traiettoria di moto che segue una curva di Lissajous (quelle eleganti onde a forma di 8), mentre dalla bocca escono bolle di dimensioni variabili che si dissolvono lentamente.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/zw06nh7wXp4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Descrizione dei componenti

### OLED SH1106 1.3"

Lo SH1106 e un chip driver per OLED monocromatico, responsabile di trasformare gli 0 e 1 del tuo codice in pixel accesi sullo schermo. Puoi immaginarlo come un traduttore di matrice di punti — gli dici "accendi la riga 30, colonna 50", e lui controlla il corrispondente diodo organico a emissione di luce.

| Parametro | Valore |
|------|------|
| Risoluzione | 128 x 64 pixel |
| Chip driver | SH1106 (non SSD1306) |
| Interfaccia di comunicazione | I2C (indirizzo predefinito 0x3C) |
| Tensione di funzionamento | 3.3V / 5V compatibile |
| Dimensioni schermo | 1.3 pollici |

> Perche sceglierlo: economico, sufficiente per molti usi, con la libreria U8g2 le animazioni a matrice di punti sono facili da realizzare. Attenzione a non comprare il SSD1306 da 0.96 pollici per sbaglio — il chip driver e diverso e il codice non funzionera direttamente, risultando in uno schermo bianco.

---

## Lista componenti (BOM)

| Componente | Quantita |
|------|------|
| Scheda di sviluppo ESP32-S3 | x 1 |
| OLED SH1106 1.3" (I2C) | x 1 |
| Cavetti Dupont (maschio-femmina) | x 4 |

---

## Schema di collegamento

| Pin OLED 1.3" | Collega a ESP32-S3 |
|-----------|---------------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

> Si consiglia di verificare ogni collegamento uno per uno dopo aver terminato, questo risparmia l'80% del tempo di debug. L'inversione di SDA/SCL e la causa piu comune di schermo bianco — sembra tutto alimentato correttamente, ma non mostra nulla.

---

## Installazione della libreria

Nel Library Manager di Arduino IDE cerca **U8g2** e installa la versione pubblicata da oliver.

Versione testata con successo: **U8g2 v2.35.30**

U8g2 e una libreria di visualizzazione open source mantenuta da [olikraus/u8g2](https://github.com/olikraus/u8g2), che supporta quasi tutti i chip driver OLED/LCD monocromatici piu comuni, compreso naturalmente lo SH1106.

---

## Codice completo

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// Passo 1: dichiarare l'oggetto U8g2
// Nota: qui selezioniamo SH1106, 128x64, modalita buffer completo, I2C hardware
// U8G2_R2 = rotazione dello schermo di 180 gradi (regola in base all'orientamento della saldatura del tuo hardware, se non serve rotazione cambia con U8G2_R0)
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R2, /* reset=*/ U8X8_PIN_NONE);

// ==================== Frame animazione polpo (salvati in Flash per risparmiare RAM) ====================
// 4 frame di animazione, ogni frame 32x32 pixel, formato punto matrice XBM
const unsigned char animation_frame_0[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00,
  0x00, 0xFE, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00,
  0xE0, 0xFF, 0xFF, 0x01, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01,
  0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0x00, 0xEF, 0x3D, 0x00,
  0x00, 0xEF, 0x3D, 0x00, 0x00, 0xC7, 0x38, 0x00, 0x00, 0xC7, 0x38, 0x00,
  0x80, 0xC3, 0x70, 0x00, 0x80, 0xC3, 0x70, 0x00, 0x80, 0xC1, 0x60, 0x00,
  0x80, 0xC1, 0x60, 0x00, 0xC0, 0xC0, 0xC0, 0x00, 0xC0, 0xC0, 0xC0, 0x00,
  0x40, 0x80, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_1[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0xFC, 0x0F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01, 0xE0, 0xFF, 0xFF, 0x01,
  0xE0, 0xE7, 0xE7, 0x01, 0xE0, 0xE1, 0xE1, 0x01, 0xE0, 0xE7, 0xE7, 0x01,
  0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0x00, 0xFF, 0x3F, 0x00, 0x00, 0xFE, 0x1F, 0x00, 0x00, 0xDE, 0x1E, 0x00,
  0x00, 0xCF, 0x3C, 0x00, 0x80, 0xC7, 0x78, 0x00, 0xC0, 0xC3, 0xF0, 0x00,
  0xE0, 0xC1, 0xE0, 0x01, 0xE0, 0xC0, 0xC0, 0x01, 0xC0, 0xC0, 0xC0, 0x00,
  0x80, 0xC0, 0x40, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_2[] PROGMEM = {
  0x00, 0xF0, 0x00, 0x00, 0x00, 0xF8, 0x01, 0x00, 0x00, 0xFC, 0x03, 0x00,
  0x00, 0xFE, 0x07, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x80, 0xFF, 0x1F, 0x00, 0x80, 0xF9, 0x19, 0x00,
  0x80, 0xF0, 0x10, 0x00, 0x80, 0xF9, 0x19, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x00, 0xFE, 0x07, 0x00,
  0x00, 0xFC, 0x03, 0x00, 0x00, 0x6C, 0x03, 0x00, 0x00, 0x66, 0x06, 0x00,
  0x00, 0x63, 0x0C, 0x00, 0x80, 0x61, 0x18, 0x00, 0xC0, 0x60, 0x30, 0x00,
  0x60, 0x60, 0x60, 0x00, 0x30, 0x60, 0xC0, 0x00, 0x18, 0x60, 0x80, 0x01,
  0x0C, 0x60, 0x00, 0x03, 0x06, 0x60, 0x00, 0x06, 0x02, 0x60, 0x00, 0x04,
  0x00, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_3[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00, 0x00, 0xFE, 0x3F, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03, 0xF0, 0xF3, 0xF3, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x00, 0xF6, 0x06, 0x00,
  0x00, 0xF6, 0x06, 0x00, 0x00, 0x63, 0x0C, 0x00, 0x00, 0x63, 0x0C, 0x00,
  0x80, 0x61, 0x18, 0x00, 0x80, 0x61, 0x18, 0x00, 0x80, 0x60, 0x10, 0x00,
  0x80, 0x60, 0x10, 0x00, 0x40, 0x60, 0x20, 0x00, 0x40, 0x60, 0x20, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

// Metti i 4 puntatori ai frame in un array, per un accesso ciclico facile
const unsigned char* animation_frames[] = {
  animation_frame_0, animation_frame_1, animation_frame_2, animation_frame_3
};

const int TOTAL_FRAMES = 4;
const unsigned long FRAME_DELAY = 120; // Intervallo tra i frame (millisecondi), riduci per accelerare, aumenta per rallentare
int currentFrame = 0;
unsigned long lastFrameTime = 0;
const int SPRITE_SIZE = 32; // Dimensione matrice di punti del polpo 32x32

// ==================== Sistema di particelle bolle ====================
#define MAX_BUBBLES 10 // Massimo 10 bolle contemporanee sullo schermo

struct Bubble {
  float x;       // Coordinate X correnti
  float y;       // Coordinate Y correnti
  float radius;  // Raggio corrente (float, per ridurre gradualmente frame per frame)
  float speedY;  // Pixel di risalita per frame
  float wobble;  // Fase casuale di oscillazione sinistra-destra
  bool active;   // Questa bolla e "viva"?
};

Bubble bubbles[MAX_BUBBLES]; // Object pool, evita allocazione dinamica di memoria

void setup() {
  Serial.begin(115200);

  // Passo 2: usa un seme casuale per avere bolle diverse ad ogni accensione
  randomSeed(analogRead(0));

  // Passo 3: inizializza I2C, specifica SDA=8, SCL=9
  Wire.begin(8, 9);
  u8g2.setI2CAddress(0x3C * 2); // U8g2 richiede lo shift sinistro dell'indirizzo di 1 bit, 0x3C << 1 = 0x78
  u8g2.begin();

  // Passo 4: segna tutte le bolle come inattive
  for (int i = 0; i < MAX_BUBBLES; i++) {
    bubbles[i].active = false;
  }

  Serial.println("Acquario del polpo avviato con successo!");
}

void loop() {
  unsigned long currentTime = millis();

  // Usa un timer non bloccante invece di delay(), per garantire animazioni fluide
  if (currentTime - lastFrameTime >= FRAME_DELAY) {
    lastFrameTime = currentTime;

    // ======== Passo 1: calcola la posizione del polpo con la curva di Lissajous ========
    // La sovrapposizione di due onde sinusoidali a frequenze diverse produce un'elegante traiettoria a forma di 8
    float t = currentTime * 0.0008;

    float waveX = sin(t * 0.8) * 0.6 + sin(t * 0.3) * 0.4;
    int posX = 48 + (int)(waveX * 48); // Range orizzontale circa 0~96

    float waveY = cos(t * 0.7) * 0.6 + sin(t * 0.4) * 0.4;
    int posY = 16 + (int)(waveY * 16); // Range verticale circa 0~32

    // ======== Passo 2: 25% di probabilita di generare una nuova bolla vicino alla bocca del polpo ========
    if (random(100) < 25) {
      for (int i = 0; i < MAX_BUBBLES; i++) {
        if (!bubbles[i].active) {
          bubbles[i].active = true;
          bubbles[i].x      = posX + 16 + random(-8, 8);   // Scostamento casuale vicino alla bocca
          bubbles[i].y      = posY + 24 + random(0, 5);
          bubbles[i].radius = random(15, 35) / 10.0;       // 1.5~3.5 pixel
          bubbles[i].speedY = random(10, 25) / 10.0;       // Velocita di risalita casuale
          bubbles[i].wobble = random(0, 100) / 10.0;       // Fase di oscillazione casuale
          break; // Genera solo una bolla per frame
        }
      }
    }

    // ======== Passo 3: cancella il buffer, inizia a disegnare ========
    u8g2.clearBuffer();

    // Disegna il corpo del polpo (immagine matrice di punti XBM)
    u8g2.drawXBMP(posX, posY, SPRITE_SIZE, SPRITE_SIZE, animation_frames[currentFrame]);

    // ======== Passo 4: aggiorna e disegna tutte le bolle attive ========
    for (int i = 0; i < MAX_BUBBLES; i++) {
      if (bubbles[i].active) {
        bubbles[i].y -= bubbles[i].speedY; // Risale verso l'alto

        // Oscillazione sinistra-destra sincronizzata con il tempo, come bolle reali nell'acqua
        float currentX = bubbles[i].x + sin(t * 3.0 + bubbles[i].wobble) * 4.0;

        // La bolla si rimpicciolisce frame per frame, simulando il dissolversi graduale
        bubbles[i].radius -= 0.06;

        // Raggio troppo piccolo o uscita dal bordo superiore dello schermo -> ricicla questa bolla
        if (bubbles[i].radius <= 0.5 || bubbles[i].y < -5) {
          bubbles[i].active = false;
        } else {
          // Disegna un cerchio vuoto — piu simile a una bolla reale rispetto a uno pieno
          u8g2.drawCircle((int)currentX, (int)bubbles[i].y, (int)bubbles[i].radius);
        }
      }
    }

    // Passo 5: invia il contenuto del buffer allo schermo in un'unica volta
    u8g2.sendBuffer();

    // Passa al frame successivo
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }
}
```

### Spiegazione del codice

**Moto con curva di Lissajous**: la sovrapposizione di due sinusoidi/cosinoidi a frequenze diverse fa percorrere al polpo un'elegante traiettoria a forma di 8, molto piu bella di un semplice movimento avanti-indietro, e richiede solo poche righe di funzioni trigonometriche.

**Object pool delle bolle**: pre-alloca 10 strutture `Bubble`, gestendone lo stato "vivo/morto" tramite il flag `active`, evitando frammentazione della memoria causata da `new/delete` — un approccio comune e pratico sui microcontrollori.

**Parola chiave `PROGMEM`**: aggiungendo questa keyword agli array di matrice di punti, i dati vengono salvati nella Flash senza occupare la preziosa SRAM. 4 frame x 128 byte = 512 byte, metterli nella RAM sarebbe un po' uno spreco.

**Timer non bloccante**: si usa `millis()` invece di `delay()`, in modo che l'aggiornamento fisico delle bolle e il cambio dei frame dell'animazione del polpo possano coordinarsi naturalmente nello stesso ciclo, senza scattare.

---

## Risoluzione dei problemi comuni

Non preoccuparti, il 90% dei problemi deriva da questi punti:

**Lo schermo non si accende affatto / nessun output**
Controlla prima l'alimentazione — VCC e collegato a 3.3V non a 5V (anche se molti moduli sono compatibili con 5V, meglio confermare). Poi usa un multimetro per verificare che i fili SDA/SCL non siano invertiti — l'errore piu frequente in assoluto.

**Lo schermo si accende ma e tutto bianco o nero, nessuna immagine**
Nove volte su dieci e un problema di indirizzo I2C. Il codice usa `0x3C * 2`, come richiesto da U8g2. Se il jumper dell'indirizzo I2C sul retro del tuo schermo e impostato su `0x3D`, cambia `0x3C` in `0x3D` e riprova. Puoi anche eseguire prima uno I2C Scanner per confermare l'indirizzo.

**L'immagine appare ma capovolta**
Cambia `U8G2_R2` in `U8G2_R0` nel costruttore — l'unica differenza tra i due e la rotazione di 180 gradi.

**Il polpo esce dal bordo dello schermo**
Il valore massimo di `posX` e circa 96, che sommato alla larghezza di 32 pixel arriva esattamente al limite di 128. Se modifichi i parametri di ampiezza del movimento, assicurati che le coordinate non superino `128 - SPRITE_SIZE`.

**Le bolle sembrano scattose**
Prova a ridurre `FRAME_DELAY` da 120 a 80. Se rimane scattoso, controlla la velocita del bus I2C — puoi aggiungere `Wire.setClock(400000)` dopo `Wire.begin(8, 9)` per passare alla modalita fast (400 kHz).

---

## FAQ

**D: Posso usare altri GPIO per I2C?**
R: Si, l'I2C dell'ESP32-S3 supporta la mappatura su qualsiasi GPIO. Cambia i numeri in `Wire.begin(8, 9)` con i pin che vuoi usare — SDA come primo parametro, SCL come secondo.

**D: Il mio schermo e un SSD1306 da 0.96 pollici, posso usare direttamente questo codice?**
R: Non direttamente, il chip driver e diverso. Sostituisci il costruttore con `U8G2_SSD1306_128X64_NONAME_F_HW_I2C`, il resto del codice puo rimanere invariato.

**D: Quale velocita I2C e supportata?**
R: Lo SH1106 supporta la modalita standard a 100 kHz e la modalita fast a 400 kHz. Questo codice non imposta esplicitamente la velocita, quindi usa i 100 kHz predefiniti. Se trovi che l'aggiornamento sia lento, puoi aggiungere `Wire.setClock(400000)`.

**D: A cosa serve PROGMEM, posso rimuoverlo?**
R: `PROGMEM` salva gli array nella Flash invece che nella SRAM. I 4 frame di dati della matrice di punti sono circa 512 byte — rimuoverlo non compromette la funzionalita, ma occuperebbe 512 byte di SRAM. L'ESP32-S3 ha una SRAM abbondante, quindi non sarebbe un problema, ma e una buona abitudine mantenerlo.

**D: Come faccio a far nuotare il polpo piu velocemente o piu lentamente?**
R: Modifica il valore di `FRAME_DELAY` — un numero piu piccolo significa piu veloce, piu grande significa piu lento. La velocita di risalita delle bolle e controllata dall'intervallo `speedY` dato da `random(10, 25) / 10.0`, che puoi ugualmente regolare.

**D: Quanta RAM utilizza lo schermo?**
R: La modalita buffer completo di U8g2 (`_F_`) mantiene un frame buffer intero nella RAM: 128x64 / 8 = 1024 byte, circa 1KB. L'ESP32-S3 ha 512KB di SRAM, piu che sufficiente.

---

## Idee per estensioni

- **Cambia protagonista**: usa [image2cpp](https://javl.github.io/image2cpp/) per convertire qualsiasi immagine in bianco e nero in matrice di punti XBM e sostituisci il polpo
- **Aggiungi interazione con sensori**: collega un sensore sonoro, la velocita di nuoto del polpo varia in base al volume
- **Multi-schermo**: due OLED collegati allo stesso bus I2C (indirizzi 0x3C e 0x3D rispettivamente), un polpo su ciascun lato
- **Versione con schermo TFT a colori**: sostituisci con un TFT ST7789 a colori, usando sfumature di grigio per bolle piu dettagliate

---

## Riferimenti

- [Scheda tecnica ESP32-S3 Espressif (ufficiale)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_cn.pdf)
- [Pagina GitHub della libreria U8g2 (olikraus/u8g2)](https://github.com/olikraus/u8g2)
- [Datasheet del chip driver SH1106 (Sino Wealth)](https://www.velleman.eu/downloads/29/infosheets/sh1106_datasheet.pdf)
- [image2cpp: strumento online per convertire immagini in matrice di punti XBM](https://javl.github.io/image2cpp/)
