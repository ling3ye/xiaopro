---
title: "ESP32-S3 treibt GC9A01-Rundbildschirm an – Kardioide animieren in 30 Minuten"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-05-19
intro: "ESP32-S3 steuert ein 1,28\" GC9A01 rundes TFT-Display mit einer animierten Kardioide in Polarkoordinaten. Komplette Verkabelung, Double-Buffering ohne Flackern und Fehlerbehebungsleitfaden inklusive."
image: "https://img.lingflux.com/2026/05/a6a0b0037d4fd0650665e49e7364d65d.jpg"
---

# ESP32-S3 steuert GC9A01 1,28\" Rundbildschirm – Komplett-Tutorial (SPI + Arduino IDE)

Schwierigkeit: ⭐⭐☆☆☆ (auch für Anfänger geeignet)
Geschätzte Dauer: 30 Minuten
Getestet mit:
Arduino IDE 2.3.8
Arduino_GFX_Library 1.6.5
ESP32 Arduino Core 3.3.8

---

> **Kurzusammenfassung**: ESP32-S3 steuert ein 1,28\" GC9A01-Runddisplay mit einer animierten Kardioide in Polarkoordinaten – Double-Buffering ohne Flackern, Verkabelung + kompletter Code + Fehlerbehebung, alles in 30 Minuten.

---

## Einleitung

Der 520 steht vor der Tür – was kann man seiner Freundin schenken? Lange grübeln, keine rechte Idee.

Dann erinnerte ich mich an den Polarkoordinaten-Unterricht in der Oberstufe: Da gab es eine Kurve – die Kardioide (Herzkurve). Man könnte eine animierte Polarkoordinaten-Darstellung programmieren, die ein Herz zeichnet, um seine Gefühle auszudrücken. (Technik-Nerd malt sich alles aus und fiebert schon mal vor sich hin …)

Ziel dieses Artikels: Von null auf in 30 Minuten mit dem ESP32-S3 das 1,28\"-Runddisplay ansteuern und eine Polarkoordinaten-Animation zum Laufen bringen – und dabei jeden Schritt verstehen. (PS: Hoffentlich musst du nach der Übergabe nicht auf Knien vor dem Laptop sitzen! ~ :P )

(Die Beschenkte denkt sich wahrscheinlich: Was soll das denn?! ~ her mit der Durianfrucht)

---

## Ergebnis

Auf dem Runddisplay wird in Echtzeit eine rotierende **Kardioide (Herzkurve)** gezeichnet, zusammen mit einem Polarkoordinaten-Gitter und einem verfolgten Punkt – wie ein Mini-Oszilloskop, das eine mathematische Kurve nachzeichnet. Komplett ohne Flackern, flüssige 16 fps.

![](https://img.lingflux.com/2026/05/8db744891e99902a8045e4e1242911d1.jpg)

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/fcqwhO5Vr7U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Komponentenbeschreibung

### GC9A01 1,28\" rundes TFT-Display

GC9A01 ist der Treiberchip, das runde IPS-Panel ist das eigentliche Display – beide sind auf ein kleines Modul gelötet. Man muss lediglich Bilddaten per SPI „füttern"; der Chip kümmert sich um das Ansteuern jedes einzelnen Pixels.

| Parameter | Wert |
| --- | --- |
| Auflösung | 240 × 240 Pixel |
| Farbtiefe | 16-Bit RGB565, 65536 Farben |
| Schnittstelle | 4-Draht SPI, max. 80 MHz |
| Betriebsspannung | 3,3 V (direkt an ESP32-S3, kein Level-Shifter nötig) |
| Panel-Typ | IPS, Blickwinkel nahezu 180° |
| Modulgröße | ca. 36 mm Durchmesser |

Warum dieses Display: günstig (ca. 5–15 Yuan), weit verbreitet, die runde Form eignet sich naturgemäß für Dashboard- und Uhr-Projekte, und die 240×240-Auflösung ist für den Speicher des ESP32-S3 gerade recht.

---

## Stückliste (BOM)

| Komponente | Menge | Hinweis |
| --- | --- | --- |
| ESP32-S3 Entwicklungsboard | 1 | Beliebige Version mit SPI-Pins |
| GC9A01 1,28\" Runddisplay-Modul | 1 | Sicherstellen, dass das Modul einen BL-Pin hat |
| Jumper-Kabel | nach Bedarf | Buchse-Buchse oder Buchse-Stift, je nach Board |

---

## Pin-Belegung des Moduls

| GC9A01 Modul-Pin | Funktion |
| --- | --- |
| VCC | Versorgungsspannung (+3,3 V) |
| GND | Masse |
| SCL / CLK | SPI-Taktsignal |
| SDA / MOSI | SPI-Dateneingang (Master → Slave) |
| CS | Chip-Select, low-aktiv – Display reagiert auf SPI |
| DC | Daten/Kommando-Umschaltung: High = Daten, Low = Kommando |
| RST | Hardware-Reset, low-aktiv |
| BL | Hintergrundbeleuchtung, muss auf High sein, damit das Display leuchtet |

---

## Verkabelung

> Am besten Zeile für Zeile der Tabelle folgen und jeden angeschlossenen Draft abhaken – das spart 80 % der Fehlersuche.

| GC9A01 Display | ESP32-S3 |
| --- | --- |
| VCC | 3,3 V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (codegesteuert) oder direkt an 3,3 V |

> **⚠️ Hinweis**: Der BL-Pin (Hintergrundbeleuchtung) wird leicht vergessen. Ohne ihn bleibt das Display nach dem Einschalten schwarz – das liegt nicht am Code und das Display ist auch nicht defekt. Zuerst hier prüfen! Manche Module haben keinen herausgeführten BL-Pin; in diesem Fall ist er modulintern bereits mit 3,3 V verbunden. Falls das Modul also keinen BL-Pin aufweist, kann dieser Hinweis ignoriert werden.

---

## Zu installierende Bibliotheken

Arduino IDE öffnen → Werkzeuge → Bibliotheken verwalten, suchen und installieren:

| Bibliothek | Autor | Getestete Version |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | 1.6.5 |

> Nicht TFT_eSPI installieren: Unter ESP32 Core 3.x kollidieren TFT_eSPIs Makrodefinitionen und die DMA-Initialisierung mit der neuen ESP32-Version – das führt zu Compiler-Fehlern oder Abstürzen beim Start. Arduino_GFX_Library unterstützt von Grund auf modernes C++ und In-Memory-Canvas und ist derzeit die sorgenfreieste Wahl für Display-Projekte. (Stand: 2026-05-18)

---

## Kompletter Code

```cpp
/**
 * ESP32-S3 + GC9A01 1.28" rundes Display – Polarkoordinaten-Animation
 * Double-Buffering ohne Flackern, fix auf 16 fps
 * Verkabelung: SCL=GPIO12, SDA=GPIO11, CS=GPIO9, DC=GPIO10, RST=GPIO18, BL=GPIO7
 */

#include <Arduino_GFX_Library.h>

// ---------------------------------------------------
// Schritt 1: Farb-Makros manuell definieren
// Neuere Arduino_GFX-Versionen exportieren BLACK / WHITE usw. nicht mehr global.
// Ohne diesen Block meldet der Compiler: "BLACK was not declared in this scope"
// ---------------------------------------------------
#ifndef BLACK
#define BLACK       0x0000
#endif
#ifndef WHITE
#define WHITE       0xFFFF
#endif
#ifndef RED
#define RED         0xF800
#endif
#ifndef GREEN
#define GREEN       0x07E0
#endif
#ifndef BLUE
#define BLUE        0x001F
#endif
#ifndef YELLOW
#define YELLOW      0xFFE0
#endif
#ifndef CYAN
#define CYAN        0x07FF
#endif
#ifndef MAGENTA
#define MAGENTA     0xF81F
#endif
#ifndef GRAY
#define GRAY        0x8410
#endif
#ifndef DARKGRAY
#define DARKGRAY    0x2104
#endif

// ---------------------------------------------------
// Schritt 2: Farbschema definieren (dunkelblauer Hintergrund + orange-roter Akzent)
// ---------------------------------------------------
#define COLOR_BG        0x1123   // Dunkelblauer Hintergrund
#define COLOR_GRID      0x19E5   // Gitter blaugrau
#define COLOR_PRIMARY   0xE73C   // Kurve orange-rot
#define COLOR_ACCENT    0xFDE0   // Radiusstrahl goldgelb
#define COLOR_TEXT      0xF7BE   // Text hellgrau

// ---------------------------------------------------
// Schritt 3: Physische Pins definieren
// ---------------------------------------------------
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---------------------------------------------------
// Schritt 4: SPI-Bus und Display-Treiber instanziieren
// ---------------------------------------------------
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA, GFX_NOT_DEFINED /* MISO nicht benötigt */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST,
    0,    /* Drehwinkel */
    true  /* IPS-Display */
);

// ---------------------------------------------------
// Schritt 5: Double-Buffer-Canvas zuweisen (240×240×2 Bytes = 115,2 KB SRAM)
// Alle Zeichenoperationen erfolgen zuerst im Speicher;
// erst am Ende wird der komplette Frame an das Display gesendet – Flackern eliminiert.
// ---------------------------------------------------
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

// ---------------------------------------------------
// Animationsvariablen
// ---------------------------------------------------
float angle = 0.0f;
const float  a_scale    = 50.0f;  // Skalierungsfaktor der Kardioide (in Pixeln)
const int16_t cx        = 120;    // Mittelpunkt X
const int16_t cy        = 120;    // Mittelpunkt Y

unsigned long lastFrameTime = 0;
const int frameDelay = 1000 / 16; // auf 16 fps begrenzt

// Funktions-Schalter (auf false setzen, um jeweilige Ebene auszublenden)
const bool showGrid     = true;
const bool showCurve    = true;
const bool showRadius   = true;
const bool showTelemetry= true;

void setup() {
    Serial.begin(115200);

    // Display-Treiber initialisieren
    gfx->begin();

    // Hintergrundbeleuchtung einschalten (ohne diesen Schritt = schwarzer Bildschirm)
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);

    // Double-Buffer-Canvas initialisieren
    if (!canvas->begin()) {
        Serial.println("Canvas-Speicherzuweisung fehlgeschlagen! Direktes Schreiben (mit Flackern).");
    } else {
        Serial.println("Double-Buffer gestartet, flackerfreies Rendering bereit.");
    }
}

void loop() {
    // Framerate-Begrenzung
    unsigned long now = millis();
    if (now - lastFrameTime < frameDelay) return;
    lastFrameTime = now;

    // Frame löschen
    canvas->fillScreen(COLOR_BG);

    // --- Ebene 1: Polarkoordinaten-Gitter ---
    if (showGrid) {
        canvas->drawCircle(cx, cy,  30, COLOR_GRID);
        canvas->drawCircle(cx, cy,  60, COLOR_GRID);
        canvas->drawCircle(cx, cy,  90, COLOR_GRID);
        canvas->drawCircle(cx, cy, 110, COLOR_GRID);
        canvas->drawFastHLine(10, cy, 220, COLOR_GRID);
        canvas->drawFastVLine(cx, 10, 220, COLOR_GRID);
    }

    // --- Ebene 2: Volle Kardioid-Kurve r = a*(1 - cos θ) ---
    if (showCurve) {
        int16_t lx = 0, ly = 0;
        for (int16_t deg = 0; deg <= 360; deg += 3) {
            float rad = deg * DEG_TO_RAD;
            float r   = a_scale * (1.0f - cos(rad));
            int16_t x = cx + (int16_t)(r * cos(rad));
            int16_t y = cy - (int16_t)(r * sin(rad)); // Bildschirm-Y-Achse zeigt nach unten, daher invertieren
            if (deg > 0) canvas->drawLine(lx, ly, x, y, COLOR_PRIMARY);
            lx = x; ly = y;
        }
    }

    // --- Ebene 3: Aktueller Verfolgungspunkt & Radiusstrahl ---
    float rad_a  = angle * DEG_TO_RAD;
    float active_r = a_scale * (1.0f - cos(rad_a));
    int16_t px = cx + (int16_t)(active_r * cos(rad_a));
    int16_t py = cy - (int16_t)(active_r * sin(rad_a));

    if (showRadius) canvas->drawLine(cx, cy, px, py, COLOR_ACCENT);
    canvas->fillCircle(px, py, 5, COLOR_TEXT);

    // --- Ebene 4: Zahlenwerte anzeigen ---
    if (showTelemetry) {
        canvas->setTextColor(COLOR_TEXT);
        canvas->setTextSize(1);
        canvas->setCursor(50, 25);
        canvas->print("Polar Coordinates");
        canvas->setCursor(28, 185);
        canvas->print("r = a * (1 - cos(theta))");
        canvas->setCursor(40, 200);
        canvas->print("th:"); canvas->print((int)angle);
        canvas->print("  r:"); canvas->print((int)active_r);
        canvas->print("px");
    }

    // Winkel erhöhen (+6° pro Frame, eine Umdrehung in ca. 1 Sekunde)
    angle += 6.0f;
    if (angle >= 360.0f) angle -= 360.0f;

    // In-Memory-Canvas in einem Aufruf an das physische Display übertragen
    canvas->flush();
}
```

### Code-Erklärung

**Double-Buffering-Mechanismus**: Alle Zeichenoperationen finden im `canvas` (Arbeitsspeicher) statt. Erst die letzte Zeile `canvas->flush()` sendet den kompletten Frame an das Display. Anstatt die Tafel erst zu wischen und dann neu zu beschreiben, schreibt man auf ein Konzeptpapier und klebt es als Ganzes auf – der Bildschirm zeigt nie einen „halbfertigen" Zustand, Flackern gleich null.

**Kardioid-Gleichung** `r = a * (1 - cos θ)`: Dies ist eine Polarkoordinaten-Gleichung, wobei `r` die Entfernung vom Ursprung und `θ` der Winkel ist. Für jeden θ-Wert wird (r, θ) in Bildschirm-XY-Koordinaten umgerechnet und die Punkte verbunden – so entsteht die Herzkurve.

**Framerate-Lock**: `frameDelay = 1000 / 16` begrenzt das minimale Frame-Intervall auf ca. 62 ms. Für eine schnellere Animation den Schritt `+= 6.0f` erhöhen; für mehr Flüssigkeit kann targetFPS auf 30 gesetzt werden, was jedoch mehr CPU-Leistung beansprucht.

**Flash-Partition**: Arduino IDE → Werkzeuge → Partition Scheme, **Huge APP (3MB No OTA)** auswählen. Der 115 KB große Canvas benötigt ausreichend SRAM; mit der Standard-Partition kann der Heap-Speicher gelegentlich knapp werden.

---

## Fehlerbehebung

Keine Panik – 90 % der Probleme haben eine dieser Ursachen:

**Bildschirm bleibt nach dem Einschalten schwarz, keine seriellen Fehlermeldungen**
Zuerst den BL-Pin prüfen – eine fehlende High-Pegel-Verbindung der Hintergrundbeleuchtung ist die häufigste Ursache. Sicherstellen, dass GPIO7 `digitalWrite(TFT_BL, HIGH)` ausführt, oder BL direkt an 3,3 V anschließen, um ein Code-Problem auszuschließen.

**Display leuchtet, aber komplett weiß / rot / mit Zufallspixeln**
SPI-Verkabelung vertauscht. CS und DC werden am leichtesten verwechselt (beides Steuerleitungen, sehen ähnlich aus). Anhand der Makros im Code (CS=GPIO9, DC=GPIO10) noch einmal核对 – nicht auf die Verkabelungstabelle verlassen, der Code ist maßgeblich.

**Compiler-Fehler: `BLACK was not declared in this scope`**
Die verwendete Arduino_GFX-Version ist >= 1.3; neuere Versionen exportieren die Farb-Makros nicht mehr global. Der `#ifndef BLACK`-Block am Anfang des Codes muss unbedingt beibehalten werden.

**Canvas-Speicherzuweisung fehlgeschlagen, serielle Meldung über direktes Schreiben**
Der verfügbare SRAM reicht nicht für 115 KB. Prüfen: ① Ob die Partition auf Huge APP gestellt ist; ② Ob andere große Arrays Speicher belegen; ③ In seltenen Fällen ist PSRAM auf dem Board nicht aktiviert (in den Board-Einstellungen PSRAM einschalten).

**Animation ruckelt, sieht nicht nach 16 fps aus**
Gibt es ein `delay()` in `loop()`? Falls ja, entfernen – die Framerate-Begrenzung ist bereits über `millis()` implementiert; beides kombiniert verdoppelt das Frame-Intervall.

---

## FAQ

**F: Können die CS- und DC-Pins auf andere GPIOs gelegt werden?**
A: Ja, einfach die `#define TFT_CS` und `#define TFT_DC` oben im Code ändern – jeder freie GPIO funktioniert. Für SCL und SDA sollten die Hardware-SPI-Pins verwendet werden (ESP32-S3 Standard SPI2: SCLK=12, MOSI=11), um die maximale Geschwindigkeit zu erzielen; andere Pins führen zu Software-SPI mit spürbar geringerer Leistung.

**F: Welche Frameraten unterstützt das Display?**
A: Die SPI-Schnittstelle des GC9A01 hat eine theoretische maximale Taktrate von 80 MHz, was bei voller 240×240-Auflösung einer Obergrenze von ca. 40 fps entspricht. Dieser Code begrenzt auf 16 fps, um auf günstigeren ESP32-S3-Modulen CPU-Reserven zu behalten. Wenn das Board mit 240 MHz läuft, kann `targetFPS` problemlos auf 30–40 erhöht werden.

**F: Können zwei Displays gleichzeitig angesteuert werden?**
A: Ja – beide Displays teilen sich SCL/SDA, jedes erhält einen eigenen CS-Pin. Zwei separate `Arduino_GC9A01`-Objekte instanziieren und per CS zwischen den Displays umschalten. Speicher beachten: Zwei Canvas benötigen zusammen 230 KB SRAM, PSRAM muss aktiviert sein.

**F: Versorgung mit 3,3 V oder 5 V?**
A: Das GC9A01-Modul arbeitet mit 3,3 V – direkt an den 3,3-V-Pin des ESP32-S3 anschließen. Auf keinen Fall 5 V anlegen, das würde den Treiberchip zerstören.

**F: Wie können chinesische Zeichen angezeigt werden?**
A: Arduino_GFX_Library enthält standardmäßig nur ASCII-Schriften. Für chinesische Zeichen werden zusätzliche Font-Dateien (z. B. U8g2) oder das LVGL-Framework benötigt. Solche Schriftarten erhöhen den Flash-Verbrauch erheblich; empfohlen wird ein LVGL + SPIFFS-Ansatz – dazu gegebenenfalls ein separater Artikel.

**F: Das GC9A01-Display hat keine Audioausgabe, nur Bildausgabe – was hat das mit I2S-Audioprojekten zu tun?**
A: Gar nichts. Der GC9A01 ist ein reines Anzeigegerät; die SPI-Schnittstelle überträgt ausschließlich Bilddaten. Wer gleichzeitig Audio abspielen möchte, benötigt ein separates I2S-DAC-Modul (z. B. MAX98357A). Beide Systeme arbeiten völlig unabhängig, ohne Pin-Konflikte.

---

## Erweiterungsideen

- **Analoge Uhr**: Zifferblatt mit Ziffern und Zeigern zeichnen, DS3231 RTC-Modul für Echtzeituhr
- **Rosenkurven-Modus**: `showTangent` auf false setzen, Kurve auf `r = a * sin(k * θ)` ändern – mit verschiedenen k-Werten ändert sich die Blütenblattanzahl
- **Taster für Themenwechsel**: Drei Taster steuern Kardioide / Rosenkurve / Lissajous-Figuren im Wechsel
- **Mit ESP32 Wi-Fi**: Wetter-API abfragen, Temperatur und Luftfeuchtigkeit auf dem runden Dashboard anzeigen
- Zwei Runddisplays kaufen:

---

## Referenzen

- [GC9A01 Treiberchip-Datenblatt (Galaxycore offiziell)](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub (moononournation)](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 Produktseite](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
- [ESP32 Arduino Core 3.x Release Notes](https://github.com/espressif/arduino-esp32/releases)
