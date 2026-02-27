---
title: "ESP32で8ビットパラレルバスを使用してILI9341ディスプレイを駆動する"
boardId: esp32
moduleId: ili9341
category: esp32
date: 2026-02-27
intro: "ESP32を使用して8ビットパラレルバスでILI9341ディスプレイを駆動する方法を詳しく紹介します。SPIシリアル駆動と比較して、非常に高いリフレッシュレートを提供し、動的なコンテンツの表示に最適です。"
image: "https://img.lingshunlab.com/image-20260204140130062.png"
---

この記事では、ESP32を使用して**8ビットパラレルバス（8-bit Parallel）**経由でILI9341ディスプレイを駆動する方法を詳しく紹介します。一般的なSPIシリアル駆動と比較して、パラレルモードは非常に高いリフレッシュレートを提供でき、動的なコンテンツの表示に最適です。

## 開発環境

OS: MacOS

Arduino IDE Version: 2.3.7

esp32 Version: 3.3.5

TFT_eSPI Version: 2.5.43



## BOM

ESP32 x1

2.4 inch TFT display x1

ジャンパーワイヤー xN



## 接続方法

| TFT Pin          | **ESP32 Pin** | **機能説明**                      |
| ---------------- | ------------- | --------------------------------- |
| **VCC (3V3/5V)** | **3V3 / VIN** | ディスプレイ電源（まず3.3Vを試してください） |
| **GND**          | **GND**       | 共通グラウンド                    |
| **LCD_D0**       | **GPIO 26**   | データビット0                     |
| **LCD_D1**       | **GPIO 25**   | データビット1                     |
| **LCD_D2**       | **GPIO 19**   | データビット2                     |
| **LCD_D3**       | **GPIO 18**   | データビット3                     |
| **LCD_D4**       | **GPIO 5**    | データビット4                     |
| **LCD_D5**       | **GPIO 21**   | データビット5                     |
| **LCD_D6**       | **GPIO 22**   | データビット6                     |
| **LCD_D7**       | **GPIO 23**   | データビット7                     |
| **LCD_CS**       | **GPIO 32**   | チップ選択（Chip Select）         |
| **LCD_RTS**      | **GPIO 33**   | リセット（Reset）                 |
| **LCD_RS (DC)**  | **GPIO 14**   | データ/コマンド選択（Register Select） |
| **LCD_WR**       | **GPIO 27**   | 書き込み制御（Write Control）     |
| **LCD_RD**       | **GPIO 2**    | 読み取り制御（ID読み取りが不要な場合は3.3Vに接続可） |




## 必要なライブラリ

### Arduino IDE Boards Manager：esp32

Espressif Systemsのesp32ライブラリをインストールする必要があります。ここでは最新バージョンをインストールしています。

### Arduino IDE Library Manager：TFT_eSPI

TFT_eSPIライブラリをインストールする必要があります。



## TFT_eSPI設定ファイル「User_Setup.h」

TFT_eSPIはESP32でディスプレイを駆動するための優れたライブラリです。ただし、このライブラリのピン定義、ボード定義、ディスプレイ定義はすべてUser_Setup.hファイルで行われるため、このファイルを変更することが非常に重要です。

このファイルの場所：

Documents > Arduino > libraries > TFT_eSPI > User_Setup.h

**操作：** ファイルを開き、元の内容をクリアして、次のコードをコピーして保存します：

```c++
// =========================================================================
//   User_Setup.h - Display driver configuration file for TFT_eSPI library
//   User_Setup.h - TFT_eSPIライブラリ用ディスプレイドライバ設定ファイル
//
//   Hardware: ESP32 (No PSRAM or not using GPIO 16/17)
//   ハードウェア: ESP32 (PSRAMなし、またはGPIO 16/17未使用)
//
//   Driver: ILI9341 (8-bit parallel mode)
//   ドライバ: ILI9341 (8ビットパラレルモード)
// =========================================================================

// -------------------------------------------------------------------------
// 1. Driver Type Definition
//    ドライバタイプの定義
// -------------------------------------------------------------------------
#define ILI9341_DRIVER       // Generic ILI9341 Driver (汎用ILI9341ドライバ)

// -------------------------------------------------------------------------
// 2. Color Order Definition
//    カラーオーダーの定義
// -------------------------------------------------------------------------
// If colors are inverted (e.g., red becomes blue), change this.
// 色が反転している場合（例：赤が青になる）、これを変更してください。
#define TFT_RGB_ORDER TFT_BGR  // Most ILI9341 screens use BGR order (ほとんどのILI9341ディスプレイはBGR順序を使用)
// #define TFT_RGB_ORDER TFT_RGB

// -------------------------------------------------------------------------
// 3. Screen Resolution
//    画面解像度の定義
// -------------------------------------------------------------------------
#define TFT_WIDTH  240
#define TFT_HEIGHT 320

// -------------------------------------------------------------------------
// 4. Interface Configuration (Critical)
//    インターフェース設定（重要）
// -------------------------------------------------------------------------
#define ESP32_PARALLEL       // Enable ESP32 parallel mode (ESP32パラレルモードを有効化)
#define TFT_PARALLEL_8_BIT   // Use 8-bit parallel bus (8ビットパラレルバスを使用)

// -------------------------------------------------------------------------
// 5. Pin Definitions
//    ピン定義
// -------------------------------------------------------------------------

// --- Control Pins (制御ピン) ---
// Optimization: CS/RST moved to GPIO 32+, keeping low GPIOs for data bus and WR.
// 最適化案：CS/RSTをGPIO 32+に移動し、低いGPIOをデータバスとWRに残します。

#define TFT_CS   32  // Chip Select (チップ選択)
#define TFT_RST  33  // Reset (リセット)

// Data/Command selection - Must be in GPIO 0-31（or RS）
// データ/コマンド選択 - GPIO 0-31（またはRS）である必要があります
#define TFT_DC   14

// Write signal - ★ Critical pin, must be in GPIO 0-31 and keep connections short
// 書き込み信号 - ★重要なピン、GPIO 0-31内で接続を短くする必要があります
#define TFT_WR   27

// Read signal - If not reading screen data, can connect to 3.3V, but must be defined in library
// 読み取り信号 - 画面データを読み取らない場合は3.3Vに接続できますが、ライブラリで定義する必要があります
#define TFT_RD    2

// --- Data Bus Pins D0 - D7 (データバスピン) ---
// Must be within GPIO 0-31 range.
// GPIO 0-31の範囲内である必要があります。
// Avoided GPIO 16, 17 (PSRAM/Flash) and 12 (Strap).
// GPIO 16、17（PSRAM/Flash）と12（Strap）を避けました。

#define TFT_D0   26
#define TFT_D1   25
#define TFT_D2   19
#define TFT_D3   18
#define TFT_D4    5  // Note: GPIO 5 is a Strap pin, ensure screen does not pull it high during power-up
                     // 注意：GPIO 5はStrapピンです。起動時に画面がこれをハイに引き上げないようにしてください
#define TFT_D5   21
#define TFT_D6   22
#define TFT_D7   23

// -------------------------------------------------------------------------
// 6. Backlight Control (Optional)
//    バックライト制御（オプション）
// -------------------------------------------------------------------------
// If your screen has a BLK or LED pin, connect it to an ESP32 pin and define it here.
// 画面にBLKまたはLEDピンがある場合は、ESP32のピンに接続してここで定義してください。
// #define TFT_BL   4            // Example: Connected to GPIO 4 (例：GPIO 4に接続)
// #define TFT_BACKLIGHT_ON HIGH // High logic level turns on backlight (ハイレベルでバックライトON)

// -------------------------------------------------------------------------
// 7. Font Loading
//    フォントの読み込み
// -------------------------------------------------------------------------
// Enable as needed; enabling more fonts consumes more Flash memory.
// 必要に応じて有効にしてください。有効にするほどフラッシュメモリを消費します。

#define LOAD_GLCD   // Font 1. Original Glcd font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts. Include access to the 48 Adafruit_GFX free fonts FF1 to FF48

#define SMOOTH_FONT // Enable smooth font loading (スムーズフォント読み込みを有効化)

// -------------------------------------------------------------------------
// 8. Other Settings
//    その他の設定
// -------------------------------------------------------------------------
// In parallel mode, SPI frequency is usually ignored as speed is determined by CPU register write speed.
// Kept here for compatibility.
// パラレルモードでは、SPI周波数設定は通常無視されます。速度はCPUレジスタ書き込み速度で決まるためです。
// 互換性のためにここに残しています。
#define SPI_FREQUENCY       27000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY  2500000

// --- Touch Screen Settings (タッチスクリーン設定) ---
// If you use XPT2046 touch function.
// Parallel screens usually have a separate SPI interface for touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).
// XPT2046タッチ機能を使用する場合。
// パラレル画面のタッチは通常、独立したSPIインターフェース（T_CLK、T_CS、T_DIN、T_DO、T_IRQ）です。

// If using touch, uncomment below and set pins (can use VSPI default pins).
// タッチを使用する場合、以下のコメントを外してピンを設定してください（VSPIデフォルトピンを使用可能）。

// #define TOUCH_CS 22
// WARNING: You used TFT_D6 on GPIO 22 above. If using touch, find another pin or use SoftSPI.
// 警告：上記でTFT_D6にGPIO 22を使用しました。タッチを使用する場合は、別のピンを見つけるかソフトウェアSPIを使用してください。
```



## サンプルプログラムを開く

次のパスからサンプルプログラムを開きます。このプログラムはテストに使用できます：

Arduino IDE：File -> Examples -> TFT_eSPI -> 320 x 240 -> TFT_graphicstest_one_lib



## プログラムのアップロード - コンパイルエラーの問題

ESP32ボードライブラリのバージョンが**3.0.0以上**に更新されている場合、TFT_eSPIをコンパイルする際に次のエラーが発生する可能性が非常に高いです：

```tex
In file included from /Users/shawn/Documents/Arduino/libraries/TFT_eSPI/TFT_eSPI.cpp:24:

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c: In member function 'uint8_t TFT_eSPI::readByte()':

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c:113:9: error: 'gpio_input_get' was not declared in this scope; did you mean 'gpio_num_t'?
113 |   reg = gpio_input_get(); // Read three times to allow for bus access time
|         ^~~~~~~~~~~~~~
|         gpio_num_t
exit status 1

Compilation error: exit status 1
```



`error: 'gpio_input_get' was not declared in this scope`

### エラー原因の分析

`gpio_input_get()` は、ESP32の初期の低レベル開発フレームワーク（ESP-IDF）のマクロまたは関数です。最近リリースされた**ESP32 Arduino Core 3.0.x**バージョンでは、Espressifが低レベルAPIを大幅に再構築し、多くの古い低レベル関数を削除または変更したため、`TFT_eSPI`ライブラリがこの関数を呼び出すときに定義が見つからず、エラーが発生します。

ダウングレードで修正できます。例えば、esp32ライブラリを2.0.xにダウングレードすれば、最も簡単で便利です。ただし、修正済みのTFT_eSPIライブラリを使用する別の方法を提供します：

このファイルを見つけて開きます。

Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c

コードの先頭に次のマクロ定義コードを追加し、変更したファイルを保存します：

```c++
#if !defined(gpio_input_get)
  #define gpio_input_get() GPIO.in
#endif
```



## 再度プログラムをアップロード - 画面ミラー反転の問題

この時点で、コンパイルは成功し、ボードに正常にアップロードされ、画面も点灯しました。しかし、まだ喜ぶのは早いです。よく観察すると、画面のテキストがミラー反転していることがわかります。

サンプルプログラムで102行目あたりを変更します。

```
void loop(void) {
  for (uint8_t rotation = 4; rotation < 8; rotation++) {
    tft.setRotation(rotation);
    testText();
    delay(2000);
  }
}
```



## 最終プログラムのアップロード

この時点で、表示は正常です。おめでとうございます。この2.4インチTFTディスプレイ（ILI9341）の点灯に成功しました。



## よくある問題と解決策 (FAQ)

開発中に最もよく遭遇する問題と解決策を以下にまとめました。

### Q1: 画面が白く光るだけで何も表示されない？

- **A1**: 90%はパラレルモードが有効になっていません。User_Setup.hで#define ESP32_PARALLELがコメント解除されているか再度確認してください。
- **A2**: TFT_RST (GPIO 33) の接触が良好か確認してください。

### Q2: 表示色がおかしい、赤が青になっている？

- **A**: これはRGB順序の定義問題です。User_Setup.hで#define TFT_RGB_ORDER TFT_RGBをTFT_BGRに変更してください（またはその逆）。

### Q3: この設定はタッチ機能（Touch）をサポートしていますか？

- **A**: この記事ではディスプレイドライバのみを設定しています。ILI9341ディスプレイには通常XPT2046タッチチップが搭載されており、これは独立したSPIインターフェースを使用します。タッチピン（T_CLK、T_CS、T_DIN、T_DO、T_IRQ）を別途接続し、User_Setup.hでTOUCH_CSのコメントを解除する必要があります。**警告**：タッチはSPIプロトコルを使用するため、パラレルデータラインD0-D7とピンを共有することはできません。

### Q4: VSPI/HSPIを直接使用しないのはなぜですか？

- **A**: パラレル駆動（8-bit Parallel）の理論上のリフレッシュ速度はSPIの数倍であり、高フレームレートを必要とするUIインターフェースやレトロゲームエミュレータの開発に適しています。
