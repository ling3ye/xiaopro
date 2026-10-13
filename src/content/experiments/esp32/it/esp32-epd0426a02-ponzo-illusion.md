---
title: "ESP32-S3 pilota un display e-ink EPD0426A02 SSD1677 da 4,26\" per riprodurre l'illusione del corridoio di Ponzo｜Tutorial completo SPI + GxEPD2"
boardId: esp32s3
moduleId: display/epd-4inch26-epd0426a02
category: esp32
date: 2026-10-13
intro: "Pilota il display e-ink EPD0426A02 (800×480, controller SSD1677) da un ESP32-S3 via SPI e riproduci l'animazione in quattro frame dell'illusione del corridoio di Ponzo con il refresh parziale di GxEPD2. Cablaggio completo, codice Arduino e risoluzione di schermate bianche o corrotte inclusi."
image: "https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg"
---

> **Sintesi in una riga**: collega 8 fili, installa 2 librerie, carica uno sketch — e il tuo ESP32-S3 riprodurrà l'illusione del corridoio di Ponzo su un e-ink da 4,26", insegnandoti tra l'altro il refresh parziale, l'abilità più utile dell'e-paper.

```
Difficoltà: ⭐⭐☆☆☆ (adatto ai principianti, purché VCC non finisca su 5V)
Tempo stimato: 40 minuti (10 di cablaggio + 15 di ambiente + 15 di caricamento e spettacolo)
Testato con: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + GxEPD2 1.6.9
```

> **TL;DR (avvio rapido):**
>
> 1. Cablaggio: MOSI → GPIO11, SCK → GPIO12, CS → GPIO10, DC → GPIO9, RST → GPIO8, BUSY → GPIO7
> 2. VCC su 3,3V (con 5V bruci il pannello — non chiedere come faccio a saperlo)
> 3. Installa due librerie: GxEPD2 (≥ 1.5.3) + Adafruit_GFX (arriva in automatico con GxEPD2)
> 4. Seleziona la scheda "ESP32S3 Dev Module", carica, e aspetta che il tuo cervello venga ingannato

---

## Introduzione: un corridoio che inganna l'umanità da oltre 100 anni

Questa immagine la conosci di sicuro: due segmenti assolutamente identici, ma appena ci si disegnano intorno le linee prospettiche di un corridoio, quello "più lontano" sembra più lungo. Sai che sono uguali, eppure i tuoi occhi si rifiutano di ammetterlo — è la classica illusione di Ponzo. Il cervello attiva automaticamente la modalità "inferenza prospettica" e traduce "lontano" in "più grande".

Da tempo cercavo l'occasione di "materializzare" questa illusione con le mie mani. Per caso avevo sulla scrivania un e-ink EPD0426A02 da 4,26" (800×480, controller SSD1677) e un ESP32-S3. Il carattere dell'e-paper — cambiamenti lenti e un'immagine che resta anche a corrente staccata — si sposa alla perfezione con una demo di illusione: il pubblico ha tutto il tempo per dubitare della realtà e, a spettacolo finito, puoi staccare la spina e lasciarlo sul tavolo a ingannare l'ospite successivo.

Questo articolo ti guida da zero: collega 8 fili, installa 2 librerie, carica uno sketch, e lascia che questo schermo dia una lezione al tuo cervello. Lungo la strada padroneggerai l'abilità e-paper più pratica di tutte: il refresh parziale.

## Risultato finale

Dopo il caricamento, lo schermo riproduce automaticamente un'animazione di circa 40 secondi in quattro frame: prima chiede "queste due linee sono lunghe uguali?", poi rivela la risposta e infine si ferma sulla scena dell'illusione del corridoio (l'MCU va in pausa; l'immagine resta fino al reset manuale).

![](https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg)

Ecco lo storyboard dei quattro frame. Le transizioni usano il refresh parziale e i segmenti non si muovono di un millimetro:

| Frame  | Contenuto                                                     | Durata |
| ------ | ------------------------------------------------------------- | ------ |
| 1      | Solo i segmenti A e B, "Are these two lines the same length?" | 7 s    |
| 2      | Si aggiungono guide orizzontali tratteggiate, "Yes - exactly equal." | 7 s |
| 3      | Entrano in scena le linee prospettiche, "And now?"            | 10 s   |
| 4      | Guide + prospettiva insieme, "Same lines - your brain was fooled." | 7 s |
| Finale | Scena di pura illusione + titolo grande "Ponzo illusion", poi pausa | Resta |

![](https://img.lingflux.com/2026/10/68b443e3994d10b40d287b13965c7c93.jpg)

## Descrizione dei componenti

### E-ink EPD0426A02 — una "lavagna elettronica" che ricorda senza corrente

L'EPD0426A02 è un modulo di carta elettronica da 4,26 pollici prodotto da Osptek (Shenzhen). Il suo compito è "stampare" sul pannello i dati immagine inviati dall'ESP32-S3. In questo progetto riproduce l'animazione dell'illusione in quattro frame e mantiene l'immagine a lungo.

In parole povere: è un cugino dello schermo del Kindle — una "lavagna elettronica". Scrivi, togli la corrente, e la scritta resta; per cambiare contenuto si "cancella e riscrive" tutto il pannello (ecco perché l'e-paper lampeggia qualche volta durante il refresh). Il refresh lento è il suo personaggio; non consumare energia è il suo superpotere.

Parametri chiave:

| Voce                         | Parametro                                                  |
| ---------------------------- | ---------------------------------------------------------- |
| Dimensione / Risoluzione     | 4,26 pollici, 800 × 480 (orizzontale), 219 DPI             |
| IC driver                    | SSD1677 (controller 960 source × 680 gate, interfaccia SPI) |
| Capacità di visualizzazione  | B/N bistabile, 4 livelli di grigio nativi (2 bit/px)       |
| Interfaccia                  | FPC 24 pin, SPI a 4 fili (sola scrittura)                  |
| Corrente di picco in refresh | ~50 mA                                                     |
| Corrente in deep sleep       | ~3 µA (immagine mantenuta a consumo zero)                  |
| Vita utile di progetto       | 5 anni / 1.000.000 di refresh (25 ℃ / 60%UR)               |

Perché proprio questo? 800×480 è alta definizione per un e-paper di queste dimensioni: le linee prospettiche vengono ben nitide; i 3 µA di deep sleep rendono l'uso "finisci lo spettacolo, stacca la spina, continua a ingannare la gente" totalmente indolore per la batteria; e GxEPD2 lo supporta nativamente dalla v1.5.3 (classe driver `GxEPD2_426_GDEQ0426T82`) — nessun driver da scrivere.

### Descrizione dei pin

La scheda adattatrice dell'EPD0426A02 espone 8 pin, ciascuno col suo ruolo:

| Pin        | A cosa serve                                                |
| ---------- | ----------------------------------------------------------- |
| VCC        | Alimentazione 3,3V (⚠️ mai a 5V)                             |
| GND        | Massa comune — parlare la stessa lingua della scheda        |
| MOSI (DIN) | Dati SPI — l'MCU spinge i pixel nel pannello                |
| SCK (SCL)  | Clock SPI — stabilisce a che velocità viaggia ogni bit      |
| CS         | Chip select — basso = "questo bus ora è tuo"                |
| DC         | Commutazione dati/comando: alto=dati pixel, basso=comando   |
| RST        | Reset hardware — da impulsare prima dell'inizializzazione   |
| BUSY       | Segnale di occupato: alto = refresh in corso, non disturbare |

Un'avvertenza: il BUSY di questo pannello è **attivo alto** (occupato = alto), anche se il pin viene spesso chiamato `BUSY_N` — l'esatto contrario dell'intuizione. Per fortuna GxEPD2 ha già riempito quella buca per noi; basta sapere che esiste.

## Distinta base (BOM)

| N.  | Componente       | Modello / Specifica                                          | Qtà | Note                                       |
| --- | ---------------- | ------------------------------------------------------------ | --- | ------------------------------------------ |
| 1   | Scheda di sviluppo | ESP32-S3 (vanno bene ESP32-S3-DevKitC / Arduino Nano ESP32) | 1   | Basta il convertitore USB-seriale integrato |
| 2   | Modulo e-paper   | EPD0426A02 (SSD1677, 800×480)                                | 1   | Con scheda adattatrice, 8 pin strip        |
| 3   | Cavetti Dupont   | Femmina-femmina o maschio-maschio                            | 8   | 6 segnali + alimentazione e massa          |
| 4   | Cavo USB         | Type-C o Micro (dipende dalla scheda)                        | 1   | Alimentazione + caricamento                |

## Cablaggio

![](https://img.lingflux.com/2026/10/3ae30dc6faad42836102413a774bc830.jpg)

Lo schema di cablaggio fa fede; la tabella serve per la verifica incrociata:

| Pin e-paper | GPIO dell'ESP32-S3 | Note                              |
| ----------- | ------------------ | --------------------------------- |
| VCC         | 3V3                | ⚠️ 3,3V — con 5V bruci il pannello |
| GND         | GND                | Qualsiasi GND                     |
| MOSI (DIN)  | GPIO11             | Dati SPI                          |
| SCK (SCL)   | GPIO12             | Clock SPI                         |
| CS          | GPIO10             | Chip select                       |
| DC          | GPIO9              | Dati/Comando                      |
| RST         | GPIO8              | Reset                             |
| BUSY        | GPIO7              | Segnale di occupato (ingresso)    |

**Dopo il cablaggio, ricontrolla ogni connessione una per una: risparmia l'80% del tempo di debug.** Un e-paper cablato male non genera errori né fuma; mostra solo in silenzio una schermata bianca o corrotta — non puoi capire se la colpa è del codice o dei fili. Attenzione inoltre: sull'ESP32-S3 i pin I2C predefiniti del framework Arduino sono GPIO8 (SDA) e GPIO9 (SCL), che questo sketch assegna a RST e DC. Quindi, con lo schermo collegato, ogni dispositivo I2C va rimappato su altri GPIO liberi tramite `Wire.begin(SDA, SCL)`.

Se usi un **Arduino Nano ESP32**, le serigrafie D4~D7 e A4/A5 non sono i veri numeri GPIO. Tabella di corrispondenza:

| Pin e-paper | GPIO reale | Serigrafia Nano ESP32 |
| ----------- | ---------- | --------------------- |
| MOSI        | GPIO11     | A4                    |
| SCK         | GPIO12     | A5                    |
| CS          | GPIO10     | D7                    |
| DC          | GPIO9      | D6                    |
| RST         | GPIO8      | D5                    |
| BUSY        | GPIO7      | D4                    |

## Librerie da installare

Apri Arduino IDE → Strumenti → Gestisci librerie, e installa:

| Libreria     | Autore            | Versione richiesta                                   | Scopo                          |
| ------------ | ----------------- | ---------------------------------------------------- | ------------------------------ |
| esp32        | Espressif Systems | 3.3.10 (verificata con Arduino IDE 2.3.x)            | Supporto scheda ESP32-S3       |
| GxEPD2       | Jean-Marc Zingg   | **1.6.9** (include la classe `GxEPD2_426_GDEQ0426T82`) | Driver e-paper                 |
| Adafruit_GFX | Adafruit          | Si installa in automatico con GxEPD2                 | API grafica (linee, font)      |

Poi seleziona **ESP32S3 Dev Module** in Strumenti → Scheda, collega la porta seriale e sei pronto a caricare.

## Codice completo

Copia e carica direttamente (il file corrisponde a `arduino/GxEPD2_CorridorIllusion/GxEPD2_CorridorIllusion.ino` del progetto):

```cpp
/*
 * EPD0426A02 (e-paper SPI 4,26" 480x800, SSD1677) — Demo illusione del corridoio (illusione di Ponzo)
 * Scheda: ESP32-S3 (Arduino IDE, selezionare "ESP32S3 Dev Module")
 * Libreria driver: GxEPD2, con la classe integrata GxEPD2_426_GDEQ0426T82
 *
 * Definizione dei pin identica all'esempio di riferimento:
 *   BUSY -> GPIO7    DC -> GPIO9     CS -> GPIO10
 *   SCK  -> GPIO12   MOSI -> GPIO11  RST -> GPIO8
 *
 * Svolgimento dello spettacolo (un solo giro, nessun loop):
 *   Frame 1: due segmenti spessi di pari lunghezza A e B  "Are these two lines the same length?"
 *   Frame 2: guide orizzontali tratteggiate aggiunte      "Yes - exactly equal."
 *   Frame 3: segmenti fermi, prospettiva del corridoio    "And now?"
 *   Frame 4: prospettiva + guide, la rivelazione          "Same lines - your brain was fooled."
 *   Infine ritorno al frame 3 (scena dell'illusione), in attesa
 *
 * La tela è orizzontale 800x480 (rotation 0 = orientamento nativo del controller).
 */

#include <Arduino.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>

// ---------------- Definizione dei pin (conforme a board_pins.h del progetto ESP-IDF) ----------------
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_SCK  12
#define EPD_MOSI 11

// Modalità buffer a schermo intero (page_height = HEIGHT, 48000 byte)
GxEPD2_BW<GxEPD2_426_GDEQ0426T82, GxEPD2_426_GDEQ0426T82::HEIGHT> display(
  GxEPD2_426_GDEQ0426T82(/*CS=*/EPD_CS, /*DC=*/EPD_DC, /*RST=*/EPD_RST, /*BUSY=*/EPD_BUSY));

// ---------------- Geometria della scena (800x480 orizzontale) ----------------
static const int16_t W = 800;
static const int16_t H = 480;

static const int16_t VPX = 700, VPY = 240;   // punto di fuga, corridoio sinistro
static const int16_t VP2X = 1600, VP2Y = 240; // 2° punto di fuga (molto a destra, fuori schermo), linee della parete destra
static const int16_t VP0X = -900, VP0Y = 260; // 3° punto di fuga (molto a sinistra, fuori schermo), linee della parete sinistra
static const int16_t XN  = 150;              // x dell'angolo vicino (segmento A)
static const int16_t XF  = 520;              // x dell'angolo lontano (segmento B)
static const int16_t Y1  = 190;              // estremo superiore dei segmenti
static const int16_t Y2  = 290;              // estremo inferiore (entrambi i segmenti sono lunghi 100px)

static const int16_t SEG_W = 6;              // spessore dei segmenti
static const uint32_t FRAME_MS  = 7000;      // durata per frame
static const uint32_t FRAME3_MS = 10000;      // il frame 3 dura un po' di più

// Esperimento: il datasheet richiede di scrivere 0x04, 0x63 nel registro di controllo
// VCOM (0x2B); il driver GxEPD2 non lo invia, quindi lo patchiamo a mano
// (va chiamato dopo display.init(), perché SWRESET azzera quel registro)
static void epdWriteVCOMControl()
{
  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));
  digitalWrite(EPD_CS, LOW);
  digitalWrite(EPD_DC, LOW);
  SPI.transfer(0x2B);
  digitalWrite(EPD_DC, HIGH);
  SPI.transfer(0x04);
  SPI.transfer(0x63);
  digitalWrite(EPD_CS, HIGH);
  SPI.endTransaction();
}

// valore y del punto di ascissa x sulla retta da (px, py) verso il punto di fuga (vpx, vpy)
static int16_t onLineYVP(int16_t x, int16_t px, int16_t py, int16_t vpx, int16_t vpy)
{
  float t = (float)(x - px) / (float)(vpx - px);
  return (int16_t)(py + (vpy - py) * t);
}

// Corridoio sinistro: verso il punto di fuga VP
static int16_t onLineY(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VPX, VPY);
}

// Parete destra: verso il 2° punto di fuga VP2
static int16_t onLineY2(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP2X, VP2Y);
}

// Parete sinistra: verso il 3° punto di fuga VP0
static int16_t onLineY0(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP0X, VP0Y);
}

// ---------------- Elementi di disegno ----------------

// I due segmenti — coordinate e spessore identici in ogni frame
static void drawSegments()
{
  display.fillRect(XN - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // segmento A
  display.fillRect(XF - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // segmento B

  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(XN - 34, Y2 + 30);
  display.print("A");
  display.setCursor(XF + 16, Y2 + 30);
  display.print("B");
}

// Guide di allineamento orizzontali tratteggiate, che dimostrano che gli estremi dei due
// segmenti condividono la stessa orizzontale
static void drawGuides()
{
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    for (int16_t x = 0; x < W; x += 12)
    {
      display.drawFastHLine(x, ys[i], 6, GxEPD_BLACK);
    }
  }
}

// Linee prospettiche del corridoio
static void drawPerspective()
{
  const int16_t topX = XN, topY = 40;    // cima dell'angolo vicino
  const int16_t botX = XN, botY = 440;   // fondo dell'angolo vicino

  int16_t ftY = onLineY(XF, topX, topY); // y superiore dell'angolo lontano
  int16_t fbY = onLineY(XF, botX, botY); // y inferiore dell'angolo lontano

  // Soffitto / pavimento (2px)
  display.drawLine(topX, topY, XF, ftY, GxEPD_BLACK);
  display.drawLine(topX, topY + 1, XF, ftY + 1, GxEPD_BLACK);
  display.drawLine(botX, botY, XF, fbY, GxEPD_BLACK);
  display.drawLine(botX, botY - 1, XF, fbY - 1, GxEPD_BLACK);

  // Angolo vicino (2px) / angolo lontano (1px)
  display.drawLine(XN, topY, XN, botY, GxEPD_BLACK);
  display.drawLine(XN + 1, topY, XN + 1, botY, GxEPD_BLACK);
  display.drawLine(XF, ftY, XF, fbY, GxEPD_BLACK);

  // Linee prospettiche orizzontali per gli estremi dei segmenti (fino alla parete lontana)
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XF, onLineY(XF, XN, ys[i]), GxEPD_BLACK);
  }

  // Suddivisioni verticali (fughe dei mattoni della parete)
  static const int16_t divX[] = {260, 350, 420, 470, 500};
  for (uint8_t i = 0; i < sizeof(divX) / sizeof(divX[0]); i++)
  {
    int16_t x = divX[i];
    display.drawLine(x, onLineY(x, topX, topY), x, onLineY(x, botX, botY), GxEPD_BLACK);
  }

  // ---- Parete destra: dall'angolo lontano (XF) al bordo destro dello schermo, convergendo su VP2 ----
  const int16_t XR = W - 1;

  // Linea del soffitto / linea del pavimento (prolungate fino al bordo destro)
  display.drawLine(XF, ftY, XR, onLineY2(XR, XF, ftY), GxEPD_BLACK);
  display.drawLine(XF, fbY, XR, onLineY2(XR, XF, fbY), GxEPD_BLACK);

  // Linee orizzontali per gli estremi dei segmenti, prolungate sulla parete destra
  for (int i = 0; i < 2; i++)
  {
    int16_t yAtXF = onLineY(XF, XN, ys[i]); // y a cui la prospettiva della parete sinistra raggiunge l'angolo lontano
    display.drawLine(XF, yAtXF, XR, onLineY2(XR, XF, yAtXF), GxEPD_BLACK);
  }

  // Suddivisioni verticali della parete destra (fughe), collegano soffitto e pavimento
  static const int16_t divXR[] = {600, 660, 710, 750, 780};
  for (uint8_t i = 0; i < sizeof(divXR) / sizeof(divXR[0]); i++)
  {
    int16_t x = divXR[i];
    display.drawLine(x, onLineY2(x, XF, ftY), x, onLineY2(x, XF, fbY), GxEPD_BLACK);
  }

  // ---- Parete sinistra: dall'angolo vicino (XN) al bordo sinistro dello schermo, convergendo su VP0 ----
  const int16_t XL = 0;

  // Linea del soffitto / linea del pavimento (prolungate fino al bordo sinistro)
  display.drawLine(XN, topY, XL, onLineY0(XL, XN, topY), GxEPD_BLACK);
  display.drawLine(XN, botY, XL, onLineY0(XL, XN, botY), GxEPD_BLACK);

  // Linee orizzontali per gli estremi dei segmenti, prolungate sulla parete sinistra
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XL, onLineY0(XL, XN, ys[i]), GxEPD_BLACK);
  }

  // Suddivisioni verticali della parete sinistra (fughe)
  static const int16_t divXL[] = {30, 80, 120};
  for (uint8_t i = 0; i < sizeof(divXL) / sizeof(divXL[0]); i++)
  {
    int16_t x = divXL[i];
    display.drawLine(x, onLineY0(x, XN, topY), x, onLineY0(x, XN, botY), GxEPD_BLACK);
  }
}

// Testo in alto
static void drawTitle(const char *text)
{
  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(20, 34);
  display.print(text);
}

// Titolo grande del frame finale: font più grande, centrato orizzontalmente in alto
// (la zona centrale in alto sta sopra la linea del soffitto, senza sovrapporsi alla prospettiva)
static void drawTitleBig(const char *text)
{
  display.setFont(&FreeSansBold18pt7b);
  display.setTextColor(GxEPD_BLACK);
  int16_t tbx, tby;
  uint16_t tbw, tbh;
  display.getTextBounds(text, 0, 0, &tbx, &tby, &tbw, &tbh);
  display.setCursor((W - tbw) / 2 - tbx + 200, 48 - tby); // linea di base intorno a y=48
  display.print(text);
}

// Disegna l'intera scena in base al numero di frame (1..4), sempre in coordinate assolute
// a finestra intera
static void drawFrame(uint8_t frame)
{
  display.fillScreen(GxEPD_WHITE);
  switch (frame)
  {
    case 1:
      drawTitle("Are these two lines the same length?");
      break;
    case 2:
      drawTitle("Yes - exactly equal.");
      drawGuides();
      break;
    case 3:
      drawTitle("And now?");
      drawPerspective();
      break;
    case 5: // frame finale: scena dell'illusione + titolo grande, senza "And now?"
      drawTitleBig("Ponzo illusion");
      drawPerspective();
      break;
    case 4:
    default:
      drawTitle("Same lines - your brain was fooled.");
      drawPerspective();
      drawGuides();
      break;
  }
  drawSegments(); // sempre disegnato per ultimo in ogni frame, coordinate immutate
}

// Mostra un frame con refresh completo
static void showFrameFull(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.display(); // refresh a schermo intero
}

// Mostra un frame con refresh parziale: disegna la finestra intera, poi displayWindow()
// aggiorna solo la zona modificata (finestra a schermo intero = refresh parziale totale)
static void showFramePartial(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.displayWindow(0, 0, W, H);
}

void setup()
{
  Serial.begin(115200);
  delay(500);
  Serial.println("[EPD] EPD0426A02 Corridor Illusion (GxEPD2 / GDEQ0426T82)");

  // Mappatura pin SPI personalizzata ESP32: SCK, MISO(-1 = inutilizzato), MOSI, SS
  SPI.begin(EPD_SCK, -1, EPD_MOSI, EPD_CS);

  display.init(115200);
  display.setRotation(0); // orizzontale nativo 800x480
  display.setTextColor(GxEPD_BLACK);

  epdWriteVCOMControl(); // patch del registro di controllo VCOM 0x2B

  // ---- Un solo giro: frame 1 -> 2 -> 3 -> 4 ----
  // Frame 1: apertura con refresh completo
  showFrameFull(1);
  Serial.println("[EPD] frame 1 (full refresh)");
  delay(FRAME_MS);

  // Frame 2 -> 3 -> 4: refresh parziale, segmenti impassibili
  showFramePartial(2);
  Serial.println("[EPD] frame 2 (partial)");
  delay(FRAME_MS);

  showFramePartial(3);
  Serial.println("[EPD] frame 3 (partial)");
  delay(FRAME3_MS);

  showFramePartial(4);
  Serial.println("[EPD] frame 4 (partial, reveal)");
  delay(FRAME_MS);

  // Alla fine resta la scena dell'illusione (frame 5: corridoio + titolo grande
  // "Ponzo illusion", senza "And now?")
  showFramePartial(5);
  Serial.println("[EPD] final frame 5 (illusion + title), hold");
  delay(1000);

  // Demo finita, l'immagine resta sullo schermo (niente deep sleep)
  Serial.println("[EPD] done, holding frame");
}

void loop()
{
  // L'immagine è già mantenuta sullo schermo; qui si girano i pollici
}
```

### Spiegazione del codice

Lo sketch conta 300 e rotti righe — sembra lungo, ma fa solo sei cose:

1. **Pin e oggetto display (il gruppo di `#define` + la dichiarazione `GxEPD2_BW`)**: 6 macro per i 6 fili di segnale; `GxEPD2_BW<..., HEIGHT>` è la "modalità buffer a schermo intero" — un intero frame da 48.000 byte vive in RAM in un colpo solo, cosa che l'ESP32-S3 digerisce senza batter ciglio. Vuoi altri pin? Modifica quelle 6 macro e hai finito.
2. **Storyboard dei quattro frame (`drawFrame`)**: in sostanza una tabella switch. Nota che `drawSegments()` sta fuori dallo switch e viene disegnato per ultimo in ogni frame — le coordinate dei segmenti non cambiano mai; cambiano solo le guide e la prospettiva intorno. È la legge ferrea che rende l'illusione "onesta".
3. **La matematica della prospettiva (`drawPerspective` + le tre funzioni `onLineY`)**: al centro, l'equazione della retta per due punti delle scuole medie. Ciascuna delle tre pareti converge verso il proprio "punto di fuga" (un'intersezione fuori dalla tela), il che dà alle linee una profondità naturale. Mettere i punti di fuga fuori dallo schermo (VP2 a x=1600, VP0 a x=-900) rende la prospettiva persino più naturale.
4. **Refresh parziale (`displayWindow` dentro `showFramePartial`)**: prima ridisegna l'intero frame in memoria, poi spinge al pannello solo i pixel cambiati. Tra i frame 2 e 4 i segmenti non si muovono di un capello — lampeggiano solo guide e prospettiva. Questa è l'anima del refresh parziale rispetto al completo: veloce (~0,42 s per aggiornamento) e senza lampi che spaccano gli occhi.
5. **La patch VCOM 0x2B (`epdWriteVCOMControl`)**: il datasheet dell'SSD1677 richiede di scrivere `0x04, 0x63` nel registro `0x2B` (per sopprimere i glitch durante la commutazione di ACVCOM), ma né GxEPD2 né la demo del produttore inviano questo comando. Le conseguenze dell'omissione sono subdole: finita la demo, finché VCC resta collegato, l'immagine degrada lentamente nell'arco di minuti. Va reinviato dopo ogni `display.init()`, perché il reset software (0x12) azzera quel registro. Questa trappola mi è costata un'intera giornata — dettagli nella sezione risoluzione problemi.

## Risoluzione dei problemi

Niente panico — il 90% dei problemi nasce in questi cinque punti. Controllali dall'alto in basso:

**1. Dopo il caricamento, schermo bianco e non appare nulla**

Non mettere ancora in discussione la tua esistenza. Controlla in ordine di probabilità: ① Qualcuno dei 6 fili di segnale fa falso contatto (i Dupont si allentano sulla breadboard col tempo)? ② VCC è davvero su 3,3V? ③ Il monitor seriale stampa `[EPD] frame 1` subito dopo il caricamento? Se non c'è alcun output seriale, il programma non gira e il pannello è innocente. L'e-paper non lancia mai errori: una schermata bianca *è* il suo messaggio di errore.

**2. Errore di compilazione: `'GxEPD2_426_GDEQ0426T82' does not name a type`**

Il tuo GxEPD2 è precedente alla 1.5.3. Apri il gestore librerie e aggiorna GxEPD2 all'ultima versione — questa classe driver esiste solo dalla v1.5.3.

**3. La demo è finita, ma l'immagine degrada lentamente restando lì (scala di decine di minuti)**

È la storia dello 0x2B. Verifica che `epdWriteVCOMControl()` venga chiamato dopo ogni `display.init()` — il reset software azzera quel registro; prima init, poi la patch. Ordine invertito = come non averlo mai inviato. Con la patch corretta, un'immagine ferma e alimentata resta solida come una roccia.

**4. Si vede solo metà immagine, oppure è sfalsata in verticale**

Nove volte su dieci è la rotazione o la risoluzione. Questo sketch usa `setRotation(0)` (orizzontale nativo 800×480); se uno sketch precedente ha lasciato la rotazione a 1 o 3, riportala a zero. (Sul fronte ESP-IDF esiste una variante con rendering paginato per la memoria stretta; la modalità buffer intero di Arduino non ha questo problema.)

**5. Upload fallito / porta seriale non trovata**

Tieni premuto il pulsante BOOT della scheda mentre inserisci l'USB per entrare in modalità download. Se non basta, cambia cavo — molti "cavi di ricarica" portano solo l'alimentazione, senza linee dati. L'incidente più frequente della mia carriera di caricatore di sketch.

## FAQ

**D: Un ESP32 normale (non S3) o un ESP32-C3 possono eseguire questo sketch?**
R: Sì. Il codice non usa nulla di specifico dell'S3; qualsiasi ESP32 supportato dal framework Arduino funziona — basta spostare i fili su GPIO liberi della tua scheda. Il buffer a schermo intero richiede circa 48 KB di RAM, che persino l'ESP32 classico (520 KB di SRAM) può permettersi.

**D: Posso usare altri pin GPIO? Come?**
R: Certo. Modifica i 6 `#define` in testa allo sketch (EPD_CS / EPD_DC / EPD_RST / EPD_BUSY / EPD_SCK / EPD_MOSI) e ricabla di conseguenza. Sull'ESP32-S3 evita i pin di strapping GPIO0/3/45/46, GPIO19/20 (USB) e i pin occupati da Flash/PSRAM — vedi lo schema della tua scheda.

**D: L'e-paper impiega secondi per aggiornarsi e lampeggia più volte, è normale?**
R: Il refresh completo lento è pura fisica normale: ogni refresh "ri-comprime" tutte le 480 righe di pixel. Su questo pannello un refresh completo misura circa 2 secondi (circa 1,5 s con forme d'onda veloci). I lampeggi sono la procedura standard per cancellare le immagini residue, non un guasto. Troppo lento? Usa il refresh parziale (`displayWindow`) di questo sketch — misurato circa 0,42 s per aggiornamento, quasi senza lampeggi.

**D: Il pannello sopporta i 5V?**
R: No. Il VCC dell'EPD0426A02 deve essere 3,3V, punto. I 5V non lo fanno fumare all'istante, ma danneggiano il circuito interno di pilotaggio ad alta tensione — il sintomo appare come corruzione localizzata dopo pochi utilizzi, e la garanzia non copre. Meglio uno schermo spento che i 5V.

**D: Lo schermo degrada lentamente se resta alimentato dopo la demo — come lo risolvo definitivamente?**
R: Scrivi i due byte 0x04, 0x63 nel registro 0x2B dell'SSD1677 (il datasheet dice letteralmente "reduce glitch when ACVCOM toggle") e reinviali dopo ogni reset software. È esattamente ciò che fa `epdWriteVCOMControl()`. Un'alternativa più fisica è tagliare VCC con un P-MOSFET, ma se bastano due byte software, non serve scaldare il saldatore.

**D: Perché dici 4 livelli di grigio? La pagina del prodotto pubblicizza 16 livelli!**
R: I pixel dell'SSD1677 hanno fisicamente solo due stati stabili (nero/bianco) e il percorso dati è a 2 bit/px — nativamente sono quindi 4 livelli di grigio (nero/grigio scuro/grigio chiaro/bianco). La scala di grigi si ottiene con tabelle di forme d'onda (LUT) che applicano impulsi di numero e polarità diversi a pixel diversi dentro un frame; i 16 livelli percepiti sono simulati sopra quei 4 tramite dithering ordinato Bayer 4×4. Questo sketch dell'illusione usa solo bianco e nero puro, quindi non ne è toccato — ma ricorda questo tetto quando vorrai mostrare foto.

**D: Il refresh parziale lascia immagini residue col tempo — che faccio?**
R: L'accumulo di residui è insito nel refresh parziale. La strategia pratica: "dopo una serie di parziali, fare un refresh completo" — `display.clearScreen()`, oppure semplicemente un passaggio tutto nero e uno tutto bianco per lavare via i fantasmi. Questo sketch fa solo 4 refresh, i residui sono trascurabili.

**D: Voglio cambiare lunghezza/posizione dei segmenti, o tradurre i testi in italiano — dove modifico?**
R: Tutti i parametri dei segmenti stanno nel gruppo di costanti "Geometria della scena": `XN`/`XF` sono le posizioni orizzontali, `Y1`/`Y2` gli estremi superiore e inferiore (lunghezza = Y2 - Y1), `SEG_W` lo spessore. I testi sono nello switch di `drawFrame`. Dopo la modifica, mantieni la coerenza delle coordinate tra i due segmenti — altrimenti l'illusione smette di essere "onesta".

## Per andare oltre

- Cambia illusione: sostituisci Ponzo con l'illusione delle frecce di Müller-Lyer o quella dei cerchi di Ebbinghaus — basta riscrivere le funzioni geometriche di `drawFrame`
- Avanzamento manuale dei frame: collega un pulsante touch o un potenziometro, così il pubblico grida "rivela!" e solo allora parte il frame 3 — cerimonia massima
- Cronometro a refresh parziale: riusa il trucco di `displayWindow` per costruire un cronometro elettronico che avanza di una tacca ogni 0,42 s, e goditi la dissonanza cognitiva dell'e-paper "in movimento"
- Foto in scala di grigi: aggiungi GxEPD2_4G e "stampa" una foto sull'e-paper con 4 livelli di grigio + dithering Bayer — effetto sfondo del Kindle
- Soprammobile a batteria: 18650 + deep sleep, sveglia di pochi secondi al giorno per aggiornare l'immagine — una pila dura mesi, e il tuo corridoio dell'illusione può ingannare la gente 24 ore su 24, 7 giorni su 7

## Riferimenti

- Pagina prodotto ufficiale dell'IC driver SSD1677 (Solomon Systech): https://www.solomon-systech.com/product/ssd1677/
- Libreria driver GxEPD2 su GitHub (elenco completo dei pannelli supportati): https://github.com/ZinggJM/GxEPD2
- Libreria grafica Adafruit_GFX su GitHub: https://github.com/adafruit/Adafruit-GFX-Library
- Pagina prodotto ufficiale del SoC ESP32-S3 (Espressif): https://www.espressif.com/en/products/socs/esp32-s3
- Libreria sorella GxEPD2_4G (per foto in grigi a 4 livelli + dithering): https://github.com/ZinggJM/GxEPD2_4G
