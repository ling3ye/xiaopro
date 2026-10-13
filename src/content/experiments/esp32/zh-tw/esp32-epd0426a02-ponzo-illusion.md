---
title: "ESP32-S3 驅動 4.26\" SSD1677 EPD0426A02 墨水屏播放走廊錯覺動畫｜SPI + GxEPD2 完整教學"
boardId: esp32s3
moduleId: display/epd-4inch26-epd0426a02
category: esp32
date: 2026-10-13
intro: "用 ESP32-S3 透過 SPI 驅動 EPD0426A02（800×480，SSD1677 主控）墨水屏，基於 GxEPD2 局部刷新播放 Ponzo 走廊錯覺四幀動畫，附完整接線、Arduino 程式碼與花屏除錯。"
image: "https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg"
---

> **一句話摘要**：接 8 根線、裝 2 個程式庫、燒一份程式碼，讓 ESP32-S3 驅動 4.26 吋墨水屏自動播放 Ponzo 走廊錯覺動畫——順帶把墨水屏最實用的局部刷新一次學會。

```
難度：⭐⭐☆☆☆（新手可上手，只要別把 VCC 接到 5V）
預計時間：40 分鐘（接線 10 分鐘 + 裝環境 15 分鐘 + 燒錄看戲 15 分鐘）
測試環境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + GxEPD2 1.6.9
```

> **TL;DR（快速上手）：**
>
> 1. 接線：MOSI → GPIO11，SCK → GPIO12，CS → GPIO10，DC → GPIO9，RST → GPIO8，BUSY → GPIO7
> 2. VCC 接 3.3V（接 5V 會燒屏，別問我怎麼知道的）
> 3. 裝兩個程式庫：GxEPD2（≥ 1.5.3）+ Adafruit_GFX（裝 GxEPD2 會自動帶上）
> 4. 開發板選「ESP32S3 Dev Module」，燒錄，坐在螢幕前等你的大腦被騙

---

## 前言：一條騙了全人類 100 多年的走廊

你一定見過這張圖：兩條一模一樣的線段，畫上走廊的透視線之後，遠的那個看起來就是更長。你明知道它們等長，眼睛卻還是死不承認——這就是經典的 Ponzo 錯覺，你的大腦自動開啟了「透視腦補」模式，把「遠處」翻譯成了「更大」。

我一直想找個機會親手把這個錯覺「實體化」。正好手邊有一塊 4.26 吋的 EPD0426A02 墨水屏（800×480，SSD1677 主控）和一塊 ESP32-S3，墨水屏這種「慢慢變、還斷電不丟畫面」的氣質，跟錯覺演示簡直是絕配——觀眾有充足的時間懷疑人生，完了拔電還能擺在桌上繼續騙下一位客人。

這篇文章就帶你從零開始：接好 8 根線，裝好 2 個程式庫，燒錄一份程式碼，讓這塊墨水屏給你的大腦上一課。過程中順便把墨水屏最實用的技能——局部刷新——一次點滿。

## 最終效果

燒錄完成後，螢幕自動播放一段約 40 秒的四幀動畫：先問「這兩條線段一樣長嗎」，再揭曉答案，最後停在走廊錯覺畫面上（MCU 休眠，畫面保持到你手動重置）。

![](https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg)

四幀分鏡如下，每一幀之間用局部刷新過渡，線段本身紋絲不動：

| 幀   | 畫面內容                                                   | 停留時長 |
| ---- | ---------------------------------------------------------- | -------- |
| 1    | 只有線段 A 和 B，"Are these two lines the same length?"    | 7 秒     |
| 2    | 疊上橫向虛線輔助線，"Yes - exactly equal."                 | 7 秒     |
| 3    | 透視線登場，"And now?"                                     | 10 秒    |
| 4    | 輔助線 + 透視線同框，"Same lines - your brain was fooled." | 7 秒     |
| 收尾 | 純錯覺畫面 + 大標題 "Ponzo illusion"，然後休眠             | 保持     |

![](https://img.lingflux.com/2026/10/68b443e3994d10b40d287b13965c7c93.jpg)

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/OTnjpqa3W_M?si=bx7XbbxggXATzQhh" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## 元件說明

### EPD0426A02 墨水屏 — 會「斷電記事」的電子黑板

EPD0426A02 是深圳市奧斯瑞光電（Osptek）出品的一款 4.26 英寸電子紙顯示模組，負責把 ESP32-S3 發來的圖像資料「印」到螢幕上，用在本專案裡的作用是播放四幀錯覺動畫並長期保持畫面。

生活化一點說：它就是 Kindle 上那塊螢幕的親戚——一塊「電子黑板」。寫完字斷電，字還在；想改內容就整屏「擦了重寫」（這就是墨水屏刷新時閃幾下的原因）。刷新慢是它的人設，不耗電才是它的實力。

關鍵參數：

| 項目          | 參數                                            |
| ------------- | ----------------------------------------------- |
| 尺寸 / 解析度 | 4.26 英寸，800 × 480（橫屏），219 DPI           |
| 驅動 IC       | SSD1677（960 source × 680 gate 主控，SPI 介面） |
| 顯示能力      | 黑白雙穩態，原生 4 級灰階（2 bit/px）           |
| 介面          | 24-pin FPC，4 線 SPI（只寫不讀）                |
| 刷新峰值電流  | 約 50 mA                                        |
| 深度睡眠電流  | 約 3 µA（畫面保持不耗電）                       |
| 設計壽命      | 5 年 / 100 萬次刷新（25 ℃ / 60%RH）             |

為什麼選它？800×480 的解析度在同尺寸墨水屏裡算高清，畫透視線條足夠銳利；3 µA 的深度睡眠讓「演完就斷電擺著騙人」這個用法毫無功耗壓力；而且 GxEPD2 程式庫從 v1.5.3 起原生支援（驅動類 `GxEPD2_426_GDEQ0426T82`），驅動不用自己寫。

### 引腳說明

EPD0426A02 轉接板引出 8 個引腳，各司其職：

| 引腳       | 做什麼用                              |
| ---------- | ------------------------------------- |
| VCC        | 3.3V 供電（⚠️ 千萬別接 5V）            |
| GND        | 共地，和開發板說同一種語言            |
| MOSI (DIN) | SPI 資料，主控往屏裡送像素            |
| SCK (SCL)  | SPI 時脈，約定多快送一個 bit          |
| CS         | 片選，拉低 =「這條線歸你了」          |
| DC         | 資料 / 命令切換：高=像素資料，低=命令 |
| RST        | 硬體重置，初始化前拉一下              |
| BUSY       | 忙訊號：高電位 = 正在刷新，別打擾     |

一句提醒：這塊屏的 BUSY 是**高電位有效**（忙=高），引腳名卻常寫作 `BUSY_N`，和直覺正好相反。好在這個坑 GxEPD2 已經幫我們填好了，知道有這回事即可。

## BOM 清單

| 序號 | 元件       | 型號 / 規格                                            | 數量 | 備註                      |
| ---- | ---------- | ------------------------------------------------------ | ---- | ------------------------- |
| 1    | 開發板     | ESP32-S3（ESP32-S3-DevKitC / Arduino Nano ESP32 均可） | 1    | 內建 USB 轉串口即可       |
| 2    | 墨水屏模組 | EPD0426A02（SSD1677，800×480）                         | 1    | 自帶轉接板，引出 8 根排針 |
| 3    | 杜邦線     | 母對母或公對公                                         | 8    | 6 根訊號 + 電源地         |
| 4    | USB 線     | Type-C 或 Micro（看開發板）                            | 1    | 供電 + 燒錄               |

## 接線方式

![](https://img.lingflux.com/2026/10/3ae30dc6faad42836102413a774bc830.jpg)

接線圖優先，表格輔助：

| 墨水屏引腳 | ESP32-S3 GPIO | 說明               |
| ---------- | ------------- | ------------------ |
| VCC        | 3V3           | ⚠️ 3.3V，接 5V 燒屏 |
| GND        | GND           | 任意 GND           |
| MOSI (DIN) | GPIO11        | SPI 資料           |
| SCK (SCL)  | GPIO12        | SPI 時脈           |
| CS         | GPIO10        | 片選               |
| DC         | GPIO9         | 資料/命令          |
| RST        | GPIO8         | 重置               |
| BUSY       | GPIO7         | 忙訊號（輸入）     |

**接完線請逐一核對一遍，能省 80% 的除錯時間。** 墨水屏接錯線不會報錯、不會冒煙，只會默默白屏或花屏——你根本分不清是程式碼錯了還是線錯了。另外注意：ESP32-S3 在 Arduino 框架下的預設 I2C 腳位是 GPIO8（SDA）和 GPIO9（SCL），本例程把它們分配給了 RST 和 DC，所以接屏之後 I2C 裝置需要改用 `Wire.begin(SDA, SCL)` 重映射到其他空閒 GPIO。

如果你用的是 **Arduino Nano ESP32**，這塊板子絲印上的 D4~D7、A4/A5 不是真實 GPIO 號，對照表如下：

| 墨水屏引腳 | 真實 GPIO | Nano ESP32 絲印 |
| ---------- | --------- | --------------- |
| MOSI       | GPIO11    | A4              |
| SCK        | GPIO12    | A5              |
| CS         | GPIO10    | D7              |
| DC         | GPIO9     | D6              |
| RST        | GPIO8     | D5              |
| BUSY       | GPIO7     | D4              |

## 需要安裝的程式庫

打開 Arduino IDE → 工具 → 管理程式庫，按下面裝：

| 程式庫名稱   | 作者              | 版本要求                                        | 作用                   |
| ------------ | ----------------- | ----------------------------------------------- | ---------------------- |
| esp32        | Espressif Systems | 3.3.10（Arduino IDE 2.3.x 實測通過）            | ESP32-S3 開發板支援    |
| GxEPD2       | Jean-Marc Zingg   | **1.6.9**（含 `GxEPD2_426_GDEQ0426T82` 驅動類） | 墨水屏驅動             |
| Adafruit_GFX | Adafruit          | 隨 GxEPD2 自動安裝                              | 繪圖 API（畫線、字體） |

裝完後開發板選擇 **ESP32S3 Dev Module**（Tools → Board），再接上串口就能燒了。

## 完整程式碼

直接複製燒錄即可（檔案對應工程裡 `arduino/GxEPD2_CorridorIllusion/GxEPD2_CorridorIllusion.ino`）：

```cpp
/*
 * EPD0426A02 (4.26" 480x800 SPI 墨水屏, SSD1677) — 走廊錯覺 (Ponzo Illusion) 演示
 * 開發板: ESP32-S3 (Arduino IDE, 選擇 "ESP32S3 Dev Module")
 * 驅動程式庫: GxEPD2, 直接使用內建驅動類 GxEPD2_426_GDEQ0426T82
 *
 * 引腳定義與參考例程完全一致:
 *   BUSY -> GPIO7    DC -> GPIO9     CS -> GPIO10
 *   SCK  -> GPIO12   MOSI -> GPIO11  RST -> GPIO8
 *
 * 展示流程 (單輪演示, 不循環):
 *   幀 1: 只有兩條等長的粗線段 A、B        "Are these two lines the same length?"
 *   幀 2: 加橫向虛線輔助線, 證明等長       "Yes - exactly equal."
 *   幀 3: 線段不動, 疊加走廊透視線         "And now?"
 *   幀 4: 透視 + 輔助線, 揭曉             "Same lines - your brain was fooled."
 *   最後回到幀 3 (錯覺畫面) 停留
 *
 * 畫面為橫屏 800x480 (rotation 0 即控制器原生方向)。
 */

#include <Arduino.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>

// ---------------- 引腳定義 (與 ESP-IDF 工程 board_pins.h 一致) ----------------
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_SCK  12
#define EPD_MOSI 11

// 全屏緩衝模式 (page_height = HEIGHT, 48000 位元組)
GxEPD2_BW<GxEPD2_426_GDEQ0426T82, GxEPD2_426_GDEQ0426T82::HEIGHT> display(
  GxEPD2_426_GDEQ0426T82(/*CS=*/EPD_CS, /*DC=*/EPD_DC, /*RST=*/EPD_RST, /*BUSY=*/EPD_BUSY));

// ---------------- 畫面幾何 (800x480 橫屏) ----------------
static const int16_t W = 800;
static const int16_t H = 480;

static const int16_t VPX = 700, VPY = 240;   // 滅點 (vanishing point), 左側走廊
static const int16_t VP2X = 1600, VP2Y = 240; // 第二滅點 (螢幕右側遠處), 右牆透視線用
static const int16_t VP0X = -900, VP0Y = 260; // 第三滅點 (螢幕左側遠處), 左牆透視線用
static const int16_t XN  = 150;              // 近處牆角 x (線段 A)
static const int16_t XF  = 520;              // 遠處牆角 x (線段 B)
static const int16_t Y1  = 190;              // 線段上端點
static const int16_t Y2  = 290;              // 線段下端點 (兩條線段長度均為 100px)

static const int16_t SEG_W = 6;              // 線段粗細
static const uint32_t FRAME_MS  = 7000;      // 每幀停留時間
static const uint32_t FRAME3_MS = 10000;      // 第 3 幀停久一點

// 實驗: 手冊要求 VCOM 控制暫存器 (0x2B) 固定寫 0x04, 0x63, GxEPD2 驅動不發, 手動補發
// (需在 display.init() 之後呼叫, SWRESET 會清掉該暫存器)
static void epdWriteVCOMControl()
{
  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));
  digitalWrite(EPD_CS, LOW);
  digitalWrite(EPD_DC, LOW);
  SPI.transfer(0x2B);
  digitalWrite(EPD_DC, HIGH);
  SPI.transfer(0x04);
  SPI.transfer(0x63);
  digitalWrite(EPD_CS, HIGH);
  SPI.endTransaction();
}

// 從點 (px, py) 指向滅點 (vpx, vpy) 的直線上, 橫座標為 x 的點的 y 值
static int16_t onLineYVP(int16_t x, int16_t px, int16_t py, int16_t vpx, int16_t vpy)
{
  float t = (float)(x - px) / (float)(vpx - px);
  return (int16_t)(py + (vpy - py) * t);
}

// 左側走廊: 指向滅點 VP
static int16_t onLineY(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VPX, VPY);
}

// 右側牆: 指向第二滅點 VP2
static int16_t onLineY2(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP2X, VP2Y);
}

// 左側牆: 指向第三滅點 VP0
static int16_t onLineY0(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP0X, VP0Y);
}

// ---------------- 繪製元素 ----------------

// 兩條線段 —— 每一幀都用完全相同的座標和粗細
static void drawSegments()
{
  display.fillRect(XN - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // 線段 A
  display.fillRect(XF - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // 線段 B

  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(XN - 34, Y2 + 30);
  display.print("A");
  display.setCursor(XF + 16, Y2 + 30);
  display.print("B");
}

// 橫向虛線對齊輔助線, 證明兩條線段端點在同一水平線上
static void drawGuides()
{
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    for (int16_t x = 0; x < W; x += 12)
    {
      display.drawFastHLine(x, ys[i], 6, GxEPD_BLACK);
    }
  }
}

// 走廊透視線
static void drawPerspective()
{
  const int16_t topX = XN, topY = 40;    // 近牆角上端
  const int16_t botX = XN, botY = 440;   // 近牆角下端

  int16_t ftY = onLineY(XF, topX, topY); // 遠牆角上端 y
  int16_t fbY = onLineY(XF, botX, botY); // 遠牆角下端 y

  // 天花板 / 地板 (2px)
  display.drawLine(topX, topY, XF, ftY, GxEPD_BLACK);
  display.drawLine(topX, topY + 1, XF, ftY + 1, GxEPD_BLACK);
  display.drawLine(botX, botY, XF, fbY, GxEPD_BLACK);
  display.drawLine(botX, botY - 1, XF, fbY - 1, GxEPD_BLACK);

  // 近牆角 (2px) / 遠牆角 (1px)
  display.drawLine(XN, topY, XN, botY, GxEPD_BLACK);
  display.drawLine(XN + 1, topY, XN + 1, botY, GxEPD_BLACK);
  display.drawLine(XF, ftY, XF, fbY, GxEPD_BLACK);

  // 經過線段上下端點的水平透視線 (穿到遠牆)
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XF, onLineY(XF, XN, ys[i]), GxEPD_BLACK);
  }

  // 豎向分格 (牆面磚縫)
  static const int16_t divX[] = {260, 350, 420, 470, 500};
  for (uint8_t i = 0; i < sizeof(divX) / sizeof(divX[0]); i++)
  {
    int16_t x = divX[i];
    display.drawLine(x, onLineY(x, topX, topY), x, onLineY(x, botX, botY), GxEPD_BLACK);
  }

  // ---- 右側牆: 從遠牆角 (XF) 延伸到螢幕右邊緣, 朝第二滅點 VP2 收攏 ----
  const int16_t XR = W - 1;

  // 天花板線 / 地板線 (續接到右邊緣)
  display.drawLine(XF, ftY, XR, onLineY2(XR, XF, ftY), GxEPD_BLACK);
  display.drawLine(XF, fbY, XR, onLineY2(XR, XF, fbY), GxEPD_BLACK);

  // 過線段上下端點的水平線, 在右牆上繼續延伸
  for (int i = 0; i < 2; i++)
  {
    int16_t yAtXF = onLineY(XF, XN, ys[i]); // 左牆透視線到達遠牆角時的 y
    display.drawLine(XF, yAtXF, XR, onLineY2(XR, XF, yAtXF), GxEPD_BLACK);
  }

  // 右牆豎向分格 (磚縫), 連接天花板線與地板線
  static const int16_t divXR[] = {600, 660, 710, 750, 780};
  for (uint8_t i = 0; i < sizeof(divXR) / sizeof(divXR[0]); i++)
  {
    int16_t x = divXR[i];
    display.drawLine(x, onLineY2(x, XF, ftY), x, onLineY2(x, XF, fbY), GxEPD_BLACK);
  }

  // ---- 左側牆: 從近牆角 (XN) 延伸到螢幕左邊緣, 朝第三滅點 VP0 收攏 ----
  const int16_t XL = 0;

  // 天花板線 / 地板線 (續接到左邊緣)
  display.drawLine(XN, topY, XL, onLineY0(XL, XN, topY), GxEPD_BLACK);
  display.drawLine(XN, botY, XL, onLineY0(XL, XN, botY), GxEPD_BLACK);

  // 過線段上下端點的水平線, 在左牆上繼續延伸
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XL, onLineY0(XL, XN, ys[i]), GxEPD_BLACK);
  }

  // 左牆豎向分格 (磚縫)
  static const int16_t divXL[] = {30, 80, 120};
  for (uint8_t i = 0; i < sizeof(divXL) / sizeof(divXL[0]); i++)
  {
    int16_t x = divXL[i];
    display.drawLine(x, onLineY0(x, XN, topY), x, onLineY0(x, XN, botY), GxEPD_BLACK);
  }
}

// 頂部文字
static void drawTitle(const char *text)
{
  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(20, 34);
  display.print(text);
}

// 最終停留幀的大標題: 更大的字號, 頂部水平置中
// (頂部中央區域在天花板線之上, 不會與透視線重疊)
static void drawTitleBig(const char *text)
{
  display.setFont(&FreeSansBold18pt7b);
  display.setTextColor(GxEPD_BLACK);
  int16_t tbx, tby;
  uint16_t tbw, tbh;
  display.getTextBounds(text, 0, 0, &tbx, &tby, &tbw, &tbh);
  display.setCursor((W - tbw) / 2 - tbx + 200, 48 - tby); // 基線約在 y=48
  display.print(text);
}

// 按幀號繪製整幅畫面 (1..4), 全程全視窗絕對座標繪圖
static void drawFrame(uint8_t frame)
{
  display.fillScreen(GxEPD_WHITE);
  switch (frame)
  {
    case 1:
      drawTitle("Are these two lines the same length?");
      break;
    case 2:
      drawTitle("Yes - exactly equal.");
      drawGuides();
      break;
    case 3:
      drawTitle("And now?");
      drawPerspective();
      break;
    case 5: // 最終停留幀: 錯覺畫面 + 大標題, 無 "And now?"
      drawTitleBig("Ponzo illusion");
      drawPerspective();
      break;
    case 4:
    default:
      drawTitle("Same lines - your brain was fooled.");
      drawPerspective();
      drawGuides();
      break;
  }
  drawSegments(); // 每一幀都最後畫, 座標永遠不變
}

// 全刷顯示一幀
static void showFrameFull(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.display(); // 全屏刷新
}

// 局刷顯示一幀: 全視窗繪圖, 用 displayWindow() 只刷新變化區域 (整屏視窗 = 全屏局刷)
static void showFramePartial(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.displayWindow(0, 0, W, H);
}

void setup()
{
  Serial.begin(115200);
  delay(500);
  Serial.println("[EPD] EPD0426A02 Corridor Illusion (GxEPD2 / GDEQ0426T82)");

  // ESP32 自訂 SPI 引腳映射: SCK, MISO(-1 不用), MOSI, SS
  SPI.begin(EPD_SCK, -1, EPD_MOSI, EPD_CS);

  display.init(115200);
  display.setRotation(0); // 原生橫屏 800x480
  display.setTextColor(GxEPD_BLACK);

  epdWriteVCOMControl(); // 補發 0x2B VCOM 控制暫存器

  // ---- 單輪演示: 幀 1 -> 2 -> 3 -> 4 ----
  // 幀 1: 全刷開場
  showFrameFull(1);
  Serial.println("[EPD] frame 1 (full refresh)");
  delay(FRAME_MS);

  // 幀 2 -> 3 -> 4: 局部刷新, 線段紋絲不動
  showFramePartial(2);
  Serial.println("[EPD] frame 2 (partial)");
  delay(FRAME_MS);

  showFramePartial(3);
  Serial.println("[EPD] frame 3 (partial)");
  delay(FRAME3_MS);

  showFramePartial(4);
  Serial.println("[EPD] frame 4 (partial, reveal)");
  delay(FRAME_MS);

  // 最後停留在錯覺畫面 (幀 5: 走廊 + 大標題 "Ponzo illusion", 無 "And now?")
  showFramePartial(5);
  Serial.println("[EPD] final frame 5 (illusion + title), hold");
  delay(1000);

  // 演示結束, 畫面停留在螢幕上 (不使用深度睡眠)
  Serial.println("[EPD] done, holding frame");
}

void loop()
{
  // 畫面已停留在螢幕上, 這裡空轉即可
}
```

### 程式碼說明

整段程式碼 300 多行，看著長，其實就做了六件事：

1. **引腳和顯示物件（`#define` 一組 + `GxEPD2_BW` 宣告）**：6 個巨集定義對應 6 根訊號線；`GxEPD2_BW<..., HEIGHT>` 是「全屏緩衝模式」，一整幀 48000 位元組一次性存記憶體裡，ESP32-S3 的 RAM 毫無壓力。引腳想換？改這 6 個巨集就行。
2. **四幀分鏡（`drawFrame`）**：就是一張 switch 表。注意 `drawSegments()` 放在 switch 外面、每幀最後畫——線段座標全程不變，變的只是周圍的輔助線和透視線。錯覺要成立，這是鐵律。
3. **透視線畫法（`drawPerspective` + 三個 `onLineY` 函式）**：核心是一行國中學過的兩點式直線方程式。三面牆各自指向一個「滅點」（畫面外交點），線就自然有了縱深感。滅點放在螢幕外面（VP2 的 x=1600、VP0 的 x=-900），透視效果反而更自然。
4. **局部刷新（`showFramePartial` 裡的 `displayWindow`）**：先在記憶體裡整幀重畫，再只把「有變化的像素」推給螢幕。幀 2 到幀 4 之間，螢幕上的線段一動不動，閃的只有輔助線和透視線——這正是局部刷新相對全刷的靈魂：快（約 0.42 秒一次），而且不閃瞎眼。
5. **0x2B VCOM 補丁（`epdWriteVCOMControl`）**：SSD1677 手冊要求往 `0x2B` 暫存器寫 `0x04, 0x63`（抑制 ACVCOM 翻轉的毛刺），但 GxEPD2 和廠商 demo 都沒發這條命令。漏發的後果很陰：演示結束後只要 VCC 還接著，畫面會在幾分鐘尺度上慢慢變花。必須每次 `display.init()` 之後補發，因為軟重置（0x12）會把這個暫存器清掉。這個坑我踩了一整天，詳見後面的常見問題。

## 常見問題排查

別慌，90% 的問題出在這五個地方，從上到下挨個查：

**1. 燒錄後白屏，什麼都沒顯示**

先別懷疑人生，按機率從高到低查：① 6 根訊號線有沒有虛接（杜邦線插 breadboard 久了會鬆）；② VCC 是不是接到了 3.3V；③ 燒錄前串口監視器有沒有印出 `[EPD] frame 1`，如果串口都沒輸出，說明程式沒跑起來，和屏無關。墨水屏不報錯，白屏就是它的「報錯方式」。

**2. 編譯報錯：`'GxEPD2_426_GDEQ0426T82' does not name a type`**

GxEPD2 版本低於 1.5.3。打開程式庫管理器，把 GxEPD2 升級到最新版，這個驅動類從 v1.5.3 起才有。

**3. 演示跑完了，畫面放著放著慢慢花了（十幾分鐘尺度）**

就是那個 0x2B。確認 `epdWriteVCOMControl()` 在每次 `display.init()` 之後都呼叫了——軟重置會清掉這個暫存器，init 在前、補發在後，順序反了等於沒發。補對之後，帶電閒置畫面能穩穩保持。

**4. 畫面只顯示一半，或者上下錯位**

八成是 rotation 或解析度不對。本例程用 `setRotation(0)`（原生橫屏 800×480）；如果你之前跑過別的例程把 rotation 改成了 1 或 3，換回來。另外 ESP-IDF 那邊有個分頁渲染的版本（記憶體緊張時才需要），Arduino 全屏緩衝模式不存在這個問題。

**5. 上傳失敗 / 找不到串口**

先按住開發板上的 BOOT 鍵再插 USB，進入下載模式；如果還不行，換條資料線——很多「充電線」裡面只有電源沒有資料線，這是我燒錄生涯中翻過最多的車。

## FAQ

**Q：ESP32（不是 S3）或者 ESP32-C3 能跑這個例程嗎？**
A：能。程式碼沒有用到 S3 專屬功能，任何支援 Arduino 框架的 ESP32 系列都能跑，引腳換成你板子上空閒的 GPIO 即可。全屏緩衝需要約 48 KB RAM，經典 ESP32（520 KB SRAM）也夠用。

**Q：可以換其他 GPIO 引腳嗎？怎麼換？**
A：可以。改程式碼開頭 6 個 `#define`（EPD_CS / EPD_DC / EPD_RST / EPD_BUSY / EPD_SCK / EPD_MOSI）再按新引腳重新接線就行。ESP32-S3 上注意避開 GPIO0/3/45/46 這類 Strapping 引腳、GPIO19/20（USB）以及被 Flash/PSRAM 佔用的引腳，具體看開發板電路圖。

**Q：墨水屏刷新一次要好幾秒還閃幾下，正常嗎？**
A：全刷慢是正常的物理特性：每次刷新要把 480 行像素全部重新「壓」一遍，本屏全刷實測約 2 秒（快刷波形下約 1.5 秒）。閃幾下是清殘影的標準流程，不是壞了。嫌慢就用本例程的局部刷新（`displayWindow`），實測約 0.42 秒一次，幾乎不閃。

**Q：墨水屏能接 5V 嗎？**
A：不能。EPD0426A02 的 VCC 必須接 3.3V，上限就是 3.3V。接 5V 不會立刻冒煙，但屏內部高壓驅動電路會被打壞，表現為用幾次之後局部花屏——而且不保固。寧願不亮，也別接 5V。

**Q：演示結束後螢幕放著會慢慢花掉，怎麼徹底解決？**
A：往 SSD1677 的 0x2B 暫存器寫 0x04、0x63 兩個位元組（手冊原話是「reduce glitch when ACVCOM toggle」），並且在每次軟重置後重發。例程裡的 `epdWriteVCOMControl()` 就是做這個的。另一個更物理的方案是用 P-MOS 管斷開 VCC，但軟體補發兩個位元組就能解決，沒必要動烙鐵。

**Q：為什麼說是 4 級灰階？商品頁不是宣傳 16 級灰階嗎？**
A：SSD1677 的像素物理上只有黑/白兩種穩態，資料通路是 2 bit/px，原生就是 4 級灰階（黑/深灰/淺灰/白）。灰階靠波表（LUT）在一幀內對不同像素施加不同次數和極性的脈衝實現；16 級觀感是用 Bayer 4×4 有序抖動在 4 級灰階上模擬出來的。這個錯覺例程只用黑白，不受影響，但你要顯示照片時記住這個上限。

**Q：局部刷新用久了有殘影怎麼辦？**
A：局刷的原理決定了殘影會累積。實用策略是「連續局刷一段時間後全刷一次」——`display.clearScreen()` 或者乾脆全黑全白各刷一遍，把殘影洗乾淨。本例程只有 4 次刷新，殘影可以忽略。

**Q：想改兩條線段的長度、位置，或者換成中文文案，改哪裡？**
A：線段參數全在「畫面幾何」那一組常數裡：`XN`/`XF` 是水平位置，`Y1`/`Y2` 是上下端點（長度 = Y2 - Y1），`SEG_W` 是粗細。文案在 `drawFrame` 的 switch 裡。注意改完保持兩條線段座標一致，不然錯覺就不「誠實」了。

## 延伸玩法

- 換錯覺：把 Ponzo 換成 Müller-Lyer 箭頭錯覺或艾賓浩斯大小錯覺，改 `drawFrame` 裡的幾何函式就行
- 手動切幀：接一個觸摸按鍵或電位器，觀眾喊「揭曉」才進入第 3 幀，儀式感拉滿
- 局刷計數器：用這個例程的 `displayWindow` 思路做一個 0.42 秒走一格的電子秒錶，體驗墨水屏跑「動態」的反差感
- 灰階照片：接上 GxEPD2_4G，用 4 級灰階 + Bayer 抖動把一張照片「印」上墨水屏，Kindle 桌布效果
- 電池擺件：18650 + 深度睡眠，一天只醒來幾秒更新畫面，一節電池能用幾個月——你的錯覺走廊可以 7×24 小時騙人

## 參考資料

- SSD1677 驅動 IC 原廠產品頁（晶門科技 Solomon Systech）：https://www.solomon-systech.com/product/ssd1677/
- GxEPD2 驅動程式庫 GitHub 主頁（含完整支援列表）：https://github.com/ZinggJM/GxEPD2
- Adafruit_GFX 繪圖程式庫 GitHub：https://github.com/adafruit/Adafruit-GFX-Library
- ESP32-S3 主控晶片官方產品頁（樂鑫 Espressif）：https://www.espressif.com/zh-hant/products/socs/esp32-s3
- 姊妹程式庫 GxEPD2_4G（如果想玩 4 級灰階 + 抖動灰階照片）：https://github.com/ZinggJM/GxEPD2_4G
