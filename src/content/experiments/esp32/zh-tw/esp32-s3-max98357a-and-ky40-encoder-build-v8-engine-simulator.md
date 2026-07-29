---
title: "ESP32-S3 + MAX98357A 製作 V8 引擎聲浪模擬器 完整教學（I2S 數位音訊 + KY-040 旋轉編碼器控制油門）"
boardId: esp32s3
moduleId: audio/max98357a
moduleIds:
  - audio/max98357a
  - sensor/ky-040
category: esp32
date: 2026-07-14
intro: "用 ESP32-S3 驅動 MAX98357A 功放模組，搭配 KY-040 旋轉編碼器，純程式碼即時合成 V8 引擎聲浪——油門由編碼器手動控制，聲音經喇叭即時輸出。含完整接線、程式碼和踩坑紀錄。"
image: "https://img.lingflux.com/2026/07/6c72c55fa63614eb8c2086c24d993d5f.jpg"
---

> **TL;DR（快速上手）：**
>
> 1. 接線：MAX98357A 的 BCLK → GPIO16，LRC → GPIO17，DIN → GPIO15；KY-040 的 CLK → GPIO5，DT → GPIO6，SW → GPIO7
> 2. 開發板選 **ESP32S3 Dev Module**，PSRAM 選 **QSPI PSRAM**（選錯就 OOM，別問我怎麼知道的）
> 3. 順時針旋轉編碼器 = 減油門，逆時針 = 加油門，按下 = 回怠速
> 4. 燒錄，通電，享受你的「V8 電動車」

---

難度：⭐⭐⭐☆☆（需要會基本的 Arduino 接線和燒錄）
預計時間：45 分鐘
測試環境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + ESP32-S3-WROOM-1-N16R8（16MB Flash + 8MB PSRAM）

---

## 前言

騎過電動自行車的人都懂那種尷尬：你悄無聲息地從背後靠近行人，對方猛地被嚇了個半死，回頭給你一個「你怎麼不出聲」的眼神——而你只能報以一個尷尬的微笑，因為你的車確實……沒聲音。

電動車省油又環保，唯獨這一點讓人頭疼：太安靜了。安靜到像一個幽靈，飄在馬路上。

於是我就在想：既然不能靠引擎自帶聲音，能不能自己**造一個聲音**出來？不是那種廉價喇叭放的「滴滴」聲，而是……V8 引擎的聲浪？低沉、有力，一腳踩下去轟隆作響的那種。

本文的目標就是：用 **ESP32-S3 + MAX98357A 功放模組 + KY-040 旋轉編碼器**，純程式碼合成一套 V8 引擎聲浪，油門大小由編碼器手動控制，聲音透過喇叭即時輸出。沒有取樣，沒有播放音訊檔案，全是即時數學運算出來的引擎聲。



---

## 實驗效果

旋轉 KY-040 編碼器加油門，喇叭會從低沉的怠速隆隆聲逐漸過渡到高轉速的引擎轟鳴；按下編碼器按鈕，油門立即歸零，回到怠速狀態。整個聲音過渡平滑，沒有突兀的跳變，聽起來挺像那麼回事。


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30IWSgfp3IY?si=XXwD3KaDonejM5WD" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## 元件說明

> 開發板（ESP32-S3）不作說明，重點介紹其他兩個主角。

### MAX98357A — 數位訊號翻譯官

想像你有一段數位錄音（一串 0 和 1），但喇叭只聽得懂類比訊號（電壓高低變化）。MAX98357A 就是這兩者之間的**同步口譯**：它接收 ESP32-S3 透過 I2S 協議發出的數位音訊，把它即時轉換成能驅動喇叭的類比電流，並且內建 3W 功放，不需要再額外加放大電路。

| 參數 | 數值 |
|------|------|
| 供電電壓 | 2.5V ～ 5.5V |
| 輸出功率 | 3.2W（4Ω負載，5V供電） |
| 取樣率支援 | 8kHz ～ 96kHz |
| 通信協議 | I2S |
| 增益檔位 | 3dB / 6dB / 9dB / 12dB / 15dB |
| 靜音控制 | SD 腳位拉低即靜音 |

選它的理由很簡單：**I2S 直連，免濾波，模組化封裝，3W 夠騎車用**，而且淘寶十塊錢以內就能拿下。

### 腳位說明

| 腳位標識 | 功能說明 |
|----------|----------|
| VIN | 電源正極，接 5V |
| GND | 電源地 |
| BCLK | I2S 位元時脈 |
| LRC | I2S 字時脈（左右聲道選擇） |
| DIN | I2S 數位音訊資料輸入 |
| SD | 靜音控制，懸空或接高電位 = 正常工作，拉低 = 靜音 |
| GAIN | 增益選擇，懸空預設 9dB |

> **注意**：SD 腳位不接或接 3.3V 都能正常出聲；如果你發現接線沒問題但就是沒聲音，首先檢查 SD 腳位有沒有被意外拉低。

---

### KY-040 — 無限旋轉的「音量旋鈕」

普通電位器轉到頭就卡死了，KY-040 是 360° 無限旋轉的編碼器，它不輸出絕對位置，而是告訴你「往哪轉了幾格」。本專案裡我用它來控制油門：**順時針減油門，逆時針加油門，按下按鈕回怠速**，操作感就像在轉一個真實的油門旋鈕。

| 參數 | 數值 |
|------|------|
| 工作電壓 | 3.3V ～ 5V |
| 每圈步進數 | 20 步 |
| 輸出訊號 | A 相（CLK）/ B 相（DT）/ 按鍵（SW） |
| 介面類型 | 數位 GPIO（帶內部上拉） |

選它的理由：**便宜、常見、有按鈕加分**，中斷驅動不佔 CPU，搭配 FreeRTOS 任務架構完全沒有壓力。

### 腳位說明

| 腳位標識 | 功能說明 |
|----------|----------|
| CLK（A 相） | 旋轉編碼器輸出 A 相，接中斷腳位 |
| DT（B 相） | 旋轉編碼器輸出 B 相，判斷旋轉方向 |
| SW | 按鍵輸出，按下為低電位 |
| + | 電源正極，接 3.3V |
| GND | 電源地 |

---

## BOM 表

| 元件 | 型號/規格 | 數量 | 備註 |
|------|-----------|------|------|
| 主控開發板 | ESP32-S3-WROOM-1-N16R8 | 1 | 16MB Flash + 8MB PSRAM，必須有 PSRAM |
| I2S 功放模組 | MAX98357A | 1 | 含模組板，免焊接版本更方便 |
| 旋轉編碼器模組 | KY-040 | 1 | 帶按鈕 |
| 小喇叭 | 4Ω 3W | 1 | 或 8Ω，音量會略小 |
| 杜邦線 | 公對公 / 公對母 | 若干 | 接線用 |
| 麵包板 | 任意 | 1 | 可選，固定接線更方便 |

---

## 接線方式

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

> 建議接完每一根線都在表格裡打個勾逐一核對，這個習慣能省掉 80% 的排錯時間。尤其是 GND，多個模組共地是音訊正常工作的前提——大家說同一種語言，訊號才能傳得準。

---

## 需要安裝的函式庫

本專案**不依賴任何第三方音訊函式庫**，音訊全部由程式碼即時合成，只用到 ESP32 Arduino Core 自帶的 `driver/i2s.h`。

你只需要在 Arduino IDE 裡確認以下環境：

| 項目 | 要求 |
|------|------|
| Arduino IDE | 2.3.8（測試通過） |
| ESP32 Arduino Core | 3.3.10（Board Manager 搜尋 `esp32` 安裝） |
| 開發板選項 | ESP32S3 Dev Module |
| **PSRAM 選項** | **QSPI PSRAM**（這個選錯會直接 OOM，見踩坑紀錄） |
| Flash Size | 16MB |
| Upload Speed | 921600 |

在 Arduino IDE 的 **工具（Tools）** 選單裡把上面每一項都對一遍，特別是 PSRAM 那一行。

---

## 完整程式碼 + 說明

```cpp
/*
 * ESP32-S3 + MAX98357A + KY-040 旋轉編碼器
 * V8 引擎聲浪模擬器
 *
 * 接線：
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
 *   SW        -> GPIO7  (按下歸零油門)
 *   +         -> 3.3V
 *   GND       -> GND
 *
 * 操作說明：
 *   順時針旋轉 = 減油門
 *   逆時針旋轉 = 加油門
 *   按下編碼器 = 油門歸零（回怠速）
 *
 * 串口鮑率：115200
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// -----------------------------------------------
// 如果遇到 Brownout 掉電重啟，把這裡改成 1 臨時測試
// 正式使用請保持 0，不建議長期禁用欠壓保護
// -----------------------------------------------
#define DISABLE_BROWNOUT_FOR_TEST 0

#if DISABLE_BROWNOUT_FOR_TEST
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

// ================= 第一步：I2S 腳位定義 =================
#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

// ================= 第二步：KY-040 腳位定義 =================
#define ENCODER_CLK_PIN   5
#define ENCODER_DT_PIN    6
#define ENCODER_SW_PIN    7

// ================= 編碼器油門參數 =================
// 每轉一格對應的油門變化量（範圍 0.0～1.0）
// 改小這個值 = 需要轉更多格才能到滿油門，手感更細膩
#define ENCODER_STEP_SIZE     0.1f

// 油門平滑過渡係數（越大響應越快，越小過渡越絲滑）
#define ENCODER_SMOOTHING     1.2f

// 編碼器去抖時間（微秒），防止一次旋轉被誤讀成多次
#define ENCODER_DEBOUNCE_US   200

// 按鍵去抖時間（毫秒）
#define BUTTON_DEBOUNCE_MS    200

// ================= 音訊基本參數 =================
#define SAMPLE_RATE     22050   // 取樣率，單位 Hz
#define DMA_BUF_COUNT   8       // DMA 緩衝區數量
#define DMA_BUF_LEN     256     // 每個 DMA 緩衝區的取樣點數

// ================= 引擎轉速參數 =================
#define RPM_IDLE        800.0f    // 怠速轉速（RPM）
#define RPM_MAX         8000.0f   // 最高轉速（RPM）
#define RPM_SMOOTHING   0.006f    // 轉速變化平滑係數，越小越像真實引擎
#define NUM_CYLINDERS   8         // V8 = 8 個氣缸

// ================= 排氣噗聲節奏 =================
// 怠速時每秒噗 2 次，滿轉時每秒噗 7.6 次
#define THUMP_HZ_IDLE   2.0f
#define THUMP_HZ_MAX    7.6f

// ================= 音量參數 =================
#define MASTER_VOLUME       1.00f
#define PCM_OUTPUT_SCALE    26000.0f   // 最終輸出到 16bit PCM 的縮放係數

// 背景引擎音音量（怠速 / 滿轉）
#define BACKGROUND_GAIN_IDLE  0.45f
#define BACKGROUND_GAIN_MAX   0.60f

// 主噗聲層音量（怠速 / 滿轉）
#define THUMP_LAYER_GAIN_IDLE 0.75f
#define THUMP_LAYER_GAIN_MAX  1.05f

// ================= 改裝直排砲筒噗聲參數 =================
// 以下參數控制每一次排氣噗聲的波形形狀，調參謹慎
#define THUMP_ATTACK_MS       5.0f    // 起音時間（ms）
#define THUMP_BODY_MS         38.0f   // 主體持續時間（ms）
#define THUMP_TAIL_MS         62.0f   // 餘音衰減時間（ms）

#define THUMP_F_START         105.0f  // 噗聲起始頻率（Hz）
#define THUMP_F_BODY          82.0f   // 主體頻率（Hz）
#define THUMP_F_END           64.0f   // 尾音頻率（Hz）

#define THUMP_NOISE_MIX       0.22f   // 雜訊混入比例（模擬排氣氣流聲）
#define THUMP_TONE2_MIX       0.30f   // 二次諧波比例
#define THUMP_TONE3_MIX       0.16f   // 三次諧波比例
#define THUMP_SUB_MIX         0.08f   // 次低頻比例（加重低沉感）

#define THUMP_DRIVE           2.10f   // 波形飽和度（tanh 軟削波強度）
#define THUMP_BURST_MIX       0.28f   // 爆發期氣流雜訊佔比

#define THUMP_REBOUND_DELAY_MS 30.0f  // 排氣回彈延遲（ms），模擬管道共振
#define THUMP_REBOUND_GAIN     0.18f  // 回彈增益

#define THUMP_ALT_GAIN         0.94f  // 交替氣缸增益差，模擬不均勻點火
#define THUMP_SWING            0.06f  // 節奏擺動量（Swing），增加律動感

#define THUMP_TABLE_GAIN       2.50f  // 噗聲波形表整體增益

// ================= 查找表定義 =================
#define SINE_TABLE_SIZE 2048     // 正弦波查找表大小（越大精度越高，記憶體越多）
#define THUMP_TABLE_MAX 8000     // 噗聲波形表最大取樣點數

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

// 輸出立體聲緩衝區（左右聲道各 DMA_BUF_LEN 個取樣點）
static int16_t stereoBuffer[DMA_BUF_LEN * 2];

// ================= 全域狀態變數 =================
volatile float throttleValue  = 0.0f;   // 目前平滑後的油門值（0.0～1.0）
volatile float targetThrottle = 0.0f;   // 編碼器設定的目標油門
volatile float targetRPM      = RPM_IDLE;
volatile float currentRPM     = RPM_IDLE;
volatile float currentThumpHz = THUMP_HZ_IDLE;

uint32_t noiseSeed = 123456789;

// V8 氣缸相位偏移表（模擬 90° 等間隔點火）
float cylinderPhase[NUM_CYLINDERS];

const float firingAngles[NUM_CYLINDERS] = {
  0.0f, 90.0f, 150.0f, 210.0f,
  270.0f, 330.0f, 390.0f, 450.0f
};

// ================= 編碼器中斷相關變數 =================
volatile int encoderPosition = 0;
volatile unsigned long lastEncoderInterruptUs = 0;
volatile bool encoderButtonPressed = false;
volatile unsigned long lastButtonPressMs = 0;

// ================= 工具函式 =================

// 數值限幅
static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// 平滑階梯函式，讓過渡更絲滑（S 形曲線）
static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

// 用查找表快速計算 sin，比 sinf() 快很多，即時音訊必須這樣搞
float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;

  // 線性插值，讓精度更高
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

// 偽隨機雜訊生成（線性同餘法，速度快，用於模擬氣流聲）
float pseudoRandom() {
  noiseSeed = noiseSeed * 1664525UL + 1013904223UL;
  return ((float)(noiseSeed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// 帶獨立種子的偽隨機（用在噗聲波形生成裡，保證每次聲音一致）
float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= 編碼器中斷：判斷旋轉方向 =================
void IRAM_ATTR encoderISR() {
  unsigned long nowUs = micros();

  // 去抖：兩次中斷間隔太短就忽略，防止機械抖動誤觸發
  if (nowUs - lastEncoderInterruptUs < ENCODER_DEBOUNCE_US) return;
  lastEncoderInterruptUs = nowUs;

  // CLK 下降沿觸發，此時讀 DT 腳位電位判斷方向
  // DT = LOW  → 順時針 → 減油門
  // DT = HIGH → 逆時針 → 加油門
  int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState == LOW) {
    encoderPosition--;  // 順時針：減油門
  } else {
    encoderPosition++;  // 逆時針：加油門
  }
}

// ================= 按鍵中斷：按下歸零油門 =================
void IRAM_ATTR buttonISR() {
  unsigned long nowMs = millis();
  if (nowMs - lastButtonPressMs < BUTTON_DEBOUNCE_MS) return;
  lastButtonPressMs = nowMs;
  encoderButtonPressed = true;
}

// ================= 初始化編碼器腳位和中斷 =================
void initEncoder() {
  pinMode(ENCODER_CLK_PIN, INPUT_PULLUP);
  pinMode(ENCODER_DT_PIN,  INPUT_PULLUP);
  pinMode(ENCODER_SW_PIN,  INPUT_PULLUP);

  // CLK 下降沿觸發旋轉檢測
  attachInterrupt(digitalPinToInterrupt(ENCODER_CLK_PIN), encoderISR, FALLING);
  // SW 下降沿觸發按鍵檢測（按下時為低電位）
  attachInterrupt(digitalPinToInterrupt(ENCODER_SW_PIN),  buttonISR, FALLING);

  Serial.println("KY-040 編碼器初始化完成");
}

// ================= 第三步：預計算正弦波查找表 =================
// 提前算好 2048 個 sin 值存在記憶體裡，播放時直接查表，省 CPU
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

// ================= 初始化 8 個氣缸相位偏移 =================
void initCylinderPhases() {
  for (int i = 0; i < NUM_CYLINDERS; i++) {
    // 把角度轉換成 0.0～1.0 的相位（720° 對應一個完整燃燒循環）
    cylinderPhase[i] = firingAngles[i] / 720.0f;
  }
}

// ================= 生成單個氣缸的排氣脈衝波形 =================
// phase 是 0.0～1.0 的目前相位，回傳該時刻的振幅
float generateCylinderPulse(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float pulse = 0.0f;

  if (phase < 0.30f) {
    // 前 30%：快速上升，模擬排氣門打開的衝擊
    float t = phase / 0.30f;
    pulse = sinf(M_PI * t) * expf(-2.2f * t) * 1.35f;
  } else if (phase < 0.50f) {
    // 30%～50%：輕微反彈，模擬管道回壓
    float t = (phase - 0.30f) / 0.20f;
    pulse = -0.25f * sinf(M_PI * 2.0f * t) * expf(-5.0f * t);
  }
  // 後 50%：無聲，等待下一次排氣

  return pulse;
}

// ================= 第四步：預計算噗聲波形表 =================
// 把一次完整的「噗」聲提前算好存在陣列裡，播放時直接讀取，省 CPU
void buildStraightPipeThumpTable() {
  int attackS  = (int)(THUMP_ATTACK_MS  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(THUMP_BODY_MS    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(THUMP_TAIL_MS    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(THUMP_REBOUND_DELAY_MS * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen  = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;  // 加上回彈餘音

  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1   = 0.0f;  // 基頻相位
  float phase2   = 0.0f;  // 二次諧波相位
  float phase3   = 0.0f;  // 三次諧波相位
  float phaseSub = 0.0f;  // 次低頻相位

  float noiseLP1 = 0.0f;  // 低通濾波器狀態 1
  float noiseLP2 = 0.0f;  // 低通濾波器狀態 2
  uint32_t seed  = 24681357;

  for (int i = 0; i < totalLen; i++) {

    // --- 計算主包絡（起音→主體→衰減）---
    float env1 = 0.0f;

    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;  // 平方讓起音更衝
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    // --- 計算回彈包絡（延遲一段時間後的小回聲）---
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
      env2 *= THUMP_REBOUND_GAIN;  // 回彈比主體小得多
    }

    float env = clampf(env1 + env2, 0.0f, 1.5f);

    // --- 頻率隨時間下滑（模擬排氣壓力釋放後音調降低）---
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

    // --- 合成音調部分：基頻 + 諧波 + 次低頻 ---
    float base = fastSin(phase1);
    base = tanhf(base * THUMP_DRIVE);  // 軟削波，模擬排氣管的非線性失真

    float tonal =
        0.82f          * base
      + THUMP_TONE2_MIX * fastSin(phase2)
      + THUMP_TONE3_MIX * fastSin(phase3)
      + THUMP_SUB_MIX   * fastSin(phaseSub);

    // --- 合成雜訊部分：模擬氣流衝出的嘶嘶聲 ---
    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);   // 兩級低通，讓雜訊更偏低頻
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;     // 帶通效果

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;  // 後半段氣流聲減弱

    float air = bandNoise * (THUMP_NOISE_MIX * (0.25f * env + THUMP_BURST_MIX * 0.75f * earlyEnv));

    // --- 混合音調和氣流，再做一次非對稱軟削波 ---
    float sample = tonal * env + air;
    sample += 0.08f * env * env1;  // 輕微的非線性疊加，讓聲音更有質感

    if (sample > 0.0f) {
      sample = tanhf(sample * 1.15f) * 1.05f;  // 正半週稍微推一點
    } else {
      sample = tanhf(sample * 0.85f);           // 負半週稍微壓一點
    }

    sample *= THUMP_TABLE_GAIN;
    thumpTable[i] = clampf(sample, -1.0f, 1.0f);
  }

  thumpTableLen = totalLen;

  Serial.printf("噗聲表生成完成，長度=%d samples，約 %d ms\n",
    thumpTableLen,
    (int)((float)thumpTableLen * 1000.0f / SAMPLE_RATE));
}

// ================= 第五步：初始化 I2S 驅動 =================
void initI2S() {
  i2s_config_t i2s_config = {
    .mode                = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate         = SAMPLE_RATE,
    .bits_per_sample     = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format      = I2S_CHANNEL_FMT_RIGHT_LEFT,   // 立體聲（左右各一路）
    .communication_format= I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags    = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count       = DMA_BUF_COUNT,
    .dma_buf_len         = DMA_BUF_LEN,
    .use_apll            = false,
    .tx_desc_auto_clear  = true,   // 發送完自動清零，防止雜音
    .fixed_mclk          = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK,
    .ws_io_num    = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num  = I2S_PIN_NO_CHANGE  // 只發不收
  };

  esp_err_t err;

  err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("I2S 驅動安裝失敗: %d\n", (int)err);
    while (1) delay(100);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("I2S 腳位設定失敗: %d\n", (int)err);
    while (1) delay(100);
  }

  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S 初始化完成");
}

// ================= 油門更新（每 20ms 被 throttleTask 呼叫）=================
void updateThrottle() {

  // 處理按鍵：按下就把編碼器位置和油門一起歸零
  if (encoderButtonPressed) {
    encoderButtonPressed = false;
    encoderPosition = 0;
    targetThrottle  = 0.0f;
    Serial.println(">>> 按鍵按下：油門歸零！");
  }

  // 限制編碼器位置範圍，防止一直轉超出 0～滿油門區間
  int maxSteps = (int)(1.0f / ENCODER_STEP_SIZE);  // 預設 10 步到滿油門

  if (encoderPosition < 0)        encoderPosition = 0;
  if (encoderPosition > maxSteps) encoderPosition = maxSteps;

  // 把步數換算成 0.0～1.0 的油門值
  targetThrottle = clampf((float)encoderPosition * ENCODER_STEP_SIZE, 0.0f, 1.0f);

  // 平滑過渡：每次只走一小步，避免油門突變導致聲音喀噠跳變
  throttleValue += (targetThrottle - throttleValue) * ENCODER_SMOOTHING;
  throttleValue  = clampf(throttleValue, 0.0f, 1.0f);

  // 根據油門計算目標轉速
  targetRPM = RPM_IDLE + throttleValue * (RPM_MAX - RPM_IDLE);
}

// ================= 音訊生成任務（跑在核心 1，最高優先級）=================
void audioTask(void *param) {
  float crankPhase = 0.0f;   // 曲軸相位，推動所有氣缸

  float bgLpf    = 0.0f;    // 背景音低通濾波器狀態
  float bgHpfIn  = 0.0f;    // 背景音高通濾波器輸入
  float bgHpfOut = 0.0f;    // 背景音高通濾波器輸出

  int   playPosA = -1;       // 噗聲 A 聲部目前播放位置（-1 表示未啟動）
  int   playPosB = -1;       // 噗聲 B 聲部（上一次噗聲的淡出）
  float gainA    = 1.0f;
  float gainB    = 0.55f;

  int  samplesToNextTrigger = 0;   // 距離下一次觸發噗聲還有多少個取樣點
  bool altToggle = false;          // 交替氣缸切換標誌

  float thumpLpf  = 0.0f;   // 噗聲低通濾波器狀態
  float outHpfIn  = 0.0f;   // 輸出高通濾波器輸入
  float outHpfOut = 0.0f;   // 輸出高通濾波器輸出

  uint32_t jitterSeed = 987654321;

  unsigned long audioStartMs = millis();

  Serial.println("音訊任務啟動");

  while (true) {

    // --- 轉速平滑跟隨（模擬真實引擎慣性）---
    currentRPM += (targetRPM - currentRPM) * RPM_SMOOTHING;

    // 目前轉速在 0.0～1.0 範圍內的歸一化值
    float rpmNorm = clampf((currentRPM - RPM_IDLE) / (RPM_MAX - RPM_IDLE), 0.0f, 1.0f);

    // 曲軸每個取樣點的相位增量（四衝程÷2）
    float cycleIncrement = ((currentRPM / 60.0f) / (float)SAMPLE_RATE) / 2.0f;

    // 目前噗聲頻率
    float thumpHz = THUMP_HZ_IDLE + rpmNorm * (THUMP_HZ_MAX - THUMP_HZ_IDLE);
    currentThumpHz = thumpHz;

    // 音量隨轉速變化
    float bgGain = BACKGROUND_GAIN_IDLE + rpmNorm * (BACKGROUND_GAIN_MAX - BACKGROUND_GAIN_IDLE);
    float thumpLayerGain = THUMP_LAYER_GAIN_IDLE + rpmNorm * (THUMP_LAYER_GAIN_MAX - THUMP_LAYER_GAIN_IDLE);

    // 低通截止頻率隨轉速提高（高轉速時背景音亮一些）
    float bgLpfAlpha = 0.16f + 0.55f * rpmNorm;

    // 啟動淡入（防止開機瞬間的爆音）
    float fadeIn = clampf((float)(millis() - audioStartMs) / 1800.0f, 0.0f, 1.0f);

    // --- 逐取樣點生成音訊 ---
    for (int i = 0; i < DMA_BUF_LEN; i++) {

      // ====================================================
      // 層 1：背景引擎音——8 個氣缸的疊加排氣脈衝
      // ====================================================
      float bg = 0.0f;

      for (int cyl = 0; cyl < NUM_CYLINDERS; cyl++) {
        float phase = crankPhase - cylinderPhase[cyl];
        while (phase < 0.0f) phase += 1.0f;
        while (phase >= 1.0f) phase -= 1.0f;

        float pulse = generateCylinderPulse(phase);
        float cylGain = (cyl % 2 == 0) ? 1.0f : 0.82f;  // 奇偶氣缸稍有差異，更真實
        bg += pulse * cylGain;
      }

      bg /= (float)NUM_CYLINDERS * 0.42f;

      // 加入諧波層（重點放低頻，減少高次諧波的嗡嗡感）
      float basePhase  = crankPhase * 4.0f;
      float harmonics  = 0.0f;

      harmonics += fastSin(basePhase)        * 1.00f;
      harmonics += fastSin(basePhase * 0.5f) * 0.60f;   // 半頻：加重低沉感
      harmonics += fastSin(basePhase * 1.5f) * 0.28f;
      harmonics += fastSin(basePhase * 2.0f) * (0.25f + 0.10f * rpmNorm);
      harmonics += fastSin(basePhase * 3.0f) * (0.08f + 0.08f * rpmNorm);
      harmonics += fastSin(basePhase * 4.0f) * (0.03f * rpmNorm);  // 4 次諧波是嗡嗡聲來源，壓很低
      harmonics /= 2.4f;

      bg = bg * 0.55f + harmonics * 0.45f;
      bg = tanhf(bg * (1.05f + rpmNorm * 0.8f));  // 軟削波，模擬排氣管非線性

      // 加入低頻機械雜訊（隆隆聲，不是嘶嘶聲）
      float rumble   = pseudoRandom();
      float rumble2  = pseudoRandom();
      bg += (rumble * 0.6f + rumble2 * 0.4f) * (0.008f + 0.018f * rpmNorm);

      // 低通濾波（讓聲音更像從排氣管裡傳出來的，悶一點）
      float bgLpfAlpha2 = 0.18f + 0.45f * rpmNorm;
      bgLpf += bgLpfAlpha2 * (bg - bgLpf);
      bg = bgLpf;

      // 輕微高通（去掉直流偏移）
      float bgHp = 0.992f * (bgHpfOut + bg - bgHpfIn);
      bgHpfIn  = bg;
      bgHpfOut = bgHp;
      bg = bg * 0.92f + bgHp * 0.08f;

      bg *= bgGain;

      // ====================================================
      // 層 2：主噗聲——改裝直排砲筒音效
      // ====================================================

      // 計時到了就觸發一次新的噗聲
      if (samplesToNextTrigger <= 0) {

        // 把上一次噗聲淡出為 B 聲部（做尾聲交疊）
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.50f;
        }

        playPosA = 0;

        // 奇偶交替：模擬 V8 不同氣缸點火的輕微力度差異
        gainA = altToggle ? THUMP_ALT_GAIN : 1.0f;

        // 計算到下一次觸發的間隔（加入 Swing 和抖動，讓節奏更有律動感）
        float intervalSamples = (float)SAMPLE_RATE / thumpHz;
        float swingFactor = altToggle ? (1.0f - THUMP_SWING) : (1.0f + THUMP_SWING);
        float jitter = 1.0f + localRandSigned(jitterSeed) * 0.025f;

        samplesToNextTrigger = (int)clampf(intervalSamples * swingFactor * jitter, 1.0f, 999999.0f);
        altToggle = !altToggle;
      }

      samplesToNextTrigger--;

      float thump = 0.0f;

      // 讀取 A 聲部
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) {
          thump += thumpTable[playPosA++] * gainA;
        } else {
          playPosA = -1;
        }
      }

      // 讀取 B 聲部（上一次噗聲的淡出尾音）
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) {
          thump += thumpTable[playPosB++] * gainB;
          gainB *= 0.9992f;  // 緩慢淡出
        } else {
          playPosB = -1;
        }
      }

      // 低通讓噗聲邊緣更圓潤，不那麼硬
      thumpLpf += 0.58f * (thump - thumpLpf);
      thump = thumpLpf * thumpLayerGain;

      // ====================================================
      // 層 3：混合兩層，輸出
      // ====================================================
      float sample = bg + thump;

      // 最終輸出高通（去掉低頻直流漂移）
      float outHp = 0.988f * (outHpfOut + sample - outHpfIn);
      outHpfIn  = sample;
      outHpfOut = outHp;
      sample = sample * 0.86f + outHp * 0.14f;

      // 整體軟削波（防止兩層疊加時過載爆音）
      sample = tanhf(sample * (1.05f + 0.22f * rpmNorm));

      sample *= MASTER_VOLUME * fadeIn;
      sample  = clampf(sample, -0.98f, 0.98f);

      // 轉成 16bit PCM，左右聲道相同（單聲道喇叭）
      int16_t out = (int16_t)(sample * PCM_OUTPUT_SCALE);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;

      // 推進曲軸相位
      crankPhase += cycleIncrement;
      if (crankPhase >= 1.0f) crankPhase -= 1.0f;
    }

    // 把這批音訊資料寫入 I2S DMA，寫完再生成下一批
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= 油門任務（跑在核心 0，低優先級）=================
void throttleTask(void *param) {
  while (true) {
    updateThrottle();
    vTaskDelay(pdMS_TO_TICKS(20));  // 每 20ms 更新一次油門，足夠流暢
  }
}

// ================= 串口監控任務（跑在核心 0，最低優先級）=================
void monitorTask(void *param) {
  char buf[128];

  while (true) {
    int rpmInt      = (int)(currentRPM + 0.5f);
    int targetInt   = (int)(targetRPM  + 0.5f);
    int throttlePct = (int)(throttleValue * 100.0f + 0.5f);
    int thumpHz10   = (int)(currentThumpHz * 10.0f + 0.5f);

    snprintf(buf, sizeof(buf),
      "RPM=%d  目標=%d  油門=%d%%  編碼器=%d  噗頻=%d.%dHz",
      rpmInt, targetInt, throttlePct, encoderPosition,
      thumpHz10 / 10, thumpHz10 % 10);

    Serial.println(buf);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

// ================= setup：系統初始化 =================
void setup() {
#if DISABLE_BROWNOUT_FOR_TEST
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  Serial.begin(115200);
  delay(1000);

  // 啟動時檢查記憶體狀態（如果 PSRAM 是 0，說明沒驅動起來，回去改 QSPI）
  Serial.printf("片上 SRAM 剩餘: %d 位元組\n", ESP.getFreeHeap());
  Serial.printf("外掛 PSRAM 剩餘: %d 位元組\n", ESP.getFreePsram());

  Serial.println("====================================");
  Serial.println("ESP32-S3 V8 聲浪模擬器");
  Serial.println("主噗聲：改裝直排砲筒");
  Serial.println("油門控制：KY-040 旋轉編碼器");
  Serial.println("====================================");

  initEncoder();
  initSineTable();
  initCylinderPhases();
  buildStraightPipeThumpTable();
  initI2S();

  // 音訊任務：核心 1，最高優先級，12KB 堆疊
  xTaskCreatePinnedToCore(audioTask,    "AudioTask", 12288, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  // 油門任務：核心 0，優先級 2，3KB 堆疊
  xTaskCreatePinnedToCore(throttleTask, "Throttle",  3072,  NULL, 2,                        NULL, 0);
  // 監控任務：核心 0，最低優先級，4KB 堆疊（別給太小，不然堆疊溢出）
  xTaskCreatePinnedToCore(monitorTask,  "Monitor",   4096,  NULL, 1,                        NULL, 0);

  Serial.println("系統啟動完成，旋轉編碼器控制油門，按下歸零");
}

// loop 基本閒置，所有活都交給 FreeRTOS 任務了
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

### 程式碼說明

整個程式由三個並行任務組成，用 FreeRTOS 排程，互不干擾：

| 任務 | 跑在哪個核心 | 優先級 | 幹什麼 |
|------|------------|--------|--------|
| `audioTask` | 核心 1 | 最高 | 逐取樣點合成音訊，寫入 I2S DMA |
| `throttleTask` | 核心 0 | 中 | 每 20ms 讀一次編碼器，更新油門 |
| `monitorTask` | 核心 0 | 最低 | 每 700ms 串口列印一次狀態 |

**聲音合成的核心邏輯分三層：**

**第一層：背景引擎音。** 8 個氣缸各自維護一個相位，每個氣缸按照 V8 的點火角度（0°、90°、150°……450°）依次觸發排氣脈衝波形。8 個氣缸的輸出疊加在一起，就是那種連續的低沉隆隆聲。在氣缸脈衝的基礎上，再疊加基頻和幾次諧波，增加引擎音的層次感。

**第二層：主噗聲。** 每隔一段時間（由 `thumpHz` 決定頻率），就從預計算好的噗聲波形表裡讀取一次完整的「噗」聲播放出來。噗聲本身是起音→主體→衰減三段包絡，加上頻率下滑（模擬排氣壓力釋放）和回彈延遲（模擬管道共振），聽起來像改裝直排的砲筒聲。

**第三層：混合輸出。** 兩層疊加後，過一個整體軟削波防止爆音，再乘以淡入係數（防止開機瞬間爆音），最後寫成 16bit 立體聲 PCM 送進 I2S。



## 噗聲樣本除錯工具（可選）

為了方便快速找到適合的排氣聲，我另外做了一版串口輪播測試程式碼：內建 30 套預設參數，用串口指令切換，能直接對比哪種「噗」聲最對你的胃口。主程式裡最終用的是編號 23 的「改裝直排砲筒」。

```c
/*
 * ESP32-S3 + MAX98357A
 * 噗聲樣本輪播測試器 V2
 * 30個樣本 + 音量大幅提升
 *
 * 接線：
 *   BCLK -> GPIO16
 *   LRC  -> GPIO17
 *   DIN  -> GPIO15
 *
 * 串口指令（115200）：
 *   n     下一個
 *   p     上一个
 *   r     重播
 *   s     停止自動輪播
 *   a     開啟自動輪播
 *   b     開/關背景底層
 *   1~30  跳到對應編號
 *   h     說明
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

// ================= 樣本參數結構 =================
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
  {"01 深沉大排量",               12,  65, 100,  55,  42,  34,  0.18, 0.24, 0.08, 0.28, 1.7, 0.18, 44, 0.22, 1.00, 0.00, 2.8, 0.20},
  {"02 更圓潤綿密",               14,  75, 130,  52,  40,  32,  0.12, 0.18, 0.04, 0.32, 1.5, 0.10, 50, 0.18, 1.00, 0.00, 2.9, 0.16},
  {"03 小喇叭增強A",               7,  42,  65, 100,  80,  65,  0.16, 0.30, 0.14, 0.06, 1.6, 0.16, 32, 0.14, 1.00, 0.00, 2.6, 0.12},
  {"04 小喇叭增強B",               5,  35,  55, 120,  95,  78,  0.14, 0.36, 0.20, 0.04, 1.7, 0.12, 26, 0.12, 1.00, 0.00, 2.5, 0.10},
  {"05 美式V8怠速",                9,  55,  95,  72,  56,  44,  0.22, 0.26, 0.10, 0.14, 1.8, 0.24, 42, 0.30, 0.80, 0.20, 2.7, 0.22},
  {"06 更咕嚕不均勻",             11,  58, 105,  68,  52,  42,  0.24, 0.22, 0.08, 0.18, 1.8, 0.22, 54, 0.38, 0.72, 0.26, 2.8, 0.24},
  {"07 回壓明顯雙噗",              8,  48,  85,  80,  62,  48,  0.20, 0.26, 0.12, 0.12, 1.7, 0.20, 58, 0.48, 0.88, 0.14, 2.6, 0.18},
  {"08 粗糙炸裂",                  6,  40,  68,  90,  72,  56,  0.28, 0.32, 0.16, 0.08, 2.2, 0.32, 34, 0.22, 0.90, 0.10, 2.5, 0.15},
  {"09 極厚極悶",                 16,  85, 150,  48,  38,  30,  0.08, 0.14, 0.02, 0.36, 1.6, 0.06, 58, 0.20, 1.00, 0.00, 3.0, 0.14},
  {"10 短促有力Punch",             4,  28,  45, 100,  78,  60,  0.14, 0.38, 0.20, 0.04, 1.8, 0.12, 22, 0.10, 1.00, 0.00, 2.4, 0.10},
  {"11 沙啞排氣管",                8,  50,  88,  82,  64,  50,  0.32, 0.24, 0.10, 0.10, 1.9, 0.34, 40, 0.26, 0.86, 0.12, 2.6, 0.16},
  {"12 低頻重砲",                 13,  68, 115,  58,  46,  36,  0.14, 0.20, 0.06, 0.30, 1.8, 0.14, 48, 0.26, 1.00, 0.00, 2.9, 0.20},
  {"13 中頻Punch乾脆",             6,  36,  58, 130, 100,  78,  0.10, 0.40, 0.24, 0.02, 1.6, 0.08, 28, 0.10, 1.00, 0.00, 2.4, 0.08},
  {"14 雙脈衝咕咕",                7,  44,  78,  85,  66,  52,  0.18, 0.28, 0.14, 0.10, 1.8, 0.20, 20, 0.45, 0.82, 0.18, 2.6, 0.16},
  {"15 舊V8鬆散感",               10,  60, 108,  72,  55,  44,  0.24, 0.22, 0.08, 0.16, 1.7, 0.20, 52, 0.32, 0.68, 0.30, 2.7, 0.22},
  {"16 超厚測試",                 15,  95, 160,  54,  42,  32,  0.06, 0.14, 0.02, 0.38, 1.6, 0.04, 64, 0.18, 1.00, 0.00, 3.2, 0.12},
  {"17 哈雷機車風格",              8,  52,  90,  78,  58,  46,  0.26, 0.24, 0.10, 0.16, 1.9, 0.26, 48, 0.35, 0.65, 0.32, 2.8, 0.25},
  {"18 跑車高轉銳利",              4,  30,  50, 140, 110,  88,  0.12, 0.42, 0.28, 0.02, 1.8, 0.10, 20, 0.08, 1.00, 0.00, 2.3, 0.08},
  {"19 柴油機突突",               14,  48,  80,  65,  50,  42,  0.30, 0.18, 0.06, 0.20, 2.0, 0.28, 38, 0.40, 0.75, 0.22, 2.7, 0.20},
  {"20 大排量巡航艦",             12,  72, 125,  60,  45,  36,  0.16, 0.20, 0.06, 0.34, 1.7, 0.12, 55, 0.24, 1.00, 0.00, 3.0, 0.18},
  {"21 超粗暴爆裂",                3,  25,  40, 110,  85,  68,  0.35, 0.34, 0.18, 0.06, 2.5, 0.40, 18, 0.15, 0.92, 0.08, 2.4, 0.12},
  {"22 溫柔大排量",               16,  90, 140,  50,  40,  34,  0.10, 0.16, 0.04, 0.30, 1.4, 0.06, 60, 0.16, 1.00, 0.00, 3.0, 0.10},
  {"23 改裝直排砲筒",              5,  38,  62, 105,  82,  64,  0.22, 0.30, 0.16, 0.08, 2.1, 0.28, 30, 0.18, 0.94, 0.06, 2.5, 0.14},
  {"24 低沉+強回壓",              10,  58,  95,  65,  50,  40,  0.18, 0.22, 0.08, 0.22, 1.8, 0.16, 65, 0.52, 0.85, 0.16, 2.8, 0.20},
  {"25 氣流爆發型",                6,  35,  55,  88,  68,  52,  0.38, 0.20, 0.08, 0.10, 1.7, 0.45, 28, 0.14, 1.00, 0.00, 2.5, 0.12},
  {"26 三缸突突感",               10,  45,  75,  74,  58,  46,  0.20, 0.22, 0.10, 0.14, 1.8, 0.20, 36, 0.30, 0.60, 0.35, 2.6, 0.18},
  {"27 超低音砲測試",             18, 100, 180,  42,  32,  26,  0.06, 0.12, 0.02, 0.42, 1.5, 0.04, 70, 0.20, 1.00, 0.00, 3.4, 0.08},
  {"28 拳拳到肉型",                5,  32,  48,  95,  75,  58,  0.16, 0.34, 0.18, 0.06, 2.0, 0.16, 24, 0.12, 1.00, 0.00, 2.6, 0.10},
  {"29 全頻轟鳴",                  8,  55,  90,  85,  65,  50,  0.20, 0.28, 0.14, 0.18, 1.9, 0.22, 42, 0.28, 0.88, 0.12, 2.8, 0.20},
  {"30 極端對比測試",              3,  20,  35, 150, 120,  90,  0.40, 0.44, 0.28, 0.02, 2.4, 0.45, 16, 0.08, 1.00, 0.00, 2.2, 0.06},
};

const int NUM_PRESETS = sizeof(presets) / sizeof(presets[0]);

// ================= 初始化 =================
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

// ================= 構建波形表 =================
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

// ================= 串口控制 =================
void showHelp() {
  Serial.println();
  Serial.println("===== 指令 =====");
  Serial.println("n     下一個");
  Serial.println("p     上一個");
  Serial.println("r     重播");
  Serial.println("s     停止自動輪播");
  Serial.println("a     開啟自動輪播");
  Serial.println("b     開/關背景");
  Serial.println("1~30  跳到編號");
  Serial.println("h     說明");
  Serial.println("================");
}

void printPresetInfo(int idx) {
  Serial.println();
  Serial.println("========================================");
  Serial.print("樣本 #");
  Serial.print(idx + 1);
  Serial.print(" / ");
  Serial.println(NUM_PRESETS);
  Serial.println(presets[idx].name);
  Serial.print("前2.5秒慢噗 後2.5秒快噗 背景:");
  Serial.println(backgroundEnabled ? "開" : "關");
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
  if (cmd == "s") { autoPlay = false; Serial.println("自動輪播已停止"); return; }
  if (cmd == "a") { autoPlay = true; lastSwitchMs = millis(); Serial.println("自動輪播已開啟"); return; }
  if (cmd == "b") { backgroundEnabled = !backgroundEnabled; Serial.print("背景: "); Serial.println(backgroundEnabled ? "開" : "關"); return; }
  if (cmd == "h") { showHelp(); return; }

  int n = cmd.toInt();
  if (n >= 1 && n <= NUM_PRESETS) { requestPreset(n - 1); return; }

  Serial.print("未知: ");
  Serial.println(cmd);
}

// ================= 音訊任務 =================
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

      // ★ 關鍵：最終輸出增益大幅提升
      sample *= 1.8f;

      sample = tanhf(sample * 1.1f);
      sample = clampf(sample, -0.98f, 0.98f);

      // ★ 滿量程輸出
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
  Serial.println("噗聲樣本輪播測試器 V2");
  Serial.println("30個樣本 + 大音量版");
  Serial.println("====================================");

  initSineTable();
  initI2S();
  showHelp();
  requestPreset(0);

  xTaskCreatePinnedToCore(audioTask, "Audio", 10240, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  Serial.println("開始播放...");
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

## 常見問題排查

別慌，90% 的問題出在這幾個地方，對著查一遍基本能搞定：

**通電後喇叭完全沒聲音**

先查 SD 腳位。MAX98357A 的 SD 腳位如果被意外拉低（比如碰到 GND，或者沒有浮空），模組會進入靜音模式。把 SD 腳位懸空或接 3.3V，重新上電試試。接著用串口監控確認 I2S 初始化有沒有報錯，列印裡有沒有「I2S 驅動安裝失敗」的字樣。

**聲音很小，幾乎聽不見**

先確認喇叭阻抗。MAX98357A 接 4Ω 喇叭能輸出 3W，接 8Ω 喇叭只有約 1.4W，音量差一倍。其次檢查 VIN 是不是接的 5V，接 3.3V 功率會大幅下降。還可以把程式碼裡的 `PCM_OUTPUT_SCALE` 從 26000 調高到 30000，但別超過 32767，超了會溢出失真。

**編碼器旋轉方向反了（順時針減、逆時針加）**

在 `encoderISR()` 裡把 `encoderPosition++` 和 `encoderPosition--` 對調，或者直接把 CLK 和 DT 的物理接線對調，二選一。

**開機就立刻崩潰重啟，串口顯示 `Stack canary watchpoint triggered`**

這是某個 FreeRTOS 任務的堆疊溢出了，錯誤訊息裡會顯示任務名字（比如 `Monitor`）。找到對應任務，把 `xTaskCreatePinnedToCore` 裡的堆疊大小（第三個數字）調大，Monitor 任務至少給 4096，不夠就給 8192。

**串口顯示 `OOM: failed to allocate XXX bytes`**

記憶體溢出。按以下順序檢查：

1. Arduino IDE 的 **工具 → PSRAM** 有沒有選上，必須選 **QSPI PSRAM**（不是 OPI）
2. 在 `setup()` 開頭加 `Serial.printf("PSRAM: %d\n", ESP.getFreePsram());`，重燒後看串口，如果列出來是 0，說明 PSRAM 沒驅動起來，回去改選項
3. 確認你的開發板型號有外掛 PSRAM（ESP32-S3-WROOM-1-**N16R8** 的 R8 就代表 8MB PSRAM）

**聲音有規律的爆音或者雜音**

多半是共地問題。ESP32-S3 的 GND 和 MAX98357A 的 GND 要連在同一根線上，不能分開接兩個不同的電源地。用萬用表量一下兩個 GND 之間的阻值，應該接近 0Ω。

---

## FAQ

**Q：ESP32-S3 的 GPIO16/17/15 被佔用了，可以換成其他腳位嗎？**
A：可以，I2S 腳位可以自由映射到任意 GPIO。把程式碼頂部的 `I2S_BCLK`、`I2S_LRC`、`I2S_DOUT` 三個巨集改成你想用的腳位號就行。但注意 GPIO 0、1、2、3、43、44 有特殊用途，建議避開。

**Q：可以接兩個喇叭做立體聲嗎？**
A：MAX98357A 是單聲道功放，要做立體聲需要兩塊模組，一塊接左聲道、一塊接右聲道，透過 GAIN 腳位的接法區分（一塊接 GND = 右聲道，一塊懸空 = 左聲道）。程式碼裡兩路 PCM 資料目前是一樣的（`stereoBuffer[i*2] = stereoBuffer[i*2+1] = out`），如果想真立體聲還需要修改合成邏輯。

**Q：取樣率 22050Hz 夠用嗎？能改成 44100Hz 嗎？**
A：22050Hz 對於引擎聲這類中低頻內容完全夠用，最高能還原 11025Hz 的音訊，人耳對引擎聲的感知主要在 50Hz～4kHz 之間。改成 44100Hz 理論上可以，但 CPU 負擔翻倍，建議測試時先確認穩定，同步修改 `SAMPLE_RATE` 和 I2S 設定裡的 `sample_rate`。

**Q：連接 5V 電源會不會燒掉 ESP32-S3？**
A：MAX98357A 的 VIN 接 5V，但它的訊號腳位（BCLK、LRC、DIN）是 3.3V 電位，可以直接和 ESP32-S3 的 GPIO 連接，不需要電位轉換。ESP32-S3 的 GPIO 能輸出 3.3V，MAX98357A 能識別，安全的。

**Q：怠速時聲音太小，聽不清楚，能調大嗎？**
A：調 `BACKGROUND_GAIN_IDLE`（預設 0.45）和 `THUMP_LAYER_GAIN_IDLE`（預設 0.75），兩個都往上加，比如改成 0.6 和 1.0，怠速音量會明顯提升。調完記得測試滿油門時有沒有爆音，有的話把 `PCM_OUTPUT_SCALE` 稍微降一點點。

**Q：KY-040 編碼器轉一格油門變化 10%，太大了，能細一點嗎？**
A：把 `ENCODER_STEP_SIZE` 從 0.1 改小，比如改成 0.05，就變成每格 5%，需要轉 20 格才能到滿油門，手感更細膩。

**Q：程式能在 ESP32（非 S3）上執行嗎？**
A：理論上相容，I2S API 是通用的，但普通 ESP32 沒有外掛 PSRAM 或 PSRAM 較小，執行這個專案可能記憶體不夠。建議至少用帶 PSRAM 的型號，比如 ESP32-WROVER。GPIO 編號也需要根據你的板子重新映射。

---

## 延伸玩法

玩完基礎版，還可以往這幾個方向擴展：

- **接速度感測器**：把霍爾感測器裝在車輪上，車速越快油門自動越大，解放雙手
- **換成 V6 / 直四 / 機車音效**：修改 `NUM_CYLINDERS` 和 `firingAngles`，換一套點火角度就是另一種引擎
- **加 TFT 螢幕**：顯示目前轉速表和油門百分比，裝儀表板既視感
- **加外殼防水**：裝在電動車上用，下雨天還是要做好防水的，不然電路進水比沒聲音更麻煩

---

## 參考資料

- [MAX98357A 資料手冊（Analog Devices）](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [MAX98357A 產品頁（Analog Devices）](https://www.analog.com/en/products/max98357a.html)
- [ESP32-S3 技術參考手冊（Espressif）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3-WROOM-1 產品頁（Espressif）](https://www.espressif.com/en/products/modules/esp32-s3)
- [ESP32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)
- [FreeRTOS 任務建立 API 文件](https://www.freertos.org/a00125.html)
