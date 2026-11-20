---
title: "ESP32-S3 con e-paper a sei colori EPD037A02 (JD7601): demo a tre schermate riprodotta una sola volta — Hello, orario in inglese e foto preconvertita (SPI + Arduino)"
boardId: esp32s3
moduleId: display/epd-3inch7-epd037a02-jd7601
category: esp32
date: 2026-11-20
intro: "Pilota il display e-paper a sei colori EPD037A02 con ESP32-S3 e Adafruit GFX: cablaggio SPI, configurazione Arduino e codice completo per mostrare una sola volta Hello, un orario in inglese e una foto preconvertita. Per chi ha esperienza con il caricamento Arduino e vuole imparare a pilotare l’e-paper a sei colori e a convertire le foto."
image: "https://img.lingflux.com/2026/11/ff03861dd789ec83465baba962075e98.jpg"
---

Difficoltà: ⭐⭐ (è sufficiente avere esperienza con il caricamento Arduino)<br>
Tempo richiesto: alla prima realizzazione, circa 30 minuti per cablaggio, installazione delle librerie e caricamento (stima non cronometrata). Le tre schermate richiedono circa 1–1,5 minuti (15–25 secondi di aggiornamento completo ciascuna, più due pause di 3 secondi).<br>
Ambiente di test: Arduino IDE 2.3.8; esp32 Arduino Core 3.3.10; Adafruit GFX Library 1.13.0

> **In sintesi**: con ESP32-S3, SPI e Adafruit GFX, il display e-paper a sei colori EPD037A02 mostra in sequenza Hello, un orario in inglese e una foto.

## Avvio rapido

- Scarica l’intera cartella `EPD_3in7_Showcase_JD7601` da [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601) (si trova in `Handbook/Arduino/ESP32-S3/` nel repository LingShunLAB; puoi clonare il repository o scaricarne lo ZIP completo). Il file principale `.ino`, i file del driver `.h/.cpp` e `photo_data.h` devono trovarsi in questa cartella, il cui nome deve corrispondere a quello del file principale `.ino`.
- Cablaggio: collega BUSY, RST, DC, CS, MOSI e SCK rispettivamente a GPIO7, 8, 9, 10, 11 e 12; VDD a 3,3 V e GND alla massa comune della scheda.
- Installa esp32 Arduino Core 3.3.10, Adafruit GFX Library 1.13.0 e la dipendenza Adafruit BusIO 1.17.4.
- Seleziona la scheda `ESP32S3 Dev Module`, compila e carica, quindi apri il monitor seriale a 115200 baud.
- Il valore predefinito di `HOLD_MS` è 3000 ms: è l’attesa aggiuntiva dopo l’aggiornamento di ogni schermata, non l’intervallo tra una schermata e la successiva.

## Introduzione

Volevo realizzare una scheda dimostrativa e-paper con ESP32-S3: prima Hello, poi un orario in inglese e infine una foto che resta sul display.

Il mio OSPTEK EPD037A02 è un display SPI a sei colori da 480×720. GxEPD2 non include un driver per questo modello, quindi ne ho scritto uno che gestisce soltanto la temporizzazione SPI e il formato del frame del JD7601. Testo e grafica sono affidati ad Adafruit GFX. L’articolo presenta cablaggio, configurazione delle librerie e codice completo delle tre schermate.

## Risultato finale

Il programma riproduce una sola volta la sequenza Hello → orario in inglese → foto. Dopo l’aggiornamento, ciascuna delle prime due schermate resta visibile per 3000 ms; infine la foto rimane sul display e `loop()` non esegue altri aggiornamenti.

![](https://img.lingflux.com/2026/11/dc08d160b6bc55bc5a237bcadf4abc9f.jpg)



## Descrizione dei componenti
### E-paper a sei colori EPD037A02

EPD037A02 è un modulo e-paper OSPTEK a sei colori da 3,7 pollici. L’e-paper sfrutta la luce ambientale per mostrare i colori e conserva l’immagine anche senza alimentazione. In questo esempio visualizza testo, riquadri dei sei colori, un orario e una foto già convertita.

Sono disponibili solo nero, bianco, giallo, rosso, blu e verde, senza livelli di grigio. I toni intermedi di una foto vengono simulati mescolando pixel di colori diversi: non è quindi possibile inviare direttamente un JPG al display, ma occorre prima convertirlo nel formato del frame del pannello.

| Parametro | Specifica |
| --- | --- |
| Modello | EPD037A02 |
| Dimensioni e risoluzione | 3,7 pollici, 480×720 |
| Colori | Nero, bianco, giallo, rosso, blu, verde |
| Formato dei pixel | 4 bit/pixel, due pixel per byte |
| Interfaccia | SPI a 4 fili, 1 connettore 8P da 2,54 mm |
| Tempo di aggiornamento completo | Circa 15–25 secondi |
| Alimentazione | 3,3 V |

Questo display consente di provare testo, grafica e foto a sei colori con un solo modulo. Lo svantaggio è l’aggiornamento lento, che non consente animazioni.

## Elenco dei materiali

| Materiale | Quantità | Note |
| --- | --- | --- |
| Scheda di sviluppo ESP32-S3 | 1 | L’esempio usa `ESP32S3 Dev Module` |
| Modulo EPD037A02 con adattatore SPI | 1 | E-paper a sei colori 480×720 |
| Cavi Dupont da 2,54 mm | 8 | 6 segnali, 1 alimentazione e 1 massa |
| Cavo USB dati | 1 | Alimentazione, caricamento e monitor seriale |

### Descrizione dei pin

| Pin del display | Direzione | Funzione |
| --- | --- | --- |
| BUSY | Display → ESP32-S3 | Livello alto = inattivo, livello basso = occupato |
| CS | ESP32-S3 → display | Selezione chip, attiva bassa, controllata manualmente dal programma |
| DC | ESP32-S3 → display | Livello basso per i comandi, alto per i dati |
| RST | ESP32-S3 → display | Reset, attivo basso |
| SDA / MOSI | ESP32-S3 → display | Dati SPI |
| CLK / SCK | ESP32-S3 → display | Clock SPI |
| VDD | Alimentazione | Solo 3,3 V |
| GND | Alimentazione | Massa comune con la scheda |

Il display riceve dati ma non ne restituisce, quindi MISO non è necessario. Sull’adattatore, BS0 è collegato a massa tramite una resistenza da 10 kΩ e fissa la modalità SPI a 4 fili. Questa modalità richiede DC per distinguere comandi e dati, quindi il collegamento è indispensabile.

## Cablaggio

Scollega l’alimentazione della scheda prima di effettuare i collegamenti indicati.

| Pin del display | ESP32-S3 | Uso |
| --- | --- | --- |
| BUSY | GPIO7 | Lettura dello stato occupato/inattivo del pannello |
| CS | GPIO10 | Selezione chip manuale |
| DC | GPIO9 | Distinzione tra comandi e dati |
| RST | GPIO8 | Reset del pannello |
| SDA / MOSI | GPIO11 | Dati SPI |
| CLK / SCK | GPIO12 | Clock SPI |
| VDD | 3,3 V | Alimentazione del modulo |
| GND | GND | Massa comune |

**VDD deve essere collegato solo a 3,3 V, mai a 5 V.** Controlla tutti i cavi uno per uno, verificando in particolare che SDA e CLK non siano invertiti.

Dopo il cablaggio:

1. Collega la scheda via USB e seleziona `ESP32S3 Dev Module` e la porta corrispondente in Arduino IDE.
2. Apri l’esempio completo, compila e carica.
3. Apri il monitor seriale a 115200 baud. Se non vedi i log iniziali, premi RESET per riavviare il programma. La sequenza viene riprodotta una sola volta: aprendo il monitor troppo tardi perderai i primi messaggi.
4. La seriale deve mostrare nell’ordine le informazioni sul framebuffer, il completamento dell’inizializzazione del pannello, due messaggi di aggiornamento completato (la schermata della foto non stampa il tempo di aggiornamento) e infine `Done. Last picture stays on screen.`. Contemporaneamente il display mostra le tre schermate nella stessa sequenza. La demo funziona solo se entrambi i risultati sono corretti.

## Librerie da installare

Nel gestore schede di Arduino IDE cerca `esp32` e installa esp32 Arduino Core di Espressif Systems; in questo articolo viene usata la versione 3.3.10.

Nel gestore librerie cerca e installa le librerie seguenti. Se durante l’installazione di Adafruit GFX viene proposta l’installazione delle dipendenze, scegli di installarle tutte per includere anche Adafruit BusIO.

| Libreria | Versione testata | Fonte |
| --- | --- | --- |
| Adafruit GFX Library | 1.13.0 | [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library) |
| Adafruit BusIO | 1.17.4 | [Adafruit_BusIO](https://github.com/adafruit/Adafruit_BusIO) |
| SPI | Inclusa con esp32 Core 3.3.10 | Fornita con [arduino-esp32](https://github.com/espressif/arduino-esp32), non richiede installazione separata |
| EPD037A02_GFX | Versione non indicata | Inclusa nel progetto, nella stessa cartella del `.ino` principale; non copiarla nella cartella delle librerie |

Adafruit GFX disegna testo e grafica. `EPD037A02_GFX` gestisce inizializzazione del pannello, trasferimenti SPI, codifica dei sei colori e aggiornamento. I comandi cambiano tra i modelli di pannello: questo livello non può essere sostituito direttamente con la libreria di un altro display e-paper.

## Codice completo

Il codice sorgente dell’esempio è disponibile su [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601). La cartella e il programma principale si chiamano entrambi `EPD_3in7_Showcase_JD7601`: i due nomi devono coincidere affinché Arduino IDE possa aprire il progetto. I file principali sono:

```text
EPD_3in7_Showcase_JD7601/
├── EPD_3in7_Showcase_JD7601.ino
├── EPD037A02_GFX.h
├── EPD037A02_GFX.cpp
├── photo_data.h
└── tool/
    ├── epd_photo.py                  # Script di conversione delle foto
    └── 02-driver-dog-car-480x720.png # Immagine originale della foto di esempio
```

Di seguito è riportato il codice dei primi tre file. `photo_data.h` contiene oltre diecimila righe e non viene incluso: scaricalo dal repository, altrimenti il programma non compila.

Contiene un array `photo_driver` di 172800 byte, generato da `tool/02-driver-dog-car-480x720.png`. Memorizza il frame convertito per il pannello, non il contenuto del file PNG.

Il codice seguente ha la stessa logica dei sorgenti del repository; sono stati modificati solo alcuni commenti. Il repository resta il riferimento.

### Programma principale EPD_3in7_Showcase_JD7601.ino

```cpp
/*
 * EPD_3in7_Showcase — Hello + orario in inglese + una foto
 * Display: OSPTEK 3.7" E6, 480×720, JD7601
 * Controller: ESP32-S3
 *
 * Chi inizia deve modificare solo questo file. Usa i font inclusi in Adafruit GFX, senza creare un set di caratteri.
 * Installazione: cerca Adafruit GFX Library nel gestore librerie di Arduino IDE.
 * Apertura: scarica l’intera cartella Showcase prima di aprire questo .ino; non copiare soltanto il file principale.
 */

#include "EPD037A02_GFX.h"
#include "photo_data.h"

// Ordine dei pin: CS, DC, RST, BUSY, SCK, MOSI; alimentazione solo a 3.3V.
EPD037A02_GFX epd(10, 9, 8, 7, 12, 11);
#define HOLD_MS 3000

// La coordinata y del font 5×7 integrato corrisponde al bordo superiore del testo; ogni carattere occupa 6×8 pixel.
void text(const char *s, int x, int y, uint8_t size, uint8_t color) {
  epd.setFont();                 // Usa il font integrato di GFX, senza un ulteriore setFont(set di caratteri)
  epd.setTextSize(size);
  epd.setTextColor(color);
  epd.setCursor(x, y);
  epd.print(s);
}

void textCenter(const char *s, int y, uint8_t size, uint8_t color) {
  int w = strlen(s) * 6 * size;
  text(s, (480 - w) / 2, y, size, color);
}

void drawHello() {
  epd.fillScreen(EPD_WHITE);
  epd.drawRect(0, 0, 480, 720, EPD_BLACK);
  textCenter("HELLO", 65, 9, EPD_BLACK);
  textCenter("WORLD", 150, 9, EPD_RED);
  epd.fillRect(40, 245, 400, 4, EPD_BLACK);

  // I sei riquadri servono anche a verificare la mappatura dei colori e l’orientamento dell’immagine.
  const uint8_t colors[6] = {
    EPD_BLACK, EPD_WHITE, EPD_YELLOW, EPD_RED, EPD_BLUE, EPD_GREEN
  };
  const char *labels[6] = { "K", "W", "Y", "R", "B", "G" };
  for (int i = 0; i < 6; i++) {
    int x = 16 + i * 76;
    epd.fillRect(x, 295, 68, 110, colors[i]);
    epd.drawRect(x, 295, 68, 110, EPD_BLACK);
    text(labels[i], x + 22, 430, 4, EPD_BLACK);
  }
  textCenter("3.7INCH 480X720", 525, 4, EPD_BLACK);
  textCenter("E6 6-COLOR EPD", 570, 4, EPD_BLACK);
  textCenter("ESP32-S3 OK", 640, 4, EPD_BLUE);
}

// Per modificare l’orario, cambia soltanto queste righe.
const char *subjects[6] = {
  "MATH", "CHINESE", "ENGLISH", "PHYSICS", "CHEMISTRY", "STUDY HALL"
};
const char *rooms[6] = {
  "ROOM 302", "ROOM 302", "AUDIO LAB", "PHYS LAB", "CHEM LAB", "ROOM 302"
};
const char *times[6] = { "08:00", "08:55", "NOW", "11:05", "14:00", "14:55" };
const uint8_t bars[6] = {
  EPD_BLUE, EPD_RED, EPD_RED, EPD_BLACK, EPD_YELLOW, EPD_WHITE
};

void drawAgenda() {
  epd.fillScreen(EPD_WHITE);
  epd.fillRect(0, 0, 480, 100, EPD_BLACK);
  text("MON - NOV 9", 24, 20, 4, EPD_WHITE);
  text("WEEK 12 - 6 CLASSES", 24, 65, 2, EPD_YELLOW);

  for (int i = 0; i < 6; i++) {
    int y = 115 + i * 92;
    bool now = (i == 2);
    epd.fillRoundRect(18, y, 444, 80, 5, now ? EPD_RED : EPD_WHITE);
    if (!now) epd.drawRoundRect(18, y, 444, 80, 5, EPD_BLACK);
    if (bars[i] != EPD_WHITE) epd.fillRect(20, y + 2, 9, 76, bars[i]);

    uint8_t fg = now ? EPD_WHITE : EPD_BLACK;
    text(subjects[i], 45, y + 12, 3, fg);
    text(rooms[i], 45, y + 47, 2, fg);
    text(times[i], 365, y + 25, 2, fg);
  }
  text("NEXT 11:05 PHYSICS", 20, 688, 2, EPD_BLACK);
}

bool showScreen(uint8_t index) {
  switch (index) {
    case 0: drawHello();  return epd.display();
    case 1: drawAgenda(); return epd.display();
    case 2: return epd.displayRawFrame(photo_driver, PHOTO_DRIVER_BYTES);
    default: return false;
  }
}

void setup() {
  // Passo 1: aprire la seriale, utile per individuare il punto in cui il programma si blocca.
  Serial.begin(115200);
  delay(500);
  Serial.println("Showcase: Hello -> English agenda -> portrait");

  // Passo 2: allocare il framebuffer, inizializzare SPI, quindi eseguire reset e inizializzazione del pannello.
  if (!epd.begin()) {
    Serial.println("Init failed: check 3V3, GND, wiring and BUSY.");
    return;
  }

  // Passo 3: riprodurre ciascuna delle tre schermate una volta. In caso di errore, fermarsi senza aggiornare le successive.
  for (uint8_t i = 0; i < 3; i++) {
    if (!showScreen(i)) {
      Serial.println("Refresh failed; stopped. Check wiring and BUSY.");
      return;
    }
    if (i < 2) delay(HOLD_MS);   // Pausa dopo l’aggiornamento, non periodo tra le schermate
  }
  Serial.println("Done. Last picture stays on screen.");
}

void loop() {
  // Riproduzione singola. Modifica subjects / rooms / times sopra per cambiare l’orario.
}

// Passo 4: bloccare durante la compilazione i frame fotografici con dimensioni o lunghezza errate.
static_assert(PHOTO_DRIVER_W == 480 && PHOTO_DRIVER_H == 720,
              "Photo must be 480x720");
static_assert(PHOTO_DRIVER_BYTES == EPD037A02_BUF_BYTES,
              "Photo must be 172800 bytes");
```

### Interfaccia del driver EPD037A02_GFX.h

```cpp
/*
 * EPD037A02_GFX — classe driver del pannello per Adafruit_GFX
 * E-paper OSPTEK 3.7" E6, 480×720, sei colori (JD7601 / IST7601 / IST7163)
 *
 * Il livello del pannello è implementato qui, mentre quello grafico eredita direttamente da Adafruit_GFX.
 * drawLine, fillCircle, setFont e print sono quindi immediatamente disponibili.
 *
 * MIT / CC BY 4.0, come le altre risorse del repository.
 */

#ifndef EPD037A02_GFX_H
#define EPD037A02_GFX_H

#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>

/* ---------------------------- Costanti del pannello --------------------------- */

#define EPD037A02_WIDTH    480
#define EPD037A02_HEIGHT   720
#define EPD037A02_BUF_BYTES ((size_t)EPD037A02_WIDTH * EPD037A02_HEIGHT / 2) /* 172800 */

// Un byte contiene due pixel adiacenti nella stessa colonna. Se lo sfasamento misurato è di 1–2 px, imposta questo valore a 1.
#ifndef EPD037A02_SWAP_NIBBLE
#define EPD037A02_SWAP_NIBBLE 0
#endif

// Valori colore a 4 bit del JD7601: 0x4 non è valido; non numerarli in sequenza da 0 a 5.
enum EPDColor : uint8_t {
  EPD_BLACK  = 0x0,
  EPD_WHITE  = 0x1,
  EPD_YELLOW = 0x2,
  EPD_RED    = 0x3,
  EPD_BLUE   = 0x5,
  EPD_GREEN  = 0x6,
};

/* -------------------------------- Classe del driver --------------------------- */
/*
 * Uso:
 *   EPD037A02_GFX display(10, 9, 8, 7);    // cs, dc, rst, busy
 *   display.begin();                       // Allocazione framebuffer + reset + INIT
 *   display.setRotation(0);                // 0/2 = 480×720, 1/3 = 720×480
 *   display.fillScreen(EPD_WHITE);
 *   display.setFont(&FreeSansBold24pt7b);
 *   display.setCursor(20, 120);  display.print("Hello");
 *   display.display();                     // Trasferimento + aggiornamento completo (15–25 s)
 *
 * I colori sono indici a 4 bit, solo sei, non RGB565.
 * Anche un colore a 16 bit compila, ma vengono usati solo i 4 bit meno significativi e il risultato non è significativo.
 */
class EPD037A02_GFX : public Adafruit_GFX {
 public:
  EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                int8_t sck = -1, int8_t mosi = -1, SPIClass *spi = &SPI);
  ~EPD037A02_GFX();

  // Alloca il framebuffer, inizializza GPIO/SPI, quindi esegue reset e inizializzazione del pannello.
  // Restituisce false se la memoria è insufficiente o BUSY non risponde; il display resta invariato.
  bool begin(uint32_t spi_hz = 2000000);

  // Trasferisce il framebuffer sul display ed esegue un aggiornamento completo. Blocca per 15–25 s; restituisce false al timeout di BUSY.
  bool display();

  // Invia direttamente un frame nativo 480×720 già impacchettato, senza allocare un secondo framebuffer per la foto.
  bool displayRawFrame(const uint8_t *frame, size_t bytes);

  // Mette il pannello in deep sleep. Per riattivarlo occorre togliere e ripristinare l’alimentazione oppure agire su RST e richiamare begin().
  bool sleep();

  // Cancella solo il framebuffer senza aggiornare subito. In presenza di immagini residue, chiama clear() e poi display() per aggiornare una schermata bianca.
  void clear(uint16_t color = EPD_WHITE);

  // drawPixel è la funzione virtuale pura richiesta da Adafruit_GFX; fillScreen è riscritta con memset per maggiore velocità.
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void fillScreen(uint16_t color) override;

  // Quantizza RGB nel più vicino dei sei colori; utile per immagini semplici.
  static uint8_t fromRGB(uint8_t r, uint8_t g, uint8_t b);

  uint8_t *buffer() const { return _buf; }
  bool ready() const { return _buf != nullptr; }
  uint32_t lastRefreshMs() const { return _lastRefreshMs; }
  void setVerbose(bool v) { _verbose = v; }

 private:
  int8_t _cs, _dc, _rst, _busy, _sck, _mosi;
  SPIClass *_spi;
  uint32_t _spiHz;
  uint8_t *_buf;
  uint32_t _lastRefreshMs;
  bool _verbose;

  void _alloc();
  void _spiSend(const uint8_t *buf, size_t len);
  void _cmd(uint8_t c);
  void _data(uint8_t d);
  void _dataBuf(const uint8_t *buf, size_t len);
  bool _waitBusy(const char *what, uint32_t timeout_ms = 60000);
  bool _reset();
  bool _initPanel();
};

#endif /* EPD037A02_GFX_H */
```

### Implementazione del driver EPD037A02_GFX.cpp

```cpp
/*
 * EPD037A02_GFX.cpp — livello pannello: SPI, temporizzazione e formato del frame
 * Questo livello svolge solo tre compiti: inviare byte, attendere BUSY e convertire (x,y) in un indice del framebuffer.
 * Grafica, font e rotazione sono affidati ad Adafruit_GFX.
 */

#include "EPD037A02_GFX.h"

#include <string.h>
#include <pgmspace.h>

#if defined(ESP32)
#include <esp32-hal-psram.h>
#endif

namespace {
// Due pixel per byte: una colonna verticale di 720 pixel occupa quindi 360 byte.
const size_t kColBytes  = EPD037A02_HEIGHT / 2;
const size_t kChunk     = 2048;    // Limite di un trasferimento SPI, come nell’esempio del produttore
const uint32_t kBusyTmo = 60000;   // Un aggiornamento completo dura al massimo 25 s; qui c’è margine
}  // namespace

EPD037A02_GFX::EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                             int8_t sck, int8_t mosi, SPIClass *spi)
    : Adafruit_GFX(EPD037A02_WIDTH, EPD037A02_HEIGHT),
      _cs(cs), _dc(dc), _rst(rst), _busy(busy), _sck(sck), _mosi(mosi),
      _spi(spi), _spiHz(2000000), _buf(nullptr), _lastRefreshMs(0),
      _verbose(true) {}

EPD037A02_GFX::~EPD037A02_GFX() {
  if (_buf) {
    free(_buf);   // Anche la memoria allocata con ps_malloc viene liberata con free()
    _buf = nullptr;
  }
}

/* ============================ Memoria / inizializzazione ============================ */

void EPD037A02_GFX::_alloc() {
  if (_buf) return;
#if defined(ESP32)
  if (psramFound()) _buf = (uint8_t *)ps_malloc(EPD037A02_BUF_BYTES);
#endif
  if (!_buf) _buf = (uint8_t *)malloc(EPD037A02_BUF_BYTES);
}

bool EPD037A02_GFX::begin(uint32_t spi_hz) {
  // Passo 1: ottenere il framebuffer da 172800 byte e riempirlo inizialmente di bianco.
  _spiHz = spi_hz;
  _alloc();
  if (!_buf) {
    if (_verbose) {
      Serial.printf("[EPD] Allocazione del framebuffer non riuscita, servono %u byte\n",
                    (unsigned)EPD037A02_BUF_BYTES);
    }
    return false;
  }

  // malloc non azzera la memoria; il riempimento bianco evita di visualizzare memoria non inizializzata.
  clear(EPD_WHITE);

  // Passo 2: configurare i pin. CS è controllato manualmente e MISO non va collegato.
  pinMode(_cs, OUTPUT);   digitalWrite(_cs, HIGH);
  pinMode(_dc, OUTPUT);   digitalWrite(_dc, HIGH);
  pinMode(_rst, OUTPUT);  digitalWrite(_rst, HIGH);
  pinMode(_busy, INPUT);

  // L’ordine dei parametri è SCK, MISO, MOSI, SS. Passa -1 a SS: non affidare CS alla periferica.
  _spi->begin(_sck, -1, _mosi, -1);

  if (_verbose) {
    Serial.printf("[EPD] Framebuffer %u B, SPI %lu Hz\n",
                  (unsigned)EPD037A02_BUF_BYTES, (unsigned long)_spiHz);
  }

  // Passo 3: resettare il pannello e inviare i comandi di inizializzazione.
  return _initPanel();
}

bool EPD037A02_GFX::_initPanel() {
  if (!_reset()) return false;

  _cmd(0xE9); _data(0x01);   // INIT del produttore: comando di inizializzazione del JD7601

  if (_verbose) Serial.println("[EPD] Inizializzazione del pannello completata");
  return true;
}

/* ================================= SPI di basso livello ================================= */

void EPD037A02_GFX::_spiSend(const uint8_t *buf, size_t len) {
  digitalWrite(_cs, LOW);
  _spi->beginTransaction(SPISettings(_spiHz, MSBFIRST, SPI_MODE0));
  _spi->writeBytes(buf, len);
  _spi->endTransaction();
  digitalWrite(_cs, HIGH);
}

void EPD037A02_GFX::_cmd(uint8_t c) {
  digitalWrite(_dc, LOW);    // DC=L: comando
  _spiSend(&c, 1);
}

void EPD037A02_GFX::_data(uint8_t d) {
  digitalWrite(_dc, HIGH);   // DC=H: dati
  _spiSend(&d, 1);
}

void EPD037A02_GFX::_dataBuf(const uint8_t *buf, size_t len) {
  digitalWrite(_dc, HIGH);
  while (len) {
    size_t n = (len > kChunk) ? kChunk : len;
    _spiSend(buf, n);
    buf += n;
    len -= n;
  }
}

// BUSY alto = inattivo, basso = occupato. Il testo della Nota 6-4 del datasheet li inverte; seguire la tabella dei pin e le misure.
bool EPD037A02_GFX::_waitBusy(const char *what, uint32_t timeout_ms) {
  uint32_t t0 = millis();
  while (digitalRead(_busy) == LOW) {
    if (millis() - t0 > timeout_ms) {
      if (_verbose) Serial.printf("[EPD] Timeout BUSY: %s\n", what);
      return false;
    }
    delay(2);
  }
  return true;
}

// Sequenza RESET del produttore: basso 20 → alto 10 → basso 20 → alto 10 ms, poi attendere BUSY.
bool EPD037A02_GFX::_reset() {
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);

  if (digitalRead(_busy) == LOW) {
    if (_verbose) Serial.println("[EPD] Attesa del livello alto di BUSY (massimo 10 s); in caso di timeout controllare 3V3 / GND / flat cable");
    if (!_waitBusy("reset", 10000)) return false;
  }
  delay(10);
  return true;
}

/* ============================ Sequenza di aggiornamento ============================ */

bool EPD037A02_GFX::display() {
  if (!_buf) return false;
  uint32_t t0 = millis();

  _cmd(0x10);                             // DTM: preparazione alla scrittura della RAM
  if (!_waitBusy("DTM")) return false;
  _dataBuf(_buf, EPD037A02_BUF_BYTES);

  _cmd(0x04);                             // PON: attivazione dell’alta tensione
  if (!_waitBusy("PON")) return false;
  delay(10);

  _cmd(0x12); _data(0x00);                // DRF: avvio dell’aggiornamento
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;

  _cmd(0x02); _data(0x00);                // POF: disattivazione dell’alta tensione
  if (!_waitBusy("POF")) return false;
  delay(20);

  _lastRefreshMs = millis() - t0;
  if (_verbose) Serial.printf("[EPD] Aggiornamento completato %lu ms\n", (unsigned long)_lastRefreshMs);
  return true;
}

bool EPD037A02_GFX::displayRawFrame(const uint8_t *frame, size_t bytes) {
  if (!frame || bytes != EPD037A02_BUF_BYTES) return false;

  _cmd(0x10);
  if (!_waitBusy("DTM")) return false;

  // Copiare 2048 byte alla volta da Flash a RAM prima del trasferimento SPI; non lasciare che DMA legga direttamente Flash.
  uint8_t chunk[kChunk];
  digitalWrite(_dc, HIGH);
  for (size_t off = 0; off < bytes; off += sizeof(chunk)) {
    size_t n = bytes - off;
    if (n > sizeof(chunk)) n = sizeof(chunk);
    memcpy_P(chunk, frame + off, n);
    _spiSend(chunk, n);
  }

  _cmd(0x04);
  if (!_waitBusy("PON")) return false;
  delay(10);
  _cmd(0x12); _data(0x00);
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;
  _cmd(0x02); _data(0x00);
  if (!_waitBusy("POF")) return false;
  delay(20);
  return true;
}

bool EPD037A02_GFX::sleep() {
  _cmd(0x07); _data(0xA5);
  if (_verbose) Serial.println("[EPD] Deep sleep attivato");
  return true;
}

/* ==================================== Disegno ==================================== */

void EPD037A02_GFX::clear(uint16_t color) {
  if (!_buf) return;
  uint8_t c = (uint8_t)(color & 0x0F);
  memset(_buf, (int)((c << 4) | c), EPD037A02_BUF_BYTES);
}

void EPD037A02_GFX::fillScreen(uint16_t color) { clear(color); }

void EPD037A02_GFX::drawPixel(int16_t x, int16_t y, uint16_t color) {
  if (!_buf) return;
  if (x < 0 || y < 0 || x >= _width || y >= _height) return;

  // Convertire prima le coordinate logiche influenzate da rotation nelle coordinate native del pannello.
  int16_t dx, dy;
  switch (rotation & 3) {
    case 0:  dx = x;                 dy = y;                 break;
    case 1:  dx = WIDTH - 1 - y;     dy = x;                 break;
    case 2:  dx = WIDTH - 1 - x;     dy = HEIGHT - 1 - y;    break;
    default: dx = y;                 dy = HEIGHT - 1 - x;    break;
  }

  // Il pannello riceve i dati per colonne verticali, scandite dal basso verso l’alto: serve quindi un mirroring Y.
  // Una scrittura convenzionale per righe orizzontali produce un’immagine ruotata di 90° e ripetuta con sfasamenti.
  const int16_t fy = HEIGHT - 1 - dy;
  size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);

#if EPD037A02_SWAP_NIBBLE
  const bool lowNibble = ((fy & 1) == 0);
#else
  const bool lowNibble = ((fy & 1) != 0);
#endif

  // Dividere il byte in due nibble e modificare soltanto quello del pixel interessato.
  const uint8_t c = (uint8_t)(color & 0x0F);
  if (lowNibble) _buf[i] = (uint8_t)((_buf[i] & 0xF0) | c);
  else           _buf[i] = (uint8_t)((_buf[i] & 0x0F) | (c << 4));
}

/* ========================== Quantizzazione RGB a sei colori ========================== */

struct EPDRgbRef { uint8_t r, g, b, code; };

// I colori di riferimento derivano dalla resa tipica di Spectra 6 / E6; toni leggermente più scuri si avvicinano alla percezione visiva.
static const EPDRgbRef kRefs[6] = {
    {  0,   0,   0, EPD_BLACK  },
    {255, 255, 255, EPD_WHITE  },
    {255, 232,   0, EPD_YELLOW },
    {190,  30,  45, EPD_RED    },
    { 35,  70, 150, EPD_BLUE   },
    { 40, 110,  60, EPD_GREEN  },
};

uint8_t EPD037A02_GFX::fromRGB(uint8_t r, uint8_t g, uint8_t b) {
  // Distanza euclidea ponderata, con un peso maggiore per il verde.
  int32_t best = INT32_MAX;
  uint8_t code = EPD_BLACK;
  for (int k = 0; k < 6; k++) {
    int32_t dr = (int32_t)r - kRefs[k].r;
    int32_t dg = (int32_t)g - kRefs[k].g;
    int32_t db = (int32_t)b - kRefs[k].b;
    int32_t d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < best) { best = d; code = kRefs[k].code; }
  }
  return code;
}
```

### Spiegazione del codice

**Memorizzazione dei pixel.** `drawPixel()` è la funzione più facile da implementare in modo errato. Il display è 480×720, ogni pixel occupa 4 bit e un frame corrisponde a 480×720÷2 = 172800 byte.

A differenza dei display tradizionali scritti per righe, questo riceve i dati per colonne verticali: 480 colonne da 360 byte ciascuna, scandite dal basso verso l’alto. Il codice applica quindi prima il mirroring Y `fy = HEIGHT-1-dy`, poi calcola la posizione del byte con `i = dx*360 + (fy>>1)`.

**Codifica dei colori.** I sei codici non sono consecutivi: nero, bianco, giallo e rosso vanno da `0x0` a `0x3`, mentre blu e verde valgono `0x5` e `0x6`; `0x4` non è valido. Usa direttamente enumerazioni come `EPD_BLACK`, senza inserire numeri propri.

**Aggiornamento delle tre schermate.** Il ciclo `for` in `setup()` viene eseguito tre volte. Le prime due schermate vengono disegnate nel framebuffer, poi trasmesse e aggiornate con `display()`. La terza chiama `displayRawFrame()`, che copia i dati di `photo_data.h` da Flash a RAM in blocchi di 2048 byte prima di inviarli tramite SPI.

**Memoria.** La schermata della foto non usa il framebuffer, a differenza delle prime due: il programma richiede quindi sempre un framebuffer da 172800 byte. Se è presente PSRAM viene usata preferibilmente, altrimenti, o in caso di allocazione non riuscita, viene usata la RAM interna.

**Durata della visualizzazione.** Ogni aggiornamento richiede 15–25 secondi; `HOLD_MS` aggiunge soltanto una pausa al termine. L’intervallo effettivo tra le prime due schermate è quindi il tempo di aggiornamento più 3 secondi. Non esiste una riproduzione ciclica: premi RESET per riavviarla.

**Modificare l’orario.** Cambia i tre array `subjects`, `rooms` e `times`, le cui sei righe si corrispondono. `bars` definisce il colore della barra a sinistra di ogni riga. La «lezione attuale» evidenziata è sempre la terza riga (`i == 2`). La data del titolo, `WEEK 12` e il testo inferiore `NEXT 11:05 PHYSICS` sono fissi. L’esempio non legge un orologio e non si aggiorna automaticamente.

### Conversione di una foto in dati per il pannello

La foto non viene elaborata sulla scheda. Il computer la converte prima in una matrice a sei colori; ESP32-S3 si limita a inviare i dati convertiti al display.

```text
JPG/PNG → ritaglio centrato e ridimensionamento a 480×720
→ regolazione di esposizione, contrasto e saturazione → dithering a sei colori → conversione nei valori colore del pannello
→ organizzazione in colonne verticali, mirroring Y e unione di due pixel in un byte
→ array da 172800 byte (photo_data.h) → inclusione in Flash
→ invio al display tramite SPI da ESP32-S3
```

Il dithering alterna pixel di colori diversi affinché l’occhio percepisca toni intermedi nella matrice. Non aumenta il numero di colori: dopo la conversione ogni pixel resta nero, bianco, giallo, rosso, blu o verde. Lo script calcola le distanze in base alla resa reale dei colori dell’e-paper, piuttosto scura, ma produce i valori colore del pannello.

La disposizione dei pixel e la codifica dei colori sono state descritte nelle sezioni «Memorizzazione dei pixel» e «Codifica dei colori»; lo script applica le stesse regole di impacchettamento. I dati generati possono quindi essere inviati direttamente al pannello: la scheda non deve decodificare il JPG né calcolare il dithering.

### Sostituire la foto

Esegui prima un backup del vecchio `photo_data.h`, perché il comando seguente lo sovrascriverà. Sul computer servono Python 3, Pillow e numpy (`pip install pillow numpy`). Non sono necessari per eseguire soltanto l’esempio.

Esegui questo comando nella cartella dell’esempio:

```bash
cd EPD_3in7_Showcase_JD7601
python3 tool/epd_photo.py mia-foto.jpg --header photo_data.h --header-name photo_driver
```

- Il nome dell’array deve restare `photo_driver`. Lo script lo usa per generare `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H` e `PHOTO_DRIVER_BYTES`, richiesti dai `static_assert` alla fine del programma principale.
- Per impostazione predefinita l’immagine viene ritagliata al centro in 480×720. Per non eliminare i bordi, aggiungi `--fit contain` (spazi vuoti) oppure `--fit stretch` (allungamento e deformazione).
- L’output è sempre 480×720 e 172800 byte. Dopo la generazione ricompila e carica; non occorre caricare un filesystem.

## Risoluzione dei problemi

### Errore di compilazione undefined reference to EPD037A02_GFX

Sintomo: il linker non trova `begin()`, `display()` e altre funzioni.

Causa: `EPD037A02_GFX.cpp` non viene compilato. Arduino compila solo i `.cpp` nella radice dello sketch e nella sottocartella `src/`, non quelli in altre sottocartelle come `driver/`.

Soluzione: colloca il `.ino` principale, il `.h` e il `.cpp` del driver allo stesso livello, riapri l’esempio e ricompila.

### Nessun output sul monitor seriale

Sintomo: il caricamento termina, ma la seriale resta vuota.

Causa: baud rate errato, USB CDC non abilitato con la porta USB integrata oppure monitor aperto dopo la fine dei messaggi.

Soluzione: imposta 115200 baud e verifica la porta. Con la porta USB integrata, imposta `USB CDC On Boot` su `Enabled` in Arduino IDE e carica di nuovo. Puoi anche usare la porta UART secondo la documentazione della scheda. Infine premi RESET per riavviare il programma.

### Output seriale presente, ma display completamente bianco

Sintomo: il programma funziona, ma non appare alcuna figura.

Causa: spesso SDA e CLK sono invertiti, CS o DC è cablato male, oppure manca la massa comune.

Soluzione: a scheda spenta, controlla gli 8 cavi uno per uno. Misura VDD a 3,3 V e verifica la continuità di GND. Inoltre il quarto parametro di `SPI.begin()` nel driver deve essere `-1`; `_spiSend()` porta manualmente CS basso e alto.

### Timeout di BUSY durante reset sulla seriale

Sintomo: il log si ferma in attesa del livello alto di BUSY, segnala un timeout di `reset` e infine mostra `Init failed`.

Causa: BUSY resta basso. Il display potrebbe non essere alimentato, il cavo BUSY potrebbe essere collegato male o il flat cable avere un contatto difettoso.

Soluzione: verifica VDD a 3,3 V, l’inserimento completo del flat cable e il collegamento di BUSY a GPIO7. Controlla questi elementi prima di modificare il codice di aggiornamento. Dopo la correzione, rialimenta e carica di nuovo.

### Timeout durante DRF o artefatti localizzati

Sintomo: l’inizializzazione riesce, ma l’aggiornamento va in timeout oppure una parte dell’immagine è anomala.

Cause frequenti: corrente di alimentazione insufficiente, cavi Dupont troppo lunghi o frequenza SPI troppo alta.

Soluzione: accorcia i cavi, controlla il contatto della massa e usa una porta USB o un alimentatore stabile. Mantieni la frequenza SPI predefinita di 2 MHz. Se hai modificato il parametro di `epd.begin()`, rimuovilo per ripristinare il valore predefinito.

### Immagine ruotata di 90° e ripetuta circa tre volte

Sintomo: testo e riquadri sono riconoscibili, ma orientati male e ripetuti con sfasamenti.

Causa: il frame è organizzato per righe, mentre il pannello riceve colonne verticali. Il driver di questo articolo non dovrebbe causare il problema, che compare soprattutto dopo modifiche o con una versione precedente.

Soluzione: verifica che `drawPixel()` contenga `size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);` e che `kColBytes = EPD037A02_HEIGHT / 2`, cioè 360.

### Immagine non ripetuta, ma capovolta verticalmente

Sintomo: l’ordine delle lettere è corretto, ma l’intera immagine è rovesciata dall’alto in basso.

Causa: ogni colonna del pannello viene scandita dal basso verso l’alto e nel codice manca il mirroring Y.

Soluzione: verifica che `drawPixel()` contenga `const int16_t fy = HEIGHT - 1 - dy;` e che i successivi calcoli di indirizzo e nibble usino `fy`. Non limitarti a invertire l’ordine dei byte.

### Linee sottili sfasate, tratti a denti di pettine

Sintomo: la posizione generale è corretta, ma pixel adiacenti sono sfasati di 1–2 px.

Causa: l’ordine dei nibble alto e basso nel byte potrebbe essere invertito.

Soluzione: porta `EPD037A02_SWAP_NIBBLE` da `0` a `1` in `EPD037A02_GFX.h`. Questa impostazione scambia solo i due pixel nel byte, senza correggere il mirroring dell’intera immagine.

### Errore di compilazione Photo must be 480x720 o Photo must be 172800 bytes

Sintomo: scatta uno dei due `static_assert`.

Causa: il nuovo `photo_data.h` non è 480×720 oppure il frame non contiene 172800 byte.

Soluzione: rigenera il file con il comando di conversione precedente conservando `--header-name photo_driver`. Verifica poi che `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H` e `PHOTO_DRIVER_BYTES` valgano rispettivamente 480, 720 e 172800.

## FAQ

**È possibile usare altri pin per EPD037A02?**

Sì. Modifica sia il cablaggio sia `EPD037A02_GFX epd(10, 9, 8, 7, 12, 11)`; l’ordine dei parametri è CS, DC, RST, BUSY, SCK, MOSI. Su ESP32-S3 è consigliabile evitare GPIO0, 45 e 46 (relativi all’avvio), GPIO19 e 20 (USB) e GPIO26–37 (occupati da Flash/PSRAM), facendo comunque riferimento allo schema della propria scheda. Ho compilato soltanto con il gruppo GPIO7–12 e non ho provato altri pin.

**Qual è la frequenza SPI? Si può portare a 8 MHz?**

L’esempio usa per impostazione predefinita 2 MHz, Mode 0, bit più significativo per primo. Per aumentarla, modifica il parametro di `epd.begin()`, per esempio `epd.begin(4000000)`, partendo preferibilmente da 4 MHz; in caso di rumore o artefatti torna a 2 MHz. Non ho testato 8 MHz con questo esempio a tre schermate.

**Si può alimentare a 5 V? Quanta corrente assorbe durante l’aggiornamento?**

No. VDD deve restare a 3,3 V e GND deve essere in comune con la scheda. Durante l’aggiornamento aumenta il carico sul circuito elevatore di tensione: servono quindi cavi Dupont corti e un’alimentazione stabile. Non ho misurato la corrente di picco e non fornisco una stima.

**Quanta RAM e Flash occupa? Il CPU viene saturato?**

Risultato di questa compilazione: 525724 byte di Flash (40%) e 23576 byte di variabili globali (7%). Durante l’esecuzione vengono allocati altri 172800 byte per il framebuffer e un buffer temporaneo di 2048 byte per inviare la foto. L’aggiornamento è bloccante: durante questa fase `loop()` non può fare altro, quindi non programmare attività che richiedano una temporizzazione rigorosa. Non ho misurato l’utilizzo del CPU.

**Si possono usare GxEPD2 o un ESP32 tradizionale?**

La versione GxEPD2 1.6.9 che ho verificato non contiene una classe driver per questo pannello JD7601 a sei colori 480×720 e non può quindi essere applicata direttamente. Un ESP32 tradizionale potrebbe teoricamente funzionare dopo aver adattato il codice SPI e PSRAM specifico della piattaforma, purché la RAM possa contenere il framebuffer da 172800 byte. Non ho testato altri controller.

**Se il display non mostra nulla, quali cavi controllare per primi?**

Misura prima VDD a 3,3 V, poi controlla GND, BUSY, CS, DC, SDA e CLK. Imposta la seriale a 115200. In caso di timeout di `reset` o `DRF`, segui la relativa sezione precedente. Se la seriale non produce alcun output, verifica prima porta e impostazione USB CDC, senza modificare il formato del frame.

**È possibile visualizzare direttamente cinese o JPG?**

No. L’interfaccia usa il font 5×7 integrato in GFX e tutto il testo dell’esempio è in inglese, senza un set di caratteri cinesi. Anche un JPG non può essere inviato direttamente: deve essere convertito in un frame da 480×720 e 172800 byte. Il `photo_data.h` fornito è già convertito; per cambiare immagine consulta «Sostituire la foto».

**Perché la riproduzione si ferma dopo una sola volta? La foto resta visibile senza alimentazione?**

L’esempio è progettato per una riproduzione singola: `loop()` è vuoto e la foto resta visualizzata per ultima. L’e-paper conserva l’immagine senza alimentazione. Premi RESET per riprodurla di nuovo; per un ciclo automatico devi aggiungere la tua logica di attivazione. Non ho misurato l’intervallo per una riproduzione continua.

## Sviluppi possibili

- Sostituisci l’orario fisso con un input dalla seriale, quindi collega dati reali dopo aver verificato il layout.
- Aggiungi un pulsante per passare manualmente tra Hello, orario e foto.
- Aggiungi un RTC per aggiornare automaticamente la data del titolo e la «lezione attuale».
- Memorizza più foto in LittleFS o su una scheda SD per creare una cornice digitale controllata da pulsanti.

## Riferimenti

- [Codice sorgente dell’esempio (GitHub)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601): file completi della demo a tre schermate e script di conversione delle foto.

- [Pagina prodotto ufficiale Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3): informazioni sul controller.

- [Datasheet ufficiale Espressif ESP32-S3](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf): GPIO, SPI e caratteristiche elettriche.

- [Adafruit GFX Library GitHub](https://github.com/adafruit/Adafruit-GFX-Library): interfacce per testo e grafica.

- [Adafruit BusIO GitHub](https://github.com/adafruit/Adafruit_BusIO): libreria richiesta da Adafruit GFX.

- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32): core Arduino e supporto SPI.

- [Documentazione dei font Adafruit GFX](https://learn.adafruit.com/adafruit-gfx-graphics-library/using-fonts): uso dei font integrati e FreeFont.

- [Risorse open source ed esempi del produttore](https://gitee.com/osptek/display-epd-3.7inch-480x720): datasheet, schema ed esempi del produttore.
