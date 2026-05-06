---
title: "ESP32-S3 + 1.3\" SH1106 OLED 사이버 문어 키우기 | I2C + U8g2 애니메이션 튜토리얼"
boardId: esp32s3
moduleId: display/oled13-sh1106
category: esp32
date: 2026-05-06
intro: "ESP32-S3로 1.3인치 SH1106 OLED를 구동하고, U8g2 라이브러리로 문어 수영 애니메이션 + 버블 파티클 이펙트를 구현합니다. I2C 배선 4가닥, Lissajous 곡선 운동 알고리즘, 트러블슈팅 가이드 포함."
image: "https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg"
---

# ESP32-S3 구동 1.3" SH1106 OLED 완전 튜토리얼 — 사이버 문어 애니메이션 (I2C + U8g2)

난이도: ⭐⭐☆☆☆ (초보자도 가능)
예상 소요 시간: 30분
테스트 환경: Arduino IDE 2.3.8 · U8g2 v2.35.30 · ESP32 Board Package 3.3.8

---

> **TL;DR (빠른 시작):**
>
> 1. 배선: SDA → GPIO 8, SCL → GPIO 9, VCC → 3.3V, GND → GND
> 2. 라이브러리 설치: U8g2 (작성자 oliver)
> 3. 생성자에서 I2C 주소를 `0x3C * 2`로 변경, Wire 초기화를 `Wire.begin(8, 9)`로 변경
> 4. 코드 업로드, 문어 수영 시작
> 5. 코드는 Lissajous 곡선 운동 알고리즘을 사용하며, 알고리즘에 관심 있다면 자세히 확인해 보세요

---

## 들어가며

온라인 쇼핑몰에서 OLED 소형 디스플레이를 본 적 있으신가요? 엄지손가락 손톱만 한 크기인데, 판매자 영상에서는 온갖 부드러운 애니메이션이 재생되어 정말 멋있고 재미있어 보이죠.

저도 그 영상을 본 다음 날 오후에 바로 1.3인치 SH1106 OLED를 주문했습니다. 그리고 바로 고전적인 문제에 직면했습니다: 화면이 도착하고, 코드 업로드도 성공했고, 불도 들어오는데 — 아무것도 표시되지 않는 겁니다.

오후 내내 삽질한 끝에, 문제가 주로 두 곳에 집중되어 있다는 걸 발견했습니다: **I2C 핀이 기본 21/22가 아니라는 점**, 그리고 **SH1106 드라이버 칩이 SSD1306과 다르다**는 점, 둘은 겉보기엔 비슷하지만 혼용할 수 없습니다.

이 두 가지만 이해하면 그 다음은 순조롭습니다. 본 튜토리얼의 목표: 30분 안에 여러분의 OLED 화면에서 문어 한 마리가 헤엄치고, 물방울도 뿜어내게 만드는 것입니다.



---

## 실험 결과



![ESP32-canva-017-1inch3-oled (1) (1)](https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg)



32×32 픽셀의 문어가 화면에서 수영합니다. 운동 궤적은 Lissajous 곡선(우아한 8자 모양의 파동)이며, 동시에 입 주위에서 크기가 다양한 물방울이 천천히 떠올라 사라집니다.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/zw06nh7wXp4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 부품 설명

### 1.3" OLED SH1106

SH1106은 모노크롬 OLED 드라이버 칩으로, 코드의 0과 1을 화면에 켜지는 픽셀로 변환해 줍니다. 일종의 도트 매트리크 번역기라고 이해하면 됩니다 — "30번째 행 50번째 열을 켜라"고 알려주면, 해당 유기발광다이오드를 제어해 빛나게 만듭니다.

| 파라미터 | 값 |
|------|------|
| 해상도 | 128 × 64 픽셀 |
| 드라이버 칩 | SH1106 (≠ SSD1306) |
| 통신 인터페이스 | I2C (기본 주소 0x3C) |
| 작동 전압 | 3.3V / 5V 호환 |
| 화면 크기 | 1.3인치 |

> 선택 이유: 저렴하고 충분한 성능, U8g2 라이브러리와 조합하면 도트 매트릭스 애니메이션을 쉽게 구현할 수 있습니다. 0.96인치 SSD1306과 혼동하지 마세요. 드라이버 칩이 달라서 코드를 그대로 사용하면 화면이 하얗게만 나옵니다.

---

## BOM (부품 목록)

| 부품 | 수량 |
|------|------|
| ESP32-S3 개발 보드 | × 1 |
| 1.3" OLED SH1106 (I2C) | × 1 |
| 점퍼 와이어 (암-수) | × 4 |

---

## 배선 방법

| 1.3" OLED 핀 | ESP32-S3 연결 |
|-----------|---------------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

> 배선 완료 후 핀 하나하나 다시 확인하는 것을 추천합니다. 트러블슈팅 시간의 80%를 줄일 수 있습니다. SDA/SCL을 반대로 연결하는 것이 가장 흔한 백화면 원인으로, 전원은 정상적으로 들어오는데 아무것도 표시되지 않는 증상이 나타납니다.

---

## 라이브러리 설치

Arduino IDE의 라이브러리 매니저에서 **U8g2**를 검색하여 oliver가 배포한 버전을 설치합니다.

테스트 통과 버전: **U8g2 v2.35.30**

U8g2는 [olikraus/u8g2](https://github.com/olikraus/u8g2)에서 관리하는 오픈소스 디스플레이 라이브러리로, 거의 모든 일반적인 모노크롬 OLED/LCD 드라이버 칩을 지원하며, SH1106도 당연히 포함되어 있습니다.

---

## 전체 코드

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// 1단계: U8g2 객체 선언
// 참고: 여기서는 SH1106, 128×64, 전체 버퍼 모드, 하드웨어 I2C 선택
// U8G2_R2 = 화면 180도 회전 (하드웨어 납땡 방향에 따라 조정, 회전이 필요 없으면 U8G2_R0로 변경)
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R2, /* reset=*/ U8X8_PIN_NONE);

// ==================== 문어 애니메이션 프레임 (Flash에 저장, RAM 절약) ====================
// 4프레임 프레임별 애니메이션, 각 프레임 32×32 픽셀, XBM 도트 매트릭스 형식
const unsigned char animation_frame_0[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00,
  0x00, 0xFE, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00,
  0xE0, 0xFF, 0xFF, 0x01, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01,
  0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0x00, 0xEF, 0x3D, 0x00,
  0x00, 0xEF, 0x3D, 0x00, 0x00, 0xC7, 0x38, 0x00, 0x00, 0xC7, 0x38, 0x00,
  0x80, 0xC3, 0x70, 0x00, 0x80, 0xC3, 0x70, 0x00, 0x80, 0xC1, 0x60, 0x00,
  0x80, 0xC1, 0x60, 0x00, 0xC0, 0xC0, 0xC0, 0x00, 0xC0, 0xC0, 0xC0, 0x00,
  0x40, 0x80, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_1[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0xFC, 0x0F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01, 0xE0, 0xFF, 0xFF, 0x01,
  0xE0, 0xE7, 0xE7, 0x01, 0xE0, 0xE1, 0xE1, 0x01, 0xE0, 0xE7, 0xE7, 0x01,
  0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0x00, 0xFF, 0x3F, 0x00, 0x00, 0xFE, 0x1F, 0x00, 0x00, 0xDE, 0x1E, 0x00,
  0x00, 0xCF, 0x3C, 0x00, 0x80, 0xC7, 0x78, 0x00, 0xC0, 0xC3, 0xF0, 0x00,
  0xE0, 0xC1, 0xE0, 0x01, 0xE0, 0xC0, 0xC0, 0x01, 0xC0, 0xC0, 0xC0, 0x00,
  0x80, 0xC0, 0x40, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_2[] PROGMEM = {
  0x00, 0xF0, 0x00, 0x00, 0x00, 0xF8, 0x01, 0x00, 0x00, 0xFC, 0x03, 0x00,
  0x00, 0xFE, 0x07, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x80, 0xFF, 0x1F, 0x00, 0x80, 0xF9, 0x19, 0x00,
  0x80, 0xF0, 0x10, 0x00, 0x80, 0xF9, 0x19, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x00, 0xFE, 0x07, 0x00,
  0x00, 0xFC, 0x03, 0x00, 0x00, 0x6C, 0x03, 0x00, 0x00, 0x66, 0x06, 0x00,
  0x00, 0x63, 0x0C, 0x00, 0x80, 0x61, 0x18, 0x00, 0xC0, 0x60, 0x30, 0x00,
  0x60, 0x60, 0x60, 0x00, 0x30, 0x60, 0xC0, 0x00, 0x18, 0x60, 0x80, 0x01,
  0x0C, 0x60, 0x00, 0x03, 0x06, 0x60, 0x00, 0x06, 0x02, 0x60, 0x00, 0x04,
  0x00, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_3[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00, 0x00, 0xFE, 0x3F, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03, 0xF0, 0xF3, 0xF3, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x00, 0xF6, 0x06, 0x00,
  0x00, 0xF6, 0x06, 0x00, 0x00, 0x63, 0x0C, 0x00, 0x00, 0x63, 0x0C, 0x00,
  0x80, 0x61, 0x18, 0x00, 0x80, 0x61, 0x18, 0x00, 0x80, 0x60, 0x10, 0x00,
  0x80, 0x60, 0x10, 0x00, 0x40, 0x60, 0x20, 0x00, 0x40, 0x60, 0x20, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

// 4프레임 포인터를 배열에 넣어 순환 접근 용이
const unsigned char* animation_frames[] = {
  animation_frame_0, animation_frame_1, animation_frame_2, animation_frame_3
};

const int TOTAL_FRAMES = 4;
const unsigned long FRAME_DELAY = 120; // 프레임 간격 (밀리초), 줄이면 빨라지고 늘리면 느려짐
int currentFrame = 0;
unsigned long lastFrameTime = 0;
const int SPRITE_SIZE = 32; // 문어 도트 매트릭스 크기 32×32

// ==================== 버블 파티클 시스템 ====================
#define MAX_BUBBLES 10 // 화면에 동시에 존재할 수 있는 최대 버블 수

struct Bubble {
  float x;       // 현재 X 좌표
  float y;       // 현재 Y 좌표
  float radius;  // 현재 반지름 (부동소수점, 프레임별 축소 가능)
  float speedY;  // 프레임당 상승 픽셀 수
  float wobble;  // 좌우 흔들림 랜덤 위상 오프셋
  bool active;   // 이 버블이 "살아있는지" 여부
};

Bubble bubbles[MAX_BUBBLES]; // 오브젝트 풀, 동적 메모리 할당 방지

void setup() {
  Serial.begin(115200);

  // 2단계: 랜덤 시드로 부팅할 때마다 버블이 다르게 생성되도록 설정
  randomSeed(analogRead(0));

  // 3단계: I2C 초기화, SDA=8, SCL=9 지정
  Wire.begin(8, 9);
  u8g2.setI2CAddress(0x3C * 2); // U8g2는 주소를 1비트 왼쪽으로 시프트해야 함, 0x3C << 1 = 0x78
  u8g2.begin();

  // 4단계: 모든 버블을 비활성화로 표시
  for (int i = 0; i < MAX_BUBBLES; i++) {
    bubbles[i].active = false;
  }

  Serial.println("문어 아쿠아리움 시작 성공!");
}

void loop() {
  unsigned long currentTime = millis();

  // delay() 대신 논블로킹 타이밍 사용, 애니메이션 부드러움 보장
  if (currentTime - lastFrameTime >= FRAME_DELAY) {
    lastFrameTime = currentTime;

    // ======== 1단계: Lissajous 곡선으로 문어 위치 계산 ========
    // 서로 다른 주파수의 사인파를 결합하여 우아한 8자형 수영 궤적 생성
    float t = currentTime * 0.0008;

    float waveX = sin(t * 0.8) * 0.6 + sin(t * 0.3) * 0.4;
    int posX = 48 + (int)(waveX * 48); // 가로 범위 약 0~96

    float waveY = cos(t * 0.7) * 0.6 + sin(t * 0.4) * 0.4;
    int posY = 16 + (int)(waveY * 16); // 세로 범위 약 0~32

    // ======== 2단계: 25% 확률로 문어 입 근처에 새 버블 생성 ========
    if (random(100) < 25) {
      for (int i = 0; i < MAX_BUBBLES; i++) {
        if (!bubbles[i].active) {
          bubbles[i].active = true;
          bubbles[i].x      = posX + 16 + random(-8, 8);   // 입 부근 랜덤 오프셋
          bubbles[i].y      = posY + 24 + random(0, 5);
          bubbles[i].radius = random(15, 35) / 10.0;       // 1.5~3.5 픽셀
          bubbles[i].speedY = random(10, 25) / 10.0;       // 상승 속도 랜덤
          bubbles[i].wobble = random(0, 100) / 10.0;       // 흔들림 위상 랜덤
          break; // 한 프레임에 하나만 생성
        }
      }
    }

    // ======== 3단계: 버퍼 지우고, 그리기 시작 ========
    u8g2.clearBuffer();

    // 문어 본체 그리기 (XBM 도트 매트릭스 이미지)
    u8g2.drawXBMP(posX, posY, SPRITE_SIZE, SPRITE_SIZE, animation_frames[currentFrame]);

    // ======== 4단계: 모든 살아있는 버블 업데이트 및 그리기 ========
    for (int i = 0; i < MAX_BUBBLES; i++) {
      if (bubbles[i].active) {
        bubbles[i].y -= bubbles[i].speedY; // 위로 떠오름

        // 시간축에 맞춰 좌우 흔들림, 실제 물속 기포처럼
        float currentX = bubbles[i].x + sin(t * 3.0 + bubbles[i].wobble) * 4.0;

        // 버블이 프레임별로 작아짐, 멀리 떠오르며 희미해지는 효과
        bubbles[i].radius -= 0.06;

        // 반지름이 너무 작거나 화면 상단을 벗어나면 → 버블 회수
        if (bubbles[i].radius <= 0.5 || bubbles[i].y < -5) {
          bubbles[i].active = false;
        } else {
          // 빈 원 그리기 — 채워진 원보다 실제 기포에 더 가까움
          u8g2.drawCircle((int)currentX, (int)bubbles[i].y, (int)bubbles[i].radius);
        }
      }
    }

    // 5단계: 버퍼 내용을 한 번에 화면으로 전송
    u8g2.sendBuffer();

    // 다음 프레임으로 전환
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }
}
```

### 코드 설명

**Lissajous 곡선 운동**: 서로 다른 주파수의 사인/코사인을 결합하여 문어가 우아한 8자형 경로를 그리며 이동하게 합니다. 단순한 좌우 이동보다 훨씬 보기 좋으며, 몇 줄의 삼각함수만으로 구현할 수 있습니다.

**버블 오브젝트 풀**: 10개의 `Bubble` 구조체를 미리 할당하고, `active` 플래그로 "생사"를 관리합니다. `new/delete`로 인한 메모리 파편화를 방지합니다 — MCU에서는 흔히 사용하는 안심할 수 있는 패턴입니다.

**`PROGMEM` 키워드**: 도트 매트릭스 배열에 이 키워드를 추가하면 Flash에 저장되어 귀중한 SRAM을 점약합니다. 4프레임 × 128바이트 = 512바이트로, RAM에 넣기엔 아깝습니다.

**논블로킹 타이밍**: `delay()` 대신 `millis()`를 사용합니다. 이렇게 하면 버블의 물리 업데이트와 문어 애니메이션 프레임 전환이 같은 루프 안에서 자연스럽게 조율되며, 버벅거림이 발생하지 않습니다.

---

## 일반적인 문제 해결

당황하지 마세요. 90%의 문제는 다음 몇 가지에서 비롯됩니다:

**화면이 전혀 켜지지 않음 / 아무 출력 없음**
먼저 전원을 확인하세요 — VCC가 3.3V에 연결되어 있는지 (많은 모듈이 5V를 지원하지만, 먼저 확인). 그런 다음 멀티미터로 SDA/SCL 두 선이 반대로 연결되지 않았는지 확인하세요. 이것이 가장 빈도가 높은 실수입니다.

**화면은 켜지지만 전체가 흰색 또는 검은색, 이미지가 보이지 않음**
열에 아홉은 I2C 주소 문제입니다. 코드에서는 `0x3C * 2`를 사용하며, 이것은 U8g2의 요구사항입니다. 화면 뒷면의 I2C 주소 점퍼가 `0x3D`라면, `0x3C`를 `0x3D`로 변경해 보세요. I2C Scanner를 먼저 실행해 주소를 확인하는 것도 좋습니다.

**이미지는 표시되지만 상하가 뒤집힘**
생성자의 `U8G2_R2`를 `U8G2_R0`로 변경하면 됩니다. 둘의 차이는 180도 회전뿐입니다.

**문어 위치가 화면 경계를 벗어남**
`posX`의 최대값은 약 96이며, 여기에 32픽셀 너비를 더하면 정확히 128 경계에 도달합니다. 운동 진폭 파라미터를 변경한 경우, 좌표가 `128 - SPRITE_SIZE`를 초과하지 않도록 주의하세요.

**버블이 버벅거림**
`FRAME_DELAY`를 120에서 80으로 줄여 보세요. 여전히 버벅거리면 I2C 버스 속도를 확인하고, `Wire.begin(8, 9)` 다음에 `Wire.setClock(400000)`을 추가하여 고속 모드(400 kHz)로 전환해 보세요.

---

## FAQ

**Q: 다른 GPIO를 I2C로 사용할 수 있나요?**
A: 가능합니다. ESP32-S3의 I2C는 임의의 GPIO로 매핑할 수 있습니다. `Wire.begin(8, 9)`의 숫자를 원하는 핀 번호로 변경하면 됩니다. SDA가 앞, SCL이 뒤입니다.

**Q: 제 화면이 0.96인치 SSD1306인데, 코드를 그대로 사용할 수 있나요?**
A: 드라이버 칩이 달라서 그대로 사용할 수 없습니다. 생성자를 `U8G2_SSD1306_128X64_NONAME_F_HW_I2C`로 변경하면, 나머지 코드 부분은 그대로 유지할 수 있습니다.

**Q: I2C 속도는 얼마나 빠르게 지원되나요?**
A: SH1106은 표준 모드 100 kHz, 고속 모드 400 kHz를 지원합니다. 이 코드에서는 명시적으로 설정하지 않아 기본 100 kHz로 동작하며, 새로고침이 느리다고 느껴지면 `Wire.setClock(400000)`을 추가하세요.

**Q: PROGMEM은 무엇인가요, 삭제해도 되나요?**
A: `PROGMEM`은 배열을 SRAM이 아닌 Flash에 저장합니다. 4프레임 도트 매트릭스 데이터는 약 512바이트이며, 삭제해도 기능에는 영향이 없지만 512바이트의 SRAM을 차지합니다 — ESP32-S3은 SRAM이 비교적 여유로워서 삭제해도 큰 문제는 없지만, 유지하는 것이 좋은 습관입니다.

**Q: 문어가 더 빠르게 또는 더 느리게 수영하게 하려면 어떻게 하나요?**
A: `FRAME_DELAY` 값을 변경하세요 — 숫자가 작을수록 빨라지고, 클수록 느려집니다. 버블의 상승 속도는 `speedY` 범위 `random(10, 25) / 10.0`로 제어되며, 이것도 조정할 수 있습니다.

**Q: 화면이 RAM을 얼마나 사용하나요?**
A: U8g2 전체 버퍼 모드(`_F_`)는 RAM에 전체 프레임 버퍼를 유지합니다. 128×64 / 8 = 1024바이트, 약 1KB입니다. ESP32-S3은 512KB SRAM을 가지고 있어 충분히 여유 있습니다.

---

## 더 활용해 보기

- **다른 캐릭터로 교체**: [image2cpp](https://javl.github.io/image2cpp/)를 사용하여 임의의 흑백 이미지를 XBM 도트 매트릭스로 변환하고, 문어를 교체하세요
- **센서 인터랙션 추가**: 사운드 센서를 연결하여 음량에 따라 문어의 수영 속도가 변하도록 만들어 보세요
- **멀티 디스플레이 연동**: 두 개의 OLED를 같은 I2C 버스에 연결하고 (주소를 각각 0x3C와 0x3D로 설정), 좌우에 문어를 한 마리씩 배치해 보세요
- **TFT 컬러 디스플레이 버전**: ST7789 컬러 TFT로 교체하고, 그레이스케일 그라데이션으로 더 섬세한 버블 이펙트 구현

---

## 참고 자료

- [Espressif ESP32-S3 기술 사양서 (공식)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_cn.pdf)
- [U8g2 라이브러리 GitHub (olikraus/u8g2)](https://github.com/olikraus/u8g2)
- [SH1106 드라이버 칩 데이터시트 (Sino Wealth)](https://www.velleman.eu/downloads/29/infosheets/sh1106_datasheet.pdf)
- [image2cpp: 이미지를 XBM 도트 매트릭스로 변환하는 온라인 도구](https://javl.github.io/image2cpp/)
