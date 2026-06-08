---
title: "ESP32-S3 + INMP441 + GC9A01 DIY 원형 오디오 스펙트럼 분석기 | I2S + FFT + SPI 완전 튜토리얼"
boardId: esp32s3
moduleId: audio/inmp441
category: esp32
date: 2026-06-08
intro: "ESP32-S3로 INMP441 디지털 마이크의 I2S 오디오를 읽어들이고, 512포인트 FFT 분석 후 GC9A01 원형 TFT 화면에 16밴드 레인보우 스펙트럼 바를 실시간으로 그립니다. 완전한 배선, 라이브러리 설치 및 코드 주석 포함."
image: "https://img.lingflux.com/2026/06/7747ada90e61ba2360585e6934fbf7a7.jpg"
---

> **한 줄 요약**: ESP32-S3 + INMP441 마이크 + GC9A01 원형 화면으로 "춤추는" 원형 오디오 스펙트럼 분석기를 만듭니다. I2S + FFT + SPI 전체 과정 튜토리얼.

# ESP32-S3 + INMP441 + GC9A01로 "춤추는" 원형 오디오 스펙트럼 분석기 만들기 완전 튜토리얼 (I2S + FFT + SPI)

난이도: ⭐⭐⭐☆☆ (Arduino 기초만 있으면 시작 가능)
예상 소요 시간: 45분
테스트 환경:
Arduino IDE 2.3.8
GFX Library for Arduino v1.6.5
arduinoFFT v2.0.4

---

> **TL;DR (긴 설명 건너뛰기):**
> 1. **배선**: INMP441의 SD→GPIO4, WS→GPIO5, SCK→GPIO6, **L/R은 반드시 GND에 연결**
> 2. **배선**: GC9A01의 SCL→GPIO12, SDA→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 3. **라이브러리 설치**: GFX Library for Arduino (작성자 moononournation) + `arduinoFFT` (작성자 kosme)
> 4. **코드 복사, 업로드, 마이크에 대고 말하기** → 원 안의 레인보우 바가 춤을 춥니다

---

## 들어가며

1.28인치 원형 화면을 하나 샀는데, 참 재미있습니다. 원형은 사각형과는 다르게 활용할 수 있는 장면이 많습니다. 이번에는 INMP441 마이크 모듈과 함께 특별히 멋진 것을 만들어보겠습니다: **실시간 오디오 스펙트럼 시각화**.

"스펙트럼 분석기"라고 하면 Winamp 같은 지난 세기 스타일의 막대 그래프가 먼저 떠오를 수 있습니다 (저도 예전에 컴퓨터에 설치해서, 음악을 들으며 깜빡이는 바를 한참 바라보곤 했습니다). 하지만 원형 스펙트럼은 다릅니다 — 16개의 레인보우색 바가 원심에서 바깥쪽으로 방사되고, 음량이 클수록 바가 길어지며, 각 바의 끝에는 흰색 피크 꼭지점이 천천히 떨어집니다... 솔직히 말하면, 이것을 바라보느라 5분 동안 밥을 먹으러 가지 못했습니다.

이 글에서는 **ESP32-S3 + INMP441 디지털 마이크 + GC9A01 원형 TFT 화면**을 사용하여, 배선부터 코드까지, 소리에 실시간으로 반응하는 원형 레인보우 스펙트럼 분석기를 만드는 방법을 단계별로 안내합니다. 기초적인 지식이 있는 메이커라면 45분 안에 결과를 볼 수 있습니다.

---

## 실험 결과

![](https://img.lingflux.com/2026/06/21a134efbde1457cff0817a7e18879f3.jpg)

- 마이크 오디오 실시간 캡처 (44.1kHz, 16bit)
- 512포인트 FFT 분석, 16개 주파수 밴드로 분할
- 원형 화면에 레인보우 바가 중심에서 바깥으로 방사, 피크 흰 점이 천천히 하강
- 약 20fps 새로고침, 육안으로 완전히 부드러움

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/nmPC6lKog0o" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 부품 설명

### GC9A01 원형 TFT 화면

일반 직사각형 화면이 "바형 휴대폰"이라면, GC9A01은 "스마트워치 페이스"입니다 — **1.28인치 원형 LCD, 드라이버 칩 이름이 GC9A01, SPI 버스 사용, 3.3V 동작**, 8개 선으로 구동할 수 있습니다.

| 파라미터 | 값 |
| --- | --- |
| 화면 크기 | 1.28인치 |
| 해상도 | 240 × 240 픽셀 |
| 인터페이스 | SPI (4선) |
| 작동 전압 | 3.3V |
| 드라이버 칩 | GC9A01 |
| 패널 타입 | IPS (전방위 시야각) |

선택 이유: 시장에서 가장 흔한 원형 소형 화면, Arduino_GFX 라이브러리가 기본 지원, 5줄 코드로 초기화, 함정이 거의 없음.

---

### INMP441 MEMS 디지털 마이크

INMP441은 **무지향성 MEMS 디지털 마이크**입니다. 쉽게 말하면: **디지털 I2S 신호를 직접 출력하므로 ADC를 연결할 필요가 없습니다**. 마치 동시통역사를 고용한 것과 같아서, 말하는 것을 MCU가 이해할 수 있는 디지털로 실시간 번역해주어 아날로그 신호의 번거로운 과정을 생략할 수 있습니다.

| 파라미터 | 값 |
| --- | --- |
| 인터페이스 | I2S (디지털 오디오) |
| 작동 전압 | 1.8V ~ 3.3V |
| 주파수 응답 | 60Hz ~ 15kHz |
| 신호대잡음비 | 61dBA |
| 감도 | -26dBFS (일반값) |
| 수음 방향 | 무지향성 |

선택 이유: I2S 인터페이스가 깔끔하고, 추가 ADC가 불필요하며, 61dBA 신호대잡음비는 대부분의 저가 아날로그 마이크보다 월등하여 스펙트럼 분석에 충분합니다.

> INMP441은 원래 InvenSense (이후 TDK에 인수됨)에서 생산되었으나, 공식적으로는 이미 **Obsolete (단종/생산중단)** 상태로 분류되어 있습니다. Mouser, DigiKey 등 주요 정규 부품 유통업체에서는 단종 라벨이 붙어 있습니다. 하지만 시장 (타오바오, 핀둬둬 등)에서는 몇 위안짜리 INMP441 파란색/검은색 소형 보드가 여전히 풍부하게 공급되고 있습니다. 이는 대륙 시장에 여전히 많은 **재고 잔여품**이 있거나, 시장에 일부 **호환/리퍼비시된 국산 칩**이 이 이름을 계속 사용하고 있기 때문입니다. 개인 DIY, 튜토리얼 작성 또는 간단한 데모를 실행하는 목적이라면 현재 구매할 수 있는 모듈도 여전히 사용 가능합니다.
>
> **따라서 제품 개발이 목적이라면 이 모델은 최우선 선택이 아닙니다.**

---

## BOM (부품 목록)

| 부품 | 모델 / 사양 | 수량 |
| --- | --- | --- |
| 메인 개발 보드 | ESP32-S3 (USB-C 포함) | 1 |
| 원형 TFT 화면 | GC9A01, 1.28인치, 240×240 | 1 |
| 디지털 마이크 | INMP441 I2S 모듈 | 1 |
| 점퍼 와이어 | | 약간 |

---

## 부품 핀 설명

### GC9A01 화면 핀

| 핀 | 기능 설명 |
| --- | --- |
| VCC | 전원 양극 (3.3V에 연결) |
| GND | 전원 음극 |
| SCL / CLK | SPI 클럭 |
| SDA / MOSI | SPI 데이터 (마스터 송신) |
| CS | 칩 선택 (Low 활성) |
| DC | 데이터 / 명령 선택 |
| RST | 리셋 (Low 트리거) |
| BL | 백라이트 제어 (3.3V에 연결하여 항상 켜기, 또는 GPIO에 연결하여 PWM으로 밝기 조절) |

### INMP441 마이크 핀

| 핀 | 기능 설명 |
| --- | --- |
| VDD | 전원 양극 (3.3V에 연결) |
| GND | 전원 음극 |
| SD | I2S 데이터 출력 (ESP32 데이터 입력에 연결) |
| WS | 워드 클럭 / 프레임 동기 (좌우 채널 선택) |
| SCK | 비트 클럭 |
| L/R | 채널 선택: GND에 연결 = 왼쪽 채널, 3.3V에 연결 = 오른쪽 채널, **플로팅 불가** |

---

## 배선 방법

**한 가닥 연결할 때마다 표를 대조하여 확인하면, 문제 해결 시간의 80%를 절약할 수 있습니다.**

### GC9A01 화면 배선

| 모듈 핀 | ESP32-S3 | 선 색상 참고 |
| --- | --- | --- |
| VCC | 3.3V | 빨강 |
| GND | GND | 회색 |
| SCL / CLK | GPIO12 | 노랑 |
| SDA / MOSI | GPIO11 | 파랑 |
| CS | GPIO9 | 초록 |
| DC | GPIO10 | 주황 |
| RST | GPIO18 | 보라 |
| BL | GPIO7 / 3.3V | 청록 |

### INMP441 마이크 배선

| 모듈 핀 | ESP32-S3 | 선 색상 참고 |
| --- | --- | --- |
| VDD | 3.3V | 빨강 |
| GND | GND | 회색 |
| SD | GPIO4 | 파랑 |
| WS | GPIO5 | 초록 |
| SCK | GPIO6 | 노랑 |
| L/R | GND (왼쪽 채널) | 회색 |

> ⚠️ **L/R은 반드시 연결해야 하며, 플로팅하면 안 됩니다.** 플로팅되면 채널 선택이 정의되지 않아, 수집된 데이터가 모두 노이즈가 되어 스펙트럼 바가 소리와 전혀 관계없이 마구跳动합니다 — 저도 이걸 어떻게 알게 되었는지 묻지 마세요.

####

- 반드시 **3.3V** 전원을 사용하고, 5V에 연결하지 마세요
- INMP441의 L/R 핀을 GND에 연결 = 왼쪽 채널 출력
- 배선을 먼저 완료한 후, 멀티미터로 전원과 접지를 테스트한 뒤 전원을 켜세요. 단락을 방지하기 위함입니다

---

## 설치 필요 라이브러리

**Arduino IDE → 도구 → 라이브러리 관리**에서 검색하여 설치:

| 라이브러리 이름 | 작성자 | 테스트 통과 버전 | 용도 |
| --- | --- | --- | --- |
| `Arduino_GFX_Library` | moononournation | v1.6.5 | GC9A01 화면 드라이버 |
| `arduinoFFT` | kosme | v2.0.4 | 고속 푸리에 변환 |

> I2S 드라이버 (`driver/i2s.h`)는 ESP32 내장 라이브러리이므로 추가 설치가 필요하지 않습니다.
>
> Arduino IDE는 **2.3.x 이상 버전**을 권장합니다. 구버전 1.x는 ESP32-S3 지원이 불안정합니다.

---

## 전체 코드

```cpp
#include <Arduino_GFX_Library.h>
#include <driver/i2s.h>
#include <arduinoFFT.h>

// ====== 1단계: 디스플레이 핀 정의 ======
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// ====== 2단계: 마이크 핀 정의 ======
#define I2S_WS    5
#define I2S_SD    4
#define I2S_SCK   6
#define I2S_PORT  I2S_NUM_0

// ====== FFT 파라미터 ======
#define SAMPLES   512
#define BANDS     16

// ====== GC9A01 디스플레이 초기화 ======
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0, true);

// ====== FFT 버퍼 ======
double vReal[SAMPLES];
double vImag[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>(
  vReal, vImag, SAMPLES, 44100);

// ====== 밴드 에너지 및 피크 ======
float bandValues[BANDS];
float peakValues[BANDS];
int16_t sampleBuf[SAMPLES];

// ====== 색상 유틸리티: HSL → RGB565 ======
uint16_t hslToRgb565(float h, float s, float l) {
  float c = (1.0f - fabsf(2.0f * l - 1.0f)) * s;
  float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
  float m = l - c / 2.0f;
  float r, g, b;
  if (h < 60)       { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  uint8_t R = (uint8_t)((r + m) * 31);
  uint8_t G = (uint8_t)((g + m) * 63);
  uint8_t B = (uint8_t)((b + m) * 31);
  return (R << 11) | (G << 5) | B;
}

// ====== 3단계: 마이크 I2S 초기화 ======
void setupMicrophone() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

void setup() {
  Serial.begin(115200);

  // 4단계: 백라이트 켜기, 디스플레이 초기화
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  gfx->begin();
  gfx->fillScreen(0x0000);

  // 5단계: 마이크 초기화
  setupMicrophone();

  memset(peakValues, 0, sizeof(peakValues));
}

// ====== 원형 스펙트럼 그리기 ======
void drawCircularSpectrum() {
  int cx = 120, cy = 120;
  int innerR = 25;
  int maxLen = 85;
  float angleStep = 2.0f * PI / BANDS;
  float barWidth = angleStep * 0.7f;

  gfx->fillScreen(0x0000);

  for (int i = 0; i < BANDS; i++) {
    float angle = i * angleStep - PI / 2.0f;
    float hue = (float)i / BANDS * 360.0f;
    float val = bandValues[i];
    int barLen = (int)(val * maxLen);

    for (int r = innerR; r < innerR + barLen; r += 2) {
      float t = (float)(r - innerR) / maxLen;
      uint16_t color = hslToRgb565(hue, 1.0f, 0.3f + t * 0.3f);
      float x1 = cx + cosf(angle - barWidth/2) * r;
      float y1 = cy + sinf(angle - barWidth/2) * r;
      float x2 = cx + cosf(angle + barWidth/2) * r;
      float y2 = cy + sinf(angle + barWidth/2) * r;
      gfx->drawLine(x1, y1, x2, y2, color);
    }

    if (peakValues[i] > 0.02f) {
      int peakR = innerR + (int)(peakValues[i] * maxLen) + 3;
      float px = cx + cosf(angle) * peakR;
      float py = cy + sinf(angle) * peakR;
      gfx->fillCircle(px, py, 2, 0xFFFF);
    }

    peakValues[i] *= 0.95f;
    if (bandValues[i] > peakValues[i]) {
      peakValues[i] = bandValues[i];
    }
  }
}

void loop() {
  // 6단계: 마이크 I2S 데이터 읽기
  size_t bytes_read = 0;
  i2s_read(I2S_PORT, sampleBuf, sizeof(sampleBuf),
           &bytes_read, portMAX_DELAY);

  // 7단계: 샘플 데이터로 FFT 실수부 채우기
  for (int i = 0; i < SAMPLES; i++) {
    vReal[i] = (double)sampleBuf[i];
    vImag[i] = 0.0;
  }

  // 8단계: FFT 실행
  FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  FFT.compute(FFT_FORWARD);
  FFT.complexToMagnitude();

  // 9단계: FFT 결과를 16개 밴드에 매핑
  memset(bandValues, 0, sizeof(bandValues));
  int specLen = SAMPLES / 2;
  for (int i = 0; i < BANDS; i++) {
    int start = (int)(pow((float)i / BANDS, 1.8f) * specLen * 0.7f);
    int end   = (int)(pow((float)(i+1) / BANDS, 1.8f) * specLen * 0.7f);
    if (end <= start) end = start + 1;
    float sum = 0;
    for (int j = start; j < end && j < specLen; j++) {
      sum += (float)vReal[j];
    }
    float avg = sum / (end - start);
    bandValues[i] = constrain(avg / 5000.0f, 0.0f, 1.0f);
  }

  // 10단계: 원형 스펙트럼 그리기
  drawCircularSpectrum();
}
```

---

## 코드 설명

**① 왜 SAMPLES = 512인가요?**
512는 2의 거듭제곱으로, FFT 알고리즘이 이 길이에서 가장 효율적으로 작동합니다. 44.1kHz 샘플링 레이트를 기준으로 512포인트 FFT의 주파수 해상도는 약 86Hz — 충분합니다. 256으로 변경하면 더 빠르지만 주파수 세부 사항이 줄어들고, 1024로 변경하면 더 세밀하지만 프레임 속도가 눈에 띄게 감소합니다.

**② 주파수 밴드 분포에 pow(..., 1.8)을 사용하는 이유는?**
선형적으로 밴드를 나누면 고주파 영역의 밴드에 데이터가 꽉 차고 저주파는 텅 비게 됩니다. 지수 분할법은 저주파 밴드를 더 좁게 (세밀하게), 고주파 밴드를 더 넓게 (노이즈 병합) 만들어 인간의 청각 주파수 인식 곡선에 더 가까워지고, 더 "자연스럽게" 보입니다.

**③ 5000으로 나누는 정규화 값은 어떻게 결정되나요?**
이 값은 마이크와 음원 사이의 거리, 환경 소음 등과 관련이 있습니다 — 상황에 따라 수동 조정이 필요합니다. 바가 항상 최대치에 도달한다면 (에너지가 잘리는 경우), 5000을 더 큰 값으로 변경하세요. 바가 너무 짧아서 거의 보이지 않는다면, 더 작은 값으로 변경하세요.

**④ peakValues[i] *= 0.95의 역할은?**
이것은 "피크 홀드 + 서서히 하강"의 고전적인 기법입니다: 소리가 갑자기 멈추어도 피크 흰 점이 즉시 사라지지 않고, 매 프레임마다 0.95를 곱하여 천천히 떨어집니다. 시각적으로 더 부드러우며, 전문 오디오 장비 같은 효과를 냅니다.

---

## 일반적인 문제 해결

**당황하지 마세요. 90%의 문제는 다음 몇 가지에서 발생합니다:**

**화면이 완전히 검은색, 아무것도 표시되지 않음**
먼저 백라이트 (BL 핀)가 실제로 High인지 확인하고 (모듈에 BL 핀이 없다면 무시 가능), SPI 4개 선 (SCK / MOSI / CS / DC)이 잘못 연결되거나 접촉 불량이 아닌지 확인하세요. 멀티미터로 VCC에 3.3V가 출력되는지 측정하세요. 백라이트는 켜지지만 화면이 완전히 검다면, 십중팔구 CS나 DC가 잘못 연결된 것입니다. 서로 바꿔서 시도해 보세요.

**스펙트럼 바가 전혀 움직이지 않거나, 소리와 관계없이 마구跳动함**
가장 먼저 할 일: **INMP441의 L/R 핀이 GND에 연결되어 있는지 확인** — 이것이 가장 흔한 함정입니다. L/R이 플로팅되면 채널 선택이 비정상이 되어, 수집된 데이터가 모두 랜덤 노이즈가 됩니다. L/R을 올바르게 연결한 후 SD / WS / SCK 세 선의 GPIO 번호를 확인하세요.

**스펙트럼 바가 모두 최대치에 도달함 (에너지가 항상 최대)**
코드에서 `bandValues[i] = constrain(avg / 5000.0f, ...)`의 `5000`을 더 큰 값으로 변경하세요, 예를 들어 `15000` 또는 `30000`. 마이크가 음원에 너무 가까워도 이런 현상이 발생할 수 있으니, 먼저 마이크를 30cm 정도 멀리 이동시켜 보세요.

**스펙트럼 바에 반응이 있지만, 몇 개만 움직임**
테스트에 사용한 음원의 주파수 범위가 너무 좁을 수 있습니다 (예: 단일 톤 휘슬 소리만 사용). 저음, 보컬, 고음 악기가 포함된 전 주파수 대역 음악으로 변경하여 각 주파수 밴드에 모두 반응이 있는지 확인하세요.

**컴파일 실패: ArduinoFFT 템플릿 클래스 오류**
설치된 것이 `arduinoFFT` (kosme 버전) **v2.x**인지 확인하세요. v1.x의 사용법은 `ArduinoFFT FFT` (템플릿 매개변수 없음)이고, v2.x는 `ArduinoFFT<double>`입니다. 두 버전의 API는 호환되지 않습니다. 라이브러리 매니저에서 최신 버전으로 업데이트하세요.

---

## FAQ

**Q: INMP441의 L/R 핀을 연결하지 않으면 어떻게 되나요?**
A: 채널 선택이 플로팅되어 마이크 출력 동작이 정의되지 않습니다. 실제 테스트에서는 대부분의 경우 모두 노이즈인 랜덤 데이터가 수집되며, 스펙트럼 바가 소리와 전혀 관계없이 마구跳动합니다. GND에 연결 = 왼쪽 채널, 3.3V에 연결 = 오른쪽 채널, 둘 중 하나를 선택해야 하며, 연결하지 않으면 안 됩니다.

**Q: SAMPLES를 1024로 변경할 수 있나요? 어떤 영향이 있나요?**
A: 변경 가능합니다. 주파수 해상도가 약 86Hz에서 약 43Hz로 향상되어 저주파 세부 사항이 더 풍부해집니다. 대신 프레임당 캡처 및 계산 시간이 두 배가 되어, 새로고침 속도가 약 20fps에서 약 10fps로 감소합니다. 스펙트럼 시각화에서는 10fps도 육안으로 수용 가능합니다.

**Q: 3.3V만 있는데, INMP441이 정상 작동하나요?**
A: 완전히 문제없습니다. INMP441은 1.8V ~ 3.3V 전원을 지원하며, 3.3V가 가장 일반적인 작동 전압입니다. 추가 강하 모듈이 필요하지 않습니다.

**Q: ESP32-S3의 CPU 점유율이 높은가요? 다른 작업에 영향을 주나요?**
A: 512포인트 FFT는 ESP32-S3의 240MHz 클럭에서 단일 코어 CPU 시간의 약 10%~15%를 차지합니다. Wi-Fi나 Bluetooth도 실행해야 한다면, FFT + 그리기를 Core 0에, 네트워크 작업을 Core 1에 배정하는 것이 좋습니다. 두 작업은 서로 간섭하지 않습니다.

**Q: GC9A01을 ST7789나 다른 화면 드라이버로 변경할 수 있나요?**
A: 가능합니다. Arduino_GFX_Library는 수십 종류의 드라이버 칩을 지원합니다. 코드에서 `Arduino_GC9A01`을 해당 클래스 (예: `Arduino_ST7789`)로 변경하고, 해상도 파라미터를 수정한 후, 새 화면의 데이터시트를 참고하여 배선하면 됩니다. 비원형 화면의 경우 원점 좌표를 다시 계산해야 합니다.

**Q: 스펙트럼이 조용할 때 "바닥 노이즈"가 있어 바가 0이 되지 않으면 어떻게 하나요?**
A: INMP441 자체에 바닥 노이즈가 있습니다 (SNR 61dBA는 항상 극소량의 환경 노이즈가 수집됨을 의미). 노이즈 게이트를 추가할 수 있습니다: 매핑 전에 `if (avg < 200) avg = 0;` 한 줄을 추가하면 조용할 때 바가 완전히 0이 됩니다. 동시에 정규화 나눗셈 값을 적절히 키우는 것도 도움이 됩니다.

**Q: ESP32-S3은 어느 버전의 I2S 드라이버를 사용하나요?**
A: 이 글에서는 ESP-IDF v4.x 스타일의 구버전 I2S 드라이버 (`i2s_driver_install` / `i2s_read`)를 사용합니다. ESP-IDF v5.x에서는 새로운 I2S API (`i2s_new_channel` 등)가 도입되었습니다. ESP32-S3 보드 지원 패키지가 3.x로 업그레이드된 경우, 새로운 API를 참고하여 `setupMicrophone()` 함수를 수정해야 합니다.

---

## 추가 응용

- 32개 밴드로 변경하고 더 큰 원형 화면 (예: 2.1인치 GC9A01A)과 조합하여 더 세밀한 스펙트럼 구현
- 터치 버튼을 추가하여 표시 모드 전환 (원형 방사 / 수직 막대형 / 오실로스코프 파형)
- Wi-Fi에 연결하여 스펙트럼 데이터를 브라우저로 전송, 웹페이지에서 다시 렌더링
- INMP441 두 개를 사용하여 스테레오 구현, 좌우 채널을 각각 다른 색상으로 표현

---

## 참고 자료

- [INMP441 공식 데이터시트 — TDK InvenSense](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [GC9A01 드라이버 칩 데이터시트](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [arduinoFFT GitHub — kosme](https://github.com/kosme/arduinoFFT)
- [ESP32-S3 기술 사양서 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP-IDF I2S 드라이버 문서 — Espressif](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)