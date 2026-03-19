---
title: "ESP32로 8비트 병렬 버스로 ILI9341 스크린 구동하기"
boardId: esp32
moduleId: display/ili9341
category: esp32
date: 2026-02-27
intro: "ESP32를 사용하여 8비트 병렬 버스(8-bit Parallel)로 ILI9341 스크린을 구동하는 방법을 자세히 설명합니다. 일반적인 SPI 직렬 드라이버에 비해 매우 높은 리프레시율을 제공하여 동적인 화면 표시에 적합합니다."
image: "https://img.lingshunlab.com/image-20260204140130062.png"
---

이 문서에서는 ESP32를 사용하여 **8비트 병렬 버스(8-bit Parallel)**로 ILI9341 스크린을 구동하는 방법을 자세히 설명합니다. 일반적인 SPI 직렬 드라이버에 비해 병렬 모드는 매우 높은 리프레시율을 제공하며, 동적인 화면 표시에 매우 적합합니다.

## 개발 환경

OS: MacOS

Arduino IDE Version: 2.3.7

esp32 Version: 3.3.5

TFT_eSPI Version: 2.5.43



## BOM

ESP32 x1

2.4 inch TFT 디스플레이 x1

듀폰 케이블 xN



## 배선 방식

| TFT Pin          | **ESP32 Pin** | **기능 설명**                     |
| ---------------- | ------------- | -------------------------------- |
| **VCC (3V3/5V)** | **3V3 / VIN** | 스크린 전원 공급 (먼저 3.3V 시도 권장)         |
| **GND**          | **GND**       | 공통 접지                             |
| **LCD_D0**       | **GPIO 26**   | 데이터 비트 0                         |
| **LCD_D1**       | **GPIO 25**   | 데이터 비트 1                         |
| **LCD_D2**       | **GPIO 19**   | 데이터 비트 2                         |
| **LCD_D3**       | **GPIO 18**   | 데이터 비트 3                         |
| **LCD_D4**       | **GPIO 5**    | 데이터 비트 4                         |
| **LCD_D5**       | **GPIO 21**   | 데이터 비트 5                         |
| **LCD_D6**       | **GPIO 22**   | 데이터 비트 6                         |
| **LCD_D7**       | **GPIO 23**   | 데이터 비트 7                         |
| **LCD_CS**       | **GPIO 32**   | 칩 선택 (Chip Select)               |
| **LCD_RST**      | **GPIO 33**   | 리셋 (Reset)                     |
| **LCD_RS (DC)**  | **GPIO 14**   | 데이터/명령 전환 (Register Select)  |
| **LCD_WR**       | **GPIO 27**   | 쓰기 가능 (Write Control)           |
| **LCD_RD**       | **GPIO 2**    | 읽기 가능 (ID 읽기가 필요 없으면 3.3V 연결 가능) |




## 필수 설치 라이브러리

### Arduino IDE Boards Manager：esp32

에스프레시프(Espressif Systems)에서 제공하는 esp32 라이브러리를 설치해야 하며, 여기서는 최신 버전을 설치합니다.

### Arduino IDE Library Manager：TFT_eSPI

TFT_eSPI 라이브러리를 설치해야 합니다.



## TFT_eSPI 설정「User_Setup.h」파일

TFT_eSPI는 ESP32용 스크린 드라이버의 마법사(Magician)와도 같지만, 이 라이브러리의 핀 정의, 보드 정의, 스크린 정의는 이 User_Setup.h 파일에서 정의되므로, 이 파일을 수정하는 것이 매우 중요합니다.

이 파일의 위치는 다음과 같습니다:

Documents > Arduino > libraries > TFT_eSPI > User_Setup.h

**동작:** 파일을 열고, 원래 내용을 삭제한 후, 아래 코드를 복사하여 저장하세요:

```c++
// =========================================================================
//   User_Setup.h - Display driver configuration file for TFT_eSPI library
//   User_Setup.h - TFT_eSPI 라이브러리용 디스플레이 드라이버 설정 파일
//
//   Hardware: ESP32 (No PSRAM or not using GPIO 16/17)
//   하드웨어: ESP32 (PSRAM 없음 또는 GPIO 16/17 사용 안함)
//
//   Driver: ILI9341 (8-bit parallel mode)
//   드라이버: ILI9341 (8비트 병렬 모드)
// =========================================================================

// -------------------------------------------------------------------------
// 1. 드라이버 유형 정의 (Driver Type Definition)
// -------------------------------------------------------------------------
#define ILI9341_DRIVER       // Generic ILI9341 Driver (일반 ILI9341 드라이버)

// -------------------------------------------------------------------------
// 2. 색상 순서 정의 (Color Order Definition)
// -------------------------------------------------------------------------
// If colors are inverted (e.g., red becomes blue), change this.
// 색상이 반전되었다면(예: 빨간색이 파란색이 됨), 이 항목을 변경하세요.
#define TFT_RGB_ORDER TFT_BGR  // Most ILI9341 screens use BGR order (대부분의 ILI9341 스크린은 BGR 순서 사용)
// #define TFT_RGB_ORDER TFT_RGB

// -------------------------------------------------------------------------
// 3. 화면 해상도 (Screen Resolution)
// -------------------------------------------------------------------------
#define TFT_WIDTH  240
#define TFT_HEIGHT 320

// -------------------------------------------------------------------------
// 4. 인터페이스 설정 (Interface Configuration - Critical)
// -------------------------------------------------------------------------
#define ESP32_PARALLEL       // Enable ESP32 parallel mode (ESP32 병렬 모드 활성화)
#define TFT_PARALLEL_8_BIT   // Use 8-bit parallel bus (8비트 병렬 버스 사용)

// -------------------------------------------------------------------------
// 5. 핀 정의 (Pin Definitions)
// -------------------------------------------------------------------------

// --- 제어 핀 (Control Pins) ---
// Optimization: CS/RST moved to GPIO 32+, keeping low GPIOs for data bus and WR.
// 최적화: CS/RST를 GPIO 32+로 이동하여, 저위 GPIO는 데이터 버스와 WR용으로 유지합니다.
#define TFT_CS   32  // Chip Select (칩 선택)
#define TFT_RST  33  // Reset (리셋)

// Data/Command selection - Must be in GPIO 0-31 (또는 RS)
// 데이터/명령 선택 - GPIO 0-31 범위 내에 있어야 함 (또는 RS)
#define TFT_DC   14

// Write signal - ★ Critical pin, must be in GPIO 0-31 and keep connections short
// 쓰기 신호 - ★ 중요 핀, GPIO 0-31 범위 내에 있어야 하며 연결을 짧게 유지하세요
#define TFT_WR   27

// Read signal - If not reading screen data, can connect to 3.3V, but must be defined in library
// 읽기 신호 - 스크린 데이터 읽기가 필요 없으면 3.3V에 연결 가능하지만, 라이브러리에서 정의되어야 함
#define TFT_RD    2

// --- 데이터 버스 핀 D0 - D7 (Data Bus Pins) ---
// Must be within GPIO 0-31 range.
// GPIO 0-31 범위 내에 있어야 함.
// Avoided GPIO 16, 17 (PSRAM/Flash) and 12 (Strap).
// GPIO 16, 17 (PSRAM/Flash)과 12 (Strap)를 피하세요.
#define TFT_D0   26
#define TFT_D1   25
#define TFT_D2   19
#define TFT_D3   18
#define TFT_D4    5  // Note: GPIO 5 is a Strap pin, ensure screen does not pull it high during power-up
                     // 주의: GPIO 5는 스트랩 핀입니다. 전원 켤질 때 스크린이 이것을 high로 당기지 않도록 하세요.
#define TFT_D5   21
#define TFT_D6   22
#define TFT_D7   23

// -------------------------------------------------------------------------
// 6. 백라이트 제어 (Backlight Control - Optional)
// -------------------------------------------------------------------------
// If your screen has a BLK or LED pin, connect it to an ESP32 pin and define it here.
// 스크린에 BLK 또는 LED 핀이 있다면, ESP32 핀에 연결하고 여기서 정의하세요.
// #define TFT_BL   4            // Example: Connected to GPIO 4 (예시: GPIO 4에 연결)
// #define TFT_BACKLIGHT_ON HIGH // High logic level turns on backlight (백라이트 high 레벨로 켜기)

// -------------------------------------------------------------------------
// 7. 폰트 로딩 (Font Loading)
// -------------------------------------------------------------------------
// Enable as needed; enabling more fonts consumes more Flash memory.
// 필요에 따라 활성화하세요. 더 많은 폰트를 활성화하면 Flash 메모리를 더 많이 소모합니다.
#define LOAD_GLCD   // Font 1. Original Glcd font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts. Include access to  48 Adafruit_GFX free fonts FF1 to FF48
#define SMOOTH_FONT // Enable smooth font loading (평활한 폰트 로딩 활성화)

// -------------------------------------------------------------------------
// 8. 기타 설정 (Other Settings)
// -------------------------------------------------------------------------
// In parallel mode, SPI frequency is usually ignored as speed is determined by CPU register write speed.
// 병렬 모드에서는 SPI 주파수 설정이 무시되는 경우가 많습니다. 왜냐하면 속도가 CPU 레지스터 쓰기 속도에 의해 결정되기 때문입니다.
// Kept here for compatibility.
// 호환성을 위해 여기에 유지합니다.
#define SPI_FREQUENCY       27000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY  2500000

// --- Touch Screen Settings (터치 스크린 설정) ---
// If you use XPT2046 touch function.
// XPT2046 터치 기능을 사용하는 경우.
// Parallel screens usually have a separate SPI interface for touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).
// 병렬 스크린은 보통 터치를 위해 별도의 SPI 인터페이스를 가집니다 (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).
//
// If using touch, uncomment below and set pins (can use VSPI default pins).
// 터치를 사용한다면 아래 주석을 해제하고 핀을 설정하세요 (VSPI 기본 핀 사용 가능).
//
// #define TOUCH_CS 22
// WARNING: You used TFT_D6 on GPIO 22 above. If using touch, find another pin or use SoftSPI.
// 경고: 위에서 TFT_D6로 GPIO 22를 사용했습니다. 터치를 사용한다면 다른 핀을 찾거나 SoftSPI를 사용하세요.
```



## 예제 프로그램 열기

다음 경로를 통해 예제 프로그램을 엽니다. 이 프로그램으로 다음을 테스트할 수 있습니다:

Arduino IDE ：File -> Examples -> TFT_eSPI -> 320 x 240 -> TFT_graphicstest_one_lib



## 프로그램 업로드, 컴파일 실패 문제 발생

ESP32 개발 보드 라이브러리 버전이 **3.0.0 이상**으로 업데이트된 경우, TFT_eSPI를 컴파일할 때 매우 높은 확률로 다음 오류가 발생합니다:

```tex
In file included from /Users/shawn/Documents/Arduino/libraries/TFT_eSPI/TFT_eSPI.cpp:24:

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c: In member function 'uint8_t TFT_eSPI::readByte()':

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c:113:9: error: 'gpio_input_get' was not declared in this scope; did you mean 'gpio_num_t'?
113 |   reg = gpio_input_get(); // Read three times to allow for bus access time
|         ^~~~~~~~~~~~~~
|         gpio_num_t
exit status 1

Compilation error: exit status 1
```

`error: 'gpio_input_get' was not declared in this scope`

### 오류 원인 분석

`gpio_input_get()`는 ESP32의 초기 저수준 개발 프레임워크(ESP-IDF)에서 매크 또는 함수였습니다. 최근 발표된 **ESP32 Arduino Core 3.0.x** 버전에서, 에스프레시프(Espressif)는 저수준 API를 대대적으로 리팩토링하여, 많은 오래된 저수준 함수를 제거하거나 변경했기 때문에 `TFT_eSPI` 라이브러리에서 이 함수를 호출할 때 정의를 찾지 못하여 오류가 발생합니다.

다운그레이드 방식으로 수정할 수 있습니다. 예를 들어 esp32 라이브러리를 2.0.x로 다운그레이드하는 것이 가장 편하지만, 저는 TFT_eSPI 라이브러리를 수정하는 또 다른 방법을 제공합니다:

다음 파일을 찾아서 엽니다.

Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c

코드 맨 앞부분에 다음 매크 정의 코드를 추가하고, 수정된 파일을 저장하세요:

```c++
#if !defined(gpio_input_get)
  #define gpio_input_get() GPIO.in
#endif
```



## 다시 프로그램 업로드, 화면 미러링 문제 발생

이제 컴파일은 성공하고, 개발 보드에 성공적으로 업로드되었습니다. 그리고 스크린도 켜졌습니다. 하지만 이때 아직 너무 일찍 기뻐할 수 없습니다. 자세히 관찰해보면 스크린의 텍스트가 미러링되어 있습니다.

예제 프로그램에서 수정을 진행했고, 예제 프로그램의 102번째 줄 정도에서 찾았습니다.

```
void loop(void) {
  for (uint8_t rotation = 4; rotation < 8; rotation++) {
    tft.setRotation(rotation);
    testText();
    delay(2000);
  }
}
```



## 마지막으로 프로그램 업로드

이제 화면이 정상입니다. 축하합니다. 이 2.4인치 TFT 스크린(ILI9341)을 성공적으로 켰습니다!



## 자주 발생하는 문제 해결 (FAQ)

개발 과정에서 가장 자주 발생하는 문제와 해결책입니다. 빠르게 참조할 수 있도록 정리했습니다.

### Q1: 스크린이 흰색으로 켜지지만 화면이 표시되지 않나요?

- **A1**: 90%는 병렬 모드가 활성화되지 않았기 때문입니다. User_Setup.h에서 #define ESP32_PARALLEL의 주석이 해제되어 있는지 다시 확인하세요.
- **A2**: TFT_RST (GPIO 33) 연결 상태가 좋은지 확인하세요.

### Q2: 색상이 올바르지 않고, 빨간색이 파란색이 되나요?

- **A**: 이는 RGB 순서 정의 문제입니다. User_Setup.h에서 #define TFT_RGB_ORDER TFT_RGB를 TFT_BGR로 변경하세요 (또는 그 반대).

### Q3: 이 설정은 터치 기능(Touch)을 지원하나요?

- **A**: 이 문서에서는 디스플레이 드라이버만 설정했습니다. ILI9341 스크린은 보통 XPT2046 터치 칩을 내장하고 있으며, 이것은 별도의 SPI 인터페이스를 사용합니다. 별도의 터치 핀(T_CLK, T_CS, T_DIN, T_DO, T_IRQ)에 연결하고 User_Setup.h에서 TOUCH_CS의 주석을 해제해야 합니다. **경고**: 터치는 SPI 프로토콜이며 병렬 포트 데이터 라인 D0-D7과 핀을 공유할 수 없습니다.

### Q4: 왜 직접 VSPI/HSPI 드라이버를 사용하지 않나요?

- **A**: 병렬 포트 드라이버(8-bit Parallel)의 이론적 리프레시 속도는 SPI의 수배이며, 높은 프레임 레이트의 UI 인터페이스나 레트로 게임 에뮬레이터 개발에 적합합니다.
