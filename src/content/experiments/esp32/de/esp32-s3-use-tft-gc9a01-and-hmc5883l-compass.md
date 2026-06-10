---
title: "ESP32-S3 + GC9A01 Runddisplay-Kompass: Ein Experiment mit HMC5883L – schoen anzusehen, aber nicht fuer die echte Navigation (Komplettes Tutorial)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/hmc5883l
category: esp32
date: 2026-06-10
intro: "Mit ESP32-S3 + GC9A01 Runddisplay + HMC5883L einen schoenen elektronischen Kompass gebaut – aber danach festgestellt, dass die Genauigkeit ernuechternd ist. Dieser Artikel dokumentiert vollstaendig Verkabelung, Kalibrierung und Code, und erklaert klar, warum diese Loesung nur fuer Experimente und Demos geeignet ist, nicht fuer echte Navigationsanwendungen."
image: "https://img.lingflux.com/2026/06/79dbcadeea8dba2436b055a92f76fc20.jpg"
---



# ESP32-S3 + GC9A01 + HMC5883L Runddisplay-Kompass – Machbar, schoen, aber die Genauigkeit... (Komplettes Tutorial)

Schwierigkeit: ⭐⭐⭐☆☆ (Mit etwas Grundwissen gut machbar)
Geschaetzte Dauer: 45 Minuten
Getestet mit: Arduino IDE 2.3.8 · Arduino_GFX_Library v1.6.5 · Adafruit_HMC5883_U v1.2.4

---

> ⚠️ **Vorab das Fazit:** Der Kompass, den man mit dieser Loesung baut, sieht beeindruckend aus und zeigt grob die richtige Richtung – aber die typische Genauigkeit liegt bei ±5°~±15° und wird stark von umgebenden Magnetfeldern beeinflusst. Zum Erlernen der Treiberprogrammierung, fuer Demos oder als Schreibtisch-Dekoration – voellig ausreichend. Fuer Outdoor-Navigation, Drohnenausrichtung oder andere Anwendungen mit strengen Genauigkeitsanforderungen – **nicht empfohlen**. Weiter unten wird erklaert, warum.

> **TL;DR (Schnellstart):**
> 1. Zunaechst einen I2C-Scan durchfuehren, um die Chip-Adresse zu bestaetigen – `0x0D` ist QMC5883L (Klon), `0x1E` ist das echte HMC5883L. Die passende Bibliothek installieren, sonst sind die Messwerte unbrauchbar
> 2. Nach der Verkabelungstabelle 12 Kabel verbinden (Display 8 + Sensor 4, 3.3V/GND koennen geteilt werden)
> 3. `DECLINATION_DEG` auf die magnetische Deklination der eigenen Stadt aendern (Peking ca. -6.5°, Tokio ca. -7.5°, Link zum Tool am Ende des Artikels)
> 4. Beim Einschalten die BOOT-Taste (GPIO0) gedrueckt halten, um die 15-sekuendige Rotationskalibrierung zu starten – langsam eine volle Umdrehung waagerecht durchfuehren
> 5. Nach dem Loslassen werden die Kalibrierungsdaten automatisch im NVS gespeichert – bleiben auch nach Stromausfall erhalten

---

## Vorwort

Als ich dieses GC9A01-Runddisplay gekauft habe, habe ich es eine Weile angestarrt – 1,28 Zoll, 240×240, ein perfekter Kreis. Das ist doch die geborene Kompassscheibe.

Also habe ich ein Wochenende darauf verwendet, es umzusetzen. Nach dem Vergleich mit dem Smartphone… nun ja, die Nadel zeigt grob in die richtige Richtung, nur dass sie etwas abweicht, so etwa zehn Grad. Nach ein paar weiteren Drehungen blieb sie stehen. Nach dem Neu starten drehte sie sich wieder kaum noch...

„Sicherlich nicht richtig kalibriert." Ich habe neu kalibriert, an einem anderen Ort getestet, mich mit dem iPhone im Kreis gedreht – der Unterschied blieb. Es ist kein Codefehler, sondern eine grundsaetzliche Einschraenkung dieses Sensormoduls. Man kann beobachten, dass auch ein naehrendes Handy die Messwerte beeinflusst.

Dieser Artikel hat also zwei Ziele: Erstens, den Runddisplay-Kompass vollstaendig aufzubauen – lauffaehiger Code, erfolgreiche Kalibrierung, und das Ergebnis sieht tatsaechlich gut aus. Zweitens, die Genauigkeitseinschraenkungen klar darzustellen, damit man vor dem Bau weiss, „wo es hapert" – und nicht erst danach feststellt, dass die Nadel nicht mit Google Maps uebereinstimmt.

Wer die Ansteuerung von GC9A01 + HMC5883L lernen moechte oder eine coole Schreibtisch-Dekoration bauen will – dieses Projekt lohnt sich voll und ganz. Wenn das Ziel jedoch „Navigationsgenauigkeit" ist, empfiehlt es sich, direkt zum Abschnitt „Geeignet fuer echte Projekte?" am Ende zu springen, bevor man weitermacht.

---

## Ergebnis des Experiments

![](https://img.lingflux.com/2026/06/61587ad00164cf25e866feb4066e069f.jpg)

Auf dem GC9A01-Runddisplay wird in Echtzeit ein Kompass-Zifferblatt angezeigt: Der rote Zeiger zeigt nach Norden, die gruene Zahl in der Mitte zeigt den aktuellen Azimut (0°~359°), gelbe Buchstaben kennzeichnen die naechste der acht Hauptrichtungen (N / NE / E / SE / S / SW / W / NW). Beim Einschalten kann durch Gedrueckthalten der BOOT-Taste der 15-sekuendige Rotationskalibrierungsmodus gestartet werden – das Display zeigt einen Fortschrittsbalken und den aktuellen Magnetfeldbereich an. Nach Abschluss der Kalibrierung bewegt sich der Zeiger fluessig bei ca. 25fps, ohne das unkalibriert typische Zittern.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/DDc_7iRCPy8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

> **Zur Genauigkeit, gleich vorweg:** Ein kalibriertes HMC5883L erreicht unter idealen Bedingungen (fernab von Metall und anderen Magnetfeldquellen) einen Azimutfehler von ca. ±5°. In der Naehe eines Computers, Netzteils, Lautsprechers oder Schraubenziehers steigt der Fehler leicht auf ±15° und mehr. Im taeglichen Schreibtischbetrieb stimmt „die grobe Richtung", aber ob dieses Modul, das ich gekauft habe, ein Original ist, weiss ich nicht – manchmal reagiert es einfach nicht. Auf eine Genauigkeit im einstelligen Gradbereich sollte man nicht hoffen. Das ist eine grundsaetzliche Einschraenkung der Hardware, kein Codeproblem. Der Abschnitt „Geeignet fuer echte Projekte?" erklaert dies ausfuehrlicher.

---

## Komponentenbeschreibung

**GC9A01 Rund-TFT-Display**

Stellt man sich ein rundes Uhrendisplay mit 3,2 cm Durchmesser vor – genau das ist der GC9A01. SPI-Schnittstelle, Aufloesung 240×240, der Controller ist im Display integriert. Der ESP32 muss nur Pixeldaten senden, kein externes RAM noetig. Gewaehlt wurde es, weil die runde Form natuerlich fuer eine Kompass-UI praedestiniert ist und Arduino_GFX_Library vollstaendig unterstuetzt wird – die Treiberprogrammierung erfordert nur wenige Zeilen Code.

| Parameter | Spezifikation |
| --- | --- |
| Aufloesung | 240 × 240 px |
| Schnittstelle | SPI (max. 80 MHz) |
| Versorgung | 3.3V |
| Hintergrundbeleuchtung | High-Pegel aktiv |
| Typischer Stromverbrauch | ca. 20 mA (volle Helligkeit) |



**GC9A01 Display-Modul (8 Pins)**

| Pin-Beschriftung | Funktion |
| --- | --- |
| VCC | 3.3V Versorgung |
| GND | Masse |
| SCL / CLK | SPI-Takt |
| SDA / MOSI | SPI-Daten (Master→Slave) |
| CS | Chip-Select, aktiv Low |
| DC | Daten-/Befehlsauswahl |
| RST | Hardware-Reset, aktiv Low |
| BL | Hintergrundbeleuchtung, High-Pegel aktiv |



**HMC5883L / QMC5883L Dreiachsen-Magnetometer**

Das Magnetometer ist die „Nase" des Kompasses. Es erfasst die Staerke des Erdmagnetfelds in X/Y/Z-Richtung und berechnet mit inversen trigonometrischen Funktionen die Blickrichtung. I2C-Schnittstelle, 3.3V-Versorgung, eine Messung dauert nur wenige Millisekunden.

Wichtig: Die allermeisten Module, die als „HMC5883L" verkauft werden, enthalten tatsaechlich den QMC5883L-Chip von QST – beide sind pinkompatibel, haben aber voellig unterschiedliche Register und erfordern unterschiedliche Treiberbibliotheken. **Nicht gleich eine Bibliothek installieren – zunaechst den I2C-Scan wie unten beschrieben durchfuehren, um den tatsaechlichen Chip zu identifizieren. Das spart viel Fehlersuche.**

| Parameter | HMC5883L (Original) | QMC5883L (Klon) |
| --- | --- | --- |
| I2C-Adresse | 0x1E | 0x0D |
| Messbereich | ±8 Gauss | ±8 Gauss |
| Aufloesung | 2 mGauss | 2 mGauss |
| Rauschdichte | ~2 mGauss/√Hz | ~2 mGauss/√Hz |



**HMC5883L / QMC5883L Magnetometer-Modul (4 haeufige Pins)**

| Pin-Beschriftung | Funktion |
| --- | --- |
| VCC | 3.3V Versorgung |
| GND | Masse |
| SDA | I2C-Daten |
| SCL | I2C-Takt |
| DRDY | Data-Ready-Interrupt (in diesem Projekt nicht verwendet, kann offen bleiben) |

Beide Chips haben aehnliche Grundleistungen und eignen sich beide fuer Experimente und Demos. Klarzustellen ist jedoch: Keines der Magnetometer-Module in dieser Preisklasse bietet On-Chip-Temperaturkompensation oder Sensorfusion – sie liefern nur grundlegende zweidimensionale Magnetfeldmessungen. Das bestimmt die Genauigkeitsgrenze und bedeutet, dass sie nur fuer Demos und Lernzwecke geeignet sind, nicht fuer echte Navigationsanwendungen.

---

## BOM (Stueckliste)

| Komponente | Modell / Spezifikation | Menge | Referenzpreis |
| --- | --- | --- | --- |
| Hauptentwicklungsboard | ESP32-S3 (beliebiges Board) | 1 | ¥25~40 |
| Rund-TFT-Display | GC9A01, 1.28 Zoll, 240×240 | 1 | ¥12~20 |
| Magnetometer-Modul | HMC5883L oder QMC5883L | 1 | ¥3~8 |
| Dupont-Kabel | Maennlich-weiblich, 20cm | mehrere | ¥3 |

---

## Verkabelung

> Es empfiehlt sich, nach dem Verkabelen jeden Draht anhand der Tabelle zu ueberpruefen. Dieser Schritt loest 80% der „Warum passiert nichts?"-Probleme.

**GC9A01-Runddisplay → ESP32-S3**

| Display-Pin | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (oder direkt auf 3.3V fuer Dauerbetrieb) |

**HMC5883L / QMC5883L → ESP32-S3**

| Sensor-Pin | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO14 |
| SCL | GPIO13 |



---

## Zu installierende Bibliotheken

Vor der Installation einen Schritt erledigen – die Magnetometer-Chip-Modellbestaetigung. Den folgenden Code hochladen, den Seriellen Monitor oeffnen (115200) und die ausgegebene I2C-Adresse pruefen:

```cpp
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(13, 14);  // SDA=13, SCL=14, entsprechend diesem Projekt

  Serial.println("Scanning I2C...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("Found device at 0x%02X\n", addr);
    }
  }
  Serial.println("Done.");
}

void loop() {}
```

- Wird `0x1E` ausgegeben → echtes HMC5883L, **Adafruit HMC5883 Unified** installieren (von Adafruit)
- Wird `0x0D` ausgegeben → QMC5883L, die `#include`- und Sensorobjekt-Deklarationen im Code muessen auf die entsprechende Bibliothek geaendert werden (siehe FAQ Punkt 3)

Nach der Chip-Identifikation in der Arduino IDE → Bibliotheksverwalter suchen und installieren:

| Bibliothek | Guelter Chip | Getestete Version |
| --- | --- | --- |
| Arduino_GFX_Library | — | v1.6.5 |
| Adafruit HMC5883 Unified | HMC5883L (0x1E) | v1.2.4 |
| Adafruit Unified Sensor | Beide noetig | v1.1.15 |

Bei QMC5883L (0x0D) gibt es in den haeufigen Fragen weiter unten eine Alternative.

---

## Kompletter Code

```cpp
#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>
#include <Preferences.h>
#include <math.h>

// --- Schritt 1: Pin-Definitionen ---
#define TFT_SCK  12
#define TFT_MOSI 11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7
#define I2C_SDA  14
#define I2C_SCL  13

// Beim Einschalten diese Taste gedrueckt halten, um den Kalibrierungsmodus zu starten
// (BOOT-Taste, GPIO0, kein zusaetzlicher Taster noetig)
#define CAL_BTN   0

// Magnetische Deklination (West negativ) — Tool: https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
// Peking ≈ -6.5°, Shanghai ≈ -5.5°, Guangzhou ≈ -3°, Tokio ≈ -7.5°
// Ohne Anpassung verschiebt sich der gesamte Kompass um X Grad, alle Richtungen sind falsch
#define DECLINATION_DEG  (-3.0f)

// --- Schritt 2: Display-Objekt initialisieren ---
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01  *gfx = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas Double-Buffering: Zunaechst einen kompletten Frame im Speicher zeichnen,
// dann auf einmal an das Display senden – verhindert Flackern
// Speicherbedarf: 240×240×2 = 115 KB (PSRAM oder interner SRAM des ESP32-S3 reicht aus)
Arduino_Canvas  *canvas = new Arduino_Canvas(240, 240, gfx, 0, 0);

// --- Sensor-Objekt ---
Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);

// --- Kalibrierungsparameter (Hard-Eisen-Offset + Soft-Eisen-Skalierung, im NVS gespeichert) ---
Preferences prefs;
float calOffX = 0, calOffY = 0;
float calSclX = 1, calSclY = 1;

// --- EMA-Tiefpassfilter-Parameter ---
float gSmooth    = 0;
bool  gFirstRead = true;

// alpha kleiner = glaetter (aber langsamere Reaktion); fuer Schreibtischbetrieb 0.15,
// fuer Handhaltung kann auf 0.25 erhoeht werden
#define EMA_ALPHA  0.15f

// --- Farbdefinitionen (RGB565-Format) ---
#define C_BG      0x0000   // Schwarzer Hintergrund
#define C_RING    0x4208   // Dunkelgrauesser Ring
#define C_TICK    0x7BEF   // Graue kleine Teilstriche
#define C_MAJOR   0xFFFF   // Weissse Hauptteilstriche / Beschriftung
#define C_NORTH   0xF800   // Rotes N
#define C_NDL_N   0xF800   // Rote Nadel (Nordseite)
#define C_NDL_S   0xCE79   // Silberne Nadel (Suedseite)
#define C_DEG     0x07E0   // Gruene Gradzahl
#define C_DIR     0xFFE0   // Gelbe Richtungsbuchstaben

const char* kDir[] = {"N","NE","E","SE","S","SW","W","NW"};

#define CX 120   // Mittelpunkt X
#define CY 120   // Mittelpunkt Y
#define R  100   // Zifferblatt-Radius

// ─────────────────────────────────────────────
//  Azimut lesen (mit Hard-/Soft-Eisen-Kalibrierungskorrektur)
// ─────────────────────────────────────────────
float readHeading() {
  sensors_event_t ev;
  mag.getEvent(&ev);

  // Hard-Eisen-Offset abziehen – stoert feste Magnetfelder in der Naehe (Schrauben, Kupferpfeiler usw.)
  float x = ev.magnetic.x - calOffX;
  float y = ev.magnetic.y - calOffY;
  // Soft-Eisen-Normalisierung: die elliptische Magnetfeld-Antwort auf eine Kreisform zurueckfuehren
  if (calSclX > 0.01f) x /= calSclX;
  if (calSclY > 0.01f) y /= calSclY;

  float h = atan2f(y, x) + DECLINATION_DEG * (float)M_PI / 180.0f;
  if (h <  0)               h += 2.0f * (float)M_PI;
  if (h > 2.0f*(float)M_PI) h -= 2.0f * (float)M_PI;
  return h * 180.0f / (float)M_PI;
}

// ─────────────────────────────────────────────
//  EMA-Tiefpassfilter (korrekte Behandlung des 0°/360°-Umsprungssprungs)
// ─────────────────────────────────────────────
float emaFilter(float newAngle) {
  if (gFirstRead) { gFirstRead = false; return newAngle; }
  float d = newAngle - gSmooth;
  if (d >  180.0f) d -= 360.0f;   // Z.B. Sprung von 359° auf 1°: Differenz sollte +2° sein, nicht -358°
  if (d < -180.0f) d += 360.0f;
  float r = gSmooth + d * EMA_ALPHA;
  if (r <   0.0f) r += 360.0f;
  if (r >= 360.0f) r -= 360.0f;
  return r;
}

// ─────────────────────────────────────────────
//  Vollbild-Rendering (kompletten Frame zeichnen, dann an Display senden – verhindert Flackern)
// ─────────────────────────────────────────────
void drawFrame(float angle) {
  canvas->fillScreen(C_BG);

  // Aeusserrer Ring (4 Pixel breit, fuer einen Rahmen-Effekt)
  for (int r = R; r > R - 4; r--)
    canvas->drawCircle(CX, CY, r, C_RING);

  // Teilstriche: alle 10° einer, alle 30° verlaengert, alle 90° in Weiss
  for (int deg = 0; deg < 360; deg += 10) {
    float rad = deg * (float)M_PI / 180.0f;
    int   len = (deg % 30 == 0) ? 12 : 6;
    canvas->drawLine(
      CX + (int)(cosf(rad) * (R - 5)),    CY + (int)(sinf(rad) * (R - 5)),
      CX + (int)(cosf(rad) * (R-5-len)),  CY + (int)(sinf(rad) * (R-5-len)),
      (deg % 90 == 0) ? C_MAJOR : C_TICK
    );
  }

  // N/E/S/W-Beschriftung, N in Rot hervorgehoben
  canvas->setTextSize(2);
  canvas->setTextColor(C_NORTH); canvas->setCursor(CX-6,    CY-R+20);  canvas->print("N");
  canvas->setTextColor(C_MAJOR); canvas->setCursor(CX+R-32, CY-7);     canvas->print("E");
                                 canvas->setCursor(CX-6,    CY+R-32);  canvas->print("S");
                                 canvas->setCursor(CX-R+20, CY-7);     canvas->print("W");

  // Nadel (3 Pixel breit, fuer bessere Sichtbarkeit)
  float rad  = angle * (float)M_PI / 180.0f;
  float perp = rad + (float)M_PI / 2.0f;
  int   pdx  = (int)roundf(cosf(perp));
  int   pdy  = (int)roundf(sinf(perp));
  int   nx   = CX + (int)(sinf(rad) * 68);   // Rote Nadel (Nordseite)
  int   ny   = CY - (int)(cosf(rad) * 68);
  int   sx   = CX - (int)(sinf(rad) * 42);   // Silberne Nadel (Suedseite, kuerzer)
  int   sy   = CY + (int)(cosf(rad) * 42);
  for (int d = -1; d <= 1; d++) {
    canvas->drawLine(CX+pdx*d, CY+pdy*d, nx+pdx*d, ny+pdy*d, C_NDL_N);
    canvas->drawLine(CX+pdx*d, CY+pdy*d, sx+pdx*d, sy+pdy*d, C_NDL_S);
  }

  // Kleine Mittelachse (Dekoration)
  canvas->fillCircle(CX, CY, 9, C_RING);
  canvas->drawCircle(CX, CY, 9, 0xA534);
  canvas->fillCircle(CX, CY, 3, C_MAJOR);

  // Zentrale Gradanzeige (gruen) und 8-Richtungs-Buchstaben (gelb)
  canvas->setTextSize(2);
  canvas->setTextColor(C_DEG);
  char buf[8]; sprintf(buf, "%3d", (int)angle);
  canvas->setCursor(CX - 18, CY - 14); canvas->print(buf);

  int   idx = ((int)(angle + 22.5f) % 360) / 45;
  int   w   = strlen(kDir[idx]) * 6;
  canvas->setTextSize(1);
  canvas->setTextColor(C_DIR);
  canvas->setCursor(CX - w/2, CY + 6); canvas->print(kDir[idx]);

  canvas->flush();   // ← Gesamten Frame auf einmal an das Display senden – diese Zeile ist der Schluessel gegen Flackern
}

// ─────────────────────────────────────────────
//  15-Sekunden-Rotationskalibrierung
//  Prinzip: Maximal-/Minimalwerte des Sensors in alle Richtungen aufzeichnen,
//          daraus Hard-Eisen-Offset und Soft-Eisen-Skalierung berechnen
// ─────────────────────────────────────────────
void runCalibration() {
  float minX =  1e6f, maxX = -1e6f;
  float minY =  1e6f, maxY = -1e6f;
  const uint32_t DUR = 15000;
  uint32_t t0 = millis();

  while (millis() - t0 < DUR) {
    sensors_event_t ev; mag.getEvent(&ev);
    if (ev.magnetic.x < minX) minX = ev.magnetic.x;
    if (ev.magnetic.x > maxX) maxX = ev.magnetic.x;
    if (ev.magnetic.y < minY) minY = ev.magnetic.y;
    if (ev.magnetic.y > maxY) maxY = ev.magnetic.y;

    // Kalibrierungsfortschritt in Echtzeit anzeigen
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR);  canvas->setTextSize(2);
    canvas->setCursor(15, 60);  canvas->print("CALIBRATING");
    canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
    canvas->setCursor(8, 95);   canvas->print("Slowly rotate 360 deg");
    canvas->setCursor(18, 109); canvas->print("Keep device level");
    // Fortschrittsbalken
    int p = (millis() - t0) * (R*2-2) / DUR;
    canvas->drawRect(20, 130, R*2, 14, C_MAJOR);
    canvas->fillRect(21, 131, p, 12, 0x07E0);
    // Magnetfeldbereich in Echtzeit anzeigen (hilft zu pruefen, ob eine volle Umdrehung erreicht wurde)
    char b[44];
    canvas->setTextColor(0x7BEF);
    sprintf(b, "X[%.1f ~ %.1f]", minX, maxX);
    canvas->setCursor(8, 157); canvas->print(b);
    sprintf(b, "Y[%.1f ~ %.1f]", minY, maxY);
    canvas->setCursor(8, 170); canvas->print(b);
    canvas->flush();
    delay(50);
  }

  // Offset und Skalierung berechnen
  calOffX = (maxX + minX) / 2.0f;
  calOffY = (maxY + minY) / 2.0f;
  calSclX = (maxX - minX) / 2.0f;  if (calSclX < 0.01f) calSclX = 1.0f;
  calSclY = (maxY - minY) / 2.0f;  if (calSclY < 0.01f) calSclY = 1.0f;

  // Im NVS speichern (uebersteht Stromausfall)
  prefs.begin("compass", false);
  prefs.putFloat("offX", calOffX);  prefs.putFloat("offY", calOffY);
  prefs.putFloat("sclX", calSclX);  prefs.putFloat("sclY", calSclY);
  prefs.end();

  // Kalibrierungsergebnis anzeigen
  canvas->fillScreen(C_BG);
  canvas->setTextColor(0x07E0); canvas->setTextSize(2);
  canvas->setCursor(30, 88); canvas->print("CAL DONE!");
  canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
  char b[44];
  sprintf(b, "offX = %.1f", calOffX); canvas->setCursor(10, 120); canvas->print(b);
  sprintf(b, "offY = %.1f", calOffY); canvas->setCursor(10, 133); canvas->print(b);
  sprintf(b, "sclX = %.1f", calSclX); canvas->setCursor(10, 148); canvas->print(b);
  sprintf(b, "sclY = %.1f", calSclY); canvas->setCursor(10, 161); canvas->print(b);
  canvas->flush();
  delay(3000);
}

// ─────────────────────────────────────────────
//  Zuletzt gespeicherte Kalibrierungsdaten aus NVS laden
// ─────────────────────────────────────────────
void loadCalibration() {
  prefs.begin("compass", true);
  calOffX = prefs.getFloat("offX", 0.0f);
  calOffY = prefs.getFloat("offY", 0.0f);
  calSclX = prefs.getFloat("sclX", 1.0f);
  calSclY = prefs.getFloat("sclY", 1.0f);
  prefs.end();
  if (calSclX < 0.01f) calSclX = 1.0f;
  if (calSclY < 0.01f) calSclY = 1.0f;
  Serial.printf("[CAL] off=(%.2f, %.2f)  scl=(%.2f, %.2f)\n",
                calOffX, calOffY, calSclX, calSclY);
}

// ─────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TFT_BL, OUTPUT); digitalWrite(TFT_BL, HIGH);  // Hintergrundbeleuchtung einschalten
  pinMode(CAL_BTN, INPUT_PULLUP);

  gfx->begin();
  canvas->begin();       // Framebuffer zuweisen, dabei werden ca. 115 KB Speicher belegt

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000); // 400 kHz Schnellmodus, verringert I2C-Leseverzoegerung

  if (!mag.begin()) {
    // Sensor nicht gefunden – rote Fehlermeldung auf dem Display anzeigen
    canvas->fillScreen(0xF800);
    canvas->setTextColor(0xFFFF); canvas->setTextSize(2);
    canvas->setCursor(10, 100); canvas->print("SENSOR ERROR");
    canvas->setCursor(10, 125); canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(500);
  }

  loadCalibration();

  // Beim Einschalten BOOT(GPIO0) gedrueckt halten → Rotationskalibrierung starten
  if (digitalRead(CAL_BTN) == LOW) {
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR); canvas->setTextSize(1);
    canvas->setCursor(10, 112); canvas->print("Release to start cal...");
    canvas->flush();
    while (digitalRead(CAL_BTN) == LOW) delay(10);
    delay(500);
    runCalibration();
  }

  // Erste instabile Aufwaerm-Messwerte verwerfen
  for (int i = 0; i < 8; i++) {
    sensors_event_t ev; mag.getEvent(&ev); delay(15);
  }
  gSmooth    = readHeading();
  gFirstRead = false;
}

// ─────────────────────────────────────────────
//  Loop: Lesen → Filtern → Rendern, Zyklus ca. 25fps
// ─────────────────────────────────────────────
void loop() {
  float raw = readHeading();
  gSmooth   = emaFilter(raw);
  drawFrame(gSmooth);
  delay(30);  // 30ms ≈ 33fps, tatsaechlich mit Rendering-Zeit ca. 25fps
}
```

### Code-Erklaerung

**Warum Canvas verwenden?** `Arduino_Canvas` oeffnet einen 115KB grossen „Zeichenblock" im Speicher, zeichnet dort den gesamten Frame und sendet ihn dann mit `canvas->flush()` auf einmal an das Display. Wenn man direkt auf das Display zeichnet, wird jeder Strich sofort sichtbar – die Nadel flackert dann deutlich. Canvas loest dieses Problem, kostet aber zusaetzlichen Speicher.

**Was macht `readHeading()`?** Die vom Sensor gelesenen X/Y-Magnetfeldstaerken werden um den Hard-Eisen-Offset verringert (feste Magnetfeldstoerungen beseitigen), dann durch die Soft-Eisen-Skalierungskoeffizienten geteilt (Achsen-Empfindlichkeitsunterschiede korrigieren) und schliesslich die magnetische Deklination addiert, um den Winkel zur geografischen Nordrichtung zu erhalten.

**Warum muss `emaFilter()` den Umsprung behandeln?** Wenn die Nadel von 359° auf 1° springt, betraegt die Differenz -358° – ein direkter gewichteter Durchschnitt wuerde die Nadel in die falsche Richtung drehen. Der Code beschraenkt zunaechst die Differenz auf [-180°, +180°] und glaettet dann, um den Uebergang ueber 0° korrekt zu behandeln.

**Wie funktioniert die Kalibrierung?** Eine volle Drehung in der Horizontalebene erzeugt X/Y-Sensorwerte, die eine Ellipse bilden (im Idealfall ein Kreis). Maximal- und Minimalwerte werden aufgezeichnet, der Mittelpunkt ergibt den Hard-Eisen-Offset und die Halbachsen die Soft-Eisen-Skalierung. Nach Abschluss werden die Daten im NVS gespeichert (aehnlich dem EEPROM eines Smartphones) und beim naechsten Einschalten automatisch geladen – keine erneute Kalibrierung noetig.

---

## Haeufige Probleme und Loesungen

Keine Panik – 90% der Probleme haben eine dieser Ursachen.

**Display bleibt schwarz oder weiss, zeigt nichts an.** Zunaechst pruefen, ob der BL-Pin (Hintergrundbeleuchtung) auf High-Pegel liegt – wenn GPIO7 verwendet wird, sicherstellen, dass `digitalWrite(TFT_BL, HIGH)` im Code steht. Wenn direkt 3.3V angeschlossen ist, sollte die Hintergrundbeleuchtung dauern leuchten; schwarzes Display bedeutet ein Problem mit anderen Pins. Dann anhand der Verkabelungstabelle jeden Draht pruefen – CS und DC vertauscht ist ein haeufiger Fehler.

**Serieller Monitor zeigt `SENSOR ERROR`, Display zeigt roten Fehler.** Das Magnetometer antwortet nicht – wahrscheinlich ein I2C-Verkabelungsproblem. SDA/SCL vertauscht oder an falsche GPIOs angeschlossen. Sicherstellen, dass `Wire.begin(13, 14)` den tatsaechlich verwendeten Pins entspricht. Eine andere Moeglichkeit: Das Modul hat keine 3.3V-Versorgung – mit einem Multimeter den VCC-Pin messen.

**Nadel springt wild, ist voellig ungenau oder bleibt in einer Richtung stehen.** Wahrscheinlichste Ursache: Das Modul ist ein QMC5883L (0x0D), aber der Code verwendet die HMC5883L-Bibliothek – beide haben voellig unterschiedliche Registerdefinitionen, die ausgelesenen Werte sind unbrauchbar. Zunaechst den I2C-Scan ausfuehren und die Adresse pruefen. Bei 0x0D muessen `#include <Adafruit_HMC5883_U.h>` und das Sensorobjekt durch die Schreibweise der QMC5883LCompass-Bibliothek ersetzt werden – es gibt fertige Anpassungsbeispiele online.

**Kalibrierung abgeschlossen, aber die Richtung weicht immer noch um 10°~20° ab.** Pruefen, ob `DECLINATION_DEG` auf den Wert der eigenen Stadt geaendert wurde – eine Abweichung von 5° bei diesem Parameter verschiebt alle Richtungen systematisch. Tokio ca. -7.5°, Peking ca. -6.5°, genaue Werte mit dem NOAA-Tool am Ende des Artikels ermitteln. Eine weitere Ursache koennen starke Magnetfelder in der Naehe waehrend der Kalibrierung sein (Smartphone, Schraubenzieher, Lautsprechermagnet) – an einem freien Ort neu kalibrieren.

**Kompilierungsfehler `Adafruit_HMC5883_U.h: No such file or directory`.** Bibliothek nicht oder falsch installiert. Arduino IDE → Werkzeuge → Bibliotheken verwalten, nach `HMC5883` suchen, Adafruit HMC5883 Unified sowie die Abhaengigkeit Adafruit Unified Sensor installieren.

---

## FAQ

**F: Was ist der Unterschied zwischen HMC5883L und QMC5883L? Kann man dieselbe Bibliothek verwenden?**
A: Nein, sie koennen nicht gemischt werden. Beide sind pinkompatibel (auf der Platine sehen sie gleich aus), aber die internen Registeradressen und Treiberprotokolle sind unterschiedlich – mit der falschen Bibliothek liefert der Sensor nur unbrauchbare Werte. HMC5883L hat die I2C-Adresse 0x1E, QMC5883L hat 0x0D – ein I2C-Scan klaert das in einer Sekunde.

**F: Kann der BL-Hintergrundbeleuchtungs-Pin direkt auf 3.3V angeschlossen werden, oder muss er an einen GPIO?**
A: Direkt auf 3.3V ist voellig in Ordnung – das Display leuchtet dann dauerhaft. Der Vorteil eines GPIO ist die programmgesteuerte Helligkeitsregelung oder das Abschalten der Hintergrundbeleuchtung im Ruhezustand zum Stromsparen. Wenn diese Funktionen nicht gebraucht werden, spart ein Anschluss an 3.3V einen GPIO.

**F: Wie ermittelt man den genauen Wert von `DECLINATION_DEG` fuer die eigene Stadt?**
A: Das magnetische Deklinations-Berechnungstool von NOAA (siehe Referenzen am Ende) verwenden, die Koordinaten der eigenen Stadt eingeben, als Model WMM waehlen – es liefert die genaue magnetische Deklination fuer das aktuelle Datum. Ost-Abweichung ist positiv, West-Abweichung negativ. Ostjapanische Staedte liegen generell zwischen -7° und -8°, die chinesische Ostkueste zwischen -5° und -6°.

**F: Was aendert sich, wenn man `EMA_ALPHA` vergroessert oder verkleinert?**
A: Je groesser alpha, desto schneller reagiert die Nadel – aber sie zittert staerker. Je kleiner alpha, desto glaetter die Nadel – aber mit spuerbarem Nachzieheffekt beim Drehen. 0.15 eignet sich fuer waagerechte Platzierung auf dem Tisch; bei Handhaltung kann auf 0.25 bis 0.3 erhoeht werden. Wertebereich: 0.0 (gar keine Bewegung) bis 1.0 (kein Filter, Rohwert).

**F: Wo werden die Kalibrierungsdaten gespeichert? Sind sie nach dem Neu-Flashen des Codes noch vorhanden?**
A: Die Kalibrierungsdaten liegen im NVS des ESP32 (nicht-fluechtiger Speicher, aehnlich EEPROM) – ein neues Flashen des Codes loescht den NVS nicht, beim naechsten Einschalten werden die Daten automatisch geladen. Nur bei einem „Erase Flash"-Vorgang gehen sie verloren, dann muss einmal neu kalibriert werden.

**F: Ist der 115 KB grosse Framebuffer ein Problem? Funktioniert das mit dem ESP32-C3?**
A: Der ESP32-S3 hat 512KB SRAM – 115KB sind kein Problem. Der ESP32-C3 hat nur 400KB SRAM, und zusammen mit Code und Stack wird es knapp – PSRAM-Version oder ein kleineres Display wird empfohlen. Der originale ESP32 (WROOM/WROVER) hat noch weniger SRAM; die WROVER-Version mit PSRAM funktioniert, die WROOM-Version ohne PSRAM stuerzt wahrscheinlich mit OOM ab.

**F: Mein Kompass weicht um mehr als zehn Grad vom Smartphone ab – ist das normal?**
A: Bei dieser Loesung ist eine Abweichung von mehr als zehn Grad voellig normal und kein Bug. Das HMC5883L/QMC5883L hat in einer gestoerten Umgebung einen typischen Fehlerbereich von ±10°~±15°. Wenn der Fehler stabil bei ±5° oder weniger liegt, gilt die Kalibrierung bereits als gut. Fuer eine hoehere Genauigkeit ist ein praesiserer Sensor mit 9-Achsen-Fusion noetig – Parameteranpassung allein reicht nicht.

**F: Kann diese Loesung fuer echte Navigations- oder Peilungsprodukte verwendet werden?**
A: Nicht empfohlen. Die Genauigkeit liegt nur bei ±5°~±15° und wird stark von umgebenden Magnetfeldern beeinflusst; zudem gibt es keine Neigungskompensation – sobald das Geraet nicht streng waagerecht gehalten wird, steigt der Fehler deutlich an. Fuer Demos, zum Erlernen der Grundlagen oder als Schreibtisch-Dekoration voellig ausreichend. Bei Anwendungen mit echter Navigationsgenauigkeit wird ein ICM-20948 mit hardwareseitiger Sensorfusion empfohlen.

---

## Ist das HMC5883L fuer echte Projekte geeignet?

Kurze Antwort: Nein.

Fuer Experimente und Demos ist es in Ordnung – Treiberprogrammierung lernen, Maker-Projekte praesentieren, Schreibtisch-Dekoration – alles kein Problem. Aber fuer ein Produkt, das zuverlaessige Richtungserkennung braucht, gibt es drei unueberwindbare Probleme:

Erstens: Keine Neigungskompensation. Sobald das Modul nicht waagerecht liegt, steigt der Azimutfehler schnell an – eine Neigung von 20° kann zu einer Richtungsabweichung von ueber 10° fuehren. Das iPhone kompensiert diesen Fehler in Echtzeit mit einem Beschleunigungssensor; dieses Modul kann das von sich aus nicht – es wuerde einen zusaetzlichen MPU6050 und eine geaenderte Algorithmik erfordern.

Zweitens: Starke Beeinflussung durch umgebende Magnetfelder. Ein naehrendes PC-Netzteil, USB-Kabel oder Metallgestell verfaelscht die Messwerte. Diese Stoerungen sind dynamisch – eine einmalige Kalibrierung im NVS kann Magnetfelder, die sich in Bewegung in Echtzeit aendern, nicht kompensieren.

Drittens: Die Qualitaet der im Handel erhaeltlichen Module variiert stark. Die meisten sind QMC5883L-Klone ohne die On-Chip-Temperaturkompensation des originalen HMC5883L – bei Temperaturaenderungen driften die Messwerte.

Wenn ein Projekt zuverlaessige Richtungserkennung benoetigt, ist der ICM-20948 (integrierter 9-Achsen-Sensor + Hardware-DMP-Fusion) die bessere Wahl – oder direkt ein GPS-Modul mit Richtungsbestimmung ueber zwei Koordinatenpunkte. Genauigkeit und Stabilitaet sind in einer anderen Liga.

Die korrekte Einordnung dieses Projekts ist: Ein kompaktes, vollstaendiges Lernbeispiel. Es fuehrt vollstaendig durch die Kette „Magnetometer-Treiber → Hard-Eisen-Kalibrierung → Filter → Anzeige" – dieses Wissen laesst sich eins zu eins auf bessere Sensoren uebertragen.

---

## Erweiterungsideen

Nach der Basisversion gibt es mehrere Richtungen fuer weitere Erkundungen:

Ein MPU6050-6-Achsen-Sensor ergaenzen und die Beschleunigungsdaten fuer eine Neigungskompensation nutzen. Das ist eine der oben erwaehnten groessten Einschraenkungen – die aktuelle Version hat nur 2D-Magnetfelder; sobald das Geraet leicht geneigt ist, entsteht ein spuerbarer Fehler. Mit Neigungskompensation bleibt die Anzeige auch bei aufrechtem Halten korrekt – das ist einer der Kerngruende, warum der iPhone-Kompass stabil ist. Dies ist der wertvollste Schritt, um das Projekt „vom Spielzeug zum brauchbaren Geraet" weiterzuentwickeln.

Ein SD-Karten-Modul anschliessen und mit LVGL oder einer eigenen Karte den Kompassrichtungspfeil darauf legen – ein Offline-Navigationsgeraet bauen. Die Displayflaeche des Runddisplays ist begrenzt, aber fuer die Anzeige der aktuellen Blickrichtung und eines Zielrichtungspfeils reicht es voellig.

Den Azimut ueber Wi-Fi an einen MQTT-Broker senden und in Home Assistant oder ein eigenes Dashboard integrieren – einen Schreibtisch-Richtungssensor bauen, z.B. zur Bestimmung der Ausrichtung von Tueren/Fenstern oder zum Ausrichten von Antennen.

---

## Referenzen

- HMC5883L Original-Datenblatt (Honeywell): https://cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf
- QMC5883L Datenblatt (QST): https://datasheetspdf.com/pdf/1309218/QST/QMC5883L/1
- Arduino_GFX_Library GitHub: https://github.com/moononournation/Arduino_GFX
- Adafruit_HMC5883_U GitHub: https://github.com/adafruit/Adafruit_HMC5883_U
- ESP32-S3 Produktseite (Espressif): https://www.espressif.com/en/products/socs/esp32-s3
- Magnetische Deklination berechnen (NOAA): https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
