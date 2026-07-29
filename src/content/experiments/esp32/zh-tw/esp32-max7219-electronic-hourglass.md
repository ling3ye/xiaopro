---
title: "ESP32 驅動 MAX7219 打造電子沙漏｜SPI 接線 + 45° 旋轉物理引擎原始碼"
boardId: esp32
moduleId: lighting/max7219-dot-matrix
category: esp32
date: 2026-07-29
intro: "用一塊 ESP32 和兩塊 MAX7219 8×8 點矩陣，手把手復刻網紅電子沙漏。講解 45° 旋轉物理引擎原理、SPI 菊花鏈接線方式和完整 Arduino C++ 原始碼，附排坑指南。適合會基礎燒錄的創客。"
image: "https://img.lingflux.com/2026/07/47600d4280d7a2274f9f47a726329beb.jpg"
---

> **TL;DR（快速上手）：**
>
> 1. 接線：ESP32 `GPIO23→DIN`，`GPIO18→CLK`，`GPIO5→CS`，兩塊 MAX7219 用 `DOUT→DIN` 菊花鏈串接
> 2. 供電：`5V→VCC`，`GND→GND`（千萬別接反，燒了別怪我沒提醒）
> 3. 裝函式庫：Arduino 函式庫管理員搜尋 `MD_MAX72xx` 安裝即可，`SPI.h` 是內建的不用另裝
> 4. 燒錄後點矩陣螢幕會自動開始「漏沙」，不用接任何按鈕或感測器就能跑

---

難度：⭐⭐⭐☆☆（會用 Arduino IDE 燒錄過程式就能上手）
預計時間：40 分鐘（接線 15 分鐘 + 燒錄除錯 25 分鐘）
測試環境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + MD_MAX72xx v3.5.1

---

## 前言

網路上刷到那種沙粒一格一格往下掉、傾斜時還會自然堆出小斜坡的電子沙漏，是不是也讓你手癢？我第一反應也是「這肯定要接個陀螺儀、算一堆物理公式」，結果動手之後發現，真正的難點根本不在硬體，而在於怎麼讓兩塊方方正正的點矩陣螢幕，在程式碼裡「假裝」自己被旋轉了45°、拼成一個沙漏的形狀。這篇文章就是把我踩過的坑和想明白的物理邏輯整理出來，跟著做，你也能用一塊 ESP32 和兩塊 MAX7219，在桌上擺一個會「漏沙」的電子擺件。

## 實驗效果

上電後，點矩陣螢幕會自動進入一段循環：先是正立平穩地漏沙，然後模擬向左、向右傾倒，沙粒會跟著堆出自然的斜角，最後整體「翻轉」一次，沙漏倒過來重新開始漏。整個過程不需要按任何按鈕，我目前的實驗是沒有使用陀螺儀的，翻轉是寫死的角度資料。程式碼裡內建了一個「假陀螺儀」狀態機在自動切換姿態。

---

## 元件說明

> 開發板（ESP32）大家應該都熟，這裡就不囉嗦了，重點說說 MAX7219。

### MAX7219 — LED 點矩陣的「翻譯官」

MAX7219 是一種 LED 驅動晶片，負責用很少的腳位控制一整塊 8×8＝64 顆 LED 的點矩陣，用在本專案裡的作用是把 ESP32 有限的幾個 GPIO「翻譯」成一整張能畫畫的畫布——不然你就得拉 64 根線去逐個點燈，想想手就抖。

可以把它理解成一個「翻譯官」：ESP32 只需要發送簡單的 SPI 指令（哪一行、哪幾個點要亮），MAX7219 自己負責用掃描的方式把電流輪流分配給對應的 LED，速度快到人眼完全看不出閃爍。

| 參數 | 數值 |
| --- | --- |
| 驅動方式 | SPI（DIN/CLK/CS 三線） |
| 單片控制 LED 數 | 64 顆（8×8） |
| 工作電壓 | 4.0V ～ 5.5V |
| 串接方式 | DOUT 接下一片 DIN，可多片菊花鏈 |
| 亮度調節 | 16 級（本文程式碼用的是第 5 級） |

之所以選它，是因為便宜、貨多、函式庫成熟，兩塊拼在一起還能「物理旋轉45°」拼出沙漏的菱形輪廓，性價比很難被超過。

### 引腳說明

MAX7219 模組常見的腳位排佈如下（部分廠商絲印順序不同，以模組背面標註為準）：

| 引腳 | 作用 |
| --- | --- |
| VCC / GND | 供電正負極 |
| DIN | 資料輸入（接上一級 DOUT 或主控） |
| DOUT | 資料輸出（接下一級 DIN，用於串接） |
| CS | 片選訊號 |
| CLK | 時脈訊號 |

## BOM 清單

| 元件 | 數量 | 說明 |
| --- | --- | --- |
| ESP32 開發板 | 1 | 任意型號，只要有可用 GPIO 即可 |
| MAX7219 8×8 點矩陣模組 | 2 | 建議買同批次同型號，顏色/亮度更一致 |
| 杜邦線 | 若干 | 建議雙頭母對母，接模組間跳線更整齊 |

## 接線方式

文字表格容易看串行，建議對照上圖先理一遍思路，再照下表逐根線核對。

| ESP32 | 模組1（MAX7219 #1） | 模組2（MAX7219 #2） |
| --- | --- | --- |
| 5V | VCC (IN) → VCC (OUT) | ← VCC (IN) |
| GND | GND (IN) → GND (OUT) | ← GND (IN) |
| GPIO23 | DIN → DOUT | → DIN |
| GPIO5 | CS (IN) → CS (OUT) | → CS (IN) |
| GPIO18 | CLK (IN) → CLK (OUT) | → CLK (IN) |

**建議接完逐一核對，能省 80% 的除錯時間**——尤其是 VCC/GND 別接反，以及模組的 IN/OUT 方向別搞反，這兩個是最容易返工的地方。

## 需要安裝的函式庫

打開 Arduino IDE → 函式庫管理員，搜尋安裝以下函式庫：

- `MD_MAX72xx`（作者 MajicDesigns，當前最新穩定版本 v3.5.1）——驅動 MAX7219 點矩陣的核心函式庫
- `SPI.h` —— Arduino IDE 自帶，無需單獨安裝

小提醒：`MD_MAX72xx` 函式庫自帶了一個官方的 Hourglass（沙漏）範例，如果本文程式碼跑起來效果不理想，可以對照函式庫自帶範例排查是不是 `HARDWARE_TYPE` 選錯了型號。

## 完整原始碼 + 說明

```cpp
/*
  ================================================================
   ESP32 雙 8x8 MAX7219 電子沙漏 (45° 旋轉拼接版)
  ================================================================

  硬體佈局說明：
  ------------------------------------------------------------
  兩塊普通 8x8 MAX7219 點矩陣，沿菊花鏈 DIN→DOUT 依序連接：
     [ESP32] --DIN--> [模組1 (上漏斗)] --DOUT--> [模組2 (下漏斗)]

  MD_MAX72XX 的原生定址方式是「行 0~7，列 0~(8*設備數-1)」，
  因此 2 個設備天然給出 8 行 x 16 列的定址空間：
     模組1 占據 列 0~7   （旋轉45°後為「上漏斗」，尖端在 行7,列7）
     模組2 占據 列 8~15  （旋轉45°後為「下漏斗」，尖端在 行0,列8）

  兩個模組各自物理旋轉 45°、上下拼接，只有 (行7,列7) 與 (行0,列8)
  這一對格子在物理上真正挨在一起 —— 這就是沙漏「頸部」，也是唯一
  允許沙粒跨模組穿越的通道。除此之外，列7與列8之間不存在任何
  物理相鄰關係（兩個菱形只在一個頂點碰在一起），程式碼裡必須顯式
  屏蔽掉其餘的跨列「傳送」。

  重力方向的物理直覺：
  ------------------------------------------------------------
  因為整塊模組被物理旋轉了45°，模組自身的行方向、列方向都不再
  是豎直方向，而是分別指向「真實世界」的左下45°和右下45°。於是：
     - 兩個方向分量同時 +1（行+1 且 列+1）——對應真實世界的「正下方」
     - 只有行 +1（列不變）——對應真實世界的「左下方」（沙堆自然攤角）
     - 只有列 +1（行不變）——對應真實世界的「右下方」（沙堆自然攤角）
  這就是本程式碼「重力向量」和「側滑分量」的來源。翻轉沙漏時（gravityDir
  由 +1 變為 -1），兩個分量同時反號，物理意義仍然自洽。

  防重影 / 防單幀超速下墜：
  ------------------------------------------------------------
  每一幀按照「重力下游 -> 重力上游」的順序逆向掃描格子（gravityDir=+1
  時從 行7,列15 往 行0,列0 掃；翻轉後反過來掃），保證：
     1) 每一粒沙每幀最多移動一格，不會連續判定導致「瞬移」。
     2) 目標格是否被佔用，判斷的永遠是「本幀已經確定的最終狀態」，
        不會出現同一幀內兩粒沙爭搶同一目標格造成的重影/丟粒。

  腳位（已按你驗證可用的接線保持不變）：
     DATA_PIN 23 (MOSI)   CLK_PIN 18 (SCK)   CS_PIN 5 (CS)

  陀螺儀：
  ------------------------------------------------------------
  尚未接入真實陀螺儀，本程式碼內建一個「假陀螺儀」狀態機
  (fakeGyroX / fakeGyroZ)，按時間循環產生：
     正立平穩漏沙 -> 向一側傾倒 -> 擺正 -> 完全翻轉倒置 -> (反向再來一遍)
  未來接入真實 MPU6050 等感測器時，只需把 readRealGyro() 接上，
  用真實角度替換 fakeGyroX/fakeGyroZ 即可，其餘物理引擎無需改動。
  ================================================================
*/

#include <MD_MAX72xx.h>
#include <SPI.h>

// ---------------- 硬體設定 ----------------
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES   2          // 只有 2 個 8x8 模組

#define DATA_PIN  23  // VSPI MOSI
#define CLK_PIN   18  // VSPI SCK
#define CS_PIN    5   // VSPI CS0

MD_MAX72XX mx = MD_MAX72XX(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

// ---------------- 顯示方向校正 ----------------
// 如果實際點亮後發現「上下顛倒」或「兩塊模組左右裝反」，
// 只需要改這兩個巨集，不需要動下面的物理演算法。
#define FLIP_ROW           true   // 行方向是否需要翻轉 (7-row)
#define SWAP_MODULE_ORDER  false  // 若模組2比模組1先接入菊花鏈，改為 true

// ---------------- 邏輯網格 ----------------
#define ROWS 8
#define COLS 16
// 頸部：模組1出口(7,7) <-> 模組2入口(0,8)
#define NECK_A_R 7
#define NECK_A_C 7
#define NECK_B_R 0
#define NECK_B_C 8

bool sand[ROWS][COLS];

// ---------------- 物理引擎參數 ----------------
#define SAND_TOTAL        42     // 沙粒總數，可按視覺效果自行調節 (建議 30~50)
#define TICK_MS           130    // 物理演算步長（毫秒），越小流速越快。
                                  // 調大到 ~130ms 後，肉眼可清晰看到沙粒一格一格
                                  // 下落，且頸部落下的沙粒之間天然相隔一格空隙
                                  // （同時能看見 2~3 個點帶間隔下落）。覺得還快就繼續
                                  // 調大（建議區間 100~180）。
const float LATERAL_FRICTION = 0.85f;  // 側滑「摩擦力」：並非每幀都會側滑，製造自然停頓感

int   gravityDir  = 1;     // +1 = 正立(模組1->模組2)   -1 = 倒置(模組2->模組1)
float targetBias  = 0.0f;  // 目標傾斜偏置 [-1,1]
float currentBias = 0.0f;  // 平滑後的當前傾斜偏置（緩慢逼近 targetBias，避免瞬變）

unsigned long lastTickMs = 0;

// ================================================================
//                        沙粒物理引擎
// ================================================================

inline int moduleOf(int c) { return (c < 8) ? 1 : 2; }

// 是否是合法的頸部跨越（唯一允許跨模組的一對格子，雙向）
inline bool isNeckPair(int r, int c, int nr, int nc) {
  if (r == NECK_A_R && c == NECK_A_C && nr == NECK_B_R && nc == NECK_B_C) return true;
  if (r == NECK_B_R && c == NECK_B_C && nr == NECK_A_R && nc == NECK_A_C) return true;
  return false;
}

inline bool canMove(int r, int c, int nr, int nc) {
  if (nr < 0 || nr > 7 || nc < 0 || nc > 15) return false;   // 越界
  if (sand[nr][nc]) return false;                             // 目標已被佔用
  if (moduleOf(c) != moduleOf(nc)) {                          // 跨模組？
    if (!isNeckPair(r, c, nr, nc)) return false;              // 只有頸部允許
  }
  return true;
}

inline bool tryMove(int r, int c, int nr, int nc) {
  if (!canMove(r, c, nr, nc)) return false;
  sand[r][c]   = false;
  sand[nr][nc] = true;
  return true;
}

// 計算「正下方」（重力主方向）的目標格。
// 關鍵點：站在頸部尖端時，(行+g, 列+g) 會直接越界（比如 7+1=8 超出 0~7），
// 必須顯式重定向到頸部對側的格子，否則沙粒會卡死在尖端無法穿越。
inline void primaryTarget(int r, int c, int g, int &nr, int &nc) {
  if (g == 1  && r == NECK_A_R && c == NECK_A_C) { nr = NECK_B_R; nc = NECK_B_C; return; }
  if (g == -1 && r == NECK_B_R && c == NECK_B_C) { nr = NECK_A_R; nc = NECK_A_C; return; }
  nr = r + g;
  nc = c + g;
}

float random01() { return random(0, 10001) / 10000.0f; }

// 單粒沙的一步決策：優先正下方，被擋則按傾斜偏置向左下/右下側滑
void moveGrain(int r, int c) {
  int g = gravityDir;
  int pnr, pnc;
  primaryTarget(r, c, g, pnr, pnc);

  // 傾斜越大，越傾向於「跳過正下方，直接側滑」，模擬真實重力分量偏移
  bool primaryFirst = random01() < (1.0f - fabsf(currentBias) * 0.6f);

  if (primaryFirst) {
    if (tryMove(r, c, pnr, pnc)) return;
  }

  // 側滑：分量A(只走行方向) / 分量B(只走列方向)，由偏置決定嘗試順序
  if (random01() < LATERAL_FRICTION) {
    bool aFirst = random01() < (0.5f - currentBias * 0.5f);
    int arn = r + g, acn = c;      // 分量A：左下(或右下，取決於旋轉方向)
    int brn = r,     bcn = c + g;  // 分量B：另一側

    if (aFirst) {
      if (tryMove(r, c, arn, acn)) return;
      if (tryMove(r, c, brn, bcn)) return;
    } else {
      if (tryMove(r, c, brn, bcn)) return;
      if (tryMove(r, c, arn, acn)) return;
    }
  }

  // 兜底：如果因為偏置而跳過了正下方嘗試，這裡補一次，
  // 保證只要正下方確實是空的，沙粒最終總會掉下去（不會被偏置邏輯鎖死）
  if (!primaryFirst) {
    tryMove(r, c, pnr, pnc);
  }
}

// 一幀完整演算：沿「重力下游 -> 上游」逆向掃描，防重影/防超速下墜
void updateSand() {
  int rStart, rEnd, rStep, cStart, cEnd, cStep;
  if (gravityDir == 1) {
    // 下游 = 行、列都大 -> 從 (7,15) 往 (0,0) 掃
    rStart = 7; rEnd = -1; rStep = -1;
    cStart = 15; cEnd = -1; cStep = -1;
  } else {
    // 翻轉後下游 = 行、列都小 -> 從 (0,0) 往 (7,15) 掃
    rStart = 0; rEnd = 8; rStep = 1;
    cStart = 0; cEnd = 16; cStep = 1;
  }

  for (int r = rStart; r != rEnd; r += rStep) {
    for (int c = cStart; c != cEnd; c += cStep) {
      if (sand[r][c]) moveGrain(r, c);
    }
  }

  // 偏置平滑逼近目標值，讓傾斜/擺正的過渡更絲滑，不生硬
  currentBias += (targetBias - currentBias) * 0.05f;
}

void initHourglass() {
  memset(sand, 0, sizeof(sand));
  int placed = 0;
  // 開機第一段是 dir=-1 的「自上而下」漏沙(模組2→模組1)，所以初始沙粒放進模組2
  // (列8~15)。填法是原「模組1填法」關於 (r,c)->(7-r,15-c) 的鏡像，與翻轉後的
  // 物理完全對稱，開機即處於正確的「上方滿沙、向下漏」狀態。
  for (int r = ROWS - 1; r >= 0 && placed < SAND_TOTAL; r--) {
    for (int c = 15; c >= 8 && placed < SAND_TOTAL; c--) {   // 只填模組2
      sand[r][c] = true;
      placed++;
    }
  }
}

// ================================================================
//                    假陀螺儀狀態機（無真實感測器時使用）
// ================================================================
struct GyroPhase {
  unsigned long durationMs;
  int8_t        dir;      // 該階段的重力方向
  float         bias;     // 該階段的目標傾斜偏置
  const char*   name;
  float         gx, gz;   // 模擬的陀螺儀/加速度計讀數，僅用於序列除錯展示
};

GyroPhase phases[] = {
  // —— 第一段：自上而下 (dir=-1，模組2→模組1) ——
  { 16000, -1,  0.00f, "UPRIGHT_POUR(倒置) 正立平穩漏沙",  0.0f, -1.0f },
  {  4000, -1,  0.85f, "TILT_RIGHT     向右傾倒",          0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          擺正",              0.0f, -1.0f },
  {  4000, -1, -0.85f, "TILT_LEFT      向左傾倒",         -0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          擺正",              0.0f, -1.0f },
  {  1400,  1,  0.00f, "FLIP           完全翻轉倒置",      0.0f,  0.2f },
  // —— 第二段：自下而上 (dir=+1，模組1→模組2) ——
  { 16000,  1,  0.00f, "UPRIGHT_POUR   正立平穩漏沙",     0.0f,  1.0f },
  {  4000,  1,  0.85f, "TILT_RIGHT     向右傾倒",          0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          擺正",              0.0f,  1.0f },
  {  4000,  1, -0.85f, "TILT_LEFT      向左傾倒",         -0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          擺正",              0.0f,  1.0f },
  { 1400, -1,  0.00f, "FLIP           完全翻轉倒置",      0.0f, -0.2f },
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
//                          渲染到點矩陣
// ================================================================
void render() {
  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::OFF);   // 關閉自動刷新，整幀畫完再統一刷新，避免閃爍
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
//                             主程式
// ================================================================
void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  mx.begin();
  mx.control(MD_MAX72XX::INTENSITY, 5);   // 亮度 0~15，可自行調整
  mx.clear();

  initHourglass();

  phaseIndex = 0;
  phaseStartMs = millis();
  gravityDir = phases[0].dir;
  targetBias = phases[0].bias;
  currentBias = 0;

  lastTickMs = millis();

  Serial.println("=== ESP32 雙8x8 MAX7219 電子沙漏 啟動 ===");
  Serial.print("[GYRO STATE] -> ");
  Serial.println(phases[0].name);
}

void loop() {
  unsigned long now = millis();

  updateFakeGyro();     // 驅動狀態機 / 假陀螺儀

  if (now - lastTickMs >= TICK_MS) {
    lastTickMs = now;
    updateSand();        // 演算一幀物理
    render();             // 輸出到點矩陣
  }
}
```

### 程式碼說明

程式碼看著長，其實拆開就三塊：

**第一步，把兩塊點矩陣「焊接」成一個沙漏座標系。** `MD_MAX72XX` 天生把兩個模組看成一個 8 行 × 16 列的大網格，但物理上兩塊模組是各自旋轉 45° 後拼在一起的，只有 `(7,7)` 和 `(0,8)` 這一對格子真正挨著——這就是 `NECK_A / NECK_B` 定義的「沙漏頸部」，`isNeckPair()` 就是專門守住這道門，不讓沙粒從別的地方「抄近路」跨模組。

**第二步，讓沙粒老老實實一格一格往下掉。** `moveGrain()` 每次先嘗試正下方，卡住了才按當前傾斜角度側滑，`updateSand()` 則嚴格按「下游先算」的順序掃描整個網格，避免一幀內兩粒沙搶同一個格子。這也是整段程式碼裡最值得讀的部分——用一個很樸素的規則（先下、再側滑、留個兜底），就把「沙堆會自然攤出斜角」這種看似複雜的物理還原出來。

**第三步，用假陀螺儀狀態機「餵」參數。** `phases[]` 陣列按時間順序排好了一整套姿態（正立、傾倒、擺正、翻轉），`updateFakeGyro()` 只是個計時器，到時間就切到下一階段，改 `gravityDir` 和 `targetBias`。以後接了真陀螺儀，直接把這兩個變數換成感測器算出來的即時角度就行，物理引擎完全不用動。

## 常見問題排查

別慌，90% 的問題都出在下面這幾個地方：

**點矩陣完全不亮**
先測 VCC/GND 有沒有接反或者虛接，再確認 `DATA_PIN`/`CLK_PIN`/`CS_PIN` 和實際接線一致（本文預設 23/18/5）。

**圖案上下顛倒或兩塊模組左右裝反**
不用重接線，改程式碼裡的 `FLIP_ROW` 或 `SWAP_MODULE_ORDER` 巨集，重新燒錄即可。

**沙粒「糊」成一片、動作太快看不清**
把 `TICK_MS` 從預設 130 調大到 150～180，流速會明顯變慢、更有顆粒感。

**編譯報錯找不到 `MD_MAX72xx.h`**
說明函式庫沒裝成功，去函式庫管理員重新搜尋安裝 `MD_MAX72xx`（注意大小寫和拼寫）。

**沙粒卡在頸部（行7列7 或 行0列8）不往下掉**
大概率是 `HARDWARE_TYPE` 選錯了型號，MAX7219 模組有 `FC16_HW`、`GENERIC_HW`、`PAROLA_HW` 等好幾種，接線正確但顯示錯亂時優先換著試。

**上電後花屏或偶爾死機重啟**
檢查杜邦線接觸是否牢固，尤其是麵包板/長杜邦線場景，建議菊花鏈走線盡量短。

## FAQ 問答

**Q：ESP32 接 MAX7219 必須用 GPIO23/18/5 這幾個腳位嗎？**
A：不是必須的。本文程式碼用的是軟體模擬 SPI（建構函式直接傳 DATA/CLK/CS 三個腳位），換成其他任意可用 GPIO，只改三個 `#define` 就行，不需要綁定硬體 SPI 腳位。

**Q：MAX7219 最多能串接幾塊？**
A：晶片本身理論上可以串聯幾十片，實際受限於刷新率和訊號完整性，常見專案穩定跑 4～8 片沒問題；本文用的是 2 片，只需把 `MAX_DEVICES` 改成對應數量並接好菊花鏈。

**Q：`HARDWARE_TYPE` 應該選哪個？**
A：取決於你買的模組內部走線，最常見的兩種是 `FC16_HW` 和 `GENERIC_HW`。買錯了不會燒壞硬體，只是顯示會錯位或鏡像，接線不變、改這一個巨集重新燒錄試就行。

**Q：為什麼點矩陣螢幕一直顯示亂碼或者不顯示？**
A：先看序列監視窗有沒有正常列印 `[GYRO STATE]` 日誌，有日誌說明程式在跑，問題出在顯示映射（`FLIP_ROW`/`SWAP_MODULE_ORDER`/`HARDWARE_TYPE`）；沒有日誌說明程式碼沒跑起來，檢查供電和燒錄是否成功。

**Q：這個沙漏能加真實陀螺儀變成「傾斜感應」版嗎？**
A：可以，程式碼已經預留了介面。加一個 MPU6050 之類的感測器，讀出即時傾角後替換掉 `updateFakeGyro()` 裡對 `gravityDir` 和 `targetBias` 的賦值，物理引擎部分完全不用改。

**Q：整個裝置功耗大概多少，能用行動電源供電嗎？**
A：兩塊 8×8 模組在中等亮度（程式碼預設亮度等級 5）下，整體電流通常在百毫安級別，用 5V/1A 輸出的行動電源或手機轉接器基本夠用；如果調高亮度或後續擴展更多模組，建議換大電流轉接器，避免 ESP32 的 5V 腳位長期過載。

## 延伸玩法

- 接入真實 MPU6050 陀螺儀，讓沙漏跟著手的傾斜真實翻轉，告別「假陀螺儀」劇本
- 用更多 MAX7219 模組拼接成更大的點矩陣，播放簡單動畫或文字捲動
- 加一顆蜂鳴器，沙粒漏完時響一聲提示，變成真正能用的計時器
- 加按鍵控制暫停/手動翻轉，不用等狀態機自動切換

## 參考資料

- [MAX7219/MAX7221 官方資料手冊（Analog Devices / Maxim Integrated）](https://www.analog.com/media/en/technical-documentation/data-sheets/max7219-max7221.pdf)
- [MD_MAX72xx 開源函式庫 GitHub 主頁](https://github.com/MajicDesigns/MD_MAX72XX)（函式庫自帶 Hourglass 官方範例，可對照排查）
- ESP32 官方產品與腳位文件（Espressif 官網）
