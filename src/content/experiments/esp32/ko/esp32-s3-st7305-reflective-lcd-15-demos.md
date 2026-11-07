---
title: "ESP32-S3로 ST7305 4.2인치 반사형 모노 LCD 구동하기: 15가지 예제 완전 정복 (4선 SPI + Arduino)"
boardId: esp32s3
moduleId: display/lcd42-st7305-reflective
category: esp32
date: 2026-11-06
intro: "Arduino Nano ESP32(ESP32-S3)와 4선 SPI로 ST7305 4.2인치 300×400 반사형 모노 LCD를 구동하는 완전 정복 튜토리얼입니다. 배선, 업로드, 15가지 디스플레이 예제, 트러블슈팅까지 다루며, 백라이트 없는 반사형 디스플레이를 제대로 활용해 보고 싶은 Arduino 메이커에게 추천합니다."
image: "https://img.lingflux.com/2026/11/e43d291425c39954fa157a9adb62fddb.jpg"
---

> **한 줄 요약**: Arduino Nano ESP32(ESP32-S3) + 4.2인치 ST7305 반사형 모노 LCD. `.ino` 파일 하나로 드라이버 + 15페이지 자동 캐러셀 데모를 돌릴 수 있고, 서드파티 디스플레이 라이브러리는 전혀 필요 없습니다.

```text
난이도: ⭐⭐☆☆☆ (점퍼선 연결과 Arduino IDE 사용법만 알면 바로 시작 가능)
예상 소요 시간: 30분 (접촉 불량과의 사투 시간은 별도)
테스트 환경: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10
```

> **TL;DR(빠른 시작):**
>
> 1. 배선: SCLK → D7/GPIO10, MOSI → D5/GPIO8, CS → D6/GPIO9, DC → D4/GPIO7, RES → D3/GPIO6.
> 2. VCI는 3.3V에 연결하고, 화면과 보드는 GND를 공유합니다. TE, BLC는 연결하지 않습니다. 주의: Nano ESP32의 D5는 GPIO8이지 GPIO11이 아닙니다.
> 3. 보드 지원 패키지 `esp32 by Espressif Systems`를 설치합니다. U8g2, Adafruit GFX 같은 디스플레이 라이브러리는 설치할 필요가 없습니다.
> 4. 함께 제공되는 `ST7305_RLCD_Demo.ino`를 열고, 보드를 `Arduino Nano ESP32`로 선택한 뒤 컴파일·업로드합니다.
> 5. 시리얼 모니터 보드레이트를 115200으로 설정하면, 화면이 15가지 예제를 자동으로 순환 재생합니다. 애니메이션 페이지는 HPM을 쓰고, 정적 페이지는 한 번만 화면에 씁니다.

## 시작하며: 빛을 내지 않아서 오히려 더 잘 보이는 화면

밤에 일반 LCD를 보면 누군가 작은 손전등을 눈에 비추는 기분이 들 때가 있습니다. 전자잉크는 편안하긴 하지만, 애니메이션을 띄우면 버스 기다리는 느낌이죠. 올 거라는 건 아는데 좀처럼 빨라지지 않으니까요.

반사형 LCD는 완전히 다른 길을 갑니다. 백라이트로 픽셀을 비추는 대신 주변 빛을 반사해서, 마치 프로그램으로 내용을 다시 쓸 수 있는 종이처럼 동작합니다. 빛이 충분할수록 오히려 더 선명하게 보이고, 주변이 너무 어두우면 조명을 켜세요. 눈을 가늘게 뜨고 버티는 건 의지의 문제가 아닙니다.

이번 프로젝트에서는 Arduino Nano ESP32(메인 컨트롤러는 ESP32-S3)로 4.2인치, 300×400 해상도, ST7305 컨트롤러를 탑재한 반사형 모노 TFT를 구동해 봅니다. `Hello World` 하나 띄우고 끝내는 게 아니라, 텍스트·그레이스케일·기하 도형·애니메이션·프레임레이트·4방향 회전까지 15가지 예제로 전부 테스트해 보는 게 목표입니다.

여기서 말하는 "눈에 편하다"는 것은 백라이트가 없고 주변광을 반사해서 보는 방식이라는 뜻이지, 의학적 효능 인증은 아닙니다. 눈을 쉬게 해야 할 때는 아무리 좋은 화면도 여러분 대신 눈을 깜빡여 주지 못합니다.

## 최종 결과: 15가지 ST7305 예제 자동 순환 재생

`.ino` 파일 하나를 업로드하면, 화면은 시작 페이지부터 15개 페이지를 자동으로 순환합니다. 버튼도, 시리얼 명령도, 네트워크도, 외부 이미지 리소스도 필요 없습니다.

![ST7305 15가지 예제 순환 재생 효과](https://img.lingflux.com/2026/11/26bdefa52b9c1d4b6e779c08f9744255.jpg)

|    # | 예제          | 주요 확인 포인트                       | 체류 시간 | 목표 프레임레이트 |
| ---: | ------------- | -------------------------------------- | -------: | -------: |
|    1 | Hello World   | 큰 글씨, 테두리, 디더링 배경, 스마일   |   3.5 초 |     정적 |
|    2 | Dither Gray   | 17단계 4×4 Bayer 순서 디더 명암, 그라디언트, 회색 원 (네이티브 그레이스케일이 아니며, 물리 픽셀은 여전히 1bit) |   6.5 초 |     정적 |
|    3 | Geometry      | 직선, 사각형, 원, 삼각형, 다각형       |     5 초 |     정적 |
|    4 | Pixel Grid    | 가장자리, 비율, 대각선, 기하 중앙 정렬 |     5 초 |     정적 |
|    5 | Text & Font   | 5×7 ASCII, 정수 배율 확대, 반전 텍스트 |   5.5 초 |     정적 |
|    6 | Dashboard UI  | 카드, 프로그레스 바, 토글, 배터리, 동적 데이터 |     9 초 |    4 FPS |
|    7 | Frame Rate    | 실측 FPS, 프레임 소요 시간, 54포인트 히스토리 곡선 |   8.5 초 |   제한 없음 |
|    8 | Fine Patterns | 1/2/4 픽셀 체커보드와 미세 라인 깜빡임 |     6 초 |    2 FPS |
|    9 | Bounce        | 튕김 충돌, 모션 잔상 관찰, 충돌 카운트 |     9 초 |   20 FPS |
|   10 | Starfield     | 56개 별의 원근 비행                    |     9 초 |   20 FPS |
|   11 | Game of Life  | 34×34 토러스 경계의 Conway 라이프 게임 |    12 초 |    3 FPS |
|   12 | Uptime Clock  | `esp_timer` 기반 업타임 시계           |     9 초 |    4 FPS |
|   13 | Retro Desktop | 레트로 Macintosh 스타일 데스크톱       |   6.5 초 |     정적 |
|   14 | Inversion     | 전체 화면 흑백 반전과 대비 체크        |     6 초 |    2 FPS |
|   15 | Rotation      | 0°/90°/180°/270° 4방향 전환            |    12 초 |    4 FPS |

목표 프레임레이트는 프로그램이 그리고 전송하는 속도일 뿐, 글라스 패널의 광학 리프레시 레이트와는 다릅니다. 7페이지에서 측정하는 것은 "드로잉 + 15000바이트 전체 프레임 SPI 전송" 시간으로, 화면에 부풀려진 벤치마크 점수를 붙여 주는 게 아닙니다.

YouTube 데모 영상:

<iframe width="560" height="315" src="https://www.youtube.com/embed/IWZMK5AJsvI?si=pXumVzEKfuIYEra9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## 부품 설명

### 4.2인치 반사형 모노 TFT: 주변광으로 "현상"하는 흑백 화면

4.2인치 반사형 모노 TFT는 백라이트가 없는 반사형 모노 액정으로, 주변광을 이용해 흑백 화면을 표시합니다. 이 프로젝트에서는 15가지 테스트 패턴과 동적 UI를 보여 주는 역할을 합니다.

"마이크로컨트롤러의 명령을 들을 수 있는 종이"라고 생각하면 쉽습니다. 주변 조명이 적절할수록 보기 편하고, 주변광이 없다고 해서 스스로 손전등이 되지는 않습니다.

| 파라미터   | 이 프로젝트의 화면        |
| ---------- | ------------------------ |
| 모듈 도번  | W420HC018MONO-12Z        |
| 크기       | 4.2 인치                 |
| 해상도     | 300×400 픽셀, 1 bit 흑백 |
| 표시 방식  | 반사형, 상백(常白), 백라이트 없음 |
| 드라이버 IC | Sitronix ST7305         |
| 메인 인터페이스 | 단일 4선 SPI, 쓰기 전용 |
| 화면 전원  | 2.8V/3.3V, 이 예제에서는 3.3V 사용 |
| 유효 표시 영역 | 63.6×84.84 mm        |
| 동작 온도  | -20℃～+70℃               |

이 화면을 고른 이유는 간단합니다. 300×400이면 완성도 있는 계기판 UI를 그릴 수 있고, 4선 SPI라 핀을 많이 잡아먹지 않으며, 백라이트 회로도 필요 없습니다. 환경 데이터, 시계, 저속 리프레시 대시보드에 딱 맞습니다.

### 핀 설명

이 화면은 12Pin FPC 케이블로 모든 신호를 빼내고, 브레이크아웃 보드와 함께 쓰면 점퍼선으로 개발 보드에 연결할 수 있습니다.

| FPC 핀  | 이름  | 기능                  | 이 예제의 처리    |
| -------: | ----- | --------------------- | ---------------- |
| 1, 5, 12 | GND   | 전원 접지             | 보드 GND에 연결  |
|     2, 3 | NC    | 비연결 핀             | 연결 안 함       |
|        4 | VCI   | 화면 전원             | 3.3V에 연결      |
|        6 | TE    | 프레임 동기 출력      | 미사용, 플로팅   |
|        7 | DC    | 명령/데이터 선택      | GPIO7에 연결     |
|        8 | CS    | SPI 칩 셀렉트, 액티브 로우 | GPIO9에 연결 |
|        9 | SCL   | SPI 클럭              | GPIO10에 연결    |
|       10 | SDA   | SPI 데이터 입력, 즉 MOSI | GPIO8에 연결   |
|       11 | RESET | 하드웨어 리셋, 액티브 로우 | GPIO6에 연결 |

여기서 `SDA`는 SPI MOSI이지 I²C가 아닙니다. 이름은 같아도 하는 일이 다르니, I²C 센서와 친척 취급하면 안 됩니다.

### ST7305: 바이트를 흑백 픽셀로 번역하는 "분류기"

ST7305는 Sitronix의 초저전력 모노 TFT 컨트롤러/드라이버 IC로, 메인 컨트롤러의 명령을 받고 디스플레이 메모리를 관리하며 패널을 구동하는 역할을 합니다. 이 프로젝트에서는 ESP32-S3가 보낸 프레임 데이터를 화면의 흑백 픽셀로 바꾸는 일을 담당합니다.

| 파라미터       | 값 또는 이 프로젝트의 설정            |
| -------------- | ------------------------------------ |
| 최대 구동 능력 | 408×408 모노 픽셀                    |
| 픽셀 깊이      | 1 bit/픽셀                           |
| SPI 쓰기 사이클 하한 | 30 ns, 약 33 MHz 상한에 해당   |
| 이 프로젝트 SPI | Mode 0, 20 MHz, MSB first           |
| HPM 프레임레이트 | 16 Hz 또는 32 Hz; 이 예제는 16 Hz로 설정 |
| LPM 프레임레이트 | 0.25～8 Hz; 이 예제는 초기화에서 8 Hz로 설정 |
| 이 프로젝트 전체 프레임 데이터 | 15000 바이트          |

레지스터가 많아서 프로페셔널해 보여서 고른 게 아닙니다. 모듈이 이미 잘 패키징되어 있어서, 메인 컨트롤러는 SPI, DC, CS, RESET만으로 전체 화면 리프레시를 끝낼 수 있기 때문입니다.

### FPC 브레이크아웃 보드: "가는 플랫 케이블"을 "점퍼선"으로 번역

FPC 브레이크아웃 보드는 화면의 12Pin FPC를 실험하기 편한 핀헤더로 빼내 주는 인터페이스 변환 보드입니다. 이 프로젝트에서는 화면을 점퍼선으로 바로 개발 보드에 연결할 수 있게 해 주는 역할을 합니다.

| 파라미터 | 이 프로젝트의 사용 상황                 |
| -------- | -------------------------------------- |
| 화면 측  | 12Pin FPC                              |
| 실험 측  | GND, VCC, SCL, SDA, RES, DC, CS, BLC   |
| 필수 신호 | 제어선 5개 + 3.3V + GND                |
| 연결 생략 가능 | TE, BLC                          |

얇은 플랫 케이블을 맨손으로 납땜하지 않으려고 쓰는 겁니다. 우리는 디스플레이 실험을 하는 거지, 안과 검사와 납땜 시험에 동시 응시하는 게 아니니까요.

## BOM 목록

| 부품                       |     수량 | 필수 여부 | 비고                            |
| -------------------------- | -------: | --------- | ------------------------------- |
| Arduino Nano ESP32 개발 보드 |       1 | 필수      | 메인 컨트롤러가 ESP32-S3        |
| 4.2인치 ST7305 반사형 모노 LCD |     1 | 필수      | 300×400, 3.3V 전원              |
| 전용 FPC 브레이크아웃 보드 |        1 | 권장      | 배선 편의용, FPC 커넥터로 대체 가능 |
| 점퍼선                     | 7개 이상 | 필수      | 가급적 짧게, 접촉·신호 문제 예방 |

## 배선: ESP32-S3 4선 SPI로 ST7305 연결하기

![ST7305와 Arduino Nano ESP32 배선 실사진](https://img.lingflux.com/2026/11/a029c2eab88f09f46c951a53287b647e.jpg)

```text
Arduino Nano ESP32                         ST7305 화면 브레이크아웃 보드
┌──────────────────┐                     ┌──────────────────┐
│ D7  / GPIO10     │ ───── SCLK ───────► │ SCL              │
│ D5  / GPIO8      │ ───── MOSI ───────► │ SDA              │
│ D6  / GPIO9      │ ───── CS ─────────► │ CS               │
│ D4  / GPIO7      │ ───── DC ─────────► │ DC               │
│ D3  / GPIO6      │ ───── RESET ──────► │ RES              │
│ 3V3              │ ───── 3.3V ───────► │ VCC / VCI        │
│ GND              │ ───── 공통 접지 ──► │ GND              │
└──────────────────┘                     └──────────────────┘
```

| 브레이크아웃 실크 | 화면 FPC | Nano ESP32 실크 | ESP32-S3 GPIO | 용도               |
| ---------- | --------: | --------------- | ------------: | ------------------ |
| SCL        |      PIN9 | D7              |        GPIO10 | SPI 클럭           |
| SDA        |     PIN10 | D5              |         GPIO8 | SPI MOSI           |
| CS         |      PIN8 | D6              |         GPIO9 | 칩 셀렉트          |
| DC         |      PIN7 | D4              |         GPIO7 | 명령/데이터 선택   |
| RES        |     PIN11 | D3              |         GPIO6 | 하드웨어 리셋      |
| VCC/VCI    |      PIN4 | 3V3             |     3.3V 전원 | 화면 전원          |
| GND        | PIN1/5/12 | GND             |           GND | 공통 접지          |
| TE         |      PIN6 | 연결 안 함      |             — | 이 예제는 프레임 동기 미사용 |
| BLC        |         — | 연결 안 함      |             — | 반사형 화면이라 백라이트 없음 |

**이 예제에서 VCI는 3.3V에 연결하세요. 5V, VBUS, VIN에 연결하면 안 됩니다.**

### 별도 드라이버 회로 없이 ESP32-S3가 화면 FPC에 직접 연결 가능

이 화면은 3.3V 전원으로 ESP32-S3의 GPIO에서 바로 구동할 수 있습니다. FPC의 SCL, SDA, CS, DC, RESET을 각각 대응하는 GPIO에 연결하고, VCI는 3.3V, GND는 공통 접지하면 됩니다. 중간에 레벨 시프터 칩, 전용 디스플레이 드라이버 보드 같은 주변 회로를 추가할 필요가 없습니다.

여기서 "직접 연결"은 **전기적 연결**을 말하는 것이지, 부드러운 플랫 케이블을 개발 보드 핀헤더에 바로 꽂으라는 뜻이 아닙니다. 실제 제작 시에는 12Pin FPC 커넥터, 솔더 소켓 또는 브레이크아웃 보드를 사용해 플랫 케이블 접점을 확실히 빼내야 합니다. 이 글에서 브레이크아웃 보드를 쓰는 건 점퍼선 연결이 편해서일 뿐이고, 기계적 변환 역할이지 화면 동작에 꼭 필요한 드라이버 회로는 아닙니다. FPC 커넥터에서 직접 배선한다면 위 표의 FPC PIN 번호대로 연결하면 되고, 신호 관계는 완전히 동일합니다.

배선에서 가장 말리기 쉬운 포인트는, 코드에 넣는 값이 보드 실크의 숫자가 아니라 칩의 GPIO 번호라는 것입니다. 이 예제는 `D5 = GPIO8`이고, `GPIO11 = A4`입니다. MOSI를 GPIO11에 잘못 연결해도 프로그램은 정상 실행되고 시리얼도 정상 출력되지만, 화면은 전기세를 안 낸 것처럼 조용할 겁니다.

배선이 끝나면 "전원 → 공통 접지 → SCLK → MOSI → CS → DC → RESET" 순서로 하나씩 확인해 보세요. 디버깅 시간의 80%를 절약할 수 있습니다. FPC도 삽입 방향이 맞는지, 끝까지 완전히 들어갔는지, 잠금이 됐는지 확인하세요. 한 칸만 헐거워도 화면 전체가 파업합니다.

## 설치할 라이브러리: ESP32 보드 지원 패키지만 설치

이 ST7305 Arduino 예제는 U8g2, Adafruit GFX, TFT_eSPI 또는 추가 폰트 라이브러리에 의존하지 않습니다. 드라이버, 5×7 ASCII 폰트, 그래픽 프리미티브, 15개 페이지가 모두 하나의 `.ino` 파일 안에 있습니다.

### 1단계: Arduino IDE 설치

이 글은 Arduino IDE 2.3.8을 사용하며, Arduino 공식 웹사이트에서 다운로드해 설치할 수 있습니다.

### 2단계: ESP32 Arduino Core 설치

보드 매니저를 열고 다음을 검색해 설치하세요.

```text
esp32 by Espressif Systems (이 글의 테스트 버전 3.3.10)
```

보드 매니저에서 이 글과 동일한 버전을 선택하면, 보드 지원 패키지 간 API와 기본 설정 차이를 줄일 수 있습니다.

### 3단계: 보드와 시리얼 포트 선택

```text
보드: Arduino Nano ESP32
포트: 개발 보드 연결 후 나타나는 해당 포트 선택
시리얼 모니터: 115200
```

Arduino 표준 `SPI`, 타이머, `esp_timer`는 모두 보드 환경에서 제공되므로, 라이브러리 매니저에서 "이름이 비슷한 라이브러리 몇 개를 운에 맡겨 설치"할 필요가 없습니다.

### 보충: 기성 라이브러리를 쓰고 싶다면 어떤 선택지가 있을까?

이 튜토리얼이 단일 파일 드라이버를 쓰는 이유는 초기화, 프레임버퍼, 픽셀 매핑을 직접 확인할 수 있게 하려는 것이지, ST7305가 라이브러리를 쓸 수 없다는 뜻이 아닙니다. 이 프로젝트를 기반으로 2차 개발을 한다면 요구에 따라 다음 방안을 고려할 수 있습니다.

| 방안                                                         | 적합한 상황                          | 사용 시 주의점                                                  |
| ------------------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------- |
| [U8g2](https://github.com/olikraus/u8g2) v2.36 이상          | 텍스트, 기본 그래픽, 풍부한 폰트     | `U8G2_ST7305_300X400_1_4W_HW_SPI`를 제공하며 이 예제 해상도의 4선 하드웨어 SPI 지원. 설치 시 라이브러리 버전을 확인하고 CS, DC, RESET 및 SPI 핀을 이 글에서 쓰는 GPIO로 변경 |
| [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library) | 전용 ST7305 Arduino 드라이버를 바로 쓰고 싶을 때 | `ST7305_4p2_BW_DisplayDriver` 등 래퍼 제공. 해상도, 초기화 시퀀스, `DisplayConfig.h` 핀 설정 확인 필요. 이 글에서는 해당 모듈에서 아직 실측하지 않음 |
| LVGL + ST7305 저수준 드라이버                                | 복잡한 UI, 위젯, 페이지 관리         | LVGL은 UI 담당이지 ST7305 드라이버를 대체하지 않음. 이 글의 드라이버나 벤더 드라이버를 디스플레이 리프레시 콜백에 연결하고, 프레임버퍼 점유와 실제 리프레시 효과를 평가해야 함 |

Adafruit GFX, TFT_eSPI, Arduino_GFX 같은 범용 그래픽 라이브러리를 설치하면 ST7305를 바로 구동할 수 있다고 기본 가정하지 마세요. 현재 버전이 이 컨트롤러를 명시적으로 지원하는지 먼저 확인하고, 아니라면 직접 어댑테이션해야 합니다. 라이브러리를 바꿔도 3.3V 전원, 4선 SPI, HPM/LPM, 2행×4열 픽셀 매핑 같은 하드웨어 제약은 사라지지 않습니다.

**간단한 선택 가이드:** 주로 텍스트와 기본 그래픽을 표시한다면 U8g2부터, 복잡한 UI를 만들고 싶다면 LVGL을, 초기화·전체 프레임 전송·애니메이션 타이밍을 완전히掌控하고 싶다면 이 글의 단일 파일 방안이 더 직관적입니다.

## 완전한 코드: ST7305_RLCD_Demo 단일 파일 Arduino 프로그램

완전히 플래시 가능한 소스 코드:

```c
/*
 * ST7305 4.2인치 300x400 반사형 모노 LCD —— Arduino 단일 파일 완전 Demo
 *
 * ESP-IDF 버전과 기능 동일: 드라이버 + 그래픽 프리미티브 + 15페이지 자동 순환 데모.
 * 프로그램 전체가 이 .ino 파일 하나뿐, 서드파티 라이브러리 의존 없이 바로 배포 가능.
 *
 * 배선 (Arduino Nano ESP32 실크):
 *   SCLK = GPIO10 (D7)   MOSI = GPIO8 (D5)   CS  = GPIO9 (D6)
 *   DC   = GPIO7  (D4)   RES  = GPIO6 (D3)   VCI = 3.3V  GND = GND
 *
 * Arduino IDE 준비:
 *   1. 보드 매니저에서 "esp32 by Espressif Systems" 설치
 *   2. 보드를 "Arduino Nano ESP32"로 선택하고 해당 시리얼 포트 선택
 *   3. 이 파일은 동명 폴더에 넣어야 함 (IDE가 .ino를 열 때 안내, "확인" 클릭)
 */
#include <Arduino.h>
#include <SPI.h>
#include "esp_timer.h"   /* esp_timer_get_time() */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>

/* ================= 사용자 수정 가능: 핀과 SPI 클럭 ================= */
#define PIN_SCLK        10
#define PIN_MOSI         8
#define PIN_CS           9
#define PIN_DC           7
#define PIN_RES          6
#define SPI_CLOCK_HZ     20000000UL   /* 이 예제에서는 20 MHz를 사용한다. 화면이 깨지면 먼저 8/5 MHz로 낮춰 점검한다 */

/* ================= ST7305 기본 파라미터 ================= */
#define ST7305_LCD_WIDTH      300
#define ST7305_LCD_HEIGHT     400
#define ST7305_DATA_WIDTH     75      /* 행당 300/4 = 75 바이트 */
#define ST7305_BUFFER_LENGTH  15000   /* 75 * 200 */
#define ST7305_COLOR_WHITE    0x00
#define ST7305_COLOR_BLACK    0x01

#define LOGI(fmt, ...) Serial.printf("[st7305] " fmt "\r\n", ##__VA_ARGS__)

/* 드라이버 디바이스 (단일 인스턴스, 프레임버퍼 15000 바이트 내장) */
typedef struct {
    int gpio_dc;
    int gpio_res;
    int gpio_cs;
    uint32_t clock_hz;
    uint8_t rotation;                      /* 0=0° 1=90° 2=180° 3=270°(시계 방향) */
    uint8_t buffer[ST7305_BUFFER_LENGTH];
} st7305_dev_t;

typedef st7305_dev_t *st7305_handle_t;

static st7305_dev_t lcd_dev;               /* 전역 유일 인스턴스 */

static inline void dc_cmd(st7305_handle_t dev)  { digitalWrite(dev->gpio_dc, LOW); }
static inline void dc_data(st7305_handle_t dev) { digitalWrite(dev->gpio_dc, HIGH); }

static void spi_write_byte(st7305_handle_t dev, uint8_t data)
{
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.transfer(data);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/* 레지스터 쓰기 (명령): DC=low */
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);
    spi_write_byte(dev, reg);
}

/* 파라미터 쓰기 (데이터): DC=high */
static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);
    spi_write_byte(dev, data);
}

static void write_params(st7305_handle_t dev, uint8_t reg, const uint8_t *params, size_t len)
{
    write_register(dev, reg);
    for (size_t i = 0; i < len; i++) write_parameter(dev, params[i]);
}

/**
 * ST7305 초기화 시퀀스: 벤더 HSD 4.2" 300x400 고스캔레이트 초기화 코드와 동일.
 * MADCTL=0x48(MX=1, DO=1), Sleep-out 지연 255ms, CASET 컬럼 윈도우 0x12~0x2B.
 */
static void initial_st7305(st7305_handle_t dev)
{
    /* 하드웨어 리셋 */
    digitalWrite(dev->gpio_res, HIGH); delay(10);
    digitalWrite(dev->gpio_res, LOW);  delay(10);
    digitalWrite(dev->gpio_res, HIGH); delay(10);

#define WR(reg, ...) do { \
        const uint8_t p[] = {__VA_ARGS__}; \
        write_params(dev, reg, p, sizeof(p)); \
    } while (0)

    WR(0xD6, 0x17, 0x02);   /* NVM Load Control */
    WR(0xD1, 0x01);         /* Booster Enable */
    WR(0xC0, 0x11, 0x04);   /* Gate Voltage: VGH=16.5V, VGL=-7V */
    WR(0xC1, 0x41, 0x41, 0x41, 0x41);  /* VSHP 5.0V x4 */
    WR(0xC2, 0x19, 0x19, 0x19, 0x19);  /* VSLP 0.5V x4 */
    WR(0xC4, 0x41, 0x41, 0x41, 0x41);  /* VSHN -3.8V x4 */
    WR(0xC5, 0x19, 0x19, 0x19, 0x19);  /* VSLN 0.5V x4 */
    WR(0xD8, 0xA6, 0xE9);   /* OSC: HPM~51Hz / LPM~1Hz */
    WR(0xB2, 0x05);         /* Frame Rate: HPM=16Hz, LPM=8Hz */
    WR(0xB3, 0xE5, 0xF6, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45); /* Gate EQ HPM */
    WR(0xB4, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45);             /* Gate EQ LPM */
    WR(0x62, 0x32, 0x03, 0x1F); /* Gate Timing Control */
    WR(0xB7, 0x13);         /* Source EQ Enable */
    WR(0xB0, 0x64);         /* Gate Line: 400행 (Sleep-out 전에 설정 필요) */

    write_register(dev, 0x11);  /* Sleep out */
    delay(255);

    WR(0xC9, 0x00);         /* Source Voltage Select: 그룹 1 */
    WR(0x36, 0x48);         /* MADCTL: MX=1, DO=1 */
    WR(0x3A, 0x11);         /* Data Format: 3-write 24-bit */
    WR(0xB9, 0x20);         /* Mono 모드 (벤더 레거시) */
    WR(0xB8, 0x29);         /* Panel: 1-dot 구동 극성 반전 표시 + Frame 스캔 */

    write_register(dev, 0x21);  /* Inverse ON */

    /* WRITE RAM 300*400 주소 윈도우 */
    WR(0x2A, 0x12, 0x2B);   /* CASET */
    WR(0x2B, 0x00, 0xC7);   /* RASET 0~199 */
    WR(0x35, 0x00);         /* TE ON (V-Blank) */
    WR(0xD0, 0xFF);         /* Auto power down */

    write_register(dev, 0x39);  /* LPM */
    write_register(dev, 0x29);  /* DISPLAY ON */
#undef WR
}

st7305_handle_t st7305_init(int gpio_dc, int gpio_res, int gpio_cs,
                            int gpio_sclk, int gpio_mosi, uint32_t clock_hz)
{
    st7305_handle_t dev = &lcd_dev;
    dev->gpio_dc = gpio_dc;
    dev->gpio_res = gpio_res;
    dev->gpio_cs = gpio_cs;
    dev->clock_hz = clock_hz;
    dev->rotation = 0;

    pinMode(gpio_dc, OUTPUT);
    pinMode(gpio_res, OUTPUT);
    pinMode(gpio_cs, OUTPUT);
    digitalWrite(gpio_cs, HIGH);
    digitalWrite(gpio_res, HIGH);

    /* MOSI만 있고 MISO 없음; CS는 소프트웨어로 수동 제어 */
    SPI.begin(gpio_sclk, -1, gpio_mosi, -1);

    initial_st7305(dev);
    memset(dev->buffer, 0, ST7305_BUFFER_LENGTH);
    LOGI("ST7305 init OK (%dx%d)", ST7305_LCD_WIDTH, ST7305_LCD_HEIGHT);
    return dev;
}

/** 프레임버퍼 채우기 (0x00 전체 흰색 / 0xFF 전체 검정) */
void st7305_fill(st7305_handle_t dev, uint8_t data)
{
    memset(dev->buffer, data, ST7305_BUFFER_LENGTH);
}

/** 프레임버퍼 지우기 (전체 흰색) */
void st7305_clear(st7305_handle_t dev)
{
    st7305_fill(dev, 0x00);
}
/**
 * 표시 방향 설정: 0=0°, 1=시계 방향 90°, 2=180°, 3=시계 방향 270°.
 * 회전은 프레임버퍼 좌표 매핑으로 구현; 90°/270°일 때 논리 해상도는 400x300.
 * 이후 그리기에만 영향, 프레임버퍼를 지우거나 즉시 화면을 갱신하지 않음.
 */
void st7305_set_rotation(st7305_handle_t dev, uint8_t rotation)
{
    if (rotation <= 3) dev->rotation = rotation;
}

/** 현재 방향 가져오기 (0~3) */
uint8_t st7305_get_rotation(st7305_handle_t dev)
{
    return dev->rotation;
}

/** 현재 방향의 논리 너비/높이 가져오기 */
int st7305_get_width(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
}

int st7305_get_height(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
}

/**
 * 논리 픽셀을 먼저 표시 방향에 따라 300x400 물리 좌표로 매핑한 뒤 프레임버퍼에 기록:
 *   한 바이트 8 bit가 2행 x 4열 픽셀에 대응:
 *     행0: BIT7 BIT5 BIT3 BIT1   (짝수 bit -> 다음 행)
 *     행1: BIT6 BIT4 BIT2 BIT0
 *   1 = 검정, 0 = 흰색
 */
void st7305_write_point(st7305_handle_t dev, int x, int y, uint16_t color)
{
    int logical_width = (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
    int logical_height = (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
    if (x < 0 || y < 0 || x >= logical_width || y >= logical_height) return;

    int physical_x;
    int physical_y;
    switch (dev->rotation) {
    case 1: /* 시계 방향 90°, 논리 400x300 */
        physical_x = ST7305_LCD_WIDTH - 1 - y;
        physical_y = x;
        break;
    case 2: /* 180°, 논리 300x400 */
        physical_x = ST7305_LCD_WIDTH - 1 - x;
        physical_y = ST7305_LCD_HEIGHT - 1 - y;
        break;
    case 3: /* 시계 방향 270°, 논리 400x300 */
        physical_x = y;
        physical_y = ST7305_LCD_HEIGHT - 1 - x;
        break;
    default: /* 0°, 논리 300x400 */
        physical_x = x;
        physical_y = y;
        break;
    }

    int real_x = physical_x / 4;
    int real_y = physical_y / 2;
    int index = real_y * ST7305_DATA_WIDTH + real_x;
    int one_two = physical_y % 2;          /* 0 또는 1 */
    int line_bit_4 = physical_x % 4;       /* 0~3 */
    int bit = 7 - (line_bit_4 * 2 + one_two);

    if (color) dev->buffer[index] |= (1 << bit);
    else dev->buffer[index] &= ~(1 << bit);
}

/** 주소 윈도우 설정 후 RAMWR 개시 */
static void set_address_window(st7305_handle_t dev)
{
    write_params(dev, 0x2A, (uint8_t[]){0x12, 0x2A}, 2); /* CASET 0x12~0x2A */
    write_params(dev, 0x2B, (uint8_t[]){0x00, 0xC7}, 2); /* RASET 0~199 */
    write_register(dev, 0x2C); /* RAMWR */
}

/** 전체 프레임 리프레시: 15000 바이트 프레임버퍼를 화면으로 푸시 */
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);
    dc_data(dev);
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/** 저전력 모드 LPM 진입 (0x39), 절전, 프레임레이트는 B2h가 결정 */
void st7305_low_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x39);
}

/** 고전력 모드 HPM 진입 (0x38), 동적 화면용, 16/32Hz */
void st7305_high_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x38);
}

/** 디스플레이 온/오프 (0x29 / 0x28) */
void st7305_display_on(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x29 : 0x28);
}

/** 반전 표시 온/오프 (0x21 / 0x20); 상백 화면에서 검정을 표시하려면 반전 ON 필요 */
void st7305_display_inversion(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x21 : 0x20);
}

/** 프레임버퍼 포인터 가져오기 (고급 사용법, 비트맵 데이터를 직접 조작 가능) */
uint8_t *st7305_get_buffer(st7305_handle_t dev)
{
    return dev->buffer;
}

/* ================= 그래픽 프리미티브 (ST73XX_UI에서 이식) ================= */

#define SWAP_INT(a, b) do { int _t = (a); (a) = (b); (b) = _t; } while (0)

void ui_draw_fast_hline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x + i, y, color);
}

void ui_draw_fast_vline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x, y + i, color);
}

void ui_draw_line(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    int dx = abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    int dy = -abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    int err = dx + dy, e2;

    while (1) {
        st7305_write_point(dev, x1, y1, color);
        if (x1 == x2 && y1 == y2) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
    }
}

void ui_draw_triangle(st7305_handle_t dev, int x1, int y1, int x2, int y2,
                      int x3, int y3, uint16_t color)
{
    ui_draw_line(dev, x1, y1, x2, y2, color);
    ui_draw_line(dev, x2, y2, x3, y3, color);
    ui_draw_line(dev, x3, y3, x1, y1, color);
}

void ui_draw_filled_triangle(st7305_handle_t dev, int x0, int y0, int x1, int y1,
                             int x2, int y2, uint16_t color)
{
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }
    if (y1 > y2) { SWAP_INT(y1, y2); SWAP_INT(x1, x2); }
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }

    if (y0 == y2) { /* 평탄한 밑변 */
        int xs = x0, xe = x0;
        if (x1 < xs) xs = x1;
        if (x1 > xe) xe = x1;
        if (x2 < xs) xs = x2;
        if (x2 > xe) xe = x2;
        ui_draw_fast_hline(dev, xs, y0, xe - xs + 1, color);
        return;
    }

    int total = y2 - y0;
    for (int i = 0; i <= total; i++) {
        int y = y0 + i;
        int second_half = (i > y1 - y0) || (y1 == y0);
        int seg = second_half ? (y2 - y1) : (y1 - y0);
        if (seg == 0) continue;
        int ax = x0 + (int)((x2 - x0) * (int64_t)i / total);
        int bx = second_half ? x1 + (int)((x2 - x1) * (int64_t)(i - (y1 - y0)) / seg)
                             : x0 + (int)((x1 - x0) * (int64_t)i / seg);
        if (ax > bx) SWAP_INT(ax, bx);
        ui_draw_fast_hline(dev, ax, y, bx - ax + 1, color);
    }
}

void ui_draw_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    ui_draw_fast_hline(dev, x1, y1, x2 - x1 + 1, color);
    ui_draw_fast_hline(dev, x1, y2, x2 - x1 + 1, color);
    ui_draw_fast_vline(dev, x1, y1, y2 - y1 + 1, color);
    ui_draw_fast_vline(dev, x2, y1, y2 - y1 + 1, color);
}

void ui_draw_filled_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    for (int y = y1; y <= y2; y++) {
        ui_draw_fast_hline(dev, x1, y, x2 - x1 + 1, color);
    }
}

void ui_draw_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    int x = 0, y = r, d = 3 - 2 * r;
    while (x <= y) {
        st7305_write_point(dev, xc + x, yc + y, color);
        st7305_write_point(dev, xc - x, yc + y, color);
        st7305_write_point(dev, xc + x, yc - y, color);
        st7305_write_point(dev, xc - x, yc - y, color);
        st7305_write_point(dev, xc + y, yc + x, color);
        st7305_write_point(dev, xc - y, yc + x, color);
        st7305_write_point(dev, xc + y, yc - x, color);
        st7305_write_point(dev, xc - y, yc - x, color);
        if (d < 0) {
            d += 4 * x + 6;
        } else {
            d += 4 * (x - y) + 10;
            y--;
        }
        x++;
    }
}
static int int_sqrt(int x)
{
    int r = 0;
    while ((r + 1) * (r + 1) <= x) r++;
    return r;
}

void ui_draw_filled_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    for (int y = -r; y <= r; y++) {
        int w = int_sqrt(r * r - y * y);
        ui_draw_fast_hline(dev, xc - w, yc + y, 2 * w + 1, color);
    }
}

void ui_draw_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;
    for (int i = 0; i < n; i++) {
        int x1 = points[2 * i], y1 = points[2 * i + 1];
        int x2 = points[2 * ((i + 1) % n)], y2 = points[2 * ((i + 1) % n) + 1];
        ui_draw_line(dev, x1, y1, x2, y2, color);
    }
}

void ui_draw_filled_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;

    int min_y = points[1], max_y = points[1];
    for (int i = 1; i < n; i++) {
        if (points[2 * i + 1] < min_y) min_y = points[2 * i + 1];
        if (points[2 * i + 1] > max_y) max_y = points[2 * i + 1];
    }

    int *xs = (int *)malloc(n * sizeof(int));
    if (!xs) return;

    /* 스캔라인 채우기 */
    for (int y = min_y; y <= max_y; y++) {
        int cnt = 0;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            int yi = points[2 * i + 1], yj = points[2 * j + 1];
            int xi = points[2 * i], xj = points[2 * j];
            if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
                xs[cnt++] = xi + (int)((int64_t)(y - yi) * (xj - xi) / (yj - yi));
            }
        }
        /* 삽입 정렬 */
        for (int i = 1; i < cnt; i++) {
            int key = xs[i], k = i - 1;
            while (k >= 0 && xs[k] > key) { xs[k + 1] = xs[k]; k--; }
            xs[k + 1] = key;
        }
        for (int i = 0; i + 1 < cnt; i += 2) {
            ui_draw_fast_hline(dev, xs[i], y, xs[i + 1] - xs[i] + 1, color);
        }
    }
    free(xs);
}

/* ================= Demo: 15페이지 자동 순환 =================
 * 텍스트, 순서 디더링 그레이, 테스트 패턴, 성능 벤치마크, UI 샘플, 작은 애니메이션.
 * 외부 폰트와 에셋 없음. */

#define W ST7305_LCD_WIDTH
#define H ST7305_LCD_HEIGHT
#define BLACK ST7305_COLOR_BLACK
#define WHITE ST7305_COLOR_WHITE
#define ARRAY_LEN(a) ((int)(sizeof(a) / sizeof((a)[0])))

/* 클래식 5x7 ASCII 폰트, 컬럼 인코딩, 최하위 비트가 위쪽. */
static const uint8_t font5x7[96][5] = {
    {0x00,0x00,0x00,0x00,0x00},{0x00,0x00,0x5f,0x00,0x00},
    {0x00,0x07,0x00,0x07,0x00},{0x14,0x7f,0x14,0x7f,0x14},
    {0x24,0x2a,0x7f,0x2a,0x12},{0x23,0x13,0x08,0x64,0x62},
    {0x36,0x49,0x55,0x22,0x50},{0x00,0x05,0x03,0x00,0x00},
    {0x00,0x1c,0x22,0x41,0x00},{0x00,0x41,0x22,0x1c,0x00},
    {0x14,0x08,0x3e,0x08,0x14},{0x08,0x08,0x3e,0x08,0x08},
    {0x00,0x50,0x30,0x00,0x00},{0x08,0x08,0x08,0x08,0x08},
    {0x00,0x60,0x60,0x00,0x00},{0x20,0x10,0x08,0x04,0x02},
    {0x3e,0x51,0x49,0x45,0x3e},{0x00,0x42,0x7f,0x40,0x00},
    {0x42,0x61,0x51,0x49,0x46},{0x21,0x41,0x45,0x4b,0x31},
    {0x18,0x14,0x12,0x7f,0x10},{0x27,0x45,0x45,0x45,0x39},
    {0x3c,0x4a,0x49,0x49,0x30},{0x01,0x71,0x09,0x05,0x03},
    {0x36,0x49,0x49,0x49,0x36},{0x06,0x49,0x49,0x29,0x1e},
    {0x00,0x36,0x36,0x00,0x00},{0x00,0x56,0x36,0x00,0x00},
    {0x08,0x14,0x22,0x41,0x00},{0x14,0x14,0x14,0x14,0x14},
    {0x00,0x41,0x22,0x14,0x08},{0x02,0x01,0x51,0x09,0x06},
    {0x32,0x49,0x79,0x41,0x3e},{0x7e,0x11,0x11,0x11,0x7e},
    {0x7f,0x49,0x49,0x49,0x36},{0x3e,0x41,0x41,0x41,0x22},
    {0x7f,0x41,0x41,0x22,0x1c},{0x7f,0x49,0x49,0x49,0x41},
    {0x7f,0x09,0x09,0x09,0x01},{0x3e,0x41,0x49,0x49,0x7a},
    {0x7f,0x08,0x08,0x08,0x7f},{0x00,0x41,0x7f,0x41,0x00},
    {0x20,0x40,0x41,0x3f,0x01},{0x7f,0x08,0x14,0x22,0x41},
    {0x7f,0x40,0x40,0x40,0x40},{0x7f,0x02,0x0c,0x02,0x7f},
    {0x7f,0x04,0x08,0x10,0x7f},{0x3e,0x41,0x41,0x41,0x3e},
    {0x7f,0x09,0x09,0x09,0x06},{0x3e,0x41,0x51,0x21,0x5e},
    {0x7f,0x09,0x19,0x29,0x46},{0x46,0x49,0x49,0x49,0x31},
    {0x01,0x01,0x7f,0x01,0x01},{0x3f,0x40,0x40,0x40,0x3f},
    {0x1f,0x20,0x40,0x20,0x1f},{0x3f,0x40,0x38,0x40,0x3f},
    {0x63,0x14,0x08,0x14,0x63},{0x07,0x08,0x70,0x08,0x07},
    {0x61,0x51,0x49,0x45,0x43},{0x00,0x7f,0x41,0x41,0x00},
    {0x02,0x04,0x08,0x10,0x20},{0x00,0x41,0x41,0x7f,0x00},
    {0x04,0x02,0x01,0x02,0x04},{0x40,0x40,0x40,0x40,0x40},
    {0x00,0x01,0x02,0x04,0x00},{0x20,0x54,0x54,0x54,0x78},
    {0x7f,0x48,0x44,0x44,0x38},{0x38,0x44,0x44,0x44,0x20},
    {0x38,0x44,0x44,0x48,0x7f},{0x38,0x54,0x54,0x54,0x18},
    {0x08,0x7e,0x09,0x01,0x02},{0x0c,0x52,0x52,0x52,0x3e},
    {0x7f,0x08,0x04,0x04,0x78},{0x00,0x44,0x7d,0x40,0x00},
    {0x20,0x40,0x44,0x3d,0x00},{0x7f,0x10,0x28,0x44,0x00},
    {0x00,0x41,0x7f,0x40,0x00},{0x7c,0x04,0x18,0x04,0x78},
    {0x7c,0x08,0x04,0x04,0x78},{0x38,0x44,0x44,0x44,0x38},
    {0x7c,0x14,0x14,0x14,0x08},{0x08,0x14,0x14,0x18,0x7c},
    {0x7c,0x08,0x04,0x04,0x08},{0x48,0x54,0x54,0x54,0x20},
    {0x04,0x3f,0x44,0x40,0x20},{0x3c,0x40,0x40,0x20,0x7c},
    {0x1c,0x20,0x40,0x20,0x1c},{0x3c,0x40,0x30,0x40,0x3c},
    {0x44,0x28,0x10,0x28,0x44},{0x0c,0x50,0x50,0x50,0x3c},
    {0x44,0x64,0x54,0x4c,0x44},{0x00,0x08,0x36,0x41,0x00},
    {0x00,0x00,0x7f,0x00,0x00},{0x00,0x41,0x36,0x08,0x00},
    {0x08,0x04,0x08,0x10,0x08},{0x00,0x00,0x00,0x00,0x00}
};

static const uint8_t bayer4[4][4] = {
    {0, 8, 2, 10}, {12, 4, 14, 6}, {3, 11, 1, 9}, {15, 7, 13, 5}
};

static void text_char(st7305_handle_t d, int x, int y, char c, int scale, uint16_t color)
{
    if ((unsigned char)c < 32 || (unsigned char)c > 127) c = '?';
    const uint8_t *glyph = font5x7[(unsigned char)c - 32];
    for (int col = 0; col < 5; col++) {
        for (int row = 0; row < 7; row++) {
            if (glyph[col] & (1U << row)) {
                if (scale == 1) st7305_write_point(d, x + col, y + row, color);
                else ui_draw_filled_rectangle(d, x + col * scale, y + row * scale,
                    x + (col + 1) * scale - 1, y + (row + 1) * scale - 1, color);
            }
        }
    }
}

static void text(st7305_handle_t d, int x, int y, const char *s, int scale, uint16_t color)
{
    while (*s) {
        text_char(d, x, y, *s++, scale, color);
        x += 6 * scale;
    }
}

static int text_width(const char *s, int scale)
{
    int n = (int)strlen(s);
    return n ? (n * 6 - 1) * scale : 0;
}
static void text_center(st7305_handle_t d, int y, const char *s, int scale, uint16_t color)
{
    text(d, (W - text_width(s, scale)) / 2, y, s, scale, color);
}

static void gray_rect(st7305_handle_t d, int x0, int y0, int x1, int y1, int level)
{
    if (x0 > x1) { int t = x0; x0 = x1; x1 = t; }
    if (y0 > y1) { int t = y0; y0 = y1; y1 = t; }
    if (level <= 0) return;
    if (level >= 16) {
        ui_draw_filled_rectangle(d, x0, y0, x1, y1, BLACK);
        return;
    }
    for (int y = y0; y <= y1; y++) {
        for (int x = x0; x <= x1; x++) {
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, x, y, BLACK);
        }
    }
}

static void gray_circle(st7305_handle_t d, int cx, int cy, int r, int level)
{
    for (int y = -r; y <= r; y++) {
        for (int x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r && level > bayer4[(cy + y) & 3][(cx + x) & 3]) {
                st7305_write_point(d, cx + x, cy + y, BLACK);
            }
        }
    }
}

static void hline(st7305_handle_t d, int x0, int x1, int y, uint16_t color)
{
    ui_draw_fast_hline(d, x0, y, x1 - x0 + 1, color);
}

static void vline(st7305_handle_t d, int x, int y0, int y1, uint16_t color)
{
    ui_draw_fast_vline(d, x, y0, y1 - y0 + 1, color);
}

static void chrome(st7305_handle_t d, int page, const char *title, const char *subtitle)
{
    char buf[24];
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 31, BLACK);
    text(d, 8, 8, title, 2, WHITE);
    snprintf(buf, sizeof(buf), "%02d/15", page + 1);
    text(d, 251, 11, buf, 1, WHITE);
    text(d, 8, 39, subtitle, 1, BLACK);
    hline(d, 0, W - 1, 51, BLACK);
    hline(d, 8, W - 9, 376, BLACK);
    text(d, 8, 384, "ST7305 RLCD TEST SUITE", 1, BLACK);
    for (int i = 0; i < 15; i++) {
        int x = 210 + i * 6;
        if (i == page) ui_draw_filled_rectangle(d, x, 385, x + 3, 391, BLACK);
        else ui_draw_rectangle(d, x, 385, x + 3, 391, BLACK);
    }
}

static uint32_t rng_state = 0x7305u;
static uint32_t demo_rand(void)
{
    rng_state ^= rng_state << 13;
    rng_state ^= rng_state >> 17;
    rng_state ^= rng_state << 5;
    return rng_state;
}

static int wave(int tick, int period)
{
    int p = tick % (period * 2);
    return p < period ? p : period * 2 - p;
}

static void page_hello(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 2);
    ui_draw_filled_rectangle(d, 12, 12, 287, 387, WHITE);
    ui_draw_rectangle(d, 12, 12, 287, 387, BLACK);
    ui_draw_rectangle(d, 16, 16, 283, 383, BLACK);
    text_center(d, 54, "ST7305  /  RLCD", 2, BLACK);
    hline(d, 42, 258, 82, BLACK);
    text_center(d, 112, "HELLO", 7, BLACK);
    text_center(d, 174, "WORLD!", 7, BLACK);
    text_center(d, 247, "300 x 400  MONOCHROME", 2, BLACK);
    text_center(d, 278, "15 PAGES / AUTO CAROUSEL", 1, BLACK);
    gray_circle(d, 150, 330, 28, 5);
    ui_draw_circle(d, 150, 330, 29, BLACK);
    ui_draw_filled_circle(d, 140, 321, 3, BLACK);
    ui_draw_filled_circle(d, 160, 321, 3, BLACK);
    ui_draw_line(d, 136, 338, 142, 343, BLACK);
    ui_draw_line(d, 142, 343, 158, 343, BLACK);
    ui_draw_line(d, 158, 343, 164, 338, BLACK);
}

static void page_gray(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 1, "DITHER GRAY", "17 LEVELS / STATIC 4x4 BAYER MATRIX");
    for (int i = 0; i < 17; i++) {
        int x = 14 + i * 16;
        gray_rect(d, x, 72, x + 14, 128, i);
        ui_draw_rectangle(d, x, 72, x + 14, 128, BLACK);
    }
    text(d, 14, 136, "0%", 1, BLACK);
    text(d, 139, 136, "50", 1, BLACK);
    text(d, 259, 136, "100%", 1, BLACK);
    text(d, 14, 159, "GRADIENT", 1, BLACK);
    for (int y = 0; y < 36; y++) {
        for (int x = 0; x < 272; x++) {
            int level = x / 17;
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, 14 + x, 176 + y, BLACK);
        }
    }
    ui_draw_rectangle(d, 13, 175, 286, 212, BLACK);
    text(d, 14, 230, "DITHERED FILLS FOR UI DEPTH", 1, BLACK);
    gray_circle(d, 58, 294, 39, 3);
    gray_circle(d, 150, 294, 39, 7);
    gray_circle(d, 242, 294, 39, 12);
    ui_draw_circle(d, 58, 294, 40, BLACK);
    ui_draw_circle(d, 150, 294, 40, BLACK);
    ui_draw_circle(d, 242, 294, 40, BLACK);
    text_center(d, 347, "NO GRAY PIXELS - JUST BLACK + WHITE", 1, BLACK);
}

static void page_geometry(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 2, "GEOMETRY", "LINES / CIRCLES / TRIANGLES / POLYGONS");
    ui_draw_line(d, 12, 65, 285, 350, BLACK);
    ui_draw_line(d, 285, 65, 12, 350, BLACK);
    ui_draw_rectangle(d, 20, 75, 126, 164, BLACK);
    gray_rect(d, 23, 78, 123, 161, 4);
    ui_draw_filled_rectangle(d, 43, 97, 104, 139, BLACK);
    ui_draw_circle(d, 213, 122, 48, BLACK);
    ui_draw_circle(d, 213, 122, 38, BLACK);
    gray_circle(d, 213, 122, 27, 8);
    ui_draw_triangle(d, 24, 323, 87, 188, 143, 323, BLACK);
    ui_draw_filled_triangle(d, 176, 310, 219, 212, 271, 310, BLACK);
    const int p[] = {152,77, 168,95, 162,117, 143,117, 136,95};
    ui_draw_filled_polygon(d, p, 5, BLACK);
    text_center(d, 348, "BRESENHAM + SCANLINE FILL", 1, BLACK);
}

static void page_grid(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 3, "PIXEL GRID", "CHECK EDGES, ASPECT RATIO AND DIAGONALS");
    ui_draw_rectangle(d, 0, 58, 299, 367, BLACK);
    for (int x = 19; x < W; x += 20) gray_rect(d, x, 59, x, 366, 4);
    for (int y = 78; y < 367; y += 20) gray_rect(d, 1, y, 298, y, 4);
    ui_draw_line(d, 0, 58, 299, 367, BLACK);
    ui_draw_line(d, 299, 58, 0, 367, BLACK);
    ui_draw_circle(d, 150, 213, 100, BLACK);
    ui_draw_rectangle(d, 50, 113, 250, 313, BLACK);
    ui_draw_filled_rectangle(d, 0, 58, 5, 63, BLACK);
    ui_draw_filled_rectangle(d, 294, 58, 299, 63, BLACK);
    ui_draw_filled_rectangle(d, 0, 362, 5, 367, BLACK);
    ui_draw_filled_rectangle(d, 294, 362, 299, 367, BLACK);
    ui_draw_filled_rectangle(d, 145, 208, 155, 218, WHITE);
    ui_draw_rectangle(d, 145, 208, 155, 218, BLACK);
}

static void page_text(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 4, "TEXT & FONT", "BUILT-IN 5x7 ASCII / INTEGER SCALING");
    text_center(d, 69, "BIG TEXT 2X", 2, BLACK);
    text_center(d, 96, "HUGE 4X", 4, BLACK);
    hline(d, 18, 281, 135, BLACK);
    text(d, 14, 148, "Regular: ABCDEFGHIJKLM", 1, BLACK);
    text(d, 14, 162, "         NOPQRSTUVWXYZ", 1, BLACK);
    text(d, 14, 179, "Lower:  abcdefghijklm", 1, BLACK);
    text(d, 14, 193, "        nopqrstuvwxyz", 1, BLACK);
    text(d, 14, 214, "Digits: 0123456789", 2, BLACK);
    text(d, 14, 241, "Symbols: !#$%&*+-/<=>?", 1, BLACK);
    gray_rect(d, 14, 265, 285, 304, 12);
    text_center(d, 273, "DITHERED TEXT PANEL", 2, BLACK);
    ui_draw_filled_rectangle(d, 14, 318, 285, 348, BLACK);
    text_center(d, 327, "REVERSED TEXT", 2, WHITE);
    text_center(d, 359, "NO EXTERNAL FONT REQUIRED", 1, BLACK);
}
static void draw_toggle(st7305_handle_t d, int x, int y, bool on)
{
    ui_draw_rectangle(d, x, y, x + 35, y + 16, BLACK);
    if (on) {
        ui_draw_filled_rectangle(d, x + 2, y + 2, x + 32, y + 14, BLACK);
        ui_draw_filled_circle(d, x + 26, y + 8, 5, WHITE);
    } else {
        ui_draw_filled_circle(d, x + 9, y + 8, 5, BLACK);
    }
}

static void page_ui(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 5, "DESKTOP UI", "DITHERED CARDS / GAUGES / LIVE WIDGETS");
    gray_rect(d, 17, 67, 188, 191, 5);
    ui_draw_filled_rectangle(d, 13, 63, 184, 187, WHITE);
    ui_draw_rectangle(d, 13, 63, 184, 187, BLACK);
    text(d, 23, 74, "ENVIRONMENT", 2, BLACK);
    hline(d, 23, 174, 96, BLACK);
    text(d, 23, 109, "23.6", 4, BLACK);
    text(d, 107, 109, "C", 2, BLACK);
    text(d, 23, 145, "HUMIDITY  48%", 1, BLACK);
    text(d, 23, 161, "PRESSURE  1013", 1, BLACK);

    gray_rect(d, 200, 67, 290, 191, 7);
    ui_draw_filled_rectangle(d, 196, 63, 286, 187, WHITE);
    ui_draw_rectangle(d, 196, 63, 286, 187, BLACK);
    text(d, 207, 74, "POWER", 1, BLACK);
    int battery = 20 + wave(frame, 40) * 70 / 40;
    ui_draw_rectangle(d, 210, 99, 267, 121, BLACK);
    ui_draw_filled_rectangle(d, 267, 104, 271, 116, BLACK);
    ui_draw_filled_rectangle(d, 213, 102, 213 + battery * 50 / 100, 118, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%d%%", battery);
    text(d, 241 - text_width(buf, 2) / 2, 134, buf, 2, BLACK);
    text(d, 207, 160, "SOLAR  ON", 1, BLACK);

    ui_draw_filled_rectangle(d, 13, 204, 286, 294, WHITE);
    ui_draw_rectangle(d, 13, 204, 286, 294, BLACK);
    text(d, 24, 216, "SYSTEM ACTIVITY", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        int value = 12 + wave(frame + i * 17, 50) * 180 / 50;
        text(d, 24, 240 + i * 16, i == 0 ? "CPU" : (i == 1 ? "MEM" : "SPI"), 1, BLACK);
        gray_rect(d, 62, 240 + i * 16, 256, 248 + i * 16, 3);
        ui_draw_filled_rectangle(d, 62, 240 + i * 16, 62 + value, 248 + i * 16, BLACK);
    }
    text(d, 22, 316, "WIFI", 1, BLACK);
    draw_toggle(d, 63, 311, true);
    text(d, 118, 316, "SYNC", 1, BLACK);
    draw_toggle(d, 160, 311, (frame / 12) & 1);
    text(d, 215, 316, "LIVE", 1, BLACK);
    if ((frame / 4) & 1) ui_draw_filled_circle(d, 276, 319, 5, BLACK);
    else ui_draw_circle(d, 276, 319, 5, BLACK);
    text_center(d, 351, "A TINY REFLECTIVE DASHBOARD", 1, BLACK);
}

typedef struct {
    uint32_t last_us;
    uint32_t average_us;
    uint16_t history[54];
    int history_pos;
} perf_t;
static perf_t perf;

static void perf_record(uint32_t elapsed_us)
{
    perf.last_us = elapsed_us;
    perf.average_us = perf.average_us ? (perf.average_us * 7 + elapsed_us) / 8 : elapsed_us;
    perf.history[perf.history_pos] = (uint16_t)(elapsed_us / 100);
    perf.history_pos = (perf.history_pos + 1) % ARRAY_LEN(perf.history);
}

static void page_fps(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 6, "FRAME RATE", "UNTHROTTLED FULL-FRAME DRAW + SPI BENCHMARK");
    char buf[40];
    uint32_t avg = perf.average_us ? perf.average_us : 1;
    uint32_t fps10 = 10000000UL / avg;
    snprintf(buf, sizeof(buf), "%lu.%lu FPS", (unsigned long)(fps10 / 10), (unsigned long)(fps10 % 10));
    text_center(d, 66, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "LAST %lu.%lu ms   AVG %lu.%lu ms",
        (unsigned long)(perf.last_us / 1000), (unsigned long)((perf.last_us % 1000) / 100),
        (unsigned long)(avg / 1000), (unsigned long)((avg % 1000) / 100));
    text_center(d, 108, buf, 1, BLACK);
    text(d, 16, 132, "UPDATE TIME HISTORY", 1, BLACK);
    ui_draw_rectangle(d, 15, 148, 285, 254, BLACK);
    gray_rect(d, 16, 174, 284, 174, 3);
    gray_rect(d, 16, 201, 284, 201, 3);
    gray_rect(d, 16, 227, 284, 227, 3);
    int previous_x = -1, previous_y = -1;
    for (int i = 0; i < ARRAY_LEN(perf.history); i++) {
        int index = (perf.history_pos + i) % ARRAY_LEN(perf.history);
        int value = perf.history[index];
        int y = 250 - value * 95 / 150;
        if (y < 151) y = 151;
        if (y > 250) y = 250;
        int x = 20 + i * 5;
        ui_draw_filled_circle(d, x, y, 1, BLACK);
        if (previous_x >= 0) ui_draw_line(d, previous_x, previous_y, x, y, BLACK);
        previous_x = x; previous_y = y;
    }
    snprintf(buf, sizeof(buf), "FRAME: %d", frame + 1);
    text(d, 17, 271, buf, 1, BLACK);
    text(d, 17, 291, "15000 BYTES PER UPDATE", 2, BLACK);
    text(d, 17, 317, "SPI: 20 MHz   PANEL: 16 Hz", 1, BLACK);
    text(d, 17, 337, "CPU number is bus throughput,", 1, BLACK);
    text(d, 17, 351, "not the optical panel limit.", 1, BLACK);
    int scan = 20 + (frame * 7) % 260;
    vline(d, scan, 149, 253, BLACK);
    (void)elapsed;
}

static void page_patterns(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 7, "FINE PATTERNS", "1/2/4 PIXEL CHECKERS + LINE RESOLUTION");
    int phase = frame & 1;
    const int boxes[4][4] = {{12,66,146,184},{153,66,287,184},{12,194,146,332},{153,194,287,332}};
    for (int b = 0; b < 4; b++) {
        for (int y = boxes[b][1]; y <= boxes[b][3]; y++) {
            for (int x = boxes[b][0]; x <= boxes[b][2]; x++) {
                bool black = false;
                if (b == 0) black = ((x ^ y) & 1) == phase;
                if (b == 1) black = (((x / 2) ^ (y / 2)) & 1) == phase;
                if (b == 2) black = (((x / 4) ^ (y / 4)) & 1) == phase;
                if (b == 3) black = ((x + phase) % 4 == 0) || ((y + phase) % 4 == 0);
                if (black) st7305_write_point(d, x, y, BLACK);
            }
        }
        ui_draw_rectangle(d, boxes[b][0] - 1, boxes[b][1] - 1, boxes[b][2] + 1, boxes[b][3] + 1, BLACK);
    }
    text_center(d, 343, "CHECKER / 2PX / 4PX / GRID", 1, BLACK);
    text_center(d, 358, phase ? "PHASE B - CHECK FOR FLICKER" : "PHASE A - CHECK FOR FLICKER", 1, BLACK);
}

static struct { int x, y, vx, vy, hits; } bounce;

static void page_bounce(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 8, "BOUNCE TEST", "MOVEMENT, COLLISIONS AND PANEL GHOSTING");
    const int left = 10, right = 289, top = 65, bottom = 355;
    ui_draw_rectangle(d, left, top, right, bottom, BLACK);
    for (int y = top + 10; y < bottom; y += 20) gray_rect(d, left + 1, y, right - 1, y, 2);
    if (frame > 0) {
        bounce.x += bounce.vx;
        bounce.y += bounce.vy;
        if (bounce.x <= left + 2 || bounce.x + 91 >= right - 1) {
            bounce.vx = -bounce.vx;
            bounce.x += bounce.vx * 2;
            bounce.hits++;
        }
        if (bounce.y <= top + 2 || bounce.y + 43 >= bottom - 1) {
            bounce.vy = -bounce.vy;
            bounce.y += bounce.vy * 2;
            bounce.hits++;
        }
    }
    gray_rect(d, bounce.x + 5, bounce.y + 5, bounce.x + 96, bounce.y + 48, 5);
    ui_draw_filled_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, WHITE);
    ui_draw_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, BLACK);
    text(d, bounce.x + 9, bounce.y + 10, "RLCD", 3, BLACK);
    char buf[24];
    snprintf(buf, sizeof(buf), "WALL HITS: %d", bounce.hits);
    text_center(d, 360, buf, 1, BLACK);
}

#define STAR_COUNT 56
static struct { int x, y, z; } stars[STAR_COUNT];

static void star_reset(int i, bool initial)
{
    stars[i].x = (int)(demo_rand() % 401) - 200;
    stars[i].y = (int)(demo_rand() % 401) - 200;
    stars[i].z = initial ? 30 + (int)(demo_rand() % 220) : 250;
}
static void page_stars(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    ui_draw_filled_rectangle(d, 0, 0, W - 1, H - 1, BLACK);
    text(d, 10, 12, "STARFIELD", 2, WHITE);
    text(d, 190, 17, "56 STARS / HPM", 1, WHITE);
    hline(d, 10, 289, 38, WHITE);
    for (int i = 0; i < STAR_COUNT; i++) {
        int old_z = stars[i].z;
        stars[i].z -= 7;
        if (stars[i].z < 20) star_reset(i, false);
        int z = stars[i].z;
        int x = 150 + stars[i].x * 110 / z;
        int y = 207 + stars[i].y * 110 / z;
        int ox = 150 + stars[i].x * 110 / old_z;
        int oy = 207 + stars[i].y * 110 / old_z;
        if (x > 2 && x < 297 && y > 44 && y < 370) {
            ui_draw_line(d, ox, oy, x, y, WHITE);
            if (z < 80) ui_draw_filled_circle(d, x, y, 2, WHITE);
            else st7305_write_point(d, x, y, WHITE);
        }
    }
    hline(d, 10, 289, 377, WHITE);
    text(d, 10, 385, "WARP THROUGH A MONOCHROME GALAXY", 1, WHITE);
}

#define LIFE_W 34
#define LIFE_H 34
static uint8_t life[LIFE_H][LIFE_W];
static uint8_t life_next[LIFE_H][LIFE_W];
static int generation;

static void life_seed(void)
{
    memset(life, 0, sizeof(life));
    rng_state = 0x42030040u;
    for (int y = 2; y < LIFE_H - 2; y++) {
        for (int x = 2; x < LIFE_W - 2; x++) life[y][x] = (demo_rand() % 100) < 28;
    }
    generation = 0;
}

static void life_step(void)
{
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            int neighbors = 0;
            for (int dy = -1; dy <= 1; dy++) {
                for (int dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    int yy = (y + dy + LIFE_H) % LIFE_H;
                    int xx = (x + dx + LIFE_W) % LIFE_W;
                    neighbors += life[yy][xx];
                }
            }
            life_next[y][x] = neighbors == 3 || (neighbors == 2 && life[y][x]);
        }
    }
    memcpy(life, life_next, sizeof(life));
    generation++;
}

static void page_life(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 10, "GAME OF LIFE", "CONWAY CELLULAR AUTOMATON / TORUS WORLD");
    if (frame > 0) life_step();
    const int cell = 8, ox = 14, oy = 62;
    gray_rect(d, ox - 3, oy - 3, ox + LIFE_W * cell + 1, oy + LIFE_H * cell + 1, 3);
    ui_draw_rectangle(d, ox - 2, oy - 2, ox + LIFE_W * cell, oy + LIFE_H * cell, BLACK);
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            if (life[y][x]) ui_draw_filled_rectangle(d, ox + x * cell + 1, oy + y * cell + 1,
                ox + x * cell + 6, oy + y * cell + 6, BLACK);
        }
    }
    char buf[32];
    snprintf(buf, sizeof(buf), "GENERATION %d", generation);
    text_center(d, 352, buf, 1, BLACK);
}

static void page_clock(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 11, "UPTIME CLOCK", "ESP-TIMER / NO RTC OR NETWORK REQUIRED");
    int total = (int)(elapsed / 1000000);
    int seconds = total % 60, minutes = (total / 60) % 60, hours = total / 3600;
    int cx = 150, cy = 177, radius = 101;
    ui_draw_circle(d, cx, cy, radius, BLACK);
    ui_draw_circle(d, cx, cy, radius - 2, BLACK);
    for (int i = 0; i < 60; i++) {
        /* 시계 방향 눈금은 테이블 조회로 처리해 부동소수점과 libm을 피한다. */
        static const int8_t sx[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
        static const int8_t sy[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
        if (i % 5 == 0) {
            int k = i / 5;
            int x = cx + sx[k] * 88 / 100, y = cy + sy[k] * 88 / 100;
            ui_draw_filled_circle(d, x, y, 3, BLACK);
        }
    }
    static const int8_t sec_x[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
    static const int8_t sec_y[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
    int sk = (seconds / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[sk] * 76 / 100, cy + sec_y[sk] * 76 / 100, BLACK);
    int mk = (minutes / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[mk] * 53 / 100, cy + sec_y[mk] * 53 / 100, BLACK);
    ui_draw_filled_circle(d, cx, cy, 5, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%02d:%02d:%02d", hours, minutes, seconds);
    text_center(d, 301, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "RENDER FRAME %d", frame + 1);
    text_center(d, 343, buf, 1, BLACK);
    text_center(d, 359, "1-BIT DOES NOT MEAN BORING", 1, BLACK);
}

static void tiny_mac(st7305_handle_t d, int x, int y)
{
    ui_draw_rectangle(d, x, y, x + 37, y + 47, BLACK);
    ui_draw_filled_rectangle(d, x + 4, y + 4, x + 33, y + 31, BLACK);
    ui_draw_filled_rectangle(d, x + 6, y + 6, x + 31, y + 29, WHITE);
    ui_draw_filled_rectangle(d, x + 11, y + 12, x + 13, y + 15, BLACK);
    ui_draw_filled_rectangle(d, x + 24, y + 12, x + 26, y + 15, BLACK);
    ui_draw_line(d, x + 12, y + 23, x + 16, y + 25, BLACK);
    ui_draw_line(d, x + 16, y + 25, x + 22, y + 25, BLACK);
    ui_draw_line(d, x + 22, y + 25, x + 26, y + 23, BLACK);
    ui_draw_filled_rectangle(d, x + 7, y + 38, x + 23, y + 41, BLACK);
}

static void page_retro(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 3);
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 21, WHITE);
    hline(d, 0, W - 1, 22, BLACK);
    text(d, 9, 7, "*  File  Edit  View  Special", 1, BLACK);
    text(d, 258, 7, "12:00", 1, BLACK);
    text(d, 181, 34, "RLCD OS", 2, BLACK);
    text(d, 184, 55, "System 1.0", 1, BLACK);
    tiny_mac(d, 228, 77);

    gray_rect(d, 17, 39, 212, 278, 8);
    ui_draw_filled_rectangle(d, 12, 34, 207, 273, WHITE);
    ui_draw_rectangle(d, 12, 34, 207, 273, BLACK);
    ui_draw_filled_rectangle(d, 13, 35, 206, 51, BLACK);
    text(d, 54, 39, "CONTROL PANEL", 1, WHITE);
    ui_draw_rectangle(d, 16, 38, 20, 47, WHITE);
    text(d, 24, 65, "Desktop Pattern", 1, BLACK);
    for (int y = 0; y < 36; y++) for (int x = 0; x < 56; x++) {
        if (((x / 4) ^ (y / 4)) & 1) st7305_write_point(d, 25 + x, 82 + y, BLACK);
    }
    gray_rect(d, 94, 82, 177, 117, 6);
    ui_draw_rectangle(d, 24, 81, 81, 118, BLACK);
    ui_draw_rectangle(d, 93, 81, 178, 118, BLACK);
    hline(d, 22, 196, 130, BLACK);
    text(d, 24, 141, "Double-Click Speed", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        ui_draw_rectangle(d, 26 + i * 51, 163, 37 + i * 51, 174, BLACK);
        if (i == 1) ui_draw_filled_rectangle(d, 28 + i * 51, 165, 35 + i * 51, 172, BLACK);
    }
    text(d, 24, 190, "Key Repeat Rate", 1, BLACK);
    gray_rect(d, 25, 211, 187, 218, 4);
    ui_draw_filled_rectangle(d, 25, 211, 110, 218, BLACK);
    ui_draw_rectangle(d, 25, 210, 188, 219, BLACK);
    text(d, 24, 237, "Reflective. Silent. Timeless.", 1, BLACK);

    ui_draw_filled_rectangle(d, 24, 294, 195, 353, WHITE);
    ui_draw_rectangle(d, 24, 294, 195, 353, BLACK);
    ui_draw_filled_rectangle(d, 25, 295, 194, 310, BLACK);
    text(d, 65, 299, "HELLO, WORLD!", 1, WHITE);
    text(d, 36, 322, "1 bit. Infinite ideas.", 1, BLACK);
    text(d, 36, 338, "OK", 1, BLACK);
    ui_draw_rectangle(d, 135, 324, 180, 344, BLACK);

    text(d, 236, 348, "TRASH", 1, BLACK);
    ui_draw_rectangle(d, 244, 305, 265, 337, BLACK);
    hline(d, 240, 269, 302, BLACK);
    vline(d, 250, 309, 333, BLACK);
    vline(d, 258, 309, 333, BLACK);
}
static void page_inverse(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 13, "BLACK & WHITE", "POLARITY / CONTRAST / FULL-SCREEN INVERSION");
    bool invert = (frame / 2) & 1;
    if (!invert) {
        ui_draw_filled_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "BLACK", 6, WHITE);
        text_center(d, 155, "ON", 4, WHITE);
        text_center(d, 205, "WHITE", 6, WHITE);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, WHITE);
        text_center(d, 289, "REVERSED", 3, BLACK);
    } else {
        ui_draw_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "WHITE", 6, BLACK);
        text_center(d, 155, "ON", 4, BLACK);
        text_center(d, 205, "BLACK", 6, BLACK);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, BLACK);
        text_center(d, 289, "REVERSED", 3, WHITE);
    }
    text_center(d, 357, invert ? "PHASE B" : "PHASE A", 1, BLACK);
}

static void page_rotation(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame;
    static const int angles[4] = {0, 90, 180, 270};
    uint8_t rotation = (uint8_t)((elapsed / 3000000) & 3);
    st7305_set_rotation(d, rotation);

    int width = st7305_get_width(d);
    int height = st7305_get_height(d);
    int cx = width / 2;
    int cy = height / 2 - 5;
    char buf[40];

    ui_draw_rectangle(d, 0, 0, width - 1, height - 1, BLACK);
    ui_draw_filled_rectangle(d, 0, 0, width - 1, 39, BLACK);
    snprintf(buf, sizeof(buf), "ROTATION %d DEG", angles[rotation]);
    text(d, (width - text_width(buf, 2)) / 2, 11, buf, 2, WHITE);
    snprintf(buf, sizeof(buf), "LOGICAL %d x %d / FRAMEBUFFER MAPPING", width, height);
    text(d, (width - text_width(buf, 1)) / 2, 50, buf, 1, BLACK);

    /* 비대칭 화살표 + 네 모서리 마커로 모든 방향을 명확하게 구분한다. */
    ui_draw_circle(d, cx, cy, 43, BLACK);
    ui_draw_line(d, cx, cy + 25, cx, cy - 28, BLACK);
    ui_draw_line(d, cx, cy - 28, cx - 13, cy - 14, BLACK);
    ui_draw_line(d, cx, cy - 28, cx + 13, cy - 14, BLACK);
    text(d, cx - text_width("UP", 2) / 2, cy - 10, "UP", 2, BLACK);
    snprintf(buf, sizeof(buf), "%d", angles[rotation]);
    text(d, cx - text_width(buf, 6) / 2, cy + 57, buf, 6, BLACK);

    text(d, 12, 70, "A / TOP LEFT", 1, BLACK);
    text(d, width - 12 - text_width("B / TOP RIGHT", 1), 70, "B / TOP RIGHT", 1, BLACK);
    text(d, 12, height - 39, "C / BOTTOM LEFT", 1, BLACK);
    text(d, width - 12 - text_width("D / BOTTOM RIGHT", 1), height - 39,
        "D / BOTTOM RIGHT", 1, BLACK);
    ui_draw_filled_rectangle(d, 3, 3, 9, 9, WHITE);
    ui_draw_filled_rectangle(d, width - 10, height - 10, width - 4, height - 4, BLACK);
    hline(d, 12, width - 13, height - 25, BLACK);
    text(d, (width - text_width("AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1)) / 2,
        height - 15, "AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1, BLACK);
}

typedef void (*page_draw_t)(st7305_handle_t, int, int64_t);
typedef struct {
    const char *name;
    page_draw_t draw;
    uint32_t duration_ms;
    uint16_t target_fps; /* 0 = 한 번만 렌더링, 65535 = 속도 제한 없음 */
} demo_page_t;

static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    {"Geometry", page_geometry, 5000, 0},
    {"Pixel grid", page_grid, 5000, 0},
    {"Text", page_text, 5500, 0},
    {"Dashboard UI", page_ui, 9000, 4},
    {"Frame rate", page_fps, 8500, UINT16_MAX},
    {"Fine patterns", page_patterns, 6000, 2},
    {"Bounce", page_bounce, 9000, 20},
    {"Starfield", page_stars, 9000, 20},
    {"Game of Life", page_life, 12000, 3},
    {"Uptime clock", page_clock, 9000, 4},
    {"Retro desktop", page_retro, 6500, 0},
    {"Inversion", page_inverse, 6000, 2},
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};

static void page_reset(int page)
{
    if (page == 6) memset(&perf, 0, sizeof(perf));
    if (page == 8) bounce = (typeof(bounce)){25, 85, 3, 2, 0};
    if (page == 9) {
        rng_state = 0x51a7f13du;
        for (int i = 0; i < STAR_COUNT; i++) star_reset(i, true);
    }
    if (page == 10) life_seed();
}

void lcd_demo_run(st7305_handle_t lcd)
{
    if (!lcd) return;
    int page = 0;
    while (1) {
        const demo_page_t *p = &pages[page];
        st7305_set_rotation(lcd, 0);
        page_reset(page);
        LOGI("Page %d/%d: %s", page + 1, ARRAY_LEN(pages), p->name);
        int64_t started = (int64_t)esp_timer_get_time();
        uint32_t wake = millis();
        int frame = 0;
        while (1) {
            int64_t draw_started = (int64_t)esp_timer_get_time();
            st7305_clear(lcd);
            p->draw(lcd, frame, draw_started - started);
            st7305_display(lcd);
            perf_record((uint32_t)(esp_timer_get_time() - draw_started));

            if (p->target_fps == 0) {
                delay(p->duration_ms);
                break;
            }
            frame++;
            if (esp_timer_get_time() - started >= (int64_t)p->duration_ms * 1000) break;
            if (p->target_fps != UINT16_MAX) {
                uint32_t interval = 1000 / p->target_fps;
                if (!interval) interval = 1;
                wake += interval;
                int32_t wait = (int32_t)(wake - millis());
                if (wait > 0) delay(wait);
            }
            yield();
        }
        page = (page + 1) % ARRAY_LEN(pages);
    }
}

/* ================= Arduino 진입점 ================= */

static st7305_handle_t lcd;

void setup(void)
{
    Serial.begin(115200);
    lcd = st7305_init(PIN_DC, PIN_RES, PIN_CS, PIN_SCLK, PIN_MOSI, SPI_CLOCK_HZ);

    /* 애니메이션은 HPM이 필요하고, 정적 페이지는 LPM에서도 화면이 유지된다. */
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    lcd_demo_run(lcd);
}
```

이 코드는 의사코드도 아니고, 핵심 함수만 남긴 교육용 발췌본도 아니에요. 저수준 드라이버, 그래픽 프리미티브, 내장 폰트, 15페이지 캐러셀까지 모두 담은 완전한 단일 파일 프로그램입니다. 글을 발행할 때는 이 `.ino`를 첨부하거나 함께 제공되는 코드 저장소에 넣어서, 독자가 본문에서 코드 조각을 이어 붙이지 않도록 하는 게 좋아요.

파일을 같은 이름의 폴더에 넣으세요:

```text
ST7305_RLCD_Demo/
└── ST7305_RLCD_Demo.ino
```

Arduino IDE로 `.ino`를 열고, `Arduino Nano ESP32`와 해당 시리얼 포트를 선택한 다음 컴파일하고 업로드하면 돼요.

### 최소 시작 흐름: 먼저 초기화하고, 그다음 15페이지 캐러셀로 진입

아래는 전체 프로그램의 진입점이에요. 실제로 일하는 건 `st7305_init()`과 `lcd_demo_run()`인데, 전자는 "화면을 깨우는" 역할, 후자는 "화면이 놀게 하는" 역할을 해요.

```cpp
static st7305_handle_t lcd;

void setup(void)
{
    // 첫 번째 단계: 115200 시리얼을 열어서 나중에 로그를 볼 수 있게 한다
    Serial.begin(115200);

    // 두 번째 단계: 아까 배선한 대로 SPI와 ST7305를 초기화한다
    lcd = st7305_init(
        PIN_DC, PIN_RES, PIN_CS,
        PIN_SCLK, PIN_MOSI,
        SPI_CLOCK_HZ
    );

    // 세 번째 단계: 동적 페이지는 갱신이 필요하므로 HPM 고속 갱신 모드로 전환한다
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    // 네 번째 단계: 여기서 계속 캐러셀이 돌아가므로 상태 머신을 더 만들 필요가 없다
    lcd_demo_run(lcd);
}
```

핀과 SPI 클럭은 파일 맨 앞에 모여 있어요. 보드를 바꿀 때는 여기부터 수정하세요:

```cpp
// 여기에는 GPIO 번호를 적는다. Nano 실크스크린의 D 번호를 그대로 베끼지 말 것
#define PIN_SCLK        10          // D7
#define PIN_MOSI         8          // D5, 핵심: GPIO11이 아니다
#define PIN_CS           9          // D6
#define PIN_DC           7          // D4
#define PIN_RES          6          // D3
#define SPI_CLOCK_HZ     20000000UL // 20 MHz, 일단 안정적으로 하고 나중에 속도를 올리자
```

### 코드 설명 1: 한 프레임이 정확히 15000바이트인 이유

이 화면은 300×400 = 120000개 픽셀이고, 각 픽셀은 흑 또는 백뿐이라 이론적으로 1bit를 차지해요:

```text
120000 bit ÷ 8 = 15000 바이트
```

ST7305는 이 예제의 데이터 형식에서 1바이트(8bit)가 2행×4열 픽셀에 대응해요:

```text
0행: BIT7  BIT5  BIT3  BIT1
1행: BIT6  BIT4  BIT2  BIT0
```

그래서 프로그램에서 한 행은 흔한 300÷8이 아니라 300÷4 = 75바이트예요. 세로는 두 행씩 한 그룹으로 묶어 총 400÷2 = 200그룹이 되고요:

```cpp
#define ST7305_DATA_WIDTH     75      // 300 ÷ 4
#define ST7305_BUFFER_LENGTH  15000   // 75 × 200
```

프레임버퍼는 먼저 스케치북에 다 그려 두고 한 번에 화면에 넘겨주는 방식이라고 생각하면 돼요. 이렇게 하면 그리기가 SPI 타이밍과 직접 얽히지 않아서 코드도 유지보수하기 쉬워져요.

이 예제의 17단계 명암은 4×4 Bayer 행렬로 흑백 점 밀도를 제어하여 구현하며, 픽셀 심도는 증가하지 않아요. 따라서 300×400 프레임버퍼는 여전히 15000바이트예요. 여기서 '17단계'는 이론적 디더 패턴 수이며, 실제 구분 가능한 정도는 시청 거리와 패널 표시 효과에 따라 달라져요.

`INVON/INVOFF`는 화면의 흑백 표시 반전을 제어하고, `Dot Inversion`은 액정 구동 극성 메커니즘이에요. 둘은 같은 개념이 아니며, '잔상 제거를 위한 정기 반전'도 아니에요.

### 코드 설명 2: 좌표가 프레임버퍼의 어떤 비트에 들어가는가

회전된 논리 좌표를 먼저 300×400 물리 좌표로 되돌린 다음, 바이트 위치와 비트 위치를 계산해요:

```cpp
// 첫 번째 단계: 이 픽셀이 어느 바이트에 들어가는지 계산한다
int real_x = physical_x / 4;
int real_y = physical_y / 2;
int index = real_y * ST7305_DATA_WIDTH + real_x;

// 두 번째 단계: 그 바이트 안에서 어느 비트를 차지하는지 계산한다
int one_two = physical_y % 2;
int line_bit_4 = physical_x % 4;
int bit = 7 - (line_bit_4 * 2 + one_two);

// 세 번째 단계: 검정은 1을 세트하고, 흰색은 0으로 지운다
if (color) dev->buffer[index] |= (1 << bit);
else       dev->buffer[index] &= ~(1 << bit);
```

이 인터리브 배치가 초보자가 가장 틀리기 쉬운 부분이에요. 그림이 비스듬하게 나오거나, 바코드처럼 깨지거나, 격행으로 어긋나면 먼저 여기를 확인하세요. 초기화 레지스터를 "무작위 튜닝"하기 전에요.

### 코드 설명 3: DC와 CS는 대체 뭐가 바쁜가

`DC`는 택배 상자에 붙은 라벨 같은 거예요. `LOW`는 "이건 명령이야", `HIGH`는 "이건 이미지 데이터야"를 뜻해요. `CS`는 점호 같은 거라서, LOW로 당겨졌을 때만 이 화면이 데이터를 받을 차례가 돼요.

```cpp
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);          // DC=LOW: 다음은 명령이다
    spi_write_byte(dev, reg);
}

static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);         // DC=HIGH: 다음은 파라미터다
    spi_write_byte(dev, data);
}
```

한 프레임 전체를 보낼 때 프로그램은 픽셀마다 SPI 트랜잭션을 따로 여는 게 아니라 15000바이트를 연속으로 써요:

```cpp
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);             // 첫 번째 단계: 전체 화면 쓰기 윈도를 지정한다
    dc_data(dev);                        // 두 번째 단계: 이어지는 것이 데이터라고 화면에 알린다
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH); // 세 번째 단계: 한 프레임을 통째로 보낸다
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}
```

20MHz에서 15000바이트의 순수 SPI 이론 전송 시간은 약 6ms예요. 실제로는 명령, 그리기, 프로그램 스케줄링까지 더해져요. 7페이지가 실제 소요 시간을 보여주는데, 이론값을 실측 프레임레이트라고 속이지 않아요.

데이터시트의 쓰기 사이클 하한은 약 33.3MHz에 해당하지만, 이는 ST7305 컨트롤러의 타이밍 사양일 뿐 임의의杜邦선·변환 보드·전원 환경에서 안정적으로 달성할 수 있는 속도는 아니에요. 이 예제에서는 20MHz를 사용해요. 화면 깨짐·어긋남·시동 불안정이 발생하면 먼저 클럭을 낮춰 배선과 신호 무결성을 확인하세요.

### 코드 설명 4: HPM, LPM, 정적 화면은 서로 다른 이야기

초기화가 끝나면 LPM으로 들어가요. 이 예제는 `setup()`에서 HPM으로 전환해서 애니메이션 페이지에 더 적합한 패널 갱신 조건을 만들어 줘요.

```cpp
st7305_high_power_mode(lcd);  // 0x38을 보내 HPM으로 진입한다
```

이 예제는 `B2h=0x05`로 HPM을 16Hz, LPM을 8Hz로 설정해요. 프로그램의 `target_fps`는 메인 컨트롤러가 얼마나 빨리 그릴지만 제어할 뿐, 액정의 물리적 응답이 패널 한계를 넘도록 명령할 수는 없어요.

정적 페이지의 `target_fps=0`은 한 번 그린 후 화면을 유지하고 다시 보내지 않는다는 뜻이에요. 하지만 전체 캐러셀은 계속 HPM 상태에 있고, 각 정적 페이지마다 자동으로 LPM으로 돌아가지는 않아요. 진짜 저전력 제품을 만들려면 매뉴얼의 타이밍에 따라 모드 전환과 부분 갱신을 넣어야 해요.

### 코드 설명 5: 15개 예제가 어떻게 자동으로 캐러셀되는가

모든 페이지는 `pages[]` 배열에 모여 있고, 각 항목은 이름, 그리기 함수, 체류 시간, 목표 프레임레이트를 담고 있어요:

```cpp
static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    // 중간 12페이지도 같은 방식: 함수, 체류 시간, 목표 FPS
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};
```

재생 순서를 바꾸고 싶으면 배열 항목 순서를 바꾸면 돼요. 별밭을 몇 초 더 감상하고 싶으면 `duration_ms`를 고치고, 내 페이지를 추가하고 싶으면 같은 시그니처의 그리기 함수를 하나 만들어 배열에 등록하면 돼요. 캐러셀 스케줄링을 여기저기 흩어놓을 필요가 없어요.

### 코드 설명 6: 4방향 회전이 MADCTL 추측 게임에 의존하지 않는 이유

프로그램은 `st7305_set_rotation(lcd, rotation)`으로 0~3 네 방향을 설정하고, 프레임버퍼에 쓸 때 좌표를 매핑해요:

| `rotation` | 표시 방향    | 논리 해상도 |
| ---------: | ----------- | ---------- |
|          0 | 0°          | 300×400    |
|          1 | 시계 방향 90°  | 400×300    |
|          2 | 180°        | 300×400    |
|          3 | 시계 방향 270° | 400×300    |

방향 설정은 이후 그리기에만 영향을 주고, 자동으로 화면을 지우거나 갱신하지는 않아요. 전환 후에는 프레임버퍼를 비우고 전체 화면을 다시 그려야 해요. 각 페이지 캐러셀이 시작될 때 프로그램도 먼저 방향을 0으로 리셋해서, 이전 페이지가 다음 페이지를 "비틀어 놓지" 않도록 해요.

## 자주 겪는 문제 해결: ST7305가 표시되지 않거나, 화면이 깨지거나, 깜빡일 때

당황하지 마세요. "화면이 안 켜지는" 문제의 80%는 이 몇 가지에서 생겨요. 나머지 20%가 돼서야 초기화 레지스터 탓을 할 차례예요.

### 1. 시리얼에는 초기화 성공이 뜨는데 화면이 전부 흰색

SPI는 쓰기만 하고 MISO로 읽어오지 않으니, 메인 컨트롤러가 데이터를 허공에 보내도 "전송 완료"라고 말할 수 있어요. 먼저 `D5 → GPIO8`이 제대로 연결됐는지 확인하고, VCI가 3.3V인지, GND가 공통으로 연결됐는지, FPC가 단단히 잠겼는지 확인하세요. 완전히 전원을 끄고 몇 초 뒤에 다시 켜는 게 RESET 버튼만 누르는 것보다 더 확실해요.

### 2. 화면에 내용은 나오지만 무작위로 깨지거나 가끔 멈춤

`SPI_CLOCK_HZ`를 20MHz에서 5MHz로 임시로 낮추고, 점퍼선을 짧게 하고, 커넥터를 다시 단단히 꽂아 보세요. 속도를 낮췄더니 회복된다면 Gate/Source 전압부터 만지지 말고, 선 길이, 접촉, 신호 무결성을 먼저 처리하세요.

### 3. 그림이 어긋나거나, 줄무늬가 생기거나, 글자가 조각난 것처럼 보임

`DTFORM=0x11`, 열 주소 윈도, 2행×4열 픽셀 비트 매핑을 확인하세요. 논리 좌표가 범위를 벗어나지 않았는지도 확인해야 해요. 0°/180°는 300×400이고, 90°/270°는 400×300이에요.

### 4. 어두운 곳에서는 거의 보이지 않음

이건 백라이트가 없는 전반사 화면이라, 화면이 갑자기 투명해지는 걸 배운 게 아니에요. 주변 조명을 늘리세요. BLC를 반드시 연결해야 하는 백라이트선으로 생각하면 안 되고, 이 예제에서는 BLC를 연결하지 않아도 돼요.

### 5. 애니메이션에 잔상이 있거나 촘촘한 패턴이 깜빡임

촘촘한 체커보드, 위상 교대, 빠른 전체 화면 반전은 원래 스트레스 테스트예요. 모든 인터페이스가 다 이렇다는 뜻이 아니에요. 동적 페이지의 `target_fps`를 낮추고, 넓은 면적의 고주파 반전을 줄이고, HPM 상태인지 확인하세요. 잔상이 눈에 띄면 더 속도를 올리면서 패널의 물리적 특성과 정면으로 맞서지 마세요.

이 드라이버는 일부 전자종이처럼 잔상 제거를 위해 주기적인 전체 화면 흑백 반전을 실행할 필요가 없어요. 동적 페이지는 매 프레임 프레임버퍼를 지우고 다시 그리는 일반적인 화면 갱신이며, 정적 페이지는 한 번 기록한 후 컨트롤러가 지속적으로 스캔 표시해요. 잔상이 지속적으로 눈에 띄면 공급업체 초기화 파라미터·HPM/LPM·갱신 리듬을 확인해야 하며, 정기 반전 플래시를 추가해서는 안 돼요.

### 6. 중국어(또는 한글 등)로 바꿨더니 물음표나 네모만 표시됨

내장 폰트에는 96개의 5×7 ASCII 문자만 있고, 다른 언어 글자는 없어요. 잘라낸 별도의 글꼴을 추가해서 `st7305_write_point()`로 그려야 해요. 통짜 큰 글꼴을 그냥 넣으면 펌웨어 용량이 인터페이스보다 더 "묵직해질" 거예요.

### 7. 복잡한 페이지 말고 하드웨어가 살아 있는지 먼저 확인하고 싶을 때

먼저 전체 검정, 전체 흰색을 번갈아 테스트해서 글자, 좌표, 애니메이션 로직은 잠시 제쳐 두세요:

```cpp
// 첫 번째 단계: 프레임 전체를 1로 채워 전체 검정을 테스트한다
st7305_fill(lcd, 0xFF);
st7305_display(lcd);
delay(2000);

// 두 번째 단계: 프레임 전체를 0으로 지워 전체 흰색을 테스트한다
st7305_fill(lcd, 0x00);
st7305_display(lcd);
delay(2000);
```

전체 검정과 전체 흰색이 정상이면 15페이지 캐러셀로 돌아가세요. 문제 해결은 병원 진료처럼, 간단한 검사부터 하고 처음부터 대수술을 하지 않는 게 좋아요.

## FAQ: ESP32-S3와 ST7305에 관해 자주 묻는 질문

**Q: ST7305의 SPI 핀을 다른 GPIO로 바꿀 수 있나요?**
A: 네, 가능해요. ESP32-S3는 GPIO Matrix로 SPI를 다시 매핑할 수 있어요. `PIN_SCLK`, `PIN_MOSI`, `PIN_CS`, `PIN_DC`, `PIN_RES`를 수정하고 배선도 함께 바꾸면 돼요. 보드가 이미 사용 중인 핀, 부팅 설정 핀, USB 관련 핀은 피하세요. 보드를 바꾼 뒤에는 반드시 해당 보드의 공식 핀 표를 확인해야 해요. "둘 다 ESP32-S3니까"라는 이유만으로 그대로 베끼면 안 돼요.

**Q: ST7305 화면은 왜 반드시 3.3V를 써야 하나요? 5V를 연결하면 안 되나요?**
A: 이 예제 모듈의 VCI는 3.3V를 사용하고, ESP32-S3 GPIO도 3.3V 로직이라서 VCI나 신호 핀에 5V를 직접 넣으면 안 돼요. 전원을 연결할 때는 GND도 공통으로 연결해야 해요. 3.3V만 연결하고 GND를 빼먹으면 신호가 공통 기준을 잃어요.

**Q: ST7305의 실제 갱신율은 얼마인가요? 프로그램에 20 FPS라고 쓰면 20Hz인가요?**
A: 아니요. 이 예제에서 패널 HPM은 16Hz로 설정돼 있어요. `target_fps=20`은 메인 컨트롤러가 초당 최대 20프레임을 만들어 보내겠다는 목표 리듬일 뿐이에요. 20MHz SPI로 15000바이트를 전송하는 이론 시간은 약 6ms지만, 실제 FPS는 7페이지의 "그리기 + SPI" 측정값을 기준으로 하세요. 광학 응답은 또 패널 모드의 제한을 받아요.

**Q: 15000바이트 프레임버퍼가 ESP32-S3 메모리를 얼마나 차지하나요?**
A: 고정 프레임버퍼는 15000바이트, 약 14.65 KiB예요. 그 외에 폰트 테이블, 페이지 상태, 그래픽 그리기 임시 변수가 더 있어요. 예제는 정적 전역 인스턴스를 사용해서 매 프레임마다 전체 버퍼를 동적으로 할당할 필요가 없어요.

**Q: 다른 ESP32-S3 개발 보드에서도 이 ST7305 Arduino 코드를 바로 쓸 수 있나요?**
A: 드라이버 로직은 재사용할 수 있지만, 보드 선택과 GPIO 매핑은 바꿔야 해요. Nano ESP32가 아닌 보드를 쓴다면 Arduino IDE에서 해당 보드를 선택하고, 제어 GPIO 5개를 실제 배선에 맞게 바꾸세요. 전원은 모듈 요구사항대로 여전히 3.3V를 사용해야 해요.

**Q: ST7305 화면이 아예 표시되지 않을 때 가장 먼저 어떤 파라미터를 바꿔야 하나요?**
A: 전압 레지스터부터 바꾸지 마세요. "3.3V 전원 → 공통 GND → FPC/점퍼선 → D5=GPIO8 → SPI를 5MHz로 낮추기 → 전체 검정/흰색 테스트" 순서로 확인하세요. 하드웨어 연결을 확인한 뒤에 초기화 시퀀스와 프레임버퍼를 점검하는 거예요.

**Q: 이 1bit 단색 화면이 어떻게 17단계 그레이를 표시할 수 있나요?**
A: 진짜 그레이 픽셀이 있는 게 아니라, 4×4 Bayer 순서 디더링으로 흑백 점의 밀도를 조절해서 사람 눈이 일정 거리 밖에서 0~16, 총 17단계의 명암을 느끼게 하는 거예요. 확대해서 보면 여전히 검은 점과 흰 점뿐이에요. "근무표를 짜서 입체감을 만들어내는" 방식이라고 보면 돼요.

**Q: ST7305 예제가 중국어(또는 한글 등)를 바로 표시할 수 있나요?**
A: 바로 표시할 수는 없어요. 현재 내장 글꼴은 ASCII 32~126을 커버하고, 다른 언어 글자는 `?`로 대체돼요. 잘라낸 글꼴을 추가하고 그리기 함수를 작성하거나, 기존 그리기 인터페이스를 폰트 라이브러리에 브리지해야 해요.

**Q: 전반사 화면은 어두운 환경에서 써야 하나요?**
A: 주변광이 필요하고, 어두울수록 좋은 게 아니에요. 평범한 실내 조명이나 밝은 환경에서 더 잘 보여요. 어두운 환경에서는 외부 조명을 추가해야 해요. 이 예제에는 백라이트도 없고 BLC도 연결하지 않았으니까요.

## 응용 아이디어: ST7305를 켠 다음에 또 무엇을 할 수 있을까

- 온습도 센서를 연결해서 6페이지의 데모 데이터를 실제 환경 데이터로 바꿔 보세요.
- 버튼이나 로터리 인코더를 추가해서 15개 페이지를 수동으로 전환하고 체류 시간을 조절해 보세요.
- 부분 갱신: CASET/RASET으로 윈도를 설정하고 `WRMEMC 0x3C`와 함께 사용해서 전체 프레임 전송을 줄여 보세요.
- TE 프레임 동기를 연결해서 V-Blank 이후에 프레임을 쓰고, 동적 화면의 티어링 제어를 더 연구해 보세요.
- 잘라낸 한글/중국어 글꼴을 추가해서 저갱신율 날씨 표시판, 달력, 시계를 만들어 보세요.
- 매뉴얼 타이밍에 따라 정적 페이지에서 LPM으로 돌아가고, "저전력"이라는 세 글자에 스스로 감동하기보다 실제 기기의 소비 전력을 직접 측정해 보세요.

## 참고 자료

- [ST7305 데이터시트 (Sitronix)](https://www.sitronix.com.tw/): 레지스터 정의, HPM/LPM 타이밍, 초기화 절차는 공식 데이터시트를 기준으로 해요
- [U8g2 라이브러리](https://github.com/olikraus/u8g2): v2.36부터 `U8G2_ST7305_300X400_1_4W_HW_SPI` 생성자를 내장해요
- [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library): 서드파티 ST7305 Arduino 드라이버 래퍼
- [Arduino Nano ESP32 공식 문서](https://docs.arduino.cc/hardware/nano-esp32/): 보드 실크스크린과 GPIO 매핑 관계

여러분도 화면을 켜는 데 성공했다면, 4페이지 픽셀 그리드와 7페이지 프레임레이트 테스트부터 확인해 보고, 자신만의 인터페이스를 `pages[]`에 추가해 보세요. 흑과 백 두 가지 색만 있는 화면이라도 대시보드, 애니메이션, 레트로 데스크톱까지 꽤 바쁘게 놀 수 있어요.
