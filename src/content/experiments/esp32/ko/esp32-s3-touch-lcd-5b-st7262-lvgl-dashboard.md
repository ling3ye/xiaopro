---
title: "ESP32-S3으로 ST7262 RGB 디스플레이 켜기 + LVGL 대시보드 완전 튜토리얼(Waveshare Touch-LCD-5B / 1024×600)"
boardId: esp32s3
moduleId: display/tft50-st7262
category: esp32
date: 2026-08-03
intro: "ESP-IDF로 Waveshare ESP32-S3-Touch-LCD-5B(5인치 1024×600, ST7262 RGB 직접 구동)에서 RGB 화면을 처음부터 켜고, LVGL을 올려 움직이는 차량 텔레메트리 대시보드를 만드는 방법을 다룹니다. CH422G 백라이트 제어, PCLK 튜닝, PSRAM 더블 버퍼와 이징(easing) 애니메이션까지 자세히 설명하고, 완전한 ESP-IDF 코드와 함정 회피 체크리스트를 제공합니다."
image: "https://img.lingflux.com/2026/08/b7d201de3550e7561294441b57a205de.jpg"
---

난이도: ⭐⭐⭐☆☆(C를 다룰 줄 알고 ESP-IDF를 만져본 적이 있으면 바로 시작 가능)
예상 시간: 2~3시간(환경 구축 포함)
테스트 환경: ESP-IDF 5.3.x(또는 5.2.7에서 매크로 한 줄 추가) + LVGL ^9.3 + espressif/esp_lvgl_port 2.8

---

> **한 줄 요약**: ESP-IDF로 Waveshare ESP32-S3-Touch-LCD-5B(5인치 1024×600, ST7262 순수 RGB 직접 구동)에서 검은 화면부터 RGB 패널 점등, LVGL 연동까지 진행해, 최종적으로 움직이는 차량 텔레메트리 대시보드를 완성합니다. 겪은 함정(해상도 거짓말, PCLK 화면 새하얘짐, LVGL 메모리 백화, 테어링과 끊김)과 해결 코드가 모두 들어 있습니다.

---

> **TL;DR(빠른 시작):**
> 1. **사양을 정확히**: 5B는 **1024×600**, 구동 IC는 **ST7262**, 순수 RGB 직접 구동 — 공식 예제의 기본값인 800×480을 믿지 마세요.
> 2. **PCLK는 16MHz**: 보드가 정의한 21MHz을 그대로 쓰지 마세요. PSRAM에 프레임버퍼를 둘 때 대역이 따라가지 못해 전체가 하얘집니다.
> 3. **백라이트는 CH422G로**: 일반 GPIO도, PWM도 아닙니다. I²C 주소 `0x38`에 1바이트만 쓰면 켜고 끕니다.
> 4. **LVGL을 켤 땐 매크로 두 개 필수**: `LV_USE_CLIB_MALLOC=y` + `SPIRAM_USE_MALLOC=y`. 안 그러면 백화 + 와치독 리부트.
> 5. `idf.py build flash monitor`, 점등, 축배를 들습니다.

---

## 서론

주말에 밖에 나가 있었는데, 친구가 Waveshare **ESP32-S3-Touch-LCD-5B**를 하나 샀더군요. 공식 펌웨어를 굽면 정상적으로 표시되는데, 막상 코드로 점등하려 하면 안 되고, 공식 예제를 돌리면 화면이 까맣거나 새하얗게 나와서 전혀 감이 안 잡힌다고 합니다. 그래서 제가 넘겨받아 씨름하기로 했습니다. 5인치, 1024×600 RGB 정전식 터치스크린 개발 보드입니다. 보드 가격은 비싸지 않은데 사양은 꽤 호화롭습니다 — CAN, RS485, RTC, 리튬 배터리 충전까지 모두 갖췄고, 16MB Flash + 8MB PSRAM을 기본 탑재했습니다.

그래서 제가 직접 점등을 시도해 봤습니다. 최근에 화면 켜는 일을 꽤 좋아하거든요. 그런데 점등 과정의 함정이 제 예상보다 훨씬 많았습니다. 가장 사람을 포기하게 만드는 지점은 이겁니다 — **Waveshare 공식 문서와 예제를 그대로 따라 하면 점등이 안 됩니다.** 실력이 모자란 게 아니라, 공식 자원이 애초에 이 5B 보드를 위해 준비된 게 아닙니다.

전체 과정을 세 개의 점진적인 작은 예제로 나눠 정리했고, 코드는 모두 GitHub에 올려뒀습니다([이 프로젝트 전체 디렉토리](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B), 세 예제가 모두 들어 있습니다):

1. **화면 점등**: 가장 단순한 방법으로 Hello World 한 줄 표시 → [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
2. **LVGL 연동**: 바늘 애니메이션이 있는 반원 속도계 만들기 → [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
3. **대시보드화**: 디자인 감성 있는 차량 텔레메트리 패널로 바꾸기 → [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

**이 글의 목표**: 이 세 단계에서 겪은 함정, 왜 그렇게 코드를 썼는지, 그리고 바로 베껴 쓸 수 있는 함정 회피 요약표를 전달해서 여러분이 밤샘을 줄이는 것입니다.

---

## 실험 결과

최종적으로 **움직이는 차량 텔레메트리 대시보드**를 얻게 됩니다: 엔진 회전수, 스로틀, 수온, 차속, 전압 다섯 개의 데이터 카드가 숫자의 이징(easing) 수렴, 과부하 시 빨강으로 변하는 진행 바, 부드럽게 흐르고 테어링 없는 바늘 애니메이션을 보여줍니다.

![](https://img.lingflux.com/2026/08/032db1082c643b3c0cc44b993101ead1.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/doq81VdEQRI?si=bIy_tzkslkScLqzU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 1. 개발 보드 설명: 먼저 이 5B부터 제대로 알기

본격적인 함정 탐험에 앞서, 이 ESP32-S3-Touch-LCD-5B의 하드웨어 사양부터 펼쳐봅시다. 뒤에 나오는 함정 — PCLK 값을 뭘로 할지, 메모리가 충분한지, 어떤 핀이 같은 I²C를 공유하는지 — 가 기본적으로 이 표를 중심으로 돌어갑니다. 표를 보면서 읽으면 훨씬 순조롭습니다.

### 화면(가장 먼저 제대로 봐야 할 것)

| 항목 | 사양 |
| --- | --- |
| 크기 | 5인치 |
| 패널 타입 | IPS |
| 해상도 | **1024 × 600**(실측. 공식 문서에는 5B를 따로 표기하지 않고, 기본값은 800×480입니다 — 이것이 1장의 가장 큰 함정) |
| 표시 색상 | 65K 색 |
| 인터페이스 | RGB(병렬), 구동 IC **ST7262**, 순수 RGB 직접 구동, **SPI 초기화 명령을 보낼 필요 없음** |
| 시야각 | 175° |
| 밝기 | 550 cd/m² |
| 터치 | 정전식 터치(글라스 패널 포함) |
| 백라이트 부스트 칩 | AP3032KTR-G1 |

> **ST7262**는 RGB 인터페이스 액정 패널 구동 IC(Sitronix 제품)로, 병렬 RGB 신호를 받아 액정 분자를 구동합니다. 이 프로젝트에서는 **초기화 명령을 전혀 보낼 필요가 없습니다** — 전원을 넣고, 타이밍을 맞추고, 데이터를 먹이면 스스로 켜집니다. 이 점이 일을 많이 줄여줍니다.

### 메인 칩(MCU)

| 항목 | 사양 |
| --- | --- |
| 모듈 | ESP32-S3-WROOM-1-**N16R8** |
| 코어 | Xtensa 32-bit LX7 듀얼코어, 최대 240 MHz |
| Flash | **16 MB** |
| PSRAM | **8 MB**(octal SPI) |
| 내부 SRAM | 512 KB |
| 무선 | Wi-Fi 2.4 GHz(802.11 b/g/n), 블루투스 5(LE), 온보드 안테나 |
| USB | 풀스피드(Full-Speed) USB, 온보드 Type-C |

> **PSRAM**은 칩 외부에 붙은 "크지만 느린" 메모리입니다. 화면 전체 프레임버퍼(framebuffer)가 이 8MB 안에 들어가고, DMA가 끊임없이 화면으로 옮깁니다. **그 8MB PSRAM이 바로 전체 화면 이미지가 저장되는 곳입니다.** PSRAM을 quad로 잘못 설정하는 것이 흔한 함정입니다(7장 참고).

### 터치

| 항목 | 사양 |
| --- | --- |
| 터치 IC | **GT911** |
| 타입 | 정전식 |
| 지원 점 수 | 5점 터치 |
| 인터페이스 | I²C |
| I²C 주소 | **0x5D** |

> **GT911**은 정전식 터치 컨트롤러로, 손가락 위치를 디지털 좌표로 변환해 I²C로 보고합니다. 이 프로젝트에서는 RTC, CH422G와 같은 I²C 버스(GPIO8/GPIO9)를 공유하므로 주소 설계가 필요합니다. **이 예제 시리즈는 아직 터치를 다루지 않습니다**, 향후 과제입니다.

### 전원과 인터페이스

| 항목 | 사양 |
| --- | --- |
| 전원 | Type-C 5V / DC 7–36V / 단셀 리튬배터리 3.7V(MX1.25) |
| 소비 전력 | 5V / 450 mA(전형) |
| CAN | CAN 2.0 호환(TJA1051, 120Ω 종단 저항 기본 비활성) |
| RS485 | SP3485 트랜시버(120Ω 종단 저항 기본 비활성) |
| 작동 온도 | 0 °C ~ 65 °C |
| 크기 | 베어보드 112.4 × 75.1 mm / 케이스 포함 116.3 × 79 mm |

---

## 2. 온보드 리소스 매핑(개발 보드에 이미 장착됨, 배선 불필요)

> ⚠️ **이 보드는 개발 보드라서 부품이 이미 납땜되어 있습니다. 아래는 핀을 확인하거나 SDK를 설정하기 위한 온보드 리소스 매핑이지, 점퍼선을 꽂으라는 뜻이 아닙니다.** 여러분이 할 일은 Type-C로 전원을 넣고, USB로 PC에 연결해 펌웨어를 굽는 것뿐입니다.

### 화면 RGB 인터페이스 핀

> 아래는 공식 문서에 대응하며 실기 구동으로 교차 검증했습니다. GPIO0은 strapping 핀입니다(7장 함정 리스트 참고).

| ESP32-S3 GPIO | LCD 신호 | 설명 |
| --- | --- | --- |
| GPIO0  | G3    | Green 데이터 bit3 |
| GPIO1  | R3    | Red 데이터 bit3 |
| GPIO2  | R4    | Red 데이터 bit4 |
| GPIO3  | VSYNC | 수직 동기 |
| GPIO4  | TP_IRQ | 터치 인터럽트 |
| GPIO5  | DE    | 데이터 인에이블 |
| GPIO7  | PCLK  | 픽셀 클록(실측 16MHz 안정) |
| GPIO10 | B7    | Blue 데이터 bit7 |
| GPIO14 | B3    | Blue 데이터 bit3 |
| GPIO17 | B6    | Blue 데이터 bit6 |
| GPIO18 | B5    | Blue 데이터 bit5 |
| GPIO21 | G7    | Green 데이터 bit7 |
| GPIO38 | B4    | Blue 데이터 bit4 |
| GPIO39 | G2    | Green 데이터 bit2 |
| GPIO40 | R7    | Red 데이터 bit7 |
| GPIO41 | R6    | Red 데이터 bit6 |
| GPIO42 | R5    | Red 데이터 bit5 |
| GPIO45 | G4    | Green 데이터 bit4 |
| GPIO46 | HSYNC | 수평 동기 |
| GPIO47 | G6    | Green 데이터 bit6 |
| GPIO48 | G5    | Green 데이터 bit5 |

### 터치 / RTC / 외부 I²C(공유 버스)

| ESP32-S3 GPIO | 신호 | 설명 |
| --- | --- | --- |
| GPIO8 | SDA / TP_SDA / RTC_SDA | I²C 데이터(터치 GT911, RTC PCF85063, 외부 I²C 공유) |
| GPIO9 | SCL / TP_SCL / RTC_SCL | I²C 클록(위와 동일 공유) |
| GPIO4 | TP_IRQ | 터치 인터럽트 |

### USB / SD / RS485 / CAN

| 기능 | ESP32-S3 GPIO | 설명 |
| --- | --- | --- |
| USB D- / D+ | GPIO19 / GPIO20 | 풀스피드 USB |
| SD MOSI / SCK / MISO | GPIO11 / GPIO12 / GPIO13 | SD 카드(SPI) |
| SD CS | (CH422G EXIO4) | 로우 액티브, IO 확장기가 제어, 네이티브 SPI CS가 아님 |
| RS485 RXD / TXD | GPIO43 / GPIO44 | SP3485 |
| CAN TX / RX | GPIO15 / GPIO16 | TJA1051 |

### 피해 갈 수 없는 칩 하나: CH422G IO 확장기

보드 위에서 백라이트와 리셋이 모두 매달려 있는 칩이 바로 **CH422G**이고, I²C로 다룹니다. 이 칩의 특징은 — **레지스터 포인터가 없고, I²C 장치 주소 자체를 명령으로 쓴다**는 것입니다.

> **CH422G**은 I²C 인터페이스의 IO 확장기로, 백라이트, 화면 리셋, 터치 리셋, SD 카드 칩셀렉트 같은 잡다한 신호를 하나로 관리합니다. 이 프로젝트에서는 이 칩으로 백라이트를 켜고 화면을 리셋합니다.

| CH422G 핀 | 기능 | 설명 |
| --- | --- | --- |
| EXIO0 | DI0  | 디지털 입력 0 |
| EXIO1 | TP_RST | 터치 리셋 |
| EXIO2 | DISP | 백라이트 인에이블(켜기/끄기만 가능, **밝기 조절 불가**) |
| EXIO3 | LCD_RST | 화면 리셋 |
| EXIO4 | SD_CS | SD 카드 칩셀렉트(로우 액티브) |
| EXIO5 | DI1  | 디지털 입력 1 |
| OD0   | DO0  | 디지털 출력 0 |
| OD1   | DO1  | 디지털 출력 1 |

---

## 3. 설치해야 할 것: ESP-IDF 툴체인 + 컴포넌트

이 보드는 **라이브러리를 따로 설치할 필요가 없지만**, Arduino가 아니라 **ESP-IDF**(Espressif 공식 개발 프레임워크)를 사용합니다. 이유는 — RGB 직접 구동 + PSRAM 프레임버퍼 + LVGL 조합은 sdkconfig 안의 스위치 수십 개(PCLK, PSRAM 모드, 메모리 풀 등)를 다뤄야 하는데, ESP-IDF가 훨씬 다루기 쉽고, Arduino에서 튜닝은 꽤 불편합니다.

**준비 체크리스트(그대로 대조해 보세요. 디버깅 시간 80%를 줄여줍니다):**

- [ ] **ESP-IDF 5.3.x**(권장). 5.2.7에서도 돌아가지만 매크로 한 줄을 추가해야 합니다(7장 참고).
- [ ] **LVGL ^9.3**(`esp_lvgl_port` 2.8이 9.3에서 새로 추가된 색 상수에 의존).
- [ ] **espressif/esp_lvgl_port 2.8**(LVGL의 클록, 독립 태스크, 락을 한 방에 처리).
- [ ] **Windows 사용자**: PowerShell + EIM profile을 사용하세요. **Git Bash에서 `idf.py`를 실행하지 마세요**(`MSYSTEM`이 검출되면 동작을 거부합니다).

컴포넌트 버전은 반드시 같은 세대로 맞춰야 합니다: `esp_lvgl_port` 2.8에는 LVGL `^9.3`을 짝지으세요. 잘못 짝지으면 컴파일에서 `RGB565_SWAPPED undeclared`가 뜹니다.

---

## 4. 1단계: 화면 점등(공식 예제를 그대로 갖다 쓰지 마세요)

> 📦 **이 장의 완전한 코드**: [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld) — 가장 단순한 방법으로 화면을 켜고 Hello World 한 줄을 표시합니다.

이것이 전체 일에서 가장 큰 함정이며, 제가 가장 먼저 이야기하고 싶은 부분입니다.

**Waveshare 공식 ESP-IDF 예제(예: `08_lvgl_Porting`)와 문서는 기본적으로 800×480 기준입니다.** `#else` 기본 브랜치가 800×480이고, 공식 문서는 5인치 시리즈 전체를 "800×480 또는 1024×600"이라고 뭉뚱그려 놓고, **딱 5B가 어느 쪽인지 따로 표기하지 않습니다.**

공식 예제를 그대로 5B에 굽으면 아주 황당한 화면이 나옵니다 — **화면 대부분이 검고 오른쪽에 하얀 띠가 하나 치고 나옵니다**(검 + 흰). 고장이 아닙니다. "800×480 신호를 1024×600 패널에 먹인 것"일 뿐입니다 — 패널이 신호보다 넓으니, 남는 오른쪽에 신호가 없어서 그렇게 표시되는 것입니다.

게다가 Waveshare 명명 관습에서 **"B 접미사는 보통 정사각형 화면을 뜻합니다**(예: 4B는 480×480 정사각형)". 그래서 5B도 720×720 정사각형이고 SPI 초기화를 먼저 돌려야 하는 건 아닐까 한때 의심했습니다. 한참 씨름하다 확인한 결론은 — **5B는 1024×600, ST7262 구동 IC, 순수 RGB 직접 구동, SPI 초기화 명령 불필요**이라는 점입니다. 이 점이 일을 많이 줄여줍니다.

그래서 1단계는 언제나 — **공식 예제의 해상도를 믿지 말고, 지금 손에 쥔 보드가 정확히 몇인지 직접 확인하는 것**입니다.

확인하는 무식한 방법은 앞서 본 것과 같습니다 — 800×480을 먹여서 오른쪽에 하얀 띠가 나오면, 1024×600이라는 반증이 됩니다(패널이 신호보다 넓어야만 이런 일이 일어납니다).

### 4.1 부팅 절차(6단계 뼈대)

성격을 파악했으니 점등해 봅시다. 부팅 절차는 사실 6단계입니다: **I²C 기동 → CH422G로 화면 리셋 → RGB 패널 생성 → 화면 그리기 → 백라이트 켜기 → CPU는 한가하고 DMA가 자동 새로고침**.

이 중 "화면을 다 그린 뒤 마지막에 백라이트를 켠다"가 중요합니다 — 부팅 첫 프레임이 지저분하게 나오는 걸 피하기 위해서죠. 코드상 점등 순서는 정해져 있습니다:

```c
/* 1단계: 먼저 I²C 버스를 띄웁니다(GPIO8/9, 터치 GT911, RTC와 공유).*/
i2c_master_bus_handle_t i2c_bus = NULL;
i2c_master_bus_config_t bus_cfg = {
    .sda_io_num = 8, .scl_io_num = 9, .clk_source = I2C_CLK_SRC_DEFAULT,
    .flags.enable_internal_pullup = true,
};
i2c_new_master_bus(&bus_cfg, &i2c_bus);

/* 2단계: CH422G 구동 — 먼저 리셋, 그다음 해제(이때 백라이트는 여전히 꺼져 있음).*/
ch422g_handle_t io = {0};
ch422g_init(&io, i2c_bus);
ch422g_set_outputs(&io, 0);                              /* EXIO 전체 로우: 리셋 + 백라이트 끄기 */
vTaskDelay(pdMS_TO_TICKS(10));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST); /* 리셋 해제, 백라이트는 여전히 꺼짐 */
vTaskDelay(pdMS_TO_TICKS(120));                          /* 패널이 뜨기를 대기 */

/* 3단계: RGB 패널 생성, 화면을 PSRAM 프레임버퍼에 그리기(아래 단락 참고)…*/

/* 4단계: 화면이 준비되면 마지막으로 백라이트 점등 — EXIO2를 하이로. */
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

> **순서의 철칙: 백라이트는 항상 마지막에 켭니다.** 리셋 시 EXIO를 전부 로우로(백라이트 끔), 리셋을 해제한 뒤 화면을 그리고, 화면이 준비된 후에야 EXIO2를 하이로 씁니다. 반대로 백라이트를 먼저 켜고 화면을 그리면, 부팅 첫 프레임이 지저분하게 나타납니다.

### 4.2 백라이트가 어떻게 "하이면 켜진다"는가: CH422G 최소 구동

백라이트가 "하이면 켜진다"는 것을 코드로 옮기면 두 가지 일입니다 — CH422G 구동 코드를 작성하고, 부팅 절차에서 올바른 순서로 호출하기. 구동 코드의 핵심은 단 한 가지 — **주소가 곧 레지스터**. `0x24`에 모드를, `0x38`에 1바이트를 씁니다(이 바이트가 8개 출력의 레벨). 최소 구동 코드는 이런 모양입니다(완전판은 저장소의 `main/ch422g.c` 참고):

```c
/* CH422G "레지스터" = I²C 7-bit 장치 주소 자체(별도의 레지스터 바이트는 없음).*/
#define CH422G_REG_MODE  0x24   /* 0x01 쓰기 -> EXIO0..7 푸풀 출력 */
#define CH422G_REG_OUT   0x38   /* 1바이트 쓰기 -> EXIO0..7의 레벨 */

/* EXIO 출력 비트: bit n = EXIO_n의 레벨(1 = 하이).*/
#define CH422G_TP_RST   (1u << 1)   /* EXIO1 터치 리셋 */
#define CH422G_BL       (1u << 2)   /* EXIO2 백라이트 인에이블 */
#define CH422G_LCD_RST  (1u << 3)   /* EXIO3 화면 리셋 */

/* "주소가 곧 레지스터" 각각에 대해 I²C 장치 핸들을 하나씩 만듭니다.*/
esp_err_t ch422g_init(ch422g_handle_t *ch, i2c_master_bus_handle_t bus) {
    i2c_device_config_t mode_cfg = { .device_address = CH422G_REG_MODE, .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &mode_cfg, &ch->dev_mode);
    i2c_device_config_t out_cfg  = { .device_address = CH422G_REG_OUT,  .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &out_cfg,  &ch->dev_out);

    uint8_t mode = 0x01;                              /* 푸풀 출력 모드 */
    i2c_master_transmit(ch->dev_mode, &mode, 1, -1);
    uint8_t zero = 0;
    i2c_master_transmit(ch->dev_out,  &zero, 1, -1);  /* 시작 시 전체 클리어 */
    return ESP_OK;
}

/* 1바이트가 곧 8개 출력의 레벨 — 이것이 "주소를 명령으로 쓴다"는 의미.*/
esp_err_t ch422g_set_outputs(ch422g_handle_t *ch, uint8_t exio_mask) {
    return i2c_master_transmit(ch->dev_out, &exio_mask, 1, -1);
}
```

### 4.3 RGB 패널 만들기(이 장의 핵심)

패널을 만드는 부분이 이 장 전체의 핵심이고, 뒤의 세 가지 함정이 각 줄을 왜 그렇게 썼는지 하나씩 설명합니다:

```c
#define LCD_H_RES        1024
#define LCD_V_RES        600
#define LCD_PIXEL_CLK_HZ (16 * 1000 * 1000)   /* ← 함정 1: 16MHz. 보드가 정의한 21MHz이 아님 */

/* RGB565에서 초록은 6비트(0..63), 빨강/파랑은 5비트(0..31). 순백은 31,63,31로 써야 함(← 함정 2).*/
#define RGB565(r, g, b)   ((((r) & 0x1F) << 11) | (((g) & 0x3F) << 5) | ((b) & 0x1F))
#define COLOR_BG          RGB565(2, 8, 20)     /* 짙은 파랑 배경 */
#define COLOR_FG          RGB565(31, 63, 31)   /* 진짜 흰색 */

esp_lcd_rgb_panel_config_t panel_cfg = {
    .data_width = 16,                          /* RGB565 = 16비트 */
    .bounce_buffer_size_px = 10 * LCD_H_RES,   /* SRAM bounce: 16MHz에서 대역 부족으로 백화 방지 */
    .disp_gpio_num = -1,                       /* 백라이트는 CH422G에 연결, GPIO가 아님 */
    .pclk_gpio_num  = 7, .vsync_gpio_num = 3, .hsync_gpio_num = 46, .de_gpio_num = 5,
    .data_gpio_nums = {
        14, 38, 18, 17, 10,        /* B3..B7 */
        39,  0, 45, 48, 47, 21,    /* G2..G7 */
         1,  2, 42, 41, 40,        /* R3..R7 */
    },
    .timings = {
        .pclk_hz = LCD_PIXEL_CLK_HZ,           /* ← 함정 1 */
        .h_res = LCD_H_RES, .v_res = LCD_V_RES,
        .hsync_pulse_width = 30, .hsync_back_porch = 40, .hsync_front_porch = 220,
        .vsync_pulse_width = 4,  .vsync_back_porch  = 8,  .vsync_front_porch = 4,
        .flags.pclk_active_neg = true,
    },
    .flags.fb_in_psram = true,                 /* 전체 화면 ~1.17MB 프레임버퍼를 PSRAM에 */
};
esp_lcd_new_rgb_panel(&panel_cfg, &panel);
esp_lcd_panel_init(panel);                     /* ← 함정 3: 패널 생성 후 이 줄을 한 번 더 호출 */
```

패널이 만들어지면 프레임버퍼를 잡아 바로 픽셀을 찍을 수 있습니다 — ESP-IDF의 RGB 패널은 `draw_bitmap` 외에 그래픽 원시 연산을 제공하지 않으므로, helloworld에는 `lcd_fill` / `lcd_draw_text`라는 작은 도구(비트맵 폰트, 저장소의 `lcd_draw.c` 참고)를 직접 넣었습니다:

```c
/* PSRAM의 프레임버퍼를 잡아 Hello World를 그립니다.*/
void *fb = NULL;
esp_lcd_rgb_panel_get_frame_buffer(panel, 1, &fb);
lcd_draw_init((uint16_t *)fb, LCD_H_RES, LCD_V_RES);
lcd_fill(COLOR_BG);
lcd_draw_text((LCD_H_RES - tw) / 2, (LCD_V_RES - th) / 2, "Hello World!", 5, COLOR_FG);

/* 화면이 준비되면 마지막으로 백라이트 점등. 이후 DMA가 PSRAM에서 자동으로 새로고침, CPU는 한가함.*/
vTaskDelay(pdMS_TO_TICKS(60));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

### 4.4 제가 실제로 당한 세 가지 함정

**함정 1: PCLK를 너무 높게 잡아 전체 화면이 새하얘짐.** 공식 Arduino 보드 정의를 그대로 가져오면 픽셀 클록(PCLK)이 21MHz로 들어가고, 결과가 **화면이 새하얀 색**(검은 화면이 아님)이 됩니다. 진실은 — 화면이 PSRAM에 들어 있고 DMA가 그것을 연속적으로 읽어 화면으로 보내야 합니다. 21MHz × 16비트 ≈ 초당 336M비트의 대역폭인데, "PSRAM → DMA → 화면" 경로에겐 **너무 벅찹니다**. 한 번이라도 대역이 딸리면 화면은 유효한 동기 신호를 받지 못하고 "신호 없음"의 하얀 바탕을 띱니다. **16MHz로 내리자 안정해졌습니다.**

**함정 2: 흰 글자가 분홍으로, 거의 핀을 재배치할 뻔.** 점등 후 흰 글자가 분홍으로 보였고, 첫 반응은 "초록 핀이 반대로 연결됐나?"였습니다 — 오답입니다. 진짜 원인은 **RGB565에서 초록은 6비트(0–63), 빨강과 파랑은 5비트(0–31)**라는 점입니다. `RGB565(31, 31, 31)`에서 초록의 31은 0–63의 절반도 안 되고, 빨강/파랑은 가득, 초록은 절반이니 섞이면 분홍이 됩니다. `RGB565(31, 63, 31)`로 바꿔야 진짜 흰색입니다. 색 틀림은 두 종류입니다: **흰색이 청록으로 = 핀 순서 문제**; **흰색이 분홍으로 = 수치를 잘못 넣은 것**.

**함정 3: 초기화 한 줄을 빼먹음.** 정석 절차는 "패널 생성 → 리셋 → 초기화 → 표시 ON"인데, 처음엔 패널 생성 단계만 호출했습니다. 대부분의 경우 생성만으로 주사가 시작되지만, `esp_lcd_panel_init()` 한 줄을 더 보태면 "DMA가 안 뜬" 잠재적 문제를 없앨 수 있습니다 — 이게 빠지면 어떨 땐 켜지고 어떨 땐 안 켜지는 일이 생깁니다.

### 4.5 가장 값진 한 수: 먼저 "어떻게 안 켜지는지"부터 보기

"점등이 안 된다"와 마주했을 때 가장 유용한 한 수는 **화면이 대체 어떻게 안 켜지는지부터 보는 것**입니다:

- **백라이트도 안 켜짐** → CH422G / 리셋 시퀀스 문제
- **백라이트는 켜지는데 전체가 희거나 회색** → RGB 신호가 안 맞음(가장 흔함, PCLK와 타이밍 점검)
- **백라이트는 켜지는데 노이즈나 떨림** → 신호는 들어오는데 타이밍 매개변수가 조금 엇나감
- **백라이트는 켜지는데 색이 틀림(흰색이 청록)** → RGB 채널 순서가 잘못됨

이 관찰 하나로 문제가 둘로 쪼개져서, 막연한 추측이 한 줌 줄어듭니다.

---

## 5. 2단계: LVGL 올리기, 바늘 애니메이션 만들기

> 📦 **이 장의 완전한 코드**: [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer) — LVGL을 올려 바늘 애니메이션이 있는 반원 속도계를 만듭니다.

점등한 뒤 움직이는 UI를 만들고 싶어 **LVGL**(임베디드에서 인기 있는 그래픽 라이브러리)을 올렸습니다. 붙이는 방법은 공식 추천인 `espressif/esp_lvgl_port` 컴포넌트로, LVGL의 클록, 독립 태스크, 락을 한 방에 처리하고 그려진 화면을 패널로 밀어 줍니다.

> **LVGL**은 오픈소스 임베디드 그래픽 라이브러리로, 버튼, 진행 바, 애니메이션 같은 UI 요소를 그려 줍니다. 이 프로젝트에서는 직접 한 줄씩 그리는 대신 LVGL로 속도계와 대시보드를 만듭니다.

붙이는 코드 자체는 길지 않고, 핵심은 RGB 패널을 만들고(speedometer 예제에서는 helloworld보다 `.num_fbs = 2` 한 줄이 더 들어가는데, 이것이 뒤에서 테어링을 막는 더블 프레임버퍼입니다) `esp_lvgl_port`에 넘기는 것입니다:

```c
const lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
lvgl_port_init(&lvgl_cfg);

const lvgl_port_display_cfg_t disp_cfg = {
    .panel_handle  = panel,
    .buffer_size   = LCD_H_RES * LCD_V_RES, /* 풀스크린: direct mode의 필수 요건 */
    .hres          = LCD_H_RES, .vres = LCD_V_RES,
    .color_format  = LV_COLOR_FORMAT_RGB565,
    .flags = {
        .direct_mode = true,   /* 패널의 프레임버퍼에 직접 그림, 복사 한 번 절약 */
        .buff_dma    = false,
        .buff_spiram = true,   /* 그리기 버퍼를 PSRAM에 (← 함정 1: SPIRAM_USE_MALLOC을 먼저 켜야) */
        .swap_bytes  = false,  /* 병렬 RGB 패널이라 바이트 순서 스왑 안 함 */
    },
};
const lvgl_port_display_rgb_cfg_t rgb_cfg = {
    .flags = {
        .bb_mode       = true,  /* bounce buffer 사용 → on_bounce_frame_finish로 동기 */
        .avoid_tearing = true,  /* 프레임 경계에서 fb 전환 → 테어링 방지(이 장 말단 참고) */
    },
};
lvgl_port_add_disp_rgb(&disp_cfg, &rgb_cfg);

/* 모든 lv_* 호출은 먼저 이 락을 잡아야, esp_lvgl_port 렌더 태스크와 충돌하지 않습니다.*/
lvgl_port_lock(0);
dashboard_create();   /* 속도계 생성 + 바늘 애니메이션 시작 */
lvgl_port_unlock();
```

세 개의 플래그가 이 코드의 정수입니다 — `direct_mode`가 LVGL을 패널 프레임버퍼에 직접 그리게 하고(전체 화면 복사 한 번 절약), `avoid_tearing`이 두 개의 fb를 프레임 경계에서 전환해 테어링을 막으며, `buff_spiram`이 그리기 버퍼를 PSRAM으로 옮깁니다 — 이건 해가 안 되어 보이지만, 아래 가장 큰 함정을 끌어들입니다.

### 5.1 함정 1(가장 은밀함): 백화 + 와치독 리부트

연결하고 굽어 보면, 화면이 먼저 2초 검정 → **전체 하양** → 더 이상 움직이지 않습니다. 증상이 앞서 PCLK가 너무 높아서 생긴 백화와 **똑같아서**, 저도 또 타이밍을 만지려다 할 뻔했습니다.

**다행히 이번엔 먼저 시리얼 로그를 봤습니다**, 한눈에 핵심 줄이 보였습니다:

```
E task_wdt: CPU 0: taskLVGL
```

LVGL 태스크가 와치독을 건드려 시스템이 멈춘 것으로 판정한 것입니다. **소프트웨어가 멈춘 것이지 신호 문제가 아닙니다.** 호출 스택을 따라가 보니, LVGL이 처음 전체 화면을 그릴 때 MB 단위의 그리기 버퍼를 임시로 요청하는데, LVGL 기본값은 **자체 내장 작은 메모리 풀(64KB뿐)**이라는 것입니다 — 1MB가 64KB에 안 들어가, 이리저리 몇 번이고 시도하다 다 못 그리고 태스크가 멈추고 와치독이 발동한 것입니다.

흥미로운 건 — 분명히 디스플레이 버퍼를 PSRAM에 두었는데 왜 메모리가 부족하다는 걸까요? 왜냐하면 **디스플레이 버퍼**(화면 새로고침용)와 **LVGL 내부 그리기용 메모리 풀**(화면 계산용)은 전혀 다른 것이고, 섞으면 안 됩니다. 해결책은 스위치 두 개입니다:

```
CONFIG_LV_USE_CLIB_MALLOC=y    # LVGL이 자체 64KB 풀이 아니라 시스템 malloc을 쓰게
CONFIG_SPIRAM_USE_MALLOC=y     # 시스템 malloc이 PSRAM에서 큰 덩어리를 받게
```

> **여기엔 더 치명적인 인식이 숨어 있습니다: "백화"라 해도 최소 두 가지 완전히 다른 원인이 있습니다.** 하나는 RGB 신호/대역 문제(앞서 PCLK 경우), 다른 하나는 소프트웨어가 멈춰 화면을 못 그린 경우(이번 경우)입니다. **백화을 보면 일단 시리얼 로그로 구별하세요**, 백화이라고 바로 타이밍을 만지지 말고.

### 5.2 함정 2, 3: 컴포넌트 버전과 IDF 매크로 불일치

- **함정 2(컴포넌트 버전 짝 맞추기)**: `esp_lvgl_port` 2.8이 내부적으로 LVGL 9.3에서야 추가된 색 상수를 씁니다. LVGL 버전을 `~9.2`로 고정하면 `RGB565_SWAPPED undeclared`가 뜨고, `^9.3`으로 바꾸면 해결됩니다.
- **함정 3(IDF 매크로 불일치)**: 새 버전의 `esp_lvgl_port`는 `SOC_LCDCAM_RGB_LCD_SUPPORTED` 매크로를 검사하지만, 이 매크크는 **IDF 5.3에서야 이름이 바뀌었고** 5.2.7에는 옛 이름으로 남아 있어, 실행 시 "This target does not support RGB"가 뜹니다. 해결책은 최상위 CMakeLists의 `project()` 앞에 `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)` 한 줄을 추가하는 것입니다.

### 5.3 "끊김"과 "화면 테어링", 둘 다 계산이 느려서가 아닙니다

속도계를 돌린 뒤 새 문제 두 개가 생겼습니다 — 바늘이 **충분히 부드럽지 않고**, **테어링**(화면 중간에 어긋난 가로줄 하나)이 생깁니다. 둘 다 **"계산이 빠르고 느리고와는 무관"**합니다.

**먼저 끊김부터.** 이 화면의 물리적 리프레시율을 먼저 계산했습니다: PCLK 16MHz ÷ 한 프레임 총 픽셀 수 ≈ **20Hz**. 즉 이 화면은 1초에 최대 20번만 다시 그릴 수 있고, 소프트웨어가 아무리 빨라도 소용없는 하드 천장입니다. 그래서 "부드럽냐"는 프레임율 문제가 아니라 **애니메이션 곡선** 문제입니다. 바늘이 일정 속도로 끝까지 훑고 순간적으로 반대로 틀면 아우성스럽게 뻣뻣합니다; `ease-in-out`(양끝 감속, 중간 가속)으로 바꾸면 전환이 자연스러워집니다.

```c
/* 270° 속도계: ROUND_INNER 모드, 135°에서 시작, 바닥에 90° 빈틈.*/
lv_obj_t *scale = lv_scale_create(scr);
lv_obj_set_size(scale, 460, 460);
lv_scale_set_mode(scale, LV_SCALE_MODE_ROUND_INNER);
lv_scale_set_range(scale, 0, 120);
lv_scale_set_angle_range(scale, 270);
lv_scale_set_rotation(scale, 135);          /* 시작 각도, 빈틈 방향 결정 */
lv_scale_set_total_tick_count(scale, 25);   /* 5 km/h마다 눈금 하나 */
lv_scale_set_major_tick_every(scale, 4);    /* 4칸마다 주눈금 → 0,20,...,120 */

/* 애니메이션의 매 프레임 호출: 바늘을 v로. 숫자 읽수는 정수가 바뀔 때만 새로고침.*/
static void gauge_set_value(void *var, int32_t v) {
    gauge_ctx_t *g = (gauge_ctx_t *)var;
    lv_scale_set_line_needle_value(g->scale, g->needle, 150, v);  /* 바늘, 길이 150px */
    int vi = (int)v;
    if (vi != g->last_int) {                 /* 정수가 안 바뀌면 label 갱신 안 함, 다시 그리기 절약 */
        g->last_int = vi;
        lv_snprintf(s_value_buf, sizeof(s_value_buf), "%03d", vi);
        lv_label_set_text(g->value_label, s_value_buf);
    }
}

/* 0 → 120 → 0, 무한 반복. 부드러운지의 열쇠는 마지막 줄에.*/
lv_anim_t a;
lv_anim_init(&a);
lv_anim_set_var(&a, &s_ctx);
lv_anim_set_exec_cb(&a, gauge_set_value);
lv_anim_set_values(&a, 0, 120);
lv_anim_set_duration(&a, 2500);                       /* 편도 2.5s */
lv_anim_set_playback_duration(&a, 2500);              /* 귀환: 0→120→0 */
lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out);    /* ← 양끝 감속, 전환이 뻣뻣하지 않게 */
lv_anim_set_repeat_count(&a, LV_ANIM_REPEAT_INFINITE);
lv_anim_start(&a);
```

핵심은 `lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out)` 이 한 줄입니다. `playback_duration`이 애니메이션이 120에 도달하면 자동으로 0으로 되돌아오게 하는데, 되돌아오는 순간 속도가 본래 딱 멈추고 반대로 가버립니다; `ease-in-out`이 먼저 속도를 0까지 줄이고 반대로 가속시켜, 눈으로는 거의 전환이 안 보입니다.

**다음 테어링.** 원인은 화면 버퍼가 하나뿐이라, DMA가 밖으로 계속 옮기는 동안 LVGL이 동시에 새 화면을 안에 쓰니, 동기가 안 맞아 "반은 새 것, 반은 옛 것"인 프레임이 나가는 것입니다. 해결책은 **더블 버퍼 + 수직 동기 전환**: 화면 두 장을 쓰고, DMA는 항상 완성된 것만 옮깁니다. **주의: 이 보드는 반드시 bounce buffer라는 작은 버퍼를 유지해야 합니다**(16MHz에서 대역 부족 백화 방지용). 그래서 "더블 프레임버퍼 + bounce 함께 사용"이며, 공식 예제처럼 bounce를 꺼버리면 안 됩니다.

> 이 화면에서는 **"부드러움"은 이징 곡선, "테어링 없음"은 더블 버퍼**에 달렸고, 둘 다 계산이 빠르고 느리고와 무관합니다.

---

## 6. 3단계: 차량 텔레메트리 대시보드로 만들기

> 📦 **이 장의 완전한 코드**: [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry) — 디자인 감성 있는 5카드 차량 텔레메트리 패널로 바꿉니다.

마지막으로 속도계를 그럴싸한 **차량 텔레메트리 패널**로 바꿨습니다 — 엔진 회전수, 스로틀, 수온, 차속, 전압 다섯 가지 데이터로, 각 카드에 큰 숫자, 진행 바, 최대/최소 눈금이 있고, 수치가 과부하면 빨강으로 변합니다. 데이터는 무작위 시뮬레이션이지만 움직임은 자연스러워야 합니다.

### 6.1 카드를 어떻게 만드는가

각 카드는 **기본 스타일을 제거한 `lv_obj` 컨테이너**이고, 그 안에 라벨, 단위, 큰 숫자, 진행 바, min/max 눈금을 넣습니다. 좌표는 모두 그대로 박아 쓰고, 1px 테두리 + 단색 레이어링에 의존합니다(그림자 없이). 핵심은 이런 모양입니다(완전판은 `lvgl_dashboard.c`의 `make_card` 참고):

```c
static void make_card(lv_obj_t *parent, int i) {
    const metric_cfg_t *c = &CFG[i];      /* 지오메트리/범위/위험 임계치/색이 모두 설정 표에 */
    metric_t *m = &s_m[i];
    m->accent = lv_color_hex(c->accent_hex);

    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_remove_style_all(card);                       /* 기본 스타일 제거, 전부 직접 설정 */
    lv_obj_set_pos(card, c->x, c->y);                    /* 좌표 고정, flex 자동 배치 안 씀 */
    lv_obj_set_size(card, c->w, c->h);
    lv_obj_set_style_bg_color(card, COL_CARD, 0);
    lv_obj_set_style_radius(card, 18, 0);
    lv_obj_set_style_border_color(card, COL_BORDER, 0);  /* 1px 테두리로 레이어링, 그림자 없음 */
    lv_obj_set_style_border_width(card, 1, 0);

    lv_obj_t *lab = lv_label_create(card);
    lv_label_set_text(lab, c->label);
    lv_obj_align(lab, LV_ALIGN_TOP_LEFT, 0, 0);          /* 라벨은 좌상; 단위는 우상도 동일하게 */

    lv_obj_t *val = lv_label_create(card);
    lv_obj_set_style_text_font(val, &lv_font_montserrat_48, 0);  /* 큰 숫자 */
    lv_obj_align(val, LV_ALIGN_TOP_LEFT, 0, c->value_y);
    m->value = val;

    /* 진행 바: trough와 indicator 두 부분에 각각 색을, 위험 시 indicator를 빨강으로.*/
    lv_obj_t *bar = lv_bar_create(card);
    lv_obj_remove_style_all(bar);
    lv_bar_set_range(bar, c->min, c->max);
    lv_obj_set_size(bar, c->w - 2 * c->pad, c->big ? 14 : 10);
    lv_obj_align(bar, LV_ALIGN_BOTTOM_LEFT, 0, -24);
    lv_obj_set_style_bg_color(bar, COL_BAR_BG, 0);                /* trough */
    lv_obj_set_style_bg_color(bar, m->accent, LV_PART_INDICATOR); /* indicator */
    m->bar = bar;
}
```

### 6.2 숫자를 "살아 있게": 일정 속도가 아니라 이징 수렴

가장 직관적인 방법은 "무작위로 새 값을 주고, 표시가 일정 속도로 따라가게 하는 것"입니다. 그런데 일정 속도로 따라가면 목표에서 순간적으로 속도가 0이 되어 매우 기계적으로 보입니다. 제가 쓴 방법은 **이징 수렴**입니다: 각 데이터는 현재 표시값 `current`와 목표값 `target`을 기억하고, 매 새로고침마다 차이의 1/6을 따라잡습니다(지수 감쇠, 가까워질수록 느려짐). 약 1.2초마다 현재값 부근에서 무작위 보행으로 새 목표를 만들어 내고, 풀스케일로 튀지 않게 해서 진짜 차량 데이터처럼 보이게 합니다:

```c
/* 30틱마다(~1.2s) 목표 변경: 현재값 부근에서 보행, 폭 = 범위의 1/3.*/
if (tick % 30 == 0) {
    int span = (m->max - m->min) / 3;
    m->target = clampi(m->current + rnd_range(-span, span), m->min, m->max);
}
/* 이징 수렴: 차이의 1/6을 따라잡음; 차이가 너무 작으면 그냥 흡수, 영영 조금 남지 않게.*/
int diff = m->target - m->current;
if (diff > -6 && diff < 6) m->current = m->target;
else                       m->current += diff / 6;   /* ← 이 줄이 지수 감쇠 */

/* 진행 바는 매 프레임 갱신(이것이 "살아 있는" 시각). 위험 시 indicator가 빨강으로.*/
bool danger = in_danger(m);   /* RPM≥6800 / 수온≥105 / 전압≤10.8 또는 ≥14.6 */
lv_bar_set_value(m->bar, m->current, LV_ANIM_OFF);
lv_obj_set_style_bg_color(m->bar, danger ? COL_DANGER : m->accent, LV_PART_INDICATOR);
```

바늘의 `ease-in-out`과 같은 이치 — 모두 전환 지점에서 감속합니다. `danger` 판정이 진행 바를 과부하 시 빨강으로 바꾸고, 이것이 패널에서 "과부하 시 빨강" 효과의 출처입니다.

### 6.3 곁들인 작은 최적화: 안 바뀌었으면 다시 그리지 않기

40밀리초마다 한 번씩 새로고침하지만, 연속 두 번 같은 정수가 나오는 일이 잦습니다(특히 목표에 가까워지면 거의 멈추듯이). 매번 `lv_label_set_text`를 호출하면 문자열 복사, 다시 그리기 표시가 전부 헛일입니다. 그래서 한 줄을 더합니다 — **표시 문자열이 실제로 바뀌었을 때만 갱신**:

```c
/* 숫자 읽수: 포맷된 문자열이 진짜 바뀌었을 때만 set_text.*/
char buf[12];
fmt_scaled(m->current, m->scale, buf, sizeof(buf));
if (strcmp(buf, m->last_text) != 0) {
    strcpy(m->last_text, buf);             /* 기록, 다음 비교에 사용 */
    lv_label_set_text(m->value, buf);      /* strdup + 다시 그리기 표시는 실제 변화가 있을 때만 */
}
lv_obj_set_style_text_color(m->value, danger ? COL_DANGER : COL_VALUE, 0);
```

### 6.4 임베디드 UI의 작은 트레이드오프

고정 해상도의 작은 화면에서는 **좌표를 직접 박아 쓰는 것**이 flex 자동 배치보다 더 머리 아프지 않고 예측 가능합니다; 카드에는 **그림자를 넣지 않습니다**(LVGL의 그림자는 20Hz 리프레시에서 비용이 좀 있음), 테두리와 단색만으로도 레이어링이 충분합니다; 전압의 소수 한 자리는 "142를 저장해 14.2를 의미"하는 정수 스케일링으로 부동소수 연산을 줄입니다. 정수 스케일링 방식은 각 지표의 지오메트리/범위/위험 임계치/색/scale을 모두 한 장의 설정 표에 밀어 넣습니다:

```c
/* 설정 표, 한 줄에 한 지표. 좌표/범위/위험 임계치/색/scale이 모두 표 안에, 일괄 조정이 쉽게.*/
static const metric_cfg_t CFG[] = {
    /* label      unit    x   y    w   h  pad v_y  min  max  dHi  dLo init accent   sc big */
    { "ENGINE",  "RPM",  24, 84, 478,242, 28, 78,    0,8000,6800,  0, 850,0xFF5A3C, 1, 1 },
    { "BATTERY", "V",   688,346, 312,230, 24, 64,  100, 150, 146,108, 124,0xB08CFF,10, 0 },
    /*                                                                  ↑ scale=10: 124가 12.4V를 의미 */
    /* ...나머지 세 줄도 동일 */
};

/* 표시 시 다시 나누어 복원: 124 → "12.4". 전 구간 정수, 부동소점 연산 없음.*/
static void fmt_scaled(int32_t v, int32_t scale, char *buf, size_t n) {
    if (scale == 10) lv_snprintf(buf, n, "%d.%d", (int)(v / 10), (int)(v % 10));
    else             lv_snprintf(buf, n, "%d", (int)v);
}
```

`scale=10`은 x10으로 저장하고 `scale=1`은 원값으로 저장하며, 이징, 위험 판정, 진행 바는 모두 이 정수 체계 위에서 돕니다. 오직 마지막에 문자열로 포맷하는 순간에만 소수가 있는 형태로 "번역"됩니다.

---

## 7. 자주 묻는 문제 해결(당황하지 마세요, 문제의 종류는 이것뿐입니다)

> 당황하지 마세요, 90%의 문제는 이 몇 곳에서 발생합니다. 이상 현상을 만나면 **먼저 시리얼 로그를 보고, 먼저 물리 매개변수를 계산하세요**, 코드부터 고치려 하지 말고.

**이 화면에 관하여**

- 공식 예제/문서의 기본값은 800×480이고, **5B에 그대로 씌우면 검정 바탕 + 오른쪽 하얀 띠**가 됩니다. 5B는 **1024×600, ST7262, 순수 RGB 직접 구동**이고, SPI 초기화가 필요 없습니다.
- 백라이트는 **CH422G**의 EXIO2를 타고, 일반 GPIO도 PWM도 아닙니다(**켜기/끄기만, 밝기 조절 불가**).
- 터치 칩 GT911(I²C 주소 0x5D)은 RTC, CH422G와 같은 I²C 버스를 공유하니 주소 설계에 주의하세요; 이 예제 시리즈는 **아직 터치를 다루지 않습니다**, 향후 과제입니다.

**빌드 환경(Windows)**

- **Git Bash에서 `idf.py`를 실행하지 마세요**, `MSYSTEM`이 검출되면 동작을 거부합니다. PowerShell + EIM profile을 쓰고, 호출 전에 `unset MSYSTEM`(또는 `$env:MSYSTEM=$null`).
- 포트가 점유되었다는 "port is busy"는 대개 지난번 monitor가 깨끗이 안 죽어서, 잔류가 없는지 확인하고 flash하세요.
- `sdkconfig.defaults`를 고쳤는데 반영이 안 됩니까? IDF는 이미 존재하는 `sdkconfig`에 defaults를 자동으로 다시 병합하지 않습니다, **sdkconfig을 지우고 defaults에서 다시 생성**하게 하세요.

**화면 점등**

- **PCLK를 보드가 정의한 21MHz로 그대로 쓰지 말고, PSRAM 프레임버퍼를 쓸 땐 16MHz에서 시작**하고, 그래도 희면 12MHz까지 내려 보세요.
- PSRAM을 잘못 설정하지 마세요: N16R8은 **octal**(`SPIRAM_MODE_OCT`), quad가 아닙니다.
- 패널 생성 후 **`esp_lcd_panel_init()` 한 줄을 잊지 마세요**.
- GPIO0은 strapping 핀입니다(부팅 순간에 하이여야 함), 부팅 후에는 RGB 데이터 핀으로 써도 문제없지만, 부팅을 로우로 끌어버릴 회로를 여기에 연결하지 마세요.
- 색 틀림은 먼저 두 종류를 구분하세요: **흰색이 청록 = 핀 순서**; **흰색이 분홍 = RGB565 초록 채널 값**(초록은 6비트 0–63, 순백은 `31,63,31`).

**LVGL 실행**

- **거의 반드시 `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`을 켜야** 합니다, 안 그러면 LVGL의 64KB 내장 메모리 풀이 전체 화면 그리기를 담지 못해 백화 + 와치독 리부트가 나타납니다.
- 컴포넌트 버전을 같은 세대로: `esp_lvgl_port` 2.8에는 LVGL `^9.3`.
- IDF 5.2에 새 버전 컴포넌트를 짝지으면, 최상위 CMakeLists에 `SOC_LCDCAM_RGB_LCD_SUPPORTED=1` 추가.
- **LVGL / esp_lvgl_port는 버전을 넘어 API 이름을 바꿉니다**, 기억에 의존해 쓰지 말고 실제 header를 읽으세요.

**부드러움과 테어링**

- 먼저 패널의 물리적 리프레시율을 계산(이 화면은 약 20Hz), 그보다 낮은 최적의 대부분은 애니메이션 설계 문제입니다.
- 끊김에는 `ease-in-out`이 우선이고, 프레임율부터 올리려 하지 마세요.
- 테어링 = 단일 버퍼 + 동기 없음, 해결책은 더블 프레임버퍼 + `avoid_tearing`, **그리고 bounce buffer 유지**.

---

## 8. FAQ

**Q: Waveshare ESP32-S3-Touch-LCD-5B의 해상도는 정확히 얼마입니까? 800×480입니까, 1024×600입니까?**
A: 5B는 **1024×600**입니다. Waveshare 공식 문서는 5인치 시리즈 전체를 "800×480 또는 1024×600"이라고 뭉뚱그려 놓고 5B를 따로 표기하지 않습니다. 검증 방법: 800×480 신호를 굽어 보면 화면이 검정 바탕 + 오른쪽 하얀 띠가 되고, 패널이 신호보다 넓다는 뜻이니 1024×600입니다. 공식 예제의 800×480을 그대로 쓰지 마세요.

**Q: 화면이 온통 하얗게 되는 건 왜 그런가요?**
A: 먼저 시리얼 로그로 두 가지 백화을 구별하세요. ① 와치독 에러가 없으면 → 대개 RGB 신호가 공급이 안 되는 것이고, PCLK를 21MHz로 그대로 써서 너무 높으니 16MHz로 내리세요. ② 시리얼에 `task_wdt: taskLVGL`이 있으면 → LVGL 메모리 풀이 너무 작아 멈춘 것이고, `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`을 켜세요.

**Q: 백라이트 밝기를 조절할 수 있나요? 왜 PWM 핀이 안 보이나요?**
A: 안 됩니다. 백라이트는 CH422G IO 확장기의 EXIO2에 매달려 있고, 켜기/끄기 두 상태만 있으며 PWM이 아닙니다. 밝기를 조절하려면 하드웨어적으로 보드를 개조(가능한 승압/강압 회로 추가)해야 하고, 소프트웨어만으로는 불가능합니다.

**Q: 이 화면의 리프레시율은 얼마인가요? 왜 바늘이 끊겨 보이나요?**
A: 약 **20Hz**(PCLK 16MHz ÷ 한 프레임 총 픽셀 수). 물리적 천장이라 소프트웨어가 아무리 빨라도 돌파할 수 없습니다. 끊김은 대개 프레임율 문제가 아니라 애니메이션 곡선이 너무 뻣뻣한 것입니다 — 바늘 애니메이션을 선형에서 `ease-in-out`으로 바꾸면 전환에서 자연스럽게 감속해 곧바로 부드러워집니다.

**Q: Arduino IDE에서도 점등할 수 있나요? 왜 ESP-IDF를 쓰나요?**
A: 이론상 가능합니다(Arduino-ESP32도 밑단은 ESP-IDF입니다), 다만 RGB 직접 구동 + PSRAM 프레임버퍼 + LVGL 조합은 Arduino에서 sdkconfig를 다루기 꽤 불편하고, PCLK, PSRAM 모드, 메모리 풀 같은 스위치는 ESP-IDF가 훨씬 다루기 쉽습니다. 이 튜토리얼은 ESP-IDF 기반입니다.

**Q: LVGL을 굽고 나니 백화 + 와치독 리부트, 어떡하죠?**
A: 십중팔구 LVGL 내장 64KB 메모리 풀이 전체 화면 그리기를 담지 못해서입니다. sdkconfig에서 두 개를 켜세요: `CONFIG_LV_USE_CLIB_MALLOC=y`(LVGL이 시스템 malloc을 쓰게)와 `CONFIG_SPIRAM_USE_MALLOC=y`(malloc이 PSRAM에서 큰 덩어리를 받게). ESP32-S3 + PSRAM + 큰 화면이라면 거의 필수입니다.

**Q: PSRAM은 quad로 설정하나요, octal로? 잘못 설정하면 어떻게 되나요?**
A: N16R8은 **octal**(`SPIRAM_MODE_OCT`)입니다. quad로 설정하면 대역이 부족해, PCLK가 조금만 높아도 노이즈/백화이 나거나 동작이 불안정해집니다.

**Q: IDF 5.2.7에서 "This target does not support RGB"가 뜨면 어떡하죠?**
A: 새 버전 esp_lvgl_port가 `SOC_LCDCAM_RGB_LCD_SUPPORTED` 매크로를 검사하는데, 이 매크로는 IDF 5.3에서야 이름이 바뀌었고 5.2.7에는 옛 이름으로 남아 있습니다. 최상위 CMakeLists의 `project()` 앞에 `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)` 한 줄을 추가하세요.

---

## 9. 더 나아가기

점등은 시작점이고, 이 보드로 더 많은 걸 할 수 있습니다:

- **터치 다루기**: GT911이 이미 I²C 버스에(GPIO8/9) 있고, 드라이버 하나만 더하면 버튼 인터랙션을 만들 수 있습니다.
- **SD 카드에서 자원 읽기**: 온보드 SD 카드 슬롯(SPI)으로 이미지, 폰트를 불러와서 자원을 전부 Flash에 밀어 넣는 일에서 벗어날 수 있습니다.
- **CAN 버스에 연결**: 온보드 TJA1051과 ESP-IDF의 TWAI 드라이버로 진짜 OBD 차량 상태 계기를 만들면, 대시보드의 수치가 더이상 시뮬레이션이 아니게 됩니다.
- **RS485 올리기**: SP3485 트랜시버로 산업 센서/Modbus 기기를 연결합니다.
- **RTC로 전원 차단 시계**: PCF85063도 같은 I²C 버스에 있고, 실제 타임스탬프가 있는 데이터로거를 만들 수 있습니다.

---

## 10. 참고 자료

**공식 데이터시트 및 제품 페이지**

- [ESP32-S3 Datasheet(Espressif 공식)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP32-S3-WROOM-1 모듈 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)
- [ESP32-S3 제품 페이지](https://www.espressif.com/en/products/socs/esp32-s3)
- [Waveshare ESP32-S3-Touch-LCD-5B Wiki](https://docs.waveshare.net/ESP32-S3-Touch-LCD-5/?variant=ESP32-S3-LCD-5B-touch)

**오픈소스 라이브러리와 프레임워크**

- [ESP-IDF 공식 문서](https://docs.espressif.com/projects/esp-idf/)(RGB LCD Panel, PSRAM 설정, I²C Master 드라이버)
- [espressif/esp_lvgl_port(GitHub)](https://github.com/espressif/esp_lvgl_port)
- [LVGL 공식 문서](https://docs.lvgl.io/)(scale 위젯, anim 애니메이션, bar 진행 바)

**이 프로젝트의 코드**

- 완전한 코드, 각 함정의 재현 과정과 최종 설정은 모두 GitHub에 있고, 각 예제 디렉토리 안에 완전한 docs가 있습니다:
  - [이 프로젝트의 전체 디렉토리(세 예제 포함)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)
  - [01 HelloWorld — 화면 점등](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
  - [02 Speedometer — 속도계](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
  - [03 VehicleTelemetry — 차량 텔레메트리 대시보드](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

---

## 마무리하며

돌아보면 전체 길은 사실 세 층입니다: **화면 점등 → LVGL 올리기 → 인터페이스 만들기**. 각 층마다 전용 함정이 있지만, 함정끼리는 자주 닮아 있습니다(두 종류의 백화, 두 종류의 색 틀림) — 가장 헛고생을 만드는 건 함정을 잘못 알아보는 것입니다.

뒤에 올 사람에게 한 줄만 남긴다면, 아마 이 말이 되겠습니다 — 세 예제에서 저를 거듭 넘어뜨린 뒤에야 비로소 진짜 깨달은 것입니다:

> **이상 현상을 만나면 먼저 시리얼 로그를 보고, 먼저 물리 매개변수를 계산하세요, 코드부터 고치려 하지 말고.** 공식 예제의 해상도 함정, PCLK의 백화, LVGL 메모리의 백화은 모두 "화면이 고장 났다"처럼 보이지만, 하나는 문서가 틀렸고, 하나는 하드웨어 대역, 하나는 소프트웨어 멈춤입니다. 방향을 반대로 잡으면 밤샘이 헛일입니다.
