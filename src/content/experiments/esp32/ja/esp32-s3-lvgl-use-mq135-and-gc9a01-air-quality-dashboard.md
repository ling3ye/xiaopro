---
title: "ESP32-S3でGC9A01円形ディスプレイ＋MQ135を使った空気品質ダッシュボード完全ガイド（LVGL v9 + SPIインターフェース + Arduino C++）"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-25
intro: "ESP32-S3 + MQ135ガスセンサー + GC9A01 1.28インチ円形ディスプレイ、LVGL v9を組み合わせて、アニメーション付き円形ゲージ、リアルタイムトレンド折れ線グラフ、呼吸光効果付き空気品質ダッシュボードを作成。完全配線図・コード・トラブルシューティング記録付き。"
image: "https://img.lingflux.com/2026/06/4217f9f4026039eeca35a691450313dc.jpg"
---




> 難易度：⭐⭐☆☆☆（ジャンパーワイヤー数本でOK）
> 所要時間：45分
> テスト環境：Arduino IDE 2.3.8 · ESP32 Arduino Core 3.x · lvgl v9.5.0 · Arduino_GFX_Library v1.6.5

---

> **TL;DR（とにかく動かしたい？）**
>
> **期待値管理：** 本プロジェクトは入門学習・デスクトップアクセサリ・純粋な視覚的楽しみを目的としています。**実際の有害ガス漏れ検知には絶対に使わないでください！** 精度的には「オカルト」レベルです。
>
> 1. **配線**：MQ135 A0 → GPIO 13；GC9A01は下記表通りGPIO 7 / 9 / 10 / 11 / 12 / 18に接続
> 2. **ライブラリ**：Arduino ライブラリマネージャーで`lvgl`（v9.x）+ `Arduino_GFX_Library`を検索してインストール
> 3. **lv_conf.h設定**：`LV_FONT_MONTSERRAT_14`と`LV_FONT_MONTSERRAT_28`を有効化（0 → 1に変更）
> 4. 書き込み → 円形ディスプレイが点灯し、ゲージが動き出す

---

## はじめに

埃をかぶっていたセンサーの中から、空気品質検出専用のセンサーモジュール——MQ135を発見。工作室の空気品質を測ってみようと接続してテストしてみると、データシートには「ウォームアップに24時間必要」と書かれており、お遊び用途かと。しかし、このモジュールは様々なガスに感応します。正確ではないが、数値が上昇すれば何らかのガスが存在していることは分かる——二酸化炭素、アンモニア、ベンゼン、アルコール、煙など。換気が必要かどうかの相対値判断には使えるはず。

そこで本プロジェクト誕生：ESP32-S3 + MQ135ガスセンサー + GC9A01 1.28インチ円形ディスプレイ、有名なLVGL v9グラフィックライブラリを組み合わせて、円形ゲージ・リアルタイムトレンド折れ線グラフ・「呼吸」して色が変わる空気品質ダッシュボードを作成。

本記事の目標：**ゼロから配線して書き込み成功まで、この効果を完全再現する。**

---

## 実演効果

円形ディスプレイが現在の空気品質ADC値、ステータスレベル（EXCELLENT / GOOD / FAIR / MODERATE / POOR / DANGER）、履歴トレンド折れ線グラフをリアルタイム表示。ゲージ色は空気品質に応じて緑から赤へグラデーション変化し、外周にはリズム感のある「呼吸」光効果。画面左下には起動後の最小値・最大値を同時記録。

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/2M6HRdpfW-Q" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 構成部品説明

> 開発ボード（ESP32-S3）については解説しません。以下、初心者があまり触れていない可能性の高い2つのモジュールのみ説明します。

### MQ135 ガスセンサー

MQ135は気敏センサーで、空気中のCO₂・アンモニア・ベンゼン等の有害ガス濃度変化を検知します。本プロジェクトでの役割は0～4095のアナログADC値を出力し、現在の環境空気品質レベルを反映すること。

分かりやすく言うと：**化学的な「鼻」**です。空気が濁れるほど出力電圧が高くなり、ADC値も大きくなります。

| パラメータ | 値 |
|----------|-----|
| 動作電圧 | 5V（ヒーター）/ アナログ出力は3.3V互換 |
| 出力インターフェース | アナログ（A0）+ デジタル（D0） |
| ウォームアップ時間 | 24～48時間（フル精度）/ 約3分（トレンド参考値） |
| 検知可能ガス | CO₂、NH₃、NOₓ、ベンゼン、アルコール、煙 |

**3.3V駆動について：** MQ135の定格電圧は5Vですが、3.3V駆動時はヒーター電力が定格の約44%となり、感度低下・読み取り値低めになりますが、トレンド表示と相対変化検出には十分です。絶対精度を追求する場合はVCCに5Vを別供給し、A0アナログ出力は3.3Vを超えないためESP32-S3に直接接続可能（分圧不要）。

採用理由：**安価（5元以内）・モジュール化・配線するだけで動く**、この「見た目重視」プロジェクトには十分。

**MQ135で室内判断を行う正しい用法**

```
✅ 向いている用途：
  - 空気品質変化トレンドモニタリング（相対値）
  - 換気/アラームトリガーの閾値判定
  - 複数有害ガスの「総合汚染」指標

❌ 向いていない用途：
  - 単一ガスの正確な濃度測定
  - 医療/産業レベルの安全コンプライアンス検知
  - CO₂正確値（誤差±300ppm以上あり得る）
```

---

### GC9A01 1.28インチ円形TFTディスプレイ

GC9A01は1.28インチ円形TFT LCDディスプレイで、SPIインターフェース経由で画像データを受信・レンダリングします。本プロジェクトでの役割はアニメーション効果付きゲージUIを表示すること。

例えると：**スマートウォッチの自由に描画可能な円形文字盤**のようなもの。

| パラメータ | 値 |
|----------|-----|
| 画面サイズ | 1.28インチ |
| 解像度 | 240 × 240ピクセル |
| インターフェース | SPI（最大80 MHz） |
| ドライバIC | GC9A01 |
| 動作電圧 | 3.3V |
| バックライト制御 | 対応（BLピン、PWM調光可） |

採用理由：**円形デザインが独自・小型・3.3V直結・Arduino_GFX_Libraryネイティブ対応**、LVGLと組み合わせてゲージを作ると視覚効果抜群。

---

## BOM表

| 部品 | 型番 / 规格 | 数量 |
|------|------------|------|
| メイン開発ボード | ESP32-S3（USB-C付き）| 1 |
| 円形TFTディスプレイ | GC9A01 1.28" 240×240 | 1 |
| ガスセンサー | MQ135 モジュール | 1 |
| 配線 | ジャンパーワイヤー | 数本 |



---

## 構成部品ピン説明

### MQ135 モジュールピン

| ピン | 説明 |
|------|------|
| VCC | 電源（本プロジェクトでは3.3V接続、定格は5V） |
| GND | グラウンド |
| A0 | アナログ信号出力、ESP32-S3 ADCピンに接続 |
| D0 | デジタル出力（本プロジェクト未使用）**ハイレベル（HIGH）/ ローレベル（LOW）**出力 |

### GC9A01 モジュールピン

| ピン表記 | 説明 |
|---------|------|
| VCC | 3.3V電源 |
| GND | グラウンド |
| SCL / CLK | SPIクロック |
| SDA / MOSI | SPIデータ |
| CS | チップ選択（ローアクティブ） |
| DC | データ/コマンド切替 |
| RST | リセット（ローレベルでリセット） |
| BL | バックライト制御（HIGH = 点灯）（オプション、全モジュールに端子があるとは限りません） |

---

## 配線方法

### MQ135 → ESP32-S3

| MQ135 | ESP32-S3 |
|-------|----------|
| VCC | 5V |
| GND | GND |
| A0 | GPIO 13 |

### GC9A01 → ESP32-S3

| GC9A01 ピン | ESP32-S3 GPIO |
|------------|---------------|
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL（バックライト）| GPIO 7 （なければ未接続可） |

> **実用提醒：** 配線後、上記2つの表に沿って**行単位で一度確認**すると、80%のトラブルシューティング時間を節約可。最も間違えやすいのはDCとCS——この2本を入れ替えると画面が真っ白か真っ黒になり、「ディスプレイが壊れた」ように見えますが、実際は単にケーブルが間違っているだけです。

---

## インストールが必要なライブラリ

Arduino IDE → ツール → ライブラリを管理、検索して以下2つをインストール：

| ライブラリ名 | 作者 | 本記事テスト通過バージョン |
|------|------|-----------------|
| `lvgl` | LVGL | v9.5.0 |
| `Arduino_GFX_Library` | Moon On Our Nation | v1.6.5 |

**lvglインストール後、必須手順がもう一つ：**

1. lvglライブラリディレクトリを探す（通常は`ドキュメント/Arduino/libraries/lvgl/`）
2. 中にある`lv_conf_template.h`をコピーし、`lv_conf.h`にリネーム、`lvgl/`と同階層に配置
3. `lv_conf.h`を開き、以下の2行を見つけて`0`を`1`に変更：
   ```c
   #define LV_FONT_MONTSERRAT_14  1
   #define LV_FONT_MONTSERRAT_28  1
   ```
4. `lv_conf.h`を開き、冒頭の` #if 0 `を` #if 1`に変更

> この手順を忘れて直接書き込むと、コンパイル時に`lv_font_montserrat_28 undeclared`エラーが発生。なぜ私が知っているかは聞かないで。

---

## 完全コード

```cpp
/*
 * ESP32-S3 + GC9A01 円形ディスプレイ空気品質ダッシュボード v3.1
 * "極簡テックスタイル" - 円形プログレスバー + リアルタイムトレンド折れ線 + 呼吸光効果
 *
 * テスト環境：Arduino IDE 2.3.2 / ESP32 Core 3.x
 * 依存ライブラリ：lvgl v9.2.x + Arduino_GFX_Library v1.4.x
 */

#include <Arduino.h>
#include <lvgl.h>
#include <Arduino_GFX_Library.h>
#include <math.h>

// ===================== ピン定義 =====================
#define TFT_SCK    12   // SPIクロック
#define TFT_MOSI   11   // SPIデータ
#define TFT_CS     9    // チップ選択
#define TFT_DC     10   // データ/コマンド切替（逆接続で画面真っ白）
#define TFT_RST    18   // リセット
#define TFT_BL     7    // バックライト——HIGHで点灯、この線を忘れると全部無駄
#define MQ135_PIN  13   // MQ135アナログ入力（ADC2チャンネル、Wi-Fi未使用時正常動作）

#define SCREEN_WIDTH   240
#define SCREEN_HEIGHT  240

// ===================== ディスプレイドライバ初期化 =====================
Arduino_ESP32SPI bus = Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01 gfx = Arduino_GC9A01(&bus, TFT_RST, 0, true);

// ===================== LVGL描画バッファ =====================
// 40行バッファはESP32-S3上で約19KBメモリ消費、速度とメモリのバランス良好
#define DRAW_BUF_LINES 40
alignas(4) static uint16_t draw_buf[SCREEN_WIDTH * DRAW_BUF_LINES];

// ===================== トレンド履歴データ =====================
#define TREND_POINTS 40    // 最近40サンプルポイント保持（× 300ms ≈ 12秒で1画面分履歴）
static int trendData[TREND_POINTS] = {0};
static int trendIdx = 0;
static bool trendFull = false;
static lv_point_precise_t trendLinePoints[TREND_POINTS];

// ===================== LVGL UIオブジェクトハンドル =====================
static lv_obj_t *arc_bg;          // 円形トラック背景（暗色）
static lv_obj_t *arc_main;        // メイン円弧 + 末端ノブ小円点
static lv_obj_t *glow_circle;     // 外光沢枠（呼吸）
static lv_obj_t *center_circle;   // 中心円盤底板
static lv_obj_t *label_value;     // 中心大数字（ADC値）
static lv_obj_t *label_unit;      // 単位ラベル"ADC"
static lv_obj_t *label_status;    // ステータス文字（EXCELLENT / GOOD...）
static lv_obj_t *dot_status;      // ステータス小円点
static lv_obj_t *label_title;     // トップタイトル"AIR QUALITY"
static lv_obj_t *label_score;     // ボトム浄度スコア
static lv_obj_t *label_minmax;    // 最小/最大値
static lv_obj_t *trend_line;      // トレンド折れ線
static lv_obj_t *trend_container; // 折れ線クリップコンテナ

// ===================== センサー状態 =====================
static float smoothedValue = 0.0f; // 指数加重平均後の平滑値
static bool firstSample = true;    // 最初のフレームフラグ、0から開始するアニメーション回避
static int minValue = 4095;        // 今回起動時最低ADC値
static int maxValue = 0;           // 今回起動時最高ADC値
static float displayValue = 0.0f;  // UIアニメーション補間用

// ===================== LVGLクロックコールバック =====================
static uint32_t my_tick_cb(void) { return millis(); }

// ===================== リフレッシュコールバック：LVGL描画完了後画面にプッシュ =====================
void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = area->x2 - area->x1 + 1;
  uint32_t h = area->y2 - area->y1 + 1;
  gfx.draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)px_map, w, h);
  lv_display_flush_ready(disp); // LVGLに通知：このブロック描画完了、次へ続行可
}

// ===================== カラーシステム：ADC値 → ステータス色 =====================
// 数値が高いほど = 空気が悪い = 色が赤い、6段階で6つのステータスに対応
uint32_t getColorHex(int v) {
  if (v < 600)  return 0x00E5A0; // EXCELLENT：さわやかな緑
  if (v < 1200) return 0x22C55E; // GOOD：淡い緑
  if (v < 2000) return 0xA3E635; // FAIR：黄緑
  if (v < 2800) return 0xEAB308; // MODERATE：黄
  if (v < 3500) return 0xF97316; // POOR：橙
  return 0xFF3355;                // DANGER：赤（さっさと窓を開けろ）
}

lv_color_t getColor(int v) {
  return lv_color_hex(getColorHex(v));
}

// 円弧トラック底色（ステータス色の暗色版、暗色背景に調和）
uint32_t getDimColorHex(int v) {
  if (v < 600)  return 0x0A2A20;
  if (v < 1200) return 0x0A2A15;
  if (v < 2000) return 0x1A2A10;
  if (v < 2800) return 0x2A2208;
  if (v < 3500) return 0x2A1808;
  return 0x2A0A10;
}

const char* getStatusText(int v) {
  if (v < 600)  return "EXCELLENT";
  if (v < 1200) return "GOOD";
  if (v < 2000) return "FAIR";
  if (v < 2800) return "MODERATE";
  if (v < 3500) return "POOR";
  return "DANGER";
}

// ADC値を浄度パーセンテージに変換（ADCが低いほど = きれい = スコアが高い）
int adcToScore(int adc) {
  adc = constrain(adc, 0, 4095);
  return constrain(100 - (adc * 100 / 4095), 0, 100);
}

// ===================== UI画面作成 =====================
void create_ui() {
  lv_obj_t *scr = lv_screen_active();

  // ステップ1：暗色背景
  lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(scr, lv_color_hex(0x050810), 0);

  // ステップ2：最外周光沢枠（色はステータスに追従、呼吸アニメーション付き）
  glow_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(glow_circle);
  lv_obj_set_size(glow_circle, 234, 234);
  lv_obj_center(glow_circle);
  lv_obj_set_style_radius(glow_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(glow_circle, LV_OPA_TRANSP, 0);
  lv_obj_set_style_border_width(glow_circle, 2, 0);
  lv_obj_set_style_border_opa(glow_circle, LV_OPA_20, 0);
  lv_obj_set_style_border_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(glow_circle, 30, 0);
  lv_obj_set_style_shadow_spread(glow_circle, 2, 0);
  lv_obj_set_style_shadow_opa(glow_circle, LV_OPA_30, 0);
  lv_obj_set_style_shadow_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_clear_flag(glow_circle, LV_OBJ_FLAG_SCROLLABLE);

  // ステップ3：円弧トラック底色（「まだ到達していない」暗色エリア表示）
  arc_bg = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_bg);
  lv_obj_set_size(arc_bg, 210, 210);
  lv_obj_center(arc_bg);
  lv_arc_set_range(arc_bg, 0, 100);
  lv_arc_set_bg_angles(arc_bg, 135, 45);
  lv_arc_set_value(arc_bg, 0);
  lv_obj_set_style_arc_width(arc_bg, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(0x0A2A20), LV_PART_MAIN);
  lv_obj_set_style_arc_rounded(arc_bg, true, LV_PART_MAIN);
  lv_obj_set_style_arc_width(arc_bg, 0, LV_PART_INDICATOR);
  lv_obj_set_style_arc_opa(arc_bg, LV_OPA_TRANSP, LV_PART_INDICATOR);
  lv_obj_set_style_bg_opa(arc_bg, LV_OPA_TRANSP, LV_PART_KNOB);
  lv_obj_clear_flag(arc_bg, LV_OBJ_FLAG_CLICKABLE);

  // ステップ4：メイン円弧（リアルタイム数値 + 末端ノブ小円点）
  arc_main = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_main);
  lv_obj_set_size(arc_main, 210, 210);
  lv_obj_center(arc_main);
  lv_arc_set_range(arc_main, 0, 4095);
  lv_arc_set_bg_angles(arc_main, 135, 45);
  lv_arc_set_value(arc_main, 0);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_opa(arc_main, LV_OPA_TRANSP, LV_PART_MAIN);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_INDICATOR);
  lv_obj_set_style_arc_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_INDICATOR);
  lv_obj_set_style_arc_rounded(arc_main, true, LV_PART_INDICATOR);

  // knob = 末端小ハイライト、白縁 + 内部ステータス色 + 光沢影
  lv_obj_set_style_bg_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_bg_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_pad_all(arc_main, 5, LV_PART_KNOB);
  lv_obj_set_style_radius(arc_main, LV_RADIUS_CIRCLE, LV_PART_KNOB);
  lv_obj_set_style_border_width(arc_main, 3, LV_PART_KNOB);
  lv_obj_set_style_border_color(arc_main, lv_color_hex(0xFFFFFF), LV_PART_KNOB);
  lv_obj_set_style_border_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_shadow_width(arc_main, 18, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_shadow_opa(arc_main, LV_OPA_70, LV_PART_KNOB);
  lv_obj_set_style_shadow_spread(arc_main, 2, LV_PART_KNOB);
  lv_obj_clear_flag(arc_main, LV_OBJ_FLAG_CLICKABLE);

  // ステップ5：中心円盤（数値・トレンド線・ステータス文字配置）
  center_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(center_circle);
  lv_obj_set_size(center_circle, 140, 140);
  lv_obj_center(center_circle);
  lv_obj_set_style_radius(center_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(center_circle, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(center_circle, lv_color_hex(0x080E1A), 0);
  lv_obj_set_style_bg_grad_color(center_circle, lv_color_hex(0x0C1628), 0);
  lv_obj_set_style_bg_grad_dir(center_circle, LV_GRAD_DIR_VER, 0);
  lv_obj_set_style_border_width(center_circle, 1, 0);
  lv_obj_set_style_border_color(center_circle, lv_color_hex(0x1A3050), 0);
  lv_obj_set_style_border_opa(center_circle, LV_OPA_60, 0);
  lv_obj_set_style_pad_all(center_circle, 0, 0);
  lv_obj_clear_flag(center_circle, LV_OBJ_FLAG_SCROLLABLE);

  // 中心大数字
  label_value = lv_label_create(center_circle);
  lv_label_set_text(label_value, "0");
  lv_obj_set_style_text_font(label_value, &lv_font_montserrat_28, 0);
  lv_obj_set_style_text_color(label_value, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_value, LV_ALIGN_CENTER, 0, -26);

  // 単位ラベル
  label_unit = lv_label_create(center_circle);
  lv_label_set_text(label_unit, "ADC");
  lv_obj_set_style_text_font(label_unit, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_unit, lv_color_hex(0x506878), 0);
  lv_obj_align(label_unit, LV_ALIGN_CENTER, 0, -6);

  // トレンド折れ線コンテナ（クリップ用、折れ線がはみ出すのを防止）
  trend_container = lv_obj_create(center_circle);
  lv_obj_remove_style_all(trend_container);
  lv_obj_set_size(trend_container, 110, 30);
  lv_obj_align(trend_container, LV_ALIGN_CENTER, 0, 16);
  lv_obj_set_style_bg_opa(trend_container, LV_OPA_TRANSP, 0);
  lv_obj_set_style_pad_all(trend_container, 0, 0);
  lv_obj_set_style_clip_corner(trend_container, true, 0);
  lv_obj_set_style_radius(trend_container, 4, 0);
  lv_obj_clear_flag(trend_container, LV_OBJ_FLAG_SCROLLABLE);

  // 折れ線底辺参考基線
  static lv_point_precise_t refPts[2] = {{0, 28}, {110, 28}};
  lv_obj_t *refLine = lv_line_create(trend_container);
  lv_line_set_points(refLine, refPts, 2);
  lv_obj_set_style_line_color(refLine, lv_color_hex(0x1A2535), 0);
  lv_obj_set_style_line_width(refLine, 1, 0);

  // トレンド折れ線（全ポイントを底辺で初期化）
  for (int i = 0; i < TREND_POINTS; i++) {
    trendLinePoints[i].x = (int32_t)(i * 110 / (TREND_POINTS - 1));
    trendLinePoints[i].y = 28;
  }
  trend_line = lv_line_create(trend_container);
  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
  lv_obj_set_style_line_color(trend_line, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_line_width(trend_line, 2, 0);
  lv_obj_set_style_line_rounded(trend_line, true, 0);
  lv_obj_set_style_line_opa(trend_line, LV_OPA_70, 0);

  // ステータス小円点
  dot_status = lv_obj_create(center_circle);
  lv_obj_remove_style_all(dot_status);
  lv_obj_set_size(dot_status, 8, 8);
  lv_obj_set_style_radius(dot_status, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(dot_status, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(dot_status, 8, 0);
  lv_obj_set_style_shadow_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_opa(dot_status, LV_OPA_50, 0);
  lv_obj_align(dot_status, LV_ALIGN_CENTER, -42, 42);

  // ステータス文字
  label_status = lv_label_create(center_circle);
  lv_label_set_text(label_status, "EXCELLENT");
  lv_obj_set_style_text_font(label_status, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_status, LV_ALIGN_CENTER, 3, 42);

  // トップタイトル
  label_title = lv_label_create(scr);
  lv_label_set_text(label_title, "AIR QUALITY");
  lv_obj_set_style_text_font(label_title, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_title, lv_color_hex(0x4A6070), 0);
  lv_obj_set_style_text_letter_space(label_title, 3, 0);
  lv_obj_align(label_title, LV_ALIGN_TOP_MID, 0, 60);

  // ボトムスコア
  label_score = lv_label_create(scr);
  lv_label_set_text(label_score, "100% CLEAN");
  lv_obj_set_style_text_font(label_score, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_score, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_score, LV_ALIGN_BOTTOM_MID, 0, -8);

  // MIN/MAX記録（ボトムスコア上）
  label_minmax = lv_label_create(scr);
  lv_label_set_text(label_minmax, "L:-- H:--");
  lv_obj_set_style_text_font(label_minmax, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_minmax, lv_color_hex(0x3A4A5A), 0);
  lv_obj_align(label_minmax, LV_ALIGN_BOTTOM_MID, 0, -24);
}

// ===================== トレンド折れ線データ更新 =====================
void updateTrend(int value) {
  trendData[trendIdx] = value;
  trendIdx = (trendIdx + 1) % TREND_POINTS;
  if (trendIdx == 0) trendFull = true;

  int count = trendFull ? TREND_POINTS : trendIdx;
  if (count < 2) return;

  // データ範囲を探し、折れ線高さへの正規化に使用
  int vMin = 4095, vMax = 0;
  for (int i = 0; i < count; i++) {
    if (trendData[i] < vMin) vMin = trendData[i];
    if (trendData[i] > vMax) vMax = trendData[i];
  }
  // 最小変動振幅を保証——さもないと空気が安定しすぎているとき折れ線が完全に水平になる
  if (vMax - vMin < 50) vMax = vMin + 50;

  int chartW = 110;
  int chartH = 26;

  for (int i = 0; i < TREND_POINTS; i++) {
    int x = i * chartW / (TREND_POINTS - 1);
    int y;
    if (i < count) {
      int dataIdx = trendFull ? (trendIdx + i) % TREND_POINTS : i;
      int normalized = (trendData[dataIdx] - vMin) * chartH / (vMax - vMin);
      y = chartH - normalized + 1; // y軸反転：値が大きいほど点上へ
    } else {
      y = chartH + 1; // データなし位置は底辺に配置
    }
    trendLinePoints[i].x = x;
    trendLinePoints[i].y = y;
  }

  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
}

// ===================== UI表示更新 =====================
void update_ui(int value, int raw) {
  value = constrain(value, 0, 4095);
  raw   = constrain(raw, 0, 4095);

  // 平滑アニメーション：毎フレーム目標値へ18%接近、数字変化が滑らかで不自然でない
  float diff = (float)value - displayValue;
  displayValue += diff * 0.18f;
  int dispVal = (int)(displayValue + 0.5f);

  lv_color_t c  = getColor(dispVal);
  uint32_t dimC = getDimColorHex(dispVal);
  int score     = adcToScore(dispVal);

  // min/max記録更新
  if (raw < minValue) minValue = raw;
  if (raw > maxValue) maxValue = raw;

  // メイン円弧 + knob色はステータスに追従
  lv_arc_set_value(arc_main, dispVal);
  lv_obj_set_style_arc_color(arc_main, c, LV_PART_INDICATOR);
  lv_obj_set_style_bg_color(arc_main, c, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, c, LV_PART_KNOB);

  // トラック底色
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(dimC), LV_PART_MAIN);

  // 外光沢輪：色はステータスに追従 + sin関数で呼吸透明度シミュレート
  lv_obj_set_style_border_color(glow_circle, c, 0);
  lv_obj_set_style_shadow_color(glow_circle, c, 0);
  static uint32_t breathCount = 0;
  breathCount++;
  float sinVal = sinf((breathCount * 6) % 360 * 3.14159f / 180.0f);
  lv_opa_t breathOpa = (lv_opa_t)(LV_OPA_20 + (int)(sinVal * 25.0f));
  lv_obj_set_style_shadow_opa(glow_circle, breathOpa, 0);
  lv_opa_t borderOpa = (lv_opa_t)(LV_OPA_10 + (int)(sinVal * 15.0f));
  lv_obj_set_style_border_opa(glow_circle, borderOpa, 0);

  // 中心数値
  lv_label_set_text_fmt(label_value, "%d", dispVal);
  lv_obj_set_style_text_color(label_value, c, 0);

  // ステータス文字 + 小円点（小円点影も呼吸）
  lv_label_set_text(label_status, getStatusText(dispVal));
  lv_obj_set_style_text_color(label_status, c, 0);
  lv_obj_set_style_bg_color(dot_status, c, 0);
  lv_obj_set_style_shadow_color(dot_status, c, 0);
  lv_opa_t dotOpa = (lv_opa_t)(LV_OPA_30 + (int)(sinVal * 40.0f));
  lv_obj_set_style_shadow_opa(dot_status, dotOpa, 0);

  // トレンド線色
  lv_obj_set_style_line_color(trend_line, c, 0);

  // MIN/MAX
  lv_label_set_text_fmt(label_minmax, "L:%d  H:%d", minValue, maxValue);

  // ボトム浄度スコア
  const char *statusWord;
  if (score >= 80)      statusWord = "CLEAN";
  else if (score >= 60) statusWord = "FAIR";
  else if (score >= 40) statusWord = "HAZY";
  else if (score >= 20) statusWord = "DIRTY";
  else                  statusWord = "TOXIC";
  lv_label_set_text_fmt(label_score, "%d%% %s", score, statusWord);
  lv_obj_set_style_text_color(label_score, c, 0);
}

// ===================== setup =====================
void setup() {
  Serial.begin(115200);
  delay(200);

  // ステップ1：バックライトをハイにしないと画面はずっと暗いまま
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // ステップ2：ADC設定（12ビット精度、0-3.3Vレンジ）
  // 注：ADC_11dbはESP32 Core 3.xではADC_ATTEN_DB_12と同等、旧記法互換
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // ステップ3：ディスプレイ起動、SPI周波数40MHz
  gfx.begin(40000000);

  // ステップ4：LVGL初期化
  lv_init();
  lv_tick_set_cb(my_tick_cb);

  lv_display_t *disp = lv_display_create(SCREEN_WIDTH, SCREEN_HEIGHT);
  lv_display_set_color_format(disp, LV_COLOR_FORMAT_RGB565);
  lv_display_set_buffers(disp, draw_buf, NULL, sizeof(draw_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(disp, my_disp_flush);

  // ステップ5：UI構築、初期値0
  create_ui();
  displayValue = 0;
  update_ui(0, 0);

  Serial.println("[SYS] Gauge v3.1 Ready!");
}

// ===================== loop =====================
void loop() {
  static uint32_t lastSensorMs = 0;
  static uint32_t lastTrendMs  = 0;
  static uint32_t lastLogMs    = 0;

  uint32_t now = millis();

  // 50ms毎：センサー読み取り + UIリフレッシュ（約20fps、滑らかでカクつきなし）
  if (now - lastSensorMs >= 50) {
    int raw = analogRead(MQ135_PIN);
    raw = constrain(raw, 0, 4095);

    if (firstSample) {
      // 最初のフレームは直接代入、0から開始するアニメーション遷移をスキップ
      smoothedValue = raw;
      displayValue  = raw;
      firstSample   = false;
    } else {
      // 指数加重平均：新値12%、旧値88%保持、平滑だが鈍すぎない
      smoothedValue = smoothedValue * 0.88f + raw * 0.12f;
    }

    update_ui((int)smoothedValue, raw);
    lastSensorMs = now;
  }

  // 300ms毎：トレンド折れ線にデータポイント追加（40ポイント × 300ms ≈ 12秒で1画面履歴）
  if (now - lastTrendMs >= 300) {
    updateTrend((int)smoothedValue);
    lastTrendMs = now;
  }

  // 1秒毎：シリアル出力デバッグログ（問題確認時にシリアルモニタを開いて確認）
  if (now - lastLogMs >= 1000) {
    Serial.printf("SCORE=%d%%  ADC=%d  SMOOTH=%d  L=%d H=%d [%s]\n",
                  adcToScore((int)smoothedValue),
                  analogRead(MQ135_PIN),
                  (int)smoothedValue,
                  minValue, maxValue,
                  getStatusText((int)smoothedValue));
    lastLogMs = now;
  }

  lv_timer_handler(); // LVGL内部タスクスケジュール、定期的呼び出し必須、忘れるな
  delay(5);
}
```

### コード解説

主要な設計ポイントを解説しておかないと、コードを読むと混乱します：

**① なぜ指数加重平均を使うのか、生ADCを直接表示しないのか？**

MQ135のアナログ出力は一定のノイズを含み、直接表示すると数値が不停で跳ね回ります。指数加重平均（EMA）式：

```
新平滑値 = 旧平滑値 × 0.88 + 生値 × 0.12
```

0.12の重み付けは新データの影響が小さいことを意味し、数値変化は緩やかだがトレンドには追従できます。応答をより敏感にしたい場合は`0.12f`を大きく（上限1.0 = 完全無平滑）、より安定させたい場合は`0.88f`を大きく。

**② 呼吸効果はどう実現？**

`update_ui()`内で`sinf()`を使って-1～+1まで周期的に変化する値を生成し、透明度範囲（`LV_OPA_20` ～ `LV_OPA_45`）にマッピング、毎回呼び出し時にカウンタをインクリメント。外周枠と影の透明度がこうして周期的にフェードイン/フェードアウトし、「呼吸」しているように見えます。

**③ トレンド折れ線が時々平らになるのはなぜ？**

環境が非常に安定しており、履歴データの最大最小値差が小さい場合、折れ線は最低50 ADCの変動範囲に強制されます：

```cpp
if (vMax - vMin < 50) vMax = vMin + 50;
```

これで空気に変化がなくても折れ線は完全に水平にならず、微小変動も見えてきます。

---

## トラブルシューティング

慌てないで、80%の問題は以下の場所で発生します：

**画面が真っ暗で全く反応しない**
最初に確認すべき：BLピンがGPIO 7に接続されているか、コード内で`digitalWrite(TFT_BL, HIGH)`が実行されているか。バックライトがオンになっていないと画面は必ず暗い——これはディスプレイの故障ではなく、バックライトがハイになっていないだけです。

**画面が真っ白か真っ赤（色はあるがコンテンツがない）**
90%の確率でDCとCSピンが逆接続されています。配線表に沿ってこの2本を確認するか、単純に入れ替えてみてください。

**コンパイルエラー：`lv_font_montserrat_28 undeclared`**
`lv_conf.h`が正しく設定されていないか、配置場所が間違っています。「インストールが必要なライブラリ」章に戻り、手順通りにフォントオプションを0から1に変更してください。

**ADC読み取り値がずっと0または4095で変化しない**
テスターでMQ135のA0ピン出力電圧を測定、正常なら0.5V～2.5V間で変動するはずです。0VならVCC配線を確認；フルスケール（3.3V）ならセンサーが十分ウォームアップしていない可能性——新品センサーは電源投入直後読み取りが不安定、3分待ってから再確認。

**数値表示が激しく振動する**
コード内の平滑係数`0.88f`を大きく（例：`0.95f`）してください。平滑度が上がりますが、応答は遅くなります。

**LVGLコンパイルでメモリ不足または実行時フリーズ**
`DRAW_BUF_LINES`を40から小さく（例：20）変更し、バッファ消費を減らしてください。ESP32-S3標準RAMは十分ですが、RAMの小さいボードを使うとこの問題に遭遇します。

---

## FAQ

**Q：GPIO 13は固定？別のADCピンに変更可能？**
A：可能です。ESP32-S3ではGPIO 1～10はADC1、GPIO 11～20はADC2に属します。本プロジェクトはWi-Fiを使用しないため、ADC2ピン（GPIO 13含む）は競合なく正常使用可。後でWi-Fiを追加する場合は、センサーをADC1ピン（GPIO 1～10）に変更することを推奨——Wi-FiがADC2を占有する時の読み取りエラーを回避。

**Q：MQ135を3.3V駆動、読み取り精度は？**
A：十分正確ではありませんが、トレンド表示には完全に十分です。MQ135定格電圧5V、3.3V駆動時はヒーター電力が定格の約44%、感度低下・絶対値は低めになります。ppm濃度に換算する場合は、VCCに5V別供給、A0アナログ出力は3.3Vを超えないため追加分圧回路不要。

**Q：LVGLはv9必須？v8でも動く？**
A：v8は本コードを直接動かせません。v9は`lv_display_t`、`lv_display_create`等の新APIを導入、v8にはこれら構造体がないため、直接コンパイルすると大量エラー発生。v9.2.x以降のバージョンを強く推奨、ダウングレードしないでください。

**Q：円形ディスプレイ四隅に黒い「欠け」があるが、はんだ付け不良？**
A：正常現象、問題ありません。GC9A01は円形表示エリア、下層バッファは240×240方形、四隅はディスプレイ物理遮光構造で実際の画素点がなく、表示されないのが正解です。

**Q：センサー電源投入直後数値が激しく変動、安定までどれくらい待てば？**
A：MQ135はウォームアップが必要です。新品センサーは連続通電24～48時間後読み取りが安定に達します。既に使用済みセンサーは通電約3分後安定傾向。`setup()`末尾に`delay(180000)`（3分）を追加、またはUI上に「ウォームアップ中」ステータス表示を追加し、時間経過後正式に収集開始可能。

**Q：画面リフレッシュが少しカクカク、速度向上方法は？**
A：2方向：① `gfx.begin(40000000)`内のSPI周波数を80MHzへ変更（GC9A01最大対応80MHzですが、一部ボードは配線品質が悪いと不安定、まずテスト推奨）；② `DRAW_BUF_LINES`増大（例：60に変更）、LVGL分割リフレッシュ回数削減、代償は約9KB RAM増加。

---

## 応用展開

動作した後、以下の方向へ拡張可能：

- BME280接続、温湿度ルート追加、ダッシュボードにもう一行データ表示
- Wi-Fi経由でADCデータをHome Assistantへ上报、長期履歴曲線作成
- ボタン追加で表示モード切替（ダッシュボード / 大字モード / 純粋折れ線）
- MQ-7センサー交換、一酸化炭素濃度専用モニタリング
- ブザー追加、空気品質がDANGER域に入った時にアラーム発火

---

## 参考資料

- [GC9A01 ドライバICデータシート（Galaxycore公式）](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [MQ135 センサー仕様書（Winsen 炜盛公式）](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ135%20(Ver1.4)%20-%20Manual.pdf)
- [Arduino_GFX_Library GitHubページ](https://github.com/moononournation/Arduino_GFX)
- [LVGL公式ドキュメント v9](https://docs.lvgl.io/9.0/)
<!-- - [ESP32-S3 テクニカルリファレンスマニュアル（Espressif公式）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf) -->