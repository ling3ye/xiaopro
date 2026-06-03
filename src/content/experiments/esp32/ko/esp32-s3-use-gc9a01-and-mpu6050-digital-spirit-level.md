---
title: "ESP32-S3 + GC9A01 + MPU6050 디지털 수평기 완벽 가이드｜SPI + I2C + Arduino"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-03
intro: "ESP32-S3으로 GC9A01 원형 LCD와 MPU6050 6축 센서를 구동하여 피치, 롤 각도와 온도를 실시간으로 표시하는 보기 좋고 실용적인 디지털 수평기를 만들어봅니다."
image: "https://img.lingflux.com/2026/06/64f482f7efccfdc6b16f216a95efc28e.jpg"
---

# ESP32-S3 + GC9A01 + MPU6050 디지털 수평기 완벽 가이드 (SPI + I2C + Arduino)

난이도: ⭐⭐☆☆☆ (초보자도 도전 가능)
예상 소요 시간: 45분
테스트 환경: Arduino IDE 2.3.8 | Arduino_GFX_Library v1.6.5 | MPU6050_light v1.2.1

---

> **한 줄 요약**: ESP32-S3이 GC9A01 원형 TFT와 MPU6050 6축 센서를 구동하여 실시간 버블 수평기를 만듭니다. 버블 색상이 기울기 각도에 따라 변하고(녹색→노란색→빨간색), 완전한接线표와 Arduino 코드를 제공합니다.

---

> **TL;DR (빠른 시작):**
>
> 1. MPU6050接线: SDA → GPIO 15, SCL → GPIO 16, AD0 → GND (I2C 주소 0x68 고정)
> 2. GC9A01接线: CLK → GPIO 12, MOSI → GPIO 11, CS → GPIO 9, DC → GPIO 10, RST → GPIO 18, BL → GPIO 7
> 3. 라이브러리 설치: `GFX Library for Arduino` (작성자 moononournation) + `MPU6050_light` (작성자 rfetick)
> 4. 코드를 업로드하고 전원을 켠 후 **수평하게 약 1초간 정지**하여 캘리브레이션 메시지가 사라질 때까지 기다린 다음, 기기를 기울여 버블이 움직이는 것을 확인하세요

---

## 서론

맨손으로 선반을 설치하다가 "거의 수평인 것 같다"고 생각한 적 있으신가요? 그리고 물건을 올려놓고 나서야 모든 것이 한쪽으로 미끄러지는 것을 발견하신 적요?

저도 그런 사람이었습니다. 마침 전통적인 수평기를 빌릴 수 없어서 부품 상자를 뒤져보았습니다. 그랬더니 원형 화면 GC9A01과 MPU6050이 구석에서 먼지를 먹고 있더군요. 이 둘을 합치면 디지털 수평기를 만들기에 딱 좋은 재료가 되었습니다.

더 좋은 점은 원형 화면이 수평기와 시각적으로 완벽한 조합이라는 것입니다. 버블이 중앙에 있으면 녹색, 조금 벗어나면 노란색, 너무 기울어지면 빨간색으로 한눈에 알 수 있어, 설명서가 필요 없습니다.

본 글의 목표: **처음부터接线 → 라이브러리 설치 → 코드 업로드 → 버블 움직임 확인까지**, 따라 하면 그대로 재현할 수 있습니다.

---

## 실험 결과

![](https://img.lingflux.com/2026/06/09a4ed83eaa702df1ded539d608c9323.jpg)

화면에 네 가지 정보가 실시간으로 표시됩니다:

- **중앙 버블**: 기기 기울임에 따라 이동하며, 3단계 색상으로 상태를 표시합니다 (녹색 = 수평 / 노란색 = 약간 기울어짐 / 빨간색 = 많이 기울어짐)
- **합성 기울기 각도(°)**: Pitch와 Roll의 합성값이 큰 글씨로 표시됩니다
- **Pitch / Roll 개별 수치**: 피치각과 롤각 각각의 판독값
- **칩 온도**: MPU6050 내장 온도 센서의 판독값 (실온보다 높은 것이 정상이며, 후문에서 설명합니다)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30s2V_TAoMo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## 부품 설명

### GC9A01 원형 TFT 디스플레이

**원형으로 특별히 잘린 스마트폰 화면**이라고 생각하면 됩니다. 240x240 해상도가 최고는 아니지만, 둥근 유리를 테이블 위에 올려놓고 수평기 다이얼로 사용하기에 더할 나위 없이 완벽합니다.

| 파라미터 | 수치 |
| --- | --- |
| 해상도 | 240 × 240 px (원형 표시 영역) |
| 인터페이스 | SPI (최대 80 MHz) |
| 전원 | 3.3V |
| 색 심도 | 65K 색상 (RGB565) |
| 패널 타입 | IPS |

선택 이유: 원형 다이얼이 버블 수평기 디자인에 자연스럽게 어울리며, SPI 고속 인터페이스로 20fps 애니메이션에 충분합니다.

### MPU6050 6축 관성 센서

**스마트폰의 자이로스코프와 가속도계를 하나로 합친 것**이라고 생각하면 됩니다. 스마트폰 화면 자동 회전, 만보기 카운트 등에 사용되는 것과 같은 종류의 칩입니다. MPU6050은 3축 가속도계(기울기 방향 감지)와 3축 자이로스코프(회전 속도 감지)를 4mm × 4mm 크기의 작은 칩 하나에 넣었고, 보너스로 온도 센서도 포함되어 있습니다.

| 파라미터 | 수치 |
| --- | --- |
| 가속도 범위 | ±2 / ±4 / ±8 / ±16 g (설정 가능) |
| 자이로 범위 | ±250 / ±500 / ±1000 / ±2000 °/s (설정 가능) |
| ADC 해상도 | 16비트 |
| 인터페이스 | I2C (최대 400kHz 고속 모드) |
| 전원 | 3.3V (VDD 범위: 2.375 ~ 3.46V) |
| I2C 주소 | 0x68 (AD0 = GND) / 0x69 (AD0 = VCC) |

선택 이유: 가격이 매우 저렴하고 라이브러리 지원이 잘 되어 있으며, `MPU6050_light`가 직접 융합 각도를 출력하므로 칼만 필터를 직접 구현할 필요가 없습니다.

---

## BOM표

| 부품 | 모델 / 사양 | 수량 |
| --- | --- | --- |
| 메인 보드 | ESP32-S3 | 1 |
| 원형 TFT 화면 | GC9A01 240×240 IPS | 1 |
| 6축 센서 | MPU6050 모듈 | 1 |
| 점퍼 와이어 | 브레드보드 와이어 | 약간 |

---

## 부품 핀 설명

### GC9A01 핀

| 핀 라벨 | 기능 |
| --- | --- |
| VCC | 3.3V 메인 전원 |
| GND | 접지 |
| SCL / CLK | SPI 클럭 (SCLK) |
| SDA / MOSI | SPI 마스터 출력 슬레이브 입력 데이터 |
| CS | 칩 셀렉트 (Low 활성) |
| DC | 데이터 / 명령 전환 |
| RST | 하드웨어 리셋 (Low 활성) |
| BL | 백라이트 제어 |

### MPU6050 핀

| 핀 라벨 | 기능 |
| --- | --- |
| VCC | 3.3V 메인 전원 |
| GND | 접지 |
| SDA | I2C 데이터 라인 |
| SCL | I2C 클럭 라인 |
| INT | 인터럽트 출력 (폴링 모드에서는 미연결) |
| AD0 | I2C 주소 선택 (GND 연결 = 0x68) |
| XDA / XCL | 보조 I2C 인터페이스 (본 프로젝트에서는 미사용) |

---

##接线 방법

> 아래 표를 보고 한 줄씩接线한 후, 완료된 줄 옆에 체크 표시를 하세요. 디버깅 시간의 80%를 줄일 수 있습니다.

### MPU6050 → ESP32-S3

| MPU6050 핀 | ESP32-S3 핀 | 설명 |
| --- | --- | --- |
| VCC | 3.3V | 메인 전원 |
| GND | GND | 공통 그라운드 |
| SDA | GPIO 15 | I2C 데이터 라인 |
| SCL | GPIO 16 | I2C 클럭 라인 |
| AD0 | GND | I2C 주소를 0x68로 고정 |
| INT / XDA / XCL | 미연결 | 본 프로젝트에서 불필요 |

**I2C 풀업 저항에 대하여**: 표준적으로 SDA와 SCL에 각각 4.7kΩ 풀업 저항을 3.3V에 연결하는 것이 좋으며, 고속 읽기 시 노이즈 안정성이 크게 향상됩니다. 본 예제에서는 생략했지만, 완성품으로 만들 계획이라면 추가하는 것을 권장합니다.

### GC9A01 → ESP32-S3

| GC9A01 핀 | ESP32-S3 핀 | 설명 |
| --- | --- | --- |
| VCC | 3.3V | 메인 전원 |
| GND | GND | 공통 그라운드 |
| SCL / CLK | GPIO 12 | SPI 클럭 |
| SDA / MOSI | GPIO 11 | SPI 데이터 |
| CS | GPIO 9 | 칩 셀렉트 |
| DC | GPIO 10 | 데이터 / 명령 전환 |
| RST | GPIO 18 | 하드웨어 리셋 |
| BL | GPIO 7 | 백라이트 (선택 사항, 일부 모듈에는 이 핀이 없음. 코드로 High/Low 제어하거나 3.3V에 직접 연결하여 항상 켜기) |



---

## 설치 필요 라이브러리

Arduino IDE 메뉴 **툴 → 라이브러리 관리**에서 검색하여 설치하세요:

| 라이브러리 이름 | 작성자 | 테스트 완료 버전 |
| --- | --- | --- |
| GFX Library for Arduino | moononournation | v1.6.5 |
| MPU6050_light | rfetick | v1.2.1 |

버전이 다르면 API가 변경될 수 있으므로 표의 버전을 설치하는 것을 권장합니다. 설치 완료 후 Arduino IDE를 재시작하고 프로젝트를 여세요.



---

## 전체 코드

```cpp
/**
 * ESP32-S3 + GC9A01 + MPU6050 디지털 수평기
 * Digital Spirit Level
 *
 *接线:
 *   GC9A01  → SCL=12, SDA=11, CS=9, DC=10, RST=18, BL=7
 *   MPU6050 → SDA=15, SCL=16, AD0=GND (I2C 주소 0x68)
 */

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <MPU6050_light.h>

// ---- 색상 정의 (RGB565 형식) ----
#define COLOR_BG       0x0863   // 어두운 배경
#define COLOR_GRID     0x1A69   // 눈금 격자선
#define COLOR_GREEN    0x07E6   // 버블 중앙 → 녹색
#define COLOR_YELLOW   0xFEA0   // 약간 기울어짐 → 노란색
#define COLOR_RED      0xF820   // 기울기 과다 → 빨간색
#define COLOR_TEXT     0xC618   // 일반 텍스트
#define COLOR_ACCENT   0xFD20   // 중앙 십자선

// ---- GC9A01 SPI 핀 ----
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---- MPU6050 I2C 핀 (반드시接线표와 일치해야 함) ----
#define MPU_SDA  15   // SDA → GPIO 15
#define MPU_SCL  16   // SCL → GPIO 16

// ---- 디스플레이 드라이버 초기화 ----
// 1단계: SPI 버스 생성, 파라미터 순서: DC, CS, SCK, MOSI, MISO
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA,
    GFX_NOT_DEFINED
);
// 2단계: GC9A01 화면 객체 생성 (rotation=0, IPS 패널=true)
Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST, 0, true
);
// 3단계: 240×240 오프스크린 캔버스 생성 (이중 버퍼링, 화면 찢어짐 방지)
Arduino_Canvas *canvas = new Arduino_Canvas(
    240, 240, gfx
);

// ---- MPU6050 ----
MPU6050 mpu(Wire);

// ---- 프레임 속도 제어 ----
const int16_t cx = 120, cy = 120;    // 화면 중심 좌표 (픽셀)
unsigned long lastFrame = 0;
const int frameDelay = 1000 / 20;    // 목표 프레임 속도: 20fps → 프레임당 50ms

// ---- 함수 전방 선언 ----
void drawGrid();
void drawBubble(float pitch, float roll);
void drawReadouts(float pitch, float roll, float temp);

// =============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("=== ESP32-S3 디지털 수평기 시작 중 ===");

    // 1단계: 화면 및 백라이트 초기화
    gfx->begin();
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);    // 백라이트 켜기
    canvas->begin();
    Serial.println("[OK] 화면 초기화 완료");

    // 2단계: I2C 초기화, 버스 스캔 (디버깅 시接线 확인에 유용)
    Wire.begin(MPU_SDA, MPU_SCL);
    Serial.print("[DBG] I2C 버스 스캔 SDA=");
    Serial.print(MPU_SDA);
    Serial.print(" SCL=");
    Serial.println(MPU_SCL);

    byte found = 0;
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            Serial.print("  I2C 장치 발견, 주소: 0x");
            Serial.println(addr, HEX);
            found++;
        }
    }
    if (found == 0) {
        Serial.println("[ERROR] I2C 장치를 찾을 수 없습니다!接线를 확인하세요.");
    }

    // 3단계: MPU6050 초기화
    byte status = mpu.begin();
    if (status == 0) {
        Serial.println("[OK] MPU6050 연결 성공");
    } else {
        Serial.println("[ERROR] MPU6050 응답 없음!接线 또는 I2C 주소를 확인하세요.");
    }

    // 4단계: 자이로스코프 자동 캘리브레이션 (약 1초간 기기를 수평하게 정지 상태로 유지)
    Serial.println("[DBG] 캘리브레이션 중, 기기를 수평하게 유지하고 움직이지 마세요...");
    canvas->fillScreen(COLOR_BG);
    canvas->setTextColor(COLOR_TEXT);
    canvas->setTextSize(1);
    canvas->setCursor(60, 110);
    canvas->print("Calibrating...");
    canvas->setCursor(55, 125);
    canvas->print("Keep device flat");
    canvas->flush();

    delay(1000);
    mpu.calcOffsets();    // 가속도계와 자이로스코프의 영점 오프셋 자동 계산

    Serial.print("[DBG] 가속도 오프셋: ");
    Serial.print(mpu.getAccXoffset());  Serial.print(", ");
    Serial.print(mpu.getAccYoffset());  Serial.print(", ");
    Serial.println(mpu.getAccZoffset());
    Serial.print("[DBG] 자이로 오프셋: ");
    Serial.print(mpu.getGyroXoffset()); Serial.print(", ");
    Serial.print(mpu.getGyroYoffset()); Serial.print(", ");
    Serial.println(mpu.getGyroZoffset());
    Serial.println("[OK] 캘리브레이션 완료, 실행 시작!");
}

// =============================================================
static int logCnt = 0;    // 디버그 로그 제한 카운터

void loop() {
    unsigned long now = millis();
    if (now - lastFrame < frameDelay) return;    // 프레임 속도 제한
    lastFrame = now;

    // 1단계: 센서 읽기
    mpu.update();
    float pitch = mpu.getAngleY();     // 피치각 (전후 기울기)
    float roll  = -mpu.getAngleX();    // 롤각 (좌우 기울기, 부호 반전으로 시각 방향 일치)
    float temp  = mpu.getTemp();       // 칩 온도 (실온보다 높은 것이 정상)

    // 디버그 로그: 20프레임마다 (약 1초) 한 번 출력, 프레임 속도에 영향 없음
    if (++logCnt >= 20) {
        logCnt = 0;
        Serial.print("[DBG] pitch="); Serial.print(pitch, 2);
        Serial.print(" roll=");       Serial.print(roll,  2);
        Serial.print(" temp=");       Serial.print(temp,  1);
        Serial.print(" | accX=");     Serial.print(mpu.getAccX(), 2);
        Serial.print(" accY=");       Serial.print(mpu.getAccY(), 2);
        Serial.print(" accZ=");       Serial.println(mpu.getAccZ(), 2);
    }

    // 2단계: 범위 제한 — ±45° 초과 시 버블이 가장자리에 고정, 원 밖으로 나가지 않음
    pitch = constrain(pitch, -45.0f, 45.0f);
    roll  = constrain(roll,  -45.0f, 45.0f);

    // 3단계: 현재 프레임 그리기
    canvas->fillScreen(COLOR_BG);        // 캔버스 지우기
    drawGrid();                          // 눈금 격자
    drawBubble(pitch, roll);             // 버블
    drawReadouts(pitch, roll, temp);     // 수치 텍스트
    canvas->flush();                     // 화면에 출력
}

// =============================================================
// 배경 눈금 원과 중앙 십자선 그리기
void drawGrid() {
    canvas->drawCircle(cx, cy,  25, COLOR_GRID);
    canvas->drawCircle(cx, cy,  50, COLOR_GRID);
    canvas->drawCircle(cx, cy,  80, COLOR_GRID);
    canvas->drawCircle(cx, cy, 105, COLOR_GRID);
    canvas->drawFastHLine(15, cy,  210, COLOR_GRID);
    canvas->drawFastVLine(cx, 15,  210, COLOR_GRID);
    // 중앙 십자선 (강조 색상 사용, 격자보다 눈에 띔)
    canvas->drawFastHLine(cx - 5, cy,     10, COLOR_ACCENT);
    canvas->drawFastVLine(cx,     cy - 5, 10, COLOR_ACCENT);
}

// 피치/롤 각도에 따라 버블 위치를 매핑하고 거리에 따라 색상 지정
void drawBubble(float pitch, float roll) {
    // ±45°를 ±90px 오프셋으로 선형 매핑
    int16_t bx = cx + (int16_t)(roll  / 45.0f * 90.0f);
    int16_t by = cy + (int16_t)(pitch / 45.0f * 90.0f);

    // 버블과 중심의 픽셀 거리 계산, 색상 등급 결정
    float dist = sqrt((float)((bx - cx) * (bx - cx) + (by - cy) * (by - cy)));
    uint16_t color;
    if      (dist < 10) color = COLOR_GREEN;    // 약 ±5° 이내: 수평
    else if (dist < 40) color = COLOR_YELLOW;   // 약 ±20° 이내: 약간 기울어짐
    else                color = COLOR_RED;       // ±20° 초과: 많이 기울어짐

    // 중심에서 버블까지의 선 + 채워진 버블 + 흰색 테두리
    canvas->drawLine(cx, cy, bx, by, COLOR_GRID);
    canvas->fillCircle(bx, by, 8, color);
    canvas->drawCircle(bx, by, 8, 0xFFFF);
}

// 각도 수치, 상태 텍스트 및 온도 그리기
void drawReadouts(float pitch, float roll, float temp) {
    float total = sqrt(pitch * pitch + roll * roll);    // 합성 기울기 각도

    canvas->setTextSize(1);
    canvas->setTextColor(COLOR_TEXT);

    // 상단 제목
    canvas->setCursor(55, 18);
    canvas->print("DIGITAL LEVEL");

    // 합성 각도: 큰 글꼴, 버블과 동일한 색상
    canvas->setTextSize(2);
    uint16_t color;
    if      (total < 1)  color = COLOR_GREEN;
    else if (total < 10) color = COLOR_YELLOW;
    else                 color = COLOR_RED;
    canvas->setTextColor(color);
    canvas->setCursor(75, 155);
    canvas->print(total, 1);
    canvas->print((char)247);    // ° 기호 (ASCII 247)

    // 상태 텍스트
    canvas->setTextSize(1);
    canvas->setCursor(80, 178);
    if      (total < 1)  canvas->print("  LEVEL");
    else if (total < 10) canvas->print(" TILTED");
    else                 canvas->print("  STEEP");

    // Pitch / Roll 개별 판독값
    canvas->setTextColor(COLOR_TEXT);
    canvas->setCursor(20, 195);
    canvas->print("P:"); canvas->print(pitch, 1);
    canvas->print(" R:"); canvas->print(roll,  1);

    // 온도 (칩 접합부 온도, 실온보다 높은 것이 정상)
    canvas->setCursor(60, 210);
    canvas->print("T:"); canvas->print(temp, 1);
    canvas->print("C");
}
```

---

## 코드 설명

**초기화 과정 (setup)**

setup에서는 네 단계를 순서대로 실행합니다: 화면 초기화 → I2C 스캔 → MPU6050 초기화 → 자이로스코프 캘리브레이션. 이때 모듈을 어떻게 놓느냐에 따라 중심점이 해당 위치에 설정됩니다.

화면은 `Arduino_Canvas`를 사용하여 오프스크린 이중 버퍼링을 구현합니다. 모든 그리기 작업이 먼저 메모리에서 완료된 후, 마지막에 한 번에 `flush()`로 화면에 출력되므로 화면 찢어짐이나 중간 프레임이 나타나지 않습니다.

I2C 스캔 부분은 시리얼 포트에 발견된 장치 주소를 출력합니다. 처음 전원을 켤 때 시리얼 모니터를 열어 MPU6050이 제대로 연결되었는지 확인할 수 있습니다 (정상적으로는 `I2C 장치 발견, 주소: 0x68`이 출력됨).

`mpu.calcOffsets()`은 자동 캘리브레이션으로 약 1초가 소요되며, 그 동안 기기를 수평하게 정지 상태로 유지해야 합니다. **매 전원 인가 시마다 캘리브레이션이 다시 실행**되므로, 매번 켤 때 먼저 평평한 곳에 놓고 화면 안내가 사라진 후 사용하세요.

**메인 루프 (loop)**

프레임 속도를 20fps로 고정하고, 매 프레임마다 네 가지 작업을 수행합니다: 센서 읽기 → 범위 제한 → 그리기 → 화면 출력.

`roll = -mpu.getAngleX()` 앞에 마이너스 부호가 있는 이유는 화면의 버블 이동 방향과 실제 기울기 방향을 일치시키기 위함입니다. 부호를 반전하지 않으면 버블이 반대 방향으로 움직입니다. 설치 방향이 다른 경우 부호를 직접 조정할 수 있습니다.

버블 색상은 3단계로 판단합니다: 원심으로부터 <10px 녹색, <40px 노란색, 나머지 빨간색으로, 대략 ±5° 이내, ±20° 이내, ±20° 초과에 해당합니다.

---

## 일반적인 문제 해결

당황하지 마세요. 문제의 90%는接线와 주소 설정에서 발생합니다:

**화면이 전체 하얀색 / 검은색이고 아무것도 표시되지 않음**

먼저 VCC가 3.3V에 연결되어 있는지 확인하세요 (5V가 아님, GC9A01은 내압이 낮습니다). BL 백라이트 핀이 연결되어 있는지도 확인하세요. CS, DC, RST 세 가지 선이 잘못 연결되지 않았는지 확인합니다. CS가 잘못되면 화면이 응답하지 않고, RST가 떠 있으면 리셋 상태에서 멈춥니다. 먼저 BL을 3.3V에 직접 연결하여 항상 켜보세요. 화면이 하얗게 빛나면 화면 자체는 문제없고 SPI 초기화 실패입니다.

**시리얼 출력에 `[ERROR] I2C 장치를 찾을 수 없습니다`가 표시됨**

멀티미터로 MPU6050의 VCC 핀에 3.3V가 인가되는지 확인하세요. SDA와 SCL이 반대로 연결되지 않았는지 확인합니다 (SDA → GPIO 15, SCL → GPIO 16). **AD0는 반드시 GND에 명시적으로 연결**해야 합니다. 떠 있는 상태에서는 일부 모듈의 주소가 불안정해져 I2C 버스가 응답하지 않습니다.

**버블이 계속 흔들리며 안정되지 않음**

전원 인가 후 캘리브레이션 시 기기가 완전히 정지 상태가 아니었을 가능성이 높습니다. 다시 전원을 켜고 평평한 테이블 위에 놓은 후 화면의 캘리브레이션 안내가 사라질 때까지 기다리세요. 테이블 자체가 진동하고 있다면 (옆에 프린터, 팬이 있는 경우) 다른 위치로 이동하세요.

**Pitch 또는 Roll 방향이 반대임**

개발 보드의 설치 방향에 따라 코드에서 해당 각도 앞의 부호를 조정하세요: `pitch = mpu.getAngleY()`를 `pitch = -mpu.getAngleY()`로 변경하거나, `roll` 줄을 조정하여 방향이 맞을 때까지 수정합니다.

**온도가 실온보다 10도 이상 높음**

정상적인 현상입니다. MPU6050이 측정하는 것은 칩의 접합부 온도로, 실온보다 10~20°C 높은 것이 일반적이며 참고용으로만 사용하세요. 정확한 실온 측정이 필요하다면 별도의 온도 센서(예: DS18B20)를 연결하세요.

**화면이 깜빡이거나 찢어지는 느낌**

코드에서는 `Arduino_Canvas` 이중 버퍼링을 사용하므로 정상적으로는 찢어지지 않습니다. 그래도 문제가 있다면 SPI 브레드보드 와이어가 느슨하지 않은지 확인하고, 와이어 길이를 20cm 이하로 유지하세요. 필요시 전원 핀 근처에 100nF 디커플링 커패시터를 추가하세요.

---

## FAQ

**Q: MPU6050의 각도 업데이트 주기는 어떻게 되나요?**
A: `MPU6050_light`는 I2C 400kHz 고속 모드로 읽으며, 원시 데이터 샘플링 속도는 최대 1kHz입니다. 본 코드의 프레임 속도는 20fps로 제한되어 실제 갱신 속도는 20Hz입니다. 더 높은 갱신 속도가 필요하면 `frameDelay`를 더 작은 값으로 변경하세요. 40fps 이내가 안정적으로 테스트되었습니다 (SPI 화면 출력 속도의 제한).

**Q: 다른 GPIO 핀을 사용할 수 있나요?**
A: 가능합니다. 코드 상단의 `#define` 매크로를 수정하세요. GC9A01의 SPI 핀은 ESP32-S3 하드웨어 SPI를 사용하는 것을 권장합니다 (GPIO 11 / 12는 SPI2로 성능이 가장 좋음). MPU6050의 I2C 핀은 임의의 GPIO를 사용할 수 있으며, 코드와接线만 일치하면 됩니다.

**Q: GC9A01을 사각형 화면으로 교체할 수 있나요?**
A: 가능합니다. `Arduino_GC9A01`을 해당 드라이버 클래스로 교체하고 (예: ST7789의 경우 `Arduino_ST7789` 사용), `Arduino_Canvas`의 너비/높이와 중심 좌표 `cx/cy`를 수정하면 됩니다. 그리기 로직은 변경할 필요가 없습니다.

**Q: ESP32-S3의 3.3V로 GC9A01과 MPU6050을 동시에 구동할 수 있나요?**
A: 충분합니다. GC9A01 백라이트 전류는 약 20mA, MPU6050의 일반적인 소비 전력은 3.5mW (약 1mA)로, 합쳐도 개발 보드 3.3V 핀의 일반적인 한계인 300~500mA에 비해 훨씬 낮습니다.

**Q: 같은 I2C 버스에 MPU6050 두 개를 연결할 수 있나요?**
A: 가능합니다. 하나의 AD0를 GND에 연결 (주소 0x68), 다른 하나의 AD0를 VCC에 연결 (주소 0x69)하여 동일한 SDA/SCL을 공유합니다. 코드에서 `MPU6050` 객체 두 개를 선언하고 각각 다른 주소로 초기화하면 됩니다.

**Q: 매번 전원을 끄고 켤 때마다 다시 캘리브레이션해야 하나요?**
A: 네, 본 코드는 매 전원 인가 시 `setup()`에서 `mpu.calcOffsets()`을 호출하여 동적 캘리브레이션을 수행합니다. 고정 설치 환경에서 사용한다면 오프셋 값을 EEPROM에 저장하고, 다음 부팅 시 바로 읽어오도록 하여 캘리브레이션 대기 시간을 줄일 수 있습니다.

---

## 확장 아이디어

- 버튼을 추가하여 디스플레이 모드 전환 (수평기 / 실시간 각도 그래프 / 온도계)
- 캘리브레이션 기준값을 EEPROM에 저장하여 고정 설치면의 기울기 보정
- 패시브 부저를 연결하여 수평일 때 알림음 발생
- 다른 원형 다이얼 스킨을 적용하여 자력 나침반이나 G-Force 디스플레이로 활용

---

## 참고 자료

- [MPU-6000 / MPU-6050 제품 사양서 — InvenSense (TDK)](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [GC9A01A 데이터시트 — Galaxycore](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [MPU6050_light GitHub — rfetick](https://github.com/rfetick/MPU6050_light)
- [ESP32-S3 기술 참고 매뉴얼 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3 제품 페이지 — Espressif](https://www.espressif.com/en/products/socs/esp32-s3)
