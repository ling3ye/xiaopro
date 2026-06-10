---
title: "ESP32-S3 + GC9A01 円形ディスプレイコンパス失敗談：HMC5883L 実験は面白いが、外出時に頼るのはやめよう（完全チュートリアル）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/hmc5883l
category: esp32
date: 2026-06-10
intro: "ESP32-S3 + GC9A01 円形ディスプレイ + HMC5883L で見栄えの良い電子コンパスを作ったが、完成後に気づいたのは精度が微妙だったこと。本記事では配線、キャリブレーション、コードを完全に記録しつつ、この構成が実験デモにのみ適しており、本格的なナビゲーション用途には適さない理由を明確に説明します。"
image: "https://img.lingflux.com/2026/06/79dbcadeea8dba2436b055a92f76fc20.jpg"
---



# ESP32-S3 + GC9A01 + HMC5883L 円形ディスプレイコンパス失敗全記録——作れる、見栄えは良い、でも精度はね…（完全チュートリアル）

難易度：⭐⭐⭐☆☆（基礎知識があれば挑戦可能）
所要時間：45 分
テスト環境：Arduino IDE 2.3.8 · Arduino_GFX_Library v1.6.5 · Adafruit_HMC5883_U v1.2.4

---

> ⚠️ **まず結論から：** この構成で作ったコンパスは見た目がとてもかっこよく、大方向は合っていますが、精度は典型的に ±5°~±15° で、周囲の磁場の影響を受けやすい。ドライバの学習、デモ用途、卓上オブジェとして使うなら——完全に十分。屋外ナビゲーション、ドローンの方位制御、精度が厳密に要求される用途には——**おすすめしません**。理由は後で説明します。

> **TL;DR（クイックスタート）：**
> 1. まず I2C スキャンを実行してチップのアドレスを確認——`0x0D` は QMC5883L（互換品）、`0x1E` が本物の HMC5883L。型番に合わせて対応するライブラリをインストールしないと、読み取り値はすべて乱れます
> 2. 配線表に従って 12 本のワイヤを接続（ディスプレイ 8 本 + センサー 4 本、3.3V/GND は共用可能）
> 3. `DECLINATION_DEG` をお住まいの都市の磁気偏角に変更（北京は約 -6.5°、東京は約 -7.5°、検索リンクは文末に記載）
> 4. 電源投入時に BOOT キー（GPIO0）を押し続けると 15 秒間の回転キャリブレーションに入ります。水平にゆっくり 1 回転させてください
> 5. キーを離すとキャリブレーションデータが自動的に NVS に保存され、電源を切っても消えません。次回はすぐに使えます

---

## はじめに

この GC9A01 円形ディスプレイを買ったとき、しばらく眺めていました——1.28 インチ、240×240、完璧な真円。これこそ天生のコンパス文字盤じゃないか？

それで一週末かけて作り上げ、スマホと見比べてみました……うーん、針の大方向は合っているけど、少しズレている。だいたい10度くらい。何回か回してみると、回らなくなりました。電源を入れ直しても、やはりあまり回らない。。。

「きっとキャリブレーションが足りないんだ。」再キャリブレーションし、場所を変えて測定し、iPhone と向き合ってぐるぐる回った——差はやはりそこにありました。コードの書き間違いではなく、このセンサーモジュールの先天的な限界なのです。スマホを近づけると影響を受けるのも観察できました。

そこでこの記事には二つの目的があります。第一に、円形ディスプレイコンパスを完全に作り上げ、コードが動き、キャリブレーションが通り、見た目も確かに良いところまでしっかり記録すること。第二に、その精度の限界を明確に説明し、「どこでドタバタするか」を読者が事前に知れるようにすること——作ってから針が Google Maps と合わないことに気づくのではなく。

GC9A01 + HMC5883L のドライバ手法を学びたい方、あるいはかっこいい卓上オブジェを作りたい方にとって、このプロジェクトは十分に価値があります。もしあなたの目標が「ナビゲーション精度」であれば、記事後半の「本格的なプロジェクトに適しているか」のセクションまでスキップしてから、続けるかどうか判断することをお勧めします。

---

## 実験結果

![111111 (1)](https://img.lingflux.com/2026/06/61587ad00164cf25e866feb4066e069f.jpg)

GC9A01 円形ディスプレイにコンパス文字盤がリアルタイム表示されます：赤い針が北を指し、中央の緑の数字が現在の方位角（0°~359°）を表示、黄色い文字で最も近い8方位（N / NE / E / SE / S / SW / W / NW）を表示します。電源投入時に BOOT キーを押し続けると 15 秒間の回転キャリブレーションモードに入り、画面にプログレスバーとリアルタイム磁場範囲が表示されます。キャリブレーション完了後は針の動きが滑らかで、約 25fps。キャリブレーションなしの時のようなランダムな振動はありません。



> **精度について先に明確にしておきます：** キャリブレーション済みの HMC5883L は理想的な環境（金属や他の磁場源から離れた場所）で、方位角誤差が約 ±5° です。パソコン本体、充電器、スピーカー、ドライバーの近くでは、誤差が簡単に ±15° 以上に増加します。日常の卓上使用では「大方向は合っている」状態ですが、私が買ったこのモジュールは正規品かどうかわからず、時々動かなくなることもあります。十の位までの精度は期待しないでください。これはハードウェアの先天的な限界であり、コードの問題ではありません。後の「本格的なプロジェクトに適しているか」のセクションで詳しく説明します。

---

## 使用部品の説明

**GC9A01 円形 TFT ディスプレイ**

直径 3.2 センチの円形時計画面を想像してください——GC9A01 はまさにそれです。SPI インターフェース、解像度 240×240、ドライバはディスプレイコントローラに内蔵されており、ESP32 が直接ピクセルをプッシュするだけで、外部 RAM は不要です。これを選んだ理由は、第一に円形がコンパス UI に最適であり、第二に Arduino_GFX_Library が完全にサポートしており、ドライバコードが数行で済むからです。

| パラメータ | 仕様 |
| --- | --- |
| 解像度 | 240 × 240 px |
| インターフェース | SPI（最大 80 MHz） |
| 電源電圧 | 3.3V |
| バックライト制御 | High レベルで点灯 |
| 消費電流（典型値） | 約 20 mA（全点灯時） |



**GC9A01 ディスプレイモジュール（8 ピン）**

| ピン名称    | 機能                     |
| ----------- | ------------------------ |
| VCC         | 3.3V 電源                |
| GND         | グランド                 |
| SCL / CLK   | SPI クロック             |
| SDA / MOSI  | SPI データ（Master→Slave）|
| CS          | チップセレクト、Low 有効 |
| DC          | データ/コマンド選択      |
| RST         | ハードウェアリセット、Low 有効 |
| BL          | バックライト制御、High レベルで点灯 |



**HMC5883L / QMC5883L 3 軸磁力計**

磁力計はコンパスの「鼻」であり、地球磁場の X/Y/Z 3 方向の強さを感知し、逆三角関数で面している方向を計算します。I2C インターフェース、3.3V 駆動、1 回のデータ読み取りは数ミリ秒しかかりません。

特に説明が必要な点：市場に出回っている「HMC5883L」と表示されたモジュールのほとんどは、実際には QST 社の QMC5883L チップです——両者はピン互換ですが、レジスタは全く異なり、対応するドライバライブラリも別物です。**急いでライブラリをインストールする前に、後述の I2C スキャン手順で手元のチップがどれかを確認し、対応するライブラリをインストールすれば、トラブルシューティングの大半を省けます。**

| パラメータ | HMC5883L（オリジナル） | QMC5883L（互換品） |
| --- | --- | --- |
| I2C アドレス | 0x1E | 0x0D |
| 測定範囲 | ±8 Gauss | ±8 Gauss |
| 分解能 | 2 mGauss | 2 mGauss |
| ノイズ密度 | ~2 mGauss/√Hz | ~2 mGauss/√Hz |



**HMC5883L / QMC5883L 磁力計モジュール（4 ピン常用）**

| ピン名称 | 機能                                   |
| -------- | -------------------------------------- |
| VCC      | 3.3V 電源                              |
| GND      | グランド                               |
| SDA      | I2C データ                             |
| SCL      | I2C クロック                           |
| DRDY     | データレディ割り込み（本プロジェクトでは未使用、接続不要） |

両者の基本性能は近く、実験デモにはどちらも問題ありません。ただし明確にしておくべき点：どちらのチップであっても、この価格帯の磁力計モジュールにはオンチップの温度ドリフト補償もセンサーフュージョンもなく、最も基本的な二次元磁場測定しか行っていません——これが精度の上限を決定しており、デモと学習にのみ適し、実際のナビゲーション用途には適さない理由でもあります。

---

## BOM（部品表）

| 部品 | 型番 / 仕様 | 数量 | 参考価格 |
| --- | --- | --- | --- |
| メイン開発ボード | ESP32-S3（任意の開発ボード） | 1 | ¥25~40 |
| 円形 TFT ディスプレイ | GC9A01、1.28 インチ、240×240 | 1 | ¥12~20 |
| 磁力計モジュール | HMC5883L または QMC5883L | 1 | ¥3~8 |
| ジャンパーワイヤ | オス-メス、20cm | 適量 | ¥3 |

---

## 配線方法

> 配線完了後、テーブルに従って 1 本ずつ確認することをお勧めします。この一手間で「なぜ動かないのか」のトラブルシューティング時間の 80% を省けます。

**GC9A01 円形ディスプレイ → ESP32-S3**

| ディスプレイピン | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7（または 3.3V に直結して常時点灯） |

**HMC5883L / QMC5883L → ESP32-S3**

| センサーピン | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO14 |
| SCL | GPIO13 |



---

## インストールが必要なライブラリ

インストールの前に、まず磁力計チップの型番を確認してください。以下のコードをアップロードし、シリアルモニタ（115200）を開いて、表示される I2C アドレスを確認してください。

```cpp
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(13, 14);  // SDA=13, SCL=14、本プロジェクトと一致

  Serial.println("Scanning I2C...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("Found device at 0x%02X\n", addr);
    }
  }
  Serial.println("Done.");
}

void loop() {}
```

- `0x1E` と表示 → 本物の HMC5883L です。**Adafruit HMC5883 Unified**（作者 Adafruit）をインストール
- `0x0D` と表示 → QMC5883L です。コード内の `#include` とセンサーオブジェクトを対応するライブラリに変更する必要があります（FAQ 第 3 項を参照）

チップを確認したら、Arduino IDE → ライブラリマネージャを開き、検索してインストールしてください。

| ライブラリ名 | 対応チップ | テスト済みバージョン |
| --- | --- | --- |
| Arduino_GFX_Library | — | v1.6.5 |
| Adafruit HMC5883 Unified | HMC5883L（0x1E） | v1.2.4 |
| Adafruit Unified Sensor | 両方とも必要 | v1.1.15 |

QMC5883L（0x0D）の場合、後述の FAQ に代替案を記載しています。

---

## 完全コード

```cpp
#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>
#include <Preferences.h>
#include <math.h>

// ─── ステップ1：ピン定義 ────────────────────────────────
#define TFT_SCK  12
#define TFT_MOSI 11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7
#define I2C_SDA  14
#define I2C_SCL  13

// 電源投入時にこのキーを押し続けるとキャリブレーションモードに入る（BOOT キー、GPIO0、別途ボタン不要）
#define CAL_BTN   0

// 磁気偏角（西偏を負とする）—— 検索ツール：https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
// 北京 ≈ -6.5°、上海 ≈ -5.5°、広州 ≈ -3°、東京 ≈ -7.5°
// この値を変更しないと、コンパス全体が X 度ずれ、すべての方向が誤ります
#define DECLINATION_DEG  (-3.0f)

// ─── ステップ2：ディスプレイオブジェクト初期化 ────────────────────────────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01  *gfx = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas ダブルバッファ：メモリ内でフレーム全体を描画完了後に画面へ一括プッシュし、ちらつきを解消
// メモリ使用量：240×240×2 = 115 KB（ESP32-S3 の PSRAM または内部 SRAM で十分対応可能）
Arduino_Canvas  *canvas = new Arduino_Canvas(240, 240, gfx, 0, 0);

// ─── センサーオブジェクト ──────────────────────────────────
Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);

// ─── キャリブレーションパラメータ（ハードアイアンオフセット + ソフトアイアンスケーリング、NVS に保存）───────────────────
Preferences prefs;
float calOffX = 0, calOffY = 0;
float calSclX = 1, calSclY = 1;

// ─── EMA ローパスフィルタパラメータ ────────────────────────────
float gSmooth    = 0;
bool  gFirstRead = true;

// alpha が小さいほど滑らか（ただし応答が遅くなる）；卓上配置なら 0.15、手持ち移動なら 0.25 に調整
#define EMA_ALPHA  0.15f

// ─── 色定義（RGB565 フォーマット）────────────────────────────────
#define C_BG      0x0000   // 黒背景
#define C_RING    0x4208   // ダークグレー外輪
#define C_TICK    0x7BEF   // グレー小目盛り
#define C_MAJOR   0xFFFF   // 白主目盛り / ラベル
#define C_NORTH   0xF800   // 赤 N
#define C_NDL_N   0xF800   // 赤い針（北側）
#define C_NDL_S   0xCE79   // 銀色の針（南側）
#define C_DEG     0x07E0   // 緑の角度表示
#define C_DIR     0xFFE0   // 黄色の方角文字

const char* kDir[] = {"N","NE","E","SE","S","SW","W","NW"};

#define CX 120   // 中心 X
#define CY 120   // 中心 Y
#define R  100   // 文字盤半径

// ─────────────────────────────────────────────
//  方位角読み取り（ハードアイアン/ソフトアイアンキャリブレーション補正含む）
// ─────────────────────────────────────────────
float readHeading() {
  sensors_event_t ev;
  mag.getEvent(&ev);

  // ハードアイアンオフセットを減算、周囲の固定磁場（ネジ、銅柱など）の干渉を除去
  float x = ev.magnetic.x - calOffX;
  float y = ev.magnetic.y - calOffY;
  // ソフトアイアン正規化：楕円形の磁場応答を円形にマッピング
  if (calSclX > 0.01f) x /= calSclX;
  if (calSclY > 0.01f) y /= calSclY;

  float h = atan2f(y, x) + DECLINATION_DEG * (float)M_PI / 180.0f;
  if (h <  0)               h += 2.0f * (float)M_PI;
  if (h > 2.0f*(float)M_PI) h -= 2.0f * (float)M_PI;
  return h * 180.0f / (float)M_PI;
}

// ─────────────────────────────────────────────
//  EMA ローパスフィルタ（0°/360° の環境ジャンプを正しく処理）
// ─────────────────────────────────────────────
float emaFilter(float newAngle) {
  if (gFirstRead) { gFirstRead = false; return newAngle; }
  float d = newAngle - gSmooth;
  if (d >  180.0f) d -= 360.0f;   // 例：359° から 1° へのジャンプ、差分は +2° であるべき、-358° ではない
  if (d < -180.0f) d += 360.0f;
  float r = gSmooth + d * EMA_ALPHA;
  if (r <   0.0f) r += 360.0f;
  if (r >= 360.0f) r -= 360.0f;
  return r;
}

// ─────────────────────────────────────────────
//  フルフレームレンダリング（完全なフレームを描画後に画面へプッシュ、ちらつきを防止）
// ─────────────────────────────────────────────
void drawFrame(float angle) {
  canvas->fillScreen(C_BG);

  // 外輪（4 ピクセル幅、文字盤に縁取り感を付与）
  for (int r = R; r > R - 4; r--)
    canvas->drawCircle(CX, CY, r, C_RING);

  // 目盛り線：10° ごとに 1 本、30° ごとに延長、90° ごとに白色
  for (int deg = 0; deg < 360; deg += 10) {
    float rad = deg * (float)M_PI / 180.0f;
    int   len = (deg % 30 == 0) ? 12 : 6;
    canvas->drawLine(
      CX + (int)(cosf(rad) * (R - 5)),    CY + (int)(sinf(rad) * (R - 5)),
      CX + (int)(cosf(rad) * (R-5-len)),  CY + (int)(sinf(rad) * (R-5-len)),
      (deg % 90 == 0) ? C_MAJOR : C_TICK
    );
  }

  // N/E/S/W ラベル、N は赤で目立たせる
  canvas->setTextSize(2);
  canvas->setTextColor(C_NORTH); canvas->setCursor(CX-6,    CY-R+20);  canvas->print("N");
  canvas->setTextColor(C_MAJOR); canvas->setCursor(CX+R-32, CY-7);     canvas->print("E");
                                 canvas->setCursor(CX-6,    CY+R-32);  canvas->print("S");
                                 canvas->setCursor(CX-R+20, CY-7);     canvas->print("W");

  // 針（3 ピクセル幅、視認性向上）
  float rad  = angle * (float)M_PI / 180.0f;
  float perp = rad + (float)M_PI / 2.0f;
  int   pdx  = (int)roundf(cosf(perp));
  int   pdy  = (int)roundf(sinf(perp));
  int   nx   = CX + (int)(sinf(rad) * 68);   // 赤い針（北側）
  int   ny   = CY - (int)(cosf(rad) * 68);
  int   sx   = CX - (int)(sinf(rad) * 42);   // 銀色の針（南側、少し短い）
  int   sy   = CY + (int)(cosf(rad) * 42);
  for (int d = -1; d <= 1; d++) {
    canvas->drawLine(CX+pdx*d, CY+pdy*d, nx+pdx*d, ny+pdy*d, C_NDL_N);
    canvas->drawLine(CX+pdx*d, CY+pdy*d, sx+pdx*d, sy+pdy*d, C_NDL_S);
  }

  // 中心軸の小円（装飾用）
  canvas->fillCircle(CX, CY, 9, C_RING);
  canvas->drawCircle(CX, CY, 9, 0xA534);
  canvas->fillCircle(CX, CY, 3, C_MAJOR);

  // 中央に角度（緑）と8方位文字（黄色）を表示
  canvas->setTextSize(2);
  canvas->setTextColor(C_DEG);
  char buf[8]; sprintf(buf, "%3d", (int)angle);
  canvas->setCursor(CX - 18, CY - 14); canvas->print(buf);

  int   idx = ((int)(angle + 22.5f) % 360) / 45;
  int   w   = strlen(kDir[idx]) * 6;
  canvas->setTextSize(1);
  canvas->setTextColor(C_DIR);
  canvas->setCursor(CX - w/2, CY + 6); canvas->print(kDir[idx]);

  canvas->flush();   // ← フレーム全体を画面へ一括プッシュ。この行がちらつき解消のキー
}

// ─────────────────────────────────────────────
//  15 秒回転キャリブレーション
//  原理：センサーの各方向での最大/最小値を記録し、
//       ハードアイアンオフセット（offset）とソフトアイアンスケーリング（scale）を算出
// ─────────────────────────────────────────────
void runCalibration() {
  float minX =  1e6f, maxX = -1e6f;
  float minY =  1e6f, maxY = -1e6f;
  const uint32_t DUR = 15000;
  uint32_t t0 = millis();

  while (millis() - t0 < DUR) {
    sensors_event_t ev; mag.getEvent(&ev);
    if (ev.magnetic.x < minX) minX = ev.magnetic.x;
    if (ev.magnetic.x > maxX) maxX = ev.magnetic.x;
    if (ev.magnetic.y < minY) minY = ev.magnetic.y;
    if (ev.magnetic.y > maxY) maxY = ev.magnetic.y;

    // キャリブレーション進行状況をリアルタイム表示
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR);  canvas->setTextSize(2);
    canvas->setCursor(15, 60);  canvas->print("CALIBRATING");
    canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
    canvas->setCursor(8, 95);   canvas->print("Slowly rotate 360 deg");
    canvas->setCursor(18, 109); canvas->print("Keep device level");
    // プログレスバー
    int p = (millis() - t0) * (R*2-2) / DUR;
    canvas->drawRect(20, 130, R*2, 14, C_MAJOR);
    canvas->fillRect(21, 131, p, 12, 0x07E0);
    // 磁場範囲をリアルタイム表示（1 回転完了したか確認用）
    char b[44];
    canvas->setTextColor(0x7BEF);
    sprintf(b, "X[%.1f ~ %.1f]", minX, maxX);
    canvas->setCursor(8, 157); canvas->print(b);
    sprintf(b, "Y[%.1f ~ %.1f]", minY, maxY);
    canvas->setCursor(8, 170); canvas->print(b);
    canvas->flush();
    delay(50);
  }

  // オフセットとスケーリングを計算
  calOffX = (maxX + minX) / 2.0f;
  calOffY = (maxY + minY) / 2.0f;
  calSclX = (maxX - minX) / 2.0f;  if (calSclX < 0.01f) calSclX = 1.0f;
  calSclY = (maxY - minY) / 2.0f;  if (calSclY < 0.01f) calSclY = 1.0f;

  // NVS に保存（電源切断後も消失しない）
  prefs.begin("compass", false);
  prefs.putFloat("offX", calOffX);  prefs.putFloat("offY", calOffY);
  prefs.putFloat("sclX", calSclX);  prefs.putFloat("sclY", calSclY);
  prefs.end();

  // キャリブレーション結果画面
  canvas->fillScreen(C_BG);
  canvas->setTextColor(0x07E0); canvas->setTextSize(2);
  canvas->setCursor(30, 88); canvas->print("CAL DONE!");
  canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
  char b[44];
  sprintf(b, "offX = %.1f", calOffX); canvas->setCursor(10, 120); canvas->print(b);
  sprintf(b, "offY = %.1f", calOffY); canvas->setCursor(10, 133); canvas->print(b);
  sprintf(b, "sclX = %.1f", calSclX); canvas->setCursor(10, 148); canvas->print(b);
  sprintf(b, "sclY = %.1f", calSclY); canvas->setCursor(10, 161); canvas->print(b);
  canvas->flush();
  delay(3000);
}

// ─────────────────────────────────────────────
//  NVS から前回保存したキャリブレーションデータを読み込み
// ─────────────────────────────────────────────
void loadCalibration() {
  prefs.begin("compass", true);
  calOffX = prefs.getFloat("offX", 0.0f);
  calOffY = prefs.getFloat("offY", 0.0f);
  calSclX = prefs.getFloat("sclX", 1.0f);
  calSclY = prefs.getFloat("sclY", 1.0f);
  prefs.end();
  if (calSclX < 0.01f) calSclX = 1.0f;
  if (calSclY < 0.01f) calSclY = 1.0f;
  Serial.printf("[CAL] off=(%.2f, %.2f)  scl=(%.2f, %.2f)\n",
                calOffX, calOffY, calSclX, calSclY);
}

// ─────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TFT_BL, OUTPUT); digitalWrite(TFT_BL, HIGH);  // バックライト点灯
  pinMode(CAL_BTN, INPUT_PULLUP);

  gfx->begin();
  canvas->begin();       // フレームバッファ割り当て、ここで約 115 KB のメモリを消費

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000); // 400 kHz ファストモード、I2C 読み取り遅延を低減

  if (!mag.begin()) {
    // センサーが見つからない場合、画面に赤いエラーメッセージを表示
    canvas->fillScreen(0xF800);
    canvas->setTextColor(0xFFFF); canvas->setTextSize(2);
    canvas->setCursor(10, 100); canvas->print("SENSOR ERROR");
    canvas->setCursor(10, 125); canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(500);
  }

  loadCalibration();

  // 電源投入時に BOOT(GPIO0) を押し続ける → 回転キャリブレーションに入る
  if (digitalRead(CAL_BTN) == LOW) {
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR); canvas->setTextSize(1);
    canvas->setCursor(10, 112); canvas->print("Release to start cal...");
    canvas->flush();
    while (digitalRead(CAL_BTN) == LOW) delay(10);
    delay(500);
    runCalibration();
  }

  // 最初の数回の不安定なウォームアップ読み取りを破棄
  for (int i = 0; i < 8; i++) {
    sensors_event_t ev; mag.getEvent(&ev); delay(15);
  }
  gSmooth    = readHeading();
  gFirstRead = false;
}

// ─────────────────────────────────────────────
//  Loop：読み取り → フィルタリング → レンダリング、ループ約 25fps
// ─────────────────────────────────────────────
void loop() {
  float raw = readHeading();
  gSmooth   = emaFilter(raw);
  drawFrame(gSmooth);
  delay(30);  // 30ms ≈ 33fps、実際のレンダリング時間を加えると約 25fps
}
```

### コードの説明

**なぜ Canvas を使うのか？** `Arduino_Canvas` はメモリ内に 115KB の「下書き用紙」を確保し、フレーム全体を描画完了後に `canvas->flush()` で画面へ一括プッシュします。画面に直接描画すると、每一筆が即座に表示され、針の回転時にちらつきが目立ちます。Canvas はこの問題を解決しますが、代償としてメモリを多く消費します。

**`readHeading()` は何をしているか？** センサーから取得した X/Y 磁場強度からハードアイアンオフセットを減算し（固定磁場干渉を除去）、さらにソフトアイアンスケーリング係数で除算し（各軸の感度不一致を補正）、最後に磁気偏角補正を加えて真北方向の角度を求めます。

**`emaFilter()` なぜ環状処理が必要か？** 針が 359° から 1° に移動する場合、二つの読み取り値の差は -358° になります。そのまま加重平均すると、針が逆方向に大きく回転してしまいます。コード内では差分を [-180°, +180°] の範囲に制限してから平滑化することで、0° をまたぐ場合を正しく処理しています。

**キャリブレーションの原理は？** 水平面内で 1 回転すると、センサーの X/Y 読み取り値が楕円を描きます（理想的には円）。最大値と最小値を記録し、中点がハードアイアンオフセット、半径がソフトアイアンスケーリング係数になります。キャリブレーション完了後、データは NVS（スマホの EEPROM のようなもの）に保存され、次回の電源投入時に自動的に読み込まれるため、毎回再キャリブレーションする必要はありません。

---

## よくある問題のトラブルシューティング

慌てないでください。問題の 90% は以下の箇所にあります。

**画面が真っ黒または真っ白で、何も表示されない。** まず BL（バックライト）ピンが High レベルになっているか確認——GPIO7 に接続している場合、コード内に `digitalWrite(TFT_BL, HIGH)` があることを確認してください。3.3V に直結している場合、バックライトは常に点灯しているはずで、真っ暗なら他のピンに問題があります。次に配線表に従って CS、DC、RST が正しい GPIO に接続されているか 1 本ずつ確認してください。CS と DC の逆接続は高頻度のミスです。

**シリアルモニタに `SENSOR ERROR` と表示され、画面に赤いエラーが表示される。** 磁力計が応答していません。ほとんどは I2C 配線の問題——SDA/SCL が逆になっているか、異なる GPIO に接続されています。`Wire.begin(13, 14)` が実際の配線ピンと一致していることを確認してください。もう一つの可能性はモジュールに 3.3V 電源が供給されていないことで、テスターで VCC ピンの電圧を測定してください。

**針が乱れて飛び回る、まったく合わない、またはずっと同じ方向で動かない。** 最も可能性の高い原因は、モジュールが QMC5883L（0x0D）なのに、コードで HMC5883L のライブラリを使っていること——二つのライブラリはレジスタ定義が全く異なり、読み出される値は乱れたものになります。まず I2C スキャンでアドレスを確認し、0x0D の場合は、コード内の `#include <Adafruit_HMC5883_U.h>` とセンサーオブジェクトを QMC5883LCompass ライブラリの書き方に変更する必要があります。Web 上に既存の適応例があります。

**キャリブレーションが完了したのに、方向がまだ 10°~20° ずれている。** `DECLINATION_DEG` をお住まいの都市の値に変更したか確認してください。このパラメータが 5° 違うだけで、すべての方向が系統的にずれます。東京は約 -7.5°、北京は約 -6.5°、正確な値は文末の NOAA ツールで検索してください。もう一つの原因は、キャリブレーション時に周囲に強い磁場（スマホ、ドライバー、スピーカーの磁石）があったことで、広い場所に移動して再度キャリブレーションしてください。

**コンパイルエラー `Adafruit_HMC5883_U.h: No such file or directory`。** ライブラリがインストールされていないか、間違ったものがインストールされています。Arduino IDE → ツール → ライブラリを管理を開き、`HMC5883` で検索し、Adafruit HMC5883 Unified とその依存関係である Adafruit Unified Sensor をインストールしてください。

---

## FAQ

**Q：HMC5883L と QMC5883L の違いは？同じライブラリでドライブできる？**
A：混用はできません。両者はピン互換（実装すると外形は同じ）ですが、内部レジスタアドレスが異なり、ドライバプロトコルも異なります。間違ったライブラリを使うと読み出される値はすべて無意味な数値になります。HMC5883L の I2C アドレスは 0x1E、QMC5883L は 0x0D で、I2C スキャンですぐに確認できます。

**Q：BL バックライトピンは直接 3.3V に接続できる？GPIO に接続しないとダメ？**
A：直接 3.3V に接続しても全く問題ありません。ディスプレイは常に点灯したままになります。GPIO で制御する利点は、コード内で輝度を制御したり、スリープ時にバックライトをオフにして省電力にできることです。これらの機能が必要ない場合は、3.3V に接続すれば GPIO を 1 つ節約できます。

**Q：`DECLINATION_DEG` の正確な値を自分の都市で調べるには？**
A：NOAA が提供する磁気偏角計算ツール（文末の参考資料を参照）を使用し、お住まいの都市の座標を入力、Model で WMM を選択すると、現在の日付の正確な磁気偏角が表示されます。東偏が正の値、西偏が負の値です。日本の東部の都市は一般的に -7° から -8° の間、中国東部沿岸は約 -5° から -6° です。

**Q：`EMA_ALPHA` を大きくまたは小さくするとどう違う？**
A：alpha が大きいほど針の応答が速くなりますが、振動しやすくなります。小さいほど針は滑らかになりますが、回転時に顕著な遅延感があります。0.15 は卓上に平置きする場面に適しています。手持ちで歩き回る場合は 0.25 ~ 0.3 に調整できます。値の範囲は 0.0（完全に動かない）から 1.0（フィルタなし、生の値）です。

**Q：キャリブレーションデータはどこに保存される？別のパソコンでコードを再書き込みしても残る？**
A：キャリブレーションデータは ESP32 の NVS（不揮発性ストレージ、EEPROM のようなもの）に保存されます。新しいコードを書き込んでも NVS はクリアされず、次回の電源投入時に自動的に読み込まれます。「Flash 全消去」操作を実行した場合にのみ消失し、その際は再度キャリブレーションが必要です。

**Q：115 KB のフレームバッファは大きすぎない？ESP32-C3 でも使える？**
A：ESP32-S3 は 512KB SRAM を搭載しており、115KB は問題ありません。ESP32-C3 は 400KB SRAM のみで、コードとスタックを含めるとかなり厳しくなります。PSRAM 搭載版を使用するか、より小さいサイズのディスプレイに変更することをお勧めします。オリジナルの ESP32（WROOM / WROVER）は SRAM がさらに少なく、WROVER 版は PSRAM 搭載なので使用可能ですが、PSRAM なしの WROOM 版は OOM クラッシュの可能性が高いです。

**Q：なぜコンパスとスマホで十数度の差がある？正常？**
A：この構成では、十数度の差は完全に正常な現象であり、バグではありません。HMC5883L/QMC5883L は干渉のある実際の環境では、±10°~±15° が一般的な誤差範囲です。誤差が ±5° 以内に安定していれば、キャリブレーションは良好と言えます。誤差をさらに小さくするには、より高精度なセンサーに交換し、9 軸フュージョンを導入する必要があり、パラメータ調整だけでは不十分です。

**Q：この構成で本格的なナビゲーションや方位制御製品を作れる？**
A：おすすめしません。精度は ±5°~±15° のみで、周囲の磁場環境の影響を大きく受け、傾き補償もありません——厳密に水平に設置しないと、誤差が顕著に増大します。デモ、原理の学習、卓上オブジェとしては完全に十分です。実際のナビゲーション精度が必要な場面では、ICM-20948 のようなハードウェアセンサーフュージョン搭載の構成への変更をお勧めします。

---

## HMC5883L は本格的なプロジェクトに適しているか？

結論から言うと：適していません。

実験デモには問題ありません。ドライバの学習、Maker プロジェクトの展示、卓上オブジェ——すべて可能です。しかし、本当に方向感知を必要とする製品を作る場合、この構成には乗り越えられない 3 つの問題があります。

第一に、傾き補償がないこと。モジュールが水平でなくなると、方位角誤差が急速に増加——20° 傾くだけで 10° を超える方向偏差が生じます。iPhone は加速度計でこの誤差をリアルタイムに補償していますが、このモジュール単体では不可能で、追加で MPU6050 を接続しアルゴリズムを修正する必要があります。

第二に、環境磁場の影響が深刻なこと。近くのパソコン電源、USB ケーブル、金属スタンドが読み取り値を汚染します。しかもこの種の干渉は動的であり、一度キャリブレーションして NVS に保存しても、移動中にリアルタイムに変化する磁場を補償することはできません。

第三に、市販モジュールの品質にばらつきがあること。ほとんどは QMC5883L 互換品で、オリジナル HMC5883L のオンチップ温度ドリフト補償がなく、温度変化時に読み取り値がドリフトします。

もしプロジェクトに信頼性の高い方向感知が必要な場合、より適切な選択は ICM-20948（9 軸センサー + ハードウェア DMP フュージョン統合）、または GPS モジュールと 2 点の座標から方位を計算するアプローチです——精度と安定性は比べ物になりません。

このプロジェクトの正しい位置づけは、小さいながらも一通りの機能を備えた学習サンプルです。「磁力計ドライバ → ハードアイアンキャリブレーション → フィルタリング → ディスプレイ」の完全な流れを一度経験でき、この知識はより良いセンサーに応用してもそのまま通用します。

---

## 応用アイデア

基本版が完成したら、以下の方向でさらに探索できます。

MPU6050 6 軸センサーを 1 つ追加し、加速度計データを読み取って傾き補償を行います。これは先ほど触れた最大の制限の一つ——現在のバージョンは 2D 磁場のみで、デバイスが少し傾くだけで顕著な誤差が生じます。傾き補償を追加すれば、立てて持っても精度を維持でき、これこそが iPhone のコンパスが安定している中核的な理由の一つです。これは本プロジェクトを「おもちゃから実用レベルにアップグレード」するための最も価値のあるステップです。

SD カードモジュールを接続し、LVGL または自作の地図にコンパスの方向を重ねて、オフラインナビゲーターを作ります。円形ディスプレイの表示面積は限られていますが、現在の向きと目標方向の矢印を表示するには十分です。

方位角データを Wi-Fi 経由で MQTT broker にプッシュし、Home Assistant や自作のダッシュボードに統合して、卓上方向感知センサーとして利用します。ドアや窓の向きの判定、アンテナの方向合わせに活用できます。

---

## 参考資料

- HMC5883L オリジナルデータシート（Honeywell）：https://cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf
- QMC5883L データシート（QST）：https://datasheetspdf.com/pdf/1309218/QST/QMC5883L/1
- Arduino_GFX_Library GitHub：https://github.com/moononournation/Arduino_GFX
- Adafruit_HMC5883_U GitHub：https://github.com/adafruit/Adafruit_HMC5883_U
- ESP32-S3 製品ページ（Espressif）：https://www.espressif.com/en/products/socs/esp32-s3
- 磁気偏角検索ツール（NOAA）：https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
