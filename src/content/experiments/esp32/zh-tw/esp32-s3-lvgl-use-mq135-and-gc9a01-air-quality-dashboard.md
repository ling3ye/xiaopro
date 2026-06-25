---
title: "ESP32-S3 驅動 GC9A01 圓屏 + MQ135 製作空氣品質儀表板完整教學（LVGL v9 + SPI 介面 + Arduino C++）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-25
intro: "用 ESP32-S3 + MQ135 氣體感測器 + GC9A01 1.28 吋圓屏，搭配 LVGL v9 做一個帶動態弧形錶盤、即時趨勢折線、呼吸發光效果的空氣品質儀表板，含完整接線、程式碼和踩坑紀錄。"
image: "https://img.lingflux.com/2026/06/4217f9f4026039eeca35a691450313dc.jpg"
---




> 難度：⭐⭐☆☆☆（幾根杜邦線就能上手）
> 預計時間：45 分鐘
> 測試環境：Arduino IDE 2.3.8 · ESP32 Arduino Core 3.x · lvgl v9.5.0 · Arduino_GFX_Library v1.6.5

---

> **TL;DR（只想跑起來？看這裡）**
>
> **期望管理：** 本專案僅供入門、桌面擺件和純粹的視覺享受。**千萬別拿它去測真正的有害氣體洩漏！** 它的準頭基本屬於「玄學」。
>
> 1. **接線**：MQ135 A0 → GPIO 13；GC9A01 按下表接 GPIO 7 / 9 / 10 / 11 / 12 / 18
> 2. **裝庫**：Arduino 函式庫管理器搜 `lvgl`（選 v9.x）+ `Arduino_GFX_Library`
> 3. **配置 lv_conf.h**：開啟 `LV_FONT_MONTSERRAT_14` 和 `LV_FONT_MONTSERRAT_28`（改 0 → 1）
> 4. 燒錄 → 圓屏亮起，儀表板開始轉動

---

## 前言

在我那堆吃灰的感測器中又找到一個專門檢測空氣品質的感測器——MQ135模組。想著看看工作室的空氣品質吧，就連接上測試了一番，看說明文件告訴我這模組預熱要24小時，感覺只能玩玩。不過，這模組對一堆氣體是敏感的，雖然不一定準，但數值升高，相對來說就存在某些氣體，可能是二氧化碳，氨氣，苯，酒精，煙霧。用來做房間是否需要通風的相對數值判斷，應該是可以的。

於是就有了這個專案：ESP32-S3 + MQ135 氣體感測器 + GC9A01 1.28 吋圓屏，搭配大名鼎鼎的 LVGL v9 圖形函式庫，做一個有弧形錶盤、即時趨勢折線、還會「呼吸」變色的空氣品質儀表板。

本文目標：**從零接線到燒錄成功，完整重現這個效果。**

---

## 實驗效果

圓屏即時顯示當前空氣品質 ADC 數值、狀態等級（EXCELLENT / GOOD / FAIR / MODERATE / POOR / DANGER）和歷史趨勢折線；錶盤顏色隨空氣品質從綠漸變到紅，外圈帶節奏感「呼吸」光效。螢幕左下角同時記錄本次上電後的最低值和最高值。



---

## 元件說明

> 開發板（ESP32-S3）本文不做介紹，以下只說新手可能沒接觸過的兩個模組。

### MQ135 氣體感測器

MQ135 是一款氣敏感測器，負責檢測空氣中 CO₂、氨氣、苯等有害氣體的濃度變化，用在本專案裡的作用是輸出 0～4095 的類比 ADC 數值，反映當前環境的空氣品質等級。

用大白話說：**它是一個化學「鼻子」**，空氣越渾濁，輸出電壓越高，ADC 數值越大。

| 參數 | 值 |
|------|-----|
| 標準工作電壓 | 5V（加熱絲）/ 類比輸出相容 3.3V |
| 輸出介面 | 類比（A0）+ 數位（D0） |
| 預熱時間 | 24～48 小時（滿精度）/ 約 3 分鐘（趨勢參考） |
| 可檢測氣體 | CO₂、NH₃、NOₓ、苯、酒精、煙霧 |

**關於 3.3V 供電：** MQ135 標準電壓是 5V，用 3.3V 供電時加熱絲功率約為標準的 44%，靈敏度下降、讀數偏低，但夠用於趨勢展示和相對變化檢測。如果追求絕對精度，建議單獨用 5V 給 VCC，A0 類比輸出不超過 3.3V，無需分壓可直接接 ESP32-S3。

選它的原因：**便宜（5 塊錢以內）、模組化、直接接線就能用**，對這個「顏值向」專案足夠了。

**使用 MQ135 做室內判斷的正確姿勢**

```
✅ 適合做：
  - 空氣品質變化趨勢監測（相對值）
  - 觸發通風/警報的閾值判斷
  - 多種有害氣體「綜合污染」指示

❌ 不適合做：
  - 精確的單一氣體濃度測量
  - 醫療/工業級安全合規檢測
  - CO₂ 精確值（誤差可達 ±300ppm 以上）
```

---

### GC9A01 1.28 吋圓形 TFT 顯示屏

GC9A01 是一款 1.28 吋圓形 TFT LCD 顯示屏，透過 SPI 介面接收圖像資料並渲染，用在本專案裡的作用是顯示帶動畫效果的儀表板 UI 介面。

類比：**就是智慧手錶上那種可以隨便畫內容的圓形錶盤。**

| 參數 | 值 |
|------|-----|
| 螢幕尺寸 | 1.28 吋 |
| 解析度 | 240 × 240 像素 |
| 介面 | SPI（最高 80 MHz） |
| 驅動晶片 | GC9A01 |
| 工作電壓 | 3.3V |
| 背光控制 | 支援（BL 接腳，可 PWM 調光） |

選它的原因：**圓形外觀獨特、尺寸小巧、3.3V 直用、Arduino_GFX_Library 原生支援**，搭 LVGL 做錶盤視覺效果拔群。

---

## BOM 表

| 元件 | 型號 / 規格 | 數量 |
|------|------------|------|
| 主控開發板 | ESP32-S3（帶 USB-C）| 1 |
| 圓形 TFT 屏 | GC9A01 1.28" 240×240 | 1 |
| 氣體感測器 | MQ135 模組 | 1 |
| 連接線 | 杜邦線 | 若干 |



---

## 元件接腳說明

### MQ135 模組接腳

| 接腳 | 說明 |
|------|------|
| VCC | 供電（本專案接 3.3V，標準為 5V） |
| GND | 接地 |
| A0 | 類比信號輸出，接 ESP32-S3 ADC 接腳 |
| D0 | 數位輸出（本專案不使用）輸出**高低電位（HIGH / LOW）** |

### GC9A01 模組接腳

| 接腳標註 | 說明 |
|---------|------|
| VCC | 3.3V 供電 |
| GND | 接地 |
| SCL / CLK | SPI 時鐘 |
| SDA / MOSI | SPI 資料 |
| CS | 片選（低電位啟動） |
| DC | 資料/命令切換 |
| RST | 重置（低電位重置） |
| BL | 背光控制（HIGH = 亮）（可選，不一定每個模組都引出） |

---

## 接線方式

### MQ135 → ESP32-S3

| MQ135 | ESP32-S3 |
|-------|----------|
| VCC | 5V |
| GND | GND |
| A0 | GPIO 13 |

### GC9A01 → ESP32-S3

| GC9A01 接腳 | ESP32-S3 GPIO |
|------------|---------------|
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL（背光）| GPIO 7 （如果沒有可以不接） |

> **實用提醒：** 接完線後，對著上面兩張表**逐行核對一遍**，能省掉 80% 的排錯時間。最容易接反的是 DC 和 CS——這兩根線位置一換，螢幕要麼全白要麼全黑，看著很像「螢幕壞了」，其實只是線插錯了。

---

## 需要安裝的函式庫

開啟 Arduino IDE → 工具 → 管理函式庫，搜尋並安裝以下兩個：

| 函式庫名稱 | 作者 | 本文測試通過版本 |
|------|------|-----------------|
| `lvgl` | LVGL | v9.5.0 |
| `Arduino_GFX_Library` | Moon On Our Nation | v1.6.5 |

**安裝完 lvgl 之後，還有一步必須做：**

1. 找到 lvgl 函式庫目錄（通常在 `文件/Arduino/libraries/lvgl/`）
2. 把裡面的 `lv_conf_template.h` 複製一份，重新命名為 `lv_conf.h`，放到 `lvgl/` 的同級目錄下
3. 開啟 `lv_conf.h`，找到下面兩行，把 `0` 改成 `1`：
   ```c
   #define LV_FONT_MONTSERRAT_14  1
   #define LV_FONT_MONTSERRAT_28  1
   ```
4. 開啟 `lv_conf.h`，找到最開投的` #if 0 ` 改為 ` #if 1`

> 忘記這一些步，直接燒錄的話，編譯會報 `lv_font_montserrat_28 undeclared`。別問我怎麼知道的。

---

## 完整程式碼

```cpp
/*
 * ESP32-S3 + GC9A01 圓屏空氣品質儀表板 v3.1
 * "極簡科技風" - 弧形進度條 + 即時趨勢折線 + 呼吸發光
 *
 * 測試環境：Arduino IDE 2.3.2 / ESP32 Core 3.x
 * 依賴函式庫：lvgl v9.2.x + Arduino_GFX_Library v1.4.x
 */

#include <Arduino.h>
#include <lvgl.h>
#include <Arduino_GFX_Library.h>
#include <math.h>

// ===================== 接腳定義 =====================
#define TFT_SCK    12   // SPI 時鐘
#define TFT_MOSI   11   // SPI 資料
#define TFT_CS     9    // 片選
#define TFT_DC     10   // 資料/命令切換（接反了螢幕會全白）
#define TFT_RST    18   // 重置
#define TFT_BL     7    // 背光——HIGH 才亮，這根線忘了接等於白做
#define MQ135_PIN  13   // MQ135 類比輸入（ADC2 通道，無 Wi-Fi 時正常使用）

#define SCREEN_WIDTH   240
#define SCREEN_HEIGHT  240

// ===================== 初始化顯示驅動 =====================
Arduino_ESP32SPI bus = Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01 gfx = Arduino_GC9A01(&bus, TFT_RST, 0, true);

// ===================== LVGL 繪製緩衝區 =====================
// 40 行緩衝在 ESP32-S3 上記憶體佔用約 19KB，速度和記憶體比較均衡
#define DRAW_BUF_LINES 40
alignas(4) static uint16_t draw_buf[SCREEN_WIDTH * DRAW_BUF_LINES];

// ===================== 趨勢歷史資料 =====================
#define TREND_POINTS 40    // 保留最近 40 個採樣點（× 300ms ≈ 12 秒一屏歷史）
static int trendData[TREND_POINTS] = {0};
static int trendIdx = 0;
static bool trendFull = false;
static lv_point_precise_t trendLinePoints[TREND_POINTS];

// ===================== LVGL UI 物件句柄 =====================
static lv_obj_t *arc_bg;          // 弧形軌道背景（暗色）
static lv_obj_t *arc_main;        // 主弧形 + 末端 knob 小圓點
static lv_obj_t *glow_circle;     // 外發光邊框圈（會呼吸）
static lv_obj_t *center_circle;   // 中心圓盤底板
static lv_obj_t *label_value;     // 中心大數字（ADC 值）
static lv_obj_t *label_unit;      // 單位標籤 "ADC"
static lv_obj_t *label_status;    // 狀態文字（EXCELLENT / GOOD...）
static lv_obj_t *dot_status;      // 狀態小圓點
static lv_obj_t *label_title;     // 頂部標題 "AIR QUALITY"
static lv_obj_t *label_score;     // 底部潔淨度評分
static lv_obj_t *label_minmax;    // 最低/最高值
static lv_obj_t *trend_line;      // 趨勢折線
static lv_obj_t *trend_container; // 折線裁切容器

// ===================== 感測器狀態 =====================
static float smoothedValue = 0.0f; // 指數加權平均後的平滑值
static bool firstSample = true;    // 第一幀標誌，避免從 0 開始動畫
static int minValue = 4095;        // 本次上電最低 ADC 值
static int maxValue = 0;           // 本次上電最高 ADC 值
static float displayValue = 0.0f;  // UI 動畫插值用

// ===================== LVGL 時鐘回調 =====================
static uint32_t my_tick_cb(void) { return millis(); }

// ===================== 重新整理回調：LVGL 渲染完一塊區域後推給螢幕 =====================
void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = area->x2 - area->x1 + 1;
  uint32_t h = area->y2 - area->y1 + 1;
  gfx.draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)px_map, w, h);
  lv_display_flush_ready(disp); // 告訴 LVGL：這塊畫完了，可以繼續下一塊
}

// ===================== 顏色系統：ADC 值 → 狀態色 =====================
// 數值越高 = 空氣越差 = 顏色越紅，六個檔位對應六種狀態
uint32_t getColorHex(int v) {
  if (v < 600)  return 0x00E5A0; // EXCELLENT：清新綠
  if (v < 1200) return 0x22C55E; // GOOD：淺綠
  if (v < 2000) return 0xA3E635; // FAIR：黃綠
  if (v < 2800) return 0xEAB308; // MODERATE：黃
  if (v < 3500) return 0xF97316; // POOR：橙
  return 0xFF3355;                // DANGER：紅（快開窗吧）
}

lv_color_t getColor(int v) {
  return lv_color_hex(getColorHex(v));
}

// 弧形軌道底色（狀態色的深色版，配合深色背景）
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

// ADC 值轉潔淨度百分比（ADC 越低 = 越乾淨 = 分數越高）
int adcToScore(int adc) {
  adc = constrain(adc, 0, 4095);
  return constrain(100 - (adc * 100 / 4095), 0, 100);
}

// ===================== 建立 UI 介面 =====================
void create_ui() {
  lv_obj_t *scr = lv_screen_active();

  // 第一步：深色背景
  lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(scr, lv_color_hex(0x050810), 0);

  // 第二步：最外圈發光邊框（顏色跟隨狀態，有呼吸動畫）
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

  // 第三步：弧形軌道底色（顯示「還沒到達」的暗色區域）
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

  // 第四步：主弧形（即時數值 + 末端 knob 小圓點）
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

  // knob = 末端小亮點，白色邊框 + 內部填狀態色 + 發光陰影
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

  // 第五步：中心圓盤（放數值、趨勢線、狀態文字）
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

  // 中心大數字
  label_value = lv_label_create(center_circle);
  lv_label_set_text(label_value, "0");
  lv_obj_set_style_text_font(label_value, &lv_font_montserrat_28, 0);
  lv_obj_set_style_text_color(label_value, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_value, LV_ALIGN_CENTER, 0, -26);

  // 單位標籤
  label_unit = lv_label_create(center_circle);
  lv_label_set_text(label_unit, "ADC");
  lv_obj_set_style_text_font(label_unit, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_unit, lv_color_hex(0x506878), 0);
  lv_obj_align(label_unit, LV_ALIGN_CENTER, 0, -6);

  // 趨勢折線容器（負責裁切，防止折線越界）
  trend_container = lv_obj_create(center_circle);
  lv_obj_remove_style_all(trend_container);
  lv_obj_set_size(trend_container, 110, 30);
  lv_obj_align(trend_container, LV_ALIGN_CENTER, 0, 16);
  lv_obj_set_style_bg_opa(trend_container, LV_OPA_TRANSP, 0);
  lv_obj_set_style_pad_all(trend_container, 0, 0);
  lv_obj_set_style_clip_corner(trend_container, true, 0);
  lv_obj_set_style_radius(trend_container, 4, 0);
  lv_obj_clear_flag(trend_container, LV_OBJ_FLAG_SCROLLABLE);

  // 折線底部參考基線
  static lv_point_precise_t refPts[2] = {{0, 28}, {110, 28}};
  lv_obj_t *refLine = lv_line_create(trend_container);
  lv_line_set_points(refLine, refPts, 2);
  lv_obj_set_style_line_color(refLine, lv_color_hex(0x1A2535), 0);
  lv_obj_set_style_line_width(refLine, 1, 0);

  // 趨勢折線（初始化所有點到底部）
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

  // 狀態小圓點
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

  // 狀態文字
  label_status = lv_label_create(center_circle);
  lv_label_set_text(label_status, "EXCELLENT");
  lv_obj_set_style_text_font(label_status, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_status, LV_ALIGN_CENTER, 3, 42);

  // 頂部標題
  label_title = lv_label_create(scr);
  lv_label_set_text(label_title, "AIR QUALITY");
  lv_obj_set_style_text_font(label_title, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_title, lv_color_hex(0x4A6070), 0);
  lv_obj_set_style_text_letter_space(label_title, 3, 0);
  lv_obj_align(label_title, LV_ALIGN_TOP_MID, 0, 60);

  // 底部評分
  label_score = lv_label_create(scr);
  lv_label_set_text(label_score, "100% CLEAN");
  lv_obj_set_style_text_font(label_score, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_score, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_score, LV_ALIGN_BOTTOM_MID, 0, -8);

  // MIN/MAX 記錄（底部評分上方）
  label_minmax = lv_label_create(scr);
  lv_label_set_text(label_minmax, "L:-- H:--");
  lv_obj_set_style_text_font(label_minmax, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_minmax, lv_color_hex(0x3A4A5A), 0);
  lv_obj_align(label_minmax, LV_ALIGN_BOTTOM_MID, 0, -24);
}

// ===================== 更新趨勢折線資料 =====================
void updateTrend(int value) {
  trendData[trendIdx] = value;
  trendIdx = (trendIdx + 1) % TREND_POINTS;
  if (trendIdx == 0) trendFull = true;

  int count = trendFull ? TREND_POINTS : trendIdx;
  if (count < 2) return;

  // 找資料範圍，用於歸一化到折線高度
  int vMin = 4095, vMax = 0;
  for (int i = 0; i < count; i++) {
    if (trendData[i] < vMin) vMin = trendData[i];
    if (trendData[i] > vMax) vMax = trendData[i];
  }
  // 保證最小波動幅度——不然空氣太穩定時折線是一條死平線
  if (vMax - vMin < 50) vMax = vMin + 50;

  int chartW = 110;
  int chartH = 26;

  for (int i = 0; i < TREND_POINTS; i++) {
    int x = i * chartW / (TREND_POINTS - 1);
    int y;
    if (i < count) {
      int dataIdx = trendFull ? (trendIdx + i) % TREND_POINTS : i;
      int normalized = (trendData[dataIdx] - vMin) * chartH / (vMax - vMin);
      y = chartH - normalized + 1; // y 軸反轉：值越大，點越靠上
    } else {
      y = chartH + 1; // 沒資料的位置先放底部
    }
    trendLinePoints[i].x = x;
    trendLinePoints[i].y = y;
  }

  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
}

// ===================== 更新 UI 顯示 =====================
void update_ui(int value, int raw) {
  value = constrain(value, 0, 4095);
  raw   = constrain(raw, 0, 4095);

  // 平滑動畫：每幀向目標值逼近 18%，數字變化平滑不突兀
  float diff = (float)value - displayValue;
  displayValue += diff * 0.18f;
  int dispVal = (int)(displayValue + 0.5f);

  lv_color_t c  = getColor(dispVal);
  uint32_t dimC = getDimColorHex(dispVal);
  int score     = adcToScore(dispVal);

  // 更新 min/max 記錄
  if (raw < minValue) minValue = raw;
  if (raw > maxValue) maxValue = raw;

  // 主弧形 + knob 顏色跟隨狀態
  lv_arc_set_value(arc_main, dispVal);
  lv_obj_set_style_arc_color(arc_main, c, LV_PART_INDICATOR);
  lv_obj_set_style_bg_color(arc_main, c, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, c, LV_PART_KNOB);

  // 軌道底色
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(dimC), LV_PART_MAIN);

  // 外發光圈：顏色跟隨狀態 + sin 函數模擬呼吸透明度
  lv_obj_set_style_border_color(glow_circle, c, 0);
  lv_obj_set_style_shadow_color(glow_circle, c, 0);
  static uint32_t breathCount = 0;
  breathCount++;
  float sinVal = sinf((breathCount * 6) % 360 * 3.14159f / 180.0f);
  lv_opa_t breathOpa = (lv_opa_t)(LV_OPA_20 + (int)(sinVal * 25.0f));
  lv_obj_set_style_shadow_opa(glow_circle, breathOpa, 0);
  lv_opa_t borderOpa = (lv_opa_t)(LV_OPA_10 + (int)(sinVal * 15.0f));
  lv_obj_set_style_border_opa(glow_circle, borderOpa, 0);

  // 中心數值
  lv_label_set_text_fmt(label_value, "%d", dispVal);
  lv_obj_set_style_text_color(label_value, c, 0);

  // 狀態文字 + 小圓點（小圓點陰影也跟著呼吸）
  lv_label_set_text(label_status, getStatusText(dispVal));
  lv_obj_set_style_text_color(label_status, c, 0);
  lv_obj_set_style_bg_color(dot_status, c, 0);
  lv_obj_set_style_shadow_color(dot_status, c, 0);
  lv_opa_t dotOpa = (lv_opa_t)(LV_OPA_30 + (int)(sinVal * 40.0f));
  lv_obj_set_style_shadow_opa(dot_status, dotOpa, 0);

  // 趨勢線顏色
  lv_obj_set_style_line_color(trend_line, c, 0);

  // MIN/MAX
  lv_label_set_text_fmt(label_minmax, "L:%d  H:%d", minValue, maxValue);

  // 底部潔淨度評分
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

  // 第一步：背光拉高，不做這步螢幕永遠黑
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 第二步：配置 ADC（12 位精度，0-3.3V 量程）
  // 註：ADC_11db 在 ESP32 Core 3.x 中等同於 ADC_ATTEN_DB_12，相容舊寫法
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // 第三步：啟動顯示屏，SPI 頻率 40MHz
  gfx.begin(40000000);

  // 第四步：初始化 LVGL
  lv_init();
  lv_tick_set_cb(my_tick_cb);

  lv_display_t *disp = lv_display_create(SCREEN_WIDTH, SCREEN_HEIGHT);
  lv_display_set_color_format(disp, LV_COLOR_FORMAT_RGB565);
  lv_display_set_buffers(disp, draw_buf, NULL, sizeof(draw_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(disp, my_disp_flush);

  // 第五步：建構介面，初始化為 0 值
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

  // 每 50ms：讀感測器 + 重新整理 UI（約 20fps，流暢無卡頓感）
  if (now - lastSensorMs >= 50) {
    int raw = analogRead(MQ135_PIN);
    raw = constrain(raw, 0, 4095);

    if (firstSample) {
      // 第一幀直接賦值，跳過從 0 開始的動畫過渡
      smoothedValue = raw;
      displayValue  = raw;
      firstSample   = false;
    } else {
      // 指數加權平均：新值占 12%，舊值保留 88%，平滑但不遲鈍
      smoothedValue = smoothedValue * 0.88f + raw * 0.12f;
    }

    update_ui((int)smoothedValue, raw);
    lastSensorMs = now;
  }

  // 每 300ms：推一個資料點到趨勢折線（40 點 × 300ms ≈ 12 秒覆蓋一屏歷史）
  if (now - lastTrendMs >= 300) {
    updateTrend((int)smoothedValue);
    lastTrendMs = now;
  }

  // 每 1s：串口輸出除錯日誌（查問題時開啟串口監視器看）
  if (now - lastLogMs >= 1000) {
    Serial.printf("SCORE=%d%%  ADC=%d  SMOOTH=%d  L=%d H=%d [%s]\n",
                  adcToScore((int)smoothedValue),
                  analogRead(MQ135_PIN),
                  (int)smoothedValue,
                  minValue, maxValue,
                  getStatusText((int)smoothedValue));
    lastLogMs = now;
  }

  lv_timer_handler(); // LVGL 內部任務調度，必須週期性呼叫，不能漏
  delay(5);
}
```

### 程式碼說明

幾個關鍵設計說一下，不然看程式碼容易一頭霧水：

**① 為什麼用指數加權平均，不直接顯示原始 ADC？**

MQ135 的類比輸出帶一定雜訊，直接顯示數字會不停跳變。指數加權平均（EMA）公式：

```
新平滑值 = 舊平滑值 × 0.88 + 原始值 × 0.12
```

0.12 的權重意味著新資料影響較小，數值變化平緩但跟得上趨勢。想讓回應更靈敏，把 `0.12f` 調大（上限 1.0 = 完全不平滑）；想更穩定，把 `0.88f` 調大。

**② 呼吸效果怎麼實現的？**

`update_ui()` 裡用 `sinf()` 生成一個 −1 到 +1 週期變化的值，映射到透明度範圍（`LV_OPA_20` ～ `LV_OPA_45`），每次呼叫時計數器遞增。外圈邊框和陰影的透明度就這樣週期性淡入淡出，像在「呼吸」。

**③ 趨勢折線為什麼有時是平的？**

當環境非常穩定，歷史資料最大最小值差距很小時，折線被強制拉到至少 50 ADC 的波動範圍：

```cpp
if (vMax - vMin < 50) vMax = vMin + 50;
```

這樣即便空氣沒變化，折線也不會變成一條死平線，還能看出微小波動。

---

## 常見問題排查

別慌，80% 的問題出在這幾個地方：

**螢幕全黑，毫無反應**
第一件事：檢查 BL 接腳是否接到 GPIO 7，程式碼裡 `digitalWrite(TFT_BL, HIGH)` 有沒有執行。背光沒開，螢幕肯定黑——這不是屏壞了，是背光沒拉高。

**螢幕全白或全紅（有顏色但沒內容）**
九成機率是 DC 和 CS 接腳接反了。對照接線表把這兩根線檢查一遍，或者直接交換試試。

**編譯報錯：`lv_font_montserrat_28 undeclared`**
`lv_conf.h` 沒有正確配置，或者放錯了位置。回頭看「需要安裝的函式庫」章節，按步驟把字體選項從 0 改為 1。

**ADC 讀數一直是 0 或 4095 不變化**
用萬用電表量 MQ135 的 A0 接腳輸出電壓，正常應在 0.5V～2.5V 之間波動。如果是 0V 檢查 VCC 接線；如果是滿量程（3.3V），感測器可能沒預熱夠——新感測器剛通電讀數不穩定，等 3 分鐘再看。

**數值顯示抖動厲害**
把程式碼裡的平滑係數 `0.88f` 改大（比如 `0.95f`），平滑程度增加，代價是回應變慢。

**LVGL 編譯提示記憶體不足或運行時卡死**
把 `DRAW_BUF_LINES` 從 40 改小（比如 20），減少緩衝區佔用。ESP32-S3 標配 RAM 足夠，如果用的是 RAM 較小的板子才會遇到這個問題。

---

## FAQ

**Q：GPIO 13 是固定的嗎？可以換成別的 ADC 接腳嗎？**
A：可以換。ESP32-S3 上 GPIO 1～10 屬於 ADC1，GPIO 11～20 屬於 ADC2。本專案不使用 Wi-Fi，ADC2 接腳（含 GPIO 13）沒有衝突，正常可用。如果後續要加 Wi-Fi，建議把感測器換到 ADC1 接腳（GPIO 1～10），避免 Wi-Fi 佔用 ADC2 時讀數出錯。

**Q：MQ135 接 3.3V 供電，讀數到底準不准？**
A：不夠精準，但做趨勢展示完全夠用。MQ135 額定電壓 5V，用 3.3V 供電時加熱絲功率約為標準的 44%，靈敏度下降、絕對值偏低。如果要換算成 ppm 濃度，建議用 5V 單獨給 VCC，A0 類比輸出不超過 3.3V，不需要額外分壓電路。

**Q：LVGL 必須用 v9 嗎？v8 能不能跑？**
A：v8 不能直接跑本程式碼。v9 引入了 `lv_display_t`、`lv_display_create` 等新 API，v8 裡沒有這些結構體，直接編譯會報大量錯誤。強烈建議安裝 v9.2.x 起步的版本，不要降級。

**Q：圓屏四個角有黑色「缺口」，是不是焊壞了？**
A：正常現象，不是問題。GC9A01 是圓形顯示區域，底層 buffer 是 240×240 方形，四角是螢幕物理遮光結構，沒有實際像素點，不顯示內容是正確的。

**Q：感測器剛通電時數值跳得很厲害，要等多久才穩？**
A：MQ135 需要預熱。新感測器建議連續通電 24～48 小時後讀數才穩定；已經用過的感測器通電約 3 分鐘後趨於平穩。可以在 `setup()` 末尾加 `delay(180000)`（3 分鐘），或者在 UI 上加一個「預熱中」狀態提示，到時間後再正式開始採集。

**Q：螢幕重新整理有點卡，怎麼提速？**
A：兩個方向：① 把 `gfx.begin(40000000)` 裡的 SPI 頻率改到 80MHz（GC9A01 最大支援 80MHz，但部分板子佈線質量差時不穩定，建議先測試）；② 增大 `DRAW_BUF_LINES`（如改為 60），減少 LVGL 分塊重新整理的次數，代價是多佔約 9KB RAM。

---

## 延伸玩法

跑起來之後，可以往這幾個方向繼續擴展：

- 接 BME280，加一路溫濕度，儀表板多顯示一行資料
- 透過 Wi-Fi 把 ADC 資料上報 Home Assistant，做長期歷史曲線
- 加按鍵切換顯示模式（儀表板 / 大字模式 / 純折線）
- 換 MQ-7 感測器，專門監測一氧化碳濃度
- 加蜂鳴器，空氣品質進入 DANGER 區時觸發告警

---

## 參考資料

- [GC9A01 驅動晶片資料手冊（Galaxycore 官方）](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [MQ135 感測器規格書（Winsen 焜盛官方）](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ135%20(Ver1.4)%20-%20Manual.pdf)
- [Arduino_GFX_Library GitHub 主頁](https://github.com/moononournation/Arduino_GFX)
- [LVGL 官方文件 v9](https://docs.lvgl.io/9.0/)
- [ESP32-S3 技術參考手冊（Espressif 官方）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)