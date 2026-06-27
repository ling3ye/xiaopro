---
title: "ESP32-S3 + 0.91寸 OLED 打造桌面 B站粉丝「解压」计数器｜带弹簧阻尼物理抖动"
boardId: esp32s3
moduleId: display/oled091-ssd1306
category: esp32
date: 2026-06-27
intro: "用 ESP32-S3 和 0.91 寸 SSD1306 OLED（128×32）做一个桌面 B站粉丝计数器，数字变化时带有丝滑的弹簧阻尼物理回弹动画。I2C 四线接线 + Arduino C++ 完整代码，附避坑指南。"
image: "https://img.lingflux.com/2026/06/e53fb5a7bdaee8448584fb9f21aa504d.jpg"
---

> **一句话摘要**：ESP32-S3 + 0.91" OLED + B站 API，做一个会「弹簧阻尼回弹」的桌面粉丝计数器，告别天天掏手机刷数据。

# ESP32-S3 + 0.91" OLED 打造桌面 B站粉丝「解压」计数器（带弹簧阻尼物理抖动！）

难度：⭐⭐☆☆☆（新手可上手）
预计时间：30 分钟
测试环境：Arduino IDE 2.3.8 + ESP32 主板支持包 v3.3.10 + U8g2 v2.36.19 + ArduinoJson v7.4.3

> **TL;DR（快速上手）：**
>
> 1. 接线：ESP32-S3 GPIO 14 → OLED SDA，GPIO 13 → OLED SCL，再接 3.3V 和 GND。
> 2. 检查：确保屏幕供电正常，I2C 引脚切勿接反。
> 3. 安装库：在 Arduino IDE 中搜索并安装 `U8g2`（作者: oliver）和 `ArduinoJson`（作者: Benoit Blanchon）。
> 4. 修改配置：在完整代码中换上你的 Wi-Fi 账号密码和 B 站 UID，直接烧录，静待粉丝数伴随丝滑的机械回弹动画跃然屏上！

---

## 前言

用这个小小的 OLED 屏幕做了一个魔性、解压的桌面 B站粉丝计数器！再也不用翻开手机看数据了。

---

## 实验效果

最终我实现的效果是一个优雅的三段式精致布局：左侧竖排硬核的 “FANS” 标识和机械指示箭头；中间是本次实验的灵魂——24像素高、纯数字粗体、自带局部裁切视窗的**物理阻尼滚动轮大字**；右侧则是今日粉丝增量（自动计算今日涨跌幅并配有升降三角箭头）以及系统 Wi-Fi 信号强度和心跳指示灯。

![](https://img.lingflux.com/2026/06/13648c6923d1cb24486cb082105d8d59.jpg)

---

## 元件说明

### 0.91" OLED 屏幕（SSD1306）

本项目除了核心开发板（ESP32-S3）外，最关键的元件就是这块 **0.91" OLED 屏幕**。

0.91" OLED 屏幕是一个「自发光的同声传译员」，负责把 ESP32-S3 从网络拉取到的粉丝数字，实时翻译成你肉眼可见的像素点阵。由于它每个像素点自己都会发光，不需要传统 LCD 那种厚重的背光板，所以对比度极高，黑得深邃、亮得刺眼。本项目选择它的原因在于其体积极其小巧、价格亲民，且通过 I2C 走线只需要 4 根线即可驱动，非常适合做桌面精致小摆件。

| 关键参数 | 参数值 |
| --- | --- |
| 驱动芯片 | SSD1306 |
| 分辨率 | 128 x 32 像素 |
| 通信接口 | I2C (IIC) |
| 工作电压 | 3.3V ~ 5V |
| 显示颜色 | 通常为纯白或纯蓝 |

---

## BOM 表

| 元件名称 | 规格/型号 | 数量 | 用途 |
| --- | --- | --- | --- |
| ESP32-S3 开发板 | 任意标准双 Type-C 接口版本 | 1 | 主控中心，负责联网拉取数据及物理动画计算 |
| 0.91" OLED 模块 | SSD1306 驱动 / 4 管脚 I2C 接口 | 1 | 画面显示与物理视窗动画呈现 |
| 杜邦线 | 母对母 / 公对母（依开发板而定） | 4 | 连接开发板与屏幕管脚 |

---

## 元件引脚说明与接线方式

> 💡 **实用提醒：** 建议接完线后对着下表逐一核对，通常 80% 的无声、黑屏或设备发烫问题都出在接错线上，多花 10 秒核对能省下你大把的排错时间！

| OLED 屏幕引脚 | ESP32-S3 管脚 | 引脚功能描述 |
| --- | --- | --- |
| GND | GND | 接地（说同一种语言的基准线） |
| VCC | 3.3V（或 3V3） | 供电电源输入 |
| SCL | GPIO 13 | I2C 时钟信号线 |
| SDA | GPIO 14 | I2C 数据信号线 |

---

## 需要安装的库

在 Arduino IDE 2.x 中，点击左侧的「库管理器」图标（或按 `Ctrl+Shift+I`），分别搜索并安装以下开源库的指定测试通过版本：

1. **U8g2**（作者：oliver）—— 测试通过版本：`v2.36.19` 及以上。用于驱动 OLED 屏幕，支持精密裁切视窗（Clip Window）。
2. **ArduinoJson**（作者：Benoit Blanchon）—— 测试通过版本：`v7.4.3`。用于解析 B 站 API 返回的 JSON 数据。

---

## 完整代码 + 说明

请将以下完整代码复制到 Arduino IDE 中。在烧录前，**请务必将代码中 `const char* ssid` 和 `password` 修改为你自家的 Wi-Fi 账号密码，并将 `uid` 替换为你想要监控的 B 站用户 UID**。

```cpp
/**
 * =========================================================================
 * ESP32-S3 0.91" OLED (128x32 SSD1306) Bilibili 粉丝显示器终极融合版
 * =========================================================================
 * 特性：精致三段式布局 + 纯正弹簧阻尼回弹物理抖动引擎
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Preferences.h>
#include <time.h>

// ================== 调试开关 ==================
#define DEBUG_SIMULATE   0     // 【重要】1=开启模拟数据(无需联网测试动画), 0=关闭使用真实API
#define SIM_INTERVAL_MS  2000  // 模拟数据变化间隔(ms)
#define SIM_START_VALUE  9985  // 模拟起始粉丝数 (设为9985可快速观察跳跃到5位数的抖动特效)

// ================== 用户配置 ==================
const char* ssid     = "YOUR_WIFI_SSID";      // 换成你的 Wi-Fi 名称
const char* password = "YOUR_WIFI_PASSWORD";  // 换成你的 Wi-Fi 密码
const char* uid      = "YOUR_BILIBILI_UID";   // 换成你想监控的 B 站 UID

String biliApiUrl = "https://api.bilibili.com/x/relation/stat?vmid=" + String(uid);
const unsigned long FETCH_INTERVAL = 30 * 60 * 1000; // 每30分钟联网刷新一次数据

#define OLED_SDA 14
#define OLED_SCL 13
#define SCREEN_CONTRAST 255

// 动画参数
#define SCROLL_EASING    0.18f   // 基础弹簧拉力系数
#define ANIM_FPS         60      // 动画帧率
#define ANIM_INTERVAL    (1000/ANIM_FPS)

// 初始化 U8g2 构造器
U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

// ================== 状态变量 ==================
long targetFollowers = 0;
long todayBaseFollowers = 0;
long todayAdded = 0;
bool isInitialFetch = true;
bool connectionError = false;

unsigned long lastFetchTime = 0;
unsigned long lastAnimTime = 0;
unsigned long lastSimTime = 0;

Preferences preferences; // 用于将今日初始粉丝数安全保存在 Flash 中，断电不丢失

// ================== 核心物理阻尼震动引擎 ==================
#define MAX_DIGITS 7

class DigitWheel {
public:
  float currentY = 0.0f;
  int   targetDigit = 0;
  float velocity = 0.0f;  // 弹簧阻尼核心速度变量

  void update(float easing) {
    float diff = (float)targetDigit - currentY;

    // 就近原则处理循环滚动 (0 <-> 9)
    if (diff > 5.0f)  diff -= 10.0f;
    if (diff < -5.0f) diff += 10.0f;

    if (fabs(diff) > 0.005f) {
      // 经典物理模型：胡克定律 + 粘滞阻尼，从而产生丝滑的回弹与衰减抖动
      float accel = diff * easing - velocity * 0.25f;
      velocity += accel;
      currentY += velocity;

      // 循环范围约束
      while (currentY >= 10.0f) currentY -= 10.0f;
      while (currentY < 0.0f)   currentY += 10.0f;
    } else {
      currentY = (float)targetDigit;
      velocity = 0.0f; // 稳定停靠
    }
  }
};

DigitWheel wheels[MAX_DIGITS];

// 前置声明
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

  // 第一步：绘制优雅的启动画面
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
    todayBaseFollowers = targetFollowers - 10; // 预设今日已增长 10
  }
  todayAdded = targetFollowers - todayBaseFollowers;
  isInitialFetch = false;
#else
  // 第二步：连接本地无线网络
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
    // 第三步：配置时间服务用于零点自动重置
    configTime(8 * 3600, 0, "ntp.aliyun.com", "time.windows.com");
    fetchBiliData();
  } else {
    Serial.println("\nWiFi failed");
    connectionError = true;
    targetFollowers = 0;
  }
#endif
}

// ================== 主循环 ==================
void loop() {
  unsigned long now = millis();

#if DEBUG_SIMULATE
  // 模拟数据业务：稳步跳跃，方便观察多位滚轮同时回弹的奇妙动态
  if (now - lastSimTime >= SIM_INTERVAL_MS) {
    lastSimTime = now;
    int delta = random(-2, 6); // 产生 -2 到 +5 的随机震荡增长
    targetFollowers += delta;
    if (targetFollowers < 0) targetFollowers = 0;
    todayAdded = targetFollowers - todayBaseFollowers;
    Serial.printf("[SIM] target=%ld (delta=%+d) today=%+ld\n", targetFollowers, delta, todayAdded);
  }
#else
  // 定时拉取真实网络数据
  if (now - lastFetchTime >= FETCH_INTERVAL || lastFetchTime == 0) {
    fetchBiliData();
    lastFetchTime = now;
  }
  checkNewDayReset();
#endif

  // 第四步：核心动画刷新（稳定在 60FPS 满帧运行）
  if (now - lastAnimTime >= ANIM_INTERVAL) {
    lastAnimTime = now;

    // 将粉丝总数解析到每一位对应的独立滚轮目标上
    long temp = targetFollowers;
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      wheels[i].targetDigit = temp % 10;
      temp /= 10;
    }

    // 更新物理引擎，融合高位级联延迟，使多位数字波动更富有交错的层次感
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      float ease = SCROLL_EASING * (1.0f - i * 0.012f);
      if (ease < 0.07f) ease = 0.07f;
      wheels[i].update(ease);
    }

    // 第五步：全画布渲染输出
    u8g2.clearBuffer();
    drawUI();
    u8g2.sendBuffer();
  }
}

// ================== UI 布局绘制 (三段式经典设计) ==================
void drawUI() {
  drawLeftPanel();    // 左侧竖排标签
  drawBigOdometer();  // 中间物理滚轮大字
  drawRightPanel();   // 右侧增量与信号
}

void drawLeftPanel() {
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(2, 7,  "F");
  u8g2.drawStr(2, 14, "A");
  u8g2.drawStr(2, 21, "N");
  u8g2.drawStr(2, 28, "S");

  u8g2.drawVLine(9, 2, 28); // 竖分割线
  u8g2.drawTriangle(11, 14, 11, 18, 14, 16); // 指向大数字的机械箭头
}

void drawRightPanel() {
  int rx = 102; // 右侧面板起始X轴
  u8g2.drawVLine(rx - 2, 2, 28); // 右分割线

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
  if ((millis() / 400) % 2) u8g2.drawDisc(rx + 17, 22, 1); // 模拟心跳闪烁
#else
  if (connectionError) {
    u8g2.drawStr(rx, 24, "ERR");
  } else {
    u8g2.drawStr(rx, 24, "ON");
  }
#endif

  drawWifiIcon(rx + 12, 27); // 绘制信号条
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

// ================== 核心滚轮渲染 (带局部 Clip 精密视窗) ==================
void drawBigOdometer() {
  u8g2.setFont(u8g2_font_logisoso24_tn); // 24像素高超大硬核数字粗体

  int charW = 14;      // 单个数字字宽宽度
  int areaTop = 4;     // 滚动视窗上边缘
  int areaBot = 28;    // 滚动视窗下边缘
  int areaH = areaBot - areaTop; // 视窗有效高度 (24px)
  int baseline = areaBot;        // 字体基线高度

  // 动态计算有效位数，实现完美的左向自适应居中对齐
  long absVal = targetFollowers;
  int needDigits = 1;
  long t = absVal;
  while (t >= 10) { t /= 10; needDigits++; }
  if (needDigits > MAX_DIGITS) needDigits = MAX_DIGITS;

  int totalW = needDigits * charW;
  int startX = 14 + (88 - totalW) / 2;
  if (startX < 14) startX = 14;

  // 逐位渲染拥有物理回弹反馈的数字
  for (int idx = 0; idx < needDigits; idx++) {
    int wheelIdx = MAX_DIGITS - needDigits + idx;
    int x = startX + idx * charW;

    float currYVal = wheels[wheelIdx].currentY;
    int digitLower = (int)currYVal;
    int digitUpper = (digitLower + 1) % 10;
    float fraction = currYVal - digitLower;

    // 【核心裁切控制】：为当前位数字定制局部裁切视窗，使得数字溢出上下边缘时自动隐形
    u8g2.setClipWindow(x - 1, areaTop, x + charW, areaBot);

    // 当前数字因为受拉力而向上滑出
    int yLower = baseline - (int)(fraction * areaH);
    char bufL[2] = { (char)('0' + digitLower), 0 };
    u8g2.drawStr(x, yLower, bufL);

    // 新的下一个数字从下方冲入视窗，并在到位时产生富有动能的回弹
    int yUpper = baseline + areaH - (int)(fraction * areaH);
    char bufU[2] = { (char)('0' + digitUpper), 0 };
    u8g2.drawStr(x, yUpper, bufU);

    u8g2.setMaxClipWindow(); // 渲染完当前位后，立即恢复全屏画布
  }
}

// ================== 网络数据拉取 ==================
#if !DEBUG_SIMULATE
void fetchBiliData() {
  if (WiFi.status() != WL_CONNECTED) {
    connectionError = true;
    return;
  }
  Serial.println("Requesting Bilibili API...");
  WiFiClientSecure client;
  client.setInsecure(); // 绕过 SSL 证书强校验，确保轻量连接
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
  // 零点整准时触发今日基准基数刷新
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

### 代码关键步骤说明

1. **启动画面绘制**：在 `setup()` 中调用 `u8g2.drawStr()` 绘制初现的动画 Logo，给系统提供视觉缓冲。
2. **Wi-Fi 与时间初始化**：调用 `WiFi.begin()` 连入网络，并通过 `configTime()` 挂载阿里云 NTP 时间服务器，确保本地能够精准捕获零点到来。
3. **数据请求伪装**：通过 `http.setUserAgent()` 和 `addHeader("Referer", ...)` 将 ESP32 伪装成一个正常的电脑浏览器请求，防止被 B 站的防爬机制无情拦截。
4. **弹簧阻尼物理迭代**：在 `DigitWheel::update` 中，运用经典物理学公式（加速度 = 距离 × 拉力系数 − 速度 × 阻尼系数）动态衰减速度值。这正是产生魔性机械回弹、而不是生硬死板划过的灵性所在！
5. **局部裁切视窗（Clip Window）控制**：在渲染数字时，利用 `u8g2.setClipWindow(x, 4, w, 28)` 规定只有在这个中间高度内才显示像素，出了这个格子立刻隐形，从而完美模拟出了实体滚轮老虎机的机械缝隙感。

---

## 常见问题排查

别慌！95% 的新手在搭建这类小硬件项目时，遇到的问题基本都出在下面这几个地方：

* **屏幕一片漆黑，什么都不显示**：
  1. 优先检查接线：确认屏幕的 VCC 是否接在了 3.3V，GND 是不是松动了。
  2. 检查 SDA 和 SCL 引脚是否接反了。代码中指定的是 `SDA -> 14`、`SCL -> 13`。
  3. 确认你的 OLED 屏幕驱动芯片是否为经典的 `SSD1306`。市面上极少数长得一样的屏幕使用的是 `SH1106`，如果是后者，需要更换 U8g2 的构造器初始化函数。

* **右侧状态一直显示 "ERR"**：
  1. 代表网络请求或解析出错了。检查你的 `ssid` 和 `password` 是否配置正确。注意：ESP32 **不支持 5G 频段的 Wi-Fi**，请务必连接 2.4G 频段的无线网络或手机热点。
  2. 检查你的 UID 是否输入正确，可以在浏览器打开 `https://api.bilibili.com/x/relation/stat?vmid=你的UID` 看看是否有正确的 JSON 数据返回。

---

## FAQ 问答

**Q：我想改用其他 GPIO 引脚连屏幕可以吗？**
A：完全可以！你只需在代码顶部的 `#define OLED_SDA 14` 和 `#define OLED_SCL 13` 处，把数字改成你 ESP32-S3 开发板上任意空闲的引脚号即可。改完记得把杜邦线也一起拔过去。

**Q：为什么我烧录之后数字卡在 0 动都不动？**
A：因为代码中 `#define DEBUG_SIMULATE` 默认设为了 `0`（使用真实网络拉取）。由于联网获取频率设为了 30 分钟，可能刚开机时由于 Wi-Fi 还在连接导致首帧未获取成功。你可以将该宏改为 `1` 开启模拟模式，即可立刻看到数字每 2 秒随机跳跃并疯狂触发抖动动画的震撼效果！

**Q：我想让它刷新得更频繁一些，怎么改？**
A：修改配置区的 `const unsigned long FETCH_INTERVAL = 30 * 60 * 1000;` 即可。不过不建议设置得太频繁（比如低于 10 秒），否则可能因为频繁请求 B 站接口而被服务器暂时封锁你的公共 IP。

**Q：断电之后今天涨的粉丝数就归零了吗？**
A：不会！代码内部调用了 ESP32 的 `Preferences` 库。每当跨入新的一天成功捕获到基准粉丝数时，它就会把这个数字安全地锁进 ESP32 内部的 Flash 闪存芯片里。即使彻底断电拔掉线，再次开机时它依然能记得今天最初的粉丝起点是多少，从而精准计算今日增量。

**Q：这个物理效果可以移植到更大分辨率的屏幕（如 128x64）上吗？**
A：当然可以。在 `drawBigOdometer()` 函数中，有专门用于高度控制的变量 `areaTop`、`areaBot`、`baseline` 和字号设定。如果换成大屏幕，只需要成比例放大视窗裁剪区坐标并更换更大的 U8g2 粗体字库（如 logisoso42 等），就能获得更大的滚动轮特效。

**Q：为什么屏幕显示信号强度一直是满格或是不太准？**
A：在 `drawWifiIcon` 里我们读取的是 `WiFi.RSSI()`（接收信号强度指示）。代码通过 `-60dBm` 和 `-75dBm` 两个硬阈值切分成了 3 档。如果你的设备距离无线路由器比较近，一般信号就会稳定在 3 格满格状态。

---

## 延伸玩法

做完这个实验，你的硬核极客桌面已经初具雏形了。下一步你还可以这样魔改它：

* **接入多平台监控**：多写一个 API 解析，让屏幕每隔 10 秒在「B 站粉丝数」和「抖音/GitHub 关注数」之间丝滑滚动轮播。
* **加装震动马达**：在开发板引脚上接一个微型扁平震动马达，每当粉丝数增加时，马达配合数字滚动的节奏发出微弱的「哒哒哒」机械触感反馈，解压效果直接翻倍！
* **添加外壳 3D 打印**：为你的 ESP32 和 OLED 屏幕设计一个复古电视机造型的迷你 3D 打印外壳，瞬间变成桌面艺术品。

---

## 参考资料

* [Espressif 乐鑫官方 ESP32-S3 数据手册及硬件设计指南](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
* [U8g2 官方 GitHub 开源主页及高清字库引脚配置说明](https://github.com/olikraus/u8g2)
* [ArduinoJson 官方高效解析与流式解析示例指南](https://arduinojson.org/)
