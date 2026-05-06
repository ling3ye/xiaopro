---
title: "ESP32-S3 + 1.3\" SH1106 OLED 賽博養章魚｜I2C + U8g2 動畫教學"
boardId: esp32s3
moduleId: display/oled13-sh1106
category: esp32
date: 2026-05-06
intro: "ESP32-S3 驅動 1.3 吋 SH1106 OLED，用 U8g2 函式庫實現章魚游泳動畫 + 泡泡粒子特效。I2C 接線 4 根，Lissajous 曲線運動演算法，附避坑指南。"
image: "https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg"
---

# ESP32-S3 驅動 1.3" SH1106 OLED 完整教學——賽博養章魚動畫（I2C + U8g2）

難度：⭐⭐☆☆☆（新手可上手）
預計時間：30 分鐘
測試環境：Arduino IDE 2.3.8 · U8g2 v2.35.30 · ESP32 Board Package 3.3.8

---

> **TL;DR（快速上手）：**
>
> 1. 接線：SDA → GPIO 8，SCL → GPIO 9，VCC → 3.3V，GND → GND
> 2. 安裝函式庫：U8g2（作者 oliver）
> 3. 建構函式裡把 I2C 位址改成 `0x3C * 2`，Wire 初始化改成 `Wire.begin(8, 9)`
> 4. 燒錄程式，章魚開始游泳
> 5. 程式使用 Lissajous 曲線運動演算法，對演算法有興趣的可以詳細了解

---

## 前言

你有沒有在網購平台上刷到過那些 OLED 小螢幕——明明只有拇指指甲蓋那麼大，賣家影片裡卻能顯示出各種流暢動畫，看起來又炫又好玩。

我就是看完那段影片之後，第二天下午就下單了一塊 1.3 吋 SH1106 OLED。然後就遇到了經典問題：螢幕到手，程式上傳成功，亮了——但什麼都不顯示。

折騰了一個下午，發現坑主要集中在兩個地方：**I2C 腳位不是預設的 21/22**，還有 **SH1106 的驅動晶片不是 SSD1306**，兩個長得很像但不能混用。

搞清楚這兩點之後，後面就順了。本文目標：帶你 30 分鐘之內，讓一隻章魚在你的 OLED 螢幕上遊起來，還會吐泡泡。



---

## 實驗效果



![ESP32-canva-017-1inch3-oled (1) (1)](https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg)



一隻 32×32 像素的章魚在螢幕上游泳，運動軌跡是 Lissajous 曲線（就是那種 8 字形的優雅波浪），同時嘴部持續吐出大小不一、會慢慢飄散消失的氣泡。

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/zw06nh7wXp4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 元件說明

### 1.3" OLED SH1106

SH1106 是一款單色 OLED 驅動晶片，負責把你程式裡的 0 和 1 變成螢幕上亮著的像素點。可以把它理解成一個點陣翻譯官——你告訴它「第 30 行第 50 列亮起來」，它就去控制對應的有機發光二極體發光。

| 參數 | 數值 |
|------|------|
| 解析度 | 128 × 64 像素 |
| 驅動晶片 | SH1106（≠ SSD1306） |
| 通訊介面 | I2C（預設位址 0x3C） |
| 工作電壓 | 3.3V / 5V 相容 |
| 螢幕尺寸 | 1.3 吋 |

> 選它的理由：便宜、夠用，配合 U8g2 函式庫，點陣動畫輕鬆搞定。注意別買成 0.96 吋的 SSD1306，驅動晶片不一樣，程式直接套用會白屏。

---

## BOM 表

| 元件 | 數量 |
|------|------|
| ESP32-S3 開發板 | × 1 |
| 1.3" OLED SH1106（I2C） | × 1 |
| 杜邦線（公對母） | × 4 |

---

## 接線方式

| 1.3" OLED 腳位 | 接到 ESP32-S3 |
|-----------|---------------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

> 建議接完之後逐一核對，能省 80% 的排錯時間。SDA/SCL 接反是最常見的白屏原因，看起來完全正常通電，就是什麼都不顯示。

---

## 安裝函式庫

在 Arduino IDE 的函式庫管理員裡搜尋 **U8g2**，安裝 oliver 發佈的版本。

測試通過版本：**U8g2 v2.35.30**

U8g2 是 [olikraus/u8g2](https://github.com/olikraus/u8g2) 維護的開源顯示函式庫，支援幾乎所有常見的單色 OLED/LCD 驅動晶片，SH1106 當然也在其中。

---

## 完整程式

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// 第一步：宣告 U8g2 物件
// 注意：這裡選 SH1106，128×64，全緩衝模式，硬體 I2C
// U8G2_R2 = 螢幕旋轉 180 度（根據你的硬體焊接方向調整，不需要旋轉就換成 U8G2_R0）
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R2, /* reset=*/ U8X8_PIN_NONE);

// ==================== 章魚動畫影格（存在 Flash 裡，省 RAM）====================
// 4 張逐格動畫，每張 32×32 像素，XBM 點陣格式
const unsigned char animation_frame_0[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00,
  0x00, 0xFE, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00,
  0xE0, 0xFF, 0xFF, 0x01, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01,
  0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0x00, 0xEF, 0x3D, 0x00,
  0x00, 0xEF, 0x3D, 0x00, 0x00, 0xC7, 0x38, 0x00, 0x00, 0xC7, 0x38, 0x00,
  0x80, 0xC3, 0x70, 0x00, 0x80, 0xC3, 0x70, 0x00, 0x80, 0xC1, 0x60, 0x00,
  0x80, 0xC1, 0x60, 0x00, 0xC0, 0xC0, 0xC0, 0x00, 0xC0, 0xC0, 0xC0, 0x00,
  0x40, 0x80, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_1[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0xFC, 0x0F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01, 0xE0, 0xFF, 0xFF, 0x01,
  0xE0, 0xE7, 0xE7, 0x01, 0xE0, 0xE1, 0xE1, 0x01, 0xE0, 0xE7, 0xE7, 0x01,
  0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0x00, 0xFF, 0x3F, 0x00, 0x00, 0xFE, 0x1F, 0x00, 0x00, 0xDE, 0x1E, 0x00,
  0x00, 0xCF, 0x3C, 0x00, 0x80, 0xC7, 0x78, 0x00, 0xC0, 0xC3, 0xF0, 0x00,
  0xE0, 0xC1, 0xE0, 0x01, 0xE0, 0xC0, 0xC0, 0x01, 0xC0, 0xC0, 0xC0, 0x00,
  0x80, 0xC0, 0x40, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_2[] PROGMEM = {
  0x00, 0xF0, 0x00, 0x00, 0x00, 0xF8, 0x01, 0x00, 0x00, 0xFC, 0x03, 0x00,
  0x00, 0xFE, 0x07, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x80, 0xFF, 0x1F, 0x00, 0x80, 0xF9, 0x19, 0x00,
  0x80, 0xF0, 0x10, 0x00, 0x80, 0xF9, 0x19, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x00, 0xFE, 0x07, 0x00,
  0x00, 0xFC, 0x03, 0x00, 0x00, 0x6C, 0x03, 0x00, 0x00, 0x66, 0x06, 0x00,
  0x00, 0x63, 0x0C, 0x00, 0x80, 0x61, 0x18, 0x00, 0xC0, 0x60, 0x30, 0x00,
  0x60, 0x60, 0x60, 0x00, 0x30, 0x60, 0xC0, 0x00, 0x18, 0x60, 0x80, 0x01,
  0x0C, 0x60, 0x00, 0x03, 0x06, 0x60, 0x00, 0x06, 0x02, 0x60, 0x00, 0x04,
  0x00, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_3[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00, 0x00, 0xFE, 0x3F, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03, 0xF0, 0xF3, 0xF3, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x00, 0xF6, 0x06, 0x00,
  0x00, 0xF6, 0x06, 0x00, 0x00, 0x63, 0x0C, 0x00, 0x00, 0x63, 0x0C, 0x00,
  0x80, 0x61, 0x18, 0x00, 0x80, 0x61, 0x18, 0x00, 0x80, 0x60, 0x10, 0x00,
  0x80, 0x60, 0x10, 0x00, 0x40, 0x60, 0x20, 0x00, 0x40, 0x60, 0x20, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

// 把 4 張影格指標放進陣列，方便循環存取
const unsigned char* animation_frames[] = {
  animation_frame_0, animation_frame_1, animation_frame_2, animation_frame_3
};

const int TOTAL_FRAMES = 4;
const unsigned long FRAME_DELAY = 120; // 影格間隔（毫秒），改小就變快，改大就變慢
int currentFrame = 0;
unsigned long lastFrameTime = 0;
const int SPRITE_SIZE = 32; // 章魚點陣尺寸 32×32

// ==================== 泡泡粒子系統 ====================
#define MAX_BUBBLES 10 // 螢幕上最多同時存在 10 個泡泡

struct Bubble {
  float x;       // 目前 X 座標
  float y;       // 目前 Y 座標
  float radius;  // 目前半徑（浮點數，方便逐格縮小）
  float speedY;  // 每格上浮的像素數
  float wobble;  // 左右搖擺的隨機相位偏移
  bool active;   // 這個泡泡「活著」嗎
};

Bubble bubbles[MAX_BUBBLES]; // 物件池，避免動態分配記憶體

void setup() {
  Serial.begin(115200);

  // 第二步：用隨機種子讓每次開機的泡泡都不一樣
  randomSeed(analogRead(0));

  // 第三步：初始化 I2C，指定 SDA=8，SCL=9
  Wire.begin(8, 9);
  u8g2.setI2CAddress(0x3C * 2); // U8g2 要求位址左移一位，0x3C << 1 = 0x78
  u8g2.begin();

  // 第四步：把所有泡泡標記為未啟用
  for (int i = 0; i < MAX_BUBBLES; i++) {
    bubbles[i].active = false;
  }

  Serial.println("章魚水族箱啟動成功！");
}

void loop() {
  unsigned long currentTime = millis();

  // 用非阻塞計時代替 delay()，確保動畫流暢
  if (currentTime - lastFrameTime >= FRAME_DELAY) {
    lastFrameTime = currentTime;

    // ======== 第一步：用 Lissajous 曲線計算章魚位置 ========
    // 兩個不同頻率的正弦波疊加，產生優雅的 8 字形游動軌跡
    float t = currentTime * 0.0008;

    float waveX = sin(t * 0.8) * 0.6 + sin(t * 0.3) * 0.4;
    int posX = 48 + (int)(waveX * 48); // 橫向範圍大約 0~96

    float waveY = cos(t * 0.7) * 0.6 + sin(t * 0.4) * 0.4;
    int posY = 16 + (int)(waveY * 16); // 縱向範圍大約 0~32

    // ======== 第二步：25% 機率在章魚嘴邊生成一個新泡泡 ========
    if (random(100) < 25) {
      for (int i = 0; i < MAX_BUBBLES; i++) {
        if (!bubbles[i].active) {
          bubbles[i].active = true;
          bubbles[i].x      = posX + 16 + random(-8, 8);   // 嘴部附近隨機偏移
          bubbles[i].y      = posY + 24 + random(0, 5);
          bubbles[i].radius = random(15, 35) / 10.0;       // 1.5~3.5 像素
          bubbles[i].speedY = random(10, 25) / 10.0;       // 上浮速度隨機
          bubbles[i].wobble = random(0, 100) / 10.0;       // 搖擺相位隨機
          break; // 一格只生成一個
        }
      }
    }

    // ======== 第三步：清空緩衝區，開始繪製 ========
    u8g2.clearBuffer();

    // 繪製章魚本體（XBM 點陣圖）
    u8g2.drawXBMP(posX, posY, SPRITE_SIZE, SPRITE_SIZE, animation_frames[currentFrame]);

    // ======== 第四步：更新並繪製所有存活的泡泡 ========
    for (int i = 0; i < MAX_BUBBLES; i++) {
      if (bubbles[i].active) {
        bubbles[i].y -= bubbles[i].speedY; // 往上浮

        // 配合時間軸做左右搖擺，像真水裡的氣泡
        float currentX = bubbles[i].x + sin(t * 3.0 + bubbles[i].wobble) * 4.0;

        // 泡泡逐格縮小，模擬越飄越淡最後消失
        bubbles[i].radius -= 0.06;

        // 半徑太小或飄出螢幕頂部 → 回收這個泡泡
        if (bubbles[i].radius <= 0.5 || bubbles[i].y < -5) {
          bubbles[i].active = false;
        } else {
          // 畫空心圓——比實心圓更像真實氣泡
          u8g2.drawCircle((int)currentX, (int)bubbles[i].y, (int)bubbles[i].radius);
        }
      }
    }

    // 第五步：把緩衝區內容一次性推送到螢幕
    u8g2.sendBuffer();

    // 切換到下一格
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }
}
```

### 程式說明

**Lissajous 曲線運動**：兩個不同頻率的正弦/餘弦疊加，讓章魚走出優雅的 8 字形路徑，比簡單來回移動好看很多，而且只需要幾行三角函數。

**泡泡物件池**：提前分配好 10 個 `Bubble` 結構體，用 `active` 標誌位管理「生死」，避免 `new/delete` 帶來的記憶體碎片——在 MCU 上這是常見的省心寫法。

**`PROGMEM` 關鍵字**：點陣陣列加上這個關鍵字之後存進 Flash，不會佔用寶貴的 SRAM。4 張 × 128 位元組 = 512 位元組，放 RAM 裡有點浪費。

**非阻塞計時**：用 `millis()` 而不是 `delay()`，這樣泡泡的物理更新和章魚動畫影格切換可以在同一個迴圈裡自然協調，不會出現卡頓。

---

## 常見問題排查

別慌，90% 的問題出在這幾個地方：

**螢幕完全不亮 / 沒有任何輸出**
先檢查供電——VCC 接的是 3.3V 不是 5V（雖然很多模組相容 5V，但先確認）。然後用萬用電錶量一下 SDA/SCL 兩根線有沒有接反，這是最常見的錯誤。

**螢幕亮了但全白或全黑，看不到影像**
八成是 I2C 位址問題。程式裡用的是 `0x3C * 2`，這是 U8g2 的要求。如果你的螢幕背面 I2C 位址跳線是 `0x3D`，把 `0x3C` 改成 `0x3D` 再試。也可以先跑一遍 I2C Scanner 確認位址。

**影像顯示但上下顛倒**
把建構函式裡的 `U8G2_R2` 改成 `U8G2_R0` 即可，兩者的區別只是旋轉 180 度。

**章魚位置超出螢幕邊緣**
`posX` 的最大值大約是 96，加上 32 像素寬度正好到達 128 邊界。如果你改動了運動幅度參數，注意別讓座標超過 `128 - SPRITE_SIZE`。

**泡泡看起來很卡**
把 `FRAME_DELAY` 從 120 改小到 80 試試。如果還卡，檢查一下 I2C 匯流排速度，可以在 `Wire.begin(8, 9)` 之後加一行 `Wire.setClock(400000)` 切換到快速模式（400 kHz）。

---

## FAQ

**Q：能換成其他 GPIO 當 I2C 用嗎？**
A：可以，ESP32-S3 的 I2C 支援映射到任意 GPIO。把 `Wire.begin(8, 9)` 裡的數字改成你想用的腳位編號就行，SDA 在前，SCL 在後。

**Q：我的螢幕是 0.96 吋 SSD1306，程式能直接用嗎？**
A：不能直接用，驅動晶片不同。把建構函式換成 `U8G2_SSD1306_128X64_NONAME_F_HW_I2C`，其他程式部分可以保留。

**Q：I2C 速度支援多快？**
A：SH1106 標準模式 100 kHz，快速模式 400 kHz。本程式沒有顯式設定，預設走 100 kHz，如果覺得更新慢可以加 `Wire.setClock(400000)`。

**Q：PROGMEM 是做什麼的，可以刪掉嗎？**
A：`PROGMEM` 把陣列存進 Flash 而不是 SRAM。4 張點陣資料約 512 位元組，刪掉不影響功能，但會佔用 512 位元組 SRAM——ESP32-S3 SRAM 比較充裕，刪掉問題不大，建議保留是個好習慣。

**Q：想讓章魚遊得更快或更慢怎麼改？**
A：改 `FRAME_DELAY` 這個值——數字越小越快，越大越慢。泡泡的上浮速度由 `speedY` 範圍 `random(10, 25) / 10.0` 控制，同樣可以調。

**Q：螢幕用了多少 RAM？**
A：U8g2 全緩衝模式（`_F_`）會在 RAM 裡維護一個完整影格緩衝區，128×64 ÷ 8 = 1024 位元組，約 1KB。ESP32-S3 有 512KB SRAM，完全夠用。

---

## 延伸玩法

- **換個主角**：用 [image2cpp](https://javl.github.io/image2cpp/) 把任意黑白圖片轉成 XBM 點陣，換掉章魚
- **加感測器互動**：接一個聲音感測器，章魚的游速隨音量變化
- **多螢幕聯動**：兩塊 OLED 接在同一組 I2C 匯流排上（位址分別設 0x3C 和 0x3D），左右各一隻章魚
- **加 TFT 彩色螢幕版**：換成 ST7789 彩色 TFT，用灰階漸層做出更細膩的泡泡效果

---

## 參考資料

- [樂鑫 ESP32-S3 技術規格書（官方）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_cn.pdf)
- [U8g2 函式庫 GitHub 主頁（olikraus/u8g2）](https://github.com/olikraus/u8g2)
- [SH1106 驅動晶片資料手冊（Sino Wealth）](https://www.velleman.eu/downloads/29/infosheets/sh1106_datasheet.pdf)
- [image2cpp：圖片轉 XBM 點陣線上工具](https://javl.github.io/image2cpp/)
