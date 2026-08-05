---
title: "ESP32-S3 + ADXL335 驅動 JD9855 圓螢幕做三軸加速度儀表板｜為什麼「甩」比「傾斜」更明顯"
boardId: esp32s3
moduleId: display/tft15-jd9855
moduleIds:
  - display/tft15-jd9855
  - sensor/adxl335
category: esp32
date: 2026-08-05
intro: "用 ESP32-S3 + ADXL335（GY-61）驅動 JD9855 QSPI 圓螢幕做即時三軸加速度儀表板，含接線圖、完整 Arduino 程式碼與常見問題排查，並講清「甩動比傾斜更明顯」背後的加速度計物理原理。"
image: "https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg"
---

> 難度：⭐⭐☆☆☆（有基礎的 Arduino 操作經驗即可上手）
> 預計時間：30-40 分鐘（含校準和除錯）
> 測試環境：Arduino IDE 2.3.8 · ESP32 Arduino Core 3.3.10

---

> **TL;DR（快速上手）：**
> 1. 按接線表接好螢幕（QSPI 6 線）和 ADXL335（X/Y/Z 三路類比輸入）
> 2. GPIO5 / GPIO9 / GPIO10 都在 ESP32-S3 的 ADC1 範圍內，不用擔心和 Wi-Fi 搶用
> 3. 上電後保持裝置水平靜止不動，讓程式自動取樣校準零點（約 1 秒）
> 4. 慢慢傾斜或用力甩動裝置，觀察圓螢幕上三色圓環 + 中心指針的連動變化

---

## 前言

折騰了兩天，把 ADXL335 的三軸資料即時推上了一塊 360×360 的圓螢幕，慢慢傾斜裝置，指針幾乎紋絲不動；手一抖、使勁甩一下，指針「唰」地轉出去大半圈。我一开始以为是校準沒做好，查了一圈資料才反應過來——這玩意兒從物理原理上就不是純粹的「傾斜儀」，它測的是加速度，甩得越猛讀數越誇張，這是設計使然，不是 bug。還有我發現我手搓的 ESP32-S3 開發板，電源不太行，接上感測器螢幕會有明顯暗下來的時候。看來需要升級我的 ESP32-S3 開發板了。

所以這篇文章除了完整的接線、程式碼和踩坑記錄，還想把這個「為什麼甩比傾斜明顯」的道理講清楚，免得你重現的時候也在這個坑裡懷疑人生。

---

## 實驗效果

這塊 360×360 圓螢幕會即時顯示 ADXL335 的三軸加速度資料（注意，是加速度，不是純姿態角）：外圈紅/綠/藍三色圓環分別對應 X / Y / Z 軸，中心的彩色指針會指向當前合力的方向，甩得越猛，指針擺動幅度越誇張，邊緣還有一圈呼吸燈效果做裝飾。

![](https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg)

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/B2hNfww6fXo?si=yirZlC1QrNw2urEF" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## 元件說明

> ESP32-S3 開發板不用專門介紹，能看到這篇文章說明你用過 ESP32。下面只說另外兩個核心元件。

### ADXL335 加速度計（GY-61 模組）

ADXL335 幹的事兒有點像體重秤——它不知道你「站得正不正」，只知道當前受到了多大的力，然後把這個力拆成 X/Y/Z 三個方向的分量報給你。它是一顆類比輸出的三軸 MEMS 加速度計，負責把裝置受到的合力（重力分量 + 運動產生的加速度）轉換成三路電壓訊號。

| 參數 | 數值 |
| --- | --- |
| 類型 | 三軸類比輸出 MEMS 加速度計 |
| 量程 | ±3.6g（典型）/ ±3g（最小保證值） |
| 靈敏度 | 300 mV/g（VS = 3V 時的典型值，與供電成比例） |
| 工作電壓 | 1.8V ~ 3.6V |
| 頻寬（GY-61 模組預設） | 約 50Hz（板載 0.1μF 濾波電容決定） |
| 雜訊密度 | X/Y 約 270 µg/√Hz，Z 約 550 µg/√Hz（Z 約為 X/Y 的 2 倍） |

用它的原因很簡單：便宜、類比輸出接線簡單，隨便一個 ADC 腳位就能讀，非常適合拿來做視覺化類的小玩具專案，不追求專業級姿態解算的話完全夠用。

### 腳位說明

**ADXL335（GY-61）**

| 模組腳位 | 說明 |
| --- | --- |
| VCC / GND | 3.3V 供電 |
| X / Y / Z | 三路類比輸出，接 ADC 腳位 |
| ST | 自檢腳位，一般不接 |

### TK015F5785 圓螢幕（JD9855 驅動，QSPI 介面）

這塊螢幕可以理解成「只認四條資料線暗號的畫布」——JD9855 是驅動晶片，負責把 MCU 發來的顏色資料搬到螢幕的每一個像素點上；QSPI（四線串列）介面負責用更少的腳位跑出更高的更新速度。它是 1.5 吋左右、360×360 解析度的圓形 TFT 螢幕，透過 SCLK/D0-D3/CS 五根訊號線 + 供電即可驅動，不需要額外的 DC（資料/命令）腳位。

| 參數 | 數值 |
| --- | --- |
| 尺寸 | 1.5 吋圓形 IPS |
| 解析度 | 360 × 360 |
| 驅動晶片 | JD9855 |
| 介面 | QSPI（四線制） |
| 供電 | 3.3V |
| 亮度/對比度 | 以賣家提供的規格書為準（不同批次可能有差異） |

選它的原因也很直接：圓螢幕做儀表板類視覺化天生好看，QSPI 介面只佔用 5 個 GPIO，比傳統並列埠省腳位，ESP32-S3 的 DMA 也能跑得動。

### 腳位說明

**螢幕 TK015F5785（JD9855 QSPI）**

| 螢幕腳位 | 說明 |
| --- | --- |
| SCLK | QSPI 時脈 |
| D0 ~ D3 | QSPI 四線資料 |
| CS | 晶片選擇 |
| VCC / GND | 3.3V 供電 |

---

## BOM 清單

| 元件 | 型號/參數 | 數量 | 參考單價 | 用途 |
| --- | --- | --- | --- | --- |
| 主控板 | ESP32-S3 開發板 | 1 | 約 30-50 元 | 主控 + Wi-Fi/藍牙預留 |
| 圓螢幕 | TK015F5785（JD9855，360×360，QSPI） | 1 | 視賣家而定 | 顯示 |
| 加速度計 | ADXL335（GY-61 模組） | 1 | 約 8-15 元 | 採集三軸加速度 |
| 杜邦線 | 母對母 | 若干 | - | 接線 |

---

## 接線方式

**螢幕 → ESP32-S3**

| 螢幕腳位 | ESP32-S3 腳位 |
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

| 模組腳位 | ESP32-S3 腳位 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| X | GPIO5（ADC1） |
| Y | GPIO9（ADC1） |
| Z | GPIO10（ADC1） |

建議接完逐一核對，能省 80% 除錯時間——尤其是螢幕的 D0~D3 四根線，接反一根螢幕大概率直接花屏或不亮。

---

## 需要安裝的函式庫

不需要安裝任何第三方函式庫。螢幕驅動是直接呼叫 ESP-IDF 自帶的 `esp_lcd_panel_io` 和 `driver/spi_master` 介面手寫的 QSPI 驅動，函式庫管理員裡什麼都不用搜。

唯一需要注意版本的地方：

- Arduino IDE：2.3.8（測試通過）
- ESP32 板級支援包（esp32 by Espressif Systems）：**3.3.10**（基於 ESP-IDF 5.x）——必須是 v3.x，因為程式碼用到的 `quad_mode` 旗標位元和部分 DMA 介面在舊版 v2.x 核心裡不一定齊全
- Board 選擇：ESP32S3 Dev Module，USB CDC On Boot 設為 Enabled

---

## 程式碼

```cpp
/*
 * =============================================================================
 *  ADXL335 + TK015F5785 圓螢幕 —— 三軸加速度儀表板
 *  =====================================================================
 *
 *  單場景: 三軸加速度儀表板 —— 即時顯示三軸資料 + 合力方向, 中心指針指向合力方向
 *
 *  硬體: ESP32-S3 + TK015F5785 (JD9855 QSPI) + ADXL335 (GY-61)
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                          接線說明                                   │
 *  ├─────────────────────────────────────────────────────────────────────┤
 *  │  【螢幕 TK015F5785】          │  【ADXL335 (GY-61)】                 │
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
 *  相依: 僅 Arduino IDE 的 esp32 板芯 v3.x
 *  上傳: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled
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

/* ----------------------------- 腳位配置 ----------------------------- */
// 螢幕腳位
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1

// ADXL335 腳位 (類比輸入)
#define PIN_ACCEL_X    5
#define PIN_ACCEL_Y    9
#define PIN_ACCEL_Z    10

/* =====================================================================
 *  JD9855 QSPI 螢幕驅動類別
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
        io_config.pclk_hz            = 20 * 1000 * 1000;  // 走線吃不動 40MHz, 退回 20MHz 穩態
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
 *  全域變數
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     // 360
static constexpr int H = JD9855_QSPI::V_RES;     // 360
static constexpr int CX = W / 2;                  // 圓心 x = 180
static constexpr int CY = H / 2;                  // 圓心 y = 180
static constexpr int RADIUS = 180;
static constexpr int R2MAX  = RADIUS * RADIUS;

static const int BLOCK_H = 40;
uint16_t blockBuf[W * BLOCK_H];

// 每像素相對圓心的角度查表 (atan2 預算成 0-255), 讓算繪不逐像素呼叫 atan2f
uint8_t *angleTab = nullptr;

// 加速度計資料 (濾波後)
float accelX = 0, accelY = 0, accelZ = 0;
// 加速度計原始中心值 (靜止時的ADC值，需要校準)
int accelXCenter = 2048, accelYCenter = 2048, accelZCenter = 2730;

// 顏色定義
uint16_t COLOR_BLACK;
uint16_t COLOR_WHITE;
uint16_t COLOR_LIGHT_GRAY;

/* =====================================================================
 *  工具函式
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
 *  加速度計讀取與濾波
 * ===================================================================== */
void readAccelerometer() {
    // 讀取原始ADC值 (ESP32-S3 ADC 12位元, 0-4095)
    int rawX = analogRead(PIN_ACCEL_X);
    int rawY = analogRead(PIN_ACCEL_Y);
    int rawZ = analogRead(PIN_ACCEL_Z);

    // 轉換為 -1.0 到 1.0 的歸一化值
    // ADXL335 在 3.3V 供電下, 每g約 330mV, 中心約 1.65V
    // ADC 3.3V = 4095, 所以每g約 409 ADC單位
    float newX = (rawX - accelXCenter) / 409.0f;
    float newY = (rawY - accelYCenter) / 409.0f;
    float newZ = (rawZ - accelZCenter) / 409.0f;

    // 限幅
    newX = constrain(newX, -1.5f, 1.5f);
    newY = constrain(newY, -1.5f, 1.5f);
    newZ = constrain(newZ, -1.5f, 1.5f);

    // 低通濾波 (平滑)
    const float alpha = 0.3f;
    accelX = accelX * (1 - alpha) + newX * alpha;
    accelY = accelY * (1 - alpha) + newY * alpha;
    accelZ = accelZ * (1 - alpha) + newZ * alpha;
}

/* 預先計算每個像素相對圓心的角度 (atan2), 存成 0-255 查表.
   執行時每像素只查表還原成弧度, 不再每幀呼叫 atan2f —— 那是原來卡頓的元凶.
   只在 setup 算一次. 優先內部 RAM (~126KB), 不夠回落 PSRAM;
   都沒有則置 nullptr, 算繪降級回 atan2f (仍能看, 只是慢). */
void buildAngleTable() {
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab 配置失敗, 畫面將較慢")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   // -0.5..0.5
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);
        }
    }
    Serial.printf("[INIT] 角度表 %d KB 就緒\n", (int)(n / 1024));
}

/* =====================================================================
 *  場景: 三軸加速度儀表板
 *  顯示三軸即時資料，帶動態指針和數值
 * ===================================================================== */
void renderGaugeScene() {
    // ---- 每幀常數 (提到迴圈外, 避免逐像素重算) ----
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

    // 半徑閾值全部用 r^2 (整數比較), 避免逐像素 sqrtf —— 只有中心指針那一小塊才需要 float r
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
            const uint8_t *angRow = angleTab ? &angleTab[yy * W] : nullptr;  // 每行取一次行首指標
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

                // X軸 (外環, 紅色)
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

                // Y軸 (中環, 綠色)
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

                // Z軸 (內環, 藍色)
                if (r2 > R2_Z_LO && r2 < R2_Z_HI) {
                    if (angle < fillAngle || angle < -M_PI + 0.1) {
                        color = JD9855_QSPI::color565(30, 80, 200);
                    } else if (r2 >= R2_65_LO && r2 < R2_65_HI) {
                        color = JD9855_QSPI::color565(20, 30, 80);
                    }
                }

                // 中心指針 (指向合力方向) —— 只有這裡需要 float r
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

                // 中心點
                if (r2 < 64) {
                    color = COLOR_WHITE;
                }

                // 呼吸光效裝飾 (breathe 已在迴圈外算好)
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
 *  主程式
 * ===================================================================== */
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[ADXL335 + TK015F5785] 三軸加速度儀表板"));

    // 初始化顏色
    initColors();

    // 初始化ADC (ESP32-S3)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);  // 0-3.3V 量測範圍
    pinMode(PIN_ACCEL_X, INPUT);
    pinMode(PIN_ACCEL_Y, INPUT);
    pinMode(PIN_ACCEL_Z, INPUT);

    // 校準: 讀取靜止狀態的中心值
    Serial.println(F("[ACCEL] 校準中, 請保持裝置水平靜止..."));
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
    accelZCenter = sumZ / 100 - 409;  // Z軸靜止時約為 1g, 減去 1g 的偏移
    Serial.printf("[ACCEL] 校準完成: X=%d, Y=%d, Z=%d\n", accelXCenter, accelYCenter, accelZCenter);

    // 初始化螢幕
    Serial.println(F("[LCD] 初始化..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] 初始化失敗!"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] 初始化成功"));

    buildAngleTable();   // 預先計算每像素角度, 讓儀表板算繪不卡頓

    lcd.fillScreen(COLOR_BLACK);
    Serial.println(F("[DEMO] 三軸加速度儀表板"));
}

void loop() {
    // 讀取加速度計
    readAccelerometer();

    // 算繪儀表板
    renderGaugeScene();

    // 印出除錯資訊 (每秒一次)
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint > 1000) {
        lastPrint = millis();
        Serial.printf("X=%.2f  Y=%.2f  Z=%.2f\n", accelX, accelY, accelZ);
    }
}
```

### 程式碼說明

- **螢幕驅動部分**：`JD9855_QSPI` 類別直接呼叫 ESP-IDF 的 `esp_lcd_panel_io_spi` 介面手寫驅動，沒有依賴任何第三方圖形函式庫。`pclk_hz` 特意從常見的 40MHz 降到 20MHz，是因為走線較長時 40MHz 容易花屏，這是實測踩坑後的穩態值，如果你的走線短、螢幕排線品質好，可以自己往上試。
- **角度查表 `buildAngleTable()`**：這是整個算繪的效能關鍵。第一步，在 `setup()` 裡把 360×360 每個像素相對圓心的角度提前算好，壓縮存成 0-255 的一位元組查表；第二步，算繪時每個像素只做一次陣列查表，不再逐像素呼叫較慢的 `atan2f()`。這一步最佳化直接決定了儀表板更新流不流暢。
- **`readAccelerometer()` 讀數與濾波**：第一步讀原始 ADC 值；第二步按 409 counts/g 的換算把電壓轉成 -1~1 的歸一化值（這個換算係數來自 ADXL335 300mV/g 的典型靈敏度 × ESP32-S3 12 位元 ADC 滿量程 3.3V 的理論值，實測建議按自己模組微調）；第三步做一階低通濾波（`alpha = 0.3`）平滑毛刺。
- **為什麼「甩」比「傾斜」效果明顯，在程式碼裡體現在哪**：`xAngle = accelX * M_PI / 2` 這一行把 accelX 的 ±1g 線性對應到 ±90°。慢慢傾斜時 accelX 理論上限就是 ±1g，對應剛好 ±90°；但甩動時慣性加速度疊加在重力上，accelX 實際讀數經常超過 ±1，被 `constrain()` 限幅到 ±1.5g，對應出來的角度擺動自然比慢傾斜猛得多——這不是畫圖邏輯的問題，是加速度計物理特性決定的。
- **Z 軸算繪**：`zVal` 把 accelZ 從 -1~1 對應到 0~1 再轉成一個填充角度 `fillAngle`，本質是用一個「進度環」的形式展示 Z 軸數值；如果發現這個進度環一直在輕微抖動，屬於正常現象（後面 FAQ 有解釋）。

---

## 常見問題排查

別慌，八成的問題都出在這幾個地方：

1. **螢幕不亮或花屏**：先查 QSPI 的 D0~D3 四根資料線有沒有接反，再確認 CS/SCLK 獨立接對，最後確認螢幕供電穩定在 3.3V（供電漣波大也會花屏）。
2. **ADXL335 讀數一直卡在 2048 附近不動**：檢查是不是接到了沒通的 ADC 腳位，或者模組本身供電異常；本專案用的 GPIO5/9/10 都在 ESP32-S3 ADC1 範圍內，不受 Wi-Fi 佔用 ADC2 的影響，可以排除這個可能。
3. **Z 軸數值一直亂跳**：這是 ADXL335 的原廠設計特性，Z 軸雜訊密度天生比 X/Y 軸高，不是接線或程式碼問題。可以把濾波係數 `alpha` 調小（比如從 0.3 降到 0.1），或者在程式碼裡做多次取樣取平均（過取樣）來緩解。
4. **慢慢傾斜沒反應，一甩才有反應**：這是加速度計的物理本質——它測的是「合力」，不是單純姿態角。只有配合陀螺儀做感測器融合，才能得到不受運動干擾的穩定姿態輸出。
5. **編譯報錯，找不到 `esp_lcd_panel_io.h`**：檢查 Arduino IDE 裡 ESP32 板級支援包版本，必須是 v3.x（基於 ESP-IDF 5.x），舊版核心沒有這些介面。
6. **校準完之後中心值明顯偏移**：校準階段裝置沒放平或者在晃動，建議放在水平桌面上再上電，校準那一秒盡量別碰它。

---

## FAQ 問答

**Q：ADXL335 到底是測傾斜還是測運動的？**
A：嚴格來說它測的是「比力」（重力分量 + 運動加速度的合成），沒辦法單獨區分二者。持續慢傾斜最多只改變重力分量 ±1g，而甩動會疊加運動加速度，幅度經常超過 ±1g，所以視覺上「甩」比「慢傾斜」明顯得多。想要純淨的姿態角，需要換成帶陀螺儀的六軸 IMU（如 MPU6050）做感測器融合。

**Q：為什麼 Z 軸讀數一直在跳，X/Y 相對穩？**
A：這是 ADXL335 的原廠設計特性——資料手冊顯示 Z 軸的輸出雜訊密度大約是 X/Y 軸的兩倍，不是接線或程式碼問題。可以靠加大低通濾波、增加 ADC 過取樣來緩解，沒辦法完全消除。

**Q：GY-61 模組能測多快的動作？**
A：板載濾波電容是 0.1μF，把每個軸的頻寬限制在約 50Hz，日常甩動、傾斜完全夠用；如果要測更高頻的振動，需要更換更小容值的濾波電容。

**Q：ESP32-S3 的 GPIO5/9/10 用作 ADC 會不會和 Wi-Fi 衝突？**
A：不會。這三個腳位都在 ESP32-S3 的 ADC1 範圍內（GPIO1~10），只有 ADC2（GPIO11~20）在 Wi-Fi 工作時會受限制，這個專案不用擔心這個坑。

**Q：校準時為什麼要保持裝置水平靜止？**
A：程式碼上電後連續取樣 100 次取平均，把這個平均值當作「0g」基準點。如果校準時裝置是歪的或在晃動，基準點就會跑偏，後續所有換算都會跟著偏移。

**Q：這套程式碼要安裝額外的第三方函式庫嗎？**
A：不需要。螢幕驅動是直接呼叫 ESP-IDF 自帶的 `esp_lcd_panel_io` 和 `spi_master` 介面手寫的，只要 Arduino IDE 裡的 ESP32 板級支援包是 v3.x 就夠，函式庫管理員裡什麼都不用安裝。

---

## 延伸玩法

- 加一顆六軸 IMU（比如 MPU6050），做感測器融合，得到真正不受晃動干擾的穩定姿態儀表板
- 把「甩動強度」單獨提取出來，做成一個簡易的「暴力檢測儀」，超過閾值就變色或報警
- 接一個蜂鳴器或 RGB 燈，傾斜超過設定角度就報警，當簡易水平儀用
- 用 SD 卡把運動資料記錄下來，事後匯出畫成曲線回顧

---

## 參考資料

- [ADXL335 官方產品頁與資料手冊（Analog Devices）](https://www.analog.com/en/products/adxl335.html)
- [GY-61 / ADXL335 breakout 板載濾波電容與頻寬說明（Adafruit）](https://www.adafruit.com/product/163)
- [JD9855 QSPI 驅動晶片資料手冊](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
- [ESP32-S3 系列資料手冊（Espressif，ADC1/ADC2 腳位劃分）](https://documentation.espressif.com/esp32-s3_datasheet_en.pdf)
