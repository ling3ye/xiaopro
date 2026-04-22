---
title: "ESP32-S3 + PCM5102A spielt MP3 ab｜I2S-Verkabelung + Arduino-Code Tutorial"
boardId: esp32s3
moduleId: audio/pcm5102a
category: esp32
date: 2026-04-22
intro: "Verbinde den ESP32-S3 über I2S mit einem PCM5102A DAC-Modul und streame MP3 über Wi-Fi mit der ESP32-audioI2S-Bibliothek. Unter 10 Kabel, unter 50 Zeilen Code — anfängerfreundlich."
image: "https://img.lingflux.com/2026/04/0c35d50bc32e0bd67636e15a21d5e2ed.png"
---

# ESP32-S3 + PCM5102A MP3-Player — Vollständiges I2S-Verkabelungs- und Arduino-Tutorial

> **Kurzusammenfassung：** Verwende ein ESP32-S3-Entwicklungsboard, verbinde es über I2S mit einem PCM5102A DAC-Modul und streame MP3 über Wi-Fi mit der ESP32-audioI2S-Bibliothek. Unter 10 Kabel, unter 50 Zeilen Code — perfekt für Einsteiger.

---

## TL;DR（Schnellstart）

Nur die Kernaussagen？ Hier sind sie：

1. Verbinde ESP32-S3 GPIO17（BCK）、GPIO16（LCK）、GPIO15（DIN） mit BCK、LCK、DIN des PCM5102A
2. Verbinde den XMT-Pin des PCM5102A mit 3.3V（oder setze ihn per GPIO7 im Code auf HIGH）. Alle anderen Steuerpins（FMT/SCL/DMP/FLT）auf GND
3. Installiere die Arduino-Bibliothek：ESP32-audioI2S（von schreibfaul1）
4. Kopiere den Code, ändere die Wi-Fi-Daten, flashe und los geht's

---

**ESP32-S3 + PCM5102A** ist eine der preiswertesten Kombinationen für DIY-Audioprojekte. Der ESP32-S3 übernimmt die Wi-Fi-Verbindung, den MP3-Download und die Audio-Decodierung, während der PCM5102A das digitale Signal in analoges Audio für Kopfhörer oder Lautsprecher umwandelt. Der gesamte Aufbau kostet nur wenige Euro, die Klangqualität übertrifft jedoch gleichpreisige Alternativen bei weitem.

Alle Verkabelungen und Codes in diesem Tutorial wurden getestet und verifiziert — Schritt für Schritt zum gleichen Ergebnis.

---

## Endergebnis

Nach dem Einschalten verbindet sich der ESP32-S3 automatisch mit dem Wi-Fi, ruft einen MP3-Audiostrom aus dem Netzwerk ab und gibt ihn über den PCM5102A wieder. Kopfhörer oder Lautsprecher spielen den Ton ab. Keine Tasten, kein Touchscreen — Einschalten und zuhören.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/CjGkTj7KaQo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## PCM5102A-Audiomodul Übersicht

### Was ist der PCM5102A？

Der **PCM5102A** ist ein hochleistungsfähiger Stereo-**DAC-Chip**（Digital-Analog-Wandler）von Texas Instruments.

Dein ESP32-S3 gibt **digitale Audiosignale** aus（I2S-formatierte Nullen und Einsen）, aber Kopfhörer und Lautsprecher verstehen nur **analoge Spannungssignale**（Wellenformen, die sich über die Zeit ändern）. Der PCM5102A fungiert als "Dolmetscher" zwischen beiden und wandelt digitale Daten in Echtzeit in analoge Audiosignale um.

### PCM5102A Hauptmerkmale

| Parameter | Spezifikation |
|---|---|
| Schnittstelle | I2S（nativ ESP32-kompatibel） |
| Abtastraten | 8kHz – 384kHz |
| Dynamikumfang | 112dB（feine Details, extrem niedriges Grundrauschen） |
| Betriebsspannung | 3.3V Einzelversorgung（perfekt für ESP32） |
| MCLK | Integrierter PLL, kein externer Master-Takt erforderlich |
| Ausgang | Integrierter Differenzial-Treiber, hohe Störsicherheit |

**Warum den PCM5102A wählen？** Günstig, einfach zu verwenden, läuft mit 3.3V, braucht keinen externen Takt und ein Dynamikumfang von 112dB ist für MCU-basiertes Audio beeindruckend — der beliebteste I2S-DAC-Begleiter für ESP32-Projekte.

### PCM5102A Pin-Funktionen

| Pin | Funktion | ESP32-S3 Verbindung | Hinweise |
|---|---|---|---|
| **3.3V** | Logik-Versorgung（3.3V） | ESP32 3.3V | Erforderlich |
| **GND** | Masse | ESP32 GND | Erforderlich — gemeinsame Masse ist entscheidend |
| **BCK** | I2S-Bit-Takt | GPIO17 | Kern-I2S-Signal |
| **LCK** | I2S-Links/Rechts-Kanal-Takt（LRCK/WS） | GPIO16 | Kern-I2S-Signal |
| **DIN** | I2S-Audiodateneingang | GPIO15 | Kern-I2S-Signal |
| **XMT** | Soft-Mute-Steuerung（HIGH = normale Ausgabe） | 3.3V oder GPIO7 | **Muss auf HIGH sein, sonst kein Ton** |
| **FMT** | Audioformat-Wahl（LOW = I2S） | GND | Einfach auf Masse |
| **SCL** | System-Master-Takt（interner PLL verfügbar） | GND | Einfach auf Masse |
| **DMP** | De-Emphasis-Steuerung | GND | Einfach auf Masse |
| **FLT** | Digitalfilter-Modus | GND | Einfach auf Masse |

> **Faustregel：** Alle vier Steuerpins — FMT, SCL, DMP, FLT — auf GND verbinden. Einfach, stabil, fehlerfrei.

---

## Stückliste（BOM）

| Bauteil | Menge | Hinweise |
|---|---|---|
| ESP32-S3-Entwicklungsboard | × 1 | Jedes ESP32-S3 DevKit geeignet |
| PCM5102A-Audiomodul | × 1 | Weit verfügbar, ca. 1–2€ |
| Jumper-Kabel（Dupont） | Mehrere | Männlich-männlich / männlich-weiblich je nach Board |
| Kopfhörer oder kleiner Lautsprecher | × 1 | 3.5mm-Kopfhörer oder passiver Lautsprecher |

---

## Verkabelung：ESP32-S3 zu PCM5102A

Die Verkabelung ist der fehleranfälligste Teil dieses Projekts. Nach dem Anschließen **jede Verbindung mit der Tabelle abgleichen** — das spart 80% der Fehlerbehebungszeit.

| ESP32-S3 GPIO | PCM5102A Pin | Beschreibung |
|---|---|---|
| 3.3V | **3.3V** | Logik-Versorgung |
| GND | **GND** | Masse（muss gemeinsam sein！） |
| **GPIO 17** | **BCK** | I2S-Bit-Takt |
| **GPIO 16** | **LCK** | I2S-Links/Rechts-Takt（LRCK/WS） |
| **GPIO 15** | **DIN** | I2S-Audiodateneingang |
| **GPIO 7** | **XMT** | Soft-Mute（im Code auf HIGH; oder direkt mit 3.3V verbinden） |
| GND | FMT / SCL / DMP / FLT | Format- und Steuerpins（alle auf GND） |

---

## Erforderliche Arduino-Bibliothek

Im Arduino IDE Bibliotheksverwalter suchen und installieren：

**ESP32-audioI2S**（von schreibfaul1）

Alternativ ZIP von GitHub herunterladen und manuell installieren：[https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

---

## Vollständiger Arduino-Code（Getestet und verifiziert）

Dieser Code wurde auf ESP32-S3 + PCM5102A getestet. Kopieren, Wi-Fi-Daten anpassen und hochladen：

```cpp
// Weitere Experimente auf www.lingflux.com

#include <Arduino.h>
#include <WiFi.h>
#include <Audio.h>

// ── Wi-Fi-Einstellungen（anpassen）─────────────────────────────
const char* ssid     = "DEIN_WIFI_NAME";
const char* password = "DEIN_WIFI_PASSWORT";

// ── I2S-Pin-Definitionen ──────────────────────────────────────
#define I2S_BCLK  17   // BCK：Bit-Takt
#define I2S_LRCK  16   // LCK：Links/Rechts-Kanal-Takt
#define I2S_DOUT  15   // DIN：Audiodaten
#define XMT        7   // XMT：Soft-Mute-Steuerung（HIGH = normale Ausgabe）

Audio audio;

void setup() {
  Serial.begin(115200);

  // Schritt 1：XMT auf HIGH setzen, um PCM5102A zu entstummen
  pinMode(XMT, OUTPUT);
  digitalWrite(XMT, HIGH);

  // Schritt 2：Mit Wi-Fi verbinden
  WiFi.begin(ssid, password);
  Serial.print("Verbinde mit Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi verbunden！");

  // Schritt 3：I2S-Pins und Lautstärke konfigurieren
  audio.setPinout(I2S_BCLK, I2S_LRCK, I2S_DOUT);
  audio.setVolume(18);  // Lautstärkebereich 0–21, 18 ist ein angenehmer Standard

  // Schritt 4：Online-MP3 streamen
  audio.connecttohost("https://pixabay.com/music/download/id-219731.mp3");
  Serial.println("Audiowiedergabe gestartet...");
}

void loop() {
  // Fortlaufend aufrufen, um Decodierung und Wiedergabe aufrechtzuerhalten（nicht entfernen！）
  audio.loop();
}

// Debug-Callback：gibt Bibliotheksstatus aus（nützlich zur Fehlerbehebung）
void audio_info(const char *info) {
  Serial.print("Audio Info: ");
  Serial.println(info);
}
```

**Code-Erklärung：**

- `audio.setVolume(18)`：Lautstärkebereich 0–21. 18 ist ein guter Standard — nach Bedarf anpassen.
- `connecttohost()`：Unterstützt HTTP/HTTPS-Direct-MP3-Links. Bei abgelaufener URL einfach eine andere verwenden.
- `audio.loop()`：Muss kontinuierlich in `loop()` aufgerufen werden — steuert Audio-Decodierung und -Ausgabe. Nicht entfernen und keine blockierenden Operationen hinzufügen.

---

## Häufig gestellte Fragen und Fehlerbehebung（FAQ）

### Q：Nach dem Verkabeln und Einschalten kein Ton. Was soll ich prüfen？

Das häufigste Problem für Einsteiger. In dieser Reihenfolge prüfen — löst 90% der Fälle：

**① Gemeinsame Masse prüfen** GND von ESP32-S3 und PCM5102A müssen mit einem Jumper-Kabel verbunden sein. Ohne gemeinsame Masse kann das Signal den Stromkreis nicht schließen — kein Ton. Das wird von Einsteigern am häufigsten übersehen.

**② I2S-Pins prüfen** Wenn eine der drei I2S-Leitungen（BCK, LCK, DIN）vertauscht oder invertiert ist, gibt es entweder völlige Stille oder durchgehendes Rauschen. Mit dieser Tabelle abgleichen：

| ESP32-S3 GPIO | PCM5102A Pin |
| ------------- | ------------- |
| GPIO 17       | BCK           |
| GPIO 16       | LCK           |
| GPIO 15       | DIN           |

**③ Prüfen, ob XMT auf HIGH ist** XMT ist der Soft-Mute-Pin des PCM5102A：LOW = stummgeschaltet, HIGH = normale Wiedergabe. Wird er vergessen, bleibt der Chip dauerhaft stummgeschaltet. Lösung：`digitalWrite(7, HIGH)` im Code hinzufügen oder XMT direkt mit 3.3V verbinden.

------

### Q：Bei der Wiedergabe höre ich leises Klicken oder Knacksen. Woran liegt das？

Eines der meistdiskutierten Themen in ESP32-Audioprojekten. Mehrere Ursachen möglich — nach Wahrscheinlichkeit sortiert：

**Ursache 1：I2S-Buffer-Underrun**（am wahrscheinlichsten）

Wenn der ESP32 MP3 dekodiert oder Daten aus dem Netzwerk/SD-Karte liest, können plötzliche CPU-Lastspitzen, zu kleine Buffer oder zu langsame Dekodierung zu kurzen Datenunterbrechungen führen. Wenn der PCM5102A kontinuierliche Takte empfängt, die Datenleitung aber kurzzeitig Null wird, entstehen wiederholbare Knackser.

Lösung：`dma_buf_count`（8–16 empfohlen）und `dma_buf_len`（256–1024）in `i2s_config` erhöhen. Bei Verwendung von `xTaskCreate` die Priorität der Audio-Aufgabe über Wi-Fi und andere Hintergrundaufgaben setzen.

**Ursache 2：Abtastrate- oder Bittiefen-Konflikt**

Wenn die Abtastrate der Audiodatei（44.1kHz / 48kHz）nicht mit der ESP32-I2S-Konfiguration übereinstimmt oder 24-Bit mit 16-Bit gemischt wird.

Lösung：Alle Audiodateien auf 44.1kHz, 16-Bit, Stereo vereinheitlichen（ffmpeg für Stapelverarbeitung）. `bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT` explizit setzen.

**Ursache 3：Hardware-Signalintegritätsprobleme**

Zu lange I2S-Kabel ohne Serien-Dämpfungswiderstände können Signal-Ringing verursachen. Wi-Fi-/CPU-Aktivität des ESP32 kann ebenfalls Rauschen über die gemeinsame 3.3V-Versorgung einspeisen.

Lösung：33–100Ω-Serienwiderstände auf BCK, LCK, DIN（nahe dem ESP32）. Dedizierte 10μF + 0.1μF-Entkopplungskondensatoren für den PCM5102A.

**Ursache 4：PCM5102A-internes Auto-Mute**

Wenn DIN-Daten kurzzeitig auf Null oder Low fallen, löst die intelligente Stummschaltungslogik des Chips aus und erzeugt ein leises Pop-Geräusch.

Lösung：Fade-in/Fade-out-Übergänge bei Wiedergabe-Start/Ende per Software einfügen.

**Schnelldiagnose：** Mit einer Standard-WAV-Datei（44.1kHz 16-Bit）testen, um MP3-Dekodierung zu umgehen. Wenn Knacksen an der gleichen Position bleibt, ist es wahrscheinlich ein Buffer-Problem. Dann schrittweise MP3-Dekodierung und Netzwerk-Streaming hinzufügen, um die Ursache einzugrenzen.

------

### Q：Online-Wiedergabe ruckelt oder bricht ab. Was tun？

Online-Streaming hängt von der Netzwerkqualität ab. Zuerst einen schnelleren MP3-Direct-Link testen. Wenn das Netzwerk in Ordnung ist, auf lokale Dateien von SD-Karte oder SPIFFS umsteigen.

------

### Q：Kann ich andere GPIOs für I2S verwenden？

Ja. Das I2S-Peripheriegerät des ESP32-S3 unterstützt beliebiges GPIO-Mapping — einfach die Werte von `#define I2S_BCLK`, `I2S_LRCK`, `I2S_DOUT` im Code ändern.

------

### Q：Welche Abtastraten unterstützt der PCM5102A？

Der PCM5102A unterstützt 8kHz, 16kHz, 32kHz, 44.1kHz, 48kHz, 96kHz, 192kHz und 384kHz — alle gängigen MP3-Abtastraten（typischerweise 44.1kHz）werden abgedeckt.

------

### Q：Kann ich den PCM5102A mit 5V betreiben？

Einige PCM5102A-Module mit integriertem LDO akzeptieren 5V-Eingang und regeln intern auf 3.3V herunter. Wenn dein Modul nur einen 3.3V-Pin hat（kein 5V-Pin）, verwende 3.3V. Wir empfehlen 3.3V für beste Stabilität und Logikpegel-Kompatibilität mit dem ESP32-S3.

------

### Q：Ist die CPU-Auslastung bei MP3-Wiedergabe hoch？

Die ESP32-audioI2S-Bibliothek nutzt die Dual-Core-Architektur des ESP32-S3 und führt die Audio-Dekodierung auf einem separaten Kern mit minimalen Auswirkungen auf die Hauptschleife aus. Typische CPU-Auslastung：10–30%.

------

### Q：Kann ich ein TFT-Display ansteuern und gleichzeitig Audio abspielen？

Ja. Der ESP32-S3 hat genug Leistung für gleichzeitige I2S-Audioausgabe und SPI-TFT-Anzeige. Nur sicherstellen, dass `loop()` keine langen blockierenden Operationen enthält — sie würden `audio.loop()` aushungern und zu Ruckeln oder Knacksen führen.

------

### Q：Welche Ausgangsschnittstelle hat der PCM5102A？ Kann ich einen Verstärker anschließen？

Das PCM5102A-Modul bietet normalerweise einen Standard-3.5mm-Stereo-Analogausgang für Kopfhörer oder passive Lautsprecher. Für Verstärker die LINE-OUT-Schnittstelle des Moduls verwenden — der Ausgangspegel ist besser für Verstärkereingänge geeignet und klingt sauberer.

------

### Q：ESP32-S3 vs. orig. ESP32 bei I2S-Audio — was ist der Unterschied？

Der ESP32-S3 läuft mit 240MHz Dual-Core（schneller als ursprüngliche ESP32-Varianten）, wodurch MP3-Dekodierung flüssiger mit weniger Frame-Verlusten und Knacksen ist. Außerdem hat er mehr GPIO-Ressourcen — ideal für kombinierte Audio-, Display- und Netzwerkprojekte.

---

## Referenzen

- **PCM5102A-Datenblatt（Texas Instruments）：**
  [https://www.ti.com/lit/ds/symlink/pcm5102a.pdf](https://www.ti.com/lit/ds/symlink/pcm5102a.pdf)

- **ESP32-audioI2S-Bibliothek（GitHub, von schreibfaul1）：**
  [https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

- **Espressif ESP32-S3 Technische Dokumentation：**
  [https://www.espressif.com/en/products/socs/esp32-s3](https://www.espressif.com/en/products/socs/esp32-s3)

---

*Weitere ESP32-Experimente und Tutorials auf [www.lingflux.com](http://www.lingflux.com)*
