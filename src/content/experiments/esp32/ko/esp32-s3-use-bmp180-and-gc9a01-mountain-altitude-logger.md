---
title: "ESP32-S3으로 GC9A01 원형 디스플레이 + BMP180 DIY 등산 고도 기록기 완성 가이드 (SPI + I2C + Arduino)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/bmp180
category: esp32
date: 2026-06-23
intro: "ESP32-S3으로 GC9A01 1.28인치 원형 컬러 디스플레이를 구동하고, BMP180 기압 센서와 조합해 동적 산 풍경 배경과 실시간 고도, 누적 상승, 기압 표시가 되는 등산 기록기를 만드는 튜토리얼입니다. 전체 Arduino 코드와 배선 방법을 함께 제공합니다."
image: "https://img.lingflux.com/2026/06/cc83e55f42460646d2fd372496989222.jpg"
---

> 난이도: ⭐⭐⭐☆☆ (듀폰트 선 몇 번 납땜해 본 정도면 충분)
> 예상 소요 시간: 45분
> 테스트 환경: Arduino IDE 2.3.2 · Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · ESP32 Arduino Core 3.0.x

---

> **TL;DR (빠르게 시작하기):**
> 1. **화면 연결**: GC9A01 → CS/GPIO9, DC/GPIO10, SCK/GPIO12, MOSI/GPIO11, RST/GPIO18, BL/GPIO7
> 2. **센서 연결**: BMP180 → SDA/GPIO13, SCL/GPIO14
> 3. **백라이트는 반드시 HIGH로**: `setup()` 안에 `digitalWrite(TFT_BL, HIGH)`를 추가하세요. 이 줄이 빠지면 화면이 절대 켜지지 않습니다.
> 4. **두 라이브러리 설치**: Arduino_GFX_Library (작성자 moononournation) + Adafruit BMP085 Library
> 5. **바로 업로드** 후 시리얼 모니터(115200)를 열고 `초기화 완료, 메인 루프 진입`이 보이면 성공입니다.

---

## 서문

등산을 좋아하는데, 요즘은 백운산 정도만 오르고 있습니다. 배낭에는 보조 배터리, 스마트폰, 자외선 차단제까지 다 챙겼는데, 정작 "지금까지 몇 미터를 올라왔는지" 실시간으로 알려주는 기기는 하나도 없더군요. 스마트폰 앱은 인터넷이 필요하고 GPS 신호는 들쭉날쭉이고, 게다가 매번 폰을 꺼낼 때마다 "사진 찍으러 온 건가" 하는 어색함이 들어서, 아예 등산 고도 기록기를 직접 만들어보기로 했습니다.

돌아와서 부품 상자를 뒤져보니 오랫동안 잠들어 있던 GC9A01 원형 디스플레이가 딱 눈에 들어오더군요. 그 원형 윤곽이 등산 시계 다이얼과 꼭 닮았습니다. 여기에 BMP180 기압 센서와 ESP32-S3을 더하면 부품 세 개, 총비용은 50위안 미만인데, 완성된 결과물은 예상보다 훨씬 좋았습니다.

이 글의 목표: 제로에서 시작해 이 세 부품을 연결하고, 코드를 업로드하여 실시간으로 고도, 누적 상승/하강, 기압을 표시하고 배경이 고도에 따라 동적으로 색이 변하는 등산 기록기를 완성하는 것입니다. 따라 하면 그대로 재현할 수 있습니다.

---

## 완성된 효과

최종 결과: GC9A01 원형 디스플레이에 현재 고도(m), 누적 상승(주황색 위쪽 화살표), 누적 하강(파란색 아래쪽 화살표), 실시간 기압이 표시됩니다. 화면 배경은 고도 비율에 따라 동적으로 색이 변하는 산 풍경 그림입니다. 저고도에서는 따뜻한 갈색 톤, 고고도로 갈수록 짙은 파랑으로 변하고, 정상의 만년설선도 고도가 올라갈수록 아래로 내려옵니다. 화면 가장자리에는 고도 진행 상황을 추적하는 금색 진행 링이 있고, BOOT 버튼을 2초간 길게 누르면 0으로 리셋해 다시 계산할 수 있습니다.

![](https://img.lingflux.com/2026/06/9cedc6308f5ac8b32bb260be186b9298.jpg)

---

## 부품 설명

> ESP32-S3 개발 보드는 따로 소개할 필요가 없겠죠. 이 글을 찾아왔다면 ESP32를 써보셨을 겁니다. 아래에서는 나머지 두 부품만 설명하겠습니다.

### BMP180 기압 센서

BMP180은 MEMS 기압 센서로, 대기압을 측정하고 고도를 역산하는 역할을 합니다. 이 프로젝트에서는 매초 기압과 고도 데이터를 샘플링해 전체 대시보드의 데이터 소스로 사용합니다.

이해하기 쉽게 말하면, 휴대용 "미니 기상 관측소" 같은 것입니다. 대기압을 측정해서 내가 서 있는 곳이 얼마나 높은지 역산해 내는 원리인데, 비행기 이착륙 시 귀가 먹먹해지는 것과 같은 원리입니다. 기압이 낮을수록 고도가 높은 거죠. 온도가 기압 판독값에 영향을 주기 때문에 내부에 온도 센서도 통합되어 있어 보정을 도와주어 고도 데이터가 더 정확해집니다.

| 파라미터 | 수치 |
| --- | --- |
| 작동 전압 | 1.8 V ~ 3.6 V (3.3 V에 연결) |
| 통신 프로토콜 | I2C (고정 주소 0x77) |
| 기압 측정 범위 | 300 ~ 1100 hPa |
| 고도 정밀도 | 표준 모드 ±1 m, 고정밀 모드 ±0.5 m |
| 작동 전류 | 대기 0.1 µA; 피크 650 µA(변환 시); 1 Hz 평균 3~32 µA(정밀도 모드에 따라) |

선택한 이유: 모듈이 저렴하고 Adafruit 라이브러리 지원이 충실하며, 하이킹 기록 용도로는 정밀도가 충분합니다. 더 높은 정밀도나 습도 데이터가 필요하다면 BMP280이나 BME280으로 업그레이드할 수 있지만, 그건 다른 글의 주제입니다.

### GC9A01 원형 TFT 컬러 디스플레이

GC9A01은 1.28인치 원형 TFT 컬러 디스플레이의 구동 IC로, SPI 데이터를 수신해 240×240 픽셀의 원형 패널을 구동합니다. 이 프로젝트에서는 동적 산 풍경 배경과 실시간 고도 데이터를 렌더링하는 역할을 합니다.

이해하기 쉽게 말하면, 스마트워치의 원형 다이얼이라고 생각하면 됩니다. SPI 프로토콜로 통신해 새로고침 속도가 빠르고, 원형 디자인은 대시보드 용도로 천성적으로 잘 맞습니다. Arduino_GFX_Library의 Canvas 이중 버퍼링과 조합하면 깜빡임 없이 부드러운 애니메이션을 구현할 수 있습니다.

| 파라미터 | 수치 |
| --- | --- |
| 화면 크기 | 1.28인치 (원형) |
| 해상도 | 240 × 240 픽셀 |
| 구동 IC | GC9A01 |
| 통신 인터페이스 | SPI (최대 80 MHz) |
| 작동 전압 | 3.3 V |
| 색 심도 | 16비트 RGB565 (65536색) |

선택한 이유: 원형 디스플레이가 "등산 시계" 테마와 천성적으로 잘 어울리고, 지름이 고도 큰 글자, 상승/하강 표시, 진행 링을 모두 담기에 딱 알맞습니다. 빽빽하지 않게 들어맞습니다.

---

## BOM 표

| 부품 | 모델 / 사양 | 수량 |
| --- | --- | --- |
| 메인 제어 보드 | ESP32-S3 (USB-C 버전 권장) | 1 |
| 기압 센서 | BMP180 모듈 (I2C 풀업 저항이 있는 완제품 모듈) | 1 |
| 원형 컬러 디스플레이 | GC9A01 1.28인치 TFT, 240×240 | 1 |
| 연결선 | 듀폰트선 (암-암) | 약간 |
| 전원 | USB-C 데이터 선 + PC / 충전기 | 1 |

---

## 부품 핀 설명

### GC9A01 핀

| 화면 핀 | 기능 설명 |
| --- | --- |
| VCC | 전원 +, 3.3 V에 연결 |
| GND | 전원 - |
| SCL / CLK | SPI 클럭 선 |
| SDA / MOSI | SPI 데이터 선 (마스터→슬레이브) |
| CS | 칩 셀렉트 (Active Low) |
| DC | 데이터 / 명령 선택 선 |
| RST | 리셋 (Low 트리거) |
| BL | 백라이트 제어, **HIGH일 때만 점등** |

### BMP180 핀

| 센서 핀 | 기능 설명 |
| --- | --- |
| VCC | 전원 +, 3.3 V에 연결 |
| GND | 전원 - |
| SCL | I2C 클럭 선 |
| SDA | I2C 데이터 선 |

---

## 배선 방법

### GC9A01 → ESP32-S3

| GC9A01 핀 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL (백라이트) | GPIO 7 |

### BMP180 → ESP32-S3

| BMP180 핀 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL | GPIO 14 |
| SDA | GPIO 13 |



> **배선을 마친 뒤 하나씩 다시 확인하면 트러블슈팅 시간의 80%를 줄일 수 있습니다.** 특히 두 곳이 함정에 빠지기 쉽습니다. 첫째, BL(백라이트)을 GPIO7에 연결하는 것만으로는 부족하고 코드 안에도 `digitalWrite(TFT_BL, HIGH)`를 함께 넣어야 점등됩니다. 둘째, GC9A01의 SCL/SDA는 **SPI 프로토콜**을 사용하고 BMP180의 SCL/SDA는 **I2C 프로토콜**을 사용합니다. 이름은 같지만 완전히 독립된 두 개의 버스이므로 핀을 절대 섞어 쓰면 안 됩니다.

---

## 설치해야 할 라이브러리

Arduino IDE를 열고 툴 → 라이브러리 관리로 이동해 다음 세 가지를 검색 후 설치합니다:

| 라이브러리명 | 작성자 | 용도 |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | GC9A01 화면 구동 + Canvas 이중 버퍼 렌더링 |
| Adafruit BMP085 Library | Adafruit | BMP180 / BMP085 기압 센서 구동 |
| Adafruit Unified Sensor | Adafruit | 위 라이브러리의 의존 항목, 함께 설치 |

> **테스트 통과 버전**: Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · Arduino IDE 2.3.2 · ESP32 Arduino Core 3.0.x
> 구버전 ESP32 Core(1.x 시리즈)를 사용 중이라면 SPI 초기화 방식이 약간 다를 수 있습니다. 문제를 겪지 않으려면 3.x로 바로 업그레이드하는 것을 권장합니다.

---

## 전체 코드

```cpp
/*
  ============================================================
  등산 고도 기록기 (Mountain Altitude Logger)
  ============================================================
  하드웨어: ESP32-S3 + GC9A01 원형 디스플레이(240x240) + BMP180 기압 센서
  ============================================================
*/

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>

// ===================== 1단계: 핀 및 파라미터 정의 =====================
#define TFT_CS    9    // 화면 칩 셀렉트
#define TFT_DC    10   // 데이터/명령 선택
#define TFT_SCK   12   // SPI 클럭
#define TFT_MOSI  11   // SPI 데이터 (마스터→슬레이브)
#define TFT_RST   18   // 화면 리셋
#define TFT_BL    7    // 백라이트 제어 (HIGH일 때 점등, 반드시 HIGH로!)
#define TFT_MISO  -1   // MISO 불필요 (화면에 쓰기만 하고 읽지 않음)

#define BMP_SDA   13   // BMP180 I2C 데이터 선
#define BMP_SCL   14   // BMP180 I2C 클럭 선

#define BTN_PIN   0    // 내장 BOOT 버튼, 2초 길게 누르면 영점 교정
#define CALIBRATION_HOLD_MS 2000  // 길게 누름 트리거 임계값 (밀리초)

#define FILTER_SIZE 5     // 이동 평균 필터 윈도우 (최근 5개 샘플의 평균)
#define DEAD_ZONE   0.3f  // 누적 상승/하강 데드존 (0.3m 미만의 떨림은 무시)
#define ALT_RANGE_MAX 3000.0f  // 진행 링이 꽉 찰 때의 고도 상한 (3000m)

// ===================== 2단계: 하드웨어 구동 객체 =====================
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, TFT_MISO);
Arduino_GFX *gfx = new Arduino_GC9A01(bus, TFT_RST, 0 /* 회전 방향 */, true /* IPS 모드 */);
// Canvas 이중 버퍼: 모든 그리기는 먼저 메모리 캔버스에 쓰고, 마지막에 flush()로 한 번에 화면에 밀어 넣어 깜빡임 제거
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

Adafruit_BMP085 bmp;

// ===================== 3단계: 데이터 구조 =====================
struct AltitudeData {
  float currentAltitude = 0;       // 현재 고도 (필터 후)
  float maxAltitude = 0;           // 이번 기록의 최고 고도
  float totalAscent = 0;           // 누적 상승 고도
  float totalDescent = 0;          // 누적 하강 고도
  float currentPressure = 1013.25; // 현재 기압 (hPa)

  // 아래는 애니메이션 보간용 '표시값'으로, 숫자가 갑자기 튀지 않고 부드럽게 전환
  float displayedAltitude = 0;
  float displayedAscent = 0;
  float displayedDescent = 0;
  float displayedPressure = 1013.25;
} data;

// 이동 평균 필터용 환형 버퍼
float altBuffer[FILTER_SIZE] = {0};
int filterIndex = 0;
int filterCount = 0;

// 색상 상수 (setup()에서 color565()로 초기화하여 리소스를 미리 점유하지 않도록 함)
uint16_t COLOR_WHITE, COLOR_BLACK, COLOR_CREAM_GREEN;

// 버튼 상태
unsigned long btnPressStart = 0;
bool btnIsPressed = false;
bool calibrationTriggered = false;


// ============================================================
//                   모듈 1: 센서 읽기
// ============================================================

void initSensor() {
  Serial.print("[Sensor] I2C 버스 초기화 중 (SDA=");
  Serial.print(BMP_SDA);
  Serial.print(", SCL=");
  Serial.print(BMP_SCL);
  Serial.println(")...");

  Wire.begin(BMP_SDA, BMP_SCL);

  Serial.println("[Sensor] BMP180 센서 연결 중...");
  if (!bmp.begin()) {
    // 여기서 계속 ERROR가 출력된다면 센서 배선에 문제가 있는 것
    // 아래로 넘어가지 못하므로 화면도 켜지지 않음
    while (1) {
      Serial.println("[ERROR] BMP180 초기화 실패! 배선, 전원(3.3V), I2C 핀을 확인하세요.");
      delay(2000);
    }
  }
  Serial.println("[Sensor] BMP180 연결 성공!");
}

// BMP180에서 원시 기압과 고도를 1회 읽기
void sampleSensor(float &rawAltitude, float &rawPressure) {
  rawPressure = bmp.readPressure() / 100.0f;  // Pa → hPa
  rawAltitude = bmp.readAltitude(101325);      // 101325 Pa = 표준 해면 기압
}


// ============================================================
//                   모듈 2: 데이터 처리
// ============================================================

// 이동 평균 필터: 최근 FILTER_SIZE회 판독값을 평균하여 센서 노이즈 감소
float smoothAltitude(float raw) {
  altBuffer[filterIndex] = raw;
  filterIndex = (filterIndex + 1) % FILTER_SIZE;
  if (filterCount < FILTER_SIZE) filterCount++;

  float sum = 0;
  for (int i = 0; i < filterCount; i++) sum += altBuffer[i];
  return sum / filterCount;
}

// 통계 데이터 업데이트: 최고 고도, 누적 상승, 누적 하강
void updateStats(float smoothedAltitude) {
  static bool firstSample = true;
  static float lastAltitude = 0;

  if (firstSample) {
    lastAltitude = smoothedAltitude;
    data.maxAltitude = smoothedAltitude;
    firstSample = false;
  }

  float delta = smoothedAltitude - lastAltitude;
  // 데드존을 넘는 변화만 집계하여 평지의 미세한 떨림이 누적 숫자를 부풀리지 않도록 방지
  if (delta > DEAD_ZONE) {
    data.totalAscent += delta;
  } else if (delta < -DEAD_ZONE) {
    data.totalDescent += -delta;
  }

  if (smoothedAltitude > data.maxAltitude) {
    data.maxAltitude = smoothedAltitude;
  }

  lastAltitude = smoothedAltitude;
  data.currentAltitude = smoothedAltitude;
}


// ============================================================
//                   모듈 3: 버튼 및 교정
// ============================================================

void showCalibrationFlash();  // 전방 선언

// BOOT 버튼 길게 누름 트리거: 상승/하강을 0으로 리셋, 현재 고도를 기준으로 재시작
void doCalibration() {
  Serial.println("[Button] 길게 누름 감지, 고도 교정 영점 수행 중...");
  data.totalAscent = 0;
  data.totalDescent = 0;
  data.displayedAscent = 0;
  data.displayedDescent = 0;
  data.maxAltitude = data.currentAltitude;

  showCalibrationFlash();
  Serial.println("[Button] 교정 완료.");
}

// 버튼 상태 감지, BOOT 버튼은 Active Low
void handleButton() {
  bool pressed = (digitalRead(BTN_PIN) == LOW);

  if (pressed && !btnIsPressed) {
    btnIsPressed = true;
    btnPressStart = millis();
    calibrationTriggered = false;
  } else if (pressed && btnIsPressed) {
    // 임계값 이상 길게 누르고 아직 트리거되지 않았으면 교정 실행
    if (!calibrationTriggered && (millis() - btnPressStart >= CALIBRATION_HOLD_MS)) {
      doCalibration();
      calibrationTriggered = true;  // 길게 누르는 동안 반복 트리거 방지
    }
  } else if (!pressed && btnIsPressed) {
    btnIsPressed = false;
  }
}


// ============================================================
//                   모듈 4: UI 렌더링
// ============================================================

// RGB565 두 색상 사이 선형 보간 (t는 0.0에서 1.0)
uint16_t lerpColor(uint16_t colorA, uint16_t colorB, float t) {
  t = constrain(t, 0.0, 1.0);
  uint8_t r1 = (colorA >> 11) & 0x1F, g1 = (colorA >> 5) & 0x3F, b1 = colorA & 0x1F;
  uint8_t r2 = (colorB >> 11) & 0x1F, g2 = (colorB >> 5) & 0x3F, b2 = colorB & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// 그라데이션 하늘 배경 그리기: 저고도에서는 따뜻한 갈색, 고고도에서는 짙은 파랑으로 변화
void drawSkyBackground(float altitudeRatio) {
  uint16_t topLow     = canvas->color565(176, 196, 210);  // 저고도 천정: 연한 파랑
  uint16_t topHigh    = canvas->color565(30, 30, 90);     // 고고도 천정: 짙은 파랑
  uint16_t bottomLow  = canvas->color565(210, 200, 180);  // 저고도 수평선: 따뜻한 회색
  uint16_t bottomHigh = canvas->color565(70, 90, 140);    // 고고도 수평선: 푸른 회색

  uint16_t topColor    = lerpColor(topLow, topHigh, altitudeRatio);
  uint16_t bottomColor = lerpColor(bottomLow, bottomHigh, altitudeRatio);

  for (int y = 0; y < 240; y++) {
    float t = (float)y / 240.0;
    canvas->drawFastHLine(0, y, 240, lerpColor(topColor, bottomColor, t));
  }
}

// 단일 봉우리 그리기 (설선 포함), greenFraction이 설선 위치 제어, 고도가 높을수록 설선이 낮아짐
void drawSnowyPeak(int16_t apexX, int16_t apexY, int16_t baseLeftX, int16_t baseRightX,
                    int16_t baseY, uint16_t bodyColor, float greenFraction) {
  canvas->fillTriangle(apexX, apexY, baseLeftX, baseY, baseRightX, baseY, bodyColor);

  greenFraction = constrain(greenFraction, 0.05f, 0.85f);
  int16_t snowY      = apexY + (baseY - apexY) * greenFraction;
  int16_t snowLeftX  = apexX + (baseLeftX - apexX) * greenFraction;
  int16_t snowRightX = apexX + (baseRightX - apexX) * greenFraction;

  canvas->fillTriangle(apexX, apexY, snowLeftX, snowY, snowRightX, snowY, COLOR_CREAM_GREEN);
}

//远近이 어우러진 세 봉우리 그리기
void drawMountains(float altitudeRatio) {
  float greenRatio = 1.0f - altitudeRatio;  // 고도가 높을수록 식생 영역이 적고 설선이 낮아짐

  drawSnowyPeak(60,  110, -20, 140, 240, canvas->color565(60, 75, 65),  greenRatio * 0.7);
  drawSnowyPeak(200, 130, 150, 260, 240, canvas->color565(70, 85, 75),  greenRatio * 0.6);
  drawSnowyPeak(130, 70,  40,  220, 240, canvas->color565(45, 55, 50),  greenRatio);
}

// 호 그리기 (진행 링의 기본 함수)
void drawRingArc(int16_t cx, int16_t cy, int16_t radius, int16_t thickness,
                  float startDeg, float endDeg, uint16_t color) {
  for (float deg = startDeg; deg <= endDeg; deg += 1.0) {
    float rad = deg * PI / 180.0;
    int16_t x0 = cx + cos(rad) * (radius - thickness / 2);
    int16_t y0 = cy + sin(rad) * (radius - thickness / 2);
    int16_t x1 = cx + cos(rad) * (radius + thickness / 2);
    int16_t y1 = cy + sin(rad) * (radius + thickness / 2);
    canvas->drawLine(x0, y0, x1, y1, color);
  }
}

// 화면 가장자리의 고도 진행 링 그리기, 고도 비율에 따라 금색 호가 점등
void drawProgressRing(float altitudeRatio) {
  int16_t cx = 120, cy = 120, radius = 115, thickness = 6;
  // 먼저 회색 베이스 링 한 바퀴 그리기
  drawRingArc(cx, cy, radius, thickness, -90, 269, canvas->color565(50, 50, 60));
  // 그 위에 금색으로 상승한 진행 부분 덮어쓰기
  float endAngle = -90 + altitudeRatio * 359.0;
  drawRingArc(cx, cy, radius, thickness, -90, endAngle, canvas->color565(255, 200, 80));
}

// 검은 테두리가 있는 텍스트 그리기, 흰 글자가 밝은 배경에 묻혀 안 보이는 것 방지
void drawTextWithHalo(int16_t x, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  canvas->setTextColor(haloColor);
  // 상하좌우 각 1픽셀씩 오프셋해 테두리 한 번씩 그리기
  canvas->setCursor(x - 1, y); canvas->print(text);
  canvas->setCursor(x + 1, y); canvas->print(text);
  canvas->setCursor(x, y - 1); canvas->print(text);
  canvas->setCursor(x, y + 1); canvas->print(text);

  canvas->setTextColor(textColor);
  canvas->setCursor(x, y);
  canvas->print(text);
}

// 텍스트 중앙 정렬 그리기, 텍스트 너비에 따라 자동으로 오프셋 계산
void drawCenteredText(int16_t centerX, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  int16_t x1, y1;
  uint16_t w, h;
  canvas->getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  drawTextWithHalo(centerX - w / 2, y, text, textSize, textColor, haloColor);
}

// 모든 데이터 텍스트 오버레이 레이어 그리기
void drawDataOverlay() {
  char buf[32];

  // 화면 중앙 큰 글자: 현재 고도 숫자
  sprintf(buf, "%d", (int)round(data.displayedAltitude));
  drawCenteredText(120, 68, buf, 4, COLOR_WHITE, COLOR_BLACK);
  drawCenteredText(120, 104, "m", 2, COLOR_WHITE, COLOR_BLACK);

  // 왼쪽: 주황색 위쪽 삼각 + 누적 상승
  int16_t ascX = 58, ascY = 138;
  canvas->fillTriangle(ascX, ascY - 8, ascX - 7, ascY + 5, ascX + 7, ascY + 5,
                       canvas->color565(255, 140, 60));
  sprintf(buf, "%dm", (int)round(data.displayedAscent));
  drawTextWithHalo(ascX + 13, ascY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // 오른쪽: 파란색 아래쪽 삼각 + 누적 하강
  int16_t desX = 150, desY = 138;
  canvas->fillTriangle(desX, desY + 8, desX - 7, desY - 5, desX + 7, desY - 5,
                       canvas->color565(120, 180, 255));
  sprintf(buf, "%dm", (int)round(data.displayedDescent));
  drawTextWithHalo(desX + 13, desY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // 하단 작은 글자: 실시간 기압
  sprintf(buf, "Press: %.1f hPa", data.displayedPressure);
  drawCenteredText(120, 162, buf, 1, COLOR_WHITE, COLOR_BLACK);
}

// 메인 렌더링 함수: 배경 → 산 → 진행 링 → 숫자 순으로 그리고 마지막에 flush로 화면에 밀어넣기
void renderUI() {
  float altitudeRatio = constrain(data.displayedAltitude / ALT_RANGE_MAX, 0.0f, 1.0f);

  drawSkyBackground(altitudeRatio);
  drawMountains(altitudeRatio);
  drawProgressRing(altitudeRatio);
  drawDataOverlay();

  canvas->flush();  // Canvas 메모리 버퍼를 실제 화면에 한 번에 밀어넣기
}

// 교정 성공 시 깜빡임 애니메이션
void showCalibrationFlash() {
  for (int i = 0; i < 2; i++) {
    canvas->fillScreen(COLOR_WHITE);
    canvas->flush();
    delay(120);

    canvas->fillScreen(COLOR_BLACK);
    canvas->setTextColor(COLOR_WHITE);
    canvas->setTextSize(2);
    canvas->setCursor(48, 112);
    canvas->print("Calibrated!");
    canvas->flush();
    delay(120);
  }
  delay(300);
}


// ============================================================
//                       setup / loop
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- [System] 등산 기록기 부팅 ---");

  // 백라이트를 HIGH로, 이 단계가 빠지면 화면이 절대 켜지지 않음
  Serial.println("[TFT] 백라이트 핀 설정 중...");
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  pinMode(BTN_PIN, INPUT_PULLUP);  // BOOT 버튼 내부 풀업

  // 화면 구동 초기화
  Serial.println("[TFT] Canvas 초기화 중...");
  if (!canvas->begin()) {
    Serial.println("[ERROR] 화면 구동 초기화 실패! SPI 핀 설정을 확인하세요.");
  } else {
    Serial.println("[TFT] 화면 구동 초기화 성공.");
  }

  COLOR_WHITE       = canvas->color565(255, 255, 255);
  COLOR_BLACK       = canvas->color565(0, 0, 0);
  COLOR_CREAM_GREEN = canvas->color565(205, 235, 195);  // 정상 설색 (연한 녹백색)

  canvas->fillScreen(COLOR_BLACK);
  canvas->flush();

  // 센서 초기화
  initSensor();

  // 부팅 시 최초 데이터 읽기, 모든 표시값 초기화용
  Serial.println("[Sensor] 부팅 초기 데이터 읽는 중...");
  float rawAlt, rawPress;
  sampleSensor(rawAlt, rawPress);

  Serial.print("[Sensor] 부팅 판독 → 기압: ");
  Serial.print(rawPress);
  Serial.print(" hPa | 고도: ");
  Serial.print(rawAlt);
  Serial.println(" m");

  data.currentAltitude   = rawAlt;
  data.maxAltitude       = rawAlt;
  data.displayedAltitude = rawAlt;
  data.currentPressure   = rawPress;
  data.displayedPressure = rawPress;

  // 부팅 고도로 필터 버퍼를 미리 채워 시작 시 숫자가 0에서 실제 고도로 튀는 것 방지
  for (int i = 0; i < FILTER_SIZE; i++) altBuffer[i] = rawAlt;
  filterCount = FILTER_SIZE;

  Serial.println("--- [System] 초기화 완료, 메인 루프 진입 ---");
}

// 센서 샘플링 타이머 (1초마다 1회 샘플링)
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL = 1000;

// 화면 렌더링 타이머 (약 33 fps)
unsigned long lastRenderTime = 0;
const unsigned long RENDER_INTERVAL = 30;

void loop() {
  handleButton();

  unsigned long now = millis();

  // --- 저빈도 작업: 1초마다 센서 샘플링 1회 ---
  if (now - lastSampleTime >= SAMPLE_INTERVAL) {
    lastSampleTime = now;

    float rawAltitude, rawPressure;
    sampleSensor(rawAltitude, rawPressure);

    float smoothed = smoothAltitude(rawAltitude);
    updateStats(smoothed);
    data.currentPressure = rawPressure;

    // 시리얼 실시간 로그, 디버깅 시 센서가 정상 동작하는지 확인
    Serial.print("[Loop] 원시: ");  Serial.print(rawAltitude);
    Serial.print("m | 필터: ");     Serial.print(data.currentAltitude);
    Serial.print("m | 기압: ");     Serial.print(data.currentPressure);
    Serial.print(" hPa | 상승: ");  Serial.println(data.totalAscent);
  }

  // --- 고빈도 작업: 약 33fps로 UI 렌더링 ---
  if (now - lastRenderTime >= RENDER_INTERVAL) {
    lastRenderTime = now;

    // 지수 평활 보간: 표시 숫자가 실제 값을 부드럽게 추적, 0.12 계수가 추적 속도 제어
    data.displayedAltitude += (data.currentAltitude  - data.displayedAltitude) * 0.12f;
    data.displayedAscent   += (data.totalAscent      - data.displayedAscent)   * 0.12f;
    data.displayedDescent  += (data.totalDescent     - data.displayedDescent)  * 0.12f;
    data.displayedPressure += (data.currentPressure  - data.displayedPressure) * 0.12f;

    renderUI();
  }

  delay(2);
}
```

---

## 코드 설명

전체 코드는 네 모듈로 나뉘며, 논리적으로 서로 간섭하지 않습니다:

**모듈 1: 센서 읽기** — `initSensor()`가 I2C 버스를 초기화하고 BMP180이 온라인인지 감지합니다. 실패하면 에러를 출력하며 무한 루프에 빠져 아래로 진행하지 않습니다(문제를 빠르게 찾기 위함). `sampleSensor()`는 매번 원시 기압(Pa → hPa)과 고도(표준 해면 101325 Pa 기준 환산)를 읽어옵니다.

**모듈 2: 데이터 처리** — `smoothAltitude()`가 5점 이동 평균 필터로 센서 노이즈를 줄입니다. `updateStats()`는 0.3m 데드존을 두고 상승/하강을 누적해 평지에서의 미세한 떨림이 누적 숫자를 부풀리지 않도록 합니다.

**모듈 3: 버튼 및 교정** — `handleButton()`이 BOOT 버튼을 2000밀리초 이상 길게 눌렀는지 감지하고, `doCalibration()`을 트리거하여 상승/하강을 0으로 리셋, 현재 고도를 새 기준으로 재집계를 시작합니다. `calibrationTriggered` 플래그가 한 번의 길게 누름 동안 여러 번 트리거되는 것을 방지합니다.

**모듈 4: UI 렌더링** — `Arduino_Canvas` 이중 버퍼를 사용해 매 프레임 메모리에서 배경 그라데이션, 봉우리(동적 설선 포함), 가장자리 진행 링, 숫자를 모두 그린 뒤 마지막에 `canvas->flush()`로 한 번에 화면에 밀어 넣어, 줄 단위 새로고침 시의 깜빡임을 완전히 제거합니다. 숫자는 지수 평활(계수 0.12)로 애니메이션 보간되어 변화가 부드럽고 딱딱하지 않습니다.

`loop()`에서는 이중 타이머로 "저빈도 샘플링(1초 1회)"과 "고빈도 렌더링(약 33fps)"을 분리해 서로 블로킹하지 않으므로 전체 응답이 매우 부드럽습니다.

---

## 자주 겪는 문제 해결

당황하지 마세요. 90%의 문제는 아래 몇 곳에서 발생합니다:

**문제 1: 화면이 완전히 검은색이고 백라이트도 없다**

`setup()`에서 GPIO 7에 대해 `digitalWrite(TFT_BL, HIGH)`가 실행되었는지 확인하세요. 백라이트는 자동으로 켜지지 않으며, 코드에서 이 줄이 빠지면 화면이 절대 켜지지 않습니다. 동시에 VCC가 3.3 V에 연결되어 있는지, 5 V가 아닌지 확인하세요. 5 V는 화면을 태웁니다.

**문제 2: 백라이트는 켜지지만 전체가 희거나 검고, 화면이 없다**

시리얼 모니터(115200 보드레이트)를 열어 `[ERROR]`가 있는지 확인하세요. `화면 구동 초기화 실패`가 나타나면 SPI 핀이 잘못 연결된 것입니다. 배선 표에 따라 CS / DC / SCK / MOSI / RST 다섯 선을 하나씩 점검하세요.

**문제 3: 시리얼에 계속 `BMP180 초기화 실패`가 출력되고 프로그램이 멈춰 화면이 안 켜진다**

BMP180 초기화 실패 시 무한 루프에 빠지므로 화면이 켜지지 않습니다. 원인의 99%는 I2C 배선 문제입니다. SDA는 GPIO13, SCL은 GPIO14에 연결하고 전원은 3.3 V를 사용하며, 모듈의 풀업 저항이 납땜되어 있는지 확인하세요(정상적인 완제품 모듈은 보통 이미 납땜되어 있습니다).

**문제 4: 정상적으로 표시되지만 고도 숫자가 실제와 많이 어긋난다**

BMP180은 표준 해면 기압(101325 Pa)을 기준으로 고도를 환산합니다. 실제 국지 기압은 날씨에 따라 달라지며 ±30 m 편차는 정상 범위입니다. 현재 정확한 고도를 알고 있다면 `bmp.readAltitude(101325)`의 인자를 현지 실측 QNH 해면 기압값(단위 Pa, 날씨 앱에서 얻을 수 있으며 환산: hPa × 100 = Pa)으로 바꾸면 됩니다.

**문제 5: 누적 상승 숫자가 계속 오르는데 움직이지도 않았다**

센서 노이즈가 데드존(0.3m)을 넘어선 것입니다. 코드의 `DEAD_ZONE`을 `0.8f`나 `1.0f`로 키우거나, `FILTER_SIZE`를 5에서 8로 늘려 평활 효과를 강화하면 됩니다. 두 방법 모두 허수 증가를 줄일 수 있습니다.

**문제 6: 화면 새로고침에 깜빡임이 느껴진다**

정상적으로 Canvas 이중 버퍼를 사용 중이라면 깜빡이지 않아야 합니다. 그래도 깜빡인다면 `canvas->flush()`가 `renderUI()` 마지막에 호출되는지, 그리고 다른 곳에서 Canvas를 우회해 직접 `gfx`를 조작하는 부분이 없는지 확인하세요.

---

## FAQ

**Q: GC9A01 원형 디스플레이를 다른 모델의 사각 화면으로 바꿀 수 있나요?**
A: 가능합니다. Arduino_GFX_Library는 수십 종의 화면 구동 IC(ST7789, ILI9341 등)를 지원합니다. `Arduino_GC9A01` 줄을 해당 구동 클래스명으로 바꾸고, Canvas 크기를 240×240에서 해당 해상도로 바꾸면 UI 코드는 거의 수정하지 않아도 됩니다.

**Q: BMP180을 BMP280이나 BME280으로 바꿀 수 있나요?**
A: 가능하지만 라이브러리를 바꿔야 합니다. BMP280은 `Adafruit_BMP280` 라이브러리를, BME280은 `Adafruit_BME280` 라이브러리를 사용하며 `readAltitude()` 호출 방식이 약간 다릅니다. BMP280이 정밀도가 더 높고 대기 소비 전력은 약 2.74 µA입니다. BME280은 여기에 습도 읽기도 지원하지만 가격이 조금 더 비쌉니다.

**Q: BMP180의 고도 정밀도는 얼마인가요? 실내 테스트에서 숫자가 계속 뛰는 것은 정상인가요?**
A: BMP180은 표준 모드 정밀도 ±1m, 고해상도 모드는 ±0.5m에 도달합니다. 실내 판독값이 뛰는 것은 완전히 정상입니다. 창문을 열거나 문을 닫거나 에어컨 바람이 기압에 미세한 변화를 일으켜 고도 판독값에 영향을 줍니다. 이 프로젝트는 5점 이동 평균 + 0.3m 데드존으로 이런 떨림을 억제하며, 실사용 시 효과는 이미 꽤 괜찮습니다.

**Q: ESP32-S3의 SPI(화면)와 I2C(센서)를 동시에 사용할 수 있나요?**
A: 전혀 문제없습니다. SPI와 I2C는 독립된 주변장치 버스입니다. 이 프로젝트에서 GC9A01은 SPI(GPIO11/12), BMP180은 I2C(GPIO13/14)를 사용하며 각각 자기 버스를 써 서로 간섭하지 않습니다. ESP32-S3이 두 버스를 동시에 구동하는 데는 아무 문제가 없습니다.

**Q: 코드의 `Arduino_Canvas`는 무엇인가요? 빼고 직접 `gfx`로 그려도 되나요?**
A: `Arduino_Canvas`는 Arduino_GFX_Library가 제공하는 이중 버퍼 캔버스입니다. 모든 그리기 명령이 먼저 메모리의 가상 캔버스에 기록되고 `flush()` 호출 시 한 번에 화면으로 밀려가 줄 단위 새로고침 시의 깜빡임을 제거합니다. 빼고 직접 `gfx`를 조작해도 기능적으로는 동작하지만, 풀스크린 그라데이션 배경을 그릴 때 깜빡임이 매우 뚜렷해져 경험이 크게 저하되므로 권장하지 않습니다.

**Q: ESP32-S3을 리튬 배터리로 구동해 등산하며 들고 다닐 수 있나요?**
A: 가능합니다. 3.7V 리튬 배터리 + TP4056 충방전 모듈 + ME6211 LDO로 3.3V로 안정화하는 것이 일반적인 구성입니다. 이 프로젝트 설정에서 ESP32-S3 + GC9A01 + BMP180의 종합 작동 전류는 약 80~120mA이며, 500mAh 배터리 한 개로 이론상 4~6시간 사용 가능해 주간 하이킹 한 번은 충분히 버팁니다. 더 긴 사용 시간이 필요하다면 화면 백라이트 밝기를 낮추거나(PWM 조광 GPIO7) 센서 샘플링 간격을 늘리면 됩니다.

---

## 더 해볼 수 있는 것들

이 버전을 완성한 뒤에도 계속 만져볼 수 있습니다:

- **SD 카드로 궤적 기록**: 10초마다 타임스탬프 + 고도 + 기압을 CSV 파일로 기록하고, 돌아와서 GPS 궤적 소프트웨어로 가져가 데이터 분석
- **GPS 모듈 추가로 위치 융합**: BMP180은 날씨 영향으로 드리프트가 생기고, GPS 고도 정밀도는 약 ±10m이지만 더 안정적이라 둘을 융합하면 상호 보완 가능
- **자이로 MPU6050 연결로 보행 수 계산**: 발걸음 리듬을 감지해 걸음 수를 추정, 완전한 하이킹 데이터 기기로 업그레이드
- **BLE 블루투스로 스마트폰에 데이터 전송**: ESP32-S3의 BLE로 실시간 데이터를 스마트폰 앱에 보내고 지도와 조합해 전체 궤적 표시

---

## 참고 자료

- [BMP180 공식 데이터시트 (Bosch Sensortec)](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp180-ds000.pdf)
- [GC9A01 구동 IC 데이터시트 (Galaxycore)](http://www.galaxycore.com/file/pdf/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub 메인 페이지](https://github.com/moononournation/Arduino_GFX)
- [Adafruit BMP085 Library GitHub 메인 페이지](https://github.com/adafruit/Adafruit-BMP085-Library)
- [Espressif ESP32-S3 공식 제품 페이지](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
