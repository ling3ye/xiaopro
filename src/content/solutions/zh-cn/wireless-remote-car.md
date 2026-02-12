---
title: "WiFi 无线遥控小车"
boardId: "esp32-s3"
moduleIds:
  - "actuator/servo-sg90"
  - "actuator/relay"
difficulty: "Medium"
intro: "通过 WiFi 网络远程控制小车的前进、后退、转向，支持手机 APP 控制。"
---

## 项目简介

本项目制作一个可以通过 WiFi 远程控制的遥控小车。使用 ESP32-S3 作为主控制器，通过网页界面或手机 APP 控制小车运动。

## 硬件清单

| 组件 | 数量 |
|------|------|
| ESP32-S3 开发板 | 1 |
| SG90 舵机 x2 | 2 (转向+摄像头云台) |
| L298N 电机驱动 | 1 |
| 直流减速电机 x2 | 2 |
| 小车底盘 + 轮子 | 1 套 |
| 18650 电池 x2 | 2 |
| 面包板 + 杜邦线 | 若干 |

## 系统功能

1. **WiFi 热点模式**
   - 无需路由器，直接连接小车 WiFi
   - 开机自动启动热点

2. **Web 控制界面**
   - 响应式设计，手机友好
   - 虚拟摇杆控制

3. **运动控制**
   - 前进/后退
   - 左转/右转
   - 速度调节

## 核心代码

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>

// WiFi 配置
const char* ssid = "ESP32-Car";
const char* password = "12345678";

WebServer server(80);

// 电机引脚
#define M1_IN1  6
#define M1_IN2  7
#define M2_IN1  4
#define M2_IN2  5

// 舵机
Servo steeringServo;
Servo cameraServo;
const int STEERING_PIN = 10;
const int CAMERA_PIN = 11;

// 状态变量
int speed = 150;
int steeringAngle = 90;

void setup() {
  Serial.begin(115200);

  // 电机初始化
  pinMode(M1_IN1, OUTPUT);
  pinMode(M1_IN2, OUTPUT);
  pinMode(M2_IN1, OUTPUT);
  pinMode(M2_IN2, OUTPUT);

  // 舵机初始化
  steeringServo.attach(STEERING_PIN);
  cameraServo.attach(CAMERA_PIN);
  steeringServo.write(90);
  cameraServo.write(90);

  // WiFi 热点
  WiFi.softAP(ssid, password);
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());

  setupRoutes();
  server.begin();
}

void loop() {
  server.handleClient();
}

void setupRoutes() {
  server.on("/", handleRoot);
  server.on("/forward", []() { moveMotor(true, speed); server.send(200, "text/plain", "OK"); });
  server.on("/backward", []() { moveMotor(false, speed); server.send(200, "text/plain", "OK"); });
  server.on("/stop", []() { stopMotor(); server.send(200, "text/plain", "OK"); });
  server.on("/left", []() { turn(-1); server.send(200, "text/plain", "OK"); });
  server.on("/right", []() { turn(1); server.send(200, "text/plain", "OK"); });
  server.on("/center", []() { turn(0); server.send(200, "text/plain", "OK"); });
  server.on("/speed", handleSpeed);
  server.on("/steering", handleSteering);
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width,user-scalable=no'>";
  html += "<style>";
  html += "body{font-family:sans-serif;margin:0;padding:20px;background:#1a1a1a;color:#fff;}";
  html += ".container{display:flex;flex-direction:column;align-items:center;height:80vh;}";
  html += ".pad{width:200px;height:200px;border-radius:50%;background:#333;position:relative;margin:20px;}";
  html += ".pad button{position:absolute;width:60px;height:60px;border-radius:50%;font-size:24px;}";
  html += ".up{top:10px;left:70px;background:#4CAF50;}";
  html += ".down{bottom:10px;left:70px;background:#f44336;}";
  html += ".left{top:70px;left:10px;background:#2196F3;}";
  html += ".right{top:70px;right:10px;background:#FF9800;}";
  html += ".controls{margin-top:20px;text-align:center;}";
  html += ".slider{width:200px;}";
  html += "</style></head><body>";
  html += "<div class='container'>";
  html += "<h1>遥控小车</h1>";
  html += "<div class='pad'>";
  html += "<button class='up' ontouchstart='move(\"f\")' ontouchend='stop()'>▲</button>";
  html += "<button class='down' ontouchstart='move(\"b\")' ontouchend='stop()')'>▼</button>";
  html += "<button class='left' ontouchstart='turn(\"l\")' ontouchend='center()'>◄</button>";
  html += "<button class='right' ontouchstart='turn(\"r\")' ontouchend='center()')'>►</button>";
  html += "</div>";
  html += "<div class='controls'>";
  html += "<label>速度: <span id='speed'>" + String(speed) + "</span></label>";
  html += "<input type='range' min='100' max='255' value='" + String(speed) + "' class='slider' onchange='setSpeed(this.value)'>";
  html += "</div>";
  html += "</div>";
  html += "<script>";
  html += "function move(dir){fetch('/'+dir);}";
  html += "function turn(dir){fetch('/'+dir);}";
  html += "function stop(){fetch('/stop');}";
  html += "function center(){fetch('/center');}";
  html += "function setSpeed(val){document.getElementById('speed').innerText=val;fetch('/speed?val='+val);}";
  html += "</script></body></html>";
  server.send(200, "text/html", html);
}

void moveMotor(bool forward, int pwm) {
  if (forward) {
    analogWrite(M1_IN1, pwm);
    analogWrite(M1_IN2, 0);
    analogWrite(M2_IN1, pwm);
    analogWrite(M2_IN2, 0);
  } else {
    analogWrite(M1_IN1, 0);
    analogWrite(M1_IN2, pwm);
    analogWrite(M2_IN1, 0);
    analogWrite(M2_IN2, pwm);
  }
}

void stopMotor() {
  analogWrite(M1_IN1, 0);
  analogWrite(M1_IN2, 0);
  analogWrite(M2_IN1, 0);
  analogWrite(M2_IN2, 0);
}

void turn(int dir) {
  if (dir == -1) steeringAngle = min(180, steeringAngle + 10);
  else if (dir == 1) steeringAngle = max(0, steeringAngle - 10);
  else steeringAngle = 90;
  steeringServo.write(steeringAngle);
}

void handleSpeed() {
  speed = server.arg("val").toInt();
  server.send(200, "text/plain", "OK");
}

void handleSteering() {
  steeringAngle = server.arg("val").toInt();
  steeringServo.write(steeringAngle);
  server.send(200, "text/plain", "OK");
}
```

## 使用步骤

1. 上传代码到 ESP32-S3
2. 手机连接 "ESP32-Car" WiFi (密码: 12345678)
3. 浏览器访问 192.168.4.1
4. 使用虚拟摇杆控制小车

## 扩展功能

- 添加摄像头模块进行 FPV 视频传输
- 支持蓝牙控制
- 增加速度 PID 控制
- 添加超声波自动避障
- 记录行驶轨迹

## 注意事项

- 电机驱动需要独立 5V 供电
- 建议使用两个 18650 电池串联 (7.4V)
- 控制延迟取决于 WiFi 信号质量
