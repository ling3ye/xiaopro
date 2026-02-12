---
title: "超声波避障小车"
boardId: "esp32-s3"
moduleIds:
  - "sensor/ultrasonic"
  - "actuator/servo-sg90"
difficulty: "Medium"
intro: "制作一个能够自动检测障碍物并避障的智能小车。"
---

## 项目简介

避障小车使用超声波传感器检测前方障碍物，当检测到障碍物时，自动转向避障。本项目结合了传感器融合、电机控制和舵机云台控制。

## 硆件清单

| 组件 | 数量 |
|------|------|
| ESP32-S3 开发板 | 1 |
| HC-SR04 超声波传感器 | 1 |
| SG90 舵机 x2 | 2 |
| L298N 电机驱动模块 | 1 |
| 直流减速电机 x2 | 2 |
| 小车底盘 + 轮子 | 1 套 |
| 18650 电池 x2 | 2 |
| 面包板 + 杜邦线 | 若干 |

## 系统功能

1. **障碍物检测**
   - 超声波传感器实时测距
   - 舵机云台左右扫描

2. **自动避障**
   - 检测到障碍物自动转向
   - 选择最佳路径

3. **运动控制**
   - 前进、后退、左转、右转
   - 速度可调节

## 核心代码

```cpp
#include <ESP32Servo.h>

// 电机引脚
#define M1_IN1  6
#define M1_IN2  7
#define M2_IN1  4
#define M2_IN2  5

// 超声波引脚
#define TRIG_PIN 8
#define ECHO_PIN 9

// 舵机引脚
#define SERVO_SCAN  10  // 扫描舵机
#define SERVO_TURN  11  // 转向舵机

Servo servoScan, servoTurn;

const int SAFE_DISTANCE = 30;  // 安全距离 (cm)

void setup() {
  // 电机引脚设置
  pinMode(M1_IN1, OUTPUT);
  pinMode(M1_IN2, OUTPUT);
  pinMode(M2_IN1, OUTPUT);
  pinMode(M2_IN2, OUTPUT);

  // 超声波引脚设置
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // 舵机初始化
  servoScan.attach(SERVO_SCAN);
  servoTurn.attach(SERVO_TURN);
  servoScan.write(90);  // 中位
  servoTurn.write(90);

  Serial.begin(115200);
}

void loop() {
  int distance = getDistance();

  if (distance < SAFE_DISTANCE && distance > 0) {
    // 检测到障碍物，停止
    stop();

    // 扫描左右方向
    int leftDist = scanLeft();
    int rightDist = scanRight();

    // 选择方向
    if (leftDist > rightDist) {
      turnLeft();
      delay(500);
    } else {
      turnRight();
      delay(500);
    }

    // 复位扫描舵机
    servoScan.write(90);
  } else {
    // 安全，前进
    forward();
  }

  delay(100);
}

int getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = duration * 0.034 / 2;

  return distance;
}

int scanLeft() {
  servoScan.write(30);
  delay(300);
  int dist = getDistance();
  servoScan.write(90);
  delay(300);
  return dist;
}

int scanRight() {
  servoScan.write(150);
  delay(300);
  int dist = getDistance();
  servoScan.write(90);
  delay(300);
  return dist;
}

void forward() {
  digitalWrite(M1_IN1, HIGH);
  digitalWrite(M1_IN2, LOW);
  digitalWrite(M2_IN1, HIGH);
  digitalWrite(M2_IN2, LOW);
}

void backward() {
  digitalWrite(M1_IN1, LOW);
  digitalWrite(M1_IN2, HIGH);
  digitalWrite(M2_IN1, LOW);
  digitalWrite(M2_IN2, HIGH);
}

void turnLeft() {
  servoTurn.write(60);
  delay(200);
}

void turnRight() {
  servoTurn.write(120);
  delay(200);
}

void stop() {
  digitalWrite(M1_IN1, LOW);
  digitalWrite(M1_IN2, LOW);
  digitalWrite(M2_IN1, LOW);
  digitalWrite(M2_IN2, LOW);
}
```

## 工作原理

1. 超声波传感器持续测量前方距离
2. 当距离小于安全距离时，小车停止
3. 扫描舵机左右转动，测量两侧距离
4. 选择距离更大的一侧转向
5. 继续前进

## 扩展功能

- 添加红外循迹功能
- 增加摄像头模块
- 远程蓝牙/WiFi 控制
- 线下地图导航
- 群体编队控制

## 注意事项

- 确保电池电量充足
- 电机驱动需要散热
- 超声波传感器需要避免强光干扰
