---
title: "ESP32-S3으로 TK015F5785 원형 화면 켜기(JD9855 QSPI)｜룩업 테이블 화려한 애니메이션 완전 튜토리얼"
boardId: esp32s3
moduleId: display/tft15-jd9855
category: esp32
date: 2026-07-30
intro: "ESP32-S3으로 QSPI를 통해 1.5인치 TK015F5785 원형 화면을 켭니다(실제 드라이버는 JD9855이며, 제조사가 표방한 ST77916이 아닙니다). 단일 파일로 직접 작성한 드라이버와 Plasma / 무지개 색 팔레트 / 방사형 물결 무늬 세 가지 룩업 테이블 애니메이션을 포함하며, Arduino IDE에서 바로 컴파일·업로드할 수 있고 피해야 할 함정 가이드도 함께 제공합니다."
image: "https://img.lingflux.com/2026/07/8f43dd78cc005af725bd601e0a262621.jpg"
---

난이도: ⭐⭐⭐☆☆ (마이크로컨트롤러 기초가 있으면 더 빠르게 익히고, 완전 초보자도 그대로 따라 하면 실행할 수 있습니다)
예상 소요 시간: 30~45분 (타오바오 배송을 기다리는 시간은 제외)
테스트 환경: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 (ESP-IDF v5 기반, 반드시 이 메이저 버전이어야 합니다. 이유는 뒤에서 설명)

---

> **한 줄 요약**: ESP32-S3으로 QSPI를 통해 1.5인치 TK015F5785 원형 화면을 켭니다 — 제조사가 표방한 드라이버는 ST77916이지만, 실제로 IC ID를 읽어 보니 JD9855임을 알게 되었습니다. 본문에서는 ESP-IDF에 내장된 `esp_lcd_panel_io`로 수십 줄짜리 단일 파일 미니 드라이버를 직접 작성해 Plasma 플라즈마 흐름 / 무지개 색 팔레트 / 방사형 물결 무늬 세 가지 룩업 테이블 애니메이션을 구동합니다. 어떤 라이브러리도 설치하지 않고, 런타임에 `sin`/`atan2`/`sqrt`를 호출하지 않으며, 30분이면 화면을 가득 채우는 부드러운 애니메이션을 만들 수 있습니다.

---

## 서문

처음에는 원형 화면을 켜는 게 "전원을 연결하고 아무 색 블록이나 보내면 되는" 5분짜리 일이라고 생각했습니다. 제조사에서 드라이버 칩이 ST77916이라고 했으니까요. 이 칩은 GFX library for Arduino에 포함되어 있습니다. 하지만 코드를 업로드하자 화면이 검정에서 점차 흰색으로 변했고, 결국… 전혀 동작하지 않았습니다. 나중에 제조사에 ESP-IDF 드라이버 코드를 요청해 받아 보니, 이 화면의 실제 드라이버는 JD9855였고, 화면의 IC ID(IC ID가 반환한 코드는 `FF 98 55 00`)를 통해서도 이 화면의 드라이버 칩이 확실히 JD9855임이 확인되었습니다. 여러분이 쉽게 재현할 수 있도록, 저는 ESP-IDF에 내장된 `esp_lcd_panel_io`로 수십 줄짜리 미니 드라이버를 직접 만들었습니다 — 라이브러리를 설치할 필요도, 폰트를 설정할 필요도, 심지어 전용 헤더 파일 하나 없이도, 모두 하나의 .ino에 넣어 실행할 수 있습니다.

이 튜토리얼은 1.5인치 TK015F5785 원형 화면을 "손에 넣었을 때는 검은 유리 한 조각"에서 "화면 가득 흐르는 화려한 애니메이션"까지 켜내는 전체 과정을 정리한 것입니다. 여기에는 배선, 드라이버 원리, 그리고 `sin`/`atan2`/`sqrt`를 호출하지 않는 세 가지 부드러운 애니메이션 알고리즘이 포함되어 있습니다. 따라 하시면 30분 안에 여러분의 원형 화면도 돌아가게 만들 수 있습니다.

> **TL;DR(시간이 부족한 분은 여기를 바로 보세요):**
>
> 1. 배선: SCLK→GPIO6, D0→GPIO15, D1→GPIO7, D2→GPIO11, D3→GPIO12, CS→GPIO16
> 2. Arduino IDE에서 Board = **ESP32S3 Dev Module**, USB CDC On Boot = **Enabled** 선택
> 3. 어떤 서드파티 라이브러리도 설치할 필요 없이, 코드는 전적으로 ESP-IDF에 내장된 `esp_lcd_panel_io`에 의존하며, 코어 버전은 반드시 **v3.x**여야 합니다
> 4. .ino 전체를 복사·붙여넣기하고 컴파일·업로드하면, 전원 인가 즉시 화면 가득 흐르는 색 애니메이션이 나타납니다. 화면이 나오지 않으면 함정을 밟은 것이니 "자주 묻는 문제 해결" 쪽으로 내려가 확인하세요.

---

## 실험 결과

전원을 인가하면 화면이 세 가지 룩업 테이블 알고리즘으로 생성된 색 애니메이션을 자동으로 반복 재생합니다. 각각 6초 동안 머무르며, 끊김 현상이나 줄 단위 스캔으로 인한 찢어짐(tearing) 없이 부드럽게 동작합니다.

- **Plasma 플라즈마 흐름**: 색이 액체처럼 끊김 없이 흐릅니다
- **무지개 색 팔레트**: 전체 색 스펙트럼이 원심을 따라 천천히 회전하며, 쉬지 않고 도는 색 팔레트처럼 보입니다
- **방사형 물결 무늬**: 색 물결이 원심에서 바깥으로 퍼져 나갑니다

전원을 인가하자마자 화면 가득 애니메이션이 나타나고, 별도의 조작이 필요 없어서 "이 화면이 정말 살아 있다"는 것을 확인하는 검증용 실험으로 적합합니다.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/cqIo77cn1oA?si=Y7RjMyDpAsaN92ug" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 부품 설명

> 개발 보드(ESP32-S3)는 자세히 설명하지 않고, 여기서는 보드 외의 핵심 부품만 다룹니다.

### TK015F5785 원형 화면

TK015F5785는 1.5인치 원형 **IPS** 디스플레이(드라이버 칩 JD9855)로, ESP32-S3이 보낸 픽셀 데이터를 화면으로 표시하는 역할을 합니다. 이 프로젝트에서는 세 가지 룩업 테이블 애니메이션의 최종 시각 출력을 담당합니다. 아래 표의 수치는 따로 표시하지 않는 한 제조사가 제공한 모듈 규격서를 따랐습니다.

| 항목       | 수치 / 설명                                              | 출처               |
| ---------- | -------------------------------------------------------- | ------------------ |
| 크기       | 1.5인치                                                   | 제조사 규격서         |
| LCD 유형   | IPS, 전시야각                                              | 제조사 규격서         |
| 해상도     | 360 × 360                                                | 제조사 규격서         |
| 드라이버 칩   | JD9855(동일 모델의 모듈 중 ST77916 버전도 있으며, 실측 IC ID를 기준으로 합니다) | 제조사 규격서 + 실측  |
| 표시 영역   | Φ38.16 mm(지름)                                        | 제조사 규격서         |
| 외형 치수   | 44.32 × 44.32 × 3.5 mm                                   | 제조사 규격서         |
| 픽셀 피치   | 0.106 × 0.106 mm                                         | 제조사 규격서         |
| 색상 수     | 65K 색(RGB565, 16bit/픽셀)                             | 제조사 규격서         |
| 밝기       | 500 cd/m²                                                | 제조사 규격서         |
| 백라이트       | 백색 LED 4개 병렬                                         | 제조사 규격서         |
| 작동 온도   | -20 ~ 60 ℃                                              | 제조사 규격서         |
| 인터페이스 유형   | QSPI(SCLK + D0~D3 + CS)                                | 본 튜토리얼 실측         |
| 통신 클럭   | 20MHz(본 튜토리얼 테스트 값)                                     | 실측               |

> **주문 전 버전을 반드시 확인하세요**: 제조사의 모듈 규격서는 이 화면을 「인터페이스 RGB / 드라이버 칩 ST77916 **또는** JD9855」로 표기하고 있습니다 — 즉 동일 모델명 TK015F5785라도 드라이버 IC와 인터페이스 조합에 따라 다르게 출하된다는 뜻입니다. 본 튜토리얼은 **JD9855 + QSPI** 버전을 다룹니다(서문에서 IC ID = `FF 98 55 00`을 읽어 칩이 제조사가 처음에 말한 ST77916이 아님을 확인했습니다). 만약 ST77916 버전이나 RGB 인터페이스 버전을 구매하셨다면, 초기화 레지스터 시퀀스와 배선을 모두 바꿔야 하므로 본문 코드를 그대로 복사해 쓸 수 없습니다.

원형 화면의 물리적 가시 영역은 지름 Φ38.16 mm인 원이며, 0.106mm/픽셀로 환산하면 픽셀 반지름 180px에 정확히 대응합니다 — 따라서 코드에서 `R2MAX = 180²`는 원 바깥의 픽셀을 능동적으로 검정으로 만들어 원형 테두리를 깔끔하게 유지합니다("자주 묻는 문제 해결" 4번 참고).

이 화면을 선택한 이유는 단순합니다. QSPI 인터페이스는 전통 SPI보다 데이터 선이 3개 더 많고, 데이터를 밀어내는 대역폭이 일반 SPI의 4배입니다. 360×360 정도 픽셀 규모를 단선 SPI로 밀어내면 프레임 속도가 매우 좋지 않습니다.

### 핀 설명

| 핀              | 기능                                    |
| ----------------- | --------------------------------------- |
| SCLK              | QSPI 클럭 선                             |
| D0 / D1 / D2 / D3 | QSPI 4개의 데이터 선(Quad Mode에서 병렬 전송) |
| CS                | 칩 셀렉트, LOW로 당겨 이 화면을 선택                      |
| BL(백라이트)        | 백라이트 제어, 일부 모듈은 이 핀을 노출하지 않음          |
| VCC               | 전원 공급, 보통 3.3V                         |
| GND               | 공통 그라운드                                  |

### JD9855(드라이버 칩)

JD9855는 칩 제조사 Jadard(제다과기, 杰达科技)가 출시한, 화면 모듈에 통합된 단일 칩 TFT LCD 드라이버 IC입니다. 내장 디스플레이 버퍼(GRAM)를 갖추고 있으며, 수신한 픽셀 데이터를 버퍼에 기록하고 액정 셀이 발색하도록 제어합니다. 이 프로젝트에서는 `esp_lcd_panel_io`가 보내는 초기화 레지스터 시퀀스와 RAMWR 픽셀 쓰기 명령을 실행하는 역할을 합니다.

다행히 JD9855는 **공개된 데이터시트**가 있습니다(칩 제조사 Jadard(제다과기, 杰达科技)가 2023년 10월에 발행한 Preliminary V0.00 버전). 데이터시트에 따르면 핵심 사양은 다음과 같습니다.

| 항목               | 수치 / 설명                                                                                       | 데이터시트 출처       |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------ |
| 구동 능력           | 단일 칩 SOC로 a-Si TFT 구동, 최대 360 RGB×390(Dual-Gate=780) 도트, 540채널 소스 드라이브                      | Features / Intro   |
| 내장 프레임 버퍼         | 360×390×18 bit(약 315 KB GRAM)                                                                   | Features           |
| 지원 인터페이스           | 8080 패럴렐(8-bit), RGB(6-bit), SPI(8/9-bit, 2-lane), **QSPI(DDR 지원)**, MIPI-DSI           | System Interface   |
| 색상 포맷           | RGB565(16-bit) / RGB666(18-bit)                                                                | Color Format       |
| I/O 전압           | 1.65V ~ 3.3V                                                                                       | Features           |
| 작동 온도           | -40 ~ +85 ℃                                                                                       | Features           |

이 데이터시트는 0x2A(CASET), 0x2B(RASET), 0x2C(RAMWR), 0x36(MADCTL), 0x3A(COLMOD) 등 명령의 비트 정의와 타이밍을 명확히 나열하고 있습니다 — 본문 코드에서 사용하는 것도 바로 이 표준 명령들입니다. **참고로**, 데이터시트에 공개된 것은 명령어 세트와 타이밍이며, 감마(Gamma) 보정, 전원 승압, 제조사별 자체 서브 명령(본문 초기화 시퀀스의 `0xDE` / `0xDF` / `0xC3`처럼 「명령 Bank 전환」이 붙은 레지스터) 등의 화면 조정 파라미터는 여전히 패널 제조사가 자사 화면에 맞춰 한 대 한 대 조정한 사설 초기화 테이블에 해당합니다. 이 부분은 제조사가 제공한 시퀀스를 그대로 옮겨 적으면 화면이 켜지므로, 각 명령의 의미를 깊이 파고들 필요는 없습니다.

---

## BOM 표

| 부품                                 | 수량   | 비고                                                          |
| ------------------------------------ | ------ | ------------------------------------------------------------- |
| ESP32-S3 개발 보드                      | 1      | 각도 룩업 테이블 폴백을 위해 PSRAM 탑재 버전을 권장                       |
| TK015F5785 원형 화면 모듈(JD9855 / QSPI) | 1      | 반드시 JD9855+QSPI 버전인지 확인(동일 모델에 ST77916/RGB 버전도 있음, 부품 설명 참고) |
| 점퍼 와이어(암-암, 모듈 핀 헤더에 따라)     | 6개 이상 | SCLK / D0~D3 / CS 합계 6개, 추가로 VCC / GND 필요                     |

---

## 배선 방식

| 화면 핀   | ESP32-S3 핀에 연결                         |
| ---------- | ------------------------------------------ |
| SCLK       | GPIO6                                      |
| D0         | GPIO15                                     |
| D1         | GPIO7                                      |
| D2         | GPIO11                                     |
| D3         | GPIO12                                     |
| CS         | GPIO16                                     |
| BL(백라이트) | 이 모듈은 노출되지 않아 소프트웨어 제어 불가, 전원을 연결하면 항상 켜짐 |
| VCC        | 3.3V                                       |
| GND        | GND                                        |

모두 연결한 뒤 하나하나 다시 확인하길 권합니다 — 문제 해결 시간의 80%를 줄일 수 있습니다. QSPI는 데이터 선이 4개라 두 가닥을 거꾸로 꽂았을 때 현상이 보통 검은 화면이 아니라 잡음(noise)이 섞인 화면으로 나타나, 완전히 검은 화면보다 원인을 찾기 더 어렵습니다.

---

## 설치해야 할 라이브러리

좋은 소식이 있습니다: **어떤 서드파티 라이브러리도 설치할 필요가 없습니다**. 전체 드라이버는 ESP-IDF에 내장된 `driver/spi_master.h`, `esp_lcd_panel_io.h`, `esp_heap_caps.h`를 직접 호출하며, 이들 헤더 파일은 Arduino ESP32 코어에 기본 포함되어 있습니다.

유일한 필수 요구사항은 Arduino IDE의 **ESP32 개발 보드 코어가 v3.x**여야 한다는 것입니다(ESP-IDF v5 기반). v2.x 코어는 저층 ESP-IDF v4.4를 사용하며, `esp_lcd_panel_io_tx_param` / `esp_lcd_panel_io_tx_color` 이 API 세트는 구버전에서 동작과 헤더 파일 경로가 모두 달라, 그대로 컴파일하면 "기호를 찾을 수 없습니다" 또는 "함수 시그니처가 일치하지 않습니다"라는 오류가 발생합니다.

업그레이드 방법: Arduino IDE → 도구 → 보드 → 보드 매니저에서 "esp32"를 검색해 espressif의 코어 패키지를 3.x 이상으로 업데이트하세요.

---

## 완전한 코드

> 코드 자체는 단일 파일이며, 새 .ino에 복사·붙여넣기하면 바로 컴파일할 수 있습니다. CS 핀은 `16`입니다(과거 한 버전에서 존재하지 않는 `160`으로 잘못 적혀 있었습니다. "자주 묻는 문제 해결" 1번 참고).

```cpp
/*
 * =============================================================================
 *  TK015F5785 원형 화면 (JD9855, QSPI) 단일 파일 화려한 데모 —— Arduino IDE 버전
 * =============================================================================
 *
 *  ✦ 단일 파일: 드라이버 + 데모가 모두 이 .ino 하나에 들어 있고, 복사·붙여넣기만 하면 됩니다. 외부 파일은 필요 없습니다.
 *
 *  데모 효과 (3개 씬이 자동으로 반복되며, 각각 약 6초, 모두 부드럽고 끊김 없음):
 *    [1] Plasma 플라즈마 흐름   —— 색이 액체처럼 흐름 (sin 룩업 테이블)
 *    [2] 무지개 색 팔레트       —— 전체 색 스펙트럼 + 천천히 회전 (각도 사전 계산 룩업 테이블)
 *    [3] 방사형 물결 무늬       —— 중심에서 바깥으로 퍼지는 색 물결 (r² 위상)
 *
 *  전원 인가 즉시 화면 가득 색이 흐르며, "화면이 켜졌고 색도 정상"임을 직관적으로 보여주어 점등 데모로 적합합니다.
 *
 *  성능 핵심: 세 씬의 픽셀별 연산은 모두 "룩업 테이블 + 정수 덧셈/뺄셈"이며, sin/atan2/sqrt를 호출하지 않기 때문에
 *           프레임 렌더링이 매우 빠르고, 줄 단위 스캔이 눈에 보이지 않아 전부 부드럽습니다.
 *
 *  하드웨어: ESP32-S3 + TK015F5785 (JD9855, QSPI)
 *    SCLK=6  D0=15  D1=7  D2=11  D3=12  CS=16  백라이트=-1(노출되지 않아 제어 불가)
 *  의존: Arduino IDE의 esp32 코어 v3.x만 있으면 됨. 외부 라이브러리 / 폰트 / 외부 헤더 파일 없음.
 *  업로드: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled, 시리얼 115200.
 * =============================================================================
 */

#include <Arduino.h>
#include <math.h>
#include <initializer_list>
#include "driver/spi_master.h"
#include "esp_lcd_panel_io.h"
#include "esp_heap_caps.h"

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/* ----------------------------- 핀 설정 ----------------------------- */
/* HelloWorld / 테스트 프로그램과 동일, 배선을 바꿀 때 함께 수정 */
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1      /* 백라이트, -1이면 제어 안 함 */ // 현재 모듈은 노출되어 있지 않아 제어 불가

/* =====================================================================
 *  화면 드라이버 (JD9855 QSPI) —— 그대로 옮겨 쓰면 됨, 보통 수정 불필요
 *  원리: Arduino-ESP32 3.x는 ESP-IDF 기반이며, esp_lcd_panel_io를 직접 호출해 QSPI를 구동.
 * ===================================================================== */
#define JD9855_SWRESET 0x01
#define JD9855_CASET   0x2A
#define JD9855_RASET   0x2B
#define JD9855_RAMWR   0x2C
#define JD9855_MADCTL  0x36
#define JD9855_COLMOD  0x3A
#define JD9855_SLPOUT  0x11
#define JD9855_DISPON  0x29

class JD9855_QSPI {
public:
    static constexpr int H_RES = 360;
    static constexpr int V_RES = 360;

    /* 표준 RGB565 */
    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b)
    {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1)
    {
        if (backlight >= 0) { pinMode(backlight, OUTPUT); digitalWrite(backlight, HIGH); }

        spi_bus_config_t buscfg = {};
        buscfg.sclk_io_num  = sclk;
        buscfg.data0_io_num = d0;
        buscfg.data1_io_num = d1;
        buscfg.data2_io_num = d2;
        buscfg.data3_io_num = d3;
        buscfg.max_transfer_sz = H_RES * V_RES * 2;
        esp_err_t ret = spi_bus_initialize(SPI2_HOST, &buscfg, SPI_DMA_CH_AUTO);
        if (ret != ESP_OK) { log_e("spi_bus_initialize: %s", esp_err_to_name(ret)); return false; }

        esp_lcd_panel_io_spi_config_t io_config = {};
        io_config.cs_gpio_num        = cs;
        io_config.dc_gpio_num        = -1;
        io_config.spi_mode           = 3;
        io_config.pclk_hz            = 20 * 1000 * 1000;
        io_config.trans_queue_depth  = 10;
        io_config.lcd_cmd_bits       = 32;
        io_config.lcd_param_bits     = 8;
        io_config.flags.quad_mode    = true;
        ret = esp_lcd_new_panel_io_spi(SPI2_HOST, &io_config, &io);
        if (ret != ESP_OK) { log_e("esp_lcd_new_panel_io_spi: %s", esp_err_to_name(ret)); return false; }

        sendCmd(JD9855_SWRESET);
        delay(20);
        sendInitCommands();
        return true;
    }

    /* RGB565(리틀 엔디안) 버퍼를 사각형 영역에 밀어 넣기 */
    void pushRect(int x, int y, int w, int h, const uint16_t *data)
    {
        if (w <= 0 || h <= 0) return;
        setAddrWindow(x, y, x + w - 1, y + h - 1);
        size_t n = (size_t)w * h;
        ensureDmaBuf(n * 2);
        for (size_t i = 0; i < n; i++) {
            uint16_t c = data[i];
            dma_buf[i * 2]     = c >> 8;
            dma_buf[i * 2 + 1] = c & 0xFF;
        }
        sendColor(JD9855_RAMWR, dma_buf, n * 2);
    }

    /* 전체 화면 채우기 (줄 단위, 메모리 사용량 매우 적음) */
    void fillScreen(uint16_t color)
    {
        uint8_t hi = color >> 8, lo = color & 0xFF;
        const int BUF_PIX = H_RES;
        ensureDmaBuf(BUF_PIX * 2);
        for (int i = 0; i < BUF_PIX; i++) { dma_buf[i*2] = hi; dma_buf[i*2+1] = lo; }
        for (int y = 0; y < V_RES; y++) {
            setAddrWindow(0, y, H_RES - 1, y);
            sendColor(JD9855_RAMWR, dma_buf, BUF_PIX * 2);
        }
    }

private:
    esp_lcd_panel_io_handle_t io = nullptr;
    uint8_t *dma_buf = nullptr;
    size_t   dma_buf_size = 0;

    void ensureDmaBuf(size_t need)
    {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1)
    {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data)
    {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    /* JD9855 제조사 초기화 시퀀스 (ESP-IDF 버전 esp_lcd_jd9855 드라이버에서 이식) */
    void sendInitCommands()
    {
        sendCmd(0xFF, {0x20, 0x10, 0x00});
        sendCmd(JD9855_MADCTL, {0x00});
        sendCmd(JD9855_COLMOD, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0xDF, {0x98, 0x55});
        sendCmd(0xCE, {0x0D, 0x00});
        sendCmd(0xD8, {0x08, 0x00});
        sendCmd(0xB2, {0x30});
        sendCmd(0xB7, {0x01, 0x35, 0x01, 0x5D});
        sendCmd(0xBB, {0x1B, 0x64, 0xE3, 0x34, 0x3E, 0xF3});
        sendCmd(0xBC, {0x00, 0x1A, 0xF3, 0xC0});
        sendCmd(0xC0, {0x22, 0xC1});
        sendCmd(0xC3, {0x00, 0x01, 0x8D, 0x0B, 0x08, 0x48, 0x07, 0x04, 0x62, 0x30, 0x30});
        sendCmd(0xC4, {0x40, 0x00, 0xAD, 0x68, 0x37, 0x07, 0x04, 0x16, 0x43, 0x07, 0x04});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xD3, {0x28, 0x13});
        sendCmd(0xD9, {0x00, 0x00, 0xFF, 0x00, 0xF0, 0x00});
        sendCmd(0xDE, {0x01});
        sendCmd(0xB7, {0x17, 0xA7, 0x64, 0x3B, 0x06, 0x36, 0x18, 0x18});
        sendCmd(0xBE, {0x00});
        sendCmd(0xC1, {0x04, 0x40, 0x90, 0x08});
        sendCmd(0xC2, {0x00, 0x16, 0xDA, 0xE7});
        sendCmd(0xC4, {0x72, 0x12});
        sendCmd(0xC7, {0x00, 0x00, 0x02, 0x32, 0x10, 0x32});
        sendCmd(0xC8, {0x00, 0x00, 0x0B, 0x32, 0x12, 0x2E});
        sendCmd(0xC9, {0x00, 0x0A, 0x08, 0x06, 0x04});
        sendCmd(0xCA, {0x1E, 0x1F, 0x10, 0x17, 0x18});
        sendCmd(0xCB, {0x01, 0x0B, 0x09, 0x07, 0x05});
        sendCmd(0xCC, {0x1E, 0x1F, 0x11, 0x17, 0x18});
        sendCmd(0xCD, {0x31, 0x25, 0x27, 0x29, 0x2B});
        sendCmd(0xCE, {0x3F, 0x3E, 0x21, 0x37, 0x38});
        sendCmd(0xCF, {0x30, 0x24, 0x26, 0x28, 0x2A});
        sendCmd(0xD0, {0x3F, 0x3E, 0x20, 0x37, 0x38});
        sendCmd(0xD1, {0x06, 0x30, 0xA5, 0xDB, 0x30});
        sendCmd(0xD3, {0x3B, 0x08, 0x00, 0x00, 0x00, 0x00});
        sendCmd(0xD4, {0x67, 0x00, 0x00, 0x01, 0x00, 0x01});
        sendCmd(0xD5, {0x10, 0x10, 0x07, 0x07, 0x0F, 0x94, 0x26});
        sendCmd(0xD6, {0x00, 0x00, 0x40});
        sendCmd(0xD7, {0x01, 0x84, 0x20});
        sendCmd(0xDE, {0x02});
        sendCmd(0xB6, {0x1C});
        sendCmd(0xDE, {0x00});
        sendCmd(0x2A, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x2B, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x35);
        sendCmd(0x36, {0x00});
        sendCmd(0x3A, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0x11);            /* 슬립 종료 */
        delay(120);
        sendCmd(0x29);            /* 디스플레이 켜기 */
        delay(10);
    }
};

/* =====================================================================
 *  데모 부분 —— 여기가 핵심입니다
 *  아이디어: 매 프레임 줄별로 각 픽셀의 색을 계산해 화면에 밀어 넣습니다.
 *       "위치에만 의존하고 시간과 무관한" 모든 양 (sin, 색상, 각도)은 미리 룩업 테이블로 만들어 두고,
 *       런타임에는 픽셀마다 "룩업 테이블 + 정수 덧셈/뺄셈"만 수행하므로 세 씬 모두 부드럽습니다.
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     /* 360 */
static constexpr int H = JD9855_QSPI::V_RES;     /* 360 */
static constexpr int CX = W / 2;                  /* 원심 x */
static constexpr int CY = H / 2;                  /* 원심 y */
static constexpr int RADIUS = 180;                /* 원형 화면 가시 반지름 */
static constexpr int R2MAX  = RADIUS * RADIUS;    /* 원 바깥의 r² 임계값 (180²=32400) */

static const int BLOCK_H = 40;             /* 한 번에 40줄씩 렌더링+전송, 전송 횟수를 크게 줄임 */
uint16_t blockBuf[W * BLOCK_H];            /* 블록 버퍼 (360*40*2=28KB, 내부 RAM, PSRAM 불필요) */
uint8_t  sinTab[256];       /* 사인 룩업 테이블: sinTab[i] = sin(i/256*2π)*127+128 */
uint16_t hsvTab[256];       /* 색상(0-255) -> RGB565 룩업 테이블 (채도/명도 최대) */
uint8_t *angleTab = nullptr;/* 픽셀별 원심 기준 각도 룩업 테이블 (360*360B), 원판 씬에서 atan2 호출 방지 */

/* HSV(0-359, 0-255, 0-255) -> RGB565 */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v)
{
    uint8_t region = h / 60;
    uint8_t rem    = (h - region * 60) * 255 / 60;
    uint8_t p = (uint16_t)v * (255 - s) / 255;
    uint8_t q = (uint16_t)v * (255 - (uint16_t)s * rem / 255) / 255;
    uint8_t t = (uint16_t)v * (255 - (uint16_t)s * (255 - rem) / 255) / 255;
    uint8_t r, g, b;
    switch (region) {
        case 0:  r = v; g = t; b = p; break;
        case 1:  r = q; g = v; b = p; break;
        case 2:  r = p; g = v; b = t; break;
        case 3:  r = p; g = q; b = v; break;
        case 4:  r = t; g = p; b = v; break;
        default: r = v; g = p; b = q; break;
    }
    return JD9855_QSPI::color565(r, g, b);
}

/* 시작 시 sin / 색상 두 테이블을 생성하고, 이후 렌더링은 룩업만 수행 */
void buildTables()
{
    for (int i = 0; i < 256; i++) {
        float s = sinf(i / 256.0f * 2.0f * (float)M_PI);
        sinTab[i] = (uint8_t)(s * 127.0f + 128.0f);
    }
    for (int h = 0; h < 256; h++) {
        hsvTab[h] = hsvTo565(h * 360 / 256, 255, 255);
    }
}

/* 픽셀별 원심 기준 각도(atan2)를 미리 계산해 0-255 룩업 테이블로 저장.
   원판 씬은 런타임에 룩업만 하고 매 프레임 atan2f를 호출하지 않습니다 (그것이 원래 끊김의 주범).
   setup에서 한 번만 계산하므로 소요 시간은 무관. 우선 내부 RAM(~126KB)에 두고, 없으면 PSRAM으로 폴백;
   둘 다 없으면 nullptr로 두어 씬이 atan2f로 강등됩니다 (볼 수는 있으나 끊김 발생). */
void buildAngleTable()
{
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab 할당 실패, 원판 씬이 느려집니다")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   /* -0.5..0.5 */
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);        /* 환상 매핑 0-255 */
        }
    }
    Serial.printf("[INIT] 각도 테이블 %d KB 준비 완료 (원판 씬이 부드러워집니다)\n", (int)(n / 1024));
}

inline uint8_t sin8(int phase) { return sinTab[(uint8_t)phase]; }

/* ---- 씬 1: Plasma 플라즈마 흐름 (룩업 테이블 전용) ---- */
inline uint16_t plasmaPixel(int x, int y, int t)
{
    int v = sin8(x * 3 + t)
          + sin8(y * 3 - t * 2)
          + sin8((x + y) * 2 + t / 2)
          + sin8((x - y) * 2 - t / 2);
    return hsvTab[(uint8_t)(v / 4 + t)];
}

/* ---- 씬 2: 무지개 색 팔레트 (각도 룩업 테이블 + r², 정수 연산만) ---- */
inline uint16_t wheelPixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;                 /* 원 바깥은 검정, 가장자리를 깔끔하게 */
    int ang = angleTab ? angleTab[y * W + x]
                       : (int)(atan2f((float)dy, (float)dx) / (2.0f * (float)M_PI) * 256.0f);
    int hue = ang + r2 / 200 + t;             /* 반지름 방향으로 색상을 겹쳐 나선형 색 팔레트 생성 */
    return hsvTab[(uint8_t)hue];
}

/* ---- 씬 3: 방사형 물결 무늬 (r²를 위상에 직접 사용, 제곱근 불필요) ---- */
inline uint16_t ripplePixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;
    int v = sin8(r2 / 80 - t * 3);            /* 물결 위상: 거리+시간에 따라 퍼짐 */
    return hsvTab[(uint8_t)(v + r2 / 400)];
}

/* 한 프레임 렌더링: BLOCK_H줄씩 계산한 뒤 통째로 전송 (360번 전송을 9번으로 대체하여 명령 오버헤드를 줄이고 프레임 속도를 높이고,
   동시에 40줄 단위로 같이 갱신되어 줄 단위 스캔 느낌을 크게 줄임). sceneId가 픽셀 함수를 선택 (0=plasma 1=wheel 2=ripple) */
void renderFrame(int sceneId, int t)
{
    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = (H - by < BLOCK_H) ? (H - by) : BLOCK_H;
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            for (int x = 0; x < W; x++) {
                uint16_t c;
                switch (sceneId) {
                    case 0:  c = plasmaPixel(x, yy, t); break;
                    case 1:  c = wheelPixel(x, yy, t);  break;
                    default: c = ripplePixel(x, yy, t); break;
                }
                blockBuf[y * W + x] = c;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* 씬 이름 */
const char *SCENE_NAMES[] = { "Plasma 플라즈마 흐름", "무지개 색 팔레트", "방사형 물결 무늬" };
const int      N_SCENES   = 3;
const uint32_t SCENE_MS   = 6000;    /* 씬마다 6초간 머무름 */

int      curScene   = 0;
uint32_t sceneStart = 0;

/* ----------------------------- setup ------------------------------- */
void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[TK015F5785] 단일 파일 화려한 데모 (JD9855 QSPI)"));

    Serial.println(F("[LCD] begin..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] init FAILED! 핀/코어 버전을 확인하세요 (esp32 v3.x 필요)"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] init OK"));

    buildTables();
    buildAngleTable();          /* 각도 테이블 미리 계산, 원판 씬을 부드럽게 */
    lcd.fillScreen(0);
    sceneStart = millis();
    Serial.printf("[DEMO] 씬 1/%d: %s\n", N_SCENES, SCENE_NAMES[curScene]);
}

/* ----------------------------- loop -------------------------------- */
void loop()
{
    int t = (int)(millis() / 12);     /* 애니메이션 진행 스텝, 클수록 빠름 */

    renderFrame(curScene, t);

    if (millis() - sceneStart >= SCENE_MS) {
        sceneStart = millis();
        curScene   = (curScene + 1) % N_SCENES;
        Serial.printf("[DEMO] 씬 %d/%d: %s\n",
                      curScene + 1, N_SCENES, SCENE_NAMES[curScene]);
    }
}
```

### 코드 설명

첫 번째로, `JD9855_QSPI::begin()`에서 먼저 `spi_bus_initialize`로 4개의 데이터 선을 사용하는 QSPI 버스를 만들고, `esp_lcd_new_panel_io_spi`로 `quad_mode = true`인 LCD IO 장치를 연결합니다 — 이 단계가 전체 드라이버가 동작하는 핵심이며, `quad_mode`를 켜지 않으면 4개의 데이터 선 중 실제로 데이터를 전송하는 선은 하나뿐이라 프레임 속도가 볼 수 없을 정도로 떨어집니다.

두 번째로, `sendInitCommands()`는 패널 제조사가 제공한 레지스터 초기화 테이블을 그대로 옮겨 적어, 각 항목을 `esp_lcd_panel_io_tx_param`으로 차례로 보냅니다. 각 레지스터의 의미를 이해할 필요는 없으며, 화면을 바꾸더라도 이 부분은 그대로 둡니다.

세 번째이자 이 코드의 진짜 핵심은, 세 애니메이션 씬 모두 런타임에 `sin`, `atan2`, `sqrt` 같은 느린 함수를 호출하지 않고, `setup()` 단계에서 모두 룩업 테이블(`sinTab`, `hsvTab`, `angleTab`)로 미리 계산해 둔다는 점입니다. 런타임에 각 픽셀은 "룩업 테이블 + 정수 덧셈/뺄셈"만 수행하며, 이것이 360×360 = 12만 9,600픽셀을 매 프레임 처리하면서도 찢어짐 없이 부드럽게 유지되는 이유입니다.

네 번째로, `renderFrame()`은 줄마다 전송하지 않고 `BLOCK_H = 40`줄을 모은 뒤 한 번에 `pushRect`로 통째로 보냅니다. 360줄을 9번의 전송으로 처리하여, 줄마다 360번 보내는 것에 비해 SPI 명령 오버헤드를 크게 줄입니다.

---

## 자주 묻는 문제 해결

너무 걱정하지 마세요. 아래의 몇 가지 문제가 원형 화면이 켜지지 않는 오류의 대부분을 차지합니다.

**1. 전원 인가 후 화면이 온통 검은색이고, 시리얼에 `[LCD] init OK`도 출력되지 않음** 먼저 CS 핀이 올바르게 연결되었는지 확인하세요 — 이것도 이 코드 초안에서 가장 빠지기 쉬운 함정입니다. `PIN_LCD_CS`가 한때 존재하지 않는 `160`(없는 GPIO 번호)으로 잘못 적혀 있었고, 본문의 코드 블록에서는 `16`으로 이미 수정했습니다. 다른 곳에서 복사한 예전 버전을 사용 중이라면 반드시 이 줄이 `160`이 아니라 `16`인지 확인하세요.

**2. 화면은 켜지지만 잡음이 섞이고 색이 뒤섞임** 십중팔구 D0~D3 네 개의 데이터 선 순서가 거꾸로 꽂혀 있는 것입니다. QSPI는 선 순서에 민감하며, 일반 SPI의 MOSI/MISO를 잘못 연결한 것과는 상황이 다릅니다. 감으로 꽂지 말고 배선 표를 보고 한 가닥씩 확인하세요.

**3. 컴파일 오류, `esp_lcd_panel_io.h`를 찾을 수 없다는 메시지** 현재 Arduino ESP32 코어가 아직 v2.x(ESP-IDF v4.4 기반)라는 뜻입니다. 보드 매니저에서 espressif의 esp32 코어를 v3.x 이상으로 업그레이드한 뒤 다시 컴파일하세요.

**4. 원형 화면의 네 모서리가 계속 검은색인데, 연결이 잘못된 건가요?** 정상 현상이며 고장이 아닙니다. 코드에서 `R2MAX = 180²`이며 이 반지름을 넘는 픽셀은 능동적으로 검정으로 채워집니다. 원형 화면의 물리적 가시 영역은 애초에 원이고 네 모서리는 프레임에 가려져 있어, 이렇게 처리하면 가장자리가 오히려 더 깔끔해집니다.

**5. 시리얼에 `angleTab 할당 실패`가 출력되고 원판 씬이 끊김** 내부 RAM으로 이 약 126KB(360×360 바이트)짜리 각도 테이블을 할당하기 부족하다는 뜻입니다. 코드에는 이미 폴백 로직이 들어 있습니다: 먼저 내부 RAM을 시도하고, 안 되면 PSRAM으로 물러나며, 그래도 안 되면 `atan2f`로 즉석에서 계산합니다(볼 수는 있으나 확실히 느려짐). 개발 보드에 PSRAM이 없는데 원판 씬만 유독 다른 두 씬보다 끊긴다면 원인은 바로 이것이며, PSRAM 탑재 보드로 바꾸면 근본적으로 해결됩니다.

**6. 백라이트가 항상 켜져 있고 꺼지지 않음** 코드에서 `PIN_LCD_BL`이 `-1`로 설정되어 있고 주석에도 "현재 모듈은 노출되어 있지 않아 제어 불가"라고 적혀 있습니다 — 모듈이 실제로 백라이트 제어 핀을 노출하고 있다면, 이 매크로를 해당 GPIO 번호로 바꾸고 `begin()`에 넘겨주면 소프트웨어 디밍/스위치를 구현할 수 있습니다.

---

## FAQ 질문/답변

**Q: ESP32로 원형 화면을 어떻게 켜나요?** A: 핵심은 QSPI 인터페이스와 `esp_lcd_panel_io`로 드라이버 칩을 직접 연결하는 것이며, TFT_eSPI 같은 범용 그래픽 라이브러리에 의존하지 않습니다. 배선 시 SCLK/D0~D3/CS 다섯 가닥을 올바르게 맞추고, 초기화 레지스터 테이블은 패널 제조사가 제공한 시퀀스를 그대로 옮겨 적으면 화면이 켜집니다.

**Q: JD9855 드라이버 원형 화면은 어떤 라이브러리를 쓰나요?** A: 추가 라이브러리가 필요하지 않습니다. JD9855는 주류 그래픽 라이브러리(TFT_eSPI, LVGL 공식 드라이버 목록 등)에 내장 지원되지 않으므로, 본문처럼 ESP-IDF에 내장된 `esp_lcd_panel_io` API를 직접 호출해 수십 줄의 초기화 코드를 직접 작성하는 것이 가장 안정적입니다.

**Q: QSPI 화면과 일반 SPI 화면은 배선이 어떻게 다른가요?** A: 일반 SPI는 데이터 선이 1개(MOSI)뿐이지만, QSPI는 4개(D0~D3)를 병렬로 전송하여 대역폭이 일반 SPI의 4배입니다. 대신 배선이 3가닥 더 늘어나고, `esp_lcd_panel_io_spi_config_t`에서 `flags.quad_mode`를 반드시 `true`로 설정해야 합니다.

**Q: ESP32-S3 원형 화면이 계속 검은 화면인 이유는 뭔가요?** A: 가장 흔한 세 가지 원인을 확률 순으로 나열하면: CS 핀을 잘못 연결하거나 번호를 잘못 적음, 개발 보드 코어 버전이 v3.x 미만이라 초기화 실패, 전원 공급 불안정(QSPI 배선이 길 때 더 뚜렷이 나타남). 시리얼에 `[LCD] init OK`가 출력되는지 확인하면 드라이버 계층의 문제인지 배선 문제인지 빠르게 좁힐 수 있습니다.

**Q: Arduino에서 esp_lcd_panel_io로 화면을 어떻게 구동하나요?** A: 세 단계로 진행합니다: `spi_bus_initialize`로 SPI 버스를 만들고, `esp_lcd_new_panel_io_spi`로 LCD IO 핸들을 생성(이때 CS/클럭 주파수/SPI 모드/quad_mode를 지정)하며, 마지막으로 `esp_lcd_panel_io_tx_param`으로 명령을, `esp_lcd_panel_io_tx_color`로 픽셀 데이터를 보냅니다.

**Q: ESP32 원형 화면에 TFT_eSPI 라이브러리를 쓸 수 있나요?** A: TFT_eSPI는 주로 자체 내장 지원 목록에 있는 드라이버 칩을 대상으로 하며, JD9855 같은 마이너한 QSPI 드라이버 칩은 포함되어 있지 않습니다. 억지로 쓰려면 보통 드라이버 계층 코드를 직접 수정해야 해서, 차라리 ESP-IDF 네이티브 API로 직접 작성하는 것이 더 수월합니다.

**Q: 360×360 해상도 원형 화면은 메모리가 충분한가요?** A: 충분하지만 할당 방식에 주의해야 합니다. 화면 전체를 한 번에 버퍼링하려면 360×360×2바이트 ≈ 253KB가 필요합니다. 본문은 블록 단위 렌더링(블록당 40줄, 약 28KB)을 사용하고 있고, 여기에 선택적인 126KB 각도 룩업 테이블을 더해도 내부 RAM으로 기본적으로 충당할 수 있어, 이 화면 때문만으로 PSRAM을 외장할 필요는 없습니다(각도 테이블까지 안심하고 내부 RAM에 두고 싶다면 예외).

---

## 더 나아가기

기본 데모를 실행한 뒤에도 이 원형 화면으로 계속 가지고 놀 수 있는 방향은 꽤 많습니다.

- 세 룩업 테이블 씬을 실시간 데이터 시각화로 교체(CPU 부하, 날씨, 심박수 등. 원형 화면 형태는 대시보드 만들기에 아주 적합)
- 터치/로터리 엔코더를 연결해 상호작용 가능한 원형 컨트롤 패널 제작
- 같은 esp_lcd_panel_io 접근으로 다른 QSPI 드라이버 칩 화면 이식
- BLOCK_H와 pclk_hz를 키워 프레임 속도 스트레스 테스트를 수행해, 가지고 있는 특정 모듈의 한계 주사율 찾기

---

## 참고 자료

- <cite index="3-1">ESP-IDF 공식 LCD 주변장치 문서는 esp_lcd 컴포넌트가 Espressif가 SPI LCD, I80 LCD, RGB/SRGB LCD 등 다양한 화면을 지원하기 위해 제공하는 칩 간 범용 API라고 설명합니다</cite>：[ESP-IDF LCD Peripheral (ESP32-S3)](https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32s3/api-reference/peripherals/lcd.html)
- [ESP32-S3 시리즈 공식 데이터시트(PDF, Espressif 공식)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [espressif/arduino-esp32 공식 GitHub 저장소](https://github.com/espressif/arduino-esp32)
- <cite index="3-2">JD9855의 공개 데이터시트(칩 제조사 Jadard(제다과기, 杰达科技)가 발행한 Preliminary V0.00 버전, 2023-10-17. 아래는 OSPTek가 호스팅하는 PDF 미러)는 540채널 소스 드라이브, 360RGB×390 해상도, 내장 GRAM, 8080/SPI/QSPI/MIPI-DSI 다중 인터페이스와 CASET/RASET/RAMWR 등 명령의 완전한 타이밍을 나열합니다</cite>：[JD9855 Data Sheet (Preliminary V0.00, PDF)](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
