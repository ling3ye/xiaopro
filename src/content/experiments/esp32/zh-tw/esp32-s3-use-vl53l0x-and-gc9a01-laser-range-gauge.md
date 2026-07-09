---
title: "ESP32-S3 驅動 GC9A01 圓屏 + VL53L0X-V2 雷射測距 完整教學（SPI 接線 + I2C 地雷迴避）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/vl53l0x
category: esp32
date: 2026-07-09
intro: "用 ESP32-S3 驅動 GC9A01 1.28 英吋圓形螢幕，配合 VL53L0X-V2 雷射測距感測器，做一個會即時擺動指針、弧線隨距離變色的賽博龐克雷射測距儀表板，附 SPI+I2C 腳位衝突避雷與全部 Arduino 原始碼。"
image: "https://img.lingflux.com/2026/07/68114f0f73885a81414b9432bd0d95eb.jpg"
---



# ESP32-S3 驅動 GC9A01 圓屏 + VL53L0X-V2 雷射測距：從接線到點亮賽博儀表板（附全部程式碼）

難度：⭐⭐⭐☆☆（有一點基礎的 maker 可上手，需要一點排線耐心）
預計時間：45 分鐘
測試環境：Arduino IDE 2.3.8 + ESP32 Core 3.3.10 + Arduino_GFX_Library v1.6.5 + Adafruit_VL53L0X v1.2.5

---

> **TL;DR（快速上手）：**
>
> 1. 螢幕接線：GPIO12→SCL、GPIO11→SDA、GPIO9→CS、GPIO10→DC、GPIO18→RST、GPIO7→BL
> 2. 感測器接線：GPIO13→SDA、GPIO14→SCL（**注意不是預設 I2C 腳位**，因為 GPIO9 已經被螢幕 CS 占用了）
> 3. 裝兩個函式庫：`Arduino_GFX_Library`、`Adafruit_VL53L0X`
> 4. 先燒錄「感測器測試程式」，序列埠能看到距離數字再燒主程式
> 5. 燒錄主程式，圓屏上就會出現一個會轉指針、會變色的雷射測距儀表板

---

## 前言：為什麼要折騰這個圓屏儀表板

雷射測距（ToF）模組大家玩得很多，但大多數人的玩法還停留在「序列埠印數字」的階段。這個專案的目的很簡單：利用 ESP32-S3 的效能和 GC9A01 圓屏的視覺優勢，把抽象的距離資料變成一套兼具實用性和賽博龐克感的高更新率儀表板。

專案的核心難點不在邏輯，而在於 顯示器 SPI 介面與感測器 I2C 介面的腳位衝突。為瞭解決開發板預設腳位「打架」導致初始化失敗的問題，我重新調整了硬體腳位映射。以下是完整的避雷指南與主程式實作。

## 實驗效果展示

最終效果是這樣的：圓屏上畫一個類似賽車轉速表的弧形刻度盤，指針會即時指向當前量測到的距離，弧線顏色從紅（近/危險）過渡到綠（遠/安全），圓心顯示具體的毫米數和狀態文字（DANGER / WARNING / CAUTION / SAFE / CLEAR）。手在感測器前面晃一晃，指針跟著即時擺動，還挺解壓的。

## 元件說明

開發板（ESP32-S3）就不多介紹了，重點說說另外兩個主角。

### GC9A01 240×240 圓屏

GC9A01 是一顆專門給圓形螢幕用的顯示驅動晶片，負責把你送過去的像素資料「翻譯」成螢幕上的畫面——你說畫什麼，它負責怎麼畫，中間的刷新、掃描全是它在處理，你只管呼叫 API。

| 參數   | 數值                |
| ------ | ------------------- |
| 解析度 | 240×240             |
| 尺寸   | 1.28 英吋           |
| 介面   | SPI                 |
| 色深   | 65K 色（RGB565）    |
| 驅動庫 | Arduino_GFX_Library |

選它是因為價格便宜、圓形螢幕做儀表板天生好看，而且 SPI 介面速度夠快，指針轉動不會拖影。

### VL53L0X-V2 雷射測距感測器

VL53L0X 是一顆基於飛行時間（ToF）原理的雷射測距感測器，說人話就是：它發一道你看不見的紅外雷射出去，掐著碼錶算雷射打到物體再反射回來的時間，從而反推出距離——跟蝙蝠的回聲定位是一個思路，只不過它用的是光，不是聲音。

| 參數     | 數值                                    |
| -------- | --------------------------------------- |
| 量測範圍 | 30mm～1200mm（長距離模式最遠約 2000mm） |
| 測距精度 | ±3%                                     |
| 通訊介面 | I2C（最高 400kHz）                      |
| 雷射波長 | 940nm（人眼不可見，Class 1 雷射，安全） |

選它是因為不受被測物顏色/材質影響（紅外測距和超音波比，幾乎不挑表面），體積小到能塞進任何外殼裡，I2C 接線只要兩根訊號線。

> 💡 **小提醒：這模組一般不帶光学蓋片（我買的時候也忘了一起買）**
>
> 開發測試階段裸奔完全沒問題，但有些小坑值得提前知道：
>
> - **別用手指戳晶片表面**：晶片上那兩個比芝麻還小的玻璃窗口（一發一收）怕灰、怕油、怕水氣。髒了之後灰塵會把雷射散射回來，造成「串擾（crosstalk）」，測距會莫名變短、數字亂跳，嚴重時直接失效。
> - **萬一髒了別亂擦**：千萬別拿衣角或衛生紙去擦（一擦就花）。有灰就用**氣吹（吹氣球）**吹一下，有油就用棉花棒蘸一點點**無水酒精**極輕地抹一下，晾乾即可。
> - **強光下會「變瞎」**：太陽光和老舊白熾燈裡含紅外，沒蓋片裸奔時最大測距會明顯縮水，室內桌面測試基本無感，搬去室外玩要心裡有數。
>
> 如果以後打算裝進外殼長期用：**千萬別拿普通透明膠帶或玻璃直接糊在晶片前面**——普通材質會反射紅外光，感測器會把蓋片誤當成障礙物，直接鎖死在 `0mm` 或幾公分。要嘛留個孔讓它探出來，要嘛老老實實買塊 **940nm 紅外濾光片**，而且貼得越近越好（間距小於 1mm）。

## BOM 表（元件清單）

| 元件                     | 數量 | 備註                        |
| ------------------------ | ---- | --------------------------- |
| ESP32-S3 開發板          | 1    | 任意帶足夠 GPIO 的型號即可  |
| GC9A01 1.28 吋圓屏（SPI）| 1    | 確認是 SPI 版本，不是並口版 |
| VL53L0X-V2 ToF 測距模組  | 1    | 麵包板模組款                |
| 杜邦線                   | 若干 |                             |

## 元件腳位說明

### GC9A01 腳位

| 腳位     | 作用                                         |
| -------- | -------------------------------------------- |
| VCC      | 電源正極，接 3.3V                            |
| GND      | 電源地                                       |
| SCL/CLK  | SPI 時鐘線                                   |
| SDA/MOSI | SPI 資料線                                   |
| CS       | 晶片選擇，低電位時晶片工作                   |
| DC       | 資料/命令切換腳                              |
| RST      | 重置腳                                       |
| BL       | 背光控制腳（可能有些模組沒有引出，可不用管） |

### VL53L0X-V2 腳位

| 腳位  | 作用                                                         |
| ----- | ------------------------------------------------------------ |
| VIN   | 電源正極                                                     |
| GND   | 電源地                                                       |
| SCL   | I2C 串列時脈輸入                                             |
| SDA   | I2C 串列資料                                                 |
| GPIO1 | 中斷輸出腳，指示資料是否準備好（本專案用不到，可懸空）       |
| XSHUT | 關閉腳，預設拉高為正常工作，拉低進入關閉模式（本專案用不到，可懸空） |

## 接線方式

建議按下表逐行接完，每接一根在旁邊打個勾，能省 80% 的除錯時間。

### ESP32-S3 接 GC9A01 螢幕

| GC9A01 螢幕 | ESP32-S3                                                     |
| ----------- | ------------------------------------------------------------ |
| VCC         | 3.3V                                                         |
| GND         | GND                                                          |
| SCL / CLK   | GPIO12                                                       |
| SDA / MOSI  | GPIO11                                                       |
| CS          | GPIO9                                                        |
| DC          | GPIO10                                                       |
| RST         | GPIO18                                                       |
| BL          | GPIO7（程式控制）或直接接 3.3V（部分開發板沒有獨立背光控制） |

### ESP32-S3 接 VL53L0X-V2 感測器

| VL53L0X-V2 | ESP32-S3                 |
| ---------- | ------------------------ |
| VIN        | 3.3V                     |
| GND        | GND                      |
| SDA        | GPIO13                   |
| SCL        | GPIO14                   |
| GPIO1      | 懸空不接                 |
| XSHUT      | 懸空不接（內部預設拉高） |

> ⚠️ **注意**：ESP32-S3 的預設 I2C 腳位通常是 GPIO8（SDA）/GPIO9（SCL），但本專案裡 GPIO9 已經被螢幕的 CS 占用了，所以感測器的 I2C 手動改到了 GPIO13/GPIO14。程式裡用 `Wire.begin(I2C_SDA, I2C_SCL)` 指定了這兩個腳位，接線時千萬別圖省事接回預設腳，不然螢幕和感測器會互相打架，誰都用不了。

## 需要安裝的函式庫

Arduino IDE 裡透過「函式庫管理員」搜尋安裝：

- `Arduino_GFX_Library`（作者 moononournation）—— 測試通過版本 v1.6.5
- `Adafruit_VL53L0X`（作者 Adafruit）—— 測試通過版本 v1.2.5，安裝時會提示一併安裝 `Adafruit BusIO`，一起裝上

IDE 版本：Arduino IDE 2.3.8，ESP32 開發板支援包用的是 3.3.10。版本差太多可能會遇到 API 不相容，建議對齊著裝。

## 完整程式碼

### 儀表板主程式

```cpp
/*
 * ═══════════════════════════════════════════════════════
 *  賽博儀表板 · Cyber Gauge Dashboard
 *  圓屏 GC9A01 (240×240) + VL53L0X-V2 雷射測距
 *  MCU: ESP32-S3
 *  驅動庫: Arduino_GFX_Library v1.6.5
 * ═══════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <Arduino_GFX_Library.h>

// ───────── 顏色定義（Arduino_GFX v1.6.5 需手動定義）─────────
#define BLACK       0x0000
#define WHITE       0xFFFF
#define RED         0xF800
#define GREEN       0x07E0
#define BLUE        0x001F
#define CYAN        0x07FF
#define YELLOW      0xFFE0
#define ORANGE      0xFD20
#define DARKGREY    0x4208
#define LIGHTGREY   0xC618

// 賽博主題色
#define CYBER_BG      0x0841    // 深邃背景
#define CYBER_PANEL   0x1082    // 面板色
#define CYBER_BLUE    0x06DF    // 螢光藍
#define CYBER_CYAN    0x07F5    // 螢光青
#define CYBER_GREEN   0x47E0    // 螢光綠
#define CYBER_RED     0xF806    // 警告紅
#define CYBER_ORANGE  0xFB40    // 橙色
#define CYBER_YELLOW  0xFF80    // 黃色
#define CYBER_DIM     0x4A49    // 暗淡色

// ───────── 腳位定義 ─────────
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// VL53L0X 單獨走 I2C，避開被 TFT_CS 占用的 GPIO9
#define I2C_SDA   13
#define I2C_SCL   14

// ───────── 螢幕尺寸 ─────────
#define SCREEN_W  240
#define SCREEN_H  240
#define CX        120     // 圓心X
#define CY        120     // 圓心Y

// ───────── 儀表板參數 ─────────
#define GAUGE_R       95      // 刻度弧半徑
#define GAUGE_WIDTH   10      // 弧線寬度
#define NEEDLE_LEN    78      // 指針長度
#define START_ANGLE   135     // 起始角度 (度)
#define END_ANGLE     405     // 結束角度 (度)
#define MAX_DIST      800     // 最大顯示距離 mm
#define MIN_DIST      20      // 最小距離 mm
#define TICK_COUNT    16      // 刻度數量

// ───────── 全域物件 ─────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1 /* MISO */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0 /* rotation */, true /* IPS */
);

Adafruit_VL53L0X lox = Adafruit_VL53L0X();
Arduino_Canvas *canvas;   // 離屏畫布，消除閃爍

// ───────── 狀態變數 ─────────
float currentAngle = START_ANGLE;
float targetAngle  = START_ANGLE;
int   currentDist  = 0;
int   lastDist     = -1;

// ═══════════════════════════════════════
//  工具函式
// ═══════════════════════════════════════

// RGB565 顏色混合
uint16_t blendColor(uint16_t c1, uint16_t c2, float t) {
  uint8_t r1 = (c1 >> 11) & 0x1F, g1 = (c1 >> 5) & 0x3F, b1 = c1 & 0x1F;
  uint8_t r2 = (c2 >> 11) & 0x1F, g2 = (c2 >> 5) & 0x3F, b2 = c2 & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// 根據距離取得顏色 (近=紅, 遠=綠)
uint16_t getDistColor(int dist) {
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  if (ratio < 0.15)  return CYBER_RED;
  if (ratio < 0.30)  return blendColor(CYBER_RED, CYBER_ORANGE, (ratio - 0.15) / 0.15);
  if (ratio < 0.50)  return blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.30) / 0.20);
  if (ratio < 0.70)  return blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.50) / 0.20);
  return blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.70) / 0.30);
}

// 取得狀態文字
const char* getStatusText(int dist) {
  if (dist < 100) return "DANGER";
  if (dist < 200) return "WARNING";
  if (dist < 400) return "CAUTION";
  if (dist < 600) return "SAFE";
  return "CLEAR";
}

// ═══════════════════════════════════════
//  繪圖函式
// ═══════════════════════════════════════

// 畫粗弧線 (用多段短線模擬)
void drawArc(Arduino_Canvas *c, int cx, int cy, int r,
             float startDeg, float endDeg, int thickness,
             uint16_t color) {
  float step = 1.5;  // 每步角度
  for (float a = startDeg; a <= endDeg; a += step) {
    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// 畫漸層弧線
void drawGradientArc(Arduino_Canvas *c, int cx, int cy, int r,
                     float startDeg, float endDeg, int thickness) {
  float totalAngle = endDeg - startDeg;
  float step = 1.5;

  for (float a = startDeg; a <= endDeg; a += step) {
    float ratio = (a - startDeg) / totalAngle;
    uint16_t color;

    // 紅 -> 橙 -> 黃 -> 青 -> 綠
    if (ratio < 0.2)       color = blendColor(CYBER_RED, CYBER_ORANGE, ratio / 0.2);
    else if (ratio < 0.4)  color = blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.2) / 0.2);
    else if (ratio < 0.6)  color = blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.4) / 0.2);
    else                   color = blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.6) / 0.4);

    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// 畫刻度線
void drawTicks(Arduino_Canvas *c) {
  float totalAngle = END_ANGLE - START_ANGLE;

  for (int i = 0; i <= TICK_COUNT; i++) {
    float angle = START_ANGLE + (float)i / TICK_COUNT * totalAngle;
    float rad = angle * DEG_TO_RAD;
    float ratio = (float)i / TICK_COUNT;

    // 刻度顏色
    uint16_t color;
    if (ratio < 0.2)       color = CYBER_RED;
    else if (ratio < 0.4)  color = CYBER_ORANGE;
    else if (ratio < 0.6)  color = CYBER_YELLOW;
    else if (ratio < 0.8)  color = CYBER_CYAN;
    else                   color = CYBER_GREEN;

    // 長/短刻度
    bool isMajor = (i % 4 == 0);
    int innerR  = GAUGE_R + 4;
    int outerR  = innerR + (isMajor ? 12 : 6);
    int thick   = isMajor ? 2 : 1;

    int x1 = CX + cos(rad) * innerR;
    int y1 = CY + sin(rad) * innerR;
    int x2 = CX + cos(rad) * outerR;
    int y2 = CY + sin(rad) * outerR;

    // 畫刻度線
    for (int t = 0; t < thick; t++) {
      c->drawLine(x1 + t, y1, x2 + t, y2, color);
    }

    // 主刻度標注數字
    if (isMajor) {
      int labelR = outerR + 12;
      int lx = CX + cos(rad) * labelR;
      int ly = CY + sin(rad) * labelR;
      int val = (float)i / TICK_COUNT * MAX_DIST;

      c->setTextColor(CYBER_DIM);
      c->setTextSize(1);
      c->setCursor(lx - 8, ly - 4);
      c->print(val);
    }
  }
}

// 畫指針
void drawNeedle(Arduino_Canvas *c, float angleDeg, uint16_t color) {
  float rad = angleDeg * DEG_TO_RAD;

  // 指針尖端
  int tipX = CX + cos(rad) * NEEDLE_LEN;
  int tipY = CY + sin(rad) * NEEDLE_LEN;

  // 指針底部 (垂直於指針方向的兩個點)
  float perpRad = rad + PI / 2;
  int baseW = 4;
  int bx1 = CX + cos(perpRad) * baseW;
  int by1 = CY + sin(perpRad) * baseW;
  int bx2 = CX - cos(perpRad) * baseW;
  int by2 = CY - sin(perpRad) * baseW;

  // 畫三角形指針
  c->fillTriangle(tipX, tipY, bx1, by1, bx2, by2, color);

  // 中心裝飾圈
  c->fillCircle(CX, CY, 7, CYBER_PANEL);
  c->drawCircle(CX, CY, 7, color);
  c->fillCircle(CX, CY, 3, color);
}

// 繪製完整儀表板
void drawDashboard(int dist) {
  canvas->fillScreen(CYBER_BG);

  // 外圈裝飾
  canvas->drawCircle(CX, CY, 118, CYBER_PANEL);

  // 背景弧線（暗色軌道）
  drawArc(canvas, CX, CY, GAUGE_R,
          START_ANGLE, END_ANGLE, GAUGE_WIDTH, CYBER_PANEL);

  // 漸層弧線（完整）
  drawGradientArc(canvas, CX, CY, GAUGE_R,
                  START_ANGLE, END_ANGLE, GAUGE_WIDTH);

  // 刻度
  drawTicks(canvas);

  // 計算指針角度
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  targetAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);

  // 平滑插值
  currentAngle += (targetAngle - currentAngle) * 0.15;

  // 取得顏色
  uint16_t needleColor = getDistColor(dist);

  // 畫指針
  drawNeedle(canvas, currentAngle, WHITE);

  // ── 中央數字區域 ──
  // 距離數值
  canvas->setTextColor(WHITE);
  canvas->setTextSize(3);
  String distStr = String(dist);
  int textW = distStr.length() * 18;
  canvas->setCursor(CX - textW / 2, CY + 16);
  canvas->print(distStr);

  // 單位
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 6, CY + 42);
  canvas->print("mm");

  // 標題
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 30, CY - 28);
  canvas->print("LASER RANGE");

  // 狀態指示
  canvas->setTextColor(needleColor);
  canvas->setTextSize(1);
  const char* status = getStatusText(dist);
  int sLen = strlen(status);
  canvas->setCursor(CX - sLen * 3, CY + 56);
  canvas->print(status);

  // 推送到螢幕
  canvas->flush();
}

// ═══════════════════════════════════════
//  setup() & loop()
// ═══════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n═══ Cyber Gauge Dashboard ═══");

  // 第一步：打開背光
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 第二步：初始化螢幕
  gfx->begin();
  gfx->fillScreen(BLACK);
  gfx->setRotation(0);

  // 第三步：建立離屏畫布（雙緩衝防閃爍）
  canvas = new Arduino_Canvas(SCREEN_W, SCREEN_H, gfx);
  canvas->begin();

  // 開機畫面
  canvas->fillScreen(CYBER_BG);
  canvas->setTextColor(CYBER_BLUE);
  canvas->setTextSize(2);
  canvas->setCursor(40, 100);
  canvas->print("CYBER");
  canvas->setCursor(40, 125);
  canvas->print("GAUGE");
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(55, 160);
  canvas->print("Booting...");
  canvas->flush();

  delay(1000);

  // 第四步：初始化 I2C 和感測器（注意這裡用的是自訂腳位，不是預設腳）
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("VL53L0X 初始化失敗!");
    canvas->fillScreen(CYBER_BG);
    canvas->setTextColor(CYBER_RED);
    canvas->setTextSize(1);
    canvas->setCursor(50, 110);
    canvas->print("SENSOR ERROR");
    canvas->setCursor(40, 130);
    canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(100);
  }

  Serial.println("VL53L0X 就緒 ✓");

  // 第五步：啟動連續量測模式
  lox.startRangeContinuous();

  Serial.println("儀表板啟動完成!");
}

void loop() {
  // 讀取距離
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();

    // 過濾無效值
    if (dist > 0 && dist < 8190) {
      // 簡單平滑濾波，避免數字亂跳
      currentDist = currentDist * 0.7 + dist * 0.3;
      currentDist = constrain(currentDist, MIN_DIST, MAX_DIST);

      // 只在距離變化超過閾值時才重繪，省效能
      if (abs(currentDist - lastDist) > 2) {
        drawDashboard(currentDist);
        lastDist = currentDist;

        Serial.printf("距離: %d mm\n", currentDist);
      }
    }
  }

  delay(30);  // ~33 FPS
}
```

### 感測器測試程式（建議先跑這個）

正式上主程式之前，強烈建議先燒這段最簡程式碼，確認感測器能正常工作，出了問題也方便單獨排查，不用在一堆繪圖程式碼裡大海撈針。

```cpp
/*
 *  測試 VL53L0X 感測器
 */

#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define I2C_SDA  13
#define I2C_SCL  14

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("VL53L0X 感測器測試");

  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("❌ 感測器未找到，請檢查接線!");
    while (1);
  }

  Serial.println("✓ 感測器就緒，開始量測...");
  lox.startRangeContinuous();
}

void loop() {
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();
    Serial.printf("距離: %d mm\n", dist);
  }
  delay(100);
}
```

### 程式碼說明

幾個容易看暈的關鍵點，挑出來說一下：

- **`blendColor()`**：把兩個 RGB565 顏色按比例 `t` 混合，用來實現紅→橙→黃→青→綠的漸層弧線，不是直接切換顏色，看起來才順滑。
- **`Arduino_Canvas`（離屏畫布）**：所有繪製先畫到記憶體裡的畫布上，最後一次性 `flush()` 推到螢幕，而不是一筆一筆直接畫在螢幕上——不這麼做的話，指針轉動時會看到明顯的閃爍和撕裂感。
- **平滑濾波 `currentDist * 0.7 + dist * 0.3`**：感測器原始讀數會有小幅抖動，這裡做了個簡單的一階低通濾波，讓指針擺動更平滑，不會看著一驚一乍。
- **`I2C_SDA=13, I2C_SCL=14`**：前面接線部分反覆強調的地雷，這裡再敲一遍黑板——這兩個不是 ESP32-S3 的預設 I2C 腳位，是因為預設的 GPIO9 被螢幕 CS 占用了才手動改過來的。

## 常見問題排查

別慌，八成的問題出在這幾個地方：

1. **燒錄後螢幕一直黑屏**
   先檢查 `TFT_BL`（背光）有沒有接對，或者程式裡 `digitalWrite(TFT_BL, HIGH)` 有沒有執行到；再檢查 RST 腳是否接觸不良，RST 鬆動是圓屏黑屏最常見的原因。

2. **序列埠印出「VL53L0X 初始化失敗!」**
   99% 是接線問題：確認 VIN/GND 有沒有接反，SDA/SCL 是否真的接在 GPIO13/GPIO14（而不是預設的 GPIO8/9），杜邦線有沒有鬆動。可以先單獨跑「感測器測試程式」排除螢幕干擾。

3. **螢幕能亮，但花屏/條紋/顏色不對**
   多半是 SPI 時鐘線或資料線接觸不良，或者杜邦線太長導致訊號衰減。檢查 SCL/SDA 是否對應到 GPIO12/GPIO11，杜邦線盡量控制在 15cm 以內。

4. **指針瘋狂亂跳，數字一直變**
   這是濾波係數不夠或者感測器前方有反光/透明物體干擾。可以把 `currentDist * 0.7 + dist * 0.3` 裡的權重改成 `0.85/0.15`，濾波會更強（代價是響應變慢）。

5. **編譯報錯找不到 `Adafruit_VL53L0X.h` 或 `Arduino_GFX_Library.h`**
   說明函式庫沒裝對，去函式庫管理員搜尋準確的庫名重裝，注意別裝成同名的第三方 fork 版本。

6. **指針角度或刻度數字對不上**
   檢查 `MAX_DIST` 是不是被改小了但刻度標注沒跟著改，兩者要保持一致，否則刻度數字和實際指針位置會錯位。

## FAQ 問答

**Q：ESP32-S3 的預設 I2C 腳位是哪兩個？**
A：預設通常是 GPIO8（SDA）和 GPIO9（SCL），但本專案裡 GPIO9 被螢幕 CS 占用了，所以感測器 I2C 改到了 GPIO13/GPIO14。

**Q：VL53L0X 最大能測多遠，精度多少？**
A：官方標稱有效量測範圍約 30mm～1200mm（長距離模式下最遠可到 2000mm），精度約 ±3%。

**Q：GC9A01 圓屏支援觸控嗎？**
A：GC9A01 本身只是顯示驅動晶片，不帶觸控功能；市面上部分模組會額外整合電容觸控晶片，購買前需確認具體型號是否帶觸控版本。

**Q：VL53L0X 的雷射會傷眼睛嗎？**
A：不會，它屬於 Class 1 雷射產品，940nm 波長人眼不可見，功率極低，符合人眼安全標準，正常使用無需擔心。

**Q：GC9A01 螢幕不亮，但供電正常是什麼原因？**
A：最常見的原因是 RST（重置）腳接觸不良，或者背光 BL 腳沒有被拉高，先排查這兩處。

**Q：為什麼程式裡要用離屏畫布 `Arduino_Canvas` 而不是直接畫在螢幕上？**
A：直接畫在螢幕上會在指針轉動、弧線重繪時出現明顯閃爍和撕裂，用畫布做雙緩衝，畫完一次性刷新，畫面才乾淨俐落。

**Q：VL53L0X-V2 和普通版 VL53L0X 有區別嗎？**
A：核心測距原理和腳位定義一致，V2 通常是模組廠商在電路板設計、穩壓電路上做了改版優化，具體差異建議以購買模組的實物資料為準。

**Q：這個專案 ESP32-S3 供電用 USB 供電夠用嗎？**
A：夠用，螢幕和感測器整體功耗不高，正常 USB 5V/500mA 供電完全沒問題。

## 延伸玩法

- 接一個蜂鳴器，距離進入 DANGER 區間時報警，秒變簡易停車雷達
- 把歷史距離資料存起來，畫一條即時曲線圖，觀察物體移動軌跡
- 加兩個按鍵，切換顯示單位（mm / cm / inch）
- 做個外殼吸在擋風玻璃上，真拿來當倒車雷達用

## 參考資料

- [ST VL53L0X 官方資料手冊](https://www.st.com/en/imaging-and-photonics-solutions/vl53l0x.html)
- [Adafruit_VL53L0X GitHub 倉庫](https://github.com/adafruit/Adafruit_VL53L0X)
- [Arduino_GFX_Library GitHub 倉庫](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 官方產品頁](https://www.espressif.com/en/products/socs/esp32-s3)
