---
title: "ESP32-S3 驅動 ST7262 RGB 螢幕點亮 + LVGL 儀表板完整教學（Waveshare Touch-LCD-5B / 1024×600）"
boardId: esp32s3
moduleId: display/tft50-st7262
category: esp32
date: 2026-08-03
intro: "用 ESP-IDF 在 Waveshare ESP32-S3-Touch-LCD-5B（5 吋 1024×600、ST7262 RGB 直驅）上從零點亮 RGB 螢幕,接上 LVGL,做成一個會動的車輛遙測儀表板。講清楚 CH422G 背光控制、PCLK 調參、PSRAM 雙緩衝區與緩動動畫,附完整 ESP-IDF 程式碼與避坑清單。"
image: "https://img.lingflux.com/2026/08/b7d201de3550e7561294441b57a205de.jpg"
---

難度：⭐⭐⭐☆☆（會點 C、摸過 ESP-IDF 即可上手）
預計時間：2～3 小時（含環境搭建）
測試環境：ESP-IDF 5.3.x（或 5.2.7 補一行巨集）+ LVGL ^9.3 + espressif/esp_lvgl_port 2.8

---

> **一句話摘要**：用 ESP-IDF 在 Waveshare ESP32-S3-Touch-LCD-5B（5 吋 1024×600、ST7262 純 RGB 直驅）上從黑屏一路點亮 RGB 螢幕、接上 LVGL，最終做成一個會動的車輛遙測儀表板。踩過的坑（解析度騙局、PCLK 白屏、LVGL 記憶體白屏、撕裂與不順滑）和填坑程式碼全在這。

---

> **TL;DR（快速上手）：**
> 1. **認清家底**：5B 是 **1024×600**、驅動 IC **ST7262**、純 RGB 直驅——別信官方例程預設的 800×480。
> 2. **PCLK 用 16MHz**：別抄板卡定義的 21MHz，PSRAM 存畫面時供不上會全白。
> 3. **背光走 CH422G**：不是普通 GPIO，也不是 PWM，往 I²C 地址 `0x38` 寫一個 byte 就開關。
> 4. **跑 LVGL 必開兩個巨集**：`LV_USE_CLIB_MALLOC=y` + `SPIRAM_USE_MALLOC=y`，否則白屏 + 看門狗重開。
> 5. `idf.py build flash monitor`，點亮，開香檳。

---

## 前言

這週末出門在外，朋友買了一塊 Waveshare 的 **ESP32-S3-Touch-LCD-5B**，能燒寫上官方的韌體正常顯示，但無法用程式碼點亮，使用官方例子則又黑又白的，完全搞不通。於是我拿過來接手折騰。這是一塊 5 吋、1024×600 的 RGB 電容觸控螢幕開發板。板子不貴，配置卻挺豪華——CAN、RS485、RTC、鋰電池充電全都有，自帶 16MB Flash + 8MB PSRAM。

於是，我接手過來嘗試點亮它，畢竟最近很喜歡點亮螢幕。但點亮它的過程，坑比我預想的多。最勸退的一點是：**你照著 Waveshare 官方的文件和例程來，點不亮。** 不是你菜，是官方的資源壓根不是為這塊 5B 準備的。

我把整個過程拆成了三個遞進的小例子，程式碼都放在了 GitHub（[本專案完整目錄](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)，三個例子都在裡面）：

1. **點亮螢幕**：最樸素的方式，顯示一行 Hello World → [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
2. **接上 LVGL**：做一個帶指標動畫的半圓速度表 → [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
3. **做成儀表板**：改成一個有設計感的車輛遙測面板 → [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

**本文目標**：把這三步裡踩過的坑、為什麼這麼填的程式碼、以及一份能直接抄的避坑速查清單交給你，讓你少熬幾個通宵。

---

## 實驗效果

最終你能得到一個**會動的車輛遙測儀表板**：轉速、油門、水溫、車速、電壓五個資料卡片，數值帶緩動逼近、進度條過載變紅、指標動畫絲滑不撕裂。

![](https://img.lingflux.com/2026/08/032db1082c643b3c0cc44b993101ead1.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/doq81VdEQRI?si=bIy_tzkslkScLqzU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 一、開發板說明：先認清這塊 5B

正式踩坑前，先把這塊 ESP32-S3-Touch-LCD-5B 的硬體參數擺出來。後面的坑——PCLK 該填多少、記憶體夠不夠、哪幾隻腳共用同一條 I²C——基本都圍著這張表轉，對著看會順很多。

### 螢幕（最該先認清的就是它）

| 項目 | 規格 |
| --- | --- |
| 尺寸 | 5 吋 |
| 面板類型 | IPS |
| 解析度 | **1024 × 600**（實測，官方文件沒單獨標 5B，預設卻是 800×480——這是第一章的大坑） |
| 顯示色彩 | 65K 色 |
| 介面 | RGB（並列），驅動 IC **ST7262**，純 RGB 直驅、**不用發 SPI 初始化命令** |
| 視角 | 175° |
| 亮度 | 550 cd/m² |
| 觸控 | 電容式觸控（含玻璃面板） |
| 背光升壓晶片 | AP3032KTR-G1 |

> **ST7262** 是一塊 RGB 介面的液晶面板驅動 IC（Sitronix 出品），負責接收並列 RGB 訊號並驅動液晶分子，在本專案裡你**完全不用給它發初始化命令**——通電、給對時序、餵資料，它自己就亮。這點省了好多事。

### 主控晶片（MCU）

| 項目 | 規格 |
| --- | --- |
| 模組 | ESP32-S3-WROOM-1-**N16R8** |
| 核心 | Xtensa 32-bit LX7 雙核，最高 240 MHz |
| Flash | **16 MB** |
| PSRAM | **8 MB**（octal SPI） |
| 內部 SRAM | 512 KB |
| 無線 | Wi-Fi 2.4 GHz（802.11 b/g/n）、藍牙 5（LE），板載天線 |
| USB | 全速 (Full-Speed) USB，板載 Type-C |

> **PSRAM** 是晶片外接的一塊「大但慢」的記憶體。整屏畫面（framebuffer）就放在這 8MB 裡，由 DMA 不停往螢幕搬。**那塊 8MB PSRAM 就是存整屏畫面的地方。** PSRAM 配錯成 quad 是常見坑（詳見第七章）。

### 觸控

| 項目 | 規格 |
| --- | --- |
| 觸控 IC | **GT911** |
| 類型 | 電容式 |
| 支援點數 | 5 點觸控 |
| 介面 | I²C |
| I²C 地址 | **0x5D** |

> **GT911** 是一顆電容觸控控制器，負責把手指位置轉成數位座標，透過 I²C 上報。在本專案裡它和 RTC、CH422G 共用同一條 I²C（GPIO8/GPIO9），地址要規劃好。**本系列例子還沒接觸控**，是後續待辦。

### 供電與介面

| 項目 | 規格 |
| --- | --- |
| 供電 | Type-C 5V / DC 7–36V / 單節鋰電池 3.7V（MX1.25） |
| 功耗 | 5V / 450 mA（典型） |
| CAN | 相容 CAN 2.0（TJA1051，120Ω 終端電阻預設關閉） |
| RS485 | SP3485 收發器（120Ω 終端電阻預設關閉） |
| 工作溫度 | 0 °C ~ 65 °C |
| 尺寸 | 裸板 112.4 × 75.1 mm / 含外殼 116.3 × 79 mm |

---

## 二、板載資源映射（開發板自帶，不用接線）

> ⚠️ **這塊板是開發板，元件已經焊好，下面這些是板載資源映射，給你查腳位 / 配 SDK 用，不是讓你拿杜邦線去接線。** 你要做的只有：Type-C 插上電、USB 插上電腦刷韌體。

### 螢幕 RGB 介面腳位

> 以下對應官方文件，並經實機驅動核對。注意 GPIO0 是 strapping 腳（詳見第七章避坑清單）。

| ESP32-S3 GPIO | LCD 訊號 | 說明 |
| --- | --- | --- |
| GPIO0  | G3    | Green 資料 bit3 |
| GPIO1  | R3    | Red 資料 bit3 |
| GPIO2  | R4    | Red 資料 bit4 |
| GPIO3  | VSYNC | 垂直同步 |
| GPIO4  | TP_IRQ | 觸控中斷 |
| GPIO5  | DE    | 資料使能 |
| GPIO7  | PCLK  | 像素時脈（實測 16MHz 穩） |
| GPIO10 | B7    | Blue 資料 bit7 |
| GPIO14 | B3    | Blue 資料 bit3 |
| GPIO17 | B6    | Blue 資料 bit6 |
| GPIO18 | B5    | Blue 資料 bit5 |
| GPIO21 | G7    | Green 資料 bit7 |
| GPIO38 | B4    | Blue 資料 bit4 |
| GPIO39 | G2    | Green 資料 bit2 |
| GPIO40 | R7    | Red 資料 bit7 |
| GPIO41 | R6    | Red 資料 bit6 |
| GPIO42 | R5    | Red 資料 bit5 |
| GPIO45 | G4    | Green 資料 bit4 |
| GPIO46 | HSYNC | 水平同步 |
| GPIO47 | G6    | Green 資料 bit6 |
| GPIO48 | G5    | Green 資料 bit5 |

### 觸控 / RTC / 外部 I²C（共用匯流排）

| ESP32-S3 GPIO | 訊號 | 說明 |
| --- | --- | --- |
| GPIO8 | SDA / TP_SDA / RTC_SDA | I²C 資料（觸控 GT911、RTC PCF85063、外部 I²C 共用） |
| GPIO9 | SCL / TP_SCL / RTC_SCL | I²C 時脈（同上共用） |
| GPIO4 | TP_IRQ | 觸控中斷 |

### USB / SD / RS485 / CAN

| 功能 | ESP32-S3 GPIO | 說明 |
| --- | --- | --- |
| USB D- / D+ | GPIO19 / GPIO20 | 全速 USB |
| SD MOSI / SCK / MISO | GPIO11 / GPIO12 / GPIO13 | SD 卡（SPI） |
| SD CS | （CH422G EXIO4） | 低態，由 IO 擴展器控制，不在原生 SPI CS 上 |
| RS485 RXD / TXD | GPIO43 / GPIO44 | SP3485 |
| CAN TX / RX | GPIO15 / GPIO16 | TJA1051 |

### 一個繞不開的晶片：CH422G IO 擴展器

板上那塊背光、重置都掛在它身上的晶片就是 **CH422G**，走 I²C 操作。它的怪癖是：**沒有暫存器指標，直接把 I²C 地址當命令用**。

> **CH422G** 是一顆 I²C 介面的 IO 擴展器，負責把背光、螢幕重置、觸控重置、SD 卡片選這些零碎訊號統一管起來，在本專案裡你靠它點亮背光、重置螢幕。

| CH422G 腳位 | 功能 | 說明 |
| --- | --- | --- |
| EXIO0 | DI0  | 數位輸入 0 |
| EXIO1 | TP_RST | 觸控重置 |
| EXIO2 | DISP | 背光使能（只能開關，**不能調亮度**） |
| EXIO3 | LCD_RST | 螢幕重置 |
| EXIO4 | SD_CS | SD 卡片選（低態） |
| EXIO5 | DI1  | 數位輸入 1 |
| OD0   | DO0  | 數位輸出 0 |
| OD1   | DO1  | 數位輸出 1 |

---

## 三、需要安裝的：ESP-IDF 工具鏈 + 元件

這塊板**不需要裝庫**，但它用的是 **ESP-IDF**（樂鑫官方的開發框架）而不是 Arduino。原因：RGB 直驅 + PSRAM framebuffer + LVGL 這套組合，sdkconfig 裡幾十個開關（PCLK、PSRAM 模式、記憶體池）在 ESP-IDF 裡好控得多，Arduino 裡調參很彆扭。

**準備清單（建議照著核對，能省 80% 排錯時間）：**

- [ ] **ESP-IDF 5.3.x**（推薦）。用 5.2.7 也能跑，但要補一行巨集（見第七章）。
- [ ] **LVGL ^9.3**（`esp_lvgl_port` 2.8 依賴 9.3 新增的顏色常數）。
- [ ] **espressif/esp_lvgl_port 2.8**（幫你搞定 LVGL 的時脈、獨立任務、加鎖）。
- [ ] **Windows 使用者**：用 PowerShell + EIM profile，**別在 Git Bash 裡跑 `idf.py`**（它偵測到 `MSYSTEM` 就罷工）。

元件版本一定要同代配對：`esp_lvgl_port` 2.8 配 LVGL `^9.3`，配錯了編譯就報 `RGB565_SWAPPED undeclared`。

---

## 四、第一步：點亮螢幕（別直接套官方例程）

> 📦 **本章完整程式碼**：[01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld) —— 最樸素的方式，點亮螢幕、顯示一行 Hello World。

這是整件事最大的坑，也是我最想先說的。

**Waveshare 官方的 ESP-IDF 例程（比如 `08_lvgl_Porting`）和文件，基本都是按 800×480 來寫的。** 它的 `#else` 預設分支就是 800×480。官方文件更是把整個 5 吋系列籠統標成「800×480 或 1024×600」，**偏偏沒單獨標 5B 是多少**。

你如果二話不說把官方例程直接燒進 5B，會得到一個很迷惑的畫面：**螢幕一大片黑、右邊冒出一條白邊**（黑+白）。這不是壞了，是「用 800×480 的訊號去餵一塊 1024×600 的面板」——面板比訊號寬，多出來的右邊沒有訊號，就顯示成那樣。

加上 Waveshare 的命名習慣裡**「B 後綴常代表方屏」**（比如 4B 是 480×480 方屏），我一度懷疑 5B 是塊 720×720 的方屏、還得先走 SPI 初始化。折騰一圈才確認：**5B 就是 1024×600，ST7262 驅動 IC，純 RGB 直驅，不用發任何 SPI 初始化命令。** 這點很重要，省了好多事。

所以第一步永遠是：**別信官方例程的解析度，自己確認清楚你手上這塊到底是多少。**

確認的笨辦法就是上面那個——拿 800×480 去餵，右邊出白邊，反證出它是 1024×600（面板比訊號寬才會這樣）。

### 4.1 開機流程（6 步骨架）

搞清脾氣後開始點亮。開機流程其實就 6 步：**I²C 起來 → CH422G 重置螢幕 → 建 RGB 面板 → 畫畫面 → 開背光 → CPU 閒著，靠 DMA 自刷新**。

其中「畫好畫面再最後開背光」很關鍵——避免開機那一 frame 花屏。落在程式碼裡，點亮的順序是固定的：

```c
/* 第一步：先把 I²C 匯流排拉起來（GPIO8/9，和觸控 GT911、RTC 共用一條）。*/
i2c_master_bus_handle_t i2c_bus = NULL;
i2c_master_bus_config_t bus_cfg = {
    .sda_io_num = 8, .scl_io_num = 9, .clk_source = I2C_CLK_SRC_DEFAULT,
    .flags.enable_internal_pullup = true,
};
i2c_new_master_bus(&bus_cfg, &i2c_bus);

/* 第二步：驅動 CH422G——先重置、再放開（這一步背光仍關著）。*/
ch422g_handle_t io = {0};
ch422g_init(&io, i2c_bus);
ch422g_set_outputs(&io, 0);                              /* EXIO 全拉低：重置 + 背光關 */
vTaskDelay(pdMS_TO_TICKS(10));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST); /* 放開重置，背光仍關 */
vTaskDelay(pdMS_TO_TICKS(120));                          /* 等面板起來 */

/* 第三步：建 RGB 面板、把畫面畫進 PSRAM framebuffer（見下一段）……*/

/* 第四步：畫面備好，最後一步才點亮背光——把 EXIO2 寫高。*/
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

> **順序鐵律：背光永遠最後開。** 重置時 EXIO 全拉低（背光關），重置放開後再畫畫面，畫面備好才把 EXIO2 寫高。反過來先亮背光再畫，會看到開機一 frame 花屏。

### 4.2 背光怎麼「寫高就亮」：CH422G 最小驅動

背光的「寫高就亮」，落到程式碼裡就兩件事：寫一個 CH422G 的驅動，再在開機流程裡按對的順序呼叫它。驅動核心就一點——**地址即暫存器**，往 `0x24` 寫模式、往 `0x38` 寫一個 byte（這個 byte 就是 8 路輸出的電平）。最小驅動長這樣（完整版見倉庫 `main/ch422g.c`）：

```c
/* CH422G「暫存器」= I²C 7-bit 裝置地址本身（沒有單獨的暫存器 byte）。*/
#define CH422G_REG_MODE  0x24   /* 寫 0x01 -> EXIO0..7 推挽輸出 */
#define CH422G_REG_OUT   0x38   /* 寫一個 byte -> EXIO0..7 的電平 */

/* EXIO 輸出位：bit n = EXIO_n 的電平（1 = 高）。*/
#define CH422G_TP_RST   (1u << 1)   /* EXIO1 觸控重置 */
#define CH422G_BL       (1u << 2)   /* EXIO2 背光使能 */
#define CH422G_LCD_RST  (1u << 3)   /* EXIO3 螢幕重置 */

/* 兩個「地址即暫存器」各建一個 I²C 裝置 handle。*/
esp_err_t ch422g_init(ch422g_handle_t *ch, i2c_master_bus_handle_t bus) {
    i2c_device_config_t mode_cfg = { .device_address = CH422G_REG_MODE, .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &mode_cfg, &ch->dev_mode);
    i2c_device_config_t out_cfg  = { .device_address = CH422G_REG_OUT,  .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &out_cfg,  &ch->dev_out);

    uint8_t mode = 0x01;                              /* 推挽輸出模式 */
    i2c_master_transmit(ch->dev_mode, &mode, 1, -1);
    uint8_t zero = 0;
    i2c_master_transmit(ch->dev_out,  &zero, 1, -1);  /* 起始全清零 */
    return ESP_OK;
}

/* 一個 byte 就是 8 路輸出電平——這就是「把地址當命令用」。*/
esp_err_t ch422g_set_outputs(ch422g_handle_t *ch, uint8_t exio_mask) {
    return i2c_master_transmit(ch->dev_out, &exio_mask, 1, -1);
}
```

### 4.3 建 RGB 面板（本章核心）

建面板這段是整章的核心，後面三個坑會逐個解釋每行為什麼這麼填：

```c
#define LCD_H_RES        1024
#define LCD_V_RES        600
#define LCD_PIXEL_CLK_HZ (16 * 1000 * 1000)   /* ← 坑 1：16MHz，不是板卡定義的 21MHz */

/* RGB565 裡綠是 6 位 (0..63)、紅藍 5 位 (0..31)，純白要寫 31,63,31（← 坑 2）。*/
#define RGB565(r, g, b)   ((((r) & 0x1F) << 11) | (((g) & 0x3F) << 5) | ((b) & 0x1F))
#define COLOR_BG          RGB565(2, 8, 20)     /* 深藍底 */
#define COLOR_FG          RGB565(31, 63, 31)   /* 真·白 */

esp_lcd_rgb_panel_config_t panel_cfg = {
    .data_width = 16,                          /* RGB565 = 16 位元 */
    .bounce_buffer_size_px = 10 * LCD_H_RES,   /* SRAM bounce：防 16MHz 下供不上白屏 */
    .disp_gpio_num = -1,                       /* 背光在 CH422G 上，不是 GPIO */
    .pclk_gpio_num  = 7, .vsync_gpio_num = 3, .hsync_gpio_num = 46, .de_gpio_num = 5,
    .data_gpio_nums = {
        14, 38, 18, 17, 10,        /* B3..B7 */
        39,  0, 45, 48, 47, 21,    /* G2..G7 */
         1,  2, 42, 41, 40,        /* R3..R7 */
    },
    .timings = {
        .pclk_hz = LCD_PIXEL_CLK_HZ,           /* ← 坑 1 */
        .h_res = LCD_H_RES, .v_res = LCD_V_RES,
        .hsync_pulse_width = 30, .hsync_back_porch = 40, .hsync_front_porch = 220,
        .vsync_pulse_width = 4,  .vsync_back_porch  = 8,  .vsync_front_porch = 4,
        .flags.pclk_active_neg = true,
    },
    .flags.fb_in_psram = true,                 /* 整屏 ~1.17MB framebuffer 放 PSRAM */
};
esp_lcd_new_rgb_panel(&panel_cfg, &panel);
esp_lcd_panel_init(panel);                     /* ← 坑 3：建完面板補這一行 */
```

面板建好後，拿到 framebuffer 就能直接往上寫像素——ESP-IDF 的 RGB 面板不提供 `draw_bitmap` 之外的繪圖原語，所以 helloworld 裡自帶了 `lcd_fill` / `lcd_draw_text` 兩個小工具（點陣字庫，見倉庫 `lcd_draw.c`）：

```c
/* 拿到 PSRAM 裡的 framebuffer，畫 Hello World。*/
void *fb = NULL;
esp_lcd_rgb_panel_get_frame_buffer(panel, 1, &fb);
lcd_draw_init((uint16_t *)fb, LCD_H_RES, LCD_V_RES);
lcd_fill(COLOR_BG);
lcd_draw_text((LCD_H_RES - tw) / 2, (LCD_V_RES - th) / 2, "Hello World!", 5, COLOR_FG);

/* 畫面備好，最後開背光。之後 DMA 自己從 PSRAM 刷屏，CPU 閒著。*/
vTaskDelay(pdMS_TO_TICKS(60));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

### 4.4 三個讓我實際栽過的坑

**坑 1：PCLK 抄高了，整屏全白。** 把官方 Arduino 板卡定義抄過來時，像素時脈（PCLK）填的是 21MHz，結果螢幕**一片慘白**（不是黑屏）。真相是：畫面放在 PSRAM 裡，要被 DMA 連續讀出來送給螢幕。21MHz × 16 位元 ≈ 每秒 336M 位的頻寬，對「PSRAM → DMA → 螢幕」這條路來說**太撐了**，一旦供不上，螢幕收不到有效同步訊號，乾脆顯示「無訊號」的白底。**降到 16MHz，穩了。**

**坑 2：白字變粉紅，差點去重排腳位。** 點亮後白字顯示成了粉紅色，第一反應是綠色腳位排反了——錯。真正原因是 **RGB565 裡綠是 6 位（0–63），紅藍才 5 位（0–31）**。`RGB565(31, 31, 31)` 裡綠色的 31 在 0–63 只有不到一半，紅藍滿、綠一半，混出來就是粉。改成 `RGB565(31, 63, 31)` 才是真白。偏色分兩種：**白變青 = 腳位順序問題**；**白變粉 = 數值填錯**。

**坑 3：漏了一行初始化。** 正典流程是「建面板 → 重置 → 初始化 → 開顯示」，我一開始只調了建面板那一步。多數情況建完會自動開始掃描，但補一行 `esp_lcd_panel_init()` 能排除「DMA 沒啟動」的隱患——少了它可能時而亮時而不亮。

### 4.5 一招最值錢的：先看「怎麼個不亮法」

面對「點不亮」，最有用的一招是**先看螢幕到底是怎麼個不亮法**：

- **完全沒背光** → CH422G / 重置序列的事
- **背光亮但全白/全灰** → RGB 訊號沒給對（最常見，查 PCLK 和時序）
- **背光亮但花屏/抖動** → 訊號有了，時序參數差點意思
- **背光亮但顏色錯（白變青）** → RGB 通道順序排錯了

就這一個觀察，能把問題劈成兩半，省掉一堆瞎猜。

---

## 五、第二步：接上 LVGL，做指標動畫

> 📦 **本章完整程式碼**：[02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer) —— 接上 LVGL，做一個帶指標動畫的半圓速度表。

點亮之後想做個會動的介面，上了 **LVGL**（嵌入式上很流行的圖形庫）。接法是官方推薦的 `espressif/esp_lvgl_port` 元件，它幫你搞定 LVGL 的時脈、獨立任務、加鎖，把畫好的畫面刷到螢幕上。

> **LVGL** 是一個開源的嵌入式圖形庫，負責把按鈕、進度條、動畫這些 UI 元素畫出來，在本專案裡你靠它做速度表和儀表板，而不是自己一行行寫繪圖程式碼。

接法本身不長，核心就是建好 RGB 面板（speedometer 例子裡比 helloworld 多了一行 `.num_fbs = 2`，這就是後面防撕裂的雙 framebuffer），再交給 `esp_lvgl_port`：

```c
const lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
lvgl_port_init(&lvgl_cfg);

const lvgl_port_display_cfg_t disp_cfg = {
    .panel_handle  = panel,
    .buffer_size   = LCD_H_RES * LCD_V_RES, /* 全屏：direct mode 的硬要求 */
    .hres          = LCD_H_RES, .vres = LCD_V_RES,
    .color_format  = LV_COLOR_FORMAT_RGB565,
    .flags = {
        .direct_mode = true,   /* 直接畫進面板的 framebuffer，省一次拷貝 */
        .buff_dma    = false,
        .buff_spiram = true,   /* 繪圖緩衝區放 PSRAM（← 坑 1：得先開 SPIRAM_USE_MALLOC）*/
        .swap_bytes  = false,  /* 並列 RGB 面板，不做 byte order 交換 */
    },
};
const lvgl_port_display_rgb_cfg_t rgb_cfg = {
    .flags = {
        .bb_mode       = true,  /* 用了 bounce buffer → 走 on_bounce_frame_finish 同步 */
        .avoid_tearing = true,  /* frame 邊界切 fb → 防撕裂（見本章末）*/
    },
};
lvgl_port_add_disp_rgb(&disp_cfg, &rgb_cfg);

/* 任何 lv_* 呼叫都得先拿這把鎖，免得和 esp_lvgl_port 的渲染任務撞車。*/
lvgl_port_lock(0);
dashboard_create();   /* 建速度表 + 啟動指標動畫 */
lvgl_port_unlock();
```

三個 flag 是這段的精髓：`direct_mode` 讓 LVGL 直接畫進面板 framebuffer（少一次整屏拷貝）；`avoid_tearing` 讓兩塊 fb 在 frame 邊界切換（防撕裂）；`buff_spiram` 把繪圖緩衝區挪進 PSRAM——這個看著無害，恰恰引出了下面最大的坑。

### 5.1 坑 1（最隱蔽）：白屏 + 看門狗重開

接好燒進去，螢幕先是黑兩秒，然後**全白**，再不動了。這症狀跟前面 PCLK 太高導致的白屏**一模一樣**，我差點又一頭扎進去調時序。

**幸虧這次先打開串口看開機 log**，一眼看到關鍵一行：

```
E task_wdt: CPU 0: taskLVGL
```

LVGL 的任務觸發了看門狗，被系統判定卡死。**這是軟體卡住，不是訊號問題。** 順著呼叫堆疊查，發現 LVGL 第一次畫整屏時要臨時申請一塊 MB 級的繪圖緩衝區，可 LVGL 預設用的是它**自己內建的小記憶體池，只有 64KB**——1MB 塞不進 64KB，於是反覆折騰，畫不完，任務卡死，看門狗發火。

有意思的是：我明明把顯示緩衝區設在了 PSRAM，怎麼還說記憶體不夠？因為**顯示緩衝區**（給「刷屏」用）和 **LVGL 內部繪圖用的記憶體池**（給「算畫面」用）是兩碼事，別混。解法就兩個開關：

```
CONFIG_LV_USE_CLIB_MALLOC=y    # LVGL 改用系統的 malloc，不用那 64KB 小池子
CONFIG_SPIRAM_USE_MALLOC=y     # 讓系統 malloc 能去 PSRAM 拿大塊記憶體
```

> **這裡還有個更要命的認知：同樣是「白屏」，至少有兩種完全不同的成因。** 一種是 RGB 訊號/頻寬問題（前面 PCLK 那個），一種是軟體卡死沒畫到畫面（這個）。**永遠先看串口 log 分辨**，別看到白屏就調時序。

### 5.2 坑 2、3：元件版本與 IDF 巨集對不上

- **坑 2（元件版本要配對）**：`esp_lvgl_port` 2.8 內部用到了 LVGL 9.3 才新增的顏色常數。把 LVGL 版本釘成 `~9.2` 會報 `RGB565_SWAPPED undeclared`，改成 `^9.3` 就好。
- **坑 3（IDF 巨集對不上）**：新版 `esp_lvgl_port` 檢查 `SOC_LCDCAM_RGB_LCD_SUPPORTED` 這個巨集，但它 **IDF 5.3 才改名**，5.2.7 裡還是舊名，執行時報 "This target does not support RGB"。解法是在頂層 CMakeLists 的 `project()` 之前補一行 `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)`。

### 5.3 「不順滑」和「畫面撕裂」，都不是算得慢

速度表跑起來後兩個新問題：指標動得**不夠順**，還會**撕裂**（畫面中間一道錯位的橫線）。這倆**都跟「算得快不快」沒關係**。

**先說不順。** 這塊螢幕的物理更新率我先算了：PCLK 16MHz ÷ 一 frame 總像素數 ≈ **20Hz**。也就是說這塊螢幕一秒最多只能重畫 20 次畫面，軟體再快也沒用，是硬天花板。所以「順不順」不是更新率問題，是**動畫曲線**問題。指標勻速掃到頭、瞬間反向，特別生硬；換成 `ease-in-out`（兩端減速、中間加速），轉折就自然了。

```c
/* 270° 速度表：ROUND_INNER 模式，從 135° 起轉，底部留 90° 缺口。*/
lv_obj_t *scale = lv_scale_create(scr);
lv_obj_set_size(scale, 460, 460);
lv_scale_set_mode(scale, LV_SCALE_MODE_ROUND_INNER);
lv_scale_set_range(scale, 0, 120);
lv_scale_set_angle_range(scale, 270);
lv_scale_set_rotation(scale, 135);          /* 起始角度，決定缺口朝向 */
lv_scale_set_total_tick_count(scale, 25);   /* 每 5 km/h 一格 */
lv_scale_set_major_tick_every(scale, 4);    /* 每 4 格一個主刻度 → 0,20,...,120 */

/* 動畫每一 frame 被呼叫：把指標指到 v。數字讀數只在整數變化時才刷新。*/
static void gauge_set_value(void *var, int32_t v) {
    gauge_ctx_t *g = (gauge_ctx_t *)var;
    lv_scale_set_line_needle_value(g->scale, g->needle, 150, v);  /* 指標，150px 長 */
    int vi = (int)v;
    if (vi != g->last_int) {                 /* 整數沒變就不動 label，省掉重畫 */
        g->last_int = vi;
        lv_snprintf(s_value_buf, sizeof(s_value_buf), "%03d", vi);
        lv_label_set_text(g->value_label, s_value_buf);
    }
}

/* 0 → 120 → 0，無限循環。順不順，關鍵就在最後一行。*/
lv_anim_t a;
lv_anim_init(&a);
lv_anim_set_var(&a, &s_ctx);
lv_anim_set_exec_cb(&a, gauge_set_value);
lv_anim_set_values(&a, 0, 120);
lv_anim_set_duration(&a, 2500);                       /* 單程 2.5s */
lv_anim_set_playback_duration(&a, 2500);              /* 回程：0→120→0 */
lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out);    /* ← 兩端減速，轉折才不生硬 */
lv_anim_set_repeat_count(&a, LV_ANIM_REPEAT_INFINITE);
lv_anim_start(&a);
```

關鍵就是 `lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out)` 這一行。`playback_duration` 讓動畫到 120 自動折返回 0，折返瞬間速度本來會硬生生反向；`ease-in-out` 讓它先減速到 0 再反向加速，肉眼幾乎看不出轉向。

**再說撕裂。** 原因是只準備了一塊畫面緩衝區，DMA 在不停往外搬，LVGL 同時往裡寫新的，沒同步，就搬出「半新半舊」的一 frame。解法是**雙緩衝 + 垂直同步切換**：兩塊畫面，DMA 永遠只搬完整的那塊。**注意：我們這塊螢幕必須保留一個叫 bounce buffer 的小緩衝區**（防 16MHz 下供不上白屏），所以是「雙緩衝 + bounce 一起用」，不能照官方例程把 bounce 關掉。

> 在這塊螢幕上，**「順」靠緩動曲線，「不撕裂」靠雙緩衝**，都跟算得快不快無關。

---

## 六、第三步：做成一塊車輛遙測儀表板

> 📦 **本章完整程式碼**：[03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry) —— 改成一個有設計感的五卡片車輛遙測面板。

最後把速度表換成了一個像模像樣的**車輛遙測面板**：轉速、油門、水溫、車速、電壓五個資料，每張卡片有大數字、進度條、最低最高刻度，數值過載了還會變紅。資料是隨機模擬的，但動作要自然。

### 6.1 卡片怎麼搭出來

每張卡片就是個**去掉了預設樣式的 `lv_obj` 容器**，裡面塞標籤、單位、大數字、進度條、min/max 刻度。座標全部直接寫死，靠 1px 邊框 + 純色分層（不用陰影）。核心長這樣（完整版見 `lvgl_dashboard.c` 的 `make_card`）：

```c
static void make_card(lv_obj_t *parent, int i) {
    const metric_cfg_t *c = &CFG[i];      /* 幾何/範圍/危險閾值/顏色都在配置表裡 */
    metric_t *m = &s_m[i];
    m->accent = lv_color_hex(c->accent_hex);

    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_remove_style_all(card);                       /* 清掉預設樣式，全部自己設 */
    lv_obj_set_pos(card, c->x, c->y);                    /* 座標寫死，不用 flex 自動排版 */
    lv_obj_set_size(card, c->w, c->h);
    lv_obj_set_style_bg_color(card, COL_CARD, 0);
    lv_obj_set_style_radius(card, 18, 0);
    lv_obj_set_style_border_color(card, COL_BORDER, 0);  /* 1px 邊框分層，不加陰影 */
    lv_obj_set_style_border_width(card, 1, 0);

    lv_obj_t *lab = lv_label_create(card);
    lv_label_set_text(lab, c->label);
    lv_obj_align(lab, LV_ALIGN_TOP_LEFT, 0, 0);          /* 標籤左上；單位右上同理 */

    lv_obj_t *val = lv_label_create(card);
    lv_obj_set_style_text_font(val, &lv_font_montserrat_48, 0);  /* 大數字 */
    lv_obj_align(val, LV_ALIGN_TOP_LEFT, 0, c->value_y);
    m->value = val;

    /* 進度條：trough 和 indicator 兩部分分別設色，危險時把 indicator 改紅。*/
    lv_obj_t *bar = lv_bar_create(card);
    lv_obj_remove_style_all(bar);
    lv_bar_set_range(bar, c->min, c->max);
    lv_obj_set_size(bar, c->w - 2 * c->pad, c->big ? 14 : 10);
    lv_obj_align(bar, LV_ALIGN_BOTTOM_LEFT, 0, -24);
    lv_obj_set_style_bg_color(bar, COL_BAR_BG, 0);                /* trough */
    lv_obj_set_style_bg_color(bar, m->accent, LV_PART_INDICATOR); /* indicator */
    m->bar = bar;
}
```

### 6.2 想讓數字「活」起來：緩動逼近，不是勻速

最直覺的做法是「隨機給個新值，讓顯示勻速追過去」。但勻速追，到目標瞬間速度歸零，看著很機械。我用的是**緩動逼近**：每個資料記當前顯示值 `current` 和目標 `target`，每次刷新追近差距的 1/6（指數衰減，越靠近越慢）。每隔約 1.2 秒再從當前值附近隨機遊走出一個新目標，不是滿量程亂跳，這樣像真車資料：

```c
/* 每 30 次（~1.2s）換一次目標：從當前值附近遊走，幅度 = 量程的 1/3。*/
if (tick % 30 == 0) {
    int span = (m->max - m->min) / 3;
    m->target = clampi(m->current + rnd_range(-span, span), m->min, m->max);
}
/* 緩動逼近：追近差距的 1/6；差太小就直接吸過去，免得永遠差一丟丟。*/
int diff = m->target - m->current;
if (diff > -6 && diff < 6) m->current = m->target;
else                       m->current += diff / 6;   /* ← 就是這句指數衰減 */

/* 進度條每 frame 都更新（它是「活的」視覺）。危險時 indicator 變紅。*/
bool danger = in_danger(m);   /* RPM≥6800 / 水溫≥105 / 電壓≤10.8 或 ≥14.6 */
lv_bar_set_value(m->bar, m->current, LV_ANIM_OFF);
lv_obj_set_style_bg_color(m->bar, danger ? COL_DANGER : m->accent, LV_PART_INDICATOR);
```

跟指標的 `ease-in-out` 一個道理——都是在轉折處減速。`danger` 判斷讓進度條在過載時變紅，就是面板上「過載變紅」那個效果的來歷。

### 6.3 順手的小優化：沒變就別重畫

每 40 毫秒刷新一次，但經常連續兩次算出來是同一個整數（尤其快到目標時基本停住）。每次調 `lv_label_set_text` 都要複製字串、標記重畫，全是白工。所以加一句：**只有顯示的文字真的變了才更新**：

```c
/* 數字讀數：格式化出來的字串真變了，才 set_text。*/
char buf[12];
fmt_scaled(m->current, m->scale, buf, sizeof(buf));
if (strcmp(buf, m->last_text) != 0) {
    strcpy(m->last_text, buf);             /* 記下來，下次拿來比 */
    lv_label_set_text(m->value, buf);      /* strdup + 標記重畫，只在真變化時發生 */
}
lv_obj_set_style_text_color(m->value, danger ? COL_DANGER : COL_VALUE, 0);
```

### 6.4 嵌入式 UI 的一點取捨

固定解析度的小螢幕上，**座標直接寫死**比用 flex 自動排版更省心、更可預測；卡片**不加陰影**（LVGL 的陰影在 20Hz 更新下有點貴），靠邊框和純色就夠分層；電壓的一位小數用「存 142 代表 14.2」的整數縮放，省掉一堆浮點運算。整數縮放的做法是把每個指標的幾何/範圍/危險閾值/顏色/scale 全塞進一張配置表：

```c
/* 配置表，每行一個指標。座標/範圍/危險閾值/顏色/scale 全在表裡，方便統一調。*/
static const metric_cfg_t CFG[] = {
    /* label      unit    x   y    w   h  pad v_y  min  max  dHi  dLo init accent   sc big */
    { "ENGINE",  "RPM",  24, 84, 478,242, 28, 78,    0,8000,6800,  0, 850,0xFF5A3C, 1, 1 },
    { "BATTERY", "V",   688,346, 312,230, 24, 64,  100, 150, 146,108, 124,0xB08CFF,10, 0 },
    /*                                                                  ↑ scale=10：124 代表 12.4V */
    /* ...其餘三行同理 */
};

/* 顯示時再除回去：124 → "12.4"。全程整數，沒有浮點運算。*/
static void fmt_scaled(int32_t v, int32_t scale, char *buf, size_t n) {
    if (scale == 10) lv_snprintf(buf, n, "%d.%d", (int)(v / 10), (int)(v % 10));
    else             lv_snprintf(buf, n, "%d", (int)v);
}
```

`scale=10` 的存 x10、`scale=1` 的存原值，緩動、危險判斷、進度條全跑在這套整數上，只有最後格式化成字串那一瞬間才「翻譯」回帶小數的樣子。

---

## 七、常見問題排查（別慌，問題就這幾類）

> 別慌，90% 的問題出在這幾個地方。遇到怪現象**先看串口 log、先算物理參數**，別急著改程式碼。

**關於這塊螢幕**

- 官方例程/文件預設 800×480，**直接套到 5B 會黑底 + 右邊白條**。5B 是 **1024×600、ST7262、純 RGB 直驅**，不用 SPI 初始化。
- 背光走 **CH422G** 的 EXIO2，不是普通 GPIO，也不是 PWM（**只能開關，不能調亮度**）。
- 觸控晶片 GT911（I²C 地址 0x5D）和 RTC、CH422G 共用一條 I²C，注意地址規劃；本系列例子**還沒接觸控**，是後續待辦。

**建構環境（Windows）**

- **別在 Git Bash 裡跑 `idf.py`**，它偵測到 `MSYSTEM` 就罷工。用 PowerShell + EIM profile，呼叫前 `unset MSYSTEM`（或 `$env:MSYSTEM=$null`）。
- 串口被佔用報 "port is busy"，多半是上次的 monitor 沒殺乾淨，確認無殘留再 flash。
- 改了 `sdkconfig.defaults` 不生效？IDF 不會自動把 defaults 重新併進已存在的 `sdkconfig`，**刪掉 sdkconfig 讓它從 defaults 重生**。

**點亮螢幕**

- **PCLK 別抄板卡定義的 21MHz，用 PSRAM framebuffer 時從 16MHz 起步**，還白就降到 12MHz 試。
- PSRAM 別配錯：N16R8 是 **octal**（`SPIRAM_MODE_OCT`），不是 quad。
- 建完面板**別忘了補一行 `esp_lcd_panel_init()`**。
- 注意 GPIO0 是 strapping 腳（開機瞬間需為高），開機後當 RGB 資料腳用沒問題，但別在它上面接會拉低開機的電路。
- 顏色偏色先分清兩種：**白變青 = 腳位順序**；**白變粉 = RGB565 綠通道填值**（綠是 6 位 0–63，純白要寫 `31,63,31`）。

**跑 LVGL**

- **幾乎一定要開 `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`**，否則 LVGL 那個 64KB 內建記憶體池裝不下整屏繪圖，表現就是白屏 + 看門狗重開。
- 元件版本要同代：`esp_lvgl_port` 2.8 配 LVGL `^9.3`。
- IDF 5.2 配新版元件，頂層 CMakeLists 補 `SOC_LCDCAM_RGB_LCD_SUPPORTED=1`。
- **LVGL / esp_lvgl_port 跨版本會改 API 名**，別憑記憶寫，去讀抓下來的實際 header。

**順滑與撕裂**

- 先算面板物理更新率（這塊約 20Hz），低於它的優化大多是動畫設計問題。
- 不順首選 `ease-in-out`，別急著堆更新率。
- 撕裂 = 單緩衝 + 無同步，解法是雙 framebuffer + `avoid_tearing`，**且保留 bounce buffer**。

---

## 八、FAQ

**Q：Waveshare ESP32-S3-Touch-LCD-5B 解析度到底是多少？800×480 還是 1024×600？**
A：5B 是 **1024×600**。Waveshare 官方文件把整個 5 吋系列籠統標成「800×480 或 1024×600」，沒單獨標 5B。驗證方法：用 800×480 訊號燒進去，螢幕會黑底 + 右邊一條白邊，說明面板比訊號寬，就是 1024×600。別直接套官方例程的 800×480。

**Q：螢幕一片全白是怎麼回事？**
A：先看串口 log 分兩種白屏。① 沒有 watchdog 報錯 → 多半是 RGB 訊號沒供上，PCLK 抄了 21MHz 太高，降到 16MHz。② 串口有 `task_wdt: taskLVGL` → 是 LVGL 記憶體池太小導致卡死，開 `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`。

**Q：背光能不能調亮度？為什麼找不到 PWM 腳位？**
A：不能。背光掛在 CH422G IO 擴展器的 EXIO2 上，只有開/關兩態，不是 PWM。想調亮度得硬體改板（加可調升降壓），軟體層面做不到。

**Q：這塊螢幕更新率多少？為什麼指標動起來卡？**
A：約 **20Hz**（PCLK 16MHz ÷ 一 frame 總像素數）。這是物理天花板，軟體再快也突破不了。卡頓多半不是更新率問題，是動畫曲線太硬——把指標動畫從線性換成 `ease-in-out`，轉折處自然減速，立刻順滑。

**Q：能在 Arduino IDE 裡點亮嗎？為什麼用 ESP-IDF？**
A：理論上能（Arduino-ESP32 底層也是 ESP-IDF），但 RGB 直驅 + PSRAM framebuffer + LVGL 這套組合，在 Arduino 裡調 sdkconfig 很彆扭，PCLK、PSRAM 模式、記憶體池這些開關 ESP-IDF 裡好控得多。本教學基於 ESP-IDF。

**Q：LVGL 燒進去白屏 + 看門狗重開，怎麼辦？**
A：八成是 LVGL 內建的 64KB 記憶體池裝不下整屏繪圖。在 sdkconfig 裡開兩個：`CONFIG_LV_USE_CLIB_MALLOC=y`（LVGL 改用系統 malloc）和 `CONFIG_SPIRAM_USE_MALLOC=y`（讓 malloc 能去 PSRAM 拿大塊）。ESP32-S3 + PSRAM + 大螢幕幾乎必開。

**Q：PSRAM 配 quad 還是 octal？配錯了會怎樣？**
A：N16R8 是 **octal**（`SPIRAM_MODE_OCT`）。配成 quad 會頻寬不夠，表現就是 PCLK 稍高就花屏/白屏，或執行不穩定。

**Q：IDF 5.2.7 報 "This target does not support RGB" 怎麼辦？**
A：新版 esp_lvgl_port 檢查 `SOC_LCDCAM_RGB_LCD_SUPPORTED` 這個巨集，它 IDF 5.3 才改名，5.2.7 裡還是舊名。在頂層 CMakeLists 的 `project()` 之前補一行 `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)`。

---

## 九、延伸玩法

點亮只是起點，這塊板還能往下玩很多：

- **接觸控**：GT911 已經在 I²C 上（GPIO8/9），加個驅動就能做按鈕互動。
- **從 SD 卡讀資源**：板載 SD 卡槽（SPI），可以載入圖片、字型，告別把資源全塞進 Flash。
- **接 CAN 匯流排**：板載 TJA1051，配合 ESP-IDF 的 TWAI 驅動，做一個真正的 OBD 車況儀，儀表板的數就不再是模擬值了。
- **上 RS485**：SP3485 收發器接工業感測器/Modbus 設備。
- **加 RTC 掉電走時**：PCF85063 也在那條 I²C 上，做個帶真實時間戳的資料記錄器。

---

## 十、參考資料

**官方資料手冊與產品頁**

- [ESP32-S3 Datasheet（樂鑫官方）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP32-S3-WROOM-1 模組 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)
- [ESP32-S3 產品頁](https://www.espressif.com/en/products/socs/esp32-s3)
- [Waveshare ESP32-S3-Touch-LCD-5B Wiki](https://docs.waveshare.net/ESP32-S3-Touch-LCD-5/?variant=ESP32-S3-LCD-5B-touch)

**開源庫與框架**

- [ESP-IDF 官方文件](https://docs.espressif.com/projects/esp-idf/)（RGB LCD Panel、PSRAM 配置、I²C Master 驅動）
- [espressif/esp_lvgl_port（GitHub）](https://github.com/espressif/esp_lvgl_port)
- [LVGL 官方文件](https://docs.lvgl.io/)（scale 控件、anim 動畫、bar 進度條）

**本專案程式碼**

- 完整程式碼、每個坑的重現過程和最終配置，都放在 GitHub，每個例子目錄下有完整的 docs：
  - [本專案完整目錄（含三個例子）](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)
  - [01 HelloWorld —— 點亮螢幕](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
  - [02 Speedometer —— 速度表](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
  - [03 VehicleTelemetry —— 車輛遙測儀表板](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

---

## 寫在最後

回頭看，整條路其實是三層：**點亮螢幕 → 接上 LVGL → 做成介面**。每一層都有它專屬的坑，但坑之間往往長得很像（兩種白屏、兩種偏色），最容易讓人白忙的就是認錯坑。

如果只讓我留一句話給後來人，大概是這句——我在這三個例子裡反覆栽跟頭後才真正學會的：

> **遇到怪現象先看串口 log、先算物理參數，別急著改程式碼。** 官方例程的解析度坑、PCLK 的白屏、LVGL 記憶體的白屏，看起來都像「螢幕壞了」，但一個是文件不對、一個是硬體頻寬、一個是軟體卡死，方向反了就一通宵白熬。
