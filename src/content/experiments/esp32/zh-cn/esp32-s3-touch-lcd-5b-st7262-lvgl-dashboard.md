---
title: "ESP32-S3 驱动 ST7262 RGB 屏点亮 + LVGL 仪表盘完整教程（微雪 Touch-LCD-5B / 1024×600）"
boardId: esp32s3
moduleId: display/tft50-st7262
category: esp32
date: 2026-08-03
intro: "用 ESP-IDF 在微雪 ESP32-S3-Touch-LCD-5B（5 寸 1024×600、ST7262 RGB 直驱）上从零点亮 RGB 屏，接上 LVGL，做成一个会动的车辆遥测仪表盘。讲清 CH422G 背光控制、PCLK 调参、PSRAM 双缓冲与缓动动画，附完整 ESP-IDF 代码与避坑清单。"
image: "https://img.lingflux.com/2026/08/b7d201de3550e7561294441b57a205de.jpg"
---

难度：⭐⭐⭐☆☆（会点 C、摸过 ESP-IDF 即可上手）
预计时间：2～3 小时（含环境搭建）
测试环境：ESP-IDF 5.3.x（或 5.2.7 补一行宏）+ LVGL ^9.3 + espressif/esp_lvgl_port 2.8

---

> **一句话摘要**：用 ESP-IDF 在微雪 ESP32-S3-Touch-LCD-5B（5 寸 1024×600、ST7262 纯 RGB 直驱）上从黑屏一路点亮 RGB 屏、接上 LVGL，最终做成一个会动的车辆遥测仪表盘。踩过的坑（分辨率骗局、PCLK 白屏、LVGL 内存白屏、撕裂与不顺滑）和填坑代码全在这。

---

> **TL;DR（快速上手）：**
> 1. **认清家底**：5B 是 **1024×600**、驱动 IC **ST7262**、纯 RGB 直驱——别信官方例程默认的 800×480。
> 2. **PCLK 用 16MHz**：别抄板卡定义的 21MHz，PSRAM 存画面时供不上会全白。
> 3. **背光走 CH422G**：不是普通 GPIO，也不是 PWM，往 I²C 地址 `0x38` 写一个字节就开关。
> 4. **跑 LVGL 必开两个宏**：`LV_USE_CLIB_MALLOC=y` + `SPIRAM_USE_MALLOC=y`，否则白屏 + 看门狗重启。
> 5. `idf.py build flash monitor`，点亮，开香槟。

---

## 前言

这周末出门在外，朋友购买了一款微雪的 **ESP32-S3-Touch-LCD-5B**，能烧写上官方的固件正常显示，但是无法用代码点亮，使用官方例子则又黑又白的，完全搞不通。于是我拿过来接手折腾。这是一块 5 寸、1024×600 的 RGB 电容触摸屏开发板。板子不贵，配置却挺豪华——CAN、RS485、RTC、锂电池充电全都有，自带 16MB Flash + 8MB PSRAM。

于是，我接手过来尝试点亮它，毕竟最近很喜欢点亮屏幕。但点亮它的过程，坑比我预想的多。最劝退的一点是：**你照着微雪官方的文档和例程来，点不亮。** 不是你菜，是官方的资源压根不是为这块 5B 准备的。

我把整个过程拆成了三个递进的小例子，代码都放在了 GitHub（[本项目完整目录](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)，三个例子都在里面）：

1. **点亮屏幕**：最朴素的方式，显示一行 Hello World → [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
2. **接上 LVGL**：做一个带指针动画的半圆速度表 → [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
3. **做成仪表盘**：改成一个有设计感的车辆遥测面板 → [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

**本文目标**：把这三步里踩过的坑、为什么这么填的代码、以及一份能直接抄的避坑速查清单交给你，让你少熬几个通宵。

---

## 实验效果

最终你能得到一个**会动的车辆遥测仪表盘**：转速、油门、水温、车速、电压五个数据卡片，数值带缓动逼近、进度条过载变红、指针动画丝滑不撕裂。

![](https://img.lingflux.com/2026/08/032db1082c643b3c0cc44b993101ead1.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/doq81VdEQRI?si=bIy_tzkslkScLqzU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 一、开发板说明：先认清这块 5B

正式踩坑前，先把这块 ESP32-S3-Touch-LCD-5B 的硬件参数摆出来。后面的坑——PCLK 该填多少、内存够不够、哪几个脚共用一条 I²C——基本都围着这张表转，对着看会顺很多。

### 屏幕（最该先认清的就是它）

| 项目 | 规格 |
| --- | --- |
| 尺寸 | 5 吋 |
| 面板类型 | IPS |
| 分辨率 | **1024 × 600**（实测，官方文档没单独标 5B，默认却是 800×480——这是第一章的大坑） |
| 显示色彩 | 65K 色 |
| 接口 | RGB（并口），驱动 IC **ST7262**，纯 RGB 直驱、**不用发 SPI 初始化命令** |
| 视角 | 175° |
| 亮度 | 550 cd/m² |
| 触摸 | 电容式触摸（含玻璃面板） |
| 背光升压芯片 | AP3032KTR-G1 |

> **ST7262** 是一块 RGB 接口的液晶面板驱动 IC（Sitronix 出品），负责接收并口 RGB 信号并驱动液晶分子，在本项目里你**完全不用给它发初始化命令**——通电、给对时序、喂数据，它自己就亮。这点省了好多事。

### 主控芯片（MCU）

| 项目 | 规格 |
| --- | --- |
| 模组 | ESP32-S3-WROOM-1-**N16R8** |
| 核心 | Xtensa 32-bit LX7 双核，最高 240 MHz |
| Flash | **16 MB** |
| PSRAM | **8 MB**（octal SPI） |
| 内部 SRAM | 512 KB |
| 无线 | Wi-Fi 2.4 GHz（802.11 b/g/n）、蓝牙 5（LE），板载天线 |
| USB | 全速 (Full-Speed) USB，板载 Type-C |

> **PSRAM** 是芯片外接的一块"大但慢"的内存。整屏画面（framebuffer）就放在这 8MB 里，由 DMA 不停往屏幕搬。**那块 8MB PSRAM 就是存整屏画面的地方。** PSRAM 配错成 quad 是常见坑（详见第七章）。

### 触摸

| 项目 | 规格 |
| --- | --- |
| 触摸 IC | **GT911** |
| 类型 | 电容式 |
| 支持点数 | 5 点触摸 |
| 接口 | I²C |
| I²C 地址 | **0x5D** |

> **GT911** 是一颗电容触摸控制器，负责把手指位置转成数字坐标，通过 I²C 上报。在本项目里它和 RTC、CH422G 共用同一条 I²C（GPIO8/GPIO9），地址要规划好。**本系列例子还没接触摸**，是后续待办。

### 供电与接口

| 项目 | 规格 |
| --- | --- |
| 供电 | Type-C 5V / DC 7–36V / 单节锂电池 3.7V（MX1.25） |
| 功耗 | 5V / 450 mA（典型） |
| CAN | 兼容 CAN 2.0（TJA1051，120Ω 终端电阻默认关闭） |
| RS485 | SP3485 收发器（120Ω 终端电阻默认关闭） |
| 工作温度 | 0 °C ~ 65 °C |
| 尺寸 | 裸板 112.4 × 75.1 mm / 含外壳 116.3 × 79 mm |

---

## 二、板载资源映射（开发板自带，不用接线）

> ⚠️ **这块板是开发板，元件已经焊好，下面这些是板载资源映射，给你查脚位 / 配 SDK 用，不是让你拿杜邦线去接线。** 你要做的只有：Type-C 插上电、USB 插上电脑刷固件。

### 屏幕 RGB 接口脚位

> 以下对应官方文件，并经实机驱动核对。注意 GPIO0 是 strapping 脚（详见第七章避坑清单）。

| ESP32-S3 GPIO | LCD 信号 | 说明 |
| --- | --- | --- |
| GPIO0  | G3    | Green 数据 bit3 |
| GPIO1  | R3    | Red 数据 bit3 |
| GPIO2  | R4    | Red 数据 bit4 |
| GPIO3  | VSYNC | 垂直同步 |
| GPIO4  | TP_IRQ | 触摸中断 |
| GPIO5  | DE    | 数据使能 |
| GPIO7  | PCLK  | 像素时钟（实测 16MHz 稳） |
| GPIO10 | B7    | Blue 数据 bit7 |
| GPIO14 | B3    | Blue 数据 bit3 |
| GPIO17 | B6    | Blue 数据 bit6 |
| GPIO18 | B5    | Blue 数据 bit5 |
| GPIO21 | G7    | Green 数据 bit7 |
| GPIO38 | B4    | Blue 数据 bit4 |
| GPIO39 | G2    | Green 数据 bit2 |
| GPIO40 | R7    | Red 数据 bit7 |
| GPIO41 | R6    | Red 数据 bit6 |
| GPIO42 | R5    | Red 数据 bit5 |
| GPIO45 | G4    | Green 数据 bit4 |
| GPIO46 | HSYNC | 水平同步 |
| GPIO47 | G6    | Green 数据 bit6 |
| GPIO48 | G5    | Green 数据 bit5 |

### 触摸 / RTC / 外部 I²C（共用总线）

| ESP32-S3 GPIO | 信号 | 说明 |
| --- | --- | --- |
| GPIO8 | SDA / TP_SDA / RTC_SDA | I²C 数据（触摸 GT911、RTC PCF85063、外部 I²C 共用） |
| GPIO9 | SCL / TP_SCL / RTC_SCL | I²C 时钟（同上共用） |
| GPIO4 | TP_IRQ | 触摸中断 |

### USB / SD / RS485 / CAN

| 功能 | ESP32-S3 GPIO | 说明 |
| --- | --- | --- |
| USB D- / D+ | GPIO19 / GPIO20 | 全速 USB |
| SD MOSI / SCK / MISO | GPIO11 / GPIO12 / GPIO13 | SD 卡（SPI） |
| SD CS | （CH422G EXIO4） | 低态，由 IO 扩展器控制，不在原生 SPI CS 上 |
| RS485 RXD / TXD | GPIO43 / GPIO44 | SP3485 |
| CAN TX / RX | GPIO15 / GPIO16 | TJA1051 |

### 一个绕不开的芯片：CH422G IO 扩展器

板上那块背光、复位都挂在它身上的芯片就是 **CH422G**，走 I²C 操作。它的怪癖是：**没有寄存器指针，直接把 I²C 地址当命令用**。

> **CH422G** 是一颗 I²C 接口的 IO 扩展器，负责把背光、屏幕复位、触摸复位、SD 卡片选这些零碎信号统一管起来，在本项目里你靠它点亮背光、复位屏幕。

| CH422G 脚位 | 功能 | 说明 |
| --- | --- | --- |
| EXIO0 | DI0  | 数字输入 0 |
| EXIO1 | TP_RST | 触摸复位 |
| EXIO2 | DISP | 背光使能（只能开关，**不能调亮度**） |
| EXIO3 | LCD_RST | 屏幕复位 |
| EXIO4 | SD_CS | SD 卡片选（低态） |
| EXIO5 | DI1  | 数字输入 1 |
| OD0   | DO0  | 数字输出 0 |
| OD1   | DO1  | 数字输出 1 |

---

## 三、需要安装的：ESP-IDF 工具链 + 组件

这块板**不需要装库**，但它用的是 **ESP-IDF**（乐鑫官方的开发框架）而不是 Arduino。原因：RGB 直驱 + PSRAM framebuffer + LVGL 这套组合，sdkconfig 里几十个开关（PCLK、PSRAM 模式、内存池）在 ESP-IDF 里好控得多，Arduino 里调参很别扭。

**准备清单（建议照着核对，能省 80% 排错时间）：**

- [ ] **ESP-IDF 5.3.x**（推荐）。用 5.2.7 也能跑，但要补一行宏（见第七章）。
- [ ] **LVGL ^9.3**（`esp_lvgl_port` 2.8 依赖 9.3 新增的颜色常量）。
- [ ] **espressif/esp_lvgl_port 2.8**（帮你搞定 LVGL 的时钟、独立任务、加锁）。
- [ ] **Windows 用户**：用 PowerShell + EIM profile，**别在 Git Bash 里跑 `idf.py`**（它检测到 `MSYSTEM` 就罢工）。

组件版本一定要同代配对：`esp_lvgl_port` 2.8 配 LVGL `^9.3`，配错了编译就报 `RGB565_SWAPPED undeclared`。

---

## 四、第一步：点亮屏幕（别直接套官方例程）

> 📦 **本章完整代码**：[01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld) —— 最朴素的方式，点亮屏幕、显示一行 Hello World。

这是整件事最大的坑，也是我最想先说的。

**微雪官方的 ESP-IDF 例程（比如 `08_lvgl_Porting`）和文档，基本都是按 800×480 来写的。** 它的 `#else` 默认分支就是 800×480。官方文档更是把整个 5 寸系列笼统标成"800×480 或 1024×600"，**偏偏没单独标 5B 是多少**。

你如果二话不说把官方例程直接烧进 5B，会得到一个很迷惑的画面：**屏幕一大片黑、右边冒出一条白边**（黑+白）。这不是坏了，是"用 800×480 的信号去喂一块 1024×600 的面板"——面板比信号宽，多出来的右边没有信号，就显示成那样。

加上微雪的命名习惯里**"B 后缀常代表方屏"**（比如 4B 是 480×480 方屏），我一度怀疑 5B 是块 720×720 的方屏、还得先走 SPI 初始化。折腾一圈才确认：**5B 就是 1024×600，ST7262 驱动 IC，纯 RGB 直驱，不用发任何 SPI 初始化命令。** 这点很重要，省了好多事。

所以第一步永远是：**别信官方例程的分辨率，自己确认清楚你手上这块到底是多少。**

确认的笨办法就是上面那个——拿 800×480 去喂，右边出白边，反证出它是 1024×600（面板比信号宽才会这样）。

### 4.1 开机流程（6 步骨架）

搞清脾气后开始点亮。开机流程其实就 6 步：**I²C 起来 → CH422G 复位屏幕 → 建 RGB 面板 → 画画面 → 开背光 → CPU 闲着，靠 DMA 自刷新**。

其中"画好画面再最后开背光"很关键——避免开机那一帧花屏。落在代码里，点亮的顺序是固定的：

```c
/* 第一步：先把 I²C 总线拉起来（GPIO8/9，和触摸 GT911、RTC 共用一条）。*/
i2c_master_bus_handle_t i2c_bus = NULL;
i2c_master_bus_config_t bus_cfg = {
    .sda_io_num = 8, .scl_io_num = 9, .clk_source = I2C_CLK_SRC_DEFAULT,
    .flags.enable_internal_pullup = true,
};
i2c_new_master_bus(&bus_cfg, &i2c_bus);

/* 第二步：驱动 CH422G——先复位、再放开（这一步背光仍关着）。*/
ch422g_handle_t io = {0};
ch422g_init(&io, i2c_bus);
ch422g_set_outputs(&io, 0);                              /* EXIO 全拉低：复位 + 背光关 */
vTaskDelay(pdMS_TO_TICKS(10));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST); /* 放开复位，背光仍关 */
vTaskDelay(pdMS_TO_TICKS(120));                          /* 等面板起来 */

/* 第三步：建 RGB 面板、把画面画进 PSRAM framebuffer（见下一段）……*/

/* 第四步：画面备好，最后一步才点亮背光——把 EXIO2 写高。*/
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

> **顺序铁律：背光永远最后开。** 复位时 EXIO 全拉低（背光关），复位放开后再画画面，画面备好才把 EXIO2 写高。反过来先亮背光再画，会看到开机一帧花屏。

### 4.2 背光怎么"写高就亮"：CH422G 最小驱动

背光的"写高就亮"，落到代码里就两件事：写一个 CH422G 的驱动，再在开机流程里按对的顺序调它。驱动核心就一点——**地址即寄存器**，往 `0x24` 写模式、往 `0x38` 写一个字节（这个字节就是 8 路输出的电平）。最小驱动长这样（完整版见仓库 `main/ch422g.c`）：

```c
/* CH422G "寄存器" = I²C 7-bit 设备地址本身（没有单独的寄存器字节）。*/
#define CH422G_REG_MODE  0x24   /* 写 0x01 -> EXIO0..7 推挽输出 */
#define CH422G_REG_OUT   0x38   /* 写一个字节 -> EXIO0..7 的电平 */

/* EXIO 输出位：bit n = EXIO_n 的电平（1 = 高）。*/
#define CH422G_TP_RST   (1u << 1)   /* EXIO1 触摸复位 */
#define CH422G_BL       (1u << 2)   /* EXIO2 背光使能 */
#define CH422G_LCD_RST  (1u << 3)   /* EXIO3 屏幕复位 */

/* 两个"地址即寄存器"各建一个 I²C 设备句柄。*/
esp_err_t ch422g_init(ch422g_handle_t *ch, i2c_master_bus_handle_t bus) {
    i2c_device_config_t mode_cfg = { .device_address = CH422G_REG_MODE, .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &mode_cfg, &ch->dev_mode);
    i2c_device_config_t out_cfg  = { .device_address = CH422G_REG_OUT,  .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &out_cfg,  &ch->dev_out);

    uint8_t mode = 0x01;                              /* 推挽输出模式 */
    i2c_master_transmit(ch->dev_mode, &mode, 1, -1);
    uint8_t zero = 0;
    i2c_master_transmit(ch->dev_out,  &zero, 1, -1);  /* 起始全清零 */
    return ESP_OK;
}

/* 一个字节就是 8 路输出电平——这就是"把地址当命令用"。*/
esp_err_t ch422g_set_outputs(ch422g_handle_t *ch, uint8_t exio_mask) {
    return i2c_master_transmit(ch->dev_out, &exio_mask, 1, -1);
}
```

### 4.3 建 RGB 面板（本章核心）

建面板这段是整章的核心，后面三个坑会逐个解释每行为什么这么填：

```c
#define LCD_H_RES        1024
#define LCD_V_RES        600
#define LCD_PIXEL_CLK_HZ (16 * 1000 * 1000)   /* ← 坑 1：16MHz，不是板卡定义的 21MHz */

/* RGB565 里绿是 6 位 (0..63)、红蓝 5 位 (0..31)，纯白要写 31,63,31（← 坑 2）。*/
#define RGB565(r, g, b)   ((((r) & 0x1F) << 11) | (((g) & 0x3F) << 5) | ((b) & 0x1F))
#define COLOR_BG          RGB565(2, 8, 20)     /* 深蓝底 */
#define COLOR_FG          RGB565(31, 63, 31)   /* 真·白 */

esp_lcd_rgb_panel_config_t panel_cfg = {
    .data_width = 16,                          /* RGB565 = 16 位 */
    .bounce_buffer_size_px = 10 * LCD_H_RES,   /* SRAM bounce：防 16MHz 下供不上白屏 */
    .disp_gpio_num = -1,                       /* 背光在 CH422G 上，不是 GPIO */
    .pclk_gpio_num  = 7, .vsync_gpio_num = 3, .hsync_gpio_num = 46, .de_gpio_num = 5,
    .data_gpio_nums = {
        14, 38, 18, 17, 10,        /* B3..B7 */
        39,  0, 45, 48, 47, 21,    /* G2..G7 */
         1,  2, 42, 41, 40,        /* R3..R7 */
    },
    .timings = {
        .pclk_hz = LCD_PIXEL_CLK_HZ,           /* ← 坑 1 */
        .h_res = LCD_H_RES, .v_res = LCD_V_RES,
        .hsync_pulse_width = 30, .hsync_back_porch = 40, .hsync_front_porch = 220,
        .vsync_pulse_width = 4,  .vsync_back_porch  = 8,  .vsync_front_porch = 4,
        .flags.pclk_active_neg = true,
    },
    .flags.fb_in_psram = true,                 /* 整屏 ~1.17MB framebuffer 放 PSRAM */
};
esp_lcd_new_rgb_panel(&panel_cfg, &panel);
esp_lcd_panel_init(panel);                     /* ← 坑 3：建完面板补这一行 */
```

面板建好后，拿到 framebuffer 就能直接往上写像素——ESP-IDF 的 RGB 面板不提供 `draw_bitmap` 之外的绘图原语，所以 helloworld 里自带了 `lcd_fill` / `lcd_draw_text` 两个小工具（点阵字库，见仓库 `lcd_draw.c`）：

```c
/* 拿到 PSRAM 里的 framebuffer，画 Hello World。*/
void *fb = NULL;
esp_lcd_rgb_panel_get_frame_buffer(panel, 1, &fb);
lcd_draw_init((uint16_t *)fb, LCD_H_RES, LCD_V_RES);
lcd_fill(COLOR_BG);
lcd_draw_text((LCD_H_RES - tw) / 2, (LCD_V_RES - th) / 2, "Hello World!", 5, COLOR_FG);

/* 画面备好，最后开背光。之后 DMA 自己从 PSRAM 刷屏，CPU 闲着。*/
vTaskDelay(pdMS_TO_TICKS(60));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

### 4.4 三个让我实际栽过的坑

**坑 1：PCLK 抄高了，整屏全白。** 把官方 Arduino 板卡定义抄过来时，像素时钟（PCLK）填的是 21MHz，结果屏幕**一片惨白**（不是黑屏）。真相是：画面放在 PSRAM 里，要被 DMA 连续读出来送给屏幕。21MHz × 16 位 ≈ 每秒 336M 位的带宽，对"PSRAM → DMA → 屏幕"这条路来说**太撑了**，一旦供不上，屏幕收不到有效同步信号，干脆显示"无信号"的白底。**降到 16MHz，稳了。**

**坑 2：白字变粉红，差点去重排引脚。** 点亮后白字显示成了粉红色，第一反应是绿色引脚排反了——错。真正原因是 **RGB565 里绿是 6 位（0–63），红蓝才 5 位（0–31）**。`RGB565(31, 31, 31)` 里绿色的 31 在 0–63 只有不到一半，红蓝满、绿一半，混出来就是粉。改成 `RGB565(31, 63, 31)` 才是真白。偏色分两种：**白变青 = 引脚顺序问题**；**白变粉 = 数值填错**。

**坑 3：漏了一行初始化。** 正典流程是"建面板 → 复位 → 初始化 → 开显示"，我一开始只调了建面板那一步。多数情况建完会自动开始扫描，但补一行 `esp_lcd_panel_init()` 能排除"DMA 没启动"的隐患——少了它可能时而亮时而不亮。

### 4.5 一招最值钱的：先看"怎么个不亮法"

面对"点不亮"，最有用的一招是**先看屏幕到底是怎么个不亮法**：

- **完全没背光** → CH422G / 复位序列的事
- **背光亮但全白/全灰** → RGB 信号没给对（最常见，查 PCLK 和时序）
- **背光亮但花屏/抖动** → 信号有了，时序参数差点意思
- **背光亮但颜色错（白变青）** → RGB 通道顺序排错了

就这一个观察，能把问题劈成两半，省掉一堆瞎猜。

---

## 五、第二步：接上 LVGL，做指针动画

> 📦 **本章完整代码**：[02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer) —— 接上 LVGL，做一个带指针动画的半圆速度表。

点亮之后想做个会动的界面，上了 **LVGL**（嵌入式上很流行的图形库）。接法是官方推荐的 `espressif/esp_lvgl_port` 组件，它帮你搞定 LVGL 的时钟、独立任务、加锁，把画好的画面刷到屏幕上。

> **LVGL** 是一个开源的嵌入式图形库，负责把按钮、进度条、动画这些 UI 元素画出来，在本项目里你靠它做速度表和仪表盘，而不是自己一行行写绘图代码。

接法本身不长，核心就是建好 RGB 面板（speedometer 例子里比 helloworld 多了一行 `.num_fbs = 2`，这就是后面防撕裂的双 framebuffer），再交给 `esp_lvgl_port`：

```c
const lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
lvgl_port_init(&lvgl_cfg);

const lvgl_port_display_cfg_t disp_cfg = {
    .panel_handle  = panel,
    .buffer_size   = LCD_H_RES * LCD_V_RES, /* 全屏：direct mode 的硬要求 */
    .hres          = LCD_H_RES, .vres = LCD_V_RES,
    .color_format  = LV_COLOR_FORMAT_RGB565,
    .flags = {
        .direct_mode = true,   /* 直接画进面板的 framebuffer，省一次拷贝 */
        .buff_dma    = false,
        .buff_spiram = true,   /* 绘图缓冲放 PSRAM（← 坑 1：得先开 SPIRAM_USE_MALLOC）*/
        .swap_bytes  = false,  /* 并口 RGB 面板，不做字节序交换 */
    },
};
const lvgl_port_display_rgb_cfg_t rgb_cfg = {
    .flags = {
        .bb_mode       = true,  /* 用了 bounce buffer → 走 on_bounce_frame_finish 同步 */
        .avoid_tearing = true,  /* 帧边界切 fb → 防撕裂（见本章末）*/
    },
};
lvgl_port_add_disp_rgb(&disp_cfg, &rgb_cfg);

/* 任何 lv_* 调用都得先拿这把锁，免得和 esp_lvgl_port 的渲染任务撞车。*/
lvgl_port_lock(0);
dashboard_create();   /* 建速度表 + 启动指针动画 */
lvgl_port_unlock();
```

三个 flag 是这段的精髓：`direct_mode` 让 LVGL 直接画进面板 framebuffer（少一次整屏拷贝）；`avoid_tearing` 让两块 fb 在帧边界切换（防撕裂）；`buff_spiram` 把绘图缓冲挪进 PSRAM——这个看着无害，恰恰引出了下面最大的坑。

### 5.1 坑 1（最隐蔽）：白屏 + 看门狗重启

接好烧进去，屏幕先是黑两秒，然后**全白**，再不动了。这症状跟前面 PCLK 太高导致的白屏**一模一样**，我差点又一头扎进去调时序。

**幸亏这次先打开串口看开机日志**，一眼看到关键一行：

```
E task_wdt: CPU 0: taskLVGL
```

LVGL 的任务触发了看门狗，被系统判定卡死。**这是软件卡住，不是信号问题。** 顺着调用栈查，发现 LVGL 第一次画整屏时要临时申请一块 MB 级的绘图缓冲，可 LVGL 默认用的是它**自己内置的小内存池，只有 64KB**——1MB 塞不进 64KB，于是反复折腾，画不完，任务卡死，看门狗发火。

有意思的是：我明明把显示缓冲设在了 PSRAM，怎么还说内存不够？因为**显示缓冲**（给"刷屏"用）和 **LVGL 内部绘图用的内存池**（给"算画面"用）是两码事，别混。解法就两个开关：

```
CONFIG_LV_USE_CLIB_MALLOC=y    # LVGL 改用系统的 malloc，不用那 64KB 小池子
CONFIG_SPIRAM_USE_MALLOC=y     # 让系统 malloc 能去 PSRAM 拿大块内存
```

> **这里还有个更要命的认知：同样是"白屏"，至少有两种完全不同的成因。** 一种是 RGB 信号/带宽问题（前面 PCLK 那个），一种是软件卡死没画到画面（这个）。**永远先看串口日志分辨**，别看到白屏就调时序。

### 5.2 坑 2、3：组件版本与 IDF 宏对不上

- **坑 2（组件版本要配对）**：`esp_lvgl_port` 2.8 内部用到了 LVGL 9.3 才新增的颜色常量。把 LVGL 版本钉成 `~9.2` 会报 `RGB565_SWAPPED undeclared`，改成 `^9.3` 就好。
- **坑 3（IDF 宏对不上）**：新版 `esp_lvgl_port` 检查 `SOC_LCDCAM_RGB_LCD_SUPPORTED` 这个宏，但它 **IDF 5.3 才改名**，5.2.7 里还是旧名，运行时报 "This target does not support RGB"。解法是在顶层 CMakeLists 的 `project()` 之前补一行 `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)`。

### 5.3 "不顺滑"和"画面撕裂"，都不是算得慢

速度表跑起来后两个新问题：指针动得**不够顺**，还会**撕裂**（画面中间一道错位的横线）。这俩**都跟"算得快不快"没关系**。

**先说不顺。** 这块屏的物理刷新率我先算了：PCLK 16MHz ÷ 一帧总像素数 ≈ **20Hz**。也就是说这块屏一秒最多只能重画 20 次画面，软件再快也没用，是硬天花板。所以"顺不顺"不是帧率问题，是**动画曲线**问题。指针匀速扫到头、瞬间反向，特别生硬；换成 `ease-in-out`（两端减速、中间加速），转折就自然了。

```c
/* 270° 速度表：ROUND_INNER 模式，从 135° 起转，底部留 90° 缺口。*/
lv_obj_t *scale = lv_scale_create(scr);
lv_obj_set_size(scale, 460, 460);
lv_scale_set_mode(scale, LV_SCALE_MODE_ROUND_INNER);
lv_scale_set_range(scale, 0, 120);
lv_scale_set_angle_range(scale, 270);
lv_scale_set_rotation(scale, 135);          /* 起始角度，决定缺口朝向 */
lv_scale_set_total_tick_count(scale, 25);   /* 每 5 km/h 一格 */
lv_scale_set_major_tick_every(scale, 4);    /* 每 4 格一个主刻度 → 0,20,...,120 */

/* 动画每一帧被调用：把指针指到 v。数字读数只在整数变化时才刷新。*/
static void gauge_set_value(void *var, int32_t v) {
    gauge_ctx_t *g = (gauge_ctx_t *)var;
    lv_scale_set_line_needle_value(g->scale, g->needle, 150, v);  /* 指针，150px 长 */
    int vi = (int)v;
    if (vi != g->last_int) {                 /* 整数没变就不动 label，省掉重画 */
        g->last_int = vi;
        lv_snprintf(s_value_buf, sizeof(s_value_buf), "%03d", vi);
        lv_label_set_text(g->value_label, s_value_buf);
    }
}

/* 0 → 120 → 0，无限循环。顺不顺，关键就在最后一行。*/
lv_anim_t a;
lv_anim_init(&a);
lv_anim_set_var(&a, &s_ctx);
lv_anim_set_exec_cb(&a, gauge_set_value);
lv_anim_set_values(&a, 0, 120);
lv_anim_set_duration(&a, 2500);                       /* 单程 2.5s */
lv_anim_set_playback_duration(&a, 2500);              /* 回程：0→120→0 */
lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out);    /* ← 两端减速，转折才不生硬 */
lv_anim_set_repeat_count(&a, LV_ANIM_REPEAT_INFINITE);
lv_anim_start(&a);
```

关键就是 `lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out)` 这一行。`playback_duration` 让动画到 120 自动折返回 0，折返瞬间速度本来会硬生生反向；`ease-in-out` 让它先减速到 0 再反向加速，肉眼几乎看不出转向。

**再说撕裂。** 原因是只准备了一块画面缓冲，DMA 在不停往外搬，LVGL 同时往里写新的，没同步，就搬出"半新半旧"的一帧。解法是**双缓冲 + 垂直同步切换**：两块画面，DMA 永远只搬完整的那块。**注意：我们这块屏必须保留一个叫 bounce buffer 的小缓冲**（防 16MHz 下供不上白屏），所以是"双缓冲 + bounce 一起用"，不能照官方例程把 bounce 关掉。

> 在这块屏上，**"顺"靠缓动曲线，"不撕裂"靠双缓冲**，都跟算得快不快无关。

---

## 六、第三步：做成一块车辆遥测仪表盘

> 📦 **本章完整代码**：[03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry) —— 改成一个有设计感的五卡片车辆遥测面板。

最后把速度表换成了一个像模像样的**车辆遥测面板**：转速、油门、水温、车速、电压五个数据，每张卡片有大数字、进度条、最高最低刻度，数值过载了还会变红。数据是随机模拟的，但动作要自然。

### 6.1 卡片怎么搭出来

每张卡片就是个**去掉了默认样式的 `lv_obj` 容器**，里面塞标签、单位、大数字、进度条、min/max 刻度。坐标全部直接写死，靠 1px 边框 + 纯色分层（不用阴影）。核心长这样（完整版见 `lvgl_dashboard.c` 的 `make_card`）：

```c
static void make_card(lv_obj_t *parent, int i) {
    const metric_cfg_t *c = &CFG[i];      /* 几何/范围/危险阈值/颜色都在配置表里 */
    metric_t *m = &s_m[i];
    m->accent = lv_color_hex(c->accent_hex);

    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_remove_style_all(card);                       /* 清掉默认样式，全部自己设 */
    lv_obj_set_pos(card, c->x, c->y);                    /* 坐标写死，不用 flex 自动排版 */
    lv_obj_set_size(card, c->w, c->h);
    lv_obj_set_style_bg_color(card, COL_CARD, 0);
    lv_obj_set_style_radius(card, 18, 0);
    lv_obj_set_style_border_color(card, COL_BORDER, 0);  /* 1px 边框分层，不加阴影 */
    lv_obj_set_style_border_width(card, 1, 0);

    lv_obj_t *lab = lv_label_create(card);
    lv_label_set_text(lab, c->label);
    lv_obj_align(lab, LV_ALIGN_TOP_LEFT, 0, 0);          /* 标签左上；单位右上同理 */

    lv_obj_t *val = lv_label_create(card);
    lv_obj_set_style_text_font(val, &lv_font_montserrat_48, 0);  /* 大数字 */
    lv_obj_align(val, LV_ALIGN_TOP_LEFT, 0, c->value_y);
    m->value = val;

    /* 进度条：trough 和 indicator 两部分分别设色，危险时把 indicator 改红。*/
    lv_obj_t *bar = lv_bar_create(card);
    lv_obj_remove_style_all(bar);
    lv_bar_set_range(bar, c->min, c->max);
    lv_obj_set_size(bar, c->w - 2 * c->pad, c->big ? 14 : 10);
    lv_obj_align(bar, LV_ALIGN_BOTTOM_LEFT, 0, -24);
    lv_obj_set_style_bg_color(bar, COL_BAR_BG, 0);                /* trough */
    lv_obj_set_style_bg_color(bar, m->accent, LV_PART_INDICATOR); /* indicator */
    m->bar = bar;
}
```

### 6.2 想让数字"活"起来：缓动逼近，不是匀速

最直觉的做法是"随机给个新值，让显示匀速追过去"。但匀速追，到目标瞬间速度归零，看着很机械。我用的是**缓动逼近**：每个数据记当前显示值 `current` 和目标 `target`，每次刷新追近差距的 1/6（指数衰减，越靠近越慢）。每隔约 1.2 秒再从当前值附近随机游走出一个新目标，不是满量程乱跳，这样像真车数据：

```c
/* 每 30 次（~1.2s）换一次目标：从当前值附近游走，幅度 = 量程的 1/3。*/
if (tick % 30 == 0) {
    int span = (m->max - m->min) / 3;
    m->target = clampi(m->current + rnd_range(-span, span), m->min, m->max);
}
/* 缓动逼近：追近差距的 1/6；差太小就直接吸过去，免得永远差一丢丢。*/
int diff = m->target - m->current;
if (diff > -6 && diff < 6) m->current = m->target;
else                       m->current += diff / 6;   /* ← 就是这句指数衰减 */

/* 进度条每帧都更新（它是"活的"视觉）。危险时 indicator 变红。*/
bool danger = in_danger(m);   /* RPM≥6800 / 水温≥105 / 电压≤10.8 或 ≥14.6 */
lv_bar_set_value(m->bar, m->current, LV_ANIM_OFF);
lv_obj_set_style_bg_color(m->bar, danger ? COL_DANGER : m->accent, LV_PART_INDICATOR);
```

跟指针的 `ease-in-out` 一个道理——都是在转折处减速。`danger` 判断让进度条在过载时变红，就是面板上"过载变红"那个效果的来历。

### 6.3 顺手的小优化：没变就别重画

每 40 毫秒刷新一次，但经常连续两次算出来是同一个整数（尤其快到目标时基本停住）。每次调 `lv_label_set_text` 都要复制字符串、标记重画，全是白工。所以加一句：**只有显示的文字真的变了才更新**：

```c
/* 数字读数：格式化出来的字符串真变了，才 set_text。*/
char buf[12];
fmt_scaled(m->current, m->scale, buf, sizeof(buf));
if (strcmp(buf, m->last_text) != 0) {
    strcpy(m->last_text, buf);             /* 记下来，下次拿来比 */
    lv_label_set_text(m->value, buf);      /* strdup + 标记重画，只在真变化时发生 */
}
lv_obj_set_style_text_color(m->value, danger ? COL_DANGER : COL_VALUE, 0);
```

### 6.4 嵌入式 UI 的一点取舍

固定分辨率的小屏上，**坐标直接写死**比用 flex 自动排版更省心、更可预测；卡片**不加阴影**（LVGL 的阴影在 20Hz 刷新下有点贵），靠边框和纯色就够分层；电压的一位小数用"存 142 代表 14.2"的整数缩放，省掉一堆浮点运算。整数缩放的做法是把每个指标的几何/范围/危险阈值/颜色/scale 全塞进一张配置表：

```c
/* 配置表，每行一个指标。坐标/范围/危险阈值/颜色/scale 全在表里，方便统一调。*/
static const metric_cfg_t CFG[] = {
    /* label      unit    x   y    w   h  pad v_y  min  max  dHi  dLo init accent   sc big */
    { "ENGINE",  "RPM",  24, 84, 478,242, 28, 78,    0,8000,6800,  0, 850,0xFF5A3C, 1, 1 },
    { "BATTERY", "V",   688,346, 312,230, 24, 64,  100, 150, 146,108, 124,0xB08CFF,10, 0 },
    /*                                                                  ↑ scale=10：124 代表 12.4V */
    /* ...其余三行同理 */
};

/* 显示时再除回去：124 → "12.4"。全程整数，没有浮点运算。*/
static void fmt_scaled(int32_t v, int32_t scale, char *buf, size_t n) {
    if (scale == 10) lv_snprintf(buf, n, "%d.%d", (int)(v / 10), (int)(v % 10));
    else             lv_snprintf(buf, n, "%d", (int)v);
}
```

`scale=10` 的存 x10、`scale=1` 的存原值，缓动、危险判断、进度条全跑在这套整数上，只有最后格式化成字符串那一瞬间才"翻译"回带小数的样子。

---

## 七、常见问题排查（别慌，问题就这几类）

> 别慌，90% 的问题出在这几个地方。遇到怪现象**先看串口日志、先算物理参数**，别急着改代码。

**关于这块屏**

- 官方例程/文档默认 800×480，**直接套到 5B 会黑底 + 右边白条**。5B 是 **1024×600、ST7262、纯 RGB 直驱**，不用 SPI 初始化。
- 背光走 **CH422G** 的 EXIO2，不是普通 GPIO，也不是 PWM（**只能开关，不能调亮度**）。
- 触摸芯片 GT911（I²C 地址 0x5D）和 RTC、CH422G 共用一条 I²C，注意地址规划；本系列例子**还没接触摸**，是后续待办。

**构建环境（Windows）**

- **别在 Git Bash 里跑 `idf.py`**，它检测到 `MSYSTEM` 就罢工。用 PowerShell + EIM profile，调用前 `unset MSYSTEM`（或 `$env:MSYSTEM=$null`）。
- 串口被占用报 "port is busy"，多半是上次的 monitor 没杀干净，确认无残留再 flash。
- 改了 `sdkconfig.defaults` 不生效？IDF 不会自动把 defaults 重新并进已存在的 `sdkconfig`，**删掉 sdkconfig 让它从 defaults 重生**。

**点亮屏幕**

- **PCLK 别抄板卡定义的 21MHz，用 PSRAM framebuffer 时从 16MHz 起步**，还白就降到 12MHz 试。
- PSRAM 别配错：N16R8 是 **octal**（`SPIRAM_MODE_OCT`），不是 quad。
- 建完面板**别忘了补一行 `esp_lcd_panel_init()`**。
- 注意 GPIO0 是 strapping 脚（开机瞬间需为高），开机后当 RGB 数据脚用没问题，但别在它上面接会拉低开机的电路。
- 颜色偏色先分清两种：**白变青 = 引脚顺序**；**白变粉 = RGB565 绿通道填值**（绿是 6 位 0–63，纯白要写 `31,63,31`）。

**跑 LVGL**

- **几乎一定要开 `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`**，否则 LVGL 那个 64KB 内置内存池装不下整屏绘图，表现就是白屏 + 看门狗重启。
- 组件版本要同代：`esp_lvgl_port` 2.8 配 LVGL `^9.3`。
- IDF 5.2 配新版组件，顶层 CMakeLists 补 `SOC_LCDCAM_RGB_LCD_SUPPORTED=1`。
- **LVGL / esp_lvgl_port 跨版本会改 API 名**，别凭记忆写，去读抓下来的实际 header。

**顺滑与撕裂**

- 先算面板物理刷新率（这块约 20Hz），低于它的优化大多是动画设计问题。
- 不顺首选 `ease-in-out`，别急着堆帧率。
- 撕裂 = 单缓冲 + 无同步，解法是双 framebuffer + `avoid_tearing`，**且保留 bounce buffer**。

---

## 八、FAQ

**Q：微雪 ESP32-S3-Touch-LCD-5B 分辨率到底是多少？800×480 还是 1024×600？**
A：5B 是 **1024×600**。微雪官方文档把整个 5 寸系列笼统标成"800×480 或 1024×600"，没单独标 5B。验证方法：用 800×480 信号烧进去，屏幕会黑底 + 右边一条白边，说明面板比信号宽，就是 1024×600。别直接套官方例程的 800×480。

**Q：屏幕一片全白是怎么回事？**
A：先看串口日志分两种白屏。① 没有 watchdog 报错 → 多半是 RGB 信号没供上，PCLK 抄了 21MHz 太高，降到 16MHz。② 串口有 `task_wdt: taskLVGL` → 是 LVGL 内存池太小导致卡死，开 `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`。

**Q：背光能不能调亮度？为什么找不到 PWM 引脚？**
A：不能。背光挂在 CH422G IO 扩展器的 EXIO2 上，只有开/关两态，不是 PWM。想调亮度得硬件改板（加可调升降压），软件层面做不到。

**Q：这块屏刷新率多少？为什么指针动起来卡？**
A：约 **20Hz**（PCLK 16MHz ÷ 一帧总像素数）。这是物理天花板，软件再快也突破不了。卡顿多半不是帧率问题，是动画曲线太硬——把指针动画从线性换成 `ease-in-out`，转折处自然减速，立刻顺滑。

**Q：能在 Arduino IDE 里点亮吗？为什么用 ESP-IDF？**
A：理论上能（Arduino-ESP32 底层也是 ESP-IDF），但 RGB 直驱 + PSRAM framebuffer + LVGL 这套组合，在 Arduino 里调 sdkconfig 很别扭，PCLK、PSRAM 模式、内存池这些开关 ESP-IDF 里好控得多。本教程基于 ESP-IDF。

**Q：LVGL 烧进去白屏 + 看门狗重启，怎么办？**
A：八成是 LVGL 内置的 64KB 内存池装不下整屏绘图。在 sdkconfig 里开两个：`CONFIG_LV_USE_CLIB_MALLOC=y`（LVGL 改用系统 malloc）和 `CONFIG_SPIRAM_USE_MALLOC=y`（让 malloc 能去 PSRAM 拿大块）。ESP32-S3 + PSRAM + 大屏几乎必开。

**Q：PSRAM 配 quad 还是 octal？配错了会怎样？**
A：N16R8 是 **octal**（`SPIRAM_MODE_OCT`）。配成 quad 会带宽不够，表现就是 PCLK 稍高就花屏/白屏，或运行不稳定。

**Q：IDF 5.2.7 报 "This target does not support RGB" 怎么办？**
A：新版 esp_lvgl_port 检查 `SOC_LCDCAM_RGB_LCD_SUPPORTED` 这个宏，它 IDF 5.3 才改名，5.2.7 里还是旧名。在顶层 CMakeLists 的 `project()` 之前补一行 `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)`。

---

## 九、延伸玩法

点亮只是起点，这块板还能往下玩很多：

- **接触摸**：GT911 已经在 I²C 上（GPIO8/9），加个驱动就能做按钮交互。
- **从 SD 卡读资源**：板载 SD 卡槽（SPI），可以加载图片、字体，告别把资源全塞进 Flash。
- **接 CAN 总线**：板载 TJA1051，配合 ESP-IDF 的 TWAI 驱动，做一个真正的 OBD 车况仪，仪表盘的数就不再是模拟值了。
- **上 RS485**：SP3485 收发器接工业传感器/Modbus 设备。
- **加 RTC 掉电走时**：PCF85063 也在那条 I²C 上，做个带真实时间戳的数据记录器。

---

## 十、参考资料

**官方数据手册与产品页**

- [ESP32-S3 Datasheet（乐鑫官方）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP32-S3-WROOM-1 模组 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)
- [ESP32-S3 产品页](https://www.espressif.com/en/products/socs/esp32-s3)
- [微雪 ESP32-S3-Touch-LCD-5B Wiki](https://docs.waveshare.net/ESP32-S3-Touch-LCD-5/?variant=ESP32-S3-LCD-5B-touch)

**开源库与框架**

- [ESP-IDF 官方文档](https://docs.espressif.com/projects/esp-idf/)（RGB LCD Panel、PSRAM 配置、I²C Master 驱动）
- [espressif/esp_lvgl_port（GitHub）](https://github.com/espressif/esp_lvgl_port)
- [LVGL 官方文档](https://docs.lvgl.io/)（scale 控件、anim 动画、bar 进度条）

**本项目代码**

- 完整代码、每个坑的复现过程和最终配置，都放在 GitHub，每个例子目录下有完整的 docs：
  - [本项目完整目录（含三个例子）](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)
  - [01 HelloWorld —— 点亮屏幕](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
  - [02 Speedometer —— 速度表](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
  - [03 VehicleTelemetry —— 车辆遥测仪表盘](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

---

## 写在最后

回头看，整条路其实是三层：**点亮屏幕 → 接上 LVGL → 做成界面**。每一层都有它专属的坑，但坑之间往往长得很像（两种白屏、两种偏色），最容易让人白忙的就是认错坑。

如果只让我留一句话给后来人，大概是这句——我在这三个例子里反复栽跟头后才真正学会的：

> **遇到怪现象先看串口日志、先算物理参数，别急着改代码。** 官方例程的分辨率坑、PCLK 的白屏、LVGL 内存的白屏，看起来都像"屏幕坏了"，但一个是文档不对、一个是硬件带宽、一个是软件卡死，方向反了就一通宵白熬。
