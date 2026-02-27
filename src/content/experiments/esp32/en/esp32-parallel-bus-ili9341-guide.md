---
title: "ESP32 Driving ILI9341 Display via 8-bit Parallel Bus"
boardId: esp32
moduleId: ili9341
category: esp32
date: 2026-02-27
intro: "A detailed guide on using ESP32 to drive ILI9341 display via 8-bit parallel bus, providing extremely high refresh rates compared to SPI serial driving, perfect for displaying dynamic content."
image: "https://img.lingshunlab.com/image-20260204140130062.png"
---

This article provides a detailed guide on using ESP32 to drive an ILI9341 display via **8-bit Parallel Bus**. Compared to the common SPI serial driving, parallel mode can provide extremely high refresh rates, making it ideal for displaying dynamic content.

## Development Environment

OS: MacOS

Arduino IDE Version: 2.3.7

esp32 Version: 3.3.5

TFT_eSPI Version: 2.5.43



## BOM

ESP32 x1

2.4 inch TFT display x1

Dupont wires xN



## Wiring Connection

| TFT Pin          | **ESP32 Pin** | **Function Description**           |
| ---------------- | ------------- | ----------------------------------- |
| **VCC (3V3/5V)** | **3V3 / VIN** | Display power (try 3.3V first)     |
| **GND**          | **GND**       | Common ground                       |
| **LCD_D0**       | **GPIO 26**   | Data bit 0                          |
| **LCD_D1**       | **GPIO 25**   | Data bit 1                          |
| **LCD_D2**       | **GPIO 19**   | Data bit 2                          |
| **LCD_D3**       | **GPIO 18**   | Data bit 3                          |
| **LCD_D4**       | **GPIO 5**    | Data bit 4                          |
| **LCD_D5**       | **GPIO 21**   | Data bit 5                          |
| **LCD_D6**       | **GPIO 22**   | Data bit 6                          |
| **LCD_D7**       | **GPIO 23**   | Data bit 7                          |
| **LCD_CS**       | **GPIO 32**   | Chip Select                         |
| **LCD_RTS**      | **GPIO 33**   | Reset                               |
| **LCD_RS (DC)**  | **GPIO 14**   | Data/Command (Register Select)      |
| **LCD_WR**       | **GPIO 27**   | Write Control                       |
| **LCD_RD**       | **GPIO 2**    | Read Control (connect to 3.3V if ID reading not needed) |




## Required Libraries

### Arduino IDE Boards Manager: esp32

You must install the esp32 library from Espressif Systems. Here we're using the latest version.

### Arduino IDE Library Manager: TFT_eSPI

You must install the TFT_eSPI library.



## TFT_eSPI Configuration File "User_Setup.h"

TFT_eSPI is an excellent library for ESP32 to drive displays. However, the pin definitions, board definitions, and screen definitions are all configured in the User_Setup.h file, so modifying this file is very important.

The file location is:

Documents > Arduino > libraries > TFT_eSPI > User_Setup.h

**Action:** Open this file, clear the original content, copy and save the following code:

```c++
// =========================================================================
//   User_Setup.h - Display driver configuration file for TFT_eSPI library
//   User_Setup.h - 用于 TFT_eSPI 库的显示驱动配置文件
//
//   Hardware: ESP32 (No PSRAM or not using GPIO 16/17)
//   硬件: ESP32 (无 PSRAM 或不使用 GPIO 16/17)
//
//   Driver: ILI9341 (8-bit parallel mode)
//   驱动: ILI9341 (8位并行模式)
// =========================================================================

// -------------------------------------------------------------------------
// 1. Driver Type Definition
//    定义驱动类型
// -------------------------------------------------------------------------
#define ILI9341_DRIVER       // Generic ILI9341 Driver (通用 ILI9341 驱动)

// -------------------------------------------------------------------------
// 2. Color Order Definition
//    定义颜色顺序
// -------------------------------------------------------------------------
// If colors are inverted (e.g., red becomes blue), change this.
// 如果颜色反了（比如红变蓝），请更改此项。
#define TFT_RGB_ORDER TFT_BGR  // Most ILI9341 screens use BGR order (大部分 ILI9341 屏幕使用的是 BGR 顺序)
// #define TFT_RGB_ORDER TFT_RGB

// -------------------------------------------------------------------------
// 3. Screen Resolution
//    定义屏幕分辨率
// -------------------------------------------------------------------------
#define TFT_WIDTH  240
#define TFT_HEIGHT 320

// -------------------------------------------------------------------------
// 4. Interface Configuration (Critical)
//    接口配置 (关键部分)
// -------------------------------------------------------------------------
#define ESP32_PARALLEL       // Enable ESP32 parallel mode (启用 ESP32 并行模式)
#define TFT_PARALLEL_8_BIT   // Use 8-bit parallel bus (使用 8 位并行总线)

// -------------------------------------------------------------------------
// 5. Pin Definitions
//    引脚定义
// -------------------------------------------------------------------------

// --- Control Pins (控制引脚) ---
// Optimization: CS/RST moved to GPIO 32+, keeping low GPIOs for data bus and WR.
// 您的优化方案：将 CS/RST 移至 GPIO 32+，保留低位 GPIO 给数据总线和 WR。

#define TFT_CS   32  // Chip Select (片选)
#define TFT_RST  33  // Reset (复位)

// Data/Command selection - Must be in GPIO 0-31（or RS）
// 数据/命令选择 - 必须在 GPIO 0-31 （或者叫RS）
#define TFT_DC   14

// Write signal - ★ Critical pin, must be in GPIO 0-31 and keep connections short
// 写信号 - ★关键引脚，必须在 GPIO 0-31 且尽量短线连接
#define TFT_WR   27

// Read signal - If not reading screen data, can connect to 3.3V, but must be defined in library
// 读信号 - 如果不读取屏幕数据，此脚可接 3.3V，但在库中必须定义
#define TFT_RD    2

// --- Data Bus Pins D0 - D7 (数据总线引脚) ---
// Must be within GPIO 0-31 range.
// 必须在 GPIO 0-31 范围内。
// Avoided GPIO 16, 17 (PSRAM/Flash) and 12 (Strap).
// 避开了 GPIO 16, 17 (PSRAM/Flash) 和 12 (Strap)。

#define TFT_D0   26
#define TFT_D1   25
#define TFT_D2   19
#define TFT_D3   18
#define TFT_D4    5  // Note: GPIO 5 is a Strap pin, ensure screen does not pull it high during power-up
                     // 注意：GPIO 5 是 Strap 引脚，上电时请确保屏幕未将其拉高
#define TFT_D5   21
#define TFT_D6   22
#define TFT_D7   23

// -------------------------------------------------------------------------
// 6. Backlight Control (Optional)
//    背光控制 (可选)
// -------------------------------------------------------------------------
// If your screen has a BLK or LED pin, connect it to an ESP32 pin and define it here.
// 如果您的屏幕有 BLK 或 LED 引脚，请连接到 ESP32 的某个引脚并在此定义。
// #define TFT_BL   4            // Example: Connected to GPIO 4 (示例：连接到 GPIO 4)
// #define TFT_BACKLIGHT_ON HIGH // High logic level turns on backlight (背光高电平点亮)

// -------------------------------------------------------------------------
// 7. Font Loading
//    字体加载
// -------------------------------------------------------------------------
// Enable as needed; enabling more fonts consumes more Flash memory.
// 根据需要启用，启用越多占用 Flash 越多。

#define LOAD_GLCD   // Font 1. Original Glcd font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts. Include access to the 48 Adafruit_GFX free fonts FF1 to FF48

#define SMOOTH_FONT // Enable smooth font loading (启用平滑字体加载)

// -------------------------------------------------------------------------
// 8. Other Settings
//    其他设置
// -------------------------------------------------------------------------
// In parallel mode, SPI frequency is usually ignored as speed is determined by CPU register write speed.
// Kept here for compatibility.
// 并行模式下，SPI 频率设置通常被忽略，因为速度由 CPU 写寄存器速度决定。
// 但为了兼容性，保留此定义。
#define SPI_FREQUENCY       27000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY  2500000

// --- Touch Screen Settings (触摸屏设置) ---
// If you use XPT2046 touch function.
// Parallel screens usually have a separate SPI interface for touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).
// 如果您使用了触摸功能 XPT2046。
// 并行屏幕通常触摸是独立的 SPI 接口 (T_CLK, T_CS, T_DIN, T_DO, T_IRQ)。

// If using touch, uncomment below and set pins (can use VSPI default pins).
// 如果使用触摸，请取消下面注释并设置引脚 (可以使用 VSPI 默认引脚)。

// #define TOUCH_CS 22
// WARNING: You used TFT_D6 on GPIO 22 above. If using touch, find another pin or use SoftSPI.
// 警告：您上面 TFT_D6 占用了 22，如果用触摸，需另找引脚或使用软 SPI。
```



## Open Example Program

Open the example program through the following path, which can be used for testing:

Arduino IDE: File -> Examples -> TFT_eSPI -> 320 x 240 -> TFT_graphicstest_one_lib



## Upload Program - Compilation Error Issue

If your ESP32 board library version has been updated to **3.0.0 or above**, you will most likely encounter the following error when compiling TFT_eSPI:

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

### Error Analysis

`gpio_input_get()` is a macro or function in the early ESP32 low-level development framework (ESP-IDF). In the recently released **ESP32 Arduino Core 3.0.x** version, Espressif performed a major refactoring of the underlying API, removing or changing many old low-level functions, causing the `TFT_eSPI` library to fail to find the definition when calling this function, resulting in an error.

You can fix this by downgrading, for example, downgrading the esp32 library to 2.0.x. This is the easiest and most convenient method. However, I provide another method using the modified TFT_eSPI library for fixing:

Find and open this file:

Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c

Add the following macro definition code at the beginning of the code and save the modified file:

```c++
#if !defined(gpio_input_get)
  #define gpio_input_get() GPIO.in
#endif
```



## Upload Program Again - Screen Mirroring Issue

At this point, compilation has passed and successfully uploaded to the board, and the screen is also lit. However, don't celebrate too early yet, because upon careful observation, you'll find that the screen text is mirrored.

In the example program, make modifications around line 102:

```
void loop(void) {
  for (uint8_t rotation = 4; rotation < 8; rotation++) {
    tft.setRotation(rotation);
    testText();
    delay(2000);
  }
}
```



## Final Upload

At this point, the display is normal. Congratulations, you have successfully lit up this 2.4-inch TFT display (ILI9341).



## FAQ (Frequently Asked Questions)

The following are the most common problems and solutions encountered during development for quick reference.

### Q1: Screen lights up white but no display?

- **A1**: 90% is because parallel mode is not enabled. Please check again in User_Setup.h if #define ESP32_PARALLEL is uncommented.
- **A2**: Check if TFT_RST (GPIO 33) is making good contact.

### Q2: Display colors are wrong, red becomes blue?

- **A**: This is an RGB order definition issue. In User_Setup.h, change #define TFT_RGB_ORDER TFT_RGB to TFT_BGR (or vice versa).

### Q3: Does this configuration support Touch functionality?

- **A**: This article only configures the display driver. ILI9341 screens usually come with XPT2046 touch chip, which uses an independent SPI interface. You need to additionally connect touch pins (T_CLK, T_CS, T_DIN, T_DO, T_IRQ) and uncomment TOUCH_CS in User_Setup.h. **Warning**: Touch uses SPI protocol and cannot share pins with parallel data lines D0-D7.

### Q4: Why not use VSPI/HSPI driving directly?

- **A**: The theoretical refresh speed of parallel driving (8-bit Parallel) is several times that of SPI, suitable for UI interfaces requiring high frame rates or retro game emulator development.
