---
title: "ESP32-S3로 EPD037A02(JD7601) 6색 전자종이 구동하기: Hello, 영어 시간표, 사진 3화면 데모(SPI + Arduino)"
boardId: esp32s3
moduleId: display/epd-3inch7-epd037a02-jd7601
category: esp32
date: 2026-11-20
intro: "ESP32-S3와 Adafruit GFX로 EPD037A02 6색 전자종이를 구동합니다. SPI 배선, Arduino 설정, Hello·영어 시간표·사진 3화면의 전체 코드를 담았습니다. Arduino 업로드 경험이 있고 6색 전자종이 구동과 사진 변환을 배우고 싶은 분께 적합합니다."
image: "https://img.lingflux.com/2026/11/ff03861dd789ec83465baba962075e98.jpg"
---

난이도: ⭐⭐(Arduino 업로드 경험이 있으면 충분합니다)<br>
소요 시간: 처음 진행하면 배선, 라이브러리 설치, 업로드까지 약 30분(측정하지 않은 예상 시간). 3화면 재생에는 약 1~1.5분(화면당 전체 refresh 15~25초와 3초 대기 2회 포함).<br>
테스트 환경: Arduino IDE 2.3.8; esp32 Arduino Core 3.3.10; Adafruit GFX Library 1.13.0

> **한 줄 요약**: ESP32-S3, SPI, Adafruit GFX로 EPD037A02 6색 전자종이에 Hello, 영어 시간표, 사진을 차례로 표시합니다.

## 빠른 시작

- [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601)에서 `EPD_3in7_Showcase_JD7601` 폴더 전체를 다운로드합니다(LingShunLAB 저장소의 `Handbook/Arduino/ESP32-S3/` 아래에 있으며, 저장소 전체를 clone하거나 ZIP으로 다운로드할 수 있습니다). 메인 `.ino`, 드라이버 `.h/.cpp`, `photo_data.h`는 모두 이 폴더에 있어야 하며, 폴더 이름은 메인 `.ino` 파일 이름과 같아야 합니다.
- 배선: BUSY, RST, DC, CS, MOSI, SCK를 각각 GPIO7, 8, 9, 10, 11, 12에 연결합니다. VDD는 3.3 V에 연결하고 GND는 개발 보드와 공통으로 연결합니다.
- esp32 Arduino Core 3.3.10, Adafruit GFX Library 1.13.0과 의존 라이브러리인 Adafruit BusIO 1.17.4를 설치합니다.
- 보드를 `ESP32S3 Dev Module`로 선택해 컴파일하고 업로드한 다음, 115200 baud의 Serial Monitor를 엽니다.
- `HOLD_MS`의 기본값은 3000 ms로, 각 화면의 refresh가 끝난 후 추가로 기다리는 시간입니다. 화면 전환 간격이 아닙니다.

## 들어가며

ESP32-S3로 전자종이 데모 카드를 만들어 보고 싶었습니다. 먼저 Hello를 표시하고, 이어서 영어 시간표를 보여준 뒤 마지막에는 사진에 멈추는 구성입니다.

사용한 OSPTEK EPD037A02는 480×720 해상도의 6색 SPI 디스플레이입니다. GxEPD2에는 이 패널용 드라이버가 없어서 JD7601의 SPI timing과 frame format만 담당하는 패널 드라이버를 직접 작성했습니다. 텍스트와 그래픽은 Adafruit GFX에 맡깁니다. 이 글에서는 배선, 라이브러리 설정, 3화면 전체 코드를 소개합니다.

## 최종 결과

프로그램은 Hello → 영어 시간표 → 사진 순서로 한 번만 재생합니다. 처음 두 화면은 refresh가 끝난 후 각각 3000 ms 동안 유지하고, 마지막에는 사진에 멈춥니다. `loop()`에서 화면을 다시 그리지 않습니다.

![](https://img.lingflux.com/2026/11/dc08d160b6bc55bc5a237bcadf4abc9f.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/kzJw5SoUn40?si=yWxWSi7nY-pc4jXh" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>



## 부품 설명
### EPD037A02 6색 전자종이

EPD037A02는 OSPTEK의 3.7인치 6색 전자종이 모듈입니다. 전자종이는 주변광으로 색을 표현하며 전원을 꺼도 화면이 유지됩니다. 이 예제에서는 텍스트, 6색 컬러 블록, 시간표, 미리 변환한 사진을 표시합니다.

검정, 흰색, 노랑, 빨강, 파랑, 초록의 여섯 가지 색만 지원하며 grayscale은 없습니다. 사진의 중간색은 서로 다른 색의 pixel을 섞어 배치해 모사해야 하므로 JPG를 화면에 바로 전송할 수 없습니다. 먼저 패널의 frame format으로 변환해야 합니다.

| 항목 | 사양 |
| --- | --- |
| 모델 | EPD037A02 |
| 크기 및 해상도 | 3.7인치, 480×720 |
| 색상 | 검정, 흰색, 노랑, 빨강, 파랑, 초록 |
| Pixel format | 4 bit/pixel, 1 byte에 pixel 2개 저장 |
| Interface | 4-wire SPI, 1×8P 2.54 mm pin header |
| 전체 refresh 시간 | 약 15~25초 |
| 전원 | 3.3 V |

이 패널 하나로 텍스트, 그래픽, 6색 사진을 모두 시험할 수 있어 데모에 사용했습니다. 단점은 refresh가 느려서 animation에는 적합하지 않다는 점입니다.

## 준비물

| 준비물 | 수량 | 비고 |
| --- | --- | --- |
| ESP32-S3 개발 보드 | 1 | 이 예제에서는 `ESP32S3 Dev Module` 선택 |
| EPD037A02 모듈 및 SPI 변환 보드 | 1 | 480×720 6색 전자종이 |
| 2.54 mm 점퍼 와이어 | 8개 | 신호선 6개, 전원 1개, GND 1개 |
| USB 데이터 케이블 | 1 | 전원 공급, 업로드, Serial 확인 |

### Pin 설명

| 화면 pin | 방향 | 역할 |
| --- | --- | --- |
| BUSY | 화면 → ESP32-S3 | High는 idle, Low는 busy |
| CS | ESP32-S3 → 화면 | Chip select, Low active, 프로그램에서 수동 제어 |
| DC | ESP32-S3 → 화면 | Low에서 command, High에서 data 전송 |
| RST | ESP32-S3 → 화면 | Reset, Low active |
| SDA / MOSI | ESP32-S3 → 화면 | SPI data |
| CLK / SCK | ESP32-S3 → 화면 | SPI clock |
| VDD | 전원 | 3.3 V만 연결 |
| GND | 전원 | 개발 보드와 공통 GND 연결 |

이 화면은 데이터를 받기만 하고 반환하지 않으므로 MISO는 연결할 필요가 없습니다. 변환 보드의 BS0는 10 kΩ 저항을 통해 GND에 연결되어 4-wire SPI mode로 고정됩니다. 이 mode에서는 DC로 command와 data를 구분하므로 DC를 생략할 수 없습니다.

## 배선

개발 보드의 전원을 끈 후 아래 표에 따라 배선하세요.

| 화면 pin | ESP32-S3 | 용도 |
| --- | --- | --- |
| BUSY | GPIO7 | 패널 busy 상태 읽기 |
| CS | GPIO10 | 수동 chip select |
| DC | GPIO9 | Command와 data 구분 |
| RST | GPIO8 | 패널 reset |
| SDA / MOSI | GPIO11 | SPI data |
| CLK / SCK | GPIO12 | SPI clock |
| VDD | 3.3 V | 모듈 전원 공급 |
| GND | GND | 공통 GND |

**VDD에는 3.3 V만 연결하고 5 V는 연결하지 마세요.** 배선 후 선을 하나씩 확인하고, 특히 SDA와 CLK가 바뀌지 않았는지 점검합니다.

배선을 마쳤다면 다음 순서로 진행합니다.

1. USB로 개발 보드를 연결하고 Arduino IDE에서 `ESP32S3 Dev Module`과 해당 port를 선택합니다.
2. 전체 예제를 열어 컴파일하고 업로드합니다.
3. Serial Monitor를 열고 baud rate를 115200으로 설정합니다. 처음 로그가 보이지 않으면 개발 보드의 RESET 버튼을 눌러 프로그램을 다시 실행하세요. 프로그램은 한 번만 재생되므로 Monitor를 늦게 열으면 앞의 출력을 놓칩니다.
4. Serial에는 frame buffer 정보, 패널 초기화 완료, 두 번의 'refresh 완료'(사진 화면에서는 refresh 시간을 출력하지 않음)가 차례로 표시되고 마지막에 `Done. Last picture stays on screen.`이 출력됩니다. 동시에 화면에도 3개 화면이 순서대로 나타나야 합니다. 두 가지를 모두 확인해야 정상적으로 동작하는 것입니다.

## 설치할 라이브러리

Arduino IDE의 '보드 매니저'에서 `esp32`를 검색해 Espressif Systems의 esp32 Arduino Core를 설치합니다. 이 글에서는 3.3.10을 사용합니다.

이어서 '라이브러리 매니저'에서 아래 라이브러리를 검색해 설치합니다. Adafruit GFX 설치 중 의존성 설치 안내가 나오면 모두 설치를 선택하세요. Adafruit BusIO도 함께 설치됩니다.

| 라이브러리 | 테스트 버전 | 출처 |
| --- | --- | --- |
| Adafruit GFX Library | 1.13.0 | [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library) |
| Adafruit BusIO | 1.17.4 | [Adafruit_BusIO](https://github.com/adafruit/Adafruit_BusIO) |
| SPI | esp32 Core 3.3.10에 포함 | [arduino-esp32](https://github.com/espressif/arduino-esp32)에 기본 포함, 별도 설치 불필요 |
| EPD037A02_GFX | 버전 표기 없음 | 프로젝트에 포함. 메인 `.ino`와 같은 디렉터리에 두고 라이브러리 디렉터리에 복사할 필요 없음 |

Adafruit GFX는 텍스트와 그래픽을 그립니다. `EPD037A02_GFX`는 패널 초기화, SPI 전송, 6색 encoding과 refresh를 담당합니다. 패널마다 command가 다르므로 이 계층을 다른 전자종이 라이브러리로 바로 대체할 수 없습니다.

## 전체 코드

예제 소스 코드는 [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601)에 있습니다. 폴더와 메인 프로그램 파일 이름은 모두 `EPD_3in7_Showcase_JD7601`이며, Arduino IDE에서 열리려면 두 이름이 일치해야 합니다. 주요 파일은 다음과 같습니다.

```text
EPD_3in7_Showcase_JD7601/
├── EPD_3in7_Showcase_JD7601.ino
├── EPD037A02_GFX.h
├── EPD037A02_GFX.cpp
├── photo_data.h
└── tool/
    ├── epd_photo.py                  # 사진 변환 스크립트
    └── 02-driver-dog-car-480x720.png # 예제 사진 원본
```

처음 세 파일의 코드를 아래에 모두 실었습니다. `photo_data.h`는 1만 줄이 넘어 본문에서는 생략하므로 저장소에서 다운로드하세요. 이 파일이 없으면 컴파일되지 않습니다.

이 파일에는 `tool/02-driver-dog-car-480x720.png`를 변환한 172800 byte의 `photo_driver` 배열이 들어 있습니다. PNG 파일 자체가 아니라 변환된 패널 frame이 저장되어 있습니다.

아래 코드는 저장소 소스와 로직이 같으며 일부 주석만 조정했습니다. 기준은 저장소의 코드입니다.

### 메인 프로그램 EPD_3in7_Showcase_JD7601.ino

```cpp
/*
 * EPD_3in7_Showcase — Hello + 영어 시간표 + 사진 한 장
 * 화면: OSPTEK 3.7" E6, 480×720, JD7601
 * MCU: ESP32-S3
 *
 * 초보자는 이 파일만 수정하면 됩니다. Adafruit GFX 기본 font를 사용하므로 별도 font data를 만들 필요가 없습니다.
 * 설치: Arduino IDE Library Manager에서 Adafruit GFX Library를 검색하세요.
 * 열기: Showcase 폴 전체를 다운로드한 후 이 .ino를 여세요. 메인 파일만 복사하지 마세요.
 */

#include "EPD037A02_GFX.h"
#include "photo_data.h"

// Pin 순서: CS, DC, RST, BUSY, SCK, MOSI. 전원은 3.3V만 사용합니다.
EPD037A02_GFX epd(10, 9, 8, 7, 12, 11);
#define HOLD_MS 3000

// 내장 5×7 font의 y 좌표는 텍스트 위쪽 가장자리입니다. 한 글자는 6×8 pixel을 차지합니다.
void text(const char *s, int x, int y, uint8_t size, uint8_t color) {
  epd.setFont();                 // GFX 기본 font 사용, 별도 setFont(font) 불필요
  epd.setTextSize(size);
  epd.setTextColor(color);
  epd.setCursor(x, y);
  epd.print(s);
}

void textCenter(const char *s, int y, uint8_t size, uint8_t color) {
  int w = strlen(s) * 6 * size;
  text(s, (480 - w) / 2, y, size, color);
}

void drawHello() {
  epd.fillScreen(EPD_WHITE);
  epd.drawRect(0, 0, 480, 720, EPD_BLACK);
  textCenter("HELLO", 65, 9, EPD_BLACK);
  textCenter("WORLD", 150, 9, EPD_RED);
  epd.fillRect(40, 245, 400, 4, EPD_BLACK);

  // 6개 컬러 블록으로 6색 mapping과 화면 방향도 함께 확인합니다.
  const uint8_t colors[6] = {
    EPD_BLACK, EPD_WHITE, EPD_YELLOW, EPD_RED, EPD_BLUE, EPD_GREEN
  };
  const char *labels[6] = { "K", "W", "Y", "R", "B", "G" };
  for (int i = 0; i < 6; i++) {
    int x = 16 + i * 76;
    epd.fillRect(x, 295, 68, 110, colors[i]);
    epd.drawRect(x, 295, 68, 110, EPD_BLACK);
    text(labels[i], x + 22, 430, 4, EPD_BLACK);
  }
  textCenter("3.7INCH 480X720", 525, 4, EPD_BLACK);
  textCenter("E6 6-COLOR EPD", 570, 4, EPD_BLACK);
  textCenter("ESP32-S3 OK", 640, 4, EPD_BLUE);
}

// 시간표 내용을 바꾸려면 아래 몇 줄만 수정하세요.
const char *subjects[6] = {
  "MATH", "CHINESE", "ENGLISH", "PHYSICS", "CHEMISTRY", "STUDY HALL"
};
const char *rooms[6] = {
  "ROOM 302", "ROOM 302", "AUDIO LAB", "PHYS LAB", "CHEM LAB", "ROOM 302"
};
const char *times[6] = { "08:00", "08:55", "NOW", "11:05", "14:00", "14:55" };
const uint8_t bars[6] = {
  EPD_BLUE, EPD_RED, EPD_RED, EPD_BLACK, EPD_YELLOW, EPD_WHITE
};

void drawAgenda() {
  epd.fillScreen(EPD_WHITE);
  epd.fillRect(0, 0, 480, 100, EPD_BLACK);
  text("MON - NOV 9", 24, 20, 4, EPD_WHITE);
  text("WEEK 12 - 6 CLASSES", 24, 65, 2, EPD_YELLOW);

  for (int i = 0; i < 6; i++) {
    int y = 115 + i * 92;
    bool now = (i == 2);
    epd.fillRoundRect(18, y, 444, 80, 5, now ? EPD_RED : EPD_WHITE);
    if (!now) epd.drawRoundRect(18, y, 444, 80, 5, EPD_BLACK);
    if (bars[i] != EPD_WHITE) epd.fillRect(20, y + 2, 9, 76, bars[i]);

    uint8_t fg = now ? EPD_WHITE : EPD_BLACK;
    text(subjects[i], 45, y + 12, 3, fg);
    text(rooms[i], 45, y + 47, 2, fg);
    text(times[i], 365, y + 25, 2, fg);
  }
  text("NEXT 11:05 PHYSICS", 20, 688, 2, EPD_BLACK);
}

bool showScreen(uint8_t index) {
  switch (index) {
    case 0: drawHello();  return epd.display();
    case 1: drawAgenda(); return epd.display();
    case 2: return epd.displayRawFrame(photo_driver, PHOTO_DRIVER_BYTES);
    default: return false;
  }
}

void setup() {
  // 1단계: Serial을 시작합니다. 이후 어느 단계에서 멈췄는지 확인하는 데 사용합니다.
  Serial.begin(115200);
  delay(500);
  Serial.println("Showcase: Hello -> English agenda -> portrait");

  // 2단계: Frame buffer를 할당하고 SPI를 초기화한 다음 패널을 reset 및 초기화합니다.
  if (!epd.begin()) {
    Serial.println("Init failed: check 3V3, GND, wiring and BUSY.");
    return;
  }

  // 3단계: 3개 화면을 한 번씩 재생합니다. 한 화면이라도 실패하면 멈추고 다음 refresh를 진행하지 않습니다.
  for (uint8_t i = 0; i < 3; i++) {
    if (!showScreen(i)) {
      Serial.println("Refresh failed; stopped. Check wiring and BUSY.");
      return;
    }
    if (i < 2) delay(HOLD_MS);   // Refresh 완료 후 유지 시간이며 화면 전환 주기가 아닙니다
  }
  Serial.println("Done. Last picture stays on screen.");
}

void loop() {
  // 한 번만 재생합니다. 시간표는 위의 subjects / rooms / times를 수정하세요.
}

// 4단계: 크기나 길이가 잘못된 사진 frame을 컴파일 시점에 차단합니다.
static_assert(PHOTO_DRIVER_W == 480 && PHOTO_DRIVER_H == 720,
              "Photo must be 480x720");
static_assert(PHOTO_DRIVER_BYTES == EPD037A02_BUF_BYTES,
              "Photo must be 172800 bytes");
```

### 패널 드라이버 interface EPD037A02_GFX.h

```cpp
/*
 * EPD037A02_GFX — Adafruit_GFX용 패널 드라이버 클래스
 * OSPTEK 3.7" E6 전자종이, 480×720, 6색(JD7601 / IST7601 / IST7163)
 *
 * 패널 계층은 직접 작성하고 graphics 계층은 Adafruit_GFX를 그대로 상속합니다.
 * 따라서 drawLine, fillCircle, setFont, print를 기존 구현 그대로 사용할 수 있습니다.
 *
 * MIT / CC BY 4.0, 저장소의 다른 자료와 동일합니다.
 */

#ifndef EPD037A02_GFX_H
#define EPD037A02_GFX_H

#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>

/* ------------------------------ 패널 상수 ------------------------------- */

#define EPD037A02_WIDTH    480
#define EPD037A02_HEIGHT   720
#define EPD037A02_BUF_BYTES ((size_t)EPD037A02_WIDTH * EPD037A02_HEIGHT / 2) /* 172800 */

// 1 byte에 같은 열의 인접한 pixel 2개를 저장합니다. 실기에서 1~2 px 어긋나면 1로 변경하세요.
#ifndef EPD037A02_SWAP_NIBBLE
#define EPD037A02_SWAP_NIBBLE 0
#endif

// JD7601의 4 bit 색상 값입니다. 0x4는 유효하지 않으므로 0~5의 연속 번호로 지정하지 마세요.
enum EPDColor : uint8_t {
  EPD_BLACK  = 0x0,
  EPD_WHITE  = 0x1,
  EPD_YELLOW = 0x2,
  EPD_RED    = 0x3,
  EPD_BLUE   = 0x5,
  EPD_GREEN  = 0x6,
};

/* ------------------------------- 드라이버 클래스 -------------------------------- */
/*
 * 사용법:
 *   EPD037A02_GFX display(10, 9, 8, 7);    // cs, dc, rst, busy
 *   display.begin();                       // Frame buffer 할당 + reset + INIT
 *   display.setRotation(0);                // 0/2 = 480×720, 1/3 = 720×480
 *   display.fillScreen(EPD_WHITE);
 *   display.setFont(&FreeSansBold24pt7b);
 *   display.setCursor(20, 120);  display.print("Hello");
 *   display.display();                     // 화면 전송 + 전체 refresh(15~25 s)
 *
 * 색상은 4 bit indexed color로 6색뿐이며 RGB565가 아닙니다.
 * 16 bit 색상 값을 전달해도 컴파일되지만 하위 4 bit만 사용되므로 의미 있는 결과가 되지 않습니다.
 */
class EPD037A02_GFX : public Adafruit_GFX {
 public:
  EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                int8_t sck = -1, int8_t mosi = -1, SPIClass *spi = &SPI);
  ~EPD037A02_GFX();

  // Frame buffer를 할당하고 GPIO/SPI를 초기화한 다음 패널을 reset 및 초기화합니다.
  // 메모리가 부족하거나 BUSY 응답이 없으면 false를 반환하며 화면은 그대로 유지됩니다.
  bool begin(uint32_t spi_hz = 2000000);

  // Frame buffer를 화면으로 전송하고 전체 refresh합니다. 15~25 s 동안 blocking되며 BUSY timeout 시 false를 반환합니다.
  bool display();

  // Packing된 480×720 native frame을 직접 전송하며 사진용 frame buffer를 추가로 할당하지 않습니다.
  bool displayRawFrame(const uint8_t *frame, size_t bytes);

  // 패널 deep sleep. 깨우려면 전원을 다시 넣거나 RST를 조작한 후 begin()을 다시 실행해야 합니다.
  bool sleep();

  // Frame buffer만 지우고 즉시 화면을 갱신하지 않습니다. 컬러 화면에 잔상이 있으면 clear() 후 display()로 흰 화면을 한 번 갱신할 수 있습니다.
  void clear(uint16_t color = EPD_WHITE);

  // drawPixel은 Adafruit_GFX에서 구현해야 하는 pure virtual function입니다. fillScreen은 memset으로 재작성해 더 빠릅니다.
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void fillScreen(uint16_t color) override;

  // RGB를 가장 가까운 6색 중 하나로 quantize합니다. 간단한 이미지를 그릴 때 사용할 수 있습니다.
  static uint8_t fromRGB(uint8_t r, uint8_t g, uint8_t b);

  uint8_t *buffer() const { return _buf; }
  bool ready() const { return _buf != nullptr; }
  uint32_t lastRefreshMs() const { return _lastRefreshMs; }
  void setVerbose(bool v) { _verbose = v; }

 private:
  int8_t _cs, _dc, _rst, _busy, _sck, _mosi;
  SPIClass *_spi;
  uint32_t _spiHz;
  uint8_t *_buf;
  uint32_t _lastRefreshMs;
  bool _verbose;

  void _alloc();
  void _spiSend(const uint8_t *buf, size_t len);
  void _cmd(uint8_t c);
  void _data(uint8_t d);
  void _dataBuf(const uint8_t *buf, size_t len);
  bool _waitBusy(const char *what, uint32_t timeout_ms = 60000);
  bool _reset();
  bool _initPanel();
};

#endif /* EPD037A02_GFX_H */
```

### 패널 드라이버 구현 EPD037A02_GFX.cpp

```cpp
/*
 * EPD037A02_GFX.cpp — 패널 계층: SPI, timing, frame format
 * 이 계층은 byte 전송, BUSY 대기, (x,y)를 frame buffer index로 변환하는 세 가지만 담당합니다.
 * Graphics, font, rotation은 Adafruit_GFX에 맡깁니다.
 */

#include "EPD037A02_GFX.h"

#include <string.h>
#include <pgmspace.h>

#if defined(ESP32)
#include <esp32-hal-psram.h>
#endif

namespace {
// 1 byte에 pixel 2개가 들어가므로 720 pixel 세로 한 줄은 360 byte입니다.
const size_t kColBytes  = EPD037A02_HEIGHT / 2;
const size_t kChunk     = 2048;    // SPI 1회 전송 상한, 제조사 예제와 동일
const uint32_t kBusyTmo = 60000;   // 전체 refresh는 최대 25 s이므로 여유를 둠
}  // namespace

EPD037A02_GFX::EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                             int8_t sck, int8_t mosi, SPIClass *spi)
    : Adafruit_GFX(EPD037A02_WIDTH, EPD037A02_HEIGHT),
      _cs(cs), _dc(dc), _rst(rst), _busy(busy), _sck(sck), _mosi(mosi),
      _spi(spi), _spiHz(2000000), _buf(nullptr), _lastRefreshMs(0),
      _verbose(true) {}

EPD037A02_GFX::~EPD037A02_GFX() {
  if (_buf) {
    free(_buf);   // ps_malloc으로 할당한 메모리도 free()로 해제합니다
    _buf = nullptr;
  }
}

/* ============================ 메모리 / 초기화 ============================ */

void EPD037A02_GFX::_alloc() {
  if (_buf) return;
#if defined(ESP32)
  if (psramFound()) _buf = (uint8_t *)ps_malloc(EPD037A02_BUF_BYTES);
#endif
  if (!_buf) _buf = (uint8_t *)malloc(EPD037A02_BUF_BYTES);
}

bool EPD037A02_GFX::begin(uint32_t spi_hz) {
  // 1단계: 172800 byte frame buffer를 할당하고 먼저 흰색으로 채웁니다.
  _spiHz = spi_hz;
  _alloc();
  if (!_buf) {
    if (_verbose) {
      Serial.printf("[EPD] frame buffer allocation failed, %u bytes needed\n",
                    (unsigned)EPD037A02_BUF_BYTES);
    }
    return false;
  }

  // malloc은 0으로 초기화하지 않습니다. 초기화되지 않은 메모리가 화면에 표시되지 않도록 먼저 흰색으로 채웁니다.
  clear(EPD_WHITE);

  // 2단계: Pin을 설정합니다. CS는 수동 제어하며 MISO는 연결하지 않습니다.
  pinMode(_cs, OUTPUT);   digitalWrite(_cs, HIGH);
  pinMode(_dc, OUTPUT);   digitalWrite(_dc, HIGH);
  pinMode(_rst, OUTPUT);  digitalWrite(_rst, HIGH);
  pinMode(_busy, INPUT);

  // 인자 순서는 SCK, MISO, MOSI, SS입니다. SS에는 -1을 전달하고 CS를 peripheral에 맡기지 마세요.
  _spi->begin(_sck, -1, _mosi, -1);

  if (_verbose) {
    Serial.printf("[EPD] Frame buffer %u B, SPI %lu Hz\n",
                  (unsigned)EPD037A02_BUF_BYTES, (unsigned long)_spiHz);
  }

  // 3단계: 패널을 reset하고 초기화 command를 전송합니다.
  return _initPanel();
}

bool EPD037A02_GFX::_initPanel() {
  if (!_reset()) return false;

  _cmd(0xE9); _data(0x01);   // 제조사 INIT: JD7601 초기화 command

  if (_verbose) Serial.println("[EPD] Panel initialization complete");
  return true;
}

/* ============================== Low-level SPI =============================== */

void EPD037A02_GFX::_spiSend(const uint8_t *buf, size_t len) {
  digitalWrite(_cs, LOW);
  _spi->beginTransaction(SPISettings(_spiHz, MSBFIRST, SPI_MODE0));
  _spi->writeBytes(buf, len);
  _spi->endTransaction();
  digitalWrite(_cs, HIGH);
}

void EPD037A02_GFX::_cmd(uint8_t c) {
  digitalWrite(_dc, LOW);    // DC=L: command
  _spiSend(&c, 1);
}

void EPD037A02_GFX::_data(uint8_t d) {
  digitalWrite(_dc, HIGH);   // DC=H: data
  _spiSend(&d, 1);
}

void EPD037A02_GFX::_dataBuf(const uint8_t *buf, size_t len) {
  digitalWrite(_dc, HIGH);
  while (len) {
    size_t n = (len > kChunk) ? kChunk : len;
    _spiSend(buf, n);
    buf += n;
    len -= n;
  }
}

// BUSY High = idle, Low = busy. Datasheet Note 6-4 본문은 반대로 되어 있으므로 pin 표와 실측을 따릅니다.
bool EPD037A02_GFX::_waitBusy(const char *what, uint32_t timeout_ms) {
  uint32_t t0 = millis();
  while (digitalRead(_busy) == LOW) {
    if (millis() - t0 > timeout_ms) {
      if (_verbose) Serial.printf("[EPD] BUSY timeout: %s\n", what);
      return false;
    }
    delay(2);
  }
  return true;
}

// 제조사 RESET timing: Low 20 → High 10 → Low 20 → High 10 ms 후 BUSY를 기다립니다.
bool EPD037A02_GFX::_reset() {
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);

  if (digitalRead(_busy) == LOW) {
    if (_verbose) Serial.println("[EPD] Waiting for BUSY to go high (max 10 s); on timeout check 3V3 / GND / flat cable");
    if (!_waitBusy("reset", 10000)) return false;
  }
  delay(10);
  return true;
}

/* ============================== 화면 갱신 절차 =============================== */

bool EPD037A02_GFX::display() {
  if (!_buf) return false;
  uint32_t t0 = millis();

  _cmd(0x10);                             // DTM: RAM 쓰기 준비
  if (!_waitBusy("DTM")) return false;
  _dataBuf(_buf, EPD037A02_BUF_BYTES);

  _cmd(0x04);                             // PON: 고전압 켜기
  if (!_waitBusy("PON")) return false;
  delay(10);

  _cmd(0x12); _data(0x00);                // DRF: refresh 시작
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;

  _cmd(0x02); _data(0x00);                // POF: 고전압 끄기
  if (!_waitBusy("POF")) return false;
  delay(20);

  _lastRefreshMs = millis() - t0;
  if (_verbose) Serial.printf("[EPD] Refresh complete %lu ms\n", (unsigned long)_lastRefreshMs);
  return true;
}

bool EPD037A02_GFX::displayRawFrame(const uint8_t *frame, size_t bytes) {
  if (!frame || bytes != EPD037A02_BUF_BYTES) return false;

  _cmd(0x10);
  if (!_waitBusy("DTM")) return false;

  // Flash에서 RAM으로 2048 byte씩 옮긴 후 SPI로 전송합니다. DMA가 Flash를 직접 읽지 않도록 합니다.
  uint8_t chunk[kChunk];
  digitalWrite(_dc, HIGH);
  for (size_t off = 0; off < bytes; off += sizeof(chunk)) {
    size_t n = bytes - off;
    if (n > sizeof(chunk)) n = sizeof(chunk);
    memcpy_P(chunk, frame + off, n);
    _spiSend(chunk, n);
  }

  _cmd(0x04);
  if (!_waitBusy("PON")) return false;
  delay(10);
  _cmd(0x12); _data(0x00);
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;
  _cmd(0x02); _data(0x00);
  if (!_waitBusy("POF")) return false;
  delay(20);
  return true;
}

bool EPD037A02_GFX::sleep() {
  _cmd(0x07); _data(0xA5);
  if (_verbose) Serial.println("[EPD] Deep sleep entered");
  return true;
}

/* ================================ Drawing ================================= */

void EPD037A02_GFX::clear(uint16_t color) {
  if (!_buf) return;
  uint8_t c = (uint8_t)(color & 0x0F);
  memset(_buf, (int)((c << 4) | c), EPD037A02_BUF_BYTES);
}

void EPD037A02_GFX::fillScreen(uint16_t color) { clear(color); }

void EPD037A02_GFX::drawPixel(int16_t x, int16_t y, uint16_t color) {
  if (!_buf) return;
  if (x < 0 || y < 0 || x >= _width || y >= _height) return;

  // 먼저 rotation의 영향을 받는 논리 좌표를 패널의 자연 좌표로 변환합니다.
  int16_t dx, dy;
  switch (rotation & 3) {
    case 0:  dx = x;                 dy = y;                 break;
    case 1:  dx = WIDTH - 1 - y;     dy = x;                 break;
    case 2:  dx = WIDTH - 1 - x;     dy = HEIGHT - 1 - y;    break;
    default: dx = y;                 dy = HEIGHT - 1 - x;    break;
  }

  // 패널은 세로 열 단위로 데이터를 받고 각 열을 아래에서 위로 scan하므로 Y mirror도 필요합니다.
  // 일반적인 가로 row-major 방식으로 쓰면 화면이 90° 회전하고 어긋난 채 반복됩니다.
  const int16_t fy = HEIGHT - 1 - dy;
  size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);

#if EPD037A02_SWAP_NIBBLE
  const bool lowNibble = ((fy & 1) == 0);
#else
  const bool lowNibble = ((fy & 1) != 0);
#endif

  // 1 byte를 두 nibble로 나누고 대상 pixel이 있는 쪽만 변경합니다.
  const uint8_t c = (uint8_t)(color & 0x0F);
  if (lowNibble) _buf[i] = (uint8_t)((_buf[i] & 0xF0) | c);
  else           _buf[i] = (uint8_t)((_buf[i] & 0x0F) | (c << 4));
}

/* ============================ RGB → 6색 quantization =========================== */

struct EPDRgbRef { uint8_t r, g, b, code; };

// Reference color는 Spectra 6 / E6의 일반적인 발색에서 가져왔으며, 육안에 가깝도록 약간 어둡게 설정했습니다.
static const EPDRgbRef kRefs[6] = {
    {  0,   0,   0, EPD_BLACK  },
    {255, 255, 255, EPD_WHITE  },
    {255, 232,   0, EPD_YELLOW },
    {190,  30,  45, EPD_RED    },
    { 35,  70, 150, EPD_BLUE   },
    { 40, 110,  60, EPD_GREEN  },
};

uint8_t EPD037A02_GFX::fromRGB(uint8_t r, uint8_t g, uint8_t b) {
  // Weighted Euclidean distance를 사용하며 녹색의 weight를 높였습니다.
  int32_t best = INT32_MAX;
  uint8_t code = EPD_BLACK;
  for (int k = 0; k < 6; k++) {
    int32_t dr = (int32_t)r - kRefs[k].r;
    int32_t dg = (int32_t)g - kRefs[k].g;
    int32_t db = (int32_t)b - kRefs[k].b;
    int32_t d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < best) { best = d; code = kRefs[k].code; }
  }
  return code;
}
```

### 코드 설명

**Pixel 저장 방식.** 가장 실수하기 쉬운 부분은 `drawPixel()`입니다. 화면은 480×720이고 pixel당 4 bit이므로 한 frame은 480×720÷2 = 172800 byte입니다.

일반적인 화면처럼 row 단위로 쓰는 것과 달리, 이 패널은 세로 열 단위로 데이터를 받습니다. 총 480열이고 각 열은 360 byte이며, 열 안에서도 아래에서 위로 scan합니다. 따라서 코드에서 먼저 Y mirror인 `fy = HEIGHT-1-dy`를 수행한 다음 `i = dx*360 + (fy>>1)`로 byte 위치를 계산합니다.

**Color encoding.** 6색의 code는 연속적이지 않습니다. 검정, 흰색, 노랑, 빨강은 `0x0~0x3`, 파랑과 초록은 `0x5`, `0x6`이며 `0x4`는 유효하지 않습니다. 그림을 그릴 때는 `EPD_BLACK` 같은 enum을 사용하고 번호를 직접 넣지 마세요.

**3화면 refresh 방법.** `setup()`의 `for` loop가 세 번 실행됩니다. 처음 두 화면은 frame buffer에 그린 다음 `display()`를 호출해 전송하고 refresh합니다. 세 번째 화면은 `displayRawFrame()`을 호출해 `photo_data.h`의 데이터를 2048 byte씩 Flash에서 RAM으로 옮긴 후 SPI로 전송합니다.

**메모리.** 사진 화면은 frame buffer를 사용하지 않지만 처음 두 화면에서 필요하므로 프로그램에는 항상 172800 byte의 frame buffer가 필요합니다. PSRAM이 있으면 우선 사용하고, 없거나 할당에 실패하면 남부 RAM을 사용합니다.

**유지 시간.** 각 화면의 refresh에는 15~25초가 걸리며 `HOLD_MS`는 refresh가 끝난 후 추가로 기다리는 시간입니다. 따라서 처음 두 화면 사이의 실제 간격은 refresh 시간에 3초를 더한 값입니다. 프로그램은 loop 재생을 하지 않으므로 다시 재생하려면 RESET을 눌러 개발 보드를 reset하세요.

**시간표 변경.** `subjects`, `rooms`, `times` 세 배열을 수정하며, 여섯 행이 서로 일대일로 대응합니다. `bars`는 각 행 왼쪽 컬러 바의 색상입니다. 강조되는 '현재 수업'은 세 번째 행(`i == 2`)으로 고정되어 있습니다. 제목 날짜, `WEEK 12`, 하단의 `NEXT 11:05 PHYSICS`는 모두 hardcode된 텍스트입니다. 예제는 clock을 읽지 않으며 자동으로 업데이트되지도 않습니다.

### 사진을 패널 데이터로 변환하는 방법

사진은 개발 보드에서 처리하지 않습니다. PC에서 먼저 6색 dot data로 변환하고, ESP32-S3는 변환된 데이터를 화면으로 전송하기만 합니다.

```text
JPG/PNG → 중앙 crop 및 480×720 resize
→ 노출, contrast, saturation 조정 → 6색 dithering → 패널 color value로 변환
→ 세로 열 순서로 배열하고 Y mirror 후 pixel 2개를 1 byte로 결합
→ 172800 byte 배열(photo_data.h) → Flash에 컴파일
→ ESP32-S3가 SPI로 화면에 전송
```

Dithering은 서로 다른 색의 pixel을 교차 배치해 눈이 dot 집합을 중간색으로 인식하게 하는 기법입니다. 색상 수가 늘어나는 것은 아니며, 변환 후에도 각 pixel은 검정, 흰색, 노랑, 빨강, 파랑, 초록 중 하나입니다. 변환 스크립트는 전자종이에서 실제로 보이는 색(약간 어두운 색)을 기준으로 color distance를 계산하지만, 출력은 패널의 color value입니다.

Pixel 배열 방식과 color encoding은 앞의 'Pixel 저장 방식'과 'Color encoding'에서 설명했으며, 스크립트도 같은 규칙으로 packing합니다. 따라서 생성된 데이터를 패널에 바로 볼 수 있고 개발 보드에서 JPG를 decode하거나 dithering을 계산할 필요가 없습니다.

### 사진 바꾸기

아래 command가 `photo_data.h`를 덮어쓰므로 먼저 원본을 백업하세요. PC에는 Python 3, Pillow, numpy가 필요합니다(`pip install pillow numpy`). 예제를 실행하기만 한다면 설치할 필요가 없습니다.

예제 폴에서 다음을 실행합니다.

```bash
cd EPD_3in7_Showcase_JD7601
python3 tool/epd_photo.py 내사진.jpg --header photo_data.h --header-name photo_driver
```

- 배열 이름은 `photo_driver`로 유지해야 합니다. 스크립트는 이를 바탕으로 `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H`, `PHOTO_DRIVER_BYTES`를 생성하며, 메인 프로그램 끝의 `static_assert`에서 사용합니다.
- 기본값은 중앙을 480×720으로 crop하는 방식입니다. 가장자리를 잘라내고 싶지 않다면 `--fit contain`(여백 추가) 또는 `--fit stretch`(늘려서 변형)를 추가할 수 있습니다.
- 출력은 항상 480×720, 172800 byte입니다. 생성 후 다시 컴파일하고 업로드하면 되며 file system을 업로드할 필요는 없습니다.

## 문제 해결

### 컴파일 시 undefined reference to EPD037A02_GFX 오류

증상: Link 단계에서 `begin()`, `display()` 등의 function을 찾지 못합니다.

원인: `EPD037A02_GFX.cpp`가 컴파일되지 않았습니다. Arduino는 sketch root directory와 `src/` subdirectory의 `.cpp`만 컴파일하며 `driver/` 같은 다른 subdirectory에 있는 파일은 컴파일하지 않습니다.

해결: 메인 `.ino`, 드라이버 `.h`와 `.cpp`를 같은 directory에 두고 예제를 다시 연 다음 다시 컴파일합니다.

### Serial Monitor에 출력이 없음

증상: 업로드는 완료됐지만 Serial이 비어 있습니다.

원인: Baud rate가 잘못됐거나, onboard USB port 사용 시 USB CDC를 활성화하지 않았거나, Monitor를 너무 늦게 열어 프로그램 출력이 이미 끝났을 수 있습니다.

해결: Baud rate를 115200으로 설정하고 올바른 port를 선택했는지 확인합니다. Onboard USB port를 사용할 때는 Arduino IDE에서 `USB CDC On Boot`를 `Enabled`로 설정하고 다시 업로드합니다. 개발 보드 안내에 따라 UART port를 사용할 수도 있습니다. 마지막으로 RESET을 눌러 프로그램을 다시 실행하세요.

### Serial 출력은 있지만 화면이 계속 흰색임

증상: 프로그램은 실행되지만 화면에 그림이 없습니다.

원인: 흔한 원인은 SDA와 CLK의 역접속, CS 또는 DC의 잘못된 연결이며 GND가 공통으로 연결되지 않았을 수도 있습니다.

해결: 전원을 끈 후 8개 선을 하나씩 확인합니다. VDD가 3.3 V인지 측정하고 GND의 continuity도 점검합니다. 또한 드라이버에서 `SPI.begin()`의 네 번째 인자는 반드시 `-1`이어야 하며, CS는 `_spiSend()`가 수동으로 Low와 High를 전환합니다.

### Serial에 reset 단계 BUSY timeout 표시

증상: 로그가 'BUSY High 대기 중'에서 멈춘 후 `reset` timeout이 발생하고 마지막에 `Init failed`가 출력됩니다.

원인: BUSY가 계속 Low 상태입니다. 화면에 전원이 공급되지 않았거나 BUSY 선이 잘못 연결됐거나 접촉이 불량일 수 있고, 플랫 케이블 접촉 불량일 수도 있습니다.

해결: VDD가 3.3 V에 연결됐는지, 플랫 케이블이 끝까지 삽입됐는지, BUSY가 GPIO7에 연결됐는지 확인합니다. Refresh 코드를 수정하기 전에 이 항목부터 점검하세요. 수정 후 전원을 다시 넣고 업로드합니다.

### DRF 단계 timeout 또는 화면 일부 깨짐

증상: 초기화는 정상이지만 refresh 중 timeout이 발생하거나 화면 일부가 비정상입니다.

일반적인 원인: 공급 전류 부족, 지나치게 긴 점퍼 와이어, 너무 높은 SPI 속도입니다.

해결: 점퍼 와이어를 짧게 하고 GND 접촉을 확인한 뒤 전원 공급이 안정적인 USB port나 전원으로 바꿉니다. SPI 속도는 기본값인 2 MHz로 유지하세요. `epd.begin()`의 인자를 변경했다면 인자를 삭제해 기본값으로 복원합니다.

### 화면이 90° 회전하고 약 세 단으로 어긋나 반복됨

증상: 텍스트와 컬러 블록은 알아볼 수 있지만 방향이 틀리고 어긋나면서 반복됩니다.

원인: Frame data가 row 순서로 배엸됐지만 패널은 실제로 세로 열 단위로 받습니다. 이 글의 드라이버를 사용하면 발생하지 않아야 하며, 드라이버를 직접 수정했거나 구버전 드라이버를 사용할 때 주로 나타납니다.

해결: `drawPixel()`에 `size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);`가 있는지, `kColBytes = EPD037A02_HEIGHT / 2` 즉 360인지 확인합니다.

### 반복은 없지만 화면이 상하 반전됨

증상: 글자 순서는 뒤집히지 않았지만 전체 화면이 상하로 뒤집힙니다.

원인: 패널은 각 열을 아래에서 위로 scan하지만 코드에 Y mirror가 없습니다.

해결: `drawPixel()`에 `const int16_t fy = HEIGHT - 1 - dy;`가 있고 이후 address와 nibble 판정에도 모두 `fy`를 사용하는지 확인합니다. Byte 순서만 뒤집지 마세요.

### 가는 선이 어긋나고 획이 빗살처럼 보임

증상: 전체 위치는 맞지만 인접 pixel이 1~2 px 어긋납니다.

원인: 1 byte 안의 High/Low nibble 순서가 반대일 수 있습니다.

해결: `EPD037A02_GFX.h`에서 `EPD037A02_SWAP_NIBBLE`을 `0`에서 `1`로 변경합니다. Byte 안의 pixel 2개 순서만 바꾸며 전체 화면 mirror는 처리하지 않습니다.

### 컴파일 시 Photo must be 480x720 또는 Photo must be 172800 bytes 오류

증상: 두 `static_assert` 중 하나가 발생합니다.

원인: 교체한 `photo_data.h`가 480×720이 아니거나 frame 길이가 172800 byte가 아닙니다.

해결: 위의 변환 command로 다시 생성하고 `--header-name photo_driver`를 유지합니다. `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H`, `PHOTO_DRIVER_BYTES`가 각각 480, 720, 172800인지도 확인하세요.

## FAQ

**EPD037A02를 다른 pin에 연결할 수 있나요?**

가능합니다. 배선과 `EPD037A02_GFX epd(10, 9, 8, 7, 12, 11)`를 함께 수정하세요. 인자 순서는 CS, DC, RST, BUSY, SCK, MOSI입니다. ESP32-S3에서는 GPIO0, 45, 46(boot 관련), GPIO19, 20(USB), GPIO26~37(Flash/PSRAM 사용)을 피하는 것이 좋으며, 사용하는 개발 보드의 schematic도 확인해야 합니다. 필자는 GPIO7~12 조합으로만 컴파일했으며 다른 pin은 테스트하지 않았습니다.

**SPI 속도는 얼마이며 8 MHz로 바꿀 수 있나요?**

이 예제의 기본값은 2 MHz, Mode 0, MSB first입니다. 속도를 높이려면 `epd.begin()`의 인자를 `epd.begin(4000000)`처럼 변경하면 되며 4 MHz부터 시험하는 것을 권장합니다. Noise나 화면 깨짐이 생기면 2 MHz로 되돌리세요. 이 3화면 예제에서 8 MHz는 테스트하지 않았습니다.

**5 V로 전원을 공급할 수 있나요? Refresh 시 전류는 얼마인가요?**

안 됩니다. VDD는 3.3 V만 연결해야 하며 GND는 개발 보드와 공통으로 연결해야 합니다. Refresh할 때 step-up 회로의 부하가 커지므로 점퍼 와이어를 짧게 하고 전원을 안정적으로 공급해야 합니다. Refresh peak current는 측정하지 않았으므로 예상값을 제시하지 않습니다.

**RAM과 Flash를 얼마나 사용하나요? CPU를 모두 점유하나요?**

이번 컴파일 결과는 Flash 525724 byte(40%), global variable 23576 byte(7%)입니다. 실행 중에는 172800 byte frame buffer를 추가로 할당하며 사진 전송 시 2048 byte temporary buffer도 사용합니다. Refresh는 blocking 방식이므로 그동안 `loop()`에서 다른 작업을 할 수 없습니다. 엄격한 timing이 필요한 작업은 배치하지 마세요. CPU 사용률은 측정하지 않았습니다.

**GxEPD2나 일반 ESP32를 사용할 수 있나요?**

필자가 확인한 GxEPD2 1.6.9에는 이 480×720, JD7601 6색 패널용 드라이버 클래스가 없어 바로 적용할 수 없습니다. 일반 ESP32로는 이론적으로 porting할 수 있지만 SPI와 PSRAM 관련 platform code를 수정하고 RAM에 172800 byte frame buffer가 들어가는지 확인해야 합니다. 다른 MCU에서는 테스트하지 않았습니다.

**화면에 전혀 표시되지 않을 때 어떤 선부터 확인해야 하나요?**

먼저 VDD가 3.3 V인지 측정한 다음 GND, BUSY, CS, DC, SDA, CLK를 확인합니다. Serial은 115200으로 설정하세요. `reset`이나 `DRF` timeout이 나타나면 위의 해당 항목대로 처리합니다. Serial 출력이 전혀 없다면 frame format을 바꾸기 전에 port와 USB CDC 설정을 먼저 점검하세요.

**중국어나 JPG를 바로 표시할 수 있나요?**

안 됩니다. UI는 GFX 내장 5×7 font를 사용하며 예제 텍스트는 모두 영어이고 중국어 font는 없습니다. JPG도 바로 전송할 수 없으므로 먼저 480×720, 172800 byte 패널 frame으로 변환해야 합니다. 예제에 포함된 `photo_data.h`는 이미 변환돼 있으며 이미지 변경 방법은 위의 '사진 바꾸기'를 참고하세요.

**왜 한 번만 재생하고 멈추나요? 전원을 꺼도 사진이 남아 있나요?**

예제는 한 번만 재생하도록 만들어졌고 `loop()`가 비어 있어 마지막 사진에서 멈춥니다. 전자종이는 전원을 꺼도 화면이 유지됩니다. 다시 재생하려면 RESET을 누르세요. 자동으로 loop 재생하려면 trigger logic을 직접 추가해야 합니다. 연속 재생 간격은 테스트하지 않았습니다.

## 응용 아이디어

- Hardcode된 시간표를 Serial 입력으로 바꾸고 layout을 확인한 후 실제 데이터에 연결합니다.
- Button을 추가해 Hello, 시간표, 사진 사이를 수동으로 전환합니다.
- RTC를 추가해 제목 날짜와 '현재 수업'을 자동으로 업데이트합니다.
- 여러 사진을 LittleFS나 SD card에 저장해 button으로 페이지를 넘기는 digital photo frame을 만듭니다.

## 참고 자료

- [이 글의 예제 소스 코드(GitHub)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601): 3화면 예제의 전체 파일과 사진 변환 스크립트.

- [Espressif ESP32-S3 공식 제품 페이지](https://www.espressif.com/en/products/socs/esp32-s3): 메인 MCU 정보.

- [Espressif ESP32-S3 공식 datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf): GPIO, SPI 및 전기적 특성.

- [Adafruit GFX Library GitHub](https://github.com/adafruit/Adafruit-GFX-Library): 텍스트와 graphics interface.

- [Adafruit BusIO GitHub](https://github.com/adafruit/Adafruit_BusIO): Adafruit GFX의 의존 라이브러리.

- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32): Arduino core와 SPI 지원.

- [Adafruit GFX font 설명](https://learn.adafruit.com/adafruit-gfx-graphics-library/using-fonts): 내장 font와 FreeFont 사용법.

- [제조사 오픈 소스 자료 및 예제](https://gitee.com/osptek/display-epd-3.7inch-480x720): Datasheet, schematic 및 제조사 예제.
