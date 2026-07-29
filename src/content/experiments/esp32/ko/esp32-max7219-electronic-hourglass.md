---
title: "ESP32로 MAX7219 구동해 전자 모래시계 만들기｜SPI 배선 + 45° 회전 물리 엔진 소스코드"
boardId: esp32
moduleId: lighting/max7219-dot-matrix
category: esp32
date: 2026-07-29
intro: "ESP32 한 개와 MAX7219 8×8 도트 매트릭스 두 개로, 인터넷에서 화제된 전자 모래시계를 단계별로 복원해 봅니다. 45° 회전 물리 엔진 원리, SPI 데이지 체인 배선 방식, 그리고 완전한 Arduino C++ 소스코드와 트러블슈팅 가이드를 함께 제공합니다. 기본적인 업로드가 가능한 메이커 분들께 적합합니다."
image: "https://img.lingflux.com/2026/07/47600d4280d7a2274f9f47a726329beb.jpg"
---

> **TL;DR(빠른 시작):**
>
> 1. 배선: ESP32 `GPIO23→DIN`, `GPIO18→CLK`, `GPIO5→CS`, 두 MAX7219는 `DOUT→DIN`으로 데이지 체인 직렬 연결
> 2. 전원: `5V→VCC`, `GND→GND`(극성을 반대로 꽂지 마세요. 타버려도 책임 못 집니다)
> 3. 라이브러리: Arduino 라이브러리 매니저에서 `MD_MAX72xx`를 검색해 설치하면 끝, `SPI.h`는 내장이라 따로 설치할 필요 없음
> 4. 업로드 후 도트 매트릭스가 자동으로 "모래를 흘려내리기" 시작합니다. 어떤 버튼이나 센서도 없이 그냥 실행됩니다

---

난이도: ⭐⭐⭐☆☆(Arduino IDE로 코드를 업로드해 본 적 있다면 무난하게 시작 가능)
예상 시간: 40분(배선 15분 + 업로드/디버깅 25분)
테스트 환경: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + MD_MAX72xx v3.5.1

---

## 서론

모래 알갱이가 한 칸씩 아래로 떨어지고, 기울이면 자연스럽게 작은 경사면이 쌓이는 그런 전자 모래시계 영상을 본 적 있으신가요? 손이 간질거리지 않나요? 저도 첫 반응은 "이런 건 자이로스코프를 달아야 하고, 물리 공식을 잔뜩 계산해야겠지"였는데, 막상 해보니 진짜 어려운 건 하드웨어가 아니라, 반듯한 도트 매트릭스 두 장을 코드상에서 45° "회전한 것처럼" 속여서 모래시계 모양으로 조립하는 부분이었습니다. 이 글은 제가 겪었던 시행착오와 정리한 물리 로직을 풀어놓은 것으로, 따라 하면 ESP32 한 장과 MAX7219 두 장으로 책상 위에 "모래가 흘러내리는" 장식품을 만들 수 있습니다.

## 실험 결과

전원을 켜면 도트 매트릭스는 자동으로 하나의 루프에 진입합니다. 먼저 바로 세워 안정적으로 모래를 흘려내리고, 다음엔 왼쪽/오른쪽으로 기울이는 동작을 흉내 내어 모래 알갱이가 자연스러운 경사로 쌓이게 합니다. 마지막에는 한 번 전체적으로 "뒤집기"를 해서 모래시계를 거꾸로 뒤집고 다시 흘러내리기를 시작합니다. 전체 과정에 어떤 버튼도 누를 필요가 없으며, 현재 실험은 자이로스코프를 사용하지 않고 뒤집기 동작은 하드코딩된 각도 데이터로 동작합니다. 코드 내부에는 "가짜 자이로스코프" 상태 머신이 자동으로 자세를 전환하고 있습니다.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XYurztJ4_mQ?si=tlLQb6wfhkILGEFL" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 부품 설명

> 개발보드(ESP32)는 다들 익숙하실 테니 길게 늘어놓지 않고, 여기서는 MAX7219에 집중합니다.

### MAX7219 — LED 매트릭스의 "통역사"

MAX7219는 LED 구동 칩으로, 매우 적은 수의 핀으로 8×8=64개 LED로 이루어진 도트 매트릭스 전체를 제어하는 역할을 합니다. 이 프로젝트에서는 ESP32의 제한된 GPIO 몇 개를 한 장의 그림을 그릴 수 있는 캔버스로 "통역"해 주는 역할입니다. 그렇지 않으면 64개의 선을 일일이 끌어와 LED 하나하나를 켜야 하니, 상상만 해도 손이 떨립니다.

이 칩을 "통역사"라고 이해해도 좋습니다. ESP32는 단순한 SPI 명령(몇 번 행, 몇 번 점을 켤지)만 보내면, MAX7219가 스캔 방식으로 전류를 해당 LED에 차례로 분배해 줍니다. 속도는 사람 눈에는 깜빡임조차 보이지 않을 정도로 빠릅니다.

| 파라미터 | 수치 |
| --- | --- |
| 구동 방식 | SPI(DIN/CLK/CS 3선) |
| 단일 칩 제어 LED 수 | 64개(8×8) |
| 동작 전압 | 4.0V ~ 5.5V |
| 직렬 연결 방식 | DOUT을 다음 칩의 DIN에 연결, 다수 칩 데이지 체인 가능 |
| 밝기 조절 | 16단계(본문 코드는 5단째 사용) |

이 칩을 선택한 이유는 싸고, 수급이 쉽고, 라이브러리가 성숙했기 때문입니다. 두 장을 이어 붙이면 "물리적으로 45° 회전"시켜 모래시계의 마름모 윤곽을 만들어낼 수 있어 가성비를 뛰어넘기 어렵습니다.

### 핀 설명

MAX7219 모듈의 일반적인 핀 배치는 아래와 같습니다(제조사에 따라 실크 인쇄 순서가 다를 수 있으니, 모듈 뒷면의 표기를 기준으로 확인하세요):

| 핀 | 역할 |
| --- | --- |
| VCC / GND | 전원 +/−극 |
| DIN | 데이터 입력(이전 단의 DOUT 또는 메인 컨트롤러에 연결) |
| DOUT | 데이터 출력(다음 단의 DIN에 연결, 직렬 연결용) |
| CS | 칩 셀렉트 신호 |
| CLK | 클럭 신호 |

## BOM 목록

| 부품 | 수량 | 비고 |
| --- | --- | --- |
| ESP32 개발보드 | 1 | 임의의 모델, 사용 가능한 GPIO만 있으면 됨 |
| MAX7219 8×8 도트 매트릭스 모듈 | 2 | 같은 로트의 같은 모델을 권장, 색상/밝기가 더 균일해짐 |
| 점퍼 와이어 | 약간 | 양끝 암-암을 추천, 모듈 간 점퍼 선이 더 깔끔해짐 |

## 배선 방식

글로 된 표는 행이 꼬이기 쉬우니, 위 사진을 먼저 보고 흐름을 잡은 뒤 아래 표를 보고 한 가닥씩 확인하세요.

| ESP32 | 모듈1(MAX7219 #1) | 모듈2(MAX7219 #2) |
| --- | --- | --- |
| 5V | VCC (IN) → VCC (OUT) | ← VCC (IN) |
| GND | GND (IN) → GND (OUT) | ← GND (IN) |
| GPIO23 | DIN → DOUT | → DIN |
| GPIO5 | CS (IN) → CS (OUT) | → CS (IN) |
| GPIO18 | CLK (IN) → CLK (OUT) | → CLK (IN) |

**배선 후 한 가닥씩 확인하면 트러블슈팅 시간의 80%를 아낄 수 있습니다**. 특히 VCC/GND 극성이 바뀌지 않았는지, 그리고 모듈의 IN/OUT 방향이 거꾸로되지 않았는지가 가장 재작업이 잦은 부분입니다.

## 설치해야 할 라이브러리

Arduino IDE → 라이브러리 매니저를 열어 아래 라이브러리를 검색/설치합니다:

- `MD_MAX72xx`(작성자 MajicDesigns, 현재 최신 안정 버전 v3.5.1) — MAX7219 도트 매트릭스 구동 핵심 라이브러리
- `SPI.h` — Arduino IDE에 내장, 별도 설치 불필요

작은 알림: `MD_MAX72xx` 라이브러리에는 공식 Hourglass(모래시계) 예제가 함께 들어 있습니다. 본문 코드를 실행했을 때 결과가 만족스럽지 않다면, `HARDWARE_TYPE`을 잘못 고른 건 아닌지 라이브러리 예제와 비교해 확인해 보세요.

## 전체 코드 + 설명

```cpp
/*
  ================================================================
   ESP32 듀얼 8x8 MAX7219 전자 모래시계 (45° 회전 조립 버전)
  ================================================================

  하드웨어 레이아웃 설명:
  ------------------------------------------------------------
  일반적인 8x8 MAX7219 도트 매트릭스 두 장을 데이지 체인으로
  DIN→DOUT 순서대로 연결합니다:
     [ESP32] --DIN--> [모듈1 (상부 깔때기)] --DOUT--> [모듈2 (하부 깔때기)]

  MD_MAX72XX의 네이티브 어드레싱 방식은 「행 0~7, 열 0~(8*디바이스수-1)」이므로,
  디바이스 2개는 자연스럽게 8행 x 16열의 어드레스 공간을 만듭니다:
     모듈1은 열 0~7을 차지   (45° 회전 후 "상부 깔때기", 끝점은 행7,열7)
     모듈2는 열 8~15을 차지  (45° 회전 후 "하부 깔때기", 끝점은 행0,열8)

  두 모듈은 각각 물리적으로 45° 회전해 상하로 맞붙으며, 오직 (행7,열7)과
  (행0,열8) 한 쌍의 칸만 물리적으로 서로 붙어 있습니다 —— 이것이 모래시계의
  "목"이자 모래 알갱이가 모듈을 가로질러 이동할 수 있는 유일한 통로입니다.
  그 외에 열7과 열8 사이에는 어떤 물리적 인접 관계도 존재하지 않으며(두 마름모는
  한 꼭짓점에서만 만남), 코드상에서는 나머지 칸의 열 간 "순간이동"을 명시적으로
  차단해야 합니다.

  중력 방향의 물리적 직관:
  ------------------------------------------------------------
  모듈 전체가 물리적으로 45° 회전했기 때문에, 모듈 자체의 행/열 방향은 더 이상
  수직 방향이 아니라 각각 "실제 세계"의 좌하 45°, 우하 45°를 가리킵니다. 따라서:
     - 두 방향 성분이 동시에 +1(행+1, 열+1) —— 실제 세계의 "바로 아래"
     - 행만 +1(열은 그대로) —— 실제 세계의 "좌하"(모래가 자연스럽게 펼쳐지는 경사)
     - 열만 +1(행은 그대로) —— 실제 세계의 "우하"(모래가 자연스럽게 펼쳐지는 경사)
  이것이 본 코드 "중력 벡터"와 "측면 슬립 성분"의 출처입니다. 모래시계를 뒤집을 때
  (gravityDir가 +1에서 -1로 바뀜) 두 성분은 동시에 부호가 바뀌며 물리적 의미는
  여전히 성립합니다.

  잔상 방지 / 단일 프레임 과속 낙하 방지:
  ------------------------------------------------------------
  매 프레임 "중력 하류 -> 중류 상류" 순서로 칸을 역방향 스캔합니다(gravityDir=+1일 때
  행7,열15에서 행0,열0 방향으로, 뒤집은 후에는 반대로). 이는 다음을 보장합니다:
     1) 모래 알갱이 하나가 매 프레임 최대 한 칸만 이동하며, 연속 판정으로 인한
        "순간이동"이 발생하지 않는다.
     2) 목적지 칸의 점유 여부는 항상 "이번 프레임에서 이미 확정된 최종 상태"를
        기준으로 판정되어, 같은 프레임 내에서 두 알갱이가 같은 목적지 칸을 두고
        다투어 잔상/알갱이 손실이 발생하지 않는다.

  핀(검증된 배선 그대로 유지):
     DATA_PIN 23 (MOSI)   CLK_PIN 18 (SCK)   CS_PIN 5 (CS)

  자이로스코프:
  ------------------------------------------------------------
  아직 실제 자이로스코프는 연결하지 않았으며, 본 코드는 "가짜 자이로스코프"
  상태 머신(fakeGyroX / fakeGyroZ)을 내장해 시간에 따라 루프로 생성합니다:
     정립 안정적 흘러내림 -> 한쪽으로 기울임 -> 수평 복귀 -> 완전히 뒤집음 -> (반대 방향으로 반복)
  향후 실제 MPU6050 등의 센서를 연결할 때는 readRealGyro()만 붙여서
  fakeGyroX/fakeGyroZ를 실제 각도로 교체하면 되며, 나머지 물리 엔진은 수정할
  필요가 없습니다.
  ================================================================
*/

#include <MD_MAX72xx.h>
#include <SPI.h>

// ---------------- 하드웨어 설정 ----------------
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES   2          // 8x8 모듈 2개만 사용

#define DATA_PIN  23  // VSPI MOSI
#define CLK_PIN   18  // VSPI SCK
#define CS_PIN    5   // VSPI CS0

MD_MAX72XX mx = MD_MAX72XX(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

// ---------------- 표시 방향 보정 ----------------
// 실제로 점등한 뒤 "상하가 뒤집힘" 또는 "두 모듈이 좌우로 바뀜"이 발견되면,
// 아래 두 매크로만 수정하면 되고 아래 물리 알고리즘은 건드릴 필요가 없습니다.
#define FLIP_ROW           true   // 행 방향을 뒤집을지 여부 (7-row)
#define SWAP_MODULE_ORDER  false  // 모듈2가 모듈1보다 먼저 데이지 체인에 연결되면 true로 변경

// ---------------- 논리 그리드 ----------------
#define ROWS 8
#define COLS 16
// 목: 모듈1 출구(7,7) <-> 모듈2 입구(0,8)
#define NECK_A_R 7
#define NECK_A_C 7
#define NECK_B_R 0
#define NECK_B_C 8

bool sand[ROWS][COLS];

// ---------------- 물리 엔진 파라미터 ----------------
#define SAND_TOTAL        42     // 모래 알갱이 총수, 시각 효과에 따라 자유롭게 조절 (추천 30~50)
#define TICK_MS           130    // 물리 연산 스텝(밀리초), 작을수록 유속이 빨라집니다.
                                  // ~130ms로 키우면 육안으로 모래가 한 칸씩 떨어지는 게
                                  // 선명하게 보이며, 목에서 떨어지는 알갱이 사이에 자연스럽게
                                  // 한 칸 빈 공간이 생깁니다(동시에 2~3개 점이 간격을 두고
                                  // 떨어지는 것도 보입니다). 아직 빠르다고 느끼면 계속 키우세요
                                  // (추천 구간 100~180).
const float LATERAL_FRICTION = 0.85f;  // 측면 슬립 "마찰력": 매 프레임마다 슬립이 일어나지 않아 자연스러운 멈춤 느낌을 만듭니다

int   gravityDir  = 1;     // +1 = 정립(모듈1->모듈2)   -1 = 반전(모듈2->모듈1)
float targetBias  = 0.0f;  // 목표 기울기 바이어스 [-1,1]
float currentBias = 0.0f;  // 평활화된 현재 기울기 바이어스(천천히 targetBias에 수렴, 급변 방지)

unsigned long lastTickMs = 0;

// ================================================================
//                        모래 알갱이 물리 엔진
// ================================================================

inline int moduleOf(int c) { return (c < 8) ? 1 : 2; }

// 유효한 목 통과인지 여부(모듈 간 이동이 허용되는 유일한 칸 쌍, 양방향)
inline bool isNeckPair(int r, int c, int nr, int nc) {
  if (r == NECK_A_R && c == NECK_A_C && nr == NECK_B_R && nc == NECK_B_C) return true;
  if (r == NECK_B_R && c == NECK_B_C && nr == NECK_A_R && nc == NECK_A_C) return true;
  return false;
}

inline bool canMove(int r, int c, int nr, int nc) {
  if (nr < 0 || nr > 7 || nc < 0 || nc > 15) return false;   // 범위 초과
  if (sand[nr][nc]) return false;                             // 목적지가 이미 점유됨
  if (moduleOf(c) != moduleOf(nc)) {                          // 모듈 간 이동?
    if (!isNeckPair(r, c, nr, nc)) return false;              // 목만 허용
  }
  return true;
}

inline bool tryMove(int r, int c, int nr, int nc) {
  if (!canMove(r, c, nr, nc)) return false;
  sand[r][c]   = false;
  sand[nr][nc] = true;
  return true;
}

// "바로 아래"(중력 주방향)의 목적지 칸을 계산합니다.
// 핵심: 목 끝점에 서 있으면 (행+g, 열+g)가 바로 범위를 벗어납니다(예: 7+1=8, 0~7 초과).
// 반드시 목 반대편 칸으로 명시적으로 재지정해야 하며, 그렇지 않으면 알갱이가
// 끝점에 걸려 통과하지 못하게 됩니다.
inline void primaryTarget(int r, int c, int g, int &nr, int &nc) {
  if (g == 1  && r == NECK_A_R && c == NECK_A_C) { nr = NECK_B_R; nc = NECK_B_C; return; }
  if (g == -1 && r == NECK_B_R && c == NECK_B_C) { nr = NECK_A_R; nc = NECK_A_C; return; }
  nr = r + g;
  nc = c + g;
}

float random01() { return random(0, 10001) / 10000.0f; }

// 모래 알갱이 한 알의 1스텝 의사결정: 바로 아래를 우선, 막히면 기울기 바이어스에 따라 좌하/우하로 슬립
void moveGrain(int r, int c) {
  int g = gravityDir;
  int pnr, pnc;
  primaryTarget(r, c, g, pnr, pnc);

  // 기울어질수록 "바로 아래를 건너뛰고 곧장 측면으로 슬립"하는 쪽으로 기울어, 실제 중력 성분 이동을 모방
  bool primaryFirst = random01() < (1.0f - fabsf(currentBias) * 0.6f);

  if (primaryFirst) {
    if (tryMove(r, c, pnr, pnc)) return;
  }

  // 측면 슬립: 성분A(행 방향만) / 성분B(열 방향만), 바이어스가 시도 순서를 결정
  if (random01() < LATERAL_FRICTION) {
    bool aFirst = random01() < (0.5f - currentBias * 0.5f);
    int arn = r + g, acn = c;      // 성분A: 좌하(또는 우하, 회전 방향에 따라)
    int brn = r,     bcn = c + g;  // 성분B: 반대쪽

    if (aFirst) {
      if (tryMove(r, c, arn, acn)) return;
      if (tryMove(r, c, brn, bcn)) return;
    } else {
      if (tryMove(r, c, brn, bcn)) return;
      if (tryMove(r, c, arn, acn)) return;
    }
  }

  // 폴백: 바이어스 때문에 바로 아래 시도를 건너뛰었다면 여기서 한 번 더 시도해,
  // 바로 아래가 정말 비어 있기만 하면 알갱이가 결국 떨어지도록 보장합니다(바이어스 로직에 갇히지 않음)
  if (!primaryFirst) {
    tryMove(r, c, pnr, pnc);
  }
}

// 한 프레임 전체 연산: "중력 하류 -> 상류" 역방향 스캔, 잔상/과속 낙하 방지
void updateSand() {
  int rStart, rEnd, rStep, cStart, cEnd, cStep;
  if (gravityDir == 1) {
    // 하류 = 행/열 모두 큼 -> (7,15)에서 (0,0)으로 스캔
    rStart = 7; rEnd = -1; rStep = -1;
    cStart = 15; cEnd = -1; cStep = -1;
  } else {
    // 뒤집은 뒤 하류 = 행/열 모두 작음 -> (0,0)에서 (7,15)로 스캔
    rStart = 0; rEnd = 8; rStep = 1;
    cStart = 0; cEnd = 16; cStep = 1;
  }

  for (int r = rStart; r != rEnd; r += rStep) {
    for (int c = cStart; c != cEnd; c += cStep) {
      if (sand[r][c]) moveGrain(r, c);
    }
  }

  // 바이어스가 목표값에 평활하게 수렴하여 기울임/수평 복귀 전환이 더 부드럽고 딱딱하지 않게
  currentBias += (targetBias - currentBias) * 0.05f;
}

void initHourglass() {
  memset(sand, 0, sizeof(sand));
  int placed = 0;
  // 부팅 첫 구간은 dir=-1인 "위에서 아래로" 흘러내리기(모듈2→모듈1)이므로 초기 모래는 모듈2에 넣습니다
  // (열8~15). 채우는 방식은 원래의 "모듈1 채우기"를 (r,c)->(7-r,15-c)에 대해 미러링한 것으로,
  // 뒤집은 뒤의 물리와 완전히 대칭이며, 부팅 즉시 올바른 "위쪽은 모래가 가득하고 아래로 흐름"
  // 상태가 됩니다.
  for (int r = ROWS - 1; r >= 0 && placed < SAND_TOTAL; r--) {
    for (int c = 15; c >= 8 && placed < SAND_TOTAL; c--) {   // 모듈2만 채움
      sand[r][c] = true;
      placed++;
    }
  }
}

// ================================================================
//                    가짜 자이로스코프 상태 머신(실제 센서가 없을 때 사용)
// ================================================================
struct GyroPhase {
  unsigned long durationMs;
  int8_t        dir;      // 이 단계의 중력 방향
  float         bias;     // 이 단계의 목표 기울기 바이어스
  const char*   name;
  float         gx, gz;   // 모의 자이로/가속도계 판독값, 직렬 디버그 표시용
};

GyroPhase phases[] = {
  // —— 첫 번째 구간: 위에서 아래로 (dir=-1, 모듈2→모듈1) ——
  { 16000, -1,  0.00f, "UPRIGHT_POUR(반전) 바로 세워 안정적으로 흘러내림",  0.0f, -1.0f },
  {  4000, -1,  0.85f, "TILT_RIGHT     오른쪽으로 기울임",          0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          수평 복귀",              0.0f, -1.0f },
  {  4000, -1, -0.85f, "TILT_LEFT      왼쪽으로 기울임",         -0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          수평 복귀",              0.0f, -1.0f },
  {  1400,  1,  0.00f, "FLIP           완전히 뒤집음",      0.0f,  0.2f },
  // —— 두 번째 구간: 아래에서 위로 (dir=+1, 모듈1→모듈2) ——
  { 16000,  1,  0.00f, "UPRIGHT_POUR   바로 세워 안정적으로 흘러내림",     0.0f,  1.0f },
  {  4000,  1,  0.85f, "TILT_RIGHT     오른쪽으로 기울임",          0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          수평 복귀",              0.0f,  1.0f },
  {  4000,  1, -0.85f, "TILT_LEFT      왼쪽으로 기울임",         -0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          수평 복귀",              0.0f,  1.0f },
  { 1400, -1,  0.00f, "FLIP           완전히 뒤집음",      0.0f, -0.2f },
};
const int NUM_PHASES = sizeof(phases) / sizeof(phases[0]);

int phaseIndex = 0;
unsigned long phaseStartMs = 0;

void updateFakeGyro() {
  unsigned long now = millis();
  if (now - phaseStartMs >= phases[phaseIndex].durationMs) {
    phaseIndex = (phaseIndex + 1) % NUM_PHASES;
    phaseStartMs = now;

    gravityDir = phases[phaseIndex].dir;
    targetBias = phases[phaseIndex].bias;

    Serial.print("[GYRO STATE] -> ");
    Serial.print(phases[phaseIndex].name);
    Serial.print("   gx=");
    Serial.print(phases[phaseIndex].gx, 2);
    Serial.print("g  gz=");
    Serial.println(phases[phaseIndex].gz, 2);
  }
}

// ================================================================
//                          도트 매트릭스 렌더링
// ================================================================
void render() {
  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::OFF);   // 자동 새로고침 끔, 프레임 전체를 그린 뒤 일괄 새로고침하여 깜빡임 방지
  mx.clear();

  for (int r = 0; r < ROWS; r++) {
    for (int c = 0; c < COLS; c++) {
      if (!sand[r][c]) continue;

      int dispRow = FLIP_ROW ? (7 - r) : r;
      int dispCol = c;
      if (SWAP_MODULE_ORDER) {
        dispCol = (c < 8) ? (c + 8) : (c - 8);
      }
      mx.setPoint(dispRow, dispCol, true);
    }
  }

  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::ON);
}

// ================================================================
//                             메인 프로그램
// ================================================================
void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  mx.begin();
  mx.control(MD_MAX72XX::INTENSITY, 5);   // 밝기 0~15, 자유롭게 조절
  mx.clear();

  initHourglass();

  phaseIndex = 0;
  phaseStartMs = millis();
  gravityDir = phases[0].dir;
  targetBias = phases[0].bias;
  currentBias = 0;

  lastTickMs = millis();

  Serial.println("=== ESP32 듀얼 8x8 MAX7219 전자 모래시계 시작 ===");
  Serial.print("[GYRO STATE] -> ");
  Serial.println(phases[0].name);
}

void loop() {
  unsigned long now = millis();

  updateFakeGyro();     // 상태 머신 / 가짜 자이로스코프 구동

  if (now - lastTickMs >= TICK_MS) {
    lastTickMs = now;
    updateSand();        // 한 프레임 물리 연산
    render();             // 도트 매트릭스에 출력
  }
}
```

### 코드 설명

코드가 길어 보이지만 사실 세 부분으로 나뉩니다.

**첫 번째 단계, 도트 매트릭스 두 장을 모래시계 좌표계로 "용접"하기.** `MD_MAX72XX`는 원래 두 모듈을 8행 × 16열의 큰 그리드 하나로 봅니다. 하지만 물리적으로는 두 모듈이 각각 45° 회전한 뒤 조립되고, 오직 `(7,7)`과 `(0,8)` 한 쌍만 실제로 붙어 있습니다. 이것이 `NECK_A / NECK_B`가 정의하는 "모래시계 목"이며, `isNeckPair()`가 바로 이 문을 지켜 모래가 다른 곳에서 "지름길"로 모듈을 가로지르지 못하게 합니다.

**두 번째 단계, 모래 알갱이가 한 칸씩 성실히 떨어지게 만들기.** `moveGrain()`은 매번 먼저 바로 아래를 시도하고, 막히면 현재 기울기에 따라 측면 슬립을 시도합니다. `updateSand()`는 "하류 먼저 계산" 순서로 전체 그리드를 스캔하여, 한 프레임 안에 두 알갱이가 같은 칸을 두고 다투는 일을 막습니다. 이 부분이 코드 전체에서 가장 읽을 만한 곳인데, 아주 단순한 규칙(먼저 아래, 그다음 측면 슬립, 마지막 폴백) 하나로 "모래가 자연스럽게 경사를 이룬다"는 복잡해 보이는 물리를 재현해 냅니다.

**세 번째 단계, 가짜 자이로스코프 상태 머신으로 파라미터 "먹이기".** `phases[]` 배열은 시간 순서대로 전체 자세(정립, 기울임, 수평 복귀, 뒤집기)를 배치하고, `updateFakeGyro()`는 단지 타이머일 뿐입니다. 시간이 되면 다음 단계로 전환하며 `gravityDir`과 `targetBias`를 바꿉니다. 나중에 실제 자이로스코프를 달면 이 두 변수를 센서가 계산한 실시간 각도로 교체하기만 하면 되고, 물리 엔진은 전혀 손대지 않아도 됩니다.

## 자주 묻는 문제 트러블슈팅

당황하지 마세요. 90%의 문제는 아래 몇 군데에서 비롯됩니다.

**도트 매트릭스가 전혀 켜지지 않음**
먼저 VCC/GND가 반대로 꽂혔거나 접촉 불량인지 확인하고, 다음으로 `DATA_PIN`/`CLK_PIN`/`CS_PIN`이 실제 배선과 일치하는지(본문 기본값 23/18/5) 확인하세요.

**패턴이 상하로 뒤집히거나 두 모듈이 좌우로 바뀜**
다시 배선할 필요 없이 코드의 `FLIP_ROW` 또는 `SWAP_MODULE_ORDER` 매크로를 수정하고 다시 업로드하면 됩니다.

**모래가 한 덩어리로 뭉쳐 보이고, 동작이 너무 빠라 안 보임**
`TICK_MS`를 기본 130에서 150~180로 키우면 유속이 눈에 띄게 느려지고 알갱이 느낌이 더 살아납니다.

**컴파일 오류로 `MD_MAX72xx.h`를 찾을 수 없음**
라이브러리 설치에 실패한 것입니다. 라이브러리 매니저에서 `MD_MAX72xx`를 다시 검색/설치하세요(대소문자와 철자 주의).

**모래가 목(행7열7 또는 행0열8)에 걸려 아래로 떨어지지 않음**
대부분 `HARDWARE_TYPE`을 잘못 고른 경우입니다. MAX7219 모듈에는 `FC16_HW`, `GENERIC_HW`, `PAROLA_HW` 등 여러 종류가 있으며, 배선은 맞는데 표시가 어긋날 때는 이 값을 바꿔 가며 시도하는 것을 최우선으로 하세요.

**전원 인가 후 화면이 깨지거나 가끔 멈추고 재부팅됨**
점퍼 와이어의 접촉이 단단한지 확인하세요. 특히 브레드보드/긴 점퍼 와이어 환경에서는 데이지 체인 배선을 최대한 짧게 하는 것을 권장합니다.

## FAQ 질문과 답변

**Q: ESP32와 MAX7219 연결에 반드시 GPIO23/18/5 핀을 써야 하나요?**
A: 필수는 아닙니다. 본문 코드는 소프트웨어 SPI(생성자에 DATA/CLK/CS 세 핀을 직접 전달)를 사용하므로, 다른 임의의 사용 가능한 GPIO로 변경하려면 세 개의 `#define`만 고치면 되고 하드웨어 SPI 핀에 종속되지 않습니다.

**Q: MAX7219는 최대 몇 장까지 직렬 연결할 수 있나요?**
A: 칩 자체는 이론상 수십 장까지 직렬 연결이 가능하지만, 실제로는 새로고침 속도와 신호 무결성의 제약을 받으며 일반적인 프로젝트에서 4~8장이면 안정적으로 동작합니다. 본문은 2장을 사용하며, 더 늘리려면 `MAX_DEVICES`를 해당 수로 바꾸고 데이지 체인 배선만 맞춰 주면 됩니다.

**Q: `HARDWARE_TYPE`은 어느 것을 골라야 하나요?**
A: 구매한 모듈의 내부 배선에 따라 다릅니다. 가장 흔한 두 가지는 `FC16_HW`와 `GENERIC_HW`입니다. 잘못 골라도 하드웨어가 타지는 않으며, 단지 표시가 어긋나거나 좌우반사될 뿐입니다. 배선은 그대로 두고 이 매크로 하나만 바꿔 다시 업로드해 보면 됩니다.

**Q: 도트 매트릭스가 계속 깨진 표시만 나오거나 아예 표시가 안 되는 이유는?**
A: 먼저 시리얼 모니터에 `[GYRO STATE]` 로그가 정상적으로 출력되는지 보세요. 로그가 있다면 프로그램은 실행 중인 것이고 문제는 표시 매핑(`FLIP_ROW`/`SWAP_MODULE_ORDER`/`HARDWARE_TYPE`)에 있습니다. 로그가 없다면 코드가 실행되지 않는 것이므로 전원 공급과 업로드 성공 여부를 점검하세요.

**Q: 이 모래시계에 실제 자이로스코프를 달아 "기울기 감지" 버전으로 만들 수 있나요?**
A: 네, 코드에 인터페이스가 이미 예비되어 있습니다. MPU6050 같은 센서를 추가해 실시간 기울기를 읽은 뒤, `updateFakeGyro()` 안에서 `gravityDir`과 `targetBias`에 대입하는 부분만 교체하면 되며 물리 엔진 부분은 전혀 수정할 필요가 없습니다.

**Q: 전체 장치의 소비 전력은 대략 어느 정도이며, 보조 배터리로 구동할 수 있나요?**
A: 8×8 모듈 두 장을 중간 밝기(코드 기본 밝기 등급 5)에서 켜면 전체 전류는 보통 100mA 대 수준이며, 5V/1A 출력 보조 배터리나 휴대폰 어댑터면 대체로 충분합니다. 밝기를 높이거나 모듈을 추가로 확장할 계획이라면, ESP32의 5V 핀이 장시간 과부하되는 일을 피하도록 더 큰 전류 용량의 어댑터로 바꾸는 것을 권장합니다.

## 더 해볼 수 있는 것들

- 실제 MPU6050 자이로스코프를 연결해 손의 기울임에 따라 모래시계가 실제로 뒤집히게 만들고 "가짜 자이로스코프" 대본과 작별하기
- MAX7219 모듈을 더 많이 이어 붙여 더 큰 도트 매트릭스를 만들고, 간단한 애니메이션이나 문자 스크롤 재생하기
- 부저 하나를 추가해 모래가 다 떨어졌을 때 삑 소리로 알려 주어, 실사용 가능한 타이머로 만들기
- 버튼을 추가해 일시정지/수동 뒤집기를 제어하고, 상태 머신이 자동 전환될 때까지 기다리지 않게 만들기

## 참고 자료

- [MAX7219/MAX7221 공식 데이터시트(Analog Devices / Maxim Integrated)](https://www.analog.com/media/en/technical-documentation/data-sheets/max7219-max7221.pdf)
- [MD_MAX72xx 오픈소스 라이브러리 GitHub 홈페이지](https://github.com/MajicDesigns/MD_MAX72XX)(라이브러리에 Hourglass 공식 예제가 함께 포함되어 있어 비교하며 트러블슈팅 가능)
- ESP32 공식 제품 및 핀 문서(Espressif 공식 홈페이지)
