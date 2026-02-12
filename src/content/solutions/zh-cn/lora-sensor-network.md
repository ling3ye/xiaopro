---
title: "LoRa 传感器网络"
boardId: "arduino-uno"
moduleIds:
  - "sensor/bme280"
  - "sensor/dht11"
  - "communication/lora"
difficulty: "Hard"
intro: "构建一个远距离 LoRa 传感器网络，实现节点与网关之间的长距离数据传输。"
---

## 项目简介

LoRa (Long Range) 技术适合远距离、低功耗的物联网应用。本项目构建一个星型拓扑的 LoRa 传感器网络，多个传感器节点将数据发送到中心网关。

## 系统架构

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  节点 1     │         │  节点 2     │         │  节点 3     │
│ (环境监测)  │         │ (农业监测)  │         │ (工业监测)  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                        ┌───────▼────────┐
                        │  LoRa 网关     │
                        │ (中心控制器)   │
                        └───────┬────────┘
                                │
                        ┌───────▼────────┐
                        │  上层平台      │
                        │ (Web/MQTT)    │
                        └────────────────┘
```

## 硬件清单 (每个节点)

| 组件 | 数量 |
|------|------|
| Arduino UNO | 1 |
| SX1278 LoRa 模块 | 1 |
| BME280 环境传感器 | 1 |
| DHT11 温湿度传感器 | 1 |
| 18650 电池 + 模块 | 1 |

## 硬件清单 (网关)

| 组件 | 数量 |
|------|------|
| Arduino UNO | 1 |
| SX1278 LoRa 模块 | 1 |
| ESP8266 (用于上传) | 1 |
| 5V 电源 | 1 |

## 传感器节点代码

```cpp
#include <SPI.h>
#include <LoRa.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BME280.h>

// 节点配置
#define NODE_ID 1  // 每个节点使用不同的 ID

// LoRa 引脚
#define LORA_CS 10
#define LORA_RST 9
#define LORA_DIO0 2

// 传感器引脚
#define DHTPIN 6
#define DHTTYPE DHT11

// 对象
DHT dht(DHTPIN, DHTTYPE);
Adafruit_BME280 bme;

// 发送间隔 (秒)
const unsigned long SEND_INTERVAL = 30;
unsigned long lastSend = 0;

void setup() {
  Serial.begin(9600);

  // 初始化传感器
  dht.begin();
  bme.begin(0x76);

  // 初始化 LoRa
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  while (!LoRa.begin(433E6)) {
    Serial.println("LoRa 初始化失败!");
    delay(1000);
  }

  LoRa.setTxPower(20);  // 最大发射功率
  LoRa.setSpreadingFactor(12);  // 最大扩频因子，最远距离
  LoRa.setSignalBandwidth(125E3);  // 较窄带宽，更远距离

  Serial.print("节点 ");
  Serial.print(NODE_ID);
  Serial.println(" 已启动");
}

void loop() {
  if (millis() - lastSend >= SEND_INTERVAL * 1000) {
    sendSensorData();
    lastSend = millis();
  }

  // 低功耗模式
  delay(1000);
}

void sendSensorData() {
  // 读取传感器数据
  float dhtTemp = dht.readTemperature();
  float dhtHum = dht.readHumidity();
  float bmeTemp = bme.readTemperature();
  float bmeHum = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0;

  // 构建 JSON 数据包
  String payload = "{";
  payload += "\"id\":" + String(NODE_ID) + ",";
  payload += "\"dht_t\":" + String(dhtTemp, 1) + ",";
  payload += "\"dht_h\":" + String(dhtHum, 1) + ",";
  payload += "\"bme_t\":" + String(bmeTemp, 1) + ",";
  payload += "\"bme_h\":" + String(bmeHum, 1) + ",";
  payload += "\"press\":" + String(pressure, 1);
  payload += "}";

  // 发送数据
  LoRa.beginPacket();
  LoRa.print(payload);
  LoRa.endPacket();

  Serial.print("已发送: ");
  Serial.println(payload);
}
```

## 网关代码

```cpp
#include <SPI.h>
#include <LoRa.h>
#include <SoftwareSerial.h>

// LoRa 引脚
#define LORA_CS 10
#define LORA_RST 9
#define LORA_DIO0 2

// ESP8266 软串口
#define RX_PIN 5
#define TX_PIN 4

SoftwareSerial espSerial(RX_PIN, TX_PIN);

void setup() {
  Serial.begin(9600);
  espSerial.begin(115200);

  // 初始化 LoRa
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  while (!LoRa.begin(433E6)) {
    Serial.println("LoRa 初始化失败!");
    delay(1000);
  }

  LoRa.setTxPower(20);
  LoRa.setSpreadingFactor(12);
  LoRa.setSignalBandwidth(125E3);

  Serial.println("LoRa 网关已启动");
}

void loop() {
  // 接收数据
  int packetSize = LoRa.parsePacket();

  if (packetSize) {
    String received = "";

    while (LoRa.available()) {
      received += (char)LoRa.read();
    }

    Serial.print("收到数据: ");
    Serial.println(received);
    Serial.print("RSSI: ");
    Serial.println(LoRa.packetRssi());
    Serial.print("SNR: ");
    Serial.println(LoRa.packetSnr());

    // 转发到 ESP8266 上传
    espSerial.println(received);
  }
}
```

## LoRa 参数优化

| 参数 | 值 | 说明 |
|------|-----|------|
| 频率 | 433 MHz | 适合农村/山区 |
| 扩频因子 (SF) | 7-12 | SF12 传输距离最远，但速度最慢 |
| 带宽 (BW) | 125 kHz | 较窄带宽获得更远距离 |
| 编码率 (CR) | 4/5-4/8 | CR4/8 容错能力最强 |
| 发射功率 | 20 dBm | 最大发射功率 |

## 距离与性能

| 扩频因子 | 典型距离 | 数据速率 |
|----------|----------|----------|
| SF7 | ~2 km | ~5.5 kbps |
| SF8 | ~3 km | ~3.1 kbps |
| SF9 | ~4 km | ~1.8 kbps |
| SF10 | ~6 km | ~1.0 kbps |
| SF11 | ~8 km | ~0.5 kbps |
| SF12 | ~10 km | ~0.3 kbps |

## 应用场景

- 农田环境监测
- 森林防火监测
- 山区通信
- 城市智能路灯
- 供应链追踪

## 扩展功能

- 添加节点休眠机制，延长电池寿命
- 实现节点时间同步
- 支持 LoRaWAN 协议
- 添加数据加密
- 实现网关数据本地存储
