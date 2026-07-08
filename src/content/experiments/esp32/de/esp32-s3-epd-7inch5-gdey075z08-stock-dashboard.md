---
title: "ESP32-S3 + 7,5\" dreifarbige E-Paper-Aktienanzeige: Live Tencent (00700) Ticker, der bei Börsenschluss automatisch Strom spart (GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-7inch5-gdey075z08
category: esp32
date: 2026-07-06
intro: "Mit ESP32-S3 + GxEPD2 ein 7,5\" dreifarbiges E-Paper-Display (GDEY075Z08) ansteuern, die Tencent-Finance-API abfragen und eine Live-Aktienanzeige für Tencent Holdings (00700) darstellen. Nach Börsenschluss in Hongkong wird das Refresh-Intervall automatisch verlängert, um Strom zu sparen. inkl. kompletter Verdrahtung, Brownout/Unterspannung-Troubleshooting, handgebauter chinesischer Bitmap-Schrift und Arduino C++-Code."
image: "https://img.lingflux.com/2026/07/683e33cff80c152435263c8e4e6c546d.jpg"
---

> **In einem Satz:** Mit einem ESP32-S3 und einem 7,5\" dreifarbigen E-Paper-Display (GDEY075Z08) baust du dir einen Tencent-Holdings-Aktienticker, der nach Börsenschluss automatisch \"schlafen geht\" – mit der HK-Konvention ROT = aufwärts/SCHWARZ = abwärts, damit du auf einen Blick siehst, ob du dich freuen oder im Park übernachten darfst.

Schwierigkeit: ⭐⭐⭐☆☆ (ein kleines bisschen Schaltkreis-Erfahrung hilft; wenn du Arduino flashen kannst, kommst du hier mit)
Zeitaufwand: 1–2 Stunden (ohne die Zeit, in der du fasziniert auf das Display starrst und auf das nächste Refresh wartest)
Testumgebung:
Arduino IDE 2.3.8 +
ESP32 Arduino Core 3.3.10 ＋
GxEPD2 v1.6.9 +
Adafruit GFX Library v1.12.6
(Bei der Bibliotheks-Installation am besten diese Versionen nehmen – zu neu oder zu alt kann schnell zu Fallstricken führen.)

> Da diese Demo die kostenlose API von Tencent Finance nutzt, verwende ich hier die Aktie von Tencent Holdings als Beispiel – das hat keine weitere Bedeutung. Dieser Artikel ist KEINE Anlageberatung. Investitionen bergen Risiko, bitte vorsichtig und überlegt handeln.

> **TL;DR (Schnellstart):**
>
> 1. Verdrahtung: EPD SDI→GPIO11, SCL→GPIO12, CS→GPIO10, DC→GPIO9, RES→GPIO8, BUSY→GPIO7, VCC an 3,3V, GND gemeinsam mit Masse verbinden
> 2. Bibliotheken installieren: GxEPD2, Adafruit GFX Library (WiFi und HTTPClient sind beim ESP32-Core bereits dabei, keine separate Installation nötig)
> 3. Im Code `ssid` und `password` auf dein eigenes WiFi setzen
> 4. Flashen, auf das erste Preis-Refresh warten, fertig

---

## Vorwort

Ich habe eine ziemlich dumme Angewohnheit: Ohne Grund krame ich ständig mein Handy heraus, um meine Watchlist zu checken – und danach stelle ich fest, dass sich überhaupt nichts getan hat. Purer Verschleiß für die Nerven. Irgendwann dachte ich mir: Anstatt eine Handy-App meine Dopamin-Ausschüttungen durcheinanderzubringen, baue ich mir lieber ein „dediziertes Dashboard" – es macht nur eine einzige Sache: Es pinnt leise den Aktienkurs auf meinen Schreibtisch. Keine Pop-ups, keine Push-Benachrichtigungen. Ein kurzer Blick reicht, und ich weiß, ob ein guter Tag zum Freuen oder ein Tag im Park ansteht.

Dieses Tutorial dokumentiert, wie ich mit einem ESP32 und einem 7,5\" E-Paper-Display einen automatisch aktualisierenden Aktien-Ticker für Tencent Holdings (00700) gebaut habe – und nebenbei zwei große Stolpersteine aus dem Weg geräumt habe: „unvollständiger chinesischer Zeichensatz" und „bitte nach Börsenschluss nicht sinnlos refreshen". Danach kannst du entweder exakt dasselbe nachbauen oder das Ganze auf jede beliebige Aktie anpassen, die dich interessiert.

> Da diese Demo die kostenlose API von Tencent Finance nutzt, verwende ich hier die Aktie von Tencent Holdings als Beispiel – das hat keine weitere Bedeutung. Dieser Artikel ist KEINE Anlageberatung. Investitionen bergen Risiko, bitte vorsichtig und überlegt handeln.

## So sieht das Ergebnis aus

Das Endergebnis: Ein schwarz-weiß-rotes E-Paper-Display auf dem Schreibtisch, das leise den Aktienkurs, die Veränderung, das Tages-Hoch/Tief und das Handelsvolumen anzeigt. Mit der HK-Konvention ROT = aufwärts/SCHWARZ = abwärts erkennst du die Stimmungslage auf einen Blick. Nach Börsenschluss, in der Mittagspause und am Wochenende „stellt es sich tot" und aktualisiert seltener; sobald der Handel wieder losgeht, kehrt es zum normalen Rhythmus zurück. So wird das Display nicht mitten in der Nacht heimlich aktiv und erschreckt dich selbst.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/y-SnIM3DxUE?si=Z7g5KeeUtolxDj1T" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

> Da diese Demo die kostenlose API von Tencent Finance nutzt, verwende ich hier die Aktie von Tencent Holdings als Beispiel – das hat keine weitere Bedeutung. Dieser Artikel ist KEINE Anlageberatung. Investitionen bergen Risiko, bitte vorsichtig und überlegt handeln.
>
> Wichtige Dinge sagt man dreimal!!!

## Komponenten-Übersicht

**7,5\" dreifarbiges E-Paper-Display:** Stell dir vor, das sei „die vergrößerte Ausgabe eines elektronischen Preisschilds im Supermarkt" – ein kurzer Stromstoß „friert" das Bild auf einer papierähnlichen Schicht ein. Selbst nach dem Ausschalten bleibt die Darstellung erhalten; erst beim nächsten Refresh wird wieder Strom verbraucht. Gegenüber der üblichen Schwarz-Weiß-Variante bietet die dreifarbige Version zusätzlich ein Rot – perfekt, um „Steigung" anzuzeigen, was wunderbar zum Aktien-Szenario passt. In diesem Projekt verwenden ich das Modell `GDEY075Z08` mit einer Auflösung von 800×480. Ich habe es ausgewählt, weil die Auflösung groß genug ist, um Preis, Veränderung und vier weitere Kennzahlen gleichzeitig auf einem Bild darzustellen, ohne hin- und herblättern zu müssen.

**E-Paper-Treiberplatine:** Die Pin-Belegung entspricht den auf dem Markt erhältlichen Varianten. Diese Platine habe ich selbst mit SMD-Bestückung gebastelt, das Design ist also noch nicht ganz ausgereift: Das 7,5\"-Display läuft darauf einwandfrei, bei 4,2\" und 1,54\" E-Paper-Displays gibt es noch ein paar Probleme, die später behoben werden. Hier der Schaltplan:

![](https://img.lingflux.com/2026/07/7466106c7707c8ef928c57a102df38cb.png)

**ESP32-Entwicklerboard:** Übernimmt die Netzwerkverbindung, das Abrufen der Daten, die Berechnung der Refresh-Zeiten und die Ansteuerung des Displays – das Gehirn des gesamten Projekts. Welches Board du nimmst, bleibt dir überlassen, solange genug GPIOs zur Verfügung stehen (die in diesem Tutorial genannten Pin-Nummern gelten für die gängigen ESP32-S3-Entwicklerboards; bei einem älteren ESP32 musst du die Pin-Nummern einfach durch die bei deinem Board tatsächlich verfügbaren ersetzen).

## Stückliste (BOM)

| Bauteil | Typ/Spezifikation | Menge |
| --- | --- | --- |
| ESP32-Entwicklerboard | ESP32-S3 oder eine andere ESP32-Variante mit SPI-Pins | 1 |
| E-Paper-Treiberplatine | Selbst gebaut, die Pins entsprechen aber den meisten E-Paper-Treibern auf dem Markt. | 1 |
| 7,5\" E-Paper-Display | GDEY075Z08, 7,5\", 800×480, Schwarz/Weiß/Rot dreifarbig | 1 |
| Dupont-Steckkabel | Stecker zu Buchse | mehrere |

## Pin-Belegung der 7,5\" E-Paper-Treiberplatine

Selbst gezeichneter Schaltplan, eine Platine als PCB gefräst/geätzt und von Hand bestückt – die verwendeten Pins sind dieselben wie bei den meisten E-Paper-Treiberplatinen auf dem Markt.

| Pin | Vollständiger Name | Funktion |
| --- | --- | --- |
| **VCC** | Versorgungsspannung, Pluspol (Voltage Common Collector) | Eingang für die Versorgungsspannung, verbunden mit dem **3V3**-Ausgang (3,3V) des ESP32-S3. |
| **GND** | Masse (Ground) | Bezugsmasse, verbunden mit **GND** des ESP32-S3, schließt den Stromkreis. |
| **SDI/MOSI** | Master Out, Slave In | SPI-Datenleitung, über die der ESP32 Daten an das Display sendet |
| **SCL/SCK** | Serial Clock | SPI-Taktleitung, bestimmt den Takt der Datenübertragung |
| **CS** | Chip Select | Sagt dem Display: „Die nächsten Daten gelten dir." |
| **DC** | Data/Command Umschaltung | Unterscheidet, ob gerade Bilddaten oder ein Steuerkommando übertragen werden |
| **RES/RST** | Reset | Einmal auf Low ziehen, damit sich das Display neu initialisiert |
| **BUSY** | Busy-Status | Während das Display refreshed, liegt dieser Pin auf Low; darüber erkennt der ESP32, ob schon das nächste Kommando geschickt werden darf |

## Verdrahtung

| E-Paper-Pin | verbunden mit ESP32-Pin |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

Empfehlung: Nach dem Aufbau alle Leitungen noch einmal durchgehen, bevor du Spannung anlegst. Besonders die BUSY-Leitung – falls sie falsch gesteckt ist oder kalte Lötstellen hat, kostet das später beim Troubleshooting massiv Zeit. Allein hier aufzupassen, erspart dir etwa 80 % der Fehlersuche. Der Code enthält deshalb eine Startdiagnose, die genau diese Fehlerquelle abfängt – dazu später mehr im Code-Abschnitt.

## Versorgungsstabilität: ESP32 Brownout-Neustart beheben (BOD-Fehlermeldung)

Da diesmal mein selbst gebautes Entwicklerboard zum Einsatz kam, ist die Stromversorgung vermutlich nicht ganz optimal. Beim Testen bin ich über die Meldung `E BOD: Brownout detector was triggered` gestolpert. Das bedeutet: **Der Brownout-Detektor des ESP32 hat ausgelöst** – das Board hat festgestellt, dass die Versorgungsspannung unter einen sicheren Schwellenwert gesackt ist, und sich vorsichtshalber neu gestartet.

### Warum löst der BOD überhaupt aus?

Sobald der ESP32 das WiFi-Modul hochfährt, erzeugt die Funkstrecke kurzfristig einen Strombedarf von **mehreren hundert Milliampere**. Wenn die Zuleitung zu dünn ist, Dupont-Kabel einen hohen Übergangswiderstand haben oder die USB-Stromversorgung zu schwach ausfällt, bricht die Spannung schlagartig ein – der ESP32 startet von selbst neu. Auch das Refreshen des E-Paper-Displays ist ein Stromfresser; wenn es gleichzeitig mit dem WiFi um Strom konkurriert, kippt die Versorgung noch leichter.

Parallelschalten eines **Elektrolytkondensators** (Energiespeicher) und eines Keramikkondensators (Filter) ist die Standardmaßnahme, um dieses Problem in den Griff zu bekommen. Mit der unten gezeigten Kombination lief mein Aufbau deutlich stabiler – seitdem hatte ich keinen BOD-Neustart mehr.

### 1. Kondensator-Empfehlung

Am besten verwendest du beide Kondensatoren parallel – diese Kombination wirkt am besten:

* **Elektrolytkondensator (großer Puffer):** `470μF` oder `1000μF` (Spannungsfestigkeit `6,3V`, `10V` oder `16V` sind alle in Ordnung). Hält den Kurzzeit-Strombedarf beim WiFi-Hochfahren ab.
* **Keramikkondensator / Vielschichtkondensator (kleiner Filter):** `0,1μF` (Aufdruck `104`). Filtert hochfrequente Störungen heraus.

### 2. Konkrete Platzierung

**Die wichtigste Regel: Die Kondensatoren müssen so nah wie möglich an den Pins des ESP32-Entwicklerboards sitzen.** Da meist Dupont-Kabel zum Einsatz kommen, kannst du die Kondensatoren direkt ins Steckbrett stecken oder in der Nähe des ESP32 an die Versorgungsleitung löten/verdrillen.

#### Schematische Zeichnung der Beschaltung

```text
    [ Externe Stromversorgung / USB ]
          │   │
          ▼   ▼
       ┌─────────┐
       │  5V/3V3 │──────┬───────────────┬──────► [ VCC/3V3 Pin des ESP32 ]
       │         │      │               │
       │         │    + │ Polarität      │
       │         │   ┌──┴──┐         ┌──┴──┐
       │         │   │     │         │     │
       │         │   │470uF│         │0.1uF│
       │         │   │     │         │     │
       │         │   └──┬──┘         └──┬──┘
       │         │      │ - Minus        │
       │   GND   │──────┴───────────────┴──────► [ GND-Pin des ESP32 ]
       └─────────┘
```

#### Zugehörige Pin-Verbindungen

* **Pluspol (+, langes Bein) des Elektrolytkondensators** ───► an **`3V3`** des ESP32 (alternativ `5V/VIN`, je nachdem, welchen Pin du als Einspeisung nutzt)
* **Minuspol (−, kurzes Bein, auf der Seite mit dem grauen Streifen) des Elektrolytkondensators** ───► an **`GND`** des ESP32
* **0,1μF Keramikkondensator (ohne Polarität)** ───► ebenfalls parallel zwischen **`3V3`** und **`GND`** schalten.

> ⚠️ Elektrolytkondensatoren sind polaritätsempfindlich. Bei falscher Polung werden sie heiß oder können sogar platzen. Prüfe vor dem Anschließen unbedingt: „langes Bein = Plus, Seite mit grauem Streifen = Minus".

### 3. Weitere Tipps zur Fehlersuche (falls es trotz Kondensatoren immer noch Neustarts gibt)

1. **Hochwertiges USB-Kabel verwenden:** Viele billige Dupont-Adapterkabel oder dünne USB-Kabel haben einen sehr hohen Innenwiderstand. Ein etwas dickeres Ladekabel fürs Handy wirkt hier oft Wunder.
2. **Anderen USB-Anschluss nehmen:** Steck nicht an einen Front-USB-Anschluss des PCs (der liefert nur schwachen Strom), sondern möglichst an einen USB-Port auf der Rückseite am Mainboard – oder direkt ein 5V/2A-Netzteil verwenden.
3. **Softwareseitig Stromspitzen vermeiden:** Achte im Code darauf, dass das Refresh des E-Paper-Displays (ebenfalls ein großer Stromverbraucher) **nicht** gleichzeitig mit `WiFi.begin()` passiert. Zuerst per WiFi die Daten abholen, danach das WiFi trennen oder in den Sleep-Modus schicken und erst dann das Display refreshen. Der Code in diesem Tutorial setzt zusätzlich `WiFi.setTxPower(WIFI_POWER_17dBm)` ein, um die Sendeleistung zu reduzieren – eine zusätzliche Software-Sicherungsmaßnahme.

## Zu installierende Bibliotheken

Im Bibliotheksverwalter der Arduino IDE suchen und installieren:

- `GxEPD2` (von ZinggJM) – getestete Version v1.6.9
- `Adafruit GFX Library` – getestete Version v1.12.6

`WiFi.h` und `HTTPClient.h` sind bereits Teil des ESP32 Arduino Core und müssen nicht separat installiert werden. Stelle aber sicher, dass im Boardverwalter die ESP32-Core-Version aus der 3.0.x-Reihe ist – zu alte Core-Versionen könnten API-Teile vermissen lassen.

## Vollständiger Code + Erklärung

```cpp
// ============================================================
//  ESP32 + 电子墨水屏「腾讯控股」股票看板
//  - 每隔几分钟抓一次腾讯财经接口，把股价刷到 7.5 寸三色墨水屏上
//  - 港股收盘 / 周末会自动拉长等待，到下一个交易日再恢复刷新
//  - 演示版：用 delay() 等待、WiFi 常驻，不使用深度睡眠（适合 USB 供电）
// ============================================================
#include <GxEPD2_3C.h>
#include <Adafruit_GFX.h>
#include <SPI.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ==================== 配置区域 ====================
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// 腾讯财经接口（这里以腾讯控股 hk00700 为例，换股票改这个地址即可）
const String api_url = "http://qt.gtimg.cn/q=hk00700";
// ==================================================

// 1. 墨水屏与 ESP32 的接线引脚（按你的实际接线改这里的数字）
#define EPD_MOSI 11  // SDI / MOSI
#define EPD_CLK  12  // SCL / SCK
#define EPD_CS   10  // CS
#define EPD_DC   9   // DC
#define EPD_RST  8   // RES / RESET
#define EPD_BUSY 7   // BUSY

// 2. 构造驱动实例 (GDEY075Z08 800x480)
GxEPD2_3C<GxEPD2_750c_GDEY075Z08, GxEPD2_750c_GDEY075Z08::HEIGHT / 2> display(GxEPD2_750c_GDEY075Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// 股票数据结构体
struct StockData {
  String name;       // 股票名称
  String code;       // 股票代码
  String price;      // 当前价格
  String change;     // 涨跌额
  String changePct;  // 涨跌幅 (%)
  String high;       // 今日最高
  String low;        // 今日最低
  String volume;     // 成交额 (亿)
  String yestClose;  // 昨收
  String time;       // 更新时间
  bool isUp;         // 是否上涨
};

StockData stock;

float  lastPriceF    = -1.0f;
String lastStockTime = "";

// ==================== 本地中文字库（自动生成，无需修改） ====================
struct ZhGlyph { uint16_t cp; const uint8_t* bmp; };

const uint8_t ZH24_W = 24;
const uint8_t ZH24_H = 24;
const uint8_t zh24_817E[72] PROGMEM = {0,0,0,0,192,0,248,201,24,248,217,12,152,217,4,152,253,31,152,65,0,152,65,0,248,255,63,152,49,6,152,17,12,152,249,63,152,15,50,248,7,34,136,49,2,136,17,3,140,241,31,140,1,24,140,254,27,230,0,24,100,0,30,0,0,14,0,0,0,0,0,0};
const uint8_t zh24_8BAF[72] PROGMEM = {0,0,0,16,0,0,24,255,7,56,255,7,48,24,6,0,24,6,0,24,6,62,24,6,62,24,6,48,24,6,48,255,6,48,255,6,48,24,6,48,24,6,48,24,6,48,24,6,176,24,6,240,25,108,240,24,108,120,24,124,56,24,56,16,24,0,0,0,0,0,0,0};
const uint8_t zh24_63A7[72] PROGMEM = {0,0,0,112,192,0,48,192,1,32,254,63,32,254,63,252,7,48,252,103,54,32,48,2,32,48,6,32,24,62,224,13,62,224,1,0,120,0,0,60,252,31,44,252,31,32,128,0,32,128,0,32,128,0,32,128,0,48,255,127,60,255,127,56,0,0,24,0,0,0,0,0};
const uint8_t zh24_80A1[72] PROGMEM = {0,0,0,248,227,15,248,227,15,24,99,12,24,99,12,24,35,12,248,51,12,248,59,124,24,3,0,24,3,0,24,251,31,24,251,31,248,51,12,248,35,12,24,99,4,12,99,6,12,195,3,12,131,3,12,195,7,206,115,126,198,61,56,4,8,32,0,0,0,0,0,0};
const ZhGlyph ZH_GLYPHS_24[] PROGMEM = {
  {0x817E, zh24_817E}, {0x8BAF, zh24_8BAF}, {0x63A7, zh24_63A7}, {0x80A1, zh24_80A1},
};
const uint8_t ZH24_COUNT = 4;

const uint8_t ZH16_W = 16;
const uint8_t ZH16_H = 16;
const uint8_t zh16_4ECA[32] PROGMEM = {128,1,128,1,64,2,96,6,48,28,152,121,142,97,0,0,248,31,0,12,0,12,0,6,0,7,0,3,0,1,0,0};
const uint8_t zh16_65E5[32] PROGMEM = {0,0,248,31,24,24,24,24,24,24,24,24,24,24,248,31,24,24,24,24,24,24,24,24,248,31,24,24,0,0,0,0};
const uint8_t zh16_6700[32] PROGMEM = {0,0,248,31,24,16,248,31,248,31,0,0,254,127,136,0,248,63,136,50,248,18,136,28,252,12,132,126,128,35,0,0};
const uint8_t zh16_9AD8[32] PROGMEM = {128,1,128,1,254,127,0,0,240,15,16,8,240,15,0,0,252,63,4,32,228,39,36,36,228,39,4,48,4,24,0,0};
const uint8_t zh16_4F4E[32] PROGMEM = {16,0,24,60,200,15,200,4,204,4,204,4,206,127,202,12,200,8,200,11,200,9,72,16,8,112,232,111,8,0,0,0};
const uint8_t zh16_6628[32] PROGMEM = {0,2,0,3,62,1,38,127,166,3,230,2,126,2,38,62,38,2,38,2,62,62,6,2,0,2,0,2,0,2,0,0};
const uint8_t zh16_6536[32] PROGMEM = {0,0,32,2,32,2,36,3,36,127,36,17,164,17,164,16,164,19,36,26,60,10,62,14,32,14,32,59,160,113,32,0};
const uint8_t zh16_76D8[32] PROGMEM = {0,0,192,0,240,31,16,24,144,25,16,25,254,127,16,24,152,25,8,12,248,31,72,18,72,18,72,18,254,127,0,0};
const uint8_t zh16_6210[32] PROGMEM = {0,0,0,3,0,27,0,3,252,63,12,2,12,18,252,18,204,26,76,14,76,12,68,12,36,14,6,91,128,112,0,0};
const uint8_t zh16_4EA4[32] PROGMEM = {128,1,128,1,0,0,252,127,32,4,112,28,24,48,12,36,100,6,64,6,192,3,128,1,224,7,60,124,12,48,0,0};
const uint8_t zh16_91D1[32] PROGMEM = {0,0,128,0,192,1,96,2,48,12,24,56,246,111,128,1,128,1,252,31,128,1,144,9,144,9,128,5,252,63,0,0};
const uint8_t zh16_989D[32] PROGMEM = {16,0,16,127,254,8,138,12,8,63,124,35,38,43,48,43,204,43,126,43,68,8,68,28,124,54,68,99,0,1,0,0};
const uint8_t zh16_4EBF[32] PROGMEM = {48,0,48,0,208,63,24,24,8,12,12,4,14,6,10,2,8,3,136,1,136,0,200,64,200,96,136,127,8,0,0,0};
const ZhGlyph ZH_GLYPHS_16[] PROGMEM = {
  {0x4ECA, zh16_4ECA}, {0x65E5, zh16_65E5}, {0x6700, zh16_6700}, {0x9AD8, zh16_9AD8},
  {0x4F4E, zh16_4F4E}, {0x6628, zh16_6628}, {0x6536, zh16_6536}, {0x76D8, zh16_76D8},
  {0x6210, zh16_6210}, {0x4EA4, zh16_4EA4}, {0x91D1, zh16_91D1}, {0x989D, zh16_989D},
  {0x4EBF, zh16_4EBF},
};
const uint8_t ZH16_COUNT = 13;

void drawZh(int16_t x, int16_t y, const String &text, uint16_t color, uint8_t size = 24) {
  const ZhGlyph* table; uint8_t count, cw, ch;
  if (size == 16) { table = ZH_GLYPHS_16; count = ZH16_COUNT; cw = ZH16_W; ch = ZH16_H; }
  else            { table = ZH_GLYPHS_24; count = ZH24_COUNT; cw = ZH24_W; ch = ZH24_H; }
  int16_t cx = x;
  int i = 0;
  int n = text.length();
  while (i < n) {
    uint16_t cp = 0;
    int adv = 1;
    uint8_t c = (uint8_t)text[i];
    if (c < 0x80) { cp = c; adv = 1; }
    else if ((c & 0xE0) == 0xC0 && i + 1 < n) { cp = ((c & 0x1F) << 6) | ((uint8_t)text[i + 1] & 0x3F); adv = 2; }
    else if ((c & 0xF0) == 0xE0 && i + 2 < n) { cp = ((c & 0x0F) << 12) | (((uint8_t)text[i + 1] & 0x3F) << 6) | ((uint8_t)text[i + 2] & 0x3F); adv = 3; }
    const uint8_t* bmp = nullptr;
    for (int k = 0; k < count; k++) {
      if (table[k].cp == cp) { bmp = table[k].bmp; break; }
    }
    if (bmp) display.drawXBitmap(cx, y, bmp, cw, ch, color);
    cx += cw;
    i += adv;
  }
}

long daysFromCivil(int y, int m, int d) {
  y -= m <= 2;
  const long era = (y >= 0 ? y : y - 399) / 400;
  const long yoe = y - era * 400;
  const long doy = (153L * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const long doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097L + doe - 719468L;
}

int weekdayOfEpochDay(long day) {
  return (int)(((day % 7) + 7 + 4) % 7);
}

void parseStockTime(const String &t, int &y, int &mo, int &d, int &h, int &mi, int &s) {
  y  = t.substring(0, 4).toInt();
  mo = t.substring(5, 7).toInt();
  d  = t.substring(8, 10).toInt();
  h  = t.substring(11, 13).toInt();
  mi = t.substring(14, 16).toInt();
  s  = t.substring(17, 19).toInt();
}

unsigned long computeSleepSeconds(int y, int mo, int d, int h, int mi, int s) {
  const long OPEN_AM = 570, CLOSE_AM = 720;
  const long OPEN_PM = 780, CLOSE_PM = 960;
  long today = daysFromCivil(y, mo, d);
  long mod   = h * 60L + mi;
  long nowEp = today * 1440L + mod;
  long wakeEp = -1;

  int wd = weekdayOfEpochDay(today);
  bool isWeekday = (wd >= 1 && wd <= 5);
  if (isWeekday) {
    if      (mod <  OPEN_AM)  wakeEp = today * 1440L + OPEN_AM;
    else if (mod <  CLOSE_AM) wakeEp = ((nowEp / 10) + 1) * 10;
    else if (mod <  OPEN_PM)  wakeEp = today * 1440L + OPEN_PM;
    else if (mod <  CLOSE_PM) wakeEp = ((nowEp / 10) + 1) * 10;
  }
  if (wakeEp < 0) {
    for (int k = 1; k <= 7; k++) {
      long day = today + k;
      if (weekdayOfEpochDay(day) >= 1 && weekdayOfEpochDay(day) <= 5) {
        wakeEp = day * 1440L + OPEN_AM;
        break;
      }
    }
  }
  if (wakeEp < 0) wakeEp = nowEp + 600;

  long sleepSec = (wakeEp - nowEp) * 60L - s;
  if (sleepSec < 60)   sleepSec = 60;
  if (sleepSec > 3600) sleepSec = 3600;
  return (unsigned long)sleepSec;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // 第一步：诊断 BUSY 引脚。GDEY075Z08 空闲时 BUSY=高(1)，忙时=低(0)。
  //         若读到 0，通常是接错脚/虚焊/短路到地，或面板供电不足卡在忙状态，
  //         这正是刷新总卡满 30s 超时的根因。
  pinMode(EPD_BUSY, INPUT_PULLUP);
  delay(1);
  Serial.printf("[BUSY diag] GPIO%d idle=%d (期望 1)\n", EPD_BUSY, digitalRead(EPD_BUSY));

  SPI.begin(EPD_CLK, -1, EPD_MOSI, -1);

  // 第二步：画开机页
  Serial.println(">>> Boot: drawing boot screen...");
  display.init(115200);
  display.setRotation(0);
  drawBootPage("Connecting Network...");
  display.powerOff();
  delay(1000);

  // 第三步：连接 WiFi（常驻，不再每轮重连）
  Serial.println(">>> Connecting WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_17dBm); // 降低发射功率，缓解连网瞬间的电流尖峰导致的欠压重启
  WiFi.begin(ssid, password);
  int timeout_count = 0;
  while (WiFi.status() != WL_CONNECTED && timeout_count < 30) {
    delay(500);
    Serial.print(".");
    timeout_count++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
  } else {
    Serial.println("\nWiFi Failed, will keep retrying in loop.");
  }
  delay(2000);
}

void fetchAndDraw() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(">>> WiFi dropped, reconnecting...");
    WiFi.reconnect();
    delay(3000);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(">>> Fetching stock data...");
    fetchStockData();
  } else {
    stock.name = "腾讯控股"; stock.code = "00700"; stock.price = "431.20";
    stock.change = "+1.00"; stock.changePct = "+0.23%"; stock.high = "445.80";
    stock.low = "431.20"; stock.volume = "108.97"; stock.yestClose = "430.20";
    stock.time = "2026/07/03 16:08:18"; stock.isUp = true;
  }

  float priceF = stock.price.toFloat();
  if (priceF != lastPriceF) {
    display.init(115200);
    display.setRotation(0);
    drawStockDashboard();
    display.powerOff();
    lastPriceF = priceF;
    Serial.println(">>> Screen refreshed.");
  } else {
    Serial.println(">>> Price unchanged, skip redraw.");
  }
}

void loop() {
  fetchAndDraw();

  unsigned long waitSec;
  if (stock.time == lastStockTime) {
    waitSec = 3600;
    Serial.println(">>> Timestamp frozen (market closed), wait 1h.");
  } else {
    int y, mo, d, h, mi, s;
    parseStockTime(stock.time, y, mo, d, h, mi, s);
    waitSec = computeSleepSeconds(y, mo, d, h, mi, s);
    Serial.printf(">>> Next refresh in %lu s (now %04d/%02d/%02d %02d:%02d:%02d)\n",
                  waitSec, y, mo, d, h, mi, s);
  }
  lastStockTime = stock.time;

  delay(waitSec * 1000UL);
}

void drawBootPage(const char* statusText) {
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    const char* title = "STOCK MONITOR";
    int titleW = strlen(title) * 18;
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(3);
    display.setCursor((800 - titleW) / 2, 200);
    display.print(title);
    display.fillRect((800 - titleW) / 2, 244, titleW, 2, GxEPD_RED);
    display.setTextColor(GxEPD_RED);
    display.setTextSize(2);
    int sw = strlen(statusText) * 12;
    display.setCursor((800 - sw) / 2, 276);
    display.print(statusText);
  } while (display.nextPage());
}

void drawStockDashboard() {
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    uint16_t themeColor = stock.isUp ? GxEPD_RED : GxEPD_BLACK;

    display.fillRect(48, 48, 6, 40, GxEPD_RED);
    drawZh(64, 56, stock.name, GxEPD_BLACK);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(2);
    display.setCursor(172, 60);
    display.print("(" + stock.code + ")");
    String tm = stock.time.substring(5, 16);
    display.setCursor(752 - (int)(tm.length() * 12), 60);
    display.print(tm);

    display.drawFastHLine(48, 104, 704, GxEPD_BLACK);

    display.setTextColor(themeColor);
    display.setTextSize(8);
    display.setCursor(48, 130);
    display.print(stock.price);

    if (stock.isUp) {
      display.fillTriangle(58, 222, 48, 240, 68, 240, themeColor);
    } else {
      display.fillTriangle(48, 222, 68, 222, 58, 240, themeColor);
    }
    display.setTextColor(themeColor);
    display.setTextSize(4);
    display.setCursor(78, 222);
    display.print(stock.changePct);

    float chgMag = stock.change.toFloat();
    if (chgMag < 0) chgMag = -chgMag;
    String changeStr = String(stock.isUp ? "+" : "-") + String(chgMag, 2);
    display.setTextSize(2);
    display.setCursor(234, 230);
    display.print(changeStr);

    display.drawFastHLine(48, 296, 704, GxEPD_BLACK);
    display.drawFastVLine(224, 308, 76, GxEPD_BLACK);
    display.drawFastVLine(400, 308, 76, GxEPD_BLACK);
    display.drawFastVLine(576, 308, 76, GxEPD_BLACK);

    drawZh(48,  318, "今日最高", GxEPD_BLACK, 16);
    drawZh(236, 318, "今日最低", GxEPD_BLACK, 16);
    drawZh(412, 318, "昨日收盘", GxEPD_BLACK, 16);
    drawZh(588, 318, "成交金额", GxEPD_BLACK, 16);

    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(3);
    display.setCursor(48,  354); display.print(stock.high);
    display.setCursor(236, 354); display.print(stock.low);
    display.setCursor(412, 354); display.print(stock.yestClose);
    display.setCursor(588, 354); display.print(stock.volume);
    drawZh(588 + stock.volume.length() * 18 + 4, 362, "亿", GxEPD_BLACK, 16);

    display.drawFastHLine(48, 432, 704, GxEPD_BLACK);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(1);
    display.setCursor(48, 446);
    display.print("TENCENT HOLDINGS");
    String dateStr = stock.time.substring(0, 10);
    display.setCursor(752 - (int)(dateStr.length() * 6), 446);
    display.print(dateStr);

  } while (display.nextPage());
}

void fetchStockData() {
  HTTPClient http;
  http.begin(api_url);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Raw Data received.");

    int tokens[40];
    int tokenCount = 0;

    int pos = 0;
    while ((pos = payload.indexOf('~', pos)) != -1 && tokenCount < 40) {
      tokens[tokenCount++] = pos;
      pos++;
    }

    if (tokenCount > 35) {
      auto getField = [&](int index) {
        return payload.substring(tokens[index-1] + 1, tokens[index]);
      };

      stock.name      = "腾讯控股";
      stock.code      = getField(2);
      stock.price     = getField(3);
      stock.yestClose = getField(4);
      stock.high      = getField(33);
      stock.low       = getField(34);
      stock.time      = getField(30);
      stock.change    = getField(31);
      stock.changePct = getField(32);

      stock.price = String(stock.price.toFloat(), 2);
      stock.high = String(stock.high.toFloat(), 2);
      stock.low = String(stock.low.toFloat(), 2);
      stock.yestClose = String(stock.yestClose.toFloat(), 2);

      double volBytes = getField(37).toFloat();
      stock.volume = String((volBytes / 100000000.0), 2);

      float chg = stock.change.toFloat();
      if (chg >= 0) {
        stock.isUp = true;
        stock.changePct = "+" + String(stock.changePct.toFloat(), 2) + "%";
      } else {
        stock.isUp = false;
        stock.changePct = String(stock.changePct.toFloat(), 2) + "%";
      }
    }
  } else {
    Serial.printf("HTTP GET Failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
```

### Code-Erklärung

**Schritt 1 – Der Zeichensatz ist „handgebaut":** Vollständige chinesische Zeichensatz-Dateien bringen locker mehrere zehn bis hundert KB mit und enthalten trotzdem nicht zuverlässig die vier Zeichen „腾讯控股". Daher werden nur die wenigen chinesischen Zeichen, die im Projekt tatsächlich vorkommen, vorab als Bitmap-Arrays in den Code eingebettet. Das ist kompakt und garantiert, dass nie ein Kästchen statt eines Zeichens erscheint.

**Schritt 2 – Handelszeiten werden berechnet, nicht nachgeschlagen:** `computeSleepSeconds` verwendet einen Datums-Algorithmus (Howard Hinnants Umrechnung gregorianischer Kalender in Tage) zur Wochentagsberechnung und kombiniert das mit Öffnungs-/Mittags-/Schlusszeiten der HK-Börse, um zu entscheiden, „wie lange bis zum nächsten Refresh geschlafen wird". Während der Handelszeiten wird alle 10 Minuten aktualisiert; nach Börsenschluss wird direkt zum Öffnungszeitpunkt des nächsten Handelstages gesprungen – kein sinnloses Leerlauf mitten in der Nacht.

**Schritt 3 – Kein Neuaufbau, wenn sich der Preis nicht ändert:** Ein Refresh des E-Paper-Displays dauert mehrere Sekunden und flackert. Deshalb merkt sich der Code über `lastPriceF` den zuletzt gezeichneten Preis; bei unverändertem Preis wird das Refresh übersprungen. Nur wenn sich wirklich etwas tut, wird neu gezeichnet – das spart spürbar viele Refreshs.

**Schritt 4 – BUSY-Pin-Diagnose:** Gleich beim Start wird der Pegel des BUSY-Pins gelesen. Wenn nicht der erwartete High-Pegel anliegt, liegt höchstwahrscheinlich ein Verdrahtungs- oder Versorgungsproblem vor – und du bekommst sofort einen Hinweis, bevor du lange im Dunkeln tippst.

## Ein einfaches „Hello World"-Programm

Hier ist ein minimalistisches Testprogramm zum Ausprobieren — der vorherige Code wirkt durch die Netzwerklogik recht komplex und ist deshalb schwerer zu verstehen.

```c
#include <GxEPD2_3C.h>
#include <Adafruit_GFX.h>
#include <SPI.h>

// 1. Pins des E-Paper-Displays definieren
#define EPD_MOSI 11  // SDI / MOSI
#define EPD_CLK  12  // SCL / SCK
#define EPD_CS   10  // CS
#define EPD_DC   9   // DC
#define EPD_RST  8   // RES / RESET
#define EPD_BUSY 7   // BUSY

// 2. Treiberinstanz erzeugen (zum schnellen Testen verschiedener Treibermodelle)
// Beim Testen immer nur eine Zeile einkommentieren, den Rest mit // auskommentieren

// Option A: GDEW075Z08 (800x480, Treiber-IC GD7965)
// GxEPD2_3C<GxEPD2_750c_Z08, GxEPD2_750c_Z08::HEIGHT> display(GxEPD2_750c_Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Option B: GDEW075Z09 (640x384, Treiber-IC UC8179 / IL0371)
// GxEPD2_3C<GxEPD2_750c, GxEPD2_750c::HEIGHT> display(GxEPD2_750c(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Option C: GDEH075Z90 (880x528, Treiber-IC SSD1677) – viel Speicher, daher HEIGHT / 2 als Paging
// GxEPD2_3C<GxEPD2_750c_Z90, GxEPD2_750c_Z90::HEIGHT / 2> display(GxEPD2_750c_Z90(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Option D: GDEW075Z08 (800x480, eine andere Variante mit UC8179-IC)
// GxEPD2_3C<GxEPD2_750c_GDEW075Z08, GxEPD2_750c_GDEW075Z08::HEIGHT / 2> display(GxEPD2_750c_GDEW075Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Option E: GDEY075Z08 (800x480, Treiber-IC UC8179)
GxEPD2_3C<GxEPD2_750c_GDEY075Z08, GxEPD2_750c_GDEY075Z08::HEIGHT / 2> display(GxEPD2_750c_GDEY075Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));


void setup() {
  Serial.begin(115200);
  delay(1000);

  // 3. [WICHTIG] Da nicht-standardmäßige SPI-Pins verwendet werden, muss der SPI-Bus des ESP32-S3 zuerst manuell initialisiert werden
  // Parameterreihenfolge: SCK, MISO (-1 = nicht vorhanden), MOSI, SS (-1 = vorerst nicht festgelegt)
  SPI.begin(EPD_CLK, -1, EPD_MOSI, -1);

  // 4. Display initialisieren
  Serial.println("Initializing e-Paper...");
  display.init(115200);
  display.setRotation(0); // 0 = Standard Querformat

  // 5. Eine einfache Seite zeichnen
  Serial.println("Rendering test page...");
  drawSimplePage();

  // 6. Nach Abschluss des Refreshs das Display in Tiefschlaf versetzen, um es zu schonen und komplett stromlos zu machen
  display.powerOff();
  Serial.println("Done! Screen is now in deep sleep.");
}

void loop() {
  // Leerlauf-Schleife beibehalten, damit keine wiederholten Refreshs das E-Paper belasten
  delay(1000);
}

// Minimale Zeichenfunktion
void drawSimplePage() {
  display.firstPage();
  do {
    // Bildschirm löschen (komplett weiß)
    display.fillScreen(GxEPD_WHITE);

    // 1. Roter Balken oben
    display.fillRect(0, 0, display.width(), 50, GxEPD_RED);
    display.setTextColor(GxEPD_WHITE);
    display.setTextSize(3);
    display.setCursor(30, 15);
    display.print("ESP32-S3 TEST");

    // 2. Großer schwarzer Text in der Mitte
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(5);
    display.setCursor(50, 180);
    display.print("Hello World!");

    // 3. Roter Hinweis unten
    display.setTextColor(GxEPD_RED);
    display.setTextSize(2);
    display.setCursor(50, 300);
    display.print("7.5 inch E-Paper Display Works!");

  } while (display.nextPage());
}
```

## Troubleshooting

Keine Panik, rund 80 % aller Probleme liegen an diesen Punkten:

- **Serieller Monitor meldet `E BOD: Brownout detector was triggered` und startet ständig neu:** Die Brownout/Unterspannung-Schutzschaltung des ESP32 hat ausgelöst, meist weil das WiFi-Hochfahren die Spannung kurz einbrechen ließ. Siehe den Abschnitt „Versorgungsstabilität" weiter oben – einen 470μF/1000μF Elektrolytkondensator plus einen 0,1μF Keramikkondensator parallel zwischen `3V3` und `GND` schalten und ein dickeres USB-Kabel verwenden.
- **Display bleibt dauerhaft weiß und reagiert nicht:** Zuerst prüfen, ob die BUSY-Leitung richtig angesteckt ist. Im seriellen Monitor sollte `[BUSY diag]` eine 1 ausgeben. Steht dort eine 0, Verdrahtung und Versorgung checken – sehr oft steckt ein Dupont-Kabel nur lose.
- **Jedes Refresh hängt und läuft erst nach 30 Sekunden in einen Timeout:** Fast immer ein falsch angeschlossener BUSY-Pin oder eine unzureichende Display-Versorgung (zu schwacher USB-Strom kann das ebenfalls verursachen – probiere ein dickeres Datenkabel).
- **Chinesische Zeichen erscheinen als Kästchen oder fehlen:** Das jeweilige Zeichen ist nicht im lokalen Zeichensatz enthalten. Geh zurück zum in der „Code-Erklärung" erwähnten Abschnitt und ergänze das zugehörige Bitmap-Array für das neue Zeichen.
- **WiFi will sich einfach nicht verbinden:** Prüfe Tippfehler in `ssid` und `password` und stelle sicher, dass dein Router auf 2,4 GHz funkt – die meisten ESP32 unterstützen kein 5 GHz.
- **Der Aktienkurs aktualisiert sich nicht und bleibt auf einer Zahl stehen:** Das ist normal. Wenn sich der Zeitstempel nicht mehr ändert, nimmt der Code an, dass die Börse geschlossen ist, und verlängert das Intervall auf 1 Stunde. Sobald der Handel wieder beginnt, kehrt der Code automatisch zum normalen Refresh-Rhythmus zurück.
- **Beim Kompilieren wird `GxEPD2_750c_GDEY075Z08` nicht gefunden:** Prüfe, ob die GxEPD2-Version zu alt ist – dieses Display-Modell wurde erst später in die unterstützte Liste aufgenommen. Ein Update auf eine neuere Version behebt das Problem.

## FAQ

**F: Darf ich die ESP32-Pins frei wählen?**
A: Ja, solange du normale GPIOs mit SPI-Unterstützung verwendest. Passe einfach die Makros `EPD_MOSI` / `EPD_CLK` / `EPD_CS` / `EPD_DC` / `EPD_RST` / `EPD_BUSY` am Anfang des Codes an deine tatsächliche Verdrahtung an – sonst ist nichts weiter zu ändern.

**F: Kann ich das Refresh-Intervall verkürzen, z. B. auf 1 Minute?**
A: Ja, ändere in `computeSleepSeconds` die 10 Minuten in den gewünschten Wert. Beachte aber, dass E-Paper-Displays nur eine begrenzte Anzahl Refreshs überleben – zu häufiges Aktualisieren lohnt sich nicht wirklich.

**F: Funktioniert das auch mit Batterieversorgung?**
A: Die aktuelle Demo-Version betreibt WiFi dauerhaft und wartet mit `delay()` – das zieht dauerhaft relativ viel Strom und ist daher eher für USB-Betrieb geeignet. Für Batteriebetrieb empfiehlt sich ein Umbau auf Deep-Sleep: nach jedem Aufwachen Daten abholen, WiFi trennen und wieder schlafen legen.

**F: Wie viel Speicher braucht das Projekt – ist das für den ESP32 zu viel?**
A: Zeichensatz und Code selbst sind sehr klein; der Hauptanteil ist der Display-Puffer von GxEPD2. Für ein 7,5\" dreifarbiges Display solltest du einen ESP32 mit etwas großzügigerem Flash/RAM wählen; ein normaler ESP32-S3 ist hier völlig ausreichend.

**F: Kann ich statt Tencent Holdings andere Aktien anzeigen, z. B. A-Aktien oder US-Aktien?**
A: Ja, tausche einfach `api_url` gegen die entsprechende Adresse der Tencent-Finance-API für die gewünschte Aktie. Beachte allerdings, dass Öffnungs- und Schlusszeiten von A-/US-Aktien anders sind als in Hongkong – die entsprechenden Zeitpunkte in `computeSleepSeconds` müssen angepasst werden. Außerdem musst du für eventuell zusätzliche chinesische Zeichen selbst einen eigenen Zeichensatz anlegen, damit keine Kästchen erscheinen.

**F: Lässt sich auch ein anderes Display-Format verwenden, z. B. ein kleineres 4,2\"?**
A: Ja, wähle das entsprechende, von GxEPD2 unterstützte Modell. Achte darauf, dass auch die Bildkoordinaten (z. B. die Zahlen 800, 480) an die Auflösung des neuen Displays angepasst werden – sonst verschiebt sich das Layout.

## Ideen zum Ausbau

- Mehrere Aktien im Wechsel anzeigen und das Dashboard regelmäßig umschalten
- Eine kleine WiFi-Konfigurations-Webseite ergänzen, damit du nicht jedes Mal den WiFi-Namen und das Passwort im Code ändern musst
- Einen Fotowiderstand (LDR) anschließen: tagsüber normal refreshen, nachts das Refresh-Intervall automatisch verlängern und Strom sparen
- Auf Deep-Sleep + Batterieversorgung umstellen – so entsteht ein wirklich kabelloses Tisch-Gadget, das du einfach ablegst

## Referenzen

- [GxEPD2 GitHub-Repository](https://github.com/ZinggJM/GxEPD2)
- [Adafruit GFX Library GitHub-Repository](https://github.com/adafruit/Adafruit-GFX-Library)
- [Espressif ESP32 offizielle Dokumentation](https://www.espressif.com/en/products/socs/esp32)
