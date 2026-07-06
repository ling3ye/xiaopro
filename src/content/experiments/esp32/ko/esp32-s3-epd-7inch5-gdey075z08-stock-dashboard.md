---
title: "ESP32-S3 + 7.5인치 3색 전자종이 텐센트(00700) 주가 보드: 홍콩 장 마감 시 자동 절전 (GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-7inch5-gdey075z08
category: esp32
date: 2026-07-06
intro: "ESP32-S3 + GxEPD2로 7.5인치 3색 전자종이(GDEY075Z08)를 구동해, 텐센트 재정 API를 호출해서 텐센트 지주(00700) 주가 보드를 실시간으로 띄워요. 홍콩 증시 휴장 시에는 자동으로 새로고침 주기를 늘려 절전해요. 완전한 배선, BOD 저전압 트러블슈팅, 직접 만든 중국어 비트맵 폰트, Arduino C++ 코드까지 함께 담았어요."
image: "https://img.lingflux.com/2026/07/683e33cff80c152435263c8e4e6c546d.jpg"
---

> **한 줄 요약**: ESP32-S3과 7.5인치 3색 전자종이(GDEY075Z08)로 '장 마감 자동 슬립'되는 텐센트 지주 주가 보드를 만들어요. 홍콩 증시는 빨강=상승, 검정=하락이라 한눈에 오늘 웃을지 울지 알 수 있죠.

난이도: ⭐⭐⭐☆☆ (회로 기초가 조금 필요하지만, Arduino에 업로드할 줄 알면 따라 할 수 있어요)
예상 소요 시간: 1~2시간 (전자종이가 새로고침하는 걸 멍하니 기다리는 시간은 제외)
테스트 환경:
Arduino IDE 2.3.8 +
ESP32 Arduino Core 3.3.10 ＋
GxEPD2 v1.6.9 +
Adafruit GFX Library v1.12.6
(라이브러리 설치 시 이 버전을 기준으로 맞추시는 걸 추천해요. 너무 최신이거나 오래된 버전은 문제가 생길 수 있어요.)

> 이번 데모는 텐센트 재정의 무료 API를 사용하기 때문에, 텐센트 지주의 주가를 데모로 사용했을 뿐 다른 의도는 없습니다. 본문은 어떠한 투자 권유도 하지 않으며, 투자에는 위험이 따르니 신중하게 판단해 주세요.

> **TL;DR (빠른 시작):**
>
> 1. 배선: EPD의 SDI→GPIO11, SCL→GPIO12, CS→GPIO10, DC→GPIO9, RES→GPIO8, BUSY→GPIO7, VCC는 3.3V, GND는 공통 GND
> 2. 라이브러리 설치: GxEPD2, Adafruit GFX Library (WiFi와 HTTPClient는 ESP32에 내장되어 있어 따로 설치할 필요 없어요)
> 3. 코드의 `ssid`와 `password`를 본인의 WiFi로 수정
> 4. 업로드하고 첫 가격이 화면에 뜰 때까지 기다리면 완료

---

## 서두

저한테 좀 멍청한 습관이 하나 있어요. 매일 할 일 없으면 폰을 꺼내 관심 종목을 싹 둘러보는데, 다 보고 나면 아무것도 안 변했고 정신력만 소모되는 거예요. 그러다 생각해 보니, 폰 App이 제 도파민을 계속 괴롭히게 두는 것보다 '전용 대시보드'를 하나 만드는 게 낫겠다 싶었어요. 딱 한 가지 일만 하죠. 조용히 책상 위에 주가를 못 박아두는 거예요. 팝업도 없고, 푸시도 없고, 흘긋 보기만 하면 오늘 기분이 좋을지 울어야 할지 바로 알 수 있죠.

이 튜토리얼은 제가 ESP32 한 장과 7.5인치 전자종이를 가지고, 자동 새로고침되는 텐센트 지주(00700) 주가 보드를 어떻게 만들었는지 정리한 거예요. '중국어 폰트가 자꾸 모자라'와 '장 마감 후에도 의미 없이 화면 갱신하지 마'라는 두 가지 큰 문제도 함께 풀었어요. 다 읽고 나면 똑같이 복사해서 만들 수도 있고, 본인이 관심 있는 어떤 종목으로든 바꿀 수도 있어요.

> 이번 데모는 텐센트 재정의 무료 API를 사용하기 때문에, 텐센트 지주의 주가를 데모로 사용했을 뿐 다른 의도는 없습니다. 본문은 어떠한 투자 권유도 하지 않으며, 투자에는 위험이 따르니 신중하게 판단해 주세요.

## 완성된 모습

최종 결과물은 이래요. 책상 위에 검/흰/빨 3색 전자종이가 가격, 등락률, 당일 최고/최저가, 거래대금을 조용히 띄워줘요. 홍콩 증시는 빨강=상승, 검정=하락이라 한눈에 기분을 읽을 수 있죠. 장 마감, 점심시간, 주말에는 자동으로 '죽은 척'하며 새로고침을 줄이고, 개장하면 다시 원래 주기로 돌아와요. 한밤중에 몰래 화면 갱신하다 깜짝 놀라는 일도 없죠.

> 이번 데모는 텐센트 재정의 무료 API를 사용하기 때문에, 텐센트 지주의 주가를 데모로 사용했을 뿐 다른 의도는 없습니다. 본문은 어떠한 투자 권유도 하지 않으며, 투자에는 위험이 따르니 신중하게 판단해 주세요.
>
> 중요한 일은 세 번 말해야 합니다!!!

## 부품 설명

**7.5인치 3색 전자종이**: 마트에서 보는 전자 가격표를 키운 버전이라고 생각하면 돼요. 한 번 전기를 흘려 화면을 종이 같은 매질에 '고정'시키면, 그 뒤로는 전원을 꺼도 화면이 사라지지 않고, 다음에 갱신할 때만 전기를 써요. 3색 버전은 일반적인 흑백 버전에 빨간색이 하나 더 있는데, 마침 '상승'을 표현하기 딱 좋아서 주식 용도에 찰떡이에요. 이 프로젝트에서 쓴 모델은 `GDEY075Z08`, 해상도 800×480이에요. 해상도가 넉넉해서 가격, 등락, 네 가지 데이터를 한 화면에 다 담을 수 있어 골라봤어요. 화면을 넘기며 볼 필요 없이요.

**전자종이 구동 보드**: 시중에서 파는 제품과 핀 정의가 같아요. 이건 제가 직접 표면실장(SMD)으로 손땐 건데, 설계가 아직 완전하진 않아요. 7.5인치 패널은 완벽하게 표시되지만, 4.2인치, 1.54인치 전자종이는 아직 약간 문제가 있어서 나중에 개선할 예정이에요. 회로도는 이걸 공유해요:

![](https://img.lingflux.com/2026/07/7466106c7707c8ef928c57a102df38cb.png)

**ESP32 개발 보드**: 네트워크에 연결해 데이터를 가져오고, 새로고침 시점을 계산하고, 화면을 구동하는, 프로젝트 전체의 뇌예요. 구체적인 모델은 손에 있는 보드 아무 거나 상관없어요. GPIO만 충분하면 돼요. (본문 예시의 핀 번호는 일반적인 ESP32-S3 시리즈 개발 보드 기준이에요. 구형 ESP32를 쓴다면 핀 번호를 본인 보드에서 실제로 쓸 수 있는 핀으로 바꾸시면 돼요.)

## BOM 표

| 부품 | 모델/사양 | 수량 |
| --- | --- | --- |
| ESP32 개발 보드 | ESP32-S3 또는 SPI 핀이 있는 다른 ESP32 시리즈 | 1 |
| 전자종이 구동 보드 | 직접 만들었지만 핀 배열은 시중의 대부분 전자종이 구동 보드와 같아요. | 1 |
| 7.5인치 전자종이 | GDEY075Z08, 7.5인치, 800×480, 검/흰/빨 3색 | 1 |
| 점퍼 와이어 | 수-암 | 약간 |

## 7.5인치 전자종이 구동 보드 핀 설명

직접 회로도를 그리고 PCB 한 장을 떠서 손으로 실장했어요. 사용한 핀은 시중의 대부분 전자종이 구동 보드와 같아요.

| 핀 | 풀네임 | 역할 |
| --- | --- | --- |
| **VCC** | 전원 양극 (Voltage Common Collector) | 전원 입력 핀. ESP32-S3의 **3V3**(3.3V) 출력에 연결해요. |
| **GND** | 그라운드 (Ground) | 전원 기준 접지. ESP32-S3의 **GND**에 연결해 전류 루프를 만들어요. |
| **SDI/MOSI** | 마스터 출력 슬레이브 입력 | SPI 데이터 선. ESP32가 화면으로 데이터를 보내요. |
| **SCL/SCK** | 직렬 클럭 | SPI 클럭 선. 데이터 전송 타이밍을 맞춰요. |
| **CS** | 칩 셀렉트 | 화면에 '지금부터 오는 데이터는 너한테 보내는 거야'라고 알려요. |
| **DC** | 데이터/명령 전환 | 지금 보내는 게 화면 데이터인지 제어 명령인지 구분해요. |
| **RES/RST** | 리셋 | 잠깐 로우로 당겨서 화면을 다시 초기화해요. |
| **BUSY** | 사용 중 표시 | 화면이 갱신 중일 때 로우로 떨어져요. ESP32는 이걸 보고 '다음 명령을 보내도 되나' 판단해요. |

## 배선 방법

| 전자종이 핀 | ESP32 핀 연결 |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

배선을 다 한 뒤에는 전원을 넣기 전에 한 개씩 다시 확인하는 걸 추천해요. 특히 BUSY 선을 잘못 연결하거나 땜이 불량하면 안 되는데, 이것만 제대로 해도 트러블슈팅 시간의 80%를 아낄 수 있어요. 코드에 부팅 진단 루틴을 넣은 것도 바로 이 함정을 막으려는 거예요. 뒤에 코드 설명에서 다시 다룰게요.

## 전원 안정성: ESP32 저전압 리셋 해결하기 (BOD 에러)

이번에는 제가 직접 DIY한 개발 보드를 써서 전원부가 충분히 다듬어지지 않았을 수 있어요. 테스트 중에 `E BOD: Brownout detector was triggered`라는 에러를 만났는데, 뜻은 **ESP32의 저전압 검출기가 작동했다**는 거예요. 보드가 전압이 안전 임계값 아래로 떨어졌다고 감지하면 스스로 보호하기 위해 자동으로 재부팅해요.

### BOD가 왜 작동하나요?

ESP32가 WiFi를 켤 때 무선 모듈이 순간적으로 **수백 밀리암페어 급의 큰 전류**를 끌어와요. 전원 선이 너무 가늘거나, 점퍼 와이어의 접촉 저항이 크거나, USB 전원 공급 능력이 부족하면 전압이 순간 떨어져서 ESP32가 자동으로 재부팅돼요. 전자종이를 갱신할 때도 전력을 많이 쓰기 때문에 WiFi와 전기를 다투면 전압이 무너지기 더 쉬워요.

회로에 **전해 콘덴서**(에너지 저장) 하나와 **세라믹 콘덴서**(노이즈 필터) 하나를 병렬로 넣는 게 이 문제의 정석 대처예요. 아래 조합을 쓴 뒤로 테스트가 훨씬 안정적이었고, 더는 BOD를 만나지 않았어요.

### 1. 콘덴서 추천

두 콘덴서를 병렬로 같이 쓰는 걸 추천해요. 콤보 효과가 가장 좋아요:

* **전해 콘덴서 (큰 저수지):** `470μF` 또는 `1000μF` (내전압은 `6.3V`, `10V`, `16V` 중 아무거나 상관없어요). WiFi 켤 때의 순간 대전류를 감당해요.
* **적층 세라믹 콘덴서 (작은 필터망):** `0.1μF` (표기 `104`). 고주파 노이즈를 걸러줘요.

### 2. 구체적인 연결 위치

**가장 중요한 원칙: 콘덴서는 ESP32 개발 보드의 핀에 최대한 가깝게 둬야 해요.** 점퍼 와이어를 쓰는 경우라면 브레드보드에 콘덴서를 바로 꽂거나, ESP32 가까이의 전원 선에 직접 납땜/꼬아 연결해도 돼요.

#### 배선 기호 다이어그램

```text
    [ 외부 전원 / USB ]
          │   │
          ▼   ▼
       ┌─────────┐
       │  5V/3V3 │──────┬───────────────┬──────► [ ESP32의 VCC/3V3 핀 ]
       │         │      │               │
       │         │    + │ 극성           │
       │         │   ┌──┴──┐         ┌──┴──┐
       │         │   │     │         │     │
       │         │   │470uF│         │0.1uF│
       │         │   │     │         │     │
       │         │   └──┬──┘         └──┬──┘
       │         │      │ - 마이너스     │
       │   GND   │──────┴───────────────┴──────► [ ESP32의 GND 핀 ]
       └─────────┘
```

#### 핀 연결 관계

* **전해 콘덴서의 플러스 (+, 긴 다리)** ───► ESP32의 **`3V3`**에 연결 (`5V/VIN`도 가능해요. 어떤 핀으로 보드에 전원을 넣는지에 따라 다름)
* **전해 콘덴서의 마이너스 (-, 짧은 다리, 몸체에 회색 줄이 있는 쪽)** ───► ESP32의 **`GND`**에 연결
* **0.1μF 세라믹 콘덴서 (극성 없음)** ───► 양끝을 같은 방식으로 **`3V3`**과 **`GND`** 사이에 병렬로 연결.

> ⚠️ 전해 콘덴서는 극성이 있어요. 반대로 꽂으면 열이 나거나 터질 수도 있어요. 연결하기 전에 '긴 다리가 +, 회색 줄이 있는 쪽이 -'인지 꼭 확인하세요.

### 3. 추가 트러블슈팅 (콘덴서를 넣었는데도 재부팅된다면)

1. **질 좋은 USB 케이블로 교체:** 싼 점퍼 와이어나 가는 USB 케이블은 내부 저항이 커요. 조금 굵은 폰 충전 케이블로 바꾸면 효과가 좋아요.
2. **전원 포트 바꾸기:** 컴퓨터 전면 USB 포트(전원이 약해요)는 피하세요. 메인보드 뒷면 USB 포트나 5V/2A 폰 충전기를 직접 쓰는 게 좋아요.
3. **코드에서 피크 시간 피하기:** 코드에서 전자종이 갱신(이것도 전력 많이 씀)과 `WiFi.begin()`이 **동시에 일어나지 않게** 주의해요. WiFi에 연결해 데이터를 가져오고, WiFi를 끄거나 슬립시킨 뒤에 전자종이를 갱신하세요. 본문 코드에는 추가로 `WiFi.setTxPower(WIFI_POWER_17dBm)`로 송신 전력을 낮춰 소프트웨어적으로 이중 안전장치를 넣었어요.

## 설치해야 할 라이브러리

Arduino IDE의 라이브러리 매니저에서 검색해서 설치하세요:

- `GxEPD2` (작성자 ZinggJM) — 테스트 통과 버전 v1.6.9
- `Adafruit GFX Library` — 테스트 통과 버전 v1.12.6

`WiFi.h`와 `HTTPClient.h`는 ESP32 Arduino Core에 내장되어 있어 따로 설치할 필요 없어요. 다만 보드 매니저의 ESP32 코어 버전이 3.0.x 시리즈인지 확인하세요. 너무 오래된 코어는 일부 API가 빠져 있을 수 있어요.

## 전체 코드 + 설명

```cpp
// ============================================================
//  ESP32 + 电子墨水屏「腾讯控股」股票看板
//  - 每隔几分钟抓一次腾讯财经接口，把股价刷到 7.5 寸三色墨水屏上
//  - 港股收盘 / 周末会自动拉长等待，到下一个交易日再恢复刷新
//  - 演示版：用 delay() 等待、WiFi 常驻，不使用深度睡眠（适合 USB 供电）
// ============================================================
#include <GxEPD2_3C.h>
#include <Adafruit_GFX.h>
#include <SPI.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ==================== 配置区域 ====================
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// 腾讯财经接口（这里以腾讯控股 hk00700 为例，换股票改这个地址即可）
const String api_url = "http://qt.gtimg.cn/q=hk00700";
// ==================================================

// 1. 墨水屏与 ESP32 的接线引脚（按你的实际接线改这里的数字）
#define EPD_MOSI 11  // SDI / MOSI
#define EPD_CLK  12  // SCL / SCK
#define EPD_CS   10  // CS
#define EPD_DC   9   // DC
#define EPD_RST  8   // RES / RESET
#define EPD_BUSY 7   // BUSY

// 2. 构造驱动实例 (GDEY075Z08 800x480)
GxEPD2_3C<GxEPD2_750c_GDEY075Z08, GxEPD2_750c_GDEY075Z08::HEIGHT / 2> display(GxEPD2_750c_GDEY075Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// 股票数据结构体
struct StockData {
  String name;       // 股票名称
  String code;       // 股票代码
  String price;      // 当前价格
  String change;     // 涨跌额
  String changePct;  // 涨跌幅 (%)
  String high;       // 今日最高
  String low;        // 今日最低
  String volume;     // 成交额 (亿)
  String yestClose;  // 昨收
  String time;       // 更新时间
  bool isUp;         // 是否上涨
};

StockData stock;

float  lastPriceF    = -1.0f;
String lastStockTime = "";

// ==================== 本地中文字库（自动生成，无需修改） ====================
struct ZhGlyph { uint16_t cp; const uint8_t* bmp; };

const uint8_t ZH24_W = 24;
const uint8_t ZH24_H = 24;
const uint8_t zh24_817E[72] PROGMEM = {0,0,0,0,192,0,248,201,24,248,217,12,152,217,4,152,253,31,152,65,0,152,65,0,248,255,63,152,49,6,152,17,12,152,249,63,152,15,50,248,7,34,136,49,2,136,17,3,140,241,31,140,1,24,140,254,27,230,0,24,100,0,30,0,0,14,0,0,0,0,0,0};
const uint8_t zh24_8BAF[72] PROGMEM = {0,0,0,16,0,0,24,255,7,56,255,7,48,24,6,0,24,6,0,24,6,62,24,6,62,24,6,48,24,6,48,255,6,48,255,6,48,24,6,48,24,6,48,24,6,48,24,6,176,24,6,240,25,108,240,24,108,120,24,124,56,24,56,16,24,0,0,0,0,0,0,0};
const uint8_t zh24_63A7[72] PROGMEM = {0,0,0,112,192,0,48,192,1,32,254,63,32,254,63,252,7,48,252,103,54,32,48,2,32,48,6,32,24,62,224,13,62,224,1,0,120,0,0,60,252,31,44,252,31,32,128,0,32,128,0,32,128,0,32,128,0,48,255,127,60,255,127,56,0,0,24,0,0,0,0,0};
const uint8_t zh24_80A1[72] PROGMEM = {0,0,0,248,227,15,248,227,15,24,99,12,24,99,12,24,35,12,248,51,12,248,59,124,24,3,0,24,3,0,24,251,31,24,251,31,248,51,12,248,35,12,24,99,4,12,99,6,12,195,3,12,131,3,12,195,7,206,115,126,198,61,56,4,8,32,0,0,0,0,0,0};
const ZhGlyph ZH_GLYPHS_24[] PROGMEM = {
  {0x817E, zh24_817E}, {0x8BAF, zh24_8BAF}, {0x63A7, zh24_63A7}, {0x80A1, zh24_80A1},
};
const uint8_t ZH24_COUNT = 4;

const uint8_t ZH16_W = 16;
const uint8_t ZH16_H = 16;
const uint8_t zh16_4ECA[32] PROGMEM = {128,1,128,1,64,2,96,6,48,28,152,121,142,97,0,0,248,31,0,12,0,12,0,6,0,7,0,3,0,1,0,0};
const uint8_t zh16_65E5[32] PROGMEM = {0,0,248,31,24,24,24,24,24,24,24,24,24,24,248,31,24,24,24,24,24,24,24,24,248,31,24,24,0,0,0,0};
const uint8_t zh16_6700[32] PROGMEM = {0,0,248,31,24,16,248,31,248,31,0,0,254,127,136,0,248,63,136,50,248,18,136,28,252,12,132,126,128,35,0,0};
const uint8_t zh16_9AD8[32] PROGMEM = {128,1,128,1,254,127,0,0,240,15,16,8,240,15,0,0,252,63,4,32,228,39,36,36,228,39,4,48,4,24,0,0};
const uint8_t zh16_4F4E[32] PROGMEM = {16,0,24,60,200,15,200,4,204,4,204,4,206,127,202,12,200,8,200,11,200,9,72,16,8,112,232,111,8,0,0,0};
const uint8_t zh16_6628[32] PROGMEM = {0,2,0,3,62,1,38,127,166,3,230,2,126,2,38,62,38,2,38,2,62,62,6,2,0,2,0,2,0,2,0,0};
const uint8_t zh16_6536[32] PROGMEM = {0,0,32,2,32,2,36,3,36,127,36,17,164,17,164,16,164,19,36,26,60,10,62,14,32,14,32,59,160,113,32,0};
const uint8_t zh16_76D8[32] PROGMEM = {0,0,192,0,240,31,16,24,144,25,16,25,254,127,16,24,152,25,8,12,248,31,72,18,72,18,72,18,254,127,0,0};
const uint8_t zh16_6210[32] PROGMEM = {0,0,0,3,0,27,0,3,252,63,12,2,12,18,252,18,204,26,76,14,76,12,68,12,36,14,6,91,128,112,0,0};
const uint8_t zh16_4EA4[32] PROGMEM = {128,1,128,1,0,0,252,127,32,4,112,28,24,48,12,36,100,6,64,6,192,3,128,1,224,7,60,124,12,48,0,0};
const uint8_t zh16_91D1[32] PROGMEM = {0,0,128,0,192,1,96,2,48,12,24,56,246,111,128,1,128,1,252,31,128,1,144,9,144,9,128,5,252,63,0,0};
const uint8_t zh16_989D[32] PROGMEM = {16,0,16,127,254,8,138,12,8,63,124,35,38,43,48,43,204,43,126,43,68,8,68,28,124,54,68,99,0,1,0,0};
const uint8_t zh16_4EBF[32] PROGMEM = {48,0,48,0,208,63,24,24,8,12,12,4,14,6,10,2,8,3,136,1,136,0,200,64,200,96,136,127,8,0,0,0};
const ZhGlyph ZH_GLYPHS_16[] PROGMEM = {
  {0x4ECA, zh16_4ECA}, {0x65E5, zh16_65E5}, {0x6700, zh16_6700}, {0x9AD8, zh16_9AD8},
  {0x4F4E, zh16_4F4E}, {0x6628, zh16_6628}, {0x6536, zh16_6536}, {0x76D8, zh16_76D8},
  {0x6210, zh16_6210}, {0x4EA4, zh16_4EA4}, {0x91D1, zh16_91D1}, {0x989D, zh16_989D},
  {0x4EBF, zh16_4EBF},
};
const uint8_t ZH16_COUNT = 13;

void drawZh(int16_t x, int16_t y, const String &text, uint16_t color, uint8_t size = 24) {
  const ZhGlyph* table; uint8_t count, cw, ch;
  if (size == 16) { table = ZH_GLYPHS_16; count = ZH16_COUNT; cw = ZH16_W; ch = ZH16_H; }
  else            { table = ZH_GLYPHS_24; count = ZH24_COUNT; cw = ZH24_W; ch = ZH24_H; }
  int16_t cx = x;
  int i = 0;
  int n = text.length();
  while (i < n) {
    uint16_t cp = 0;
    int adv = 1;
    uint8_t c = (uint8_t)text[i];
    if (c < 0x80) { cp = c; adv = 1; }
    else if ((c & 0xE0) == 0xC0 && i + 1 < n) { cp = ((c & 0x1F) << 6) | ((uint8_t)text[i + 1] & 0x3F); adv = 2; }
    else if ((c & 0xF0) == 0xE0 && i + 2 < n) { cp = ((c & 0x0F) << 12) | (((uint8_t)text[i + 1] & 0x3F) << 6) | ((uint8_t)text[i + 2] & 0x3F); adv = 3; }
    const uint8_t* bmp = nullptr;
    for (int k = 0; k < count; k++) {
      if (table[k].cp == cp) { bmp = table[k].bmp; break; }
    }
    if (bmp) display.drawXBitmap(cx, y, bmp, cw, ch, color);
    cx += cw;
    i += adv;
  }
}

long daysFromCivil(int y, int m, int d) {
  y -= m <= 2;
  const long era = (y >= 0 ? y : y - 399) / 400;
  const long yoe = y - era * 400;
  const long doy = (153L * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const long doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097L + doe - 719468L;
}

int weekdayOfEpochDay(long day) {
  return (int)(((day % 7) + 7 + 4) % 7);
}

void parseStockTime(const String &t, int &y, int &mo, int &d, int &h, int &mi, int &s) {
  y  = t.substring(0, 4).toInt();
  mo = t.substring(5, 7).toInt();
  d  = t.substring(8, 10).toInt();
  h  = t.substring(11, 13).toInt();
  mi = t.substring(14, 16).toInt();
  s  = t.substring(17, 19).toInt();
}

unsigned long computeSleepSeconds(int y, int mo, int d, int h, int mi, int s) {
  const long OPEN_AM = 570, CLOSE_AM = 720;
  const long OPEN_PM = 780, CLOSE_PM = 960;
  long today = daysFromCivil(y, mo, d);
  long mod   = h * 60L + mi;
  long nowEp = today * 1440L + mod;
  long wakeEp = -1;

  int wd = weekdayOfEpochDay(today);
  bool isWeekday = (wd >= 1 && wd <= 5);
  if (isWeekday) {
    if      (mod <  OPEN_AM)  wakeEp = today * 1440L + OPEN_AM;
    else if (mod <  CLOSE_AM) wakeEp = ((nowEp / 10) + 1) * 10;
    else if (mod <  OPEN_PM)  wakeEp = today * 1440L + OPEN_PM;
    else if (mod <  CLOSE_PM) wakeEp = ((nowEp / 10) + 1) * 10;
  }
  if (wakeEp < 0) {
    for (int k = 1; k <= 7; k++) {
      long day = today + k;
      if (weekdayOfEpochDay(day) >= 1 && weekdayOfEpochDay(day) <= 5) {
        wakeEp = day * 1440L + OPEN_AM;
        break;
      }
    }
  }
  if (wakeEp < 0) wakeEp = nowEp + 600;

  long sleepSec = (wakeEp - nowEp) * 60L - s;
  if (sleepSec < 60)   sleepSec = 60;
  if (sleepSec > 3600) sleepSec = 3600;
  return (unsigned long)sleepSec;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // 第一步：诊断 BUSY 引脚。GDEY075Z08 空闲时 BUSY=高(1)，忙时=低(0)。
  //         若读到 0，通常是接错脚/虚焊/短路到地，或面板供电不足卡在忙状态，
  //         这正是刷新总卡满 30s 超时的根因。
  pinMode(EPD_BUSY, INPUT_PULLUP);
  delay(1);
  Serial.printf("[BUSY diag] GPIO%d idle=%d (期望 1)\n", EPD_BUSY, digitalRead(EPD_BUSY));

  SPI.begin(EPD_CLK, -1, EPD_MOSI, -1);

  // 第二步：画开机页
  Serial.println(">>> Boot: drawing boot screen...");
  display.init(115200);
  display.setRotation(0);
  drawBootPage("Connecting Network...");
  display.powerOff();
  delay(1000);

  // 第三步：连接 WiFi（常驻，不再每轮重连）
  Serial.println(">>> Connecting WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_17dBm); // 降低发射功率，缓解连网瞬间的电流尖峰导致的欠压重启
  WiFi.begin(ssid, password);
  int timeout_count = 0;
  while (WiFi.status() != WL_CONNECTED && timeout_count < 30) {
    delay(500);
    Serial.print(".");
    timeout_count++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
  } else {
    Serial.println("\nWiFi Failed, will keep retrying in loop.");
  }
  delay(2000);
}

void fetchAndDraw() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(">>> WiFi dropped, reconnecting...");
    WiFi.reconnect();
    delay(3000);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(">>> Fetching stock data...");
    fetchStockData();
  } else {
    stock.name = "腾讯控股"; stock.code = "00700"; stock.price = "431.20";
    stock.change = "+1.00"; stock.changePct = "+0.23%"; stock.high = "445.80";
    stock.low = "431.20"; stock.volume = "108.97"; stock.yestClose = "430.20";
    stock.time = "2026/07/03 16:08:18"; stock.isUp = true;
  }

  float priceF = stock.price.toFloat();
  if (priceF != lastPriceF) {
    display.init(115200);
    display.setRotation(0);
    drawStockDashboard();
    display.powerOff();
    lastPriceF = priceF;
    Serial.println(">>> Screen refreshed.");
  } else {
    Serial.println(">>> Price unchanged, skip redraw.");
  }
}

void loop() {
  fetchAndDraw();

  unsigned long waitSec;
  if (stock.time == lastStockTime) {
    waitSec = 3600;
    Serial.println(">>> Timestamp frozen (market closed), wait 1h.");
  } else {
    int y, mo, d, h, mi, s;
    parseStockTime(stock.time, y, mo, d, h, mi, s);
    waitSec = computeSleepSeconds(y, mo, d, h, mi, s);
    Serial.printf(">>> Next refresh in %lu s (now %04d/%02d/%02d %02d:%02d:%02d)\n",
                  waitSec, y, mo, d, h, mi, s);
  }
  lastStockTime = stock.time;

  delay(waitSec * 1000UL);
}

void drawBootPage(const char* statusText) {
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    const char* title = "STOCK MONITOR";
    int titleW = strlen(title) * 18;
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(3);
    display.setCursor((800 - titleW) / 2, 200);
    display.print(title);
    display.fillRect((800 - titleW) / 2, 244, titleW, 2, GxEPD_RED);
    display.setTextColor(GxEPD_RED);
    display.setTextSize(2);
    int sw = strlen(statusText) * 12;
    display.setCursor((800 - sw) / 2, 276);
    display.print(statusText);
  } while (display.nextPage());
}

void drawStockDashboard() {
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    uint16_t themeColor = stock.isUp ? GxEPD_RED : GxEPD_BLACK;

    display.fillRect(48, 48, 6, 40, GxEPD_RED);
    drawZh(64, 56, stock.name, GxEPD_BLACK);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(2);
    display.setCursor(172, 60);
    display.print("(" + stock.code + ")");
    String tm = stock.time.substring(5, 16);
    display.setCursor(752 - (int)(tm.length() * 12), 60);
    display.print(tm);

    display.drawFastHLine(48, 104, 704, GxEPD_BLACK);

    display.setTextColor(themeColor);
    display.setTextSize(8);
    display.setCursor(48, 130);
    display.print(stock.price);

    if (stock.isUp) {
      display.fillTriangle(58, 222, 48, 240, 68, 240, themeColor);
    } else {
      display.fillTriangle(48, 222, 68, 222, 58, 240, themeColor);
    }
    display.setTextColor(themeColor);
    display.setTextSize(4);
    display.setCursor(78, 222);
    display.print(stock.changePct);

    float chgMag = stock.change.toFloat();
    if (chgMag < 0) chgMag = -chgMag;
    String changeStr = String(stock.isUp ? "+" : "-") + String(chgMag, 2);
    display.setTextSize(2);
    display.setCursor(234, 230);
    display.print(changeStr);

    display.drawFastHLine(48, 296, 704, GxEPD_BLACK);
    display.drawFastVLine(224, 308, 76, GxEPD_BLACK);
    display.drawFastVLine(400, 308, 76, GxEPD_BLACK);
    display.drawFastVLine(576, 308, 76, GxEPD_BLACK);

    drawZh(48,  318, "今日最高", GxEPD_BLACK, 16);
    drawZh(236, 318, "今日最低", GxEPD_BLACK, 16);
    drawZh(412, 318, "昨日收盘", GxEPD_BLACK, 16);
    drawZh(588, 318, "成交金额", GxEPD_BLACK, 16);

    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(3);
    display.setCursor(48,  354); display.print(stock.high);
    display.setCursor(236, 354); display.print(stock.low);
    display.setCursor(412, 354); display.print(stock.yestClose);
    display.setCursor(588, 354); display.print(stock.volume);
    drawZh(588 + stock.volume.length() * 18 + 4, 362, "亿", GxEPD_BLACK, 16);

    display.drawFastHLine(48, 432, 704, GxEPD_BLACK);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(1);
    display.setCursor(48, 446);
    display.print("TENCENT HOLDINGS");
    String dateStr = stock.time.substring(0, 10);
    display.setCursor(752 - (int)(dateStr.length() * 6), 446);
    display.print(dateStr);

  } while (display.nextPage());
}

void fetchStockData() {
  HTTPClient http;
  http.begin(api_url);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Raw Data received.");

    int tokens[40];
    int tokenCount = 0;

    int pos = 0;
    while ((pos = payload.indexOf('~', pos)) != -1 && tokenCount < 40) {
      tokens[tokenCount++] = pos;
      pos++;
    }

    if (tokenCount > 35) {
      auto getField = [&](int index) {
        return payload.substring(tokens[index-1] + 1, tokens[index]);
      };

      stock.name      = "腾讯控股";
      stock.code      = getField(2);
      stock.price     = getField(3);
      stock.yestClose = getField(4);
      stock.high      = getField(33);
      stock.low       = getField(34);
      stock.time      = getField(30);
      stock.change    = getField(31);
      stock.changePct = getField(32);

      stock.price = String(stock.price.toFloat(), 2);
      stock.high = String(stock.high.toFloat(), 2);
      stock.low = String(stock.low.toFloat(), 2);
      stock.yestClose = String(stock.yestClose.toFloat(), 2);

      double volBytes = getField(37).toFloat();
      stock.volume = String((volBytes / 100000000.0), 2);

      float chg = stock.change.toFloat();
      if (chg >= 0) {
        stock.isUp = true;
        stock.changePct = "+" + String(stock.changePct.toFloat(), 2) + "%";
      } else {
        stock.isUp = false;
        stock.changePct = String(stock.changePct.toFloat(), 2) + "%";
      }
    }
  } else {
    Serial.printf("HTTP GET Failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
```

### 코드 설명

**첫 번째, 폰트는 직접 손으로 만들었어요.** 일반적인 중국어 폰트 파일은 수십~수백 KB씩 하는데, '腾讯控股' 네 글자가 다 들어 있지도 않아요. 차라리 프로젝트에서 실제로 쓰는 십수 자의 한자만 미리 비트맵 배열로 렌더링해 코드에 박아 넣었어요. 용량도 작고, 글자가 빠져서 네모로 나오는 일도 절대 없어요.

**두 번째, 거래 시간은 직접 계산해요, 표를 찾는 게 아니라.** `computeSleepSeconds`가 날짜 알고리즘(Howard Hinnant의 양력→일수 변환 알고리즘)으로 오늘이 무슨 요일인지 계산하고, 홍콩 증시의 개장/점심/마감 시점과 조합해 '다음에는 얼마나 잤다가 일어나서 갱신할지'를 정해요. 개장 중에는 10분마다 한 번씩 갱신하고, 마감 후에는 바로 다음 거래일의 개장 시간까지 건너뛰어요. 한밤중에 멍하니 빙글빙글 도는 일은 없어요.

**세 번째, 가격이 안 변했으면 다시 그리지 않아요.** 전자종이는 한 번 갱신하는 데 몇 초가 걸리고 깜빡이기까지 해요. 그래서 코드에서는 `lastPriceF`로 마지막에 그린 가격을 기억해 두고, 변화가 없으면 건너뛰고 진짜 바뀌었을 때만 다시 갱신해요. 갱신 횟수를 꽤 줄일 수 있어요.

**네 번째, BUSY 핀 진단.** 부팅 직후 BUSY 핀의 전압을 바로 읽어요. 예상한 high가 아니라면 십중팔구 배선이나 전원 문제라서, 미리 알림을 받아두는 거예요. 나중에 배선 잘못이라는 걸 겨우 깨닫는 일을 막죠.

## 자주 묻는 문제 해결

진정하세요. 80%의 문제는 이쪽에 있어요:

- **직렬 모니터에 `E BOD: Brownout detector was triggered`가 뜨며 계속 재부팅돼요:** ESP32의 저전압 보호가 작동한 거예요. 대개 WiFi가 켜지는 순간 전압이 떨어져서 그래요. 해결책은 앞의 '전원 안정성' 섹션을 참고하세요. `3V3`과 `GND` 사이에 470μF/1000μF 전해 콘덴서와 0.1μF 세라믹 콘덴서를 병렬로 넣고, 좀 더 굵은 USB 케이블로 바꿔보세요.
- **화면이 계속 하얗게 나오고 반응이 없어요:** 먼저 BUSY 선이 제대로 연결됐는지 확인하세요. 직렬 모니터에 `[BUSY diag]`로 찍히는 값이 1이어야 해요. 0이라면 배선과 전원을 점검해 보세요. 대부분 점퍼 와이어가 헐겁게 꽂혀 있던 경우예요.
- **갱신할 때마다 30초 타임아웃이 뜰 때까지 멈춰 있어요:** BUSY 핀이 잘못 연결됐거나 전자종이에 전원이 부족한 거로 봐도 거의 확실해요 (USB 전원 전류가 부족해도 이런 증상이 나와요. 더 굵은 데이터 케이블로 바꿔 보세요).
- **중국어가 네모로 나오거나 글자가 빠져요:** 그 글자가 로컬 폰트에 없다는 뜻이에요. '코드 설명'에서 언급한 부분으로 돌아가 해당 한자의 비트맵 배열을 추가해 주세요.
- **WiFi가 도통 연결 안 돼요:** `ssid`와 `password`에 오타가 없는지, 그리고 공유기가 2.4GHz 대역인지 확인하세요. ESP32는 대부분 5GHz를 지원하지 않아요.
- **주가가 안 갱신되고 한 숫자에 고정돼요:** 정상이에요. 타임스탬프가 변하지 않으면 코드가 '장이 닫았다'고 판단해 1시간에 한 번까지만 깨요. 개장 시간이 되면 자연스럽게 원래 새로고침 주기로 돌아와요.
- **컴파일 에러: `GxEPD2_750c_GDEY075Z08`를 찾을 수 없다:** GxEPD2 라이브러리 버전이 너무 오래됐는지 확인하세요. 이 패널 모델은 나중에 라이브러리 지원 목록에 추가됐어요. 새 버전으로 업그레이드하면 돼요.

## FAQ 질문답

**Q: ESP32 핀을 마음대로 바꿔도 되나요?**
A: 네. SPI를 지원하는 일반 GPIO라면 어디든 가능해요. 코드 맨 위의 `EPD_MOSI` / `EPD_CLK` / `EPD_CS` / `EPD_DC` / `EPD_RST` / `EPD_BUSY` 매크로를 실제로 연결한 핀 번호로 바꾸기만 하면 돼요. 다른 부분은 손대지 않아도 돼요.

**Q: 새로고침 주기를 더 빠르게, 예를 들면 1분에 한 번으로 바꿀 수 있나요?**
A: 네, `computeSleepSeconds`의 10분을 원하는 분 수로 바꾸면 돼요. 다만 전자종이는 갱신 횟수에 수명 제한이 있어서 너무 잦으면 손해예요.

**Q: 배터리로 전원을 넣으면 문제가 있나요?**
A: 현재 코드는 'WiFi 상시 + delay 대기' 형태의 데모 버전이라, WiFi가 계속 켜져 있어 전력 소모가 크고 USB 전원에 더 알맞아요. 배터리로 쓰실 거라면 딥 슬립 모드로 바꾸고, 깰 때마다 데이터를 가져오고 바로 WiFi를 끄고 다시 자는 형태를 추천해요.

**Q: 이 프로젝트는 메모리를 얼마나 쓰나요? ESP32가 감당할 수 있나요?**
A: 폰트와 코드 자체는 작아요. 주요 소모는 GxEPD2의 디스플레이 버퍼예요. 7.5인치 3색 패널이라면 Flash와 RAM이 비교적 넉넉한 ESP32 모델을 추천해요. 일반적인 ESP32-S3 개발 보드면 충분히 감당 가능해요.

**Q: 다른 종목, 예를 들면 A주나 미국 주식으로 바꿀 수 있나요?**
A: 네, `api_url`을 해당 종목의 텐센트 재정 API 주소로 바꾸면 돼요. 단, A주/미국 주식의 개장/마감 시간은 홍콩 증시와 다르기 때문에 `computeSleepSeconds`의 개장/마감 시점도 함께 조정해야 해요. 그리고 다른 중국어 글자를 쓰려면 폰트를 직접 만들어 넣어야 네모가 뜨지 않아요.

**Q: 다른 크기(예: 더 작은 4.2인치) 패널로 바꿀 수 있나요?**
A: 네, GxEPD2 라이브러리가 지원하는 해당 모델로 바꾸면 돼요. 단, 화면 좌표(800, 480 같은 숫자들)를 새 패널의 해상도에 맞춰 다시 잡아야 해요. 그렇지 않으면 레이아웃이 어긋나요.

## 더 해볼 수 있는 것들

- 여러 종목을 돌아가며 표시하고, 주기적으로 보드를 전환
- 간단한 WiFi 설정 웹페이지를 추가해, 매번 코드의 WiFi 비밀번호를 고치지 않게 만들기
- CdS 광센서를 달아 낮에는 정상 갱신, 밤에는 자동으로 갱신 주기를 늘려 절전
- 딥 슬립 + 배터리 전원으로 바꿔, 진짜 책상 위에 툭 올려놓을 수 있는 무선 소품으로 만들기

## 참고 자료

- [GxEPD2 GitHub 저장소](https://github.com/ZinggJM/GxEPD2)
- [Adafruit GFX Library GitHub 저장소](https://github.com/adafruit/Adafruit-GFX-Library)
- [Espressif ESP32 공식 문서](https://www.espressif.com/en/products/socs/esp32)
