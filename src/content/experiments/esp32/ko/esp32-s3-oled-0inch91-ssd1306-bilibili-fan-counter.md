---
title: "ESP32-S3 + 0.91인치 OLED로 만드는 데스크톱 Bilibili 팔로워 '스트레스 해소' 카운터｜스프링 댐핑 물리 흔들림 탑재"
boardId: esp32s3
moduleId: display/oled091-ssd1306
category: esp32
date: 2026-06-27
intro: "ESP32-S3과 0.91인치 SSD1306 OLED(128×32)로 데스크톱 Bilibili 팔로워 카운터를 만들어봐요. 숫자가 변할 때 부드러운 스프링 댐핑 물리 반동 애니메이션이 함께 나타납니다. I2C 4선 배선 + Arduino C++ 전체 코드와 주의사항 가이드를 함께 제공해요."
image: "https://img.lingflux.com/2026/06/e53fb5a7bdaee8448584fb9f21aa504d.jpg"
---

> **한 줄 요약**: ESP32-S3 + 0.91" OLED + Bilibili API로 '스프링 댐핑 반동'이 있는 데스크톱 팔로워 카운터를 만들어, 매일 휴대폰을 꺼내 데이터를 새로고침하던 수고를 덜어보세요.

# ESP32-S3 + 0.91" OLED로 만드는 데스크톱 Bilibili 팔로워 '스트레스 해소' 카운터 (스프링 댐핑 물리 흔들림 탑재!)

난이도: ⭐⭐☆☆☆ (초보자도 시작 가능)
예상 소요 시간: 30분
테스트 환경: Arduino IDE 2.3.8 + ESP32 보드 지원 패키지 v3.3.10 + U8g2 v2.36.19 + ArduinoJson v7.4.3

> **TL;DR (빠른 시작):**
>
> 1. 배선: ESP32-S3 GPIO 14 → OLED SDA, GPIO 13 → OLED SCL, 그리고 3.3V와 GND를 연결하세요.
> 2. 확인: 화면 전원이 정상인지 확인하고, I2C 핀을 반대로 꽂지 않도록 주의하세요.
> 3. 라이브러리 설치: Arduino IDE에서 `U8g2` (저자: oliver)와 `ArduinoJson` (저자: Benoit Blanchon)을 검색해서 설치하세요.
> 4. 설정 변경: 전체 코드에서 본인의 Wi-Fi 계정/비밀번호와 Bilibili UID로 교체한 뒤 바로 업로드하면, 부드러운 기계식 반동 애니메이션과 함께 팔로워 수가 화면에 떠오를 때까지 기다리기만 하면 됩니다!

---

## 들어가며

이 작은 OLED 화면으로 중독성 있고 스트레스 해소되는 데스크톱 Bilibili 팔로워 카운터를 만들어봤어요! 더 이상 데이터를 확인하려고 휴대폰을 꺼내지 않아도 돼요.

---

## 완성 결과

최종적으로 완성한 결과는 우아한 3단 정교 레이아웃이에요. 왼쪽에는 세로로 배열된 강렬한 "FANS" 레이블과 기계식 표시 화살표, 가운데에는 이번 실험의 핵심인 24픽셀 높이의 순수 숫자 굵은 글씨, 부분 클리핑 윈도우가 있는 **물리 댐핑 스크롤 휠 대형 숫자**가 자리 잡고 있어요. 오른쪽에는 오늘의 팔로워 증감(자동으로 오늘의 등락폭을 계산하고 상승/하강 삼각 화살표 표시)과 시스템 Wi-Fi 신호 강도 및 하트비트 표시등이 표시돼요.

![](https://img.lingflux.com/2026/06/13648c6923d1cb24486cb082105d8d59.jpg)

---

## 부품 소개

### 0.91" OLED 화면 (SSD1306)

이 프로젝트에서는 핵심 개발 보드(ESP32-S3) 외에 가장 중요한 부품이 바로 이 **0.91" OLED 화면**이에요.

0.91" OLED 화면은 '자체 발광하는 동시 통역사'처럼, ESP32-S3이 네트워크에서 가져온 팔로워 숫자를 실시간으로 눈에 보이는 픽셀 매트릭스로 변환해주는 역할을 해요. 각 픽셀이 스스로 빛을 내기 때문에 전통적인 LCD 같은 두꺼운 백라이트 패널이 필요 없어서, 콘트라스트가 매우 높고 검은색은 깊게, 밝은색은 눈부시게 표현돼요. 이 프로젝트에서 선택한 이유는 크기가 매우 작고, 가격도 합리적이며, I2C로 배선 시 단 4선만으로 구동할 수 있어서 데스크톱용 정교한 소형 장식품을 만들기에 아주 적합하기 때문이에요.

| 주요 사양 | 값 |
| --- | --- |
| 구동 칩 | SSD1306 |
| 해상도 | 128 x 32 픽셀 |
| 통신 인터페이스 | I2C (IIC) |
| 작동 전압 | 3.3V ~ 5V |
| 표시 색상 | 일반적으로 순백색 또는 순청색 |

---

## 부품 목록(BOM)

| 부품명 | 사양/모델 | 수량 | 용도 |
| --- | --- | --- | --- |
| ESP32-S3 개발 보드 | 임의의 표준 듀얼 Type-C 인터페이스 버전 | 1 | 메인 컨트롤러, 네트워크 데이터 수집 및 물리 애니메이션 계산 담당 |
| 0.91" OLED 모듈 | SSD1306 구동 / 4핀 I2C 인터페이스 | 1 | 화면 표시 및 물리 클리핑 윈도우 애니메이션 표현 |
| 점퍼 와이어 | 암-암 / 수-암 (개발 보드에 따라) | 4 | 개발 보드와 화면 핀 연결 |

---

## 핀 설명 및 배선

> 💡 **실용 팁:** 배선을 마친 뒤 아래 표를 보며 하나씩 확인하는 것을 권장해요. 일반적으로 무음, 검은 화면, 기기 과열 문제의 80%는 배선 실수에서 발생해요. 10초만 더 확인하면 트러블슈팅에 드는 시간을 크게 줄일 수 있어요!

| OLED 화면 핀 | ESP32-S3 핀 | 핀 기능 설명 |
| --- | --- | --- |
| GND | GND | 접지 (같은 언어를 공유하는 기준선) |
| VCC | 3.3V (또는 3V3) | 전원 입력 |
| SCL | GPIO 13 | I2C 클럭 신호선 |
| SDA | GPIO 14 | I2C 데이터 신호선 |

---

## 설치할 라이브러리

Arduino IDE 2.x에서 왼쪽의 '라이브러리 매니저' 아이콘을 클릭(또는 `Ctrl+Shift+I`)한 뒤, 아래 오픈소스 라이브러리의 지정된 테스트 통과 버전을 각각 검색해서 설치하세요.

1. **U8g2** (저자: oliver) — 테스트 통과 버전: `v2.36.19` 이상. OLED 화면 구동에 사용되며, 정밀 클리핑 윈도우(Clip Window)를 지원해요.
2. **ArduinoJson** (저자: Benoit Blanchon) — 테스트 통과 버전: `v7.4.3`. Bilibili API가 반환하는 JSON 데이터를 파싱하는 데 사용돼요.

---

## 전체 코드 + 설명

아래 전체 코드를 Arduino IDE에 복사하세요. 업로드하기 전에 **반드시 코드 안의 `const char* ssid`와 `password`를 본인의 Wi-Fi 계정/비밀번호로 수정하고, `uid`를 모니터링할 Bilibili 사용자 UID로 교체**하세요.

```cpp
/**
 * =========================================================================
 * ESP32-S3 0.91" OLED (128x32 SSD1306) Bilibili 팔로워 표시기 궁극 융합 버전
 * =========================================================================
 * 특징: 정교한 3단 레이아웃 + 정통 스프링 댐핑 반동 물리 흔들림 엔진
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Preferences.h>
#include <time.h>

// ================== 디버그 스위치 ==================
#define DEBUG_SIMULATE   0     // 【중요】1=시뮬레이션 데이터 활성화(네트워크 연결 없이 애니메이션 테스트), 0=실제 API 사용
#define SIM_INTERVAL_MS  2000  // 시뮬레이션 데이터 변화 간격(ms)
#define SIM_START_VALUE  9985  // 시뮬레이션 시작 팔로워 수 (9985로 설정하면 5자리로 점프하는 흔들림 특수효과를 빠르게 관찰 가능)

// ================== 사용자 설정 ==================
const char* ssid     = "YOUR_WIFI_SSID";      // 본인의 Wi-Fi 이름으로 변경
const char* password = "YOUR_WIFI_PASSWORD";  // 본인의 Wi-Fi 비밀번호로 변경
const char* uid      = "YOUR_BILIBILI_UID";   // 모니터링할 Bilibili UID로 변경

String biliApiUrl = "https://api.bilibili.com/x/relation/stat?vmid=" + String(uid);
const unsigned long FETCH_INTERVAL = 30 * 60 * 1000; // 30분마다 네트워크로 데이터 갱신

#define OLED_SDA 14
#define OLED_SCL 13
#define SCREEN_CONTRAST 255

// 애니메이션 파라미터
#define SCROLL_EASING    0.18f   // 기본 스프링 장력 계수
#define ANIM_FPS         60      // 애니메이션 프레임 속도
#define ANIM_INTERVAL    (1000/ANIM_FPS)

// U8g2 생성자 초기화
U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

// ================== 상태 변수 ==================
long targetFollowers = 0;
long todayBaseFollowers = 0;
long todayAdded = 0;
bool isInitialFetch = true;
bool connectionError = false;

unsigned long lastFetchTime = 0;
unsigned long lastAnimTime = 0;
unsigned long lastSimTime = 0;

Preferences preferences; // 오늘의 초기 팔로워 수를 Flash에 안전하게 저장, 전원 차단 시에도 유지

// ================== 핵심 물리 댐핑 진동 엔진 ==================
#define MAX_DIGITS 7

class DigitWheel {
public:
  float currentY = 0.0f;
  int   targetDigit = 0;
  float velocity = 0.0f;  // 스프링 댐핑 핵심 속도 변수

  void update(float easing) {
    float diff = (float)targetDigit - currentY;

    // 최단 경로 원칙으로 순환 스크롤 처리 (0 <-> 9)
    if (diff > 5.0f)  diff -= 10.0f;
    if (diff < -5.0f) diff += 10.0f;

    if (fabs(diff) > 0.005f) {
      // 정통 물리 모델: 훅의 법칙 + 점성 댐핑, 부드러운 반동과 감쇠 흔들림 생성
      float accel = diff * easing - velocity * 0.25f;
      velocity += accel;
      currentY += velocity;

      // 순환 범위 제약
      while (currentY >= 10.0f) currentY -= 10.0f;
      while (currentY < 0.0f)   currentY += 10.0f;
    } else {
      currentY = (float)targetDigit;
      velocity = 0.0f; // 안정 정지
    }
  }
};

DigitWheel wheels[MAX_DIGITS];

// 전방 선언
void drawUI();
void drawLeftPanel();
void drawBigOdometer();
void drawRightPanel();
void drawWifiIcon(int x, int y);
void fetchBiliData();
void checkNewDayReset();

// ================== 초기화 ==================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Bilibili OLED Monitor Deluxe ===");

  Wire.begin(OLED_SDA, OLED_SCL);
  u8g2.begin();
  u8g2.setContrast(SCREEN_CONTRAST);
  u8g2.enableUTF8Print();

  // 1단계: 우아한 시작 화면 그리기
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_7x13B_tr);
  u8g2.drawStr(20, 14, "BiliBili");
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(28, 28, "Fan Monitor");
  u8g2.sendBuffer();
  delay(800);

  preferences.begin("bilibili", false);
  todayBaseFollowers = preferences.getLong("base_fans", 0);

#if DEBUG_SIMULATE
  Serial.println("[SIM MODE] Simulation mode active");
  targetFollowers = SIM_START_VALUE;
  if (todayBaseFollowers == 0) {
    todayBaseFollowers = targetFollowers - 10; // 오늘 이미 10 증가한 것으로 사전 설정
  }
  todayAdded = targetFollowers - todayBaseFollowers;
  isInitialFetch = false;
#else
  // 2단계: 로컬 무선 네트워크 연결
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(4, 14, "WiFi connecting...");
  u8g2.drawStr(4, 28, ssid);
  u8g2.sendBuffer();

  WiFi.begin(ssid, password);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 30) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK: " + WiFi.localIP().toString());
    // 3단계: 자정 자동 리셋을 위한 시간 서비스 설정
    configTime(8 * 3600, 0, "ntp.aliyun.com", "time.windows.com");
    fetchBiliData();
  } else {
    Serial.println("\nWiFi failed");
    connectionError = true;
    targetFollowers = 0;
  }
#endif
}

// ================== 메인 루프 ==================
void loop() {
  unsigned long now = millis();

#if DEBUG_SIMULATE
  // 시뮬레이션 데이터 로직: 안정적으로 점프하여 여러 자리 휠이 동시에 반동하는 흥미로운 동적 변화 관찰
  if (now - lastSimTime >= SIM_INTERVAL_MS) {
    lastSimTime = now;
    int delta = random(-2, 6); // -2에서 +5 사이의 무작위 등락 증가 생성
    targetFollowers += delta;
    if (targetFollowers < 0) targetFollowers = 0;
    todayAdded = targetFollowers - todayBaseFollowers;
    Serial.printf("[SIM] target=%ld (delta=%+d) today=%+ld\n", targetFollowers, delta, todayAdded);
  }
#else
  // 정기적으로 실제 네트워크 데이터 가져오기
  if (now - lastFetchTime >= FETCH_INTERVAL || lastFetchTime == 0) {
    fetchBiliData();
    lastFetchTime = now;
  }
  checkNewDayReset();
#endif

  // 4단계: 핵심 애니메이션 갱신 (안정적인 60FPS 풀프레임 구동)
  if (now - lastAnimTime >= ANIM_INTERVAL) {
    lastAnimTime = now;

    // 전체 팔로워 수를 각 자리에 대응하는 독립적인 휠 목표값으로 분해
    long temp = targetFollowers;
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      wheels[i].targetDigit = temp % 10;
      temp /= 10;
    }

    // 물리 엔진 갱신, 상위 자리 캐스케이드 지연을 융합하여 여러 자리 숫자 변동에 더 풍부한 엇갈린 입체감 부여
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      float ease = SCROLL_EASING * (1.0f - i * 0.012f);
      if (ease < 0.07f) ease = 0.07f;
      wheels[i].update(ease);
    }

    // 5단계: 전체 캔버스 렌더링 출력
    u8g2.clearBuffer();
    drawUI();
    u8g2.sendBuffer();
  }
}

// ================== UI 레이아웃 그리기 (3단 정통 설계) ==================
void drawUI() {
  drawLeftPanel();    // 왼쪽 세로 레이블
  drawBigOdometer();  // 가운데 물리 휠 대형 숫자
  drawRightPanel();   // 오른쪽 증감 및 신호
}

void drawLeftPanel() {
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(2, 7,  "F");
  u8g2.drawStr(2, 14, "A");
  u8g2.drawStr(2, 21, "N");
  u8g2.drawStr(2, 28, "S");

  u8g2.drawVLine(9, 2, 28); // 세로 구분선
  u8g2.drawTriangle(11, 14, 11, 18, 14, 16); // 큰 숫자를 향하는 기계식 화살표
}

void drawRightPanel() {
  int rx = 102; // 오른쪽 패널 시작 X축
  u8g2.drawVLine(rx - 2, 2, 28); // 오른쪽 구분선

  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(rx, 6, "TODAY");

  u8g2.setFont(u8g2_font_5x7_tr);
  char buf[8];
  if (todayAdded >= 0) {
    u8g2.drawTriangle(rx, 14, rx + 4, 14, rx + 2, 10); // 상승 삼각
    snprintf(buf, sizeof(buf), "%ld", todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  } else {
    u8g2.drawTriangle(rx, 10, rx + 4, 10, rx + 2, 14); // 하강 삼각
    snprintf(buf, sizeof(buf), "%ld", -todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  }

  u8g2.setFont(u8g2_font_4x6_tr);
#if DEBUG_SIMULATE
  u8g2.drawStr(rx, 24, "SIM");
  if ((millis() / 400) % 2) u8g2.drawDisc(rx + 17, 22, 1); // 시뮬레이션 하트비트 점멸
#else
  if (connectionError) {
    u8g2.drawStr(rx, 24, "ERR");
  } else {
    u8g2.drawStr(rx, 24, "ON");
  }
#endif

  drawWifiIcon(rx + 12, 27); // 신호 바 그리기
}

void drawWifiIcon(int x, int y) {
#if DEBUG_SIMULATE
  int bars = 3;
#else
  int bars = 0;
  if (WiFi.status() == WL_CONNECTED) {
    int rssi = WiFi.RSSI();
    if (rssi > -60)      bars = 3;
    else if (rssi > -75) bars = 2;
    else                 bars = 1;
  }
#endif
  for (int i = 0; i < 3; i++) {
    int h = (i + 1) * 2;
    if (i < bars) {
      u8g2.drawBox(x + i * 3, y - h, 2, h);
    } else {
      u8g2.drawFrame(x + i * 3, y - h, 2, h);
    }
  }
}

// ================== 핵심 휠 렌더링 (부분 Clip 정밀 윈도우 포함) ==================
void drawBigOdometer() {
  u8g2.setFont(u8g2_font_logisoso24_tn); // 24픽셀 높이 초대형 강렬한 숫자 굵은 글씨

  int charW = 14;      // 단일 숫자 자폭 너비
  int areaTop = 4;     // 스크롤 윈도우 상단 가장자리
  int areaBot = 28;    // 스크롤 윈도우 하단 가장자리
  int areaH = areaBot - areaTop; // 윈도우 유효 높이 (24px)
  int baseline = areaBot;        // 폰트 베이스라인 높이

  // 유효 자릿수를 동적으로 계산하여 완벽한 좌측 자기 중심 정렬 구현
  long absVal = targetFollowers;
  int needDigits = 1;
  long t = absVal;
  while (t >= 10) { t /= 10; needDigits++; }
  if (needDigits > MAX_DIGITS) needDigits = MAX_DIGITS;

  int totalW = needDigits * charW;
  int startX = 14 + (88 - totalW) / 2;
  if (startX < 14) startX = 14;

  // 각 자리별로 물리 반동 피드백을 가진 숫자 렌더링
  for (int idx = 0; idx < needDigits; idx++) {
    int wheelIdx = MAX_DIGITS - needDigits + idx;
    int x = startX + idx * charW;

    float currYVal = wheels[wheelIdx].currentY;
    int digitLower = (int)currYVal;
    int digitUpper = (digitLower + 1) % 10;
    float fraction = currYVal - digitLower;

    // 【핵심 클리핑 제어】: 현재 자리 숫자에 맞춤 부분 클리핑 윈도우를 설정, 숫자가 상하 가장자리를 벗어나면 자동으로 숨김
    u8g2.setClipWindow(x - 1, areaTop, x + charW, areaBot);

    // 현재 숫자는 장력을 받아 위로 미끄러져 나감
    int yLower = baseline - (int)(fraction * areaH);
    char bufL[2] = { (char)('0' + digitLower), 0 };
    u8g2.drawStr(x, yLower, bufL);

    // 새로운 다음 숫자가 아래에서 윈도우로 돌입, 정위치 도달 시 운동 에너지가 풍부한 반동 발생
    int yUpper = baseline + areaH - (int)(fraction * areaH);
    char bufU[2] = { (char)('0' + digitUpper), 0 };
    u8g2.drawStr(x, yUpper, bufU);

    u8g2.setMaxClipWindow(); // 현재 자리 렌더링 완료 후 즉시 전체 화면 캔버스로 복원
  }
}

// ================== 네트워크 데이터 수집 ==================
#if !DEBUG_SIMULATE
void fetchBiliData() {
  if (WiFi.status() != WL_CONNECTED) {
    connectionError = true;
    return;
  }
  Serial.println("Requesting Bilibili API...");
  WiFiClientSecure client;
  client.setInsecure(); // SSL 인증서 강제 검증 생략, 가벼운 연결 보장
  HTTPClient http;
  http.begin(client, biliApiUrl);
  http.setUserAgent("Mozilla/5.0 (ESP32)");
  http.addHeader("Referer", "https://space.bilibili.com/");

  int code = http.GET();
  if (code == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, payload)) {
      long fans = doc["data"]["follower"].as<long>();
      if (fans > 0) {
        targetFollowers = fans;
        connectionError = false;
        if (isInitialFetch) {
          if (todayBaseFollowers == 0) {
            todayBaseFollowers = fans;
            preferences.putLong("base_fans", fans);
          }
          isInitialFetch = false;
        }
        todayAdded = targetFollowers - todayBaseFollowers;
        Serial.printf("Fetch Success! Fans=%ld Today=%+ld\n", targetFollowers, todayAdded);
      }
    } else {
      connectionError = true;
    }
  } else {
    Serial.printf("HTTP Code Error: %d\n", code);
    connectionError = true;
  }
  http.end();
}

void checkNewDayReset() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;
  static int lastResetDay = -1;
  // 자정 정각에 오늘의 기준값 갱신 트리거
  if (timeinfo.tm_hour == 0 && timeinfo.tm_min == 0 && timeinfo.tm_mday != lastResetDay) {
    lastResetDay = timeinfo.tm_mday;
    todayBaseFollowers = targetFollowers;
    preferences.putLong("base_fans", todayBaseFollowers);
    todayAdded = 0;
    Serial.println("[RTC] Midnight detected. Resetting today's base counter.");
  }
}
#endif
```

### 코드 핵심 단계 설명

1. **시작 화면 그리기**: `setup()` 안에서 `u8g2.drawStr()`을 호출해 처음 등장하는 애니메이션 로고를 그려 시스템에 시각적 버퍼를 제공해요.
2. **Wi-Fi 및 시간 초기화**: `WiFi.begin()`으로 네트워크에 연결하고, `configTime()`으로 알리윤 NTP 시간 서버를 마운트하여 자정을 정확하게 포착해요.
3. **데이터 요청 위장**: `http.setUserAgent()`와 `addHeader("Referer", ...)`를 통해 ESP32를 정상적인 PC 브라우저 요청으로 위장해 Bilibili의 안티 크롤링 메커니즘에 차단되지 않도록 해요.
4. **스프링 댐핑 물리 반복**: `DigitWheel::update`에서 고전 물리 공식(가속도 = 거리 × 장력 계수 − 속도 × 댐핑 계수)을 적용해 속도 값을 동적으로 감쇠시켜요. 이것이 바로 생경하게 스쳐 지나가는 대신 중독성 있는 기계식 반동을 만들어내는 핵심이에요!
5. **부분 클리핑 윈도우(Clip Window) 제어**: 숫자를 렌더링할 때 `u8g2.setClipWindow(x, 4, w, 28)`로 이 중간 높이 안에서만 픽셀을 표시하도록 규정하고, 이 영역을 벗어나면 즉시 숨김 처리하여 실제 휠 슬롯머신의 기계식 틈새감을 완벽하게 흉내 내요.

---

## 문제 해결

당황하지 마세요! 초보자의 95%는 이런 소형 하드웨어 프로젝트를 만들 때 아래 몇 가지에서 문제를 겪어요.

* **화면이 까맣게 나오고 아무것도 표시되지 않아요**:
  1. 먼저 배선 확인: 화면의 VCC가 3.3V에 연결돼 있는지, GND가 느슨하지 않은지 확인하세요.
  2. SDA와 SCL 핀이 반대로 꽂히지 않았는지 확인하세요. 코드에서 지정한 것은 `SDA -> 14`, `SCL -> 13`이에요.
  3. OLED 화면의 구동 칩이 정통 `SSD1306`인지 확인하세요. 시장에는 생김새가 같은 극소수의 화면이 `SH1106`을 사용하는 경우도 있어요. 후자라면 U8g2의 생성자 초기화 함수를 교체해야 해요.

* **오른쪽 상태가 계속 "ERR"로 표시돼요**:
  1. 네트워크 요청이나 파싱에 오류가 발생했다는 뜻이에요. `ssid`와 `password`가 올바르게 설정됐는지 확인하세요. 참고로 ESP32는 **5G 대역 Wi-Fi를 지원하지 않으므로**, 반드시 2.4G 대역 무선 네트워크나 휴대폰 핫스팟에 연결하세요.
  2. UID를 올바르게 입력했는지 확인하세요. 브라우저에서 `https://api.bilibili.com/x/relation/stat?vmid=본인UID`를 열어 올바른 JSON 데이터가 반환되는지 확인해 볼 수 있어요.

---

## FAQ

**Q: 다른 GPIO 핀으로 화면을 연결해도 되나요?**
A: 물론이죠! 코드 상단의 `#define OLED_SDA 14`와 `#define OLED_SCL 13`에서 숫자를 ESP32-S3 개발 보드의 임의의 사용 가능한 핀 번호로 바꾸기만 하면 돼요. 변경 후에는 점퍼 와이어도 함께 옮겨 꽂는 것을 잊지 마세요.

**Q: 업로드 후 숫자가 0에서 멈춰서 전혀 움직이지 않는 이유는 뭔가요?**
A: 코드의 `#define DEBUG_SIMULATE`가 기본적으로 `0`(실제 네트워크 수집 사용)으로 설정돼 있기 때문이에요. 네트워크 수집 주기가 30분으로 설정돼 있어서, 부팅 직후에는 Wi-Fi가 아직 연결 중이라 첫 프레임을 가져오지 못했을 수 있어요. 이 매크로를 `1`로 바꿔 시뮬레이션 모드를 켜면, 숫자가 2초마다 무작위로 점프하며 흔들림 애니메이션을 미친 듯이 발생시키는震撼적인 효과를 바로 볼 수 있어요!

**Q: 새로고침을 더 자주 하려면 어떻게 바꾸나요?**
A: 설정 영역의 `const unsigned long FETCH_INTERVAL = 30 * 60 * 1000;`을 수정하면 돼요. 단, 너무 자주 설정(예: 10초 미만)하면 Bilibili 인터페이스에 잦은 요청으로 인해 공용 IP가 서버에 의해 일시적으로 차단될 수 있으니 권장하지 않아요.

**Q: 전원을 끄면 오늘 증가한 팔로워 수가 0으로 초기화되나요?**
A: 아닙니다! 코드 내부에서 ESP32의 `Preferences` 라이브러리를 호출해요. 새로운 날로 넘어가 기준 팔로워 수를 성공적으로 포착할 때마다, 이 숫자를 ESP32 내부 Flash 칩에 안전하게 저장해요. 완전히 전원을 뽑더라도, 다시 부팅하면 오늘의 최초 팔로워 시작점을 기억해서 오늘의 증감을 정확하게 계산해요.

**Q: 이 물리 효과를 더 큰 해상도 화면(예: 128x64)으로 옮길 수 있나요?**
A: 당연히 가능해요. `drawBigOdometer()` 함수 안에는 높이 제어 전용 변수 `areaTop`, `areaBot`, `baseline` 및 폰트 설정이 있어요. 큰 화면으로 바꾸려면 클리핑 윈도우 영역 좌표를 비례에 맞춰 확대하고 더 큰 U8g2 굵은 폰트(예: logisoso42 등)로 교체하면 더 큰 스크롤 휠 특수효과를 얻을 수 있어요.

**Q: 화면에 표시되는 신호 강도가 항상 만格里이거나 정확하지 않은 이유는요?**
A: `drawWifiIcon`에서 읽어오는 것은 `WiFi.RSSI()`(수신 신호 강도 표시)예요. 코드는 `-60dBm`과 `-75dBm` 두 개의 하드 임계값으로 3단계를 나눠요. 기기가 무선 라우터와 가까우면 일반적으로 신호가 3칸 만格里 상태로 안정적으로 유지돼요.

---

## 더 발전시키기

이 실험을 마치면 여러분의 하드코어 긱 데스크탑이 윤곽을 드러내기 시작할 거예요. 다음 단계로 이렇게 개조해 볼 수 있어요.

* **다중 플랫폼 모니터링 연동**: API 파서를 하나 더 작성해서, 화면이 10초마다 'Bilibili 팔로워 수'와 'Douyin/GitHub 팔로워 수' 사이에서 부드럽게 스크롤 전환되도록 만들어보세요.
* **진동 모터 추가**: 개발 보드 핀에 초소형 평평한 진동 모터를 연결하고, 팔로워 수가 증가할 때마다 모터가 숫자 스크롤 리듬에 맞춰 미세한 '다다다' 기계식 촉각 피드백을 내게 하면 스트레스 해소 효과가 두 배가 돼요!
* **케이스 3D 프린팅 추가**: ESP32와 OLED 화면을 위한 레트로 TV 모양의 미니 3D 프린팅 케이스를 디자인하면 순식간에 데스크톱 예술품으로 탈바꿈해요.

---

## 참고 자료

* [Espressif 공식 ESP32-S3 데이터시트 및 하드웨어 설계 가이드](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
* [U8g2 공식 GitHub 오픈소스 홈페이지 및 고해상도 폰트 핀 설정 설명](https://github.com/olikraus/u8g2)
* [ArduinoJson 공식 고효율 파싱 및 스트리밍 파싱 예제 가이드](https://arduinojson.org/)
