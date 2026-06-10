---
title: "ESP32-S3 + GC9A01 圆屏指南针翻车记：HMC5883L 实验好玩，出门别靠它（完整教程）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/hmc5883l
category: esp32
date: 2026-06-10
intro: "用 ESP32-S3 + GC9A01 圆屏 + HMC5883L 做出了一个好看的电子指南针，但做完发现精度感人。本文完整记录接线、校准、代码，同时说清楚为什么这套方案只适合实验演示，不适合正式导航应用。"
image: "https://img.lingflux.com/2026/06/79dbcadeea8dba2436b055a92f76fc20.jpg"
---



# ESP32-S3 + GC9A01 + HMC5883L 圆屏指南针翻车全记录——能做、好看，但这精度你懂的（完整教程）

难度：⭐⭐⭐☆☆（有一点基础可上手）
预计时间：45 分钟
测试环境：Arduino IDE 2.3.8 · Arduino_GFX_Library v1.6.5 · Adafruit_HMC5883_U v1.2.4

---

> ⚠️ **先说结论：** 这套方案做出来的指南针看着很炫，大方向对得上，但精度典型在 ±5°~±15°，受周围磁场影响大。拿来学习驱动流程、做演示、当桌面摆件——完全够用。用于户外导航、无人机定向、任何精度要求严格的场合——**不推荐**，后面会说为什么。

> **TL;DR（快速上手）：**
> 1. 先跑 I2C 扫描确认芯片地址——`0x0D` 是 QMC5883L（仿制），`0x1E` 才是真 HMC5883L，按型号装对应的库，否则读数全是乱码
> 2. 按接线表连好 12 根线（屏 8 根 + 传感器 4 根，3.3V/GND 可共用）
> 3. 把 `DECLINATION_DEG` 改成你所在城市的磁偏角（北京约 -6.5°，东京约 -7.5°，查询链接见文末）
> 4. 上电时按住 BOOT 键（GPIO0）进入 15 秒旋转校准，水平慢转一圈
> 5. 松手后校准数据自动存入 NVS，掉电不丢，下次直接开用

---

## 前言

买这块 GC9A01 圆屏的时候，我盯着它看了一会儿——1.28 寸，240×240，完美的正圆。这不就是天生的罗盘表盘吗？

然后我花了一个周末把它做出来，打开手机一比对……好吧，指针大方向是对的，就是稍微偏了一点点，大概十来度的样子。转多2圈，发觉不转了。掉电再上电，还是不怎么转了。。。

"肯定是没校准好。" 我重新校准，换了个地方测，对着 iPhone 转圈圈——差距依然在那里，不是代码写错了，是这个传感器模块的先天局限。可以观察到手机靠近，也会影响到它。

所以这篇文章有两个目的：第一，把圆屏指南针完整做出来，代码能跑，校准能过，效果确实好看；第二，把它的精度局限讲清楚，让你在动手前就知道"翻车在哪"——而不是做完了才发现指针对不上 Google Maps。

如果你想学 GC9A01 + HMC5883L 的驱动方法，或者做一个酷炫的桌面摆件，这个项目完全值得做。如果你的目标是"导航精度"，建议直接跳到文章后面的"适不适合正式项目"那一节，再决定要不要继续。

---

## 实验效果

![111111 (1)](https://img.lingflux.com/2026/06/61587ad00164cf25e866feb4066e069f.jpg)

GC9A01 圆屏上实时显示指南针表盘：红色指针指北，中央绿色数字显示当前方位角（0°~359°），黄色字母标注最近的八方位（N / NE / E / SE / S / SW / W / NW）。上电时按住 BOOT 键进入 15 秒旋转校准模式，屏幕显示进度条和实时磁场范围；校准完成后指针运动平滑、约 25fps，不会像未校准时那样乱抖。



> **关于精度，先说清楚：** 校准过的 HMC5883L 在理想环境（远离金属和其他磁场源）下，方位角误差约 ±5°。靠近电脑主机、充电器、音箱或螺丝刀时，误差轻松涨到 ±15° 以上。日常桌面使用"大方向没错"，但是我买的这个模块不知道是不是正品，有时候是会抽风不动，精确到十位数就不要指望了。这是硬件的先天局限，不是代码的问题，后面的"适不适合正式项目"一节会详细解释。

---

## 元件说明

**GC9A01 圆形 TFT 屏**

想象一块直径 3.2 厘米的圆形手表屏——GC9A01 就是这个，SPI 接口，分辨率 240×240，驱动内置在屏幕控制器里，ESP32 直接推像素就行，不需要外置 RAM。之所以选它，一是圆形天生适合罗盘 UI，二是 Arduino_GFX_Library 有完整支持，驱动代码几行搞定。

| 参数 | 规格 |
| --- | --- |
| 分辨率 | 240 × 240 px |
| 接口 | SPI（最高 80 MHz） |
| 供电 | 3.3V |
| 背光控制 | 高电平点亮 |
| 典型功耗 | 约 20 mA（全亮） |



**GC9A01 屏幕模块（8 个引脚）**

| 引脚标注   | 功能                 |
| ---------- | -------------------- |
| VCC        | 3.3V 供电            |
| GND        | 地                   |
| SCL / CLK  | SPI 时钟             |
| SDA / MOSI | SPI 数据（主→从）    |
| CS         | 片选，低有效         |
| DC         | 数据/命令选择        |
| RST        | 硬件复位，低有效     |
| BL         | 背光控制，高电平点亮 |



**HMC5883L / QMC5883L 三轴磁力计**

磁力计是指南针的"鼻子"，负责感知地球磁场在 X/Y/Z 三个方向的强度，然后用反三角函数算出你面朝哪个方向。I2C 接口，3.3V 供电，读取一次数据只需几毫秒。

需要特别说明：市面上绝大多数标着"HMC5883L"的模块，实际芯片是 QST 公司的 QMC5883L——两者引脚兼容，但寄存器完全不同，对应的驱动库也不一样。**先别急着装库，按下文的 I2C 扫描步骤确认你手上是哪个芯片，再装对应的库，能省去大半排查时间。**

| 参数 | HMC5883L（原版） | QMC5883L（仿制） |
| --- | --- | --- |
| I2C 地址 | 0x1E | 0x0D |
| 量程 | ±8 Gauss | ±8 Gauss |
| 分辨率 | 2 mGauss | 2 mGauss |
| 噪声密度 | ~2 mGauss/√Hz | ~2 mGauss/√Hz |



**HMC5883L / QMC5883L 磁力计模块（4 个常用引脚）**

| 引脚标注 | 功能                                 |
| -------- | ------------------------------------ |
| VCC      | 3.3V 供电                            |
| GND      | 地                                   |
| SDA      | I2C 数据                             |
| SCL      | I2C 时钟                             |
| DRDY     | 数据就绪中断（本项目不用，不接也行） |

两者基础性能相近，用于实验演示都没问题。但需要说清楚的是：无论哪款芯片，这个价位的磁力计模块都没有片上温漂补偿，也没有传感器融合，只做了最基础的二维磁场测量——这决定了它的精度上限，也决定了它只适合做演示和学习，不适合实际导航应用。

---

## BOM 表

| 元件 | 型号 / 规格 | 数量 | 参考价 |
| --- | --- | --- | --- |
| 主控开发板 | ESP32-S3（任意开发板） | 1 | ¥25~40 |
| 圆形 TFT 屏 | GC9A01，1.28 寸，240×240 | 1 | ¥12~20 |
| 磁力计模块 | HMC5883L 或 QMC5883L | 1 | ¥3~8 |
| 杜邦线 | 公对母，20cm | 若干 | ¥3 |

---

## 接线方式

> 建议接完之后对着表格逐根核对一遍，这一步能省掉 80% 的"为什么没反应"排查时间。

**GC9A01 圆屏 → ESP32-S3**

| 屏幕引脚 | ESP32-S3 |
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

| 传感器引脚 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO14 |
| SCL | GPIO13 |



---

## 需要安装的库

安装前先做一件事——确认你的磁力计芯片型号。上传下面这段代码，打开串口监视器（115200），看打印的 I2C 地址：

```cpp
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(13, 14);  // SDA=13, SCL=14，和本项目一致

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

- 打印 `0x1E` → 是真 HMC5883L，装 **Adafruit HMC5883 Unified**（作者 Adafruit）
- 打印 `0x0D` → 是 QMC5883L，需要把代码里的 `#include` 和传感器对象换成对应的库（见常见问题第 3 条）

确认芯片后，打开 Arduino IDE → 库管理器，搜索安装：

| 库名 | 适用芯片 | 测试通过版本 |
| --- | --- | --- |
| Arduino_GFX_Library | — | v1.6.5 |
| Adafruit HMC5883 Unified | HMC5883L（0x1E） | v1.2.4 |
| Adafruit Unified Sensor | 两者都需要 | v1.1.15 |

如果你是 QMC5883L（0x0D），后面常见问题里有替换方案。

---

## 完整代码

```cpp
#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>
#include <Preferences.h>
#include <math.h>

// ─── 第一步：引脚定义 ────────────────────────────────
#define TFT_SCK  12
#define TFT_MOSI 11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7
#define I2C_SDA  14
#define I2C_SCL  13

// 上电时按住此键进入校准模式（BOOT 键，GPIO0，不用另外接按钮）
#define CAL_BTN   0

// 磁偏角（偏西为负）—— 查询工具：https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
// 北京 ≈ -6.5°，上海 ≈ -5.5°，广州 ≈ -3°，东京 ≈ -7.5°
// 不改这个值，指南针整体会偏 X 度，所有方向都错
#define DECLINATION_DEG  (-3.0f)

// ─── 第二步：显示对象初始化 ────────────────────────────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01  *gfx = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas 双缓冲：先在内存里画好整帧，再一次性推送到屏幕，解决闪烁问题
// 内存占用：240×240×2 = 115 KB（ESP32-S3 的 PSRAM 或内部 SRAM 均够用）
Arduino_Canvas  *canvas = new Arduino_Canvas(240, 240, gfx, 0, 0);

// ─── 传感器对象 ──────────────────────────────────
Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);

// ─── 校准参数（硬铁偏移 + 软铁缩放，存在 NVS 里）───────────────────
Preferences prefs;
float calOffX = 0, calOffY = 0;
float calSclX = 1, calSclY = 1;

// ─── EMA 低通滤波参数 ────────────────────────────
float gSmooth    = 0;
bool  gFirstRead = true;

// alpha 越小越平滑（但响应越慢）；桌面摆放用 0.15，手持移动可调到 0.25
#define EMA_ALPHA  0.15f

// ─── 颜色定义（RGB565 格式）────────────────────────────────
#define C_BG      0x0000   // 黑色背景
#define C_RING    0x4208   // 深灰外环
#define C_TICK    0x7BEF   // 灰色小刻度
#define C_MAJOR   0xFFFF   // 白色主刻度 / 标签
#define C_NORTH   0xF800   // 红色 N
#define C_NDL_N   0xF800   // 红针（北端）
#define C_NDL_S   0xCE79   // 银色针（南端）
#define C_DEG     0x07E0   // 绿色度数
#define C_DIR     0xFFE0   // 黄色方向字母

const char* kDir[] = {"N","NE","E","SE","S","SW","W","NW"};

#define CX 120   // 圆心 X
#define CY 120   // 圆心 Y
#define R  100   // 表盘半径

// ─────────────────────────────────────────────
//  读取方位角（含硬铁/软铁校准修正）
// ─────────────────────────────────────────────
float readHeading() {
  sensors_event_t ev;
  mag.getEvent(&ev);

  // 减去硬铁偏移，消除周围固定磁场（螺丝、铜柱等）的干扰
  float x = ev.magnetic.x - calOffX;
  float y = ev.magnetic.y - calOffY;
  // 软铁归一化：把椭圆形的磁场响应映射回圆形
  if (calSclX > 0.01f) x /= calSclX;
  if (calSclY > 0.01f) y /= calSclY;

  float h = atan2f(y, x) + DECLINATION_DEG * (float)M_PI / 180.0f;
  if (h <  0)               h += 2.0f * (float)M_PI;
  if (h > 2.0f*(float)M_PI) h -= 2.0f * (float)M_PI;
  return h * 180.0f / (float)M_PI;
}

// ─────────────────────────────────────────────
//  EMA 低通滤波（正确处理 0°/360° 环绕跳变）
// ─────────────────────────────────────────────
float emaFilter(float newAngle) {
  if (gFirstRead) { gFirstRead = false; return newAngle; }
  float d = newAngle - gSmooth;
  if (d >  180.0f) d -= 360.0f;   // 比如从 359° 跳到 1°，差值应该是 +2°，而不是 -358°
  if (d < -180.0f) d += 360.0f;
  float r = gSmooth + d * EMA_ALPHA;
  if (r <   0.0f) r += 360.0f;
  if (r >= 360.0f) r -= 360.0f;
  return r;
}

// ─────────────────────────────────────────────
//  全帧渲染（画完整帧再推屏，杜绝闪烁）
// ─────────────────────────────────────────────
void drawFrame(float angle) {
  canvas->fillScreen(C_BG);

  // 外环（4 像素宽，给表盘加一个边框感）
  for (int r = R; r > R - 4; r--)
    canvas->drawCircle(CX, CY, r, C_RING);

  // 刻度线：每 10° 一根，每 30° 加长，每 90° 用白色
  for (int deg = 0; deg < 360; deg += 10) {
    float rad = deg * (float)M_PI / 180.0f;
    int   len = (deg % 30 == 0) ? 12 : 6;
    canvas->drawLine(
      CX + (int)(cosf(rad) * (R - 5)),    CY + (int)(sinf(rad) * (R - 5)),
      CX + (int)(cosf(rad) * (R-5-len)),  CY + (int)(sinf(rad) * (R-5-len)),
      (deg % 90 == 0) ? C_MAJOR : C_TICK
    );
  }

  // N/E/S/W 标签，N 用红色醒目
  canvas->setTextSize(2);
  canvas->setTextColor(C_NORTH); canvas->setCursor(CX-6,    CY-R+20);  canvas->print("N");
  canvas->setTextColor(C_MAJOR); canvas->setCursor(CX+R-32, CY-7);     canvas->print("E");
                                 canvas->setCursor(CX-6,    CY+R-32);  canvas->print("S");
                                 canvas->setCursor(CX-R+20, CY-7);     canvas->print("W");

  // 指针（3 像素宽，视觉更清晰）
  float rad  = angle * (float)M_PI / 180.0f;
  float perp = rad + (float)M_PI / 2.0f;
  int   pdx  = (int)roundf(cosf(perp));
  int   pdy  = (int)roundf(sinf(perp));
  int   nx   = CX + (int)(sinf(rad) * 68);   // 红针（指北端）
  int   ny   = CY - (int)(cosf(rad) * 68);
  int   sx   = CX - (int)(sinf(rad) * 42);   // 银针（指南端，短一点）
  int   sy   = CY + (int)(cosf(rad) * 42);
  for (int d = -1; d <= 1; d++) {
    canvas->drawLine(CX+pdx*d, CY+pdy*d, nx+pdx*d, ny+pdy*d, C_NDL_N);
    canvas->drawLine(CX+pdx*d, CY+pdy*d, sx+pdx*d, sy+pdy*d, C_NDL_S);
  }

  // 中心轴小圆（装饰用）
  canvas->fillCircle(CX, CY, 9, C_RING);
  canvas->drawCircle(CX, CY, 9, 0xA534);
  canvas->fillCircle(CX, CY, 3, C_MAJOR);

  // 中央显示度数（绿色）和八方位字母（黄色）
  canvas->setTextSize(2);
  canvas->setTextColor(C_DEG);
  char buf[8]; sprintf(buf, "%3d", (int)angle);
  canvas->setCursor(CX - 18, CY - 14); canvas->print(buf);

  int   idx = ((int)(angle + 22.5f) % 360) / 45;
  int   w   = strlen(kDir[idx]) * 6;
  canvas->setTextSize(1);
  canvas->setTextColor(C_DIR);
  canvas->setCursor(CX - w/2, CY + 6); canvas->print(kDir[idx]);

  canvas->flush();   // ← 整帧一次性推送到屏幕，这一行是解决闪烁的关键
}

// ─────────────────────────────────────────────
//  15 秒旋转校准
//  原理：记录传感器在各方向的最大/最小值，
//       算出硬铁偏移（offset）和软铁缩放（scale）
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

    // 实时显示校准进度画面
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR);  canvas->setTextSize(2);
    canvas->setCursor(15, 60);  canvas->print("CALIBRATING");
    canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
    canvas->setCursor(8, 95);   canvas->print("Slowly rotate 360 deg");
    canvas->setCursor(18, 109); canvas->print("Keep device level");
    // 进度条
    int p = (millis() - t0) * (R*2-2) / DUR;
    canvas->drawRect(20, 130, R*2, 14, C_MAJOR);
    canvas->fillRect(21, 131, p, 12, 0x07E0);
    // 实时显示磁场范围（帮助确认是否转满了一圈）
    char b[44];
    canvas->setTextColor(0x7BEF);
    sprintf(b, "X[%.1f ~ %.1f]", minX, maxX);
    canvas->setCursor(8, 157); canvas->print(b);
    sprintf(b, "Y[%.1f ~ %.1f]", minY, maxY);
    canvas->setCursor(8, 170); canvas->print(b);
    canvas->flush();
    delay(50);
  }

  // 计算偏移和缩放
  calOffX = (maxX + minX) / 2.0f;
  calOffY = (maxY + minY) / 2.0f;
  calSclX = (maxX - minX) / 2.0f;  if (calSclX < 0.01f) calSclX = 1.0f;
  calSclY = (maxY - minY) / 2.0f;  if (calSclY < 0.01f) calSclY = 1.0f;

  // 保存到 NVS（掉电不丢）
  prefs.begin("compass", false);
  prefs.putFloat("offX", calOffX);  prefs.putFloat("offY", calOffY);
  prefs.putFloat("sclX", calSclX);  prefs.putFloat("sclY", calSclY);
  prefs.end();

  // 校准结果画面
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
//  从 NVS 加载上次保存的校准数据
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
  pinMode(TFT_BL, OUTPUT); digitalWrite(TFT_BL, HIGH);  // 背光点亮
  pinMode(CAL_BTN, INPUT_PULLUP);

  gfx->begin();
  canvas->begin();       // 分配帧缓冲，此时消耗约 115 KB 内存

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000); // 400 kHz 快速模式，降低 I2C 读取延迟

  if (!mag.begin()) {
    // 传感器找不到时，屏幕显示红色错误提示
    canvas->fillScreen(0xF800);
    canvas->setTextColor(0xFFFF); canvas->setTextSize(2);
    canvas->setCursor(10, 100); canvas->print("SENSOR ERROR");
    canvas->setCursor(10, 125); canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(500);
  }

  loadCalibration();

  // 上电时按住 BOOT(GPIO0) → 进入旋转校准
  if (digitalRead(CAL_BTN) == LOW) {
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR); canvas->setTextSize(1);
    canvas->setCursor(10, 112); canvas->print("Release to start cal...");
    canvas->flush();
    while (digitalRead(CAL_BTN) == LOW) delay(10);
    delay(500);
    runCalibration();
  }

  // 丢弃前几个不稳定的热机读数
  for (int i = 0; i < 8; i++) {
    sensors_event_t ev; mag.getEvent(&ev); delay(15);
  }
  gSmooth    = readHeading();
  gFirstRead = false;
}

// ─────────────────────────────────────────────
//  Loop：读数 → 滤波 → 渲染，循环约 25fps
// ─────────────────────────────────────────────
void loop() {
  float raw = readHeading();
  gSmooth   = emaFilter(raw);
  drawFrame(gSmooth);
  delay(30);  // 30ms ≈ 33fps，实际加上渲染时间约 25fps
}
```

### 代码说明

**为什么要用 Canvas？** `Arduino_Canvas` 相当于在内存里开了一块 115KB 的"草稿纸"，先把整帧画完，再用 `canvas->flush()` 一次性推到屏幕。如果直接往屏幕上画，每一笔都会立刻显示，指针转动时会明显闪烁。Canvas 解决了这个问题，代价是多占一块内存。

**`readHeading()` 做了什么？** 从传感器拿到的 X/Y 磁场强度，减去硬铁偏移（消除固定磁场干扰），再除以软铁缩放系数（修正各轴灵敏度不一致），最后加上磁偏角修正，得到真北方向的角度。

**`emaFilter()` 为什么要处理环绕？** 如果指针从 359° 转到 1°，两个读数之差是 -358°，如果直接做加权平均，指针会反方向转一大圈。代码里先把差值限制在 [-180°, +180°] 范围内，再做平滑，就能正确处理跨越 0° 的情况。

**校准原理是什么？** 在水平面内转一圈，传感器的 X/Y 读数会描绘出一个椭圆（理想情况是圆）。记录最大最小值，中点就是硬铁偏移，半径就是软铁缩放系数。校准完成后，数据存入 NVS（类似手机里的 EEPROM），下次上电自动加载，不需要每次重新校准。

---

## 常见问题排查

别慌，90% 的问题出在这几个地方。

**屏幕全黑或全白，什么都不显示。** 先检查 BL（背光）引脚是否高电平——如果接的是 GPIO7，确认代码里有 `digitalWrite(TFT_BL, HIGH)`；如果直接接 3.3V，背光应该一直亮，黑屏说明别的引脚有问题。再对照接线表逐根确认 CS、DC、RST 是否接到了正确的 GPIO，其中 CS 和 DC 接反是高频失误。

**串口打印 `SENSOR ERROR`，屏幕显示红色报错。** 磁力计没响应，大概率是 I2C 接线问题——SDA/SCL 接反了，或者接到了不同的 GPIO。确认 `Wire.begin(13, 14)` 对应的是你实际接的引脚。另一个可能是模块没有 3.3V 供电，用万用表量一下 VCC 脚。

**指针乱跳，完全不准，或者一直停在某个方向不动。** 最可能的原因是你的模块是 QMC5883L（0x0D），但代码用的是 HMC5883L 的库——两个库寄存器定义完全不同，读出来的数就是乱的。先跑 I2C 扫描确认地址，如果是 0x0D，需要把代码里的 `#include <Adafruit_HMC5883_U.h>` 和传感器对象换成 QMC5883LCompass 库的写法，网上有现成的适配示例。

**校准完了，但指向还是偏了 10°~20°。** 检查 `DECLINATION_DEG` 有没有改成你所在城市的值，这个参数差了 5° 就会让所有方向都系统性偏移。东京约 -7.5°，北京约 -6.5°，准确值用文末的 NOAA 工具查询。另一个原因是校准时周围有强磁场（手机、螺丝刀、音箱磁铁），换个空旷的地方重新校准一次。

**编译报错 `Adafruit_HMC5883_U.h: No such file or directory`。** 库没装或者装错了。打开 Arduino IDE → 工具 → 管理库，搜索 `HMC5883`，安装 Adafruit HMC5883 Unified 以及它依赖的 Adafruit Unified Sensor。

---

## FAQ 问答

**Q：HMC5883L 和 QMC5883L 有什么区别？能用同一个库驱动吗？**
A：不能混用。两者引脚完全兼容（焊上去外形一样），但内部寄存器地址不同，驱动协议不同，用错库读出来全是无意义的数值。HMC5883L 的 I2C 地址是 0x1E，QMC5883L 是 0x0D，用 I2C 扫描一秒钟就能确认。

**Q：BL 背光引脚能直接接 3.3V 吗，还是必须接 GPIO？**
A：直接接 3.3V 完全可以，屏幕会全程常亮。用 GPIO 控制的好处是可以在代码里控制亮度或者休眠时关掉背光省电。如果不需要这些功能，接 3.3V 省一个 GPIO。

**Q：`DECLINATION_DEG` 怎么查我城市的准确值？**
A：用 NOAA 提供的磁偏角计算工具（见文末参考资料），输入你的城市坐标，Model 选 WMM，会给出当前日期的精确磁偏角。偏东为正值，偏西为负值。日本东部城市普遍在 -7° 到 -8° 之间，中国东部沿海约 -5° 到 -6°。

**Q：`EMA_ALPHA` 调大或调小有什么区别？**
A：alpha 越大，指针响应越快，但越容易抖动；越小，指针越平滑，但转动时有明显的拖尾感。0.15 适合平放在桌面的场景；如果是手持走动，可以调到 0.25 ~ 0.3。取值范围是 0.0（完全不动）到 1.0（不滤波，原始值）。

**Q：校准数据存在哪？换了电脑重新烧录代码后还在吗？**
A：校准数据存在 ESP32 的 NVS（非易失性存储，类似 EEPROM），烧录新代码不会清除 NVS，下次上电直接加载。只有执行"擦除所有 Flash"操作时才会丢失，届时需要重新校准一次。

**Q：115 KB 的帧缓冲会不会太大？ESP32-C3 能用吗？**
A：ESP32-S3 有 512KB SRAM，115KB 没问题。ESP32-C3 只有 400KB SRAM，加上代码和堆栈，实测会比较紧张，建议用 PSRAM 版本或者改用更小尺寸的屏幕。原版 ESP32（WROOM / WROVER）的 SRAM 更少，WROVER 版带 PSRAM 的可以用，WROOM 无 PSRAM 版大概率 OOM 崩溃。

**Q：为什么我的指南针和手机差了十几度，是正常的吗？**
A：在这套方案里，差十几度是完全正常的现象，不是 bug。HMC5883L/QMC5883L 在有干扰的真实环境里，±10°~±15° 是常见误差范围。如果误差稳定在 ±5° 以内，已经算校准得不错了。想让误差更小，需要换精度更高的传感器并引入九轴融合，单靠调参数不够。

**Q：能不能用这套方案做正式的导航或定向产品？**
A：不推荐。精度只有 ±5°~±15°，受周围磁场环境影响大，也没有倾斜补偿——只要不是严格水平放置，误差就会明显增大。做演示、学习原理、当桌面摆件完全够用；需要实际导航精度的场合，建议换 ICM-20948 这类带硬件传感器融合的方案。

---

## HMC5883L 适不适合正式项目？

直接说结论：不适合。

实验演示没问题，学习驱动流程、展示 maker 项目、桌面摆件——都可以。但如果你在做一个真正需要方向感知的产品，这套方案有三个绕不过去的问题：

第一，没有倾斜补偿。模块一旦不是水平放置，方位角误差就快速增加——歪 20° 能带来超过 10° 的方向偏差。iPhone 用加速度计实时补偿这个误差，这块模块本身做不到，需要额外接 MPU6050 并修改算法。

第二，受环境磁场影响严重。旁边的电脑电源、USB 线、金属支架都会污染读数，而且这种干扰是动态的，校准一次存入 NVS 并不能补偿运动中实时变化的磁场。

第三，市售模块质量参差不齐。大多数是 QMC5883L 仿制版，没有原版 HMC5883L 的片上温漂补偿，温度变化时读数会飘。

如果你的项目需要可靠的方向感知，更合适的选择是 ICM-20948（集成九轴传感器 + 硬件 DMP 融合），或者直接用 GPS 模块结合两点坐标计算朝向——精度和稳定性不是一个量级。

这个项目的正确定位是：麻雀虽小五脏俱全的学习样本。它让你完整走一遍"磁力计驱动 → 硬铁校准 → 滤波 → 显示"的完整链路，这套知识用到更好的传感器上完全通用。

---

## 延伸玩法

做完基础款，有几个方向可以接着探索：

加一块 MPU6050 六轴传感器，读取加速度计数据做倾斜补偿。这是上面提到的最大局限之一——现在这个版本只有 2D 磁场，设备稍微歪一点就会产生明显误差；加上倾斜补偿后竖着拿也能保持准确，这也是 iPhone 指南针稳定的核心原因之一。这是让这个项目"从玩具升级到可用"最值得做的一步。

接一块 SD 卡模块，用 LVGL 或者自己画的地图叠加指南针方向，做一个离线导航仪。圆屏的显示面积有限，但显示当前朝向和目标方向的箭头完全够用。

把方位角数据通过 Wi-Fi 推送到 MQTT broker，接入 Home Assistant 或者自己的 dashboard，做成一个桌面方向感知传感器，用于判断门窗朝向或天线对准。

---

## 参考资料

- HMC5883L 原厂数据手册（Honeywell）：https://cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf
- QMC5883L 数据手册（QST）：https://datasheetspdf.com/pdf/1309218/QST/QMC5883L/1
- Arduino_GFX_Library GitHub：https://github.com/moononournation/Arduino_GFX
- Adafruit_HMC5883_U GitHub：https://github.com/adafruit/Adafruit_HMC5883_U
- ESP32-S3 产品页（Espressif）：https://www.espressif.com/en/products/socs/esp32-s3
- 磁偏角查询工具（NOAA）：https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
