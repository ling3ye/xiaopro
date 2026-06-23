---
title: "ESP32-S3 で GC9A01 円形ディスプレイ + BMP180 を駆動！DIY 登山高度ロガーの完全チュートリアル（SPI + I2C + Arduino）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/bmp180
category: esp32
date: 2026-06-23
intro: "ESP32-S3 で GC9A01 1.28 インチ円形カラーディスプレイを駆動し、BMP180 気圧センサーと組み合わせて、動的な山景色背景・リアルタイム高度・累積登り・気圧表示を備えた登山ロガーを作ってみよう。完全な Arduino コードと配線図も掲載。"
image: "https://img.lingflux.com/2026/06/cc83e55f42460646d2fd372496989222.jpg"
---


> 難易度：⭐⭐⭐☆☆（ジャンパワイヤを数回ハンダ付けしたことがあれば大丈夫）
> 所要時間：45 分
> テスト環境：Arduino IDE 2.3.2 · Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · ESP32 Arduino Core 3.0.x

---

> **TL;DR（クイックスタート）：**
> 1. **ディスプレイの接続**：GC9A01 → CS/GPIO9、DC/GPIO10、SCK/GPIO12、MOSI/GPIO11、RST/GPIO18、BL/GPIO7
> 2. **センサーの接続**：BMP180 → SDA/GPIO13、SCL/GPIO14
> 3. **バックライトは必ず HIGH に**：`setup()` の中で `digitalWrite(TFT_BL, HIGH)` を追加。これが抜けると画面はずっと真っ暗
> 4. **2 つのライブラリをインストール**：Arduino_GFX_Library（作者 moononournation）+ Adafruit BMP085 Library
> 5. **そのまま書き込んで**、シリアルモニタ（115200）を開き、`初期化完了、メインループへ` と表示されれば成功

---

## はじめに

登山が好きなのですが、最近は白雲山くらいしか登れていません。バックパックにはモバイルバッテリー、スマホ、日焼け止めを詰め込んでいるのに、「今どれくらい登ったか」をリアルタイムに教えてくれるものはひとつもありません。スマホアプリは通信が必要で、GPS の感度も安定しませんし、そのたびにスマホを取り出すと「打卡（チェックイン）して写真を撮りに来ただけ」のような違和感があります。そこで、登山用の高度ロガーを作ってみることにしました。

帰宅してパーツ箱を漁ると、GC9A01 の円形ディスプレイがずっと埃を被っていました。あの丸い輪郭は、登山用腕時計の文字盤そのものです。これに BMP180 気圧センサーと ESP32-S3 を組み合わせれば、3 つのパーツ、総コスト 50 元未満で、想像以上に良いものができました。

本記事の目標：ゼロからこの 3 つのパーツをつなぎ、コードを書き込んで、リアルタイム高度・累積上昇/下降・気圧を表示し、背景が高度に合わせて動的に変色する登山ロガーを完成させることです。順に進めれば再現できます。

---

## 実験結果

最終結果：GC9A01 円形ディスプレイに現在の高度（m）、累積上昇（オレンジの上向き矢印）、累積下降（青の下向き矢印）、リアルタイム気圧が表示されます。画面背景は高度比に合わせて動的に変色する山景色で、低高度は暖かいブラウン寄り、高高度はディープブルーにグラデーションし、山頂の雪線も標高が上がるにつれて下へ広がっていきます。画面の縁には金色のプログレスリングで高度進捗を追跡し、BOOT キーを 2 秒長押しするとゼロリセットして再計算できます。

![](https://img.lingflux.com/2026/06/9cedc6308f5ac8b32bb260be186b9298.jpg)

---

## パーツの説明

> ESP32-S3 開発ボードは改めて説明するまでもないでしょう。この記事を読んでいるということは ESP32 を使ったことがあるはずです。以下では残り 2 つの脇役だけ紹介します。

### BMP180 気圧センサー

BMP180 は MEMS 気圧センサーで、大気圧を測定して高度を算出します。本プロジェクトでは毎秒 1 回、気圧と高度データを取得し、ダッシュボード全体のデータソースとして機能します。

分かりやすく言うと、持ち運べる「ミニ気象ステーション」のようなものです。大気圧を測ることで自分がどれくらいの高さに立っているかを逆算します。原理は飛行機の離着陸時に耳が詰まるのと同じで、気圧が低いほど高度が高いということ。温度が気圧の読み取りに影響するため、内部に温度センサーも統合されて補正を行い、より正確な高度データを出します。

| パラメータ | 数値 |
| --- | --- |
| 動作電圧 | 1.8 V ～ 3.6 V（3.3 V に接続） |
| 通信プロトコル | I2C（固定アドレス 0x77） |
| 気圧測定範囲 | 300 ～ 1100 hPa |
| 高度精度 | 標準モード ±1 m、高精度モード ±0.5 m |
| 消費電流 | 待機時 0.1 µA；ピーク 650 µA（変換時）；1 Hz 平均 3～32 µA（精度モードによる） |

選んだ理由：モジュールが安価、Adafruit ライブラリのサポートが手厚い、精度もトレッキング記録には十分。より高い精度や湿度データが必要なら BMP280 や BME280 にアップグレードできますが、それは別記事のテーマです。

### GC9A01 円形 TFT カラーディスプレイ

GC9A01 は 1.28 インチ円形 TFT カラーディスプレイのドライバ IC で、SPI データを受信して 240×240 ピクセルの円形表示パネルを駆動します。本プロジェクトでは動的な山景色背景とリアルタイム高度データをレンダリングする役割です。

分かりやすく言うと、スマートウォッチの丸い文字盤を思い浮かべてください、それがこのディスプレイです。SPI プロトコルで通信し、リフレッシュレートが速く、円形デザインはダッシュボード作りにうってつけ。Arduino_GFX_Library の Canvas ダブルバッファと組み合わせれば、アニメーションは滑らかでフリッカなしです。

| パラメータ | 数値 |
| --- | --- |
| 画面サイズ | 1.28 インチ（円形） |
| 解像度 | 240 × 240 ピクセル |
| ドライバ IC | GC9A01 |
| 通信インターフェース | SPI（最大 80 MHz） |
| 動作電圧 | 3.3 V |
| 色深度 | 16 bit RGB565（65536 色） |

選んだ理由：円形ディスプレイと「登山腕時計」のテーマは相性抜群。直径は高度の大きな数字、上昇/下降のインジケータ、プログレスリングをすべて詰め込むのにちょうど十分で、窮屈ではありません。

---

## BOM 表

| パーツ | 型番 / スペック | 数量 |
| --- | --- | --- |
| メイン開発ボード | ESP32-S3（USB-C 搭載版を推奨） | 1 |
| 気圧センサー | BMP180 モジュール（I2C プルアップ抵抗付き完成品モジュール） | 1 |
| 円形カラーディスプレイ | GC9A01 1.28 インチ TFT、240×240 | 1 |
| 配線 | ジャンパワイヤ（メス-メス） | 適量 |
| 電源 | USB-C データ通信対応ケーブル + PC / 充電器 | 1 |

---

## パーツのピン説明

### GC9A01 のピン

| ディスプレイピン | 機能説明 |
| --- | --- |
| VCC | 電源プラス、3.3 V に接続 |
| GND | 電源マイナス |
| SCL / CLK | SPI クロックライン |
| SDA / MOSI | SPI データライン（マスタ→スレーブ） |
| CS | チップセレクト（Low アクティブ） |
| DC | データ / コマンド選択ライン |
| RST | リセット（Low でトリガ） |
| BL | バックライト制御、**HIGH で点灯** |

### BMP180 のピン

| センサーピン | 機能説明 |
| --- | --- |
| VCC | 電源プラス、3.3 V に接続 |
| GND | 電源マイナス |
| SCL | I2C クロックライン |
| SDA | I2C データライン |

---

## 配線方法

### GC9A01 → ESP32-S3

| GC9A01 ピン | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL（バックライト） | GPIO 7 |

### BMP180 → ESP32-S3

| BMP180 ピン | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL | GPIO 14 |
| SDA | GPIO 13 |



> **配線が終わったら 1 本ずつ見直すことをお勧めします。トラブルシューティングの時間を 80% 削減できます。** 特にハマりやすいポイントが 2 つあります。1 つ目、BL（バックライト）を GPIO7 に繋いだだけではダメで、コード側でも `digitalWrite(TFT_BL, HIGH)` を呼んで初めて点灯します。2 つ目、GC9A01 の SCL/SDA は **SPI プロトコル**、BMP180 の SCL/SDA は **I2C プロトコル** を走らせています。名前は同じでも全く独立した 2 つのバスなので、ピンを絶対に混用しないでください。

---

## 必要なライブラリ

Arduino IDE → ツール → ライブラリを管理 を開き、以下の 3 つを検索してインストールします。

| ライブラリ名 | 作者 | 用途 |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | GC9A01 ディスプレイドライバ + Canvas ダブルバッファレンダリング |
| Adafruit BMP085 Library | Adafruit | BMP180 / BMP085 気圧センサードライバ |
| Adafruit Unified Sensor | Adafruit | 1 つ上のライブラリの依存、一緒にインストール |

> **動作確認済みバージョン**：Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · Arduino IDE 2.3.2 · ESP32 Arduino Core 3.0.x
> 古い ESP32 Core（1.x 系）を使っている場合、SPI 初期化方法が少し異なります。ハマりを避けるため、3.x へのアップグレードを推奨します。

---

## 完全なコード

```cpp
/*
  ============================================================
  登山高度ロガー (Mountain Altitude Logger)
  ============================================================
  ハードウェア：ESP32-S3 + GC9A01 円形ディスプレイ(240x240) + BMP180 気圧センサー
  ============================================================
*/

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>

// ===================== ステップ1：ピンとパラメータの定義 =====================
#define TFT_CS    9    // ディスプレイチップセレクト
#define TFT_DC    10   // データ/コマンド選択
#define TFT_SCK   12   // SPI クロック
#define TFT_MOSI  11   // SPI データ（マスタ→スレーブ）
#define TFT_RST   18   // ディスプレイリセット
#define TFT_BL    7    // バックライト制御（HIGH で点灯、必ず HIGH に！）
#define TFT_MISO  -1   // MISO 不要（書き込み専用、読み出さない）

#define BMP_SDA   13   // BMP180 I2C データライン
#define BMP_SCL   14   // BMP180 I2C クロックライン

#define BTN_PIN   0    // 内蔵 BOOT キー、2 秒長押しでゼロリセット＆校正
#define CALIBRATION_HOLD_MS 2000  // 長押しトリガ閾値（ミリ秒）

#define FILTER_SIZE 5     // 移動平均フィルタの窓（直近 5 サンプルの平均）
#define DEAD_ZONE   0.3f  // 累積上昇/下降のデッドゾーン（0.3m 未満の揺らぎは無視）
#define ALT_RANGE_MAX 3000.0f  // プログレスリング一周に対応する高度上限（3000m）

// ===================== ステップ2：ハードウェアドライバオブジェクト =====================
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, TFT_MISO);
Arduino_GFX *gfx = new Arduino_GC9A01(bus, TFT_RST, 0 /* 回転方向 */, true /* IPS モード */);
// Canvas ダブルバッファ：すべての描画はまずメモリキャンバスに書き込み、最後に flush() で一気に画面へ送出し、フリッカを消す
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

Adafruit_BMP085 bmp;

// ===================== ステップ3：データ構造 =====================
struct AltitudeData {
  float currentAltitude = 0;       // 現在の高度（フィルタ後）
  float maxAltitude = 0;           // 今回の記録での最高高度
  float totalAscent = 0;           // 累積上昇量
  float totalDescent = 0;          // 累積下降量
  float currentPressure = 1013.25; // 現在の気圧（hPa）

  // 以下はアニメーション補間用の「表示値」。数字がスムーズに遷移し、急に飛ばないようにする
  float displayedAltitude = 0;
  float displayedAscent = 0;
  float displayedDescent = 0;
  float displayedPressure = 1013.25;
} data;

// 移動平均フィルタ用のリングバッファ
float altBuffer[FILTER_SIZE] = {0};
int filterIndex = 0;
int filterCount = 0;

// 色定数（setup() 内で color565() を使って初期化し、リソースの早期占有を避ける）
uint16_t COLOR_WHITE, COLOR_BLACK, COLOR_CREAM_GREEN;

// ボタン状態
unsigned long btnPressStart = 0;
bool btnIsPressed = false;
bool calibrationTriggered = false;


// ============================================================
//                   モジュール1：センサー読み取り
// ============================================================

void initSensor() {
  Serial.print("[Sensor] I2C バスを初期化中 (SDA=");
  Serial.print(BMP_SDA);
  Serial.print(", SCL=");
  Serial.print(BMP_SCL);
  Serial.println(")...");

  Wire.begin(BMP_SDA, BMP_SCL);

  Serial.println("[Sensor] BMP180 センサーに接続中...");
  if (!bmp.begin()) {
    // もしプログラムがここで ERROR を表示し続けるなら、センサーの配線に問題あり
    // 画面も点かない。プログラムが下へ進まないから
    while (1) {
      Serial.println("[ERROR] BMP180 の初期化失敗！配線、給電(3.3V)、I2C ピンを確認してください。");
      delay(2000);
    }
  }
  Serial.println("[Sensor] BMP180 の接続に成功！");
}

// BMP180 から生の気圧と高度を 1 回読み取る
void sampleSensor(float &rawAltitude, float &rawPressure) {
  rawPressure = bmp.readPressure() / 100.0f;  // Pa を hPa に変換
  rawAltitude = bmp.readAltitude(101325);      // 101325 Pa = 標準海面気圧
}


// ============================================================
//                   モジュール2：データ処理
// ============================================================

// 移動平均フィルタ：直近 FILTER_SIZE 回の読み取りを平均し、センサーノイズを低減
float smoothAltitude(float raw) {
  altBuffer[filterIndex] = raw;
  filterIndex = (filterIndex + 1) % FILTER_SIZE;
  if (filterCount < FILTER_SIZE) filterCount++;

  float sum = 0;
  for (int i = 0; i < filterCount; i++) sum += altBuffer[i];
  return sum / filterCount;
}

// 統計データ更新：最高高度、累積上昇、累積下降
void updateStats(float smoothedAltitude) {
  static bool firstSample = true;
  static float lastAltitude = 0;

  if (firstSample) {
    lastAltitude = smoothedAltitude;
    data.maxAltitude = smoothedAltitude;
    firstSample = false;
  }

  float delta = smoothedAltitude - lastAltitude;
  // デッドゾーンを超える変化だけ集計し、平地の微小な揺らぎで累積数字が水増しされるのを防止
  if (delta > DEAD_ZONE) {
    data.totalAscent += delta;
  } else if (delta < -DEAD_ZONE) {
    data.totalDescent += -delta;
  }

  if (smoothedAltitude > data.maxAltitude) {
    data.maxAltitude = smoothedAltitude;
  }

  lastAltitude = smoothedAltitude;
  data.currentAltitude = smoothedAltitude;
}


// ============================================================
//                   モジュール3：ボタンと校正
// ============================================================

void showCalibrationFlash();  // 前方宣言

// BOOT キー長押しでトリガ：上昇/下降をゼロリセットし、現在の高度を基準に再スタート
void doCalibration() {
  Serial.println("[Button] 長押しを検出、高度校正のゼロリセットを実行中...");
  data.totalAscent = 0;
  data.totalDescent = 0;
  data.displayedAscent = 0;
  data.displayedDescent = 0;
  data.maxAltitude = data.currentAltitude;

  showCalibrationFlash();
  Serial.println("[Button] 校正完了。");
}

// ボタン状態の検出、BOOT キーは Low アクティブ
void handleButton() {
  bool pressed = (digitalRead(BTN_PIN) == LOW);

  if (pressed && !btnIsPressed) {
    btnIsPressed = true;
    btnPressStart = millis();
    calibrationTriggered = false;
  } else if (pressed && btnIsPressed) {
    // 閾値を超える長押しで未トリガなら校正を実行
    if (!calibrationTriggered && (millis() - btnPressStart >= CALIBRATION_HOLD_MS)) {
      doCalibration();
      calibrationTriggered = true;  // 長押し中の重複トリガを防止
    }
  } else if (!pressed && btnIsPressed) {
    btnIsPressed = false;
  }
}


// ============================================================
//                   モジュール4：UI レンダリング
// ============================================================

// RGB565 の 2 色間の線形補間（t は 0.0 から 1.0）
uint16_t lerpColor(uint16_t colorA, uint16_t colorB, float t) {
  t = constrain(t, 0.0, 1.0);
  uint8_t r1 = (colorA >> 11) & 0x1F, g1 = (colorA >> 5) & 0x3F, b1 = colorA & 0x1F;
  uint8_t r2 = (colorB >> 11) & 0x1F, g2 = (colorB >> 5) & 0x3F, b2 = colorB & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// グラデーション空背景の描画：低高度は暖かいブラウン、高高度はディープブルーへ
void drawSkyBackground(float altitudeRatio) {
  uint16_t topLow     = canvas->color565(176, 196, 210);  // 低高度の天頂：淡いブルー
  uint16_t topHigh    = canvas->color565(30, 30, 90);     // 高高度の天頂：ディープブルー
  uint16_t bottomLow  = canvas->color565(210, 200, 180);  // 低高度の地平線：ウォームグレー
  uint16_t bottomHigh = canvas->color565(70, 90, 140);    // 高高度の地平線：ブルーグレー

  uint16_t topColor    = lerpColor(topLow, topHigh, altitudeRatio);
  uint16_t bottomColor = lerpColor(bottomLow, bottomHigh, altitudeRatio);

  for (int y = 0; y < 240; y++) {
    float t = (float)y / 240.0;
    canvas->drawFastHLine(0, y, 240, lerpColor(topColor, bottomColor, t));
  }
}

// 1 つの山頂を描画（雪線あり）、greenFraction が雪線位置を制御、高度が高いほど雪線は低い
void drawSnowyPeak(int16_t apexX, int16_t apexY, int16_t baseLeftX, int16_t baseRightX,
                    int16_t baseY, uint16_t bodyColor, float greenFraction) {
  canvas->fillTriangle(apexX, apexY, baseLeftX, baseY, baseRightX, baseY, bodyColor);

  greenFraction = constrain(greenFraction, 0.05f, 0.85f);
  int16_t snowY      = apexY + (baseY - apexY) * greenFraction;
  int16_t snowLeftX  = apexX + (baseLeftX - apexX) * greenFraction;
  int16_t snowRightX = apexX + (baseRightX - apexX) * greenFraction;

  canvas->fillTriangle(apexX, apexY, snowLeftX, snowY, snowRightX, snowY, COLOR_CREAM_GREEN);
}

// 手前・奥の 3 つの山を描画
void drawMountains(float altitudeRatio) {
  float greenRatio = 1.0f - altitudeRatio;  // 高度が高いほど植生域は減り、雪線は下がる

  drawSnowyPeak(60,  110, -20, 140, 240, canvas->color565(60, 75, 65),  greenRatio * 0.7);
  drawSnowyPeak(200, 130, 150, 260, 240, canvas->color565(70, 85, 75),  greenRatio * 0.6);
  drawSnowyPeak(130, 70,  40,  220, 240, canvas->color565(45, 55, 50),  greenRatio);
}

// 円弧を描画（プログレスリングの基本関数）
void drawRingArc(int16_t cx, int16_t cy, int16_t radius, int16_t thickness,
                  float startDeg, float endDeg, uint16_t color) {
  for (float deg = startDeg; deg <= endDeg; deg += 1.0) {
    float rad = deg * PI / 180.0;
    int16_t x0 = cx + cos(rad) * (radius - thickness / 2);
    int16_t y0 = cy + sin(rad) * (radius - thickness / 2);
    int16_t x1 = cx + cos(rad) * (radius + thickness / 2);
    int16_t y1 = cy + sin(rad) * (radius + thickness / 2);
    canvas->drawLine(x0, y0, x1, y1, color);
  }
}

// 画面の縁に高度プログレスリングを描画、高度比に応じて金色の円弧を点灯
void drawProgressRing(float altitudeRatio) {
  int16_t cx = 120, cy = 120, radius = 115, thickness = 6;
  // まず灰色のベースリングを 1 周描画
  drawRingArc(cx, cy, radius, thickness, -90, 269, canvas->color565(50, 50, 60));
  // その上に金色で登った分を上書き
  float endAngle = -90 + altitudeRatio * 359.0;
  drawRingArc(cx, cy, radius, thickness, -90, endAngle, canvas->color565(255, 200, 80));
}

// 黒い縁取り付きテキストを描画、白文字が明るい背景に溶け込んで読めなくなるのを防止
void drawTextWithHalo(int16_t x, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  canvas->setTextColor(haloColor);
  // 上下左右に 1 ピクセルずつずらして縁取りを描画
  canvas->setCursor(x - 1, y); canvas->print(text);
  canvas->setCursor(x + 1, y); canvas->print(text);
  canvas->setCursor(x, y - 1); canvas->print(text);
  canvas->setCursor(x, y + 1); canvas->print(text);

  canvas->setTextColor(textColor);
  canvas->setCursor(x, y);
  canvas->print(text);
}

// 中央寄せテキスト描画、テキスト幅から自動的にオフセットを計算
void drawCenteredText(int16_t centerX, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  int16_t x1, y1;
  uint16_t w, h;
  canvas->getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  drawTextWithHalo(centerX - w / 2, y, text, textSize, textColor, haloColor);
}

// すべてのデータテキストオーバーレイを描画
void drawDataOverlay() {
  char buf[32];

  // 画面中央の大文字：現在の高度の数値
  sprintf(buf, "%d", (int)round(data.displayedAltitude));
  drawCenteredText(120, 68, buf, 4, COLOR_WHITE, COLOR_BLACK);
  drawCenteredText(120, 104, "m", 2, COLOR_WHITE, COLOR_BLACK);

  // 左側：オレンジの上向き三角 + 累積上昇
  int16_t ascX = 58, ascY = 138;
  canvas->fillTriangle(ascX, ascY - 8, ascX - 7, ascY + 5, ascX + 7, ascY + 5,
                       canvas->color565(255, 140, 60));
  sprintf(buf, "%dm", (int)round(data.displayedAscent));
  drawTextWithHalo(ascX + 13, ascY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // 右側：青の下向き三角 + 累積下降
  int16_t desX = 150, desY = 138;
  canvas->fillTriangle(desX, desY + 8, desX - 7, desY - 5, desX + 7, desY - 5,
                       canvas->color565(120, 180, 255));
  sprintf(buf, "%dm", (int)round(data.displayedDescent));
  drawTextWithHalo(desX + 13, desY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // 下部の小文字：リアルタイム気圧
  sprintf(buf, "Press: %.1f hPa", data.displayedPressure);
  drawCenteredText(120, 162, buf, 1, COLOR_WHITE, COLOR_BLACK);
}

// メインレンダリング関数：順に背景 → 山 → プログレスリング → 数字 を描画し、最後に flush で画面へ送出
void renderUI() {
  float altitudeRatio = constrain(data.displayedAltitude / ALT_RANGE_MAX, 0.0f, 1.0f);

  drawSkyBackground(altitudeRatio);
  drawMountains(altitudeRatio);
  drawProgressRing(altitudeRatio);
  drawDataOverlay();

  canvas->flush();  // Canvas のメモリバッファを実画面へ一括送出
}

// 校正成功時の点滅アニメーション
void showCalibrationFlash() {
  for (int i = 0; i < 2; i++) {
    canvas->fillScreen(COLOR_WHITE);
    canvas->flush();
    delay(120);

    canvas->fillScreen(COLOR_BLACK);
    canvas->setTextColor(COLOR_WHITE);
    canvas->setTextSize(2);
    canvas->setCursor(48, 112);
    canvas->print("Calibrated!");
    canvas->flush();
    delay(120);
  }
  delay(300);
}


// ============================================================
//                       setup / loop
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- [System] 登山ロガー起動 ---");

  // バックライトを HIGH に、これが抜けると画面はずっと真っ暗
  Serial.println("[TFT] バックライトピンを設定...");
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  pinMode(BTN_PIN, INPUT_PULLUP);  // BOOT キー内部プルアップ

  // ディスプレイドライバを初期化
  Serial.println("[TFT] Canvas を初期化中...");
  if (!canvas->begin()) {
    Serial.println("[ERROR] ディスプレイドライバの初期化失敗！SPI ピンの設定を確認してください。");
  } else {
    Serial.println("[TFT] ディスプレイドライバの初期化に成功。");
  }

  COLOR_WHITE       = canvas->color565(255, 255, 255);
  COLOR_BLACK       = canvas->color565(0, 0, 0);
  COLOR_CREAM_GREEN = canvas->color565(205, 235, 195);  // 山頂の雪色（淡いグリーンがかった白）

  canvas->fillScreen(COLOR_BLACK);
  canvas->flush();

  // センサーを初期化
  initSensor();

  // 起動時の初回データを読み取り、すべての表示値を初期化
  Serial.println("[Sensor] 起動時の初期データを読み取り中...");
  float rawAlt, rawPress;
  sampleSensor(rawAlt, rawPress);

  Serial.print("[Sensor] 起動時読み取り → 気圧: ");
  Serial.print(rawPress);
  Serial.print(" hPa | 高度: ");
  Serial.print(rawAlt);
  Serial.println(" m");

  data.currentAltitude   = rawAlt;
  data.maxAltitude       = rawAlt;
  data.displayedAltitude = rawAlt;
  data.currentPressure   = rawPress;
  data.displayedPressure = rawPress;

  // 起動時の高度でフィルタバッファを事前に入れ、起動時に数値が 0 から実際の高度へ飛ぶのを防止
  for (int i = 0; i < FILTER_SIZE; i++) altBuffer[i] = rawAlt;
  filterCount = FILTER_SIZE;

  Serial.println("--- [System] 初期化完了、メインループへ ---");
}

// センサーサンプリングタイマー（1 秒に 1 回サンプリング）
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL = 1000;

// 画面レンダリングタイマー（約 33 fps）
unsigned long lastRenderTime = 0;
const unsigned long RENDER_INTERVAL = 30;

void loop() {
  handleButton();

  unsigned long now = millis();

  // --- 低頻度タスク：1 秒に 1 回センサーをサンプリング ---
  if (now - lastSampleTime >= SAMPLE_INTERVAL) {
    lastSampleTime = now;

    float rawAltitude, rawPressure;
    sampleSensor(rawAltitude, rawPressure);

    float smoothed = smoothAltitude(rawAltitude);
    updateStats(smoothed);
    data.currentPressure = rawPressure;

    // シリアルのリアルタイムログ、デバッグ時にセンサーが正常か確認用
    Serial.print("[Loop] 生: ");   Serial.print(rawAltitude);
    Serial.print("m | フィルタ: "); Serial.print(data.currentAltitude);
    Serial.print("m | 気圧: ");    Serial.print(data.currentPressure);
    Serial.print(" hPa | 上昇: "); Serial.println(data.totalAscent);
  }

  // --- 高頻度タスク：約 33fps で UI をレンダリング ---
  if (now - lastRenderTime >= RENDER_INTERVAL) {
    lastRenderTime = now;

    // 指数平滑補間：表示数字が実際の値へスムーズに追従、0.12 の係数が追従速度を制御
    data.displayedAltitude += (data.currentAltitude  - data.displayedAltitude) * 0.12f;
    data.displayedAscent   += (data.totalAscent      - data.displayedAscent)   * 0.12f;
    data.displayedDescent  += (data.totalDescent     - data.displayedDescent)  * 0.12f;
    data.displayedPressure += (data.currentPressure  - data.displayedPressure) * 0.12f;

    renderUI();
  }

  delay(2);
}
```

---

## コード解説

コード全体は 4 つのモジュールに分かれており、論理的にお互い干渉しません：

**モジュール1：センサー読み取り** — `initSensor()` が I2C バスを初期化し、BMP180 がオンラインかどうかを検出します。失敗時はエラーを出力して無限ループに入り、先へ進みません（問題の切り分けが容易）。`sampleSensor()` は毎回、生の気圧（Pa を hPa に変換）と高度（標準海面 101325 Pa を基準に換算）を読み出します。

**モジュール2：データ処理** — `smoothAltitude()` は 5 点移動平均フィルタでセンサーノイズを低減、`updateStats()` は 0.3 m のデッドゾーン付きで上昇/下降を累積し、平地の微小な揺らぎで累積数字が水増しされるのを防ぎます。

**モジュール3：ボタンと校正** — `handleButton()` が BOOT キーの長押し（2000 ミリ秒超）を検出し、`doCalibration()` をトリガして上昇/下降をゼロリセット、現在の高度を新基準に再スタートします。`calibrationTriggered` フラグが 1 回の長押し中の重複トリガを防止します。

**モジュール4：UI レンダリング** — `Arduino_Canvas` のダブルバッファを使用し、各フレームはメモリ上で背景のグラデーション、山頂（動的雪線付き）、縁のプログレスリング、数字をすべて描画してから、最後に `canvas->flush()` で一気に画面へ送出し、行ごとのリフレッシュによるフリッカを完全に消します。数字は指数平滑（係数 0.12）でアニメーション補間し、変化が自然で唐突になりません。

`loop()` 内ではダブルタイマーで「低頻度サンプリング（1 秒に 1 回）」と「高頻度レンダリング（約 33 fps）」を分離し、両者は互いにブロックせず、全体の応答はスムーズです。

---

## よくあるトラブルシューティング

焦らないでください、問題の 90% は以下の場所にあります：

**問題 1：画面が完全に真っ黒、バックライトすらない**

`setup()` の中で GPIO 7 に対し `digitalWrite(TFT_BL, HIGH)` を実行しているか確認してください。バックライトは自動では点かず、この一行が抜けると画面はずっと真っ暗です。同時に VCC が 3.3 V に繋がっていることを確認し、5 V ではないこと（5 V だとディスプレイが焼損します）。

**問題 2：バックライトはあるが画面が全面白か全面黒、絵が出ない**

シリアルモニタ（ボーレート 115200）を開いて `[ERROR]` の文字がないか確認。`ディスプレイドライバの初期化失敗` と出ていれば、SPI ピンの配線間違いです。配線表と照らし合わせて CS / DC / SCK / MOSI / RST の 5 本を 1 本ずつチェックしてください。

**問題 3：シリアルが `BMP180 の初期化失敗` を表示し続け、プログラムが止まって画面が点かない**

BMP180 の初期化失敗は無限ループに入り、画面は点きません。原因の 99% は I2C の配線問題です：SDA は GPIO13、SCL は GPIO14、給電は 3.3 V、モジュール上のプルアップ抵抗がハンダ付けされているか確認（正規の完成品モジュールなら通常すでに実装済み）。

**問題 4：表示はできるが高度の数値が実際と大きくずれる**

BMP180 は標準海面気圧（101325 Pa）を基準に高度を換算するため、実際の地域気圧は天候で変動してずれます、±30 m のズレは正常範囲です。現在の正確な高度が分かっていれば、`bmp.readAltitude(101325)` の引数を現地で実測した QNH 海面気圧値（単位 Pa、天気アプリから取得可能、換算：hPa × 100 = Pa）に変更できます。

**問題 5：累積上昇の数値が上がり続ける、動いていないのに**

センサーノイズがデッドゾーン（0.3 m）を超えています。コード内の `DEAD_ZONE` を `0.8f` や `1.0f` に大きくするか、`FILTER_SIZE` を 5 から 8 に増やして平滑効果を強めるか、どちらの方法でも水増しを減らせます。

**問題 6：画面のリフレッシュにフリッカ感がある**

通常、Canvas のダブルバッファを使っていればフリッカは出ません。それでも出る場合は、`canvas->flush()` が `renderUI()` の最後で呼ばれているか、他の場所で Canvas を迂回して直接 `gfx` を操作していないか確認してください。

---

## FAQ

**Q：GC9A01 円形ディスプレイを他の四角いディスプレイに変えられますか？**
A：可能です。Arduino_GFX_Library は数十種類のディスプレイドライバ IC（ST7789、ILI9341 など）をサポートしています。`Arduino_GC9A01` の行を対応するドライバクラス名に変更し、Canvas サイズを 240×240 から対応する解像度に変えれば、UI コードは基本的に変更不要です。

**Q：BMP180 を BMP280 や BME280 に変えられますか？**
A：可能ですが、ライブラリの変更が必要です。BMP280 は `Adafruit_BMP280`、BME280 は `Adafruit_BME280` を使い、`readAltitude()` の呼び出し方法が少し異なります。BMP280 は精度が高く、待機消費電流は約 2.74 µA、BME280 はこれに加えて湿度読み取りもサポートし、価格はやや高めです。

**Q：BMP180 の高度精度はどれくらいですか？室内テストで数字が跳ね続けるのは正常ですか？**
A：BMP180 の標準モード精度は ±1 m、高解像度モードでは ±0.5 m に達します。室内の読み取りの跳ねは完全に正常です。窓を開ける、ドアを閉める、エアコンの気流など、すべて微小な気圧変化を引き起こし、ひいては高度の読み取りに影響します。本プロジェクトは 5 点移動平均 + 0.3 m のデッドゾーンでこの揺らぎを抑え、実用上は十分な効果が出ています。

**Q：ESP32-S3 の SPI（ディスプレイ）と I2C（センサー）は同時に使えますか？**
A：全く問題ありません。SPI と I2C は独立したペリフェラルバスで、本プロジェクトでは GC9A01 が SPI（GPIO11/12）、BMP180 が I2C（GPIO13/14）で、それぞれ別のバスを使い互いに干渉しません。ESP32-S3 が同時に 2 本のバスを駆動するのに何の問題もありません。

**Q：コードの `Arduino_Canvas` とは何ですか？削って直接 `gfx` で描画できますか？**
A：`Arduino_Canvas` は Arduino_GFX_Library が提供するダブルバッファキャンバスです。すべての描画コマンドはまずメモリ上の仮想キャンバスに書き込まれ、`flush()` 呼び出し時に画面へ一括送出され、行ごとのリフレッシュ時のフリッカを消します。削って直接 `gfx` を操作しても機能的には動きますが、全画面グラデーション背景の描画時にフリッカが顕著になり、体験がかなり落ちるためお勧めしません。

**Q：ESP32-S3 をリチウム電池で駆動して登山に持ち歩けますか？**
A：可能です。3.7 V リチウム電池 + TP4056 充放電モジュール + ME6211 LDO で 3.3 V に安定化するのが定番です。本プロジェクトの構成では ESP32-S3 + GC9A01 + BMP180 の総合動作電流は約 80～120 mA、500 mAh 電池 1 個で理論稼働時間は 4～6 時間、日中のトレッキング 1 回分には十分です。さらに長時間持たせたい場合は、画面バックライトの明るさを下げる（GPIO7 の PWM 調光）か、センサーのサンプリング間隔を伸ばしてください。

---

## 応用アイデア

このバージョンを作った後は、さらにいじり倒せます：

- **SD カードで軌跡を記録**：10 秒ごとにタイムスタンプ + 高度 + 気圧を CSV ファイルに書き込み、帰宅後に GPS 軌跡ソフトへ取り込んでデータ分析
- **GPS モジュールで融合測位**：BMP180 は天候の影響でドリフトしますが、GPS の高度精度は約 ±10 m でより安定、両者を融合すれば補い合えます
- **ジャイロ MPU6050 で歩数計**：歩幅リズムを検出して歩数を推定、完全なトレッキングデータ計にアップグレード
- **BLE でスマホへデータを送る**：ESP32-S3 の BLE でリアルタイムデータをスマホアプリへ送信、地図と組み合わせて完全な軌跡を表示

---

## 参考文献

- [BMP180 公式データシート（Bosch Sensortec）](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp180-ds000.pdf)
- [GC9A01 ドライバ IC データシート（Galaxycore）](http://www.galaxycore.com/file/pdf/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub メインページ](https://github.com/moononournation/Arduino_GFX)
- [Adafruit BMP085 Library GitHub メインページ](https://github.com/adafruit/Adafruit-BMP085-Library)
- [Espressif ESP32-S3 公式製品ページ](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
