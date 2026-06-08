---
title: "ESP32-S3 + INMP441 + GC9A01 DIY kreisförmiges Audio-Spektrogramm | I2S + FFT + SPI Komplett-Tutorial"
boardId: esp32s3
moduleId: audio/inmp441
category: esp32
date: 2026-06-08
intro: "Mit ESP32-S3 I2S-Audio vom INMP441 digitalen Mikrofon lesen, per 512-Punkt FFT analysieren und auf dem GC9A01 kreisförmigen TFT-Display ein 16-Band-Regenbogen-Spektrum in Echtzeit darstellen. Inklusive kompletter Verkabelung, Bibliotheksinstallation und Code-Kommentaren."
image: "https://img.lingflux.com/2026/06/7747ada90e61ba2360585e6934fbf7a7.jpg"
---

> **Kurzzusammenfassung**: ESP32-S3 + INMP441 Mikrofon + GC9A01 kreisförmiges Display, Bau eines „tanzenden" kreisförmigen Audio-Spektrogramms. Komplett-Tutorial für I2S + FFT + SPI.

# ESP32-S3 + INMP441 + GC9A01: Bau eines „tanzenden" kreisförmigen Audio-Spektrogramms — Komplett-Tutorial (I2S + FFT + SPI)

Schwierigkeit: ⭐⭐⭐☆☆ (mit etwas Arduino-Grundwissen gut umsetzbar)
Geschätzte Dauer: 45 Minuten
Getestete Umgebung:
Arduino IDE 2.3.8
GFX Library for Arduino v1.6.5
arduinoFFT v2.0.4

---

> **TL;DR (die Kurzfassung für Ungeduldige):**
> 1. **Verkabelung**: INMP441 SD→GPIO4, WS→GPIO5, SCK→GPIO6, **L/R muss an GND**
> 2. **Verkabelung**: GC9A01 SCL→GPIO12, SDA→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 3. **Bibliotheken installieren**: GFX Library for Arduino (von moononournation) + `arduinoFFT` (von kosme)
> 4. **Code einfügen, hochladen, ins Mikrofon sprechen**, und die Regenbogen-Balken im Kreis beginnen zu tanzen

---

## Einleitung

Seit ich mir ein 1,28-Zoll-kreisförmiges Display zugelegt habe, macht es richtig Spaß — ein kreisförmiges Display bietet ganz andere Möglichkeiten als ein eckiges. Jetzt möchte ich mit dem INMP441-Mikrofonmodul und diesem Display etwas besonders Schönes umsetzen: **Echtzeit-Audio-Spektrum-Visualisierung**.

Wenn man „Spektrogramm" hört, denkt man vielleicht zuerst an die Winamp-Ästhetik aus dem letzten Jahrtausend (ich hatte das früher auf dem PC installiert und konnte stundenlang den springenden Balken zusehen, während Musik lief). Aber ein kreisförmiges Spektrum ist etwas ganz anderes — 16 Regenbogen-Balken strahlen vom Mittelpunkt nach außen, je lauter desto länger, und an der Spitze jedes Balkens sinkt ein weißer Peak-Punkt langsam herab ... um ehrlich zu sein, habe ich fünf Minuten lang gebannt dagesessen und vergessen zu essen.

Dieser Artikel führt dich Schritt für Schritt durch den Aufbau eines **kreisförmigen Regenbogen-Spektrogramms** mit **ESP32-S3 + INMP441 digitalem Mikrofon + GC9A01 kreisförmigem TFT-Display**, von der Verkabelung bis zum Code. Maker mit etwas Grundwissen können in 45 Minuten Ergebnisse sehen.

---

## Ergebnis

![](https://img.lingflux.com/2026/06/21a134efbde1457cff0817a7e18879f3.jpg)

- Echtzeit-Audioaufnahme über Mikrofon (44,1 kHz, 16 Bit)
- 512-Punkt FFT-Analyse, aufgeteilt in 16 Frequenzbänder
- Regenbogen-Balken strahlen auf dem kreisförmigen Display von innen nach außen, weißer Peak-Punkt sinkt langsam
- Aktualisierungsrate ca. 20 fps, für das bloße Auge völlig flüssig

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/nmPC6lKog0o" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Komponenten-Beschreibung

### GC9A01 kreisförmiges TFT-Display

Wenn ein herkömmliches rechteckiges Display ein „Klapphandy" ist, dann ist das GC9A01 das „Smartwatch-Zifferblatt" — **1,28 Zoll kreisförmiges LCD, der Treiberchip heißt GC9A01, kommuniziert über SPI, arbeitet mit 3,3 V**, mit nur 8 Kabeln betreibbar.

| Parameter | Wert |
| --- | --- |
| Bildschirmgröße | 1,28 Zoll |
| Auflösung | 240 × 240 Pixel |
| Schnittstelle | SPI (4-Draht) |
| Betriebsspannung | 3,3 V |
| Treiberchip | GC9A01 |
| Panel-Typ | IPS (weiter Betrachtungswinkel) |

Warum diese Wahl: Das am weitesten verbreitete kleine kreisförmige Display auf dem Markt, nativ von der Arduino_GFX-Bibliothek unterstützt, Initialisierung mit 5 Zeilen Code, sehr fehlerverzeihend.

---

### INMP441 MEMS Digitalmikrofon

Der INMP441 ist ein **omnidirektionales MEMS-Digitalmikrofon**. Einfach ausgedrückt: **Es gibt direkt ein digitales I2S-Signal aus, ohne dass ein ADC erforderlich ist**. Es ist, als hätte man einen Simultanübersetzer — alles, was man sagt, wird in Echtzeit in eine digitale Form übersetzt, die der MCU versteht. Das spart den ganzen Aufwand mit analogen Signalen.

| Parameter | Wert |
| --- | --- |
| Schnittstelle | I2S (digitales Audio) |
| Betriebsspannung | 1,8 V ~ 3,3 V |
| Frequenzgang | 60 Hz ~ 15 kHz |
| Signal-Rausch-Verhältnis | 61 dBA |
| Empfindlichkeit | -26 dBFS (typisch) |
| Richtcharakteristik | Omnidirektional |

Warum diese Wahl: Saubere I2S-Schnittstelle, kein zusätzlicher ADC nötig, mit 61 dBA deutlich besser als die meisten billigen analogen Mikrofonkapseln — für ein Spektrogramm mehr als ausreichend.

> Es ist erwähnenswert, dass der INMP441 ursprünglich von InvenSense (später von TDK übernommen) hergestellt wurde. Der Hersteller hat ihn offiziell als **Obsolete (ausgelaufen)** eingestuft. Bei großen Distributoren wie Mouser und DigiKey ist das Bauteil bereits als eingestellt markiert. Auf dem Markt (z. B. auf diversen Online-Plattformen) sind jedoch weiterhin reichlich INMP441-Module (blaue/schwarze kleine Platinen) für wenige Euros erhältlich. Das liegt hauptsächlich daran, dass auf dem chinesischen Markt noch große **Restbestände** vorhanden sind oder **kompatible/aufbereitete inländische Chips** unter diesem Namen weiterproduziert werden. Für persönliche DIY-Projekte, Tutorials oder kleine Demos funktionieren die aktuell erhältlichen Module weiterhin einwandfrei.
>
> **Wer ein Produkt entwickeln möchte, sollte dieses Modell daher nicht als erste Wahl betrachten.**

---

## Stückliste (BOM)

| Komponente | Modell / Spezifikation | Menge |
| --- | --- | --- |
| Entwicklungsboard | ESP32-S3 (mit USB-C) | 1 |
| Kreisförmiges TFT-Display | GC9A01, 1,28 Zoll, 240×240 | 1 |
| Digitalmikrofon | INMP441 I2S-Modul | 1 |
| Dupont-Kabel | | nach Bedarf |

---

## Pin-Belegung der Komponenten

### GC9A01 Display-Pins

| Pin | Funktionsbeschreibung |
| --- | --- |
| VCC | Versorgungsspannung (an 3,3 V) |
| GND | Masse |
| SCL / CLK | SPI-Takt |
| SDA / MOSI | SPI-Daten (Master-Ausgang) |
| CS | Chip-Select (aktiv Low) |
| DC | Daten-/Befehlsauswahl |
| RST | Reset (aktiv Low) |
| BL | Hintergrundbeleuchtung (an 3,3 V für Dauerbetrieb, oder an GPIO für PWM-Dimmer) |

### INMP441 Mikrofon-Pins

| Pin | Funktionsbeschreibung |
| --- | --- |
| VDD | Versorgungsspannung (an 3,3 V) |
| GND | Masse |
| SD | I2S-Datenausgang (an ESP32-Dateneingang) |
| WS | Word Clock / Frame-Sync (Kanal-Auswahl links/rechts) |
| SCK | Bit Clock |
| L/R | Kanal-Auswahl: an GND = linker Kanal, an 3,3 V = rechter Kanal, **darf nicht offen bleiben** |

---

## Verkabelung

**Empfehlung: Nach jedem Kabel anhand der Tabelle gegenprüfen — das spart 80 % der Fehlersuche.**

### GC9A01 Display-Verkabelung

| Modul-Pin | ESP32-S3 | Kabelfarbe (Referenz) |
| --- | --- | --- |
| VCC | 3,3 V | Rot |
| GND | GND | Grau |
| SCL / CLK | GPIO12 | Gelb |
| SDA / MOSI | GPIO11 | Blau |
| CS | GPIO9 | Grün |
| DC | GPIO10 | Orange |
| RST | GPIO18 | Lila |
| BL | GPIO7 / 3,3 V | Türkis |

### INMP441 Mikrofon-Verkabelung

| Modul-Pin | ESP32-S3 | Kabelfarbe (Referenz) |
| --- | --- | --- |
| VDD | 3,3 V | Rot |
| GND | GND | Grau |
| SD | GPIO4 | Blau |
| WS | GPIO5 | Grün |
| SCK | GPIO6 | Gelb |
| L/R | GND (linker Kanal) | Grau |

> ⚠️ **L/R muss angeschlossen werden und darf nicht offen bleiben.** Ein offener L/R-Pin führt zu einer undefinierten Kanal-Auswahl, sodass nur Rauschen erfasst wird. Die Spektrumbalken springen dann völlig chaotisch und haben keinen Bezug zum eigentlichen Ton — fragt nicht, wie ich darauf gekommen bin.

####

- Unbedingt mit **3,3 V** betreiben, nicht an 5 V anschließen
- INMP441 L/R-Pin an GND = linker Kanal-Ausgabe
- Zuerst alle Kabel verbinden, dann Spannung und Masse mit einem Multimeter prüfen, bevor der Strom eingeschaltet wird — Kurzschlüsse vermeiden

---

## Benötigte Bibliotheken

In der **Arduino IDE → Werkzeuge → Bibliotheken verwalten** suchen und installieren:

| Bibliothek | Autor | Getestete Version | Zweck |
| --- | --- | --- | --- |
| `Arduino_GFX_Library` | moononournation | v1.6.5 | GC9A01 Display-Treiber |
| `arduinoFFT` | kosme | v2.0.4 | Schnelle Fourier-Transformation |

> Der I2S-Treiber (`driver/i2s.h`) ist eine integrierte ESP32-Bibliothek und muss nicht separat installiert werden.
>
> Für die Arduino IDE wird **Version 2.3.x oder höher** empfohlen. Die ältere Version 1.x bietet keine stabile Unterstützung für den ESP32-S3.

---

## Vollständiger Code

```cpp
#include <Arduino_GFX_Library.h>
#include <driver/i2s.h>
#include <arduinoFFT.h>

// ====== Schritt 1: Display-Pins definieren ======
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// ====== Schritt 2: Mikrofon-Pins definieren ======
#define I2S_WS    5
#define I2S_SD    4
#define I2S_SCK   6
#define I2S_PORT  I2S_NUM_0

// ====== FFT-Parameter ======
#define SAMPLES   512
#define BANDS     16

// ====== GC9A01-Display initialisieren ======
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0, true);

// ====== FFT-Puffer ======
double vReal[SAMPLES];
double vImag[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>(
  vReal, vImag, SAMPLES, 44100);

// ====== Band-Energie und Peaks ======
float bandValues[BANDS];
float peakValues[BANDS];
int16_t sampleBuf[SAMPLES];

// ====== Farbhilfsfunktion: HSL nach RGB565 ======
uint16_t hslToRgb565(float h, float s, float l) {
  float c = (1.0f - fabsf(2.0f * l - 1.0f)) * s;
  float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
  float m = l - c / 2.0f;
  float r, g, b;
  if (h < 60)       { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  uint8_t R = (uint8_t)((r + m) * 31);
  uint8_t G = (uint8_t)((g + m) * 63);
  uint8_t B = (uint8_t)((b + m) * 31);
  return (R << 11) | (G << 5) | B;
}

// ====== Schritt 3: Mikrofon-I2S initialisieren ======
void setupMicrophone() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

void setup() {
  Serial.begin(115200);

  // Schritt 4: Hintergrundbeleuchtung einschalten, Display initialisieren
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  gfx->begin();
  gfx->fillScreen(0x0000);

  // Schritt 5: Mikrofon initialisieren
  setupMicrophone();

  memset(peakValues, 0, sizeof(peakValues));
}

// ====== Kreisförmiges Spektrum zeichnen ======
void drawCircularSpectrum() {
  int cx = 120, cy = 120;
  int innerR = 25;
  int maxLen = 85;
  float angleStep = 2.0f * PI / BANDS;
  float barWidth = angleStep * 0.7f;

  gfx->fillScreen(0x0000);

  for (int i = 0; i < BANDS; i++) {
    float angle = i * angleStep - PI / 2.0f;
    float hue = (float)i / BANDS * 360.0f;
    float val = bandValues[i];
    int barLen = (int)(val * maxLen);

    for (int r = innerR; r < innerR + barLen; r += 2) {
      float t = (float)(r - innerR) / maxLen;
      uint16_t color = hslToRgb565(hue, 1.0f, 0.3f + t * 0.3f);
      float x1 = cx + cosf(angle - barWidth/2) * r;
      float y1 = cy + sinf(angle - barWidth/2) * r;
      float x2 = cx + cosf(angle + barWidth/2) * r;
      float y2 = cy + sinf(angle + barWidth/2) * r;
      gfx->drawLine(x1, y1, x2, y2, color);
    }

    if (peakValues[i] > 0.02f) {
      int peakR = innerR + (int)(peakValues[i] * maxLen) + 3;
      float px = cx + cosf(angle) * peakR;
      float py = cy + sinf(angle) * peakR;
      gfx->fillCircle(px, py, 2, 0xFFFF);
    }

    peakValues[i] *= 0.95f;
    if (bandValues[i] > peakValues[i]) {
      peakValues[i] = bandValues[i];
    }
  }
}

void loop() {
  // Schritt 6: Mikrofon-I2S-Daten lesen
  size_t bytes_read = 0;
  i2s_read(I2S_PORT, sampleBuf, sizeof(sampleBuf),
           &bytes_read, portMAX_DELAY);

  // Schritt 7: FFT-Realteil mit Abtastwerten füllen
  for (int i = 0; i < SAMPLES; i++) {
    vReal[i] = (double)sampleBuf[i];
    vImag[i] = 0.0;
  }

  // Schritt 8: FFT ausführen
  FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  FFT.compute(FFT_FORWARD);
  FFT.complexToMagnitude();

  // Schritt 9: FFT-Ergebnisse auf 16 Bänder abbilden
  memset(bandValues, 0, sizeof(bandValues));
  int specLen = SAMPLES / 2;
  for (int i = 0; i < BANDS; i++) {
    int start = (int)(pow((float)i / BANDS, 1.8f) * specLen * 0.7f);
    int end   = (int)(pow((float)(i+1) / BANDS, 1.8f) * specLen * 0.7f);
    if (end <= start) end = start + 1;
    float sum = 0;
    for (int j = start; j < end && j < specLen; j++) {
      sum += (float)vReal[j];
    }
    float avg = sum / (end - start);
    bandValues[i] = constrain(avg / 5000.0f, 0.0f, 1.0f);
  }

  // Schritt 10: Kreisförmiges Spektrum zeichnen
  drawCircularSpectrum();
}
```

---

## Code-Erklärung

**① Warum SAMPLES = 512?**
512 ist eine Zweierpotenz, bei der der FFT-Algorithmus am effizientesten arbeitet. Bei einer Abtastrate von 44,1 kHz ergibt eine 512-Punkt-FFT eine Frequenzauflösung von ca. 86 Hz — das reicht aus. 256 wäre schneller, bietet aber weniger Frequenzdetails; 1024 wäre feiner, aber die Bildrate würde spürbar sinken.

**② Warum pow(..., 1.8) für die Bandverteilung?**
Eine lineare Bandaufteilung würde die Frequenzbänder im Hochtonbereich mit Daten überfüllen, während der Bassbereich leer bliebe. Die exponentielle Aufteilung macht die Bässe schmaler (feinere Auflösung) und die Höhen breiter (Rauschen zusammengefasst) — das entspricht besser der Frequenzwahrnehmung des menschlichen Ohrs und sieht „natürlicher" aus.

**③ Woher kommt der Normierungsfaktor 5000?**
Dieser Wert hängt vom Abstand des Mikrofons zur Schallquelle und der Umgebungslautstärke ab — in verschiedenen Szenarien muss er manuell angepasst werden. Wenn die Balken ständig am Anschlag sind (Energie abgeschnitten), den Wert 5000 vergrößern; wenn die Balken zu klein und kaum sichtbar sind, den Wert verkleinern.

**④ Was bewirkt peakValues[i] *= 0.95?**
Das ist der klassische „Peak-Hold + langsamer Abfall"-Trick: Wenn der Ton plötzlich aufhört, verschwindet der weiße Peak-Punkt nicht sofort, sondern fällt pro Frame um den Faktor 0,95 langsam herab. Optisch wirkt das weicher, ähnlich wie bei professionellen Audiogeräten.

---

## Häufige Probleme und Lösungen

**Keine Panik — 90 % der Probleme haben eine dieser Ursachen:**

**Display bleibt komplett schwarz, zeigt nichts an**
Zuerst prüfen, ob die Hintergrundbeleuchtung (BL-Pin) wirklich auf HIGH gezogen ist (falls das Modul keinen BL-Pin hat, kann dieser Schritt ignoriert werden). Dann die vier SPI-Leitungen (SCK / MOSI / CS / DC) auf falsche oder lose Verbindungen überprüfen. Mit einem Multimeter messen, ob VCC tatsächlich 3,3 V liefert. Wenn die Hintergrundbeleuchtung leuchtet, aber der Bildschirm schwarz bleibt, liegt es höchstwahrscheinlich an einem vertauschten CS oder DC — einfach umstecken und erneut versuchen.

**Spektrumbalken bewegen sich gar nicht oder springen chaotisch ohne Bezug zum Ton**
Als Erstes: **Bestätigen, dass der L/R-Pin des INMP441 an GND angeschlossen ist** — das ist die häufigste Fehlerquelle. Ein offener L/R-Pin führt zu einer undefinierten Kanal-Auswahl, sodass nur zufälliges Rauschen erfasst wird. Nachdem L/R korrekt angeschlossen ist, die GPIO-Nummern der drei Leitungen SD / WS / SCK überprüfen.

**Alle Spektrumbalken sind durchgehend am Maximum (Energie immer voll)**
In der Codezeile `bandValues[i] = constrain(avg / 5000.0f, ...)` den Wert `5000` vergrößern, z. B. auf `15000` oder `30000`. Wenn das Mikrofon zu nah an der Schallquelle steht, kann das ebenfalls passieren — zuerst das Mikrofon etwa 30 cm weiter weg positionieren.

**Spektrumbalken reagieren, aber nur wenige bewegen sich**
Möglicherweise ist die Frequenzbandbreite der Test-Schallquelle zu schmal (z. B. nur eine Einzelpfeife). Stattdessen Musik mit vollem Frequenzspektrum verwenden (mit Bass, Gesang und hohen Instrumenten), um zu prüfen, ob alle Frequenzbänder reagieren.

**Kompilierung fehlgeschlagen: ArduinoFFT-Template-Klasse meldet Fehler**
Sicherstellen, dass die installierte Version `arduinoFFT` (von kosme) **v2.x** ist. Die Syntax von v1.x lautet `ArduinoFFT FFT` (ohne Template-Parameter), v2.x verwendet `ArduinoFFT<double>`. Die APIs beider Versionen sind nicht kompatibel. Im Bibliotheksverwalter einfach auf die neueste Version aktualisieren.

---

## FAQ

**F: Was passiert, wenn der L/R-Pin des INMP441 nicht angeschlossen ist?**
A: Die Kanal-Auswahl ist dann undefiniert, das Mikrofon verhält sich unvorhersagbar. In der Praxis werden höchstwahrscheinlich nur zufällige Rauschdaten erfasst, und die Spektrumbalken springen chaotisch ohne jeden Bezug zum Ton. An GND = linker Kanal, an 3,3 V = rechter Kanal — eines von beiden, aber nicht offen lassen.

**F: Kann SAMPLES auf 1024 geändert werden? Welche Auswirkungen hat das?**
A: Ja, die Frequenzauflösung verbessert sich von ca. 86 Hz auf ca. 43 Hz, mit mehr Details im Bassbereich. Der Nachteil: Die Erfassungs- und Berechnungszeit pro Frame verdoppelt sich, die Bildrate sinkt von ca. 20 fps auf ca. 10 fps. Für eine Spektrum-Visualisierung sind 10 fps für das bloße Auge noch akzeptabel.

**F: Funktioniert der INMP441 mit nur 3,3 V ordnungsgemäß?**
A: Absolut kein Problem. Der INMP441 unterstützt 1,8 V bis 3,3 V als Versorgungsspannung. 3,3 V ist die gängigste Betriebsspannung, ein zusätzlicher Spannungsregler ist nicht erforderlich.

**F: Ist die CPU-Auslastung des ESP32-S3 hoch? Beeinträchtigt das andere Aufgaben?**
A: Eine 512-Punkt-FFT beansprucht bei 240 MHz Taktfrequenz des ESP32-S3 etwa 10 % bis 15 % der CPU-Zeit eines einzelnen Kerns. Wenn zusätzlich Wi-Fi oder Bluetooth betrieben werden soll, empfiehlt es sich, FFT + Zeichenroutine auf Core 0 und die Netzwerkaufgaben auf Core 1 auszuführen — beides stört sich dann nicht gegenseitig.

**F: Kann das GC9A01 gegen ein ST7789 oder ein anderes Display-Modell ausgetauscht werden?**
A: Ja. Die Arduino_GFX_Library unterstützt dutzende Treiberchips. Im Code einfach `Arduino_GC9A01` durch die entsprechende Klasse (z. B. `Arduino_ST7789`) ersetzen, die Auflösungsparameter anpassen und die Verkabelung gemäß dem Datenblatt des neuen Displays vornehmen. Bei einem nicht kreisförmigen Display müssen die Mittelpunktskoordinaten neu berechnet werden.

**F: Bei Stille gibt es „Grundrauschen", die Balken gehen nicht auf null zurück — was tun?**
A: Der INMP441 hat ein gewisses Grundrauschen (SNR 61 dBA bedeutet, dass immer ein minimaler Anteil an Umgebungsgeräuschen erfasst wird). Eine Noise-Gate-Schwelle kann hinzugefügt werden: Vor der Zuordnung die Zeile `if (avg < 200) avg = 0;` einfügen, dann gehen die Balken bei Stille komplett auf null. Gleichzeitig hilft es, den Normierungswert entsprechend zu vergrößern.

**F: Welche Version des I2S-Treibers wird mit dem ESP32-S3 verwendet?**
A: Dieser Artikel verwendet den I2S-Treiber im Stil von ESP-IDF v4.x (`i2s_driver_install` / `i2s_read`). ESP-IDF v5.x hat eine neue I2S-API eingeführt (`i2s_new_channel` usw.). Wenn das ESP32-S3-Board-Paket auf Version 3.x aktualisiert wurde, muss die Funktion `setupMicrophone()` entsprechend der neuen API angepasst werden.

---

## Erweiterungsideen

- Auf 32 Frequenzbänder erweitern, kombiniert mit einem größeren kreisförmigen Display (z. B. 2,1 Zoll GC9A01A), für ein feineres Spektrum
- Touch-Tasten hinzufügen, um zwischen Anzeigemodi zu wechseln (kreisförmige Strahlung / vertikale Balken / Oszilloskop-Wellenform)
- Wi-Fi-Anbindung, um Spektrumdaten an einen Browser zu senden und dort erneut darzustellen
- Zwei INMP441 für Stereo-Betrieb verwenden, linken und rechten Kanal in verschiedenen Farben darstellen

---

## Referenzen

- [INMP441 Offizielles Datenblatt — TDK InvenSense](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [GC9A01 Treiberchip-Datenblatt](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [arduinoFFT GitHub — kosme](https://github.com/kosme/arduinoFFT)
- [ESP32-S3 Technisches Datenblatt — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP-IDF I2S-Treiberdokumentation — Espressif](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)