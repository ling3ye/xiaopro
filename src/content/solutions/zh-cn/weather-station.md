---
title: "DIY 气象站"
boardId: "esp32-s3"
moduleIds:
  - "sensor/bme280"
  - "display/ssd1306"
  - "sensor/dht11"
difficulty: "Medium"
intro: "构建一个能够实时监测温度、湿度、气压的气象站，并支持数据上传云端。"
---

## 项目简介

本项目使用 ESP32-S3 结合多个环境传感器，制作一个功能完整的气象站。系统可实时测量环境数据，并通过 OLED 屏幕显示，同时支持 WiFi 连接上传数据到 MQTT 服务器。

## 硬件清单

| 组件 | 数量 |
|------|------|
| ESP32-S3 开发板 | 1 |
| BME280 温湿度气压传感器 | 1 |
| SSD1306 OLED 显示屏 | 1 |
| DHT11 温湿度传感器 | 1 |
| 面包板 + 杜邦线 | 若干 |

## 系统功能

1. **多传感器数据采集**
   - BME280: 高精度温度、湿度、气压
   - DHT11: 备用温度、湿度测量

2. **实时显示**
   - OLED 屏幕循环显示各传感器数据
   - 支持刷新动画

3. **数据上传**
   - WiFi 连接
   - MQTT 协议上传数据

## 核心代码框架

```cpp
#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;
Adafruit_SSD1306 display(128, 64, &Wire, -1);
WiFiClient espClient;
PubSubClient client(espClient);

const char* ssid = "your_ssid";
const char* password = "your_password";
const char* mqtt_server = "mqtt.example.com";

void setup() {
  Serial.begin(115200);
  bme.begin(0x76);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  float temp = bme.readTemperature();
  float hum = bme.readHumidity();
  float pres = bme.readPressure() / 100;

  displayData(temp, hum, pres);
  publishData(temp, hum, pres);

  delay(2000);
}

void displayData(float t, float h, float p) {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.printf("Temp: %.1f°C\n", t);
  display.printf("Hum:  %.1f%%\n", h);
  display.printf("Pres: %.0fhPa\n", p);
  display.display();
}

void publishData(float t, float h, float p) {
  String payload = String("{\"temp\":") + t + ",\"hum\":" + h + ",\"pres\":" + p + "}";
  client.publish("weather/station", payload.c_str());
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32Client")) {
      break;
    }
    delay(5000);
  }
}
```

## 扩展建议

- 添加风速、雨量传感器
- 集成 Home Assistant
- 添加数据本地存储 (SD卡)
- 太阳能供电方案
