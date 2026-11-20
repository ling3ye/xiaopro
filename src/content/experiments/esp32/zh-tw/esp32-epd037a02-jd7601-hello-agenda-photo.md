---
title: "ESP32-S3 驅動 EPD037A02（JD7601）六色電子紙：Hello、英文課表、預先轉換照片的單次三螢幕演示（SPI + Arduino）"
boardId: esp32s3
moduleId: display/epd-3inch7-epd037a02-jd7601
category: esp32
date: 2026-11-20
intro: "用 ESP32-S3 和 Adafruit GFX 驅動 EPD037A02 六色電子紙，包含 SPI 接線、Arduino 設定，以及 Hello、英文課表、預先轉換照片的單次三螢幕完整程式碼。適合有 Arduino 上傳經驗、想學習六色電子紙驅動與照片轉換的讀者。"
image: "https://img.lingflux.com/2026/11/ff03861dd789ec83465baba962075e98.jpg"
---

難度：⭐⭐（有 Arduino 上傳經驗即可）<br>
耗時：第一次做，接線、安裝程式庫、上傳大約 30 分鐘（估計值，沒有計時）。三螢幕播完約 1～1.5 分鐘（每螢幕全刷 15～25 秒，加兩次 3 秒停留）。<br>
測試環境：Arduino IDE 2.3.8；esp32 Arduino Core 3.3.10；Adafruit GFX Library 1.13.0

> **一句話摘要**：用 ESP32-S3、SPI 和 Adafruit GFX 驅動 EPD037A02 六色電子紙，依序顯示 Hello、英文課表和照片。

## 快速上手

- 從 [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601) 下載 `EPD_3in7_Showcase_JD7601` 整個資料夾（它在 LingShunLAB 儲存庫的 `Handbook/Arduino/ESP32-S3/` 下，可複製或下載整個儲存庫的 ZIP）。主 `.ino`、驅動 `.h/.cpp` 和 `photo_data.h` 必須放在這個資料夾裡，且資料夾名稱要和主 `.ino` 的檔案名稱一致。
- 接線：BUSY、RST、DC、CS、MOSI、SCK 分別接 GPIO7、8、9、10、11、12；VDD 接 3.3 V，GND 與開發板共地。
- 安裝 esp32 Arduino Core 3.3.10、Adafruit GFX Library 1.13.0，以及它依賴的 Adafruit BusIO 1.17.4。
- 開發板選 `ESP32S3 Dev Module`，編譯上傳，再開啟 115200 的序列埠監控視窗。
- `HOLD_MS` 預設 3000 ms，是每螢幕刷新結束後多等的時間，不是換螢幕的間隔。

## 前言

我想用 ESP32-S3 做一張電子紙演示卡：先顯示 Hello，再顯示一張英文課表，最後停在一張照片上。

手上的 OSPTEK EPD037A02 是 480×720 的六色 SPI 螢幕。GxEPD2 裡沒有這塊螢幕的驅動，所以我自己寫了面板驅動，只負責 JD7601 的 SPI 時序和訊框格式。文字和圖形交給 Adafruit GFX。本文提供接線、程式庫設定和三螢幕的完整程式碼。

## 最終效果

程式按 Hello → 英文課表 → 照片的順序播放一次。前兩螢幕刷新結束後各停 3000 ms，最後停在照片上，`loop()` 裡不再刷螢幕。

![](https://img.lingflux.com/2026/11/dc08d160b6bc55bc5a237bcadf4abc9f.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/kzJw5SoUn40?si=yWxWSi7nY-pc4jXh" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>



## 元件說明
### EPD037A02 六色電子紙

EPD037A02 是 OSPTEK 的 3.7 英吋六色電子紙模組。電子紙靠環境光顯色，斷電後畫面還在。本例用它顯示文字、六色色塊、課表和一張已經轉換好的照片。

它只有黑、白、黃、紅、藍、綠六種顏色，沒有灰階。照片裡的中間色要靠不同顏色的像素混排來模擬，所以不能把 JPG 直接傳給螢幕，要先轉成面板的訊框格式。

| 參數 | 規格 |
| --- | --- |
| 型號 | EPD037A02 |
| 尺寸與解析度 | 3.7 英吋，480×720 |
| 色彩 | 黑、白、黃、紅、藍、綠 |
| 像素格式 | 4 bit/像素，一個位元組存兩個像素 |
| 介面 | 4 線 SPI，1×8P 2.54 mm 排針 |
| 全刷時間 | 約 15～25 秒 |
| 供電 | 3.3 V |

用這塊螢幕做演示，是因為一塊螢幕就能試到文字、圖形和六色照片。缺點是刷新慢，不能做動畫。

## 物料清單

| 物料 | 數量 | 備註 |
| --- | --- | --- |
| ESP32-S3 開發板 | 1 | 本例選 `ESP32S3 Dev Module` |
| EPD037A02 模組與 SPI 轉接板 | 1 | 480×720 六色電子紙 |
| 2.54 mm 杜邦線 | 8 根 | 6 根訊號線，1 根電源，1 根地 |
| USB 資料線 | 1 | 供電、上傳、看序列埠 |

### 腳位說明

| 螢幕腳位 | 方向 | 作用 |
| --- | --- | --- |
| BUSY | 螢幕 → ESP32-S3 | 高電位表示閒置，低電位表示忙碌 |
| CS | ESP32-S3 → 螢幕 | 晶片選擇，低電位有效，由程式手動控制 |
| DC | ESP32-S3 → 螢幕 | 低電位傳送命令，高電位傳送資料 |
| RST | ESP32-S3 → 螢幕 | 重置，低電位有效 |
| SDA / MOSI | ESP32-S3 → 螢幕 | SPI 資料 |
| CLK / SCK | ESP32-S3 → 螢幕 | SPI 時脈 |
| VDD | 電源 | 只能接 3.3 V |
| GND | 電源 | 與開發板共地 |

這塊螢幕只接收資料，不回傳，所以不用接 MISO。轉接板上的 BS0 透過 10 kΩ 電阻接地，固定為 4 線 SPI 模式，這個模式需要 DC 線來區分命令和資料，所以 DC 不能省。

## 接線

先斷開開發板電源，再按下表接線。

| 螢幕腳位 | ESP32-S3 | 用途 |
| --- | --- | --- |
| BUSY | GPIO7 | 讀取面板忙閒狀態 |
| CS | GPIO10 | 手動晶片選擇 |
| DC | GPIO9 | 區分命令與資料 |
| RST | GPIO8 | 面板重置 |
| SDA / MOSI | GPIO11 | SPI 資料 |
| CLK / SCK | GPIO12 | SPI 時脈 |
| VDD | 3.3 V | 模組供電 |
| GND | GND | 共地 |

**VDD 只能接 3.3 V，不能接 5 V。** 接完後逐根核對，特別檢查 SDA 和 CLK 有沒有接反。

接好線後：

1. 用 USB 連接開發板，在 Arduino IDE 裡選 `ESP32S3 Dev Module` 和對應連接埠。
2. 開啟完整範例，編譯並上傳。
3. 開啟序列埠監控視窗，鮑率設為 115200。如果沒看到開頭的日誌，按一下開發板的 RESET 鍵讓程式重新執行。程式只播放一次，晚開啟監控視窗會錯過前面的輸出。
4. 序列埠應依序輸出：訊框緩衝區資訊、面板初始化完成、兩次「刷新完成」（照片螢幕不列印刷新耗時），最後是 `Done. Last picture stays on screen.`。同時螢幕依序顯示三螢幕。兩者都對，才說明跑通了。

## 需要安裝的程式庫

在 Arduino IDE 的「開發板管理員」裡搜尋 `esp32`，安裝 Espressif Systems 的 esp32 Arduino Core，本文用 3.3.10。

再到「程式庫管理員」裡搜尋並安裝下面的程式庫。安裝 Adafruit GFX 時如果提示安裝依賴，選擇全部安裝，這樣 Adafruit BusIO 會一起裝上。

| 程式庫名稱 | 測試版本 | 來源 |
| --- | --- | --- |
| Adafruit GFX Library | 1.13.0 | [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library) |
| Adafruit BusIO | 1.17.4 | [Adafruit_BusIO](https://github.com/adafruit/Adafruit_BusIO) |
| SPI | 隨 esp32 Core 3.3.10 | [arduino-esp32](https://github.com/espressif/arduino-esp32) 內建，不用另裝 |
| EPD037A02_GFX | 未標版本 | 本專案內建，與主 `.ino` 放在同一目錄，不用複製到程式庫目錄 |

Adafruit GFX 負責畫文字和圖形。`EPD037A02_GFX` 負責面板初始化、SPI 傳輸、六色編碼和刷新。不同型號的面板命令不同，不能直接用其他電子紙的程式庫替換這一層。

## 完整程式碼

範例原始碼在 [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601)。資料夾和主程式檔案都叫 `EPD_3in7_Showcase_JD7601`，這兩個名稱必須一致，Arduino IDE 才能開啟。主要檔案如下：

```text
EPD_3in7_Showcase_JD7601/
├── EPD_3in7_Showcase_JD7601.ino
├── EPD037A02_GFX.h
├── EPD037A02_GFX.cpp
├── photo_data.h
└── tool/
    ├── epd_photo.py                  # 照片轉換腳本
    └── 02-driver-dog-car-480x720.png # 範例照片的原圖
```

前三個檔案的程式碼都在下面。`photo_data.h` 有一萬多行，文中不貼，請從儲存庫下載，沒有它程式編譯不過。

它裡面是一個 172800 位元組的 `photo_driver` 陣列，由 `tool/02-driver-dog-car-480x720.png` 轉換而來。存的是轉換後的面板訊框，不是 PNG 檔案的內容。

下面的程式碼與儲存庫裡的原始碼邏輯一致，只調整了部分註解，以儲存庫為準。

### 主程式 EPD_3in7_Showcase_JD7601.ino

```cpp
/*
 * EPD_3in7_Showcase — Hello + 英文課表 + 一張照片
 * 螢幕：OSPTEK 3.7" E6，480×720，JD7601
 * 主控：ESP32-S3
 *
 * 新手只改這個檔案就行。字體用 Adafruit GFX 內建的，不用自己做字型檔。
 * 安裝：在 Arduino IDE 程式庫管理員搜尋 Adafruit GFX Library。
 * 開啟：下載整個 Showcase 資料夾，再開啟這個 .ino，別只複製主檔案。
 */

#include "EPD037A02_GFX.h"
#include "photo_data.h"

// 腳位順序：CS、DC、RST、BUSY、SCK、MOSI；供電只能 3.3V。
EPD037A02_GFX epd(10, 9, 8, 7, 12, 11);
#define HOLD_MS 3000

// 內建 5×7 字體的 y 座標在文字頂邊；一個字元占 6×8 像素。
void text(const char *s, int x, int y, uint8_t size, uint8_t color) {
  epd.setFont();                 // 用 GFX 內建字體，不用另外 setFont(字型檔)
  epd.setTextSize(size);
  epd.setTextColor(color);
  epd.setCursor(x, y);
  epd.print(s);
}

void textCenter(const char *s, int y, uint8_t size, uint8_t color) {
  int w = strlen(s) * 6 * size;
  text(s, (480 - w) / 2, y, size, color);
}

void drawHello() {
  epd.fillScreen(EPD_WHITE);
  epd.drawRect(0, 0, 480, 720, EPD_BLACK);
  textCenter("HELLO", 65, 9, EPD_BLACK);
  textCenter("WORLD", 150, 9, EPD_RED);
  epd.fillRect(40, 245, 400, 4, EPD_BLACK);

  // 六個色塊順便檢查六色映射和畫面方向。
  const uint8_t colors[6] = {
    EPD_BLACK, EPD_WHITE, EPD_YELLOW, EPD_RED, EPD_BLUE, EPD_GREEN
  };
  const char *labels[6] = { "K", "W", "Y", "R", "B", "G" };
  for (int i = 0; i < 6; i++) {
    int x = 16 + i * 76;
    epd.fillRect(x, 295, 68, 110, colors[i]);
    epd.drawRect(x, 295, 68, 110, EPD_BLACK);
    text(labels[i], x + 22, 430, 4, EPD_BLACK);
  }
  textCenter("3.7INCH 480X720", 525, 4, EPD_BLACK);
  textCenter("E6 6-COLOR EPD", 570, 4, EPD_BLACK);
  textCenter("ESP32-S3 OK", 640, 4, EPD_BLUE);
}

// 改課表內容只改這幾行。
const char *subjects[6] = {
  "MATH", "CHINESE", "ENGLISH", "PHYSICS", "CHEMISTRY", "STUDY HALL"
};
const char *rooms[6] = {
  "ROOM 302", "ROOM 302", "AUDIO LAB", "PHYS LAB", "CHEM LAB", "ROOM 302"
};
const char *times[6] = { "08:00", "08:55", "NOW", "11:05", "14:00", "14:55" };
const uint8_t bars[6] = {
  EPD_BLUE, EPD_RED, EPD_RED, EPD_BLACK, EPD_YELLOW, EPD_WHITE
};

void drawAgenda() {
  epd.fillScreen(EPD_WHITE);
  epd.fillRect(0, 0, 480, 100, EPD_BLACK);
  text("MON - NOV 9", 24, 20, 4, EPD_WHITE);
  text("WEEK 12 - 6 CLASSES", 24, 65, 2, EPD_YELLOW);

  for (int i = 0; i < 6; i++) {
    int y = 115 + i * 92;
    bool now = (i == 2);
    epd.fillRoundRect(18, y, 444, 80, 5, now ? EPD_RED : EPD_WHITE);
    if (!now) epd.drawRoundRect(18, y, 444, 80, 5, EPD_BLACK);
    if (bars[i] != EPD_WHITE) epd.fillRect(20, y + 2, 9, 76, bars[i]);

    uint8_t fg = now ? EPD_WHITE : EPD_BLACK;
    text(subjects[i], 45, y + 12, 3, fg);
    text(rooms[i], 45, y + 47, 2, fg);
    text(times[i], 365, y + 25, 2, fg);
  }
  text("NEXT 11:05 PHYSICS", 20, 688, 2, EPD_BLACK);
}

bool showScreen(uint8_t index) {
  switch (index) {
    case 0: drawHello();  return epd.display();
    case 1: drawAgenda(); return epd.display();
    case 2: return epd.displayRawFrame(photo_driver, PHOTO_DRIVER_BYTES);
    default: return false;
  }
}

void setup() {
  // 第一步：開啟序列埠，後面靠它判斷卡在哪一步。
  Serial.begin(115200);
  delay(500);
  Serial.println("Showcase: Hello -> English agenda -> portrait");

  // 第二步：分配訊框緩衝區、初始化 SPI，再重置並初始化面板。
  if (!epd.begin()) {
    Serial.println("Init failed: check 3V3, GND, wiring and BUSY.");
    return;
  }

  // 第三步：三螢幕各播一次。某一螢幕失敗就停，不繼續往下刷。
  for (uint8_t i = 0; i < 3; i++) {
    if (!showScreen(i)) {
      Serial.println("Refresh failed; stopped. Check wiring and BUSY.");
      return;
    }
    if (i < 2) delay(HOLD_MS);   // 這是刷新完後的停留時間，不是換螢幕週期
  }
  Serial.println("Done. Last picture stays on screen.");
}

void loop() {
  // 只播放一次。改課表請修改上方 subjects / rooms / times。
}

// 第四步：編譯時就擋住尺寸或長度不對的照片訊框。
static_assert(PHOTO_DRIVER_W == 480 && PHOTO_DRIVER_H == 720,
              "Photo must be 480x720");
static_assert(PHOTO_DRIVER_BYTES == EPD037A02_BUF_BYTES,
              "Photo must be 172800 bytes");
```

### 面板驅動介面 EPD037A02_GFX.h

```cpp
/*
 * EPD037A02_GFX — 給 Adafruit_GFX 用的面板驅動類別
 * OSPTEK 3.7" E6 電子紙，480×720，六色（JD7601 / IST7601 / IST7163）
 *
 * 這裡自己寫面板層，圖形層直接繼承 Adafruit_GFX。
 * 於是 drawLine、fillCircle、setFont、print 都能直接用現成的。
 *
 * MIT / CC BY 4.0，與儲存庫其餘資料一致。
 */

#ifndef EPD037A02_GFX_H
#define EPD037A02_GFX_H

#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>

/* ------------------------------ 面板常數 ------------------------------- */

#define EPD037A02_WIDTH    480
#define EPD037A02_HEIGHT   720
#define EPD037A02_BUF_BYTES ((size_t)EPD037A02_WIDTH * EPD037A02_HEIGHT / 2) /* 172800 */

// 一位元組裝同列相鄰兩像素。實測錯位 1～2 px 時，把這裡改成 1。
#ifndef EPD037A02_SWAP_NIBBLE
#define EPD037A02_SWAP_NIBBLE 0
#endif

// JD7601 的 4 bit 色值，0x4 非法，別按 0～5 連續編號來寫。
enum EPDColor : uint8_t {
  EPD_BLACK  = 0x0,
  EPD_WHITE  = 0x1,
  EPD_YELLOW = 0x2,
  EPD_RED    = 0x3,
  EPD_BLUE   = 0x5,
  EPD_GREEN  = 0x6,
};

/* ------------------------------- 驅動類別 -------------------------------- */
/*
 * 用法：
 *   EPD037A02_GFX display(10, 9, 8, 7);    // cs、dc、rst、busy
 *   display.begin();                       // 分配訊框緩衝區 + 重置 + INIT
 *   display.setRotation(0);                // 0/2 = 480×720，1/3 = 720×480
 *   display.fillScreen(EPD_WHITE);
 *   display.setFont(&FreeSansBold24pt7b);
 *   display.setCursor(20, 120);  display.print("Hello");
 *   display.display();                     // 推螢幕 + 全刷（15～25 s）
 *
 * 顏色是 4 bit 索引色，只有六種，不是 RGB565。
 * 傳 16 位元色值也能編譯，但只有低 4 位元參與取色，結果沒有意義。
 */
class EPD037A02_GFX : public Adafruit_GFX {
 public:
  EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                int8_t sck = -1, int8_t mosi = -1, SPIClass *spi = &SPI);
  ~EPD037A02_GFX();

  // 分配訊框緩衝區、初始化 GPIO/SPI、重置並初始化面板。
  // 記憶體不夠或 BUSY 無回應時回傳 false，螢幕保持原樣。
  bool begin(uint32_t spi_hz = 2000000);

  // 把訊框緩衝區推到螢幕並全刷。阻塞 15～25 s，BUSY 逾時回傳 false。
  bool display();

  // 直接傳送打包好的 480×720 原生訊框，不再申請一份照片訊框緩衝區。
  bool displayRawFrame(const uint8_t *frame, size_t bytes);

  // 面板深睡眠。喚醒要重新上電，或拉 RST 後重新 begin()。
  bool sleep();

  // 只清訊框緩衝區，不立即刷螢幕。彩色螢幕有殘影時，可以先 clear() 再 display() 刷一次白螢幕。
  void clear(uint16_t color = EPD_WHITE);

  // drawPixel 是 Adafruit_GFX 要求實作的純虛擬函式；fillScreen 重寫為 memset，速度更快。
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void fillScreen(uint16_t color) override;

  // 把 RGB 量化到最接近的六色之一，畫簡單圖像時可用。
  static uint8_t fromRGB(uint8_t r, uint8_t g, uint8_t b);

  uint8_t *buffer() const { return _buf; }
  bool ready() const { return _buf != nullptr; }
  uint32_t lastRefreshMs() const { return _lastRefreshMs; }
  void setVerbose(bool v) { _verbose = v; }

 private:
  int8_t _cs, _dc, _rst, _busy, _sck, _mosi;
  SPIClass *_spi;
  uint32_t _spiHz;
  uint8_t *_buf;
  uint32_t _lastRefreshMs;
  bool _verbose;

  void _alloc();
  void _spiSend(const uint8_t *buf, size_t len);
  void _cmd(uint8_t c);
  void _data(uint8_t d);
  void _dataBuf(const uint8_t *buf, size_t len);
  bool _waitBusy(const char *what, uint32_t timeout_ms = 60000);
  bool _reset();
  bool _initPanel();
};

#endif /* EPD037A02_GFX_H */
```

### 面板驅動實作 EPD037A02_GFX.cpp

```cpp
/*
 * EPD037A02_GFX.cpp — 面板層：SPI、時序、訊框格式
 * 這層只做三件事：傳送位元組、等 BUSY、把 (x,y) 換成訊框緩衝區索引。
 * 圖形、字體和旋轉交給 Adafruit_GFX。
 */

#include "EPD037A02_GFX.h"

#include <string.h>
#include <pgmspace.h>

#if defined(ESP32)
#include <esp32-hal-psram.h>
#endif

namespace {
// 一位元組兩像素，所以一條 720 像素的豎列占 360 位元組。
const size_t kColBytes  = EPD037A02_HEIGHT / 2;
const size_t kChunk     = 2048;    // 單次 SPI 傳輸上限，與廠商範例一致
const uint32_t kBusyTmo = 60000;   // 全刷最長 25 s，這裡留餘量
}  // namespace

EPD037A02_GFX::EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                             int8_t sck, int8_t mosi, SPIClass *spi)
    : Adafruit_GFX(EPD037A02_WIDTH, EPD037A02_HEIGHT),
      _cs(cs), _dc(dc), _rst(rst), _busy(busy), _sck(sck), _mosi(mosi),
      _spi(spi), _spiHz(2000000), _buf(nullptr), _lastRefreshMs(0),
      _verbose(true) {}

EPD037A02_GFX::~EPD037A02_GFX() {
  if (_buf) {
    free(_buf);   // ps_malloc 申請的記憶體也用 free() 釋放
    _buf = nullptr;
  }
}

/* ============================ 記憶體 / 初始化 ============================ */

void EPD037A02_GFX::_alloc() {
  if (_buf) return;
#if defined(ESP32)
  if (psramFound()) _buf = (uint8_t *)ps_malloc(EPD037A02_BUF_BYTES);
#endif
  if (!_buf) _buf = (uint8_t *)malloc(EPD037A02_BUF_BYTES);
}

bool EPD037A02_GFX::begin(uint32_t spi_hz) {
  // 第一步：取得 172800 位元組訊框緩衝區，並先填白。
  _spiHz = spi_hz;
  _alloc();
  if (!_buf) {
    if (_verbose) {
      Serial.printf("[EPD] 訊框緩衝區分配失敗，需要 %u 位元組\n",
                    (unsigned)EPD037A02_BUF_BYTES);
    }
    return false;
  }

  // malloc 不清零；先填白，避免把未初始化記憶體刷到螢幕上。
  clear(EPD_WHITE);

  // 第二步：設定腳位。CS 手動控制，MISO 不用接。
  pinMode(_cs, OUTPUT);   digitalWrite(_cs, HIGH);
  pinMode(_dc, OUTPUT);   digitalWrite(_dc, HIGH);
  pinMode(_rst, OUTPUT);  digitalWrite(_rst, HIGH);
  pinMode(_busy, INPUT);

  // 參數順序是 SCK、MISO、MOSI、SS。SS 傳 -1，別把 CS 交給周邊裝置。
  _spi->begin(_sck, -1, _mosi, -1);

  if (_verbose) {
    Serial.printf("[EPD] 訊框緩衝區 %u B，SPI %lu Hz\n",
                  (unsigned)EPD037A02_BUF_BYTES, (unsigned long)_spiHz);
  }

  // 第三步：重置面板，傳送初始化命令。
  return _initPanel();
}

bool EPD037A02_GFX::_initPanel() {
  if (!_reset()) return false;

  _cmd(0xE9); _data(0x01);   // 廠商 INIT：JD7601 初始化命令

  if (_verbose) Serial.println("[EPD] 面板初始化完成");
  return true;
}

/* ============================== 底層 SPI =============================== */

void EPD037A02_GFX::_spiSend(const uint8_t *buf, size_t len) {
  digitalWrite(_cs, LOW);
  _spi->beginTransaction(SPISettings(_spiHz, MSBFIRST, SPI_MODE0));
  _spi->writeBytes(buf, len);
  _spi->endTransaction();
  digitalWrite(_cs, HIGH);
}

void EPD037A02_GFX::_cmd(uint8_t c) {
  digitalWrite(_dc, LOW);    // DC=L：命令
  _spiSend(&c, 1);
}

void EPD037A02_GFX::_data(uint8_t d) {
  digitalWrite(_dc, HIGH);   // DC=H：資料
  _spiSend(&d, 1);
}

void EPD037A02_GFX::_dataBuf(const uint8_t *buf, size_t len) {
  digitalWrite(_dc, HIGH);
  while (len) {
    size_t n = (len > kChunk) ? kChunk : len;
    _spiSend(buf, n);
    buf += n;
    len -= n;
  }
}

// BUSY 高 = 閒置，低 = 忙碌。規格書 Note 6-4 正文寫反了，按腳位表與實測。
bool EPD037A02_GFX::_waitBusy(const char *what, uint32_t timeout_ms) {
  uint32_t t0 = millis();
  while (digitalRead(_busy) == LOW) {
    if (millis() - t0 > timeout_ms) {
      if (_verbose) Serial.printf("[EPD] BUSY 逾時：%s\n", what);
      return false;
    }
    delay(2);
  }
  return true;
}

// 廠商 RESET 時序：低 20 → 高 10 → 低 20 → 高 10 ms，再等 BUSY。
bool EPD037A02_GFX::_reset() {
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);

  if (digitalRead(_busy) == LOW) {
    if (_verbose) Serial.println("[EPD] 等待 BUSY 拉高（最長 10 s），逾時請查 3V3 / GND / 排線");
    if (!_waitBusy("reset", 10000)) return false;
  }
  delay(10);
  return true;
}

/* ============================== 刷螢幕流程 =============================== */

bool EPD037A02_GFX::display() {
  if (!_buf) return false;
  uint32_t t0 = millis();

  _cmd(0x10);                             // DTM：準備寫 RAM
  if (!_waitBusy("DTM")) return false;
  _dataBuf(_buf, EPD037A02_BUF_BYTES);

  _cmd(0x04);                             // PON：開高壓
  if (!_waitBusy("PON")) return false;
  delay(10);

  _cmd(0x12); _data(0x00);                // DRF：開始刷新
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;

  _cmd(0x02); _data(0x00);                // POF：關高壓
  if (!_waitBusy("POF")) return false;
  delay(20);

  _lastRefreshMs = millis() - t0;
  if (_verbose) Serial.printf("[EPD] 刷新完成 %lu ms\n", (unsigned long)_lastRefreshMs);
  return true;
}

bool EPD037A02_GFX::displayRawFrame(const uint8_t *frame, size_t bytes) {
  if (!frame || bytes != EPD037A02_BUF_BYTES) return false;

  _cmd(0x10);
  if (!_waitBusy("DTM")) return false;

  // 每次從 Flash 搬 2048 位元組到 RAM，再走 SPI；不讓 DMA 直接讀 Flash。
  uint8_t chunk[kChunk];
  digitalWrite(_dc, HIGH);
  for (size_t off = 0; off < bytes; off += sizeof(chunk)) {
    size_t n = bytes - off;
    if (n > sizeof(chunk)) n = sizeof(chunk);
    memcpy_P(chunk, frame + off, n);
    _spiSend(chunk, n);
  }

  _cmd(0x04);
  if (!_waitBusy("PON")) return false;
  delay(10);
  _cmd(0x12); _data(0x00);
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;
  _cmd(0x02); _data(0x00);
  if (!_waitBusy("POF")) return false;
  delay(20);
  return true;
}

bool EPD037A02_GFX::sleep() {
  _cmd(0x07); _data(0xA5);
  if (_verbose) Serial.println("[EPD] 已進入深睡眠");
  return true;
}

/* ================================ 繪圖 ================================= */

void EPD037A02_GFX::clear(uint16_t color) {
  if (!_buf) return;
  uint8_t c = (uint8_t)(color & 0x0F);
  memset(_buf, (int)((c << 4) | c), EPD037A02_BUF_BYTES);
}

void EPD037A02_GFX::fillScreen(uint16_t color) { clear(color); }

void EPD037A02_GFX::drawPixel(int16_t x, int16_t y, uint16_t color) {
  if (!_buf) return;
  if (x < 0 || y < 0 || x >= _width || y >= _height) return;

  // 先把受 rotation 影響的邏輯座標換成面板自然座標。
  int16_t dx, dy;
  switch (rotation & 3) {
    case 0:  dx = x;                 dy = y;                 break;
    case 1:  dx = WIDTH - 1 - y;     dy = x;                 break;
    case 2:  dx = WIDTH - 1 - x;     dy = HEIGHT - 1 - y;    break;
    default: dx = y;                 dy = HEIGHT - 1 - x;    break;
  }

  // 面板按豎列裝資料，而且每列從下往上掃，所以還要做 Y 鏡像。
  // 按常見的橫向列優先來寫，畫面會轉 90° 並錯位重複。
  const int16_t fy = HEIGHT - 1 - dy;
  size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);

#if EPD037A02_SWAP_NIBBLE
  const bool lowNibble = ((fy & 1) == 0);
#else
  const bool lowNibble = ((fy & 1) != 0);
#endif

  // 一個位元組拆成兩個半位元組，只改目標像素所在的那一半。
  const uint8_t c = (uint8_t)(color & 0x0F);
  if (lowNibble) _buf[i] = (uint8_t)((_buf[i] & 0xF0) | c);
  else           _buf[i] = (uint8_t)((_buf[i] & 0x0F) | (c << 4));
}

/* ============================ RGB → 六色量化 =========================== */

struct EPDRgbRef { uint8_t r, g, b, code; };

// 參考色取自 Spectra 6 / E6 的典型顯色，偏暗一點更接近肉眼。
static const EPDRgbRef kRefs[6] = {
    {  0,   0,   0, EPD_BLACK  },
    {255, 255, 255, EPD_WHITE  },
    {255, 232,   0, EPD_YELLOW },
    {190,  30,  45, EPD_RED    },
    { 35,  70, 150, EPD_BLUE   },
    { 40, 110,  60, EPD_GREEN  },
};

uint8_t EPD037A02_GFX::fromRGB(uint8_t r, uint8_t g, uint8_t b) {
  // 加權歐氏距離，綠色的權重更高。
  int32_t best = INT32_MAX;
  uint8_t code = EPD_BLACK;
  for (int k = 0; k < 6; k++) {
    int32_t dr = (int32_t)r - kRefs[k].r;
    int32_t dg = (int32_t)g - kRefs[k].g;
    int32_t db = (int32_t)b - kRefs[k].b;
    int32_t d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < best) { best = d; code = kRefs[k].code; }
  }
  return code;
}
```

### 程式碼說明

**像素怎麼存。** `drawPixel()` 最容易寫錯。螢幕是 480×720，每像素 4 bit，一訊框是 480×720÷2 = 172800 位元組。

和普通螢幕按列寫不同，這塊螢幕按豎列接收：共 480 列，每列 360 位元組，列內還是從下往上掃。所以程式碼先做 Y 鏡像 `fy = HEIGHT-1-dy`，再用 `i = dx*360 + (fy>>1)` 算位元組位置。

**顏色編碼。** 六種顏色的編碼不連續：黑、白、黃、紅是 `0x0～0x3`，藍和綠是 `0x5`、`0x6`，`0x4` 非法。畫圖時直接用 `EPD_BLACK` 這類列舉，不要自己填序號。

**三螢幕怎麼刷。** `setup()` 裡的 `for` 迴圈執行三次。前兩螢幕先畫到訊框緩衝區，再呼叫 `display()` 推送並刷新。第三螢幕呼叫 `displayRawFrame()`，把 `photo_data.h` 的資料每 2048 位元組一塊，從 Flash 搬到 RAM，再透過 SPI 發出。

**記憶體。** 照片螢幕不用訊框緩衝區，但前兩螢幕要用，所以程式始終需要 172800 位元組的訊框緩衝區。有 PSRAM 時優先放在 PSRAM，沒有或分配失敗就放內部 RAM。

**停留時間。** 每螢幕刷新要 15～25 秒，`HOLD_MS` 只是刷新結束後額外多等的時間。所以前兩螢幕之間的實際間隔，等於刷新時間加 3 秒。程式沒有循環播放，想重播就按 RESET 重置開發板。

**改課表。** 修改 `subjects`、`rooms`、`times` 三個陣列，六行一一對應。`bars` 是每行左邊色條的顏色。高亮的「目前課程」固定是第 3 行（`i == 2`）。標題日期、`WEEK 12` 和底部的 `NEXT 11:05 PHYSICS` 都是寫死的文字。範例不讀時鐘，也不會自動更新。

### 照片怎麼轉成面板資料

照片不在開發板上處理。電腦先把它轉成六色點陣，ESP32-S3 只負責把轉好的資料傳給螢幕。

```text
JPG/PNG → 居中裁切並縮放到 480×720
→ 調整曝光、對比度、飽和度 → 六色抖動 → 換成面板色值
→ 按豎列排列，做 Y 鏡像，兩個像素合成一個位元組
→ 172800 位元組陣列（photo_data.h）→ 編進 Flash
→ ESP32-S3 透過 SPI 傳給螢幕
```

抖動是把不同顏色的像素交錯排開，讓眼睛把一片點陣看成過渡色。它不會增加顏色種類，轉換後每個像素仍然只是黑、白、黃、紅、藍、綠之一。轉換腳本按電子紙實際看起來的顏色（偏暗）計算顏色距離，但輸出的是面板色值。

像素的排列方式和顏色編碼，前面「像素怎麼存」和「顏色編碼」已經講過，腳本按同樣的規則打包。所以產生的資料可以直接傳給面板，開發板不用解碼 JPG，也不用算抖動。

### 換照片

先備份原來的 `photo_data.h`，因為下面的命令會覆蓋它。電腦上需要 Python 3、Pillow 和 numpy（`pip install pillow numpy`）。只執行範例不需要裝它們。

在範例資料夾裡執行：

```bash
cd EPD_3in7_Showcase_JD7601
python3 tool/epd_photo.py 我的照片.jpg --header photo_data.h --header-name photo_driver
```

- 陣列名稱必須保持 `photo_driver`。腳本會據此產生 `PHOTO_DRIVER_W`、`PHOTO_DRIVER_H`、`PHOTO_DRIVER_BYTES`，主程式末尾的 `static_assert` 要用到它們。
- 預設居中裁切成 480×720。不想裁掉邊緣，可以加 `--fit contain`（留白）或 `--fit stretch`（拉伸變形）。
- 輸出始終是 480×720、172800 位元組。產生後重新編譯上傳即可，不用上傳檔案系統。

## 常見問題排查

### 編譯報 undefined reference to EPD037A02_GFX

現象：連結階段找不到 `begin()`、`display()` 等函式。

原因：`EPD037A02_GFX.cpp` 沒有被編譯。Arduino 只編譯草圖根目錄和 `src/` 子目錄裡的 `.cpp`，放在其他子目錄（如 `driver/`）裡的不會編譯。

處理：把主 `.ino`、驅動 `.h` 和 `.cpp` 放在同一級目錄，然後重新開啟範例，再編譯一次。

### 序列埠監控視窗沒有輸出

現象：上傳完成，序列埠一片空白。

原因：鮑率不對；或者用板載 USB 埠時沒有啟用 USB CDC；或者監控視窗開啟得太晚，程式已經輸出完了。

處理：鮑率設為 115200，並確認選對了連接埠。用板載 USB 埠時，在 Arduino IDE 裡把 `USB CDC On Boot` 設為 `Enabled`，重新上傳。也可以按開發板說明改用 UART 埠。最後按一下 RESET，讓程式重新執行。

### 序列埠有輸出，螢幕一直全白

現象：程式在跑，螢幕沒有圖案。

原因：常見是 SDA 和 CLK 接反、CS 或 DC 接錯，也可能沒有共地。

處理：斷電後逐根核對 8 根線。量一下 VDD 是否是 3.3 V，再檢查 GND 是否導通。另外，驅動裡 `SPI.begin()` 的第四個參數必須是 `-1`，CS 由 `_spiSend()` 手動拉低和拉高。

### 序列埠提示 reset 階段 BUSY 逾時

現象：日誌停在「等待 BUSY 拉高」，隨後報 `reset` 逾時，最後輸出 `Init failed`。

原因：BUSY 一直是低電位。可能是螢幕沒上電、BUSY 線接錯或沒接好，也可能是排線接觸不良。

處理：確認 VDD 接的是 3.3 V，排線插到底，BUSY 接的是 GPIO7。先查這些，不要改刷新程式碼。修好後重新上電上傳。

### DRF 階段逾時，或畫面局部花屏

現象：初始化正常，刷新時逾時，或者畫面局部異常。

常見原因：供電電流不夠，杜邦線太長，SPI 速率太高。

處理：縮短杜邦線，檢查地線接觸，換一個供電穩定的 USB 埠或電源。SPI 速率保持預設的 2 MHz。如果改過 `epd.begin()` 的參數，先刪掉參數恢復預設。

### 畫面轉了 90°，還重複出現約三段

現象：文字和色塊能認出來，但方向不對，並且錯位重複。

原因：訊框資料按列排列了，而面板實際按豎列接收。用本文的驅動不應出現這個問題，多見於自己改過驅動或使用舊版驅動的情況。

處理：核對 `drawPixel()` 裡是不是 `size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);`，並且 `kColBytes = EPD037A02_HEIGHT / 2`，即 360。

### 畫面沒有重複，但上下顛倒

現象：字母順序沒反，只是整幅上下翻轉。

原因：面板每列從下往上掃，程式碼缺少 Y 鏡像。

處理：核對 `drawPixel()` 裡有 `const int16_t fy = HEIGHT - 1 - dy;`，並且後面的位址和半位元組判斷都用 `fy`。不要只把位元組順序倒過來。

### 細線錯開一截，筆畫像梳齒

現象：整體位置對，但相鄰像素錯開 1～2 px。

原因：一個位元組裡高低半位元組的順序可能反了。

處理：把 `EPD037A02_GFX.h` 裡的 `EPD037A02_SWAP_NIBBLE` 從 `0` 改成 `1`。它只交換位元組內兩個像素的順序，不處理整幅鏡像。

### 編譯報 Photo must be 480x720 或 Photo must be 172800 bytes

現象：兩條 `static_assert` 中有一條觸發。

原因：替換後的 `photo_data.h` 不是 480×720，或者訊框長度不是 172800 位元組。

處理：用上面的轉換命令重新產生，保留 `--header-name photo_driver`。再檢查 `PHOTO_DRIVER_W`、`PHOTO_DRIVER_H`、`PHOTO_DRIVER_BYTES` 是否分別是 480、720、172800。

## FAQ

**能不能換別的腳位接 EPD037A02？**

可以。同時修改接線和 `EPD037A02_GFX epd(10, 9, 8, 7, 12, 11)`，參數順序是 CS、DC、RST、BUSY、SCK、MOSI。ESP32-S3 上建議避開 GPIO0、45、46（啟動相關）、GPIO19、20（USB）和 GPIO26～37（Flash/PSRAM 占用），具體還要對照自己開發板的原理圖。我只用 GPIO7～12 這組腳位編譯過，其他腳位沒試。

**SPI 速率是多少？能改成 8 MHz 嗎？**

本例預設 2 MHz，Mode 0，高位在前。想提高，可以改 `epd.begin()` 的參數，比如 `epd.begin(4000000)`，建議從 4 MHz 試起；出現雜點或花屏就退回 2 MHz。我沒在這份三螢幕範例上測過 8 MHz。

**能用 5 V 供電嗎？刷新時電流多大？**

不能。VDD 只能接 3.3 V，GND 必須與開發板共地。刷新時升壓電路的負載會變大，所以杜邦線要短，供電要穩。刷新的峰值電流我沒測過，這裡不給估計值。

**占多少 RAM 和 Flash？會占滿 CPU 嗎？**

本次編譯結果：Flash 525724 位元組（40%），全域變數 23576 位元組（7%）。執行時另外申請 172800 位元組的訊框緩衝區，傳送照片時還用 2048 位元組的暫存緩衝區。刷新是阻塞的，刷新期間 `loop()` 做不了別的事，不要安排需要嚴格定時的任務。CPU 占用率我沒測過。

**能用 GxEPD2 或普通 ESP32 嗎？**

我核對的 GxEPD2 1.6.9 裡沒有這塊 480×720、JD7601 六色面板的驅動類別，不能直接套用。普通 ESP32 理論上能移植，但要改 SPI 和 PSRAM 相關的平台程式碼，並確認 RAM 放得下 172800 位元組的訊框緩衝區。我沒在其他主控上測過。

**螢幕完全不顯示，先查哪幾根線？**

先量 VDD 是不是 3.3 V，再查 GND、BUSY、CS、DC、SDA 和 CLK。序列埠設為 115200。出現 `reset` 或 `DRF` 逾時，按上面對應的條目處理。如果序列埠沒有任何輸出，先檢查連接埠和 USB CDC 設定，不要先改訊框格式。

**能直接顯示中文或 JPG 嗎？**

不能。介面用的是 GFX 內建的 5×7 字體，範例文字都是英文，沒有中文字型檔。JPG 也不能直接傳送，要先轉成 480×720、172800 位元組的面板訊框。範例附帶的 `photo_data.h` 已經轉好，換圖的方法見上文「換照片」。

**為什麼只播放一次就停了？斷電後照片還在嗎？**

範例就是只播放一次，`loop()` 是空的，最後停在照片上。電子紙斷電後畫面會保留。想重播就按 RESET；想自動循環，需要自己加觸發邏輯。連續輪播的間隔我沒測過。

## 延伸玩法

- 把寫死的課表換成從序列埠輸入，排版確認後再接真實資料。
- 加一個按鍵，手動在 Hello、課表、照片之間切換。
- 加 RTC，讓標題日期和「目前課程」自動更新。
- 把多張照片放到 LittleFS 或 SD 卡，做成按鍵翻頁的電子相框。

## 參考資料

- [本文範例原始碼（GitHub）](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601)：三螢幕範例的完整檔案和照片轉換腳本。

- [Espressif ESP32-S3 官方產品頁](https://www.espressif.com/en/products/socs/esp32-s3)：主控晶片資訊。

- [Espressif ESP32-S3 官方資料手冊](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)：GPIO、SPI 與電氣參數。

- [Adafruit GFX Library GitHub](https://github.com/adafruit/Adafruit-GFX-Library)：文字和圖形介面。

- [Adafruit BusIO GitHub](https://github.com/adafruit/Adafruit_BusIO)：Adafruit GFX 的依賴程式庫。

- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)：Arduino 核心與 SPI 支援。

- [Adafruit GFX 字體說明](https://learn.adafruit.com/adafruit-gfx-graphics-library/using-fonts)：內建字體與 FreeFont 的用法。

- [廠商開源資料和範例](https://gitee.com/osptek/display-epd-3.7inch-480x720)：規格書、原理圖和廠商範例。
