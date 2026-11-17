---
title: "ESP32-S3로 ST7306 4색 반사형 LCD(백라이트 없음) 구동 완전 튜토리얼 (Arduino IDE + SPI)"
boardId: esp32s3
moduleId: display/lcd42-st7306-reflective
category: esp32
date: 2026-11-17
intro: "Arduino IDE와 SPI로 ESP32-S3가 ST7306 4색 반사형 LCD(백라이트 없음)를 구동하게 합니다: 21핀 FPC 배선, 전체 코드, 표시 방향 조정과 무표시 문제 해결. 실측 환경은 Arduino IDE 2.3.8 + esp32 Core 3.3.8입니다."
image: "https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg"
---

> 난이도: ⭐⭐☆☆☆  
> 예상 소요 시간: 약 30~60분(환경 다운로드와 하드웨어 문제 해결 시간 제외)  
> 테스트 환경: Arduino IDE v2.3.8 + esp32 Arduino Core v3.3.8

## TL;DR: ESP32-S3로 ST7306 빠르게 시작하기

- 모듈은 3.3V만 사용합니다. FPC의 5번, 6번 핀을 모두 3.3V에 연결하고 공통 GND도 확실히 연결하세요. 5V에 연결하면 안 됩니다.
- 기본값은 `PINSET = 1`: CS→GPIO9, RESET→GPIO10, SCLK→GPIO12, MOSI→GPIO13, RS/D/C→GPIO14. TE는 연결하지 않아도 됩니다.
- Arduino IDE에 `esp32 by Espressif Systems`를 설치하세요. 별도의 ST7306 라이브러리는 설치할 필요가 없습니다.
- 프로젝트 디렉터리의 `esp32s3-st7306-bringup.ino`를 열고, 보드는 갖고 있는 ESP32-S3 모델에 맞게 선택하세요(이 예제는 `ESP32S3 Dev Module`). 시리얼에 로그가 안 나오면 먼저 `USB CDC On Boot`을 확인하세요.
- 기본 SPI는 모드 0, 20MHz이고 논리 화면은 400×300 가로 방향입니다. 표시가 안 되면 먼저 전원을 끄고 공통 GND, FPC 방향, RS 핀을 확인한 뒤, 전원을 켜서 3.3V를 측정하고 밝은 빛 아래에서 관찰하세요. 그래도 안 되면 `SPI_HZ`를 10MHz로 낮추세요.

## 서문: 먼저 Arduino IDE로 ST7306 켜기

이 4.2인치 화면은 ST7306 컨트롤러를 사용하며 SPI로 명령과 프레임버퍼 데이터를 받습니다. 반사형 LCD(백라이트 없음) TFT LCD라서 주변 광원으로 표시하고 백라이트가 없으므로 밝은 환경에서야 잘 보입니다. 프로젝트 디렉터리에는 ESP-IDF와 Arduino IDE 두 가지 프로그램이 함께 들어 있지만, 이 글에서는 Arduino IDE만 다룹니다: 21핀 FPC를 연결하고 예제를 업로드해서 400×300 가로 방향 테스트 페이지를 띄우는 것입니다. ESP-IDF의 20페이지 데모도 프로젝트 디렉터리에 그대로 있으니, 드라이버 래핑과 드로잉 함수를 더 연구하고 싶은 분은 직접 빌드해 볼 수 있습니다.

## 최종 결과: ST7306의 8페이지 표시 테스트

배선과 업로드가 모두 올바르면 프로그램이 8개의 테스트 페이지를 반복 표시합니다. 일반 페이지는 약 3초, 움직이는 사각형 페이지는 약 6초 동안 표시됩니다. 시리얼 모니터를 열고 보레이트를 115200으로 설정하면 초기화와 페이지 전환 로그를 볼 수 있습니다. 각 페이지는 표시되는 동안 계속 다시 그려집니다. 업로드 후에 시리얼 모니터를 열었다면 부팅 로그를 놓쳤을 수 있는데, 보드의 RST 버튼을 한 번 누르면 다시 볼 수 있습니다.

| 페이지 번호 | 테스트 내용              | 확인 포인트            | 프로그램 내 이름             |
| -: | ----------------- | -------------- | ----------------- |
|  0 | 백색, 시안, 적색, 흑색 가로 띠         | 네 가지 표시 상태         | `PAGE_COLOR_BARS` |
|  1 | HELLO WORLD, 테두리, 네 모서리 | 문자와 가로 방향        | `PAGE_HELLO`      |
|  2 | 시간, 프레임 수, FPS         | 부팅 후 누적 시간, 전역 프레임 수, 누적 평균 FPS(이 페이지 단독 프레임률이 아님)        | `PAGE_COUNTER`    |
|  3 | 대각선, 가로선, 세로선         | 선과 좌표 매핑        | `PAGE_DIAGONAL`   |
|  4 | 좌우 왕복 사각형            | 연속 리프레시           | `PAGE_REFRESH`    |
|  5 | 체커보드               | 흑백 칸(한 칸 20픽셀)         | `PAGE_CHECKER`    |
|  6 | 가로 줄무늬               | 규칙적인 패턴           | `PAGE_STRIPES`    |
|  7 | CYAN 색상 테스트         | 화면 전체 시안(시각적으로는 파란색에 가까움), 프레임버퍼 바이트 `0x33` | `PAGE_CYAN`       |

> 참고: 화면에 표시되는 페이지 라벨(`1: COLOR BARS`, `3: DIAGONAL` 등)은 코드에 고정된 문자열이라 위 표의 페이지 번호와 완전히 일치하지 않습니다(COLOR BARS는 0번 페이지). 시리얼의 `[PAGE]` 로그를 기준으로 하세요.


![](https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/Jb9UiMvgtTQ?si=IvvwAvHHZx5RICSM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## 부품 설명: YDP420H005-V3와 ST7306

### YDP420H005-V3 반사형 LCD(백라이트 없음) 모듈

4.2인치 반사형 TFT LCD 모듈로, 패널 네이티브 프레임버퍼는 300×400입니다. ST7306 컨트롤러가 모듈에 이미 통합되어 있고, ESP32-S3는 SPI로 명령과 픽셀 데이터를 보냅니다. 이 프로젝트의 Arduino 프로그램은 애플리케이션 계층에서 이를 400×300 가로 화면으로 매핑합니다.

이 프로젝트의 펌웨어는 2bit 인코딩으로 네 가지 표시 상태를 만듭니다: 백색, 시안, 적색, 흑색(`0x00`~`0x03`). 픽셀당 2bit이며 중간 계조는 없습니다. 다른 ST7306 화면의 색상이나 초기화 파라미터를 그대로 가져다 쓰지 마세요.

| 파라미터      | 이 프로젝트의 모듈                         |
| ------- | ----------------------------- |
| 모델명      | Osptek YDP420H005-V3          |
| 컨트롤러     | Sitronix ST7306               |
| 네이티브 해상도   | 300×400                       |
| 표시 상태    | 백색, 시안, 적색, 흑색, 픽셀당 2bit               |
| 호스트 인터페이스    | 4선 SPI(SCLK, MOSI, CS, D/C), 별도로 RESET과 선택적 TE; FPC에 MISO/SDO가 없어 쓰기만 가능하고 읽기는 불가 |
| 모듈 전원 및 로직 | 3.3V                          |
| 유효 표시 영역  | 63.6×84.8mm                   |
| 동작 온도    | −20~+70°C                     |

### 21핀 FPC 변환 보드

화면은 21핀 FPC로 신호를 내보냅니다. 변환 보드는 이 촘촘한 핀들을 ESP32-S3에 연결하기 쉬운 납땜 패드나 핀 헤더로 바꿔 주며, 이 프로젝트에서는 별도의 표시 구동 회로를 꾸밀 필요가 없습니다.

저는 제조사가 화면과 함께 파는 듀얼 FPC 범용 변환 보드를 사용했는데, 모델명 실크스크린이 없습니다. 보드에는 소켓이 두 개 있습니다: 21핀은 4.2인치용, 12핀은 2.9인치용이고, 옆에는 `GND`, `3V3` 패드도 있습니다.

두 FPC 소켓 옆에는 소형 SMD 부품이 몇 개씩 납땜되어 있는데, 패키지가 아주 작고 값 표시 실크스크린이 없습니다. 저는 그 부품들의 역할과 값은 조사해 보지 않았습니다.

이 범용 보드에는 잘못 연결하기 쉬운 지점이 하나 있습니다: 보드에 RS와 DC 두 가지 실크스크린이 동시에 있는데, 이 모듈의 LCD_D/C는 실크스크린 `RS`에 연결해야 합니다. 다른 쪽 `DC` 실크스크린은 이 모듈과 무관하니(어느 소켓에 속하는지 저는 확인하지 않았습니다) 연결하지 마세요. 변환 보드를 구매하거나 납땜할 때는 FPC 접점 방향과 핀 번호도 확인해야 합니다.

### 핀 설명: YDP420H005-V3의 21핀 FPC

아래 표는 모듈 FPC 번호 기준으로 정리했습니다. 변환 보드의 실크스크린은 다를 수 있으니, 배선할 때는 모듈 규격서와 변환 보드 실물의 배선을 기준으로 하세요(이 변환 보드는 모델명도 없고 공개 회로도도 없습니다).

|   FPC 핀 번호 | 모듈 신호                               | 흔한 실크스크린      | 이 예제에서의 용도                 |
| -------: | ---------------------------------- | --------- | -------------------- |
| 1, 4, 7, 14 | GND                                | GND       | 공통 GND에 연결                 |
|      2, 3 | NC                                 | NC        | 연결하지 않음                  |
|      5, 6 | VCC(3.3V)                          | VCC, VCI   | 두 핀 모두 3.3V에 연결            |
|        8 | LCD_RES                            | RESET, RST | GPIO10에 연결, 로우 레벨 리셋       |
|        9 | LCD_SCLK                           | SCL, SCLK  | GPIO12에 연결, SPI 클록   |
|       10 | TE                                 | TE        | GPIO11에 연결 가능; 이 예제에서는 읽지 않으므로 미연결 가능  |
|       11 | LCD_SDI                            | SDA, MOSI  | GPIO13에 연결, SPI MOSI |
|       12 | LCD_D/C                            | RS, A0     | GPIO14에 연결, 명령/데이터 선택     |
|       13 | LCD_CS                             | CS        | GPIO9에 연결, 로우 레벨 칩 셀렉트        |
|    15~19 | TP-VDD, TP-RST, TP-INT, TP-SDA, TP-SCL | 터치 관련 실크스크린    | 이 예제의 모듈에는 터치가 없으므로 연결하지 않음          |
|    20, 21 | GND                                | GND       | 역시 GND; 이 예제에서는 1, 4, 7, 14만 연결해도 됩니다(20, 21이 변환 보드에서 이 핀들과 연결되어 있는지는 제가 하나하나 측정해 보지 않았습니다. 불안하면 함께 GND에 연결하세요)        |

여기서 SCL과 SDA는 변환 보드 실크스크린에 남아 있는 흔한 명칭입니다. 이 예제는 SPI를 사용합니다: SCL은 이 화면의 시리얼 클록에, SDA는 MOSI에 대응합니다.

## BOM 표: ST7306 배선에 필요한 재료

| 부품           | 사양                    | 수량 | 비고               |
| ------------ | --------------------- | -: | ---------------- |
| ESP32-S3 개발 보드 | ESP32-S3 N16R8(16MB Flash / 8MB PSRAM) |  1 | 3.3V GPIO 사용     |
| 표시 모듈         | Osptek YDP420H005-V3  |  1 | 4.2인치, 21핀 FPC |
| FPC 변환 보드      | 제조사 듀얼 FPC 범용 변환 보드, 모델명 없음      |  1 | 핀 번호와 접점 방향 확인        |
| USB 데이터 케이블      | 개발 보드 단자에 맞는 것              |  1 | 데이터 전송 지원 필수          |
| 연결 와이어          | 짧은 점퍼 와이어 또는 납땜용 와이어             | 여러 개 | SPI 선은 짧을수록 안정적이고 정리하기도 쉬움      |

## 배선 방법: ESP32-S3와 ST7306

먼저 전원을 끄고, 아래 기본 `PINSET = 1`에 따라 배선하세요.

|   FPC 핀 번호 | 화면 신호            | ESP32-S3 | 필수 여부 | 설명        |
| -------: | --------------- | -------- | ---- | --------- |
|       13 | LCD_CS / CS     | GPIO9    | 필수   | 칩 셀렉트        |
|        8 | LCD_RES / RESET | GPIO10   | 필수   | 하드웨어 리셋      |
|       10 | TE              | GPIO11   | 선택   | 예제에서 읽지 않음, 미연결 가능 |
|        9 | LCD_SCLK / SCLK | GPIO12   | 필수   | SPI 클록    |
|       11 | LCD_SDI / MOSI  | GPIO13   | 필수   | SPI 데이터 출력  |
|       12 | LCD_D/C / RS    | GPIO14   | 필수   | 제조사 변환 보드에서는 RS에 연결 |
|      5, 6 | VCC / VCI       | 3.3V     | 필수   | 두 전원 핀 모두 연결   |
| 1, 4, 7, 14 | GND             | GND      | 필수   | 개발 보드와 공통 GND    |

⚠️ 모듈 전원과 로직은 모두 3.3V를 사용합니다. 모듈 전원이 꺼져 있을 때도 GPIO에서 모듈로 신호를 계속 입력하지 마세요.

배선 후에는 먼저 **전원을 끈** 상태에서 확인하세요:

1. 모듈 기구도를 보면서 FPC의 1번 핀과 접점 방향을 확인합니다.
2. 멀티미터의 연속성 모드로 개발 보드 GND와 화면 GND 핀이 도통되는지, 그리고 3.3V와 GND 사이에 쇼트가 없는지 확인합니다.
3. CS, RESET, SCLK, MOSI, RS 다섯 신호선을 하나씩 확인합니다.
4. 제조사 듀얼 FPC 변환 보드를 사용할 때는 GPIO14가 RS에 연결되어 있는지 다시 확인합니다.
5. 느슨한 연결이나 쇼트가 없는지 점검합니다.

그다음 **전원을 켜고** 확인하세요:

6. 멀티미터로 5번, 6번 핀(또는 변환 보드의 해당 납땜 지점)의 전압을 측정하면 3.3V여야 합니다. 아니면 즉시 전원을 끄고 원인을 찾으세요.

배선을 마친 뒤에는 선을 하나씩 두 번 대조해 보는 것을 권합니다. 한 가닥만 잘못 연결해도 시리얼 로그만으로는 어느 선인지 알아내기 어렵습니다(이 예제의 시리얼 로그는 화면 상태를 반영하지 않습니다. 문제 해결 섹션 참고).

## 설치해야 할 라이브러리: Arduino IDE의 ESP32-S3 지원

이 예제에는 독립된 ST7306 Arduino 라이브러리가 없습니다. 드라이버, 드로잉, 테스트 페이지가 모두 `.ino` 파일 안에 있습니다. `SPI.h`와 `esp_heap_caps.h`는 ESP32 Arduino Core에 포함되어 있으므로 라이브러리 매니저에서 따로 검색할 필요가 없습니다.

| 이름                                                               | 작성자 또는 출처                     | 설치 방법               | 로컬 확인 버전        |
| ---------------------------------------------------------------- | ------------------------- | ------------------ | ------------- |
| Arduino IDE                                                      | Arduino                   | Arduino 공식 사이트에서 설치     | v2.3.8        |
| [esp32 Arduino Core](https://github.com/espressif/arduino-esp32) | Espressif Systems         | Arduino IDE 보드 매니저 | v3.3.8        |
| [SPI](https://github.com/espressif/arduino-esp32)                | Espressif Arduino Core 내장 | Core와 함께 설치          | Core v3.3.8과 함께 |
| [esp\_heap\_caps](https://github.com/espressif/arduino-esp32)    | Espressif Arduino Core 내장 | Core와 함께 설치          | Core v3.3.8과 함께 |

### esp32 Arduino Core 설치

1. Arduino IDE의 환경설정(Preferences)을 열고 "추가 보드 매니저 URL"에 다음을 추가합니다:


   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
2. "툴 → 보드 → 보드 매니저"를 열고 `esp32`를 검색합니다.
3. `esp32 by Espressif Systems`를 설치합니다. 제가 확인한 버전은 v3.3.8이며, 재현할 때는 같은 버전을 선택해서 Core 차이로 인한 문제 해결 변수를 줄이는 것을 권합니다.

### 코드 열기 및 업로드

1. [프로젝트 GitHub 페이지](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek)를 열고 프로젝트 디렉터리 전체를 다운로드하거나, `ArduinoIDE/esp32s3-st7306-bringup` 폴더만 저장합니다.
2. Arduino IDE로 `ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino`를 엽니다.
3. 코드의 `PINSET`이 `1`인지 확인하고, `ROT180` 기본값이 `1`인지 대조합니다.
4. "툴 → 보드"에서 갖고 있는 ESP32-S3 개발 보드를 선택하고(이 예제는 `ESP32S3 Dev Module`), 시리얼 포트도 맞게 선택합니다. 참고 값은 다음 섹션에 있으니 항목마다 그대로 따라 할 필요는 없습니다.
5. "확인(Verify)"을 클릭하고, 통과하면 "업로드"를 클릭합니다.
6. 시리얼 모니터를 열고 보레이트 115200을 선택합니다. `테스트 페이지 루프 시작`이 보이면 화면이 테스트 페이지 순서대로 순환하는지 관찰하세요. 네이티브 USB를 사용할 때는 업로드 후 시리얼 포트가 다시 열거되면서 부팅 로그가 이미 다 출력되었을 수 있습니다. 안 보이면 RST를 한 번 누르거나, 이후의 `[PAGE]` 페이지 전환 로그를 기준으로 하세요. 화면은 반사형이므로 밝은 빛 아래에서 관찰하세요.

### Arduino IDE 메뉴 설정(참고 값)

아래 설정은 제가 동작을 확인했을 때의 값입니다. Arduino IDE v2.3.8 + esp32 Core v3.3.8 환경입니다. 참고용일 뿐입니다: ESP32-S3 개발 보드 모델이 워낙 많아서 Flash 칩, PSRAM, USB 연결 방식이 모두 다를 수 있는데, 그대로 따라 하면 오히려 문제가 생기기 쉽습니다. 표의 세 번째 열에 어떤 항목이 보드에 따라 달라지는지 적어 두었습니다.

| 메뉴 항목 | 이 예제의 값 | 결정 방법 |
| --- | --- | --- |
| Board | ESP32S3 Dev Module | 자기 보드에 맞게 선택, 아키텍처는 반드시 esp32s3 |
| Port | /dev/cu.usbmodem1401 | 로컬의 실제 포트 선택, 경로를 그대로 복사하지 말 것 |
| USB CDC On Boot | Enabled | USB가 어디에 연결되는지에 따라: 네이티브 USB면 Enabled, 온보드 시리얼 칩 경유면 Disabled |
| CPU Frequency | 240MHz (WiFi) | 기본값 유지, 예제는 클록을 낮출 필요 없음 |
| Flash Mode | QIO 80MHz | Flash 칩에 따라 결정, QIO가 대부분의 모듈 기본값 |
| Flash Size | 4MB (32Mb) | 보드의 실제 용량을 초과하지 말 것(크게 선택하면 부팅 실패 가능); 작게 선택하면 용량을 덜 쓰는 것뿐이고, 프로그램이 파티션을 넘어야 컴파일 오류가 남 |
| PSRAM | Disabled | 예제는 PSRAM을 쓰지 않으므로 Disabled 유지가 가장 안정적; 켜려면 모듈에 맞게 OPI/QSPI를 정확히 선택해야 함(N16R8의 R8은 보통 Octal이므로 OPI PSRAM 선택), 잘못 선택하면 부팅이 안 될 수 있음 |
| Partition Scheme | Default 4MB with spiffs(1.2MB APP / 1.5MB SPIFFS) | 기본값으로 충분, Flash Size를 바꾸면 함께 변경 |
| Upload Speed | 921600 | 업로드가 실패하면 115200 또는 460800으로 낮춤 |
| Upload Mode | UART0 / Hardware CDC | USB CDC 항목과 짝을 맞춤 |
| USB Mode | Hardware CDC and JTAG | 보드의 USB 포트 수와 관련, 단일 포트 보드는 보통 이렇게 설정 |

제 보드는 N16R8로 표기상 16MB Flash에 8MB PSRAM이지만, 위의 Flash Size는 4MB, PSRAM은 Disabled로 설정해서 용량의 절반 이상을 쓰지 않는 셈입니다. 예제는 프레임버퍼로 RAM 30000바이트만 사용하고, 컴파일 리포트상 프로그램이 기본 APP 파티션의 약 24%를 차지하므로 이 설정으로 동작합니다. 용량을 전부 쓰려면 Flash Size, PSRAM, 파티션 테이블을 바꿔야 하는데, 저는 시도해 보지 않았고 여러분이 이 함정에 빠지는 것을 원하지 않습니다.

자기 설정이 맞는지 판단할 때 항목마다 대조할 필요는 없습니다: 컴파일되고, 업로드되고, 시리얼에 글자가 나오고, 화면에 그림이 나오면 충분합니다. 어느 단계에서 막히면 문제 해결 섹션에서 증상에 맞춰 찾아보세요.

## 전체 코드: Arduino IDE로 ST7306 구동하기

아래는 저장소 v7.5의 전체 `.ino`입니다. 저장소와 비교해 이 글에서는 주석 몇 곳만 수정했습니다(`PINSET`의 의미, 회전 방식, 가운데 정렬 설명, FPS 기준, `DIAG_MODE` 용도). 실행 로직은 건드리지 않았습니다. 저장소의 해당 주석도 함께 업데이트하는 것을 권합니다. v7.4에서는 `PAGE_CYAN`의 채움 바이트를 수정했고, v7.5에서는 데이터를 읽을 수 없는 `0x09` 상태 읽기 부분을 삭제했으며, 나머지 로직은 변경하지 않았습니다.
```cpp
/*
 * ESP32-S3 + OSPTEK 4.2" 300x400 흑백·적색·시안 LCD(ST7306 · SPI) 테스트 스위트 v7.5
 *
 * v7.5 변경(무효한 상태 읽기 삭제):
 *   esp32s3-st7306-readback-test로 실측: SPI.begin(...,-1,MOSI,-1)일 때 MISO 미연결,
 *   transfer()는 항상 0xFF 반환, 레지스터 주소·CS 선택 여부와 무관; 데이터 핀을 입력으로 전환한 뒤
 *   풀업/풀다운으로 각각 읽으면 결과는 전부 1 / 전부 0, 읽기 명령 동안 화면이 데이터 라인을 구동하지 않는다는 뜻.
 *   결론: 이 모듈은 현재 배선에서 레지스터를 읽을 수 없고, 기존 [DIAG] 0x09 로그는 OK를 오탐할 뿐이라
 *   통째로 삭제했습니다. 링크 상태는 화면이 정상 표시되는지로 판단하고, 시리얼은 보지 마세요.
 *
 * v7.4 변경(PAGE_CYAN 전체 화면 채움 수정):
 *   실기에서 0x33 / 0x55 / 픽셀별 writePoint(C_CYAN) 비교:
 *   0x33과 픽셀별 쓰기 모두 화면 전체 시안(시각적으로 파란색에 가까움), 0x55는 간격 줄무늬.
 *   픽셀별 쓰기 후 30000바이트 프레임버퍼도 전부 0x33이므로 PAGE_CYAN을 0x33으로 변경.
 *
 * v7.3 변경(화면 전체를 다시 180° 회전):
 *   현장 시연에서 화면 방향이 기존 매핑과 반대여서 화면 전체를 180° 회전해야 했음.
 *   writePoint의 소프트웨어 매핑 앞에 논리 좌표 중심 대칭을 한 번 추가:
 *     x -> LCD_W-1-x, y -> LCD_H-1-y
 *   rx = 299 - y; ry = x; 와 동등.  ROT180 매크로 스위치, 0으로 두면 v7.1 방향으로 복귀.
 *
 * v7.1 변경(가로형 적용 - 소프트웨어 회전, 방향 수정):
 *   패널 물리 배선은 세로형 300x400, 사용자는 가로로 배치, 시점은 400x300.
 *   소프트웨어 회전 사용: writePoint가 논리 가로형 좌표를 세로형 프레임버퍼로 매핑.
 *   매핑 공식(v7.1 수정): rx = y; ry = 399 - x;
 *   v7에서는 rx=299-y, ry=x(시계 방향)를 썼는데 진단 사각형이 오른쪽 아래에 나타나 방향이 반대였음.
 *   v7.1에서 반시계 방향으로 변경: 사각형은 왼쪽 위에 나타나야 함.
 * v7.2: DIAG_MODE를 끄고 전체 8페이지 테스트 루프 복원.
 *
 * v4 핵심 수정:
 *   1) pinMode(LCD_CS/RS, OUTPUT) 추가: digitalWrite 내부는 gpio_set_level()일 뿐,
 *      출력 모드로 자동 전환되지 않음. ESP32 핀 기본값은 입력, CS/D-C가 떠 있어 화면이
 *      유효한 명령/데이터 타이밍을 전혀 받지 못했음. 이전 몇 버전 무표시의 진짜 근본 원인.
 *   2) 핀 정의는 board_config.h(BOARD_PINSET 1)와 일치, 배선 변경 불필요:
 *      CS=9  RST=10  CLK=12  MOSI=13  RS(D/C)=14
 *   3) SPI 클록 20MHz
 *   4) IDF 프로젝트 app_main에서 initialize() 이후 단계 보완:
 *      High_Power_Mode / display_on / display_Inversion(false) / clearDisplay
 *   5) 색상 매핑은 IDF board_color.h와 일치:
 *      C_WHITE=0x00  C_CYAN=0x01  C_RED=0x02  C_BLACK=0x03
 *      (bit0=시안, bit1=적색, 두 bit 모두 켜짐=흑색)
 *
 * v5에서 테스트 페이지 8개 추가(페이지당 3초, 리프레시율 페이지 6초):
 *   0 COLOR_BARS  4색 가로 띠(백/시안/적/흑)
 *   1 HELLO       HELLO WORLD + 네 모서리 마커 + 테두리
 *   2 COUNTER     시간 / 프레임 수 / FPS
 *   3 DIAGONAL    대각선 + 가로세로선
 *   4 REFRESH     리프레시율 테스트(움직이는 사각형)
 *   5 CHECKER     체커보드
 *   6 STRIPES     가로 줄무늬
 *   7 CYAN        전체 화면 시안
 */

#include <SPI.h>
#include <esp_heap_caps.h>

// ---------------- 핀 설정 ----------------
#define PINSET 1  // 1=기본 배선(GPIO9/10/12/13/14, 이 글에서 사용)  0=예비 배선(GPIO38~42)

#if PINSET == 1
  // 핀은 IDF 프로젝트 board_config.h(BOARD_PINSET 1)와 완전히 일치, 배선 변경 불필요
  #define LCD_CS   9
  #define LCD_RST  10
  #define LCD_CLK  12
  #define LCD_MOSI 13
  #define LCD_RS   14   // D/C, 실크스크린 RS
#else
  #define LCD_CS   38
  #define LCD_RST  41
  #define LCD_CLK  39
  #define LCD_MOSI 42
  #define LCD_RS   40
#endif

// ---------------- 화면 파라미터 ----------------
// 논리 해상도: 가로형 400x300(패널 물리 배선은 세로형 300x400, writePoint()가 소프트웨어 회전, MV 비트 미사용)
#define LCD_W      400
#define LCD_H      300
// 세로형 프레임버퍼 파라미터(변경 없음)
#define LCD_PIVOT_W  300   // 물리 폭
#define LCD_PIVOT_H  400   // 물리 높이
#define LCD_ROW_B    (LCD_PIVOT_W / 2)          // 행당 150바이트
#define BUF_LEN      (LCD_ROW_B * LCD_PIVOT_H / 2)  // 30000바이트
#define CHUNK        1500

// 색상 매핑은 IDF board_color.h와 일치
#define C_WHITE  0x00
#define C_CYAN   0x01
#define C_RED    0x02
#define C_BLACK  0x03

// 그래도 안 켜지면 20000000을 10000000으로 낮춰 재시도
#define SPI_HZ  20000000

static uint8_t *fb = nullptr;

// ---------------- 저수준 SPI(CS 완전 수동)----------------
static void spi_begin(void) {
  SPI.beginTransaction(SPISettings(SPI_HZ, MSBFIRST, SPI_MODE0));
}

static void lcd_cmd(uint8_t cmd) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, LOW);
  SPI.transfer(cmd);
  digitalWrite(LCD_CS, HIGH);
}

static void lcd_param(uint8_t p) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  SPI.transfer(p);
  digitalWrite(LCD_CS, HIGH);
}

// 여기에는 원래 lcd_read_reg()가 있었고 SPI.transfer()로 0x09 상태 레지스터를 읽었습니다.
// v7.5에서 삭제한 이유(추측 아닌 실측):
//   1) SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)의 두 번째 인자는 MISO, -1은 미연결을 뜻하며,
//      주변장치에 샘플링할 입력 핀이 없어 transfer()는 항상 0xFF를 반환.
//   2) 0x04 / 0x0A / 0xDA / 0xA5 아무 레지스터로 바꾸거나, CS를 계속 하이로 유지해
//      화면을 아예 선택하지 않아도 읽기 값은 여전히 0xFF —— 이 값은 화면과 아무 관련이 없다는 뜻.
//   3) 반이중으로 바꿔(MOSI 핀을 입력으로 전환, 클록 수동 토글) 읽으면 내부 풀업에서 전부 1,
//      내부 풀다운에서 전부 0. 읽기 명령 동안 화면이 데이터 라인을 구동하지 않아 읽을 수 없음.
// 따라서 이 모듈은 현재 배선에서 쓸 수 있는 링크 자가 진단이 없습니다. 연결 상태는 화면 표시 여부로 판단하세요.

// ---------------- 초기화 시퀀스(IDF와 항목별 일치)----------------
static void st7306_init(void) {
  // 핵심 수정: CS / RS / RST를 반드시 명시적으로 출력으로 설정해야 합니다.
  // digitalWrite 내부는 gpio_set_level()일 뿐, 출력 모드로 자동 전환되지 않습니다;
  // ESP32 핀 기본값은 입력이라 pinMode를 안 하면 CS와 D/C가 계속 떠 있어 화면이 유효한 타이밍을 전혀 못 받습니다.
  pinMode(LCD_CS,  OUTPUT);
  pinMode(LCD_RS,  OUTPUT);
  pinMode(LCD_RST, OUTPUT);
  digitalWrite(LCD_CS, HIGH);   // 유휴 시 CS 하이
  digitalWrite(LCD_RS, HIGH);
  digitalWrite(LCD_RST, HIGH); delay(10);
  digitalWrite(LCD_RST, LOW);  delay(10);
  digitalWrite(LCD_RST, HIGH); delay(10);

  // 마지막 인자에 -1 전달, CS는 전적으로 수동 digitalWrite로 제어
  SPI.begin(LCD_CLK, -1, LCD_MOSI, -1);
  spi_begin();

  lcd_cmd(0xD6); lcd_param(0x17); lcd_param(0x02);
  lcd_cmd(0xD1); lcd_param(0x01);

  lcd_cmd(0xC0); lcd_param(0x12); lcd_param(0x0A);
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);

  lcd_cmd(0xD8); lcd_param(0xA6); lcd_param(0xE9);
  lcd_cmd(0xB2); lcd_param(0x12);

  lcd_cmd(0xB3); lcd_param(0xE5); lcd_param(0xF6); lcd_param(0x17);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x71);
  lcd_cmd(0xB4); lcd_param(0x05); lcd_param(0x46); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x76); lcd_param(0x45);

  lcd_cmd(0x62); lcd_param(0x32); lcd_param(0x03); lcd_param(0x1F);

  lcd_cmd(0xB7); lcd_param(0x13);
  lcd_cmd(0xB0); lcd_param(0x64);

  lcd_cmd(0x11); delay(120);                         // Sleep Out

  lcd_cmd(0xC9); lcd_param(0x00);
  lcd_cmd(0x36); lcd_param(0x48);                    // MX=1, DO=1
  lcd_cmd(0x3A); lcd_param(0x11);
  lcd_cmd(0xB9); lcd_param(0x20);
  lcd_cmd(0xB8); lcd_param(0x29);

  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);

  lcd_cmd(0x35); lcd_param(0x00);
  lcd_cmd(0xD0); lcd_param(0xFF);
  lcd_cmd(0x38);                                     // HPM

  lcd_cmd(0x29);                                     // DISPLAY ON
  lcd_cmd(0x20);                                     // Inversion Off

  lcd_cmd(0xBB); lcd_param(0x4F);                    // Enable Clear RAM

  // ---- IDF app_main이 initialize() 이후에 추가로 호출하는 단계 ----
  lcd_cmd(0x38); delay(300);                         // High_Power_Mode()의 HPM 시퀀스
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);
  lcd_cmd(0xC9); lcd_param(0x00);
  delay(20);
  // display_on(true) / display_Inversion(false)는 위에서 이미 0x29/0x20 전송 완료
  // clearDisplay()는 프레임버퍼 0 채움과 동등, 화면 갱신 전 memset이 수행

  SPI.endTransaction();
}

// ---------------- 화면 갱신(블록 분할 전송)----------------
static void st7306_flush(void) {
  spi_begin();
  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);
  lcd_cmd(0x2C);

  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  for (size_t off = 0; off < BUF_LEN; off += CHUNK) {
    size_t n = BUF_LEN - off;
    if (n > CHUNK) n = CHUNK;
    SPI.writeBytes(fb + off, n);
  }
  digitalWrite(LCD_CS, HIGH);
  SPI.endTransaction();
}

// ---------------- 픽셀 조작 ----------------
// 논리 좌표: 가로형 400x300
// 세로형 프레임버퍼 300(열) x 400(행), 소프트웨어 회전 매핑:
//   가로 x (0~399, 좌→우) -> 세로 행 ry = 399 - x(좌우 반전)
//   가로 y (0~299, 상→하) -> 세로 열 rx = y
// bit 위치 구간은 세로형 물리 좌표 rx/ry의 홀짝으로 계산.
//
// ROT180: 화면 전체를 다시 180° 회전(패널 반대 장착 / 시연 배치 방향이 반대일 때 사용).
//   방법은 논리 좌표를 먼저 중심 대칭 x -> 399-x, y -> 299-y 한 뒤 위의 매핑을 적용,
//   정리하면 rx = 299 - y; ry = x; 와 동등.
#define ROT180 1   // 1 = 180° 회전(현재); 0 = v7.1 원래 방향 복원

static void writePoint(uint16_t x, uint16_t y, uint16_t data) {
  if (x >= LCD_W || y >= LCD_H) return;
#if ROT180
  x = LCD_W - 1 - x;       // 논리 x 미러
  y = LCD_H - 1 - y;       // 논리 y 미러
#endif
  uint16_t rx = y;         // 세로형 열
  uint16_t ry = 399 - x;   // 세로형 행(반전)
  uint16_t real_x = rx / 2;
  uint16_t real_y = ry / 2;
  uint32_t idx    = (uint32_t)real_y * LCD_ROW_B + real_x;
  uint8_t one_two    = (ry % 2) ? 1 : 0;
  uint8_t line_bit_1 = (rx % 2) * 4;
  uint8_t line_bit_0 = (rx % 2) * 4 + 2;
  uint8_t bit1       = 7 - (line_bit_1 + one_two);
  uint8_t bit0       = 7 - (line_bit_0 + one_two);
  if (data & 0x02) fb[idx] |=  (1 << bit1);
  else             fb[idx] &= ~(1 << bit1);
  if (data & 0x01) fb[idx] |=  (1 << bit0);
  else             fb[idx] &= ~(1 << bit0);
}

static void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  for (uint16_t j = 0; j < h; j++)
    for (uint16_t i = 0; i < w; i++)
      writePoint(x + i, y + j, color);
}

// ---------------- 5x7 폰트 비트맵(IDF board_ui_draw.cc에서 이식)----------------
static const uint8_t s_font_5x7[][7] = {
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, /*   */
    {0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04}, /* ! */
    {0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00}, /* " */
    {0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A}, /* # */
    {0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04}, /* $ */
    {0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03}, /* % */
    {0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0D}, /* & */
    {0x04, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00}, /* ' */
    {0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02}, /* ( */
    {0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08}, /* ) */
    {0x00, 0x04, 0x15, 0x0E, 0x15, 0x04, 0x00}, /* * */
    {0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00}, /* + */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08}, /* , */
    {0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00}, /* - */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00}, /* . */
    {0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00}, /* / */
    {0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E}, /* 0 */
    {0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* 1 */
    {0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F}, /* 2 */
    {0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E}, /* 3 */
    {0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02}, /* 4 */
    {0x1F, 0x10, 0x10, 0x1E, 0x01, 0x01, 0x1E}, /* 5 */
    {0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E}, /* 6 */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08}, /* 7 */
    {0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E}, /* 8 */
    {0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E}, /* 9 */
    {0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00}, /* : */
};

// 대문자 A-Z(5x7)
static const uint8_t s_font_upper[][7] = {
    {0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* A */
    {0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E}, /* B */
    {0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E}, /* C */
    {0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E}, /* D */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F}, /* E */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10}, /* F */
    {0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F}, /* G */
    {0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* H */
    {0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* I */
    {0x01, 0x01, 0x01, 0x01, 0x01, 0x11, 0x0E}, /* J */
    {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11}, /* K */
    {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F}, /* L */
    {0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11}, /* M */
    {0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11}, /* N */
    {0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* O */
    {0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10}, /* P */
    {0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D}, /* Q */
    {0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11}, /* R */
    {0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E}, /* S */
    {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04}, /* T */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* U */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04}, /* V */
    {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A}, /* W */
    {0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11}, /* X */
    {0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04}, /* Y */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F}, /* Z */
};

static void draw_char(int x, int y, char c, int scale, uint16_t color) {
    const uint8_t *rows = nullptr;
    if (c >= ' ' && c <= ':') {
        rows = s_font_5x7[c - ' '];
    } else if (c >= 'A' && c <= 'Z') {
        rows = s_font_upper[c - 'A'];
    } else if (c >= 'a' && c <= 'z') {
        rows = s_font_upper[c - 'a'];   // 대문자 폰트 비트맵 재사용
    } else {
        return;
    }
    for (int ry = 0; ry < 7; ++ry) {
        for (int rx = 0; rx < 5; ++rx) {
            if (rows[ry] & (1U << (4 - rx))) {
                fillRect(x + rx * scale, y + ry * scale, scale, scale, color);
            }
        }
    }
}

static void draw_text(int x, int y, const char *s, int scale, uint16_t color) {
    const int char_w = 5 * scale + scale;
    int pen_x = x;
    for (const char *p = s; *p; ++p) {
        draw_char(pen_x, y, *p, scale, color);
        pen_x += char_w;
    }
}

// ---------------- 테스트 페이지 ----------------
enum TestPage {
    PAGE_COLOR_BARS = 0,   // 4색 가로 띠(백/시안/적/흑)
    PAGE_HELLO,            // Hello World + 네 모서리 마커 + 테두리
    PAGE_COUNTER,          // 초 / 프레임 수 카운트
    PAGE_DIAGONAL,         // 대각선 + 가로세로선
    PAGE_REFRESH,          // 리프레시율 테스트(움직이는 사각형)
    PAGE_CHECKER,          // 체커보드
    PAGE_STRIPES,          // 가로 줄무늬
    PAGE_CYAN,             // 전체 화면 시안
    kTotalPages
};

static void draw_corner_marks(uint16_t color) {
    const int L = 30, T = 4;  // 팔 길이, 팔 두께
    // 왼쪽 위
    fillRect(4, 4, L, T, color);  fillRect(4, 4, T, L, color);
    // 오른쪽 위
    fillRect(LCD_W - 4 - L, 4, L, T, color);  fillRect(LCD_W - 4 - T, 4, T, L, color);
    // 왼쪽 아래
    fillRect(4, LCD_H - 4 - T, L, T, color);  fillRect(4, LCD_H - 4 - L, T, L, color);
    // 오른쪽 아래
    fillRect(LCD_W - 4 - L, LCD_H - 4 - T, L, T, color);
    fillRect(LCD_W - 4 - T, LCD_H - 4 - L, T, L, color);
}

static void draw_border(uint16_t color) {
    fillRect(0, 0, LCD_W, 2, color);
    fillRect(0, LCD_H - 2, LCD_W, 2, color);
    fillRect(0, 0, 2, LCD_H, color);
    fillRect(LCD_W - 2, 0, 2, LCD_H, color);
}

// 임의 방향 직선 그리기(Bresenham)
static void draw_line(int x0, int y0, int x1, int y1, int thick, uint16_t color) {
    int dx = abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int dy = -abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    int err = dx + dy;
    while (true) {
        fillRect(x0, y0, thick, thick, color);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

static void render_page(int page, uint32_t frame, uint32_t elapsed_ms) {
    memset(fb, 0x00, BUF_LEN);   // 기본 전체 백색

    switch (page) {
    case PAGE_COLOR_BARS: {
        const uint16_t colors[4] = { C_WHITE, C_CYAN, C_RED, C_BLACK };
        const int bar_h = LCD_H / 4;
        for (int i = 0; i < 4; ++i) {
            int y0 = i * bar_h;
            int y1 = (i == 3) ? LCD_H : (y0 + bar_h);
            fillRect(0, y0, LCD_W, y1 - y0, colors[i]);
        }
        draw_text(10, 10, "1: COLOR BARS", 2, C_BLACK);
        break;
    }
    case PAGE_HELLO:
        // "HELLO WORLD" 11문자 * scale5 * 6px = 폭 330px, 가운데 정렬 x=(400-330)/2=35
        draw_text(35, 110, "HELLO WORLD", 5, C_BLACK);
        draw_text(110, 175, "ST7306 400X300", 2, C_RED);
        draw_text(110, 200, "ESP32-S3 ARDUINO", 2, C_CYAN);
        draw_corner_marks(C_BLACK);
        draw_border(C_RED);
        break;
    case PAGE_COUNTER: {
        char buf[24];
        uint32_t sec = elapsed_ms / 1000;
        snprintf(buf, sizeof(buf), "T: %02lu:%02lu", (unsigned long)(sec / 60), (unsigned long)(sec % 60));
        draw_text(115, 80, buf, 5, C_BLACK);        // 폭 240; x=115는 수동 조정, 엄밀한 가운데 정렬 아님
        snprintf(buf, sizeof(buf), "FRAME: %lu", (unsigned long)frame);
        draw_text(140, 160, buf, 3, C_RED);         // 폭은 자릿수에 따라 변함; x=140은 수동 조정
        snprintf(buf, sizeof(buf), "FPS: %lu", (unsigned long)(frame * 1000 / max((uint32_t)1, elapsed_ms)));
        draw_text(152, 200, buf, 3, C_CYAN);        // 폭은 자릿수에 따라 변함; x=152는 수동 조정; FPS는 부팅 이후 모든 페이지의 누적 평균
        break;
    }
    case PAGE_DIAGONAL:
        // 대각선 두 개
        draw_line(0, 0, LCD_W - 1, LCD_H - 1, 3, C_BLACK);
        draw_line(LCD_W - 1, 0, 0, LCD_H - 1, 3, C_RED);
        // 가로선
        for (int y = 30; y < LCD_H; y += 60)
            draw_line(0, y, LCD_W - 1, y, 2, C_CYAN);
        // 세로선
        for (int x = 40; x < LCD_W; x += 80)
            draw_line(x, 0, x, LCD_H - 1, 2, C_BLACK);
        draw_text(10, 10, "3: DIAGONAL", 2, C_BLACK);
        break;
    case PAGE_REFRESH: {
        // 사각형 좌우 왕복, 움직임의 부드러움 관찰
        int period = LCD_W - 60;
        int x = (int)((frame * 8) % (period * 2));
        if (x > period) x = period * 2 - x;
        fillRect(x + 10, 130, 40, 40, C_BLACK);     // 수직 가운데 정렬 y=(300-40)/2
        char buf[24];
        snprintf(buf, sizeof(buf), "FRAME %lu", (unsigned long)frame);
        draw_text(10, 10, buf, 2, C_BLACK);
        break;
    }
    case PAGE_CHECKER: {
        const int cell = 20;
        for (int y = 0; y < LCD_H; y += cell)
            for (int x = 0; x < LCD_W; x += cell)
                fillRect(x, y, cell, cell, ((x / cell + y / cell) & 1) ? C_BLACK : C_WHITE);
        break;
    }
    case PAGE_STRIPES: {
        const int stripe_h = 16;
        for (int y = 0; y < LCD_H; y += stripe_h * 2) {
            fillRect(0, y, LCD_W, stripe_h, C_BLACK);
            fillRect(0, y + stripe_h, LCD_W, stripe_h, C_WHITE);
        }
        break;
    }
    case PAGE_CYAN:
        memset(fb, 0x33, BUF_LEN);   // 0x33 = 결합 픽셀마다 01 -> 전체 화면 시안
        draw_text(85, 130, "CYAN FULL", 5, C_BLACK);   // 폭 270; x=85는 수동 조정, 엄밀한 가운데 정렬 아님
        break;
    default:
        break;
    }

    st7306_flush();
}

// ---------------- Arduino 진입점 ----------------

// 진단 모드: true면 논리 (50,50)에 50x50 검은 사각형 하나만 그립니다,
// writePoint 매핑과 방향 확인용(화면이 전혀 안 켜지면 도움 안 됨, 배선과 전원부터 확인).
// 관찰 포인트:
//   1. 사각형이 정사각형(직사각형/파편 아님) -> 픽셀 매핑 비율 정확
//   2. 사각형이 가로 시점의 왼쪽 위 1/4 영역 -> 방향 정확
//   3. 전체가 반대면 -> ROT180 매크로부터 변경; 그래도 안 맞으면 MADCTL(0x36)의 MX/MY 비트 변경 고려
#define DIAG_MODE  false

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println();
    Serial.println("=== ST7306 test suite v7.5 (ROT180) ===");

    fb = (uint8_t *)heap_caps_malloc(BUF_LEN, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!fb) fb = (uint8_t *)malloc(BUF_LEN);
    if (!fb) { Serial.println("[ERR] 프레임버퍼 할당 실패"); while (1) delay(100); }
    Serial.printf("[OK] 프레임버퍼 %d 바이트 @%p\n", BUF_LEN, fb);
    memset(fb, 0x00, BUF_LEN);

    Serial.println("[..] ST7306 초기화 중 ...");
    st7306_init();

    // 여기서는 원래 0x09 상태 레지스터를 한 번 읽고 OK / 링크 불통을 출력했습니다.
    // v7.5에서 삭제: MISO 미연결이라 읽기 값은 항상 0xFF, 화면 상태와 무관하고 오탐만 유발.
    // 링크 정상 여부는 화면에 그림이 정상적으로 나오는지로 판단하세요.

    if (DIAG_MODE) {
        Serial.println("[DIAG] (50,50)에 50x50 사각형 그리기, 화면 관찰...");
        fillRect(50, 50, 50, 50, C_BLACK);
        st7306_flush();
    } else {
        Serial.println("[OK] 테스트 페이지 루프 시작");
    }
}

void loop() {
    if (DIAG_MODE) { delay(1000); return; }

    static int page = 0;
    static uint32_t page_start = 0;
    static uint32_t frame = 0;
    static uint32_t t_start = 0;

    if (t_start == 0) t_start = millis();
    if (page_start == 0) page_start = millis();

    uint32_t dwell = (page == PAGE_REFRESH) ? 6000 : 3000;
    uint32_t elapsed = millis() - page_start;

    render_page(page, frame, millis() - t_start);
    frame++;

    if (elapsed >= dwell) {
        page = (page + 1) % kTotalPages;
        page_start = millis();
        Serial.printf("[PAGE] %d / %d, frame %lu\n", page, kTotalPages - 1, (unsigned long)frame);
    }
}
```


### 코드 설명: ST7306 초기화, 프레임버퍼와 회전

`PINSET`은 어떤 GPIO 조합을 사용할지 결정합니다. 이 글의 배선은 `PINSET = 1`에 대응하며, 소스에는 `PINSET = 0`의 다른 핀 조합도 남아 있어 조합을 바꿀 때는 배선도 반드시 함께 바꿔야 합니다. `PINSET`은 두 핀 조합 사이의 스위치일 뿐 변환 보드 사용 여부와는 무관합니다. 배선이 편하도록 제가 배선 구성을 하나 추가했는데, 그것이 `PINSET = 1`입니다.

`st7306_init()`는 먼저 CS, RS, RST를 출력으로 설정한 뒤 하드웨어 리셋과 ST7306 초기화를 수행합니다. `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)`은 SCLK와 MOSI를 지정하고, CS는 코드에서 수동으로 제어합니다. MISO에는 `-1`을 넘기는데, 이 모듈의 FPC에는 MISO/SDO가 없어 쓰기만 가능하고 읽기가 불가능하므로 이 예제에는 읽기 기반 자가 진단이 없습니다. 전송은 `SPI_MODE0`을 사용하고, 클록은 `SPI_HZ`로 20MHz로 설정합니다.

프레임버퍼 크기는 바로 계산할 수 있습니다: 픽셀당 2bit이고 1바이트에 2×2 총 4픽셀이 들어가므로, 300×400픽셀은 한 행당 150바이트, 총 200행(각 행이 픽셀 2행에 대응)이 되어 `150 × 200 = 30000`바이트입니다. 프로그램 시작 시 `heap_caps_malloc()`으로 DMA 사용 가능한 메모리를 요청하고, 실패하면 일반 `malloc()`으로 폴백합니다.

`writePoint()`는 논리 400×300 가로 좌표를 네이티브 300×400 프레임버퍼 좌표로 변환합니다. 기본 `ROT180 = 1`은 중심 대칭 변환을 한 번 더 수행하므로, 표시 방향을 바꿀 때는 이 매크로부터 수정하고 `LCD_W`와 `LCD_H`는 바꾸지 마세요.

`st7306_flush()`는 매번 프레임버퍼 전체를 전송하며, 블록당 1500바이트입니다. `loop()`는 현재 페이지를 계속 다시 그리고, 일반 페이지는 약 3초 후, `PAGE_REFRESH`는 약 6초 후 넘어갑니다. 카운터 페이지의 시간과 FPS는 모두 부팅 이후의 누적 값이지 단일 페이지 데이터가 아닙니다.

ESP-IDF 버전의 드라이버는 `main/st7306_color4.cpp`, `main/st73xx_ui.c`, `main/color4_demo.c`로 나뉘어 있고 페이지도 더 많습니다. 이 부분은 저장소 README를 참고해 독자 여러분이 직접 연구하시도록 남겨 두며, 이 글에서는 ESP-IDF 빌드 절차를 다루지 않습니다.

## 자주 발생하는 문제 해결: ST7306 무표시, 방향과 색상

### 업로드는 성공했는데 화면에 아무 변화가 없음

증상: 시리얼은 이미 동작 중인데 화면은 그대로입니다.

원인: 전원, 공통 GND, FPC 방향, RS/DC 오배선, SPI 신호 불안정 모두 초기화 명령이 화면에 제대로 도달하지 못하게 할 수 있습니다. 반사형 화면은 백라이트가 없어서 주변이 너무 어두우면 표시가 안 되는 것처럼 보이기도 합니다.

해결: 먼저 전원을 끄고 공통 GND와 FPC 접점 방향을 확인한 뒤, 전원을 켜서 5번, 6번 핀이 3.3V인지 측정하세요(앞의 점검 절차 참고). 제조사 변환 보드에서는 GPIO14를 RS에 연결합니다. 밝은 빛 아래에서 각도를 바꿔 관찰하세요. 위가 모두 정상이면 `SPI_HZ`를 `20000000`에서 `10000000`으로 바꾸고, SCLK와 MOSI 배선을 짧게 한 뒤 다시 업로드하세요.

### 구버전(v7.4 이전)에서 시리얼에 OK가 출력되는데 화면이 안 켜짐

증상: 시리얼에 `[DIAG] ST7306 0x09 = 0xFF OK`가 출력되는데 화면에는 아무 그림도 없습니다.

원인: 이 로그는 화면 상태를 반영하지 못합니다. 위의 FPC 핀 표대로 이 모듈에는 MISO/SDO가 없고, `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)`도 MISO에 핀을 할당하지 않았으므로 `SPI.transfer()`는 항상 `0xFF`를 반환합니다. 어떤 레지스터를 읽는지, CS가 선택되어 있는지와 무관합니다(저는 `0x04`, `0x0A`, `0xDA`, `0xA5`로 바꿔 봤고, CS를 계속 하이로 유지해도 마찬가지였습니다). MOSI 핀을 입력으로 전환해 수동으로 읽으면 풀업에서는 전부 1, 풀다운에서는 전부 0이 나오는데, 이 역시 읽기 명령 동안 화면이 데이터 라인을 구동하지 않는다는 뜻입니다.

해결: v7.5로 업그레이드하세요. 해당 줄은 삭제되었습니다. v7.5의 시리얼 로그는 화면 상태를 반영하지 않으므로, 링크 상태 판단은 화면에 그림이 나오는지만 보고, 문제 해결은 전원, 공통 GND, FPC 방향, RS 핀으로 돌아가세요.

### ST7306가 됐다 안 됐다 하거나 화면 깨짐, 전원 인가마다 결과가 다름

증상: 가끔 표시되고 가끔 화면 깨짐이 나타나거나, 전원을 다시 넣으면 결과가 달라집니다.

원인: SPI 배선이 너무 길거나 공통 GND 접촉이 불량하면 전송 중 데이터에 오류가 생깁니다. 선이 길수록, 클록이 높을수록 바이트가 유실되기 쉽습니다(경험에 근거한 판단이며, 저는 정량 테스트는 하지 않았습니다).

해결: 먼저 선을 10cm 이내로 줄이고, GND가 가느다란 선 한 가닥에만 의존하지 않고 두 가닥 이상 연결되어 있는지 확인하세요. 그다음 `SPI_HZ`를 20MHz에서 10MHz로 낮춰 보고, 안정적이면 다시 올려 보세요. 초기화 명령을 먼저 임의로 삭제하거나 수정하지는 마세요.

### ST7306 가로 방향이 반대임

증상: 문자나 그림이 180° 회전되어 있지만 비율은 정상입니다.

원인: 현재 코드의 기본값은 `ROT180 = 1`인데, 여러분의 배치 방향이 예제와 반대일 수 있습니다.

해결: 업로드 후 HELLO WORLD 페이지를 보세요. 문자가 바로 서 있으면 그대로 두면 됩니다. 화면 전체가 180° 뒤집혀 있으면 `#define ROT180 1`을 `#define ROT180 0`으로 바꾸고 다시 업로드하세요. 방향과 좌표만 따로 확인하려면 `DIAG_MODE`를 `true`로 바꾸면 프로그램이 50×50 검은 사각형 하나만 그립니다. 방향이 맞으면 정사각형이어야 하고 화면 왼쪽 위 영역에 있어야 합니다. 이 모드는 방향과 매핑 확인용일 뿐, 화면이 전혀 안 켜질 때는 도움이 되지 않습니다.

### ST7306 표시 비율이나 위치가 이상함

증상: 사각형이 찌그러지거나 패턴이 깨지거나 위치가 예상과 다릅니다.

원인: 보통 `LCD_W`, `LCD_H`, 프레임버퍼 레이아웃 매크로, `writePoint()`를 수정한 뒤나, 코드를 다른 ST7306 모듈에 썼을 때 나타납니다. 수정하지 않은 v7.5가 이 모듈에서 이런 증상을 보일 이유는 없습니다. 400×300 논리 좌표와 300×400 네이티브 프레임버퍼 사이는 `writePoint()`가 매핑하며, 해상도 매크로를 바꿔서 해결할 수 없습니다.

해결: `LCD_W = 400`, `LCD_H = 300`을 유지하고, 먼저 `DIAG_MODE`를 켜서 사각형을 확인한 뒤 `writePoint()`의 `rx`, `ry`와 비트 플레인 계산을 대조하세요.
### ST7306 색상이 예상과 다름

증상: 적색, 시안 또는 채움 패턴이 예상과 다릅니다.

원인: 이 모듈은 백색, 시안, 적색, 흑색 네 가지 상태만 있고, 두 색상 비트가 바이트 안에서 교차 배치됩니다. 다른 ST7306 모듈은 색상 구현이 다를 수도 있습니다.

해결: 먼저 4색 가로 띠 페이지를 실행해 네 가지 기본 상태를 확인한 뒤 `writePoint()`의 색상 쓰기를 점검하세요. v7.4부터 `PAGE_CYAN`의 채움 바이트를 `0x33`으로 바꿨습니다. 구버전을 실행해서 간격 줄무늬가 보이면 코드를 업그레이드하거나 이 한 곳만 수정하세요.

### Arduino IDE에서 `esp_heap_caps.h`를 찾을 수 없다고 함

증상: 컴파일 단계에서 헤더 파일이 없다고 나옵니다.

원인: 현재 선택한 보드나 Core가 잘못되었습니다. 이 헤더는 ESP32 Arduino Core에 속하며 별도의 서드파티 라이브러리가 아닙니다.

해결: 설치된 것이 `esp32 by Espressif Systems`인지 확인하고, 보드 메뉴에서 Arduino Uno나 다른 아키텍처가 아니라 ESP32-S3를 선택하세요. Core가 손상되었다면 현재 버전을 기록한 뒤 재설치하고, 보드와 포트를 다시 선택하세요.

### ESP32-S3 업로드 후 시리얼 로그가 안 보임

증상: 화면에는 이미 페이지가 떠 있을 수 있는데 시리얼 모니터에는 내용이 없습니다.

원인: 보레이트, 시리얼 장치, USB CDC 설정이 맞지 않거나, 포트를 다른 프로그램이 점유하고 있을 수 있습니다.

해결: 보레이트를 115200으로 설정하고 포트를 점유 중인 다른 모니터를 닫으세요. 그다음 이 예제의 메뉴 값을 대조하세요: `USB CDC On Boot = Enabled`, `USB Mode = Hardware CDC and JTAG`, 시리얼 장치는 `/dev/cu.usbmodem1401` 형태(Windows에서는 COM 포트)입니다. 보드가 네이티브 USB가 아니라 온보드 USB-시리얼 변환 칩을 경유한다면 `USB CDC On Boot`을 `Disabled`로 바꾸세요. 이런 연결에서는 `USB Mode`가 거의 영향이 없으니 기본값을 유지하면 됩니다.

## FAQ: ESP32-S3로 ST7306를 구동할 때 자주 나오는 질문

**Q: ESP32-S3에서 다른 핀으로 ST7306를 연결해도 되나요?**  
A: `.ino`의 `PINSET = 1` 분기 아래 `LCD_CS`, `LCD_RST`, `LCD_CLK`, `LCD_MOSI`, `LCD_RS`를 수정할 수 있고, 배선도 함께 바꿔야 합니다. 특정 GPIO를 쓸 수 있는지는 개발 보드의 핀 인출과 부팅 설정에 따라 달라지는데, 저는 보드마다 검증해 보지 않았습니다. 예를 들어 N16R8에서는 GPIO35~37이 Octal PSRAM에 점유되므로 PSRAM을 켤 때는 피해야 합니다. 소스의 `PINSET = 0`에는 CS=38, RESET=41, SCLK=39, MOSI=42, RS=40 조합도 예비로 마련되어 있습니다.

**Q: ST7306의 SPI 클록을 바꿔도 되나요?**  
A: 예제 기본값은 `SPI_HZ = 20000000`, 즉 20MHz입니다. 통신이 불안정하면 먼저 `10000000`으로 바꾸세요. 프로젝트 자료에 따르면 ST7306 v0.1 매뉴얼의 쓰기 클록 최소 주기는 30ns로 약 33.3MHz에 해당합니다. 실제 모듈에서는 배선과 변환 보드도 고려해야 하는데, 저는 이 보드의 안정 상한을 측정해 보지 않았습니다.

**Q: YDP420H005-V3에 5V 전원을 넣어도 되나요?**  
A: 안 됩니다. 모듈 FPC의 5번, 6번 핀은 3.3V에 연결하고 로직도 3.3V 기준으로 사용합니다. 두 전원 핀 모두 연결해야 하고, 개발 보드와 모듈은 공통 GND여야 합니다. 모듈 전원이 꺼져 있을 때는 GPIO 신호를 계속 입력하지 마세요.

**Q: 이 ST7306 예제는 RAM을 얼마나 쓰고 FPS는 얼마나 나오나요?**  
A: 프레임버퍼 전체가 30000바이트이고, 프로그램은 폰트 비트맵, 지역 변수, Arduino Core 자체의 실행 메모리도 사용합니다. 리프레시마다 30000바이트 전체를 전송합니다. 20MHz에서 SPI 페이로드만 계산하면 이론 전송 시간은 약 12ms이며 드로잉과 명령 오버헤드는 포함되지 않습니다. 실제 FPS는 제가 기록해 두지 않았습니다. 카운터 페이지에 표시되는 값은 부팅 이후 모든 페이지의 누적 평균이지 단일 페이지 프레임률이 아닙니다. 드로잉 자체(픽셀마다 `writePoint()` 호출)에도 시간이 걸리므로 실제 프레임 시간은 12ms보다 깁니다.

**Q: 같은 ST7306를 쓰는 다른 화면으로 바꿔도 바로 되나요?**  
A: 보장할 수 없습니다. 이 예제는 YDP420H005-V3의 21핀 FPC, 초기화 시퀀스, 300×400 프레임버퍼, 현재의 네 가지 표시 상태에 맞춰져 있습니다. 다른 모듈은 전원, 어드레싱, 색상, 초기화 파라미터가 다를 수 있으니 먼저 그 규격서를 대조해야 합니다.

**Q: ST7306 배선을 다 했는데 표시가 안 되면 어디부터 확인하나요?**  
A: 먼저 전원을 끄고 공통 GND, FPC 방향, 필수 신호선 다섯 가닥을 확인하고, 제조사 변환 보드의 GPIO14가 RS에 연결되었는지 확인하세요. 전원을 켠 뒤 3.3V를 측정하고 밝은 빛 아래에서 관찰하세요. 그래도 표시가 안 되면 SPI를 10MHz로 낮추세요. `DIAG_MODE`는 방향과 매핑 확인용일 뿐 화면이 전혀 안 켜질 때는 쓸모가 크지 않습니다.

**Q: ST7306의 TE와 MISO는 연결해야 하나요?**  
A: TE는 프레임 동기 출력인데 이 예제에서는 읽지 않으므로 연결하지 않아도 됩니다. 화면 쓰기에는 MOSI만 사용하고 FPC에도 MISO/SDO가 없으므로, 이 예제에는 레지스터를 읽는 자가 진단 방법이 없습니다. 구버전 예제의 `lcd_read_reg(0x09)` 읽기 값은 화면 상태와 무관하게 항상 `0xFF`였고, v7.5에서 삭제되었습니다. 자세한 내용은 문제 해결 섹션을 참고하세요.

**Q: ESP-IDF로 이 ST7306 화면을 구동할 수 있나요?**  
A: 해당 프로젝트 디렉터리(`Handbook/ESP-IDF/420-…`) 자체가 ESP-IDF 프로젝트이며, 개발 기록에는 ESP-IDF v6.0.2에서 경고 없이 컴파일이 완료되었고 20페이지 데모와 드로잉 함수가 포함된다고 명시되어 있습니다. 이 글에서는 그 빌드를 다시 실행하지 않았고 ESP-IDF 튜토리얼도 다루지 않습니다. 저장소 README를 참고해 직접 연구하실 수 있습니다.

## 응용 아이디어: ST7306 예제를 계속 발전시키기

- `draw_text()`의 5×7 폰트 비트맵을 자신만의 도트 매트릭스 폰트로 바꿔 4색 상태 표시판을 만들어 보세요.
- 기존 페이지에 부분 업데이트 전략을 추가하고 리프레시 시간과 표시 효과를 실측해 보세요.
- TE 신호를 연결해 화면 갱신 타이밍을 어떻게 잡을지 연구하고, 움직임 페이지의 변화를 관찰해 보세요.
- Arduino 버전과 대조하며 ESP-IDF의 20페이지 데모를 읽고, 필요한 드로잉 함수를 자신의 애플리케이션으로 떼어 내 보세요.

## 참고 자료: ESP32-S3, ST7306, Arduino

- [LingShunLAB 프로젝트 홈](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek): 이 글의 배선, 코드, 문서의 출처.
- [Arduino IDE 예제 소스 v7.5](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino): 전체 `.ino`.
- [YDP420H005-V3 모듈 규격서](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/docs/YDP420H005-V3.pdf): 모듈 파라미터, 기구도, FPC 정의.
- [Sitronix ST7306 공식 제품 목록](https://www.sitronix.com.tw/en/products/industrial-display-driver-ic/ultra-low-power-tft-driver-ic/): Sitronix 초저전력 TFT 드라이버 IC 제품 페이지.
- [ST7306 컨트롤러 매뉴얼 v0.1(모듈 제조사 제공)](https://admin.osptek.com/uploads/ST_7306_V0_1_c30c3541a3.pdf): 인터페이스, 레지스터, 프레임버퍼, 타이밍. 저장소 `docs/`에도 사본이 있습니다.
- [Osptek 제조사 예제 코드](https://gitee.com/osptek/display-rlcd-4.2inch-300x400/tree/main/examples): 제조사가 제공하는 관련 표시 예제.
- [Espressif ESP32-S3 공식 제품 페이지](https://www.espressif.com/en/products/socs/esp32-s3)와 [공식 데이터시트](https://documentation.espressif.com/esp32-s3_datasheet_en.html): 메인 컨트롤러 칩 자료.
- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)와 [공식 설치 문서](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html): 보드 지원 패키지 및 설치 방법.
