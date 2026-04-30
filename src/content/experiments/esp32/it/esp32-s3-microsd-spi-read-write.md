---
title: "ESP32-S3 e Micro SD Card: Guida Completa alla Lettura/Scrittura via SPI con Arduino"
boardId: esp32s3
moduleId: storage/microsd-storage-board
category: esp32
date: 2026-04-30
intro: "Scopri come usare ESP32-S3 in modalità SPI per leggere e scrivere su una Micro SD Card: elenco file, lettura, scrittura e cancellazione. Con schemi di collegamento, codice completo e suggerimenti per evitare errori comuni."
image: "https://img.lingflux.com/2026/04/a52d9db02d07cc13df512e06920e4603.jpg"
---

> **In breve**: ESP32-S3 legge e scrive una Micro SD Card via SPI, dai collegamenti all'elenco file sul monitor seriale in 30 minuti.

# ESP32-S3 e Micro SD Card: Guida Completa alla Lettura/Scrittura via SPI con Arduino

> Difficoltà: ⭐⭐☆☆☆ (basta un minimo di basi per iniziare) Tempo stimato: 30 minuti Ambiente di test: Arduino IDE 2.3.x + ESP32 Arduino Core 3.x

------

> **TL;DR (versione rapida):**
>
> 1. Collegamenti: GPIO5 → CMD (MOSI), GPIO13 → D0 (MISO), GPIO14 → CLK, GPIO4 → D3 (CS)
> 2. Alimentazione su **3.3V**, non collegare a 5V
> 3. Formattare la SD in **FAT32** (fondamentale per le schede da 32 GB)
> 4. Usa la libreria `SD.h` integrata, nessuna installazione extra
> 5. Carica il codice, apri il monitor seriale (115200), se vedi l'elenco dei file hai finito

------

## Introduzione

Se stai lavorando a un progetto ESP32, ti sarai sicuramente imbattuto in questo problema:

> Vuoi riprodurre un audio, salvare una montagna di dati dai sensori, o caricare qualche immagine...
> e scopri che la Flash interna dell'ESP32 non basta affatto.

La soluzione più semplice è agganciare una SD card. Lo spazio passa da pochi MB a decine di GB, e la velocità di lettura/scrittura è più che sufficiente. In questa guida ti portiamo da zero a far funzionare **ESP32-S3 + modulo Micro SD card** in modalità SPI, leggendo l'elenco dei file da una SD da 32 GB.

Collegamenti fatti, codice caricato, in 30 minuti dovresti vedere i nomi dei file della tua SD nel monitor seriale.

------

## Risultato demo

![](https://img.lingflux.com/2026/04/36943c66a6d84fb669a840b29677f2f5.jpg)

L'output seriale sarà qualcosa del genere:

```
=== ESP32-S3 SD SPI Test ===
MOSI=5, MISO=13, SCK=14, CS=4
SD card mounted successfully.
SD Card Type: SDHC
SD Card Size: 30436MB
Total space: 30436MB
Used space : 512MB
Listing directory: /
  DIR : music
  FILE: readme.txt  SIZE: 128
  FILE: config.json  SIZE: 256
```


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/EOdWUtUBBMA?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


------

## Presentazione del modulo

![](https://img.lingflux.com/2026/04/6737983c1e0d23072c47461024204cb9.jpg)

Il modulo SD card è come attaccare un "lettore di schede" all'ESP32. L'ESP32 non ha uno slot SD integrato, quindi questo piccolo modulo fa da intermediario: traduce i segnali SPI dell'ESP32 nel protocollo comprensibile dalla SD card, trasformando la tua scheda in uno spazio di archiviazione esterno leggibile e scrivibile a piacere.

| Parametro                    | Descrizione                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| Protocollo di interfaccia    | Modalità SPI / modalità SDIO (qui usiamo SPI)               |
| Tipi di schede supportati    | Micro SD (SDSC / SDHC, fino a 32 GB)                        |
| Tensione di lavoro           | 3.3V (**non collegare a 5V, rischi di bruciare il modulo o la scheda**) |
| Pin disponibili              | CMD / CLK / D0 / D1 / D2 / D3 / 3.3V / GND                 |
| Pin usati in modalità SPI    | CMD (MOSI) / D0 (MISO) / CLK / D3 (CS)                      |

Perché abbiamo scelto questo modulo: compatto, pochi collegamenti (la modalità SPI usa solo 4 fili di segnale), è la soluzione più comune per espandere lo spazio di archiviazione dell'ESP32, e online si trovano tantissime risorse e guide.

------

## Lista dei componenti (BOM)

| Componente              | Quantità | Note                                         |
| ----------------------- | -------- | -------------------------------------------- |
| Scheda di sviluppo ESP32-S3 | 1    | Qualsiasi scheda S3 con GPIO va bene         |
| Modulo Micro SD card    | 1        | Con supporto modalità SPI (indicato sul retro) |
| Micro SD card           | 1        | Consigliata fino a 32 GB, formattata in FAT32 |
| Cavi jumper (Dupont)    | diversi  | Maschio-femmina, possibilmente corti         |

------

## Schema dei collegamenti completo

| Pin ESP32-S3 | Pin modulo SD | Descrizione                                            |
| ------------ | ------------- | ------------------------------------------------------ |
| 3.3V         | 3.3V          | **Solo 3.3V, non collegare a 5V**                      |
| GND          | GND           | Ground comune, obbligatorio                            |
| GPIO13       | D0            | SPI MISO: la SD card invia dati all'ESP32              |
| GPIO5        | CMD           | SPI MOSI: l'ESP32 invia dati alla SD card              |
| GPIO14       | CLK           | Clock SPI, generato dall'ESP32 (master)                |
| GPIO4        | D3            | Chip Select (CS) SPI, la SD è selezionata quando basso |
| Non collegare | D1 / D2 / CD | Non servono in modalità SPI, lasciare scollegati       |

> ⚠️ Dopo aver collegato tutto, ti consiglio di ricontrollare ogni filo con la tabella sopra: ti risparmia l'80% del tempo di debug.
> Inoltre, evita cavi Dupont troppo lunghi (max 30 cm per sicurezza). Fili troppo lunghi causano disturbi sul segnale, e le schede SD da 32 GB sono più sensibili al timing.

------

## Librerie necessarie

Non serve installare nulla!

Le librerie `SPI.h` e `SD.h` usate in questa guida sono già incluse nell'**ESP32 Arduino Core**. Se hai già installato il supporto alla scheda ESP32 nell'Arduino IDE, puoi compilare direttamente.

Se non hai ancora il pacchetto della scheda, cerca `esp32` in Arduino IDE → Strumenti → Gestore schede e installa il pacchetto di **Espressif Systems** (versione testata in questa guida: **ESP32 Arduino Core 3.0.x**).

------

## Codice completo

```cpp
#include <SPI.h>
#include <SD.h>

// Passo 1: definisci i pin SPI
static const int SD_MOSI = 5;   // Corrisponde al pin CMD del modulo SD
static const int SD_MISO = 13;  // Corrisponde al pin D0 del modulo SD
static const int SD_SCK  = 14;  // Corrisponde al pin CLK del modulo SD
static const int SD_CS   = 4;   // Corrisponde al pin D3 del modulo SD (chip select)

SPIClass spi = SPIClass(FSPI);  // Sull'ESP32-S3 usa il bus FSPI

// Elenca ricorsivamente tutti i file e le sottocartelle in una directory
void listDir(fs::FS &fs, const char * dirname, uint8_t levels) {
  Serial.printf("Elenco directory: %s\n", dirname);

  File root = fs.open(dirname);
  if (!root) {
    Serial.println("Apertura directory fallita, controlla i collegamenti o il formato della SD");
    return;
  }
  if (!root.isDirectory()) {
    Serial.println("Non è una directory");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      Serial.print("  [Cartella] ");
      Serial.println(file.name());
      if (levels) {
        listDir(fs, file.path(), levels - 1);  // Ricorsione nella sottodirectory
      }
    } else {
      Serial.print("  [File]     ");
      Serial.print(file.name());
      Serial.print("    Dimensione: ");
      Serial.print(file.size());
      Serial.println(" bytes");
    }
    file = root.openNextFile();
  }
}

// Stampa le informazioni base della SD card
void printCardInfo() {
  uint8_t cardType = SD.cardType();

  if (cardType == CARD_NONE) {
    Serial.println("Nessuna SD card rilevata, controlla collegamenti e alimentazione");
    return;
  }

  Serial.print("Tipo SD card: ");
  if      (cardType == CARD_MMC)  Serial.println("MMC");
  else if (cardType == CARD_SD)   Serial.println("SDSC");
  else if (cardType == CARD_SDHC) Serial.println("SDHC (alta capacità standard)");
  else                            Serial.println("Tipo sconosciuto");

  uint64_t cardSize   = SD.cardSize()   / (1024 * 1024);
  uint64_t totalBytes = SD.totalBytes() / (1024 * 1024);
  uint64_t usedBytes  = SD.usedBytes()  / (1024 * 1024);

  Serial.printf("Capacità SD card: %llu MB\n", cardSize);
  Serial.printf("Spazio totale: %llu MB\n",  totalBytes);
  Serial.printf("Spazio usato: %llu MB\n",  usedBytes);
}

void setup() {
  Serial.begin(115200);
  delay(1500);  // Attendi la stabilizzazione della porta seriale

  Serial.println();
  Serial.println("=== ESP32-S3 SD SPI Test ===");
  Serial.printf("MOSI=%d, MISO=%d, SCK=%d, CS=%d\n",
                SD_MOSI, SD_MISO, SD_SCK, SD_CS);

  // Passo 2: inizializza il bus SPI, specifica l'ordine dei pin: SCK, MISO, MOSI, CS
  spi.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // Passo 3: porta CS alto per evitare di selezionare la SD durante l'inizializzazione
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  // Passo 4: monta la SD card, clock iniziale 10 MHz (se instabile, scendi a 4 MHz)
  if (!SD.begin(SD_CS, spi, 10000000)) {
    Serial.println("Montaggio SD card fallito! Controlla in questo ordine:");
    Serial.println("1. Collegamenti: GPIO5→CMD / GPIO13→D0 / GPIO14→CLK / GPIO4→D3");
    Serial.println("2. Alimentazione: conferma 3.3V, non 5V");
    Serial.println("3. Formatta la SD in FAT32");
    Serial.println("4. Cambia 10000000 in 4000000, abbassa la frequenza SPI e riprova");
    return;
  }

  Serial.println("SD card montata con successo!");
  printCardInfo();

  // Passo 5: elenca la struttura dei file nella root, fino a 5 livelli
  listDir(SD, "/", 5);
}

void loop() {
  // La lettura dei file avviene solo in setup(), per ora il loop resta vuoto
  // Per polling periodico, aggiungi qui delay + listDir
}
```




### Esempi di estensione per le operazioni sui file

Una volta che il programma principale funziona, elencare i file non basta. Queste funzioni **non modificano il programma principale**: basta incollarle vicino alla funzione `listDir()` e chiamarle alla fine di `setup()` secondo le necessità. Coprono tutte le operazioni più comuni: **lettura / scrittura / append / creazione / cancellazione / rinomina**.

#### Scrivere file - Sovrascrittura e append

La modalità `FILE_WRITE` cancella il contenuto precedente e scrive da zero, mentre `FILE_APPEND` aggiunge alla fine del file. Per registrazione log e acquisizione dati sensori si usa quasi sempre la **modalità append**.

```
// === Scrivi file (sovrascrittura) ===
// Se il file non esiste viene creato, se esiste viene cancellato e riscritto
void writeFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("Scrittura file: %s\n", path);

  File file = fs.open(path, FILE_WRITE);  // Modalità FILE_WRITE: sovrascrittura
  if (!file) {
    Serial.println("Apertura file fallita (modalità scrittura)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ Scrittura riuscita");
  } else {
    Serial.println("❌ Scrittura fallita");
  }
  file.close();  // Sempre chiudere, altrimenti i dati potrebbero non essere scritti sulla scheda
}

// === Append (non sovrascrive il contenuto) ===
// Ideale per log: aggiunge una riga alla fine del file ogni volta
void appendFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("Aggiunta contenuto a: %s\n", path);

  File file = fs.open(path, FILE_APPEND);  // Modalità FILE_APPEND: append
  if (!file) {
    Serial.println("Apertura file fallita (modalità append)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ Append riuscito");
  } else {
    Serial.println("❌ Append fallito");
  }
  file.close();
}

// Esempi di chiamata (scrivi in setup() dopo listDir):
// writeFile(SD, "/hello.txt", "Hello ESP32-S3 SD!\n");
// appendFile(SD, "/hello.txt", "Questa è la seconda riga aggiunta\n");
```

💡Nota sulle prestazioni: ogni `file.close()` attiva una scrittura fisica sulla SD card; aprire e chiudere frequentemente è lento. Per log ad alta frequenza, mantieni l'istanza `File` aperta e **chiama `file.flush()` ogni N righe** per scaricare il buffer sulla scheda.

#### Leggere file - Lettura intera e riga per riga

`readFile()` è adatta per file piccoli da leggere in un colpo solo; `readFileByLine()` è ideale per elaborare CSV, file di configurazione e altri testi strutturati.

```
// === Leggi file (lettura completa, stampa byte per byte) ===
void readFile(fs::FS &fs, const char * path) {
  Serial.printf("Lettura file: %s\n", path);

  File file = fs.open(path);  // Di default è modalità FILE_READ
  if (!file) {
    Serial.println("Apertura file fallita, il file potrebbe non esistere");
    return;
  }

  Serial.print("Contenuto del file: ");
  while (file.available()) {
    Serial.write(file.read());  // Legge e stampa un byte alla volta
  }
  Serial.println();
  file.close();
}

// === Lettura riga per riga (ideale per file di configurazione, dati CSV) ===
void readFileByLine(fs::FS &fs, const char * path) {
  Serial.printf("Lettura riga per riga: %s\n", path);

  File file = fs.open(path);
  if (!file) {
    Serial.println("Apertura file fallita");
    return;
  }

  int lineNum = 1;
  while (file.available()) {
    String line = file.readStringUntil('\n');  // Legge fino al carattere di a capo
    Serial.printf("Riga %d: %s\n", lineNum++, line.c_str());
  }
  file.close();
}

// Esempi di chiamata:
// readFile(SD, "/hello.txt");
// readFileByLine(SD, "/config.txt");
```

ℹ️Nota: `file.available()` restituisce i byte rimanenti; `file.readStringUntil('\n')` legge tutto fino al carattere di a capo come `String`. Attenzione con i file grandi: non usare `String`, puoi esaurire la memoria. È più sicuro usare un buffer `char buf[128]` fisso con `file.readBytesUntil()`.

#### Creare / Cancellare / Rinominare

Creazione di cartelle, creazione di file vuoti, cancellazione file, rinomina (può anche essere usata come "spostamento").

```
// === Crea cartella ===
void createDir(fs::FS &fs, const char * path) {
  Serial.printf("Creazione cartella: %s\n", path);
  if (fs.mkdir(path)) {
    Serial.println("✅ Cartella creata con successo");
  } else {
    Serial.println("❌ Creazione fallita (potrebbe già esistere o la cartella padre non esiste)");
  }
}

// === Crea file vuoto ===
// Aprire in FILE_WRITE e chiudere subito crea un file vuoto
void createEmptyFile(fs::FS &fs, const char * path) {
  Serial.printf("Creazione file vuoto: %s\n", path);
  File file = fs.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("❌ Creazione fallita");
    return;
  }
  file.close();
  Serial.println("✅ File vuoto creato con successo");
}

// === Cancella file ===
void deleteFile(fs::FS &fs, const char * path) {
  Serial.printf("Cancellazione file: %s\n", path);
  if (fs.remove(path)) {
    Serial.println("✅ Cancellazione riuscita");
  } else {
    Serial.println("❌ Cancellazione fallita (file inesistente o problema di permessi)");
  }
}

// === Cancella cartella (deve essere vuota) ===
void removeDir(fs::FS &fs, const char * path) {
  Serial.printf("Cancellazione cartella: %s\n", path);
  if (fs.rmdir(path)) {
    Serial.println("✅ Cartella cancellata con successo");
  } else {
    Serial.println("❌ Cancellazione fallita (la cartella non è vuota o non esiste)");
  }
}

// === Rinomina / Sposta file ===
void renameFile(fs::FS &fs, const char * oldPath, const char * newPath) {
  Serial.printf("Rinomina: %s → %s\n", oldPath, newPath);
  if (fs.rename(oldPath, newPath)) {
    Serial.println("✅ Rinomina riuscita");
  } else {
    Serial.println("❌ Rinomina fallita");
  }
}

// Esempi di chiamata (esegui in ordine per una demo completa):
// createDir(SD, "/logs");
// createEmptyFile(SD, "/logs/empty.txt");
// renameFile(SD, "/logs/empty.txt", "/logs/data.txt");
// deleteFile(SD, "/logs/data.txt");
// removeDir(SD, "/logs");
```

⚠️Attenzione: `SD.rmdir()` **può cancellare solo cartelle vuote**. Per eliminare ricorsivamente un'intera directory devi prima scorrere e cancellare tutti i file al suo interno, poi cancellare la cartella. La libreria `SD.h` non ha un `rm -rf` integrato, devi scrivere la tua funzione ricorsiva.

------

### Note sul codice

**Perché CMD corrisponde a MOSI?**
In modalità SPI, i dati che l'ESP32 invia alla SD card passano dal pin CMD, quindi CMD = MOSI. È una specifica fissa del protocollo SD in modalità SPI, non è un errore di collegamento.

**Perché D0 corrisponde a MISO?**
In modalità SPI, la SD card restituisce i dati al master tramite il pin D0, quindi D0 = MISO.

**Perché D3 corrisponde a CS?**
Quando la SD card entra in modalità SPI, il pin D0 assume la funzione di Chip Select: la scheda è attiva quando il segnale è basso.

**Perché D1 e D2 non si collegano?**
Sono dedicati alla modalità SDIO a 4 bit, in modalità SPI non servono, lasciali scollegati.

**Cosa significa `SPIClass spi = SPIClass(FSPI)`?**
L'ESP32-S3 ha più bus SPI (FSPI / HSPI); qui specifichiamo manualmente FSPI per evitare conflitti con altre periferiche.

------

## Risoluzione dei problemi più comuni

Niente panico, il 90% degli errori di inizializzazione deriva da questi punti. Controllali in ordine e quasi sicuramente risolvi:

**1. Il monitor seriale si ferma su "Montaggio SD card fallito"?**
Controlla i collegamenti: GPIO5→CMD, GPIO13→D0, GPIO14→CLK, GPIO4→D3. Anche un solo filo sbagliato causa il fallimento.

**2. Collegamenti corretti ma ancora fallisce?**
Abbassa la frequenza SPI da 10 MHz a 4 MHz, modifica questa riga:

```cpp
if (!SD.begin(SD_CS, spi, 4000000)) {
```

Le schede SD da 32 GB sono più sensibili al timing, con una frequenza più bassa è più facile che funzioni. Una volta stabile, puoi aumentare gradualmente.

**3. Nessun output sulla porta seriale?**
Verifica che il baud rate sia 115200 e che il cavo USB supporti il trasferimento dati (i cavi di sola ricarica non funzionano).

**4. Il montaggio fallisce in modo intermittente?**
Problema di alimentazione. Fili troppo lunghi o contatti ossidati causano sbalzi di tensione durante l'inizializzazione della SD. Prova ad accorciare i cavi Dupont o a usarne di migliore qualità.

**5. La scheda da 32 GB non si monta, ma una da 8 GB funziona?**
Le schede da 32 GB sono solitamente SDHC e vanno formattate in FAT32 (Windows formatta le schede da 32 GB in exFAT per default, e la libreria `SD.h` dell'ESP32 non supporta exFAT). Puoi usare [SD Card Formatter](https://www.sdcard.org/downloads/formatter/) per formattare.

**6. Il montaggio riesce ma listDir non mostra nessun file?**
La SD card potrebbe essere vuota, oppure i file nella root sono tutti in cartelle nascoste. Metti un file .txt nella scheda e riprova.

------

## FAQ

**D: Il mio modulo SD card funziona a 5V, posso collegarlo all'ESP32-S3?**
R: Non è consigliato. I GPIO dell'ESP32-S3 lavorano a logica 3.3V; se il modulo non ha un convertitore di livello, collegare direttamente i segnali a un modulo a 5V può danneggiare i pin. Assicurati che il modulo supporti i 3.3V, oppure acquista un modulo con chip convertitore di livello integrato.

**D: Quale frequenza SPI è consigliata?**
R: Parti da 4000000 (4 MHz); se funziona, prova 10000000 (10 MHz). In teoria la modalità SPI delle SD card supporta fino a 25 MHz, ma la qualità dei cavi Dupont e del modulo limita il valore pratico raggiungibile.

**D: Quali GPIO dell'ESP32-S3 posso usare per la SD card?**
R: Il bus FSPI dell'ESP32-S3 supporta pin personalizzabili, quindi in teoria quasi tutti i GPIO vanno bene. Evita però GPIO0 (pin di Boot mode), GPIO45 e GPIO46 (hanno funzioni fisse). Dopo aver cambiato pin, ricordati di aggiornare le costanti `SD_MOSI / SD_MISO / SD_SCK / SD_CS` nel codice.

**D: La SD da 32 GB deve essere formattata in FAT32? Non posso usare exFAT?**
R: La libreria `SD.h` di Arduino supporta solo FAT16 e FAT32, non exFAT. Le schede fino a 32 GB formattate in FAT32 non hanno problemi. Ti consiglio di usare lo strumento SD Card Formatter, non la formattazione integrata di Windows (che imposta exFAT di default sulle schede da 32 GB).

**D: Qual è la velocità di lettura/scrittura della SD card?**
R: In modalità SPI la velocità effettiva è tra circa 500 KB/s e 2 MB/s, a seconda della frequenza di clock SPI e della classe di velocità della scheda. Se ti serve più velocità, considera la modalità SDIO a 4 bit (richiede collegamenti diversi, non trattata in questa guida).

**D: Posso montare più di una SD card contemporaneamente?**
R: Sì. Il bus SPI supporta più dispositivi: ogni scheda usa un pin CS diverso e va inizializzata con una istanza `SD` separata. Attenzione però che `SD.h` supporta una sola istanza; per più schede devi usare `SD_MMC.h` o una libreria di terze parti come SdFat.

**D: L'ESP32-S3 consuma molto CPU con questo codice?**
R: No. L'elenco dei file è un'operazione I/O una tantum che termina con `setup()`; il `loop()` è vuoto, quindi la CPU è praticamente inattiva. Se fai letture/scritture continue nel `loop()`, allora dovrai prestare attenzione alle prestazioni.

------

## Prossimi passi

Una volta consolidata la lettura di base, ecco alcune direzioni da esplorare:

- **Riprodurre MP3 dalla SD card**: con la libreria ESP32-audioI2S e un DAC I2S, leggi i file audio dalla SD e dici addio ai problemi di rete
- **Acquisizione e archiviazione dati**: scrivi i dati dei sensori in CSV con timestamp, resistenti a spegnimenti, facili da analizzare con Python
- **Schermo TFT**: leggi immagini (BMP / JPG) dalla SD card e mostrale su display, per creare una cornice digitale
- **File di configurazione**: scrivi SSID e password Wi-Fi in un `config.json` sulla SD, niente più modifica e ricompilazione del codice

------

## Riferimenti

- [Espressif ESP32-S3 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [SD Specifications Part 1: Physical Layer Simplified Specification (SD Association)](https://www.sdcard.org/downloads/pls/)
- [ESP32 Arduino Core - GitHub ufficiale](https://github.com/espressif/arduino-esp32)
- [SD Card Formatter (strumento ufficiale)](https://www.sdcard.org/downloads/formatter/)
- [Documentazione libreria Arduino SD](https://www.arduino.cc/reference/en/libraries/sd/)
