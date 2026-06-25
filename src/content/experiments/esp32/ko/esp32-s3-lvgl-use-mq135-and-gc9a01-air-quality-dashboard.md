---
title: "ESP32-S3로 GC9A01 원형 디스플레이와 MQ135로 공기질 대시보드 만들기 완전 가이드 (LVGL v9 + SPI 인터페이스 + Arduino C++)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-25
intro: "ESP32-S3 + MQ135 가스 센서 + GC9A01 1.28인치 원형 디스플레이, LVGL v9와 함께 애니메이션 원형 게이지, 실시간 추세 그래프, 호흡하는 발광 효과가 있는 공기질 대시보드를 만들어 봅니다. 완전한 배선, 코드, 문제 해결 기록을 포함합니다."
image: "https://img.lingflux.com/2026/06/4217f9f4026039eeca35a691450313dc.jpg"
---





> 난이도：⭐⭐☆☆☆（몇 개의 점퍼선만 있으면 시작 가능）
> 예상 시간：45분
> 테스트 환경：Arduino IDE 2.3.8 · ESP32 Arduino Core 3.x · lvgl v9.5.0 · Arduino_GFX_Library v1.6.5

---

> **TL;DR（그냥 실행하고 싶으신가요？여기 보세요）**
>
> **기대치 관리：** 이 프로젝트는 입문, 데스크탑 장식용, 순수 시각적 즐거움을 위한 것입니다. **절대 실제 유해 가스 누출을 측정하는 데 사용하지 마세요！** 정확도는 기본적으로 "주먹구구" 수준입니다.
>
> 1. **배선**：MQ135 A0 → GPIO 13；GC9A01은 아래 표대로 GPIO 7 / 9 / 10 / 11 / 12 / 18에 연결
> 2. **라이브러리 설치**：Arduino 라이브러리 관리자에서 `lvgl`（v9.x 선택）+ `Arduino_GFX_Library` 검색
> 3. **lv_conf.h 구성**：`LV_FONT_MONTSERRAT_14`와 `LV_FONT_MONTSERRAT_28` 활성화（0 → 1로 변경）
> 4. 업로드 → 원형 디스플레이가 켜지고 대시보드가 작동하기 시작

---

## 서론

먼지 쌓인 센서 더미에서 공기질 전용 센서인 MQ135 모듈을 발견했습니다. 작업실의 공기질을 확인해보겠다는 생각에 연결해서 테스트해보았는데, 데이터시트를 보니 이 모듈은 24시간 예열이 필요하다고 하네요. 그냥 장난감으로만 쓸 수 있을 것 같습니다. 하지만 이 모듈은 다양한 가스에 민감하며, 정확하지는 않더라도 수치가 상승하면 상대적으로 어떤 가스가 존재한다는 뜻입니다. 이산화탄소, 암모니아, 벤젠, 알코올, 연기일 수 있습니다. 방 환기가 필요한지 판단하는 상대적 수치 판단에는 충분히 활용할 수 있습니다.

그래서 이 프로젝트가 탄생했습니다：ESP32-S3 + MQ135 가스 센서 + GC9A01 1.28인치 원형 디스플레이, 유명한 LVGL v9 그래픽 라이브러리와 함께 원형 게이지, 실시간 추세 그래프, "호흡"하며 색상이 변하는 공기질 대시보드를 만들어 보겠습니다.

이 문서의 목표：**배선부터 업로드 성공까지, 이 효과를 완전히 재현합니다.**

---

## 실험 결과

원형 디스플레이에 현재 공기질 ADC 수치, 상태 등급（EXCELLENT / GOOD / FAIR / MODERATE / POOR / DANGER）및 역사적 추세 그래프를 실시간으로 표시합니다. 게이지 색상은 공기질에 따라 녹색에서 적색으로 점진적으로 변하며, 외부 링은 리듬감 있는 "호흡" 발광 효과가 있습니다. 화면 왼쪽 하단에는 전원 켜진 후 최소값과 최대값이 동시에 기록됩니다.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/2M6HRdpfW-Q" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 부품 설명

> 개발판（ESP32-S3）에 대해서는 설명하지 않으며, 초보자가 접해보지 않았을 수 있는 두 모듈만 설명합니다.

### MQ135 가스 센서

MQ135는 공기 중 CO₂, 암모니아, 벤젠 등 유해 가스 농도 변화를 감지하는 가스 민감도 센서로, 이 프로젝트에서는 0～4095의 아날로그 ADC 수치를 출력하여 현재 환경의 공기질 등급을 반영하는 역할을 합니다.

쉽게 말해：**화학적 "코"**입니다. 공기가 더 탁할수록 출력 전압이 높아지고 ADC 수치가 커집니다.

| 파라미터 | 값 |
|------|-----|
| 표준 작동 전압 | 5V（히터）/ 아날로그 출력 3.3V 호환 |
| 출력 인터페이스 | 아날로그（A0）+ 디지털（D0） |
| 예열 시간 | 24～48시간（완전 정확도）/ 약 3분（추세 참조용） |
| 감지 가능한 가스 | CO₂, NH₃, NOₓ, 벤젠, 알코올, 연기 |

**3.3V 전원 공급에 대해：** MQ135의 표준 전압은 5V이지만 3.3V로 공급하면 히터 전력이 표준의 약 44%가 되어 감도가 떨어지고 수치가 낮게 나오지만, 추세 표시 및 상대적 변화 감지에는 충분합니다. 절대 정확도를 추구한다면 VCC에는 별도로 5V를 사용하고 A0 아날로그 출력은 3.3V를 넘지 않으므로 분압 없이 ESP32-S3에 직접 연결하면 됩니다.

선택한 이유：**저렴（5위안 이내），모듈형，배선만 하면 바로 사용** 가능해서 이 "디자인 중심" 프로젝트에는 충분합니다.

**실내 공기질 판단에 MQ135를 올바르게 사용하는 방법**

```
✅ 적합한 용도：
  - 공기질 변화 추세 모니터링（상대적 값）
  - 환기/경보 트리거 임계값 판단
  - 다양한 유해 가스 "종합 오염" 지시

❌ 부적합한 용도：
  - 정밀한 단일 가스 농도 측정
  - 의료/산업급 안전 규정 준수 테스트
  - CO₂ 정확한 값（오차 범위 ±300ppm 이상）
```

---

### GC9A01 1.28인치 원형 TFT 디스플레이

GC9A01은 1.28인치 원형 TFT LCD 디스플레이로 SPI 인터페이스를 통해 영상 데이터를 수신하고 렌더링하며, 이 프로젝트에서는 애니메이션 효과가 있는 게이지 UI를 표시하는 역할을 합니다.

비유：**스마트워치의 자유롭게 내용을 그릴 수 있는 원형 게이지**입니다.

| 파라미터 | 값 |
|------|-----|
| 화면 크기 | 1.28인치 |
| 해상도 | 240 × 240 픽셀 |
| 인터페이스 | SPI（최대 80 MHz） |
| 구동 칩 | GC9A01 |
| 작동 전압 | 3.3V |
| 백라이트 제어 | 지원（BL 핀，PWM 조광 가능） |

선택한 이유：**원형 디자인이 독특하고 크기가 작으며 3.3V 직접 사용 가능，Arduino_GFX_Library 원본 지원**이라 LVGL과 결합하여 게이지 시각 효과가 훌륭합니다.

---

## BOM 표

| 부품 | 모델 / 규격 | 수량 |
|------|------------|------|
| 메인 컨트롤러 보드 | ESP32-S3（USB-C 포함）| 1 |
| 원형 TFT 디스플레이 | GC9A01 1.28" 240×240 | 1 |
| 가스 센서 | MQ135 모듈 | 1 |
| 연결선 | 점퍼선 |若干 |



---

## 부품 핀 설명

### MQ135 모듈 핀

| 핀 | 설명 |
|------|------|
| VCC | 전원（이 프로젝트에서는 3.3V 연결，표준은 5V） |
| GND | 접지 |
| A0 | 아날로그 신호 출력，ESP32-S3 ADC 핀에 연결 |
| D0 | 디지털 출력（이 프로젝트에서 미사용）**높은/낮은 레벨（HIGH / LOW）** 출력 |

### GC9A01 모듈 핀

| 핀 표시 | 설명 |
|---------|------|
| VCC | 3.3V 전원 |
| GND | 접지 |
| SCL / CLK | SPI 클럭 |
| SDA / MOSI | SPI 데이터 |
| CS | 칩 선택（낮은 레벨 활성） |
| DC | 데이터/명령 전환 |
| RST | 리셋（낮은 레벨 리셋） |
| BL | 백라이트 제어（HIGH = 켜짐）（선택 사항，모든 모듈에 핀이 있는 것은 아님） |

---

## 배선 방법

### MQ135 → ESP32-S3

| MQ135 | ESP32-S3 |
|-------|----------|
| VCC | 5V |
| GND | GND |
| A0 | GPIO 13 |

### GC9A01 → ESP32-S3

| GC9A01 핀 | ESP32-S3 GPIO |
|------------|---------------|
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL（백라이트）| GPIO 7 （핀이 없으면 연결하지 않아도 됨） |

> **실용 팁：** 배선 후 위 두 표를 **줄별로 한 번씩 확인**하면 80%의 문제 해결 시간을 절약할 수 있습니다. 가장 자주 실수하는 것은 DC와 CS를 반대로 연결하는 것입니다. 이 두 선의 위치를 바꾸면 화면이 전체 흰색 또는 전체 검은색이 되어 "화면이 고장 났" 것처럼 보이지만 사실은 선을 잘못 꽂은 것뿐입니다.

---

## 설치해야 할 라이브러리

Arduino IDE 열기 → 도구 → 라이브러리 관리，다음 두 라이브러리를 검색하여 설치：

| 라이브러리명 | 작성자 | 테스트 통과 버전 |
|------|------|-----------------|
| `lvgl` | LVGL | v9.5.0 |
| `Arduino_GFX_Library` | Moon On Our Nation | v1.6.5 |

**lvgl 설치 후 반드시 해야 할 한 단계：**

1. lvgl 라이브러리 디렉터리 찾기（보통 `문서/Arduino/libraries/lvgl/`）
2. 내부의 `lv_conf_template.h`를 복사하여 `lv_conf.h`로 이름 변경，`lvgl/`와 같은 레벨에 배치
3. `lv_conf.h` 열기，아래 두 줄 찾아 `0`을 `1`로 변경：
   ```c
   #define LV_FONT_MONTSERRAT_14  1
   #define LV_FONT_MONTSERRAT_28  1
   ```
4. `lv_conf.h` 열기，맨 처음의 `#if 0`을 `#if 1`로 변경

> 이 단계를 잊어버리고 바로 업로드하면 컴파일 시 `lv_font_montserrat_28 undeclared` 오류가 발생합니다. 어떻게 알았냐고 묻지 마세요.

---

## 완전 코드

```cpp
/*
 * ESP32-S3 + GC9A01 원형 디스플레이 공기질 대시보드 v3.1
 * "极简科技风" - 원형 프로그레스 바 + 실시간 추세 그래프 + 호흡 발광
 *
 * 테스트 환경：Arduino IDE 2.3.2 / ESP32 Core 3.x
 * 의존 라이브러리：lvgl v9.2.x + Arduino_GFX_Library v1.4.x
 */

#include <Arduino.h>
#include <lvgl.h>
#include <Arduino_GFX_Library.h>
#include <math.h>

// ===================== 핀 정의 =====================
#define TFT_SCK    12   // SPI 클럭
#define TFT_MOSI   11   // SPI 데이터
#define TFT_CS     9    // 칩 선택
#define TFT_DC     10   // 데이터/명령 전환（반대로 연결하면 화면이 전체 흰색）
#define TFT_RST    18   // 리셋
#define TFT_BL     7    // 백라이트——HIGH여야 켜짐，이 선을 연결하는 것을 잊으면 허사
#define MQ135_PIN  13   // MQ135 아날로그 입력（ADC2 채널，Wi-Fi 미사용 시 정상 작동）

#define SCREEN_WIDTH   240
#define SCREEN_HEIGHT  240

// ===================== 디스플레이 드라이버 초기화 =====================
Arduino_ESP32SPI bus = Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01 gfx = Arduino_GC9A01(&bus, TFT_RST, 0, true);

// ===================== LVGL 렌더링 버퍼 =====================
// 40라인 버퍼는 ESP32-S3에서 약 19KB 메모리 점유，속도와 메모리 균형
#define DRAW_BUF_LINES 40
alignas(4) static uint16_t draw_buf[SCREEN_WIDTH * DRAW_BUF_LINES];

// ===================== 추세 역사 데이터 =====================
#define TREND_POINTS 40    // 최근 40개 샘플링 포인트 보존（× 300ms ≈ 12초 분량）
static int trendData[TREND_POINTS] = {0};
static int trendIdx = 0;
static bool trendFull = false;
static lv_point_precise_t trendLinePoints[TREND_POINTS];

// ===================== LVGL UI 객체 핸들 =====================
static lv_obj_t *arc_bg;          // 원형 트랙 배경（어두운 색）
static lv_obj_t *arc_main;        // 메인 원형 +末端 knob 작은 원점
static lv_obj_t *glow_circle;     // 외부 발광 테두리（호흡）
static lv_obj_t *center_circle;   // 중심 원형 판
static lv_obj_t *label_value;     // 중앙 큰 숫자（ADC 값）
static lv_obj_t *label_unit;      // 단위 라벨 "ADC"
static lv_obj_t *label_status;    // 상태 텍스트（EXCELLENT / GOOD...）
static lv_obj_t *dot_status;      // 상태 작은 원점
static lv_obj_t *label_title;     // 상단 제목 "AIR QUALITY"
static lv_obj_t *label_score;     // 하단 청결도 점수
static lv_obj_t *label_minmax;    // 최소/최대값
static lv_obj_t *trend_line;      // 추세 그래프
static lv_obj_t *trend_container; // 그래프 클리핑 컨테이너

// ===================== 센서 상태 =====================
static float smoothedValue = 0.0f; // 지수 가중 평균 후의 평활값
static bool firstSample = true;    // 첫 프레임 플래그，0부터 시작하는 애니메이션 방지
static int minValue = 4095;        // 이번 전원 켜짐 후 최소 ADC 값
static int maxValue = 0;           // 이번 전원 켜짐 후 최대 ADC 값
static float displayValue = 0.0f;  // UI 애니메이션 보간용

// ===================== LVGL 클럭 콜백 =====================
static uint32_t my_tick_cb(void) { return millis(); }

// ===================== 플러시 콜백：LVGL 렌더링 완료 후 화면에 전송 =====================
void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = area->x2 - area->x1 + 1;
  uint32_t h = area->y2 - area->y1 + 1;
  gfx.draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)px_map, w, h);
  lv_display_flush_ready(disp); // LVGL에 알림：이 블록 렌더링 완료，다음 블록 계속 진행
}

// ===================== 색상 시스템：ADC 값 → 상태 색 =====================
// 수치가 높을수록 = 공기가 나쁨 = 색상이 더 붉음，6단계가 6가지 상태에 대응
uint32_t getColorHex(int v) {
  if (v < 600)  return 0x00E5A0; // EXCELLENT：신선한 녹색
  if (v < 1200) return 0x22C55E; // GOOD：연한 녹색
  if (v < 2000) return 0xA3E635; // FAIR：황녹색
  if (v < 2800) return 0xEAB308; // MODERATE：노란색
  if (v < 3500) return 0xF97316; // POOR：주황색
  return 0xFF3355;                // DANGER：적색（창문 열어야 할 때）
}

lv_color_t getColor(int v) {
  return lv_color_hex(getColorHex(v));
}

// 원형 트랙 배경색（상태색의 어두운 버전，어두운 배경과 조합）
uint32_t getDimColorHex(int v) {
  if (v < 600)  return 0x0A2A20;
  if (v < 1200) return 0x0A2A15;
  if (v < 2000) return 0x1A2A10;
  if (v < 2800) return 0x2A2208;
  if (v < 3500) return 0x2A1808;
  return 0x2A0A10;
}

const char* getStatusText(int v) {
  if (v < 600)  return "EXCELLENT";
  if (v < 1200) return "GOOD";
  if (v < 2000) return "FAIR";
  if (v < 2800) return "MODERATE";
  if (v < 3500) return "POOR";
  return "DANGER";
}

// ADC 값을 청결도 퍼센트로 변환（ADC가 낮을수록 = 깨끗함 = 점수가 높음）
int adcToScore(int adc) {
  adc = constrain(adc, 0, 4095);
  return constrain(100 - (adc * 100 / 4095), 0, 100);
}

// ===================== UI 인터페이스 생성 =====================
void create_ui() {
  lv_obj_t *scr = lv_screen_active();

  // 첫 단계：어두운 배경
  lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(scr, lv_color_hex(0x050810), 0);

  // 둘째 단계：가장 외부 발광 테두리（색상은 상태 따름，호흡 애니메이션）
  glow_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(glow_circle);
  lv_obj_set_size(glow_circle, 234, 234);
  lv_obj_center(glow_circle);
  lv_obj_set_style_radius(glow_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(glow_circle, LV_OPA_TRANSP, 0);
  lv_obj_set_style_border_width(glow_circle, 2, 0);
  lv_obj_set_style_border_opa(glow_circle, LV_OPA_20, 0);
  lv_obj_set_style_border_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(glow_circle, 30, 0);
  lv_obj_set_style_shadow_spread(glow_circle, 2, 0);
  lv_obj_set_style_shadow_opa(glow_circle, LV_OPA_30, 0);
  lv_obj_set_style_shadow_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_clear_flag(glow_circle, LV_OBJ_FLAG_SCROLLABLE);

  // 셋째 단계：원형 트랙 배경색（"아직 도달하지 않은" 어두운 영역 표시）
  arc_bg = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_bg);
  lv_obj_set_size(arc_bg, 210, 210);
  lv_obj_center(arc_bg);
  lv_arc_set_range(arc_bg, 0, 100);
  lv_arc_set_bg_angles(arc_bg, 135, 45);
  lv_arc_set_value(arc_bg, 0);
  lv_obj_set_style_arc_width(arc_bg, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(0x0A2A20), LV_PART_MAIN);
  lv_obj_set_style_arc_rounded(arc_bg, true, LV_PART_MAIN);
  lv_obj_set_style_arc_width(arc_bg, 0, LV_PART_INDICATOR);
  lv_obj_set_style_arc_opa(arc_bg, LV_OPA_TRANSP, LV_PART_INDICATOR);
  lv_obj_set_style_bg_opa(arc_bg, LV_OPA_TRANSP, LV_PART_KNOB);
  lv_obj_clear_flag(arc_bg, LV_OBJ_FLAG_CLICKABLE);

  // 넷째 단계：메인 원형（실시간 수치 +末端 knob 작은 원점）
  arc_main = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_main);
  lv_obj_set_size(arc_main, 210, 210);
  lv_obj_center(arc_main);
  lv_arc_set_range(arc_main, 0, 4095);
  lv_arc_set_bg_angles(arc_main, 135, 45);
  lv_arc_set_value(arc_main, 0);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_opa(arc_main, LV_OPA_TRANSP, LV_PART_MAIN);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_INDICATOR);
  lv_obj_set_style_arc_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_INDICATOR);
  lv_obj_set_style_arc_rounded(arc_main, true, LV_PART_INDICATOR);

  // knob =末端 작은 하이라이트，흰색 테두리 + 내부는 상태색 채움 + 발광 그림자
  lv_obj_set_style_bg_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_bg_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_pad_all(arc_main, 5, LV_PART_KNOB);
  lv_obj_set_style_radius(arc_main, LV_RADIUS_CIRCLE, LV_PART_KNOB);
  lv_obj_set_style_border_width(arc_main, 3, LV_PART_KNOB);
  lv_obj_set_style_border_color(arc_main, lv_color_hex(0xFFFFFF), LV_PART_KNOB);
  lv_obj_set_style_border_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_shadow_width(arc_main, 18, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_shadow_opa(arc_main, LV_OPA_70, LV_PART_KNOB);
  lv_obj_set_style_shadow_spread(arc_main, 2, LV_PART_KNOB);
  lv_obj_clear_flag(arc_main, LV_OBJ_FLAG_CLICKABLE);

  // 다섯째 단계：중심 원형（수치，추세 그래프，상태 텍스트 배치）
  center_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(center_circle);
  lv_obj_set_size(center_circle, 140, 140);
  lv_obj_center(center_circle);
  lv_obj_set_style_radius(center_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(center_circle, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(center_circle, lv_color_hex(0x080E1A), 0);
  lv_obj_set_style_bg_grad_color(center_circle, lv_color_hex(0x0C1628), 0);
  lv_obj_set_style_bg_grad_dir(center_circle, LV_GRAD_DIR_VER, 0);
  lv_obj_set_style_border_width(center_circle, 1, 0);
  lv_obj_set_style_border_color(center_circle, lv_color_hex(0x1A3050), 0);
  lv_obj_set_style_border_opa(center_circle, LV_OPA_60, 0);
  lv_obj_set_style_pad_all(center_circle, 0, 0);
  lv_obj_clear_flag(center_circle, LV_OBJ_FLAG_SCROLLABLE);

  // 중앙 큰 숫자
  label_value = lv_label_create(center_circle);
  lv_label_set_text(label_value, "0");
  lv_obj_set_style_text_font(label_value, &lv_font_montserrat_28, 0);
  lv_obj_set_style_text_color(label_value, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_value, LV_ALIGN_CENTER, 0, -26);

  // 단위 라벨
  label_unit = lv_label_create(center_circle);
  lv_label_set_text(label_unit, "ADC");
  lv_obj_set_style_text_font(label_unit, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_unit, lv_color_hex(0x506878), 0);
  lv_obj_align(label_unit, LV_ALIGN_CENTER, 0, -6);

  // 추세 그래프 컨테이너（클리핑 담당，그래프 범위 벗어남 방지）
  trend_container = lv_obj_create(center_circle);
  lv_obj_remove_style_all(trend_container);
  lv_obj_set_size(trend_container, 110, 30);
  lv_obj_align(trend_container, LV_ALIGN_CENTER, 0, 16);
  lv_obj_set_style_bg_opa(trend_container, LV_OPA_TRANSP, 0);
  lv_obj_set_style_pad_all(trend_container, 0, 0);
  lv_obj_set_style_clip_corner(trend_container, true, 0);
  lv_obj_set_style_radius(trend_container, 4, 0);
  lv_obj_clear_flag(trend_container, LV_OBJ_FLAG_SCROLLABLE);

  // 그래프 하단 참조 기준선
  static lv_point_precise_t refPts[2] = {{0, 28}, {110, 28}};
  lv_obj_t *refLine = lv_line_create(trend_container);
  lv_line_set_points(refLine, refPts, 2);
  lv_obj_set_style_line_color(refLine, lv_color_hex(0x1A2535), 0);
  lv_obj_set_style_line_width(refLine, 1, 0);

  // 추세 그래프（모든 포인트를 하단으로 초기화）
  for (int i = 0; i < TREND_POINTS; i++) {
    trendLinePoints[i].x = (int32_t)(i * 110 / (TREND_POINTS - 1));
    trendLinePoints[i].y = 28;
  }
  trend_line = lv_line_create(trend_container);
  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
  lv_obj_set_style_line_color(trend_line, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_line_width(trend_line, 2, 0);
  lv_obj_set_style_line_rounded(trend_line, true, 0);
  lv_obj_set_style_line_opa(trend_line, LV_OPA_70, 0);

  // 상태 작은 원점
  dot_status = lv_obj_create(center_circle);
  lv_obj_remove_style_all(dot_status);
  lv_obj_set_size(dot_status, 8, 8);
  lv_obj_set_style_radius(dot_status, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(dot_status, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(dot_status, 8, 0);
  lv_obj_set_style_shadow_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_opa(dot_status, LV_OPA_50, 0);
  lv_obj_align(dot_status, LV_ALIGN_CENTER, -42, 42);

  // 상태 텍스트
  label_status = lv_label_create(center_circle);
  lv_label_set_text(label_status, "EXCELLENT");
  lv_obj_set_style_text_font(label_status, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_status, LV_ALIGN_CENTER, 3, 42);

  // 상단 제목
  label_title = lv_label_create(scr);
  lv_label_set_text(label_title, "AIR QUALITY");
  lv_obj_set_style_text_font(label_title, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_title, lv_color_hex(0x4A6070), 0);
  lv_obj_set_style_text_letter_space(label_title, 3, 0);
  lv_obj_align(label_title, LV_ALIGN_TOP_MID, 0, 60);

  // 하단 점수
  label_score = lv_label_create(scr);
  lv_label_set_text(label_score, "100% CLEAN");
  lv_obj_set_style_text_font(label_score, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_score, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_score, LV_ALIGN_BOTTOM_MID, 0, -8);

  // MIN/MAX 기록（하단 점수 상단）
  label_minmax = lv_label_create(scr);
  lv_label_set_text(label_minmax, "L:-- H:--");
  lv_obj_set_style_text_font(label_minmax, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_minmax, lv_color_hex(0x3A4A5A), 0);
  lv_obj_align(label_minmax, LV_ALIGN_BOTTOM_MID, 0, -24);
}

// ===================== 추세 그래프 데이터 업데이트 =====================
void updateTrend(int value) {
  trendData[trendIdx] = value;
  trendIdx = (trendIdx + 1) % TREND_POINTS;
  if (trendIdx == 0) trendFull = true;

  int count = trendFull ? TREND_POINTS : trendIdx;
  if (count < 2) return;

  // 데이터 범위 찾기，그래프 높이로 정규화
  int vMin = 4095, vMax = 0;
  for (int i = 0; i < count; i++) {
    if (trendData[i] < vMin) vMin = trendData[i];
    if (trendData[i] > vMax) vMax = trendData[i];
  }
  // 최소 변동 폭 보장——공기가 너무 안정적일 때 그래프가 죽은 직선이 되지 않도록
  if (vMax - vMin < 50) vMax = vMin + 50;

  int chartW = 110;
  int chartH = 26;

  for (int i = 0; i < TREND_POINTS; i++) {
    int x = i * chartW / (TREND_POINTS - 1);
    int y;
    if (i < count) {
      int dataIdx = trendFull ? (trendIdx + i) % TREND_POINTS : i;
      int normalized = (trendData[dataIdx] - vMin) * chartH / (vMax - vMin);
      y = chartH - normalized + 1; // y축 반전：값이 클수록 점이 상단에 위치
    } else {
      y = chartH + 1; // 데이터 없는 위치는 하단에 배치
    }
    trendLinePoints[i].x = x;
    trendLinePoints[i].y = y;
  }

  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
}

// ===================== UI 표시 업데이트 =====================
void update_ui(int value, int raw) {
  value = constrain(value, 0, 4095);
  raw   = constrain(raw, 0, 4095);

  // 평활 애니메이션：매 프레임마다 목표값으로 18%씩 접근，숫자 변화가 평활하고 급격하지 않음
  float diff = (float)value - displayValue;
  displayValue += diff * 0.18f;
  int dispVal = (int)(displayValue + 0.5f);

  lv_color_t c  = getColor(dispVal);
  uint32_t dimC = getDimColorHex(dispVal);
  int score     = adcToScore(dispVal);

  // min/max 기록 업데이트
  if (raw < minValue) minValue = raw;
  if (raw > maxValue) maxValue = raw;

  // 메인 원형 + knob 색상은 상태 따름
  lv_arc_set_value(arc_main, dispVal);
  lv_obj_set_style_arc_color(arc_main, c, LV_PART_INDICATOR);
  lv_obj_set_style_bg_color(arc_main, c, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, c, LV_PART_KNOB);

  // 트랙 배경색
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(dimC), LV_PART_MAIN);

  // 외부 발광 링：색상은 상태 따름 + sin 함수로 호흡 투명도 시뮬레이션
  lv_obj_set_style_border_color(glow_circle, c, 0);
  lv_obj_set_style_shadow_color(glow_circle, c, 0);
  static uint32_t breathCount = 0;
  breathCount++;
  float sinVal = sinf((breathCount * 6) % 360 * 3.14159f / 180.0f);
  lv_opa_t breathOpa = (lv_opa_t)(LV_OPA_20 + (int)(sinVal * 25.0f));
  lv_obj_set_style_shadow_opa(glow_circle, breathOpa, 0);
  lv_opa_t borderOpa = (lv_opa_t)(LV_OPA_10 + (int)(sinVal * 15.0f));
  lv_obj_set_style_border_opa(glow_circle, borderOpa, 0);

  // 중앙 수치
  lv_label_set_text_fmt(label_value, "%d", dispVal);
  lv_obj_set_style_text_color(label_value, c, 0);

  // 상태 텍스트 + 작은 원점（작은 원점 그림자도 호흡）
  lv_label_set_text(label_status, getStatusText(dispVal));
  lv_obj_set_style_text_color(label_status, c, 0);
  lv_obj_set_style_bg_color(dot_status, c, 0);
  lv_obj_set_style_shadow_color(dot_status, c, 0);
  lv_opa_t dotOpa = (lv_opa_t)(LV_OPA_30 + (int)(sinVal * 40.0f));
  lv_obj_set_style_shadow_opa(dot_status, dotOpa, 0);

  // 추세 그래프 색상
  lv_obj_set_style_line_color(trend_line, c, 0);

  // MIN/MAX
  lv_label_set_text_fmt(label_minmax, "L:%d  H:%d", minValue, maxValue);

  // 하단 청결도 점수
  const char *statusWord;
  if (score >= 80)      statusWord = "CLEAN";
  else if (score >= 60) statusWord = "FAIR";
  else if (score >= 40) statusWord = "HAZY";
  else if (score >= 20) statusWord = "DIRTY";
  else                  statusWord = "TOXIC";
  lv_label_set_text_fmt(label_score, "%d%% %s", score, statusWord);
  lv_obj_set_style_text_color(label_score, c, 0);
}

// ===================== setup =====================
void setup() {
  Serial.begin(115200);
  delay(200);

  // 첫 단계：백라이트 HIGH로 설정，이 단계 안 하면 화면이 계속 검은색
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 둘째 단계：ADC 구성（12비트 정밀도，0-3.3V 범위）
  // 참고：ADC_11db는 ESP32 Core 3.x에서 ADC_ATTEN_DB_12와 동일，이전 작성법 호환
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // 셋째 단계：디스플레이 시작，SPI 주파수 40MHz
  gfx.begin(40000000);

  // 넷째 단계：LVGL 초기화
  lv_init();
  lv_tick_set_cb(my_tick_cb);

  lv_display_t *disp = lv_display_create(SCREEN_WIDTH, SCREEN_HEIGHT);
  lv_display_set_color_format(disp, LV_COLOR_FORMAT_RGB565);
  lv_display_set_buffers(disp, draw_buf, NULL, sizeof(draw_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(disp, my_disp_flush);

  // 다섯째 단계：인터페이스 구성，0값으로 초기화
  create_ui();
  displayValue = 0;
  update_ui(0, 0);

  Serial.println("[SYS] Gauge v3.1 Ready!");
}

// ===================== loop =====================
void loop() {
  static uint32_t lastSensorMs = 0;
  static uint32_t lastTrendMs  = 0;
  static uint32_t lastLogMs    = 0;

  uint32_t now = millis();

  // 50ms마다：센서 읽기 + UI 새로 고침（약 20fps，원활하고 끊김 없음）
  if (now - lastSensorMs >= 50) {
    int raw = analogRead(MQ135_PIN);
    raw = constrain(raw, 0, 4095);

    if (firstSample) {
      // 첫 프레임은 직접 할당，0부터 시작하는 애니메이션 전이 건너뜀
      smoothedValue = raw;
      displayValue  = raw;
      firstSample   = false;
    } else {
      // 지수 가중 평균：새 값 12%，이전 값 88% 보존，평활하지만 지체되지 않음
      smoothedValue = smoothedValue * 0.88f + raw * 0.12f;
    }

    update_ui((int)smoothedValue, raw);
    lastSensorMs = now;
  }

  // 300ms마다：데이터 포인트 하나를 추세 그래프에 푸시（40포인트 × 300ms ≈ 12초 분량）
  if (now - lastTrendMs >= 300) {
    updateTrend((int)smoothedValue);
    lastTrendMs = now;
  }

  // 1s마다：시리얼 디버깅 로그 출력（문제 확인 시 시리얼 모니터 열어보기）
  if (now - lastLogMs >= 1000) {
    Serial.printf("SCORE=%d%%  ADC=%d  SMOOTH=%d  L=%d H=%d [%s]\n",
                  adcToScore((int)smoothedValue),
                  analogRead(MQ135_PIN),
                  (int)smoothedValue,
                  minValue, maxValue,
                  getStatusText((int)smoothedValue));
    lastLogMs = now;
  }

  lv_timer_handler(); // LVGL 내부 태스크 스케줄링，주기적으로 호출 필수，누락 금지
  delay(5);
}
```

### 코드 설명

몇 가지 핵심 설계에 대해 설명하지 않으면 코드를 보면 혼란스러울 수 있습니다：

**① 지수 가중 평균을 사용하는 이유，원본 ADC를 직접 표시하지 않는 이유？**

MQ135의 아날로그 출력은 어느 정도 노이즈가 있어 숫자를 직접 표시하면 계속跳变합니다. 지수 가중 평균（EMA）공식：

```
새 평활값 = 이전 평활값 × 0.88 + 원본 값 × 0.12
```

0.12 가중치는 새 데이터 영향이 작고 수치 변화가 완만하지만 추세를 따라갈 수 있음을 의미합니다. 더 민감한 응답을 원하면 `0.12f`를 키우고（최대 1.0 = 완전히 평활하지 않음），더 안정적이려면 `0.88f`를 키우세요.

**② 호흡 효과는 어떻게 구현？**

`update_ui()`에서 `sinf()`로 −1에서 +1까지 주기적으로 변하는 값을 생성하여 투명도 범위（`LV_OPA_20` ～ `LV_OPA_45`）로 매핑하며 호출할 때마다 카운터가 증가합니다. 외부 테두리와 그림자 투명도가 주기적으로 밝아졌다가 어두워지며 "호흡"하는 것처럼 보입니다.

**③ 추세 그래프는 왜 때로는 평평한가？**

환경이 매우 안정적일 때 역사 데이터의 최대 최소 차이가 매우 작으면 그래프가 강제로 최소 50 ADC 변동 범위로 당겨집니다：

```cpp
if (vMax - vMin < 50) vMax = vMin + 50;
```

이렇게 하면 공기가 변하지 않아도 그래프가 죽은 직선이 되지 않고 미세한 변동을 볼 수 있습니다.

---

## 일반적인 문제 해결

당황하지 마세요. 80%의 문제는 다음 몇 곳에서 발생합니다：

**화면이 전체 검은색，반응 없음**
첫 번째：BL 핀이 GPIO 7에 연결되어 있는지 확인，코드에서 `digitalWrite(TFT_BL, HIGH)`가 실행되었는지 확인. 백라이트가 켜지지 않으면 화면은 당연히 검습니다——디스플레이가 고장 난 것이 아니라 백라이트가 HIGH로 되지 않은 것입니다.

**화면이 전체 흰색 또는 전체 적색（색상은 있으나 내용 없음）**
90% 확률로 DC와 CS 핀이 반대로 연결되었습니다. 배선 표를 보고 이 두 선을 다시 확인하거나 바로 교체해 보세요.

**컴파일 오류：`lv_font_montserrat_28 undeclared`**
`lv_conf.h`가 올바르게 구성되지 않았거나 위치가 잘못되었습니다. "설치해야 할 라이브러리" 챕터를 다시 보고 단계에 따라 폰트 옵션을 0에서 1로 변경하세요.

**ADC 读수가 계속 0 또는 4095로 변하지 않음**
멀티미터로 MQ135의 A0 핀 출력 전압을 측정，정상은 0.5V～2.5V 사이에서 변동해야 합니다. 0V이면 VCC 배선 확인；전체 스케일（3.3V）이면 센서가 충분히 예열되지 않았을 수 있습니다——새 센서는 전원 켜直后读수가 불안정하며 3분 후 다시 확인하세요.

**수치 표시가 크게 떨림**
코드의 평활 계수 `0.88f`를 키우세요（예：`0.95f`），평활 정도가 증가하지만 응답 속도가 느려지는 대가입니다.

**LVGL 컴파일 시 메모리 부족 또는 런타임 시 정지**
`DRAW_BUF_LINES`를 40에서 줄이세요（예：20），버퍼 점유 감소. ESP32-S3 표준 RAM은 충분하지만 RAM이 작은 보드를 사용하면 이 문제가 발생합니다.

---

## FAQ

**Q：GPIO 13은 고정인가요？다른 ADC 핀으로 바꿀 수 있나요？**
A：가능합니다. ESP32-S3에서 GPIO 1～10은 ADC1에 속하며 GPIO 11～20은 ADC2에 속합니다. 이 프로젝트는 Wi-Fi를 사용하지 않으므로 ADC2 핀（GPIO 13 포함）은 충돌 없이 정상 사용 가능. 향후 Wi-Fi를 추가하려면 센서를 ADC1 핀（GPIO 1～10）으로 옮기는 것을 권장합니다. Wi-Fi가 ADC2를 점유할 때 读数 오류를 피하기 위해서입니다.

**Q：MQ135를 3.3V 전원 공급时读수가 정확한가요？**
A：충분히 정확하지는 않지만 추세 표시에는 완전히 충분합니다. MQ135 정격 전압은 5V이며 3.3V 전원 공급 시 히터 전력은 표준의 약 44%，감도가 떨어지고 절대값이 낮게 나옵니다. ppm 농도로 변환하려면 VCC에 별도 5V를 사용하고 A0 아날로그 출력은 3.3V를 넘지 않으므로 추가 분압 회로가 필요 없습니다.

**Q：LVGL은 반드시 v9를 사용해야 하나요？v8은 실행 불가？**
A：v8은 이 코드를 직접 실행할 수 없습니다. v9는 `lv_display_t`，`lv_display_create` 등 새 API를 도입했으며 v8에는 이러한 구조체가 없어 직접 컴파일하면大量 오류가 발생합니다. v9.2.x 이상 버전 설치를 강력 권장하며 다운그레이드하지 마세요.

**Q：원형 디스플레이 네 모서리에 검은색 "缺口"가 있는데，납땜 불량인가요？**
A：정상 현상，문제 아님. GC9A01은 원형 디스플레이 영역이며底层 버퍼는 240×240 사각형，네 모서리는 화면 물리적 차광 구조로 실제 픽셀이 없어内容을 표시하지 않는 것이 정확합니다.

**Q：센서 전원 켜直后数치가 크게跳变하는데，안정될 때까지 얼마나 기다려야 하나요？**
A：MQ135는 예열이 필요합니다. 새 센서는 24～48시간 연속 전원 후读수가 안정되는 것을 권장하며；이미 사용된 센서는 약 3분 후 안정됩니다. `setup()` 말미에 `delay(180000)`（3분）을 추가하거나 UI에 "예열 중" 상태 표시를 추가한 후 시간이 지난 후正式采集 시작.

**Q：화면 새로 고침이 약간 끊기는데，어떻게 속도를 높이나요？**
A：두 방향：① `gfx.begin(40000000)`에서 SPI 주파수를 80MHz로 변경（GC9A01 최대 80MHz 지원하지만 일부 보드 배선 품질이 나쁠 때 불안정，먼저 테스트 권장）；② `DRAW_BUF_LINES` 증가（예：60으로 변경），LVGL 분할 새로 고침 횟수 감소，약 9KB RAM 추가 점유.

---

## 확장 플레이

실행 후 다음 방향으로 계속 확장：

- BME280 연결，온습도 한 채널 추가，대시보드에 데이터 한 줄 더 표시
- Wi-Fi를 통해 ADC 데이터를 Home Assistant에 보고，장기적 역사 곡선 생성
- 버튼 추가로 표시 모드 전환（대시보드 / 큰 글자 모드 / 순수 그래프）
- MQ-7 센서로 교체，일산화탄소 농도 전용 모니터링
- 버저 추가，공기질이 DANGER 구간 진입 시 경보 발생

---

## 참고 자료

- [GC9A01 구동 칩 데이터시트（Galaxycore 공식）](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [MQ135 센서 사양서（Winsen 炜盛 공식）](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ135%20(Ver1.4)%20-%20Manual.pdf)
- [Arduino_GFX_Library GitHub 페이지](https://github.com/moononournation/Arduino_GFX)
- [LVGL 공식 문서 v9](https://docs.lvgl.io/9.0/)
<!-- - [ESP32-S3 기술 참조 매뉴얼（Espressif 공식）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf) -->