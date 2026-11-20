---
title: "ESP32-S3 で EPD037A02（JD7601）6 色電子ペーパーを動かす：Hello、英語の時間割、写真の 3 画面デモ（SPI + Arduino）"
boardId: esp32s3
moduleId: display/epd-3inch7-epd037a02-jd7601
category: esp32
date: 2026-11-20
intro: "ESP32-S3 と Adafruit GFX で EPD037A02 6 色電子ペーパーを駆動します。SPI 配線、Arduino の設定、Hello・英語の時間割・写真の 3 画面を表示する完全なコードを掲載。Arduino での書き込み経験があり、6 色電子ペーパーの駆動や写真変換を学びたい方向けです。"
image: "https://img.lingflux.com/2026/11/ff03861dd789ec83465baba962075e98.jpg"
---

難易度：⭐⭐（Arduino での書き込み経験があれば OK）<br>
所要時間：初回は配線、ライブラリのインストール、書き込みまで約 30 分（目安で、計測はしていません）。3 画面の再生には約 1～1.5 分（各画面の全リフレッシュが 15～25 秒、2 回の 3 秒停止を含む）。<br>
検証環境：Arduino IDE 2.3.8；esp32 Arduino Core 3.3.10；Adafruit GFX Library 1.13.0

> **ひとことで**：ESP32-S3、SPI、Adafruit GFX を使い、EPD037A02 6 色電子ペーパーに Hello、英語の時間割、写真を順番に表示します。

## クイックスタート

- [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601) から `EPD_3in7_Showcase_JD7601` フォルダー全体をダウンロードします（LingShunLAB リポジトリの `Handbook/Arduino/ESP32-S3/` 配下にあり、リポジトリ全体を clone するか ZIP でダウンロードできます）。メインの `.ino`、ドライバーの `.h/.cpp`、`photo_data.h` はすべてこのフォルダーに入れ、フォルダー名はメイン `.ino` のファイル名と一致させてください。
- 配線：BUSY、RST、DC、CS、MOSI、SCK をそれぞれ GPIO7、8、9、10、11、12 に接続します。VDD は 3.3 V、GND は開発ボードと共通にします。
- esp32 Arduino Core 3.3.10、Adafruit GFX Library 1.13.0、依存ライブラリの Adafruit BusIO 1.17.4 をインストールします。
- ボードに `ESP32S3 Dev Module` を選んでコンパイル・書き込みを行い、ボーレート 115200 のシリアルモニターを開きます。
- `HOLD_MS` のデフォルトは 3000 ms です。各画面のリフレッシュ完了後に追加で待つ時間で、画面切り替えの間隔ではありません。

## はじめに

ESP32-S3 で電子ペーパーのデモカードを作りたいと思いました。最初に Hello、次に英語の時間割を表示し、最後は写真で止まる構成です。

手元にある OSPTEK EPD037A02 は、480×720 の 6 色 SPI ディスプレイです。GxEPD2 にはこのパネル用のドライバーがなかったため、JD7601 の SPI タイミングとフレームフォーマットだけを担当するパネルドライバーを自作しました。文字とグラフィックには Adafruit GFX を使います。本記事では、配線、ライブラリ設定、3 画面表示の完全なコードを紹介します。

## 完成イメージ

プログラムは Hello → 英語の時間割 → 写真の順に 1 回だけ再生します。最初の 2 画面はリフレッシュ完了後にそれぞれ 3000 ms 停止し、最後は写真のままになります。`loop()` で再度画面を更新することはありません。

![](https://img.lingflux.com/2026/11/dc08d160b6bc55bc5a237bcadf4abc9f.jpg)



## 部品の説明
### EPD037A02 6 色電子ペーパー

EPD037A02 は OSPTEK の 3.7 インチ 6 色電子ペーパーモジュールです。電子ペーパーは環境光で発色し、電源を切っても表示が残ります。この例では、文字、6 色のカラーブロック、時間割、変換済みの写真を表示します。

表示色は黒、白、黄、赤、青、緑の 6 色だけで、階調はありません。写真の中間色は異なる色のピクセルを混在させて再現するため、JPG をそのままパネルへ送ることはできません。事前にパネルのフレームフォーマットへ変換する必要があります。

| 項目 | 仕様 |
| --- | --- |
| 型番 | EPD037A02 |
| サイズと解像度 | 3.7 インチ、480×720 |
| 表示色 | 黒、白、黄、赤、青、緑 |
| ピクセルフォーマット | 4 bit/ピクセル、1 バイトに 2 ピクセル |
| インターフェース | 4 線式 SPI、1×8P 2.54 mm ピンヘッダー |
| 全リフレッシュ時間 | 約 15～25 秒 |
| 電源 | 3.3 V |

このパネルをデモに使うのは、1 枚で文字、グラフィック、6 色写真を試せるからです。一方、リフレッシュが遅いため、アニメーションには向きません。

## 部品リスト

| 部品 | 数量 | 備考 |
| --- | --- | --- |
| ESP32-S3 開発ボード | 1 | この例では `ESP32S3 Dev Module` を選択 |
| EPD037A02 モジュールと SPI 変換基板 | 1 | 480×720 6 色電子ペーパー |
| 2.54 mm ジャンパーワイヤー | 8 本 | 信号線 6 本、電源 1 本、GND 1 本 |
| USB データケーブル | 1 | 給電、書き込み、シリアル確認用 |

### ピンの説明

| パネル側ピン | 方向 | 役割 |
| --- | --- | --- |
| BUSY | パネル → ESP32-S3 | High がアイドル、Low がビジー |
| CS | ESP32-S3 → パネル | チップセレクト。Low アクティブで、プログラムから手動制御 |
| DC | ESP32-S3 → パネル | Low でコマンド、High でデータを送信 |
| RST | ESP32-S3 → パネル | リセット。Low アクティブ |
| SDA / MOSI | ESP32-S3 → パネル | SPI データ |
| CLK / SCK | ESP32-S3 → パネル | SPI クロック |
| VDD | 電源 | 3.3 V のみ接続可能 |
| GND | 電源 | 開発ボードと共通に接続 |

このパネルはデータを受信するだけで返さないため、MISO は不要です。変換基板上の BS0 は 10 kΩ の抵抗で GND に接続され、4 線式 SPI モードに固定されています。このモードではコマンドとデータを DC で区別するため、DC は省略できません。

## 配線

開発ボードの電源を切ってから、下表のとおり配線します。

| パネル側ピン | ESP32-S3 | 用途 |
| --- | --- | --- |
| BUSY | GPIO7 | パネルのビジー状態を読み取る |
| CS | GPIO10 | 手動チップセレクト |
| DC | GPIO9 | コマンドとデータの区別 |
| RST | GPIO8 | パネルのリセット |
| SDA / MOSI | GPIO11 | SPI データ |
| CLK / SCK | GPIO12 | SPI クロック |
| VDD | 3.3 V | モジュールへの給電 |
| GND | GND | GND の共通化 |

**VDD は 3.3 V のみで、5 V は接続しないでください。** 配線後は 1 本ずつ確認し、特に SDA と CLK が逆になっていないかチェックします。

配線が完了したら、次の手順を実行します。

1. USB で開発ボードを接続し、Arduino IDE で `ESP32S3 Dev Module` と対応するポートを選択します。
2. 完全なサンプルを開き、コンパイルして書き込みます。
3. シリアルモニターを開き、ボーレートを 115200 に設定します。最初のログが表示されない場合は、開発ボードの RESET ボタンを押してプログラムを再実行してください。再生は 1 回だけなので、モニターを開くのが遅れると最初の出力を見逃します。
4. シリアルには、フレームバッファー情報、パネル初期化完了、2 回の「リフレッシュ完了」（写真画面ではリフレッシュ時間を出力しません）、最後に `Done. Last picture stays on screen.` が順に表示されます。同時にパネルにも 3 画面が順番に表示されます。両方を確認できれば正常動作です。

## 必要なライブラリ

Arduino IDE の「ボードマネージャー」で `esp32` を検索し、Espressif Systems の esp32 Arduino Core をインストールします。本記事では 3.3.10 を使用します。

次に「ライブラリマネージャー」で以下のライブラリを検索してインストールします。Adafruit GFX のインストール時に依存関係のインストールを求められたら、すべてインストールを選んでください。Adafruit BusIO も一緒に導入されます。

| ライブラリ名 | 検証バージョン | 入手先 |
| --- | --- | --- |
| Adafruit GFX Library | 1.13.0 | [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library) |
| Adafruit BusIO | 1.17.4 | [Adafruit_BusIO](https://github.com/adafruit/Adafruit_BusIO) |
| SPI | esp32 Core 3.3.10 に同梱 | [arduino-esp32](https://github.com/espressif/arduino-esp32) に付属。別途インストール不要 |
| EPD037A02_GFX | バージョン表記なし | 本プロジェクトに付属。メイン `.ino` と同じディレクトリーに置き、ライブラリディレクトリーへのコピーは不要 |

Adafruit GFX は文字とグラフィックの描画を担当します。`EPD037A02_GFX` はパネルの初期化、SPI 転送、6 色エンコード、リフレッシュを担当します。パネルによってコマンドが異なるため、この層を別の電子ペーパー用ライブラリでそのまま置き換えることはできません。

## 完全なコード

サンプルのソースコードは [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601) にあります。フォルダーとメインプログラムのファイル名はどちらも `EPD_3in7_Showcase_JD7601` で、Arduino IDE で開くにはこの 2 つを一致させる必要があります。主なファイルは次のとおりです。

```text
EPD_3in7_Showcase_JD7601/
├── EPD_3in7_Showcase_JD7601.ino
├── EPD037A02_GFX.h
├── EPD037A02_GFX.cpp
├── photo_data.h
└── tool/
    ├── epd_photo.py                  # 写真変換スクリプト
    └── 02-driver-dog-car-480x720.png # サンプル写真の元画像
```

最初の 3 ファイルのコードを以下に掲載します。`photo_data.h` は 1 万行を超えるため省略します。リポジトリからダウンロードしてください。これがないとコンパイルできません。

中身は `tool/02-driver-dog-car-480x720.png` から変換した、172800 バイトの `photo_driver` 配列です。PNG ファイルそのものではなく、変換済みのパネルフレームが入っています。

以下のコードはリポジトリのソースと同じロジックで、コメントの一部だけを調整しています。正本はリポジトリです。

### メインプログラム EPD_3in7_Showcase_JD7601.ino

```cpp
/*
 * EPD_3in7_Showcase — Hello + 英語の時間割 + 写真 1 枚
 * パネル：OSPTEK 3.7" E6、480×720、JD7601
 * マイコン：ESP32-S3
 *
 * 初心者の方はこのファイルだけを変更すれば OK。フォントは Adafruit GFX 付属のものを使うので、自作のフォントデータは不要です。
 * インストール：Arduino IDE のライブラリマネージャーで Adafruit GFX Library を検索。
 * 開き方：Showcase フォルダー全体をダウンロードしてからこの .ino を開き、メインファイルだけをコピーしないでください。
 */

#include "EPD037A02_GFX.h"
#include "photo_data.h"

// ピンの順序：CS、DC、RST、BUSY、SCK、MOSI。電源は 3.3V のみ。
EPD037A02_GFX epd(10, 9, 8, 7, 12, 11);
#define HOLD_MS 3000

// 内蔵 5×7 フォントの y 座標は文字の上端。1 文字は 6×8 ピクセル。
void text(const char *s, int x, int y, uint8_t size, uint8_t color) {
  epd.setFont();                 // GFX 付属フォントを使用。別途 setFont(フォント) は不要
  epd.setTextSize(size);
  epd.setTextColor(color);
  epd.setCursor(x, y);
  epd.print(s);
}

void textCenter(const char *s, int y, uint8_t size, uint8_t color) {
  int w = strlen(s) * 6 * size;
  text(s, (480 - w) / 2, y, size, color);
}

void drawHello() {
  epd.fillScreen(EPD_WHITE);
  epd.drawRect(0, 0, 480, 720, EPD_BLACK);
  textCenter("HELLO", 65, 9, EPD_BLACK);
  textCenter("WORLD", 150, 9, EPD_RED);
  epd.fillRect(40, 245, 400, 4, EPD_BLACK);

  // 6 つのカラーブロックで、6 色マッピングと画面の向きも確認する。
  const uint8_t colors[6] = {
    EPD_BLACK, EPD_WHITE, EPD_YELLOW, EPD_RED, EPD_BLUE, EPD_GREEN
  };
  const char *labels[6] = { "K", "W", "Y", "R", "B", "G" };
  for (int i = 0; i < 6; i++) {
    int x = 16 + i * 76;
    epd.fillRect(x, 295, 68, 110, colors[i]);
    epd.drawRect(x, 295, 68, 110, EPD_BLACK);
    text(labels[i], x + 22, 430, 4, EPD_BLACK);
  }
  textCenter("3.7INCH 480X720", 525, 4, EPD_BLACK);
  textCenter("E6 6-COLOR EPD", 570, 4, EPD_BLACK);
  textCenter("ESP32-S3 OK", 640, 4, EPD_BLUE);
}

// 時間割の内容を変更する場合は、ここ数行だけを編集する。
const char *subjects[6] = {
  "MATH", "CHINESE", "ENGLISH", "PHYSICS", "CHEMISTRY", "STUDY HALL"
};
const char *rooms[6] = {
  "ROOM 302", "ROOM 302", "AUDIO LAB", "PHYS LAB", "CHEM LAB", "ROOM 302"
};
const char *times[6] = { "08:00", "08:55", "NOW", "11:05", "14:00", "14:55" };
const uint8_t bars[6] = {
  EPD_BLUE, EPD_RED, EPD_RED, EPD_BLACK, EPD_YELLOW, EPD_WHITE
};

void drawAgenda() {
  epd.fillScreen(EPD_WHITE);
  epd.fillRect(0, 0, 480, 100, EPD_BLACK);
  text("MON - NOV 9", 24, 20, 4, EPD_WHITE);
  text("WEEK 12 - 6 CLASSES", 24, 65, 2, EPD_YELLOW);

  for (int i = 0; i < 6; i++) {
    int y = 115 + i * 92;
    bool now = (i == 2);
    epd.fillRoundRect(18, y, 444, 80, 5, now ? EPD_RED : EPD_WHITE);
    if (!now) epd.drawRoundRect(18, y, 444, 80, 5, EPD_BLACK);
    if (bars[i] != EPD_WHITE) epd.fillRect(20, y + 2, 9, 76, bars[i]);

    uint8_t fg = now ? EPD_WHITE : EPD_BLACK;
    text(subjects[i], 45, y + 12, 3, fg);
    text(rooms[i], 45, y + 47, 2, fg);
    text(times[i], 365, y + 25, 2, fg);
  }
  text("NEXT 11:05 PHYSICS", 20, 688, 2, EPD_BLACK);
}

bool showScreen(uint8_t index) {
  switch (index) {
    case 0: drawHello();  return epd.display();
    case 1: drawAgenda(); return epd.display();
    case 2: return epd.displayRawFrame(photo_driver, PHOTO_DRIVER_BYTES);
    default: return false;
  }
}

void setup() {
  // 手順 1：シリアルを開始。以降はこれでどの処理で止まったかを判断する。
  Serial.begin(115200);
  delay(500);
  Serial.println("Showcase: Hello -> English agenda -> portrait");

  // 手順 2：フレームバッファーを確保して SPI を初期化し、パネルをリセット・初期化する。
  if (!epd.begin()) {
    Serial.println("Init failed: check 3V3, GND, wiring and BUSY.");
    return;
  }

  // 手順 3：3 画面を 1 回ずつ表示。いずれかが失敗したら停止し、次へ進まない。
  for (uint8_t i = 0; i < 3; i++) {
    if (!showScreen(i)) {
      Serial.println("Refresh failed; stopped. Check wiring and BUSY.");
      return;
    }
    if (i < 2) delay(HOLD_MS);   // リフレッシュ完了後の停止時間で、切り替え周期ではない
  }
  Serial.println("Done. Last picture stays on screen.");
}

void loop() {
  // 1 回だけ再生する。時間割は上の subjects / rooms / times を変更する。
}

// 手順 4：サイズや長さが誤った写真フレームをコンパイル時に検出する。
static_assert(PHOTO_DRIVER_W == 480 && PHOTO_DRIVER_H == 720,
              "Photo must be 480x720");
static_assert(PHOTO_DRIVER_BYTES == EPD037A02_BUF_BYTES,
              "Photo must be 172800 bytes");
```

### パネルドライバーインターフェース EPD037A02_GFX.h

```cpp
/*
 * EPD037A02_GFX — Adafruit_GFX 用パネルドライバークラス
 * OSPTEK 3.7" E6 電子ペーパー、480×720、6 色（JD7601 / IST7601 / IST7163）
 *
 * パネル層を自作し、グラフィック層は Adafruit_GFX をそのまま継承する。
 * これで drawLine、fillCircle、setFont、print を既存のまま利用できる。
 *
 * MIT / CC BY 4.0。リポジトリ内のほかの資料と同じ。
 */

#ifndef EPD037A02_GFX_H
#define EPD037A02_GFX_H

#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>

/* ------------------------------ パネル定数 ------------------------------- */

#define EPD037A02_WIDTH    480
#define EPD037A02_HEIGHT   720
#define EPD037A02_BUF_BYTES ((size_t)EPD037A02_WIDTH * EPD037A02_HEIGHT / 2) /* 172800 */

// 1 バイトに同じ列の隣接する 2 ピクセルを格納。実機で 1～2 px ずれる場合は 1 に変更。
#ifndef EPD037A02_SWAP_NIBBLE
#define EPD037A02_SWAP_NIBBLE 0
#endif

// JD7601 の 4 bit カラー値。0x4 は無効なので、0～5 の連番で割り当てないこと。
enum EPDColor : uint8_t {
  EPD_BLACK  = 0x0,
  EPD_WHITE  = 0x1,
  EPD_YELLOW = 0x2,
  EPD_RED    = 0x3,
  EPD_BLUE   = 0x5,
  EPD_GREEN  = 0x6,
};

/* ------------------------------- ドライバークラス -------------------------------- */
/*
 * 使い方：
 *   EPD037A02_GFX display(10, 9, 8, 7);    // cs、dc、rst、busy
 *   display.begin();                       // フレームバッファー確保 + リセット + INIT
 *   display.setRotation(0);                // 0/2 = 480×720、1/3 = 720×480
 *   display.fillScreen(EPD_WHITE);
 *   display.setFont(&FreeSansBold24pt7b);
 *   display.setCursor(20, 120);  display.print("Hello");
 *   display.display();                     // 転送 + 全リフレッシュ（15～25 s）
 *
 * 色は 4 bit のインデックスカラーで 6 色のみ。RGB565 ではない。
 * 16 bit のカラー値を渡してもコンパイルできるが、下位 4 bit だけが使われ、意味のある結果にはならない。
 */
class EPD037A02_GFX : public Adafruit_GFX {
 public:
  EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                int8_t sck = -1, int8_t mosi = -1, SPIClass *spi = &SPI);
  ~EPD037A02_GFX();

  // フレームバッファーを確保し、GPIO/SPI を初期化して、パネルをリセット・初期化する。
  // メモリー不足や BUSY 無応答時は false を返し、画面はそのまま。
  bool begin(uint32_t spi_hz = 2000000);

  // フレームバッファーをパネルへ転送して全リフレッシュ。15～25 s ブロックし、BUSY タイムアウトで false。
  bool display();

  // パック済みの 480×720 ネイティブフレームを直接送信。写真用フレームバッファーを別途確保しない。
  bool displayRawFrame(const uint8_t *frame, size_t bytes);

  // パネルを deep sleep へ移行。復帰には再給電、または RST を操作してから begin() の再実行が必要。
  bool sleep();

  // フレームバッファーのみをクリアし、すぐにはリフレッシュしない。カラーパネルに残像がある場合は clear() 後に display() で白画面を 1 回表示できる。
  void clear(uint16_t color = EPD_WHITE);

  // drawPixel は Adafruit_GFX が実装を求める純粋仮想関数。fillScreen は memset に置き換えて高速化。
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void fillScreen(uint16_t color) override;

  // RGB を最も近い 6 色のいずれかに量子化。簡単な画像の描画に使える。
  static uint8_t fromRGB(uint8_t r, uint8_t g, uint8_t b);

  uint8_t *buffer() const { return _buf; }
  bool ready() const { return _buf != nullptr; }
  uint32_t lastRefreshMs() const { return _lastRefreshMs; }
  void setVerbose(bool v) { _verbose = v; }

 private:
  int8_t _cs, _dc, _rst, _busy, _sck, _mosi;
  SPIClass *_spi;
  uint32_t _spiHz;
  uint8_t *_buf;
  uint32_t _lastRefreshMs;
  bool _verbose;

  void _alloc();
  void _spiSend(const uint8_t *buf, size_t len);
  void _cmd(uint8_t c);
  void _data(uint8_t d);
  void _dataBuf(const uint8_t *buf, size_t len);
  bool _waitBusy(const char *what, uint32_t timeout_ms = 60000);
  bool _reset();
  bool _initPanel();
};

#endif /* EPD037A02_GFX_H */
```

### パネルドライバーの実装 EPD037A02_GFX.cpp

```cpp
/*
 * EPD037A02_GFX.cpp — パネル層：SPI、タイミング、フレームフォーマット
 * この層の役割は、バイト送信、BUSY 待ち、(x,y) からフレームバッファーのインデックスへの変換だけ。
 * グラフィック、フォント、回転は Adafruit_GFX に任せる。
 */

#include "EPD037A02_GFX.h"

#include <string.h>
#include <pgmspace.h>

#if defined(ESP32)
#include <esp32-hal-psram.h>
#endif

namespace {
// 1 バイトに 2 ピクセルなので、720 ピクセルの縦 1 列は 360 バイト。
const size_t kColBytes  = EPD037A02_HEIGHT / 2;
const size_t kChunk     = 2048;    // 1 回の SPI 転送の上限。メーカーサンプルと同じ
const uint32_t kBusyTmo = 60000;   // 全リフレッシュは最長 25 s。余裕を持たせる
}  // namespace

EPD037A02_GFX::EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                             int8_t sck, int8_t mosi, SPIClass *spi)
    : Adafruit_GFX(EPD037A02_WIDTH, EPD037A02_HEIGHT),
      _cs(cs), _dc(dc), _rst(rst), _busy(busy), _sck(sck), _mosi(mosi),
      _spi(spi), _spiHz(2000000), _buf(nullptr), _lastRefreshMs(0),
      _verbose(true) {}

EPD037A02_GFX::~EPD037A02_GFX() {
  if (_buf) {
    free(_buf);   // ps_malloc で確保したメモリーも free() で解放する
    _buf = nullptr;
  }
}

/* ============================ メモリー / 初期化 ============================ */

void EPD037A02_GFX::_alloc() {
  if (_buf) return;
#if defined(ESP32)
  if (psramFound()) _buf = (uint8_t *)ps_malloc(EPD037A02_BUF_BYTES);
#endif
  if (!_buf) _buf = (uint8_t *)malloc(EPD037A02_BUF_BYTES);
}

bool EPD037A02_GFX::begin(uint32_t spi_hz) {
  // 手順 1：172800 バイトのフレームバッファーを確保し、白で埋める。
  _spiHz = spi_hz;
  _alloc();
  if (!_buf) {
    if (_verbose) {
      Serial.printf("[EPD] frame buffer allocation failed, %u bytes needed\n",
                    (unsigned)EPD037A02_BUF_BYTES);
    }
    return false;
  }

  // malloc はゼロクリアしない。未初期化メモリーを表示しないよう、先に白で埋める。
  clear(EPD_WHITE);

  // 手順 2：ピンを設定。CS は手動制御し、MISO は接続不要。
  pinMode(_cs, OUTPUT);   digitalWrite(_cs, HIGH);
  pinMode(_dc, OUTPUT);   digitalWrite(_dc, HIGH);
  pinMode(_rst, OUTPUT);  digitalWrite(_rst, HIGH);
  pinMode(_busy, INPUT);

  // 引数の順序は SCK、MISO、MOSI、SS。SS は -1 を渡し、CS をペリフェラルに任せない。
  _spi->begin(_sck, -1, _mosi, -1);

  if (_verbose) {
    Serial.printf("[EPD] Frame buffer %u B, SPI %lu Hz\n",
                  (unsigned)EPD037A02_BUF_BYTES, (unsigned long)_spiHz);
  }

  // 手順 3：パネルをリセットし、初期化コマンドを送る。
  return _initPanel();
}

bool EPD037A02_GFX::_initPanel() {
  if (!_reset()) return false;

  _cmd(0xE9); _data(0x01);   // メーカー INIT：JD7601 初期化コマンド

  if (_verbose) Serial.println("[EPD] Panel initialization complete");
  return true;
}

/* ============================== 低レベル SPI =============================== */

void EPD037A02_GFX::_spiSend(const uint8_t *buf, size_t len) {
  digitalWrite(_cs, LOW);
  _spi->beginTransaction(SPISettings(_spiHz, MSBFIRST, SPI_MODE0));
  _spi->writeBytes(buf, len);
  _spi->endTransaction();
  digitalWrite(_cs, HIGH);
}

void EPD037A02_GFX::_cmd(uint8_t c) {
  digitalWrite(_dc, LOW);    // DC=L：コマンド
  _spiSend(&c, 1);
}

void EPD037A02_GFX::_data(uint8_t d) {
  digitalWrite(_dc, HIGH);   // DC=H：データ
  _spiSend(&d, 1);
}

void EPD037A02_GFX::_dataBuf(const uint8_t *buf, size_t len) {
  digitalWrite(_dc, HIGH);
  while (len) {
    size_t n = (len > kChunk) ? kChunk : len;
    _spiSend(buf, n);
    buf += n;
    len -= n;
  }
}

// BUSY は High = アイドル、Low = ビジー。データシート Note 6-4 の本文は逆なので、ピン表と実測に従う。
bool EPD037A02_GFX::_waitBusy(const char *what, uint32_t timeout_ms) {
  uint32_t t0 = millis();
  while (digitalRead(_busy) == LOW) {
    if (millis() - t0 > timeout_ms) {
      if (_verbose) Serial.printf("[EPD] BUSY timeout: %s\n", what);
      return false;
    }
    delay(2);
  }
  return true;
}

// メーカー RESET タイミング：Low 20 → High 10 → Low 20 → High 10 ms、その後 BUSY を待つ。
bool EPD037A02_GFX::_reset() {
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);

  if (digitalRead(_busy) == LOW) {
    if (_verbose) Serial.println("[EPD] Waiting for BUSY to go high (max 10 s); on timeout check 3V3 / GND / flat cable");
    if (!_waitBusy("reset", 10000)) return false;
  }
  delay(10);
  return true;
}

/* ============================== 画面更新手順 =============================== */

bool EPD037A02_GFX::display() {
  if (!_buf) return false;
  uint32_t t0 = millis();

  _cmd(0x10);                             // DTM：RAM 書き込みの準備
  if (!_waitBusy("DTM")) return false;
  _dataBuf(_buf, EPD037A02_BUF_BYTES);

  _cmd(0x04);                             // PON：高電圧 ON
  if (!_waitBusy("PON")) return false;
  delay(10);

  _cmd(0x12); _data(0x00);                // DRF：リフレッシュ開始
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;

  _cmd(0x02); _data(0x00);                // POF：高電圧 OFF
  if (!_waitBusy("POF")) return false;
  delay(20);

  _lastRefreshMs = millis() - t0;
  if (_verbose) Serial.printf("[EPD] Refresh complete %lu ms\n", (unsigned long)_lastRefreshMs);
  return true;
}

bool EPD037A02_GFX::displayRawFrame(const uint8_t *frame, size_t bytes) {
  if (!frame || bytes != EPD037A02_BUF_BYTES) return false;

  _cmd(0x10);
  if (!_waitBusy("DTM")) return false;

  // Flash から RAM へ 2048 バイトずつコピーして SPI で送信。DMA に Flash を直接読ませない。
  uint8_t chunk[kChunk];
  digitalWrite(_dc, HIGH);
  for (size_t off = 0; off < bytes; off += sizeof(chunk)) {
    size_t n = bytes - off;
    if (n > sizeof(chunk)) n = sizeof(chunk);
    memcpy_P(chunk, frame + off, n);
    _spiSend(chunk, n);
  }

  _cmd(0x04);
  if (!_waitBusy("PON")) return false;
  delay(10);
  _cmd(0x12); _data(0x00);
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;
  _cmd(0x02); _data(0x00);
  if (!_waitBusy("POF")) return false;
  delay(20);
  return true;
}

bool EPD037A02_GFX::sleep() {
  _cmd(0x07); _data(0xA5);
  if (_verbose) Serial.println("[EPD] Deep sleep entered");
  return true;
}

/* ================================ 描画 ================================= */

void EPD037A02_GFX::clear(uint16_t color) {
  if (!_buf) return;
  uint8_t c = (uint8_t)(color & 0x0F);
  memset(_buf, (int)((c << 4) | c), EPD037A02_BUF_BYTES);
}

void EPD037A02_GFX::fillScreen(uint16_t color) { clear(color); }

void EPD037A02_GFX::drawPixel(int16_t x, int16_t y, uint16_t color) {
  if (!_buf) return;
  if (x < 0 || y < 0 || x >= _width || y >= _height) return;

  // まず rotation の影響を受ける論理座標を、パネルの自然座標へ変換する。
  int16_t dx, dy;
  switch (rotation & 3) {
    case 0:  dx = x;                 dy = y;                 break;
    case 1:  dx = WIDTH - 1 - y;     dy = x;                 break;
    case 2:  dx = WIDTH - 1 - x;     dy = HEIGHT - 1 - y;    break;
    default: dx = y;                 dy = HEIGHT - 1 - x;    break;
  }

  // パネルは縦列でデータを受け取り、各列を下から上へ走査するため、Y 反転も必要。
  // 一般的な横方向の行優先で書き込むと、画面が 90° 回転してずれた状態で繰り返される。
  const int16_t fy = HEIGHT - 1 - dy;
  size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);

#if EPD037A02_SWAP_NIBBLE
  const bool lowNibble = ((fy & 1) == 0);
#else
  const bool lowNibble = ((fy & 1) != 0);
#endif

  // 1 バイトを 2 つのニブルに分け、対象ピクセルがある側だけを変更する。
  const uint8_t c = (uint8_t)(color & 0x0F);
  if (lowNibble) _buf[i] = (uint8_t)((_buf[i] & 0xF0) | c);
  else           _buf[i] = (uint8_t)((_buf[i] & 0x0F) | (c << 4));
}

/* ============================ RGB → 6 色量子化 =========================== */

struct EPDRgbRef { uint8_t r, g, b, code; };

// リファレンスカラーは Spectra 6 / E6 の典型的な発色から取得。肉眼に近づけるため、やや暗めにしている。
static const EPDRgbRef kRefs[6] = {
    {  0,   0,   0, EPD_BLACK  },
    {255, 255, 255, EPD_WHITE  },
    {255, 232,   0, EPD_YELLOW },
    {190,  30,  45, EPD_RED    },
    { 35,  70, 150, EPD_BLUE   },
    { 40, 110,  60, EPD_GREEN  },
};

uint8_t EPD037A02_GFX::fromRGB(uint8_t r, uint8_t g, uint8_t b) {
  // 重み付きユークリッド距離。緑の重みを大きくする。
  int32_t best = INT32_MAX;
  uint8_t code = EPD_BLACK;
  for (int k = 0; k < 6; k++) {
    int32_t dr = (int32_t)r - kRefs[k].r;
    int32_t dg = (int32_t)g - kRefs[k].g;
    int32_t db = (int32_t)b - kRefs[k].b;
    int32_t d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < best) { best = d; code = kRefs[k].code; }
  }
  return code;
}
```

### コードの解説

**ピクセルの格納方法。** 最も間違えやすいのが `drawPixel()` です。画面は 480×720、1 ピクセルは 4 bit なので、1 フレームは 480×720÷2 = 172800 バイトになります。

一般的な画面のような行単位ではなく、このパネルは縦列でデータを受け取ります。全部で 480 列、1 列は 360 バイトで、列内も下から上へ走査します。そのため、コードではまず Y 反転 `fy = HEIGHT-1-dy` を行い、続いて `i = dx*360 + (fy>>1)` でバイト位置を計算します。

**カラーエンコード。** 6 色のコードは連続していません。黒、白、黄、赤は `0x0～0x3`、青と緑は `0x5`、`0x6` で、`0x4` は無効です。描画には `EPD_BLACK` などの列挙値を使い、番号を直接指定しないでください。

**3 画面のリフレッシュ。** `setup()` 内の `for` ループを 3 回実行します。最初の 2 画面はフレームバッファーに描画してから `display()` で転送・リフレッシュします。3 画面目は `displayRawFrame()` を呼び、`photo_data.h` のデータを 2048 バイトずつ Flash から RAM へコピーして SPI で送信します。

**メモリー。** 写真画面ではフレームバッファーを使いませんが、最初の 2 画面で必要なため、プログラム全体では常に 172800 バイトのフレームバッファーが必要です。PSRAM があれば優先的に使用し、ない場合や確保に失敗した場合は内蔵 RAM を使用します。

**停止時間。** 各画面のリフレッシュには 15～25 秒かかり、`HOLD_MS` はリフレッシュ完了後に追加で待つ時間です。そのため、最初の 2 画面の実際の間隔は、リフレッシュ時間に 3 秒を加えたものになります。ループ再生は行わないので、もう一度表示するには RESET を押して開発ボードをリセットしてください。

**時間割の変更。** `subjects`、`rooms`、`times` の 3 つの配列を変更します。6 行がそれぞれ対応しています。`bars` は各行の左側に付くカラーバーの色です。ハイライトされる「現在の授業」は 3 行目（`i == 2`）に固定されています。タイトルの日付、`WEEK 12`、下部の `NEXT 11:05 PHYSICS` はハードコードされた文字列です。このサンプルは時計を読み取らず、自動更新もしません。

### 写真をパネルデータへ変換する方法

写真の処理は開発ボード上では行いません。PC で事前に 6 色のドットデータへ変換し、ESP32-S3 は変換済みデータをパネルへ送るだけです。

```text
JPG/PNG → 中央でクロップし、480×720 にリサイズ
→ 露出、コントラスト、彩度を調整 → 6 色ディザリング → パネルのカラー値へ変換
→ 縦列に並べて Y 反転し、2 ピクセルを 1 バイトに結合
→ 172800 バイト配列（photo_data.h）→ Flash に組み込み
→ ESP32-S3 から SPI でパネルへ送信
```

ディザリングは異なる色のピクセルを交互に配置し、ドットの集合を中間色として見せる手法です。色の種類が増えるわけではなく、変換後の各ピクセルは黒、白、黄、赤、青、緑のいずれかです。変換スクリプトは電子ペーパー上で実際に見える色（やや暗い色）を基準に色差を計算しますが、出力するのはパネルのカラー値です。

ピクセルの並び順とカラーエンコードについては、前述の「ピクセルの格納方法」と「カラーエンコード」で説明しました。スクリプトも同じルールでパックします。そのため、生成データをそのままパネルへ送ることができ、開発ボード側で JPG をデコードしたりディザリングを計算したりする必要はありません。

### 写真を変更する

以下のコマンドは `photo_data.h` を上書きするため、先に元ファイルをバックアップしてください。PC には Python 3、Pillow、numpy が必要です（`pip install pillow numpy`）。サンプルを実行するだけなら、これらをインストールする必要はありません。

サンプルフォルダー内で次を実行します。

```bash
cd EPD_3in7_Showcase_JD7601
python3 tool/epd_photo.py 自分の写真.jpg --header photo_data.h --header-name photo_driver
```

- 配列名は `photo_driver` のままにしてください。スクリプトはこの名前から `PHOTO_DRIVER_W`、`PHOTO_DRIVER_H`、`PHOTO_DRIVER_BYTES` を生成し、メインプログラム末尾の `static_assert` で使用します。
- デフォルトでは中央を 480×720 にクロップします。端を切りたくない場合は、`--fit contain`（余白を追加）または `--fit stretch`（伸縮して変形）を指定できます。
- 出力は常に 480×720、172800 バイトです。生成後に再コンパイルして書き込むだけで、ファイルシステムへのアップロードは不要です。

## トラブルシューティング

### コンパイル時に undefined reference to EPD037A02_GFX が出る

症状：リンク段階で `begin()`、`display()` などの関数が見つかりません。

原因：`EPD037A02_GFX.cpp` がコンパイルされていません。Arduino がコンパイルするのは、スケッチのルートディレクトリーと `src/` サブディレクトリー内の `.cpp` です。`driver/` など別のサブディレクトリーに置いたファイルはコンパイルされません。

対処：メイン `.ino`、ドライバーの `.h` と `.cpp` を同じディレクトリーに置き、サンプルを開き直してから再度コンパイルします。

### シリアルモニターに何も表示されない

症状：書き込みは完了しましたが、シリアルモニターが空白のままです。

原因：ボーレートが間違っている、オンボード USB ポートの使用時に USB CDC を有効にしていない、またはモニターを開くのが遅くプログラムの出力がすでに終わっている、といったことが考えられます。

対処：ボーレートを 115200 に設定し、正しいポートを選んでいるか確認します。オンボード USB ポートを使う場合は、Arduino IDE で `USB CDC On Boot` を `Enabled` に設定して再書き込みします。開発ボードの説明に従って UART ポートへ切り替える方法もあります。最後に RESET を押してプログラムを再実行してください。

### シリアルには出力されるが、画面が真っ白のまま

症状：プログラムは動作していますが、パネルに何も表示されません。

原因：SDA と CLK の逆接続、CS や DC の誤接続が一般的です。GND が共通になっていない可能性もあります。

対処：電源を切り、8 本の配線を 1 本ずつ確認します。VDD が 3.3 V かを測定し、GND の導通も確認します。また、ドライバー内の `SPI.begin()` の第 4 引数は `-1` にする必要があります。CS は `_spiSend()` で手動で Low / High に切り替えます。

### シリアルに reset 段階の BUSY タイムアウトが出る

症状：ログが「BUSY が High になるのを待機」で止まり、続いて `reset` のタイムアウト、最後に `Init failed` が出力されます。

原因：BUSY が Low のままです。パネルに給電されていない、BUSY の誤接続や接触不良、フラットケーブルの接触不良などが考えられます。

対処：VDD が 3.3 V に接続されていること、フラットケーブルが奥まで挿さっていること、BUSY が GPIO7 に接続されていることを確認します。リフレッシュコードを変更する前に、まずこれらを点検してください。修正後は電源を入れ直して書き込みます。

### DRF 段階でタイムアウトする、または画面の一部が乱れる

症状：初期化は正常ですが、リフレッシュ時にタイムアウトする、または画面の一部が異常になります。

主な原因：供給電流不足、ジャンパーワイヤーが長すぎる、SPI 速度が高すぎることです。

対処：ジャンパーワイヤーを短くし、GND の接触を確認して、安定した USB ポートや電源へ変更します。SPI 速度はデフォルトの 2 MHz のままにします。`epd.begin()` の引数を変更している場合は、一度引数を削除してデフォルトへ戻してください。

### 画面が 90° 回転し、約 3 段にずれて繰り返される

症状：文字やカラーブロックは判別できますが、向きが誤っており、ずれて繰り返されます。

原因：フレームデータを行順に並べていますが、パネルは実際には縦列で受け取ります。本記事のドライバーでは発生しないはずで、ドライバーを独自に変更した場合や古いドライバーを使った場合に多く見られます。

対処：`drawPixel()` が `size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);` になっていること、また `kColBytes = EPD037A02_HEIGHT / 2`、つまり 360 であることを確認します。

### 繰り返しはないが、画面が上下反転する

症状：文字の順序は正しいものの、画面全体が上下に反転しています。

原因：パネルは各列を下から上へ走査しますが、コードで Y 反転が行われていません。

対処：`drawPixel()` に `const int16_t fy = HEIGHT - 1 - dy;` があり、その後のアドレス計算とニブル判定の両方で `fy` を使っているか確認します。バイト順を逆にするだけでは解決しません。

### 細い線がずれ、文字の線がくしの歯のようになる

症状：全体の位置は正しいものの、隣接ピクセルが 1～2 px ずれます。

原因：1 バイト内の上位・下位ニブルの順序が逆になっている可能性があります。

対処：`EPD037A02_GFX.h` の `EPD037A02_SWAP_NIBBLE` を `0` から `1` に変更します。これはバイト内の 2 ピクセルの順序だけを入れ替えるもので、画面全体の反転処理ではありません。

### コンパイル時に Photo must be 480x720 または Photo must be 172800 bytes が出る

症状：2 つの `static_assert` のいずれかが発生します。

原因：差し替えた `photo_data.h` が 480×720 ではない、またはフレーム長が 172800 バイトではありません。

対処：上記の変換コマンドで再生成し、`--header-name photo_driver` を維持します。`PHOTO_DRIVER_W`、`PHOTO_DRIVER_H`、`PHOTO_DRIVER_BYTES` がそれぞれ 480、720、172800 であることも確認してください。

## FAQ

**EPD037A02 を別のピンに接続できますか？**

可能です。配線と `EPD037A02_GFX epd(10, 9, 8, 7, 12, 11)` の両方を変更してください。引数の順序は CS、DC、RST、BUSY、SCK、MOSI です。ESP32-S3 では GPIO0、45、46（起動関連）、GPIO19、20（USB）、GPIO26～37（Flash/PSRAM で使用）を避けることをおすすめします。具体的には使用する開発ボードの回路図も確認してください。筆者は GPIO7～12 の組み合わせでしかコンパイルを確認しておらず、ほかのピンは試していません。

**SPI 速度はどれくらいですか？8 MHz に変更できますか？**

この例のデフォルトは 2 MHz、Mode 0、MSB ファーストです。速度を上げる場合は `epd.begin()` の引数、例えば `epd.begin(4000000)` を変更し、4 MHz から試すことをおすすめします。ノイズや画面の乱れが出たら 2 MHz に戻してください。この 3 画面サンプルで 8 MHz は検証していません。

**5 V で給電できますか？リフレッシュ時の電流はどれくらいですか？**

できません。VDD は 3.3 V のみで、GND は開発ボードと共通にする必要があります。リフレッシュ時は昇圧回路の負荷が増えるため、ジャンパーワイヤーを短くし、安定して給電してください。リフレッシュ時のピーク電流は計測していないため、ここでは推定値を示しません。

**RAM と Flash の使用量は？CPU を使い切りますか？**

今回のコンパイル結果は、Flash 525724 バイト（40%）、グローバル変数 23576 バイト（7%）でした。実行時には別途 172800 バイトのフレームバッファーを確保し、写真の送信時には 2048 バイトの一時バッファーも使用します。リフレッシュはブロッキング処理で、その間 `loop()` はほかの処理を行えません。厳密なタイミングが必要なタスクは入れないでください。CPU 使用率は計測していません。

**GxEPD2 や標準の ESP32 を使えますか？**

筆者が確認した GxEPD2 1.6.9 には、この 480×720、JD7601 6 色パネル用のドライバークラスがなく、そのまま適用できません。標準の ESP32 への移植は理論上可能ですが、SPI と PSRAM に関するプラットフォームコードの変更に加え、172800 バイトのフレームバッファーが RAM に収まるかを確認する必要があります。ほかのマイコンでは検証していません。

**画面に何も表示されない場合、最初にどの配線を確認すべきですか？**

まず VDD が 3.3 V かを測定し、続いて GND、BUSY、CS、DC、SDA、CLK を確認します。シリアルは 115200 に設定してください。`reset` や `DRF` のタイムアウトが出る場合は、上記の該当項目に従って対処します。シリアルに何も出力されない場合は、フレームフォーマットを変更する前にポートと USB CDC の設定を確認してください。

**中国語や JPG を直接表示できますか？**

できません。UI には GFX 内蔵の 5×7 フォントを使っており、サンプルの文字列はすべて英語で、中国語フォントは含まれていません。JPG も直接送信できないため、事前に 480×720、172800 バイトのパネルフレームへ変換する必要があります。付属の `photo_data.h` は変換済みです。画像の変更方法は、前述の「写真を変更する」を参照してください。

**なぜ 1 回再生しただけで止まるのですか？電源を切っても写真は残りますか？**

このサンプルは 1 回だけ再生する仕様で、`loop()` は空のため、最後は写真のまま止まります。電子ペーパーは電源を切っても表示が残ります。再再生するには RESET を押してください。自動でループさせたい場合は、トリガーのロジックを自分で追加する必要があります。連続再生の間隔は検証していません。

## 応用アイデア

- ハードコードした時間割をシリアル入力へ置き換え、レイアウトを確認してから実データに接続する。
- ボタンを追加し、Hello、時間割、写真を手動で切り替える。
- RTC を追加し、タイトルの日付と「現在の授業」を自動更新する。
- 複数の写真を LittleFS や SD カードに保存し、ボタンでページをめくるデジタルフォトフレームにする。

## 参考資料

- [本記事のサンプルソースコード（GitHub）](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601)：3 画面サンプルの完全なファイルと写真変換スクリプト。

- [Espressif ESP32-S3 公式製品ページ](https://www.espressif.com/en/products/socs/esp32-s3)：メイン MCU の情報。

- [Espressif ESP32-S3 公式データシート](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)：GPIO、SPI、電気的特性。

- [Adafruit GFX Library GitHub](https://github.com/adafruit/Adafruit-GFX-Library)：文字とグラフィックのインターフェース。

- [Adafruit BusIO GitHub](https://github.com/adafruit/Adafruit_BusIO)：Adafruit GFX の依存ライブラリ。

- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)：Arduino コアと SPI サポート。

- [Adafruit GFX フォントの説明](https://learn.adafruit.com/adafruit-gfx-graphics-library/using-fonts)：内蔵フォントと FreeFont の使い方。

- [メーカーのオープンソース資料とサンプル](https://gitee.com/osptek/display-epd-3.7inch-480x720)：データシート、回路図、メーカーサンプル。
