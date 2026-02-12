---
title: "ESP32 控制 SG90 舵机"
boardId: "esp32-s3"
moduleId: "actuator/servo-sg90"
date: 2024-02-05
intro: "学习使用 ESP32 的 PWM 功能控制舵机，实现精确的角度控制。"
---

## 实验简介

舵机是一种位置伺服电机，可以通过 PWM 信号精确控制其旋转角度。本实验将使用 ESP32-S3 控制 SG90 舵机，实现 0-180 度的角度摆动。

## 硬件连接

| SG90 舵机 | ESP32-S3 |
|-----------|----------|
| 红线 (VCC) | 5V |
| 黑/棕线 (GND) | GND |
| 橙线 (信号) | GPIO 7 |

## 代码示例

```cpp
#include <ESP32Servo.h>

Servo myServo;
const int servoPin = 7;

void setup() {
  myServo.attach(servoPin);
  Serial.begin(115200);
}

void loop() {
  // 从 0 度转到 180 度
  for (int pos = 0; pos <= 180; pos++) {
    myServo.write(pos);
    delay(15);
  }

  // 从 180 度转回 0 度
  for (int pos = 180; pos >= 0; pos--) {
    myServo.write(pos);
    delay(15);
  }
}
```

## PWM 原理

舵机通过接收 50Hz (20ms 周期) 的 PWM 信号工作：
- 0.5ms 脉冲 → 0 度
- 1.5ms 脉冲 → 90 度 (中位)
- 2.5ms 脉冲 → 180 度

## 注意事项

- 舵机工作电流较大，建议使用外部 5V 供电
- 避免长时间堵转，可能损坏电机
- ESP32-S3 有多个 PWM 通道，可同时控制多个舵机
