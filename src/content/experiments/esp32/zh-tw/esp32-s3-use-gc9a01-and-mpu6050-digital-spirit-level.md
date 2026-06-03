---
title: "ESP32-S3 + GC9A01 + MPU6050 製作數位水平儀完整教學｜SPI + I2C + Arduino"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-03
intro: "用 ESP32-S3 驅動 GC9A01 圓形 LCD 和 MPU6050 六軸感測器，即時顯示俯仰角、橫滾角和溫度，製作一個好看又實用的數位水平儀。"
image: "https://img.lingflux.com/2026/06/64f482f7efccfdc6b16f216a95efc28e.jpg"
---

# ESP32-S3 + GC9A01 + MPU6050 數位水平儀完整教學（SPI + I2C + Arduino）

難度：⭐⭐☆☆☆（新手可上手）
預計時間：45 分鐘
測試環境：Arduino IDE 2.3.8 ｜ Arduino_GFX_Library v1.6.5 ｜ MPU6050_light v1.2.1

---

> **一句話摘要**：ESP32-S3 驅動 GC9A01 圓形 TFT + MPU6050 六軸感測器，做一個即時氣泡水平儀，氣泡顏色隨傾斜角度變化（綠→黃→紅），附完整接線表和 Arduino 程式碼。

---

> **TL;DR（快速上手）：**
>
> 1. MPU6050 接線：SDA → GPIO 15，SCL → GPIO 16，AD0 → GND（固定 I2C 位址 0x68）
> 2. GC9A01 接線：CLK → GPIO 12，MOSI → GPIO 11，CS → GPIO 9，DC → GPIO 10，RST → GPIO 18，BL → GPIO 7
> 3. 安裝函式庫：`GFX Library for Arduino`（作者 moononournation）+ `MPU6050_light`（作者 rfetick）
> 4. 燒錄程式碼，上電後**保持水平靜置約 1 秒**等校準提示消失，然後隨意傾斜看氣泡跑

---

## 前言

你有沒有試過徒手安裝一塊層板，覺得「差不多水平了」，放上東西才發現所有東西都在往一邊滑？

我就是這種人。本來是借不到傳統水平儀，想著翻翻零件盒碰碰運氣——結果圓形螢幕 GC9A01 和 MPU6050 都在角落裡吃灰，兩個湊在一起剛好就是一個數位水平儀的全部原料。

更妙的是，圓形螢幕做水平儀在視覺上也天作之合：氣泡置中 = 綠色，偏一點 = 黃色，傾斜過頭 = 紅色，一眼就看懂，不需要任何說明書。

本文目標：**從零開始，接線 → 裝函式庫 → 燒程式碼 → 看氣泡動**，照著做就能重現。

---

## 實驗效果

![](https://img.lingflux.com/2026/06/09a4ed83eaa702df1ded539d608c9323.jpg)

螢幕即時顯示四項內容：

- **中央氣泡**：隨裝置傾斜移動，顏色三段指示（綠 = 水平 / 黃 = 輕微傾斜 / 紅 = 明顯傾斜）
- **合成傾斜角**（°）：Pitch 和 Roll 的合成值，大字顯示
- **Pitch / Roll 分項數值**：俯仰角與橫滾角各自的讀數
- **晶片溫度**：MPU6050 內建溫度感測器的讀數（比室溫偏高屬正常，後文有說明）


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30s2V_TAoMo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## 元件說明

### GC9A01 圓形 TFT 顯示螢幕

把它想像成**一塊被專門裁成圓形的手機螢幕**——240×240 的解析度不算頂尖，但貼著圓形玻璃放在桌上，做水平儀的錶盤簡直是為它量身打造的。

| 參數 | 數值 |
| --- | --- |
| 解析度 | 240 × 240 px（圓形顯示區域） |
| 介面 | SPI（最高 80 MHz） |
| 供電 | 3.3V |
| 色深 | 65K 色（RGB565） |
| 面板類型 | IPS |

選它的原因：圓形錶盤天然適配氣泡水平儀造型，SPI 高速介面跑 20fps 動畫完全夠用。

### MPU6050 六軸慣性感測器

把它想像成**手機陀螺儀和加速度計的合體版**——手機自動旋轉螢幕、LINE 計步，用的就是同類晶片。MPU6050 把三軸加速度計（感知傾斜方向）和三軸陀螺儀（感知旋轉速率）塞進同一顆 4mm × 4mm 的小晶片，還順手附贈了一個溫度感測器。

| 參數 | 數值 |
| --- | --- |
| 加速度量程 | ±2 / ±4 / ±8 / ±16 g（可設定） |
| 陀螺儀量程 | ±250 / ±500 / ±1000 / ±2000 °/s（可設定） |
| ADC 解析度 | 16 位元 |
| 介面 | I2C（最高 400 kHz 快速模式） |
| 供電 | 3.3V（VDD 範圍：2.375 ～ 3.46V） |
| I2C 位址 | 0x68（AD0 = GND）/ 0x69（AD0 = VCC） |

選它的原因：價格極低、函式庫支援完善，`MPU6050_light` 直接輸出融合角度，不用自己寫卡爾曼濾波。

---

## BOM 表

| 元件 | 型號 / 規格 | 數量 |
| --- | --- | --- |
| 主控開發板 | ESP32-S3 | 1 |
| 圓形 TFT 螢幕 | GC9A01 240×240 IPS | 1 |
| 六軸感測器 | MPU6050 模組 | 1 |
| 導線 | 杜邦線 | 若干 |

---

## 元件腳位說明

### GC9A01 腳位

| 腳位標註 | 功能 |
| --- | --- |
| VCC | 3.3V 主供電 |
| GND | 電源地 |
| SCL / CLK | SPI 時脈（SCLK） |
| SDA / MOSI | SPI 主出從入資料 |
| CS | 片選（低電位有效） |
| DC | 資料 / 命令切換 |
| RST | 硬體重置（低電位有效） |
| BL | 背光控制 |

### MPU6050 腳位

| 腳位標註 | 功能 |
| --- | --- |
| VCC | 3.3V 主供電 |
| GND | 電源地 |
| SDA | I2C 資料線 |
| SCL | I2C 時脈線 |
| INT | 中斷輸出（輪詢模式不接） |
| AD0 | I2C 位址選擇（接 GND = 0x68） |
| XDA / XCL | 輔助 I2C 介面（本專案不接） |

---

## 接線方式

> 建議按下表逐行接完，每接一根在旁邊打個勾，能省 80% 的除錯時間。

### MPU6050 → ESP32-S3

| MPU6050 腳位 | ESP32-S3 腳位 | 說明 |
| --- | --- | --- |
| VCC | 3.3V | 主供電 |
| GND | GND | 共地 |
| SDA | GPIO 15 | I2C 資料線 |
| SCL | GPIO 16 | I2C 時脈線 |
| AD0 | GND | 固定 I2C 位址為 0x68 |
| INT / XDA / XCL | 不接 | 本專案不需要 |

**關於 I2C 上拉電阻**：標準做法是在 SDA 和 SCL 各接一顆 4.7kΩ 上拉電阻到 3.3V，能明顯提升高速讀取的抗干擾穩定性。本範例省略了這一步，但如果你要做成成品，建議加上。

### GC9A01 → ESP32-S3

| GC9A01 腳位 | ESP32-S3 腳位 | 說明 |
| --- | --- | --- |
| VCC | 3.3V | 主供電 |
| GND | GND | 共地 |
| SCL / CLK | GPIO 12 | SPI 時脈 |
| SDA / MOSI | GPIO 11 | SPI 資料 |
| CS | GPIO 9 | 片選 |
| DC | GPIO 10 | 資料 / 命令切換 |
| RST | GPIO 18 | 硬體重置 |
| BL | GPIO 7 | 背光（可選，有些模組沒有這個腳位。程式控制高低電位，或直接接 3.3V 常亮） |



---

## 需要安裝的函式庫

在 Arduino IDE 選單 **工具 → 管理函式庫** 裡搜尋並安裝：

| 函式庫名稱 | 作者 | 測試通過版本 |
| --- | --- | --- |
| GFX Library for Arduino | moononournation | v1.6.5 |
| MPU6050_light | rfetick | v1.2.1 |

版本不一致可能導致 API 變動，建議安裝表中版本。安裝完後重新啟動 Arduino IDE，再開專案。



---

## 完整程式碼

```cpp
/**
 * ESP32-S3 + GC9A01 + MPU6050 數位水平儀
 * Digital Spirit Level
 *
 * 接線：
 *   GC9A01  → SCL=12, SDA=11, CS=9, DC=10, RST=18, BL=7
 *   MPU6050 → SDA=15, SCL=16, AD0=GND（I2C 位址 0x68）
 */

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <MPU6050_light.h>

// ---- 顏色定義（RGB565 格式）----
#define COLOR_BG       0x0863   // 深色背景
#define COLOR_GRID     0x1A69   // 刻度網格線
#define COLOR_GREEN    0x07E6   // 氣泡置中 → 綠色
#define COLOR_YELLOW   0xFEA0   // 輕微傾斜 → 黃色
#define COLOR_RED      0xF820   // 傾斜過大 → 紅色
#define COLOR_TEXT     0xC618   // 普通文字
#define COLOR_ACCENT   0xFD20   // 中心十字線

// ---- GC9A01 SPI 腳位 ----
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---- MPU6050 I2C 腳位（務必與接線表一致）----
#define MPU_SDA  15   // SDA → GPIO 15
#define MPU_SCL  16   // SCL → GPIO 16

// ---- 初始化顯示驅動 ----
// 第一步：建立 SPI 匯流排，參數順序：DC, CS, SCK, MOSI, MISO
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA,
    GFX_NOT_DEFINED
);
// 第二步：建立 GC9A01 螢幕物件（rotation=0，IPS 面板=true）
Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST, 0, true
);
// 第三步：建立 240×240 離屏 Canvas（雙緩衝，防畫面撕裂）
Arduino_Canvas *canvas = new Arduino_Canvas(
    240, 240, gfx
);

// ---- MPU6050 ----
MPU6050 mpu(Wire);

// ---- 畫面更新率控制 ----
const int16_t cx = 120, cy = 120;    // 螢幕圓心座標（像素）
unsigned long lastFrame = 0;
const int frameDelay = 1000 / 20;    // 目標畫面更新率：20fps → 每幀 50ms

// ---- 函式前向宣告 ----
void drawGrid();
void drawBubble(float pitch, float roll);
void drawReadouts(float pitch, float roll, float temp);

// =============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("=== ESP32-S3 數位水平儀 啟動中 ===");

    // 第一步：初始化螢幕和背光
    gfx->begin();
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);    // 開啟背光
    canvas->begin();
    Serial.println("[OK] 螢幕初始化完成");

    // 第二步：初始化 I2C，掃描匯流排（方便除錯時確認接線）
    Wire.begin(MPU_SDA, MPU_SCL);
    Serial.print("[DBG] 掃描 I2C 匯流排 SDA=");
    Serial.print(MPU_SDA);
    Serial.print(" SCL=");
    Serial.println(MPU_SCL);

    byte found = 0;
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            Serial.print("  找到 I2C 裝置，位址：0x");
            Serial.println(addr, HEX);
            found++;
        }
    }
    if (found == 0) {
        Serial.println("[ERROR] 未找到任何 I2C 裝置！請檢查接線。");
    }

    // 第三步：初始化 MPU6050
    byte status = mpu.begin();
    if (status == 0) {
        Serial.println("[OK] MPU6050 連線成功");
    } else {
        Serial.println("[ERROR] MPU6050 未回應！檢查接線或 I2C 位址。");
    }

    // 第四步：陀螺儀自動校準（執行期間保持裝置水平靜置約 1 秒）
    Serial.println("[DBG] 校準中，請保持裝置水平，不要移動...");
    canvas->fillScreen(COLOR_BG);
    canvas->setTextColor(COLOR_TEXT);
    canvas->setTextSize(1);
    canvas->setCursor(60, 110);
    canvas->print("Calibrating...");
    canvas->setCursor(55, 125);
    canvas->print("Keep device flat");
    canvas->flush();

    delay(1000);
    mpu.calcOffsets();    // 自動計算加速度計和陀螺儀的零偏

    Serial.print("[DBG] 加速度偏移: ");
    Serial.print(mpu.getAccXoffset());  Serial.print(", ");
    Serial.print(mpu.getAccYoffset());  Serial.print(", ");
    Serial.println(mpu.getAccZoffset());
    Serial.print("[DBG] 陀螺儀偏移: ");
    Serial.print(mpu.getGyroXoffset()); Serial.print(", ");
    Serial.print(mpu.getGyroYoffset()); Serial.print(", ");
    Serial.println(mpu.getGyroZoffset());
    Serial.println("[OK] 校準完成，開始執行！");
}

// =============================================================
static int logCnt = 0;    // 除錯日誌節流計數器

void loop() {
    unsigned long now = millis();
    if (now - lastFrame < frameDelay) return;    // 畫面更新率節流
    lastFrame = now;

    // 第一步：讀取感測器
    mpu.update();
    float pitch = mpu.getAngleY();     // 俯仰角（前後傾斜）
    float roll  = -mpu.getAngleX();    // 橫滾角（左右傾斜，取反對齊視覺方向）
    float temp  = mpu.getTemp();       // 晶片溫度（比環境溫度偏高屬正常）

    // 除錯日誌：每 20 幀（約 1 秒）印一次，不影響畫面更新率
    if (++logCnt >= 20) {
        logCnt = 0;
        Serial.print("[DBG] pitch="); Serial.print(pitch, 2);
        Serial.print(" roll=");       Serial.print(roll,  2);
        Serial.print(" temp=");       Serial.print(temp,  1);
        Serial.print(" | accX=");     Serial.print(mpu.getAccX(), 2);
        Serial.print(" accY=");       Serial.print(mpu.getAccY(), 2);
        Serial.print(" accZ=");       Serial.println(mpu.getAccZ(), 2);
    }

    // 第二步：限幅——超過 ±45° 時氣泡貼邊顯示，不會跑出圓圈
    pitch = constrain(pitch, -45.0f, 45.0f);
    roll  = constrain(roll,  -45.0f, 45.0f);

    // 第三步：繪製當前幀
    canvas->fillScreen(COLOR_BG);        // 清空畫布
    drawGrid();                          // 刻度網格
    drawBubble(pitch, roll);             // 氣泡
    drawReadouts(pitch, roll, temp);     // 數值文字
    canvas->flush();                     // 推送到螢幕
}

// =============================================================
// 繪製背景刻度圈和中心十字準星
void drawGrid() {
    canvas->drawCircle(cx, cy,  25, COLOR_GRID);
    canvas->drawCircle(cx, cy,  50, COLOR_GRID);
    canvas->drawCircle(cx, cy,  80, COLOR_GRID);
    canvas->drawCircle(cx, cy, 105, COLOR_GRID);
    canvas->drawFastHLine(15, cy,  210, COLOR_GRID);
    canvas->drawFastVLine(cx, 15,  210, COLOR_GRID);
    // 中心十字準星（使用強調色，比網格更顯眼）
    canvas->drawFastHLine(cx - 5, cy,     10, COLOR_ACCENT);
    canvas->drawFastVLine(cx,     cy - 5, 10, COLOR_ACCENT);
}

// 根據 pitch/roll 角度映射氣泡位置，並按距離著色
void drawBubble(float pitch, float roll) {
    // ±45° 線性映射到 ±90px 偏移
    int16_t bx = cx + (int16_t)(roll  / 45.0f * 90.0f);
    int16_t by = cy + (int16_t)(pitch / 45.0f * 90.0f);

    // 計算氣泡與中心的像素距離，決定顏色等級
    float dist = sqrt((float)((bx - cx) * (bx - cx) + (by - cy) * (by - cy)));
    uint16_t color;
    if      (dist < 10) color = COLOR_GREEN;    // ≈ ±5° 內：水平
    else if (dist < 40) color = COLOR_YELLOW;   // ≈ ±20° 內：輕微傾斜
    else                color = COLOR_RED;       // 超過 ±20°：明顯傾斜

    // 中心到氣泡的連線 + 實心氣泡 + 白色描邊
    canvas->drawLine(cx, cy, bx, by, COLOR_GRID);
    canvas->fillCircle(bx, by, 8, color);
    canvas->drawCircle(bx, by, 8, 0xFFFF);
}

// 繪製角度數值、狀態文字和溫度
void drawReadouts(float pitch, float roll, float temp) {
    float total = sqrt(pitch * pitch + roll * roll);    // 合成傾斜角

    canvas->setTextSize(1);
    canvas->setTextColor(COLOR_TEXT);

    // 頂部標題
    canvas->setCursor(55, 18);
    canvas->print("DIGITAL LEVEL");

    // 合成角度：大字體，顏色與氣泡同步
    canvas->setTextSize(2);
    uint16_t color;
    if      (total < 1)  color = COLOR_GREEN;
    else if (total < 10) color = COLOR_YELLOW;
    else                 color = COLOR_RED;
    canvas->setTextColor(color);
    canvas->setCursor(75, 155);
    canvas->print(total, 1);
    canvas->print((char)247);    // ° 符號（ASCII 247）

    // 狀態文字
    canvas->setTextSize(1);
    canvas->setCursor(80, 178);
    if      (total < 1)  canvas->print("  LEVEL");
    else if (total < 10) canvas->print(" TILTED");
    else                 canvas->print("  STEEP");

    // Pitch / Roll 分項讀數
    canvas->setTextColor(COLOR_TEXT);
    canvas->setCursor(20, 195);
    canvas->print("P:"); canvas->print(pitch, 1);
    canvas->print(" R:"); canvas->print(roll,  1);

    // 溫度（晶片接面溫度，比室溫偏高屬正常現象）
    canvas->setCursor(60, 210);
    canvas->print("T:"); canvas->print(temp, 1);
    canvas->print("C");
}
```

---

## 程式碼說明

**初始化流程（setup）**

setup 裡按順序走四步：螢幕初始化 → I2C 掃描 → MPU6050 初始化 → 陀螺儀校準。這個時候，你的模組怎麼擺放，中心點就會設定在那個位置。

螢幕用 `Arduino_Canvas` 做離屏雙緩衝——所有繪製先在記憶體裡完成，最後一次性 `flush()` 推到螢幕，畫面不會出現撕裂或中間幀。

I2C 掃描那一段會在序列埠印出找到的裝置位址，上電第一次除錯時可以先開啟序列埠監視器確認 MPU6050 有沒有接通（正常應該印出 `Found I2C device at 0x68`）。

`mpu.calcOffsets()` 是自動校準，執行約 1 秒，期間需要保持裝置水平靜置。**每次上電都會重新校準**，所以每次開機先放平，等螢幕提示消失再使用。

**主迴圈（loop）**

畫面更新率鎖定在 20fps，每幀做四件事：讀感測器 → 限幅 → 繪製 → 推送螢幕。

`roll = -mpu.getAngleX()` 前面加了負號——目的是讓螢幕氣泡的移動方向和實際傾斜方向保持一致，不取反的話氣泡會往反方向跑。如果你的安裝方向不同，可以自行調整正負號。

氣泡顏色三段判斷：距圓心 <10px 綠色，<40px 黃色，其餘紅色，大約對應 ±5° 以內、±20° 以內、超過 ±20°。

---

## 常見問題排除

別慌，90% 的問題就出在接線和位址這幾個地方：

**螢幕全白 / 全黑，沒有任何顯示**

先確認 VCC 是否接的 3.3V 而不是 5V（GC9A01 不耐壓），BL 背光腳位是否已接通。再檢查 CS、DC、RST 三條線有沒有接錯——CS 接錯螢幕不回應，RST 懸空會卡在重置狀態。可以先把 BL 直接接 3.3V 常亮，如果螢幕亮白，說明螢幕沒問題，是 SPI 初始化失敗。

**序列埠印出 `[ERROR] 未找到任何 I2C 裝置`**

用三用電表量一下 MPU6050 的 VCC 腳位有沒有 3.3V。再確認 SDA 和 SCL 沒有接反（SDA → GPIO 15，SCL → GPIO 16）。**AD0 必須明確接 GND**，懸空狀態下部分模組位址不穩定，I2C 匯流排會不應答。

**氣泡持續亂抖，無法穩定下來**

上電校準時裝置沒有完全靜置。重新上電，放在平整桌面上，等待螢幕上的校準提示消失後再使用。如果桌面本身在振動（旁邊有印表機、風扇），換個位置。

**Pitch 或 Roll 方向反了**

根據開發板的安裝方向，在程式碼裡調整對應角度前面的正負號：`pitch = mpu.getAngleY()` 改為 `pitch = -mpu.getAngleY()`，或者調整 `roll` 那行，調到方向正確為止。

**溫度比室溫高出十幾度**

正常現象。MPU6050 測的是晶片接面溫度，比環境溫度高 10～20°C 很常見，僅供參考。如果需要精確環境溫度，接一顆獨立感測器（如 DS18B20）。

**畫面閃爍或有撕裂感**

程式碼已啟用 `Arduino_Canvas` 雙緩衝，正常情況下不撕裂。如果依然有問題，檢查 SPI 杜邦線是否鬆動，線材不要超過 20cm，必要時在電源腳位附近加 100nF 去耦電容。

---

## FAQ

**Q：MPU6050 的角度更新頻率是多少？**
A：`MPU6050_light` 以 I2C 400kHz 快速模式讀取，原始資料取樣率最高 1kHz。本程式碼畫面更新率限定 20fps，實際更新 20Hz。如果需要更高更新率，把 `frameDelay` 改為更小的值，實測 40fps 以內比較穩定（受 SPI 推送螢幕速度限制）。

**Q：腳位可以換其他的 GPIO 嗎？**
A：可以，修改程式碼頂部的 `#define` 巨集即可。GC9A01 的 SPI 腳位建議選 ESP32-S3 硬體 SPI（GPIO 11 / 12 是 SPI2，效能最佳）；MPU6050 的 I2C 腳位任意 GPIO 均可，只需程式碼和接線保持一致。

**Q：GC9A01 能換成方形螢幕嗎？**
A：可以。把 `Arduino_GC9A01` 替換成對應驅動類（例如 ST7789 用 `Arduino_ST7789`），修改 `Arduino_Canvas` 的寬高和圓心座標 `cx/cy` 即可，繪製邏輯不用動。

**Q：ESP32-S3 的 3.3V 同時帶 GC9A01 和 MPU6050 夠用嗎？**
A：夠用。GC9A01 背光電流約 20mA，MPU6050 典型功耗 3.5mW（約 1mA），合計遠低於開發板 3.3V 腳位通常 300～500mA 的限流。

**Q：能在同一條 I2C 匯流排上掛兩個 MPU6050 嗎？**
A：可以。一個 AD0 接 GND（位址 0x68），另一個 AD0 接 VCC（位址 0x69），共用同一組 SDA/SCL。程式碼裡宣告兩個 `MPU6050` 物件並分別傳入不同位址初始化即可。

**Q：每次斷電重啟都要重新校準嗎？**
A：是的，本程式碼每次上電都在 `setup()` 裡呼叫 `mpu.calcOffsets()` 做一次動態校準。如果你的使用場景是固定安裝，可以把偏移量存到 EEPROM，下次上電直接讀取，省去校準等待時間。

---

## 延伸玩法

- 接按鍵切換顯示模式（水平儀 / 即時角度曲線 / 溫度計）
- 把校準基準值存入 EEPROM，補償固定安裝面的偏角
- 接無源蜂鳴器，水平時發出提示音
- 換一套圓形錶盤面板，做成磁力羅盤或 G-Force 顯示器

---

## 參考資料

- [MPU-6000 / MPU-6050 產品規格書 — InvenSense（TDK）](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [GC9A01A 資料手冊 — Galaxycore](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [MPU6050_light GitHub — rfetick](https://github.com/rfetick/MPU6050_light)
- [ESP32-S3 技術參考手冊 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3 產品頁 — Espressif](https://www.espressif.com/en/products/socs/esp32-s3)
