---
title: "ESP32-S3 + $3 小彩屏跑 LVGL 动画｜0 基础 10 分钟搞定"
boardId: esp32s3
moduleId: display/tft096-st7735s
category: esp32
date: 2026-04-10
intro: "ESP32-S3 驱动 0.96 寸 ST7735S TFT 彩屏，跑 LVGL 动画效果。从接线到完整代码，附避坑指南，适合 Arduino 和嵌入式开发新手。"
image: "https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png"
---

# ESP32-S3 + $3 小彩屏跑 LVGL 动画！0 基础 10 分钟搞定（2026 最新避坑版）

> **一句话摘要**：ESP32-S3 驱动 0.96 寸 ST7735S TFT 屏 + LVGL 动画效果，接线 5 核心引脚 + 完整避坑指南

## 最终效果

![image-20260410152138611](https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png)

> 小到指甲盖的 0.96 寸屏幕，也能跑出丝滑的 LVGL 动画。本文从接线到代码全部讲透，帮你把坑提前踩完。

------

Youtube：

<iframe width="560" height="315" src="https://www.youtube.com/embed/CQLLgFDcRxQ?si=FN2UYXNuTbGifnBN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

------

## 你能学到什么

1. ESP32-S3 如何通过 SPI 驱动 ST7735S 0.96 寸 TFT 彩屏
2. Arduino_GFX 库的配置方法（以及为什么不用 TFT_eSPI）
3. LVGL v9 移植到小屏幕的完整流程
4. 一个带双重动画效果的 LVGL UI 示例（左右平移 + 上下弹跳）



## BOM 清单

| 元件                       | 数量 | 备注                          |
| -------------------------- | ---- | ----------------------------- |
| ESP32-S3 开发板            | 1    | 任意 S3 变体均可              |
| 0.96 寸 ST7735S TFT IPS 屏 | 1    | 80×160 分辨率，SPI 接口，8Pin |
| 杜邦线（母对母）           | 若干 | 8 根即可                      |
|                            |      |                               |





## 屏幕规格

![image-20260410113243742](https://img.lingflux.com/2026/04/e66957af12d082ebd30b5b8cdb06de8c.png)

> 不用全部记住，重点关注带 ***** 的参数，这些是写代码时必须用到的。

| 参数     | 规格            | 备注                                                    |
| -------- | --------------- | ------------------------------------------------------- |
| 尺寸     | 0.96 寸 TFT IPS | 全视角，色彩还原好                                      |
| 分辨率   | 80(H) × 160(V)  | ***** 代码中 `screenWidth=160, screenHeight=80`（横屏） |
| 驱动芯片 | ST7735S         | ***** 选库时必须匹配                                    |
| 通信接口 | 4 线 SPI        | 最高 40MHz（推荐先用默认频率测试）                      |
| 工作电压 | **3.3V**        | ***** 千万不要接 5V！                                   |
| 管脚数量 | 8Pin            | 含背光控制脚 BLK                                        |



| 参数       | 规格                      |
| ---------- | ------------------------- |
| 显示区域   | 10.8(H) × 21.7(V) mm      |
| 面板尺寸   | 19(H) × 24(V) × 2.7(D) mm |
| 像素间距   | 0.135(H) × 0.1356(V) mm   |
| 工作电流   | 20mA                      |
| 背光类型   | 1 LED                     |
| 工作温度   | -20 ~ 70°C                |
| PCB 尺寸   | 30.00 × 24.04 mm          |
| 安装孔内径 | 2 mm                      |
| 排针间距   | 2.54 mm                   |

**接口定义：**

| 序号 | 引脚 | 功能说明                                |
| ---- | ---- | --------------------------------------- |
| 1    | GND  | 电源地                                  |
| 2    | VCC  | 电源正（3.3V）                          |
| 3    | SCL  | SPI 时钟信号                            |
| 4    | SDA  | SPI 数据信号                            |
| 5    | RES  | 复位（低电平复位）                      |
| 6    | DC   | 寄存器/数据选择（低=命令，高=数据）     |
| 7    | CS   | 片选（低电平使能）                      |
| 8    | BLK  | 背光控制（高电平点亮；不控制则接 3.3V） |





## 接线方式

| ESP32-S3 引脚 | ST7735S 引脚 | 说明                        |
| ------------- | ------------ | --------------------------- |
| GND           | GND          | 共地                        |
| **3.3V**      | VCC          | **严禁接 5V**               |
| GPIO 12       | SCL          | SPI 时钟                    |
| GPIO 11       | SDA          | SPI 数据（MOSI）            |
| GPIO 21       | RES          | 复位                        |
| GPIO 47       | DC           | 命令/数据选择               |
| GPIO 38       | CS           | 片选                        |
| GPIO 48       | BLK          | 背光（不控制可直接接 3.3V） |



### 接线注意事项

- **电源**：只能接 3.3V，接 5V 会烧屏
- **BLK 背光脚**：不需要软件控制背光时，直接接 3.3V 常亮
- **CS 片选**：低电平有效
- **RES 复位**：上电初始化需要低电平复位
- **引脚选择**：以上引脚使用 ESP32-S3 的 SPI2（FSPI）默认引脚，如果你换了引脚，需要同步修改代码中的宏定义



## 库安装

在 Arduino IDE 中安装以下两个库：

1. **Arduino_GFX_Library** — 搜索 GFX Library for Arduino 安装
2. **LVGL** — 搜索 `lvgl` 安装（需要 **v9.x** 版本）

> **为什么用 Arduino_GFX 而不是 TFT_eSPI？** 
>
> 首先说明一下，我挺喜欢使用TFT_eSPI的，曾经使用它驱动过很多屏幕，并且这两个库都能驱动 ST7735S 屏幕，但配置方式差异很大：
>
> **TFT_eSPI 的问题：需要手动改库源文件**
>
> TFT_eSPI 要求你打开库安装目录下的 `User_Setup.h` 文件，在里面手动修改引脚定义和驱动芯片选择。这意味着：
>
> 1. 你要找到库的安装路径（不同系统路径不同：`Documents/Arduino/libraries/` 或 `.platformio/packages/`）
>
> 2. 在几百行的配置文件中找到正确的行，注释掉默认值，取消注释你要用的值
>
> 3. 如果同时用多个不同屏幕的项目，每次切换都要重新改这个文件
>
> 4. **库更新后配置会被覆盖重置**，你的项目突然就编译不过了
>
>    这也是最常见的抱怨："按照视频教程做了但是白屏"——往往就是 `User_Setup.h` 改错了或者没生效。
>
>    **Arduino_GFX 的做法：引脚直接写在代码里**
>
>    对比一下，Arduino_GFX 的所有配置都在你自己的 `.ino` 文件中完成：
>
> ```c
> // 所有引脚和驱动参数直接在代码里定义，不用改任何库文件
> Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
> Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
> ```
>
> - 换引脚？改一行 `#define`
>
> - 换屏幕？改 `Arduino_ST7735` 为 `Arduino_ILI9341` 等其他驱动
>
> - 库更新？不影响你的代码
>
> - 多项目共存？每个项目各自定义，互不干扰
>
>   **另外，TFT_eSPI 对 ESP32-S3 的兼容性已出现问题**，GitHub 上有多个 issue 报告在 ESP32 Arduino Core 3.x 下编译失败，因为ESP32官方乐鑫（）。Arduino_GFX 目前仍在积极维护，对新芯片的支持更好。





## 开发环境

本示例的开发环境

MacOS - v15.1.1

Arduino IDE - v2.3.8

开发板库：esp32 (by Espressif Systems) - v3.3.7

屏幕驱动库：GFX Library for Arduino (by Moon on our nation) - v1.6.5

图形库：LVGL (by kisvegabor) - v9.5.0



## 完整代码



```c
#include <Arduino_GFX_Library.h>
#include <lvgl.h>

// --- 引脚与 GFX 初始化 ---
#define TFT_CS 38
#define TFT_RST 21
#define TFT_DC 47
#define TFT_MOSI 11
#define TFT_SCLK 12
#define TFT_BLK 48

#define BLACK   0x0000
#define WHITE   0xFFFF
#define ROTATION 1

Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);

static const uint32_t screenWidth  = 160;
static const uint32_t screenHeight = 80;

void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = lv_area_get_width(area);
  uint32_t h = lv_area_get_height(area);
  uint32_t stride = lv_draw_buf_width_to_stride(w, LV_COLOR_FORMAT_RGB565);
  uint8_t * row_ptr = px_map;
  
  for (uint32_t y = 0; y < h; y++) {
    gfx->draw16bitRGBBitmap(area->x1, area->y1 + y, (uint16_t *)row_ptr, w, 1);
    row_ptr += stride;
  }
  lv_display_flush_ready(display);
}

// ==========================================
// 定义动画回调函数 (用于接收 LVGL 动画的数值变化)
// ==========================================

// 回调：改变对象的 X 坐标 (水平移动)
static void anim_x_cb(void * var, int32_t v) {
  lv_obj_set_x((lv_obj_t *)var, v);
}

// 回调：改变对象的 Y 坐标 (垂直移动)
static void anim_y_cb(void * var, int32_t v) {
  lv_obj_set_y((lv_obj_t *)var, v);
}

void setup() {
  Serial.begin(115200);
  pinMode(TFT_BLK, OUTPUT);
  digitalWrite(TFT_BLK, HIGH);

  gfx->begin();
  gfx->fillScreen(BLACK);

  lv_init();
  lv_display_t *display = lv_display_create(screenWidth, screenHeight);
  lv_display_set_color_format(display, LV_COLOR_FORMAT_RGB565);

  static lv_color_t buf[screenWidth * screenHeight / 10];
  lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(display, my_disp_flush);

  // 设置屏幕背景为标准的白色
  lv_obj_set_style_bg_color(lv_scr_act(), lv_color_hex(0xFFFFFF), 0);

  // ==========================================
  // 高级 UI 布局：创建透明容器来包裹元素
  // ==========================================
  
  // 1. 创建一个透明的容器 (尺寸 100x60)
  lv_obj_t * cont = lv_obj_create(lv_scr_act());
  lv_obj_set_size(cont, 100, 60);
  lv_obj_set_style_bg_opa(cont, 0, 0);             // 背景完全透明
  lv_obj_set_style_border_width(cont, 0, 0);       // 去除边框
  lv_obj_set_style_pad_all(cont, 0, 0);            // 去除内部的间距
  lv_obj_align(cont, LV_ALIGN_CENTER, 0, 0);       // 容器整体居中

  // 2. 将绿色方块放进容器里，并对齐到容器的上方中间
  lv_obj_t *rect = lv_obj_create(cont);
  lv_obj_set_size(rect, 30, 30);
  lv_obj_set_style_bg_color(rect, lv_color_hex(0x00FF00), 0);
  lv_obj_set_style_border_width(rect, 0, 0);
  lv_obj_align(rect, LV_ALIGN_TOP_MID, 0, 0);

  // 3. 将文字放进容器里，并对齐到容器的底部中间
  lv_obj_t * label = lv_label_create(cont);
  lv_label_set_text(label, "hello world!");
  lv_obj_set_style_text_color(label, lv_color_hex(0x000000), 0);
  lv_obj_align(label, LV_ALIGN_BOTTOM_MID, 0, 0);


  // ==========================================
  // 添加双重动画效果 (LVGL v9 动画引擎)
  // ==========================================

  // 动画 A：让整个容器（方块+文字）左右平移巡逻
  lv_anim_t a_x;
  lv_anim_init(&a_x);
  lv_anim_set_var(&a_x, cont);                       // 绑定动画对象：容器
  lv_anim_set_values(&a_x, -30, 30);                 // 从中心往左移动30，再往右移动30
  lv_anim_set_time(&a_x, 2000);                      // 单次移动耗时 2000 毫秒 (2秒)
  lv_anim_set_playback_time(&a_x, 2000);             // 往回走也耗时 2000 毫秒
  lv_anim_set_repeat_count(&a_x, LV_ANIM_REPEAT_INFINITE); // 无限循环
  lv_anim_set_path_cb(&a_x, lv_anim_path_ease_in_out);     // 使用"缓入缓出"曲线，让动作显得有弹性而不生硬
  lv_anim_set_exec_cb(&a_x, anim_x_cb);              // 绑定上面定义的 X轴回调函数
  lv_anim_start(&a_x);                               // 启动动画！

  // 动画 B：让绿色的方块自己上下轻快跳动
  lv_anim_t a_y;
  lv_anim_init(&a_y);
  lv_anim_set_var(&a_y, rect);                       // 绑定动画对象：只是绿色方块
  lv_anim_set_values(&a_y, 0, 10);                   // 向下偏移 0 到 10 个像素
  lv_anim_set_time(&a_y, 300);                       // 极速跳动，一次 300 毫秒
  lv_anim_set_playback_time(&a_y, 300);              
  lv_anim_set_repeat_count(&a_y, LV_ANIM_REPEAT_INFINITE); 
  lv_anim_set_path_cb(&a_y, lv_anim_path_ease_in_out); 
  lv_anim_set_exec_cb(&a_y, anim_y_cb);              // 绑定上面定义的 Y轴回调函数
  lv_anim_start(&a_y);                               // 启动动画！
}

// 记录上一次的时间
uint32_t last_tick = 0;
void loop() {
  // 1. 计算距离上一次跑 loop 经过了多少毫秒
  uint32_t current_tick = millis();
  uint32_t elapsed_time = current_tick - last_tick;
  last_tick = current_tick;

  // 2. 将流逝的时间告诉 LVGL（这是动画能动起来的绝对关键！）
  lv_tick_inc(elapsed_time);

  // 3. LVGL 处理动画和界面重绘
  lv_timer_handler();
  
  // 4. 稍微延时，避免 CPU 满载
  delay(5);
}
```





## 代码关键行解读

> 以下是新手最容易出错的几个地方，对照你的代码逐行看：

### 1. GFX 初始化中的偏移参数



```c
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
```

最后 4 个数字 `26, 1, 26, 1` 分别是 `col_offset1, row_offset1, col_offset2, row_offset2`。**如果屏幕显示有偏移（内容挤到一角或有黑边），调这 4 个值。** 不同厂家的 ST7735S 模块偏移量不同，这里给出的是最常见的值。

### 2. 屏幕尺寸——注意横屏方向

```c
#define ROTATION 1  // 横屏旋转
static const uint32_t screenWidth  = 160;  // 横屏后宽度变成 160
static const uint32_t screenHeight = 80;   // 高度变成 80
```

物理屏幕是 80×160（竖屏），`ROTATION=1` 旋转 90° 后变成 160×80。**LVGL 的 display 尺寸必须匹配旋转后的方向**，否则画面错乱。

### 3. flush 回调——LVGL 与 GFX 的桥梁

```c
void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  ...
  lv_display_flush_ready(display);  // 这一行不能漏！
}
```

`lv_display_flush_ready()` 告诉 LVGL "这块区域画完了，可以给下一块了"。**漏掉这行 = 屏幕永远不更新。**

### 4. loop 中的时间喂送

```c
lv_tick_inc(elapsed_time);
lv_timer_handler();
```

这两行是 LVGL 动画的"心脏"。`lv_tick_inc` 喂时间，`lv_timer_handler` 触发界面重绘。**缺少任何一行，动画都不会动。**





## 常见问题排查

| 症状                         | 可能原因                                                 | 解决方法                                                     |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| **白屏（背光亮但无内容）**   | flush 回调未正确绑定，或 `lv_display_flush_ready()` 漏掉 | 检查 `my_disp_flush` 是否被正确设置为 flush_cb               |
| **花屏 / 随机色块**          | SPI 引脚接错或接触不良                                   | 重新检查接线，确保杜邦线插紧                                 |
| **画面偏移 / 有黑边**        | ST7735S 偏移参数不匹配                                   | 调整 `Arduino_ST7735` 构造函数中的 `col_offset` 和 `row_offset` 参数 |
| **画面颜色反了（蓝变红等）** | RGB/BGR 设置不对                                         | 在 GFX 初始化中检查颜色顺序参数                              |
| **画面上下翻转**             | 旋转参数不正确                                           | 尝试 `ROTATION` 改为 0 或 3                                  |
| **编译报错找不到 lvgl.h**    | LVGL 库未安装或版本不对                                  | 确保安装的是 **LVGL v9.x**（不是 v8）                        |
| **动画不动，界面是静态的**   | loop 中缺少 `lv_tick_inc()` 或 `lv_timer_handler()`      | 确保两行都存在                                               |




