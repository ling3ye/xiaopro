---
title: "DHT11 + GC9A01 圆屏打造 Game Boy 像素复古风温湿度计｜ESP32-S3 SPI 接线 + Arduino 完整代码"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/dht11
category: esp32
date: 2026-06-18
intro: "用 ESP32-S3 驱动 GC9A01 240×240 圆屏配合 DHT11 传感器，复刻 Game Boy DMG 经典奶油绿四阶配色，做一个会闪烁告警的像素复古桌面温湿度计。附完整接线表、Arduino 库安装和全注释代码，新手友好。"
image: "https://img.lingflux.com/2026/06/4d154493c9e833bc839cec1050f749f6.jpg"
---

# DHT11 + GC9A01 圆屏打造 Game Boy 像素复古风温湿度计（完整教程）（ESP32-S3 · SPI 接线 · Arduino 代码）

---

## TL;DR · 三分钟速览

> 没时间看长文？核心步骤在这里，有基础的同学照着飞：
>
> 1. **接线**：DHT11 数据引脚 → GPIO 47；GC9A01 圆屏 SPI 接线：SCK→GPIO12，MOSI→GPIO11，CS→GPIO9，DC→GPIO10，RST→GPIO18，BL→GPIO7
> 2. **安装两个库**：Arduino IDE 搜索安装 `Arduino_GFX_Library`（Moon On Our Nation）和 `DHT sensor library`（Adafruit）
> 3. **粘贴文末完整代码**，Arduino IDE 选择开发板 `ESP32S3 Dev Module`
> 4. **编译上传**，等待约 30 秒烧录完成
> 5. **上电验证**：圆屏亮起奶油绿底色，上半区显示温度（°C），下半区显示湿度（%），极端值自动闪烁告警 ✅

---

## 前言：一块会"玩"的温湿度计

说实话，我用过不少显示温湿度的方案——大 OLED 屏、小数码管、甚至串口打印……每次看到屏幕上孤零零的几个数字，心里都有种说不出的空虚感。又不是不能用，就是少了那么点**灵魂**。

直到有一天翻出了小时候的 Game Boy，那块经典的奶油黄绿屏突然给了我灵感：**同样是显示数字，为什么不整得复古一点、好玩一点？**

于是就有了这个项目——用 ESP32-S3 驱动一块 GC9A01 圆形 LCD，配上 DHT11 温湿度传感器，全程手写像素字体，把 Game Boy DMG 那套标志性的四阶绿色调搬到圆屏上，做一个摆在桌上就让人忍不住多看两眼的**像素复古温湿度计**。

没有现成 UI 库，没有复杂框架，全靠 `fillRect()` 一个格一个格地"堆"出像素数字——这种笨方法反而最有感觉。

**本文目标**：零基础也能跟着走完整个流程，最终在 GC9A01 圆屏上看到实时温湿度，并且显示效果要足够骚气。

---

## 实验效果

![](https://img.lingflux.com/2026/06/755f0087c027a35770edb0fd87a81a35.jpg)

最终效果一句话描述：**240×240 圆屏，奶油绿底色，像素大号温湿度数值居中显示，数值变化有缓动过渡，超限自动闪烁报警，帧率约 30fps，无任何撕裂闪烁**。

---

## 元件说明

在买零件之前，先认识一下今天的三位主角。

### ESP32-S3 · 这个项目里唯一有脑子的部分

ESP32-S3 是乐鑫出的 Wi-Fi + 蓝牙双模芯片，但今天我们用的不是它的网络能力，而是它**充裕的 GPIO、充足的内存和足够快的 SPI 总线**。

> 类比理解：如果 GC9A01 圆屏是一台电视机，ESP32-S3 就是那个往电视里塞节目信号的机顶盒——所有的"内容"都从它出发，屏幕只负责"播放"。

关键参数：
- 主频 240 MHz（双核 Xtensa LX7）
- 内存 512 KB SRAM，另有 PSRAM 可选
- 支持硬件 SPI，最高可跑 80 MHz
- 3.3V 工作电压，GPIO 耐压 3.3V（⚠️ 切勿接 5V 信号）

---

### GC9A01 圆屏 · 像素复古感的来源

GC9A01 是一块分辨率 **240×240** 的圆形 IPS LCD 驱动芯片，通常做成直径约 1.28 英寸的小圆屏模块，接口是标准 4 线 SPI。

> 类比理解：你见过那种老式机械手表表盘吗？GC9A01 就是把那块表盘换成了可以编程显示任何内容的彩色小屏——圆的，就是这么优雅。

关键参数：
- 分辨率：240 × 240 像素，圆形可视区
- 接口：4 线 SPI（支持最高 80 MHz 时钟）
- 色深：16 位 RGB565（65536 色）
- 工作电压：3.3V（VCC 和逻辑电平均为 3.3V，**不要接 5V！**）
- 背光：独立引脚控制（BL），高电平点亮

---

### DHT11 · 多管闲事的小邻居

DHT11 是一款集温度 + 湿度于一体的低成本数字传感器，一根数据线就能把两个数据传回来，用起来异常省事。

> 类比理解：DHT11 就像一个住在你房间里、时刻盯着你汇报"现在多少度、空气多不多水"的小邻居，虽然精度一般，但够用，还安静。

关键参数：
- 温度范围：0 ~ 50°C，精度 ±2°C
- 湿度范围：20% ~ 90% RH，精度 ±5% RH
- 采样间隔：最短 1 秒（代码里设为每 2 秒读一次）
- 数据接口：单总线数字协议（1-Wire 变种）
- 工作电压：3.3V 或 5V 均可（本项目接 3.3V）

---

## BOM 表（物料清单）

| 元件 | 型号 / 规格 | 数量 | 备注 |
| :--- | :--- | :---: | :--- |
| 主控开发板 | ESP32-S3 Dev Module | 1 | 确认板载 USB-C 烧录口 |
| 圆形彩屏 | GC9A01 · 1.28 寸 · 240×240 SPI | 1 | 购买时选带 BL 引脚版本 |
| 温湿度传感器 | DHT11 模块（带上拉电阻的模块版） | 1 | 建议买模块版，省去外接电阻 |
| 跳线 | 杜邦线（公对公 / 公对母） | 若干 | 两种都备一些 |

---

## 接线方式

### DHT11 → ESP32-S3

| DHT11 引脚 | ESP32-S3 引脚 | 说明 |
| :--- | :--- | :--- |
| GND | GND | 共地 |
| VCC | 3V3 | 传感器供电（3.3V） |
| DAT（DATA） | GPIO 47 | 数据总线 |

### GC9A01 圆屏 → ESP32-S3

| GC9A01 引脚 | ESP32-S3 引脚 | 说明 |
| :--- | :--- | :--- |
| VCC | 3.3V | 屏幕主供电（⚠️ 务必接 3.3V，不是 5V） |
| GND | GND | 共地 |
| SCL / CLK | GPIO 12 | SPI 时钟线 |
| SDA / MOSI | GPIO 11 | SPI 数据线 |
| CS | GPIO 9 | 片选信号（低电平有效） |
| DC | GPIO 10 | 数据/命令切换 |
| RST | GPIO 18 | 硬件复位 |
| BL | GPIO 7 | 背光控制（可能没有这个引脚，代码里拉高常亮；也可直接接 3.3V） |

> 💡 **实用提醒**：接线完成后不要急着上电——逐行对着上表核对一遍，重点确认 VCC 接的是 **3.3V 而不是 5V**（GC9A01 接 5V 基本报废），以及 DHT11 的 DAT 有没有接对 GPIO。踩过这个坑的人都懂那种"通电然后屏幕再也不亮"的绝望。



---

## 安装所需库

打开 Arduino IDE，进入 **工具 → 管理库**，搜索并安装以下两个库：

**1. Arduino_GFX_Library**

- 搜索关键词：`Arduino_GFX`
- 作者：`Moon On Our Nation`
- 作用：负责驱动 GC9A01 圆屏，包含双缓冲 Canvas 功能（消除画面闪烁的关键）

**2. DHT sensor library**

- 搜索关键词：`DHT sensor library`
- 作者：`Adafruit`
- 安装时弹出"是否安装依赖"，选 **Install all**（顺手把 Adafruit Unified Sensor 一起装上）

> 安装完成后，建议重启 Arduino IDE，确保库文件被正确加载。

---

## 完整代码

代码结构说明：
- **初始化阶段**：点亮背光 → 初始化屏幕 → 读取 DHT11 首次数据
- **主循环**：每 2 秒读传感器，每 33ms（约 30fps）渲染一帧
- **渲染机制**：先画到内存 Canvas，再一次性 flush 到屏幕，杜绝撕裂和闪烁
- **像素字体**：5×7 用于标签文字，5×9 用于大号数值，全部手工 `fillRect()` 逐格绘制
- **告警动画**：温度超过 35°C 或低于 5°C、湿度超过 85% 或低于 20% 时，数字以 400ms 间隔闪烁

```cpp
/**
 * ╔══════════════════════════════════════════════════╗
 * ║   ESP32-S3 圆形温湿度计 · GAME BOY 像素怀旧版     ║
 * ║   硬件：ESP32-S3 + GC9A01(240×240) + DHT11       ║
 * ║   库  ：Arduino_GFX_Library + DHT(Adafruit)      ║
 * ╚══════════════════════════════════════════════════╝
 *
 * 配色方案 —— Game Boy DMG 经典四阶绿：
 *   PAL_BG      #CADC9F  奶油黄绿（背景底色，怀旧感来源）
 *   PAL_LITE    #9BBC0F  最亮绿  （高光装饰）
 *   PAL_MID     #8BAC0F  亮绿    （装饰圆点）
 *   PAL_DARK    #306230  中绿    （标签文字 / 分隔线）
 *   PAL_DARKEST #0F380F  墨绿    （主数字 / 外框，最高对比度）
 *
 * 告警逻辑（单色机经典手法）：
 *   温度 >35°C 或 <5°C → 数字以 400ms 间隔闪烁
 *   湿度 >85% 或 <20%  → 同上
 */

#include <Arduino_GFX_Library.h>
#include <DHT.h>

// ══════════════════════════════════════════
// 步骤 1：引脚定义
//   修改这里的数字就能换引脚，其他地方不用动
// ══════════════════════════════════════════
#define DHTPIN    47      // DHT11 数据引脚
#define DHTTYPE   DHT11

#define TFT_SCK   12     // GC9A01 SPI 时钟
#define TFT_MOSI  11     // GC9A01 SPI 数据
#define TFT_CS    9      // GC9A01 片选
#define TFT_DC    10     // GC9A01 数据/命令
#define TFT_RST   18     // GC9A01 硬件复位
#define TFT_BL    7      // GC9A01 背光（HIGH = 点亮）

// ══════════════════════════════════════════
// 步骤 2：Game Boy (DMG) 四阶绿调色板
//   颜色格式：RGB565（16位）
//   不用在这里改颜色，改了就不是 Game Boy 风了 :)
// ══════════════════════════════════════════
#define PAL_BG       0xCF69   // 奶油黄绿 —— 背景底色
#define PAL_LITE     0x9DC2   // 最亮绿   —— 高光装饰（暂未大量使用）
#define PAL_MID      0x8D42   // 亮绿     —— 顶栏闪烁圆点
#define PAL_DARK     0x3306   // 中绿     —— 标签/分隔线
#define PAL_DARKEST  0x11C2   // 墨绿     —— 主数字/外框

// ══════════════════════════════════════════
// 步骤 3：屏幕常量和字体缩放比
// ══════════════════════════════════════════
#define CX  120        // 圆心 X（屏幕正中）
#define CY  120        // 圆心 Y（屏幕正中）

#define BOLD_SCALE  6  // 大号数字放大倍数（5×9 字形 × 6 = 30×54 像素）
#define DOT_INSET   1  // 每个像素格内缩 1px，露出背景色缝隙，呈现点阵网格感
#define UNIT_SCALE  2  // 单位（°C / %）字号
#define LBL_SCALE   2  // 标签（TEMP / HUM）字号

// ══════════════════════════════════════════
// 步骤 4：初始化硬件对象
// ══════════════════════════════════════════
DHT dht(DHTPIN, DHTTYPE);

// 硬件 SPI 总线
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, GFX_NOT_DEFINED);

// GC9A01 驱动（最后一个参数 true = 不旋转，颜色反相关）
Arduino_GFX *display = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas 双缓冲：先在内存里画完整帧，flush() 一次性推给屏幕
//   这是消除闪烁的核心手段，类似游戏引擎的离屏渲染
Arduino_GFX *gfx = new Arduino_Canvas(240, 240, display);

// ══════════════════════════════════════════
// 全局状态变量
// ══════════════════════════════════════════
float g_temp = 0, g_hum = 0;          // 传感器真实读数
float g_dispTemp = 0, g_dispHum = 0;  // 屏幕显示值（带缓动过渡，避免数字跳变）
bool  g_hasData = false;              // 是否已拿到至少一次有效数据

// ══════════════════════════════════════════
// 函数原型声明（告诉编译器"下面有这些函数"）
// ══════════════════════════════════════════
const uint8_t* glyph(char ch);
int16_t  pixelAdvance(char ch, uint8_t scale);
int16_t  pixelTextWidth(const char *s, uint8_t scale);
void     drawPixelText(const char *s, int16_t x, int16_t y,
                       uint8_t scale, uint16_t c);
void     drawCenteredPixel(const char *s, int16_t y,
                           uint8_t scale, uint16_t c);
const uint8_t* boldGlyph(char ch);
int16_t  boldAdvance(char ch, uint8_t scale);
int16_t  boldTextWidth(const char *s, uint8_t scale);
void     drawBoldText(const char *s, int16_t x, int16_t y,
                      uint8_t scale, uint16_t c);
void     drawBezel();
void     drawTopBar(unsigned long t);
void     drawValue(const char *num, const char *unit,
                   int16_t yTop, uint16_t col);
void     drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c);
uint16_t tempColor(unsigned long t);
uint16_t humColor(unsigned long t);
void     drawScene(unsigned long t);

// ══════════════════════════════════════════
// setup() —— 上电只跑一次
// ══════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=============================");
  Serial.println("  GAME BOY 像素温湿度计");
  Serial.println("=============================");

  // 1. 点亮背光
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 2. 初始化屏幕
  if (!gfx->begin()) {
    Serial.println("[ERROR] 屏幕初始化失败！检查接线后重新上电。");
    while (true) delay(500);   // 卡死在这里，防止后续乱跑
  }
  gfx->fillScreen(PAL_BG);
  gfx->flush();
  Serial.println("[OK] 屏幕初始化完成");

  // 3. 初始化 DHT11，等待 2 秒让传感器稳定后读一次初始值
  dht.begin();
  Serial.println("[OK] DHT11 初始化完成，读取中...");
  delay(2000);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    g_temp = g_dispTemp = t;
    g_hum  = g_dispHum  = h;
    g_hasData = true;
    Serial.printf("[DATA] 初始读数 T=%.1f°C  H=%.1f%%\n", t, h);
  } else {
    Serial.println("[WARN] 初始读取失败，屏幕显示 --.- 等待下一次有效读数");
  }
}

// ══════════════════════════════════════════
// loop() —— 每 2 秒读传感器，每 33ms 渲染一帧（约 30fps）
// ══════════════════════════════════════════
unsigned long lastRead  = 0;
unsigned long lastFrame = 0;

void loop() {
  unsigned long now = millis();

  // 每 2 秒读一次传感器（DHT11 采样间隔最短 1 秒，2 秒更稳）
  if (now - lastRead >= 2000) {
    lastRead = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      g_temp = t;
      g_hum  = h;
      g_hasData = true;
      Serial.printf("[DATA] T=%.1f°C  H=%.1f%%\n", t, h);
    } else {
      // 读取失败不更新数值，继续显示上一次有效读数
      Serial.println("[WARN] DHT11 读取失败，保持上次数值");
    }
  }

  // 显示值用 8% 缓动追踪真实值（每帧慢慢靠近）
  //   类比：就像老式表盘的指针，不会瞬间跳到新位置
  g_dispTemp += (g_temp - g_dispTemp) * 0.08f;
  g_dispHum  += (g_hum  - g_dispHum)  * 0.08f;

  // 约 30fps 渲染（33ms 一帧）
  if (now - lastFrame >= 33) {
    lastFrame = now;
    drawScene(now);
    gfx->flush();    // 把内存 Canvas 一次性推到实体屏幕
  }
}

// ══════════════════════════════════════════
// drawScene() —— 渲染一帧的全部内容
//   绘制顺序：背景底色 → 圆形外框 → 顶栏 → 温度区 → 分隔线 → 湿度区
// ══════════════════════════════════════════
void drawScene(unsigned long t) {
  // 1. 清屏（奶油绿底色）
  gfx->fillScreen(PAL_BG);

  // 2. 画圆形边框和装饰点
  drawBezel();

  // 3. 画顶栏（标题 + 运行指示灯）
  drawTopBar(t);

  // 4. 温度区
  char num[8];
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispTemp);
  else           strcpy(num, "--.-");       // 无数据时显示占位符

  drawCenteredPixel("TEMP", 44, LBL_SCALE, PAL_DARK);
  drawValue(num, "*C", 62, tempColor(t));   // '*' 在本字体里映射为度数圆圈 °

  // 5. 中间虚线分隔
  drawDottedH(80, 160, 118, PAL_DARK);

  // 6. 湿度区
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispHum);
  else           strcpy(num, "--.-");

  drawCenteredPixel("HUM", 124, LBL_SCALE, PAL_DARK);
  drawValue(num, "%", 142, humColor(t));
}

// ──────────────────────────────────────────
// 圆形外框：墨绿双线描边 + 四个 45° 对角装饰方块
// ──────────────────────────────────────────
void drawBezel() {
  gfx->drawCircle(CX, CY, 116, PAL_DARKEST);
  gfx->drawCircle(CX, CY, 115, PAL_DARKEST);

  // 四个 45° 对角小方块（cos45° ≈ 0.707）
  const int r = 104, d = (int)(r * 0.707f);
  gfx->fillRect(CX + d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // 右上
  gfx->fillRect(CX - d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // 左上
  gfx->fillRect(CX + d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // 右下
  gfx->fillRect(CX - d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // 左下
}

// ──────────────────────────────────────────
// 顶栏：居中标题 "DHT11" + 左侧 500ms 闪烁指示圆点（表示系统运行中）
// ──────────────────────────────────────────
void drawTopBar(unsigned long t) {
  drawCenteredPixel("DHT11", 12, 1, PAL_DARK);

  // 闪烁点（亮/灭交替）：每 500ms 切换一次颜色
  bool on = (t / 500) % 2 == 0;
  uint16_t c = on ? PAL_DARKEST : PAL_MID;
  int16_t tw = pixelTextWidth("DHT11", 1);
  int16_t sx = CX - tw / 2;         // 标题左端 X 坐标
  gfx->fillRect(sx - 12, 13, 4, 4, c);
}

// ──────────────────────────────────────────
// 数值行：大号数字本身水平居中，单位 °C/% 作右上角小上标
//   这样数字正中显示，不会被单位挤偏
// ──────────────────────────────────────────
void drawValue(const char *num, const char *unit,
               int16_t yTop, uint16_t col) {
  int16_t nw = boldTextWidth(num, BOLD_SCALE);
  int16_t sx = CX - nw / 2;                  // 数字居中起始 X

  drawBoldText(num, sx, yTop, BOLD_SCALE, col);
  // 单位紧贴数字右侧、上抬 2px，形成上标感
  drawPixelText(unit, sx + nw + 3, yTop + 2, UNIT_SCALE, col);
}

// ──────────────────────────────────────────
// 水平像素点线（2×2 小方块，间隔 5px）
// ──────────────────────────────────────────
void drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c) {
  for (int16_t x = x0; x <= x1; x += 5) {
    gfx->fillRect(x, y, 2, 2, c);
  }
}

// ══════════════════════════════════════════
// 颜色映射 —— 正常 = 墨绿；极端 = 以 400ms 间隔"闪烁熄灭"告警
// ══════════════════════════════════════════
uint16_t tempColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispTemp > 35.0f || g_dispTemp < 5.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;   // 熄灭 = 与背景同色
  return PAL_DARKEST;
}

uint16_t humColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispHum > 85.0f || g_dispHum < 20.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;
  return PAL_DARKEST;
}

// ══════════════════════════════════════════
// 5×7 像素字体（标签/单位用）
//   每字符 7 行，每行低 5 位 = 列 0~4（bit4 = 最左列）
//   特殊字符：'*' 映射为度数圆圈 °，'.' 画成基线小方块
// ══════════════════════════════════════════
const uint8_t EMPTY[7] = {0, 0, 0, 0, 0, 0, 0};

const uint8_t* glyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[7]={0x0E,0x11,0x13,0x15,0x19,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[7]={0x04,0x0C,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[7]={0x0E,0x11,0x01,0x02,0x04,0x08,0x1F}; return g; }
    case '3': { static const uint8_t g[7]={0x1F,0x02,0x04,0x02,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[7]={0x02,0x06,0x0A,0x12,0x1F,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[7]={0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E}; return g; }
    case '6': { static const uint8_t g[7]={0x06,0x08,0x10,0x1E,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[7]={0x1F,0x01,0x02,0x04,0x08,0x08,0x08}; return g; }
    case '8': { static const uint8_t g[7]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[7]={0x0E,0x11,0x11,0x1F,0x01,0x02,0x0C}; return g; }
    case '-': { static const uint8_t g[7]={0x00,0x00,0x00,0x0E,0x00,0x00,0x00}; return g; }
    case '%': { static const uint8_t g[7]={0x18,0x18,0x08,0x04,0x02,0x03,0x03}; return g; }
    case '*': { static const uint8_t g[7]={0x00,0x0E,0x11,0x0E,0x00,0x00,0x00}; return g; } // ° 度数圆圈
    case 'C': { static const uint8_t g[7]={0x0E,0x11,0x10,0x10,0x10,0x11,0x0E}; return g; }
    case 'D': { static const uint8_t g[7]={0x1E,0x11,0x11,0x11,0x11,0x11,0x1E}; return g; }
    case 'E': { static const uint8_t g[7]={0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F}; return g; }
    case 'H': { static const uint8_t g[7]={0x11,0x11,0x11,0x1F,0x11,0x11,0x11}; return g; }
    case 'I': { static const uint8_t g[7]={0x0E,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case 'M': { static const uint8_t g[7]={0x11,0x1B,0x15,0x15,0x11,0x11,0x11}; return g; }
    case 'N': { static const uint8_t g[7]={0x11,0x19,0x15,0x13,0x11,0x11,0x11}; return g; }
    case 'O': { static const uint8_t g[7]={0x0E,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case 'P': { static const uint8_t g[7]={0x1E,0x11,0x11,0x1E,0x10,0x10,0x10}; return g; }
    case 'T': { static const uint8_t g[7]={0x1F,0x04,0x04,0x04,0x04,0x04,0x04}; return g; }
    case 'U': { static const uint8_t g[7]={0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    default:  return EMPTY;
  }
}

// 单字符前进量（像素宽 + 右侧间距）
int16_t pixelAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale + (scale >> 1) + gap;   // 小数点窄一点
  return 5 * scale + gap;
}

// 计算一段文字的总像素宽度
int16_t pixelTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += pixelAdvance(*s, scale);
  return w;
}

// 逐格绘制 5×7 点阵文字
void drawPixelText(const char *s, int16_t x, int16_t y,
                   uint8_t scale, uint16_t c) {
  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      gfx->fillRect(x, y + 5 * scale, scale, scale, c);   // 小数点在基线
      x += 2 * scale + (scale >> 1) + scale;
      continue;
    }
    const uint8_t *g = glyph(ch);
    for (uint8_t r = 0; r < 7; ++r) {
      uint8_t bits = g[r];
      for (uint8_t col = 0; col < 5; ++col) {
        if (bits & (0x10 >> col)) {
          gfx->fillRect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    x += 5 * scale + scale;
  }
}

// 水平居中绘制 5×7 文字
void drawCenteredPixel(const char *s, int16_t y, uint8_t scale, uint16_t c) {
  int16_t w = pixelTextWidth(s, scale);
  drawPixelText(s, CX - w / 2, y, scale, c);
}

// ══════════════════════════════════════════
// 5×9 点阵大数字字体（温湿度 hero 数值专用）
//
//   设计特点：
//   · 每格内缩 DOT_INSET px，露出背景色缝隙，形成 LCD 点阵网格感
//   · '2' 顶部带棱角 + 斜笔逐格阶梯 + 实心双行底部
//   · '5' 顶底均为整行实心条
//   · '.' 不走字形表，由 drawBoldText 直接画基线单格
// ══════════════════════════════════════════
const uint8_t* boldGlyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[9]={0x0C,0x04,0x04,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[9]={0x0E,0x11,0x01,0x02,0x04,0x08,0x10,0x1F,0x1F}; return g; }
    case '3': { static const uint8_t g[9]={0x0E,0x11,0x01,0x01,0x06,0x01,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[9]={0x02,0x06,0x0A,0x12,0x12,0x1F,0x02,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[9]={0x1F,0x10,0x10,0x1E,0x01,0x01,0x01,0x11,0x1F}; return g; }
    case '6': { static const uint8_t g[9]={0x0E,0x11,0x10,0x10,0x1E,0x11,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[9]={0x1F,0x01,0x02,0x02,0x04,0x04,0x08,0x08,0x10}; return g; }
    case '8': { static const uint8_t g[9]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x0F,0x01,0x01,0x11,0x0E}; return g; }
    case '-': { static const uint8_t g[9]={0x00,0x00,0x00,0x00,0x1F,0x00,0x00,0x00,0x00}; return g; }
    default:  return nullptr;
  }
}

// 大数字单字符前进量
int16_t boldAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale;    // 小数点 = 1 格宽 + 1 格间距
  return 5 * scale + gap;
}

// 计算大数字文字总宽度
int16_t boldTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += boldAdvance(*s, scale);
  return w;
}

// 逐格绘制 5×9 点阵大数字（每格内缩 DOT_INSET，让缝隙露出背景色）
void drawBoldText(const char *s, int16_t x, int16_t y,
                  uint8_t scale, uint16_t c) {
  int8_t dot = scale - 2 * DOT_INSET;      // 点亮方块实际边长（内缩后）
  if (dot < 1) dot = 1;                    // 至少 1px，别消失了

  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      // 小数点：第 7 行（基线）处画单个内缩方块
      gfx->fillRect(x + DOT_INSET, y + 7 * scale + DOT_INSET, dot, dot, c);
      x += 2 * scale;
      continue;
    }
    const uint8_t *g = boldGlyph(ch);
    if (g) {
      for (uint8_t r = 0; r < 9; ++r) {
        uint8_t bits = g[r];
        for (uint8_t col = 0; col < 5; ++col) {
          if (bits & (0x10 >> col)) {
            gfx->fillRect(
              x + col * scale + DOT_INSET,
              y + r   * scale + DOT_INSET,
              dot, dot, c);
          }
        }
      }
    }
    x += 5 * scale + scale;
  }
}
```

---

## 常见问题排查

别慌，90% 的问题出在这几个地方，逐条过一遍基本能解决：

**屏幕通电后完全不亮（背光也没有）**

BL 引脚大概率没接对，或者代码里 `digitalWrite(TFT_BL, HIGH)` 这行没有生效。先检查 GPIO7 到 BL 的那根线，再试试把 BL 直接接 3.3V（绕过代码控制）。如果背光亮了但屏幕全黑，往下看。

**背光亮但屏幕全黑，或显示雪花**

SPI 接线有问题，重点查 SCK（GPIO12）、MOSI（GPIO11）、CS（GPIO9）、DC（GPIO10）这四根。其中 DC 和 CS 很容易接反，这两根一旦搞错，屏幕就是黑的，或者显示完全乱掉。还有，GC9A01 驱动最后一个参数 `true/false` 控制颜色反相——如果颜色看起来像底片，把 `true` 改成 `false`（或反过来）。

**屏幕颜色整体偏色，不是奶油绿**

RGB565 的字节顺序问题。Arduino_GFX_Library 一般处理好了，但如果颜色完全不对，可以尝试在构造 `Arduino_GC9A01` 时把最后的 `true` 换成 `false`。

**串口一直输出 `[WARN] DHT11 读取失败`**

- 检查 DAT 引脚是否接对了 GPIO47
- 如果你用的是散装 DHT11（不是模块版），需要在 DAT 和 VCC 之间接一个 10kΩ 上拉电阻，模块版一般已经焊上了
- `dht.begin()` 后面那个 `delay(2000)` 不能删，DHT11 上电需要约 1 秒稳定时间，太急了会读 NaN
- 确认 VCC 接的是 3.3V（本项目），如果你手头的 DHT11 只支持 5V，把 VCC 改接 5V，同时在 DAT 和 GPIO47 之间串一个电阻做电平转换（或者直接换 DHT11 模块版，通常 3.3V 可用）

**数字更新了，但画面有明显闪烁/撕裂**

Canvas 双缓冲是否正常工作？检查代码里 `gfx->flush()` 有没有漏写，而且**一定要用 Canvas 对象 `gfx->` 画图，而不是 `display->`**。另外，ESP32-S3 要选对开发板型号（`ESP32S3 Dev Module`），否则 SPI 速率会不对。

**编译报错：`'drawScene' was not declared in this scope`**

这是函数声明顺序的问题，确保代码顶部的函数原型列表里包含了 `void drawScene(unsigned long t);`，或者把 `drawScene` 函数定义移到 `loop()` 之前。

---

## FAQ

**Q：GPIO 引脚可以换成其他编号吗？**
A：可以，只需修改代码顶部的 `#define` 定义即可，无需改动其他地方。DHT11 的 DAT 可以接任意 GPIO；GC9A01 的 SCK/MOSI 建议使用 ESP32-S3 的硬件 SPI 默认引脚（GPIO 11/12）以获得最高速度，其他引脚也能用，但需要额外配置软件 SPI。

**Q：可以把 DHT11 换成 DHT22 吗？**
A：完全可以。只需把代码第 16 行改为 `#define DHTTYPE DHT22`，其余代码不变。DHT22 精度更高（温度 ±0.5°C、湿度 ±2~5% RH），采样间隔最短 2 秒（代码里已设为 2 秒，刚好兼容）。

**Q：GC9A01 的 SPI 时钟最高支持多少？**
A：GC9A01 官方规格支持最高 100 MHz SPI 时钟，实际使用中 ESP32-S3 跑 80 MHz 一般没有问题。Arduino_GFX_Library 默认会用硬件 SPI 最大速率，无需手动配置。

**Q：ESP32-S3 的 GPIO 电压是多少？能直接接 5V 设备吗？**
A：ESP32-S3 的 GPIO 工作电压为 3.3V，**不耐受 5V 信号**，直接接 5V 逻辑设备可能损坏芯片。GC9A01 圆屏同样是 3.3V 器件。如果你的 DHT11 用 5V 供电，DAT 引脚输出的高电平约为 4.5V，建议加分压电阻（10kΩ + 20kΩ）或电平转换模块做降压处理。

**Q：代码的帧率和 CPU 占用率大概是多少？**
A：当前代码约 30fps（每帧间隔 33ms），每帧渲染时间约 8~15ms（取决于 SPI 速率），CPU 占用率约 20~40%。双核 ESP32-S3 的另一个核心完全空闲，如有需要可以把传感器读取任务放到 Core 0，渲染放到 Core 1，进一步提升流畅度。

**Q：如果温湿度数值一直显示 `--.-` 不刷新怎么办？**
A：这说明 `g_hasData` 一直是 `false`，即 DHT11 从未返回有效读数。按顺序排查：① 确认 DAT 接 GPIO47；② 模块版 DHT11 不需要额外上拉电阻，散装版需要 10kΩ；③ 用串口监视器（115200 波特率）查看有没有 `[DATA]` 或 `[WARN]` 输出，据此判断问题出在传感器还是接线；④ 确认 VCC 电压（推荐 3.3V）。

**Q：代码里的 `true` 参数（GC9A01 构造函数）是什么意思？**
A：`new Arduino_GC9A01(bus, TFT_RST, 0, true)` 第四个参数控制颜色反相（IPS 面板与 TN 面板的 RGB 输出差异）。`true` 时颜色正常输出，`false` 时会出现类似"底片效果"的颜色反相。如果你的屏幕显示颜色看起来是反的，把 `true` 改成 `false` 即可。

---

## 参考资料

- [Arduino_GFX_Library 官方文档与示例](https://github.com/moononournation/Arduino_GFX)
- [Adafruit DHT sensor library 文档](https://github.com/adafruit/DHT-sensor-library)
- [GC9A01 数据手册（官方 PDF）](https://www.waveshare.com/w/upload/5/5e/GC9A01A.pdf)
- [DHT11 官方规格书（Aosong 厂商）](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf)
- [乐鑫 ESP32-S3 技术参考手册](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_cn.pdf)
