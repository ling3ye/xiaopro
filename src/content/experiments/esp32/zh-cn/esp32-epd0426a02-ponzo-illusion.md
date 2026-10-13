---
title: "ESP32-S3 驱动 4.26\" SSD1677 EPD0426A02 墨水屏播放走廊错觉动画｜SPI + GxEPD2 完整教程"
boardId: esp32s3
moduleId: display/epd-4inch26-epd0426a02
category: esp32
date: 2026-10-13
intro: "用 ESP32-S3 通过 SPI 驱动 EPD0426A02（800×480，SSD1677 主控）墨水屏，基于 GxEPD2 局部刷新播放 Ponzo 走廊错觉四帧动画，附完整接线、Arduino 代码与花屏排错。"
image: "https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg"
---

> **一句话摘要**：接 8 根线、装 2 个库、烧一份代码，让 ESP32-S3 驱动 4.26 寸墨水屏自动播放 Ponzo 走廊错觉动画——顺带把墨水屏最实用的局部刷新一次学会。

```
难度：⭐⭐☆☆☆（新手可上手，只要别把 VCC 接到 5V）
预计时间：40 分钟（接线 10 分钟 + 装环境 15 分钟 + 烧录看戏 15 分钟）
测试环境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + GxEPD2 1.6.9
```

> **TL;DR（快速上手）：**
>
> 1. 接线：MOSI → GPIO11，SCK → GPIO12，CS → GPIO10，DC → GPIO9，RST → GPIO8，BUSY → GPIO7
> 2. VCC 接 3.3V（接 5V 会烧屏，别问我怎么知道的）
> 3. 装两个库：GxEPD2（≥ 1.5.3）+ Adafruit_GFX（装 GxEPD2 会自动带上）
> 4. 开发板选 "ESP32S3 Dev Module"，烧录，坐在屏幕前等你的大脑被骗

---

## 前言：一条骗了全人类 100 多年的走廊

你一定见过这张图：两条一模一样的线段，画上走廊的透视线之后，远的那个看起来就是更长。你明知道它们等长，眼睛却还是死不承认——这就是经典的 Ponzo 错觉，你的大脑自动开启了"透视脑补"模式，把"远处"翻译成了"更大"。

我一直想找个机会亲手把这个错觉"实体化"。正好手头有一块 4.26 寸的 EPD0426A02 墨水屏（800×480，SSD1677 主控）和一块 ESP32-S3，墨水屏这种"慢慢变、还断电不丢画面"的气质，跟错觉演示简直是绝配——观众有充足的时间怀疑人生，完了拔电还能摆在桌上继续骗下一位客人。

这篇文章就带你从零开始：接好 8 根线，装好 2 个库，烧录一份代码，让这块墨水屏给你的大脑上一课。过程中顺便把墨水屏最实用的技能——局部刷新——一次点满。

## 最终效果

烧录完成后，屏幕自动播放一段约 40 秒的四帧动画：先问"这两条线段一样长吗"，再揭晓答案，最后停在走廊错觉画面上（MCU 休眠，画面保持到你手动复位）。

![](https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg)

四帧分镜如下，每一帧之间用局部刷新过渡，线段本身纹丝不动：

| 帧   | 画面内容                                                   | 停留时长 |
| ---- | ---------------------------------------------------------- | -------- |
| 1    | 只有线段 A 和 B，"Are these two lines the same length?"    | 7 秒     |
| 2    | 叠上横向虚线辅助线，"Yes - exactly equal."                 | 7 秒     |
| 3    | 透视线登场，"And now?"                                     | 10 秒    |
| 4    | 辅助线 + 透视线同框，"Same lines - your brain was fooled." | 7 秒     |
| 收尾 | 纯错觉画面 + 大标题 "Ponzo illusion"，然后休眠             | 保持     |

![](https://img.lingflux.com/2026/10/68b443e3994d10b40d287b13965c7c93.jpg)

## 元件说明

### EPD0426A02 墨水屏 — 会"断电记事"的电子黑板

EPD0426A02 是深圳市奥斯瑞光电（Osptek）出品的一款 4.26 英寸电子纸显示模组，负责把 ESP32-S3 发来的图像数据"印"到屏幕上，用在本项目里的作用是播放四帧错觉动画并长期保持画面。

生活化一点说：它就是 Kindle 上那块屏的亲戚——一块"电子黑板"。写完字断电，字还在；想改内容就整屏"擦了重写"（这就是墨水屏刷新时闪几下的原因）。刷新慢是它的人设，不耗电才是它的实力。

关键参数：

| 项目          | 参数                                            |
| ------------- | ----------------------------------------------- |
| 尺寸 / 分辨率 | 4.26 英寸，800 × 480（横屏），219 DPI           |
| 驱动 IC       | SSD1677（960 source × 680 gate 主控，SPI 接口） |
| 显示能力      | 黑白双稳态，原生 4 级灰（2 bit/px）             |
| 接口          | 24-pin FPC，4 线 SPI（只写不读）                |
| 刷新峰值电流  | 约 50 mA                                        |
| 深度睡眠电流  | 约 3 µA（画面保持不耗电）                       |
| 设计寿命      | 5 年 / 100 万次刷新（25 ℃ / 60%RH）             |

为什么选它？800×480 的分辨率在同尺寸墨水屏里算高清，画透视线条足够锐利；3 µA 的深度睡眠让"演完就断电摆着骗人"这个用法毫无功耗压力；而且 GxEPD2 库从 v1.5.3 起原生支持（驱动类 `GxEPD2_426_GDEQ0426T82`），驱动不用自己写。

### 引脚说明

EPD0426A02 转接板引出 8 个引脚，各司其职：

| 引脚       | 干什么用                              |
| ---------- | ------------------------------------- |
| VCC        | 3.3V 供电（⚠️ 千万别接 5V）            |
| GND        | 共地，和开发板说同一种语言            |
| MOSI (DIN) | SPI 数据，主控往屏里送像素            |
| SCK (SCL)  | SPI 时钟，约定多快送一个 bit          |
| CS         | 片选，拉低 = "这条线归你了"           |
| DC         | 数据 / 命令切换：高=像素数据，低=命令 |
| RST        | 硬件复位，初始化前拉一下              |
| BUSY       | 忙信号：高电平 = 正在刷新，别打扰     |

一句提醒：这块屏的 BUSY 是**高电平有效**（忙=高），引脚名却常写作 `BUSY_N`，和直觉正好相反。好在这个坑 GxEPD2 已经帮我们填好了，知道有这回事即可。

## BOM 清单

| 序号 | 元件       | 型号 / 规格                                            | 数量 | 备注                      |
| ---- | ---------- | ------------------------------------------------------ | ---- | ------------------------- |
| 1    | 开发板     | ESP32-S3（ESP32-S3-DevKitC / Arduino Nano ESP32 均可） | 1    | 板载 USB 转串口即可       |
| 2    | 墨水屏模组 | EPD0426A02（SSD1677，800×480）                         | 1    | 自带转接板，引出 8 根排针 |
| 3    | 杜邦线     | 母对母或公对公                                         | 8    | 6 根信号 + 电源地         |
| 4    | USB 线     | Type-C 或 Micro（看开发板）                            | 1    | 供电 + 烧录               |

## 接线方式

![](https://img.lingflux.com/2026/10/3ae30dc6faad42836102413a774bc830.jpg)

接线图优先，表格辅助：

| 墨水屏引脚 | ESP32-S3 GPIO | 说明               |
| ---------- | ------------- | ------------------ |
| VCC        | 3V3           | ⚠️ 3.3V，接 5V 烧屏 |
| GND        | GND           | 任意 GND           |
| MOSI (DIN) | GPIO11        | SPI 数据           |
| SCK (SCL)  | GPIO12        | SPI 时钟           |
| CS         | GPIO10        | 片选               |
| DC         | GPIO9         | 数据/命令          |
| RST        | GPIO8         | 复位               |
| BUSY       | GPIO7         | 忙信号（输入）     |

**接完线请逐一核对一遍，能省 80% 的排错时间。** 墨水屏接错线不会报错、不会冒烟，只会默默白屏或花屏——你根本分不清是代码错了还是线错了。另外注意：ESP32-S3 在 Arduino 框架下的默认 I2C 脚是 GPIO8（SDA）和 GPIO9（SCL），本例程把它们分配给了 RST 和 DC，所以接屏之后 I2C 设备需要改用 `Wire.begin(SDA, SCL)` 重映射到其他空闲 GPIO。

如果你用的是 **Arduino Nano ESP32**，这块板子丝印上的 D4~D7、A4/A5 不是真实 GPIO 号，对照表如下：

| 墨水屏引脚 | 真实 GPIO | Nano ESP32 丝印 |
| ---------- | --------- | --------------- |
| MOSI       | GPIO11    | A4              |
| SCK        | GPIO12    | A5              |
| CS         | GPIO10    | D7              |
| DC         | GPIO9     | D6              |
| RST        | GPIO8     | D5              |
| BUSY       | GPIO7     | D4              |

## 需要安装的库

打开 Arduino IDE → 工具 → 管理库，按下面装：

| 库名         | 作者              | 版本要求                                        | 作用                   |
| ------------ | ----------------- | ----------------------------------------------- | ---------------------- |
| esp32        | Espressif Systems | 3.3.10（Arduino IDE 2.3.x 实测通过）            | ESP32-S3 开发板支持    |
| GxEPD2       | Jean-Marc Zingg   | **1.6.9**（含 `GxEPD2_426_GDEQ0426T82` 驱动类） | 墨水屏驱动             |
| Adafruit_GFX | Adafruit          | 随 GxEPD2 自动安装                              | 绘图 API（画线、字体） |

装完后开发板选择 **ESP32S3 Dev Module**（Tools → Board），再接上串口就能烧了。

## 完整代码

直接拷贝烧录即可（文件对应工程里 `arduino/GxEPD2_CorridorIllusion/GxEPD2_CorridorIllusion.ino`）：

```cpp
/*
 * EPD0426A02 (4.26" 480x800 SPI 墨水屏, SSD1677) — 走廊错觉 (Ponzo Illusion) 演示
 * 开发板: ESP32-S3 (Arduino IDE, 选择 "ESP32S3 Dev Module")
 * 驱动库: GxEPD2, 直接使用内置驱动类 GxEPD2_426_GDEQ0426T82
 *
 * 引脚定义与参考例程完全一致:
 *   BUSY -> GPIO7    DC -> GPIO9     CS -> GPIO10
 *   SCK  -> GPIO12   MOSI -> GPIO11  RST -> GPIO8
 *
 * 展示流程 (单轮演示, 不循环):
 *   帧 1: 只有两条等长的粗线段 A、B        "Are these two lines the same length?"
 *   帧 2: 加横向虚线辅助线, 证明等长       "Yes - exactly equal."
 *   帧 3: 线段不动, 叠加走廊透视线         "And now?"
 *   帧 4: 透视 + 辅助线, 揭晓             "Same lines - your brain was fooled."
 *   最后回到帧 3 (错觉画面) 停留
 *
 * 画面为横屏 800x480 (rotation 0 即控制器原生方向)。
 */

#include <Arduino.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>

// ---------------- 引脚定义 (与 ESP-IDF 工程 board_pins.h 一致) ----------------
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_SCK  12
#define EPD_MOSI 11

// 全屏缓冲模式 (page_height = HEIGHT, 48000 字节)
GxEPD2_BW<GxEPD2_426_GDEQ0426T82, GxEPD2_426_GDEQ0426T82::HEIGHT> display(
  GxEPD2_426_GDEQ0426T82(/*CS=*/EPD_CS, /*DC=*/EPD_DC, /*RST=*/EPD_RST, /*BUSY=*/EPD_BUSY));

// ---------------- 画面几何 (800x480 横屏) ----------------
static const int16_t W = 800;
static const int16_t H = 480;

static const int16_t VPX = 700, VPY = 240;   // 灭点 (vanishing point), 左侧走廊
static const int16_t VP2X = 1600, VP2Y = 240; // 第二灭点 (屏幕右侧远处), 右墙透视线用
static const int16_t VP0X = -900, VP0Y = 260; // 第三灭点 (屏幕左侧远处), 左墙透视线用
static const int16_t XN  = 150;              // 近处墙角 x (线段 A)
static const int16_t XF  = 520;              // 远处墙角 x (线段 B)
static const int16_t Y1  = 190;              // 线段上端点
static const int16_t Y2  = 290;              // 线段下端点 (两条线段长度均为 100px)

static const int16_t SEG_W = 6;              // 线段粗细
static const uint32_t FRAME_MS  = 7000;      // 每帧停留时间
static const uint32_t FRAME3_MS = 10000;      // 第 3 帧停久一点

// 实验: 手册要求 VCOM 控制寄存器 (0x2B) 固定写 0x04, 0x63, GxEPD2 驱动不发, 手动补发
// (需在 display.init() 之后调用, SWRESET 会清掉该寄存器)
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

// 从点 (px, py) 指向灭点 (vpx, vpy) 的直线上, 横坐标为 x 的点的 y 值
static int16_t onLineYVP(int16_t x, int16_t px, int16_t py, int16_t vpx, int16_t vpy)
{
  float t = (float)(x - px) / (float)(vpx - px);
  return (int16_t)(py + (vpy - py) * t);
}

// 左侧走廊: 指向灭点 VP
static int16_t onLineY(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VPX, VPY);
}

// 右侧墙: 指向第二灭点 VP2
static int16_t onLineY2(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP2X, VP2Y);
}

// 左侧墙: 指向第三灭点 VP0
static int16_t onLineY0(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP0X, VP0Y);
}

// ---------------- 绘制元素 ----------------

// 两条线段 —— 每一帧都用完全相同的坐标和粗细
static void drawSegments()
{
  display.fillRect(XN - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // 线段 A
  display.fillRect(XF - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // 线段 B

  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(XN - 34, Y2 + 30);
  display.print("A");
  display.setCursor(XF + 16, Y2 + 30);
  display.print("B");
}

// 横向虚线对齐辅助线, 证明两条线段端点在同一水平线上
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

// 走廊透视线
static void drawPerspective()
{
  const int16_t topX = XN, topY = 40;    // 近墙角上端
  const int16_t botX = XN, botY = 440;   // 近墙角下端

  int16_t ftY = onLineY(XF, topX, topY); // 远墙角上端 y
  int16_t fbY = onLineY(XF, botX, botY); // 远墙角下端 y

  // 天花板 / 地板 (2px)
  display.drawLine(topX, topY, XF, ftY, GxEPD_BLACK);
  display.drawLine(topX, topY + 1, XF, ftY + 1, GxEPD_BLACK);
  display.drawLine(botX, botY, XF, fbY, GxEPD_BLACK);
  display.drawLine(botX, botY - 1, XF, fbY - 1, GxEPD_BLACK);

  // 近墙角 (2px) / 远墙角 (1px)
  display.drawLine(XN, topY, XN, botY, GxEPD_BLACK);
  display.drawLine(XN + 1, topY, XN + 1, botY, GxEPD_BLACK);
  display.drawLine(XF, ftY, XF, fbY, GxEPD_BLACK);

  // 经过线段上下端点的水平透视线 (穿到远墙)
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XF, onLineY(XF, XN, ys[i]), GxEPD_BLACK);
  }

  // 竖向分格 (墙面砖缝)
  static const int16_t divX[] = {260, 350, 420, 470, 500};
  for (uint8_t i = 0; i < sizeof(divX) / sizeof(divX[0]); i++)
  {
    int16_t x = divX[i];
    display.drawLine(x, onLineY(x, topX, topY), x, onLineY(x, botX, botY), GxEPD_BLACK);
  }

  // ---- 右侧墙: 从远墙角 (XF) 延伸到屏幕右边缘, 朝第二灭点 VP2 收拢 ----
  const int16_t XR = W - 1;

  // 天花板线 / 地板线 (续接到右边缘)
  display.drawLine(XF, ftY, XR, onLineY2(XR, XF, ftY), GxEPD_BLACK);
  display.drawLine(XF, fbY, XR, onLineY2(XR, XF, fbY), GxEPD_BLACK);

  // 过线段上下端点的水平线, 在右墙上继续延伸
  for (int i = 0; i < 2; i++)
  {
    int16_t yAtXF = onLineY(XF, XN, ys[i]); // 左墙透视线到达远墙角时的 y
    display.drawLine(XF, yAtXF, XR, onLineY2(XR, XF, yAtXF), GxEPD_BLACK);
  }

  // 右墙竖向分格 (砖缝), 连接天花板线与地板线
  static const int16_t divXR[] = {600, 660, 710, 750, 780};
  for (uint8_t i = 0; i < sizeof(divXR) / sizeof(divXR[0]); i++)
  {
    int16_t x = divXR[i];
    display.drawLine(x, onLineY2(x, XF, ftY), x, onLineY2(x, XF, fbY), GxEPD_BLACK);
  }

  // ---- 左侧墙: 从近墙角 (XN) 延伸到屏幕左边缘, 朝第三灭点 VP0 收拢 ----
  const int16_t XL = 0;

  // 天花板线 / 地板线 (续接到左边缘)
  display.drawLine(XN, topY, XL, onLineY0(XL, XN, topY), GxEPD_BLACK);
  display.drawLine(XN, botY, XL, onLineY0(XL, XN, botY), GxEPD_BLACK);

  // 过线段上下端点的水平线, 在左墙上继续延伸
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XL, onLineY0(XL, XN, ys[i]), GxEPD_BLACK);
  }

  // 左墙竖向分格 (砖缝)
  static const int16_t divXL[] = {30, 80, 120};
  for (uint8_t i = 0; i < sizeof(divXL) / sizeof(divXL[0]); i++)
  {
    int16_t x = divXL[i];
    display.drawLine(x, onLineY0(x, XN, topY), x, onLineY0(x, XN, botY), GxEPD_BLACK);
  }
}

// 顶部文字
static void drawTitle(const char *text)
{
  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(20, 34);
  display.print(text);
}

// 最终停留帧的大标题: 更大的字号, 顶部水平居中
// (顶部中央区域在天花板线之上, 不会与透视线重叠)
static void drawTitleBig(const char *text)
{
  display.setFont(&FreeSansBold18pt7b);
  display.setTextColor(GxEPD_BLACK);
  int16_t tbx, tby;
  uint16_t tbw, tbh;
  display.getTextBounds(text, 0, 0, &tbx, &tby, &tbw, &tbh);
  display.setCursor((W - tbw) / 2 - tbx + 200, 48 - tby); // 基线约在 y=48
  display.print(text);
}

// 按帧号绘制整幅画面 (1..4), 全程全窗口绝对坐标绘图
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
    case 5: // 最终停留帧: 错觉画面 + 大标题, 无 "And now?"
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
  drawSegments(); // 每一帧都最后画, 坐标永远不变
}

// 全刷显示一帧
static void showFrameFull(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.display(); // 全屏刷新
}

// 局刷显示一帧: 全窗口绘图, 用 displayWindow() 只刷新变化区域 (整屏窗口 = 全屏局刷)
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

  // ESP32 自定义 SPI 引脚映射: SCK, MISO(-1 不用), MOSI, SS
  SPI.begin(EPD_SCK, -1, EPD_MOSI, EPD_CS);

  display.init(115200);
  display.setRotation(0); // 原生横屏 800x480
  display.setTextColor(GxEPD_BLACK);

  epdWriteVCOMControl(); // 补发 0x2B VCOM 控制寄存器

  // ---- 单轮演示: 帧 1 -> 2 -> 3 -> 4 ----
  // 帧 1: 全刷开场
  showFrameFull(1);
  Serial.println("[EPD] frame 1 (full refresh)");
  delay(FRAME_MS);

  // 帧 2 -> 3 -> 4: 局部刷新, 线段纹丝不动
  showFramePartial(2);
  Serial.println("[EPD] frame 2 (partial)");
  delay(FRAME_MS);

  showFramePartial(3);
  Serial.println("[EPD] frame 3 (partial)");
  delay(FRAME3_MS);

  showFramePartial(4);
  Serial.println("[EPD] frame 4 (partial, 揭晓)");
  delay(FRAME_MS);

  // 最后停留在错觉画面 (帧 5: 走廊 + 大标题 "Ponzo illusion", 无 "And now?")
  showFramePartial(5);
  Serial.println("[EPD] final frame 5 (illusion + title), hold");
  delay(1000);

  // 演示结束, 画面停留在屏幕上 (不使用深度睡眠)
  Serial.println("[EPD] done, holding frame");
}

void loop()
{
  // 画面已停留在屏幕上, 这里空转即可
}
```

### 代码说明

整段代码 300 来行，看着长，其实就干了六件事：

1. **引脚和显示对象（`#define` 一组 + `GxEPD2_BW` 声明）**：6 个宏定义对应 6 根信号线；`GxEPD2_BW<..., HEIGHT>` 是"全屏缓冲模式"，一整帧 48000 字节一次性存内存里，ESP32-S3 的 RAM 毫无压力。引脚想换？改这 6 个宏就行。
2. **四帧分镜（`drawFrame`）**：就是一张 switch 表。注意 `drawSegments()` 放在 switch 外面、每帧最后画——线段坐标全程不变，变的只是周围的辅助线和透视线。错觉要成立，这是铁律。
3. **透视线画法（`drawPerspective` + 三个 `onLineY` 函数）**：核心是一行初中学过的两点式直线方程。三面墙各自指向一个"灭点"（画面外交点），线就自然有了纵深感。灭点放在屏幕外面（VP2 的 x=1600、VP0 的 x=-900），透视效果反而更自然。
4. **局部刷新（`showFramePartial` 里的 `displayWindow`）**：先在内存里整帧重画，再只把"有变化的像素"推给屏幕。帧 2 到帧 4 之间，屏幕上的线段一动不动，闪的只有辅助线和透视线——这正是局部刷新相对全刷的灵魂：快（约 0.42 秒一次），而且不闪瞎眼。
5. **0x2B VCOM 补丁（`epdWriteVCOMControl`）**：SSD1677 手册要求往 `0x2B` 寄存器写 `0x04, 0x63`（抑制 ACVCOM 翻转的毛刺），但 GxEPD2 和厂商 demo 都没发这条命令。漏发的后果很阴：演示结束后只要 VCC 还接着，画面会在几分钟尺度上慢慢变花。必须每次 `display.init()` 之后补发，因为软复位（0x12）会把这个寄存器清掉。这个坑我踩了一整天，详见后面的常见问题。

## 常见问题排查

别慌，90% 的问题出在这五个地方，从上到下挨个查：

**1. 烧录后白屏，什么都没显示**

先别怀疑人生，按概率从高到低查：① 6 根信号线有没有虚接（杜邦线插 breadboard 久了会松）；② VCC 是不是接到了 3.3V；③ 烧录前串口监视器有没有打印 `[EPD] frame 1`，如果串口都没输出，说明程序没跑起来，和屏无关。墨水屏不报错，白屏就是它的"报错方式"。

**2. 编译报错：`'GxEPD2_426_GDEQ0426T82' does not name a type`**

GxEPD2 版本低于 1.5.3。打开库管理器，把 GxEPD2 升级到最新版，这个驱动类从 v1.5.3 起才有。

**3. 演示跑完了，画面放着放着慢慢花了（十几分钟尺度）**

就是那个 0x2B。确认 `epdWriteVCOMControl()` 在每次 `display.init()` 之后都调用了——软复位会清掉这个寄存器，init 在前、补发在后，顺序反了等于没发。补对之后，带电闲置画面能稳稳保持。

**4. 画面只显示一半，或者上下错位**

八成是 rotation 或分辨率不对。本例程用 `setRotation(0)`（原生横屏 800×480）；如果你之前跑过别的例程把 rotation 改成了 1 或 3，换回来。另外 ESP-IDF 那边有个分页渲染的版本（内存紧张时才需要），Arduino 全屏缓冲模式不存在这个问题。

**5. 上传失败 / 找不到串口**

先按住开发板上的 BOOT 键再插 USB，进入下载模式；如果还不行，换个数据线——很多"充电线"里面只有电源没有数据线，这是我烧录生涯中翻过最多的车。

## FAQ

**Q：ESP32（不是 S3）或者 ESP32-C3 能跑这个例程吗？**
A：能。代码没有用到 S3 专属功能，任何支持 Arduino 框架的 ESP32 系列都能跑，引脚换成你板子上空闲的 GPIO 即可。全屏缓冲需要约 48 KB RAM，经典 ESP32（520 KB SRAM）也够用。

**Q：可以换其他 GPIO 引脚吗？怎么换？**
A：可以。改代码开头 6 个 `#define`（EPD_CS / EPD_DC / EPD_RST / EPD_BUSY / EPD_SCK / EPD_MOSI）再按新引脚重新接线就行。ESP32-S3 上注意避开 GPIO0/3/45/46 这类 Strapping 引脚、GPIO19/20（USB）以及被 Flash/PSRAM 占用的引脚，具体看开发板原理图。

**Q：墨水屏刷新一次要好几秒还闪几下，正常吗？**
A：全刷慢是正常的物理特性：每次刷新要把 480 行像素全部重新"压"一遍，本屏全刷实测约 2 秒（快刷波形下约 1.5 秒）。闪几下是清残影的标准流程，不是坏了。嫌慢就用本例程的局部刷新（`displayWindow`），实测约 0.42 秒一次，几乎不闪。

**Q：墨水屏能接 5V 吗？**
A：不能。EPD0426A02 的 VCC 必须接 3.3V，上限就是 3.3V。接 5V 不会立刻冒烟，但屏内部高压驱动电路会被打坏，表现为用几次之后局部花屏——而且不保修。宁愿不亮，也别接 5V。

**Q：演示结束后屏幕放着会慢慢花掉，怎么彻底解决？**
A：往 SSD1677 的 0x2B 寄存器写 0x04、0x63 两个字节（手册原话是"reduce glitch when ACVCOM toggle"），并且在每次软复位后重发。例程里的 `epdWriteVCOMControl()` 就是干这个的。另一个更物理的方案是用 P-MOS 管断开 VCC，但软件补发两个字节就能解决，没必要动烙铁。

**Q：为什么说是 4 级灰？商品页不是宣传 16 级灰吗？**
A：SSD1677 的像素物理上只有黑/白两种稳态，数据通路是 2 bit/px，原生就是 4 级灰（黑/深灰/浅灰/白）。灰度靠波表（LUT）在一帧内对不同像素施加不同次数和极性的脉冲实现；16 级观感是用 Bayer 4×4 有序抖动在 4 级灰上模拟出来的。这个错觉例程只用黑白，不受影响，但你要显示照片时记住这个上限。

**Q：局部刷新用久了有残影怎么办？**
A：局刷的原理决定了残影会累积。实用策略是"连续局刷一段时间后全刷一次"——`display.clearScreen()` 或者干脆全黑全白各刷一遍，把残影洗干净。本例程只有 4 次刷新，残影可以忽略。

**Q：想改两条线段的长度、位置，或者换成中文文案，改哪里？**
A：线段参数全在"画面几何"那一组常量里：`XN`/`XF` 是水平位置，`Y1`/`Y2` 是上下端点（长度 = Y2 - Y1），`SEG_W` 是粗细。文案在 `drawFrame` 的 switch 里。注意改完保持两条线段坐标一致，不然错觉就不"诚实"了。

## 延伸玩法

- 换错觉：把 Ponzo 换成 Müller-Lyer 箭头错觉或艾宾浩斯大小错觉，改 `drawFrame` 里的几何函数就行
- 手动切帧：接一个触摸按键或电位器，观众喊"揭晓"才进入第 3 帧，仪式感拉满
- 局刷计数器：用这个例程的 `displayWindow` 思路做一个 0.42 秒走一格的电子秒表，体验墨水屏跑"动态"的反差感
- 灰阶照片：接上 GxEPD2_4G，用 4 级灰 + Bayer 抖动把一张照片"印"上墨水屏，Kindle 壁纸效果
- 电池摆件：18650 + 深度睡眠，一天只醒来几秒更新画面，一节电池能用几个月——你的错觉走廊可以 7×24 小时骗人

## 参考资料

- SSD1677 驱动 IC 原厂产品页（晶门科技 Solomon Systech）：https://www.solomon-systech.com/product/ssd1677/
- GxEPD2 驱动库 GitHub 主页（含完整支持列表）：https://github.com/ZinggJM/GxEPD2
- Adafruit_GFX 绘图库 GitHub：https://github.com/adafruit/Adafruit-GFX-Library
- ESP32-S3 主控芯片官方产品页（乐鑫 Espressif）：https://www.espressif.com/zh-hans/products/socs/esp32-s3
- 姊妹库 GxEPD2_4G（如果想玩 4 级灰 + 抖动灰阶照片）：https://github.com/ZinggJM/GxEPD2_4G
