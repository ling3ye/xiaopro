---
title: "ESP32-S3 + GC9A01 圓螢幕指南針翻車記：HMC5883L 實驗好玩，出門別靠它（完整教學）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/hmc5883l
category: esp32
date: 2026-06-10
intro: "用 ESP32-S3 + GC9A01 圓螢幕 + HMC5883L 做出了一個好看的電子指南針，但做完發現精度感人。本文完整記錄接線、校準、程式碼，同時說清楚為什麼這套方案只適合實驗演示，不適合正式導航應用。"
image: "https://img.lingflux.com/2026/06/79dbcadeea8dba2436b055a92f76fc20.jpg"
---



# ESP32-S3 + GC9A01 + HMC5883L 圓螢幕指南針翻車全紀錄——能做、好看，但這精度你懂的（完整教學）

難度：⭐⭐⭐☆☆（有一點基礎可上手）
預計時間：45 分鐘
測試環境：Arduino IDE 2.3.8 · Arduino_GFX_Library v1.6.5 · Adafruit_HMC5883_U v1.2.4

---

> ⚠️ **先說結論：** 這套方案做出來的指南針看著很炫，大方向對得上，但精度典型在 ±5°~±15°，受周圍磁場影響大。拿來學習驅動流程、做演示、當桌面擺件——完全夠用。用於戶外導航、無人機定向、任何精度要求嚴格的場合——**不推薦**，後面會說為什麼。

> **TL;DR（快速上手）：**
> 1. 先跑 I2C 掃描確認晶片地址——`0x0D` 是 QMC5883L（仿製），`0x1E` 才是真 HMC5883L，按型號裝對應的庫，否則讀數全是亂碼
> 2. 按接線表連好 12 根線（螢幕 8 根 + 感測器 4 根，3.3V/GND 可共用）
> 3. 把 `DECLINATION_DEG` 改成你所在城市的磁偏角（北京約 -6.5°，東京約 -7.5°，查詢連結見文末）
> 4. 上電時按住 BOOT 鍵（GPIO0）進入 15 秒旋轉校準，水平慢轉一圈
> 5. 鬆手後校準資料自動存入 NVS，斷電不丟，下次直接開用

---

## 前言

買這塊 GC9A01 圓螢幕的時候，我盯著它看了一會兒——1.28 吋，240×240，完美的正圓。這不就是天生的羅盤錶盤嗎？

然後我花了一個週末把它做出來，打開手機一比對……好吧，指標大方向是對的，就是稍微偏了一點點，大概十來度的樣子。轉多 2 圈，發覺不轉了。斷電再上電，還是不怎麼轉了。。。

「肯定是沒校準好。」我重新校準，換了個地方測，對著 iPhone 轉圈圈——差距依然在那裡，不是程式碼寫錯了，是這個感測器模組的先天侷限。可以觀察到手機靠近，也會影響到它。

所以這篇文章有兩個目的：第一，把圓螢幕指南針完整做出來，程式碼能跑，校準能過，效果確實好看；第二，把它的精度侷限講清楚，讓你在動手前就知道「翻車在哪」——而不是做完了才發現指標對不上 Google Maps。

如果你想學 GC9A01 + HMC5883L 的驅動方法，或者做一個酷炫的桌面擺件，這個專案完全值得做。如果你的目標是「導航精度」，建議直接跳到文章後面的「適不適合正式專案」那一節，再決定要不要繼續。

---

## 實驗效果

![111111 (1)](https://img.lingflux.com/2026/06/61587ad00164cf25e866feb4066e069f.jpg)

GC9A01 圓螢幕上即時顯示指南針錶盤：紅色指標指北，中央綠色數字顯示當前方位角（0°~359°），黃色字母標註最近的八方位（N / NE / E / SE / S / SW / W / NW）。上電時按住 BOOT 鍵進入 15 秒旋轉校準模式，螢幕顯示進度條和即時磁場範圍；校準完成後指標運動平滑、約 25fps，不會像未校準時那樣亂抖。



> **關於精度，先說清楚：** 校準過的 HMC5883L 在理想環境（遠離金屬和其他磁場源）下，方位角誤差約 ±5°。靠近電腦主機、充電器、喇叭或螺絲起子時，誤差輕鬆漲到 ±15° 以上。日常桌面使用「大方向沒錯」，但是我買的這個模組不知道是不是正品，有時候是會抽風不動，精確到十位數就不要指望了。這是硬體的先天侷限，不是程式碼的問題，後面的「適不適合正式專案」一節會詳細解釋。

---

## 元件說明

**GC9A01 圓形 TFT 螢幕**

想像一塊直徑 3.2 公分的圓形手錶螢幕——GC9A01 就是這個，SPI 介面，解析度 240×240，驅動內建在螢幕控制器裡，ESP32 直接推像素就行，不需要外接 RAM。之所以選它，一是圓形天生適合羅盤 UI，二是 Arduino_GFX_Library 有完整支援，驅動程式碼幾行搞定。

| 參數 | 規格 |
| --- | --- |
| 解析度 | 240 × 240 px |
| 介面 | SPI（最高 80 MHz） |
| 供電 | 3.3V |
| 背光控制 | 高電位點亮 |
| 典型功耗 | 約 20 mA（全亮） |



**GC9A01 螢幕模組（8 個腳位）**

| 腳位標註   | 功能                 |
| ---------- | -------------------- |
| VCC        | 3.3V 供電            |
| GND        | 地                   |
| SCL / CLK  | SPI 時鐘             |
| SDA / MOSI | SPI 資料（主→從）    |
| CS         | 片選，低有效         |
| DC         | 資料/命令選擇        |
| RST        | 硬體復位，低有效     |
| BL         | 背光控制，高電位點亮 |



**HMC5883L / QMC5883L 三軸磁力計**

磁力計是指南針的「鼻子」，負責感知地球磁場在 X/Y/Z 三個方向的強度，然後用反三角函數算出你面朝哪個方向。I2C 介面，3.3V 供電，讀取一次資料只需幾毫秒。

需要特別說明：市面上大多數標著「HMC5883L」的模組，實際晶片是 QST 公司的 QMC5883L——兩者腳位相容，但暫存器完全不同，對應的驅動庫也不一樣。**先別急著裝庫，按下文的 I2C 掃描步驟確認你手上是哪個晶片，再裝對應的庫，能省去大半排查時間。**

| 參數 | HMC5883L（原版） | QMC5883L（仿製） |
| --- | --- | --- |
| I2C 地址 | 0x1E | 0x0D |
| 量程 | ±8 Gauss | ±8 Gauss |
| 解析度 | 2 mGauss | 2 mGauss |
| 噪聲密度 | ~2 mGauss/√Hz | ~2 mGauss/√Hz |



**HMC5883L / QMC5883L 磁力計模組（4 個常用腳位）**

| 腳位標註 | 功能                                 |
| -------- | ------------------------------------ |
| VCC      | 3.3V 供電                            |
| GND      | 地                                   |
| SDA      | I2C 資料                             |
| SCL      | I2C 時鐘                             |
| DRDY     | 資料就緒中斷（本專案不用，不接也行） |

兩者基礎效能相近，用於實驗演示都沒問題。但需要說清楚的是：無論哪款晶片，這個價位的磁力計模組都沒有片上溫漂補償，也沒有感測器融合，只做了最基礎的二維磁場測量——這決定了它的精度上限，也決定了它只適合做演示和學習，不適合實際導航應用。

---

## BOM 表

| 元件 | 型號 / 規格 | 數量 | 參考價 |
| --- | --- | --- | --- |
| 主控開發板 | ESP32-S3（任意開發板） | 1 | ¥25~40 |
| 圓形 TFT 螢幕 | GC9A01，1.28 吋，240×240 | 1 | ¥12~20 |
| 磁力計模組 | HMC5883L 或 QMC5883L | 1 | ¥3~8 |
| 杜邦線 | 公對母，20cm | 若干 | ¥3 |

---

## 接線方式

> 建議接完之後對著表格逐根核對一遍，這一步能省掉 80% 的「為什麼沒反應」排查時間。

**GC9A01 圓螢幕 → ESP32-S3**

| 螢幕腳位 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7（或直接接 3.3V 常亮） |

**HMC5883L / QMC5883L → ESP32-S3**

| 感測器腳位 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO14 |
| SCL | GPIO13 |



---

## 需要安裝的庫

安裝前先做一件事——確認你的磁力計晶片型號。上傳下面這段程式碼，打開串口監視器（115200），看列印的 I2C 地址：

```cpp
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(13, 14);  // SDA=13, SCL=14，和本專案一致

  Serial.println("Scanning I2C...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("Found device at 0x%02X\n", addr);
    }
  }
  Serial.println("Done.");
}

void loop() {}
```

- 列印 `0x1E` → 是真 HMC5883L，裝 **Adafruit HMC5883 Unified**（作者 Adafruit）
- 列印 `0x0D` → 是 QMC5883L，需要把程式碼裡的 `#include` 和感測器物件換成對應的庫（見常見問題第 3 條）

確認晶片後，打開 Arduino IDE → 庫管理器，搜尋安裝：

| 庫名 | 適用晶片 | 測試通過版本 |
| --- | --- | --- |
| Arduino_GFX_Library | — | v1.6.5 |
| Adafruit HMC5883 Unified | HMC5883L（0x1E） | v1.2.4 |
| Adafruit Unified Sensor | 兩者都需要 | v1.1.15 |

如果你是 QMC5883L（0x0D），後面常見問題裡有替換方案。

---

## 完整程式碼

```cpp
#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>
#include <Preferences.h>
#include <math.h>

// ─── 第一步：腳位定義 ────────────────────────────────
#define TFT_SCK  12
#define TFT_MOSI 11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7
#define I2C_SDA  14
#define I2C_SCL  13

// 上電時按住此鍵進入校準模式（BOOT 鍵，GPIO0，不用另外接按鈕）
#define CAL_BTN   0

// 磁偏角（偏西為負）—— 查詢工具：https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
// 北京 ≈ -6.5°，上海 ≈ -5.5°，廣州 ≈ -3°，東京 ≈ -7.5°
// 不改這個值，指南針整體會偏 X 度，所有方向都錯
#define DECLINATION_DEG  (-3.0f)

// ─── 第二步：顯示物件初始化 ────────────────────────────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01  *gfx = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas 雙緩衝：先在記憶體裡畫好整幀，再一次性推送到螢幕，解決閃爍問題
// 記憶體佔用：240×240×2 = 115 KB（ESP32-S3 的 PSRAM 或內部 SRAM 均夠用）
Arduino_Canvas  *canvas = new Arduino_Canvas(240, 240, gfx, 0, 0);

// ─── 感測器物件 ──────────────────────────────────
Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);

// ─── 校準參數（硬鐵偏移 + 軟鐵縮放，存在 NVS 裡）───────────────────
Preferences prefs;
float calOffX = 0, calOffY = 0;
float calSclX = 1, calSclY = 1;

// ─── EMA 低通濾波參數 ────────────────────────────
float gSmooth    = 0;
bool  gFirstRead = true;

// alpha 越小越平滑（但響應越慢）；桌面擺放用 0.15，手持移動可調到 0.25
#define EMA_ALPHA  0.15f

// ─── 顏色定義（RGB565 格式）────────────────────────────────
#define C_BG      0x0000   // 黑色背景
#define C_RING    0x4208   // 深灰外環
#define C_TICK    0x7BEF   // 灰色小刻度
#define C_MAJOR   0xFFFF   // 白色主刻度 / 標籤
#define C_NORTH   0xF800   // 紅色 N
#define C_NDL_N   0xF800   // 紅針（北端）
#define C_NDL_S   0xCE79   // 銀色針（南端）
#define C_DEG     0x07E0   // 綠色度數
#define C_DIR     0xFFE0   // 黃色方向字母

const char* kDir[] = {"N","NE","E","SE","S","SW","W","NW"};

#define CX 120   // 圓心 X
#define CY 120   // 圓心 Y
#define R  100   // 錶盤半徑

// ─────────────────────────────────────────────
//  讀取方位角（含硬鐵/軟鐵校準修正）
// ─────────────────────────────────────────────
float readHeading() {
  sensors_event_t ev;
  mag.getEvent(&ev);

  // 減去硬鐵偏移，消除周圍固定磁場（螺絲、銅柱等）的干擾
  float x = ev.magnetic.x - calOffX;
  float y = ev.magnetic.y - calOffY;
  // 軟鐵歸一化：把橢圓形的磁場響應映射回圓形
  if (calSclX > 0.01f) x /= calSclX;
  if (calSclY > 0.01f) y /= calSclY;

  float h = atan2f(y, x) + DECLINATION_DEG * (float)M_PI / 180.0f;
  if (h <  0)               h += 2.0f * (float)M_PI;
  if (h > 2.0f*(float)M_PI) h -= 2.0f * (float)M_PI;
  return h * 180.0f / (float)M_PI;
}

// ─────────────────────────────────────────────
//  EMA 低通濾波（正確處理 0°/360° 環繞跳變）
// ─────────────────────────────────────────────
float emaFilter(float newAngle) {
  if (gFirstRead) { gFirstRead = false; return newAngle; }
  float d = newAngle - gSmooth;
  if (d >  180.0f) d -= 360.0f;   // 比如從 359° 跳到 1°，差值應該是 +2°，而不是 -358°
  if (d < -180.0f) d += 360.0f;
  float r = gSmooth + d * EMA_ALPHA;
  if (r <   0.0f) r += 360.0f;
  if (r >= 360.0f) r -= 360.0f;
  return r;
}

// ─────────────────────────────────────────────
//  全幀渲染（畫完整幀再推螢幕，杜絕閃爍）
// ─────────────────────────────────────────────
void drawFrame(float angle) {
  canvas->fillScreen(C_BG);

  // 外環（4 像素寬，給錶盤加一個邊框感）
  for (int r = R; r > R - 4; r--)
    canvas->drawCircle(CX, CY, r, C_RING);

  // 刻度線：每 10° 一根，每 30° 加長，每 90° 用白色
  for (int deg = 0; deg < 360; deg += 10) {
    float rad = deg * (float)M_PI / 180.0f;
    int   len = (deg % 30 == 0) ? 12 : 6;
    canvas->drawLine(
      CX + (int)(cosf(rad) * (R - 5)),    CY + (int)(sinf(rad) * (R - 5)),
      CX + (int)(cosf(rad) * (R-5-len)),  CY + (int)(sinf(rad) * (R-5-len)),
      (deg % 90 == 0) ? C_MAJOR : C_TICK
    );
  }

  // N/E/S/W 標籤，N 用紅色醒目
  canvas->setTextSize(2);
  canvas->setTextColor(C_NORTH); canvas->setCursor(CX-6,    CY-R+20);  canvas->print("N");
  canvas->setTextColor(C_MAJOR); canvas->setCursor(CX+R-32, CY-7);     canvas->print("E");
                                 canvas->setCursor(CX-6,    CY+R-32);  canvas->print("S");
                                 canvas->setCursor(CX-R+20, CY-7);     canvas->print("W");

  // 指標（3 像素寬，視覺更清晰）
  float rad  = angle * (float)M_PI / 180.0f;
  float perp = rad + (float)M_PI / 2.0f;
  int   pdx  = (int)roundf(cosf(perp));
  int   pdy  = (int)roundf(sinf(perp));
  int   nx   = CX + (int)(sinf(rad) * 68);   // 紅針（指北端）
  int   ny   = CY - (int)(cosf(rad) * 68);
  int   sx   = CX - (int)(sinf(rad) * 42);   // 銀針（指南端，短一點）
  int   sy   = CY + (int)(cosf(rad) * 42);
  for (int d = -1; d <= 1; d++) {
    canvas->drawLine(CX+pdx*d, CY+pdy*d, nx+pdx*d, ny+pdy*d, C_NDL_N);
    canvas->drawLine(CX+pdx*d, CY+pdy*d, sx+pdx*d, sy+pdy*d, C_NDL_S);
  }

  // 中心軸小圓（裝飾用）
  canvas->fillCircle(CX, CY, 9, C_RING);
  canvas->drawCircle(CX, CY, 9, 0xA534);
  canvas->fillCircle(CX, CY, 3, C_MAJOR);

  // 中央顯示度數（綠色）和八方位字母（黃色）
  canvas->setTextSize(2);
  canvas->setTextColor(C_DEG);
  char buf[8]; sprintf(buf, "%3d", (int)angle);
  canvas->setCursor(CX - 18, CY - 14); canvas->print(buf);

  int   idx = ((int)(angle + 22.5f) % 360) / 45;
  int   w   = strlen(kDir[idx]) * 6;
  canvas->setTextSize(1);
  canvas->setTextColor(C_DIR);
  canvas->setCursor(CX - w/2, CY + 6); canvas->print(kDir[idx]);

  canvas->flush();   // ← 整幀一次性推送到螢幕，這一行是解決閃爍的關鍵
}

// ─────────────────────────────────────────────
//  15 秒旋轉校準
//  原理：記錄感測器在各方向的最大/最小值，
//       算出硬鐵偏移（offset）和軟鐵縮放（scale）
// ─────────────────────────────────────────────
void runCalibration() {
  float minX =  1e6f, maxX = -1e6f;
  float minY =  1e6f, maxY = -1e6f;
  const uint32_t DUR = 15000;
  uint32_t t0 = millis();

  while (millis() - t0 < DUR) {
    sensors_event_t ev; mag.getEvent(&ev);
    if (ev.magnetic.x < minX) minX = ev.magnetic.x;
    if (ev.magnetic.x > maxX) maxX = ev.magnetic.x;
    if (ev.magnetic.y < minY) minY = ev.magnetic.y;
    if (ev.magnetic.y > maxY) maxY = ev.magnetic.y;

    // 即時顯示校準進度畫面
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR);  canvas->setTextSize(2);
    canvas->setCursor(15, 60);  canvas->print("CALIBRATING");
    canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
    canvas->setCursor(8, 95);   canvas->print("Slowly rotate 360 deg");
    canvas->setCursor(18, 109); canvas->print("Keep device level");
    // 進度條
    int p = (millis() - t0) * (R*2-2) / DUR;
    canvas->drawRect(20, 130, R*2, 14, C_MAJOR);
    canvas->fillRect(21, 131, p, 12, 0x07E0);
    // 即時顯示磁場範圍（幫助確認是否轉滿了一圈）
    char b[44];
    canvas->setTextColor(0x7BEF);
    sprintf(b, "X[%.1f ~ %.1f]", minX, maxX);
    canvas->setCursor(8, 157); canvas->print(b);
    sprintf(b, "Y[%.1f ~ %.1f]", minY, maxY);
    canvas->setCursor(8, 170); canvas->print(b);
    canvas->flush();
    delay(50);
  }

  // 計算偏移和縮放
  calOffX = (maxX + minX) / 2.0f;
  calOffY = (maxY + minY) / 2.0f;
  calSclX = (maxX - minX) / 2.0f;  if (calSclX < 0.01f) calSclX = 1.0f;
  calSclY = (maxY - minY) / 2.0f;  if (calSclY < 0.01f) calSclY = 1.0f;

  // 儲存到 NVS（斷電不丟）
  prefs.begin("compass", false);
  prefs.putFloat("offX", calOffX);  prefs.putFloat("offY", calOffY);
  prefs.putFloat("sclX", calSclX);  prefs.putFloat("sclY", calSclY);
  prefs.end();

  // 校準結果畫面
  canvas->fillScreen(C_BG);
  canvas->setTextColor(0x07E0); canvas->setTextSize(2);
  canvas->setCursor(30, 88); canvas->print("CAL DONE!");
  canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
  char b[44];
  sprintf(b, "offX = %.1f", calOffX); canvas->setCursor(10, 120); canvas->print(b);
  sprintf(b, "offY = %.1f", calOffY); canvas->setCursor(10, 133); canvas->print(b);
  sprintf(b, "sclX = %.1f", calSclX); canvas->setCursor(10, 148); canvas->print(b);
  sprintf(b, "sclY = %.1f", calSclY); canvas->setCursor(10, 161); canvas->print(b);
  canvas->flush();
  delay(3000);
}

// ─────────────────────────────────────────────
//  從 NVS 載入上次儲存的校準資料
// ─────────────────────────────────────────────
void loadCalibration() {
  prefs.begin("compass", true);
  calOffX = prefs.getFloat("offX", 0.0f);
  calOffY = prefs.getFloat("offY", 0.0f);
  calSclX = prefs.getFloat("sclX", 1.0f);
  calSclY = prefs.getFloat("sclY", 1.0f);
  prefs.end();
  if (calSclX < 0.01f) calSclX = 1.0f;
  if (calSclY < 0.01f) calSclY = 1.0f;
  Serial.printf("[CAL] off=(%.2f, %.2f)  scl=(%.2f, %.2f)\n",
                calOffX, calOffY, calSclX, calSclY);
}

// ─────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TFT_BL, OUTPUT); digitalWrite(TFT_BL, HIGH);  // 背光點亮
  pinMode(CAL_BTN, INPUT_PULLUP);

  gfx->begin();
  canvas->begin();       // 分配幀緩衝，此時消耗約 115 KB 記憶體

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000); // 400 kHz 快速模式，降低 I2C 讀取延遲

  if (!mag.begin()) {
    // 感測器找不到時，螢幕顯示紅色錯誤提示
    canvas->fillScreen(0xF800);
    canvas->setTextColor(0xFFFF); canvas->setTextSize(2);
    canvas->setCursor(10, 100); canvas->print("SENSOR ERROR");
    canvas->setCursor(10, 125); canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(500);
  }

  loadCalibration();

  // 上電時按住 BOOT(GPIO0) → 進入旋轉校準
  if (digitalRead(CAL_BTN) == LOW) {
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR); canvas->setTextSize(1);
    canvas->setCursor(10, 112); canvas->print("Release to start cal...");
    canvas->flush();
    while (digitalRead(CAL_BTN) == LOW) delay(10);
    delay(500);
    runCalibration();
  }

  // 丟棄前幾個不穩定的熱機讀數
  for (int i = 0; i < 8; i++) {
    sensors_event_t ev; mag.getEvent(&ev); delay(15);
  }
  gSmooth    = readHeading();
  gFirstRead = false;
}

// ─────────────────────────────────────────────
//  Loop：讀數 → 濾波 → 渲染，循環約 25fps
// ─────────────────────────────────────────────
void loop() {
  float raw = readHeading();
  gSmooth   = emaFilter(raw);
  drawFrame(gSmooth);
  delay(30);  // 30ms ≈ 33fps，實際加上渲染時間約 25fps
}
```

### 程式碼說明

**為什麼要用 Canvas？** `Arduino_Canvas` 相當於在記憶體裡開了一塊 115KB 的「草稿紙」，先把整幀畫完，再用 `canvas->flush()` 一次性推到螢幕。如果直接往螢幕上畫，每一筆都會立刻顯示，指標轉動時會明顯閃爍。Canvas 解決了這個問題，代價是多佔一塊記憶體。

**`readHeading()` 做了什麼？** 從感測器拿到的 X/Y 磁場強度，減去硬鐵偏移（消除固定磁場干擾），再除以軟鐵縮放係數（修正各軸靈敏度不一致），最後加上磁偏角修正，得到真北方向的角度。

**`emaFilter()` 為什麼要處理環繞？** 如果指標從 359° 轉到 1°，兩個讀數之差是 -358°，如果直接做加權平均，指標會反方向轉一大圈。程式碼裡先把差值限制在 [-180°, +180°] 範圍內，再做平滑，就能正確處理跨越 0° 的情況。

**校準原理是什麼？** 在水平面內轉一圈，感測器的 X/Y 讀數會描繪出一個橢圓（理想情況是圓）。記錄最大最小值，中點就是硬鐵偏移，半徑就是軟鐵縮放係數。校準完成後，資料存入 NVS（類似手機裡的 EEPROM），下次上電自動載入，不需要每次重新校準。

---

## 常見問題排查

別慌，90% 的問題出在這幾個地方。

**螢幕全黑或全白，什麼都不顯示。** 先檢查 BL（背光）腳位是否高電位——如果接的是 GPIO7，確認程式碼裡有 `digitalWrite(TFT_BL, HIGH)`；如果直接接 3.3V，背光應該一直亮，黑屏說明別的腳位有問題。再對照接線表逐根確認 CS、DC、RST 是否接到了正確的 GPIO，其中 CS 和 DC 接反是高頻失誤。

**串口列印 `SENSOR ERROR`，螢幕顯示紅色報錯。** 磁力計沒響應，大概率是 I2C 接線問題——SDA/SCL 接反了，或者接到了不同的 GPIO。確認 `Wire.begin(13, 14)` 對應的是你實際接的腳位。另一個可能是模組沒有 3.3V 供電，用萬用表量一下 VCC 腳。

**指標亂跳，完全不準，或者一直停在某個方向不動。** 最可能的原因是你的模組是 QMC5883L（0x0D），但程式碼用的是 HMC5883L 的庫——兩個庫暫存器定義完全不同，讀出來的數就是亂的。先跑 I2C 掃描確認地址，如果是 0x0D，需要把程式碼裡的 `#include <Adafruit_HMC5883_U.h>` 和感測器物件換成 QMC5883LCompass 庫的寫法，網路上有現成的適配範例。

**校準完了，但指向還是偏了 10°~20°。** 檢查 `DECLINATION_DEG` 有沒有改成你所在城市的值，這個參數差了 5° 就會讓所有方向都系統性偏移。東京約 -7.5°，北京約 -6.5°，準確值用文末的 NOAA 工具查詢。另一個原因是校準時周圍有強磁場（手機、螺絲起子、喇叭磁鐵），換個空曠的地方重新校準一次。

**編譯報錯 `Adafruit_HMC5883_U.h: No such file or directory`。** 庫沒裝或者裝錯了。打開 Arduino IDE → 工具 → 管理庫，搜尋 `HMC5883`，安裝 Adafruit HMC5883 Unified 以及它依賴的 Adafruit Unified Sensor。

---

## FAQ 問答

**Q：HMC5883L 和 QMC5883L 有什麼區別？能用同一個庫驅動嗎？**
A：不能混用。兩者腳位完全相容（焊上去外形一樣），但內部暫存器地址不同，驅動協議不同，用錯庫讀出來全是無意義的數值。HMC5883L 的 I2C 地址是 0x1E，QMC5883L 是 0x0D，用 I2C 掃描一秒鐘就能確認。

**Q：BL 背光腳位能直接接 3.3V 嗎，還是必須接 GPIO？**
A：直接接 3.3V 完全可以，螢幕會全程常亮。用 GPIO 控制的好處是可以在程式碼裡控制亮度或者休眠時關掉背光省電。如果不需要這些功能，接 3.3V 省一個 GPIO。

**Q：`DECLINATION_DEG` 怎麼查我城市的準確值？**
A：用 NOAA 提供的磁偏角計算工具（見文末參考資料），輸入你的城市座標，Model 選 WMM，會給出當前日期的精確磁偏角。偏東為正值，偏西為負值。日本東部城市普遍在 -7° 到 -8° 之間，中國東部沿海約 -5° 到 -6°。

**Q：`EMA_ALPHA` 調大或調小有什麼區別？**
A：alpha 越大，指標響應越快，但越容易抖動；越小，指標越平滑，但轉動時有明顯的拖尾感。0.15 適合平放在桌面的場景；如果是手持走動，可以調到 0.25 ~ 0.3。取值範圍是 0.0（完全不動）到 1.0（不濾波，原始值）。

**Q：校準資料存在哪？換了電腦重新燒錄程式碼後還在嗎？**
A：校準資料存在 ESP32 的 NVS（非易失性儲存，類似 EEPROM），燒錄新程式碼不會清除 NVS，下次上電直接載入。只有執行「擦除所有 Flash」操作時才會丟失，屆時需要重新校準一次。

**Q：115 KB 的幀緩衝會不會太大？ESP32-C3 能用嗎？**
A：ESP32-S3 有 512KB SRAM，115KB 沒問題。ESP32-C3 只有 400KB SRAM，加上程式碼和堆疊，實測會比較緊張，建議用 PSRAM 版本或者改用更小尺寸的螢幕。原版 ESP32（WROOM / WROVER）的 SRAM 更少，WROVER 版帶 PSRAM 的可以用，WROOM 無 PSRAM 版大概率 OOM 當機。

**Q：為什麼我的指南針和手機差了十幾度，是正常的嗎？**
A：在這套方案裡，差十幾度是完全正常的現象，不是 bug。HMC5883L/QMC5883L 在有干擾的真實環境裡，±10°~±15° 是常見誤差範圍。如果誤差穩定在 ±5° 以內，已經算校準得不錯了。想讓誤差更小，需要換精度更高的感測器並引入九軸融合，單靠調參數不夠。

**Q：能不能用這套方案做正式的導航或定向產品？**
A：不推薦。精度只有 ±5°~±15°，受周圍磁場環境影響大，也沒有傾斜補償——只要不是嚴格水平放置，誤差就會明顯增大。做演示、學習原理、當桌面擺件完全夠用；需要實際導航精度的場合，建議換 ICM-20948 這類帶硬體感測器融合的方案。

---

## HMC5883L 適不適合正式專案？

直接說結論：不適合。

實驗演示沒問題，學習驅動流程、展示 maker 專案、桌面擺件——都可以。但如果你在做一個真正需要方向感知的產品，這套方案有三個繞不過去的問題：

第一，沒有傾斜補償。模組一旦不是水平放置，方位角誤差就快速增加——歪 20° 能帶來超過 10° 的方向偏差。iPhone 用加速度計即時補償這個誤差，這塊模組本身做不到，需要額外接 MPU6050 並修改演算法。

第二，受環境磁場影響嚴重。旁邊的電腦電源、USB 線、金屬支架都會汙染讀數，而且這種干擾是動態的，校準一次存入 NVS 並不能補償運動中即時變化的磁場。

第三，市售模組品質參差不齊。大多數是 QMC5883L 仿製版，沒有原版 HMC5883L 的片上溫漂補償，溫度變化時讀數會飄。

如果你的專案需要可靠的方向感知，更合適的選擇是 ICM-20948（整合九軸感測器 + 硬體 DMP 融合），或者直接用 GPS 模組結合兩點座標計算朝向——精度和穩定性不是一個量級。

這個專案的正確定位是：麻雀雖小五臟俱全的學習樣本。它讓你完整走一遍「磁力計驅動 → 硬鐵校準 → 濾波 → 顯示」的完整鏈路，這套知識用到更好的感測器上完全通用。

---

## 延伸玩法

做完基礎款，有幾個方向可以接著探索：

加一塊 MPU6050 六軸感測器，讀取加速度計資料做傾斜補償。這是上面提到的最大侷限之一——現在這個版本只有 2D 磁場，裝置稍微歪一點就會產生明顯誤差；加上傾斜補償後豎著拿也能保持準確，這也是 iPhone 指南針穩定的核心原因之一。這是讓這個專案「從玩具升級到可用」最值得做的一步。

接一塊 SD 卡模組，用 LVGL 或者自己畫的地圖疊加指南針方向，做一個離線導航儀。圓螢幕的顯示面積有限，但顯示當前朝向和目標方向的箭頭完全夠用。

把方位角資料透過 Wi-Fi 推送到 MQTT broker，接入 Home Assistant 或者自己的 dashboard，做成一個桌面方向感知感測器，用於判斷門窗朝向或天線對準。

---

## 參考資料

- HMC5883L 原廠資料手冊（Honeywell）：https://cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf
- QMC5883L 資料手冊（QST）：https://datasheetspdf.com/pdf/1309218/QST/QMC5883L/1
- Arduino_GFX_Library GitHub：https://github.com/moononournation/Arduino_GFX
- Adafruit_HMC5883_U GitHub：https://github.com/adafruit/Adafruit_HMC5883_U
- ESP32-S3 產品頁（Espressif）：https://www.espressif.com/en/products/socs/esp32-s3
- 磁偏角查詢工具（NOAA）：https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
