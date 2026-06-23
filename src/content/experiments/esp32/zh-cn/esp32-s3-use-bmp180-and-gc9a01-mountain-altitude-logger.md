---
title: "ESP32-S3 驱动 GC9A01 圆形屏 + BMP180 DIY 登山海拔记录仪完整教程（SPI + I2C + Arduino）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/bmp180
category: esp32
date: 2026-06-23
intro: "用 ESP32-S3 驱动 GC9A01 1.28 英寸圆形彩屏，配合 BMP180 气压传感器，实现带动态山景背景、实时海拔、累计爬升和气压显示的登山记录仪，附完整 Arduino 代码与接线说明。"
image: "https://img.lingflux.com/2026/06/cc83e55f42460646d2fd372496989222.jpg"
---


> 难度：⭐⭐⭐☆☆（焊过几次杜邦线就能上手）
> 预计时间：45 分钟
> 测试环境：Arduino IDE 2.3.2 · Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · ESP32 Arduino Core 3.0.x

---

> **TL;DR（快速上手）：**
> 1. **接屏**：GC9A01 → CS/GPIO9、DC/GPIO10、SCK/GPIO12、MOSI/GPIO11、RST/GPIO18、BL/GPIO7
> 2. **接传感器**：BMP180 → SDA/GPIO13、SCL/GPIO14
> 3. **背光必须拉高**：`setup()` 里加 `digitalWrite(TFT_BL, HIGH)`，少了这句屏幕永远黑
> 4. **安装两个库**：Arduino_GFX_Library（作者 moononournation）+ Adafruit BMP085 Library
> 5. **直接烧录**，打开串口监视器（115200），看到 `初始化完成，进入主循环` 就成功了

---

## 前言

很喜欢爬山，可是最近只能爬爬白云山，背包里塞了充电宝、手机、防晒霜，唯独没有任何一块能实时告诉我"你已经爬了多少米"的东西。手机 App 要联网，GPS 信号时好时坏，而且每次掏出手机都有一种"我是来打卡拍照的"的违和感。于是我就打算做一个登山海拔记录仪。

回来翻零件盒，刚好看到一块 GC9A01 圆形屏长期吃灰——那个圆形轮廓，像极了登山表的表盘。再配上 BMP180 气压传感器和 ESP32-S3，三个零件，总成本不到 50 块，做出来的效果比我预期的好太多。

本文目标：从零开始，把这三个零件接在一起，烧录代码，得到一个能实时显示海拔、累计爬升/下降、气压，背景还会随海拔动态变色的登山记录仪。跟着做就能复现。

---

## 实验效果

最终效果：GC9A01 圆形屏实时显示当前海拔（m）、累计爬升（橙色向上箭头）、累计下降（蓝色向下箭头）和实时气压，屏幕背景是随海拔比例动态变色的山景图——低海拔偏暖棕，高海拔渐变深蓝，山顶雪线也会随海拔升高而向下蔓延。屏幕边缘有金色进度环跟踪海拔进度，长按 BOOT 键 2 秒可清零重新计算。

![](https://img.lingflux.com/2026/06/9cedc6308f5ac8b32bb260be186b9298.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/BbqvEXOn6Xo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 元件说明

> ESP32-S3 开发板不用专门介绍，能看到这篇文章说明你用过 ESP32。下面只说另外两个配角。

### BMP180 气压传感器

BMP180 是一款 MEMS 气压传感器，负责测量大气压力并推算海拔高度，用在本项目里的作用是每秒采集一次气压和海拔数据，作为整个仪表盘的数据来源。

通俗理解：它就像一个随身携带的"气象站迷你版"——通过测量大气压力倒推出你站在多高的地方，原理跟你坐飞机起降时耳朵发闷是一回事：气压越低，海拔越高。因为温度会影响气压读数，它内部还集成了一个温度传感器帮忙校正，让海拔数据更准。

| 参数 | 数值 |
| --- | --- |
| 工作电压 | 1.8 V ～ 3.6 V（接 3.3 V 即可） |
| 通信协议 | I2C（固定地址 0x77） |
| 气压量程 | 300 ～ 1100 hPa |
| 海拔精度 | 标准模式 ±1 m，高精度模式 ±0.5 m |
| 工作电流 | 待机 0.1 µA；峰值 650 µA（转换时）；1 Hz 平均 3～32 µA（随精度模式） |

选它的理由：模块便宜、Adafruit 库支持完善、精度对徒步记录完全够用。如果需要更高精度或湿度数据，可以升级到 BMP280 或 BME280，但那是另一篇文章的事了。

### GC9A01 圆形 TFT 彩屏

GC9A01 是 1.28 英寸圆形 TFT 彩屏的驱动 IC，负责接收 SPI 数据并驱动 240×240 像素的圆形显示面板，用在本项目里的作用是渲染动态山景背景和实时海拔数据。

通俗理解：想象一下智能手表的圆形表盘，就是这个东西。走 SPI 协议通信，刷新速度快，圆形设计用来做仪表盘天然合适，配上 Arduino_GFX_Library 的 Canvas 双缓冲，动画丝滑不闪烁。

| 参数 | 数值 |
| --- | --- |
| 屏幕尺寸 | 1.28 英寸（圆形） |
| 分辨率 | 240 × 240 像素 |
| 驱动 IC | GC9A01 |
| 通信接口 | SPI（最高 80 MHz） |
| 工作电压 | 3.3 V |
| 色深 | 16 位 RGB565（65536 色） |

选它的理由：圆形屏和"登山表"主题天生契合，直径刚好够把海拔大字、爬升/下降指示、进度环全部塞进去，不拥挤。

---

## BOM 表

| 元件 | 型号 / 规格 | 数量 |
| --- | --- | --- |
| 主控开发板 | ESP32-S3（推荐带 USB-C 的版本） | 1 |
| 气压传感器 | BMP180 模块（带 I2C 上拉电阻的成品模块） | 1 |
| 圆形彩屏 | GC9A01 1.28 寸 TFT，240×240 | 1 |
| 连接线 | 杜邦线（母对母） | 若干 |
| 供电 | USB-C 数据线 + 电脑 / 充电头 | 1 |

---

## 元件引脚说明

### GC9A01 引脚

| 屏幕引脚 | 功能说明 |
| --- | --- |
| VCC | 电源正极，接 3.3 V |
| GND | 电源负极 |
| SCL / CLK | SPI 时钟线 |
| SDA / MOSI | SPI 数据线（主→从） |
| CS | 片选（低电平有效） |
| DC | 数据 / 命令选择线 |
| RST | 复位（低电平触发） |
| BL | 背光控制，**高电平才亮** |

### BMP180 引脚

| 传感器引脚 | 功能说明 |
| --- | --- |
| VCC | 电源正极，接 3.3 V |
| GND | 电源负极 |
| SCL | I2C 时钟线 |
| SDA | I2C 数据线 |

---

## 接线方式

### GC9A01 → ESP32-S3

| GC9A01 引脚 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL（背光） | GPIO 7 |

### BMP180 → ESP32-S3

| BMP180 引脚 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL | GPIO 14 |
| SDA | GPIO 13 |



> **接完线建议逐一核对一遍，能省掉 80% 的排错时间。** 有两个地方特别容易踩坑：第一，BL（背光）接了 GPIO7 还不够，代码里也要配合 `digitalWrite(TFT_BL, HIGH)` 才会亮；第二，GC9A01 的 SCL/SDA 走的是 **SPI 协议**，BMP180 的 SCL/SDA 走的是 **I2C 协议**，虽然名字一样，但它们是两组完全独立的总线，引脚绝对不能混用。

---

## 需要安装的库

打开 Arduino IDE → 工具 → 管理库，搜索并安装以下三个：

| 库名称 | 作者 | 用途 |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | GC9A01 屏幕驱动 + Canvas 双缓冲渲染 |
| Adafruit BMP085 Library | Adafruit | BMP180 / BMP085 气压传感器驱动 |
| Adafruit Unified Sensor | Adafruit | 上一个库的依赖项，一起安装 |

> **测试通过版本**：Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · Arduino IDE 2.3.2 · ESP32 Arduino Core 3.0.x
> 如果你用的是旧版 ESP32 Core（1.x 系列），部分 SPI 初始化方式略有差异，建议直接升级到 3.x，省得踩坑。

---

## 完整代码

```cpp
/*
  ============================================================
  登山海拔记录仪 (Mountain Altitude Logger)
  ============================================================
  硬件：ESP32-S3 + GC9A01 圆形屏(240x240) + BMP180 气压传感器
  ============================================================
*/

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>

// ===================== 第一步：引脚与参数定义 =====================
#define TFT_CS    9    // 屏幕片选
#define TFT_DC    10   // 数据/命令选择
#define TFT_SCK   12   // SPI 时钟
#define TFT_MOSI  11   // SPI 数据（主→从）
#define TFT_RST   18   // 屏幕复位
#define TFT_BL    7    // 背光控制（高电平亮，必须拉高！）
#define TFT_MISO  -1   // 不需要 MISO（只写屏幕，不读）

#define BMP_SDA   13   // BMP180 I2C 数据线
#define BMP_SCL   14   // BMP180 I2C 时钟线

#define BTN_PIN   0    // 内置 BOOT 键，长按 2 秒清零校准
#define CALIBRATION_HOLD_MS 2000  // 长按触发阈值（毫秒）

#define FILTER_SIZE 5     // 滑动平均滤波窗口（取最近 5 个采样的均值）
#define DEAD_ZONE   0.3f  // 累计爬升/下降的死区（小于 0.3m 的抖动直接忽略）
#define ALT_RANGE_MAX 3000.0f  // 进度环满圆对应的海拔上限（3000m）

// ===================== 第二步：硬件驱动对象 =====================
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, TFT_MISO);
Arduino_GFX *gfx = new Arduino_GC9A01(bus, TFT_RST, 0 /* 旋转方向 */, true /* IPS 模式 */);
// Canvas 双缓冲：所有绘图先写到内存画布，最后 flush() 一口气推到屏幕，消除闪烁
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

Adafruit_BMP085 bmp;

// ===================== 第三步：数据结构 =====================
struct AltitudeData {
  float currentAltitude = 0;       // 当前海拔（滤波后）
  float maxAltitude = 0;           // 本次记录的最高海拔
  float totalAscent = 0;           // 累计爬升高度
  float totalDescent = 0;          // 累计下降高度
  float currentPressure = 1013.25; // 当前气压（hPa）

  // 以下是用于动画插值的「显示值」，让数字平滑过渡，不突然跳变
  float displayedAltitude = 0;
  float displayedAscent = 0;
  float displayedDescent = 0;
  float displayedPressure = 1013.25;
} data;

// 滑动平均滤波用的环形缓冲区
float altBuffer[FILTER_SIZE] = {0};
int filterIndex = 0;
int filterCount = 0;

// 颜色常量（在 setup() 里用 color565() 初始化，避免提前占用资源）
uint16_t COLOR_WHITE, COLOR_BLACK, COLOR_CREAM_GREEN;

// 按键状态
unsigned long btnPressStart = 0;
bool btnIsPressed = false;
bool calibrationTriggered = false;


// ============================================================
//                   模块一：传感器读取
// ============================================================

void initSensor() {
  Serial.print("[Sensor] 正在初始化 I2C 总线 (SDA=");
  Serial.print(BMP_SDA);
  Serial.print(", SCL=");
  Serial.print(BMP_SCL);
  Serial.println(")...");

  Wire.begin(BMP_SDA, BMP_SCL);

  Serial.println("[Sensor] 正在连接 BMP180 传感器...");
  if (!bmp.begin()) {
    // 如果程序卡在这里一直打印 ERROR，说明传感器接线有问题
    // 屏幕也不会亮，因为程序走不到下面去
    while (1) {
      Serial.println("[ERROR] BMP180 初始化失败！请检查接线、供电(3.3V)和 I2C 引脚。");
      delay(2000);
    }
  }
  Serial.println("[Sensor] BMP180 连接成功！");
}

// 从 BMP180 读一次原始气压和海拔
void sampleSensor(float &rawAltitude, float &rawPressure) {
  rawPressure = bmp.readPressure() / 100.0f;  // Pa 转 hPa
  rawAltitude = bmp.readAltitude(101325);      // 101325 Pa = 标准海平面气压
}


// ============================================================
//                   模块二：数据处理
// ============================================================

// 滑动平均滤波：把最近 FILTER_SIZE 次读数平均，减小传感器噪声
float smoothAltitude(float raw) {
  altBuffer[filterIndex] = raw;
  filterIndex = (filterIndex + 1) % FILTER_SIZE;
  if (filterCount < FILTER_SIZE) filterCount++;

  float sum = 0;
  for (int i = 0; i < filterCount; i++) sum += altBuffer[i];
  return sum / filterCount;
}

// 更新统计数据：最高海拔、累计爬升、累计下降
void updateStats(float smoothedAltitude) {
  static bool firstSample = true;
  static float lastAltitude = 0;

  if (firstSample) {
    lastAltitude = smoothedAltitude;
    data.maxAltitude = smoothedAltitude;
    firstSample = false;
  }

  float delta = smoothedAltitude - lastAltitude;
  // 只统计超过死区的变化，防止平地微小抖动让爬升数字虚涨
  if (delta > DEAD_ZONE) {
    data.totalAscent += delta;
  } else if (delta < -DEAD_ZONE) {
    data.totalDescent += -delta;
  }

  if (smoothedAltitude > data.maxAltitude) {
    data.maxAltitude = smoothedAltitude;
  }

  lastAltitude = smoothedAltitude;
  data.currentAltitude = smoothedAltitude;
}


// ============================================================
//                   模块三：按键与校准
// ============================================================

void showCalibrationFlash();  // 前向声明

// 长按 BOOT 键触发：清零爬升/下降，以当前海拔为基准重新开始
void doCalibration() {
  Serial.println("[Button] 检测到长按，正在执行海拔校准归零...");
  data.totalAscent = 0;
  data.totalDescent = 0;
  data.displayedAscent = 0;
  data.displayedDescent = 0;
  data.maxAltitude = data.currentAltitude;

  showCalibrationFlash();
  Serial.println("[Button] 校准完成。");
}

// 检测按键状态，BOOT 键低电平有效
void handleButton() {
  bool pressed = (digitalRead(BTN_PIN) == LOW);

  if (pressed && !btnIsPressed) {
    btnIsPressed = true;
    btnPressStart = millis();
    calibrationTriggered = false;
  } else if (pressed && btnIsPressed) {
    // 长按超过阈值且未触发过，执行校准
    if (!calibrationTriggered && (millis() - btnPressStart >= CALIBRATION_HOLD_MS)) {
      doCalibration();
      calibrationTriggered = true;  // 防止长按期间反复触发
    }
  } else if (!pressed && btnIsPressed) {
    btnIsPressed = false;
  }
}


// ============================================================
//                   模块四：UI 渲染
// ============================================================

// RGB565 两个颜色之间线性插值（t 从 0.0 到 1.0）
uint16_t lerpColor(uint16_t colorA, uint16_t colorB, float t) {
  t = constrain(t, 0.0, 1.0);
  uint8_t r1 = (colorA >> 11) & 0x1F, g1 = (colorA >> 5) & 0x3F, b1 = colorA & 0x1F;
  uint8_t r2 = (colorB >> 11) & 0x1F, g2 = (colorB >> 5) & 0x3F, b2 = colorB & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// 绘制渐变天空背景：低海拔偏暖棕，高海拔渐变深蓝
void drawSkyBackground(float altitudeRatio) {
  uint16_t topLow     = canvas->color565(176, 196, 210);  // 低海拔天顶：淡蓝
  uint16_t topHigh    = canvas->color565(30, 30, 90);     // 高海拔天顶：深蓝
  uint16_t bottomLow  = canvas->color565(210, 200, 180);  // 低海拔地平线：暖灰
  uint16_t bottomHigh = canvas->color565(70, 90, 140);    // 高海拔地平线：蓝灰

  uint16_t topColor    = lerpColor(topLow, topHigh, altitudeRatio);
  uint16_t bottomColor = lerpColor(bottomLow, bottomHigh, altitudeRatio);

  for (int y = 0; y < 240; y++) {
    float t = (float)y / 240.0;
    canvas->drawFastHLine(0, y, 240, lerpColor(topColor, bottomColor, t));
  }
}

// 绘制单个山峰（带雪线），greenFraction 控制雪线位置，海拔越高雪线越低
void drawSnowyPeak(int16_t apexX, int16_t apexY, int16_t baseLeftX, int16_t baseRightX,
                    int16_t baseY, uint16_t bodyColor, float greenFraction) {
  canvas->fillTriangle(apexX, apexY, baseLeftX, baseY, baseRightX, baseY, bodyColor);

  greenFraction = constrain(greenFraction, 0.05f, 0.85f);
  int16_t snowY      = apexY + (baseY - apexY) * greenFraction;
  int16_t snowLeftX  = apexX + (baseLeftX - apexX) * greenFraction;
  int16_t snowRightX = apexX + (baseRightX - apexX) * greenFraction;

  canvas->fillTriangle(apexX, apexY, snowLeftX, snowY, snowRightX, snowY, COLOR_CREAM_GREEN);
}

// 绘制三座远近错落的山峰
void drawMountains(float altitudeRatio) {
  float greenRatio = 1.0f - altitudeRatio;  // 海拔越高，植被区域越少，雪线越低

  drawSnowyPeak(60,  110, -20, 140, 240, canvas->color565(60, 75, 65),  greenRatio * 0.7);
  drawSnowyPeak(200, 130, 150, 260, 240, canvas->color565(70, 85, 75),  greenRatio * 0.6);
  drawSnowyPeak(130, 70,  40,  220, 240, canvas->color565(45, 55, 50),  greenRatio);
}

// 绘制一段圆弧（进度环的基础函数）
void drawRingArc(int16_t cx, int16_t cy, int16_t radius, int16_t thickness,
                  float startDeg, float endDeg, uint16_t color) {
  for (float deg = startDeg; deg <= endDeg; deg += 1.0) {
    float rad = deg * PI / 180.0;
    int16_t x0 = cx + cos(rad) * (radius - thickness / 2);
    int16_t y0 = cy + sin(rad) * (radius - thickness / 2);
    int16_t x1 = cx + cos(rad) * (radius + thickness / 2);
    int16_t y1 = cy + sin(rad) * (radius + thickness / 2);
    canvas->drawLine(x0, y0, x1, y1, color);
  }
}

// 绘制屏幕边缘的海拔进度环，随海拔比例点亮金色弧段
void drawProgressRing(float altitudeRatio) {
  int16_t cx = 120, cy = 120, radius = 115, thickness = 6;
  // 先画一圈灰色底环
  drawRingArc(cx, cy, radius, thickness, -90, 269, canvas->color565(50, 50, 60));
  // 再用金色覆盖已爬升的进度部分
  float endAngle = -90 + altitudeRatio * 359.0;
  drawRingArc(cx, cy, radius, thickness, -90, endAngle, canvas->color565(255, 200, 80));
}

// 绘制带黑色描边的文字，防止白字和浅色背景融在一起看不清
void drawTextWithHalo(int16_t x, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  canvas->setTextColor(haloColor);
  // 上下左右各偏移 1 像素画一遍描边
  canvas->setCursor(x - 1, y); canvas->print(text);
  canvas->setCursor(x + 1, y); canvas->print(text);
  canvas->setCursor(x, y - 1); canvas->print(text);
  canvas->setCursor(x, y + 1); canvas->print(text);

  canvas->setTextColor(textColor);
  canvas->setCursor(x, y);
  canvas->print(text);
}

// 居中绘制文字，自动根据文字宽度计算偏移
void drawCenteredText(int16_t centerX, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  int16_t x1, y1;
  uint16_t w, h;
  canvas->getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  drawTextWithHalo(centerX - w / 2, y, text, textSize, textColor, haloColor);
}

// 绘制所有数据文字叠加层
void drawDataOverlay() {
  char buf[32];

  // 屏幕中心大字：当前海拔数值
  sprintf(buf, "%d", (int)round(data.displayedAltitude));
  drawCenteredText(120, 68, buf, 4, COLOR_WHITE, COLOR_BLACK);
  drawCenteredText(120, 104, "m", 2, COLOR_WHITE, COLOR_BLACK);

  // 左侧：橙色向上三角 + 累计爬升
  int16_t ascX = 58, ascY = 138;
  canvas->fillTriangle(ascX, ascY - 8, ascX - 7, ascY + 5, ascX + 7, ascY + 5,
                       canvas->color565(255, 140, 60));
  sprintf(buf, "%dm", (int)round(data.displayedAscent));
  drawTextWithHalo(ascX + 13, ascY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // 右侧：蓝色向下三角 + 累计下降
  int16_t desX = 150, desY = 138;
  canvas->fillTriangle(desX, desY + 8, desX - 7, desY - 5, desX + 7, desY - 5,
                       canvas->color565(120, 180, 255));
  sprintf(buf, "%dm", (int)round(data.displayedDescent));
  drawTextWithHalo(desX + 13, desY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // 底部小字：实时气压
  sprintf(buf, "Press: %.1f hPa", data.displayedPressure);
  drawCenteredText(120, 162, buf, 1, COLOR_WHITE, COLOR_BLACK);
}

// 主渲染函数：按顺序画背景 → 山 → 进度环 → 数字，最后 flush 推屏
void renderUI() {
  float altitudeRatio = constrain(data.displayedAltitude / ALT_RANGE_MAX, 0.0f, 1.0f);

  drawSkyBackground(altitudeRatio);
  drawMountains(altitudeRatio);
  drawProgressRing(altitudeRatio);
  drawDataOverlay();

  canvas->flush();  // 把 Canvas 内存缓冲区一次性推送到实体屏幕
}

// 校准成功时的闪烁动画
void showCalibrationFlash() {
  for (int i = 0; i < 2; i++) {
    canvas->fillScreen(COLOR_WHITE);
    canvas->flush();
    delay(120);

    canvas->fillScreen(COLOR_BLACK);
    canvas->setTextColor(COLOR_WHITE);
    canvas->setTextSize(2);
    canvas->setCursor(48, 112);
    canvas->print("Calibrated!");
    canvas->flush();
    delay(120);
  }
  delay(300);
}


// ============================================================
//                       setup / loop
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- [System] 登山记录仪启动 ---");

  // 背光拉高，少了这步屏幕永远黑的
  Serial.println("[TFT] 配置背光引脚...");
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  pinMode(BTN_PIN, INPUT_PULLUP);  // BOOT 键内部上拉

  // 初始化屏幕驱动
  Serial.println("[TFT] 正在初始化 Canvas...");
  if (!canvas->begin()) {
    Serial.println("[ERROR] 屏幕驱动初始化失败！请确认 SPI 引脚配置。");
  } else {
    Serial.println("[TFT] 屏幕驱动初始化成功。");
  }

  COLOR_WHITE       = canvas->color565(255, 255, 255);
  COLOR_BLACK       = canvas->color565(0, 0, 0);
  COLOR_CREAM_GREEN = canvas->color565(205, 235, 195);  // 山顶雪色（淡绿白）

  canvas->fillScreen(COLOR_BLACK);
  canvas->flush();

  // 初始化传感器
  initSensor();

  // 读取开机首次数据，用于初始化所有显示值
  Serial.println("[Sensor] 正在读取开机初始数据...");
  float rawAlt, rawPress;
  sampleSensor(rawAlt, rawPress);

  Serial.print("[Sensor] 开机读数 → 气压: ");
  Serial.print(rawPress);
  Serial.print(" hPa | 海拔: ");
  Serial.print(rawAlt);
  Serial.println(" m");

  data.currentAltitude   = rawAlt;
  data.maxAltitude       = rawAlt;
  data.displayedAltitude = rawAlt;
  data.currentPressure   = rawPress;
  data.displayedPressure = rawPress;

  // 用开机海拔预填滤波缓冲区，防止启动时数值从 0 跳变到实际海拔
  for (int i = 0; i < FILTER_SIZE; i++) altBuffer[i] = rawAlt;
  filterCount = FILTER_SIZE;

  Serial.println("--- [System] 初始化完成，进入主循环 ---");
}

// 传感器采样计时器（每 1 秒采一次）
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL = 1000;

// 屏幕渲染计时器（约 33 fps）
unsigned long lastRenderTime = 0;
const unsigned long RENDER_INTERVAL = 30;

void loop() {
  handleButton();

  unsigned long now = millis();

  // --- 低频任务：每 1 秒采样一次传感器 ---
  if (now - lastSampleTime >= SAMPLE_INTERVAL) {
    lastSampleTime = now;

    float rawAltitude, rawPressure;
    sampleSensor(rawAltitude, rawPressure);

    float smoothed = smoothAltitude(rawAltitude);
    updateStats(smoothed);
    data.currentPressure = rawPressure;

    // 串口实时日志，调试时确认传感器是否正常工作
    Serial.print("[Loop] 原始: ");  Serial.print(rawAltitude);
    Serial.print("m | 滤波: ");     Serial.print(data.currentAltitude);
    Serial.print("m | 气压: ");     Serial.print(data.currentPressure);
    Serial.print(" hPa | 爬升: ");  Serial.println(data.totalAscent);
  }

  // --- 高频任务：约 33fps 渲染 UI ---
  if (now - lastRenderTime >= RENDER_INTERVAL) {
    lastRenderTime = now;

    // 指数平滑插值：让显示数字平滑追踪实际数值，0.12 系数控制追踪速度
    data.displayedAltitude += (data.currentAltitude  - data.displayedAltitude) * 0.12f;
    data.displayedAscent   += (data.totalAscent      - data.displayedAscent)   * 0.12f;
    data.displayedDescent  += (data.totalDescent     - data.displayedDescent)  * 0.12f;
    data.displayedPressure += (data.currentPressure  - data.displayedPressure) * 0.12f;

    renderUI();
  }

  delay(2);
}
```

---

## 代码说明

整段代码分成四个模块，逻辑上互不干扰：

**模块一：传感器读取** — `initSensor()` 初始化 I2C 总线并检测 BMP180 是否在线，失败就死循环打印错误，不会继续往下走（方便快速定位问题）。`sampleSensor()` 每次读出原始气压（Pa 转 hPa）和海拔（以标准海平面 101325 Pa 为基准换算）。

**模块二：数据处理** — `smoothAltitude()` 用 5 点滑动平均滤波降低传感器噪声；`updateStats()` 带 0.3 m 死区地累加爬升/下降，防止平路上的微小抖动让累计数字虚涨。

**模块三：按键与校准** — `handleButton()` 检测 BOOT 键是否长按超过 2000 毫秒，触发 `doCalibration()` 将爬升/下降清零，以当前海拔为新基准重新开始统计。`calibrationTriggered` 标志位防止一次长按期间多次触发。

**模块四：UI 渲染** — 使用 `Arduino_Canvas` 双缓冲，每帧先在内存里把背景渐变、山峰（含动态雪线）、边缘进度环、数字全部画好，最后 `canvas->flush()` 一口气推到屏幕，彻底消除逐行刷新时的闪烁感。数字用指数平滑（系数 0.12）做动画插值，变化自然不生硬。

`loop()` 里用双计时器分离"低频采样（1 秒一次）"和"高频渲染（约 33 fps）"，两者互不阻塞，整体响应很流畅。

---

## 常见问题排查

别慌，90% 的问题出在下面这几个地方：

**问题 1：屏幕完全黑屏，连背光都没有**

检查 GPIO 7 是否在 `setup()` 里执行了 `digitalWrite(TFT_BL, HIGH)`。背光不是自动亮的，代码里少了这句屏幕永远黑。同时确认 VCC 接的是 3.3 V，不是 5 V——5 V 会烧屏。

**问题 2：屏幕有背光但全白或全黑，没有画面**

打开串口监视器（115200 波特率）看有没有 `[ERROR]` 字样。如果出现 `屏幕驱动初始化失败`，说明 SPI 引脚接错了，对照接线表逐一检查 CS / DC / SCK / MOSI / RST 五根线。

**问题 3：串口一直打印 `BMP180 初始化失败`，程序卡住不亮屏**

BMP180 初始化失败会进死循环，屏幕不会亮。原因 99% 是 I2C 接线问题：SDA 接 GPIO13、SCL 接 GPIO14，供电用 3.3 V，确认模块上的上拉电阻焊好了（正规成品模块通常已焊）。

**问题 4：能正常显示，但海拔数值和实际偏差很大**

BMP180 以标准海平面气压（101325 Pa）为基准换算海拔，实际本地气压会随天气变化偏移，偏差 ±30 m 是正常范围。如果你知道当前准确海拔，可以把 `bmp.readAltitude(101325)` 的参数换成当地实测的 QNH 海平面气压值（单位 Pa，可从天气 App 获取，换算：hPa × 100 = Pa）。

**问题 5：累计爬升数字一直在涨，明明没动**

传感器噪声超过了死区（0.3 m）。可以把代码里的 `DEAD_ZONE` 改大，比如 `0.8f` 或 `1.0f`；或者把 `FILTER_SIZE` 从 5 改到 8，增加平滑效果，两种方法都能减少虚增。

**问题 6：画面刷新有闪烁感**

正常使用 Canvas 双缓冲不该闪。如果还是闪，检查 `canvas->flush()` 是否在 `renderUI()` 最后被调用，以及有没有其他地方直接操作 `gfx` 绕过了 Canvas。

---

## FAQ

**Q：GC9A01 圆形屏可以换成其他型号的方屏吗？**
A：可以。Arduino_GFX_Library 支持几十种屏幕驱动 IC（ST7789、ILI9341 等），把 `Arduino_GC9A01` 那行换成对应驱动类名，Canvas 尺寸从 240×240 改成对应分辨率，UI 代码基本不用改。

**Q：BMP180 可以换成 BMP280 或 BME280 吗？**
A：可以，但需要换库。BMP280 用 `Adafruit_BMP280` 库，BME280 用 `Adafruit_BME280` 库，`readAltitude()` 的调用方式略有差异。BMP280 精度更高，待机功耗约 2.74 µA；BME280 在此基础上还支持湿度读取，价格稍贵。

**Q：BMP180 海拔精度是多少，室内测试数字一直跳是正常的吗？**
A：BMP180 标准模式精度 ±1 m，高分辨率模式可达 ±0.5 m。室内读数跳动完全正常——开窗、关门、空调气流都会引起气压微变，进而影响海拔读数。本项目用了 5 点滑动均值 + 0.3 m 死区来抑制这种抖动，实际使用中效果已经不错了。

**Q：ESP32-S3 的 SPI（屏幕）和 I2C（传感器）可以同时使用吗？**
A：完全没问题。SPI 和 I2C 是独立的外设总线，本项目里 GC9A01 走 SPI（GPIO11/12），BMP180 走 I2C（GPIO13/14），各用各的，互不干扰。ESP32-S3 同时驱动两条总线没有任何问题。

**Q：代码里的 `Arduino_Canvas` 是什么，能不能删掉直接用 `gfx` 绘图？**
A：`Arduino_Canvas` 是 Arduino_GFX_Library 提供的双缓冲画布——所有绘图指令先写入内存里的虚拟画布，调用 `flush()` 时再一次性推到屏幕，消除逐行刷新时的闪烁感。删掉改成直接操作 `gfx` 在功能上还能跑，但画全屏渐变背景时闪烁会非常明显，体验差很多，不建议。

**Q：ESP32-S3 能用锂电池供电带着爬山吗？**
A：可以。3.7 V 锂电池 + TP4056 充放电模块 + ME6211 LDO 稳压到 3.3 V 是常见方案。本项目配置下 ESP32-S3 + GC9A01 + BMP180 综合工作电流约 80～120 mA，一块 500 mAh 电池理论续航 4～6 小时，够应付一次日间徒步。如需更长续航，可以降低屏幕背光亮度（PWM 调光 GPIO7）或拉长传感器采样间隔。

---

## 延伸玩法

做完这个版本之后，还可以继续折腾：

- **加 SD 卡记录轨迹**：每隔 10 秒把时间戳 + 海拔 + 气压写入 CSV 文件，回来导入 GPS 轨迹软件做数据分析
- **加 GPS 模块融合定位**：BMP180 会受天气影响漂移，GPS 海拔精度约 ±10 m 但更稳定，两者融合可以互补
- **接陀螺仪 MPU6050 计步**：检测步伐节奏估算步数，升级为完整的徒步数据仪
- **BLE 蓝牙推数据到手机**：用 ESP32-S3 的 BLE 把实时数据发到手机 App，配合地图显示完整轨迹

---

## 参考资料

- [BMP180 官方数据手册（Bosch Sensortec）](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp180-ds000.pdf)
- [GC9A01 驱动 IC 数据手册（Galaxycore）](http://www.galaxycore.com/file/pdf/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub 主页](https://github.com/moononournation/Arduino_GFX)
- [Adafruit BMP085 Library GitHub 主页](https://github.com/adafruit/Adafruit-BMP085-Library)
- [Espressif ESP32-S3 官方产品页](https://www.espressif.com/zh-hans/products/socs/esp32-s3)