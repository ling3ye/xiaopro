---
title: "ESP32-S3 で ST7262 RGB ディスプレイを点灯＋LVGL ダッシュボード作成 完全チュートリアル（Waveshare Touch-LCD-5B / 1024×600）"
boardId: esp32s3
moduleId: display/tft50-st7262
category: esp32
date: 2026-08-03
intro: "ESP-IDF を使い、Waveshare ESP32-S3-Touch-LCD-5B（5 インチ 1024×600、ST7262 RGB 直駆動）でゼロから RGB ディスプレイを点灯させ、LVGL を繋いで、動く車両テレメトリダッシュボードを作ります。CH422G によるバックライト制御、PCLK の調整、PSRAM のダブルバッファとイージングアニメーションを丁寧に解説し、完全な ESP-IDF コードと落とし穴回避リストを添えています。"
image: "https://img.lingflux.com/2026/08/b7d201de3550e7561294441b57a205de.jpg"
---

難易度：⭐⭐⭐☆☆（C 言語が少し書けて、ESP-IDF を触ったことがあれば OK）
所要時間：2～3 時間（環境構築込み）
テスト環境：ESP-IDF 5.3.x（または 5.2.7 でマクロ 1 行追加）+ LVGL ^9.3 + espressif/esp_lvgl_port 2.8

---

> **一言でいうと**：ESP-IDF を使い、Waveshare ESP32-S3-Touch-LCD-5B（5 インチ 1024×600、ST7262 純 RGB 直駆動）の黒画面から RGB ディスプレイ点灯、LVGL 接続、最終的に動く車両テレメトリダッシュボードまでを作り上げます。私がハマった落とし穴（解像度の罠、PCLK 白画面、LVGL メモリ白画面、ティアとカクつき）とその回避コードをすべて載せています。

---

> **TL;DR（クイックスタート）：**
> 1. **スペックを正しく認識**：5B は **1024×600**、ドライバ IC は **ST7262**、純 RGB 直駆動——公式サンプルがデフォルトで 800×480 になっているのは信じないこと。
> 2. **PCLK は 16MHz**：ボード定義の 21MHz をそのまま写さないこと。PSRAM に画面を置くと供給が追いつかず全面白になります。
> 3. **バックライトは CH422G 経由**：普通の GPIO でも PWM でもありません。I²C アドレス `0x38` に 1 バイト書くだけで ON/OFF できます。
> 4. **LVGL を動かすなら 2 つのマクロ必須**：`LV_USE_CLIB_MALLOC=y` と `SPIRAM_USE_MALLOC=y`。さもないと白画面＋ウォッチドッグリブートします。
> 5. `idf.py build flash monitor` で書き込んで点灯、祝い酒を開ける。

---

## 前書き

ある週末、外出先で友人が Waveshare 製 **ESP32-S3-Touch-LCD-5B** を購入しました。公式ファームウェアを焼けば正常に表示されるものの、自分のコードでは点灯できず、公式サンプルを使うと真っ黒や真っ白になってしまい、さっぱり分からないという状態。そこで私が引き取って格闘することに。これは 5 インチ 1024×600 の RGB 静電容量式タッチパネル付き開発ボードです。安価なのに装備は豪華——CAN、RS485、RTC、リチウム電池充電まで揃っており、16MB Flash + 8MB PSRAM を内蔵しています。

私が点灯を引き受けたのは、最近スクリーンを点灯させるのが好きだからです。でもその道のりは予想より落とし穴だらけでした。最も挫けそうになった点は——**Waveshare 公式のドキュメントやサンプル通りにやっても点灯しない** ということ。あなたの腕が悪いのではなく、公式のリソースがこの 5B 用に作られていないからです。

私は整ったプロセスを 3 段階の漸進的なサンプルに分割し、コードは GitHub に置いています（[本プロジェクトの完全なディレクトリ](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)、3 つのサンプルが入っています）：

1. **スクリーン点灯**：最もシンプルな方法で Hello World を 1 行表示 → [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
2. **LVGL 接続**：針アニメーション付きの半円スピードメーターを作る → [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
3. **ダッシュボード化**：デザイン性のある車両テレメトリパネルへ作り変える → [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

**本記事の目標**：この 3 段階でハマった落とし穴、なぜそのコードで解決できるのか、そしてそのまま写せる回避早見表を提供し、あなたの徹夜を減らすことです。

---

## 実験効果

最終的に**動く車両テレメトリダッシュボード**が完成します：回転数、スロットル、水温、車速、電圧の 5 枚のデータカードがあり、数値はイージングで目標値に近づき、プログレスバーは過負荷時に赤く変わり、針アニメーションは滑らかでティアしません。

![](https://img.lingflux.com/2026/08/032db1082c643b3c0cc44b993101ead1.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/doq81VdEQRI?si=bIy_tzkslkScLqzU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 一、開発ボード説明：まずこの 5B を正しく認識する

本格的なハマりどころの前に、この ESP32-S3-Touch-LCD-5B のハードウェアスペックを並べておきます。後続の落とし穴——PCLK をいくつにするか、メモリは足りるか、どのピンが同じ I²C を共有しているか——は基本的にこの表の周りを回っているので、見比べながら読むと腑に落ちやすいです。

### スクリーン（真っ先に認識すべきはこれ）

| 項目 | スペック |
| --- | --- |
| サイズ | 5 インチ |
| パネル方式 | IPS |
| 解像度 | **1024 × 600**（実測。公式ドキュメントは 5B 単独の記載がなく、デフォルトは 800×480——これが第 1 章の大穴） |
| 発色数 | 65K 色 |
| インターフェース | RGB（パラレル）、ドライバ IC は **ST7262**、純 RGB 直駆動、**SPI 初期化コマンドは不要** |
| 視野角 | 175° |
| 輝度 | 550 cd/m² |
| タッチ | 静電容量式タッチ（ガラスパネル込み） |
| バックライト昇圧 IC | AP3032KTR-G1 |

> **ST7262** は RGB インターフェースの液晶パネルドライバ IC（Sitronix 製）で、パラレル RGB 信号を受けて液晶分子を駆動します。本プロジェクトでは**初期化コマンドを一切送る必要がありません**——電力を供給し、タイミングを合わせ、データを流せば自力で点灯します。このおかげで相当な手間が省けます。

### メインチップ（MCU）

| 項目 | スペック |
| --- | --- |
| モジュール | ESP32-S3-WROOM-1-**N16R8** |
| コア | Xtensa 32-bit LX7 デュアルコア、最大 240 MHz |
| Flash | **16 MB** |
| PSRAM | **8 MB**（octal SPI） |
| 内蔵 SRAM | 512 KB |
| ワイヤレス | Wi-Fi 2.4 GHz（802.11 b/g/n）、Bluetooth 5（LE）、オンボードアンテナ |
| USB | Full-Speed USB、オンボード Type-C |

> **PSRAM** はチップ外部に接続された「大きいが遅い」メモリです。全面画面（framebuffer）はこの 8MB に置かれ、DMA が休むことなくスクリーンへ転送します。**この 8MB PSRAM こそが全面画面を置く場所です。** PSRAM を quad に設定し間違えるのが定番の落とし穴です（第 7 章で詳述）。

### タッチ

| 項目 | スペック |
| --- | --- |
| タッチ IC | **GT911** |
| 方式 | 静電容量式 |
| サポート点数 | 5 点タッチ |
| インターフェース | I²C |
| I²C アドレス | **0x5D** |

> **GT911** は静電容量式タッチコントローラで、指の位置をデジタル座標に変換して I²C で通知します。本プロジェクトでは RTC、CH422G と同じ I²C（GPIO8/GPIO9）を共有しており、アドレスの設計が重要です。**本シリーズのサンプルではまだタッチを繋いでいません**、これは今後の TODO です。

### 電源とインターフェース

| 項目 | スペック |
| --- | --- |
| 電源 | Type-C 5V / DC 7–36V / 1 セル リチウム電池 3.7V（MX1.25） |
| 消費電力 | 5V / 450 mA（典型） |
| CAN | CAN 2.0 互換（TJA1051、120Ω 終端抵抗はデフォルトで無効） |
| RS485 | SP3485 トランシーバ（120Ω 終端抵抗はデフォルトで無効） |
| 動作温度 | 0 °C ~ 65 °C |
| サイズ | 基板単体 112.4 × 75.1 mm / ケース込み 116.3 × 79 mm |

---

## 二、オンボードリソースマッピング（開発ボード搭載、配線不要）

> ⚠️ **この基板は開発ボードで、部品はすでに実装済みです。以下はオンボードリソースのマッピングであり、ピン確認 / SDK 設定のために使います。ジャンパワイヤで配線するためのものではありません。** あなたがやるべきは：Type-C を繋いで給電し、USB を PC に繋いでファームウェアを書き込むことだけです。

### スクリーン RGB インターフェースのピン

> 以下は公式ドキュメントに対応し、実機駆動で確認済みです。GPIO0 は strapping ピンなので注意（第 7 章の回避リストを参照）。

| ESP32-S3 GPIO | LCD 信号 | 説明 |
| --- | --- | --- |
| GPIO0  | G3    | Green データ bit3 |
| GPIO1  | R3    | Red データ bit3 |
| GPIO2  | R4    | Red データ bit4 |
| GPIO3  | VSYNC | 垂直同期 |
| GPIO4  | TP_IRQ | タッチ割り込み |
| GPIO5  | DE    | データイネーブル |
| GPIO7  | PCLK  | ピクセルクロック（実測 16MHz で安定） |
| GPIO10 | B7    | Blue データ bit7 |
| GPIO14 | B3    | Blue データ bit3 |
| GPIO17 | B6    | Blue データ bit6 |
| GPIO18 | B5    | Blue データ bit5 |
| GPIO21 | G7    | Green データ bit7 |
| GPIO38 | B4    | Blue データ bit4 |
| GPIO39 | G2    | Green データ bit2 |
| GPIO40 | R7    | Red データ bit7 |
| GPIO41 | R6    | Red データ bit6 |
| GPIO42 | R5    | Red データ bit5 |
| GPIO45 | G4    | Green データ bit4 |
| GPIO46 | HSYNC | 水平同期 |
| GPIO47 | G6    | Green データ bit6 |
| GPIO48 | G5    | Green データ bit5 |

### タッチ / RTC / 外部 I²C（共有バス）

| ESP32-S3 GPIO | 信号 | 説明 |
| --- | --- | --- |
| GPIO8 | SDA / TP_SDA / RTC_SDA | I²C データ（タッチ GT911、RTC PCF85063、外部 I²C 共有） |
| GPIO9 | SCL / TP_SCL / RTC_SCL | I²C クロック（同上、共有） |
| GPIO4 | TP_IRQ | タッチ割り込み |

### USB / SD / RS485 / CAN

| 機能 | ESP32-S3 GPIO | 説明 |
| --- | --- | --- |
| USB D- / D+ | GPIO19 / GPIO20 | Full-Speed USB |
| SD MOSI / SCK / MISO | GPIO11 / GPIO12 / GPIO13 | SD カード（SPI） |
| SD CS | （CH422G EXIO4） | Low アクティブ、IO エクスパンダ制御、ネイティブ SPI CS 上にはない |
| RS485 RXD / TXD | GPIO43 / GPIO44 | SP3485 |
| CAN TX / RX | GPIO15 / GPIO16 | TJA1051 |

### 外せないチップ：CH422G IO エクスパンダ

基板上でバックライトやリセットがぶら下がっているチップが **CH422G** で、I²C で操作します。このチップの癖は——**レジスタポインタがなく、I²C デバイスアドレスをそのままコマンドとして使う** ことです。

> **CH422G** は I²C インターフェースの IO エクスパンダで、バックライト、スクリーンリセット、タッチリセット、SD カードチップセレクトといった細かい信号を一元管理します。本プロジェクトではこれを使ってバックライトを点灯させ、スクリーンをリセットします。

| CH422G ピン | 機能 | 説明 |
| --- | --- | --- |
| EXIO0 | DI0  | デジタル入力 0 |
| EXIO1 | TP_RST | タッチリセット |
| EXIO2 | DISP | バックライトイネーブル（ON/OFF のみ、**輝度調整不可**） |
| EXIO3 | LCD_RST | スクリーンリセット |
| EXIO4 | SD_CS | SD カードチップセレクト（Low アクティブ） |
| EXIO5 | DI1  | デジタル入力 1 |
| OD0   | DO0  | デジタル出力 0 |
| OD1   | DO1  | デジタル出力 1 |

---

## 三、インストールが必要なもの：ESP-IDF ツールチェイン + コンポーネント

この基板は**ライブラリのインストール不要**ですが、Arduino ではなく **ESP-IDF**（Espressif 公式の開発フレームワーク）を使います。理由は——RGB 直駆動 + PSRAM framebuffer + LVGL の組み合わせにおいて、sdkconfig の数十のスイッチ（PCLK、PSRAM モード、メモリプール）は ESP-IDF の方が圧倒的に制御しやすく、Arduino でのパラメータ調整はとても厄介だからです。

**準備リスト（これに沿って確認すると、トラブルシュート時間の 80% を削減できます）：**

- [ ] **ESP-IDF 5.3.x**（推奨）。5.2.7 でも動きますがマクロ 1 行の追加が必要（第 7 章参照）。
- [ ] **LVGL ^9.3**（`esp_lvgl_port` 2.8 は 9.3 で追加されたカラー定数に依存しています）。
- [ ] **espressif/esp_lvgl_port 2.8**（LVGL のティック、独立タスク、ロック取得を引き受けてくれます）。
- [ ] **Windows ユーザー**：PowerShell + EIM profile を使い、**Git Bash では `idf.py` を走らせないこと**（`MSYSTEM` を検出すると拒否します）。

コンポーネントのバージョンは必ず同じ世代で揃えること：`esp_lvgl_port` 2.8 には LVGL `^9.3` を組み合わせます。間違えるとコンパイル時に `RGB565_SWAPPED undeclared` が出ます。

---

## 四、第 1 歩：スクリーン点灯（公式サンプルをそのまま使わない）

> 📦 **本章の完全なコード**：[01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld) —— 最もシンプルな方法でスクリーンを点灯し、Hello World を 1 行表示します。

これが全体で最大の落とし穴であり、私が最も先に話したいことです。

**Waveshare 公式の ESP-IDF サンプル（例えば `08_lvgl_Porting`）やドキュメントは、基本的に 800×480 を前提に書かれています。** その `#else` デフォルトブランチが 800×480 になっています。公式ドキュメントに至っては 5 インチシリーズ全体を「800×480 または 1024×600」と大雑把に書き、**5B 単独の解像度を載せていません**。

何も考えずに公式サンプルを 5B に焼き込むと、不可解な画面が出ます——**スクリーンの大部分が黒く、右側に白い帯が出る**（黒＋白）。これは故障ではなく、「800×480 の信号で 1024×600 のパネルに給電している」状態です。パネルが信号より広い分、右側の余剰領域には信号が無いためそのように表示されます。

さらに Waveshare の命名慣習で**「B 接尾辞は角型スクリーンを表すことが多い」**（例えば 4B は 480×480 の角型）ため、私は一時 5B が 720×720 の角型で、SPI 初期化が先に必要なのではと疑いました。悪戦苦闘の末に確信したのは——**5B は 1024×600、ドライバ IC は ST7262、純 RGB 直駆動、SPI 初期化コマンドは一切不要** ということ。これは重要で、多くの手間を省いてくれます。

だから第 1 歩は常に——**公式サンプルの解像度を鵜呑みにせず、手元の基板が本当に何なのかを自分で確認すること** です。

確認の笨い方法は前述の通り——800×480 を給電して右側に白い帯が出れば、1024×600 であると反証できます（パネルが信号より広い場合にのみそうなります）。

### 4.1 起動フロー（6 ステップの骨格）

クセを把握したら点灯に入ります。起動フローは実質 6 ステップです——**I²C 起動 → CH422G でスクリーンリセット → RGB パネル生成 → 画面を描画 → バックライト ON → CPU はアイドル、DMA が自動リフレッシュ**。

「画面を描いてから最後にバックライトを ON にする」ことが重要です——起動 1 フレーム目の乱れを防げます。コード上、点灯の順序は固定です：

```c
/* 第 1 ステップ：まず I²C バスを立ち上げる（GPIO8/9、タッチ GT911、RTC と共有）。*/
i2c_master_bus_handle_t i2c_bus = NULL;
i2c_master_bus_config_t bus_cfg = {
    .sda_io_num = 8, .scl_io_num = 9, .clk_source = I2C_CLK_SRC_DEFAULT,
    .flags.enable_internal_pullup = true,
};
i2c_new_master_bus(&bus_cfg, &i2c_bus);

/* 第 2 ステップ：CH422G を駆動——まずリセット、その後解除（この時点でバックライトはまだ OFF）。*/
ch422g_handle_t io = {0};
ch422g_init(&io, i2c_bus);
ch422g_set_outputs(&io, 0);                              /* EXIO 全部 Low：リセット + バックライト OFF */
vTaskDelay(pdMS_TO_TICKS(10));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST); /* リセット解除、バックライトはまだ OFF */
vTaskDelay(pdMS_TO_TICKS(120));                          /* パネルの立ち上がりを待つ */

/* 第 3 ステップ：RGB パネルを生成し、PSRAM framebuffer に画面を描く（次の節で解説）……*/

/* 第 4 ステップ：画面の準備ができたら最後にバックライトを点灯——EXIO2 を High にする。*/
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

> **順序の鉄則：バックライトは常に最後に ON にする。** リセット時は EXIO 全部を Low（バックライト OFF）、リセット解除後に画面を描き、画面の準備ができてから EXIO2 を High にします。逆にバックライトを先に点灯してから描画すると、起動 1 フレーム目の乱れが見えます。

### 4.2 バックライトを「High で点灯」させるには：CH422G の最小ドライバ

バックライトの「High で点灯」をコードに落とすと、2 つの作業になります：CH422G のドライバを書くことと、起動フローの中で正しい順序で呼ぶこと。ドライバの核心は 1 点だけ——**アドレス即レジスタ**。`0x24` にモードを、`0x38` に 1 バイト（このバイトが 8 路出力のレベル）を書きます。最小ドライバは次のようになります（完全版はリポジトリ `main/ch422g.c` 参照）：

```c
/* CH422G の "レジスタ" = I²C 7-bit デバイスアドレスそのもの（独立したレジスタバイトは無い）。*/
#define CH422G_REG_MODE  0x24   /* 0x01 を書く -> EXIO0..7 プッシュプル出力 */
#define CH422G_REG_OUT   0x38   /* 1 バイト書く -> EXIO0..7 のレベル */

/* EXIO 出力ビット：bit n = EXIO_n のレベル（1 = High）。*/
#define CH422G_TP_RST   (1u << 1)   /* EXIO1 タッチリセット */
#define CH422G_BL       (1u << 2)   /* EXIO2 バックライトイネーブル */
#define CH422G_LCD_RST  (1u << 3)   /* EXIO3 スクリーンリセット */

/* "アドレス即レジスタ" 2 つそれぞれに I²C デバイスハンドルを生成。*/
esp_err_t ch422g_init(ch422g_handle_t *ch, i2c_master_bus_handle_t bus) {
    i2c_device_config_t mode_cfg = { .device_address = CH422G_REG_MODE, .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &mode_cfg, &ch->dev_mode);
    i2c_device_config_t out_cfg  = { .device_address = CH422G_REG_OUT,  .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &out_cfg,  &ch->dev_out);

    uint8_t mode = 0x01;                              /* プッシュプル出力モード */
    i2c_master_transmit(ch->dev_mode, &mode, 1, -1);
    uint8_t zero = 0;
    i2c_master_transmit(ch->dev_out,  &zero, 1, -1);  /* 起動時は全クリア */
    return ESP_OK;
}

/* 1 バイトがそのまま 8 路出力レベル——これが "アドレスをコマンドとして使う" ということ。*/
esp_err_t ch422g_set_outputs(ch422g_handle_t *ch, uint8_t exio_mask) {
    return i2c_master_transmit(ch->dev_out, &exio_mask, 1, -1);
}
```

### 4.3 RGB パネル生成（本章の核心）

パネル生成部分が章全体の核心で、後続の 3 つの落とし穴について各行の理由を順に説明します：

```c
#define LCD_H_RES        1024
#define LCD_V_RES        600
#define LCD_PIXEL_CLK_HZ (16 * 1000 * 1000)   /* ← 落とし穴 1：16MHz、ボード定義の 21MHz ではない */

/* RGB565 では Green は 6 bit (0..63)、Red/Blue は 5 bit (0..31)。純白は 31,63,31 と書く（← 落とし穴 2）。*/
#define RGB565(r, g, b)   ((((r) & 0x1F) << 11) | (((g) & 0x3F) << 5) | ((b) & 0x1F))
#define COLOR_BG          RGB565(2, 8, 20)     /* ダークブルー背景 */
#define COLOR_FG          RGB565(31, 63, 31)   /* 真・白 */

esp_lcd_rgb_panel_config_t panel_cfg = {
    .data_width = 16,                          /* RGB565 = 16 bit */
    .bounce_buffer_size_px = 10 * LCD_H_RES,   /* SRAM bounce：16MHz で供給不足による白画面を防止 */
    .disp_gpio_num = -1,                       /* バックライトは CH422G に接続、GPIO ではない */
    .pclk_gpio_num  = 7, .vsync_gpio_num = 3, .hsync_gpio_num = 46, .de_gpio_num = 5,
    .data_gpio_nums = {
        14, 38, 18, 17, 10,        /* B3..B7 */
        39,  0, 45, 48, 47, 21,    /* G2..G7 */
         1,  2, 42, 41, 40,        /* R3..R7 */
    },
    .timings = {
        .pclk_hz = LCD_PIXEL_CLK_HZ,           /* ← 落とし穴 1 */
        .h_res = LCD_H_RES, .v_res = LCD_V_RES,
        .hsync_pulse_width = 30, .hsync_back_porch = 40, .hsync_front_porch = 220,
        .vsync_pulse_width = 4,  .vsync_back_porch  = 8,  .vsync_front_porch = 4,
        .flags.pclk_active_neg = true,
    },
    .flags.fb_in_psram = true,                 /* 全面 ~1.17MB の framebuffer を PSRAM に配置 */
};
esp_lcd_new_rgb_panel(&panel_cfg, &panel);
esp_lcd_panel_init(panel);                     /* ← 落とし穴 3：パネル生成後にこの行を追加 */
```

パネル生成後、framebuffer を取得すれば直接ピクセルを書き込めます——ESP-IDF の RGB パネルは `draw_bitmap` 以外の描画プリミティブを提供しないため、helloworld には `lcd_fill` / `lcd_draw_text` の 2 つの小さなヘルパー（ドットフォント、リポジトリ `lcd_draw.c` 参照）を同梱しています：

```c
/* PSRAM 上の framebuffer を取得し、Hello World を描画。*/
void *fb = NULL;
esp_lcd_rgb_panel_get_frame_buffer(panel, 1, &fb);
lcd_draw_init((uint16_t *)fb, LCD_H_RES, LCD_V_RES);
lcd_fill(COLOR_BG);
lcd_draw_text((LCD_H_RES - tw) / 2, (LCD_V_RES - th) / 2, "Hello World!", 5, COLOR_FG);

/* 画面の準備ができたら最後にバックライトを ON に。以後は DMA が PSRAM から自力でリフレッシュ、CPU はアイドル。*/
vTaskDelay(pdMS_TO_TICKS(60));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

### 4.4 私が実際にハマった 3 つの落とし穴

**落とし穴 1：PCLK を高くしすぎて全面が白に。** 公式 Arduino ボード定義を写したとき、ピクセルクロック（PCLK）には 21MHz を入れていました。結果はスクリーンが**一面の真っ白**（黒画面ではありません）。真相は——画面は PSRAM に置かれ、DMA で連続的に読み出されてスクリーンへ送られます。21MHz × 16 bit ≒ 毎秒 336M bit の帯域が必要で、「PSRAM → DMA → スクリーン」の経路には**酷すぎ**、供給が追いつかないとスクリーンは有効な同期信号を受け取れず、全面的に「信号無し」の白表示になります。**16MHz に下げたら安定しました。**

**落とし穴 2：白文字がピンクになり、ピン配置を並べ直す寸前でした。** 点灯後、白文字がピンク色に表示され、第一反応は Green ピンを逆に並べたかと思いました——誤りです。本当の理由は **RGB565 で Green は 6 bit（0–63）、Red/Blue こそ 5 bit（0–31）** であること。`RGB565(31, 31, 31)` では Green の 31 は 0–63 の中で半分以下、Red/Blue は満タン、Green は半分なので、混色結果はピンクになります。`RGB565(31, 63, 31)` に変えて初めて真っ白になります。色ズレには 2 種類あります——**白がシアンに = ピン順序の問題**；**白がピンクに = 数値の入力ミス**。

**落とし穴 3：初期化 1 行を忘れた。** 正典フローは「パネル生成 → リセット → 初期化 → 表示 ON」ですが、私は最初パネル生成のステップしか呼びませんでした。多くの場合、生成が終わると自動的にスキャンが始まりますが、`esp_lcd_panel_init()` を 1 行補っておくと「DMA が起動していない」トラブルを排除できます——これがないと、時々点灯したりしなかったりします。

### 4.5 最も価値のある一技：まず「どんなふうに点かないか」を観る

「点かない」に直面したとき、最も有用な一技は**まずスクリーンがどういうふうに点かないかを観る**ことです：

- **バックライトが全く点かない** → CH422G / リセットシーケンスの問題
- **バックライトは点くが全面白/灰** → RGB 信号が正しく供給されていない（最頻出、PCLK とタイミングを確認）
- **バックライトは点くが乱れ/抖動** → 信号はあるが、タイミングパラメータが少し足りない
- **バックライトは点くが色が違う（白がシアンに）** → RGB チャンネルの順序が逆

この 1 つの観察だけで問題を 2 つに分割でき、無駄な推測を大幅に省けます。

---

## 五、第 2 歩：LVGL を繋いで針アニメーションを作る

> 📦 **本章の完全なコード**：[02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer) —— LVGL を繋ぎ、針アニメーション付きの半円スピードメーターを作ります。

点灯後、動くインターフェースを作りたくなり **LVGL**（組込みで人気のグラフィックライブラリ）を採用しました。接続方法は公式推奨の `espressif/esp_lvgl_port` コンポーネントで、LVGL のティック、独立タスク、ロック取得を引き受けてくれ、描画した画面をスクリーンへリフレッシュします。

> **LVGL** はオープンソースの組込み向けグラフィックライブラリで、ボタン、プログレスバー、アニメーションといった UI 要素を描画します。本プロジェクトでは、自前で描画コードを 1 行ずつ書く代わりに LVGL でスピードメーターやダッシュボードを作ります。

接続コード自体は短く、核心は RGB パネルを生成し（speedometer サンプルでは helloworld より 1 行多い `.num_fbs = 2`、これが後述のティア防止用ダブル framebuffer）、それを `esp_lvgl_port` に渡すだけです：

```c
const lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
lvgl_port_init(&lvgl_cfg);

const lvgl_port_display_cfg_t disp_cfg = {
    .panel_handle  = panel,
    .buffer_size   = LCD_H_RES * LCD_V_RES, /* 全面：direct mode のハード要件 */
    .hres          = LCD_H_RES, .vres = LCD_V_RES,
    .color_format  = LV_COLOR_FORMAT_RGB565,
    .flags = {
        .direct_mode = true,   /* パネルの framebuffer へ直接描画、コピーを 1 回省く */
        .buff_dma    = false,
        .buff_spiram = true,   /* 描画バッファを PSRAM に配置（← 落とし穴 1：要先に SPIRAM_USE_MALLOC を有効化）*/
        .swap_bytes  = false,  /* パラレル RGB パネル、バイト順のスワップはしない */
    },
};
const lvgl_port_display_rgb_cfg_t rgb_cfg = {
    .flags = {
        .bb_mode       = true,  /* bounce buffer 使用 -> on_bounce_frame_finish で同期 */
        .avoid_tearing = true,  /* フレーム境界で fb 切り替え -> ティア防止（本章末尾参照）*/
    },
};
lvgl_port_add_disp_rgb(&disp_cfg, &rgb_cfg);

/* 任意の lv_* 呼び出しは、まずこのロックを取得すること。esp_lvgl_port の描画タスクと衝突しないように。*/
lvgl_port_lock(0);
dashboard_create();   /* スピードメーター生成 + 針アニメーション起動 */
lvgl_port_unlock();
```

3 つの flag がこの部分の肝です：`direct_mode` は LVGL がパネル framebuffer へ直接描画するようにし（全面コピーを 1 回省く）、`avoid_tearing` は 2 つの fb をフレーム境界で切り替えてティアを防ぎ、`buff_spiram` は描画バッファを PSRAM に移します——これは無害に見えて、以下最大の落とし穴を引き起こします。

### 5.1 落とし穴 1（最も隠れた）：白画面 + ウォッチドッグリブート

接続して焼き込むと、スクリーンは 2 秒ほど黒くなった後**全面白**になり、その後動きません。この症状は前述の PCLK 高すぎによる白画面と**全く同じ**で、私はまたしてもタイミング調整に飛び込みそうになりました。

**幸い今回は先にシリアルログを見ました。** 重要な 1 行が見えました：

```
E task_wdt: CPU 0: taskLVGL
```

LVGL のタスクがウォッチドッグをトリガーし、システムにフリーズ判定されました。**これはソフトウェアのフリーズで、信号の問題ではありません。** コールスタックを追うと、LVGL が初めて全面描画する際、MB クラスの一時描画バッファを確保しようとしますが、LVGL のデフォルトは**内蔵の小さなメモリプールで、わずか 64KB**——1MB は 64KB に収まらず、何度も悪戦苦闘した末に描画が終わらず、タスクがフリーズして、ウォッチドッグが発火します。

面白いことに、私は確かに表示バッファを PSRAM に設定したのに、なぜメモリ不足と言われるのでしょう？ それは——**表示バッファ**（「リフレッシュ」用）と **LVGL 内部の描画用メモリプール**（「画面計算」用）は別物だからです。混同しないように。解法はスイッチ 2 つだけです：

```
CONFIG_LV_USE_CLIB_MALLOC=y    # LVGL をシステムの malloc に切替、あの 64KB の小さなプールを使わない
CONFIG_SPIRAM_USE_MALLOC=y     # システムの malloc が PSRAM から大きなブロックを取得できるようにする
```

> **ここにもう一つ致命的な認識があります：「白画面」でも、少なくとも 2 種類の全く異なる原因があります。** 1 つは RGB 信号/帯域の問題（前述の PCLK のケース）、もう 1 つはソフトウェアのフリーズで画面が描けないケース（これ）。**常にシリアルログで判別してから**、白画面を見たらすぐタイミングをいじらないように。

### 5.2 落とし穴 2、3：コンポーネントバージョンと IDF マクロの不一致

- **落とし穴 2（コンポーネントバージョンを揃える）**：`esp_lvgl_port` 2.8 は LVGL 9.3 で追加されたカラー定数を使っています。LVGL バージョンを `~9.2` に固定すると `RGB565_SWAPPED undeclared` が出ます。`^9.3` に直せば OK。
- **落とし穴 3（IDF マクロの不一致）**：新版 `esp_lvgl_port` は `SOC_LCDCAM_RGB_LCD_SUPPORTED` マクロをチェックしますが、このマクロは **IDF 5.3 で改名されました**。5.2.7 では旧名のままで、実行時に "This target does not support RGB" が出ます。解法は、トップレベル CMakeLists の `project()` の前に `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)` を 1 行追加することです。

### 5.3 「カクつき」と「画面ティア」は計算が遅いわけではない

スピードメーターを動かすと 2 つの新たな問題が——針の動きが**滑らかでない**、**ティア**する（画面中央にズレた横線が入る）。この 2 つは**「計算の速さ」とは無関係**です。

**まずカクつき。** このスクリーンの物理リフレッシュレートを計算しました：PCLK 16MHz ÷ 1 フレームあたりの総ピクセル数 ≒ **20Hz**。つまりこのスクリーンは 1 秒間に最大 20 回しか画面を再描画できず、ソフトウェアがいくら速くてもダメで、ハード天井です。だから「滑らかさ」はフレームレートの問題ではなく**アニメーションカーブ**の問題です。針が等速で端まで行って瞬時に反転すると、特に硬い印象になります。`ease-in-out`（両端で減速、中央で加速）に替えると、転換が自然になります。

```c
/* 270° スピードメーター：ROUND_INNER モード、135° から回転開始、底部に 90° のくぼみを残す。*/
lv_obj_t *scale = lv_scale_create(scr);
lv_obj_set_size(scale, 460, 460);
lv_scale_set_mode(scale, LV_SCALE_MODE_ROUND_INNER);
lv_scale_set_range(scale, 0, 120);
lv_scale_set_angle_range(scale, 270);
lv_scale_set_rotation(scale, 135);          /* 起始角度、くぼみの向きを決定 */
lv_scale_set_total_tick_count(scale, 25);   /* 5 km/h ごとに 1 目盛 */
lv_scale_set_major_tick_every(scale, 4);    /* 4 目盛ごとに主目盛 -> 0,20,...,120 */

/* アニメーションが每フレーム呼ばれる：針を v に向ける。数値読取は整数変化時のみ更新。*/
static void gauge_set_value(void *var, int32_t v) {
    gauge_ctx_t *g = (gauge_ctx_t *)var;
    lv_scale_set_line_needle_value(g->scale, g->needle, 150, v);  /* 針、長さ 150px */
    int vi = (int)v;
    if (vi != g->last_int) {                 /* 整数が変わらなければ label を更新せず、再描画を省く */
        g->last_int = vi;
        lv_snprintf(s_value_buf, sizeof(s_value_buf), "%03d", vi);
        lv_label_set_text(g->value_label, s_value_buf);
    }
}

/* 0 → 120 → 0、無限ループ。滑らかさの肝は最後の 1 行。*/
lv_anim_t a;
lv_anim_init(&a);
lv_anim_set_var(&a, &s_ctx);
lv_anim_set_exec_cb(&a, gauge_set_value);
lv_anim_set_values(&a, 0, 120);
lv_anim_set_duration(&a, 2500);                       /* 片道 2.5s */
lv_anim_set_playback_duration(&a, 2500);              /* 復路：0→120→0 */
lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out);    /* ← 両端で減速、転換が硬くならない */
lv_anim_set_repeat_count(&a, LV_ANIM_REPEAT_INFINITE);
lv_anim_start(&a);
```

鍵は `lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out)` の 1 行です。`playback_duration` はアニメーションが 120 に達すると自動的に 0 へ折り返しますが、折り返し瞬間、速度は本来ハードに反転します；`ease-in-out` は一旦 0 まで減速してから反転加速するので、肉眼ではほとんど方向転換が見えません。

**次にティア。** 原因は画面バッファを 1 つしか用意しておらず、DMA が外へ搬出し続ける中、LVGL が同時に新しい画面を書き込み、同期しないため「半新半旧」のフレームが搬出されることです。解法は**ダブルバッファ＋垂直同期切替**——2 つの画面を用意し、DMA は常に完全な方だけを搬出します。**注意：このスクリーンでは bounce buffer と呼ばれる小さなバッファを必ず保持する必要があります**（16MHz で供給不足による白画面を防ぐため）。つまり「ダブルバッファ＋ bounce の併用」で、公式サンプルのように bounce を無効化してはいけません。

> このスクリーンでは、**「滑らかさ」はイージングカーブ、「ティア防止」はダブルバッファ** で、どちらも計算の速さとは無関係です。

---

## 六、第 3 歩：車両テレメトリダッシュボードに仕上げる

> 📦 **本章の完全なコード**：[03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry) —— デザイン性のある 5 枚カードの車両テレメトリパネルに作り変えます。

最後にスピードメーターを、それらしい**車両テレメトリパネル**へ作り変えました——回転数、スロットル、水温、車速、電圧の 5 つのデータ。各カードには大きな数値、プログレスバー、min/max 目盛があり、数値が過負荷になると赤く変わります。データはランダムにシミュレートしていますが、動きは自然に見えるようにしています。

### 6.1 カードを組み立てる

各カードは**デフォルトスタイルを削除した `lv_obj` コンテナ**で、中にラベル、単位、大きな数値、プログレスバー、min/max 目盛を詰め込みます。座標はすべて直接固定値で書き、1px のボーダー＋単色でレイヤーを分けます（シャドウは使わない）。核心は次の通り（完全版は `lvgl_dashboard.c` の `make_card` 参照）：

```c
static void make_card(lv_obj_t *parent, int i) {
    const metric_cfg_t *c = &CFG[i];      /* ジオメトリ/範囲/危険閾値/色はすべて設定テーブルに */
    metric_t *m = &s_m[i];
    m->accent = lv_color_hex(c->accent_hex);

    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_remove_style_all(card);                       /* デフォルトスタイルをクリア、すべて自前で設定 */
    lv_obj_set_pos(card, c->x, c->y);                    /* 座標は固定、flex 自動レイアウトは使わない */
    lv_obj_set_size(card, c->w, c->h);
    lv_obj_set_style_bg_color(card, COL_CARD, 0);
    lv_obj_set_style_radius(card, 18, 0);
    lv_obj_set_style_border_color(card, COL_BORDER, 0);  /* 1px ボーダーでレイヤー分割、シャドウなし */
    lv_obj_set_style_border_width(card, 1, 0);

    lv_obj_t *lab = lv_label_create(card);
    lv_label_set_text(lab, c->label);
    lv_obj_align(lab, LV_ALIGN_TOP_LEFT, 0, 0);          /* ラベルは左上；単位も同様に右上へ */

    lv_obj_t *val = lv_label_create(card);
    lv_obj_set_style_text_font(val, &lv_font_montserrat_48, 0);  /* 大きな数値 */
    lv_obj_align(val, LV_ALIGN_TOP_LEFT, 0, c->value_y);
    m->value = val;

    /* プログレスバー：trough と indicator の 2 部分をそれぞれ色設定、危険時は indicator を赤に。*/
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

### 6.2 数値を「生きている」感じにする：等速ではなくイージングで近づく

最も直感的なやり方は「ランダムに新しい値を出し、表示を等速で追わせる」です。しかし等速追いでは目標到達瞬間に速度がゼロになり、機械的に見えます。私が使ったのは**イージング接近**です——各データは現在の表示値 `current` と目標 `target` を保持し、毎リフレッシュで差の 1/6 を追いかけます（指数減衰、近づくほど遅くなる）。約 1.2 秒ごとに現在値の周辺をランダムウォークして新目標を作ります。フルスケールで乱跳しないので、実車のデータらしく見えます：

```c
/* 30 回ごと（~1.2s）に目標を切替：現在値の周辺をウォーク、振れ幅 = レンジの 1/3。*/
if (tick % 30 == 0) {
    int span = (m->max - m->min) / 3;
    m->target = clampi(m->current + rnd_range(-span, span), m->min, m->max);
}
/* イージング接近：差の 1/6 を追いかける；差が小さすぎたら直接吸着させ、永遠に少し残らないように。*/
int diff = m->target - m->current;
if (diff > -6 && diff < 6) m->current = m->target;
else                       m->current += diff / 6;   /* ← この行が指数減衰 */

/* プログレスバーは每フレーム更新（「生きている」視覚効果）。危険時は indicator を赤に。*/
bool danger = in_danger(m);   /* RPM≥6800 / 水温≥105 / 電圧≤10.8 または ≥14.6 */
lv_bar_set_value(m->bar, m->current, LV_ANIM_OFF);
lv_obj_set_style_bg_color(m->bar, danger ? COL_DANGER : m->accent, LV_PART_INDICATOR);
```

針の `ease-in-out` と同じ道理——どちらも転換点で減速させます。`danger` 判定により、プログレスバーが過負荷時に赤く変わります。これがパネル上の「過負荷で赤変」エフェクトの正体です。

### 6.3 ついでの小さな最適化：変わらなければ再描画しない

40 ミリ秒ごとにリフレッシュしますが、連続 2 回とも同じ整数になることがよくあります（特に目標に近づいてほぼ停止した時）。毎回 `lv_label_set_text` を呼ぶと、文字列コピーと再描画マーク付けが走り、すべて無駄骨です。だから 1 行追加します——**表示テキストが本当に変わった時のみ更新**：

```c
/* 数値読取：フォーマットした文字列が本当に変わった時のみ set_text。*/
char buf[12];
fmt_scaled(m->current, m->scale, buf, sizeof(buf));
if (strcmp(buf, m->last_text) != 0) {
    strcpy(m->last_text, buf);             /* 記録して次回の比較に使う */
    lv_label_set_text(m->value, buf);      /* strdup + 再描画マーク、真に変化した時のみ発生 */
}
lv_obj_set_style_text_color(m->value, danger ? COL_DANGER : COL_VALUE, 0);
```

### 6.4 組込み UI の設計の割り切り

固定解像度の小スクリーンでは、**座標を直接固定で書く** 方が flex 自動レイアウトより手間が少なく予測しやすいです；カードには**シャドウを付けない**（LVGL のシャドウは 20Hz リフレッシュではやや重い）、ボーダーと単色でレイヤー分割すれば十分；電圧の小数第 1 位は「142 を 14.2 とする」整数スケールで表し、浮動小数点演算の山を省きます。整数スケールのやり方は、各指標のジオメトリ/範囲/危険閾値/色/scale をすべて 1 枚の設定テーブルに詰め込むことです：

```c
/* 設定テーブル、1 行 1 指標。座標/範囲/危険閾値/色/scale はすべて表中に、一括調整しやすい。*/
static const metric_cfg_t CFG[] = {
    /* label      unit    x   y    w   h  pad v_y  min  max  dHi  dLo init accent   sc big */
    { "ENGINE",  "RPM",  24, 84, 478,242, 28, 78,    0,8000,6800,  0, 850,0xFF5A3C, 1, 1 },
    { "BATTERY", "V",   688,346, 312,230, 24, 64,  100, 150, 146,108, 124,0xB08CFF,10, 0 },
    /*                                                                  ↑ scale=10：124 は 12.4V を意味 */
    /* ...残り 3 行も同様 */
};

/* 表示時に割り算で戻す：124 → "12.4"。全程整数、浮動小数点演算なし。*/
static void fmt_scaled(int32_t v, int32_t scale, char *buf, size_t n) {
    if (scale == 10) lv_snprintf(buf, n, "%d.%d", (int)(v / 10), (int)(v % 10));
    else             lv_snprintf(buf, n, "%d", (int)v);
}
```

`scale=10` は x10 で格納、`scale=1` は原値を格納し、イージング、危険判定、プログレスバーはすべてこの整数ベースで動きます。最後に文字列へフォーマットする瞬間にだけ小数ありの姿へ「翻訳」されます。

---

## 七、よくある問題のトラブルシュート（焦らず、原因はこの辺りに集中しています）

> 焦らないでください。問題の 90% はこの数カ所にあります。異常現象に直面したら**まずシリアルログを見て、まず物理パラメータを計算**してください。安易にコードを直さないこと。

**このスクリーンについて**

- 公式サンプル/ドキュメントはデフォルトで 800×480、**5B にそのまま流用すると黒背景＋右側の白い帯になります**。5B は **1024×600、ST7262、純 RGB 直駆動**で、SPI 初期化不要。
- バックライトは **CH422G** の EXIO2 経由。通常 GPIO でも PWM でもありません（**ON/OFF のみ、輝度調整不可**）。
- タッチチップ GT911（I²C アドレス 0x5D）は RTC、CH422G と同じ I²C を共有、アドレス設計に注意。本シリーズのサンプルは**まだタッチを繋いでいません**、今後の TODO。

**ビルド環境（Windows）**

- **Git Bash で `idf.py` を走らせないこと**、`MSYSTEM` を検出すると拒否します。PowerShell + EIM profile を使い、呼出前に `unset MSYSTEM`（または `$env:MSYSTEM=$null`）。
- シリアルポート占有で "port is busy" が出る場合、前回の monitor がきれいに終了していないことが多いです。残留がないか確認してから flash してください。
- `sdkconfig.defaults` を変えても反映されない？ IDF は既存の `sdkconfig` に defaults を自動では再マージしません。**sdkconfig を削除して defaults から再生成**させてください。

**スクリーン点灯**

- **PCLK はボード定義の 21MHz を写さず、PSRAM framebuffer 使用時は 16MHz から始める**、それでも白くなるなら 12MHz まで下げて試す。
- PSRAM を間違えないように：N16R8 は **octal**（`SPIRAM_MODE_OCT`）、quad ではない。
- パネル生成後に**忘れずに `esp_lcd_panel_init()` を 1 行追加**。
- GPIO0 は strapping ピン（起動瞬間は High である必要あり）なので注意。起動後に RGB データピンとして使うのは問題ありませんが、起動を Low に引っ張るような回路を接続しないでください。
- 色ズレはまず 2 種類を切り分けましょう——**白がシアンに = ピン順序**；**白がピンクに = RGB565 の Green チャンネル入力値**（Green は 6 bit の 0–63、純白は `31,63,31` と書く）。

**LVGL を動かす**

- **ほぼ必ず `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC` を有効化**する必要があります。さもないと LVGL の 64KB 内蔵メモリプールに全面描画が収まらず、症状は白画面＋ウォッチドッグリブート。
- コンポーネントバージョンは同じ世代で：`esp_lvgl_port` 2.8 には LVGL `^9.3` を組み合わせる。
- IDF 5.2 で新版コンポーネントを使う場合、トップレベル CMakeLists に `SOC_LCDCAM_RGB_LCD_SUPPORTED=1` を追加。
- **LVGL / esp_lvgl_port はバージョン間で API 名が変わる**ことがあります。記憶で書かず、実際のヘッダを読みましょう。

**滑らかさとティア**

- まずパネルの物理リフレッシュレートを計算（このスクリーンは約 20Hz）。これを下回る最適化の大半はアニメーション設計の問題。
- カクつきにはまず `ease-in-out` を試す、フレームレートを盛る前に。
- ティア = シングルバッファ＋同期なし。解法はダブル framebuffer + `avoid_tearing`、**かつ bounce buffer を保持**。

---

## 八、FAQ

**Q：Waveshare ESP32-S3-Touch-LCD-5B の解像度は本当はいくつ？ 800×480？ 1024×600？**
A：5B は **1024×600** です。Waveshare 公式ドキュメントは 5 インチシリーズ全体を「800×480 または 1024×600」と大雑把に書き、5B 単独の記載がありません。検証方法：800×480 の信号で焼き込むと、スクリーンは黒背景＋右側の白い帯になります。パネルが信号より広いことを示し、1024×600 だと分かります。公式サンプルの 800×480 をそのまま流用しないでください。

**Q：スクリーンが一面に白くなるのはどうして？**
A：まずシリアルログで 2 種類の白画面を切り分けます。① watchdog エラーがない → 大半は RGB 信号の供給不足、PCLK が 21MHz と高すぎるので 16MHz まで下げる。② シリアルに `task_wdt: taskLVGL` がある → LVGL メモリプール不足によるフリーズ、`LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC` を有効化。

**Q：バックライトの輝度は調整できますか？ なぜ PWM ピンが見つからないのですか？**
A：できません。バックライトは CH422G IO エクスパンダの EXIO2 に接続され、ON/OFF の 2 状態のみで PWM ではありません。輝度を調整するには基板をハード改修（可変昇降圧を追加）する必要があり、ソフトウェアのレベルでは不可能です。

**Q：このスクリーンのリフレッシュレートは？ なぜ針がカクカクするのですか？**
A：約 **20Hz**（PCLK 16MHz ÷ 1 フレームあたりの総ピクセル数）。これは物理天井で、ソフトウェアがいくら速くても突破できません。カクつきの大半はフレームレートではなくアニメーションカーブが硬すぎるのが原因——針アニメーションをリニアから `ease-in-out` に替えると、転換点で自然に減速し、すぐに滑らかになります。

**Q：Arduino IDE で点灯できますか？ なぜ ESP-IDF を使うのですか？**
A：理論上は可能（Arduino-ESP32 の下部層も ESP-IDF）ですが、RGB 直駆動 + PSRAM framebuffer + LVGL の組み合わせは Arduino では sdkconfig 調整が厄介で、PCLK、PSRAM モード、メモリプールといったスイッチは ESP-IDF の方が圧倒的に制御しやすいです。本チュートリアルは ESP-IDF ベースです。

**Q：LVGL を焼き込むと白画面＋ウォッチドッグリブートする、どうすれば？**
A：八割は LVGL 内蔵の 64KB メモリプールに全面描画が収まらないのが原因です。sdkconfig で 2 つを有効化：`CONFIG_LV_USE_CLIB_MALLOC=y`（LVGL をシステム malloc に切替）と `CONFIG_SPIRAM_USE_MALLOC=y`（malloc が PSRAM から大きなブロックを取得できるように）。ESP32-S3 + PSRAM + 大スクリーンの組み合わせではほぼ必須です。

**Q：PSRAM は quad と octal のどちら？ 間違えるとどうなる？**
A：N16R8 は **octal**（`SPIRAM_MODE_OCT`）です。quad に設定すると帯域不足になり、症状は PCLK が少し上がると乱れ/白画面、または動作が不安定になります。

**Q：IDF 5.2.7 で "This target does not support RGB" が出る、どうすれば？**
A：新版 esp_lvgl_port は `SOC_LCDCAM_RGB_LCD_SUPPORTED` マクロをチェックしますが、これは IDF 5.3 で改名され、5.2.7 では旧名のままです。トップレベル CMakeLists の `project()` の前に `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)` を 1 行追加してください。

---

## 九、応用の広げ方

点灯は出発点で、この基板ではまだいろいろ遊べます：

- **タッチを繋ぐ**：GT911 はすでに I²C 上に（GPIO8/9）におり、ドライバを追加するだけでボタンインタラクションが作れます。
- **SD カードからリソースを読む**：オンボード SD カードスロット（SPI）で、画像やフォントをロードし、Flash にリソースを詰め込む必要がなくなります。
- **CAN バスに接続**：オンボード TJA1051 と ESP-IDF の TWAI ドライバを組み合わせ、本当の OBD 車況モニタを作れば、ダッシュボードの数値はシミュレート値ではなくなります。
- **RS485 を使う**：SP3485 トランシーバで工業センサー/Modbus デバイスに接続。
- **RTC で電源喪失時も時刻保持**：PCF85063 も同じ I²C 上にあり、実タイムスタンプ付きのデータロガーが作れます。

---

## 十、参考資料

**公式データシート／製品ページ**

- [ESP32-S3 Datasheet（Espressif 公式）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP32-S3-WROOM-1 モジュール Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)
- [ESP32-S3 製品ページ](https://www.espressif.com/en/products/socs/esp32-s3)
- [Waveshare ESP32-S3-Touch-LCD-5B Wiki](https://docs.waveshare.net/ESP32-S3-Touch-LCD-5/?variant=ESP32-S3-LCD-5B-touch)

**オープンソースライブラリ／フレームワーク**

- [ESP-IDF 公式ドキュメント](https://docs.espressif.com/projects/esp-idf/)（RGB LCD Panel、PSRAM 設定、I²C Master ドライバ）
- [espressif/esp_lvgl_port（GitHub）](https://github.com/espressif/esp_lvgl_port)
- [LVGL 公式ドキュメント](https://docs.lvgl.io/)（scale ウィジェット、anim アニメーション、bar プログレスバー）

**本プロジェクトのコード**

- 完全なコード、各落とし穴の再現過程、最終設定は GitHub に置いており、各サンプルディレクトリに docs が同梱されています：
  - [本プロジェクトの完全なディレクトリ（3 サンプル収録）](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)
  - [01 HelloWorld —— スクリーン点灯](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
  - [02 Speedometer —— スピードメーター](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
  - [03 VehicleTelemetry —— 車両テレメトリダッシュボード](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

---

## 最後に

振り返ると、道のりは実質 3 層でした——**スクリーン点灯 → LVGL 接続 → インターフェース完成**。各層に固有の落とし穴がありますが、落とし穴同士は似通っていることが多く（白画面 2 種類、色ズレ 2 種類）、最も無駄骨を生むのは落とし穴を見誤ることです。

後進に一言残すとしたら、おそらくこれです——私がこの 3 つのサンプルで何度も転んで初めて学んだことです：

> **異常現象に直面したら、まずシリアルログを見て、まず物理パラメータを計算してください。安易にコードを直さないこと。** 公式サンプルの解像度の落とし穴、PCLK の白画面、LVGL メモリの白画面は、どれも「スクリーンが壊れた」ように見えますが、実態はそれぞれドキュメントの誤り、ハードウェア帯域、ソフトウェアのフリーズです。方向を間違えると一晩徹夜が無駄になります。
