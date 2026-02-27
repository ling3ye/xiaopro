![image-20260204140130062](https://img.lingshunlab.com/image-20260204140130062.png)

本文将详细介绍如何使用 ESP32 通过 **8位并行总线 (8-bit Parallel)** 驱动 ILI9341 屏幕。相比常见的 SPI 串行驱动，并行模式能提供极高的刷新率，非常适合显示动态画面。

## 开发环境

OS: MacOS

Arduino IDE Version: 2.3.7

esp32 Version:  3.3.5

TFT_eSPI Version: 2.5.43





## BOM

![image-20260204140023566](https://img.lingshunlab.com/image-20260204140023566.png)

ESP32 x1

2.4 inch TFT display x1

杜邦线 xN



## 接线方式

| TFT Pin          | **ESP32 Pin** | **功能说明**                     |
| ---------------- | ------------- | -------------------------------- |
| **VCC (3V3/5V)** | **3V3 / VIN** | 屏幕供电 (建议先试 3.3V)         |
| **GND**          | **GND**       | 共地                             |
| **LCD_D0**       | **GPIO 26**   | 数据位 0                         |
| **LCD_D1**       | **GPIO 25**   | 数据位 1                         |
| **LCD_D2**       | **GPIO 19**   | 数据位 2                         |
| **LCD_D3**       | **GPIO 18**   | 数据位 3                         |
| **LCD_D4**       | **GPIO 5**    | 数据位 4                         |
| **LCD_D5**       | **GPIO 21**   | 数据位 5                         |
| **LCD_D6**       | **GPIO 22**   | 数据位 6                         |
| **LCD_D7**       | **GPIO 23**   | 数据位 7                         |
| **LCD_CS**       | **GPIO 32**   | 片选 (Chip Select)               |
| **LCD_RTS**      | **GPIO 33**   | 复位 (Reset)                     |
| **LCD_RS (DC)**  | **GPIO 14**   | 数据/命令切换 (Register Select)  |
| **LCD_WR**       | **GPIO 27**   | 写使能 (Write Control)           |
| **LCD_RD**       | **GPIO 2**    | 读使能 (如不需读取 ID 可接 3.3V) |

![image-20260204140110711](https://img.lingshunlab.com/image-20260204140110711.png)



## 必须安装的库

### Arduino IDE Boards Manger：esp32

必须安装乐鑫（by Espressif Systems）出的esp32库，这里安装的是最新版本。

### Arduino IDE Library Manager：TFT_eSPI

必须安装TFT_eSPI这个库



##  TFT_eSPI 配置「User_Setup.h」文件

TFT_eSPI 是 ESP32 驱动屏幕的神器，但这个库的引脚定义，开发板定义，屏幕定义，都在这个User_Setup.h文件进行定义的，所以修改这个文件就变的非常重要。

这个文件的位置在：

Documents > Arduino > libraries > TFT_eSPI > User_Setup.h

**操作：** 打开该文件，清空原内容，复制并保存以下代码：

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



## 打开示例程序

通过以下路径，打开示例程序，这个程序可以测试：

Arduino IDE ：File -> Examples -> TFT_eSPI -> 320 x 240 -> TFT_graphicstest_one_lib



## 上传程序，遇到编译失败问题

![image-20260204140204176](https://img.lingshunlab.com/image-20260204140204176.png)

如果您的 ESP32 开发板库版本更新到了 **3.0.0 或以上**，在编译 TFT_eSPI 时极大概率会遇到以下报错：

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

### 错误原因分析

`gpio_input_get()` 是 ESP32 早期底层开发框架（ESP-IDF）中的一个宏或函数。 在最近发布的 **ESP32 Arduino Core 3.0.x** 版本中，乐鑫（Espressif）对底层 API 进行了大幅度重构，移除或更改了许多旧的底层函数，导致 `TFT_eSPI` 库在调用这个函数时找不到定义，从而报错。

可以使用降级的方式进行修复，例如esp32库降级到2.0.x，这样是最省心最方便的，但是我提供另一种使用修改TFT_eSPI库的方式，进行修复:

找到这个文件并打开。

Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c

在代码的开头添加以下宏定义代码，保存好修改的文件：

```c++
#if !defined(gpio_input_get)
  #define gpio_input_get() GPIO.in
#endif
```



![image-20260204140233621](https://img.lingshunlab.com/image-20260204140233621.png)

## 再次上传程序，遇到画面镜像问题

这时，编译已经通过，并成功上传到开发板上，屏幕也都点亮了。但现在这个时候，还不能开心太早，因为仔细观察，发现屏幕的文字镜像了。

![image-20260204140337127](https://img.lingshunlab.com/image-20260204140337127.png)

在示例程序中，我进行修改，找到示例程序的102行左右

```
void loop(void) {
  for (uint8_t rotation = 4; rotation < 8; rotation++) {
    tft.setRotation(rotation);
    testText();
    delay(2000);
  }
}
```



## 最后上传程序

这时，画面已经正常了，恭喜你成功点亮了这款2.4寸TFT屏幕（ILI9341）





## 常见问题排查 (FAQ)

以下是开发过程中最常遇到的问题与解答，供快速查阅。

### Q1: 屏幕亮白光但无画面显示？

- **A1**: 90% 是因为没有开启并口模式。请再次检查 User_Setup.h 中是否已取消注释 #define ESP32_PARALLEL。
- **A2**: 检查 TFT_RST (GPIO 33) 是否接触良好。

### Q2: 显示颜色不对，红色变成了蓝色？

- **A**: 这是 RGB 顺序定义问题。在 User_Setup.h 中，将 #define TFT_RGB_ORDER TFT_RGB 改为 TFT_BGR（或者反过来）。

### Q3: 这套配置支持触摸功能 (Touch) 吗？

- **A**: 本文仅配置了显示驱动。ILI9341 屏幕通常带 XPT2046 触摸芯片，它使用独立的 SPI 接口。你需要另外连接触摸引脚（T_CLK, T_CS, T_DIN, T_DO, T_IRQ）并在 User_Setup.h 中取消 TOUCH_CS 的注释。**警告**：触摸是 SPI 协议，不能和并口数据线 D0-D7 共用引脚。

### Q4: 为什么不直接使用 VSPI/HSPI 驱动？

- **A**: 并口驱动（8-bit Parallel）的理论刷新速度是 SPI 的数倍，适合需要高帧率的 UI 界面或复古游戏模拟器开发。