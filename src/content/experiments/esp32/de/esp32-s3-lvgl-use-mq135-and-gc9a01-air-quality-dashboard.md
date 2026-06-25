---
title: "ESP32-S3 steuert GC9A01-Runddisplay + MQ135 für vollständiges Air-Quality-Dashboard-Tutorial (LVGL v9 + SPI-Schnittstelle + Arduino C++)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-25
intro: "Mit ESP32-S3 + MQ135-Gassensor + GC9A01 1,28-Zoll-Runddisplay und LVGL v9 ein Air-Quality-Dashboard mit animiertem Bogenanzeiger, Echtzeit-Trendlinie und pulsierendem Leuchteffekt erstellen, inklusive vollständiger Verkabelung, Code und Problembehebung."
image: "https://img.ling.lux.com/2026/06/4217f9f4026039eeca35a691450313dc.jpg"
---





> Schwierigkeit: ⭐⭐☆☆☆ (Mit wenigen Jumperkabeln loslegen)
> Geschätzte Zeit: 45 Minuten
> Testumgebung: Arduino IDE 2.3.8 · ESP32 Arduino Core 3.x · lvgl v9.5.0 · Arduino_GFX_Library v1.6.5

---

> **TL;DR (Willst du es schnell zum Laufen bringen? Hier findest du die Kurzversion)**
>
> **Erwartungsmanagement:** Dieses Projekt dient nur zum Einstieg, als Desktop-Schmuck und für reinen visuellen Genuss. **Bitte nicht dafür verwenden, um echte gefährliche Gaslecks zu messen!** Die Genauigkeit ist mehr oder minder "Pseudo-Wissenschaft".
>
> 1. **Verkabelung:** MQ135 A0 → GPIO 13; GC9A01 gemäß Tabelle an GPIO 7 / 9 / 10 / 11 / 12 / 18 anschließen
> 2. **Bibliotheken installieren:** Im Arduino-Bibliotheksmanager nach `lvgl` (v9.x) + `Arduino_GFX_Library` suchen
> 3. **lv_conf.h konfigurieren:** `LV_FONT_MONTSERRAT_14` und `LV_FONT_MONTSERRAT_28` aktivieren (0 → 1 ändern)
> 4. Hochladen → Runddisplay leuchtet auf, Dashboard beginnt zu arbeiten

---

## Einleitung

In meinem Staub fangenden Sensor-Fundament habe ich wieder einen Sensor gefunden, der sich speziell der Luftqualität widmet – das MQ135-Modul. Ich dachte mir, mal einen Blick auf die Luftqualität in meinem Workshop zu werfen, also habe ich es angeschlossen und getestet. Das Datenblatt告诉我, dass dieses Modul 24 Stunden zum Aufwärmen benötigt – fühlte sich eher wie Spielerei an. Allerdings ist dieses Modul empfindlich auf eine Reihe von Gasen; obwohl nicht unbedingt präzise, steigt der Wert bei Anwesenheit bestimmter Gase –可能是 Kohlendioxid, Ammoniak, Benzol, Alkohol, Rauch. Für relative Werturteile darüber, ob ein Raum gelüftet werden sollte, sollte es geeignet sein.

Also entstand dieses Projekt: ESP32-S3 + MQ135-Gassensor + GC9A01 1,28-Zoll-Runddisplay, kombiniert mit der berühmten LVGL v9-Grafikbibliothek, ein Air-Quality-Dashboard mit Bogenanzeiger, Echtzeit-Trendlinie und pulsierender Farbänderung.

Ziel dieses Artikels: **Von der ersten Verkabelung bis zum erfolgreichen Hochladen, dieses Effekt komplett nachbauen.**

---

## Versuchsergebnisse

Das Runddisplay zeigt in Echtzeit den aktuellen Luftqualitäts-ADC-Wert, den Status (EXCELLENT / GOOD / FAIR / MODERATE / POOR / DANGER) und den historischen Trendverlauf; die Anzeigefarbe verläuft von grün nach rot entsprechend der Luftqualität, der Außenrand hat einen rhythmischen "atmenden" Leuchteffekt. Die linke untere Ecke zeichnet gleichzeitig den niedrigsten und höchsten Wert seit dem Einschalten auf.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/2M6HRdpfW-Q" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Komponentenbeschreibung

> Das Entwicklungsboard (ESP32-S3) wird in diesem Artikel nicht beschrieben – im Folgenden werden nur die zwei Module behandelt, mit denen Einsteiger möglicherweise noch nicht Kontakt hatten.

### MQ135-Gassensor

MQ135 ist ein Gassensor, der负责 die Erkennung von Konzentrationsänderungen schädlicher Gase wie CO₂, Ammoniak, Benzol usw. in der Luft. In diesem Projekt dient er dazu, einen analogen ADC-Wert von 0～4095 auszugeben, der das aktuelle Luftqualitätsniveau widerspiegelt.

In einfachen Worten: **Es ist eine chemische "Nase"** – je trüber die Luft, desto höher die Ausgangsspannung, desto größer der ADC-Wert.

| Parameter | Wert |
|-----------|------|
| Nenn-Betriebsspannung | 5V (Heizung)/ Analoger Ausgang kompatibel mit 3,3V |
| Ausgangsschnittstelle | Analog (A0) + Digital (D0) |
| Aufwärmzeit | 24～48 Stunden (volle Genauigkeit)/ ca. 3 Minuten (Trendreferenz) |
| Erfassbare Gase | CO₂, NH₃, NOₓ, Benzol, Alkohol, Rauch |

**Über 3,3V-Betriebsspannung:** Die Nennspannung des MQ135 ist 5V. Bei 3,3V-Betrieb liegt die Heizleistung bei ca. 44% der Norm, die Empfindlichkeit sinkt, die Werte sind niedriger, aber für Trenddarstellung und Relativänderungserkennung ausreichend. Wenn absolute Präzision angestrebt wird, empfiehlt sich getrennte 5V-Versorgung für VCC; der analoge A0-Ausgang überschreitet nicht 3,3V, kann ohne Spannungsteiler direkt an ESP32-S3 angeschlossen werden.

Grund für die Auswahl: **Günstig (unter 5 Yuan), modular, direkt anschließbar** – für dieses "aussehenorientierte" Projekt vollkommen ausreichend.

**Korrekter Einsatz von MQ135 für Innenraumbeurteilung**

```
✅ Geeignet für:
  - Überwachung von Luftqualitätsänderungstrends (Relativwerte)
  - Schwellenwertauslösung für Lüftung/Alarm
  - "Gesamtschadstoff"-Indikator für mehrere schädliche Gase

❌ Nicht geeignet für:
  - Präzise Messung der Konzentration eines einzelnen Gases
  - Medizinische/industrielle Sicherheitskonformitätsprüfung
  - Genaue CO₂-Werte (Fehlertoleranz bis ±300ppm und mehr)
```

---

### GC9A01 1,28-Zoll-Rund-TFT-Display

GC9A01 ist ein 1,28-Zoll-Rund-TFT-LCD-Display, das über die SPI-Schnittstelle Bilddaten empfängt und rendert. In diesem Projekt dient es zur Anzeige einer Dashboard-Benutzeroberfläche mit Animationseffekten.

Analogie: **Genau wie die runden Zifferblätter auf Smartphones, deren Inhalt frei gestaltet werden kann.**

| Parameter | Wert |
|-----------|------|
| Displaygröße | 1,28 Zoll |
| Auflösung | 240 × 240 Pixel |
| Schnittstelle | SPI (bis 80 MHz) |
| Treiberchip | GC9A01 |
| Betriebsspannung | 3,3V |
| Hintergrundlichtsteuerung | Unterstützt (BL-Pin, PWM-Dimmung möglich) |

Grund für die Auswahl: **Einzigartige runde Form, kompakte Abmessungen, direkte 3,3V-Nutzung, native Unterstützung durch Arduino_GFX_Library** – in Kombination mit LVGL für Zifferblätter mit hervorragenden visuellen Effekten.

---

## BOM-Liste

| Komponente | Typ/Spezifikation | Menge |
|------------|-------------------|-------|
| Hauptentwicklungsboard | ESP32-S3 (mit USB-C) | 1 |
| Rund-TFT-Display | GC9A01 1,28" 240×240 | 1 |
| Gassensor | MQ135-Modul | 1 |
| Verbindungskabel | Jumperkabel | Verschiedene |



---

## Pin-Beschreibung der Komponenten

### MQ135-Modul-Pins

| Pin | Beschreibung |
|-----|--------------|
| VCC | Stromversorgung (in diesem Projekt 3,3V, Nennwert 5V) |
| GND | Masse |
| A0 | Analogausgang, an ESP32-S3 ADC-Pin anschließen |
| D0 | Digitalausgang (in diesem Projekt nicht verwendet) Gibt **High/Low-Pegel aus** |

### GC9A01-Modul-Pins

| Pin-Kennzeichnung | Beschreibung |
|--------------------|--------------|
| VCC | 3,3V-Stromversorgung |
| GND | Masse |
| SCL / CLK | SPI-Takt |
| SDA / MOSI | SPI-Daten |
| CS | Chip-Auswahl (Low-aktiv) |
| DC | Daten/Befehl-Umschaltung |
| RST | Reset (Low-Reset) |
| BL | Hintergrundlichtsteuerung (HIGH = ein) (Optional, nicht von jedem Modul herausgeführt) |

---

## Verkabelung

### MQ135 → ESP32-S3

| MQ135 | ESP32-S3 |
|-------|----------|
| VCC | 5V |
| GND | GND |
| A0 | GPIO 13 |

### GC9A01 → ESP32-S3

| GC9A01-Pin | ESP32-S3 GPIO |
|------------|---------------|
| VCC | 3,3V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL (Hintergrundlicht) | GPIO 7 (Kann weggelassen werden, wenn nicht vorhanden) |

> **Praktischer Hinweis:** Nach der Verkabelung **zeilenweise mit den obenstehenden beiden Tabellen abgleichen** – das spart 80% der Fehlersuchezeit. Am häufigsten werden DC und CS vertauscht – wenn diese beiden Kabel vertauscht sind, bleibt das Display entweder komplett weiß oder schwarz, was wie "Display defekt" aussieht, aber eigentlich nur falsch eingesteckte Kabel sind.

---

## Zu installierende Bibliotheken

Arduino IDE öffnen → Werkzeuge → Bibliotheken verwalten, suche und installiere die folgenden beiden:

| Bibliothek | Autor | In diesem Artikel getestete Version |
|------------|-------|-----------------------------------|
| `lvgl` | LVGL | v9.5.0 |
| `Arduino_GFX_Library` | Moon On Our Nation | v1.6.5 |

**Nach der Installation von lvgl gibt es noch einen notwendigen Schritt:**

1. Finde das lvgl-Bibliotheksverzeichnis (normalerweise in `Dokumente/Arduino/libraries/lvgl/`)
2. Kopiere `lv_conf_template.h` darin, benenne die Kopie um in `lv_conf.h`, und platziere sie auf derselben Ebene wie `lvgl/`
3. Öffne `lv_conf.h`, suche die folgenden zwei Zeilen, ändere `0` zu `1`:
   ```c
   #define LV_FONT_MONTSERRAT_14  1
   #define LV_FONT_MONTSERRAT_28  1
   ```
4. Öffne `lv_conf.h`, suche ganz am Anfang `#if 0` und ändere es zu `#if 1`

> Wenn dieser Schritt vergessen wird und direkt hochgeladen wird, meckert der Compiler mit `lv_font_montserrat_28 undeclared`. Frag nicht, woher ich das weiß.

---

## Vollständiger Code

```cpp
/*
 * ESP32-S3 + GC9A01 Runddisplay-Luftqualitätsdashboard v3.1
 * "Minimalistischer Tech-Stil" - Bogenfortschrittsanzeige + Echtzeit-Trendlinie + Pulsierendes Leuchten
 *
 * Testumgebung: Arduino IDE 2.3.2 / ESP32 Core 3.x
 * Abhängigkeiten: lvgl v9.2.x + Arduino_GFX_Library v1.4.x
 */

#include <Arduino.h>
#include <lvgl.h>
#include <Arduino_GFX_Library.h>
#include <math.h>

// ===================== Pin-Definitionen =====================
#define TFT_SCK    12   // SPI-Takt
#define TFT_MOSI   11   // SPI-Daten
#define TFT_CS     9    // Chip-Auswahl
#define TFT_DC     10   // Daten/Befehl-Umschaltung (falsch angeschlossen = Display bleibt weiß)
#define TFT_RST    18   // Reset
#define TFT_BL     7    // Hintergrundlicht – HIGH ist an, dieses Kabel vergessen = umsonst gearbeitet
#define MQ135_PIN  13   // MQ135 Analogeingang (ADC2-Kanal, funktioniert ohne Wi-Fi normal)

#define SCREEN_WIDTH   240
#define SCREEN_HEIGHT  240

// ===================== Display-Treiber initialisieren =====================
Arduino_ESP32SPI bus = Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01 gfx = Arduino_GC9A01(&bus, TFT_RST, 0, true);

// ===================== LVGL-Zeichenpuffer =====================
// 40 Zeilen Puffer belegen auf ESP32-S3 ca. 19KB, ausgewogene Balance zwischen Geschwindigkeit und Speicher
#define DRAW_BUF_LINES 40
alignas(4) static uint16_t draw_buf[SCREEN_WIDTH * DRAW_BUF_LINES];

// ===================== Trend-Historiendaten =====================
#define TREND_POINTS 40    // Behält die letzten 40 Abtastpunkte (× 300ms ≈ 12 Sekunden Historie pro Display)
static int trendData[TREND_POINTS] = {0};
static int trendIdx = 0;
static bool trendFull = false;
static lv_point_precise_t trendLinePoints[TREND_POINTS];

// ===================== LVGL-UI-Objekt-Handles =====================
static lv_obj_t *arc_bg;          // Bogen-Spuren-Hintergrund (dunkel)
static lv_obj_t *arc_main;        // Hauptbogen + End-Knob-Punkt
static lv_obj_t *glow_circle;     // Außenleuchtender Randkreis (atmet)
static lv_obj_t *center_circle;   // Mittlere Kreisscheibe
static lv_obj_t *label_value;     // Große mittlere Zahl (ADC-Wert)
static lv_obj_t *label_unit;      // Einheits-Label "ADC"
static lv_obj_t *label_status;    // Statustext (EXCELLENT / GOOD...)
static lv_obj_t *dot_status;      // Status-Kleinpunkt
static lv_obj_t *label_title;     // Titellabel oben "AIR QUALITY"
static lv_obj_t *label_score;     // Reinheitswert unten
static lv_obj_t *label_minmax;    // Min/Max-Werte
static lv_obj_t *trend_line;      // Trendlinie
static lv_obj_t *trend_container; // Linien-Beschneidungscontainer

// ===================== Sensorstatus =====================
static float smoothedValue = 0.0f; // Geglätteter Wert nach exponentieller Gewichtung
static bool firstSample = true;    // Erstes-Frame-Flag, vermeidet Animation ab 0
static int minValue = 4095;        // Niedrigster ADC-Wert seit diesem Einschalten
static int maxValue = 0;           // Höchster ADC-Wert seit diesem Einschalten
static float displayValue = 0.0f;  // UI-Animationsinterpolation

// ===================== LVGL-Takt-Callback =====================
static uint32_t my_tick_cb(void) { return millis(); }

// ===================== Flush-Callback: Nach LVGL-RegionRendering an Display senden =====================
void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = area->x2 - area->x1 + 1;
  uint32_t h = area->y2 - area->y1 + 1;
  gfx.draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)px_map, w, h);
  lv_display_flush_ready(disp); // LVGL mitteilen: Dieses Bereich fertig, kann mit nächstem weitermachen
}

// ===================== Farbsystem: ADC-Wert → Statusfarbe =====================
// Höherer Wert = Schlechtere Luft = Rötlichere Farbe, sechs Stufen entsprechen sechs Status
uint32_t getColorHex(int v) {
  if (v < 600)  return 0x00E5A0; // EXCELLENT: Frischgrün
  if (v < 1200) return 0x22C55E; // GOOD: Hellgrün
  if (v < 2000) return 0xA3E635; // FAIR: Gelbgrün
  if (v < 2800) return 0xEAB308; // MODERATE: Gelb
  if (v < 3500) return 0xF97316; // POOR: Orange
  return 0xFF3355;                // DANGER: Rot (Mach schnell das Fenster auf)
}

lv_color_t getColor(int v) {
  return lv_color_hex(getColorHex(v));
}

// Bogen-Spur-Grundfarbe (dunklere Version der Statusfarbe, passt zu dunklem Hintergrund)
uint32_t getDimColorHex(int v) {
  if (v < 600)  return 0x0A2A20;
  if (v < 1200) return 0x0A2A15;
  if (v < 2000) return 0x1A2A10;
  if (v < 2800) return 0x2A2208;
  if (v < 3500) return 0x2A1808;
  return 0x2A0A10;
}

const char* getStatusText(int v) {
  if (v < 600)  return "EXCELLENT";
  if (v < 1200) return "GOOD";
  if (v < 2000) return "FAIR";
  if (v < 2800) return "MODERATE";
  if (v < 3500) return "POOR";
  return "DANGER";
}

// ADC-Wert zu Reinheits-Prozentsatz (Niedrigerer ADC = Sauberer = Höherer Punktzahl)
int adcToScore(int adc) {
  adc = constrain(adc, 0, 4095);
  return constrain(100 - (adc * 100 / 4095), 0, 100);
}

// ===================== UI-Oberfläche erstellen =====================
void create_ui() {
  lv_obj_t *scr = lv_screen_active();

  // Schritt 1: Dunkler Hintergrund
  lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(scr, lv_color_hex(0x050810), 0);

  // Schritt 2: Äußerster leuchtender Rand (Farbe folgt Status, hat Atemanimation)
  glow_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(glow_circle);
  lv_obj_set_size(glow_circle, 234, 234);
  lv_obj_center(glow_circle);
  lv_obj_set_style_radius(glow_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(glow_circle, LV_OPA_TRANSP, 0);
  lv_obj_set_style_border_width(glow_circle, 2, 0);
  lv_obj_set_style_border_opa(glow_circle, LV_OPA_20, 0);
  lv_obj_set_style_border_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(glow_circle, 30, 0);
  lv_obj_set_style_shadow_spread(glow_circle, 2, 0);
  lv_obj_set_style_shadow_opa(glow_circle, LV_OPA_30, 0);
  lv_obj_set_style_shadow_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_clear_flag(glow_circle, LV_OBJ_FLAG_SCROLLABLE);

  // Schritt 3: Bogen-Spur-Grundfarbe (zeigt "noch nicht erreicht" dunkler Bereich)
  arc_bg = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_bg);
  lv_obj_set_size(arc_bg, 210, 210);
  lv_obj_center(arc_bg);
  lv_arc_set_range(arc_bg, 0, 100);
  lv_arc_set_bg_angles(arc_bg, 135, 45);
  lv_arc_set_value(arc_bg, 0);
  lv_obj_set_style_arc_width(arc_bg, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(0x0A2A20), LV_PART_MAIN);
  lv_obj_set_style_arc_rounded(arc_bg, true, LV_PART_MAIN);
  lv_obj_set_style_arc_width(arc_bg, 0, LV_PART_INDICATOR);
  lv_obj_set_style_arc_opa(arc_bg, LV_OPA_TRANSP, LV_PART_INDICATOR);
  lv_obj_set_style_bg_opa(arc_bg, LV_OPA_TRANSP, LV_PART_KNOB);
  lv_obj_clear_flag(arc_bg, LV_OBJ_FLAG_CLICKABLE);

  // Schritt 4: Hauptbogen (Echtzeitwert + End-Knob-Punkt)
  arc_main = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_main);
  lv_obj_set_size(arc_main, 210, 210);
  lv_obj_center(arc_main);
  lv_arc_set_range(arc_main, 0, 4095);
  lv_arc_set_bg_angles(arc_main, 135, 45);
  lv_arc_set_value(arc_main, 0);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_opa(arc_main, LV_OPA_TRANSP, LV_PART_MAIN);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_INDICATOR);
  lv_obj_set_style_arc_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_INDICATOR);
  lv_obj_set_style_arc_rounded(arc_main, true, LV_PART_INDICATOR);

  // knob = Endleuchtpunkt, weißer Rand + innere Füllung Statusfarbe + Leuchtschatten
  lv_obj_set_style_bg_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_bg_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_pad_all(arc_main, 5, LV_PART_KNOB);
  lv_obj_set_style_radius(arc_main, LV_RADIUS_CIRCLE, LV_PART_KNOB);
  lv_obj_set_style_border_width(arc_main, 3, LV_PART_KNOB);
  lv_obj_set_style_border_color(arc_main, lv_color_hex(0xFFFFFF), LV_PART_KNOB);
  lv_obj_set_style_border_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_shadow_width(arc_main, 18, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_shadow_opa(arc_main, LV_OPA_70, LV_PART_KNOB);
  lv_obj_set_style_shadow_spread(arc_main, 2, LV_PART_KNOB);
  lv_obj_clear_flag(arc_main, LV_OBJ_FLAG_CLICKABLE);

  // Schritt 5: Mittlere Kreisscheibe (Werte, Trendlinie, Statustext)
  center_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(center_circle);
  lv_obj_set_size(center_circle, 140, 140);
  lv_obj_center(center_circle);
  lv_obj_set_style_radius(center_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(center_circle, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(center_circle, lv_color_hex(0x080E1A), 0);
  lv_obj_set_style_bg_grad_color(center_circle, lv_color_hex(0x0C1628), 0);
  lv_obj_set_style_bg_grad_dir(center_circle, LV_GRAD_DIR_VER, 0);
  lv_obj_set_style_border_width(center_circle, 1, 0);
  lv_obj_set_style_border_color(center_circle, lv_color_hex(0x1A3050), 0);
  lv_obj_set_style_border_opa(center_circle, LV_OPA_60, 0);
  lv_obj_set_style_pad_all(center_circle, 0, 0);
  lv_obj_clear_flag(center_circle, LV_OBJ_FLAG_SCROLLABLE);

  // Mittlere große Zahl
  label_value = lv_label_create(center_circle);
  lv_label_set_text(label_value, "0");
  lv_obj_set_style_text_font(label_value, &lv_font_montserrat_28, 0);
  lv_obj_set_style_text_color(label_value, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_value, LV_ALIGN_CENTER, 0, -26);

  // Einheits-Label
  label_unit = lv_label_create(center_circle);
  lv_label_set_text(label_unit, "ADC");
  lv_obj_set_style_text_font(label_unit, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_unit, lv_color_hex(0x506878), 0);
  lv_obj_align(label_unit, LV_ALIGN_CENTER, 0, -6);

  // Trendlinien-Container (zuständig für Beschneidung, verhindert Überlauf)
  trend_container = lv_obj_create(center_circle);
  lv_obj_remove_style_all(trend_container);
  lv_obj_set_size(trend_container, 110, 30);
  lv_obj_align(trend_container, LV_ALIGN_CENTER, 0, 16);
  lv_obj_set_style_bg_opa(trend_container, LV_OPA_TRANSP, 0);
  lv_obj_set_style_pad_all(trend_container, 0, 0);
  lv_obj_set_style_clip_corner(trend_container, true, 0);
  lv_obj_set_style_radius(trend_container, 4, 0);
  lv_obj_clear_flag(trend_container, LV_OBJ_FLAG_SCROLLABLE);

  // Linien-untere Referenz-Basislinie
  static lv_point_precise_t refPts[2] = {{0, 28}, {110, 28}};
  lv_obj_t *refLine = lv_line_create(trend_container);
  lv_line_set_points(refLine, refPts, 2);
  lv_obj_set_style_line_color(refLine, lv_color_hex(0x1A2535), 0);
  lv_obj_set_style_line_width(refLine, 1, 0);

  // Trendlinie (alle Punkte initial unten)
  for (int i = 0; i < TREND_POINTS; i++) {
    trendLinePoints[i].x = (int32_t)(i * 110 / (TREND_POINTS - 1));
    trendLinePoints[i].y = 28;
  }
  trend_line = lv_line_create(trend_container);
  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
  lv_obj_set_style_line_color(trend_line, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_line_width(trend_line, 2, 0);
  lv_obj_set_style_line_rounded(trend_line, true, 0);
  lv_obj_set_style_line_opa(trend_line, LV_OPA_70, 0);

  // Status-Kleinpunkt
  dot_status = lv_obj_create(center_circle);
  lv_obj_remove_style_all(dot_status);
  lv_obj_set_size(dot_status, 8, 8);
  lv_obj_set_style_radius(dot_status, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(dot_status, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(dot_status, 8, 0);
  lv_obj_set_style_shadow_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_opa(dot_status, LV_OPA_50, 0);
  lv_obj_align(dot_status, LV_ALIGN_CENTER, -42, 42);

  // Statustext
  label_status = lv_label_create(center_circle);
  lv_label_set_text(label_status, "EXCELLENT");
  lv_obj_set_style_text_font(label_status, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_status, LV_ALIGN_CENTER, 3, 42);

  // Titel oben
  label_title = lv_label_create(scr);
  lv_label_set_text(label_title, "AIR QUALITY");
  lv_obj_set_style_text_font(label_title, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_title, lv_color_hex(0x4A6070), 0);
  lv_obj_set_style_text_letter_space(label_title, 3, 0);
  lv_obj_align(label_title, LV_ALIGN_TOP_MID, 0, 60);

  // Bewertung unten
  label_score = lv_label_create(scr);
  lv_label_set_text(label_score, "100% CLEAN");
  lv_obj_set_style_text_font(label_score, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_score, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_score, LV_ALIGN_BOTTOM_MID, 0, -8);

  // MIN/MAX-Aufzeichnung (oberhalb der Bewertung unten)
  label_minmax = lv_label_create(scr);
  lv_label_set_text(label_minmax, "L:-- H:--");
  lv_obj_set_style_text_font(label_minmax, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_minmax, lv_color_hex(0x3A4A5A), 0);
  lv_obj_align(label_minmax, LV_ALIGN_BOTTOM_MID, 0, -24);
}

// ===================== Trendliniendaten aktualisieren =====================
void updateTrend(int value) {
  trendData[trendIdx] = value;
  trendIdx = (trendIdx + 1) % TREND_POINTS;
  if (trendIdx == 0) trendFull = true;

  int count = trendFull ? TREND_POINTS : trendIdx;
  if (count < 2) return;

  // Datenbereich finden, für Normalisierung auf Linienhöhe
  int vMin = 4095, vMax = 0;
  for (int i = 0; i < count; i++) {
    if (trendData[i] < vMin) vMin = trendData[i];
    if (trendData[i] > vMax) vMax = trendData[i];
  }
  // Minimale Fluktuation gewährleisten – sonst wird die Linie bei zu stabiler Luft zur toten Linie
  if (vMax - vMin < 50) vMax = vMin + 50;

  int chartW = 110;
  int chartH = 26;

  for (int i = 0; i < TREND_POINTS; i++) {
    int x = i * chartW / (TREND_POINTS - 1);
    int y;
    if (i < count) {
      int dataIdx = trendFull ? (trendIdx + i) % TREND_POINTS : i;
      int normalized = (trendData[dataIdx] - vMin) * chartH / (vMax - vMin);
      y = chartH - normalized + 1; // Y-Achse umdrehen: Höherer Wert = Punkt weiter oben
    } else {
      y = chartH + 1; // Positionen ohne Daten erst unten platzieren
    }
    trendLinePoints[i].x = x;
    trendLinePoints[i].y = y;
  }

  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
}

// ===================== UI-Anzeige aktualisieren =====================
void update_ui(int value, int raw) {
  value = constrain(value, 0, 4095);
  raw   = constrain(raw, 0, 4095);

  // Glatte Animation: Proframe 18% zum Zielwert annähern, Zahlenänderungen glatt ohne abrupte Sprünge
  float diff = (float)value - displayValue;
  displayValue += diff * 0.18f;
  int dispVal = (int)(displayValue + 0.5f);

  lv_color_t c  = getColor(dispVal);
  uint32_t dimC = getDimColorHex(dispVal);
  int score     = adcToScore(dispVal);

  // Min/Max-Aufzeichnung aktualisieren
  if (raw < minValue) minValue = raw;
  if (raw > maxValue) maxValue = raw;

  // Hauptbogen + Knob-Farbe folgt Status
  lv_arc_set_value(arc_main, dispVal);
  lv_obj_set_style_arc_color(arc_main, c, LV_PART_INDICATOR);
  lv_obj_set_style_bg_color(arc_main, c, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, c, LV_PART_KNOB);

  // Spur-Grundfarbe
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(dimC), LV_PART_MAIN);

  // Außenleuchtender Kreis: Farbe folgt Status + sin-Funktion simuliert Atem-Transparenz
  lv_obj_set_style_border_color(glow_circle, c, 0);
  lv_obj_set_style_shadow_color(glow_circle, c, 0);
  static uint32_t breathCount = 0;
  breathCount++;
  float sinVal = sinf((breathCount * 6) % 360 * 3.14159f / 180.0f);
  lv_opa_t breathOpa = (lv_opa_t)(LV_OPA_20 + (int)(sinVal * 25.0f));
  lv_obj_set_style_shadow_opa(glow_circle, breathOpa, 0);
  lv_opa_t borderOpa = (lv_opa_t)(LV_OPA_10 + (int)(sinVal * 15.0f));
  lv_obj_set_style_border_opa(glow_circle, borderOpa, 0);

  // Mittlere Zahl
  lv_label_set_text_fmt(label_value, "%d", dispVal);
  lv_obj_set_style_text_color(label_value, c, 0);

  // Statustext + Kleinpunkt (Punktschatten atmet auch)
  lv_label_set_text(label_status, getStatusText(dispVal));
  lv_obj_set_style_text_color(label_status, c, 0);
  lv_obj_set_style_bg_color(dot_status, c, 0);
  lv_obj_set_style_shadow_color(dot_status, c, 0);
  lv_opa_t dotOpa = (lv_opa_t)(LV_OPA_30 + (int)(sinVal * 40.0f));
  lv_obj_set_style_shadow_opa(dot_status, dotOpa, 0);

  // Trendlinien-Farbe
  lv_obj_set_style_line_color(trend_line, c, 0);

  // MIN/MAX
  lv_label_set_text_fmt(label_minmax, "L:%d  H:%d", minValue, maxValue);

  // Reinheitswert unten
  const char *statusWord;
  if (score >= 80)      statusWord = "CLEAN";
  else if (score >= 60) statusWord = "FAIR";
  else if (score >= 40) statusWord = "HAZY";
  else if (score >= 20) statusWord = "DIRTY";
  else                  statusWord = "TOXIC";
  lv_label_set_text_fmt(label_score, "%d%% %s", score, statusWord);
  lv_obj_set_style_text_color(label_score, c, 0);
}

// ===================== setup =====================
void setup() {
  Serial.begin(115200);
  delay(200);

  // Schritt 1: Hintergrundlicht auf HIGH, ohne diesen Schritt bleibt Display schwarz
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // Schritt 2: ADC konfigurieren (12-Bit-Genauigkeit, 0-3,3V-Messbereich)
  // Hinweis: ADC_11db ist in ESP32 Core 3.x äquivalent zu ADC_ATTEN_DB_12, kompatible alte Schreibweise
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Schritt 3: Display starten, SPI-Frequenz 40MHz
  gfx.begin(40000000);

  // Schritt 4: LVGL initialisieren
  lv_init();
  lv_tick_set_cb(my_tick_cb);

  lv_display_t *disp = lv_display_create(SCREEN_WIDTH, SCREEN_HEIGHT);
  lv_display_set_color_format(disp, LV_COLOR_FORMAT_RGB565);
  lv_display_set_buffers(disp, draw_buf, NULL, sizeof(draw_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(disp, my_disp_flush);

  // Schritt 5: Oberfläche aufbauen, initial mit 0-Wert
  create_ui();
  displayValue = 0;
  update_ui(0, 0);

  Serial.println("[SYS] Gauge v3.1 Ready!");
}

// ===================== loop =====================
void loop() {
  static uint32_t lastSensorMs = 0;
  static uint32_t lastTrendMs  = 0;
  static uint32_t lastLogMs    = 0;

  uint32_t now = millis();

  // Alle 50ms: Sensor auslesen + UI aktualisieren (ca. 20fps, flüssig ohne Stottern)
  if (now - lastSensorMs >= 50) {
    int raw = analogRead(MQ135_PIN);
    raw = constrain(raw, 0, 4095);

    if (firstSample) {
      // Erstes Frame direkt zuweisen, Übergang ab 0 überspringen
      smoothedValue = raw;
      displayValue  = raw;
      firstSample   = false;
    } else {
      // Exponentielle Gewichtung: Neuer Wert 12%, Alter Wert behält 88%, glatt aber nicht träge
      smoothedValue = smoothedValue * 0.88f + raw * 0.12f;
    }

    update_ui((int)smoothedValue, raw);
    lastSensorMs = now;
  }

  // Alle 300ms: Einen Datenpunkt zur Trendlinie schieben (40 Punkte × 300ms ≈ 12 Sekunden für eine Display-Historie)
  if (now - lastTrendMs >= 300) {
    updateTrend((int)smoothedValue);
    lastTrendMs = now;
  }

  // Alle 1s: Serial-Debug-Log-Ausgabe (bei Problemen Seriellen Monitor öffnen)
  if (now - lastLogMs >= 1000) {
    Serial.printf("SCORE=%d%%  ADC=%d  SMOOTH=%d  L=%d H=%d [%s]\n",
                  adcToScore((int)smoothedValue),
                  analogRead(MQ135_PIN),
                  (int)smoothedValue,
                  minValue, maxValue,
                  getStatusText((int)smoothedValue));
    lastLogMs = now;
  }

  lv_timer_handler(); // LVGL-interne Taskplanung, muss periodisch aufgerufen werden, nicht vergessen
  delay(5);
}
```

### Code-Erklärung

Ein paar wichtige Designentscheidungen, sonst ist der Code schwer zu verstehen:

**① Warum exponentielle Gewichtung statt direkter Anzeige des Roh-ADC?**

Der analoge Ausgang des MQ135 hat gewisses Rauschen, direkte Anzeige springt ständig. Exponentielle Gewichtung (EMA)-Formel:

```
Neuer geglätteter Wert = Alter geglätteter Wert × 0,88 + Rohwert × 0,12
```

Gewichtung 0,12 bedeutet neue Daten haben weniger Einfluss, Wertänderungen glatt aber folgen dem Trend. Für schnellere Reaktion `0.12f` erhöhen (Maximum 1,0 = völlig unglättet); für stabilere Anzeige `0.88f` erhöhen.

**② Wie funktioniert der Atemeffekt?**

In `update_ui()` generiert `sinf()` einen −1 bis +1 periodischen Wert, abgebildet auf Transparenzbereich (`LV_OPA_20` ～ `LV_OPA_45``, Zähler inkrementiert bei jedem Aufruf. Außenrand und Schatten-Transparenz flackern so periodisch, wie "atmen".

**③ Warum ist die Trendlinie manchmal flach?**

Wenn Umgebung sehr stabil, Differenz zwischen maximalem und minimalem historischen Wert sehr klein, wird Linie erzwungen auf mindestens 50 ADC Fluktuationsbereich:

```cpp
if (vMax - vMin < 50) vMax = vMin + 50;
```

Selbst bei unveränderter Luft wird die Linie nicht zur toten Linie, man sieht noch kleine Fluktuationen.

---

## Häufige Fehlerbehebung

Keine Panik, 80% der Probleme liegen an diesen Stellen:

**Display komplett schwarz, keine Reaktion**
Erste Maßnahme: Prüfen ob BL-Pin an GPIO 7 angeschlossen ist, ob `digitalWrite(TFT_BL, HIGH)` im Code ausgeführt wurde. Ohne Hintergrundlicht bleibt Display schwarz – nicht Display defekt, sondern Hintergrundlicht nicht auf HIGH.

**Display komplett weiß oder rot (hat Farbe aber keinen Inhalt)**
90% Wahrscheinlichkeit sind DC und CS vertauscht. Mit Verkabelungstabelle diese beiden Leitungen überprüfen, oder direkt vertauschen ausprobieren.

**Kompilierfehler: `lv_font_montserrat_28 undeclared`**
`lv_conf.h` nicht korrekt konfiguriert oder am falschen Ort. Zurück zu "Zu installierende Bibliotheken", Schritte befolgen, Schriftartoptionen von 0 auf 1 ändern.

**ADC-Lesung immer 0 oder 4095 ohne Änderung**
Mit Multimeter A0-Ausgangsspannung des MQ135 messen, normalerweise zwischen 0,5V～2,5V. Bei 0V VCC-Verbindung prüfen; bei Volbereich (3,3V) vielleicht Sensor nicht genug aufgewärmt – neuer Sensor direkt nach Einschalten ungenau, 3 Minuten warten.

**Werte springen heftig**
Glättungskoeffizient `0.88f` im Code erhöhen (z.B. `0.95f`), glättiger aber langsamere Reaktion.

**LVGL warnt vor Speichermangel oder friert zur Laufzeit ein**
`DRAW_BUF_LINES` von 40 auf kleiner setzen (z.B. 20), Pufferverbrauch reduzieren. ESP32-S3 Standard-RAM reicht, nur bei kleineren RAM-Platinen tritt dieses Problem auf.

---

## FAQ

**F: Ist GPIO 13 fest? Kann auf anderen ADC-Pin gewechselt werden?**
A: Ja, möglich. Auf ESP32-S3 gehören GPIO 1～10 zu ADC1, GPIO 11～20 zu ADC2. Dieses Projekt verwendet kein Wi-Fi, ADC2-Pins (einschließlich GPIO 13) konfliktfrei, normal nutzbar. Bei späterem Wi-Fi-Hinzufügung empfiehlt sich Sensor auf ADC1-Pin (GPIO 1～10) zu wechseln,避免 Wi-Fi bei ADC2-Belegung Lese-Fehler verursacht.

**F: MQ135 an 3,3V, wie genau sind die Werte?**
A: Nicht präzise genug, aber für Trenddarstellung vollkommen ausreichend. MQ135 Nennspannung 5V, bei 3,3V-Betrieb Heizleistung ca. 44% der Norm, Empfindlichkeit sinkt, Absolutwerte niedriger. Für ppm-Konzentrationsumrechnung empfiehlt sich getrennte 5V-Versorgung für VCC, A0-Ausgang überschreitet nicht 3,3V, kein zusätzlicher Spannungsteiler nötig.

**F: LVGL muss v9 sein? Kann v8 laufen?**
A: v8 kann diesen Code nicht direkt ausführen. v9 führte `lv_display_t`, `lv_display_create` etc. neue API ein, in v8 existieren diese Strukturen nicht, direkte Kompilierung meldet viele Fehler. Stark empfohlen v9.2.x oder höher zu installieren, nicht downgraden.

**F: Runddisplay hat schwarze "Lücken" in vier Ecken, schlechtes Löten?**
A: Normales Erscheinung, kein Problem. GC9A01 hat runden Anzeigebereich, underlying Buffer 240×240 quadratisch, vier Ecken sind physikalische Abdeckstrukturen, keine echten Pixel, keine Anzeige ist korrekt.

**F: Sensor springt stark direkt nach Einschalten, wie lange bis stabil?**
A: MQ135 braucht Aufwärmen. Neuer Sensor empfohlen durchgehend 24～48 Stunden einschalten bis Werte stabil; gebrauchter Sensor ca. 3 Minuten nach Einschalten stabil. Kann `delay(180000)` (3 Minuten) am Ende von `setup()` hinzufügen, oder in UI "Aufwärmen"-Status einbauen, nach Ablauf offiziell mit Aufnahme beginnen.

**F: Display-Aktualisierung etwas ruckelig, wie beschleunigen?**
A: Zwei Richtungen: ① SPI-Frequenz in `gfx.begin(40000000)` auf 80MHz erhöhen (GC9A01 max 80MHz, aber einige Platinen schlechte Verdrahtung bei hoher Frequenz instabil, erst testen); ② `DRAW_BUF_LINES` vergrößern (z.B. 60), LVGL-Teil-Aktualisierungsanzahl reduzieren, Kosten ca. 9KB mehr RAM.

---

## Erweiterungsideen

Nach dem Laufenlassen kann in diese Richtungen weiter entwickelt werden:

- BME280 anschließen, Temperatur/Feuchte hinzufügen, Dashboard zeigt zusätzliche Datenzeile
- Via Wi-Fi ADC-Daten an Home Assistant melden, langfristige Historiekurve erstellen
- Tasten für Displaymodus-Umschaltung hinzufügen (Dashboard / Großzahlen-Modus / Nur-Linie)
- MQ-7-Sensor, speziell für Kohlenmonoxidkonzentration
- Buzzer hinzufügen, Luftqualität bei DANGER-Gebiet Alarm auslösen

---

## Referenzmaterial

- [GC9A01 Treiberchip-Datenblatt (Galaxycore offiziell)](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [MQ135-Sensor-Spezifikation (Winsen 炜盛 offiziell)](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ135%20(Ver1.4)%20-%20Manual.pdf)
- [Arduino_GFX_Library GitHub-Homepage](https://github.com/moononournation/Arduino_GFX)
- [LVGL offizielle Dokumentation v9](https://docs.lvgl.io/9.0/)
<!-- - [ESP32-S3 Technisches Referenzhandbuch (Espressif offiziell)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf) -->