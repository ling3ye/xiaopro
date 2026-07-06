---
title: "ESP32-S3 驱动 7.5 寸三色墨水屏｜实时显示腾讯控股(00700)股价看板（GxEPD2 + SPI）"
boardId: esp32s3
moduleId: display/epd-7inch5-gdey075z08
category: esp32
date: 2026-07-06
intro: "用 ESP32-S3 + GxEPD2 驱动 7.5 寸三色墨水屏（GDEY075Z08），抓取腾讯财经接口实时显示腾讯控股(00700)股价看板，港股休市自动拉长刷新省电。附完整接线、BOD 欠压排查、自制中文字库与 Arduino C++ 代码。"
image: "https://img.lingflux.com/2026/07/683e33cff80c152435263c8e4e6c546d.jpg"
---

> **一句话摘要**：用 ESP32-S3 和 7.5 寸三色墨水屏（GDEY075Z08）做一个会「自动收盘休眠」的腾讯控股股价看板，港股红涨黑跌，一眼看清今天该高兴还是睡公园。

难度：⭐⭐⭐☆☆（需要一点点电路基础，会烧录 Arduino 就能跟）
预计时间：1～2 小时（不含盯着墨水屏等它刷新的抓狂时间）
测试环境：
Arduino IDE 2.3.8 +
ESP32 Arduino Core 3.3.10 ＋
GxEPD2 v1.6.9 +
Adafruit GFX Library v1.12.6
（建议装库时对照这个版本，太新太旧都可能踩坑）

> 由于这次演示使用的是腾讯财经的免费 API，所以我就拿腾讯控股的股价作为演示，并无其他意思。本文不提供任何投资建议，投资有风险，请小心谨慎。

> **TL;DR（快速上手）：**
>
> 1. 接线：EPD 的 SDI→GPIO11，SCL→GPIO12，CS→GPIO10，DC→GPIO9，RES→GPIO8，BUSY→GPIO7，VCC 接 3.3V，GND 共地
> 2. 装库：GxEPD2、Adafruit GFX Library（WiFi、HTTPClient 是 ESP32 自带的，不用另装）
> 3. 改代码里的 `ssid` 和 `password` 为你自己的 WiFi
> 4. 烧录，等屏幕刷出第一版价格，收工

---

## 前言

我有个挺傻的习惯：每天没事就掏出手机刷一下自选股，刷完发现啥也没变，纯纯精神损耗。后来一想，与其让手机 App 来回骚扰我的多巴胺，不如做一块"专用仪表盘"——它只干一件事：安安静静地把股价钉在桌上，不弹窗、不推送，我瞄一眼就知道今天该高兴还是睡公园。

这篇教程就是记录我怎么用一块 ESP32 和一块 7.5 寸墨水屏，做出一个能自动刷新的腾讯控股（00700）股价看板，还顺便解决了"中文字库不全"和"收盘后别瞎刷屏"这两个大坑。看完你能照抄出一个一样的，也能改成你自己关心的任何股票。

> 由于这次演示使用的是腾讯财经的免费 API，所以我就拿腾讯控股的股价作为演示，并无其他意思。本文不提供任何投资建议，投资有风险，请小心谨慎。

## 实验效果

最终效果就是：桌上一块黑白红三色的墨水屏，安静地显示股价、涨跌幅、当日最高最低价和成交额；港股红涨黑跌，一眼就能看懂心情；收盘、午休、周末的时候它会自动"装死"少刷新，开盘了再恢复正常节奏，不会半夜还在偷偷刷屏吓自己。

> 由于这次演示使用的是腾讯财经的免费 API，所以我就拿腾讯控股的股价作为演示，并无其他意思。本文不提供任何投资建议，投资有风险，请小心谨慎。
>
> 重要的事情，要说三遍！！！

## 元件说明

**7.5 寸三色电子墨水屏**：可以理解成"超市里的电子价签放大版"——它靠一次通电把画面"定型"在纸一样的介质上，之后哪怕断电，画面也不会消失，只有下次刷新才耗电。三色版比常见的黑白版多了一种红色，正好拿来表示"涨"，非常贴合股票场景。本项目用的型号是 `GDEY075Z08`，分辨率 800×480。选它是因为分辨率够大，一屏能同时放下价格、涨跌、四项数据，不用来回翻页。

**墨水屏驱动板**：和市面上可购买的引脚定义是一样的。这个是自己手搓贴片的，设计还未算完善，测试 7.5 寸屏幕是完美显示，但是 4.2 寸、1.54 寸的电子墨水屏还有点问题，后续优化。分享原理图：

![](https://img.lingflux.com/2026/07/7466106c7707c8ef928c57a102df38cb.png)

**ESP32 开发板**：负责联网抓数据、算刷新时间、驱动屏幕，是整个项目的大脑，具体型号看你手上有什么板子都行，只要 GPIO 够用即可（本文示例引脚号适用于常见的 ESP32-S3 系列开发板，如果你用的是老款 ESP32，把引脚号换成你板子上实际可用的即可）。

## BOM 表

| 元件 | 型号/规格 | 数量 |
| --- | --- | --- |
| ESP32 开发板 | ESP32-S3 或其他带 SPI 引脚的 ESP32 系列 | 1 |
| 墨水屏驱动板 | 自己手搓，但引脚是跟市面上大多数墨水屏驱动一样的。 | 1 |
| 7.5 寸电子墨水屏 | GDEY075Z08，7.5 寸，800×480，黑/白/红三色 | 1 |
| 杜邦线 | 公对母 | 若干 |

## 7.5 寸水墨屏驱动板引脚说明

自己画原理图，搞了块 PCB，手搓贴片，使用的引脚和市面上大多数的墨水屏驱动板一样。

| 引脚 | 全称 | 作用 |
| --- | --- | --- |
| **VCC** | 电源正极 (Voltage Common Collector) | 供电输入引脚，连接 ESP32-S3 的 **3V3**（3.3V）输出。 |
| **GND** | 电源地 (Ground) | 电源参考地，连接 ESP32-S3 的 **GND**，形成电流回路。 |
| **SDI/MOSI** | 主机输出从机输入 | SPI 数据线，ESP32 往屏幕发数据 |
| **SCL/SCK** | 串行时钟 | SPI 时钟线，控制数据传输节奏 |
| **CS** | 片选 | 告诉屏幕"接下来的数据是发给你的" |
| **DC** | 数据/命令切换 | 区分当前传的是画面数据还是控制命令 |
| **RES/RST** | 复位 | 拉低一下让屏幕重新初始化 |
| **BUSY** | 忙状态指示 | 屏幕刷新中会拉低，ESP32 靠它判断"能不能发下一条指令" |

## 接线方式

| 墨水屏引脚 | 接 ESP32 引脚 |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

建议接完逐一核对一遍再上电，尤其是 BUSY 这根线接错或虚焊，能省 80% 的排错时间——代码里专门加了一段开机诊断就是为了防这个坑，后面代码说明会讲到。

## 供电稳定性：解决 ESP32 欠压重启（BOD 报错）

由于这次我用的是自己 DIY 的开发板，供电部分可能不够完善，测试过程中遇到了 `E BOD: Brownout detector was triggered` 这个报错，意思是 **ESP32 的欠压检测器被触发了**——板子检测到电压掉到安全阈值以下，就自动重启自保。

### 为什么会触发 BOD

当 ESP32 启动 Wi-Fi 时，射频模块会瞬间产生一个**几百毫安的突发大电流需求**。如果供电线太细、杜邦线接触电阻大、或者 USB 供电能力不足，电压就会被瞬间拉低，导致 ESP32 自动重启。墨水屏刷新时同样是耗电大户，要是和 Wi-Fi 抢电，更容易把电压拉垮。

在电路中并联一个**电解电容**（储能）和一个**瓷片电容**（滤波）是解决这个问题的标准做法。我用了下面这套组合拳之后，测试稳定了很多，再也没遇到 BOD。

### 1. 电容选型推荐

建议同时使用两个电容并联，组合拳效果最好：

* **电解电容（大水库）：** `470μF` 或 `1000μF`（耐压值选择 `6.3V` 或 `10V` 或 `16V` 均可）。它用来应付 Wi-Fi 启动时的瞬间大电流。
* **独石/瓷片电容（小滤网）：** `0.1μF`（即标号 `104`）。用来滤除高频噪声。

### 2. 具体接线位置

**最核心的原则：电容必须尽可能靠近 ESP32 开发板的引脚。** 由于可能使用的是杜邦线连接，可以直接把电容插在面包板上，或者直接焊接/绞接在靠近 ESP32 的电源线上。

#### 接线符号示意图

```text
    [ 外部供电 / USB ]
          │   │
          ▼   ▼
       ┌─────────┐
       │  5V/3V3 │──────┬───────────────┬──────► [ ESP32 的 VCC/3V3 引脚 ]
       │         │      │               │
       │         │    + │ 极性           │
       │         │   ┌──┴──┐         ┌──┴──┐
       │         │   │     │         │     │
       │         │   │470uF│         │0.1uF│
       │         │   │     │         │     │
       │         │   └──┬──┘         └──┬──┘
       │         │      │ - 负极         │
       │   GND   │──────┴───────────────┴──────► [ ESP32 的 GND 引脚 ]
       └─────────┘
```

#### 引脚对应连接关系

* **电解电容的 正极（+，长脚）** ───►  连接到 ESP32 的 **`3V3`**（或 `5V/VIN`，取决于你从哪个引脚给板子供电）
* **电解电容的 负极（-，短脚，外壳上有灰色条纹的一侧）** ───► 连接到 ESP32 的 **`GND`**
* **0.1μF 瓷片电容（不分正负极）** ───► 两端同样并联在 **`3V3`** 和 **`GND`** 之间。

> ⚠️ 电解电容是有极性的，接反会发热甚至炸开，接线前务必认准「长脚为正、灰条纹一侧为负」。

### 3. 补充排查建议（如果加了电容还重启）

1. **换一根高质量的 USB 线：** 很多廉价杜邦线或细 USB 线内阻极大，换一根粗一点的手机充电线会有奇效。
2. **更换供电接口：** 不要插在电脑的前置 USB 接口（供电很弱），尽量插在电脑后置的主板 USB 口，或者直接用 5V/2A 的手机充电头供电。
3. **代码避峰：** 确保在代码中，**不要**让墨水屏的刷新动作（也是耗电大户）和 `WiFi.begin()` 同时发生。先连 Wi-Fi 拿数据，断开 Wi-Fi 或让 Wi-Fi 休眠后，再驱动墨水屏刷新。本文代码里还加了 `WiFi.setTxPower(WIFI_POWER_17dBm)` 降低发射功率，作为软件层面的双重保险。

## 需要安装的库

在 Arduino IDE 的库管理器里搜索安装：

- `GxEPD2`（作者 ZinggJM）—— 测试通过版本 v1.6.9
- `Adafruit GFX Library` —— 测试通过版本 v1.12.6

`WiFi.h` 和 `HTTPClient.h` 是 ESP32 Arduino Core 自带的，不用单独装，但要确保开发板管理器里的 ESP32 核心版本是 3.0.x 系列，太旧的核心可能缺一些 API。

## 完整代码 + 说明

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

### 代码说明

**第一步，字库是"手搓"的**：常见的中文字库文件动辄几十上百 KB，还不一定凑得齐"腾讯控股"这四个字。干脆只把项目里真正用到的十几个汉字，提前渲染成点阵数组塞进代码里，体积小，而且绝对不会缺字变方块。

**第二步，交易时间是自己算的，不是查表**：`computeSleepSeconds` 用一个日期算法（Howard Hinnant 的公历转天数算法）算出今天是星期几，再结合港股的开盘/午休/收盘时间点，决定"接下来该睡多久再醒来刷新"。开盘中每 10 分钟刷一次，收盘后直接跳到下一个交易日的开盘时间，不会在半夜傻乎乎地空转。

**第三步，价格没变就不重绘**：墨水屏刷新一次要好几秒还会闪烁，所以代码里用 `lastPriceF` 记住上一次画的价格，没变化就跳过，只有真的变了才重新刷屏，能省不少刷新次数。

**第四步，BUSY 引脚诊断**：开机第一时间读一下 BUSY 引脚电平，如果不是预期的高电平，大概率是接线或供电有问题，提前给自己一个提醒，省得排查到最后才发现是接线错了。

## 常见问题排查

别慌，80% 的问题都出在这几个地方：

- **串口报 `E BOD: Brownout detector was triggered` 反复重启**：ESP32 欠压保护被触发，多半是 Wi-Fi 启动瞬间把电压拉低了。解决办法见上文「供电稳定性」一节——在 `3V3` 和 `GND` 之间并联一个 470μF/1000μF 电解电容加一个 0.1μF 瓷片电容，并换一根粗一点的 USB 线。
- **屏幕一直白屏没反应**：先查 BUSY 线有没有接对，串口监视器里 `[BUSY diag]` 打印的值应该是 1；如果是 0，检查接线和供电，很多时候是杜邦线没插紧。
- **每次刷新都卡住等满 30 秒才超时**：基本可以断定是 BUSY 引脚接错或者屏幕供电不足（USB 供电电流不够也会导致这个问题，换一根更粗的数据线试试）。
- **中文显示成方块或者缺字**：说明这个字没有收录进本地字库，回到"代码说明"里提到的那段，把新汉字对应的点阵数组补进去即可。
- **WiFi 死活连不上**：确认 `ssid` 和 `password` 有没有打错，同时确认路由器是 2.4GHz 频段，ESP32 大多不支持 5GHz。
- **股价一直不刷新，卡在一个数字上**：这是正常现象——如果时间戳没变化，代码会判定"已收盘"，自动拉长到 1 小时才醒一次，等到开盘时段自然会恢复正常刷新节奏。
- **编译报错找不到 `GxEPD2_750c_GDEY075Z08`**：检查 GxEPD2 库版本是不是太旧，这个屏幕型号是后来才加入库里支持列表的，升级到较新版本即可。

## FAQ 问答

**Q：ESP32 引脚可以随便换吗？**
A：可以，只要都用支持 SPI 的普通 GPIO，把代码开头 `EPD_MOSI` / `EPD_CLK` / `EPD_CS` / `EPD_DC` / `EPD_RST` / `EPD_BUSY` 这几个宏改成你实际接的引脚号即可，不需要改其他地方。

**Q：能不能把刷新频率改得更快，比如 1 分钟一次？**
A：能，把 `computeSleepSeconds` 里的 10 分钟改成想要的分钟数即可，但要注意墨水屏刷新次数是有寿命限制的，太频繁反而不划算。

**Q：用电池供电会不会有问题？**
A：代码目前是"WiFi 常驻 + delay 等待"的演示写法，WiFi 一直通电耗电较高，更适合 USB 供电；如果要用电池，建议改成深度睡眠模式，每次醒来抓完数据就断开 WiFi 睡回去。

**Q：这个项目占多少内存，ESP32 带得动吗？**
A：字库和代码本身很小，主要开销在 GxEPD2 的显示缓冲区，7.5 寸三色屏建议选 Flash 和 RAM 相对宽裕的 ESP32 型号，普通 ESP32-S3 开发板完全够用。

**Q：能不能换成显示别的股票，比如 A 股或者美股？**
A：能，把 `api_url` 换成对应股票的腾讯财经接口地址即可，但要注意 A 股/美股的开收盘时间和港股不一样，`computeSleepSeconds` 里的开盘/收盘时间点需要相应调整。并且其他中文字，需要自行进行字库的创建，才能确保不会出现方格。

**Q：屏幕能换成别的尺寸吗，比如更小的 4.2 寸？**
A：能，换成 GxEPD2 库支持的对应型号，同时注意画面坐标（比如 800、480 这些数字）要跟着新屏幕的分辨率重新调整，不然版面会错位。

## 延伸玩法

- 多只股票轮播显示，定时切换看板
- 加一个简易配网网页，不用每次改代码里的 WiFi 账号密码
- 接光敏电阻，白天正常刷新、夜里自动降低刷新频率省电
- 改成深度睡眠 + 电池供电，做成真正可以随手放在桌上的无线小摆件

## 参考资料

- [GxEPD2 GitHub 仓库](https://github.com/ZinggJM/GxEPD2)
- [Adafruit GFX Library GitHub 仓库](https://github.com/adafruit/Adafruit-GFX-Library)
- [Espressif ESP32 官方文档](https://www.espressif.com/en/products/socs/esp32)
