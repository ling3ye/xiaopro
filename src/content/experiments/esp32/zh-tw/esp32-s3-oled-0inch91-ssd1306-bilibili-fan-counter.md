---
title: "ESP32-S3 + 0.91吋 OLED 打造桌面 Bilibili 粉絲「解壓」計數器｜附彈簧阻尼物理抖動"
boardId: esp32s3
moduleId: display/oled091-ssd1306
category: esp32
date: 2026-06-27
intro: "用 ESP32-S3 和 0.91 吋 SSD1306 OLED（128×32）做一個桌面 Bilibili 粉絲計數器，數字變化時帶有絲滑的彈簧阻尼物理回彈動畫。I2C 四線接線 + Arduino C++ 完整程式碼，附避坑指南。"
image: "https://img.lingflux.com/2026/06/e53fb5a7bdaee8448584fb9f21aa504d.jpg"
---

> **一句話摘要**：ESP32-S3 + 0.91" OLED + Bilibili API，做一個會「彈簧阻尼回彈」的桌面粉絲計數器，告別天天掏手機刷資料。

難度：⭐⭐☆☆☆（新手可上手）
預計時間：30 分鐘
測試環境：Arduino IDE 2.3.8 + ESP32 開發板支援包 v3.3.10 + U8g2 v2.36.19 + ArduinoJson v7.4.3

> **TL;DR（快速上手）：**
>
> 1. 接線：ESP32-S3 GPIO 14 → OLED SDA，GPIO 13 → OLED SCL，再接 3.3V 和 GND。
> 2. 檢查：確保螢幕供電正常，I2C 腳位切勿接反。
> 3. 安裝函式庫：在 Arduino IDE 中搜尋並安裝 `U8g2`（作者: oliver）和 `ArduinoJson`（作者: Benoit Blanchon）。
> 4. 修改設定：在完整程式碼中換上你的 Wi-Fi 帳號密碼和 Bilibili UID，直接燒錄，靜待粉絲數伴隨絲滑的機械回彈動畫躍然螢幕上！

---

## 前言

用這個小小的 OLED 螢幕做了一個魔性、解壓的桌面 Bilibili 粉絲計數器！再也不用翻開手機看資料了。

---

## 實驗效果

最終我實現的效果是一個優雅的三段式精緻佈局：左側直排硬核的「FANS」標識和機械指示箭頭；中間是本次實驗的靈魂——24像素高、純數字粗體、自帶局部裁切視窗的**物理阻尼滾動輪大字**；右側則是今日粉絲增量（自動計算今日漲跌幅並配有升降三角箭頭）以及系統 Wi-Fi 訊號強度和心跳指示燈。

![](https://img.lingflux.com/2026/06/13648c6923d1cb24486cb082105d8d59.jpg)

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/NEaawjnVx0Q" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## 元件說明

### 0.91" OLED 螢幕（SSD1306）

本專案除了核心開發板（ESP32-S3）外，最關鍵的元件就是這塊 **0.91" OLED 螢幕**。

0.91" OLED 螢幕是一個「自發光的同步口譯員」，負責把 ESP32-S3 從網路拉取到的粉絲數字，即時翻譯成你肉眼可見的像素點陣。由於它每個像素點自己都會發光，不需要傳統 LCD 那種厚重的背光板，所以對比度極高，黑得深邃、亮得刺眼。本專案選擇它的原因在於其體積極其小巧、價格親民，且透過 I2C 走線只需要 4 條線即可驅動，非常適合做桌面精緻小擺件。

| 關鍵參數 | 參數值 |
| --- | --- |
| 驅動晶片 | SSD1306 |
| 解析度 | 128 x 32 像素 |
| 通訊介面 | I2C (IIC) |
| 工作電壓 | 3.3V ~ 5V |
| 顯示顏色 | 通常為純白或純藍 |

---

## BOM 表

| 元件名稱 | 規格/型號 | 數量 | 用途 |
| --- | --- | --- | --- |
| ESP32-S3 開發板 | 任意標準雙 Type-C 介面版本 | 1 | 主控中心，負責聯網拉取資料及物理動畫計算 |
| 0.91" OLED 模組 | SSD1306 驅動 / 4 接腳 I2C 介面 | 1 | 畫面顯示與物理視窗動畫呈現 |
| 杜邦線 | 母對母 / 公對母（依開發板而定） | 4 | 連接開發板與螢幕接腳 |

---

## 元件腳位說明與接線方式

> 💡 **實用提醒：** 建議接完線後對著下表逐一核對，通常 80% 的無聲、黑屏或設備發燙問題都出在接錯線上，多花 10 秒核對能省下你大把的除錯時間！

| OLED 螢幕腳位 | ESP32-S3 腳位 | 腳位功能描述 |
| --- | --- | --- |
| GND | GND | 接地（說同一種語言的基準線） |
| VCC | 3.3V（或 3V3） | 供電電源輸入 |
| SCL | GPIO 13 | I2C 時鐘訊號線 |
| SDA | GPIO 14 | I2C 資料訊號線 |

---

## 需要安裝的函式庫

在 Arduino IDE 2.x 中，點擊左側的「函式庫管理員」圖示（或按 `Ctrl+Shift+I`），分別搜尋並安裝以下開源函式庫的指定測試通過版本：

1. **U8g2**（作者：oliver）—— 測試通過版本：`v2.36.19` 及以上。用於驅動 OLED 螢幕，支援精密裁切視窗（Clip Window）。
2. **ArduinoJson**（作者：Benoit Blanchon）—— 測試通過版本：`v7.4.3`。用於解析 Bilibili API 回傳的 JSON 資料。

---

## 完整程式碼 + 說明

請將以下完整程式碼複製到 Arduino IDE 中。在燒錄前，**請務必將程式碼中 `const char* ssid` 和 `password` 修改為你自家的 Wi-Fi 帳號密碼，並將 `uid` 替換為你想要監控的 Bilibili 使用者 UID**。

```cpp
/**
 * =========================================================================
 * ESP32-S3 0.91" OLED (128x32 SSD1306) Bilibili 粉絲顯示器終極融合版
 * =========================================================================
 * 特性：精緻三段式佈局 + 純正彈簧阻尼回彈物理抖動引擎
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Preferences.h>
#include <time.h>

// ================== 除錯開關 ==================
#define DEBUG_SIMULATE   0     // 【重要】1=開啟模擬資料(無需聯網測試動畫), 0=關閉使用真實API
#define SIM_INTERVAL_MS  2000  // 模擬資料變化間隔(ms)
#define SIM_START_VALUE  9985  // 模擬起始粉絲數 (設為9985可快速觀察跳躍到5位數的抖動特效)

// ================== 使用者設定 ==================
const char* ssid     = "YOUR_WIFI_SSID";      // 換成你的 Wi-Fi 名稱
const char* password = "YOUR_WIFI_PASSWORD";  // 換成你的 Wi-Fi 密碼
const char* uid      = "YOUR_BILIBILI_UID";   // 換成你想監控的 Bilibili UID

String biliApiUrl = "https://api.bilibili.com/x/relation/stat?vmid=" + String(uid);
const unsigned long FETCH_INTERVAL = 30 * 60 * 1000; // 每30分鐘聯網刷新一次資料

#define OLED_SDA 14
#define OLED_SCL 13
#define SCREEN_CONTRAST 255

// 動畫參數
#define SCROLL_EASING    0.18f   // 基礎彈簧拉力係數
#define ANIM_FPS         60      // 動畫幀率
#define ANIM_INTERVAL    (1000/ANIM_FPS)

// 初始化 U8g2 建構器
U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

// ================== 狀態變數 ==================
long targetFollowers = 0;
long todayBaseFollowers = 0;
long todayAdded = 0;
bool isInitialFetch = true;
bool connectionError = false;

unsigned long lastFetchTime = 0;
unsigned long lastAnimTime = 0;
unsigned long lastSimTime = 0;

Preferences preferences; // 用於將今日初始粉絲數安全保存在 Flash 中，斷電不遺失

// ================== 核心物理阻尼震動引擎 ==================
#define MAX_DIGITS 7

class DigitWheel {
public:
  float currentY = 0.0f;
  int   targetDigit = 0;
  float velocity = 0.0f;  // 彈簧阻尼核心速度變數

  void update(float easing) {
    float diff = (float)targetDigit - currentY;

    // 就近原則處理循環滾動 (0 <-> 9)
    if (diff > 5.0f)  diff -= 10.0f;
    if (diff < -5.0f) diff += 10.0f;

    if (fabs(diff) > 0.005f) {
      // 經典物理模型：胡克定律 + 粘滯阻尼，從而產生絲滑的回彈與衰減抖動
      float accel = diff * easing - velocity * 0.25f;
      velocity += accel;
      currentY += velocity;

      // 循環範圍約束
      while (currentY >= 10.0f) currentY -= 10.0f;
      while (currentY < 0.0f)   currentY += 10.0f;
    } else {
      currentY = (float)targetDigit;
      velocity = 0.0f; // 穩定停靠
    }
  }
};

DigitWheel wheels[MAX_DIGITS];

// 前置宣告
void drawUI();
void drawLeftPanel();
void drawBigOdometer();
void drawRightPanel();
void drawWifiIcon(int x, int y);
void fetchBiliData();
void checkNewDayReset();

// ================== 初始化 ==================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Bilibili OLED Monitor Deluxe ===");

  Wire.begin(OLED_SDA, OLED_SCL);
  u8g2.begin();
  u8g2.setContrast(SCREEN_CONTRAST);
  u8g2.enableUTF8Print();

  // 第一步：繪製優雅的啟動畫面
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_7x13B_tr);
  u8g2.drawStr(20, 14, "BiliBili");
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(28, 28, "Fan Monitor");
  u8g2.sendBuffer();
  delay(800);

  preferences.begin("bilibili", false);
  todayBaseFollowers = preferences.getLong("base_fans", 0);

#if DEBUG_SIMULATE
  Serial.println("[SIM MODE] Simulation mode active");
  targetFollowers = SIM_START_VALUE;
  if (todayBaseFollowers == 0) {
    todayBaseFollowers = targetFollowers - 10; // 預設今日已增長 10
  }
  todayAdded = targetFollowers - todayBaseFollowers;
  isInitialFetch = false;
#else
  // 第二步：連接本地無線網路
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(4, 14, "WiFi connecting...");
  u8g2.drawStr(4, 28, ssid);
  u8g2.sendBuffer();

  WiFi.begin(ssid, password);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 30) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK: " + WiFi.localIP().toString());
    // 第三步：設定時間服務用於零點自動重置
    configTime(8 * 3600, 0, "ntp.aliyun.com", "time.windows.com");
    fetchBiliData();
  } else {
    Serial.println("\nWiFi failed");
    connectionError = true;
    targetFollowers = 0;
  }
#endif
}

// ================== 主迴圈 ==================
void loop() {
  unsigned long now = millis();

#if DEBUG_SIMULATE
  // 模擬資料業務：穩步跳躍，方便觀察多位滾輪同時回彈的奇妙動態
  if (now - lastSimTime >= SIM_INTERVAL_MS) {
    lastSimTime = now;
    int delta = random(-2, 6); // 產生 -2 到 +5 的隨機震盪增長
    targetFollowers += delta;
    if (targetFollowers < 0) targetFollowers = 0;
    todayAdded = targetFollowers - todayBaseFollowers;
    Serial.printf("[SIM] target=%ld (delta=%+d) today=%+ld\n", targetFollowers, delta, todayAdded);
  }
#else
  // 定時拉取真實網路資料
  if (now - lastFetchTime >= FETCH_INTERVAL || lastFetchTime == 0) {
    fetchBiliData();
    lastFetchTime = now;
  }
  checkNewDayReset();
#endif

  // 第四步：核心動畫刷新（穩定在 60FPS 滿幀運行）
  if (now - lastAnimTime >= ANIM_INTERVAL) {
    lastAnimTime = now;

    // 將粉絲總數解析到每一位對應的獨立滾輪目標上
    long temp = targetFollowers;
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      wheels[i].targetDigit = temp % 10;
      temp /= 10;
    }

    // 更新物理引擎，融合高位級聯延遲，使多位數字波動更富有交錯的層次感
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      float ease = SCROLL_EASING * (1.0f - i * 0.012f);
      if (ease < 0.07f) ease = 0.07f;
      wheels[i].update(ease);
    }

    // 第五步：全畫布渲染輸出
    u8g2.clearBuffer();
    drawUI();
    u8g2.sendBuffer();
  }
}

// ================== UI 佈局繪製 (三段式經典設計) ==================
void drawUI() {
  drawLeftPanel();    // 左側直排標籤
  drawBigOdometer();  // 中間物理滾輪大字
  drawRightPanel();   // 右側增量與訊號
}

void drawLeftPanel() {
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(2, 7,  "F");
  u8g2.drawStr(2, 14, "A");
  u8g2.drawStr(2, 21, "N");
  u8g2.drawStr(2, 28, "S");

  u8g2.drawVLine(9, 2, 28); // 直分隔線
  u8g2.drawTriangle(11, 14, 11, 18, 14, 16); // 指向大數字的機械箭頭
}

void drawRightPanel() {
  int rx = 102; // 右側面板起始X軸
  u8g2.drawVLine(rx - 2, 2, 28); // 右分隔線

  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(rx, 6, "TODAY");

  u8g2.setFont(u8g2_font_5x7_tr);
  char buf[8];
  if (todayAdded >= 0) {
    u8g2.drawTriangle(rx, 14, rx + 4, 14, rx + 2, 10); // 上升三角
    snprintf(buf, sizeof(buf), "%ld", todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  } else {
    u8g2.drawTriangle(rx, 10, rx + 4, 10, rx + 2, 14); // 下降三角
    snprintf(buf, sizeof(buf), "%ld", -todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  }

  u8g2.setFont(u8g2_font_4x6_tr);
#if DEBUG_SIMULATE
  u8g2.drawStr(rx, 24, "SIM");
  if ((millis() / 400) % 2) u8g2.drawDisc(rx + 17, 22, 1); // 模擬心跳閃爍
#else
  if (connectionError) {
    u8g2.drawStr(rx, 24, "ERR");
  } else {
    u8g2.drawStr(rx, 24, "ON");
  }
#endif

  drawWifiIcon(rx + 12, 27); // 繪製訊號條
}

void drawWifiIcon(int x, int y) {
#if DEBUG_SIMULATE
  int bars = 3;
#else
  int bars = 0;
  if (WiFi.status() == WL_CONNECTED) {
    int rssi = WiFi.RSSI();
    if (rssi > -60)      bars = 3;
    else if (rssi > -75) bars = 2;
    else                 bars = 1;
  }
#endif
  for (int i = 0; i < 3; i++) {
    int h = (i + 1) * 2;
    if (i < bars) {
      u8g2.drawBox(x + i * 3, y - h, 2, h);
    } else {
      u8g2.drawFrame(x + i * 3, y - h, 2, h);
    }
  }
}

// ================== 核心滾輪渲染 (帶局部 Clip 精密視窗) ==================
void drawBigOdometer() {
  u8g2.setFont(u8g2_font_logisoso24_tn); // 24像素高超大硬核數字粗體

  int charW = 14;      // 單一數字字寬寬度
  int areaTop = 4;     // 滾動視窗上邊緣
  int areaBot = 28;    // 滾動視窗下邊緣
  int areaH = areaBot - areaTop; // 視窗有效高度 (24px)
  int baseline = areaBot;        // 字體基線高度

  // 動態計算有效位數，實現完美的左向自適應置中對齊
  long absVal = targetFollowers;
  int needDigits = 1;
  long t = absVal;
  while (t >= 10) { t /= 10; needDigits++; }
  if (needDigits > MAX_DIGITS) needDigits = MAX_DIGITS;

  int totalW = needDigits * charW;
  int startX = 14 + (88 - totalW) / 2;
  if (startX < 14) startX = 14;

  // 逐位渲染擁有物理回彈回饋的數字
  for (int idx = 0; idx < needDigits; idx++) {
    int wheelIdx = MAX_DIGITS - needDigits + idx;
    int x = startX + idx * charW;

    float currYVal = wheels[wheelIdx].currentY;
    int digitLower = (int)currYVal;
    int digitUpper = (digitLower + 1) % 10;
    float fraction = currYVal - digitLower;

    // 【核心裁切控制】：為當前位數字客製局部裁切視窗，使得數字溢出上下邊緣時自動隱形
    u8g2.setClipWindow(x - 1, areaTop, x + charW, areaBot);

    // 當前數字因為受拉力而向上滑出
    int yLower = baseline - (int)(fraction * areaH);
    char bufL[2] = { (char)('0' + digitLower), 0 };
    u8g2.drawStr(x, yLower, bufL);

    // 新的下一個數字從下方衝入視窗，並在到位時產生富有動能的回彈
    int yUpper = baseline + areaH - (int)(fraction * areaH);
    char bufU[2] = { (char)('0' + digitUpper), 0 };
    u8g2.drawStr(x, yUpper, bufU);

    u8g2.setMaxClipWindow(); // 渲染完當前位後，立即恢復全螢幕畫布
  }
}

// ================== 網路資料拉取 ==================
#if !DEBUG_SIMULATE
void fetchBiliData() {
  if (WiFi.status() != WL_CONNECTED) {
    connectionError = true;
    return;
  }
  Serial.println("Requesting Bilibili API...");
  WiFiClientSecure client;
  client.setInsecure(); // 繞過 SSL 憑證強校驗，確保輕量連線
  HTTPClient http;
  http.begin(client, biliApiUrl);
  http.setUserAgent("Mozilla/5.0 (ESP32)");
  http.addHeader("Referer", "https://space.bilibili.com/");

  int code = http.GET();
  if (code == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, payload)) {
      long fans = doc["data"]["follower"].as<long>();
      if (fans > 0) {
        targetFollowers = fans;
        connectionError = false;
        if (isInitialFetch) {
          if (todayBaseFollowers == 0) {
            todayBaseFollowers = fans;
            preferences.putLong("base_fans", fans);
          }
          isInitialFetch = false;
        }
        todayAdded = targetFollowers - todayBaseFollowers;
        Serial.printf("Fetch Success! Fans=%ld Today=%+ld\n", targetFollowers, todayAdded);
      }
    } else {
      connectionError = true;
    }
  } else {
    Serial.printf("HTTP Code Error: %d\n", code);
    connectionError = true;
  }
  http.end();
}

void checkNewDayReset() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;
  static int lastResetDay = -1;
  // 零點整準時觸發今日基準基數刷新
  if (timeinfo.tm_hour == 0 && timeinfo.tm_min == 0 && timeinfo.tm_mday != lastResetDay) {
    lastResetDay = timeinfo.tm_mday;
    todayBaseFollowers = targetFollowers;
    preferences.putLong("base_fans", todayBaseFollowers);
    todayAdded = 0;
    Serial.println("[RTC] Midnight detected. Resetting today's base counter.");
  }
}
#endif
```

### 程式碼關鍵步驟說明

1. **啟動畫面繪製**：在 `setup()` 中呼叫 `u8g2.drawStr()` 繪製初現的動畫 Logo，給系統提供視覺緩衝。
2. **Wi-Fi 與時間初始化**：呼叫 `WiFi.begin()` 連入網路，並透過 `configTime()` 掛載阿里雲 NTP 時間伺服器，確保本地能夠精準捕獲零點到來。
3. **資料請求偽裝**：透過 `http.setUserAgent()` 和 `addHeader("Referer", ...)` 將 ESP32 偽裝成一個正常的電腦瀏覽器請求，防止被 Bilibili 的防爬機制無情攔截。
4. **彈簧阻尼物理迭代**：在 `DigitWheel::update` 中，運用經典物理學公式（加速度 = 距離 × 拉力係數 − 速度 × 阻尼係數）動態衰減速度值。這正是產生魔性機械回彈、而不是生硬死板劃過的靈性所在！
5. **局部裁切視窗（Clip Window）控制**：在渲染數字時，利用 `u8g2.setClipWindow(x, 4, w, 28)` 規定只有在這個中間高度內才顯示像素，出了這個格子立刻隱形，從而完美模擬出了實體滾輪吃角子老虎機的機械縫隙感。

---

## 常見問題排查

別慌！95% 的新手在搭建這類小硬體專案時，遇到的問題基本都出在下面這幾個地方：

* **螢幕一片漆黑，什麼都不顯示**：
  1. 優先檢查接線：確認螢幕的 VCC 是否接在了 3.3V，GND 是不是鬆動了。
  2. 檢查 SDA 和 SCL 腳位是否接反了。程式碼中指定的是 `SDA -> 14`、`SCL -> 13`。
  3. 確認你的 OLED 螢幕驅動晶片是否為經典的 `SSD1306`。市面上極少數長得一樣的螢幕使用的是 `SH1106`，如果是後者，需要更換 U8g2 的建構器初始化函式。

* **右側狀態一直顯示 "ERR"**：
  1. 代表網路請求或解析出錯了。檢查你的 `ssid` 和 `password` 是否設定正確。注意：ESP32 **不支援 5G 頻段的 Wi-Fi**，請務必連接 2.4G 頻段的無線網路或手機熱點。
  2. 檢查你的 UID 是否輸入正確，可以在瀏覽器開啟 `https://api.bilibili.com/x/relation/stat?vmid=你的UID` 看看是否有正確的 JSON 資料回傳。

---

## FAQ 問答

**Q：我想改用其他 GPIO 腳位連螢幕可以嗎？**
A：完全可以！你只需在程式碼頂部的 `#define OLED_SDA 14` 和 `#define OLED_SCL 13` 處，把數字改成你 ESP32-S3 開發板上任意空閒的腳位編號即可。改完記得把杜邦線也一起拔過去。

**Q：為什麼我燒錄之後數字卡在 0 動都不動？**
A：因為程式碼中 `#define DEBUG_SIMULATE` 預設設為了 `0`（使用真實網路拉取）。由於聯網獲取頻率設為了 30 分鐘，可能剛開機時由於 Wi-Fi 還在連接導致首幀未獲取成功。你可以將該巨集改為 `1` 開啟模擬模式，即可立刻看到數字每 2 秒隨機跳躍並瘋狂觸發抖動動畫的震撼效果！

**Q：我想讓它刷新得更頻繁一些，怎麼改？**
A：修改設定區的 `const unsigned long FETCH_INTERVAL = 30 * 60 * 1000;` 即可。不過不建議設定得太頻繁（比如低於 10 秒），否則可能因為頻繁請求 Bilibili 介面而被伺服器暫時封鎖你的公用 IP。

**Q：斷電之後今天漲的粉絲數就歸零了嗎？**
A：不會！程式碼內部呼叫了 ESP32 的 `Preferences` 函式庫。每當跨入新的一天成功捕獲到基準粉絲數時，它就會把這個數字安全地鎖進 ESP32 內部的 Flash 快閃記憶體晶片裡。即使徹底斷電拔掉線，再次開機時它依然能記得今天最初的粉絲起點是多少，從而精準計算今日增量。

**Q：這個物理效果可以移植到更大解析度的螢幕（如 128x64）上嗎？**
A：當然可以。在 `drawBigOdometer()` 函式中，有專門用於高度控制的變數 `areaTop`、`areaBot`、`baseline` 和字號設定。如果換成大螢幕，只需要成比例放大視窗裁剪區座標並更換更大的 U8g2 粗體字庫（如 logisoso42 等），就能獲得更大的滾動輪特效。

**Q：為什麼螢幕顯示訊號強度一直是滿格或是不太準？**
A：在 `drawWifiIcon` 裡我們讀取的是 `WiFi.RSSI()`（接收訊號強度指示）。程式碼透過 `-60dBm` 和 `-75dBm` 兩個硬閾值切分成了 3 檔。如果你的設備距離無線路由器比較近，一般訊號就會穩定在 3 格滿格狀態。

---

## 延伸玩法

做完這個實驗，你的硬核極客桌面已經初具雛形了。下一步你還可以這樣魔改它：

* **接入多平台監控**：多寫一個 API 解析，讓螢幕每隔 10 秒在「Bilibili 粉絲數」和「抖音/GitHub 關注數」之間絲滑滾動輪播。
* **加裝震動馬達**：在開發板腳位上接一個微型扁平震動馬達，每當粉絲數增加時，馬達配合數字滾動的節奏發出微弱的「噠噠噠」機械觸感回饋，解壓效果直接翻倍！
* **添加外殼 3D 列印**：為你的 ESP32 和 OLED 螢幕設計一個復古電視機造型的迷你 3D 列印外殼，瞬間變成桌面藝術品。

---

## 參考資料

* [Espressif 樂鑫官方 ESP32-S3 資料手冊及硬體設計指南](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
* [U8g2 官方 GitHub 開源主頁及高畫質字庫腳位設定說明](https://github.com/olikraus/u8g2)
* [ArduinoJson 官方高效解析與串流解析範例指南](https://arduinojson.org/)
