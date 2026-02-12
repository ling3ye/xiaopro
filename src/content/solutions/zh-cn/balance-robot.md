---
title: "两轮自平衡机器人"
boardId: "esp32-s3"
moduleIds:
  - "sensor/mpu6050"
  - "actuator/motor-dc"
  - "actuator/motor-driver-l298n"
difficulty: "Hard"
intro: "结合姿态传感器与直流电机，实现经典的自平衡机器人控制系统。"
---

## 项目简介

两轮自平衡机器人是嵌入式控制系统的经典项目。本方案使用 ESP32-S3 作为主控，MPU6050 获取姿态数据，通过 PID 算法控制直流电机实现平衡。

## 系统架构

```
┌─────────────────────────────────────┐
│           ESP32-S3                 │
│  ┌─────────────────────────────┐   │
│  │      PID 控制算法          │   │
│  │  ┌───────────────────────┐  │   │
│  │  │   传感器融合         │  │   │
│  └─────────────────────────────┘   │
│         ↓         ↑                  │
└─────────┼─────────┼─────────────────┘
          │         │
     ┌────┴───┐ ┌───┴────┐
     │MPU6050 │ │ L298N  │
     └────────┘ │驱动器  │
                 └───┬────┘
         ┌─────────────┴─────────────┐
         │                          │
      左电机                      右电机
```

## 硬件清单

| 组件 | 数量 | 说明 |
|------|------|------|
| ESP32-S3 | 1 | 主控板 |
| MPU6050 | 1 | 6轴姿态传感器 |
| L298N | 1 | 直流电机驱动模块 |
| 直流减速电机 (TT电机) | 2 | 带编码器更佳 |
| 18650 锂电池 | 2 | 7.4V 电源 |
| 车底盘 | 1 | 包含轮子等结构件 |

## 电路连接

| ESP32-S3 | L298N | 功能 |
|----------|-------|------|
| GPIO 4   | IN1   | 左电机正转 |
| GPIO 5   | IN2   | 左电机反转 |
| GPIO 6   | IN3   | 右电机正转 |
| GPIO 7   | IN4   | 右电机反转 |
| GPIO 8   | ENA   | 左电机 PWM |
| GPIO 9   | ENB   | 右电机 PWM |

**注意**：L298N 的 12V 输入接电池，5V 输出可以给 MPU6050 供电。

## 核心代码

### PID 控制器

```cpp
class PIDController {
private:
    float Kp, Ki, Kd;
    float integral = 0;
    float last_error = 0;
    float integral_limit = 100;

public:
    PIDController(float p, float i, float d) : Kp(p), Ki(i), Kd(d) {}

    float compute(float setpoint, float measurement, float dt) {
        float error = setpoint - measurement;

        // 积分项（带限幅）
        integral += error * dt;
        if (integral > integral_limit) integral = integral_limit;
        if (integral < -integral_limit) integral = -integral_limit;

        // 微分项
        float derivative = (error - last_error) / dt;
        last_error = error;

        return Kp * error + Ki * integral + Kd * derivative;
    }

    void reset() {
        integral = 0;
        last_error = 0;
    }
};
```

### 姿态计算

```cpp
#include <Wire.h>

#define MPU6050_ADDR 0x68

struct Attitude {
    float pitch;      // 俯仰角 (度)
    float pitch_rate; // 俯仰角速度 (度/秒)
};

MPU6050 mpu6050(Wire);
Attitude attitude;
unsigned long last_time = 0;

void readMPU6050() {
    mpu6050.update();

    // 获取加速度和角速度
    float ax = mpu6050.getAccX();
    float ay = mpu6050.getAccY();
    float az = mpu6050.getAccZ();
    float gx = mpu6050.getGyroX();

    // 加速度计计算角度
    float accel_pitch = atan2(-ay, az) * 180.0 / PI;

    // 简单的互补滤波
    unsigned long now = micros();
    float dt = (now - last_time) / 1000000.0;
    last_time = now;

    attitude.pitch = 0.98 * (attitude.pitch + gx * dt) + 0.02 * accel_pitch;
    attitude.pitch_rate = gx;
}
```

### 电机控制

```cpp
// 引脚定义
#define M1_IN1 4
#define M1_IN2 5
#define M1_ENA 8
#define M2_IN1 6
#define M2_IN2 7
#define M2_ENB 9

void setMotor(int motor, int speed) {
    // speed 范围: -255 到 255
    int pwm = abs(speed);

    if (motor == 1) {
        if (speed > 0) {
            digitalWrite(M1_IN1, HIGH);
            digitalWrite(M1_IN2, LOW);
        } else {
            digitalWrite(M1_IN1, LOW);
            digitalWrite(M1_IN2, HIGH);
        }
        analogWrite(M1_ENA, pwm);
    } else {
        if (speed > 0) {
            digitalWrite(M2_IN1, HIGH);
            digitalWrite(M2_IN2, LOW);
        } else {
            digitalWrite(M2_IN1, LOW);
            digitalWrite(M2_IN2, HIGH);
        }
        analogWrite(M2_ENB, pwm);
    }
}
```

### 主循环

```cpp
PIDController pid(120, 0.8, 0.5);  // PID 参数需要调试
float target_angle = 0;  // 目标直立角度

void setup() {
    // 初始化串口
    Serial.begin(115200);

    // 初始化电机引脚
    pinMode(M1_IN1, OUTPUT);
    pinMode(M1_IN2, OUTPUT);
    pinMode(M1_ENA, OUTPUT);
    pinMode(M2_IN1, OUTPUT);
    pinMode(M2_IN2, OUTPUT);
    pinMode(M2_ENB, OUTPUT);

    // 初始化 MPU6050
    Wire.begin();
    mpu6050.begin();
    mpu6050.calcOffsets(true);

    last_time = micros();
}

void loop() {
    // 读取姿态
    readMPU6050();

    // PID 控制
    float control = pid.compute(target_angle, attitude.pitch, 0.01);

    // 限制输出
    if (control > 255) control = 255;
    if (control < -255) control = -255;

    // 控制电机
    setMotor(1, control);
    setMotor(2, control);

    // 跌倒检测
    if (abs(attitude.pitch) > 45) {
        setMotor(1, 0);
        setMotor(2, 0);
        delay(1000);
    }

    delay(10);
}
```

## PID 调参步骤

1. **设置 Ki = Kd = 0**，只调节 Kp
2. 逐渐增加 Kp，直到机器人能够直立但振荡
3. **设置 Kd**，增加阻尼，减少振荡
4. **微调 Ki**，消除稳态误差
5. **联合调节**三个参数，获得最佳性能

## 常见问题

**Q：机器人一直往一边倒？**
A：可能是 MPU6050 安装不正，需要校准零偏或调整 target_angle。

**Q：机器人振荡严重？**
A：Kd 值太小，增加微分项以提供阻尼。

**Q：电机动力不足？**
A：检查电池电压，使用更高电压的电源或减速比更大的电机。
