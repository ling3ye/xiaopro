---
title: "ESP32-S3 steuert WS2812-LED-Ring: Regenbogen-Rotationsfluss-Effekt – Komplettes Tutorial (Single-Wire-Protokoll + FastLED)"
boardId: esp32s3
moduleId: lighting/ws2812b-40led-ring
category: esp32
date: 2026-05-08
intro: "ESP32-S3 steuert einen WS2812-LED-Ring und erzeugt mit der FastLED-Bibliothek einen nicht-blockierenden Regenbogen-Rotationseffekt. Single-Wire-Verbindung mit nur 3 Kabeln, in 30 Minuten nachbaubar."
image: "https://img.lingflux.com/2026/05/d991a873016f98577b8ed80aefa9d67b.jpg"
---



# ESP32-S3 steuert WS2812-LED-Ring: Regenbogen-Rotationsfluss-Effekt – Komplettes Tutorial

Schwierigkeit: ⭐⭐☆☆☆ (auch für Anfänger geeignet)
Zeitaufwand: ca. 30 Minuten
Getestet mit: Arduino IDE 2.3.8 + FastLED v3.10.3 + ESP32 Arduino Core 3.3.8

---

> **TL;DR (Schnellstart):**
>
> 1. Verkabelung: WS2812-Ring `DIN` → ESP32-S3 `GPIO40`, `VCC` → 5V, `GND` → GND
> 2. Bibliothek installieren: Im Arduino Library Manager nach `FastLED` suchen (Autor: Daniel Garcia), neueste Version installieren
> 3. Bei Bedarf `NUM_LEDS` (Anzahl der LEDs) und `LED_PIN` (Pin-Nummer) im Code anpassen
> 4. Hochladen, einschalten, der Ring beginnt zu rotieren

---

## Einleitung

Bei mir lag schon lange ein WS2812-LED-Ring herum – eigentlich wollte ich warten, bis ich „mal Zeit habe". Aber da er schon ordentlich Staub angesetzt hatte, habe ich ihn hervorgeholt und gleich ein einfaches Beispiel damit gemacht.

Das Schönste an WS2812-LED-Streifen, -Ringen und -Modulen ist: Man braucht **nur ein einziges Datenkabel** – zusammen mit der Stromversorgung sind es insgesamt nur 3 Kabel. Jede LED kann einzeln angesteuert werden, dank des integrierten Treiberchips. Keine Decoder, keine Schieberegister – ein paar Zeilen Code reichen aus.

Ziel dieses Artikels: Mit einem ESP32-S3 und der FastLED-Bibliothek einen Regenbogen-Effekt erzeugen, bei dem die Farben entlang des Rings rotieren. Alles nicht-blockierend, so dass sich später problemlos weitere Funktionen erweitern lassen.

---

## Ergebnis

![](https://img.lingflux.com/2026/05/b9b24692bd3fe29d05bafd71a1a6ee89.jpg)

Alle 40 LEDs leuchten gleichzeitig, die Farben sind als Regenbogen-Gradient verteilt und der Farbton rotiert ununterbrochen – es sieht aus wie ein fließender farbiger Lichtring.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/kA8XlvHq3_I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## Komponentenbeschreibung

### WS2812-LED-Ring

Der WS2812-LED-Ring funktioniert wie ein „Stille Post"-System: Man sendet alle Daten an die erste LED. Diese behält ihre eigene Farbinformation und gibt den Rest an die nächste weiter. Die nächste LED behält wieder ihre Farbe und reicht den Rest weiter, und so weiter. Die gesamte Kette ist in Reihe geschaltet – das nennt man auch Daisy-Chain. Mit einem einzigen Datenkabel kann man so Dutzende (sogar Hunderte) LEDs einzeln in unterschiedlichen Farben ansteuern.

```
Beispiel: Datenbefehlsfolge: [Rot, Blau, Grün, Gelb]
         ↓
   LED 1 nimmt „Rot" und leuchtet rot → gibt [Blau, Grün, Gelb] weiter
         ↓
   LED 2 nimmt „Blau" und leuchtet blau → gibt [Grün, Gelb] weiter
         ↓
   LED 3 nimmt „Grün" und leuchtet grün → gibt [Gelb] weiter
   ...
   ...
   ...
```

| Parameter | Wert |
| --- | --- |
| Versorgungsspannung | 5V |
| Maximalstrom pro LED | 60mA (R/G/B je 20mA bei voller Helligkeit) |
| Logikpegel des Datensignals | Kompatibel mit 3.3V-Logik (kein Level-Shifter nötig) |
| Kommunikationsprotokoll | Single-Wire NZR (Non-Return-to-Zero) |
| Farbreihenfolge | GRB |
| Bildwiederholrate | 400Hz / 800Hz (je nach Modell) |

> Warum diese Wahl: Extrem einfache Verkabelung (ein Datenkabel), native FastLED-Unterstützung, umfangreiche Community-Ressourcen, anfängerfreundlich.



**Wie viele LEDs kann ein einzelner GPIO (eine Datenleitung) bei WS2812B theoretisch und praktisch ansteuern?**

### Theoretisches Limit

**Es gibt praktisch kein striktes Limit** (mehrere Tausend bis Zehntausende sind möglich). WS2812B verwendet die **Daisy-Chain**-Methode: der DO-Ausgang jeder LED ist mit dem DI-Eingang der nächsten verbunden. Die Daten werden von LED zu LED weitergegeben. Solange der Mikrocontroller einen vollständigen Datenframe rechtzeitig senden kann, ist die theoretische Kaskadierung unbegrenzt.

### Empfohlene maximale Anzahl (eine Datenleitung)

| Anwendungsbereich | Empfohlene Maximalanzahl | Hinweis |
| --- | --- | --- |
| **Flüssige Animationen / Spiele** (hohe Framerate) | **300~600 LEDs** | Empfohlener Bereich, Framerate bleibt über 30~60fps |
| **Normale Effekte / Ambiente-Beleuchtung** | **800~1200 LEDs** | Gängiger oberer Grenzwert, ca. 15~30fps |
| **Extremfälle** | **2000~4000+ LEDs** | Möglich, aber Framerate sehr niedrig (<10fps), Signalprobleme wahrscheinlicher |
| **Professionelle / Großprojekte** | Tausende bis Zehntausende | Erfordert **mehrere parallele Datenleitungen** (ESP32 eignet sich hervorragend dafür) |

### Wichtigste limitierende Faktoren

1. **Bildwiederholrate (entscheidend)** Jede LED benötigt ca. 30μs Daten (24 Bit).
   - 1000 LEDs ≈ 30ms → ca. 33fps
   - 2000 LEDs ≈ 60ms → ca. 16fps (deutlich ruckelig)
2. **Signalqualität**
   - Bei zu langen Datenleitungen (>10~15 Meter) oder zu vielen LEDs können die hinteren LEDs Flimmern, Farbfehler oder Ausfälle zeigen.
   - Empfehlung: Etwa alle 500~1000 LEDs einen **Signalverstärker** (74HCT245 / SN74AHCT125 etc.) oder ein **Repeater-Modul** einsetzen.
3. **Stromversorgung** (kein Limit der Datenleitung, aber unbedingt zu lösen)
   - Jede LED zieht bei voll weißem Licht max. ca. 60mA (durchschnittlich meist 20~30mA).
   - **Mehrere Einspeisepunkte** sind zwingend nötig (alle 1~2 Meter), da es sonst durch Spannungsabfall am Ende zu Dimmung / Farbverfälschung kommt.

###

---

## Stückliste (BOM)

| Komponente | Spezifikation | Menge |
| --- | --- | --- |
| ESP32-S3 Entwicklungsboard | Beliebige Version mit GPIO | ×1 |
| WS2812-LED-Ring | 40 LEDs (oder andere Anzahl, eine Zeile im Code anpassen) | ×1 |
| Jumper-Kabel | Male-to-Female / Male-to-Male, je nach Bedarf | nach Bedarf |

---

## Pin-Belegung

Der WS2812-LED-Ring hat normalerweise folgende 4 Pins:

| Pin-Beschriftung | Beschreibung |
| --- | --- |
| VCC / 5V | positive Versorgungsspannung, an 5V anschließen |
| GND | Masse, an GND anschließen |
| DIN / Data In | Dateneingang, an ESP32-S3 GPIO anschließen |
| DOUT / Data Out | Datenausgang, wird beim Kaskadieren mehrerer Ringe verwendet, in diesem Projekt nicht verbunden |

> Hinweis: Einige LED-Ringe sind nur mit `+`, `-` und `Data` beschriftet. Die Zuordnung ist dieselbe – nicht verwirren lassen.

---

## Verkabelung

| WS2812-LED-Ring Pin | ESP32-S3 |
| --- | --- |
| VCC / 5V | 5V (5V-Pin des Boards oder externes 5V-Netzteil) |
| GND | GND |
| DIN | GPIO40 |

> Tipp: **Nach dem Anschließen alle Verbindungen noch einmal überprüfen** – das spart 80% der Fehlersuchzeit. Besonders darauf achten, dass VCC nicht an 3.3V angeschlossen wird. Die LEDs leuchten zwar, aber die Farben sind verfälscht und die Helligkeit reduziert – das kostet nur unnötig Debugging-Zeit.

---

## Benötigte Bibliothek

In der Arduino IDE den Library Manager öffnen und nach **`FastLED`** suchen. Autor: **Daniel Garcia**. Neueste Version installieren (in diesem Artikel getestet: v3.10.3).

Installationspfad: `Werkzeuge` → `Bibliotheken verwalten` → nach `FastLED` suchen → Installieren

---

## Vollständiger Code

```cpp
/*
 * ESP32-S3 WS2812 Regenbogen-Rotationsring
 * FastLED nicht-blockierende Version – blockiert loop() nicht, erleichtert spätere Erweiterungen wie Taster, Sensoren usw.
 */

#include <FastLED.h>

// ===== Hier an die eigene Konfiguration anpassen =====
#define LED_PIN     40       // GPIO-Pin für die Datenleitung
#define NUM_LEDS    40       // Anzahl der LEDs auf dem Ring
#define BRIGHTNESS  204      // Globale Helligkeit, Bereich 0 (aus) bis 255 (maximal)
// ====================================

#define LED_TYPE    WS2812B
#define COLOR_ORDER GRB      // WS2812 verwendet GRB-Farbreihenfolge, nicht RGB – nicht vertauschen

CRGB leds[NUM_LEDS];         // Farbarray für jede LED

uint8_t gHue = 0;            // Start-Farbton für den Regenbogen, wird pro Frame erhöht, um den Rotationseffekt zu erzeugen

void setup() {
    // Schritt 1: Dem Hardware-Setup 1 Sekunde Zeit geben, um Einschaltstromspitzen zu vermeiden
    delay(1000);

    // Schritt 2: FastLED initialisieren – Pin, LED-Typ und Anzahl festlegen
    FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS)
           .setCorrection(TypicalLEDStrip);  // Automatische Farbtemperatur-Korrektur, Weiß sieht weißer aus

    // Schritt 3: Globale Helligkeit setzen (einfacher als RGB-Werte einzeln zu ändern)
    FastLED.setBrightness(BRIGHTNESS);
}

void loop() {
    // Schritt 4: Den gesamten Ring mit einem Regenbogen-Gradienten füllen
    // gHue ist der Start-Farbton, 255/NUM_LEDS ist der Farbton-Abstand zwischen den LEDs
    fill_rainbow(leds, NUM_LEDS, gHue, 255 / NUM_LEDS);

    // Schritt 5: Farbdaten an den Ring senden
    FastLED.show();

    // Schritt 6: Alle 10ms Farbton um +1 erhöhen, je kleiner der Wert, desto schneller die Rotation
    EVERY_N_MILLISECONDS(10) {
        gHue++;
    }
}
```

### Code-Erklärung

| Zeile | Funktion |
| --- | --- |
| `fill_rainbow(...)` | Integrierte FastLED-Funktion, berechnet automatisch Regenbogen-Gradient und füllt das Array – keine manuelle HSV-Berechnung nötig |
| `FastLED.show()` | Sendet die Farbdaten aus dem `leds[]`-Array über GPIO40 an den Ring. Vor diesem Aufruf ändert sich nichts an den LEDs |
| `EVERY_N_MILLISECONDS(10)` | Integrierter nicht-blockierender Timer von FastLED, entspricht „führe alle 10ms aus", blockiert `loop()` nicht |
| `gHue++` | Erhöht den Farbton um +1, der Start-Farbton von `fill_rainbow` verschiebt sich im nächsten Frame – das erzeugt den Rotationseffekt |
| `setCorrection(TypicalLEDStrip)` | Automatische Farbtemperatur-Korrektur der LEDs, damit gemischtes Weiß nicht grünstichig wird, ideal für WS2812 |

> Rotationsgeschwindigkeit ändern: Den Wert in `EVERY_N_MILLISECONDS(10)` anpassen. **10 → 5** = doppelt so schnell, **10 → 20** = halb so schnell.

---

## Fehlerbehebung

Keine Panik – 90% der Probleme haben eine dieser Ursachen:

**Problem 1: Nach dem Einschalten leuchten keine LEDs**

- Prüfen, ob DIN mit `GPIO40` verbunden ist (wie im Code unter `LED_PIN` definiert)
- Sicherstellen, dass VCC an **5V** und nicht an 3.3V angeschlossen ist
- GND-Verbindung prüfen – ohne gemeinsame Masse kann das Datensignal nicht übertragen werden

**Problem 2: Nur einige LEDs leuchten oder die Farben flackern wild**

- Wahrscheinlich unzureichende Stromversorgung. 40 LEDs bei voll weißem Licht ziehen bis zu 2.4A – der USB-Anschluss mit 500mA reicht nicht aus. Empfehlung: Externes 5V-Netzteil mit mindestens 2A verwenden

**Problem 3: Die Farben stimmen nicht – Rot wird als Grün angezeigt**

- `COLOR_ORDER` ist falsch definiert. WS2812B verwendet GRB-Reihenfolge. Im Code `GRB` durch `RGB` ersetzen (oder umgekehrt) und testen

**Problem 4: Compiler-Fehler `FastLED.h: No such file`**

- Die Bibliothek wurde nicht installiert. Library Manager öffnen, sicherstellen dass FastLED als „Installiert" angezeigt wird, dann Arduino IDE neu starten

**Problem 5: Hochladen funktioniert, aber die LEDs bewegen sich nicht**

- Prüfen, ob `NUM_LEDS` mit der tatsächlichen LED-Anzahl des Rings übereinstimmt. Eine falsche Anzahl führt zu Anzeigeproblemen

---

## FAQ

**F: Was ist der Unterschied zwischen WS2812 und WS2812B? Ist der Code kompatibel?**
A: WS2812B ist die weiterentwickelte Version von WS2812 mit kleinerem Gehäuse und leicht angepasstem Timing. FastLED unterstützt beide. `LED_TYPE` einfach auf `WS2812B` setzen – keine weiteren Code-Änderungen nötig.

**F: Mein LED-Ring hat nur 12/16/24 LEDs – was muss ich im Code ändern?**
A: Nur eine Zeile ändern: `#define NUM_LEDS 24` – die tatsächliche LED-Anzahl eintragen, alles andere bleibt gleich.

**F: Kann GPIO40 durch einen anderen Pin ersetzt werden?**
A: Ja, die meisten GPIOs des ESP32-S3 funktionieren (die Pins 0, 3, 45, 46 und andere boot-relevante Pins vermeiden). Einfach die Zahl in `#define LED_PIN 40` ändern und die Verkabelung an den neuen Pin anpassen.

**F: Können mehrere LED-Ringe gleichzeitig angesteuert werden?**
A: Ja. Jeden Ring an einen separaten GPIO anschließen und `addLeds` im Code ein weiteres Mal aufrufen, dabei unterschiedliche `leds[]`-Array-Bereiche zuweisen.

**F: Braucht der LED-Ring eine separate Stromversorgung?**
A: Bei bis zu 8 LEDs und nicht maximaler Helligkeit kann der 5V-Pin des Boards ausreichen. Bei mehr als 8 LEDs oder wenn voll weißes Licht benötigt wird, wird dringend ein externes 5V-Netzteil mit mindestens 2A empfohlen. Die Masse (GND) des externen Netzteils muss mit der Masse des Boards verbunden sein.

**F: Was ist `EVERY_N_MILLISECONDS`, und warum nicht einfach `delay()` verwenden?**
A: `EVERY_N_MILLISECONDS` ist ein integrierter nicht-blockierender Timer von FastLED. `loop()` läuft normal weiter, nur der Code im Block wird im angegebenen Intervall ausgeführt. Mit `delay()` würde das gesamte Programm anhalten und man könnte nicht gleichzeitig Taster, serielle Kommunikation usw. verarbeiten.

**F: Kann die Rotationsrichtung umgekehrt werden?**
A: Ja, dazu `gHue++` durch `gHue--` ersetzen – dann rotiert der Effekt in die andere Richtung.

---

## Erweiterungsideen

- Einen Taster hinzufügen, um zwischen verschiedenen Effekten umzuschalten (Atmen / Lauflicht / Regenbogen-Fluss)
- Ein Mikrofon-Modul anschließen und einen audioresponsiven LED-Spektrum-Effekt erzeugen
- Mehrere LED-Ringe kaskadieren: DIN an den DOUT des vorherigen Rings anschließen, um einen längeren LED-Streifen-Effekt zu erzielen
- Ein OLED-Display anschließen, das den aktuellen Effektnamen und die Helligkeit anzeigt

---

## Referenzen

- [FastLED offizielles GitHub-Repository](https://github.com/FastLED/FastLED)
- [WS2812B Datenblatt (WorldSemi offiziell)](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf)
- [Espressif ESP32-S3 Technisches Referenzhandbuch](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [Espressif ESP32-S3 Produktseite](https://www.espressif.com/en/products/socs/esp32-s3)
