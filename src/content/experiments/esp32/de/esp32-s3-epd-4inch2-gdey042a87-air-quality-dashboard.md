---
title: "4,2\" E-Paper-Display (SSD1683) mit ESP32-S3 ansteuern | Luftqualitäts-Dashboard mit AQICN (GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-4inch2-gdey042a87
category: esp32
date: 2026-07-08
intro: "Mit einem ESP32-S3 und GxEPD2 ein 4,2\" Schwarz-Weiß-E-Paper-Display (GDEY042A87 / SSD1683) ansteuern und über die AQICN-Luftqualitäts-API ein Desktop-Dashboard bauen, das das Bild auch ohne Strom hält. Inklusive Verkabelung, komplettlem Arduino-C++-Code, Partitionskonfiguration und ausführlicher Fehlerbehebung."
image: "https://img.lingflux.com/2026/07/39d31272f2976bb195ecea554654502d.jpg"
---

> **In einem Satz:** Mit einem gebraucht für ein paar Euro ergatterten 4,2\" Schwarz-Weiß-E-Paper-Display und einem ESP32-S3 baust du dir über die AQICN-Luftqualitäts-API ein Desktop-Dashboard, das dir auf einen Blick verrät, ob das Wetter heute gut genug ist, um auf den Baiyun-Berg zu stürmen – ganz ohne Handy aus der Tasche zu kramen.

Schwierigkeit: ⭐⭐☆☆☆ (auch für Einsteiger machbar)
Geschätzte Zeit: 30 Minuten
Getestet mit: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 ＋ GxEPD2 v1.6.9 + Adafruit GFX Library v1.12.6 + ArduinoJson v7.4.3 (bei der Bibliotheks-Installation am besten an diesen Versionen orientieren – zu neu oder zu alt kann schnell zu Fallstricken führen)

> **TL;DR (Schnellstart):**
>
> 1. Verdrahtung: GPIO11 → SDI/MOSI, GPIO12 → SCL/SCK, GPIO10 → CS, GPIO9 → DC, GPIO8 → RES, GPIO7 → BUSY, VCC an 3,3V, GND gemeinsam mit Masse verbinden
> 2. Bibliotheken installieren: ArduinoJson, GxEPD2, Adafruit GFX Library, U8g2_for_Adafruit_GFX (Autor olikraus)
> 3. Im Code `WIFI_SSID`, `WIFI_PASS` und `API_TOKEN` auf deine eigenen Werte setzen (wie du an das Token kommst, steht unten im Abschnitt „Kostenloses AQICN API-Token beantragen")
> 4. Flashen, auf WiFi warten, das Display refresht automatisch und zeigt die Luftqualitätsdaten an

## Vorwort

Für ein paar Euro habe ich auf dem Gebrauchtmarkt ein Schwarz-Weiß-E-Paper-Display ergattert – ganz ehrlich, beim Kauf war ich etwas nervös: Falls es ein totes Panel sein sollte, wäre das Geld futsch. Zum Glück lief es beim ersten Test einwandfrei, kein Reinfall; nur eine vertikale Linie ist defekt, aber das stört nicht weiter. Solange das Display noch warm ist, dachte ich mir, baue ich direkt ein kleines Dashboard daraus, das ständig läuft, ohne Handy-App auskommt und mir mit einem Blick verrät, ob die Luft am Baiyun-Berg heute gut genug ist – und ob sich ein Ausflug lohnt. Dieser Artikel hält die komplette Verdrahtung, den Code und alle Stolpersteine fest, über die ich gestolpert bin. Wenn du Schritt für Schritt mitmachst, sollte das Display beim ersten Versuch leuchten.

## So sieht das Ergebnis aus

Ein ESP32-S3 holt regelmäßig die Luftqualitätsdaten von AQICN.ORG und refreshed sie auf das E-Paper-Display. Das Bild zeigt einen großen AQI-Wert, 12 Detailkennzahlen (PM2.5, PM10, Temperatur, Luftfeuchte, Windgeschwindigkeit usw.) sowie Balkendiagramme für die 7-Tage-Vorhersage von PM2.5 und UV-Index. Auch ohne Strom bleibt das Bild erhalten – auf dem Schreibtisch wird es zum kleinen „elektronischen Wettergläschen" und einer schönen Desktop-Dekoration.

## Komponenten-Übersicht

**ESP32-S3-Entwicklerboard** ist ein SoC-Board mit WiFi. Es holt die Daten aus dem Netz, erledigt die Logik und schiebt das Bild per SPI zum Display – das Gehirn des gesamten Projekts. Ich habe es gewählt, weil es viele Pins, genug Rechenleistung und eingebautes WiFi mitbringt, sodass kein extra Netzwerkmodul nötig ist.

**E-Paper-Treiberplatine** (selbst gebaut) übersetzt die SPI-Kommandos des ESP32 in die Pegelsignale, die das Display versteht – im Grunde ein „Dolmetscher". Selbst gezeichnet habe ich sie, weil es einfach Spaß macht. Die herausgeführten Anschlüsse entsprechen den marktüblichen Belegungen, daher kannst du auch jede andere gängige E-Paper-Treiberplatine verwenden.

Das **4,2\" Schwarz-Weiß-E-Paper-Display** ist ein Bildschirm, der mikrokapselige Schwarz-Weiß-Partikel über ein elektrisches Feld dreht. Seine Besonderheit: Es hält das Bild auch ohne Strom – ideal für so ein „Blick und weitergehen"-Dashboard. Es verbraucht deutlich weniger Strom als ein LCD; der Preis dafür ist die langsame Refresh-Rate, die es für Animationen ungeeignet macht.



## Stückliste (BOM)

| Bauteil | Typ/Spezifikation | Menge |
| --- | --- | --- |
| ESP32-Entwicklerboard | ESP32-S3 (jedes Modell mit ausreichend SPI-Pins funktioniert) | 1 |
| E-Paper-Treiberplatine | Selbst gebautes PCB, Pin-Belegung wie marktübliche Treiberplatinen | 1 |
| E-Paper-Display | 4,2\" Schwarz-Weiß, kompatibel mit dem Treiber GxEPD2_420_GYE042A87 | 1 |
| Dupont-Kabel | | mehrere |

## Pin-Belegung der Bauteile

| Pin | Vollständiger Name | Funktion |
| --- | --- | --- |
| **VCC** | Versorgungsspannung, Pluspol | Eingang für die Versorgung, verbunden mit dem 3V3-Ausgang des ESP32-S3 |
| **GND** | Masse | Bezugsmasse, verbunden mit GND des ESP32-S3, schließt den Stromkreis |
| **SDI/MOSI** | Master Out, Slave In | SPI-Datenleitung, über die der ESP32 Daten an das Display sendet |
| **SCL/SCK** | Serial Clock | SPI-Taktleitung, steckt den Takt der Datenübertragung |
| **CS** | Chip Select | Sagt dem Display: „Die nächsten Daten gelten dir." |
| **DC** | Data/Command Umschaltung | Unterscheidet, ob gerade Bilddaten oder ein Steuerkommando übertragen werden |
| **RES/RST** | Reset | Einmal auf Low ziehen, damit sich das Display neu initialisiert |
| **BUSY** | Busy-Status | Während des Refresh auf Low; darüber erkennt der ESP32, ob schon das nächste Kommando geschickt werden darf |

## Verdrahtung

| E-Paper-Pin | verbunden mit ESP32-S3-Pin |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

Empfehlung: Nach dem Aufbau alle Leitungen noch einmal einzeln durchgehen – das spart dir etwa 80 % der Fehlersuche. Die fieseste Eigenschaft von E-Paper-Displays ist nämlich, dass falsche Verkabelung keinen Fehler meldet: Das Display bleibt einfach weiß oder zeigt Schnee, und mit bloßem Auge ist auf den ersten Blick kaum zu erkennen, ob das Problem im Code oder in der Verkabelung steckt.

## Zu installierende Bibliotheken

Im Bibliotheksverwalter der Arduino IDE suchst und installierst du folgende Bibliotheken (die getesteten Versionen dienen nur als Orientierung, im Zweifel nimm die aktuellste stabile Version aus dem Bibliotheksverwalter):

| Bibliothek | Funktion | getestete Version |
| --- | --- | --- |
| ArduinoJson | Parst das JSON der AQICN-API | v7.4.3 |
| GxEPD2 | Kern-Bibliothek als E-Paper-Treiber | v1.6.9 |
| Adafruit GFX Library | Grafik-Basisklassenbibliothek, von GxEPD2 vorausgesetzt | v1.12.6 |
| U8g2_for_Adafruit_GFX | Brückt die U8g2-Chinese-Font-Sammlung zu Adafruit GFX, zur Darstellung chinesischer Schriftzeichen | v1.8.0 (Autor olikraus) |

`WiFi.h`, `HTTPClient.h` und `SPI.h` sind bereits im ESP32-Core enthalten und müssen nicht separat installiert werden – sobald das ESP32-Board-Supportpaket installiert ist, sind sie da.

## Flash-Konfiguration: Partitionsschema (wichtig)

Hier gibt es erst einmal einen Stolperstein aus dem Weg zu räumen: Dieses Projekt nutzt die kompletten chinesischen Font-Sammlungen von `U8g2_for_Adafruit_GFX` (im Code werden `u8g2_font_wqy16_t_gb2312`, `wqy14` und `wqy12` eingebunden), die zusammen fast 500 KB belegen. Das Standard-Partitionsschema des ESP32 stellt der Programmfläche aber nur 1 MB zur Verfügung – beim Kompilieren bekommst du dann „zu wenig Platz (region `app' overflowed)" und nichts lässt sich flashen.

**Lösung:** Vor dem Upload das Partitionsschema vergrößern.

**Pfad:** Arduino IDE Menü oben → `Werkzeuge (Tools)` → `Partition Scheme` → **`Huge APP (3MB No OTA/1MB SPIFFS)`** auswählen.

Ich nutze genau dieses `Huge APP`-Schema: Die Programmfläche bekommt auf einen Schlag 3 MB, Font-Sammlung und Code passen bequem hinein, und Kompilieren sowie Flashen laufen problemlos durch.

> 💡 Ein paar Ergänzungen:
> - **Warum sind die Fonts so groß?** GB2312 deckt sechs- bis siebentausend chinesische Schriftzeichen ab. Jeder wqy-Font besteht aus ein bis zweihundert KB Bitmap-Daten – das lässt sich nicht so klein wegpacken wie westliche Fonts.
> - **Der Preis von „No OTA":** Mit No OTA entfällt die „Over-the-Air"-Funktionsaktualisierung; du flasht nur noch per USB-Kabel. Für ein kleines Desktop-Dings, das ohnehin mit Kabel auf dem Schreibtisch sitzt, völlig egal.
> - **Die bessere Lösung für Boards mit großem Flash:** Wenn dein ESP32-S3 ≥ 8 MB Flash hat, kannst du ein noch großzügigeres Schema wählen (z. B. `8M with SPIFFS`) – dann klappt OTA und du hast zusätzlichen Platz für Daten.
> - Nach dem Umstellen des Partitionsschemas unbedingt neu kompilieren, nicht nur auf „Upload" klicken und die alte Konfiguration nutzen.

## Kostenloses AQICN API-Token beantragen

Das `API_TOKEN` im Code sowie die Stations-ID (z. B. `@14370`) stammen von AQICN (aqicn.org). Das Token ist kostenlos – in vier Schritten hast du es.

**Schritt 1: Deine Stadt finden**

Öffne [aqicn.org](https://aqicn.org/), tippe oben rechts in das Suchfeld den gewünschten Stadt- oder Stationsnamen ein (z. B. „Guangzhou" oder „Baiyun Mountain") und klicke auf die entsprechende Luftqualitätsseite.

**Schritt 2: In die API-Datenplattform wechseln**

Scrolle auf der Stadtseite nach unten, suche den Link mit der Aufschrift „json: api" und klicke darauf – du landest auf der AQICN-Datenplattform.

**Schritt 3: Konto registrieren und aktivieren**

Registriere dich mit deiner E-Mail-Adresse und klicke in der Bestätigungsmail den Aktivierungslink, um die Verifizierung abzuschließen. Nach dem Login findest du in der Konsole dein persönliches **Token** (eine zufällige Zeichenkette – bitte geheim halten und nicht in ein öffentliches Repo committen).

**Schritt 4: API-Adresse zusammenbauen und in den Code eintragen**

Trage das Token im Makro `API_TOKEN` ein und ersetze in `API_URL` die `@14370` durch die ID deiner Wunschstation (du kannst auch den englischen Stadtnamen oder Längen-/Breitengrad nehmen, die Schreibweise findest du in der [AQICN-API-Dokumentation](https://aqicn.org/api/)). Das vollständige Format sieht so aus:

```
https://api.waqi.info/feed/@14370/?token=你的Token
```

Um sicherzugehen, dass die Adresse stimmt, kopiere die Zeichenkette einfach in die Adresszeile deines Browsers: Sobald als Antwort ein JSON mit `"status":"ok"` zurückkommt, ist die Leitung frei.

> Das persönliche AQICN-Token ist komplett kostenlos, ohne Kreditkarte, und das Kontingent reicht für private Projekte locker aus – keine Sorge wegen Kosten.

## Vollständiger Code + Erklärung

```cpp
/*
 * ============================================================
 * ESP32-S3 + 4.2" 墨水屏 空气质量监测站  (v2.1 横屏优化版)
 * Air Quality Monitor using AQICN API
 * ============================================================
 *
 * 本版本相对上一版做了如下修改:
 * 1. 彻底删除了底部显示不全的 PM10 预测表格及其标题。
 * 2. 将上方的 AQI 方块和 12项指标网格高度从 128 扩大至 141，行高更宽松。
 * 3. 将 PM2.5 和紫外线预测图表的高度从 52 扩大至 64，画面更舒展。
 * 4. 重新计算了所有垂直坐标，底部保留少许清爽留白。
 *
 * 硬件连接 (不变):
 * EPD_CS   -> GPIO 10
 * EPD_DC   -> GPIO 9
 * EPD_RST  -> GPIO 8
 * EPD_BUSY -> GPIO 7
 * EPD_MOSI -> GPIO 11
 * EPD_CLK  -> GPIO 12
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Adafruit_GFX.h>
#include <U8g2_for_Adafruit_GFX.h>

// 粗体数字字体 (Adafruit GFX 自带)
#include <Fonts/FreeSansBold9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>

// ==================== 配置区 ====================
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASS     "YOUR_WIFI_PASSWORD"
#define API_TOKEN     "YOUR_WIFI_AQI_API_TONKEN"
#define API_URL       "https://api.waqi.info/feed/@14370/?token=" API_TOKEN

#define UPDATE_INTERVAL_MS  (30 * 60 * 1000)  // 30分钟更新一次

// 如果画面上下颠倒，把这里改成 1
#define ROTATION_FLIP 0

// ==================== 引脚定义 ====================
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_MOSI 11
#define EPD_CLK  12

// ==================== 墨水屏驱动 ====================
GxEPD2_BW<GxEPD2_420_GYE042A87, GxEPD2_420_GYE042A87::HEIGHT> display(
  GxEPD2_420_GYE042A87(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY)
);

// U8g2 中文渲染桥接对象
U8G2_FOR_ADAFRUIT_GFX u8f;

// ==================== 数据结构 ====================
struct ForecastDay {
  char day[6];   // "07-08"
  int avg;
  int maxVal;
  int minVal;
};

struct AqiData {
  int aqi;
  char city[32];
  char timeStr[20];
  char timeShort[12];   // 精简时间 "07-08 14:00"
  char dominentpol[8];
  float lat, lon;

  float co, dew, h, no2, o3, p, pm10, pm25, so2, t, w, wg;

  ForecastDay pm25Forecast[8];
  int pm25ForecastCount;
  ForecastDay pm10Forecast[8];
  int pm10ForecastCount;
  ForecastDay uviForecast[8];
  int uviForecastCount;
};

AqiData aqiData;

// ==================== 辅助函数: AQI 等级 ====================
const char* getAqiLevel(int aqi) {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy-S";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "V.Unhealthy";
  return "Hazardous";
}

const char* getAqiLevelCN(int aqi) {
  if (aqi <= 50)  return "优";
  if (aqi <= 100) return "良";
  if (aqi <= 150) return "轻度污染";
  if (aqi <= 200) return "中度污染";
  if (aqi <= 300) return "重度污染";
  return "严重污染";
}

// ==================== WiFi 连接 ====================
void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nConnected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi connection FAILED!");
  }
}

// ==================== 解析预报数组 ====================
int parseForecastArray(JsonArray arr, ForecastDay* out, int maxCount) {
  int count = 0;
  for (JsonObject item : arr) {
    if (count >= maxCount) break;
    const char* dayStr = item["day"];
    if (dayStr && strlen(dayStr) >= 10) {
      strncpy(out[count].day, dayStr + 5, 5);
      out[count].day[5] = '\0';
    }
    out[count].avg    = item["avg"] | 0;
    out[count].maxVal = item["max"] | 0;
    out[count].minVal = item["min"] | 0;
    count++;
  }
  return count;
}

// ==================== API 请求与解析 ====================
bool fetchAqiData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping fetch.");
    return false;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.setTimeout(15000);
  int httpCode = http.GET();

  if (httpCode != 200) {
    Serial.printf("HTTP GET failed, code: %d\n", httpCode);
    http.end();
    return false;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.printf("JSON parse error: %s\n", err.c_str());
    return false;
  }

  const char* status = doc["status"];
  if (!status || strcmp(status, "ok") != 0) {
    Serial.println("API status not OK");
    return false;
  }

  JsonObject data = doc["data"];
  aqiData.aqi = data["aqi"] | 0;

  const char* cityName = data["city"]["name"];
  if (cityName) {
    const char* comma = strchr(cityName, ',');
    if (comma) {
      int len = comma - cityName;
      if (len > 31) len = 31;
      strncpy(aqiData.city, cityName, len);
      aqiData.city[len] = '\0';
    } else {
      strncpy(aqiData.city, cityName, 31);
      aqiData.city[31] = '\0';
    }
  }

  const char* timeS = data["time"]["s"];
  if (timeS) {
    strncpy(aqiData.timeStr, timeS, 19);
    aqiData.timeStr[19] = '\0';
    if (strlen(timeS) >= 16) {
      memcpy(aqiData.timeShort, timeS + 5, 11);
      aqiData.timeShort[11] = '\0';
    } else {
      aqiData.timeShort[0] = '\0';
    }
  }

  const char* dpol = data["dominentpol"];
  if (dpol) {
    strncpy(aqiData.dominentpol, dpol, 7);
    aqiData.dominentpol[7] = '\0';
  }

  aqiData.lat = data["city"]["geo"][0] | 0.0f;
  aqiData.lon = data["city"]["geo"][1] | 0.0f;

  JsonObject iaqi = data["iaqi"];
  aqiData.co   = iaqi["co"]["v"]   | 0.0f;
  aqiData.dew  = iaqi["dew"]["v"]  | 0.0f;
  aqiData.h    = iaqi["h"]["v"]    | 0.0f;
  aqiData.no2  = iaqi["no2"]["v"]  | 0.0f;
  aqiData.o3   = iaqi["o3"]["v"]   | 0.0f;
  aqiData.p    = iaqi["p"]["v"]    | 0.0f;
  aqiData.pm10 = iaqi["pm10"]["v"] | 0.0f;
  aqiData.pm25 = iaqi["pm25"]["v"] | 0.0f;
  aqiData.so2  = iaqi["so2"]["v"]  | 0.0f;
  aqiData.t    = iaqi["t"]["v"]    | 0.0f;
  aqiData.w    = iaqi["w"]["v"]    | 0.0f;
  aqiData.wg   = iaqi["wg"]["v"]   | 0.0f;

  JsonObject forecast = data["forecast"]["daily"];
  aqiData.pm25ForecastCount = parseForecastArray(
    forecast["pm25"].as<JsonArray>(), aqiData.pm25Forecast, 8);
  aqiData.pm10ForecastCount = parseForecastArray(
    forecast["pm10"].as<JsonArray>(), aqiData.pm10Forecast, 8);
  aqiData.uviForecastCount = parseForecastArray(
    forecast["uvi"].as<JsonArray>(), aqiData.uviForecast, 8);

  Serial.printf("Data parsed OK! AQI=%d, City=%s\n", aqiData.aqi, aqiData.city);
  return true;
}

// ==================== 绘图小工具 ====================
void drawCN(int x, int y, const char* utf8, bool whiteOnBlack, const uint8_t* font) {
  u8f.setFont(font);
  if (whiteOnBlack) {
    u8f.setForegroundColor(GxEPD_WHITE);
    u8f.setBackgroundColor(GxEPD_BLACK);
  } else {
    u8f.setForegroundColor(GxEPD_BLACK);
    u8f.setBackgroundColor(GxEPD_WHITE);
  }
  int baselineY = y + u8f.getFontAscent();
  u8f.setCursor(x, baselineY);
  u8f.print(utf8);
}

void drawCNCentered(int cx, int y, const char* utf8, bool whiteOnBlack, const uint8_t* font) {
  u8f.setFont(font);
  uint16_t w = u8f.getUTF8Width(utf8);
  drawCN(cx - w / 2, y, utf8, whiteOnBlack, font);
}

void drawCNRight(int rightX, int y, const char* utf8, bool whiteOnBlack, const uint8_t* font) {
  u8f.setFont(font);
  uint16_t w = u8f.getUTF8Width(utf8);
  drawCN(rightX - w, y, utf8, whiteOnBlack, font);
}

void drawBold(const GFXfont* font, const char* text, int x, int baselineY) {
  display.setFont(font);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(x, baselineY);
  display.print(text);
  display.setFont(NULL); 
}

void drawBoldCentered(const GFXfont* font, const char* text, int cx, int baselineY) {
  display.setFont(font);
  int16_t x1, y1; uint16_t w, h;
  display.getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  display.setFont(NULL);
  drawBold(font, text, cx - w / 2 - x1, baselineY);
}

// ==================== 绘制 UI (横屏 400x300优化版) ====================
void drawUI() {
  int W = display.width();
  int H = display.height();

  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);

    // ---------- 顶部标题栏 (0-20) ----------
    display.fillRect(0, 0, W, 20, GxEPD_BLACK);
    drawCN(6, 6, "空气质量监测站", true, u8g2_font_wqy14_t_gb2312);
    drawCNRight(W - 6, 5, aqiData.timeShort, true, u8g2_font_wqy12_t_gb2312);

    // ---------- 位置行 (20-34) ----------
    drawCN(6, 24, aqiData.city, false, u8g2_font_wqy14_t_gb2312);
    char levelLine[24];
    snprintf(levelLine, sizeof(levelLine), "%s · 主要污染: %s", getAqiLevelCN(aqiData.aqi), aqiData.dominentpol);
    drawCNRight(W - 6, 24, levelLine, false, u8g2_font_wqy12_t_gb2312);

    display.drawFastHLine(4, 36, W - 8, GxEPD_BLACK);

    // ---------- AQI 大方块 (左, 40-181) [高度增加到141] ----------
    int aqiBoxX = 6, aqiBoxY = 40, aqiBoxW = 118, aqiBoxH = 141;
    display.drawRoundRect(aqiBoxX, aqiBoxY, aqiBoxW, aqiBoxH, 6, GxEPD_BLACK);
    display.drawRoundRect(aqiBoxX + 1, aqiBoxY + 1, aqiBoxW - 2, aqiBoxH - 2, 5, GxEPD_BLACK);

    drawCNCentered(aqiBoxX + aqiBoxW / 2, aqiBoxY + 12, "AQI 指数", false, u8g2_font_wqy12_t_gb2312);

    char aqiStr[8];
    snprintf(aqiStr, sizeof(aqiStr), "%d", aqiData.aqi);
    drawBoldCentered(&FreeSansBold24pt7b, aqiStr, aqiBoxX + aqiBoxW / 2, aqiBoxY + 98);

    drawCNCentered(aqiBoxX + aqiBoxW / 2, aqiBoxY + 114, getAqiLevelCN(aqiData.aqi), false, u8g2_font_wqy16_t_gb2312);

    // ---------- 指标网格 (右, 40-181) [高度增加到141] ----------
    int gridX = 130, gridY = 40, gridW = 264, gridH = 141;
    int cols = 4, rows = 3;
    int cellW = gridW / cols;   // 66
    int cellH = gridH / rows;   // 47 (刚好整除)

    struct Metric {
      const char* label;
      float value;
      const char* unit;
      int decimals;
    };
    Metric metrics[] = {
      {"PM2.5", aqiData.pm25, "ug/m3", 0},
      {"PM10",  aqiData.pm10, "ug/m3", 0},
      {"温度",  aqiData.t,    "C",     0},
      {"湿度",  aqiData.h,    "%",     0},
      {"O3",    aqiData.o3,   "ppb",   0},
      {"NO2",   aqiData.no2,  "ppb",   0},
      {"SO2",   aqiData.so2,  "ppb",   1},
      {"CO",    aqiData.co,   "mg/m3", 1},
      {"风速",  aqiData.w,    "m/s",   1},
      {"阵风",  aqiData.wg,   "m/s",   1},
      {"露点",  aqiData.dew,  "C",     1},
      {"气压",  aqiData.p,    "hPa",   0},
    };

    for (int i = 0; i < 12; i++) {
      int col = i % cols;
      int row = i / cols;
      int x = gridX + col * cellW;
      int y = gridY + row * cellH;
      int h = cellH; 

      display.drawRect(x, y, cellW, h, GxEPD_BLACK);

      // 标签 (稍微靠下一两像素，居中感更好)
      drawCN(x + 3, y + 4, metrics[i].label, false, u8g2_font_wqy12_t_gb2312);

      // 数值 (粗体)
      char valStr[12];
      if (metrics[i].decimals == 0)
        snprintf(valStr, sizeof(valStr), "%.0f", metrics[i].value);
      else
        snprintf(valStr, sizeof(valStr), "%.1f", metrics[i].value);
      drawBold(&FreeSansBold9pt7b, valStr, x + 3, y + h - 8);

      // 单位
      display.setFont(NULL);
      display.setTextSize(1);
      int16_t tx, ty; uint16_t tw, th;
      display.getTextBounds(metrics[i].unit, 0, 0, &tx, &ty, &tw, &th);
      display.setCursor(x + cellW - tw - 3, y + h - 11);
      display.print(metrics[i].unit);
    }

    // 中间分割线
    display.drawFastHLine(4, 183, W - 8, GxEPD_BLACK);

    // ---------- 预报区 (190-282) [高度由52增加至64，排版更宽松] ----------
    drawCN(6, 190, "PM2.5 七日预测", false, u8g2_font_wqy12_t_gb2312);
    drawCNRight(W - 6, 190, "紫外线预测", false, u8g2_font_wqy12_t_gb2312);

    int barStartX = 6;
    int barStartY = 204;
    int barAreaW  = 258;
    int barAreaH  = 64; 
    int barCount  = min(aqiData.pm25ForecastCount, 7);
    int barGap    = 4;
    int barW      = (barCount > 0) ? (barAreaW - (barCount - 1) * barGap) / barCount : barAreaW;

    int maxPm25 = 1;
    for (int i = 0; i < barCount; i++)
      if (aqiData.pm25Forecast[i].maxVal > maxPm25) maxPm25 = aqiData.pm25Forecast[i].maxVal;

    for (int i = 0; i < barCount; i++) {
      ForecastDay& f = aqiData.pm25Forecast[i];
      int x = barStartX + i * (barW + barGap);
      int maxH = (int)((float)f.maxVal / maxPm25 * (barAreaH - 14));
      int avgH = (int)((float)f.avg    / maxPm25 * (barAreaH - 14));

      display.drawRect(x, barStartY + barAreaH - 14 - maxH, barW, max(maxH, 1), GxEPD_BLACK);
      display.fillRect(x, barStartY + barAreaH - 14 - avgH, barW, max(avgH, 1), GxEPD_BLACK);

      char dayLabel[3];
      strncpy(dayLabel, f.day + 3, 2);
      dayLabel[2] = '\0';
      display.setFont(NULL);
      display.setTextSize(1);
      int16_t tx, ty; uint16_t tw, th;
      display.getTextBounds(dayLabel, 0, 0, &tx, &ty, &tw, &th);
      display.setCursor(x + (barW - tw) / 2, barStartY + barAreaH - 10);
      display.print(dayLabel);
    }

    // PM2.5 图例
    display.fillRect(barStartX, barStartY + barAreaH + 2, 6, 5, GxEPD_BLACK);
    drawCN(barStartX + 9, barStartY + barAreaH + 1, "均值", false, u8g2_font_wqy12_t_gb2312);
    display.drawRect(barStartX + 60, barStartY + barAreaH + 2, 6, 5, GxEPD_BLACK);
    drawCN(barStartX + 69, barStartY + barAreaH + 1, "最大", false, u8g2_font_wqy12_t_gb2312);

    // ---------- UV 紫外线小图表 ----------
    int uvX = 272, uvY = 204, uvW = W - uvX - 6, uvH = barAreaH;
    display.drawRect(uvX, uvY, uvW, uvH, GxEPD_BLACK);

    int uvCount  = min(aqiData.uviForecastCount, 6);
    int uvBarGap = 3;
    int uvBarW   = (uvCount > 0) ? (uvW - 6 - (uvCount - 1) * uvBarGap) / uvCount : uvW;

    int maxUvi = 1;
    for (int i = 0; i < uvCount; i++)
      if (aqiData.uviForecast[i].maxVal > maxUvi) maxUvi = aqiData.uviForecast[i].maxVal;

    for (int i = 0; i < uvCount; i++) {
      ForecastDay& u = aqiData.uviForecast[i];
      int x = uvX + 3 + i * (uvBarW + uvBarGap);
      int mH = (int)((float)u.maxVal / maxUvi * (uvH - 16));
      int aH = (int)((float)u.avg   / maxUvi * (uvH - 16));

      if (mH > 0) display.drawRect(x, uvY + uvH - 12 - mH, uvBarW, mH, GxEPD_BLACK);
      if (aH > 0) display.fillRect(x, uvY + uvH - 12 - aH, uvBarW, aH, GxEPD_BLACK);

      char dayL[3];
      strncpy(dayL, u.day + 3, 2);
      dayL[2] = '\0';
      display.setFont(NULL);
      display.setTextSize(1);
      display.setCursor(x, uvY + uvH - 10);
      display.print(dayL);
    }

    // ---------- 最底部状态栏 (286-300) [上方留出少许清爽白边] ----------
    display.fillRect(0, H - 14, W, 14, GxEPD_BLACK);
    display.setFont(NULL);
    display.setTextSize(1);
    display.setTextColor(GxEPD_WHITE);
    display.setCursor(6, H - 11);
    display.print("aqicn.org | ESP32-S3");

    char geoBot[24];
    snprintf(geoBot, sizeof(geoBot), "%.2fN %.2fE", aqiData.lat, aqiData.lon);
    int16_t tx, ty; uint16_t tw, th;
    display.getTextBounds(geoBot, 0, 0, &tx, &ty, &tw, &th);
    display.setCursor(W - tw - 6, H - 11);
    display.print(geoBot);

  } while (display.nextPage());
}

// ==================== 显示错误信息 ====================
void drawError(const char* msg) {
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.drawRect(5, 5, display.width() - 10, display.height() - 10, GxEPD_BLACK);
    display.setFont(NULL);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(2);
    display.setCursor(20, 40);
    display.print("ERROR");
    display.setTextSize(1);
    display.setCursor(20, 80);
    display.print(msg);
    display.setCursor(20, 100);
    display.print("Will retry in 30s...");
  } while (display.nextPage());
}

// ==================== 自动选择横屏方向 ====================
void chooseLandscapeRotation() {
  int candidates[4] = {1, 3, 0, 2};
  int chosen = 1;
  for (int i = 0; i < 4; i++) {
    display.setRotation(candidates[i]);
    if (display.width() > display.height()) {
      chosen = candidates[i];
      break;
    }
  }
  if (ROTATION_FLIP) {
    chosen = (chosen + 2) % 4;
    display.setRotation(chosen);
  }
  Serial.printf("Rotation = %d -> W=%d H=%d\n", chosen, display.width(), display.height());
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32-S3 Air Quality Monitor (v2.1) ===");

  SPI.begin(EPD_CLK, -1, EPD_MOSI, EPD_CS);

  display.init(115200, true, 2, false);
  chooseLandscapeRotation();

  u8f.begin(display);
  u8f.setFontMode(1);          
  u8f.setFontDirection(0);

  // 启动画面
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    drawCNCentered(display.width() / 2, 90, "空气质量监测站", false, u8g2_font_wqy16_t_gb2312);
    drawCNCentered(display.width() / 2, 130, "正在连接 WiFi...", false, u8g2_font_wqy14_t_gb2312);
  } while (display.nextPage());

  connectWiFi();

  if (fetchAqiData()) {
    drawUI();
  } else {
    drawError("Failed to fetch data");
  }

  display.powerOff();
}

// ==================== LOOP ====================
void loop() {
  delay(UPDATE_INTERVAL_MS);

  Serial.println("Refreshing data...");

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (fetchAqiData()) {
    display.init(115200, true, 2, false);
    chooseLandscapeRotation();
    drawUI();
    display.powerOff();
    Serial.println("Screen updated successfully.");
  } else {
    Serial.println("Data fetch failed, will retry next cycle.");
  }
}
```

### Code-Erklärung

Im ersten Schritt macht `connectWiFi()` eine Standard-WLAN-Verbindung: 40 Retry-Versuche (20 Sekunden). Bei Time-out blockiert sie nicht, sondern macht weiter – so bekommst du offline zumindest eine Fehlermeldung zu sehen statt eines schwarzen Bildschirms.

Im zweiten Schritt ruft `fetchAqiData()` über `HTTPClient` den Endpunkt `/feed/@Stations-ID/` von AQICN auf, parst das zurückkommende JSON mit dem `JsonDocument` von `ArduinoJson` und füllt Feld für Feld die `AqiData`-Struktur – inklusive der 12 aktuellen Kennzahlen und der Vorhersage-Arrays für PM2.5, PM10 und UV-Index der nächsten Tage.

Im dritten Schritt ist `drawUI()` das Herz der Zeichenroutine. Sie malt blockweise in der Reihenfolge „Titelleiste → großer AQI-Block → 12-Felder-Kennzahlenraster → Vorhersage-Balkendiagramm → untere Statusleiste". Die Koordinaten jedes Blocks sind feste Pixelwerte, sodass du das Layout leicht anpassen kannst.

Im vierten Schritt wird das Chinesische über die Brücke `U8g2_for_Adafruit_GFX` gezeichnet. Die `drawCN`-Funktionsfamilie kapselt einheitlich die beiden Modi „weiß auf schwarz" und „schwarz auf weiß", damit du nicht an jeder Stelle die Farben neu setzen musst.

Im fünften Schritt refreshed `loop()` alle 30 Minuten, initialisiert das Display neu, ruft `drawUI()` auf und schaltet danach sofort mit `powerOff()` den Strom ab. Genau das ist der Schlüssel für niedrigen Stromverbrauch und lange Display-Lebensdauer – wenn nicht refreshed wird, muss das Display gar nicht versorgt werden.

## Häufige Probleme und Fehlerbehebung

Keine Panik – 80 % aller Probleme kommen aus diesen wenigen Ecken:

**Das Display bleibt dauerhaft weiß oder zeigt Schnee:** Prüfe zuerst die Verkabelung, insbesondere die vier Steuerleitungen CS, DC, RES und BUSY – ob die Reihenfolge stimmt. Stelle danach sicher, dass die Treiberklasse `GxEPD2_420_GYE042A87` in `display.init()` exakt zum tatsächlichen Modell deines Displays passt; ein falscher Modellname bringt das Timing durcheinander.

**Chinesische Zeichen erscheinen als Kästchen oder Zeichensalat:** `U8g2_for_Adafruit_GFX` ist nicht richtig initialisiert. Prüfe, ob `u8f.begin(display)` nach `display.init()` aufgerufen wird, und ob der genutzte Font (z. B. `u8g2_font_wqy14_t_gb2312`) die Schriftzeichen enthält, die du anzeigen willst.

**WiFi verbindet sich nicht:** Die meisten ESP32-Boards unterstützen nur 2,4 GHz, kein 5 GHz. Prüfe außerdem, ob SSID oder Passwort Sonderzeichen enthalten, die zu Escape-Problemen führen.

**Die API liefert nur Nullen:** Meistens ist `API_TOKEN` nicht beantragt oder falsch geschrieben; möglich ist auch, dass die Stations-ID in `API_URL` (z. B. `@14370`) nicht stimmt. Öffne die URL zuerst direkt im Browser, um zu prüfen, ob sauberes JSON zurückkommt.

**Das Bild steht oben/unten:** Ändere im Code `ROTATION_FLIP` von 0 auf 1 und flashe neu – die Verkabelung bleibt, wie sie ist.

**Beim Kompilieren kommt „zu wenig Platz / region `app' overflowed":** Die chinesische Font-Sammlung ist zu groß für das Standard-Partitionsschema. Folge dem Abschnitt „Flash-Konfiguration: Partitionsschema" oben und stelle `Partition Scheme` auf `Huge APP (3MB No OTA/1MB SPIFFS)` – danach kompiliert es wieder.

## FAQ

**F: Statt eines ESP32-S3 ein „normaler" ESP32 – geht das auch?** A: Ja. Solange die Pins SPI unterstützen und keine board-spezifischen Spezialpins (z. B. Flash-Pins) belegt sind, tausche einfach die sechs `EPD_*`-Makros im Code gegen die von dir tatsächlich genutzten GPIO-Nummern aus – der Rest des Codes bleibt unverändert.

**F: Die Treiberklasse GxEPD2_420_GYE042A87 passt nicht zu meinem Display – was nun?** A: Schau im GitHub-Repository von GxEPD2 nach dem zur Display-Variante passenden Klassennamen und ersetze einfach die `display`-Definition – die restlichen Zeichenroutinen musst du in der Regel nicht anpassen.

**F: Warum dauert ein Refresh mehrere Sekunden – geht das schneller?** A: Ein Full Refresh eines Schwarz-Weiß-E-Paper-Displays ist von Natur aus langsam – das ist eine Hardware-Eigenschaft, kein Code-Problem. Wenn du nur einzelne Werte aktualisieren willst, kannst du dich an der Partial-Update-Schnittstelle von GxEPD2 versuchen, riskierst aber Geisterbilder.

**F: Reicht das kostenlose Kontingent der AQICN-API aus?** A: Das persönliche AQICN-Token erlaubt üblicherweise 1000 Anfragen pro Minute – bei einem Update alle 30 Minuten in diesem Projekt also absolut kein Problem.

**F: Wie hoch ist der Stromverbrauch des ESP32-S3, wenn er gerade nicht refreshed?** A: Im Code ist kein Deep Sleep eingebaut; `loop()` hängt in `delay()`. Typischer Messwert liegt im Bereich einigerzig Milliampere. Für eine batteriebetriebene Version empfiehlt es sich, `delay(UPDATE_INTERVAL_MS)` durch `esp_deep_sleep` zu ersetzen – dann sinkt der Verbrauch auf Mikroampere.

**F: Das Display refreshed nicht, aber im Seriellen Monitor steht „Datenabruf erfolgreich" – was tun?** A: Prüfe, ob die `display.firstPage()/nextPage()`-Schleife in `drawUI()` zwischendurch mit einem `return` abgebrochen wird. GxEPD2 verlangt, dass diese Schleife vollständig einmal durchläuft, bevor das Bild tatsächlich zum Display geschoben wird.

## Weiterführende Ideen

- Aus einer SD-Karte eine lokale Stadtliste einlesen und ein mehrstufiges Karussell-Dashboard bauen
- Einen Taster anschließen: kurzer Druck = manuelles Refresh, langer Druck = Deep-Sleep-Stromsparmodus
- Das 30-Minuten-Intervall durch einen Umgebungslichtsensor ersetzen – bei Dunkelheit refresht das Display automatisch seltener

## Referenzen

- [GxEPD2 – GitHub-Repository](https://github.com/ZinggJM/GxEPD2)
- [ArduinoJson – offizielle Dokumentation](https://arduinojson.org/)
- [U8g2_for_Adafruit_GFX – GitHub-Repository](https://github.com/olikraus/U8g2_for_Adafruit_GFX)
- [AQICN – Luftqualitäts-API-Dokumentation](https://aqicn.org/api/)
- [Espressif – ESP32-S3-Produktseite](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
