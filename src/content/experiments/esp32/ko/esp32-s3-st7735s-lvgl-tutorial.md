---
title: "ESP32-S3 + $3 컬러 LCD로 LVGL 애니메이션 구현｜비전공자도 10분 만에 완성"
boardId: esp32s3
moduleId: display/tft096-st7735s
category: esp32
date: 2026-04-10
intro: "ESP32-S3으로 0.96인치 ST7735S TFT 컬러 LCD를 구동하고 LVGL 애니메이션을 띄우는 전체 과정을 설명합니다. 배선부터 완성 코드까지, 자주 막히는 포인트 해결법 포함. Arduino와 임베디드 개발 입문자에게 적합합니다."
image: "https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png"
---

# ESP32-S3 + $3 컬러 LCD로 LVGL 애니메이션 구현! 비전공자도 10분 만에 완성 (2026 최신 트러블슈팅 버전)

> **한 줄 요약**: ESP32-S3으로 0.96인치 ST7735S TFT LCD 구동 + LVGL 애니메이션, 핵심 배선 5개 + 완전한 트러블슈팅 가이드

## 완성 화면

![image-20260410152138611](https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png)

> 손톱만 한 0.96인치 화면에서도 부드러운 LVGL 애니메이션이 돌아간다. 배선부터 코드까지 전부 설명하고, 흔히 막히는 부분을 미리 짚어드린다.



------

## 이 가이드에서 배울 수 있는 것

1. ESP32-S3가 SPI를 통해 ST7735S 0.96인치 TFT 컬러 LCD를 구동하는 방법
2. Arduino_GFX 라이브러리 설정 방법 (TFT_eSPI를 사용하지 않는 이유 포함)
3. LVGL v9를 소형 화면에 포팅하는 전체 과정
4. 이중 애니메이션 효과가 있는 LVGL UI 예제 (좌우 슬라이드 + 상하 바운스)



## 부품 목록 (BOM)

| 부품                             | 수량 | 비고                          |
| -------------------------------- | ---- | ----------------------------- |
| ESP32-S3 개발 보드               | 1    | S3 계열이면 모두 가능         |
| 0.96인치 ST7735S TFT IPS LCD     | 1    | 80×160 해상도, SPI 인터페이스, 8핀 |
| 점퍼 와이어 (암-암)              | 8개  | 8개면 충분                    |
|                                  |      |                               |




## 화면 스펙

![image-20260410113243742](https://img.lingflux.com/2026/04/e66957af12d082ebd30b5b8cdb06de8c.png)

> 전부 외울 필요는 없습니다. ***** 표시된 항목만 확인하면 코드 작성에 지장 없습니다.

| 파라미터   | 스펙             | 비고                                                       |
| ---------- | ---------------- | ---------------------------------------------------------- |
| 크기       | 0.96인치 TFT IPS | 광시야각, 색상 재현 우수                                   |
| 해상도     | 80(H) × 160(V)   | ***** 코드에서 `screenWidth=160, screenHeight=80` (가로 모드) |
| 드라이버 IC | ST7735S         | ***** 라이브러리 선택 시 반드시 일치시켜야 함              |
| 통신 인터페이스 | 4선식 SPI   | 최대 40MHz (처음엔 기본 속도로 테스트 권장)                |
| 동작 전압  | **3.3V**         | ***** 절대 5V 연결 금지!                                   |
| 핀 수      | 8핀              | 백라이트 제어 핀 BLK 포함                                  |



| 파라미터       | 스펙                      |
| -------------- | ------------------------- |
| 표시 영역      | 10.8(H) × 21.7(V) mm      |
| 패널 크기      | 19(H) × 24(V) × 2.7(D) mm |
| 픽셀 피치      | 0.135(H) × 0.1356(V) mm   |
| 동작 전류      | 20mA                      |
| 백라이트 타입  | LED × 1                   |
| 동작 온도      | -20 ~ 70°C                |
| PCB 크기       | 30.00 × 24.04 mm          |
| 마운팅 홀 내경 | 2 mm                      |
| 핀 피치        | 2.54 mm                   |

**핀 정의:**

| 번호 | 핀  | 기능 설명                                         |
| ---- | --- | ------------------------------------------------- |
| 1    | GND | 그라운드                                          |
| 2    | VCC | 전원 (3.3V)                                       |
| 3    | SCL | SPI 클럭                                          |
| 4    | SDA | SPI 데이터 (MOSI)                                 |
| 5    | RES | 리셋 (Low 활성)                                   |
| 6    | DC  | 레지스터/데이터 선택 (Low=커맨드, High=데이터)    |
| 7    | CS  | 칩 셀렉트 (Low 활성)                              |
| 8    | BLK | 백라이트 (High=점등; 제어 불필요 시 3.3V에 연결)  |




## 배선

| ESP32-S3 핀 | ST7735S 핀 | 설명                         |
| ----------- | ---------- | ---------------------------- |
| GND         | GND        | 공통 그라운드                |
| **3.3V**    | VCC        | **5V 절대 금지**             |
| GPIO 12     | SCL        | SPI 클럭                     |
| GPIO 11     | SDA        | SPI 데이터 (MOSI)            |
| GPIO 21     | RES        | 리셋                         |
| GPIO 47     | DC         | 커맨드/데이터 선택           |
| GPIO 38     | CS         | 칩 셀렉트                    |
| GPIO 48     | BLK        | 백라이트 (또는 3.3V에 연결)  |



### 배선 주의사항

- **전원**: 반드시 3.3V만 사용. 5V 연결 시 화면 파손
- **BLK 백라이트 핀**: 소프트웨어로 백라이트를 제어할 필요가 없다면 3.3V에 연결해 항상 켜두면 됨
- **CS 칩 셀렉트**: Low 활성
- **RES 리셋**: 초기화 시 Low 펄스 필요
- **핀 선택**: 위 핀들은 ESP32-S3의 SPI2(FSPI) 기본 핀을 사용. 핀을 변경하면 코드의 `#define` 매크로도 함께 수정해야 함



## 라이브러리 설치

Arduino IDE에서 다음 두 라이브러리를 설치한다.

1. **Arduino_GFX_Library** — "GFX Library for Arduino"로 검색하여 설치
2. **LVGL** — `lvgl`로 검색하여 **v9.x** 설치

> **TFT_eSPI 대신 Arduino_GFX를 사용하는 이유**
>
> 먼저 밝히자면, 나는 TFT_eSPI도 즐겨 사용하고 여러 화면을 구동해왔다. 두 라이브러리 모두 ST7735S를 지원하지만 설정 방식이 크게 다르다.
>
> **TFT_eSPI의 문제점: 라이브러리 소스 파일을 직접 수정해야 함**
>
> TFT_eSPI를 사용하려면 라이브러리 설치 디렉토리에 있는 `User_Setup.h` 파일을 열어 핀 정의와 드라이버 선택을 수동으로 편집해야 한다. 이것이 의미하는 바는:
>
> 1. 라이브러리 경로를 찾아야 함 (OS마다 다름: `Documents/Arduino/libraries/` 또는 `.platformio/packages/`)
> 2. 수백 줄짜리 설정 파일에서 해당 줄을 찾아 기본값을 주석 처리하고 원하는 값의 주석을 해제
> 3. 서로 다른 화면을 사용하는 프로젝트를 병행한다면 전환할 때마다 이 파일을 다시 수정
> 4. **라이브러리 업데이트 시 설정이 덮어쓰기되어 초기화됨** — 갑자기 컴파일이 안 되는 상황 발생
>
>    "영상 따라 그대로 했는데 흰 화면만 나온다"는 가장 흔한 불만이 바로 `User_Setup.h` 설정 오류나 반영 실패에서 비롯된다.
>
>    **Arduino_GFX의 방식: 모든 설정을 내 코드 안에서 해결**
>
>    Arduino_GFX는 모든 설정을 자신의 `.ino` 파일 안에서 완결한다.
>
> ```c
> // 핀과 드라이버 설정은 코드 내에 직접 정의 — 라이브러리 파일 수정 불필요
> Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
> Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
> ```
>
> - 핀 변경? `#define` 한 줄만 수정
> - 화면 변경? `Arduino_ST7735`를 `Arduino_ILI9341` 등 다른 드라이버로 교체
> - 라이브러리 업데이트? 내 코드에 영향 없음
> - 여러 프로젝트 병행? 각 프로젝트가 독립적인 설정을 가지므로 서로 간섭 없음
>
>   **그 외에도, TFT_eSPI는 ESP32-S3와의 호환성 문제가 보고되고 있다.** GitHub에는 ESP32 Arduino Core 3.x 환경에서 컴파일 실패를 보고하는 이슈가 여러 건 있다. Arduino_GFX는 현재도 활발히 유지보수되고 있으며 신규 칩 지원이 더 우수하다.




## 개발 환경

MacOS - v15.1.1

Arduino IDE - v2.3.8

보드 패키지: esp32 (by Espressif Systems) - v3.3.7

디스플레이 드라이버: GFX Library for Arduino (by Moon on our nation) - v1.6.5

그래픽 라이브러리: LVGL (by kisvegabor) - v9.5.0



## 전체 코드



```c
#include <Arduino_GFX_Library.h>
#include <lvgl.h>

// --- 핀 정의 및 GFX 초기화 ---
#define TFT_CS 38
#define TFT_RST 21
#define TFT_DC 47
#define TFT_MOSI 11
#define TFT_SCLK 12
#define TFT_BLK 48

#define BLACK   0x0000
#define WHITE   0xFFFF
#define ROTATION 1

Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);

static const uint32_t screenWidth  = 160;
static const uint32_t screenHeight = 80;

void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = lv_area_get_width(area);
  uint32_t h = lv_area_get_height(area);
  uint32_t stride = lv_draw_buf_width_to_stride(w, LV_COLOR_FORMAT_RGB565);
  uint8_t * row_ptr = px_map;
  
  for (uint32_t y = 0; y < h; y++) {
    gfx->draw16bitRGBBitmap(area->x1, area->y1 + y, (uint16_t *)row_ptr, w, 1);
    row_ptr += stride;
  }
  lv_display_flush_ready(display);
}

// ==========================================
// 애니메이션 콜백 함수 (LVGL 애니메이션 엔진에서 값 변화를 수신)
// ==========================================

// 콜백: 오브젝트의 X 좌표 업데이트 (수평 이동)
static void anim_x_cb(void * var, int32_t v) {
  lv_obj_set_x((lv_obj_t *)var, v);
}

// 콜백: 오브젝트의 Y 좌표 업데이트 (수직 이동)
static void anim_y_cb(void * var, int32_t v) {
  lv_obj_set_y((lv_obj_t *)var, v);
}

void setup() {
  Serial.begin(115200);
  pinMode(TFT_BLK, OUTPUT);
  digitalWrite(TFT_BLK, HIGH);

  gfx->begin();
  gfx->fillScreen(BLACK);

  lv_init();
  lv_display_t *display = lv_display_create(screenWidth, screenHeight);
  lv_display_set_color_format(display, LV_COLOR_FORMAT_RGB565);

  static lv_color_t buf[screenWidth * screenHeight / 10];
  lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(display, my_disp_flush);

  // 화면 배경을 흰색으로 설정
  lv_obj_set_style_bg_color(lv_scr_act(), lv_color_hex(0xFFFFFF), 0);

  // ==========================================
  // UI 레이아웃: 자식 요소를 감싸는 투명 컨테이너 생성
  // ==========================================
  
  // 1. 투명 컨테이너 생성 (크기 100x60)
  lv_obj_t * cont = lv_obj_create(lv_scr_act());
  lv_obj_set_size(cont, 100, 60);
  lv_obj_set_style_bg_opa(cont, 0, 0);             // 배경 완전 투명
  lv_obj_set_style_border_width(cont, 0, 0);       // 테두리 없음
  lv_obj_set_style_pad_all(cont, 0, 0);            // 패딩 없음
  lv_obj_align(cont, LV_ALIGN_CENTER, 0, 0);       // 컨테이너를 화면 중앙에 배치

  // 2. 초록 사각형을 컨테이너 상단 중앙에 배치
  lv_obj_t *rect = lv_obj_create(cont);
  lv_obj_set_size(rect, 30, 30);
  lv_obj_set_style_bg_color(rect, lv_color_hex(0x00FF00), 0);
  lv_obj_set_style_border_width(rect, 0, 0);
  lv_obj_align(rect, LV_ALIGN_TOP_MID, 0, 0);

  // 3. 레이블을 컨테이너 하단 중앙에 배치
  lv_obj_t * label = lv_label_create(cont);
  lv_label_set_text(label, "hello world!");
  lv_obj_set_style_text_color(label, lv_color_hex(0x000000), 0);
  lv_obj_align(label, LV_ALIGN_BOTTOM_MID, 0, 0);


  // ==========================================
  // 이중 애니메이션 효과 (LVGL v9 애니메이션 엔진)
  // ==========================================

  // 애니메이션 A: 컨테이너 전체(사각형+레이블)를 좌우로 슬라이드
  lv_anim_t a_x;
  lv_anim_init(&a_x);
  lv_anim_set_var(&a_x, cont);                       // 컨테이너에 바인딩
  lv_anim_set_values(&a_x, -30, 30);                 // 중심에서 왼쪽 30px → 오른쪽 30px
  lv_anim_set_time(&a_x, 2000);                      // 편도 2000밀리초 (2초)
  lv_anim_set_playback_time(&a_x, 2000);             // 복귀도 2000밀리초
  lv_anim_set_repeat_count(&a_x, LV_ANIM_REPEAT_INFINITE); // 무한 반복
  lv_anim_set_path_cb(&a_x, lv_anim_path_ease_in_out);     // ease-in-out으로 자연스러운 움직임
  lv_anim_set_exec_cb(&a_x, anim_x_cb);              // X축 콜백 바인딩
  lv_anim_start(&a_x);                               // 애니메이션 시작!

  // 애니메이션 B: 초록 사각형만 상하로 바운스
  lv_anim_t a_y;
  lv_anim_init(&a_y);
  lv_anim_set_var(&a_y, rect);                       // 사각형에만 바인딩
  lv_anim_set_values(&a_y, 0, 10);                   // 0~10픽셀 아래로 이동
  lv_anim_set_time(&a_y, 300);                       // 빠른 바운스 — 300밀리초
  lv_anim_set_playback_time(&a_y, 300);              
  lv_anim_set_repeat_count(&a_y, LV_ANIM_REPEAT_INFINITE); 
  lv_anim_set_path_cb(&a_y, lv_anim_path_ease_in_out); 
  lv_anim_set_exec_cb(&a_y, anim_y_cb);              // Y축 콜백 바인딩
  lv_anim_start(&a_y);                               // 애니메이션 시작!
}

// 이전 타임스탬프 저장
uint32_t last_tick = 0;
void loop() {
  // 1. 마지막 loop 이후 경과된 밀리초 계산
  uint32_t current_tick = millis();
  uint32_t elapsed_time = current_tick - last_tick;
  last_tick = current_tick;

  // 2. 경과 시간을 LVGL에 전달 (애니메이션이 동작하는 절대적 조건!)
  lv_tick_inc(elapsed_time);

  // 3. LVGL이 애니메이션 처리와 화면 재드로우 수행
  lv_timer_handler();
  
  // 4. CPU 과부하 방지를 위한 짧은 딜레이
  delay(5);
}
```




## 코드 핵심 포인트 해설

> 초보자가 가장 자주 막히는 부분들이다. 자신의 코드와 대조하며 확인해보자.

### 1. GFX 초기화의 오프셋 파라미터



```c
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
```

끝의 4개 숫자 `26, 1, 26, 1`은 각각 `col_offset1, row_offset1, col_offset2, row_offset2`다. **화면 내용이 한쪽 구석으로 밀리거나 검은 여백이 생기면 이 4개 값을 조정한다.** ST7735S 모듈은 제조사마다 오프셋 값이 다를 수 있으며, 여기서 제시하는 값이 가장 일반적이다.

### 2. 화면 크기 — 가로 방향(Landscape) 주의

```c
#define ROTATION 1  // 가로 방향 회전
static const uint32_t screenWidth  = 160;  // 회전 후 너비
static const uint32_t screenHeight = 80;   // 회전 후 높이
```

물리적 화면은 80×160(세로). `ROTATION=1`로 90° 회전하면 160×80이 된다. **LVGL의 display 크기는 회전 후의 방향에 맞춰야 한다** — 그렇지 않으면 화면이 깨진다.

### 3. flush 콜백 — LVGL과 GFX의 연결 고리

```c
void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  ...
  lv_display_flush_ready(display);  // 이 줄은 반드시 있어야 함!
}
```

`lv_display_flush_ready()`는 LVGL에 "이 영역 그리기 완료, 다음으로 넘어가도 됨"을 알리는 함수다. **이 줄을 빠뜨리면 화면이 영원히 업데이트되지 않는다.**

### 4. loop에서 시간 공급

```c
lv_tick_inc(elapsed_time);
lv_timer_handler();
```

이 두 줄이 LVGL 애니메이션의 심장이다. `lv_tick_inc`가 경과 시간을 공급하고, `lv_timer_handler`가 화면 재드로우를 트리거한다. **둘 중 하나라도 빠지면 애니메이션이 멈춘다.**




## 자주 발생하는 문제 해결

| 증상                                  | 가능한 원인                                                     | 해결 방법                                                                    |
| ------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **흰 화면 (백라이트는 켜짐)**         | flush 콜백 미등록 또는 `lv_display_flush_ready()` 누락          | `my_disp_flush`가 flush_cb로 올바르게 설정되어 있는지 확인                  |
| **화면 깨짐 / 랜덤한 색상 블록**     | SPI 핀 배선 오류 또는 접촉 불량                                 | 배선 재확인, 점퍼 와이어가 단단히 꽂혀 있는지 확인                           |
| **화면 내용 이동 / 검은 여백 발생**   | ST7735S 오프셋 파라미터가 모듈과 불일치                         | `Arduino_ST7735` 생성자의 `col_offset`, `row_offset` 값 조정                 |
| **색상 반전 (파랑이 빨강으로 표시)** | RGB/BGR 순서 설정 오류                                          | GFX 초기화에서 컬러 순서 파라미터 확인                                       |
| **화면 상하 반전**                    | 회전 파라미터 오류                                              | `ROTATION`을 0 또는 3으로 변경하여 시도                                      |
| **컴파일 오류: lvgl.h를 찾을 수 없음** | LVGL 미설치 또는 버전 불일치                                   | **LVGL v9.x** 설치 여부 확인 (v8이 아닌지 확인)                              |
| **애니메이션 정지, 정적 화면**        | loop에 `lv_tick_inc()` 또는 `lv_timer_handler()` 누락           | `loop()` 안에 두 줄 모두 있는지 확인                                         |


