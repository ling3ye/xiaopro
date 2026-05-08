---
title: "ESP32-S3 驅動 WS2812 燈環實現彩虹流光旋轉效果 完整教學（單匯流排協定 + FastLED）"
boardId: esp32s3
moduleId: lighting/ws2812b-40led-ring
category: esp32
date: 2026-05-08
intro: "ESP32-S3 驅動 WS2812 燈環，用 FastLED 函式庫實現非阻塞彩虹流光旋轉動效。單匯流排接線 3 條線，新手 30 分鐘可重現。"
image: "https://img.lingflux.com/2026/05/d991a873016f98577b8ed80aefa9d67b.jpg"
---



# ESP32-S3 驅動 WS2812 燈環實現彩虹流光旋轉效果 完整教學

難度：⭐⭐☆☆☆（新手可上手）
預計時間：30 分鐘
測試環境：Arduino IDE 2.3.8 + FastLED v3.10.3 + ESP32 Arduino Core 3.3.8

---

> **TL;DR（快速上手）：**
>
> 1. 接線：WS2812 燈環 `DIN` → ESP32-S3 `GPIO40`，`VCC` → 5V，`GND` → GND
> 2. 安裝函式庫：Arduino 函式庫管理員搜尋 `FastLED`（作者 Daniel Garcia），安裝最新版
> 3. 按需修改程式裡的 `NUM_LEDS`（燈珠數量）和 `LED_PIN`（腳位）
> 4. 燒錄，上電，燈環開始轉

---

## 前言

家裡一直躺著一個 WS2812 燈環，本來想等「以後有空」再玩。但見到它吃灰已久，清理清理，順便做個簡單的範例。

WS2812 系列的燈條/燈環/燈塊最妙的地方是：整個燈**只需要一根資料線**，加上電源線，一共就是 3 條線就可以驅動，每顆 LED 都能獨立控制顏色，靠的是內建的驅動晶片。不用解碼器，不用位移暫存器，程式幾十行搞定。

本文目標：用 ESP32-S3 + FastLED 函式庫，實現一個彩虹顏色沿環旋轉的流光動效，全程非阻塞，不影響後續擴充功能。

---

## 實驗效果

![](https://img.lingflux.com/2026/05/b9b24692bd3fe29d05bafd71a1a6ee89.jpg)

燈環上 40 顆 LED 同時點亮，顏色按彩虹漸層分佈，整體色調不停旋轉，看起來像一圈彩色光在流動。

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/kA8XlvHq3_I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## 元件說明

### WS2812 燈環

WS2812 燈環就像傳聲筒那樣——把所有資料發送給第一個 LED，它自己留下屬於自己的那份顏色資訊，剩下的傳給下一顆，下一顆又留下自己那份顏色，剩下的又給下一顆，以此類推，整條鏈依次串聯，這又叫菊花鏈（daisy-chain）方式，一根線就能控制幾十顆（甚至幾百顆）LED 各自發不同顏色。



```
例如：資料指令串: [紅,藍,綠,黃]
         ↓
   LED ¹ 拿「紅」亮紅燈 → 把 [藍,綠,黃] 傳給下一位
         ↓
   LED ² 拿「藍」亮藍燈 → 把 [綠,黃] 傳給下一位
         ↓
   LED ³ 拿「綠」亮綠燈 → 把 [黃] 傳給下一位
   ...
   ...
   ...
```



| 參數 | 數值 |
| --- | --- |
| 驅動電壓 | 5V |
| 單顆 LED 最大電流 | 60mA（R/G/B 各 20mA 全亮） |
| 資料訊號電平 | 相容 3.3V 邏輯（無需電平轉換） |
| 通訊協定 | 單匯流排 NZR（歸零碼） |
| 色彩順序 | GRB |
| 更新率 | 400Hz / 800Hz（取決於型號） |

> 選它的理由：接線極簡（一根資料線），FastLED 原生支援，社群資料豐富，新手不容易踩坑。



**WS2812B 一條資料線（單一 GPIO）理論上和實際能驅動多少顆 LED？**

### 理論上限

**幾乎沒有嚴格限制**（可以驅動幾千甚至上萬顆）。WS2812B 採用**菊花鏈（daisy-chain）**方式，後一顆 LED 的 DO 接腳接下一顆的 DI 接腳，資料一顆一顆往下傳。只要微控制器能及時發出完整的資料幀，理論上可以無限串聯。

### 實際推薦數量（一條資料線）

| 使用場景                      | 推薦最大數量      | 說明                                         |
| ----------------------------- | ----------------- | -------------------------------------------- |
| **流暢動畫/遊戲**（高更新率） | **300~600 顆**    | 推薦範圍，更新率能保持 30~60fps 以上         |
| **一般效果/氛圍燈**           | **800~1200 顆**   | 比較常用上限，更新率約 15~30fps              |
| **極限情況**                  | **2000~4000+ 顆** | 可行，但更新率很低（<10fps），訊號容易出問題 |
| **專業/大型專案**             | 幾千~上萬顆       | 必須**分多條資料線**並行驅動（ESP32 很適合） |

### 主要限制因素

1. **更新率（最關鍵）** 每顆 LED 資料約 30μs（24bit）。
   - 1000 顆 ≈ 30ms → 約 33fps
   - 2000 顆 ≈ 60ms → 約 16fps（明顯卡頓）
2. **訊號品質**
   - 資料線太長（>10~15 公尺）或 LED 數量過多，後面的 LED 容易出現花屏、亂色、閃爍。
   - 建議每 500~1000 顆左右加**訊號放大器**（74HCT245 / SN74AHCT125 等）或**中繼模組**。
3. **電源**（不是資料線限制，但必須解決）
   - 每顆全亮白色最大約 60mA（通常 20~30mA 平均）。
   - **必須多點供電**（每 1~2 公尺供電一次），否則電壓降導致後端變暗/變色。

###

---

## BOM 表

| 元件 | 規格 | 數量 |
| --- | --- | --- |
| ESP32-S3 開發板 | 任意帶 GPIO 的版本均可 | ×1 |
| WS2812 燈環 | 40 顆 LED（或其他數量，程式裡改一行） | ×1 |
| 跳線 | 公對母 / 公對公，按實際需求 | 若干 |

---

## 元件腳位說明

WS2812 燈環通常有以下 4 個接腳：

| 腳位標註 | 說明 |
| --- | --- |
| VCC / 5V | 電源正極，接 5V |
| GND | 電源負極，接 GND |
| DIN / Data In | 資料輸入，接 ESP32-S3 GPIO |
| DOUT / Data Out | 資料輸出，多個燈環串聯時使用，本專案不接 |

> ⚠️ 部分燈環只標 `+`、`-`、`Data`，對應關係一樣，別被嚇到。

---

## 接線方式

| WS2812 燈環腳位 | ESP32-S3 |
| --- | --- |
| VCC / 5V | 5V（開發板 5V 腳位或外部 5V） |
| GND | GND |
| DIN | GPIO40 |

> 💡 **建議接完之後逐一核對一遍**，能省掉 80% 的除錯時間。特別注意 VCC 別接 3.3V——燈會亮，但顏色會偏、亮度打折，白白浪費你的除錯時間。

---

## 需要安裝的函式庫

在 Arduino IDE 函式庫管理員裡搜尋 **`FastLED`**，作者是 **Daniel Garcia**，安裝最新版本（本文測試版本：v3.10.3）。

安裝路徑：`工具` → `管理函式庫` → 搜尋 `FastLED` → 安裝

---

## 完整程式

```cpp
/*
 * ESP32-S3 WS2812 彩虹流光旋轉環
 * FastLED 非阻塞版 —— 不卡 loop()，方便後續加按鍵、感測器等功能
 */

#include <FastLED.h>

// ===== 根據你的實際情況修改這裡 =====
#define LED_PIN     40       // 資料線接的 GPIO 腳位
#define NUM_LEDS    40       // 燈環上的燈珠數量
#define BRIGHTNESS  204      // 全域亮度，範圍 0（全滅）～ 255（全亮）
// ====================================

#define LED_TYPE    WS2812B
#define COLOR_ORDER GRB      // WS2812 的顏色順序是 GRB，不是 RGB，別搞反了

CRGB leds[NUM_LEDS];         // 每顆 LED 的顏色陣列

uint8_t gHue = 0;            // 彩虹起始色相，每幀遞增實現「旋轉」效果

void setup() {
    // 第一步：給硬體 1 秒啟動時間，避免上電瞬間電流衝擊導致 LED 閃爍
    delay(1000);

    // 第二步：初始化 FastLED，告訴它用哪個腳位、哪種燈、多少顆
    FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS)
           .setCorrection(TypicalLEDStrip);  // 自動校正色溫，讓白色看起來更白

    // 第三步：設定全域亮度（改這裡比改 RGB 數值省事）
    FastLED.setBrightness(BRIGHTNESS);
}

void loop() {
    // 第四步：用彩虹漸層填滿整個燈環
    // gHue 是起始色相，255/NUM_LEDS 是每顆 LED 之間的色相間隔
    fill_rainbow(leds, NUM_LEDS, gHue, 255 / NUM_LEDS);

    // 第五步：把顏色資料推送到燈環
    FastLED.show();

    // 第六步：每 10ms 色相 +1，數值越小旋轉越快，越大越慢
    EVERY_N_MILLISECONDS(10) {
        gHue++;
    }
}
```

### 程式說明

| 關鍵行 | 做了什麼 |
| --- | --- |
| `fill_rainbow(...)` | FastLED 內建函式，自動計算彩虹漸層顏色並填入陣列，不用手寫 HSV 計算 |
| `FastLED.show()` | 把 `leds[]` 陣列裡的顏色資料透過 GPIO40 發送出去，呼叫這行之前燈不會變 |
| `EVERY_N_MILLISECONDS(10)` | FastLED 內建的非阻塞計時器，等效於「每 10ms 執行一次」，不會卡住 `loop()` |
| `gHue++` | 每次色相 +1，下一幀 `fill_rainbow` 的起始色就偏移了，看起來就像在旋轉 |
| `setCorrection(TypicalLEDStrip)` | 自動校正 LED 色溫，讓混色後的白色不偏綠，適合 WS2812 |

> 想改旋轉速度：調 `EVERY_N_MILLISECONDS(10)` 裡的數字，**10 → 5** 轉快一倍，**10 → 20** 轉慢一半。

---

## 常見問題排查

別慌，90% 的問題就出在這幾個地方：

**問題 1：上電後燈完全不亮**

- 檢查 DIN 是否接到了 `GPIO40`（程式裡 `LED_PIN` 定義的腳位）
- 確認 VCC 接的是 **5V** 而不是 3.3V
- 檢查 GND 是否連通——GND 沒共地，資料訊號根本發不出去

**問題 2：只有部分燈亮，或者顏色亂閃**

- 大概率是供電不足。40 顆 LED 全亮白色時電流高達 2.4A，USB 埠的 500mA 撐不住，建議用外部 5V 2A 以上電源

**問題 3：顏色怪怪的，明明叫紅色顯示出來是綠色**

- `COLOR_ORDER` 定義錯了。WS2812B 是 GRB 順序，把程式裡的 `GRB` 改成 `RGB` 試試，或者反過來

**問題 4：編譯報錯 `FastLED.h: No such file`**

- 函式庫沒裝上。重新開啟函式庫管理員，確認 FastLED 狀態顯示「已安裝」，然後重新啟動 Arduino IDE

**問題 5：燒錄沒問題但燈一直不動**

- 檢查 `NUM_LEDS` 是否和你的燈環實際燈珠數量一致，數量不對會導致顯示異常

---

## FAQ

**Q：WS2812 和 WS2812B 有什麼區別，程式能通用嗎？**
A：WS2812B 是 WS2812 的升級版，封裝更小、時序略有調整，但 FastLED 對兩者都支援。`LED_TYPE` 填 `WS2812B` 即可，無需修改其他程式。

**Q：我的燈環只有 12/16/24 顆，程式怎麼改？**
A：只改一行：`#define NUM_LEDS 24`，換成你的實際燈珠數量，其他不用動。

**Q：GPIO40 可以換成其他腳位嗎？**
A：可以，ESP32-S3 大部分 GPIO 都能用（避開 0、3、45、46 等啟動相關腳位）。改 `#define LED_PIN 40` 裡的數字，接線也對應換到那個腳位。

**Q：能同時驅動多個燈環嗎？**
A：可以。每個燈環接一個獨立 GPIO，在程式裡 `addLeds` 多呼叫一次，分配不同的 `leds[]` 陣列段即可。

**Q：燈環需要獨立供電嗎？**
A：如果燈珠數量 ≤ 8 顆、亮度不開滿，開發板 5V 腳位可以帶動。超過 8 顆或需要全亮白色，強烈建議外接 5V 2A 以上電源，並讓外部電源 GND 和開發板 GND 共地。

**Q：`EVERY_N_MILLISECONDS` 是什麼，為什麼不直接用 `delay()`？**
A：`EVERY_N_MILLISECONDS` 是 FastLED 內建的非阻塞計時器，`loop()` 正常跑，只是每隔指定時間執行一次裡面的程式。用 `delay()` 的話整個程式會卡在那裡，沒辦法同時處理按鍵、序列埠等其他事情。

**Q：彩虹旋轉方向能反過來嗎？**
A：能，把 `gHue++` 改成 `gHue--` 就反向旋轉了。

---

## 延伸玩法

- 加按鍵控制切換特效（呼吸燈 / 跑馬燈 / 彩虹流光隨時切）
- 接麥克風模組，做音訊響應 LED 頻譜效果
- 多個燈環串聯，DIN 接第一個的 DOUT，實現更長的燈帶效果
- 接 OLED 螢幕，顯示目前特效名稱和亮度數值

---

## 參考資料

- [FastLED 官方 GitHub](https://github.com/FastLED/FastLED)
- [WS2812B 資料手冊（WorldSemi 官方）](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf)
- [Espressif ESP32-S3 技術參考手冊](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [Espressif ESP32-S3 產品頁](https://www.espressif.com/en/products/socs/esp32-s3)
