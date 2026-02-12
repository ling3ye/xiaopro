---
title: "智能家居中控屏"
boardId: "esp32-s3"
moduleIds:
  - "display/st7735"
  - "sensor/dht11"
  - "actuator/relay"
difficulty: "Hard"
intro: "打造一个带 TFT 彩色屏的智能家居中控屏，显示环境数据并控制多个家电设备。"
---

## 项目简介

智能家居中控屏是整个家庭自动化系统的核心。本项目使用 ESP32-S3 和 ST7735 TFT 屏幕创建一个中控屏，可实时显示环境数据，控制灯光、空调等家电，并支持语音控制。

## 硬件清单

| 组件 | 数量 |
|------|------|
| ESP32-S3 开发板 | 1 |
| ST7735 TFT 1.8" 显示屏 | 1 |
| XPT2046 触摸面板 | 1 |
| DHT11 温湿度传感器 | 1 |
| 5V 继电器模块 x4 | 4 |
| 麦克风模块 (INMP441) | 1 |
| 3D 打印外壳 | 1 |
| 5V 电源适配器 | 1 |

## 系统功能

1. **环境监测显示**
   - 实时温度、湿度
   - 美观的图形界面

2. **家电控制**
   - 灯光控制 (继电器 x2)
   - 空调控制 (继电器 x2)
   - 触摸界面操作

3. **语音控制** (可选)
   - 语音指令识别
   - 中文语音支持

4. **WiFi 连接**
   - MQTT 远程控制
   - 时间同步

## 核心代码

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <TFT_eSPI.h>
#include <XPT2046_Touchscreen.h>
#include <DHT.h>

// WiFi & MQTT
const char* ssid = "your_wifi";
const char* password = "your_password";
const char* mqtt_server = "mqtt.example.com";

// 引脚定义
#define DHTPIN 4
#define DHTTYPE DHT11

#define RELAY1_PIN 6  // 灯光1
#define RELAY2_PIN 7  // 灯光2
#define RELAY3_PIN 15 // 空调1
#define RELAY4_PIN 16 // 空调2

// 触摸屏
#define XPT2046_CS  5
#define XPT2046_IRQ 17

// 对象
TFT_eSPI tft = TFT_eSPI();
XPT2046_Touchscreen ts(XPT2046_CS, XPT2046_IRQ);
DHT dht(DHTPIN, DHTTYPE);

WiFiClient espClient;
PubSubClient client(espClient);

// 设备状态
bool relayStates[4] = {false, false, false, false};
float temperature = 0;
float humidity = 0;

// 界面定义
struct Button {
  int x, y, w, h;
  String label;
  int relayIndex;
  const char* topicOn;
  const char* topicOff;
};

Button buttons[] = {
  {10, 80, 65, 60, "客厅灯", 0, "home/living/light/set", "home/living/light/set"},
  {85, 80, 65, 60, "卧室灯", 1, "home/bedroom/light/set", "home/bedroom/light/set"},
  {10, 150, 65, 60, "客厅空调", 2, "home/living/ac/set", "home/living/ac/set"},
  {85, 150, 65, 60, "卧室空调", 3, "home/bedroom/ac/set", "home/bedroom/ac/set"}
};

void setup() {
  Serial.begin(115200);

  // 初始化屏幕
  tft.init();
  tft.setRotation(1);
  tft.fillScreen(TFT_BLACK);

  // 初始化触摸屏
  ts.begin();
  ts.setRotation(1);

  // 初始化传感器和继电器
  dht.begin();
  for (int i = 0; i < 4; i++) {
    pinMode(RELAY1_PIN + i, OUTPUT);
    digitalWrite(RELAY1_PIN + i, LOW);
  }

  // WiFi & MQTT
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  client.setServer(mqtt_server, 1883);
  client.setCallback(mqttCallback);

  drawUI();
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // 更新传感器数据
  updateSensors();

  // 处理触摸
  handleTouch();

  delay(50);
}

void drawUI() {
  tft.fillScreen(TFT_BLACK);

  // 标题栏
  tft.fillRect(0, 0, 160, 40, TFT_NAVY);
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(2);
  tft.setCursor(35, 10);
  tft.print("智能中控");

  // 环境数据
  tft.setTextSize(1);
  tft.setCursor(5, 50);
  tft.printf("温度: %.1f°C", temperature);
  tft.setCursor(85, 50);
  tft.printf("湿度: %.0f%%", humidity);

  // 按钮更新
  updateButtons();
}

void updateButtons() {
  for (int i = 0; i < 4; i++) {
    tft.fillRoundRect(buttons[i].x, buttons[i].y, buttons[i].w, buttons[i].h, 5,
                       relayStates[i] ? TFT_GREEN : TFT_RED);
    tft.setTextColor(TFT_BLACK);
    tft.setTextSize(1);
    tft.setCursor(buttons[i].x + 10, buttons[i].y + 20);
    tft.print(buttons[i].label);

    String state = relayStates[i] ? "开" : "关";
    tft.setCursor(buttons[i].x + 15, buttons[i].y + 40);
    tft.print(state);
  }
}

void updateSensors() {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();

  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 5000) {
    tft.fillRect(5, 50, 70, 15, TFT_BLACK);
    tft.fillRect(85, 50, 70, 15, TFT_BLACK);
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(1);
    tft.setCursor(5, 50);
    tft.printf("温度: %.1f°C", temperature);
    tft.setCursor(85, 50);
    tft.printf("湿度: %.0f%%", humidity);
    lastUpdate = millis();

    // 发布传感器数据
    client.publish("home/hub/temperature", String(temperature).c_str());
    client.publish("home/hub/humidity", String(humidity).c_str());
  }
}

void handleTouch() {
  if (ts.touched()) {
    TS_Point p = ts.getPoint();
    p.x = map(p.x, 200, 3700, 0, 160);
    p.y = map(p.y, 240, 3800, 0, 128);

    for (int i = 0; i < 4; i++) {
      if (p.x >= buttons[i].x && p.x <= buttons[i].x + buttons[i].w &&
          p.y >= buttons[i].y && p.y <= buttons[i].y + buttons[i].h) {
        toggleRelay(i);
        delay(200);
        break;
      }
    }
  }
}

void toggleRelay(int index) {
  relayStates[index] = !relayStates[index];
  digitalWrite(RELAY1_PIN + index, relayStates[index] ? HIGH : LOW);
  updateButtons();

  // MQTT 发布
  String topic = String("home/")+ String(index < 2 ? "light" : "ac") +
                 String("/") + String(index % 2 + 1) + "/set";
  client.publish(topic.c_str(), relayStates[index] ? "ON" : "OFF");
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32_Hub")) {
      client.subscribe("home/+/+/set");
    } else {
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  // 处理远程控制
  if (String(topic).indexOf("light") > 0) {
    int relayIndex = String(topic).endsWith("1") ? 0 : 1;
    if (msg == "ON" || msg == "OFF") {
      relayStates[relayIndex] = (msg == "ON");
      digitalWrite(RELAY1_PIN + relayIndex, relayStates[relayIndex] ? HIGH : LOW);
      updateButtons();
    }
  } else if (String(topic).indexOf("ac") > 0) {
    int relayIndex = String(topic).endsWith("1") ? 2 : 3;
    if (msg == "ON" || msg == "OFF") {
      relayStates[relayIndex] = (msg == "ON");
      digitalWrite(RELAY1_PIN + relayIndex, relayStates[relayIndex] ? HIGH : LOW);
      updateButtons();
    }
  }
}
```

## MQTT 主题结构

```
home/
├── hub/
│   ├── temperature    # 中控温度
│   └── humidity       # 中控湿度
├── living/
│   ├── light/1/set    # 客厅灯控制
│   └── ac/1/set       # 客厅空调控制
└── bedroom/
    ├── light/2/set    # 卧室灯控制
    └── ac/2/set       # 卧室空调控制
```

## 外壳设计建议

- 使用 3D 打印制作外壳
- 留出充电接口
- 考虑壁挂式安装
- 添加防尘盖保护触摸屏

## 扩展功能

- 添加摄像头支持视频门铃
- 集成语音控制模块
- 添加人脸识别
- 支持手势控制
- 添加音乐播放功能
