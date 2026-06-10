---
title: "ESP32-S3 + GC9A01 원형 화면 나침반 삽질기: HMC5883L 실험은 재밌지만, 실사용은 비추천 (완전 튜토리얼)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/hmc5883l
category: esp32
date: 2026-06-10
intro: "ESP32-S3 + GC9A01 원형 화면 + HMC5883L로 보기 좋은 전자 나침반을 만들었지만, 정확도는 글쎄요. 이 글에서는 배선, 캘리브레이션, 코드를 완벽하게 기록하면서, 왜 이 조합이 실험 데모용으로만 적합하고 실제 내비게이션에는 부적합한지 솔직하게 설명합니다."
image: "https://img.lingflux.com/2026/06/79dbcadeea8dba2436b055a92f76fc20.jpg"
---



# ESP32-S3 + GC9A01 + HMC5883L 원형 화면 나침반 삽질 전체 기록 — 만들 수 있고, 보기 좋지만, 정확도는 아시는 대로 (완전 튜토리얼)

난이도: ⭐⭐⭐☆☆ (기초 지식이 있으면 시작 가능)
예상 소요 시간: 45분
테스트 환경: Arduino IDE 2.3.8 · Arduino_GFX_Library v1.6.5 · Adafruit_HMC5883_U v1.2.4

---

> ⚠️ **결론부터 말씀드리면:** 이 조합으로 만든 나침반은 보기에는 멋지고 대략적인 방향은 맞지만, 정확도가 보통 ±5°~±15° 수준이며 주변 자기장의 영향을 크게 받습니다. 드라이버 학습, 데모, 책상 장식용으로는 충분합니다. 야외 내비게이션, 드론 방향 측정 등 정확도가 중요한 용도에는 **추천하지 않습니다**. 이유는 뒤에서 설명합니다.

> **TL;DR (빠른 시작):**
> 1. 먼저 I2C 스캔을 실행하여 칩 주소를 확인 — `0x0D`는 QMC5883L(복제판), `0x1E`가 진짜 HMC5883L입니다. 모델에 맞는 라이브러리를 설치하지 않으면 읽은 값이 전부 쓰레기입니다
> 2. 배선표에 따라 12개 선을 연결 (화면 8개 + 센서 4개, 3.3V/GND는 공유 가능)
> 3. `DECLINATION_DEG`를 도시의 자기 편각으로 변경 (서울 약 -8°, 도쿄 약 -7.5°, 조회 링크는 글 끝에 있음)
> 4. 전원 인가 시 BOOT 키(GPIO0)를 누른 상태로 15초 회전 캘리브레이션 진입, 수평으로 천천히 한 바퀴 돌리기
> 5. 손을 떼면 캘리브레이션 데이터가 자동으로 NVS에 저장, 전원이 꺼져도 유지되어 다음에 바로 사용 가능

---

## 서론

이 GC9A01 원형 화면을 샀을 때 잠시 바라보았습니다 — 1.28인치, 240×240, 완벽한 원형. 이건 태어날 때부터 나침반 다이얼이 아니겠어요?

그리고 주말 하나를 들여 만들어냈고, 스마트폰과 비교해 보았습니다... 음, 바늘의 대략적인 방향은 맞는데, 약간 어긋나네요. 대략 10도 정도요. 몇 바퀴 더 돌려보니, 아예 안 움직이기도 합니다. 전원을 껐다 켜도 여전히 잘 안 돌아갑니다...

"캘리브레이션이 잘 안 됐겠지." 다시 캘리브레이션을 하고, 다른 장소에서 측정하고, iPhone을 마주보고 빙글빙글 돌아도 — 차이는 여전히 존재했습니다. 코드가 틀린 게 아니라, 이 센서 모듈 자체의 한계입니다. 스마트폰을 가까이 대면 영향을 받는 것도 관찰할 수 있었습니다.

그래서 이 글의 목적은 두 가지입니다. 첫째, 원형 화면 나침반을 완전하게 만들어서 코드가 실행되고, 캘리브레이션이 통과되며, 효과가 정말 보기 좋다는 것까지 보여드리는 것. 둘째, 정확도의 한계를 명확히 설명해서, 여러분이 손대기 전에 "어디서 삽질하는지" 알 수 있게 하는 것 — 다 만들고 나서야 바늘이 Google Maps와 맞지 않는 것을 발견하는 것이 아니라.

GC9A01 + HMC5883L 드라이버 방법을 배우거나 멋진 책상 장식을 만들고 싶다면 이 프로젝트는 충분히 가치가 있습니다. "내비게이션 정확도"가 목표라면 글 뒤쪽의 "실제 프로젝트에 적합한가?" 섹션으로 바로 건너뛰어 계속할지 결정하세요.

---

## 실험 결과

![](https://img.lingflux.com/2026/06/61587ad00164cf25e866feb4066e069f.jpg)

GC9A01 원형 화면에 나침반 다이얼이 실시간으로 표시됩니다: 빨간 바늘이 북쪽을 가리키고, 중앙의 녹색 숫자는 현재 방위각(0°~359°)을 표시하며, 노란색 글자로 가장 가까운 8방위(N / NE / E / SE / S / SW / W / NW)를 표시합니다. 전원 인가 시 BOOT 키를 누르고 있으면 15초 회전 캘리브레이션 모드로 진입하고, 화면에 진행 바와 실시간 자기장 범위가 표시됩니다. 캘리브레이션이 완료되면 바늘이 부드럽게 움직이고 약 25fps로 동작하며, 캘리브레이션 전처럼 마구 흔들리지 않습니다.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/DDc_7iRCPy8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

> **정확도에 대해 먼저 말씀드리면:** 캘리브레이션된 HMC5883L은 이상적인 환경(금속 및 다른 자기장원에서 멀리)에서 방위각 오차가 약 ±5°입니다. 컴퓨터 본체, 충전기, 스피커 또는 드라이버 가까이에 있으면 오차가 쉽게 ±15° 이상으로 커집니다. 일상적인 책상 사용에서는 "대략적인 방향은 맞다"이지만, 제가 구매한 이 모듈이 정품인지는 모르겠고 가끔 오작동으로 안 움직이기도 합니다. 십의 자리 정확도는 기대하지 마세요. 이것은 하드웨어 자체의 한계이지 코드의 문제가 아닙니다. 뒤의 "실제 프로젝트에 적합한가?" 섹션에서 자세히 설명합니다.

---

## 부품 설명

**GC9A01 원형 TFT 화면**

지름 3.2cm의 원형 시계 화면을 상상해 보세요 — GC9A01이 바로 그것입니다. SPI 인터페이스, 해상도 240×240, 드라이버는 화면 컨트롤러에 내장되어 있어 ESP32가 직접 픽셀을 밀어넣기만 하면 되고 외부 RAM이 필요 없습니다. 이것을 선택한 이유는 첫째, 원형이 자연스럽게 나침반 UI에 적합하고, 둘째, Arduino_GFX_Library가 완전한 지원을 제공하여 드라이버 코드가 몇 줄이면 끝나기 때문입니다.

| 파라미터 | 사양 |
| --- | --- |
| 해상도 | 240 × 240 px |
| 인터페이스 | SPI (최대 80 MHz) |
| 전원 | 3.3V |
| 백라이트 제어 | HIGH 켜짐 |
| 일반 소비 전류 | 약 20 mA (최대 밝기) |



**GC9A01 화면 모듈 (8핀)**

| 핀 라벨 | 기능 |
| --- | --- |
| VCC | 3.3V 전원 |
| GND | 그라운드 |
| SCL / CLK | SPI 클럭 |
| SDA / MOSI | SPI 데이터 (마스터→슬레이브) |
| CS | 칩 셀렉트, LOW 활성 |
| DC | 데이터/명령 선택 |
| RST | 하드웨어 리셋, LOW 활성 |
| BL | 백라이트 제어, HIGH 켜짐 |



**HMC5883L / QMC5883L 3축 자력계**

자력계는 나침반의 "코" 역할을 하여, 지구 자기장의 X/Y/Z 세 방향 세기를 감지한 다음 역삼각함수로 어느 방향을 향하고 있는지 계산합니다. I2C 인터페이스, 3.3V 전원, 한 번의 데이터 읽기에 몇 밀리초밖에 걸리지 않습니다.

특별히 설명할 점: 시장에 나와 있는 대부분의 "HMC5883L"이라고 표시된 모듈은 실제로 QST사의 QMC5883L 칩입니다 — 두 제품은 핀이 호환되지만 레지스터가 완전히 다르고, 해당하는 드라이버 라이브러리도 다릅니다. **라이브러리를 설치하기 전에 아래의 I2C 스캔 단계로 어떤 칩인지 확인한 후 해당 라이브러리를 설치하세요. 문제 해결 시간의 대부분을 줄일 수 있습니다.**

| 파라미터 | HMC5883L (원본) | QMC5883L (복제) |
| --- | --- | --- |
| I2C 주소 | 0x1E | 0x0D |
| 측정 범위 | ±8 Gauss | ±8 Gauss |
| 해상도 | 2 mGauss | 2 mGauss |
| 노이즈 밀도 | ~2 mGauss/√Hz | ~2 mGauss/√Hz |



**HMC5883L / QMC5883L 자력계 모듈 (일반적으로 사용하는 4핀)**

| 핀 라벨 | 기능 |
| --- | --- |
| VCC | 3.3V 전원 |
| GND | 그라운드 |
| SDA | I2C 데이터 |
| SCL | I2C 클럭 |
| DRDY | 데이터 준비 인터럽트 (이 프로젝트에서는 사용하지 않음, 연결하지 않아도 됨) |

두 제품은 기본 성능이 비슷하고 실험 데모용으로는 모두 문제가 없습니다. 하지만 분명히 말씀드려야 할 점은: 어느 칩이든 이 가격대의 자력계 모듈은 온디바이스 온도 드리프트 보정도 없고 센서 퓨전도 없으며, 가장 기본적인 2차원 자기장 측정만 수행합니다 — 이것이 정확도의 상한을 결정하며, 동시에 데모와 학습용으로만 적합하고 실제 내비게이션 애플리케이션에는 부적합하다는 것을 결정합니다.

---

## BOM 표

| 부품 | 모델 / 사양 | 수량 | 참고 가격 |
| --- | --- | --- | --- |
| 메인 보드 | ESP32-S3 (아무 개발 보드) | 1 | ¥25~40 |
| 원형 TFT 화면 | GC9A01, 1.28인치, 240×240 | 1 | ¥12~20 |
| 자력계 모듈 | HMC5883L 또는 QMC5883L | 1 | ¥3~8 |
| 점퍼 와이어 | 암-수, 20cm | 약간 | ¥3 |

---

## 배선 방법

> 배선을 완료한 후 표를 보고 선별로 확인하는 것을 추천합니다. 이 단계만으로 "왜 반응이 없나요" 문제 해결 시간의 80%를 줄일 수 있습니다.

**GC9A01 원형 화면 → ESP32-S3**

| 화면 핀 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (또는 3.3V에 직접 연결하여 항상 켜기) |

**HMC5883L / QMC5883L → ESP32-S3**

| 센서 핀 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO14 |
| SCL | GPIO13 |



---

## 설치해야 할 라이브러리

설치하기 전에 먼저 할 일이 있습니다 — 자력계 칩 모델을 확인하는 것입니다. 아래 코드를 업로드하고 시리얼 모니터(115200)를 열어 출력되는 I2C 주소를 확인하세요:

```cpp
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(13, 14);  // SDA=13, SCL=14, 이 프로젝트와 일치

  Serial.println("Scanning I2C...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("Found device at 0x%02X\n", addr);
    }
  }
  Serial.println("Done.");
}

void loop {}
```

- `0x1E` 출력 → 진짜 HMC5883L, **Adafruit HMC5883 Unified** (작성자 Adafruit) 설치
- `0x0D` 출력 → QMC5883L, 코드의 `#include`와 센서 객체를 해당 라이브러리로 교체 필요 (자주 묻는 질문 3번 참조)

칩을 확인한 후, Arduino IDE → 라이브러리 관리자를 열어 검색 및 설치:

| 라이브러리 이름 | 해당 칩 | 테스트 통과 버전 |
| --- | --- | --- |
| Arduino_GFX_Library | — | v1.6.5 |
| Adafruit HMC5883 Unified | HMC5883L (0x1E) | v1.2.4 |
| Adafruit Unified Sensor | 둘 다 필요 | v1.1.15 |

QMC5883L(0x0D)인 경우, 뒤에 자주 묻는 질문에서 대체 방안을 확인하세요.

---

## 전체 코드

```cpp
#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>
#include <Preferences.h>
#include <math.h>

// ─── 1단계: 핀 정의 ────────────────────────────────
#define TFT_SCK  12
#define TFT_MOSI 11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7
#define I2C_SDA  14
#define I2C_SCL  13

// 전원 인가 시 이 키를 누르고 있으면 캘리브레이션 모드 진입 (BOOT 키, GPIO0, 별도 버튼 필요 없음)
#define CAL_BTN   0

// 자기 편각 (서편은 음수) — 조회 도구: https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
// 베이징 ≈ -6.5°, 상하이 ≈ -5.5°, 광저우 ≈ -3°, 도쿄 ≈ -7.5°, 서울 ≈ -8°
// 이 값을 변경하지 않으면 나침반 전체가 X도 어긋나고 모든 방향이 틀립니다
#define DECLINATION_DEG  (-3.0f)

// ─── 2단계: 디스플레이 객체 초기화 ────────────────────────────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01  *gfx = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas 이중 버퍼링: 메모리에서 전체 프레임을 먼저 그린 후 화면에 한 번에 푸시하여 깜빡임 해결
// 메모리 사용량: 240×240×2 = 115 KB (ESP32-S3의 PSRAM 또는 내부 SRAM 모두 충분)
Arduino_Canvas  *canvas = new Arduino_Canvas(240, 240, gfx, 0, 0);

// ─── 센서 객체 ──────────────────────────────────
Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);

// ─── 캘리브레이션 파라미터 (하드 아이언 오프셋 + 소프트 아이언 스케일링, NVS에 저장) ───────────
Preferences prefs;
float calOffX = 0, calOffY = 0;
float calSclX = 1, calSclY = 1;

// ─── EMA 저역 통과 필터 파라미터 ────────────────────────────
float gSmooth    = 0;
bool  gFirstRead = true;

// alpha가 작을수록 더 부드러움 (하지만 반응이 느려짐); 책상에 놓고 사용하면 0.15, 손에 들고 이동하면 0.25로 조정
#define EMA_ALPHA  0.15f

// ─── 색상 정의 (RGB565 형식) ────────────────────────────────
#define C_BG      0x0000   // 검은 배경
#define C_RING    0x4208   // 진회색 외곽선
#define C_TICK    0x7BEF   // 회색 작은 눈금
#define C_MAJOR   0xFFFF   // 흰색 주눈금 / 라벨
#define C_NORTH   0xF800   // 빨간색 N
#define C_NDL_N   0xF800   // 빨간 바늘 (북쪽 끝)
#define C_NDL_S   0xCE79   // 은색 바늘 (남쪽 끝)
#define C_DEG     0x07E0   // 녹색 각도 숫자
#define C_DIR     0xFFE0   // 노란색 방향 글자

const char* kDir[] = {"N","NE","E","SE","S","SW","W","NW"};

#define CX 120   // 중심 X
#define CY 120   // 중심 Y
#define R  100   // 다이얼 반지름

// ─────────────────────────────────────────────
//  방위각 읽기 (하드 아이언/소프트 아이언 캘리브레이션 보정 포함)
// ─────────────────────────────────────────────
float readHeading() {
  sensors_event_t ev;
  mag.getEvent(&ev);

  // 하드 아이언 오프셋을 빼서 주변 고정 자기장 (나사, 구리 기둥 등)의 간섭 제거
  float x = ev.magnetic.x - calOffX;
  float y = ev.magnetic.y - calOffY;
  // 소프트 아이언 정규화: 타원형 자기장 응답을 원형으로 매핑
  if (calSclX > 0.01f) x /= calSclX;
  if (calSclY > 0.01f) y /= calSclY;

  float h = atan2f(y, x) + DECLINATION_DEG * (float)M_PI / 180.0f;
  if (h <  0)               h += 2.0f * (float)M_PI;
  if (h > 2.0f*(float)M_PI) h -= 2.0f * (float)M_PI;
  return h * 180.0f / (float)M_PI;
}

// ─────────────────────────────────────────────
//  EMA 저역 통과 필터 (0°/360° 래핑 점프 올바르게 처리)
// ─────────────────────────────────────────────
float emaFilter(float newAngle) {
  if (gFirstRead) { gFirstRead = false; return newAngle; }
  float d = newAngle - gSmooth;
  if (d >  180.0f) d -= 360.0f;   // 예: 359°에서 1°로 점프하면 차이는 +2°이어야 함, -358°가 아님
  if (d < -180.0f) d += 360.0f;
  float r = gSmooth + d * EMA_ALPHA;
  if (r <   0.0f) r += 360.0f;
  if (r >= 360.0f) r -= 360.0f;
  return r;
}

// ─────────────────────────────────────────────
//  전체 프레임 렌더링 (완전한 프레임을 그린 후 화면에 푸시, 깜빡임 제거)
// ─────────────────────────────────────────────
void drawFrame(float angle) {
  canvas->fillScreen(C_BG);

  // 외곽선 (4픽셀 너비, 다이얼에 테두리 느낌 추가)
  for (int r = R; r > R - 4; r--)
    canvas->drawCircle(CX, CY, r, C_RING);

  // 눈금선: 10°마다 하나, 30°마다 길게, 90°마다 흰색
  for (int deg = 0; deg < 360; deg += 10) {
    float rad = deg * (float)M_PI / 180.0f;
    int   len = (deg % 30 == 0) ? 12 : 6;
    canvas->drawLine(
      CX + (int)(cosf(rad) * (R - 5)),    CY + (int)(sinf(rad) * (R - 5)),
      CX + (int)(cosf(rad) * (R-5-len)),  CY + (int)(sinf(rad) * (R-5-len)),
      (deg % 90 == 0) ? C_MAJOR : C_TICK
    );
  }

  // N/E/S/W 라벨, N은 빨간색으로 눈에 띄게
  canvas->setTextSize(2);
  canvas->setTextColor(C_NORTH); canvas->setCursor(CX-6,    CY-R+20);  canvas->print("N");
  canvas->setTextColor(C_MAJOR); canvas->setCursor(CX+R-32, CY-7);     canvas->print("E");
                                 canvas->setCursor(CX-6,    CY+R-32);  canvas->print("S");
                                 canvas->setCursor(CX-R+20, CY-7);     canvas->print("W");

  // 바늘 (3픽셀 너비, 시각적으로 더 명확)
  float rad  = angle * (float)M_PI / 180.0f;
  float perp = rad + (float)M_PI / 2.0f;
  int   pdx  = (int)roundf(cosf(perp));
  int   pdy  = (int)roundf(sinf(perp));
  int   nx   = CX + (int)(sinf(rad) * 68);   // 빨간 바늘 (북쪽 끝)
  int   ny   = CY - (int)(cosf(rad) * 68);
  int   sx   = CX - (int)(sinf(rad) * 42);   // 은색 바늘 (남쪽 끝, 짧게)
  int   sy   = CY + (int)(cosf(rad) * 42);
  for (int d = -1; d <= 1; d++) {
    canvas->drawLine(CX+pdx*d, CY+pdy*d, nx+pdx*d, ny+pdy*d, C_NDL_N);
    canvas->drawLine(CX+pdx*d, CY+pdy*d, sx+pdx*d, sy+pdy*d, C_NDL_S);
  }

  // 중심축 작은 원 (장식용)
  canvas->fillCircle(CX, CY, 9, C_RING);
  canvas->drawCircle(CX, CY, 9, 0xA534);
  canvas->fillCircle(CX, CY, 3, C_MAJOR);

  // 중앙에 각도 숫자 (녹색)와 8방위 글자 (노란색) 표시
  canvas->setTextSize(2);
  canvas->setTextColor(C_DEG);
  char buf[8]; sprintf(buf, "%3d", (int)angle);
  canvas->setCursor(CX - 18, CY - 14); canvas->print(buf);

  int   idx = ((int)(angle + 22.5f) % 360) / 45;
  int   w   = strlen(kDir[idx]) * 6;
  canvas->setTextSize(1);
  canvas->setTextColor(C_DIR);
  canvas->setCursor(CX - w/2, CY + 6); canvas->print(kDir[idx]);

  canvas->flush();   // ← 전체 프레임을 한 번에 화면에 푸시, 이 줄이 깜빡임 해결의 핵심
}

// ─────────────────────────────────────────────
//  15초 회전 캘리브레이션
//  원리: 센서가 각 방향에서의 최대/최소값을 기록,
//       하드 아이언 오프셋(offset)과 소프트 아이언 스케일링(scale) 계산
// ─────────────────────────────────────────────
void runCalibration() {
  float minX =  1e6f, maxX = -1e6f;
  float minY =  1e6f, maxY = -1e6f;
  const uint32_t DUR = 15000;
  uint32_t t0 = millis();

  while (millis() - t0 < DUR) {
    sensors_event_t ev; mag.getEvent(&ev);
    if (ev.magnetic.x < minX) minX = ev.magnetic.x;
    if (ev.magnetic.x > maxX) maxX = ev.magnetic.x;
    if (ev.magnetic.y < minY) minY = ev.magnetic.y;
    if (ev.magnetic.y > maxY) maxY = ev.magnetic.y;

    // 실시간 캘리브레이션 진행 화면 표시
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR);  canvas->setTextSize(2);
    canvas->setCursor(15, 60);  canvas->print("CALIBRATING");
    canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
    canvas->setCursor(8, 95);   canvas->print("Slowly rotate 360 deg");
    canvas->setCursor(18, 109); canvas->print("Keep device level");
    // 진행 바
    int p = (millis() - t0) * (R*2-2) / DUR;
    canvas->drawRect(20, 130, R*2, 14, C_MAJOR);
    canvas->fillRect(21, 131, p, 12, 0x07E0);
    // 실시간 자기장 범위 표시 (한 바퀴를 다 돌았는지 확인에 도움)
    char b[44];
    canvas->setTextColor(0x7BEF);
    sprintf(b, "X[%.1f ~ %.1f]", minX, maxX);
    canvas->setCursor(8, 157); canvas->print(b);
    sprintf(b, "Y[%.1f ~ %.1f]", minY, maxY);
    canvas->setCursor(8, 170); canvas->print(b);
    canvas->flush();
    delay(50);
  }

  // 오프셋과 스케일링 계산
  calOffX = (maxX + minX) / 2.0f;
  calOffY = (maxY + minY) / 2.0f;
  calSclX = (maxX - minX) / 2.0f;  if (calSclX < 0.01f) calSclX = 1.0f;
  calSclY = (maxY - minY) / 2.0f;  if (calSclY < 0.01f) calSclY = 1.0f;

  // NVS에 저장 (전원 꺼져도 유지)
  prefs.begin("compass", false);
  prefs.putFloat("offX", calOffX);  prefs.putFloat("offY", calOffY);
  prefs.putFloat("sclX", calSclX);  prefs.putFloat("sclY", calSclY);
  prefs.end();

  // 캘리브레이션 결과 화면
  canvas->fillScreen(C_BG);
  canvas->setTextColor(0x07E0); canvas->setTextSize(2);
  canvas->setCursor(30, 88); canvas->print("CAL DONE!");
  canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
  char b[44];
  sprintf(b, "offX = %.1f", calOffX); canvas->setCursor(10, 120); canvas->print(b);
  sprintf(b, "offY = %.1f", calOffY); canvas->setCursor(10, 133); canvas->print(b);
  sprintf(b, "sclX = %.1f", calSclX); canvas->setCursor(10, 148); canvas->print(b);
  sprintf(b, "sclY = %.1f", calSclY); canvas->setCursor(10, 161); canvas->print(b);
  canvas->flush();
  delay(3000);
}

// ─────────────────────────────────────────────
//  NVS에서 이전에 저장한 캘리브레이션 데이터 로드
// ─────────────────────────────────────────────
void loadCalibration() {
  prefs.begin("compass", true);
  calOffX = prefs.getFloat("offX", 0.0f);
  calOffY = prefs.getFloat("offY", 0.0f);
  calSclX = prefs.getFloat("sclX", 1.0f);
  calSclY = prefs.getFloat("sclY", 1.0f);
  prefs.end();
  if (calSclX < 0.01f) calSclX = 1.0f;
  if (calSclY < 0.01f) calSclY = 1.0f;
  Serial.printf("[CAL] off=(%.2f, %.2f)  scl=(%.2f, %.2f)\n",
                calOffX, calOffY, calSclX, calSclY);
}

// ─────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TFT_BL, OUTPUT); digitalWrite(TFT_BL, HIGH);  // 백라이트 켜기
  pinMode(CAL_BTN, INPUT_PULLUP);

  gfx->begin();
  canvas->begin();       // 프레임 버퍼 할당, 약 115 KB 메모리 소비

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000); // 400 kHz 패스트 모드, I2C 읽기 지연 감소

  if (!mag.begin()) {
    // 센서를 찾을 수 없을 때 화면에 빨간색 오류 메시지 표시
    canvas->fillScreen(0xF800);
    canvas->setTextColor(0xFFFF); canvas->setTextSize(2);
    canvas->setCursor(10, 100); canvas->print("SENSOR ERROR");
    canvas->setCursor(10, 125); canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(500);
  }

  loadCalibration();

  // 전원 인가 시 BOOT(GPIO0) 누르고 있으면 → 회전 캘리브레이션 진입
  if (digitalRead(CAL_BTN) == LOW) {
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR); canvas->setTextSize(1);
    canvas->setCursor(10, 112); canvas->print("Release to start cal...");
    canvas->flush();
    while (digitalRead(CAL_BTN) == LOW) delay(10);
    delay(500);
    runCalibration();
  }

  // 처음 몇 개의 불안정한 웜업 읽기 버리기
  for (int i = 0; i < 8; i++) {
    sensors_event_t ev; mag.getEvent(&ev); delay(15);
  }
  gSmooth    = readHeading();
  gFirstRead = false;
}

// ─────────────────────────────────────────────
//  Loop: 읽기 → 필터링 → 렌더링, 약 25fps 루프
// ─────────────────────────────────────────────
void loop() {
  float raw = readHeading();
  gSmooth   = emaFilter(raw);
  drawFrame(gSmooth);
  delay(30);  // 30ms ≈ 33fps, 실제 렌더링 시간 포함하면 약 25fps
}
```

### 코드 설명

**왜 Canvas를 사용하나요?** `Arduino_Canvas`는 메모리에 115KB의 "밑지"를 만들어서 전체 프레임을 먼저 완성한 다음, `canvas->flush()`로 한 번에 화면에 푸시합니다. 화면에 직접 그리면 매 획이 즉시 표시되어 바늘이 돌아갈 때 뚜렷하게 깜빡입니다. Canvas가 이 문제를 해결하며, 대가는 메모리를 조금 더 사용하는 것입니다.

**`readHeading()`은 무엇을 하나요?** 센서에서 얻은 X/Y 자기장 세기에서 하드 아이언 오프셋을 빼고(고정 자기장 간섭 제거), 소프트 아이언 스케일링 계수로 나누어(각 축 감도 불일치 수정), 마지막으로 자기 편각 보정을 더하여 진북 방향의 각도를 얻습니다.

**`emaFilter()`는 왜 래핑 처리를 해야 하나요?** 바늘이 359°에서 1°로 넘어가면 두 읽기 값의 차이는 -358°입니다. 이대로 가중 평균을 하면 바늘이 반대 방향으로 크게 돌아갑니다. 코드에서는 먼저 차이를 [-180°, +180°] 범위로 제한한 다음 평활화하여 0°를 넘나드는 경우를 올바르게 처리합니다.

**캘리브레이션 원리는 무엇인가요?** 수평면에서 한 바퀴를 돌면 센서의 X/Y 읽기가 타원을 그립니다 (이상적으로는 원). 최대/최소값을 기록하고, 중간점이 하드 아이언 오프셋, 반지름이 소프트 아이언 스케일링 계수입니다. 캘리브레이션이 완료되면 데이터가 NVS(스마트폰의 EEPROM과 유사)에 저장되어 다음 전원 인가 시 자동으로 로드되며 매번 다시 캘리브레이션할 필요가 없습니다.

---

## 자주 묻는 문제 해결

당황하지 마세요, 문제의 90%는 다음 몇 가지에서 발생합니다.

**화면이 완전히 검거나 완전히 흰색, 아무것도 표시되지 않음.** 먼저 BL(백라이트) 핀이 HIGH인지 확인 — GPIO7에 연결했다면 코드에 `digitalWrite(TFT_BL, HIGH)`가 있는지 확인; 3.3V에 직접 연결했다면 백라이트가 계속 켜져 있어야 하고, 화면이 검다는 것은 다른 핀에 문제가 있다는 뜻입니다. 그 다음 배선표를 보고 CS, DC, RST가 올바른 GPIO에 연결되었는지 선별로 확인하세요. 특히 CS와 DC를 반대로 연결하는 것이 자주 발생하는 실수입니다.

**시리얼에 `SENSOR ERROR`가 출력되고 화면에 빨간색 오류 표시.** 자력계가 응답하지 않습니다. 아마도 I2C 배선 문제 — SDA/SCL을 반대로 연결했거나, 다른 GPIO에 연결했을 가능성이 높습니다. `Wire.begin(13, 14)`이 실제로 연결한 핀과 일치하는지 확인하세요. 또 다른 가능성은 모듈에 3.3V 전원이 공급되지 않는 것, 멀티미터로 VCC 핀 전압을 측정해 보세요.

**바늘이 마구 흔들리거나, 전혀 정확하지 않거나, 계속 한 방향에서 멈춰 있음.** 가장 가능성이 높은 원인은 모듈이 QMC5883L(0x0D)인데 코드에서 HMC5883L 라이브러리를 사용하고 있는 것 — 두 라이브러리의 레지스터 정의가 완전히 달라서 읽은 값이 엉망이 됩니다. 먼저 I2C 스캔을 실행하여 주소를 확인하고, 0x0D라면 코드의 `#include <Adafruit_HMC5883_U.h>`와 센서 객체를 QMC5883LCompass 라이브러리의 방식으로 교체해야 합니다. 온라인에 바로 사용할 수 있는 적응 예제가 있습니다.

**캘리브레이션을 했는데 방향이 여전히 10°~20° 어긋남.** `DECLINATION_DEG`를 도시의 값으로 변경했는지 확인하세요. 이 파라미터가 5°만 틀려도 모든 방향이 체계적으로 어긋납니다. 도쿄 약 -7.5°, 베이징 약 -6.5°, 서울 약 -8°, 정확한 값은 글 끝의 NOAA 도구로 조회하세요. 또 다른 원인은 캘리브레이션 시 주변에 강한 자기장(스마트폰, 드라이버, 스피커 자석)이 있었던 것, 더 탁 트인 장소에서 다시 캘리브레이션해 보세요.

**컴파일 에러 `Adafruit_HMC5883_U.h: No such file or directory`.** 라이브러리가 설치되지 않았거나 잘못 설치됨. Arduino IDE → 도구 → 라이브러리 관리를 열고 `HMC5883`을 검색하여 Adafruit HMC5883 Unified와 그 종속성인 Adafruit Unified Sensor를 설치하세요.

---

## FAQ 질문답

**Q: HMC5883L과 QMC5883L의 차이는 무엇인가요? 같은 라이브러리로 구동할 수 있나요?**
A: 혼용할 수 없습니다. 두 제품은 핀이 완전히 호환되지만 (납땡하면 외형이 동일), 내부 레지스터 주소가 다르고 드라이버 프로토콜도 다르며, 잘못된 라이브러리를 사용하면 읽은 값이 전부 의미 없는 숫자입니다. HMC5883L의 I2C 주소는 0x1E, QMC5883L은 0x0D이며, I2C 스캔으로 1초 만에 확인할 수 있습니다.

**Q: BL 백라이트 핀을 3.3V에 직접 연결해도 되나요, 아니면 GPIO에 연결해야 하나요?**
A: 3.3V에 직접 연결해도 완전히 괜찮습니다. 화면이 항상 켜진 상태로 유지됩니다. GPIO로 제어하면 코드에서 밝기를 조절하거나 대기 모드에서 백라이트를 꺼서 전력을 절약할 수 있는 장점이 있습니다. 이 기능이 필요 없다면 3.3V에 연결하여 GPIO 하나를 아끼는 것이 좋습니다.

**Q: `DECLINATION_DEG`의 정확한 값을 어떻게 조회하나요?**
A: NOAA에서 제공하는 자기 편각 계산 도구(글 끝 참고 자료 참조)를 사용하여 도시 좌표를 입력하고 Model을 WMM으로 선택하면 현재 날짜의 정확한 자기 편각을 얻을 수 있습니다. 동편은 양수, 서편은 음수입니다. 일본 동부 도시는 보통 -7° ~ -8°, 한국은 약 -7° ~ -9°, 중국 동부 해안은 약 -5° ~ -6°입니다.

**Q: `EMA_ALPHA`를 크게 하거나 작게 하면 어떤 차이가 있나요?**
A: alpha가 클수록 바늘 반응이 빠르지만 떨림이 심해지고, 작을수록 바늘이 부드럽지만 회전 시 눈에 띄는 지연이 생깁니다. 0.15는 책상에 평평하게 놓는 시나리오에 적합하고, 손에 들고 움직이는 경우 0.25 ~ 0.3으로 조정할 수 있습니다. 범위는 0.0(완전히 움직이지 않음)에서 1.0(필터 없음, 원시 값)입니다.

**Q: 캘리브레이션 데이터는 어디에 저장되나요? 다른 컴퓨터에서 코드를 다시 업로드해도 유지되나요?**
A: 캘리브레이션 데이터는 ESP32의 NVS(비휘발성 저장소, EEPROM과 유사)에 저장되며, 새 코드를 업로드해도 NVS가 지워지지 않아 다음 전원 인가 시 바로 로드됩니다. "전체 Flash 지우기" 작업을 수행할 때만 손실되며, 그때 다시 캘리브레이션을 한 번 해야 합니다.

**Q: 115KB 프레임 버퍼가 너무 크지 않나요? ESP32-C3에서 사용할 수 있나요?**
A: ESP32-S3은 512KB SRAM이 있어 115KB는 문제없습니다. ESP32-C3은 400KB SRAM뿐이어서 코드와 스택을 합치면 실제로는 다소 빠듯하며, PSRAM 버전을 사용하거나 더 작은 크기의 화면으로 변경하는 것이 좋습니다. 원본 ESP32(WROOM / WROVER)는 SRAM이 더 적고, WROVER 버전은 PSRAM이 있어 사용 가능하지만, WROOM 무PSRAM 버전은 대부분 OOM 크래시가 발생합니다.

**Q: 나침반이 스마트폰과 10도 이상 차이 나는 것이 정상인가요?**
A: 이 조합에서 10도 이상 차이 나는 것은 완전히 정상적인 현상이며 버그가 아닙니다. HMC5883L/QMC5883L은 간섭이 있는 실제 환경에서 ±10°~±15°가 일반적인 오차 범위입니다. 오차가 ±5° 이내로 안정적이라면 캘리브레이션이 잘 된 편입니다. 오차를 더 줄이려면 정확도가 더 높은 센서로 교체하고 9축 퓨전을 도입해야 하며, 파라미터 조정만으로는 부족합니다.

**Q: 이 조합으로 실제 내비게이션이나 방향 측정 제품을 만들 수 있나요?**
A: 추천하지 않습니다. 정확도가 ±5°~±15°이고 주변 자기장 환경의 영향을 크게 받으며, 틸트 보상도 없습니다 — 수평이 아닌 상태로 기울어지면 오차가 눈에 띄게 커집니다. 데모, 원리 학습, 책상 장식용으로는 충분하고, 실제 내비게이션 정확도가 필요한 경우에는 ICM-20948 같은 하드웨어 센서 퓨전 내장 방안으로 교체하는 것이 좋습니다.

---

## HMC5883L은 실제 프로젝트에 적합한가?

결론부터 말하면: 부적합합니다.

실험 데모에는 문제없고, 드라이버 흐름 학습, 메이커 프로젝트 전시, 책상 장식 — 모두 가능합니다. 하지만 방향 인식이 실제로 필요한 제품을 만들고 있다면 이 조합에는 피할 수 없는 세 가지 문제가 있습니다:

첫째, 틸트 보상이 없습니다. 모듈이 수평이 아니면 방위각 오차가 빠르게 증가합니다 — 20° 기울어지면 10° 이상의 방향 편차가 발생할 수 있습니다. iPhone은 가속도계로 이 오차를 실시간 보상하지만, 이 모듈 자체로는 불가능하며 추가로 MPU6050을 연결하고 알고리즘을 수정해야 합니다.

둘째, 환경 자기장의 영향이 심합니다. 옆에 있는 컴퓨터 전원, USB 케이블, 금속 스탠드가 모두 읽기를 오염시키며, 이러한 간섭은 동적이어서 한 번 캘리브레이션하여 NVS에 저장해도 이동 중 실시간으로 변하는 자기장을 보상할 수 없습니다.

셋째, 시판 모듈의 품질이 들쭉날쭉입니다. 대부분이 QMC5883L 복제판으로, 원본 HMC5883L의 온디바이스 온도 드리프트 보정이 없어 온도가 변하면 읽기 값이 흔들립니다.

프로젝트에 신뢰할 수 있는 방향 인식이 필요하다면, 더 적합한 선택은 ICM-20948(9축 센서 + 하드웨어 DMP 퓨전 내장)이거나, GPS 모듈로 두 점 좌표를 계산하여 방향을 구하는 것 — 정확도와 안정성이 비교할 수 없는 수준입니다.

이 프로젝트의 올바른 포지셔닝은: 작지만五脏俱全(모든 필수 요소를 갖춘) 학습 샘플입니다. "자력계 드라이버 → 하드 아이언 캘리브레이션 → 필터링 → 디스플레이"의 전체 과정을 완전히 한 번 경험하게 해주며, 이 지식은 더 좋은 센서에 적용해도 완전히 통용됩니다.

---

## 확장 아이디어

기본 버전을 완성한 후, 다음 방향으로 계속 탐구해 볼 수 있습니다:

MPU6050 6축 센서를 하나 추가하여 가속도계 데이터로 틸트 보상을 구현합니다. 이것은 위에서 언급한 가장 큰 한계 중 하나입니다 — 현재 버전은 2D 자기장만 있어 기기가 조금만 기울어져도 눈에 띄는 오차가 발생합니다; 틸트 보상을 추가하면 세워서 들고도 정확도를 유지할 수 있으며, 이것이 iPhone 나침반이 안정적인 핵심 이유 중 하나입니다. 이 프로젝트를 "장난감에서 사용 가능한 수준으로 업그레이드"하는 데 가장 가치 있는 단계입니다.

SD 카드 모듈을 연결하고, LVGL이나 직접 그린 지도에 나침반 방향을 겹쳐서 오프라인 내비게이션 기기를 만듭니다. 원형 화면의 표시 면적은 제한적이지만, 현재 방향과 목표 방향의 화살표를 표시하는 데는 충분합니다.

방위각 데이터를 Wi-Fi를 통해 MQTT 브로커로 푸시하여, Home Assistant나 자체 대시보드에 연결하고 책상 방향 인식 센서로 만들어 문과 창문의 방향이나 안테나 정렬에 활용합니다.

---

## 참고 자료

- HMC5883L 원본 데이터시트 (Honeywell): https://cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf
- QMC5883L 데이터시트 (QST): https://datasheetspdf.com/pdf/1309218/QST/QMC5883L/1
- Arduino_GFX_Library GitHub: https://github.com/moononournation/Arduino_GFX
- Adafruit_HMC5883_U GitHub: https://github.com/adafruit/Adafruit_HMC5883_U
- ESP32-S3 제품 페이지 (Espressif): https://www.espressif.com/en/products/socs/esp32-s3
- 자기 편각 조회 도구 (NOAA): https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
