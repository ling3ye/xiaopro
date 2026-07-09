---
title: "ESP32-S3 驱动 GC9A01 圆屏 + VL53L0X-V2 激光测距 完整教程（SPI接线 + I2C避坑）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/vl53l0x
category: esp32
date: 2026-07-09
intro: "用 ESP32-S3 驱动 GC9A01 1.28 英寸圆形屏，配合 VL53L0X-V2 激光测距传感器，做一个会实时摆动指针、弧线随距离变色的赛博朋克激光测距仪表盘，附 SPI+I2C 引脚冲突避坑与全部 Arduino 源码。"
image: "https://img.lingflux.com/2026/07/68114f0f73885a81414b9432bd0d95eb.jpg"
---



# ESP32-S3 驱动 GC9A01 圆屏 + VL53L0X-V2 激光测距：从接线到点亮赛博仪表盘（附全部代码)

难度：⭐⭐⭐☆☆（有一点基础的 maker 可上手，需要一点排线耐心）
预计时间：45 分钟
测试环境：Arduino IDE 2.3.8 + ESP32 Core 3.3.10 + Arduino_GFX_Library v1.6.5 + Adafruit_VL53L0X v1.2.5

---

> **TL;DR（快速上手）：**
>
> 1. 屏幕接线：GPIO12→SCL、GPIO11→SDA、GPIO9→CS、GPIO10→DC、GPIO18→RST、GPIO7→BL
> 2. 传感器接线：GPIO13→SDA、GPIO14→SCL（**注意不是默认 I2C 引脚**，因为 GPIO9 已经被屏幕 CS 占用了）
> 3. 装两个库：`Arduino_GFX_Library`、`Adafruit_VL53L0X`
> 4. 先烧录"传感器测试代码"，串口能看到距离数字再烧主程序
> 5. 烧录主程序，圆屏上就会出现一个会转指针、会变色的激光雷达仪表盘

---

## 前言：为什么要折腾这个圆屏仪表盘

激光测距（ToF）模块大家玩得很多，但大多数人的玩法还停留在“串口打印数字”的阶段。这个项目的目的很简单：利用 ESP32-S3 的性能和 GC9A01 圆屏的视觉优势，把抽象的距离数据变成一套兼具实用性和赛博朋克感的高刷新仪表盘。

项目的核心难点不在逻辑，而在于 显示屏 SPI 接口与传感器 I2C 接口的引脚冲突。为了解决开发板默认引脚“打架”导致初始化失败的问题，我重新调整了硬件管脚映射。以下是完整的避坑指南与主程序实现。

## 实验效果展示

最终效果是这样的：圆屏上画一个类似赛车转速表的弧形刻度盘，指针会实时指向当前测量到的距离，弧线颜色从红（近/危险）过渡到绿（远/安全），圆心显示具体的毫米数和状态文字（DANGER / WARNING / CAUTION / SAFE / CLEAR）。手在传感器前面晃一晃，指针跟着实时摆动，还挺解压的。

## 元件说明

开发板（ESP32-S3）就不多介绍了，重点说说另外两个主角。

### GC9A01 240×240 圆屏

GC9A01 是一颗专门给圆形屏幕用的显示驱动芯片，负责把你发过去的像素数据"翻译"成屏幕上的画面——你说画什么，它负责怎么画，中间的刷新、扫描全是它在处理，你只管调 API。

| 参数   | 数值                |
| ------ | ------------------- |
| 分辨率 | 240×240             |
| 尺寸   | 1.28 英寸           |
| 接口   | SPI                 |
| 色深   | 65K 色（RGB565）    |
| 驱动库 | Arduino_GFX_Library |

选它是因为价格便宜、圆形屏幕做仪表盘天生好看，而且 SPI 接口速度够快，指针转动不会拖影。

### VL53L0X-V2 激光测距传感器

VL53L0X 是一颗基于飞行时间（ToF）原理的激光测距传感器，说人话就是：它发一道你看不见的红外激光出去，掐着表算激光打到物体再反射回来的时间，从而反推出距离——跟蝙蝠的回声定位是一个思路，只不过它用的是光，不是声音。

| 参数     | 数值                                    |
| -------- | --------------------------------------- |
| 测量范围 | 30mm～1200mm（长距离模式最远约 2000mm） |
| 测距精度 | ±3%                                     |
| 通信接口 | I2C（最高 400kHz）                      |
| 激光波长 | 940nm（人眼不可见，Class 1 激光，安全） |

选它是因为不受被测物颜色/材质影响（红外测距和超声波比，几乎不挑表面），体积小到能塞进任何外壳里，I2C 接线只要两根信号线。

> 💡 **小提醒：这模块一般不带光学盖片（我买的时候也忘了一起买）**
>
> 开发测试阶段裸奔完全没问题，但有些小坑值得提前知道：
>
> - **别用手指戳芯片表面**：芯片上那两个比芝麻还小的玻璃窗口（一发一收）怕灰、怕油、怕水汽。脏了之后灰尘会把激光散射回来，造成"串扰（crosstalk）"，测距会莫名变短、数字乱跳，严重时直接失效。
> - **万一脏了别瞎擦**：千万别拿衣角或纸巾去擦（一擦就花）。有灰就用**气吹（吹气球）**吹一下，有油就用棉签蘸一点点**无水酒精**极轻地抹一下，晾干即可。
> - **强光下会"变瞎"**：太阳光和老旧白炽灯里含红外，没盖片裸奔时最大测距会明显缩水，室内桌面测试基本无感，搬去室外玩要心里有数。
>
> 如果以后打算装进外壳长期用：**千万别拿普通透明胶带或玻璃直接糊在芯片前面**——普通材质会反射红外光，传感器会把盖片误当成障碍物，直接锁死在 `0mm` 或几厘米。要么留个孔让它探出来，要么老老实实买块 **940nm 红外滤光片**，而且贴得越近越好（间距小于 1mm）。

## BOM 表（元件清单）

| 元件                     | 数量 | 备注                        |
| ------------------------ | ---- | --------------------------- |
| ESP32-S3 开发板          | 1    | 任意带足够 GPIO 的型号即可  |
| GC9A01 1.28寸圆屏（SPI） | 1    | 确认是 SPI 版本，不是并口版 |
| VL53L0X-V2 ToF 测距模块  | 1    | 面包板模块款                |
| 杜邦线                   | 若干 |                             |

## 元件引脚说明

### GC9A01 引脚

| 引脚     | 作用                                         |
| -------- | -------------------------------------------- |
| VCC      | 电源正极，接 3.3V                            |
| GND      | 电源地                                       |
| SCL/CLK  | SPI 时钟线                                   |
| SDA/MOSI | SPI 数据线                                   |
| CS       | 片选，低电平时芯片工作                       |
| DC       | 数据/命令切换脚                              |
| RST      | 复位脚                                       |
| BL       | 背光控制脚（可能有些模块没有引出，可不用管） |

### VL53L0X-V2 引脚

| 引脚  | 作用                                                         |
| ----- | ------------------------------------------------------------ |
| VIN   | 电源正极                                                     |
| GND   | 电源地                                                       |
| SCL   | I2C 串行时钟输入                                             |
| SDA   | I2C 串行数据                                                 |
| GPIO1 | 中断输出脚，指示数据是否准备好（本项目用不到，可悬空）       |
| XSHUT | 关闭脚，默认拉高为正常工作，拉低进入关闭模式（本项目用不到，可悬空） |

## 接线方式

建议按下表逐行接完，每接一根在旁边打个钩，能省 80% 的排错时间。

### ESP32-S3 接 GC9A01 屏幕

| GC9A01 屏幕 | ESP32-S3                                                     |
| ----------- | ------------------------------------------------------------ |
| VCC         | 3.3V                                                         |
| GND         | GND                                                          |
| SCL / CLK   | GPIO12                                                       |
| SDA / MOSI  | GPIO11                                                       |
| CS          | GPIO9                                                        |
| DC          | GPIO10                                                       |
| RST         | GPIO18                                                       |
| BL          | GPIO7（代码控制）或直接接 3.3V（部分开发板没有独立背光控制） |

### ESP32-S3 接 VL53L0X-V2 传感器

| VL53L0X-V2 | ESP32-S3                 |
| ---------- | ------------------------ |
| VIN        | 3.3V                     |
| GND        | GND                      |
| SDA        | GPIO13                   |
| SCL        | GPIO14                   |
| GPIO1      | 悬空不接                 |
| XSHUT      | 悬空不接（内部默认拉高） |

> ⚠️ **注意**：ESP32-S3 的默认 I2C 引脚通常是 GPIO8（SDA）/GPIO9（SCL），但本项目里 GPIO9 已经被屏幕的 CS 占用了，所以传感器的 I2C 手动改到了 GPIO13/GPIO14。代码里用 `Wire.begin(I2C_SDA, I2C_SCL)` 指定了这两个引脚，接线时千万别图省事接回默认脚，不然屏幕和传感器会互相打架，谁都用不了。

## 需要安装的库

Arduino IDE 里通过「库管理器」搜索安装：

- `Arduino_GFX_Library`（作者 moononournation）—— 测试通过版本 v1.6.5
- `Adafruit_VL53L0X`（作者 Adafruit）—— 测试通过版本 v1.2.5，安装时会提示一并装 `Adafruit BusIO`，一起装上

IDE 版本：Arduino IDE 2.3.8，ESP32 开发板支持包用的是 3.3.10。版本差太多可能会遇到 API 不兼容，建议对齐着装。

## 完整代码

### 仪表盘主程序

```cpp
/*
 * ═══════════════════════════════════════════════════════
 *  赛博仪表盘 · Cyber Gauge Dashboard
 *  圆屏 GC9A01 (240×240) + VL53L0X-V2 激光测距
 *  MCU: ESP32-S3
 *  驱动库: Arduino_GFX_Library v1.6.5
 * ═══════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <Arduino_GFX_Library.h>

// ───────── 颜色定义（Arduino_GFX v1.6.5 需手动定义）─────────
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

// 赛博主题色
#define CYBER_BG      0x0841    // 深邃背景
#define CYBER_PANEL   0x1082    // 面板色
#define CYBER_BLUE    0x06DF    // 荧光蓝
#define CYBER_CYAN    0x07F5    // 荧光青
#define CYBER_GREEN   0x47E0    // 荧光绿
#define CYBER_RED     0xF806    // 警告红
#define CYBER_ORANGE  0xFB40    // 橙色
#define CYBER_YELLOW  0xFF80    // 黄色
#define CYBER_DIM     0x4A49    // 暗淡色

// ───────── 引脚定义 ─────────
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// VL53L0X 单独走 I2C，避开被 TFT_CS 占用的 GPIO9
#define I2C_SDA   13
#define I2C_SCL   14

// ───────── 屏幕尺寸 ─────────
#define SCREEN_W  240
#define SCREEN_H  240
#define CX        120     // 圆心X
#define CY        120     // 圆心Y

// ───────── 仪表盘参数 ─────────
#define GAUGE_R       95      // 刻度弧半径
#define GAUGE_WIDTH   10      // 弧线宽度
#define NEEDLE_LEN    78      // 指针长度
#define START_ANGLE   135     // 起始角度 (度)
#define END_ANGLE     405     // 结束角度 (度)
#define MAX_DIST      800     // 最大显示距离 mm
#define MIN_DIST      20      // 最小距离 mm
#define TICK_COUNT    16      // 刻度数量

// ───────── 全局对象 ─────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1 /* MISO */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0 /* rotation */, true /* IPS */
);

Adafruit_VL53L0X lox = Adafruit_VL53L0X();
Arduino_Canvas *canvas;   // 离屏画布，消除闪烁

// ───────── 状态变量 ─────────
float currentAngle = START_ANGLE;
float targetAngle  = START_ANGLE;
int   currentDist  = 0;
int   lastDist     = -1;

// ═══════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════

// RGB565 颜色混合
uint16_t blendColor(uint16_t c1, uint16_t c2, float t) {
  uint8_t r1 = (c1 >> 11) & 0x1F, g1 = (c1 >> 5) & 0x3F, b1 = c1 & 0x1F;
  uint8_t r2 = (c2 >> 11) & 0x1F, g2 = (c2 >> 5) & 0x3F, b2 = c2 & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// 根据距离获取颜色 (近=红, 远=绿)
uint16_t getDistColor(int dist) {
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  if (ratio < 0.15)  return CYBER_RED;
  if (ratio < 0.30)  return blendColor(CYBER_RED, CYBER_ORANGE, (ratio - 0.15) / 0.15);
  if (ratio < 0.50)  return blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.30) / 0.20);
  if (ratio < 0.70)  return blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.50) / 0.20);
  return blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.70) / 0.30);
}

// 获取状态文字
const char* getStatusText(int dist) {
  if (dist < 100) return "DANGER";
  if (dist < 200) return "WARNING";
  if (dist < 400) return "CAUTION";
  if (dist < 600) return "SAFE";
  return "CLEAR";
}

// ═══════════════════════════════════════
//  绘图函数
// ═══════════════════════════════════════

// 画粗弧线 (用多段短线模拟)
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

// 画渐变弧线
void drawGradientArc(Arduino_Canvas *c, int cx, int cy, int r,
                     float startDeg, float endDeg, int thickness) {
  float totalAngle = endDeg - startDeg;
  float step = 1.5;

  for (float a = startDeg; a <= endDeg; a += step) {
    float ratio = (a - startDeg) / totalAngle;
    uint16_t color;

    // 红 -> 橙 -> 黄 -> 青 -> 绿
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

// 画刻度线
void drawTicks(Arduino_Canvas *c) {
  float totalAngle = END_ANGLE - START_ANGLE;

  for (int i = 0; i <= TICK_COUNT; i++) {
    float angle = START_ANGLE + (float)i / TICK_COUNT * totalAngle;
    float rad = angle * DEG_TO_RAD;
    float ratio = (float)i / TICK_COUNT;

    // 刻度颜色
    uint16_t color;
    if (ratio < 0.2)       color = CYBER_RED;
    else if (ratio < 0.4)  color = CYBER_ORANGE;
    else if (ratio < 0.6)  color = CYBER_YELLOW;
    else if (ratio < 0.8)  color = CYBER_CYAN;
    else                   color = CYBER_GREEN;

    // 长/短刻度
    bool isMajor = (i % 4 == 0);
    int innerR  = GAUGE_R + 4;
    int outerR  = innerR + (isMajor ? 12 : 6);
    int thick   = isMajor ? 2 : 1;

    int x1 = CX + cos(rad) * innerR;
    int y1 = CY + sin(rad) * innerR;
    int x2 = CX + cos(rad) * outerR;
    int y2 = CY + sin(rad) * outerR;

    // 画刻度线
    for (int t = 0; t < thick; t++) {
      c->drawLine(x1 + t, y1, x2 + t, y2, color);
    }

    // 主刻度标注数字
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

// 画指针
void drawNeedle(Arduino_Canvas *c, float angleDeg, uint16_t color) {
  float rad = angleDeg * DEG_TO_RAD;

  // 指针尖端
  int tipX = CX + cos(rad) * NEEDLE_LEN;
  int tipY = CY + sin(rad) * NEEDLE_LEN;

  // 指针底部 (垂直于指针方向的两个点)
  float perpRad = rad + PI / 2;
  int baseW = 4;
  int bx1 = CX + cos(perpRad) * baseW;
  int by1 = CY + sin(perpRad) * baseW;
  int bx2 = CX - cos(perpRad) * baseW;
  int by2 = CY - sin(perpRad) * baseW;

  // 画三角形指针
  c->fillTriangle(tipX, tipY, bx1, by1, bx2, by2, color);

  // 中心装饰圈
  c->fillCircle(CX, CY, 7, CYBER_PANEL);
  c->drawCircle(CX, CY, 7, color);
  c->fillCircle(CX, CY, 3, color);
}

// 绘制完整仪表盘
void drawDashboard(int dist) {
  canvas->fillScreen(CYBER_BG);

  // 外圈装饰
  canvas->drawCircle(CX, CY, 118, CYBER_PANEL);

  // 背景弧线（暗色轨道）
  drawArc(canvas, CX, CY, GAUGE_R,
          START_ANGLE, END_ANGLE, GAUGE_WIDTH, CYBER_PANEL);

  // 渐变弧线（完整）
  drawGradientArc(canvas, CX, CY, GAUGE_R,
                  START_ANGLE, END_ANGLE, GAUGE_WIDTH);

  // 刻度
  drawTicks(canvas);

  // 计算指针角度
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  targetAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);

  // 平滑插值
  currentAngle += (targetAngle - currentAngle) * 0.15;

  // 获取颜色
  uint16_t needleColor = getDistColor(dist);

  // 画指针
  drawNeedle(canvas, currentAngle, WHITE);

  // ── 中央数字区域 ──
  // 距离数值
  canvas->setTextColor(WHITE);
  canvas->setTextSize(3);
  String distStr = String(dist);
  int textW = distStr.length() * 18;
  canvas->setCursor(CX - textW / 2, CY + 16);
  canvas->print(distStr);

  // 单位
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 6, CY + 42);
  canvas->print("mm");

  // 标题
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 30, CY - 28);
  canvas->print("LASER RANGE");

  // 状态指示
  canvas->setTextColor(needleColor);
  canvas->setTextSize(1);
  const char* status = getStatusText(dist);
  int sLen = strlen(status);
  canvas->setCursor(CX - sLen * 3, CY + 56);
  canvas->print(status);

  // 推送到屏幕
  canvas->flush();
}

// ═══════════════════════════════════════
//  setup() & loop()
// ═══════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n═══ Cyber Gauge Dashboard ═══");

  // 第一步：打开背光
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 第二步：初始化屏幕
  gfx->begin();
  gfx->fillScreen(BLACK);
  gfx->setRotation(0);

  // 第三步：创建离屏画布（双缓冲防闪烁）
  canvas = new Arduino_Canvas(SCREEN_W, SCREEN_H, gfx);
  canvas->begin();

  // 开机画面
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

  // 第四步：初始化 I2C 和传感器（注意这里用的是自定义引脚，不是默认脚）
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("VL53L0X 初始化失败!");
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

  Serial.println("VL53L0X 就绪 ✓");

  // 第五步：启动连续测量模式
  lox.startRangeContinuous();

  Serial.println("仪表盘启动完成!");
}

void loop() {
  // 读取距离
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();

    // 过滤无效值
    if (dist > 0 && dist < 8190) {
      // 简单平滑滤波，避免数字乱跳
      currentDist = currentDist * 0.7 + dist * 0.3;
      currentDist = constrain(currentDist, MIN_DIST, MAX_DIST);

      // 只在距离变化超过阈值时才重绘，省性能
      if (abs(currentDist - lastDist) > 2) {
        drawDashboard(currentDist);
        lastDist = currentDist;

        Serial.printf("距离: %d mm\n", currentDist);
      }
    }
  }

  delay(30);  // ~33 FPS
}
```

### 传感器测试代码（建议先跑这个）

正式上主程序之前，强烈建议先烧这段最简代码，确认传感器能正常工作，出了问题也方便单独排查，不用在一堆绘图代码里大海捞针。

```cpp
/*
 *  测试 VL53L0X 传感器
 */

#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define I2C_SDA  13
#define I2C_SCL  14

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("VL53L0X 传感器测试");

  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("❌ 传感器未找到，请检查接线!");
    while (1);
  }

  Serial.println("✓ 传感器就绪，开始测量...");
  lox.startRangeContinuous();
}

void loop() {
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();
    Serial.printf("距离: %d mm\n", dist);
  }
  delay(100);
}
```

### 代码说明

几个容易看晕的关键点，挑出来说一下：

- **`blendColor()`**：把两个 RGB565 颜色按比例 `t` 混合，用来实现红→橙→黄→青→绿的渐变弧线，不是直接切换颜色，看起来才顺滑。
- **`Arduino_Canvas`（离屏画布）**：所有绘制先画到内存里的画布上，最后一次性 `flush()` 推到屏幕，而不是一笔一笔直接画在屏幕上——不这么做的话，指针转动时会看到明显的闪烁和撕裂感。
- **平滑滤波 `currentDist * 0.7 + dist * 0.3`**：传感器原始读数会有小幅抖动，这里做了个简单的一阶低通滤波，让指针摆动更平滑，不会看着一惊一乍。
- **`I2C_SDA=13, I2C_SCL=14`**：前面接线部分反复强调的坑，这里再敲一遍黑板——这两个不是 ESP32-S3 的默认 I2C 引脚，是因为默认的 GPIO9 被屏幕 CS 占用了才手动改过来的。

## 常见问题排查

别慌，八成的问题出在这几个地方：

1. **烧录后屏幕一直黑屏**
   先检查 `TFT_BL`（背光）有没有接对，或者代码里 `digitalWrite(TFT_BL, HIGH)` 有没有执行到；再检查 RST 脚是否接触不良，RST 松动是圆屏黑屏最常见的原因。

2. **串口打印"VL53L0X 初始化失败!"**
   99% 是接线问题：确认 VIN/GND 有没有接反，SDA/SCL 是否真的接在 GPIO13/GPIO14（而不是默认的 GPIO8/9），杜邦线有没有松动。可以先单独跑"传感器测试代码"排除屏幕干扰。

3. **屏幕能亮，但花屏/条纹/颜色不对**
   多半是 SPI 时钟线或数据线接触不良，或者杜邦线太长导致信号衰减。检查 SCL/SDA 是否对应到 GPIO12/GPIO11，杜邦线尽量控制在 15cm 以内。

4. **指针疯狂乱跳，数字一直变**
   这是滤波系数不够或者传感器前方有反光/透明物体干扰。可以把 `currentDist * 0.7 + dist * 0.3` 里的权重改成 `0.85/0.15`，滤波会更强（代价是响应变慢）。

5. **编译报错找不到 `Adafruit_VL53L0X.h` 或 `Arduino_GFX_Library.h`**
   说明库没装对，去库管理器搜索准确的库名重装，注意别装成同名的第三方 fork 版本。

6. **指针角度或刻度数字对不上**
   检查 `MAX_DIST` 是不是被改小了但刻度标注没跟着改，两者要保持一致，否则刻度数字和实际指针位置会错位。

## FAQ 问答

**Q：ESP32-S3 的默认 I2C 引脚是哪两个？**
A：默认通常是 GPIO8（SDA）和 GPIO9（SCL），但本项目里 GPIO9 被屏幕 CS 占用了，所以传感器 I2C 改到了 GPIO13/GPIO14。

**Q：VL53L0X 最大能测多远，精度多少？**
A：官方标称有效测量范围约 30mm～1200mm（长距离模式下最远可到 2000mm），精度约 ±3%。

**Q：GC9A01 圆屏支持触摸吗？**
A：GC9A01 本身只是显示驱动芯片，不带触摸功能；市面上部分模块会额外集成电容触摸芯片，购买前需确认具体型号是否带触摸版本。

**Q：VL53L0X 的激光会伤眼睛吗？**
A：不会，它属于 Class 1 激光产品，940nm 波长人眼不可见，功率极低，符合人眼安全标准，正常使用无需担心。

**Q：GC9A01 屏幕不亮，但供电正常是什么原因？**
A：最常见的原因是 RST（复位）脚接触不良，或者背光 BL 脚没有被拉高，先排查这两处。

**Q：为什么代码里要用离屏画布 `Arduino_Canvas` 而不是直接画在屏幕上？**
A：直接画在屏幕上会在指针转动、弧线重绘时出现明显闪烁和撕裂，用画布做双缓冲，画完一次性刷新，画面才干净利落。

**Q：VL53L0X-V2 和普通版 VL53L0X 有区别吗？**
A：核心测距原理和引脚定义一致，V2 通常是模块厂商在电路板设计、稳压电路上做了改版优化，具体差异建议以购买模块的实物资料为准。

**Q：这个项目 ESP32-S3 供电用 USB 供电够用吗？**
A：够用，屏幕和传感器整体功耗不高，正常 USB 5V/500mA 供电完全没问题。

## 延伸玩法

- 接一个蜂鸣器，距离进入 DANGER 区间时报警，秒变简易泊车雷达
- 把历史距离数据存起来，画一条实时曲线图，观察物体移动轨迹
- 加两个按键，切换显示单位（mm / cm / inch）
- 做个外壳吸在挡风玻璃上，真拿来当倒车雷达用

## 参考资料

- [ST VL53L0X 官方数据手册](https://www.st.com/en/imaging-and-photonics-solutions/vl53l0x.html)
- [Adafruit_VL53L0X GitHub 仓库](https://github.com/adafruit/Adafruit_VL53L0X)
- [Arduino_GFX_Library GitHub 仓库](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 官方产品页](https://www.espressif.com/en/products/socs/esp32-s3)