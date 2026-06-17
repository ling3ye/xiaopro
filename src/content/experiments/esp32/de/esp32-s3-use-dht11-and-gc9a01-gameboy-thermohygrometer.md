---
title: "DHT11 + GC9A01 Runddisplay: Game Boy Pixel-Retro-Thermohygrometer | ESP32-S3 SPI-Verkabelung + kompletter Arduino-Code"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/dht11
category: esp32
date: 2026-06-18
intro: "Mit dem ESP32-S3 steuerst du ein GC9A01 240×240 Runddisplay zusammen mit einem DHT11-Sensor und hauchst dem klassischen vierstufigen Cremegrün des Game Boy DMG neues Leben ein – ein Pixel-Retro-Thermohygrometer für den Schreibtisch, das bei Extremwerten blinkt und Alarm schlägt. Inklusive kompletter Verkabelungstabelle, Arduino-Bibliotheksinstallation und vollständig kommentiertem Code – einsteigerfreundlich."
image: "https://img.lingflux.com/2026/06/4d154493c9e833bc839cec1050f749f6.jpg"
---

# DHT11 + GC9A01 Runddisplay: Game Boy Pixel-Retro-Thermohygrometer (komplettes Tutorial) (ESP32-S3 · SPI-Verkabelung · Arduino-Code)

---

## TL;DR · Drei-Minuten-Überblick

> Keine Zeit für den langen Text? Hier sind die Kernschritte – wer schon Routine hat, fliegt einfach drüber:
>
> 1. **Verkabelung**: DHT11-Datenpin → GPIO 47; GC9A01 Runddisplay per SPI: SCK→GPIO12, MOSI→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 2. **Zwei Bibliotheken installieren**: In der Arduino IDE `Arduino_GFX_Library` (Moon On Our Nation) und `DHT sensor library` (Adafruit) suchen und installieren
> 3. **Den kompletten Code am Ende einfügen**, in der Arduino IDE das Board `ESP32S3 Dev Module` auswählen
> 4. **Kompilieren und hochladen**, ca. 30 Sekunden auf das Flashen warten
> 5. **Mit Strom verifizieren**: Das Runddisplay leuchtet cremegrün, oben wird die Temperatur (°C) angezeigt, unten die Luftfeuchte (%), bei Extremwerten blinkt der Alarm automatisch ✅

---

## Vorwort: Ein Thermohygrometer, das „spielt"

Ganz ehrlich: Ich habe schon ziemlich viele Temperatur- und Luftfeuchte-Lösungen ausprobiert – große OLED-Displays, kleine Siebensegment-LEDs, sogar reine Serial-Ausgaben … und jedes Mal, wenn auf dem Display nur ein paar einsame Zahlen standen, empfand ich eine eigentümliche Leere. Funktionieren tat es schon – es fehlte einfach ein bisschen **Seele**.

Bis ich eines Tages meinen alten Game Boy aus der Schublade kramte. Dieses klassische cremegelb-grüne Display gab mir plötzlich die Idee: **Wenn man schon Zahlen anzeigt, warum nicht ein bisschen retro, ein bisschen verspielter?**

So entstand dieses Projekt – mit einem ESP32-S3 steuere ich ein GC9A01-Rund-LCD an, kombiniert mit dem DHT11-Temperatur-/Luftfeuchtesensor, alles mit selbst geschriebenen Pixel-Fonts. Die ikonische vierstufige Game-Boy-DMG-Palette landet auf dem Runddisplay – ein **Pixel-Retro-Thermohygrometer**, das auf dem Schreibtisch einfach zum Hingucker wird.

Keine fertige UI-Bibliothek, kein komplexes Framework – nur `fillRect()` und Zelle für Zelle Pixelzahlen „gestapelt". Diese etwas behäbige Methode fühlt sich am authentischsten an.

**Ziel dieses Artikels**: Auch ohne Vorwissen gehst du den gesamten Ablauf durch und siehst am Ende auf dem GC9A01-Runddisplay die Live-Temperatur und -Luftfeuchte – und das Ergebnis darf ordentlich auffallen.

---

## Ergebnis des Experiments

![](https://img.lingflux.com/2026/06/755f0087c027a35770edb0fd87a81a35.jpg)

Das Endergebnis in einem Satz: **240×240 Runddisplay, cremegrüner Hintergrund, große zentrierte Pixel-Zahlen für Temperatur und Luftfeuchte, sanfter Übergang bei Wertänderungen, automatisches Blinken bei Grenzwertüberschreitung, ca. 30 fps, ohne jegliches Tearing oder Flackern**.

---

## Komponenten im Überblick

Bevor du Teile kaufst, lernst du hier die drei Hauptdarsteller von heute kennen.

### ESP32-S3 · Der einzige Teil in diesem Projekt mit Grips

Der ESP32-S3 ist ein Wi-Fi-+ Bluetooth-Doppelmodus-Chip von Espressif. Heute nutzen wir aber nicht seine Netzwerkfähigkeiten, sondern **die reichlichen GPIOs, den großzügigen Speicher und die ausreichend schnelle SPI-Bus**.

> Zur Veranschaulichung: Wenn das GC9A01-Runddisplay ein Fernseher ist, dann ist der ESP32-S3 die Set-Top-Box, die das Programmsignal in den Fernseher stopft – der gesamte „Inhalt" startet hier, das Display „spielt" ihn nur ab.

Wichtige Eckdaten:
- Taktfrequenz 240 MHz (Dual-Core Xtensa LX7)
- Speicher 512 KB SRAM, zusätzlich optional PSRAM
- Unterstützt Hardware-SPI, läuft mit bis zu 80 MHz
- 3,3 V Betriebsspannung, GPIO-Spannungsfestigkeit 3,3 V (⚠️ niemals 5-V-Signale anschließen)

---

### GC9A01 Runddisplay · Die Quelle des Pixel-Retro-Gefühls

Der GC9A01 ist ein Treiberchip für ein rundes **240×240** IPS-LCD, meist als kleines Runddisplay-Modul mit ca. 1,28 Zoll Durchmesser erhältlich. Die Schnittstelle ist ein Standard-4-Draht-SPI.

> Zur Veranschaulichung: Kennst du diese alten mechanischen Uhrenzifferblätter? Der GC9A01 tauscht dieses Zifferblatt gegen ein kleines, programmierbares Farbdisplay aus, das alles Mögliche darstellen kann – rund ist eben einfach elegant.

Wichtige Eckdaten:
- Auflösung: 240 × 240 Pixel, runde sichtbare Fläche
- Schnittstelle: 4-Draht-SPI (unterstützt bis zu 80 MHz Taktfrequenz)
- Farbtiefe: 16-Bit RGB565 (65536 Farben)
- Betriebsspannung: 3,3 V (VCC und Logikpegel jeweils 3,3 V, **nicht an 5 V anschließen!**)
- Hintergrundbeleuchtung: separate Pin-Steuerung (BL), High-Pegel schaltet ein

---

### DHT11 · Der neugierige kleine Nachbar

Der DHT11 ist ein kostengünstiger digitaler Sensor, der Temperatur und Luftfeuchte kombiniert. Über ein einziges Datenkabel liefert er beide Werte zurück – angenehm einfach in der Anwendung.

> Zur Veranschaulichung: Der DHT11 ist wie ein kleiner Nachbar, der in deinem Zimmer wohnt und dir ständig berichtet: „Wie warm ist es gerade, wie viel Wasser ist in der Luft?" Die Genauigkeit ist durchschnittlich, aber völlig ausreichend – und er ist leise.

Wichtige Eckdaten:
- Temperaturbereich: 0 ~ 50 °C, Genauigkeit ±2 °C
- Luftfeuchtebereich: 20 % ~ 90 % RH, Genauigkeit ±5 % RH
- Abtastintervall: minimal 1 Sekunde (im Code wird alle 2 Sekunden gelesen)
- Datenschnittstelle: 1-Wire-Digitalprotokoll (1-Wire-Variante)
- Betriebsspannung: 3,3 V oder 5 V möglich (in diesem Projekt an 3,3 V)

---

## BOM (Stückliste)

| Bauteil | Modell / Spezifikation | Anzahl | Hinweis |
| :--- | :--- | :---: | :--- |
| Hauptentwicklerboard | ESP32-S3 Dev Module | 1 | On-Board-USB-C-Flash-Port bestätigen |
| Rundes Farbdisplay | GC9A01 · 1,28 Zoll · 240×240 SPI | 1 | Beim Kauf Version mit BL-Pin wählen |
| Temperatur-/Luftfeuchtesensor | DHT11-Modul (Modulversion mit Pull-up-Widerstand) | 1 | Modulversion empfohlen, spart externen Widerstand |
| Jumperkabel | Dupont-Kabel (Stecker-Stecker / Stecker-Buchse) | mehrere | Von beiden Sorten einige bereithalten |

---

## Verkabelung

### DHT11 → ESP32-S3

| DHT11 Pin | ESP32-S3 Pin | Hinweis |
| :--- | :--- | :--- |
| GND | GND | gemeinsame Masse |
| VCC | 3V3 | Sensorversorgung (3,3 V) |
| DAT (DATA) | GPIO 47 | Datenbus |

### GC9A01 Runddisplay → ESP32-S3

| GC9A01 Pin | ESP32-S3 Pin | Hinweis |
| :--- | :--- | :--- |
| VCC | 3.3V | Hauptversorgung des Displays (⚠️ unbedingt 3,3 V, nicht 5 V) |
| GND | GND | gemeinsame Masse |
| SCL / CLK | GPIO 12 | SPI-Taktleitung |
| SDA / MOSI | GPIO 11 | SPI-Datenleitung |
| CS | GPIO 9 | Chip-Select (Low-aktiv) |
| DC | GPIO 10 | Daten-/Befehls-Umschaltung |
| RST | GPIO 18 | Hardware-Reset |
| BL | GPIO 7 | Hintergrundbeleuchtung (Pin fehlt möglicherweise, im Code dauerhaft High geschaltet; alternativ direkt an 3,3 V) |

> 💡 **Praktischer Hinweis**: Nach dem Verkabeln nicht sofort Strom geben – geh Zeile für Zeile die Tabelle durch und überprüfe alles. Achte besonders darauf, dass VCC an **3,3 V und nicht an 5 V** angeschlossen ist (ein GC9A01 an 5 V ist praktisch Ruine), und dass DAT des DHT11 am richtigen GPIO hängt. Wer diese Falle schon mal erlebt hat, kennt die Verzweiflung: „Strom an – und das Display bleibt für immer dunkel".

---

## Benötigte Bibliotheken installieren

Öffne die Arduino IDE, gehe zu **Werkzeuge → Bibliotheken verwalten**, suche und installiere die folgenden zwei Bibliotheken:

**1. Arduino_GFX_Library**

- Suchbegriff: `Arduino_GFX`
- Autor: `Moon On Our Nation`
- Aufgabe: Treibt das GC9A01-Runddisplay an, enthält die Canvas-Doppelpuffer-Funktion (Schlüssel zum Vermeiden von Bildschirmflackern)

**2. DHT sensor library**

- Suchbegriff: `DHT sensor library`
- Autor: `Adafruit`
- Falls beim Installieren „Abhängigkeiten installieren?" auftaucht, wähle **Install all** (so wird Adafruit Unified Sensor gleich mitinstalliert)

> Nach der Installation empfiehlt sich ein Neustart der Arduino IDE, damit die Bibliotheksdateien korrekt geladen werden.

---

## Vollständiger Code

Erklärung der Codestruktur:
- **Initialisierungsphase**: Hintergrundbeleuchtung einschalten → Display initialisieren → erste DHT11-Daten lesen
- **Hauptschleife**: alle 2 Sekunden Sensor lesen, alle 33 ms (ca. 30 fps) ein Frame rendern
- **Rendermechanismus**: erst auf das Canvas im Speicher zeichnen, dann in einem Rutsch auf das Display flushen – Tearing und Flackern werden verhindert
- **Pixel-Font**: 5×7 für Labeltext, 5×9 für große Zahlenwerte, alles händisch per `fillRect()` Zelle für Zelle gezeichnet
- **Warn-Animation**: Bei Temperatur über 35 °C oder unter 5 °C, Luftfeuchte über 85 % oder unter 20 % blinken die Zahlen im 400-ms-Intervall

```cpp
/**
 * ╔══════════════════════════════════════════════════╗
 * ║   ESP32-S3 Rund-Thermohygrometer · GAME BOY Pixel-Retro   ║
 * ║   Hardware: ESP32-S3 + GC9A01(240×240) + DHT11       ║
 * ║   Bibliotheken: Arduino_GFX_Library + DHT(Adafruit)  ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Farbpalette —— Game Boy DMG klassische vierstufiges Grün:
 *   PAL_BG      #CADC9F  Cremegelbgrün (Hintergrundfarbe, Quelle des Retro-Gefühls)
 *   PAL_LITE    #9BBC0F  hellstes Grün  (Highlight-Dekoration)
 *   PAL_MID     #8BAC0F  helles Grün    (Dekopunkte)
 *   PAL_DARK    #306230  mittleres Grün (Labeltext / Trennlinien)
 *   PAL_DARKEST #0F380F  dunkles Grün   (Hauptzahlen / Rahmen, höchster Kontrast)
 *
 * Warnlogik (klassische Technik einfarbiger Maschinen):
 *   Temperatur >35 °C oder <5 °C → Zahlen blinken im 400-ms-Intervall
 *   Luftfeuchte >85 % oder <20 %  → wie oben
 */

#include <Arduino_GFX_Library.h>
#include <DHT.h>

// ══════════════════════════════════════════
// Schritt 1: Pin-Definitionen
//   Hier die Zahlen ändern, um Pins zu tauschen – sonst muss nichts angepasst werden
// ══════════════════════════════════════════
#define DHTPIN    47      // DHT11-Datenpin
#define DHTTYPE   DHT11

#define TFT_SCK   12     // GC9A01 SPI-Takt
#define TFT_MOSI  11     // GC9A01 SPI-Daten
#define TFT_CS    9      // GC9A01 Chip-Select
#define TFT_DC    10     // GC9A01 Daten/Befehl
#define TFT_RST   18     // GC9A01 Hardware-Reset
#define TFT_BL    7      // GC9A01 Hintergrundbeleuchtung (HIGH = an)

// ══════════════════════════════════════════
// Schritt 2: Game Boy (DMG) vierstufige Grün-Palette
//   Farbformat: RGB565 (16 Bit)
//   Farben hier nicht ändern, sonst ist es kein Game-Boy-Stil mehr :)
// ══════════════════════════════════════════
#define PAL_BG       0xCF69   // Cremegelbgrün —— Hintergrundfarbe
#define PAL_LITE     0x9DC2   // hellstes Grün   —— Highlight-Dekoration (derzeit wenig genutzt)
#define PAL_MID      0x8D42   // helles Grün     —— blinkender Punkt in der oberen Leiste
#define PAL_DARK     0x3306   // mittleres Grün  —— Labels/Trennlinien
#define PAL_DARKEST  0x11C2   // dunkles Grün    —— Hauptzahlen/Rahmen

// ══════════════════════════════════════════
// Schritt 3: Display-Konstanten und Font-Skalierung
// ══════════════════════════════════════════
#define CX  120        // Mittelpunkt X (Displaymitte)
#define CY  120        // Mittelpunkt Y (Displaymitte)

#define BOLD_SCALE  6  // Skalierung der großen Zahlen (5×9 Glyphe × 6 = 30×54 Pixel)
#define DOT_INSET   1  // Jede Pixelzelle zieht 1 px ein, Hintergrundspalt sichtbar – Punkt-Raster-Look
#define UNIT_SCALE  2  // Schriftgröße der Einheit (°C / %)
#define LBL_SCALE   2  // Schriftgröße der Labels (TEMP / HUM)

// ══════════════════════════════════════════
// Schritt 4: Hardware-Objekte initialisieren
// ══════════════════════════════════════════
DHT dht(DHTPIN, DHTTYPE);

// Hardware-SPI-Bus
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, GFX_NOT_DEFINED);

// GC9A01-Treiber (letzter Parameter true = keine Rotation, farb invertierungsrelevant)
Arduino_GFX *display = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas-Doppelpuffer: erst komplettes Frame im Speicher zeichnen, flush() pusht es in einem Rutsch ans Display
//   Das ist die zentrale Maßnahme gegen Flackern, ähnlich Off-Screen-Rendering einer Spiel-Engine
Arduino_GFX *gfx = new Arduino_Canvas(240, 240, display);

// ══════════════════════════════════════════
// Globale Zustandsvariablen
// ══════════════════════════════════════════
float g_temp = 0, g_hum = 0;          // tatsächliche Sensorwerte
float g_dispTemp = 0, g_dispHum = 0;  // angezeigte Werte (mit sanftem Übergang, um Sprünge zu vermeiden)
bool  g_hasData = false;              // liegt mindestens ein gültiger Wert vor?

// ══════════════════════════════════════════
// Funktionsprototypen (dem Compiler mitteilen: „Diese Funktionen gibt es weiter unten")
// ══════════════════════════════════════════
const uint8_t* glyph(char ch);
int16_t  pixelAdvance(char ch, uint8_t scale);
int16_t  pixelTextWidth(const char *s, uint8_t scale);
void     drawPixelText(const char *s, int16_t x, int16_t y,
                       uint8_t scale, uint16_t c);
void     drawCenteredPixel(const char *s, int16_t y,
                           uint8_t scale, uint16_t c);
const uint8_t* boldGlyph(char ch);
int16_t  boldAdvance(char ch, uint8_t scale);
int16_t  boldTextWidth(const char *s, uint8_t scale);
void     drawBoldText(const char *s, int16_t x, int16_t y,
                      uint8_t scale, uint16_t c);
void     drawBezel();
void     drawTopBar(unsigned long t);
void     drawValue(const char *num, const char *unit,
                   int16_t yTop, uint16_t col);
void     drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c);
uint16_t tempColor(unsigned long t);
uint16_t humColor(unsigned long t);
void     drawScene(unsigned long t);

// ══════════════════════════════════════════
// setup() —— läuft beim Einschalten genau einmal
// ══════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=============================");
  Serial.println("  GAME BOY Pixel-Thermohygrometer");
  Serial.println("=============================");

  // 1. Hintergrundbeleuchtung einschalten
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 2. Display initialisieren
  if (!gfx->begin()) {
    Serial.println("[ERROR] Display-Initialisierung fehlgeschlagen! Verkabelung prüfen und neu starten.");
    while (true) delay(500);   // Hier blockieren, damit nichts Wildes weiterläuft
  }
  gfx->fillScreen(PAL_BG);
  gfx->flush();
  Serial.println("[OK] Display initialisiert");

  // 3. DHT11 initialisieren, 2 Sekunden warten bis der Sensor stabil ist, dann ersten Wert lesen
  dht.begin();
  Serial.println("[OK] DHT11 initialisiert, lese...");
  delay(2000);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    g_temp = g_dispTemp = t;
    g_hum  = g_dispHum  = h;
    g_hasData = true;
    Serial.printf("[DATA] Erste Messung T=%.1f°C  H=%.1f%%\n", t, h);
  } else {
    Serial.println("[WARN] Erste Messung fehlgeschlagen, Display zeigt --.- und wartet auf nächsten gültigen Wert");
  }
}

// ══════════════════════════════════════════
// loop() —— alle 2 Sekunden Sensor lesen, alle 33 ms ein Frame rendern (ca. 30 fps)
// ══════════════════════════════════════════
unsigned long lastRead  = 0;
unsigned long lastFrame = 0;

void loop() {
  unsigned long now = millis();

  // Alle 2 Sekunden Sensor lesen (DHT11-Mindestabstand 1 Sekunde, 2 Sekunden sind stabiler)
  if (now - lastRead >= 2000) {
    lastRead = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      g_temp = t;
      g_hum  = h;
      g_hasData = true;
      Serial.printf("[DATA] T=%.1f°C  H=%.1f%%\n", t, h);
    } else {
      // Bei LeseFehler Werte nicht aktualisieren, letzter gültiger Wert bleibt stehen
      Serial.println("[WARN] DHT11-Lesefehler, behalte letzten Wert");
    }
  }

  // Anzeigewert folgt mit 8 % Easing dem tatsächlichen Wert (nähert sich jeden Frame langsam an)
  //   Vergleich: Wie der Zeiger einer alten Analoguhr – springt nicht schlagartig zur neuen Position
  g_dispTemp += (g_temp - g_dispTemp) * 0.08f;
  g_dispHum  += (g_hum  - g_dispHum)  * 0.08f;

  // ca. 30 fps rendern (33 ms pro Frame)
  if (now - lastFrame >= 33) {
    lastFrame = now;
    drawScene(now);
    gfx->flush();    // Das Speicher-Canvas in einem Ruchs aufs physische Display schieben
  }
}

// ══════════════════════════════════════════
// drawScene() —— kompletten Inhalt eines Frames rendern
//   Zeichenreihenfolge: Hintergrundfarbe → runder Rahmen → obere Leiste → Temperaturbereich → Trennlinie → Luftfeuchtebereich
// ══════════════════════════════════════════
void drawScene(unsigned long t) {
  // 1. Bildschirm löschen (cremegrüner Hintergrund)
  gfx->fillScreen(PAL_BG);

  // 2. Rahmen und Dekopunkte zeichnen
  drawBezel();

  // 3. Obere Leiste zeichnen (Titel + Betriebs-LED)
  drawTopBar(t);

  // 4. Temperaturbereich
  char num[8];
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispTemp);
  else           strcpy(num, "--.-");       // Platzhalter bei fehlenden Daten

  drawCenteredPixel("TEMP", 44, LBL_SCALE, PAL_DARK);
  drawValue(num, "*C", 62, tempColor(t));   // '*' wird in diesem Font auf den Grad-Kreis ° abgebildet

  // 5. Gestrichelte Mitteltrennlinie
  drawDottedH(80, 160, 118, PAL_DARK);

  // 6. Luftfeuchtebereich
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispHum);
  else           strcpy(num, "--.-");

  drawCenteredPixel("HUM", 124, LBL_SCALE, PAL_DARK);
  drawValue(num, "%", 142, humColor(t));
}

// ──────────────────────────────────────────
// Rahmen: dunkelgrüne Doppel-Linie + vier 45°-diagonale Dekoquadrate
// ──────────────────────────────────────────
void drawBezel() {
  gfx->drawCircle(CX, CY, 116, PAL_DARKEST);
  gfx->drawCircle(CX, CY, 115, PAL_DARKEST);

  // Vier 45°-diagonale kleine Quadrate (cos45° ≈ 0,707)
  const int r = 104, d = (int)(r * 0.707f);
  gfx->fillRect(CX + d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // oben rechts
  gfx->fillRect(CX - d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // oben links
  gfx->fillRect(CX + d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // unten rechts
  gfx->fillRect(CX - d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // unten links
}

// ──────────────────────────────────────────
// Obere Leiste: zentrierter Titel „DHT11" + links blinkender Punkt im 500-ms-Takt (zeigt: System läuft)
// ──────────────────────────────────────────
void drawTopBar(unsigned long t) {
  drawCenteredPixel("DHT11", 12, 1, PAL_DARK);

  // Blinkender Punkt (an/aus wechselnd): alle 500 ms Farbe wechseln
  bool on = (t / 500) % 2 == 0;
  uint16_t c = on ? PAL_DARKEST : PAL_MID;
  int16_t tw = pixelTextWidth("DHT11", 1);
  int16_t sx = CX - tw / 2;         // X-Koordinate des linken Titelendes
  gfx->fillRect(sx - 12, 13, 4, 4, c);
}

// ──────────────────────────────────────────
// Zahlenzeile: große Zahl selbst horizontal zentriert, Einheit °C/% als kleiner Hochsteller rechts oben
//   So steht die Zahl mittig und wird nicht von der Einheit verschoben
// ──────────────────────────────────────────
void drawValue(const char *num, const char *unit,
               int16_t yTop, uint16_t col) {
  int16_t nw = boldTextWidth(num, BOLD_SCALE);
  int16_t sx = CX - nw / 2;                  // Start-X der zentrierten Zahl

  drawBoldText(num, sx, yTop, BOLD_SCALE, col);
  // Einheit direkt rechts neben der Zahl, 2 px höher – Hochsteller-Effekt
  drawPixelText(unit, sx + nw + 3, yTop + 2, UNIT_SCALE, col);
}

// ──────────────────────────────────────────
// Horizontale Pixel-Punktlinie (2×2 kleine Quadrate, 5 px Abstand)
// ──────────────────────────────────────────
void drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c) {
  for (int16_t x = x0; x <= x1; x += 5) {
    gfx->fillRect(x, y, 2, 2, c);
  }
}

// ══════════════════════════════════════════
// Farbzuordnung —— normal = dunkles Grün; extrem = im 400-ms-Takt „ausblinken" als Warnung
// ══════════════════════════════════════════
uint16_t tempColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispTemp > 35.0f || g_dispTemp < 5.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;   // aus = gleiche Farbe wie Hintergrund
  return PAL_DARKEST;
}

uint16_t humColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispHum > 85.0f || g_dispHum < 20.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;
  return PAL_DARKEST;
}

// ══════════════════════════════════════════
// 5×7 Pixel-Font (für Labels/Einheiten)
//   7 Zeilen pro Zeichen, untere 5 Bits jeder Zeile = Spalten 0~4 (Bit4 = ganz linke Spalte)
//   Sonderzeichen: '*' wird auf den Grad-Kreis ° abgebildet, '.' wird als kleines Quadrat auf der Grundlinie gezeichnet
// ══════════════════════════════════════════
const uint8_t EMPTY[7] = {0, 0, 0, 0, 0, 0, 0};

const uint8_t* glyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[7]={0x0E,0x11,0x13,0x15,0x19,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[7]={0x04,0x0C,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[7]={0x0E,0x11,0x01,0x02,0x04,0x08,0x1F}; return g; }
    case '3': { static const uint8_t g[7]={0x1F,0x02,0x04,0x02,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[7]={0x02,0x06,0x0A,0x12,0x1F,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[7]={0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E}; return g; }
    case '6': { static const uint8_t g[7]={0x06,0x08,0x10,0x1E,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[7]={0x1F,0x01,0x02,0x04,0x08,0x08,0x08}; return g; }
    case '8': { static const uint8_t g[7]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[7]={0x0E,0x11,0x11,0x1F,0x01,0x02,0x0C}; return g; }
    case '-': { static const uint8_t g[7]={0x00,0x00,0x00,0x0E,0x00,0x00,0x00}; return g; }
    case '%': { static const uint8_t g[7]={0x18,0x18,0x08,0x04,0x02,0x03,0x03}; return g; }
    case '*': { static const uint8_t g[7]={0x00,0x0E,0x11,0x0E,0x00,0x00,0x00}; return g; } // ° Grad-Kreis
    case 'C': { static const uint8_t g[7]={0x0E,0x11,0x10,0x10,0x10,0x11,0x0E}; return g; }
    case 'D': { static const uint8_t g[7]={0x1E,0x11,0x11,0x11,0x11,0x11,0x1E}; return g; }
    case 'E': { static const uint8_t g[7]={0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F}; return g; }
    case 'H': { static const uint8_t g[7]={0x11,0x11,0x11,0x1F,0x11,0x11,0x11}; return g; }
    case 'I': { static const uint8_t g[7]={0x0E,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case 'M': { static const uint8_t g[7]={0x11,0x1B,0x15,0x15,0x11,0x11,0x11}; return g; }
    case 'N': { static const uint8_t g[7]={0x11,0x19,0x15,0x13,0x11,0x11,0x11}; return g; }
    case 'O': { static const uint8_t g[7]={0x0E,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case 'P': { static const uint8_t g[7]={0x1E,0x11,0x11,0x1E,0x10,0x10,0x10}; return g; }
    case 'T': { static const uint8_t g[7]={0x1F,0x04,0x04,0x04,0x04,0x04,0x04}; return g; }
    case 'U': { static const uint8_t g[7]={0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    default:  return EMPTY;
  }
}

// Vorlauf pro Zeichen (Pixelbreite + rechter Abstand)
int16_t pixelAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale + (scale >> 1) + gap;   // Dezimalpunkt schmaler
  return 5 * scale + gap;
}

// Gesamte Pixelbreite eines Textes berechnen
int16_t pixelTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += pixelAdvance(*s, scale);
  return w;
}

// 5×7-Punkt-Matrix-Text Zelle für Zelle zeichnen
void drawPixelText(const char *s, int16_t x, int16_t y,
                   uint8_t scale, uint16_t c) {
  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      gfx->fillRect(x, y + 5 * scale, scale, scale, c);   // Dezimalpunkt auf der Grundlinie
      x += 2 * scale + (scale >> 1) + scale;
      continue;
    }
    const uint8_t *g = glyph(ch);
    for (uint8_t r = 0; r < 7; ++r) {
      uint8_t bits = g[r];
      for (uint8_t col = 0; col < 5; ++col) {
        if (bits & (0x10 >> col)) {
          gfx->fillRect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    x += 5 * scale + scale;
  }
}

// Horizontal zentriert 5×7-Text zeichnen
void drawCenteredPixel(const char *s, int16_t y, uint8_t scale, uint16_t c) {
  int16_t w = pixelTextWidth(s, scale);
  drawPixelText(s, CX - w / 2, y, scale, c);
}

// ══════════════════════════════════════════
// 5×9-Punkt-Matrix-Großziffer-Font (speziell für die Hero-Werte Temperatur und Luftfeuchte)
//
//   Design-Merkmale:
//   · Jede Zelle zieht DOT_INSET px ein, Hintergrundspalt sichtbar – LCD-Punkt-Raster-Look
//   · '2' oben mit Kante + gestufter Schrägstrich Zelle für Zelle + durchgehender Doppelzeilen-Boden
//   · '5' oben und unten jeweils durchgehende volle Zeile
//   · '.' läuft nicht über die Glyphentabelle, sondern wird von drawBoldText direkt als einzelne Grundlinienzelle gezeichnet
// ══════════════════════════════════════════
const uint8_t* boldGlyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[9]={0x0C,0x04,0x04,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[9]={0x0E,0x11,0x01,0x02,0x04,0x08,0x10,0x1F,0x1F}; return g; }
    case '3': { static const uint8_t g[9]={0x0E,0x11,0x01,0x01,0x06,0x01,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[9]={0x02,0x06,0x0A,0x12,0x12,0x1F,0x02,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[9]={0x1F,0x10,0x10,0x1E,0x01,0x01,0x01,0x11,0x1F}; return g; }
    case '6': { static const uint8_t g[9]={0x0E,0x11,0x10,0x10,0x1E,0x11,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[9]={0x1F,0x01,0x02,0x02,0x04,0x04,0x08,0x08,0x10}; return g; }
    case '8': { static const uint8_t g[9]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x0F,0x01,0x01,0x11,0x0E}; return g; }
    case '-': { static const uint8_t g[9]={0x00,0x00,0x00,0x00,0x1F,0x00,0x00,0x00,0x00}; return g; }
    default:  return nullptr;
  }
}

// Vorlauf pro Großziffer
int16_t boldAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale;    // Dezimalpunkt = 1 Zelle Breite + 1 Zelle Abstand
  return 5 * scale + gap;
}

// Gesamte Breite eines Großziffer-Textes berechnen
int16_t boldTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += boldAdvance(*s, scale);
  return w;
}

// 5×9-Punkt-Matrix-Großziffer Zelle für Zelle zeichnen (jede Zelle zieht DOT_INSET ein, sodass der Spalt die Hintergrundfarbe zeigt)
void drawBoldText(const char *s, int16_t x, int16_t y,
                  uint8_t scale, uint16_t c) {
  int8_t dot = scale - 2 * DOT_INSET;      // tatsächliche Kantenlänge der leuchtenden Quadrate (nach Einzug)
  if (dot < 1) dot = 1;                    // mindestens 1 px, sonst verschwindet alles

  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      // Dezimalpunkt: einzelnes eingezogenes Quadrat in Zeile 7 (Grundlinie)
      gfx->fillRect(x + DOT_INSET, y + 7 * scale + DOT_INSET, dot, dot, c);
      x += 2 * scale;
      continue;
    }
    const uint8_t *g = boldGlyph(ch);
    if (g) {
      for (uint8_t r = 0; r < 9; ++r) {
        uint8_t bits = g[r];
        for (uint8_t col = 0; col < 5; ++col) {
          if (bits & (0x10 >> col)) {
            gfx->fillRect(
              x + col * scale + DOT_INSET,
              y + r   * scale + DOT_INSET,
              dot, dot, c);
          }
        }
      }
    }
    x += 5 * scale + scale;
  }
}
```

---

## Häufige Probleme beheben

Keine Panik – 90 % der Probleme liegen an diesen wenigen Stellen. Geh sie der Reihe nach durch und meist ist es erledigt:

**Display nach dem Einschalten komplett dunkel (auch keine Hintergrundbeleuchtung)**

Wahrscheinlich ist der BL-Pin nicht richtig angeschlossen, oder die Zeile `digitalWrite(TFT_BL, HIGH)` im Code greift nicht. Prüfe zuerst das Kabel von GPIO7 zu BL, und probiere dann, BL direkt an 3,3 V zu hängen (ohne Code-Steuerung). Wenn die Hintergrundbeleuchtung angeht, das Display aber schwarz bleibt, sieh weiter unten.

**Hintergrundbeleuchtung an, aber Display komplett schwarz oder „Schnee"**

Problem mit der SPI-Verkabelung. Prüfe vor allem SCK (GPIO12), MOSI (GPIO11), CS (GPIO9), DC (GPIO10) – diese vier. DC und CS werden gerne vertauscht; wenn diese beiden falsch sitzen, bleibt das Display schwarz oder zeigt völlig Wirres. Außerdem steuert der letzte Parameter `true/false` des GC9A01-Treibers die Farbinvertierung – wenn die Farben wie auf einem Negativ wirken, wechsle `true` auf `false` (oder umgekehrt).

**Displayfarben insgesamt falsch, nicht cremegrün**

Ein Byte-Reihenfolge-Problem von RGB565. Die Arduino_GFX_Library regelt das meistens korrekt, aber falls die Farben völlig daneben sind, versuche beim Konstruieren von `Arduino_GC9A01` das abschließende `true` auf `false` zu setzen.

**Serial gibt ständig `[WARN] DHT11-Lesefehler` aus**

- Prüfe, ob der DAT-Pin wirklich an GPIO47 hängt
- Wenn du einen losen DHT11 verwendest (kein Modul), brauchst du einen 10-kΩ-Pull-up-Widerstand zwischen DAT und VCC – Modulversionen haben den meist schon eingelötet
- Das `delay(2000)` nach `dht.begin()` darf nicht gestrichen werden – der DHT11 braucht nach dem Einschalten ca. 1 Sekunde zum Stabilisieren, sonst kommt NaN
- Bestätige, dass VCC an 3,3 V hängt (in diesem Projekt). Falls dein DHT11 nur 5 V unterstützt, lege VCC an 5 V und setze einen Widerstand zwischen DAT und GPIO47 als Pegelwandler (oder wechsle einfach zur DHT11-Modulversion, die meist auch mit 3,3 V läuft)

**Zahlen aktualisieren sich, aber das Bild flackert/Tearing zeigt**

Funktioniert das Canvas-Doppelpuffer korrekt? Prüfe, ob im Code `gfx->flush()` nicht vergessen wurde, und zeichne **unbedingt auf das Canvas-Objekt `gfx->` und nicht auf `display->`**. Außerdem muss beim ESP32-S3 das richtige Board (`ESP32S3 Dev Module`) ausgewählt sein, sonst stimmt die SPI-Rate nicht.

**Compilerfehler: `'drawScene' was not declared in this scope`**

Das ist eine Reihenfolgenfrage der Funktionsdeklarationen. Stelle sicher, dass in der Prototypliste oben `void drawScene(unsigned long t);` steht, oder verschiebe die Definition von `drawScene` vor `loop()`.

---

## FAQ

**F: Kann ich die GPIO-Pins auf andere Nummern ändern?**
A: Ja, du musst nur die `#define`-Definitionen oben im Code anpassen – sonst nichts. DAT des DHT11 kann an einen beliebigen GPIO; für SCK/MOSI des GC9A01 werden empfohlen die Hardware-SPI-Standardpins des ESP32-S3 (GPIO 11/12) zu verwenden, um die höchste Geschwindigkeit zu erreichen. Andere Pins funktionieren ebenfalls, benötigen dann aber eine zusätzliche Software-SPI-Konfiguration.

**F: Kann ich den DHT11 gegen einen DHT22 tauschen?**
A: Absolut. Ändere einfach in Zeile 16 den Code auf `#define DHTTYPE DHT22`, der Rest bleibt gleich. Der DHT22 ist genauer (Temperatur ±0,5 °C, Luftfeuchte ±2~5 % RH), das Abtastintervall beträgt minimal 2 Sekunden (im Code ohnehin auf 2 Sekunden gesetzt – passt also perfekt).

**F: Welchen maximalen SPI-Takt unterstützt der GC9A01?**
A: Laut offizieller Spezifikation unterstützt der GC9A01 bis zu 100 MHz SPI-Takt. In der Praxis läuft der ESP32-S3 mit 80 MHz in der Regel problemlos. Die Arduino_GFX_Library nutzt automatisch die maximale Hardware-SPI-Rate – manuelle Konfiguration ist nicht nötig.

**F: Welche GPIO-Spannung hat der ESP32-S3? Kann ich direkt 5-V-Geräte anschließen?**
A: Der ESP32-S3 arbeitet mit 3,3 V an den GPIOs und **verträgt keine 5-V-Signale** – direkt an 5-V-Logik kann der Chip beschädigt werden. Auch das GC9A01-Runddisplay ist ein 3,3-V-Bauteil. Wenn dein DHT11 mit 5 V versorgt wird, liegt der High-Pegel am DAT-Pin bei ca. 4,5 V. Hier empfiehlt sich ein Spannungsteiler (10 kΩ + 20 kΩ) oder ein Pegelwandlermodul zum Abwärtswandeln.

**F: Welche Framerate und CPU-Auslastung hat der Code ungefähr?**
A: Der aktuelle Code läuft mit ca. 30 fps (33 ms pro Frame), die Renderzeit pro Frame beträgt ca. 8~15 ms (abhängig von der SPI-Rate), die CPU-Auslastung liegt bei ca. 20~40 %. Der zweite Kern des Dual-Core-ESP32-S3 ist komplett frei – bei Bedarf lässt sich das Sensor-Lesen auf Core 0 auslagern und das Rendern auf Core 1, was die Lauffähigkeit weiter verbessert.

**F: Was tun, wenn Temperatur und Luftfeuchte dauerhaft `--.-` anzeigen und sich nicht aktualisieren?**
A: Das bedeutet, dass `g_hasData` dauerhaft `false` bleibt – der DHT11 hat nie einen gültigen Wert geliefert. Gehe in dieser Reihenfolge vor: ① bestätigen, dass DAT an GPIO47 hängt; ② die DHT11-Modulversion braucht keinen zusätzlichen Pull-up, die lose Version braucht 10 kΩ; ③ im Serial-Monitor (Baudrate 115200) prüfen, ob `[DATA]` oder `[WARN]` ausgegeben wird – daran erkennst du, ob das Problem beim Sensor oder der Verkabelung liegt; ④ VCC-Spannung bestätigen (3,3 V empfohlen).

**F: Was bedeutet der `true`-Parameter (GC9A01-Konstruktor) im Code?**
A: Der vierte Parameter von `new Arduino_GC9A01(bus, TFT_RST, 0, true)` steuert die Farbinvertierung (RGB-Ausgabeunterschied zwischen IPS- und TN-Panels). Bei `true` werden die Farben normal ausgegeben, bei `false` entsteht eine Art „Negativ-Effekt" mit invertierten Farben. Wenn dein Display die Farben invertiert darstellt, wechsle einfach `true` auf `false`.

---

## Referenzen

- [Arduino_GFX_Library – offizielle Doku und Beispiele](https://github.com/moononournation/Arduino_GFX)
- [Adafruit DHT sensor library – Doku](https://github.com/adafruit/DHT-sensor-library)
- [GC9A01 Datenblatt (offizielles PDF)](https://www.waveshare.com/w/upload/5/5e/GC9A01A.pdf)
- [DHT11 offizielles Datenblatt (Hersteller Aosong)](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf)
- [Espressif ESP32-S3 Technical Reference Manual](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_cn.pdf)
