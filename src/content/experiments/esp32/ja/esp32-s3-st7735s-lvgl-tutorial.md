---
title: "ESP32-S3 + $3 カラー液晶で LVGL アニメーション｜ゼロから10分で動かす完全ガイド"
boardId: esp32s3
moduleId: display/tft096-st7735s
category: esp32
date: 2026-04-10
intro: "ESP32-S3 で 0.96 インチ ST7735S TFT カラー液晶を駆動し、LVGL アニメーションを動かすまでの全手順。配線から完全なコードまで解説。Arduino や組み込み開発の初心者にぴったりのはまりポイント対策付き。"
image: "https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png"
---

# ESP32-S3 + $3 カラー液晶で LVGL アニメーション！ゼロから10分で動かす完全ガイド（2026年版・はまりポイント対策済み）

> **一言まとめ**：ESP32-S3 で 0.96 インチ ST7735S TFT を駆動し LVGL アニメーションを表示。配線5本の核心ポイントとはまりポイント対策を完全解説。

## 完成イメージ

![image-20260410152138611](https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png)

> 爪先ほどの小さな 0.96 インチ画面でも、なめらかな LVGL アニメーションが動く。配線からコードまで全部解説するので、よくあるはまりポイントをまとめてスキップできる。



------

## このガイドで学べること

1. ESP32-S3 が SPI 経由で ST7735S 0.96 インチ TFT カラー液晶を駆動する仕組み
2. Arduino_GFX ライブラリの設定方法（TFT_eSPI を使わない理由も解説）
3. LVGL v9 を小型画面に移植する完全な手順
4. 2種類のアニメーション（左右スライド＋上下バウンス）を組み合わせた LVGL UI サンプル



## 部品リスト（BOM）

| 部品                            | 数量 | 備考                             |
| ------------------------------- | ---- | -------------------------------- |
| ESP32-S3 開発ボード             | 1    | S3 シリーズなら何でも可          |
| 0.96 インチ ST7735S TFT IPS 液晶 | 1    | 80×160 解像度、SPI インターフェース、8ピン |
| ジャンパーワイヤー（メス-メス） | 8本  | 8 本あれば十分                   |
|                                 |      |                                  |




## ディスプレイ仕様

![image-20260410113243742](https://img.lingflux.com/2026/04/e66957af12d082ebd30b5b8cdb06de8c.png)

> 全部覚えなくて大丈夫です。***** マークのついたパラメータだけ押さえておけば、コードを書くときに困りません。

| パラメータ       | 仕様            | 備考                                                           |
| ---------------- | --------------- | -------------------------------------------------------------- |
| サイズ           | 0.96 インチ TFT IPS | 広視野角・色再現性良好                                    |
| 解像度           | 80(H) × 160(V)  | ***** コード内では `screenWidth=160, screenHeight=80`（横向き）|
| ドライバ IC      | ST7735S         | ***** ライブラリ選択時に必ず一致させること                     |
| 通信インターフェース | 4線式 SPI    | 最大 40MHz（まずはデフォルト速度でテストを）                   |
| 動作電圧         | **3.3V**        | ***** 絶対に 5V を入力しないこと！                             |
| ピン数           | 8ピン           | バックライト制御ピン BLK を含む                                |



| パラメータ         | 仕様                      |
| ------------------ | ------------------------- |
| 表示エリア         | 10.8(H) × 21.7(V) mm      |
| パネルサイズ       | 19(H) × 24(V) × 2.7(D) mm |
| 画素ピッチ         | 0.135(H) × 0.1356(V) mm   |
| 動作電流           | 20mA                      |
| バックライト種別   | LED × 1                   |
| 動作温度           | -20 〜 70°C               |
| PCB サイズ         | 30.00 × 24.04 mm          |
| マウント穴内径     | 2 mm                      |
| ピンピッチ         | 2.54 mm                   |

**ピン定義：**

| No. | ピン | 機能説明                                        |
| --- | ---- | ----------------------------------------------- |
| 1   | GND  | グラウンド                                      |
| 2   | VCC  | 電源（3.3V）                                    |
| 3   | SCL  | SPI クロック                                    |
| 4   | SDA  | SPI データ（MOSI）                              |
| 5   | RES  | リセット（Low アクティブ）                      |
| 6   | DC   | コマンド/データ選択（Low=コマンド、High=データ） |
| 7   | CS   | チップセレクト（Low アクティブ）                |
| 8   | BLK  | バックライト（High で点灯。制御不要なら 3.3V に接続）|




## 配線

| ESP32-S3 ピン | ST7735S ピン | 説明                           |
| ------------- | ------------ | ------------------------------ |
| GND           | GND          | 共通グラウンド                 |
| **3.3V**      | VCC          | **5V 厳禁**                    |
| GPIO 12       | SCL          | SPI クロック                   |
| GPIO 11       | SDA          | SPI データ（MOSI）             |
| GPIO 21       | RES          | リセット                       |
| GPIO 47       | DC           | コマンド/データ選択            |
| GPIO 38       | CS           | チップセレクト                 |
| GPIO 48       | BLK          | バックライト（または 3.3V に接続）|



### 配線の注意事項

- **電源**：3.3V のみ。5V を入力すると液晶が壊れる
- **BLK バックライトピン**：ソフトウェア制御が不要であれば 3.3V に直結して常時点灯でOK
- **CS チップセレクト**：Low アクティブ
- **RES リセット**：初期化時に Low パルスが必要
- **ピン選択**：上記は ESP32-S3 の SPI2（FSPI）デフォルトピンを使用。ピンを変更した場合はコード内の `#define` を合わせて変更すること



## ライブラリのインストール

Arduino IDE で以下の2つをインストールする。

1. **Arduino_GFX_Library** — 「GFX Library for Arduino」で検索してインストール
2. **LVGL** — 「lvgl」で検索し **v9.x** をインストール

> **なぜ TFT_eSPI ではなく Arduino_GFX を使うのか？**
>
> 念のため言っておくと、私は TFT_eSPI もよく使っていて、これまで多くの液晶を動かしてきた。どちらのライブラリも ST7735S に対応しているが、設定方法が大きく異なる。
>
> **TFT_eSPI の問題点：ライブラリ本体のソースファイルを直接編集する必要がある**
>
> TFT_eSPI を使うにはライブラリのインストールディレクトリにある `User_Setup.h` を開き、ピン定義やドライバ選択を手動で書き換える必要がある。つまり：
>
> 1. ライブラリのパスを探す（OS によって異なる：`Documents/Arduino/libraries/` または `.platformio/packages/`）
> 2. 数百行の設定ファイルから該当箇所を見つけ、デフォルトをコメントアウトして使いたい行をアンコメント
> 3. 異なる液晶を使う複数プロジェクトを並行しているなら、切り替えのたびにこのファイルを書き直す必要がある
> 4. **ライブラリを更新すると設定が上書きされてリセットされる** — 突然コンパイルが通らなくなる
>
>    「動画通りにやったのに白画面になる」という定番の悩みは、ほぼ `User_Setup.h` の設定ミスか変更が反映されていないことが原因だ。
>
>    **Arduino_GFX のアプローチ：全設定を自分のスケッチに書く**
>
>    Arduino_GFX はすべての設定を自分の `.ino` ファイルの中で完結させる：
>
> ```c
> // ピンとドライバの設定はコード内で定義。ライブラリファイルには一切手を加えない
> Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
> Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
> ```
>
> - ピンを変えたい？`#define` 1行を変えるだけ
> - 液晶を変えたい？`Arduino_ST7735` を `Arduino_ILI9341` などに差し替えるだけ
> - ライブラリを更新しても？自分のコードは一切影響を受けない
> - 複数プロジェクトを並行しても？それぞれが独立した設定を持つので干渉しない
>
>   **加えて、TFT_eSPI は ESP32-S3 との互換性に問題が出ている**。GitHub では ESP32 Arduino Core 3.x 環境でのコンパイルエラーを報告する issue が複数ある。Arduino_GFX は現在も積極的にメンテナンスされており、新しいチップへの対応が良好だ。




## 開発環境

MacOS - v15.1.1

Arduino IDE - v2.3.8

ボードパッケージ：esp32 (by Espressif Systems) - v3.3.7

ディスプレイドライバ：GFX Library for Arduino (by Moon on our nation) - v1.6.5

グラフィクスライブラリ：LVGL (by kisvegabor) - v9.5.0



## 完全なコード



```c
#include <Arduino_GFX_Library.h>
#include <lvgl.h>

// --- ピン定義と GFX 初期化 ---
#define TFT_CS 38
#define TFT_RST 21
#define TFT_DC 47
#define TFT_MOSI 11
#define TFT_SCLK 12
#define TFT_BLK 48

#define BLACK   0x0000
#define WHITE   0xFFFF
#define ROTATION 1

Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);

static const uint32_t screenWidth  = 160;
static const uint32_t screenHeight = 80;

void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = lv_area_get_width(area);
  uint32_t h = lv_area_get_height(area);
  uint32_t stride = lv_draw_buf_width_to_stride(w, LV_COLOR_FORMAT_RGB565);
  uint8_t * row_ptr = px_map;
  
  for (uint32_t y = 0; y < h; y++) {
    gfx->draw16bitRGBBitmap(area->x1, area->y1 + y, (uint16_t *)row_ptr, w, 1);
    row_ptr += stride;
  }
  lv_display_flush_ready(display);
}

// ==========================================
// アニメーションコールバック関数（LVGL アニメーションエンジンから値の変化を受け取る）
// ==========================================

// コールバック：オブジェクトの X 座標を更新（水平移動）
static void anim_x_cb(void * var, int32_t v) {
  lv_obj_set_x((lv_obj_t *)var, v);
}

// コールバック：オブジェクトの Y 座標を更新（垂直移動）
static void anim_y_cb(void * var, int32_t v) {
  lv_obj_set_y((lv_obj_t *)var, v);
}

void setup() {
  Serial.begin(115200);
  pinMode(TFT_BLK, OUTPUT);
  digitalWrite(TFT_BLK, HIGH);

  gfx->begin();
  gfx->fillScreen(BLACK);

  lv_init();
  lv_display_t *display = lv_display_create(screenWidth, screenHeight);
  lv_display_set_color_format(display, LV_COLOR_FORMAT_RGB565);

  static lv_color_t buf[screenWidth * screenHeight / 10];
  lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(display, my_disp_flush);

  // 画面背景を白に設定
  lv_obj_set_style_bg_color(lv_scr_act(), lv_color_hex(0xFFFFFF), 0);

  // ==========================================
  // UI レイアウト：子要素をラップする透明コンテナを作成
  // ==========================================
  
  // 1. 透明なコンテナを作成（サイズ 100x60）
  lv_obj_t * cont = lv_obj_create(lv_scr_act());
  lv_obj_set_size(cont, 100, 60);
  lv_obj_set_style_bg_opa(cont, 0, 0);             // 背景を完全透明に
  lv_obj_set_style_border_width(cont, 0, 0);       // ボーダーなし
  lv_obj_set_style_pad_all(cont, 0, 0);            // パディングなし
  lv_obj_align(cont, LV_ALIGN_CENTER, 0, 0);       // コンテナを中央揃え

  // 2. 緑の四角をコンテナ上部中央に配置
  lv_obj_t *rect = lv_obj_create(cont);
  lv_obj_set_size(rect, 30, 30);
  lv_obj_set_style_bg_color(rect, lv_color_hex(0x00FF00), 0);
  lv_obj_set_style_border_width(rect, 0, 0);
  lv_obj_align(rect, LV_ALIGN_TOP_MID, 0, 0);

  // 3. ラベルをコンテナ下部中央に配置
  lv_obj_t * label = lv_label_create(cont);
  lv_label_set_text(label, "hello world!");
  lv_obj_set_style_text_color(label, lv_color_hex(0x000000), 0);
  lv_obj_align(label, LV_ALIGN_BOTTOM_MID, 0, 0);


  // ==========================================
  // 2種類のアニメーション効果（LVGL v9 アニメーションエンジン）
  // ==========================================

  // アニメーション A：コンテナ全体（四角＋ラベル）を左右にスライド
  lv_anim_t a_x;
  lv_anim_init(&a_x);
  lv_anim_set_var(&a_x, cont);                       // コンテナにバインド
  lv_anim_set_values(&a_x, -30, 30);                 // 中心から左 30px → 右 30px
  lv_anim_set_time(&a_x, 2000);                      // 片道 2000 ミリ秒（2秒）
  lv_anim_set_playback_time(&a_x, 2000);             // 戻りも 2000 ミリ秒
  lv_anim_set_repeat_count(&a_x, LV_ANIM_REPEAT_INFINITE); // 無限ループ
  lv_anim_set_path_cb(&a_x, lv_anim_path_ease_in_out);     // イーズイン/アウトで自然な動きに
  lv_anim_set_exec_cb(&a_x, anim_x_cb);              // X 軸コールバックをバインド
  lv_anim_start(&a_x);                               // アニメーション開始！

  // アニメーション B：緑の四角だけ上下にバウンス
  lv_anim_t a_y;
  lv_anim_init(&a_y);
  lv_anim_set_var(&a_y, rect);                       // 四角のみにバインド
  lv_anim_set_values(&a_y, 0, 10);                   // 0〜10 ピクセル下方向にシフト
  lv_anim_set_time(&a_y, 300);                       // 素早いバウンス：300 ミリ秒
  lv_anim_set_playback_time(&a_y, 300);              
  lv_anim_set_repeat_count(&a_y, LV_ANIM_REPEAT_INFINITE); 
  lv_anim_set_path_cb(&a_y, lv_anim_path_ease_in_out); 
  lv_anim_set_exec_cb(&a_y, anim_y_cb);              // Y 軸コールバックをバインド
  lv_anim_start(&a_y);                               // アニメーション開始！
}

// 前回のタイムスタンプを記録
uint32_t last_tick = 0;
void loop() {
  // 1. 前回の loop からの経過ミリ秒を計算
  uint32_t current_tick = millis();
  uint32_t elapsed_time = current_tick - last_tick;
  last_tick = current_tick;

  // 2. 経過時間を LVGL に伝える（アニメーションが動く絶対条件！）
  lv_tick_inc(elapsed_time);

  // 3. LVGL がアニメーション処理と画面再描画を行う
  lv_timer_handler();
  
  // 4. CPU を使い切らないよう少しウェイト
  delay(5);
}
```




## コードの重要ポイント解説

> 初心者が最もハマりやすい箇所をまとめた。自分のコードと照らし合わせながら確認してほしい。

### 1. GFX 初期化のオフセットパラメータ



```c
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
```

末尾の4つの数字 `26, 1, 26, 1` は `col_offset1, row_offset1, col_offset2, row_offset2` にあたる。**画面表示が片隅にずれていたり黒い余白が出る場合は、この4つの値を調整する。** ST7735S モジュールはメーカーによってオフセット値が異なる。ここで示す値が最も一般的なものだ。

### 2. 画面サイズ — 横向き（ランドスケープ）に注意

```c
#define ROTATION 1  // 横向きに回転
static const uint32_t screenWidth  = 160;  // 回転後の幅
static const uint32_t screenHeight = 80;   // 回転後の高さ
```

物理的な画面は 80×160（縦向き）。`ROTATION=1` で 90° 回転すると 160×80 になる。**LVGL の display サイズは回転後の向きに合わせること** — 合っていないと表示が崩れる。

### 3. flush コールバック — LVGL と GFX の橋渡し

```c
void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  ...
  lv_display_flush_ready(display);  // この行は必須！
}
```

`lv_display_flush_ready()` は「この領域の描画が終わった。次に進んでいい」と LVGL に伝える関数だ。**この行を忘れると画面が永遠に更新されない。**

### 4. loop での時間の供給

```c
lv_tick_inc(elapsed_time);
lv_timer_handler();
```

この2行が LVGL アニメーションの「心臓部」。`lv_tick_inc` が経過時間を供給し、`lv_timer_handler` が再描画をトリガーする。**どちらか1行でも欠けるとアニメーションは止まる。**




## よくある問題と対処法

| 症状                               | 考えられる原因                                              | 対処法                                                                   |
| ---------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| **白画面（バックライトは点灯している）** | flush コールバック未登録、または `lv_display_flush_ready()` が抜けている | `my_disp_flush` が flush_cb として正しく設定されているか確認       |
| **画面が乱れる／ランダムな色ブロック** | SPI ピンの配線ミスまたは接触不良                            | 配線を確認し、ジャンパーワイヤーがしっかり刺さっているか確かめる         |
| **表示がずれている／黒い余白がある** | ST7735S のオフセットパラメータがモジュールと一致していない  | `Arduino_ST7735` コンストラクタの `col_offset` と `row_offset` を調整する |
| **色がおかしい（青が赤に見える等）** | RGB/BGR の順序設定が間違っている                            | GFX 初期化のカラーオーダーパラメータを確認する                            |
| **画面が上下反転している**         | rotation 値が正しくない                                     | `ROTATION` を 0 または 3 に変更して試す                                   |
| **コンパイルエラー：lvgl.h が見つからない** | LVGL 未インストールまたはバージョン違い               | **LVGL v9.x** をインストールしているか確認（v8 ではない）                 |
| **アニメーションが動かず静止画になる** | loop 内に `lv_tick_inc()` または `lv_timer_handler()` が存在しない | 両方の行が `loop()` 内にあることを確認する                           |


