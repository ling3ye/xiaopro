---
title: "ESP32 透過 8位並列匯流排驅動 ILI9341 螢幕"
boardId: esp32
moduleId: ili9341
category: esp32
date: 2026-02-27
intro: "詳細介紹如何使用 ESP32 透過 8位並列匯流排驅動 ILI9341 螢幕，相比 SPI 串列驅動提供極高的刷新率，適合顯示動態畫面。"
image: "https://img.lingshunlab.com/image-20260204140130062.png"
---

本文將詳細介紹如何使用 ESP32 透過 **8位並列匯流排 (8-bit Parallel)** 驅動 ILI9341 螢幕。相比常見的 SPI 串列驅動，並列模式能提供極高的刷新率，非常適合顯示動態畫面。

## 開發環境

OS: MacOS

Arduino IDE Version: 2.3.7

esp32 Version: 3.3.5

TFT_eSPI Version: 2.5.43



## BOM

ESP32 x1

2.4 inch TFT display x1

杜邦線 xN



## 接線方式

| TFT Pin          | **ESP32 Pin** | **功能說明**                     |
| ---------------- | ------------- | -------------------------------- |
| **VCC (3V3/5V)** | **3V3 / VIN** | 螢幕供電 (建議先試 3.3V)         |
| **GND**          | **GND**       | 共地                             |
| **LCD_D0**       | **GPIO 26**   | 資料位 0                         |
| **LCD_D1**       | **GPIO 25**   | 資料位 1                         |
| **LCD_D2**       | **GPIO 19**   | 資料位 2                         |
| **LCD_D3**       | **GPIO 18**   | 資料位 3                         |
| **LCD_D4**       | **GPIO 5**    | 資料位 4                         |
| **LCD_D5**       | **GPIO 21**   | 資料位 5                         |
| **LCD_D6**       | **GPIO 22**   | 資料位 6                         |
| **LCD_D7**       | **GPIO 23**   | 資料位 7                         |
| **LCD_CS**       | **GPIO 32**   | 晶片選擇 (Chip Select)           |
| **LCD_RTS**      | **GPIO 33**   | 重置 (Reset)                     |
| **LCD_RS (DC)**  | **GPIO 14**   | 資料/命令切換 (Register Select)  |
| **LCD_WR**       | **GPIO 27**   | 寫入致能 (Write Control)         |
| **LCD_RD**       | **GPIO 2**    | 讀取致能 (如不需讀取 ID 可接 3.3V) |




## 必須安裝的函式庫

### Arduino IDE Boards Manger：esp32

必須安裝樂鑫（by Espressif Systems）出的 esp32 函式庫，這裡安裝的是最新版本。

### Arduino IDE Library Manager：TFT_eSPI

必須安裝 TFT_eSPI 這個函式庫



## TFT_eSPI 設定檔「User_Setup.h」

TFT_eSPI 是 ESP32 驅動螢幕的神器，但這個函式庫的接腳定義、開發板定義、螢幕定義，都在這個 User_Setup.h 檔案進行定義的，所以修改這個檔案就變的非常重要。

這個檔案的位置在：

Documents > Arduino > libraries > TFT_eSPI > User_Setup.h

**操作：** 開啟該檔案，清空原內容，複製並儲存以下程式碼：

```c++
// =========================================================================
//   User_Setup.h - Display driver configuration file for TFT_eSPI library
//   User_Setup.h - 用於 TFT_eSPI 函式庫的顯示驅動設定檔
//
//   Hardware: ESP32 (No PSRAM or not using GPIO 16/17)
//   硬體: ESP32 (無 PSRAM 或不使用 GPIO 16/17)
//
//   Driver: ILI9341 (8-bit parallel mode)
//   驅動: ILI9341 (8位並列模式)
// =========================================================================

// -------------------------------------------------------------------------
// 1. Driver Type Definition
//    定義驅動類型
// -------------------------------------------------------------------------
#define ILI9341_DRIVER       // Generic ILI9341 Driver (通用 ILI9341 驅動)

// -------------------------------------------------------------------------
// 2. Color Order Definition
//    定義顏色順序
// -------------------------------------------------------------------------
// If colors are inverted (e.g., red becomes blue), change this.
// 如果顏色反了（比如紅變藍），請更改此項。
#define TFT_RGB_ORDER TFT_BGR  // Most ILI9341 screens use BGR order (大部分 ILI9341 螢幕使用的是 BGR 順序)
// #define TFT_RGB_ORDER TFT_RGB

// -------------------------------------------------------------------------
// 3. Screen Resolution
//    定義螢幕解析度
// -------------------------------------------------------------------------
#define TFT_WIDTH  240
#define TFT_HEIGHT 320

// -------------------------------------------------------------------------
// 4. Interface Configuration (Critical)
//    介面設定 (關鍵部分)
// -------------------------------------------------------------------------
#define ESP32_PARALLEL       // Enable ESP32 parallel mode (啟用 ESP32 並列模式)
#define TFT_PARALLEL_8_BIT   // Use 8-bit parallel bus (使用 8 位並列匯流排)

// -------------------------------------------------------------------------
// 5. Pin Definitions
//    接腳定義
// -------------------------------------------------------------------------

// --- Control Pins (控制接腳) ---
// Optimization: CS/RST moved to GPIO 32+, keeping low GPIOs for data bus and WR.
// 您的優化方案：將 CS/RST 移至 GPIO 32+，保留低位 GPIO 給資料匯流排和 WR。

#define TFT_CS   32  // Chip Select (晶片選擇)
#define TFT_RST  33  // Reset (重置)

// Data/Command selection - Must be in GPIO 0-31（or RS）
// 資料/命令選擇 - 必須在 GPIO 0-31 （或者叫RS）
#define TFT_DC   14

// Write signal - ★ Critical pin, must be in GPIO 0-31 and keep connections short
// 寫入訊號 - ★關鍵接腳，必須在 GPIO 0-31 且盡量短線連接
#define TFT_WR   27

// Read signal - If not reading screen data, can connect to 3.3V, but must be defined in library
// 讀取訊號 - 如果不讀取螢幕資料，此腳可接 3.3V，但在函式庫中必須定義
#define TFT_RD    2

// --- Data Bus Pins D0 - D7 (資料匯流排接腳) ---
// Must be within GPIO 0-31 range.
// 必須在 GPIO 0-31 範圍內。
// Avoided GPIO 16, 17 (PSRAM/Flash) and 12 (Strap).
// 避開了 GPIO 16, 17 (PSRAM/Flash) 和 12 (Strap)。

#define TFT_D0   26
#define TFT_D1   25
#define TFT_D2   19
#define TFT_D3   18
#define TFT_D4    5  // Note: GPIO 5 is a Strap pin, ensure screen does not pull it high during power-up
                     // 注意：GPIO 5 是 Strap 接腳，上電時請確保螢幕未將其拉高
#define TFT_D5   21
#define TFT_D6   22
#define TFT_D7   23

// -------------------------------------------------------------------------
// 6. Backlight Control (Optional)
//    背光控制 (可選)
// -------------------------------------------------------------------------
// If your screen has a BLK or LED pin, connect it to an ESP32 pin and define it here.
// 如果您的螢幕有 BLK 或 LED 接腳，請連接到 ESP32 的某個接腳並在此定義。
// #define TFT_BL   4            // Example: Connected to GPIO 4 (示例：連接到 GPIO 4)
// #define TFT_BACKLIGHT_ON HIGH // High logic level turns on backlight (背光高電平點亮)

// -------------------------------------------------------------------------
// 7. Font Loading
//    字體載入
// -------------------------------------------------------------------------
// Enable as needed; enabling more fonts consumes more Flash memory.
// 根據需要啟用，啟用越多佔用 Flash 越多。

#define LOAD_GLCD   // Font 1. Original Glcd font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts. Include access to the 48 Adafruit_GFX free fonts FF1 to FF48

#define SMOOTH_FONT // Enable smooth font loading (啟用平滑字體載入)

// -------------------------------------------------------------------------
// 8. Other Settings
//    其他設定
// -------------------------------------------------------------------------
// In parallel mode, SPI frequency is usually ignored as speed is determined by CPU register write speed.
// Kept here for compatibility.
// 並列模式下，SPI 頻率設定通常被忽略，因為速度由 CPU 寫暫存器速度決定。
// 但為了相容性，保留此定義。
#define SPI_FREQUENCY       27000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY  2500000

// --- Touch Screen Settings (觸控螢幕設定) ---
// If you use XPT2046 touch function.
// Parallel screens usually have a separate SPI interface for touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).
// 如果您使用了觸控功能 XPT2046。
// 並列螢幕通常觸控是獨立的 SPI 介面 (T_CLK, T_CS, T_DIN, T_DO, T_IRQ)。

// If using touch, uncomment below and set pins (can use VSPI default pins).
// 如果使用觸控，請取消下方註解並設定接腳 (可以使用 VSPI 預設接腳)。

// #define TOUCH_CS 22
// WARNING: You used TFT_D6 on GPIO 22 above. If using touch, find another pin or use SoftSPI.
// 警告：您上面 TFT_D6 佔用了 22，如果用觸控，需另找接腳或使用軟 SPI。
```



## 開啟範例程式

透過以下路徑，開啟範例程式，這個程式可以測試：

Arduino IDE：File -> Examples -> TFT_eSPI -> 320 x 240 -> TFT_graphicstest_one_lib



## 上傳程式，遇到編譯失敗問題

如果您的 ESP32 開發板函式庫版本更新到了 **3.0.0 或以上**，在編譯 TFT_eSPI 時極大機率會遇到以下報錯：

```tex
In file included from /Users/shawn/Documents/Arduino/libraries/TFT_eSPI/TFT_eSPI.cpp:24:

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c: In member function 'uint8_t TFT_eSPI::readByte()':

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c:113:9: error: 'gpio_input_get' was not declared in this scope; did you mean 'gpio_num_t'?
113 |   reg = gpio_input_get(); // Read three times to allow for bus access time
|         ^~~~~~~~~~~~~~
|         gpio_num_t
exit status 1

Compilation error: exit status 1
```



`error: 'gpio_input_get' was not declared in this scope`

### 錯誤原因分析

`gpio_input_get()` 是 ESP32 早期底層開發框架（ESP-IDF）中的一個巨集或函數。在最近發布的 **ESP32 Arduino Core 3.0.x** 版本中，樂鑫對底層 API 進行了大幅度重構，移除或更改了許多舊的底層函數，導致 `TFT_eSPI` 函式庫在呼叫這個函數時找不到定義，從而報錯。

可以使用降級的方式進行修復，例如 esp32 函式庫降級到 2.0.x，這樣是最省心最方便的，但是我提供另一種使用修改 TFT_eSPI 函式庫的方式，進行修復：

找到這個檔案並開啟。

Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c

在程式碼的開頭新增以下巨集定義程式碼，儲存好修改的檔案：

```c++
#if !defined(gpio_input_get)
  #define gpio_input_get() GPIO.in
#endif
```



## 再次上傳程式，遇到畫面鏡像問題

這時，編譯已經通過，並成功上傳到開發板上，螢幕也都點亮了。但現在這個時候，還不能開心太早，因為仔細觀察，發現螢幕的文字鏡像了。

在範例程式中，我進行修改，找到範例程式的 102 行左右

```
void loop(void) {
  for (uint8_t rotation = 4; rotation < 8; rotation++) {
    tft.setRotation(rotation);
    testText();
    delay(2000);
  }
}
```



## 最後上傳程式

這時，畫面已經正常了，恭喜你成功點亮了這款 2.4 吋 TFT 螢幕（ILI9341）



## 常見問題排查 (FAQ)

以下是開發過程中最常遇到的問題與解答，供快速查閱。

### Q1: 螢幕亮白光但無畫面顯示？

- **A1**: 90% 是因為沒有開啟並列模式。請再次檢查 User_Setup.h 中是否已取消註解 #define ESP32_PARALLEL。
- **A2**: 檢查 TFT_RST (GPIO 33) 是否接觸良好。

### Q2: 顯示顏色不對，紅色變成了藍色？

- **A**: 這是 RGB 順序定義問題。在 User_Setup.h 中，將 #define TFT_RGB_ORDER TFT_RGB 改為 TFT_BGR（或者反過來）。

### Q3: 這套設定支援觸控功能 (Touch) 嗎？

- **A**: 本文僅設定了顯示驅動。ILI9341 螢幕通常帶 XPT2046 觸控晶片，它使用獨立的 SPI 介面。你需要另外連接触控接腳（T_CLK, T_CS, T_DIN, T_DO, T_IRQ）並在 User_Setup.h 中取消 TOUCH_CS 的註解。**警告**：觸控是 SPI 協定，不能和並列資料線 D0-D7 共用接腳。

### Q4: 為什麼不直接使用 VSPI/HSPI 驅動？

- **A**: 並列驅動（8-bit Parallel）的理論刷新速度是 SPI 的數倍，適合需要高幀率的 UI 介面或復古遊戲模擬器開發。
