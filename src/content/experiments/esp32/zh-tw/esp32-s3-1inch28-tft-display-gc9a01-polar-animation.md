---
title: "ESP32-S3 驅動 GC9A01 圓螢幕畫心形線｜極坐標動畫 30 分鐘搞定"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-05-19
intro: "用 ESP32-S3 驅動 1.28 吋 GC9A01 圓形 TFT 螢幕，跑極坐標心形線動畫。含完整接線、雙緩衝零閃爍程式碼和避坑指南。"
image: "https://img.lingflux.com/2026/05/a6a0b0037d4fd0650665e49e7364d65d.jpg"
---

# ESP32-S3 驅動 GC9A01 1.28 吋圓形螢幕完整教學（SPI + Arduino IDE）

難度：⭐⭐☆☆☆（新手可上手）
預計時間：30 分鐘
測試環境：
Arduino IDE 2.3.8
Arduino_GFX_Library 1.6.5
ESP32 Arduino Core 3.3.8

---

> **一句話摘要**：用 ESP32-S3 驅動 1.28 吋 GC9A01 圓螢幕，跑極坐標心形線動畫——雙緩衝零閃爍，接線 + 完整程式碼 + 避坑，30 分鐘搞定。

---

## 前言

520就來到了，可以送些什麼禮物給女朋友？百思不得其姐。

後來，想到了高中學極坐標的時候，課本上有一條曲線——心臟線。可以做一個極坐標的演示動畫，畫出一個心心出來表達我的心意。（理工男腦補了所有畫面，自嗨中....）

本文目標：讓你從零開始，30 分鐘內在使用 ESP32-S3 驅動這塊 1.28" 的圓螢幕，跑起來一個極坐標動畫——順便搞清楚每一步為什麼這麼做。（PS：希望你送出去給你心儀的對象之後，你不用跪鍵盤！～ :P ）

（看到這個心心的姐心中在想：這個是什麼鬼？！～上榴蓮）

---

## 實驗效果

圓螢幕上會即時繪製一條旋轉的**心形線（Cardioid）**，配合極坐標系網格和追蹤動點，像一台微型示波器在描繪數學曲線。全程零閃爍，幀率鎖定 16fps 流暢執行。

![](https://img.lingflux.com/2026/05/8db744891e99902a8045e4e1242911d1.jpg)

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/fcqwhO5Vr7U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 元件說明

### GC9A01 1.28 吋圓形 TFT 螢幕

GC9A01 是驅動晶片，圓形 IPS 面板是螢幕，兩者焊在同一塊小模組上，你只需要用 SPI 協議把影像資料「餵」給它，它負責點亮每一個像素。

| 參數 | 值 |
| --- | --- |
| 解析度 | 240 × 240 像素 |
| 顏色深度 | 16-bit RGB565，65536 色 |
| 接口協議 | 4 線 SPI，最高 80MHz |
| 工作電壓 | 3.3V（直接接 ESP32-S3，無需電平轉換） |
| 面板類型 | IPS，視角接近 180° |
| 模組尺寸 | 約 36mm 直徑 |

選它的理由：便宜（5～15 元），貨源廣，圓形造型天然適合做儀表板和時鐘類專案，而且 240×240 的解析度對 ESP32-S3 記憶體壓力恰好合適。

---

## BOM 表

| 元件 | 數量 | 備註 |
| --- | --- | --- |
| ESP32-S3 開發板 | 1 | 任意帶 SPI 腳位的版本均可 |
| GC9A01 1.28" 圓形螢幕模組 | 1 | 確認模組上有 BL 腳位 |
| 跳線 | 若干 | 母對母或母對公，視開發板針腳形式 |

---

## 元件腳位說明

| GC9A01 模組腳位 | 功能 |
| --- | --- |
| VCC | 電源正極（3.3V） |
| GND | 電源負極 |
| SCL / CLK | SPI 時鐘訊號 |
| SDA / MOSI | SPI 資料輸入（主→從） |
| CS | 片選，低電平時螢幕回應 SPI |
| DC | 資料/命令選擇：高=資料，低=命令 |
| RST | 硬體重置，低電平觸發 |
| BL | 背光控制，接高電平才亮螢幕 |

---

## 接線方式

> 建議按下表逐行接完，每接一根在旁邊打個勾，能省 80% 的排錯時間。

| GC9A01 螢幕 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7（程式控制）或直接接 3.3V |

> **⚠️ 注意**：BL（背光）腳位容易漏接，漏接後上電螢幕黑屏，不是程式問題，也不是螢幕壞了——查這裡先。而有一些模組是沒有引出這個 BL 腳位，那說明在模組內部已經連上了 3.3V，所以如果模組上沒有 BL，則可以不用管。

---

## 需要安裝的函式庫

開啟 Arduino IDE → 工具 → 管理函式庫，搜尋並安裝：

| 函式庫名稱 | 作者 | 測試通過版本 |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | 1.6.5 |

> 不要裝 TFT_eSPI：在 ESP32 Core 3.x 下，TFT_eSPI 的巨集定義和 DMA 初始化會與新版 ESP32 衝突，導致編譯報錯或上電死機。Arduino_GFX_Library 從頭支援現代 C++ 和記憶體畫布，是目前螢幕專案最省心的選擇。（截稿日期：2026-05-18）

---

## 完整程式碼

```cpp
/**
 * ESP32-S3 + GC9A01 1.28" 圓形螢幕 — 極坐標動畫演示
 * 雙緩衝零閃爍，鎖定 16fps
 * 接線：SCL=GPIO12, SDA=GPIO11, CS=GPIO9, DC=GPIO10, RST=GPIO18, BL=GPIO7
 */

#include <Arduino_GFX_Library.h>

// ---------------------------------------------------
// 第一步：手動補上顏色巨集
// 新版 Arduino_GFX 取消了 BLACK / WHITE 等全域匯出，
// 不加這段，編譯會報 "BLACK was not declared in this scope"
// ---------------------------------------------------
#ifndef BLACK
#define BLACK       0x0000
#endif
#ifndef WHITE
#define WHITE       0xFFFF
#endif
#ifndef RED
#define RED         0xF800
#endif
#ifndef GREEN
#define GREEN       0x07E0
#endif
#ifndef BLUE
#define BLUE        0x001F
#endif
#ifndef YELLOW
#define YELLOW      0xFFE0
#endif
#ifndef CYAN
#define CYAN        0x07FF
#endif
#ifndef MAGENTA
#define MAGENTA     0xF81F
#endif
#ifndef GRAY
#define GRAY        0x8410
#endif
#ifndef DARKGRAY
#define DARKGRAY    0x2104
#endif

// ---------------------------------------------------
// 第二步：定義配色方案（深藍底 + 橙紅主色）
// ---------------------------------------------------
#define COLOR_BG        0x1123   // 深藍黑背景
#define COLOR_GRID      0x19E5   // 網格藍灰
#define COLOR_PRIMARY   0xE73C   // 曲線橙紅
#define COLOR_ACCENT    0xFDE0   // 極徑金黃
#define COLOR_TEXT      0xF7BE   // 文字淺灰

// ---------------------------------------------------
// 第三步：定義物理腳位
// ---------------------------------------------------
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---------------------------------------------------
// 第四步：實例化 SPI 匯流排與螢幕驅動
// ---------------------------------------------------
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA, GFX_NOT_DEFINED /* MISO 不需要 */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST,
    0,    /* 旋轉角度 */
    true  /* IPS 螢幕 */
);

// ---------------------------------------------------
// 第五步：分配雙緩衝畫布（240×240×2 Bytes = 115.2KB SRAM）
// 所有繪製先寫進記憶體，完成後一次性刷到螢幕，徹底消滅閃爍
// ---------------------------------------------------
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

// ---------------------------------------------------
// 動畫變數
// ---------------------------------------------------
float angle = 0.0f;
const float  a_scale    = 50.0f;  // 心形線縮放係數（單位：像素）
const int16_t cx        = 120;    // 圓心 X
const int16_t cy        = 120;    // 圓心 Y

unsigned long lastFrameTime = 0;
const int frameDelay = 1000 / 16; // 鎖 16fps

// 功能開關（改 false 可單獨關閉某層）
const bool showGrid     = true;
const bool showCurve    = true;
const bool showRadius   = true;
const bool showTelemetry= true;

void setup() {
    Serial.begin(115200);

    // 初始化螢幕驅動
    gfx->begin();

    // 點亮背光（這步漏掉 = 黑屏）
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);

    // 初始化雙緩衝畫布
    if (!canvas->begin()) {
        Serial.println("Canvas 記憶體申請失敗！將直接寫螢幕（會有閃爍）");
    } else {
        Serial.println("雙緩衝啟動成功，零閃爍渲染就緒。");
    }
}

void loop() {
    // 幀率限速
    unsigned long now = millis();
    if (now - lastFrameTime < frameDelay) return;
    lastFrameTime = now;

    // 清幀
    canvas->fillScreen(COLOR_BG);

    // --- 層 1：極坐標網格 ---
    if (showGrid) {
        canvas->drawCircle(cx, cy,  30, COLOR_GRID);
        canvas->drawCircle(cx, cy,  60, COLOR_GRID);
        canvas->drawCircle(cx, cy,  90, COLOR_GRID);
        canvas->drawCircle(cx, cy, 110, COLOR_GRID);
        canvas->drawFastHLine(10, cy, 220, COLOR_GRID);
        canvas->drawFastVLine(cx, 10, 220, COLOR_GRID);
    }

    // --- 層 2：完整心形線軌跡 r = a*(1 - cos θ) ---
    if (showCurve) {
        int16_t lx = 0, ly = 0;
        for (int16_t deg = 0; deg <= 360; deg += 3) {
            float rad = deg * DEG_TO_RAD;
            float r   = a_scale * (1.0f - cos(rad));
            int16_t x = cx + (int16_t)(r * cos(rad));
            int16_t y = cy - (int16_t)(r * sin(rad)); // 螢幕 Y 軸朝下，取反
            if (deg > 0) canvas->drawLine(lx, ly, x, y, COLOR_PRIMARY);
            lx = x; ly = y;
        }
    }

    // --- 層 3：當前追蹤點 & 極徑 ---
    float rad_a  = angle * DEG_TO_RAD;
    float active_r = a_scale * (1.0f - cos(rad_a));
    int16_t px = cx + (int16_t)(active_r * cos(rad_a));
    int16_t py = cy - (int16_t)(active_r * sin(rad_a));

    if (showRadius) canvas->drawLine(cx, cy, px, py, COLOR_ACCENT);
    canvas->fillCircle(px, py, 5, COLOR_TEXT);

    // --- 層 4：數值顯示 ---
    if (showTelemetry) {
        canvas->setTextColor(COLOR_TEXT);
        canvas->setTextSize(1);
        canvas->setCursor(50, 25);
        canvas->print("Polar Coordinates");
        canvas->setCursor(28, 185);
        canvas->print("r = a * (1 - cos(theta))");
        canvas->setCursor(40, 200);
        canvas->print("th:"); canvas->print((int)angle);
        canvas->print("  r:"); canvas->print((int)active_r);
        canvas->print("px");
    }

    // 角度步進（每幀 +6°，繞一圈約 1 秒）
    angle += 6.0f;
    if (angle >= 360.0f) angle -= 360.0f;

    // 一鍵將記憶體畫布刷到實體螢幕
    canvas->flush();
}
```

### 程式碼說明

**雙緩衝機制**：所有繪製操作都發生在 `canvas`（記憶體），最後一行 `canvas->flush()` 才真正把完整幀發送到螢幕。跟先擦掉黑板再寫字相比，這相當於在草稿紙上寫好、整張貼上去——螢幕永遠看不到「畫一半」的狀態，閃爍歸零。

**心形線方程** `r = a * (1 - cos θ)`：這是極坐標方程，`r` 是從圓心出發的距離，`θ` 是角度。把方程裡每個 θ 值算出的 (r, θ) 轉成螢幕 XY 坐標，連線就得到那條心形曲線。

**幀率鎖**：`frameDelay = 1000 / 16` 控制每幀最短間隔約 62ms。想加速動畫改大 `+= 6.0f` 這個步進值；想流暢可以把 targetFPS 提到 30，但會多佔一些 CPU。

**燒錄分區**：Arduino IDE → 工具 → Partition Scheme，選 **Huge APP (3MB No OTA)**。115KB 的 Canvas 需要足夠的 SRAM，預設分區偶爾會撞上堆空間不足。

---

## 常見問題排查

別慌，90% 的問題出在這幾個地方：

**上電黑屏，串口也沒報錯**
先查 BL 腳位——背光沒拉高是最常見原因。確認 GPIO7 已經執行了 `digitalWrite(TFT_BL, HIGH)`，或者直接把 BL 跳線接 3.3V 排除程式問題。

**螢幕亮了但全白/全紅/花屏**
SPI 接線順序接錯了。CS 和 DC 最容易搞混（兩根都是控制線，長得一樣）。對照程式碼裡的巨集定義（CS=GPIO9, DC=GPIO10）重新核對，不要相信接線表，以程式碼為準。

**編譯報錯：`BLACK was not declared in this scope`**
你用的 Arduino_GFX 版本 >= 1.3，新版取消了顏色巨集的全域匯出。程式碼頂部的 `#ifndef BLACK` 那段必須保留，不能刪。

**Canvas 記憶體申請失敗，串口提示直接寫螢幕**
說明可用 SRAM 不夠 115KB。檢查：①分區是否選了 Huge APP；②其他地方有沒有大陣列佔記憶體；③極少數情況下是開發板 PSRAM 沒使能（需要在 Board 設定裡打開 PSRAM）。

**動畫卡頓，不像 16fps**
`loop()` 裡有沒有加了 `delay()`？有的話去掉，幀率限速已經用 `millis()` 實現了，兩者疊加會讓幀間隔翻倍。

---

## FAQ

**Q：CS、DC 腳位能換成其他 GPIO 嗎？**
A：可以，修改程式碼頂部的 `#define TFT_CS` 和 `#define TFT_DC` 即可，任意空閒 GPIO 都行。SCL 和 SDA 建議使用硬體 SPI 腳位（ESP32-S3 預設 SPI2：SCLK=12，MOSI=11）以獲得最高速度；換成其他腳位會退化為軟體 SPI，速度下降明顯。

**Q：螢幕支援哪些更新率？**
A：GC9A01 的 SPI 接定理論最高時鐘 80MHz，對應全螢幕 240×240 更新率約 40fps 上限。本程式碼鎖定 16fps 是為了在中低端 ESP32-S3 模組上保留 CPU 餘量。如果你的板子主頻跑在 240MHz，把 `targetFPS` 改到 30～40 沒有問題。

**Q：能不能同時驅動兩塊螢幕？**
A：可以，兩塊螢幕共享 SCL/SDA，給每塊螢幕分配獨立的 CS 腳位，分別實例化兩個 `Arduino_GC9A01` 物件，切換 CS 啟用不同螢幕即可。注意記憶體：兩個 Canvas 共需 230KB SRAM，必須開啟 PSRAM。

**Q：供電用 3.3V 還是 5V？**
A：GC9A01 模組工作電壓 3.3V，直接接 ESP32-S3 的 3.3V 腳位。絕對不能接 5V，會損壞驅動晶片。

**Q：顯示中文字元怎麼做？**
A：Arduino_GFX_Library 預設只內建 ASCII 字體，顯示中文需要額外的字庫檔案（比如 U8g2 字庫）或使用 LVGL 框架。字庫會大幅增加 Flash 佔用，建議改用 LVGL + SPIFFS 方案，有時間另外出一篇。

**Q：GC9A01 螢幕沒有聲音輸出能力，只有顯示，這個跟 I2S 音訊專案有什麼關係？**
A：沒有關係。GC9A01 純粹是顯示螢幕，SPI 接口只傳影像資料。如果你想同時播放音訊，需要額外的 I2S DAC 模組（如 MAX98357A），兩者完全獨立執行，腳位互不干擾。

---

## 延伸玩法

- 改成**類比時鐘錶盤**：畫刻度和指標，配上 DS3231 RTC 模組讀取即時時間
- 加**玫瑰線模式**：把 `showTangent` 改 false，曲線切換成 `r = a * sin(k * θ)`，換個參數 k 值，花瓣數跟著變
- 接**按鍵切換**動畫主題：三個按鍵控制心形線 / 玫瑰線 / 李沙育圖形輪播
- 配合**ESP32 Wi-Fi**：拉取天氣 API，把溫度濕度顯示在圓螢幕儀表板上
- 購買 2 個圓形螢幕：

---

## 參考資料

- [GC9A01 驅動晶片資料手冊（Galaxycore 官方）](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub 主頁（moononournation）](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 產品頁](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
- [ESP32 Arduino Core 3.x 發佈說明](https://github.com/espressif/arduino-esp32/releases)
