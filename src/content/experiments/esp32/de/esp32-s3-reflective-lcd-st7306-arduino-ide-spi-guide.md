---
title: "Komplettes Tutorial: ESP32-S3 treibt ein vierfarbiges reflektives LCD mit ST7306 direkt über SPI (Arduino IDE + SPI)"
boardId: esp32s3
moduleId: display/lcd42-st7306-reflective
category: esp32
date: 2026-11-17
intro: "Lass den ESP32-S3 mit der Arduino IDE und SPI ein vierfarbiges reflektives LCD mit ST7306 ansteuern: Verkabelung des 21-Pin-FPC, vollständiger Code, Anpassung der Display-Ausrichtung und Fehlersuche bei fehlendem Bild. Getestet mit Arduino IDE 2.3.8 + esp32 Core 3.3.8."
image: "https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg"
---

> Schwierigkeit: ⭐⭐☆☆☆  
> Zeitaufwand: ca. 30–60 Minuten (ohne Downloads der Entwicklungsumgebung und Hardware-Fehlersuche)  
> Testumgebung: Arduino IDE v2.3.8 + esp32 Arduino Core v3.3.8

## TL;DR: ST7306 mit dem ESP32-S3 schnell zum Laufen bringen

- Das Modul läuft nur mit 3.3V: Pin 5 und 6 des FPC beide an 3.3V, gemeinsame Masse (GND) anschließen, niemals 5V anlegen.
- Standard ist `PINSET = 1`: CS→GPIO9, RESET→GPIO10, SCLK→GPIO12, MOSI→GPIO13, RS/D/C→GPIO14; TE darf unbeschaltet bleiben.
- Installiere in der Arduino IDE `esp32 by Espressif Systems`; eine separate ST7306-Bibliothek brauchst du nicht.
- Öffne `esp32s3-st7306-bringup.ino` aus dem Projektverzeichnis und wähle das Board passend zu deinem ESP32-S3 (hier: `ESP32S3 Dev Module`). Zeigt der Serielle Monitor keine Logs, prüfe zuerst `USB CDC On Boot`.
- SPI läuft standardmäßig in Modus 0 mit 20MHz, das logische Bild ist 400×300 im Querformat. Bei fehlendem Bild: erst den Strom trennen und gemeinsame Masse, FPC-Orientierung und RS-Pin prüfen, dann unter Spannung 3.3V messen und bei hellem Licht beobachten. Hilft das nicht, senke `SPI_HZ` auf 10MHz.

## Vorwort: Den ST7306 zuerst mit der Arduino IDE in Betrieb nehmen

Dieses 4,2-Zoll-Display nutzt den ST7306-Controller und empfängt Befehle und Framebuffer-Daten über SPI. Es ist ein reflektives TFT LCD (ohne Hintergrundbeleuchtung, im Umgebungslicht ablesbar) – gut erkennbar wird das Bild erst in heller Umgebung. Das Projektverzeichnis enthält zwei Programme, für ESP-IDF und für die Arduino IDE; dieser Artikel geht nur den Weg über die Arduino IDE: 21-Pin-FPC anschließen, Beispiel flashen und die 400×300-Querformat-Testseiten zum Laufen bringen. Die 20-Seiten-Demo für ESP-IDF bleibt ebenfalls im Projektverzeichnis erhalten; wer sich tiefer mit der Treiber-Kapselung und den Zeichenfunktionen beschäftigen möchte, kann sie selbst kompilieren und ausprobieren.

## Endergebnis: Die 8 Testseiten des ST7306

Wenn Verkabelung und Flashen stimmen, zeigt das Programm 8 Testseiten in einer Schleife. Normale Seiten bleiben etwa 3 Sekunden, die Seite mit dem wandernden Quadrat etwa 6 Sekunden. Öffne den Seriellen Monitor mit 115200 Baud – dort siehst du die Initialisierungs- und Seitenwechsel-Logs. Jede Seite wird während ihrer Anzeigezeit kontinuierlich neu gezeichnet. Öffnest du den Seriellen Monitor erst nach dem Hochladen, verpasst du eventuell die Start-Logs; ein Druck auf RST am Board zeigt sie erneut.

| Seite | Testinhalt | Prüfpunkt | Name im Programm |
| -: | ----------------- | -------------- | ----------------- |
|  0 | Balken in Weiß, Cyan, Rot, Schwarz | die vier Anzeigezustände | `PAGE_COLOR_BARS` |
|  1 | HELLO WORLD, Rahmen, vier Ecken | Text und Querformat-Ausrichtung | `PAGE_HELLO` |
|  2 | Zeit, Frames, FPS | kumulierte Laufzeit seit Boot, globaler Frame-Zähler, kumulierter Durchschnitts-FPS (nicht die Bildrate dieser Seite allein) | `PAGE_COUNTER` |
|  3 | Diagonalen, waagerechte und senkrechte Linien | Linien und Koordinaten-Mapping | `PAGE_DIAGONAL` |
|  4 | links/rechts pendelndes Quadrat | kontinuierlicher Refresh | `PAGE_REFRESH` |
|  5 | Schachbrettmuster | Schwarz-Weiß-Felder (je Feld 20 Pixel) | `PAGE_CHECKER` |
|  6 | waagerechte Streifen | regelmäßiges Muster | `PAGE_STRIPES` |
|  7 | CYAN-Farbtest | gesamter Bildschirm cyan (wirkt bläulich), Framebuffer-Byte `0x33` | `PAGE_CYAN` |

> Hinweis: Die Seitenlabels auf dem Display (z. B. `1: COLOR BARS`, `3: DIAGONAL`) sind fest im Code hinterlegte Strings und stimmen nicht ganz mit den Seitennummern der Tabelle überein (COLOR BARS ist Seite 0). Maßgeblich ist das `[PAGE]`-Log im Seriellen Monitor.


![](https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/Jb9UiMvgtTQ?si=IvvwAvHHZx5RICSM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## Bauteile: YDP420H005-V3 und ST7306

### Das reflektive LCD-Modul YDP420H005-V3

Das ist ein reflektives 4,2-Zoll-TFT-LCD-Modul; der native Framebuffer des Panels ist 300×400. Der ST7306-Controller ist bereits im Modul integriert, der ESP32-S3 sendet Befehle und Pixeldaten über SPI. Das Arduino-Programm dieses Projekts mappt das Display auf Anwendungsebene auf 400×300 im Querformat.

Die Firmware dieses Projekts treibt per 2-Bit-Kodierung vier Anzeigezustände an: Weiß, Cyan, Rot, Schwarz (`0x00`–`0x03`). Jeder Pixel belegt 2 Bit, Zwischen-Graustufen gibt es nicht. Übernimm nicht einfach Farben und Initialisierungsparameter anderer ST7306-Displays.

| Parameter | Modul in diesem Projekt |
| ------- | ----------------------------- |
| Modell | Osptek YDP420H005-V3 |
| Controller | Sitronix ST7306 |
| Native Auflösung | 300×400 |
| Anzeigezustände | Weiß, Cyan, Rot, Schwarz; 2 Bit/Pixel |
| Host-Schnittstelle | 4-Draht-SPI (SCLK, MOSI, CS, D/C), dazu RESET und optional TE; kein MISO/SDO auf dem FPC – nur schreiben, nicht lesen |
| Versorgung und Logikpegel des Moduls | 3.3V |
| Aktive Anzeigefläche | 63.6×84.8mm |
| Betriebstemperatur | −20 bis +70°C |

### 21-Pin-FPC-Adapterplatine

Das Display führt seine Signale über einen 21-Pin-FPC heraus. Die Adapterplatine macht diese feinen Kontakte zu Lötpads oder Stiftleisten, die sich bequem mit dem ESP32-S3 verbinden lassen; eine zusätzliche Display-Treiberschaltung brauchst du für dieses Projekt nicht.

Ich nutze die universelle Dual-FPC-Adapterplatine, die der Hersteller zusammen mit dem Display verkauft – ohne Typenaufdruck. Auf der Platine sitzen zwei Sockel: 21 Pin für 4,2 Zoll, 12 Pin für 2,9 Zoll, daneben Lötpads für `GND` und `3V3`.

Neben beiden FPC-Sockeln sind jeweils ein paar SMD-Bauteile verlötet, sehr kleine Bauformen ohne Werteaufdruck. Ich habe weder ihre Funktion noch ihre Werte überprüft.

Diese Universalplatine hat eine Stelle, an der man sich leicht falsch anschließt: Sie trägt sowohl die Beschriftung RS als auch DC. LCD_D/C dieses Moduls gehört auf den Aufdruck `RS`; die andere `DC`-Beschriftung hat mit diesem Modul nichts zu tun (ich habe nicht geprüft, zu welchem Sockel sie gehört) – schließe sie nicht an. Achte beim Kauf oder Löten der Adapterplatine außerdem auf die Richtung der FPC-Kontakte und die Pin-Nummerierung.

### Pin-Belegung: Der 21-Pin-FPC des YDP420H005-V3

Die folgende Tabelle folgt der FPC-Nummerierung des Moduls. Die Beschriftung der Adapterplatine kann abweichen; maßgeblich sind das Modul-Datenblatt und die tatsächlichen Leiterbahnen der Platine (diese Adapterplatine hat weder Typenbezeichnung noch öffentlichen Schaltplan).

| FPC-Pin | Modul-Signal | Übliche Beschriftung | Verwendung hier |
| -------: | ---------------------------------- | --------- | -------------------- |
| 1, 4, 7, 14 | GND | GND | an gemeinsame Masse |
| 2, 3 | NC | NC | nicht anschließen |
| 5, 6 | VCC(3.3V) | VCC, VCI | beide Pins an 3.3V |
| 8 | LCD_RES | RESET, RST | an GPIO10, Reset aktiv Low |
| 9 | LCD_SCLK | SCL, SCLK | an GPIO12, als SPI-Takt |
| 10 | TE | TE | kann an GPIO11; wird hier nicht gelesen, darf offen bleiben |
| 11 | LCD_SDI | SDA, MOSI | an GPIO13, als SPI MOSI |
| 12 | LCD_D/C | RS, A0 | an GPIO14, wählt Befehl oder Daten |
| 13 | LCD_CS | CS | an GPIO9, Chip Select aktiv Low |
| 15–19 | TP-VDD, TP-RST, TP-INT, TP-SDA, TP-SCL | Touch-Beschriftungen | Modul hier ohne Touch, nicht anschließen |
| 20, 21 | GND | GND | ebenfalls Masse; hier reichen 1, 4, 7, 14 (ob 20 und 21 auf der Adapterplatine damit verbunden sind, habe ich nicht einzeln durchgemessen – im Zweifel einfach mit an Masse legen) |

SCL und SDA sind hier nur die verbreiteten Bezeichnungen, die von der Adapter-Beschriftung übrig geblieben sind. Dieses Beispiel läuft über SPI: SCL entspricht dem seriellen Takt des Displays, SDA entspricht MOSI.

## BOM: Material für die ST7306-Verkabelung

| Bauteil | Spezifikation | Anzahl | Anmerkung |
| ------------ | --------------------- | -: | ---------------- |
| ESP32-S3-Board | ESP32-S3 N16R8 (16MB Flash / 8MB PSRAM) | 1 | 3.3V-GPIO |
| Display-Modul | Osptek YDP420H005-V3 | 1 | 4,2 Zoll, 21-Pin-FPC |
| FPC-Adapterplatine | universelle Dual-FPC-Platine des Herstellers, ohne Typenbezeichnung | 1 | Pin-Nummerierung und Kontaktrichtung prüfen |
| USB-Datenkabel | passend zum Anschluss des Boards | 1 | muss Datenübertragung unterstützen |
| Verbindungsleitungen | kurze Dupont-Kabel (Jumperkabel) oder Lötdrähte | einige | Je kürzer die SPI-Leitungen, desto stabiler – und desto ordentlicher der Aufbau |

## Verkabelung: ESP32-S3 und ST7306

Erst den Strom trennen, dann nach dem Standard-`PINSET = 1` verkabeln.

| FPC-Pin | Display-Signal | ESP32-S3 | Erforderlich | Hinweis |
| -------: | --------------- | -------- | ---- | --------- |
| 13 | LCD_CS / CS | GPIO9 | ja | Chip Select |
| 8 | LCD_RES / RESET | GPIO10 | ja | Hardware-Reset |
| 10 | TE | GPIO11 | optional | Beispiel liest es nicht, darf offen bleiben |
| 9 | LCD_SCLK / SCLK | GPIO12 | ja | SPI-Takt |
| 11 | LCD_SDI / MOSI | GPIO13 | ja | SPI-Datenausgang |
| 12 | LCD_D/C / RS | GPIO14 | ja | auf der Hersteller-Adapterplatine an RS |
| 5, 6 | VCC / VCI | 3.3V | ja | beide Versorgungspins anschließen |
| 1, 4, 7, 14 | GND | GND | ja | gemeinsame Masse mit dem Board |

⚠️ Versorgung und Logik des Moduls laufen mit 3.3V. Wenn das Modul stromlos ist, speise auch keine Signale über die GPIOs in es ein.

Nach dem Verkabeln zuerst **stromlos** prüfen:

1. Anhand der Maßzeichnung des Moduls Pin 1 und die Kontaktrichtung des FPC bestätigen.
2. Mit der Durchgangsprüfung des Multimeters prüfen, dass Board-GND und die GND-Pins des Displays durchverbunden sind und zwischen 3.3V und GND kein Kurzschluss besteht.
3. Die fünf Signalleitungen CS, RESET, SCLK, MOSI und RS einzeln nachprüfen.
4. Bei der Dual-FPC-Adapterplatine des Herstellers zusätzlich bestätigen, dass GPIO14 an RS liegt.
5. Auf lose Verbindungen und Kurzschlüsse prüfen.

Dann **unter Spannung** prüfen:

6. Mit dem Multimeter die Spannung an Pin 5 und 6 (oder den entsprechenden Lötpads der Adapterplatine) messen – sie sollte 3.3V betragen. Falls nicht: sofort den Strom trennen und auf Fehlersuche gehen.

Ich empfehle, die Verkabelung danach zweimal Leitung für Leitung gegenzuprüfen. Eine einzige falsch gesteckte Leitung lässt sich auch aus den seriellen Logs kaum identifizieren (die seriellen Logs dieses Beispiels spiegeln den Display-Zustand nicht wider – siehe Abschnitt Fehlersuche).
## Benötigte Bibliotheken: ESP32-S3-Unterstützung in der Arduino IDE

Für dieses Beispiel gibt es keine eigenständige ST7306-Arduino-Bibliothek. Treiber, Zeichenroutinen und Testseiten stecken alle in der `.ino`-Datei. `SPI.h` und `esp_heap_caps.h` kommen mit dem ESP32 Arduino Core – im Bibliotheksmanager musst du nichts zusätzlich suchen.

| Name | Autor bzw. Quelle | Installation | Bei mir bestätigte Version |
| ---------------------------------------------------------------- | ------------------------- | ------------------ | ------------- |
| Arduino IDE | Arduino | von der offiziellen Arduino-Website installieren | v2.3.8 |
| [esp32 Arduino Core](https://github.com/espressif/arduino-esp32) | Espressif Systems | Boardverwalter der Arduino IDE | v3.3.8 |
| [SPI](https://github.com/espressif/arduino-esp32) | im Espressif Arduino Core enthalten | wird mit dem Core installiert | mit Core v3.3.8 |
| [esp\_heap\_caps](https://github.com/espressif/arduino-esp32) | im Espressif Arduino Core enthalten | wird mit dem Core installiert | mit Core v3.3.8 |

### esp32 Arduino Core installieren

1. Öffne die Einstellungen der Arduino IDE und füge unter „Zusätzliche Boardverwalter-URLs“ hinzu:


   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
2. Öffne „Werkzeuge → Board → Boardverwalter“ und suche nach `esp32`.
3. Installiere `esp32 by Espressif Systems`. Bei mir läuft die bestätigte Version v3.3.8; ich empfehle, zum Nachbauen dieselbe Version zu wählen, um Core-Unterschiede als Fehlerquelle zu minimieren.

### Code öffnen und flashen

1. Öffne die [GitHub-Seite des Projekts](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek) und lade das gesamte Projektverzeichnis herunter – oder speichere nur den Ordner `ArduinoIDE/esp32s3-st7306-bringup`.
2. Öffne `ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino` in der Arduino IDE.
3. Prüfe, dass `PINSET` im Code auf `1` steht und `ROT180` standardmäßig `1` ist.
4. Wähle unter „Werkzeuge → Board“ dein ESP32-S3-Board (hier: `ESP32S3 Dev Module`) und dann den richtigen seriellen Port. Referenzwerte stehen im nächsten Abschnitt – du musst sie nicht Punkt für Punkt übernehmen.
5. Klicke auf „Überprüfen“, und nach erfolgreichem Durchlauf auf „Hochladen“.
6. Öffne den Seriellen Monitor mit 115200 Baud. Erscheint `Starte Testseiten-Schleife`, beobachte, ob das Display die Testseiten durchwechselt. Bei nativem USB wird der serielle Port nach dem Hochladen neu enumeriert; die Start-Logs können dann schon ausgegeben sein. Siehst du nichts, drücke einmal RST oder orientiere dich an den folgenden `[PAGE]`-Seitenwechsel-Logs. Das Display ist reflektiv – beobachte es bei hellem Licht.

### Arduino-IDE-Menüeinstellungen (Referenzwerte)

Das Folgende ist die Konfiguration, mit der es bei mir lief: Arduino IDE v2.3.8 + esp32 Core v3.3.8. Nur als Referenz gedacht: Es gibt sehr viele ESP32-S3-Board-Varianten, Flash-Chip, PSRAM und USB-Beschaltung können abweichen – blindes Kopieren führt eher zu Problemen. Die dritte Spalte sagt, welche Punkte vom Board abhängen.

| Menüpunkt | Wert hier | So bestimmst du ihn |
| --- | --- | --- |
| Board | ESP32S3 Dev Module | passend zu deinem Board wählen, Architektur muss esp32s3 sein |
| Port | /dev/cu.usbmodem1401 | den tatsächlichen Port deines Rechners wählen, Pfad nicht kopieren |
| USB CDC On Boot | Enabled | hängt davon ab, wo USB anliegt: natives USB → Enabled, onboard USB-UART-Chip → Disabled |
| CPU Frequency | 240MHz (WiFi) | Standard beibehalten, das Beispiel braucht keinen niedrigeren Takt |
| Flash Mode | QIO 80MHz | hängt vom Flash-Chip ab, QIO ist bei den meisten Modulen der Standard |
| Flash Size | 4MB (32Mb) | nicht über die tatsächliche Kapazität des Boards hinausgehen (zu groß kann den Boot verhindern); kleiner gewählt nutzt nur weniger Kapazität, ein Compilerfehler kommt erst, wenn das Programm die Partition sprengt |
| PSRAM | Disabled | das Beispiel nutzt kein PSRAM, Disabled ist am stabilsten; wer es aktiviert, muss passend zum Modul OPI/QSPI richtig wählen (das R8 des N16R8 ist meist Octal → OPI PSRAM), falsch gewählt bootet das Board eventuell nicht |
| Partition Scheme | Default 4MB with spiffs（1.2MB APP / 1.5MB SPIFFS） | Standard reicht; bei geändertem Flash Size mit anpassen |
| Upload Speed | 921600 | schlägt das Hochladen fehl, auf 115200 oder 460800 senken |
| Upload Mode | UART0 / Hardware CDC | passt zur USB-CDC-Einstellung |
| USB Mode | Hardware CDC and JTAG | hängt von der Anzahl der USB-Buchsen des Boards ab, bei Boards mit einer Buchse meist so |

Meins ist ein N16R8 mit nominell 16MB Flash plus 8MB PSRAM, aber oben steht Flash Size auf 4MB und PSRAM auf Disabled – der Großteil der Kapazität bleibt also ungenutzt. Das Beispiel braucht nur 30000 Bytes RAM als Framebuffer, und laut Compiler-Bericht belegt das Programm etwa 24% der Standard-APP-Partition; deshalb läuft diese Konfiguration. Wer die volle Kapazität nutzen will, müsste Flash Size, PSRAM und Partitionstabelle ändern – das habe ich nicht ausprobiert und wollte dir diese Stolperfalle ersparen.

Ob deine Konfiguration stimmt, musst du nicht Punkt für Punkt abgleichen: Es kompiliert, es lässt sich hochladen, der Serielle Monitor gibt Text aus und das Display zeigt ein Bild – das reicht. Bricht es irgendwo ab, gehe zum Abschnitt Fehlersuche und ordne dein Symptom zu.

## Vollständiger Code: ST7306 mit der Arduino IDE ansteuern

Unten steht die vollständige `.ino` aus Repository-Version v7.5. Gegenüber dem Repository ändert dieser Artikel nur einige Kommentare (Bedeutung von `PINSET`, Rotationsverfahren, Erläuterung der Zentrierung, FPS-Definition, Zweck von `DIAG_MODE`); die ausführbare Logik ist unverändert. Die entsprechenden Kommentare im Repository sollten sinnvollerweise nachgezogen werden. v7.4 korrigierte das Füll-Byte von `PAGE_CYAN`, v7.5 entfernte einen `0x09`-Status-Lesevorgang, der ohnehin keine Daten zurücklieferte; die übrige Logik blieb unverändert.
```cpp
/*
 * ESP32-S3 + OSPTEK 4.2" 300x400 Schwarz/Weiß/Rot/Cyan LCD (ST7306 · SPI) Test-Suite v7.5
 *
 * Änderungen in v7.5 (wirkungsloses Status-Readback entfernt):
 *   Mit esp32s3-st7306-readback-test real gemessen: bei SPI.begin(...,-1,MOSI,-1) ist MISO nicht angeschlossen,
 *   transfer() liefert konstant 0xFF, unabhängig von Registeradresse und CS-Auswahl; Datenpin als Eingang geschaltet
 *   und je einmal mit Pull-up/Pull-down gelesen: durchgehend 1 / durchgehend 0 – das Display treibt die Datenleitung während Lesebefehlen nicht.
 *   Fazit: Dieses Modul kann in der aktuellen Beschaltung keine Register zurücklesen; das alte [DIAG]-0x09-Log meldete nur fälschlich OK,
 *   der gesamte Abschnitt wurde entfernt. Ob die Verbindung steht, beurteile am Display-Bild, nicht am Seriellen Monitor.
 *
 * Änderungen in v7.4 (PAGE_CYAN-Vollbildfüllung korrigiert):
 *   Vergleich auf echter Hardware: 0x33 / 0x55 / punktweises writePoint(C_CYAN):
 *   0x33 und punktweises Schreiben zeigen beide Vollbild-Cyan (wirkt bläulich), 0x55 zeigt Streifen mit Lücken.
 *   Nach punktweisem Schreiben sind alle 30000 Bytes des Framebuffers ebenfalls 0x33, daher PAGE_CYAN auf 0x33 geändert.
 *
 * Änderungen in v7.3 (Gesamtbild zusätzlich um 180° gedreht):
 *   Bei der Live-Demo war die Bildausrichtung entgegen dem ursprünglichen Mapping, das Gesamtbild musste um 180° gedreht werden.
 *   Vor dem Software-Mapping in writePoint eine Punktspiegelung der logischen Koordinaten am Zentrum eingefügt:
 *     x -> LCD_W-1-x, y -> LCD_H-1-y
 *   Äquivalent zu rx = 299 - y; ry = x;  per ROT180-Makro schaltbar, auf 0 gesetzt zurück zur v7.1-Ausrichtung.
 *
 * Änderungen in v7.1 (Querformat-Anpassung - Software-Rotation, Ausrichtung korrigiert):
 *   Das Panel ist physisch im Hochformat 300x400 verdrahtet, der Nutzer stellt es quer auf, Blickwinkel 400x300.
 *   Software-Rotation: writePoint mappt logische Querformat-Koordinaten auf den Hochformat-Framebuffer.
 *   Mapping-Formel (korrigiert in v7.1): rx = y; ry = 399 - x;
 *   v7 nutzte rx=299-y, ry=x (im Uhrzeigersinn), das Diagnose-Quadrat erschien rechts unten – Ausrichtung falsch.
 *   v7.1 auf gegen den Uhrzeigersinn geändert: Das Quadrat soll links oben erscheinen.
 * v7.2: DIAG_MODE deaktiviert, vollständige 8-Seiten-Test-Schleife wiederhergestellt.
 *
 * Zentrale Fixes in v4:
 *   1) pinMode(LCD_CS/RS, OUTPUT) ergänzt: digitalWrite ist darunter nur gpio_set_level(),
 *      schaltet nicht automatisch auf Ausgang; ESP32-Pins sind standardmäßig Eingänge, schwebende CS/D-C führten dazu,
 *      dass das Display keine gültige Befehls-/Daten-Timing-Sequenz erhielt. Das war die wahre Ursache des fehlenden Bildes in den Vorversionen.
 *   2) Pin-Definitionen konsistent mit board_config.h (BOARD_PINSET 1), Verkabelung unverändert:
 *      CS=9  RST=10  CLK=12  MOSI=13  RS(D/C)=14
 *   3) SPI-Takt 20MHz
 *   4) Die Schritte ergänzt, die im IDF-Projekt in app_main nach initialize() folgen:
 *      High_Power_Mode / display_on / display_Inversion(false) / clearDisplay
 *   5) Farb-Mapping konsistent mit IDF board_color.h:
 *      C_WHITE=0x00  C_CYAN=0x01  C_RED=0x02  C_BLACK=0x03
 *      (bit0=Cyan, bit1=Rot, beide Bits gesetzt=Schwarz)
 *
 * v5: 8 Testseiten ergänzt (je Seite 3 Sekunden, Refresh-Seite 6 Sekunden):
 *   0 COLOR_BARS  Vierfarben-Balken (Weiß/Cyan/Rot/Schwarz)
 *   1 HELLO       HELLO WORLD + Eckmarkierungen + Rahmen
 *   2 COUNTER     Zeit / Frames / FPS
 *   3 DIAGONAL    Diagonalen + waagerechte/senkrechte Linien
 *   4 REFRESH     Refresh-Test (wanderndes Quadrat)
 *   5 CHECKER     Schachbrettmuster
 *   6 STRIPES     waagerechte Streifen
 *   7 CYAN        Vollbild-Cyan
 */

#include <SPI.h>
#include <esp_heap_caps.h>

// ---------------- Pin-Konfiguration ----------------
#define PINSET 1  // 1=Standard-Verkabelung (GPIO9/10/12/13/14, hier verwendet)  0=Alternative (GPIO38–42)

#if PINSET == 1
  // Pins exakt identisch mit board_config.h (BOARD_PINSET 1) des IDF-Projekts, Verkabelung muss nicht geändert werden
  #define LCD_CS   9
  #define LCD_RST  10
  #define LCD_CLK  12
  #define LCD_MOSI 13
  #define LCD_RS   14   // D/C, Beschriftung RS
#else
  #define LCD_CS   38
  #define LCD_RST  41
  #define LCD_CLK  39
  #define LCD_MOSI 42
  #define LCD_RS   40
#endif

// ---------------- Display-Parameter ----------------
// Logische Auflösung: Querformat 400x300 (Panel physisch im Hochformat 300x400 verdrahtet, Software-Rotation durch writePoint(), MV-Bit nicht verwendet)
#define LCD_W      400
#define LCD_H      300
// Hochformat-Framebuffer-Parameter (unverändert)
#define LCD_PIVOT_W  300   // physische Breite
#define LCD_PIVOT_H  400   // physische Höhe
#define LCD_ROW_B    (LCD_PIVOT_W / 2)          // 150 Bytes pro Zeile
#define BUF_LEN      (LCD_ROW_B * LCD_PIVOT_H / 2)  // 30000 Bytes
#define CHUNK        1500

// Farb-Mapping konsistent mit IDF board_color.h
#define C_WHITE  0x00
#define C_CYAN   0x01
#define C_RED    0x02
#define C_BLACK  0x03

// Bleibt das Display dunkel, 20000000 auf 10000000 senken und erneut versuchen
#define SPI_HZ  20000000

static uint8_t *fb = nullptr;

// ---------------- SPI-Basisschicht (CS voll manuell)----------------
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

// Hier stand früher ein lcd_read_reg(), das per SPI.transfer() das 0x09-Statusregister las.
// Grund für die Entfernung in v7.5 (real gemessen, keine Vermutung):
//   1) Der zweite Parameter von SPI.begin(LCD_CLK, -1, LCD_MOSI, -1) ist MISO; -1 heißt nicht angeschlossen,
//      die Peripherie hat keinen Eingangspin zum Abtasten, transfer() liefert konstant 0xFF.
//   2) Mit beliebigem Register 0x04 / 0x0A / 0xDA / 0xA5 oder CS dauerhaft auf High,
//      das Display also gar nicht ausgewählt: Readback bleibt 0xFF – dieser Wert hat nichts mit dem Display zu tun.
//   3) Halb-duplex gelesen (MOSI-Pin als Eingang, Takt manuell erzeugt): interner Pull-up liefert durchgehend 1,
//      interner Pull-down durchgehend 0 – das Display treibt die Datenleitung während Lesebefehlen nicht, kein Readback möglich.
// Dieses Modul hat in der aktuellen Beschaltung also keinen nutzbaren Verbindungs-Selbsttest. Ob die Verkabelung stimmt, zeigt allein das Display-Bild.

// ---------------- Initialisierungssequenz (Befehl für Befehl identisch mit IDF)----------------
static void st7306_init(void) {
  // Zentraler Fix: CS / RS / RST müssen explizit als Ausgänge konfiguriert werden.
  // digitalWrite ist darunter nur gpio_set_level() und schaltet nicht automatisch auf Ausgang;
  // ESP32-Pins sind standardmäßig Eingänge; ohne pinMode bleiben CS und D/C durchgehend schwebend, das Display erhält keine gültige Timing-Sequenz.
  pinMode(LCD_CS,  OUTPUT);
  pinMode(LCD_RS,  OUTPUT);
  pinMode(LCD_RST, OUTPUT);
  digitalWrite(LCD_CS, HIGH);   // CS im Idle auf High
  digitalWrite(LCD_RS, HIGH);
  digitalWrite(LCD_RST, HIGH); delay(10);
  digitalWrite(LCD_RST, LOW);  delay(10);
  digitalWrite(LCD_RST, HIGH); delay(10);

  // Letzter Parameter -1: CS wird vollständig manuell per digitalWrite gesteuert
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

  // ---- Schritte, die IDF app_main nach initialize() zusätzlich aufruft ----
  lcd_cmd(0x38); delay(300);                         // HPM-Sequenz von High_Power_Mode()
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);
  lcd_cmd(0xC9); lcd_param(0x00);
  delay(20);
  // display_on(true) / display_Inversion(false) wurden oben bereits als 0x29/0x20 gesendet
  // clearDisplay() entspricht dem Nullen des Framebuffers, erledigt durch das memset vor dem Refresh

  SPI.endTransaction();
}

// ---------------- Display-Refresh (blockweise Übertragung)----------------
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

// ---------------- Pixel-Operationen ----------------
// Logische Koordinaten: Querformat 400x300
// Hochformat-Framebuffer 300(Spalten) x 400(Zeilen), Software-Rotations-Mapping:
//   Querformat-x (0~399, links nach rechts) -> Hochformat-Zeile ry = 399 - x (links/rechts gespiegelt)
//   Querformat-y (0~299, oben nach unten) -> Hochformat-Spalte rx = y
// Die Bit-Segmente werden über die Parität der physischen Hochformat-Koordinaten rx/ry berechnet.
//
// ROT180: dreht das Gesamtbild zusätzlich um 180° (bei verkehrt eingebautem Panel / entgegengesetzter Demo-Aufstellung).
//   Vorgehen: erst Punktspiegelung der logischen Koordinaten x -> 399-x, y -> 299-y, dann obiges Mapping anwenden,
//   vereinfacht äquivalent zu: rx = 299 - y; ry = x;
#define ROT180 1   // 1 = um 180° gedreht (aktuell); 0 = zurück zur ursprünglichen v7.1-Ausrichtung

static void writePoint(uint16_t x, uint16_t y, uint16_t data) {
  if (x >= LCD_W || y >= LCD_H) return;
#if ROT180
  x = LCD_W - 1 - x;       // logisches x gespiegelt
  y = LCD_H - 1 - y;       // logisches y gespiegelt
#endif
  uint16_t rx = y;         // Hochformat-Spalte
  uint16_t ry = 399 - x;   // Hochformat-Zeile (gespiegelt)
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

// ---------------- 5x7-Bitmap-Font (portiert aus IDF board_ui_draw.cc)----------------
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

// Großbuchstaben A-Z (5x7)
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
        rows = s_font_upper[c - 'a'];   // Großbuchstaben-Bitmap wiederverwenden
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

// ---------------- Testseiten ----------------
enum TestPage {
    PAGE_COLOR_BARS = 0,   // Vierfarben-Balken (Weiß/Cyan/Rot/Schwarz)
    PAGE_HELLO,            // Hello World + Eckmarkierungen + Rahmen
    PAGE_COUNTER,          // Sekunden / Frame-Zähler
    PAGE_DIAGONAL,         // Diagonalen + waagerechte/senkrechte Linien
    PAGE_REFRESH,          // Refresh-Test (wanderndes Quadrat)
    PAGE_CHECKER,          // Schachbrettmuster
    PAGE_STRIPES,          // waagerechte Streifen
    PAGE_CYAN,             // Vollbild-Cyan
    kTotalPages
};

static void draw_corner_marks(uint16_t color) {
    const int L = 30, T = 4;  // Armlänge, Armdicke
    // links oben
    fillRect(4, 4, L, T, color);  fillRect(4, 4, T, L, color);
    // rechts oben
    fillRect(LCD_W - 4 - L, 4, L, T, color);  fillRect(LCD_W - 4 - T, 4, T, L, color);
    // links unten
    fillRect(4, LCD_H - 4 - T, L, T, color);  fillRect(4, LCD_H - 4 - L, T, L, color);
    // rechts unten
    fillRect(LCD_W - 4 - L, LCD_H - 4 - T, L, T, color);
    fillRect(LCD_W - 4 - T, LCD_H - 4 - L, T, L, color);
}

static void draw_border(uint16_t color) {
    fillRect(0, 0, LCD_W, 2, color);
    fillRect(0, LCD_H - 2, LCD_W, 2, color);
    fillRect(0, 0, 2, LCD_H, color);
    fillRect(LCD_W - 2, 0, 2, LCD_H, color);
}

// Zeichnet eine Gerade in beliebiger Richtung (Bresenham)
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
    memset(fb, 0x00, BUF_LEN);   // standardmäßig ganz weiß

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
        // "HELLO WORLD": 11 Zeichen * scale5 * 6px = 330px breit, zentriert x=(400-330)/2=35
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
        draw_text(115, 80, buf, 5, C_BLACK);        // 240 breit; x=115 manuell justiert, nicht exakt zentriert
        snprintf(buf, sizeof(buf), "FRAME: %lu", (unsigned long)frame);
        draw_text(140, 160, buf, 3, C_RED);         // Breite variiert mit Stellenzahl; x=140 manuell justiert
        snprintf(buf, sizeof(buf), "FPS: %lu", (unsigned long)(frame * 1000 / max((uint32_t)1, elapsed_ms)));
        draw_text(152, 200, buf, 3, C_CYAN);        // Breite variiert mit Stellenzahl; x=152 manuell justiert; FPS = kumulierter Durchschnitt aller Seiten seit Boot
        break;
    }
    case PAGE_DIAGONAL:
        // zwei Diagonalen
        draw_line(0, 0, LCD_W - 1, LCD_H - 1, 3, C_BLACK);
        draw_line(LCD_W - 1, 0, 0, LCD_H - 1, 3, C_RED);
        // waagerechte Linie
        for (int y = 30; y < LCD_H; y += 60)
            draw_line(0, y, LCD_W - 1, y, 2, C_CYAN);
        // senkrechte Linie
        for (int x = 40; x < LCD_W; x += 80)
            draw_line(x, 0, x, LCD_H - 1, 2, C_BLACK);
        draw_text(10, 10, "3: DIAGONAL", 2, C_BLACK);
        break;
    case PAGE_REFRESH: {
        // Quadrat pendelt links/rechts, Bewegungsflüssigkeit beobachten
        int period = LCD_W - 60;
        int x = (int)((frame * 8) % (period * 2));
        if (x > period) x = period * 2 - x;
        fillRect(x + 10, 130, 40, 40, C_BLACK);     // vertikal zentriert y=(300-40)/2
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
        memset(fb, 0x33, BUF_LEN);   // 0x33 = jeder kombinierte Pixel 01 -> Vollbild-Cyan
        draw_text(85, 130, "CYAN FULL", 5, C_BLACK);   // 270 breit; x=85 manuell justiert, nicht exakt zentriert
        break;
    default:
        break;
    }

    st7306_flush();
}

// ---------------- Arduino-Einstieg ----------------

// Diagnosemodus: bei true wird nur ein schwarzes 50x50-Quadrat bei logisch (50,50) gezeichnet,
// um Mapping und Ausrichtung von writePoint zu prüfen (bleibt das Display komplett dunkel, hilft das nicht – erst Verkabelung und Versorgung prüfen).
// Worauf zu achten ist:
//   1. Das Quadrat ist quadratisch (kein Rechteck/Fragment) -> Pixel-Mapping-Proportion korrekt
//   2. Das Quadrat liegt im linken oberen Viertel der Querformat-Ansicht -> Ausrichtung korrekt
//   3. Ist alles verdreht -> zuerst das ROT180-Makro ändern; hilft das nicht, die MX/MY-Bits von MADCTL(0x36) in Betracht ziehen
#define DIAG_MODE  false

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println();
    Serial.println("=== ST7306 test suite v7.5 (ROT180) ===");

    fb = (uint8_t *)heap_caps_malloc(BUF_LEN, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!fb) fb = (uint8_t *)malloc(BUF_LEN);
    if (!fb) { Serial.println("[ERR] Framebuffer-Allokierung fehlgeschlagen"); while (1) delay(100); }
    Serial.printf("[OK] Framebuffer %d Bytes @%p\n", BUF_LEN, fb);
    memset(fb, 0x00, BUF_LEN);

    Serial.println("[..] Initialisiere ST7306 ...");
    st7306_init();

    // Hier wurde früher einmal das 0x09-Statusregister gelesen und OK / Verbindung ausgefallen ausgegeben.
    // In v7.5 entfernt: MISO ist nicht angeschlossen, der Readback-Wert ist konstant 0xFF, unabhängig vom Display-Zustand – nur Fehlalarme.
    // Ob die Verbindung steht, zeigt allein, ob das Display ein normales Bild ausgibt.

    if (DIAG_MODE) {
        Serial.println("[DIAG] Zeichne 50x50-Quadrat bei (50,50), Display beobachten...");
        fillRect(50, 50, 50, 50, C_BLACK);
        st7306_flush();
    } else {
        Serial.println("[OK] Starte Testseiten-Schleife");
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


### Code-Erläuterung: ST7306-Initialisierung, Framebuffer und Rotation

`PINSET` legt fest, welche GPIO-Gruppe verwendet wird. Die Verkabelung in diesem Artikel entspricht `PINSET = 1`; im Quellcode ist außerdem die alternative Pin-Gruppe für `PINSET = 0` erhalten. Wer die Gruppe wechselt, muss die Verkabelung mit ändern. `PINSET` ist nur ein Schalter zwischen zwei Pin-Gruppen und hat nichts damit zu tun, ob eine Adapterplatine benutzt wird; weil es für meine Verkabelung bequemer war, habe ich eine zusätzliche Anschlusskonfiguration ergänzt – das ist `PINSET = 1`.

`st7306_init()` setzt zuerst CS, RS und RST auf Ausgang und führt dann den Hardware-Reset und die ST7306-Initialisierung aus. `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` legt SCLK und MOSI fest, CS steuert der Code manuell; für MISO wird `-1` übergeben, denn das FPC dieses Moduls hat kein MISO/SDO – nur schreiben, nicht lesen. Deshalb gibt es hier keinen Readback-Selbsttest. Die Übertragung nutzt `SPI_MODE0`, der Takt wird über `SPI_HZ` auf 20MHz gesetzt.

Die Framebuffer-Größe lässt sich direkt ausrechnen: 2 Bit pro Pixel, ein Byte trägt 2×2, also 4 Pixel. Damit ergeben 300×400 Pixel 150 Bytes pro Zeile und 200 Zeilen (jede Zeile entspricht 2 Pixelzeilen): `150 × 200 = 30000` Bytes. Beim Start reserviert das Programm mit `heap_caps_malloc()` DMA-fähigen Speicher; schlägt das fehl, fällt es auf normales `malloc()` zurück.

`writePoint()` rechnet die logischen 400×300-Querformat-Koordinaten in die nativen 300×400-Framebuffer-Koordinaten um. Standardmäßig führt `ROT180 = 1` zusätzlich eine Punktspiegelung am Zentrum aus. Wer die Anzeigeausrichtung ändern will, fasst deshalb zuerst dieses Makro an – nicht `LCD_W` und `LCD_H`.

`st7306_flush()` sendet jedes Mal den kompletten Framebuffer, in Blöcken von je 1500 Bytes. `loop()` zeichnet die aktuelle Seite kontinuierlich neu; normale Seiten wechseln nach etwa 3 Sekunden, `PAGE_REFRESH` nach etwa 6 Sekunden. Zeit und FPS auf der Zählerseite sind kumulierte Werte seit dem Boot, keine Daten einer einzelnen Seite.

Die ESP-IDF-Version verteilt den Treiber auf `main/st7306_color4.cpp`, `main/st73xx_ui.c` und `main/color4_demo.c` und hat mehr Seiten. Diesen Teil überlasse ich dir zum Selbststudium anhand des README im Repository; die ESP-IDF-Build-Schritte behandelt dieser Artikel nicht.

## Fehlersuche: ST7306 ohne Bild, Ausrichtung und Farben

### Hochladen erfolgreich, aber das Display verändert sich überhaupt nicht

Symptom: Der Serielle Monitor läuft schon, das Display bleibt unverändert.

Ursache: Versorgung, gemeinsame Masse, FPC-Orientierung, falsch angeschlossenes RS/DC oder instabile SPI-Signale können alle dazu führen, dass die Initialisierungsbefehle das Display nicht korrekt erreichen. Ein reflektives Display hat keine Hintergrundbeleuchtung – bei zu dunkler Umgebung sieht es ebenfalls wie „kein Bild“ aus.

Lösung: Erst stromlos die gemeinsame Masse und die FPC-Kontaktrichtung prüfen, dann unter Spannung messen, ob Pin 5 und 6 auf 3.3V liegen (siehe Prüfschritte weiter oben). Auf der Hersteller-Adapterplatine gehört GPIO14 an RS. Bei hellem Licht aus einem anderen Winkel beobachten. Ist all das in Ordnung, ändere `SPI_HZ` von `20000000` auf `10000000`, kürze die SCLK- und MOSI-Leitungen und lade erneut hoch.

### Ältere Versionen (v7.4 und früher): Seriell wird OK ausgegeben, das Display bleibt dunkel

Symptom: Seriell erscheint `[DIAG] ST7306 0x09 = 0xFF OK`, aber auf dem Display ist kein Bild.

Ursache: Diese Logzeile spiegelt den Display-Zustand nicht wider. Laut FPC-Pin-Tabelle oben hat dieses Modul kein MISO/SDO, `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` weist MISO keinen Pin zu, und `SPI.transfer()` liefert konstant `0xFF` – unabhängig davon, welches Register gelesen wird oder ob CS ausgewählt ist (ich habe `0x04`, `0x0A`, `0xDA`, `0xA5` durchprobiert und CS dauerhaft auf High gezogen – gleiches Ergebnis). Beim manuellen Lesen mit dem MOSI-Pin als Eingang ergaben Pull-ups durchgehend Einsen und Pull-downs durchgehend Nullen – auch das zeigt, dass das Display während Lesebefehlen die Datenleitung nicht treibt.

Lösung: Auf v7.5 aktualisieren – diese Zeile wurde entfernt. Die seriellen Logs von v7.5 spiegeln den Display-Zustand nicht wider; ob die Verbindung steht, beurteilst du allein daran, ob das Display ein Bild zeigt. Die Fehlersuche geht zurück auf Versorgung, gemeinsame Masse, FPC-Orientierung und RS-Pin.

### ST7306 läuft mal, mal nicht: Bildstörungen oder bei jedem Einschalten ein anderes Ergebnis

Symptom: Manchmal funktioniert die Anzeige, manchmal gibt es Bildstörungen, oder nach erneutem Einschalten ist das Ergebnis anders.

Ursache: Zu lange SPI-Leitungen oder schlechter Kontakt der gemeinsamen Masse lassen Daten während der Übertragung verfälschen; je länger die Leitungen und je höher der Takt, desto eher gehen Bytes verloren (das ist eine Erfahrungseinschätzung, ich habe keine quantitativen Tests gemacht).

Lösung: Kürze die Leitungen zuerst auf unter 10cm und stelle sicher, dass GND über mindestens zwei Leitungen verbunden ist und nicht nur über einen einzelnen dünnen Draht läuft. Senke dann `SPI_HZ` von 20MHz auf 10MHz; läuft es stabil, kannst du wieder hochgehen. Streiche oder ändere nicht vorschnell Initialisierungsbefehle.

### Die Querformat-Ausrichtung des ST7306 ist verdreht

Symptom: Text oder Muster sind um 180° gedreht, die Proportionen der Grafik sind aber normal.

Ursache: Der aktuelle Code nutzt standardmäßig `ROT180 = 1`; deine Aufstellrichtung ist möglicherweise entgegengesetzt zum Beispiel.

Lösung: Schau nach dem Hochladen auf die HELLO-WORLD-Seite: Steht der Text richtig, ändere nichts. Ist das ganze Bild um 180° auf dem Kopf, ändere `#define ROT180 1` zu `#define ROT180 0` und lade erneut hoch. Willst du Ausrichtung und Koordinaten separat prüfen, setze `DIAG_MODE` auf `true`; das Programm zeichnet dann nur ein schwarzes 50×50-Quadrat. Bei korrekter Ausrichtung ist es ein Quadrat und liegt im linken oberen Bildbereich. Dieser Modus dient nur der Prüfung von Ausrichtung und Mapping – bleibt das Display komplett dunkel, hilft er nicht.

### Proportionen oder Position der ST7306-Anzeige sind falsch

Symptom: Das Quadrat ist verzerrt, Muster zerfallen oder die Position entspricht nicht der Erwartung.

Ursache: Tritt meist auf, nachdem `LCD_W`, `LCD_H`, Framebuffer-Layout-Makros oder `writePoint()` geändert wurden, oder wenn der Code auf einem anderen ST7306-Modul läuft; mit unverändertem v7.5 sollte das auf diesem Modul nicht passieren. Die logischen 400×300-Koordinaten werden über `writePoint()` auf den nativen 300×400-Framebuffer gemappt – das lässt sich nicht durch Ändern der Auflösungs-Makros lösen.

Lösung: Behalte `LCD_W = 400` und `LCD_H = 300` bei, aktiviere zuerst `DIAG_MODE` und prüfe das Quadrat, dann gleiche `rx`, `ry` und die Bit-Ebenen-Berechnung in `writePoint()` ab.

### Die Farben des ST7306 weichen von der Erwartung ab

Symptom: Rot, Cyan oder Füllmuster entsprechen nicht der Erwartung.

Ursache: Dieses Modul kennt nur die vier Zustände Weiß, Cyan, Rot, Schwarz; die beiden Farb-Bits liegen innerhalb eines Bytes verschachtelt. Andere ST7306-Module können Farben anders implementieren.

Lösung: Lass zuerst die Vierfarben-Balkenseite laufen und bestätige die vier Grundzustände, dann prüfe das Farbschreiben in `writePoint()`. Seit v7.4 ist das Füll-Byte von `PAGE_CYAN` auf `0x33` geändert; siehst du mit einer alten Version Streifen mit Lücken, aktualisiere den Code oder ändere nur diese eine Stelle.

### Arduino IDE meldet, dass `esp_heap_caps.h` nicht gefunden wird

Symptom: Beim Kompilieren wird ein fehlendes Header-File gemeldet.

Ursache: Das gewählte Board oder der Core ist falsch. Dieses Header-File gehört zum ESP32 Arduino Core, nicht zu einer separaten Drittanbieter-Bibliothek.

Lösung: Prüfe, dass `esp32 by Espressif Systems` installiert ist, und wähle im Board-Menü einen ESP32-S3 – nicht Arduino Uno oder eine andere Architektur. Ist der Core beschädigt, notiere die aktuelle Version, installiere ihn neu und wähle dann Board und Port erneut.

### Nach dem Hochladen keine seriellen Logs vom ESP32-S3

Symptom: Auf dem Display sind eventuell schon Seiten zu sehen, der Serielle Monitor bleibt aber leer.

Ursache: Baudrate, serielles Gerät oder USB-CDC-Konfiguration passen nicht zusammen, oder der Port ist von einem anderen Programm belegt.

Lösung: Stelle die Baudrate auf 115200 und schließe andere Monitore, die den Port belegen. Gleiche dann mit den Menüwerten dieses Beispiels ab: `USB CDC On Boot = Enabled`, `USB Mode = Hardware CDC and JTAG`, das serielle Gerät sieht aus wie `/dev/cu.usbmodem1401` (unter Windows ein COM-Port). Läuft dein Board über einen onboard USB-UART-Chip statt über natives USB, setze `USB CDC On Boot` auf `Disabled`; `USB Mode` hat bei dieser Beschaltung praktisch keinen Einfluss, der Standardwert reicht.

## FAQ: Häufige Fragen zum Ansteuern des ST7306 mit dem ESP32-S3

**F: Kann der ESP32-S3 den ST7306 auch über andere Pins ansteuern?**  
A: Ja – ändere im `.ino` unter dem Zweig `PINSET = 1` die Defines `LCD_CS`, `LCD_RST`, `LCD_CLK`, `LCD_MOSI` und `LCD_RS`, und passe die Verkabelung entsprechend an. Ob ein bestimmter GPIO nutzbar ist, hängt von der Herausführung und der Boot-Konfiguration des Boards ab; ich habe das nicht für jedes Board verifiziert. Auf dem N16R8 sind zum Beispiel GPIO35–37 vom Octal PSRAM belegt – bei aktiviertem PSRAM meiden. Der Quellcode bietet unter `PINSET = 0` außerdem die Alternativgruppe CS=38, RESET=41, SCLK=39, MOSI=42, RS=40.

**F: Lässt sich der SPI-Takt des ST7306 ändern?**  
A: Das Beispiel nutzt standardmäßig `SPI_HZ = 20000000`, also 20MHz. Bei instabiler Kommunikation stelle zuerst auf `10000000` um. Die Projektunterlagen halten fest, dass das ST7306-Datenblatt v0.1 eine minimale Schreib-Taktperiode von 30ns angibt, umgerechnet etwa 33.3MHz; beim realen Modul kommen Leiterbahnen und Adapterplatine dazu. Die stabile Obergrenze dieser Platine habe ich nicht ermittelt.

**F: Darf das YDP420H005-V3 mit 5V versorgt werden?**  
A: Nein. Pin 5 und 6 des Modul-FPC liegen an 3.3V, auch die Logik läuft mit 3.3V. Beide Versorgungspins müssen angeschlossen sein, Board und Modul brauchen gemeinsame Masse. Ist das Modul stromlos, speise keine GPIO-Signale mehr ein.

**F: Wie viel RAM belegt dieses ST7306-Beispiel, und wie viele FPS schafft es?**  
A: Der komplette Framebuffer umfasst 30000 Bytes; dazu kommen Bitmap-Font, lokale Variablen und der laufende Speicherbedarf des Arduino Core selbst. Bei jedem Refresh werden die vollen 30000 Bytes gesendet; bei 20MHz ergibt allein die SPI-Nutzlast eine theoretische Übertragungszeit von etwa 12ms, ohne Zeichen- und Befehls-Overhead. Die tatsächlichen FPS habe ich nicht aufgezeichnet. Die Zählerseite zeigt den kumulierten Durchschnitt über alle Seiten seit dem Boot, nicht die Bildrate einer einzelnen Seite; auch das Zeichnen selbst (pixelweises Aufrufen von `writePoint()`) kostet Zeit, die reale Framezeit liegt also über 12ms.

**F: Funktioniert ein anderes Display mit ST7306 direkt mit diesem Code?**  
A: Nicht garantiert. Dieses Beispiel ist auf den 21-Pin-FPC, die Initialisierungssequenz, den 300×400-Framebuffer und die aktuellen vier Anzeigezustände des YDP420H005-V3 zugeschnitten. Andere Module können bei Versorgung, Adressierung, Farben oder Initialisierungsparametern abweichen – gleiche zuerst mit deren Datenblatt ab.

**F: Der ST7306 ist verkabelt, zeigt aber nichts – wo zuerst suchen?**  
A: Erst stromlos gemeinsame Masse, FPC-Orientierung und die fünf erforderlichen Signalleitungen prüfen und bestätigen, dass GPIO14 auf der Hersteller-Adapterplatine an RS liegt; dann unter Spannung 3.3V messen und bei hellem Licht beobachten. Bleibt das Bild aus, senke SPI auf 10MHz. `DIAG_MODE` dient nur der Prüfung von Ausrichtung und Mapping; bleibt das Display komplett dunkel, bringt er wenig.

**F: Müssen TE und MISO des ST7306 angeschlossen werden?**  
A: TE ist ein Frame-Synchronisationsausgang; dieses Beispiel liest ihn nicht, er darf unbeschaltet bleiben. Zum Schreiben aufs Display wird nur MOSI gebraucht, und der FPC hat auch kein MISO/SDO – deshalb gibt es hier keinen Register-Readback-Selbsttest. In älteren Beispielversionen lieferte `lcd_read_reg(0x09)` konstant `0xFF`, unabhängig vom Display-Zustand; v7.5 hat das entfernt, Details im Abschnitt Fehlersuche.

**F: Kann ich dieses ST7306-Display mit ESP-IDF betreiben?**  
A: Das Projektverzeichnis (`Handbook/ESP-IDF/420-…`) ist selbst ein ESP-IDF-Projekt; laut Entwicklungsnotizen wurde mit ESP-IDF v6.0.2 ein Build ohne Warnungen erreicht, inklusive 20-Seiten-Demo und Zeichenfunktionen. Ich habe diesen Build nicht erneut ausgeführt, und dieser Artikel ist kein ESP-IDF-Tutorial – du kannst ihn anhand des README im Repository selbst erkunden.

## Weiterführende Ideen: Auf dem ST7306-Beispiel aufbauen

- Ersetze den 5×7-Bitmap-Font in `draw_text()` durch eine eigene Punktmatrix-Schrift und baue ein vierfarbiges Statusschild.
- Ergänze die bestehenden Seiten um eine Strategie für partielle Inhaltsupdates und miss Refresh-Zeit und Anzeigeeffekt real.
- Schließe das TE-Signal an, untersuche, wie sich der Refresh-Zeitpunkt damit planen lässt, und beobachte die Änderungen auf der Bewegungsseite.
- Lies die 20-Seiten-Demo für ESP-IDF parallel zur Arduino-Version und übernehme die Zeichenfunktionen, die du brauchst, in deine eigene Anwendung.

## Referenzen: ESP32-S3, ST7306 und Arduino

- [LingShunLAB-Projektseite](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek): Quelle für Verkabelung, Code und Dokumentation dieses Artikels.
- [Arduino-IDE-Beispielcode v7.5](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino): die vollständige `.ino`.
- [YDP420H005-V3 Modul-Datenblatt](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/docs/YDP420H005-V3.pdf): Modulparameter, Maßzeichnung und FPC-Definition.
- [Offizielle Sitronix-ST7306-Produktliste](https://www.sitronix.com.tw/en/products/industrial-display-driver-ic/ultra-low-power-tft-driver-ic/): Sitronix-Produktseite der Ultra-Low-Power-TFT-Treiber-ICs.
- [ST7306-Controller-Handbuch v0.1 (vom Modulhersteller bereitgestellt)](https://admin.osptek.com/uploads/ST_7306_V0_1_c30c3541a3.pdf): Schnittstelle, Register, Framebuffer und Timings; eine Kopie liegt auch im `docs/`-Ordner des Repositorys.
- [Osptek-Original-Beispielcode](https://gitee.com/osptek/display-rlcd-4.2inch-300x400/tree/main/examples): zugehörige Display-Beispiele des Herstellers.
- [Offizielle Espressif-ESP32-S3-Produktseite](https://www.espressif.com/en/products/socs/esp32-s3) und [offizielles Datenblatt](https://documentation.espressif.com/esp32-s3_datasheet_en.html): Unterlagen zum Host-Chip.
- [esp32 Arduino Core auf GitHub](https://github.com/espressif/arduino-esp32) und [offizielle Installationsdokumentation](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html): Board-Support-Paket und Installationsweg.
