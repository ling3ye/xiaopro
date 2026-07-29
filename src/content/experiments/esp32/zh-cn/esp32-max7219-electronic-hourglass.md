---
title: "ESP32 驱动 MAX7219 打造电子沙漏｜SPI 接线 + 45° 旋转物理引擎源码"
boardId: esp32
moduleId: lighting/max7219-dot-matrix
category: esp32
date: 2026-07-29
intro: "用一块 ESP32 和两块 MAX7219 8×8 点阵，手把手复刻网红电子沙漏。讲解 45° 旋转物理引擎原理、SPI 菊花链接线方式和完整 Arduino C++ 源码，附排坑指南。适合会基础烧录的创客。"
image: "https://img.lingflux.com/2026/07/47600d4280d7a2274f9f47a726329beb.jpg"
---

> **TL;DR（快速上手）：**
>
> 1. 接线：ESP32 `GPIO23→DIN`，`GPIO18→CLK`，`GPIO5→CS`，两块 MAX7219 用 `DOUT→DIN` 菊花链级联
> 2. 供电：`5V→VCC`，`GND→GND`（千万别接反，烧了别怪我没提醒）
> 3. 装库：Arduino 库管理器搜索 `MD_MAX72xx` 安装即可，`SPI.h` 是内置的不用另装
> 4. 烧录后点阵屏会自动开始"漏沙"，不用接任何按钮或传感器就能跑

---

难度：⭐⭐⭐☆☆（会用 Arduino IDE 烧录过代码就能上手）
预计时间：40 分钟（接线 15 分钟 + 烧录调试 25 分钟）
测试环境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + MD_MAX72xx v3.5.1

---

## 前言

网上刷到那种沙粒一格一格往下掉、倾斜时还会自然堆出小斜坡的电子沙漏，是不是也让你手痒？我第一反应也是"这肯定要接个陀螺仪、算一堆物理公式"，结果动手之后发现，真正的难点根本不在硬件，而在于怎么让两块方方正正的点阵屏，在代码里"假装"自己被旋转了45°、拼成一个沙漏的形状。这篇文章就是把我踩过的坑和想明白的物理逻辑整理出来，跟着做，你也能用一块 ESP32 和两块 MAX7219，在桌上摆一个会"漏沙"的电子摆件。

## 实验效果

上电后，点阵屏会自动进入一段循环：先是正立平稳地漏沙，然后模拟向左、向右倾倒，沙粒会跟着堆出自然的斜角，最后整体"翻转"一次，沙漏倒过来重新开始漏。整个过程不需要按任何按钮，我当前的实验是没有使用陀螺仪的，翻转是写死的角度数据。代码里内置了一个"假陀螺仪"状态机在自动切换姿态。

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XYurztJ4_mQ?si=tlLQb6wfhkILGEFL" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 元件说明

> 开发板（ESP32）大家应该都熟，这里就不啰嗦了，重点说说 MAX7219。

### MAX7219 — LED 点阵的"翻译官"

MAX7219 是一种 LED 驱动芯片，负责用很少的引脚控制一整块 8×8＝64 颗 LED 的点阵，用在本项目里的作用是把 ESP32 有限的几个 GPIO"翻译"成一整张能画画的画布——不然你就得拉 64 根线去逐个点灯，想想手就抖。

可以把它理解成一个"翻译官"：ESP32 只需要发送简单的 SPI 指令（哪一行、哪几个点要亮），MAX7219 自己负责用扫描的方式把电流轮流分配给对应的 LED，速度快到人眼完全看不出闪烁。

| 参数 | 数值 |
| --- | --- |
| 驱动方式 | SPI（DIN/CLK/CS 三线） |
| 单片控制 LED 数 | 64 颗（8×8） |
| 工作电压 | 4.0V ～ 5.5V |
| 级联方式 | DOUT 接下一片 DIN，可多片菊花链 |
| 亮度调节 | 16 级（本文代码用的是第 5 级） |

之所以选它，是因为便宜、货多、库成熟，两块拼在一起还能"物理旋转45°"拼出沙漏的菱形轮廓，性价比很难被超过。

### 引脚说明

MAX7219 模块常见的引脚排布如下（部分厂家丝印顺序不同，以模块背面标注为准）：

| 引脚 | 作用 |
| --- | --- |
| VCC / GND | 供电正负极 |
| DIN | 数据输入（接上一级 DOUT 或主控） |
| DOUT | 数据输出（接下一级 DIN，用于级联） |
| CS | 片选信号 |
| CLK | 时钟信号 |

## BOM 清单

| 元件 | 数量 | 说明 |
| --- | --- | --- |
| ESP32 开发板 | 1 | 任意型号，只要有可用 GPIO 即可 |
| MAX7219 8×8 点阵模块 | 2 | 建议买同批次同型号，颜色/亮度更一致 |
| 杜邦线 | 若干 | 建议双头母对母，接模块间跳线更整齐 |

## 接线方式

文字表格容易看串行，建议对照上图先理一遍思路，再照下表逐根线核对。

| ESP32 | 模块1（MAX7219 #1） | 模块2（MAX7219 #2） |
| --- | --- | --- |
| 5V | VCC (IN) → VCC (OUT) | ← VCC (IN) |
| GND | GND (IN) → GND (OUT) | ← GND (IN) |
| GPIO23 | DIN → DOUT | → DIN |
| GPIO5 | CS (IN) → CS (OUT) | → CS (IN) |
| GPIO18 | CLK (IN) → CLK (OUT) | → CLK (IN) |

**建议接完逐一核对，能省 80% 的排错时间**——尤其是 VCC/GND 别接反，以及模块的 IN/OUT 方向别搞反，这两个是最容易返工的地方。

## 需要安装的库

打开 Arduino IDE → 库管理器，搜索安装以下库：

- `MD_MAX72xx`（作者 MajicDesigns，当前最新稳定版本 v3.5.1）——驱动 MAX7219 点阵的核心库
- `SPI.h` —— Arduino IDE 自带，无需单独安装

小提醒：`MD_MAX72xx` 库自带了一个官方的 Hourglass（沙漏）示例，如果本文代码跑起来效果不理想，可以对照库自带示例排查是不是 `HARDWARE_TYPE` 选错了型号。

## 完整代码 + 说明

```cpp
/*
  ================================================================
   ESP32 双 8x8 MAX7219 电子沙漏 (45° 旋转拼接版)
  ================================================================

  硬件布局说明：
  ------------------------------------------------------------
  两块普通 8x8 MAX7219 点阵，沿菊花链 DIN→DOUT 依次连接：
     [ESP32] --DIN--> [模块1 (上漏斗)] --DOUT--> [模块2 (下漏斗)]

  MD_MAX72XX 的原生寻址方式是「行 0~7，列 0~(8*设备数-1)」，
  因此 2 个设备天然给出 8 行 x 16 列的地址空间：
     模块1 占据 列 0~7   （旋转45°后为"上漏斗"，尖端在 行7,列7）
     模块2 占据 列 8~15  （旋转45°后为"下漏斗"，尖端在 行0,列8）

  两个模块各自物理旋转 45°、上下拼接，只有 (行7,列7) 与 (行0,列8)
  这一对格子在物理上真正挨在一起 —— 这就是沙漏"颈部"，也是唯一
  允许沙粒跨模块穿越的通道。除此之外，列7与列8之间不存在任何
  物理相邻关系（两个菱形只在一个顶点碰在一起），代码里必须显式
  屏蔽掉其余的跨列"传送"。

  重力方向的物理直觉：
  ------------------------------------------------------------
  因为整块模块被物理旋转了45°，模块自身的行方向、列方向都不再
  是竖直方向，而是分别指向"真实世界"的左下45°和右下45°。于是：
     - 两个方向分量同时 +1（行+1 且 列+1）——对应真实世界的"正下方"
     - 只有行 +1（列不变）——对应真实世界的"左下方"（沙堆自然摊角）
     - 只有列 +1（行不变）——对应真实世界的"右下方"（沙堆自然摊角）
  这就是本代码"重力向量"和"侧滑分量"的来源。翻转沙漏时（gravityDir
  由 +1 变为 -1），两个分量同时反号，物理意义仍然自洽。

  防重影 / 防单帧超速下坠：
  ------------------------------------------------------------
  每一帧按照"重力下游 -> 重力上游"的顺序逆向扫描格子（gravityDir=+1
  时从 行7,列15 往 行0,列0 扫；翻转后反过来扫），保证：
     1) 每一粒沙每帧最多移动一格，不会连续判定导致"瞬移"。
     2) 目标格是否被占用，判断的永远是"本帧已经确定的最终状态"，
        不会出现同一帧内两粒沙争抢同一目标格造成的重影/丢粒。

  引脚（已按你验证可用的接线保持不变）：
     DATA_PIN 23 (MOSI)   CLK_PIN 18 (SCK)   CS_PIN 5 (CS)

  陀螺仪：
  ------------------------------------------------------------
  尚未接入真实陀螺仪，本代码内置一个"假陀螺仪"状态机
  (fakeGyroX / fakeGyroZ)，按时间循环产生：
     正立平稳漏沙 -> 向一侧倾倒 -> 摆正 -> 完全翻转倒置 -> (反向再来一遍)
  未来接入真实 MPU6050 等传感器时，只需把 readRealGyro() 接上，
  用真实角度替换 fakeGyroX/fakeGyroZ 即可，其余物理引擎无需改动。
  ================================================================
*/

#include <MD_MAX72xx.h>
#include <SPI.h>

// ---------------- 硬件配置 ----------------
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES   2          // 只有 2 个 8x8 模块

#define DATA_PIN  23  // VSPI MOSI
#define CLK_PIN   18  // VSPI SCK
#define CS_PIN    5   // VSPI CS0

MD_MAX72XX mx = MD_MAX72XX(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

// ---------------- 显示方向校正 ----------------
// 如果实际点亮后发现"上下颠倒"或"两块模块左右装反"，
// 只需要改这两个宏，不需要动下面的物理算法。
#define FLIP_ROW           true   // 行方向是否需要翻转 (7-row)
#define SWAP_MODULE_ORDER  false  // 若模块2比模块1先接入菊花链，改为 true

// ---------------- 逻辑网格 ----------------
#define ROWS 8
#define COLS 16
// 颈部：模块1出口(7,7) <-> 模块2入口(0,8)
#define NECK_A_R 7
#define NECK_A_C 7
#define NECK_B_R 0
#define NECK_B_C 8

bool sand[ROWS][COLS];

// ---------------- 物理引擎参数 ----------------
#define SAND_TOTAL        42     // 沙粒总数，可按视觉效果自行调节 (建议 30~50)
#define TICK_MS           130    // 物理演算步长（毫秒），越小流速越快。
                                  // 调大到 ~130ms 后，肉眼可清晰看到沙粒一格一格
                                  // 下落，且颈部落下的沙粒之间天然相隔一格空隙
                                  // （同时能看见 2~3 个点带间隔下落）。觉得还快就继续
                                  // 调大（建议区间 100~180）。
const float LATERAL_FRICTION = 0.85f;  // 侧滑"摩擦力"：并非每帧都会侧滑，制造自然停顿感

int   gravityDir  = 1;     // +1 = 正立(模块1->模块2)   -1 = 倒置(模块2->模块1)
float targetBias  = 0.0f;  // 目标倾斜偏置 [-1,1]
float currentBias = 0.0f;  // 平滑后的当前倾斜偏置（缓慢逼近 targetBias，避免瞬变）

unsigned long lastTickMs = 0;

// ================================================================
//                        沙粒物理引擎
// ================================================================

inline int moduleOf(int c) { return (c < 8) ? 1 : 2; }

// 是否是合法的颈部跨越（唯一允许跨模块的一对格子，双向）
inline bool isNeckPair(int r, int c, int nr, int nc) {
  if (r == NECK_A_R && c == NECK_A_C && nr == NECK_B_R && nc == NECK_B_C) return true;
  if (r == NECK_B_R && c == NECK_B_C && nr == NECK_A_R && nc == NECK_A_C) return true;
  return false;
}

inline bool canMove(int r, int c, int nr, int nc) {
  if (nr < 0 || nr > 7 || nc < 0 || nc > 15) return false;   // 越界
  if (sand[nr][nc]) return false;                             // 目标已被占用
  if (moduleOf(c) != moduleOf(nc)) {                          // 跨模块？
    if (!isNeckPair(r, c, nr, nc)) return false;              // 只有颈部允许
  }
  return true;
}

inline bool tryMove(int r, int c, int nr, int nc) {
  if (!canMove(r, c, nr, nc)) return false;
  sand[r][c]   = false;
  sand[nr][nc] = true;
  return true;
}

// 计算"正下方"（重力主方向）的目标格。
// 关键点：站在颈部尖端时，(行+g, 列+g) 会直接越界（比如 7+1=8 超出 0~7），
// 必须显式重定向到颈部对侧的格子，否则沙粒会卡死在尖端无法穿越。
inline void primaryTarget(int r, int c, int g, int &nr, int &nc) {
  if (g == 1  && r == NECK_A_R && c == NECK_A_C) { nr = NECK_B_R; nc = NECK_B_C; return; }
  if (g == -1 && r == NECK_B_R && c == NECK_B_C) { nr = NECK_A_R; nc = NECK_A_C; return; }
  nr = r + g;
  nc = c + g;
}

float random01() { return random(0, 10001) / 10000.0f; }

// 单粒沙的一步决策：优先正下方，被挡则按倾斜偏置向左下/右下侧滑
void moveGrain(int r, int c) {
  int g = gravityDir;
  int pnr, pnc;
  primaryTarget(r, c, g, pnr, pnc);

  // 倾斜越大，越倾向于"跳过正下方，直接侧滑"，模拟真实重力分量偏移
  bool primaryFirst = random01() < (1.0f - fabsf(currentBias) * 0.6f);

  if (primaryFirst) {
    if (tryMove(r, c, pnr, pnc)) return;
  }

  // 侧滑：分量A(只走行方向) / 分量B(只走列方向)，由偏置决定尝试顺序
  if (random01() < LATERAL_FRICTION) {
    bool aFirst = random01() < (0.5f - currentBias * 0.5f);
    int arn = r + g, acn = c;      // 分量A：左下(或右下，取决于旋转方向)
    int brn = r,     bcn = c + g;  // 分量B：另一侧

    if (aFirst) {
      if (tryMove(r, c, arn, acn)) return;
      if (tryMove(r, c, brn, bcn)) return;
    } else {
      if (tryMove(r, c, brn, bcn)) return;
      if (tryMove(r, c, arn, acn)) return;
    }
  }

  // 兜底：如果因为偏置而跳过了正下方尝试，这里补一次，
  // 保证只要正下方确实是空的，沙粒最终总会掉下去（不会被偏置逻辑锁死）
  if (!primaryFirst) {
    tryMove(r, c, pnr, pnc);
  }
}

// 一帧完整演算：沿"重力下游 -> 上游"逆向扫描，防重影/防超速下坠
void updateSand() {
  int rStart, rEnd, rStep, cStart, cEnd, cStep;
  if (gravityDir == 1) {
    // 下游 = 行、列都大 -> 从 (7,15) 往 (0,0) 扫
    rStart = 7; rEnd = -1; rStep = -1;
    cStart = 15; cEnd = -1; cStep = -1;
  } else {
    // 翻转后下游 = 行、列都小 -> 从 (0,0) 往 (7,15) 扫
    rStart = 0; rEnd = 8; rStep = 1;
    cStart = 0; cEnd = 16; cStep = 1;
  }

  for (int r = rStart; r != rEnd; r += rStep) {
    for (int c = cStart; c != cEnd; c += cStep) {
      if (sand[r][c]) moveGrain(r, c);
    }
  }

  // 偏置平滑逼近目标值，让倾斜/摆正的过渡更丝滑，不生硬
  currentBias += (targetBias - currentBias) * 0.05f;
}

void initHourglass() {
  memset(sand, 0, sizeof(sand));
  int placed = 0;
  // 开机第一段是 dir=-1 的"自上而下"漏沙(模块2→模块1)，所以初始沙粒放进模块2
  // (列8~15)。填法是原"模块1填法"关于 (r,c)->(7-r,15-c) 的镜像，与翻转后的
  // 物理完全对称，开机即处于正确的"上方满沙、向下漏"状态。
  for (int r = ROWS - 1; r >= 0 && placed < SAND_TOTAL; r--) {
    for (int c = 15; c >= 8 && placed < SAND_TOTAL; c--) {   // 只填模块2
      sand[r][c] = true;
      placed++;
    }
  }
}

// ================================================================
//                    假陀螺仪状态机（无真实传感器时使用）
// ================================================================
struct GyroPhase {
  unsigned long durationMs;
  int8_t        dir;      // 该阶段的重力方向
  float         bias;     // 该阶段的目标倾斜偏置
  const char*   name;
  float         gx, gz;   // 模拟的陀螺仪/加速度计读数，仅用于串口调试展示
};

GyroPhase phases[] = {
  // —— 第一段：自上而下 (dir=-1，模块2→模块1) ——
  { 16000, -1,  0.00f, "UPRIGHT_POUR(倒置) 正立平稳漏沙",  0.0f, -1.0f },
  {  4000, -1,  0.85f, "TILT_RIGHT     向右倾倒",          0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          摆正",              0.0f, -1.0f },
  {  4000, -1, -0.85f, "TILT_LEFT      向左倾倒",         -0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          摆正",              0.0f, -1.0f },
  {  1400,  1,  0.00f, "FLIP           完全翻转倒置",      0.0f,  0.2f },
  // —— 第二段：自下而上 (dir=+1，模块1→模块2) ——
  { 16000,  1,  0.00f, "UPRIGHT_POUR   正立平稳漏沙",     0.0f,  1.0f },
  {  4000,  1,  0.85f, "TILT_RIGHT     向右倾倒",          0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          摆正",              0.0f,  1.0f },
  {  4000,  1, -0.85f, "TILT_LEFT      向左倾倒",         -0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          摆正",              0.0f,  1.0f },
  { 1400, -1,  0.00f, "FLIP           完全翻转倒置",      0.0f, -0.2f },
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
//                          渲染到点阵
// ================================================================
void render() {
  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::OFF);   // 关闭自动刷新，整帧画完再统一刷新，避免闪烁
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
//                             主程序
// ================================================================
void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  mx.begin();
  mx.control(MD_MAX72XX::INTENSITY, 5);   // 亮度 0~15，可自行调整
  mx.clear();

  initHourglass();

  phaseIndex = 0;
  phaseStartMs = millis();
  gravityDir = phases[0].dir;
  targetBias = phases[0].bias;
  currentBias = 0;

  lastTickMs = millis();

  Serial.println("=== ESP32 双8x8 MAX7219 电子沙漏 启动 ===");
  Serial.print("[GYRO STATE] -> ");
  Serial.println(phases[0].name);
}

void loop() {
  unsigned long now = millis();

  updateFakeGyro();     // 驱动状态机 / 假陀螺仪

  if (now - lastTickMs >= TICK_MS) {
    lastTickMs = now;
    updateSand();        // 演算一帧物理
    render();             // 输出到点阵
  }
}
```

### 代码说明

代码看着长，其实拆开就三块：

**第一步，把两块点阵"焊接"成一个沙漏坐标系。** `MD_MAX72XX` 天生把两个模块看成一个 8 行 × 16 列的大网格，但物理上两块模块是各自旋转 45° 后拼在一起的，只有 `(7,7)` 和 `(0,8)` 这一对格子真正挨着——这就是 `NECK_A / NECK_B` 定义的"沙漏颈部"，`isNeckPair()` 就是专门守住这道门，不让沙粒从别的地方"抄近路"跨模块。

**第二步，让沙粒老老实实一格一格往下掉。** `moveGrain()` 每次先尝试正下方，卡住了才按当前倾斜角度侧滑，`updateSand()` 则严格按"下游先算"的顺序扫描整个网格，避免一帧内两粒沙抢同一个格子。这也是整段代码里最值得读的部分——用一个很朴素的规则（先下、再侧滑、留个兜底），就把"沙堆会自然摊出斜角"这种看似复杂的物理还原出来了。

**第三步，用假陀螺仪状态机"喂"参数。** `phases[]` 数组按时间顺序排好了一整套姿态（正立、倾倒、摆正、翻转），`updateFakeGyro()` 只是个计时器，到时间就切到下一阶段，改 `gravityDir` 和 `targetBias`。以后接了真陀螺仪，直接把这两个变量换成传感器算出来的实时角度就行，物理引擎完全不用动。

## 常见问题排查

别慌，90% 的问题都出在下面这几个地方：

**点阵完全不亮**
先测 VCC/GND 有没有接反或者虚接，再确认 `DATA_PIN`/`CLK_PIN`/`CS_PIN` 和实际接线一致（本文默认 23/18/5）。

**图案上下颠倒或两块模块左右装反**
不用重接线，改代码里的 `FLIP_ROW` 或 `SWAP_MODULE_ORDER` 宏，重新烧录即可。

**沙粒"糊"成一片、动作太快看不清**
把 `TICK_MS` 从默认 130 调大到 150～180，流速会明显变慢、更有颗粒感。

**编译报错找不到 `MD_MAX72xx.h`**
说明库没装成功，去库管理器重新搜索安装 `MD_MAX72xx`（注意大小写和拼写）。

**沙粒卡在颈部（行7列7 或 行0列8）不往下掉**
大概率是 `HARDWARE_TYPE` 选错了型号，MAX7219 模块有 `FC16_HW`、`GENERIC_HW`、`PAROLA_HW` 等好几种，接线正确但显示错乱时优先换着试。

**上电后花屏或偶尔死机重启**
检查杜邦线接触是否牢固，尤其是面包板/长杜邦线场景，建议菊花链走线尽量短。

## FAQ 问答

**Q：ESP32 接 MAX7219 必须用 GPIO23/18/5 这几个引脚吗？**
A：不是必须的。本文代码用的是软件模拟 SPI（构造函数直接传 DATA/CLK/CS 三个引脚），换成其他任意可用 GPIO，只改三个 `#define` 就行，不需要绑定硬件 SPI 引脚。

**Q：MAX7219 最多能级联几块？**
A：芯片本身理论上可以串联几十片，实际受限于刷新率和信号完整性，常见项目稳定跑 4～8 片没问题；本文用的是 2 片，只需把 `MAX_DEVICES` 改成对应数量并接好菊花链。

**Q：`HARDWARE_TYPE` 应该选哪个？**
A：取决于你买的模块内部走线，最常见的两种是 `FC16_HW` 和 `GENERIC_HW`。买错了不会烧坏硬件，只是显示会错位或镜像，接线不变、改这一个宏重新烧录试就行。

**Q：为什么点阵屏一直显示乱码或者不显示？**
A：先看串口监视器有没有正常打印 `[GYRO STATE]` 日志，有日志说明程序在跑，问题出在显示映射（`FLIP_ROW`/`SWAP_MODULE_ORDER`/`HARDWARE_TYPE`）；没有日志说明代码没跑起来，检查供电和烧录是否成功。

**Q：这个沙漏能加真实陀螺仪变成"倾斜感应"版吗？**
A：可以，代码已经预留了接口。加一个 MPU6050 之类的传感器，读出实时倾角后替换掉 `updateFakeGyro()` 里对 `gravityDir` 和 `targetBias` 的赋值，物理引擎部分完全不用改。

**Q：整个装置功耗大概多少，能用充电宝供电吗？**
A：两块 8×8 模块在中等亮度（代码默认亮度等级 5）下，整体电流通常在百毫安级别，用 5V/1A 输出的充电宝或手机适配器基本够用；如果调高亮度或后续扩展更多模块，建议换大电流适配器，避免 ESP32 的 5V 引脚长期过载。

## 延伸玩法

- 接入真实 MPU6050 陀螺仪，让沙漏跟着手的倾斜真实翻转，告别"假陀螺仪"剧本
- 用更多 MAX7219 模块拼接成更大的点阵，播放简单动画或文字滚动
- 加一颗蜂鸣器，沙粒漏完时响一声提示，变成真正能用的计时器
- 加按键控制暂停/手动翻转，不用等状态机自动切换

## 参考资料

- [MAX7219/MAX7221 官方数据手册（Analog Devices / Maxim Integrated）](https://www.analog.com/media/en/technical-documentation/data-sheets/max7219-max7221.pdf)
- [MD_MAX72xx 开源库 GitHub 主页](https://github.com/MajicDesigns/MD_MAX72XX)（库自带 Hourglass 官方示例，可对照排查）
- ESP32 官方产品与引脚文档（Espressif 官网）
