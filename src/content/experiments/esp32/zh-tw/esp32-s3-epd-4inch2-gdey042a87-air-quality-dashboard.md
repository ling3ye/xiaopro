---
title: "ESP32-S3 驅動 4.2 吋墨水屏（SSD1683）｜接入 AQICN 做一個空氣品質看板（GxEPD2 + SPI）"
boardId: esp32s3
moduleId: display/epd-4inch2-gdey042a87
category: esp32
date: 2026-07-08
intro: "用 ESP32-S3 + GxEPD2 驅動 4.2 吋黑白墨水屏（GDEY042A87 / SSD1683），接入 AQICN 空氣品質 API，做一個斷電也不殘影的桌面空氣品質看板，含接線、完整 Arduino C++ 程式碼、分區方案與除錯全流程。"
image: "https://img.lingflux.com/2026/07/39d31272f2976bb195ecea554654502d.jpg"
---

> **一句話摘要**：用一塊十幾塊人民幣在二手市場淘來的 4.2 吋黑白墨水螢幕和 ESP32-S3，接入 AQICN 空氣品質 API，做一個不用掏手機、瞄一眼就知道今天能不能衝去爬白雲山的桌面空氣品質看板。

難度：⭐⭐☆☆☆（新手可上手） 預計時間：30 分鐘 測試環境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 ＋ GxEPD2 v1.6.9 + Adafruit GFX Library v1.12.6 + ArduinoJson v7.4.3（建議裝程式庫時對照這個版本，太新太舊都可能踩坑）

> **TL;DR（快速上手）：**
>
> 1. 接線：GPIO11 → SDI/MOSI，GPIO12 → SCL/SCK，GPIO10 → CS，GPIO9 → DC，GPIO8 → RES，GPIO7 → BUSY，VCC 接 3.3V，GND 共地
> 2. 裝程式庫：ArduinoJson、GxEPD2、Adafruit GFX Library、U8g2_for_Adafruit_GFX（作者 olikraus）
> 3. 把程式碼裡的 `WIFI_SSID`、`WIFI_PASS`、`API_TOKEN` 改成自己的（Token 申請方法見下方「申請 AQICN 免費 API Token」一節）
> 4. 燒錄，等 WiFi 連上，螢幕會自動刷新出空氣品質資料

## 前言

花十幾塊人民幣在二手市場淘了一塊黑白墨水螢幕，說實話下單的時候心裡是有點打鼓的——萬一是塊壞螢幕，這錢就打水漂了。還好上電測試一切正常，沒翻車，但有一條豎線壞了，不過影響不大。趁著螢幕還熱乎，乾脆做一個能一直顯示、不用手機 App、瞄一眼就知道今天白雲山空氣好不好的小看板，天氣好就衝去爬白雲山。這篇文章記錄完整的接線、程式碼和踩過的坑，跟著做基本能一次點亮。

## 實驗效果

一塊 ESP32-S3 定時從 AQICN.ORG 拉取空氣品質資料，刷新到墨水螢幕上，畫面包含 AQI 大數字、12 項細分指標（PM2.5、PM10、溫濕度、風速等）以及 PM2.5 和紫外線的七日預測柱狀圖，斷電也不殘影，放桌上就是個「電子風水表」，很好的桌搭。

## 元件說明

**ESP32-S3 開發板** 是一顆帶 WiFi 的 SoC 開發板，負責連網拉資料、跑邏輯、透過 SPI 把畫面推給螢幕，是整個專案的大腦。選它是因為腳位多、算力夠、自帶 WiFi，不用額外加裝網路模組。

**墨水螢幕驅動板**（自製）負責把 ESP32 發來的 SPI 指令翻譯成螢幕能懂的電平訊號，本質上就是個「翻譯官」。選擇自己畫板是因為好玩。引出的介面和市面上的是一樣的，所以你有其他的墨水螢幕驅動板亦可一試。

**4.2 吋黑白電子墨水螢幕** 是一種靠電場翻轉微膠囊裡黑白粒子來顯示畫面的螢幕，特點是斷電也能保持畫面，適合做這種「看一眼就走」的資訊看板。它不像 LCD 那樣耗電，唯一的代價是刷新慢，不適合做動畫。



## BOM 表

| 元件         | 型號/規格                                    | 數量 |
| ------------ | -------------------------------------------- | ---- |
| ESP32 開發板 | ESP32-S3（帶足夠 SPI 腳位的型號均可）        | 1    |
| 墨水螢幕驅動板 | 自製 PCB，腳位定義與市面主流墨水螢幕驅動板一致 | 1    |
| 電子墨水螢幕   | 4.2 吋黑白，相容 GxEPD2_420_GYE042A87 驅動   | 1    |
| 杜邦線       |                                              | 若干 |

## 元件腳位說明

| 腳位         | 全稱             | 作用                                             |
| ------------ | ---------------- | ------------------------------------------------ |
| **VCC**      | 電源正極         | 供電輸入，接 ESP32-S3 的 3V3 輸出                |
| **GND**      | 電源地           | 參考地，接 ESP32-S3 的 GND，形成迴路             |
| **SDI/MOSI** | 主機輸出從機輸入 | SPI 資料線，ESP32 往螢幕發資料                   |
| **SCL/SCK**  | 序列時脈         | SPI 時脈線，控制資料傳輸節奏                     |
| **CS**       | 晶片選擇         | 告訴螢幕「接下來的資料是發給你的」                 |
| **DC**       | 資料/命令切換    | 區分當前傳的是畫面資料還是控制命令               |
| **RES/RST**  | 重置             | 拉低一下讓螢幕重新初始化                         |
| **BUSY**     | 忙碌狀態指示     | 刷新中會拉低，ESP32 靠它判斷「能不能發下一條指令」 |

## 接線方式

| 墨水螢幕腳位 | 接 ESP32-S3 腳位 |
| ---------- | ---------------- |
| SDI/MOSI   | GPIO11           |
| SCL/SCK    | GPIO12           |
| CS         | GPIO10           |
| DC         | GPIO9            |
| RES        | GPIO8            |
| BUSY       | GPIO7            |
| VCC        | 3.3V             |
| GND        | GND              |

建議接完逐一核對，能省 80% 除錯時間——墨水螢幕最坑的地方是接錯線不會報錯，只會一直花屏或白屏，肉眼很難第一時間判斷是程式碼問題還是接線問題。

## 需要安裝的程式庫

在 Arduino IDE 的程式庫管理員裡搜尋安裝以下幾個（測試通過版本僅供參考，實際以程式庫管理員最新穩定版為準）：

| 程式庫名稱              | 作用                                            | 測試版本                |
| --------------------- | ----------------------------------------------- | ----------------------- |
| ArduinoJson           | 解析 AQICN API 回傳的 JSON                       | v7.4.3                  |
| GxEPD2                | 墨水螢幕驅動核心程式庫                                | v1.6.9                  |
| Adafruit GFX Library  | 圖形繪製基礎程式庫，GxEPD2 依賴它                   | v1.12.6                 |
| U8g2_for_Adafruit_GFX | 橋接 U8g2 中文字庫到 Adafruit GFX，用於顯示中文 | v1.8.0（作者 olikraus） |

`WiFi.h`、`HTTPClient.h`、`SPI.h` 是 ESP32 核心自帶，不用單獨安裝，只要裝好了 ESP32 開發板支援包就有。

## 燒錄設定：分區方案（重要）

這裡有個坑要先踩明白：本專案用到了 `U8g2_for_Adafruit_GFX` 的完整中文字庫（程式碼裡引用了 `u8g2_font_wqy16_t_gb2312`、`wqy14`、`wqy12` 三套），這些 GB2312 字庫加起來快 500KB。而 ESP32 預設的分區方案給程式區只留了 1MB，編譯時會報「空間不足（region `app' overflowed）」直接燒不進去。

**解決辦法**：上傳前把分區方案調大。

**操作路徑**：Arduino IDE 頂部選單 → `工具 (Tools)` → `Partition Scheme` → 選 **`Huge APP (3MB No OTA/1MB SPIFFS)`**

我用的就是這個 `Huge APP`，給程式區一口氣分了 3MB，字庫和程式碼都能舒舒服服塞進去，編譯燒錄一路暢通。

> 💡 幾點補充：
> - **為什麼字庫這麼大？** GB2312 收錄了六七千個漢字，每套 wqy 字型都是一兩百 KB 的點陣資料，沒辦法像西文字庫那樣小。
> - **No OTA 的代價**：選了 No OTA 就沒法用「空中升級」刷韌體，只能老老實實用 USB 線燒錄。對桌面小擺件來說毫無影響，反正就放桌上插著電。
> - **大 Flash 板子的更優解**：如果你的 ESP32-S3 是 ≥8MB Flash 的版本，可以選更寬鬆的方案（如 `8M with SPIFFS`），既不卡 OTA，又能多出空間存資料。
> - 改完分區方案記得重新編譯，別只點「上傳」用舊設定。

## 申請 AQICN 免費 API Token

程式碼裡的 `API_TOKEN` 和城市編號（如 `@14370`）都來自 AQICN（aqicn.org），免費申請，照下面四步就能拿到。

**第一步：找到你的城市**

打開 [aqicn.org](https://aqicn.org/)，在右上角搜尋框輸入想監控的城市或監測站名稱（比如「Guangzhou」「Baiyun Mountain」），點進對應的空氣品質頁面。

**第二步：進入 API 資料平台**

在該城市頁面向下捲動，找到標著「json: api」的連結，點進去，會跳轉到 AQICN 資料平台。

**第三步：註冊並啟用帳號**

填 email 註冊一個帳號，去收件匣點啟用連結完成驗證。登入之後，在控制台裡就能看到你專屬的 **Token**（一串隨機字串，注意保密，別直接傳到公開倉庫裡）。

**第四步：拼接 API 網址並填進程式碼**

把 Token 填進程式碼裡的 `API_TOKEN` 巨集，再把 `API_URL` 中的 `@14370` 換成你想要的監測站編號（也可以直接用城市英文名或經緯度座標，寫法見 [AQICN API 文件](https://aqicn.org/api/)），完整格式如下：

```
https://api.waqi.info/feed/@14370/?token=你的Token
```

想確認網址配對沒問題，把上面這串貼進瀏覽器網址列直接打開，能看到回傳 `"status":"ok"` 的 JSON 就說明通了。

> AQICN 個人 Token 完全免費、無需綁卡，額度夠個人專案隨便用，不用擔心收費。

## 完整程式碼 + 說明

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

### 程式碼說明

第一步，`connectWiFi()` 裡做的是標準的 WiFi 連線，重試 40 次（20 秒），逾時不會卡死，會繼續往下走，方便離線也能先看到錯誤提示而不是黑屏。

第二步，`fetchAqiData()` 用 `HTTPClient` 請求 AQICN 的 `/feed/@城市ID/` 介面，拿到 JSON 後用 `ArduinoJson` 的 `JsonDocument` 解析，逐個欄位填進 `AqiData` 結構體，包括當前 12 項指標和未來幾天的 PM2.5/PM10/紫外線預測陣列。

第三步，`drawUI()` 是整個繪圖的核心，按「標題列 → AQI 大方塊 → 12 項指標網格 → 預報柱狀圖 → 底部狀態列」的順序分區塊畫，每個區塊的座標都是寫死的像素值，方便照著改版面。

第四步，中文靠 `U8g2_for_Adafruit_GFX` 這層橋接來畫，`drawCN` 系列函式統一封裝了黑底白字/白底黑字兩種模式，避免每處都重複設定顏色。

第五步，`loop()` 裡每 30 分鐘刷新一次，重新初始化螢幕後呼叫 `drawUI()`，用完立刻 `powerOff()` 斷電，這是墨水螢幕省電和護螢幕的關鍵——不刷新的時候完全不用給它供電。

## 常見問題排查

別慌，80% 的問題出在這幾個地方：

**螢幕一直白屏/花屏**：先排查接線，尤其是 CS、DC、RES、BUSY 這四根控制線是否插錯順序；其次確認 `display.init()` 裡的驅動類別 `GxEPD2_420_GYE042A87` 和手上螢幕的真實型號一致，型號不對會導致時序錯亂。

**中文顯示成方塊或亂碼**：說明 `U8g2_for_Adafruit_GFX` 沒有正確初始化，檢查 `u8f.begin(display)` 是否在 `display.init()` 之後呼叫，並確認使用的字庫（如 `u8g2_font_wqy14_t_gb2312`）裡包含要顯示的漢字。

**WiFi 連不上**：確認開發板只支援 2.4GHz，不支援 5GHz WiFi；SSID 和密碼是否有中文或特殊字元導致跳脫問題。

**API 回傳資料全是 0**：大概率是 `API_TOKEN` 沒申請或者寫錯，也可能是 `API_URL` 裡的城市 ID（如 `@14370`）不對，先用瀏覽器直接打開這個連結確認能回傳正常 JSON。

**畫面上下顛倒**：把程式碼裡的 `ROTATION_FLIP` 從 0 改成 1，重新燒錄即可，不用改接線。

**編譯時報「空間不足 / region `app' overflowed」**：是中文字庫太大撐爆了預設分區，按上文「燒錄設定：分區方案」一節，把 `Partition Scheme` 改成 `Huge APP (3MB No OTA/1MB SPIFFS)` 再編譯即可。

## FAQ 問答

**Q：ESP32-S3 換成普通 ESP32 能不能用？** A：可以，只要腳位支援 SPI 且不是被開發板佔用的特殊腳位（如 Flash 相關腳位），把程式碼裡 6 個 `EPD_*` 巨集定義改成實際接線的 GPIO 編號即可，其餘程式碼不用動。

**Q：GxEPD2_420_GYE042A87 這個驅動類別不匹配我的螢幕怎麼辦？** A：去 GxEPD2 程式庫的 GitHub 倉庫裡查對應型號的驅動類別名，替換 `display` 定義那一行即可，其他繪圖程式碼通常不需要改。

**Q：為什麼刷新一次要好幾秒，能不能更快？** A：黑白墨水螢幕的全刷新（Full Refresh）本身就慢，這是硬體特性，不是程式碼問題；如果只更新局部數字，可以研究 GxEPD2 的局部刷新（Partial Update）介面，但會有殘影風險。

**Q：AQICN API 的免費額度夠用嗎？** A：AQICN 個人 Token 免費額度通常是每分鐘 1000 次請求，本專案 30 分鐘才請求一次，完全夠用，不用擔心超限。

**Q：ESP32-S3 不刷新的時候功耗大概多少？** A：程式碼裡沒有加深層睡眠，`loop()` 裡用 `delay()` 掛起，實測典型功耗在幾十毫安級別；如果要做電池供電版本，建議把 `delay(UPDATE_INTERVAL_MS)` 換成 `esp_deep_sleep`，功耗能降到微安級。

**Q：螢幕一直不刷新，但序列埠監視器顯示資料抓取成功怎麼辦？** A：檢查 `drawUI()` 裡的 `display.firstPage()/nextPage()` 迴圈是否被中途 `return` 打斷，GxEPD2 要求這個迴圈必須完整跑完一次才會真正把畫面推到螢幕上。

## 延伸玩法

- 從 SD 卡讀取本地城市清單，做成多城市輪播看板
- 接一個按鍵，短按手動刷新，長按切換到深層睡眠省電模式
- 把 30 分鐘更新間隔改成讀取環境光感測器，天黑自動降低刷新頻率

## 參考資料

- [GxEPD2 程式庫 GitHub 主頁](https://github.com/ZinggJM/GxEPD2)
- [ArduinoJson 官方文件](https://arduinojson.org/)
- [U8g2_for_Adafruit_GFX GitHub 主頁](https://github.com/olikraus/U8g2_for_Adafruit_GFX)
- [AQICN 空氣品質 API 文件](https://aqicn.org/api/)
- [Espressif ESP32-S3 產品頁](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
