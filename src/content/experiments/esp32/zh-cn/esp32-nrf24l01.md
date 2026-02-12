---
title: "ESP32 使用 nRF24L01 无线通信"
boardId: "esp32-c3"
moduleId: "communication/nrf24l01"
date: 2024-03-01
intro: "学习使用 nRF24L01+ 2.4GHz 无线模块实现设备间通信。"
---

## 实验简介

nRF24L01+ 是一款低成本、低功耗的 2.4GHz 无线收发模块，适用于短距离无线通信。本实验演示两个 ESP32-C3 之间的双向通信。

## 硬件连接 (发送端)

| nRF24L01 | ESP32-C3 |
|----------|----------|
| VCC | 3.3V |
| GND | GND |
| CE | GPIO 7 |
| CSN | GPIO 6 |
| SCK | GPIO 4 |
| MOSI | GPIO 5 |
| MISO | GPIO 2 |
| IRQ | GPIO 3 |

## 硬件连接 (接收端)

| nRF24L01 | ESP32-C3 |
|----------|----------|
| VCC | 3.3V |
| GND | GND |
| CE | GPIO 7 |
| CSN | GPIO 6 |
| SCK | GPIO 4 |
| MOSI | GPIO 5 |
| MISO | GPIO 2 |
| IRQ | GPIO 3 |

## 所需库

- RF24 (TMRh20 版本)

## 发送端代码

```cpp
#include <SPI.h>
#include <RF24.h>

RF24 radio(7, 6); // CE, CSN
const byte address[6] = "00001";

void setup() {
  Serial.begin(115200);
  radio.begin();
  radio.openWritingPipe(address);
  radio.setPALevel(RF24_PA_LOW);
  radio.stopListening();
}

void loop() {
  const char text[] = "Hello World!";
  bool success = radio.write(&text, sizeof(text));

  if (success) {
    Serial.println("发送成功");
  } else {
    Serial.println("发送失败");
  }
  delay(1000);
}
```

## 接收端代码

```cpp
#include <SPI.h>
#include <RF24.h>

RF24 radio(7, 6); // CE, CSN
const byte address[6] = "00001";

void setup() {
  Serial.begin(115200);
  radio.begin();
  radio.openReadingPipe(0, address);
  radio.setPALevel(RF24_PA_LOW);
  radio.startListening();
}

void loop() {
  if (radio.available()) {
    char text[32] = "";
    radio.read(&text, sizeof(text));
    Serial.println(text);
  }
}
```

## 注意事项

- nRF24L01 对电源噪声敏感，建议加 10μF 电容
- 两个模块必须使用相同的管道地址
- 发送端和接收端代码只需修改 `openWritingPipe` / `openReadingPipe`

## 扩展应用

- 无线遥控器
- 传感器网络
- 多点通信
- 数据采集系统
