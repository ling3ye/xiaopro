---
title: "WiFi 远程控制中心"
boardId: "esp8266"
moduleIds:
  - "actuator/relay"
  - "actuator/servo-sg90"
difficulty: "Easy"
intro: "通过 WiFi 网络远程控制继电器和舵机，打造智能家居控制中心。"
---

## 项目简介

基于 ESP8266 的 WiFi 远程控制中心，可以通过网页界面或手机 APP 远程控制多个设备，包括灯光（继电器）和舵机控制的窗帘或机械臂。

## 硬件清单

| 组件 | 数量 |
|------|------|
| NodeMCU ESP8266 | 1 |
| 5V 继电器模块 x2 | 2 |
| SG90 舵机 | 1 |
| 面包板 + 杜邦线 | 若干 |

## 系统功能

1. **Web 控制界面**
   - 内置 Web 服务器
   - 响应式设计，支持手机访问

2. **多设备控制**
   - 2 路继电器控制
   - 舵机角度控制

3. **状态反馈**
   - 实时显示设备状态
   - 控制日志记录

## 核心代码

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <Servo.h>

const char* ssid = "your_ssid";
const char* password = "your_password";

ESP8266WebServer server(80);
Servo myServo;

const int RELAY1_PIN = D1;
const int RELAY2_PIN = D2;
const int SERVO_PIN = D5;

bool relay1State = false;
bool relay2State = false;
int servoAngle = 90;

void setup() {
  Serial.begin(115200);

  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(RELAY2_PIN, LOW);

  myServo.attach(SERVO_PIN);
  myServo.write(servoAngle);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  Serial.println(WiFi.localIP());

  setupRoutes();
  server.begin();
}

void loop() {
  server.handleClient();
}

void setupRoutes() {
  server.on("/", handleRoot);
  server.on("/toggle1", []() {
    relay1State = !relay1State;
    digitalWrite(RELAY1_PIN, relay1State ? HIGH : LOW);
    server.send(200, "text/plain", relay1State ? "ON" : "OFF");
  });
  server.on("/toggle2", []() {
    relay2State = !relay2State;
    digitalWrite(RELAY2_PIN, relay2State ? HIGH : LOW);
    server.send(200, "text/plain", relay2State ? "ON" : "OFF");
  });
  server.on("/servo", handleServo);
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width'>";
  html += "<style>";
  html += "body{font-family:sans-serif;max-width:400px;margin:20px auto;padding:20px;}";
  html += ".btn{padding:15px 30px;font-size:18px;margin:10px;cursor:pointer;border:none;border-radius:5px;}";
  html += ".on{background:#4CAF50;color:white;}";
  html += ".off{background:#f44336;color:white;}";
  html += "</style></head><body>";
  html += "<h1>远程控制中心</h1>";
  html += "<button class='btn " + String(relay1State ? "on" : "off") + "' onclick='toggle(1)'>设备1: " + String(relay1State ? "开" : "关") + "</button><br>";
  html += "<button class='btn " + String(relay2State ? "on" : "off") + "' onclick='toggle(2)'>设备2: " + String(relay2State ? "开" : "关") + "</button><br>";
  html += "<input type='range' min='0' max='180' value='" + String(servoAngle) + "' onchange='setServo(this.value)'>";
  html += "<span id='angle'>" + String(servoAngle) + "°</span>";
  html += "<script>";
  html += "function toggle(id){fetch('/toggle'+id).then(r=>location.reload());}";
  html += "function setServo(val){document.getElementById('angle').innerText=val+'°';fetch('/servo?angle='+val);}";
  html += "</script></body></html>";
  server.send(200, "text/html", html);
}

void handleServo() {
  servoAngle = server.arg("angle").toInt();
  myServo.write(servoAngle);
  server.send(200, "text/plain", "OK");
}
```

## 使用方法

1. 上传代码到 ESP8266
2. 连接 WiFi，打开串口监视器查看 IP 地址
3. 浏览器访问该 IP 地址
4. 通过网页界面控制设备

## 扩展功能

- 添加密码保护
- 支持定时任务
- 接入 Home Assistant
- 添加温度显示
