---
title: "ESP32-S3 + GC9A01 + MPU6050 Digitale Wasserwaage – Komplettanleitung | SPI + I2C + Arduino"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-03
intro: "ESP32-S3 steuert ein GC9A01 Runddisplay und einen MPU6050 6-Achsen-Sensor, zeigt Nickwinkel, Rollwinkel und Temperatur in Echtzeit an – eine schicke und praktische digitale Wasserwaage zum Selberbauen."
image: "https://img.lingflux.com/2026/06/64f482f7efccfdc6b16f216a95efc28e.jpg"
---

# ESP32-S3 + GC9A01 + MPU6050 Digitale Wasserwaage – Komplettanleitung (SPI + I2C + Arduino)

Schwierigkeit: ⭐⭐☆☆☆ (Anfänger geeignet)
Zeitaufwand: ca. 45 Minuten
Getestet mit: Arduino IDE 2.3.8 | Arduino_GFX_Library v1.6.5 | MPU6050_light v1.2.1

---

> **Kurzusammenfassung**: ESP32-S3 steuert ein GC9A01 Rund-TFT-Display und einen MPU6050 6-Achsen-Sensor, um eine Echtzeit-Blasenwasserwaage zu bauen. Die Blasenfarbe ändert sich je nach Neigungswinkel (Grün → Gelb → Rot). Inklusive kompletter Anschlussabelle und Arduino-Code.

---

> **TL;DR (Schnellstart):**
>
> 1. MPU6050-Anschluss: SDA → GPIO 15, SCL → GPIO 16, AD0 → GND (feste I2C-Adresse 0x68)
> 2. GC9A01-Anschluss: CLK → GPIO 12, MOSI → GPIO 11, CS → GPIO 9, DC → GPIO 10, RST → GPIO 18, BL → GPIO 7
> 3. Bibliotheken installieren: `GFX Library for Arduino` (Autor moononournation) + `MPU6050_light` (Autor rfetick)
> 4. Code hochladen, nach dem Einschalten ** Gerät ca. 1 Sekunde flach und ruhig halten**, bis die Kalibrierungsmeldung verschwindet, dann neigen und die Blase beobachten

---

## Einleitung

Hast du schon mal versucht, ein Regalbrett ohne Wasserwaage zu montieren, dachtest "das ist ungefähr waagerecht" – und danach ist alles auf eine Seite gerutscht?

Genau so ging es mir. Ich hatte keine klassische Wasserwaage zur Hand, durchwühlte aber meine Bauteilkiste – und siehe da: ein GC9A01-Runddisplay und ein MPU6050 lagen ungenutzt in der Ecke. Zusammen ergeben sie genau die Zutaten für eine digitale Wasserwaage.

Noch besser: Ein Runddisplay ist optisch perfekt für eine Wasserwaage. Blase mittig = Grün, leicht daneben = Gelb, zu stark geneigt = Rot. Alles auf einen Blick verständlich, keine Anleitung nötig.

Ziel dieses Artikels: **Von null anfangen – anschließen → Bibliotheken installieren → Code hochladen → Blase bewegen sehen**. Schritt für Schritt zum Nachbauen.

---

## Ergebnis

![](https://img.lingflux.com/2026/06/09a4ed83eaa702df1ded539d608c9323.jpg)

Das Display zeigt in Echtzeit vier Informationen:

- **Zentrale Blase**: bewegt sich mit der Neigung des Geräts, dreistufige Farbanzeige (Grün = waagerecht / Gelb = leicht geneigt / Rot = stark geneigt)
- **Combined tilt angle** (°): Kombinierter Wert aus Pitch und Roll, groß dargestellt
- **Pitch / Roll Einzelwerte**: Neigungswinkel nach vorne/hinten und links/rechts
- **Chip-Temperatur**: Messwert des internen Temperatursensors des MPU6050 (etwas höher als Raumtemperatur, siehe Erklärung unten)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30s2V_TAoMo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## Bauteile

### GC9A01 Rund-TFT-Display

Stell es dir vor wie **ein speziell rund zugeschnittenes Handydisplay** – 240×240 Auflösung ist zwar nicht Spitzenklasse, aber als Wasserwaagen-Zifferblatt mit der runden Glasscheibe auf dem Tisch ist es wie dafür gemacht.

| Parameter | Wert |
| --- | --- |
| Auflösung | 240 × 240 px (runde Anzeigefläche) |
| Schnittstelle | SPI (max. 80 MHz) |
| Versorgung | 3.3V |
| Farbtiefe | 65K Farben (RGB565) |
| Panel-Typ | IPS |

Warum dieses Display: Das runde Zifferblatt passt von Natur aus perfekt zur Form einer Blasenwasserwaage. Die SPI-Hochgeschwindigkeitsschnittstelle reicht für 20fps-Animationen problemlos aus.

### MPU6050 6-Achsen-Trägheitssensor

Stell es dir vor wie **die Kombination aus Handy-Gyroskop und Beschleunigungssensor** – dieselbe Art Chip, die für die automatische Bildschirmdrehung und die Schrittzählfunktion im Handy verwendet wird. Der MPU6050 vereint einen 3-Achsen-Beschleunigungssensor (erfasst die Neigungsrichtung) und ein 3-Achsen-Gyroskop (erfasst die Drehgeschwindigkeit) in einem einzigen 4mm × 4mm kleinen Chip – und liefert obendrein noch einen Temperatursensor.

| Parameter | Wert |
| --- | --- |
| Beschleunigungsbereich | ±2 / ±4 / ±8 / ±16 g (konfigurierbar) |
| Gyroskop-Bereich | ±250 / ±500 / ±1000 / ±2000 °/s (konfigurierbar) |
| ADC-Auflösung | 16 Bit |
| Schnittstelle | I2C (max. 400 kHz Fast Mode) |
| Versorgung | 3.3V (VDD-Bereich: 2.375 ~ 3.46V) |
| I2C-Adresse | 0x68 (AD0 = GND) / 0x69 (AD0 = VCC) |

Warum dieser Sensor: Äußerst günstig, hervorragende Bibliotheksunterstützung. `MPU6050_light` liefert direkt fusionierte Winkel – kein eigenes Kalman-Filter nötig.

---

## Stückliste (BOM)

| Bauteil | Modell / Spezifikation | Menge |
| --- | --- | --- |
| Entwicklungsboard | ESP32-S3 | 1 |
| Rund-TFT-Display | GC9A01 240×240 IPS | 1 |
| 6-Achsen-Sensor | MPU6050 Modul | 1 |
| Verbindungskabel | Dupont-Kabel | nach Bedarf |

---

## Pin-Belegung der Bauteile

### GC9A01 Pins

| Pin-Beschriftung | Funktion |
| --- | --- |
| VCC | 3.3V Hauptversorgung |
| GND | Masse |
| SCL / CLK | SPI-Takt (SCLK) |
| SDA / MOSI | SPI-Daten (Master Out, Slave In) |
| CS | Chip Select (aktiv Low) |
| DC | Daten / Befehl Umschaltung |
| RST | Hardware-Reset (aktiv Low) |
| BL | Hintergrundbeleuchtung |

### MPU6050 Pins

| Pin-Beschriftung | Funktion |
| --- | --- |
| VCC | 3.3V Hauptversorgung |
| GND | Masse |
| SDA | I2C-Datenleitung |
| SCL | I2C-Taktleitung |
| INT | Interrupt-Ausgang (im Polling-Modus nicht verbunden) |
| AD0 | I2C-Adresswahl (GND = 0x68) |
| XDA / XCL | Hilfs-I2C (in diesem Projekt nicht verwendet) |

---

## Verdrahtung

> Am besten Zeile für Zeile nach der Tabelle anschließen und jede Verbindung abhaken – das spart 80% der Fehlersuche.

### MPU6050 → ESP32-S3

| MPU6050 Pin | ESP32-S3 Pin | Hinweis |
| --- | --- | --- |
| VCC | 3.3V | Hauptversorgung |
| GND | GND | Gemeinsame Masse |
| SDA | GPIO 15 | I2C-Datenleitung |
| SCL | GPIO 16 | I2C-Taktleitung |
| AD0 | GND | Fixiert I2C-Adresse auf 0x68 |
| INT / XDA / XCL | Nicht verbunden | In diesem Projekt nicht benötigt |

**Hinweis zu I2C-Pullup-Widerständen**: Standardmäßig werden je ein 4,7kΩ Pullup-Widerstand von SDA und SCL auf 3.3V empfohlen, was die Störsicherheit bei schnellen Übertragungen deutlich verbessert. In diesem Beispiel wurde darauf verzichtet, aber für ein fertiges Produkt sollten sie ergänzt werden.

### GC9A01 → ESP32-S3

| GC9A01 Pin | ESP32-S3 Pin | Hinweis |
| --- | --- | --- |
| VCC | 3.3V | Hauptversorgung |
| GND | GND | Gemeinsame Masse |
| SCL / CLK | GPIO 12 | SPI-Takt |
| SDA / MOSI | GPIO 11 | SPI-Daten |
| CS | GPIO 9 | Chip Select |
| DC | GPIO 10 | Daten / Befehl Umschaltung |
| RST | GPIO 18 | Hardware-Reset |
| BL | GPIO 7 | Hintergrundbeleuchtung (optional, manche Module haben diesen Pin nicht. Per Code HIGH/LOW steuern oder direkt auf 3.3V für Dauerbetrieb) |



---

## Bibliotheken installieren

In der Arduino IDE unter **Werkzeuge → Bibliotheken verwalten** suchen und installieren:

| Bibliothek | Autor | Getestete Version |
| --- | --- | --- |
| GFX Library for Arduino | moononournation | v1.6.5 |
| MPU6050_light | rfetick | v1.2.1 |

Abweichende Versionen können zu API-Änderungen führen. Es wird empfohlen, die in der Tabelle angegebenen Versionen zu installieren. Nach der Installation Arduino IDE neu starten und das Projekt öffnen.



---

## Kompletter Code

```cpp
/**
 * ESP32-S3 + GC9A01 + MPU6050 Digitale Wasserwaage
 * Digital Spirit Level
 *
 * Verdrahtung:
 *   GC9A01  → SCL=12, SDA=11, CS=9, DC=10, RST=18, BL=7
 *   MPU6050 → SDA=15, SCL=16, AD0=GND (I2C-Adresse 0x68)
 */

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <MPU6050_light.h>

// ---- Farbdefinitionen (RGB565-Format) ----
#define COLOR_BG       0x0863   // Dunkler Hintergrund
#define COLOR_GRID     0x1A69   // Skalierungsgitterlinien
#define COLOR_GREEN    0x07E6   // Blase zentriert → Grün
#define COLOR_YELLOW   0xFEA0   // Leicht geneigt → Gelb
#define COLOR_RED      0xF820   // Zu stark geneigt → Rot
#define COLOR_TEXT     0xC618   // Normaler Text
#define COLOR_ACCENT   0xFD20   // Mittelpunktfadenkreuz

// ---- GC9A01 SPI Pins ----
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---- MPU6050 I2C Pins (muss mit Verdrahtungstabelle übereinstimmen) ----
#define MPU_SDA  15   // SDA → GPIO 15
#define MPU_SCL  16   // SCL → GPIO 16

// ---- Display-Treiber initialisieren ----
// Schritt 1: SPI-Bus erstellen, Parameterreihenfolge: DC, CS, SCK, MOSI, MISO
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA,
    GFX_NOT_DEFINED
);
// Schritt 2: GC9A01 Display-Objekt erstellen (rotation=0, IPS-Panel=true)
Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST, 0, true
);
// Schritt 3: 240×240 Offscreen-Canvas erstellen (Doppelpufferung gegen Bildzerreißen)
Arduino_Canvas *canvas = new Arduino_Canvas(
    240, 240, gfx
);

// ---- MPU6050 ----
MPU6050 mpu(Wire);

// ---- Framerate-Steuerung ----
const int16_t cx = 120, cy = 120;    // Bildschirm-Mittelpunkt (Pixel)
unsigned long lastFrame = 0;
const int frameDelay = 1000 / 20;    // Zielframerate: 20fps → 50ms pro Frame

// ---- Vorwärtsdeklaration ----
void drawGrid();
void drawBubble(float pitch, float roll);
void drawReadouts(float pitch, float roll, float temp);

// =============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("=== ESP32-S3 Digitale Wasserwaage startet ===");

    // Schritt 1: Display und Hintergrundbeleuchtung initialisieren
    gfx->begin();
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);    // Hintergrundbeleuchtung einschalten
    canvas->begin();
    Serial.println("[OK] Display-Initialisierung abgeschlossen");

    // Schritt 2: I2C initialisieren, Bus scannen (hilft beim Debuggen der Verdrahtung)
    Wire.begin(MPU_SDA, MPU_SCL);
    Serial.print("[DBG] Scanne I2C-Bus SDA=");
    Serial.print(MPU_SDA);
    Serial.print(" SCL=");
    Serial.println(MPU_SCL);

    byte found = 0;
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            Serial.print("  I2C-Gerät gefunden, Adresse: 0x");
            Serial.println(addr, HEX);
            found++;
        }
    }
    if (found == 0) {
        Serial.println("[ERROR] Kein I2C-Gerät gefunden! Verdrahtung prüfen.");
    }

    // Schritt 3: MPU6050 initialisieren
    byte status = mpu.begin();
    if (status == 0) {
        Serial.println("[OK] MPU6050 verbunden");
    } else {
        Serial.println("[ERROR] MPU6050 antwortet nicht! Verdrahtung oder I2C-Adresse prüfen.");
    }

    // Schritt 4: Gyroskop automatische Kalibrierung (Gerät währenddessen flach und ruhig halten, ca. 1 Sekunde)
    Serial.println("[DBG] Kalibrierung läuft, Gerät flach halten, nicht bewegen...");
    canvas->fillScreen(COLOR_BG);
    canvas->setTextColor(COLOR_TEXT);
    canvas->setTextSize(1);
    canvas->setCursor(60, 110);
    canvas->print("Calibrating...");
    canvas->setCursor(55, 125);
    canvas->print("Keep device flat");
    canvas->flush();

    delay(1000);
    mpu.calcOffsets();    // Automatische Nullpunktsberechnung für Beschleunigungssensor und Gyroskop

    Serial.print("[DBG] Beschleunigungs-Offset: ");
    Serial.print(mpu.getAccXoffset());  Serial.print(", ");
    Serial.print(mpu.getAccYoffset());  Serial.print(", ");
    Serial.println(mpu.getAccZoffset());
    Serial.print("[DBG] Gyroskop-Offset: ");
    Serial.print(mpu.getGyroXoffset()); Serial.print(", ");
    Serial.print(mpu.getGyroYoffset()); Serial.print(", ");
    Serial.println(mpu.getGyroZoffset());
    Serial.println("[OK] Kalibrierung abgeschlossen, Betrieb gestartet!");
}

// =============================================================
static int logCnt = 0;    // Debug-Log-Drosselungszähler

void loop() {
    unsigned long now = millis();
    if (now - lastFrame < frameDelay) return;    // Framerate drosseln
    lastFrame = now;

    // Schritt 1: Sensor auslesen
    mpu.update();
    float pitch = mpu.getAngleY();     // Nickwinkel (Neigung vor/zurück)
    float roll  = -mpu.getAngleX();    // Rollwinkel (Neigung links/rechts, Vorzeichen umgekehrt für visuelle Richtung)
    float temp  = mpu.getTemp();       // Chip-Temperatur (höher als Umgebungstemperatur, normal)

    // Debug-Log: alle 20 Frames (ca. 1 Sekunde) ausgeben, beeinträchtigt nicht die Framerate
    if (++logCnt >= 20) {
        logCnt = 0;
        Serial.print("[DBG] pitch="); Serial.print(pitch, 2);
        Serial.print(" roll=");       Serial.print(roll,  2);
        Serial.print(" temp=");       Serial.print(temp,  1);
        Serial.print(" | accX=");     Serial.print(mpu.getAccX(), 2);
        Serial.print(" accY=");       Serial.print(mpu.getAccY(), 2);
        Serial.print(" accZ=");       Serial.println(mpu.getAccZ(), 2);
    }

    // Schritt 2: Begrenzung – bei mehr als ±45° bleibt die Blase am Rand, verlässt den Kreis nicht
    pitch = constrain(pitch, -45.0f, 45.0f);
    roll  = constrain(roll,  -45.0f, 45.0f);

    // Schritt 3: Aktuellen Frame zeichnen
    canvas->fillScreen(COLOR_BG);        // Canvas leeren
    drawGrid();                          // Skalierungsgitter
    drawBubble(pitch, roll);             // Blase
    drawReadouts(pitch, roll, temp);     // Zahlenwerte
    canvas->flush();                     // Auf Display übertragen
}

// =============================================================
// Hintergrund-Skalierungskreise und Mittelpunktfadenkreuz zeichnen
void drawGrid() {
    canvas->drawCircle(cx, cy,  25, COLOR_GRID);
    canvas->drawCircle(cx, cy,  50, COLOR_GRID);
    canvas->drawCircle(cx, cy,  80, COLOR_GRID);
    canvas->drawCircle(cx, cy, 105, COLOR_GRID);
    canvas->drawFastHLine(15, cy,  210, COLOR_GRID);
    canvas->drawFastVLine(cx, 15,  210, COLOR_GRID);
    // Mittelpunktfadenkreuz (Akzentfarbe, auffälliger als Gitter)
    canvas->drawFastHLine(cx - 5, cy,     10, COLOR_ACCENT);
    canvas->drawFastVLine(cx,     cy - 5, 10, COLOR_ACCENT);
}

// Blasenposition aus Pitch/Roll berechnen und Farbe nach Abstand einfärben
void drawBubble(float pitch, float roll) {
    // ±45° linear auf ±90px Offset abbilden
    int16_t bx = cx + (int16_t)(roll  / 45.0f * 90.0f);
    int16_t by = cy + (int16_t)(pitch / 45.0f * 90.0f);

    // Pixelabstand der Blase vom Mittelpunkt berechnen, Farbstufe bestimmen
    float dist = sqrt((float)((bx - cx) * (bx - cx) + (by - cy) * (by - cy)));
    uint16_t color;
    if      (dist < 10) color = COLOR_GREEN;    // Ca. ±5°: waagerecht
    else if (dist < 40) color = COLOR_YELLOW;   // Ca. ±20°: leicht geneigt
    else                color = COLOR_RED;       // Über ±20°: stark geneigt

    // Linie von Mitte zur Blase + gefüllte Blase + weißer Rand
    canvas->drawLine(cx, cy, bx, by, COLOR_GRID);
    canvas->fillCircle(bx, by, 8, color);
    canvas->drawCircle(bx, by, 8, 0xFFFF);
}

// Winkelwerte, Statustext und Temperatur anzeigen
void drawReadouts(float pitch, float roll, float temp) {
    float total = sqrt(pitch * pitch + roll * roll);    // Kombinierter Neigungswinkel

    canvas->setTextSize(1);
    canvas->setTextColor(COLOR_TEXT);

    // Obere Titelzeile
    canvas->setCursor(55, 18);
    canvas->print("DIGITAL LEVEL");

    // Kombinierter Winkel: große Schrift, Farbe synchron mit Blase
    canvas->setTextSize(2);
    uint16_t color;
    if      (total < 1)  color = COLOR_GREEN;
    else if (total < 10) color = COLOR_YELLOW;
    else                 color = COLOR_RED;
    canvas->setTextColor(color);
    canvas->setCursor(75, 155);
    canvas->print(total, 1);
    canvas->print((char)247);    // °-Symbol (ASCII 247)

    // Statustext
    canvas->setTextSize(1);
    canvas->setCursor(80, 178);
    if      (total < 1)  canvas->print("  LEVEL");
    else if (total < 10) canvas->print(" TILTED");
    else                 canvas->print("  STEEP");

    // Pitch / Roll Einzelwerte
    canvas->setTextColor(COLOR_TEXT);
    canvas->setCursor(20, 195);
    canvas->print("P:"); canvas->print(pitch, 1);
    canvas->print(" R:"); canvas->print(roll,  1);

    // Temperatur (Chip-Junction-Temperatur, höher als Raumtemperatur ist normal)
    canvas->setCursor(60, 210);
    canvas->print("T:"); canvas->print(temp, 1);
    canvas->print("C");
}
```

---

## Code-Erklärung

**Initialisierung (setup)**

In `setup` werden vier Schritte nacheinander ausgeführt: Display-Initialisierung → I2C-Scan → MPU6050-Initialisierung → Gyroskop-Kalibrierung. Die Ausrichtung des Moduls beim Start bestimmt den Nullpunkt.

Das Display nutzt `Arduino_Canvas` für Offscreen-Doppelpufferung – alle Zeichenoperationen werden zuerst im Speicher ausgeführt und dann mit einem einzigen `flush()` auf das Display übertragen. Dadurch gibt es kein Bildzerreißen oder Zwischenbilder.

Der I2C-Scan gibt die gefundenen Geräteadressen auf der seriellen Schnittstelle aus. Beim ersten Test kann der Serielle Monitor geöffnet werden, um zu bestätigen, dass der MPU6050 erkannt wurde (normalerweise wird `I2C-Gerät gefunden, Adresse: 0x68` ausgegeben).

`mpu.calcOffsets()` führt die automatische Kalibrierung durch und dauert ca. 1 Sekunde. Während dieser Zeit muss das Gerät flach und ruhig gehalten werden. **Bei jedem Einschalten wird neu kalibriert**, also nach dem Einschalten zuerst flach hinlegen und warten, bis die Meldung auf dem Display verschwindet.

**Hauptschleife (loop)**

Die Framerate ist auf 20fps fixiert. Jeder Frame führt vier Schritte aus: Sensor auslesen → Begrenzung → Zeichnen → Display aktualisieren.

`roll = -mpu.getAngleX()` hat ein Minuszeichen davor – dadurch bewegt sich die Blase auf dem Display in die gleiche Richtung wie die tatsächliche Neigung. Ohne das Vorzeichen würde die Blase in die falsche Richtung wandern. Falls die Einbaulage anders ist, kann das Vorzeichen im Code angepasst werden.

Die dreistufige Blasenfarbe: Abstand vom Mittelpunkt <10px = Grün, <40px = Gelb, sonst Rot. Das entspricht etwa ±5°, ±20° und über ±20°.

---

## Fehlerbehebung

Keine Panik – 90% der Probleme liegen in der Verdrahtung oder bei den I2C-Adressen:

**Display komplett weiß oder schwarz, keine Anzeige**

Zuerst prüfen, ob VCC an 3.3V angeschlossen ist (nicht 5V – GC9A01 ist nicht 5V-tolerant). Prüfen, ob der BL-Hintergrundbeleuchtungs-Pin verbunden ist. Dann CS, DC und RST kontrollieren – falscher CS = Display reagiert nicht, RST offen = Display bleibt im Reset-Zustand. BL direkt auf 3.3V legen: Wenn das Display hell weiß wird, funktioniert das Panel und das Problem liegt bei der SPI-Initialisierung.

**Serielle Ausgabe zeigt `[ERROR] Kein I2C-Gerät gefunden`**

Mit dem Multimeter messen, ob am VCC-Pin des MPU6050 3.3V anliegen. SDA und SCL nicht vertauscht (SDA → GPIO 15, SCL → GPIO 16). **AD0 muss explizit auf GND verbunden werden** – bei offenem Pin ist die Adresse bei einigen Modulen instabil und der I2C-Bus antwortet nicht.

**Blase zittert unkontrolliert, wird nicht ruhig**

Das Gerät wurde beim Einschalten nicht ruhig genug gehalten. Neu starten, auf eine ebene Unterlage legen und warten, bis die Kalibrierungsmeldung verschwindet. Falls die Unterlage selbst vibriert (Drucker, Lüfter in der Nähe), den Standort wechseln.

**Pitch- oder Roll-Richtung ist verdreht**

Je nach Einbaurichtung des Boards das Vorzeichen im Code anpassen: `pitch = mpu.getAngleY()` zu `pitch = -mpu.getAngleY()` ändern, oder entsprechend die `roll`-Zeile anpassen, bis die Richtung stimmt.

**Temperatur ist 10-20 Grad höher als Raumtemperatur**

Das ist normal. Der MPU6050 misst die Chip-Junction-Temperatur, die typischerweise 10–20°C über der Umgebungstemperatur liegt – nur als Richtwert zu betrachten. Für genaue Umgebungstemperaturmessung einen separaten Sensor (z.B. DS18B20) verwenden.

**Bild flackert oder reißt**

Der Code verwendet bereits `Arduino_Canvas` Doppelpufferung – normalerweise gibt es kein Zerreißen. Falls trotzdem Probleme auftreten, SPI-Dupont-Kabel auf festen Sitz prüfen, Kabel nicht länger als 20cm, bei Bedarf 100nF Entkopplungskondensator nahe den Strompins ergänzen.

---

## FAQ

**F: Wie hoch ist die Aktualisierungsrate der MPU6050-Winkel?**
A: `MPU6050_light` liest im I2C 400kHz Fast Mode, die Rohdaten-Samplerate beträgt max. 1kHz. Dieser Code begrenzt die Framerate auf 20fps, effektiv 20Hz. Für eine höhere Bildrate `frameDelay` auf einen kleineren Wert setzen – in der Praxis sind bis zu 40fps stabil (begrenzt durch die SPI-Übertragungsrate).

**F: Können andere GPIOs verwendet werden?**
A: Ja, einfach die `#define`-Makros oben im Code anpassen. Für die GC9A01 SPI-Pins empfiehlt sich das ESP32-S3 Hardware-SPI (GPIO 11 / 12 sind SPI2, beste Performance). Für den MPU6050 I2C können beliebige GPIOs verwendet werden, Code und Verdrahtung müssen nur übereinstimmen.

**F: Kann der GC9A01 durch ein eckiges Display ersetzt werden?**
A: Ja. `Arduino_GC9A01` durch die entsprechende Treiberklasse ersetzen (z.B. `Arduino_ST7789` für ST7789), Breite/Höhe des `Arduino_Canvas` und die Mittelpunktskoordinaten `cx/cy` anpassen – die Zeichnungslogik bleibt unverändert.

**F: Reichen die 3.3V des ESP32-S3 für GC9A01 und MPU6050 gleichzeitig?**
A: Ja. Der GC9A01-Hintergrundbeleuchtungsstrom liegt bei ca. 20mA, der MPU6050 verbraucht typisch 3.5mW (ca. 1mA). Zusammen deutlich unter der üblichen 300–500mA Strombegrenzung des 3.3V-Pins auf dem Entwicklungsboard.

**F: Können zwei MPU6050 am selben I2C-Bus betrieben werden?**
A: Ja. Einer mit AD0 auf GND (Adresse 0x68), der andere mit AD0 auf VCC (Adresse 0x69), gemeinsame SDA/SCL-Leitungen. Im Code zwei `MPU6050`-Objekte deklarieren und jeweils mit der unterschiedlichen Adresse initialisieren.

**F: Muss bei jedem Neustart neu kalibriert werden?**
A: Ja, dieser Code führt bei jedem Einschalten in `setup()` eine dynamische Kalibrierung mit `mpu.calcOffsets()` durch. Bei fester Installation können die Offset-Werte im EEPROM gespeichert und beim nächsten Start direkt ausgelesen werden, was die Wartezeit erspart.

---

## Erweiterungsideen

- Taster anschließen und zwischen Anzeigemodi wechseln (Wasserwaage / Echtzeit-Winkelkurve / Thermometer)
- Kalibrierungs-Referenzwerte im EEPROM speichern, um feste Einbauwinkel zu kompensieren
- Passiven Summer anschließen, der bei waagerechter Position einen Bestätigungston ausgibt
- Anderes Rundinstrument-Design verwenden, z.B. als Magnetkompass oder G-Force-Anzeige

---

## Referenzen

- [MPU-6000 / MPU-6050 Product Specification — InvenSense (TDK)](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [GC9A01A Datasheet — Galaxycore](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [MPU6050_light GitHub — rfetick](https://github.com/rfetick/MPU6050_light)
- [ESP32-S3 Technical Reference Manual — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3 Produktseite — Espressif](https://www.espressif.com/en/products/socs/esp32-s3)
