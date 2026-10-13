---
title: "ESP32-S3로 4.26인치 SSD1677 EPD0426A02 전자종이 구동해 폰초 착시(복도 착시) 애니메이션 재생｜SPI + GxEPD2 완전 튜토리얼"
boardId: esp32s3
moduleId: display/epd-4inch26-epd0426a02
category: esp32
date: 2026-10-13
intro: "ESP32-S3에서 SPI로 EPD0426A02(800×480, SSD1677 컨트롤러) 전자종이를 구동하고, GxEPD2 부분 갱신으로 폰초 복도 착시 4프레임 애니메이션을 재생합니다. 배선, Arduino 코드, 화면 깨짐 트러블슈팅까지 완전 수록."
image: "https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg"
---

> **한 줄 요약**: 선 8가닥 연결, 라이브러리 2개 설치, 스케치 하나 업로드 — 그러면 ESP32-S3가 4.26인치 전자종이 위에서 폰초 복도 착시 애니메이션을 자동 재생합니다. 덤으로 전자종이에서 가장 실용적인 기술인 부분 갱신까지 한 번에 마스터하세요.

```
난이도: ⭐⭐☆☆☆ (VCC를 5V에 꽂지만 않으면 초보도 OK)
예상 시간: 40분 (배선 10분 + 환경 설치 15분 + 업로드 & 감상 15분)
테스트 환경: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + GxEPD2 1.6.9
```

> **TL;DR (빠른 시작):**
>
> 1. 배선: MOSI → GPIO11, SCK → GPIO12, CS → GPIO10, DC → GPIO9, RST → GPIO8, BUSY → GPIO7
> 2. VCC는 3.3V에 연결 (5V에 꽂으면 패널이 타버립니다. 어떻게 아냐고는 묻지 마세요)
> 3. 라이브러리 2개 설치: GxEPD2 (≥ 1.5.3) + Adafruit_GFX (GxEPD2 설치 시 자동으로 딸려옴)
> 4. 보드는 "ESP32S3 Dev Module" 선택, 업로드, 그리고 뇌가 속는 걸 지켜보기

---

## 들어가며: 인류를 100년 넘게 속여온 복도

이 그림, 분명 본 적 있을 겁니다. 똑같은 길이의 선분 두 개에 복도의 원근선을 그려 넣으면, 멀리 있는 쪽이 더 길어 보이는 그 그림. 같다는 걸 알면서도 눈은 끝내 인정하지 않죠. 이것이 고전적인 폰초(Ponzo) 착시로, 뇌가 자동으로 '원근 추론' 모드를 켜서 '멀다'를 '크다'로 번역해버리기 때문입니다.

이 착시를 직접 '실체화'할 기회를 노리고 있었는데, 마침 책상 위에 4.26인치 EPD0426A02 전자종이(800×480, SSD1677 컨트롤러)와 ESP32-S3가 있었습니다. '천천히 바뀌고, 전원을 뽑아도 화면이 남는' 전자종이의 성격은 착시 데모와 찰떡궁합입니다 — 관객에게는 인생을 의심할 충분한 시간을 주고, 끝난 뒤엔 전원을 뽑아 책상 위에 두고 다음 손님을 계속 속일 수 있으니까요.

이 글에서는 처음부터 끝까지 함께합니다: 선 8가닥을 연결하고, 라이브러리 2개를 설치하고, 코드 하나를 업로드해서 이 전자종이가 당신의 뇌에게 한 수 가르치게 만들어 봅시다. 그 과정에서 전자종이의 가장 실용적인 기술 — 부분 갱신 — 도 확실히 익힙니다.

## 최종 결과

업로드가 끝나면 화면이 약 40초짜리 4프레임 애니메이션을 자동 재생합니다: 먼저 "이 두 선분은 길이가 같을까?"라고 묻고, 정답을 공개한 뒤, 마지막으로 복도 착시 화면에서 멈춥니다(MCU는 대기 상태. 수동 리셋 전까지 화면은 유지됨).

![](https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg)

4프레임 콘티는 아래와 같습니다. 프레임 사이는 부분 갱신으로 전환되고, 선분 자체는 꼼짝도 하지 않습니다:

| 프레임 | 화면 내용                                                    | 표시 시간 |
| ------ | ------------------------------------------------------------ | --------- |
| 1      | 선분 A와 B만 표시, "Are these two lines the same length?"    | 7초       |
| 2      | 가로 점선 보조선이 겹쳐짐, "Yes - exactly equal."            | 7초       |
| 3      | 원근선 등장, "And now?"                                      | 10초      |
| 4      | 보조선 + 원근선 동시 표시, "Same lines - your brain was fooled." | 7초    |
| 피날레 | 순수 착시 화면 + 큰 제목 "Ponzo illusion", 이후 대기         | 유지      |

![](https://img.lingflux.com/2026/10/68b443e3994d10b40d287b13965c7c93.jpg)

## 부품 설명

### EPD0426A02 전자종이 — 전원이 꺼져도 '기억'하는 전자 칠판

EPD0426A02는 선전(深圳)의 Osptek(奥斯瑞光电)이 만든 4.26인치 전자종이 디스플레이 모듈로, ESP32-S3가 보낸 이미지 데이터를 화면에 '인쇄'하는 역할을 합니다. 이 프로젝트에서는 4프레임 착시 애니메이션을 재생하고 화면을 장기간 유지하는 일을 맡습니다.

쉽게 말해 Kindle 화면의 사촌 — '전자 칠판'입니다. 글을 쓰고 전원을 꺼도 글자는 남아 있고, 내용을 바꾸려면 화면 전체를 '지우고 다시 쓰면' 됩니다(그래서 전자종이는 갱신할 때 몇 번 깜빡이는 겁니다). 갱신이 느린 건 캐릭터 설정이고, 전력을 안 먹는 게 진짜 실력입니다.

주요 사양:

| 항목             | 사양                                                        |
| ---------------- | ----------------------------------------------------------- |
| 크기 / 해상도    | 4.26인치, 800 × 480(가로), 219 DPI                          |
| 드라이버 IC      | SSD1677(960 source × 680 gate 컨트롤러, SPI 인터페이스)     |
| 표시 능력        | 흑백 이중 안정, 네이티브 4단계 그레이스케일(2 bit/px)       |
| 인터페이스       | 24핀 FPC, 4선 SPI(쓰기 전용)                                |
| 갱신 피크 전류   | 약 50 mA                                                    |
| 딥 슬립 전류     | 약 3 µA(화면 유지 시 전력 소모 없음)                        |
| 설계 수명        | 5년 / 100만 회 갱신(25 ℃ / 60%RH)                           |

왜 이걸 골랐냐면? 800×480은 이 크기 전자종이 중 고해상도라 원근선이 충분히 날카롭게 그려집니다. 3 µA 딥 슬립 덕분에 "공연 끝나면 전원 뽑고 세워 두고 사람 속이기"라는 용도에 전력 부담이 전혀 없고, GxEPD2 라이브러리가 v1.5.3부터 네이티브 지원(드라이버 클래스 `GxEPD2_426_GDEQ0426T82`)하기 때문에 드라이버를 직접 쓸 필요도 없습니다.

### 핀 설명

EPD0426A02 어댑터 보드에는 8개의 핀이 나와 있으며, 각자 역할이 있습니다:

| 핀         | 역사                                                    |
| ---------- | ------------------------------------------------------- |
| VCC        | 3.3V 전원(⚠️ 절대 5V에 연결 금지)                        |
| GND        | 공통 접지. 보드와 같은 언어를 쓰기 위한 기반            |
| MOSI (DIN) | SPI 데이터. MCU가 패널로 픽셀을 밀어 넣는 통로          |
| SCK (SCL)  | SPI 클럭. 1비트를 얼마나 빨리 보낼지 약속               |
| CS         | 칩 셀렉트. LOW = "이 버스는 이제 네 것"                 |
| DC         | 데이터/명령 전환: HIGH=픽셀 데이터, LOW=명령            |
| RST        | 하드웨어 리셋. 초기화 전에 한 번 토글                   |
| BUSY       | 비지 신호: HIGH = 갱신 중, 건드리지 마시오              |

한 가지 팁: 이 패널의 BUSY는 **HIGH 활성**(비지=HIGH)인데 핀 이름이 `BUSY_N`으로 적혀 있는 경우가 많아 직관과 정반대입니다. 다행히 GxEPD2가 이 구덩이를 이미 메워 뒀으니, 그런 게 있구나 정도만 알아두면 됩니다.

## BOM 목록

| 번호 | 부품           | 모델 / 사양                                                  | 수량 | 비고                                |
| ---- | -------------- | ------------------------------------------------------------ | ---- | ----------------------------------- |
| 1    | 개발 보드      | ESP32-S3(ESP32-S3-DevKitC / Arduino Nano ESP32 모두 가능)    | 1    | USB-시리얼 변환 내장이면 OK         |
| 2    | 전자종이 모듈  | EPD0426A02(SSD1677, 800×480)                                 | 1    | 어댑터 보드 포함, 핀 헤더 8개       |
| 3    | 점퍼 와이어    | 암-암 또는 수-수                                             | 8    | 신호 6가닥 + 전원/접지              |
| 4    | USB 케이블     | Type-C 또는 Micro(보드에 따라)                               | 1    | 전원 + 업로드                       |

## 배선

![](https://img.lingflux.com/2026/10/3ae30dc6faad42836102413a774bc830.jpg)

배선도가 기준, 표는 확인용입니다:

| 전자종이 핀 | ESP32-S3 GPIO | 설명                        |
| ----------- | ------------- | --------------------------- |
| VCC         | 3V3           | ⚠️ 3.3V. 5V는 패널 사망      |
| GND         | GND           | 아무 GND나                  |
| MOSI (DIN)  | GPIO11        | SPI 데이터                  |
| SCK (SCL)   | GPIO12        | SPI 클럭                    |
| CS          | GPIO10        | 칩 셀렉트                   |
| DC          | GPIO9         | 데이터/명령                 |
| RST         | GPIO8         | 리셋                        |
| BUSY        | GPIO7         | 비지 신호(입력)             |

**배선 후에는 하나씩 다시 확인하세요. 디버깅 시간의 80%를 아낄 수 있습니다.** 전자종이는 배선이 틀려도 에러도 연기도 없이 그저 조용히 백지 화면이나 깨진 화면을 보여줄 뿐 — 코드가 잘못됐는지 선이 잘못됐는지 구분이 안 됩니다. 또 하나 주의: ESP32-S3의 Arduino 프레임워크 기본 I2C 핀은 GPIO8(SDA), GPIO9(SCL)인데, 이 예제에서는 RST와 DC에 할당했습니다. 패널을 연결한 상태에서 I2C 장치를 쓰려면 `Wire.begin(SDA, SCL)`로 다른 여유 GPIO에 재매핑해야 합니다.

**Arduino Nano ESP32**를 쓰는 경우, 실크 인쇄의 D4~D7, A4/A5는 실제 GPIO 번호가 아닙니다. 대응표:

| 전자종이 핀 | 실제 GPIO | Nano ESP32 실크 |
| ----------- | --------- | --------------- |
| MOSI        | GPIO11    | A4              |
| SCK         | GPIO12    | A5              |
| CS          | GPIO10    | D7              |
| DC          | GPIO9     | D6              |
| RST         | GPIO8     | D5              |
| BUSY        | GPIO7     | D4              |

## 설치할 라이브러리

Arduino IDE → 도구 → 라이브러리 관리 를 열고 아래대로 설치:

| 라이브러리   | 제작자            | 버전 요구사항                                       | 역할                     |
| ------------ | ----------------- | --------------------------------------------------- | ------------------------ |
| esp32        | Espressif Systems | 3.3.10(Arduino IDE 2.3.x에서 실측 통과)             | ESP32-S3 보드 지원       |
| GxEPD2       | Jean-Marc Zingg   | **1.6.9**(`GxEPD2_426_GDEQ0426T82` 드라이버 클래스 포함) | 전자종이 드라이버    |
| Adafruit_GFX | Adafruit          | GxEPD2 설치 시 자동 설치                            | 그래픽 API(선, 폰트)     |

설치 후 보드로 **ESP32S3 Dev Module**(도구 → 보드)을 선택하고 시리얼 포트를 연결하면 바로 업로드할 수 있습니다.

## 전체 코드

그대로 복사해 업로드하면 됩니다(프로젝트의 `arduino/GxEPD2_CorridorIllusion/GxEPD2_CorridorIllusion.ino`에 해당):

```cpp
/*
 * EPD0426A02 (4.26" 480x800 SPI 전자종이, SSD1677) — 복도 착시 (폰초 착시) 데모
 * 보드: ESP32-S3 (Arduino IDE에서 "ESP32S3 Dev Module" 선택)
 * 드라이버 라이브러리: GxEPD2, 내장 드라이버 클래스 GxEPD2_426_GDEQ0426T82 사용
 *
 * 핀 정의는 참고 예제와 완전히 동일:
 *   BUSY -> GPIO7    DC -> GPIO9     CS -> GPIO10
 *   SCK  -> GPIO12   MOSI -> GPIO11  RST -> GPIO8
 *
 * 연출 순서 (1회성, 반복 없음):
 *   프레임 1: 길이가 같은 굵은 선분 A, B만       "Are these two lines the same length?"
 *   프레임 2: 가로 점선 보조선 추가, 등장        "Yes - exactly equal."
 *   프레임 3: 선분은 그대로, 복도 원근선 겹침    "And now?"
 *   프레임 4: 원근 + 보조선, 정답 공개           "Same lines - your brain was fooled."
 *   마지막으로 프레임 3(착시 화면)으로 돌아가 유지
 *
 * 화면은 가로 800x480 (rotation 0 = 컨트롤러 네이티브 방향).
 */

#include <Arduino.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>

// ---------------- 핀 정의 (ESP-IDF 프로젝트의 board_pins.h와 일치) ----------------
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_SCK  12
#define EPD_MOSI 11

// 전체 화면 버퍼 모드 (page_height = HEIGHT, 48000 바이트)
GxEPD2_BW<GxEPD2_426_GDEQ0426T82, GxEPD2_426_GDEQ0426T82::HEIGHT> display(
  GxEPD2_426_GDEQ0426T82(/*CS=*/EPD_CS, /*DC=*/EPD_DC, /*RST=*/EPD_RST, /*BUSY=*/EPD_BUSY));

// ---------------- 화면 지오메트리 (800x480 가로) ----------------
static const int16_t W = 800;
static const int16_t H = 480;

static const int16_t VPX = 700, VPY = 240;   // 소실점 (vanishing point), 왼쪽 복도
static const int16_t VP2X = 1600, VP2Y = 240; // 제2 소실점 (화면 오른쪽 저 멀리), 오른쪽 벽 원근선용
static const int16_t VP0X = -900, VP0Y = 260; // 제3 소실점 (화면 왼쪽 저 멀리), 왼쪽 벽 원근선용
static const int16_t XN  = 150;              // 가까운 벽 모서리 x (선분 A)
static const int16_t XF  = 520;              // 먼 벽 모서리 x (선분 B)
static const int16_t Y1  = 190;              // 선분 위쪽 끝점
static const int16_t Y2  = 290;              // 선분 아래쪽 끝점 (두 선분 길이 모두 100px)

static const int16_t SEG_W = 6;              // 선분 굵기
static const uint32_t FRAME_MS  = 7000;      // 프레임당 표시 시간
static const uint32_t FRAME3_MS = 10000;      // 프레임 3은 조금 더 오래

// 실험: 데이터시트는 VCOM 제어 레지스터 (0x2B)에 0x04, 0x63 고정 쓰기를 요구.
// GxEPD2 드라이버는 보내지 않으므로 수동으로 보완
// (반드시 display.init() 이후에 호출. SWRESET이 이 레지스터를 지우기 때문)
static void epdWriteVCOMControl()
{
  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));
  digitalWrite(EPD_CS, LOW);
  digitalWrite(EPD_DC, LOW);
  SPI.transfer(0x2B);
  digitalWrite(EPD_DC, HIGH);
  SPI.transfer(0x04);
  SPI.transfer(0x63);
  digitalWrite(EPD_CS, HIGH);
  SPI.endTransaction();
}

// 점 (px, py)에서 소실점 (vpx, vpy)을 향하는 직선 위, x 좌표가 x인 점의 y 값
static int16_t onLineYVP(int16_t x, int16_t px, int16_t py, int16_t vpx, int16_t vpy)
{
  float t = (float)(x - px) / (float)(vpx - px);
  return (int16_t)(py + (vpy - py) * t);
}

// 왼쪽 복도: 소실점 VP를 향함
static int16_t onLineY(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VPX, VPY);
}

// 오른쪽 벽: 제2 소실점 VP2를 향함
static int16_t onLineY2(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP2X, VP2Y);
}

// 왼쪽 벽: 제3 소실점 VP0를 향함
static int16_t onLineY0(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP0X, VP0Y);
}

// ---------------- 그리기 요소 ----------------

// 두 선분 —— 모든 프레임에서 완전히 같은 좌표와 굵기
static void drawSegments()
{
  display.fillRect(XN - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // 선분 A
  display.fillRect(XF - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // 선분 B

  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(XN - 34, Y2 + 30);
  display.print("A");
  display.setCursor(XF + 16, Y2 + 30);
  display.print("B");
}

// 가로 점선 정렬 보조선. 두 선분의 끝점이 같은 수평선 위에 있음을 증명
static void drawGuides()
{
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    for (int16_t x = 0; x < W; x += 12)
    {
      display.drawFastHLine(x, ys[i], 6, GxEPD_BLACK);
    }
  }
}

// 복도 원근선
static void drawPerspective()
{
  const int16_t topX = XN, topY = 40;    // 가까운 벽 모서리 위쪽
  const int16_t botX = XN, botY = 440;   // 가까운 벽 모서리 아래쪽

  int16_t ftY = onLineY(XF, topX, topY); // 먼 벽 모서리 위쪽 y
  int16_t fbY = onLineY(XF, botX, botY); // 먼 벽 모서리 아래쪽 y

  // 천장 / 바닥 (2px)
  display.drawLine(topX, topY, XF, ftY, GxEPD_BLACK);
  display.drawLine(topX, topY + 1, XF, ftY + 1, GxEPD_BLACK);
  display.drawLine(botX, botY, XF, fbY, GxEPD_BLACK);
  display.drawLine(botX, botY - 1, XF, fbY - 1, GxEPD_BLACK);

  // 가까운 벽 모서리 (2px) / 먼 벽 모서리 (1px)
  display.drawLine(XN, topY, XN, botY, GxEPD_BLACK);
  display.drawLine(XN + 1, topY, XN + 1, botY, GxEPD_BLACK);
  display.drawLine(XF, ftY, XF, fbY, GxEPD_BLACK);

  // 선분 상하 끝점을 지나는 수평 원근선 (먼 벽까지 관통)
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XF, onLineY(XF, XN, ys[i]), GxEPD_BLACK);
  }

  // 세로 구분 (벽돌 줄눈)
  static const int16_t divX[] = {260, 350, 420, 470, 500};
  for (uint8_t i = 0; i < sizeof(divX) / sizeof(divX[0]); i++)
  {
    int16_t x = divX[i];
    display.drawLine(x, onLineY(x, topX, topY), x, onLineY(x, botX, botY), GxEPD_BLACK);
  }

  // ---- 오른쪽 벽: 먼 벽 모서리 (XF)에서 화면 오른쪽 끝까지, 제2 소실점 VP2로 수렴 ----
  const int16_t XR = W - 1;

  // 천장선 / 바닥선 (오른쪽 끝까지 이어짐)
  display.drawLine(XF, ftY, XR, onLineY2(XR, XF, ftY), GxEPD_BLACK);
  display.drawLine(XF, fbY, XR, onLineY2(XR, XF, fbY), GxEPD_BLACK);

  // 선분 상하 끝점을 지나는 수평선을 오른쪽 벽에서도 연장
  for (int i = 0; i < 2; i++)
  {
    int16_t yAtXF = onLineY(XF, XN, ys[i]); // 왼쪽 벽 원근선이 먼 벽 모서리에 도달했을 때의 y
    display.drawLine(XF, yAtXF, XR, onLineY2(XR, XF, yAtXF), GxEPD_BLACK);
  }

  // 오른쪽 벽 세로 구분 (줄눈), 천장선과 바닥선을 연결
  static const int16_t divXR[] = {600, 660, 710, 750, 780};
  for (uint8_t i = 0; i < sizeof(divXR) / sizeof(divXR[0]); i++)
  {
    int16_t x = divXR[i];
    display.drawLine(x, onLineY2(x, XF, ftY), x, onLineY2(x, XF, fbY), GxEPD_BLACK);
  }

  // ---- 왼쪽 벽: 가까운 벽 모서리 (XN)에서 화면 왼쪽 끝까지, 제3 소실점 VP0로 수렴 ----
  const int16_t XL = 0;

  // 천장선 / 바닥선 (왼쪽 끝까지 이어짐)
  display.drawLine(XN, topY, XL, onLineY0(XL, XN, topY), GxEPD_BLACK);
  display.drawLine(XN, botY, XL, onLineY0(XL, XN, botY), GxEPD_BLACK);

  // 선분 상하 끝점을 지나는 수평선을 왼쪽 벽에서도 연장
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XL, onLineY0(XL, XN, ys[i]), GxEPD_BLACK);
  }

  // 왼쪽 벽 세로 구분 (줄눈)
  static const int16_t divXL[] = {30, 80, 120};
  for (uint8_t i = 0; i < sizeof(divXL) / sizeof(divXL[0]); i++)
  {
    int16_t x = divXL[i];
    display.drawLine(x, onLineY0(x, XN, topY), x, onLineY0(x, XN, botY), GxEPD_BLACK);
  }
}

// 상단 텍스트
static void drawTitle(const char *text)
{
  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(20, 34);
  display.print(text);
}

// 최종 유지 프레임의 큰 제목: 더 큰 폰트, 상단 수평 중앙
// (상단 중앙 영역은 천장선 위쪽이라 원근선과 겹치지 않음)
static void drawTitleBig(const char *text)
{
  display.setFont(&FreeSansBold18pt7b);
  display.setTextColor(GxEPD_BLACK);
  int16_t tbx, tby;
  uint16_t tbw, tbh;
  display.getTextBounds(text, 0, 0, &tbx, &tby, &tbw, &tbh);
  display.setCursor((W - tbw) / 2 - tbx + 200, 48 - tby); // 베이스라인은 대략 y=48
  display.print(text);
}

// 프레임 번호로 전체 화면 그리기 (1..4). 항상 전체 윈도우 절대 좌표로 그림
static void drawFrame(uint8_t frame)
{
  display.fillScreen(GxEPD_WHITE);
  switch (frame)
  {
    case 1:
      drawTitle("Are these two lines the same length?");
      break;
    case 2:
      drawTitle("Yes - exactly equal.");
      drawGuides();
      break;
    case 3:
      drawTitle("And now?");
      drawPerspective();
      break;
    case 5: // 최종 유지 프레임: 착시 화면 + 큰 제목, "And now?" 없음
      drawTitleBig("Ponzo illusion");
      drawPerspective();
      break;
    case 4:
    default:
      drawTitle("Same lines - your brain was fooled.");
      drawPerspective();
      drawGuides();
      break;
  }
  drawSegments(); // 매 프레임 마지막에 그림. 좌표는 영원히 불변
}

// 전체 갱신으로 한 프레임 표시
static void showFrameFull(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.display(); // 전체 화면 갱신
}

// 부분 갱신으로 한 프레임 표시: 전체 윈도우에 그리고, displayWindow()로 바뀐 영역만 갱신
// (전체 화면 윈도우 = 전체 화면 부분 갱신)
static void showFramePartial(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.displayWindow(0, 0, W, H);
}

void setup()
{
  Serial.begin(115200);
  delay(500);
  Serial.println("[EPD] EPD0426A02 Corridor Illusion (GxEPD2 / GDEQ0426T82)");

  // ESP32 커스텀 SPI 핀 매핑: SCK, MISO(-1 = 미사용), MOSI, SS
  SPI.begin(EPD_SCK, -1, EPD_MOSI, EPD_CS);

  display.init(115200);
  display.setRotation(0); // 네이티브 가로 800x480
  display.setTextColor(GxEPD_BLACK);

  epdWriteVCOMControl(); // 0x2B VCOM 제어 레지스터 보완 전송

  // ---- 1회성 연출: 프레임 1 -> 2 -> 3 -> 4 ----
  // 프레임 1: 전체 갱신으로 개막
  showFrameFull(1);
  Serial.println("[EPD] frame 1 (full refresh)");
  delay(FRAME_MS);

  // 프레임 2 -> 3 -> 4: 부분 갱신. 선분은 꼼짝도 않음
  showFramePartial(2);
  Serial.println("[EPD] frame 2 (partial)");
  delay(FRAME_MS);

  showFramePartial(3);
  Serial.println("[EPD] frame 3 (partial)");
  delay(FRAME3_MS);

  showFramePartial(4);
  Serial.println("[EPD] frame 4 (partial, reveal)");
  delay(FRAME_MS);

  // 마지막은 착시 화면에서 유지 (프레임 5: 복도 + 큰 제목 "Ponzo illusion", "And now?" 없음)
  showFramePartial(5);
  Serial.println("[EPD] final frame 5 (illusion + title), hold");
  delay(1000);

  // 데모 종료. 화면은 그대로 유지 (딥 슬립 미사용)
  Serial.println("[EPD] done, holding frame");
}

void loop()
{
  // 화면은 이미 유지 중. 여기서는 빈둥빈둥
}
```

### 코드 설명

300줄 남짓한 코드 — 길어 보이지만 하는 일은 딱 여섯 가지입니다:

1. **핀과 디스플레이 객체(`#define` 묶음 + `GxEPD2_BW` 선언)**: 매크로 6개가 신호선 6가닥에 대응합니다. `GxEPD2_BW<..., HEIGHT>`는 "전체 화면 버퍼 모드"로, 한 프레임 48,000바이트를 통째로 RAM에 올립니다. ESP32-S3의 RAM으로는 거뜬합니다. 핀을 바꾸고 싶다면? 이 매크로 6개만 수정하면 끝.
2. **4프레임 콘티(`drawFrame`)**: 사실상 switch 표 하나입니다. `drawSegments()`가 switch 밖에 있어 매 프레임 마지막에 그려진다는 점에 주목 — 선분 좌표는 처음부터 끝까지 불변이고, 바뀌는 건 주변의 보조선과 원근선뿐입니다. 착시가 성립하려는 철칙입니다.
3. **원근선 그리기(`drawPerspective` + `onLineY` 함수 3개)**: 핵심은 중학교 때 배운 두 점을 지나는 직선 방정식 한 줄. 세 벽이 각각 자기 '소실점'(화면 밖 교점)을 향하게 하면 선에 자연스러운 깊이감이 생깁니다. 소실점을 화면 밖(VP2는 x=1600, VP0은 x=-900)에 두면 오히려 원근감이 더 자연스럽습니다.
4. **부분 갱신(`showFramePartial` 안의 `displayWindow`)**: 메모리에서 프레임 전체를 다시 그린 뒤, '바뀐 픽셀'만 패널로 보냅니다. 프레임 2에서 4 사이, 화면 위 선분은 털끝만큼도 움직이지 않고 깜빡이는 건 보조선과 원근선뿐 — 이것이 전체 갱신 대비 부분 갱신의 진수입니다: 빠르고(1회 약 0.42초), 눈부심도 없습니다.
5. **0x2B VCOM 패치(`epdWriteVCOMControl`)**: SSD1677 데이터시트는 `0x2B` 레지스터에 `0x04, 0x63`을 쓰라고 요구합니다(ACVCOM 토글 시 글리치 억제). 그런데 GxEPD2도 제조사 데모도 이 명령을 보내지 않습니다. 빼먹으면 결과가 은근히 치사합니다: 데모가 끝난 뒤 VCC가 연결되어 있는 한, 화면이 몇 분 단위로 서서히 깨집니다. 소프트웨어 리셋(0x12)이 이 레지스터를 지우므로 매번 `display.init()` 직후에 다시 보내야 합니다. 이 함정에 하루 종일 빠졌습니다. 자세한 건 뒤의 트러블슈팅에서.

## 트러블슈팅

당황하지 마세요. 문제의 90%는 이 다섯 곳에서 나옵니다. 위에서부터 차례로 확인:

**1. 업로드 후 백지 화면, 아무것도 안 뜸**

인생을 의심하기 전에, 확률 높은 순으로: ① 신호선 6가닥에 접촉 불량은 없는지(점퍼 와이어는 브레드보드에 오래 꽂아두면 헐거워집니다); ② VCC가 정말 3.3V인지; ③ 업로드 직후 시리얼 모니터에 `[EPD] frame 1`이 찍히는지 — 시리얼 출력조차 없으면 프로그램이 안 돌고 있는 것이니 패널은 무죄입니다. 전자종이는 에러를 뱉지 않습니다. 백지 화면이 곧 그들의 '에러 메시지'입니다.

**2. 컴파일 에러: `'GxEPD2_426_GDEQ0426T82' does not name a type`**

GxEPD2 버전이 1.5.3 미만입니다. 라이브러리 관리자에서 GxEPD2를 최신 버전으로 올리세요. 이 드라이버 클래스는 v1.5.3부터 생겼습니다.

**3. 데모가 끝난 뒤 놔뒀더니 화면이 서서히 깨짐(수십 분 단위)**

바로 그 0x2B입니다. `epdWriteVCOMControl()`이 매번 `display.init()` 이후에 호출되는지 확인하세요 — 소프트웨어 리셋이 이 레지스터를 지웁니다. init이 먼저, 보완 전송이 나중. 순서가 뒤집히면 안 보낸 것과 같습니다. 제대로 보내면 전원을 켠 채 방치해도 화면이 안정적으로 유지됩니다.

**4. 화면 절반만 나오거나 상하가 어긋남**

십중팔구 rotation이나 해상도 문제입니다. 이 예제는 `setRotation(0)`(네이티브 가로 800×480)을 씁니다. 이전에 다른 예제에서 rotation을 1이나 3으로 바꿨다면 되돌리세요. 참고로 ESP-IDF 쪽에는 페이지 분할 렌더링 버전이 있습니다(메모리가 빠듯할 때용). Arduino 전체 화면 버퍼 모드에는 이 문제가 없습니다.

**5. 업로드 실패 / 시리얼 포트를 찾을 수 없음**

보드의 BOOT 버튼을 누른 채로 USB를 꽂아 다운로드 모드로 진입하세요. 그래도 안 되면 케이블 교체 — 많은 '충전 케이블'에는 전원선만 있고 데이터선이 없습니다. 제 업로드 인생에서 가장 많이 겪은 사고입니다.

## FAQ

**Q: 일반 ESP32(S3 말고)나 ESP32-C3에서도 되나요?**
A: 됩니다. 코드에 S3 전용 기능을 쓰지 않았으므로 Arduino 프레임워크를 지원하는 ESP32 시리즈면 뭐든 됩니다. 핀은 보드의 여유 GPIO로 옮기기만 하면 됩니다. 전체 화면 버퍼에는 약 48KB RAM이 필요한데, 클래식 ESP32(SRAM 520KB)도 충분합니다.

**Q: GPIO 핀을 바꿀 수 있나요? 어떻게?**
A: 바꿀 수 있습니다. 코드 앞부분의 `#define` 6개(EPD_CS / EPD_DC / EPD_RST / EPD_BUSY / EPD_SCK / EPD_MOSI)를 수정하고 새 핀에 맞게 다시 배선하면 끝. ESP32-S3에서는 GPIO0/3/45/46 같은 Strapping 핀, GPIO19/20(USB), Flash/PSRAM에 점유된 핀은 피하세요. 자세한 건 보드 회로도를 참고하세요.

**Q: 전자종이 갱신 한 번에 몇 초씩 걸리고 몇 번 깜빡이는데, 정상인가요?**
A: 전체 갱신이 느린 건 정상적인 물리 특성입니다: 갱신할 때마다 480줄의 픽셀을 전부 다시 '눌러줘야' 하거든요. 이 패널의 전체 갱신은 실측 약 2초(고속 파형에서는 약 1.5초). 깜빡임은 잔상을 씻어내는 표준 절차로, 고장이 아닙니다. 느리다 싶으면 이 예제의 부분 갱신(`displayWindow`)을 쓰세요. 실측 1회 약 0.42초에 거의 깜빡임이 없습니다.

**Q: 전자종이에 5V를 연결해도 되나요?**
A: 안 됩니다. EPD0426A02의 VCC는 반드시 3.3V. 상한이 3.3V입니다. 5V를 꽂아도 바로 연기가 나진 않지만, 패널 내부 고압 구동 회로가 망가져 몇 번 사용한 후 국부적인 화면 깨짐으로 나타납니다 — 게다가 무상 보증도 안 됩니다. 안 켜지는 한이 있어도 5V는 안 됩니다.

**Q: 데모 후 화면을 놔두면 서서히 깨지는 문제, 근본적으로 해결하려면?**
A: SSD1677의 0x2B 레지스터에 0x04, 0x63 두 바이트를 쓰고(데이터시트 원문은 "reduce glitch when ACVCOM toggle"), 소프트웨어 리셋 때마다 다시 보내면 됩니다. 예제의 `epdWriteVCOMControl()`이 바로 그 일을 합니다. 더 물리적인 방법으로 P-MOSFET으로 VCC를 끊는 것도 있지만, 소프트웨어로 두 바이트 보내면 해결되는데 인두기까지 꺼낼 필요는 없죠.

**Q: 4단계 그레이스케일이라는데, 상품 페이지에는 16단계라고 쓰여 있던데요?**
A: SSD1677의 픽셀은 물리적으로 흑/백 두 가지 안정 상태만 갖고, 데이터 경로는 2 bit/px입니다. 네이티브로는 4단계(검정/진회색/연회색/흰색)가 맞습니다. 그레이스케일은 파형 테이블(LUT)이 한 프레임 안에서 픽셀마다 횟수와 극성이 다른 펄스를 가해 구현되고, 16단계로 보이는 건 Bayer 4×4 순서 디더링으로 4단계 위에 시뮬레이션한 것입니다. 이 착시 예제는 흑백만 쓰므로 영향이 없지만, 사진을 띄울 때는 이 상한을 기억하세요.

**Q: 부분 갱신을 오래 쓰면 잔상이 생기는데 어떻게 하나요?**
A: 부분 갱신의 원리상 잔상은 누적됩니다. 실용적인 전략은 "부분 갱신을 한참 하다가 전체 갱신을 한 번 끼워 넣기" — `display.clearScreen()`을 하거나, 그냥 전체 검정→전체 흰색을 한 번씩 돌려 잔상을 씻어내면 됩니다. 이 예제는 갱신 4회뿐이라 잔상은 무시할 수 있습니다.

**Q: 선분의 길이나 위치를 바꾸거나, 문구를 한국어로 바꾸고 싶은데 어디를 고치나요?**
A: 선분 파라미터는 "화면 지오메트리" 상수 묶음에 다 있습니다: `XN`/`XF`는 수평 위치, `Y1`/`Y2`는 상하 끝점(길이 = Y2 - Y1), `SEG_W`는 굵기. 문구는 `drawFrame`의 switch 안에 있습니다. 수정 후에는 두 선분의 좌표 일치를 유지하세요. 그렇지 않으면 착시가 '정직'하지 않게 됩니다.

## 확장 아이디어

- 착시 바꾸기: 폰초 착시를 뮐러-라이어 화살표 착시나 에빙하우스 크기 착시로 교체. `drawFrame`의 기하 함수만 수정하면 됩니다
- 수동 프레임 넘기기: 터치 버튼이나 가변저항을 달아 관객이 "정답!"을 외쳐야 프레임 3으로 진입. 의식감 최대치
- 부분 갱신 스톱워치: 이 예제의 `displayWindow` 아이디어로 0.42초마다 한 칸씩 가는 전자 스톱워치를 만들기. 전자종이가 '움직이는' 위화감을 즐겨보세요
- 그레이스케일 사진: GxEPD2_4G를 붙여 4단계 그레이 + Bayer 디더링으로 사진 한 장을 전자종이에 '인쇄'. Kindle 배경화면 느낌
- 배터리 소품: 18650 + 딥 슬립으로 하루에 몇 초만 깨어나 화면을 갱신. 건전지 하나로 몇 달 — 당신의 착시 복도는 24시간 365일 사람을 속일 수 있습니다

## 참고 자료

- SSD1677 드라이버 IC 공식 제품 페이지(Solomon Systech): https://www.solomon-systech.com/product/ssd1677/
- GxEPD2 드라이버 라이브러리 GitHub(지원 패널 전체 목록): https://github.com/ZinggJM/GxEPD2
- Adafruit_GFX 그래픽 라이브러리 GitHub: https://github.com/adafruit/Adafruit-GFX-Library
- ESP32-S3 SoC 공식 제품 페이지(Espressif): https://www.espressif.com/en/products/socs/esp32-s3
- 자매 라이브러리 GxEPD2_4G(4단계 그레이 + 디더링 그레이스케일 사진을 해보고 싶다면): https://github.com/ZinggJM/GxEPD2_4G
