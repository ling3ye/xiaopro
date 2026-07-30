---
title: "ESP32-S3 點亮 TK015F5785 圓螢幕（JD9855 QSPI）｜查表炫彩動畫完整教學"
boardId: esp32s3
moduleId: display/tft15-jd9855
category: esp32
date: 2026-07-30
intro: "用 ESP32-S3 透過 QSPI 點亮 1.5 吋 TK015F5785 圓螢幕（驅動其實是 JD9855，不是廠商標稱的 ST77916），單檔案手寫驅動 + Plasma / 彩虹色盤 / 輻射波紋三套查表動畫，Arduino IDE 直接編譯燒錄，附避坑指南。"
image: "https://img.lingflux.com/2026/07/8f43dd78cc005af725bd601e0a262621.jpg"
---

難度：⭐⭐⭐☆☆（有單晶片基礎上手更快，純新手照抄也能跑）
預計時間：30～45 分鐘（不含等淘寶出貨的時間）
測試環境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10（基於 ESP-IDF v5，必須是這個大版本，理由後面講）

---

> **一句話摘要**：用 ESP32-S3 透過 QSPI 點亮 1.5 吋 TK015F5785 圓螢幕——廠商標稱驅動是 ST77916，實測 IC ID 才發現其實是 JD9855。本文用 ESP-IDF 自帶的 `esp_lcd_panel_io` 手寫一個幾十行的單檔案迷你驅動，跑 Plasma 等離子流 / 彩虹色盤 / 輻射波紋三套查表動畫，不安裝任何函式庫、執行時不呼叫 `sin`/`atan2`/`sqrt`，30 分鐘滿螢幕絲滑。

---

## 前言

我一開始也以為點亮一塊圓螢幕是「接上電、隨便發個色塊過去」這種五分鐘的事。因為廠商說驅動晶片是 ST77916，這個在 GFX library for Arduino 中是有的。然而程式上傳，螢幕從黑漸變到全白，所以……直接給整不會。後來，問廠商要了 ESP-IDF 的驅動程式，發現這個螢幕的驅動其實是 JD9855，並且透過螢幕的 IC ID（IC ID 回傳的碼是 `FF 98 55 00`）也確認了這螢幕的驅動晶片的確是 JD9855。為了方便大家復刻，我直接用 ESP-IDF 內建的 `esp_lcd_panel_io` 手搓一個幾十行的迷你驅動——不用裝函式庫，不用設定字體，甚至不需要一個專門的標頭檔，全塞進一個 .ino 裡就能跑。

這篇教學就是把這塊 1.5 吋 TK015F5785 圓螢幕從「到手是塊黑玻璃」點亮到「滿螢幕流動炫彩動畫」的完整過程整理出來，包括接線、驅動原理和三套不呼叫 `sin`/`atan2`/`sqrt` 的絲滑動畫演算法。跟著做，30 分鐘內你的圓螢幕也能轉起來。

> **TL;DR（趕時間的直接看這裡）：**
>
> 1. 接線：SCLK→GPIO6，D0→GPIO15，D1→GPIO7，D2→GPIO11，D3→GPIO12，CS→GPIO16
> 2. Arduino IDE 選擇 Board = **ESP32S3 Dev Module**，USB CDC On Boot = **Enabled**
> 3. 不用安裝任何第三方函式庫，程式裡全靠 ESP-IDF 自帶的 `esp_lcd_panel_io`，核心版本必須是 **v3.x**
> 4. 整個 .ino 複製貼上、編譯、燒錄，上電就是滿螢幕流動的彩色動畫；沒有畫面說明踩坑了，往下翻「常見問題排查」

---

## 實驗效果

上電後螢幕會自動循環播放三種查表演算法生成的彩色動畫，每種停留 6 秒，全程沒有卡頓感、沒有逐行掃描的撕裂感：

- **Plasma 等離子流**：色彩像液體一樣連續流動
- **彩虹色盤**：全色譜沿圓心緩慢旋轉，像個不停轉的調色盤
- **輻射波紋**：色彩漣漪從圓心向外擴散

一上電就是滿螢幕動畫，不需要額外操作，很適合當「這塊螢幕真的活了」的驗證實驗。

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/cqIo77cn1oA?si=Y7RjMyDpAsaN92ug" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 元件說明

> 開發板（ESP32-S3）不展開介紹，這裡只說明除開發板外的核心元件。

### TK015F5785 圓螢幕

TK015F5785 是一塊 1.5 吋的圓形 **IPS** 顯示螢幕（驅動晶片 JD9855），負責把 ESP32-S3 送過去的像素資料顯示成畫面，在本專案裡的作用是承載三套查表動畫的最終視覺輸出。下表參數除特別標註外，均來自廠商提供的模組規格書：

| 參數       | 數值 / 說明                                              | 來源               |
| ---------- | -------------------------------------------------------- | ------------------ |
| 尺寸       | 1.5 吋                                                   | 廠商規格書         |
| LCD 類型   | IPS，全視角                                              | 廠商規格書         |
| 解析度     | 360 × 360                                                | 廠商規格書         |
| 驅動晶片   | JD9855（同型號模組另有 ST77916 版本，以實測 IC ID 為準） | 廠商規格書 + 實測  |
| 顯示區域   | Φ38.16 mm（直徑）                                        | 廠商規格書         |
| 外形尺寸   | 44.32 × 44.32 × 3.5 mm                                   | 廠商規格書         |
| 像素間距   | 0.106 × 0.106 mm                                         | 廠商規格書         |
| 顏色數     | 65K 色（RGB565，16bit/像素）                             | 廠商規格書         |
| 亮度       | 500 cd/m²                                                | 廠商規格書         |
| 背光       | 4 顆白光 LED 並聯                                         | 廠商規格書         |
| 工作溫度   | -20 ~ 60 ℃                                              | 廠商規格書         |
| 介面類型   | QSPI（SCLK + D0~D3 + CS）                                | 本教學實測         |
| 通信時脈   | 20MHz（本教學測試值）                                     | 實測               |

> **下單前務必確認版本**：廠商的模組規格書把這塊螢幕標成「介面 RGB / 驅動晶片 ST77916 **或** JD9855」——說明同一型號 TK015F5785 會按不同驅動 IC 與介面組合出貨。本教學針對的是 **JD9855 + QSPI** 那一版（前言裡就是靠讀取 IC ID = `FF 98 55 00` 才確認晶片其實不是廠商起初說的 ST77916）。如果你買到的是 ST77916 版或 RGB 介面版，初始化暫存器序列和接線都得換，不能照抄本文程式。

圓螢幕物理可視區是直徑 Φ38.16 mm 的圓，按 0.106mm/像素換算正好對應像素半徑 180px——所以程式裡 `R2MAX = 180²` 就是把圓外像素主動置黑，讓圓形邊緣乾淨（詳見「常見問題排查」第 4 條）。

選它的原因很直接：QSPI 介面比傳統 SPI 多了 3 條資料線，推資料的頻寬是普通 SPI 的 4 倍，360×360 這種像素量級如果還用單線 SPI 推，幀率會很難看。

### 腳位說明

| 腳位              | 功能                                    |
| ----------------- | --------------------------------------- |
| SCLK              | QSPI 時脈線                             |
| D0 / D1 / D2 / D3 | QSPI 四條資料線（Quad Mode 下並行傳輸） |
| CS                | 晶片選擇，拉低選中該螢幕                |
| BL（背光）        | 背光控制，部分模組未引出該腳位          |
| VCC               | 供電，通常 3.3V                         |
| GND               | 公共地                                  |

### JD9855（驅動晶片）

JD9855 是晶片廠商 Jadard（傑達科技）推出的一顆整合在螢幕模組裡的單晶片 TFT LCD 驅動 IC，內建顯示快取（GRAM），負責把接收到的像素資料寫入快取並控制液晶單元顯色，在本專案裡的作用是執行 `esp_lcd_panel_io` 發過去的初始化暫存器序列和 RAMWR 像素寫入指令。

好在 JD9855 **有公開的資料手冊**（晶片廠商 Jadard（傑達科技）發布的 Preliminary V0.00 版，2023 年 10 月）。根據手冊，它的關鍵規格如下：

| 參數               | 數值 / 說明                                                                                       | 資料手冊來源       |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------ |
| 驅動能力           | 單晶片 SOC 驅動 a-Si TFT，最大 360 RGB×390（Dual-Gate=780）點，540 路源極驅動                      | Features / Intro   |
| 內建幀快取         | 360×390×18 bit（約 315 KB GRAM）                                                                   | Features           |
| 支援介面           | 8080 並列（8-bit）、RGB（6-bit）、SPI（8/9-bit、2-lane）、**QSPI（支援 DDR）**、MIPI-DSI           | System Interface   |
| 顏色格式           | RGB565（16-bit） / RGB666（18-bit）                                                                | Color Format       |
| I/O 電壓           | 1.65V ~ 3.3V                                                                                       | Features           |
| 工作溫度           | -40 ~ +85 ℃                                                                                       | Features           |

這個手冊把 0x2A（CASET）、0x2B（RASET）、0x2C（RAMWR）、0x36（MADCTL）、0x3A（COLMOD）等指令的位元定義和時序都列得很清楚——本文程式裡用到的正是這些標準指令。**需要說明的是**：手冊公開的是指令集和時序，但像 Gamma 校正、電源升壓、各廠自定的子命令（如本文初始化序列裡的 `0xDE` / `0xDF` / `0xC3` 這類帶「命令 Bank 切換」的暫存器）這類調螢幕參數，仍屬於面板廠商按自家螢幕逐顆調校後的私有初始化表，這部分照抄廠商給的序列即可點亮，不必深究每條含義。

---

## BOM 表

| 元件                                 | 數量   | 備註                                                          |
| ------------------------------------ | ------ | ------------------------------------------------------------- |
| ESP32-S3 開發板                      | 1      | 建議選帶 PSRAM 的版本，方便角度查表回落                       |
| TK015F5785 圓螢幕模組（JD9855 / QSPI） | 1      | 務必確認是 JD9855+QSPI 版本（同型號另有 ST77916/RGB 版，見元件說明） |
| 杜邦線（母對母，視模組排針而定）     | 6 條起 | SCLK / D0~D3 / CS 共 6 條，另加 VCC / GND                     |

---

## 接線方式

| 螢幕腳位   | 接到 ESP32-S3 腳位                         |
| ---------- | ------------------------------------------ |
| SCLK       | GPIO6                                      |
| D0         | GPIO15                                     |
| D1         | GPIO7                                      |
| D2         | GPIO11                                     |
| D3         | GPIO12                                     |
| CS         | GPIO16                                     |
| BL（背光） | 本模組未引出，無法軟體控制，接上電源即常亮 |
| VCC        | 3.3V                                       |
| GND        | GND                                        |

建議接完逐一核對，能省 80% 排錯時間——QSPI 有四條資料線，接反兩條的現象往往不是黑屏而是花屏，比全黑更難排查。

---

## 需要安裝的函式庫

好消息：**不需要安裝任何第三方函式庫**。整個驅動直接呼叫 ESP-IDF 內建的 `driver/spi_master.h`、`esp_lcd_panel_io.h`、`esp_heap_caps.h`，這些標頭檔是 Arduino ESP32 核心自帶的。

唯一的硬性要求：Arduino IDE 裡的 **ESP32 開發板核心必須是 v3.x**（基於 ESP-IDF v5）。v2.x 核心底層是 ESP-IDF v4.4，`esp_lcd_panel_io_tx_param` / `esp_lcd_panel_io_tx_color` 這套 API 在舊版本裡行為和標頭檔路徑都不一樣，直接編譯會報「找不到符號」或「函式簽名不匹配」。

升級方式：Arduino IDE → 工具 → 開發板 → 開發板管理員，搜尋 "esp32"，把 espressif 那個核心包更新到 3.x 以上版本。

---

## 完整程式碼

> 程式碼本身是單檔案，複製貼上進一個新的 .ino 即可編譯。注意 CS 腳位是 `16`（歷史上有一個舊版本誤寫成不存在的 `160`，詳見「常見問題排查」第一條）。

```cpp
/*
 * =============================================================================
 *  TK015F5785 圓螢幕 (JD9855, QSPI) 單檔案炫彩演示 —— Arduino IDE 版
 * =============================================================================
 *
 *  ✦ 單檔案: 驅動 + 演示全在這一個 .ino 裡, 複製貼上即可, 無需任何外部檔案.
 *
 *  演示效果 (3 個場景自動循環, 每個約 6 秒, 全部絲滑連續):
 *    [1] Plasma 等離子流   —— 色彩如液體流動 (sin 查表)
 *    [2] 彩虹色盤          —— 全色譜 + 緩慢旋轉 (角度預計算查表)
 *    [3] 輻射波紋          —— 中心向外的彩色漣漪 (r² 相位)
 *
 *  一上電就是滿螢幕流動彩色, 直觀證明 "螢幕亮了 + 顏色正常", 適合做點亮展示.
 *
 *  效能關鍵: 三個場景的每像素運算都是 "查表 + 整數加減", 不呼叫 sin/atan2/sqrt,
 *           所以每幀渲染都很快, 肉眼看不出逐行掃描, 全部絲滑.
 *
 *  硬體: ESP32-S3 + TK015F5785 (JD9855, QSPI)
 *    SCLK=6  D0=15  D1=7  D2=11  D3=12  CS=16  背光=-1(未引出, 不可控)
 *  依賴: 僅 Arduino IDE 的 esp32 板芯 v3.x, 無外部函式庫 / 無字體 / 無外部標頭檔.
 *  上傳: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled, 序列埠 115200.
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

/* ----------------------------- 腳位設定 ----------------------------- */
/* 與 HelloWorld / 測試程式一致, 改接線時同步修改 */
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1      /* 背光, 設 -1 表示不控制 */ // 當前模組沒有引出，所以無法控制

/* =====================================================================
 *  螢幕驅動 (JD9855 QSPI) —— 照搬即可, 一般無需修改
 *  原理: Arduino-ESP32 3.x 基於 ESP-IDF, 直接呼叫 esp_lcd_panel_io 驅動 QSPI.
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

    /* 標準 RGB565 */
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

    /* 把 RGB565(小端) 緩衝推送到矩形區域 */
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

    /* 全螢幕填充 (逐行, 記憶體佔用極小) */
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

    /* JD9855 廠商初始化序列 (移植自 ESP-IDF 版 esp_lcd_jd9855 驅動) */
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
        sendCmd(0x29);            /* 開顯示 */
        delay(10);
    }
};

/* =====================================================================
 *  演示部分 —— 重點看這裡
 *  思路: 每幀逐行計算每個像素顏色, 推到螢幕.
 *       所有 "跟位置有關、跟時間無關" 的量 (sin、色相、角度) 都預算成查表,
 *       執行時每像素只做 "查表 + 整數加減", 所以三個場景都絲滑.
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     /* 360 */
static constexpr int H = JD9855_QSPI::V_RES;     /* 360 */
static constexpr int CX = W / 2;                  /* 圓心 x */
static constexpr int CY = H / 2;                  /* 圓心 y */
static constexpr int RADIUS = 180;                /* 圓螢幕可視半徑 */
static constexpr int R2MAX  = RADIUS * RADIUS;    /* 圓外的 r² 閾值 (180²=32400) */

static const int BLOCK_H = 40;             /* 每批渲染+推送 40 行, 大幅減少推送次數 */
uint16_t blockBuf[W * BLOCK_H];            /* 區塊緩衝 (360*40*2=28KB, 內部 RAM, 無需 PSRAM) */
uint8_t  sinTab[256];       /* 正弦查表: sinTab[i] = sin(i/256*2π)*127+128 */
uint16_t hsvTab[256];       /* 色相(0-255) -> RGB565 查表 (飽和度/亮度最大) */
uint8_t *angleTab = nullptr;/* 每像素相對圓心的角度查表 (360*360B), 讓圓盤場景不呼叫 atan2 */

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

/* 啟動時生成 sin / 色相 兩張表, 之後渲染只查表 */
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

/* 預計算每個像素相對圓心的角度 (atan2), 存成 0-255 的查表.
   圓盤場景執行時只查表, 不用每幀呼叫 atan2f (那是它原來卡頓的元兇).
   只在 setup 算一次, 耗時無所謂. 優先放內部 RAM (~126KB), 沒有則回落 PSRAM;
   都沒有則置 nullptr, 場景會降級回 atan2f (仍能看, 只是會卡). */
void buildAngleTable()
{
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab 分配失敗, 圓盤場景將較慢")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   /* -0.5..0.5 */
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);        /* 環狀映射到 0-255 */
        }
    }
    Serial.printf("[INIT] 角度表 %d KB 就緒 (圓盤場景將絲滑)\n", (int)(n / 1024));
}

inline uint8_t sin8(int phase) { return sinTab[(uint8_t)phase]; }

/* ---- 場景 1: Plasma 等離子流 (純查表) ---- */
inline uint16_t plasmaPixel(int x, int y, int t)
{
    int v = sin8(x * 3 + t)
          + sin8(y * 3 - t * 2)
          + sin8((x + y) * 2 + t / 2)
          + sin8((x - y) * 2 - t / 2);
    return hsvTab[(uint8_t)(v / 4 + t)];
}

/* ---- 場景 2: 彩虹色盤 (角度查表 + r², 全整數) ---- */
inline uint16_t wheelPixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;                 /* 圓外置黑, 邊緣乾淨 */
    int ang = angleTab ? angleTab[y * W + x]
                       : (int)(atan2f((float)dy, (float)dx) / (2.0f * (float)M_PI) * 256.0f);
    int hue = ang + r2 / 200 + t;             /* 沿徑向疊色相, 形成螺旋色盤 */
    return hsvTab[(uint8_t)hue];
}

/* ---- 場景 3: 輻射波紋 (r² 直接做相位, 無需開方) ---- */
inline uint16_t ripplePixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;
    int v = sin8(r2 / 80 - t * 3);            /* 波紋相位: 隨距離+時間擴散 */
    return hsvTab[(uint8_t)(v + r2 / 400)];
}

/* 渲染一幀: 每次算 BLOCK_H 行再整塊推送 (9 次推送替代 360 次, 既省命令開銷提幀率,
   又讓每塊 40 行同時刷新, 大幅減弱逐行掃描感). sceneId 選擇像素函式 (0=plasma 1=wheel 2=ripple) */
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

/* 場景名稱 */
const char *SCENE_NAMES[] = { "Plasma 等離子流", "彩虹色盤", "輻射波紋" };
const int      N_SCENES   = 3;
const uint32_t SCENE_MS   = 6000;    /* 每個場景停留 6 秒 */

int      curScene   = 0;
uint32_t sceneStart = 0;

/* ----------------------------- setup ------------------------------- */
void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[TK015F5785] 單檔案炫彩演示 (JD9855 QSPI)"));

    Serial.println(F("[LCD] begin..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] init FAILED! 檢查腳位/板芯版本(需 esp32 v3.x)"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] init OK"));

    buildTables();
    buildAngleTable();          /* 預計算角度表, 讓圓盤場景絲滑 */
    lcd.fillScreen(0);
    sceneStart = millis();
    Serial.printf("[DEMO] 場景 1/%d: %s\n", N_SCENES, SCENE_NAMES[curScene]);
}

/* ----------------------------- loop -------------------------------- */
void loop()
{
    int t = (int)(millis() / 12);     /* 動畫推進步長, 越大越快 */

    renderFrame(curScene, t);

    if (millis() - sceneStart >= SCENE_MS) {
        sceneStart = millis();
        curScene   = (curScene + 1) % N_SCENES;
        Serial.printf("[DEMO] 場景 %d/%d: %s\n",
                      curScene + 1, N_SCENES, SCENE_NAMES[curScene]);
    }
}
```

### 程式碼說明

第一步，`JD9855_QSPI::begin()` 裡先用 `spi_bus_initialize` 起一條走 4 條資料線的 QSPI 匯流排，再用 `esp_lcd_new_panel_io_spi` 掛一個 `quad_mode = true` 的 LCD IO 裝置——這一步是整個驅動能跑起來的關鍵，`quad_mode` 沒開的話四條資料線只有一條真正在傳資料，幀率會掉到沒法看。

第二步，`sendInitCommands()` 是照抄面板廠商給的暫存器初始化表，逐條透過 `esp_lcd_panel_io_tx_param` 發過去，不需要理解每條暫存器的含義，改螢幕不改這段。

第三步，也是這份程式碼真正的看點：三個動畫場景全部不在執行時呼叫 `sin`、`atan2`、`sqrt` 這類慢函式，而是在 `setup()` 階段把它們都算成查找表（`sinTab`、`hsvTab`、`angleTab`），執行時每個像素只做「查表 + 整數加減」，這也是為什麼 360×360 = 12.96 萬像素每幀還能保持絲滑而不撕裂。

第四步，`renderFrame()` 沒有逐行推送，而是攢夠 `BLOCK_H = 40` 行再整塊 `pushRect` 一次，360 行只需要 9 次推送，比逐行推 360 次省了大量 SPI 命令開銷。

---

## 常見問題排查

別慌，下面這幾種問題佔了圓螢幕點不亮報錯的大多數：

**1. 通電後一片黑，序列埠也沒列印 `[LCD] init OK`** 先檢查 CS 腳位有沒有接對——這也是這份程式碼草稿版最容易踩的坑：`PIN_LCD_CS` 曾經被誤寫成了 `160`（不存在的 GPIO 編號），本文程式碼區塊裡已經修正為 `16`，如果你是從別處複製的舊版本，務必確認這一行是 `16` 而不是 `160`。

**2. 螢幕亮但花屏、顏色錯亂** 大概率是 D0~D3 這四條資料線接反了順序。QSPI 對線序敏感，跟接錯普通 SPI 的 MOSI/MISO 不是一回事，建議按接線表逐條核對，不要憑手感插。

**3. 編譯報錯，提示找不到 `esp_lcd_panel_io.h`** 說明當前 Arduino ESP32 核心還是 v2.x（基於 ESP-IDF v4.4）。去開發板管理員把 espressif 的 esp32 核心升級到 v3.x 以上再編譯。

**4. 圓螢幕四角一直是黑的，是不是沒接好？** 這是正常現象，不是故障。程式裡 `R2MAX = 180²`，超出這個半徑的像素被主動置黑，因為圓螢幕的物理可視區域本來就是個圓，四角本來就被邊框遮住，這樣處理邊緣反而更乾淨。

**5. 序列埠列印 `angleTab 分配失敗`，圓盤場景變卡** 說明內部 RAM 不夠分配這張約 126KB（360×360 位元組）的角度表。程式已經寫了回落邏輯：先試內部 RAM，不行退到 PSRAM，再不行直接用 `atan2f` 現算（能看但會明顯變慢）。如果你的開發板沒有 PSRAM，且總感覺圓盤場景比另外兩個卡，這就是原因，換一塊帶 PSRAM 的板子能根治。

**6. 背光一直亮著關不掉** 程式裡 `PIN_LCD_BL` 設成了 `-1`，註解也寫了「當前模組沒有引出，所以無法控制」——如果你的模組確實引出了背光控制腳位，把這個巨集改成對應的 GPIO 編號，並在 `begin()` 裡傳入即可實現軟體調光/開關。

---

## FAQ 問答

**Q：ESP32 怎麼點亮一塊圓形螢幕？** A：核心是用 QSPI 介面 + `esp_lcd_panel_io` 直連驅動晶片，不依賴 TFT_eSPI 這類通用圖形函式庫，接線時把 SCLK/D0~D3/CS 五條線對好，初始化暫存器表照抄面板廠商提供的序列即可點亮。

**Q：JD9855 驅動的圓螢幕用什麼函式庫？** A：不需要額外的函式庫。JD9855 沒有被主流圖形函式庫（如 TFT_eSPI、LVGL 官方驅動列表）內建支援，最穩妥的做法是像本文一樣直接呼叫 ESP-IDF 自帶的 `esp_lcd_panel_io` API 手寫幾十行初始化程式碼。

**Q：QSPI 螢幕和普通 SPI 螢幕接線有什麼區別？** A：普通 SPI 只有 1 條資料線（MOSI），QSPI 有 4 條（D0~D3）並行傳輸，頻寬是普通 SPI 的 4 倍，代價是接線多了 3 條，且 `esp_lcd_panel_io_spi_config_t` 裡必須把 `flags.quad_mode` 設為 `true`。

**Q：ESP32-S3 圓螢幕一直黑屏是什麼原因？** A：最常見的三個原因按機率排序：CS 腳位接錯或寫錯編號、開發板核心版本低於 v3.x 導致初始化失敗、供電不穩（QSPI 走線較長時更明顯）。序列埠列印是否有 `[LCD] init OK` 能快速定位是驅動層問題還是接線問題。

**Q：Arduino 怎麼用 esp_lcd_panel_io 驅動螢幕？** A：三步走：`spi_bus_initialize` 建立 SPI 匯流排、`esp_lcd_new_panel_io_spi` 建立 LCD IO handle（這一步指定 CS/時脈頻率/SPI 模式/quad_mode）、最後用 `esp_lcd_panel_io_tx_param` 發命令、`esp_lcd_panel_io_tx_color` 發像素資料。

**Q：ESP32 圓螢幕能不能用 TFT_eSPI 函式庫？** A：TFT_eSPI 主要面向它內建支援列表裡的驅動晶片，JD9855 這類冷門 QSPI 驅動晶片不在其中，硬套通常需要自己改驅動層程式碼，反而不如直接用 ESP-IDF 原生 API 手寫省心。

**Q：360×360 解析度的圓螢幕記憶體夠用嗎？** A：夠用，但要注意分配方式。整螢幕一次性緩衝需要 360×360×2 位元組 ≈ 253KB，本文用的是分區塊渲染（每塊 40 行，約 28KB），再加上可選的 126KB 角度查表，內部 RAM 基本上能裝下，沒必要為了這塊螢幕單獨外掛 PSRAM（除非你想要角度表也放心地留在內部 RAM 裡）。

---

## 延伸玩法

跑通基礎演示之後，這塊圓螢幕還有不少可以繼續折騰的方向：

- 把三個查表場景換成即時資料視覺化（CPU 負載、天氣、心率等，圓螢幕形狀很適合做儀表板）
- 接入觸控/旋鈕，做成可互動的圓形控制面板
- 用同樣的 esp_lcd_panel_io 思路移植其他 QSPI 驅動晶片的螢幕
- 把 BLOCK_H 和 pclk_hz 調大做幀率壓測，找到你這塊具體模組的極限更新率

---

## 參考資料

- <cite index="3-1">ESP-IDF 官方 LCD 週邊文件說明了 esp_lcd 元件是 Espressif 為支援 SPI LCD、I80 LCD、RGB/SRGB LCD 等多種螢幕提供的一套跨晶片通用 API</cite>：[ESP-IDF LCD Peripheral (ESP32-S3)](https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32s3/api-reference/peripherals/lcd.html)
- [ESP32-S3 系列官方資料手冊（PDF，Espressif 官方）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [espressif/arduino-esp32 官方 GitHub 儲存庫](https://github.com/espressif/arduino-esp32)
- <cite index="3-2">JD9855 的公開資料手冊（晶片廠商 Jadard（傑達科技）發布的 Preliminary V0.00 版，2023-10-17；下方為 OSPTek 托管的 PDF 鏡像）列出了 540 路源極驅動、360RGB×390 解析度、內建 GRAM、8080/SPI/QSPI/MIPI-DSI 多介面及 CASET/RASET/RAMWR 等指令的完整時序</cite>：[JD9855 Data Sheet (Preliminary V0.00, PDF)](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
