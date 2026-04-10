---
title: "ESP32-S3 + $3 小彩屏跑 LVGL 動畫｜0 基礎 10 分鐘搞定"
boardId: esp32s3
moduleId: display/tft096-st7735s
category: esp32
date: 2026-04-10
intro: "ESP32-S3 驅動 0.96 吋 ST7735S TFT 彩屏，跑 LVGL 動畫效果。從接線到完整程式碼，附避坑指南，適合 Arduino 和嵌入式開發新手。"
image: "https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png"
---

# ESP32-S3 + $3 小彩屏跑 LVGL 動畫！0 基礎 10 分鐘搞定（2026 最新避坑版）

> **一句話摘要**：ESP32-S3 驅動 0.96 吋 ST7735S TFT 屏 + LVGL 動畫效果，接線 5 核心引腳 + 完整避坑指南

## 最終效果

![image-20260410152138611](https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png)

> 小到指甲蓋的 0.96 吋螢幕，也能跑出絲滑的 LVGL 動畫。本文從接線到程式碼全部講透，幫你把坑提前踩完。



------

## 你能學到什麼

1. ESP32-S3 如何透過 SPI 驅動 ST7735S 0.96 吋 TFT 彩屏
2. Arduino_GFX 函式庫的設定方法（以及為什麼不用 TFT_eSPI）
3. LVGL v9 移植到小螢幕的完整流程
4. 一個帶雙重動畫效果的 LVGL UI 示例（左右平移 + 上下彈跳）



## BOM 清單

| 元件                       | 數量 | 備註                          |
| -------------------------- | ---- | ----------------------------- |
| ESP32-S3 開發板            | 1    | 任意 S3 變體均可              |
| 0.96 吋 ST7735S TFT IPS 屏 | 1    | 80×160 解析度，SPI 介面，8Pin |
| 杜邦線（母對母）           | 若干 | 8 根即可                      |
|                            |      |                               |




## 螢幕規格

![image-20260410113243742](https://img.lingflux.com/2026/04/e66957af12d082ebd30b5b8cdb06de8c.png)

> 不用全部記住，重點關注帶 ***** 的參數，這些是寫程式時必須用到的。

| 參數     | 規格            | 備註                                                    |
| -------- | --------------- | ------------------------------------------------------- |
| 尺寸     | 0.96 吋 TFT IPS | 全視角，色彩還原好                                      |
| 解析度   | 80(H) × 160(V)  | ***** 程式碼中 `screenWidth=160, screenHeight=80`（橫屏） |
| 驅動晶片 | ST7735S         | ***** 選函式庫時必須匹配                                |
| 通訊介面 | 4 線 SPI        | 最高 40MHz（建議先用預設頻率測試）                      |
| 工作電壓 | **3.3V**        | ***** 千萬不要接 5V！                                   |
| 接腳數量 | 8Pin            | 含背光控制腳 BLK                                        |



| 參數       | 規格                      |
| ---------- | ------------------------- |
| 顯示區域   | 10.8(H) × 21.7(V) mm      |
| 面板尺寸   | 19(H) × 24(V) × 2.7(D) mm |
| 像素間距   | 0.135(H) × 0.1356(V) mm   |
| 工作電流   | 20mA                      |
| 背光類型   | 1 LED                     |
| 工作溫度   | -20 ~ 70°C                |
| PCB 尺寸   | 30.00 × 24.04 mm          |
| 安裝孔內徑 | 2 mm                      |
| 排針間距   | 2.54 mm                   |

**介面定義：**

| 序號 | 引腳 | 功能說明                                |
| ---- | ---- | --------------------------------------- |
| 1    | GND  | 電源地                                  |
| 2    | VCC  | 電源正（3.3V）                          |
| 3    | SCL  | SPI 時脈訊號                            |
| 4    | SDA  | SPI 資料訊號                            |
| 5    | RES  | 重置（低電位重置）                      |
| 6    | DC   | 暫存器/資料選擇（低=命令，高=資料）     |
| 7    | CS   | 片選（低電位致能）                      |
| 8    | BLK  | 背光控制（高電位點亮；不控制則接 3.3V） |




## 接線方式

| ESP32-S3 引腳 | ST7735S 引腳 | 說明                        |
| ------------- | ------------ | --------------------------- |
| GND           | GND          | 共地                        |
| **3.3V**      | VCC          | **嚴禁接 5V**               |
| GPIO 12       | SCL          | SPI 時脈                    |
| GPIO 11       | SDA          | SPI 資料（MOSI）            |
| GPIO 21       | RES          | 重置                        |
| GPIO 47       | DC           | 命令/資料選擇               |
| GPIO 38       | CS           | 片選                        |
| GPIO 48       | BLK          | 背光（不控制可直接接 3.3V） |



### 接線注意事項

- **電源**：只能接 3.3V，接 5V 會燒屏
- **BLK 背光腳**：不需要軟體控制背光時，直接接 3.3V 常亮
- **CS 片選**：低電位有效
- **RES 重置**：上電初始化需要低電位重置
- **引腳選擇**：以上引腳使用 ESP32-S3 的 SPI2（FSPI）預設引腳，如果你換了引腳，需要同步修改程式碼中的巨集定義



## 函式庫安裝

在 Arduino IDE 中安裝以下兩個函式庫：

1. **Arduino_GFX_Library** — 搜尋 GFX Library for Arduino 安裝
2. **LVGL** — 搜尋 `lvgl` 安裝（需要 **v9.x** 版本）

> **為什麼用 Arduino_GFX 而不是 TFT_eSPI？**
>
> 首先說明一下，我挺喜歡使用 TFT_eSPI 的，曾經使用它驅動過很多螢幕，而且這兩個函式庫都能驅動 ST7735S 螢幕，但設定方式差異很大：
>
> **TFT_eSPI 的問題：需要手動改函式庫原始檔**
>
> TFT_eSPI 要求你打開函式庫安裝目錄下的 `User_Setup.h` 檔案，在裡面手動修改引腳定義和驅動晶片選擇。這意味著：
>
> 1. 你要找到函式庫的安裝路徑（不同系統路徑不同：`Documents/Arduino/libraries/` 或 `.platformio/packages/`）
>
> 2. 在幾百行的設定檔中找到正確的行，把預設值註解掉，取消註解你要用的值
>
> 3. 如果同時用多個不同螢幕的專案，每次切換都要重新改這個檔案
>
> 4. **函式庫更新後設定會被覆蓋重置**，你的專案突然就編譯不過了
>
>    這也是最常見的抱怨：「按照影片教學做了但是白屏」——往往就是 `User_Setup.h` 改錯了或者沒生效。
>
>    **Arduino_GFX 的做法：引腳直接寫在程式碼裡**
>
>    對比一下，Arduino_GFX 的所有設定都在你自己的 `.ino` 檔案中完成：
>
> ```c
> // 所有引腳和驅動參數直接在程式碼裡定義，不用改任何函式庫檔案
> Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
> Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
> ```
>
> - 換引腳？改一行 `#define`
>
> - 換螢幕？改 `Arduino_ST7735` 為 `Arduino_ILI9341` 等其他驅動
>
> - 函式庫更新？不影響你的程式碼
>
> - 多專案共存？每個專案各自定義，互不干擾
>
>   **另外，TFT_eSPI 對 ESP32-S3 的相容性已出現問題**，GitHub 上有多個 issue 回報在 ESP32 Arduino Core 3.x 下編譯失敗。Arduino_GFX 目前仍在積極維護，對新晶片的支援更好。




## 開發環境

本示例的開發環境

MacOS - v15.1.1

Arduino IDE - v2.3.8

開發板函式庫：esp32 (by Espressif Systems) - v3.3.7

螢幕驅動函式庫：GFX Library for Arduino (by Moon on our nation) - v1.6.5

圖形函式庫：LVGL (by kisvegabor) - v9.5.0



## 完整程式碼



```c
#include <Arduino_GFX_Library.h>
#include <lvgl.h>

// --- 引腳與 GFX 初始化 ---
#define TFT_CS 38
#define TFT_RST 21
#define TFT_DC 47
#define TFT_MOSI 11
#define TFT_SCLK 12
#define TFT_BLK 48

#define BLACK   0x0000
#define WHITE   0xFFFF
#define ROTATION 1

Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);

static const uint32_t screenWidth  = 160;
static const uint32_t screenHeight = 80;

void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = lv_area_get_width(area);
  uint32_t h = lv_area_get_height(area);
  uint32_t stride = lv_draw_buf_width_to_stride(w, LV_COLOR_FORMAT_RGB565);
  uint8_t * row_ptr = px_map;
  
  for (uint32_t y = 0; y < h; y++) {
    gfx->draw16bitRGBBitmap(area->x1, area->y1 + y, (uint16_t *)row_ptr, w, 1);
    row_ptr += stride;
  }
  lv_display_flush_ready(display);
}

// ==========================================
// 定義動畫回呼函數 (用於接收 LVGL 動畫的數值變化)
// ==========================================

// 回呼：改變物件的 X 座標 (水平移動)
static void anim_x_cb(void * var, int32_t v) {
  lv_obj_set_x((lv_obj_t *)var, v);
}

// 回呼：改變物件的 Y 座標 (垂直移動)
static void anim_y_cb(void * var, int32_t v) {
  lv_obj_set_y((lv_obj_t *)var, v);
}

void setup() {
  Serial.begin(115200);
  pinMode(TFT_BLK, OUTPUT);
  digitalWrite(TFT_BLK, HIGH);

  gfx->begin();
  gfx->fillScreen(BLACK);

  lv_init();
  lv_display_t *display = lv_display_create(screenWidth, screenHeight);
  lv_display_set_color_format(display, LV_COLOR_FORMAT_RGB565);

  static lv_color_t buf[screenWidth * screenHeight / 10];
  lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(display, my_disp_flush);

  // 設定螢幕背景為標準白色
  lv_obj_set_style_bg_color(lv_scr_act(), lv_color_hex(0xFFFFFF), 0);

  // ==========================================
  // 進階 UI 佈局：建立透明容器來包裹元素
  // ==========================================
  
  // 1. 建立一個透明的容器 (尺寸 100x60)
  lv_obj_t * cont = lv_obj_create(lv_scr_act());
  lv_obj_set_size(cont, 100, 60);
  lv_obj_set_style_bg_opa(cont, 0, 0);             // 背景完全透明
  lv_obj_set_style_border_width(cont, 0, 0);       // 去除邊框
  lv_obj_set_style_pad_all(cont, 0, 0);            // 去除內部的間距
  lv_obj_align(cont, LV_ALIGN_CENTER, 0, 0);       // 容器整體置中

  // 2. 將綠色方塊放進容器裡，並對齊到容器的上方中間
  lv_obj_t *rect = lv_obj_create(cont);
  lv_obj_set_size(rect, 30, 30);
  lv_obj_set_style_bg_color(rect, lv_color_hex(0x00FF00), 0);
  lv_obj_set_style_border_width(rect, 0, 0);
  lv_obj_align(rect, LV_ALIGN_TOP_MID, 0, 0);

  // 3. 將文字放進容器裡，並對齊到容器的底部中間
  lv_obj_t * label = lv_label_create(cont);
  lv_label_set_text(label, "hello world!");
  lv_obj_set_style_text_color(label, lv_color_hex(0x000000), 0);
  lv_obj_align(label, LV_ALIGN_BOTTOM_MID, 0, 0);


  // ==========================================
  // 添加雙重動畫效果 (LVGL v9 動畫引擎)
  // ==========================================

  // 動畫 A：讓整個容器（方塊+文字）左右平移巡邏
  lv_anim_t a_x;
  lv_anim_init(&a_x);
  lv_anim_set_var(&a_x, cont);                       // 綁定動畫物件：容器
  lv_anim_set_values(&a_x, -30, 30);                 // 從中心往左移動30，再往右移動30
  lv_anim_set_time(&a_x, 2000);                      // 單次移動耗時 2000 毫秒 (2秒)
  lv_anim_set_playback_time(&a_x, 2000);             // 往回走也耗時 2000 毫秒
  lv_anim_set_repeat_count(&a_x, LV_ANIM_REPEAT_INFINITE); // 無限循環
  lv_anim_set_path_cb(&a_x, lv_anim_path_ease_in_out);     // 使用「緩入緩出」曲線，讓動作顯得有彈性而不生硬
  lv_anim_set_exec_cb(&a_x, anim_x_cb);              // 綁定上面定義的 X軸回呼函數
  lv_anim_start(&a_x);                               // 啟動動畫！

  // 動畫 B：讓綠色的方塊自己上下輕快跳動
  lv_anim_t a_y;
  lv_anim_init(&a_y);
  lv_anim_set_var(&a_y, rect);                       // 綁定動畫物件：只是綠色方塊
  lv_anim_set_values(&a_y, 0, 10);                   // 向下偏移 0 到 10 個像素
  lv_anim_set_time(&a_y, 300);                       // 極速跳動，一次 300 毫秒
  lv_anim_set_playback_time(&a_y, 300);              
  lv_anim_set_repeat_count(&a_y, LV_ANIM_REPEAT_INFINITE); 
  lv_anim_set_path_cb(&a_y, lv_anim_path_ease_in_out); 
  lv_anim_set_exec_cb(&a_y, anim_y_cb);              // 綁定上面定義的 Y軸回呼函數
  lv_anim_start(&a_y);                               // 啟動動畫！
}

// 記錄上一次的時間
uint32_t last_tick = 0;
void loop() {
  // 1. 計算距離上一次跑 loop 經過了多少毫秒
  uint32_t current_tick = millis();
  uint32_t elapsed_time = current_tick - last_tick;
  last_tick = current_tick;

  // 2. 將流逝的時間告訴 LVGL（這是動畫能動起來的絕對關鍵！）
  lv_tick_inc(elapsed_time);

  // 3. LVGL 處理動畫和介面重繪
  lv_timer_handler();
  
  // 4. 稍微延時，避免 CPU 滿載
  delay(5);
}
```




## 程式碼關鍵行解讀

> 以下是新手最容易出錯的幾個地方，對照你的程式碼逐行看：

### 1. GFX 初始化中的偏移參數



```c
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
```

最後 4 個數字 `26, 1, 26, 1` 分別是 `col_offset1, row_offset1, col_offset2, row_offset2`。**如果螢幕顯示有偏移（內容擠到一角或有黑邊），調這 4 個值。** 不同廠家的 ST7735S 模組偏移量不同，這裡給出的是最常見的值。

### 2. 螢幕尺寸——注意橫屏方向

```c
#define ROTATION 1  // 橫屏旋轉
static const uint32_t screenWidth  = 160;  // 橫屏後寬度變成 160
static const uint32_t screenHeight = 80;   // 高度變成 80
```

實體螢幕是 80×160（直屏），`ROTATION=1` 旋轉 90° 後變成 160×80。**LVGL 的 display 尺寸必須匹配旋轉後的方向**，否則畫面錯亂。

### 3. flush 回呼——LVGL 與 GFX 的橋樑

```c
void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  ...
  lv_display_flush_ready(display);  // 這一行不能漏！
}
```

`lv_display_flush_ready()` 告訴 LVGL 「這塊區域畫完了，可以給下一塊了」。**漏掉這行 = 螢幕永遠不更新。**

### 4. loop 中的時間餵送

```c
lv_tick_inc(elapsed_time);
lv_timer_handler();
```

這兩行是 LVGL 動畫的「心臟」。`lv_tick_inc` 餵時間，`lv_timer_handler` 觸發介面重繪。**缺少任何一行，動畫都不會動。**




## 常見問題排查

| 症狀                         | 可能原因                                                 | 解決方法                                                     |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| **白屏（背光亮但無內容）**   | flush 回呼未正確綁定，或 `lv_display_flush_ready()` 漏掉 | 檢查 `my_disp_flush` 是否被正確設為 flush_cb               |
| **花屏 / 隨機色塊**          | SPI 引腳接錯或接觸不良                                   | 重新檢查接線，確保杜邦線插緊                                 |
| **畫面偏移 / 有黑邊**        | ST7735S 偏移參數不匹配                                   | 調整 `Arduino_ST7735` 建構函數中的 `col_offset` 和 `row_offset` 參數 |
| **畫面顏色反了（藍變紅等）** | RGB/BGR 設定不對                                         | 在 GFX 初始化中檢查顏色順序參數                              |
| **畫面上下翻轉**             | 旋轉參數不正確                                           | 嘗試 `ROTATION` 改為 0 或 3                                  |
| **編譯報錯找不到 lvgl.h**    | LVGL 函式庫未安裝或版本不對                              | 確保安裝的是 **LVGL v9.x**（不是 v8）                        |
| **動畫不動，介面是靜態的**   | loop 中缺少 `lv_tick_inc()` 或 `lv_timer_handler()`      | 確保兩行都存在                                               |


