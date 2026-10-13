---
title: "ESP32-S3 で 4.26インチ SSD1677 EPD0426A02 電子ペーパーを駆動してポンツォ錯視（回廊錯視）アニメを再生｜SPI + GxEPD2 完全チュートリアル"
boardId: esp32s3
moduleId: display/epd-4inch26-epd0426a02
category: esp32
date: 2026-10-13
intro: "ESP32-S3 から SPI で EPD0426A02（800×480、SSD1677 搭載）電子ペーパーを駆動し、GxEPD2 の部分更新でポンツォ錯視（回廊錯視）の 4 フレームアニメを再生。配線、Arduino コード、文字化け・白紙トラブルの対処法まで完全収録。"
image: "https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg"
---

> **一言まとめ**：線を 8 本つなぎ、ライブラリを 2 つ入れ、スケッチを 1 つ書き込むだけで、ESP32-S3 が 4.26 インチ電子ペーパー上でポンツォ錯視アニメを自動再生——ついでに電子ペーパー最強の実用スキル「部分更新」もマスターできます。

```
難易度：⭐⭐☆☆☆（VCC を 5V に挿さなければ初心者でもOK）
所要時間：40 分（配線 10 分 + 環境構築 15 分 + 書き込み&鑑賞 15 分）
検証環境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + GxEPD2 1.6.9
```

> **TL;DR（クイックスタート）：**
>
> 1. 配線：MOSI → GPIO11、SCK → GPIO12、CS → GPIO10、DC → GPIO9、RST → GPIO8、BUSY → GPIO7
> 2. VCC は 3.3V へ（5V を挿すとパネルが壊れます。どうして知ってるかは聞かないで）
> 3. ライブラリを 2 つインストール：GxEPD2（≥ 1.5.3）+ Adafruit_GFX（GxEPD2 と一緒に自動インストール）
> 4. ボードは「ESP32S3 Dev Module」を選択して書き込み。あとは脳がだまされるのを待つだけ

---

## はじめに：人類を 100 年以上だまし続ける回廊

きっと見たことがあるはずです。まったく同じ長さの 2 本の線分なのに、回廊の遠近線（パース線）を描き足すと、奥にある方が長く見えてしまう——あの図です。等しいと分かっていても目が絶対に認めない。これが古典的なポンツォ錯視で、脳が自動的に「遠近補完」モードに入り、「遠く」を「大きい」と翻訳してしまうのが原因です。

ずっとこの錯視を手作りで「実体化」する機会をうかがっていました。ちょうど手元に 4.26 インチの EPD0426A02 電子ペーパー（800×480、SSD1677 搭載）と ESP32-S3 があったので挑戦です。「ゆっくり変わり、電源を切っても画面が残る」という電子ペーパーの気質は、錯視デモと最高の相性——観客には人生を疑う十分な時間が与えられ、終わったら電源を抜いて机に置いたまま、次の来客をだまし続けられます。

この記事ではゼロから全部やります：線を 8 本つなぎ、ライブラリを 2 つ入れ、コードを 1 本書き込んで、この電子ペーパーにあなたの脳へ授業をさせましょう。途中で電子ペーパー最も実用的なスキル——部分更新——も一気に極めます。

## 完成イメージ

書き込みが完了すると、画面は約 40 秒の 4 フレームアニメを自動再生します：まず「この 2 本の線分は同じ長さ？」と問いかけ、答えを発表し、最後は回廊錯視の画面で停止します（MCU はアイドル状態。手動リセットするまで画面は保持されます）。

![](https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg)

4 フレームの絵コンテは以下の通り。フレーム間は部分更新で遷移し、線分自体は微動だにしません：

| フレーム | 画面内容                                                     | 表示時間 |
| -------- | ------------------------------------------------------------ | -------- |
| 1        | 線分 A と B のみ、"Are these two lines the same length?"     | 7 秒     |
| 2        | 水平な点線の補助線が重なる、"Yes - exactly equal."           | 7 秒     |
| 3        | パース線登場、"And now?"                                     | 10 秒    |
| 4        | 補助線 + パース線が共存、"Same lines - your brain was fooled." | 7 秒   |
| フィナーレ | 錯視画面のみ + 大きなタイトル "Ponzo illusion"、その後アイドル | 保持   |

![](https://img.lingflux.com/2026/10/68b443e3994d10b40d287b13965c7c93.jpg)

## 部品解説

### EPD0426A02 電子ペーパー — 電源を切っても「記憶」する電子黒板

EPD0426A02 は深圳の Osptek（奧斯瑞光電）製の 4.26 インチ電子ペーパーモジュールで、ESP32-S3 から送られた画像データを画面に「印刷」する役割を担います。このプロジェクトでは 4 フレームの錯視アニメを再生し、長期間画面を保持するのが仕事です。

平たく言えば、Kindle の画面の親戚——「電子黒板」です。字を書いて電源を切っても字は残り、内容を変えたければ全面を「消して書き直す」（だから電子ペーパーは更新時に何度か点滅する）。更新が遅いのはキャラ設定、電力を食わないのが本領です。

主な仕様：

| 項目             | 仕様                                                        |
| ---------------- | ----------------------------------------------------------- |
| サイズ / 解像度  | 4.26 インチ、800 × 480（横画面）、219 DPI                   |
| ドライバー IC    | SSD1677（960 source × 680 gate コントローラー、SPI 接続）   |
| 表示能力         | 白黒双安定、ネイティブ 4 階調（2 bit/px）                   |
| インターフェース | 24-pin FPC、4 線 SPI（書き込み専用）                        |
| 更新時ピーク電流 | 約 50 mA                                                    |
| ディープスリープ電流 | 約 3 µA（画面保持は無消費）                             |
| 設計寿命         | 5 年 / 100 万回更新（25 ℃ / 60%RH）                         |

なぜこれを選んだか？800×480 はこのサイズの電子ペーパーでは高精細で、パース線が十分にシャープに描けます。3 µA のディープスリープなら「演じ終わったら電源を抜いて置きっぱなしで人をだます」という使い方でも電力の心配ゼロ。しかも GxEPD2 が v1.5.3 からネイティブサポート（ドライバークラス `GxEPD2_426_GDEQ0426T82`）しているので、ドライバーを自分で書く必要がありません。

### ピン説明

EPD0426A02 の変換基板からは 8 本のピンが出ていて、それぞれ役割があります：

| ピン       | 役割                                                  |
| ---------- | ----------------------------------------------------- |
| VCC        | 3.3V 電源（⚠️ 絶対に 5V に挿さないこと）               |
| GND        | グラウンド共通。ボードと同じ言語を話すための基盤      |
| MOSI (DIN) | SPI データ。マイコンからパネルへピクセルを送る        |
| SCK (SCL)  | SPI クロック。1 bit をどの速さで送るかの約束          |
| CS         | チップセレクト。LOW =「このバスは君のもの」           |
| DC         | データ / コマンド切替：HIGH=ピクセルデータ、LOW=コマンド |
| RST        | ハードウェアリセット。初期化前に一度トグル            |
| BUSY       | ビジー信号：HIGH = 更新中、話しかけないで             |

ひとつ注意：このパネルの BUSY は **HIGH アクティブ**（ビジー=HIGH）なのに、ピン名が `BUSY_N` と書かれていることが多く、直感と真逆です。幸い GxEPD2 がこの落とし穴を埋めてくれているので、「そういうもの」と知っておけばOKです。

## BOM リスト

| No. | 部品             | 型番 / 仕様                                               | 数量 | 備考                                |
| --- | ---------------- | --------------------------------------------------------- | ---- | ----------------------------------- |
| 1   | 開発ボード       | ESP32-S3（ESP32-S3-DevKitC / Arduino Nano ESP32 どちらも可） | 1  | USB シリアル変換内蔵でOK            |
| 2   | 電子ペーパーモジュール | EPD0426A02（SSD1677、800×480）                        | 1    | 変換基板付き、8 本のピンヘッダー    |
| 3   | ジャンパーワイヤ | メス-メスまたはオス-オス                                  | 8    | 信号 6 本 + 電源・GND               |
| 4   | USB ケーブル     | Type-C または Micro（ボード次第）                         | 1    | 給電 + 書き込み                     |

## 配線

![](https://img.lingflux.com/2026/10/3ae30dc6faad42836102413a774bc830.jpg)

配線図が本命、表は確認用です：

| 電子ペーパーピン | ESP32-S3 GPIO | 説明                     |
| ---------------- | ------------- | ------------------------ |
| VCC              | 3V3           | ⚠️ 3.3V。5V はパネル破壊  |
| GND              | GND           | どの GND でも可          |
| MOSI (DIN)       | GPIO11        | SPI データ               |
| SCK (SCL)        | GPIO12        | SPI クロック             |
| CS               | GPIO10        | チップセレクト           |
| DC               | GPIO9         | データ/コマンド          |
| RST              | GPIO8         | リセット                 |
| BUSY             | GPIO7         | ビジー信号（入力）       |

**配線後は 1 本ずつ再確認してください。デバッグ時間の 80% が節約できます。** 電子ペーパーは配線を間違えてもエラーも煙も出ず、ただ黙って白い画面か乱れた画面を見せるだけ——コードのせいか配線のせいか区別がつきません。もうひとつ注意：ESP32-S3 の Arduino フレームワークでのデフォルト I2C ピンは GPIO8（SDA）と GPIO9（SCL）で、このスケッチでは RST と DC に割り当てています。パネルを接続した状態で I2C デバイスを使う場合は `Wire.begin(SDA, SCL)` で他の空き GPIO に再割り当てしてください。

**Arduino Nano ESP32** を使う場合、シルク印刷の D4~D7、A4/A5 は実際の GPIO 番号ではありません。対応表は以下の通り：

| 電子ペーパーピン | 実際の GPIO | Nano ESP32 シルク |
| ---------------- | ----------- | ----------------- |
| MOSI             | GPIO11      | A4                |
| SCK              | GPIO12      | A5                |
| CS               | GPIO10      | D7                |
| DC               | GPIO9       | D6                |
| RST              | GPIO8       | D5                |
| BUSY             | GPIO7       | D4                |

## インストールするライブラリ

Arduino IDE → ツール → ライブラリを管理 を開いて、以下をインストール：

| ライブラリ   | 作者              | バージョン要件                                      | 役割                     |
| ------------ | ----------------- | --------------------------------------------------- | ------------------------ |
| esp32        | Espressif Systems | 3.3.10（Arduino IDE 2.3.x で実機検証済み）          | ESP32-S3 ボードサポート  |
| GxEPD2       | Jean-Marc Zingg   | **1.6.9**（`GxEPD2_426_GDEQ0426T82` ドライバークラスを含む） | 電子ペーパードライバー |
| Adafruit_GFX | Adafruit          | GxEPD2 と一緒に自動インストール                     | 描画 API（線・フォント） |

インストール後、ボードに **ESP32S3 Dev Module**（ツール → ボード）を選択し、シリアルポートをつなげば書き込めます。

## 完全なコード

そのままコピーして書き込めばOKです（プロジェクト内の `arduino/GxEPD2_CorridorIllusion/GxEPD2_CorridorIllusion.ino` に対応）：

```cpp
/*
 * EPD0426A02 (4.26" 480x800 SPI 電子ペーパー, SSD1677) — 回廊錯視 (ポンツォ錯視) デモ
 * ボード: ESP32-S3 (Arduino IDE で "ESP32S3 Dev Module" を選択)
 * ドライバーライブラリ: GxEPD2、内蔵ドライバークラス GxEPD2_426_GDEQ0426T82 を使用
 *
 * ピン定義は参考例と完全一致:
 *   BUSY -> GPIO7    DC -> GPIO9     CS -> GPIO10
 *   SCK  -> GPIO12   MOSI -> GPIO11  RST -> GPIO8
 *
 * 演出シーケンス (1 回きり、ループなし):
 *   フレーム 1: 等長の太線 A・B のみ          "Are these two lines the same length?"
 *   フレーム 2: 水平点線の補助線を追加        "Yes - exactly equal."
 *   フレーム 3: 線分はそのまま、回廊パース線  "And now?"
 *   フレーム 4: パース + 補助線、答え合わせ   "Same lines - your brain was fooled."
 *   最後にフレーム 3 (錯視画面) に戻って保持
 *
 * 画面は横 800x480 (rotation 0 = コントローラーのネイティブ方向)。
 */

#include <Arduino.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>

// ---------------- ピン定義 (ESP-IDF プロジェクトの board_pins.h と一致) ----------------
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_SCK  12
#define EPD_MOSI 11

// 全画面バッファモード (page_height = HEIGHT, 48000 バイト)
GxEPD2_BW<GxEPD2_426_GDEQ0426T82, GxEPD2_426_GDEQ0426T82::HEIGHT> display(
  GxEPD2_426_GDEQ0426T82(/*CS=*/EPD_CS, /*DC=*/EPD_DC, /*RST=*/EPD_RST, /*BUSY=*/EPD_BUSY));

// ---------------- 画面ジオメトリ (800x480 横画面) ----------------
static const int16_t W = 800;
static const int16_t H = 480;

static const int16_t VPX = 700, VPY = 240;   // 消失点 (vanishing point), 左の回廊
static const int16_t VP2X = 1600, VP2Y = 240; // 第 2 消失点 (画面右の遥か彼方), 右壁パース線用
static const int16_t VP0X = -900, VP0Y = 260; // 第 3 消失点 (画面左の遥か彼方), 左壁パース線用
static const int16_t XN  = 150;              // 手前の壁角 x (線分 A)
static const int16_t XF  = 520;              // 奥の壁角 x (線分 B)
static const int16_t Y1  = 190;              // 線分の上端
static const int16_t Y2  = 290;              // 線分の下端 (両線分とも長さ 100px)

static const int16_t SEG_W = 6;              // 線分の太さ
static const uint32_t FRAME_MS  = 7000;      // 各フレームの表示時間
static const uint32_t FRAME3_MS = 10000;      // フレーム 3 は少し長め

// 実験: データシートは VCOM 制御レジスタ (0x2B) に 0x04, 0x63 の固定書き込みを要求。
// GxEPD2 ドライバーは送信しないので手動で補う
// (display.init() の後に呼ぶこと。SWRESET でこのレジスタが消去されるため)
static void epdWriteVCOMControl()
{
  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));
  digitalWrite(EPD_CS, LOW);
  digitalWrite(EPD_DC, LOW);
  SPI.transfer(0x2B);
  digitalWrite(EPD_DC, HIGH);
  SPI.transfer(0x04);
  SPI.transfer(0x63);
  digitalWrite(EPD_CS, HIGH);
  SPI.endTransaction();
}

// 点 (px, py) から消失点 (vpx, vpy) に向かう直線上で、x 座標が x の点の y 値
static int16_t onLineYVP(int16_t x, int16_t px, int16_t py, int16_t vpx, int16_t vpy)
{
  float t = (float)(x - px) / (float)(vpx - px);
  return (int16_t)(py + (vpy - py) * t);
}

// 左の回廊: 消失点 VP に向かう
static int16_t onLineY(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VPX, VPY);
}

// 右壁: 第 2 消失点 VP2 に向かう
static int16_t onLineY2(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP2X, VP2Y);
}

// 左壁: 第 3 消失点 VP0 に向かう
static int16_t onLineY0(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP0X, VP0Y);
}

// ---------------- 描画要素 ----------------

// 2 本の線分 —— 全フレームで完全に同じ座標と太さ
static void drawSegments()
{
  display.fillRect(XN - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // 線分 A
  display.fillRect(XF - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // 線分 B

  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(XN - 34, Y2 + 30);
  display.print("A");
  display.setCursor(XF + 16, Y2 + 30);
  display.print("B");
}

// 水平点線の位置合わせ補助線。両線分の端点が同一水平線上にあることの証明
static void drawGuides()
{
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    for (int16_t x = 0; x < W; x += 12)
    {
      display.drawFastHLine(x, ys[i], 6, GxEPD_BLACK);
    }
  }
}

// 回廊のパース線
static void drawPerspective()
{
  const int16_t topX = XN, topY = 40;    // 手前の壁角・上端
  const int16_t botX = XN, botY = 440;   // 手前の壁角・下端

  int16_t ftY = onLineY(XF, topX, topY); // 奥の壁角・上端 y
  int16_t fbY = onLineY(XF, botX, botY); // 奥の壁角・下端 y

  // 天井 / 床 (2px)
  display.drawLine(topX, topY, XF, ftY, GxEPD_BLACK);
  display.drawLine(topX, topY + 1, XF, ftY + 1, GxEPD_BLACK);
  display.drawLine(botX, botY, XF, fbY, GxEPD_BLACK);
  display.drawLine(botX, botY - 1, XF, fbY - 1, GxEPD_BLACK);

  // 手前の壁角 (2px) / 奥の壁角 (1px)
  display.drawLine(XN, topY, XN, botY, GxEPD_BLACK);
  display.drawLine(XN + 1, topY, XN + 1, botY, GxEPD_BLACK);
  display.drawLine(XF, ftY, XF, fbY, GxEPD_BLACK);

  // 線分の上下端を通る水平パース線 (奥の壁まで貫通)
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XF, onLineY(XF, XN, ys[i]), GxEPD_BLACK);
  }

  // 縦の区切り (壁のレンガ目地)
  static const int16_t divX[] = {260, 350, 420, 470, 500};
  for (uint8_t i = 0; i < sizeof(divX) / sizeof(divX[0]); i++)
  {
    int16_t x = divX[i];
    display.drawLine(x, onLineY(x, topX, topY), x, onLineY(x, botX, botY), GxEPD_BLACK);
  }

  // ---- 右壁: 奥の壁角 (XF) から画面右端へ、第 2 消失点 VP2 へ収束 ----
  const int16_t XR = W - 1;

  // 天井線 / 床線 (右端まで続ける)
  display.drawLine(XF, ftY, XR, onLineY2(XR, XF, ftY), GxEPD_BLACK);
  display.drawLine(XF, fbY, XR, onLineY2(XR, XF, fbY), GxEPD_BLACK);

  // 線分の上下端を通る水平線を右壁でも延長
  for (int i = 0; i < 2; i++)
  {
    int16_t yAtXF = onLineY(XF, XN, ys[i]); // 左壁パース線が奥の壁角に達した時点の y
    display.drawLine(XF, yAtXF, XR, onLineY2(XR, XF, yAtXF), GxEPD_BLACK);
  }

  // 右壁の縦区切り (レンガ目地)、天井線と床線を結ぶ
  static const int16_t divXR[] = {600, 660, 710, 750, 780};
  for (uint8_t i = 0; i < sizeof(divXR) / sizeof(divXR[0]); i++)
  {
    int16_t x = divXR[i];
    display.drawLine(x, onLineY2(x, XF, ftY), x, onLineY2(x, XF, fbY), GxEPD_BLACK);
  }

  // ---- 左壁: 手前の壁角 (XN) から画面左端へ、第 3 消失点 VP0 へ収束 ----
  const int16_t XL = 0;

  // 天井線 / 床線 (左端まで続ける)
  display.drawLine(XN, topY, XL, onLineY0(XL, XN, topY), GxEPD_BLACK);
  display.drawLine(XN, botY, XL, onLineY0(XL, XN, botY), GxEPD_BLACK);

  // 線分の上下端を通る水平線を左壁でも延長
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XL, onLineY0(XL, XN, ys[i]), GxEPD_BLACK);
  }

  // 左壁の縦区切り (レンガ目地)
  static const int16_t divXL[] = {30, 80, 120};
  for (uint8_t i = 0; i < sizeof(divXL) / sizeof(divXL[0]); i++)
  {
    int16_t x = divXL[i];
    display.drawLine(x, onLineY0(x, XN, topY), x, onLineY0(x, XN, botY), GxEPD_BLACK);
  }
}

// 上部テキスト
static void drawTitle(const char *text)
{
  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(20, 34);
  display.print(text);
}

// 最終保持フレームの大タイトル: より大きなフォントで上部中央に
// (上部中央は天井線より上なのでパース線と重ならない)
static void drawTitleBig(const char *text)
{
  display.setFont(&FreeSansBold18pt7b);
  display.setTextColor(GxEPD_BLACK);
  int16_t tbx, tby;
  uint16_t tbw, tbh;
  display.getTextBounds(text, 0, 0, &tbx, &tby, &tbw, &tbh);
  display.setCursor((W - tbw) / 2 - tbx + 200, 48 - tby); // ベースラインは y=48 付近
  display.print(text);
}

// フレーム番号で全画面を描画 (1..4)。常に全ウィンドウ絶対座標で描く
static void drawFrame(uint8_t frame)
{
  display.fillScreen(GxEPD_WHITE);
  switch (frame)
  {
    case 1:
      drawTitle("Are these two lines the same length?");
      break;
    case 2:
      drawTitle("Yes - exactly equal.");
      drawGuides();
      break;
    case 3:
      drawTitle("And now?");
      drawPerspective();
      break;
    case 5: // 最終保持フレーム: 錯視画面 + 大タイトル。"And now?" なし
      drawTitleBig("Ponzo illusion");
      drawPerspective();
      break;
    case 4:
    default:
      drawTitle("Same lines - your brain was fooled.");
      drawPerspective();
      drawGuides();
      break;
  }
  drawSegments(); // 毎フレーム最後に描く。座標は永遠に不変
}

// 全画面更新で 1 フレーム表示
static void showFrameFull(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.display(); // 全画面更新
}

// 部分更新で 1 フレーム表示: 全ウィンドウに描画し、displayWindow() で変化領域だけ更新
// (画面全体のウィンドウ = 全画面の部分更新)
static void showFramePartial(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.displayWindow(0, 0, W, H);
}

void setup()
{
  Serial.begin(115200);
  delay(500);
  Serial.println("[EPD] EPD0426A02 Corridor Illusion (GxEPD2 / GDEQ0426T82)");

  // ESP32 カスタム SPI ピンマッピング: SCK, MISO(-1 = 未使用), MOSI, SS
  SPI.begin(EPD_SCK, -1, EPD_MOSI, EPD_CS);

  display.init(115200);
  display.setRotation(0); // ネイティブ横画面 800x480
  display.setTextColor(GxEPD_BLACK);

  epdWriteVCOMControl(); // 0x2B VCOM 制御レジスタを補完送信

  // ---- 1 回きりの演出: フレーム 1 -> 2 -> 3 -> 4 ----
  // フレーム 1: 全画面更新で開幕
  showFrameFull(1);
  Serial.println("[EPD] frame 1 (full refresh)");
  delay(FRAME_MS);

  // フレーム 2 -> 3 -> 4: 部分更新。線分は微動だにしない
  showFramePartial(2);
  Serial.println("[EPD] frame 2 (partial)");
  delay(FRAME_MS);

  showFramePartial(3);
  Serial.println("[EPD] frame 3 (partial)");
  delay(FRAME3_MS);

  showFramePartial(4);
  Serial.println("[EPD] frame 4 (partial, reveal)");
  delay(FRAME_MS);

  // 最後は錯視画面で保持 (フレーム 5: 回廊 + 大タイトル "Ponzo illusion"、"And now?" なし)
  showFramePartial(5);
  Serial.println("[EPD] final frame 5 (illusion + title), hold");
  delay(1000);

  // デモ終了。画面はそのまま保持 (ディープスリープは使わない)
  Serial.println("[EPD] done, holding frame");
}

void loop()
{
  // 画面は保持済み。ここでは空転するだけ
}
```

### コード解説

300 行ちょっとのコード——長く見えますが、やっていることは 6 つだけです：

1. **ピンと表示オブジェクト（`#define` 群 + `GxEPD2_BW` 宣言）**：6 つのマクロが 6 本の信号線に対応。`GxEPD2_BW<..., HEIGHT>` は「全画面バッファモード」で、1 フレーム 48,000 バイトを丸ごと RAM に載せます。ESP32-S3 なら余裕です。ピンを変えたい？この 6 マクロを書き換えるだけ。
2. **4 フレームの絵コンテ（`drawFrame`）**：要は switch 表 1 枚。`drawSegments()` が switch の外にあって毎フレーム最後に描かれる点に注目——線分の座標は終始不変で、変わるのは周囲の補助線とパース線だけ。錯視を成立させる鉄の掟です。
3. **パース線の描き方（`drawPerspective` + 3 つの `onLineY` 関数）**：核心は中学校で習う 2 点を通る直線方程式 1 行。3 面の壁がそれぞれ自分の「消失点」（画面外の交点）に向かうことで、線に自然な奥行きが生まれます。消失点を画面外（VP2 は x=1600、VP0 は x=-900）に置くと、むしろパースが自然に見えます。
4. **部分更新（`showFramePartial` 内の `displayWindow`）**：まずメモリ上で全フレームを描き直し、変化したピクセルだけをパネルに送ります。フレーム 2 から 4 の間、画面上の線分は寸分も動かず、点滅するのは補助線とパース線だけ——これこそ全画面更新に対する部分更新の真髄：速い（1 回約 0.42 秒）、しかも目が痛くならない。
5. **0x2B VCOM パッチ（`epdWriteVCOMControl`）**：SSD1677 のデータシートは `0x2B` レジスタへの `0x04, 0x63` の書き込み（ACVCOM 反転時のグリッチ抑制）を要求していますが、GxEPD2 もメーカーデモもこのコマンドを送っていません。送り忘れた場合の結末は陰湿です：デモ終了後、VCC がつながっている限り、画面が数分スケールでじわじわ乱れていきます。ソフトウェアリセット（0x12）でこのレジスタが消去されるため、毎回 `display.init()` の後に再送が必須です。この落とし穴に丸一日ハマりました。詳しくは後述のトラブルシューティングをどうぞ。

## トラブルシューティング

慌てないで。問題の 90% はこの 5 か所にあります。上から順にチェック：

**1. 書き込み後、画面が真っ白で何も出ない**

人生を疑う前に、確率の高い順に：① 信号線 6 本に接触不良はないか（ジャンパーワイヤはブレッドボードに長く挿していると緩みます）；② VCC は本当に 3.3V か；③ 書き込み直後にシリアルモニタに `[EPD] frame 1` と出るか——シリアルに何も出ないならプログラムが動いていないので、パネルは無実です。電子ペーパーはエラーを吐きません。白い画面こそが彼らの「エラーメッセージ」です。

**2. コンパイルエラー：`'GxEPD2_426_GDEQ0426T82' does not name a type`**

GxEPD2 が 1.5.3 より古いです。ライブラリマネージャで GxEPD2 を最新版に更新してください。このドライバークラスは v1.5.3 から存在します。

**3. デモが終わった後、置いておくと画面がじわじわ乱れる（十数分スケール）**

例の 0x2B です。`epdWriteVCOMControl()` が毎回 `display.init()` の後に呼ばれているか確認してください——ソフトウェアリセットでこのレジスタは消去されます。init が先、補完送信が後。順番が逆だと送っていないのと同じです。正しく送れば、通電したままの放置画面も安定して保持されます。

**4. 画面の半分しか出ない、または上下がずれる**

十中八九、rotation か解像度の問題です。このスケッチは `setRotation(0)`（ネイティブ横画面 800×480）を使います。以前別のスケッチで rotation を 1 や 3 にしていたなら戻してください。なお ESP-IDF 側にはページ分割レンダリング版がありますが（メモリが厳しい場合用）、Arduino の全画面バッファモードにはこの問題はありません。

**5. 書き込み失敗 / シリアルポートが見つからない**

まずボードの BOOT ボタンを押しながら USB を挿してダウンロードモードに入ります。それでもダメならケーブルを交換——多くの「充電ケーブル」は電源線しか通っておらず、データ線がありません。私の書き込み人生で一番多い事故です。

## FAQ

**Q：普通の ESP32（S3 じゃない）や ESP32-C3 でも動く？**
A：動きます。コードに S3 専用機能は使っていないので、Arduino フレームワーク対応の ESP32 系なら何でもOK。ピンはボードの空き GPIO に付け替えるだけ。全画面バッファは約 48 KB の RAM が必要で、クラシック ESP32（SRAM 520 KB）でも十分足ります。

**Q：GPIO ピンを変えられる？やり方は？**
A：変えられます。コード冒頭の 6 つの `#define`（EPD_CS / EPD_DC / EPD_RST / EPD_BUSY / EPD_SCK / EPD_MOSI）を書き換えて、新しいピンに合わせて配線し直すだけ。ESP32-S3 では GPIO0/3/45/46 などの Strapping ピン、GPIO19/20（USB）、Flash/PSRAM に占有されているピンは避けてください。詳しくはボードの回路図を。

**Q：電子ペーパーの更新に数秒かかって何度か点滅するのは正常？**
A：全画面更新が遅いのは正常な物理特性です：更新のたびに 480 行のピクセルを全部「押し直す」必要があります。このパネルの全画面更新は実測約 2 秒（高速波形では約 1.5 秒）。点滅は残像を洗い流す標準手順で、故障ではありません。遅いと感じたらこのスケッチの部分更新（`displayWindow`）をどうぞ。実測 1 回約 0.42 秒で、ほとんど点滅しません。

**Q：電子ペーパーに 5V をつなげる？**
A：ダメです。EPD0426A02 の VCC は必ず 3.3V。上限が 3.3V です。5V を挿してもすぐ煙は出ませんが、パネル内部の高圧駆動回路が壊れ、数回使った後に部分的な表示乱れとして現れます——しかも保証対象外。点かなくてもいいから、5V だけはやめましょう。

**Q：デモ後に画面を放置するとじわじわ乱れる問題、根本的に直すには？**
A：SSD1677 の 0x2B レジスタに 0x04、0x63 の 2 バイトを書き込み（データシートの原文は "reduce glitch when ACVCOM toggle"）、ソフトウェアリセットのたびに再送します。スケッチの `epdWriteVCOMControl()` がまさにそれです。より物理的な解として P-MOSFET で VCC を切る手もありますが、ソフトウェアで 2 バイト送るだけで済むのに、はんだごてを出す必要はありません。

**Q：4 階調ってどういうこと？商品ページには 16 階調って書いてあったけど？**
A：SSD1677 のピクセルは物理的に白/黒の 2 つの安定状態しか持たず、データ経路は 2 bit/px。ネイティブでは 4 階調（黒/濃灰/薄灰/白）です。階調は波形テーブル（LUT）が 1 フレーム内でピクセルごとに回数と極性の異なるパルスを加えることで実現され、16 階調に見えるのは Bayer 4×4 オーダードディザで 4 階調の上にシミュレートしたもの。この錯視スケッチは白黒 2 値だけなので影響ありませんが、写真を表示したいときはこの上限を覚えておいてください。

**Q：部分更新を長く使うと残像が出る。対策は？**
A：部分更新の原理上、残像は蓄積します。実用的な戦略は「部分更新をしばらく続けたら全画面更新を 1 回挟む」——`display.clearScreen()` するか、全面黒→全面白を 1 回ずつ流して残像を洗い流します。このスケッチは更新 4 回だけなので残像は無視できます。

**Q：線分の長さや位置を変えたい、キャプションを日本語にしたい。どこを直す？**
A：線分のパラメータは「画面ジオメトリ」の定数群に全部まとまっています：`XN`/`XF` が水平位置、`Y1`/`Y2` が上下端（長さ = Y2 - Y1）、`SEG_W` が太さ。キャプションは `drawFrame` の switch 内。変更後は 2 本の線分の座標の一致を保ってください。でないと錯視が「不誠実」になります。

## 発展アイデア

- 錯視を変える：ポンツォ錯視をミュラー・リヤー錯視やエビングハウス錯視に差し替え。`drawFrame` 内の幾何関数を書き換えるだけ
- 手動でフレーム送り：タッチボタンや可変抵抗をつけて、観客が「答えは？」と叫んだらフレーム 3 へ。儀式感マシマシ
- 部分更新ストップウォッチ：このスケッチの `displayWindow` のやり方で、0.42 秒ごとに 1 目盛り進む電子ストップウォッチを作る。電子ペーパーが「動く」違和感を楽しめる
- グレースケール写真：GxEPD2_4G を導入して、4 階調 + Bayer ディザで写真を電子ペーパーに「印刷」。Kindle の壁紙気分
- 電池駆動の置き物：18650 + ディープスリープで、1 日に数秒だけ起きて画面を更新。電池 1 本で数か月持つ——あなたの錯視回廊は 24 時間 365 日、人をだまし続けられます

## 参考資料

- SSD1677 ドライバー IC 公式製品ページ（Solomon Systech）：https://www.solomon-systech.com/product/ssd1677/
- GxEPD2 ドライバーライブラリ GitHub（対応パネル全リスト）：https://github.com/ZinggJM/GxEPD2
- Adafruit_GFX 描画ライブラリ GitHub：https://github.com/adafruit/Adafruit-GFX-Library
- ESP32-S3 SoC 公式製品ページ（Espressif）：https://www.espressif.com/en/products/socs/esp32-s3
- 姉妹ライブラリ GxEPD2_4G（4 階調 + ディザのグレースケール写真をやりたい人へ）：https://github.com/ZinggJM/GxEPD2_4G
