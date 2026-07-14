---
title: "ESP32-S3 + MAX98357A: Build a V8 Engine Sound Simulator (I2S Digital Audio + KY-040 Rotary Encoder Throttle Control)"
boardId: esp32s3
moduleId: audio/max98357a
moduleIds:
  - audio/max98357a
  - sensor/ky-040
category: esp32
date: 2026-07-14
intro: "Drive a MAX98357A amplifier module with an ESP32-S3 and a KY-040 rotary encoder to synthesize a V8 engine sound purely in code — throttle is controlled manually by the encoder, and the sound is output through a speaker in real time. Includes full wiring, code, and gotchas."
image: "https://img.lingflux.com/2026/07/6c72c55fa63614eb8c2086c24d993d5f.jpg"
---

> **TL;DR (Quick start):**
>
> 1. Wiring: MAX98357A BCLK → GPIO16, LRC → GPIO17, DIN → GPIO15; KY-040 CLK → GPIO5, DT → GPIO6, SW → GPIO7
> 2. Select the **ESP32S3 Dev Module** board and set PSRAM to **QSPI PSRAM** (pick the wrong one and you'll OOM — don't ask me how I know)
> 3. Clockwise rotation = throttle down, counter-clockwise = throttle up, press = return to idle
> 4. Flash, power up, and enjoy your "V8 electric vehicle"

---

Difficulty: ⭐⭐⭐☆☆ (requires basic Arduino wiring and flashing skills)
Estimated time: 45 minutes
Test environment: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + ESP32-S3-WROOM-1-N16R8 (16MB Flash + 8MB PSRAM)

---

## Preface

Anyone who has ever ridden an e-bike knows the awkwardness: you glide up silently behind a pedestrian, scare them half to death, and get a "why don't you make any noise" look — and all you can do is offer an embarrassed smile, because your bike is, well… silent.

Electric vehicles save fuel and are eco-friendly, but they have one headache: they're too quiet. So quiet they float down the road like a ghost.

So I got to thinking: since we can't rely on the motor to make noise, what if we **synthesized a sound** ourselves? Not that cheap "beep beep" from a piezo buzzer, but… a V8 engine roar? Deep, powerful, the kind that thunders when you step on it.

The goal of this article: use an **ESP32-S3 + MAX98357A amplifier module + KY-040 rotary encoder** to synthesize a V8 engine sound entirely in code. Throttle is controlled manually by the encoder, and the sound is output through a speaker in real time. No samples, no audio files — the engine sound is generated entirely by real-time math.



---

## Result

Rotate the KY-040 encoder to open the throttle, and the speaker will transition smoothly from a low idle rumble to a high-rev engine roar; press the encoder button and the throttle instantly drops to zero, returning to idle. The whole sound transition is smooth, with no abrupt jumps, and actually sounds pretty convincing.



---

## Component Notes

> The dev board (ESP32-S3) needs no introduction; the focus here is on the other two leads.

### MAX98357A — The Digital Signal Interpreter

Imagine you have a digital recording (a string of 0s and 1s), but the speaker only understands analog signals (voltage changes). The MAX98357A is the **simultaneous interpreter** between the two: it takes the digital audio sent by the ESP32-S3 via the I2S protocol and converts it in real time into an analog current that can drive a speaker. It has a built-in 3W amplifier, so you don't need any extra amplification circuitry.

| Parameter | Value |
|-----------|-------|
| Supply voltage | 2.5V ~ 5.5V |
| Output power | 3.2W (4Ω load, 5V supply) |
| Sample rate support | 8kHz ~ 96kHz |
| Communication protocol | I2S |
| Gain options | 3dB / 6dB / 9dB / 12dB / 15dB |
| Mute control | Pull SD pin low to mute |

The reason to pick it is simple: **direct I2S connection, filter-free, modular package, 3W is plenty for a bike**, and you can grab one for under ten RMB on Taobao.

### Pinout

| Pin label | Function |
|-----------|----------|
| VIN | Power positive, connect to 5V |
| GND | Power ground |
| BCLK | I2S bit clock |
| LRC | I2S word clock (left/right channel select) |
| DIN | I2S digital audio data input |
| SD | Mute control, floating or tied high = normal operation, pulled low = mute |
| GAIN | Gain select, floating = 9dB by default |

> **Note**: The SD pin works whether left floating or tied to 3.3V; if your wiring looks fine but there's no sound, first check whether the SD pin has been accidentally pulled low.

---

### KY-040 — The Infinite-Rotation "Volume Knob"

A regular potentiometer hits a hard stop when you turn it all the way. The KY-040 is a 360° infinite-rotation encoder — it doesn't output an absolute position, it tells you "which direction and how many notches you turned." In this project I use it to control the throttle: **clockwise = throttle down, counter-clockwise = throttle up, press the button = return to idle**. It feels like turning a real throttle knob.

| Parameter | Value |
|-----------|-------|
| Operating voltage | 3.3V ~ 5V |
| Steps per revolution | 20 steps |
| Output signals | Phase A (CLK) / Phase B (DT) / Button (SW) |
| Interface type | Digital GPIO (with internal pull-up) |

Why pick it: **cheap, ubiquitous, and the button is a bonus**. It's interrupt-driven so it barely touches the CPU, and paired with a FreeRTOS task architecture it's totally stress-free.

### Pinout

| Pin label | Function |
|-----------|----------|
| CLK (Phase A) | Encoder phase A output, connect to an interrupt pin |
| DT (Phase B) | Encoder phase B output, used to determine rotation direction |
| SW | Button output, low when pressed |
| + | Power positive, connect to 3.3V |
| GND | Power ground |

---

## BOM

| Component | Model / Spec | Qty | Notes |
|-----------|--------------|-----|-------|
| Main dev board | ESP32-S3-WROOM-1-N16R8 | 1 | 16MB Flash + 8MB PSRAM, PSRAM is mandatory |
| I2S amplifier module | MAX98357A | 1 | Includes carrier board, solder-free version is more convenient |
| Rotary encoder module | KY-040 | 1 | With button |
| Small speaker | 4Ω 3W | 1 | Or 8Ω, volume will be slightly lower |
| Dupont wires | Male-to-male / male-to-female | several | For wiring |
| Breadboard | any | 1 | Optional, makes fixing the wiring easier |

---

## Wiring

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

> A good habit: after wiring each pin, tick it off in the table one by one. This alone saves 80% of debugging time. GND in particular — sharing a common ground across modules is the prerequisite for clean audio. When everyone speaks the same language, the signal gets through cleanly.

---

## Libraries to Install

This project **does not depend on any third-party audio library**. All audio is synthesized in real time by the code, using only the `driver/i2s.h` that ships with the ESP32 Arduino Core.

You just need to confirm the following environment in the Arduino IDE:

| Item | Requirement |
|------|-------------|
| Arduino IDE | 2.3.8 (tested OK) |
| ESP32 Arduino Core | 3.3.10 (search `esp32` in Board Manager to install) |
| Board option | ESP32S3 Dev Module |
| **PSRAM option** | **QSPI PSRAM** (picking the wrong one causes instant OOM — see the gotchas section) |
| Flash Size | 16MB |
| Upload Speed | 921600 |

In the Arduino IDE **Tools** menu, check each line against the table above, especially the PSRAM row.

---

## Full Code + Walkthrough

```cpp
/*
 * ESP32-S3 + MAX98357A + KY-040 rotary encoder
 * V8 engine sound simulator
 *
 * Wiring:
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
 *   SW        -> GPIO7  (press to zero the throttle)
 *   +         -> 3.3V
 *   GND       -> GND
 *
 * Operation:
 *   Clockwise rotation  = throttle down
 *   Counter-clockwise   = throttle up
 *   Press encoder       = zero throttle (return to idle)
 *
 * Serial baud rate: 115200
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// -----------------------------------------------
// If you hit a Brownout brownout-reset, change this to 1 for temporary testing
// For normal use, keep it at 0; leaving undervoltage protection disabled long-term is not recommended
// -----------------------------------------------
#define DISABLE_BROWNOUT_FOR_TEST 0

#if DISABLE_BROWNOUT_FOR_TEST
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

// ================= Step 1: I2S pin definitions =================
#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

// ================= Step 2: KY-040 pin definitions =================
#define ENCODER_CLK_PIN   5
#define ENCODER_DT_PIN    6
#define ENCODER_SW_PIN    7

// ================= Encoder throttle parameters =================
// Throttle change per detent (range 0.0~1.0)
// Smaller value = more detents needed to reach full throttle, finer feel
#define ENCODER_STEP_SIZE     0.1f

// Throttle smoothing coefficient (larger = faster response, smaller = silkier transition)
#define ENCODER_SMOOTHING     1.2f

// Encoder debounce time (microseconds), prevents one rotation from being misread as multiple
#define ENCODER_DEBOUNCE_US   200

// Button debounce time (milliseconds)
#define BUTTON_DEBOUNCE_MS    200

// ================= Basic audio parameters =================
#define SAMPLE_RATE     22050   // Sample rate, in Hz
#define DMA_BUF_COUNT   8       // Number of DMA buffers
#define DMA_BUF_LEN     256     // Samples per DMA buffer

// ================= Engine RPM parameters =================
#define RPM_IDLE        800.0f    // Idle RPM
#define RPM_MAX         8000.0f   // Maximum RPM
#define RPM_SMOOTHING   0.006f    // RPM change smoothing coefficient, smaller = more like a real engine
#define NUM_CYLINDERS   8         // V8 = 8 cylinders

// ================= Exhaust thump rhythm =================
// At idle: 2 thumps per second; at max RPM: 7.6 thumps per second
#define THUMP_HZ_IDLE   2.0f
#define THUMP_HZ_MAX    7.6f

// ================= Volume parameters =================
#define MASTER_VOLUME       1.00f
#define PCM_OUTPUT_SCALE    26000.0f   // Final scale factor into 16-bit PCM

// Background engine volume (idle / max)
#define BACKGROUND_GAIN_IDLE  0.45f
#define BACKGROUND_GAIN_MAX   0.60f

// Main thump layer volume (idle / max)
#define THUMP_LAYER_GAIN_IDLE 0.75f
#define THUMP_LAYER_GAIN_MAX  1.05f

// ================= Modified straight-pipe cannon thump parameters =================
// The following parameters shape each exhaust thump; tweak with care
#define THUMP_ATTACK_MS       5.0f    // Attack time (ms)
#define THUMP_BODY_MS         38.0f   // Body duration (ms)
#define THUMP_TAIL_MS         62.0f   // Tail decay time (ms)

#define THUMP_F_START         105.0f  // Thump start frequency (Hz)
#define THUMP_F_BODY          82.0f   // Body frequency (Hz)
#define THUMP_F_END           64.0f   // Tail frequency (Hz)

#define THUMP_NOISE_MIX       0.22f   // Noise mix ratio (simulates exhaust airflow)
#define THUMP_TONE2_MIX       0.30f   // Second harmonic ratio
#define THUMP_TONE3_MIX       0.16f   // Third harmonic ratio
#define THUMP_SUB_MIX         0.08f   // Sub-bass ratio (adds deep weight)

#define THUMP_DRIVE           2.10f   // Waveform saturation (tanh soft-clip strength)
#define THUMP_BURST_MIX       0.28f   // Burst-phase airflow noise ratio

#define THUMP_REBOUND_DELAY_MS 30.0f  // Exhaust rebound delay (ms), simulates pipe resonance
#define THUMP_REBOUND_GAIN     0.18f  // Rebound gain

#define THUMP_ALT_GAIN         0.94f  // Alternating-cylinder gain difference, simulates uneven firing
#define THUMP_SWING            0.06f  // Rhythm swing amount, adds groove

#define THUMP_TABLE_GAIN       2.50f  // Overall thump wavetable gain

// ================= Lookup table definitions =================
#define SINE_TABLE_SIZE 2048     // Sine lookup table size (larger = higher precision, more memory)
#define THUMP_TABLE_MAX 8000     // Max samples in the thump wavetable

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

// Stereo output buffer (DMA_BUF_LEN samples each for left and right)
static int16_t stereoBuffer[DMA_BUF_LEN * 2];

// ================= Global state variables =================
volatile float throttleValue  = 0.0f;   // Current smoothed throttle (0.0~1.0)
volatile float targetThrottle = 0.0f;   // Target throttle set by the encoder
volatile float targetRPM      = RPM_IDLE;
volatile float currentRPM     = RPM_IDLE;
volatile float currentThumpHz = THUMP_HZ_IDLE;

uint32_t noiseSeed = 123456789;

// V8 cylinder phase offset table (simulates 90° evenly-spaced firing)
float cylinderPhase[NUM_CYLINDERS];

const float firingAngles[NUM_CYLINDERS] = {
  0.0f, 90.0f, 150.0f, 210.0f,
  270.0f, 330.0f, 390.0f, 450.0f
};

// ================= Encoder interrupt variables =================
volatile int encoderPosition = 0;
volatile unsigned long lastEncoderInterruptUs = 0;
volatile bool encoderButtonPressed = false;
volatile unsigned long lastButtonPressMs = 0;

// ================= Utility functions =================

// Numeric clamp
static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// Smoothstep for silkier transitions (S-shaped curve)
static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

// Fast sin via lookup table — much faster than sinf(), a must for real-time audio
float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;

  // Linear interpolation for higher precision
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

// Pseudo-random noise (linear congruential, fast, used to simulate airflow)
float pseudoRandom() {
  noiseSeed = noiseSeed * 1664525UL + 1013904223UL;
  return ((float)(noiseSeed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// Seeded pseudo-random (used in thump wavetable generation so the sound is consistent each time)
float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= Encoder interrupt: determine rotation direction =================
void IRAM_ATTR encoderISR() {
  unsigned long nowUs = micros();

  // Debounce: ignore interrupts that come too close together, prevents mechanical bounce misfires
  if (nowUs - lastEncoderInterruptUs < ENCODER_DEBOUNCE_US) return;
  lastEncoderInterruptUs = nowUs;

  // Triggered on CLK falling edge; read the DT pin level to determine direction
  // DT = LOW  -> clockwise  -> throttle down
  // DT = HIGH -> counter-clockwise -> throttle up
  int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState == LOW) {
    encoderPosition--;  // Clockwise: throttle down
  } else {
    encoderPosition++;  // Counter-clockwise: throttle up
  }
}

// ================= Button interrupt: press to zero the throttle =================
void IRAM_ATTR buttonISR() {
  unsigned long nowMs = millis();
  if (nowMs - lastButtonPressMs < BUTTON_DEBOUNCE_MS) return;
  lastButtonPressMs = nowMs;
  encoderButtonPressed = true;
}

// ================= Initialize encoder pins and interrupts =================
void initEncoder() {
  pinMode(ENCODER_CLK_PIN, INPUT_PULLUP);
  pinMode(ENCODER_DT_PIN,  INPUT_PULLUP);
  pinMode(ENCODER_SW_PIN,  INPUT_PULLUP);

  // Rotation detection on CLK falling edge
  attachInterrupt(digitalPinToInterrupt(ENCODER_CLK_PIN), encoderISR, FALLING);
  // Button detection on SW falling edge (low when pressed)
  attachInterrupt(digitalPinToInterrupt(ENCODER_SW_PIN),  buttonISR, FALLING);

  Serial.println("KY-040 encoder initialized");
}

// ================= Step 3: Precompute the sine lookup table =================
// Precompute 2048 sin values into memory; at playback time just look them up — saves CPU
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

// ================= Initialize the 8 cylinder phase offsets =================
void initCylinderPhases() {
  for (int i = 0; i < NUM_CYLINDERS; i++) {
    // Convert angle to a 0.0~1.0 phase (720° corresponds to one complete combustion cycle)
    cylinderPhase[i] = firingAngles[i] / 720.0f;
  }
}

// ================= Generate a single cylinder's exhaust pulse waveform =================
// phase is the current 0.0~1.0 phase; returns the amplitude at this moment
float generateCylinderPulse(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float pulse = 0.0f;

  if (phase < 0.30f) {
    // First 30%: fast rise, simulates the impact of the exhaust valve opening
    float t = phase / 0.30f;
    pulse = sinf(M_PI * t) * expf(-2.2f * t) * 1.35f;
  } else if (phase < 0.50f) {
    // 30%~50%: slight rebound, simulates pipe backpressure
    float t = (phase - 0.30f) / 0.20f;
    pulse = -0.25f * sinf(M_PI * 2.0f * t) * expf(-5.0f * t);
  }
  // Last 50%: silent, waiting for the next exhaust event

  return pulse;
}

// ================= Step 4: Precompute the thump wavetable =================
// Precompute a complete "thump" into an array; at playback time just read it back — saves CPU
void buildStraightPipeThumpTable() {
  int attackS  = (int)(THUMP_ATTACK_MS  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(THUMP_BODY_MS    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(THUMP_TAIL_MS    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(THUMP_REBOUND_DELAY_MS * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen  = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;  // plus rebound tail

  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1   = 0.0f;  // Fundamental phase
  float phase2   = 0.0f;  // 2nd harmonic phase
  float phase3   = 0.0f;  // 3rd harmonic phase
  float phaseSub = 0.0f;  // Sub-bass phase

  float noiseLP1 = 0.0f;  // Low-pass filter state 1
  float noiseLP2 = 0.0f;  // Low-pass filter state 2
  uint32_t seed  = 24681357;

  for (int i = 0; i < totalLen; i++) {

    // --- Main envelope (attack -> body -> decay) ---
    float env1 = 0.0f;

    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;  // Square it for a punchier attack
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    // --- Rebound envelope (a small echo after a delay) ---
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
      env2 *= THUMP_REBOUND_GAIN;  // Rebound is much smaller than the body
    }

    float env = clampf(env1 + env2, 0.0f, 1.5f);

    // --- Frequency slides down over time (simulates pitch dropping as exhaust pressure releases) ---
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

    // --- Synthesize the tonal part: fundamental + harmonics + sub-bass ---
    float base = fastSin(phase1);
    base = tanhf(base * THUMP_DRIVE);  // Soft clip, simulates exhaust-pipe nonlinear distortion

    float tonal =
        0.82f          * base
      + THUMP_TONE2_MIX * fastSin(phase2)
      + THUMP_TONE3_MIX * fastSin(phase3)
      + THUMP_SUB_MIX   * fastSin(phaseSub);

    // --- Synthesize the noise part: simulates the hiss of rushing air ---
    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);   // Two-stage low-pass, pushes noise toward lower frequencies
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;     // Band-pass effect

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;  // Airflow tapers off in the second half

    float air = bandNoise * (THUMP_NOISE_MIX * (0.25f * env + THUMP_BURST_MIX * 0.75f * earlyEnv));

    // --- Mix tonal and airflow, then apply another asymmetric soft-clip ---
    float sample = tonal * env + air;
    sample += 0.08f * env * env1;  // Slight nonlinear layering for more texture

    if (sample > 0.0f) {
      sample = tanhf(sample * 1.15f) * 1.05f;  // Push the positive half a bit
    } else {
      sample = tanhf(sample * 0.85f);           // Compress the negative half a bit
    }

    sample *= THUMP_TABLE_GAIN;
    thumpTable[i] = clampf(sample, -1.0f, 1.0f);
  }

  thumpTableLen = totalLen;

  Serial.printf("Thump table built, length=%d samples, about %d ms\n",
    thumpTableLen,
    (int)((float)thumpTableLen * 1000.0f / SAMPLE_RATE));
}

// ================= Step 5: Initialize the I2S driver =================
void initI2S() {
  i2s_config_t i2s_config = {
    .mode                = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate         = SAMPLE_RATE,
    .bits_per_sample     = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format      = I2S_CHANNEL_FMT_RIGHT_LEFT,   // Stereo (one channel each)
    .communication_format= I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags    = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count       = DMA_BUF_COUNT,
    .dma_buf_len         = DMA_BUF_LEN,
    .use_apll            = false,
    .tx_desc_auto_clear  = true,   // Auto-clear after send, prevents glitches
    .fixed_mclk          = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK,
    .ws_io_num    = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num  = I2S_PIN_NO_CHANGE  // Send only, no receive
  };

  esp_err_t err;

  err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("I2S driver install failed: %d\n", (int)err);
    while (1) delay(100);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("I2S pin config failed: %d\n", (int)err);
    while (1) delay(100);
  }

  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S initialized");
}

// ================= Throttle update (called by throttleTask every 20ms) =================
void updateThrottle() {

  // Handle the button: on press, zero both the encoder position and the throttle
  if (encoderButtonPressed) {
    encoderButtonPressed = false;
    encoderPosition = 0;
    targetThrottle  = 0.0f;
    Serial.println(">>> Button pressed: throttle zeroed!");
  }

  // Clamp the encoder position so it can't rotate past the 0~full-throttle range
  int maxSteps = (int)(1.0f / ENCODER_STEP_SIZE);  // Default: 10 steps to full throttle

  if (encoderPosition < 0)        encoderPosition = 0;
  if (encoderPosition > maxSteps) encoderPosition = maxSteps;

  // Convert steps to a 0.0~1.0 throttle value
  targetThrottle = clampf((float)encoderPosition * ENCODER_STEP_SIZE, 0.0f, 1.0f);

  // Smooth transition: take only a small step each time, avoiding sudden throttle jumps that cause clicks
  throttleValue += (targetThrottle - throttleValue) * ENCODER_SMOOTHING;
  throttleValue  = clampf(throttleValue, 0.0f, 1.0f);

  // Compute the target RPM from the throttle
  targetRPM = RPM_IDLE + throttleValue * (RPM_MAX - RPM_IDLE);
}

// ================= Audio generation task (runs on core 1, highest priority) =================
void audioTask(void *param) {
  float crankPhase = 0.0f;   // Crankshaft phase, drives all cylinders

  float bgLpf    = 0.0f;    // Background low-pass filter state
  float bgHpfIn  = 0.0f;    // Background high-pass filter input
  float bgHpfOut = 0.0f;    // Background high-pass filter output

  int   playPosA = -1;       // Thump voice A current playback position (-1 = inactive)
  int   playPosB = -1;       // Thump voice B (fade-out of the previous thump)
  float gainA    = 1.0f;
  float gainB    = 0.55f;

  int  samplesToNextTrigger = 0;   // Samples until the next thump trigger
  bool altToggle = false;          // Alternating-cylinder toggle flag

  float thumpLpf  = 0.0f;   // Thump low-pass filter state
  float outHpfIn  = 0.0f;   // Output high-pass filter input
  float outHpfOut = 0.0f;   // Output high-pass filter output

  uint32_t jitterSeed = 987654321;

  unsigned long audioStartMs = millis();

  Serial.println("Audio task started");

  while (true) {

    // --- RPM smoothly tracks target (simulates real engine inertia) ---
    currentRPM += (targetRPM - currentRPM) * RPM_SMOOTHING;

    // Normalized RPM in the 0.0~1.0 range
    float rpmNorm = clampf((currentRPM - RPM_IDLE) / (RPM_MAX - RPM_IDLE), 0.0f, 1.0f);

    // Crankshaft phase increment per sample (four-stroke ÷ 2)
    float cycleIncrement = ((currentRPM / 60.0f) / (float)SAMPLE_RATE) / 2.0f;

    // Current thump frequency
    float thumpHz = THUMP_HZ_IDLE + rpmNorm * (THUMP_HZ_MAX - THUMP_HZ_IDLE);
    currentThumpHz = thumpHz;

    // Volume scales with RPM
    float bgGain = BACKGROUND_GAIN_IDLE + rpmNorm * (BACKGROUND_GAIN_MAX - BACKGROUND_GAIN_IDLE);
    float thumpLayerGain = THUMP_LAYER_GAIN_IDLE + rpmNorm * (THUMP_LAYER_GAIN_MAX - THUMP_LAYER_GAIN_IDLE);

    // Low-pass cutoff rises with RPM (brighter background at high revs)
    float bgLpfAlpha = 0.16f + 0.55f * rpmNorm;

    // Startup fade-in (prevents power-on thump)
    float fadeIn = clampf((float)(millis() - audioStartMs) / 1800.0f, 0.0f, 1.0f);

    // --- Per-sample audio generation ---
    for (int i = 0; i < DMA_BUF_LEN; i++) {

      // ====================================================
      // Layer 1: Background engine sound — summed exhaust pulses of 8 cylinders
      // ====================================================
      float bg = 0.0f;

      for (int cyl = 0; cyl < NUM_CYLINDERS; cyl++) {
        float phase = crankPhase - cylinderPhase[cyl];
        while (phase < 0.0f) phase += 1.0f;
        while (phase >= 1.0f) phase -= 1.0f;

        float pulse = generateCylinderPulse(phase);
        float cylGain = (cyl % 2 == 0) ? 1.0f : 0.82f;  // Slight odd/even difference for realism
        bg += pulse * cylGain;
      }

      bg /= (float)NUM_CYLINDERS * 0.42f;

      // Add a harmonic layer (emphasize the low end, reduce high-harmonic buzz)
      float basePhase  = crankPhase * 4.0f;
      float harmonics  = 0.0f;

      harmonics += fastSin(basePhase)        * 1.00f;
      harmonics += fastSin(basePhase * 0.5f) * 0.60f;   // Half frequency: adds deep weight
      harmonics += fastSin(basePhase * 1.5f) * 0.28f;
      harmonics += fastSin(basePhase * 2.0f) * (0.25f + 0.10f * rpmNorm);
      harmonics += fastSin(basePhase * 3.0f) * (0.08f + 0.08f * rpmNorm);
      harmonics += fastSin(basePhase * 4.0f) * (0.03f * rpmNorm);  // 4th harmonic is the buzz source, kept very low
      harmonics /= 2.4f;

      bg = bg * 0.55f + harmonics * 0.45f;
      bg = tanhf(bg * (1.05f + rpmNorm * 0.8f));  // Soft clip, simulates exhaust nonlinearity

      // Add low-frequency mechanical noise (rumble, not hiss)
      float rumble   = pseudoRandom();
      float rumble2  = pseudoRandom();
      bg += (rumble * 0.6f + rumble2 * 0.4f) * (0.008f + 0.018f * rpmNorm);

      // Low-pass (makes it sound more like it's coming out of a pipe, a bit muffled)
      float bgLpfAlpha2 = 0.18f + 0.45f * rpmNorm;
      bgLpf += bgLpfAlpha2 * (bg - bgLpf);
      bg = bgLpf;

      // Slight high-pass (removes DC offset)
      float bgHp = 0.992f * (bgHpfOut + bg - bgHpfIn);
      bgHpfIn  = bg;
      bgHpfOut = bgHp;
      bg = bg * 0.92f + bgHp * 0.08f;

      bg *= bgGain;

      // ====================================================
      // Layer 2: Main thump — modified straight-pipe cannon effect
      // ====================================================

      // Timer is up — trigger a new thump
      if (samplesToNextTrigger <= 0) {

        // Fade the previous thump out as voice B (tail overlap)
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.50f;
        }

        playPosA = 0;

        // Odd/even alternation: simulates the slight force difference between V8 cylinder firings
        gainA = altToggle ? THUMP_ALT_GAIN : 1.0f;

        // Compute the interval to the next trigger (with swing and jitter for groove)
        float intervalSamples = (float)SAMPLE_RATE / thumpHz;
        float swingFactor = altToggle ? (1.0f - THUMP_SWING) : (1.0f + THUMP_SWING);
        float jitter = 1.0f + localRandSigned(jitterSeed) * 0.025f;

        samplesToNextTrigger = (int)clampf(intervalSamples * swingFactor * jitter, 1.0f, 999999.0f);
        altToggle = !altToggle;
      }

      samplesToNextTrigger--;

      float thump = 0.0f;

      // Read voice A
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) {
          thump += thumpTable[playPosA++] * gainA;
        } else {
          playPosA = -1;
        }
      }

      // Read voice B (fade-out tail of the previous thump)
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) {
          thump += thumpTable[playPosB++] * gainB;
          gainB *= 0.9992f;  // Slow fade-out
        } else {
          playPosB = -1;
        }
      }

      // Low-pass rounds the thump edges so they aren't as harsh
      thumpLpf += 0.58f * (thump - thumpLpf);
      thump = thumpLpf * thumpLayerGain;

      // ====================================================
      // Layer 3: Mix the two layers and output
      // ====================================================
      float sample = bg + thump;

      // Final output high-pass (removes low-frequency DC drift)
      float outHp = 0.988f * (outHpfOut + sample - outHpfIn);
      outHpfIn  = sample;
      outHpfOut = outHp;
      sample = sample * 0.86f + outHp * 0.14f;

      // Overall soft-clip (prevents overload when the two layers sum)
      sample = tanhf(sample * (1.05f + 0.22f * rpmNorm));

      sample *= MASTER_VOLUME * fadeIn;
      sample  = clampf(sample, -0.98f, 0.98f);

      // Convert to 16-bit PCM, identical left and right (mono speaker)
      int16_t out = (int16_t)(sample * PCM_OUTPUT_SCALE);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;

      // Advance the crankshaft phase
      crankPhase += cycleIncrement;
      if (crankPhase >= 1.0f) crankPhase -= 1.0f;
    }

    // Write this batch of audio data into I2S DMA; generate the next batch after it's done
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= Throttle task (runs on core 0, low priority) =================
void throttleTask(void *param) {
  while (true) {
    updateThrottle();
    vTaskDelay(pdMS_TO_TICKS(20));  // Update throttle every 20ms, smooth enough
  }
}

// ================= Serial monitor task (runs on core 0, lowest priority) =================
void monitorTask(void *param) {
  char buf[128];

  while (true) {
    int rpmInt      = (int)(currentRPM + 0.5f);
    int targetInt   = (int)(targetRPM  + 0.5f);
    int throttlePct = (int)(throttleValue * 100.0f + 0.5f);
    int thumpHz10   = (int)(currentThumpHz * 10.0f + 0.5f);

    snprintf(buf, sizeof(buf),
      "RPM=%d  target=%d  throttle=%d%%  encoder=%d  thump=%d.%dHz",
      rpmInt, targetInt, throttlePct, encoderPosition,
      thumpHz10 / 10, thumpHz10 % 10);

    Serial.println(buf);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

// ================= setup: system initialization =================
void setup() {
#if DISABLE_BROWNOUT_FOR_TEST
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  Serial.begin(115200);
  delay(1000);

  // Check memory status at startup (if PSRAM is 0 it didn't come up — go back and set QSPI)
  Serial.printf("Free on-chip SRAM: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("Free external PSRAM: %d bytes\n", ESP.getFreePsram());

  Serial.println("====================================");
  Serial.println("ESP32-S3 V8 sound simulator");
  Serial.println("Main thump: modified straight-pipe cannon");
  Serial.println("Throttle control: KY-040 rotary encoder");
  Serial.println("====================================");

  initEncoder();
  initSineTable();
  initCylinderPhases();
  buildStraightPipeThumpTable();
  initI2S();

  // Audio task: core 1, highest priority, 12KB stack
  xTaskCreatePinnedToCore(audioTask,    "AudioTask", 12288, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  // Throttle task: core 0, priority 2, 3KB stack
  xTaskCreatePinnedToCore(throttleTask, "Throttle",  3072,  NULL, 2,                        NULL, 0);
  // Monitor task: core 0, lowest priority, 4KB stack (don't go too small or the stack overflows)
  xTaskCreatePinnedToCore(monitorTask,  "Monitor",   4096,  NULL, 1,                        NULL, 0);

  Serial.println("System started. Rotate encoder to control throttle, press to zero.");
}

// loop is basically idle; all the work is handed off to FreeRTOS tasks
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

### Code Walkthrough

The whole program consists of three parallel tasks, scheduled by FreeRTOS so they don't interfere with each other:

| Task | Core | Priority | What it does |
|------|------|----------|--------------|
| `audioTask` | Core 1 | Highest | Synthesizes audio sample-by-sample, writes to I2S DMA |
| `throttleTask` | Core 0 | Medium | Reads the encoder and updates the throttle every 20ms |
| `monitorTask` | Core 0 | Lowest | Prints status to serial every 700ms |

**The core of the sound synthesis has three layers:**

**Layer 1: Background engine sound.** Each of the 8 cylinders maintains its own phase, and each cylinder fires its exhaust pulse waveform in turn according to the V8 firing angles (0°, 90°, 150°…450°). The summed output of all 8 cylinders is that continuous low rumble. On top of the cylinder pulses, a fundamental and several harmonics are layered in to add depth to the engine tone.

**Layer 2: Main thump.** At intervals (the frequency is set by `thumpHz`), a complete "thump" is read from the precomputed thump wavetable and played. The thump itself is a three-stage attack → body → decay envelope, plus a frequency slide-down (simulating exhaust pressure release) and a rebound delay (simulating pipe resonance), which makes it sound like a modified straight-pipe cannon.

**Layer 3: Mix and output.** After the two layers are summed, an overall soft-clip prevents clipping, then it's multiplied by a fade-in coefficient (to prevent the power-on thump), and finally written out as 16-bit stereo PCM into I2S.



## Thump Sample Debugging Tool (Optional)

To make it easier to find the right exhaust sound, I also wrote a serial-carousel test version: it has 30 built-in preset parameter sets and switches between them via serial commands, so you can directly A/B compare which "thump" suits your taste. The main program ends up using preset number 23, "Modified straight-pipe cannon."

```c
/*
 * ESP32-S3 + MAX98357A
 * Thump sample carousel tester V2
 * 30 samples + significantly boosted volume
 *
 * Wiring:
 *   BCLK -> GPIO16
 *   LRC  -> GPIO17
 *   DIN  -> GPIO15
 *
 * Serial commands (115200):
 *   n     next
 *   p     previous
 *   r     replay
 *   s     stop auto-carousel
 *   a     start auto-carousel
 *   b     toggle background layer
 *   1~30  jump to that index
 *   h     help
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

// ================= Preset parameter struct =================
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
  {"01 Deep big-block",          12,  65, 100,  55,  42,  34,  0.18, 0.24, 0.08, 0.28, 1.7, 0.18, 44, 0.22, 1.00, 0.00, 2.8, 0.20},
  {"02 Rounder and denser",      14,  75, 130,  52,  40,  32,  0.12, 0.18, 0.04, 0.32, 1.5, 0.10, 50, 0.18, 1.00, 0.00, 2.9, 0.16},
  {"03 Small-horn enhanced A",    7,  42,  65, 100,  80,  65,  0.16, 0.30, 0.14, 0.06, 1.6, 0.16, 32, 0.14, 1.00, 0.00, 2.6, 0.12},
  {"04 Small-horn enhanced B",    5,  35,  55, 120,  95,  78,  0.14, 0.36, 0.20, 0.04, 1.7, 0.12, 26, 0.12, 1.00, 0.00, 2.5, 0.10},
  {"05 American V8 idle",         9,  55,  95,  72,  56,  44,  0.22, 0.26, 0.10, 0.14, 1.8, 0.24, 42, 0.30, 0.80, 0.20, 2.7, 0.22},
  {"06 More gurgle, uneven",     11,  58, 105,  68,  52,  42,  0.24, 0.22, 0.08, 0.18, 1.8, 0.22, 54, 0.38, 0.72, 0.26, 2.8, 0.24},
  {"07 Strong backpressure double-thump", 8, 48, 85, 80, 62, 48, 0.20, 0.26, 0.12, 0.12, 1.7, 0.20, 58, 0.48, 0.88, 0.14, 2.6, 0.18},
  {"08 Rough and explosive",      6,  40,  68,  90,  72,  56,  0.28, 0.32, 0.16, 0.08, 2.2, 0.32, 34, 0.22, 0.90, 0.10, 2.5, 0.15},
  {"09 Ultra thick and muffled", 16,  85, 150,  48,  38,  30,  0.08, 0.14, 0.02, 0.36, 1.6, 0.06, 58, 0.20, 1.00, 0.00, 3.0, 0.14},
  {"10 Short punchy",             4,  28,  45, 100,  78,  60,  0.14, 0.38, 0.20, 0.04, 1.8, 0.12, 22, 0.10, 1.00, 0.00, 2.4, 0.10},
  {"11 Raspy exhaust",            8,  50,  88,  82,  64,  50,  0.32, 0.24, 0.10, 0.10, 1.9, 0.34, 40, 0.26, 0.86, 0.12, 2.6, 0.16},
  {"12 Low-freq heavy cannon",   13,  68, 115,  58,  46,  36,  0.14, 0.20, 0.06, 0.30, 1.8, 0.14, 48, 0.26, 1.00, 0.00, 2.9, 0.20},
  {"13 Mid-freq crisp punch",     6,  36,  58, 130, 100,  78,  0.10, 0.40, 0.24, 0.02, 1.6, 0.08, 28, 0.10, 1.00, 0.00, 2.4, 0.08},
  {"14 Dual-pulse gurgle",        7,  44,  78,  85,  66,  52,  0.18, 0.28, 0.14, 0.10, 1.8, 0.20, 20, 0.45, 0.82, 0.18, 2.6, 0.16},
  {"15 Old V8 loose feel",       10,  60, 108,  72,  55,  44,  0.24, 0.22, 0.08, 0.16, 1.7, 0.20, 52, 0.32, 0.68, 0.30, 2.7, 0.22},
  {"16 Ultra-thick test",        15,  95, 160,  54,  42,  32,  0.06, 0.14, 0.02, 0.38, 1.6, 0.04, 64, 0.18, 1.00, 0.00, 3.2, 0.12},
  {"17 Harley-style",             8,  52,  90,  78,  58,  46,  0.26, 0.24, 0.10, 0.16, 1.9, 0.26, 48, 0.35, 0.65, 0.32, 2.8, 0.25},
  {"18 Sports-car high-rev sharp", 4, 30,  50, 140, 110,  88,  0.12, 0.42, 0.28, 0.02, 1.8, 0.10, 20, 0.08, 1.00, 0.00, 2.3, 0.08},
  {"19 Diesel clatter",          14,  48,  80,  65,  50,  42,  0.30, 0.18, 0.06, 0.20, 2.0, 0.28, 38, 0.40, 0.75, 0.22, 2.7, 0.20},
  {"20 Big-block cruiser",       12,  72, 125,  60,  45,  36,  0.16, 0.20, 0.06, 0.34, 1.7, 0.12, 55, 0.24, 1.00, 0.00, 3.0, 0.18},
  {"21 Ultra-aggressive burst",   3,  25,  40, 110,  85,  68,  0.35, 0.34, 0.18, 0.06, 2.5, 0.40, 18, 0.15, 0.92, 0.08, 2.4, 0.12},
  {"22 Gentle big-block",        16,  90, 140,  50,  40,  34,  0.10, 0.16, 0.04, 0.30, 1.4, 0.06, 60, 0.16, 1.00, 0.00, 3.0, 0.10},
  {"23 Modified straight-pipe cannon", 5, 38, 62, 105, 82, 64, 0.22, 0.30, 0.16, 0.08, 2.1, 0.28, 30, 0.18, 0.94, 0.06, 2.5, 0.14},
  {"24 Deep + strong backpressure", 10, 58, 95, 65, 50, 40, 0.18, 0.22, 0.08, 0.22, 1.8, 0.16, 65, 0.52, 0.85, 0.16, 2.8, 0.20},
  {"25 Airflow burst type",       6,  35,  55,  88,  68,  52,  0.38, 0.20, 0.08, 0.10, 1.7, 0.45, 28, 0.14, 1.00, 0.00, 2.5, 0.12},
  {"26 Three-cylinder loping",   10,  45,  75,  74,  58,  46,  0.20, 0.22, 0.10, 0.14, 1.8, 0.20, 36, 0.30, 0.60, 0.35, 2.6, 0.18},
  {"27 Subwoofer test",          18, 100, 180,  42,  32,  26,  0.06, 0.12, 0.02, 0.42, 1.5, 0.04, 70, 0.20, 1.00, 0.00, 3.4, 0.08},
  {"28 Every-blow-lands type",    5,  32,  48,  95,  75,  58,  0.16, 0.34, 0.18, 0.06, 2.0, 0.16, 24, 0.12, 1.00, 0.00, 2.6, 0.10},
  {"29 Full-band roar",           8,  55,  90,  85,  65,  50,  0.20, 0.28, 0.14, 0.18, 1.9, 0.22, 42, 0.28, 0.88, 0.12, 2.8, 0.20},
  {"30 Extreme contrast test",    3,  20,  35, 150, 120,  90,  0.40, 0.44, 0.28, 0.02, 2.4, 0.45, 16, 0.08, 1.00, 0.00, 2.2, 0.06},
};

const int NUM_PRESETS = sizeof(presets) / sizeof(presets[0]);

// ================= Initialization =================
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

// ================= Build the wavetable =================
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

// ================= Serial control =================
void showHelp() {
  Serial.println();
  Serial.println("===== Commands =====");
  Serial.println("n     next");
  Serial.println("p     previous");
  Serial.println("r     replay");
  Serial.println("s     stop auto-carousel");
  Serial.println("a     start auto-carousel");
  Serial.println("b     toggle background");
  Serial.println("1~30  jump to index");
  Serial.println("h     help");
  Serial.println("================");
}

void printPresetInfo(int idx) {
  Serial.println();
  Serial.println("========================================");
  Serial.print("Preset #");
  Serial.print(idx + 1);
  Serial.print(" / ");
  Serial.println(NUM_PRESETS);
  Serial.println(presets[idx].name);
  Serial.print("First 2.5s slow thump, next 2.5s fast thump, background: ");
  Serial.println(backgroundEnabled ? "on" : "off");
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
  if (cmd == "s") { autoPlay = false; Serial.println("Auto-carousel stopped"); return; }
  if (cmd == "a") { autoPlay = true; lastSwitchMs = millis(); Serial.println("Auto-carousel started"); return; }
  if (cmd == "b") { backgroundEnabled = !backgroundEnabled; Serial.print("Background: "); Serial.println(backgroundEnabled ? "on" : "off"); return; }
  if (cmd == "h") { showHelp(); return; }

  int n = cmd.toInt();
  if (n >= 1 && n <= NUM_PRESETS) { requestPreset(n - 1); return; }

  Serial.print("Unknown: ");
  Serial.println(cmd);
}

// ================= Audio task =================
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

      // Key: final output gain is boosted significantly
      sample *= 1.8f;

      sample = tanhf(sample * 1.1f);
      sample = clampf(sample, -0.98f, 0.98f);

      // Full-scale output
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
  Serial.println("Thump sample carousel tester V2");
  Serial.println("30 samples + high-volume edition");
  Serial.println("====================================");

  initSineTable();
  initI2S();
  showHelp();
  requestPreset(0);

  xTaskCreatePinnedToCore(audioTask, "Audio", 10240, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  Serial.println("Starting playback...");
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

## Troubleshooting

Don't panic — 90% of the problems come down to a few things, and running through this list will usually sort it out:

**No sound from the speaker at all after power-up**

Check the SD pin first. If the MAX98357A's SD pin is accidentally pulled low (e.g. touching GND, or not left floating), the module goes into mute mode. Leave the SD pin floating or tie it to 3.3V, then re-power and try again. Next, check the serial monitor for any I2S initialization errors — look for "I2S driver install failed" in the output.

**The sound is very quiet, almost inaudible**

First confirm the speaker impedance. The MAX98357A outputs 3W into a 4Ω speaker, but only about 1.4W into 8Ω — half the volume. Next, check whether VIN is actually on 5V; running it on 3.3V drops the power a lot. You can also raise `PCM_OUTPUT_SCALE` in the code from 26000 to 30000, but don't exceed 32767 — past that you get overflow distortion.

**Encoder rotation direction is reversed (clockwise goes down, counter-clockwise goes up)**

Swap `encoderPosition++` and `encoderPosition--` inside `encoderISR()`, or just swap the CLK and DT physical wires. Pick one.

**Crashes and reboots immediately on boot, serial shows `Stack canary watchpoint triggered`**

A FreeRTOS task has overflowed its stack; the error message will show the task name (e.g. `Monitor`). Find that task and bump up the stack size (the third number) in its `xTaskCreatePinnedToCore` call — give Monitor at least 4096, or 8192 if that's not enough.

**Serial shows `OOM: failed to allocate XXX bytes`**

Out of memory. Check in this order:

1. In the Arduino IDE under **Tools → PSRAM**, make sure **QSPI PSRAM** is selected (not OPI)
2. Add `Serial.printf("PSRAM: %d\n", ESP.getFreePsram());` at the top of `setup()`, reflash, and read the serial output. If it prints 0, the PSRAM didn't come up — go back and fix the option
3. Confirm your board actually has external PSRAM (the R8 in ESP32-S3-WROOM-1-**N16R8** stands for 8MB PSRAM)

**Regular pops or crackle in the sound**

Most likely a common-ground problem. The GND of the ESP32-S3 and the GND of the MAX98357A must connect to the same ground line, not to two separate supply grounds. Measure the resistance between the two GNDs with a multimeter — it should be close to 0Ω.

---

## FAQ

**Q: My ESP32-S3's GPIO16/17/15 are already taken. Can I use other pins?**
A: Yes — I2S pins can be freely remapped to any GPIO. Just change the three macros `I2S_BCLK`, `I2S_LRC`, `I2S_DOUT` at the top of the code to the pin numbers you want. But note that GPIO 0, 1, 2, 3, 43, 44 have special uses and are best avoided.

**Q: Can I connect two speakers for stereo?**
A: The MAX98357A is a mono amplifier. For stereo you need two modules, one for the left channel and one for the right, distinguished by how the GAIN pin is wired (one tied to GND = right channel, one floating = left channel). The two PCM channels in the code are currently identical (`stereoBuffer[i*2] = stereoBuffer[i*2+1] = out`), so for true stereo you'd also need to modify the synthesis logic.

**Q: Is the 22050Hz sample rate enough? Can I change it to 44100Hz?**
A: 22050Hz is plenty for mid-to-low-frequency content like engine sounds — it can reproduce up to 11025Hz, and human perception of engine sound is mostly in the 50Hz~4kHz range. Going to 44100Hz is theoretically possible, but it doubles the CPU load — make sure it's stable first, and change both `SAMPLE_RATE` and the `sample_rate` in the I2S config together.

**Q: Will connecting a 5V supply burn out the ESP32-S3?**
A: The MAX98357A's VIN connects to 5V, but its signal pins (BCLK, LRC, DIN) are 3.3V-level and can be connected directly to the ESP32-S3's GPIOs without level shifting. The ESP32-S3's GPIOs output 3.3V and the MAX98357A accepts that fine — it's safe.

**Q: The idle volume is too low to hear clearly. Can I make it louder?**
A: Bump up `BACKGROUND_GAIN_IDLE` (default 0.45) and `THUMP_LAYER_GAIN_IDLE` (default 0.75) — raise both, e.g. to 0.6 and 1.0, and the idle volume will jump noticeably. After tuning, remember to check whether there's clipping at full throttle; if so, lower `PCM_OUTPUT_SCALE` just a touch.

**Q: The KY-040 changes throttle by 10% per detent — that's too much. Can I make it finer?**
A: Reduce `ENCODER_STEP_SIZE` from 0.1 — e.g. to 0.05 — and each detent becomes 5%. You'll need 20 detents to reach full throttle, with a much finer feel.

**Q: Will the program run on a regular ESP32 (non-S3)?**
A: It's theoretically compatible — the I2S API is generic — but a regular ESP32 has no external PSRAM (or only a small amount), so this project may not have enough memory. Use at least a PSRAM-equipped model like the ESP32-WROVER. You'll also need to remap the GPIO numbers for your board.

---

## Going Further

Once you've got the basic version working, you can extend it in these directions:

- **Add a speed sensor**: Mount a Hall sensor on the wheel; the faster you go, the higher the throttle auto-climbs — hands-free
- **Swap in a V6 / inline-4 / motorcycle sound**: Modify `NUM_CYLINDERS` and `firingAngles` — a different set of firing angles is a different engine
- **Add a TFT display**: Show the current tachometer and throttle percentage for that real dashboard feel
- **Add a waterproof case**: If you're mounting it on an e-bike, you really do need to waterproof it for rainy days — water in the circuit is even more of a headache than no sound

---

## References

- [MAX98357A Datasheet (Analog Devices)](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [MAX98357A Product page (Analog Devices)](https://www.analog.com/en/products/max98357a.html)
- [ESP32-S3 Technical Reference Manual (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3-WROOM-1 Product page (Espressif)](https://www.espressif.com/en/products/modules/esp32-s3)
- [ESP32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)
- [FreeRTOS task creation API documentation](https://www.freertos.org/a00125.html)
