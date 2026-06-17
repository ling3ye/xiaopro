---
title: "DHT11 + GC9A01 円形ディスプレイでつくる Game Boy レトロピクセル温湿度計｜ESP32-S3 SPI 配線 + Arduino 完全コード"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/dht11
category: esp32
date: 2026-06-18
intro: "ESP32-S3 で GC9A01 240×240 円形ディスプレイを駆動し、DHT11 センサーと組み合わせて、Game Boy DMG のクリシェックリックなクラシック 4 階調グリーンを再現した、アラーム点滅付きピクセルレトロ卓上温湿度計を作ります。完全な配線表、Arduino ライブラリのインストール、全コメント付きコードを付属、初心者向けです。"
image: "https://img.lingflux.com/2026/06/4d154493c9e833bc839cec1050f749f6.jpg"
---

# DHT11 + GC9A01 円形ディスプレイでつくる Game Boy ピクセルレトロ温湿度計（完全チュートリアル）（ESP32-S3 · SPI 配線 · Arduino コード）

---

## TL;DR · 3 分でわかる概要

> 長文を読む時間がない方へ。核心の手順はここにまとめています。基礎がある方はこれを見てサクッと進められます：
>
> 1. **配線**：DHT11 データピン → GPIO 47；GC9A01 円形ディスプレイの SPI 配線：SCK→GPIO12、MOSI→GPIO11、CS→GPIO9、DC→GPIO10、RST→GPIO18、BL→GPIO7
> 2. **2 つのライブラリをインストール**：Arduino IDE で `Arduino_GFX_Library`（Moon On Our Nation）と `DHT sensor library`（Adafruit）を検索してインストール
> 3. **末尾の完全コードを貼り付け**、Arduino IDE でボード `ESP32S3 Dev Module` を選択
> 4. **コンパイルして書き込み**、約 30 秒でフラッシュ完了を待つ
> 5. **電源を入れて確認**：円形ディスプレイがクリシェック色の背景で点灯し、上半分に温度（°C）、下半分に湿度（%）が表示され、極端な値では自動的に点滅アラームが鳴ります ✅

---

## はじめに：「遊び心」のある温湿度計

正直なところ、これまで温度や湿度を表示する方案はいろいろ試してきました——大きな OLED、小さな 7 セグ、さらにはシリアル出力まで……画面にポツンと数字だけが表示されているのを見るたびに、何とも言えない空虚感を覚えていました。使えないわけではないのですが、どこか**魂**が足りない感じがするんです。

ある日、子どもの頃の Game Boy を引っ張り出してみたとき、あのクラシックなクリシェックリック画面が突然インスピレーションをくれました：**同じ数字を表示するなら、なぜもっとレトロに、もっと楽しくしないのか？**

こうしてこのプロジェクトが生まれました——ESP32-S3 で GC9A01 円形 LCD を駆動し、DHT11 温湿度センサーを組み合わせ、ピクセルフォントを全部手書きで作り、Game Boy DMG の象徴的な 4 階調グリーンを円形ディスプレイに持ち込んで、机の上に置くとついもう一目見たくなるような**ピクセルレトロ温湿度計**を作ります。

既成の UI ライブラリも、複雑なフレームワークもなし、ひたすら `fillRect()` でマス目を 1 つずつ「積み上げて」ピクセル数字を描く——こういう地味な方法がかえって一番雰囲気が出るんです。

**本記事の目標**：ゼロからでも最後までついていけるようにし、最終的に GC9A01 円形ディスプレイでリアルタイムの温湿度が見られ、しかも見栄えが十分にクールなものになること。

---

## 実験の効果

![](https://img.lingflux.com/2026/06/755f0087c027a35770edb0fd87a81a35.jpg)

最終的な効果を一言で：**240×240 円形ディスプレイ、クリシェック背景、ピクセル風の大きな温湿度の数値が中央に表示され、数値変化にはスムーズなトランジションがあり、限界を超えると自動的に点滅してアラームを鳴らし、フレームレートは約 30fps、撕裂やフリッカーは一切なし**。

---

## 部品の説明

部品を買う前に、本日の 3 つの主役を紹介しましょう。

### ESP32-S3 · このプロジェクトで唯一「脳みそ」を持つ部分

ESP32-S3 は Espressif 製の Wi-Fi + Bluetooth デュアルモードチップですが、今回はネットワーク機能ではなく、**豊富な GPIO、十分なメモリ、そして十分に速い SPI バス**を使います。

> 例えで理解：もし GC9A01 円形ディスプレイがテレビだとしたら、ESP32-S3 はそのテレビに番組信号を送り込むセットトップボックス——すべての「コンテンツ」はここから発信され、画面はただ「再生」するだけです。

主なスペック：
- クロック 240 MHz（デュアルコア Xtensa LX7）
- メモリ 512 KB SRAM、オプションで PSRAM 搭載可能
- ハードウェア SPI 対応、最高 80 MHz で動作可能
- 3.3V 駆動電圧、GPIO 耐圧 3.3V（⚠️ 5V 信号は絶対に接続しないでください）

---

### GC9A01 円形ディスプレイ · ピクセルレトロ感の源泉

GC9A01 は解像度 **240×240** の円形 IPS LCD ドライバチップで、通常は直径約 1.28 インチの小型円形ディスプレイモジュールとして作られ、インターフェースは標準的な 4 線 SPI です。

> 例えで理解：あの昔の機械式時計の文字盤は見たことがありますよね？GC9A01 はその文字盤を、プログラムで任意の内容を表示できるカラー小型画面に差し替えたもの——円形、それがこの上なくエレガントなんです。

主なスペック：
- 解像度：240 × 240 ピクセル、円形の表示領域
- インターフェース：4 線 SPI（最高 80 MHz クロックに対応）
- 色深度：16 bit RGB565（65536 色）
- 駆動電圧：3.3V（VCC とロジックレベルはともに 3.3V、**5V は接続しないでください！**）
- バックライト：独立ピン制御（BL）、High レベルで点灯

---

### DHT11 · おせっかいな小さなお隣さん

DHT11 は温度 + 湿度を一体化した低コストデジタルセンサーで、データ線 1 本で 2 つのデータを伝送でき、非常に簡単に使えます。

> 例えで理解：DHT11 は、あなたの部屋に住み着いて、常に「今何度か、空気にどれくらい水分があるか」を報告してくる小さなお隣さんのようなもの——精度はそこそこですが、実用には十分で、しかも静かです。

主なスペック：
- 温度範囲：0 ~ 50°C、精度 ±2°C
- 湿度範囲：20% ~ 90% RH、精度 ±5% RH
- サンプリング間隔：最短 1 秒（コードでは 2 秒ごとに 1 回読み取り）
- データインターフェース：シングルバスデジタルプロトコル（1-Wire の亜種）
- 駆動電圧：3.3V または 5V どちらでも可（本プロジェクトでは 3.3V に接続）

---

## BOM 表（部品リスト）

| 部品 | 型番 / スペック | 数量 | 備考 |
| :--- | :--- | :---: | :--- |
| メイン開発ボード | ESP32-S3 Dev Module | 1 | オンボード USB-C 書き込みポートを確認 |
| 円形カラーディスプレイ | GC9A01 · 1.28 インチ · 240×240 SPI | 1 | 購入時に BL ピン付きバージョンを選ぶこと |
| 温湿度センサー | DHT11 モジュール（プルアップ抵抗内蔵のモジュール版） | 1 | モジュール版の購入を推奨、外付け抵抗が不要 |
| ジャンパワイヤ | デュポンワイヤ（オス-オス / オス-メス） | 適量 | 両方をいくつか用意 |

---

## 配線方法

### DHT11 → ESP32-S3

| DHT11 ピン | ESP32-S3 ピン | 説明 |
| :--- | :--- | :--- |
| GND | GND | グランド共通 |
| VCC | 3V3 | センサー電源（3.3V） |
| DAT（DATA） | GPIO 47 | データバス |

### GC9A01 円形ディスプレイ → ESP32-S3

| GC9A01 ピン | ESP32-S3 ピン | 説明 |
| :--- | :--- | :--- |
| VCC | 3.3V | ディスプレイ主電源（⚠️ 必ず 3.3V に接続、5V ではありません） |
| GND | GND | グランド共通 |
| SCL / CLK | GPIO 12 | SPI クロックライン |
| SDA / MOSI | GPIO 11 | SPI データライン |
| CS | GPIO 9 | チップセレクト信号（Low アクティブ） |
| DC | GPIO 10 | データ / コマンド切替 |
| RST | GPIO 18 | ハードウェアリセット |
| BL | GPIO 7 | バックライト制御（このピンがない場合あり、コードで High にして常時点灯、または直接 3.3V に接続しても可） |

> 💡 **実用的な注意**：配線完了後に急いで電源を入れないでください——上の表を 1 行ずつ見直し、特に VCC が **3.3V であって 5V ではない**こと（GC9A01 に 5V を入れるとほぼ壊れます）、そして DHT11 の DAT が正しい GPIO に接続されているかを重点的に確認しましょう。この罠にハマったことある人なら、あの「電源を入れたら画面が二度と点かなくなった」という絶望感がわかるはずです。

---

## 必要なライブラリのインストール

Arduino IDE を開き、**ツール → ライブラリを管理** に入り、以下の 2 つのライブラリを検索してインストールします：

**1. Arduino_GFX_Library**

- 検索キーワード：`Arduino_GFX`
- 作者：`Moon On Our Nation`
- 役割：GC9A01 円形ディスプレイの駆動を担当、ダブルバッファ Canvas 機能を含む（画面のフリッカーを解消する鍵）

**2. DHT sensor library**

- 検索キーワード：`DHT sensor library`
- 作者：`Adafruit`
- インストール時に「依存関係をインストールしますか？」とポップアップが出たら **Install all** を選択（ついでに Adafruit Unified Sensor も一緒にインストール）

> インストール完了後、ライブラリファイルが正しくロードされるよう、Arduino IDE の再起動を推奨します。

---

## 完全コード

コード構造の説明：
- **初期化フェーズ**：バックライト点灯 → ディスプレイ初期化 → DHT11 の初回データ読み取り
- **メインループ**：2 秒ごとにセンサーを読み取り、33ms（約 30fps）ごとに 1 フレームをレンダリング
- **レンダリング機構**：まずメモリ上の Canvas に描画し、その後画面に一度に flush して、撕裂やフリッカーを防止
- **ピクセルフォント**：5×7 をラベル文字に、5×9 を大きな数値に使用、すべて手作業で `fillRect()` を使ってマス目ごとに描画
- **アラームアニメーション**：温度が 35°C 超過または 5°C 未満、湿度が 85% 超過または 20% 未満のとき、数字が 400ms 間隔で点滅

```cpp
/**
 * ╔══════════════════════════════════════════════════╗
 * ║   ESP32-S3 円形温湿度計 · GAME BOY ピクセル懐旧版 ║
 * ║   ハードウェア：ESP32-S3 + GC9A01(240×240) + DHT11║
 * ║   ライブラリ：Arduino_GFX_Library + DHT(Adafruit) ║
 * ╚══════════════════════════════════════════════════╝
 *
 * 配色方案 —— Game Boy DMG クラシック 4 階調グリーン：
 *   PAL_BG      #CADC9F  クリシェックイエローグリーン（背景色、懐旧感の源泉）
 *   PAL_LITE    #9BBC0F  最明グリーン        （ハイライト装飾）
 *   PAL_MID     #8BAC0F  ブライトグリーン    （装飾ドット）
 *   PAL_DARK    #306230  ミッドグリーン       （ラベル文字 / 区切り線）
 *   PAL_DARKEST #0F380F  ダークグリーン       （メイン数字 / 外枠、最高コントラスト）
 *
 * アラームロジック（単色機のクラシック手法）：
 *   温度 >35°C または <5°C → 数字が 400ms 間隔で点滅
 *   湿度 >85% または <20%  → 同上
 */

#include <Arduino_GFX_Library.h>
#include <DHT.h>

// ══════════════════════════════════════════
// ステップ 1：ピン定義
//   ここの数値を変更すればピンを変えられます、他の場所は変更不要
// ══════════════════════════════════════════
#define DHTPIN    47      // DHT11 データピン
#define DHTTYPE   DHT11

#define TFT_SCK   12     // GC9A01 SPI クロック
#define TFT_MOSI  11     // GC9A01 SPI データ
#define TFT_CS    9      // GC9A01 チップセレクト
#define TFT_DC    10     // GC9A01 データ/コマンド
#define TFT_RST   18     // GC9A01 ハードウェアリセット
#define TFT_BL    7      // GC9A01 バックライト（HIGH = 点灯）

// ══════════════════════════════════════════
// ステップ 2：Game Boy (DMG) 4 階調グリーンパレット
//   カラーフォーマット：RGB565（16 ビット）
//   ここで色を変えないでください、変えると Game Boy 風ではなくなります :)
// ══════════════════════════════════════════
#define PAL_BG       0xCF69   // クリシェックイエローグリーン —— 背景色
#define PAL_LITE     0x9DC2   // 最明グリーン          —— ハイライト装飾（今のところあまり未使用）
#define PAL_MID      0x8D42   // ブライトグリーン       —— トップバーの点滅ドット
#define PAL_DARK     0x3306   // ミッドグリーン         —— ラベル / 区切り線
#define PAL_DARKEST  0x11C2   // ダークグリーン         —— メイン数字 / 外枠

// ══════════════════════════════════════════
// ステップ 3：画面定数とフォントスケール比
// ══════════════════════════════════════════
#define CX  120        // 中心 X（画面の中央）
#define CY  120        // 中心 Y（画面の中央）

#define BOLD_SCALE  6  // 大きい数字の拡大倍率（5×9 字形 × 6 = 30×54 ピクセル）
#define DOT_INSET   1  // 各ピクセルマス内の縮小 1px、背景色の隙間を見せてドットマトリクス感を演出
#define UNIT_SCALE  2  // 単位（°C / %）の文字サイズ
#define LBL_SCALE   2  // ラベル（TEMP / HUM）の文字サイズ

// ══════════════════════════════════════════
// ステップ 4：ハードウェアオブジェクトの初期化
// ══════════════════════════════════════════
DHT dht(DHTPIN, DHTTYPE);

// ハードウェア SPI バス
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, GFX_NOT_DEFINED);

// GC9A01 ドライバ（最後のパラメータ true = 回転なし、色反転関連）
Arduino_GFX *display = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas ダブルバッファ：まずメモリ上に完全なフレームを描き、flush() で一度に画面へ送る
//   これがフリッカー解消の核心手段、ゲームエンジンのオフスクリーンレンダリングに類似
Arduino_GFX *gfx = new Arduino_Canvas(240, 240, display);

// ══════════════════════════════════════════
// グローバル状態変数
// ══════════════════════════════════════════
float g_temp = 0, g_hum = 0;          // センサーの実際の読み取り値
float g_dispTemp = 0, g_dispHum = 0;  // 画面表示値（スムーズなトランジション付き、数字の急変を防止）
bool  g_hasData = false;              // 有効なデータを少なくとも 1 回取得したか

// ══════════════════════════════════════════
// 関数プロトタイプ宣言（コンパイラに「以下の関数がある」ことを伝える）
// ══════════════════════════════════════════
const uint8_t* glyph(char ch);
int16_t  pixelAdvance(char ch, uint8_t scale);
int16_t  pixelTextWidth(const char *s, uint8_t scale);
void     drawPixelText(const char *s, int16_t x, int16_t y,
                       uint8_t scale, uint16_t c);
void     drawCenteredPixel(const char *s, int16_t y,
                           uint8_t scale, uint16_t c);
const uint8_t* boldGlyph(char ch);
int16_t  boldAdvance(char ch, uint8_t scale);
int16_t  boldTextWidth(const char *s, uint8_t scale);
void     drawBoldText(const char *s, int16_t x, int16_t y,
                      uint8_t scale, uint16_t c);
void     drawBezel();
void     drawTopBar(unsigned long t);
void     drawValue(const char *num, const char *unit,
                   int16_t yTop, uint16_t col);
void     drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c);
uint16_t tempColor(unsigned long t);
uint16_t humColor(unsigned long t);
void     drawScene(unsigned long t);

// ══════════════════════════════════════════
// setup() —— 電源投入時に一度だけ実行
// ══════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=============================");
  Serial.println("  GAME BOY ピクセル温湿度計");
  Serial.println("=============================");

  // 1. バックライトを点灯
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 2. 画面を初期化
  if (!gfx->begin()) {
    Serial.println("[ERROR] 画面の初期化に失敗しました！配線を確認してから再度電源を入れてください。");
    while (true) delay(500);   // ここで停止、以降の誤動作を防止
  }
  gfx->fillScreen(PAL_BG);
  gfx->flush();
  Serial.println("[OK] 画面の初期化が完了しました");

  // 3. DHT11 を初期化、2 秒待ってセンサーが安定した後に初回値を読み取り
  dht.begin();
  Serial.println("[OK] DHT11 の初期化が完了しました、読み取り中...");
  delay(2000);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    g_temp = g_dispTemp = t;
    g_hum  = g_dispHum  = h;
    g_hasData = true;
    Serial.printf("[DATA] 初期読み取り T=%.1f°C  H=%.1f%%\n", t, h);
  } else {
    Serial.println("[WARN] 初回読み取りに失敗、画面には --.- を表示し、次の有効な読み取りを待ちます");
  }
}

// ══════════════════════════════════════════
// loop() —— 2 秒ごとにセンサーを読み取り、33ms ごとに 1 フレームをレンダリング（約 30fps）
// ══════════════════════════════════════════
unsigned long lastRead  = 0;
unsigned long lastFrame = 0;

void loop() {
  unsigned long now = millis();

  // 2 秒ごとにセンサーを読み取り（DHT11 のサンプリング間隔は最短 1 秒、2 秒の方が安定）
  if (now - lastRead >= 2000) {
    lastRead = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      g_temp = t;
      g_hum  = h;
      g_hasData = true;
      Serial.printf("[DATA] T=%.1f°C  H=%.1f%%\n", t, h);
    } else {
      // 読み取り失敗時は数値を更新せず、前回の有効な読み取り値を表示し続ける
      Serial.println("[WARN] DHT11 の読み取りに失敗、前回の数値を維持します");
    }
  }

  // 表示値は 8% のスムーズ追従で実際の値を追跡（毎フレームゆっくり近づく）
  //   例え：昔のアナログ時計の針のように、新しい位置へ瞬時にジャンプしない
  g_dispTemp += (g_temp - g_dispTemp) * 0.08f;
  g_dispHum  += (g_hum  - g_dispHum)  * 0.08f;

  // 約 30fps でレンダリング（33ms に 1 フレーム）
  if (now - lastFrame >= 33) {
    lastFrame = now;
    drawScene(now);
    gfx->flush();    // メモリ上の Canvas を一度に実画面へ送る
  }
}

// ══════════════════════════════════════════
// drawScene() —— 1 フレームの全内容をレンダリング
//   描画順序：背景色 → 円形外枠 → トップバー → 温度エリア → 区切り線 → 湿度エリア
// ══════════════════════════════════════════
void drawScene(unsigned long t) {
  // 1. 画面クリア（クリシェック背景色）
  gfx->fillScreen(PAL_BG);

  // 2. 円形枠と装飾ドットを描画
  drawBezel();

  // 3. トップバーを描画（タイトル + 動作インジケーター）
  drawTopBar(t);

  // 4. 温度エリア
  char num[8];
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispTemp);
  else           strcpy(num, "--.-");       // データなし時にプレースホルダーを表示

  drawCenteredPixel("TEMP", 44, LBL_SCALE, PAL_DARK);
  drawValue(num, "*C", 62, tempColor(t));   // このフォントでは '*' は度数記号 ° にマッピング

  // 5. 中央の点線区切り
  drawDottedH(80, 160, 118, PAL_DARK);

  // 6. 湿度エリア
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispHum);
  else           strcpy(num, "--.-");

  drawCenteredPixel("HUM", 124, LBL_SCALE, PAL_DARK);
  drawValue(num, "%", 142, humColor(t));
}

// ──────────────────────────────────────────
// 円形外枠：ダークグリーンの二重線 + 4 つの 45° 対角装飾ブロック
// ──────────────────────────────────────────
void drawBezel() {
  gfx->drawCircle(CX, CY, 116, PAL_DARKEST);
  gfx->drawCircle(CX, CY, 115, PAL_DARKEST);

  // 4 つの 45° 対角の小ブロック（cos45° ≈ 0.707）
  const int r = 104, d = (int)(r * 0.707f);
  gfx->fillRect(CX + d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // 右上
  gfx->fillRect(CX - d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // 左上
  gfx->fillRect(CX + d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // 右下
  gfx->fillRect(CX - d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // 左下
}

// ──────────────────────────────────────────
// トップバー：中央寄せタイトル "DHT11" + 左側の 500ms 点滅インジケータードット（システム稼働中表示）
// ──────────────────────────────────────────
void drawTopBar(unsigned long t) {
  drawCenteredPixel("DHT11", 12, 1, PAL_DARK);

  // 点滅ドット（点灯 / 消灯の交互）：500ms ごとに色を切り替え
  bool on = (t / 500) % 2 == 0;
  uint16_t c = on ? PAL_DARKEST : PAL_MID;
  int16_t tw = pixelTextWidth("DHT11", 1);
  int16_t sx = CX - tw / 2;         // タイトル左端の X 座標
  gfx->fillRect(sx - 12, 13, 4, 4, c);
}

// ──────────────────────────────────────────
// 数値行：大きな数字自体は水平中央寄せ、単位 °C/% は右上の小さな上付きとして表示
//   これで数字が中央に表示され、単位に押されて偏ることがない
// ──────────────────────────────────────────
void drawValue(const char *num, const char *unit,
               int16_t yTop, uint16_t col) {
  int16_t nw = boldTextWidth(num, BOLD_SCALE);
  int16_t sx = CX - nw / 2;                  // 数字の中央寄せ開始 X

  drawBoldText(num, sx, yTop, BOLD_SCALE, col);
  // 単位は数字の右側に密着、2px 上に上げて上付き感を演出
  drawPixelText(unit, sx + nw + 3, yTop + 2, UNIT_SCALE, col);
}

// ──────────────────────────────────────────
// 水平ピクセル点線（2×2 の小ブロック、5px 間隔）
// ──────────────────────────────────────────
void drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c) {
  for (int16_t x = x0; x <= x1; x += 5) {
    gfx->fillRect(x, y, 2, 2, c);
  }
}

// ══════════════════════════════════════════
// 色マッピング —— 通常 = ダークグリーン、極端値 = 400ms 間隔で「消灯」してアラーム
// ══════════════════════════════════════════
uint16_t tempColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispTemp > 35.0f || g_dispTemp < 5.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;   // 消灯 = 背景色と同色
  return PAL_DARKEST;
}

uint16_t humColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispHum > 85.0f || g_dispHum < 20.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;
  return PAL_DARKEST;
}

// ══════════════════════════════════════════
// 5×7 ピクセルフォント（ラベル / 単位用）
//   各文字 7 行、各行の下位 5 ビット = 列 0~4（bit4 = 最左列）
//   特殊文字：'*' は度数記号 ° にマッピング、'.' はベースラインの小ブロックとして描画
// ══════════════════════════════════════════
const uint8_t EMPTY[7] = {0, 0, 0, 0, 0, 0, 0};

const uint8_t* glyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[7]={0x0E,0x11,0x13,0x15,0x19,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[7]={0x04,0x0C,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[7]={0x0E,0x11,0x01,0x02,0x04,0x08,0x1F}; return g; }
    case '3': { static const uint8_t g[7]={0x1F,0x02,0x04,0x02,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[7]={0x02,0x06,0x0A,0x12,0x1F,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[7]={0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E}; return g; }
    case '6': { static const uint8_t g[7]={0x06,0x08,0x10,0x1E,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[7]={0x1F,0x01,0x02,0x04,0x08,0x08,0x08}; return g; }
    case '8': { static const uint8_t g[7]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[7]={0x0E,0x11,0x11,0x1F,0x01,0x02,0x0C}; return g; }
    case '-': { static const uint8_t g[7]={0x00,0x00,0x00,0x0E,0x00,0x00,0x00}; return g; }
    case '%': { static const uint8_t g[7]={0x18,0x18,0x08,0x04,0x02,0x03,0x03}; return g; }
    case '*': { static const uint8_t g[7]={0x00,0x0E,0x11,0x0E,0x00,0x00,0x00}; return g; } // ° 度数記号
    case 'C': { static const uint8_t g[7]={0x0E,0x11,0x10,0x10,0x10,0x11,0x0E}; return g; }
    case 'D': { static const uint8_t g[7]={0x1E,0x11,0x11,0x11,0x11,0x11,0x1E}; return g; }
    case 'E': { static const uint8_t g[7]={0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F}; return g; }
    case 'H': { static const uint8_t g[7]={0x11,0x11,0x11,0x1F,0x11,0x11,0x11}; return g; }
    case 'I': { static const uint8_t g[7]={0x0E,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case 'M': { static const uint8_t g[7]={0x11,0x1B,0x15,0x15,0x11,0x11,0x11}; return g; }
    case 'N': { static const uint8_t g[7]={0x11,0x19,0x15,0x13,0x11,0x11,0x11}; return g; }
    case 'O': { static const uint8_t g[7]={0x0E,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case 'P': { static const uint8_t g[7]={0x1E,0x11,0x11,0x1E,0x10,0x10,0x10}; return g; }
    case 'T': { static const uint8_t g[7]={0x1F,0x04,0x04,0x04,0x04,0x04,0x04}; return g; }
    case 'U': { static const uint8_t g[7]={0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    default:  return EMPTY;
  }
}

// 1 文字あたりの送り幅（ピクセル幅 + 右側の余白）
int16_t pixelAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale + (scale >> 1) + gap;   // 小数点は少し細く
  return 5 * scale + gap;
}

// 文字列全体のピクセル幅を計算
int16_t pixelTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += pixelAdvance(*s, scale);
  return w;
}

// 5×7 ドットマトリクス文字をマス目ごとに描画
void drawPixelText(const char *s, int16_t x, int16_t y,
                   uint8_t scale, uint16_t c) {
  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      gfx->fillRect(x, y + 5 * scale, scale, scale, c);   // 小数点はベースライン上
      x += 2 * scale + (scale >> 1) + scale;
      continue;
    }
    const uint8_t *g = glyph(ch);
    for (uint8_t r = 0; r < 7; ++r) {
      uint8_t bits = g[r];
      for (uint8_t col = 0; col < 5; ++col) {
        if (bits & (0x10 >> col)) {
          gfx->fillRect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    x += 5 * scale + scale;
  }
}

// 水平中央寄せで 5×7 文字を描画
void drawCenteredPixel(const char *s, int16_t y, uint8_t scale, uint16_t c) {
  int16_t w = pixelTextWidth(s, scale);
  drawPixelText(s, CX - w / 2, y, scale, c);
}

// ══════════════════════════════════════════
// 5×9 ドットマトリクス大数字フォント（温湿度のヒーロー数値専用）
//
//   デザインの特徴：
//   · 各マス内を DOT_INSET px 縮小し、背景色の隙間を見せて LCD ドットマトリクス感を演出
//   · '2' の上部は角付き + 斜め線をマス目ごとに階段状に + 下部は 2 行の実心
//   · '5' は上下とも 1 行全体が実心バー
//   · '.' は字形テーブルを通さず、drawBoldText が直接ベースラインの 1 マスを描画
// ══════════════════════════════════════════
const uint8_t* boldGlyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[9]={0x0C,0x04,0x04,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[9]={0x0E,0x11,0x01,0x02,0x04,0x08,0x10,0x1F,0x1F}; return g; }
    case '3': { static const uint8_t g[9]={0x0E,0x11,0x01,0x01,0x06,0x01,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[9]={0x02,0x06,0x0A,0x12,0x12,0x1F,0x02,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[9]={0x1F,0x10,0x10,0x1E,0x01,0x01,0x01,0x11,0x1F}; return g; }
    case '6': { static const uint8_t g[9]={0x0E,0x11,0x10,0x10,0x1E,0x11,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[9]={0x1F,0x01,0x02,0x02,0x04,0x04,0x08,0x08,0x10}; return g; }
    case '8': { static const uint8_t g[9]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x0F,0x01,0x01,0x11,0x0E}; return g; }
    case '-': { static const uint8_t g[9]={0x00,0x00,0x00,0x00,0x1F,0x00,0x00,0x00,0x00}; return g; }
    default:  return nullptr;
  }
}

// 大数字 1 文字あたりの送り幅
int16_t boldAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale;    // 小数点 = 1 マス幅 + 1 マスの余白
  return 5 * scale + gap;
}

// 大数字文字列全体の幅を計算
int16_t boldTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += boldAdvance(*s, scale);
  return w;
}

// 5×9 ドットマトリクスの大数字をマス目ごとに描画（各マス内を DOT_INSET 縮小し、隙間から背景色を見せる）
void drawBoldText(const char *s, int16_t x, int16_t y,
                  uint8_t scale, uint16_t c) {
  int8_t dot = scale - 2 * DOT_INSET;      // 点灯ブロックの実際の辺の長さ（縮小後）
  if (dot < 1) dot = 1;                    // 最低 1px、消えないように

  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      // 小数点：第 7 行（ベースライン）に縮小済みの 1 マスを描画
      gfx->fillRect(x + DOT_INSET, y + 7 * scale + DOT_INSET, dot, dot, c);
      x += 2 * scale;
      continue;
    }
    const uint8_t *g = boldGlyph(ch);
    if (g) {
      for (uint8_t r = 0; r < 9; ++r) {
        uint8_t bits = g[r];
        for (uint8_t col = 0; col < 5; ++col) {
          if (bits & (0x10 >> col)) {
            gfx->fillRect(
              x + col * scale + DOT_INSET,
              y + r   * scale + DOT_INSET,
              dot, dot, c);
          }
        }
      }
    }
    x += 5 * scale + scale;
  }
}
```

---

## よくある問題のトラブルシューティング

あわてないでください、問題の 90% は以下のいくつかの場所にあります。1 つずつ確認すればたいてい解決します：

**電源投入後に画面が全く点灯しない（バックライトも点灯しない）**

BL ピンが正しく接続されていないか、コードの `digitalWrite(TFT_BL, HIGH)` という行が効いていない可能性が高いです。まず GPIO7 から BL への配線を確認し、次に BL を直接 3.3V に接続してみてください（コード制御をバイパス）。バックライトが点灯しても画面が真っ黒な場合は、次の項目を見てください。

**バックライトは点灯するが画面が真っ黒、あるいはスノーノイズが表示される**

SPI 配線に問題があります。SCK（GPIO12）、MOSI（GPIO11）、CS（GPIO9）、DC（GPIO10）の 4 本を重点的に確認してください。そのうち DC と CS は逆に接続しやすく、この 2 本を間違えると画面が真っ黒になるか、完全に乱れた表示になります。また、GC9A01 ドライバの最後のパラメータ `true/false` は色反転を制御します——色がネガフィルムのように見える場合は、`true` を `false` に変更してみてください（またはその逆）。

**画面の色が全体的にずれており、クリシェックではない**

RGB565 のバイトオーダーの問題です。Arduino_GFX_Library は通常うまく処理してくれますが、色が完全に違う場合は、`Arduino_GC9A01` のコンストラクト時に最後の `true` を `false` に変えてみてください。

**シリアル出力がずっと `[WARN] DHT11 の読み取りに失敗` となっている**

- DAT ピンが正しく GPIO47 に接続されているか確認
- もしバラの DHT11（モジュール版ではない）を使っている場合、DAT と VCC の間に 10kΩ のプルアップ抵抗を接続する必要があります。モジュール版は通常すでにはんだ付け済み
- `dht.begin()` の後の `delay(2000)` は削除しないでください。DHT11 は電源投入後約 1 秒の安定時間が必要で、早すぎると NaN を読み取ります
- VCC が 3.3V に接続されていることを確認（本プロジェクト）。もし手元の DHT11 が 5V 専用の場合は、VCC を 5V に変更し、同時に DAT と GPIO47 の間に直列抵抗を入れてレベル変換を行ってください（または直接 DHT11 モジュール版に交換、通常 3.3V で使用可能）

**数字は更新されるが、画面に明らかなフリッカー / 撕裂がある**

Canvas のダブルバッファが正常に動作しているか確認してください。コード内の `gfx->flush()` が書き漏れていないか、そして**必ず Canvas オブジェクト `gfx->` を使って描画し、`display->` ではない**ことを確認してください。また、ESP32-S3 で正しいボード型番（`ESP32S3 Dev Module`）を選択しないと、SPI 速度が不正確になります。

**コンパイルエラー：`'drawScene' was not declared in this scope`**

これは関数の宣言順序の問題です。コード上部の関数プロトタイプリストに `void drawScene(unsigned long t);` が含まれていることを確認するか、`drawScene` 関数の定義を `loop()` の前に移動してください。

---

## FAQ

**Q：GPIO ピンを別の番号に変更できますか？**
A：はい、コード上部の `#define` 定義を変更するだけで、他の場所を変える必要はありません。DHT11 の DAT は任意の GPIO に接続できます。GC9A01 の SCK/MOSI は最高速度を得るために ESP32-S3 のハードウェア SPI デフォルトピン（GPIO 11/12）を使用することを推奨します。他のピンでも使用可能ですが、ソフトウェア SPI の追加設定が必要です。

**Q：DHT11 を DHT22 に変更できますか？**
A：完全に可能です。コードの 16 行目を `#define DHTTYPE DHT22` に変更するだけで、他のコードはそのままです。DHT22 の精度はより高いです（温度 ±0.5°C、湿度 ±2~5% RH）、サンプリング間隔は最短 2 秒（コードではすでに 2 秒に設定されているため、ちょうど互換性があります）。

**Q：GC9A01 の SPI クロックは最高どれくらい対応していますか？**
A：GC9A01 の公式スペックでは最高 100 MHz の SPI クロックに対応していますが、実際の使用では ESP32-S3 で 80 MHz で動作させても通常問題ありません。Arduino_GFX_Library はデフォルトでハードウェア SPI の最大速度を使用するため、手動設定は不要です。

**Q：ESP32-S3 の GPIO 電圧はどれくらいですか？5V デバイスに直接接続できますか？**
A：ESP32-S3 の GPIO 動作電圧は 3.3V で、**5V 信号には耐性がありません**。5V ロジックデバイスに直接接続するとチップが破損する可能性があります。GC9A01 円形ディスプレイも同様に 3.3V デバイスです。もし DHT11 を 5V で駆動する場合、DAT ピンが出力する High レベルは約 4.5V になるため、分圧抵抗（10kΩ + 20kΩ）やレベル変換モジュールを追加して降圧処理することを推奨します。

**Q：コードのフレームレートと CPU 占有率はどれくらいですか？**
A：現在のコードは約 30fps（フレーム間隔 33ms）、1 フレームあたりのレンダリング時間は約 8~15ms（SPI 速度に依存）、CPU 占有率は約 20~40% です。デュアルコア ESP32-S3 のもう一方のコアは完全にアイドル状態なので、必要に応じてセンサー読み取りタスクを Core 0 に、レンダリングを Core 1 に配置することで、さらにスムーズさを向上できます。

**Q：温湿度の数値がずっと `--.-` のままで更新されない場合はどうすればいいですか？**
A：これは `g_hasData` がずっと `false` のままであり、DHT11 が有効な読み取りを一度も返していないことを示しています。順番に確認してください：① DAT が GPIO47 に接続されていることを確認；② モジュール版の DHT11 は追加のプルアップ抵抗が不要、バラ版には 10kΩ が必要；③ シリアルモニタ（115200 ボーレート）で `[DATA]` または `[WARN]` の出力があるか確認し、問題がセンサーか配線かを判断；④ VCC 電圧を確認（3.3V を推奨）。

**Q：コード内の `true` パラメータ（GC9A01 コンストラクタ）はどういう意味ですか？**
A：`new Arduino_GC9A01(bus, TFT_RST, 0, true)` の第 4 パラメータは色反転を制御します（IPS パネルと TN パネルの RGB 出力の違い）。`true` のとき色は正常に出力され、`false` のときは「ネガフィルム効果」のような色反転が現れます。もし画面の色が反転しているように見える場合は、`true` を `false` に変更してください。

---

## 参考資料

- [Arduino_GFX_Library 公式ドキュメントとサンプル](https://github.com/moononournation/Arduino_GFX)
- [Adafruit DHT sensor library ドキュメント](https://github.com/adafruit/DHT-sensor-library)
- [GC9A01 データシート（公式 PDF）](https://www.waveshare.com/w/upload/5/5e/GC9A01A.pdf)
- [DHT11 公式スペックシート（Aosong メーカー）](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf)
- [Espressif ESP32-S3 テクニカルリファレンスマニュアル](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_cn.pdf)
