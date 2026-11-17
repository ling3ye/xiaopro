---
title: "Tutorial completo: pilotare un LCD riflettente a quattro colori ST7306 con ESP32-S3 (Arduino IDE + SPI)"
boardId: esp32s3
moduleId: display/lcd42-st7306-reflective
category: esp32
date: 2026-11-17
intro: "Fai pilotare un LCD riflettente a quattro colori ST7306 all'ESP32-S3 con Arduino IDE e SPI: cablaggio del FPC 21Pin, codice completo, regolazione dell'orientamento e diagnosi quando non appare nulla. Ambiente testato: Arduino IDE 2.3.8 + esp32 Core 3.3.8."
image: "https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg"
---

> Difficoltà: ⭐⭐☆☆☆  
> Tempo stimato: circa 30–60 minuti (esclusi download dell'ambiente e debug hardware)  
> Ambiente di test: Arduino IDE v2.3.8 + esp32 Arduino Core v3.3.8

## TL;DR: partire subito con ESP32-S3 e ST7306

- Il modulo usa solo 3.3V: collega entrambi i pin 5 e 6 del FPC a 3.3V e crea una massa comune (GND); niente 5V.
- Con il default `PINSET = 1`: CS→GPIO9, RESET→GPIO10, SCLK→GPIO12, MOSI→GPIO13, RS/D/C→GPIO14; TE può restare scollegato.
- Installa `esp32 by Espressif Systems` nell'Arduino IDE: non serve alcuna libreria ST7306 aggiuntiva.
- Apri `esp32s3-st7306-bringup.ino` nella cartella del progetto e scegli la scheda in base al modello di ESP32-S3 che hai in mano (qui è `ESP32S3 Dev Module`); se dalla seriale non arriva alcun log, controlla prima `USB CDC On Boot`.
- SPI di default: modo 0, 20MHz; immagine logica 400×300 in orizzontale. Se non vedi nulla, togli alimentazione e verifica massa comune, verso del FPC e pin RS; poi rialimenta, misura i 3.3V e osserva sotto una luce intensa. Se ancora non va, abbassa `SPI_HZ` a 10MHz.

## Premessa: accendere lo ST7306 con l'Arduino IDE

Questo display da 4.2 pollici usa il controller ST7306, che riceve comandi e dati del framebuffer via SPI. È un TFT LCD completamente riflettente (senza retroilluminazione, leggibile con luce ambientale): senza backlight si vede bene solo in ambienti luminosi. La cartella del progetto contiene sia il programma ESP-IDF sia quello per Arduino IDE; qui seguiamo solo Arduino IDE: colleghi il FPC 21Pin, carichi l'esempio e fai girare le pagine di test a 400×300 in orizzontale. Anche la demo ESP-IDF da 20 pagine resta nella cartella del progetto: chi vuole approfondire l'incapsulamento del driver e le funzioni di disegno può compilarla e provarla per conto proprio.

## Risultato finale: il test a 8 pagine dello ST7306

Se cablaggio e caricamento sono corretti, il programma mostra in ciclo 8 pagine di test. Le pagine normali restano circa 3 secondi, quella del quadrato in movimento circa 6. Apri il monitor seriale a 115200 baud e vedrai i log di inizializzazione e cambio pagina. Ogni pagina viene ridisegnata di continuo mentre è visibile; se apri il monitor seriale solo dopo l'upload potresti perderti i log di avvio: basta premere RST sulla scheda per rivederli.

| Pagina | Contenuto del test | Cosa verificare | Nome nel programma |
| -: | ----------------- | -------------- | ----------------- |
|  0 | Barre orizzontali bianca, ciano, rossa, nera | I quattro stati del display | `PAGE_COLOR_BARS` |
|  1 | HELLO WORLD, cornice, quattro angoli | Testo e orientamento orizzontale | `PAGE_HELLO` |
|  2 | Tempo, conteggio frame, FPS | Tempo cumulativo dall'accensione, frame globali, FPS medio cumulativo (non il frame rate della sola pagina) | `PAGE_COUNTER` |
|  3 | Diagonali, linee orizzontali e verticali | Linee e mappatura delle coordinate | `PAGE_DIAGONAL` |
|  4 | Quadrato che va avanti e indietro | Refresh continuo | `PAGE_REFRESH` |
|  5 | Scacchiera | Quadretti bianchi e neri (20 pixel per lato) | `PAGE_CHECKER` |
|  6 | Strisce orizzontali | Pattern regolare | `PAGE_STRIPES` |
|  7 | Test colore CYAN | Tutto ciano (alla vista tende al blu), byte del framebuffer `0x33` | `PAGE_CYAN` |

> Nota: le etichette dentro le pagine (come `1: COLOR BARS`, `3: DIAGONAL`) sono stringhe fisse nel codice e non corrispondono esattamente ai numeri della tabella (COLOR BARS è la pagina 0): fa fede il log seriale `[PAGE]`.


![](https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/Jb9UiMvgtTQ?si=IvvwAvHHZx5RICSM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## I componenti: YDP420H005-V3 e ST7306

### Il modulo LCD riflettente YDP420H005-V3

È un modulo TFT LCD riflettente da 4.2 pollici (senza retroilluminazione, leggibile con luce ambientale), con framebuffer nativo del pannello a 300×400. Il controller ST7306 è già integrato nel modulo: l'ESP32-S3 gli invia comandi e dati dei pixel via SPI. Il programma Arduino di questo progetto lo mappa a livello applicativo come 400×300 in orizzontale.

Il firmware del progetto pilota quattro stati del display con una codifica a 2bit: bianco, ciano, rosso, nero (`0x00`–`0x03`). Ogni pixel occupa 2bit, senza sfumature di grigio intermedie. Non copiare alla cieca colori e parametri di inizializzazione da altri display ST7306.

| Parametro | Modulo di questo progetto |
| ------- | ----------------------------- |
| Modello | Osptek YDP420H005-V3 |
| Controller | Sitronix ST7306 |
| Risoluzione nativa | 300×400 |
| Stati del display | Bianco, ciano, rosso, nero; 2bit/pixel |
| Interfaccia verso il microcontrollore | SPI a 4 fili (SCLK, MOSI, CS, D/C), più RESET e TE opzionale; sul FPC non c'è MISO/SDO: si può solo scrivere, non leggere |
| Alimentazione e logica del modulo | 3.3V |
| Area attiva | 63.6×84.8mm |
| Temperatura di esercizio | −20～+70°C |

### La breakout board per FPC 21Pin

Il display porta fuori i segnali tramite un FPC 21Pin. La breakout board trasforma quei contatti fitti in piazzole o strip di pin comodi da collegare all'ESP32-S3: per questo progetto non serve costruire alcun circuito di pilotaggio aggiuntivo.

Io uso la breakout board universale a doppio FPC venduta dal produttore insieme al display, senza alcuna serigrafia di modello. Sulla scheda ci sono due connettori: uno 21Pin per il 4.2 pollici e uno 12Pin per il 2.9 pollici, con accanto le piazzole `GND` e `3V3`.

Accanto a ciascun connettore FPC sono saldati alcuni componenti SMD minuscoli, senza valori serigrafati. Non ho indagato a cosa servano né quali valori abbiano.

Questa scheda universale ha un punto in cui è facile sbagliare: riporta sia la serigrafia RS sia DC. Il segnale LCD_D/C di questo modulo va sulla serigrafia `RS`; l'altra serigrafia `DC` non riguarda questo modulo (non ho verificato a quale connettore appartenga): non collegarla. Quando compri o saldi una breakout board, controlla anche il verso dei contatti FPC e la numerazione dei pin.

### Pinout: il FPC 21Pin dello YDP420H005-V3

La tabella segue la numerazione del FPC del modulo. Le serigrafie della breakout board possono differire: quando colleghi, fa fede il datasheet del modulo e il routing reale della board (questa breakout non ha né modello né schema pubblico).

| Pin FPC | Segnale del modulo | Serigrafie comuni | Uso in questo esempio |
| -------: | ---------------------------------- | --------- | -------------------- |
| 1, 4, 7, 14 | GND | GND | Massa comune |
| 2, 3 | NC | NC | Non collegare |
| 5, 6 | VCC(3.3V) | VCC, VCI | Entrambi i pin a 3.3V |
| 8 | LCD_RES | RESET, RST | A GPIO10, reset attivo basso |
| 9 | LCD_SCLK | SCL, SCLK | A GPIO12, clock SPI |
| 10 | TE | TE | Collegabile a GPIO11; qui non viene letto, può restare flottante |
| 11 | LCD_SDI | SDA, MOSI | A GPIO13, MOSI dello SPI |
| 12 | LCD_D/C | RS, A0 | A GPIO14, seleziona comando o dato |
| 13 | LCD_CS | CS | A GPIO9, chip select attivo basso |
| 15–19 | TP-VDD, TP-RST, TP-INT, TP-SDA, TP-SCL | Serigrafie del touch | Questo modulo non ha il touch: non collegare |
| 20, 21 | GND | GND | Anche questi sono massa; qui bastano 1, 4, 7, 14 (non ho misurato uno per uno se sulla breakout 20 e 21 siano collegati agli altri: se vuoi stare tranquillo, metti a massa anche loro) |

Qui SCL e SDA sono nomi comuni ereditati dalle serigrafie della breakout. In questo esempio si usa SPI: SCL corrisponde al clock seriale del display, SDA al MOSI.

## BOM: il materiale per collegare lo ST7306

| Componente | Specifiche | Q.tà | Note |
| ------------ | --------------------- | -: | ---------------- |
| Scheda ESP32-S3 | ESP32-S3 N16R8 (16MB Flash / 8MB PSRAM) | 1 | GPIO a 3.3V |
| Modulo display | Osptek YDP420H005-V3 | 1 | 4.2 pollici, FPC 21Pin |
| Breakout board FPC | Board universale a doppio FPC del produttore, senza modello | 1 | Verifica pin e verso dei contatti |
| Cavo USB dati | Compatibile con il connettore della scheda | 1 | Deve supportare il trasferimento dati |
| Cavetti di collegamento | Cavetti Dupont corti o fili saldati | alcuni | Più i fili SPI sono corti, più il collegamento è stabile e ordinato |

## Cablaggio: ESP32-S3 e ST7306

Togli prima l'alimentazione, poi collega secondo il default `PINSET = 1` qui sotto.

| Pin FPC | Segnale del display | ESP32-S3 | Obbligatorio | Note |
| -------: | --------------- | -------- | ---- | --------- |
| 13 | LCD_CS / CS | GPIO9 | Sì | Chip select |
| 8 | LCD_RES / RESET | GPIO10 | Sì | Reset hardware |
| 10 | TE | GPIO11 | No | L'esempio non lo legge, può restare flottante |
| 9 | LCD_SCLK / SCLK | GPIO12 | Sì | Clock SPI |
| 11 | LCD_SDI / MOSI | GPIO13 | Sì | Dati SPI in uscita |
| 12 | LCD_D/C / RS | GPIO14 | Sì | Sulla breakout del produttore va su RS |
| 5, 6 | VCC / VCI | 3.3V | Sì | Collega entrambi i pin di alimentazione |
| 1, 4, 7, 14 | GND | GND | Sì | Massa comune (GND) con la scheda |

⚠️ Alimentazione e logica del modulo sono entrambe a 3.3V. Quando il modulo è spento, non continuare a mandargli segnali dai GPIO.

A cablaggio finito, controlla prima **a scheda spenta**:

1. Verifica il pin 1 del FPC e il verso dei contatti sul disegno meccanico del modulo.
2. Con il multimetro in modalità continuità, verifica che il GND della scheda e i pin GND del display siano in continuità e che non ci sia corto tra 3.3V e GND.
3. Ricontrolla uno per uno i cinque segnali CS, RESET, SCLK, MOSI, RS.
4. Se usi la breakout a doppio FPC del produttore, conferma che GPIO14 sia collegato a RS.
5. Controlla che non ci siano contatti allentati o cortocircuiti.

Poi **alimenta** e verifica:

6. Misura con il multimetro la tensione sui pin 5 e 6 (o sulle piazzole corrispondenti della breakout): deve essere 3.3V; se non lo è, togli subito alimentazione e indaga.

Ti consiglio di ricontrollare ogni filo due volte. Basta un filo sbagliato e dai log seriali è difficilissimo capire quale sia (in questo esempio i log seriali non riflettono lo stato del display: vedi la sezione di troubleshooting).

## Librerie da installare: supporto ESP32-S3 nell'Arduino IDE

Qui non esiste una libreria Arduino ST7306 separata: driver, disegno e pagine di test stanno tutti nel file `.ino`. `SPI.h` e `esp_heap_caps.h` arrivano con l'ESP32 Arduino Core, non cercarli nel gestore librerie.

| Nome | Autore o fonte | Installazione | Versione verificata |
| ---------------------------------------------------------------- | ------------------------- | ------------------ | ------------- |
| Arduino IDE | Arduino | Dal sito ufficiale Arduino | v2.3.8 |
| [esp32 Arduino Core](https://github.com/espressif/arduino-esp32) | Espressif Systems | Gestore schede dell'Arduino IDE | v3.3.8 |
| [SPI](https://github.com/espressif/arduino-esp32) | Incluso nell'Espressif Arduino Core | Installato con il Core | Con il Core v3.3.8 |
| [esp\_heap\_caps](https://github.com/espressif/arduino-esp32) | Incluso nell'Espressif Arduino Core | Installato con il Core | Con il Core v3.3.8 |

### Installare l'esp32 Arduino Core

1. Apri le preferenze dell'Arduino IDE e aggiungi questo URL tra gli "URL aggiuntivi per il Gestore schede":


   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
2. Apri "Strumenti → Scheda → Gestore schede" e cerca `esp32`.
3. Installa `esp32 by Espressif Systems`. La versione verificata qui è la v3.3.8: per riprodurre il test ti consiglio la stessa, così elimini una variabile di debug legata alle differenze tra versioni del Core.

### Aprire il codice e caricarlo

1. Apri la [pagina GitHub del progetto](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek) e scarica l'intera cartella, oppure salva solo la cartella `ArduinoIDE/esp32s3-st7306-bringup`.
2. Apri `ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino` con l'Arduino IDE.
3. Verifica che nel codice `PINSET` sia `1` e che `ROT180` sia al default `1`.
4. In "Strumenti → Scheda" scegli la scheda ESP32-S3 che hai in mano (qui `ESP32S3 Dev Module`), poi la porta seriale giusta. I valori di riferimento sono nella prossima sezione: non serve copiarli alla lettera.
5. Clicca "Verifica" e, se passa, "Carica".
6. Apri il monitor seriale a 115200 baud. Quando vedi `Ingresso nel ciclo delle pagine di test`, osserva se il display scorre le pagine di test. Con la USB nativa, dopo l'upload la seriale si ri-enumera e i log di avvio potrebbero essere già passati: se non li vedi premi RST, oppure affidati ai log di cambio pagina `[PAGE]` successivi. Il display è riflettente: osservalo sotto una luce intensa.

### Configurazione dei menu dell'Arduino IDE (valori di riferimento)

Questi sono i settaggi con cui ho fatto funzionare il tutto: Arduino IDE v2.3.8 + esp32 Core v3.3.8. Solo come riferimento: le schede ESP32-S3 sono troppe, il chip Flash, la PSRAM e il collegamento USB possono variare, e copiare alla cieca crea più problemi che altro. La terza colonna della tabella indica quali voci dipendono dalla scheda.

| Voce di menu | Valore di questo esempio | Come sceglierlo |
| --- | --- | --- |
| Board | ESP32S3 Dev Module | Scegli in base alla tua scheda; l'architettura deve essere esp32s3 |
| Port | /dev/cu.usbmodem1401 | Scegli la porta reale del tuo computer, non copiare questo percorso |
| USB CDC On Boot | Enabled | Dipende da dove è collegata la USB: Enabled con la USB nativa, Disabled con il chip USB-seriale di bordo |
| CPU Frequency | 240MHz (WiFi) | Lascia il default, l'esempio non richiede di abbassare la frequenza |
| Flash Mode | QIO 80MHz | Dipende dal chip Flash; QIO è il default della maggior parte dei moduli |
| Flash Size | 4MB (32Mb) | Non superare la capacità reale della scheda (troppo grande può impedire l'avvio); troppo piccolo limita solo la capacità usata, la compilazione fallisce solo se il programma supera la partizione |
| PSRAM | Disabled | L'esempio non usa la PSRAM: Disabled è la scelta più stabile; per attivarla devi scegliere il giusto OPI/QSPI in base al modulo (l'R8 del N16R8 di solito è Octal, quindi OPI PSRAM), una scelta sbagliata può impedire l'avvio |
| Partition Scheme | Default 4MB with spiffs（1.2MB APP / 1.5MB SPIFFS） | Il default basta; va cambiato insieme a Flash Size |
| Upload Speed | 921600 | Se l'upload fallisce, scendi a 115200 o 460800 |
| Upload Mode | UART0 / Hardware CDC | Va abbinato alla voce USB CDC |
| USB Mode | Hardware CDC and JTAG | Dipende dal numero di porte USB della scheda; è il caso tipico delle schede con una sola porta |

La mia scheda è una N16R8, dichiarata con 16MB di Flash e 8MB di PSRAM, ma sopra Flash Size è impostato a 4MB e PSRAM a Disabled: gran parte della capacità resta inutilizzata. L'esempio usa solo 30000 byte di RAM per il framebuffer, e il report di compilazione indica che il programma occupa circa il 24% della partizione APP di default, quindi questi valori funzionano. Per sfruttare tutta la capacità bisognerebbe cambiare Flash Size, PSRAM e la tabella delle partizioni: non l'ho provato e non voglio farti cadere in questa insidia.

Per capire se la tua configurazione va bene non serve verificare ogni voce: se compila, si carica, la seriale stampa testo e lo schermo mostra un'immagine, basta così. Se un passaggio si rompe, vai prima alla sezione di troubleshooting e cerca il tuo sintomo.

## Codice completo: pilotare lo ST7306 con l'Arduino IDE

Qui sotto c'è il `.ino` completo v7.5 del repository. Rispetto al repository, questo articolo cambia solo alcuni commenti (significato di `PINSET`, metodo di rotazione, note sulla centratura, definizione degli FPS, uso di `DIAG_MODE`); la logica eseguibile non è stata toccata: consiglio di aggiornare di conseguenza anche i commenti nel repository. La v7.4 ha corretto il byte di riempimento di `PAGE_CYAN`, la v7.5 ha rimosso una lettura di stato `0x09` che non restituiva dati; il resto della logica è invariato.

```cpp
/*
 * Suite di test v7.5 per ESP32-S3 + OSPTEK 4.2" 300x400 LCD bianco/nero/rosso/ciano (ST7306 · SPI)
 *
 * Modifiche v7.5 (rimossa la lettura di stato inefficace):
 *   Test reale con esp32s3-st7306-readback-test: con SPI.begin(...,-1,MOSI,-1) MISO non è collegato,
 *   transfer() restituisce sempre 0xFF, indipendentemente dall'indirizzo del registro e da CS selezionato o meno;
 *   commutando il pin dati a ingresso e leggendo con pull-up/pull-down si ottiene tutti 1 / tutti 0:
 *   durante i comandi di lettura il display non pilota la linea dati.
 *   Conclusione: con questo cablaggio il modulo non permette di rileggere i registri; il vecchio log [DIAG] 0x09 segnalava un falso OK,
 *
 * Modifiche v7.4 (corretto il riempimento a schermo intero di PAGE_CYAN):
 *   Confronto sull'hardware reale tra 0x33 / 0x55 / writePoint(C_CYAN) pixel per pixel:
 *   0x33 e la scrittura pixel per pixel mostrano entrambi tutto ciano (alla vista tende al blu), 0x55 mostra strisce alternate.
 *   Dopo la scrittura pixel per pixel anche i 30000 byte del framebuffer sono tutti 0x33, quindi PAGE_CYAN passa a 0x33.
 *
 * Modifiche v7.3 (ulteriore rotazione di 180° dell'intero schermo):
 *   In demo dal vivo l'orientamento era opposto alla mappatura originale: serve ruotare tutto di 180°.
 *   Prima della mappatura software in writePoint si applica una simmetria centrale delle coordinate logiche:
 *     x -> LCD_W-1-x, y -> LCD_H-1-y
 *   Equivale a rx = 299 - y; ry = x;  attivabile con la macro ROT180; a 0 si torna all'orientamento v7.1.
 *
 * Modifiche v7.1 (adattamento orizzontale - rotazione software, correzione orientamento):
 *   Il flat cable fisico del pannello è verticale 300x400, l'utente lo dispone in orizzontale: vista 400x300.
 *   Rotazione software: writePoint mappa le coordinate logiche orizzontali sul framebuffer verticale.
 *   Formula di mappatura (corretta in v7.1): rx = y; ry = 399 - x;
 *   v7 usava rx=299-y, ry=x (senso orario): il quadrato diagnostico appariva in basso a destra, orientamento sbagliato.
 *   v7.1 passa al senso antiorario: il quadrato deve apparire in alto a sinistra.
 * v7.2: DIAG_MODE disattivato, ripristinato il ciclo completo di test a 8 pagine.
 *
 * Fix chiave v4:
 *   1) Aggiunto pinMode(LCD_CS/RS, OUTPUT): digitalWrite sotto chiama solo gpio_set_level(),
 *      non commuta automaticamente il pin in uscita; i pin ESP32 sono input di default, CS/D-C flottanti
 *      impedivano al display di ricevere qualsiasi sequenza valida di comandi/dati. Era la vera causa del nulla a schermo nelle versioni precedenti.
 *   2) Definizioni dei pin allineate a board_config.h del progetto IDF (BOARD_PINSET 1): cablaggio invariato:
 *      CS=9  RST=10  CLK=12  MOSI=13  RS(D/C)=14
 *   3) Clock SPI 20MHz
 *   4) Aggiunti i passi che nel progetto IDF app_main esegue dopo initialize():
 *      High_Power_Mode / display_on / display_Inversion(false) / clearDisplay
 *   5) Mappatura colori allineata a board_color.h dell'IDF:
 *      C_WHITE=0x00  C_CYAN=0x01  C_RED=0x02  C_BLACK=0x03
 *      (bit0=ciano, bit1=rosso, entrambi i bit attivi=nero)
 *
 * v5 aggiunge 8 pagine di test (3 secondi per pagina, 6 per quella del refresh):
 *   0 COLOR_BARS  barre a quattro colori (bianco/ciano/rosso/nero)
 *   1 HELLO       HELLO WORLD + indicatori ai quattro angoli + cornice
 *   2 COUNTER     tempo / conteggio frame / FPS
 *   3 DIAGONAL    diagonali + linee orizzontali e verticali
 *   4 REFRESH     test di refresh (quadrato in movimento)
 *   5 CHECKER     scacchiera
 *   6 STRIPES     strisce orizzontali
 *   7 CYAN        tutto ciano a schermo intero
 */

#include <SPI.h>
#include <esp_heap_caps.h>

// ---------------- Configurazione dei pin ----------------
#define PINSET 1  // 1=cablaggio di default (GPIO9/10/12/13/14, usato in questo articolo)  0=cablaggio alternativo (GPIO38～42)

#if PINSET == 1
  // Pin identici a board_config.h del progetto IDF (BOARD_PINSET 1): il cablaggio non richiede modifiche
  #define LCD_CS   9
  #define LCD_RST  10
  #define LCD_CLK  12
  #define LCD_MOSI 13
  #define LCD_RS   14   // D/C, serigrafia RS
#else
  #define LCD_CS   38
  #define LCD_RST  41
  #define LCD_CLK  39
  #define LCD_MOSI 42
  #define LCD_RS   40
#endif

// ---------------- Parametri del display ----------------
// Risoluzione logica: orizzontale 400x300 (il flat cable fisico del pannello è verticale 300x400, rotazione software via writePoint(), bit MV non usato)
#define LCD_W      400
#define LCD_H      300
// Parametri del framebuffer verticale (invariati)
#define LCD_PIVOT_W  300   // larghezza fisica
#define LCD_PIVOT_H  400   // altezza fisica
#define LCD_ROW_B    (LCD_PIVOT_W / 2)          // 150 byte per riga
#define BUF_LEN      (LCD_ROW_B * LCD_PIVOT_H / 2)  // 30000 byte
#define CHUNK        1500

// Mappatura colori allineata a board_color.h dell'IDF
#define C_WHITE  0x00
#define C_CYAN   0x01
#define C_RED    0x02
#define C_BLACK  0x03

// Se ancora non si accende, prova ad abbassare 20000000 a 10000000
#define SPI_HZ  20000000

static uint8_t *fb = nullptr;

// ---------------- SPI di basso livello (CS tutto manuale)----------------
static void spi_begin(void) {
  SPI.beginTransaction(SPISettings(SPI_HZ, MSBFIRST, SPI_MODE0));
}

static void lcd_cmd(uint8_t cmd) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, LOW);
  SPI.transfer(cmd);
  digitalWrite(LCD_CS, HIGH);
}

static void lcd_param(uint8_t p) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  SPI.transfer(p);
  digitalWrite(LCD_CS, HIGH);
}

// Qui prima c'era lcd_read_reg(), che leggeva il registro di stato 0x09 con SPI.transfer().
// Motivo della rimozione in v7.5 (test reale, non congettura):
//   1) Il secondo parametro di SPI.begin(LCD_CLK, -1, LCD_MOSI, -1) è MISO: -1 significa non collegato,
//      la periferica non ha un pin di ingresso da campionare, transfer() restituisce sempre 0xFF.
//   2) Provando i registri 0x04 / 0x0A / 0xDA / 0xA5, o tenendo CS sempre alto senza
//      selezionare affatto il display, si rilegge comunque 0xFF —— quel valore non ha alcun legame con lo schermo.
//   3) Passando in half-duplex (pin MOSI come ingresso, clock generato a mano), il pull-up interno dà tutti 1,
//      il pull-down interno tutti 0: durante i comandi di lettura il display non pilota la linea dati, non si può leggere.
// Quindi con questo cablaggio il modulo non offre un self-test del collegamento utilizzabile. Per sapere se è collegato bene, guarda se il display mostra qualcosa.

// ---------------- Sequenza di inizializzazione (identica comando per comando all'IDF)----------------
static void st7306_init(void) {
  // Fix chiave: CS / RS / RST vanno configurati esplicitamente come uscite.
  // digitalWrite sotto chiama solo gpio_set_level(), non commuta automaticamente il pin in uscita;
  // i pin ESP32 sono input di default: senza pinMode, CS e D/C restano flottanti e il display non riceve alcuna sequenza valida.
  pinMode(LCD_CS,  OUTPUT);
  pinMode(LCD_RS,  OUTPUT);
  pinMode(LCD_RST, OUTPUT);
  digitalWrite(LCD_CS, HIGH);   // CS alto a riposo
  digitalWrite(LCD_RS, HIGH);
  digitalWrite(LCD_RST, HIGH); delay(10);
  digitalWrite(LCD_RST, LOW);  delay(10);
  digitalWrite(LCD_RST, HIGH); delay(10);

  // Ultimo parametro -1: CS interamente controllato a mano con digitalWrite
  SPI.begin(LCD_CLK, -1, LCD_MOSI, -1);
  spi_begin();

  lcd_cmd(0xD6); lcd_param(0x17); lcd_param(0x02);
  lcd_cmd(0xD1); lcd_param(0x01);

  lcd_cmd(0xC0); lcd_param(0x12); lcd_param(0x0A);
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);

  lcd_cmd(0xD8); lcd_param(0xA6); lcd_param(0xE9);
  lcd_cmd(0xB2); lcd_param(0x12);

  lcd_cmd(0xB3); lcd_param(0xE5); lcd_param(0xF6); lcd_param(0x17);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x71);
  lcd_cmd(0xB4); lcd_param(0x05); lcd_param(0x46); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x76); lcd_param(0x45);

  lcd_cmd(0x62); lcd_param(0x32); lcd_param(0x03); lcd_param(0x1F);

  lcd_cmd(0xB7); lcd_param(0x13);
  lcd_cmd(0xB0); lcd_param(0x64);

  lcd_cmd(0x11); delay(120);                         // Sleep Out

  lcd_cmd(0xC9); lcd_param(0x00);
  lcd_cmd(0x36); lcd_param(0x48);                    // MX=1, DO=1
  lcd_cmd(0x3A); lcd_param(0x11);
  lcd_cmd(0xB9); lcd_param(0x20);
  lcd_cmd(0xB8); lcd_param(0x29);

  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);

  lcd_cmd(0x35); lcd_param(0x00);
  lcd_cmd(0xD0); lcd_param(0xFF);
  lcd_cmd(0x38);                                     // HPM

  lcd_cmd(0x29);                                     // DISPLAY ON
  lcd_cmd(0x20);                                     // Inversion Off

  lcd_cmd(0xBB); lcd_param(0x4F);                    // Enable Clear RAM

// ---- Passi che l'app_main dell'IDF esegue dopo initialize() ----
  lcd_cmd(0x38); delay(300);                         // sequenza HPM di High_Power_Mode()
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);
  lcd_cmd(0xC9); lcd_param(0x00);
  delay(20);
  // display_on(true) / display_Inversion(false) già inviati sopra con 0x29/0x20
  // clearDisplay() equivale ad azzerare il framebuffer, fatto dal memset prima del flush

  SPI.endTransaction();
}

// ---------------- Flush dello schermo (invio a blocchi)----------------
static void st7306_flush(void) {
  spi_begin();
  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);
  lcd_cmd(0x2C);

  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  for (size_t off = 0; off < BUF_LEN; off += CHUNK) {
    size_t n = BUF_LEN - off;
    if (n > CHUNK) n = CHUNK;
    SPI.writeBytes(fb + off, n);
  }
  digitalWrite(LCD_CS, HIGH);
  SPI.endTransaction();
}

// ---------------- Operazioni sui pixel ----------------
// Coordinate logiche: orizzontale 400x300
// Framebuffer verticale 300(colonne) x 400(righe), mappatura con rotazione software:
//   x orizzontale (0~399, da sinistra a destra) -> riga verticale ry = 399 - x (ribaltamento sinistra-destra)
//   y orizzontale (0~299, dall'alto in basso) -> colonna verticale rx = y
// I segmenti di bit si calcolano dalla parità delle coordinate fisiche verticali rx/ry.
//
// ROT180: ruota l'intero schermo di altri 180° (pannello montato al contrario / orientamento opposto in demo).
//   Si applica prima la simmetria centrale delle coordinate logiche x -> 399-x, y -> 299-y, poi la mappatura qui sopra;
//   semplificato equivale a: rx = 299 - y; ry = x;
#define ROT180 1   // 1 = rotazione di 180° (attuale); 0 = ripristina l'orientamento originale v7.1

static void writePoint(uint16_t x, uint16_t y, uint16_t data) {
  if (x >= LCD_W || y >= LCD_H) return;
#if ROT180
  x = LCD_W - 1 - x;       // mirror della x logica
  y = LCD_H - 1 - y;       // mirror della y logica
#endif
  uint16_t rx = y;         // colonna verticale
  uint16_t ry = 399 - x;   // riga verticale (ribaltata)
  uint16_t real_x = rx / 2;
  uint16_t real_y = ry / 2;
  uint32_t idx    = (uint32_t)real_y * LCD_ROW_B + real_x;
  uint8_t one_two    = (ry % 2) ? 1 : 0;
  uint8_t line_bit_1 = (rx % 2) * 4;
  uint8_t line_bit_0 = (rx % 2) * 4 + 2;
  uint8_t bit1       = 7 - (line_bit_1 + one_two);
  uint8_t bit0       = 7 - (line_bit_0 + one_two);
  if (data & 0x02) fb[idx] |=  (1 << bit1);
  else             fb[idx] &= ~(1 << bit1);
  if (data & 0x01) fb[idx] |=  (1 << bit0);
  else             fb[idx] &= ~(1 << bit0);
}

static void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  for (uint16_t j = 0; j < h; j++)
    for (uint16_t i = 0; i < w; i++)
      writePoint(x + i, y + j, color);
}

// ---------------- Font bitmap 5x7 (portato da board_ui_draw.cc dell'IDF)----------------
static const uint8_t s_font_5x7[][7] = {
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, /*   */
    {0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04}, /* ! */
    {0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00}, /* " */
    {0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A}, /* # */
    {0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04}, /* $ */
    {0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03}, /* % */
    {0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0D}, /* & */
    {0x04, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00}, /* ' */
    {0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02}, /* ( */
    {0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08}, /* ) */
    {0x00, 0x04, 0x15, 0x0E, 0x15, 0x04, 0x00}, /* * */
    {0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00}, /* + */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08}, /* , */
    {0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00}, /* - */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00}, /* . */
    {0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00}, /* / */
    {0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E}, /* 0 */
    {0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* 1 */
    {0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F}, /* 2 */
    {0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E}, /* 3 */
    {0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02}, /* 4 */
    {0x1F, 0x10, 0x10, 0x1E, 0x01, 0x01, 0x1E}, /* 5 */
    {0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E}, /* 6 */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08}, /* 7 */
    {0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E}, /* 8 */
    {0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E}, /* 9 */
    {0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00}, /* : */
};

// Lettere maiuscole A-Z (5x7)
static const uint8_t s_font_upper[][7] = {
    {0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* A */
    {0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E}, /* B */
    {0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E}, /* C */
    {0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E}, /* D */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F}, /* E */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10}, /* F */
    {0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F}, /* G */
    {0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* H */
    {0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* I */
    {0x01, 0x01, 0x01, 0x01, 0x01, 0x11, 0x0E}, /* J */
    {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11}, /* K */
    {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F}, /* L */
    {0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11}, /* M */
    {0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11}, /* N */
    {0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* O */
    {0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10}, /* P */
    {0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D}, /* Q */
    {0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11}, /* R */
    {0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E}, /* S */
    {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04}, /* T */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* U */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04}, /* V */
    {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A}, /* W */
    {0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11}, /* X */
    {0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04}, /* Y */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F}, /* Z */
};

static void draw_char(int x, int y, char c, int scale, uint16_t color) {
    const uint8_t *rows = nullptr;
    if (c >= ' ' && c <= ':') {
        rows = s_font_5x7[c - ' '];
    } else if (c >= 'A' && c <= 'Z') {
        rows = s_font_upper[c - 'A'];
    } else if (c >= 'a' && c <= 'z') {
        rows = s_font_upper[c - 'a'];   // riusa il font bitmap maiuscolo
    } else {
        return;
    }
    for (int ry = 0; ry < 7; ++ry) {
        for (int rx = 0; rx < 5; ++rx) {
            if (rows[ry] & (1U << (4 - rx))) {
                fillRect(x + rx * scale, y + ry * scale, scale, scale, color);
            }
        }
    }
}

static void draw_text(int x, int y, const char *s, int scale, uint16_t color) {
    const int char_w = 5 * scale + scale;
    int pen_x = x;
    for (const char *p = s; *p; ++p) {
        draw_char(pen_x, y, *p, scale, color);
        pen_x += char_w;
    }
}

// ---------------- Pagine di test ----------------
enum TestPage {
    PAGE_COLOR_BARS = 0,   // barre a quattro colori (bianco/ciano/rosso/nero)
    PAGE_HELLO,            // Hello World + indicatori ai quattro angoli + cornice
    PAGE_COUNTER,          // conteggio secondi / frame
    PAGE_DIAGONAL,         // diagonali + linee orizzontali e verticali
    PAGE_REFRESH,          // test di refresh (quadrato in movimento)
    PAGE_CHECKER,          // scacchiera
    PAGE_STRIPES,          // strisce orizzontali
    PAGE_CYAN,             // tutto ciano a schermo intero
    kTotalPages
};

static void draw_corner_marks(uint16_t color) {
    const int L = 30, T = 4;  // lunghezza e spessore dei bracci
    // in alto a sinistra
    fillRect(4, 4, L, T, color);  fillRect(4, 4, T, L, color);
    // in alto a destra
    fillRect(LCD_W - 4 - L, 4, L, T, color);  fillRect(LCD_W - 4 - T, 4, T, L, color);
    // in basso a sinistra
    fillRect(4, LCD_H - 4 - T, L, T, color);  fillRect(4, LCD_H - 4 - L, T, L, color);
    // in basso a destra
    fillRect(LCD_W - 4 - L, LCD_H - 4 - T, L, T, color);
    fillRect(LCD_W - 4 - T, LCD_H - 4 - L, T, L, color);
}

static void draw_border(uint16_t color) {
    fillRect(0, 0, LCD_W, 2, color);
    fillRect(0, LCD_H - 2, LCD_W, 2, color);
    fillRect(0, 0, 2, LCD_H, color);
    fillRect(LCD_W - 2, 0, 2, LCD_H, color);
}

// Disegna una retta in qualsiasi direzione (Bresenham)
static void draw_line(int x0, int y0, int x1, int y1, int thick, uint16_t color) {
    int dx = abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int dy = -abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    int err = dx + dy;
    while (true) {
        fillRect(x0, y0, thick, thick, color);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

static void render_page(int page, uint32_t frame, uint32_t elapsed_ms) {
    memset(fb, 0x00, BUF_LEN);   // default tutto bianco

    switch (page) {
    case PAGE_COLOR_BARS: {
        const uint16_t colors[4] = { C_WHITE, C_CYAN, C_RED, C_BLACK };
        const int bar_h = LCD_H / 4;
        for (int i = 0; i < 4; ++i) {
            int y0 = i * bar_h;
            int y1 = (i == 3) ? LCD_H : (y0 + bar_h);
            fillRect(0, y0, LCD_W, y1 - y0, colors[i]);
        }
        draw_text(10, 10, "1: COLOR BARS", 2, C_BLACK);
        break;
    }
    case PAGE_HELLO:
        // "HELLO WORLD" 11 caratteri * scale5 * 6px = 330px di larghezza, centrato x=(400-330)/2=35
        draw_text(35, 110, "HELLO WORLD", 5, C_BLACK);
        draw_text(110, 175, "ST7306 400X300", 2, C_RED);
        draw_text(110, 200, "ESP32-S3 ARDUINO", 2, C_CYAN);
        draw_corner_marks(C_BLACK);
        draw_border(C_RED);
        break;
    case PAGE_COUNTER: {
        char buf[24];
        uint32_t sec = elapsed_ms / 1000;
        snprintf(buf, sizeof(buf), "T: %02lu:%02lu", (unsigned long)(sec / 60), (unsigned long)(sec % 60));
        draw_text(115, 80, buf, 5, C_BLACK);        // 240 di larghezza; x=115 regolato a mano, non centrato rigorosamente
        snprintf(buf, sizeof(buf), "FRAME: %lu", (unsigned long)frame);
        draw_text(140, 160, buf, 3, C_RED);         // larghezza variabile col numero di cifre; x=140 regolato a mano
        snprintf(buf, sizeof(buf), "FPS: %lu", (unsigned long)(frame * 1000 / max((uint32_t)1, elapsed_ms)));
        draw_text(152, 200, buf, 3, C_CYAN);        // larghezza variabile col numero di cifre; x=152 regolato a mano; FPS = media cumulativa di tutte le pagine dall'accensione
        break;
    }
    case PAGE_DIAGONAL:
        // due diagonali
        draw_line(0, 0, LCD_W - 1, LCD_H - 1, 3, C_BLACK);
        draw_line(LCD_W - 1, 0, 0, LCD_H - 1, 3, C_RED);
        // linea orizzontale
        for (int y = 30; y < LCD_H; y += 60)
            draw_line(0, y, LCD_W - 1, y, 2, C_CYAN);
        // linea verticale
        for (int x = 40; x < LCD_W; x += 80)
            draw_line(x, 0, x, LCD_H - 1, 2, C_BLACK);
        draw_text(10, 10, "3: DIAGONAL", 2, C_BLACK);
        break;
    case PAGE_REFRESH: {
        // quadrato avanti e indietro, per osservare la fluidità del movimento
        int period = LCD_W - 60;
        int x = (int)((frame * 8) % (period * 2));
        if (x > period) x = period * 2 - x;
        fillRect(x + 10, 130, 40, 40, C_BLACK);     // centrato in verticale y=(300-40)/2
        char buf[24];
        snprintf(buf, sizeof(buf), "FRAME %lu", (unsigned long)frame);
        draw_text(10, 10, buf, 2, C_BLACK);
        break;
    }
    case PAGE_CHECKER: {
        const int cell = 20;
        for (int y = 0; y < LCD_H; y += cell)
            for (int x = 0; x < LCD_W; x += cell)
                fillRect(x, y, cell, cell, ((x / cell + y / cell) & 1) ? C_BLACK : C_WHITE);
        break;
    }
    case PAGE_STRIPES: {
        const int stripe_h = 16;
        for (int y = 0; y < LCD_H; y += stripe_h * 2) {
            fillRect(0, y, LCD_W, stripe_h, C_BLACK);
            fillRect(0, y + stripe_h, LCD_W, stripe_h, C_WHITE);
        }
        break;
    }
    case PAGE_CYAN:
        memset(fb, 0x33, BUF_LEN);   // 0x33 = ogni pixel combinato 01 -> tutto ciano
        draw_text(85, 130, "CYAN FULL", 5, C_BLACK);   // 270 di larghezza; x=85 regolato a mano, non centrato rigorosamente
        break;
    default:
        break;
    }

    st7306_flush();
}

// ---------------- Entry point Arduino ----------------

// Modalità diagnostica: con true disegna solo un quadrato nero 50x50 alle coordinate logiche (50,50),
// per verificare mappatura e orientamento di writePoint (a schermo completamente nero non aiuta: controlla prima cablaggio e alimentazione).
// Cosa osservare:
//   1. Il quadrato è un quadrato (non rettangolo/frammenti) -> proporzioni della mappatura pixel corrette
//   2. Il quadrato è nel quarto in alto a sinistra della vista orizzontale -> orientamento corretto
//   3. Se tutto è capovolto -> cambia prima la macro ROT180; se ancora non va, valuta i bit MX/MY di MADCTL(0x36)
#define DIAG_MODE  false

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println();
    Serial.println("=== ST7306 test suite v7.5 (ROT180) ===");

    fb = (uint8_t *)heap_caps_malloc(BUF_LEN, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!fb) fb = (uint8_t *)malloc(BUF_LEN);
    if (!fb) { Serial.println("[ERR] Allocazione framebuffer fallita"); while (1) delay(100); }
    Serial.printf("[OK] Framebuffer %d byte @%p\n", BUF_LEN, fb);
    memset(fb, 0x00, BUF_LEN);

    Serial.println("[..] Inizializzazione ST7306 ...");
    st7306_init();

    // Qui prima si leggeva una volta il registro di stato 0x09 stampando OK / collegamento assente.
    // Rimosso in v7.5: MISO non è collegato, il valore letto è sempre 0xFF, scollegato dallo stato del display: solo falsi positivi.
    // Per sapere se il collegamento funziona, guarda se sul display appare correttamente l'immagine.

    if (DIAG_MODE) {
        Serial.println("[DIAG] Disegno quadrato 50x50 in (50,50), osserva lo schermo...");
        fillRect(50, 50, 50, 50, C_BLACK);
        st7306_flush();
    } else {
        Serial.println("[OK] Ingresso nel ciclo delle pagine di test");
    }
}

void loop() {
    if (DIAG_MODE) { delay(1000); return; }

    static int page = 0;
    static uint32_t page_start = 0;
    static uint32_t frame = 0;
    static uint32_t t_start = 0;

    if (t_start == 0) t_start = millis();
    if (page_start == 0) page_start = millis();

    uint32_t dwell = (page == PAGE_REFRESH) ? 6000 : 3000;
    uint32_t elapsed = millis() - page_start;

    render_page(page, frame, millis() - t_start);
    frame++;

    if (elapsed >= dwell) {
        page = (page + 1) % kTotalPages;
        page_start = millis();
        Serial.printf("[PAGE] %d / %d, frame %lu\n", page, kTotalPages - 1, (unsigned long)frame);
    }
}
```


### Il codice: inizializzazione ST7306, framebuffer e rotazione

`PINSET` decide quale gruppo di GPIO usare. Il cablaggio di questo articolo corrisponde a `PINSET = 1`; il sorgente conserva anche l'altro gruppo di pin per `PINSET = 0`: se cambi gruppo devi cambiare anche il cablaggio. `PINSET` è solo un interruttore tra due gruppi di pin e non ha nulla a che vedere con l'uso della breakout board; per comodità di cablaggio ho aggiunto una configurazione, quella di `PINSET = 1`.

`st7306_init()` imposta prima CS, RS e RST come uscite, poi esegue il reset hardware e l'inizializzazione dello ST7306. `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` specifica SCLK e MOSI, mentre CS è gestito manualmente dal codice; MISO riceve `-1` perché sul FPC di questo modulo non c'è MISO/SDO: si può solo scrivere, non leggere, quindi qui non esiste alcun self-test in lettura. La trasmissione usa `SPI_MODE0`, con clock impostato da `SPI_HZ` a 20MHz.

La dimensione del framebuffer si calcola direttamente: 2bit per pixel, un byte contiene 2×2 cioè 4 pixel, quindi 300×400 pixel equivalgono a 150 byte per riga e 200 righe (ogni riga copre 2 righe di pixel): `150 × 200 = 30000` byte. All'avvio il programma chiede memoria utilizzabile dal DMA con `heap_caps_malloc()` e, se fallisce, ripiega su un normale `malloc()`.

`writePoint()` converte le coordinate logiche 400×300 orizzontali in quelle native 300×400 del framebuffer. Con il default `ROT180 = 1` viene applicata anche una simmetria centrale: per cambiare orientamento agisci prima su questa macro, non su `LCD_W` e `LCD_H`.

`st7306_flush()` invia ogni volta l'intero framebuffer, in blocchi da 1500 byte. `loop()` ridisegna di continuo la pagina corrente: le pagine normali cambiano dopo circa 3 secondi, `PAGE_REFRESH` dopo circa 6. Tempo e FPS della pagina contatore sono valori cumulativi dall'accensione, non dati della singola pagina.

Il driver della versione ESP-IDF è suddiviso in `main/st7306_color4.cpp`, `main/st73xx_ui.c` e `main/color4_demo.c`, con più pagine. Questa parte la lascio a chi vuole studiarla seguendo il README del repository: qui non entro nei passi di compilazione ESP-IDF.

## Troubleshooting: ST7306 senza immagine, orientamento e colori

### Upload riuscito, ma lo schermo non cambia affatto

Sintomo: la seriale gira, lo schermo resta com'era.

Causa: alimentazione, massa comune, verso del FPC, RS/DC collegato male o segnali SPI instabili possono impedire ai comandi di inizializzazione di arrivare correttamente al display; inoltre un pannello riflettente non ha backlight e in un ambiente troppo buio sembra spento anche quando funziona.

Cosa fare: togli alimentazione e verifica massa comune e verso dei contatti FPC, poi rialimenta e misura se i pin 5 e 6 sono a 3.3V (vedi i controlli sopra). Sulla breakout del produttore GPIO14 va su RS. Osserva sotto una luce intensa, cambiando angolazione. Se tutto è a posto, porta `SPI_HZ` da `20000000` a `10000000`, accorcia i fili SCLK e MOSI e ricarica.

### Le vecchie versioni (v7.4 e precedenti) stampano OK sulla seriale, ma lo schermo resta nero

Sintomo: la seriale stampa `[DIAG] ST7306 0x09 = 0xFF OK`, ma sul display non appare nulla.

Causa: quel log non riflette lo stato del display. Come mostra la tabella dei pin FPC, questo modulo non ha MISO/SDO, `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` non assegna alcun pin a MISO e `SPI.transfer()` restituisce sempre `0xFF`, indipendentemente dal registro letto e dal fatto che CS sia selezionato o meno (ho provato `0x04`, `0x0A`, `0xDA`, `0xA5`, e anche tenendo CS sempre alto: identico). Leggendo a mano con il pin MOSI commutato a ingresso, con pull-up ottieni tutti 1 e con pull-down tutti 0: anche questo dimostra che durante i comandi di lettura il display non pilota la linea dati.

Cosa fare: aggiorna alla v7.5, dove quella riga è stata rimossa. I log seriali della v7.5 non riflettono lo stato del display: per giudicare il collegamento guarda solo se sullo schermo appare l'immagine, e torna a controllare alimentazione, massa comune, verso del FPC e pin RS.

### ST7306 intermittente, immagine corrotta o risultati diversi a ogni accensione

Sintomo: a volte funziona, a volte l'immagine è corrotta, oppure riaccendendo il risultato cambia.

Causa: fili SPI troppo lunghi o una massa comune con contatti scadenti introducono errori durante la trasmissione; più i fili sono lunghi e più il clock è alto, più è facile perdere byte (è una valutazione empirica, non ho fatto test quantitativi).

Cosa fare: accorcia prima i fili entro 10cm e assicurati che GND abbia almeno due collegamenti, non un solo filino sottile. Poi prova ad abbassare `SPI_HZ` da 20MHz a 10MHz; se diventa stabile, risali gradualmente. Non iniziare cancellando o modificando a caso i comandi di inizializzazione.

### Orientamento orizzontale dello ST7306 capovolto

Sintomo: testo o grafica ruotati di 180°, ma proporzioni corrette.

Causa: il codice attuale ha `ROT180 = 1` di default e il tuo posizionamento potrebbe essere opposto a quello dell'esempio.

Cosa fare: dopo l'upload guarda la pagina HELLO WORLD: se il testo è dritto non toccare nulla; se tutto è capovolto di 180°, cambia `#define ROT180 1` in `#define ROT180 0` e ricarica. Per verificare separatamente orientamento e coordinate, imposta `DIAG_MODE` a `true`: il programma disegnerà solo un quadrato nero 50×50; con l'orientamento giusto deve essere un quadrato perfetto nella zona in alto a sinistra. Questa modalità serve solo a controllare orientamento e mappatura: se lo schermo è completamente nero non ti aiuta.

### Proporzioni o posizione anomale sullo ST7306

Sintomo: quadrati deformati, pattern frammentati o posizioni inattese.

Causa: succede di solito dopo aver modificato `LCD_W`, `LCD_H`, le macro del layout del framebuffer o `writePoint()`, oppure usando il codice su un altro modulo ST7306; sulla v7.5 non modificata, con questo modulo, non dovrebbe accadere. La mappatura tra coordinate logiche 400×300 e framebuffer nativo 300×400 passa da `writePoint()`: non si risolve cambiando le macro di risoluzione.

Cosa fare: mantieni `LCD_W = 400` e `LCD_H = 300`, attiva prima `DIAG_MODE` per controllare il quadrato, poi verifica `rx`, `ry` e il calcolo dei bit-plane in `writePoint()`.

### Colori dello ST7306 diversi dal previsto

Sintomo: rosso, ciano o pattern di riempimento non corrispondono alle attese.

Causa: questo modulo ha solo quattro stati — bianco, ciano, rosso, nero — con i due bit di colore interlacciati dentro il byte. Altri moduli ST7306 possono implementare i colori in modo diverso.

Cosa fare: esegui prima la pagina delle barre a quattro colori per confermare i quattro stati base, poi controlla la scrittura dei colori in `writePoint()`. Dalla v7.4 il byte di riempimento di `PAGE_CYAN` è `0x33`; se con una vecchia versione vedi strisce alternate, aggiorna il codice o modifica solo quel punto.

### L'Arduino IDE segnala che `esp_heap_caps.h` non si trova

Sintomo: in compilazione manca l'header.

Causa: la scheda o il Core selezionati sono sbagliati. Questo header fa parte dell'ESP32 Arduino Core, non è una libreria di terze parti separata.

Cosa fare: verifica di aver installato `esp32 by Espressif Systems` e di aver scelto ESP32-S3 nel menu schede, non Arduino Uno o altre architetture. Se il Core è corrotto, annota la versione attuale, reinstallalo e riseleziona scheda e porta.

### Dopo l'upload sull'ESP32-S3 non si vedono log seriali

Sintomo: sul display magari le pagine ci sono, ma il monitor seriale resta vuoto.

Causa: baud rate, dispositivo seriale o configurazione USB CDC non corrispondono, oppure la seriale è occupata da un altro programma.

Cosa fare: imposta 115200 baud e chiudi gli altri monitor che tengono occupata la seriale. Poi confronta con i valori di questo esempio: `USB CDC On Boot = Enabled`, `USB Mode = Hardware CDC and JTAG`, dispositivo seriale del tipo `/dev/cu.usbmodem1401` (su Windows una porta COM). Se la scheda usa il chip USB-seriale onboard invece della USB nativa, metti `USB CDC On Boot` su `Disabled`; in quel caso `USB Mode` è praticamente ininfluente, lascia il default.

## FAQ: domande frequenti su ESP32-S3 e ST7306

**D: Posso collegare lo ST7306 ad altri pin dell'ESP32-S3?**  
R: Sì: modifica `LCD_CS`, `LCD_RST`, `LCD_CLK`, `LCD_MOSI` e `LCD_RS` nel ramo `PINSET = 1` del `.ino`, aggiornando anche il cablaggio. Se un certo GPIO sia utilizzabile dipende dai pin esposti dalla scheda e dalla configurazione di boot: non l'ho verificato scheda per scheda. Per esempio, sull'N16R8 i GPIO35–37 sono occupati dalla PSRAM Octal: con PSRAM attiva vanno evitati. Il `PINSET = 0` del sorgente offre anche l'alternativa CS=38, RESET=41, SCLK=39, MOSI=42, RS=40.

**D: Si può cambiare il clock SPI dello ST7306?**  
R: L'esempio usa di default `SPI_HZ = 20000000`, cioè 20MHz. Se la comunicazione è instabile, prova prima `10000000`. La documentazione del progetto riporta che il manuale ST7306 v0.1 indica un periodo minimo del clock di scrittura di 30ns, circa 33.3MHz; sul modulo reale contano anche routing e breakout board, e non ho misurato il limite stabile di questa scheda.

**D: Lo YDP420H005-V3 può essere alimentato a 5V?**  
R: No. I pin 5 e 6 del FPC vanno a 3.3V e anche la logica lavora a 3.3V. Collega entrambi i pin di alimentazione e metti scheda e modulo a massa comune (GND). A modulo spento, non continuare a mandargli segnali GPIO.

**D: Quanta RAM usa questo esempio ST7306 e quanti FPS fa?**  
R: Il framebuffer completo è 30000 byte; il programma usa anche font bitmap, variabili locali e la memoria di lavoro dell'Arduino Core. A ogni refresh vengono inviati tutti i 30000 byte; a 20MHz, contando solo il payload SPI, il tempo teorico di trasferimento è circa 12ms, esclusi disegno e overhead dei comandi. Gli FPS reali non li ho registrati. La pagina contatore mostra la media cumulativa di tutte le pagine dall'accensione, non il frame rate della singola pagina; anche il disegno in sé (una chiamata a `writePoint()` per pixel) costa tempo, quindi il tempo di frame reale sarà maggiore di 12ms.

**D: Se cambio display con un altro basato su ST7306, funziona subito?**  
R: Non è garantito. Questo esempio è tarato sul FPC 21Pin dello YDP420H005-V3, sulla sua sequenza di inizializzazione, sul framebuffer 300×400 e sugli attuali quattro stati. Altri moduli possono cambiare alimentazione, indirizzamento, colori o parametri di inizializzazione: confronta prima il loro datasheet.

**D: ST7306 cablato ma senza immagine: da dove parto?**  
R: A scheda spenta controlla massa comune, verso del FPC e i cinque segnali obbligatori, e conferma che sulla breakout del produttore GPIO14 vada su RS; poi alimenta, misura i 3.3V e osserva sotto una luce intensa. Se ancora niente, abbassa lo SPI a 10MHz. `DIAG_MODE` serve solo per orientamento e mappatura: a schermo completamente nero è di poco aiuto.

**D: TE e MISO dello ST7306 vanno collegati?**  
R: TE è un'uscita di sincronismo del frame: qui non viene letta, puoi lasciarla scollegata. Per scrivere sul display serve solo MOSI, e sul FPC non c'è MISO/SDO, quindi in questo esempio non esiste un self-test che rilegga i registri. Nelle vecchie versioni `lcd_read_reg(0x09)` restituiva sempre `0xFF`, indipendentemente dallo stato del display: nella v7.5 è stato rimosso, dettagli nella sezione di troubleshooting.

**D: Posso usare questo display ST7306 con ESP-IDF?**  
R: La cartella del progetto (`Handbook/ESP-IDF/420-…`) è già un progetto ESP-IDF: le note di sviluppo indicano una compilazione senza warning con ESP-IDF v6.0.2, con demo da 20 pagine e funzioni di disegno. In questo articolo non ho rieseguito quella build e non tratto un tutorial ESP-IDF: puoi studiarla seguendo il README del repository.

## Idee per andare oltre: modificare l'esempio ST7306

- Sostituisci il font bitmap 5×7 di `draw_text()` con una tua libreria di caratteri a matrice di punti e costruisci un cartello di stato a quattro colori.
- Aggiungi alle pagine esistenti una strategia di aggiornamento parziale e misura tempi di refresh e resa visiva.
- Collega il segnale TE, studia come temporizzare gli aggiornamenti dello schermo e osserva le pagine in movimento.
- Leggi la demo ESP-IDF da 20 pagine affiancandola alla versione Arduino ed estrai le funzioni di disegno che ti servono nella tua applicazione.

## Riferimenti: ESP32-S3, ST7306 e Arduino

- [Homepage del progetto LingShunLAB](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek): fonte di cablaggio, codice e documentazione di questo articolo.
- [Sorgente dell'esempio Arduino IDE v7.5](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino): il `.ino` completo.
- [Datasheet del modulo YDP420H005-V3](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/docs/YDP420H005-V3.pdf): parametri del modulo, disegno meccanico e definizione del FPC.
- [Elenco prodotti ufficiale Sitronix ST7306](https://www.sitronix.com.tw/en/products/industrial-display-driver-ic/ultra-low-power-tft-driver-ic/): pagina dei driver TFT ultra-low-power di Sitronix.
- [Manuale del controller ST7306 v0.1 (fornito dal produttore del modulo)](https://admin.osptek.com/uploads/ST_7306_V0_1_c30c3541a3.pdf): interfaccia, registri, framebuffer e timing; una copia è conservata anche in `docs/` del repository.
- [Codice di esempio originale Osptek](https://gitee.com/osptek/display-rlcd-4.2inch-300x400/tree/main/examples): esempi display correlati forniti dal produttore.
- [Pagina prodotto ufficiale Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3) e [datasheet ufficiale](https://documentation.espressif.com/esp32-s3_datasheet_en.html): documentazione del chip principale.
- [GitHub dell'esp32 Arduino Core](https://github.com/espressif/arduino-esp32) e [documentazione ufficiale di installazione](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html): pacchetto di supporto schede e metodo di installazione.
