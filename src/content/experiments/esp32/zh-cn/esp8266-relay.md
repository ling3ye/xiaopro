---
title: "ESP8266 控制继电器"
boardId: "esp8266"
moduleId: "actuator/relay"
date: 2024-02-10
intro: "通过 ESP8266 控制继电器模块，实现远程开关控制。"
image: "https://picsum.photos/400/200"
---

## 实验简介

继电器是一种用低电压控制高电压的电子元件，常用于控制灯光、电机等高功率设备。本实验将使用 NodeMCU 控制一个 5V 继电器模块。

## 硬件连接

| 继电器模块 | NodeMCU |
|-----------|---------|
| VCC | 5V (Vin) |
| GND | GND |
| IN | D1 (GPIO5) |

## 代码示例

```cpp
const int RELAY_PIN = D1;

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
}

void loop() {
  digitalWrite(RELAY_PIN, HIGH);
  delay(2000);
  digitalWrite(RELAY_PIN, LOW);
  delay(2000);
}
```

## 注意事项

- 继电器吸合时会有轻微"咔哒"声，属于正常现象
- 不要带负载操作继电器，容易产生电弧损坏触点
- AC 电压操作需特别注意安全
