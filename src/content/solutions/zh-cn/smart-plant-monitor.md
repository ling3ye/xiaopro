---
title: "智能植物监控系统"
boardId: "esp8266"
moduleIds:
  - "sensor/dht11"
  - "actuator/relay"
  - "display/ssd1306"
difficulty: "Easy"
intro: "打造一个能监测植物环境并自动浇水的智能系统。"
---

## 项目简介

智能植物监控系统可以实时监测植物周围的温度和湿度，当环境过于干燥时自动启动水泵浇水，同时通过 OLED 屏幕显示当前状态。

## 硬件清单

| 组件 | 数量 |
|------|------|
| NodeMCU ESP8266 | 1 |
| DHT11 温湿度传感器 | 1 |
| 5V 继电器模块 | 1 |
| SSD1306 OLED 显示屏 | 1 |
| 小型水泵 + 电源 | 1 |
| 面包板 + 杜邦线 | 若干 |

## 系统功能

1. **环境监测**
   - 实时监测环境温度和湿度
   - 阈值报警提示

2. **自动浇水**
   - 湿度低于设定值时自动启动水泵
   - 浇水时长可配置

3. **状态显示**
   - 实时显示温湿度数据
   - 显示水泵工作状态

## 核心代码

```cpp
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>

#define DHTPIN D2
#define DHTTYPE DHT11
#define RELAY_PIN D1

DHT dht(DHTPIN, DHTTYPE);
Adafruit_SSD1306 display(128, 64, &Wire, -1);

const float HUMIDITY_THRESHOLD = 40.0;
const int WATER_DURATION = 3000; // ms

bool isWatering = false;
unsigned long waterStartTime = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // 自动浇水逻辑
  if (humidity < HUMIDITY_THRESHOLD && !isWatering) {
    startWatering();
  }

  if (isWatering && (millis() - waterStartTime > WATER_DURATION)) {
    stopWatering();
  }

  displayData(temperature, humidity, isWatering);
  delay(2000);
}

void startWatering() {
  isWatering = true;
  waterStartTime = millis();
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("开始浇水");
}

void stopWatering() {
  isWatering = false;
  digitalWrite(RELAY_PIN, LOW);
  Serial.println("停止浇水");
}

void displayData(float t, float h, bool watering) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.printf("温度: %.1f°C\n", t);
  display.printf("湿度: %.1f%%\n", h);

  if (watering) {
    display.setTextColor(BLACK, WHITE);
    display.println("💧 浇水中...");
    display.setTextColor(WHITE);
  } else {
    display.println("状态: 正常");
  }

  display.display();
}
```

## 部署建议

- 将传感器放置在植物附近但避免浇水时淋湿
- 水泵建议使用独立的 5V 电源
- 可添加土壤湿度传感器提高精度
