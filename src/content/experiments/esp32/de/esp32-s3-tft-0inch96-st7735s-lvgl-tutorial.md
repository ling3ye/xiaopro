---
title: "ESP32-S3 + $3 Klein-Display mit LVGL-Animation | In 10 Minuten fertig – auch fuer Einsteiger"
boardId: esp32s3
moduleId: display/tft096-st7735s
category: esp32
date: 2026-04-10
intro: "ESP32-S3 steuert ein 0,96-Zoll-ST7735S-TFT-Farbdisplay und zeigt LVGL-Animationen. Von der Verkabelung bis zum vollstaendigen Code – inklusive Fehlervermeidungs-Guide, perfekt fuer Arduino- und Embedded-Einsteiger."
image: "https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png"
---

# ESP32-S3 + $3 Klein-Display mit LVGL-Animation! In 10 Minuten fertig (2026 – aktuelle Problemloesungen)

> **Kurzusammenfassung**: ESP32-S3 steuert ein 0,96-Zoll-ST7735S-TFT-Display + LVGL-Animationen, 5 Kern-Pins fuer die Verkabelung + vollstaendiger Guide zur Fehlervermeidung

## Endergebnis

![image-20260410152138611](https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png)

> Ein 0,96-Zoll-Display, kaum groesser als ein Fingernagel, und trotzdem laufen darauf fluessige LVGL-Animationen. Dieser Artikel erklaert alles – von der Verkabelung bis zum Code – und nimmt dir die typischen Stolpersteine vorweg.



------

Youtube：

<iframe width="560" height="315" src="https://www.youtube.com/embed/CQLLgFDcRxQ?si=FN2UYXNuTbGifnBN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

------

## Was du lernst

1. Wie der ESP32-S3 ein ST7735S 0,96-Zoll-TFT-Farbdisplay ueber SPI ansteuert
2. Die Konfiguration der Arduino_GFX-Bibliothek (und warum nicht TFT_eSPI)
3. Der komplette Ablauf, um LVGL v9 auf einem Klein-Display zum Laufen zu bringen
4. Ein LVGL-UI-Beispiel mit doppelter Animation (horizontal Verschiebung + vertikaler Bounce)



## BOM-Liste

| Bauteil                           | Menge | Hinweis                               |
| --------------------------------- | ----- | -------------------------------------- |
| ESP32-S3-Entwicklungsboard       | 1     | Beliebige S3-Variante moeglich         |
| 0,96-Zoll-ST7735S-TFT-IPS-Display| 1     | 80x160 Aufloesung, SPI, 8 Pin         |
| Dupont-Kabel (weiblich-weiblich)  | einige | 8 Stueck reichen aus                   |





## Display-Spezifikationen

![image-20260410113243742](https://img.lingflux.com/2026/04/e66957af12d082ebd30b5b8cdb06de8c.png)

> Nichts davon muss man auswendig kennen. Konzentriere dich auf die mit **\*** markierten Parameter – die brauchst du beim Programmieren.

| Parameter        | Spezifikation           | Hinweis                                                          |
| ---------------- | ----------------------- | ---------------------------------------------------------------- |
| Groesse          | 0,96 Zoll TFT IPS       | Weiter Betrachtungswinkel, gute Farbwiedergabe                   |
| Aufloesung       | 80(H) x 160(V)          | **\*** Im Code `screenWidth=160, screenHeight=80` (Querformat)   |
| Treiberchip      | ST7735S                 | **\*** Muss bei der Bibliothekswahl exakt passen                 |
| Schnittstelle    | 4-Draht-SPI             | Max. 40 MHz (zunaechst mit Standardfrequenz testen)              |
| Betriebsspannung | **3.3V**                | **\*** Auf gar keinen Fall 5V anschliessen!                      |
| Pin-Anzahl       | 8 Pin                   | Inklusive Hintergrundbeleuchtung-Pin BLK                         |



| Parameter           | Spezifikation             |
| ------------------- | ------------------------- |
| Anzeigebereich      | 10.8(H) x 21.7(V) mm     |
| Panelgroesse        | 19(H) x 24(V) x 2.7(D) mm|
| Pixelabstand        | 0.135(H) x 0.1356(V) mm  |
| Betriebsstrom       | 20mA                      |
| Hintergrundbeleucht.| 1 LED                     |
| Betriebstemperatur  | -20 ~ 70 °C               |
| PCB-Groesse         | 30.00 x 24.04 mm          |
| Befestigungsloch-ID | 2 mm                      |
| Stiftleiste-Raster  | 2.54 mm                   |

**Pin-Belegung:**

| Nr. | Pin | Beschreibung                                              |
| --- | --- | --------------------------------------------------------- |
| 1   | GND | Masse                                                     |
| 2   | VCC | Stromversorgung (3.3V)                                    |
| 3   | SCL | SPI-Taktsignal                                            |
| 4   | SDA | SPI-Datensignal                                           |
| 5   | RES | Reset (Low-Pegel = Reset)                                 |
| 6   | DC  | Register/Daten-Auswahl (Low = Befehl, High = Daten)       |
| 7   | CS  | Chip Select (Low-Pegel = aktiv)                           |
| 8   | BLK | Hintergrundbeleuchtung (High = an; ungenutzt direkt an 3.3V) |





## Verkabelung

| ESP32-S3-Pin | ST7735S-Pin | Beschreibung                                       |
| ------------ | ----------- | -------------------------------------------------- |
| GND          | GND         | Gemeinsame Masse                                    |
| **3.3V**     | VCC         | **Striktes 5V-Verbot!**                             |
| GPIO 12      | SCL         | SPI-Takt                                            |
| GPIO 11      | SDA         | SPI-Daten (MOSI)                                    |
| GPIO 21      | RES         | Reset                                               |
| GPIO 47      | DC          | Befehl/Daten-Auswahl                                |
| GPIO 38      | CS          | Chip Select                                         |
| GPIO 48      | BLK         | Hintergrundbeleuchtung (ungesteuert direkt an 3.3V) |



### Hinweise zur Verkabelung

- **Stromversorgung**: Nur 3.3V – 5V zerstoert das Display
- **BLK-Hintergrundbeleuchtung**: Wenn keine Softwaresteuerung noetig ist, einfach direkt an 3.3V anschliessen (immer an)
- **CS Chip Select**: Low-Pegel aktiv
- **RES Reset**: Beim Einschalten ist ein Low-Pegel-Reset fuer die Initialisierung noetig
- **Pin-Wahl**: Die obigen Pins nutzen die Standard-Pins des ESP32-S3-SPI2 (FSPI). Wenn du andere Pins verwendest, musst du die Makros im Code entsprechend anpassen



## Bibliotheken installieren

In der Arduino IDE die folgenden beiden Bibliotheken installieren:

1. **Arduino_GFX_Library** – Suche nach „GFX Library for Arduino"
2. **LVGL** – Suche nach `lvgl` (es wird **Version v9.x** benoetigt)

> **Warum Arduino_GFX statt TFT_eSPI?**
>
> Vorne weg: Ich mag TFT_eSPI wirklich und habe damit schon viele Displays angesteuert. Beide Bibliotheken koennen das ST7735S-Display ansteuern, aber der Konfigurationsaufwand ist sehr unterschiedlich:
>
> **Das Problem mit TFT_eSPI: Manuelle Aenderungen an den Bibliotheksquelldateien**
>
> TFT_eSPI verlangt, dass du die Datei `User_Setup.h` im Bibliotheksverzeichnis oeffnest und dort manuell Pin-Definitionen und Treiberchips anpasst. Das bedeutet:
>
> 1. Du musst den Bibliotheksinstallationspfad finden (unterscheidet sich je nach System: `Documents/Arduino/libraries/` oder `.platformio/packages/`)
>
> 2. In einer hunderte Zeilen langen Konfigurationsdatei die richtigen Zeilen finden, den Standard auskommentieren und die gewuenschten Werte aktivieren
>
> 3. Wenn du gleichzeitig an Projekten mit verschiedenen Displays arbeitest, musst du bei jedem Wechsel diese Datei neu anpassen
>
> 4. **Nach einem Bibliotheks-Update wird die Konfiguration ueberschrieben** – und ploetzlich kompiliert dein Projekt nicht mehr
>
>    Das ist auch der haeufigste Grund fuer die Klage: „Alles wie im Video-Tutorial gemacht, aber nur weisser Bildschirm" – meistens ist `User_Setup.h` falsch oder gar nicht aktiv.
>
>    **Arduino_GFX dagegen: Pins direkt im Code definieren**
>
>    Im Vergleich wird bei Arduino_GFX die gesamte Konfiguration direkt in deiner eigenen `.ino`-Datei erledigt:
>
>    ```c
>    // Alle Pins und Treiberparameter direkt im Code definiert – keine Bibliotheksdatei muss geaendert werden
>    Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
>    Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
>    ```
>
>    - Pins geaendert? Eine Zeile `#define` anpassen
>
>    - Anderes Display? `Arduino_ST7735` durch z. B. `Arduino_ILI9341` ersetzen
>
>    - Bibliotheks-Update? Beeinflusst deinen Code nicht
>
>    - Mehrere Projekte parallel? Jedes Projekt hat seine eigene Definition, keine Konflikte
>
>    **Zudem hat TFT_eSPI Kompatibilitaetsprobleme mit dem ESP32-S3.** Auf GitHub gibt es mehrere Issues, die von Kompilierfehlern unter ESP32 Arduino Core 3.x berichten. Arduino_GFX wird hingegen aktiv gepflegt und bietet bessere Unterstuetzung fuer neuere Chips.





## Entwicklungsumgebung

Die Entwicklungsumgebung fuer dieses Beispiel:

MacOS - v15.1.1

Arduino IDE - v2.3.8

Board-Bibliothek: esp32 (by Espressif Systems) - v3.3.7

Display-Treiber-Bibliothek: GFX Library for Arduino (by Moon on our nation) - v1.6.5

Grafikbibliothek: LVGL (by kisvegabor) - v9.5.0



## Vollstaendiger Code



```c
#include <Arduino_GFX_Library.h>
#include <lvgl.h>

// --- Pins & GFX-Initialisierung ---
#define TFT_CS 38
#define TFT_RST 21
#define TFT_DC 47
#define TFT_MOSI 11
#define TFT_SCLK 12
#define TFT_BLK 48

#define BLACK   0x0000
#define WHITE   0xFFFF
#define ROTATION 1

Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);

static const uint32_t screenWidth  = 160;
static const uint32_t screenHeight = 80;

void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = lv_area_get_width(area);
  uint32_t h = lv_area_get_height(area);
  uint32_t stride = lv_draw_buf_width_to_stride(w, LV_COLOR_FORMAT_RGB565);
  uint8_t * row_ptr = px_map;

  for (uint32_t y = 0; y < h; y++) {
    gfx->draw16bitRGBBitmap(area->x1, area->y1 + y, (uint16_t *)row_ptr, w, 1);
    row_ptr += stride;
  }
  lv_display_flush_ready(display);
}

// ==========================================
// Animations-Callback-Funktionen definieren (empfangen LVGL-Animationswerte)
// ==========================================

// Callback: X-Koordinate des Objekts aendern (horizontale Bewegung)
static void anim_x_cb(void * var, int32_t v) {
  lv_obj_set_x((lv_obj_t *)var, v);
}

// Callback: Y-Koordinate des Objekts aendern (vertikale Bewegung)
static void anim_y_cb(void * var, int32_t v) {
  lv_obj_set_y((lv_obj_t *)var, v);
}

void setup() {
  Serial.begin(115200);
  pinMode(TFT_BLK, OUTPUT);
  digitalWrite(TFT_BLK, HIGH);

  gfx->begin();
  gfx->fillScreen(BLACK);

  lv_init();
  lv_display_t *display = lv_display_create(screenWidth, screenHeight);
  lv_display_set_color_format(display, LV_COLOR_FORMAT_RGB565);

  static lv_color_t buf[screenWidth * screenHeight / 10];
  lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(display, my_disp_flush);

  // Bildschirmhintergrund auf Standard-Weiss setzen
  lv_obj_set_style_bg_color(lv_scr_act(), lv_color_hex(0xFFFFFF), 0);

  // ==========================================
  // Fortgeschrittenes UI-Layout: transparenter Container als Wrapper
  // ==========================================

  // 1. Einen transparenten Container erstellen (Groesse 100x60)
  lv_obj_t * cont = lv_obj_create(lv_scr_act());
  lv_obj_set_size(cont, 100, 60);
  lv_obj_set_style_bg_opa(cont, 0, 0);             // Hintergrund komplett transparent
  lv_obj_set_style_border_width(cont, 0, 0);       // Rahmen entfernen
  lv_obj_set_style_pad_all(cont, 0, 0);            // Innenabstand entfernen
  lv_obj_align(cont, LV_ALIGN_CENTER, 0, 0);       // Container zentrieren

  // 2. Gruenes Quadrat in den Container legen, oben mittig ausrichten
  lv_obj_t *rect = lv_obj_create(cont);
  lv_obj_set_size(rect, 30, 30);
  lv_obj_set_style_bg_color(rect, lv_color_hex(0x00FF00), 0);
  lv_obj_set_style_border_width(rect, 0, 0);
  lv_obj_align(rect, LV_ALIGN_TOP_MID, 0, 0);

  // 3. Text in den Container legen, unten mittig ausrichten
  lv_obj_t * label = lv_label_create(cont);
  lv_label_set_text(label, "hello world!");
  lv_obj_set_style_text_color(label, lv_color_hex(0x000000), 0);
  lv_obj_align(label, LV_ALIGN_BOTTOM_MID, 0, 0);


  // ==========================================
  // Doppelte Animation hinzufuegen (LVGL-v9-Animations-Engine)
  // ==========================================

  // Animation A: Den gesamten Container (Quadrat + Text) links/rechts patrouillieren lassen
  lv_anim_t a_x;
  lv_anim_init(&a_x);
  lv_anim_set_var(&a_x, cont);                       // Animationsobjekt binden: Container
  lv_anim_set_values(&a_x, -30, 30);                 // Von der Mitte 30 nach links, dann 30 nach rechts
  lv_anim_set_time(&a_x, 2000);                      // Einzelne Bewegung dauert 2000 ms (2 Sekunden)
  lv_anim_set_playback_time(&a_x, 2000);             // Rueckweg ebenfalls 2000 ms
  lv_anim_set_repeat_count(&a_x, LV_ANIM_REPEAT_INFINITE); // Endlosschleife
  lv_anim_set_path_cb(&a_x, lv_anim_path_ease_in_out);     // „Ease-in-out"-Kurve: Bewegung wirkt elastisch, nicht abgehackt
  lv_anim_set_exec_cb(&a_x, anim_x_cb);              // Oben definierte X-Achsen-Callback-Funktion binden
  lv_anim_start(&a_x);                               // Animation starten!

  // Animation B: Das gruene Quadrat separat auf/ab springen lassen
  lv_anim_t a_y;
  lv_anim_init(&a_y);
  lv_anim_set_var(&a_y, rect);                       // Animationsobjekt binden: nur das gruene Quadrat
  lv_anim_set_values(&a_y, 0, 10);                   // Vertikaler Versatz 0 bis 10 Pixel
  lv_anim_set_time(&a_y, 300);                       // Schneller Hupfer – 300 ms pro Bewegung
  lv_anim_set_playback_time(&a_y, 300);
  lv_anim_set_repeat_count(&a_y, LV_ANIM_REPEAT_INFINITE);
  lv_anim_set_path_cb(&a_y, lv_anim_path_ease_in_out);
  lv_anim_set_exec_cb(&a_y, anim_y_cb);              // Oben definierte Y-Achsen-Callback-Funktion binden
  lv_anim_start(&a_y);                               // Animation starten!
}

// Letzte Zeitstempel speichern
uint32_t last_tick = 0;
void loop() {
  // 1. Berechnen, wie viele Millisekunden seit dem letzten loop-Durchlauf vergangen sind
  uint32_t current_tick = millis();
  uint32_t elapsed_time = current_tick - last_tick;
  last_tick = current_tick;

  // 2. LVGL die verstrichene Zeit mitteilen (absolut entscheidend fuer Animationen!)
  lv_tick_inc(elapsed_time);

  // 3. LVGL verarbeitet Animationen und zeichnet das UI neu
  lv_timer_handler();

  // 4. Kurze Pause, damit die CPU nicht dauerhaft unter Volllast laeuft
  delay(5);
}
```





## Erklaerung der wichtigsten Codezeilen

> Hier sind die Stellen, an denen Einsteiger am haeufigsten Fehler machen – pruefe deinen Code Zeile fuer Zeile:

### 1. Die Offset-Parameter bei der GFX-Initialisierung



```c
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
```

Die letzten 4 Zahlen `26, 1, 26, 1` stehen fuer `col_offset1, row_offset1, col_offset2, row_offset2`. **Wenn die Darstellung verschoben ist (Inhalt in einer Ecke oder mit schwarzen Raendern), diese 4 Werte anpassen.** Unterschiedliche Hersteller des ST7735S-Moduls haben unterschiedliche Offsets – die hier gezeigten sind die am haeufigsten vorkommenden.

### 2. Display-Groesse – Querformat beachten

```c
#define ROTATION 1  // Querformat-Drehung
static const uint32_t screenWidth  = 160;  // Nach Drehung: Breite 160
static const uint32_t screenHeight = 80;   // Hoehe 80
```

Das physische Display ist 80x160 (Hochformat). Mit `ROTATION=1` wird es um 90 Grad gedreht und ergibt 160x80. **Die Display-Groesse in LVGL muss zur gedrehten Ausrichtung passen**, sonst wird das Bild fehlerhaft dargestellt.

### 3. Flush-Callback – die Bruecke zwischen LVGL und GFX

```c
void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  ...
  lv_display_flush_ready(display);  // Diese Zeile darf nicht fehlen!
}
```

`lv_display_flush_ready()` meldet LVGL: „Dieser Bereich ist fertig gezeichnet, naechsten bitte." **Ohne diese Zeile wird das Display nie aktualisiert.**

### 4. Zeit-Zufuetterung im loop

```c
lv_tick_inc(elapsed_time);
lv_timer_handler();
```

Diese beiden Zeilen sind das „Herz" der LVGL-Animationen. `lv_tick_inc` liefert die verstrichene Zeit, `lv_timer_handler` loest das Neuzeichnen des UI aus. **Wenn auch nur eine der beiden Zeilen fehlt, bewegt sich keine Animation.**





## Haeufige Probleme und Loesungen

| Symptom                                        | Moegliche Ursache                                                     | Loesung                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Weisser Bildschirm (Hintergrund an, kein Inhalt)** | Flush-Callback nicht korrekt gebunden oder `lv_display_flush_ready()` fehlt | Pruefen, ob `my_disp_flush` korrekt als `flush_cb` gesetzt wurde               |
| **Farbfehler / zufaellige Farb-bloecke**       | SPI-Pins falsch verbunden oder schlechter Kontakt                     | Verkabelung erneut pruefen, Dupont-Kabel fest einstecken                        |
| **Bild verschoben / mit schwarzem Rand**       | ST7735S-Offset-Parameter passen nicht                                 | `col_offset` und `row_offset` im `Arduino_ST7735`-Konstruktor anpassen         |
| **Farben vertauscht (Blau statt Rot usw.)**    | RGB/BGR-Einstellung falsch                                            | Farbreihenfolge-Parameter in der GFX-Initialisierung pruefen                   |
| **Bild steht auf dem Kopf**                    | Rotationsparameter nicht korrekt                                      | `ROTATION` auf 0 oder 3 aendern                                                |
| **Compiler-Fehler: lvgl.h nicht gefunden**    | LVGL-Bibliothek nicht installiert oder falsche Version                | Sicherstellen, dass **LVGL v9.x** installiert ist (nicht v8)                   |
| **Animationen bewegen sich nicht, statisches UI** | `lv_tick_inc()` oder `lv_timer_handler()` fehlt im loop               | Sicherstellen, dass beide Zeilen vorhanden sind                                |
