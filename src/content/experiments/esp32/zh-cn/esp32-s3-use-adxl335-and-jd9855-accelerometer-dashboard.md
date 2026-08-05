---
title: "ESP32-S3 + ADXL335 驱动 JD9855 圆屏做三轴加速度仪表盘｜为什么「甩」比「倾斜」更明显"
boardId: esp32s3
moduleId: display/tft15-jd9855
moduleIds:
  - display/tft15-jd9855
  - sensor/adxl335
category: esp32
date: 2026-08-05
intro: "用 ESP32-S3 + ADXL335（GY-61）驱动 JD9855 QSPI 圆屏做实时三轴加速度仪表盘，含接线图、完整 Arduino 代码与常见问题排查，并讲清「甩动比倾斜更明显」背后的加速度计物理原理。"
image: "https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg"
---

> 难度：⭐⭐☆☆☆（有基础的 Arduino 操作经验即可上手）
> 预计时间：30-40 分钟（含校准和调试）
> 测试环境：Arduino IDE 2.3.8 · ESP32 Arduino Core 3.3.10

---

> **TL;DR（快速上手）：**
> 1. 按接线表接好屏幕（QSPI 6 线）和 ADXL335（X/Y/Z 三路模拟输入）
> 2. GPIO5 / GPIO9 / GPIO10 都在 ESP32-S3 的 ADC1 范围内，不用担心和 Wi-Fi 抢用
> 3. 上电后保持设备水平静止不动，让程序自动采样校准零点（约 1 秒）
> 4. 慢慢倾斜或用力甩动设备，观察圆屏上三色圆环 + 中心指针的联动变化

---

## 前言

折腾了两天，把 ADXL335 的三轴数据实时怼上了一块 360×360 的圆屏，慢慢倾斜设备，指针几乎纹丝不动；手一抖、使劲甩一下，指针"唰"地转出去大半圈。我一开始以为是校准没做好，查了一圈资料才反应过来——这玩意儿从物理原理上就不是纯粹的"倾斜仪"，它测的是加速度，甩得越猛读数越夸张，这是设计使然，不是 bug。还有我发现我手搓的 ESP32-S3 开发板，电源不太行，接上传感器屏幕会有明显的暗下来的时候。看来需要升级我的 ESP32-S3 开发板了。

所以这篇文章除了完整的接线、代码和踩坑记录，还想把这个"为什么甩比倾斜明显"的道理讲清楚，省得你复现的时候也在这个坑里怀疑人生。

---

## 实验效果

这块 360×360 圆屏会实时显示 ADXL335 的三轴加速度数据（注意，是加速度，不是纯姿态角）：外圈红/绿/蓝三色圆环分别对应 X / Y / Z 轴，中心的彩色指针会指向当前合力的方向，甩得越猛，指针摆动幅度越夸张，边缘还有一圈呼吸灯效果做装饰。

![](https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg)

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/B2hNfww6fXo?si=yirZlC1QrNw2urEF" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## 元件说明

> ESP32-S3 开发板不用专门介绍，能看到这篇文章说明你用过 ESP32。下面只说另外两个核心元件。

### ADXL335 加速度计（GY-61 模块）

ADXL335 干的事儿有点像体重秤——它不知道你"站得正不正"，只知道当前受到了多大的力，然后把这个力拆成 X/Y/Z 三个方向的分量报给你。它是一颗模拟输出的三轴 MEMS 加速度计，负责把设备受到的合力（重力分量 + 运动产生的加速度）转换成三路电压信号。

| 参数 | 数值 |
| --- | --- |
| 类型 | 三轴模拟输出 MEMS 加速度计 |
| 量程 | ±3.6g（典型）/ ±3g（最小保证值） |
| 灵敏度 | 300 mV/g（VS = 3V 时的典型值，与供电成比例） |
| 工作电压 | 1.8V ~ 3.6V |
| 带宽（GY-61 模块默认） | 约 50Hz（板载 0.1μF 滤波电容决定） |
| 噪声密度 | X/Y 约 270 µg/√Hz，Z 约 550 µg/√Hz（Z 约为 X/Y 的 2 倍） |

用它的原因很简单：便宜、模拟输出接线简单，随便一个 ADC 引脚就能读，非常适合拿来做可视化类的小玩具项目，不追求专业级姿态解算的话完全够用。

### 引脚说明

**ADXL335（GY-61）**

| 模块引脚 | 说明 |
| --- | --- |
| VCC / GND | 3.3V 供电 |
| X / Y / Z | 三路模拟输出，接 ADC 引脚 |
| ST | 自检引脚，一般不接 |

### TK015F5785 圆屏（JD9855 驱动，QSPI 接口）

这块屏可以理解成"只认四条数据线暗号的画布"——JD9855 是驱动芯片，负责把 MCU 发来的颜色数据搬到屏幕的每一个像素点上；QSPI（四线串行）接口负责用更少的引脚跑出更高的刷新速度。它是 1.5 寸左右、360×360 分辨率的圆形 TFT 屏，通过 SCLK/D0-D3/CS 五根信号线 + 供电即可驱动，不需要额外的 DC（数据/命令）引脚。

| 参数 | 数值 |
| --- | --- |
| 尺寸 | 1.5 寸圆形 IPS |
| 分辨率 | 360 × 360 |
| 驱动芯片 | JD9855 |
| 接口 | QSPI（四线制） |
| 供电 | 3.3V |
| 亮度/对比度 | 以卖家提供的规格书为准（不同批次可能有差异） |

选它的原因也很直接：圆屏做仪表盘类可视化天生好看，QSPI 接口只占用 5 个 GPIO，比传统并口省引脚，ESP32-S3 的 DMA 也能跑得动。

### 引脚说明

**屏幕 TK015F5785（JD9855 QSPI）**

| 屏幕引脚 | 说明 |
| --- | --- |
| SCLK | QSPI 时钟 |
| D0 ~ D3 | QSPI 四线数据 |
| CS | 片选 |
| VCC / GND | 3.3V 供电 |

---

## BOM 清单

| 元件 | 型号/参数 | 数量 | 参考单价 | 用途 |
| --- | --- | --- | --- | --- |
| 主控板 | ESP32-S3 开发板 | 1 | 约 30-50 元 | 主控 + Wi-Fi/蓝牙预留 |
| 圆屏 | TK015F5785（JD9855，360×360，QSPI） | 1 | 视卖家而定 | 显示 |
| 加速度计 | ADXL335（GY-61 模块） | 1 | 约 8-15 元 | 采集三轴加速度 |
| 杜邦线 | 母对母 | 若干 | - | 接线 |

---

## 接线方式

**屏幕 → ESP32-S3**

| 屏幕引脚 | ESP32-S3 引脚 |
| --- | --- |
| SCLK | GPIO6 |
| D0 | GPIO15 |
| D1 | GPIO7 |
| D2 | GPIO11 |
| D3 | GPIO12 |
| CS | GPIO16 |
| VCC | 3.3V |
| GND | GND |

**ADXL335 → ESP32-S3**

| 模块引脚 | ESP32-S3 引脚 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| X | GPIO5（ADC1） |
| Y | GPIO9（ADC1） |
| Z | GPIO10（ADC1） |

建议接完逐一核对，能省 80% 排错时间——尤其是屏幕的 D0~D3 四根线，接反一根屏幕大概率直接花屏或不亮。

---

## 需要安装的库

不需要装任何第三方库。屏幕驱动是直接调用 ESP-IDF 自带的 `esp_lcd_panel_io` 和 `driver/spi_master` 接口手写的 QSPI 驱动，库管理器里什么都不用搜。

唯一需要注意版本的地方：

- Arduino IDE：2.3.8（测试通过）
- ESP32 板级支持包（esp32 by Espressif Systems）：**3.3.10**（基于 ESP-IDF 5.x）——必须是 v3.x，因为代码用到的 `quad_mode` 标志位和部分 DMA 接口在旧版 v2.x 核心里不一定齐全
- Board 选择：ESP32S3 Dev Module，USB CDC On Boot 设为 Enabled

---

## 代码

```cpp
/*
 * =============================================================================
 *  ADXL335 + TK015F5785 圆屏 —— 三轴加速度仪表盘
 *  =====================================================================
 *
 *  单场景: 三轴加速度仪表盘 —— 实时显示三轴数据 + 合力方向, 中心指针指向合力方向
 *
 *  硬件: ESP32-S3 + TK015F5785 (JD9855 QSPI) + ADXL335 (GY-61)
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                          接线说明                                   │
 *  ├─────────────────────────────────────────────────────────────────────┤
 *  │  【屏幕 TK015F5785】          │  【ADXL335 (GY-61)】                 │
 *  │  SCLK  → GPIO6               │  VCC → 3.3V                         │
 *  │  D0    → GPIO15              │  GND → GND                          │
 *  │  D1    → GPIO7               │  X   → GPIO5 (ADC)                  │
 *  │  D2    → GPIO11              │  Y   → GPIO9 (ADC)                  │
 *  │  D3    → GPIO12              │  Z   → GPIO10 (ADC)                  │
 *  │  CS    → GPIO16              │                                      │
 *  │  VCC   → 3.3V                │                                      │
 *  │  GND   → GND                 │                                      │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 *  依赖: 仅 Arduino IDE 的 esp32 板芯 v3.x
 *  上传: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled
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
// 屏幕引脚
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1

// ADXL335 引脚 (模拟输入)
#define PIN_ACCEL_X    5
#define PIN_ACCEL_Y    9
#define PIN_ACCEL_Z    10

/* =====================================================================
 *  JD9855 QSPI 屏幕驱动类
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

    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b) {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1) {
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
        io_config.pclk_hz            = 20 * 1000 * 1000;  // 走线吃不动 40MHz, 退回 20MHz 稳态
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

    void pushRect(int x, int y, int w, int h, const uint16_t *data) {
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

    void fillScreen(uint16_t color) {
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

    void ensureDmaBuf(size_t need) {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1) {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data) {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    void sendInitCommands() {
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
        sendCmd(0x11);
        delay(120);
        sendCmd(0x29);
        delay(10);
    }
};

/* =====================================================================
 *  全局变量
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     // 360
static constexpr int H = JD9855_QSPI::V_RES;     // 360
static constexpr int CX = W / 2;                  // 圆心 x = 180
static constexpr int CY = H / 2;                  // 圆心 y = 180
static constexpr int RADIUS = 180;
static constexpr int R2MAX  = RADIUS * RADIUS;

static const int BLOCK_H = 40;
uint16_t blockBuf[W * BLOCK_H];

// 每像素相对圆心的角度查表 (atan2 预算成 0-255), 让渲染不逐像素调 atan2f
uint8_t *angleTab = nullptr;

// 加速度计数据 (滤波后)
float accelX = 0, accelY = 0, accelZ = 0;
// 加速度计原始中心值 (静止时的ADC值，需要校准)
int accelXCenter = 2048, accelYCenter = 2048, accelZCenter = 2730;

// 颜色定义
uint16_t COLOR_BLACK;
uint16_t COLOR_WHITE;
uint16_t COLOR_LIGHT_GRAY;

/* =====================================================================
 *  工具函数
 * ===================================================================== */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v) {
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

void initColors() {
    COLOR_BLACK      = JD9855_QSPI::color565(0, 0, 0);
    COLOR_WHITE      = JD9855_QSPI::color565(255, 255, 255);
    COLOR_LIGHT_GRAY = JD9855_QSPI::color565(100, 100, 110);
}

/* =====================================================================
 *  加速度计读取与滤波
 * ===================================================================== */
void readAccelerometer() {
    // 读取原始ADC值 (ESP32-S3 ADC 12位, 0-4095)
    int rawX = analogRead(PIN_ACCEL_X);
    int rawY = analogRead(PIN_ACCEL_Y);
    int rawZ = analogRead(PIN_ACCEL_Z);

    // 转换为 -1.0 到 1.0 的归一化值
    // ADXL335 在 3.3V 供电下, 每g约 330mV, 中心约 1.65V
    // ADC 3.3V = 4095, 所以每g约 409 ADC单位
    float newX = (rawX - accelXCenter) / 409.0f;
    float newY = (rawY - accelYCenter) / 409.0f;
    float newZ = (rawZ - accelZCenter) / 409.0f;

    // 限幅
    newX = constrain(newX, -1.5f, 1.5f);
    newY = constrain(newY, -1.5f, 1.5f);
    newZ = constrain(newZ, -1.5f, 1.5f);

    // 低通滤波 (平滑)
    const float alpha = 0.3f;
    accelX = accelX * (1 - alpha) + newX * alpha;
    accelY = accelY * (1 - alpha) + newY * alpha;
    accelZ = accelZ * (1 - alpha) + newZ * alpha;
}

/* 预计算每个像素相对圆心的角度 (atan2), 存成 0-255 查表.
   运行时每像素只查表还原成弧度, 不再每帧调 atan2f —— 那是原来卡顿的元凶.
   只在 setup 算一次. 优先内部 RAM (~126KB), 不够回落 PSRAM;
   都没有则置 nullptr, 渲染降级回 atan2f (仍能看, 只是慢). */
void buildAngleTable() {
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab 分配失败, 画面将较慢")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   // -0.5..0.5
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);
        }
    }
    Serial.printf("[INIT] 角度表 %d KB 就绪\n", (int)(n / 1024));
}

/* =====================================================================
 *  场景: 三轴加速度仪表盘
 *  显示三轴实时数据，带动态指针和数值
 * ===================================================================== */
void renderGaugeScene() {
    // ---- 每帧常量 (提到循环外, 避免逐像素重算) ----
    int t = millis() / 50;
    float breathe   = (sinf(t * 0.1f) + 1) / 2;
    float tiltAngle = atan2f(accelY, accelX);
    float tiltMag   = sqrtf(accelX * accelX + accelY * accelY);
    tiltMag = min(1.0f, tiltMag);
    float xAngle    = accelX * M_PI / 2;
    float yAngle    = -M_PI / 2 + accelY * M_PI / 2;
    float zVal      = (accelZ + 1) / 2;
    float fillAngle = -M_PI + zVal * 2 * M_PI;
    const float A8SCALE = M_PI / 128.0f;   // 角度查表(0-255) -> 弧度

    // 半径阈值全部用 r^2 (整数比较), 避免逐像素 sqrtf —— 只有中心指针那一小块才需要 float r
    const int R2_TICK_LO  = 160 * 160, R2_TICK_HI  = 175 * 175;
    const int R2_X_LO     = 135 * 135, R2_X_HI     = 155 * 155;
    const int R2_Y_LO     =  95 *  95, R2_Y_HI     = 115 * 115;
    const int R2_Z_LO     =  55 *  55, R2_Z_HI     =  75 *  75;
    const int R2_NDL_LO   =   5 *   5, R2_NDL_HI   =  50 *  50;
    const int R2_BR_LO    = 175 * 175, R2_BR_HI    = 180 * 180;
    const int R2_145_LO = 145 * 145, R2_145_HI = 146 * 146;
    const int R2_105_LO = 105 * 105, R2_105_HI = 106 * 106;
    const int R2_65_LO  =  65 *  65, R2_65_HI  =  66 *  66;
    const int R2_165    = 165 * 165;

    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = min(BLOCK_H, H - by);
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            const uint8_t *angRow = angleTab ? &angleTab[yy * W] : nullptr;  // 每行取一次行首指针
            for (int x = 0; x < W; x++) {
                int dx = x - CX, dy = yy - CY;
                int r2 = dx * dx + dy * dy;

                if (r2 > R2MAX) {
                    blockBuf[y * W + x] = COLOR_BLACK;
                    continue;
                }

                float angle = angRow ? ((int8_t)angRow[x] * A8SCALE)
                                     : atan2f((float)dy, (float)dx);

                // 深色背景
                uint16_t color = JD9855_QSPI::color565(15, 20, 30);

                // 外圈刻度
                if (r2 > R2_TICK_LO && r2 < R2_TICK_HI) {
                    int deg = (int)((angle + M_PI) * 180 / M_PI) % 30;
                    if (deg < 3 || (r2 > R2_165 && deg % 10 < 2)) {
                        color = COLOR_LIGHT_GRAY;
                    }
                }

                // X轴 (外环, 红色)
                if (r2 > R2_X_LO && r2 < R2_X_HI) {
                    float angleDiff = fabsf(angle - xAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(100 + tt * 155, 30, 30);
                    } else if (r2 >= R2_145_LO && r2 < R2_145_HI) {
                        color = JD9855_QSPI::color565(60, 20, 20);
                    }
                }

                // Y轴 (中环, 绿色)
                if (r2 > R2_Y_LO && r2 < R2_Y_HI) {
                    float angleDiff = fabsf(angle - yAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(30, 100 + tt * 155, 30);
                    } else if (r2 >= R2_105_LO && r2 < R2_105_HI) {
                        color = JD9855_QSPI::color565(20, 60, 20);
                    }
                }

                // Z轴 (内环, 蓝色)
                if (r2 > R2_Z_LO && r2 < R2_Z_HI) {
                    if (angle < fillAngle || angle < -M_PI + 0.1) {
                        color = JD9855_QSPI::color565(30, 80, 200);
                    } else if (r2 >= R2_65_LO && r2 < R2_65_HI) {
                        color = JD9855_QSPI::color565(20, 30, 80);
                    }
                }

                // 中心指针 (指向合力方向) —— 只有这里需要 float r
                if (r2 > R2_NDL_LO && r2 < R2_NDL_HI) {
                    float r = sqrtf((float)r2);
                    float angleDiff = fabsf(angle - tiltAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    float needleWidth = 0.15f * (1 - r / 50);

                    if (angleDiff < needleWidth && r < 45 * tiltMag + 10) {
                        int hue = (int)(tiltAngle * 180 / M_PI + 180) % 360;
                        color = hsvTo565(hue, 200, 255);
                    }
                }

                // 中心点
                if (r2 < 64) {
                    color = COLOR_WHITE;
                }

                // 呼吸光效装饰 (breathe 已在循环外算好)
                if (r2 > R2_BR_LO && r2 < R2_BR_HI) {
                    int hue = ((int)(angle * 180 / M_PI) + t * 2) % 360;
                    color = hsvTo565(hue, 255, 100 + breathe * 100);
                }

                blockBuf[y * W + x] = color;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* =====================================================================
 *  主程序
 * ===================================================================== */
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[ADXL335 + TK015F5785] 三轴加速度仪表盘"));

    // 初始化颜色
    initColors();

    // 初始化ADC (ESP32-S3)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);  // 0-3.3V 量程
    pinMode(PIN_ACCEL_X, INPUT);
    pinMode(PIN_ACCEL_Y, INPUT);
    pinMode(PIN_ACCEL_Z, INPUT);

    // 校准: 读取静止状态的中心值
    Serial.println(F("[ACCEL] 校准中, 请保持设备水平静止..."));
    delay(500);
    long sumX = 0, sumY = 0, sumZ = 0;
    for (int i = 0; i < 100; i++) {
        sumX += analogRead(PIN_ACCEL_X);
        sumY += analogRead(PIN_ACCEL_Y);
        sumZ += analogRead(PIN_ACCEL_Z);
        delay(10);
    }
    accelXCenter = sumX / 100;
    accelYCenter = sumY / 100;
    accelZCenter = sumZ / 100 - 409;  // Z轴静止时约为 1g, 减去 1g 的偏移
    Serial.printf("[ACCEL] 校准完成: X=%d, Y=%d, Z=%d\n", accelXCenter, accelYCenter, accelZCenter);

    // 初始化屏幕
    Serial.println(F("[LCD] 初始化..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] 初始化失败!"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] 初始化成功"));

    buildAngleTable();   // 预计算每像素角度, 让仪表盘渲染不卡顿

    lcd.fillScreen(COLOR_BLACK);
    Serial.println(F("[DEMO] 三轴加速度仪表盘"));
}

void loop() {
    // 读取加速度计
    readAccelerometer();

    // 渲染仪表盘
    renderGaugeScene();

    // 打印调试信息 (每秒一次)
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint > 1000) {
        lastPrint = millis();
        Serial.printf("X=%.2f  Y=%.2f  Z=%.2f\n", accelX, accelY, accelZ);
    }
}
```

### 代码说明

- **屏幕驱动部分**：`JD9855_QSPI` 类直接调用 ESP-IDF 的 `esp_lcd_panel_io_spi` 接口手写驱动，没有依赖任何第三方图形库。`pclk_hz` 特意从常见的 40MHz 降到 20MHz，是因为走线较长时 40MHz 容易花屏，这是实测踩坑后的稳态值，如果你的走线短、屏线质量好，可以自己往上试。
- **角度查表 `buildAngleTable()`**：这是整个渲染的性能关键。第一步，在 `setup()` 里把 360×360 每个像素相对圆心的角度提前算好，压缩存成 0-255 的一字节查表；第二步，渲染时每个像素只做一次数组查表，不再逐像素调用较慢的 `atan2f()`。这一步优化直接决定了仪表盘刷新流不流畅。
- **`readAccelerometer()` 读数与滤波**：第一步读原始 ADC 值；第二步按 409 counts/g 的换算把电压转成 -1~1 的归一化值（这个换算系数来自 ADXL335 300mV/g 的典型灵敏度 × ESP32-S3 12 位 ADC 满量程 3.3V 的理论值，实测建议按自己模块微调）；第三步做一阶低通滤波（`alpha = 0.3`）平滑毛刺。
- **为什么"甩"比"倾斜"效果明显，在代码里体现在哪**：`xAngle = accelX * M_PI / 2` 这一行把 accelX 的 ±1g 线性映射到 ±90°。慢慢倾斜时 accelX 理论上限就是 ±1g，对应刚好 ±90°；但甩动时惯性加速度叠加在重力上，accelX 实际读数经常超过 ±1，被 `constrain()` 限幅到 ±1.5g，映射出来的角度摆动自然比慢倾斜猛得多——这不是画图逻辑的问题，是加速度计物理特性决定的。
- **Z 轴渲染**：`zVal` 把 accelZ 从 -1~1 映射到 0~1 再转成一个填充角度 `fillAngle`，本质是用一个"进度环"的形式展示 Z 轴数值；如果发现这个进度环一直在轻微抖动，属于正常现象（后面 FAQ 有解释）。

---

## 常见问题排查

别慌，八成的问题都出在这几个地方：

1. **屏幕不亮或花屏**：先查 QSPI 的 D0~D3 四根数据线有没有接反，再确认 CS/SCLK 独立接对，最后确认屏幕供电稳定在 3.3V（供电纹波大也会花屏）。
2. **ADXL335 读数一直卡在 2048 附近不动**：检查是不是接到了没通的 ADC 引脚，或者模块本身供电异常；本项目用的 GPIO5/9/10 都在 ESP32-S3 ADC1 范围内，不受 Wi-Fi 占用 ADC2 的影响，可以排除这个可能。
3. **Z 轴数值一直乱跳**：这是 ADXL335 的原厂设计特性，Z 轴噪声密度天生比 X/Y 轴高，不是接线或代码问题。可以把滤波系数 `alpha` 调小（比如从 0.3 降到 0.1），或者在代码里做多次采样取平均（过采样）来缓解。
4. **慢慢倾斜没反应，一甩才有反应**：这是加速度计的物理本质——它测的是"合力"，不是单纯姿态角。只有配合陀螺仪做传感器融合，才能得到不受运动干扰的稳定姿态输出。
5. **编译报错，找不到 `esp_lcd_panel_io.h`**：检查 Arduino IDE 里 ESP32 板级支持包版本，必须是 v3.x（基于 ESP-IDF 5.x），旧版核心没有这些接口。
6. **校准完之后中心值明显偏移**：校准阶段设备没放平或者在晃动，建议放在水平桌面上再上电，校准那一秒尽量别碰它。

---

## FAQ 问答

**Q：ADXL335 到底是测倾斜还是测运动的？**
A：严格来说它测的是"比力"（重力分量 + 运动加速度的合成），没法单独区分二者。持续慢倾斜最多只改变重力分量 ±1g，而甩动会叠加运动加速度，幅度经常超过 ±1g，所以视觉上"甩"比"慢倾斜"明显得多。想要纯净的姿态角，需要换成带陀螺仪的六轴 IMU（如 MPU6050）做传感器融合。

**Q：为什么 Z 轴读数一直在跳，X/Y 相对稳？**
A：这是 ADXL335 的原厂设计特性——数据手册显示 Z 轴的输出噪声密度大约是 X/Y 轴的两倍，不是接线或代码问题。可以靠加大低通滤波、增加 ADC 过采样来缓解，没法完全消除。

**Q：GY-61 模块能测多快的动作？**
A：板载滤波电容是 0.1μF，把每个轴的带宽限制在约 50Hz，日常甩动、倾斜完全够用；如果要测更高频的振动，需要更换更小容值的滤波电容。

**Q：ESP32-S3 的 GPIO5/9/10 用作 ADC 会不会和 Wi-Fi 冲突？**
A：不会。这三个引脚都在 ESP32-S3 的 ADC1 范围内（GPIO1~10），只有 ADC2（GPIO11~20）在 Wi-Fi 工作时会受限制，这个项目不用担心这个坑。

**Q：校准时为什么要保持设备水平静止？**
A：代码上电后连续采样 100 次取平均，把这个平均值当作"0g"基准点。如果校准时设备是歪的或在晃动，基准点就会跑偏，后续所有换算都会跟着偏移。

**Q：这套代码要装额外的第三方库吗？**
A：不需要。屏幕驱动是直接调用 ESP-IDF 自带的 `esp_lcd_panel_io` 和 `spi_master` 接口手写的，只要 Arduino IDE 里的 ESP32 板级支持包是 v3.x 就够，库管理器里什么都不用装。

---

## 延伸玩法

- 加一颗六轴 IMU（比如 MPU6050），做传感器融合，得到真正不受晃动干扰的稳定姿态仪表盘
- 把"甩动强度"单独提取出来，做成一个简易的"暴力检测仪"，超过阈值就变色或报警
- 接一个蜂鸣器或 RGB 灯，倾斜超过设定角度就报警，当简易水平仪用
- 用 SD 卡把运动数据记录下来，事后导出画成曲线复盘

---

## 参考资料

- [ADXL335 官方产品页与数据手册（Analog Devices）](https://www.analog.com/en/products/adxl335.html)
- [GY-61 / ADXL335 breakout 板载滤波电容与带宽说明（Adafruit）](https://www.adafruit.com/product/163)
- [JD9855 QSPI 驱动芯片数据手册](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
- [ESP32-S3 系列数据手册（Espressif，ADC1/ADC2 引脚划分）](https://documentation.espressif.com/esp32-s3_datasheet_en.pdf)
