---
title: "ESP32-S3 驅動 7.5 吋三色電子紙｜即時顯示騰訊控股(00700)股價看板（GxEPD2 + SPI）"
boardId: esp32s3
moduleId: display/epd-7inch5-gdey075z08
category: esp32
date: 2026-07-06
intro: "用 ESP32-S3 + GxEPD2 驅動 7.5 吋三色電子紙（GDEY075Z08），抓取騰訊財經介面即時顯示騰訊控股(00700)股價看板，港股休市自動拉長刷新省電。附完整接線、BOD 欠壓排查、自製中文字庫與 Arduino C++ 程式碼。"
image: "https://img.lingflux.com/2026/07/683e33cff80c152435263c8e4e6c546d.jpg"
---

> **一句話摘要**：用 ESP32-S3 和 7.5 吋三色電子紙（GDEY075Z08）做一個會「自動收盤休眠」的騰訊控股股價看板，港股紅漲黑跌，一眼看清今天該高興還是睡公園。

難度：⭐⭐⭐☆☆（需要一點點電路基礎，會燒錄 Arduino 就能跟）
預計時間：1～2 小時（不含盯著電子紙等它刷新的抓狂時間）
測試環境：
Arduino IDE 2.3.8 +
ESP32 Arduino Core 3.3.10 ＋
GxEPD2 v1.6.9 +
Adafruit GFX Library v1.12.6
（建議裝程式庫時對照這個版本，太新太舊都可能踩坑）

> 由於這次演示使用的是騰訊財經的免費 API，所以我就拿騰訊控股的股價作為演示，並無其他意思。本文不提供任何投資建議，投資有風險，請小心謹慎。

> **TL;DR（快速上手）：**
>
> 1. 接線：EPD 的 SDI→GPIO11，SCL→GPIO12，CS→GPIO10，DC→GPIO9，RES→GPIO8，BUSY→GPIO7，VCC 接 3.3V，GND 共地
> 2. 裝程式庫：GxEPD2、Adafruit GFX Library（WiFi、HTTPClient 是 ESP32 內建的，不用另裝）
> 3. 改程式碼裡的 `ssid` 和 `password` 為你自己的 WiFi
> 4. 燒錄，等螢幕刷出第一版價格，收工

---

## 前言

我有個挺傻的習慣：每天沒事就掏出手機刷一下自選股，刷完發現啥也沒變，純純精神損耗。後來一想，與其讓手機 App 來回騷擾我的多巴胺，不如做一塊「專用儀表板」——它只幹一件事：安安靜靜地把股價釘在桌上，不彈窗、不推送，我瞄一眼就知道今天該高興還是睡公園。

這篇教程就是記錄我怎麼用一塊 ESP32 和一塊 7.5 吋電子紙，做出一個能自動刷新的騰訊控股（00700）股價看板，還順便解決了「中文字庫不全」和「收盤後別瞎刷屏」這兩個大坑。看完你能照抄出一個一樣的，也能改成你自己關心的任何股票。

> 由於這次演示使用的是騰訊財經的免費 API，所以我就拿騰訊控股的股價作為演示，並無其他意思。本文不提供任何投資建議，投資有風險，請小心謹慎。

## 實驗效果

最終效果就是：桌上一塊黑白紅三色的電子紙，安靜地顯示股價、漲跌幅、當日最高最低價和成交額；港股紅漲黑跌，一眼就能看懂心情；收盤、午休、週末的時候它會自動「裝死」少刷新，開盤了再恢復正常節奏，不會半夜還在偷偷刷屏嚇自己。

> 由於這次演示使用的是騰訊財經的免費 API，所以我就拿騰訊控股的股價作為演示，並無其他意思。本文不提供任何投資建議，投資有風險，請小心謹慎。
>
> 重要的事情，要說三遍！！！

## 元件說明

**7.5 吋三色電子墨水螢幕**：可以理解成「超市裡的電子價籤放大版」——它靠一次通電把畫面「定型」在紙一樣的介質上，之後哪怕斷電，畫面也不會消失，只有下次刷新才耗電。三色版比常見的黑白版多了一種紅色，正好拿來表示「漲」，非常貼合股票場景。本專案用的型號是 `GDEY075Z08`，解析度 800×480。選它是因為解析度夠大，一螢幕能同時放下價格、漲跌、四項資料，不用來回翻頁。

**電子紙驅動板**：和市面上可購買的腳位定義是一樣的。這個是自己手搓貼片的，設計還未算完善，測試 7.5 吋螢幕是完美顯示，但是 4.2 吋、1.54 吋的電子墨水螢幕還有點問題，後續優化。分享原理圖：

![](https://img.lingflux.com/2026/07/7466106c7707c8ef928c57a102df38cb.png)

**ESP32 開發板**：負責連網抓資料、算刷新時間、驅動螢幕，是整個專案的大腦，具體型號看你手上有什麼板子都行，只要 GPIO 夠用即可（本文示例腳位號適用於常見的 ESP32-S3 系列開發板，如果你用的是老款 ESP32，把腳位號換成你板子上實際可用的即可）。

## BOM 表

| 元件 | 型號/規格 | 數量 |
| --- | --- | --- |
| ESP32 開發板 | ESP32-S3 或其他帶 SPI 腳位的 ESP32 系列 | 1 |
| 電子紙驅動板 | 自己手搓，但腳位是跟市面上大多數電子紙驅動一樣的。 | 1 |
| 7.5 吋電子墨水螢幕 | GDEY075Z08，7.5 吋，800×480，黑/白/紅三色 | 1 |
| 杜邦線 | 公對母 | 若干 |

## 7.5 吋電子紙驅動板腳位說明

自己畫原理圖，搞了塊 PCB，手搓貼片，使用的腳位和市面上大多數的電子紙驅動板一樣。

| 腳位 | 全稱 | 作用 |
| --- | --- | --- |
| **VCC** | 電源正極 (Voltage Common Collector) | 供電輸入腳位，連接 ESP32-S3 的 **3V3**（3.3V）輸出。 |
| **GND** | 電源地 (Ground) | 電源參考地，連接 ESP32-S3 的 **GND**，形成電流迴路。 |
| **SDI/MOSI** | 主機輸出從機輸入 | SPI 資料線，ESP32 往螢幕發資料 |
| **SCL/SCK** | 序列時脈 | SPI 時脈線，控制資料傳輸節奏 |
| **CS** | 晶片選擇 | 告訴螢幕「接下來的資料是發給你的」 |
| **DC** | 資料/命令切換 | 區分當前傳的是畫面資料還是控制命令 |
| **RES/RST** | 重置 | 拉低一下讓螢幕重新初始化 |
| **BUSY** | 忙碌狀態指示 | 螢幕刷新中會拉低，ESP32 靠它判斷「能不能發下一條指令」 |

## 接線方式

| 電子紙腳位 | 接 ESP32 腳位 |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

建議接完逐一核對一遍再上電，尤其是 BUSY 這根線接錯或虛焊，能省 80% 的排錯時間——程式碼裡專門加了一段開機診斷就是為了防這個坑，後面程式碼說明會講到。

## 供電穩定性：解決 ESP32 欠壓重啟（BOD 報錯）

由於這次我用的是自己 DIY 的開發板，供電部分可能不夠完善，測試過程中遇到了 `E BOD: Brownout detector was triggered` 這個報錯，意思是 **ESP32 的欠壓檢測器被觸發了**——板子檢測到電壓掉到安全閾值以下，就自動重啟自保。

### 為什麼會觸發 BOD

當 ESP32 啟動 Wi-Fi 時，射頻模組會瞬間產生一個**幾百毫安的突發大電流需求**。如果供電線太細、杜邦線接觸電阻大、或者 USB 供電能力不足，電壓就會被瞬間拉低，導致 ESP32 自動重啟。電子紙刷新時同樣是耗電大戶，要是和 Wi-Fi 搶電，更容易把電壓拉垮。

在電路中並聯一個**電解電容**（儲能）和一個**瓷片電容**（濾波）是解決這個問題的標準做法。我用了下面這套組合拳之後，測試穩定了很多，再也沒遇到 BOD。

### 1. 電容選型推薦

建議同時使用兩個電容並聯，組合拳效果最好：

* **電解電容（大水庫）：** `470μF` 或 `1000μF`（耐壓值選擇 `6.3V` 或 `10V` 或 `16V` 均可）。它用來應付 Wi-Fi 啟動時的瞬間大電流。
* **獨石/瓷片電容（小濾網）：** `0.1μF`（即標號 `104`）。用來濾除高頻雜訊。

### 2. 具體接線位置

**最核心的原則：電容必須盡可能靠近 ESP32 開發板的腳位。** 由於可能使用的是杜邦線連接，可以直接把電容插在麵包板上，或者直接焊接/絞接在靠近 ESP32 的電源線上。

#### 接線符號示意圖

```text
    [ 外部供電 / USB ]
          │   │
          ▼   ▼
       ┌─────────┐
       │  5V/3V3 │──────┬───────────────┬──────► [ ESP32 的 VCC/3V3 腳位 ]
       │         │      │               │
       │         │    + │ 極性           │
       │         │   ┌──┴──┐         ┌──┴──┐
       │         │   │     │         │     │
       │         │   │470uF│         │0.1uF│
       │         │   │     │         │     │
       │         │   └──┬──┘         └──┬──┘
       │         │      │ - 負極         │
       │   GND   │──────┴───────────────┴──────► [ ESP32 的 GND 腳位 ]
       └─────────┘
```

#### 腳位對應連接關係

* **電解電容的 正極（+，長腳）** ───►  連接到 ESP32 的 **`3V3`**（或 `5V/VIN`，取決於你從哪個腳位給板子供電）
* **電解電容的 負極（-，短腳，外殼上有灰色條紋的一側）** ───► 連接到 ESP32 的 **`GND`**
* **0.1μF 瓷片電容（不分正負極）** ───► 兩端同樣並聯在 **`3V3`** 和 **`GND`** 之間。

> ⚠️ 電解電容是有極性的，接反會發熱甚至炸開，接線前務必認準「長腳為正、灰條紋一側為負」。

### 3. 補充排查建議（如果加了電容還重啟）

1. **換一根高品質的 USB 線：** 很多廉價杜邦線或細 USB 線內阻極大，換一根粗一點的手機充電線會有奇效。
2. **更換供電介面：** 不要插在電腦的前置 USB 埠（供電很弱），盡量插在電腦後置的主機板 USB 埠，或者直接用 5V/2A 的手機充電頭供電。
3. **程式碼避峰：** 確保在程式碼中，**不要**讓電子紙的刷新動作（也是耗電大戶）和 `WiFi.begin()` 同時發生。先連 Wi-Fi 拿資料，斷開 Wi-Fi 或讓 Wi-Fi 休眠後，再驅動電子紙刷新。本文程式碼裡還加了 `WiFi.setTxPower(WIFI_POWER_17dBm)` 降低發射功率，作為軟體層面的雙重保險。

## 需要安裝的程式庫

在 Arduino IDE 的程式庫管理員裡搜尋安裝：

- `GxEPD2`（作者 ZinggJM）—— 測試通過版本 v1.6.9
- `Adafruit GFX Library` —— 測試通過版本 v1.12.6

`WiFi.h` 和 `HTTPClient.h` 是 ESP32 Arduino Core 內建的，不用單獨裝，但要確保開發板管理員裡的 ESP32 核心版本是 3.0.x 系列，太舊的核心可能缺一些 API。

## 完整程式碼 + 說明

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

### 程式碼說明

**第一步，字庫是「手搓」的**：常見的中文字庫檔案動輒幾十上百 KB，還不一定湊得齊「騰訊控股」這四個字。乾脆只把專案裡真正用到的十幾個漢字，提前渲染成點陣陣列塞進程式碼裡，體積小，而且絕對不會缺字變方塊。

**第二步，交易時間是自己算的，不是查表**：`computeSleepSeconds` 用一個日期演算法（Howard Hinnant 的公曆轉天數演算法）算出今天是星期幾，再結合港股的開盤/午休/收盤時間點，決定「接下來該睡多久再醒來刷新」。開盤中每 10 分鐘刷一次，收盤後直接跳到下一個交易日的開盤時間，不會在半夜傻乎乎地空轉。

**第三步，價格沒變就不重繪**：電子紙刷新一次要好幾秒還會閃爍，所以程式碼裡用 `lastPriceF` 記住上一次畫的價格，沒變化就跳過，只有真的變了才重新刷屏，能省不少刷新次數。

**第四步，BUSY 腳位診斷**：開機第一時間讀一下 BUSY 腳位電位，如果不是預期的高電位，大概率是接線或供電有問題，提前給自己一個提醒，省得排查到最後才發現是接線錯了。

## 常見問題排查

別慌，80% 的問題都出在這幾個地方：

- **序列埠報 `E BOD: Brownout detector was triggered` 反覆重啟**：ESP32 欠壓保護被觸發，多半是 Wi-Fi 啟動瞬間把電壓拉低了。解決辦法見上文「供電穩定性」一節——在 `3V3` 和 `GND` 之間並聯一個 470μF/1000μF 電解電容加一個 0.1μF 瓷片電容，並換一根粗一點的 USB 線。
- **螢幕一直白屏沒反應**：先查 BUSY 線有沒有接對，序列埠監視器裡 `[BUSY diag]` 列印的值應該是 1；如果是 0，檢查接線和供電，很多時候是杜邦線沒插緊。
- **每次刷新都卡住等滿 30 秒才超時**：基本可以斷定是 BUSY 腳位接錯或者螢幕供電不足（USB 供電電流不夠也會導致這個問題，換一根更粗的傳輸線試試）。
- **中文顯示成方塊或者缺字**：說明這個字沒有收錄進本地字庫，回到「程式碼說明」裡提到的那段，把新漢字對應的點陣陣列補進去即可。
- **WiFi 死活連不上**：確認 `ssid` 和 `password` 有沒有打錯，同時確認路由器是 2.4GHz 頻段，ESP32 大多不支援 5GHz。
- **股價一直不刷新，卡在一個數字上**：這是正常現象——如果時間戳沒變化，程式碼會判定「已收盤」，自動拉長到 1 小時才醒一次，等到開盤時段自然會恢復正常刷新節奏。
- **編譯報錯找不到 `GxEPD2_750c_GDEY075Z08`**：檢查 GxEPD2 程式庫版本是不是太舊，這個螢幕型號是後來才加入程式庫裡支援列表的，升級到較新版本即可。

## FAQ 問答

**Q：ESP32 腳位可以隨便換嗎？**
A：可以，只要都用支援 SPI 的普通 GPIO，把程式碼開頭 `EPD_MOSI` / `EPD_CLK` / `EPD_CS` / `EPD_DC` / `EPD_RST` / `EPD_BUSY` 這幾個宏改成你實際接的腳位號即可，不需要改其他地方。

**Q：能不能把刷新頻率改得更快，比如 1 分鐘一次？**
A：能，把 `computeSleepSeconds` 裡的 10 分鐘改成想要的分鐘數即可，但要注意電子紙刷新次數是有壽命限制的，太頻繁反而不划算。

**Q：用電池供電會不會有問題？**
A：程式碼目前是「WiFi 常駐 + delay 等待」的演示寫法，WiFi 一直通電耗電較高，更適合 USB 供電；如果要用電池，建議改成深度睡眠模式，每次醒來抓完資料就斷開 WiFi 睡回去。

**Q：這個專案佔多少記憶體，ESP32 帶得動嗎？**
A：字庫和程式碼本身很小，主要開銷在 GxEPD2 的顯示緩衝區，7.5 吋三色螢幕建議選 Flash 和 RAM 相對寬裕的 ESP32 型號，普通 ESP32-S3 開發板完全夠用。

**Q：能不能換成顯示別的股票，比如 A 股或者美股？**
A：能，把 `api_url` 換成對應股票的騰訊財經介面位址即可，但要注意 A 股/美股的開收盤時間和港股不一樣，`computeSleepSeconds` 裡的開盤/收盤時間點需要相應調整。並且其他中文字，需要自行進行字庫的建立，才能確保不會出現方格。

**Q：螢幕能換成別的尺寸嗎，比如更小的 4.2 吋？**
A：能，換成 GxEPD2 程式庫支援的對應型號，同時注意畫面座標（比如 800、480 這些數字）要跟著新螢幕的解析度重新調整，不然版面會錯位。

## 延伸玩法

- 多檔股票輪播顯示，定時切換看板
- 加一個簡易配網網頁，不用每次改程式碼裡的 WiFi 帳號密碼
- 接光敏電阻，白天正常刷新、夜裡自動降低刷新頻率省電
- 改成深度睡眠 + 電池供電，做成真正可以隨手放在桌上的無線小擺件

## 參考資料

- [GxEPD2 GitHub 倉庫](https://github.com/ZinggJM/GxEPD2)
- [Adafruit GFX Library GitHub 倉庫](https://github.com/adafruit/Adafruit-GFX-Library)
- [Espressif ESP32 官方文件](https://www.espressif.com/en/products/socs/esp32)
