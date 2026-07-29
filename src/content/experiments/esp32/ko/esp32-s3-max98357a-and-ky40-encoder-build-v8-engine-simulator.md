---
title: "ESP32-S3 + MAX98357A로 V8 엔진 사운드 시뮬레이터 만들기 완성 튜토리얼 (I2S 디지털 오디오 + KY-040 로터리 엔코더로 스로틀 제어)"
boardId: esp32s3
moduleId: audio/max98357a
moduleIds:
  - audio/max98357a
  - sensor/ky-040
category: esp32
date: 2026-07-14
intro: "ESP32-S3로 MAX98357A 증폭 모듈을 구동하고 KY-040 로터리 엔코더와 조합해 순수 코드로 V8 엔진 사운드를 실시간 합성합니다. 스로틀은 엔코더로 수동 제어하고 소리는 스피커로 실시간 출력됩니다. 완성된 배선, 코드, 트러블슈팅 기록을 포함합니다."
image: "https://img.lingflux.com/2026/07/6c72c55fa63614eb8c2086c24d993d5f.jpg"
---

> **TL;DR(빠른 시작):**
>
> 1. 배선: MAX98357A의 BCLK → GPIO16, LRC → GPIO17, DIN → GPIO15; KY-040의 CLK → GPIO5, DT → GPIO6, SW → GPIO7
> 2. 보드는 **ESP32S3 Dev Module**로 선택, PSRAM은 **QSPI PSRAM** 선택(잘못 선택하면 OOM 발생, 어떻게 아느냐고 묻지 마세요)
> 3. 시계 방향 회전 = 스로틀 감소, 반시계 방향 = 스로틀 증가, 누름 = 아이들로 복귀
> 4. 업로드하고 전원을 넣고 당신의 "V8 전기차"를 즐기세요

---

난이도: ⭐⭐⭐☆☆(기본적인 Arduino 배선과 업로드 가능 필요)
예상 시간: 45분
테스트 환경: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + ESP32-S3-WROOM-1-N16R8(16MB Flash + 8MB PSRAM)

---

## 서론

전기자전거를 타본 사람은 그 민망함을 압니다: 소리 없이 보행자 뒤로 다가가면 상대방은 반쯤 놀라서 돌아보며 "왜 소리가 안 나냐"는 눈빛을 보냅니다. 당신은 어색한 미소로 대응할 수밖에 없죠. 왜냐하면 당신의 차는 정말로… 소리가 없으니까요.

전기차는 연료도 아끼고 친환경이지만 딱 하나 골치 아픈 게 있습니다: 너무 조용하다는 거죠. 유령처럼 도로를 떠다닐 정도로요.

그래서 생각했습니다: 엔진 자체 소리에 기댈 수 없다면, 직접 **소리를 만들면** 안 될까? 싸구려 스피커에서 나오는 "띠띠" 같은 게 아니라… V8 엔진의 사운드요. 낮고 힘 있어서, 한 번 밟으면 우르르 울리는 그런 소리요.

이 글의 목표는 이것입니다: **ESP32-S3 + MAX98357A 증폭 모듈 + KY-040 로터리 엔코더**로 순수 코드 합성 V8 엔진 사운드를 만드는 것. 스로틀 크기는 엔코더로 수동 제어하고 소리는 스피커로 실시간 출력됩니다. 샘플링도, 오디오 파일 재생도 없고, 전부 실시간 수학 연산으로 만들어낸 엔진 사운드입니다.



---

## 실험 결과

KY-040 엔코더를 돌려 스로틀을 올리면, 스피커에서 낮은 아이들 웅웅거림에서 점차 고회전 엔진 포효로 부드럽게 전환됩니다. 엔코더 버튼을 누르면 스로틀이 즉시 0으로 돌아가 아이들 상태로 복귀합니다. 소리 전환이 매끄럽고 튀는 느낌 없이 꽤 그럴싸하게 들립니다.


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30IWSgfp3IY?si=XXwD3KaDonejM5WD" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## 부품 설명

> 개발 보드(ESP32-S3)는 따로 설명하지 않고, 나머지 두 주인공을 중점적으로 소개합니다.

### MAX98357A — 디지털 신호 통역사

디지털 녹음본(0과 1의 나열)이 있는데, 스피커는 아날로그 신호(전압의 높낮이 변화)만 알아듣는다고 상상해 보세요. MAX98357A는 그 사이의 **동시통역사**입니다: ESP32-S3가 I2S 프로토콜로 보내는 디지털 오디오를 받아 스피커를 구동할 수 있는 아날로그 전류로 실시간 변환하고, 3W 증폭기를 내장해 별도의 증폭 회로가 필요 없습니다.

| 파라미터 | 값 |
|------|------|
| 공급 전압 | 2.5V ~ 5.5V |
| 출력 전력 | 3.2W(4Ω 부하, 5V 공급) |
| 샘플링레이트 지원 | 8kHz ~ 96kHz |
| 통신 프로토콜 | I2S |
| 게인 단계 | 3dB / 6dB / 9dB / 12dB / 15dB |
| 뮤트 제어 | SD 핀을 LOW로 당기면 뮤트 |

선택 이유는 간단합니다: **I2S 직결, 필터 불필요, 모듈형 패키지, 3W면 라이딩에 충분**, 게다가 타오바오에서 10위안 안팎에 구할 수 있습니다.

### 핀 설명

| 핀 표시 | 기능 설명 |
|----------|----------|
| VIN | 전원 양극, 5V 연결 |
| GND | 전원 접지 |
| BCLK | I2S 비트 클럭 |
| LRC | I2S 워드 클럭(좌우 채널 선택) |
| DIN | I2S 디지털 오디오 데이터 입력 |
| SD | 뮤트 제어, 플로팅 또는 HIGH = 정상 동작, LOW = 뮤트 |
| GAIN | 게인 선택, 플로팅 시 기본 9dB |

> **주의**: SD 핀을 연결하지 않거나 3.3V에 연결해도 정상적으로 소리가 납니다. 배선에는 문제가 없는데 소리가 안 난다면, 먼저 SD 핀이 의도치 않게 LOW로 당겨졌는지 확인하세요.

---

### KY-040 — 무한 회전 "볼륨 다이얼"

일반 가변저항은 끝까지 돌리면 멈추지만, KY-040은 360° 무한 회전 엔코더입니다. 절대 위치를 출력하지 않고 "어느 방향으로 몇 단계 돌아갔는지"를 알려줍니다. 이 프로젝트에서는 스로틀 제어에 사용합니다: **시계 방향 = 스로틀 감소, 반시계 방향 = 스로틀 증가, 버튼 누름 = 아이들로 복귀**, 조작감이 실제 스로틀 다이얼을 돌리는 것과 같습니다.

| 파라미터 | 값 |
|------|------|
| 작동 전압 | 3.3V ~ 5V |
| 한 바퀴당 스텝 수 | 20 스텝 |
| 출력 신호 | A상(CLK) / B상(DT) / 버튼(SW) |
| 인터페이스 유형 | 디지털 GPIO(내부 풀업 포함) |

선택 이유: **저렴, 흔함, 버튼 포함은 가산점**, 인터럽트 구동이라 CPU를 거의 안 쓰고, FreeRTOS 작업 구조와 조합해도 부담이 없습니다.

### 핀 설명

| 핀 표시 | 기능 설명 |
|----------|----------|
| CLK(A상) | 로터리 엔코더 A상 출력, 인터럽트 핀에 연결 |
| DT(B상) | 로터리 엔코더 B상 출력, 회전 방향 판별 |
| SW | 버튼 출력, 누르면 LOW |
| + | 전원 양극, 3.3V 연결 |
| GND | 전원 접지 |

---

## BOM 표

| 부품 | 모델/사양 | 수량 | 비고 |
|------|-----------|------|------|
| 메인 개발 보드 | ESP32-S3-WROOM-1-N16R8 | 1 | 16MB Flash + 8MB PSRAM, PSRAM 필수 |
| I2S 증폭 모듈 | MAX98357A | 1 | 모듈 보드 포함, 비납땜 버전이 더 편리 |
| 로터리 엔코더 모듈 | KY-040 | 1 | 버튼 포함 |
| 소형 스피커 | 4Ω 3W | 1 | 또는 8Ω, 볼륨은 약간 작아짐 |
| 점퍼 와이어 | 수-수 / 수-암 | 약간 | 배선용 |
| 브레드보드 | 아무거나 | 1 | 선택, 배선 고정하면 더 편리 |

---

## 배선 방법

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

> 배선을 한 가닥씩 완료할 때마다 표에서 체크하며 하나씩 대조하는 습관을 추천합니다. 디버깅 시간의 80%를 줄여줍니다. 특히 GND는 여러 모듈이 공통 접지되는 것이 오디오가 정상 동작하기 위한 전제입니다 — 모두가 같은 언어를 써야 신호가 정확히 전달됩니다.

---

## 설치해야 할 라이브러리

이 프로젝트는 **서드파티 오디오 라이브러리에 의존하지 않습니다**. 오디오는 전부 코드로 실시간 합성되며, ESP32 Arduino Core에 포함된 `driver/i2s.h`만 사용합니다.

Arduino IDE에서 다음 환경만 확인하면 됩니다:

| 항목 | 요구 사항 |
|------|------|
| Arduino IDE | 2.3.8(테스트 통과) |
| ESP32 Arduino Core | 3.3.10(Board Manager에서 `esp32` 검색 후 설치) |
| 보드 옵션 | ESP32S3 Dev Module |
| **PSRAM 옵션** | **QSPI PSRAM**(잘못 선택하면 OOM 발생, 트러블슈팅 참조) |
| Flash Size | 16MB |
| Upload Speed | 921600 |

Arduino IDE의 **Tools** 메뉴에서 위 항목을 하나씩 대조하세요. 특히 PSRAM 줄을 주의 깊게 확인하세요.

---

## 완성 코드 + 설명

```cpp
/*
 * ESP32-S3 + MAX98357A + KY-040 로터리 엔코더
 * V8 엔진 사운드 시뮬레이터
 *
 * 배선:
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
 *   SW        -> GPIO7  (누르면 스로틀 0)
 *   +         -> 3.3V
 *   GND       -> GND
 *
 * 조작 설명:
 *   시계 방향 회전 = 스로틀 감소
 *   반시계 방향 회전 = 스로틀 증가
 *   엔코더 누름 = 스로틀 0(아이들로 복귀)
 *
 * 시리얼 보드레이트: 115200
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// -----------------------------------------------
// Brownout 재부팅이 발생하면 임시로 1로 변경해 테스트
// 정식 사용 시에는 0으로 유지, 장기 저전압 보호 비활성화는 권장하지 않음
// -----------------------------------------------
#define DISABLE_BROWNOUT_FOR_TEST 0

#if DISABLE_BROWNOUT_FOR_TEST
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

// ================= 1단계: I2S 핀 정의 =================
#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

// ================= 2단계: KY-040 핀 정의 =================
#define ENCODER_CLK_PIN   5
#define ENCODER_DT_PIN    6
#define ENCODER_SW_PIN    7

// ================= 엔코더 스로틀 파라미터 =================
// 한 단계 회전당 스로틀 변화량(범위 0.0~1.0)
// 값을 작게 하면 = 만 스로틀까지 더 많이 돌려야 하지만 조작감이 더 섬세해짐
#define ENCODER_STEP_SIZE     0.1f

// 스로틀 부드러운 전환 계수(클수록 응답 빠름, 작을수록 전환이 더 매끄러움)
#define ENCODER_SMOOTHING     1.2f

// 엔코더 디바운스 시간(마이크로초), 한 번 회전이 여러 번으로 잘못 읽히는 것 방지
#define ENCODER_DEBOUNCE_US   200

// 버튼 디바운스 시간(밀리초)
#define BUTTON_DEBOUNCE_MS    200

// ================= 오디오 기본 파라미터 =================
#define SAMPLE_RATE     22050   // 샘플링 레이트, 단위 Hz
#define DMA_BUF_COUNT   8       // DMA 버퍼 수
#define DMA_BUF_LEN     256     // DMA 버퍼당 샘플 수

// ================= 엔진 회전수 파라미터 =================
#define RPM_IDLE        800.0f    // 아이들 회전수(RPM)
#define RPM_MAX         8000.0f   // 최고 회전수(RPM)
#define RPM_SMOOTHING   0.006f    // 회전수 변화 평활 계수, 작을수록 실제 엔진과 비슷
#define NUM_CYLINDERS   8         // V8 = 8개 실린더

// ================= 배기 펑 소리 리듬 =================
// 아이들 시 초당 2회 펑, 최고 회전 시 초당 7.6회 펑
#define THUMP_HZ_IDLE   2.0f
#define THUMP_HZ_MAX    7.6f

// ================= 볼륨 파라미터 =================
#define MASTER_VOLUME       1.00f
#define PCM_OUTPUT_SCALE    26000.0f   // 최종 16bit PCM 출력 스케일 계수

// 배경 엔진음 볼륨(아이들 / 최고 회전)
#define BACKGROUND_GAIN_IDLE  0.45f
#define BACKGROUND_GAIN_MAX   0.60f

// 메인 펑 소리 레이어 볼륨(아이들 / 최고 회전)
#define THUMP_LAYER_GAIN_IDLE 0.75f
#define THUMP_LAYER_GAIN_MAX  1.05f

// ================= 튜닝 스트레이트 파이프 펑 소리 파라미터 =================
// 아래 파라미터는 매 배기 펑 소리의 파형 형태를 제어, 수정 시 주의
#define THUMP_ATTACK_MS       5.0f    // 어택 시간(ms)
#define THUMP_BODY_MS         38.0f   // 본체 지속 시간(ms)
#define THUMP_TAIL_MS         62.0f   // 잔향 감쇠 시간(ms)

#define THUMP_F_START         105.0f  // 펑 소리 시작 주파수(Hz)
#define THUMP_F_BODY          82.0f   // 본체 주파수(Hz)
#define THUMP_F_END           64.0f   // 잔향 주파수(Hz)

#define THUMP_NOISE_MIX       0.22f   // 노이즈 혼합 비율(배기 기류 소리 모방)
#define THUMP_TONE2_MIX       0.30f   // 2차 고조파 비율
#define THUMP_TONE3_MIX       0.16f   // 3차 고조파 비율
#define THUMP_SUB_MIX         0.08f   // 서브 저역 비율(저음감 강조)

#define THUMP_DRIVE           2.10f   // 파형 포화도(tanh 소프트 클리핑 강도)
#define THUMP_BURST_MIX       0.28f   // 폭발 기간 기류 노이즈 비율

#define THUMP_REBOUND_DELAY_MS 30.0f  // 배기 반동 지연(ms), 파이프 공명 모방
#define THUMP_REBOUND_GAIN     0.18f  // 반동 게인

#define THUMP_ALT_GAIN         0.94f  // 교대 실린더 게인 차이, 불균일 점화 모방
#define THUMP_SWING            0.06f  // 리듬 스윙량, 그루브감 추가

#define THUMP_TABLE_GAIN       2.50f  // 펑 파형 테이블 전체 게인

// ================= 룩업 테이블 정의 =================
#define SINE_TABLE_SIZE 2048     // 사인파 룩업 테이블 크기(클수록 정밀도 높음, 메모리 증가)
#define THUMP_TABLE_MAX 8000     // 펑 파형 테이블 최대 샘플 수

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

// 출력 스테레오 버퍼(좌우 채널 각각 DMA_BUF_LEN개 샘플)
static int16_t stereoBuffer[DMA_BUF_LEN * 2];

// ================= 전역 상태 변수 =================
volatile float throttleValue  = 0.0f;   // 현재 평활화된 스로틀 값(0.0~1.0)
volatile float targetThrottle = 0.0f;   // 엔코더로 설정한 목표 스로틀
volatile float targetRPM      = RPM_IDLE;
volatile float currentRPM     = RPM_IDLE;
volatile float currentThumpHz = THUMP_HZ_IDLE;

uint32_t noiseSeed = 123456789;

// V8 실린더 위상 오프셋 테이블(90° 등간격 점화 모방)
float cylinderPhase[NUM_CYLINDERS];

const float firingAngles[NUM_CYLINDERS] = {
  0.0f, 90.0f, 150.0f, 210.0f,
  270.0f, 330.0f, 390.0f, 450.0f
};

// ================= 엔코더 인터럽트 관련 변수 =================
volatile int encoderPosition = 0;
volatile unsigned long lastEncoderInterruptUs = 0;
volatile bool encoderButtonPressed = false;
volatile unsigned long lastButtonPressMs = 0;

// ================= 유틸리티 함수 =================

// 값 클램프
static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// 부드러운 계단 함수, 전환을 더 매끄럽게(S자 곡선)
static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

// 룩업 테이블로 빠르게 sin 계산, sinf()보다 훨씬 빠름, 실시간 오디오에서는 필수
float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;

  // 선형 보간, 정밀도 향상
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

// 의사 난수 노이즈 생성(선형 합동법, 속도 빠름, 기류 소리 모방에 사용)
float pseudoRandom() {
  noiseSeed = noiseSeed * 1664525UL + 1013904223UL;
  return ((float)(noiseSeed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// 독립 시드 의사 난수(펑 파형 생성에 사용, 매번 소리가 일치하도록 보장)
float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= 엔코더 인터럽트: 회전 방향 판별 =================
void IRAM_ATTR encoderISR() {
  unsigned long nowUs = micros();

  // 디바운스: 두 인터럽트 간격이 너무 짧으면 무시, 기계적 떨림 오탐 방지
  if (nowUs - lastEncoderInterruptUs < ENCODER_DEBOUNCE_US) return;
  lastEncoderInterruptUs = nowUs;

  // CLK 하강 에지에서 트리거, 이때 DT 핀 레벨을 읽어 방향 판별
  // DT = LOW  → 시계 방향 → 스로틀 감소
  // DT = HIGH → 반시계 방향 → 스로틀 증가
  int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState == LOW) {
    encoderPosition--;  // 시계 방향: 스로틀 감소
  } else {
    encoderPosition++;  // 반시계 방향: 스로틀 증가
  }
}

// ================= 버튼 인터럽트: 누르면 스로틀 0 =================
void IRAM_ATTR buttonISR() {
  unsigned long nowMs = millis();
  if (nowMs - lastButtonPressMs < BUTTON_DEBOUNCE_MS) return;
  lastButtonPressMs = nowMs;
  encoderButtonPressed = true;
}

// ================= 엔코더 핀 및 인터럽트 초기화 =================
void initEncoder() {
  pinMode(ENCODER_CLK_PIN, INPUT_PULLUP);
  pinMode(ENCODER_DT_PIN,  INPUT_PULLUP);
  pinMode(ENCODER_SW_PIN,  INPUT_PULLUP);

  // CLK 하강 에지에서 회전 감지 트리거
  attachInterrupt(digitalPinToInterrupt(ENCODER_CLK_PIN), encoderISR, FALLING);
  // SW 하강 에지에서 버튼 감지 트리거(누르면 LOW)
  attachInterrupt(digitalPinToInterrupt(ENCODER_SW_PIN),  buttonISR, FALLING);

  Serial.println("KY-040 엔코더 초기화 완료");
}

// ================= 3단계: 사인파 룩업 테이블 미리 계산 =================
// 2048개의 sin 값을 미리 메모리에 저장, 재생 시 바로 조회, CPU 절약
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

// ================= 8개 실린더 위상 오프셋 초기화 =================
void initCylinderPhases() {
  for (int i = 0; i < NUM_CYLINDERS; i++) {
    // 각도를 0.0~1.0 위상으로 변환(720°가 하나의 완전한 연소 사이클)
    cylinderPhase[i] = firingAngles[i] / 720.0f;
  }
}

// ================= 단일 실린더 배기 펄스 파형 생성 =================
// phase는 0.0~1.0의 현재 위상, 해당 시점의 진폭 반환
float generateCylinderPulse(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float pulse = 0.0f;

  if (phase < 0.30f) {
    // 앞 30%: 빠른 상승, 배기 밸브 열리는 충격 모방
    float t = phase / 0.30f;
    pulse = sinf(M_PI * t) * expf(-2.2f * t) * 1.35f;
  } else if (phase < 0.50f) {
    // 30%~50%: 가벼운 반동, 파이프 역압 모방
    float t = (phase - 0.30f) / 0.20f;
    pulse = -0.25f * sinf(M_PI * 2.0f * t) * expf(-5.0f * t);
  }
  // 뒤 50%: 무음, 다음 배기 대기

  return pulse;
}

// ================= 4단계: 펑 파형 테이블 미리 계산 =================
// 한 번의 완전한 "펑" 소리를 미리 계산해 배열에 저장, 재생 시 바로 읽기, CPU 절약
void buildStraightPipeThumpTable() {
  int attackS  = (int)(THUMP_ATTACK_MS  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(THUMP_BODY_MS    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(THUMP_TAIL_MS    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(THUMP_REBOUND_DELAY_MS * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen  = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;  // 반동 잔향 추가

  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1   = 0.0f;  // 기본 주파수 위상
  float phase2   = 0.0f;  // 2차 고조파 위상
  float phase3   = 0.0f;  // 3차 고조파 위상
  float phaseSub = 0.0f;  // 서브 저역 위상

  float noiseLP1 = 0.0f;  // 저역 통과 필터 상태 1
  float noiseLP2 = 0.0f;  // 저역 통과 필터 상태 2
  uint32_t seed  = 24681357;

  for (int i = 0; i < totalLen; i++) {

    // --- 메인 엔벨로프 계산(어택→본체→감쇠)---
    float env1 = 0.0f;

    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;  // 제곱으로 어택을 더 강하게
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    // --- 반동 엔벨로프 계산(지연 후 작은 에코)---
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
      env2 *= THUMP_REBOUND_GAIN;  // 반동은 본체보다 훨씬 작음
    }

    float env = clampf(env1 + env2, 0.0f, 1.5f);

    // --- 주파수가 시간에 따라 하강(배기 압력 방출 후 음정 하강 모방)---
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

    // --- 톤 부분 합성: 기본 주파수 + 고조파 + 서브 저역 ---
    float base = fastSin(phase1);
    base = tanhf(base * THUMP_DRIVE);  // 소프트 클리핑, 배기관의 비선형 왜곡 모방

    float tonal =
        0.82f          * base
      + THUMP_TONE2_MIX * fastSin(phase2)
      + THUMP_TONE3_MIX * fastSin(phase3)
      + THUMP_SUB_MIX   * fastSin(phaseSub);

    // --- 노이즈 부분 합성: 기류가 뿜어나오는 쉬익 소리 모방 ---
    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);   // 2단 로우패스, 노이즈를 더 저역으로
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;     // 대역 통과 효과

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;  // 후반부 기류 소리 약화

    float air = bandNoise * (THUMP_NOISE_MIX * (0.25f * env + THUMP_BURST_MIX * 0.75f * earlyEnv));

    // --- 톤과 기류를 혼합, 다시 비대칭 소프트 클리핑 ---
    float sample = tonal * env + air;
    sample += 0.08f * env * env1;  // 가벼운 비선형 겹침, 소리에 질감 부여

    if (sample > 0.0f) {
      sample = tanhf(sample * 1.15f) * 1.05f;  // 양의 반주기 살짝 밀어올림
    } else {
      sample = tanhf(sample * 0.85f);           // 음의 반주기 살짝 누름
    }

    sample *= THUMP_TABLE_GAIN;
    thumpTable[i] = clampf(sample, -1.0f, 1.0f);
  }

  thumpTableLen = totalLen;

  Serial.printf("펑 테이블 생성 완료, 길이=%d samples, 약 %d ms\n",
    thumpTableLen,
    (int)((float)thumpTableLen * 1000.0f / SAMPLE_RATE));
}

// ================= 5단계: I2S 드라이버 초기화 =================
void initI2S() {
  i2s_config_t i2s_config = {
    .mode                = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate         = SAMPLE_RATE,
    .bits_per_sample     = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format      = I2S_CHANNEL_FMT_RIGHT_LEFT,   // 스테레오(좌우 각각)
    .communication_format= I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags    = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count       = DMA_BUF_COUNT,
    .dma_buf_len         = DMA_BUF_LEN,
    .use_apll            = false,
    .tx_desc_auto_clear  = true,   // 전송 완료 후 자동 0으로 초기화, 잡음 방지
    .fixed_mclk          = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK,
    .ws_io_num    = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num  = I2S_PIN_NO_CHANGE  // 송신 전용, 수신 없음
  };

  esp_err_t err;

  err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("I2S 드라이버 설치 실패: %d\n", (int)err);
    while (1) delay(100);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("I2S 핀 설정 실패: %d\n", (int)err);
    while (1) delay(100);
  }

  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S 초기화 완료");
}

// ================= 스로틀 업데이트(throttleTask에서 20ms마다 호출)=================
void updateThrottle() {

  // 버튼 처리: 누르면 엔코더 위치와 스로틀을 함께 0으로
  if (encoderButtonPressed) {
    encoderButtonPressed = false;
    encoderPosition = 0;
    targetThrottle  = 0.0f;
    Serial.println(">>> 버튼 누름: 스로틀 0!");
  }

  // 엔코더 위치 범위 제한, 계속 돌려도 0~만 스로틀 범위 벗어나지 않도록
  int maxSteps = (int)(1.0f / ENCODER_STEP_SIZE);  // 기본 10 스텝이면 만 스로틀

  if (encoderPosition < 0)        encoderPosition = 0;
  if (encoderPosition > maxSteps) encoderPosition = maxSteps;

  // 스텝 수를 0.0~1.0 스로틀 값으로 변환
  targetThrottle = clampf((float)encoderPosition * ENCODER_STEP_SIZE, 0.0f, 1.0f);

  // 부드러운 전환: 매번 작은 스텝만 이동, 스로틀 급변으로 인한 소리 튐 방지
  throttleValue += (targetThrottle - throttleValue) * ENCODER_SMOOTHING;
  throttleValue  = clampf(throttleValue, 0.0f, 1.0f);

  // 스로틀에 따라 목표 회전수 계산
  targetRPM = RPM_IDLE + throttleValue * (RPM_MAX - RPM_IDLE);
}

// ================= 오디오 생성 작업(코어 1에서 실행, 최고 우선순위)=================
void audioTask(void *param) {
  float crankPhase = 0.0f;   // 크랭크축 위상, 모든 실린더를 구동

  float bgLpf    = 0.0f;    // 배경음 로우패스 필터 상태
  float bgHpfIn  = 0.0f;    // 배경음 하이패스 필터 입력
  float bgHpfOut = 0.0f;    // 배경음 하이패스 필터 출력

  int   playPosA = -1;       // 펑 A 보이스의 현재 재생 위치(-1은 비활성)
  int   playPosB = -1;       // 펑 B 보이스(이전 펑의 페이드아웃)
  float gainA    = 1.0f;
  float gainB    = 0.55f;

  int  samplesToNextTrigger = 0;   // 다음 펑 트리거까지 남은 샘플 수
  bool altToggle = false;          // 교대 실린더 전환 플래그

  float thumpLpf  = 0.0f;   // 펑 로우패스 필터 상태
  float outHpfIn  = 0.0f;   // 출력 하이패스 필터 입력
  float outHpfOut = 0.0f;   // 출력 하이패스 필터 출력

  uint32_t jitterSeed = 987654321;

  unsigned long audioStartMs = millis();

  Serial.println("오디오 작업 시작");

  while (true) {

    // --- 회전수 평활 추종(실제 엔진 관성 모방)---
    currentRPM += (targetRPM - currentRPM) * RPM_SMOOTHING;

    // 현재 회전수의 0.0~1.0 정규화 값
    float rpmNorm = clampf((currentRPM - RPM_IDLE) / (RPM_MAX - RPM_IDLE), 0.0f, 1.0f);

    // 크랭크축의 샘플당 위상 증가량(4행정÷2)
    float cycleIncrement = ((currentRPM / 60.0f) / (float)SAMPLE_RATE) / 2.0f;

    // 현재 펑 주파수
    float thumpHz = THUMP_HZ_IDLE + rpmNorm * (THUMP_HZ_MAX - THUMP_HZ_IDLE);
    currentThumpHz = thumpHz;

    // 볼륨이 회전수에 따라 변화
    float bgGain = BACKGROUND_GAIN_IDLE + rpmNorm * (BACKGROUND_GAIN_MAX - BACKGROUND_GAIN_IDLE);
    float thumpLayerGain = THUMP_LAYER_GAIN_IDLE + rpmNorm * (THUMP_LAYER_GAIN_MAX - THUMP_LAYER_GAIN_IDLE);

    // 로우패스 컷오프 주파수가 회전수와 함께 상승(고회전 시 배경음 더 밝게)
    float bgLpfAlpha = 0.16f + 0.55f * rpmNorm;

    // 시작 페이드인(전원 투입 순간의 팝 소리 방지)
    float fadeIn = clampf((float)(millis() - audioStartMs) / 1800.0f, 0.0f, 1.0f);

    // --- 샘플별 오디오 생성 ---
    for (int i = 0; i < DMA_BUF_LEN; i++) {

      // ====================================================
      // 레이어 1: 배경 엔진음 — 8개 실린더의 중첩된 배기 펄스
      // ====================================================
      float bg = 0.0f;

      for (int cyl = 0; cyl < NUM_CYLINDERS; cyl++) {
        float phase = crankPhase - cylinderPhase[cyl];
        while (phase < 0.0f) phase += 1.0f;
        while (phase >= 1.0f) phase -= 1.0f;

        float pulse = generateCylinderPulse(phase);
        float cylGain = (cyl % 2 == 0) ? 1.0f : 0.82f;  // 홀수/짝수 실린더 약간 차이, 더 사실적
        bg += pulse * cylGain;
      }

      bg /= (float)NUM_CYLINDERS * 0.42f;

      // 고조파 레이어 추가(저역 중심, 고조파 윙윙거림 감소)
      float basePhase  = crankPhase * 4.0f;
      float harmonics  = 0.0f;

      harmonics += fastSin(basePhase)        * 1.00f;
      harmonics += fastSin(basePhase * 0.5f) * 0.60f;   // 반주파수: 저음감 강조
      harmonics += fastSin(basePhase * 1.5f) * 0.28f;
      harmonics += fastSin(basePhase * 2.0f) * (0.25f + 0.10f * rpmNorm);
      harmonics += fastSin(basePhase * 3.0f) * (0.08f + 0.08f * rpmNorm);
      harmonics += fastSin(basePhase * 4.0f) * (0.03f * rpmNorm);  // 4차 고조파는 윙윩 소리 원인, 아주 낮게
      harmonics /= 2.4f;

      bg = bg * 0.55f + harmonics * 0.45f;
      bg = tanhf(bg * (1.05f + rpmNorm * 0.8f));  // 소프트 클리핑, 배기관 비선형성 모방

      // 저역 기계 노이즈 추가(웅웅거림, 쉬익 아님)
      float rumble   = pseudoRandom();
      float rumble2  = pseudoRandom();
      bg += (rumble * 0.6f + rumble2 * 0.4f) * (0.008f + 0.018f * rpmNorm);

      // 로우패스(소리가 배기관에서 나오는 듯 더 둔탁하게)
      float bgLpfAlpha2 = 0.18f + 0.45f * rpmNorm;
      bgLpf += bgLpfAlpha2 * (bg - bgLpf);
      bg = bgLpf;

      // 가벼운 하이패스(DC 오프셋 제거)
      float bgHp = 0.992f * (bgHpfOut + bg - bgHpfIn);
      bgHpfIn  = bg;
      bgHpfOut = bgHp;
      bg = bg * 0.92f + bgHp * 0.08f;

      bg *= bgGain;

      // ====================================================
      // 레이어 2: 메인 펑 소리 — 튜닝 스트레이트 파이프 효과
      // ====================================================

      // 타이밍이 오면 새 펑 한 번 트리거
      if (samplesToNextTrigger <= 0) {

        // 이전 펑을 B 보이스로 페이드아웃(꼬리 겹침)
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.50f;
        }

        playPosA = 0;

        // 홀짝 교대: V8 실린더 간 점화 세기 차이 모방
        gainA = altToggle ? THUMP_ALT_GAIN : 1.0f;

        // 다음 트리거까지 간격 계산(스윙과 지터 추가로 리듬 그루브감)
        float intervalSamples = (float)SAMPLE_RATE / thumpHz;
        float swingFactor = altToggle ? (1.0f - THUMP_SWING) : (1.0f + THUMP_SWING);
        float jitter = 1.0f + localRandSigned(jitterSeed) * 0.025f;

        samplesToNextTrigger = (int)clampf(intervalSamples * swingFactor * jitter, 1.0f, 999999.0f);
        altToggle = !altToggle;
      }

      samplesToNextTrigger--;

      float thump = 0.0f;

      // A 보이스 읽기
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) {
          thump += thumpTable[playPosA++] * gainA;
        } else {
          playPosA = -1;
        }
      }

      // B 보이스 읽기(이전 펑의 페이드아웃 잔향)
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) {
          thump += thumpTable[playPosB++] * gainB;
          gainB *= 0.9992f;  // 느린 페이드아웃
        } else {
          playPosB = -1;
        }
      }

      // 로우패스로 펑 소리 가장자리를 더 둥글게, 딱딱하지 않게
      thumpLpf += 0.58f * (thump - thumpLpf);
      thump = thumpLpf * thumpLayerGain;

      // ====================================================
      // 레이어 3: 두 레이어 혼합 후 출력
      // ====================================================
      float sample = bg + thump;

      // 최종 출력 하이패스(저역 DC 드리프트 제거)
      float outHp = 0.988f * (outHpfOut + sample - outHpfIn);
      outHpfIn  = sample;
      outHpfOut = outHp;
      sample = sample * 0.86f + outHp * 0.14f;

      // 전체 소프트 클리핑(두 레이어 중첩 시 과부하 팝 방지)
      sample = tanhf(sample * (1.05f + 0.22f * rpmNorm));

      sample *= MASTER_VOLUME * fadeIn;
      sample  = clampf(sample, -0.98f, 0.98f);

      // 16bit PCM으로 변환, 좌우 채널 동일(모노 스피커)
      int16_t out = (int16_t)(sample * PCM_OUTPUT_SCALE);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;

      // 크랭크축 위상 전진
      crankPhase += cycleIncrement;
      if (crankPhase >= 1.0f) crankPhase -= 1.0f;
    }

    // 이번 배치 오디오 데이터를 I2S DMA에 기록, 다 쓴 후 다음 배치 생성
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= 스로틀 작업(코어 0에서 실행, 낮은 우선순위)=================
void throttleTask(void *param) {
  while (true) {
    updateThrottle();
    vTaskDelay(pdMS_TO_TICKS(20));  // 20ms마다 스로틀 업데이트, 충분히 매끄러움
  }
}

// ================= 시리얼 모니터 작업(코어 0에서 실행, 최하 우선순위)=================
void monitorTask(void *param) {
  char buf[128];

  while (true) {
    int rpmInt      = (int)(currentRPM + 0.5f);
    int targetInt   = (int)(targetRPM  + 0.5f);
    int throttlePct = (int)(throttleValue * 100.0f + 0.5f);
    int thumpHz10   = (int)(currentThumpHz * 10.0f + 0.5f);

    snprintf(buf, sizeof(buf),
      "RPM=%d  목표=%d  스로틀=%d%%  엔코더=%d  펑주파수=%d.%dHz",
      rpmInt, targetInt, throttlePct, encoderPosition,
      thumpHz10 / 10, thumpHz10 % 10);

    Serial.println(buf);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

// ================= setup: 시스템 초기화 =================
void setup() {
#if DISABLE_BROWNOUT_FOR_TEST
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  Serial.begin(115200);
  delay(1000);

  // 시작 시 메모리 상태 확인(PSRAM이 0이면 드라이브가 안 올라온 것, QSPI로 수정 필요)
  Serial.printf("온칩 SRAM 남은 용량: %d 바이트\n", ESP.getFreeHeap());
  Serial.printf("외장 PSRAM 남은 용량: %d 바이트\n", ESP.getFreePsram());

  Serial.println("====================================");
  Serial.println("ESP32-S3 V8 사운드 시뮬레이터");
  Serial.println("메인 펑 소리: 튜닝 스트레이트 파이프");
  Serial.println("스로틀 제어: KY-040 로터리 엔코더");
  Serial.println("====================================");

  initEncoder();
  initSineTable();
  initCylinderPhases();
  buildStraightPipeThumpTable();
  initI2S();

  // 오디오 작업: 코어 1, 최고 우선순위, 12KB 스택
  xTaskCreatePinnedToCore(audioTask,    "AudioTask", 12288, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  // 스로틀 작업: 코어 0, 우선순위 2, 3KB 스택
  xTaskCreatePinnedToCore(throttleTask, "Throttle",  3072,  NULL, 2,                        NULL, 0);
  // 모니터 작업: 코어 0, 최하 우선순위, 4KB 스택(너무 작게 주면 스택 오버플로우)
  xTaskCreatePinnedToCore(monitorTask,  "Monitor",   4096,  NULL, 1,                        NULL, 0);

  Serial.println("시스템 시작 완료, 엔코더를 돌려 스로틀 제어, 누르면 0으로");
}

// loop는 사실상 유휴 상태, 모든 작업은 FreeRTOS 작업으로 위임
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

### 코드 설명

전체 프로그램은 FreeRTOS로 스케줄링되는 세 개의 병렬 작업으로 구성되며, 서로 간섭하지 않습니다:

| 작업 | 실행 코어 | 우선순위 | 역할 |
|------|------------|--------|--------|
| `audioTask` | 코어 1 | 최고 | 샘플별 오디오 합성, I2S DMA에 기록 |
| `throttleTask` | 코어 0 | 중간 | 20ms마다 엔코더 읽고 스로틀 업데이트 |
| `monitorTask` | 코어 0 | 최하 | 700ms마다 시리얼에 상태 출력 |

**소리 합성의 핵심 로직은 세 레이어로 나뉩니다:**

**첫 번째 레이어: 배경 엔진음.** 8개 실린더가 각자 위상을 유지하고, 각 실린더는 V8의 점화 각도(0°, 90°, 150°…450°)에 따라 순차적으로 배기 펄스 파형을 트리거합니다. 8개 실린더 출력을 합치면 그 연속적인 낮은 웅웅거림이 됩니다. 실린더 펄스 위에 기본 주파수와 몇 차 고조파를 더해 엔진음의 층위를 만듭니다.

**두 번째 레이어: 메인 펑 소리.** 일정 간격(`thumpHz`로 빈도 결정)마다 미리 계산된 펑 파형 테이블에서 완전한 "펑" 소리를 한 번 읽어 재생합니다. 펑 자체는 어택→본체→감쇠 3단 엔벨로프에 주파수 하강(배기 압력 방출 모방)과 반동 지연(파이프 공명 모방)을 더해, 튜닝 스트레이트 파이프 포탈 소리처럼 들립니다.

**세 번째 레이어: 혼합 출력.** 두 레이어를 합친 뒤 전체 소프트 클리핑으로 팝 방지, 페이드인 계수(부팅 순간 팝 방지)를 곱하고, 마지막으로 16bit 스테레오 PCM으로 변환해 I2S에 전달합니다.



## 펑 소리 샘플 디버깅 도구(선택)

적합한 배기 소리를 빠르게 찾기 위해, 시리얼 순환 재생 테스트 코드를 별도로 만들었습니다: 30개의 프리셋 파라미터가 내장되어 있고, 시리얼 명령으로 전환하며 어떤 "펑" 소리가 취향에 맞는지 직접 비교할 수 있습니다. 메인 프로그램에 최종 사용된 것은 23번 "튜닝 스트레이트 파이프"입니다.

```c
/*
 * ESP32-S3 + MAX98357A
 * 펑 소리 샘플 순환 테스터 V2
 * 30개 샘플 + 볼륨 대폭 향상
 *
 * 배선:
 *   BCLK -> GPIO16
 *   LRC  -> GPIO17
 *   DIN  -> GPIO15
 *
 * 시리얼 명령(115200):
 *   n     다음
 *   p     이전
 *   r     다시 재생
 *   s     자동 순환 정지
 *   a     자동 순환 시작
 *   b     배경 베이스 레이어 켜기/끄기
 *   1~30  해당 번호로 점프
 *   h     도움말
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

// ================= 샘플 파라미터 구조체 =================
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
  {"01 깊은 대배기량",               12,  65, 100,  55,  42,  34,  0.18, 0.24, 0.08, 0.28, 1.7, 0.18, 44, 0.22, 1.00, 0.00, 2.8, 0.20},
  {"02 더 둥글고 밀도 있게",         14,  75, 130,  52,  40,  32,  0.12, 0.18, 0.04, 0.32, 1.5, 0.10, 50, 0.18, 1.00, 0.00, 2.9, 0.16},
  {"03 소형 혼 강조 A",              7,  42,  65, 100,  80,  65,  0.16, 0.30, 0.14, 0.06, 1.6, 0.16, 32, 0.14, 1.00, 0.00, 2.6, 0.12},
  {"04 소형 혼 강조 B",              5,  35,  55, 120,  95,  78,  0.14, 0.36, 0.20, 0.04, 1.7, 0.12, 26, 0.12, 1.00, 0.00, 2.5, 0.10},
  {"05 미국식 V8 아이들",             9,  55,  95,  72,  56,  44,  0.22, 0.26, 0.10, 0.14, 1.8, 0.24, 42, 0.30, 0.80, 0.20, 2.7, 0.22},
  {"06 더 부글거림 불균일",         11,  58, 105,  68,  52,  42,  0.24, 0.22, 0.08, 0.18, 1.8, 0.22, 54, 0.38, 0.72, 0.26, 2.8, 0.24},
  {"07 역압 뚜렷 이중 펑",           8,  48,  85,  80,  62,  48,  0.20, 0.26, 0.12, 0.12, 1.7, 0.20, 58, 0.48, 0.88, 0.14, 2.6, 0.18},
  {"08 거친 폭발",                   6,  40,  68,  90,  72,  56,  0.28, 0.32, 0.16, 0.08, 2.2, 0.32, 34, 0.22, 0.90, 0.10, 2.5, 0.15},
  {"09 매우 두껍고 둔탁",           16,  85, 150,  48,  38,  30,  0.08, 0.14, 0.02, 0.36, 1.6, 0.06, 58, 0.20, 1.00, 0.00, 3.0, 0.14},
  {"10 짧고 강한 펀치",              4,  28,  45, 100,  78,  60,  0.14, 0.38, 0.20, 0.04, 1.8, 0.12, 22, 0.10, 1.00, 0.00, 2.4, 0.10},
  {"11 쉰 배기관",                   8,  50,  88,  82,  64,  50,  0.32, 0.24, 0.10, 0.10, 1.9, 0.34, 40, 0.26, 0.86, 0.12, 2.6, 0.16},
  {"12 저역 헤비 캐논",             13,  68, 115,  58,  46,  36,  0.14, 0.20, 0.06, 0.30, 1.8, 0.14, 48, 0.26, 1.00, 0.00, 2.9, 0.20},
  {"13 중역 펀치 깔끔",              6,  36,  58, 130, 100,  78,  0.10, 0.40, 0.24, 0.02, 1.6, 0.08, 28, 0.10, 1.00, 0.00, 2.4, 0.08},
  {"14 이중 펄스 구구",              7,  44,  78,  85,  66,  52,  0.18, 0.28, 0.14, 0.10, 1.8, 0.20, 20, 0.45, 0.82, 0.18, 2.6, 0.16},
  {"15 구형 V8 느슨한 느낌",       10,  60, 108,  72,  55,  44,  0.24, 0.22, 0.08, 0.16, 1.7, 0.20, 52, 0.32, 0.68, 0.30, 2.7, 0.22},
  {"16 초두꺼움 테스트",           15,  95, 160,  54,  42,  32,  0.06, 0.14, 0.02, 0.38, 1.6, 0.04, 64, 0.18, 1.00, 0.00, 3.2, 0.12},
  {"17 할리 데이비슨 스타일",        8,  52,  90,  78,  58,  46,  0.26, 0.24, 0.10, 0.16, 1.9, 0.26, 48, 0.35, 0.65, 0.32, 2.8, 0.25},
  {"18 스포츠카 고회전 날카로움",    4,  30,  50, 140, 110,  88,  0.12, 0.42, 0.28, 0.02, 1.8, 0.10, 20, 0.08, 1.00, 0.00, 2.3, 0.08},
  {"19 디젤 턱턱",                 14,  48,  80,  65,  50,  42,  0.30, 0.18, 0.06, 0.20, 2.0, 0.28, 38, 0.40, 0.75, 0.22, 2.7, 0.20},
  {"20 대배기량 크루저",           12,  72, 125,  60,  45,  36,  0.16, 0.20, 0.06, 0.34, 1.7, 0.12, 55, 0.24, 1.00, 0.00, 3.0, 0.18},
  {"21 초강력 폭발",                3,  25,  40, 110,  85,  68,  0.35, 0.34, 0.18, 0.06, 2.5, 0.40, 18, 0.15, 0.92, 0.08, 2.4, 0.12},
  {"22 부드러운 대배기량",         16,  90, 140,  50,  40,  34,  0.10, 0.16, 0.04, 0.30, 1.4, 0.06, 60, 0.16, 1.00, 0.00, 3.0, 0.10},
  {"23 튜닝 스트레이트 파이프",     5,  38,  62, 105,  82,  64,  0.22, 0.30, 0.16, 0.08, 2.1, 0.28, 30, 0.18, 0.94, 0.06, 2.5, 0.14},
  {"24 저음 + 강한 역압",         10,  58,  95,  65,  50,  40,  0.18, 0.22, 0.08, 0.22, 1.8, 0.16, 65, 0.52, 0.85, 0.16, 2.8, 0.20},
  {"25 기류 폭발형",                6,  35,  55,  88,  68,  52,  0.38, 0.20, 0.08, 0.10, 1.7, 0.45, 28, 0.14, 1.00, 0.00, 2.5, 0.12},
  {"26 3기통 턱턱감",              10,  45,  75,  74,  58,  46,  0.20, 0.22, 0.10, 0.14, 1.8, 0.20, 36, 0.30, 0.60, 0.35, 2.6, 0.18},
  {"27 초저역 캐논 테스트",        18, 100, 180,  42,  32,  26,  0.06, 0.12, 0.02, 0.42, 1.5, 0.04, 70, 0.20, 1.00, 0.00, 3.4, 0.08},
  {"28 강렬한 펀치형",              5,  32,  48,  95,  75,  58,  0.16, 0.34, 0.18, 0.06, 2.0, 0.16, 24, 0.12, 1.00, 0.00, 2.6, 0.10},
  {"29 풀대역 웅웅",                8,  55,  90,  85,  65,  50,  0.20, 0.28, 0.14, 0.18, 1.9, 0.22, 42, 0.28, 0.88, 0.12, 2.8, 0.20},
  {"30 극단 대비 테스트",           3,  20,  35, 150, 120,  90,  0.40, 0.44, 0.28, 0.02, 2.4, 0.45, 16, 0.08, 1.00, 0.00, 2.2, 0.06},
};

const int NUM_PRESETS = sizeof(presets) / sizeof(presets[0]);

// ================= 초기화 =================
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

// ================= 파형 테이블 빌드 =================
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

// ================= 시리얼 제어 =================
void showHelp() {
  Serial.println();
  Serial.println("===== 명령 =====");
  Serial.println("n     다음");
  Serial.println("p     이전");
  Serial.println("r     다시 재생");
  Serial.println("s     자동 순환 정지");
  Serial.println("a     자동 순환 시작");
  Serial.println("b     배경 켜기/끄기");
  Serial.println("1~30  번호로 점프");
  Serial.println("h     도움말");
  Serial.println("================");
}

void printPresetInfo(int idx) {
  Serial.println();
  Serial.println("========================================");
  Serial.print("샘플 #");
  Serial.print(idx + 1);
  Serial.print(" / ");
  Serial.println(NUM_PRESETS);
  Serial.println(presets[idx].name);
  Serial.print("앞 2.5초 느린 펑, 뒤 2.5초 빠른 펑, 배경:");
  Serial.println(backgroundEnabled ? "켜짐" : "꺼짐");
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
  if (cmd == "s") { autoPlay = false; Serial.println("자동 순환 정지됨"); return; }
  if (cmd == "a") { autoPlay = true; lastSwitchMs = millis(); Serial.println("자동 순환 시작됨"); return; }
  if (cmd == "b") { backgroundEnabled = !backgroundEnabled; Serial.print("배경: "); Serial.println(backgroundEnabled ? "켜짐" : "꺼짐"); return; }
  if (cmd == "h") { showHelp(); return; }

  int n = cmd.toInt();
  if (n >= 1 && n <= NUM_PRESETS) { requestPreset(n - 1); return; }

  Serial.print("알 수 없음: ");
  Serial.println(cmd);
}

// ================= 오디오 작업 =================
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

      // ★ 핵심: 최종 출력 게인 대폭 향상
      sample *= 1.8f;

      sample = tanhf(sample * 1.1f);
      sample = clampf(sample, -0.98f, 0.98f);

      // ★ 풀 스케일 출력
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
  Serial.println("펑 소리 샘플 순환 테스터 V2");
  Serial.println("30개 샘플 + 대볼륨 버전");
  Serial.println("====================================");

  initSineTable();
  initI2S();
  showHelp();
  requestPreset(0);

  xTaskCreatePinnedToCore(audioTask, "Audio", 10240, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  Serial.println("재생 시작...");
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

## 자주 묻는 질문 트러블슈팅

당황하지 마세요. 90%의 문제는 아래 몇 곳에서 발생합니다. 하나씩 대조하면 대부분 해결됩니다:

**전원 투입 후 스피커에서 소리가 전혀 안 남**

먼저 SD 핀을 확인하세요. MAX98357A의 SD 핀이 의도치 않게 LOW로 당겨졌다면(예: GND에 닿았거나 플로팅 상태가 아니면) 모듈이 뮤트 모드로 진입합니다. SD 핀을 플로팅하거나 3.3V에 연결하고 다시 전원을 넣어보세요. 이어서 시리얼 모니터로 I2S 초기화에 오류가 없는지, "I2S 드라이버 설치 실패"라는 메시지가 출력되는지 확인하세요.

**소리가 매우 작아서 거의 안 들림**

먼저 스피커 임피던스를 확인하세요. MAX98357A는 4Ω 스피커에 3W를 출력하지만 8Ω 스피커에는 약 1.4W만 출력되어 볼륨이 절반입니다. 다음으로 VIN이 5V에 연결되었는지 확인하세요. 3.3V에 연결하면 출력이 크게 떨어집니다. 또 코드의 `PCM_OUTPUT_SCALE`를 26000에서 30000으로 높일 수 있지만 32767을 넘기면 안 됩니다. 초과하면 오버플로우 왜곡이 발생합니다.

**엔코더 회전 방향이 반대임(시계 방향이 감소, 반시계 방향이 증가)**

`encoderISR()`에서 `encoderPosition++`와 `encoderPosition--`를 서로 바꾸거나, CLK와 DT의 물리적 배선을 직접 서로 바꾸세요. 둘 중 하나 선택.

**부팅 직후 바로 크래시되며 재부팅되고, 시리얼에 `Stack canary watchpoint triggered` 표시**

이것은 어떤 FreeRTOS 작업의 스택 오버플로우입니다. 오류 메시지에 작업 이름이 표시됩니다(예: `Monitor`). 해당 작업을 찾아 `xTaskCreatePinnedToCore`의 스택 크기(세 번째 숫자)를 키우세요. Monitor 작업은 최소 4096, 부족하면 8192로.

**시리얼에 `OOM: failed to allocate XXX bytes` 표시**

메모리 부족입니다. 다음 순서로 확인하세요:

1. Arduino IDE의 **Tools → PSRAM**이 선택되어 있는지, 반드시 **QSPI PSRAM**이어야 함(OPI가 아님)
2. `setup()` 시작 부분에 `Serial.printf("PSRAM: %d\n", ESP.getFreePsram());` 추가, 다시 업로드 후 시리얼 확인. 0이면 PSRAM이 드라이브되지 않은 것이므로 옵션을 수정하세요
3. 개발 보드 모델에 외장 PSRAM이 있는지 확인(ESP32-S3-WROOM-1-**N16R8**의 R8이 8MB PSRAM을 의미)

**소리에 규칙적인 팝이나 잡음이 섞임**

대부분 공통 접지 문제입니다. ESP32-S3의 GND와 MAX98357A의 GND는 같은 선에 연결되어야 하며, 두 개의 다른 전원 접지에 나누어 연결하면 안 됩니다. 멀티미터로 두 GND 사이의 저항을 측정하면 0Ω에 가까워야 합니다.

---

## FAQ

**Q: ESP32-S3의 GPIO16/17/15가 점유되어 있는데, 다른 핀으로 바꿀 수 있나요?**
A: 가능합니다. I2S 핀은 자유롭게 임의 GPIO로 매핑할 수 있습니다. 코드 상단의 `I2S_BCLK`, `I2S_LRC`, `I2S_DOUT` 세 매크로를 원하는 핀 번호로 바꾸면 됩니다. 단, GPIO 0, 1, 2, 3, 43, 44는 특수 용도가 있으므로 피하는 것을 권장합니다.

**Q: 스피커 두 개를 연결해 스테레오로 만들 수 있나요?**
A: MAX98357A는 모노 증폭기입니다. 스테레오로 만들려면 모듈 두 개가 필요하며, 한 개는 좌 채널, 한 개는 우 채널에 연결하고 GAIN 핀 접지 방법으로 구분합니다(한 개는 GND = 우 채널, 한 개는 플로팅 = 좌 채널). 코드에서 두 채널의 PCM 데이터는 현재 같으며(`stereoBuffer[i*2] = stereoBuffer[i*2+1] = out`), 진정한 스테레오를 원하면 합성 로직도 수정해야 합니다.

**Q: 샘플링 레이트 22050Hz면 충분한가요? 44100Hz로 바꿀 수 있나요?**
A: 22050Hz는 엔진 소리 같은 중저역 대역에 충분하며 최대 11025Hz까지 재현할 수 있습니다. 사람의 엔진 사운드 인식은 주로 50Hz~4kHz 사이입니다. 44100Hz로 변경하는 것은 이론적으로 가능하지만 CPU 부하가 두 배가 되므로, 테스트 시 안정성을 먼저 확인하고 `SAMPLE_RATE`와 I2S 설정의 `sample_rate`를 함께 수정하세요.

**Q: 5V 전원을 연결하면 ESP32-S3이 타지 않나요?**
A: MAX98357A의 VIN은 5V에 연결되지만, 신호 핀(BCLK, LRC, DIN)은 3.3V 레벨이므로 ESP32-S3의 GPIO에 직접 연결할 수 있고 레벨 변환이 필요 없습니다. ESP32-S3의 GPIO는 3.3V를 출력하고 MAX98357A가 이를 인식할 수 있어 안전합니다.

**Q: 아이들 시 소리가 너무 작아서 잘 안 들립니다. 키울 수 있나요?**
A: `BACKGROUND_GAIN_IDLE`(기본 0.45)과 `THUMP_LAYER_GAIN_IDLE`(기본 0.75)을 조정하세요. 두 값을 모두 올립니다. 예를 들어 0.6과 1.0으로 바꾸면 아이들 볼륨이 눈에 띄게 향상됩니다. 조정 후 만 스로틀에서 팝 소리가 나지 않는지 테스트하고, 발생하면 `PCM_OUTPUT_SCALE`을 약간 낮추세요.

**Q: KY-040 엔코더를 한 단계 돌리면 스로틀이 10% 변하는데 너무 큽니다. 더 세밀하게 할 수 있나요?**
A: `ENCODER_STEP_SIZE`를 0.1에서 작게, 예를 들어 0.05로 바꾸면 한 단계당 5%가 되며, 만 스로틀까지 20단계를 돌려야 해서 조작감이 더 섬세해집니다.

**Q: 이 프로그램이 ESP32(S3 아님)에서도 동작하나요?**
A: 이론적으로 호환됩니다. I2S API는 범용이지만, 일반 ESP32는 외장 PSRAM이 없거나 작아서 이 프로젝트를 실행하면 메모리가 부족할 수 있습니다. 최소한 PSRAM이 있는 모델(예: ESP32-WROVER)을 권장합니다. GPIO 번호도 보드에 따라 다시 매핑해야 합니다.

---

## 확장 아이디어

기본 버전을 마친 뒤, 다음 방향으로 확장할 수 있습니다:

- **속도 센서 연결**: 홀 센서를 바퀴에 장착해 속도가 빨라지면 자동으로 스로틀이 커지게 하여 손을 해방
- **V6 / 직렬 4기통 / 오토바이 사운드로 교체**: `NUM_CYLINDERS`와 `firingAngles`를 수정해 점화 각도 세트를 바꾸면 다른 엔진이 됩니다
- **TFT 화면 추가**: 현재 회전수계와 스로틀 백분율을 표시해 계기판 느낌 재현
- **방수 케이스 추가**: 전기차에 장착해 사용. 비 오는 날에는 방수를 잘 해야 합니다. 회로에 물이 들어가는 게 소리가 안 나는 것보다 더 큰 문제니까요

---

## 참고 자료

- [MAX98357A 데이터시트(Analog Devices)](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [MAX98357A 제품 페이지(Analog Devices)](https://www.analog.com/en/products/max98357a.html)
- [ESP32-S3 기술 참조 매뉴얼(Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3-WROOM-1 제품 페이지(Espressif)](https://www.espressif.com/en/products/modules/esp32-s3)
- [ESP32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)
- [FreeRTOS 작업 생성 API 문서](https://www.freertos.org/a00125.html)
