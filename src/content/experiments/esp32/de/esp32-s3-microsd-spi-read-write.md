---
title: "ESP32-S3 Micro-SD-Kartenmodul: Vollstaendiges Tutorial (SPI-Modus + Arduino-Code)"
boardId: esp32s3
moduleId: storage/microsd-storage-board
category: esp32
date: 2026-04-30
intro: "ESP32-S3 liest und schreibt eine Micro-SD-Karte ueber den SPI-Modus, inklusive Dateilisten-Ausgabe, Lese-/Schreib-/Loesch-Operationen. Mit Verdrahtungsplan, komplett Code und Fehlerbehebung."
image: "https://img.lingflux.com/2026/04/a52d9db02d07cc13df512e06920e4603.jpg"
---

> **Kurz zusammengefasst**: ESP32-S3 liest und schreibt eine Micro-SD-Karte ueber den SPI-Modus — in 30 Minuten von der Verdrahtung bis zur Dateiliste im Serial Monitor.

# ESP32-S3 Micro-SD-Kartenmodul: Vollstaendiges Tutorial (SPI-Modus + Arduino-Code)

> Schwierigkeit: ⭐⭐☆☆☆ (mit etwas Grundkenntnissen direkt umsetzbar) Geschaetzte Dauer: 30 Minuten Getestet mit: Arduino IDE 2.3.x + ESP32 Arduino Core 3.x

------

> **TL;DR (Schnellstart):**
>
> 1. Verdrahtung: GPIO5 → CMD (MOSI), GPIO13 → D0 (MISO), GPIO14 → CLK, GPIO4 → D3 (CS)
> 2. Spannungsversorgung an **3.3V** anschliessen, nicht an 5V
> 3. SD-Karte als **FAT32** formatieren (bei 32GB-Karten besonders wichtig)
> 4. Die integrierte `SD.h`-Bibliothek nutzen — keine zusaetzliche Installation noetig
> 5. Code hochladen, Serial Monitor oeffnen (115200 Baud) — wenn die Dateiliste erscheint, hat es geklappt

------

## Einleitung

Kennst du das Problem? Du bist mitten in einem ESP32-Projekt und stellst fest:

> Du moechtest Audio abspielen, Sensordaten speichern oder ein paar Bilder hinterlegen...
> und merkst, dass der interne Flash-Speicher des ESP32 einfach nicht ausreicht.

Die einfachste Loesung: eine SD-Karte anschliessen. Der Speicherplatz erweitert sich von ein paar MB auf zig GB, und die Lese-/Schreibgeschwindigkeit reicht fuer die meisten Anwendungen voll aus. Dieser Artikel fuehrt dich Schritt fuer Schritt durch **ESP32-S3 + Micro-SD-Kartenmodul** — von null bis zur funktionierenden Dateiliste einer 32GB-SD-Karte ueber den SPI-Modus.

Verdrahten, Code hochladen, und innerhalb von 30 Minuten solltest du die Dateinamen deiner SD-Karte im Serial Monitor sehen.

------

## Demo-Ergebnis

![](https://img.lingflux.com/2026/04/36943c66a6d84fb669a840b29677f2f5.jpg)

Die Serielle Ausgabe sieht ungefaehr so aus:

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

## Modulvorstellung

![](https://img.lingflux.com/2026/04/6737983c1e0d23072c47461024204cb9.jpg)

Das SD-Kartenmodul ist quasi ein "Kartenleser" fuer den ESP32. Da der ESP32 selbst keinen SD-Kartenslot hat, fungiert dieses kleine Modul als Vermittler: Es uebersetzt die SPI-Signale des ESP32 in das Protokoll, das die SD-Karte versteht, und macht deine SD-Karte zu einem frei lesbaren/beschreibbaren externen Speicher.

| Parameter                    | Beschreibung                                                      |
| ---------------------------- | ----------------------------------------------------------------- |
| Schnittstellenprotokoll      | SPI-Modus / SDIO-Modus (hier wird SPI verwendet)                  |
| Unterstuetzte Kartentypen    | Micro SD (SDSC / SDHC, bis zu 32GB)                               |
| Betriebsspannung             | 3.3V (**nicht an 5V anschliessen — Modul oder Karte koennen zerstoert werden**) |
| Pin-Anzahl                   | CMD / CLK / D0 / D1 / D2 / D3 / 3.3V / GND                       |
| Im SPI-Modus genutzte Pins   | CMD (MOSI) / D0 (MISO) / CLK / D3 (CS)                            |

Warum dieses Modul? Kompakt, wenig Verdrahtung (SPI-Modus braucht nur 4 Signalleitungen), die haeufigste Loesung fuer externen Speicher am ESP32, und es gibt umfangreiche Dokumentation und Community-Support.

------

## BOM / Teileliste

| Bauteil                  | Menge | Hinweis                                       |
| ------------------------ | ----- | ---------------------------------------------- |
| ESP32-S3 Entwicklungsboard | 1   | Beliebiges S3-Board mit GPIO                   |
| Micro-SD-Kartenmodul     | 1     | SPI-Modus unterstuetzt (Rueckseite beschriftet) |
| Micro-SD-Karte           | 1     | Empfohlen: bis 32GB, FAT32 formatiert          |
| Jumperkabel (Dupont)     | mehrere | Male-to-Female, moeglichst kurz              |

------

## Vollstaendige Verdrahtung

| ESP32-S3 Pin | SD-Modul Pin | Beschreibung                                        |
| ------------ | ------------ | --------------------------------------------------- |
| 3.3V         | 3.3V         | **Nur 3.3V, nicht 5V**                              |
| GND          | GND          | Gemeinsame Masse, zwingend erforderlich             |
| GPIO13       | D0           | SPI MISO: SD-Karte sendet Daten an den ESP32        |
| GPIO5        | CMD          | SPI MOSI: ESP32 sendet Daten an die SD-Karte        |
| GPIO14       | CLK          | SPI-Takt, ESP32 als Master                          |
| GPIO4        | D3           | SPI Chip-Select (CS), niedriger Pegel waehlt die Karte aus |
| Nicht verbunden | D1 / D2 / CD | Im SPI-Modus nicht benötigt, einfach offen lassen |

> ⚠️ Nach dem Verdrahten jeden Pin gegen die Tabelle pruefen — das spart 80% der Fehlersuche.
> Ausserdem: Dupont-Kabel nicht zu lang (unter 30cm ist am stabilsten). Laengere Kabel fuehren zu Signalproblemen, und 32GB-Karten sind anspruchsvoller beim Timing.

------

## Benoetigte Bibliotheken

Keine zusaetzliche Installation noetig!

Die in diesem Artikel verwendeten `SPI.h` und `SD.h` sind bereits im **ESP32 Arduino Core** enthalten. Sobald das ESP32-Board-Paket in der Arduino IDE installiert ist, kann direkt kompiliert werden.

Falls das Board-Paket noch nicht installiert ist: In der Arduino IDE unter Werkzeuge → Board-Verwalter nach `esp32` suchen und das Paket von **Espressif Systems** installieren (getestete Version: **ESP32 Arduino Core 3.0.x**).

------

## Vollstaendiger Code

```cpp
#include <SPI.h>
#include <SD.h>

// Schritt 1: SPI-Pins definieren
static const int SD_MOSI = 5;   // Entspricht SD-Modul CMD
static const int SD_MISO = 13;  // Entspricht SD-Modul D0
static const int SD_SCK  = 14;  // Entspricht SD-Modul CLK
static const int SD_CS   = 4;   // Entspricht SD-Modul D3 (Chip-Select)

SPIClass spi = SPIClass(FSPI);  // FSPI-Bus auf dem ESP32-S3 verwenden

// Alle Dateien und Unterordner in einem Verzeichnis rekursiv auflisten
void listDir(fs::FS &fs, const char * dirname, uint8_t levels) {
  Serial.printf("Verzeichnis wird aufgelistet: %s\n", dirname);

  File root = fs.open(dirname);
  if (!root) {
    Serial.println("Verzeichnis konnte nicht geoeffnet werden, Verdrahtung oder SD-Kartenformat pruefen");
    return;
  }
  if (!root.isDirectory()) {
    Serial.println("Dies ist kein Verzeichnis");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      Serial.print("  [Ordner] ");
      Serial.println(file.name());
      if (levels) {
        listDir(fs, file.path(), levels - 1);  // Rekursiv in Unterordner
      }
    } else {
      Serial.print("  [Datei]   ");
      Serial.print(file.name());
      Serial.print("    Groesse: ");
      Serial.print(file.size());
      Serial.println(" bytes");
    }
    file = root.openNextFile();
  }
}

// Grundlegende SD-Karteninformationen ausgeben
void printCardInfo() {
  uint8_t cardType = SD.cardType();

  if (cardType == CARD_NONE) {
    Serial.println("Keine SD-Karte erkannt, Verdrahtung und Spannungsversorgung pruefen");
    return;
  }

  Serial.print("SD-Kartentyp: ");
  if      (cardType == CARD_MMC)  Serial.println("MMC");
  else if (cardType == CARD_SD)   Serial.println("SDSC");
  else if (cardType == CARD_SDHC) Serial.println("SDHC (Standard High Capacity)");
  else                            Serial.println("Unbekannter Typ");

  uint64_t cardSize   = SD.cardSize()   / (1024 * 1024);
  uint64_t totalBytes = SD.totalBytes() / (1024 * 1024);
  uint64_t usedBytes  = SD.usedBytes()  / (1024 * 1024);

  Serial.printf("SD-Kartenkapazitaet: %llu MB\n", cardSize);
  Serial.printf("Verfuegbarer Speicher: %llu MB\n",  totalBytes);
  Serial.printf("Belegter Speicher: %llu MB\n",  usedBytes);
}

void setup() {
  Serial.begin(115200);
  delay(1500);  // Auf Serial-Verbindung warten

  Serial.println();
  Serial.println("=== ESP32-S3 SD SPI Test ===");
  Serial.printf("MOSI=%d, MISO=%d, SCK=%d, CS=%d\n",
                SD_MOSI, SD_MISO, SD_SCK, SD_CS);

  // Schritt 2: SPI-Bus initialisieren, Pin-Reihenfolge: SCK, MISO, MOSI, CS
  spi.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // Schritt 3: CS auf HIGH ziehen, um versehentliche Auswahl der SD-Karte waehrend der Initialisierung zu vermeiden
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  // Schritt 4: SD-Karte einhaengen, initialer Takt 10MHz (bei Problemen auf 4MHz reduzieren)
  if (!SD.begin(SD_CS, spi, 10000000)) {
    Serial.println("SD-Karte konnte nicht eingebunden werden! In dieser Reihenfolge pruefen:");
    Serial.println("1. Verdrahtung GPIO5→CMD / GPIO13→D0 / GPIO14→CLK / GPIO4→D3");
    Serial.println("2. Spannungsversorgung bestaetigen: 3.3V, nicht 5V");
    Serial.println("3. SD-Karte als FAT32 formatieren");
    Serial.println("4. 10000000 auf 4000000 aendern, SPI-Frequenz reduzieren und erneut versuchen");
    return;
  }

  Serial.println("SD-Karte erfolgreich eingebunden!");
  printCardInfo();

  // Schritt 5: Dateistruktur im Wurzelverzeichnis, 5 Ebenen tief, auflisten
  listDir(SD, "/", 5);
}

void loop() {
  // Dateioperation wird nur einmal in setup() ausgefuehrt, loop bleibt vorerst leer
  // Fuer periodisches Polling: hier delay + listDir einfuegen
}
```




### Dateioperations-Erweiterungen

Wenn das Hauptprogramm laeuft, reicht eine einfache Dateiliste allein meist nicht aus. Die folgenden Funktionen **aendern nicht das Hauptprogramm** — sie koennen einfach neben der `listDir()`-Funktion eingefuegt und am Ende von `setup()` bei Bedarf aufgerufen werden. Sie decken **Lesen / Schreiben / Anhaengen / Erstellen / Loeschen / Umbenennen** ab.

#### Datei schreiben — Ueberschreiben und Anhaengen

Der Modus `FILE_WRITE` loescht den bestehenden Dateiinhalt vor dem Schreiben, `FILE_APPEND` haengt am Dateiende an. Fuer Logging und Sensordatenerfassung verwendet man fast immer den **Anhaengemodus**.

```
// === Datei schreiben (ueberschreibend) ===
// Wenn die Datei nicht existiert, wird sie erstellt; wenn sie existiert, wird der Inhalt vorher geloescht
void writeFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("Schreibe Datei: %s\n", path);

  File file = fs.open(path, FILE_WRITE);  // FILE_WRITE-Modus: ueberschreiben
  if (!file) {
    Serial.println("Datei konnte nicht geoeffnet werden (Schreibmodus)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ Schreiben erfolgreich");
  } else {
    Serial.println("❌ Schreiben fehlgeschlagen");
  }
  file.close();  // Unbedingt schliessen, sonst werden Daten moeglicherweise nicht auf die Karte geschrieben
}

// === Anhaengend schreiben (vorhandenen Inhalt nicht ueberschreiben) ===
// Ideal fuer Logging: jede Zeile wird ans Dateiende angehaengt
void appendFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("Anhaengen an: %s\n", path);

  File file = fs.open(path, FILE_APPEND);  // FILE_APPEND-Modus: anhaengen
  if (!file) {
    Serial.println("Datei konnte nicht geoeffnet werden (Anhaengemodus)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ Anhaengen erfolgreich");
  } else {
    Serial.println("❌ Anhaengen fehlgeschlagen");
  }
  file.close();
}

// Aufrufbeispiel (in setup() nach listDir einfuegen):
// writeFile(SD, "/hello.txt", "Hello ESP32-S3 SD!\n");
// appendFile(SD, "/hello.txt", "Dies ist die zweite angehaengte Zeile\n");
```

💡 **Performance-Hinweis:** Jeder Aufruf von `file.close()` loest einen physischen Schreibvorgang auf der SD-Karte aus. Haeufiges Oeffnen und Schliessen ist langsam. Bei hochfrequentem Logging empfiehlt es sich, die `File`-Instanz offen zu halten und **alle N Zeilen `file.flush()` aufzurufen**, um den Puffer auf die Karte zu schreiben.

#### Datei lesen — Komplett und Zeilenweise

`readFile()` eignet sich fuer kleine Dateien, die in einem Zug gelesen werden; `readFileByLine()` fuer strukturierte Textdateien wie CSV oder Konfigurationsdateien.

```
// === Datei lesen (komplett, byteweise ausgeben) ===
void readFile(fs::FS &fs, const char * path) {
  Serial.printf("Lese Datei: %s\n", path);

  File file = fs.open(path);  // Standard: FILE_READ-Modus
  if (!file) {
    Serial.println("Datei konnte nicht geoeffnet werden, moeglicherweise existiert sie nicht");
    return;
  }

  Serial.print("Dateiinhalt: ");
  while (file.available()) {
    Serial.write(file.read());  // Byteweise lesen und ausgeben
  }
  Serial.println();
  file.close();
}

// === Zeilenweise lesen (geeignet fuer Konfigurationsdateien, CSV-Daten) ===
void readFileByLine(fs::FS &fs, const char * path) {
  Serial.printf("Zeilenweises Lesen: %s\n", path);

  File file = fs.open(path);
  if (!file) {
    Serial.println("Datei konnte nicht geoeffnet werden");
    return;
  }

  int lineNum = 1;
  while (file.available()) {
    String line = file.readStringUntil('\n');  // Bis zum Zeilenumbruch lesen
    Serial.printf("Zeile %d: %s\n", lineNum++, line.c_str());
  }
  file.close();
}

// Aufrufbeispiel:
// readFile(SD, "/hello.txt");
// readFileByLine(SD, "/config.txt");
```

ℹ️ **Hinweis:** `file.available()` gibt die Anzahl der verbleibenden Bytes zurueck; `file.readStringUntil('\n')` liest den gesamten Inhalt bis zum Zeilenumbruch als `String`. Bei grossen Dateien sollte `String` nicht verwendet werden (Speicherplatz), sondern ein festes `char buf[128]` mit `file.readBytesUntil()` — das ist sicherer.

#### Erstellen / Loeschen / Umbenennen

Ordner erstellen/loeschen, leere Dateien erstellen, Dateien loeschen, umbenennen (funktioniert auch als "Verschieben").

```
// === Ordner erstellen ===
void createDir(fs::FS &fs, const char * path) {
  Serial.printf("Ordner erstellen: %s\n", path);
  if (fs.mkdir(path)) {
    Serial.println("✅ Ordner erfolgreich erstellt");
  } else {
    Serial.println("❌ Erstellung fehlgeschlagen (existiert moeglicherweise bereits oder uebergeordneter Ordner fehlt)");
  }
}

// === Leere Datei erstellen ===
// Einfach mit FILE_WRITE oeffnen und sofort wieder schliessen
void createEmptyFile(fs::FS &fs, const char * path) {
  Serial.printf("Leere Datei erstellen: %s\n", path);
  File file = fs.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("❌ Erstellung fehlgeschlagen");
    return;
  }
  file.close();
  Serial.println("✅ Leere Datei erfolgreich erstellt");
}

// === Datei loeschen ===
void deleteFile(fs::FS &fs, const char * path) {
  Serial.printf("Datei loeschen: %s\n", path);
  if (fs.remove(path)) {
    Serial.println("✅ Loeschvorgang erfolgreich");
  } else {
    Serial.println("❌ Loeschvorgang fehlgeschlagen (Datei existiert nicht oder Berechtigungsproblem)");
  }
}

// === Ordner loeschen (muss leer sein) ===
void removeDir(fs::FS &fs, const char * path) {
  Serial.printf("Ordner loeschen: %s\n", path);
  if (fs.rmdir(path)) {
    Serial.println("✅ Ordner erfolgreich geloescht");
  } else {
    Serial.println("❌ Loeschvorgang fehlgeschlagen (Ordner nicht leer oder existiert nicht)");
  }
}

// === Datei umbenennen / verschieben ===
void renameFile(fs::FS &fs, const char * oldPath, const char * newPath) {
  Serial.printf("Umbenennen: %s → %s\n", oldPath, newPath);
  if (fs.rename(oldPath, newPath)) {
    Serial.println("✅ Umbenennung erfolgreich");
  } else {
    Serial.println("❌ Umbenennung fehlgeschlagen");
  }
}

// Aufrufbeispiel (in dieser Reihenfolge ausfuehren fuer einen kompletten Demodurchlauf):
// createDir(SD, "/logs");
// createEmptyFile(SD, "/logs/empty.txt");
// renameFile(SD, "/logs/empty.txt", "/logs/data.txt");
// deleteFile(SD, "/logs/data.txt");
// removeDir(SD, "/logs");
```

⚠️ **Achtung:** `SD.rmdir()` **kann nur leere Ordner loeschen**. Fuer das rekursive Loeschen eines gesamten Verzeichnisses muss zunaechst alle darin enthaltenen Dateien geloescht werden, dann der Ordner selbst. Die Bibliothek `SD.h` hat kein eingebautes `rm -rf` — dafuer muss eine eigene rekursive Funktion geschrieben werden.

------

### Code-Erklaerungen

**Warum entspricht CMD dem MOSI-Pin?**
Im SPI-Modus der SD-Karte laufen die Daten vom ESP32 zur Karte ueber den CMD-Pin, daher CMD = MOSI. Das ist durch das SD-Protokoll im SPI-Modus festgelegt und kein Verdrahtungsfehler.

**Warum entspricht D0 dem MISO-Pin?**
Im SPI-Modus sendet die SD-Karte Daten zurueck an den Host ueber den D0-Pin, daher D0 = MISO.

**Warum entspricht D3 dem CS-Pin?**
Nach dem Wechsel in den SPI-Modus uebernimmt D3 die Chip-Select-Funktion. Bei niedrigem Pegel wird die Karte aktiviert.

**Warum bleiben D1 und D2 unverbunden?**
Diese Pins sind ausschliesslich fuer den 4-bit SDIO-Modus; im SPI-Modus werden sie nicht benoetigt.

**Was bedeutet `SPIClass spi = SPIClass(FSPI)`?**
Der ESP32-S3 hat mehrere SPI-Busse (FSPI / HSPI). Hier wird FSPI explizit ausgewaehlt, um Konflikte mit anderen Peripheriegeraeten zu vermeiden.

------

## Haeufige Probleme und Loesungen

Keine Panik — 90% der Initialisierungsfehler haben eine dieser Ursachen. Einfach der Reihenfolge nach pruefen:

**1. Serial-Ausgabe bleibt bei "SD-Karte konnte nicht eingebunden werden" haengen?**
Zunaechst die Verdrahtung pruefen: GPIO5→CMD, GPIO13→D0, GPIO14→CLK, GPIO4→D3. Ein einziger falscher Pin genuegt fuer einen Fehlschlag.

**2. Verdrahtung stimmt, aber es funktioniert trotzdem nicht?**
Die SPI-Frequenz von 10MHz auf 4MHz reduzieren. Diese Zeile aendern:

```cpp
if (!SD.begin(SD_CS, spi, 4000000)) {
```

32GB-Karten sind beim Timing anspruchsvoller. Mit niedrigerer Frequenz klappt es zuverlaessiger; wenn es laeuft, schrittweise erhoeen.

**3. Ueberhaupt keine Ausgabe im Serial Monitor?**
Baudrate auf 115200 pruefen und sicherstellen, dass das USB-Kabel Daten uebertragen kann (reinliche Ladekabel funktionieren nicht).

**4. Initialization klappt manchmal, manchmal nicht?**
Wahrscheinlich ein Problem mit der Spannungsversorgung. Zu lange Kabel oder schlechte Kontakte koennen Spannungsschwankungen waehrend der SD-Karten-Initialisierung verursachen. Kuerzere Dupont-Kabel verwenden oder auf bessere Qualitaet achten.

**5. 32GB-Karte schlaegt fehl, aber eine 8GB-Karte funktioniert?**
32GB-Karten sind meist im SDHC-Format und muessen als FAT32 formatiert sein (Windows formatiert 32GB-Karten standardmaessig als exFAT, was von der ESP32-Bibliothek `SD.h` nicht unterstuetzt wird). Das Tool [SD Card Formatter](https://www.sdcard.org/downloads/formatter/) zum Formatieren verwenden.

**6. Einbindung erfolgreich, aber listDir zeigt keine Dateien?**
Die SD-Karte koennte leer sein oder die Dateien befinden sich in versteckten Ordnern. Eine `.txt`-Datei auf die Karte kopieren und erneut testen.

------

## FAQ

**F: Mein SD-Kartenmodul ist fuer 5V ausgelegt — kann ich es am ESP32-S3 betreiben?**
A: Nicht empfohlen. Die GPIOs des ESP32-S3 arbeiten mit 3.3V-Logik. Wenn das Modul keinen Pegelwandler hat, koennen 5V-Signale die Pins beschaedigen. Sicherstellen, dass das Modul 3.3V unterstuetzt, oder ein Modul mit integriertem Pegelwandler verwenden.

**F: Welche SPI-Frequenz ist empfehlenswert?**
A: Mit 4000000 (4MHz) starten; wenn es stabil laeuft, 10000000 (10MHz) ausprobieren. Theoretisch unterstuetzt der SPI-Modus der SD-Karte bis zu 25MHz, aber aufgrund von Dupont-Kabellaenge und Modulqualitaet ist das in der Praxis selten erreichbar.

**F: Welche GPIOs des ESP32-S3 koennen alternativ fuer die SD-Karte verwendet werden?**
A: Der FSPI des ESP32-S3 ermoeglicht die Zuweisung benutzerdefinierter Pins. Theoretisch koennen die meisten GPIOs verwendet werden, aber GPIO0 (Boot-Mode-Pin) sowie GPIO45/GPIO46 (fest vergebene Funktionen) sollten vermieden werden. Nach dem Aendern der Pins muessen die Konstanten `SD_MOSI / SD_MISO / SD_SCK / SD_CS` im Code entsprechend angepasst werden.

**F: Muss eine 32GB-SD-Karte zwingend als FAT32 formatiert sein? Geht exFAT nicht?**
A: Die Arduino-Bibliothek `SD.h` unterstuetzt nur FAT16 und FAT32, nicht jedoch exFAT. Karten bis 32GB problemlos als FAT32 formatieren. Empfohlen wird das Tool SD Card Formatter anstelle des Windows-eigenen Formatierungsprogramms (das 32GB-Karten standardmaessig exFAT zuweist).

**F: Wie hoch ist die Lese-/Schreibgeschwindigkeit der SD-Karte?**
A: Im SPI-Modus liegt der tatsaechliche Durchsatz bei etwa 500KB/s bis 2MB/s, abhaengig von der SPI-Taktfrequenz und der Geschwindigkeitsklasse der Karte. Fuer hoehere Geschwindigkeiten kann der SDIO 4-bit-Modus verwendet werden (erfordert andere Verdrahtung, nicht Bestandteil dieses Artikels).

**F: Koennen mehrere SD-Karten gleichzeitig betrieben werden?**
A: Ja. Der SPI-Bus unterstuetzt mehrere Geraete — jede Karte bekommt einen eigenen CS-Pin und wird als separate `SD`-Instanz initialisiert. Allerdings unterstuetzt `SD.h` nur eine einzelne Instanz. Fuer mehrere Karten muss auf `SD_MMC.h` oder die Drittanbieter-Bibliothek SdFat zurueckgegriffen werden.

**F: Ist die CPU-Last hoch, wenn der ESP32-S3 diesen Code ausfuehrt?**
A: Nein. Die Dateilisten-Operation ist eine einmalige I/O-Aktion — nach `setup()` ist alles erledigt, und `loop()` bleibt leer. Erst bei kontinuierlichem Lesen/Schreiben in `loop()` muss die Performance beachtet werden.

------

## Weiterfuehrende Ideen

Wenn die grundlegende Dateiliste funktioniert, koennen diese Richtungen weiterverfolgt werden:

- **MP3-Wiedergabe von der SD-Karte**: In Kombination mit der Bibliothek ESP32-audioI2S und einem I2S DAC Audio-Dateien von der SD-Karte abspielen — kein Netzwerk noetig
- **Datenerfassung und Speicherung**: Sensordaten mit Zeitstempel in CSV-Dateien schreiben — stromausfallsicher und danach bequem mit Python analysieren
- **TFT-Display anschliessen**: Bilder (BMP/JPG) von der SD-Karte lesen und auf einem Display anzeigen — ein einfacher digitaler Bilderrahmen
- **Konfigurationsdateien lesen**: WLAN-Zugangsdaten in einer `config.json` auf der SD-Karte speichern — Code muss nicht jedes Mal angepasst und neu hochgeladen werden

------

## Referenzen

- [Espressif ESP32-S3 Datenblatt](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [SD Specifications Part 1: Physical Layer Simplified Specification (SD Association)](https://www.sdcard.org/downloads/pls/)
- [ESP32 Arduino Core auf GitHub](https://github.com/espressif/arduino-esp32)
- [SD Card Formatter Download (offizielles Formatierungstool)](https://www.sdcard.org/downloads/formatter/)
- [Arduino SD-Bibliothek Dokumentation](https://www.arduino.cc/reference/en/libraries/sd/)
