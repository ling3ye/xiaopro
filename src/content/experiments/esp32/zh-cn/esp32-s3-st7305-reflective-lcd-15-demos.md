---
title: "ESP32-S3 驱动 ST7305 4.2 寸全反射屏：15 个示例完整教程（四线 SPI + Arduino）"
boardId: esp32s3
moduleId: display/lcd42-st7305-reflective
category: esp32
date: 2026-11-06
intro: "用 Arduino Nano ESP32（ESP32-S3）和四线 SPI 驱动 ST7305 4.2 寸 300×400 全反射单色屏，完成接线、烧录、15 个显示示例与故障排查，适合想玩转无背光反射屏的 Arduino 玩家。"
image: "https://img.lingflux.com/2026/11/e43d291425c39954fa157a9adb62fddb.jpg"
---

> **一句话摘要**：Arduino Nano ESP32（ESP32-S3）+ 4.2 寸 ST7305 全反射单色屏，一个 `.ino` 文件跑通驱动 + 15 页自动轮播演示，不用任何第三方显示库。

```text
难度：⭐⭐☆☆☆（会接杜邦线、会用 Arduino IDE 就能上手）
预计时间：30 分钟（不含和接触不良斗智斗勇的时间）
测试环境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10
```

> **TL;DR（快速上手）：**
>
> 1. 接线：SCLK → D7/GPIO10，MOSI → D5/GPIO8，CS → D6/GPIO9，DC → D4/GPIO7，RES → D3/GPIO6。
> 2. VCI 接 3.3V，屏幕与开发板共地；TE、BLC 不接。注意：Nano ESP32 的 D5 是 GPIO8，不是 GPIO11。
> 3. 安装开发板支持包 `esp32 by Espressif Systems`，不用安装 U8g2、Adafruit GFX 或其他显示库。
> 4. 打开配套 `ST7305_RLCD_Demo.ino`，开发板选择 `Arduino Nano ESP32`，编译烧录。
> 5. 串口波特率设为 115200，屏幕会自动轮播 15 个示例；动画页使用 HPM，静态页只写屏一次。

## 前言：一块不发光，反而更清楚的屏幕

晚上看普通 LCD，有时像有人拿着小手电照你的眼睛；电子墨水屏舒服归舒服，刷新动画又像在等公交车——你知道它会来，但就是快不起来。

全反射屏走的是另一条路：它不靠背光照亮像素，而是反射环境光，像一张能被程序改写的纸。光线充足时，显示反而更清楚；环境太暗时，请开一盏环境灯，别靠眯眼展示意志力。

这次我用 Arduino Nano ESP32（主控是 ESP32-S3），驱动一块 4.2 寸、300×400、ST7305 控制器的全反射 Mono TFT。目标不是只显示一句 `Hello World` 就收工，而是用 15 个示例把文字、灰阶、几何图形、动画、帧率和四方向旋转都试一遍。

这里说的“护眼”是无背光、依靠环境光反射的观看方式，不是医疗功效认证。该休息眼睛时，再高级的屏也不能替你眨眼。

## 最终效果：15 个 ST7305 示例自动轮播

烧录一个 `.ino` 文件后，屏幕会从启动页开始，自动循环 15 个页面，不需要按键、串口命令、网络或外部图片素材。

![ST7305 15 个示例轮播效果](https://img.lingflux.com/2026/11/26bdefa52b9c1d4b6e779c08f9744255.jpg)

|    # | 示例          | 主要看什么                             | 停留时间 | 目标帧率 |
| ---: | ------------- | -------------------------------------- | -------: | -------: |
|    1 | Hello World   | 大字、边框、抖动背景和笑脸             |   3.5 秒 |     静态 |
|    2 | Dither Gray   | 17 级 4×4 Bayer 抖动灰阶、渐变和灰度圆 |   6.5 秒 |     静态 |
|    3 | Geometry      | 直线、矩形、圆、三角形和多边形         |     5 秒 |     静态 |
|    4 | Pixel Grid    | 边缘、比例、对角线和几何居中           |     5 秒 |     静态 |
|    5 | Text & Font   | 5×7 ASCII、整数倍放大和反白文字        |   5.5 秒 |     静态 |
|    6 | Dashboard UI  | 卡片、进度条、开关、电池和动态数据     |     9 秒 |    4 FPS |
|    7 | Frame Rate    | 实际 FPS、帧耗时和 54 点历史曲线       |   8.5 秒 |   不限速 |
|    8 | Fine Patterns | 1/2/4 像素棋盘格与细线闪烁             |     6 秒 |    2 FPS |
|    9 | Bounce        | 弹跳碰撞、运动残影和碰撞计数           |     9 秒 |   20 FPS |
|   10 | Starfield     | 56 个星点的透视飞行                    |     9 秒 |   20 FPS |
|   11 | Game of Life  | 34×34 环形边界的 Conway 生命游戏       |    12 秒 |    3 FPS |
|   12 | Uptime Clock  | 基于 `esp_timer` 的运行时钟            |     9 秒 |    4 FPS |
|   13 | Retro Desktop | 复古 Macintosh 风格桌面                |   6.5 秒 |     静态 |
|   14 | Inversion     | 全屏黑白反色与对比度检查               |     6 秒 |    2 FPS |
|   15 | Rotation      | 0°/90°/180°/270° 四方向切换            |    12 秒 |    4 FPS |

目标帧率是程序绘制与发送的节奏，不等于玻璃面板的光学刷新率。第 7 页统计的是“绘图 + 15000 字节整帧 SPI 发送”，不是给屏幕贴一张虚高的跑分奖状。

Youtube 演示视频：

<iframe width="560" height="315" src="https://www.youtube.com/embed/IWZMK5AJsvI?si=pXumVzEKfuIYEra9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## 元件说明

### 4.2 寸全反射 Mono TFT：靠环境光“显影”的黑白屏

4.2 寸全反射 Mono TFT 是一种无背光的反射式单色液晶屏，负责利用环境光呈现黑白画面，用在本项目里的作用是显示 15 组测试图案和动态界面。

可以把它理解成一张“会听单片机指挥的纸”：外界光线越合适，看起来越省力；没有环境光时，它也不会自己变成手电筒。

| 参数       | 本项目屏幕               |
| ---------- | ------------------------ |
| 模组图号   | W420HC018MONO-12Z        |
| 尺寸       | 4.2 英寸                 |
| 分辨率     | 300×400 像素，1 bit 黑白 |
| 显示方式   | 全反射、常白、无背光     |
| 驱动 IC    | Sitronix ST7305          |
| 主控接口   | 单路四线 SPI，只写不读   |
| 屏幕供电   | 2.8V/3.3V，本例使用 3.3V |
| 有效显示区 | 63.6×84.84 mm            |
| 工作温度   | -20℃～+70℃               |

选它的原因很简单：300×400 足够画完整仪表界面，四线 SPI 不占太多引脚，而且不用背光电路，适合环境数据、时钟和低刷新率仪表盘。

### 引脚说明

这块屏通过 12Pin FPC 排线引出全部信号，配合转接板即可用杜邦线连接开发板：

| FPC 引脚 | 名称  | 功能                  | 本例处理       |
| -------: | ----- | --------------------- | -------------- |
| 1、5、12 | GND   | 电源地                | 接开发板 GND   |
|     2、3 | NC    | 空脚                  | 不接           |
|        4 | VCI   | 屏幕电源              | 接 3.3V        |
|        6 | TE    | 帧同步输出            | 本例未用，悬空 |
|        7 | DC    | 命令/数据选择         | 接 GPIO7       |
|        8 | CS    | SPI 片选，低有效      | 接 GPIO9       |
|        9 | SCL   | SPI 时钟              | 接 GPIO10      |
|       10 | SDA   | SPI 数据输入，即 MOSI | 接 GPIO8       |
|       11 | RESET | 硬件复位，低有效      | 接 GPIO6       |

这里的 `SDA` 是 SPI MOSI，不是 I²C。名字一样，干的活不一样，别让它去和 I²C 传感器认亲。

### ST7305：把字节翻译成黑白像素的“分拣员”

ST7305 是 Sitronix 的超低功耗单色 TFT 控制器/驱动 IC，负责接收主控命令、管理显示内存并驱动面板，用在本项目里的作用是把 ESP32-S3 发来的帧数据变成屏幕上的黑白像素。

| 参数           | 数值或本项目配置                  |
| -------------- | --------------------------------- |
| 最大驱动能力   | 408×408 单色像素                  |
| 像素深度       | 1 bit/像素                        |
| SPI 写周期下限 | 30 ns，对应约 33 MHz 上限         |
| 本项目 SPI     | Mode 0、20 MHz、MSB 先传          |
| HPM 帧率       | 16 Hz 或 32 Hz；本例配置为 16 Hz  |
| LPM 帧率       | 0.25～8 Hz；本例初始化配置为 8 Hz |
| 本项目整帧数据 | 15000 字节                        |

选它不是因为寄存器多显得专业，而是模组已经把它封装好了：主控只需要 SPI、DC、CS 和 RESET，就能完成整屏刷新。

### FPC 转接板：把“细排线”翻译成“杜邦线”

FPC 转接板是一种排线接口转换板，负责把屏幕的 12Pin FPC 引到便于实验的排针，用在本项目里的作用是让屏幕能直接通过杜邦线连接开发板。

| 参数     | 本项目使用情况                       |
| -------- | ------------------------------------ |
| 屏幕端   | 12Pin FPC                            |
| 实验端   | GND、VCC、SCL、SDA、RES、DC、CS、BLC |
| 必需信号 | 5 根控制线 + 3.3V + GND              |
| 可不接   | TE、BLC                              |

选它是为了不徒手焊接细排线。毕竟我们做显示实验，不是报名参加眼科和焊接双重考试。

## BOM 清单

| 元件                       |     数量 | 必需性 | 备注                            |
| -------------------------- | -------: | ------ | ------------------------------- |
| Arduino Nano ESP32 开发板  |        1 | 必需   | 主控为 ESP32-S3                 |
| 4.2 寸 ST7305 全反射单色屏 |        1 | 必需   | 300×400，3.3V 供电              |
| 配套 FPC 转接板            |        1 | 建议   | 仅方便接线，可用 FPC 连接器代替 |
| 杜邦线                     | 7 根以上 | 必需   | 尽量短，减少接触和信号问题      |

## 接线方式：ESP32-S3 四线 SPI 连接 ST7305

![ST7305 与 Arduino Nano ESP32 接线实拍](https://img.lingflux.com/2026/11/a029c2eab88f09f46c951a53287b647e.jpg)

```text
Arduino Nano ESP32                         ST7305 屏幕转接板
┌──────────────────┐                     ┌──────────────────┐
│ D7  / GPIO10     │ ───── SCLK ───────► │ SCL              │
│ D5  / GPIO8      │ ───── MOSI ───────► │ SDA              │
│ D6  / GPIO9      │ ───── CS ─────────► │ CS               │
│ D4  / GPIO7      │ ───── DC ─────────► │ DC               │
│ D3  / GPIO6      │ ───── RESET ──────► │ RES              │
│ 3V3              │ ───── 3.3V ───────► │ VCC / VCI        │
│ GND              │ ───── 共地 ───────► │ GND              │
└──────────────────┘                     └──────────────────┘
```

| 转接板丝印 |  屏幕 FPC | Nano ESP32 丝印 | ESP32-S3 GPIO | 用途             |
| ---------- | --------: | --------------- | ------------: | ---------------- |
| SCL        |      PIN9 | D7              |        GPIO10 | SPI 时钟         |
| SDA        |     PIN10 | D5              |         GPIO8 | SPI MOSI         |
| CS         |      PIN8 | D6              |         GPIO9 | 片选             |
| DC         |      PIN7 | D4              |         GPIO7 | 命令/数据选择    |
| RES        |     PIN11 | D3              |         GPIO6 | 硬件复位         |
| VCC/VCI    |      PIN4 | 3V3             |     3.3V 电源 | 屏幕供电         |
| GND        | PIN1/5/12 | GND             |           GND | 共地             |
| TE         |      PIN6 | 不接            |             — | 本例未使用帧同步 |
| BLC        |         — | 不接            |             — | 全反射屏无背光   |

**本例 VCI 接 3.3V，不要接 5V、VBUS 或 VIN。**

### 不用额外驱动电路，ESP32-S3 可以直接连接屏幕 FPC

这块屏在 3.3V 供电下，可以由 ESP32-S3 的 GPIO 直接驱动：FPC 上的 SCL、SDA、CS、DC、RESET 分别连接对应 GPIO，VCI 接 3.3V，GND 共地即可。中间不需要增加电平转换芯片、专用显示驱动板或其他外围功能电路。

这里的“直接连接”说的是**电气连接**，不是把柔软的裸排线直接插进开发板排针。实际制作时，仍需使用 12Pin FPC 连接器、焊接座或转接板，把排线触点可靠地引出来。本文使用转接板只是为了方便接杜邦线，它承担机械转接作用，并不是屏幕工作所必需的驱动电路。如果直接从 FPC 连接器引线，按照上表中的 FPC PIN 编号连接即可，信号关系完全相同。

接线最容易翻车的一点是：代码里填的是芯片 GPIO 编号，不是开发板丝印中的数字。本例 `D5 = GPIO8`，而 `GPIO11 = A4`。如果把 MOSI 错配到 GPIO11，程序照样运行、串口照样打印，屏幕却会安静得像没交电费。

建议接完后按“电源 → 共地 → SCLK → MOSI → CS → DC → RESET”的顺序逐一核对，能省 80% 排错时间。FPC 还要确认插入方向、完全到底并锁紧，松一格都可能让整屏罢工。

## 需要安装的库：只装 ESP32 开发板支持包

这份 ST7305 Arduino 示例不依赖 U8g2、Adafruit GFX、TFT_eSPI 或额外字体库。驱动、5×7 ASCII 字库、图形基元和 15 个页面都在一个 `.ino` 文件里。

### 第一步：安装 Arduino IDE

本文使用 Arduino IDE 2.3.8，可从 Arduino 官方网站下载安装。

### 第二步：安装 ESP32 Arduino Core

打开开发板管理器，搜索并安装：

```text
esp32 by Espressif Systems（本文测试版本 3.3.10）
```

在开发板管理器中选择与本文一致的版本，可以减少不同开发板支持包之间的 API 和默认配置差异。

### 第三步：选择开发板与串口

```text
开发板：Arduino Nano ESP32
端口：选择连接开发板后出现的对应端口
串口监视器：115200
```

Arduino 标准 `SPI`、计时器和 `esp_timer` 都由开发板环境提供，不需要再去库管理器里“随缘安装几个名字像的库”。

### 补充：如果想使用现成库，有哪些选择？

本教程采用单文件驱动，是为了让初始化、帧缓存和像素映射都能直接查看；并不是说 ST7305 不能使用库。若要在本项目基础上二次开发，可以按需求考虑以下方案：

| 方案                                                         | 适合场景                             | 使用时的注意事项                                             |
| ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------ |
| [U8g2](https://github.com/olikraus/u8g2) v2.36 及以上        | 文字、基础图形和丰富字体             | 已提供 `U8G2_ST7305_300X400_1_4W_HW_SPI`，支持本例分辨率的四线硬件 SPI；安装时确认库版本，并把 CS、DC、RESET 及 SPI 引脚改为本文使用的 GPIO |
| [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library) | 想直接使用专门的 ST7305 Arduino 驱动 | 提供 `ST7305_4p2_BW_DisplayDriver` 等封装；需核对分辨率、初始化序列及 `DisplayConfig.h` 引脚配置，本文尚未在该模组上实测 |
| LVGL + ST7305 底层驱动                                       | 复杂界面、控件和页面管理             | LVGL 负责 UI，并不替代 ST7305 驱动；需要把本文驱动或厂商驱动接入显示刷新回调，同时评估帧缓存占用和实际刷新效果 |

不要默认 Adafruit GFX、TFT_eSPI、Arduino_GFX 等通用图形库安装后就能直接驱动 ST7305；应先确认当前版本是否明确支持这个控制器，否则仍需自行适配。即使换库，3.3V 供电、四线 SPI、HPM/LPM 和 2 行×4 列像素映射等硬件约束也不会消失。

**简单选型建议：**主要显示文字和基础图形，可优先尝试 U8g2；想做复杂 UI，再考虑 LVGL；若希望完整掌控初始化、整帧发送和动画节奏，本文的单文件方案更直观。

## 完整代码：ST7305_RLCD_Demo 单文件 Arduino 程序

完整可烧录源码：

```c
/*
 * ST7305 4.2寸 300x400 全反射单色 LCD —— Arduino 单文件完整 Demo
 *
 * 与 ESP-IDF 版本功能一致：驱动 + 图形基元 + 15 页自动轮播演示。
 * 整个程序只有这一个 .ino 文件，不依赖任何第三方库，方便直接传播。
 *
 * 接线（Arduino Nano ESP32 丝印）：
 *   SCLK = GPIO10 (D7)   MOSI = GPIO8 (D5)   CS  = GPIO9 (D6)
 *   DC   = GPIO7  (D4)   RES  = GPIO6 (D3)   VCI = 3.3V  GND = GND
 *
 * Arduino IDE 准备：
 *   1. 开发板管理器安装 "esp32 by Espressif Systems"
 *   2. 开发板选择 "Arduino Nano ESP32"，选择对应串口
 *   3. 本文件需放在同名文件夹中（IDE 打开 .ino 时会提示，点"确定"即可）
 */
#include <Arduino.h>
#include <SPI.h>
#include "esp_timer.h"   /* esp_timer_get_time() */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>

/* ================= 用户可改：引脚与 SPI 时钟 ================= */
#define PIN_SCLK        10
#define PIN_MOSI         8
#define PIN_CS           9
#define PIN_DC           7
#define PIN_RES          6
#define SPI_CLOCK_HZ     20000000UL   /* 20 MHz，建议 20~30 MHz */

/* ================= ST7305 基本参数 ================= */
#define ST7305_LCD_WIDTH      300
#define ST7305_LCD_HEIGHT     400
#define ST7305_DATA_WIDTH     75      /* 每行 300/4 = 75 字节 */
#define ST7305_BUFFER_LENGTH  15000   /* 75 * 200 */
#define ST7305_COLOR_WHITE    0x00
#define ST7305_COLOR_BLACK    0x01

#define LOGI(fmt, ...) Serial.printf("[st7305] " fmt "\r\n", ##__VA_ARGS__)

/* 驱动设备（单实例，帧缓存 15000 字节内嵌） */
typedef struct {
    int gpio_dc;
    int gpio_res;
    int gpio_cs;
    uint32_t clock_hz;
    uint8_t rotation;                      /* 0=0° 1=90° 2=180° 3=270°（顺时针） */
    uint8_t buffer[ST7305_BUFFER_LENGTH];
} st7305_dev_t;

typedef st7305_dev_t *st7305_handle_t;

static st7305_dev_t lcd_dev;               /* 全局唯一实例 */

static inline void dc_cmd(st7305_handle_t dev)  { digitalWrite(dev->gpio_dc, LOW); }
static inline void dc_data(st7305_handle_t dev) { digitalWrite(dev->gpio_dc, HIGH); }

static void spi_write_byte(st7305_handle_t dev, uint8_t data)
{
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.transfer(data);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/* 写寄存器（命令）：DC=低 */
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);
    spi_write_byte(dev, reg);
}

/* 写参数（数据）：DC=高 */
static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);
    spi_write_byte(dev, data);
}

static void write_params(st7305_handle_t dev, uint8_t reg, const uint8_t *params, size_t len)
{
    write_register(dev, reg);
    for (size_t i = 0; i < len; i++) write_parameter(dev, params[i]);
}

/**
 * ST7305 初始化序列：与厂商 HSD 4.2" 300x400 高扫描率初始化代码一致；
 * MADCTL=0x48（MX=1, DO=1）、Sleep-out 延时 255ms、CASET 列窗口 0x12~0x2B。
 */
static void initial_st7305(st7305_handle_t dev)
{
    /* 硬件复位 */
    digitalWrite(dev->gpio_res, HIGH); delay(10);
    digitalWrite(dev->gpio_res, LOW);  delay(10);
    digitalWrite(dev->gpio_res, HIGH); delay(10);

#define WR(reg, ...) do { \
        const uint8_t p[] = {__VA_ARGS__}; \
        write_params(dev, reg, p, sizeof(p)); \
    } while (0)

    WR(0xD6, 0x17, 0x02);   /* NVM Load Control */
    WR(0xD1, 0x01);         /* Booster Enable */
    WR(0xC0, 0x11, 0x04);   /* Gate Voltage: VGH=16.5V, VGL=-7V */
    WR(0xC1, 0x41, 0x41, 0x41, 0x41);  /* VSHP 5.0V x4 */
    WR(0xC2, 0x19, 0x19, 0x19, 0x19);  /* VSLP 0.5V x4 */
    WR(0xC4, 0x41, 0x41, 0x41, 0x41);  /* VSHN -3.8V x4 */
    WR(0xC5, 0x19, 0x19, 0x19, 0x19);  /* VSLN 0.5V x4 */
    WR(0xD8, 0xA6, 0xE9);   /* OSC: HPM~51Hz / LPM~1Hz */
    WR(0xB2, 0x05);         /* Frame Rate: HPM=16Hz, LPM=8Hz */
    WR(0xB3, 0xE5, 0xF6, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45); /* Gate EQ HPM */
    WR(0xB4, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45);             /* Gate EQ LPM */
    WR(0x62, 0x32, 0x03, 0x1F); /* Gate Timing Control */
    WR(0xB7, 0x13);         /* Source EQ Enable */
    WR(0xB0, 0x64);         /* Gate Line: 400 行（需 Sleep-out 前设置） */

    write_register(dev, 0x11);  /* Sleep out */
    delay(255);

    WR(0xC9, 0x00);         /* Source Voltage Select: 第 1 组 */
    WR(0x36, 0x48);         /* MADCTL: MX=1, DO=1 */
    WR(0x3A, 0x11);         /* Data Format: 3-write 24-bit */
    WR(0xB9, 0x20);         /* Mono 模式（厂商遗留） */
    WR(0xB8, 0x29);         /* Panel: dot_1 反显 + Frame 扫描 */

    write_register(dev, 0x21);  /* Inverse ON */

    /* WRITE RAM 300*400 地址窗口 */
    WR(0x2A, 0x12, 0x2B);   /* CASET */
    WR(0x2B, 0x00, 0xC7);   /* RASET 0~199 */
    WR(0x35, 0x00);         /* TE ON（V-Blank） */
    WR(0xD0, 0xFF);         /* Auto power down */

    write_register(dev, 0x39);  /* LPM */
    write_register(dev, 0x29);  /* DISPLAY ON */
#undef WR
}

st7305_handle_t st7305_init(int gpio_dc, int gpio_res, int gpio_cs,
                            int gpio_sclk, int gpio_mosi, uint32_t clock_hz)
{
    st7305_handle_t dev = &lcd_dev;
    dev->gpio_dc = gpio_dc;
    dev->gpio_res = gpio_res;
    dev->gpio_cs = gpio_cs;
    dev->clock_hz = clock_hz;
    dev->rotation = 0;

    pinMode(gpio_dc, OUTPUT);
    pinMode(gpio_res, OUTPUT);
    pinMode(gpio_cs, OUTPUT);
    digitalWrite(gpio_cs, HIGH);
    digitalWrite(gpio_res, HIGH);

    /* 只有 MOSI，无 MISO；CS 由软件手动控制 */
    SPI.begin(gpio_sclk, -1, gpio_mosi, -1);

    initial_st7305(dev);
    memset(dev->buffer, 0, ST7305_BUFFER_LENGTH);
    LOGI("ST7305 init OK (%dx%d)", ST7305_LCD_WIDTH, ST7305_LCD_HEIGHT);
    return dev;
}

/** 帧缓存填充（0x00 全白 / 0xFF 全黑） */
void st7305_fill(st7305_handle_t dev, uint8_t data)
{
    memset(dev->buffer, data, ST7305_BUFFER_LENGTH);
}

/** 清空帧缓存（全白） */
void st7305_clear(st7305_handle_t dev)
{
    st7305_fill(dev, 0x00);
}
/**
 * 设置显示方向：0=0°，1=顺时针 90°，2=180°，3=顺时针 270°。
 * 旋转由帧缓存坐标映射实现；90°/270° 时逻辑分辨率为 400x300。
 * 只影响后续绘制，不会清空帧缓存或立即刷新屏幕。
 */
void st7305_set_rotation(st7305_handle_t dev, uint8_t rotation)
{
    if (rotation <= 3) dev->rotation = rotation;
}

/** 获取当前方向（0~3） */
uint8_t st7305_get_rotation(st7305_handle_t dev)
{
    return dev->rotation;
}

/** 获取当前方向的逻辑宽度/高度 */
int st7305_get_width(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
}

int st7305_get_height(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
}

/**
 * 逻辑像素先按显示方向映射到 300x400 物理坐标，再写入帧缓存：
 *   一个字节 8 bit 对应 2 行 x 4 列像素：
 *     行0: BIT7 BIT5 BIT3 BIT1   （偶 bit -> 下一行）
 *     行1: BIT6 BIT4 BIT2 BIT0
 *   1 = 黑，0 = 白
 */
void st7305_write_point(st7305_handle_t dev, int x, int y, uint16_t color)
{
    int logical_width = (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
    int logical_height = (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
    if (x < 0 || y < 0 || x >= logical_width || y >= logical_height) return;

    int physical_x;
    int physical_y;
    switch (dev->rotation) {
    case 1: /* 顺时针 90°，逻辑 400x300 */
        physical_x = ST7305_LCD_WIDTH - 1 - y;
        physical_y = x;
        break;
    case 2: /* 180°，逻辑 300x400 */
        physical_x = ST7305_LCD_WIDTH - 1 - x;
        physical_y = ST7305_LCD_HEIGHT - 1 - y;
        break;
    case 3: /* 顺时针 270°，逻辑 400x300 */
        physical_x = y;
        physical_y = ST7305_LCD_HEIGHT - 1 - x;
        break;
    default: /* 0°，逻辑 300x400 */
        physical_x = x;
        physical_y = y;
        break;
    }

    int real_x = physical_x / 4;
    int real_y = physical_y / 2;
    int index = real_y * ST7305_DATA_WIDTH + real_x;
    int one_two = physical_y % 2;          /* 0 或 1 */
    int line_bit_4 = physical_x % 4;       /* 0~3 */
    int bit = 7 - (line_bit_4 * 2 + one_two);

    if (color) dev->buffer[index] |= (1 << bit);
    else dev->buffer[index] &= ~(1 << bit);
}

/** 设置地址窗口并发起 RAMWR */
static void set_address_window(st7305_handle_t dev)
{
    write_params(dev, 0x2A, (uint8_t[]){0x12, 0x2A}, 2); /* CASET 0x12~0x2A */
    write_params(dev, 0x2B, (uint8_t[]){0x00, 0xC7}, 2); /* RASET 0~199 */
    write_register(dev, 0x2C); /* RAMWR */
}

/** 整帧刷新：把 15000 字节帧缓存推送到屏幕 */
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);
    dc_data(dev);
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/** 进入低功耗模式 LPM（0x39），省电，帧率由 B2h 决定 */
void st7305_low_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x39);
}

/** 进入高功耗模式 HPM（0x38），动态画面用，16/32Hz */
void st7305_high_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x38);
}

/** 显示开/关（0x29 / 0x28） */
void st7305_display_on(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x29 : 0x28);
}

/** 反显开/关（0x21 / 0x20）；常白屏显示黑色需要反显开 */
void st7305_display_inversion(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x21 : 0x20);
}

/** 获取帧缓存指针（高级用法，可直接操作位图数据） */
uint8_t *st7305_get_buffer(st7305_handle_t dev)
{
    return dev->buffer;
}

/* ================= 图形基元（移植自 ST73XX_UI） ================= */

#define SWAP_INT(a, b) do { int _t = (a); (a) = (b); (b) = _t; } while (0)

void ui_draw_fast_hline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x + i, y, color);
}

void ui_draw_fast_vline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x, y + i, color);
}

void ui_draw_line(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    int dx = abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    int dy = -abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    int err = dx + dy, e2;

    while (1) {
        st7305_write_point(dev, x1, y1, color);
        if (x1 == x2 && y1 == y2) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
    }
}

void ui_draw_triangle(st7305_handle_t dev, int x1, int y1, int x2, int y2,
                      int x3, int y3, uint16_t color)
{
    ui_draw_line(dev, x1, y1, x2, y2, color);
    ui_draw_line(dev, x2, y2, x3, y3, color);
    ui_draw_line(dev, x3, y3, x1, y1, color);
}

void ui_draw_filled_triangle(st7305_handle_t dev, int x0, int y0, int x1, int y1,
                             int x2, int y2, uint16_t color)
{
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }
    if (y1 > y2) { SWAP_INT(y1, y2); SWAP_INT(x1, x2); }
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }

    if (y0 == y2) { /* 平底 */
        int xs = x0, xe = x0;
        if (x1 < xs) xs = x1;
        if (x1 > xe) xe = x1;
        if (x2 < xs) xs = x2;
        if (x2 > xe) xe = x2;
        ui_draw_fast_hline(dev, xs, y0, xe - xs + 1, color);
        return;
    }

    int total = y2 - y0;
    for (int i = 0; i <= total; i++) {
        int y = y0 + i;
        int second_half = (i > y1 - y0) || (y1 == y0);
        int seg = second_half ? (y2 - y1) : (y1 - y0);
        if (seg == 0) continue;
        int ax = x0 + (int)((x2 - x0) * (int64_t)i / total);
        int bx = second_half ? x1 + (int)((x2 - x1) * (int64_t)(i - (y1 - y0)) / seg)
                             : x0 + (int)((x1 - x0) * (int64_t)i / seg);
        if (ax > bx) SWAP_INT(ax, bx);
        ui_draw_fast_hline(dev, ax, y, bx - ax + 1, color);
    }
}

void ui_draw_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    ui_draw_fast_hline(dev, x1, y1, x2 - x1 + 1, color);
    ui_draw_fast_hline(dev, x1, y2, x2 - x1 + 1, color);
    ui_draw_fast_vline(dev, x1, y1, y2 - y1 + 1, color);
    ui_draw_fast_vline(dev, x2, y1, y2 - y1 + 1, color);
}

void ui_draw_filled_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    for (int y = y1; y <= y2; y++) {
        ui_draw_fast_hline(dev, x1, y, x2 - x1 + 1, color);
    }
}

void ui_draw_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    int x = 0, y = r, d = 3 - 2 * r;
    while (x <= y) {
        st7305_write_point(dev, xc + x, yc + y, color);
        st7305_write_point(dev, xc - x, yc + y, color);
        st7305_write_point(dev, xc + x, yc - y, color);
        st7305_write_point(dev, xc - x, yc - y, color);
        st7305_write_point(dev, xc + y, yc + x, color);
        st7305_write_point(dev, xc - y, yc + x, color);
        st7305_write_point(dev, xc + y, yc - x, color);
        st7305_write_point(dev, xc - y, yc - x, color);
        if (d < 0) {
            d += 4 * x + 6;
        } else {
            d += 4 * (x - y) + 10;
            y--;
        }
        x++;
    }
}
static int int_sqrt(int x)
{
    int r = 0;
    while ((r + 1) * (r + 1) <= x) r++;
    return r;
}

void ui_draw_filled_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    for (int y = -r; y <= r; y++) {
        int w = int_sqrt(r * r - y * y);
        ui_draw_fast_hline(dev, xc - w, yc + y, 2 * w + 1, color);
    }
}

void ui_draw_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;
    for (int i = 0; i < n; i++) {
        int x1 = points[2 * i], y1 = points[2 * i + 1];
        int x2 = points[2 * ((i + 1) % n)], y2 = points[2 * ((i + 1) % n) + 1];
        ui_draw_line(dev, x1, y1, x2, y2, color);
    }
}

void ui_draw_filled_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;

    int min_y = points[1], max_y = points[1];
    for (int i = 1; i < n; i++) {
        if (points[2 * i + 1] < min_y) min_y = points[2 * i + 1];
        if (points[2 * i + 1] > max_y) max_y = points[2 * i + 1];
    }

    int *xs = (int *)malloc(n * sizeof(int));
    if (!xs) return;

    /* 扫描线填充 */
    for (int y = min_y; y <= max_y; y++) {
        int cnt = 0;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            int yi = points[2 * i + 1], yj = points[2 * j + 1];
            int xi = points[2 * i], xj = points[2 * j];
            if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
                xs[cnt++] = xi + (int)((int64_t)(y - yi) * (xj - xi) / (yj - yi));
            }
        }
        /* 插入排序 */
        for (int i = 1; i < cnt; i++) {
            int key = xs[i], k = i - 1;
            while (k >= 0 && xs[k] > key) { xs[k + 1] = xs[k]; k--; }
            xs[k + 1] = key;
        }
        for (int i = 0; i + 1 < cnt; i += 2) {
            ui_draw_fast_hline(dev, xs[i], y, xs[i + 1] - xs[i] + 1, color);
        }
    }
    free(xs);
}

/* ================= Demo：15 页自动轮播 =================
 * 文字、有序抖动灰阶、测试图案、性能基准、UI 样张和小动画。
 * 无外部字体与素材。 */

#define W ST7305_LCD_WIDTH
#define H ST7305_LCD_HEIGHT
#define BLACK ST7305_COLOR_BLACK
#define WHITE ST7305_COLOR_WHITE
#define ARRAY_LEN(a) ((int)(sizeof(a) / sizeof((a)[0])))

/* 经典 5x7 ASCII 字体，列编码，最低位在上。 */
static const uint8_t font5x7[96][5] = {
    {0x00,0x00,0x00,0x00,0x00},{0x00,0x00,0x5f,0x00,0x00},
    {0x00,0x07,0x00,0x07,0x00},{0x14,0x7f,0x14,0x7f,0x14},
    {0x24,0x2a,0x7f,0x2a,0x12},{0x23,0x13,0x08,0x64,0x62},
    {0x36,0x49,0x55,0x22,0x50},{0x00,0x05,0x03,0x00,0x00},
    {0x00,0x1c,0x22,0x41,0x00},{0x00,0x41,0x22,0x1c,0x00},
    {0x14,0x08,0x3e,0x08,0x14},{0x08,0x08,0x3e,0x08,0x08},
    {0x00,0x50,0x30,0x00,0x00},{0x08,0x08,0x08,0x08,0x08},
    {0x00,0x60,0x60,0x00,0x00},{0x20,0x10,0x08,0x04,0x02},
    {0x3e,0x51,0x49,0x45,0x3e},{0x00,0x42,0x7f,0x40,0x00},
    {0x42,0x61,0x51,0x49,0x46},{0x21,0x41,0x45,0x4b,0x31},
    {0x18,0x14,0x12,0x7f,0x10},{0x27,0x45,0x45,0x45,0x39},
    {0x3c,0x4a,0x49,0x49,0x30},{0x01,0x71,0x09,0x05,0x03},
    {0x36,0x49,0x49,0x49,0x36},{0x06,0x49,0x49,0x29,0x1e},
    {0x00,0x36,0x36,0x00,0x00},{0x00,0x56,0x36,0x00,0x00},
    {0x08,0x14,0x22,0x41,0x00},{0x14,0x14,0x14,0x14,0x14},
    {0x00,0x41,0x22,0x14,0x08},{0x02,0x01,0x51,0x09,0x06},
    {0x32,0x49,0x79,0x41,0x3e},{0x7e,0x11,0x11,0x11,0x7e},
    {0x7f,0x49,0x49,0x49,0x36},{0x3e,0x41,0x41,0x41,0x22},
    {0x7f,0x41,0x41,0x22,0x1c},{0x7f,0x49,0x49,0x49,0x41},
    {0x7f,0x09,0x09,0x09,0x01},{0x3e,0x41,0x49,0x49,0x7a},
    {0x7f,0x08,0x08,0x08,0x7f},{0x00,0x41,0x7f,0x41,0x00},
    {0x20,0x40,0x41,0x3f,0x01},{0x7f,0x08,0x14,0x22,0x41},
    {0x7f,0x40,0x40,0x40,0x40},{0x7f,0x02,0x0c,0x02,0x7f},
    {0x7f,0x04,0x08,0x10,0x7f},{0x3e,0x41,0x41,0x41,0x3e},
    {0x7f,0x09,0x09,0x09,0x06},{0x3e,0x41,0x51,0x21,0x5e},
    {0x7f,0x09,0x19,0x29,0x46},{0x46,0x49,0x49,0x49,0x31},
    {0x01,0x01,0x7f,0x01,0x01},{0x3f,0x40,0x40,0x40,0x3f},
    {0x1f,0x20,0x40,0x20,0x1f},{0x3f,0x40,0x38,0x40,0x3f},
    {0x63,0x14,0x08,0x14,0x63},{0x07,0x08,0x70,0x08,0x07},
    {0x61,0x51,0x49,0x45,0x43},{0x00,0x7f,0x41,0x41,0x00},
    {0x02,0x04,0x08,0x10,0x20},{0x00,0x41,0x41,0x7f,0x00},
    {0x04,0x02,0x01,0x02,0x04},{0x40,0x40,0x40,0x40,0x40},
    {0x00,0x01,0x02,0x04,0x00},{0x20,0x54,0x54,0x54,0x78},
    {0x7f,0x48,0x44,0x44,0x38},{0x38,0x44,0x44,0x44,0x20},
    {0x38,0x44,0x44,0x48,0x7f},{0x38,0x54,0x54,0x54,0x18},
    {0x08,0x7e,0x09,0x01,0x02},{0x0c,0x52,0x52,0x52,0x3e},
    {0x7f,0x08,0x04,0x04,0x78},{0x00,0x44,0x7d,0x40,0x00},
    {0x20,0x40,0x44,0x3d,0x00},{0x7f,0x10,0x28,0x44,0x00},
    {0x00,0x41,0x7f,0x40,0x00},{0x7c,0x04,0x18,0x04,0x78},
    {0x7c,0x08,0x04,0x04,0x78},{0x38,0x44,0x44,0x44,0x38},
    {0x7c,0x14,0x14,0x14,0x08},{0x08,0x14,0x14,0x18,0x7c},
    {0x7c,0x08,0x04,0x04,0x08},{0x48,0x54,0x54,0x54,0x20},
    {0x04,0x3f,0x44,0x40,0x20},{0x3c,0x40,0x40,0x20,0x7c},
    {0x1c,0x20,0x40,0x20,0x1c},{0x3c,0x40,0x30,0x40,0x3c},
    {0x44,0x28,0x10,0x28,0x44},{0x0c,0x50,0x50,0x50,0x3c},
    {0x44,0x64,0x54,0x4c,0x44},{0x00,0x08,0x36,0x41,0x00},
    {0x00,0x00,0x7f,0x00,0x00},{0x00,0x41,0x36,0x08,0x00},
    {0x08,0x04,0x08,0x10,0x08},{0x00,0x00,0x00,0x00,0x00}
};

static const uint8_t bayer4[4][4] = {
    {0, 8, 2, 10}, {12, 4, 14, 6}, {3, 11, 1, 9}, {15, 7, 13, 5}
};

static void text_char(st7305_handle_t d, int x, int y, char c, int scale, uint16_t color)
{
    if ((unsigned char)c < 32 || (unsigned char)c > 127) c = '?';
    const uint8_t *glyph = font5x7[(unsigned char)c - 32];
    for (int col = 0; col < 5; col++) {
        for (int row = 0; row < 7; row++) {
            if (glyph[col] & (1U << row)) {
                if (scale == 1) st7305_write_point(d, x + col, y + row, color);
                else ui_draw_filled_rectangle(d, x + col * scale, y + row * scale,
                    x + (col + 1) * scale - 1, y + (row + 1) * scale - 1, color);
            }
        }
    }
}

static void text(st7305_handle_t d, int x, int y, const char *s, int scale, uint16_t color)
{
    while (*s) {
        text_char(d, x, y, *s++, scale, color);
        x += 6 * scale;
    }
}

static int text_width(const char *s, int scale)
{
    int n = (int)strlen(s);
    return n ? (n * 6 - 1) * scale : 0;
}
static void text_center(st7305_handle_t d, int y, const char *s, int scale, uint16_t color)
{
    text(d, (W - text_width(s, scale)) / 2, y, s, scale, color);
}

static void gray_rect(st7305_handle_t d, int x0, int y0, int x1, int y1, int level)
{
    if (x0 > x1) { int t = x0; x0 = x1; x1 = t; }
    if (y0 > y1) { int t = y0; y0 = y1; y1 = t; }
    if (level <= 0) return;
    if (level >= 16) {
        ui_draw_filled_rectangle(d, x0, y0, x1, y1, BLACK);
        return;
    }
    for (int y = y0; y <= y1; y++) {
        for (int x = x0; x <= x1; x++) {
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, x, y, BLACK);
        }
    }
}

static void gray_circle(st7305_handle_t d, int cx, int cy, int r, int level)
{
    for (int y = -r; y <= r; y++) {
        for (int x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r && level > bayer4[(cy + y) & 3][(cx + x) & 3]) {
                st7305_write_point(d, cx + x, cy + y, BLACK);
            }
        }
    }
}

static void hline(st7305_handle_t d, int x0, int x1, int y, uint16_t color)
{
    ui_draw_fast_hline(d, x0, y, x1 - x0 + 1, color);
}

static void vline(st7305_handle_t d, int x, int y0, int y1, uint16_t color)
{
    ui_draw_fast_vline(d, x, y0, y1 - y0 + 1, color);
}

static void chrome(st7305_handle_t d, int page, const char *title, const char *subtitle)
{
    char buf[24];
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 31, BLACK);
    text(d, 8, 8, title, 2, WHITE);
    snprintf(buf, sizeof(buf), "%02d/15", page + 1);
    text(d, 251, 11, buf, 1, WHITE);
    text(d, 8, 39, subtitle, 1, BLACK);
    hline(d, 0, W - 1, 51, BLACK);
    hline(d, 8, W - 9, 376, BLACK);
    text(d, 8, 384, "ST7305 RLCD TEST SUITE", 1, BLACK);
    for (int i = 0; i < 15; i++) {
        int x = 210 + i * 6;
        if (i == page) ui_draw_filled_rectangle(d, x, 385, x + 3, 391, BLACK);
        else ui_draw_rectangle(d, x, 385, x + 3, 391, BLACK);
    }
}

static uint32_t rng_state = 0x7305u;
static uint32_t demo_rand(void)
{
    rng_state ^= rng_state << 13;
    rng_state ^= rng_state >> 17;
    rng_state ^= rng_state << 5;
    return rng_state;
}

static int wave(int tick, int period)
{
    int p = tick % (period * 2);
    return p < period ? p : period * 2 - p;
}

static void page_hello(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 2);
    ui_draw_filled_rectangle(d, 12, 12, 287, 387, WHITE);
    ui_draw_rectangle(d, 12, 12, 287, 387, BLACK);
    ui_draw_rectangle(d, 16, 16, 283, 383, BLACK);
    text_center(d, 54, "ST7305  /  RLCD", 2, BLACK);
    hline(d, 42, 258, 82, BLACK);
    text_center(d, 112, "HELLO", 7, BLACK);
    text_center(d, 174, "WORLD!", 7, BLACK);
    text_center(d, 247, "300 x 400  MONOCHROME", 2, BLACK);
    text_center(d, 278, "15 PAGES / AUTO CAROUSEL", 1, BLACK);
    gray_circle(d, 150, 330, 28, 5);
    ui_draw_circle(d, 150, 330, 29, BLACK);
    ui_draw_filled_circle(d, 140, 321, 3, BLACK);
    ui_draw_filled_circle(d, 160, 321, 3, BLACK);
    ui_draw_line(d, 136, 338, 142, 343, BLACK);
    ui_draw_line(d, 142, 343, 158, 343, BLACK);
    ui_draw_line(d, 158, 343, 164, 338, BLACK);
}

static void page_gray(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 1, "DITHER GRAY", "17 LEVELS / STATIC 4x4 BAYER MATRIX");
    for (int i = 0; i < 17; i++) {
        int x = 14 + i * 16;
        gray_rect(d, x, 72, x + 14, 128, i);
        ui_draw_rectangle(d, x, 72, x + 14, 128, BLACK);
    }
    text(d, 14, 136, "0%", 1, BLACK);
    text(d, 139, 136, "50", 1, BLACK);
    text(d, 259, 136, "100%", 1, BLACK);
    text(d, 14, 159, "GRADIENT", 1, BLACK);
    for (int y = 0; y < 36; y++) {
        for (int x = 0; x < 272; x++) {
            int level = x / 17;
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, 14 + x, 176 + y, BLACK);
        }
    }
    ui_draw_rectangle(d, 13, 175, 286, 212, BLACK);
    text(d, 14, 230, "DITHERED FILLS FOR UI DEPTH", 1, BLACK);
    gray_circle(d, 58, 294, 39, 3);
    gray_circle(d, 150, 294, 39, 7);
    gray_circle(d, 242, 294, 39, 12);
    ui_draw_circle(d, 58, 294, 40, BLACK);
    ui_draw_circle(d, 150, 294, 40, BLACK);
    ui_draw_circle(d, 242, 294, 40, BLACK);
    text_center(d, 347, "NO GRAY PIXELS - JUST BLACK + WHITE", 1, BLACK);
}

static void page_geometry(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 2, "GEOMETRY", "LINES / CIRCLES / TRIANGLES / POLYGONS");
    ui_draw_line(d, 12, 65, 285, 350, BLACK);
    ui_draw_line(d, 285, 65, 12, 350, BLACK);
    ui_draw_rectangle(d, 20, 75, 126, 164, BLACK);
    gray_rect(d, 23, 78, 123, 161, 4);
    ui_draw_filled_rectangle(d, 43, 97, 104, 139, BLACK);
    ui_draw_circle(d, 213, 122, 48, BLACK);
    ui_draw_circle(d, 213, 122, 38, BLACK);
    gray_circle(d, 213, 122, 27, 8);
    ui_draw_triangle(d, 24, 323, 87, 188, 143, 323, BLACK);
    ui_draw_filled_triangle(d, 176, 310, 219, 212, 271, 310, BLACK);
    const int p[] = {152,77, 168,95, 162,117, 143,117, 136,95};
    ui_draw_filled_polygon(d, p, 5, BLACK);
    text_center(d, 348, "BRESENHAM + SCANLINE FILL", 1, BLACK);
}

static void page_grid(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 3, "PIXEL GRID", "CHECK EDGES, ASPECT RATIO AND DIAGONALS");
    ui_draw_rectangle(d, 0, 58, 299, 367, BLACK);
    for (int x = 19; x < W; x += 20) gray_rect(d, x, 59, x, 366, 4);
    for (int y = 78; y < 367; y += 20) gray_rect(d, 1, y, 298, y, 4);
    ui_draw_line(d, 0, 58, 299, 367, BLACK);
    ui_draw_line(d, 299, 58, 0, 367, BLACK);
    ui_draw_circle(d, 150, 213, 100, BLACK);
    ui_draw_rectangle(d, 50, 113, 250, 313, BLACK);
    ui_draw_filled_rectangle(d, 0, 58, 5, 63, BLACK);
    ui_draw_filled_rectangle(d, 294, 58, 299, 63, BLACK);
    ui_draw_filled_rectangle(d, 0, 362, 5, 367, BLACK);
    ui_draw_filled_rectangle(d, 294, 362, 299, 367, BLACK);
    ui_draw_filled_rectangle(d, 145, 208, 155, 218, WHITE);
    ui_draw_rectangle(d, 145, 208, 155, 218, BLACK);
}

static void page_text(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 4, "TEXT & FONT", "BUILT-IN 5x7 ASCII / INTEGER SCALING");
    text_center(d, 69, "BIG TEXT 2X", 2, BLACK);
    text_center(d, 96, "HUGE 4X", 4, BLACK);
    hline(d, 18, 281, 135, BLACK);
    text(d, 14, 148, "Regular: ABCDEFGHIJKLM", 1, BLACK);
    text(d, 14, 162, "         NOPQRSTUVWXYZ", 1, BLACK);
    text(d, 14, 179, "Lower:  abcdefghijklm", 1, BLACK);
    text(d, 14, 193, "        nopqrstuvwxyz", 1, BLACK);
    text(d, 14, 214, "Digits: 0123456789", 2, BLACK);
    text(d, 14, 241, "Symbols: !#$%&*+-/<=>?", 1, BLACK);
    gray_rect(d, 14, 265, 285, 304, 12);
    text_center(d, 273, "DITHERED TEXT PANEL", 2, BLACK);
    ui_draw_filled_rectangle(d, 14, 318, 285, 348, BLACK);
    text_center(d, 327, "REVERSED TEXT", 2, WHITE);
    text_center(d, 359, "NO EXTERNAL FONT REQUIRED", 1, BLACK);
}
static void draw_toggle(st7305_handle_t d, int x, int y, bool on)
{
    ui_draw_rectangle(d, x, y, x + 35, y + 16, BLACK);
    if (on) {
        ui_draw_filled_rectangle(d, x + 2, y + 2, x + 32, y + 14, BLACK);
        ui_draw_filled_circle(d, x + 26, y + 8, 5, WHITE);
    } else {
        ui_draw_filled_circle(d, x + 9, y + 8, 5, BLACK);
    }
}

static void page_ui(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 5, "DESKTOP UI", "DITHERED CARDS / GAUGES / LIVE WIDGETS");
    gray_rect(d, 17, 67, 188, 191, 5);
    ui_draw_filled_rectangle(d, 13, 63, 184, 187, WHITE);
    ui_draw_rectangle(d, 13, 63, 184, 187, BLACK);
    text(d, 23, 74, "ENVIRONMENT", 2, BLACK);
    hline(d, 23, 174, 96, BLACK);
    text(d, 23, 109, "23.6", 4, BLACK);
    text(d, 107, 109, "C", 2, BLACK);
    text(d, 23, 145, "HUMIDITY  48%", 1, BLACK);
    text(d, 23, 161, "PRESSURE  1013", 1, BLACK);

    gray_rect(d, 200, 67, 290, 191, 7);
    ui_draw_filled_rectangle(d, 196, 63, 286, 187, WHITE);
    ui_draw_rectangle(d, 196, 63, 286, 187, BLACK);
    text(d, 207, 74, "POWER", 1, BLACK);
    int battery = 20 + wave(frame, 40) * 70 / 40;
    ui_draw_rectangle(d, 210, 99, 267, 121, BLACK);
    ui_draw_filled_rectangle(d, 267, 104, 271, 116, BLACK);
    ui_draw_filled_rectangle(d, 213, 102, 213 + battery * 50 / 100, 118, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%d%%", battery);
    text(d, 241 - text_width(buf, 2) / 2, 134, buf, 2, BLACK);
    text(d, 207, 160, "SOLAR  ON", 1, BLACK);

    ui_draw_filled_rectangle(d, 13, 204, 286, 294, WHITE);
    ui_draw_rectangle(d, 13, 204, 286, 294, BLACK);
    text(d, 24, 216, "SYSTEM ACTIVITY", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        int value = 12 + wave(frame + i * 17, 50) * 180 / 50;
        text(d, 24, 240 + i * 16, i == 0 ? "CPU" : (i == 1 ? "MEM" : "SPI"), 1, BLACK);
        gray_rect(d, 62, 240 + i * 16, 256, 248 + i * 16, 3);
        ui_draw_filled_rectangle(d, 62, 240 + i * 16, 62 + value, 248 + i * 16, BLACK);
    }
    text(d, 22, 316, "WIFI", 1, BLACK);
    draw_toggle(d, 63, 311, true);
    text(d, 118, 316, "SYNC", 1, BLACK);
    draw_toggle(d, 160, 311, (frame / 12) & 1);
    text(d, 215, 316, "LIVE", 1, BLACK);
    if ((frame / 4) & 1) ui_draw_filled_circle(d, 276, 319, 5, BLACK);
    else ui_draw_circle(d, 276, 319, 5, BLACK);
    text_center(d, 351, "A TINY REFLECTIVE DASHBOARD", 1, BLACK);
}

typedef struct {
    uint32_t last_us;
    uint32_t average_us;
    uint16_t history[54];
    int history_pos;
} perf_t;
static perf_t perf;

static void perf_record(uint32_t elapsed_us)
{
    perf.last_us = elapsed_us;
    perf.average_us = perf.average_us ? (perf.average_us * 7 + elapsed_us) / 8 : elapsed_us;
    perf.history[perf.history_pos] = (uint16_t)(elapsed_us / 100);
    perf.history_pos = (perf.history_pos + 1) % ARRAY_LEN(perf.history);
}

static void page_fps(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 6, "FRAME RATE", "UNTHROTTLED FULL-FRAME DRAW + SPI BENCHMARK");
    char buf[40];
    uint32_t avg = perf.average_us ? perf.average_us : 1;
    uint32_t fps10 = 10000000UL / avg;
    snprintf(buf, sizeof(buf), "%lu.%lu FPS", (unsigned long)(fps10 / 10), (unsigned long)(fps10 % 10));
    text_center(d, 66, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "LAST %lu.%lu ms   AVG %lu.%lu ms",
        (unsigned long)(perf.last_us / 1000), (unsigned long)((perf.last_us % 1000) / 100),
        (unsigned long)(avg / 1000), (unsigned long)((avg % 1000) / 100));
    text_center(d, 108, buf, 1, BLACK);
    text(d, 16, 132, "UPDATE TIME HISTORY", 1, BLACK);
    ui_draw_rectangle(d, 15, 148, 285, 254, BLACK);
    gray_rect(d, 16, 174, 284, 174, 3);
    gray_rect(d, 16, 201, 284, 201, 3);
    gray_rect(d, 16, 227, 284, 227, 3);
    int previous_x = -1, previous_y = -1;
    for (int i = 0; i < ARRAY_LEN(perf.history); i++) {
        int index = (perf.history_pos + i) % ARRAY_LEN(perf.history);
        int value = perf.history[index];
        int y = 250 - value * 95 / 150;
        if (y < 151) y = 151;
        if (y > 250) y = 250;
        int x = 20 + i * 5;
        ui_draw_filled_circle(d, x, y, 1, BLACK);
        if (previous_x >= 0) ui_draw_line(d, previous_x, previous_y, x, y, BLACK);
        previous_x = x; previous_y = y;
    }
    snprintf(buf, sizeof(buf), "FRAME: %d", frame + 1);
    text(d, 17, 271, buf, 1, BLACK);
    text(d, 17, 291, "15000 BYTES PER UPDATE", 2, BLACK);
    text(d, 17, 317, "SPI: 20 MHz   PANEL: 16 Hz", 1, BLACK);
    text(d, 17, 337, "CPU number is bus throughput,", 1, BLACK);
    text(d, 17, 351, "not the optical panel limit.", 1, BLACK);
    int scan = 20 + (frame * 7) % 260;
    vline(d, scan, 149, 253, BLACK);
    (void)elapsed;
}

static void page_patterns(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 7, "FINE PATTERNS", "1/2/4 PIXEL CHECKERS + LINE RESOLUTION");
    int phase = frame & 1;
    const int boxes[4][4] = {{12,66,146,184},{153,66,287,184},{12,194,146,332},{153,194,287,332}};
    for (int b = 0; b < 4; b++) {
        for (int y = boxes[b][1]; y <= boxes[b][3]; y++) {
            for (int x = boxes[b][0]; x <= boxes[b][2]; x++) {
                bool black = false;
                if (b == 0) black = ((x ^ y) & 1) == phase;
                if (b == 1) black = (((x / 2) ^ (y / 2)) & 1) == phase;
                if (b == 2) black = (((x / 4) ^ (y / 4)) & 1) == phase;
                if (b == 3) black = ((x + phase) % 4 == 0) || ((y + phase) % 4 == 0);
                if (black) st7305_write_point(d, x, y, BLACK);
            }
        }
        ui_draw_rectangle(d, boxes[b][0] - 1, boxes[b][1] - 1, boxes[b][2] + 1, boxes[b][3] + 1, BLACK);
    }
    text_center(d, 343, "CHECKER / 2PX / 4PX / GRID", 1, BLACK);
    text_center(d, 358, phase ? "PHASE B - CHECK FOR FLICKER" : "PHASE A - CHECK FOR FLICKER", 1, BLACK);
}

static struct { int x, y, vx, vy, hits; } bounce;

static void page_bounce(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 8, "BOUNCE TEST", "MOVEMENT, COLLISIONS AND PANEL GHOSTING");
    const int left = 10, right = 289, top = 65, bottom = 355;
    ui_draw_rectangle(d, left, top, right, bottom, BLACK);
    for (int y = top + 10; y < bottom; y += 20) gray_rect(d, left + 1, y, right - 1, y, 2);
    if (frame > 0) {
        bounce.x += bounce.vx;
        bounce.y += bounce.vy;
        if (bounce.x <= left + 2 || bounce.x + 91 >= right - 1) {
            bounce.vx = -bounce.vx;
            bounce.x += bounce.vx * 2;
            bounce.hits++;
        }
        if (bounce.y <= top + 2 || bounce.y + 43 >= bottom - 1) {
            bounce.vy = -bounce.vy;
            bounce.y += bounce.vy * 2;
            bounce.hits++;
        }
    }
    gray_rect(d, bounce.x + 5, bounce.y + 5, bounce.x + 96, bounce.y + 48, 5);
    ui_draw_filled_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, WHITE);
    ui_draw_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, BLACK);
    text(d, bounce.x + 9, bounce.y + 10, "RLCD", 3, BLACK);
    char buf[24];
    snprintf(buf, sizeof(buf), "WALL HITS: %d", bounce.hits);
    text_center(d, 360, buf, 1, BLACK);
}

#define STAR_COUNT 56
static struct { int x, y, z; } stars[STAR_COUNT];

static void star_reset(int i, bool initial)
{
    stars[i].x = (int)(demo_rand() % 401) - 200;
    stars[i].y = (int)(demo_rand() % 401) - 200;
    stars[i].z = initial ? 30 + (int)(demo_rand() % 220) : 250;
}
static void page_stars(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    ui_draw_filled_rectangle(d, 0, 0, W - 1, H - 1, BLACK);
    text(d, 10, 12, "STARFIELD", 2, WHITE);
    text(d, 190, 17, "56 STARS / HPM", 1, WHITE);
    hline(d, 10, 289, 38, WHITE);
    for (int i = 0; i < STAR_COUNT; i++) {
        int old_z = stars[i].z;
        stars[i].z -= 7;
        if (stars[i].z < 20) star_reset(i, false);
        int z = stars[i].z;
        int x = 150 + stars[i].x * 110 / z;
        int y = 207 + stars[i].y * 110 / z;
        int ox = 150 + stars[i].x * 110 / old_z;
        int oy = 207 + stars[i].y * 110 / old_z;
        if (x > 2 && x < 297 && y > 44 && y < 370) {
            ui_draw_line(d, ox, oy, x, y, WHITE);
            if (z < 80) ui_draw_filled_circle(d, x, y, 2, WHITE);
            else st7305_write_point(d, x, y, WHITE);
        }
    }
    hline(d, 10, 289, 377, WHITE);
    text(d, 10, 385, "WARP THROUGH A MONOCHROME GALAXY", 1, WHITE);
}

#define LIFE_W 34
#define LIFE_H 34
static uint8_t life[LIFE_H][LIFE_W];
static uint8_t life_next[LIFE_H][LIFE_W];
static int generation;

static void life_seed(void)
{
    memset(life, 0, sizeof(life));
    rng_state = 0x42030040u;
    for (int y = 2; y < LIFE_H - 2; y++) {
        for (int x = 2; x < LIFE_W - 2; x++) life[y][x] = (demo_rand() % 100) < 28;
    }
    generation = 0;
}

static void life_step(void)
{
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            int neighbors = 0;
            for (int dy = -1; dy <= 1; dy++) {
                for (int dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    int yy = (y + dy + LIFE_H) % LIFE_H;
                    int xx = (x + dx + LIFE_W) % LIFE_W;
                    neighbors += life[yy][xx];
                }
            }
            life_next[y][x] = neighbors == 3 || (neighbors == 2 && life[y][x]);
        }
    }
    memcpy(life, life_next, sizeof(life));
    generation++;
}

static void page_life(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 10, "GAME OF LIFE", "CONWAY CELLULAR AUTOMATON / TORUS WORLD");
    if (frame > 0) life_step();
    const int cell = 8, ox = 14, oy = 62;
    gray_rect(d, ox - 3, oy - 3, ox + LIFE_W * cell + 1, oy + LIFE_H * cell + 1, 3);
    ui_draw_rectangle(d, ox - 2, oy - 2, ox + LIFE_W * cell, oy + LIFE_H * cell, BLACK);
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            if (life[y][x]) ui_draw_filled_rectangle(d, ox + x * cell + 1, oy + y * cell + 1,
                ox + x * cell + 6, oy + y * cell + 6, BLACK);
        }
    }
    char buf[32];
    snprintf(buf, sizeof(buf), "GENERATION %d", generation);
    text_center(d, 352, buf, 1, BLACK);
}

static void page_clock(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 11, "UPTIME CLOCK", "ESP-TIMER / NO RTC OR NETWORK REQUIRED");
    int total = (int)(elapsed / 1000000);
    int seconds = total % 60, minutes = (total / 60) % 60, hours = total / 3600;
    int cx = 150, cy = 177, radius = 101;
    ui_draw_circle(d, cx, cy, radius, BLACK);
    ui_draw_circle(d, cx, cy, radius - 2, BLACK);
    for (int i = 0; i < 60; i++) {
        /* 顺时针刻度查表，避免浮点与 libm。 */
        static const int8_t sx[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
        static const int8_t sy[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
        if (i % 5 == 0) {
            int k = i / 5;
            int x = cx + sx[k] * 88 / 100, y = cy + sy[k] * 88 / 100;
            ui_draw_filled_circle(d, x, y, 3, BLACK);
        }
    }
    static const int8_t sec_x[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
    static const int8_t sec_y[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
    int sk = (seconds / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[sk] * 76 / 100, cy + sec_y[sk] * 76 / 100, BLACK);
    int mk = (minutes / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[mk] * 53 / 100, cy + sec_y[mk] * 53 / 100, BLACK);
    ui_draw_filled_circle(d, cx, cy, 5, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%02d:%02d:%02d", hours, minutes, seconds);
    text_center(d, 301, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "RENDER FRAME %d", frame + 1);
    text_center(d, 343, buf, 1, BLACK);
    text_center(d, 359, "1-BIT DOES NOT MEAN BORING", 1, BLACK);
}

static void tiny_mac(st7305_handle_t d, int x, int y)
{
    ui_draw_rectangle(d, x, y, x + 37, y + 47, BLACK);
    ui_draw_filled_rectangle(d, x + 4, y + 4, x + 33, y + 31, BLACK);
    ui_draw_filled_rectangle(d, x + 6, y + 6, x + 31, y + 29, WHITE);
    ui_draw_filled_rectangle(d, x + 11, y + 12, x + 13, y + 15, BLACK);
    ui_draw_filled_rectangle(d, x + 24, y + 12, x + 26, y + 15, BLACK);
    ui_draw_line(d, x + 12, y + 23, x + 16, y + 25, BLACK);
    ui_draw_line(d, x + 16, y + 25, x + 22, y + 25, BLACK);
    ui_draw_line(d, x + 22, y + 25, x + 26, y + 23, BLACK);
    ui_draw_filled_rectangle(d, x + 7, y + 38, x + 23, y + 41, BLACK);
}

static void page_retro(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 3);
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 21, WHITE);
    hline(d, 0, W - 1, 22, BLACK);
    text(d, 9, 7, "*  File  Edit  View  Special", 1, BLACK);
    text(d, 258, 7, "12:00", 1, BLACK);
    text(d, 181, 34, "RLCD OS", 2, BLACK);
    text(d, 184, 55, "System 1.0", 1, BLACK);
    tiny_mac(d, 228, 77);

    gray_rect(d, 17, 39, 212, 278, 8);
    ui_draw_filled_rectangle(d, 12, 34, 207, 273, WHITE);
    ui_draw_rectangle(d, 12, 34, 207, 273, BLACK);
    ui_draw_filled_rectangle(d, 13, 35, 206, 51, BLACK);
    text(d, 54, 39, "CONTROL PANEL", 1, WHITE);
    ui_draw_rectangle(d, 16, 38, 20, 47, WHITE);
    text(d, 24, 65, "Desktop Pattern", 1, BLACK);
    for (int y = 0; y < 36; y++) for (int x = 0; x < 56; x++) {
        if (((x / 4) ^ (y / 4)) & 1) st7305_write_point(d, 25 + x, 82 + y, BLACK);
    }
    gray_rect(d, 94, 82, 177, 117, 6);
    ui_draw_rectangle(d, 24, 81, 81, 118, BLACK);
    ui_draw_rectangle(d, 93, 81, 178, 118, BLACK);
    hline(d, 22, 196, 130, BLACK);
    text(d, 24, 141, "Double-Click Speed", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        ui_draw_rectangle(d, 26 + i * 51, 163, 37 + i * 51, 174, BLACK);
        if (i == 1) ui_draw_filled_rectangle(d, 28 + i * 51, 165, 35 + i * 51, 172, BLACK);
    }
    text(d, 24, 190, "Key Repeat Rate", 1, BLACK);
    gray_rect(d, 25, 211, 187, 218, 4);
    ui_draw_filled_rectangle(d, 25, 211, 110, 218, BLACK);
    ui_draw_rectangle(d, 25, 210, 188, 219, BLACK);
    text(d, 24, 237, "Reflective. Silent. Timeless.", 1, BLACK);

    ui_draw_filled_rectangle(d, 24, 294, 195, 353, WHITE);
    ui_draw_rectangle(d, 24, 294, 195, 353, BLACK);
    ui_draw_filled_rectangle(d, 25, 295, 194, 310, BLACK);
    text(d, 65, 299, "HELLO, WORLD!", 1, WHITE);
    text(d, 36, 322, "1 bit. Infinite ideas.", 1, BLACK);
    text(d, 36, 338, "OK", 1, BLACK);
    ui_draw_rectangle(d, 135, 324, 180, 344, BLACK);

    text(d, 236, 348, "TRASH", 1, BLACK);
    ui_draw_rectangle(d, 244, 305, 265, 337, BLACK);
    hline(d, 240, 269, 302, BLACK);
    vline(d, 250, 309, 333, BLACK);
    vline(d, 258, 309, 333, BLACK);
}
static void page_inverse(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 13, "BLACK & WHITE", "POLARITY / CONTRAST / FULL-SCREEN INVERSION");
    bool invert = (frame / 2) & 1;
    if (!invert) {
        ui_draw_filled_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "BLACK", 6, WHITE);
        text_center(d, 155, "ON", 4, WHITE);
        text_center(d, 205, "WHITE", 6, WHITE);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, WHITE);
        text_center(d, 289, "REVERSED", 3, BLACK);
    } else {
        ui_draw_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "WHITE", 6, BLACK);
        text_center(d, 155, "ON", 4, BLACK);
        text_center(d, 205, "BLACK", 6, BLACK);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, BLACK);
        text_center(d, 289, "REVERSED", 3, WHITE);
    }
    text_center(d, 357, invert ? "PHASE B" : "PHASE A", 1, BLACK);
}

static void page_rotation(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame;
    static const int angles[4] = {0, 90, 180, 270};
    uint8_t rotation = (uint8_t)((elapsed / 3000000) & 3);
    st7305_set_rotation(d, rotation);

    int width = st7305_get_width(d);
    int height = st7305_get_height(d);
    int cx = width / 2;
    int cy = height / 2 - 5;
    char buf[40];

    ui_draw_rectangle(d, 0, 0, width - 1, height - 1, BLACK);
    ui_draw_filled_rectangle(d, 0, 0, width - 1, 39, BLACK);
    snprintf(buf, sizeof(buf), "ROTATION %d DEG", angles[rotation]);
    text(d, (width - text_width(buf, 2)) / 2, 11, buf, 2, WHITE);
    snprintf(buf, sizeof(buf), "LOGICAL %d x %d / FRAMEBUFFER MAPPING", width, height);
    text(d, (width - text_width(buf, 1)) / 2, 50, buf, 1, BLACK);

    /* 不对称箭头 + 四角标记让每个方向都无歧义。 */
    ui_draw_circle(d, cx, cy, 43, BLACK);
    ui_draw_line(d, cx, cy + 25, cx, cy - 28, BLACK);
    ui_draw_line(d, cx, cy - 28, cx - 13, cy - 14, BLACK);
    ui_draw_line(d, cx, cy - 28, cx + 13, cy - 14, BLACK);
    text(d, cx - text_width("UP", 2) / 2, cy - 10, "UP", 2, BLACK);
    snprintf(buf, sizeof(buf), "%d", angles[rotation]);
    text(d, cx - text_width(buf, 6) / 2, cy + 57, buf, 6, BLACK);

    text(d, 12, 70, "A / TOP LEFT", 1, BLACK);
    text(d, width - 12 - text_width("B / TOP RIGHT", 1), 70, "B / TOP RIGHT", 1, BLACK);
    text(d, 12, height - 39, "C / BOTTOM LEFT", 1, BLACK);
    text(d, width - 12 - text_width("D / BOTTOM RIGHT", 1), height - 39,
        "D / BOTTOM RIGHT", 1, BLACK);
    ui_draw_filled_rectangle(d, 3, 3, 9, 9, WHITE);
    ui_draw_filled_rectangle(d, width - 10, height - 10, width - 4, height - 4, BLACK);
    hline(d, 12, width - 13, height - 25, BLACK);
    text(d, (width - text_width("AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1)) / 2,
        height - 15, "AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1, BLACK);
}

typedef void (*page_draw_t)(st7305_handle_t, int, int64_t);
typedef struct {
    const char *name;
    page_draw_t draw;
    uint32_t duration_ms;
    uint16_t target_fps; /* 0 = 只渲染一次, 65535 = 不限速 */
} demo_page_t;

static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    {"Geometry", page_geometry, 5000, 0},
    {"Pixel grid", page_grid, 5000, 0},
    {"Text", page_text, 5500, 0},
    {"Dashboard UI", page_ui, 9000, 4},
    {"Frame rate", page_fps, 8500, UINT16_MAX},
    {"Fine patterns", page_patterns, 6000, 2},
    {"Bounce", page_bounce, 9000, 20},
    {"Starfield", page_stars, 9000, 20},
    {"Game of Life", page_life, 12000, 3},
    {"Uptime clock", page_clock, 9000, 4},
    {"Retro desktop", page_retro, 6500, 0},
    {"Inversion", page_inverse, 6000, 2},
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};

static void page_reset(int page)
{
    if (page == 6) memset(&perf, 0, sizeof(perf));
    if (page == 8) bounce = (typeof(bounce)){25, 85, 3, 2, 0};
    if (page == 9) {
        rng_state = 0x51a7f13du;
        for (int i = 0; i < STAR_COUNT; i++) star_reset(i, true);
    }
    if (page == 10) life_seed();
}

void lcd_demo_run(st7305_handle_t lcd)
{
    if (!lcd) return;
    int page = 0;
    while (1) {
        const demo_page_t *p = &pages[page];
        st7305_set_rotation(lcd, 0);
        page_reset(page);
        LOGI("Page %d/%d: %s", page + 1, ARRAY_LEN(pages), p->name);
        int64_t started = (int64_t)esp_timer_get_time();
        uint32_t wake = millis();
        int frame = 0;
        while (1) {
            int64_t draw_started = (int64_t)esp_timer_get_time();
            st7305_clear(lcd);
            p->draw(lcd, frame, draw_started - started);
            st7305_display(lcd);
            perf_record((uint32_t)(esp_timer_get_time() - draw_started));

            if (p->target_fps == 0) {
                delay(p->duration_ms);
                break;
            }
            frame++;
            if (esp_timer_get_time() - started >= (int64_t)p->duration_ms * 1000) break;
            if (p->target_fps != UINT16_MAX) {
                uint32_t interval = 1000 / p->target_fps;
                if (!interval) interval = 1;
                wake += interval;
                int32_t wait = (int32_t)(wake - millis());
                if (wait > 0) delay(wait);
            }
            yield();
        }
        page = (page + 1) % ARRAY_LEN(pages);
    }
}

/* ================= Arduino 入口 ================= */

static st7305_handle_t lcd;

void setup(void)
{
    Serial.begin(115200);
    lcd = st7305_init(PIN_DC, PIN_RES, PIN_CS, PIN_SCLK, PIN_MOSI, SPI_CLOCK_HZ);

    /* 动画需要 HPM；静态页面在 LPM 下也能保留画面。 */
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    lcd_demo_run(lcd);
}
```

它不是伪代码，也不是只保留关键函数的教学节选，而是包含底层驱动、图形基元、内置字体和 15 页轮播的完整单文件程序。发布文章时，建议把这个 `.ino` 作为附件或放入配套代码仓库，避免读者从正文里拼接零散代码。

把文件放在同名文件夹中：

```text
ST7305_RLCD_Demo/
└── ST7305_RLCD_Demo.ino
```

用 Arduino IDE 打开 `.ino`，选择 `Arduino Nano ESP32` 和对应串口，然后编译、上传即可。

### 最小启动流程：先初始化，再进入 15 页轮播

下面这段是完整程序的入口。真正干活的是 `st7305_init()` 和 `lcd_demo_run()`，前者负责“叫醒屏幕”，后者负责“让屏幕整活”。

```cpp
static st7305_handle_t lcd;

void setup(void)
{
    // 第一步：开个 115200 串口，后面好看日志
    Serial.begin(115200);

    // 第二步：按刚才的接线初始化 SPI 和 ST7305
    lcd = st7305_init(
        PIN_DC, PIN_RES, PIN_CS,
        PIN_SCLK, PIN_MOSI,
        SPI_CLOCK_HZ
    );

    // 第三步：动态页面要刷新，切到 HPM 高刷新模式
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    // 第四步：这里会一直轮播，不需要再写状态机
    lcd_demo_run(lcd);
}
```

引脚和 SPI 时钟集中在文件开头，换板子时先改这里：

```cpp
// 这里填 GPIO 编号，不要照抄 Nano 丝印里的 D 编号
#define PIN_SCLK        10          // D7
#define PIN_MOSI         8          // D5，重点：不是 GPIO11
#define PIN_CS           9          // D6
#define PIN_DC           7          // D4
#define PIN_RES          6          // D3
#define SPI_CLOCK_HZ     20000000UL // 20 MHz，先求稳再求快
```

### 代码说明 1：为什么一帧正好是 15000 字节

这块屏有 300×400 = 120000 个像素，每个像素只有黑或白，理论上占 1 bit：

```text
120000 bit ÷ 8 = 15000 字节
```

ST7305 在本例的数据格式下，一个字节的 8 bit 对应 2 行×4 列像素：

```text
第 0 行：BIT7  BIT5  BIT3  BIT1
第 1 行：BIT6  BIT4  BIT2  BIT0
```

所以程序里每行不是常见的 300÷8，而是 300÷4 = 75 字节；纵向则按两行一组，共 400÷2 = 200 组：

```cpp
#define ST7305_DATA_WIDTH     75      // 300 ÷ 4
#define ST7305_BUFFER_LENGTH  15000   // 75 × 200
```

帧缓存就像先在草稿纸上画好，再一次性交给屏幕。这样绘图不会直接和 SPI 时序搅在一起，代码也更容易维护。

### 代码说明 2：一个坐标如何落到帧缓存的某一位

旋转后的逻辑坐标先映射回 300×400 的物理坐标，再计算字节位置和 bit 位置：

```cpp
// 第一步：算出这个像素落在哪个字节
int real_x = physical_x / 4;
int real_y = physical_y / 2;
int index = real_y * ST7305_DATA_WIDTH + real_x;

// 第二步：算出它在这个字节里占哪一位
int one_two = physical_y % 2;
int line_bit_4 = physical_x % 4;
int bit = 7 - (line_bit_4 * 2 + one_two);

// 第三步：黑色置 1，白色清 0
if (color) dev->buffer[index] |= (1 << bit);
else       dev->buffer[index] &= ~(1 << bit);
```

这套交错排列就是新手最容易算错的地方。发现图形斜着、碎成条码或隔行错位时，先检查这里，不要急着给初始化寄存器“随机调参”。

### 代码说明 3：DC 和 CS 到底在忙什么

`DC` 像快递包裹上的标签：`LOW` 表示“这是命令”，`HIGH` 表示“这是图像数据”。`CS` 则像点名，拉低时才轮到这块屏接收数据。

```cpp
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);          // DC=LOW：接下来是命令
    spi_write_byte(dev, reg);
}

static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);         // DC=HIGH：接下来是参数
    spi_write_byte(dev, data);
}
```

整帧发送时，程序连续写入 15000 字节，而不是给每个像素单独开一次 SPI 事务：

```cpp
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);             // 第一步：圈出整屏写入窗口
    dc_data(dev);                        // 第二步：告诉屏幕后面是数据
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH); // 第三步：整帧发走
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}
```

20 MHz 下，15000 字节的纯 SPI 理论传输时间约为 6 ms；实际还要加上命令、绘图和程序调度。第 7 页会显示真实耗时，不拿理论值冒充实测帧率。

### 代码说明 4：HPM、LPM 和静态画面不是一回事

初始化结束时进入 LPM；本示例在 `setup()` 里切到 HPM，让动画页有更合适的面板刷新条件。

```cpp
st7305_high_power_mode(lcd);  // 发送 0x38，进入 HPM
```

本例 `B2h=0x05` 配置 HPM 为 16 Hz、LPM 为 8 Hz。程序里的 `target_fps` 只控制主控画多快，不能命令液晶物理响应突破面板限制。

静态页的 `target_fps=0` 表示画一次后保留画面，不再重复发送；但整个轮播仍处于 HPM，并没有在每张静态页自动切回 LPM。要做真正的低功耗产品，还应按手册时序加入模式切换和局部刷新。

### 代码说明 5：15 个示例如何自动轮播

所有页面集中在 `pages[]` 数组里，每项包含名称、绘制函数、停留时间和目标帧率：

```cpp
static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    // 中间 12 页同理：函数、停留时间、目标 FPS
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};
```

想改播放顺序，就调换数组项；想多欣赏几秒星空，就改 `duration_ms`；想加自己的页面，就写一个同样签名的绘制函数，再注册进数组。不用把轮播调度拆得满地都是。

### 代码说明 6：四方向旋转为什么不靠 MADCTL 猜谜

程序通过 `st7305_set_rotation(lcd, rotation)` 设置 0～3 四个方向，在写帧缓存时映射坐标：

| `rotation` | 显示方向    | 逻辑分辨率 |
| ---------: | ----------- | ---------- |
|          0 | 0°          | 300×400    |
|          1 | 顺时针 90°  | 400×300    |
|          2 | 180°        | 300×400    |
|          3 | 顺时针 270° | 400×300    |

设置方向只影响后续绘制，不会自动清屏或刷新。切换后应清空帧缓存并重绘完整画面；每页轮播开始时，程序也会先把方向复位到 0，避免上一页把下一页“带歪”。

## 常见问题排查：ST7305 无显示、花屏和闪烁怎么办

别慌，80% 的“屏不亮”问题都出在这几个地方——剩下 20% 才轮到初始化寄存器出来背锅。

### 1. 串口显示初始化成功，屏幕却全白

只写 SPI 没有 MISO 回读，主控把数据发到空气里也会说“发送完成”。先检查 `D5 → GPIO8` 是否接对，再测 VCI 是否为 3.3V、是否共地、FPC 是否锁紧。完全断电几秒后重新上电，比只按 RESET 更彻底。

### 2. 屏幕有内容，但随机花屏或偶尔卡住

把 `SPI_CLOCK_HZ` 从 20 MHz 临时降到 5 MHz，并缩短杜邦线、重新插紧接头。如果降速后恢复，优先处理线长、接触和信号完整性，不要先改 Gate/Source 电压。

### 3. 图形错位、条纹、文字像被切碎

核对 `DTFORM=0x11`、列地址窗口和 2 行×4 列的像素位映射。也要确认逻辑坐标没有越界：0°/180° 是 300×400，90°/270° 是 400×300。

### 4. 在暗处几乎看不见

这是全反射无背光屏，不是屏幕突然学会了隐身。增加环境照明，不要把 BLC 当成必须接的背光线，本例 BLC 悬空即可。

### 5. 动画有残影或细密图案闪烁

细密棋盘格、相位交替和快速整帧反色本来就是压力测试，不代表所有界面都会这样。降低动态页 `target_fps`，减少大面积高频反色，并确认处于 HPM；残影明显时，不要继续加速硬刚面板物理特性。

### 6. 改成中文后只显示问号或方框

内置字体只有 96 个 5×7 ASCII 字符，不含中文。需要另外引入裁剪后的中文字库，并通过 `st7305_write_point()` 绘制；不要直接塞进完整大字库，否则固件体积会比界面更有“分量”。

### 7. 想确认硬件是否活着，不想先看复杂页面

先用全黑、全白交替测试，暂时绕开文字、坐标和动画逻辑：

```cpp
// 第一步：整帧置 1，测试全黑
st7305_fill(lcd, 0xFF);
st7305_display(lcd);
delay(2000);

// 第二步：整帧清 0，测试全白
st7305_fill(lcd, 0x00);
st7305_display(lcd);
delay(2000);
```

全黑全白正常，再恢复 15 页轮播。排障和看病一样，先做简单检查，别上来就做大手术。

## FAQ：ESP32-S3 与 ST7305 常见问题

**Q：ST7305 的 SPI 引脚可以换成其他 GPIO 吗？**
A：可以。ESP32-S3 能通过 GPIO Matrix 重映射 SPI，修改 `PIN_SCLK`、`PIN_MOSI`、`PIN_CS`、`PIN_DC`、`PIN_RES` 并同步改接线即可。避开开发板已占用、启动配置和 USB 相关引脚；换板后必须查该板官方引脚表，不能只凭“都是 ESP32-S3”照搬。

**Q：ST7305 屏幕为什么必须用 3.3V，能接 5V 吗？**
A：本例模组 VCI 使用 3.3V，ESP32-S3 GPIO 也是 3.3V 逻辑，不能给 VCI 或信号脚直接加 5V。供电时还要共地；仅接 3.3V 而漏接 GND，信号就没有共同参考。

**Q：ST7305 的实际刷新率是多少，程序写 20 FPS 就是 20 Hz 吗？**
A：不是。本例面板 HPM 配置为 16 Hz，`target_fps=20` 只是主控每秒最多生成并发送 20 帧的目标节奏。20 MHz SPI 传完 15000 字节理论约需 6 ms，实际 FPS 以第 7 页的“绘图 + SPI”测量值为准，光学响应还受面板模式限制。

**Q：15000 字节帧缓存会占多少 ESP32-S3 内存？**
A：固定帧缓存为 15000 字节，约 14.65 KiB，此外还有字体表、页面状态和图形绘制临时变量。示例使用静态全局实例，不需要为每一帧动态分配整块缓存。

**Q：其他 ESP32-S3 开发板能直接使用这份 ST7305 Arduino 代码吗？**
A：驱动逻辑可以复用，但开发板选择和 GPIO 映射要改。若使用非 Nano ESP32 板型，在 Arduino IDE 选择对应开发板，并把 5 个控制 GPIO 改成实际接线；供电仍按模组要求使用 3.3V。

**Q：ST7305 屏幕完全不显示，最先改哪个参数？**
A：先不要改电压寄存器。按“3.3V 供电 → 共地 → FPC/杜邦线 → D5=GPIO8 → SPI 降至 5 MHz → 全黑全白测试”的顺序排查。确认硬件链路后，再检查初始化序列和帧缓存。

**Q：这块 1 bit 单色屏为什么能显示 17 级灰阶？**
A：它没有真正的灰阶像素，而是用 4×4 Bayer 有序抖动控制黑白点密度，让人眼在一定距离外感到 0～16 共 17 级明暗。放大看仍然只有黑点和白点，属于“用排班制造层次感”。

**Q：ST7305 示例能直接显示中文吗？**
A：不能直接显示。当前内置字库覆盖 ASCII 32～126，中文会被替换为 `?`。需要加入裁剪的中文字模并写绘制函数，或把现有绘图接口桥接到字体库。

**Q：全反射屏需要在黑暗环境里使用吗？**
A：需要环境光，不是越暗越好。正常室内照明或明亮环境下更容易看清；黑暗环境应增加外部照明，因为本例没有背光，也没有连接 BLC。

## 延伸玩法：点亮 ST7305 之后还能做什么

- 接入温湿度传感器，把第 6 页的演示数据换成真实环境数据。
- 增加按键或旋转编码器，手动切换 15 个页面并调节停留时间。
- 做局部刷新：使用 CASET/RASET 设置窗口，配合 `WRMEMC 0x3C`，减少整帧传输。
- 接入 TE 帧同步，在 V-Blank 后写帧，进一步研究动态画面的撕裂控制。
- 加入裁剪中文字库，做一个低刷新率天气牌、日历或时钟。
- 按手册时序在静态页切回 LPM，并实测整机功耗，而不是只凭“低功耗”三个字自我感动。

## 参考资料

- [ST7305 数据手册（Sitronix）](https://www.sitronix.com.tw/)：寄存器定义、HPM/LPM 时序与初始化流程以官方数据手册为准
- [U8g2 库](https://github.com/olikraus/u8g2)：v2.36 起内置 `U8G2_ST7305_300X400_1_4W_HW_SPI` 构造器
- [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library)：第三方 ST7305 Arduino 驱动封装
- [Arduino Nano ESP32 官方文档](https://docs.arduino.cc/hardware/nano-esp32/)：开发板丝印与 GPIO 映射关系

如果你也跟着点亮了，建议从第 4 页像素网格和第 7 页帧率测试开始检查，再把自己的界面加进 `pages[]`。一块只有黑白两色的屏，照样能把仪表、动画和复古桌面玩得挺忙。
