---
title: "ESP32-S3 구동 GC9A01 원형 디스플레이 심장선 그리기 | 극좌표 애니메이션 30분 완성"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-05-19
intro: "ESP32-S3로 1.28인치 GC9A01 원형 TFT 디스플레이를 구동하여 극좌표 심장선 애니메이션을 실행합니다. 완전한 배선, 이중 버퍼링 깜빡임 제로 코드 및 문제 해결 가이드를 포함합니다."
image: "https://img.lingflux.com/2026/05/a6a0b0037d4fd0650665e49e7364d65d.jpg"
---

# ESP32-S3 구동 GC9A01 1.28인치 원형 디스플레이 완전 튜토리얼 (SPI + Arduino IDE)

난이도: ⭐⭐☆☆☆ (초보자도 도전 가능)
예상 소요 시간: 30분
테스트 환경:
Arduino IDE 2.3.8
Arduino_GFX_Library 1.6.5
ESP32 Arduino Core 3.3.8

---

> **한 줄 요약**: ESP32-S3로 1.28인치 GC9A01 원형 디스플레이를 구동하여 극좌표 심장선 애니메이션을 실행합니다. 이중 버퍼링으로 깜빡임 제로, 배선 + 완전한 코드 + 문제 해결까지 30분이면 완성됩니다.

---

## 들어가며

520(중국 인터넷 은어로 "사랑해"를 의미)가 다가오고 있습니다. 여자친구에게 무슨 선물을 해야 할지 고민이 됩니다.

그러다 고등학교 때 극좌표를 배우던 기억이 떠올랐습니다. 교과서에 나오던 곡선 하나 — 바로 심장선(Cardioid)입니다. 극좌표 데모 애니메이션을 만들어서 하트 모양을 그려내면 내 마음을 전할 수 있지 않을까요. (이공계 남자의 머릿속에 이미 모든 장면이 재생되고 있습니다... 혼자 신나는 중...)

본 글의 목표: 여러분이 제로 베이스에서 시작하여, 30분 안에 ESP32-S3로 이 1.28인치 원형 디스플레이를 구동하고 극좌표 애니메이션을 실행시키는 것 — 그리고 각 단계에서 왜 그렇게 해야 하는지 이해하는 것입니다. (PS: 마음에 품은 그 사람에게 선물한 후, 키보드에 무릎 꿇는 일이 없기를 바랍니다! ~ :P )

(이 하트를 본 그녀의 속마음: 이게 뭔가요?! ~ 두리안 들고 온다)

---

## 실험 결과

원형 디스플레이 위에 회전하는 **심장선(Cardioid)**이 실시간으로 그려집니다. 극좌표계 그리드와 추적 점이 함께 표시되어, 마치 미니 오실로스코프가 수학 곡선을 그리는 것 같습니다.全程 깜빡임 없이, 프레임 속도는 16fps로 부드럽게 동작합니다.

![](https://img.lingflux.com/2026/05/8db744891e99902a8045e4e1242911d1.jpg)

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/fcqwhO5Vr7U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 부품 설명

### GC9A01 1.28인치 원형 TFT 디스플레이

GC9A01은 드라이버 칩이고, 원형 IPS 패널이 화면입니다. 두 가지는 하나의 작은 모듈에 납땜되어 있으며, SPI 프로토콜로 영상 데이터를 "먹여주기만" 하면 됩니다. 각 픽셀을 켜는 것은 칩이 알아서 처리합니다.

| 파라미터 | 값 |
| --- | --- |
| 해상도 | 240 × 240 픽셀 |
| 색상 심도 | 16-bit RGB565, 65536색 |
| 인터페이스 프로토콜 | 4선 SPI, 최대 80MHz |
| 작동 전압 | 3.3V (ESP32-S3에 직접 연결, 레벨 변환 불필요) |
| 패널 타입 | IPS, 시야각 거의 180° |
| 모듈 크기 | 약 36mm 직경 |

선택 이유: 저렴하고(약 5~15위안), 공급처가 많으며, 원형 디자인은 계기판과 시계류 프로젝트에 자연스럽게 어울립니다. 또한 240×240 해상도는 ESP32-S3의 메모리에 딱 알맞습니다.

---

## BOM 표

| 부품 | 수량 | 비고 |
| --- | --- | --- |
| ESP32-S3 개발 보드 | 1 | SPI 핀이 있는 어떤 버전이든 가능 |
| GC9A01 1.28" 원형 디스플레이 모듈 | 1 | 모듈에 BL 핀이 있는지 확인 |
| 점퍼 와이어 | 약간 | 암-암 또는 암-수, 개발 보드 핀 형태에 따라 선택 |

---

## 부품 핀 설명

| GC9A01 모듈 핀 | 기능 |
| --- | --- |
| VCC | 전원 양극 (3.3V) |
| GND | 전원 음극 |
| SCL / CLK | SPI 클럭 신호 |
| SDA / MOSI | SPI 데이터 입력 (마스터→슬레이브) |
| CS | 칩 셀렉트, LOW일 때 디스플레이가 SPI에 응답 |
| DC | 데이터/명령 선택: HIGH=데이터, LOW=명령 |
| RST | 하드웨어 리셋, LOW로 트리거 |
| BL | 백라이트 제어, HIGH에 연결해야 화면이 켜짐 |

---

## 배선 방법

> 아래 표를 보고 한 줄씩 연결하시고, 연결할 때마다 체크 표시를 하세요. 이렇게 하면 문제 해결 시간의 80%를 줄일 수 있습니다.

| GC9A01 디스플레이 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (코드 제어) 또는 3.3V에 직접 연결 |

> **⚠️ 주의**: BL(백라이트) 핀을 놓치기 쉽습니다. 연결을 잊으면 전원을 켜도 화면이 까맣게 나옵니다. 코드 문제도 아니고 화면이 고장 난 것도 아닙니다 — 먼저 이 핀을 확인하세요. 일부 모듈은 BL 핀이 외부로 나와 있지 않은데, 이는 모듈 내부에서 이미 3.3V에 연결되어 있다는 뜻입니다. 모듈에 BL 핀이 없다면 신경 쓰지 않아도 됩니다.

---

## 설치해야 할 라이브러리

Arduino IDE → 툴 → 라이브러리 관리에서 검색하여 설치:

| 라이브러리 이름 | 작성자 | 테스트 통과 버전 |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | 1.6.5 |

> TFT_eSPI는 설치하지 마세요: ESP32 Core 3.x에서 TFT_eSPI의 매크로 정의와 DMA 초기화가 새 버전 ESP32와 충돌하여 컴파일 에러나 부팅 시 크래시가 발생합니다. Arduino_GFX_Library는 처음부터 최신 C++와 메모리 캔버스를 지원하여, 현재 디스플레이 프로젝트에서 가장 편리한 선택입니다. (작성일 기준: 2026-05-18)

---

## 완전한 코드

```cpp
/**
 * ESP32-S3 + GC9A01 1.28" 원형 디스플레이 — 극좌표 애니메이션 데모
 * 이중 버퍼링 깜빡임 제로, 16fps 고정
 * 배선: SCL=GPIO12, SDA=GPIO11, CS=GPIO9, DC=GPIO10, RST=GPIO18, BL=GPIO7
 */

#include <Arduino_GFX_Library.h>

// ---------------------------------------------------
// 1단계: 색상 매크로 수동 추가
// 최신 Arduino_GFX에서는 BLACK / WHITE 등 전역 내보내기가 제거되었습니다.
// 이 부분을 추가하지 않으면 컴파일 시 "BLACK was not declared in this scope" 에러 발생
// ---------------------------------------------------
#ifndef BLACK
#define BLACK       0x0000
#endif
#ifndef WHITE
#define WHITE       0xFFFF
#endif
#ifndef RED
#define RED         0xF800
#endif
#ifndef GREEN
#define GREEN       0x07E0
#endif
#ifndef BLUE
#define BLUE        0x001F
#endif
#ifndef YELLOW
#define YELLOW      0xFFE0
#endif
#ifndef CYAN
#define CYAN        0x07FF
#endif
#ifndef MAGENTA
#define MAGENTA     0xF81F
#endif
#ifndef GRAY
#define GRAY        0x8410
#endif
#ifndef DARKGRAY
#define DARKGRAY    0x2104
#endif

// ---------------------------------------------------
// 2단계: 색상 팔레트 정의 (진한 파란 배경 + 주황빨간 메인 색상)
// ---------------------------------------------------
#define COLOR_BG        0x1123   // 짙은 파란검정 배경
#define COLOR_GRID      0x19E5   // 그리드 파란회색
#define COLOR_PRIMARY   0xE73C   // 곡선 주황빨강
#define COLOR_ACCENT    0xFDE0   // 동금 노란색
#define COLOR_TEXT      0xF7BE   // 텍스트 연한 회색

// ---------------------------------------------------
// 3단계: 물리 핀 정의
// ---------------------------------------------------
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---------------------------------------------------
// 4단계: SPI 버스 및 디스플레이 드라이버 인스턴스화
// ---------------------------------------------------
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA, GFX_NOT_DEFINED /* MISO 불필요 */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST,
    0,    /* 회전 각도 */
    true  /* IPS 디스플레이 */
);

// ---------------------------------------------------
// 5단계: 이중 버퍼링 캔버스 할당 (240×240×2 Bytes = 115.2KB SRAM)
// 모든 그리기는 먼저 메모리에 기록되고, 완료 후 화면에 한 번에 전송되어 깜빡임 완전 제거
// ---------------------------------------------------
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

// ---------------------------------------------------
// 애니메이션 변수
// ---------------------------------------------------
float angle = 0.0f;
const float  a_scale    = 50.0f;  // 심장선 스케일 계수 (단위: 픽셀)
const int16_t cx        = 120;    // 중심 X
const int16_t cy        = 120;    // 중심 Y

unsigned long lastFrameTime = 0;
const int frameDelay = 1000 / 16; // 16fps 고정

// 기능 토글 (false로 변경하면 개별 레이어 비활성화 가능)
const bool showGrid     = true;
const bool showCurve    = true;
const bool showRadius   = true;
const bool showTelemetry= true;

void setup() {
    Serial.begin(115200);

    // 디스플레이 드라이버 초기화
    gfx->begin();

    // 백라이트 켜기 (이 단계를 놓치면 = 화면 까맣게)
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);

    // 이중 버퍼링 캔버스 초기화
    if (!canvas->begin()) {
        Serial.println("캔버스 메모리 할당 실패! 직접 화면에 씁니다 (깜빡임 발생).");
    } else {
        Serial.println("이중 버퍼링 시작 성공, 깜빡임 없는 렌더링 준비 완료.");
    }
}

void loop() {
    // 프레임 속도 제한
    unsigned long now = millis();
    if (now - lastFrameTime < frameDelay) return;
    lastFrameTime = now;

    // 프레임 지우기
    canvas->fillScreen(COLOR_BG);

    // --- 레이어 1: 극좌표 그리드 ---
    if (showGrid) {
        canvas->drawCircle(cx, cy,  30, COLOR_GRID);
        canvas->drawCircle(cx, cy,  60, COLOR_GRID);
        canvas->drawCircle(cx, cy,  90, COLOR_GRID);
        canvas->drawCircle(cx, cy, 110, COLOR_GRID);
        canvas->drawFastHLine(10, cy, 220, COLOR_GRID);
        canvas->drawFastVLine(cx, 10, 220, COLOR_GRID);
    }

    // --- 레이어 2: 완전한 심장선 궤적 r = a*(1 - cos θ) ---
    if (showCurve) {
        int16_t lx = 0, ly = 0;
        for (int16_t deg = 0; deg <= 360; deg += 3) {
            float rad = deg * DEG_TO_RAD;
            float r   = a_scale * (1.0f - cos(rad));
            int16_t x = cx + (int16_t)(r * cos(rad));
            int16_t y = cy - (int16_t)(r * sin(rad)); // 화면 Y축은 아래 방향이므로 반전
            if (deg > 0) canvas->drawLine(lx, ly, x, y, COLOR_PRIMARY);
            lx = x; ly = y;
        }
    }

    // --- 레이어 3: 현재 추적 점 및 동경 ---
    float rad_a  = angle * DEG_TO_RAD;
    float active_r = a_scale * (1.0f - cos(rad_a));
    int16_t px = cx + (int16_t)(active_r * cos(rad_a));
    int16_t py = cy - (int16_t)(active_r * sin(rad_a));

    if (showRadius) canvas->drawLine(cx, cy, px, py, COLOR_ACCENT);
    canvas->fillCircle(px, py, 5, COLOR_TEXT);

    // --- 레이어 4: 수치 표시 ---
    if (showTelemetry) {
        canvas->setTextColor(COLOR_TEXT);
        canvas->setTextSize(1);
        canvas->setCursor(50, 25);
        canvas->print("Polar Coordinates");
        canvas->setCursor(28, 185);
        canvas->print("r = a * (1 - cos(theta))");
        canvas->setCursor(40, 200);
        canvas->print("th:"); canvas->print((int)angle);
        canvas->print("  r:"); canvas->print((int)active_r);
        canvas->print("px");
    }

    // 각도 증가 (매 프레임 +6°, 한 바퀴 약 1초)
    angle += 6.0f;
    if (angle >= 360.0f) angle -= 360.0f;

    // 메모리 캔버스를 물리적 화면에 한 번에 전송
    canvas->flush();
}
```

### 코드 설명

**이중 버퍼링 메커니즘**: 모든 그리기 작업은 `canvas`(메모리)에서 이루어지며, 마지막 줄의 `canvas->flush()`에서야 비로소 완전한 프레임이 화면으로 전송됩니다. 칠판을 먼저 지우고 글씨를 쓰는 것과 달리, 이 방식은 종이에 미리 써서 통째로 붙이는 것과 같습니다. 화면은 절대 "그리다 만" 상태를 볼 수 없으며, 깜빡임이 제로가 됩니다.

**심장선 방정식** `r = a * (1 - cos θ)`: 이것은 극좌표 방정식으로, `r`은 중심에서부터의 거리, `θ`는 각도입니다. 방정식에서 각 θ 값에 대해 계산된 (r, θ)를 화면 XY 좌표로 변환하고, 선으로 연결하면 그 하트 모양 곡선이 완성됩니다.

**프레임 속도 잠금**: `frameDelay = 1000 / 16`은 프레임당 최소 간격을 약 62ms로 제어합니다. 애니메이션 속도를 높이려면 `+= 6.0f` 증분값을 키우면 되고, 더 부드럽게 하려면 targetFPS를 30까지 올릴 수 있지만 CPU 부하가 증가합니다.

**플래시 파티션**: Arduino IDE → 툴 → Partition Scheme에서 **Huge APP (3MB No OTA)**를 선택하세요. 115KB의 Canvas에는 충분한 SRAM이 필요하며, 기본 파티션에서는 힙 공간 부족으로 실패할 수 있습니다.

---

## 자주 발생하는 문제 해결

당황하지 마세요. 90%의 문제은 다음 몇 가지에서 비롯됩니다:

**전원 켜도 화면이 까만색, 시리얼 출력에도 에러 없음**
먼저 BL 핀을 확인하세요 — 백라이트가 HIGH로 설정되지 않은 것이 가장 흔한 원인입니다. GPIO7에서 `digitalWrite(TFT_BL, HIGH)`가 실행되었는지 확인하거나, 코드 문제를 배제하기 위해 BL 점퍼를 3.3V에 직접 연결해 보세요.

**화면은 켜졌는데 전체가 흰색/빨간색/깨짐 현상**
SPI 배선 순서가 잘못되었습니다. CS와 DC가 가장 혼동하기 쉽습니다 (둘 다 제어 라인이라 비슷해 보임). 코드의 매크로 정의(CS=GPIO9, DC=GPIO10)와 다시 대조하세요. 배선 표가 아니라 코드를 기준으로 확인하세요.

**컴파일 에러: `BLACK was not declared in this scope`**
사용 중인 Arduino_GFX 버전이 1.3 이상이며, 최신 버전에서는 색상 매크로의 전역 내보내기가 제거되었습니다. 코드 상단의 `#ifndef BLACK` 부분은 반드시 유지해야 하며, 삭제하면 안 됩니다.

**Canvas 메모리 할당 실패, 시리얼 출력에 직접 화면에 쓴다는 메시지 표시**
사용 가능한 SRAM이 115KB보다 부족하다는 뜻입니다. 확인 사항: ①파티션을 Huge APP으로 선택했는지; ②다른 곳에서 대규모 배열이 메모리를 차지하고 있지 않은지; ③드물지만 개발 보드의 PSRAM이 활성화되지 않았을 수 있음 (보드 설정에서 PSRAM 켜기).

**애니메이션이 끊김, 16fps처럼 보이지 않음**
`loop()` 안에 `delay()`가 있나요? 있다면 제거하세요. 프레임 속도 제한은 이미 `millis()`로 구현되어 있으므로, 두 가지가 겹치면 프레임 간격이 두 배가 됩니다.

---

## FAQ

**Q: CS, DC 핀을 다른 GPIO로 변경해도 되나요?**
A: 가능합니다. 코드 상단의 `#define TFT_CS`와 `#define TFT_DC`를 수정하면 되며, 사용하지 않는 GPIO라면 어떤 핀이든 가능합니다. SCL과 SDA는 하드웨어 SPI 핀(ESP32-S3 기본 SPI2: SCLK=12, MOSI=11)을 사용하는 것을 권장하여 최고 속도를 얻을 수 있습니다. 다른 핀으로 변경하면 소프트웨어 SPI로 전환되어 속도가 눈에 띄게 저하됩니다.

**Q: 디스플레이는 어떤 주사율을 지원하나요?**
A: GC9A01의 SPI 인터페이스 이론 최대 클럭은 80MHz이며, 전체 화면 240×240 기준 약 40fps 상한입니다. 본 코드에서 16fps로 고정한 것은 중저가형 ESP32-S3 모듈에서 CPU 여유를 확보하기 위함입니다. 보드 메인 클럭이 240MHz라면 `targetFPS`를 30~40까지 올려도 문제없습니다.

**Q: 디스플레이 두 개를 동시에 구동할 수 있나요?**
A: 가능합니다. 두 디스플레이가 SCL/SDA를 공유하고, 각각 독립적인 CS 핀을 할당받습니다. `Arduino_GC9A01` 객체를 두 개 각각 인스턴스화하고, CS를 전환하여 다른 디스플레이를 활성화하면 됩니다. 메모리 주의: 두 개의 Canvas에는 총 230KB SRAM이 필요하므로 PSRAM을 반드시 켜야 합니다.

**Q: 전원은 3.3V와 5V 중 어떤 것을 사용하나요?**
A: GC9A01 모듈 작동 전압은 3.3V이며, ESP32-S3의 3.3V 핀에 직접 연결하세요. 5V에 절대 연결하지 마세요. 드라이버 칩이 손상됩니다.

**Q: 중국어 문자를 표시하려면 어떻게 하나요?**
A: Arduino_GFX_Library는 기본적으로 ASCII 폰트만 내장되어 있습니다. 중국어를 표시하려면 별도의 글꼴 파일(예: U8g2 글꼴)이나 LVGL 프레임워크를 사용해야 합니다. 글꼴은 Flash 사용량을 크게 증가시키므로, LVGL + SPIFFS 방식을 권장합니다. 시간이 나면 별도의 글로 다루겠습니다.

**Q: GC9A01 디스플레이에는 오디오 출력 기능이 없고 디스플레이만 가능한데, I2S 오디오 프로젝트와는 어떤 관계가 있나요?**
A: 관계없습니다. GC9A01은 순수하게 디스플레이만 담당하며, SPI 인터페이스는 영상 데이터만 전송합니다. 오디오도 함께 재생하려면 별도의 I2S DAC 모듈(예: MAX98357A)이 필요하며, 두 가지는 완전히 독립적으로 동작하여 핀이 서로 간섭하지 않습니다.

---

## 더 활용해 보기

- **아날로그 시계 다이얼**로 변경: 눈금과 시침/분침을 그리고, DS3231 RTC 모듈로 실시간 시간 읽기
- **장미선(Rose curve) 모드** 추가: `showTangent`를 false로 변경하고 곡선을 `r = a * sin(k * θ)`로 전환. k값을 바꾸면 꽃잎 수가 변합니다
- **버튼으로 애니메이션 테마 전환** 연결: 세 개의 버튼으로 심장선 / 장미선 / 리사주 도형 순환
- **ESP32 Wi-Fi**와 결합: 날씨 API를 가져와서 온도와 습도를 원형 디스플레이 계기판에 표시
- 원형 디스플레이 2개 구매:

---

## 참고 자료

- [GC9A01 드라이버 칩 데이터시트 (Galaxycore 공식)](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub 페이지 (moononournation)](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 제품 페이지](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
- [ESP32 Arduino Core 3.x 릴리즈 노트](https://github.com/espressif/arduino-esp32/releases)
