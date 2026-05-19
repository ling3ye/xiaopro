---
title: "ESP32-S3 驱动 GC9A01 圆屏画心形线｜极坐标动画 30 分钟搞定"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-05-19
intro: "用 ESP32-S3 驱动 1.28 寸 GC9A01 圆形 TFT 屏幕，跑极坐标心形线动画。含完整接线、双缓冲零闪烁代码和避坑指南。"
image: "https://img.lingflux.com/2026/05/a6a0b0037d4fd0650665e49e7364d65d.jpg"
---

# ESP32-S3 驱动 GC9A01 1.28 寸圆形屏幕完整教程（SPI + Arduino IDE）

难度：⭐⭐☆☆☆（新手可上手）
预计时间：30 分钟
测试环境：
Arduino IDE 2.3.8
Arduino_GFX_Library 1.6.5
ESP32 Arduino Core 3.3.8

---

> **一句话摘要**：用 ESP32-S3 驱动 1.28 寸 GC9A01 圆屏，跑极坐标心形线动画——双缓冲零闪烁，接线 + 完整代码 + 避坑，30 分钟搞定。

---

## 前言

520就来到了，可以送些什么礼物给女朋友？百思不得其姐。

后来，想到了高中学极坐标的时候，课本上有一条曲线——心脏线。可以做一个极坐标的演示动画，画出一个心心出来表达我的心意。（理工男脑补了所有画面，自嗨中....）

本文目标：让你从零开始，30 分钟内在使用ESP32-s3驱动这块1.28"的圆屏，跑起来一个极坐标动画——顺便搞清楚每一步为什么这么做。（PS：希望你送出去给你心仪的对象之后，你不用跪键盘！～ :P ）

（看到这个心心的姐心中在想：这个是什么鬼？！～上榴莲）

---

## 实验效果

圆屏上会实时绘制一条旋转的**心形线（Cardioid）**，配合极坐标系网格和追踪动点，像一台微型示波器在描绘数学曲线。全程零闪烁，帧率锁定 16fps 流畅运行。

![](https://img.lingflux.com/2026/05/8db744891e99902a8045e4e1242911d1.jpg)

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/fcqwhO5Vr7U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 元件说明

### GC9A01 1.28 寸圆形 TFT 屏幕

GC9A01 是驱动芯片，圆形 IPS 面板是屏幕，两者焊在同一块小模块上，你只需要用 SPI 协议把图像数据"喂"给它，它负责点亮每一个像素。

| 参数 | 值 |
| --- | --- |
| 分辨率 | 240 × 240 像素 |
| 颜色深度 | 16-bit RGB565，65536 色 |
| 接口协议 | 4 线 SPI，最高 80MHz |
| 工作电压 | 3.3V（直接接 ESP32-S3，无需电平转换） |
| 面板类型 | IPS，视角接近 180° |
| 模块尺寸 | 约 36mm 直径 |

选它的理由：便宜（5～15 元），货源广，圆形造型天然适合做仪表盘和时钟类项目，而且 240×240 的分辨率对 ESP32-S3 内存压力恰好合适。

---

## BOM 表

| 元件 | 数量 | 备注 |
| --- | --- | --- |
| ESP32-S3 开发板 | 1 | 任意带 SPI 引脚的版本均可 |
| GC9A01 1.28" 圆形屏幕模块 | 1 | 确认模块上有 BL 引脚 |
| 跳线 | 若干 | 母对母或母对公，视开发板针脚形式 |

---

## 元件引脚说明

| GC9A01 模块引脚 | 功能 |
| --- | --- |
| VCC | 电源正极（3.3V） |
| GND | 电源负极 |
| SCL / CLK | SPI 时钟信号 |
| SDA / MOSI | SPI 数据输入（主→从） |
| CS | 片选，低电平时屏幕响应 SPI |
| DC | 数据/命令选择：高=数据，低=命令 |
| RST | 硬件复位，低电平触发 |
| BL | 背光控制，接高电平才亮屏 |

---

## 接线方式

> 建议按下表逐行接完，每接一根在旁边打个钩，能省 80% 的排错时间。

| GC9A01 屏幕 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7（代码控制）或直接接 3.3V |

> **⚠️ 注意**：BL（背光）引脚容易漏接，漏接后上电屏幕黑屏，不是代码问题，也不是屏坏了——查这里先。而有一些模块是没有引出这个BL引脚，那说明在模块内部已经连上了3.3V，所有如果模块上没有BL，则可以不用管。

---

## 需要安装的库

打开 Arduino IDE → 工具 → 管理库，搜索并安装：

| 库名 | 作者 | 测试通过版本 |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | 1.6.5 |

> 不要装 TFT_eSPI：在 ESP32 Core 3.x 下，TFT_eSPI 的宏定义和 DMA 初始化会与新版 ESP32 冲突，导致编译报错或上电死机。Arduino_GFX_Library 从头支持现代 C++ 和内存画布，是目前屏幕项目最省心的选择。（截稿日期：2026-05-18）

---

## 完整代码

```cpp
/**
 * ESP32-S3 + GC9A01 1.28" 圆形屏幕 — 极坐标动画演示
 * 双缓冲零闪烁，锁定 16fps
 * 接线：SCL=GPIO12, SDA=GPIO11, CS=GPIO9, DC=GPIO10, RST=GPIO18, BL=GPIO7
 */

#include <Arduino_GFX_Library.h>

// ---------------------------------------------------
// 第一步：手动补上颜色宏
// 新版 Arduino_GFX 取消了 BLACK / WHITE 等全局导出，
// 不加这段，编译会报 "BLACK was not declared in this scope"
// ---------------------------------------------------
#ifndef BLACK
#define BLACK       0x0000
#endif
#ifndef WHITE
#define WHITE       0xFFFF
#endif
#ifndef RED
#define RED         0xF800
#endif
#ifndef GREEN
#define GREEN       0x07E0
#endif
#ifndef BLUE
#define BLUE        0x001F
#endif
#ifndef YELLOW
#define YELLOW      0xFFE0
#endif
#ifndef CYAN
#define CYAN        0x07FF
#endif
#ifndef MAGENTA
#define MAGENTA     0xF81F
#endif
#ifndef GRAY
#define GRAY        0x8410
#endif
#ifndef DARKGRAY
#define DARKGRAY    0x2104
#endif

// ---------------------------------------------------
// 第二步：定义配色方案（深蓝底 + 橙红主色）
// ---------------------------------------------------
#define COLOR_BG        0x1123   // 深蓝黑背景
#define COLOR_GRID      0x19E5   // 网格蓝灰
#define COLOR_PRIMARY   0xE73C   // 曲线橙红
#define COLOR_ACCENT    0xFDE0   // 极径金黄
#define COLOR_TEXT      0xF7BE   // 文字浅灰

// ---------------------------------------------------
// 第三步：定义物理引脚
// ---------------------------------------------------
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---------------------------------------------------
// 第四步：实例化 SPI 总线和屏幕驱动
// ---------------------------------------------------
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA, GFX_NOT_DEFINED /* MISO 不需要 */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST,
    0,    /* 旋转角度 */
    true  /* IPS 屏幕 */
);

// ---------------------------------------------------
// 第五步：分配双缓冲画布（240×240×2 Bytes = 115.2KB SRAM）
// 所有绘制先写进内存，完成后一次性刷到屏幕，彻底消灭闪烁
// ---------------------------------------------------
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

// ---------------------------------------------------
// 动画变量
// ---------------------------------------------------
float angle = 0.0f;
const float  a_scale    = 50.0f;  // 心形线缩放系数（单位：像素）
const int16_t cx        = 120;    // 圆心 X
const int16_t cy        = 120;    // 圆心 Y

unsigned long lastFrameTime = 0;
const int frameDelay = 1000 / 16; // 锁 16fps

// 功能开关（改 false 可单独关闭某层）
const bool showGrid     = true;
const bool showCurve    = true;
const bool showRadius   = true;
const bool showTelemetry= true;

void setup() {
    Serial.begin(115200);

    // 初始化屏幕驱动
    gfx->begin();

    // 点亮背光（这步漏掉 = 黑屏）
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);

    // 初始化双缓冲画布
    if (!canvas->begin()) {
        Serial.println("Canvas 内存申请失败！将直接写屏（会有闪烁）");
    } else {
        Serial.println("双缓冲启动成功，零闪烁渲染就绪。");
    }
}

void loop() {
    // 帧率限速
    unsigned long now = millis();
    if (now - lastFrameTime < frameDelay) return;
    lastFrameTime = now;

    // 清帧
    canvas->fillScreen(COLOR_BG);

    // --- 层 1：极坐标网格 ---
    if (showGrid) {
        canvas->drawCircle(cx, cy,  30, COLOR_GRID);
        canvas->drawCircle(cx, cy,  60, COLOR_GRID);
        canvas->drawCircle(cx, cy,  90, COLOR_GRID);
        canvas->drawCircle(cx, cy, 110, COLOR_GRID);
        canvas->drawFastHLine(10, cy, 220, COLOR_GRID);
        canvas->drawFastVLine(cx, 10, 220, COLOR_GRID);
    }

    // --- 层 2：完整心形线轨迹 r = a*(1 - cos θ) ---
    if (showCurve) {
        int16_t lx = 0, ly = 0;
        for (int16_t deg = 0; deg <= 360; deg += 3) {
            float rad = deg * DEG_TO_RAD;
            float r   = a_scale * (1.0f - cos(rad));
            int16_t x = cx + (int16_t)(r * cos(rad));
            int16_t y = cy - (int16_t)(r * sin(rad)); // 屏幕 Y 轴朝下，取反
            if (deg > 0) canvas->drawLine(lx, ly, x, y, COLOR_PRIMARY);
            lx = x; ly = y;
        }
    }

    // --- 层 3：当前追踪点 & 极径 ---
    float rad_a  = angle * DEG_TO_RAD;
    float active_r = a_scale * (1.0f - cos(rad_a));
    int16_t px = cx + (int16_t)(active_r * cos(rad_a));
    int16_t py = cy - (int16_t)(active_r * sin(rad_a));

    if (showRadius) canvas->drawLine(cx, cy, px, py, COLOR_ACCENT);
    canvas->fillCircle(px, py, 5, COLOR_TEXT);

    // --- 层 4：数值显示 ---
    if (showTelemetry) {
        canvas->setTextColor(COLOR_TEXT);
        canvas->setTextSize(1);
        canvas->setCursor(50, 25);
        canvas->print("Polar Coordinates");
        canvas->setCursor(28, 185);
        canvas->print("r = a * (1 - cos(theta))");
        canvas->setCursor(40, 200);
        canvas->print("th:"); canvas->print((int)angle);
        canvas->print("  r:"); canvas->print((int)active_r);
        canvas->print("px");
    }

    // 角度步进（每帧 +6°，绕一圈约 1 秒）
    angle += 6.0f;
    if (angle >= 360.0f) angle -= 360.0f;

    // 一键将内存画布刷到物理屏幕
    canvas->flush();
}
```

### 代码说明

**双缓冲机制**：所有绘制操作都发生在 `canvas`（内存），最后一行 `canvas->flush()` 才真正把完整帧发送到屏幕。跟先擦掉黑板再写字相比，这相当于在草稿纸上写好、整张贴上去——屏幕永远看不到"画一半"的状态，闪烁归零。

**心形线方程** `r = a * (1 - cos θ)`：这是极坐标方程，`r` 是从圆心出发的距离，`θ` 是角度。把方程里每个 θ 值算出的 (r, θ) 转成屏幕 XY 坐标，连线就得到那条心形曲线。

**帧率锁**：`frameDelay = 1000 / 16` 控制每帧最短间隔约 62ms。想加速动画改大 `+= 6.0f` 这个步进值；想流畅可以把 targetFPS 提到 30，但会多占一些 CPU。

**烧录分区**：Arduino IDE → 工具 → Partition Scheme，选 **Huge APP (3MB No OTA)**。115KB 的 Canvas 需要足够的 SRAM，默认分区偶尔会撞上堆空间不足。

---

## 常见问题排查

别慌，90% 的问题出在这几个地方：

**上电黑屏，串口也没报错**
先查 BL 引脚——背光没拉高是最常见原因。确认 GPIO7 已经执行了 `digitalWrite(TFT_BL, HIGH)`，或者直接把 BL 跳线接 3.3V 排除代码问题。

**屏幕亮了但全白/全红/花屏**
SPI 接线顺序接错了。CS 和 DC 最容易搞混（两根都是控制线，长得一样）。对照代码里的宏定义（CS=GPIO9, DC=GPIO10）重新核对，不要相信接线表，以代码为准。

**编译报错：`BLACK was not declared in this scope`**
你用的 Arduino_GFX 版本 >= 1.3，新版取消了颜色宏的全局导出。代码顶部的 `#ifndef BLACK` 那段必须保留，不能删。

**Canvas 内存申请失败，串口提示直接写屏**
说明可用 SRAM 不够 115KB。检查：①分区是否选了 Huge APP；②其他地方有没有大数组占内存；③极少数情况下是开发板 PSRAM 没使能（需要在 Board 设置里打开 PSRAM）。

**动画卡顿，不像 16fps**
`loop()` 里有没有加了 `delay()`？有的话去掉，帧率限速已经用 `millis()` 实现了，两者叠加会让帧间隔翻倍。

---

## FAQ

**Q：CS、DC 引脚能换成其他 GPIO 吗？**
A：可以，修改代码顶部的 `#define TFT_CS` 和 `#define TFT_DC` 即可，任意空闲 GPIO 都行。SCL 和 SDA 建议使用硬件 SPI 引脚（ESP32-S3 默认 SPI2：SCLK=12，MOSI=11）以获得最高速度；换成其他引脚会退化为软件 SPI，速度下降明显。

**Q：屏幕支持哪些刷新率？**
A：GC9A01 的 SPI 接口理论最高时钟 80MHz，对应全屏 240×240 刷新率约 40fps 上限。本代码锁定 16fps 是为了在中低端 ESP32-S3 模块上保留 CPU 余量。如果你的板子主频跑在 240MHz，把 `targetFPS` 改到 30～40 没有问题。

**Q：能不能同时驱动两块屏？**
A：可以，两块屏共享 SCL/SDA，给每块屏分配独立的 CS 引脚，分别实例化两个 `Arduino_GC9A01` 对象，切换 CS 激活不同屏幕即可。注意内存：两个 Canvas 共需 230KB SRAM，必须开启 PSRAM。

**Q：供电用 3.3V 还是 5V？**
A：GC9A01 模块工作电压 3.3V，直接接 ESP32-S3 的 3.3V 引脚。绝对不能接 5V，会损坏驱动芯片。

**Q：显示中文字符怎么做？**
A：Arduino_GFX_Library 默认只内置 ASCII 字体，显示中文需要额外的字库文件（比如 U8g2 字库）或使用 LVGL 框架。字库会大幅增加 Flash 占用，建议改用 LVGL + SPIFFS 方案，有时间单独出一篇。

**Q：GC9A01 屏幕没有声音输出能力，只有显示，这个跟 I2S 音频项目有什么关系？**
A：没有关系。GC9A01 纯粹是显示屏，SPI 接口只传图像数据。如果你想同时播放音频，需要额外的 I2S DAC 模块（如 MAX98357A），两者完全独立运行，引脚互不干扰。

---

## 延伸玩法

- 改成**模拟时钟表盘**：画刻度和指针，配上 DS3231 RTC 模块读取实时时间
- 加**玫瑰线模式**：把 `showTangent` 改 false，曲线切换成 `r = a * sin(k * θ)`，换个参数 k 值，花瓣数跟着变
- 接**按键切换**动画主题：三个按键控制心形线 / 玫瑰线 / 李沙育图形轮播
- 配合**ESP32 Wi-Fi**：拉取天气 API，把温度湿度显示在圆屏仪表盘上
- 购买2个圆形屏幕：

---

## 参考资料

- [GC9A01 驱动芯片数据手册（Galaxycore 官方）](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub 主页（moononournation）](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 产品页](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
- [ESP32 Arduino Core 3.x 发布说明](https://github.com/espressif/arduino-esp32/releases)
