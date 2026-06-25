---
title: "ESP32-S3 驱动 GC9A01 圆屏 + MQ135 制作空气质量仪表盘完整教程（LVGL v9 + SPI 接口 + Arduino C++）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-25
intro: "用 ESP32-S3 + MQ135 气体传感器 + GC9A01 1.28 英寸圆屏，搭配 LVGL v9 做一个带动态弧形表盘、实时趋势折线、呼吸发光效果的空气质量仪表盘，含完整接线、代码和踩坑记录。"
image: "https://img.lingflux.com/2026/06/4217f9f4026039eeca35a691450313dc.jpg"
---





> 难度：⭐⭐☆☆☆（几根杜邦线就能上手）
> 预计时间：45 分钟
> 测试环境：Arduino IDE 2.3.8 · ESP32 Arduino Core 3.x · lvgl v9.5.0 · Arduino_GFX_Library v1.6.5

---

> **TL;DR（只想跑起来？看这里）**
>
> **期望管理：** 本项目仅供入门、桌面摆件和纯粹的视觉享受。**千万别拿它去测真正的有害气体泄漏！** 它的准头基本属于“玄学”。
>
> 1. **接线**：MQ135 A0 → GPIO 13；GC9A01 按下表接 GPIO 7 / 9 / 10 / 11 / 12 / 18
> 2. **装库**：Arduino 库管理器搜 `lvgl`（选 v9.x）+ `Arduino_GFX_Library`
> 3. **配置 lv_conf.h**：开启 `LV_FONT_MONTSERRAT_14` 和 `LV_FONT_MONTSERRAT_28`（改 0 → 1）
> 4. 烧录 → 圆屏亮起，仪表盘开始转动

---

## 前言

在我那堆吃灰的传感器中又找到一个专门检测空气质量的传感器——MQ135模块。想着看看工作室的空气质量吧，就连接上测试了一番，看说明文档告诉我这模块预热要24小时，感觉只能玩玩。不过，这模块对一堆气体是敏感的，虽然不一定准，但数值升高，相对来说就存在某些气体，可能是二氧化碳，氨气，苯，酒精，烟雾。用来做房间是否需要通风的相对数值判断，应该是可以的。

于是就有了这个项目：ESP32-S3 + MQ135 气体传感器 + GC9A01 1.28 英寸圆屏，搭配大名鼎鼎的 LVGL v9 图形库，做一个有弧形表盘、实时趋势折线、还会"呼吸"变色的空气质量仪表盘。

本文目标：**从零接线到烧录成功，完整复现这个效果。**

---

## 实验效果

圆屏实时显示当前空气质量 ADC 数值、状态等级（EXCELLENT / GOOD / FAIR / MODERATE / POOR / DANGER）和历史趋势折线；表盘颜色随空气质量从绿渐变到红，外圈带节奏感"呼吸"光效。屏幕左下角同时记录本次上电后的最低值和最高值。



---

## 元件说明

> 开发板（ESP32-S3）本文不做介绍，以下只说新手可能没接触过的两个模块。

### MQ135 气体传感器

MQ135 是一款气敏传感器，负责检测空气中 CO₂、氨气、苯等有害气体的浓度变化，用在本项目里的作用是输出 0～4095 的模拟 ADC 数值，反映当前环境的空气质量等级。

用大白话说：**它是一个化学"鼻子"**，空气越浑浊，输出电压越高，ADC 数值越大。

| 参数 | 值 |
|------|-----|
| 标准工作电压 | 5V（加热丝）/ 模拟输出兼容 3.3V |
| 输出接口 | 模拟（A0）+ 数字（D0） |
| 预热时间 | 24～48 小时（满精度）/ 约 3 分钟（趋势参考） |
| 可检测气体 | CO₂、NH₃、NOₓ、苯、酒精、烟雾 |

**关于 3.3V 供电：** MQ135 标准电压是 5V，用 3.3V 供电时加热丝功率约为标准的 44%，灵敏度下降、读数偏低，但够用于趋势展示和相对变化检测。如果追求绝对精度，建议单独用 5V 给 VCC，A0 模拟输出不超过 3.3V，无需分压可直接接 ESP32-S3。

选它的原因：**便宜（5 块钱以内）、模块化、直接接线就能用**，对这个"颜值向"项目足够了。

**使用 MQ135 做室内判断的正确姿势**

```
✅ 适合做：
  - 空气质量变化趋势监测（相对值）
  - 触发通风/报警的阈值判断
  - 多种有害气体"综合污染"指示

❌ 不适合做：
  - 精确的单一气体浓度测量
  - 医疗/工业级安全合规检测
  - CO₂ 精确值（误差可达 ±300ppm 以上）
```

---

### GC9A01 1.28 英寸圆形 TFT 显示屏

GC9A01 是一款 1.28 英寸圆形 TFT LCD 显示屏，通过 SPI 接口接收图像数据并渲染，用在本项目里的作用是显示带动画效果的仪表盘 UI 界面。

类比：**就是智能手表上那种可以随便画内容的圆形表盘。**

| 参数 | 值 |
|------|-----|
| 屏幕尺寸 | 1.28 英寸 |
| 分辨率 | 240 × 240 像素 |
| 接口 | SPI（最高 80 MHz） |
| 驱动芯片 | GC9A01 |
| 工作电压 | 3.3V |
| 背光控制 | 支持（BL 引脚，可 PWM 调光） |

选它的原因：**圆形外观独特、尺寸小巧、3.3V 直用、Arduino_GFX_Library 原生支持**，搭 LVGL 做表盘视觉效果拔群。

---

## BOM 表

| 元件 | 型号 / 规格 | 数量 |
|------|------------|------|
| 主控开发板 | ESP32-S3（带 USB-C）| 1 |
| 圆形 TFT 屏 | GC9A01 1.28" 240×240 | 1 |
| 气体传感器 | MQ135 模块 | 1 |
| 连接线 | 杜邦线 | 若干 |



---

## 元件引脚说明

### MQ135 模块引脚

| 引脚 | 说明 |
|------|------|
| VCC | 供电（本项目接 3.3V，标准为 5V） |
| GND | 接地 |
| A0 | 模拟信号输出，接 ESP32-S3 ADC 引脚 |
| D0 | 数字输出（本项目不使用）输出**高低电平（HIGH / LOW）** |

### GC9A01 模块引脚

| 引脚标注 | 说明 |
|---------|------|
| VCC | 3.3V 供电 |
| GND | 接地 |
| SCL / CLK | SPI 时钟 |
| SDA / MOSI | SPI 数据 |
| CS | 片选（低电平有效） |
| DC | 数据/命令切换 |
| RST | 复位（低电平复位） |
| BL | 背光控制（HIGH = 亮）（可选，不一定每个模块都引出） |

---

## 接线方式

### MQ135 → ESP32-S3

| MQ135 | ESP32-S3 |
|-------|----------|
| VCC | 5V |
| GND | GND |
| A0 | GPIO 13 |

### GC9A01 → ESP32-S3

| GC9A01 引脚 | ESP32-S3 GPIO |
|------------|---------------|
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL（背光）| GPIO 7 （如果没有可以不接） |

> **实用提醒：** 接完线后，对着上面两张表**逐行核对一遍**，能省掉 80% 的排错时间。最容易接反的是 DC 和 CS——这两根线位置一换，屏幕要么全白要么全黑，看着很像"屏幕坏了"，其实只是线插错了。

---

## 需要安装的库

打开 Arduino IDE → 工具 → 管理库，搜索并安装以下两个：

| 库名 | 作者 | 本文测试通过版本 |
|------|------|-----------------|
| `lvgl` | LVGL | v9.5.0 |
| `Arduino_GFX_Library` | Moon On Our Nation | v1.6.5 |

**安装完 lvgl 之后，还有一步必须做：**

1. 找到 lvgl 库目录（通常在 `文档/Arduino/libraries/lvgl/`）
2. 把里面的 `lv_conf_template.h` 复制一份，重命名为 `lv_conf.h`，放到 `lvgl/` 的同级目录下
3. 打开 `lv_conf.h`，找到下面两行，把 `0` 改成 `1`：
   ```c
   #define LV_FONT_MONTSERRAT_14  1
   #define LV_FONT_MONTSERRAT_28  1
   ```
4. 打开 `lv_conf.h`，找到最开投的` #if 0 ` 改为 ` #if 1`

> 忘记这一些步，直接烧录的话，编译会报 `lv_font_montserrat_28 undeclared`。别问我怎么知道的。

---

## 完整代码

```cpp
/*
 * ESP32-S3 + GC9A01 圆屏空气质量仪表盘 v3.1
 * "极简科技风" - 弧形进度条 + 实时趋势折线 + 呼吸发光
 *
 * 测试环境：Arduino IDE 2.3.2 / ESP32 Core 3.x
 * 依赖库：lvgl v9.2.x + Arduino_GFX_Library v1.4.x
 */

#include <Arduino.h>
#include <lvgl.h>
#include <Arduino_GFX_Library.h>
#include <math.h>

// ===================== 引脚定义 =====================
#define TFT_SCK    12   // SPI 时钟
#define TFT_MOSI   11   // SPI 数据
#define TFT_CS     9    // 片选
#define TFT_DC     10   // 数据/命令切换（接反了屏幕会全白）
#define TFT_RST    18   // 复位
#define TFT_BL     7    // 背光——HIGH 才亮，这根线忘了接等于白做
#define MQ135_PIN  13   // MQ135 模拟输入（ADC2 通道，无 Wi-Fi 时正常使用）

#define SCREEN_WIDTH   240
#define SCREEN_HEIGHT  240

// ===================== 初始化显示驱动 =====================
Arduino_ESP32SPI bus = Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01 gfx = Arduino_GC9A01(&bus, TFT_RST, 0, true);

// ===================== LVGL 绘制缓冲区 =====================
// 40 行缓冲在 ESP32-S3 上内存占用约 19KB，速度和内存比较均衡
#define DRAW_BUF_LINES 40
alignas(4) static uint16_t draw_buf[SCREEN_WIDTH * DRAW_BUF_LINES];

// ===================== 趋势历史数据 =====================
#define TREND_POINTS 40    // 保留最近 40 个采样点（× 300ms ≈ 12 秒一屏历史）
static int trendData[TREND_POINTS] = {0};
static int trendIdx = 0;
static bool trendFull = false;
static lv_point_precise_t trendLinePoints[TREND_POINTS];

// ===================== LVGL UI 对象句柄 =====================
static lv_obj_t *arc_bg;          // 弧形轨道背景（暗色）
static lv_obj_t *arc_main;        // 主弧形 + 末端 knob 小圆点
static lv_obj_t *glow_circle;     // 外发光边框圈（会呼吸）
static lv_obj_t *center_circle;   // 中心圆盘底板
static lv_obj_t *label_value;     // 中心大数字（ADC 值）
static lv_obj_t *label_unit;      // 单位标签 "ADC"
static lv_obj_t *label_status;    // 状态文字（EXCELLENT / GOOD...）
static lv_obj_t *dot_status;      // 状态小圆点
static lv_obj_t *label_title;     // 顶部标题 "AIR QUALITY"
static lv_obj_t *label_score;     // 底部洁净度评分
static lv_obj_t *label_minmax;    // 最低/最高值
static lv_obj_t *trend_line;      // 趋势折线
static lv_obj_t *trend_container; // 折线裁剪容器

// ===================== 传感器状态 =====================
static float smoothedValue = 0.0f; // 指数加权平均后的平滑值
static bool firstSample = true;    // 第一帧标志，避免从 0 开始动画
static int minValue = 4095;        // 本次上电最低 ADC 值
static int maxValue = 0;           // 本次上电最高 ADC 值
static float displayValue = 0.0f;  // UI 动画插值用

// ===================== LVGL 时钟回调 =====================
static uint32_t my_tick_cb(void) { return millis(); }

// ===================== 刷新回调：LVGL 渲染完一块区域后推给屏幕 =====================
void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = area->x2 - area->x1 + 1;
  uint32_t h = area->y2 - area->y1 + 1;
  gfx.draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)px_map, w, h);
  lv_display_flush_ready(disp); // 告诉 LVGL：这块画完了，可以继续下一块
}

// ===================== 颜色系统：ADC 值 → 状态色 =====================
// 数值越高 = 空气越差 = 颜色越红，六个档位对应六种状态
uint32_t getColorHex(int v) {
  if (v < 600)  return 0x00E5A0; // EXCELLENT：清新绿
  if (v < 1200) return 0x22C55E; // GOOD：浅绿
  if (v < 2000) return 0xA3E635; // FAIR：黄绿
  if (v < 2800) return 0xEAB308; // MODERATE：黄
  if (v < 3500) return 0xF97316; // POOR：橙
  return 0xFF3355;                // DANGER：红（快开窗吧）
}

lv_color_t getColor(int v) {
  return lv_color_hex(getColorHex(v));
}

// 弧形轨道底色（状态色的深色版，配合深色背景）
uint32_t getDimColorHex(int v) {
  if (v < 600)  return 0x0A2A20;
  if (v < 1200) return 0x0A2A15;
  if (v < 2000) return 0x1A2A10;
  if (v < 2800) return 0x2A2208;
  if (v < 3500) return 0x2A1808;
  return 0x2A0A10;
}

const char* getStatusText(int v) {
  if (v < 600)  return "EXCELLENT";
  if (v < 1200) return "GOOD";
  if (v < 2000) return "FAIR";
  if (v < 2800) return "MODERATE";
  if (v < 3500) return "POOR";
  return "DANGER";
}

// ADC 值转洁净度百分比（ADC 越低 = 越干净 = 分数越高）
int adcToScore(int adc) {
  adc = constrain(adc, 0, 4095);
  return constrain(100 - (adc * 100 / 4095), 0, 100);
}

// ===================== 创建 UI 界面 =====================
void create_ui() {
  lv_obj_t *scr = lv_screen_active();

  // 第一步：深色背景
  lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(scr, lv_color_hex(0x050810), 0);

  // 第二步：最外圈发光边框（颜色跟随状态，有呼吸动画）
  glow_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(glow_circle);
  lv_obj_set_size(glow_circle, 234, 234);
  lv_obj_center(glow_circle);
  lv_obj_set_style_radius(glow_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(glow_circle, LV_OPA_TRANSP, 0);
  lv_obj_set_style_border_width(glow_circle, 2, 0);
  lv_obj_set_style_border_opa(glow_circle, LV_OPA_20, 0);
  lv_obj_set_style_border_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(glow_circle, 30, 0);
  lv_obj_set_style_shadow_spread(glow_circle, 2, 0);
  lv_obj_set_style_shadow_opa(glow_circle, LV_OPA_30, 0);
  lv_obj_set_style_shadow_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_clear_flag(glow_circle, LV_OBJ_FLAG_SCROLLABLE);

  // 第三步：弧形轨道底色（显示"还没到达"的暗色区域）
  arc_bg = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_bg);
  lv_obj_set_size(arc_bg, 210, 210);
  lv_obj_center(arc_bg);
  lv_arc_set_range(arc_bg, 0, 100);
  lv_arc_set_bg_angles(arc_bg, 135, 45);
  lv_arc_set_value(arc_bg, 0);
  lv_obj_set_style_arc_width(arc_bg, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(0x0A2A20), LV_PART_MAIN);
  lv_obj_set_style_arc_rounded(arc_bg, true, LV_PART_MAIN);
  lv_obj_set_style_arc_width(arc_bg, 0, LV_PART_INDICATOR);
  lv_obj_set_style_arc_opa(arc_bg, LV_OPA_TRANSP, LV_PART_INDICATOR);
  lv_obj_set_style_bg_opa(arc_bg, LV_OPA_TRANSP, LV_PART_KNOB);
  lv_obj_clear_flag(arc_bg, LV_OBJ_FLAG_CLICKABLE);

  // 第四步：主弧形（实时数值 + 末端 knob 小圆点）
  arc_main = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_main);
  lv_obj_set_size(arc_main, 210, 210);
  lv_obj_center(arc_main);
  lv_arc_set_range(arc_main, 0, 4095);
  lv_arc_set_bg_angles(arc_main, 135, 45);
  lv_arc_set_value(arc_main, 0);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_opa(arc_main, LV_OPA_TRANSP, LV_PART_MAIN);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_INDICATOR);
  lv_obj_set_style_arc_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_INDICATOR);
  lv_obj_set_style_arc_rounded(arc_main, true, LV_PART_INDICATOR);

  // knob = 末端小亮点，白色边框 + 内部填状态色 + 发光阴影
  lv_obj_set_style_bg_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_bg_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_pad_all(arc_main, 5, LV_PART_KNOB);
  lv_obj_set_style_radius(arc_main, LV_RADIUS_CIRCLE, LV_PART_KNOB);
  lv_obj_set_style_border_width(arc_main, 3, LV_PART_KNOB);
  lv_obj_set_style_border_color(arc_main, lv_color_hex(0xFFFFFF), LV_PART_KNOB);
  lv_obj_set_style_border_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_shadow_width(arc_main, 18, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_shadow_opa(arc_main, LV_OPA_70, LV_PART_KNOB);
  lv_obj_set_style_shadow_spread(arc_main, 2, LV_PART_KNOB);
  lv_obj_clear_flag(arc_main, LV_OBJ_FLAG_CLICKABLE);

  // 第五步：中心圆盘（放数值、趋势线、状态文字）
  center_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(center_circle);
  lv_obj_set_size(center_circle, 140, 140);
  lv_obj_center(center_circle);
  lv_obj_set_style_radius(center_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(center_circle, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(center_circle, lv_color_hex(0x080E1A), 0);
  lv_obj_set_style_bg_grad_color(center_circle, lv_color_hex(0x0C1628), 0);
  lv_obj_set_style_bg_grad_dir(center_circle, LV_GRAD_DIR_VER, 0);
  lv_obj_set_style_border_width(center_circle, 1, 0);
  lv_obj_set_style_border_color(center_circle, lv_color_hex(0x1A3050), 0);
  lv_obj_set_style_border_opa(center_circle, LV_OPA_60, 0);
  lv_obj_set_style_pad_all(center_circle, 0, 0);
  lv_obj_clear_flag(center_circle, LV_OBJ_FLAG_SCROLLABLE);

  // 中心大数字
  label_value = lv_label_create(center_circle);
  lv_label_set_text(label_value, "0");
  lv_obj_set_style_text_font(label_value, &lv_font_montserrat_28, 0);
  lv_obj_set_style_text_color(label_value, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_value, LV_ALIGN_CENTER, 0, -26);

  // 单位标签
  label_unit = lv_label_create(center_circle);
  lv_label_set_text(label_unit, "ADC");
  lv_obj_set_style_text_font(label_unit, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_unit, lv_color_hex(0x506878), 0);
  lv_obj_align(label_unit, LV_ALIGN_CENTER, 0, -6);

  // 趋势折线容器（负责裁剪，防止折线越界）
  trend_container = lv_obj_create(center_circle);
  lv_obj_remove_style_all(trend_container);
  lv_obj_set_size(trend_container, 110, 30);
  lv_obj_align(trend_container, LV_ALIGN_CENTER, 0, 16);
  lv_obj_set_style_bg_opa(trend_container, LV_OPA_TRANSP, 0);
  lv_obj_set_style_pad_all(trend_container, 0, 0);
  lv_obj_set_style_clip_corner(trend_container, true, 0);
  lv_obj_set_style_radius(trend_container, 4, 0);
  lv_obj_clear_flag(trend_container, LV_OBJ_FLAG_SCROLLABLE);

  // 折线底部参考基线
  static lv_point_precise_t refPts[2] = {{0, 28}, {110, 28}};
  lv_obj_t *refLine = lv_line_create(trend_container);
  lv_line_set_points(refLine, refPts, 2);
  lv_obj_set_style_line_color(refLine, lv_color_hex(0x1A2535), 0);
  lv_obj_set_style_line_width(refLine, 1, 0);

  // 趋势折线（初始化所有点到底部）
  for (int i = 0; i < TREND_POINTS; i++) {
    trendLinePoints[i].x = (int32_t)(i * 110 / (TREND_POINTS - 1));
    trendLinePoints[i].y = 28;
  }
  trend_line = lv_line_create(trend_container);
  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
  lv_obj_set_style_line_color(trend_line, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_line_width(trend_line, 2, 0);
  lv_obj_set_style_line_rounded(trend_line, true, 0);
  lv_obj_set_style_line_opa(trend_line, LV_OPA_70, 0);

  // 状态小圆点
  dot_status = lv_obj_create(center_circle);
  lv_obj_remove_style_all(dot_status);
  lv_obj_set_size(dot_status, 8, 8);
  lv_obj_set_style_radius(dot_status, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(dot_status, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(dot_status, 8, 0);
  lv_obj_set_style_shadow_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_opa(dot_status, LV_OPA_50, 0);
  lv_obj_align(dot_status, LV_ALIGN_CENTER, -42, 42);

  // 状态文字
  label_status = lv_label_create(center_circle);
  lv_label_set_text(label_status, "EXCELLENT");
  lv_obj_set_style_text_font(label_status, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_status, LV_ALIGN_CENTER, 3, 42);

  // 顶部标题
  label_title = lv_label_create(scr);
  lv_label_set_text(label_title, "AIR QUALITY");
  lv_obj_set_style_text_font(label_title, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_title, lv_color_hex(0x4A6070), 0);
  lv_obj_set_style_text_letter_space(label_title, 3, 0);
  lv_obj_align(label_title, LV_ALIGN_TOP_MID, 0, 60);

  // 底部评分
  label_score = lv_label_create(scr);
  lv_label_set_text(label_score, "100% CLEAN");
  lv_obj_set_style_text_font(label_score, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_score, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_score, LV_ALIGN_BOTTOM_MID, 0, -8);

  // MIN/MAX 记录（底部评分上方）
  label_minmax = lv_label_create(scr);
  lv_label_set_text(label_minmax, "L:-- H:--");
  lv_obj_set_style_text_font(label_minmax, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_minmax, lv_color_hex(0x3A4A5A), 0);
  lv_obj_align(label_minmax, LV_ALIGN_BOTTOM_MID, 0, -24);
}

// ===================== 更新趋势折线数据 =====================
void updateTrend(int value) {
  trendData[trendIdx] = value;
  trendIdx = (trendIdx + 1) % TREND_POINTS;
  if (trendIdx == 0) trendFull = true;

  int count = trendFull ? TREND_POINTS : trendIdx;
  if (count < 2) return;

  // 找数据范围，用于归一化到折线高度
  int vMin = 4095, vMax = 0;
  for (int i = 0; i < count; i++) {
    if (trendData[i] < vMin) vMin = trendData[i];
    if (trendData[i] > vMax) vMax = trendData[i];
  }
  // 保证最小波动幅度——不然空气太稳定时折线是一条死平线
  if (vMax - vMin < 50) vMax = vMin + 50;

  int chartW = 110;
  int chartH = 26;

  for (int i = 0; i < TREND_POINTS; i++) {
    int x = i * chartW / (TREND_POINTS - 1);
    int y;
    if (i < count) {
      int dataIdx = trendFull ? (trendIdx + i) % TREND_POINTS : i;
      int normalized = (trendData[dataIdx] - vMin) * chartH / (vMax - vMin);
      y = chartH - normalized + 1; // y 轴反转：值越大，点越靠上
    } else {
      y = chartH + 1; // 没数据的位置先放底部
    }
    trendLinePoints[i].x = x;
    trendLinePoints[i].y = y;
  }

  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
}

// ===================== 更新 UI 显示 =====================
void update_ui(int value, int raw) {
  value = constrain(value, 0, 4095);
  raw   = constrain(raw, 0, 4095);

  // 平滑动画：每帧向目标值逼近 18%，数字变化平滑不突兀
  float diff = (float)value - displayValue;
  displayValue += diff * 0.18f;
  int dispVal = (int)(displayValue + 0.5f);

  lv_color_t c  = getColor(dispVal);
  uint32_t dimC = getDimColorHex(dispVal);
  int score     = adcToScore(dispVal);

  // 更新 min/max 记录
  if (raw < minValue) minValue = raw;
  if (raw > maxValue) maxValue = raw;

  // 主弧形 + knob 颜色跟随状态
  lv_arc_set_value(arc_main, dispVal);
  lv_obj_set_style_arc_color(arc_main, c, LV_PART_INDICATOR);
  lv_obj_set_style_bg_color(arc_main, c, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, c, LV_PART_KNOB);

  // 轨道底色
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(dimC), LV_PART_MAIN);

  // 外发光圈：颜色跟随状态 + sin 函数模拟呼吸透明度
  lv_obj_set_style_border_color(glow_circle, c, 0);
  lv_obj_set_style_shadow_color(glow_circle, c, 0);
  static uint32_t breathCount = 0;
  breathCount++;
  float sinVal = sinf((breathCount * 6) % 360 * 3.14159f / 180.0f);
  lv_opa_t breathOpa = (lv_opa_t)(LV_OPA_20 + (int)(sinVal * 25.0f));
  lv_obj_set_style_shadow_opa(glow_circle, breathOpa, 0);
  lv_opa_t borderOpa = (lv_opa_t)(LV_OPA_10 + (int)(sinVal * 15.0f));
  lv_obj_set_style_border_opa(glow_circle, borderOpa, 0);

  // 中心数值
  lv_label_set_text_fmt(label_value, "%d", dispVal);
  lv_obj_set_style_text_color(label_value, c, 0);

  // 状态文字 + 小圆点（小圆点阴影也跟着呼吸）
  lv_label_set_text(label_status, getStatusText(dispVal));
  lv_obj_set_style_text_color(label_status, c, 0);
  lv_obj_set_style_bg_color(dot_status, c, 0);
  lv_obj_set_style_shadow_color(dot_status, c, 0);
  lv_opa_t dotOpa = (lv_opa_t)(LV_OPA_30 + (int)(sinVal * 40.0f));
  lv_obj_set_style_shadow_opa(dot_status, dotOpa, 0);

  // 趋势线颜色
  lv_obj_set_style_line_color(trend_line, c, 0);

  // MIN/MAX
  lv_label_set_text_fmt(label_minmax, "L:%d  H:%d", minValue, maxValue);

  // 底部洁净度评分
  const char *statusWord;
  if (score >= 80)      statusWord = "CLEAN";
  else if (score >= 60) statusWord = "FAIR";
  else if (score >= 40) statusWord = "HAZY";
  else if (score >= 20) statusWord = "DIRTY";
  else                  statusWord = "TOXIC";
  lv_label_set_text_fmt(label_score, "%d%% %s", score, statusWord);
  lv_obj_set_style_text_color(label_score, c, 0);
}

// ===================== setup =====================
void setup() {
  Serial.begin(115200);
  delay(200);

  // 第一步：背光拉高，不做这步屏幕永远黑
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 第二步：配置 ADC（12 位精度，0-3.3V 量程）
  // 注：ADC_11db 在 ESP32 Core 3.x 中等同于 ADC_ATTEN_DB_12，兼容旧写法
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // 第三步：启动显示屏，SPI 频率 40MHz
  gfx.begin(40000000);

  // 第四步：初始化 LVGL
  lv_init();
  lv_tick_set_cb(my_tick_cb);

  lv_display_t *disp = lv_display_create(SCREEN_WIDTH, SCREEN_HEIGHT);
  lv_display_set_color_format(disp, LV_COLOR_FORMAT_RGB565);
  lv_display_set_buffers(disp, draw_buf, NULL, sizeof(draw_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(disp, my_disp_flush);

  // 第五步：构建界面，初始化为 0 值
  create_ui();
  displayValue = 0;
  update_ui(0, 0);

  Serial.println("[SYS] Gauge v3.1 Ready!");
}

// ===================== loop =====================
void loop() {
  static uint32_t lastSensorMs = 0;
  static uint32_t lastTrendMs  = 0;
  static uint32_t lastLogMs    = 0;

  uint32_t now = millis();

  // 每 50ms：读传感器 + 刷新 UI（约 20fps，流畅无卡顿感）
  if (now - lastSensorMs >= 50) {
    int raw = analogRead(MQ135_PIN);
    raw = constrain(raw, 0, 4095);

    if (firstSample) {
      // 第一帧直接赋值，跳过从 0 开始的动画过渡
      smoothedValue = raw;
      displayValue  = raw;
      firstSample   = false;
    } else {
      // 指数加权平均：新值占 12%，旧值保留 88%，平滑但不迟钝
      smoothedValue = smoothedValue * 0.88f + raw * 0.12f;
    }

    update_ui((int)smoothedValue, raw);
    lastSensorMs = now;
  }

  // 每 300ms：推一个数据点到趋势折线（40 点 × 300ms ≈ 12 秒覆盖一屏历史）
  if (now - lastTrendMs >= 300) {
    updateTrend((int)smoothedValue);
    lastTrendMs = now;
  }

  // 每 1s：串口输出调试日志（查问题时打开串口监视器看）
  if (now - lastLogMs >= 1000) {
    Serial.printf("SCORE=%d%%  ADC=%d  SMOOTH=%d  L=%d H=%d [%s]\n",
                  adcToScore((int)smoothedValue),
                  analogRead(MQ135_PIN),
                  (int)smoothedValue,
                  minValue, maxValue,
                  getStatusText((int)smoothedValue));
    lastLogMs = now;
  }

  lv_timer_handler(); // LVGL 内部任务调度，必须周期性调用，不能漏
  delay(5);
}
```

### 代码说明

几个关键设计说一下，不然看代码容易一头雾水：

**① 为什么用指数加权平均，不直接显示原始 ADC？**

MQ135 的模拟输出带一定噪声，直接显示数字会不停跳变。指数加权平均（EMA）公式：

```
新平滑值 = 旧平滑值 × 0.88 + 原始值 × 0.12
```

0.12 的权重意味着新数据影响较小，数值变化平缓但跟得上趋势。想让响应更灵敏，把 `0.12f` 调大（上限 1.0 = 完全不平滑）；想更稳定，把 `0.88f` 调大。

**② 呼吸效果怎么实现的？**

`update_ui()` 里用 `sinf()` 生成一个 −1 到 +1 周期变化的值，映射到透明度范围（`LV_OPA_20` ～ `LV_OPA_45`），每次调用时计数器递增。外圈边框和阴影的透明度就这样周期性淡入淡出，像在"呼吸"。

**③ 趋势折线为什么有时是平的？**

当环境非常稳定，历史数据最大最小值差距很小时，折线被强制拉到至少 50 ADC 的波动范围：

```cpp
if (vMax - vMin < 50) vMax = vMin + 50;
```

这样即便空气没变化，折线也不会变成一条死平线，还能看出微小波动。

---

## 常见问题排查

别慌，80% 的问题出在这几个地方：

**屏幕全黑，毫无反应**
第一件事：检查 BL 引脚是否接到 GPIO 7，代码里 `digitalWrite(TFT_BL, HIGH)` 有没有执行。背光没开，屏幕肯定黑——这不是屏坏了，是背光没拉高。

**屏幕全白或全红（有颜色但没内容）**
九成概率是 DC 和 CS 引脚接反了。对照接线表把这两根线检查一遍，或者直接交换试试。

**编译报错：`lv_font_montserrat_28 undeclared`**
`lv_conf.h` 没有正确配置，或者放错了位置。回头看"需要安装的库"章节，按步骤把字体选项从 0 改为 1。

**ADC 读数一直是 0 或 4095 不变化**
用万用表量 MQ135 的 A0 脚输出电压，正常应在 0.5V～2.5V 之间波动。如果是 0V 检查 VCC 接线；如果是满量程（3.3V），传感器可能没预热够——新传感器刚通电读数不稳定，等 3 分钟再看。

**数值显示抖动厉害**
把代码里的平滑系数 `0.88f` 改大（比如 `0.95f`），平滑程度增加，代价是响应变慢。

**LVGL 编译提示内存不足或运行时卡死**
把 `DRAW_BUF_LINES` 从 40 改小（比如 20），减少缓冲区占用。ESP32-S3 标配 RAM 足够，如果用的是 RAM 较小的板子才会遇到这个问题。

---

## FAQ

**Q：GPIO 13 是固定的吗？可以换成别的 ADC 引脚吗？**
A：可以换。ESP32-S3 上 GPIO 1～10 属于 ADC1，GPIO 11～20 属于 ADC2。本项目不使用 Wi-Fi，ADC2 引脚（含 GPIO 13）没有冲突，正常可用。如果后续要加 Wi-Fi，建议把传感器换到 ADC1 引脚（GPIO 1～10），避免 Wi-Fi 占用 ADC2 时读数出错。

**Q：MQ135 接 3.3V 供电，读数到底准不准？**
A：不够精准，但做趋势展示完全够用。MQ135 额定电压 5V，用 3.3V 供电时加热丝功率约为标准的 44%，灵敏度下降、绝对值偏低。如果要换算成 ppm 浓度，建议用 5V 单独给 VCC，A0 模拟输出不超过 3.3V，不需要额外分压电路。

**Q：LVGL 必须用 v9 吗？v8 能不能跑？**
A：v8 不能直接跑本代码。v9 引入了 `lv_display_t`、`lv_display_create` 等新 API，v8 里没有这些结构体，直接编译会报大量错误。强烈建议安装 v9.2.x 起步的版本，不要降级。

**Q：圆屏四个角有黑色"缺口"，是不是焊坏了？**
A：正常现象，不是问题。GC9A01 是圆形显示区域，底层 buffer 是 240×240 方形，四角是屏幕物理遮光结构，没有实际像素点，不显示内容是正确的。

**Q：传感器刚通电时数值跳得很厉害，要等多久才稳？**
A：MQ135 需要预热。新传感器建议连续通电 24～48 小时后读数才稳定；已经用过的传感器通电约 3 分钟后趋于平稳。可以在 `setup()` 末尾加 `delay(180000)`（3 分钟），或者在 UI 上加一个"预热中"状态提示，到时间后再正式开始采集。

**Q：屏幕刷新有点卡，怎么提速？**
A：两个方向：① 把 `gfx.begin(40000000)` 里的 SPI 频率改到 80MHz（GC9A01 最大支持 80MHz，但部分板子布线质量差时不稳定，建议先测试）；② 增大 `DRAW_BUF_LINES`（如改为 60），减少 LVGL 分块刷新的次数，代价是多占约 9KB RAM。

---

## 延伸玩法

跑起来之后，可以往这几个方向继续扩展：

- 接 BME280，加一路温湿度，仪表盘多显示一行数据
- 通过 Wi-Fi 把 ADC 数据上报 Home Assistant，做长期历史曲线
- 加按键切换显示模式（仪表盘 / 大字模式 / 纯折线）
- 换 MQ-7 传感器，专门监测一氧化碳浓度
- 加蜂鸣器，空气质量进入 DANGER 区时触发告警

---

## 参考资料

- [GC9A01 驱动芯片数据手册（Galaxycore 官方）](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [MQ135 传感器规格书（Winsen 炜盛官方）](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ135%20(Ver1.4)%20-%20Manual.pdf)
- [Arduino_GFX_Library GitHub 主页](https://github.com/moononournation/Arduino_GFX)
- [LVGL 官方文档 v9](https://docs.lvgl.io/9.0/)
<!-- - [ESP32-S3 技术参考手册（Espressif 官方）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf) -->