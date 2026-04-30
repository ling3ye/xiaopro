---
title: "ESP32-S3 驅動 Micro SD 卡模組完整教學（SPI 模式 + Arduino 程式碼）"
boardId: esp32s3
moduleId: storage/microsd-storage-board
category: esp32
date: 2026-04-30
intro: "ESP32-S3 透過 SPI 模式驅動 Micro SD 卡模組，實現檔案列表讀取、讀寫刪除等完整操作。附接線圖、完整程式碼和避坑指南。"
image: "https://img.lingflux.com/2026/04/a52d9db02d07cc13df512e06920e4603.jpg"
---

> **一句話摘要**：ESP32-S3 透過 SPI 模式讀寫 Micro SD 卡，30 分鐘從接線到串口輸出檔案列表。

# ESP32-S3 驅動 Micro SD 卡模組完整教學（SPI 模式 + Arduino 程式碼）

> 難度：⭐⭐☆☆☆（有一點基礎就能上手） 預計時間：30 分鐘 測試環境：Arduino IDE 2.3.x + ESP32 Arduino Core 3.x

------

> **TL;DR（直接上手版）：**
>
> 1. 接線：GPIO5 → CMD（MOSI），GPIO13 → D0（MISO），GPIO14 → CLK，GPIO4 → D3（CS）
> 2. 電源接 **3.3V**，不要接 5V
> 3. SD 卡格式化成 **FAT32**（32G 卡尤其注意）
> 4. 用內建 `SD.h` 函式庫，無需額外安裝
> 5. 燒錄程式碼，打開串口監視器（115200），看到檔案列表就成功了

------

## 前言

做 ESP32 專案做到一半，你有沒有遇過這個問題：

> 想播一段音訊、存一堆感測器資料、或者塞幾張圖片進去……
>  結果發現 ESP32 的內建 Flash 根本不夠用。

這時候最簡單的解法就是外掛一張 SD 卡。儲存空間從幾 MB 直接升級到幾十 GB，讀寫速度也夠用。本文就帶你把 **ESP32-S3 + Micro SD 卡模組** 這套組合從零跑通，用 SPI 模式讀取 32G 的 SD 卡裡的檔案列表。

接好線、燒錄程式碼，30 分鐘內你應該能在串口監視器裡看到自己 SD 卡裡的檔案名稱。

------

## 演示效果

![](https://img.lingflux.com/2026/04/36943c66a6d84fb669a840b29677f2f5.jpg)

串口輸出大概長這樣：

```
=== ESP32-S3 SD SPI Test ===
MOSI=5, MISO=13, SCK=14, CS=4
SD card mounted successfully.
SD Card Type: SDHC
SD Card Size: 30436MB
Total space: 30436MB
Used space : 512MB
Listing directory: /
  DIR : music
  FILE: readme.txt  SIZE: 128
  FILE: config.json  SIZE: 256
```


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/EOdWUtUBBMA?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


------

## 模組介紹

![](https://img.lingflux.com/2026/04/6737983c1e0d23072c47461024204cb9.jpg)

SD 卡模組就像是給 ESP32 裝了一個「讀卡機」。ESP32 本身沒有 SD 卡槽，這塊小模組充當中間人，把 ESP32 的 SPI 訊號翻譯成 SD 卡能聽懂的協定，讓你的 SD 卡變成可以隨意讀寫的外部儲存空間。

| 參數               | 規格說明                                   |
| ------------------ | ------------------------------------------ |
| 介面協定           | SPI 模式 / SDIO 模式（本文用 SPI）         |
| 支援卡類型         | Micro SD（SDSC / SDHC，最高支援 32GB）     |
| 工作電壓           | 3.3V（**不要接 5V，會燒毀模組或燒卡**）    |
| 腳位數量           | CMD / CLK / D0 / D1 / D2 / D3 / 3.3V / GND |
| SPI 模式用到的腳位 | CMD（MOSI）/ D0（MISO）/ CLK / D3（CS）    |

選這款模組的原因：體積小、接線少（SPI 模式只用 4 條訊號線），是 ESP32 外擴儲存最常見的方案，網路上資料也多，踩坑有人陪。

------

## BOM 清單

| 元件            | 數量 | 備註                        |
| --------------- | ---- | --------------------------- |
| ESP32-S3 開發板 | 1    | 任意帶 GPIO 的 S3 板均可    |
| Micro SD 卡模組 | 1    | 支援 SPI 模式（背面有標註） |
| Micro SD 卡     | 1    | 建議 32G 以內，格式化 FAT32 |
| 跳線（杜邦線）  | 若干 | 公對母，盡量短              |

------

## 完整接線方法

| ESP32-S3 腳位 | SD 模組腳位  | 說明                               |
| ------------- | ------------ | ---------------------------------- |
| 3.3V          | 3.3V         | **只接 3.3V，不要接 5V**           |
| GND           | GND          | 共地，必須接                       |
| GPIO13        | D0           | SPI MISO：SD 卡回傳資料給 ESP32    |
| GPIO5         | CMD          | SPI MOSI：ESP32 發資料給 SD 卡     |
| GPIO14        | CLK          | SPI 時脈，ESP32 主控               |
| GPIO4         | D3           | SPI 片選（CS），低電位時選中 SD 卡 |
| 不接          | D1 / D2 / CD | SPI 模式下用不到，空著即可         |

> ⚠️ 接好線之後，建議逐條對照上表過一遍，能省你 80% 的排錯時間。
>  另外，杜邦線別太長（30cm 以內最穩），線一長訊號容易抖，32G 大卡對時序更挑剔。

------

## 需要安裝的函式庫

不需要額外安裝！

本文用到的 `SPI.h` 和 `SD.h` 都已經內建在 **ESP32 Arduino Core** 裡了。只要你的 Arduino IDE 已經安裝了 ESP32 的開發板支援包，直接編譯就行。

如果還沒裝開發板套件，在 Arduino IDE → 工具 → 開發板管理員 裡搜尋 `esp32`，安裝 **Espressif Systems** 出的那個套件（本文測試版本：**ESP32 Arduino Core 3.0.x**）。

------

## 完整程式碼

```cpp
#include <SPI.h>
#include <SD.h>

// 第一步：定義 SPI 腳位
static const int SD_MOSI = 5;   // 對應 SD 模組 CMD
static const int SD_MISO = 13;  // 對應 SD 模組 D0
static const int SD_SCK  = 14;  // 對應 SD 模組 CLK
static const int SD_CS   = 4;   // 對應 SD 模組 D3（片選）

SPIClass spi = SPIClass(FSPI);  // ESP32-S3 上用 FSPI 匯流排

// 遞迴列出目錄裡的所有檔案和子資料夾
void listDir(fs::FS &fs, const char * dirname, uint8_t levels) {
  Serial.printf("正在列出目錄：%s\n", dirname);

  File root = fs.open(dirname);
  if (!root) {
    Serial.println("開啟目錄失敗，檢查接線或 SD 卡格式");
    return;
  }
  if (!root.isDirectory()) {
    Serial.println("這不是一個目錄");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      Serial.print("  [資料夾] ");
      Serial.println(file.name());
      if (levels) {
        listDir(fs, file.path(), levels - 1);  // 遞迴進子目錄
      }
    } else {
      Serial.print("  [檔案]   ");
      Serial.print(file.name());
      Serial.print("    大小：");
      Serial.print(file.size());
      Serial.println(" bytes");
    }
    file = root.openNextFile();
  }
}

// 列印 SD 卡基本資訊
void printCardInfo() {
  uint8_t cardType = SD.cardType();

  if (cardType == CARD_NONE) {
    Serial.println("沒有偵測到 SD 卡，檢查接線和供電");
    return;
  }

  Serial.print("SD 卡類型：");
  if      (cardType == CARD_MMC)  Serial.println("MMC");
  else if (cardType == CARD_SD)   Serial.println("SDSC");
  else if (cardType == CARD_SDHC) Serial.println("SDHC（標準大容量）");
  else                            Serial.println("未知類型");

  uint64_t cardSize   = SD.cardSize()   / (1024 * 1024);
  uint64_t totalBytes = SD.totalBytes() / (1024 * 1024);
  uint64_t usedBytes  = SD.usedBytes()  / (1024 * 1024);

  Serial.printf("SD 卡容量：%llu MB\n", cardSize);
  Serial.printf("可用空間：%llu MB\n",  totalBytes);
  Serial.printf("已用空間：%llu MB\n",  usedBytes);
}

void setup() {
  Serial.begin(115200);
  delay(1500);  // 等串口穩定

  Serial.println();
  Serial.println("=== ESP32-S3 SD SPI Test ===");
  Serial.printf("MOSI=%d, MISO=%d, SCK=%d, CS=%d\n",
                SD_MOSI, SD_MISO, SD_SCK, SD_CS);

  // 第二步：初始化 SPI 匯流排，指定腳位順序：SCK, MISO, MOSI, CS
  spi.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // 第三步：先把 CS 拉高，避免初始化時誤選中 SD 卡
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  // 第四步：掛載 SD 卡，初始時脈 10MHz（不穩定可降到 4MHz）
  if (!SD.begin(SD_CS, spi, 10000000)) {
    Serial.println("SD 卡掛載失敗！按以下順序排查：");
    Serial.println("1. 接線 GPIO5→CMD / GPIO13→D0 / GPIO14→CLK / GPIO4→D3");
    Serial.println("2. 供電確認是 3.3V，不是 5V");
    Serial.println("3. SD 卡格式化成 FAT32");
    Serial.println("4. 把 10000000 改成 4000000，降低 SPI 頻率再試");
    return;
  }

  Serial.println("SD 卡掛載成功！");
  printCardInfo();

  // 第五步：列出根目錄下 5 層檔案結構
  listDir(SD, "/", 5);
}

void loop() {
  // 檔案讀取只在 setup 裡做一次，loop 暫時留空
  // 如需定時輪詢，可在這裡加 delay + listDir
}
```




### 檔案操作擴展示例

跑通主程式之後，光列檔案還不夠用。下面這些函式**不修改主程式**， 只需要把它們貼在主程式的 `listDir()` 函式旁邊， 然後在 `setup()` 末尾按需呼叫即可， 覆蓋**讀 / 寫 / 附加以 / 建立 / 刪除 / 重新命名**所有常用操作。

#### 寫檔案 · 覆蓋與附加

`FILE_WRITE` 模式會清空原檔案後寫入，`FILE_APPEND` 模式會從檔案末尾附加。 做日誌記錄、感測器資料採集，幾乎都用 **附加模式**。

```
// === 寫檔案（覆蓋寫入）===
// 如果檔案不存在則建立，如果已存在則清空原內容後寫入
void writeFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("寫入檔案：%s\n", path);

  File file = fs.open(path, FILE_WRITE);  // FILE_WRITE 模式：覆蓋
  if (!file) {
    Serial.println("開啟檔案失敗（寫入模式）");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ 寫入成功");
  } else {
    Serial.println("❌ 寫入失敗");
  }
  file.close();  // 一定要關閉，否則資料可能沒刷到卡上
}

// === 附加寫入（不覆蓋原內容）===
// 適合做日誌：每次往檔案尾部附加一行
void appendFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("附加內容到：%s\n", path);

  File file = fs.open(path, FILE_APPEND);  // FILE_APPEND 模式：附加
  if (!file) {
    Serial.println("開啟檔案失敗（附加模式）");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ 附加成功");
  } else {
    Serial.println("❌ 附加失敗");
  }
  file.close();
}

// 呼叫示例（寫在 setup() 裡 listDir 後面即可）：
// writeFile(SD, "/hello.txt", "Hello ESP32-S3 SD!\n");
// appendFile(SD, "/hello.txt", "這是附加的第二行\n");
```

💡效能提醒每次 `file.close()` 都會觸發 SD 卡的實體寫入，頻繁開關檔案會很慢。 如果是高頻日誌，建議保持 `File` 實例開啟，**每寫 N 行呼叫一次 `file.flush()`** 把緩衝刷到卡裡。

#### 讀檔案 · 整體讀 與 逐行讀

`readFile()` 適合小檔案一次讀完；`readFileByLine()` 適合處理 CSV、設定檔等結構化文字。

```
// === 讀檔案（一次讀完，按位元組列印）===
void readFile(fs::FS &fs, const char * path) {
  Serial.printf("讀取檔案：%s\n", path);

  File file = fs.open(path);  // 預設就是 FILE_READ 模式
  if (!file) {
    Serial.println("開啟檔案失敗，檔案可能不存在");
    return;
  }

  Serial.print("檔案內容：");
  while (file.available()) {
    Serial.write(file.read());  // 逐位元組讀取並列印
  }
  Serial.println();
  file.close();
}

// === 逐行讀取（適合設定檔、CSV 資料）===
void readFileByLine(fs::FS &fs, const char * path) {
  Serial.printf("逐行讀取：%s\n", path);

  File file = fs.open(path);
  if (!file) {
    Serial.println("開啟檔案失敗");
    return;
  }

  int lineNum = 1;
  while (file.available()) {
    String line = file.readStringUntil('\n');  // 讀到換行符為止
    Serial.printf("第 %d 行：%s\n", lineNum++, line.c_str());
  }
  file.close();
}

// 呼叫示例：
// readFile(SD, "/hello.txt");
// readFileByLine(SD, "/config.txt");
```

ℹ️說明`file.available()` 回傳剩餘位元組數；`file.readStringUntil('\n')` 會把換行符之前的內容一次讀成 `String`， 注意大檔案別用 `String`，會爆記憶體，改用固定大小的 `char buf[128]` + `file.readBytesUntil()` 更安全。

#### 建立 / 刪除 / 重新命名

涵蓋資料夾的建立刪除、空檔案建立、檔案刪除、重新命名（也可用於「搬移」）。

```
// === 建立資料夾 ===
void createDir(fs::FS &fs, const char * path) {
  Serial.printf("建立資料夾：%s\n", path);
  if (fs.mkdir(path)) {
    Serial.println("✅ 資料夾建立成功");
  } else {
    Serial.println("❌ 建立失敗（可能已存在或父目錄不存在）");
  }
}

// === 建立空檔案 ===
// 直接用 FILE_WRITE 開啟再關閉就會建立一個空檔案
void createEmptyFile(fs::FS &fs, const char * path) {
  Serial.printf("建立空檔案：%s\n", path);
  File file = fs.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("❌ 建立失敗");
    return;
  }
  file.close();
  Serial.println("✅ 空檔案建立成功");
}

// === 刪除檔案 ===
void deleteFile(fs::FS &fs, const char * path) {
  Serial.printf("刪除檔案：%s\n", path);
  if (fs.remove(path)) {
    Serial.println("✅ 刪除成功");
  } else {
    Serial.println("❌ 刪除失敗（檔案不存在或權限問題）");
  }
}

// === 刪除資料夾（必須是空資料夾）===
void removeDir(fs::FS &fs, const char * path) {
  Serial.printf("刪除資料夾：%s\n", path);
  if (fs.rmdir(path)) {
    Serial.println("✅ 資料夾刪除成功");
  } else {
    Serial.println("❌ 刪除失敗（資料夾不為空或不存在）");
  }
}

// === 重新命名 / 搬移檔案 ===
void renameFile(fs::FS &fs, const char * oldPath, const char * newPath) {
  Serial.printf("重新命名：%s → %s\n", oldPath, newPath);
  if (fs.rename(oldPath, newPath)) {
    Serial.println("✅ 重新命名成功");
  } else {
    Serial.println("❌ 重新命名失敗");
  }
}

// 呼叫示例（按順序執行可演示完整流程）：
// createDir(SD, "/logs");
// createEmptyFile(SD, "/logs/empty.txt");
// renameFile(SD, "/logs/empty.txt", "/logs/data.txt");
// deleteFile(SD, "/logs/data.txt");
// removeDir(SD, "/logs");
```

⚠️注意`SD.rmdir()` **只能刪空資料夾**。如果要遞迴刪除整個目錄，需要先遍歷刪掉裡面所有檔案， 再刪資料夾本身，`SD.h` 函式庫沒有內建 `rm -rf`，需要自己寫遞迴函式。

------

### 程式碼說明

**為什麼 CMD 對應 MOSI？**
 SD 卡在 SPI 模式下，ESP32 發給卡的資料走的就是 CMD 腳位，所以 CMD = MOSI。這是 SD 協定 SPI 模式的硬性規定，不是接錯了。

**為什麼 D0 對應 MISO？**
 SPI 模式下，SD 卡把資料回傳給主機走 D0 腳位，所以 D0 = MISO。

**為什麼 D3 對應 CS？**
 SD 卡進入 SPI 模式後，D3 承擔片選（Chip Select）功能，低電位時卡被啟用。

**為什麼 D1、D2 不接？**
 它們是 4-bit SDIO 模式專用，SPI 模式用不到，空著就行。

**`SPIClass spi = SPIClass(FSPI)` 是什麼意思？**
 ESP32-S3 有多個 SPI 匯流排（FSPI / HSPI），這裡手動指定用 FSPI，避免和其他外設衝突。

------

## 常見問題排查

別慌，90% 的初始化失敗都出在這幾個地方，按順序查一遍基本能解決：

**1. Serial.println 卡在「SD 卡掛載失敗」不動？**
 先確認接線：GPIO5→CMD、GPIO13→D0、GPIO14→CLK、GPIO4→D3，任何一條接錯都會失敗。

**2. 接線沒問題，還是失敗？**
 把 SPI 頻率從 10MHz 降到 4MHz，改這一行：

```cpp
if (!SD.begin(SD_CS, spi, 4000000)) {
```

32G 卡對時序更挑剔，低頻率更容易跑通，跑通後再慢慢往上調。

**3. 串口根本沒有任何輸出？**
 檢查串口鮑率是不是 115200，以及 USB 線有沒有資料傳輸能力（純充電線不行）。

**4. 偶發掛載失敗，時好時壞？**
 供電問題。導線太長、接觸不良都會導致 SD 卡初始化時電壓抖動，嘗試縮短杜邦線、換品質好一點的線。

**5. 32G 卡掛載失敗，換 8G 就好了？**
 32G 卡通常是 SDHC 格式，需要格式化成 FAT32（Windows 預設給 32G 卡格式化成 exFAT，ESP32 的 `SD.h` 不支援 exFAT）。可以用 [SD Card Formatter](https://www.sdcard.org/downloads/formatter/) 格式化。

**6. 掛載成功但 listDir 沒有輸出任何檔案？**
 SD 卡可能是空的，或者根目錄檔案全在隱藏資料夾裡。往卡裡放一個 txt 檔案再測試。

------

## FAQ

**Q：我的 SD 卡模組是 5V 供電的，能接 ESP32-S3 嗎？**
 A：不建議。ESP32-S3 的 GPIO 是 3.3V 邏輯，如果模組沒有做電平轉換，訊號線直接接 5V 模組會導致腳位損壞。確認模組支援 3.3V 工作電壓，或者買帶電平轉換晶片的模組。

**Q：SPI 頻率設多少合適？**
 A：從 4000000（4MHz）開始，能跑通再試 10000000（10MHz）。理論上 SD 卡 SPI 模式最高支援 25MHz，但受杜邦線長度和模組品質影響，實際跑不了那麼高。

**Q：ESP32-S3 的哪些 GPIO 可以替換接 SD 卡？**
 A：ESP32-S3 的 FSPI 支援自訂腳位，理論上大多數 GPIO 都可以使用，但建議避開 GPIO0（Boot 模式腳位）、GPIO45/GPIO46（有固定功能）。換腳位後記得同步修改程式碼裡的 `SD_MOSI / SD_MISO / SD_SCK / SD_CS` 常數。

**Q：32G 的 SD 卡必須格式化 FAT32 嗎？不能用 exFAT？**
 A：Arduino 的 `SD.h` 函式庫只支援 FAT16 和 FAT32，不支援 exFAT。32G 及以下的卡格式化成 FAT32 沒有問題，推薦用 SD Card Formatter 工具，不要用 Windows 自帶的格式化（它會給 32G 卡預設 exFAT）。

**Q：SD 卡讀寫速度大概是多少？**
 A：SPI 模式下實際吞吐量大約在 500KB/s～2MB/s 之間，取決於 SPI 時脈頻率和卡的速度等級。如果需要更高速度，可以考慮 SDIO 4-bit 模式（需要換接法，不在本文範圍內）。

**Q：可以同時掛載多張 SD 卡嗎？**
 A：可以。SPI 匯流排支援多裝置，每張卡用不同的 CS 腳位，分別初始化成不同的 `SD` 實例即可。不過 `SD.h` 只支援單實例，多卡需要換用 `SD_MMC.h` 或第三方函式庫 SdFat。

**Q：ESP32-S3 執行這段程式碼，CPU 佔用高嗎？**
 A：不高。檔案列表操作是一次性的 I/O，`setup()` 執行完就結束，`loop()` 是空的，CPU 幾乎不佔用。如果你在 `loop()` 裡持續讀寫檔案，才需要關注效能。

------

## 延伸玩法

跑通了基礎讀取之後，這些方向可以繼續探索：

- **從 SD 卡播放 MP3**：搭配 ESP32-audioI2S 函式庫，接上 I2S DAC，從 SD 卡讀音訊檔案，告別網路卡頓
- **資料採集儲存**：感測器資料按時間戳寫入 CSV，斷電不遺失，方便後續用 Python 分析
- **接 TFT 螢幕**：讀取 SD 卡裡的圖片（BMP / JPG），顯示在螢幕上，做一個簡易相框
- **設定檔讀取**：把 Wi-Fi 帳號密碼寫在 SD 卡的 `config.json` 裡，程式碼不用每次修改再燒錄

------

## 參考資料

- [Espressif ESP32-S3 技術規格書](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [SD Specifications Part 1: Physical Layer Simplified Specification（SD 協會官方文件）](https://www.sdcard.org/downloads/pls/)
- [ESP32 Arduino Core 官方 GitHub](https://github.com/espressif/arduino-esp32)
- [SD Card Formatter 下載（官方格式化工具）](https://www.sdcard.org/downloads/formatter/)
- [Arduino SD 函式庫文件](https://www.arduino.cc/reference/en/libraries/sd/)
