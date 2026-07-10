---
title: "ESP32-S3 驱动 4.2 寸墨水屏（SSD1683）｜接入 AQICN 做一个空气质量看板（GxEPD2 + SPI）"
boardId: esp32s3
moduleId: display/epd-4inch2-gdey042a87
category: esp32
date: 2026-07-08
intro: "用 ESP32-S3 + GxEPD2 驱动 4.2 寸黑白墨水屏（GDEY042A87 / SSD1683），接入 AQICN 空气质量 API，做一个断电也不花屏的桌面空气质量看板，含接线、完整 Arduino C++ 代码、分区方案与排错全流程。"
image: "https://img.lingflux.com/2026/07/39d31272f2976bb195ecea554654502d.jpg"
---

> **一句话摘要**：用一块十几块淘来的二手 4.2 寸黑白墨水屏和 ESP32-S3，接入 AQICN 空气质量 API，做一个不用掏手机、瞥一眼就知道今天能不能冲去爬白云山的桌面空气质量看板。

难度：⭐⭐☆☆☆（新手可上手） 预计时间：30 分钟 测试环境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 ＋ GxEPD2 v1.6.9 + Adafruit GFX Library v1.12.6 + ArduinoJson v7.4.3（建议装库时对照这个版本，太新太旧都可能踩坑）

> **TL;DR（快速上手）：**
>
> 1. 接线：GPIO11 → SDI/MOSI，GPIO12 → SCL/SCK，GPIO10 → CS，GPIO9 → DC，GPIO8 → RES，GPIO7 → BUSY，VCC 接 3.3V，GND 共地
> 2. 安装库：ArduinoJson、GxEPD2、Adafruit GFX Library、U8g2_for_Adafruit_GFX（作者 olikraus）
> 3. 把代码里的 `WIFI_SSID`、`WIFI_PASS`、`API_TOKEN` 改成自己的（Token 申请方法见下方「申请 AQICN 免费 API Token」一节）
> 4. 烧录，等 WiFi 连上，屏幕会自动刷新出空气质量数据

## 前言

十几块钱在二手市场淘了一块黑白墨水屏，说实话下单的时候心里是有点打鼓的——万一是块坏屏，这钱就打水漂了。还好上电测试一切正常，没翻车,但有一条竖线坏了，不过影响不大。趁着屏还热乎，干脆做一个能一直显示、不用手机 App、瞥一眼就知道今天白云山空气好不好的小看板，天气好就冲去爬白云山。这篇文章记录完整的接线、代码和踩过的坑，跟着做基本能一次点亮。

## 实验效果

一块 ESP32-S3 定时从 AQICN.ORG 拉取空气质量数据，刷新到墨水屏上，画面包含 AQI 大数字、12 项细分指标（PM2.5、PM10、温湿度、风速等）以及 PM2.5 和紫外线的七日预测柱状图，断电也不花屏，放桌上就是个"电子风水表"，很好的桌搭。

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/foEGSZWcxEE?si=cjtzAEnatEL7e4NY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## 元件说明

**ESP32-S3 开发板** 是一颗带 WiFi 的 SoC 开发板，负责联网拉数据、跑逻辑、通过 SPI 把画面推给屏幕，是整个项目的大脑。选它是因为引脚多、算力够、自带 WiFi，不用额外配网络模块。

**墨水屏驱动板**（自制）负责把 ESP32 发来的 SPI 指令翻译成屏幕能懂的电平信号，本质上就是个"翻译官"。选择自己画板是因为好玩。引出的接口和市面上的一样的，所以你有其他的墨水屏驱动板亦可一试。

**4.2 寸黑白电子墨水屏** 是一种靠电场翻转微胶囊里黑白粒子来显示画面的屏幕，特点是断电也能保持画面，适合做这种"看一眼就走"的信息看板。它不像 LCD 那样费电，唯一的代价是刷新慢，不适合做动画。



## BOM 表

| 元件         | 型号/规格                                    | 数量 |
| ------------ | -------------------------------------------- | ---- |
| ESP32 开发板 | ESP32-S3（带足够 SPI 引脚的型号均可）        | 1    |
| 墨水屏驱动板 | 自制 PCB，引脚定义与市面主流墨水屏驱动板一致 | 1    |
| 电子墨水屏   | 4.2 寸黑白，兼容 GxEPD2_420_GYE042A87 驱动   | 1    |
| 杜邦线       |                                              | 若干 |

## 元件引脚说明

| 引脚         | 全称             | 作用                                             |
| ------------ | ---------------- | ------------------------------------------------ |
| **VCC**      | 电源正极         | 供电输入，接 ESP32-S3 的 3V3 输出                |
| **GND**      | 电源地           | 参考地，接 ESP32-S3 的 GND，形成回路             |
| **SDI/MOSI** | 主机输出从机输入 | SPI 数据线，ESP32 往屏幕发数据                   |
| **SCL/SCK**  | 串行时钟         | SPI 时钟线，控制数据传输节奏                     |
| **CS**       | 片选             | 告诉屏幕"接下来的数据是发给你的"                 |
| **DC**       | 数据/命令切换    | 区分当前传的是画面数据还是控制命令               |
| **RES/RST**  | 复位             | 拉低一下让屏幕重新初始化                         |
| **BUSY**     | 忙状态指示       | 刷新中会拉低，ESP32 靠它判断"能不能发下一条指令" |

## 接线方式

| 墨水屏引脚 | 接 ESP32-S3 引脚 |
| ---------- | ---------------- |
| SDI/MOSI   | GPIO11           |
| SCL/SCK    | GPIO12           |
| CS         | GPIO10           |
| DC         | GPIO9            |
| RES        | GPIO8            |
| BUSY       | GPIO7            |
| VCC        | 3.3V             |
| GND        | GND              |

建议接完逐一核对，能省 80% 排错时间——墨水屏最坑的地方是接错线不会报错，只会一直花屏或者白屏，肉眼很难第一时间判断是代码问题还是接线问题。

## 需要安装的库

在 Arduino IDE 的库管理器里搜索安装以下几个（测试通过版本仅供参考，实际以库管理器最新稳定版为准）：

| 库名                  | 作用                                            | 测试版本                |
| --------------------- | ----------------------------------------------- | ----------------------- |
| ArduinoJson           | 解析 AQICN API 返回的 JSON                       | v7.4.3                  |
| GxEPD2                | 墨水屏驱动核心库                                | v1.6.9                  |
| Adafruit GFX Library  | 图形绘制基础库，GxEPD2 依赖它                   | v1.12.6                 |
| U8g2_for_Adafruit_GFX | 桥接 U8g2 中文字库到 Adafruit GFX，用于显示中文 | v1.8.0（作者 olikraus） |

`WiFi.h`、`HTTPClient.h`、`SPI.h` 是 ESP32 核心自带，不用单独安装，只要装好了 ESP32 开发板支持包就有。

## 烧录配置：分区方案（重要）

这里有个坑要先踩明白：本项目用到了 `U8g2_for_Adafruit_GFX` 的完整中文字库（代码里引用了 `u8g2_font_wqy16_t_gb2312`、`wqy14`、`wqy12` 三套），这些 GB2312 字库加起来快 500KB。而 ESP32 默认的分区方案给程序区只留了 1MB，编译时会报「空间不足（region `app' overflowed）」直接烧不进去。

**解决办法**：上传前把分区方案调大。

**操作路径**：Arduino IDE 顶部菜单 → `工具 (Tools)` → `Partition Scheme` → 选 **`Huge APP (3MB No OTA/1MB SPIFFS)`**

我用的就是这个 `Huge APP`，给程序区一口气分了 3MB，字库和代码都能舒舒服服塞进去，编译烧录一路畅通。

> 💡 几点补充：
> - **为什么字库这么大？** GB2312 收录了六七千个汉字，每套 wqy 字体都是一两百 KB 的点阵数据，没办法像西文字库那样小。
> - **No OTA 的代价**：选了 No OTA 就没法用「空中升级」刷固件，只能老老实实用 USB 线烧录。对桌面小摆件来说毫无影响，反正就放桌上插着电。
> - **大 Flash 板子的更优解**：如果你的 ESP32-S3 是 ≥8MB Flash 的版本，可以选更宽松的方案（如 `8M with SPIFFS`），既不卡 OTA，又能多出空间存数据。
> - 改完分区方案记得重新编译，别只点「上传」用旧配置。

## 申请 AQICN 免费 API Token

代码里的 `API_TOKEN` 和城市编号（如 `@14370`）都来自 AQICN（aqicn.org），免费申请，照下面四步就能拿到。

**第一步：找到你的城市**

打开 [aqicn.org](https://aqicn.org/)，在右上角搜索框输入想监控的城市或监测站名称（比如「Guangzhou」「Baiyun Mountain」），点进对应的空气质量页面。

**第二步：进入 API 数据平台**

在该城市页面向下滚动，找到标着「json: api」的链接，点进去，会跳转到 AQICN 数据平台。

**第三步：注册并激活账户**

填邮箱注册一个账号，去收件箱点激活链接完成验证。登录之后，在控制台里就能看到你专属的 **Token**（一串随机字符串，注意保密，别直接传到公开仓库里）。

**第四步：拼接 API 地址并填进代码**

把 Token 填进代码里的 `API_TOKEN` 宏，再把 `API_URL` 中的 `@14370` 换成你想要的监测站编号（也可以直接用城市英文名或经纬度坐标，写法见 [AQICN API 文档](https://aqicn.org/api/)），完整格式如下：

```
https://api.waqi.info/feed/@14370/?token=你的Token
```

想确认地址配对没问题，把上面这串粘进浏览器地址栏直接打开，能看到返回 `"status":"ok"` 的 JSON 就说明通了。

> AQICN 个人 Token 完全免费、无需绑卡，额度够个人项目随便用，不用担心收费。

## 完整代码 + 说明

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

### 代码说明

第一步，`connectWiFi()` 里做的是标准的 WiFi 连接，重试 40 次（20 秒），超时不会卡死，会继续往下走，方便离线也能先看到错误提示而不是黑屏。

第二步，`fetchAqiData()` 用 `HTTPClient` 请求 AQICN 的 `/feed/@城市ID/` 接口，拿到 JSON 后用 `ArduinoJson` 的 `JsonDocument` 解析，逐个字段填进 `AqiData` 结构体，包括当前 12 项指标和未来几天的 PM2.5/PM10/紫外线预测数组。

第三步，`drawUI()` 是整个绘图的核心，按"标题栏 → AQI 大方块 → 12 项指标网格 → 预报柱状图 → 底部状态栏"的顺序分区块画，每个区块的坐标都是写死的像素值，方便照着改布局。

第四步，中文靠 `U8g2_for_Adafruit_GFX` 这层桥接来画，`drawCN` 系列函数统一封装了黑底白字/白底黑字两种模式，避免每处都重复设置颜色。

第五步，`loop()` 里每 30 分钟刷新一次，重新初始化屏幕后调用 `drawUI()`，用完立刻 `powerOff()` 断电，这是墨水屏省电和护屏的关键——不刷新的时候完全不用给它供电。

## 常见问题排查

别慌，80% 的问题出在这几个地方：

**屏幕一直白屏/花屏**：先排查接线，尤其是 CS、DC、RES、BUSY 这四根控制线是否插错顺序；其次确认 `display.init()` 里的驱动类 `GxEPD2_420_GYE042A87` 和手上屏幕的真实型号一致，型号不对会导致时序错乱。

**中文显示成方块或乱码**：说明 `U8g2_for_Adafruit_GFX` 没有正确初始化，检查 `u8f.begin(display)` 是否在 `display.init()` 之后调用，并确认使用的字库（如 `u8g2_font_wqy14_t_gb2312`）里包含要显示的汉字。

**WiFi 连不上**：确认开发板只支持 2.4GHz，不支持 5GHz WiFi；SSID 和密码是否有中文或特殊字符导致转义问题。

**API 返回数据全是 0**：大概率是 `API_TOKEN` 没申请或者写错，也可能是 `API_URL` 里的城市 ID（如 `@14370`）不对，先用浏览器直接打开这个链接确认能返回正常 JSON。

**画面上下颠倒**：把代码里的 `ROTATION_FLIP` 从 0 改成 1，重新烧录即可，不用改接线。

**编译时报「空间不足 / region `app' overflowed」**：是中文字库太大撑爆了默认分区，按上文「烧录配置：分区方案」一节，把 `Partition Scheme` 改成 `Huge APP (3MB No OTA/1MB SPIFFS)` 再编译即可。

## FAQ 问答

**Q：ESP32-S3 换成普通 ESP32 能不能用？** A：可以，只要引脚支持 SPI 且不是被开发板占用的特殊引脚（如 Flash 相关引脚），把代码里 6 个 `EPD_*` 宏定义改成实际接线的 GPIO 编号即可，其余代码不用动。

**Q：GxEPD2_420_GYE042A87 这个驱动类不匹配我的屏幕怎么办？** A：去 GxEPD2 库的 GitHub 仓库里查对应型号的驱动类名，替换 `display` 定义那一行即可，其他绘图代码通常不需要改。

**Q：为什么刷新一次要好几秒，能不能更快？** A：黑白墨水屏的全刷新（Full Refresh）本身就慢，这是硬件特性，不是代码问题；如果只更新局部数字，可以研究 GxEPD2 的局部刷新（Partial Update）接口，但会有残影风险。

**Q：AQICN API 的免费额度够用吗？** A：AQICN 个人 Token 免费额度通常是每分钟 1000 次请求，本项目 30 分钟才请求一次，完全够用，不用担心超限。

**Q：ESP32-S3 不刷新的时候功耗大概多少？** A：代码里没有加深度睡眠，`loop()` 里用 `delay()` 挂起，实测典型功耗在几十毫安级别；如果要做电池供电版本，建议把 `delay(UPDATE_INTERVAL_MS)` 换成 `esp_deep_sleep`，功耗能降到微安级。

**Q：屏幕一直不刷新，但串口监视器显示数据抓取成功怎么办？** A：检查 `drawUI()` 里的 `display.firstPage()/nextPage()` 循环是否被中途 `return` 打断，GxEPD2 要求这个循环必须完整跑完一次才会真正把画面推到屏幕上。

## 延伸玩法

- 从 SD 卡读取本地城市列表，做成多城市轮播看板
- 接一个按键，短按手动刷新，长按切换到深度睡眠省电模式
- 把 30 分钟更新间隔改成读取环境光传感器，天黑自动降低刷新频率

## 参考资料

- [GxEPD2 库 GitHub 主页](https://github.com/ZinggJM/GxEPD2)
- [ArduinoJson 官方文档](https://arduinojson.org/)
- [U8g2_for_Adafruit_GFX GitHub 主页](https://github.com/olikraus/U8g2_for_Adafruit_GFX)
- [AQICN 空气质量 API 文档](https://aqicn.org/api/)
- [Espressif ESP32-S3 产品页](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
