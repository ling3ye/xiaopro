---
title: "ESP32-S3 点亮 TK015F5785 圆屏（JD9855 QSPI）｜查表炫彩动画完整教程"
boardId: esp32s3
moduleId: display/tft15-jd9855
category: esp32
date: 2026-07-30
intro: "用 ESP32-S3 通过 QSPI 点亮 1.5 寸 TK015F5785 圆屏（驱动其实是 JD9855，不是厂家标称的 ST77916），单文件手写驱动 + Plasma / 彩虹色盘 / 辐射波纹三套查表动画，Arduino IDE 直接编译烧录，附避坑指南。"
image: "https://img.lingflux.com/2026/07/8f43dd78cc005af725bd601e0a262621.jpg"
---

难度：⭐⭐⭐☆☆（有单片机基础上手更快，纯新手照抄也能跑）
预计时间：30～45 分钟（不含等淘宝发货的时间）
测试环境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10（基于 ESP-IDF v5，必须是这个大版本，理由后面讲）

---

> **一句话摘要**：用 ESP32-S3 通过 QSPI 点亮 1.5 寸 TK015F5785 圆屏——厂家标称驱动是 ST77916，实测 IC ID 才发现其实是 JD9855。本文用 ESP-IDF 自带的 `esp_lcd_panel_io` 手写一个几十行的单文件迷你驱动，跑 Plasma 等离子流 / 彩虹色盘 / 辐射波纹三套查表动画，不装任何库、运行时不调 `sin`/`atan2`/`sqrt`，30 分钟满屏丝滑。

---

## 前言

我一开始也以为点亮一块圆屏是"接上电、随便发个色块过去"这种五分钟的事。因为厂家说驱动芯片是 ST77916，这个在 GFX library for Arduino 中是有的。然而代码上传，屏幕从黑渐变到全白，所以……直接给整不会。后来，问厂家要了 ESP-IDF 的驱动代码，发现这个屏幕的驱动其实是 JD9855，并且通过屏幕的 IC ID（IC ID 返回的码是 `FF 98 55 00`）也确认了这屏幕的驱动芯片的确是 JD9855。为了方便大家复刻，我直接用 ESP-IDF 内置的 `esp_lcd_panel_io` 手搓一个几十行的迷你驱动——不用装库，不用配字体，甚至不需要一个专门的头文件，全塞进一个 .ino 里就能跑。

这篇教程就是把这块 1.5 寸 TK015F5785 圆屏从"到手是块黑玻璃"点亮到"满屏流动炫彩动画"的完整过程整理出来，包括接线、驱动原理和三套不调用 `sin`/`atan2`/`sqrt` 的丝滑动画算法。跟着做，30 分钟内你的圆屏也能转起来。

> **TL;DR（赶时间的直接看这里）：**
>
> 1. 接线：SCLK→GPIO6，D0→GPIO15，D1→GPIO7，D2→GPIO11，D3→GPIO12，CS→GPIO16
> 2. Arduino IDE 选择 Board = **ESP32S3 Dev Module**，USB CDC On Boot = **Enabled**
> 3. 不用装任何第三方库，代码里全靠 ESP-IDF 自带的 `esp_lcd_panel_io`，核心版本必须是 **v3.x**
> 4. 整个 .ino 复制粘贴、编译、烧录，上电就是满屏流动的彩色动画；没有画面说明踩坑了，往下翻"常见问题排查"

---

## 实验效果

上电后屏幕会自动循环播放三种查表算法生成的彩色动画，每种停留 6 秒，全程没有卡顿感、没有逐行扫描的撕裂感：

- **Plasma 等离子流**：色彩像液体一样连续流动
- **彩虹色盘**：全色谱沿圆心缓慢旋转，像个不停转的调色盘
- **辐射波纹**：色彩涟漪从圆心向外扩散

一上电就是满屏动画，不需要额外操作，很适合当"这块屏真的活了"的验证实验。

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/cqIo77cn1oA?si=Y7RjMyDpAsaN92ug" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 元件说明

> 开发板（ESP32-S3）不展开介绍，这里只说明除开发板外的核心元件。

### TK015F5785 圆屏

TK015F5785 是一块 1.5 寸的圆形 **IPS** 显示屏（驱动芯片 JD9855），负责把 ESP32-S3 送过去的像素数据显示成画面，在本项目里的作用是承载三套查表动画的最终视觉输出。下表参数除特别标注外，均来自厂家提供的模组规格书：

| 参数       | 数值 / 说明                                              | 来源               |
| ---------- | -------------------------------------------------------- | ------------------ |
| 尺寸       | 1.5 寸                                                   | 厂家规格书         |
| LCD 类型   | IPS，全视角                                              | 厂家规格书         |
| 分辨率     | 360 × 360                                                | 厂家规格书         |
| 驱动芯片   | JD9855（同型号模组另有 ST77916 版本，以实测 IC ID 为准） | 厂家规格书 + 实测  |
| 显示区域   | Φ38.16 mm（直径）                                        | 厂家规格书         |
| 外形尺寸   | 44.32 × 44.32 × 3.5 mm                                   | 厂家规格书         |
| 像素间距   | 0.106 × 0.106 mm                                         | 厂家规格书         |
| 颜色数     | 65K 色（RGB565，16bit/像素）                             | 厂家规格书         |
| 亮度       | 500 cd/m²                                                | 厂家规格书         |
| 背光       | 4 颗白光 LED 并联                                         | 厂家规格书         |
| 工作温度   | -20 ~ 60 ℃                                              | 厂家规格书         |
| 接口类型   | QSPI（SCLK + D0~D3 + CS）                                | 本教程实测         |
| 通信时钟   | 20MHz（本教程测试值）                                     | 实测               |

> **下单前务必确认版本**：厂家的模组规格书把这块屏标成「接口 RGB / 驱动芯片 ST77916 **或** JD9855」——说明同一型号 TK015F5785 会按不同驱动 IC 与接口组合出货。本教程针对的是 **JD9855 + QSPI** 那一版（前言里就是靠读取 IC ID = `FF 98 55 00` 才确认芯片其实不是厂家起初说的 ST77916）。如果你买到的是 ST77916 版或 RGB 接口版，初始化寄存器序列和接线都得换，不能照抄本文代码。

圆屏物理可视区是直径 Φ38.16 mm 的圆，按 0.106mm/像素换算正好对应像素半径 180px——所以代码里 `R2MAX = 180²` 就是把圆外像素主动置黑，让圆形边缘干净（详见"常见问题排查"第 4 条）。

选它的原因很直接：QSPI 接口比传统 SPI 多了 3 根数据线，推数据的带宽是普通 SPI 的 4 倍，360×360 这种像素量级如果还用单线 SPI 推，帧率会很难看。

### 引脚说明

| 引脚              | 功能                                    |
| ----------------- | --------------------------------------- |
| SCLK              | QSPI 时钟线                             |
| D0 / D1 / D2 / D3 | QSPI 四条数据线（Quad Mode 下并行传输） |
| CS                | 片选，拉低选中该屏                      |
| BL（背光）        | 背光控制，部分模组未引出该引脚          |
| VCC               | 供电，通常 3.3V                         |
| GND               | 公共地                                  |

### JD9855（驱动芯片）

JD9855 是芯片厂商 Jadard（杰达科技）推出的一颗集成在屏幕模组里的单芯片 TFT LCD 驱动 IC，内置显示缓存（GRAM），负责把接收到的像素数据写入缓存并控制液晶单元显色，在本项目里的作用是执行 `esp_lcd_panel_io` 发过去的初始化寄存器序列和 RAMWR 像素写入指令。

好在 JD9855 **有公开的数据手册**（芯片厂商 Jadard（杰达科技）发布的 Preliminary V0.00 版，2023 年 10 月）。根据手册，它的关键规格如下：

| 参数               | 数值 / 说明                                                                                       | 数据手册来源       |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------ |
| 驱动能力           | 单芯片 SOC 驱动 a-Si TFT，最大 360 RGB×390（Dual-Gate=780）点，540 路源极驱动                      | Features / Intro   |
| 内置帧缓存         | 360×390×18 bit（约 315 KB GRAM）                                                                   | Features           |
| 支持接口           | 8080 并口（8-bit）、RGB（6-bit）、SPI（8/9-bit、2-lane）、**QSPI（支持 DDR）**、MIPI-DSI           | System Interface   |
| 颜色格式           | RGB565（16-bit） / RGB666（18-bit）                                                                | Color Format       |
| I/O 电压           | 1.65V ~ 3.3V                                                                                       | Features           |
| 工作温度           | -40 ~ +85 ℃                                                                                       | Features           |

这个手册把 0x2A（CASET）、0x2B（RASET）、0x2C（RAMWR）、0x36（MADCTL）、0x3A（COLMOD）等指令的位定义和时序都列得很清楚——本文代码里用到的正是这些标准指令。**需要说明的是**：手册公开的是指令集和时序，但像 Gamma 校正、电源升压、各厂自定的子命令（如本文初始化序列里的 `0xDE` / `0xDF` / `0xC3` 这类带「命令 Bank 切换」的寄存器）这类调屏参数，仍属于面板厂商按自家屏幕逐颗调校后的私有初始化表，这部分照抄厂商给的序列即可点亮，不必深究每条含义。

---

## BOM 表

| 元件                                 | 数量   | 备注                                                          |
| ------------------------------------ | ------ | ------------------------------------------------------------- |
| ESP32-S3 开发板                      | 1      | 建议选带 PSRAM 的版本，方便角度查表回落                       |
| TK015F5785 圆屏模组（JD9855 / QSPI） | 1      | 务必确认是 JD9855+QSPI 版本（同型号另有 ST77916/RGB 版，见元件说明） |
| 杜邦线（母对母，视模组排针而定）     | 6 根起 | SCLK / D0~D3 / CS 共 6 根，另加 VCC / GND                     |

---

## 接线方式

| 屏幕引脚   | 接到 ESP32-S3 引脚                         |
| ---------- | ------------------------------------------ |
| SCLK       | GPIO6                                      |
| D0         | GPIO15                                     |
| D1         | GPIO7                                      |
| D2         | GPIO11                                     |
| D3         | GPIO12                                     |
| CS         | GPIO16                                     |
| BL（背光） | 本模组未引出，无法软件控制，接上电源即常亮 |
| VCC        | 3.3V                                       |
| GND        | GND                                        |

建议接完逐一核对，能省 80% 排错时间——QSPI 有四条数据线，接反两根的现象往往不是黑屏而是花屏，比全黑更难排查。

---

## 需要安装的库

好消息：**不需要装任何第三方库**。整个驱动直接调用 ESP-IDF 内置的 `driver/spi_master.h`、`esp_lcd_panel_io.h`、`esp_heap_caps.h`，这些头文件是 Arduino ESP32 核心自带的。

唯一的硬性要求：Arduino IDE 里的 **ESP32 开发板核心必须是 v3.x**（基于 ESP-IDF v5）。v2.x 核心底层是 ESP-IDF v4.4，`esp_lcd_panel_io_tx_param` / `esp_lcd_panel_io_tx_color` 这套 API 在旧版本里行为和头文件路径都不一样，直接编译会报"找不到符号"或"函数签名不匹配"。

升级方式：Arduino IDE → 工具 → 开发板 → 开发板管理器，搜索 "esp32"，把 espressif 那个核心包更新到 3.x 以上版本。

---

## 完整代码

> 代码本身是单文件，复制粘贴进一个新的 .ino 即可编译。注意 CS 引脚是 `16`（历史上有个旧版本误写成不存在的 `160`，详见"常见问题排查"第一条）。

```cpp
/*
 * =============================================================================
 *  TK015F5785 圆屏 (JD9855, QSPI) 单文件炫彩演示 —— Arduino IDE 版
 * =============================================================================
 *
 *  ✦ 单文件: 驱动 + 演示全在这一个 .ino 里, 复制粘贴即可, 无需任何外部文件.
 *
 *  演示效果 (3 个场景自动循环, 每个约 6 秒, 全部丝滑连续):
 *    [1] Plasma 等离子流   —— 色彩如液体流动 (sin 查表)
 *    [2] 彩虹色盘          —— 全色谱 + 缓慢旋转 (角度预计算查表)
 *    [3] 辐射波纹          —— 中心向外的彩色涟漪 (r² 相位)
 *
 *  一上电就是满屏流动彩色, 直观证明 "屏亮了 + 颜色正常", 适合做点亮展示.
 *
 *  性能关键: 三个场景的每像素运算都是 "查表 + 整数加减", 不调用 sin/atan2/sqrt,
 *           所以每帧渲染都很快, 肉眼看不出逐行扫描, 全部丝滑.
 *
 *  硬件: ESP32-S3 + TK015F5785 (JD9855, QSPI)
 *    SCLK=6  D0=15  D1=7  D2=11  D3=12  CS=16  背光=-1(未引出, 不可控)
 *  依赖: 仅 Arduino IDE 的 esp32 板芯 v3.x, 无外部库 / 无字体 / 无外部头文件.
 *  上传: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled, 串口 115200.
 * =============================================================================
 */

#include <Arduino.h>
#include <math.h>
#include <initializer_list>
#include "driver/spi_master.h"
#include "esp_lcd_panel_io.h"
#include "esp_heap_caps.h"

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/* ----------------------------- 引脚配置 ----------------------------- */
/* 与 HelloWorld / 测试程序一致, 改接线时同步修改 */
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1      /* 背光, 设 -1 表示不控制 */ // 当前模块没有引出，所以无法控制

/* =====================================================================
 *  屏幕驱动 (JD9855 QSPI) —— 照搬即可, 一般无需修改
 *  原理: Arduino-ESP32 3.x 基于 ESP-IDF, 直接调 esp_lcd_panel_io 驱动 QSPI.
 * ===================================================================== */
#define JD9855_SWRESET 0x01
#define JD9855_CASET   0x2A
#define JD9855_RASET   0x2B
#define JD9855_RAMWR   0x2C
#define JD9855_MADCTL  0x36
#define JD9855_COLMOD  0x3A
#define JD9855_SLPOUT  0x11
#define JD9855_DISPON  0x29

class JD9855_QSPI {
public:
    static constexpr int H_RES = 360;
    static constexpr int V_RES = 360;

    /* 标准 RGB565 */
    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b)
    {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1)
    {
        if (backlight >= 0) { pinMode(backlight, OUTPUT); digitalWrite(backlight, HIGH); }

        spi_bus_config_t buscfg = {};
        buscfg.sclk_io_num  = sclk;
        buscfg.data0_io_num = d0;
        buscfg.data1_io_num = d1;
        buscfg.data2_io_num = d2;
        buscfg.data3_io_num = d3;
        buscfg.max_transfer_sz = H_RES * V_RES * 2;
        esp_err_t ret = spi_bus_initialize(SPI2_HOST, &buscfg, SPI_DMA_CH_AUTO);
        if (ret != ESP_OK) { log_e("spi_bus_initialize: %s", esp_err_to_name(ret)); return false; }

        esp_lcd_panel_io_spi_config_t io_config = {};
        io_config.cs_gpio_num        = cs;
        io_config.dc_gpio_num        = -1;
        io_config.spi_mode           = 3;
        io_config.pclk_hz            = 20 * 1000 * 1000;
        io_config.trans_queue_depth  = 10;
        io_config.lcd_cmd_bits       = 32;
        io_config.lcd_param_bits     = 8;
        io_config.flags.quad_mode    = true;
        ret = esp_lcd_new_panel_io_spi(SPI2_HOST, &io_config, &io);
        if (ret != ESP_OK) { log_e("esp_lcd_new_panel_io_spi: %s", esp_err_to_name(ret)); return false; }

        sendCmd(JD9855_SWRESET);
        delay(20);
        sendInitCommands();
        return true;
    }

    /* 把 RGB565(小端) 缓冲推送到矩形区域 */
    void pushRect(int x, int y, int w, int h, const uint16_t *data)
    {
        if (w <= 0 || h <= 0) return;
        setAddrWindow(x, y, x + w - 1, y + h - 1);
        size_t n = (size_t)w * h;
        ensureDmaBuf(n * 2);
        for (size_t i = 0; i < n; i++) {
            uint16_t c = data[i];
            dma_buf[i * 2]     = c >> 8;
            dma_buf[i * 2 + 1] = c & 0xFF;
        }
        sendColor(JD9855_RAMWR, dma_buf, n * 2);
    }

    /* 全屏填充 (逐行, 内存占用极小) */
    void fillScreen(uint16_t color)
    {
        uint8_t hi = color >> 8, lo = color & 0xFF;
        const int BUF_PIX = H_RES;
        ensureDmaBuf(BUF_PIX * 2);
        for (int i = 0; i < BUF_PIX; i++) { dma_buf[i*2] = hi; dma_buf[i*2+1] = lo; }
        for (int y = 0; y < V_RES; y++) {
            setAddrWindow(0, y, H_RES - 1, y);
            sendColor(JD9855_RAMWR, dma_buf, BUF_PIX * 2);
        }
    }

private:
    esp_lcd_panel_io_handle_t io = nullptr;
    uint8_t *dma_buf = nullptr;
    size_t   dma_buf_size = 0;

    void ensureDmaBuf(size_t need)
    {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1)
    {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data)
    {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    /* JD9855 厂家初始化序列 (移植自 ESP-IDF 版 esp_lcd_jd9855 驱动) */
    void sendInitCommands()
    {
        sendCmd(0xFF, {0x20, 0x10, 0x00});
        sendCmd(JD9855_MADCTL, {0x00});
        sendCmd(JD9855_COLMOD, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0xDF, {0x98, 0x55});
        sendCmd(0xCE, {0x0D, 0x00});
        sendCmd(0xD8, {0x08, 0x00});
        sendCmd(0xB2, {0x30});
        sendCmd(0xB7, {0x01, 0x35, 0x01, 0x5D});
        sendCmd(0xBB, {0x1B, 0x64, 0xE3, 0x34, 0x3E, 0xF3});
        sendCmd(0xBC, {0x00, 0x1A, 0xF3, 0xC0});
        sendCmd(0xC0, {0x22, 0xC1});
        sendCmd(0xC3, {0x00, 0x01, 0x8D, 0x0B, 0x08, 0x48, 0x07, 0x04, 0x62, 0x30, 0x30});
        sendCmd(0xC4, {0x40, 0x00, 0xAD, 0x68, 0x37, 0x07, 0x04, 0x16, 0x43, 0x07, 0x04});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xD3, {0x28, 0x13});
        sendCmd(0xD9, {0x00, 0x00, 0xFF, 0x00, 0xF0, 0x00});
        sendCmd(0xDE, {0x01});
        sendCmd(0xB7, {0x17, 0xA7, 0x64, 0x3B, 0x06, 0x36, 0x18, 0x18});
        sendCmd(0xBE, {0x00});
        sendCmd(0xC1, {0x04, 0x40, 0x90, 0x08});
        sendCmd(0xC2, {0x00, 0x16, 0xDA, 0xE7});
        sendCmd(0xC4, {0x72, 0x12});
        sendCmd(0xC7, {0x00, 0x00, 0x02, 0x32, 0x10, 0x32});
        sendCmd(0xC8, {0x00, 0x00, 0x0B, 0x32, 0x12, 0x2E});
        sendCmd(0xC9, {0x00, 0x0A, 0x08, 0x06, 0x04});
        sendCmd(0xCA, {0x1E, 0x1F, 0x10, 0x17, 0x18});
        sendCmd(0xCB, {0x01, 0x0B, 0x09, 0x07, 0x05});
        sendCmd(0xCC, {0x1E, 0x1F, 0x11, 0x17, 0x18});
        sendCmd(0xCD, {0x31, 0x25, 0x27, 0x29, 0x2B});
        sendCmd(0xCE, {0x3F, 0x3E, 0x21, 0x37, 0x38});
        sendCmd(0xCF, {0x30, 0x24, 0x26, 0x28, 0x2A});
        sendCmd(0xD0, {0x3F, 0x3E, 0x20, 0x37, 0x38});
        sendCmd(0xD1, {0x06, 0x30, 0xA5, 0xDB, 0x30});
        sendCmd(0xD3, {0x3B, 0x08, 0x00, 0x00, 0x00, 0x00});
        sendCmd(0xD4, {0x67, 0x00, 0x00, 0x01, 0x00, 0x01});
        sendCmd(0xD5, {0x10, 0x10, 0x07, 0x07, 0x0F, 0x94, 0x26});
        sendCmd(0xD6, {0x00, 0x00, 0x40});
        sendCmd(0xD7, {0x01, 0x84, 0x20});
        sendCmd(0xDE, {0x02});
        sendCmd(0xB6, {0x1C});
        sendCmd(0xDE, {0x00});
        sendCmd(0x2A, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x2B, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x35);
        sendCmd(0x36, {0x00});
        sendCmd(0x3A, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0x11);            /* 退出睡眠 */
        delay(120);
        sendCmd(0x29);            /* 开显示 */
        delay(10);
    }
};

/* =====================================================================
 *  演示部分 —— 重点看这里
 *  思路: 每帧逐行计算每个像素颜色, 推到屏幕.
 *       所有 "跟位置有关、跟时间无关" 的量 (sin、色相、角度) 都预算成查表,
 *       运行时每像素只做 "查表 + 整数加减", 所以三个场景都丝滑.
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     /* 360 */
static constexpr int H = JD9855_QSPI::V_RES;     /* 360 */
static constexpr int CX = W / 2;                  /* 圆心 x */
static constexpr int CY = H / 2;                  /* 圆心 y */
static constexpr int RADIUS = 180;                /* 圆屏可视半径 */
static constexpr int R2MAX  = RADIUS * RADIUS;    /* 圆外的 r² 阈值 (180²=32400) */

static const int BLOCK_H = 40;             /* 每批渲染+推送 40 行, 大幅减少推送次数 */
uint16_t blockBuf[W * BLOCK_H];            /* 块缓冲 (360*40*2=28KB, 内部 RAM, 无需 PSRAM) */
uint8_t  sinTab[256];       /* 正弦查表: sinTab[i] = sin(i/256*2π)*127+128 */
uint16_t hsvTab[256];       /* 色相(0-255) -> RGB565 查表 (饱和度/亮度最大) */
uint8_t *angleTab = nullptr;/* 每像素相对圆心的角度查表 (360*360B), 让圆盘场景不调 atan2 */

/* HSV(0-359, 0-255, 0-255) -> RGB565 */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v)
{
    uint8_t region = h / 60;
    uint8_t rem    = (h - region * 60) * 255 / 60;
    uint8_t p = (uint16_t)v * (255 - s) / 255;
    uint8_t q = (uint16_t)v * (255 - (uint16_t)s * rem / 255) / 255;
    uint8_t t = (uint16_t)v * (255 - (uint16_t)s * (255 - rem) / 255) / 255;
    uint8_t r, g, b;
    switch (region) {
        case 0:  r = v; g = t; b = p; break;
        case 1:  r = q; g = v; b = p; break;
        case 2:  r = p; g = v; b = t; break;
        case 3:  r = p; g = q; b = v; break;
        case 4:  r = t; g = p; b = v; break;
        default: r = v; g = p; b = q; break;
    }
    return JD9855_QSPI::color565(r, g, b);
}

/* 启动时生成 sin / 色相 两张表, 之后渲染只查表 */
void buildTables()
{
    for (int i = 0; i < 256; i++) {
        float s = sinf(i / 256.0f * 2.0f * (float)M_PI);
        sinTab[i] = (uint8_t)(s * 127.0f + 128.0f);
    }
    for (int h = 0; h < 256; h++) {
        hsvTab[h] = hsvTo565(h * 360 / 256, 255, 255);
    }
}

/* 预计算每个像素相对圆心的角度 (atan2), 存成 0-255 的查表.
   圆盘场景运行时只查表, 不用每帧调 atan2f (那是它原来卡顿的元凶).
   只在 setup 算一次, 耗时无所谓. 优先放内部 RAM (~126KB), 没有则回落 PSRAM;
   都没有则置 nullptr, 场景会降级回 atan2f (仍能看, 只是会卡). */
void buildAngleTable()
{
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab 分配失败, 圆盘场景将较慢")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   /* -0.5..0.5 */
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);        /* 环状映射到 0-255 */
        }
    }
    Serial.printf("[INIT] 角度表 %d KB 就绪 (圆盘场景将丝滑)\n", (int)(n / 1024));
}

inline uint8_t sin8(int phase) { return sinTab[(uint8_t)phase]; }

/* ---- 场景 1: Plasma 等离子流 (纯查表) ---- */
inline uint16_t plasmaPixel(int x, int y, int t)
{
    int v = sin8(x * 3 + t)
          + sin8(y * 3 - t * 2)
          + sin8((x + y) * 2 + t / 2)
          + sin8((x - y) * 2 - t / 2);
    return hsvTab[(uint8_t)(v / 4 + t)];
}

/* ---- 场景 2: 彩虹色盘 (角度查表 + r², 全整数) ---- */
inline uint16_t wheelPixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;                 /* 圆外置黑, 边缘干净 */
    int ang = angleTab ? angleTab[y * W + x]
                       : (int)(atan2f((float)dy, (float)dx) / (2.0f * (float)M_PI) * 256.0f);
    int hue = ang + r2 / 200 + t;             /* 沿径向叠色相, 形成螺旋色盘 */
    return hsvTab[(uint8_t)hue];
}

/* ---- 场景 3: 辐射波纹 (r² 直接做相位, 无需开方) ---- */
inline uint16_t ripplePixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;
    int v = sin8(r2 / 80 - t * 3);            /* 波纹相位: 随距离+时间扩散 */
    return hsvTab[(uint8_t)(v + r2 / 400)];
}

/* 渲染一帧: 每次算 BLOCK_H 行再整块推送 (9 次推送替代 360 次, 既省命令开销提帧率,
   又让每块 40 行同时刷新, 大幅减弱逐行扫描感). sceneId 选择像素函数 (0=plasma 1=wheel 2=ripple) */
void renderFrame(int sceneId, int t)
{
    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = (H - by < BLOCK_H) ? (H - by) : BLOCK_H;
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            for (int x = 0; x < W; x++) {
                uint16_t c;
                switch (sceneId) {
                    case 0:  c = plasmaPixel(x, yy, t); break;
                    case 1:  c = wheelPixel(x, yy, t);  break;
                    default: c = ripplePixel(x, yy, t); break;
                }
                blockBuf[y * W + x] = c;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* 场景名 */
const char *SCENE_NAMES[] = { "Plasma 等离子流", "彩虹色盘", "辐射波纹" };
const int      N_SCENES   = 3;
const uint32_t SCENE_MS   = 6000;    /* 每个场景停留 6 秒 */

int      curScene   = 0;
uint32_t sceneStart = 0;

/* ----------------------------- setup ------------------------------- */
void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[TK015F5785] 单文件炫彩演示 (JD9855 QSPI)"));

    Serial.println(F("[LCD] begin..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] init FAILED! 检查引脚/板芯版本(需 esp32 v3.x)"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] init OK"));

    buildTables();
    buildAngleTable();          /* 预计算角度表, 让圆盘场景丝滑 */
    lcd.fillScreen(0);
    sceneStart = millis();
    Serial.printf("[DEMO] 场景 1/%d: %s\n", N_SCENES, SCENE_NAMES[curScene]);
}

/* ----------------------------- loop -------------------------------- */
void loop()
{
    int t = (int)(millis() / 12);     /* 动画推进步长, 越大越快 */

    renderFrame(curScene, t);

    if (millis() - sceneStart >= SCENE_MS) {
        sceneStart = millis();
        curScene   = (curScene + 1) % N_SCENES;
        Serial.printf("[DEMO] 场景 %d/%d: %s\n",
                      curScene + 1, N_SCENES, SCENE_NAMES[curScene]);
    }
}
```

### 代码说明

第一步，`JD9855_QSPI::begin()` 里先用 `spi_bus_initialize` 起一条走 4 条数据线的 QSPI 总线，再用 `esp_lcd_new_panel_io_spi` 挂一个 `quad_mode = true` 的 LCD IO 设备——这一步是整个驱动能跑起来的关键，`quad_mode` 没开的话四条数据线只有一条真正在传数据，帧率会掉到没法看。

第二步，`sendInitCommands()` 是照抄面板厂商给的寄存器初始化表，逐条通过 `esp_lcd_panel_io_tx_param` 发过去，不需要理解每条寄存器的含义，改屏不改这段。

第三步，也是这份代码真正的看点：三个动画场景全部不在运行时调用 `sin`、`atan2`、`sqrt` 这类慢函数，而是在 `setup()` 阶段把它们都算成查找表（`sinTab`、`hsvTab`、`angleTab`），运行时每个像素只做"查表 + 整数加减"，这也是为什么 360×360 = 12.96 万像素每帧还能保持丝滑而不撕裂。

第四步，`renderFrame()` 没有逐行推送，而是攒够 `BLOCK_H = 40` 行再整块 `pushRect` 一次，360 行只需要 9 次推送，比逐行推 360 次省了大量 SPI 命令开销。

---

## 常见问题排查

别慌，下面这几种问题占了圆屏点不亮报错的大多数：

**1. 通电后一片黑，串口也没打印 `[LCD] init OK`** 先检查 CS 引脚有没有接对——这也是这份代码草稿版最容易踩的坑：`PIN_LCD_CS` 曾经被误写成了 `160`（不存在的 GPIO 编号），本文代码块里已经修正为 `16`，如果你是从别处复制的旧版本，务必确认这一行是 `16` 而不是 `160`。

**2. 屏幕亮但花屏、颜色错乱** 大概率是 D0~D3 这四条数据线接反了顺序。QSPI 对线序敏感，跟接错普通 SPI 的 MOSI/MISO 不是一回事，建议按接线表逐根核对，不要凭手感插。

**3. 编译报错，提示找不到 `esp_lcd_panel_io.h`** 说明当前 Arduino ESP32 核心还是 v2.x（基于 ESP-IDF v4.4）。去开发板管理器把 espressif 的 esp32 核心升级到 v3.x 以上再编译。

**4. 圆屏四角一直是黑的，是不是没接好？** 这是正常现象，不是故障。代码里 `R2MAX = 180²`，超出这个半径的像素被主动置黑，因为圆屏的物理可视区域本来就是个圆，四角本来就被边框遮住，这样处理边缘反而更干净。

**5. 串口打印 `angleTab 分配失败`，圆盘场景变卡** 说明内部 RAM 不够分配这张约 126KB（360×360 字节）的角度表。代码已经写了回落逻辑：先试内部 RAM，不行退到 PSRAM，再不行直接用 `atan2f` 现算（能看但会明显变慢）。如果你的开发板没有 PSRAM，且总感觉圆盘场景比另外两个卡，这就是原因，换一块带 PSRAM 的板子能根治。

**6. 背光一直亮着关不掉** 代码里 `PIN_LCD_BL` 设成了 `-1`，注释也写了"当前模块没有引出，所以无法控制"——如果你的模组确实引出了背光控制脚，把这个宏改成对应的 GPIO 编号，并在 `begin()` 里传入即可实现软件调光/开关。

---

## FAQ 问答

**Q：ESP32 怎么点亮一块圆形屏幕？** A：核心是用 QSPI 接口 + `esp_lcd_panel_io` 直连驱动芯片，不依赖 TFT_eSPI 这类通用图形库，接线时把 SCLK/D0~D3/CS 五根线对好，初始化寄存器表照抄面板厂商提供的序列即可点亮。

**Q：JD9855 驱动的圆屏用什么库？** A：不需要额外的库。JD9855 没有被主流图形库（如 TFT_eSPI、LVGL 官方驱动列表）内置支持，最稳妥的做法是像本文一样直接调用 ESP-IDF 自带的 `esp_lcd_panel_io` API 手写几十行初始化代码。

**Q：QSPI 屏幕和普通 SPI 屏幕接线有什么区别？** A：普通 SPI 只有 1 根数据线（MOSI），QSPI 有 4 根（D0~D3）并行传输，带宽是普通 SPI 的 4 倍，代价是接线多了 3 根，且 `esp_lcd_panel_io_spi_config_t` 里必须把 `flags.quad_mode` 设为 `true`。

**Q：ESP32-S3 圆屏一直黑屏是什么原因？** A：最常见的三个原因按概率排序：CS 引脚接错或写错编号、开发板核心版本低于 v3.x 导致初始化失败、供电不稳（QSPI 走线较长时更明显）。串口打印是否有 `[LCD] init OK` 能快速定位是驱动层问题还是接线问题。

**Q：Arduino 怎么用 esp_lcd_panel_io 驱动屏幕？** A：三步走：`spi_bus_initialize` 建立 SPI 总线、`esp_lcd_new_panel_io_spi` 创建 LCD IO 句柄（这一步指定 CS/时钟频率/SPI 模式/quad_mode）、最后用 `esp_lcd_panel_io_tx_param` 发命令、`esp_lcd_panel_io_tx_color` 发像素数据。

**Q：ESP32 圆屏能不能用 TFT_eSPI 库？** A：TFT_eSPI 主要面向它内置支持列表里的驱动芯片，JD9855 这类冷门 QSPI 驱动芯片不在其中，硬套通常需要自己改驱动层代码，反而不如直接用 ESP-IDF 原生 API 手写省心。

**Q：360×360 分辨率的圆屏内存够用吗？** A：够用，但要注意分配方式。整屏一次性缓冲需要 360×360×2 字节 ≈ 253KB，本文用的是分块渲染（每块 40 行，约 28KB），再加上可选的 126KB 角度查表，内部 RAM 基本能装下，没必要为了这块屏单独外挂 PSRAM（除非你想要角度表也放心地留在内部 RAM 里）。

---

## 延伸玩法

跑通基础演示之后，这块圆屏还有不少可以继续折腾的方向：

- 把三个查表场景换成实时数据可视化（CPU 负载、天气、心率等，圆屏形状很适合做仪表盘）
- 接入触摸/旋钮，做成可交互的圆形控制面板
- 用同样的 esp_lcd_panel_io 思路移植其他 QSPI 驱动芯片的屏幕
- 把 BLOCK_H 和 pclk_hz 调大做帧率压测，找到你这块具体模组的极限刷新率

---

## 参考资料

- <cite index="3-1">ESP-IDF 官方 LCD 外设文档说明了 esp_lcd 组件是 Espressif 为支持 SPI LCD、I80 LCD、RGB/SRGB LCD 等多种屏幕提供的一套跨芯片通用 API</cite>：[ESP-IDF LCD Peripheral (ESP32-S3)](https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32s3/api-reference/peripherals/lcd.html)
- [ESP32-S3 系列官方数据手册（PDF，Espressif 官方）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [espressif/arduino-esp32 官方 GitHub 仓库](https://github.com/espressif/arduino-esp32)
- <cite index="3-2">JD9855 的公开数据手册（芯片厂商 Jadard（杰达科技）发布的 Preliminary V0.00 版，2023-10-17；下方为 OSPTek 托管的 PDF 镜像）列出了 540 路源极驱动、360RGB×390 分辨率、内置 GRAM、8080/SPI/QSPI/MIPI-DSI 多接口及 CASET/RASET/RAMWR 等指令的完整时序</cite>：[JD9855 Data Sheet (Preliminary V0.00, PDF)](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
