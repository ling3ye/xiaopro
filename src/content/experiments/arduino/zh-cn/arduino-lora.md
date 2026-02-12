---
title: "Arduino 使用 LoRa 远距离通信"
boardId: "arduino-uno"
moduleId: "communication/lora"
date: 2024-03-05
intro: "学习使用 SX1278 LoRa 模块实现远距离（可达10km）无线通信。"
---

## 实验简介

LoRa (Long Range) 是一种低功耗广域网技术，在保持低功耗的同时实现远距离传输。本实验演示两个 Arduino 之间的 LoRa 通信。

## 硬件连接

| SX1278 LoRa | Arduino UNO |
|-------------|-------------|
| VCC | 3.3V |
| GND | GND |
| SCK | D13 |
| MISO | D12 |
| MOSI | D11 |
| CS | D10 |
| RST | D9 |
| DIO0 | D2 |

## 所需库

- LoRa (Sandeep Mistry)

## 发送端代码

```cpp
#include <SPI.h>
#include <LoRa.h>

void setup() {
  Serial.begin(9600);

  LoRa.setPins(10, 9, 2); // CS, RST, DIO0

  while (!LoRa.begin(433E6)) {
    Serial.println("LoRa 初始化失败!");
    delay(500);
  }
  LoRa.setTxPower(20); // 最大发射功率
  Serial.println("LoRa 发送端就绪");
}

void loop() {
  LoRa.beginPacket();
  LoRa.print("Hello LoRa! ");
  LoRa.print(millis() / 1000);
  LoRa.endPacket();

  Serial.println("已发送");
  delay(2000);
}
```

## 接收端代码

```cpp
#include <SPI.h>
#include <LoRa.h>

void setup() {
  Serial.begin(9600);

  LoRa.setPins(10, 9, 2); // CS, RST, DIO0

  while (!LoRa.begin(433E6)) {
    Serial.println("LoRa 初始化失败!");
    delay(500);
  }
  Serial.println("LoRa 接收端就绪");
}

void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    Serial.print("收到数据: ");

    while (LoRa.available()) {
      Serial.print((char)LoRa.read());
    }

    Serial.print(" RSSI: ");
    Serial.println(LoRa.packetRssi());
  }
}
```

## LoRa 参数说明

| 参数 | 说明 | 影响 |
|------|------|------|
| 频率 | 433/868/915 MHz | 传输距离和法规 |
| 带宽 (BW) | 7.8-500 kHz | 数据速率 vs 灵敏度 |
| 扩频因子 (SF) | 6-12 | 传输距离 vs 数据速率 |
| 编码率 (CR) | 4/5-4/8 | 前向纠错能力 |

## 典型应用场景

- 农业物联网
- 智慧城市传感器
- 远程抄表
- 山区通信
