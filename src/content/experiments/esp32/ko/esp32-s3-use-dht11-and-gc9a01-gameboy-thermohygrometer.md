---
title: "DHT11 + GC9A01 원형 디스플레이로 만드는 Game Boy 픽셀 레트로 온습도계｜ESP32-S3 SPI 배선 + Arduino 전체 코드"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/dht11
category: esp32
date: 2026-06-18
intro: "ESP32-S3로 GC9A01 240×240 원형 디스플레이를 구동하고 DHT11 센서와 조합해, Game Boy DMG의 클래식한 크림색 4단계 그린 팔레트를 재현한 깜빡임 경고 기능이 있는 픽셀 레트로 데스크톱 온습도계를 만들어봅니다. 전체 배선 표, Arduino 라이브러리 설치, 풀 주석 코드를 함께 제공하며 초보자도 쉽게 따라 할 수 있습니다."
image: "https://img.lingflux.com/2026/06/4d154493c9e833bc839cec1050f749f6.jpg"
---

# DHT11 + GC9A01 원형 디스플레이로 만드는 Game Boy 픽셀 레트로 온습도계(전체 튜토리얼)(ESP32-S3 · SPI 배선 · Arduino 코드)

---

## TL;DR · 3분 요약

> 긴 글을 볼 시간이 없나요? 핵심 단계만 정리했으니, 기초가 있으신 분들은 이대로 바로 날아가시면 됩니다.
>
> 1. **배선**: DHT11 데이터 핀 → GPIO 47; GC9A01 원형 디스플레이 SPI 배선: SCK→GPIO12, MOSI→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 2. **두 라이브러리 설치**: Arduino IDE에서 검색해서 `Arduino_GFX_Library`(Moon On Our Nation)와 `DHT sensor library`(Adafruit)를 설치
> 3. **글 하단의 전체 코드를 복사해서 붙여넣고**, Arduino IDE에서 보드로 `ESP32S3 Dev Module` 선택
> 4. **컴파일 후 업로드**, 약 30초간 플래시 완료 대기
> 5. **전원 인가 후 확인**: 원형 디스플레이에 크림색 녹색 바탕이 뜨고, 상단 영역에 온도(°C), 하단 영역에 습도(%)가 표시되며, 극단값일 때 자동으로 깜빡이며 경고 ✅

---

## 서문: 좀 노는 온습도계 하나

솔직히 말씀드리면, 온습도를 표시하는 방법은 꽤 많이 써봤습니다. 큰 OLED 화면, 작은 7세그먼트, 심지어 시리얼 출력까지…… 매번 화면에 덩그러니 놓인 숫자 몇 개를 볼 때마다 왠지 모를 허전함이 들더라고요. 못 쓸 건 아니지만, 그냥 영혼이 좀 없는 거죠.

어느 날 어릴 적 쓰던 Game Boy를 꺼내봤는데, 그 클래식한 크림빛 노란빛 녹색 화면이 문득 영감을 주더라고요. **똑같이 숫자를 표시하는 거라면, 좀 더 레트로하고, 좀 더 재밌게 만들면 안 되나?**

그래서 시작한 프로젝트가 바로 이겁니다. ESP32-S3로 GC9A01 원형 LCD를 구동하고, DHT11 온습도 센서를 얹은 뒤, 픽셀 폰트를 직접 손으로 그려서 Game Boy DMG의 상징적인 4단계 녹색 톤을 원형 디스플레이 위에 옮겨 놓고, 책상 위에 올려두면 자꾸 눈길이 가는 **픽셀 레트로 온습도계**를 만드는 거죠.

기성 UI 라이브러리도 없고, 복잡한 프레임워크도 없이 `fillRect()`로 한 칸 한 칸 픽셀 숫자를 쌓아 올리는 무식한 방법이 오히려 제일 감성 있더라고요.

**이 글의 목표**: 코딩을 처음 접하는 분도 끝까지 따라올 수 있게 정리했고, 마지막엔 GC9A01 원형 디스플레이에 실시간 온습도가 뜨는 걸 볼 수 있고, 그 결과물이 충분히 멋있어야 합니다.

---

## 실험 결과

![](https://img.lingflux.com/2026/06/755f0087c027a35770edb0fd87a81a35.jpg)

최종 결과를 한 줄로 요약하면 이렇습니다: **240×240 원형 디스플레이, 크림색 녹색 바탕, 픽셀 큰 숫자로 온습도 값이 중앙에 표시되고, 값 변화에는 부드러운 보간 트랜지션이 있으며, 임계치를 넘기면 자동으로 깜빡이며 경고, 프레임률은 약 30fps, 찢어짐이나 깜빡임 없음**.

---

## 부품 소개

부품을 사기 전에 오늘의 세 주인공부터 만나보죠.

### ESP32-S3 · 이 프로젝트에서 유일하게 머리가 있는 부분

ESP32-S3는 Espressif에서 만든 Wi-Fi + 블루투스 듀얼모드 칩이지만, 오늘 우리가 쓰는 건 네트워크 능력이 아니라 **넉넉한 GPIO, 충분한 메모리, 그리고 충분히 빠른 SPI 버스**입니다.

> 비유하자면: GC9A01 원형 디스플레이가 TV라면, ESP32-S3는 TV에 프로그램 신호를 밀어 넣는 셋톱박스입니다. 모든 '콘텐츠'는 여기서 시작되고, 화면은 그저 '재생'만 담당하죠.

주요 사양:
- 클럭 240 MHz(듀얼코어 Xtensa LX7)
- 메모리 512 KB SRAM, 추가로 PSRAM 옵션
- 하드웨어 SPI 지원, 최대 80 MHz까지 구동 가능
- 3.3V 동작 전압, GPIO 내압 3.3V(⚠️ 5V 신호 절대 금지)

---

### GC9A01 원형 디스플레이 · 픽셀 레트로 감성의 원천

GC9A01은 해상도 **240×240**의 원형 IPS LCD 구동 칩으로, 보통 지름 약 1.28인치의 작은 원형 디스플레이 모듈 형태로 나오며, 인터페이스는 표준 4선 SPI입니다.

> 비유하자면: 옛날 기계식 손목시계 다이얼을 보신 적 있죠? GC9A01은 그 다이얼을 프로그래밍해서 어떤 콘텐츠든 띄울 수 있는 컬러 작은 화면으로 바꿔버립니다. 원형이라니, 그게 우아한 거죠.

주요 사양:
- 해상도: 240 × 240 픽셀, 원형 시인영역
- 인터페이스: 4선 SPI(최대 80 MHz 클럭 지원)
- 색심도: 16비트 RGB565(65536색)
- 동작 전압: 3.3V(VCC와 논리 레벨 모두 3.3V, **5V 금지!**)
- 백라이트: 독립 핀 제어(BL), High 레벨에서 점등

---

### DHT11 · 참견 많은 작은 이웃

DHT11은 온도 + 습도를 하나로 합친 저비용 디지털 센서로, 데이터선 한 줄만으로 두 값을 모두 가져올 수 있어 사용이 엄청 간편합니다.

> 비유하자면: DHT11은 당신 방에 살면서 "지금 몇 도야, 공기에 물은 어느 정도야"라고 늘 보고하는 작은 이웃 같습니다. 정밀도는 보통이지만 쓸 만하고, 조용하죠.

주요 사양:
- 온도 범위: 0 ~ 50°C, 정밀도 ±2°C
- 습도 범위: 20% ~ 90% RH, 정밀도 ±5% RH
- 샘플링 간격: 최단 1초(코드에서는 2초마다 읽도록 설정)
- 데이터 인터페이스: 단일 버스 디지털 프로토콜(1-Wire 변종)
- 동작 전압: 3.3V 또는 5V 모두 가능(이 프로젝트는 3.3V 연결)

---

## BOM 표(부품 리스트)

| 부품 | 모델 / 사양 | 수량 | 비고 |
| :--- | :--- | :---: | :--- |
| 메인 개발 보드 | ESP32-S3 Dev Module | 1 | 온보드 USB-C 플래시 포트 확인 |
| 원형 컬러 디스플레이 | GC9A01 · 1.28인치 · 240×240 SPI | 1 | 구매 시 BL 핀이 있는 버전으로 선택 |
| 온습도 센서 | DHT11 모듈(풀업 저항 내장 모듈 버전) | 1 | 모듈 버전을 추천, 외부 저항 생략 가능 |
| 점퍼선 | 듀폰선(수-수 / 수-암) | 약간 | 두 종류 모두 준비 권장 |

---

## 배선 방법

### DHT11 → ESP32-S3

| DHT11 핀 | ESP32-S3 핀 | 설명 |
| :--- | :--- | :--- |
| GND | GND | 공통 GND |
| VCC | 3V3 | 센서 전원(3.3V) |
| DAT(DATA) | GPIO 47 | 데이터 버스 |

### GC9A01 원형 디스플레이 → ESP32-S3

| GC9A01 핀 | ESP32-S3 핀 | 설명 |
| :--- | :--- | :--- |
| VCC | 3.3V | 화면 메인 전원(⚠️ 반드시 3.3V, 5V 아님) |
| GND | GND | 공통 GND |
| SCL / CLK | GPIO 12 | SPI 클럭선 |
| SDA / MOSI | GPIO 11 | SPI 데이터선 |
| CS | GPIO 9 | 칩 셀렉트(Low 활성) |
| DC | GPIO 10 | 데이터/명령 전환 |
| RST | GPIO 18 | 하드웨어 리셋 |
| BL | GPIO 7 | 백라이트 제어(이 핀이 없을 수도 있음, 코드에서 High로 항상 점등; 3.3V에 직접 연결해도 됨) |

> 💡 **실용 팁**: 배선을 끝냈다고 바로 전원을 넣지 마세요. 위 표를 한 줄씩 대조하며 확인하고, 특히 VCC가 **3.3V지 5V가 아닌지**(GC9A01을 5V에 연결하면 거의 고장 납니다), 그리고 DHT11의 DAT가 올바른 GPIO에 연결됐는지 점검하세요. 이 함정에 빠져본 사람은 다 압니다. 전원을 넣었는데 화면이 두 번 다시 안 켜지는 그 절망감을요.



---

## 필요 라이브러리 설치

Arduino IDE를 열고 **툴 → 라이브러리 관리**로 들어가서, 다음 두 라이브러리를 검색해 설치합니다.

**1. Arduino_GFX_Library**

- 검색 키워드: `Arduino_GFX`
- 저자: `Moon On Our Nation`
- 역할: GC9A01 원형 디스플레이 구동, 더블 버퍼 Canvas 기능 포함(화면 깜빡임 제거의 핵심)

**2. DHT sensor library**

- 검색 키워드: `DHT sensor library`
- 저자: `Adafruit`
- 설치 시 "의존성을 설치하시겠습니까"라는 창이 뜨면 **Install all** 선택(이웃해서 Adafruit Unified Sensor도 함께 설치)

> 설치가 끝나면 Arduino IDE를 재시작해 라이브러리 파일이 정상적으로 로드됐는지 확인하는 걸 권장합니다.

---

## 전체 코드

코드 구조 설명:
- **초기화 단계**: 백라이트 점등 → 화면 초기화 → DHT11 최초 데이터 읽기
- **메인 루프**: 2초마다 센서 읽기, 33ms마다(약 30fps) 한 프레임 렌더링
- **렌더링 메커니즘**: 먼저 메모리 Canvas에 그린 뒤 한 번에 화면으로 flush, 찢어짐과 깜빡임 제거
- **픽셀 폰트**: 라벨 텍스트용 5×7, 큰 숫자값용 5×9, 전부 수작업 `fillRect()`로 한 칸씩 그림
- **경고 애니메이션**: 온도가 35°C 초과 또는 5°C 미만, 습도가 85% 초과 또는 20% 미만일 때 숫자가 400ms 간격으로 깜빡임

```cpp
/**
 * ╔══════════════════════════════════════════════════╗
 * ║   ESP32-S3 원형 온습도계 · GAME BOY 픽셀 레트로버전   ║
 * ║   하드웨어: ESP32-S3 + GC9A01(240×240) + DHT11     ║
 * ║   라이브러리: Arduino_GFX_Library + DHT(Adafruit)  ║
 * ╚══════════════════════════════════════════════════╝
 *
 * 컬러 팔레트 —— Game Boy DMG 클래식 4단계 그린:
 *   PAL_BG      #CADC9F  크림빛 노란빛 녹색(바탕색, 레트로 감성의 원천)
 *   PAL_LITE    #9BBC0F  가장 밝은 녹색(하이라이트 장식)
 *   PAL_MID     #8BAC0F  밝은 녹색(장식 점)
 *   PAL_DARK    #306230  중간 녹색(라벨 텍스트 / 구분선)
 *   PAL_DARKEST #0F380F  짙은 녹색(메인 숫자 / 외곽선, 최고 대비)
 *
 * 경고 로직(단색기 클래식 기법):
 *   온도 >35°C 또는 <5°C → 숫자가 400ms 간격으로 깜빡임
 *   습도 >85% 또는 <20%  → 동일
 */

#include <Arduino_GFX_Library.h>
#include <DHT.h>

// ══════════════════════════════════════════
// 단계 1: 핀 정의
//   여기 숫자만 바꾸면 핀을 바꿀 수 있고, 다른 곳은 손댈 필요 없음
// ══════════════════════════════════════════
#define DHTPIN    47      // DHT11 데이터 핀
#define DHTTYPE   DHT11

#define TFT_SCK   12     // GC9A01 SPI 클럭
#define TFT_MOSI  11     // GC9A01 SPI 데이터
#define TFT_CS    9      // GC9A01 칩 셀렉트
#define TFT_DC    10     // GC9A01 데이터/명령
#define TFT_RST   18     // GC9A01 하드웨어 리셋
#define TFT_BL    7      // GC9A01 백라이트(HIGH = 점등)

// ══════════════════════════════════════════
// 단계 2: Game Boy (DMG) 4단계 그린 팔레트
//   색상 포맷: RGB565(16비트)
//   여기서 색을 바꾸지 마세요, 바꾸면 Game Boy 스타일이 아니게 됨 :)
// ══════════════════════════════════════════
#define PAL_BG       0xCF69   // 크림빛 노란빛 녹색 —— 바탕색
#define PAL_LITE     0x9DC2   // 가장 밝은 녹색   —— 하이라이트 장식(현재 거의 미사용)
#define PAL_MID      0x8D42   // 밝은 녹색     —— 상단바 깜빡임 점
#define PAL_DARK     0x3306   // 중간 녹색     —— 라벨/구분선
#define PAL_DARKEST  0x11C2   // 짙은 녹색     —— 메인 숫자/외곽선

// ══════════════════════════════════════════
// 단계 3: 화면 상수와 폰트 배율
// ══════════════════════════════════════════
#define CX  120        // 중심 X(화면 정중앙)
#define CY  120        // 중심 Y(화면 정중앙)

#define BOLD_SCALE  6  // 큰 숫자 확대 배수(5×9 자형 × 6 = 30×54 픽셀)
#define DOT_INSET   1  // 각 픽셀 칸마다 1px 안쪽으로 들여서 배경색 틈을 보이게 해 도트 매트릭스 느낌 연출
#define UNIT_SCALE  2  // 단위(°C / %) 글자 크기
#define LBL_SCALE   2  // 라벨(TEMP / HUM) 글자 크기

// ══════════════════════════════════════════
// 단계 4: 하드웨어 객체 초기화
// ══════════════════════════════════════════
DHT dht(DHTPIN, DHTTYPE);

// 하드웨어 SPI 버스
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, GFX_NOT_DEFINED);

// GC9A01 구동(마지막 매개변수 true = 회전 없음, 색상 반전 관련)
Arduino_GFX *display = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas 더블 버퍼: 먼저 메모리에 완전한 프레임을 그리고, flush()로 한 번에 화면에 밀어 넣음
//   이것이 깜빡임 제거의 핵심 수단, 게임 엔진의 오프스크린 렌더링과 유사
Arduino_GFX *gfx = new Arduino_Canvas(240, 240, display);

// ══════════════════════════════════════════
// 전역 상태 변수
// ══════════════════════════════════════════
float g_temp = 0, g_hum = 0;          // 센서 실제 읽은 값
float g_dispTemp = 0, g_dispHum = 0;  // 화면 표시값(부드러운 보간으로 숫자 도약 방지)
bool  g_hasData = false;              // 최소 한 번 이상 유효한 데이터를 받았는지 여부

// ══════════════════════════════════════════
// 함수 프로토타입 선언(컴파일러에게 "아래에 이런 함수들이 있다"고 알림)
// ══════════════════════════════════════════
const uint8_t* glyph(char ch);
int16_t  pixelAdvance(char ch, uint8_t scale);
int16_t  pixelTextWidth(const char *s, uint8_t scale);
void     drawPixelText(const char *s, int16_t x, int16_t y,
                       uint8_t scale, uint16_t c);
void     drawCenteredPixel(const char *s, int16_t y,
                           uint8_t scale, uint16_t c);
const uint8_t* boldGlyph(char ch);
int16_t  boldAdvance(char ch, uint8_t scale);
int16_t  boldTextWidth(const char *s, uint8_t scale);
void     drawBoldText(const char *s, int16_t x, int16_t y,
                      uint8_t scale, uint16_t c);
void     drawBezel();
void     drawTopBar(unsigned long t);
void     drawValue(const char *num, const char *unit,
                   int16_t yTop, uint16_t col);
void     drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c);
uint16_t tempColor(unsigned long t);
uint16_t humColor(unsigned long t);
void     drawScene(unsigned long t);

// ══════════════════════════════════════════
// setup() —— 전원 인가 시 한 번만 실행
// ══════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=============================");
  Serial.println("  GAME BOY 픽셀 온습도계");
  Serial.println("=============================");

  // 1. 백라이트 점등
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 2. 화면 초기화
  if (!gfx->begin()) {
    Serial.println("[ERROR] 화면 초기화 실패! 배선을 확인하고 다시 전원을 넣으세요.");
    while (true) delay(500);   // 여기서 멈춰서 이후 코드가 엉뚱하게 실행되지 않도록 방지
  }
  gfx->fillScreen(PAL_BG);
  gfx->flush();
  Serial.println("[OK] 화면 초기화 완료");

  // 3. DHT11 초기화, 2초 대기 후 센서가 안정되면 최초 값 읽기
  dht.begin();
  Serial.println("[OK] DHT11 초기화 완료, 읽는 중...");
  delay(2000);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    g_temp = g_dispTemp = t;
    g_hum  = g_dispHum  = h;
    g_hasData = true;
    Serial.printf("[DATA] 초기 읽기 T=%.1f°C  H=%.1f%%\n", t, h);
  } else {
    Serial.println("[WARN] 초기 읽기 실패, 화면에 --.- 표시, 다음 유효 읽기 대기");
  }
}

// ══════════════════════════════════════════
// loop() —— 2초마다 센서 읽기, 33ms마다 한 프레임 렌더링(약 30fps)
// ══════════════════════════════════════════
unsigned long lastRead  = 0;
unsigned long lastFrame = 0;

void loop() {
  unsigned long now = millis();

  // 2초마다 센서 읽기(DHT11 샘플링 간격 최단 1초, 2초가 더 안정적)
  if (now - lastRead >= 2000) {
    lastRead = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      g_temp = t;
      g_hum  = h;
      g_hasData = true;
      Serial.printf("[DATA] T=%.1f°C  H=%.1f%%\n", t, h);
    } else {
      // 읽기 실패 시 값 갱신 안 함, 마지막 유효 읽은 값 계속 표시
      Serial.println("[WARN] DHT11 읽기 실패, 이전 값 유지");
    }
  }

  // 표시값은 8% 보간으로 실제값을 추적(매 프레임 천천히 다가감)
  //   비유: 마치 옛날 다이얼 바늘이 새 위치로 순간이동하지 않는 것처럼
  g_dispTemp += (g_temp - g_dispTemp) * 0.08f;
  g_dispHum  += (g_hum  - g_dispHum)  * 0.08f;

  // 약 30fps 렌더링(33ms마다 한 프레임)
  if (now - lastFrame >= 33) {
    lastFrame = now;
    drawScene(now);
    gfx->flush();    // 메모리 Canvas를 실제 화면으로 한 번에 밀어 넣기
  }
}

// ══════════════════════════════════════════
// drawScene() —— 한 프레임의 전체 내용 렌더링
//   그리기 순서: 바탕색 → 원형 외곽선 → 상단바 → 온도 영역 → 구분선 → 습도 영역
// ══════════════════════════════════════════
void drawScene(unsigned long t) {
  // 1. 화면 지우기(크림빛 녹색 바탕)
  gfx->fillScreen(PAL_BG);

  // 2. 원형 외곽선과 장식 점 그리기
  drawBezel();

  // 3. 상단바 그리기(제목 + 실행 표시등)
  drawTopBar(t);

  // 4. 온도 영역
  char num[8];
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispTemp);
  else           strcpy(num, "--.-");       // 데이터 없을 때 플레이스홀더 표시

  drawCenteredPixel("TEMP", 44, LBL_SCALE, PAL_DARK);
  drawValue(num, "*C", 62, tempColor(t));   // '*'는 이 폰트에서 도수 원 기호 °로 매핑

  // 5. 중간 점선 구분
  drawDottedH(80, 160, 118, PAL_DARK);

  // 6. 습도 영역
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispHum);
  else           strcpy(num, "--.-");

  drawCenteredPixel("HUM", 124, LBL_SCALE, PAL_DARK);
  drawValue(num, "%", 142, humColor(t));
}

// ──────────────────────────────────────────
// 원형 외곽선: 짙은 녹색 이중선 + 네 개의 45° 대각 장식 사각형
// ──────────────────────────────────────────
void drawBezel() {
  gfx->drawCircle(CX, CY, 116, PAL_DARKEST);
  gfx->drawCircle(CX, CY, 115, PAL_DARKEST);

  // 네 개의 45° 대각 작은 사각형(cos45° ≈ 0.707)
  const int r = 104, d = (int)(r * 0.707f);
  gfx->fillRect(CX + d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // 우상
  gfx->fillRect(CX - d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // 좌상
  gfx->fillRect(CX + d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // 우하
  gfx->fillRect(CX - d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // 좌하
}

// ──────────────────────────────────────────
// 상단바: 중앙 제목 "DHT11" + 좌측 500ms 깜빡임 표시 점(시스템 실행 중 표시)
// ──────────────────────────────────────────
void drawTopBar(unsigned long t) {
  drawCenteredPixel("DHT11", 12, 1, PAL_DARK);

  // 깜빡임 점(점등/소등 교대): 500ms마다 색상 전환
  bool on = (t / 500) % 2 == 0;
  uint16_t c = on ? PAL_DARKEST : PAL_MID;
  int16_t tw = pixelTextWidth("DHT11", 1);
  int16_t sx = CX - tw / 2;         // 제목 좌단 X 좌표
  gfx->fillRect(sx - 12, 13, 4, 4, c);
}

// ──────────────────────────────────────────
// 숫자 행: 큰 숫자 자체는 수평 중앙 정렬, 단위 °C/%는 우상단 작은 위첨자로
//   이렇게 하면 숫자가 정중앙에 표시되어 단위에 밀려 치우치지 않음
// ──────────────────────────────────────────
void drawValue(const char *num, const char *unit,
               int16_t yTop, uint16_t col) {
  int16_t nw = boldTextWidth(num, BOLD_SCALE);
  int16_t sx = CX - nw / 2;                  // 숫자 중앙 정렬 시작 X

  drawBoldText(num, sx, yTop, BOLD_SCALE, col);
  // 단위는 숫자 우측에 바로 붙이고 위로 2px 올려 위첨자 느낌 연출
  drawPixelText(unit, sx + nw + 3, yTop + 2, UNIT_SCALE, col);
}

// ──────────────────────────────────────────
// 수평 픽셀 점선(2×2 작은 사각형, 5px 간격)
// ──────────────────────────────────────────
void drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c) {
  for (int16_t x = x0; x <= x1; x += 5) {
    gfx->fillRect(x, y, 2, 2, c);
  }
}

// ══════════════════════════════════════════
// 색상 매핑 —— 정상 = 짙은 녹색; 극단 = 400ms 간격으로 "소등 깜빡임" 경고
// ══════════════════════════════════════════
uint16_t tempColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispTemp > 35.0f || g_dispTemp < 5.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;   // 소등 = 배경과 동일 색
  return PAL_DARKEST;
}

uint16_t humColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispHum > 85.0f || g_dispHum < 20.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;
  return PAL_DARKEST;
}

// ══════════════════════════════════════════
// 5×7 픽셀 폰트(라벨/단위용)
//   문자당 7행, 각 행의 하위 5비트 = 열 0~4(bit4 = 가장 왼쪽 열)
//   특수 문자: '*'는 도수 원 기호 °로 매핑, '.'는 기준선 작은 사각형으로 표시
// ══════════════════════════════════════════
const uint8_t EMPTY[7] = {0, 0, 0, 0, 0, 0, 0};

const uint8_t* glyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[7]={0x0E,0x11,0x13,0x15,0x19,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[7]={0x04,0x0C,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[7]={0x0E,0x11,0x01,0x02,0x04,0x08,0x1F}; return g; }
    case '3': { static const uint8_t g[7]={0x1F,0x02,0x04,0x02,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[7]={0x02,0x06,0x0A,0x12,0x1F,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[7]={0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E}; return g; }
    case '6': { static const uint8_t g[7]={0x06,0x08,0x10,0x1E,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[7]={0x1F,0x01,0x02,0x04,0x08,0x08,0x08}; return g; }
    case '8': { static const uint8_t g[7]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[7]={0x0E,0x11,0x11,0x1F,0x01,0x02,0x0C}; return g; }
    case '-': { static const uint8_t g[7]={0x00,0x00,0x00,0x0E,0x00,0x00,0x00}; return g; }
    case '%': { static const uint8_t g[7]={0x18,0x18,0x08,0x04,0x02,0x03,0x03}; return g; }
    case '*': { static const uint8_t g[7]={0x00,0x0E,0x11,0x0E,0x00,0x00,0x00}; return g; } // ° 도수 원 기호
    case 'C': { static const uint8_t g[7]={0x0E,0x11,0x10,0x10,0x10,0x11,0x0E}; return g; }
    case 'D': { static const uint8_t g[7]={0x1E,0x11,0x11,0x11,0x11,0x11,0x1E}; return g; }
    case 'E': { static const uint8_t g[7]={0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F}; return g; }
    case 'H': { static const uint8_t g[7]={0x11,0x11,0x11,0x1F,0x11,0x11,0x11}; return g; }
    case 'I': { static const uint8_t g[7]={0x0E,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case 'M': { static const uint8_t g[7]={0x11,0x1B,0x15,0x15,0x11,0x11,0x11}; return g; }
    case 'N': { static const uint8_t g[7]={0x11,0x19,0x15,0x13,0x11,0x11,0x11}; return g; }
    case 'O': { static const uint8_t g[7]={0x0E,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case 'P': { static const uint8_t g[7]={0x1E,0x11,0x11,0x1E,0x10,0x10,0x10}; return g; }
    case 'T': { static const uint8_t g[7]={0x1F,0x04,0x04,0x04,0x04,0x04,0x04}; return g; }
    case 'U': { static const uint8_t g[7]={0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    default:  return EMPTY;
  }
}

// 단일 문자 전진량(픽셀 너비 + 우측 간격)
int16_t pixelAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale + (scale >> 1) + gap;   // 소수점은 좁게
  return 5 * scale + gap;
}

// 텍스트의 총 픽셀 너비 계산
int16_t pixelTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += pixelAdvance(*s, scale);
  return w;
}

// 5×7 도트 매트릭스 텍스트를 한 칸씩 그리기
void drawPixelText(const char *s, int16_t x, int16_t y,
                   uint8_t scale, uint16_t c) {
  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      gfx->fillRect(x, y + 5 * scale, scale, scale, c);   // 소수점은 기준선에
      x += 2 * scale + (scale >> 1) + scale;
      continue;
    }
    const uint8_t *g = glyph(ch);
    for (uint8_t r = 0; r < 7; ++r) {
      uint8_t bits = g[r];
      for (uint8_t col = 0; col < 5; ++col) {
        if (bits & (0x10 >> col)) {
          gfx->fillRect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    x += 5 * scale + scale;
  }
}

// 수평 중앙 정렬로 5×7 텍스트 그리기
void drawCenteredPixel(const char *s, int16_t y, uint8_t scale, uint16_t c) {
  int16_t w = pixelTextWidth(s, scale);
  drawPixelText(s, CX - w / 2, y, scale, c);
}

// ══════════════════════════════════════════
// 5×9 도트 매트릭스 큰 숫자 폰트(온습도 메인 숫자 전용)
//
//   디자인 특징:
//   · 각 칸마다 DOT_INSET px 안쪽으로 들여서 배경색 틈을 보여 LCD 도트 매트릭스 느낌 연출
//   · '2'는 상단 모서리 + 대각선 계단 + 실선 이중행 하단
//   · '5'는 상하가 모두 온전한 실선 행
//   · '.'는 자형 테이블을 거치지 않고 drawBoldText가 기준선 단일 칸으로 직접 그림
// ══════════════════════════════════════════
const uint8_t* boldGlyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[9]={0x0C,0x04,0x04,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[9]={0x0E,0x11,0x01,0x02,0x04,0x08,0x10,0x1F,0x1F}; return g; }
    case '3': { static const uint8_t g[9]={0x0E,0x11,0x01,0x01,0x06,0x01,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[9]={0x02,0x06,0x0A,0x12,0x12,0x1F,0x02,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[9]={0x1F,0x10,0x10,0x1E,0x01,0x01,0x01,0x11,0x1F}; return g; }
    case '6': { static const uint8_t g[9]={0x0E,0x11,0x10,0x10,0x1E,0x11,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[9]={0x1F,0x01,0x02,0x02,0x04,0x04,0x08,0x08,0x10}; return g; }
    case '8': { static const uint8_t g[9]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x0F,0x01,0x01,0x11,0x0E}; return g; }
    case '-': { static const uint8_t g[9]={0x00,0x00,0x00,0x00,0x1F,0x00,0x00,0x00,0x00}; return g; }
    default:  return nullptr;
  }
}

// 큰 숫자 단일 문자 전진량
int16_t boldAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale;    // 소수점 = 1칸 너비 + 1칸 간격
  return 5 * scale + gap;
}

// 큰 숫자 텍스트 총 너비 계산
int16_t boldTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += boldAdvance(*s, scale);
  return w;
}

// 5×9 도트 매트릭스 큰 숫자 한 칸씩 그리기(각 칸마다 DOT_INSET 안쪽으로 들여서 틈에 배경색 보이기)
void drawBoldText(const char *s, int16_t x, int16_t y,
                  uint8_t scale, uint16_t c) {
  int8_t dot = scale - 2 * DOT_INSET;      // 점등 사각형 실제 변 길이(들여쓰기 후)
  if (dot < 1) dot = 1;                    // 최소 1px, 사라지지 않도록

  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      // 소수점: 7번째 행(기준선)에 단일 들여쓰기 사각형 그리기
      gfx->fillRect(x + DOT_INSET, y + 7 * scale + DOT_INSET, dot, dot, c);
      x += 2 * scale;
      continue;
    }
    const uint8_t *g = boldGlyph(ch);
    if (g) {
      for (uint8_t r = 0; r < 9; ++r) {
        uint8_t bits = g[r];
        for (uint8_t col = 0; col < 5; ++col) {
          if (bits & (0x10 >> col)) {
            gfx->fillRect(
              x + col * scale + DOT_INSET,
              y + r   * scale + DOT_INSET,
              dot, dot, c);
          }
        }
      }
    }
    x += 5 * scale + scale;
  }
}
```

---

## 자주 발생하는 문제 해결

겁먹지 마세요. 90%의 문제는 다음 몇 곳에서 발생합니다. 하나씩 점검하면 대부분 해결됩니다.

**전원 인가 후 화면이 전혀 안 켜짐(백라이트도 안 켜짐)**

BL 핀이 제대로 안 연결됐거나, 코드에서 `digitalWrite(TFT_BL, HIGH)` 줄이 적용되지 않았을 확률이 높습니다. 먼저 GPIO7에서 BL로 가는 선을 점검하고, BL을 3.3V에 직접 연결해(코드 제어 우회) 보세요. 백라이트는 켜지는데 화면이 완전히 검다면 다음 항목으로.

**백라이트는 켜지는데 화면이 완전히 검거나, 노이즈(눈송이)가 보임**

SPI 배선에 문제가 있습니다. SCK(GPIO12), MOSI(GPIO11), CS(GPIO9), DC(GPIO10) 네 가닥을 중점적으로 확인하세요. 그중 DC와 CS는 아주 쉽게 반대로 꽂힙니다. 이 두 가닥만 틀려도 화면이 검게 되거나 완전히 깨져 보입니다. 또한 GC9A01 구동의 마지막 매개변수 `true/false`는 색상 반전을 제어합니다. 색이 네거티브 필름처럼 보인다면 `true`를 `false`로(혹은 그 반대로) 바꿔보세요.

**화면 색이 전체적으로 어긋나고 크림빛 녹색이 아님**

RGB565의 바이트 순서 문제입니다. Arduino_GFX_Library가 대부분 알아서 처리하지만, 색이 완전히 틀리다면 `Arduino_GC9A01`을 생성할 때 마지막 매개변수 `true`를 `false`로 바꿔보세요.

**시리얼에 계속 `[WARN] DHT11 읽기 실패`가 출력됨**

- DAT 핀이 GPIO47에 제대로 연결됐는지 확인
- 모듈 버전이 아닌 낱알 DHT11을 쓴다면, DAT와 VCC 사이에 10kΩ 풀업 저항이 필요합니다. 모듈 버전은 보통 이미 납땜되어 있습니다
- `dht.begin()` 뒤의 `delay(2000)`는 지우면 안 됩니다. DHT11은 전원 인가 후 약 1초 안정화 시간이 필요하며, 너무 성급하면 NaN이 읽힙니다
- VCC가 3.3V(이 프로젝트)인지 확인. 손에 든 DHT11이 5V만 지원한다면 VCC를 5V로 바꾸고, DAT와 GPIO47 사이에 저항을 직렬로 넣어 레벨 변환을 하세요(또는 DHT11 모듈 버전으로 교체, 보통 3.3V에서 동작)

**숫자는 갱신되는데 화면에 뚜렷한 깜빡임/찢어짐이 있음**

Canvas 더블 버퍼가 정상 동작하나요? 코드에서 `gfx->flush()`가 빠지진 않았는지 점검하고, **반드시 `display->`가 아니라 Canvas 객체 `gfx->`로 그려야 합니다**. 또한 ESP32-S3 보드 모델(`ESP32S3 Dev Module`)을 올바르게 선택해야 SPI 속도가 정확해집니다.

**컴파일 오류: `'drawScene' was not declared in this scope`**

함수 선언 순서 문제입니다. 코드 상단의 함수 프로토타입 목록에 `void drawScene(unsigned long t);`가 포함돼 있는지 확인하거나, `drawScene` 함수 정의를 `loop()` 앞으로 옮기세요.

---

## FAQ

**Q: GPIO 핀을 다른 번호로 바꿔도 되나요?**
A: 네, 코드 상단의 `#define` 정의만 수정하면 되고 다른 곳은 손댈 필요 없습니다. DHT11의 DAT는 아무 GPIO에나 연결해도 됩니다. GC9A01의 SCK/MOSI는 최고 속도를 위해 ESP32-S3의 하드웨어 SPI 기본 핀(GPIO 11/12) 사용을 권장하며, 다른 핀도 가능하지만 추가로 소프트웨어 SPI 설정이 필요합니다.

**Q: DHT11을 DHT22로 바꿀 수 있나요?**
A: 완전히 가능합니다. 코드 16번째 줄을 `#define DHTTYPE DHT22`로만 바꾸면 나머지 코드는 그대로입니다. DHT22가 정밀도가 더 높습니다(온도 ±0.5°C, 습도 ±2~5% RH), 샘플링 간격 최단 2초(코드에서 이미 2초로 설정되어 호환됩니다).

**Q: GC9A01의 SPI 클럭은 최대 얼마까지 지원하나요?**
A: GC9A01 공식 사양은 최대 100 MHz SPI 클럭을 지원합니다. 실사용 시 ESP32-S3에서 80 MHz로 구동하면 보통 문제가 없습니다. Arduino_GFX_Library가 기본적으로 하드웨어 SPI 최고 속도를 사용하므로 수동 설정은 불필요합니다.

**Q: ESP32-S3의 GPIO 전압은 얼마인가요? 5V 기기를 직접 연결해도 되나요?**
A: ESP32-S3의 GPIO 동작 전압은 3.3V이며 **5V 신호를 견디지 못합니다**. 5V 논리 기기를 직접 연결하면 칩이 손상될 수 있습니다. GC9A01 원형 디스플레이 역시 3.3V 기기입니다. DHT11을 5V로 구동한다면 DAT 핀의 High 레벨은 약 4.5V이므로, 분압 저항(10kΩ + 20kΩ)이나 레벨 변환 모듈로 강하 처리를 권장합니다.

**Q: 코드의 프레임률과 CPU 점유율은 대략 어느 정도인가요?**
A: 현재 코드는 약 30fps(프레임 간격 33ms), 프레임당 렌더링 시간 약 8~15ms(SPI 속도에 따라), CPU 점유율 약 20~40%입니다. 듀얼코어 ESP32-S3의 다른 코어는 완전히 비어 있어, 필요하다면 센서 읽기를 Core 0으로, 렌더링을 Core 1로 분산해 유창함을 더 높일 수 있습니다.

**Q: 온습도 값이 계속 `--.-`으로만 표시되고 갱신되지 않으면 어떡하죠?**
A: `g_hasData`가 계속 `false`라는 뜻, 즉 DHT11이 한 번도 유효한 읽기를 반환하지 않은 것입니다. 순서대로 점검: ① DAT가 GPIO47에 연결됐는지 확인; ② 모듈 버전 DHT11은 추가 풀업 저항 불필요, 낱알 버전은 10kΩ 필요; ③ 시리얼 모니터(115200 보율)로 `[DATA]`나 `[WARN]` 출력이 있는지 확인해 센서 문제인지 배선 문제인지 판별; ④ VCC 전압 확인(3.3V 권장).

**Q: 코드의 `true` 매개변수(GC9A01 생성자)는 무슨 의미인가요?**
A: `new Arduino_GC9A01(bus, TFT_RST, 0, true)`의 네 번째 매개변수는 색상 반전을 제어합니다(IPS 패널과 TN 패널의 RGB 출력 차이). `true`일 때 색이 정상 출력되고 `false`일 때 '네거티브 필름 효과' 같은 색상 반전이 나타납니다. 화면 색이 반대로 보인다면 `true`를 `false`로 바꾸면 됩니다.

---

## 참고 자료

- [Arduino_GFX_Library 공식 문서와 예제](https://github.com/moononournation/Arduino_GFX)
- [Adafruit DHT sensor library 문서](https://github.com/adafruit/DHT-sensor-library)
- [GC9A01 데이터시트(공식 PDF)](https://www.waveshare.com/w/upload/5/5e/GC9A01A.pdf)
- [DHT11 공식 사양서(Aosong 제조사)](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf)
- [Espressif ESP32-S3 기술 참조 매뉴얼](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_cn.pdf)
