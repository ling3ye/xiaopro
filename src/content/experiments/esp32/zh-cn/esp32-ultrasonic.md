---
title: "ESP32 使用超声波测距传感器"
boardId: "esp32-s3"
moduleId: "sensor/ultrasonic"
date: 2024-01-25
intro: "学习使用 HC-SR04 超声波传感器进行距离测量，常用于避障和物体检测。"
---

## 实验简介

HC-SR04 超声波测距模块通过发射和接收超声波来测量距离。本实验将使用 ESP32-S3 计算传感器到目标的距离。

## 硬件连接

| HC-SR04 | ESP32-S3 |
|---------|----------|
| VCC | 5V |
| GND | GND |
| Trig | GPIO 8 |
| Echo | GPIO 9 |

## 工作原理

1. ESP32 向 Trig 引脚发送至少 10μs 的高电平脉冲
2. 模块发射 8 个 40kHz 的超声波脉冲
3. 收到回波后，Echo 引脚输出高电平
4. 计算高电平持续时间，距离 = 时间 × 声速 / 2

## 代码示例

```cpp
const int TRIG_PIN = 8;
const int ECHO_PIN = 9;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  // 发送触发脉冲
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // 读取回波时间
  long duration = pulseIn(ECHO_PIN, HIGH);

  // 计算距离 (cm)
  float distance = duration * 0.034 / 2;

  Serial.print("距离: ");
  Serial.print(distance);
  Serial.println(" cm");

  delay(500);
}
```

## 实际应用

- 避障小车
- 液位检测
- 自动感应门
- 倒车雷达

## 注意事项

- 超声波受温度影响，实际应用可能需要温度补偿
- 测量角度约为 15 度锥形区域
- 软质材料（如布料）可能吸收超声波，影响测量
