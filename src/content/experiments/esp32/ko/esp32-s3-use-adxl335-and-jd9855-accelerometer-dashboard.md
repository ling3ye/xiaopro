---
title: "ESP32-S3 + ADXL335로 JD9855 원형 화면 구동해 3축 가속도 대시보드 만들기｜왜 '흔들기'가 '기울이기'보다 더 눈에 띄는가"
boardId: esp32s3
moduleId: display/tft15-jd9855
moduleIds:
  - display/tft15-jd9855
  - sensor/adxl335
category: esp32
date: 2026-08-05
intro: "ESP32-S3 + ADXL335(GY-61)로 JD9855 QSPI 원형 화면을 구동해 실시간 3축 가속도 대시보드를 만듭니다. 배선도, 전체 Arduino 코드와 자주 발생하는 문제 트러블슈팅을 담았고, '흔들기가 기울이기보다 눈에 띄는' 배경에 있는 가속도계의 물리 원리도 명확히 짚어줍니다."
image: "https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg"
---

> 난이도: ⭐⭐☆☆☆ (기본적인 Arduino 다루기 경험이 있으면 바로 시작 가능)
> 예상 소요 시간: 30-40분 (캘리브레이션 및 디버깅 포함)
> 테스트 환경: Arduino IDE 2.3.8 · ESP32 Arduino Core 3.3.10

---

> **TL;DR (빠른 시작):**
> 1. 배선 표에 따라 화면(QSPI 6선)과 ADXL335(X/Y/Z 3채널 아날로그 입력)을 연결합니다
> 2. GPIO5 / GPIO9 / GPIO10 모두 ESP32-S3의 ADC1 범위에 있어 Wi-Fi와 충돌하지 않습니다
> 3. 전원 인가 후 기기를 수평으로 가만히 두면 프로그램이 자동으로 제로 포인트를 샘플링해 캘리브레이션합니다 (약 1초)
> 4. 기기를 천천히 기울이거나 세게 흔들어 보며, 원형 화면에서 세 가지 색 원형 링 + 중심 바늘의 연동 변화를 관찰합니다

---

## 서론

며칠 동안 끙끙대며 ADXL335의 3축 데이터를 실시간으로 360×360 원형 화면에 올렸습니다. 기기를 천천히 기울이면 바늘이 거의 움직이지 않다가도, 손을 떨거나 세게 흔들면 바늘이 "휙" 하고 반 바퀴나 돌아갑니다. 처음엔 캘리브레이션이 잘못됐나 싶어 이런저런 자료를 뒤적이다 깨달았습니다. 이 녀석은 물리적 원리 자체가 순수한 '경사계'가 아니라 가속도를 측정하는 거라, 흔들수록 세게 흔들수록 수치가 더 과장되게 나옵니다. 이건 설계된 동작이지 버그가 아닙니다. 그리고 제가 손수 만든 ESP32-S3 개발보드는 전원이 영 시원찮아서, 센서를 연결하면 화면이 눈에 띄게 어두워지는 순간이 있더라고요. ESP32-S3 개발보드를 업그레이드해야 할 것 같습니다.

그래서 이 글에서는 완전한 배선, 코드, 삽질 기록 외에도 "왜 흔들기가 기울이기보다 눈에 띄는가"를 명확히 설명하려 합니다. 여러분이 직접 해보면서 같은 함정에서 자기 의심을 하지 않도록 말이죠.

---

## 실험 결과

이 360×360 원형 화면에는 ADXL335의 3축 가속도 데이터가 실시간으로 표시됩니다 (주의: 순수 자세 각도가 아니라 가속도입니다). 바깥쪽 빨강/초록/파랑 세 가지 색 원형 링은 각각 X / Y / Z 축에 대응하고, 중심의 컬러 바늘은 현재 합력 방향을 가리킵니다. 세게 흔들수록 바늘 진폭이 더 과장되게 움직이며, 가장자리에는 숨쉬는 불빛 효과가 장식으로 들어갑니다.

![](https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg)

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/B2hNfww6fXo?si=yirZlC1QrNw2urEF" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## 부품 설명

> ESP32-S3 개발보드는 따로 소개하지 않겠습니다. 이 글을 보고 있다면 ESP32를 한 번이라도 써봤겠죠. 아래에서는 핵심 부품 두 가지만 이야기합니다.

### ADXL335 가속도계 (GY-61 모듈)

ADXL335가 하는 일은 체중계와 비슷합니다. "사용자가 바르게 서 있는지"는 모르고, 현재 얼만큼의 힘을 받고 있는지만 알고, 그 힘을 X/Y/Z 세 방향 성분으로 쪼개서 알려줍니다. 아날로그 출력 3축 MEMS 가속도계로, 기기가 받는 합력 (중력 성분 + 운동에 의한 가속도)을 세 채널의 전압 신호로 변환합니다.

| 파라미터 | 수치 |
| --- | --- |
| 타입 | 3축 아날로그 출력 MEMS 가속도계 |
| 측정 범위 | ±3.6g (전형) / ±3g (최소 보장값) |
| 감도 | 300 mV/g (VS = 3V일 때 전형값, 전원에 비례) |
| 작동 전압 | 1.8V ~ 3.6V |
| 대역폭 (GY-61 모듈 기본값) | 약 50Hz (온보드 0.1μF 필터 커패시터로 결정) |
| 노이즈 밀도 | X/Y 약 270 µg/√Hz, Z 약 550 µg/√Hz (Z는 X/Y의 약 2배) |

이 녀석을 쓰는 이유는 간단합니다. 싸고, 아날로그 출력이라 배선이 단순하고, ADC 핀 하나만 있으면 읽을 수 있어 시각화류 장난감 프로젝트에 아주 적합합니다. 전문급 자세 추정까지 노리지 않는다면 충분합니다.

### 핀 설명

**ADXL335 (GY-61)**

| 모듈 핀 | 설명 |
| --- | --- |
| VCC / GND | 3.3V 전원 |
| X / Y / Z | 3채널 아날로그 출력, ADC 핀에 연결 |
| ST | 셀프 테스트 핀, 일반적으로 연결 안 함 |

### TK015F5785 원형 화면 (JD9855 드라이버, QSPI 인터페이스)

이 화면은 "데이터 선 4개 암호만 알아듣는 캔버스"라고 이해하면 됩니다. JD9855는 드라이버 칩으로 MCU가 보내는 색 데이터를 화면의 모든 픽셀에 밀어 넣는 역할을 하고, QSPI (4선 직렬) 인터페이스는 더 적은 핀으로 더 빠른 새로고침 속도를 냅니다. 약 1.5인치, 360×360 해상도의 원형 TFT 화면으로 SCLK/D0-D3/CS 다섯 개의 신호선 + 전원만으로 구동할 수 있고 별도의 DC (데이터/명령) 핀은 필요 없습니다.

| 파라미터 | 수치 |
| --- | --- |
| 크기 | 1.5인치 원형 IPS |
| 해상도 | 360 × 360 |
| 드라이버 칩 | JD9855 |
| 인터페이스 | QSPI (4선식) |
| 전원 | 3.3V |
| 밝기/명암비 | 판매자가 제공한 스펙 시트 기준 (로트에 따라 다를 수 있음) |

선택한 이유도 직관적입니다. 원형 화면은 대시보드류 시각화에 타고난 미감이 있고, QSPI 인터페이스는 GPIO 5개만 써서 기존 패러럴 방식보다 핀을 아끼며, ESP32-S3의 DMA로도 충분히 구동 가능합니다.

### 핀 설명

**화면 TK015F5785 (JD9855 QSPI)**

| 화면 핀 | 설명 |
| --- | --- |
| SCLK | QSPI 클럭 |
| D0 ~ D3 | QSPI 4선 데이터 |
| CS | 칩 셀렉트 |
| VCC / GND | 3.3V 전원 |

---

## BOM 목록

| 부품 | 모델/파라미터 | 수량 | 참고 단가 | 용도 |
| --- | --- | --- | --- | --- |
| 메인 보드 | ESP32-S3 개발보드 | 1 | 약 30-50위안 | 메인 컨트롤러 + Wi-Fi/블루투스 예비 |
| 원형 화면 | TK015F5785 (JD9855, 360×360, QSPI) | 1 | 판매자에 따라 다름 | 표시 |
| 가속도계 | ADXL335 (GY-61 모듈) | 1 | 약 8-15위안 | 3축 가속도 수집 |
| 점퍼 와이어 | 암-암 | 약간 | - | 배선 |

---

## 배선 방법

**화면 → ESP32-S3**

| 화면 핀 | ESP32-S3 핀 |
| --- | --- |
| SCLK | GPIO6 |
| D0 | GPIO15 |
| D1 | GPIO7 |
| D2 | GPIO11 |
| D3 | GPIO12 |
| CS | GPIO16 |
| VCC | 3.3V |
| GND | GND |

**ADXL335 → ESP32-S3**

| 모듈 핀 | ESP32-S3 핀 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| X | GPIO5 (ADC1) |
| Y | GPIO9 (ADC1) |
| Z | GPIO10 (ADC1) |

배선을 마친 후 하나씩 확인하는 걸 권장합니다. 트러블슈팅 시간의 80%를 줄여줍니다. 특히 화면의 D0~D3 4선은 한 가닥이라도 거꾸로 꽂으면 화면이 깨지거나 켜지지 않을 확률이 높습니다.

---

## 설치 필요 라이브러리

서드파티 라이브러리는 하나도 설치할 필요 없습니다. 화면 드라이버는 ESP-IDF에 내장된 `esp_lcd_panel_io`와 `driver/spi_master` 인터페이스를 직접 호출해 손수 작성한 QSPI 드라이버라, 라이브러리 매니저에서 아무것도 검색할 필요가 없습니다.

유일하게 버전을 신경 써야 할 부분:

- Arduino IDE: 2.3.8 (테스트 통과)
- ESP32 보드 지원 패키지 (esp32 by Espressif Systems): **3.3.10** (ESP-IDF 5.x 기반) — 반드시 v3.x여야 합니다. 코드에서 쓰는 `quad_mode` 플래그와 일부 DMA 인터페이스가 구형 v2.x 코어에는 없을 수 있어서입니다
- 보드 선택: ESP32S3 Dev Module, USB CDC On Boot는 Enabled로 설정

---

## 코드

```cpp
/*
 * =============================================================================
 *  ADXL335 + TK015F5785 원형 화면 —— 3축 가속도 대시보드
 *  =====================================================================
 *
 *  단일 씬: 3축 가속도 대시보드 —— 실시간으로 3축 데이터 + 합력 방향 표시, 중심 바늘이 합력 방향을 가리킴
 *
 *  하드웨어: ESP32-S3 + TK015F5785 (JD9855 QSPI) + ADXL335 (GY-61)
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                          배선 설명                                   │
 *  ├─────────────────────────────────────────────────────────────────────┤
 *  │  【화면 TK015F5785】           │  【ADXL335 (GY-61)】                 │
 *  │  SCLK  → GPIO6                │  VCC → 3.3V                         │
 *  │  D0    → GPIO15               │  GND → GND                          │
 *  │  D1    → GPIO7                │  X   → GPIO5 (ADC)                  │
 *  │  D2    → GPIO11               │  Y   → GPIO9 (ADC)                  │
 *  │  D3    → GPIO12               │  Z   → GPIO10 (ADC)                  │
 *  │  CS    → GPIO16               │                                      │
 *  │  VCC   → 3.3V                 │                                      │
 *  │  GND   → GND                  │                                      │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 *  의존: Arduino IDE의 esp32 보드 코어 v3.x만 필요
 *  업로드: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled
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
// 화면 핀
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1

// ADXL335 핀 (아날로그 입력)
#define PIN_ACCEL_X    5
#define PIN_ACCEL_Y    9
#define PIN_ACCEL_Z    10

/* =====================================================================
 *  JD9855 QSPI 화면 드라이버 클래스
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

    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b) {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1) {
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
        io_config.pclk_hz            = 20 * 1000 * 1000;  // 배선이 40MHz를 견디지 못해 20MHz로 안정화
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

    void pushRect(int x, int y, int w, int h, const uint16_t *data) {
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

    void fillScreen(uint16_t color) {
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

    void ensureDmaBuf(size_t need) {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1) {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data) {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    void sendInitCommands() {
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
        sendCmd(0x11);
        delay(120);
        sendCmd(0x29);
        delay(10);
    }
};

/* =====================================================================
 *  전역 변수
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     // 360
static constexpr int H = JD9855_QSPI::V_RES;     // 360
static constexpr int CX = W / 2;                  // 중심 x = 180
static constexpr int CY = H / 2;                  // 중심 y = 180
static constexpr int RADIUS = 180;
static constexpr int R2MAX  = RADIUS * RADIUS;

static const int BLOCK_H = 40;
uint16_t blockBuf[W * BLOCK_H];

// 픽셀별 원심 기준 각도 lookup 테이블 (atan2를 0-255로 미리 계산), 렌더링 시 픽셀마다 atan2f를 부르지 않게 함
uint8_t *angleTab = nullptr;

// 가속도계 데이터 (필터 후)
float accelX = 0, accelY = 0, accelZ = 0;
// 가속도계 원시 중심값 (정지 시 ADC 값, 캘리브레이션 필요)
int accelXCenter = 2048, accelYCenter = 2048, accelZCenter = 2730;

// 색상 정의
uint16_t COLOR_BLACK;
uint16_t COLOR_WHITE;
uint16_t COLOR_LIGHT_GRAY;

/* =====================================================================
 *  유틸리티 함수
 * ===================================================================== */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v) {
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

void initColors() {
    COLOR_BLACK      = JD9855_QSPI::color565(0, 0, 0);
    COLOR_WHITE      = JD9855_QSPI::color565(255, 255, 255);
    COLOR_LIGHT_GRAY = JD9855_QSPI::color565(100, 100, 110);
}

/* =====================================================================
 *  가속도계 읽기 및 필터
 * ===================================================================== */
void readAccelerometer() {
    // 원시 ADC 값 읽기 (ESP32-S3 ADC 12비트, 0-4095)
    int rawX = analogRead(PIN_ACCEL_X);
    int rawY = analogRead(PIN_ACCEL_Y);
    int rawZ = analogRead(PIN_ACCEL_Z);

    // -1.0 ~ 1.0 정규화 값으로 변환
    // ADXL335는 3.3V 전원에서 g당 약 330mV, 중심 약 1.65V
    // ADC 3.3V = 4095, 따라서 g당 약 409 ADC 단위
    float newX = (rawX - accelXCenter) / 409.0f;
    float newY = (rawY - accelYCenter) / 409.0f;
    float newZ = (rawZ - accelZCenter) / 409.0f;

    // 클램핑
    newX = constrain(newX, -1.5f, 1.5f);
    newY = constrain(newY, -1.5f, 1.5f);
    newZ = constrain(newZ, -1.5f, 1.5f);

    // 저역 통과 필터 (스무딩)
    const float alpha = 0.3f;
    accelX = accelX * (1 - alpha) + newX * alpha;
    accelY = accelY * (1 - alpha) + newY * alpha;
    accelZ = accelZ * (1 - alpha) + newZ * alpha;
}

/* 각 픽셀의 원심 기준 각도(atan2)를 미리 계산해 0-255 lookup으로 저장.
   실행 시 픽셀마다 lookup만으로 라디안으로 복원하고, 매 프레임 atan2f를 부르지 않음 —— 예전에 끊기던 주범.
   setup에서 한 번만 계산. 내부 RAM (~126KB)을 우선 사용, 부족하면 PSRAM으로 폴백;
   둘 다 없으면 nullptr로 두고 atan2f로 폴백 렌더링 (여전히 보긴 하지만 느림). */
void buildAngleTable() {
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab 할당 실패, 화면이 느려집니다")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   // -0.5..0.5
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);
        }
    }
    Serial.printf("[INIT] 각도 테이블 %d KB 준비 완료\n", (int)(n / 1024));
}

/* =====================================================================
 *  씬: 3축 가속도 대시보드
 *  3축 실시간 데이터 표시, 다이내믹 바늘과 수치 포함
 * ===================================================================== */
void renderGaugeScene() {
    // ---- 프레임 상수 (루프 밖으로 빼 픽셀마다 재계산 방지) ----
    int t = millis() / 50;
    float breathe   = (sinf(t * 0.1f) + 1) / 2;
    float tiltAngle = atan2f(accelY, accelX);
    float tiltMag   = sqrtf(accelX * accelX + accelY * accelY);
    tiltMag = min(1.0f, tiltMag);
    float xAngle    = accelX * M_PI / 2;
    float yAngle    = -M_PI / 2 + accelY * M_PI / 2;
    float zVal      = (accelZ + 1) / 2;
    float fillAngle = -M_PI + zVal * 2 * M_PI;
    const float A8SCALE = M_PI / 128.0f;   // 각도 lookup(0-255) -> 라디안

    // 반경 임계값은 모두 r^2 (정수 비교)로, 픽셀마다 sqrtf 방지 —— 중심 바늘 부분만 float r 필요
    const int R2_TICK_LO  = 160 * 160, R2_TICK_HI  = 175 * 175;
    const int R2_X_LO     = 135 * 135, R2_X_HI     = 155 * 155;
    const int R2_Y_LO     =  95 *  95, R2_Y_HI     = 115 * 115;
    const int R2_Z_LO     =  55 *  55, R2_Z_HI     =  75 *  75;
    const int R2_NDL_LO   =   5 *   5, R2_NDL_HI   =  50 *  50;
    const int R2_BR_LO    = 175 * 175, R2_BR_HI    = 180 * 180;
    const int R2_145_LO = 145 * 145, R2_145_HI = 146 * 146;
    const int R2_105_LO = 105 * 105, R2_105_HI = 106 * 106;
    const int R2_65_LO  =  65 *  65, R2_65_HI  =  66 *  66;
    const int R2_165    = 165 * 165;

    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = min(BLOCK_H, H - by);
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            const uint8_t *angRow = angleTab ? &angleTab[yy * W] : nullptr;  // 행마다 행 시작 포인터를 한 번 가져옴
            for (int x = 0; x < W; x++) {
                int dx = x - CX, dy = yy - CY;
                int r2 = dx * dx + dy * dy;

                if (r2 > R2MAX) {
                    blockBuf[y * W + x] = COLOR_BLACK;
                    continue;
                }

                float angle = angRow ? ((int8_t)angRow[x] * A8SCALE)
                                     : atan2f((float)dy, (float)dx);

                // 어두운 배경
                uint16_t color = JD9855_QSPI::color565(15, 20, 30);

                // 외곽 눈금
                if (r2 > R2_TICK_LO && r2 < R2_TICK_HI) {
                    int deg = (int)((angle + M_PI) * 180 / M_PI) % 30;
                    if (deg < 3 || (r2 > R2_165 && deg % 10 < 2)) {
                        color = COLOR_LIGHT_GRAY;
                    }
                }

                // X축 (외곽 링, 빨강)
                if (r2 > R2_X_LO && r2 < R2_X_HI) {
                    float angleDiff = fabsf(angle - xAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(100 + tt * 155, 30, 30);
                    } else if (r2 >= R2_145_LO && r2 < R2_145_HI) {
                        color = JD9855_QSPI::color565(60, 20, 20);
                    }
                }

                // Y축 (중간 링, 초록)
                if (r2 > R2_Y_LO && r2 < R2_Y_HI) {
                    float angleDiff = fabsf(angle - yAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(30, 100 + tt * 155, 30);
                    } else if (r2 >= R2_105_LO && r2 < R2_105_HI) {
                        color = JD9855_QSPI::color565(20, 60, 20);
                    }
                }

                // Z축 (내부 링, 파랑)
                if (r2 > R2_Z_LO && r2 < R2_Z_HI) {
                    if (angle < fillAngle || angle < -M_PI + 0.1) {
                        color = JD9855_QSPI::color565(30, 80, 200);
                    } else if (r2 >= R2_65_LO && r2 < R2_65_HI) {
                        color = JD9855_QSPI::color565(20, 30, 80);
                    }
                }

                // 중심 바늘 (합력 방향을 가리킴) —— 여기만 float r 필요
                if (r2 > R2_NDL_LO && r2 < R2_NDL_HI) {
                    float r = sqrtf((float)r2);
                    float angleDiff = fabsf(angle - tiltAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    float needleWidth = 0.15f * (1 - r / 50);

                    if (angleDiff < needleWidth && r < 45 * tiltMag + 10) {
                        int hue = (int)(tiltAngle * 180 / M_PI + 180) % 360;
                        color = hsvTo565(hue, 200, 255);
                    }
                }

                // 중심점
                if (r2 < 64) {
                    color = COLOR_WHITE;
                }

                // 숨쉬기 조명 장식 (breathe는 루프 밖에서 미리 계산됨)
                if (r2 > R2_BR_LO && r2 < R2_BR_HI) {
                    int hue = ((int)(angle * 180 / M_PI) + t * 2) % 360;
                    color = hsvTo565(hue, 255, 100 + breathe * 100);
                }

                blockBuf[y * W + x] = color;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* =====================================================================
 *  메인 프로그램
 * ===================================================================== */
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[ADXL335 + TK015F5785] 3축 가속도 대시보드"));

    // 색상 초기화
    initColors();

    // ADC 초기화 (ESP32-S3)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);  // 0-3.3V 범위
    pinMode(PIN_ACCEL_X, INPUT);
    pinMode(PIN_ACCEL_Y, INPUT);
    pinMode(PIN_ACCEL_Z, INPUT);

    // 캘리브레이션: 정지 상태의 중심값 읽기
    Serial.println(F("[ACCEL] 캘리브레이션 중, 기기를 수평으로 움직이지 마세요..."));
    delay(500);
    long sumX = 0, sumY = 0, sumZ = 0;
    for (int i = 0; i < 100; i++) {
        sumX += analogRead(PIN_ACCEL_X);
        sumY += analogRead(PIN_ACCEL_Y);
        sumZ += analogRead(PIN_ACCEL_Z);
        delay(10);
    }
    accelXCenter = sumX / 100;
    accelYCenter = sumY / 100;
    accelZCenter = sumZ / 100 - 409;  // Z축은 정지 시 약 1g, 1g 오프셋을 뺌
    Serial.printf("[ACCEL] 캘리브레이션 완료: X=%d, Y=%d, Z=%d\n", accelXCenter, accelYCenter, accelZCenter);

    // 화면 초기화
    Serial.println(F("[LCD] 초기화..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] 초기화 실패!"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] 초기화 성공"));

    buildAngleTable();   // 픽셀별 각도 미리 계산, 대시보드 렌더링이 끊기지 않게

    lcd.fillScreen(COLOR_BLACK);
    Serial.println(F("[DEMO] 3축 가속도 대시보드"));
}

void loop() {
    // 가속도계 읽기
    readAccelerometer();

    // 대시보드 렌더링
    renderGaugeScene();

    // 디버그 정보 출력 (1초에 한 번)
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint > 1000) {
        lastPrint = millis();
        Serial.printf("X=%.2f  Y=%.2f  Z=%.2f\n", accelX, accelY, accelZ);
    }
}
```

### 코드 설명

- **화면 드라이버 부분**: `JD9855_QSPI` 클래스는 ESP-IDF의 `esp_lcd_panel_io_spi` 인터페이스를 직접 호출해 손수 작성한 드라이버로, 서드파티 그래픽 라이브러리에 의존하지 않습니다. `pclk_hz`를 일반적인 40MHz에서 20MHz로 일부러 낮춘 이유는 배선이 길면 40MHz에서 화면 깨짐이 자주 발생해서, 실측 삽질 끝에 안정값을 찾은 겁니다. 배선이 짧고 화면 케이블 품질이 좋다면 직접 올려가며 테스트해 보세요.
- **각도 lookup 테이블 `buildAngleTable()`**: 렌더링 전체의 성능 핵심입니다. 첫 번째로, `setup()`에서 360×360 각 픽셀의 원심 기준 각도를 미리 계산해 0-255의 1바이트 lookup으로 압축 저장합니다. 두 번째로, 렌더링할 때 픽셀마다 배열 lookup 한 번만 수행하고 느린 `atan2f()`를 픽셀마다 부르지 않습니다. 이 최적화가 대시보드 새로고침이 매끄러운지를 결정합니다.
- **`readAccelerometer()` 읽기와 필터**: 첫째로 원시 ADC 값을 읽고, 둘째로 409 counts/g 환산으로 전압을 -1~1 정규화 값으로 변환합니다 (이 환산 계수는 ADXL335 300mV/g 전형 감도 × ESP32-S3 12비트 ADC 풀스케일 3.3V의 이론값에서 나왔으며, 실측 시 자신의 모듈에 맞게 미세 조정을 권장합니다). 셋째로 1차 저역 통과 필터(`alpha = 0.3`)로 노이즈를 부드럽게 만듭니다.
- **"흔들기"가 "기울이기"보다 눈에 띄는 이유를 코드에서 보면**: `xAngle = accelX * M_PI / 2` 이 줄이 accelX의 ±1g을 ±90°로 선형 매핑합니다. 천천히 기울일 때 accelX의 이론적 상한은 ±1g으로 정확히 ±90°에 해당하지만, 흔들 때는 관성 가속도가 중력에 더해져 accelX 실제 수치가 종종 ±1을 넘고, `constrain()`에 의해 ±1.5g으로 클램프됩니다. 매핑된 각도 진동은 당연히 천천히 기울일 때보다 훨씬 큽니다. 이건 그리기 로직 문제가 아니라 가속도계의 물리 특성이 결정합니다.
- **Z축 렌더링**: `zVal`이 accelZ를 -1~1에서 0~1로 매핑한 뒤 채우기 각도 `fillAngle`로 변환하고, 본질적으로 "진행률 링" 형태로 Z축 수치를 보여줍니다. 이 진행률 링이 계속 가볍게 떨리는 건 정상 현상입니다 (뒤 FAQ에 설명 참조).

---

## 자주 발생하는 문제 트러블슈팅

당황하지 마세요. 대부분의 문제는 다음 몇 군데에서 비롯됩니다:

1. **화면이 켜지지 않거나 깨짐**: 먼저 QSPI의 D0~D3 4개 데이터선이 거꾸로 꽂히지 않았는지 확인하고, 다음으로 CS/SCLK가 각각 제대로 연결됐는지, 마지막으로 화면 전원이 3.3V로 안정적인지 확인합니다 (전원 리플이 커도 화면 깨짐이 발생합니다).
2. **ADXL335 수치가 2048 부근에서 계속 멈춰 있음**: 연결되지 않은 ADC 핀에 연결됐거나 모듈 자체 전원에 이상이 있는지 확인합니다. 이 프로젝트에서 사용하는 GPIO5/9/10은 모두 ESP32-S3 ADC1 범위 안에 있어 Wi-Fi가 ADC2를 점유하는 영향을 받지 않으므로 이 가능성은 배제할 수 있습니다.
3. **Z축 수치가 계속 뛰어요**: ADXL335의 원래 설계 특성입니다. Z축 노이즈 밀도가 태생적으로 X/Y축보다 높아 배선이나 코드 문제가 아닙니다. 필터 계수 `alpha`를 작게 (예: 0.3에서 0.1로) 조정하거나, 코드에서 여러 번 샘플링해 평균을 내는 (오버샘플링) 방법으로 완화할 수 있습니다.
4. **천천히 기울이면 반응이 없다가 흔들어야 반응함**: 이건 가속도계의 물리적 본질입니다. "합력"을 측정하지 순수한 자세 각도가 아닙니다. 자이로와 센서 퓨전을 해야만 운동 간섭을 받지 않는 안정적인 자세 출력을 얻을 수 있습니다.
5. **컴파일 에러, `esp_lcd_panel_io.h`를 찾을 수 없음**: Arduino IDE의 ESP32 보드 지원 패키지 버전을 확인하세요. 반드시 v3.x (ESP-IDF 5.x 기반)여야 하며 구형 코어에는 이 인터페이스가 없습니다.
6. **캘리브레이션 후 중심값이 눈에 띄게 어긋남**: 캘리브레이션 단계에서 기기가 수평이 아니거나 흔들리고 있었을 수 있습니다. 수평 테이블 위에 올려놓고 전원을 넣고, 그 1초 동안은 최대한 건드리지 마세요.

---

## FAQ 질문/답변

**Q: ADXL335는 경사를 측정하나요, 운동을 측정하나요?**
A: 엄밀히 말해 "특정력(specific force)" (중력 성분 + 운동 가속도의 합성)을 측정하며, 둘을 분리해 낼 수는 없습니다. 지속적인 느린 기울임은 중력 성분을 최대 ±1g까지만 바꾸지만, 흔들기는 운동 가속도가 더해져 진폭이 자주 ±1g을 넘습니다. 그래서 시각적으로 "흔들기"가 "느린 기울임"보다 훨씬 눈에 띕니다. 순수한 자세 각도를 원한다면 자이로가 있는 6축 IMU (예: MPU6050)로 센서 퓨전을 해야 합니다.

**Q: 왜 Z축 수치는 계속 뛰는데 X/Y는 비교적 안정적인가요?**
A: ADXL335의 원래 설계 특성입니다. 데이터시트상 Z축 출력 노이즈 밀도가 X/Y축의 약 두 배이며, 배선이나 코드 문제가 아닙니다. 저역 통과 필터를 키우거나 ADC 오버샘플링을 늘려 완화할 수는 있어도 완전히 제거할 수는 없습니다.

**Q: GY-61 모듈은 얼마나 빠른 동작까지 측정할 수 있나요?**
A: 온보드 필터 커패시터가 0.1μF라 각 축의 대역폭이 약 50Hz로 제한됩니다. 일상적인 흔들기, 기울임에는 충분하고, 더 높은 주파수의 진동을 측정하려면 더 작은 용량의 필터 커패시터로 교체해야 합니다.

**Q: ESP32-S3의 GPIO5/9/10을 ADC로 쓰면 Wi-Fi와 충돌하나요?**
A: 아닙니다. 이 세 핀은 모두 ESP32-S3의 ADC1 범위(GPIO1~10) 안에 있습니다. Wi-Fi 작업 시 제약을 받는 건 ADC2(GPIO11~20)뿐이므로 이 프로젝트에서는 걱정하지 않아도 됩니다.

**Q: 캘리브레이션할 때 왜 기기를 수평으로 가만히 둬야 하나요?**
A: 코드는 전원 인가 후 연속으로 100번 샘플링해 평균을 내고, 이 평균값을 "0g" 기준점으로 삼습니다. 캘리브레이션 중 기기가 기울어져 있거나 흔들리면 기준점이 어긋나고 이후 모든 환산도 함께 어긋납니다.

**Q: 이 코드에 추가 서드파티 라이브러리를 설치해야 하나요?**
A: 필요 없습니다. 화면 드라이버는 ESP-IDF 내장 `esp_lcd_panel_io`와 `spi_master` 인터페이스를 직접 호출해 손수 작성한 것이라, Arduino IDE의 ESP32 보드 지원 패키지만 v3.x면 충분하고 라이브러리 매니저에서는 아무것도 설치할 필요가 없습니다.

---

## 더 나아가기

- 6축 IMU (예: MPU6050) 한 개를 추가해 센서 퓨전을 하면 흔들림 간섭을 받지 않는 진짜 안정적인 자세 대시보드를 만들 수 있습니다
- "흔들기 강도"만 따로 뽑아내 간단한 "충격 감지기"를 만들고, 임계값을 넘기면 색을 바꾸거나 알람을 울리게 합니다
- 부저나 RGB LED를 연결해 설정 각도 이상으로 기울어지면 알람을 울리게 해 간단한 수평계로 씁니다
- SD 카드로 운동 데이터를 기록하고 나중에 내보내 곡선으로 그려 복기합니다

---

## 참고 자료

- [ADXL335 공식 제품 페이지 및 데이터시트 (Analog Devices)](https://www.analog.com/en/products/adxl335.html)
- [GY-61 / ADXL335 breakout 온보드 필터 커패시터와 대역폭 설명 (Adafruit)](https://www.adafruit.com/product/163)
- [JD9855 QSPI 드라이버 칩 데이터시트](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
- [ESP32-S3 시리즈 데이터시트 (Espressif, ADC1/ADC2 핀 구분)](https://documentation.espressif.com/esp32-s3_datasheet_en.pdf)
