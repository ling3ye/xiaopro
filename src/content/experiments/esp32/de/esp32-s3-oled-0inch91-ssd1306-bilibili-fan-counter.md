---
title: "ESP32-S3 + 0,91\" OLED: Desktop-Bilibili-Follower-Zähler zum Stressabbau | mit federnder Dämpfung und physikalischer Schwingung"
boardId: esp32s3
moduleId: display/oled091-ssd1306
category: esp32
date: 2026-06-27
intro: "Baue mit dem ESP32-S3 und einem 0,91\" SSD1306 OLED (128×32) einen Desktop-Bilibili-Follower-Zähler, dessen Zahlenwechsel mit einer seidig weichen Feder-Dämpfungs-Animation einhergeht. I2C-Vierdraht-Verkabelung + vollständiger Arduino-C++-Code inklusive Tipps zu häufigen Stolperfallen."
image: "https://img.lingflux.com/2026/06/e53fb5a7bdaee8448584fb9f21aa504d.jpg"
---

> **Kurz gesagt:** ESP32-S3 + 0,91" OLED + Bilibili API – ein Desktop-Follower-Zähler mit „federnder Dämpfung", damit du nicht ständig das Handy zücken musst, um die Zahlen zu checken.

# ESP32-S3 + 0,91" OLED: Desktop-Bilibili-Follower-Zähler zum Stressabbau (mit federnder Dämpfung und physikalischer Schwingung!)

Schwierigkeit: ⭐⭐☆☆☆ (auch für Anfänger geeignet)
Geschätzte Dauer: 30 Minuten
Getestet mit: Arduino IDE 2.3.8 + ESP32-Boardpaket v3.3.10 + U8g2 v2.36.19 + ArduinoJson v7.4.3

> **TL;DR (schneller Einstieg):**
>
> 1. Verkabelung: ESP32-S3 GPIO 14 → OLED SDA, GPIO 13 → OLED SCL, dazu 3,3V und GND.
> 2. Kontrolle: Stelle sicher, dass das Display korrekt mit Strom versorgt wird und die I2C-Pins nicht vertauscht sind.
> 3. Bibliotheken installieren: Suche und installiere in der Arduino IDE `U8g2` (Autor: oliver) und `ArduinoJson` (Autor: Benoit Blanchon).
> 4. Konfiguration anpassen: Trage im vollständigen Code deine Wi-Fi-Zugangsdaten und deine Bilibili-UID ein, flash den Code direkt und warte ab, bis die Follower-Zahl mit einer seidig weichen mechanischen Feder-Animation über das Display tanzt!

---

## Einleitung

Mit diesem kleinen OLED-Display habe ich einen magischen, befriedigenden Desktop-Bilibili-Follower-Zähler gebaut! Nie wieder das Handy zücken müssen, um die Daten zu checken.

---

## Endergebnis

Am Ende habe ich ein elegantes, dreiteiliges Layout umgesetzt: links ein vertikales, Hardcore-„FANS"-Logo mit mechanischem Richtungs-Pfeil; in der Mitte die Seele dieses Experiments – ein 24 Pixel hoher, rein numerischer Fettschrift-Zähler mit lokalem Clipping-Fenster als **physikalisch gedämpftes großes Rollrad**; rechts der heutige Follower-Zuwachs (mit automatischer Tagesbilanz und Auf-/Abwärts-Dreieckspfeilen) sowie die Wi-Fi-Signalstärke und ein Heartbeat-Indikator.

![](https://img.lingflux.com/2026/06/13648c6923d1cb24486cb082105d8d59.jpg)

---

## Komponentenbeschreibung

### 0,91" OLED-Display (SSD1306)

Neben dem Core-Board (ESP32-S3) ist die wichtigste Komponente in diesem Projekt das **0,91" OLED-Display**.

Das 0,91" OLED-Display ist ein „selbstleuchtendes Simultan-Dolmetscher-Modul", das die von ESP32-S3 aus dem Netz gezogenen Follower-Zahlen in Echtzeit in ein für deine Augen sichtbares Pixelraster übersetzt. Da jeder Pixel selbst leuchtet, kommt es ohne die schwere Hintergrundbeleuchtung herkömmlicher LCDs aus – der Kontrast ist extrem hoch, das Schwarz wirkt tief, das Hell blendend. In diesem Projekt habe ich es gewählt, weil es sehr kompakt ist, preiswert bleibt und sich über I2C mit nur 4 Leitungen ansteuern lässt – ideal für feine kleine Desktop-Schmuckstücke.

| Kennwert | Wert |
| --- | --- |
| Treiber-IC | SSD1306 |
| Auflösung | 128 x 32 Pixel |
| Schnittstelle | I2C (IIC) |
| Betriebsspannung | 3,3V ~ 5V |
| Anzeigefarbe | meist reinweiß oder reinblau |

---

## Stückliste (BOM)

| Bauteil | Spezifikation/Modell | Menge | Verwendung |
| --- | --- | --- | --- |
| ESP32-S3-Entwicklerboard | beliebiges Standard-Modell mit zwei Type-C-Anschlüssen | 1 | Maincontroller: holt Daten aus dem Netz und berechnet die physikalische Animation |
| 0,91" OLED-Modul | SSD1306-Treiber / 4-Pin-I2C-Anschluss | 1 | Bildschirmdarstellung und physikalische Fenster-Animation |
| Dupont-Kabel | Buchse-Buchse / Stift-Buchse (je nach Board) | 4 | verbindet das Board mit den Display-Pins |

---

## Pins und Verkabelung

> 💡 **Praktischer Tipp:** Geh nach dem Verkabelen die untenstehende Tabelle Punkt für Punkt durch. Etwa 80 % der Probleme (kein Ton, schwarzer Bildschirm, überhitztes Gerät) entstehen durch falsche Kabel. 10 Sekunden Gegenchecken sparen dir eine Menge Fehlersuche!

| OLED-Display-Pin | ESP32-S3-Pin | Pin-Funktion |
| --- | --- | --- |
| GND | GND | Masse (die gemeinsame Bezugssprache) |
| VCC | 3,3V (oder 3V3) | Spannungsversorgung |
| SCL | GPIO 13 | I2C-Taktleitung |
| SDA | GPIO 14 | I2C-Datenleitung |

---

## Benötigte Bibliotheken

Klicke in der Arduino IDE 2.x auf das „Bibliotheksverwalter"-Symbol auf der linken Seite (oder drücke `Ctrl+Shift+I`) und suche/installiere die folgenden Open-Source-Bibliotheken in der angegebenen, getesteten Version:

1. **U8g2** (Autor: oliver) – getestete Version: `v2.36.19` und höher. Steuert das OLED-Display und unterstützt präzise Clipping-Fenster (Clip Window).
2. **ArduinoJson** (Autor: Benoit Blanchon) – getestete Version: `v7.4.3`. Parst die von der Bilibili-API zurückgegebenen JSON-Daten.

---

## Vollständiger Code + Erklärung

Kopiere den folgenden vollständigen Code in die Arduino IDE. Vor dem Flashen **musst du unbedingt `const char* ssid` und `password` im Code an deine eigenen Wi-Fi-Zugangsdaten anpassen und `uid` durch die Bilibili-UID ersetzen, die du überwachen möchtest**.

```cpp
/**
 * =========================================================================
 * ESP32-S3 0.91" OLED (128x32 SSD1306) Bilibili Follower-Anzeige – Ultimate Edition
 * =========================================================================
 * Features: edles dreiteiliges Layout + echte federgedämpfte physikalische Schwingungs-Engine
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Preferences.h>
#include <time.h>

// ================== Debug-Schalter ==================
#define DEBUG_SIMULATE   0     // [WICHTIG] 1=Simulationsdaten aktivieren (Animation ohne Netz testen), 0=echte API nutzen
#define SIM_INTERVAL_MS  2000  // Intervall für Simulationsdaten (ms)
#define SIM_START_VALUE  9985  // Simulations-Startwert für Follower (9985 zeigt schnell den Sprung auf 5 Stellen)

// ================== Benutzerkonfiguration ==================
const char* ssid     = "YOUR_WIFI_SSID";      // Dein Wi-Fi-Name
const char* password = "YOUR_WIFI_PASSWORD";  // Dein Wi-Fi-Passwort
const char* uid      = "YOUR_BILIBILI_UID";   // Die Bilibili-UID, die du überwachen willst

String biliApiUrl = "https://api.bilibili.com/x/relation/stat?vmid=" + String(uid);
const unsigned long FETCH_INTERVAL = 30 * 60 * 1000; // Daten alle 30 Minuten aktualisieren

#define OLED_SDA 14
#define OLED_SCL 13
#define SCREEN_CONTRAST 255

// Animationsparameter
#define SCROLL_EASING    0.18f   // Basiskoeffizient für Federzug
#define ANIM_FPS         60      // Animations-Bildrate
#define ANIM_INTERVAL    (1000/ANIM_FPS)

// U8g2-Konstruktor initialisieren
U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

// ================== Zustandsvariablen ==================
long targetFollowers = 0;
long todayBaseFollowers = 0;
long todayAdded = 0;
bool isInitialFetch = true;
bool connectionError = false;

unsigned long lastFetchTime = 0;
unsigned long lastAnimTime = 0;
unsigned long lastSimTime = 0;

Preferences preferences; // Speichert den heutigen Basis-Follower-Wert sicher im Flash, bleibt bei Stromausfall erhalten

// ================== Kern-Engine für physikalische Dämpfung ==================
#define MAX_DIGITS 7

class DigitWheel {
public:
  float currentY = 0.0f;
  int   targetDigit = 0;
  float velocity = 0.0f;  // Kern-Geschwindigkeitsvariable der Federdämpfung

  void update(float easing) {
    float diff = (float)targetDigit - currentY;

    // Nächstgelegener Wert für zyklisches Scrollen (0 <-> 9)
    if (diff > 5.0f)  diff -= 10.0f;
    if (diff < -5.0f) diff += 10.0f;

    if (fabs(diff) > 0.005f) {
      // Klassisches physikalisches Modell: Hookesches Gesetz + viskose Dämpfung – erzeugt seidige Rückfederung und abklingende Schwingung
      float accel = diff * easing - velocity * 0.25f;
      velocity += accel;
      currentY += velocity;

      // Zyklische Bereichsbegrenzung
      while (currentY >= 10.0f) currentY -= 10.0f;
      while (currentY < 0.0f)   currentY += 10.0f;
    } else {
      currentY = (float)targetDigit;
      velocity = 0.0f; // stabil ankommen
    }
  }
};

DigitWheel wheels[MAX_DIGITS];

// Vorwärtsdeklarationen
void drawUI();
void drawLeftPanel();
void drawBigOdometer();
void drawRightPanel();
void drawWifiIcon(int x, int y);
void fetchBiliData();
void checkNewDayReset();

// ================== Initialisierung ==================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Bilibili OLED Monitor Deluxe ===");

  Wire.begin(OLED_SDA, OLED_SCL);
  u8g2.begin();
  u8g2.setContrast(SCREEN_CONTRAST);
  u8g2.enableUTF8Print();

  // Schritt 1: Elegantes Startbild zeichnen
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_7x13B_tr);
  u8g2.drawStr(20, 14, "BiliBili");
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(28, 28, "Fan Monitor");
  u8g2.sendBuffer();
  delay(800);

  preferences.begin("bilibili", false);
  todayBaseFollowers = preferences.getLong("base_fans", 0);

#if DEBUG_SIMULATE
  Serial.println("[SIM MODE] Simulation mode active");
  targetFollowers = SIM_START_VALUE;
  if (todayBaseFollowers == 0) {
    todayBaseFollowers = targetFollowers - 10; // simuliere bereits +10 heute
  }
  todayAdded = targetFollowers - todayBaseFollowers;
  isInitialFetch = false;
#else
  // Schritt 2: Mit lokalem WLAN verbinden
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(4, 14, "WiFi connecting...");
  u8g2.drawStr(4, 28, ssid);
  u8g2.sendBuffer();

  WiFi.begin(ssid, password);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 30) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK: " + WiFi.localIP().toString());
    // Schritt 3: Zeitdienst konfigurieren für automatischen Mitternachts-Reset
    configTime(8 * 3600, 0, "ntp.aliyun.com", "time.windows.com");
    fetchBiliData();
  } else {
    Serial.println("\nWiFi failed");
    connectionError = true;
    targetFollowers = 0;
  }
#endif
}

// ================== Hauptschleife ==================
void loop() {
  unsigned long now = millis();

#if DEBUG_SIMULATE
  // Simulations-Logik: stetige Sprünge, gut geeignet, um die gleichzeitige Rückfederung mehrerer Räder zu beobachten
  if (now - lastSimTime >= SIM_INTERVAL_MS) {
    lastSimTime = now;
    int delta = random(-2, 6); // zufällige Schwankung von -2 bis +5
    targetFollowers += delta;
    if (targetFollowers < 0) targetFollowers = 0;
    todayAdded = targetFollowers - todayBaseFollowers;
    Serial.printf("[SIM] target=%ld (delta=%+d) today=%+ld\n", targetFollowers, delta, todayAdded);
  }
#else
  // Echte Netzdaten zeitgesteuert abrufen
  if (now - lastFetchTime >= FETCH_INTERVAL || lastFetchTime == 0) {
    fetchBiliData();
    lastFetchTime = now;
  }
  checkNewDayReset();
#endif

  // Schritt 4: Kern-Animations-Refresh (stabil mit vollen 60 FPS)
  if (now - lastAnimTime >= ANIM_INTERVAL) {
    lastAnimTime = now;

    // Gesamt-Follower auf die Zielwerte der einzelnen Räder aufteilen
    long temp = targetFollowers;
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      wheels[i].targetDigit = temp % 10;
      temp /= 10;
    }

    // Physik-Engine aktualisieren, mit kaskadierender Verzögerung der höheren Stellen für eine reichhaltig abgestufte Schwingung mehrerer Ziffern
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      float ease = SCROLL_EASING * (1.0f - i * 0.012f);
      if (ease < 0.07f) ease = 0.07f;
      wheels[i].update(ease);
    }

    // Schritt 5: Vollständige Leinwand ausgeben
    u8g2.clearBuffer();
    drawUI();
    u8g2.sendBuffer();
  }
}

// ================== UI-Layout zeichnen (klassisches dreiteiliges Design) ==================
void drawUI() {
  drawLeftPanel();    // linkes vertikales Label
  drawBigOdometer();  // mittleres physikalisches Rollrad mit großen Ziffern
  drawRightPanel();   // rechtes Panel: Zuwachs und Signal
}

void drawLeftPanel() {
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(2, 7,  "F");
  u8g2.drawStr(2, 14, "A");
  u8g2.drawStr(2, 21, "N");
  u8g2.drawStr(2, 28, "S");

  u8g2.drawVLine(9, 2, 28); // vertikale Trennlinie
  u8g2.drawTriangle(11, 14, 11, 18, 14, 16); // mechanischer Pfeil zur großen Zahl
}

void drawRightPanel() {
  int rx = 102; // Start-X des rechten Panels
  u8g2.drawVLine(rx - 2, 2, 28); // rechte Trennlinie

  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(rx, 6, "TODAY");

  u8g2.setFont(u8g2_font_5x7_tr);
  char buf[8];
  if (todayAdded >= 0) {
    u8g2.drawTriangle(rx, 14, rx + 4, 14, rx + 2, 10); // Aufwärtsdreieck
    snprintf(buf, sizeof(buf), "%ld", todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  } else {
    u8g2.drawTriangle(rx, 10, rx + 4, 10, rx + 2, 14); // Abwärtsdreieck
    snprintf(buf, sizeof(buf), "%ld", -todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  }

  u8g2.setFont(u8g2_font_4x6_tr);
#if DEBUG_SIMULATE
  u8g2.drawStr(rx, 24, "SIM");
  if ((millis() / 400) % 2) u8g2.drawDisc(rx + 17, 22, 1); // simulierter Heartbeat-Blinker
#else
  if (connectionError) {
    u8g2.drawStr(rx, 24, "ERR");
  } else {
    u8g2.drawStr(rx, 24, "ON");
  }
#endif

  drawWifiIcon(rx + 12, 27); // Signalbalken zeichnen
}

void drawWifiIcon(int x, int y) {
#if DEBUG_SIMULATE
  int bars = 3;
#else
  int bars = 0;
  if (WiFi.status() == WL_CONNECTED) {
    int rssi = WiFi.RSSI();
    if (rssi > -60)      bars = 3;
    else if (rssi > -75) bars = 2;
    else                 bars = 1;
  }
#endif
  for (int i = 0; i < 3; i++) {
    int h = (i + 1) * 2;
    if (i < bars) {
      u8g2.drawBox(x + i * 3, y - h, 2, h);
    } else {
      u8g2.drawFrame(x + i * 3, y - h, 2, h);
    }
  }
}

// ================== Rollrad-Rendering (mit präzisem lokalem Clip-Fenster) ==================
void drawBigOdometer() {
  u8g2.setFont(u8g2_font_logisoso24_tn); // 24 Pixel hoher, riesiger Hardcore-Fettschrift-Ziffernsatz

  int charW = 14;      // Breite einer einzelnen Ziffer
  int areaTop = 4;     // obere Kante des Scroll-Fensters
  int areaBot = 28;    // untere Kante des Scroll-Fensters
  int areaH = areaBot - areaTop; // effektive Fensterhöhe (24px)
  int baseline = areaBot;        // Schrift-Baseline-Höhe

  // Effektive Stellenanzahl dynamisch berechnen für perfekte linksbündige adaptive Zentrierung
  long absVal = targetFollowers;
  int needDigits = 1;
  long t = absVal;
  while (t >= 10) { t /= 10; needDigits++; }
  if (needDigits > MAX_DIGITS) needDigits = MAX_DIGITS;

  int totalW = needDigits * charW;
  int startX = 14 + (88 - totalW) / 2;
  if (startX < 14) startX = 14;

  // Jede Stelle einzeln rendern, mit physikalischer Rückfederung
  for (int idx = 0; idx < needDigits; idx++) {
    int wheelIdx = MAX_DIGITS - needDigits + idx;
    int x = startX + idx * charW;

    float currYVal = wheels[wheelIdx].currentY;
    int digitLower = (int)currYVal;
    int digitUpper = (digitLower + 1) % 10;
    float fraction = currYVal - digitLower;

    // [Kern-Clipping-Steuerung]: lokales Clip-Fenster für die aktuelle Ziffer, sodass Ziffern außerhalb der Kanten automatisch unsichtbar werden
    u8g2.setClipWindow(x - 1, areaTop, x + charW, areaBot);

    // Die aktuelle Ziffer gleitet durch die Zugkraft nach oben heraus
    int yLower = baseline - (int)(fraction * areaH);
    char bufL[2] = { (char)('0' + digitLower), 0 };
    u8g2.drawStr(x, yLower, bufL);

    // Die nächste Ziffer kommt von unten hereingefahren und federt beim Ankommen voller kinetischer Energie zurück
    int yUpper = baseline + areaH - (int)(fraction * areaH);
    char bufU[2] = { (char)('0' + digitUpper), 0 };
    u8g2.drawStr(x, yUpper, bufU);

    u8g2.setMaxClipWindow(); // nach dem Rendern der aktuellen Stelle die volle Leinwand sofort wiederherstellen
  }
}

// ================== Netzdaten abrufen ==================
#if !DEBUG_SIMULATE
void fetchBiliData() {
  if (WiFi.status() != WL_CONNECTED) {
    connectionError = true;
    return;
  }
  Serial.println("Requesting Bilibili API...");
  WiFiClientSecure client;
  client.setInsecure(); // strenge SSL-Zertifikatsprüfung umgehen, für eine schlanke Verbindung
  HTTPClient http;
  http.begin(client, biliApiUrl);
  http.setUserAgent("Mozilla/5.0 (ESP32)");
  http.addHeader("Referer", "https://space.bilibili.com/");

  int code = http.GET();
  if (code == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, payload)) {
      long fans = doc["data"]["follower"].as<long>();
      if (fans > 0) {
        targetFollowers = fans;
        connectionError = false;
        if (isInitialFetch) {
          if (todayBaseFollowers == 0) {
            todayBaseFollowers = fans;
            preferences.putLong("base_fans", fans);
          }
          isInitialFetch = false;
        }
        todayAdded = targetFollowers - todayBaseFollowers;
        Serial.printf("Fetch Success! Fans=%ld Today=%+ld\n", targetFollowers, todayAdded);
      }
    } else {
      connectionError = true;
    }
  } else {
    Serial.printf("HTTP Code Error: %d\n", code);
    connectionError = true;
  }
  http.end();
}

void checkNewDayReset() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;
  static int lastResetDay = -1;
  // Punkt 0:00 Uhr – Tagesbasiswert exakt aktualisieren
  if (timeinfo.tm_hour == 0 && timeinfo.tm_min == 0 && timeinfo.tm_mday != lastResetDay) {
    lastResetDay = timeinfo.tm_mday;
    todayBaseFollowers = targetFollowers;
    preferences.putLong("base_fans", todayBaseFollowers);
    todayAdded = 0;
    Serial.println("[RTC] Midnight detected. Resetting today's base counter.");
  }
}
#endif
```

### Erklärung der wichtigsten Schritte

1. **Startbild zeichnen**: In `setup()` wird über `u8g2.drawStr()` das erscheinende Animations-Logo gezeichnet und gibt dem System so einen visuellen Puffer.
2. **Wi-Fi- und Zeit-Initialisierung**: Über `WiFi.begin()` wird die Netzwerkverbindung hergestellt und über `configTime()` der Aliyun-NTP-Zeitserver angebunden, damit Mitternacht lokal präzise erkannt wird.
3. **Datenanfrage tarnen**: Mit `http.setUserAgent()` und `addHeader("Referer", ...)` tarnt sich der ESP32 als ganz normaler Desktop-Browser, damit Bilibilis Anti-Scraping-Mechanismus die Anfrage nicht gnadenlos blockt.
4. **Federdämpfungs-Iteration**: In `DigitWheel::update` wird die Geschwindigkeit mit der klassischen Physik-Formel (Beschleunigung = Distanz × Federkonstante − Geschwindigkeit × Dämpfungskoeffizient) dynamisch abklingen gelassen. Genau das erzeugt die magische mechanische Rückfederung statt eines starren, toten Vorbeigleitens!
5. **Lokales Clip-Fenster (Clip Window)**: Beim Rendern der Ziffern wird mit `u8g2.setClipWindow(x, 4, w, 28)` festgelegt, dass nur innerhalb dieser mittleren Höhe Pixel angezeigt werden – außerhalb dieses Rahmens wird sofort unsichtbar. So entsteht die perfekte Illusion des mechanischen Spalts eines echten Rollrads.

---

## Fehlersuche

Keine Panik! 95 % der Probleme, auf die Anfänger bei solchen Klein-Hardware-Projekten stoßen, lassen sich auf die folgenden Punkte zurückführen:

* **Der Bildschirm bleibt komplett schwarz, zeigt gar nichts**:
  1. Zuerst die Verkabelung prüfen: Ist VCC des Displays wirklich an 3,3V angeschlossen, sitzt GND fest?
  2. Prüfe, ob SDA und SCL vertauscht sind. Im Code ist festgelegt: `SDA -> 14`, `SCL -> 13`.
  3. Bestätige, dass der Treiber-IC deines OLED-Displays das klassische `SSD1306` ist. Selten tragen baugleiche Displays ein `SH1106` – in diesem Fall musst du den U8g2-Konstruktor anpassen.

* **Der rechte Status zeigt dauerhaft „ERR"**:
  1. Das bedeutet einen Fehler bei der Netzwerk-Anfrage oder beim Parsing. Prüfe, ob `ssid` und `password` korrekt eingetragen sind. Hinweis: ESP32 **unterstützt kein 5-GHz-Wi-Fi** – verbinde dich zwingend mit einem 2,4-GHz-Netz oder einem 2,4-GHz-Hotspot deines Handys.
  2. Prüfe deine UID. Öffne im Browser `https://api.bilibili.com/x/relation/stat?vmid=DEINE_UID` und schau nach, ob korrekte JSON-Daten zurückkommen.

---

## FAQ

**F: Kann ich andere GPIO-Pins für das Display verwenden?**
A: Na klar! Ändere oben im Code einfach die Zahlen bei `#define OLED_SDA 14` und `#define OLED_SCL 13` auf einen beliebigen freien Pin deines ESP32-S3-Boards. Vergiss nicht, die Dupont-Kabel entsprechend umzustecken.

**F: Warum bleibt die Zahl nach dem Flashen bei 0 und bewegt sich nicht?**
A: Weil `#define DEBUG_SIMULATE` im Code standardmäßig auf `0` steht (echter Netzabruf). Da das Aktualisierungsintervall auf 30 Minuten gestellt ist, kann es direkt nach dem Start passieren, dass der erste Frame noch nicht erfolgreich geladen wurde, während sich Wi-Fi noch verbindet. Setze das Makro auf `1`, um den Simulationsmodus zu aktivieren – dann siehst du sofort, wie die Zahl alle 2 Sekunden zufällig springt und die Schwingungs-Animation wild auslöst!

**F: Ich möchte häufiger aktualisieren – wie?**
A: Passe im Konfigurationsbereich `const unsigned long FETCH_INTERVAL = 30 * 60 * 1000;` an. Sehr häufige Abfragen (z. B. unter 10 Sekunden) sind allerdings nicht empfehlenswert – sonst könnte die Bilibili-Schnittstelle deine öffentliche IP vorübergehend blockieren.

**F: Verfällt der heutige Follower-Zuwachs beim Ausschalten auf null?**
A: Nein! Im Code wird die `Preferences`-Bibliothek des ESP32 verwendet. Sobald an einem neuen Tag erfolgreich der Basis-Follower-Wert erfasst wurde, wird diese Zahl sicher im internen Flash des ESP32 gespeichert. Selbst nach vollständigem Stromverlust und Kabel-ab weiß der ESP32 beim nächsten Start noch, wo der heutige Ausgangspunkt lag – und berechnet den Tageszuwachs präzise.

**F: Lässt sich dieser physikalische Effekt auf ein höher auflösendes Display (z. B. 128x64) portieren?**
A: Natürlich. In der Funktion `drawBigOdometer()` gibt es eigene Variablen für die Höhensteuerung: `areaTop`, `areaBot`, `baseline` sowie die Schriftgröße. Bei einem größeren Display skalierst du die Clip-Fenster-Koordinaten einfach proportional und wählst einen größeren U8g2-Fettschrift-Satz (z. B. logisoso42) – schon bekommst du einen noch größeren Rollrad-Effekt.

**F: Warum zeigt die Display-Signalstärke ständig volle Balken oder ist ungenau?**
A: In `drawWifiIcon` lesen wir `WiFi.RSSI()` (Received Signal Strength Indication). Der Code teilt das Signal über die beiden festen Schwellen `-60dBm` und `-75dBm` in 3 Stufen ein. Wenn dein Gerät nah am Router steht, steht die Anzeige in der Regel stabil auf 3 vollen Balken.

---

## Weitere Ideen

Mit diesem Experiment hat dein Hardcore-Geek-Desktop bereits erste Form angenommen. So kannst du weiterbasteln:

* **Mehrere Plattformen überwachen**: Schreibe noch einen API-Parser und lass das Display alle 10 Sekunden seidig weich zwischen „Bilibili-Follower-Zahl" und „Douyin-/GitHub-Follower-Zahl" durchrollen.
* **Vibrationsmotor nachrüsten**: Verbinde einen flachen Mini-Vibrationsmotor mit einem Pin des Boards. Jedes Mal, wenn die Follower-Zahl steigt, gibt der Motor im Takt der rollenden Ziffern ein schwaches „taktak-tak" mechanisches Feedback ab – der Stressabbau-Effekt verdoppelt sich sofort!
* **3D-gedrucktes Gehäuse**: Entwirf für deinen ESP32 und das OLED-Display ein Mini-Gehäuse im Retro-Fernseher-Look – im Handumdrehen wird daraus ein Desktop-Kunstwerk.

---

## Referenzen

* [Espressif offizielles ESP32-S3-Datenblatt und Hardware-Design-Leitfaden](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
* [U8g2 offizielles GitHub-Open-Source-Repo mit HD-Font- und Pin-Konfiguration](https://github.com/olikraus/u8g2)
* [ArduinoJson offizielle Anleitung zu effizientem und Streaming-Parsing](https://arduinojson.org/)
