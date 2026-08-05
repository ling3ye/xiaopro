---
title: "ESP32-S3 treibt das ST7262-RGB-Display + LVGL-Dashboard: Komplett-Tutorial (Waveshare Touch-LCD-5B / 1024×600)"
boardId: esp32s3
moduleId: display/tft50-st7262
category: esp32
date: 2026-08-03
intro: "Mit ESP-IDF auf dem Waveshare ESP32-S3-Touch-LCD-5B (5\" 1024×600, ST7262 RGB-Direktansteuerung) das RGB-Display von Grund auf zum Leuchten bringen, LVGL anbinden und daraus eine animierte Fahrzeug-Telemetrie-Instrumententafel bauen. Erklärt CH422G-Hintergrundlicht-Steuerung, PCLK-Tuning, PSRAM-Doppelbuffering und Ease-Animationen, mit vollständigem ESP-IDF-Code und einer Fallen-Checkliste."
image: "https://img.lingflux.com/2026/08/b7d201de3550e7561294441b57a205de.jpg"
---

Schwierigkeit: ⭐⭐⭐☆☆ (etwas C-Erfahrung, ESP-IDF schon mal in den Händen gehalten — dann kommst du zurecht)
Geschätzte Zeit: 2–3 Stunden (inklusive Umgebungseinrichtung)
Testumgebung: ESP-IDF 5.3.x (oder 5.2.7 mit einer ergänzten Zeile Define) + LVGL ^9.3 + espressif/esp_lvgl_port 2.8

---

> **In einem Satz**: Mit ESP-IDF auf dem Waveshare ESP32-S3-Touch-LCD-5B (5\" 1024×600, reine RGB-Direktansteuerung über ST7262) das RGB-Display vom Schwarzbild über das erste Licht bis hin zu LVGL bringen und am Ende eine animierte Fahrzeug-Telemetrie-Instrumententafel daraus machen. Alle Falten, in die ich getappt bin (die Auflösungs-Falle, PCLK-Weißbild, LVGL-Speicher-Weißbild, Tearing und Ruckeln), und der Code, der sie glättet, stehen hier.

---

> **TL;DR (Schnellstart):**
> 1. **Kenn dein Board**: Die 5B-Variante hat **1024×600**, Treiber-IC **ST7262**, reine RGB-Direktansteuerung — vertraue nicht dem 800×480, das die offiziellen Beispiele als Standard setzen.
> 2. **PCLK auf 16 MHz**: Übernimm nicht die 21 MHz aus der Board-Definition. Mit PSRAM-framebuffer reicht die Bandbreite nicht, und das Bild wird komplett weiß.
> 3. **Hintergrundlicht geht über CH422G**: Kein normaler GPIO, kein PWM — ein Byte an die I²C-Adresse `0x38` schreiben, an oder aus.
> 4. **Für LVGL müssen zwei Defines an**: `LV_USE_CLIB_MALLOC=y` + `SPIRAM_USE_MALLOC=y`, sonst Weißbild + Watchdog-Reboot.
> 5. `idf.py build flash monitor`, Display an, Korken knallen lassen.

---

## Vorwort

Ich war an diesem Wochenende unterwegs, als ein Freund ein **Waveshare ESP32-S3-Touch-LCD-5B** erwarb. Mit der offiziellen Firmware ließ es sich flashen und zeigte etwas an, aber mit eigenem Code bekam er das Display nicht zum Leuchten — die offiziellen Beispiele ergaben mal Schwarz, mal Weiß, völlig undurchschaubar. Also habe ich es übernommen und mich daran festgebissen. Es ist ein 5\"-RGB-Capacitive-Touch-Entwicklungsboard mit 1024×600. Nicht teuer, aber üppig bestückt — CAN, RS485, RTC, Akku-Ladechip alles drauf, dazu 16 MB Flash + 8 MB PSRAM.

Also wollte ich es zum Leuchten bringen — in letzter Zeit macht mir das Spaß. Aber der Weg dorthin war holpriger als gedacht. Die einschüchterndste Erkenntnis: **Wenn du der offiziellen Waveshare-Doku und den Beispielen folgst, geht es nicht an.** Es liegt nicht an dir, sondern daran, dass die offiziellen Ressourcen gar nicht für diese 5B gedacht sind.

Ich habe den gesamten Ablauf in drei aufeinander aufbauende kleine Beispiele zerlegt, der Code liegt auf GitHub ([komplettes Projektverzeichnis](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B), alle drei Beispiele sind dort zu finden):

1. **Display zum Leuchten bringen**: Auf die schlichteste Art — eine Hello-World-Zeile anzeigen → [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
2. **LVGL anbinden**: Einen Halbkreis-Tacho mit Zeigeranimation bauen → [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
3. **Zur Instrumententafel ausbauen**: Zu einem designstarken Fahrzeug-Telemetrie-Panel machen → [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

**Ziel dieses Artikels**: Dir die Fallen aus diesen drei Schritten, den Code, mit dem man sie stopft, und eine direkt übernehmbare Checkliste mit auf den Weg zu geben — damit du ein paar Nächte weniger durchmachst.

---

## Versuchsergebnis

Am Ende hast du ein **animiertes Fahrzeug-Telemetrie-Dashboard**: fünf Datenkarten für Drehzahl, Gaspedal, Wassertemperatur, Geschwindigkeit und Spannung — die Werte nähern sich per Ease-Animation an, die Balken werden bei Überlast rot, und die Zeigeranimation läuft seidig weich ohne Tearing.

![](https://img.lingflux.com/2026/08/032db1082c643b3c0cc44b993101ead1.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/doq81VdEQRI?si=bIy_tzkslkScLqzU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Eins: Entwicklungsboard: Lerne erst die 5B kennen

Bevor wir uns in die Fallen stürzen, hier die Hardware-Daten des ESP32-S3-Touch-LCD-5B. Die späteren Stolpersteine — welchen PCLK eintragen, ob der Speicher reicht, welche Pins sich eine I²C-Leitung teilen — drehen sich praktisch alle um diese Tabelle, es lohnt sich, sie griffbereit zu haben.

### Das Display (das solltest du als Erstes klären)

| Merkmal | Spezifikation |
| --- | --- |
| Abmessung | 5 Zoll |
| Panel-Typ | IPS |
| Auflösung | **1024 × 600** (gemessen; die offizielle Doku trennt die 5B nicht aus und trägt als Standard 800×480 ein — das ist die große Falle aus Kapitel 1) |
| Farbtiefe | 65K Farben |
| Schnittstelle | RGB (parallel), Treiber-IC **ST7262**, reine RGB-Direktansteuerung, **keine SPI-Initialisierungsbefehle nötig** |
| Blickwinkel | 175° |
| Helligkeit | 550 cd/m² |
| Touch | kapazitiv (inklusive Glaspanel) |
| Hintergrundlicht-Boost-IC | AP3032KTR-G1 |

> **ST7262** ist ein RGB-Schnittstellen-LCD-Paneltreiber-IC (von Sitronix), der die parallelen RGB-Signale empfängt und die LCD-Kristalle ansteuert. In diesem Projekt **musst du ihm keine Initialisierungsbefehle schicken** — Strom an, richtige Timings liefern, Daten füttern, und es leuchtet von selbst. Das erspart eine Menge Ärger.

### Haupt-IC (MCU)

| Merkmal | Spezifikation |
| --- | --- |
| Modul | ESP32-S3-WROOM-1-**N16R8** |
| Kerne | Xtensa 32-bit LX7, Dual-Core, bis zu 240 MHz |
| Flash | **16 MB** |
| PSRAM | **8 MB** (octal SPI) |
| Internes SRAM | 512 KB |
| Funk | Wi-Fi 2.4 GHz (802.11 b/g/n), Bluetooth 5 (LE), On-Board-Antenne |
| USB | Full-Speed USB, On-Board Type-C |

> **PSRAM** ist ein Speicher außerhalb des Chips — „groß, aber langsam". Das gesamte framebuffer liegt in diesen 8 MB und wird per DMA kontinuierlich zum Display geschoben. **Dieser 8-MB-PSRAM ist der Ort, an dem das vollständige Bild liegt.** PSRAM fälschlich als quad zu konfigurieren ist eine häufige Falle (siehe Kapitel 7).

### Touch

| Merkmal | Spezifikation |
| --- | --- |
| Touch-IC | **GT911** |
| Typ | kapazitiv |
| Touch-Punkte | 5-Punkt-Touch |
| Schnittstelle | I²C |
| I²C-Adresse | **0x5D** |

> **GT911** ist ein kapazitiver Touch-Controller, der Fingerpositionen in digitale Koordinaten übersetzt und per I²C meldet. In diesem Projekt teilt er sich einen I²C-Bus (GPIO8/GPIO9) mit RTC und CH422G, die Adressen müssen also gut geplant sein. **Diese Beispielreihe bindet den Touch noch nicht ein**, das ist noch offen.

### Stromversorgung und Schnittstellen

| Merkmal | Spezifikation |
| --- | --- |
| Stromversorgung | Type-C 5 V / DC 7–36 V / Einzelzelle-Li-Akku 3,7 V (MX1.25) |
| Leistungsaufnahme | 5 V / 450 mA (typisch) |
| CAN | CAN 2.0-kompatibel (TJA1051, 120-Ω-Terminierung standardmäßig deaktiviert) |
| RS485 | SP3485-Transceiver (120-Ω-Terminierung standardmäßig deaktiviert) |
| Arbeitstemperatur | 0 °C ~ 65 °C |
| Abmessung | Naked-Board 112,4 × 75,1 mm / mit Gehäuse 116,3 × 79 mm |

---

## Zwei: On-Board-Ressourcen-Mapping (auf dem Board bereits verlötet, keine Verkabelung nötig)

> ⚠️ **Dies ist ein Entwicklungsboard, alle Bauteile sind bereits verlötet. Die unten stehenden On-Board-Ressourcen-Maps dienen nur zum Nachschlagen der Pins bzw. zum SDK-Konfigurieren — nicht dazu, mit Dupont-Kabeln etwas zu verbinden.** Du musst nur: Strom per Type-C anschließen und das Board per USB an den PC zum Flashen der Firmware.

### RGB-Schnittstellen-Pins des Displays

> Die folgende Belegung entspricht der offiziellen Dokumentation und wurde am echten Gerät beim Treiben verifiziert. Beachte, dass GPIO0 ein Strapping-Pin ist (siehe Fallen-Liste in Kapitel 7).

| ESP32-S3 GPIO | LCD-Signal | Beschreibung |
| --- | --- | --- |
| GPIO0  | G3    | Green Daten-Bit 3 |
| GPIO1  | R3    | Red Daten-Bit 3 |
| GPIO2  | R4    | Red Daten-Bit 4 |
| GPIO3  | VSYNC | vertikale Synchronisation |
| GPIO4  | TP_IRQ | Touch-Interrupt |
| GPIO5  | DE    | Data Enable |
| GPIO7  | PCLK  | Pixeltakt (16 MHz laufen stabil) |
| GPIO10 | B7    | Blue Daten-Bit 7 |
| GPIO14 | B3    | Blue Daten-Bit 3 |
| GPIO17 | B6    | Blue Daten-Bit 6 |
| GPIO18 | B5    | Blue Daten-Bit 5 |
| GPIO21 | G7    | Green Daten-Bit 7 |
| GPIO38 | B4    | Blue Daten-Bit 4 |
| GPIO39 | G2    | Green Daten-Bit 2 |
| GPIO40 | R7    | Red Daten-Bit 7 |
| GPIO41 | R6    | Red Daten-Bit 6 |
| GPIO42 | R5    | Red Daten-Bit 5 |
| GPIO45 | G4    | Green Daten-Bit 4 |
| GPIO46 | HSYNC | horizontale Synchronisation |
| GPIO47 | G6    | Green Daten-Bit 6 |
| GPIO48 | G5    | Green Daten-Bit 5 |

### Touch / RTC / externes I²C (gemeinsamer Bus)

| ESP32-S3 GPIO | Signal | Beschreibung |
| --- | --- | --- |
| GPIO8 | SDA / TP_SDA / RTC_SDA | I²C-Daten (gemeinsam für GT911-Touch, RTC PCF85063, externes I²C) |
| GPIO9 | SCL / TP_SCL / RTC_SCL | I²C-Takt (gemeinsam, wie oben) |
| GPIO4 | TP_IRQ | Touch-Interrupt |

### USB / SD / RS485 / CAN

| Funktion | ESP32-S3 GPIO | Beschreibung |
| --- | --- | --- |
| USB D- / D+ | GPIO19 / GPIO20 | Full-Speed USB |
| SD MOSI / SCK / MISO | GPIO11 / GPIO12 / GPIO13 | SD-Karte (SPI) |
| SD CS | (CH422G EXIO4) | Low-aktiv, vom IO-Expander gesteuert, nicht auf nativem SPI-CS |
| RS485 RXD / TXD | GPIO43 / GPIO44 | SP3485 |
| CAN TX / RX | GPIO15 / GPIO16 | TJA1051 |

### Ein Chip, an dem kein Weg vorbeiführt: der CH422G IO-Expander

Der Chip, an dem Hintergrundlicht und Reset hängen, ist der **CH422G**, der per I²C angesprochen wird. Seine Eigenheit: **Er hat keinen Registerzeiger — die I²C-Adresse selbst dient als Befehl.**

> **CH422G** ist ein I²C-IO-Expander, der die verstreuten Signale für Hintergrundlicht, Display-Reset, Touch-Reset und SD-Karten-Chip-Select zentral verwaltet. In diesem Projekt nutzt du ihn, um das Hintergrundlicht einzuschalten und das Display zurückzusetzen.

| CH422G-Pin | Funktion | Beschreibung |
| --- | --- | --- |
| EXIO0 | DI0  | Digital-Eingang 0 |
| EXIO1 | TP_RST | Touch-Reset |
| EXIO2 | DISP | Hintergrundlicht-Freigabe (nur An/Aus, **nicht dimmbar**) |
| EXIO3 | LCD_RST | Display-Reset |
| EXIO4 | SD_CS | SD-Karten-Chip-Select (Low-aktiv) |
| EXIO5 | DI1  | Digital-Eingang 1 |
| OD0   | DO0  | Digital-Ausgang 0 |
| OD1   | DO1  | Digital-Ausgang 1 |

---

## Drei: Was du brauchst: ESP-IDF-Toolchain + Komponenten

Dieses Board braucht **keine Bibliothek**, aber es verwendet **ESP-IDF** (Espressifs offizielles Entwicklungs-Framework) statt Arduino. Grund: Die Kombination aus RGB-Direktansteuerung + PSRAM-framebuffer + LVGL schaltet in der sdkconfig Dutzende Optionen (PCLK, PSRAM-Modus, Speicherpool); in ESP-IDF lässt sich das deutlich komfortabler steuern, in Arduino ist das Tunen recht fummelig.

**Checkliste (am besten punktweise abhaken — das erspart 80 % der Fehlersuche):**

- [ ] **ESP-IDF 5.3.x** (empfohlen). Mit 5.2.7 läuft es ebenfalls, aber du musst ein Define ergänzen (siehe Kapitel 7).
- [ ] **LVGL ^9.3** (`esp_lvgl_port` 2.8 benötigt die in 9.3 neu hinzugekommenen Farbkonstanten).
- [ ] **espressif/esp_lvgl_port 2.8** (erledigt dir LVGL-Takt, eigenständigen Task und Locking).
- [ ] **Windows-Nutzer**: PowerShell + EIM-Profile verwenden, **`idf.py` nicht in Git Bash ausführen** (es entdeckt `MSYSTEM` und streikt).

Die Komponentenversionen müssen paarweise aus derselben Generation stammen: `esp_lvgl_port` 2.8 passt zu LVGL `^9.3` — kombinierst du falsch, wirft der Compiler `RGB565_SWAPPED undeclared`.

---

## Vier: Schritt 1 — Display zum Leuchten bringen (das offizielle Beispiel nicht direkt übernehmen)

> 📦 **Vollständiger Code dieses Kapitels**: [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld) — auf die schlichteste Art das Display zum Leuchten bringen und „Hello World!" anzeigen.

Das ist die größte Falle der ganzen Geschichte, und sie ist es, die ich als Erstes ansprechen will.

**Waveshares offizielle ESP-IDF-Beispiele (z. B. `08_lvgl_Porting`) und die Doku sind weitgehend auf 800×480 ausgelegt.** Der `#else`-Standardzweig ist eben 800×480. Die offizielle Doku fasst die gesamte 5-Zoll-Serie unter „800×480 oder 1024×600" zusammen und **weist der 5B im Speziellen keinen eigenen Wert zu**.

Wenn du das offizielle Beispiel ungefiltert auf die 5B flashst, bekommst du ein ziemlich verwirrendes Bild: **Der Großteil des Displays ist schwarz, rechts taucht ein weißer Streifen auf** (Schwarz + Weiß). Das ist kein Defekt — es ist „ein 800×480-Signal für ein 1024×600-Panel". Das Panel ist breiter als das Signal, für den rechten Überhang liegt kein Signal an, und genau so sieht es aus.

Da in Waveshares Namenskonvention **das Suffix „B" oft für quadratische Displays steht** (4B ist z. B. 480×480 quadratisch), hatte ich eine Weile lang vermutet, die 5B sei ein 720×720-Quadrat und brauche erst eine SPI-Initialisierung. Nach einigem Herumschlagen stand fest: **Die 5B ist 1024×600, Treiber-IC ST7262, reine RGB-Direktansteuerung, keine SPI-Initialisierungsbefehle irgendwelcher Art.** Sehr wichtig — das erspart eine Menge Aufwand.

Also lautet der erste Schritt immer: **Glaube nicht der Auflösung im offiziellen Beispiel, sondern stelle selbst sicher, was genau vor dir liegt.**

Die schlichte Methode der Verifikation ist die oben beschriebene: Mit 800×480 füttern, rechter Rand wird weiß — das beweist indirekt 1024×600 (nur wenn das Panel breiter als das Signal ist, passiert genau das).

### 4.1 Hochlauf-Ablauf (6-Schritt-Gerüst)

Wenn du seine Eigenheiten kennst, kann es losgehen. Der Hochlauf besteht aus genau 6 Schritten: **I²C hochziehen → CH422G setzt das Display zurück → RGB-Panel erzeugen → Bild zeichnen → Hintergrundlicht an → CPU-Leerlauf, DMA selbstauffrischend**.

Dabei ist „erst das Bild zeichnen und ganz zum Schluss das Hintergrundlicht an" entscheidend — das vermeidet das erste, zerrissene Bild nach dem Einschalten. Im Code sieht die Reihenfolge fest so aus:

```c
/* Schritt 1: Zuerst den I²C-Bus hochziehen (GPIO8/9, zusammen mit GT911-Touch und RTC). */
i2c_master_bus_handle_t i2c_bus = NULL;
i2c_master_bus_config_t bus_cfg = {
    .sda_io_num = 8, .scl_io_num = 9, .clk_source = I2C_CLK_SRC_DEFAULT,
    .flags.enable_internal_pullup = true,
};
i2c_new_master_bus(&bus_cfg, &i2c_bus);

/* Schritt 2: CH422G ansteuern — zuerst Reset ziehen, dann lösen (Hintergrundlicht bleibt dabei aus). */
ch422g_handle_t io = {0};
ch422g_init(&io, i2c_bus);
ch422g_set_outputs(&io, 0);                              /* EXIO alle auf Low: Reset + Hintergrundlicht aus */
vTaskDelay(pdMS_TO_TICKS(10));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST); /* Reset lösen, Hintergrundlicht bleibt aus */
vTaskDelay(pdMS_TO_TICKS(120));                          /* auf das Panel warten */

/* Schritt 3: RGB-Panel erzeugen, das Bild in den PSRAM-framebuffer zeichnen (siehe nächster Abschnitt) … */

/* Schritt 4: Bild steht, ganz zum Schluss das Hintergrundlicht einschalten — EXIO2 auf High schreiben. */
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

> **Eiserne Regel der Reihenfolge: Das Hintergrundlicht geht immer als Letztes an.** Beim Reset alle EXIO auf Low (Hintergrundlicht aus), nach dem Lösen des Reset das Bild zeichnen, und erst wenn das Bild steht, EXIO2 auf High schreiben. Umgekehrt erst Hintergrundlicht an und dann zeichnen, führt zu einem zerrissenen ersten Frame beim Einschalten.

### 4.2 Warum „auf High setzen und es leuchtet": der CH422G-Minimaltreiber

Dass das Hintergrundlicht durch „auf High setzen" angeht, bedeutet im Code zweierlei: einen CH422G-Treiber schreiben und ihn im Hochlauf in der richtigen Reihenfolge aufrufen. Der Kern des Treibers ist ein einziger Punkt — **Adresse ist Register**: an `0x24` den Modus schreiben, an `0x38` ein Byte (genau dieses Byte ist der Pegel der 8 Ausgänge). Der Minimaltreiber sieht so aus (Vollversion siehe `main/ch422g.c` im Repo):

```c
/* CH422G-"Register" = die 7-Bit-I²C-Geräteadresse selbst (kein separates Register-Byte). */
#define CH422G_REG_MODE  0x24   /* 0x01 schreiben -> EXIO0..7 als Push-Pull-Ausgänge */
#define CH422G_REG_OUT   0x38   /* ein Byte schreiben -> Pegel von EXIO0..7 */

/* EXIO-Ausgangs-Bits: Bit n = Pegel von EXIO_n (1 = High). */
#define CH422G_TP_RST   (1u << 1)   /* EXIO1 Touch-Reset */
#define CH422G_BL       (1u << 2)   /* EXIO2 Hintergrundlicht-Freigabe */
#define CH422G_LCD_RST  (1u << 3)   /* EXIO3 Display-Reset */

/* Für jedes der beiden "Adresse-ist-Register" ein eigenes I²C-Geräte-Handle anlegen. */
esp_err_t ch422g_init(ch422g_handle_t *ch, i2c_master_bus_handle_t bus) {
    i2c_device_config_t mode_cfg = { .device_address = CH422G_REG_MODE, .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &mode_cfg, &ch->dev_mode);
    i2c_device_config_t out_cfg  = { .device_address = CH422G_REG_OUT,  .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &out_cfg,  &ch->dev_out);

    uint8_t mode = 0x01;                              /* Push-Pull-Ausgangsmodus */
    i2c_master_transmit(ch->dev_mode, &mode, 1, -1);
    uint8_t zero = 0;
    i2c_master_transmit(ch->dev_out,  &zero, 1, -1);  /* Start: alles Null */
    return ESP_OK;
}

/* Ein Byte ist der Pegel der 8 Ausgänge — genau das ist "Adresse als Befehl". */
esp_err_t ch422g_set_outputs(ch422g_handle_t *ch, uint8_t exio_mask) {
    return i2c_master_transmit(ch->dev_out, &exio_mask, 1, -1);
}
```

### 4.3 Das RGB-Panel erzeugen (Kern dieses Kapitels)

Der Block zum Erzeugen des Panels ist der Kern des gesamten Kapitels. Die drei unten markierten Fallen erklären Zeile für Zeile, warum die Werte so eingetragen werden:

```c
#define LCD_H_RES        1024
#define LCD_V_RES        600
#define LCD_PIXEL_CLK_HZ (16 * 1000 * 1000)   /* ← Falle 1: 16 MHz, nicht die 21 MHz aus der Board-Definition */

/* In RGB565 ist Grün 6 Bit (0..63), Rot/Blau 5 Bit (0..31); für reines Weiß 31,63,31 eintragen (← Falle 2). */
#define RGB565(r, g, b)   ((((r) & 0x1F) << 11) | (((g) & 0x3F) << 5) | ((b) & 0x1F))
#define COLOR_BG          RGB565(2, 8, 20)     /* dunkelblauer Grund */
#define COLOR_FG          RGB565(31, 63, 31)   /* echtes Weiß */

esp_lcd_rgb_panel_config_t panel_cfg = {
    .data_width = 16,                          /* RGB565 = 16 Bit */
    .bounce_buffer_size_px = 10 * LCD_H_RES,   /* SRAM-Bounce: verhindert Weißbild bei unzureichender Versorgung unter 16 MHz */
    .disp_gpio_num = -1,                       /* Hintergrundlicht sitzt am CH422G, nicht an einem GPIO */
    .pclk_gpio_num  = 7, .vsync_gpio_num = 3, .hsync_gpio_num = 46, .de_gpio_num = 5,
    .data_gpio_nums = {
        14, 38, 18, 17, 10,        /* B3..B7 */
        39,  0, 45, 48, 47, 21,    /* G2..G7 */
         1,  2, 42, 41, 40,        /* R3..R7 */
    },
    .timings = {
        .pclk_hz = LCD_PIXEL_CLK_HZ,           /* ← Falle 1 */
        .h_res = LCD_H_RES, .v_res = LCD_V_RES,
        .hsync_pulse_width = 30, .hsync_back_porch = 40, .hsync_front_porch = 220,
        .vsync_pulse_width = 4,  .vsync_back_porch  = 8,  .vsync_front_porch = 4,
        .flags.pclk_active_neg = true,
    },
    .flags.fb_in_psram = true,                 /* Vollbild-framebuffer (~1,17 MB) liegt im PSRAM */
};
esp_lcd_new_rgb_panel(&panel_cfg, &panel);
esp_lcd_panel_init(panel);                     /* ← Falle 3: nach dem Erzeugen des Panels diese Zeile nachziehen */
```

Wenn das Panel steht, holst du dir den framebuffer und schreibst direkt Pixel hinein — das RGB-Panel des ESP-IDF bietet außer `draw_bitmap` keine Grafik-Primitiven, deshalb bringt das HelloWorld-Beispiel die beiden Hilfsfunktionen `lcd_fill` / `lcd_draw_text` selbst mit (Bitmap-Font, siehe `lcd_draw.c` im Repo):

```c
/* framebuffer aus dem PSRAM holen und "Hello World!" zeichnen. */
void *fb = NULL;
esp_lcd_rgb_panel_get_frame_buffer(panel, 1, &fb);
lcd_draw_init((uint16_t *)fb, LCD_H_RES, LCD_V_RES);
lcd_fill(COLOR_BG);
lcd_draw_text((LCD_H_RES - tw) / 2, (LCD_V_RES - th) / 2, "Hello World!", 5, COLOR_FG);

/* Bild steht, ganz zum Schluss das Hintergrundlicht an. Danach zieht der DMA das Bild selbst aus dem PSRAM, die CPU ist frei. */
vTaskDelay(pdMS_TO_TICKS(60));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

### 4.4 Drei Fallen, in die ich wirklich getappt bin

**Falle 1: PCLK zu hoch abgeschrieben, das ganze Bild wird weiß.** Beim Kopieren der offiziellen Arduino-Board-Definition war als Pixeltakt (PCLK) 21 MHz eingetragen; das Display wurde **komplett reinweiß** (kein Schwarzbild). Die Wahrheit: Das Bild liegt im PSRAM und muss per DMA kontinuierlich zum Display gestreamt werden. 21 MHz × 16 Bit ≈ 336 MBit/s Bandbreite — für die Strecke „PSRAM → DMA → Display" ist das **zu viel**, und sobald die Versorgung abbricht, empfängt das Display kein gültiges Sync-Signal mehr und zeigt einfach „Kein Signal"-Weiß. **Auf 16 MHz gesenkt — stabil.**

**Falle 2: Weiße Schrift wurde rosa, fast hätte ich die Pins umbelegt.** Nach dem ersten Leuchten erschien weiße Schrift rosa. Mein erster Gedanke: Grün-Pins vertauscht — falsch. Die wirkliche Ursache: **In RGB565 ist Grün 6 Bit (0–63), Rot und Blau nur 5 Bit (0–31).** In `RGB565(31, 31, 31)` liegen die 31 von Grün in der Skala 0–63 noch nicht einmal zur Hälfte; Rot/Blau voll, Grün halb — heraus kommt Rosa. Erst `RGB565(31, 63, 31)` ist echtes Weiß. Fehlfarbigkeiten gibt es in zwei Varianten: **Weiß wird Cyan = Problem der Pin-Reihenfolge**; **Weß wird Rosa = falscher Zahlenwert**.

**Falle 3: Eine Initialisierungs-Zeile vergessen.** Der kanonische Ablauf ist „Panel erzeugen → Reset → Initialisieren → Display an"; anfangs hatte ich nur den Schritt zum Erzeugen aufgerufen. In den meisten Fällen beginnt nach dem Erzeugen automatisch der Scan, aber ein nachträgliches `esp_lcd_panel_init()` räumt die Möglichkeit „DMA nicht gestartet" aus dem Weg — fehlt es, kann das Bild mal angehen und mal nicht.

### 4.5 Der wertvollste Trick: Erst mal ansehen, „wie genau es nicht angeht"

Wenn das Display „nicht angeht", ist das Nützlichste, **zuerst zu beobachten, auf welche Art es nicht angeht**:

- **Überhaupt kein Hintergrundlicht** → Sache des CH422G / der Reset-Sequenz
- **Hintergrundlicht an, aber komplett Weiß/Grau** → RGB-Signal nicht korrekt (häufigste Ursache, PCLK und Timing prüfen)
- **Hintergrundlicht an, aber flackernd/zitternd** → Signal ist da, die Timing-Parameter passen nicht ganz
- **Hintergrundlicht an, aber falsche Farben (Weiß wird Cyan)** → RGB-Kanal-Reihenfolge vertauscht

Allein diese Beobachtung halbiert das Problem und spart eine Menge Herumgerate.

---

## Fünf: Schritt 2 — LVGL anbinden und eine Zeigeranimation bauen

> 📦 **Vollständiger Code dieses Kapitels**: [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer) — LVGL anbinden und einen Halbkreis-Tacho mit Zeigeranimation bauen.

Wenn es leuchtet, wollte ich eine sich bewegende Oberfläche bauen und habe **LVGL** genommen (eine im Embedded-Bereich sehr verbreitete Grafikbibliothek). Die Anbindung erfolgt über die offiziell empfohlene Komponente `espressif/esp_lvgl_port`, die LVGL-Takt, eigenständigen Task und Locking übernimmt und das fertige Bild auf das Display spielt.

> **LVGL** ist eine quelloffene Embedded-Grafikbibliothek, die UI-Elemente wie Buttons, Fortschrittsbalken und Animationen zeichnet. In diesem Projekt nutzt du sie für Tacho und Dashboard, statt selbst Zeichenroutinen Zeile für Zeile zu schreiben.

Die Anbindung selbst ist kurz. Kern: das RGB-Panel steht (im Speedometer-Beispiel kommt gegenüber HelloWorld eine Zeile `.num_fbs = 2` hinzu — das ist der unten gegen Tearing eingesetzte doppelte framebuffer), dann übergibst du alles an `esp_lvgl_port`:

```c
const lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
lvgl_port_init(&lvgl_cfg);

const lvgl_port_display_cfg_t disp_cfg = {
    .panel_handle  = panel,
    .buffer_size   = LCD_H_RES * LCD_V_RES, /* Vollbild: harte Anforderung des Direct Mode */
    .hres          = LCD_H_RES, .vres = LCD_V_RES,
    .color_format  = LV_COLOR_FORMAT_RGB565,
    .flags = {
        .direct_mode = true,   /* direkt in den framebuffer des Panels zeichnen, ein Kopieren gespart */
        .buff_dma    = false,
        .buff_spiram = true,   /* Zeichen-Puffer ins PSRAM (← Falle 1: zuvor SPIRAM_USE_MALLOC aktivieren) */
        .swap_bytes  = false,  /* paralleles RGB-Panel, kein Byte-Swap */
    },
};
const lvgl_port_display_rgb_cfg_t rgb_cfg = {
    .flags = {
        .bb_mode       = true,  /* mit bounce buffer -> Synchronisation über on_bounce_frame_finish */
        .avoid_tearing = true,  /* fb an der Frame-Grenze umschalten -> verhindert Tearing (siehe Kapitelende) */
    },
};
lvgl_port_add_disp_rgb(&disp_cfg, &rgb_cfg);

/* Jeder lv_*-Aufruf muss vorher diese Sperre holen, sonst kollidiert er mit dem Render-Task von esp_lvgl_port. */
lvgl_port_lock(0);
dashboard_create();   /* Tacho aufbauen + Zeigeranimation starten */
lvgl_port_unlock();
```

Die drei Flags sind die Essenz dieses Blocks: `direct_mode` lässt LVGL direkt in den framebuffer des Panels zeichnen (ein Vollbild-Kopieren entfällt); `avoid_tearing` schaltet die beiden fbs an der Frame-Grenze um (verhindert Tearing); `buff_spiram` verlegt den Zeichen-Puffer ins PSRAM — das sieht harmlos aus, öffnet aber genau die folgende große Falle.

### 5.1 Falle 1 (die heimlichste): Weißbild + Watchdog-Reboot

Angeschlossen, geflasht — das Display wird zwei Sekunden schwarz, dann **komplett weiß**, danach passiert nichts mehr. Die Symptomatik ist **identisch** mit dem Weißbild durch zu hohes PCLK zuvor; ich wäre fast wieder in das Timing-Tuning gestolpert.

**Zum Glück diesmal erst mal das Boot-Log auf der seriellen Konsole angesehen**, da steht die entscheidende Zeile:

```
E task_wdt: CPU 0: taskLVGL
```

Der LVGL-Task hat den Watchdog ausgelöst und das System hat ihn als eingefroren eingestuft. **Das ist ein Software-Stillstand, kein Signal-Problem.** Dem Call-Stack gefolgt: Wenn LVGL das erste Mal ein Vollbild zeichnet, muss es kurzfristig einen MB-großen Zeichen-Puffer allokieren, doch LVGL nutzt standardmäßig **seinen kleinen internen Speicherpool von nur 64 KB** — 1 MB passt nicht in 64 KB, also wird es endlos durchgewurstelt, das Bild wird nie fertig, der Task hängt, der Watchdog schlägt an.

Interessant dabei: Ich hatte den Display-Puffer doch ins PSRAM gelegt — wie kann da Speicher knapp sein? Weil **Display-Puffer** (fürs „Bild-Schicken") und **der Speicherpool für LVGLs interne Zeichenvorgänge** (fürs „Bild-Berechnen") zwei paar Schuhe sind, die nicht verwechselt werden dürfen. Die Lösung besteht aus zwei Schaltern:

```
CONFIG_LV_USE_CLIB_MALLOC=y    # LVGL auf das malloc des Systems umstellen, nicht den 64-KB-Pool
CONFIG_SPIRAM_USE_MALLOC=y     # dem System-malloc erlauben, große Blöcke aus dem PSRAM zu holen
```

> **Hier schärft sich eine wichtige Erkenntnis: Selbst bei identischem „Weißbild" gibt es mindestens zwei grundlegend verschiedene Ursachen.** Die eine liegt im RGB-Signal/Bandbreite (vorhin das PCLK-Thema), die andere im Software-Stillstand, weil das Bild nie gezeichnet wird (diese hier). **Unterscheide immer erst anhand des seriellen Logs**, fange nicht bei Weißbild sofort an, am Timing zu drehen.

### 5.2 Fallen 2 und 3: Komponentenversion und IDF-Makro passen nicht zusammen

- **Falle 2 (Komponentenversionen paarweise)**: `esp_lvgl_port` 2.8 nutzt intern Farbkonstanten, die erst mit LVGL 9.3 neu dazukamen. LVGL auf `~9.2` festgelegt, wirft `RGB565_SWAPPED undeclared`; auf `^9.3` ändern, und es passt.
- **Falle 3 (IDF-Makro passt nicht)**: Neuere `esp_lvgl_port` prüfen das Makro `SOC_LCDCAM_RGB_LCD_SUPPORTED`, doch das **wird erst mit IDF 5.3 umbenannt**; in 5.2.7 heißt es noch anders, zur Laufzeit kommt „This target does not support RGB". Abhilfe: Vor `project()` in der obersten CMakeLists eine Zeile `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)` ergänzen.

### 5.3 „Ruckeln" und „Tearing" haben nichts mit Rechengeschwindigkeit zu tun

Wenn der Tacho läuft, tauchen zwei neue Probleme auf: Der Zeiger bewegt sich **nicht flüssig genug**, und es gibt **Tearing** (eine horizontal versetzte Bruchkante im Bild). Beide Phänomene **hängen nicht damit zusammen, wie schnell gerechnet wird**.

**Zuerst das Ruckeln.** Die physische Bildwiederholrate dieses Displays habe ich vorher ausgerechnet: PCLK 16 MHz ÷ Gesamt-Pixelzahl eines Frames ≈ **20 Hz**. Das Display kann also maximal 20-mal pro Sekunde ein neues Bild zeigen, egal wie schnell die Software ist — das ist eine harte Decke. „Wie flüssig" ist also keine Framerate-Frage, sondern eine **Animationskurven-Frage**. Ein Zeiger, der gleichmäßig bis zum Anschlag fährt und sofort zurücksetzt, wirkt sehr hart; mit `ease-in-out` (an beiden Enden abbremsen, in der Mitte beschleunigen) wirkt der Richtungswechsel natürlich.

```c
/* 270°-Tacho: Modus ROUND_INNER, beginnt bei 135°, lässt unten eine 90°-Lücke. */
lv_obj_t *scale = lv_scale_create(scr);
lv_obj_set_size(scale, 460, 460);
lv_scale_set_mode(scale, LV_SCALE_MODE_ROUND_INNER);
lv_scale_set_range(scale, 0, 120);
lv_scale_set_angle_range(scale, 270);
lv_scale_set_rotation(scale, 135);          /* Startwinkel, bestimmt die Ausrichtung der Lücke */
lv_scale_set_total_tick_count(scale, 25);   /* alle 5 km/h eine Marke */
lv_scale_set_major_tick_every(scale, 4);    /* alle 4 Marken ein Haupttick -> 0,20,...,120 */

/* Wird jeden Animations-Frame aufgerufen: Zeiger auf v setzen. Der Zahlenwert wird nur bei Änderung der Ganzzahl aktualisiert. */
static void gauge_set_value(void *var, int32_t v) {
    gauge_ctx_t *g = (gauge_ctx_t *)var;
    lv_scale_set_line_needle_value(g->scale, g->needle, 150, v);  /* Zeiger, 150 px lang */
    int vi = (int)v;
    if (vi != g->last_int) {                 /* Ganzzahl unverändert -> Label nicht anfassen, Neuzeichnen sparen */
        g->last_int = vi;
        lv_snprintf(s_value_buf, sizeof(s_value_buf), "%03d", vi);
        lv_label_set_text(g->value_label, s_value_buf);
    }
}

/* 0 -> 120 -> 0, endlos wiederholt. Wie flüssig, entscheidet die letzte Zeile. */
lv_anim_t a;
lv_anim_init(&a);
lv_anim_set_var(&a, &s_ctx);
lv_anim_set_exec_cb(&a, gauge_set_value);
lv_anim_set_values(&a, 0, 120);
lv_anim_set_duration(&a, 2500);                       /* einfache Strecke 2,5 s */
lv_anim_set_playback_duration(&a, 2500);              /* Rückweg: 0->120->0 */
lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out);    /* ← an beiden Enden abbremsen, sonst wirkt der Richtungswechsel hart */
lv_anim_set_repeat_count(&a, LV_ANIM_REPEAT_INFINITE);
lv_anim_start(&a);
```

Entscheidend ist die Zeile `lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out)`. `playback_duration` sorgt dafür, dass die Animation bei 120 automatisch auf 0 zurückkehrt; am Umkehrpunkt würde die Geschwindigkeit sonst schlagartig ihre Richtung wechseln. `ease-in-out` lässt sie erst auf 0 abbremsen und dann wieder beschleunigen — mit bloßem Auge ist der Richtungswechsel kaum noch zu erkennen.

**Nun zum Tearing.** Ursache: Es wurde nur ein Bild-Puffer vorbereitet; der DMA spielt ununterbrochen aus, während LVGL gleichzeitig das nächste Bild schreibt — ohne Synchronisation entsteht ein „halbern halbneu"-Frame. Abhilfe: **Doppelbuffering + Vertikal-Synchronisation beim Umschalten**. Zwei Bild-Puffer, der DMA greift immer nur auf den vollständigen. **Achtung: Auf diesem Display muss ein kleiner Puffer namens bounce buffer erhalten bleiben** (sonst Weißbild, weil 16 MHz nicht ausreichen) — es ist also „Doppelbuffering + bounce gemeinsam", der bounce darf nicht, wie im offiziellen Beispiel, ausgeschaltet werden.

> Auf diesem Display gilt: **„Flüssig" kommt von der Ease-Kurve, „ohne Tearing" vom Doppelbuffer** — beides hat nichts mit Rechengeschwindigkeit zu tun.

---

## Sechs: Schritt 3 — Zu einem Fahrzeug-Telemetrie-Dashboard ausbauen

> 📦 **Vollständiger Code dieses Kapitels**: [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry) — zu einem designstarken Fünf-Karten-Fahrzeug-Telemetrie-Panel ausbauen.

Zum Schluss habe ich den Tacho durch ein ansehnliches **Fahrzeug-Telemetrie-Panel** ersetzt: fünf Werte — Drehzahl, Gaspedal, Wassertemperatur, Geschwindigkeit, Spannung; jede Karte hat eine große Zahl, einen Fortschrittsbalken und eine min/max-Skala; bei Überlast wird der Wert rot. Die Daten sind zufällig simuliert, aber die Bewegung soll natürlich wirken.

### 6.1 Wie eine Karte aufgebaut wird

Jede Karte ist ein `lv_obj`-Container **ohne den Default-Stil**, in den Label, Einheit, große Zahl, Fortschrittsbalken und min/max-Skalen hineinkommen. Alle Koordinaten werden direkt fest ausgeschrieben, Schichtung entsteht durch 1-px-Rahmen + Volltonfarben (kein Schatten). Der Kern sieht so aus (Vollversion in `make_card` in `lvgl_dashboard.c`):

```c
static void make_card(lv_obj_t *parent, int i) {
    const metric_cfg_t *c = &CFG[i];      /* Geometrie/Bereich/Gefahrenschwelle/Farbe stehen in der Konfig-Tabelle */
    metric_t *m = &s_m[i];
    m->accent = lv_color_hex(c->accent_hex);

    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_remove_style_all(card);                       /* Default-Stil entfernen, alles selbst setzen */
    lv_obj_set_pos(card, c->x, c->y);                    /* Koordinaten fest, kein flex-Auto-Layout */
    lv_obj_set_size(card, c->w, c->h);
    lv_obj_set_style_bg_color(card, COL_CARD, 0);
    lv_obj_set_style_radius(card, 18, 0);
    lv_obj_set_style_border_color(card, COL_BORDER, 0);  /* 1-px-Rahmen für Schichtung, kein Schatten */
    lv_obj_set_style_border_width(card, 1, 0);

    lv_obj_t *lab = lv_label_create(card);
    lv_label_set_text(lab, c->label);
    lv_obj_align(lab, LV_ALIGN_TOP_LEFT, 0, 0);          /* Label oben links; Einheit oben rechts analog */

    lv_obj_t *val = lv_label_create(card);
    lv_obj_set_style_text_font(val, &lv_font_montserrat_48, 0);  /* große Zahl */
    lv_obj_align(val, LV_ALIGN_TOP_LEFT, 0, c->value_y);
    m->value = val;

    /* Fortschrittsbalken: trough und indicator getrennt einfärben, bei Gefahr indicator auf Rot setzen. */
    lv_obj_t *bar = lv_bar_create(card);
    lv_obj_remove_style_all(bar);
    lv_bar_set_range(bar, c->min, c->max);
    lv_obj_set_size(bar, c->w - 2 * c->pad, c->big ? 14 : 10);
    lv_obj_align(bar, LV_ALIGN_BOTTOM_LEFT, 0, -24);
    lv_obj_set_style_bg_color(bar, COL_BAR_BG, 0);                /* trough */
    lv_obj_set_style_bg_color(bar, m->accent, LV_PART_INDICATOR); /* indicator */
    m->bar = bar;
}
```

### 6.2 Zahlen „lebendig" machen: Ease-Annäherung statt gleichförmig

Der intuitivste Ansatz ist „einen neuen Zufallswert werfen und die Anzeige gleichmäßig dorthin laufen lassen". Bei gleichförmiger Verfolgung fällt die Geschwindigkeit im Zielpunkt schlagartig auf null — das wirkt sehr mechanisch. Ich nutze **Ease-Annäherung**: Für jeden Wert merke ich mir den aktuell angezeigten Wert `current` und das Ziel `target`; bei jedem Refresh nähere ich mich um ein Sechstel der Differenz an (exponentielles Abklingen, je näher, desto langsamer). Etwa alle 1,2 Sekunden wird aus der Nähe des aktuellen Werts per Random Walk ein neues Ziel ermittelt, nicht wild über den ganzen Wertebereich gesprungen — das wirkt wie echte Fahrzeugdaten:

```c
/* Alle 30 Ticks (~1,2 s) neues Ziel: vom aktuellen Wert aus wandern, Spanne = 1/3 des Wertebereichs. */
if (tick % 30 == 0) {
    int span = (m->max - m->min) / 3;
    m->target = clampi(m->current + rnd_range(-span, span), m->min, m->max);
}
/* Ease-Annäherung: um ein Sechstel der Differenz nähern; zu kleine Differenz -> direkt aufziehen, sonst bleibt immer ein Rest. */
int diff = m->target - m->current;
if (diff > -6 && diff < 6) m->current = m->target;
else                       m->current += diff / 6;   /* ← genau das ist das exponentielle Abklingen */

/* Fortschrittsbalken jeden Frame aktualisieren (er ist das "lebendige" visuelle Element). Bei Gefahr indicator auf Rot. */
bool danger = in_danger(m);   /* RPM>=6800 / Wassertemp.>=105 / Spannung<=10.8 oder >=14.6 */
lv_bar_set_value(m->bar, m->current, LV_ANIM_OFF);
lv_obj_set_style_bg_color(m->bar, danger ? COL_DANGER : m->accent, LV_PART_INDICATOR);
```

Genauso wie beim `ease-in-out` des Zeigers geht es auch hier darum, am Umkehrpunkt abzubremsen. Die `danger`-Prüfung färbt den Fortschrittsbalken bei Überlast rot — das ist der Ursprung des „bei Überlast rot"-Effekts auf dem Panel.

### 6.3 Eine kleine Optimierung am Rande: Nichts neu zeichnen, was sich nicht geändert hat

Aktualisierung alle 40 Millisekunden, aber oft sind zwei aufeinander folgende Werte dieselbe Ganzzahl (besonders wenn der Wert fast am Ziel stoppt). Jeder Aufruf von `lv_label_set_text` kopiert die Zeichenkette und markiert zum Neuzeichnen — reine Verschwendung. Also ein Satz: **Nur aktualisieren, wenn der angezeigte Text sich wirklich geändert hat**:

```c
/* Zahlen-Anzeige: erst set_text, wenn die formatierte Zeichenkette sich wirklich geändert hat. */
char buf[12];
fmt_scaled(m->current, m->scale, buf, sizeof(buf));
if (strcmp(buf, m->last_text) != 0) {
    strcpy(m->last_text, buf);             /* merken, beim nächsten Mal damit vergleichen */
    lv_label_set_text(m->value, buf);      /* strdup + Neuzeichnen-Markierung, nur bei echter Änderung */
}
lv_obj_set_style_text_color(m->value, danger ? COL_DANGER : COL_VALUE, 0);
```

### 6.4 Ein paar Kompromisse einer Embedded-UI

Auf einem Display mit fester Auflösung ist es entspannter und vorhersehbarer, **Koordinaten direkt festzuschreiben**, statt sich auf ein flex-Auto-Layout zu verlassen; **kein Schatten** auf den Karten (LVGL-Schatten ist bei 20 Hz etwas teuer) — Rahmen und Volltonfarben schichten das Bild ausreichend; die Nachkommastelle der Spannung wird über „142 speichern für 14,2" als Integer-Skalierung gelöst, was einen Batzen Fließkomma-Rechnerei einspart. Diese Integer-Skalierung funktioniert so: Geometrie, Bereich, Gefahrenschwelle, Farbe und Scale jedes Werts kommen in eine einzige Konfig-Tabelle:

```c
/* Konfig-Tabelle, jede Zeile ein Wert. Koordinaten/Bereich/Gefahrenschwelle/Farbe/Scale stehen zentral zum gemeinsamen Tunen. */
static const metric_cfg_t CFG[] = {
    /* label      unit    x   y    w   h  pad v_y  min  max  dHi  dLo init accent   sc big */
    { "ENGINE",  "RPM",  24, 84, 478,242, 28, 78,    0,8000,6800,  0, 850,0xFF5A3C, 1, 1 },
    { "BATTERY", "V",   688,346, 312,230, 24, 64,  100, 150, 146,108, 124,0xB08CFF,10, 0 },
    /*                                                                  ↑ scale=10: 124 steht für 12,4 V */
    /* ...die weiteren drei Zeilen analog */
};

/* Bei der Anzeige wieder zurückdividieren: 124 -> "12.4". Durchgehend Integer, keine Fließkomma-Rechnung. */
static void fmt_scaled(int32_t v, int32_t scale, char *buf, size_t n) {
    if (scale == 10) lv_snprintf(buf, n, "%d.%d", (int)(v / 10), (int)(v % 10));
    else             lv_snprintf(buf, n, "%d", (int)v);
}
```

Bei `scale=10` wird der Wert × 10 gespeichert, bei `scale=1` direkt; Ease-Animation, Gefahren-Prüfung und Fortschrittsbalken laufen alle auf diesen Integern — erst ganz am Ende, beim Formatieren in eine Zeichenkette, wird kurz „zurückübersetzt" in die Nachkomma-Darstellung.

---

## Sieben: Fehlersuche & Troubleshooting (keine Panik, die Probleme lassen sich einkreisen)

> Keine Panik — 90 % der Probleme stammen aus den folgenden Ecken. Bei etwas Seltsamem **erst das serielle Log ansehen, erst die physikalischen Parameter ausrechnen**, nicht sofort den Code ändern.

**Zu diesem Display**

- Die offiziellen Beispiele/Dokus setzen standardmäßig 800×480, **direkt auf die 5B übernommen ergibt das schwarzer Grund + rechter weißer Streifen**. Die 5B ist **1024×600, ST7262, reine RGB-Direktansteuerung**, keine SPI-Initialisierung.
- Das Hintergrundlicht geht über **CH422G** EXIO2 — kein normaler GPIO und kein PWM (**nur An/Aus, nicht dimmbar**).
- Der Touch-IC GT911 (I²C-Adresse 0x5D) teilt sich eine I²C-Leitung mit RTC und CH422G — auf die Adressplanung achten; diese Beispielreihe **bindet den Touch noch nicht ein**, das ist noch offen.

**Build-Umgebung (Windows)**

- **`idf.py` nicht in Git Bash ausführen**, es entdeckt `MSYSTEM` und streikt. PowerShell + EIM-Profile verwenden; vor dem Aufruf `unset MSYSTEM` (oder `$env:MSYSTEM=$null`).
- „port is busy" beim Flashen liegt meist daran, dass der vorherige monitor nicht sauber beendet wurde — erst sicherstellen, dass nichts mehr hängt, dann flashen.
- `sdkconfig.defaults` wird ignoriert? IDF trägt Defaults nicht automatisch in eine bereits existierende `sdkconfig` ein — **die sdkconfig löschen, dann wird sie aus den Defaults neu erzeugt**.

**Display zum Leuchten bringen**

- **PCLK nicht aus der Board-Definition abschreiben (21 MHz); mit PSRAM-framebuffer bei 16 MHz starten**, und wenn es immer noch weiß ist, 12 MHz probieren.
- PSRAM nicht falsch konfigurieren: N16R8 ist **octal** (`SPIRAM_MODE_OCT`), nicht quad.
- Nach dem Erzeugen des Panels **die Zeile `esp_lcd_panel_init()` nicht vergessen**.
- GPIO0 ist ein Strapping-Pin (in der Boot-Momentaufnahme muss er High sein); nach dem Boot als RGB-Datenpin kein Problem — nur keine Schaltung daran hängen, die den Boot auf Low ziehen würde.
- Bei Fehlfarben zuerst die zwei Varianten unterscheiden: **Weiß wird Cyan = Pin-Reihenfolge**; **Weiß wird Rosa = RGB565-Wert für den Grün-Kanal** (Grün ist 6 Bit 0–63, für reines Weiß `31,63,31` eintragen).

**LVGL zum Laufen bringen**

- **Fast immer `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC` aktivieren**, sonst passt der 64-KB-interne LVGL-Pool nicht für ein Vollbild — die Symptomatik ist Weißbild + Watchdog-Reboot.
- Komponentenversionen aus derselben Generation: `esp_lvgl_port` 2.8 zu LVGL `^9.3`.
- IDF 5.2 mit neueren Komponenten: in der obersten CMakeLists `SOC_LCDCAM_RGB_LCD_SUPPORTED=1` ergänzen.
- **LVGL / esp_lvgl_port ändern versionsübergreifend API-Namen** — nicht aus dem Gedächtnis schreiben, sondern die tatsächlich installierten Header lesen.

**Flüssigkeit und Tearing**

- Zuerst die physische Bildwiederholrate des Panels ausrechnen (hier ca. 20 Hz); alles darunter ist meist ein Animationsdesign-Problem.
- Bei Ruckeln ist `ease-in-out` die erste Wahl — nicht sofort die Framerate hochtreiben.
- Tearing = Einzelbuffer + keine Synchronisation; Abhilfe ist doppelter framebuffer + `avoid_tearing`, **und den bounce buffer beibehalten**.

---

## Acht: FAQ

**F: Welche Auflösung hat das Waveshare ESP32-S3-Touch-LCD-5B nun wirklich? 800×480 oder 1024×600?**
A: Die 5B ist **1024×600**. Die offizielle Waveshare-Doku fasst die gesamte 5-Zoll-Serie unter „800×480 oder 1024×600" zusammen, ohne die 5B auszuweisen. Verifikation: Ein 800×480-Signal flashen, das Display zeigt schwarzen Grund + rechten weißen Streifen — das Panel ist also breiter als das Signal, sprich 1024×600. Das 800×480 des offiziellen Beispiels nicht direkt übernehmen.

**F: Das Display wird komplett weiß — was ist los?**
A: Zuerst im seriellen Log zwischen zwei Weiß-Varianten unterscheiden. ① Keine Watchdog-Meldung → meist kein RGB-Signal, PCLK mit 21 MHz zu hoch, auf 16 MHz senken. ② Im Log steht `task_wdt: taskLVGL` → LVGL-Speicherpool zu klein, Tasks hängen; `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC` aktivieren.

**F: Kann man die Helligkeit des Hintergrundlichts regeln? Warum finde ich keinen PWM-Pin?**
A: Nein. Das Hintergrundlicht hängt an EXIO2 des CH422G-IO-Expanders und kennt nur An/Aus — kein PWM. Für Dimmen müsste die Hardware modifiziert werden (einstellbarer Step-Up/Step-Down), softwareseitig nicht möglich.

**F: Welche Bildwiederholrate hat dieses Display? Warum ruckelt der Zeiger?**
A: Etwa **20 Hz** (PCLK 16 MHz ÷ Gesamt-Pixelzahl eines Frames). Das ist die physikalische Decke — egal wie schnell die Software ist. Das Ruckeln ist meist keine Framerate-Frage, sondern eine zu harte Animationskurve: die Zeigeranimation von linear auf `ease-in-out` umstellen, dann bremst sie am Umkehrpunkt natürlich ab und läuft sofort seidig weich.

**F: Geht es auch in der Arduino IDE? Warum ESP-IDF?**
A: Theoretisch ja (Arduino-ESP32 nutzt unten drunter ebenfalls ESP-IDF), aber die Kombination aus RGB-Direktansteuerung + PSRAM-framebuffer + LVGL macht das Tunen der sdkconfig in Arduino recht fummelig — Optionen wie PCLK, PSRAM-Modus und Speicherpool sind in ESP-IDF deutlich besser kontrollierbar. Dieses Tutorial basiert auf ESP-IDF.

**F: Nach dem Flashen von LVGL Weißbild + Watchdog-Reboot — was tun?**
A: Zu 80 % passt der 64-KB-interne LVGL-Pool nicht für ein Vollbild. In der sdkconfig zwei Optionen aktivieren: `CONFIG_LV_USE_CLIB_MALLOC=y` (LVGL auf das System-malloc umstellen) und `CONFIG_SPIRAM_USE_MALLOC=y` (malloc darf große Blöcke aus dem PSRAM nehmen). Bei ESP32-S3 + PSRAM + großem Display praktisch immer erforderlich.

**F: PSRAM als quad oder octal konfigurieren? Was passiert bei falscher Einstellung?**
A: N16R8 ist **octal** (`SPIRAM_MODE_OCT`). Als quad konfiguriert reicht die Bandbreite nicht — die Symptomatik ist dann schon bei moderatem PCLK Flackern/Weißbild oder ein instabiler Lauf.

**F: IDF 5.2.7 meldet „This target does not support RGB" — was tun?**
A: Neuere esp_lvgl_port prüfen das Makro `SOC_LCDCAM_RGB_LCD_SUPPORTED`, das erst mit IDF 5.3 umbenannt wurde; in 5.2.7 heißt es noch anders. Vor `project()` in der obersten CMakeLists eine Zeile `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)` ergänzen.

---

## Neun: Erweiterte Spielarten

Zum Leuchten bringen ist nur der Anfang — auf diesem Board geht noch viel mehr:

- **Touch anbinden**: Der GT911 ist bereits am I²C (GPIO8/9); mit einem Treiber lassen sich Button-Interaktionen umsetzen.
- **Ressourcen von der SD-Karte lesen**: Das On-Board-SD-Kartenfach (SPI) kann Bilder und Fonts laden — Schluss damit, alles in den Flash zu quetschen.
- **CAN-Bus anbinden**: Auf dem Board sitzt ein TJA1051; zusammen mit dem TWAI-Treiber aus ESP-IDF lässt sich ein echtes OBD-Fahrzeug-Zustandsgerät bauen, und die Werte im Dashboard sind nicht mehr nur simuliert.
- **RS485 hochziehen**: Der SP3485-Transceiver bindet industrielle Sensoren/Modbus-Geräte an.
- **RTC für zeitgesteuertes Logging**: Der PCF85063 hängt ebenfalls am I²C; damit lässt sich ein Datenlogger mit echten Zeitstempeln bauen.

---

## Zehn: Referenzmaterialien

**Offizielle Datenblätter und Produktseiten**

- [ESP32-S3 Datasheet (Espressif, offiziell)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP32-S3-WROOM-1 Modul-Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)
- [ESP32-S3-Produktseite](https://www.espressif.com/en/products/socs/esp32-s3)
- [Waveshare ESP32-S3-Touch-LCD-5B Wiki](https://docs.waveshare.net/ESP32-S3-Touch-LCD-5/?variant=ESP32-S3-LCD-5B-touch)

**Open-Source-Bibliotheken und Frameworks**

- [ESP-IDF offizielle Dokumentation](https://docs.espressif.com/projects/esp-idf/) (RGB LCD Panel, PSRAM-Konfiguration, I²C-Master-Treiber)
- [espressif/esp_lvgl_port (GitHub)](https://github.com/espressif/esp_lvgl_port)
- [LVGL offizielle Dokumentation](https://docs.lvgl.io/) (scale-Widget, anim-Animation, bar-Fortschrittsbalken)

**Code dieses Projekts**

- Der vollständige Code, die Reproduktion jeder Falle und die Endkonfiguration liegen auf GitHub, in jedem Beispiel-Verzeichnis gibt es eine vollständige Doku:
  - [komplettes Projektverzeichnis (mit allen drei Beispielen)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)
  - [01 HelloWorld — Display zum Leuchten bringen](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
  - [02 Speedometer — Tacho](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
  - [03 VehicleTelemetry — Fahrzeug-Telemetrie-Dashboard](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

---

## Zum Schluss

Im Rückblick besteht der Weg aus drei Schichten: **Display zum Leuchten bringen → LVGL anbinden → zur Oberfläche ausbauen**. Jede Schicht hat ihre eigenen Fallen, doch die Fallen ähneln einander (zwei Weiß-Varianten, zwei Fehlfarb-Varianten), und am leichtesten arbeitet man umsonst, wenn man die Falle falsch identifiziert.

Wenn ich dir nur einen Satz mitgeben dürfte, dann dieser — den ich mir in diesen drei Beispielen nach etlichen Umweg-Schlägen erst wirklich angeeignet habe:

> **Bei etwas Seltsamem zuerst das serielle Log ansehen, zuerst die physikalischen Parameter ausrechnen, nicht sofort den Code ändern.** Die Auflösungs-Falle der offiziellen Beispiele, das Weißbild des PCLK und das Weißbild des LVGL-Speichers sehen alle aus wie „Display kaputt", aber die Ursachen sind: einmal falsche Doku, einmal Hardware-Bandbreite, einmal Software-Stillstand. Wer die Richtung verwechselt, umsonst gearbeitet — und das durchgemacht manche Nacht.
