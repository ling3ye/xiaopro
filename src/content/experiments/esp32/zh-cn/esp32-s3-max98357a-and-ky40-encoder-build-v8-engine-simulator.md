---
title: "ESP32-S3 + MAX98357A 制作 V8 引擎声浪模拟器 完整教程（I2S 数字音频 + KY-040 旋转编码器控制油门）"
boardId: esp32s3
moduleId: audio/max98357a
moduleIds:
  - audio/max98357a
  - sensor/ky-040
category: esp32
date: 2026-07-14
intro: "用 ESP32-S3 驱动 MAX98357A 功放模块，配合 KY-040 旋转编码器，纯代码实时合成 V8 引擎声浪——油门由编码器手动控制，声音经喇叭实时输出。含完整接线、代码和踩坑记录。"
image: "https://img.lingflux.com/2026/07/6c72c55fa63614eb8c2086c24d993d5f.jpg"
---

> **TL;DR（快速上手）：**
>
> 1. 接线：MAX98357A 的 BCLK → GPIO16，LRC → GPIO17，DIN → GPIO15；KY-040 的 CLK → GPIO5，DT → GPIO6，SW → GPIO7
> 2. 开发板选 **ESP32S3 Dev Module**，PSRAM 选 **QSPI PSRAM**（选错就 OOM，别问我怎么知道的）
> 3. 顺时针旋转编码器 = 减油门，逆时针 = 加油门，按下 = 回怠速
> 4. 烧录，通电，享受你的"V8 电动车"

---

难度：⭐⭐⭐☆☆（需要会基本的 Arduino 接线和烧录）
预计时间：45 分钟
测试环境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + ESP32-S3-WROOM-1-N16R8（16MB Flash + 8MB PSRAM）

---

## 前言

骑过电动自行车的人都懂那种尴尬：你悄无声息地从背后靠近行人，对方猛地被吓了个半死，回头给你一个"你怎么不出声"的眼神——而你只能报以一个尴尬的微笑，因为你的车确实……没声音。

电动车省油又环保，唯独这一点让人头疼：太安静了。安静到像一个幽灵，飘在马路上。

于是我就在想：既然不能靠发动机自带声音，能不能自己**造一个声音**出来？不是那种廉价喇叭放的"滴滴"声，而是……V8 引擎的声浪？低沉、有力，一脚踩下去轰隆作响的那种。

本文的目标就是：用 **ESP32-S3 + MAX98357A 功放模块 + KY-040 旋转编码器**，纯代码合成一套 V8 引擎声浪，油门大小由编码器手动控制，声音通过喇叭实时输出。没有采样，没有播放音频文件，全是实时数学运算出来的引擎声。



---

## 实验效果

旋转 KY-040 编码器加油门，喇叭会从低沉的怠速隆隆声逐渐过渡到高转速的引擎轰鸣；按下编码器按钮，油门立即归零，回到怠速状态。整个声音过渡平滑，没有突兀的跳变，听起来挺像那么回事。


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30IWSgfp3IY?si=XXwD3KaDonejM5WD" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## 元件说明

> 开发板（ESP32-S3）不作说明，重点介绍其他两个主角。

### MAX98357A — 数字信号翻译官

想象你有一段数字录音（一串 0 和 1），但喇叭只听得懂模拟信号（电压高低变化）。MAX98357A 就是这两者之间的**同声传译**：它接收 ESP32-S3 通过 I2S 协议发出的数字音频，把它实时转换成能驱动喇叭的模拟电流，并且内置 3W 功放，不需要再额外加放大电路。

| 参数 | 数值 |
|------|------|
| 供电电压 | 2.5V ～ 5.5V |
| 输出功率 | 3.2W（4Ω负载，5V供电） |
| 采样率支持 | 8kHz ～ 96kHz |
| 通信协议 | I2S |
| 增益档位 | 3dB / 6dB / 9dB / 12dB / 15dB |
| 静音控制 | SD 引脚拉低即静音 |

选它的理由很简单：**I2S 直连，免滤波，模块化封装，3W 够骑车用**，而且淘宝十块钱以内就能拿下。

### 引脚说明

| 引脚标识 | 功能说明 |
|----------|----------|
| VIN | 电源正极，接 5V |
| GND | 电源地 |
| BCLK | I2S 位时钟 |
| LRC | I2S 字时钟（左右声道选择） |
| DIN | I2S 数字音频数据输入 |
| SD | 静音控制，悬空或接高电平 = 正常工作，拉低 = 静音 |
| GAIN | 增益选择，悬空默认 9dB |

> **注意**：SD 引脚不接或接 3.3V 都能正常出声；如果你发现接线没问题但就是没声音，首先检查 SD 引脚有没有被意外拉低。

---

### KY-040 — 无限旋转的"音量旋钮"

普通电位器转到头就卡死了，KY-040 是 360° 无限旋转的编码器，它不输出绝对位置，而是告诉你"往哪转了几格"。本项目里我用它来控制油门：**顺时针减油门，逆时针加油门，按下按钮回怠速**，操作感就像在转一个真实的油门旋钮。

| 参数 | 数值 |
|------|------|
| 工作电压 | 3.3V ～ 5V |
| 每圈步进数 | 20 步 |
| 输出信号 | A 相（CLK）/ B 相（DT）/ 按键（SW） |
| 接口类型 | 数字 GPIO（带内部上拉） |

选它的理由：**便宜、常见、有按钮加分**，中断驱动不占 CPU，配合 FreeRTOS 任务架构完全没有压力。

### 引脚说明

| 引脚标识 | 功能说明 |
|----------|----------|
| CLK（A 相） | 旋转编码器输出 A 相，接中断引脚 |
| DT（B 相） | 旋转编码器输出 B 相，判断旋转方向 |
| SW | 按键输出，按下为低电平 |
| + | 电源正极，接 3.3V |
| GND | 电源地 |

---

## BOM 表

| 元件 | 型号/规格 | 数量 | 备注 |
|------|-----------|------|------|
| 主控开发板 | ESP32-S3-WROOM-1-N16R8 | 1 | 16MB Flash + 8MB PSRAM，必须有 PSRAM |
| I2S 功放模块 | MAX98357A | 1 | 含模块板，免焊接版本更方便 |
| 旋转编码器模块 | KY-040 | 1 | 带按钮 |
| 小喇叭 | 4Ω 3W | 1 | 或 8Ω，音量会略小 |
| 杜邦线 | 公对公 / 公对母 | 若干 | 接线用 |
| 面包板 | 任意 | 1 | 可选，固定接线更方便 |

---

## 接线方式

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

> 建议接完每一根线都在表格里打个勾逐一核对，这个习惯能省掉 80% 的排错时间。尤其是 GND，多个模块共地是音频正常工作的前提——大家说同一种语言，信号才能传得准。

---

## 需要安装的库

本项目**不依赖任何第三方音频库**，音频全部由代码实时合成，只用到 ESP32 Arduino Core 自带的 `driver/i2s.h`。

你只需要在 Arduino IDE 里确认以下环境：

| 项目 | 要求 |
|------|------|
| Arduino IDE | 2.3.8（测试通过） |
| ESP32 Arduino Core | 3.3.10（Board Manager 搜索 `esp32` 安装） |
| 开发板选项 | ESP32S3 Dev Module |
| **PSRAM 选项** | **QSPI PSRAM**（这个选错会直接 OOM，见踩坑记录） |
| Flash Size | 16MB |
| Upload Speed | 921600 |

在 Arduino IDE 的 **工具（Tools）** 菜单里把上面每一项都对一遍，特别是 PSRAM 那一行。

---

## 完整代码 + 说明

```cpp
/*
 * ESP32-S3 + MAX98357A + KY-040 旋转编码器
 * V8 引擎声浪模拟器
 *
 * 接线：
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
 *   SW        -> GPIO7  (按下归零油门)
 *   +         -> 3.3V
 *   GND       -> GND
 *
 * 操作说明：
 *   顺时针旋转 = 减油门
 *   逆时针旋转 = 加油门
 *   按下编码器 = 油门归零（回怠速）
 *
 * 串口波特率：115200
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// -----------------------------------------------
// 如果遇到 Brownout 掉电重启，把这里改成 1 临时测试
// 正式使用请保持 0，不建议长期禁用欠压保护
// -----------------------------------------------
#define DISABLE_BROWNOUT_FOR_TEST 0

#if DISABLE_BROWNOUT_FOR_TEST
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

// ================= 第一步：I2S 引脚定义 =================
#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

// ================= 第二步：KY-040 引脚定义 =================
#define ENCODER_CLK_PIN   5
#define ENCODER_DT_PIN    6
#define ENCODER_SW_PIN    7

// ================= 编码器油门参数 =================
// 每转一格对应的油门变化量（范围 0.0～1.0）
// 改小这个值 = 需要转更多格才能到满油门，手感更细腻
#define ENCODER_STEP_SIZE     0.1f

// 油门平滑过渡系数（越大响应越快，越小过渡越丝滑）
#define ENCODER_SMOOTHING     1.2f

// 编码器去抖时间（微秒），防止一次旋转被误读成多次
#define ENCODER_DEBOUNCE_US   200

// 按键去抖时间（毫秒）
#define BUTTON_DEBOUNCE_MS    200

// ================= 音频基本参数 =================
#define SAMPLE_RATE     22050   // 采样率，单位 Hz
#define DMA_BUF_COUNT   8       // DMA 缓冲区数量
#define DMA_BUF_LEN     256     // 每个 DMA 缓冲区的采样点数

// ================= 引擎转速参数 =================
#define RPM_IDLE        800.0f    // 怠速转速（RPM）
#define RPM_MAX         8000.0f   // 最高转速（RPM）
#define RPM_SMOOTHING   0.006f    // 转速变化平滑系数，越小越像真实引擎
#define NUM_CYLINDERS   8         // V8 = 8 个气缸

// ================= 排气噗声节奏 =================
// 怠速时每秒噗 2 次，满转时每秒噗 7.6 次
#define THUMP_HZ_IDLE   2.0f
#define THUMP_HZ_MAX    7.6f

// ================= 音量参数 =================
#define MASTER_VOLUME       1.00f
#define PCM_OUTPUT_SCALE    26000.0f   // 最终输出到 16bit PCM 的缩放系数

// 背景引擎音音量（怠速 / 满转）
#define BACKGROUND_GAIN_IDLE  0.45f
#define BACKGROUND_GAIN_MAX   0.60f

// 主噗声层音量（怠速 / 满转）
#define THUMP_LAYER_GAIN_IDLE 0.75f
#define THUMP_LAYER_GAIN_MAX  1.05f

// ================= 改装直排炮筒噗声参数 =================
// 以下参数控制每一次排气噗声的波形形状，调参谨慎
#define THUMP_ATTACK_MS       5.0f    // 起音时间（ms）
#define THUMP_BODY_MS         38.0f   // 主体持续时间（ms）
#define THUMP_TAIL_MS         62.0f   // 余音衰减时间（ms）

#define THUMP_F_START         105.0f  // 噗声起始频率（Hz）
#define THUMP_F_BODY          82.0f   // 主体频率（Hz）
#define THUMP_F_END           64.0f   // 尾音频率（Hz）

#define THUMP_NOISE_MIX       0.22f   // 噪声混入比例（模拟排气气流声）
#define THUMP_TONE2_MIX       0.30f   // 二次谐波比例
#define THUMP_TONE3_MIX       0.16f   // 三次谐波比例
#define THUMP_SUB_MIX         0.08f   // 次低频比例（加重低沉感）

#define THUMP_DRIVE           2.10f   // 波形饱和度（tanh 软削波强度）
#define THUMP_BURST_MIX       0.28f   // 爆发期气流噪声占比

#define THUMP_REBOUND_DELAY_MS 30.0f  // 排气回弹延迟（ms），模拟管道共振
#define THUMP_REBOUND_GAIN     0.18f  // 回弹增益

#define THUMP_ALT_GAIN         0.94f  // 交替气缸增益差，模拟不均匀点火
#define THUMP_SWING            0.06f  // 节奏摆动量（Swing），增加律动感

#define THUMP_TABLE_GAIN       2.50f  // 噗声波形表整体增益

// ================= 查找表定义 =================
#define SINE_TABLE_SIZE 2048     // 正弦波查找表大小（越大精度越高，内存越多）
#define THUMP_TABLE_MAX 8000     // 噗声波形表最大采样点数

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

// 输出立体声缓冲区（左右声道各 DMA_BUF_LEN 个采样点）
static int16_t stereoBuffer[DMA_BUF_LEN * 2];

// ================= 全局状态变量 =================
volatile float throttleValue  = 0.0f;   // 当前平滑后的油门值（0.0～1.0）
volatile float targetThrottle = 0.0f;   // 编码器设定的目标油门
volatile float targetRPM      = RPM_IDLE;
volatile float currentRPM     = RPM_IDLE;
volatile float currentThumpHz = THUMP_HZ_IDLE;

uint32_t noiseSeed = 123456789;

// V8 气缸相位偏移表（模拟 90° 等间隔点火）
float cylinderPhase[NUM_CYLINDERS];

const float firingAngles[NUM_CYLINDERS] = {
  0.0f, 90.0f, 150.0f, 210.0f,
  270.0f, 330.0f, 390.0f, 450.0f
};

// ================= 编码器中断相关变量 =================
volatile int encoderPosition = 0;
volatile unsigned long lastEncoderInterruptUs = 0;
volatile bool encoderButtonPressed = false;
volatile unsigned long lastButtonPressMs = 0;

// ================= 工具函数 =================

// 数值限幅
static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// 平滑阶梯函数，让过渡更丝滑（S 形曲线）
static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

// 用查找表快速计算 sin，比 sinf() 快很多，实时音频必须这样搞
float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;

  // 线性插值，让精度更高
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

// 伪随机噪声生成（线性同余法，速度快，用于模拟气流声）
float pseudoRandom() {
  noiseSeed = noiseSeed * 1664525UL + 1013904223UL;
  return ((float)(noiseSeed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// 带独立种子的伪随机（用在噗声波形生成里，保证每次声音一致）
float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= 编码器中断：判断旋转方向 =================
void IRAM_ATTR encoderISR() {
  unsigned long nowUs = micros();

  // 去抖：两次中断间隔太短就忽略，防止机械抖动误触发
  if (nowUs - lastEncoderInterruptUs < ENCODER_DEBOUNCE_US) return;
  lastEncoderInterruptUs = nowUs;

  // CLK 下降沿触发，此时读 DT 引脚电平判断方向
  // DT = LOW  → 顺时针 → 减油门
  // DT = HIGH → 逆时针 → 加油门
  int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState == LOW) {
    encoderPosition--;  // 顺时针：减油门
  } else {
    encoderPosition++;  // 逆时针：加油门
  }
}

// ================= 按键中断：按下归零油门 =================
void IRAM_ATTR buttonISR() {
  unsigned long nowMs = millis();
  if (nowMs - lastButtonPressMs < BUTTON_DEBOUNCE_MS) return;
  lastButtonPressMs = nowMs;
  encoderButtonPressed = true;
}

// ================= 初始化编码器引脚和中断 =================
void initEncoder() {
  pinMode(ENCODER_CLK_PIN, INPUT_PULLUP);
  pinMode(ENCODER_DT_PIN,  INPUT_PULLUP);
  pinMode(ENCODER_SW_PIN,  INPUT_PULLUP);

  // CLK 下降沿触发旋转检测
  attachInterrupt(digitalPinToInterrupt(ENCODER_CLK_PIN), encoderISR, FALLING);
  // SW 下降沿触发按键检测（按下时为低电平）
  attachInterrupt(digitalPinToInterrupt(ENCODER_SW_PIN),  buttonISR, FALLING);

  Serial.println("KY-040 编码器初始化完成");
}

// ================= 第三步：预计算正弦波查找表 =================
// 提前算好 2048 个 sin 值存在内存里，播放时直接查表，省 CPU
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

// ================= 初始化 8 个气缸相位偏移 =================
void initCylinderPhases() {
  for (int i = 0; i < NUM_CYLINDERS; i++) {
    // 把角度转换成 0.0～1.0 的相位（720° 对应一个完整燃烧循环）
    cylinderPhase[i] = firingAngles[i] / 720.0f;
  }
}

// ================= 生成单个气缸的排气脉冲波形 =================
// phase 是 0.0～1.0 的当前相位，返回该时刻的振幅
float generateCylinderPulse(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float pulse = 0.0f;

  if (phase < 0.30f) {
    // 前 30%：快速上升，模拟排气门打开的冲击
    float t = phase / 0.30f;
    pulse = sinf(M_PI * t) * expf(-2.2f * t) * 1.35f;
  } else if (phase < 0.50f) {
    // 30%～50%：轻微反弹，模拟管道回压
    float t = (phase - 0.30f) / 0.20f;
    pulse = -0.25f * sinf(M_PI * 2.0f * t) * expf(-5.0f * t);
  }
  // 后 50%：无声，等待下一次排气

  return pulse;
}

// ================= 第四步：预计算噗声波形表 =================
// 把一次完整的"噗"声提前算好存在数组里，播放时直接读取，省 CPU
void buildStraightPipeThumpTable() {
  int attackS  = (int)(THUMP_ATTACK_MS  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(THUMP_BODY_MS    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(THUMP_TAIL_MS    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(THUMP_REBOUND_DELAY_MS * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen  = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;  // 加上回弹余音

  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1   = 0.0f;  // 基频相位
  float phase2   = 0.0f;  // 二次谐波相位
  float phase3   = 0.0f;  // 三次谐波相位
  float phaseSub = 0.0f;  // 次低频相位

  float noiseLP1 = 0.0f;  // 低通滤波器状态 1
  float noiseLP2 = 0.0f;  // 低通滤波器状态 2
  uint32_t seed  = 24681357;

  for (int i = 0; i < totalLen; i++) {

    // --- 计算主包络（起音→主体→衰减）---
    float env1 = 0.0f;

    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;  // 平方让起音更冲
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    // --- 计算回弹包络（延迟一段时间后的小回声）---
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
      env2 *= THUMP_REBOUND_GAIN;  // 回弹比主体小得多
    }

    float env = clampf(env1 + env2, 0.0f, 1.5f);

    // --- 频率随时间下滑（模拟排气压力释放后音调降低）---
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

    // --- 合成音调部分：基频 + 谐波 + 次低频 ---
    float base = fastSin(phase1);
    base = tanhf(base * THUMP_DRIVE);  // 软削波，模拟排气管的非线性失真

    float tonal =
        0.82f          * base
      + THUMP_TONE2_MIX * fastSin(phase2)
      + THUMP_TONE3_MIX * fastSin(phase3)
      + THUMP_SUB_MIX   * fastSin(phaseSub);

    // --- 合成噪声部分：模拟气流冲出的嘶嘶声 ---
    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);   // 两级低通，让噪声更偏低频
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;     // 带通效果

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;  // 后半段气流声减弱

    float air = bandNoise * (THUMP_NOISE_MIX * (0.25f * env + THUMP_BURST_MIX * 0.75f * earlyEnv));

    // --- 混合音调和气流，再做一次非对称软削波 ---
    float sample = tonal * env + air;
    sample += 0.08f * env * env1;  // 轻微的非线性叠加，让声音更有质感

    if (sample > 0.0f) {
      sample = tanhf(sample * 1.15f) * 1.05f;  // 正半周稍微推一点
    } else {
      sample = tanhf(sample * 0.85f);           // 负半周稍微压一点
    }

    sample *= THUMP_TABLE_GAIN;
    thumpTable[i] = clampf(sample, -1.0f, 1.0f);
  }

  thumpTableLen = totalLen;

  Serial.printf("噗声表生成完成，长度=%d samples，约 %d ms\n",
    thumpTableLen,
    (int)((float)thumpTableLen * 1000.0f / SAMPLE_RATE));
}

// ================= 第五步：初始化 I2S 驱动 =================
void initI2S() {
  i2s_config_t i2s_config = {
    .mode                = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate         = SAMPLE_RATE,
    .bits_per_sample     = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format      = I2S_CHANNEL_FMT_RIGHT_LEFT,   // 立体声（左右各一路）
    .communication_format= I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags    = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count       = DMA_BUF_COUNT,
    .dma_buf_len         = DMA_BUF_LEN,
    .use_apll            = false,
    .tx_desc_auto_clear  = true,   // 发送完自动清零，防止杂音
    .fixed_mclk          = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK,
    .ws_io_num    = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num  = I2S_PIN_NO_CHANGE  // 只发不收
  };

  esp_err_t err;

  err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("I2S 驱动安装失败: %d\n", (int)err);
    while (1) delay(100);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("I2S 引脚设置失败: %d\n", (int)err);
    while (1) delay(100);
  }

  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S 初始化完成");
}

// ================= 油门更新（每 20ms 被 throttleTask 调用）=================
void updateThrottle() {

  // 处理按键：按下就把编码器位置和油门一起归零
  if (encoderButtonPressed) {
    encoderButtonPressed = false;
    encoderPosition = 0;
    targetThrottle  = 0.0f;
    Serial.println(">>> 按键按下：油门归零！");
  }

  // 限制编码器位置范围，防止一直转超出 0～满油门区间
  int maxSteps = (int)(1.0f / ENCODER_STEP_SIZE);  // 默认 10 步到满油门

  if (encoderPosition < 0)        encoderPosition = 0;
  if (encoderPosition > maxSteps) encoderPosition = maxSteps;

  // 把步数换算成 0.0～1.0 的油门值
  targetThrottle = clampf((float)encoderPosition * ENCODER_STEP_SIZE, 0.0f, 1.0f);

  // 平滑过渡：每次只走一小步，避免油门突变导致声音咔哒跳变
  throttleValue += (targetThrottle - throttleValue) * ENCODER_SMOOTHING;
  throttleValue  = clampf(throttleValue, 0.0f, 1.0f);

  // 根据油门计算目标转速
  targetRPM = RPM_IDLE + throttleValue * (RPM_MAX - RPM_IDLE);
}

// ================= 音频生成任务（跑在核心 1，最高优先级）=================
void audioTask(void *param) {
  float crankPhase = 0.0f;   // 曲轴相位，推动所有气缸

  float bgLpf    = 0.0f;    // 背景音低通滤波器状态
  float bgHpfIn  = 0.0f;    // 背景音高通滤波器输入
  float bgHpfOut = 0.0f;    // 背景音高通滤波器输出

  int   playPosA = -1;       // 噗声 A 声部当前播放位置（-1 表示未激活）
  int   playPosB = -1;       // 噗声 B 声部（上一次噗声的淡出）
  float gainA    = 1.0f;
  float gainB    = 0.55f;

  int  samplesToNextTrigger = 0;   // 距离下一次触发噗声还有多少个采样点
  bool altToggle = false;          // 交替气缸切换标志

  float thumpLpf  = 0.0f;   // 噗声低通滤波器状态
  float outHpfIn  = 0.0f;   // 输出高通滤波器输入
  float outHpfOut = 0.0f;   // 输出高通滤波器输出

  uint32_t jitterSeed = 987654321;

  unsigned long audioStartMs = millis();

  Serial.println("音频任务启动");

  while (true) {

    // --- 转速平滑跟随（模拟真实引擎惯性）---
    currentRPM += (targetRPM - currentRPM) * RPM_SMOOTHING;

    // 当前转速在 0.0～1.0 范围内的归一化值
    float rpmNorm = clampf((currentRPM - RPM_IDLE) / (RPM_MAX - RPM_IDLE), 0.0f, 1.0f);

    // 曲轴每个采样点的相位增量（四冲程÷2）
    float cycleIncrement = ((currentRPM / 60.0f) / (float)SAMPLE_RATE) / 2.0f;

    // 当前噗声频率
    float thumpHz = THUMP_HZ_IDLE + rpmNorm * (THUMP_HZ_MAX - THUMP_HZ_IDLE);
    currentThumpHz = thumpHz;

    // 音量随转速变化
    float bgGain = BACKGROUND_GAIN_IDLE + rpmNorm * (BACKGROUND_GAIN_MAX - BACKGROUND_GAIN_IDLE);
    float thumpLayerGain = THUMP_LAYER_GAIN_IDLE + rpmNorm * (THUMP_LAYER_GAIN_MAX - THUMP_LAYER_GAIN_IDLE);

    // 低通截止频率随转速提高（高转速时背景音亮一些）
    float bgLpfAlpha = 0.16f + 0.55f * rpmNorm;

    // 启动淡入（防止开机瞬间的爆音）
    float fadeIn = clampf((float)(millis() - audioStartMs) / 1800.0f, 0.0f, 1.0f);

    // --- 逐采样点生成音频 ---
    for (int i = 0; i < DMA_BUF_LEN; i++) {

      // ====================================================
      // 层 1：背景引擎音——8 个气缸的叠加排气脉冲
      // ====================================================
      float bg = 0.0f;

      for (int cyl = 0; cyl < NUM_CYLINDERS; cyl++) {
        float phase = crankPhase - cylinderPhase[cyl];
        while (phase < 0.0f) phase += 1.0f;
        while (phase >= 1.0f) phase -= 1.0f;

        float pulse = generateCylinderPulse(phase);
        float cylGain = (cyl % 2 == 0) ? 1.0f : 0.82f;  // 奇偶气缸稍有差异，更真实
        bg += pulse * cylGain;
      }

      bg /= (float)NUM_CYLINDERS * 0.42f;

      // 加入谐波层（重点放低频，减少高次谐波的嗡嗡感）
      float basePhase  = crankPhase * 4.0f;
      float harmonics  = 0.0f;

      harmonics += fastSin(basePhase)        * 1.00f;
      harmonics += fastSin(basePhase * 0.5f) * 0.60f;   // 半频：加重低沉感
      harmonics += fastSin(basePhase * 1.5f) * 0.28f;
      harmonics += fastSin(basePhase * 2.0f) * (0.25f + 0.10f * rpmNorm);
      harmonics += fastSin(basePhase * 3.0f) * (0.08f + 0.08f * rpmNorm);
      harmonics += fastSin(basePhase * 4.0f) * (0.03f * rpmNorm);  // 4 次谐波是嗡嗡声来源，压很低
      harmonics /= 2.4f;

      bg = bg * 0.55f + harmonics * 0.45f;
      bg = tanhf(bg * (1.05f + rpmNorm * 0.8f));  // 软削波，模拟排气管非线性

      // 加入低频机械噪声（隆隆声，不是嘶嘶声）
      float rumble   = pseudoRandom();
      float rumble2  = pseudoRandom();
      bg += (rumble * 0.6f + rumble2 * 0.4f) * (0.008f + 0.018f * rpmNorm);

      // 低通滤波（让声音更像从排气管里传出来的，闷一点）
      float bgLpfAlpha2 = 0.18f + 0.45f * rpmNorm;
      bgLpf += bgLpfAlpha2 * (bg - bgLpf);
      bg = bgLpf;

      // 轻微高通（去掉直流偏移）
      float bgHp = 0.992f * (bgHpfOut + bg - bgHpfIn);
      bgHpfIn  = bg;
      bgHpfOut = bgHp;
      bg = bg * 0.92f + bgHp * 0.08f;

      bg *= bgGain;

      // ====================================================
      // 层 2：主噗声——改装直排炮筒音效
      // ====================================================

      // 计时到了就触发一次新的噗声
      if (samplesToNextTrigger <= 0) {

        // 把上一次噗声淡出为 B 声部（做尾声交叠）
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.50f;
        }

        playPosA = 0;

        // 奇偶交替：模拟 V8 不同气缸点火的轻微力度差异
        gainA = altToggle ? THUMP_ALT_GAIN : 1.0f;

        // 计算到下一次触发的间隔（加入 Swing 和抖动，让节奏更有律动感）
        float intervalSamples = (float)SAMPLE_RATE / thumpHz;
        float swingFactor = altToggle ? (1.0f - THUMP_SWING) : (1.0f + THUMP_SWING);
        float jitter = 1.0f + localRandSigned(jitterSeed) * 0.025f;

        samplesToNextTrigger = (int)clampf(intervalSamples * swingFactor * jitter, 1.0f, 999999.0f);
        altToggle = !altToggle;
      }

      samplesToNextTrigger--;

      float thump = 0.0f;

      // 读取 A 声部
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) {
          thump += thumpTable[playPosA++] * gainA;
        } else {
          playPosA = -1;
        }
      }

      // 读取 B 声部（上一次噗声的淡出尾音）
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) {
          thump += thumpTable[playPosB++] * gainB;
          gainB *= 0.9992f;  // 缓慢淡出
        } else {
          playPosB = -1;
        }
      }

      // 低通让噗声边缘更圆润，不那么硬
      thumpLpf += 0.58f * (thump - thumpLpf);
      thump = thumpLpf * thumpLayerGain;

      // ====================================================
      // 层 3：混合两层，输出
      // ====================================================
      float sample = bg + thump;

      // 最终输出高通（去掉低频直流漂移）
      float outHp = 0.988f * (outHpfOut + sample - outHpfIn);
      outHpfIn  = sample;
      outHpfOut = outHp;
      sample = sample * 0.86f + outHp * 0.14f;

      // 整体软削波（防止两层叠加时过载爆音）
      sample = tanhf(sample * (1.05f + 0.22f * rpmNorm));

      sample *= MASTER_VOLUME * fadeIn;
      sample  = clampf(sample, -0.98f, 0.98f);

      // 转成 16bit PCM，左右声道相同（单声道喇叭）
      int16_t out = (int16_t)(sample * PCM_OUTPUT_SCALE);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;

      // 推进曲轴相位
      crankPhase += cycleIncrement;
      if (crankPhase >= 1.0f) crankPhase -= 1.0f;
    }

    // 把这一批音频数据写入 I2S DMA，写完再生成下一批
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= 油门任务（跑在核心 0，低优先级）=================
void throttleTask(void *param) {
  while (true) {
    updateThrottle();
    vTaskDelay(pdMS_TO_TICKS(20));  // 每 20ms 更新一次油门，足够流畅
  }
}

// ================= 串口监控任务（跑在核心 0，最低优先级）=================
void monitorTask(void *param) {
  char buf[128];

  while (true) {
    int rpmInt      = (int)(currentRPM + 0.5f);
    int targetInt   = (int)(targetRPM  + 0.5f);
    int throttlePct = (int)(throttleValue * 100.0f + 0.5f);
    int thumpHz10   = (int)(currentThumpHz * 10.0f + 0.5f);

    snprintf(buf, sizeof(buf),
      "RPM=%d  目标=%d  油门=%d%%  编码器=%d  噗频=%d.%dHz",
      rpmInt, targetInt, throttlePct, encoderPosition,
      thumpHz10 / 10, thumpHz10 % 10);

    Serial.println(buf);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

// ================= setup：系统初始化 =================
void setup() {
#if DISABLE_BROWNOUT_FOR_TEST
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  Serial.begin(115200);
  delay(1000);

  // 启动时检查内存状态（如果 PSRAM 是 0，说明没驱动起来，回去改 QSPI）
  Serial.printf("片上 SRAM 剩余: %d 字节\n", ESP.getFreeHeap());
  Serial.printf("外挂 PSRAM 剩余: %d 字节\n", ESP.getFreePsram());

  Serial.println("====================================");
  Serial.println("ESP32-S3 V8 声浪模拟器");
  Serial.println("主噗声：改装直排炮筒");
  Serial.println("油门控制：KY-040 旋转编码器");
  Serial.println("====================================");

  initEncoder();
  initSineTable();
  initCylinderPhases();
  buildStraightPipeThumpTable();
  initI2S();

  // 音频任务：核心 1，最高优先级，12KB 栈
  xTaskCreatePinnedToCore(audioTask,    "AudioTask", 12288, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  // 油门任务：核心 0，优先级 2，3KB 栈
  xTaskCreatePinnedToCore(throttleTask, "Throttle",  3072,  NULL, 2,                        NULL, 0);
  // 监控任务：核心 0，最低优先级，4KB 栈（别给太小，不然栈溢出）
  xTaskCreatePinnedToCore(monitorTask,  "Monitor",   4096,  NULL, 1,                        NULL, 0);

  Serial.println("系统启动完成，旋转编码器控制油门，按下归零");
}

// loop 基本闲置，所有活都交给 FreeRTOS 任务了
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

### 代码说明

整个程序由三个并行任务组成，用 FreeRTOS 调度，互不干扰：

| 任务 | 跑在哪个核心 | 优先级 | 干什么 |
|------|------------|--------|--------|
| `audioTask` | 核心 1 | 最高 | 逐采样点合成音频，写入 I2S DMA |
| `throttleTask` | 核心 0 | 中 | 每 20ms 读一次编码器，更新油门 |
| `monitorTask` | 核心 0 | 最低 | 每 700ms 串口打印一次状态 |

**声音合成的核心逻辑分三层：**

**第一层：背景引擎音。** 8 个气缸各自维护一个相位，每个气缸按照 V8 的点火角度（0°、90°、150°……450°）依次触发排气脉冲波形。8 个气缸的输出叠加在一起，就是那种连续的低沉隆隆声。在气缸脉冲的基础上，再叠加基频和几次谐波，增加引擎音的层次感。

**第二层：主噗声。** 每隔一段时间（由 `thumpHz` 决定频率），就从预计算好的噗声波形表里读取一次完整的"噗"声播放出来。噗声本身是起音→主体→衰减三段包络，加上频率下滑（模拟排气压力释放）和回弹延迟（模拟管道共振），听起来像改装直排的炮筒声。

**第三层：混合输出。** 两层叠加后，过一个整体软削波防止爆音，再乘以淡入系数（防止开机瞬间爆音），最后写成 16bit 立体声 PCM 送进 I2S。



## 噗声样本调试工具（可选）

为了方便快速找到适合的排气声，我另外做了一版串口轮播测试代码：内置 30 套预设参数，用串口命令切换，能直接对比哪种"噗"声最对你的胃口。主程序里最终用的是编号 23 的「改装直排炮筒」。

```c
/*
 * ESP32-S3 + MAX98357A
 * 噗声样本轮播测试器 V2
 * 30个样本 + 音量大幅提升
 *
 * 接线：
 *   BCLK -> GPIO16
 *   LRC  -> GPIO17
 *   DIN  -> GPIO15
 *
 * 串口命令（115200）：
 *   n     下一个
 *   p     上一个
 *   r     重播
 *   s     停止自动轮播
 *   a     开启自动轮播
 *   b     开/关背景底层
 *   1~30  跳到对应编号
 *   h     帮助
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

// ================= 样本参数结构 =================
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
  {"02 更圆润绵密",               14,  75, 130,  52,  40,  32,  0.12, 0.18, 0.04, 0.32, 1.5, 0.10, 50, 0.18, 1.00, 0.00, 2.9, 0.16},
  {"03 小喇叭增强A",               7,  42,  65, 100,  80,  65,  0.16, 0.30, 0.14, 0.06, 1.6, 0.16, 32, 0.14, 1.00, 0.00, 2.6, 0.12},
  {"04 小喇叭增强B",               5,  35,  55, 120,  95,  78,  0.14, 0.36, 0.20, 0.04, 1.7, 0.12, 26, 0.12, 1.00, 0.00, 2.5, 0.10},
  {"05 美式V8怠速",                9,  55,  95,  72,  56,  44,  0.22, 0.26, 0.10, 0.14, 1.8, 0.24, 42, 0.30, 0.80, 0.20, 2.7, 0.22},
  {"06 更咕噜不均匀",             11,  58, 105,  68,  52,  42,  0.24, 0.22, 0.08, 0.18, 1.8, 0.22, 54, 0.38, 0.72, 0.26, 2.8, 0.24},
  {"07 回压明显双噗",              8,  48,  85,  80,  62,  48,  0.20, 0.26, 0.12, 0.12, 1.7, 0.20, 58, 0.48, 0.88, 0.14, 2.6, 0.18},
  {"08 粗糙炸裂",                  6,  40,  68,  90,  72,  56,  0.28, 0.32, 0.16, 0.08, 2.2, 0.32, 34, 0.22, 0.90, 0.10, 2.5, 0.15},
  {"09 极厚极闷",                 16,  85, 150,  48,  38,  30,  0.08, 0.14, 0.02, 0.36, 1.6, 0.06, 58, 0.20, 1.00, 0.00, 3.0, 0.14},
  {"10 短促有力Punch",             4,  28,  45, 100,  78,  60,  0.14, 0.38, 0.20, 0.04, 1.8, 0.12, 22, 0.10, 1.00, 0.00, 2.4, 0.10},
  {"11 沙哑排气管",                8,  50,  88,  82,  64,  50,  0.32, 0.24, 0.10, 0.10, 1.9, 0.34, 40, 0.26, 0.86, 0.12, 2.6, 0.16},
  {"12 低频重炮",                 13,  68, 115,  58,  46,  36,  0.14, 0.20, 0.06, 0.30, 1.8, 0.14, 48, 0.26, 1.00, 0.00, 2.9, 0.20},
  {"13 中频Punch干脆",             6,  36,  58, 130, 100,  78,  0.10, 0.40, 0.24, 0.02, 1.6, 0.08, 28, 0.10, 1.00, 0.00, 2.4, 0.08},
  {"14 双脉冲咕咕",                7,  44,  78,  85,  66,  52,  0.18, 0.28, 0.14, 0.10, 1.8, 0.20, 20, 0.45, 0.82, 0.18, 2.6, 0.16},
  {"15 旧V8松散感",               10,  60, 108,  72,  55,  44,  0.24, 0.22, 0.08, 0.16, 1.7, 0.20, 52, 0.32, 0.68, 0.30, 2.7, 0.22},
  {"16 超厚测试",                 15,  95, 160,  54,  42,  32,  0.06, 0.14, 0.02, 0.38, 1.6, 0.04, 64, 0.18, 1.00, 0.00, 3.2, 0.12},
  {"17 哈雷摩托风格",              8,  52,  90,  78,  58,  46,  0.26, 0.24, 0.10, 0.16, 1.9, 0.26, 48, 0.35, 0.65, 0.32, 2.8, 0.25},
  {"18 跑车高转锐利",              4,  30,  50, 140, 110,  88,  0.12, 0.42, 0.28, 0.02, 1.8, 0.10, 20, 0.08, 1.00, 0.00, 2.3, 0.08},
  {"19 柴油机突突",               14,  48,  80,  65,  50,  42,  0.30, 0.18, 0.06, 0.20, 2.0, 0.28, 38, 0.40, 0.75, 0.22, 2.7, 0.20},
  {"20 大排量巡航舰",             12,  72, 125,  60,  45,  36,  0.16, 0.20, 0.06, 0.34, 1.7, 0.12, 55, 0.24, 1.00, 0.00, 3.0, 0.18},
  {"21 超粗暴爆裂",                3,  25,  40, 110,  85,  68,  0.35, 0.34, 0.18, 0.06, 2.5, 0.40, 18, 0.15, 0.92, 0.08, 2.4, 0.12},
  {"22 温柔大排量",               16,  90, 140,  50,  40,  34,  0.10, 0.16, 0.04, 0.30, 1.4, 0.06, 60, 0.16, 1.00, 0.00, 3.0, 0.10},
  {"23 改装直排炮筒",              5,  38,  62, 105,  82,  64,  0.22, 0.30, 0.16, 0.08, 2.1, 0.28, 30, 0.18, 0.94, 0.06, 2.5, 0.14},
  {"24 低沉+强回压",              10,  58,  95,  65,  50,  40,  0.18, 0.22, 0.08, 0.22, 1.8, 0.16, 65, 0.52, 0.85, 0.16, 2.8, 0.20},
  {"25 气流爆发型",                6,  35,  55,  88,  68,  52,  0.38, 0.20, 0.08, 0.10, 1.7, 0.45, 28, 0.14, 1.00, 0.00, 2.5, 0.12},
  {"26 三缸突突感",               10,  45,  75,  74,  58,  46,  0.20, 0.22, 0.10, 0.14, 1.8, 0.20, 36, 0.30, 0.60, 0.35, 2.6, 0.18},
  {"27 超低音炮测试",             18, 100, 180,  42,  32,  26,  0.06, 0.12, 0.02, 0.42, 1.5, 0.04, 70, 0.20, 1.00, 0.00, 3.4, 0.08},
  {"28 拳拳到肉型",                5,  32,  48,  95,  75,  58,  0.16, 0.34, 0.18, 0.06, 2.0, 0.16, 24, 0.12, 1.00, 0.00, 2.6, 0.10},
  {"29 全频轰鸣",                  8,  55,  90,  85,  65,  50,  0.20, 0.28, 0.14, 0.18, 1.9, 0.22, 42, 0.28, 0.88, 0.12, 2.8, 0.20},
  {"30 极端对比测试",              3,  20,  35, 150, 120,  90,  0.40, 0.44, 0.28, 0.02, 2.4, 0.45, 16, 0.08, 1.00, 0.00, 2.2, 0.06},
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

// ================= 构建波形表 =================
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
  Serial.println("===== 命令 =====");
  Serial.println("n     下一个");
  Serial.println("p     上一个");
  Serial.println("r     重播");
  Serial.println("s     停止自动轮播");
  Serial.println("a     开启自动轮播");
  Serial.println("b     开/关背景");
  Serial.println("1~30  跳到编号");
  Serial.println("h     帮助");
  Serial.println("================");
}

void printPresetInfo(int idx) {
  Serial.println();
  Serial.println("========================================");
  Serial.print("样本 #");
  Serial.print(idx + 1);
  Serial.print(" / ");
  Serial.println(NUM_PRESETS);
  Serial.println(presets[idx].name);
  Serial.print("前2.5秒慢噗 后2.5秒快噗 背景:");
  Serial.println(backgroundEnabled ? "开" : "关");
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
  if (cmd == "s") { autoPlay = false; Serial.println("自动轮播已停止"); return; }
  if (cmd == "a") { autoPlay = true; lastSwitchMs = millis(); Serial.println("自动轮播已开启"); return; }
  if (cmd == "b") { backgroundEnabled = !backgroundEnabled; Serial.print("背景: "); Serial.println(backgroundEnabled ? "开" : "关"); return; }
  if (cmd == "h") { showHelp(); return; }

  int n = cmd.toInt();
  if (n >= 1 && n <= NUM_PRESETS) { requestPreset(n - 1); return; }

  Serial.print("未知: ");
  Serial.println(cmd);
}

// ================= 音频任务 =================
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

      // ★ 关键：最终输出增益大幅提升
      sample *= 1.8f;

      sample = tanhf(sample * 1.1f);
      sample = clampf(sample, -0.98f, 0.98f);

      // ★ 满量程输出
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
  Serial.println("噗声样本轮播测试器 V2");
  Serial.println("30个样本 + 大音量版");
  Serial.println("====================================");

  initSineTable();
  initI2S();
  showHelp();
  requestPreset(0);

  xTaskCreatePinnedToCore(audioTask, "Audio", 10240, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  Serial.println("开始播放...");
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

## 常见问题排查

别慌，90% 的问题出在这几个地方，对着查一遍基本能搞定：

**通电后喇叭完全没声音**

先查 SD 引脚。MAX98357A 的 SD 引脚如果被意外拉低（比如碰到 GND，或者没有浮空），模块会进入静音模式。把 SD 引脚悬空或接 3.3V，重新上电试试。接着用串口监控确认 I2S 初始化有没有报错，打印里有没有"I2S 驱动安装失败"的字样。

**声音很小，几乎听不见**

先确认喇叭阻抗。MAX98357A 接 4Ω 喇叭能输出 3W，接 8Ω 喇叭只有约 1.4W，音量差一倍。其次检查 VIN 是不是接的 5V，接 3.3V 功率会大幅下降。还可以把代码里的 `PCM_OUTPUT_SCALE` 从 26000 调高到 30000，但别超过 32767，超了会溢出失真。

**编码器旋转方向反了（顺时针减、逆时针加）**

在 `encoderISR()` 里把 `encoderPosition++` 和 `encoderPosition--` 对调，或者直接把 CLK 和 DT 的物理接线对调，二选一。

**开机就立刻崩溃重启，串口显示 `Stack canary watchpoint triggered`**

这是某个 FreeRTOS 任务的栈溢出了，错误信息里会显示任务名字（比如 `Monitor`）。找到对应任务，把 `xTaskCreatePinnedToCore` 里的栈大小（第三个数字）调大，Monitor 任务至少给 4096，不够就给 8192。

**串口显示 `OOM: failed to allocate XXX bytes`**

内存溢出。按以下顺序检查：

1. Arduino IDE 的 **工具 → PSRAM** 有没有选上，必须选 **QSPI PSRAM**（不是 OPI）
2. 在 `setup()` 开头加 `Serial.printf("PSRAM: %d\n", ESP.getFreePsram());`，重烧后看串口，如果打印出来是 0，说明 PSRAM 没驱动起来，回去改选项
3. 确认你的开发板型号有外挂 PSRAM（ESP32-S3-WROOM-1-**N16R8** 的 R8 就代表 8MB PSRAM）

**声音有规律的爆音或者杂音**

多半是共地问题。ESP32-S3 的 GND 和 MAX98357A 的 GND 要连在同一根线上，不能分开接两个不同的电源地。用万用表量一下两个 GND 之间的阻值，应该接近 0Ω。

---

## FAQ

**Q：ESP32-S3 的 GPIO16/17/15 被占用了，可以换成其他引脚吗？**
A：可以，I2S 引脚可以自由映射到任意 GPIO。把代码顶部的 `I2S_BCLK`、`I2S_LRC`、`I2S_DOUT` 三个宏改成你想用的引脚号就行。但注意 GPIO 0、1、2、3、43、44 有特殊用途，建议避开。

**Q：可以接两个喇叭做立体声吗？**
A：MAX98357A 是单声道功放，要做立体声需要两块模块，一块接左声道、一块接右声道，通过 GAIN 引脚的接法区分（一块接 GND = 右声道，一块悬空 = 左声道）。代码里两路 PCM 数据目前是一样的（`stereoBuffer[i*2] = stereoBuffer[i*2+1] = out`），如果想真立体声还需要修改合成逻辑。

**Q：采样率 22050Hz 够用吗？能改成 44100Hz 吗？**
A：22050Hz 对于引擎声这类中低频内容完全够用，最高能还原 11025Hz 的音频，人耳对引擎声的感知主要在 50Hz～4kHz 之间。改成 44100Hz 理论上可以，但 CPU 负担翻倍，建议测试时先确认稳定，同步修改 `SAMPLE_RATE` 和 I2S 配置里的 `sample_rate`。

**Q：连接 5V 电源会不会烧掉 ESP32-S3？**
A：MAX98357A 的 VIN 接 5V，但它的信号引脚（BCLK、LRC、DIN）是 3.3V 电平，可以直接和 ESP32-S3 的 GPIO 连接，不需要电平转换。ESP32-S3 的 GPIO 能输出 3.3V，MAX98357A 能识别，安全的。

**Q：怠速时声音太小，听不清楚，能调大吗？**
A：调 `BACKGROUND_GAIN_IDLE`（默认 0.45）和 `THUMP_LAYER_GAIN_IDLE`（默认 0.75），两个都往上加，比如改成 0.6 和 1.0，怠速音量会明显提升。调完记得测试满油门时有没有爆音，有的话把 `PCM_OUTPUT_SCALE` 稍微降一点点。

**Q：KY-040 编码器转一格油门变化 10%，太大了，能细一点吗？**
A：把 `ENCODER_STEP_SIZE` 从 0.1 改小，比如改成 0.05，就变成每格 5%，需要转 20 格才能到满油门，手感更细腻。

**Q：程序能在 ESP32（非 S3）上运行吗？**
A：理论上兼容，I2S API 是通用的，但普通 ESP32 没有外挂 PSRAM 或 PSRAM 较小，运行这个项目可能内存不够。建议至少用带 PSRAM 的型号，比如 ESP32-WROVER。GPIO 编号也需要根据你的板子重新映射。

---

## 延伸玩法

玩完基础版，还可以往这几个方向扩展：

- **接速度传感器**：把霍尔传感器装在车轮上，车速越快油门自动越大，解放双手
- **换成 V6 / 直四 / 摩托音效**：修改 `NUM_CYLINDERS` 和 `firingAngles`，换一套点火角度就是另一种引擎
- **加 TFT 屏幕**：显示当前转速表和油门百分比，装仪表盘既视感
- **加外壳防水**：装在电动车上用，下雨天还是要做好防水的，不然电路进水比没声音更麻烦

---

## 参考资料

- [MAX98357A 数据手册（Analog Devices）](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [MAX98357A 产品页（Analog Devices）](https://www.analog.com/en/products/max98357a.html)
- [ESP32-S3 技术参考手册（Espressif）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3-WROOM-1 产品页（Espressif）](https://www.espressif.com/en/products/modules/esp32-s3)
- [ESP32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)
- [FreeRTOS 任务创建 API 文档](https://www.freertos.org/a00125.html)
