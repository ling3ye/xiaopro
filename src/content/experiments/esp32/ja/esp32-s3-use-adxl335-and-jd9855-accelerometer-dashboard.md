---
title: "ESP32-S3 + ADXL335 で JD9855 円形ディスプレイを駆動して3軸加速度ダッシュボードを作る｜「振る」方が「傾ける」より目立つ理由"
boardId: esp32s3
moduleId: display/tft15-jd9855
moduleIds:
  - display/tft15-jd9855
  - sensor/adxl335
category: esp32
date: 2026-08-05
intro: "ESP32-S3 + ADXL335（GY-61）で JD9855 QSPI 円形ディスプレイを駆動し、リアルタイムの3軸加速度ダッシュボードを作ります。配線図、完全な Arduino コード、トラブルシューティングに加え、「振る方が傾けるより目立つ」背後にある加速度計の物理原理をしっかり解説します。"
image: "https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg"
---

> 難易度：⭐⭐☆☆☆（基本的な Arduino の操作経験があれば着手できます）
> 想定時間：30〜40分（キャリブレーションとデバッグを含む）
> テスト環境：Arduino IDE 2.3.8 ・ ESP32 Arduino Core 3.3.10

---

> **TL;DR（クイックスタート）：**
> 1. 配線表に従ってディスプレイ（QSPI 6線）と ADXL335（X/Y/Z 3路アナログ入力）を接続
> 2. GPIO5 / GPIO9 / GPIO10 はすべて ESP32-S3 の ADC1 範囲内なので、Wi-Fi との競合は気にしなくて OK
> 3. 電源投入後は本体を水平に静止させ、プログラムがゼロ点を自動サンプリング＆キャリブレーション（約1秒）するのを待つ
> 4. ゆっくり傾けるか、強く振って、円形ディスプレイ上の3色リング＋中心の針の連動を見る

---

## はじめに

二日間格闘して、ADXL335 の3軸データをリアルタイムで 360×360 の円形ディスプレイにねじ込みました。本体をゆっくり傾けても針はほとんど動かず、手が少し震えたり強く振ったりすると、針が「シュッ」と半周近く飛んでいきます。最初はキャリブレーションが悪いのかと思い、いろいろ調べてようやく気づきました——こいつは物理原理として純粋な「傾斜計」ではなく、測っているのは加速度で、激しく振るほど読みが極端になります。これは仕様であり、バグではありません。それと、私が自作した ESP32-S3 開発ボードは電源が少し弱く、センサーをつなぐとディスプレイが明らかに暗くなる瞬間がありました。ESP32-S3 開発ボードをアップグレードする必要がありそうです。

というわけで、この記事では完全な配線、コード、ハマりどころの記録に加えて、「なぜ振る方が傾けるより目立つのか」という理屈をしっかり説明します。皆さんが再現時に同じ罠で自信を失くさずに済むように。

---

## 実験の効果

この 360×360 円形ディスプレイには ADXL335 の3軸加速度データがリアルタイム表示されます（注意：純粋な姿勢角ではなく、加速度です）。外側の赤/緑/青の3色リングがそれぞれ X / Y / Z 軸に対応し、中央のカラフルな針が現在の合力の方向を指します。激しく振るほど針の振れ幅が誇張され、縁には装飾としてのラメ呼吸ライト効果もあります。

![](https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg)

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/B2hNfww6fXo?si=yirZlC1QrNw2urEF" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## 部品の説明

> ESP32-S3 開発ボードは特に紹介しません。この記事を見ているなら ESP32 を使ったことがあるはずです。残りの2つの主要部品だけ説明します。

### ADXL335 加速度計（GY-61 モジュール）

ADXL335 がやっていることは体重計に似ています——「まっすぐ立っているか」は分からず、現在どれくらいの力がかかっているかだけを知っていて、その力を X/Y/Z の3方向の成分に分けて報告してくれます。これはアナログ出力の3軸 MEMS 加速度計で、本体にかかる合力（重力成分＋運動によって生じる加速度）を3路の電圧信号に変換します。

| パラメータ | 数値 |
| --- | --- |
| タイプ | 3軸アナログ出力 MEMS 加速度計 |
| 測定範囲 | ±3.6g（典型）/ ±3g（最小保証値） |
| 感度 | 300 mV/g（VS = 3V 時の典型値、電圧に比例） |
| 動作電圧 | 1.8V〜3.6V |
| 帯域（GY-61 モジュールデフォルト） | 約 50Hz（オンボードの 0.1μF フィルタコンデンサで決定） |
| ノイズ密度 | X/Y 約 270 µg/√Hz、Z 約 550 µg/√Hz（Z は X/Y の約2倍） |

これを選ぶ理由はシンプルです：安くて、アナログ出力の配線が簡単で、適当な ADC ピンで読める。可視化系のおもちゃプロジェクトには最適で、プロ級の姿勢解析を狙わなければ十分使い勝手が良いです。

### ピンの説明

**ADXL335（GY-61）**

| モジュールピン | 説明 |
| --- | --- |
| VCC / GND | 3.3V 給電 |
| X / Y / Z | 3路アナログ出力、ADC ピンへ接続 |
| ST | セルフテストピン、通常は未接続 |

### TK015F5785 円形ディスプレイ（JD9855 ドライバ、QSPI インターフェース）

このディスプレイは「4本のデータ線の暗号しか理解しないキャンバス」と考えれば OK——JD9855 はドライバチップで、MCU が送ってくる色データをディスプレイの各ピクセルに運ぶ役割、QSPI（4線シリアル）インターフェースはより少ないピンでより高いリフレッシュ速度を実現します。1.5インチ程度、360×360 解像度の円形 TFT ディスプレイで、SCLK/D0-D3/CS の5本の信号線＋給電で駆動でき、別途 DC（データ/コマンド）ピンは不要です。

| パラメータ | 数値 |
| --- | --- |
| サイズ | 1.5インチ円形 IPS |
| 解像度 | 360 × 360 |
| ドライバチップ | JD9855 |
| インターフェース | QSPI（4線式） |
| 給電 | 3.3V |
| 輝度/コントラスト | 販売元のスペックシートに準拠（ロット差あり） |

これを選ぶ理由もストレート：円形ディスプレイはダッシュボード系の可視化と相性が良く、QSPI インターフェースは GPIO を5つしか占有せず、従来のパラレルよりピン節約、ESP32-S3 の DMA でも十分駆動できます。

### ピンの説明

**ディスプレイ TK015F5785（JD9855 QSPI）**

| ディスプレイピン | 説明 |
| --- | --- |
| SCLK | QSPI クロック |
| D0 ~ D3 | QSPI 4線データ |
| CS | チップセレクト |
| VCC / GND | 3.3V 給電 |

---

## BOM リスト

| 部品 | 型番/パラメータ | 数量 | 参考単価 | 用途 |
| --- | --- | --- | --- | --- |
| メインボード | ESP32-S3 開発ボード | 1 | 約 30〜50 元 | メインコントローラ ＋ Wi-Fi/BT 予備 |
| 円形ディスプレイ | TK015F5785（JD9855、360×360、QSPI） | 1 | 販売元による | 表示 |
| 加速度計 | ADXL335（GY-61 モジュール） | 1 | 約 8〜15 元 | 3軸加速度の取得 |
| ジャンパ線 | オス-メス | 適量 | - | 配線 |

---

## 配線方法

**ディスプレイ → ESP32-S3**

| ディスプレイピン | ESP32-S3 ピン |
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

| モジュールピン | ESP32-S3 ピン |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| X | GPIO5（ADC1） |
| Y | GPIO9（ADC1） |
| Z | GPIO10（ADC1） |

配線後は1本ずつ確認することをお勧めします。トラブルシューティング時間の80%を節約できます——特にディスプレイの D0〜D3 の4本は、1本でも逆につなぐと画面が乱れるか点灯しない可能性が高いです。

---

## インストールが必要なライブラリ

サードパーティライブラリは一切不要です。ディスプレイドライバは ESP-IDF 標準の `esp_lcd_panel_io` と `driver/spi_master` インターフェースを直接呼び出して手書きした QSPI ドライバで、ライブラリマネージャで何も検索する必要はありません。

唯一バージョンに注意すべき点：

- Arduino IDE：2.3.8（テスト通過）
- ESP32 ボードサポートパッケージ（esp32 by Espressif Systems）：**3.3.10**（ESP-IDF 5.x ベース）——コードが使う `quad_mode` フラグや一部の DMA インターフェースは旧 v2.x コアでは揃っていない可能性があるため、必ず v3.x にすること
- ボード選択：ESP32S3 Dev Module、USB CDC On Boot は Enabled に設定

---

## コード

```cpp
/*
 * =============================================================================
 *  ADXL335 + TK015F5785 円形ディスプレイ —— 3軸加速度ダッシュボード
 *  =====================================================================
 *
 *  単一シーン: 3軸加速度ダッシュボード —— 3軸データ ＋ 合力方向をリアルタイム表示、中心の針が合力方向を指す
 *
 *  ハードウェア: ESP32-S3 + TK015F5785 (JD9855 QSPI) + ADXL335 (GY-61)
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                          配線説明                                   │
 *  ├─────────────────────────────────────────────────────────────────────┤
 *  │  【ディスプレイ TK015F5785】     │  【ADXL335 (GY-61)】              │
 *  │  SCLK  → GPIO6                  │  VCC → 3.3V                      │
 *  │  D0    → GPIO15                 │  GND → GND                       │
 *  │  D1    → GPIO7                  │  X   → GPIO5 (ADC)               │
 *  │  D2    → GPIO11                 │  Y   → GPIO9 (ADC)               │
 *  │  D3    → GPIO12                 │  Z   → GPIO10 (ADC)              │
 *  │  CS    → GPIO16                 │                                   │
 *  │  VCC   → 3.3V                   │                                   │
 *  │  GND   → GND                    │                                   │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 *  依存: Arduino IDE の esp32 ボードコア v3.x のみ
 *  書き込み: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled
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

/* ----------------------------- ピン設定 ----------------------------- */
// ディスプレイピン
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1

// ADXL335 ピン (アナログ入力)
#define PIN_ACCEL_X    5
#define PIN_ACCEL_Y    9
#define PIN_ACCEL_Z    10

/* =====================================================================
 *  JD9855 QSPI ディスプレイドライバクラス
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
        io_config.pclk_hz            = 20 * 1000 * 1000;  // 配線が 40MHz は厳しい、20MHz の安定値に落とす
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
 *  グローバル変数
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     // 360
static constexpr int H = JD9855_QSPI::V_RES;     // 360
static constexpr int CX = W / 2;                  // 中心 x = 180
static constexpr int CY = H / 2;                  // 中心 y = 180
static constexpr int RADIUS = 180;
static constexpr int R2MAX  = RADIUS * RADIUS;

static const int BLOCK_H = 40;
uint16_t blockBuf[W * BLOCK_H];

// 各ピクセルの中心からの角度ルックアップテーブル (atan2 を 0-255 に事前計算)、ピクセルごとに atan2f を呼ばないようにする
uint8_t *angleTab = nullptr;

// 加速度計データ (フィルタ後)
float accelX = 0, accelY = 0, accelZ = 0;
// 加速度計の生の中心値 (静止時の ADC 値、キャリブレーションが必要)
int accelXCenter = 2048, accelYCenter = 2048, accelZCenter = 2730;

// 色定義
uint16_t COLOR_BLACK;
uint16_t COLOR_WHITE;
uint16_t COLOR_LIGHT_GRAY;

/* =====================================================================
 *  ユーティリティ関数
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
 *  加速度計の読み取りとフィルタ
 * ===================================================================== */
void readAccelerometer() {
    // 生の ADC 値を読む (ESP32-S3 ADC は12ビット、0-4095)
    int rawX = analogRead(PIN_ACCEL_X);
    int rawY = analogRead(PIN_ACCEL_Y);
    int rawZ = analogRead(PIN_ACCEL_Z);

    // -1.0 〜 1.0 の正規化値に変換
    // ADXL335 は 3.3V 給電で 1g あたり約 330mV、中心は約 1.65V
    // ADC は 3.3V = 4095、よって 1g あたり約 409 ADC 単位
    float newX = (rawX - accelXCenter) / 409.0f;
    float newY = (rawY - accelYCenter) / 409.0f;
    float newZ = (rawZ - accelZCenter) / 409.0f;

    // クリップ
    newX = constrain(newX, -1.5f, 1.5f);
    newY = constrain(newY, -1.5f, 1.5f);
    newZ = constrain(newZ, -1.5f, 1.5f);

    // ローパスフィルタ (スムージング)
    const float alpha = 0.3f;
    accelX = accelX * (1 - alpha) + newX * alpha;
    accelY = accelY * (1 - alpha) + newY * alpha;
    accelZ = accelZ * (1 - alpha) + newZ * alpha;
}

/* 各ピクセルの中心からの角度 (atan2) を事前計算し、0-255 のテーブルに格納.
   実行時は各ピクセルでテーブル参照してラジアンに戻すだけで、フレームごとに
   atan2f を呼ばない —— 以前のカクつきの主因.
   setup で一度だけ計算. 内部 RAM (~126KB) を優先、足りなければ PSRAM にフォールバック;
   どちらもなければ nullptr にし、描画は atan2f に劣化 (見られるが遅い). */
void buildAngleTable() {
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab 確保失敗、描画が遅くなります")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   // -0.5..0.5
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);
        }
    }
    Serial.printf("[INIT] 角度テーブル %d KB 準備完了\n", (int)(n / 1024));
}

/* =====================================================================
 *  シーン: 3軸加速度ダッシュボード
 *  3軸のリアルタイムデータを表示、動的ポインタと数値付き
 * ===================================================================== */
void renderGaugeScene() {
    // ---- フレームごとの定数 (ループ外に括り出し、ピクセルごとの再計算を回避) ----
    int t = millis() / 50;
    float breathe   = (sinf(t * 0.1f) + 1) / 2;
    float tiltAngle = atan2f(accelY, accelX);
    float tiltMag   = sqrtf(accelX * accelX + accelY * accelY);
    tiltMag = min(1.0f, tiltMag);
    float xAngle    = accelX * M_PI / 2;
    float yAngle    = -M_PI / 2 + accelY * M_PI / 2;
    float zVal      = (accelZ + 1) / 2;
    float fillAngle = -M_PI + zVal * 2 * M_PI;
    const float A8SCALE = M_PI / 128.0f;   // 角度テーブル(0-255) → ラジアン

    // 半径の閾値はすべて r^2 (整数比較) で、ピクセルごとの sqrtf を回避 —— 中心の針の小領域だけ float r が必要
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
            const uint8_t *angRow = angleTab ? &angleTab[yy * W] : nullptr;  // 行先頭ポインタを行ごとに1回取得
            for (int x = 0; x < W; x++) {
                int dx = x - CX, dy = yy - CY;
                int r2 = dx * dx + dy * dy;

                if (r2 > R2MAX) {
                    blockBuf[y * W + x] = COLOR_BLACK;
                    continue;
                }

                float angle = angRow ? ((int8_t)angRow[x] * A8SCALE)
                                     : atan2f((float)dy, (float)dx);

                // 暗い背景
                uint16_t color = JD9855_QSPI::color565(15, 20, 30);

                // 外周目盛
                if (r2 > R2_TICK_LO && r2 < R2_TICK_HI) {
                    int deg = (int)((angle + M_PI) * 180 / M_PI) % 30;
                    if (deg < 3 || (r2 > R2_165 && deg % 10 < 2)) {
                        color = COLOR_LIGHT_GRAY;
                    }
                }

                // X軸 (外側リング、赤)
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

                // Y軸 (中間リング、緑)
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

                // Z軸 (内側リング、青)
                if (r2 > R2_Z_LO && r2 < R2_Z_HI) {
                    if (angle < fillAngle || angle < -M_PI + 0.1) {
                        color = JD9855_QSPI::color565(30, 80, 200);
                    } else if (r2 >= R2_65_LO && r2 < R2_65_HI) {
                        color = JD9855_QSPI::color565(20, 30, 80);
                    }
                }

                // 中心の針 (合力方向を指す) —— ここだけ float r が必要
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

                // 呼吸ライト装飾 (breathe はループ外で計算済み)
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
 *  メインプログラム
 * ===================================================================== */
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[ADXL335 + TK015F5785] 3軸加速度ダッシュボード"));

    // 色初期化
    initColors();

    // ADC 初期化 (ESP32-S3)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);  // 0-3.3V レンジ
    pinMode(PIN_ACCEL_X, INPUT);
    pinMode(PIN_ACCEL_Y, INPUT);
    pinMode(PIN_ACCEL_Z, INPUT);

    // キャリブレーション: 静止状態の中心値を読む
    Serial.println(F("[ACCEL] キャリブレーション中、本体を水平に静止させてください..."));
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
    accelZCenter = sumZ / 100 - 409;  // Z軸は静止時 約 1g、1g のオフセットを引く
    Serial.printf("[ACCEL] キャリブレーション完了: X=%d, Y=%d, Z=%d\n", accelXCenter, accelYCenter, accelZCenter);

    // ディスプレイ初期化
    Serial.println(F("[LCD] 初期化中..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] 初期化失敗!"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] 初期化成功"));

    buildAngleTable();   // 各ピクセルの角度を事前計算、ダッシュボード描画のカクつきを防止

    lcd.fillScreen(COLOR_BLACK);
    Serial.println(F("[DEMO] 3軸加速度ダッシュボード"));
}

void loop() {
    // 加速度計を読む
    readAccelerometer();

    // ダッシュボードを描画
    renderGaugeScene();

    // デバッグ情報を表示 (1秒に1回)
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint > 1000) {
        lastPrint = millis();
        Serial.printf("X=%.2f  Y=%.2f  Z=%.2f\n", accelX, accelY, accelZ);
    }
}
```

### コードの解説

- **ディスプレイドライバ部**：`JD9855_QSPI` クラスは ESP-IDF の `esp_lcd_panel_io_spi` インターフェースを直接呼び出して手書きされており、サードパーティのグラフィックライブラリに依存しません。`pclk_hz` をよくある 40MHz から 20MHz に下げているのは、配線が長いと 40MHz で画面が乱れやすいためです。実機でハマった後の安定値で、配線が短くディスプレイケーブルの品質が良ければ自分で上げて試せます。
- **角度ルックアップテーブル `buildAngleTable()`**：これが描画全体のパフォーマンスの鍵です。第一段階として `setup()` で 360×360 の各ピクセルの中心からの角度を事前計算し、0-255 の1バイトテーブルに圧縮して格納。第二段階で描画時に各ピクセルは配列参照1回だけで、遅い `atan2f()` をピクセルごとに呼びません。この最適化がダッシュボードのリフレッシュが滑らかかどうかを直接左右します。
- **`readAccelerometer()` の読み取りとフィルタ**：第一段階で生の ADC 値を読み、第二段階で 409 counts/g の換算で電圧を -1〜1 の正規化値に変換します（この係数は ADXL335 の 300mV/g の典型感度 × ESP32-S3 の12ビット ADC のフルスケール 3.3V からの理論値で、実機では自身のモジュールに合わせて微調整を推奨）。第三段階で一次ローパスフィルタ（`alpha = 0.3`）でノイズを平滑化します。
- **「振る」方が「傾ける」より目立つ理由がコード上で現れる場所**：`xAngle = accelX * M_PI / 2` という行が accelX の ±1g を ±90° に線形マッピングします。ゆっくり傾けた場合の accelX の理論上限は ±1g で、ちょうど ±90° に対応します。しかし振ると慣性加速度が重力に重なり、accelX の実際の読みはしばしば ±1 を超え、`constrain()` で ±1.5g にクリップされるため、マッピングされる角度の振れはゆっくり傾けるよりずっと激しくなります——これは描画ロジックの問題ではなく、加速度計の物理特性で決まります。
- **Z 軸の描画**：`zVal` が accelZ を -1〜1 から 0〜1 にマッピングし、それから充填角度 `fillAngle` に変換します。本質的には「プログレスリング」形式で Z 軸の値を表示しています。もしプログレスリングが常にわずかに震えている場合は正常です（後の FAQ で説明）。

---

## トラブルシューティング

焦らずに。大抵の問題は以下の箇所にあります：

1. **ディスプレイが点灯しない、または画面が乱れる**：まず QSPI の D0〜D3 の4本のデータ線が逆になっていないか確認、次に CS/SCLK が独立して正しく接続されているか、最後にディスプレイの給電が 3.3V で安定しているか（給電リップルが大きくても画面が乱れます）。
2. **ADXL335 の読みが 2048 付近で止まったまま動かない**：導通していない ADC ピンにつないでいないか、モジュール自体の給電異常がないか確認。本プロジェクトで使う GPIO5/9/10 はすべて ESP32-S3 の ADC1 範囲内で、Wi-Fi が ADC2 を占有する影響を受けないため、この可能性は除外できます。
3. **Z 軸の値が常に乱れて跳ぶ**：これは ADXL335 のメーカー設計特性で、Z 軸のノイズ密度は生来 X/Y 軸より高く、配線やコードの問題ではありません。フィルタ係数 `alpha` を小さくする（例えば 0.3 → 0.1）、またはコード内で複数回サンプリングして平均化（オーバーサンプリング）することで緩和できます。
4. **ゆっくり傾けても反応がなく、振ると反応する**：これは加速度計の物理的本質です——測っているのは「合力」であり、純粋な姿勢角ではありません。ジャイロと組み合わせてセンサフュージョンを行って初めて、運動の妨げを受けない安定した姿勢出力が得られます。
5. **コンパイルエラー、`esp_lcd_panel_io.h` が見つからない**：Arduino IDE の ESP32 ボードサポートパッケージのバージョンを確認。必ず v3.x（ESP-IDF 5.x ベース）にすること。旧コアにはこれらのインターフェースがありません。
6. **キャリブレーション後に中心値が明らかにずれている**：キャリブレーション中に本体が水平でなかったか、揺れていた。水平な机の上で電源を入れ、キャリブレーションの1秒間はできるだけ触らないことをお勧めします。

---

## FAQ

**Q：ADXL335 は傾きを測るのか、運動を測るのか？**
A：厳密には「比力」（重力成分＋運動加速度の合成）を測っており、両者を分離できません。ゆっくり傾け続けても重力成分は最大 ±1g しか変化しませんが、振ると運動加速度が重なり、振幅はしばしば ±1g を超えます。そのため視覚的には「振る」方が「ゆっくり傾ける」よりずっと目立ちます。純粋な姿勢角が欲しい場合は、ジャイロを搭載した6軸 IMU（MPU6050 など）に切り替えてセンサフュージョンを行う必要があります。

**Q：なぜ Z 軸の読みが常に跳んでいて、X/Y は比較的安定なのか？**
A：これは ADXL335 のメーカー設計特性です——データシートでは Z 軸の出力ノイズ密度が X/Y 軸の約2倍になっており、配線やコードの問題ではありません。ローパスフィルタを強くする、ADC のオーバーサンプリングを増やすことで緩和できますが、完全に消除することはできません。

**Q：GY-61 モジュールはどの程度速い動作まで測れる？**
A：オンボードのフィルタコンデンサが 0.1μF で、各軸の帯域を約 50Hz に制限しています。日常的な振りや傾きには十分。より高周波の振動を測りたい場合は、より小さい容量のフィルタコンデンサに交換する必要があります。

**Q：ESP32-S3 の GPIO5/9/10 を ADC として使うと Wi-Fi と衝突する？**
A：いいえ。これら3本はすべて ESP32-S3 の ADC1 範囲（GPIO1〜10）内で、Wi-Fi 動作時に制限を受けるのは ADC2（GPIO11〜20）だけです。本プロジェクトではこの落とし穴を気にする必要はありません。

**Q：キャリブレーション時に本体を水平に静止させるのはなぜ？**
A：コードは電源投入後に連続して100回サンプリングして平均を取り、その平均値を「0g」の基準点としています。キャリブレーション時に本体が傾いていたり揺れていたりすると、基準点がズレて以降のすべての換算がそれに従ってズレます。

**Q：このコードに追加のサードパーティライブラリは必要？**
A：いいえ。ディスプレイドライバは ESP-IDF 標準の `esp_lcd_panel_io` と `spi_master` インターフェースを直接呼び出して手書きされており、Arduino IDE の ESP32 ボードサポートパッケージが v3.x で十分です。ライブラリマネージャで何も入れる必要はありません。

---

## 応用アイデア

- 6軸 IMU（MPU6050 など）を1つ追加してセンサフュージョンを行い、振動の妨げを受けない本当に安定した姿勢ダッシュボードを作る
- 「振りの強さ」だけを抽出して簡易「衝撃検知器」にし、閾値を超えると変色やアラームを出す
- ブザーや RGB LED をつなぎ、設定角度を超える傾きでアラームを鳴らす簡易水平器にする
- SD カードで運動データを記録し、後でエクスポートしてグラフ化し振り返る

---

## 参考資料

- [ADXL335 公式製品ページ＆データシート（Analog Devices）](https://www.analog.com/en/products/adxl335.html)
- [GY-61 / ADXL335 breakout オンボードフィルタコンデンサと帯域の説明（Adafruit）](https://www.adafruit.com/product/163)
- [JD9855 QSPI ドライバチップデータシート](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
- [ESP32-S3 シリーズデータシート（Espressif、ADC1/ADC2 ピン割り当て）](https://documentation.espressif.com/esp32-s3_datasheet_en.pdf)
