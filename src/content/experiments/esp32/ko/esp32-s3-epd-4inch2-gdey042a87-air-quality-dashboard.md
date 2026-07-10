---
title: "ESP32-S3로 4.2인치 전자종이(SSD1683) 구동｜AQICN으로 공기질 대시보드 만들기(GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-4inch2-gdey042a87
category: esp32
date: 2026-07-08
intro: "ESP32-S3와 GxEPD2로 4.2인치 흑백 전자종이(GDEY042A87 / SSD1683)를 구동하고 AQICN 공기질 API를 연동해 전원을 꺼도 화면이 유지되는 데스크톱 공기질 대시보드를 만듭니다. 배선, 전체 Arduino C++ 코드, 파티션 설정, 트러블슈팅까지 모두 포함."
image: "https://img.lingflux.com/2026/07/39d31272f2976bb195ecea554654502d.jpg"
---

> **한 줄 요약**: 중고 마켓에서 십몇 위안에 구한 4.2인치 흑백 전자종이 한 장과 ESP32-S3를 써서, AQICN 공기질 API를 연동했어요. 폰을 꺼낼 필요 없이 흘긋 보기만 해도 오늘 바이윈산(白云山)으로 산행을 떠나도 될지 알 수 있는 데스크톱 공기질 대시보드예요.

난이도: ⭐⭐☆☆☆ (초보자도 도전 가능) 예상 시간: 30분 테스트 환경: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 ＋ GxEPD2 v1.6.9 + Adafruit GFX Library v1.12.6 + ArduinoJson v7.4.3 (라이브러리 설치 시 이 버전을 기준으로 맞추시는 걸 추천해요. 너무 최신이거나 오래된 버전은 문제가 생길 수 있어요.)

> **TL;DR (빠른 시작):**
>
> 1. 배선: GPIO11 → SDI/MOSI, GPIO12 → SCL/SCK, GPIO10 → CS, GPIO9 → DC, GPIO8 → RES, GPIO7 → BUSY, VCC는 3.3V, GND는 공통 GND
> 2. 라이브러리 설치: ArduinoJson, GxEPD2, Adafruit GFX Library, U8g2_for_Adafruit_GFX (작성자 olikraus)
> 3. 코드의 `WIFI_SSID`, `WIFI_PASS`, `API_TOKEN`을 본인 것으로 수정 (Token 발급 방법은 아래 'AQICN 무료 API Token 발급받기' 섹션 참고)
> 4. 업로드하고 WiFi가 연결되면 화면이 자동으로 공기질 데이터를 새로고침해요

## 서두

십몇 위안에 중고 마켓에서 흑백 전자종이를 하나 건졌어요. 솔직히 주문할 때 마음이 좀 불안했어요—혹시 고장 난 화면이면 돈만 날리는 거니까요. 다행히 전원을 넣어보니 정상적으로 작동했고 크게 망가진 부분은 없었어요. 세로줄 하나가 고장 난 게 보이긴 했지만 크게 문제되진 않더라고요. 화면이 아직 따끈할 때, 계속 떠 있으면서 폰 App도 필요 없고 흘긋 보기만 하면 오늘 바이윈산 공기가 좋은지 알 수 있는 작은 대시보드를 만들어보기로 했어요. 날씨가 좋으면 바로 산으로 달려가는 거죠. 이 글에는 배선과 코드, 그리고 겪었던 시행착오를 모두 정리했어요. 따라 하시면 한 번에 불 들어올 거예요.

## 완성된 모습

ESP32-S3 한 장이 AQICN.ORG에서 주기적으로 공기질 데이터를 가져와 전자종이에 새로 그려줘요. 화면에는 AQI 큰 숫자, 12가지 세부 지표(PM2.5, PM10, 온습도, 풍속 등), 그리고 PM2.5와 자외선의 7일 예측 막대그래프가 담겨요. 전원을 꺼도 화면이 남아 있어서 책상 위에 올려두면 '전자 풍수계'처럼 쓸 수 있고, 훌륭한 데스크 셋업 아이템이에요.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/foEGSZWcxEE?si=cjtzAEnatEL7e4NY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## 부품 설명

**ESP32-S3 개발 보드**는 WiFi가 내장된 SoC 개발 보드예요. 인터넷에서 데이터를 가져오고, 로직을 돌리고, SPI로 화면에 그림을 밀어 넣는, 프로젝트 전체의 뇌예요. 이 보드를 고른 이유는 핀이 많고 연산력이 충분하며 WiFi가 내장되어 있어서 따로 네트워크 모듈을 추가하지 않아도 되기 때문이에요.

**전자종이 구동 보드**(직접 제작)는 ESP32가 보내는 SPI 명령을 화면이 이해할 수 있는 전압 신호로 바꿔주는 '통역사'예요. 재미삼아 직접 보드를 만들었어요. 외부로 끌어낸 인터페이스는 시중 제품과 같아서, 다른 전자종이 구동 보드가 있다면 그걸로 시도해 보셔도 돼요.

**4.2인치 흑백 전자종이**는 전기장으로 마이크로캡슐 안의 흑백 입자를 뒤집어 화면을 표시하는 패널이에요. 특징은 전원을 꺼도 화면이 유지된다는 점이에요. 이런 '한 번 보고 지나가는' 정보 보드에 딱 어울려요. LCD처럼 전력을 많이 먹지 않지만, 대신 새로고침이 느려서 애니메이션에는 맞지 않아요.



## BOM 표

| 부품 | 모델/사양 | 수량 |
| --- | --- | --- |
| ESP32 개발 보드 | ESP32-S3 (SPI 핀이 충분히 있는 모델이면 모두 OK) | 1 |
| 전자종이 구동 보드 | 직접 제작한 PCB, 핀 정의는 시중의 대부분 전자종이 구동 보드와 동일 | 1 |
| 전자종이 | 4.2인치 흑백, GxEPD2_420_GYE042A87 드라이버 호환 | 1 |
| 점퍼 와이어 | | 약간 |

## 부품 핀 설명

| 핀 | 풀네임 | 역할 |
| --- | --- | --- |
| **VCC** | 전원 양극 | 전원 입력. ESP32-S3의 3V3 출력에 연결 |
| **GND** | 전원 접지 | 기준 접지. ESP32-S3의 GND에 연결해 전류 루프를 형성 |
| **SDI/MOSI** | 마스터 출력 슬레이브 입력 | SPI 데이터 선. ESP32가 화면으로 데이터를 송신 |
| **SCL/SCK** | 직렬 클럭 | SPI 클럭 선. 데이터 전송 타이밍을 제어 |
| **CS** | 칩 셀렉트 | 화면에 '지금부터 오는 데이터는 너한테 보내는 거야'라고 알림 |
| **DC** | 데이터/명령 전환 | 지금 보내는 게 화면 데이터인지 제어 명령인지 구분 |
| **RES/RST** | 리셋 | 잠깐 로우로 당겨서 화면을 다시 초기화 |
| **BUSY** | 사용 중 표시 | 갱신 중일 때 로우로 떨어져요. ESP32는 이걸 보고 '다음 명령을 보내도 되나' 판단 |

## 배선 방법

| 전자종이 핀 | ESP32-S3 핀 연결 |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

배선을 끝낸 뒤 하나씩 다시 확인하는 걸 추천해요. 이렇게 하면 트러블슈팅 시간의 80%를 아낄 수 있어요—전자종이가 가장 까다로운 점은 배선을 잘못 연결해도 에러가 나지 않고, 그냥 계속 화면이 깨지거나 하얗게 나온다는 거예요. 육안만으로는 코드 문제인지 배선 문제인지 한눈에 판단하기 어려워요.

## 설치해야 할 라이브러리

Arduino IDE의 라이브러리 매니저에서 검색해서 설치하세요 (테스트 통과 버전은 참고용이며, 실제로는 라이브러리 매니저의 최신 안정 버전을 기준으로 하시면 돼요):

| 라이브러리 | 역할 | 테스트 버전 |
| --- | --- | --- |
| ArduinoJson | AQICN API가 반환하는 JSON 파싱 | v7.4.3 |
| GxEPD2 | 전자종이 핵심 드라이버 라이브러리 | v1.6.9 |
| Adafruit GFX Library | 그래픽 그리기 기본 라이브러리, GxEPD2가 의존 | v1.12.6 |
| U8g2_for_Adafruit_GFX | U8g2의 중국어 폰트를 Adafruit GFX로 연결, 중국어 표시에 사용 | v1.8.0 (작성자 olikraus) |

`WiFi.h`, `HTTPClient.h`, `SPI.h`는 ESP32 코어에 내장되어 있어 따로 설치할 필요 없어요. ESP32 개발 보드 지원 패키지만 설치되어 있으면 돼요.

## 업로드 설정: 파티션 방식 (중요)

먼저 짚고 넘어갈 함정이 하나 있어요. 이 프로젝트는 `U8g2_for_Adafruit_GFX`의 완전한 중국어 폰트를 사용해요 (코드에서 `u8g2_font_wqy16_t_gb2312`, `wqy14`, `wqy12` 세 벌을 참조해요). 이 GB2312 폰트들을 합치면 거의 500KB에 달해요. 그런데 ESP32의 기본 파티션 방식은 프로그램 영역에 1MB만 할당하기 때문에, 컴파일할 때 '공간 부족 (region `app' overflowed)' 에러가 나면서 업로드가 안 돼요.

**해결 방법**: 업로드 전에 파티션 방식을 크게 늘려주세요.

**조작 경로**: Arduino IDE 상단 메뉴 → `도구 (Tools)` → `Partition Scheme` → **`Huge APP (3MB No OTA/1MB SPIFFS)`** 선택

저도 이 `Huge APP`를 써서 프로그램 영역에 한 번에 3MB를 할당했어요. 폰트와 코드 모두 편안하게 들어가고, 컴파일과 업로드가 순조로웠어요.

> 💡 몇 가지 보충 설명:
> - **폰트가 왜 이렇게 커요?** GB2312는 6~7천 자의 한자를 담고 있고, wqy 폰트 하나당 1~2백 KB의 비트맵 데이터라 서양 폰트처럼 작게 만들 수 없어요.
> - **No OTA의 대가**: No OTA를 선택하면 '무선 펌웨어 업데이트(OTA)'를 쓸 수 없고 USB 케이블로만 업로드할 수 있어요. 하지만 책상 위에 전원 꽂아두고 쓰는 작은 장식물에는 아무 영향도 없어요. 어차피 책상에 꽂아두고 쓰니까요.
> - **대용량 Flash 보드의 더 좋은 선택**: ESP32-S3가 8MB 이상 Flash 버전이라면 더 여유로운 방식(예: `8M with SPIFFS`)을 선택해도 돼요. OTA도 안 막히고 데이터 저장 공간도 더 늘어나요.
> - 파티션 방식을 바꾼 뒤에는 꼭 다시 컴파일하세요. 업로드만 눌러서 예전 설정을 그대로 쓰지 마세요.

## AQICN 무료 API Token 발급받기

코드의 `API_TOKEN`과 도시 ID(예: `@14370`)는 모두 AQICN(aqicn.org)에서 온 거예요. 무료로 발급받을 수 있고, 아래 4단계를 따라 하면 받을 수 있어요.

**1단계: 본인의 도시 찾기**

[aqicn.org](https://aqicn.org/)를 열고 오른쪽 위 검색창에 모니터링할 도시나 관측소 이름(예: 'Guangzhou', 'Baiyun Mountain')을 입력한 뒤, 해당 공기질 페이지로 들어가세요.

**2단계: API 데이터 플랫폼으로 이동**

도시 페이지를 아래로 스크롤해서 'json: api'라고 표시된 링크를 찾아 클릭하면 AQICN 데이터 플랫폼으로 이동해요.

**3단계: 회원가입 및 계정 활성화**

이메일로 회원가입하고 받은 편지함에서 활성화 링크를 눌러 인증을 완료하세요. 로그인한 뒤 콘솔에서 전용 **Token**(무작위 문자열, 비밀로 유지하고 공개 저장소에 올리지 마세요)을 볼 수 있어요.

**4단계: API 주소를 조립해 코드에 반영**

Token을 코드의 `API_TOKEN` 매크로에 넣고, `API_URL`의 `@14370`을 원하는 관측소 ID로 바꾸세요 (도시 영문 이름이나 위도/경도 좌표를 직접 써도 돼요. 작성법은 [AQICN API 문서](https://aqicn.org/api/) 참고). 전체 형식은 이래요:

```
https://api.waqi.info/feed/@14370/?token=你的Token
```

주소가 맞는지 확인하려면 위 문자열을 브라우저 주소창에 그대로 붙여 넣어 여세요. `"status":"ok"`가 포함된 JSON이 반환되면 연결된 거예요.

> AQICN 개인 Token은 완전 무료이고 카드 등록도 필요 없어요. 개인 프로젝트에서 마음껏 쓰기엔 할당량이 충분하니 요금 걱정은 안 하셔도 돼요.

## 전체 코드 + 설명

```cpp
/*
 * ============================================================
 * ESP32-S3 + 4.2" 墨水屏 空气质量监测站  (v2.1 横屏优化版)
 * Air Quality Monitor using AQICN API
 * ============================================================
 *
 * 本版本相对上一版做了如下修改:
 * 1. 彻底删除了底部显示不全的 PM10 预测表格及其标题。
 * 2. 将上方的 AQI 方块和 12项指标网格高度从 128 扩大至 141，行高更宽松。
 * 3. 将 PM2.5 和紫外线预测图表的高度从 52 扩大至 64，画面更舒展。
 * 4. 重新计算了所有垂直坐标，底部保留少许清爽留白。
 *
 * 硬件连接 (不变):
 * EPD_CS   -> GPIO 10
 * EPD_DC   -> GPIO 9
 * EPD_RST  -> GPIO 8
 * EPD_BUSY -> GPIO 7
 * EPD_MOSI -> GPIO 11
 * EPD_CLK  -> GPIO 12
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Adafruit_GFX.h>
#include <U8g2_for_Adafruit_GFX.h>

// 粗体数字字体 (Adafruit GFX 自带)
#include <Fonts/FreeSansBold9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>

// ==================== 配置区 ====================
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASS     "YOUR_WIFI_PASSWORD"
#define API_TOKEN     "YOUR_WIFI_AQI_API_TONKEN"
#define API_URL       "https://api.waqi.info/feed/@14370/?token=" API_TOKEN

#define UPDATE_INTERVAL_MS  (30 * 60 * 1000)  // 30分钟更新一次

// 如果画面上下颠倒，把这里改成 1
#define ROTATION_FLIP 0

// ==================== 引脚定义 ====================
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_MOSI 11
#define EPD_CLK  12

// ==================== 墨水屏驱动 ====================
GxEPD2_BW<GxEPD2_420_GYE042A87, GxEPD2_420_GYE042A87::HEIGHT> display(
  GxEPD2_420_GYE042A87(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY)
);

// U8g2 中文渲染桥接对象
U8G2_FOR_ADAFRUIT_GFX u8f;

// ==================== 数据结构 ====================
struct ForecastDay {
  char day[6];   // "07-08"
  int avg;
  int maxVal;
  int minVal;
};

struct AqiData {
  int aqi;
  char city[32];
  char timeStr[20];
  char timeShort[12];   // 精简时间 "07-08 14:00"
  char dominentpol[8];
  float lat, lon;

  float co, dew, h, no2, o3, p, pm10, pm25, so2, t, w, wg;

  ForecastDay pm25Forecast[8];
  int pm25ForecastCount;
  ForecastDay pm10Forecast[8];
  int pm10ForecastCount;
  ForecastDay uviForecast[8];
  int uviForecastCount;
};

AqiData aqiData;

// ==================== 辅助函数: AQI 等级 ====================
const char* getAqiLevel(int aqi) {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy-S";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "V.Unhealthy";
  return "Hazardous";
}

const char* getAqiLevelCN(int aqi) {
  if (aqi <= 50)  return "优";
  if (aqi <= 100) return "良";
  if (aqi <= 150) return "轻度污染";
  if (aqi <= 200) return "中度污染";
  if (aqi <= 300) return "重度污染";
  return "严重污染";
}

// ==================== WiFi 连接 ====================
void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nConnected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi connection FAILED!");
  }
}

// ==================== 解析预报数组 ====================
int parseForecastArray(JsonArray arr, ForecastDay* out, int maxCount) {
  int count = 0;
  for (JsonObject item : arr) {
    if (count >= maxCount) break;
    const char* dayStr = item["day"];
    if (dayStr && strlen(dayStr) >= 10) {
      strncpy(out[count].day, dayStr + 5, 5);
      out[count].day[5] = '\0';
    }
    out[count].avg    = item["avg"] | 0;
    out[count].maxVal = item["max"] | 0;
    out[count].minVal = item["min"] | 0;
    count++;
  }
  return count;
}

// ==================== API 请求与解析 ====================
bool fetchAqiData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping fetch.");
    return false;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.setTimeout(15000);
  int httpCode = http.GET();

  if (httpCode != 200) {
    Serial.printf("HTTP GET failed, code: %d\n", httpCode);
    http.end();
    return false;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.printf("JSON parse error: %s\n", err.c_str());
    return false;
  }

  const char* status = doc["status"];
  if (!status || strcmp(status, "ok") != 0) {
    Serial.println("API status not OK");
    return false;
  }

  JsonObject data = doc["data"];
  aqiData.aqi = data["aqi"] | 0;

  const char* cityName = data["city"]["name"];
  if (cityName) {
    const char* comma = strchr(cityName, ',');
    if (comma) {
      int len = comma - cityName;
      if (len > 31) len = 31;
      strncpy(aqiData.city, cityName, len);
      aqiData.city[len] = '\0';
    } else {
      strncpy(aqiData.city, cityName, 31);
      aqiData.city[31] = '\0';
    }
  }

  const char* timeS = data["time"]["s"];
  if (timeS) {
    strncpy(aqiData.timeStr, timeS, 19);
    aqiData.timeStr[19] = '\0';
    if (strlen(timeS) >= 16) {
      memcpy(aqiData.timeShort, timeS + 5, 11);
      aqiData.timeShort[11] = '\0';
    } else {
      aqiData.timeShort[0] = '\0';
    }
  }

  const char* dpol = data["dominentpol"];
  if (dpol) {
    strncpy(aqiData.dominentpol, dpol, 7);
    aqiData.dominentpol[7] = '\0';
  }

  aqiData.lat = data["city"]["geo"][0] | 0.0f;
  aqiData.lon = data["city"]["geo"][1] | 0.0f;

  JsonObject iaqi = data["iaqi"];
  aqiData.co   = iaqi["co"]["v"]   | 0.0f;
  aqiData.dew  = iaqi["dew"]["v"]  | 0.0f;
  aqiData.h    = iaqi["h"]["v"]    | 0.0f;
  aqiData.no2  = iaqi["no2"]["v"]  | 0.0f;
  aqiData.o3   = iaqi["o3"]["v"]   | 0.0f;
  aqiData.p    = iaqi["p"]["v"]    | 0.0f;
  aqiData.pm10 = iaqi["pm10"]["v"] | 0.0f;
  aqiData.pm25 = iaqi["pm25"]["v"] | 0.0f;
  aqiData.so2  = iaqi["so2"]["v"]  | 0.0f;
  aqiData.t    = iaqi["t"]["v"]    | 0.0f;
  aqiData.w    = iaqi["w"]["v"]    | 0.0f;
  aqiData.wg   = iaqi["wg"]["v"]   | 0.0f;

  JsonObject forecast = data["forecast"]["daily"];
  aqiData.pm25ForecastCount = parseForecastArray(
    forecast["pm25"].as<JsonArray>(), aqiData.pm25Forecast, 8);
  aqiData.pm10ForecastCount = parseForecastArray(
    forecast["pm10"].as<JsonArray>(), aqiData.pm10Forecast, 8);
  aqiData.uviForecastCount = parseForecastArray(
    forecast["uvi"].as<JsonArray>(), aqiData.uviForecast, 8);

  Serial.printf("Data parsed OK! AQI=%d, City=%s\n", aqiData.aqi, aqiData.city);
  return true;
}

// ==================== 绘图小工具 ====================
void drawCN(int x, int y, const char* utf8, bool whiteOnBlack, const uint8_t* font) {
  u8f.setFont(font);
  if (whiteOnBlack) {
    u8f.setForegroundColor(GxEPD_WHITE);
    u8f.setBackgroundColor(GxEPD_BLACK);
  } else {
    u8f.setForegroundColor(GxEPD_BLACK);
    u8f.setBackgroundColor(GxEPD_WHITE);
  }
  int baselineY = y + u8f.getFontAscent();
  u8f.setCursor(x, baselineY);
  u8f.print(utf8);
}

void drawCNCentered(int cx, int y, const char* utf8, bool whiteOnBlack, const uint8_t* font) {
  u8f.setFont(font);
  uint16_t w = u8f.getUTF8Width(utf8);
  drawCN(cx - w / 2, y, utf8, whiteOnBlack, font);
}

void drawCNRight(int rightX, int y, const char* utf8, bool whiteOnBlack, const uint8_t* font) {
  u8f.setFont(font);
  uint16_t w = u8f.getUTF8Width(utf8);
  drawCN(rightX - w, y, utf8, whiteOnBlack, font);
}

void drawBold(const GFXfont* font, const char* text, int x, int baselineY) {
  display.setFont(font);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(x, baselineY);
  display.print(text);
  display.setFont(NULL); 
}

void drawBoldCentered(const GFXfont* font, const char* text, int cx, int baselineY) {
  display.setFont(font);
  int16_t x1, y1; uint16_t w, h;
  display.getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  display.setFont(NULL);
  drawBold(font, text, cx - w / 2 - x1, baselineY);
}

// ==================== 绘制 UI (横屏 400x300优化版) ====================
void drawUI() {
  int W = display.width();
  int H = display.height();

  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);

    // ---------- 顶部标题栏 (0-20) ----------
    display.fillRect(0, 0, W, 20, GxEPD_BLACK);
    drawCN(6, 6, "空气质量监测站", true, u8g2_font_wqy14_t_gb2312);
    drawCNRight(W - 6, 5, aqiData.timeShort, true, u8g2_font_wqy12_t_gb2312);

    // ---------- 位置行 (20-34) ----------
    drawCN(6, 24, aqiData.city, false, u8g2_font_wqy14_t_gb2312);
    char levelLine[24];
    snprintf(levelLine, sizeof(levelLine), "%s · 主要污染: %s", getAqiLevelCN(aqiData.aqi), aqiData.dominentpol);
    drawCNRight(W - 6, 24, levelLine, false, u8g2_font_wqy12_t_gb2312);

    display.drawFastHLine(4, 36, W - 8, GxEPD_BLACK);

    // ---------- AQI 大方块 (左, 40-181) [高度增加到141] ----------
    int aqiBoxX = 6, aqiBoxY = 40, aqiBoxW = 118, aqiBoxH = 141;
    display.drawRoundRect(aqiBoxX, aqiBoxY, aqiBoxW, aqiBoxH, 6, GxEPD_BLACK);
    display.drawRoundRect(aqiBoxX + 1, aqiBoxY + 1, aqiBoxW - 2, aqiBoxH - 2, 5, GxEPD_BLACK);

    drawCNCentered(aqiBoxX + aqiBoxW / 2, aqiBoxY + 12, "AQI 指数", false, u8g2_font_wqy12_t_gb2312);

    char aqiStr[8];
    snprintf(aqiStr, sizeof(aqiStr), "%d", aqiData.aqi);
    drawBoldCentered(&FreeSansBold24pt7b, aqiStr, aqiBoxX + aqiBoxW / 2, aqiBoxY + 98);

    drawCNCentered(aqiBoxX + aqiBoxW / 2, aqiBoxY + 114, getAqiLevelCN(aqiData.aqi), false, u8g2_font_wqy16_t_gb2312);

    // ---------- 指标网格 (右, 40-181) [高度增加到141] ----------
    int gridX = 130, gridY = 40, gridW = 264, gridH = 141;
    int cols = 4, rows = 3;
    int cellW = gridW / cols;   // 66
    int cellH = gridH / rows;   // 47 (刚好整除)

    struct Metric {
      const char* label;
      float value;
      const char* unit;
      int decimals;
    };
    Metric metrics[] = {
      {"PM2.5", aqiData.pm25, "ug/m3", 0},
      {"PM10",  aqiData.pm10, "ug/m3", 0},
      {"温度",  aqiData.t,    "C",     0},
      {"湿度",  aqiData.h,    "%",     0},
      {"O3",    aqiData.o3,   "ppb",   0},
      {"NO2",   aqiData.no2,  "ppb",   0},
      {"SO2",   aqiData.so2,  "ppb",   1},
      {"CO",    aqiData.co,   "mg/m3", 1},
      {"风速",  aqiData.w,    "m/s",   1},
      {"阵风",  aqiData.wg,   "m/s",   1},
      {"露点",  aqiData.dew,  "C",     1},
      {"气压",  aqiData.p,    "hPa",   0},
    };

    for (int i = 0; i < 12; i++) {
      int col = i % cols;
      int row = i / cols;
      int x = gridX + col * cellW;
      int y = gridY + row * cellH;
      int h = cellH; 

      display.drawRect(x, y, cellW, h, GxEPD_BLACK);

      // 标签 (稍微靠下一两像素，居中感更好)
      drawCN(x + 3, y + 4, metrics[i].label, false, u8g2_font_wqy12_t_gb2312);

      // 数值 (粗体)
      char valStr[12];
      if (metrics[i].decimals == 0)
        snprintf(valStr, sizeof(valStr), "%.0f", metrics[i].value);
      else
        snprintf(valStr, sizeof(valStr), "%.1f", metrics[i].value);
      drawBold(&FreeSansBold9pt7b, valStr, x + 3, y + h - 8);

      // 单位
      display.setFont(NULL);
      display.setTextSize(1);
      int16_t tx, ty; uint16_t tw, th;
      display.getTextBounds(metrics[i].unit, 0, 0, &tx, &ty, &tw, &th);
      display.setCursor(x + cellW - tw - 3, y + h - 11);
      display.print(metrics[i].unit);
    }

    // 中间分割线
    display.drawFastHLine(4, 183, W - 8, GxEPD_BLACK);

    // ---------- 预报区 (190-282) [高度由52增加至64，排版更宽松] ----------
    drawCN(6, 190, "PM2.5 七日预测", false, u8g2_font_wqy12_t_gb2312);
    drawCNRight(W - 6, 190, "紫外线预测", false, u8g2_font_wqy12_t_gb2312);

    int barStartX = 6;
    int barStartY = 204;
    int barAreaW  = 258;
    int barAreaH  = 64; 
    int barCount  = min(aqiData.pm25ForecastCount, 7);
    int barGap    = 4;
    int barW      = (barCount > 0) ? (barAreaW - (barCount - 1) * barGap) / barCount : barAreaW;

    int maxPm25 = 1;
    for (int i = 0; i < barCount; i++)
      if (aqiData.pm25Forecast[i].maxVal > maxPm25) maxPm25 = aqiData.pm25Forecast[i].maxVal;

    for (int i = 0; i < barCount; i++) {
      ForecastDay& f = aqiData.pm25Forecast[i];
      int x = barStartX + i * (barW + barGap);
      int maxH = (int)((float)f.maxVal / maxPm25 * (barAreaH - 14));
      int avgH = (int)((float)f.avg    / maxPm25 * (barAreaH - 14));

      display.drawRect(x, barStartY + barAreaH - 14 - maxH, barW, max(maxH, 1), GxEPD_BLACK);
      display.fillRect(x, barStartY + barAreaH - 14 - avgH, barW, max(avgH, 1), GxEPD_BLACK);

      char dayLabel[3];
      strncpy(dayLabel, f.day + 3, 2);
      dayLabel[2] = '\0';
      display.setFont(NULL);
      display.setTextSize(1);
      int16_t tx, ty; uint16_t tw, th;
      display.getTextBounds(dayLabel, 0, 0, &tx, &ty, &tw, &th);
      display.setCursor(x + (barW - tw) / 2, barStartY + barAreaH - 10);
      display.print(dayLabel);
    }

    // PM2.5 图例
    display.fillRect(barStartX, barStartY + barAreaH + 2, 6, 5, GxEPD_BLACK);
    drawCN(barStartX + 9, barStartY + barAreaH + 1, "均值", false, u8g2_font_wqy12_t_gb2312);
    display.drawRect(barStartX + 60, barStartY + barAreaH + 2, 6, 5, GxEPD_BLACK);
    drawCN(barStartX + 69, barStartY + barAreaH + 1, "最大", false, u8g2_font_wqy12_t_gb2312);

    // ---------- UV 紫外线小图表 ----------
    int uvX = 272, uvY = 204, uvW = W - uvX - 6, uvH = barAreaH;
    display.drawRect(uvX, uvY, uvW, uvH, GxEPD_BLACK);

    int uvCount  = min(aqiData.uviForecastCount, 6);
    int uvBarGap = 3;
    int uvBarW   = (uvCount > 0) ? (uvW - 6 - (uvCount - 1) * uvBarGap) / uvCount : uvW;

    int maxUvi = 1;
    for (int i = 0; i < uvCount; i++)
      if (aqiData.uviForecast[i].maxVal > maxUvi) maxUvi = aqiData.uviForecast[i].maxVal;

    for (int i = 0; i < uvCount; i++) {
      ForecastDay& u = aqiData.uviForecast[i];
      int x = uvX + 3 + i * (uvBarW + uvBarGap);
      int mH = (int)((float)u.maxVal / maxUvi * (uvH - 16));
      int aH = (int)((float)u.avg   / maxUvi * (uvH - 16));

      if (mH > 0) display.drawRect(x, uvY + uvH - 12 - mH, uvBarW, mH, GxEPD_BLACK);
      if (aH > 0) display.fillRect(x, uvY + uvH - 12 - aH, uvBarW, aH, GxEPD_BLACK);

      char dayL[3];
      strncpy(dayL, u.day + 3, 2);
      dayL[2] = '\0';
      display.setFont(NULL);
      display.setTextSize(1);
      display.setCursor(x, uvY + uvH - 10);
      display.print(dayL);
    }

    // ---------- 最底部状态栏 (286-300) [上方留出少许清爽白边] ----------
    display.fillRect(0, H - 14, W, 14, GxEPD_BLACK);
    display.setFont(NULL);
    display.setTextSize(1);
    display.setTextColor(GxEPD_WHITE);
    display.setCursor(6, H - 11);
    display.print("aqicn.org | ESP32-S3");

    char geoBot[24];
    snprintf(geoBot, sizeof(geoBot), "%.2fN %.2fE", aqiData.lat, aqiData.lon);
    int16_t tx, ty; uint16_t tw, th;
    display.getTextBounds(geoBot, 0, 0, &tx, &ty, &tw, &th);
    display.setCursor(W - tw - 6, H - 11);
    display.print(geoBot);

  } while (display.nextPage());
}

// ==================== 显示错误信息 ====================
void drawError(const char* msg) {
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.drawRect(5, 5, display.width() - 10, display.height() - 10, GxEPD_BLACK);
    display.setFont(NULL);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(2);
    display.setCursor(20, 40);
    display.print("ERROR");
    display.setTextSize(1);
    display.setCursor(20, 80);
    display.print(msg);
    display.setCursor(20, 100);
    display.print("Will retry in 30s...");
  } while (display.nextPage());
}

// ==================== 自动选择横屏方向 ====================
void chooseLandscapeRotation() {
  int candidates[4] = {1, 3, 0, 2};
  int chosen = 1;
  for (int i = 0; i < 4; i++) {
    display.setRotation(candidates[i]);
    if (display.width() > display.height()) {
      chosen = candidates[i];
      break;
    }
  }
  if (ROTATION_FLIP) {
    chosen = (chosen + 2) % 4;
    display.setRotation(chosen);
  }
  Serial.printf("Rotation = %d -> W=%d H=%d\n", chosen, display.width(), display.height());
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32-S3 Air Quality Monitor (v2.1) ===");

  SPI.begin(EPD_CLK, -1, EPD_MOSI, EPD_CS);

  display.init(115200, true, 2, false);
  chooseLandscapeRotation();

  u8f.begin(display);
  u8f.setFontMode(1);          
  u8f.setFontDirection(0);

  // 启动画面
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    drawCNCentered(display.width() / 2, 90, "空气质量监测站", false, u8g2_font_wqy16_t_gb2312);
    drawCNCentered(display.width() / 2, 130, "正在连接 WiFi...", false, u8g2_font_wqy14_t_gb2312);
  } while (display.nextPage());

  connectWiFi();

  if (fetchAqiData()) {
    drawUI();
  } else {
    drawError("Failed to fetch data");
  }

  display.powerOff();
}

// ==================== LOOP ====================
void loop() {
  delay(UPDATE_INTERVAL_MS);

  Serial.println("Refreshing data...");

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (fetchAqiData()) {
    display.init(115200, true, 2, false);
    chooseLandscapeRotation();
    drawUI();
    display.powerOff();
    Serial.println("Screen updated successfully.");
  } else {
    Serial.println("Data fetch failed, will retry next cycle.");
  }
}
```

### 코드 설명

첫 번째, `connectWiFi()`에서는 표준 WiFi 연결을 처리해요. 40번(20초) 재시도하고 시간 초과해도 멈추지 않고 계속 진행해요. 오프라인 상태에서도 검은 화면 대신 에러 메시지를 먼저 볼 수 있게 하려는 거예요.

두 번째, `fetchAqiData()`는 `HTTPClient`로 AQICN의 `/feed/@도시ID/` 인터페이스를 호출해요. JSON을 받은 뒤 `ArduinoJson`의 `JsonDocument`로 파싱해서, 현재 12개 지표와 향후 며칠간의 PM2.5/PM10/자외선 예측 배열까지 `AqiData` 구조체에 필드별로 채워 넣어요.

세 번째, `drawUI()`는 그림 그리기의 핵심이에요. '제목 표시줄 → AQI 큰 박스 → 12개 지표 그리드 → 예측 막대그래프 → 하단 상태 표시줄' 순서로 블록별로 그려요. 각 블록의 좌표는 하드코딩된 픽셀 값이라 레이아웃을 뜯어고치기 쉬워요.

네 번째, 중국어는 `U8g2_for_Adafruit_GFX`라는 브리지 계층을 통해 그려요. `drawCN` 시리즈 함수는 검은 바탕 흰 글자/흰 바탕 검은 글자 두 가지 모드를 통합해 캡슐화해서, 매번 색상을 반복 설정하지 않아도 돼요.

다섯 번째, `loop()`에서는 30분마다 한 번씩 새로고침해요. 화면을 다시 초기화한 뒤 `drawUI()`를 호출하고, 다 끝나면 바로 `powerOff()`로 전원을 끊어요. 이게 전자종이를 절전하고 패널을 보호하는 핵심이에요—갱신하지 않을 때는 전원을 아예 공급하지 않아도 돼요.

## 자주 묻는 문제 해결

너무 걱정하지 마세요. 문제의 80%는 아래 몇 군데서 나와요.

**화면이 계속 하얗게 나오거나 깨져요**: 먼저 배선을 점검하세요. 특히 CS, DC, RES, BUSY 네 가지 제어 선이 순서대로 꽂혀 있는지 살펴요. 그 다음 `display.init()` 안의 드라이버 클래스 `GxEPD2_420_GYE042A87`가 손에 있는 패널의 실제 모델과 일치하는지 확인하세요. 모델이 다르면 타이밍이 꼬여요.

**중국어가 네모나 깨진 글자로 나와요**: `U8g2_for_Adafruit_GFX`가 제대로 초기화되지 않은 거예요. `u8f.begin(display)`가 `display.init()` 뒤에 호출되는지, 그리고 사용 중인 폰트(예: `u8g2_font_wqy14_t_gb2312`)에 표시하려는 한자가 들어 있는지 확인하세요.

**WiFi에 연결 안 돼요**: 개발 보드가 2.4GHz만 지원하고 5GHz WiFi는 지원하지 않는지 확인하세요. SSID나 비밀번호에 중국어나 특수문자가 있어 이스케이프 문제가 생기진 않았는지도 살펴요.

**API가 반환하는 데이터가 전부 0이에요**: 십중팔구 `API_TOKEN`을 발급받지 않았거나 잘못 적은 거예요. `API_URL`의 도시 ID(예: `@14370`)가 잘못됐을 수도 있어요. 먼저 브라우저로 이 주소를 직접 열어 정상 JSON이 반환되는지 확인하세요.

**화면이 위아래로 뒤집혀요**: 코드의 `ROTATION_FLIP`을 0에서 1로 바꾸고 다시 업로드하면 돼요. 배선을 바꿀 필요는 없어요.

**컴파일할 때 '공간 부족 / region `app' overflowed' 에러**: 중국어 폰트가 너무 커서 기본 파티션을 넘쳐난 거예요. 앞의 '업로드 설정: 파티션 방식' 섹션대로 `Partition Scheme`을 `Huge APP (3MB No OTA/1MB SPIFFS)`로 바꾸고 다시 컴파일하면 돼요.

## FAQ

**Q: ESP32-S3 대신 일반 ESP32를 써도 되나요?** A: 돼요. 핀이 SPI를 지원하고 개발 보드가 점거하는 특수 핀(Flash 관련 핀 등)만 아니면 돼요. 코드의 6개 `EPD_*` 매크로 정의를 실제 배선의 GPIO 번호로 바꾸면 나머지 코드는 건드리지 않아도 돼요.

**Q: GxEPD2_420_GYE042A87 드라이버가 제 화면과 안 맞아요. 어떡하죠?** A: GxEPD2 라이브러리의 GitHub 저장소에서 해당 모델의 드라이버 클래스 이름을 찾아보세요. `display`를 정의한 줄만 바꾸면 되고, 다른 그리기 코드는 보통 손대지 않아도 돼요.

**Q: 새로고침 한 번에 왜 이렇게 오래 걸리나요? 더 빠르게 할 순 없나요?** A: 흑백 전자종이의 전체 새로고침(Full Refresh) 자체가 느려요. 하드웨어 특성이라 코드 문제가 아니에요. 일부 숫자만 갱신하려면 GxEPD2의 부분 갱신(Partial Update) 인터페이스를 시도해 볼 수 있지만 잔상이 남을 수 있어요.

**Q: AQICN API의 무료 할당량이 충분한가요?** A: AQICN 개인 Token의 무료 할당량은 보통 분당 1000회 요청이에요. 이 프로젝트는 30분에 한 번만 요청하니 충분하고, 초과 걱정은 안 하셔도 돼요.

**Q: ESP32-S3가 새로고침하지 않을 때 소비 전력은 대략 어떻게 되나요?** A: 코드에는 딥 슬립을 넣지 않았고 `loop()`에서 `delay()`로 대기해요. 실측 전력은 수십 mA 수준이에요. 배터리 버전을 만든다면 `delay(UPDATE_INTERVAL_MS)`를 `esp_deep_sleep`으로 바꾸는 걸 추천해요. 그러면 전력이 µA 단위까지 떨어져요.

**Q: 화면이 계속 새로고침되지 않는데 시리얼 모니터에는 데이터 가져오기 성공으로 떠요. 어떡하죠?** A: `drawUI()` 안의 `display.firstPage()/nextPage()` 루프가 도중에 `return`으로 끊기지 않았는지 확인하세요. GxEPD2는 이 루프가 온전히 한 바퀴 돌아야만 화면에 그림을 밀어 넣어요.

## 더 해볼 만한 것

- SD 카드에서 로컬 도시 목록을 읽어 여러 도시를 돌려가며 보여주는 대시보드로 만들기
- 버튼 하나 달기: 짧게 누르면 수동 새로고침, 길게 누르면 딥 슬립 절전 모드로 전환
- 30분 업데이트 간격을 조도 센서 읽기로 바꿔서, 어두워지면 자동으로 새로고침 빈도 낮추기

## 참고 자료

- [GxEPD2 라이브러리 GitHub 홈](https://github.com/ZinggJM/GxEPD2)
- [ArduinoJson 공식 문서](https://arduinojson.org/)
- [U8g2_for_Adafruit_GFX GitHub 홈](https://github.com/olikraus/U8g2_for_Adafruit_GFX)
- [AQICN 공기질 API 문서](https://aqicn.org/api/)
- [Espressif ESP32-S3 제품 페이지](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
