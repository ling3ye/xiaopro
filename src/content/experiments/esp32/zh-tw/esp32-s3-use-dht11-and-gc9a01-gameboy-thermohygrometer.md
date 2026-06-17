---
title: "DHT11 + GC9A01 圓形螢幕打造 Game Boy 像素復古風溫濕度計｜ESP32-S3 SPI 接線 + Arduino 完整程式碼"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/dht11
category: esp32
date: 2026-06-18
intro: "用 ESP32-S3 驅動 GC9A01 240×240 圓形螢幕搭配 DHT11 感測器，重現 Game Boy DMG 經典奶油綠四階配色，做一個會閃爍警示的像素復古桌面溫濕度計。附完整接線表、Arduino 函式庫安裝與全註解程式碼，新手友善。"
image: "https://img.lingflux.com/2026/06/4d154493c9e833bc839cec1050f749f6.jpg"
---

# DHT11 + GC9A01 圓形螢幕打造 Game Boy 像素復古風溫濕度計（完整教學）（ESP32-S3 · SPI 接線 · Arduino 程式碼）

---

## TL;DR · 三分鐘速覽

> 沒時間看長文？核心步驟在這裡，有基礎的同學照著飛：
>
> 1. **接線**：DHT11 資料腳位 → GPIO 47；GC9A01 圓形螢幕 SPI 接線：SCK→GPIO12，MOSI→GPIO11，CS→GPIO9，DC→GPIO10，RST→GPIO18，BL→GPIO7
> 2. **安裝兩個函式庫**：Arduino IDE 搜尋安裝 `Arduino_GFX_Library`（Moon On Our Nation）與 `DHT sensor library`（Adafruit）
> 3. **貼上文末完整程式碼**，Arduino IDE 選擇開發板 `ESP32S3 Dev Module`
> 4. **編譯上傳**，等待約 30 秒燒錄完成
> 5. **上電驗證**：圓形螢幕亮起奶油綠底色，上半區顯示溫度（°C），下半區顯示濕度（%），極端值自動閃爍警示 ✅

---

## 前言：一塊會「玩」的溫濕度計

說實話，我用過不少顯示溫濕度的方案——大 OLED 螢幕、小數碼管、甚至序列埠印出來……每次看到螢幕上孤零零的幾個數字，心裡都有種說不出的空虛感。又不是不能用，就是少了那麼點**靈魂**。

直到有一天翻出了小時候的 Game Boy，那塊經典的奶油黃綠螢幕突然給了我靈感：**同樣是顯示數字，為什麼不弄得復古一點、好玩一點？**

於是就有了這個專案——用 ESP32-S3 驅動一塊 GC9A01 圓形 LCD，配上 DHT11 溫濕度感測器，全程手寫像素字體，把 Game Boy DMG 那套標誌性的四階綠色調搬到圓形螢幕上，做一個擺在桌上就讓人忍不住多看兩眼的**像素復古溫濕度計**。

沒有現成 UI 函式庫，沒有複雜框架，全靠 `fillRect()` 一個格一個格地「堆」出像素數字——這種笨方法反而最有感覺。

**本文目標**：零基礎也能跟著走完整個流程，最終在 GC9A01 圓形螢幕上看到即時溫濕度，而且顯示效果要夠騷氣。

---

## 實驗效果

![](https://img.lingflux.com/2026/06/755f0087c027a35770edb0fd87a81a35.jpg)

最終效果一句話描述：**240×240 圓形螢幕，奶油綠底色，像素大號溫濕度數值置中顯示，數值變化有緩動過渡，超限自動閃爍警示，更新率約 30fps，無任何撕裂閃爍**。

---

## 元件說明

在買零件之前，先認識一下今天的三位主角。

### ESP32-S3 · 這個專案裡唯一有腦子的部分

ESP32-S3 是樂鑫出的 Wi-Fi + 藍牙雙模晶片，但今天我們用的不是它的網路能力，而是它**充裕的 GPIO、充足的記憶體和夠快的 SPI 匯流排**。

> 類比理解：如果 GC9A01 圓形螢幕是一台電視機，ESP32-S3 就是那個往電視裡塞節目訊號的機上盒——所有的「內容」都從它出發，螢幕只負責「播放」。

關鍵參數：
- 主頻 240 MHz（雙核 Xtensa LX7）
- 記憶體 512 KB SRAM，另有 PSRAM 可選
- 支援硬體 SPI，最高可跑 80 MHz
- 3.3V 工作電壓，GPIO 耐壓 3.3V（⚠️ 切勿接 5V 訊號）

---

### GC9A01 圓形螢幕 · 像素復古感的來源

GC9A01 是一塊解析度 **240×240** 的圓形 IPS LCD 驅動晶片，通常做成直徑約 1.28 英吋的小圓形螢幕模組，介面是標準 4 線 SPI。

> 類比理解：你見過那種老式機械手錶面盤嗎？GC9A01 就是把那塊面盤換成了可以程式控制顯示任何內容的彩色小螢幕——圓的，就是這麼優雅。

關鍵參數：
- 解析度：240 × 240 像素，圓形可視區
- 介面：4 線 SPI（支援最高 80 MHz 時脈）
- 色深：16 位元 RGB565（65536 色）
- 工作電壓：3.3V（VCC 與邏輯電平均為 3.3V，**不要接 5V！**）
- 背光：獨立腳位控制（BL），高電位點亮

---

### DHT11 · 愛管閒事的小鄰居

DHT11 是一款整合溫度 + 濕度於一體的低成本數位感測器，一根資料線就能把兩個資料傳回來，用起來異常省事。

> 類比理解：DHT11 就像一個住在你房間裡、時刻盯著你回報「現在多少度、空氣多不多水」的小鄰居，雖然精度一般，但夠用，還安靜。

關鍵參數：
- 溫度範圍：0 ~ 50°C，精度 ±2°C
- 濕度範圍：20% ~ 90% RH，精度 ±5% RH
- 取樣間隔：最短 1 秒（程式碼裡設為每 2 秒讀一次）
- 資料介面：單匯流排數位協定（1-Wire 變種）
- 工作電壓：3.3V 或 5V 均可（本專案接 3.3V）

---

## BOM 表（物料清單）

| 元件 | 型號 / 規格 | 數量 | 備註 |
| :--- | :--- | :---: | :--- |
| 主控開發板 | ESP32-S3 Dev Module | 1 | 確認板載 USB-C 燒錄口 |
| 圓形彩屏 | GC9A01 · 1.28 吋 · 240×240 SPI | 1 | 購買時選帶 BL 腳位版本 |
| 溫濕度感測器 | DHT11 模組（帶上拉電阻的模組版） | 1 | 建議買模組版，省去外接電阻 |
| 跳線 | 杜邦線（公對公 / 公對母） | 若干 | 兩種都備一些 |

---

## 接線方式

### DHT11 → ESP32-S3

| DHT11 腳位 | ESP32-S3 腳位 | 說明 |
| :--- | :--- | :--- |
| GND | GND | 共地 |
| VCC | 3V3 | 感測器供電（3.3V） |
| DAT（DATA） | GPIO 47 | 資料匯流排 |

### GC9A01 圓形螢幕 → ESP32-S3

| GC9A01 腳位 | ESP32-S3 腳位 | 說明 |
| :--- | :--- | :--- |
| VCC | 3.3V | 螢幕主供電（⚠️ 務必接 3.3V，不是 5V） |
| GND | GND | 共地 |
| SCL / CLK | GPIO 12 | SPI 時脈線 |
| SDA / MOSI | GPIO 11 | SPI 資料線 |
| CS | GPIO 9 | 片選訊號（低電位有效） |
| DC | GPIO 10 | 資料/命令切換 |
| RST | GPIO 18 | 硬體重置 |
| BL | GPIO 7 | 背光控制（可能沒有這個腳位，程式碼裡拉高常亮；也可直接接 3.3V） |

> 💡 **實用提醒**：接線完成後不要急著上電——逐行對著上表核對一遍，重點確認 VCC 接的是 **3.3V 而不是 5V**（GC9A01 接 5V 基本報廢），以及 DHT11 的 DAT 有沒有接對 GPIO。踩過這個坑的人都懂那種「通電然後螢幕再也不亮」的絕望。



---

## 安裝所需函式庫

打開 Arduino IDE，進入 **工具 → 管理程式庫**，搜尋並安裝以下兩個函式庫：

**1. Arduino_GFX_Library**

- 搜尋關鍵字：`Arduino_GFX`
- 作者：`Moon On Our Nation`
- 作用：負責驅動 GC9A01 圓形螢幕，包含雙緩衝 Canvas 功能（消除畫面閃爍的關鍵）

**2. DHT sensor library**

- 搜尋關鍵字：`DHT sensor library`
- 作者：`Adafruit`
- 安裝時彈出「是否安裝相依套件」，選 **Install all**（順手把 Adafruit Unified Sensor 一起裝上）

> 安裝完成後，建議重啟 Arduino IDE，確保函式庫檔案被正確載入。

---

## 完整程式碼

程式碼結構說明：
- **初始化階段**：點亮背光 → 初始化螢幕 → 讀取 DHT11 首次資料
- **主迴圈**：每 2 秒讀感測器，每 33ms（約 30fps）算繪一幀
- **算繪機制**：先畫到記憶體 Canvas，再一次性 flush 到螢幕，杜絕撕裂與閃爍
- **像素字體**：5×7 用於標籤文字，5×9 用於大號數值，全部手工 `fillRect()` 逐格繪製
- **警示動畫**：溫度超過 35°C 或低於 5°C、濕度超過 85% 或低於 20% 時，數字以 400ms 間隔閃爍

```cpp
/**
 * ╔══════════════════════════════════════════════════╗
 * ║   ESP32-S3 圓形溫濕度計 · GAME BOY 像素懷舊版    ║
 * ║   硬體：ESP32-S3 + GC9A01(240×240) + DHT11       ║
 * ║   函式庫：Arduino_GFX_Library + DHT(Adafruit)    ║
 * ╚══════════════════════════════════════════════════╝
 *
 * 配色方案 —— Game Boy DMG 經典四階綠：
 *   PAL_BG      #CADC9F  奶油黃綠（背景底色，懷舊感來源）
 *   PAL_LITE    #9BBC0F  最亮綠  （高光裝飾）
 *   PAL_MID     #8BAC0F  亮綠    （裝飾圓點）
 *   PAL_DARK    #306230  中綠    （標籤文字 / 分隔線）
 *   PAL_DARKEST #0F380F  墨綠    （主數字 / 外框，最高對比度）
 *
 * 警示邏輯（單色機經典手法）：
 *   溫度 >35°C 或 <5°C → 數字以 400ms 間隔閃爍
 *   濕度 >85% 或 <20%  → 同上
 */

#include <Arduino_GFX_Library.h>
#include <DHT.h>

// ══════════════════════════════════════════
// 步驟 1：腳位定義
//   修改這裡的數字就能換腳位，其他地方不用動
// ══════════════════════════════════════════
#define DHTPIN    47      // DHT11 資料腳位
#define DHTTYPE   DHT11

#define TFT_SCK   12     // GC9A01 SPI 時脈
#define TFT_MOSI  11     // GC9A01 SPI 資料
#define TFT_CS    9      // GC9A01 片選
#define TFT_DC    10     // GC9A01 資料/命令
#define TFT_RST   18     // GC9A01 硬體重置
#define TFT_BL    7      // GC9A01 背光（HIGH = 點亮）

// ══════════════════════════════════════════
// 步驟 2：Game Boy (DMG) 四階綠調色盤
//   顏色格式：RGB565（16位元）
//   不用在這裡改顏色，改了就不是 Game Boy 風了 :)
// ══════════════════════════════════════════
#define PAL_BG       0xCF69   // 奶油黃綠 —— 背景底色
#define PAL_LITE     0x9DC2   // 最亮綠   —— 高光裝飾（暫未大量使用）
#define PAL_MID      0x8D42   // 亮綠     —— 頂欄閃爍圓點
#define PAL_DARK     0x3306   // 中綠     —— 標籤/分隔線
#define PAL_DARKEST  0x11C2   // 墨綠     —— 主數字/外框

// ══════════════════════════════════════════
// 步驟 3：螢幕常數與字體縮放比
// ══════════════════════════════════════════
#define CX  120        // 圓心 X（螢幕正中）
#define CY  120        // 圓心 Y（螢幕正中）

#define BOLD_SCALE  6  // 大號數字放大倍數（5×9 字形 × 6 = 30×54 像素）
#define DOT_INSET   1  // 每個像素格內縮 1px，露出背景色縫隙，呈現點陣網格感
#define UNIT_SCALE  2  // 單位（°C / %）字級
#define LBL_SCALE   2  // 標籤（TEMP / HUM）字級

// ══════════════════════════════════════════
// 步驟 4：初始化硬體物件
// ══════════════════════════════════════════
DHT dht(DHTPIN, DHTTYPE);

// 硬體 SPI 匯流排
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, GFX_NOT_DEFINED);

// GC9A01 驅動（最後一個參數 true = 不旋轉，顏色反相關）
Arduino_GFX *display = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas 雙緩衝：先在記憶體裡畫完整幀，flush() 一次性推給螢幕
//   這是消除閃爍的核心手段，類似遊戲引擎的離屏算繪
Arduino_GFX *gfx = new Arduino_Canvas(240, 240, display);

// ══════════════════════════════════════════
// 全域狀態變數
// ══════════════════════════════════════════
float g_temp = 0, g_hum = 0;          // 感測器真實讀數
float g_dispTemp = 0, g_dispHum = 0;  // 螢幕顯示值（帶緩動過渡，避免數字跳變）
bool  g_hasData = false;              // 是否已拿到至少一次有效資料

// ══════════════════════════════════════════
// 函式原型宣告（告訴編譯器「下面有這些函式」）
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
// setup() —— 上電只跑一次
// ══════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=============================");
  Serial.println("  GAME BOY 像素溫濕度計");
  Serial.println("=============================");

  // 1. 點亮背光
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 2. 初始化螢幕
  if (!gfx->begin()) {
    Serial.println("[ERROR] 螢幕初始化失敗！檢查接線後重新上電。");
    while (true) delay(500);   // 卡死在這裡，防止後續亂跑
  }
  gfx->fillScreen(PAL_BG);
  gfx->flush();
  Serial.println("[OK] 螢幕初始化完成");

  // 3. 初始化 DHT11，等待 2 秒讓感測器穩定後讀一次初始值
  dht.begin();
  Serial.println("[OK] DHT11 初始化完成，讀取中...");
  delay(2000);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    g_temp = g_dispTemp = t;
    g_hum  = g_dispHum  = h;
    g_hasData = true;
    Serial.printf("[DATA] 初始讀數 T=%.1f°C  H=%.1f%%\n", t, h);
  } else {
    Serial.println("[WARN] 初始讀取失敗，螢幕顯示 --.- 等待下一次有效讀數");
  }
}

// ══════════════════════════════════════════
// loop() —— 每 2 秒讀感測器，每 33ms 算繪一幀（約 30fps）
// ══════════════════════════════════════════
unsigned long lastRead  = 0;
unsigned long lastFrame = 0;

void loop() {
  unsigned long now = millis();

  // 每 2 秒讀一次感測器（DHT11 取樣間隔最短 1 秒，2 秒更穩）
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
      // 讀取失敗不更新數值，繼續顯示上一次有效讀數
      Serial.println("[WARN] DHT11 讀取失敗，保持上次數值");
    }
  }

  // 顯示值用 8% 緩動追蹤真實值（每幀慢慢靠近）
  //   類比：就像老式面盤的指針，不會瞬間跳到新位置
  g_dispTemp += (g_temp - g_dispTemp) * 0.08f;
  g_dispHum  += (g_hum  - g_dispHum)  * 0.08f;

  // 約 30fps 算繪（33ms 一幀）
  if (now - lastFrame >= 33) {
    lastFrame = now;
    drawScene(now);
    gfx->flush();    // 把記憶體 Canvas 一次性推到實體螢幕
  }
}

// ══════════════════════════════════════════
// drawScene() —— 算繪一幀的全部內容
//   繪製順序：背景底色 → 圓形外框 → 頂欄 → 溫度區 → 分隔線 → 濕度區
// ══════════════════════════════════════════
void drawScene(unsigned long t) {
  // 1. 清屏（奶油綠底色）
  gfx->fillScreen(PAL_BG);

  // 2. 畫圓形邊框與裝飾點
  drawBezel();

  // 3. 畫頂欄（標題 + 運行指示燈）
  drawTopBar(t);

  // 4. 溫度區
  char num[8];
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispTemp);
  else           strcpy(num, "--.-");       // 無資料時顯示佔位符

  drawCenteredPixel("TEMP", 44, LBL_SCALE, PAL_DARK);
  drawValue(num, "*C", 62, tempColor(t));   // '*' 在本字體裡映射為度數圓圈 °

  // 5. 中間虛線分隔
  drawDottedH(80, 160, 118, PAL_DARK);

  // 6. 濕度區
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispHum);
  else           strcpy(num, "--.-");

  drawCenteredPixel("HUM", 124, LBL_SCALE, PAL_DARK);
  drawValue(num, "%", 142, humColor(t));
}

// ──────────────────────────────────────────
// 圓形外框：墨綠雙線描邊 + 四個 45° 對角裝飾方塊
// ──────────────────────────────────────────
void drawBezel() {
  gfx->drawCircle(CX, CY, 116, PAL_DARKEST);
  gfx->drawCircle(CX, CY, 115, PAL_DARKEST);

  // 四個 45° 對角小方塊（cos45° ≈ 0.707）
  const int r = 104, d = (int)(r * 0.707f);
  gfx->fillRect(CX + d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // 右上
  gfx->fillRect(CX - d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // 左上
  gfx->fillRect(CX + d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // 右下
  gfx->fillRect(CX - d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // 左下
}

// ──────────────────────────────────────────
// 頂欄：置中標題 "DHT11" + 左側 500ms 閃爍指示圓點（表示系統運行中）
// ──────────────────────────────────────────
void drawTopBar(unsigned long t) {
  drawCenteredPixel("DHT11", 12, 1, PAL_DARK);

  // 閃爍點（亮/滅交替）：每 500ms 切換一次顏色
  bool on = (t / 500) % 2 == 0;
  uint16_t c = on ? PAL_DARKEST : PAL_MID;
  int16_t tw = pixelTextWidth("DHT11", 1);
  int16_t sx = CX - tw / 2;         // 標題左端 X 座標
  gfx->fillRect(sx - 12, 13, 4, 4, c);
}

// ──────────────────────────────────────────
// 數值行：大號數字本身水平置中，單位 °C/% 作右上角小上標
//   這樣數字正中顯示，不會被單位擠偏
// ──────────────────────────────────────────
void drawValue(const char *num, const char *unit,
               int16_t yTop, uint16_t col) {
  int16_t nw = boldTextWidth(num, BOLD_SCALE);
  int16_t sx = CX - nw / 2;                  // 數字置中起始 X

  drawBoldText(num, sx, yTop, BOLD_SCALE, col);
  // 單位緊貼數字右側、上抬 2px，形成上標感
  drawPixelText(unit, sx + nw + 3, yTop + 2, UNIT_SCALE, col);
}

// ──────────────────────────────────────────
// 水平像素點線（2×2 小方塊，間隔 5px）
// ──────────────────────────────────────────
void drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c) {
  for (int16_t x = x0; x <= x1; x += 5) {
    gfx->fillRect(x, y, 2, 2, c);
  }
}

// ══════════════════════════════════════════
// 顏色映射 —— 正常 = 墨綠；極端 = 以 400ms 間隔「閃爍熄滅」警示
// ══════════════════════════════════════════
uint16_t tempColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispTemp > 35.0f || g_dispTemp < 5.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;   // 熄滅 = 與背景同色
  return PAL_DARKEST;
}

uint16_t humColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispHum > 85.0f || g_dispHum < 20.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;
  return PAL_DARKEST;
}

// ══════════════════════════════════════════
// 5×7 像素字體（標籤/單位用）
//   每字元 7 行，每行低 5 位 = 列 0~4（bit4 = 最左列）
//   特殊字元：'*' 映射為度數圓圈 °，'.' 畫成基線小方塊
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
    case '*': { static const uint8_t g[7]={0x00,0x0E,0x11,0x0E,0x00,0x00,0x00}; return g; } // ° 度數圓圈
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

// 單字元前進量（像素寬 + 右側間距）
int16_t pixelAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale + (scale >> 1) + gap;   // 小數點窄一點
  return 5 * scale + gap;
}

// 計算一段文字的總像素寬度
int16_t pixelTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += pixelAdvance(*s, scale);
  return w;
}

// 逐格繪製 5×7 點陣文字
void drawPixelText(const char *s, int16_t x, int16_t y,
                   uint8_t scale, uint16_t c) {
  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      gfx->fillRect(x, y + 5 * scale, scale, scale, c);   // 小數點在基線
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

// 水平置中繪製 5×7 文字
void drawCenteredPixel(const char *s, int16_t y, uint8_t scale, uint16_t c) {
  int16_t w = pixelTextWidth(s, scale);
  drawPixelText(s, CX - w / 2, y, scale, c);
}

// ══════════════════════════════════════════
// 5×9 點陣大數字字體（溫濕度 hero 數值專用）
//
//   設計特點：
//   · 每格內縮 DOT_INSET px，露出背景色縫隙，形成 LCD 點陣網格感
//   · '2' 頂部帶稜角 + 斜筆逐格階梯 + 實心雙行底部
//   · '5' 頂底均為整行實心條
//   · '.' 不走字形表，由 drawBoldText 直接畫基線單格
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

// 大數字單字元前進量
int16_t boldAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale;    // 小數點 = 1 格寬 + 1 格間距
  return 5 * scale + gap;
}

// 計算大數字文字總寬度
int16_t boldTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += boldAdvance(*s, scale);
  return w;
}

// 逐格繪製 5×9 點陣大數字（每格內縮 DOT_INSET，讓縫隙露出背景色）
void drawBoldText(const char *s, int16_t x, int16_t y,
                  uint8_t scale, uint16_t c) {
  int8_t dot = scale - 2 * DOT_INSET;      // 點亮方塊實際邊長（內縮後）
  if (dot < 1) dot = 1;                    // 至少 1px，別消失了

  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      // 小數點：第 7 行（基線）處畫單個內縮方塊
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

## 常見問題排查

別慌，90% 的問題出在這幾個地方，逐條過一遍基本能解決：

**螢幕通電後完全不亮（背光也沒有）**

BL 腳位大概率沒接對，或者程式碼裡 `digitalWrite(TFT_BL, HIGH)` 這行沒有生效。先檢查 GPIO7 到 BL 的那根線，再試試把 BL 直接接 3.3V（繞過程式碼控制）。如果背光亮了但螢幕全黑，往下看。

**背光亮但螢幕全黑，或顯示雪花**

SPI 接線有問題，重點查 SCK（GPIO12）、MOSI（GPIO11）、CS（GPIO9）、DC（GPIO10）這四根。其中 DC 和 CS 很容易接反，這兩根一旦搞錯，螢幕就是黑的，或者顯示完全亂掉。還有，GC9A01 驅動最後一個參數 `true/false` 控制顏色反相——如果顏色看起來像底片，把 `true` 改成 `false`（或反過來）。

**螢幕顏色整體偏色，不是奶油綠**

RGB565 的位元組順序問題。Arduino_GFX_Library 一般處理好了，但如果顏色完全不對，可以嘗試在建構 `Arduino_GC9A01` 時把最後的 `true` 換成 `false`。

**序列埠一直輸出 `[WARN] DHT11 讀取失敗`**

- 檢查 DAT 腳位是否接對了 GPIO47
- 如果你用的是散裝 DHT11（不是模組版），需要在 DAT 和 VCC 之間接一個 10kΩ 上拉電阻，模組版一般已經焊上了
- `dht.begin()` 後面那個 `delay(2000)` 不能刪，DHT11 上電需要約 1 秒穩定時間，太急了會讀到 NaN
- 確認 VCC 接的是 3.3V（本專案），如果你手邊的 DHT11 只支援 5V，把 VCC 改接 5V，同時在 DAT 和 GPIO47 之間串一個電阻做電位轉換（或者直接換 DHT11 模組版，通常 3.3V 可用）

**數字更新了，但畫面有明顯閃爍/撕裂**

Canvas 雙緩衝是否正常工作？檢查程式碼裡 `gfx->flush()` 有沒有漏寫，而且**一定要用 Canvas 物件 `gfx->` 畫圖，而不是 `display->`**。另外，ESP32-S3 要選對開發板型號（`ESP32S3 Dev Module`），否則 SPI 速率會不對。

**編譯報錯：`'drawScene' was not declared in this scope`**

這是函式宣告順序的問題，確保程式碼頂部的函式原型列表裡包含了 `void drawScene(unsigned long t);`，或者把 `drawScene` 函式定義移到 `loop()` 之前。

---

## FAQ

**Q：GPIO 腳位可以換成其他編號嗎？**
A：可以，只需修改程式碼頂部的 `#define` 定義即可，無需改動其他地方。DHT11 的 DAT 可以接任意 GPIO；GC9A01 的 SCK/MOSI 建議使用 ESP32-S3 的硬體 SPI 預設腳位（GPIO 11/12）以獲得最高速度，其他腳位也能用，但需要額外設定軟體 SPI。

**Q：可以把 DHT11 換成 DHT22 嗎？**
A：完全可以。只需把程式碼第 16 行改為 `#define DHTTYPE DHT22`，其餘程式碼不變。DHT22 精度更高（溫度 ±0.5°C、濕度 ±2~5% RH），取樣間隔最短 2 秒（程式碼裡已設為 2 秒，剛好相容）。

**Q：GC9A01 的 SPI 時脈最高支援多少？**
A：GC9A01 官方規格支援最高 100 MHz SPI 時脈，實際使用中 ESP32-S3 跑 80 MHz 一般沒有問題。Arduino_GFX_Library 預設會用硬體 SPI 最大速率，無需手動設定。

**Q：ESP32-S3 的 GPIO 電壓是多少？能直接接 5V 設備嗎？**
A：ESP32-S3 的 GPIO 工作電壓為 3.3V，**不耐 5V 訊號**，直接接 5V 邏輯設備可能損壞晶片。GC9A01 圓形螢幕同樣是 3.3V 元件。如果你的 DHT11 用 5V 供電，DAT 腳位輸出的高電位約為 4.5V，建議加分壓電阻（10kΩ + 20kΩ）或電位轉換模組做降壓處理。

**Q：程式碼的更新率和 CPU 佔用率大概是多少？**
A：目前程式碼約 30fps（每幀間隔 33ms），每幀算繪時間約 8~15ms（取決於 SPI 速率），CPU 佔用率約 20~40%。雙核 ESP32-S3 的另一個核心完全閒置，如有需要可以把感測器讀取任務放到 Core 0，算繪放到 Core 1，進一步提升流暢度。

**Q：如果溫濕度數值一直顯示 `--.-` 不更新怎麼辦？**
A：這說明 `g_hasData` 一直是 `false`，即 DHT11 從未回傳有效讀數。按順序排查：① 確認 DAT 接 GPIO47；② 模組版 DHT11 不需要額外上拉電阻，散裝版需要 10kΩ；③ 用序列埠監視器（115200 鮑率）查看有沒有 `[DATA]` 或 `[WARN]` 輸出，據此判斷問題出在感測器還是接線；④ 確認 VCC 電壓（推薦 3.3V）。

**Q：程式碼裡的 `true` 參數（GC9A01 建構函式）是什麼意思？**
A：`new Arduino_GC9A01(bus, TFT_RST, 0, true)` 第四個參數控制顏色反相（IPS 面板與 TN 面板的 RGB 輸出差異）。`true` 時顏色正常輸出，`false` 時會出現類似「底片效果」的顏色反相。如果你的螢幕顯示顏色看起來是反的，把 `true` 改成 `false` 即可。

---

## 參考資料

- [Arduino_GFX_Library 官方文件與範例](https://github.com/moononournation/Arduino_GFX)
- [Adafruit DHT sensor library 文件](https://github.com/adafruit/DHT-sensor-library)
- [GC9A01 資料手冊（官方 PDF）](https://www.waveshare.com/w/upload/5/5e/GC9A01A.pdf)
- [DHT11 官方規格書（Aosong 廠商）](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf)
- [樂鑫 ESP32-S3 技術參考手冊](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_cn.pdf)
