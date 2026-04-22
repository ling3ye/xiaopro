---
title: "ESP32-S3 + PCM5102A 播放 MP3｜I2S 接線 + Arduino 程式碼全教學"
boardId: esp32s3
moduleId: audio/pcm5102a
category: esp32
date: 2026-04-22
intro: "ESP32-S3 透過 I2S 介面連接 PCM5102A DAC 模組，搭配 ESP32-audioI2S 函式庫實現 Wi-Fi 線上 MP3 播放。接線不超過 10 根，程式碼不超過 50 行，新手可直接上手。"
image: "https://img.lingflux.com/2026/04/0c35d50bc32e0bd67636e15a21d5e2ed.png"
---

# ESP32-S3 驅動 PCM5102A 播放 MP3 完整教學（I2S 接線 + Arduino 程式碼）

> **一句話摘要**：使用 ESP32-S3 開發板，透過 I2S 介面連接 PCM5102A DAC 模組，搭配 ESP32-audioI2S 函式庫，實現 Wi-Fi 線上 MP3 播放。接線不超過 10 根，程式碼不超過 50 行，新手可直接上手。

---

## TL;DR（快速上手版）

不想看廢話？直接看這裡：

1. ESP32-S3 的 GPIO17（BCK）、GPIO16（LCK）、GPIO15（DIN）分別接 PCM5102A 的 BCK、LCK、DIN
2. PCM5102A 的 XMT 腳位接 3.3V（或用 GPIO7 程式碼拉高），其餘控制腳位（FMT/SCL/DMP/FLT）全部接 GND
3. 安裝 Arduino 函式庫：ESP32-audioI2S（by schreibfaul1）
4. 複製本文程式碼，改 Wi-Fi 帳號密碼，燒錄，開聲

---



**ESP32-S3 + PCM5102A** 是目前 DIY 音訊專案裡性價比最高的組合之一：ESP32-S3 負責連 Wi-Fi、拉取 MP3、解碼音訊串流，PCM5102A 負責把數位訊號轉換成類比音訊輸出到耳機或音箱。整個方案成本不超過幾十塊，音質卻遠超同價位方案。

本文所有接線和程式碼均已實測通過，跟著一步步做，你也能實現同樣的效果。

---

## 最終效果

ESP32-S3 上電後自動連接 Wi-Fi，從網路拉取 MP3 音訊串流，透過 PCM5102A 解碼輸出，耳機或音箱裡播放出聲音。全程無需觸控螢幕、無需按鍵，上電即播。

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/CjGkTj7KaQo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## PCM5102A 音訊模組介紹

### PCM5102A 是什麼？

**PCM5102A** 是德州儀器（Texas Instruments）出品的一顆高性能立體聲 **DAC 晶片**（Digital-to-Analog Converter，數模轉換器）。

你的 ESP32-S3 輸出的是 **數位音訊訊號**（I2S 格式的 0 和 1），但耳機和音箱聽不懂數位訊號，它們只認 **類比電壓訊號**（隨時間變化的波形）。PCM5102A 就是這兩者之間的「同步口譯」，把數位訊號即時翻譯成音訊裝置能理解的類比訊號。

### PCM5102A 核心參數

| 參數 | 規格 |
|---|---|
| 介面類型 | I2S（與 ESP32 原生相容） |
| 支援取樣率 | 8kHz ～ 384kHz |
| 動態範圍 | 112dB（音質細膩，底噪極低） |
| 工作電壓 | 3.3V 單電源（與 ESP32 完美匹配） |
| MCLK | 內建 PLL，無需外部主時脈 |
| 輸出 | 內建差分驅動，抗干擾強 |

**為什麼選 PCM5102A？** 便宜、好用、3.3V 直接驅動、不需要外部時脈、動態範圍 112dB 在單晶片音訊裡相當能打——是 ESP32 專案裡最常見的 I2S DAC 搭檔。

### PCM5102A 腳位功能說明

| 腳位標籤 | 功能 | ESP32-S3 接法 | 備註 |
|---|---|---|---|
| **3.3V** | 邏輯電源（3.3V） | 接 ESP32 3.3V | 必須接 |
| **GND** | 地 | 接 ESP32 GND | 必須接，共地很重要 |
| **BCK** | I2S 位元時脈 | 接 GPIO17 | 核心 I2S 訊號 |
| **LCK** | I2S 左右聲道時脈（LRCK/WS） | 接 GPIO16 | 核心 I2S 訊號 |
| **DIN** | I2S 音訊資料輸入 | 接 GPIO15 | 核心 I2S 訊號 |
| **XMT** | 軟靜音控制（High = 正常輸出） | 接 3.3V 或 GPIO7 | **必須拉高，否則永遠無聲** |
| **FMT** | 音訊格式選擇（Low = I2S） | 接 GND | 接地即可 |
| **SCL** | 系統主時脈（內建 PLL 可省略） | 接 GND | 接地即可 |
| **DMP** | 去加重控制 | 接 GND | 接地即可 |
| **FLT** | 數位濾波器模式 | 接 GND | 接地即可 |

> **記住這條規則：** FMT、SCL、DMP、FLT 這四個控制腳位全部接地，簡單、穩定、不出錯。

---

## 所需材料（BOM 表）

| 元件 | 數量 | 說明 |
|---|---|---|
| ESP32-S3 開發板 | × 1 | 任意 ESP32-S3 DevKit 均可 |
| PCM5102A 音訊模組 | × 1 | 網購有售，約 10 元左右 |
| 跳線（杜邦線） | 若干 | 公對公 / 公對母視開發板而定 |
| 耳機或小音箱 | × 1 | 3.5mm 介面耳機或無源小音箱 |

---

## ESP32-S3 與 PCM5102A 接線方式

接線是整個實驗最容易出錯的環節。建議接完之後對照表格**逐一檢查一遍**，能省去 80% 的排錯時間。

| ESP32-S3 GPIO | PCM5102A 腳位 | 功能說明 |
|---|---|---|
| 3.3V | **3.3V** | 邏輯電源 |
| GND | **GND** | 地（必須共地！） |
| **GPIO 17** | **BCK** | I2S 位元時脈（Bit Clock） |
| **GPIO 16** | **LCK** | I2S 左右聲道時脈（LRCK/WS） |
| **GPIO 15** | **DIN** | I2S 音訊資料輸入 |
| **GPIO 7** | **XMT** | 軟靜音控制（程式碼裡拉高；也可直接接 3.3V） |
| GND | FMT / SCL / DMP / FLT | 格式與控制腳位（全部接地） |

---

## 需要安裝的 Arduino 函式庫

在 Arduino IDE 的函式庫管理員中搜尋並安裝：

**ESP32-audioI2S**（作者：schreibfaul1）

找不到的話可以去 GitHub 下載 ZIP 手動安裝：[https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

---

## 完整 Arduino 程式碼（測試通過）

以下程式碼已在 ESP32-S3 + PCM5102A 上測試通過，直接複製，改 Wi-Fi 資訊，上傳即可：

```cpp
// 更多實驗見 www.lingflux.com

#include <Arduino.h>
#include <WiFi.h>
#include <Audio.h>

// ── Wi-Fi 設定（改成你自己的）──────────────────────────
const char* ssid     = "你的WiFi名稱";
const char* password = "你的WiFi密碼";

// ── I2S 腳位定義 ─────────────────────────────────────────
#define I2S_BCLK  17   // BCK：位元時脈
#define I2S_LRCK  16   // LCK：左右聲道時脈
#define I2S_DOUT  15   // DIN：音訊資料
#define XMT        7   // XMT：軟靜音控制（HIGH = 正常輸出）

Audio audio;

void setup() {
  Serial.begin(115200);

  // 第一步：拉高 XMT，解除 PCM5102A 靜音
  pinMode(XMT, OUTPUT);
  digitalWrite(XMT, HIGH);

  // 第二步：連接 Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("正在連接 Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi 連線成功！");

  // 第三步：設定 I2S 腳位與音量
  audio.setPinout(I2S_BCLK, I2S_LRCK, I2S_DOUT);
  audio.setVolume(18);  // 音量範圍 0～21，18 是個舒服的值

  // 第四步：播放在線 MP3
  audio.connecttohost("https://pixabay.com/music/download/id-219731.mp3");
  Serial.println("開始播放音訊...");
}

void loop() {
  // 持續呼叫，維持音訊解碼與播放（不能省！）
  audio.loop();
}

// 除錯回呼：列印函式庫執行狀態（排錯時很有用）
void audio_info(const char *info) {
  Serial.print("Audio Info: ");
  Serial.println(info);
}
```

**程式碼說明：**

- `audio.setVolume(18)`：音量範圍 0～21，18 是預設測試值，可自行調整。
- `connecttohost()`：支援 HTTP / HTTPS 直鏈 MP3，失效了換一個即可。
- `audio.loop()`：必須放在 `loop()` 裡持續呼叫，負責維持音訊串流的解碼和輸出，不能刪，也不能在旁邊加太多耗時操作。

---

## 常見問題與排查（FAQ）

### Q：接好線上電後完全沒有聲音，怎麼排查？

沒有聲音是新手最常遇到的問題，按以下順序逐一檢查，90% 的情況都能解決：

**① 檢查共地** ESP32-S3 和 PCM5102A 的 GND 必須用杜邦線連在一起。沒有共地，訊號無法形成迴路，任何聲音都不會出現。這是新手最容易忽略的一步。

**② 檢查 I2S 腳位是否接錯** BCK、LCK、DIN 三根線，接錯或接反任意一根都會導致完全無聲或持續雜音。對照下表重新確認一遍：

| ESP32-S3 GPIO | PCM5102A 腳位 |
| ------------- | ------------- |
| GPIO 17       | BCK           |
| GPIO 16       | LCK           |
| GPIO 15       | DIN           |

**③ 檢查 XMT 是否拉高** XMT 是 PCM5102A 的軟靜音控制腳：LOW = 靜音，HIGH = 正常播放。如果忘記拉高，晶片會一直處於靜音狀態，任何設定都沒有聲音。 解決方法：程式碼裡加上 `digitalWrite(7, HIGH)`，或直接用杜邦線把 XMT 接到 3.3V。

------

### Q：播放時出現輕微的「滴滴」（di di）或「咔噠」（tick tick）爆音，是什麼原因？

這是 ESP32 音訊專案中討論最多的問題之一，原因較多，需要逐一排查。以下按機率從高到低列出常見原因和對應解決方法：

**原因一：I2S 緩衝區欠載（Buffer Underrun）**（機率最高）

ESP32 在解碼 MP3 或從網路/SD 卡讀取資料時，若 CPU 負載突然升高、緩衝區過小或解碼速度跟不上 I2S 輸出速率，就會出現短暫的資料中斷。PCM5102A 收到連續時脈但資料線短暫為零時，就會產生可重複的爆音。如果爆音總在歌曲的同一位置出現，基本可以確認是這個原因（高位元率段、複雜幀或特定格式問題導致單幀處理耗時驟增）。

解決方法：增大 `i2s_config` 中的 `dma_buf_count`（推薦 8～16）和 `dma_buf_len`（推薦 256～1024）；如果使用 `xTaskCreate` 建立音訊任務，將其優先級調高，高於 Wi-Fi 和其他背景任務。使用 ESP32-audioI2S 等函式庫時，檢查並調大函式庫內的 buffer size 設定。

**原因二：取樣率或位元深度設定不匹配**

音訊檔案取樣率（44.1kHz / 48kHz）與 ESP32 I2S 設定不一致，或者 24bit 與 16bit 混用時容易觸發。

解決方法：將所有音訊檔案統一轉換為 44.1kHz、16bit、Stereo（可用 ffmpeg 批次處理）；I2S 設定中明確設定 `bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT`；確認 PCM5102A 模組的 SCK/FLT/DEMP/FMT 腳位均已接地，啟用內部 PLL 模式。

**原因三：硬體訊號完整性問題**

I2S 連線過長、沒有串聯阻尼電阻，訊號邊緣會產生振鈴（ringing），進而引發咔噠聲；ESP32 的 Wi-Fi/CPU 活動也可能透過共用的 3.3V 電源注入雜訊。

解決方法：在 BCK、LCK、DIN 三根訊號線上各串聯一個 33～100Ω 電阻（靠近 ESP32 端放置）；給 PCM5102A 單獨加 10μF + 0.1μF 去耦電容，或使用獨立 LDO 供電；連線盡量短，並遠離 ESP32 的 Wi-Fi 天線區域。

**原因四：PCM5102A 內部自動靜音觸發**

當 DIN 資料短暫為零或低電位時，晶片內部的智慧靜音邏輯會觸發，產生輕微的 pop 聲，在靜音段或音量較低部分更為明顯。

解決方法：在播放開始/結束或緩衝區為空時，軟體層面插入淡入淡出（fade in/out）過渡；避免向 I2S 填充純零資料，改為填充極小幅度的靜音幀。

**快速驗證步驟：** 先用標準 WAV 檔案（44.1kHz 16bit）測試，繞過 MP3 解碼，確認是否仍在固定位置爆音；再逐步加回 MP3 解碼、網路拉流，縮小問題範圍。

------

### Q：線上播放時卡頓或中斷，怎麼處理？

線上播放依賴網路品質，訊號弱或頻寬不穩定時容易卡頓。可先換一個速度更快的 MP3 直鏈測試；若網路本身沒問題，改為從 SD 卡或 SPIFFS 讀取本地音訊檔案，可以徹底排除網路因素。

------

### Q：ESP32-S3 的 I2S 腳位可以換成其他 GPIO 嗎？

可以。ESP32-S3 的 I2S 外設支援任意 GPIO 映射，直接修改程式碼中的 `#define I2S_BCLK`、`I2S_LRCK`、`I2S_DOUT` 的值即可，不受固定腳位限制。

------

### Q：PCM5102A 支援哪些取樣率？

PCM5102A 支援 8kHz、16kHz、32kHz、44.1kHz、48kHz、96kHz、192kHz 和 384kHz，完整覆蓋日常 MP3（通常為 44.1kHz）的所有播放需求。

------

### Q：PCM5102A 可以用 5V 供電嗎？

部分帶 LDO 的 PCM5102A 模組支援 5V 輸入，內部會降壓至 3.3V。如果你的模組只標註了 3.3V 腳位而沒有 5V 腳位，請直接接 3.3V。建議優先使用 3.3V 供電，更穩定，也與 ESP32-S3 的邏輯電平完全匹配。

------

### Q：ESP32-S3 播放 MP3 時 CPU 佔用高嗎？

ESP32-audioI2S 函式庫會利用 ESP32-S3 的雙核架構，將音訊解碼任務執行在獨立核心上，對主迴圈影響極小。日常使用中 CPU 佔用通常在 10%～30% 之間，不會影響其他並發任務。

------

### Q：可以同時播放音訊和驅動 TFT 螢幕嗎？

可以。ESP32-S3 的效能足以同時處理 I2S 音訊輸出和 SPI TFT 顯示。需要注意的是，`loop()` 中不能有長時間阻塞的操作，否則會影響 `audio.loop()` 的呼叫頻率，導致音訊卡頓或爆音。

------

### Q：PCM5102A 的輸出介面是什麼？可以接功放嗎？

PCM5102A 模組通常提供標準 3.5mm 立體聲類比音訊輸出，可直接接耳機或無源音箱。如果需要接功放，建議使用模組上的 LINE OUT 介面，輸出電平更適合功放輸入，音質也更好。

------

### Q：ESP32-S3 與普通 ESP32 在 I2S 音訊上有什麼區別？

ESP32-S3 的主頻（240MHz 雙核）高於早期 ESP32 版本，MP3 等格式的解碼更流暢，丟幀和爆音的機率更低。同時 ESP32-S3 的 GPIO 資源更豐富，適合同時跑音訊、顯示和網路的複合專案。

---

## 參考資料

- **PCM5102A 官方資料手冊（Texas Instruments）：**
  [https://www.ti.com/lit/ds/symlink/pcm5102a.pdf](https://www.ti.com/lit/ds/symlink/pcm5102a.pdf)

- **ESP32-audioI2S 函式庫（GitHub，by schreibfaul1）：**
  [https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

- **Espressif ESP32-S3 技術文件：**
  [https://www.espressif.com/zh-hans/products/socs/esp32-s3](https://www.espressif.com/zh-hans/products/socs/esp32-s3)

---

*更多 ESP32 實驗與教學見 [www.lingflux.com](http://www.lingflux.com)*
