---
title: "ESP32-S3으로 GC9A01 원형 디스플레이 + VL53L0X-V2 레이저 거리 측정 완벽 가이드 (SPI 배선 + I2C 주의점)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/vl53l0x
category: esp32
date: 2026-07-09
intro: "ESP32-S3으로 GC9A01 1.28인치 원형 디스플레이를 구동하고, VL53L0X-V2 레이저 거리 측정 센서와 결합해 실시간으로 움직이는 바늘과 거리에 따라 색이 변하는 호(arc)를 가진 사이버펑크 스타일의 레이저 거리 측정 게이지 대시보드를 만들어봅니다. SPI+I2C 핀 충돌 주의점부터 전체 Arduino 소스 코드까지 함께 정리했어요."
image: "https://img.lingflux.com/2026/07/68114f0f73885a81414b9432bd0d95eb.jpg"
---



# ESP32-S3으로 GC9A01 원형 디스플레이 + VL53L0X-V2 레이저 거리 측정: 배선부터 사이버 게이지 대시보드 점등까지 (전체 코드 포함)

난이도: ⭐⭐⭐☆☆ (기초가 있는 메이커라면 충분히 도전 가능, 배선에 약간의 인내가 필요해요)
예상 소요 시간: 45분
테스트 환경: Arduino IDE 2.3.8 + ESP32 Core 3.3.10 + Arduino_GFX_Library v1.6.5 + Adafruit_VL53L0X v1.2.5

---

> **TL;DR (빠르게 시작하기):**
>
> 1. 화면 배선: GPIO12→SCL, GPIO11→SDA, GPIO9→CS, GPIO10→DC, GPIO18→RST, GPIO7→BL
> 2. 센서 배선: GPIO13→SDA, GPIO14→SCL (**기본 I2C 핀이 아니라는 점 주의**, GPIO9를 이미 화면 CS가 점유 중이기 때문이에요)
> 3. 라이브러리 2개 설치: `Arduino_GFX_Library`, `Adafruit_VL53L0X`
> 4. 먼저 "센서 테스트 코드"를 업로드해서 시리얼 모니터에 거리 숫자가 찍히는지 확인한 뒤에 메인 프로그램을 굽기
> 5. 메인 프로그램을 업로드하면 원형 디스플레이에 실시간으로 움직이는 바늘과 색이 변하는 레이저 레이더 게이지 대시보드가 떠요

---

## 서두: 왜 이 원형 디스플레이 게이지 대시보드를 만들까요

레이저 거리 측정(ToF) 모듈은 이미 많은 분들이 다뤄보셨을 거예요. 하지만 대부분 "시리얼 모니터에 숫자 찍기" 단계에 머물러 있죠. 이 프로젝트의 목표는 아주 단순해요. ESP32-S3의 성능과 GC9A01 원형 디스플레이가 가진 시각적 장점을 살려, 추상적인 거리 데이터를 실용성과 사이버펑크 감성을 동시에 잡은 고갱신 게이지 대시보드로 바꿔보는 거예요.

프로젝트의 핵심 난관은 로직이 아니라, 디스플레이의 SPI 인터페이스와 센서의 I2C 인터페이스가 핀 충돌을 일으킨다는 점이에요. 개발보드의 기본 핀끼리 "싸우면서" 초기화에 실패하는 문제를 풀기 위해, 저는 하드웨어 핀 매핑을 새로 짰어요. 아래에 주의점 가이드와 메인 프로그램 구현을 모두 정리했어요.

## 실험 결과 미리보기

최종 결과는 이래요. 원형 디스플레이 위에 자동차 타코미터(엔진 회전계)와 비슷한 호(arc) 형태의 눈금판을 그리고, 바늘이 현재 측정된 거리를 실시간으로 가리켜요. 호 색상은 빨강(가깝다/위험)에서 초록(멀다/안전)으로 부드럽게 변하고, 중앙에는 구체적인 mm 숫자와 상태 글자(DANGER / WARNING / CAUTION / SAFE / CLEAR)가 표시돼요. 센서 앞에서 손을 흔들어 보면 바늘이 따라서 실시간으로 움직이는데, 꽤 힐링돼요.

## 부품 소개

개발보드(ESP32-S3)는 굳이 더 설명하지 않을게요. 나머지 두 주인공에 집중할게요.

### GC9A01 240×240 원형 디스플레이

GC9A01은 원형 화면 전용으로 만들어진 디스플레이 구동 칩이에요. 우리가 보낸 픽셀 데이터를 화면 위의 그림으로 "번역"해 주는 역할을 하죠. 무엇을 그릴지만 알려주면, 그걸 어떻게 그릴지와 그 사이의 갱신·스캔은 전부 이 칩이 알아서 처리해요. 우리는 그냥 API만 호출하면 돼요.

| 항목   | 값                  |
| ------ | ------------------- |
| 해상도 | 240×240             |
| 크기   | 1.28인치            |
| 인터페이스 | SPI                 |
| 색심도 | 65K 컬러 (RGB565)   |
| 구동 라이브러리 | Arduino_GFX_Library |

선택한 이유는 가격이 저렴하고, 원형 화면이라 게이지 대시보드 용도로는 타고난 짝꿍이기 때문이에요. 게다가 SPI 인터페이스 속도가 충분히 빠라서 바늘이 돌아갈 때 잔상이 남지 않아요.

### VL53L0X-V2 레이저 거리 측정 센서

VL53L0X는 비행 시간(ToF) 원리를 기반으로 한 레이저 거리 측정 센서예요. 쉽게 말하면, 눈에 보이지 않는 적외선 레이저를 쏘아 보낸 뒤 그 레이저가 물체에 맞고 되돌아오는 시간을 정밀하게 재어 거리를 역산하는 거예요. 박쥐가 쓰는 반향 위치 파지와 같은 원리지만, 박쥐는 소리를 쓰고 이 센서는 빛을 쓴다는 점이 달라요.

| 항목     | 값                                        |
| -------- | ----------------------------------------- |
| 측정 범위 | 30mm~1200mm (장거리 모드에서 최대 약 2000mm) |
| 거리 정밀도 | ±3%                                       |
| 통신 인터페이스 | I2C (최대 400kHz)                          |
| 레이저 파장 | 940nm (사람 눈에 보이지 않음, Class 1 레이저, 안전) |

선택한 이유는 측정 대상의 색이나 재질에 영향을 거의 받지 않기 때문이에요(적외선 방식이라 초음파와 달리 표면을 거의 가리지 않아요). 게다가 크기가 작아 어떤 케이스에든 들어가고, I2C 배선도 신호선 두 가닥이면 충분해요.

> 💡 **작은 알림: 이 모듈은 보통 광학 커버 글래스를 포함하지 않아요 (저도 살 때 같이 사는 걸 깜빡했어요)**
>
> 개발/테스트 단계에서는 글래스 없이(노출 상태로) 써도 문제없지만, 미리 알아두면 좋은 주의점이 몇 가지 있어요:
>
> - **칩 표면을 손가락으로 만지지 마세요**: 칩 위에 깨알보다 작은 유리 창이 두 개(송신용 1개, 수신용 1개) 있는데, 이 창은 먼지와 기름, 수분에 약해요. 더러워지면 먼지가 레이저를 산란시켜 "크로스토크(crosstalk)"가 발생하고, 측정값이 갑자기 짧아지거나 숫자가 요동치고, 심하면 아예 작동을 안 하게 돼요.
> - **더러워졌다고 대충 닦지 마세요**: 절대 옷자락이나 휴지로 문지르지 마세요(문지르면 바로 흠집이 나요). 먼지가 있으면 **에어 블로워(고무 바람불이)**로 살짝 불어주고, 기름이 묻었다면 면봉에 **무수 알코올**을 살짝 묻혀 아주 가볍게만 닦은 뒤 자연 건조시키면 돼요.
> - **강한 빛 아래에서는 눈이 먼 것처럼 돼요**: 태양광이나 오래된 백열등에는 적외선이 포함돼 있어서, 커버 없이 쓰면 최대 측정 거리가 눈에 띄게 줄어들어요. 실내 테이블 위에서 쓸 때는 거의 체감이 없지만, 야외로 가져가서 쓸 때는 이 점을 염두에 두세요.
>
> 나중에 케이스에 넣어 장기적으로 쓸 계획이라면: **절대 일반 투명 테이프나 유리를 칩 앞에 그냥 붙이지 마세요** — 일반 소재는 적외선을 반사해서 센서가 커버를 장애물로 오인하고, 거리가 `0mm`나 몇 cm로 고정돼 버려요. 구멍을 뚫어 센서가 튀어나오게 하거나, 정직하게 **940nm 적외선 투과 필터**를 구입해 붙이세요. 그것도 최대한 가깝게(간격 1mm 미만) 붙여야 해요.

## BOM 표 (부품 목록)

| 부품                          | 수량 | 비고                                  |
| ----------------------------- | ---- | ------------------------------------- |
| ESP32-S3 개발보드             | 1    | GPIO가 충분히 있는 아무 모델이나 OK    |
| GC9A01 1.28인치 원형 디스플레이 (SPI) | 1    | SPI 버전인지 확인 (병렬 인터페이스 버전이 아님) |
| VL53L0X-V2 ToF 거리 측정 모듈 | 1    | 브레드보드용 모듈 타입                |
| 점퍼 와이어(듀폰선)           | 약간 |                                       |

## 부품 핀 설명

### GC9A01 핀

| 핀        | 역할                                                  |
| --------- | ----------------------------------------------------- |
| VCC       | 전원 양극, 3.3V에 연결                                |
| GND       | 전원 그라운드                                         |
| SCL/CLK   | SPI 클럭 라인                                         |
| SDA/MOSI  | SPI 데이터 라인                                       |
| CS        | 칩 셀렉트, LOW일 때 칩이 동작                         |
| DC        | 데이터/명령 전환 핀                                   |
| RST       | 리셋 핀                                               |
| BL        | 백라이트 제어 핀 (모듈에 따라 빠져 있을 수도 있는데, 무시해도 돼요) |

### VL53L0X-V2 핀

| 핀    | 역할                                                                |
| ----- | ------------------------------------------------------------------- |
| VIN   | 전원 양극                                                           |
| GND   | 전원 그라운드                                                       |
| SCL   | I2C 직렬 클럭 입력                                                  |
| SDA   | I2C 직렬 데이터                                                     |
| GPIO1 | 인터럽트 출력 핀, 데이터 준비 여부 표시 (이 프로젝트에서는 사용 안 함, 그대로 둬도 됨) |
| XSHUT | 셧다운 핀, 기본 HIGH 정상 동작, LOW에서 셧다운 모드 진입 (이 프로젝트에서는 사용 안 함, 그대로 둬도 됨) |

## 배선 방법

아래 표를 보고 한 줄씩 배선하면서, 한 가닥 연결할 때마다 옆에 체크 표시를 해두면 트러블슈팅 시간을 80%는 아낄 수 있어요.

### ESP32-S3과 GC9A01 화면 연결

| GC9A01 화면 | ESP32-S3                                                     |
| ----------- | ------------------------------------------------------------ |
| VCC         | 3.3V                                                         |
| GND         | GND                                                          |
| SCL / CLK   | GPIO12                                                       |
| SDA / MOSI  | GPIO11                                                       |
| CS          | GPIO9                                                        |
| DC          | GPIO10                                                       |
| RST         | GPIO18                                                       |
| BL          | GPIO7 (코드로 제어) 또는 3.3V에 직접 연결 (일부 보드는 백라이트 제어가 따로 없어요) |

### ESP32-S3과 VL53L0X-V2 센서 연결

| VL53L0X-V2 | ESP32-S3                 |
| ---------- | ------------------------ |
| VIN        | 3.3V                     |
| GND        | GND                      |
| SDA        | GPIO13                   |
| SCL        | GPIO14                   |
| GPIO1      | 연결 안 함 (플로팅)     |
| XSHUT      | 연결 안 함 (내부 기본 풀업) |

> ⚠️ **주의**: ESP32-S3의 기본 I2C 핀은 보통 GPIO8(SDA)/GPIO9(SCL)이지만, 이 프로젝트에서는 GPIO9를 화면의 CS가 이미 점유하고 있어서 센서의 I2C를 GPIO13/GPIO14로 수동으로 옮겼어요. 코드에서는 `Wire.begin(I2C_SDA, I2C_SCL)`로 두 핀을 지정하고 있으니, 배선할 때 귀찮다고 기본 핀에 다시 연결하지 마세요. 그러면 화면과 센서가 서로 방해만 하고 둘 다 작동하지 않게 돼요.

## 설치해야 할 라이브러리

Arduino IDE의 "라이브러리 매니저"에서 검색해서 설치하세요:

- `Arduino_GFX_Library` (작성자 moononournation) — 테스트 통과 버전 v1.6.5
- `Adafruit_VL53L0X` (작성자 Adafruit) — 테스트 통과 버전 v1.2.5. 설치할 때 `Adafruit BusIO`도 같이 설치하라고 안내하는데, 함께 설치하면 돼요.

IDE 버전: Arduino IDE 2.3.8, ESP32 보드 지원 패키지는 3.3.10을 사용했어요. 버전 차이가 크면 API 호환성 문제가 생길 수 있으니 가능하면 동일하게 맞추는 걸 추천해요.

## 전체 코드

### 게이지 대시보드 메인 프로그램

```cpp
/*
 * ═══════════════════════════════════════════════════════
 *  사이버 게이지 대시보드 · Cyber Gauge Dashboard
 *  원형 디스플레이 GC9A01 (240×240) + VL53L0X-V2 레이저 거리 측정
 *  MCU: ESP32-S3
 *  구동 라이브러리: Arduino_GFX_Library v1.6.5
 * ═══════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <Arduino_GFX_Library.h>

// ───────── 색상 정의 (Arduino_GFX v1.6.5는 수동 정의 필요) ─────────
#define BLACK       0x0000
#define WHITE       0xFFFF
#define RED         0xF800
#define GREEN       0x07E0
#define BLUE        0x001F
#define CYAN        0x07FF
#define YELLOW      0xFFE0
#define ORANGE      0xFD20
#define DARKGREY    0x4208
#define LIGHTGREY   0xC618

// 사이버 테마 색상
#define CYBER_BG      0x0841    // 깊은 배경
#define CYBER_PANEL   0x1082    // 패널 색상
#define CYBER_BLUE    0x06DF    // 형광 파랑
#define CYBER_CYAN    0x07F5    // 형광 시안
#define CYBER_GREEN   0x47E0    // 형광 초록
#define CYBER_RED     0xF806    // 경고 빨강
#define CYBER_ORANGE  0xFB40    // 주황
#define CYBER_YELLOW  0xFF80    // 노랑
#define CYBER_DIM     0x4A49    // 어두운 색

// ───────── 핀 정의 ─────────
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// VL53L0X는 별도로 I2C를 사용, TFT_CS가 점유 중인 GPIO9 회피
#define I2C_SDA   13
#define I2C_SCL   14

// ───────── 화면 크기 ─────────
#define SCREEN_W  240
#define SCREEN_H  240
#define CX        120     // 중심 X
#define CY        120     // 중심 Y

// ───────── 게이지 파라미터 ─────────
#define GAUGE_R       95      // 눈금 호 반경
#define GAUGE_WIDTH   10      // 호 너비
#define NEEDLE_LEN    78      // 바늘 길이
#define START_ANGLE   135     // 시작 각도 (도)
#define END_ANGLE     405     // 끝 각도 (도)
#define MAX_DIST      800     // 최대 표시 거리 mm
#define MIN_DIST      20      // 최소 거리 mm
#define TICK_COUNT    16      // 눈금 개수

// ───────── 전역 객체 ─────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1 /* MISO */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0 /* rotation */, true /* IPS */
);

Adafruit_VL53L0X lox = Adafruit_VL53L0X();
Arduino_Canvas *canvas;   // 오프스크린 캔버스, 깜빡임 제거

// ───────── 상태 변수 ─────────
float currentAngle = START_ANGLE;
float targetAngle  = START_ANGLE;
int   currentDist  = 0;
int   lastDist     = -1;

// ═══════════════════════════════════════
//  유틸리티 함수
// ═══════════════════════════════════════

// RGB565 색상 혼합
uint16_t blendColor(uint16_t c1, uint16_t c2, float t) {
  uint8_t r1 = (c1 >> 11) & 0x1F, g1 = (c1 >> 5) & 0x3F, b1 = c1 & 0x1F;
  uint8_t r2 = (c2 >> 11) & 0x1F, g2 = (c2 >> 5) & 0x3F, b2 = c2 & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// 거리에 따른 색상 반환 (가깝다=빨강, 멀다=초록)
uint16_t getDistColor(int dist) {
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  if (ratio < 0.15)  return CYBER_RED;
  if (ratio < 0.30)  return blendColor(CYBER_RED, CYBER_ORANGE, (ratio - 0.15) / 0.15);
  if (ratio < 0.50)  return blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.30) / 0.20);
  if (ratio < 0.70)  return blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.50) / 0.20);
  return blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.70) / 0.30);
}

// 상태 텍스트 반환
const char* getStatusText(int dist) {
  if (dist < 100) return "DANGER";
  if (dist < 200) return "WARNING";
  if (dist < 400) return "CAUTION";
  if (dist < 600) return "SAFE";
  return "CLEAR";
}

// ═══════════════════════════════════════
//  드로잉 함수
// ═══════════════════════════════════════

// 굵은 호 그리기 (여러 짧은 선분으로 시뮬레이션)
void drawArc(Arduino_Canvas *c, int cx, int cy, int r,
             float startDeg, float endDeg, int thickness,
             uint16_t color) {
  float step = 1.5;  // 단계당 각도
  for (float a = startDeg; a <= endDeg; a += step) {
    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// 그라데이션 호 그리기
void drawGradientArc(Arduino_Canvas *c, int cx, int cy, int r,
                     float startDeg, float endDeg, int thickness) {
  float totalAngle = endDeg - startDeg;
  float step = 1.5;

  for (float a = startDeg; a <= endDeg; a += step) {
    float ratio = (a - startDeg) / totalAngle;
    uint16_t color;

    // 빨강 -> 주황 -> 노랑 -> 시안 -> 초록
    if (ratio < 0.2)       color = blendColor(CYBER_RED, CYBER_ORANGE, ratio / 0.2);
    else if (ratio < 0.4)  color = blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.2) / 0.2);
    else if (ratio < 0.6)  color = blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.4) / 0.2);
    else                   color = blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.6) / 0.4);

    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// 눈금선 그리기
void drawTicks(Arduino_Canvas *c) {
  float totalAngle = END_ANGLE - START_ANGLE;

  for (int i = 0; i <= TICK_COUNT; i++) {
    float angle = START_ANGLE + (float)i / TICK_COUNT * totalAngle;
    float rad = angle * DEG_TO_RAD;
    float ratio = (float)i / TICK_COUNT;

    // 눈금 색상
    uint16_t color;
    if (ratio < 0.2)       color = CYBER_RED;
    else if (ratio < 0.4)  color = CYBER_ORANGE;
    else if (ratio < 0.6)  color = CYBER_YELLOW;
    else if (ratio < 0.8)  color = CYBER_CYAN;
    else                   color = CYBER_GREEN;

    // 긴/짧은 눈금
    bool isMajor = (i % 4 == 0);
    int innerR  = GAUGE_R + 4;
    int outerR  = innerR + (isMajor ? 12 : 6);
    int thick   = isMajor ? 2 : 1;

    int x1 = CX + cos(rad) * innerR;
    int y1 = CY + sin(rad) * innerR;
    int x2 = CX + cos(rad) * outerR;
    int y2 = CY + sin(rad) * outerR;

    // 눈금선 그리기
    for (int t = 0; t < thick; t++) {
      c->drawLine(x1 + t, y1, x2 + t, y2, color);
    }

    // 주요 눈금 숫자 표기
    if (isMajor) {
      int labelR = outerR + 12;
      int lx = CX + cos(rad) * labelR;
      int ly = CY + sin(rad) * labelR;
      int val = (float)i / TICK_COUNT * MAX_DIST;

      c->setTextColor(CYBER_DIM);
      c->setTextSize(1);
      c->setCursor(lx - 8, ly - 4);
      c->print(val);
    }
  }
}

// 바늘 그리기
void drawNeedle(Arduino_Canvas *c, float angleDeg, uint16_t color) {
  float rad = angleDeg * DEG_TO_RAD;

  // 바늘 끝점
  int tipX = CX + cos(rad) * NEEDLE_LEN;
  int tipY = CY + sin(rad) * NEEDLE_LEN;

  // 바늘 바닥 (바늘 방향에 수직인 두 점)
  float perpRad = rad + PI / 2;
  int baseW = 4;
  int bx1 = CX + cos(perpRad) * baseW;
  int by1 = CY + sin(perpRad) * baseW;
  int bx2 = CX - cos(perpRad) * baseW;
  int by2 = CY - sin(perpRad) * baseW;

  // 삼각형 바늘 그리기
  c->fillTriangle(tipX, tipY, bx1, by1, bx2, by2, color);

  // 중앙 장식 원
  c->fillCircle(CX, CY, 7, CYBER_PANEL);
  c->drawCircle(CX, CY, 7, color);
  c->fillCircle(CX, CY, 3, color);
}

// 전체 게이지 대시보드 그리기
void drawDashboard(int dist) {
  canvas->fillScreen(CYBER_BG);

  // 외곽 장식 원
  canvas->drawCircle(CX, CY, 118, CYBER_PANEL);

  // 배경 호 (어두운 트랙)
  drawArc(canvas, CX, CY, GAUGE_R,
          START_ANGLE, END_ANGLE, GAUGE_WIDTH, CYBER_PANEL);

  // 그라데이션 호 (전체)
  drawGradientArc(canvas, CX, CY, GAUGE_R,
                  START_ANGLE, END_ANGLE, GAUGE_WIDTH);

  // 눈금
  drawTicks(canvas);

  // 바늘 각도 계산
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  targetAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);

  // 부드러운 보간
  currentAngle += (targetAngle - currentAngle) * 0.15;

  // 색상 가져오기
  uint16_t needleColor = getDistColor(dist);

  // 바늘 그리기
  drawNeedle(canvas, currentAngle, WHITE);

  // ── 중앙 숫자 영역 ──
  // 거리 값
  canvas->setTextColor(WHITE);
  canvas->setTextSize(3);
  String distStr = String(dist);
  int textW = distStr.length() * 18;
  canvas->setCursor(CX - textW / 2, CY + 16);
  canvas->print(distStr);

  // 단위
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 6, CY + 42);
  canvas->print("mm");

  // 제목
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 30, CY - 28);
  canvas->print("LASER RANGE");

  // 상태 표시
  canvas->setTextColor(needleColor);
  canvas->setTextSize(1);
  const char* status = getStatusText(dist);
  int sLen = strlen(status);
  canvas->setCursor(CX - sLen * 3, CY + 56);
  canvas->print(status);

  // 화면으로 전송
  canvas->flush();
}

// ═══════════════════════════════════════
//  setup() & loop()
// ═══════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n═══ Cyber Gauge Dashboard ═══");

  // 첫 번째: 백라이트 켜기
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 두 번째: 화면 초기화
  gfx->begin();
  gfx->fillScreen(BLACK);
  gfx->setRotation(0);

  // 세 번째: 오프스크린 캔버스 생성 (더블 버퍼링으로 깜빡임 방지)
  canvas = new Arduino_Canvas(SCREEN_W, SCREEN_H, gfx);
  canvas->begin();

  // 부팅 화면
  canvas->fillScreen(CYBER_BG);
  canvas->setTextColor(CYBER_BLUE);
  canvas->setTextSize(2);
  canvas->setCursor(40, 100);
  canvas->print("CYBER");
  canvas->setCursor(40, 125);
  canvas->print("GAUGE");
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(55, 160);
  canvas->print("Booting...");
  canvas->flush();

  delay(1000);

  // 네 번째: I2C와 센서 초기화 (여기서는 기본 핀이 아닌 커스텀 핀을 사용한다는 점에 주의)
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("VL53L0X 초기화 실패!");
    canvas->fillScreen(CYBER_BG);
    canvas->setTextColor(CYBER_RED);
    canvas->setTextSize(1);
    canvas->setCursor(50, 110);
    canvas->print("SENSOR ERROR");
    canvas->setCursor(40, 130);
    canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(100);
  }

  Serial.println("VL53L0X 준비 완료 ✓");

  // 다섯 번째: 연속 측정 모드 시작
  lox.startRangeContinuous();

  Serial.println("게이지 대시보드 시작 완료!");
}

void loop() {
  // 거리 읽기
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();

    // 유효하지 않은 값 필터링
    if (dist > 0 && dist < 8190) {
      // 간단한 스무딩 필터, 숫자 요동 방지
      currentDist = currentDist * 0.7 + dist * 0.3;
      currentDist = constrain(currentDist, MIN_DIST, MAX_DIST);

      // 거리 변화가 임계값을 넘을 때만 다시 그려서 성능 절약
      if (abs(currentDist - lastDist) > 2) {
        drawDashboard(currentDist);
        lastDist = currentDist;

        Serial.printf("거리: %d mm\n", currentDist);
      }
    }
  }

  delay(30);  // ~33 FPS
}
```

### 센서 테스트 코드 (이것부터 실행하는 걸 추천해요)

본격적으로 메인 프로그램을 굽기 전에, 이 가장 단순한 코드를 먼저 굽는 걸 강력히 추천해요. 센서가 정상적으로 작동하는지 확인할 수 있고, 문제가 생겼을 때 드로잉 코드 사이에서 바늘을 찾듯 헤매지 않고 따로 디버깅하기 편해요.

```cpp
/*
 *  VL53L0X 센서 테스트
 */

#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define I2C_SDA  13
#define I2C_SCL  14

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("VL53L0X 센서 테스트");

  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("❌ 센서를 찾을 수 없어요. 배선을 확인해 주세요!");
    while (1);
  }

  Serial.println("✓ 센서 준비 완료, 측정을 시작합니다...");
  lox.startRangeContinuous();
}

void loop() {
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();
    Serial.printf("거리: %d mm\n", dist);
  }
  delay(100);
}
```

### 코드 설명

헷갈리기 쉬운 몇 가지 핵심 포인트만 짚고 넘어갈게요:

- **`blendColor()`**: 두 개의 RGB565 색상을 비율 `t`로 섞어 빨강→주황→노랑→시안→초록 그라데이션 호를 만들어요. 색을 확 바꾸는 게 아니라 부드럽게 넘어가서 보기에 자연스러워요.
- **`Arduino_Canvas` (오프스크린 캔버스)**: 모든 그리기를 먼저 메모리 속 캔버스에 한 뒤, 마지막에 한 번에 `flush()`로 화면에 밀어넣어요. 한 획 한 획을 화면에 직접 그리는 게 아니에요 — 그렇게 하면 바늘이 돌아갈 때 깜빡임과 찢어짐이 눈에 띄게 보여요.
- **스무딩 필터 `currentDist * 0.7 + dist * 0.3`**: 센서의 날것 값에는 작은 떨림이 있어서, 여기에 간단한 1차 저역통과 필터를 적용해 바늘 움직임을 더 부드럽게 만들었어요. 그래야 숫자가 깜짝깜짝 뛰는 느낌이 안 들어요.
- **`I2C_SDA=13, I2C_SCL=14`**: 앞서 배선 부분에서 반복해 강조한 주의점이에요. 다시 한 번 짚고 넘어갈게요 — 이 두 핀은 ESP32-S3의 기본 I2C 핀이 아니에요. 기본 핀인 GPIO9를 화면의 CS가 점유하고 있어서 수동으로 옮긴 거예요.

## 자주 묻는 문제 해결

진정하세요. 문제의 8할은 이 몇 군데에서 나와요:

1. **업로드 후 화면이 계속 까맣게 나와요**
   먼저 `TFT_BL`(백라이트)이 제대로 연결됐는지, 아니면 코드 안의 `digitalWrite(TFT_BL, HIGH)`가 실행됐는지 확인하세요. 그 다음 RST 핀의 접촉 불량도 체크하세요 — RST가 느슨하면 원형 디스플레이가 검은 화면으로 뜨는 가장 흔한 원인이에요.

2. **시리얼 모니터에 "VL53L0X 초기화 실패!"가 떠요**
   99%는 배선 문제예요. VIN/GND가 반대로 안 꽂혔는지, SDA/SCL이 정말로 GPIO13/GPIO14에 들어가 있는지(기본 핀인 GPIO8/9가 아님), 점퍼 와이어가 느슨하지 않은지 확인하세요. "센서 테스트 코드"를 따로 돌려서 화면이 주는 영향을 배제하는 것도 좋아요.

3. **화면은 켜지는데 노이즈/줄무늬/색이 이상해요**
   대부분 SPI 클럭선이나 데이터선의 접촉 불량이거나, 점퍼 와이어가 너무 길어서 신호가 약해진 거예요. SCL/SDA가 GPIO12/GPIO11에 제대로 매핑됐는지 확인하고, 점퍼 와이어는 15cm 이내로 짧게 유지하세요.

4. **바늘이 미친 듯이 요동치고 숫자가 계속 바뀌어요**
   필터 계수가 약하거나 센서 앞에 반사성/투명한 물체가 있어서 방해받는 경우예요. `currentDist * 0.7 + dist * 0.3`의 가중치를 `0.85/0.15`로 바꾸면 필터가 더 강해져요(대신 반응은 느려진다는 트레이드오프가 있어요).

5. **컴파일 에러: `Adafruit_VL53L0X.h` 또는 `Arduino_GFX_Library.h`를 찾을 수 없어요**
   라이브러리가 제대로 설치되지 않은 거예요. 라이브러리 매니저에서 정확한 이름으로 다시 설치하세요. 같은 이름의 서드파티 fork 버전을 잘못 설치하지 않도록 주의.

6. **바늘 각도나 눈금 숫자가 안 맞아요**
   `MAX_DIST`를 줄였는데 눈금 숫자 표기를 같이 안 고쳤는지 확인하세요. 둘은 항상 일치해야 하고, 그렇지 않으면 눈금 숫자와 실제 바늘 위치가 어긋나요.

## FAQ 질문/답변

**Q: ESP32-S3의 기본 I2C 핀은 어떤 두 개인가요?**
A: 기본은 보통 GPIO8(SDA)과 GPIO9(SCL)이지만, 이 프로젝트에서는 GPIO9를 화면의 CS가 점유하고 있어서 센서 I2C를 GPIO13/GPIO14로 옮겼어요.

**Q: VL53L0X는 최대 얼마까지 잴 수 있고, 정밀도는 어떻게 되나요?**
A: 공식 스펙상 유효 측정 범위는 약 30mm~1200mm이고(장거리 모드에서는 최대 2000mm까지 가능), 정밀도는 약 ±3%예요.

**Q: GC9A01 원형 디스플레이는 터치를 지원하나요?**
A: GC9A01 자체는 디스플레이 구동 칩이라 터치 기능이 없어요. 다만 시중의 일부 모듈은 별도의 정전식 터치 칩을 추가로 달고 있으니, 구매 전에 해당 모델이 터치 버전인지 확인하세요.

**Q: VL53L0X 레이저가 눈에 해로운가요?**
A: 해롭지 않아요. Class 1 레이저 제품으로, 940nm 파장은 사람 눈에 보이지 않고 출력이 매우 낮아 눈 안전 기준을 만족해요. 정상적인 사용에서는 걱정 안 하셔도 돼요.

**Q: GC9A01 화면이 켜지지 않는데 전원은 정상인 이유가 뭔가요?**
A: 가장 흔한 원인은 RST(리셋) 핀의 접촉 불량이거나, 백라이트 BL 핀이 HIGH로 당겨지지 않은 거예요. 이 두 곳을 먼저 점검해 보세요.

**Q: 코드에서 화면에 직접 그리지 않고 오프스크린 캔버스 `Arduino_Canvas`를 쓰는 이유는 뭔가요?**
A: 화면에 직접 그리면 바늘이 돌아가거나 호가 다시 그려질 때 깜빡임과 찢어짐이 뚜렷하게 보여요. 캔버스로 더블 버퍼링을 하고 다 그린 뒤 한 번에 갱신해야 화면이 깔끔해요.

**Q: VL53L0X-V2와 일반 VL53L0X의 차이가 있나요?**
A: 핵심 거리 측정 원리와 핀 정의는 동일해요. V2는 보통 모듈 제조사가 회로 기판 설계나 레귤레이터 회로를 개선한 개정판이고, 구체적인 차이는 구매한 모듈의 실물 자료를 기준으로 확인하세요.

**Q: 이 프로젝트에서 ESP32-S3는 USB 전원으로 충분한가요?**
A: 충분해요. 화면과 센서의 전체 소비 전력이 크지 않아서, 보통의 USB 5V/500mA 전원이면 아무 문제 없어요.

## 더 해볼 만한 응용

- 부저를 하나 연결하고 거리가 DANGER 구간에 들어가면 알람을 울리게 해보세요. 순식간에 간단한 주차 보조 레이더로 변신해요.
- 과거 거리 데이터를 저장해서 실시간 꺾은선 그래프를 그리면 물체의 이동 궤적을 관찰할 수 있어요.
- 버튼 두 개를 추가해 표시 단위를 (mm / cm / inch)로 전환해 보세요.
- 케이스를 만들어 앞유리에 붙이면 진짜 후방 경고 레이더로 써먹을 수 있어요.

## 참고 자료

- [ST VL53L0X 공식 데이터시트](https://www.st.com/en/imaging-and-photonics-solutions/vl53l0x.html)
- [Adafruit_VL53L0X GitHub 저장소](https://github.com/adafruit/Adafruit_VL53L0X)
- [Arduino_GFX_Library GitHub 저장소](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 공식 제품 페이지](https://www.espressif.com/en/products/socs/esp32-s3)
