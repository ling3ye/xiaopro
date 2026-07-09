---
title: "ESP32-S3 で GC9A01 円形ディスプレイ + VL53L0X-V2 レーザー測距 完全ガイド（SPI配線 + I2Cの落とし穴回避）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/vl53l0x
category: esp32
date: 2026-07-09
intro: "ESP32-S3 で GC9A01 1.28 インチ円形ディスプレイを駆動し、VL53L0X-V2 レーザー測距センサーを組み合わせて、リアルタイムに振れる針と距離に合わせて色が変わる弧を描くサイバーパンク風レーザー測距メーターを作ります。SPI+I2C のピン衝突のハマりどころと Arduino 全ソースコード付き。"
image: "https://img.lingflux.com/2026/07/68114f0f73885a81414b9432bd0d95eb.jpg"
---



# ESP32-S3 で GC9A01 円形ディスプレイ + VL53L0X-V2 レーザー測距：配線からサイバーメーター点灯まで（全コード付き）

難易度：⭐⭐⭐☆☆（少し基礎のある maker なら着手可能、配線に少し根気が要ります）
想定時間：45 分
テスト環境：Arduino IDE 2.3.8 + ESP32 Core 3.3.10 + Arduino_GFX_Library v1.6.5 + Adafruit_VL53L0X v1.2.5

---

> **TL;DR（クイックスタート）：**
>
> 1. ディスプレイの配線：GPIO12→SCL、GPIO11→SDA、GPIO9→CS、GPIO10→DC、GPIO18→RST、GPIO7→BL
> 2. センサーの配線：GPIO13→SDA、GPIO14→SCL（**デフォルトの I2C ピンではないので注意**。GPIO9 はすでにディスプレイの CS に使われているため）
> 3. ライブラリを2つインストール：`Arduino_GFX_Library`、`Adafruit_VL53L0X`
> 4. まず「センサーテストコード」を書き込み、シリアルで距離の数値が見えることを確認してからメインプログラムへ
> 5. メインプログラムを書き込むと、円形ディスプレイに針が回って色が変わるレーザーメーターが表示されます

---

## はじめに：なぜこの円形ディスプレイメーターをいじるのか

レーザー測距（ToF）モジュールは多くの人が遊んでいますが、たいてい「シリアルで数値を print する」段階で止まっています。このプロジェクトの目的はシンプルで、ESP32-S3 の性能と GC9A01 円形ディスプレイの視覚的な強みを活かし、抽象的な距離データを実用性とサイバーパンク感をあわせ持つ高リフレッシュのメーターに仕立て上げることです。

プロジェクトの核心的な難しさはロジックではなく、ディスプレイの SPI インターフェースとセンサーの I2C インターフェースのピン衝突にあります。開発ボードのデフォルトピン同士が「ケンカ」して初期化に失敗する問題を解決するため、ハードウェアのピン割り当てを入れ替えました。以下に完全なトラブル回避ガイドとメインプログラムの実装をまとめます。

## 完成イメージ

最終的な仕上がりはこんな感じです。円形ディスプレイにレーシングカーのタコメーター風の円弧スケールを描き、針が現在の測定距離をリアルタイムに指します。弧の色は赤（近い/危険）から緑（遠い/安全）へと遷移し、中心には具体的なミリ単位の数値と状態文字（DANGER / WARNING / CAUTION / SAFE / CLEAR）を表示します。センサーの前で手を振ると針がリアルタイムに追従して動き、けっこう癒やされます。

## 使用パーツ説明

開発ボード（ESP32-S3）の説明は割愛して、もう2つの主役に絞って話します。

### GC9A01 240×240 円形ディスプレイ

GC9A01 は円形ディスプレイ専用の表示ドライバチップで、送られてきたピクセルデータを画面上の絵に「翻訳」する役割を担います。あなたが何を描くかを指示し、描き方はチップが担当し、その間のリフレッシュやスキャンはすべてチップが処理してくれるので、私たちは API を呼ぶだけですみます。

| パラメータ | 数値                |
| ---------- | ------------------- |
| 解像度     | 240×240             |
| サイズ     | 1.28 インチ         |
| インターフェース | SPI                 |
| 発色数     | 65K 色（RGB565）    |
| ドライバライブラリ | Arduino_GFX_Library |

これを選んだ理由は、安価で、円形画面はメーター作りに向いていて見栄えが良く、SPI インターフェースの速度も十分なので針が動いても残像が出ないからです。

### VL53L0X-V2 レーザー測距センサー

VL53L0X は飞行時間（ToF）方式のレーザー測距センサーです。平たく言うと、人間の目には見えない赤外レーザーを発し、レーザーが物体に当たって反射して戻ってくるまでの時間をストップウォッチのように計測して距離を逆算します。コウモリの反響定位と同じ発想ですが、音ではなく光を使っています。

| パラメータ     | 数値                                    |
| -------------- | --------------------------------------- |
| 測定範囲       | 30mm～1200mm（長距離モードで最遠 約 2000mm） |
| 測距精度       | ±3%                                     |
| 通信インターフェース | I2C（最高 400kHz）                      |
| レーザー波長   | 940nm（人眼不可視、Class 1 レーザー、安全） |

選んだ理由は、被測定物の色や材質に影響されず（赤外測距は超音波と比べて表面をほとんど選ばない）、どんな筐体にも収まるほど小型で、I2C の配線も信号線2本で済むからです。

> 💡 **小さな注意：このモジュールはたいてい光学カバーガラスが付きません（私も買うときに一緒に買い忘れました）**
>
> 開発・テスト段階ではむき出しでも全く問題ありませんが、いくつか事前に知っておきたい小さな落とし穴があります。
>
> - **チップ表面を指で突かない**：チップ上のごまより小さい2つのガラス窓（送信と受信）はホコリ、油、湿気を嫌います。汚れるとホコリがレーザーを散乱させて「クロストーク（crosstalk）」が起き、測距がなぜか短くなったり数値が飛び飛びになったり、ひどいときは完全に失效します。
> - **汚れても適当に拭かない**：服の裾やティッシュで拭くのは厳禁（一拭きで傷だらけになります）。ホコリなら**ブロワー（吹き出し）**で吹き飛ばし、油がついたら綿棒に**無水アルコール**をほんの少しつけて極軽くなぞり、自然乾燥でOKです。
> - **強光下では「見えなくなる」**：太陽光や古い白熱灯には赤外線が含まれており、カバーなしのむき出し状態だと最大測距が明日に縮みます。室内の机上テストではほぼ気になりませんが、屋外に持ち出すときは念頭に置いてください。
>
> 今後ずっと筐体に入れて使うつもりなら：**絶対に普通の透明テープやガラスをチップの前にベタ贴りしないでください**。普通の素材は赤外光を反射するため、センサーはカバーを障害物と誤認し、`0mm` や数センチで固定されてしまいます。穴を開けてセンサーを出すか、ちゃんと **940nm 赤外透過フィルタ**を買い、できるだけ近接して貼る（隙間 1mm 未満）のが正解です。

## BOM 表（パーツリスト）

| パーツ                   | 数量 | 備考                                  |
| ------------------------ | ---- | ------------------------------------- |
| ESP32-S3 開発ボード      | 1    | 十分な GPIO があるモデルなら何でも可  |
| GC9A01 1.28インチ円形ディスプレイ（SPI） | 1    | SPI 版であることを確認。パラレル版ではない |
| VL53L0X-V2 ToF 測距モジュール | 1    | ブレッドボード対応モジュール版        |
| ジャンパワイヤ           | 適量 |                                       |

## パーツのピン説明

### GC9A01 のピン

| ピン       | 役割                                         |
| ---------- | -------------------------------------------- |
| VCC        | 電源正、3.3V に接続                          |
| GND        | 電源グランド                                 |
| SCL/CLK    | SPI クロック線                               |
| SDA/MOSI   | SPI データ線                                 |
| CS         | チップセレクト、Low 時にチップが動作        |
| DC         | データ/コマンド切替ピン                      |
| RST        | リセットピン                                 |
| BL         | バックライト制御ピン（モジュールによっては引き出されていない場合があり、その場合は無視） |

### VL53L0X-V2 のピン

| ピン  | 役割                                                         |
| ----- | ------------------------------------------------------------ |
| VIN   | 電源正                                                       |
| GND   | 電源グランド                                                 |
| SCL   | I2C シリアルクロック入力                                     |
| SDA   | I2C シリアルデータ                                           |
| GPIO1 | 割り込み出力ピン、データ準備完了を示す（本プロジェクトでは未使用、オープン可） |
| XSHUT | シャットダウンピン、デフォルトで High で通常動作、Low でシャットダウンモード（本プロジェクトでは未使用、オープン可） |

## 配線方法

下表の通り1本ずつ配線し、1本配線するごとに横にチェックを入れると、トラブルシュートの時間を 80% 節約できます。

### ESP32-S3 と GC9A01 ディスプレイ

| GC9A01 ディスプレイ | ESP32-S3                                                     |
| ----------- | ------------------------------------------------------------ |
| VCC         | 3.3V                                                         |
| GND         | GND                                                          |
| SCL / CLK   | GPIO12                                                       |
| SDA / MOSI  | GPIO11                                                       |
| CS          | GPIO9                                                        |
| DC          | GPIO10                                                       |
| RST         | GPIO18                                                       |
| BL          | GPIO7（コード制御）、または 3.3V に直結（一部のボードは独立バックライト制御なし） |

### ESP32-S3 と VL53L0X-V2 センサー

| VL53L0X-V2 | ESP32-S3                 |
| ---------- | ------------------------ |
| VIN        | 3.3V                     |
| GND        | GND                      |
| SDA        | GPIO13                   |
| SCL        | GPIO14                   |
| GPIO1      | 接続せずオープン         |
| XSHUT      | 接続せずオープン（内部でデフォルト High） |

> ⚠️ **注意**：ESP32-S3 のデフォルト I2C ピンは通常 GPIO8（SDA）/GPIO9（SCL）ですが、本プロジェクトでは GPIO9 がすでにディスプレイの CS に占有されているため、センサーの I2C を GPIO13/GPIO14 に手動で変更しています。コード内で `Wire.begin(I2C_SDA, I2C_SCL)` によってこれらのピンを指定しています。配線時に手抜きしてデフォルトピンに戻さないでください。戻すとディスプレイとセンサーが互いにケンカしてどちらも使えなくなります。

## インストールが必要なライブラリ

Arduino IDE の「ライブラリマネージャ」で検索してインストールします。

- `Arduino_GFX_Library`（作者 moononournation）—— テスト動作確認バージョン v1.6.5
- `Adafruit_VL53L0X`（作者 Adafruit）—— テスト動作確認バージョン v1.2.5、インストール時に `Adafruit BusIO` の同時インストールを求められるので一緒に入れます

IDE バージョン：Arduino IDE 2.3.8、ESP32 ボードサポートパッケージは 3.3.10 を使用。バージョンが離れすぎると API の非互換が起きる可能性があるため、できるだけ揃えることをお勧めします。

## 完全なコード

### メーターメインプログラム

```cpp
/*
 * ═══════════════════════════════════════════════════════
 *  サイバーメーター · Cyber gauge Dashboard
 *  円形ディスプレイ GC9A01 (240×240) + VL53L0X-V2 レーザー測距
 *  MCU: ESP32-S3
 *  ドライバライブラリ: Arduino_GFX_Library v1.6.5
 * ═══════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <Arduino_GFX_Library.h>

// ───────── 色定義（Arduino_GFX v1.6.5 では手動定義が必要）─────────
#define BLACK       0x0000
#define WHITE       0xFFFF
#define RED         0xF800
#define GREEN       0x07E0
#define BLUE        0x001F
#define CYAN        0x07FF
#define YELLOW      0xFFE0
#define ORANGE      0xFD20
#define DARKGREY    0x4208
#define LIGHTGREY   0xC618

// サイバー テーマ色
#define CYBER_BG      0x0841    // 深い背景
#define CYBER_PANEL   0x1082    // パネル色
#define CYBER_BLUE    0x06DF    // 蛍光ブルー
#define CYBER_CYAN    0x07F5    // 蛍光シアン
#define CYBER_GREEN   0x47E0    // 蛍光グリーン
#define CYBER_RED     0xF806    // 警告レッド
#define CYBER_ORANGE  0xFB40    // オレンジ
#define CYBER_YELLOW  0xFF80    // イエロー
#define CYBER_DIM     0x4A49    // 暗い色

// ───────── ピン定義 ─────────
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// VL53L0X は单独で I2C を使用。TFT_CS に占有された GPIO9 を回避
#define I2C_SDA   13
#define I2C_SCL   14

// ───────── 画面サイズ ─────────
#define SCREEN_W  240
#define SCREEN_H  240
#define CX        120     // 中心X
#define CY        120     // 中心Y

// ───────── メーターパラメータ ─────────
#define GAUGE_R       95      // スケール弧の半径
#define GAUGE_WIDTH   10      // 弧の太さ
#define NEEDLE_LEN    78      // 針の長さ
#define START_ANGLE   135     // 開始角度 (度)
#define END_ANGLE     405     // 終了角度 (度)
#define MAX_DIST      800     // 最大表示距離 mm
#define MIN_DIST      20      // 最小距離 mm
#define TICK_COUNT    16      // メモリ数

// ───────── グローバルオブジェクト ─────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1 /* MISO */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0 /* rotation */, true /* IPS */
);

Adafruit_VL53L0X lox = Adafruit_VL53L0X();
Arduino_Canvas *canvas;   // オフスクリーンキャンバス、フリッカを消除

// ───────── 状態変数 ─────────
float currentAngle = START_ANGLE;
float targetAngle  = START_ANGLE;
int   currentDist  = 0;
int   lastDist     = -1;

// ═══════════════════════════════════════
//  ユーティリティ関数
// ═══════════════════════════════════════

// RGB565 色混合
uint16_t blendColor(uint16_t c1, uint16_t c2, float t) {
  uint8_t r1 = (c1 >> 11) & 0x1F, g1 = (c1 >> 5) & 0x3F, b1 = c1 & 0x1F;
  uint8_t r2 = (c2 >> 11) & 0x1F, g2 = (c2 >> 5) & 0x3F, b2 = c2 & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// 距離から色を取得 (近=赤、遠=緑)
uint16_t getDistColor(int dist) {
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  if (ratio < 0.15)  return CYBER_RED;
  if (ratio < 0.30)  return blendColor(CYBER_RED, CYBER_ORANGE, (ratio - 0.15) / 0.15);
  if (ratio < 0.50)  return blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.30) / 0.20);
  if (ratio < 0.70)  return blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.50) / 0.20);
  return blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.70) / 0.30);
}

// 状態文字を取得
const char* getStatusText(int dist) {
  if (dist < 100) return "DANGER";
  if (dist < 200) return "WARNING";
  if (dist < 400) return "CAUTION";
  if (dist < 600) return "SAFE";
  return "CLEAR";
}

// ═══════════════════════════════════════
//  描画関数
// ═══════════════════════════════════════

// 太い弧を描く (短い線分を複数つないで擬似再現)
void drawArc(Arduino_Canvas *c, int cx, int cy, int r,
             float startDeg, float endDeg, int thickness,
             uint16_t color) {
  float step = 1.5;  // 1ステップあたりの角度
  for (float a = startDeg; a <= endDeg; a += step) {
    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// グラデーション弧を描く
void drawGradientArc(Arduino_Canvas *c, int cx, int cy, int r,
                     float startDeg, float endDeg, int thickness) {
  float totalAngle = endDeg - startDeg;
  float step = 1.5;

  for (float a = startDeg; a <= endDeg; a += step) {
    float ratio = (a - startDeg) / totalAngle;
    uint16_t color;

    // 赤 -> オレンジ -> イエロー -> シアン -> グリーン
    if (ratio < 0.2)       color = blendColor(CYBER_RED, CYBER_ORANGE, ratio / 0.2);
    else if (ratio < 0.4)  color = blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.2) / 0.2);
    else if (ratio < 0.6)  color = blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.4) / 0.2);
    else                   color = blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.6) / 0.4);

    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// 目盛線を描く
void drawTicks(Arduino_Canvas *c) {
  float totalAngle = END_ANGLE - START_ANGLE;

  for (int i = 0; i <= TICK_COUNT; i++) {
    float angle = START_ANGLE + (float)i / TICK_COUNT * totalAngle;
    float rad = angle * DEG_TO_RAD;
    float ratio = (float)i / TICK_COUNT;

    // 目盛の色
    uint16_t color;
    if (ratio < 0.2)       color = CYBER_RED;
    else if (ratio < 0.4)  color = CYBER_ORANGE;
    else if (ratio < 0.6)  color = CYBER_YELLOW;
    else if (ratio < 0.8)  color = CYBER_CYAN;
    else                   color = CYBER_GREEN;

    // 長目盛/短目盛
    bool isMajor = (i % 4 == 0);
    int innerR  = GAUGE_R + 4;
    int outerR  = innerR + (isMajor ? 12 : 6);
    int thick   = isMajor ? 2 : 1;

    int x1 = CX + cos(rad) * innerR;
    int y1 = CY + sin(rad) * innerR;
    int x2 = CX + cos(rad) * outerR;
    int y2 = CY + sin(rad) * outerR;

    // 目盛線を描く
    for (int t = 0; t < thick; t++) {
      c->drawLine(x1 + t, y1, x2 + t, y2, color);
    }

    // 主目盛に数値ラベル
    if (isMajor) {
      int labelR = outerR + 12;
      int lx = CX + cos(rad) * labelR;
      int ly = CY + sin(rad) * labelR;
      int val = (float)i / TICK_COUNT * MAX_DIST;

      c->setTextColor(CYBER_DIM);
      c->setTextSize(1);
      c->setCursor(lx - 8, ly - 4);
      c->print(val);
    }
  }
}

// 針を描く
void drawNeedle(Arduino_Canvas *c, float angleDeg, uint16_t color) {
  float rad = angleDeg * DEG_TO_RAD;

  // 針の先端
  int tipX = CX + cos(rad) * NEEDLE_LEN;
  int tipY = CY + sin(rad) * NEEDLE_LEN;

  // 針の根元 (針の方向に垂直な2点)
  float perpRad = rad + PI / 2;
  int baseW = 4;
  int bx1 = CX + cos(perpRad) * baseW;
  int by1 = CY + sin(perpRad) * baseW;
  int bx2 = CX - cos(perpRad) * baseW;
  int by2 = CY - sin(perpRad) * baseW;

  // 三角形の針を描く
  c->fillTriangle(tipX, tipY, bx1, by1, bx2, by2, color);

  // 中心装飾リング
  c->fillCircle(CX, CY, 7, CYBER_PANEL);
  c->drawCircle(CX, CY, 7, color);
  c->fillCircle(CX, CY, 3, color);
}

// メーター全体を描画
void drawDashboard(int dist) {
  canvas->fillScreen(CYBER_BG);

  // 外周装飾
  canvas->drawCircle(CX, CY, 118, CYBER_PANEL);

  // 背景弧 (暗いトラック)
  drawArc(canvas, CX, CY, GAUGE_R,
          START_ANGLE, END_ANGLE, GAUGE_WIDTH, CYBER_PANEL);

  // グラデーション弧 (全体)
  drawGradientArc(canvas, CX, CY, GAUGE_R,
                  START_ANGLE, END_ANGLE, GAUGE_WIDTH);

  // 目盛
  drawTicks(canvas);

  // 針の角度を計算
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  targetAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);

  // 平滑補間
  currentAngle += (targetAngle - currentAngle) * 0.15;

  // 色を取得
  uint16_t needleColor = getDistColor(dist);

  // 針を描く
  drawNeedle(canvas, currentAngle, WHITE);

  // ── 中央の数値エリア ──
  // 距離の数値
  canvas->setTextColor(WHITE);
  canvas->setTextSize(3);
  String distStr = String(dist);
  int textW = distStr.length() * 18;
  canvas->setCursor(CX - textW / 2, CY + 16);
  canvas->print(distStr);

  // 単位
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 6, CY + 42);
  canvas->print("mm");

  // タイトル
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 30, CY - 28);
  canvas->print("LASER RANGE");

  // 状態表示
  canvas->setTextColor(needleColor);
  canvas->setTextSize(1);
  const char* status = getStatusText(dist);
  int sLen = strlen(status);
  canvas->setCursor(CX - sLen * 3, CY + 56);
  canvas->print(status);

  // 画面へ転送
  canvas->flush();
}

// ═══════════════════════════════════════
//  setup() & loop()
// ═══════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n═══ Cyber Gauge Dashboard ═══");

  // ステップ1：バックライトを点灯
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // ステップ2：ディスプレイを初期化
  gfx->begin();
  gfx->fillScreen(BLACK);
  gfx->setRotation(0);

  // ステップ3：オフスクリーンキャンバスを作成 (ダブルバッファでフリッカ防止)
  canvas = new Arduino_Canvas(SCREEN_W, SCREEN_H, gfx);
  canvas->begin();

  // 起動画面
  canvas->fillScreen(CYBER_BG);
  canvas->setTextColor(CYBER_BLUE);
  canvas->setTextSize(2);
  canvas->setCursor(40, 100);
  canvas->print("CYBER");
  canvas->setCursor(40, 125);
  canvas->print("GAUGE");
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(55, 160);
  canvas->print("Booting...");
  canvas->flush();

  delay(1000);

  // ステップ4：I2C とセンサーを初期化 (ここはデフォルトピンではなくカスタムピンを使用)
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("VL53L0X の初期化に失敗しました!");
    canvas->fillScreen(CYBER_BG);
    canvas->setTextColor(CYBER_RED);
    canvas->setTextSize(1);
    canvas->setCursor(50, 110);
    canvas->print("SENSOR ERROR");
    canvas->setCursor(40, 130);
    canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(100);
  }

  Serial.println("VL53L0X 準備完了 ✓");

  // ステップ5：連続測定モードを開始
  lox.startRangeContinuous();

  Serial.println("メーターの起動が完了しました!");
}

void loop() {
  // 距離を読み取り
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();

    // 無効値をフィルタ
    if (dist > 0 && dist < 8190) {
      // 簡易平滑フィルタで数値の飛びを抑える
      currentDist = currentDist * 0.7 + dist * 0.3;
      currentDist = constrain(currentDist, MIN_DIST, MAX_DIST);

      // 距離変化が閾値を超えたときだけ再描画して負荷を下げる
      if (abs(currentDist - lastDist) > 2) {
        drawDashboard(currentDist);
        lastDist = currentDist;

        Serial.printf("距離: %d mm\n", currentDist);
      }
    }
  }

  delay(30);  // ~33 FPS
}
```

### センサーテストコード（まずこれを動かすことを推奨）

メインプログラムを書き込む前に、まずこの最短コードを書き込んでセンサーが正常に動くことを確認することを強くお勧めします。問題が起きても切り分けが容易で、描画コードの山から原因を探し回る必要がありません。

```cpp
/*
 *  VL53L0X センサーテスト
 */

#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define I2C_SDA  13
#define I2C_SCL  14

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("VL53L0X センサーテスト");

  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("❌ センサーが見つかりません、配線を確認してください!");
    while (1);
  }

  Serial.println("✓ センサー準備完了、測定を開始します...");
  lox.startRangeContinuous();
}

void loop() {
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();
    Serial.printf("距離: %d mm\n", dist);
  }
  delay(100);
}
```

### コードの解説

読んでいて混乱しやすいポイントをいくつかピックアップして説明します。

- **`blendColor()`**：2つの RGB565 色を比率 `t` で混色し、赤→オレンジ→イエロー→シアン→グリーンのグラデーション弧を実現します。色を単に切り替えるのではなく滑らかに見せるためです。
- **`Arduino_Canvas`（オフスクリーンキャンバス）**：すべての描画を一度メモリ上のキャンバスに描き、最後にまとめて `flush()` で画面へ送ります。1筆ずつ直接画面に描くのではなく、このようにしないと針が動くたびに目立ったフリッカやティアが生じます。
- **平滑フィルタ `currentDist * 0.7 + dist * 0.3`**：センサーの生の読み取りには小さな揺らぎがあるため、簡単な一次ローパスフィルタをかけ、針の振れを滑らかにして、数値がビクビク動くのを防いでいます。
- **`I2C_SDA=13, I2C_SCL=14`**：配線のセクションで何度も強調した落とし穴です。ここでもう一度念押しします。この2つは ESP32-S3 のデフォルト I2C ピンではなく、デフォルトの GPIO9 がディスプレイの CS に占有されているため、手動で変更したものです。

## よくあるトラブルシューティング

焦らないでください。問題の8割は以下のいずれかにあります。

1. **書き込み後ずっと画面が黒いまま**
   まず `TFT_BL`（バックライト）の配線が正しいか、コード内の `digitalWrite(TFT_BL, HIGH)` が実行されているかを確認します。次に RST ピンの接触不良も疑ってください。RST の緩みは円形ディスプレイが黒画になる最も一般的な原因です。

2. **シリアルに「VL53L0X の初期化に失敗しました!」と表示される**
   99% は配線問題です。VIN/GND の逆接続がないか、SDA/SCL が本当に GPIO13/GPIO14 に繋がっているか（デフォルトの GPIO8/9 ではない）、ジャンパワイヤが緩んでいないかを確認してください。「センサーテストコード」を単体で動かしてディスプレイの影響を排除すると原因が切り分けやすくなります。

3. **画面は点くが、ノイズ/縞模様/色がおかしい**
   多くは SPI のクロック線やデータ線の接触不良、またはジャンパワイヤが長すぎて信号が減衰しているのが原因です。SCL/SDA が GPIO12/GPIO11 に対応しているかを確認し、ジャンパワイヤは 15cm 以内に収めるようにしてください。

4. **針が乱暴に振れ、数値が絶えず変わる**
   フィルタ係数が弱いか、センサーの前方に反射/透明な物体が干渉しています。`currentDist * 0.7 + dist * 0.3` の重みを `0.85/0.15` に変更するとフィルタがより強くなります（代償として応答が遅くなります）。

5. **コンパイル時に `Adafruit_VL53L0X.h` や `Arduino_GFX_Library.h` が見つからないとエラー**
   ライブラリが正しくインストールされていません。ライブラリマネージャで正確なライブラリ名を検索して再インストールしてください。同名のサードパーティ fork 版を誤って入れないように注意。

6. **針の角度と目盛の数値が合わない**
   `MAX_DIST` を小さく変更したのに目盛のラベルを合わせて変更していないか確認してください。両者は一致させる必要があり、そうしないと目盛数値と実際の針の位置がズレます。

## FAQ

**Q：ESP32-S3 のデフォルト I2C ピンはどの2本ですか？**
A：デフォルトでは通常 GPIO8（SDA）と GPIO9（SCL）ですが、本プロジェクトでは GPIO9 がディスプレイの CS に占有されているため、センサーの I2C を GPIO13/GPIO14 に変更しています。

**Q：VL53L0X は最大どれくらいの距離を測れますか？ 精度は？**
A：メーカー公称の有効測定範囲は約 30mm～1200mm（長距離モードで最遠 2000mm）、精度は約 ±3% です。

**Q：GC9A01 円形ディスプレイはタッチに対応していますか？**
A：GC9A01 自体は表示ドライバチップであり、タッチ機能を持ちません。市販の一部モジュールは別途静電容量タッチチップを統合していることがあるため、購入前にその型番がタッチ対応版か確認してください。

**Q：VL53L0X のレーザーは目を傷めますか？**
A：傷めません。Class 1 レーザー製品に該当し、940nm の波長は人眼に不可視で出力も極めて低く、人眼安全基準に適合しているため、通常の使用では心配不要です。

**Q：GC9A01 ディスプレイが点かないが、電源は正常なのはなぜですか？**
A：最も多い原因は RST（リセット）ピンの接触不良、またはバックライト BL ピンが High に引き上げられていないことです。この2点を先に確認してください。

**Q：なぜコードではオフスクリーンキャンバス `Arduino_Canvas` を使うのですか？ 直接画面に描いてはいけませんか？**
A：直接画面に描くと、針が回る際や弧を再描画する際に明らかなフリッカとティアが生じます。キャンバスでダブルバッファリングし、描き終えてから一気に更新することで、画面がクリーンに仕上がります。

**Q：VL53L0X-V2 と通常版の VL53L0X に違いはありますか？**
A：中核の測距原理とピン定義は同一です。V2 は通常、モジュールメーカー側の基板設計や安定化電源回路の改版最適化によるもので、具体的な差異は購入したモジュールの実物資料を基準にしてください。

**Q：このプロジェクトで ESP32-S3 の給電は USB 給電で足りますか？**
A：足ります。ディスプレイとセンサー全体の消費電力は高くなく、通常の USB 5V/500mA 給電で全く問題ありません。

## 応用アイデア

- ブザーを繋ぎ、距離が DANGER 領域に入ったらアラームを鳴らすと、簡易駐車レーダーに早変わり
- 過去の距離データを保存してリアルタイムの折れ線グラフを描き、物体の移動軌跡を観察
- ボタンを2つ追加し、表示単位（mm / cm / inch）を切り替え
- 筐体を作ってフロントガラスに吸着させ、本格的なバックセンサーとして実使用

## 参考資料

- [ST VL53L0X 公式データシート](https://www.st.com/en/imaging-and-photonics-solutions/vl53l0x.html)
- [Adafruit_VL53L0X GitHub リポジトリ](https://github.com/adafruit/Adafruit_VL53L0X)
- [Arduino_GFX_Library GitHub リポジトリ](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 公式製品ページ](https://www.espressif.com/en/products/socs/esp32-s3)
