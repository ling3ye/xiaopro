---
title: "ESP32-S3 + MAX98357A で V8 エンジンサウンドシミュレーターを作る完全チュートリアル（I2S デジタルオーディオ + KY-040 ロータリーエンコーダーでスロットル制御）"
boardId: esp32s3
moduleId: audio/max98357a
moduleIds:
  - audio/max98357a
  - sensor/ky-040
category: esp32
date: 2026-07-14
intro: "ESP32-S3 で MAX98357A アンプモジュールを駆動し、KY-040 ロータリーエンコーダーと組み合わせて、コードだけで V8 エンジンサウンドをリアルタイム合成します——スロットルはエンコーダーで手動制御、サウンドはスピーカーからリアルタイム出力。完全な配線、コード、ハマりどころ記録付き。"
image: "https://img.lingflux.com/2026/07/6c72c55fa63614eb8c2086c24d993d5f.jpg"
---

> **TL;DR（クイックスタート）：**
>
> 1. 配線：MAX98357A の BCLK → GPIO16、LRC → GPIO17、DIN → GPIO15；KY-040 の CLK → GPIO5、DT → GPIO6、SW → GPIO7
> 2. ボードは **ESP32S3 Dev Module**、PSRAM は **QSPI PSRAM** を選択（間違えると OOM になります、どうして知ってるかは聞かないで）
> 3. エンコーダーを時計回りに回す = スロットルを下げる、反時計回り = スロットルを上げる、押し込む = アイドリングに戻る
> 4. 書き込んで、電源を入れて、あなたの「V8 電動車」を楽しもう

---

難易度：⭐⭐⭐☆☆（Arduino の基本的な配線と書き込みができること）
所要時間：45 分
テスト環境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + ESP32-S3-WROOM-1-N16R8（16MB Flash + 8MB PSRAM）

---

## はじめに

電動自転車に乗ったことがある人なら、あの気まずさがわかるはず：音もなく背後から歩行者に近づき、相手を飛び上がらせてしまい、振り返った人から「なんで音出さないの」という視線を向けられる——あなたは気まずい微笑みを返すしかない。なぜならあなたの車は確かに……音がしないから。

電動車は省エネで環境に優しいが、ただ一つ悩みの種がある：静かすぎるのだ。まるで幽霊のように、道路を漂っているほど静か。

そこで考えた：エンジン自带の音に頼れないなら、自分で**音を作ってしまえば**いいのでは？ 安いスピーカーが流す「プープー」という音ではなく……V8 エンジンのサウンド？ 低く、力強く、アクセルを踏み込めばドコドコと轟くような。

本記事の目標は：**ESP32-S3 + MAX98357A アンプモジュール + KY-040 ロータリーエンコーダー**を使い、コードだけで V8 エンジンサウンドを合成すること。スロットルの大きさはエンコーダーで手動制御し、サウンドはスピーカーからリアルタイム出力される。サンプリングなし、音声ファイルの再生なし、全部リアルタイムの数学的計算で作り出したエンジン音だ。



---

## 実験結果

KY-040 エンコーダーを回してスロットルを開けると、スピーカーは低く唸るアイドリング音から次第に高回転のエンジン轟音へと移行していく；エンコーダーのボタンを押し込むと、スロットルは即座にゼロになり、アイドリング状態に戻る。サウンドの移行は滑らかで、唐突なジャンプがなく、けっこうそれっぽく聞こえる。


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30IWSgfp3IY?si=XXwD3KaDonejM5WD" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## パーツ説明

> 開発ボード（ESP32-S3）の説明は省き、もう二つの主役を中心に紹介する。

### MAX98357A — デジタル信号の通訳

デジタル録音（0 と 1 の並び）が手元にあるが、スピーカーはアナログ信号（電圧の高低変化）しか理解できない、と想像してほしい。MAX98357A はまさにその両者の間の**同時通訳**だ：ESP32-S3 が I2S プロトコルで送り出すデジタルオーディオを受け取り、それをリアルタイムにスピーカーを駆動できるアナログ電流に変換する。しかも 3W のアンプを内蔵しているため、追加で増幅回路を用意する必要がない。

| パラメータ | 数値 |
|------|------|
| 電源電圧 | 2.5V ～ 5.5V |
| 出力電力 | 3.2W（4Ω負荷、5V駆動） |
| サンプリングレート対応 | 8kHz ～ 96kHz |
| 通信プロトコル | I2S |
| ゲイン段階 | 3dB / 6dB / 9dB / 12dB / 15dB |
| ミュート制御 | SD ピンを LOW にするとミュート |

これを選ぶ理由はシンプル：**I2S 直結、フィルター不要、モジュールパッケージ、3W あればバイク用途には十分**、しかもタオバオなら10元以内で手に入る。

### ピン説明

| ピン表記 | 機能説明 |
|----------|----------|
| VIN | 電源プラス、5V に接続 |
| GND | 電源グランド |
| BCLK | I2S ビットクロック |
| LRC | I2S ワードクロック（左右チャンネル選択） |
| DIN | I2S デジタルオーディオデータ入力 |
| SD | ミュート制御、浮遊または HIGH 接続 = 正常動作、LOW = ミュート |
| GAIN | ゲイン選択、浮遊でデフォルト 9dB |

> **注意**：SD ピンは未接続でも 3.3V 接続でも正常に音が出る；配線に問題ないのにどうしても音が出ない場合、まず SD ピンが意図せず LOW に引き下げられていないか確認しよう。

---

### KY-040 — 無限回転の「音量ツマミ」

普通のポテンショメーターは端まで回すと引っかかって止まるが、KY-040 は 360° 無限回転のエンコーダーで、絶対位置を出力するのではなく「どっちの方向に何ステップ回ったか」を教えてくれる。本プロジェクトではこれでスロットルを制御する：**時計回りに回すとスロットルを下げ、反時計回りに回すとスロットルを上げ、ボタンを押し込むとアイドリングに戻る**。操作感はまるで本物のスロットルダイヤルを回しているようだ。

| パラメータ | 数値 |
|------|------|
| 動作電圧 | 3.3V ～ 5V |
| 1回転あたりのステップ数 | 20 ステップ |
| 出力信号 | A 相（CLK）/ B 相（DT）/ ボタン（SW） |
| インターフェース種別 | デジタル GPIO（内部プルアップ付き） |

これを選ぶ理由：**安い、手に入りやすい、ボタン付きはポイント高**、割り込み駆動で CPU を食わない、FreeRTOS タスク構成と組み合わせれば全く問題ない。

### ピン説明

| ピン表記 | 機能説明 |
|----------|----------|
| CLK（A 相） | ロータリーエンコーダー A 相出力、割り込みピンに接続 |
| DT（B 相） | ロータリーエンコーダー B 相出力、回転方向の判定用 |
| SW | ボタン出力、押すと LOW |
| + | 電源プラス、3.3V に接続 |
| GND | 電源グランド |

---

## BOM 表

| 部品 | 型番/スペック | 数量 | 備考 |
|------|-----------|------|------|
| メイン開発ボード | ESP32-S3-WROOM-1-N16R8 | 1 | 16MB Flash + 8MB PSRAM、PSRAM 必須 |
| I2S アンプモジュール | MAX98357A | 1 | モジュール基板付き、ハンダ不要バージョンが便利 |
| ロータリーエンコーダーモジュール | KY-040 | 1 | ボタン付き |
| 小型スピーカー | 4Ω 3W | 1 | または 8Ω、音量はやや小さくなる |
| ジャンパワイヤー | オス‑オス / オス‑メス | 適量 | 配線用 |
| ブレッドボード | 任意 | 1 | 任意、配線固定に便利 |

---

## 配線方式

### MAX98357A ↔ ESP32-S3

| MAX98357A | ESP32-S3 |
|-----------|----------|
| VIN | 5V |
| GND | GND |
| BCLK | GPIO16 |
| LRC | GPIO17 |
| DIN | GPIO15 |

### KY-040 ↔ ESP32-S3

| KY-040 | ESP32-S3 |
|--------|----------|
| CLK | GPIO5 |
| DT | GPIO6 |
| SW | GPIO7 |
| + | 3.3V |
| GND | GND |

> 1本ずつ配線を終えるたびに表にチェックを入れて照合するのがおすすめ。この習慣でトラブルシュート時間の 80% を節約できる。特に GND、複数モジュールを共通グラウンドに繋ぐのはオーディオが正常に動作する前提だ——全員が同じ言語を話してこそ、信号が正確に伝わる。

---

## インストールが必要なライブラリ

本プロジェクトは**サードパーティのオーディオライブラリに一切依存しない**。オーディオはすべてコードでリアルタイム合成し、ESP32 Arduino Core に同梱の `driver/i2s.h` しか使わない。

Arduino IDE で以下の環境が整っていることを確認するだけ：

| 項目 | 要件 |
|------|------|
| Arduino IDE | 2.3.8（テスト通過） |
| ESP32 Arduino Core | 3.3.10（Board Manager で `esp32` を検索してインストール） |
| ボードオプション | ESP32S3 Dev Module |
| **PSRAM オプション** | **QSPI PSRAM**（これを間違えると OOM になります、ハマりどころ記録を参照） |
| Flash Size | 16MB |
| Upload Speed | 921600 |

Arduino IDE の **ツール（Tools）** メニューで上記の各項目を一度確認しよう。特に PSRAM の行。

---

## 完全コード + 解説

```cpp
/*
 * ESP32-S3 + MAX98357A + KY-040 ロータリーエンコーダー
 * V8 エンジンサウンドシミュレーター
 *
 * 配線：
 *   MAX98357A    ESP32-S3
 *   VIN       -> 5V
 *   GND       -> GND
 *   BCLK      -> GPIO16
 *   LRC       -> GPIO17
 *   DIN       -> GPIO15
 *
 *   KY-040       ESP32-S3
 *   CLK       -> GPIO5
 *   DT        -> GPIO6
 *   SW        -> GPIO7  (押し込むとスロットルがゼロに)
 *   +         -> 3.3V
 *   GND       -> GND
 *
 * 操作説明：
 *   時計回り = スロットルを下げる
 *   反時計回り = スロットルを上げる
 *   エンコーダー押し込み = スロットルゼロ（アイドリングに戻る）
 *
 * シリアル波特率：115200
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// -----------------------------------------------
// Brownout による電源断リセットに遭遇したら、ここを 1 にして一時テスト
// 実運用では 0 のまま維持すること、低電圧保護の長期無効化は推奨しません
// -----------------------------------------------
#define DISABLE_BROWNOUT_FOR_TEST 0

#if DISABLE_BROWNOUT_FOR_TEST
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

// ================= ステップ1：I2S ピン定義 =================
#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

// ================= ステップ2：KY-040 ピン定義 =================
#define ENCODER_CLK_PIN   5
#define ENCODER_DT_PIN    6
#define ENCODER_SW_PIN    7

// ================= エンコーダースロットルパラメータ =================
// 1ステップあたりのスロットル変化量（範囲 0.0～1.0）
// この値を小さくする = フルスロットルまでより多く回す必要があり、操作感が繊細になる
#define ENCODER_STEP_SIZE     0.1f

// スロットル滑移係数（大きいほど応答が速く、小さいほど滑らか）
#define ENCODER_SMOOTHING     1.2f

// エンコーダーのチャタリング除去時間（マイクロ秒）、1回の回転が複数回と誤読されるのを防ぐ
#define ENCODER_DEBOUNCE_US   200

// ボタンのチャタリング除去時間（ミリ秒）
#define BUTTON_DEBOUNCE_MS    200

// ================= オーディオ基本パラメータ =================
#define SAMPLE_RATE     22050   // サンプリングレート、単位 Hz
#define DMA_BUF_COUNT   8       // DMA バッファ数
#define DMA_BUF_LEN     256     // 各 DMA バッファのサンプル数

// ================= エンジン回転数パラメータ =================
#define RPM_IDLE        800.0f    // アイドリング回転数（RPM）
#define RPM_MAX         8000.0f   // 最高回転数（RPM）
#define RPM_SMOOTHING   0.006f    // 回転数変化の平滑化係数、小さいほど実エンジンらしい
#define NUM_CYLINDERS   8         // V8 = 8 気筒

// ================= 排気パフ音のリズム =================
// アイドリング時は毎秒2回パフ、最高回転時は毎秒7.6回パフ
#define THUMP_HZ_IDLE   2.0f
#define THUMP_HZ_MAX    7.6f

// ================= 音量パラメータ =================
#define MASTER_VOLUME       1.00f
#define PCM_OUTPUT_SCALE    26000.0f   // 最終的に 16bit PCM へ出力するスケール係数

// 背景エンジン音の音量（アイドリング / 満開）
#define BACKGROUND_GAIN_IDLE  0.45f
#define BACKGROUND_GAIN_MAX   0.60f

// メインパフ音レイヤーの音量（アイドリング / 満開）
#define THUMP_LAYER_GAIN_IDLE 0.75f
#define THUMP_LAYER_GAIN_MAX  1.05f

// ================= 改造ストレート砲筒のパフ音パラメータ =================
// 以下のパラメータは1回の排気パフ音の波形形状を制御する、調整は慎重に
#define THUMP_ATTACK_MS       5.0f    // アタック時間（ms）
#define THUMP_BODY_MS         38.0f   // 主体持続時間（ms）
#define THUMP_TAIL_MS         62.0f   // 余韻減衰時間（ms）

#define THUMP_F_START         105.0f  // パフ音の開始周波数（Hz）
#define THUMP_F_BODY          82.0f   // 主体の周波数（Hz）
#define THUMP_F_END           64.0f   // 末尾の周波数（Hz）

#define THUMP_NOISE_MIX       0.22f   // ノイズ混入比率（排気の気流音をシミュレート）
#define THUMP_TONE2_MIX       0.30f   // 第2高調波の比率
#define THUMP_TONE3_MIX       0.16f   // 第3高調波の比率
#define THUMP_SUB_MIX         0.08f   // サブ低域比率（低域の重厚感を強調）

#define THUMP_DRIVE           2.10f   // 波形の飽和度（tanh ソフトクリップ強度）
#define THUMP_BURST_MIX       0.28f   // バースト期の気流ノイズ比率

#define THUMP_REBOUND_DELAY_MS 30.0f  // 排気リバウンド遅延（ms）、管の共鳴をシミュレート
#define THUMP_REBOUND_GAIN     0.18f  // リバウンドゲイン

#define THUMP_ALT_GAIN         0.94f  // 交互気筒のゲイン差、不均一な点火をシミュレート
#define THUMP_SWING            0.06f  // リズムのスイング量（Swing）、グルーヴ感を追加

#define THUMP_TABLE_GAIN       2.50f  // パフ音波形テーブル全体のゲイン

// ================= ルックアップテーブル定義 =================
#define SINE_TABLE_SIZE 2048     // 正弦波ルックアップテーブルサイズ（大きいほど精度が高いがメモリ消費増）
#define THUMP_TABLE_MAX 8000     // パフ音波形テーブルの最大サンプル数

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

// 出力ステレオバッファ（左右チャンネル各 DMA_BUF_LEN 個のサンプル）
static int16_t stereoBuffer[DMA_BUF_LEN * 2];

// ================= グローバル状態変数 =================
volatile float throttleValue  = 0.0f;   // 現在の平滑化されたスロットル値（0.0～1.0）
volatile float targetThrottle = 0.0f;   // エンコーダーが設定した目標スロットル
volatile float targetRPM      = RPM_IDLE;
volatile float currentRPM     = RPM_IDLE;
volatile float currentThumpHz = THUMP_HZ_IDLE;

uint32_t noiseSeed = 123456789;

// V8 気筒の位相オフセットテーブル（90° 等間隔点火をシミュレート）
float cylinderPhase[NUM_CYLINDERS];

const float firingAngles[NUM_CYLINDERS] = {
  0.0f, 90.0f, 150.0f, 210.0f,
  270.0f, 330.0f, 390.0f, 450.0f
};

// ================= エンコーダー割り込み関連変数 =================
volatile int encoderPosition = 0;
volatile unsigned long lastEncoderInterruptUs = 0;
volatile bool encoderButtonPressed = false;
volatile unsigned long lastButtonPressMs = 0;

// ================= ユーティリティ関数 =================

// 数値のクリップ
static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// 滑らかな階段関数、遷移を滑らかにする（S 字カーブ）
static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

// ルックアップテーブルで高速に sin を計算、sinf() よりずっと速い。リアルタイムオーディオでは必須
float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;

  // 線形補間で精度を高める
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

// 疑似乱数ノイズ生成（線形合同法、高速、気流音のシミュレートに使用）
float pseudoRandom() {
  noiseSeed = noiseSeed * 1664525UL + 1013904223UL;
  return ((float)(noiseSeed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// 独立シード付き疑似乱数（パフ音波形生成に使用、毎回同じ音になるよう保証）
float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= エンコーダー割り込み：回転方向の判定 =================
void IRAM_ATTR encoderISR() {
  unsigned long nowUs = micros();

  // チャタリング除去：2回の割り込み間隔が短すぎる場合は無視、機械的チャタリングの誤発火を防止
  if (nowUs - lastEncoderInterruptUs < ENCODER_DEBOUNCE_US) return;
  lastEncoderInterruptUs = nowUs;

  // CLK 立ち下がりエッジでトリガー、このとき DT ピンの電圧を読んで方向を判定
  // DT = LOW  → 時計回り → スロットルを下げる
  // DT = HIGH → 反時計回り → スロットルを上げる
  int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState == LOW) {
    encoderPosition--;  // 時計回り：スロットルを下げる
  } else {
    encoderPosition++;  // 反時計回り：スロットルを上げる
  }
}

// ================= ボタン割り込み：押し込みでスロットルゼロ =================
void IRAM_ATTR buttonISR() {
  unsigned long nowMs = millis();
  if (nowMs - lastButtonPressMs < BUTTON_DEBOUNCE_MS) return;
  lastButtonPressMs = nowMs;
  encoderButtonPressed = true;
}

// ================= エンコーダーのピンと割り込みを初期化 =================
void initEncoder() {
  pinMode(ENCODER_CLK_PIN, INPUT_PULLUP);
  pinMode(ENCODER_DT_PIN,  INPUT_PULLUP);
  pinMode(ENCODER_SW_PIN,  INPUT_PULLUP);

  // CLK 立ち下がりエッジで回転検出
  attachInterrupt(digitalPinToInterrupt(ENCODER_CLK_PIN), encoderISR, FALLING);
  // SW 立ち下がりエッジでボタン検出（押し込みで LOW）
  attachInterrupt(digitalPinToInterrupt(ENCODER_SW_PIN),  buttonISR, FALLING);

  Serial.println("KY-040 エンコーダー初期化完了");
}

// ================= ステップ3：正弦波ルックアップテーブルの事前計算 =================
// 2048 個の sin 値をメモリにあらかじめ計算しておき、再生時にテーブルを引くだけで CPU を節約
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

// ================= 8 気筒の位相オフセットを初期化 =================
void initCylinderPhases() {
  for (int i = 0; i < NUM_CYLINDERS; i++) {
    // 角度を 0.0～1.0 の位相に変換（720° が完全な燃焼サイクル1回分）
    cylinderPhase[i] = firingAngles[i] / 720.0f;
  }
}

// ================= 単一気筒の排気パルス波形を生成 =================
// phase は 0.0～1.0 の現在の位相、その瞬間の振幅を返す
float generateCylinderPulse(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float pulse = 0.0f;

  if (phase < 0.30f) {
    // 前 30%：急上昇、排気バルブが開く衝撃をシミュレート
    float t = phase / 0.30f;
    pulse = sinf(M_PI * t) * expf(-2.2f * t) * 1.35f;
  } else if (phase < 0.50f) {
    // 30%～50%：わずかなリバウンド、管の背圧をシミュレート
    float t = (phase - 0.30f) / 0.20f;
    pulse = -0.25f * sinf(M_PI * 2.0f * t) * expf(-5.0f * t);
  }
  // 後半 50%：無音、次の排気を待つ

  return pulse;
}

// ================= ステップ4：パフ音波形テーブルの事前計算 =================
// 1回分の完全な「パフ」音をあらかじめ計算して配列に格納、再生時に直接読み出して CPU を節約
void buildStraightPipeThumpTable() {
  int attackS  = (int)(THUMP_ATTACK_MS  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(THUMP_BODY_MS    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(THUMP_TAIL_MS    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(THUMP_REBOUND_DELAY_MS * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen  = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;  // リバウンド余韻を追加

  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1   = 0.0f;  // 基本周波数の位相
  float phase2   = 0.0f;  // 第2高調波の位相
  float phase3   = 0.0f;  // 第3高調波の位相
  float phaseSub = 0.0f;  // サブ低域の位相

  float noiseLP1 = 0.0f;  // ローパスフィルタの状態 1
  float noiseLP2 = 0.0f;  // ローパスフィルタの状態 2
  uint32_t seed  = 24681357;

  for (int i = 0; i < totalLen; i++) {

    // --- メインエンベロープを計算（アタック→主体→減衰）---
    float env1 = 0.0f;

    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;  // 2乗してアタックをより鋭く
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    // --- リバウンドエンベロープを計算（一定時間遅延した小さなエコー）---
    int j = i - reboundS;
    float env2 = 0.0f;

    if (j >= 0) {
      if (j < attackS) {
        float x = (float)j / (float)attackS;
        env2 = smoothstep01(x);
        env2 = env2 * env2;
      } else if (j < attackS + bodyS) {
        float x = (float)(j - attackS) / (float)bodyS;
        env2 = 1.0f - 0.28f * x;
      } else if (j < mainLen) {
        float x = (float)(j - attackS - bodyS) / (float)tailS;
        env2 = 0.72f * expf(-3.8f * x);
      }
      env2 *= THUMP_REBOUND_GAIN;  // リバウンドは本体よりずっと小さい
    }

    float env = clampf(env1 + env2, 0.0f, 1.5f);

    // --- 周波数が時間とともに下がる（排気圧力の解放後のピッチ低下をシミュレート）---
    float freq = THUMP_F_END;
    if (i < attackS) {
      freq = THUMP_F_START;
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      freq = THUMP_F_START + (THUMP_F_BODY - THUMP_F_START) * x;
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      freq = THUMP_F_BODY + (THUMP_F_END - THUMP_F_BODY) * x;
    }

    float inc1 = freq / (float)SAMPLE_RATE;

    phase1   += inc1;       if (phase1   >= 1.0f) phase1   -= 1.0f;
    phase2   += inc1 * 2.0f; if (phase2  >= 1.0f) phase2   -= 1.0f;
    phase3   += inc1 * 3.0f; if (phase3  >= 1.0f) phase3   -= 1.0f;
    phaseSub += inc1 * 0.5f; if (phaseSub >= 1.0f) phaseSub -= 1.0f;

    // --- 音調成分の合成：基本波 + 高調波 + サブ低域 ---
    float base = fastSin(phase1);
    base = tanhf(base * THUMP_DRIVE);  // ソフトクリップ、マフラーの非線形歪みをシミュレート

    float tonal =
        0.82f          * base
      + THUMP_TONE2_MIX * fastSin(phase2)
      + THUMP_TONE3_MIX * fastSin(phase3)
      + THUMP_SUB_MIX   * fastSin(phaseSub);

    // --- ノイズ成分の合成：気流が噴き出すシューという音をシミュレート ---
    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);   // 2段ローパスでノイズを低域寄りに
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;     // バンドパス効果

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;  // 後半は気流音を減衰

    float air = bandNoise * (THUMP_NOISE_MIX * (0.25f * env + THUMP_BURST_MIX * 0.75f * earlyEnv));

    // --- 音調と気流をミックスし、非対称ソフトクリップをもう一度 ---
    float sample = tonal * env + air;
    sample += 0.08f * env * env1;  // わずかな非線形な重畳で音に質感を加える

    if (sample > 0.0f) {
      sample = tanhf(sample * 1.15f) * 1.05f;  // 正の半周期を少し押し上げ
    } else {
      sample = tanhf(sample * 0.85f);           // 負の半周期を少し押し下げ
    }

    sample *= THUMP_TABLE_GAIN;
    thumpTable[i] = clampf(sample, -1.0f, 1.0f);
  }

  thumpTableLen = totalLen;

  Serial.printf("パフ音テーブル生成完了、長さ=%d samples、約 %d ms\n",
    thumpTableLen,
    (int)((float)thumpTableLen * 1000.0f / SAMPLE_RATE));
}

// ================= ステップ5：I2S ドライバの初期化 =================
void initI2S() {
  i2s_config_t i2s_config = {
    .mode                = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate         = SAMPLE_RATE,
    .bits_per_sample     = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format      = I2S_CHANNEL_FMT_RIGHT_LEFT,   // ステレオ（左右各1チャンネル）
    .communication_format= I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags    = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count       = DMA_BUF_COUNT,
    .dma_buf_len         = DMA_BUF_LEN,
    .use_apll            = false,
    .tx_desc_auto_clear  = true,   // 送信後に自動クリア、ノイズを防止
    .fixed_mclk          = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK,
    .ws_io_num    = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num  = I2S_PIN_NO_CHANGE  // 送信のみ、受信なし
  };

  esp_err_t err;

  err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("I2S ドライバのインストール失敗: %d\n", (int)err);
    while (1) delay(100);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("I2S ピン設定失敗: %d\n", (int)err);
    while (1) delay(100);
  }

  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S 初期化完了");
}

// ================= スロットル更新（throttleTask から 20ms ごとに呼ばれる）=================
void updateThrottle() {

  // ボタン処理：押し込むとエンコーダー位置とスロットルを同時にゼロに
  if (encoderButtonPressed) {
    encoderButtonPressed = false;
    encoderPosition = 0;
    targetThrottle  = 0.0f;
    Serial.println(">>> ボタン押し込み：スロットルゼロ！");
  }

  // エンコーダー位置の範囲を制限、回し続けて 0〜フルスロットル区間を超えないように
  int maxSteps = (int)(1.0f / ENCODER_STEP_SIZE);  // デフォルトは10ステップでフルスロットル

  if (encoderPosition < 0)        encoderPosition = 0;
  if (encoderPosition > maxSteps) encoderPosition = maxSteps;

  // ステップ数を 0.0～1.0 のスロットル値に換算
  targetThrottle = clampf((float)encoderPosition * ENCODER_STEP_SIZE, 0.0f, 1.0f);

  // 滑らかな遷移：毎回少しずつ進める、スロットルの急変による音のカクつきを回避
  throttleValue += (targetThrottle - throttleValue) * ENCODER_SMOOTHING;
  throttleValue  = clampf(throttleValue, 0.0f, 1.0f);

  // スロットルに基づいて目標回転数を計算
  targetRPM = RPM_IDLE + throttleValue * (RPM_MAX - RPM_IDLE);
}

// ================= オーディオ生成タスク（コア1で実行、最高優先度）=================
void audioTask(void *param) {
  float crankPhase = 0.0f;   // クランクシャフトの位相、全気筒を駆動

  float bgLpf    = 0.0f;    // 背景音ローパスフィルタの状態
  float bgHpfIn  = 0.0f;    // 背景音ハイパスフィルタの入力
  float bgHpfOut = 0.0f;    // 背景音ハイパスフィルタの出力

  int   playPosA = -1;       // パフ音 A パートの現在の再生位置（-1 は非アクティブ）
  int   playPosB = -1;       // パフ音 B パート（前回のパフ音のフェードアウト）
  float gainA    = 1.0f;
  float gainB    = 0.55f;

  int  samplesToNextTrigger = 0;   // 次のパフ音トリガーまでのサンプル数
  bool altToggle = false;          // 交互気筒切り替えフラグ

  float thumpLpf  = 0.0f;   // パフ音ローパスフィルタの状態
  float outHpfIn  = 0.0f;   // 出力ハイパスフィルタの入力
  float outHpfOut = 0.0f;   // 出力ハイパスフィルタの出力

  uint32_t jitterSeed = 987654321;

  unsigned long audioStartMs = millis();

  Serial.println("オーディオタスク起動");

  while (true) {

    // --- 回転数の滑らかな追従（実エンジンの慣性をシミュレート）---
    currentRPM += (targetRPM - currentRPM) * RPM_SMOOTHING;

    // 現在回転数の 0.0～1.0 範囲の正規化値
    float rpmNorm = clampf((currentRPM - RPM_IDLE) / (RPM_MAX - RPM_IDLE), 0.0f, 1.0f);

    // クランクシャフトの1サンプルあたりの位相増分（4ストローク÷2）
    float cycleIncrement = ((currentRPM / 60.0f) / (float)SAMPLE_RATE) / 2.0f;

    // 現在のパフ音周波数
    float thumpHz = THUMP_HZ_IDLE + rpmNorm * (THUMP_HZ_MAX - THUMP_HZ_IDLE);
    currentThumpHz = thumpHz;

    // 音量が回転数に応じて変化
    float bgGain = BACKGROUND_GAIN_IDLE + rpmNorm * (BACKGROUND_GAIN_MAX - BACKGROUND_GAIN_IDLE);
    float thumpLayerGain = THUMP_LAYER_GAIN_IDLE + rpmNorm * (THUMP_LAYER_GAIN_MAX - THUMP_LAYER_GAIN_IDLE);

    // ローパス遮断周波数が回転数とともに上昇（高回転時に背景音をより明るく）
    float bgLpfAlpha = 0.16f + 0.55f * rpmNorm;

    // 起動時のフェードイン（電源投入瞬間のポップ音を防止）
    float fadeIn = clampf((float)(millis() - audioStartMs) / 1800.0f, 0.0f, 1.0f);

    // --- サンプルごとにオーディオを生成 ---
    for (int i = 0; i < DMA_BUF_LEN; i++) {

      // ====================================================
      // レイヤー1：背景エンジン音——8 気筒の排気パルスの重ね合わせ
      // ====================================================
      float bg = 0.0f;

      for (int cyl = 0; cyl < NUM_CYLINDERS; cyl++) {
        float phase = crankPhase - cylinderPhase[cyl];
        while (phase < 0.0f) phase += 1.0f;
        while (phase >= 1.0f) phase -= 1.0f;

        float pulse = generateCylinderPulse(phase);
        float cylGain = (cyl % 2 == 0) ? 1.0f : 0.82f;  // 奇数・偶数気筒でわずかに差をつけ、よりリアルに
        bg += pulse * cylGain;
      }

      bg /= (float)NUM_CYLINDERS * 0.42f;

      // 高調波レイヤーを追加（低域を重視、高次高調波のうなる感を減らす）
      float basePhase  = crankPhase * 4.0f;
      float harmonics  = 0.0f;

      harmonics += fastSin(basePhase)        * 1.00f;
      harmonics += fastSin(basePhase * 0.5f) * 0.60f;   // 半周波数：低域の重厚感を強調
      harmonics += fastSin(basePhase * 1.5f) * 0.28f;
      harmonics += fastSin(basePhase * 2.0f) * (0.25f + 0.10f * rpmNorm);
      harmonics += fastSin(basePhase * 3.0f) * (0.08f + 0.08f * rpmNorm);
      harmonics += fastSin(basePhase * 4.0f) * (0.03f * rpmNorm);  // 第4高調波はうなり音の源、かなり抑える
      harmonics /= 2.4f;

      bg = bg * 0.55f + harmonics * 0.45f;
      bg = tanhf(bg * (1.05f + rpmNorm * 0.8f));  // ソフトクリップ、マフラーの非線形性をシミュレート

      // 低域の機械ノイズを追加（ゴロゴロ音、シューという音ではない）
      float rumble   = pseudoRandom();
      float rumble2  = pseudoRandom();
      bg += (rumble * 0.6f + rumble2 * 0.4f) * (0.008f + 0.018f * rpmNorm);

      // ローパスフィルタ（音がマフラー内部から出てくるように、もう少し籠もった音に）
      float bgLpfAlpha2 = 0.18f + 0.45f * rpmNorm;
      bgLpf += bgLpfAlpha2 * (bg - bgLpf);
      bg = bgLpf;

      // 軽いハイパス（DC オフセットを除去）
      float bgHp = 0.992f * (bgHpfOut + bg - bgHpfIn);
      bgHpfIn  = bg;
      bgHpfOut = bgHp;
      bg = bg * 0.92f + bgHp * 0.08f;

      bg *= bgGain;

      // ====================================================
      // レイヤー2：メインパフ音——改造ストレート砲筒の効果音
      // ====================================================

      // 一定時間経過で新しいパフ音をトリガー
      if (samplesToNextTrigger <= 0) {

        // 前回のパフ音を B パートとしてフェードアウト（尾部のオーバーラップ）
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.50f;
        }

        playPosA = 0;

        // 奇偶交互：V8 の異なる気筒点火によるわずかな力強さの差をシミュレート
        gainA = altToggle ? THUMP_ALT_GAIN : 1.0f;

        // 次のトリガーまでの間隔を計算（Swing とジッターを加えてリズムにグルーヴを持たせる）
        float intervalSamples = (float)SAMPLE_RATE / thumpHz;
        float swingFactor = altToggle ? (1.0f - THUMP_SWING) : (1.0f + THUMP_SWING);
        float jitter = 1.0f + localRandSigned(jitterSeed) * 0.025f;

        samplesToNextTrigger = (int)clampf(intervalSamples * swingFactor * jitter, 1.0f, 999999.0f);
        altToggle = !altToggle;
      }

      samplesToNextTrigger--;

      float thump = 0.0f;

      // A パートを読み出し
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) {
          thump += thumpTable[playPosA++] * gainA;
        } else {
          playPosA = -1;
        }
      }

      // B パートを読み出し（前回のパフ音のフェードアウト尾部）
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) {
          thump += thumpTable[playPosB++] * gainB;
          gainB *= 0.9992f;  // ゆっくりフェードアウト
        } else {
          playPosB = -1;
        }
      }

      // ローパスでパフ音のエッジをより丸く、角張らないように
      thumpLpf += 0.58f * (thump - thumpLpf);
      thump = thumpLpf * thumpLayerGain;

      // ====================================================
      // レイヤー3：2つのレイヤーをミックスして出力
      // ====================================================
      float sample = bg + thump;

      // 最終出力ハイパス（低域の DC ドリフトを除去）
      float outHp = 0.988f * (outHpfOut + sample - outHpfIn);
      outHpfIn  = sample;
      outHpfOut = outHp;
      sample = sample * 0.86f + outHp * 0.14f;

      // 全体のソフトクリップ（2レイヤー重ね合わせ時の過負荷ポップ音を防止）
      sample = tanhf(sample * (1.05f + 0.22f * rpmNorm));

      sample *= MASTER_VOLUME * fadeIn;
      sample  = clampf(sample, -0.98f, 0.98f);

      // 16bit PCM に変換、左右チャンネル同じ（モノラルスピーカー）
      int16_t out = (int16_t)(sample * PCM_OUTPUT_SCALE);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;

      // クランクシャフトの位相を進める
      crankPhase += cycleIncrement;
      if (crankPhase >= 1.0f) crankPhase -= 1.0f;
    }

    // このバッチのオーディオデータを I2S DMA に書き込み、書き終わってから次のバッチを生成
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= スロットルタスク（コア0で実行、低優先度）=================
void throttleTask(void *param) {
  while (true) {
    updateThrottle();
    vTaskDelay(pdMS_TO_TICKS(20));  // 20ms ごとにスロットルを更新、十分滑らか
  }
}

// ================= シリアル監視タスク（コア0で実行、最低優先度）=================
void monitorTask(void *param) {
  char buf[128];

  while (true) {
    int rpmInt      = (int)(currentRPM + 0.5f);
    int targetInt   = (int)(targetRPM  + 0.5f);
    int throttlePct = (int)(throttleValue * 100.0f + 0.5f);
    int thumpHz10   = (int)(currentThumpHz * 10.0f + 0.5f);

    snprintf(buf, sizeof(buf),
      "RPM=%d  目標=%d  スロットル=%d%%  エンコーダー=%d  パフ周波数=%d.%dHz",
      rpmInt, targetInt, throttlePct, encoderPosition,
      thumpHz10 / 10, thumpHz10 % 10);

    Serial.println(buf);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

// ================= setup：システム初期化 =================
void setup() {
#if DISABLE_BROWNOUT_FOR_TEST
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  Serial.begin(115200);
  delay(1000);

  // 起動時にメモリ状態を確認（PSRAM が 0 ならドライバが起動していない、QSPI 設定に戻って）
  Serial.printf("オンチップ SRAM 空き: %d バイト\n", ESP.getFreeHeap());
  Serial.printf("外付け PSRAM 空き: %d バイト\n", ESP.getFreePsram());

  Serial.println("====================================");
  Serial.println("ESP32-S3 V8 サウンドシミュレーター");
  Serial.println("メインパフ音：改造ストレート砲筒");
  Serial.println("スロットル制御：KY-040 ロータリーエンコーダー");
  Serial.println("====================================");

  initEncoder();
  initSineTable();
  initCylinderPhases();
  buildStraightPipeThumpTable();
  initI2S();

  // オーディオタスク：コア1、最高優先度、12KB スタック
  xTaskCreatePinnedToCore(audioTask,    "AudioTask", 12288, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  // スロットルタスク：コア0、優先度2、3KB スタック
  xTaskCreatePinnedToCore(throttleTask, "Throttle",  3072,  NULL, 2,                        NULL, 0);
  // 監視タスク：コア0、最低優先度、4KB スタック（小さくしすぎないこと、さもないとスタックオーバーフロー）
  xTaskCreatePinnedToCore(monitorTask,  "Monitor",   4096,  NULL, 1,                        NULL, 0);

  Serial.println("システム起動完了、エンコーダーを回してスロットル操作、押し込みでゼロリセット");
}

// loop は実質アイドル、すべての作業は FreeRTOS タスクに任せてある
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

### コード解説

プログラム全体は3つの並行タスクで構成され、FreeRTOS がスケジュールし、互いに干渉しない：

| タスク | 実行コア | 優先度 | 役割 |
|------|------------|--------|--------|
| `audioTask` | コア1 | 最高 | サンプルごとにオーディオを合成し、I2S DMA に書き込む |
| `throttleTask` | コア0 | 中 | 20ms ごとにエンコーダーを読み、スロットルを更新 |
| `monitorTask` | コア0 | 最低 | 700ms ごとにシリアルへ状態を出力 |

**サウンド合成のコアロジックは3層に分かれる：**

**第1層：背景エンジン音。** 8気筒がそれぞれ位相を持ち、各気筒は V8 の点火角度（0°、90°、150°……450°）に従って順番に排気パルス波形をトリガーする。8気筒の出力を重ね合わせると、あの連続的な低いうなり声になる。気筒パルスの上に、さらに基本波といくつかの高調波を重ね、エンジン音のレイヤー感を増す。

**第2層：メインパフ音。** 一定間隔（`thumpHz` で頻度を決定）ごとに、事前計算したパフ音波形テーブルから1回分の完全な「パフ」音を読み出して再生する。パフ音自体はアタック→主体→減衰の3段エンベロープで、周波数下降（排気圧力の解放をシミュレート）とリバウンド遅延（管の共鳴をシミュレート）を加え、改造ストレートの砲筒音のように聞こえる。

**第3層：ミックス出力。** 2層を重ねた後、全体のソフトクリップを通してポップ音を防ぎ、フェードイン係数（電源投入瞬間のポップ音を防止）を掛け、最終的に 16bit ステレオ PCM に書き込んで I2S に送る。



## パフ音サンプル調整ツール（任意）

最適な排気音を素早く見つけるため、もう1バージョンのシリアル巡回テストコードを作った：30種類のプリセットパラメータを内蔵し、シリアルコマンドで切り替えられる。どの「パフ」音が一番好みに合うかを直接比較できる。メインプログラムで最終的に採用したのは番号23の「改造ストレート砲筒」だ。

```c
/*
 * ESP32-S3 + MAX98357A
 * パフ音サンプル巡回テスター V2
 * 30サンプル + 音量大幅アップ
 *
 * 配線：
 *   BCLK -> GPIO16
 *   LRC  -> GPIO17
 *   DIN  -> GPIO15
 *
 * シリアルコマンド（115200）：
 *   n     次へ
 *   p     前へ
 *   r     再生
 *   s     自動巡回を停止
 *   a     自動巡回を開始
 *   b     背景ベースレイヤーの オン/オフ
 *   1~30  指定番号へジャンプ
 *   h     ヘルプ
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

#define SAMPLE_RATE     22050
#define DMA_BUF_COUNT   8
#define DMA_BUF_LEN     256

#define PRESET_PLAY_MS  5000
#define SLOW_PART_MS    2500
#define TEST_SLOW_HZ    2.2f
#define TEST_FAST_HZ    5.0f

#define SINE_TABLE_SIZE 2048
#define THUMP_TABLE_MAX 8000

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

static int16_t stereoBuffer[DMA_BUF_LEN * 2];

volatile int requestedPresetIndex = 0;
volatile uint32_t presetStartMs = 0;
volatile bool backgroundEnabled = true;

bool autoPlay = true;
uint32_t lastSwitchMs = 0;
String cmdBuffer;

static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;
  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= サンプルパラメータ構造体 =================
struct ThumpPreset {
  const char* name;
  float attackMs;
  float bodyMs;
  float tailMs;
  float fStart;
  float fBody;
  float fEnd;
  float noiseMix;
  float tone2Mix;
  float tone3Mix;
  float subMix;
  float drive;
  float burstMix;
  float reboundDelayMs;
  float reboundGain;
  float altGain;
  float swing;
  float gain;
  float rumbleGain;
};

//  name                         atk  body tail  fS   fB   fE  noise t2   t3   sub  drv  burst rebMs rebG  alt   swng  gain  rumble
const ThumpPreset presets[] = {
  {"01 重低音大排気量",          12,  65, 100,  55,  42,  34,  0.18, 0.24, 0.08, 0.28, 1.7, 0.18, 44, 0.22, 1.00, 0.00, 2.8, 0.20},
  {"02 さらに丸み高密度",        14,  75, 130,  52,  40,  32,  0.12, 0.18, 0.04, 0.32, 1.5, 0.10, 50, 0.18, 1.00, 0.00, 2.9, 0.16},
  {"03 小型ホーン強調A",          7,  42,  65, 100,  80,  65,  0.16, 0.30, 0.14, 0.06, 1.6, 0.16, 32, 0.14, 1.00, 0.00, 2.6, 0.12},
  {"04 小型ホーン強調B",          5,  35,  55, 120,  95,  78,  0.14, 0.36, 0.20, 0.04, 1.7, 0.12, 26, 0.12, 1.00, 0.00, 2.5, 0.10},
  {"05 アメリカンV8アイドリング",  9,  55,  95,  72,  56,  44,  0.22, 0.26, 0.10, 0.14, 1.8, 0.24, 42, 0.30, 0.80, 0.20, 2.7, 0.22},
  {"06 さらにゴロゴロ不均一",     11,  58, 105,  68,  52,  42,  0.24, 0.22, 0.08, 0.18, 1.8, 0.22, 54, 0.38, 0.72, 0.26, 2.8, 0.24},
  {"07 背圧特徴的ダブルパフ",       8,  48,  85,  80,  62,  48,  0.20, 0.26, 0.12, 0.12, 1.7, 0.20, 58, 0.48, 0.88, 0.14, 2.6, 0.18},
  {"08 荒々しく炸裂",              6,  40,  68,  90,  72,  56,  0.28, 0.32, 0.16, 0.08, 2.2, 0.32, 34, 0.22, 0.90, 0.10, 2.5, 0.15},
  {"09 極厚・極こもり",           16,  85, 150,  48,  38,  30,  0.08, 0.14, 0.02, 0.36, 1.6, 0.06, 58, 0.20, 1.00, 0.00, 3.0, 0.14},
  {"10 短く力強いPunch",           4,  28,  45, 100,  78,  60,  0.14, 0.38, 0.20, 0.04, 1.8, 0.12, 22, 0.10, 1.00, 0.00, 2.4, 0.10},
  {"11 ハスキーなマフラー",         8,  50,  88,  82,  64,  50,  0.32, 0.24, 0.10, 0.10, 1.9, 0.34, 40, 0.26, 0.86, 0.12, 2.6, 0.16},
  {"12 低音重砲",                 13,  68, 115,  58,  46,  36,  0.14, 0.20, 0.06, 0.30, 1.8, 0.14, 48, 0.26, 1.00, 0.00, 2.9, 0.20},
  {"13 中域Punchキレ味",           6,  36,  58, 130, 100,  78,  0.10, 0.40, 0.24, 0.02, 1.6, 0.08, 28, 0.10, 1.00, 0.00, 2.4, 0.08},
  {"14 ダブルパルスゴロゴロ",       7,  44,  78,  85,  66,  52,  0.18, 0.28, 0.14, 0.10, 1.8, 0.20, 20, 0.45, 0.82, 0.18, 2.6, 0.16},
  {"15 旧V8ルーズ感",             10,  60, 108,  72,  55,  44,  0.24, 0.22, 0.08, 0.16, 1.7, 0.20, 52, 0.32, 0.68, 0.30, 2.7, 0.22},
  {"16 超厚テスト",               15,  95, 160,  54,  42,  32,  0.06, 0.14, 0.02, 0.38, 1.6, 0.04, 64, 0.18, 1.00, 0.00, 3.2, 0.12},
  {"17 ハーレー風",                8,  52,  90,  78,  58,  46,  0.26, 0.24, 0.10, 0.16, 1.9, 0.26, 48, 0.35, 0.65, 0.32, 2.8, 0.25},
  {"18 スポーツカー高回転シャープ", 4,  30,  50, 140, 110,  88,  0.12, 0.42, 0.28, 0.02, 1.8, 0.10, 20, 0.08, 1.00, 0.00, 2.3, 0.08},
  {"19 ディーゼルドコドコ",        14,  48,  80,  65,  50,  42,  0.30, 0.18, 0.06, 0.20, 2.0, 0.28, 38, 0.40, 0.75, 0.22, 2.7, 0.20},
  {"20 大排気量クルーザー",        12,  72, 125,  60,  45,  36,  0.16, 0.20, 0.06, 0.34, 1.7, 0.12, 55, 0.24, 1.00, 0.00, 3.0, 0.18},
  {"21 超粗暴爆裂",                3,  25,  40, 110,  85,  68,  0.35, 0.34, 0.18, 0.06, 2.5, 0.40, 18, 0.15, 0.92, 0.08, 2.4, 0.12},
  {"22 マイルド大排気量",          16,  90, 140,  50,  40,  34,  0.10, 0.16, 0.04, 0.30, 1.4, 0.06, 60, 0.16, 1.00, 0.00, 3.0, 0.10},
  {"23 改造ストレート砲筒",         5,  38,  62, 105,  82,  64,  0.22, 0.30, 0.16, 0.08, 2.1, 0.28, 30, 0.18, 0.94, 0.06, 2.5, 0.14},
  {"24 重低音＋強背圧",           10,  58,  95,  65,  50,  40,  0.18, 0.22, 0.08, 0.22, 1.8, 0.16, 65, 0.52, 0.85, 0.16, 2.8, 0.20},
  {"25 気流バースト型",             6,  35,  55,  88,  68,  52,  0.38, 0.20, 0.08, 0.10, 1.7, 0.45, 28, 0.14, 1.00, 0.00, 2.5, 0.12},
  {"26 3気筒ドコドコ感",          10,  45,  75,  74,  58,  46,  0.20, 0.22, 0.10, 0.14, 1.8, 0.20, 36, 0.30, 0.60, 0.35, 2.6, 0.18},
  {"27 超低音砲テスト",            18, 100, 180,  42,  32,  26,  0.06, 0.12, 0.02, 0.42, 1.5, 0.04, 70, 0.20, 1.00, 0.00, 3.4, 0.08},
  {"28 パンチ効き型",               5,  32,  48,  95,  75,  58,  0.16, 0.34, 0.18, 0.06, 2.0, 0.16, 24, 0.12, 1.00, 0.00, 2.6, 0.10},
  {"29 全域轟音",                   8,  55,  90,  85,  65,  50,  0.20, 0.28, 0.14, 0.18, 1.9, 0.22, 42, 0.28, 0.88, 0.12, 2.8, 0.20},
  {"30 極端コントラストテスト",     3,  20,  35, 150, 120,  90,  0.40, 0.44, 0.28, 0.02, 2.4, 0.45, 16, 0.08, 1.00, 0.00, 2.2, 0.06},
};

const int NUM_PRESETS = sizeof(presets) / sizeof(presets[0]);

// ================= 初期化 =================
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

void initI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = DMA_BUF_COUNT,
    .dma_buf_len = DMA_BUF_LEN,
    .use_apll = false,
    .tx_desc_auto_clear = true,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_BCLK,
    .ws_io_num = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S OK");
}

// ================= 波形テーブル構築 =================
void buildThumpTable(int presetIndex) {
  const ThumpPreset &p = presets[presetIndex];

  int attackS  = (int)(p.attackMs  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(p.bodyMs    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(p.tailMs    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(p.reboundDelayMs * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;
  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1 = 0, phase2 = 0, phase3 = 0, phaseSub = 0;
  float noiseLP1 = 0, noiseLP2 = 0;
  uint32_t seed = 24681357;

  for (int i = 0; i < totalLen; i++) {
    float env1 = 0.0f;
    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    int j = i - reboundS;
    float env2 = 0.0f;
    if (j >= 0) {
      if (j < attackS) {
        float x = (float)j / (float)attackS;
        env2 = smoothstep01(x); env2 *= env2;
      } else if (j < attackS + bodyS) {
        float x = (float)(j - attackS) / (float)bodyS;
        env2 = 1.0f - 0.28f * x;
      } else if (j < mainLen) {
        float x = (float)(j - attackS - bodyS) / (float)tailS;
        env2 = 0.72f * expf(-3.8f * x);
      }
      env2 *= p.reboundGain;
    }

    float env = env1 + env2;
    env = clampf(env, 0.0f, 1.5f);

    float freq = p.fEnd;
    if (i < attackS) freq = p.fStart;
    else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      freq = p.fStart + (p.fBody - p.fStart) * x;
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      freq = p.fBody + (p.fEnd - p.fBody) * x;
    }

    float inc1 = freq / (float)SAMPLE_RATE;
    phase1 += inc1;       if (phase1 >= 1.0f) phase1 -= 1.0f;
    phase2 += inc1 * 2;   if (phase2 >= 1.0f) phase2 -= 1.0f;
    phase3 += inc1 * 3;   if (phase3 >= 1.0f) phase3 -= 1.0f;
    phaseSub += inc1 * 0.5f; if (phaseSub >= 1.0f) phaseSub -= 1.0f;

    float base = fastSin(phase1);
    base = tanhf(base * p.drive);

    float tonal = 0.82f * base
                + p.tone2Mix * fastSin(phase2)
                + p.tone3Mix * fastSin(phase3)
                + p.subMix   * fastSin(phaseSub);

    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;

    float air = bandNoise * (p.noiseMix * (0.25f * env + p.burstMix * 0.75f * earlyEnv));

    float sample = tonal * env + air;
    sample += 0.08f * env * env1;

    if (sample > 0.0f) sample = tanhf(sample * 1.15f) * 1.05f;
    else sample = tanhf(sample * 0.85f);

    sample *= p.gain;
    sample = clampf(sample, -1.0f, 1.0f);

    thumpTable[i] = sample;
  }

  thumpTableLen = totalLen;
}

// ================= シリアル制御 =================
void showHelp() {
  Serial.println();
  Serial.println("===== コマンド =====");
  Serial.println("n     次へ");
  Serial.println("p     前へ");
  Serial.println("r     再生");
  Serial.println("s     自動巡回を停止");
  Serial.println("a     自動巡回を開始");
  Serial.println("b     背景 オン/オフ");
  Serial.println("1~30  指定番号へジャンプ");
  Serial.println("h     ヘルプ");
  Serial.println("================");
}

void printPresetInfo(int idx) {
  Serial.println();
  Serial.println("========================================");
  Serial.print("サンプル #");
  Serial.print(idx + 1);
  Serial.print(" / ");
  Serial.println(NUM_PRESETS);
  Serial.println(presets[idx].name);
  Serial.print("前2.5秒スローパフ 後2.5秒ファストパフ 背景:");
  Serial.println(backgroundEnabled ? "オン" : "オフ");
  Serial.println("========================================");
}

void requestPreset(int idx) {
  while (idx < 0) idx += NUM_PRESETS;
  while (idx >= NUM_PRESETS) idx -= NUM_PRESETS;
  requestedPresetIndex = idx;
  presetStartMs = millis();
  lastSwitchMs = millis();
  printPresetInfo(idx);
}

void processCommand(String cmd) {
  cmd.trim();
  cmd.toLowerCase();
  if (cmd.length() == 0) return;

  if (cmd == "n") { requestPreset(requestedPresetIndex + 1); return; }
  if (cmd == "p") { requestPreset(requestedPresetIndex - 1); return; }
  if (cmd == "r") { requestPreset(requestedPresetIndex); return; }
  if (cmd == "s") { autoPlay = false; Serial.println("自動巡回を停止しました"); return; }
  if (cmd == "a") { autoPlay = true; lastSwitchMs = millis(); Serial.println("自動巡回を開始しました"); return; }
  if (cmd == "b") { backgroundEnabled = !backgroundEnabled; Serial.print("背景: "); Serial.println(backgroundEnabled ? "オン" : "オフ"); return; }
  if (cmd == "h") { showHelp(); return; }

  int n = cmd.toInt();
  if (n >= 1 && n <= NUM_PRESETS) { requestPreset(n - 1); return; }

  Serial.print("不明: ");
  Serial.println(cmd);
}

// ================= オーディオタスク =================
void audioTask(void *param) {
  int loadedPreset = -1;
  ThumpPreset currentPreset;

  int playPosA = -1, playPosB = -1;
  float gainA = 1.0f, gainB = 0.5f;
  int samplesToNextTrigger = 0;
  bool altToggle = false;

  float thumpLP = 0.0f;
  float hpIn = 0.0f, hpOut = 0.0f;
  float bgPhase1 = 0, bgPhase2 = 0;
  float bgNoise1 = 0, bgNoise2 = 0;
  uint32_t bgSeed = 123456789;

  while (true) {
    int req = requestedPresetIndex;

    if (req != loadedPreset) {
      currentPreset = presets[req];
      buildThumpTable(req);
      loadedPreset = req;
      playPosA = -1; playPosB = -1;
      gainA = 1.0f; gainB = 0.5f;
      samplesToNextTrigger = 0;
      altToggle = false;
      thumpLP = 0.0f;
    }

    uint32_t ageMs = millis() - presetStartMs;
    float baseHz = (ageMs < SLOW_PART_MS) ? TEST_SLOW_HZ : TEST_FAST_HZ;
    float speedNorm = (ageMs < SLOW_PART_MS) ? 0.25f : 0.70f;

    for (int i = 0; i < DMA_BUF_LEN; i++) {
      if (samplesToNextTrigger <= 0) {
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.55f;
        }
        playPosA = 0;
        gainA = altToggle ? currentPreset.altGain : 1.0f;

        float intervalSamples = (float)SAMPLE_RATE / baseHz;
        float swingFactor = altToggle ? (1.0f - currentPreset.swing) : (1.0f + currentPreset.swing);
        if (swingFactor < 0.2f) swingFactor = 0.2f;
        samplesToNextTrigger = (int)(intervalSamples * swingFactor);
        if (samplesToNextTrigger < 1) samplesToNextTrigger = 1;
        altToggle = !altToggle;
      }
      samplesToNextTrigger--;

      float thump = 0.0f;
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) { thump += thumpTable[playPosA] * gainA; playPosA++; }
        else playPosA = -1;
      }
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) { thump += thumpTable[playPosB] * gainB; playPosB++; gainB *= 0.9993f; }
        else playPosB = -1;
      }

      thumpLP += 0.55f * (thump - thumpLP);
      thump = thumpLP;

      float bg = 0.0f;
      if (backgroundEnabled) {
        float bgFreq = 28.0f + speedNorm * 36.0f;
        bgPhase1 += bgFreq / (float)SAMPLE_RATE;
        if (bgPhase1 >= 1.0f) bgPhase1 -= 1.0f;
        bgPhase2 += (bgFreq * 2.1f) / (float)SAMPLE_RATE;
        if (bgPhase2 >= 1.0f) bgPhase2 -= 1.0f;
        float white = localRandSigned(bgSeed);
        bgNoise1 += 0.06f * (white - bgNoise1);
        bgNoise2 += 0.015f * (bgNoise1 - bgNoise2);
        bg = fastSin(bgPhase1) * 0.65f + fastSin(bgPhase2) * 0.18f + bgNoise2 * 0.07f;
        bg = tanhf(bg * 1.35f) * currentPreset.rumbleGain;
      }

      float sample = thump + bg;

      float hp = 0.985f * (hpOut + sample - hpIn);
      hpIn = sample;
      hpOut = hp;
      sample = sample * 0.82f + hp * 0.18f;

      // ★ ポイント：最終出力ゲインを大幅に引き上げ
      sample *= 1.8f;

      sample = tanhf(sample * 1.1f);
      sample = clampf(sample, -0.98f, 0.98f);

      // ★ フルスケール出力
      int16_t out = (int16_t)(sample * 30000.0f);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;
    }

    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= setup / loop =================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("====================================");
  Serial.println("パフ音サンプル巡回テスター V2");
  Serial.println("30サンプル + 大音量版");
  Serial.println("====================================");

  initSineTable();
  initI2S();
  showHelp();
  requestPreset(0);

  xTaskCreatePinnedToCore(audioTask, "Audio", 10240, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  Serial.println("再生開始...");
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r' || c == '\n') {
      if (cmdBuffer.length() > 0) {
        processCommand(cmdBuffer);
        cmdBuffer = "";
      }
    } else {
      cmdBuffer += c;
    }
  }

  if (autoPlay) {
    if (millis() - lastSwitchMs >= PRESET_PLAY_MS) {
      int nextIdx = requestedPresetIndex + 1;
      if (nextIdx >= NUM_PRESETS) nextIdx = 0;
      requestPreset(nextIdx);
    }
  }

  delay(10);
}
```




---

## よくあるトラブルシューティング

焦らないで。問題の 90% は以下の数カ所に起因する。順に確認すればたいてい解決する：

**電源を入れてもスピーカーからまったく音が出ない**

まず SD ピンを確認。MAX98357A の SD ピンが意図せず LOW に引き下げられている（GND に触れている、浮遊になっていないなど）と、モジュールはミュートモードに入る。SD ピンを浮遊させるか 3.3V に接続し、再び電源を入れ直してみよう。次にシリアルモニタで I2S 初期化にエラーがないか、「I2S ドライバのインストール失敗」という文字が出ていないかを確認。

**音がとても小さく、ほとんど聞こえない**

まずスピーカーのインピーダンスを確認。MAX98357A は 4Ω スピーカーで 3W、8Ω スピーカーでは約 1.4W しか出力できず、音量は半分になる。次に VIN が 5V に接続されているかをチェック、3.3V に繋ぐと出力が大幅に下がる。さらにコード内の `PCM_OUTPUT_SCALE` を 26000 から 30000 に上げることもできるが、32767 を超えないこと、超えるとオーバーフロー歪みが発生する。

**エンコーダーの回転方向が逆（時計回りで減、反時計回りで増）**

`encoderISR()` の中の `encoderPosition++` と `encoderPosition--` を入れ替えるか、CLK と DT の物理的な配線をそのまま入れ替える。どちらかを選ぶ。

**電源投入直後にすぐクラッシュして再起動、シリアルに `Stack canary watchpoint triggered` と表示**

これはどこかの FreeRTOS タスクでスタックオーバーフローが起きた合図。エラーメッセージにタスク名（例えば `Monitor`）が表示される。対応するタスクを見つけ、`xTaskCreatePinnedToCore` のスタックサイズ（3番目の数値）を大きくする。Monitor タスクは少なくとも 4096、足りなければ 8192 に。

**シリアルに `OOM: failed to allocate XXX bytes` と表示**

メモリ不足。以下の順序で確認：

1. Arduino IDE の **ツール → PSRAM** が選択されているか。必ず **QSPI PSRAM** を選ぶこと（OPI ではない）
2. `setup()` の冒頭に `Serial.printf("PSRAM: %d\n", ESP.getFreePsram());` を追加し、書き込み直してシリアルを確認。0 と表示されたら PSRAM がドライブされていない、設定を直しに戻る
3. 手元の開発ボードに外付け PSRAM があることを確認（ESP32-S3-WROOM-1-**N16R8** の R8 は 8MB PSRAM を表す）

**音に規則的なポップ音やノイズが乗る**

たいていはグラウンドの問題。ESP32-S3 の GND と MAX98357A の GND は同じ線に繋ぐ必要があり、別々の電源グランドに分けてはいけない。テスターで2つの GND 間の抵抗を測ってみよう。0Ω に近いはずだ。

---

## FAQ

**Q：ESP32-S3 の GPIO16/17/15 が別用途で使われているが、他のピンに変更できる？**
A：可能。I2S ピンは自由に任意の GPIO にマッピングできる。コード先頭の `I2S_BCLK`、`I2S_LRC`、`I2S_DOUT` の3つのマクロを使いたいピン番号に変更するだけ。ただし GPIO 0、1、2、3、43、44 は特殊用途があるため避けるのが無難。

**Q：スピーカーを2つ繋いでステレオにできる？**
A：MAX98357A はモノラルアンプなので、ステレオにするにはモジュールが2枚必要。1枚を左チャンネル、もう1枚を右チャンネルに繋ぎ、GAIN ピンの接続で切り分ける（1枚は GND に接続 = 右チャンネル、もう1枚は浮遊 = 左チャンネル）。コード内の2チャンネルの PCM データは現在同じ（`stereoBuffer[i*2] = stereoBuffer[i*2+1] = out`）なので、真のステレオにするには合成ロジックも修正が必要。

**Q：サンプリングレート 22050Hz で十分？ 44100Hz に変更できる？**
A：22050Hz はエンジン音のような中低域コンテンツには完全に十分。最高で 11025Hz までの音を再現でき、人間がエンジン音を知覚するのは主に 50Hz〜4kHz の間だ。44100Hz への変更は理論上は可能だが CPU 負荷が倍増する。テスト時に安定動作を先に確認し、`SAMPLE_RATE` と I2S 設定の `sample_rate` を同時に変更すること。

**Q：5V 電源に繋ぐと ESP32-S3 が焼損しない？**
A：MAX98357A の VIN は 5V だが、信号ピン（BCLK、LRC、DIN）は 3.3V レベルなので、ESP32-S3 の GPIO に直接接続でき、レベル変換は不要。ESP32-S3 の GPIO は 3.3V を出力し、MAX98357A はそれを認識できる。安全だ。

**Q：アイドリング時の音が小さくて聞こえない、大きくできる？**
A：`BACKGROUND_GAIN_IDLE`（デフォルト 0.45）と `THUMP_LAYER_GAIN_IDLE`（デフォルト 0.75）を調整する。両方とも上げる、例えば 0.6 と 1.0 にすると、アイドリング音量が明らかに向上する。調整後は満開スロットル時にポップ音が出ないかテストすること。出る場合は `PCM_OUTPUT_SCALE` をわずかに下げる。

**Q：KY-040 エンコーダーを1ステップ回すとスロットルが 10% 変わる、大きすぎる、もっと細かくできない？**
A：`ENCODER_STEP_SIZE` を 0.1 より小さくする。例えば 0.05 にすれば1ステップあたり 5% となり、フルスロットルまでに20ステップ回す必要ができ、操作感がより繊細になる。

**Q：プログラムは ESP32（S3 ではない）で動く？**
A：理論上は互換性がある。I2S API は汎用的だが、通常の ESP32 は外付け PSRAM がないか小さく、このプロジェクトを実行するとメモリ不足になる可能性がある。少なくとも PSRAM 付きの型号、例えば ESP32-WROVER を推奨。GPIO 番号もお手持ちのボードに合わせて再マッピングが必要。

---

## 応用アイデア

基本版をやり終えたら、以下の方向に拡張できる：

- **速度センサーを追加**：ホールセンサーを車輪に取り付け、速度が上がるほど自動的にスロットルも開くようにすれば、手を離して運転できる
- **V6 / 直列4気筒 / バイク音に変更**：`NUM_CYLINDERS` と `firingAngles` を修正し、点火角度を変えれば別のエンジンになる
- **TFT ディスプレイを追加**：現在のタコメータとスロットル率を表示、メーターパネル感を演出
- **防水ケースを追加**：電動車に取り付けて使う場合、雨の日は防水が必須。回路に水が入ると音が出ないより厄介だ

---

## 参考資料

- [MAX98357A データシート（Analog Devices）](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [MAX98357A 製品ページ（Analog Devices）](https://www.analog.com/en/products/max98357a.html)
- [ESP32-S3 テクニカルリファレンスマニュアル（Espressif）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3-WROOM-1 製品ページ（Espressif）](https://www.espressif.com/en/products/modules/esp32-s3)
- [ESP32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)
- [FreeRTOS タスク作成 API ドキュメント](https://www.freertos.org/a00125.html)
