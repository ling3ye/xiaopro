---
title: "Pilotare uno schermo ILI9341 con ESP32 tramite bus parallelo a 8 bit"
boardId: esp32
moduleId: display/tft204-ili9341
category: esp32
date: 2026-02-27
intro: "Guida dettagliata su come usare l'ESP32 per pilotare uno schermo ILI9341 tramite bus parallelo a 8 bit. Rispetto alla classica connessione SPI seriale, la modalità parallela offre un refresh rate altissimo, perfetto per visualizzare contenuti dinamici."
image: "https://img.lingshunlab.com/image-20260204140130062.png"
---

Questo articolo ti spiega nel dettaglio come usare un **ESP32** per pilotare uno schermo **ILI9341** tramite **bus parallelo a 8 bit (8-bit Parallel)**. Rispetto alla classica connessione SPI seriale, la modalità parallela offre un refresh rate nettamente superiore, ideale per visualizzare animazioni o interfacce dinamiche.

## Ambiente di sviluppo

OS: MacOS

Arduino IDE Version: 2.3.7

esp32 Version: 3.3.5

TFT_eSPI Version: 2.5.43




## BOM

ESP32 x1

Schermo TFT da 2.4 pollici x1

Cavi Dupont xN



## Collegamenti

| Pin TFT          | **Pin ESP32** | **Descrizione**                                                  |
| ---------------- | ------------- | ---------------------------------------------------------------- |
| **VCC (3V3/5V)** | **3V3 / VIN** | Alimentazione dello schermo (prova prima con 3.3V)               |
| **GND**          | **GND**       | Massa comune                                                     |
| **LCD_D0**       | **GPIO 26**   | Bit dati 0                                                       |
| **LCD_D1**       | **GPIO 25**   | Bit dati 1                                                       |
| **LCD_D2**       | **GPIO 19**   | Bit dati 2                                                       |
| **LCD_D3**       | **GPIO 18**   | Bit dati 3                                                       |
| **LCD_D4**       | **GPIO 5**    | Bit dati 4                                                       |
| **LCD_D5**       | **GPIO 21**   | Bit dati 5                                                       |
| **LCD_D6**       | **GPIO 22**   | Bit dati 6                                                       |
| **LCD_D7**       | **GPIO 23**   | Bit dati 7                                                       |
| **LCD_CS**       | **GPIO 32**   | Chip Select (Selezione chip)                                     |
| **LCD_RTS**      | **GPIO 33**   | Reset (Ripristino)                                               |
| **LCD_RS (DC)**  | **GPIO 14**   | Commutazione dati/comando (Register Select)                      |
| **LCD_WR**       | **GPIO 27**   | Abilitazione scrittura (Write Control)                           |
| **LCD_RD**       | **GPIO 2**    | Abilitazione lettura (se non serve leggere l'ID puoi collegarlo a 3.3V) |




## Librerie da installare

### Arduino IDE Boards Manager: esp32

Devi installare la libreria esp32 di Espressif Systems. Qui stiamo usando l'ultima versione disponibile.

### Arduino IDE Library Manager: TFT_eSPI

Devi installare la libreria TFT_eSPI.



## Configurazione di TFT_eSPI — File «User_Setup.h»

TFT_eSPI è lo strumento definitivo per pilotare schermi con l'ESP32, ma c'è una particolarità: la definizione dei pin, della scheda e del driver dello schermo avviene tutta nel file User_Setup.h. Per questo motivo, modificarlo correttamente è fondamentale.

Il file si trova qui:

Documents > Arduino > libraries > TFT_eSPI > User_Setup.h

**Operazione:** apri il file, cancella tutto il contenuto originale, copia e salva il seguente codice:

```c++
// =========================================================================
//   User_Setup.h - File di configurazione del driver display per la libreria TFT_eSPI
//   User_Setup.h - File di configurazione del driver display per la libreria TFT_eSPI
//
//   Hardware: ESP32 (senza PSRAM oppure senza usare GPIO 16/17)
//   Hardware: ESP32 (senza PSRAM oppure senza usare GPIO 16/17)
//
//   Driver: ILI9341 (modalità parallela a 8 bit)
//   Driver: ILI9341 (modalità parallela a 8 bit)
// =========================================================================

// -------------------------------------------------------------------------
// 1. Definizione del tipo di driver
//    Definizione del tipo di driver
// -------------------------------------------------------------------------
#define ILI9341_DRIVER       // Driver ILI9341 generico

// -------------------------------------------------------------------------
// 2. Definizione dell'ordine dei colori
//    Definizione dell'ordine dei colori
// -------------------------------------------------------------------------
// Se i colori sono invertiti (ad esempio il rosso diventa blu), modifica questa impostazione.
// Se i colori sono invertiti (ad esempio il rosso diventa blu), modifica questa impostazione.
#define TFT_RGB_ORDER TFT_BGR  // La maggior parte degli schermi ILI9341 usa l'ordine BGR
// #define TFT_RGB_ORDER TFT_RGB

// -------------------------------------------------------------------------
// 3. Risoluzione dello schermo
//    Risoluzione dello schermo
// -------------------------------------------------------------------------
#define TFT_WIDTH  240
#define TFT_HEIGHT 320

// -------------------------------------------------------------------------
// 4. Configurazione dell'interfaccia (parte critica)
//    Configurazione dell'interfaccia (parte critica)
// -------------------------------------------------------------------------
#define ESP32_PARALLEL       // Abilita la modalità parallela ESP32
#define TFT_PARALLEL_8_BIT   // Usa il bus parallelo a 8 bit

// -------------------------------------------------------------------------
// 5. Definizione dei pin
//    Definizione dei pin
// -------------------------------------------------------------------------

// --- Pin di controllo ---
// Ottimizzazione: CS/RST spostati su GPIO 32+, lasciando i GPIO bassi per il bus dati e WR.
// Ottimizzazione: CS/RST spostati su GPIO 32+, lasciando i GPIO bassi per il bus dati e WR.

#define TFT_CS   32  // Chip Select (Selezione chip)
#define TFT_RST  33  // Reset (Ripristino)

// Selezione dati/comando - Deve essere su GPIO 0-31 (oppure RS)
// Selezione dati/comando - Deve essere su GPIO 0-31 (oppure RS)
#define TFT_DC   14

// Segnale di scrittura - ★ Pin critico, deve essere su GPIO 0-31 con collegamenti corti
// Segnale di scrittura - ★ Pin critico, deve essere su GPIO 0-31 con collegamenti corti
#define TFT_WR   27

// Segnale di lettura - Se non leggi i dati dello schermo, puoi collegare a 3.3V, ma devi definirlo nella libreria
// Segnale di lettura - Se non leggi i dati dello schermo, puoi collegare a 3.3V, ma devi definirlo nella libreria
#define TFT_RD    2

// --- Pin del bus dati D0 - D7 ---
// Devono essere nel range GPIO 0-31.
// Devono essere nel range GPIO 0-31.
// Evitati GPIO 16, 17 (PSRAM/Flash) e 12 (Strap).
// Evitati GPIO 16, 17 (PSRAM/Flash) e 12 (Strap).

#define TFT_D0   26
#define TFT_D1   25
#define TFT_D2   19
#define TFT_D3   18
#define TFT_D4    5  // Nota: GPIO 5 è un pin Strap, assicurati che lo schermo non lo tiri alto durante l'accensione
                     // Nota: GPIO 5 è un pin Strap, assicurati che lo schermo non lo tiri alto durante l'accensione
#define TFT_D5   21
#define TFT_D6   22
#define TFT_D7   23

// -------------------------------------------------------------------------
// 6. Controllo retroilluminazione (opzionale)
//    Controllo retroilluminazione (opzionale)
// -------------------------------------------------------------------------
// Se il tuo schermo ha un pin BLK o LED, collegalo a un pin ESP32 e definiscilo qui.
// Se il tuo schermo ha un pin BLK o LED, collegalo a un pin ESP32 e definiscilo qui.
// #define TFT_BL   4            // Esempio: collegato a GPIO 4
// #define TFT_BACKLIGHT_ON HIGH // Livello logico alto accende la retroilluminazione

// -------------------------------------------------------------------------
// 7. Caricamento dei font
//    Caricamento dei font
// -------------------------------------------------------------------------
// Abilita secondo le necessità; più font abiliti, più memoria Flash occupi.
// Abilita secondo le necessità; più font abiliti, più memoria Flash occupi.

#define LOAD_GLCD   // Font 1. Original Glcd font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts. Include access to the 48 Adafruit_GFX free fonts FF1 to FF48

#define SMOOTH_FONT // Abilita il caricamento dei font smussati

// -------------------------------------------------------------------------
// 8. Altre impostazioni
//    Altre impostazioni
// -------------------------------------------------------------------------
// In modalità parallela la frequenza SPI viene di solito ignorata, poiché la velocità dipende dalla velocità di scrittura dei registri della CPU.
// Mantenuto per compatibilità.
// In modalità parallela la frequenza SPI viene di solito ignorata, poiché la velocità dipende dalla velocità di scrittura dei registri della CPU.
// Mantenuto per compatibilità.
#define SPI_FREQUENCY       27000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY  2500000

// --- Impostazioni touchscreen ---
// Se usi la funzione touch XPT2046.
// Gli schermi paralleli di solito hanno un'interfaccia SPI separata per il touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).
// Se usi la funzione touch XPT2046.
// Gli schermi paralleli di solito hanno un'interfaccia SPI separata per il touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).

// Se usi il touch, decommenta qui sotto e imposta i pin (puoi usare i pin predefiniti VSPI).
// Se usi il touch, decommenta qui sotto e imposta i pin (puoi usare i pin predefiniti VSPI).

// #define TOUCH_CS 22
// ATTENZIONE: hai usato TFT_D6 su GPIO 22 sopra. Se usi il touch, cerca un altro pin oppure usa SoftSPI.
// ATTENZIONE: hai usato TFT_D6 su GPIO 22 sopra. Se usi il touch, cerca un altro pin oppure usa SoftSPI.
```



## Apri il programma di esempio

Segui questo percorso per aprire il programma di esempio, che ti permette di testare il display:

Arduino IDE: File -> Examples -> TFT_eSPI -> 320 x 240 -> TFT_graphicstest_one_lib



## Carica il programma — Problemi di compilazione

Se la versione della libreria della scheda ESP32 è stata aggiornata alla **3.0.0 o successiva**, è molto probabile che durante la compilazione di TFT_eSPI ti imbatta nel seguente errore:

```tex
In file included from /Users/shawn/Documents/Arduino/libraries/TFT_eSPI/TFT_eSPI.cpp:24:

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c: In member function 'uint8_t TFT_eSPI::readByte()':

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c:113:9: error: 'gpio_input_get' was not declared in this scope; did you mean 'gpio_num_t'?
113 |   reg = gpio_input_get(); // Read three times to allow for bus access time
|         ^~~~~~~~~~~~~~
|         gpio_num_t
exit status 1

Compilation error: exit status 1
```



`error: 'gpio_input_get' was not declared in this scope`

### Analisi della causa dell'errore

`gpio_input_get()` è una macro o funzione del vecchio framework底层 (ESP-IDF) dell'ESP32. Nella recente versione **ESP32 Arduino Core 3.0.x**, Espressif ha ristrutturato pesantemente le API di basso livello, rimuovendo o modificando molte vecchie funzioni. Di conseguenza, la libreria TFT_eSPI non riesce più a trovare la definizione di questa funzione e va in errore.

Puoi risolvere il problema facendo un downgrade della libreria esp32 alla versione 2.0.x — è la soluzione più comoda e rapida. Ma qui ti propongo un'alternativa: modificare direttamente la libreria TFT_eSPI.

Trova e apri questo file:

Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c

Aggiungi la seguente definizione di macro all'inizio del codice, poi salva il file:

```c++
#if !defined(gpio_input_get)
  #define gpio_input_get() GPIO.in
#endif
```



## Carica di nuovo il programma — Problema dell'immagine specchiata

A questo punto la compilazione è passata e il programma è stato caricato con successo sulla scheda. Lo schermo si è acceso! Ma non cantare vittoria troppo presto: se guardi bene, ti accorgerai che il testo sullo schermo è specchiato.

Nel programma di esempio, ho fatto una modifica. Trova la riga 102 circa:

```
void loop(void) {
  for (uint8_t rotation = 4; rotation < 8; rotation++) {
    tft.setRotation(rotation);
    testText();
    delay(2000);
  }
}
```



## Carica il programma finale

Ora l'immagine è finalmente corretta. Congratulazioni, hai acceso con successo questo schermo TFT da 2.4 pollici (ILI9341)!




## Risoluzione dei problemi comuni (FAQ)

Ecco i problemi più frequenti che si incontrano durante lo sviluppo, con le relative soluzioni per una consultazione rapida.

### D1: Lo schermo si illumina di bianco ma non mostra nulla?

- **R1**: Nel 90% dei casi, la modalità parallela non è stata abilitata. Controlla di nuovo che nel file User_Setup.h sia stato decommentato #define ESP32_PARALLEL.
- **R2**: Verifica che TFT_RST (GPIO 33) abbia un buon contatto.

### D2: I colori sono sbagliati, il rosso diventa blu?

- **R**: È un problema di ordine RGB. Nel file User_Setup.h, cambia #define TFT_RGB_ORDER TFT_RGB in TFT_BGR (o viceversa).

### D3: Questa configurazione supporta la funzione touch?

- **R**: In questo articolo abbiamo configurato solo il driver del display. Gli schermi ILI9341 solitamente montano il chip touch XPT2046, che usa un'interfaccia SPI separata. Devi collegare separatamente i pin del touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ) e decommentare TOUCH_CS nel file User_Setup.h. **Attenzione**: il touch usa il protocollo SPI, non puoi condividere i pin con il bus dati parallelo D0-D7.

### D4: Perché non usare direttamente VSPI/HSPI?

- **R**: La velocità di refresh teorica del bus parallelo (8-bit Parallel) è diverse volte superiore a quella dello SPI, ideale per interfacce UI ad alto frame rate o per lo sviluppo di emulatori di giochi retrò.
