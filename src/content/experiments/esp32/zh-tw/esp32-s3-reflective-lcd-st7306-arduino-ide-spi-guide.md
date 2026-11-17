---
title: "ESP32-S3 驅動 ST7306 四色全反射 LCD 完整教學（Arduino IDE + SPI）"
boardId: esp32s3
moduleId: display/lcd42-st7306-reflective
category: esp32
date: 2026-11-17
intro: "用 Arduino IDE 和 SPI 讓 ESP32-S3 驅動 ST7306 四色全反射 LCD：21Pin FPC 接線、完整程式碼、顯示方向調整與無顯示排查，實測環境 Arduino IDE 2.3.8 + esp32 Core 3.3.8。"
image: "https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg"
---

> 難度：⭐⭐☆☆☆  
> 預計耗時：約 30～60 分鐘（不含環境下載和硬體除錯）  
> 測試環境：Arduino IDE v2.3.8 + esp32 Arduino Core v3.3.8

## TL;DR：ESP32-S3 驅動 ST7306 快速上手

- 模組只用 3.3V，FPC 第 5、6 腳都接 3.3V，並接好共同地，不要接 5V。
- 預設 `PINSET = 1`：CS→GPIO9、RESET→GPIO10、SCLK→GPIO12、MOSI→GPIO13、RS/D/C→GPIO14，TE 可不接。
- 在 Arduino IDE 安裝 `esp32 by Espressif Systems`，不用另裝 ST7306 程式庫。
- 開啟專案目錄中的 `esp32s3-st7306-bringup.ino`，開發板依手上的 ESP32-S3 型號選（本例是 `ESP32S3 Dev Module`），序列埠沒有日誌時先查 `USB CDC On Boot`。
- 預設 SPI 為模式 0、20MHz，邏輯畫面為 400×300 橫向；無顯示時先斷電核對共地、FPC 方向和 RS 接腳，上電後量 3.3V，並在明亮光線下觀察，仍不行再把 `SPI_HZ` 降到 10MHz。

## 前言：先用 Arduino IDE 點亮 ST7306

這塊 4.2 吋螢幕使用 ST7306 控制器，透過 SPI 接收命令和顯示記憶體資料。它是全反射（反射式）TFT LCD，靠環境光顯示，沒有背光，要在明亮環境下才看得清楚。專案目錄同時提供 ESP-IDF 和 Arduino IDE 兩套程式，這篇只走 Arduino IDE：接好 21Pin FPC，燒錄範例，讓 400×300 橫向測試頁跑起來。ESP-IDF 的 20 頁演示也保留在專案目錄裡，想繼續研究驅動封裝和繪圖函式的讀者可以自行編譯嘗試。

## 最終效果：ST7306 的 8 頁顯示測試

接線和燒錄都正確後，程式會迴圈顯示 8 個測試頁。一般頁停留約 3 秒，移動方塊頁停留約 6 秒。開啟序列埠監控視窗，鮑率設為 115200，可以看到初始化和翻頁日誌。每個頁面在停留期間都會被持續重繪；若序列埠監控視窗是上傳後才開啟的，可能錯過啟動日誌，按一下開發板 RST 即可重新看到。

| 頁碼 | 測試內容              | 檢查點            | 程式內名稱             |
| -: | ----------------- | -------------- | ----------------- |
|  0 | 白、青、紅、黑橫條         | 四種顯示狀態         | `PAGE_COLOR_BARS` |
|  1 | HELLO WORLD、邊框、四角 | 文字和橫向方向        | `PAGE_HELLO`      |
|  2 | 時間、幀數、FPS         | 開機累計時間、全域幀數、累計平均 FPS（不是本頁單獨的幀率）        | `PAGE_COUNTER`    |
|  3 | 對角線、橫線、直線         | 線條和座標映射        | `PAGE_DIAGONAL`   |
|  4 | 左右往返方塊            | 連續刷新           | `PAGE_REFRESH`    |
|  5 | 棋盤格               | 黑白方格（單格 20 像素）         | `PAGE_CHECKER`    |
|  6 | 橫條紋               | 規則圖案           | `PAGE_STRIPES`    |
|  7 | CYAN 顏色測試         | 整螢幕青（視覺偏藍），顯示記憶體位元組 `0x33` | `PAGE_CYAN`       |

> 說明：螢幕上的頁內標籤（如 `1: COLOR BARS`、`3: DIAGONAL`）是程式碼裡寫死的字串，與上表頁碼不完全對應（COLOR BARS 是第 0 頁），以序列埠 `[PAGE]` 日誌為準。


![](https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/Jb9UiMvgtTQ?si=IvvwAvHHZx5RICSM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## 元件說明：YDP420H005-V3 與 ST7306

### YDP420H005-V3 全反射 LCD 模組

這是一塊 4.2 吋全反射 TFT LCD 模組，面板原生顯示記憶體為 300×400。ST7306 控制器已經整合在模組裡，ESP32-S3 透過 SPI 發送命令和像素資料。本專案的 Arduino 程式在應用層把它映射成 400×300 橫向畫面。

本專案韌體用 2bit 編碼驅動出四種顯示狀態：白、青、紅、黑（`0x00`～`0x03`）。每個像素佔 2bit，沒有中間灰階。別把其他 ST7306 螢幕的顏色和初始化參數直接套過來。

| 參數      | 本專案模組                         |
| ------- | ----------------------------- |
| 型號      | Osptek YDP420H005-V3          |
| 控制器     | Sitronix ST7306               |
| 原生解析度   | 300×400                       |
| 顯示狀態    | 白、青、紅、黑，2bit/像素               |
| 主控介面    | 4 線 SPI（SCLK、MOSI、CS、D/C），另有 RESET、可選 TE；FPC 上沒有 MISO/SDO，只能寫不能讀 |
| 模組供電與邏輯 | 3.3V                          |
| 有效顯示區域  | 63.6×84.8mm                   |
| 工作溫度    | −20～+70°C                     |

### 21Pin FPC 轉接板

螢幕透過 21Pin FPC 引出訊號。轉接板把這些細密腳位轉成方便連接 ESP32-S3 的焊點或排針，本專案不需要另外搭顯示驅動電路。

我用的是廠商隨螢幕一起賣的雙 FPC 通用轉接板，沒有型號絲印。板子上一共兩個座：21Pin 給 4.2 吋，12Pin 給 2.9 吋，旁邊還有 `GND`、`3V3` 焊墊。

兩個 FPC 座旁邊各焊了幾顆貼片元件，封裝很小，沒有數值絲印。我沒查過它們的作用和取值。

這塊通用板有一個容易接錯的地方：板上同時有 RS 和 DC 兩種絲印，本模組的 LCD_D/C 要接絲印 `RS`；另一個 `DC` 絲印與本模組無關（我沒有核對它屬於哪個座），不要接它。購買或焊接轉接板時，還要核對 FPC 觸點方向和腳位編號。

### 引腳說明：YDP420H005-V3 的 21Pin FPC

下表按模組 FPC 編號整理。轉接板絲印可能不同，接線時以模組規格書和轉接板實物走線為準（這塊轉接板沒有型號，也沒有公開原理圖）。

|   FPC 腳位 | 模組訊號                               | 常見絲印      | 本例用法                 |
| -------: | ---------------------------------- | --------- | -------------------- |
| 1、4、7、14 | GND                                | GND       | 接共同地                 |
|      2、3 | NC                                 | NC        | 不連接                  |
|      5、6 | VCC(3.3V)                          | VCC、VCI   | 兩腳都接 3.3V            |
|        8 | LCD_RES                            | RESET、RST | 接 GPIO10，低電位復位       |
|        9 | LCD_SCLK                           | SCL、SCLK  | 接 GPIO12，作為 SPI 時鐘   |
|       10 | TE                                 | TE        | 可接 GPIO11；本例不讀取，可懸空  |
|       11 | LCD_SDI                            | SDA、MOSI  | 接 GPIO13，作為 SPI MOSI |
|       12 | LCD_D/C                            | RS、A0     | 接 GPIO14，選擇命令或資料     |
|       13 | LCD_CS                             | CS        | 接 GPIO9，低電位片選        |
|    15～19 | TP-VDD、TP-RST、TP-INT、TP-SDA、TP-SCL | 觸摸相關絲印    | 本例模組無觸摸，不連接          |
|    20、21 | GND                                | GND       | 也是地；本例只接 1、4、7、14 即可（20、21 是否在轉接板上與它們相連，我沒有逐個量過，不放心就一起接地）        |

這裡的 SCL 和 SDA 是轉接絲印留下的常見叫法。本例走的是 SPI：SCL 對應目前螢幕的序列時鐘，SDA 對應 MOSI。

## BOM 表：ST7306 接線所需材料

| 元件           | 規格                    | 數量 | 備註               |
| ------------ | --------------------- | -: | ---------------- |
| ESP32-S3 開發板 | ESP32-S3 N16R8（16MB Flash / 8MB PSRAM） |  1 | 使用 3.3V GPIO     |
| 顯示模組         | Osptek YDP420H005-V3  |  1 | 4.2 吋，21Pin FPC |
| FPC 轉接板      | 原廠雙 FPC 通用轉接板，無型號      |  1 | 核對腳位和觸點方向        |
| USB 傳輸線      | 與開發板介面相符              |  1 | 要支援資料傳輸          |
| 連接線          | 較短杜邦線或焊接線             | 若干 | SPI 線越短越穩，也越好整理      |

## 接線方式：ESP32-S3 與 ST7306

先斷電，再按下面的預設 `PINSET = 1` 接線。

|   FPC 腳位 | 螢幕訊號            | ESP32-S3 | 是否必需 | 說明        |
| -------: | --------------- | -------- | ---- | --------- |
|       13 | LCD_CS / CS     | GPIO9    | 必需   | 片選        |
|        8 | LCD_RES / RESET | GPIO10   | 必需   | 硬體復位      |
|       10 | TE              | GPIO11   | 可選   | 範例不讀取，可懸空 |
|        9 | LCD_SCLK / SCLK | GPIO12   | 必需   | SPI 時鐘    |
|       11 | LCD_SDI / MOSI  | GPIO13   | 必需   | SPI 資料輸出  |
|       12 | LCD_D/C / RS    | GPIO14   | 必需   | 原廠轉接板接 RS |
|      5、6 | VCC / VCI       | 3.3V     | 必需   | 兩個供電腳都接   |
| 1、4、7、14 | GND             | GND      | 必需   | 與開發板共地    |

⚠️ 模組電源和邏輯都使用 3.3V。模組斷電時，也不要繼續從 GPIO 向它輸入訊號。

接好後先在**斷電**狀態下檢查：

1. 對照模組機械圖確認 FPC 的第 1 腳和觸點方向。
2. 用三用電表蜂鳴檔確認開發板 GND 與螢幕 GND 腳導通，且 3.3V 與 GND 之間沒有短路。
3. 逐根核對 CS、RESET、SCLK、MOSI、RS 五根訊號線。
4. 使用原廠雙 FPC 轉接板時，再確認 GPIO14 接的是 RS。
5. 檢查沒有鬆動或短路。

再**上電**檢查：

6. 用三用電表量第 5、6 腳（或轉接板對應焊點）的電壓，應為 3.3V；不對就立即斷電排查。

接完建議逐根對照兩遍。接錯一根，從序列埠日誌裡也很難看出是哪一根（本例的序列埠日誌不反映螢幕狀態，見排錯一節）。

## 需要安裝的程式庫：Arduino IDE 的 ESP32-S3 支援

本例沒有獨立的 ST7306 Arduino 程式庫。驅動、繪圖和測試頁都在 `.ino` 檔案裡。`SPI.h` 和 `esp_heap_caps.h` 隨 ESP32 Arduino Core 提供，不用在程式庫管理員裡另外搜尋。

| 名稱                                                               | 作者或來源                     | 安裝方式               | 本機確認版本        |
| ---------------------------------------------------------------- | ------------------------- | ------------------ | ------------- |
| Arduino IDE                                                      | Arduino                   | 從 Arduino 官網安裝     | v2.3.8        |
| [esp32 Arduino Core](https://github.com/espressif/arduino-esp32) | Espressif Systems         | Arduino IDE 開發板管理員 | v3.3.8        |
| [SPI](https://github.com/espressif/arduino-esp32)                | Espressif Arduino Core 內建 | 隨 Core 安裝          | 隨 Core v3.3.8 |
| [esp\_heap\_caps](https://github.com/espressif/arduino-esp32)    | Espressif Arduino Core 內建 | 隨 Core 安裝          | 隨 Core v3.3.8 |

### 安裝 esp32 Arduino Core

1. 開啟 Arduino IDE 的偏好設定，在「其他開發板管理員網址」加入：


   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
2. 開啟「工具 → 開發板 → 開發板管理員」，搜尋 `esp32`。
3. 安裝 `esp32 by Espressif Systems`。本機確認版本為 v3.3.8，重現時建議選擇同一版本，減少 Core 差異帶來的排錯變數。

### 開啟程式碼並燒錄

1. 開啟[專案 GitHub 頁面](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek)，下載整個專案目錄，或只儲存 `ArduinoIDE/esp32s3-st7306-bringup` 資料夾。
2. 用 Arduino IDE 開啟 `ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino`。
3. 確認程式碼中的 `PINSET` 為 `1`，並核對 `ROT180` 預設為 `1`。
4. 在「工具 → 開發板」裡選你手上的 ESP32-S3 開發板（本例是 `ESP32S3 Dev Module`），再選對序列埠。參考值在下一節，不必逐項照抄。
5. 點擊「驗證」，通過後再點擊「上傳」。
6. 開啟序列埠監控視窗，選擇 115200 鮑率。看到 `進入測試頁面迴圈`，再觀察螢幕是否按測試頁輪播。用原生 USB 時，上傳後序列埠會重新列舉，啟動日誌可能已經印完；看不到就按一下 RST，或以後續的 `[PAGE]` 翻頁日誌為準。螢幕是反射式的，請在明亮光線下觀察。

### Arduino IDE 選單設定（參考值）

下面這套是我跑通時的設定，Arduino IDE v2.3.8 + esp32 Core v3.3.8。只作參考：ESP32-S3 開發板型號太多，Flash 晶片、PSRAM、USB 接法都可能不一樣，照抄反而容易出問題。表裡第三欄寫了哪些項跟板子走。

| 選單項 | 本例取值 | 怎麼定 |
| --- | --- | --- |
| Board | ESP32S3 Dev Module | 按你的板子選，架構必須是 esp32s3 |
| Port | /dev/cu.usbmodem1401 | 選本機實際連接埠，別照抄路徑 |
| USB CDC On Boot | Enabled | 看 USB 接到哪：接原生 USB 要 Enabled，走板載序列埠晶片要 Disabled |
| CPU Frequency | 240MHz (WiFi) | 保持預設即可，範例不需要降頻 |
| Flash Mode | QIO 80MHz | 按 Flash 晶片定，QIO 是多數模組的預設值 |
| Flash Size | 4MB (32Mb) | 不要超過板子實際容量（選大了可能啟動失敗）；選小只是少用容量，程式超出分割區才會編譯報錯 |
| PSRAM | Disabled | 範例不用 PSRAM，保持 Disabled 最穩；要開就必須按模組選對 OPI/QSPI（N16R8 的 R8 通常是 Octal，選 OPI PSRAM），選錯可能起不來 |
| Partition Scheme | Default 4MB with spiffs（1.2MB APP / 1.5MB SPIFFS） | 預設夠用，改 Flash Size 時要一起改 |
| Upload Speed | 921600 | 上傳失敗就降到 115200 或 460800 |
| Upload Mode | UART0 / Hardware CDC | 跟 USB CDC 那項配套 |
| USB Mode | Hardware CDC and JTAG | 跟板子的 USB 埠數量有關，單埠板通常這樣 |

我這塊是 N16R8，標稱 16MB Flash 加 8MB PSRAM，但上面 Flash Size 填的是 4MB、PSRAM 是 Disabled，等於大半容量沒用上。範例只佔 30000 位元組 RAM 做顯示記憶體，編譯報告顯示程式約佔預設 APP 分割區的 24%，所以這套值能跑。要用滿容量就得改 Flash Size、PSRAM 和分割區表，我沒試過，不想讓你踩這個坑。

判斷自己設定對不對，不用逐項核對：能編譯、能上傳、序列埠能出字、螢幕能出畫面，就夠了。哪一步斷了，先去排錯那一節按現象對號。

## 完整程式碼：Arduino IDE 驅動 ST7306

下面是倉庫 v7.5 的完整 `.ino`。與倉庫相比，本文只改了幾處註釋（`PINSET` 含義、旋轉方式、置中說明、FPS 口徑、`DIAG_MODE` 用途），可執行邏輯沒有動；倉庫裡對應的註釋建議同步更新。v7.4 修正了 `PAGE_CYAN` 的填充位元組，v7.5 刪掉了一段讀不回資料的 `0x09` 狀態讀取，其餘邏輯未改。
```cpp
/*
 * ESP32-S3 + OSPTEK 4.2" 300x400 黑白紅青 LCD（ST7306 · SPI）測試套件 v7.5
 *
 * v7.5 改動（刪除無效的狀態回讀）：
 *   用 esp32s3-st7306-readback-test 實測：SPI.begin(...,-1,MOSI,-1) 時 MISO 未接，
 *   transfer() 恆返回 0xFF，與暫存器位址、CS 是否選中都無關；把資料腳切成輸入後
 *   用上拉/下拉各讀一遍，結果是全 1 / 全 0，說明螢幕在讀命令期間沒有驅動資料線。
 *   結論：這塊模組在當前接法下讀不回暫存器，原來的 [DIAG] 0x09 日誌只會誤報 OK，
 *   已整段刪除。判斷鏈路好壞請看螢幕是否正常顯示，不要看序列埠。
 *
 * v7.4 改動（修復 PAGE_CYAN 全螢幕填充）：
 *   實機對比 0x33 / 0x55 / 逐點 writePoint(C_CYAN)：
 *   0x33 與逐點寫入都顯示整螢幕青（視覺偏藍），0x55 顯示間隔條紋。
 *   逐點寫入後的 30000 位元組顯示記憶體也全部為 0x33，故將 PAGE_CYAN 改為 0x33。
 *
 * v7.3 改動（整螢幕再旋轉 180°）：
 *   現場演示時畫面方向與原映射相反，需要整螢幕轉 180°。
 *   在 writePoint 的軟體映射前加一次邏輯座標中心對稱：
 *     x -> LCD_W-1-x, y -> LCD_H-1-y
 *   等價於 rx = 299 - y; ry = x;  用 ROT180 巨集開關，設 0 可回到 v7.1 方向。
 *
 * v7.1 改動（橫版適配 - 軟體旋轉，方向修正）：
 *   面板物理排線是直版 300x400，使用者橫著擺放，視角為 400x300。
 *   用軟體旋轉：writePoint 把邏輯橫版座標映射到直版顯示記憶體。
 *   映射公式（v7.1 修正）：rx = y; ry = 399 - x;
 *   v7 曾用 rx=299-y, ry=x（順時針），診斷方塊出現在右下方，方向反了。
 *   v7.1 改為逆時針：方塊應出現在左上方。
 * v7.2：關閉 DIAG_MODE，恢復完整 8 頁測試迴圈。
 *
 * v4 關鍵修復：
 *   1) 補上 pinMode(LCD_CS/RS, OUTPUT)：digitalWrite 底層只是 gpio_set_level()，
 *      不會自動切輸出模式，ESP32 腳位預設是輸入，CS/D-C 懸空導致螢幕收不到
 *      任何有效命令/資料時序。這是之前幾版無顯示的真正根因。
 *   2) 腳位定義與 board_config.h（BOARD_PINSET 1）保持一致，接線無需改動：
 *      CS=9  RST=10  CLK=12  MOSI=13  RS(D/C)=14
 *   3) SPI 時鐘 20MHz
 *   4) 補上 IDF 工程 app_main 中 initialize() 之後的步驟：
 *      High_Power_Mode / display_on / display_Inversion(false) / clearDisplay
 *   5) 顏色映射與 IDF board_color.h 一致：
 *      C_WHITE=0x00  C_CYAN=0x01  C_RED=0x02  C_BLACK=0x03
 *      （bit0=青, bit1=紅, 兩bit都開=黑）
 *
 * v5 新增 8 個測試頁面（每頁 3 秒，刷新率頁 6 秒）：
 *   0 COLOR_BARS  四色橫條（白/青/紅/黑）
 *   1 HELLO       HELLO WORLD + 四角角標 + 邊框
 *   2 COUNTER     計時 / 幀數 / FPS
 *   3 DIAGONAL    對角線 + 橫直線
 *   4 REFRESH     刷新率測試（移動方塊）
 *   5 CHECKER     棋盤格
 *   6 STRIPES     橫條紋
 *   7 CYAN        全螢幕青色
 */

#include <SPI.h>
#include <esp_heap_caps.h>

// ---------------- 腳位設定 ----------------
#define PINSET 1  // 1=預設接法（GPIO9/10/12/13/14，本文使用）  0=備用接法（GPIO38～42）

#if PINSET == 1
  // 腳位與 IDF 工程 board_config.h（BOARD_PINSET 1）完全一致，接線不需要改動
  #define LCD_CS   9
  #define LCD_RST  10
  #define LCD_CLK  12
  #define LCD_MOSI 13
  #define LCD_RS   14   // D/C，絲印 RS
#else
  #define LCD_CS   38
  #define LCD_RST  41
  #define LCD_CLK  39
  #define LCD_MOSI 42
  #define LCD_RS   40
#endif

// ---------------- 螢幕參數 ----------------
// 邏輯解析度：橫版 400x300（面板物理排線是直版 300x400，由 writePoint() 軟體旋轉，未使用 MV 位）
#define LCD_W      400
#define LCD_H      300
// 直版顯示記憶體參數（不變）
#define LCD_PIVOT_W  300   // 物理寬
#define LCD_PIVOT_H  400   // 物理高
#define LCD_ROW_B    (LCD_PIVOT_W / 2)          // 每行 150 位元組
#define BUF_LEN      (LCD_ROW_B * LCD_PIVOT_H / 2)  // 30000 位元組
#define CHUNK        1500

// 顏色映射與 IDF board_color.h 一致
#define C_WHITE  0x00
#define C_CYAN   0x01
#define C_RED    0x02
#define C_BLACK  0x03

// 若仍然點不亮，可把 20000000 降到 10000000 再試
#define SPI_HZ  20000000

static uint8_t *fb = nullptr;

// ---------------- 底層 SPI（CS 全手動）----------------
static void spi_begin(void) {
  SPI.beginTransaction(SPISettings(SPI_HZ, MSBFIRST, SPI_MODE0));
}

static void lcd_cmd(uint8_t cmd) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, LOW);
  SPI.transfer(cmd);
  digitalWrite(LCD_CS, HIGH);
}

static void lcd_param(uint8_t p) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  SPI.transfer(p);
  digitalWrite(LCD_CS, HIGH);
}

// 這裡原來有個 lcd_read_reg()，用 SPI.transfer() 讀 0x09 狀態暫存器。
// v7.5 刪掉的原因（實測，不是推測）：
//   1) SPI.begin(LCD_CLK, -1, LCD_MOSI, -1) 的第二個參數是 MISO，傳 -1 表示沒接，
//      外設沒有輸入腳可取樣，transfer() 恆返回 0xFF。
//   2) 換成 0x04 / 0x0A / 0xDA / 0xA5 任意暫存器，或者把 CS 一直拉高根本
//      不選中螢幕，讀回的還是 0xFF —— 說明這個值和螢幕沒有任何關係。
//   3) 改成半雙工（把 MOSI 腳切成輸入、手動打時鐘）再讀，內部上拉得到全 1、
//      內部下拉得到全 0，說明讀命令期間螢幕沒有驅動資料線，讀不回來。
// 所以這塊模組在當前接法下沒有可用的鏈路自檢。判斷接沒接好，就看螢幕顯不顯示。

// ---------------- 初始化序列（與 IDF 逐條一致）----------------
static void st7306_init(void) {
  // 關鍵修復：必須明確把 CS / RS / RST 設成輸出。
  // digitalWrite 底層只是 gpio_set_level()，不會自動切輸出模式；
  // ESP32 腳位預設是輸入，若不 pinMode，CS 和 D/C 全程懸空，螢幕收不到任何有效時序。
  pinMode(LCD_CS,  OUTPUT);
  pinMode(LCD_RS,  OUTPUT);
  pinMode(LCD_RST, OUTPUT);
  digitalWrite(LCD_CS, HIGH);   // 閒置時 CS 拉高
  digitalWrite(LCD_RS, HIGH);
  digitalWrite(LCD_RST, HIGH); delay(10);
  digitalWrite(LCD_RST, LOW);  delay(10);
  digitalWrite(LCD_RST, HIGH); delay(10);

  // 最後一個參數傳 -1，CS 完全由手動 digitalWrite 控制
  SPI.begin(LCD_CLK, -1, LCD_MOSI, -1);
  spi_begin();

  lcd_cmd(0xD6); lcd_param(0x17); lcd_param(0x02);
  lcd_cmd(0xD1); lcd_param(0x01);

  lcd_cmd(0xC0); lcd_param(0x12); lcd_param(0x0A);
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);

  lcd_cmd(0xD8); lcd_param(0xA6); lcd_param(0xE9);
  lcd_cmd(0xB2); lcd_param(0x12);

  lcd_cmd(0xB3); lcd_param(0xE5); lcd_param(0xF6); lcd_param(0x17);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x71);
  lcd_cmd(0xB4); lcd_param(0x05); lcd_param(0x46); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x76); lcd_param(0x45);

  lcd_cmd(0x62); lcd_param(0x32); lcd_param(0x03); lcd_param(0x1F);

  lcd_cmd(0xB7); lcd_param(0x13);
  lcd_cmd(0xB0); lcd_param(0x64);

  lcd_cmd(0x11); delay(120);                         // Sleep Out

  lcd_cmd(0xC9); lcd_param(0x00);
  lcd_cmd(0x36); lcd_param(0x48);                    // MX=1, DO=1
  lcd_cmd(0x3A); lcd_param(0x11);
  lcd_cmd(0xB9); lcd_param(0x20);
  lcd_cmd(0xB8); lcd_param(0x29);

  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);

  lcd_cmd(0x35); lcd_param(0x00);
  lcd_cmd(0xD0); lcd_param(0xFF);
  lcd_cmd(0x38);                                     // HPM

  lcd_cmd(0x29);                                     // DISPLAY ON
  lcd_cmd(0x20);                                     // Inversion Off

  lcd_cmd(0xBB); lcd_param(0x4F);                    // Enable Clear RAM

  // ---- IDF app_main 在 initialize() 之後還會呼叫的步驟 ----
  lcd_cmd(0x38); delay(300);                         // High_Power_Mode() 的 HPM 序列
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);
  lcd_cmd(0xC9); lcd_param(0x00);
  delay(20);
  // display_on(true) / display_Inversion(false) 已在上面發過 0x29/0x20
  // clearDisplay() 等價於顯示記憶體清零，由刷屏前的 memset 完成

  SPI.endTransaction();
}

// ---------------- 刷屏（分塊發送）----------------
static void st7306_flush(void) {
  spi_begin();
  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);
  lcd_cmd(0x2C);

  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  for (size_t off = 0; off < BUF_LEN; off += CHUNK) {
    size_t n = BUF_LEN - off;
    if (n > CHUNK) n = CHUNK;
    SPI.writeBytes(fb + off, n);
  }
  digitalWrite(LCD_CS, HIGH);
  SPI.endTransaction();
}

// ---------------- 像素操作 ----------------
// 邏輯座標：橫版 400x300
// 直版顯示記憶體 300(欄) x 400(行)，軟體旋轉映射：
//   橫版 x (0~399, 左到右) -> 直版行 ry = 399 - x（左右翻轉）
//   橫版 y (0~299, 上到下) -> 直版欄 rx = y
// bit 位段用直版物理座標 rx/ry 的奇偶計算。
//
// ROT180：把整螢幕再旋轉 180°（面板裝反 / 演示擺放方向相反時用）。
//   做法是先把邏輯座標做中心對稱 x -> 399-x, y -> 299-y，再套用上面的映射，
//   化簡後等價於：rx = 299 - y; ry = x;
#define ROT180 1   // 1 = 旋轉 180°（當前）；0 = 恢復 v7.1 原方向

static void writePoint(uint16_t x, uint16_t y, uint16_t data) {
  if (x >= LCD_W || y >= LCD_H) return;
#if ROT180
  x = LCD_W - 1 - x;       // 邏輯 x 鏡像
  y = LCD_H - 1 - y;       // 邏輯 y 鏡像
#endif
  uint16_t rx = y;         // 直版欄
  uint16_t ry = 399 - x;   // 直版行（翻轉）
  uint16_t real_x = rx / 2;
  uint16_t real_y = ry / 2;
  uint32_t idx    = (uint32_t)real_y * LCD_ROW_B + real_x;
  uint8_t one_two    = (ry % 2) ? 1 : 0;
  uint8_t line_bit_1 = (rx % 2) * 4;
  uint8_t line_bit_0 = (rx % 2) * 4 + 2;
  uint8_t bit1       = 7 - (line_bit_1 + one_two);
  uint8_t bit0       = 7 - (line_bit_0 + one_two);
  if (data & 0x02) fb[idx] |=  (1 << bit1);
  else             fb[idx] &= ~(1 << bit1);
  if (data & 0x01) fb[idx] |=  (1 << bit0);
  else             fb[idx] &= ~(1 << bit0);
}

static void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  for (uint16_t j = 0; j < h; j++)
    for (uint16_t i = 0; i < w; i++)
      writePoint(x + i, y + j, color);
}

// ---------------- 5x7 字模（移植自 IDF board_ui_draw.cc）----------------
static const uint8_t s_font_5x7[][7] = {
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, /*   */
    {0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04}, /* ! */
    {0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00}, /* " */
    {0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A}, /* # */
    {0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04}, /* $ */
    {0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03}, /* % */
    {0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0D}, /* & */
    {0x04, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00}, /* ' */
    {0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02}, /* ( */
    {0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08}, /* ) */
    {0x00, 0x04, 0x15, 0x0E, 0x15, 0x04, 0x00}, /* * */
    {0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00}, /* + */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08}, /* , */
    {0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00}, /* - */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00}, /* . */
    {0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00}, /* / */
    {0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E}, /* 0 */
    {0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* 1 */
    {0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F}, /* 2 */
    {0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E}, /* 3 */
    {0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02}, /* 4 */
    {0x1F, 0x10, 0x10, 0x1E, 0x01, 0x01, 0x1E}, /* 5 */
    {0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E}, /* 6 */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08}, /* 7 */
    {0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E}, /* 8 */
    {0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E}, /* 9 */
    {0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00}, /* : */
};

// 大寫字母 A-Z（5x7）
static const uint8_t s_font_upper[][7] = {
    {0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* A */
    {0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E}, /* B */
    {0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E}, /* C */
    {0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E}, /* D */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F}, /* E */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10}, /* F */
    {0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F}, /* G */
    {0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* H */
    {0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* I */
    {0x01, 0x01, 0x01, 0x01, 0x01, 0x11, 0x0E}, /* J */
    {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11}, /* K */
    {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F}, /* L */
    {0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11}, /* M */
    {0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11}, /* N */
    {0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* O */
    {0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10}, /* P */
    {0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D}, /* Q */
    {0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11}, /* R */
    {0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E}, /* S */
    {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04}, /* T */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* U */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04}, /* V */
    {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A}, /* W */
    {0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11}, /* X */
    {0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04}, /* Y */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F}, /* Z */
};

static void draw_char(int x, int y, char c, int scale, uint16_t color) {
    const uint8_t *rows = nullptr;
    if (c >= ' ' && c <= ':') {
        rows = s_font_5x7[c - ' '];
    } else if (c >= 'A' && c <= 'Z') {
        rows = s_font_upper[c - 'A'];
    } else if (c >= 'a' && c <= 'z') {
        rows = s_font_upper[c - 'a'];   // 沿用大寫字模
    } else {
        return;
    }
    for (int ry = 0; ry < 7; ++ry) {
        for (int rx = 0; rx < 5; ++rx) {
            if (rows[ry] & (1U << (4 - rx))) {
                fillRect(x + rx * scale, y + ry * scale, scale, scale, color);
            }
        }
    }
}

static void draw_text(int x, int y, const char *s, int scale, uint16_t color) {
    const int char_w = 5 * scale + scale;
    int pen_x = x;
    for (const char *p = s; *p; ++p) {
        draw_char(pen_x, y, *p, scale, color);
        pen_x += char_w;
    }
}

// ---------------- 測試頁面 ----------------
enum TestPage {
    PAGE_COLOR_BARS = 0,   // 四色橫條（白/青/紅/黑）
    PAGE_HELLO,            // Hello World + 四角角標 + 邊框
    PAGE_COUNTER,          // 秒數 / 幀數計數
    PAGE_DIAGONAL,         // 對角線 + 橫直線
    PAGE_REFRESH,          // 刷新率測試（移動方塊）
    PAGE_CHECKER,          // 棋盤格
    PAGE_STRIPES,          // 橫條紋
    PAGE_CYAN,             // 全螢幕青色
    kTotalPages
};

static void draw_corner_marks(uint16_t color) {
    const int L = 30, T = 4;  // 臂長、臂粗
    // 左上
    fillRect(4, 4, L, T, color);  fillRect(4, 4, T, L, color);
    // 右上
    fillRect(LCD_W - 4 - L, 4, L, T, color);  fillRect(LCD_W - 4 - T, 4, T, L, color);
    // 左下
    fillRect(4, LCD_H - 4 - T, L, T, color);  fillRect(4, LCD_H - 4 - L, T, L, color);
    // 右下
    fillRect(LCD_W - 4 - L, LCD_H - 4 - T, L, T, color);
    fillRect(LCD_W - 4 - T, LCD_H - 4 - L, T, L, color);
}

static void draw_border(uint16_t color) {
    fillRect(0, 0, LCD_W, 2, color);
    fillRect(0, LCD_H - 2, LCD_W, 2, color);
    fillRect(0, 0, 2, LCD_H, color);
    fillRect(LCD_W - 2, 0, 2, LCD_H, color);
}

// 畫一條任意方向直線（Bresenham）
static void draw_line(int x0, int y0, int x1, int y1, int thick, uint16_t color) {
    int dx = abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int dy = -abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    int err = dx + dy;
    while (true) {
        fillRect(x0, y0, thick, thick, color);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

static void render_page(int page, uint32_t frame, uint32_t elapsed_ms) {
    memset(fb, 0x00, BUF_LEN);   // 預設全白

    switch (page) {
    case PAGE_COLOR_BARS: {
        const uint16_t colors[4] = { C_WHITE, C_CYAN, C_RED, C_BLACK };
        const int bar_h = LCD_H / 4;
        for (int i = 0; i < 4; ++i) {
            int y0 = i * bar_h;
            int y1 = (i == 3) ? LCD_H : (y0 + bar_h);
            fillRect(0, y0, LCD_W, y1 - y0, colors[i]);
        }
        draw_text(10, 10, "1: COLOR BARS", 2, C_BLACK);
        break;
    }
    case PAGE_HELLO:
        // "HELLO WORLD" 11 字元 * scale5 * 6px = 330px 寬，置中 x=(400-330)/2=35
        draw_text(35, 110, "HELLO WORLD", 5, C_BLACK);
        draw_text(110, 175, "ST7306 400X300", 2, C_RED);
        draw_text(110, 200, "ESP32-S3 ARDUINO", 2, C_CYAN);
        draw_corner_marks(C_BLACK);
        draw_border(C_RED);
        break;
    case PAGE_COUNTER: {
        char buf[24];
        uint32_t sec = elapsed_ms / 1000;
        snprintf(buf, sizeof(buf), "T: %02lu:%02lu", (unsigned long)(sec / 60), (unsigned long)(sec % 60));
        draw_text(115, 80, buf, 5, C_BLACK);        // 240 寬；x=115 為手調，未嚴格置中
        snprintf(buf, sizeof(buf), "FRAME: %lu", (unsigned long)frame);
        draw_text(140, 160, buf, 3, C_RED);         // 寬度隨位數變化；x=140 為手調
        snprintf(buf, sizeof(buf), "FPS: %lu", (unsigned long)(frame * 1000 / max((uint32_t)1, elapsed_ms)));
        draw_text(152, 200, buf, 3, C_CYAN);        // 寬度隨位數變化；x=152 為手調；FPS 為開機至今所有頁面的累計平均
        break;
    }
    case PAGE_DIAGONAL:
        // 兩條對角線
        draw_line(0, 0, LCD_W - 1, LCD_H - 1, 3, C_BLACK);
        draw_line(LCD_W - 1, 0, 0, LCD_H - 1, 3, C_RED);
        // 橫線
        for (int y = 30; y < LCD_H; y += 60)
            draw_line(0, y, LCD_W - 1, y, 2, C_CYAN);
        // 直線
        for (int x = 40; x < LCD_W; x += 80)
            draw_line(x, 0, x, LCD_H - 1, 2, C_BLACK);
        draw_text(10, 10, "3: DIAGONAL", 2, C_BLACK);
        break;
    case PAGE_REFRESH: {
        // 方塊左右往返，觀察運動平滑度
        int period = LCD_W - 60;
        int x = (int)((frame * 8) % (period * 2));
        if (x > period) x = period * 2 - x;
        fillRect(x + 10, 130, 40, 40, C_BLACK);     // 垂直置中 y=(300-40)/2
        char buf[24];
        snprintf(buf, sizeof(buf), "FRAME %lu", (unsigned long)frame);
        draw_text(10, 10, buf, 2, C_BLACK);
        break;
    }
    case PAGE_CHECKER: {
        const int cell = 20;
        for (int y = 0; y < LCD_H; y += cell)
            for (int x = 0; x < LCD_W; x += cell)
                fillRect(x, y, cell, cell, ((x / cell + y / cell) & 1) ? C_BLACK : C_WHITE);
        break;
    }
    case PAGE_STRIPES: {
        const int stripe_h = 16;
        for (int y = 0; y < LCD_H; y += stripe_h * 2) {
            fillRect(0, y, LCD_W, stripe_h, C_BLACK);
            fillRect(0, y + stripe_h, LCD_W, stripe_h, C_WHITE);
        }
        break;
    }
    case PAGE_CYAN:
        memset(fb, 0x33, BUF_LEN);   // 0x33 = 每個合併像素 01 -> 全螢幕青
        draw_text(85, 130, "CYAN FULL", 5, C_BLACK);   // 270 寬；x=85 為手調，未嚴格置中
        break;
    default:
        break;
    }

    st7306_flush();
}

// ---------------- Arduino 入口 ----------------

// 診斷模式：true 時只畫一個 50x50 黑方塊在邏輯 (50,50)，
// 用於判斷 writePoint 映射和方向是否正確（螢幕完全不亮時它幫不上忙，先查接線和供電）。
// 觀察要點：
//   1. 方塊是正方形（不是矩形/碎片）-> 像素映射比例正確
//   2. 方塊在橫版視角的左上 1/4 區域 -> 方向正確
//   3. 若整體反了 -> 先改 ROT180 巨集；仍不對再考慮改 MADCTL(0x36) 的 MX/MY 位
#define DIAG_MODE  false

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println();
    Serial.println("=== ST7306 test suite v7.5 (ROT180) ===");

    fb = (uint8_t *)heap_caps_malloc(BUF_LEN, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!fb) fb = (uint8_t *)malloc(BUF_LEN);
    if (!fb) { Serial.println("[ERR] 顯示記憶體分配失敗"); while (1) delay(100); }
    Serial.printf("[OK] 顯示記憶體 %d 位元組 @%p\n", BUF_LEN, fb);
    memset(fb, 0x00, BUF_LEN);

    Serial.println("[..] 初始化 ST7306 ...");
    st7306_init();

    // 這裡原來會讀一次 0x09 狀態暫存器並列印 OK / 鏈路不通。
    // v7.5 刪除：MISO 沒接，讀回的值恆為 0xFF，和螢幕狀態無關，只會誤報。
    // 鏈路是否正常，看螢幕有沒有正常出畫面。

    if (DIAG_MODE) {
        Serial.println("[DIAG] 畫 50x50 方塊 at (50,50)，觀察螢幕...");
        fillRect(50, 50, 50, 50, C_BLACK);
        st7306_flush();
    } else {
        Serial.println("[OK] 進入測試頁面迴圈");
    }
}

void loop() {
    if (DIAG_MODE) { delay(1000); return; }

    static int page = 0;
    static uint32_t page_start = 0;
    static uint32_t frame = 0;
    static uint32_t t_start = 0;

    if (t_start == 0) t_start = millis();
    if (page_start == 0) page_start = millis();

    uint32_t dwell = (page == PAGE_REFRESH) ? 6000 : 3000;
    uint32_t elapsed = millis() - page_start;

    render_page(page, frame, millis() - t_start);
    frame++;

    if (elapsed >= dwell) {
        page = (page + 1) % kTotalPages;
        page_start = millis();
        Serial.printf("[PAGE] %d / %d, frame %lu\n", page, kTotalPages - 1, (unsigned long)frame);
    }
}
```


### 程式碼說明：ST7306 初始化、顯示記憶體與旋轉

`PINSET` 決定使用哪一組 GPIO。本文的接線對應 `PINSET = 1`；原始碼還保留了 `PINSET = 0` 的另一組腳位，換組時必須同時改接線。`PINSET` 只是兩組腳位的開關，與是否使用轉接板無關；為了方便我接線所以我增加了一個接線設定，對應 `PINSET = 1`。

`st7306_init()` 先把 CS、RS、RST 設為輸出，再完成硬體復位和 ST7306 初始化。`SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` 指定 SCLK 和 MOSI，CS 由程式碼手動控制；MISO 傳 `-1`，因為本模組 FPC 上沒有 MISO/SDO，只能寫不能讀，所以本例沒有讀回自檢。傳輸使用 `SPI_MODE0`，時脈由 `SPI_HZ` 設定為 20MHz。

顯示記憶體大小可以直接算出來：每像素 2bit，一個位元組裝 2×2 共 4 個像素，所以 300×400 像素折合為每行 150 位元組、共 200 行（每行對應 2 個像素行），`150 × 200 = 30000` 位元組。程式啟動時用 `heap_caps_malloc()` 申請 DMA 可用記憶體，失敗後再退回普通 `malloc()`。

`writePoint()` 把邏輯 400×300 橫向螢幕座標換算成原生 300×400 顯示記憶體座標。預設 `ROT180 = 1` 會再做一次中心對稱，所以改顯示方向時先動這個巨集，不要改 `LCD_W` 和 `LCD_H`。

`st7306_flush()` 每次把完整顯示記憶體送出去，每塊 1500 位元組。`loop()` 持續重畫目前頁面，一般頁約 3 秒後翻頁，`PAGE_REFRESH` 約 6 秒後翻頁。計數頁的時間和 FPS 都是開機以來的累計值，不是單頁資料。

ESP-IDF 版本的驅動拆在 `main/st7306_color4.cpp`、`main/st73xx_ui.c` 和 `main/color4_demo.c` 中，頁面也更多。這部分留給讀者按倉庫 README 自行研究，本文不展開 ESP-IDF 的編譯步驟。
## 常見問題排查：ST7306 無顯示、方向與顏色

### 上傳成功，螢幕完全沒有變化

現象：序列埠已經執行，螢幕仍保持原樣。

原因：供電、共地、FPC 方向、RS/DC 接錯或 SPI 訊號不穩定，都可能讓初始化命令沒有正確到達螢幕；反射式螢幕沒有背光，環境太暗時也會看起來像沒顯示。

怎麼辦：先斷電核對公共地和 FPC 觸點方向，再上電量第 5、6 腳是否為 3.3V（見前文檢查步驟）。廠家轉接板的 GPIO14 接 RS。在明亮光線下換個角度觀察。以上都正常後，再把 `SPI_HZ` 從 `20000000` 改為 `10000000`，縮短 SCLK 和 MOSI 連線後重新上傳。

### 舊版本（v7.4 及以前）序列埠列印 OK，螢幕卻不亮

現象：序列埠列印 `[DIAG] ST7306 0x09 = 0xFF OK`，螢幕卻沒有任何畫面。

原因：這行日誌不能反映螢幕狀態。按上面的 FPC 腳位表，本模組沒有 MISO/SDO，`SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` 也沒有給 MISO 分配腳位，`SPI.transfer()` 恆回傳 `0xFF`，與讀哪個暫存器、CS 是否選中都無關（我換過 `0x04`、`0x0A`、`0xDA`、`0xA5`，把 CS 一直拉高也一樣）。把 MOSI 腳切成輸入手動讀時，上拉得全 1、下拉得全 0，同樣說明讀命令期間螢幕沒有驅動資料線。

怎麼辦：升級到 v7.5，該行已刪除。v7.5 的序列埠日誌不反映螢幕狀態，判斷鏈路只看螢幕有沒有出畫面，排查回到供電、共地、FPC 方向和 RS 接腳。

### ST7306 時好時壞、花屏或每次上電結果不同

現象：有時能顯示，有時花屏，或者重新上電後結果不同。

原因：SPI 連線過長、公共地接觸不良，會讓資料在傳輸中出錯；線越長、時脈越高越容易丟位元組（這是經驗判斷，我沒有做量化測試）。

怎麼辦：先把線縮短到 10cm 以內，確認 GND 一共接了兩根以上、不是只靠一根細線過地。再把 `SPI_HZ` 從 20MHz 降到 10MHz 試，能穩定再往上加。不要先隨意刪改初始化命令。

### ST7306 橫向螢幕方向反了

現象：文字或圖案旋轉了 180°，但圖形比例正常。

原因：目前程式碼預設 `ROT180 = 1`，你的擺放方向可能與範例相反。

怎麼辦：上傳後看 HELLO WORLD 頁：文字是正的就不用動；如果整個螢幕顛倒了 180°，把 `#define ROT180 1` 改為 `#define ROT180 0`，重新上傳即可。需要單獨檢查方向和座標時，把 `DIAG_MODE` 改為 `true`，程式會只畫一個 50×50 黑方塊；方向正確時它應是正方形，位於畫面左上區域。這個模式只用於檢查方向和映射，螢幕完全不亮時它幫不上忙。

### ST7306 顯示比例或位置異常

現象：方塊變形、圖案碎裂或位置不符合預期。

原因：通常出現在改過 `LCD_W`、`LCD_H`、顯示記憶體布局巨集或 `writePoint()` 之後，或把程式碼用到了別的 ST7306 模組上；未改動的 v7.5 在本模組上不應出現。400×300 邏輯座標與 300×400 原生顯示記憶體之間靠 `writePoint()` 映射，不能靠改解析度巨集解決。

怎麼辦：保留 `LCD_W = 400`、`LCD_H = 300`，先開 `DIAG_MODE` 檢查方塊，再對照 `writePoint()` 的 `rx`、`ry` 和位平面計算。

### ST7306 顏色與預期不同

現象：紅色、青色或填充圖案不符合預期。

原因：本模組只有白、青、紅、黑四種狀態，兩個顏色位在位元組內交錯排列。其他 ST7306 模組也可能採用不同顏色實作。

怎麼辦：先執行四色橫條頁，確認四種基礎狀態，再檢查 `writePoint()` 的顏色寫入。v7.4 起已把 `PAGE_CYAN` 的填充位元組改為 `0x33`；如果執行舊版看到間隔條紋，升級程式碼或只改這一處。

### Arduino IDE 提示 `esp_heap_caps.h` 找不到

現象：編譯階段提示標頭檔缺失。

原因：目前選擇的開發板或 Core 不對。這個標頭檔屬於 ESP32 Arduino Core，不是單獨的第三方程式庫。

怎麼辦：確認安裝的是 `esp32 by Espressif Systems`，並在開發板選單裡選擇 ESP32-S3，而不是 Arduino Uno 或其他架構。若 Core 已損壞，記錄目前版本後重新安裝，再重新選擇開發板和連接埠。

### ESP32-S3 上傳後看不到序列埠日誌

現象：螢幕可能已經有頁面，序列埠監視器卻沒有內容。

原因：鮑率、序列埠裝置或 USB CDC 設定不匹配，也可能是序列埠被其他程式占用。

怎麼辦：把鮑率設為 115200，關閉占用序列埠的其他監視器。再對照本例的選單值：`USB CDC On Boot = Enabled`、`USB Mode = Hardware CDC and JTAG`，序列埠裝置形如 `/dev/cu.usbmodem1401`（Windows 上是 COM 埠）。如果板子走的是板載 USB 轉序列埠晶片而不是原生 USB，把 `USB CDC On Boot` 改為 `Disabled`；`USB Mode` 對這種接法基本沒有影響，保持預設即可。
## FAQ：ESP32-S3 驅動 ST7306 的常見疑問

**Q：ESP32-S3 能不能換別的腳位接 ST7306？**  
A：可以修改 `.ino` 中 `PINSET = 1` 分支下的 `LCD_CS`、`LCD_RST`、`LCD_CLK`、`LCD_MOSI` 和 `LCD_RS`，接線也要同步改。能不能使用某個 GPIO 取決於開發板引出和啟動設定，我沒逐塊板驗證。例如 N16R8 上 GPIO35～37 被 Octal PSRAM 占用，開啟 PSRAM 時要避開。原始碼的 `PINSET = 0` 還提供了 CS=38、RESET=41、SCLK=39、MOSI=42、RS=40 這一組備選。

**Q：ST7306 的 SPI 時脈能不能改？**  
A：範例預設 `SPI_HZ = 20000000`，即 20MHz。通訊不穩定時先改成 `10000000`。專案資料記錄 ST7306 v0.1 手冊的寫時脈最小週期為 30ns，折合約 33.3MHz；實際模組還要考慮走線和轉接板，我沒有測出這塊板的穩定上限。

**Q：YDP420H005-V3 能不能接 5V 供電？**  
A：不要。模組 FPC 第 5、6 腳接 3.3V，邏輯也按 3.3V 使用。兩個供電腳都要接，開發板和模組要共地。模組斷電時不要繼續給它輸入 GPIO 訊號。

**Q：這個 ST7306 範例占多少 RAM，能跑多少 FPS？**  
A：完整顯示記憶體是 30000 位元組，程式還會使用字模、區域變數和 Arduino Core 本身的執行記憶體。每次刷新發送完整 30000 位元組；20MHz 下只算 SPI 負載，理論傳輸時間約 12ms，不含繪圖和命令開銷。實際 FPS 我沒有記錄。計數頁顯示的是開機以來所有頁面的累計平均，不是單頁幀率；繪圖本身（逐像素呼叫 `writePoint()`）也要耗時，實際幀時間會比 12ms 長。

**Q：換一塊同樣使用 ST7306 的螢幕能直接用嗎？**  
A：不能保證。本例針對 YDP420H005-V3 的 21Pin FPC、初始化序列、300×400 顯示記憶體和目前四種顯示狀態。其他模組可能改供電、定址、顏色或初始化參數，要先對照它的規格書。

**Q：ST7306 接好線卻沒有顯示，先查哪裡？**  
A：先斷電檢查公共地、FPC 方向和五根必需訊號線，確認廠家轉接板的 GPIO14 接 RS；上電後量 3.3V，並在明亮光線下觀察。仍無顯示，再把 SPI 降到 10MHz。`DIAG_MODE` 只用來檢查方向和映射，螢幕完全不亮時用處不大。

**Q：ST7306 的 TE 和 MISO 要不要接？**  
A：TE 是幀同步輸出，本例不讀取，可以不接。寫入螢幕只用到 MOSI，FPC 上也沒有 MISO/SDO，所以本例沒有讀回暫存器的自檢方式。舊版本範例裡的 `lcd_read_reg(0x09)` 讀回值恆為 `0xFF`，與螢幕狀態無關，v7.5 已刪除，詳見排錯一節。

**Q：能不能用 ESP-IDF 跑這塊 ST7306 螢幕？**  
A：該專案目錄（`Handbook/ESP-IDF/420-…`）本身就是 ESP-IDF 工程，開發記錄寫明 ESP-IDF v6.0.2 已完成零警告編譯，包含 20 頁演示和繪圖函式。本文沒有重新執行這套建置，也不展開 ESP-IDF 教學；你可以按倉庫 README 自行研究。

## 延伸玩法：在 ST7306 範例上繼續改

- 把 `draw_text()` 的 5×7 字模換成自己的點陣字型庫，做一塊四色狀態牌。
- 在現有頁面上加局部內容更新策略，並實測刷新時間與顯示效果。
- 接入 TE 訊號，研究如何安排刷新螢幕時機，觀察運動頁面的變化。
- 對照 Arduino 版本閱讀 ESP-IDF 的 20 頁演示，把需要的繪圖函式拆回自己的應用。

## 參考資料：ESP32-S3、ST7306 與 Arduino

- [LingShunLAB 專案首頁](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek)：本文接線、程式碼和文件的來源。
- [Arduino IDE 範例原始碼 v7.5](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino)：完整 `.ino`。
- [YDP420H005-V3 模組規格書](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/docs/YDP420H005-V3.pdf)：模組參數、機械圖和 FPC 定義。
- [Sitronix ST7306 官方產品列表](https://www.sitronix.com.tw/en/products/industrial-display-driver-ic/ultra-low-power-tft-driver-ic/)：矽創超低功耗 TFT 驅動 IC 產品頁。
- [ST7306 控制器手冊 v0.1（模組廠家提供）](https://admin.osptek.com/uploads/ST_7306_V0_1_c30c3541a3.pdf)：介面、暫存器、顯示記憶體和時序；倉庫 `docs/` 也保留了一份。
- [Osptek 原廠範例程式碼](https://gitee.com/osptek/display-rlcd-4.2inch-300x400/tree/main/examples)：廠家提供的相關顯示範例。
- [Espressif ESP32-S3 官方產品頁](https://www.espressif.com/en/products/socs/esp32-s3)與[官方資料手冊](https://documentation.espressif.com/esp32-s3_datasheet_en.html)：主控晶片資料。
- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)與[官方安裝文件](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)：開發板支援包及安裝方法。
