---
title: "ESP32-S3 で TK015F5785 円形ディスプレイを点灯（JD9855 QSPI）｜テーブル参照の鮮やかなアニメ完全チュートリアル"
boardId: esp32s3
moduleId: display/tft15-jd9855
category: esp32
date: 2026-07-30
intro: "ESP32-S3 から QSPI で 1.5 インチの TK015F5785 円形ディスプレイを点灯（ドライバは実は JD9855 で、メーカー公称の ST77916 ではありません）。単一ファイルで手書きしたドライバに、Plasma / 虹色ホイール / 放射状リップルの 3 種のテーブル参照アニメーションを収録。Arduino IDE でそのままコンパイル＆書き込み可能。ハマりどころの回避ガイド付き。"
image: "https://img.lingflux.com/2026/07/8f43dd78cc005af725bd601e0a262621.jpg"
---

難易度：⭐⭐⭐☆☆（マイコンの基礎知識があればよりスムーズ、初心者でもそのまま写せば動きます）
想定時間：30～45 分（タオバオの発送を待つ時間は除く）
テスト環境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10（ESP-IDF v5 ベース。このメジャーバージョンでなければならない理由は後述）

---

> **一言まとめ**：ESP32-S3 から QSPI で 1.5 インチの TK015F5785 円形ディスプレイを点灯——メーカー公称ドライバは ST77916 ですが、実機の IC ID を読んでみて実際は JD9855 だと判明しました。本記事では ESP-IDF 標準の `esp_lcd_panel_io` を使い、数十行の単一ファイルミニドライバを手書きして、Plasma プラズマ流 / 虹色ホイール / 放射状リップルの 3 種のテーブル参照アニメーションを走らせます。ライブラリは一切追加せず、実行時にも `sin`/`atan2`/`sqrt` を呼ばず、30 分で全面滑らかに動きます。

---

## 前書き

私も最初は、円形ディスプレイを点灯するなんて「電気をつないで、適当に色データを送るだけ」の 5 分仕事だと思っていました。メーカーがドライバチップは ST77916 だと言っていたので、GFX library for Arduino に含まれているはずでした。しかしコードを書き込むと、画面は黒から次第に真っ白へ変化してしまい……お手上げ状態に。その後メーカーに ESP-IDF のドライバコードを尋ねて、この画面のドライバが実は JD9855 であることが分かりました。画面の IC ID（読み出したコードは `FF 98 55 00`）からも、この画面のドライバチップが確かに JD9855 であると確認できました。皆さんが再現しやすいように、ESP-IDF 内蔵の `esp_lcd_panel_io` で数十行のミニドライバを手組みしました——ライブラリ追加も、フォント設定も、専用ヘッダファイルすら不要で、1 つの .ino に全部詰め込んで動かせます。

このチュートリアルでは、1.5 インチ TK015F5785 円形ディスプレイを「届いたばかりのただの黒いガラス」から「全面に流れる鮮やかなアニメ」まで点灯させる全過程をまとめます。配線、ドライバの原理、そして `sin`/`atan2`/`sqrt` を呼ばない 3 種の滑らかなアニメーションアルゴリズムを含みます。順に進めれば、30 分であなたの円形ディスプレイも回り出します。

> **TL;DR（急ぐ方はここだけ読めば大丈夫）：**
>
> 1. 配線：SCLK→GPIO6、D0→GPIO15、D1→GPIO7、D2→GPIO11、D3→GPIO12、CS→GPIO16
> 2. Arduino IDE で Board = **ESP32S3 Dev Module**、USB CDC On Boot = **Enabled** を選択
> 3. サードパーティライブラリは一切不要。コードはすべて ESP-IDF 標準の `esp_lcd_panel_io` に頼っており、コアバージョンは **v3.x** でなければなりません
> 4. .ino 全体をコピペしてコンパイル＆書き込みするだけで、通電と同時に全面に流れるカラー アニメーションが表示されます。画面が出ない場合はどこかでハマっています。下の「よくある問題のトラブルシューティング」をご覧ください

---

## 実験結果

通電後、画面はテーブル参照アルゴリズムで生成された 3 種のカラーアニメを自動的にループ再生します。各シーンは 6 秒間表示され、動きのカクつきや、走査線ごとの引き裂き感はありません：

- **Plasma プラズマ流**：色が液体のように連続的に流れる
- **虹色ホイール**：全色相が円の中心をゆっくり回転し、回り続けるカラーパレットのよう
- **放射状リップル**：中心から外側へ広がる色のさざ波

通電するだけで全面アニメーションになり、追加操作が不要なので、「この画面は本当に生きている」ことを確かめる検証実験にもぴったりです。

---

## 部品説明

> 開発ボード（ESP32-S3）の説明は割愛し、ここではボード以外の主要部品だけを説明します。

### TK015F5785 円形ディスプレイ

TK015F5785 は 1.5 インチの円形 **IPS** ディスプレイ（ドライバチップは JD9855）で、ESP32-S3 から送られたピクセルデータを画面として表示する役割を担います。本プロジェクトでは 3 種のテーブル参照アニメーションの最終的な視覚出力を担います。下表のパラメータは特記ない限り、メーカー提供のモジュール仕様書に基づきます：

| パラメータ     | 数値 / 説明                                                  | 出典                |
| -------------- | ------------------------------------------------------------ | ------------------- |
| サイズ         | 1.5 インチ                                                    | メーカー仕様書      |
| LCD タイプ     | IPS、全視野角                                                | メーカー仕様書      |
| 解像度         | 360 × 360                                                    | メーカー仕様書      |
| ドライバチップ | JD9855（同型番モジュールには ST77916 バージョンもあります。実測 IC ID で判断） | メーカー仕様書＋実測 |
| 表示領域       | Φ38.16 mm（直径）                                            | メーカー仕様書      |
| 外形寸法       | 44.32 × 44.32 × 3.5 mm                                       | メーカー仕様書      |
| ピクセルピッチ | 0.106 × 0.106 mm                                             | メーカー仕様書      |
| 発色数         | 65K 色（RGB565、16bit/ピクセル）                              | メーカー仕様書      |
| 輝度           | 500 cd/m²                                                    | メーカー仕様書      |
| バックライト   | 白色 LED 4 個並列                                            | メーカー仕様書      |
| 動作温度       | -20 ～ 60 ℃                                                  | メーカー仕様書      |
| インターフェース | QSPI（SCLK + D0～D3 + CS）                                  | 本チュートリアルで実測 |
| 通信クロック   | 20MHz（本チュートリアルでのテスト値）                          | 実測                |

> **発注前に必ずバージョンを確認**：メーカーのモジュール仕様書ではこの画面を「インターフェース RGB / ドライバチップ ST77916 **または** JD9855」と記載しています——つまり同じ型番 TK015F5785 でも、ドライバ IC とインターフェースの組み合わせが異なる複数バージョンが出荷されています。本チュートリアルが対象とするのは **JD9855 + QSPI** のバージョンです（前書きのとおり、IC ID = `FF 98 55 00` を読むことで、チップがメーカーが最初に言っていた ST77916 ではないと確認しました）。もし ST77916 版や RGB インターフェース版を買ってしまった場合は、初期化レジスタシーケンスも配線もすべて変える必要があり、本記事のコードはそのまま使えません。

円形ディスプレイの物理的な表示領域は直径 Φ38.16 mm の円で、0.106mm/ピクセルで換算するとちょうどピクセル半径 180px に相当します——だからコード中の `R2MAX = 180²` は、円の外側のピクセルを能動的に黒にして円形の縁をきれいに見せています（詳しくは「よくある問題のトラブルシューティング」の第 4 条をご覧ください）。

これを選んだ理由は単純です。QSPI インターフェースは従来の SPI よりデータ線が 3 本多く、データを流す帯域は通常の SPI の 4 倍になります。360×360 クラスのピクセル量をシングルライン SPI で流そうとすると、フレームレートが悲惨なことになります。

### ピン説明

| ピン              | 機能                                       |
| ----------------- | ------------------------------------------ |
| SCLK              | QSPI クロック線                            |
| D0 / D1 / D2 / D3 | QSPI の 4 本データ線（Quad Mode で並列転送） |
| CS                | チップセレクト。Low でこの画面を選択        |
| BL（バックライト） | バックライト制御。モジュールによっては引き出されていません |
| VCC               | 電源。通常 3.3V                            |
| GND               | 共通 GND                                   |

### JD9855（ドライバチップ）

JD9855 はチップベンダ Jadard（杰达科技）がリリースした、画面モジュールに統合されたワンチップ TFT LCD ドライバ IC です。内蔵の表示バッファ（GRAM）を持ち、受信したピクセルデータをバッファに書き込んで液晶セルの発色を制御します。本プロジェクトでは `esp_lcd_panel_io` から送られる初期化レジスタシーケンスと RAMWR ピクセル書き込みコマンドを実行する役割を担います。

幸い JD9855 には**公開データシートがあります**（チップベンダ Jadard（杰达科技）が公開した Preliminary V0.00 版、2023 年 10 月）。マニュアルに基づく主なスペックは以下のとおりです：

| パラメータ         | 数値 / 説明                                                                                    | データシートの出典 |
| ------------------ | ---------------------------------------------------------------------------------------------- | ------------------ |
| 駆動能力           | ワンチップ SOC で a-Si TFT を駆動、最大 360 RGB×390（Dual-Gate=780）点、540 チャネル ソース駆動 | Features / Intro   |
| 内蔵フレームバッファ | 360×390×18 bit（約 315 KB GRAM）                                                              | Features           |
| 対応インターフェース | 8080 パラレル（8-bit）、RGB（6-bit）、SPI（8/9-bit、2-lane）、**QSPI（DDR 対応）**、MIPI-DSI   | System Interface   |
| 色フォーマット     | RGB565（16-bit） / RGB666（18-bit）                                                            | Color Format       |
| I/O 電圧           | 1.65V ～ 3.3V                                                                                  | Features           |
| 動作温度           | -40 ～ +85 ℃                                                                                   | Features           |

このマニュアルには 0x2A（CASET）、0x2B（RASET）、0x2C（RAMWR）、0x36（MADCTL）、0x3A（COLMOD）といった各コマンドのビット定義とタイミングが明確に記載されています——本記事のコードで使っているのはまさにこれらの標準コマンドです。**ただし注意点として**：マニュアルで公開されているのはコマンドセットとタイミングですが、ガンマ補正、電源昇圧、各社独自のサブコマンド（本記事の初期化シーケンスにある `0xDE` / `0xDF` / `0xC3` のような「コマンド Bank 切り替え」を伴うレジスタ）といった調整用パラメータは、依然としてパネルベンダが自社の画面向けに個別に調整したプライベートな初期化テーブルに属します。この部分はベンダが提供するシーケンスをそのまま写せば点灯するので、1 行ごとの意味を深掘りする必要はありません。

---

## BOM 表

| 部品                                    | 数量   | 備考                                                              |
| --------------------------------------- | ------ | ----------------------------------------------------------------- |
| ESP32-S3 開発ボード                      | 1      | PSRAM 搭載版を推奨（角度テーブルのフォールバック用）              |
| TK015F5785 円形ディスプレイモジュール（JD9855 / QSPI） | 1      | 必ず JD9855+QSPI バージョンであることを確認（同型番には ST77916/RGB 版もあります。部品説明を参照） |
| ジャンパワイヤ（メス-メス、モジュールのピンヘッダに合わせる） | 6 本以上 | SCLK / D0～D3 / CS の 6 本に加え、VCC / GND                       |

---

## 配線方法

| 画面ピン      | 接続先 ESP32-S3 ピン                                  |
| ------------- | ----------------------------------------------------- |
| SCLK          | GPIO6                                                 |
| D0            | GPIO15                                                |
| D1            | GPIO7                                                 |
| D2            | GPIO11                                                |
| D3            | GPIO12                                                |
| CS            | GPIO16                                                |
| BL（バックライト） | このモジュールでは引き出されておらず、ソフト制御不可。電源を入れれば常時点灯 |
| VCC           | 3.3V                                                  |
| GND           | GND                                                   |

配線後は 1 本ずつ確認することを強く推奨します。トラブルシュート時間の 80% を省けます——QSPI はデータ線が 4 本あり、2 本逆挿しすると現象は黒画面ではなく花画面になることが多く、全面黒よりも特定が難しくなります。

---

## 必要なライブラリ

嬉しいお知らせ：**サードパーティライブラリは一切不要**です。ドライバは ESP-IDF 標準の `driver/spi_master.h`、`esp_lcd_panel_io.h`、`esp_heap_caps.h` を直接呼び出すだけで、これらのヘッダは Arduino ESP32 コアに標準で付属しています。

唯一のハード要件は、Arduino IDE の **ESP32 ボードコアが v3.x であること**（ESP-IDF v5 ベース）。v2.x コアはベースが ESP-IDF v4.4 で、`esp_lcd_panel_io_tx_param` / `esp_lcd_panel_io_tx_color` という API 群は旧版では挙動もヘッダのパスも異なり、そのままコンパイルすると「シンボルが見つからない」「関数のシグネチャが合わない」といったエラーになります。

アップグレード手順：Arduino IDE → ツール → ボード → ボードマネージャで「esp32」を検索し、espressif のコアパッケージを 3.x 以降に更新してください。

---

## 完全コード

> コードは単一ファイルで、新しい .ino にコピペするだけでコンパイルできます。CS ピンは `16` です（過去に存在しない `160` と誤記されていたバージョンがありました。詳しくは「よくある問題のトラブルシューティング」の第 1 条をご覧ください）。

```cpp
/*
 * =============================================================================
 *  TK015F5785 円形ディスプレイ (JD9855, QSPI) 単一ファイル鮮やかデモ —— Arduino IDE 版
 * =============================================================================
 *
 *  ✦ 単一ファイル: ドライバ + デモをすべてこの .ino に収録. コピペするだけで動き, 外部ファイルは不要.
 *
 *  デモ内容 (3 シーンを自動ループ, 各約 6 秒, すべて滑らか連続):
 *    [1] Plasma プラズマ流      —— 色が液体のように流れる (sin テーブル参照)
 *    [2] 虹色ホイール           —— 全色相 + ゆっくり回転 (角度を事前計算してテーブル参照)
 *    [3] 放射状リップル         —— 中心から外側へのカラーサザ波 (r² 位相)
 *
 *  通電するだけで全面に流れるカラーが表示され, 「画面が点いた + 色も正常」を直感的に証明. 点灯デモに最適.
 *
 *  パフォーマンスの肝: 3 シーンのピクセルごとの演算はすべて "テーブル参照 + 整数加減算" だけで, sin/atan2/sqrt は呼ばない.
 *                     だから毎フレームの描画が速く, 走査線の引き裂きは肉眼で見えず, すべて滑らか.
 *
 *  ハードウェア: ESP32-S3 + TK015F5785 (JD9855, QSPI)
 *    SCLK=6  D0=15  D1=7  D2=11  D3=12  CS=16  バックライト=-1(未引き出し, 制御不可)
 *  依存: Arduino IDE の esp32 ボードコア v3.x のみ. 外部ライブラリ / フォント / 外部ヘッダ不要.
 *  書き込み: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled, シリアル 115200.
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
/* HelloWorld / テストプログラムと同じ. 配線を変えたら併せて変更すること. */
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1      /* バックライト. -1 で制御しない */ // 現在のモジュールは引き出されていないため制御不可

/* =====================================================================
 *  画面ドライバ (JD9855 QSPI) —— そのまま写せば OK. 基本的に変更不要.
 *  原理: Arduino-ESP32 3.x は ESP-IDF ベースなので, esp_lcd_panel_io を直接呼んで QSPI を駆動.
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

    /* RGB565(リトルエンディアン) バッファを矩形領域にプッシュ */
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

    /* 全画面塗りつぶし (行ごと, メモリ使用量はごく少ない) */
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

    /* JD9855 メーカー初期化シーケンス (ESP-IDF 版 esp_lcd_jd9855 ドライバから移植) */
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
        sendCmd(0x11);            /* スリープ解除 */
        delay(120);
        sendCmd(0x29);            /* 表示 ON */
        delay(10);
    }
};

/* =====================================================================
 *  デモ部分 —— ここが見どころ
 *  方針: 毎フレーム行ごとに各ピクセルの色を計算し, 画面にプッシュ.
 *       "位置に依存し時間に依存しない" 量 (sin, 色相, 角度) はすべてテーブルに事前計算し,
 *       実行時のピクセルごとの処理は "テーブル参照 + 整数加減算" だけ. だから 3 シーンとも滑らか.
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     /* 360 */
static constexpr int H = JD9855_QSPI::V_RES;     /* 360 */
static constexpr int CX = W / 2;                  /* 中心 x */
static constexpr int CY = H / 2;                  /* 中心 y */
static constexpr int RADIUS = 180;                /* 円形画面の表示半径 */
static constexpr int R2MAX  = RADIUS * RADIUS;    /* 円の外側の r² 閾値 (180²=32400) */

static const int BLOCK_H = 40;             /* 1 回の描画+プッシュは 40 行. プッシュ回数を大幅に削減 */
uint16_t blockBuf[W * BLOCK_H];            /* ブロックバッファ (360*40*2=28KB, 内部 RAM, PSRAM 不要) */
uint8_t  sinTab[256];       /* サインテーブル: sinTab[i] = sin(i/256*2π)*127+128 */
uint16_t hsvTab[256];       /* 色相(0-255) -> RGB565 テーブル (彩度/明度 最大) */
uint8_t *angleTab = nullptr;/* ピクセルごとの中心相対角度テーブル (360*360B). 円盤シーンで atan2 を呼ばないようにする */

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

/* 起動時に sin / 色相 の 2 つのテーブルを生成. 以降の描画はテーブル参照のみ */
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

/* 各ピクセルの中心相対角度 (atan2) を事前計算し, 0-255 のテーブルに格納.
   円盤シーンの実行時はテーブル参照だけで済み, 毎フレーム atan2f を呼ぶ必要がない (これが本来のカクつき原因).
   setup で 1 回だけ計算するので所要時間は気にしなくて OK. 優先的に内部 RAM (~126KB) に, 無理なら PSRAM にフォールバック;
   どちらもなければ nullptr にし, シーンは atan2f に降格する (見られるがカクつく). */
void buildAngleTable()
{
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab の確保に失敗. 円盤シーンが遅くなります")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   /* -0.5..0.5 */
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);        /* リング状に 0-255 へマップ */
        }
    }
    Serial.printf("[INIT] 角度テーブル %d KB 準備完了 (円盤シーンが滑らかになります)\n", (int)(n / 1024));
}

inline uint8_t sin8(int phase) { return sinTab[(uint8_t)phase]; }

/* ---- シーン 1: Plasma プラズマ流 (テーブル参照のみ) ---- */
inline uint16_t plasmaPixel(int x, int y, int t)
{
    int v = sin8(x * 3 + t)
          + sin8(y * 3 - t * 2)
          + sin8((x + y) * 2 + t / 2)
          + sin8((x - y) * 2 - t / 2);
    return hsvTab[(uint8_t)(v / 4 + t)];
}

/* ---- シーン 2: 虹色ホイール (角度テーブル + r², 全整数) ---- */
inline uint16_t wheelPixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;                 /* 円の外は黒. 縁をきれいにする */
    int ang = angleTab ? angleTab[y * W + x]
                       : (int)(atan2f((float)dy, (float)dx) / (2.0f * (float)M_PI) * 256.0f);
    int hue = ang + r2 / 200 + t;             /* 半径方向に色相を重ねて螺旋ホイールを形成 */
    return hsvTab[(uint8_t)hue];
}

/* ---- シーン 3: 放射状リップル (r² をそのまま位相に. 開平不要) ---- */
inline uint16_t ripplePixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;
    int v = sin8(r2 / 80 - t * 3);            /* リップル位相: 距離+時間で広がる */
    return hsvTab[(uint8_t)(v + r2 / 400)];
}

/* 1 フレーム描画: 毎回 BLOCK_H 行を計算してからまとめてプッシュ (360 回を 9 回のプッシュで代替し, コマンドのオーバーヘッドを減らしてフレームレートを稼ぐ.
   さらに 40 行ごとに同時更新するので, 走査線ごとのカクつき感が大幅に軽減). sceneId がピクセル関数を選択 (0=plasma 1=wheel 2=ripple) */
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

/* シーン名 */
const char *SCENE_NAMES[] = { "Plasma プラズマ流", "虹色ホイール", "放射状リップル" };
const int      N_SCENES   = 3;
const uint32_t SCENE_MS   = 6000;    /* 各シーンを 6 秒間表示 */

int      curScene   = 0;
uint32_t sceneStart = 0;

/* ----------------------------- setup ------------------------------- */
void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[TK015F5785] 単一ファイル鮮やかデモ (JD9855 QSPI)"));

    Serial.println(F("[LCD] begin..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] init FAILED! ピン / ボードコアバージョン (esp32 v3.x が必要) を確認してください"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] init OK"));

    buildTables();
    buildAngleTable();          /* 角度テーブルを事前計算して円盤シーンを滑らかに */
    lcd.fillScreen(0);
    sceneStart = millis();
    Serial.printf("[DEMO] シーン 1/%d: %s\n", N_SCENES, SCENE_NAMES[curScene]);
}

/* ----------------------------- loop -------------------------------- */
void loop()
{
    int t = (int)(millis() / 12);     /* アニメーションの進みステップ. 大きいほど速い */

    renderFrame(curScene, t);

    if (millis() - sceneStart >= SCENE_MS) {
        sceneStart = millis();
        curScene   = (curScene + 1) % N_SCENES;
        Serial.printf("[DEMO] シーン %d/%d: %s\n",
                      curScene + 1, N_SCENES, SCENE_NAMES[curScene]);
    }
}
```

### コードの説明

第 1 ステップ、`JD9855_QSPI::begin()` でまず `spi_bus_initialize` を使って 4 本のデータ線を持つ QSPI バスを起動し、その後 `esp_lcd_new_panel_io_spi` で `quad_mode = true` の LCD IO デバイスを取り付けます——このステップこそがドライバ全体が動くかどうかの鍵です。`quad_mode` を有効にしないと 4 本あるデータ線のうち実際にデータを転送するのは 1 本だけで、フレームレートは実用にならないレベルまで落ちます。

第 2 ステップ、`sendInitCommands()` はパネルベンダが提供するレジスタ初期化テーブルをそのまま写したもので、`esp_lcd_panel_io_tx_param` で 1 行ずつ送信します。各レジスタの意味を理解する必要はありません。画面を変えない限りこのブロックは触らないでください。

第 3 ステップ、このコードの真の見どころです。3 つのアニメーションシーンはいずれも実行時に `sin`、`atan2`、`sqrt` のような遅い関数を呼ばず、`setup()` の段階でそれらをルックアップテーブル（`sinTab`、`hsvTab`、`angleTab`）として事前計算します。実行時は各ピクセルで「テーブル参照 + 整数加減算」しか行わない——これこそが 360×360 = 12.96 万ピクセル/フレームでも滑らかに、引き裂きなく動く理由です。

第 4 ステップ、`renderFrame()` は 1 行ずつプッシュせず、`BLOCK_H = 40` 行分をまとめてから一度に `pushRect` します。360 行でもプッシュ回数は 9 回で済み、行ごとに 360 回プッシュするのに比べて大量の SPI コマンド オーバーヘッドを省けます。

---

## よくある問題のトラブルシューティング

慌てないでください。以下の問題が円形ディスプレイ不点灯トラブルの大半を占めます：

**1. 通電しても全面黒のままで、シリアルに `[LCD] init OK` も出ない** まず CS ピンの接続を確認——これも本コードのドラフト版で一番ハマりやすかった罠です。`PIN_LCD_CS` はかつて存在しない `160` に誤記されていました（存在しない GPIO 番号）。本記事のコードブロックではすでに `16` に修正済みです。他から旧版をコピーした場合は、この行が `160` ではなく `16` であることを必ず確認してください。

**2. 画面は点くが花画面、色が乱れる** ほぼ確実に D0～D3 の 4 本のデータ線の順序が逆です。QSPI は線順に敏感で、通常の SPI の MOSI/MISO を間違えるのとは訳が違います。配線表に従って 1 本ずつ確認し、感覚で挿さないでください。

**3. コンパイルエラーで `esp_lcd_panel_io.h` が見つからないと言われる** 現在の Arduino ESP32 コアがまだ v2.x（ESP-IDF v4.4 ベース）のままです。ボードマネージャで espressif の esp32 コアを v3.x 以降にアップグレードしてから再度コンパイルしてください。

**4. 円形画面の四隅がずっと黒いまま。接続不良？** これは正常な動作で、故障ではありません。コード中の `R2MAX = 180²` で、この半径を超えるピクセルは能動的に黒にしています。円形画面の物理的な表示領域はそもそも円であり、四隅はもともとベゼルに隠れています。こう処理したほうが縁がかえってきれいに見えます。

**5. シリアルに `angleTab の確保に失敗` と出て、円盤シーンがカクつく** 内部 RAM にこの約 126KB（360×360 バイト）の角度テーブルを確保できなかったことを意味します。コードにはすでにフォールバックロジックを書いてあります：まず内部 RAM を試し、無理なら PSRAM へ、それでも無理なら `atan2f` をその場で計算します（見られますが明らかに遅くなります）。もしあなたのボードに PSRAM がなく、円盤シーンだけが常に他の 2 つよりカクつくなら、これが原因です。PSRAM 搭載のボードに変えれば根本解決します。

**6. バックライトがずっと点いたままで消えない** コード中の `PIN_LCD_BL` は `-1` になっており、コメントにも「現在のモジュールは引き出されていないため制御不可」と書いてあります——もし本当にバックライト制御ピンが引き出されているモジュールを使っているなら、このマクロを対応する GPIO 番号に変更し、`begin()` に渡せばソフトウェアによる調光/オンオフが可能です。

---

## FAQ Q&A

**Q：ESP32 で円形ディスプレイを点灯するには？** A：基本は QSPI インターフェース + `esp_lcd_panel_io` でドライバチップを直接つなぐ方法です。TFT_eSPI のような汎用グラフィックライブラリには依存しません。配線時に SCLK/D0～D3/CS の 5 本を正しくつなぎ、初期化レジスタテーブルはパネルベンダ提供のシーケンスをそのまま写せば点灯します。

**Q：JD9855 ドライバの円形ディスプレイには何のライブラリを使う？** A：追加のライブラリは不要です。JD9855 は主流のグラフィックライブラリ（TFT_eSPI や LVGL の公式ドライバリスト）には内蔵サポートされていません。最も確実なのは本記事のように ESP-IDF 標準の `esp_lcd_panel_io` API を直接呼び、数十行の初期化コードを手書きすることです。

**Q：QSPI 画面と通常の SPI 画面で配線の違いは？** A：通常の SPI はデータ線が 1 本（MOSI）のみですが、QSPI は 4 本（D0～D3）を並列転送し、帯域は通常の SPI の 4 倍です。代償として配線が 3 本増えることと、`esp_lcd_panel_io_spi_config_t` の `flags.quad_mode` を必ず `true` にする必要がある点です。

**Q：ESP32-S3 の円形ディスプレイがずっと黒いままなのはなぜ？** A：確率順に最も多い 3 つの原因は：CS ピンの接続ミスまたは番号の誤記、ボードコアが v3.x 未満で初期化に失敗、電源が不安定（QSPI の配線長が長いと顕著）。シリアルに `[LCD] init OK` が出ているかどうかで、ドライバ層の問題か配線の問題かを素早く切り分けられます。

**Q：Arduino で esp_lcd_panel_io を使って画面を駆動するには？** A：3 ステップです：`spi_bus_initialize` で SPI バスを確立、`esp_lcd_new_panel_io_spi` で LCD IO ハンドルを作成（ここで CS/クロック周波数/SPI モード/quad_mode を指定）、最後に `esp_lcd_panel_io_tx_param` でコマンドを、`esp_lcd_panel_io_tx_color` でピクセルデータを送信します。

**Q：ESP32 円形ディスプレイに TFT_eSPI ライブラリは使える？** A：TFT_eSPI は主に内蔵サポートリストにあるドライバチップを対象としており、JD9855 のようなマイナーな QSPI ドライバチップは含まれていません。無理に使おうとするとドライバ層のコードを自分で書き換える必要が出て、かえって ESP-IDF ネイティブ API で手書きするよりも手間がかかります。

**Q：360×360 解像度の円形ディスプレイでメモリは足りる？** A：足りますが、確保方法に注意が必要です。全画面を一度にバッファリングするには 360×360×2 バイト ≈ 253KB 必要です。本記事ではブロック分割描画（1 ブロック 40 行、約 28KB）を使い、さらにオプションで 126KB の角度テーブルを加えても、内部 RAM にほぼ収まります。この画面のために PSRAM を特別に増設する必要はありません（角度テーブルも安心して内部 RAM に置きたい場合を除く）。

---

## 応用アイデア

基礎デモが動いた後、この円形ディスプレイにはまだいくらでも格闘しがいのある方向があります：

- 3 つのテーブル参照シーンをリアルタイムデータの可視化に入れ替える（CPU 負荷、天気、心拍など。円形画面はダッシュボードに最適）
- タッチ/ロータリーエンコーダを繋いで、インタラクティブな円形コントロールパネルを作る
- 同じ esp_lcd_panel_io の考え方で、他の QSPI ドライバチップの画面へ移植する
- BLOCK_H と pclk_hz を大きくしてフレームレートのストレステストを行い、お手持ちの個体の限界リフレッシュレートを探る

---

## 参考資料

- <cite index="3-1">ESP-IDF 公式の LCD ペリフェラル ドキュメントでは、esp_lcd コンポーネントが Espressif によって SPI LCD、I80 LCD、RGB/SRGB LCD など多様な画面をサポートするためのチップ横断の汎用 API であることが説明されています</cite>：[ESP-IDF LCD Peripheral (ESP32-S3)](https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32s3/api-reference/peripherals/lcd.html)
- [ESP32-S3 シリーズ公式データシート（PDF、Espressif 公式）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [espressif/arduino-esp32 公式 GitHub リポジトリ](https://github.com/espressif/arduino-esp32)
- <cite index="3-2">JD9855 の公開データシート（チップベンダ Jadard（杰达科技）が公開した Preliminary V0.00 版、2023-10-17。下記は OSPTek がホストする PDF ミラー）には、540 チャネル ソース駆動、360RGB×390 解像度、内蔵 GRAM、8080/SPI/QSPI/MIPI-DSI のマルチインターフェース、および CASET/RASET/RAMWR など各コマンドの完全なタイミングが記載されています</cite>：[JD9855 Data Sheet (Preliminary V0.00, PDF)](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
