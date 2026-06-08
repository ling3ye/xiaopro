---
title: "ESP32-S3 + INMP441 + GC9A01 DIY 圓形音頻頻譜儀｜I2S + FFT + SPI 完整教學"
boardId: esp32s3
moduleId: audio/inmp441
category: esp32
date: 2026-06-08
intro: "用 ESP32-S3 讀取 INMP441 數位麥克風的 I2S 音頻，經 512 點 FFT 分析後在 GC9A01 圓形 TFT 螢幕上即時繪製 16 段彩虹頻譜柱。附完整接線、函式庫安裝和程式碼註解。"
image: "https://img.lingflux.com/2026/06/7747ada90e61ba2360585e6934fbf7a7.jpg"
---

> **一句話摘要**：ESP32-S3 + INMP441 麥克風 + GC9A01 圓形螢幕，做一個會「跳舞」的圓形音頻頻譜儀，I2S + FFT + SPI 全流程教學。

# ESP32-S3 + INMP441 + GC9A01 做一個會「跳舞」的圓形音頻頻譜儀完整教學（I2S + FFT + SPI）

難度：⭐⭐⭐☆☆（有點 Arduino 基礎就能上手）
預計時間：45 分鐘
測試環境：
Arduino IDE 2.3.8
GFX Library for Arduino v1.6.5
arduinoFFT v2.0.4

---

> **TL;DR（不想看廢話版）：**
> 1. **接線**：INMP441 的 SD→GPIO4，WS→GPIO5，SCK→GPIO6，**L/R 必須接 GND**
> 2. **接線**：GC9A01 的 SCL→GPIO12，SDA→GPIO11，CS→GPIO9，DC→GPIO10，RST→GPIO18，BL→GPIO7
> 3. **安裝函式庫**：GFX Library for Arduino（作者 moononournation）+ `arduinoFFT`（作者 kosme）
> 4. **貼程式碼、燒錄、對著麥克風說話**，圓圈裡的彩虹柱就跳起來了

---

## 前言

自從買了塊 1.28 吋圓形螢幕之後，都挺好玩的，圓形有很多場景跟方形不太一樣，現在我 就透過 INMP441 麥克風模組和它做一件特別好看的事：**即時音頻頻譜視覺化**。

你說「頻譜儀」，腦子裡可能先浮現出 Winamp 那種上世紀風格的長條柱（我 以前電腦上安裝過，聽著歌，看著頻頻的跳動可以看一下午）。但圓形的頻譜就不一樣了——16 條彩虹色柱子從圓心往外輻射，音量越大柱子越長，每條柱子頂端還有一個白色峰值光點緩緩下落……說實話，我 對著它發呆了五分鐘沒去吃飯。

本文手把手帶你用 **ESP32-S3 + INMP441 數位麥克風 + GC9A01 圓形 TFT 螢幕**，從接線到程式碼，做出一個即時回應聲音的圓形彩虹頻譜儀。有點基礎的 maker 跟著做，45 分鐘內能看到效果。

---

## 實驗效果

![](https://img.lingflux.com/2026/06/21a134efbde1457cff0817a7e18879f3.jpg)

- 即時採集麥克風音頻（44.1kHz，16bit）
- 512 點 FFT 分析，分成 16 個頻段
- 圓形螢幕上彩虹柱從內向外輻射，峰值白點緩降
- 更新率約 20fps，肉眼看完全流暢

---

## 元件說明

### GC9A01 圓形 TFT 螢幕

如果說普通矩形螢幕是「直板手機」，GC9A01 就是「智慧手錶錶盤」——**1.28 吋圓形 LCD，驅動晶片就叫 GC9A01，走 SPI 匯流排，3.3V 工作**，8 根線就能驅動。

| 參數 | 值 |
| --- | --- |
| 螢幕尺寸 | 1.28 吋 |
| 解析度 | 240 × 240 像素 |
| 介面 | SPI（4 線） |
| 工作電壓 | 3.3V |
| 驅動晶片 | GC9A01 |
| 面板類型 | IPS（全視角） |

選它的理由：市面上最常見的圓形小螢幕，Arduino_GFX 函式庫原生支援，5 行程式碼初始化，坑極少。

---

### INMP441 MEMS 數位麥克風

INMP441 是一顆**全向 MEMS 數位麥克風**，說人話就是：**它直接輸出數位 I2S 訊號，不用接 ADC**。就像你請了一個同步翻譯，說什麼它幫你即時翻譯成 MCU 能懂的數位訊號，省去了類比訊號那一堆麻煩。

| 參數 | 值 |
| --- | --- |
| 介面 | I2S（數位音頻） |
| 工作電壓 | 1.8V ～ 3.3V |
| 頻率響應 | 60Hz ～ 15kHz |
| 訊噪比 | 61dBA |
| 靈敏度 | -26dBFS（典型值） |
| 拾音方向 | 全向 |

選它的理由：I2S 介面乾淨，不需要額外 ADC，訊噪比 61dBA 比大多數廉價類比咪頭強一截，做頻譜綽綽有餘。

> 值得注意的是 INMP441 原本由應美盛（InvenSense，後被 TDK 收購）生產，官方早已經將其列為 **Obsolete（淘汰/停產）** 狀態。在貿澤（Mouser）、得捷（DigiKey）等主流正規元器件經銷商處，它已經被打上了停產標籤。而市場上（如某寶、某多）大量幾塊錢一個的 INMP441 藍色/黑色小板子依然供貨充足。這主要是因為大陸市場仍有大量的**庫存尾貨**，或者市場上存在一些**相容/翻新的國產晶片**在繼續沿用這個名字。如果你只是做個人 DIY、寫教學或跑小 Demo，目前買到的模組依然能用。
>
> **因此，如果你是要開發產品這個型號的模組並不是首選。**

---

## BOM 表

| 元件 | 型號 / 規格 | 數量 |
| --- | --- | --- |
| 主控開發板 | ESP32-S3（帶 USB-C） | 1 |
| 圓形 TFT 螢幕 | GC9A01，1.28 吋，240×240 | 1 |
| 數位麥克風 | INMP441 I2S 模組 | 1 |
| 杜邦線 |  | 若干 |

---

## 元件腳位說明

### GC9A01 螢幕腳位

| 腳位 | 功能說明 |
| --- | --- |
| VCC | 電源正（接 3.3V） |
| GND | 電源負 |
| SCL / CLK | SPI 時脈 |
| SDA / MOSI | SPI 資料（主機傳送） |
| CS | 片選（低電位有效） |
| DC | 資料 / 命令選擇 |
| RST | 重置（低電位觸發） |
| BL | 背光控制（接 3.3V 常亮，或接 GPIO 用 PWM 調光） |

### INMP441 麥克風腳位

| 腳位 | 功能說明 |
| --- | --- |
| VDD | 電源正（接 3.3V） |
| GND | 電源負 |
| SD | I2S 資料輸出（接 ESP32 資料輸入） |
| WS | 字時脈 / 幀同步（左右聲道選擇） |
| SCK | 位元時脈 |
| L/R | 聲道選擇：接 GND = 左聲道，接 3.3V = 右聲道，**不能懸空** |

---

## 接線方式

**建議接完一根對照表核對一根，能省 80% 的除錯時間。**

### GC9A01 螢幕接線

| 模組腳位 | ESP32-S3 | 線色參考 |
| --- | --- | --- |
| VCC | 3.3V | 紅 |
| GND | GND | 灰 |
| SCL / CLK | GPIO12 | 黃 |
| SDA / MOSI | GPIO11 | 藍 |
| CS | GPIO9 | 綠 |
| DC | GPIO10 | 橙 |
| RST | GPIO18 | 紫 |
| BL | GPIO7 / 3.3V | 青 |

### INMP441 麥克風接線

| 模組腳位 | ESP32-S3 | 線色參考 |
| --- | --- | --- |
| VDD | 3.3V | 紅 |
| GND | GND | 灰 |
| SD | GPIO4 | 藍 |
| WS | GPIO5 | 綠 |
| SCK | GPIO6 | 黃 |
| L/R | GND（左聲道） | 灰 |

> ⚠️ **L/R 必須接，不能懸空。** 懸空會導致聲道選擇未定義，採集到的全是雜訊，頻譜柱會亂跳跟聲音毫無關係——別問我 怎麼知道的。

####

- 務必使用 **3.3V** 供電，不要接 5V
- INMP441 的 L/R 腳位接 GND = 左聲道輸出
- 先接好線，供電和接地線用萬用電表測試一下再通電，避免短路

---

## 需要安裝的函式庫

在 **Arduino IDE → 工具 → 管理函式庫** 中搜尋並安裝：

| 函式庫名稱 | 作者 | 測試通過版本 | 用途 |
| --- | --- | --- | --- |
| `Arduino_GFX_Library` | moononournation | v1.6.5 | GC9A01 螢幕驅動 |
| `arduinoFFT` | kosme | v2.0.4 | 快速傅立葉變換 |

> I2S 驅動（`driver/i2s.h`）是 ESP32 內建函式庫，不需要額外安裝。
>
> Arduino IDE 建議用 **2.3.x 及以上版本**，舊版 1.x 對 ESP32-S3 的支援不穩定。

---

## 完整程式碼

```cpp
#include <Arduino_GFX_Library.h>
#include <driver/i2s.h>
#include <arduinoFFT.h>

// ====== 步驟 1：定義螢幕腳位 ======
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// ====== 步驟 2：定義麥克風腳位 ======
#define I2S_WS    5
#define I2S_SD    4
#define I2S_SCK   6
#define I2S_PORT  I2S_NUM_0

// ====== FFT 參數 ======
#define SAMPLES   512
#define BANDS     16

// ====== 初始化 GC9A01 螢幕 ======
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0, true);

// ====== FFT 緩衝區 ======
double vReal[SAMPLES];
double vImag[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>(
  vReal, vImag, SAMPLES, 44100);

// ====== 頻段能量與峰值 ======
float bandValues[BANDS];
float peakValues[BANDS];
int16_t sampleBuf[SAMPLES];

// ====== 顏色工具：HSL 轉 RGB565 ======
uint16_t hslToRgb565(float h, float s, float l) {
  float c = (1.0f - fabsf(2.0f * l - 1.0f)) * s;
  float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
  float m = l - c / 2.0f;
  float r, g, b;
  if (h < 60)       { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  uint8_t R = (uint8_t)((r + m) * 31);
  uint8_t G = (uint8_t)((g + m) * 63);
  uint8_t B = (uint8_t)((b + m) * 31);
  return (R << 11) | (G << 5) | B;
}

// ====== 步驟 3：初始化麥克風 I2S ======
void setupMicrophone() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

void setup() {
  Serial.begin(115200);

  // 步驟 4：開啟背光，初始化螢幕
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  gfx->begin();
  gfx->fillScreen(0x0000);

  // 步驟 5：初始化麥克風
  setupMicrophone();

  memset(peakValues, 0, sizeof(peakValues));
}

// ====== 繪製圓形頻譜 ======
void drawCircularSpectrum() {
  int cx = 120, cy = 120;
  int innerR = 25;
  int maxLen = 85;
  float angleStep = 2.0f * PI / BANDS;
  float barWidth = angleStep * 0.7f;

  gfx->fillScreen(0x0000);

  for (int i = 0; i < BANDS; i++) {
    float angle = i * angleStep - PI / 2.0f;
    float hue = (float)i / BANDS * 360.0f;
    float val = bandValues[i];
    int barLen = (int)(val * maxLen);

    for (int r = innerR; r < innerR + barLen; r += 2) {
      float t = (float)(r - innerR) / maxLen;
      uint16_t color = hslToRgb565(hue, 1.0f, 0.3f + t * 0.3f);
      float x1 = cx + cosf(angle - barWidth/2) * r;
      float y1 = cy + sinf(angle - barWidth/2) * r;
      float x2 = cx + cosf(angle + barWidth/2) * r;
      float y2 = cy + sinf(angle + barWidth/2) * r;
      gfx->drawLine(x1, y1, x2, y2, color);
    }

    if (peakValues[i] > 0.02f) {
      int peakR = innerR + (int)(peakValues[i] * maxLen) + 3;
      float px = cx + cosf(angle) * peakR;
      float py = cy + sinf(angle) * peakR;
      gfx->fillCircle(px, py, 2, 0xFFFF);
    }

    peakValues[i] *= 0.95f;
    if (bandValues[i] > peakValues[i]) {
      peakValues[i] = bandValues[i];
    }
  }
}

void loop() {
  // 步驟 6：讀取麥克風 I2S 資料
  size_t bytes_read = 0;
  i2s_read(I2S_PORT, sampleBuf, sizeof(sampleBuf),
           &bytes_read, portMAX_DELAY);

  // 步驟 7：將取樣資料填入 FFT 實部
  for (int i = 0; i < SAMPLES; i++) {
    vReal[i] = (double)sampleBuf[i];
    vImag[i] = 0.0;
  }

  // 步驟 8：執行 FFT
  FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  FFT.compute(FFT_FORWARD);
  FFT.complexToMagnitude();

  // 步驟 9：將 FFT 結果映射到 16 個頻段
  memset(bandValues, 0, sizeof(bandValues));
  int specLen = SAMPLES / 2;
  for (int i = 0; i < BANDS; i++) {
    int start = (int)(pow((float)i / BANDS, 1.8f) * specLen * 0.7f);
    int end   = (int)(pow((float)(i+1) / BANDS, 1.8f) * specLen * 0.7f);
    if (end <= start) end = start + 1;
    float sum = 0;
    for (int j = start; j < end && j < specLen; j++) {
      sum += (float)vReal[j];
    }
    float avg = sum / (end - start);
    bandValues[i] = constrain(avg / 5000.0f, 0.0f, 1.0f);
  }

  // 步驟 10：繪製圓形頻譜
  drawCircularSpectrum();
}
```

---

## 程式碼說明

**① 為什麼 SAMPLES = 512？**
512 是 2 的冪次，FFT 演算法在這種長度下效率最高。以 44.1kHz 取樣率為例，512 點 FFT 的頻率解析度約為 86Hz——夠用了。換成 256 更快但頻率細節少，換成 1024 更細膩但更新率會明顯下降。

**② 頻段分佈為什麼用 pow(..., 1.8)?**
線性分頻段會讓高頻區域的頻段擠滿資料，低頻卻空空如也。指數分法讓低頻頻段更窄（細膩）、高頻頻段更寬（合併噪音），和人耳的頻率感知曲線更接近，看起來更「正常」。

**③ 正規化除以 5000 是怎麼來的？**
這個值和你的麥克風距離聲源、環境音量都有關係——不同場景需要手動調。如果柱子總是頂到頭（能量截斷），就把 5000 改大；如果柱子太矮幾乎看不見，就改小。

**④ peakValues[i] *= 0.95 的作用？**
這是「峰值保持 + 緩降」的經典手法：聲音突然停止時，峰值白點不會瞬間消失，而是每幀乘以 0.95 緩緩下落，視覺上更順暢，像專業音頻設備那種效果。

---

## 常見問題排查

**別慌，90% 的問題出在這幾個地方：**

**螢幕全黑，什麼都不顯示**
先檢查背光（BL 腳位）是否真的拉高了（如果你的模組沒有 BL 腳位可以忽略），再檢查 SPI 四根線（SCK / MOSI / CS / DC）有沒有接錯或接虛。用萬用電表量一下 VCC 是否有 3.3V 輸出。如果背光亮但螢幕全黑，十有八九是 CS 或 DC 接錯了，換過來試試。

**頻譜柱一動不動，或者亂跳跟聲音毫無關係**
第一件事：**確認 INMP441 的 L/R 腳位接了 GND**，這是最常踩的坑。懸空的 L/R 會導致聲道選擇異常，採集到的全是隨機雜訊。L/R 接好之後再檢查 SD / WS / SCK 三根線的 GPIO 編號。

**頻譜柱全部頂到頭（能量一直最大）**
把程式碼裡 `bandValues[i] = constrain(avg / 5000.0f, ...)` 中的 `5000` 改大，比如 `15000` 或 `30000`。麥克風離聲源太近也會這樣，先把麥克風移遠 30cm 試試。

**頻譜柱有反應，但只有少數幾根動**
可能是測試用的聲源頻率範圍太窄（比如只用單音哨聲）。換一段全頻段音樂（帶低音、人聲、高頻樂器的），看各頻段是否都有回應。

**編譯失敗：ArduinoFFT 模板類別報錯**
確認安裝的是 `arduinoFFT`（kosme 版）**v2.x**。v1.x 的寫法是 `ArduinoFFT FFT`（沒有模板參數），v2.x 才是 `ArduinoFFT<double>`，兩個版本 API 不相容。在函式庫管理員裡直接更新到最新版本即可。

---

## FAQ

**Q：INMP441 的 L/R 腳位不接會怎樣？**
A：聲道選擇懸空，麥克風輸出行為未定義，實測大概率採集到全是雜訊的隨機資料，頻譜柱會亂跳，和聲音完全無關。接 GND = 左聲道，接 3.3V = 右聲道，二選一，不能不接。

**Q：SAMPLES 能改成 1024 嗎？會有什麼影響？**
A：可以改，頻率解析度從約 86Hz 提升到約 43Hz，低頻細節更豐富。代價是每幀採集和計算時間翻倍，更新率會從約 20fps 降到約 10fps。對頻譜視覺化來說 10fps 肉眼仍然可以接受。

**Q：只有 3.3V，INMP441 能正常工作嗎？**
A：完全沒問題。INMP441 支援 1.8V ～ 3.3V 供電，3.3V 是最常見的工作電壓，不需要額外降壓模組。

**Q：ESP32-S3 的 CPU 佔用率高嗎，會影響其他任務嗎？**
A：512 點 FFT 在 ESP32-S3 的 240MHz 主頻下大約佔單核 10%～15% 的 CPU 時間。如果還需要跑 Wi-Fi 或藍牙，建議把 FFT + 繪圖放到 Core 0，網路任務放到 Core 1，兩者互不干擾。

**Q：GC9A01 能換成 ST7789 或其他螢幕驅動嗎？**
A：可以換。Arduino_GFX_Library 支援幾十種驅動晶片，把程式碼裡的 `Arduino_GC9A01` 換成對應的類別（如 `Arduino_ST7789`），修改解析度參數，接線參考新螢幕資料手冊即可。注意非圓形螢幕需要重新計算圓心座標。

**Q：頻譜安靜時有「底噪」，柱子不歸零，怎麼辦？**
A：INMP441 本身有底噪（SNR 61dBA 意味著總有極少量環境噪音被採入），可以加一個噪音門限：在映射前加一行 `if (avg < 200) avg = 0;`，安靜時柱子就能完全歸零了。同時把正規化除數適當調大也有幫助。

**Q：ESP32-S3 用的是哪個版本的 I2S 驅動？**
A：本文使用的是 ESP-IDF v4.x 風格的舊版 I2S 驅動（`i2s_driver_install` / `i2s_read`）。ESP-IDF v5.x 引入了新版 I2S API（`i2s_new_channel` 等），如果你的 ESP32-S3 板支援包升級到了 3.x，需要參考新版 API 對 `setupMicrophone()` 函式進行改寫。

---

## 延伸玩法

- 換成 32 個頻段，搭配更大圓形螢幕（如 2.1 吋 GC9A01A），頻譜更細膩
- 加觸控按鍵切換顯示模式（圓形輻射 / 直向柱形 / 示波器波形）
- 接入 Wi-Fi，把頻譜資料推送到瀏覽器，在網頁裡再渲染一遍
- 用兩塊 INMP441 實現立體聲，左右聲道分別用不同顏色呈現

---

## 參考資料

- [INMP441 官方資料手冊 — TDK InvenSense](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [GC9A01 驅動晶片資料手冊](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [arduinoFFT GitHub — kosme](https://github.com/kosme/arduinoFFT)
- [ESP32-S3 技術規格書 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP-IDF I2S 驅動文件 — Espressif](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)