---
title: "物联网 MQTT 集线器"
boardId: "esp8266"
moduleIds:
  - "sensor/dht11"
  - "sensor/bme280"
  - "actuator/relay"
difficulty: "Medium"
intro: "构建一个基于 MQTT 的物联网集线器，连接多个传感器和执行器，实现设备联动。"
---

## 项目简介

MQTT 集线器是物联网系统的核心组件，负责收集传感器数据并控制执行器。本项目使用 ESP8266 作为 MQTT 网关，支持多设备联动和自动化规则。

## 硬件清单

| 组件 | 数量 |
|------|------|
| NodeMCU ESP8266 | 1 |
| DHT11 温湿度传感器 | 1 |
| BME280 环境传感器 | 1 |
| 5V 继电器模块 x2 | 2 |
| 面包板 + 杜邦线 | 若干 |

## 系统架构

```
[传感器] ←→ [ESP8266 MQTT Hub] ←→ [MQTT Broker] ←→ [手机APP/Home Assistant]
              ↓
         [继电器执行器]
```

## 系统功能

1. **多传感器数据采集**
   - DHT11: 温湿度
   - BME280: 温湿度、气压

2. **执行器控制**
   - 继电器1: 风扇控制
   - 继电器2: 加热器控制

3. **自动化规则**
   - 温度过高自动开启风扇
   - 温度过低自动开启加热器

4. **MQTT 通信**
   - 订阅控制主题
   - 发布传感器数据

## 核心代码

```cpp
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BME280.h>

// WiFi 配置
const char* ssid = "your_wifi";
const char* password = "your_password";

// MQTT 配置
const char* mqtt_server = "mqtt.example.com";
const int mqtt_port = 1883;
const char* mqtt_user = "username";
const char* mqtt_pass = "password";

// 引脚定义
#define DHTPIN D2
#define DHTTYPE DHT11
#define RELAY1_PIN D1  // 风扇
#define RELAY2_PIN D3  // 加热器

// 传感器对象
DHT dht(DHTPIN, DHTTYPE);
Adafruit_BME280 bme;

WiFiClient espClient;
PubSubClient client(espClient);

// 主题定义
const char* TOPIC_TEMP = "home/livingroom/temperature";
const char* TOPIC_HUM = "home/livingroom/humidity";
const char* TOPIC_PRESS = "home/livingroom/pressure";
const char* TOPIC_FAN = "home/livingroom/fan/set";
const char* TOPIC_HEATER = "home/livingroom/heater/set";
const char* TOPIC_STATE = "home/livingroom/state";

// 状态变量
float targetTemp = 24.0;
bool fanAuto = true;
bool heaterAuto = true;

void setup() {
  Serial.begin(115200);

  // 初始化传感器
  dht.begin();
  bme.begin(0x76);

  // 初始化继电器
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(RELAY2_PIN, LOW);

  // WiFi 连接
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi 已连接");

  // MQTT 设置
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // 读取传感器数据
  readAndPublishSensors();

  // 自动控制
  autoControl();

  delay(2000);
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("连接 MQTT...");
    if (client.connect("ESP8266_Hub", mqtt_user, mqtt_pass)) {
      Serial.println("已连接");

      // 订阅控制主题
      client.subscribe(TOPIC_FAN);
      client.subscribe(TOPIC_HEATER);
    } else {
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  Serial.print("收到 [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(msg);

  // 处理控制命令
  if (String(topic) == TOPIC_FAN) {
    if (msg == "ON") {
      digitalWrite(RELAY1_PIN, HIGH);
      fanAuto = false;
    } else if (msg == "OFF") {
      digitalWrite(RELAY1_PIN, LOW);
      fanAuto = false;
    } else if (msg == "AUTO") {
      fanAuto = true;
    }
  } else if (String(topic) == TOPIC_HEATER) {
    if (msg == "ON") {
      digitalWrite(RELAY2_PIN, HIGH);
      heaterAuto = false;
    } else if (msg == "OFF") {
      digitalWrite(RELAY2_PIN, LOW);
      heaterAuto = false;
    } else if (msg == "AUTO") {
      heaterAuto = true;
    }
  }
}

void readAndPublishSensors() {
  // 读取 DHT11
  float dhtTemp = dht.readTemperature();
  float dhtHum = dht.readHumidity();

  // 读取 BME280
  float bmeTemp = bme.readTemperature();
  float bmeHum = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0;

  // 发布到 MQTT
  client.publish(TOPIC_TEMP, String(bmeTemp).c_str());
  client.publish(TOPIC_HUM, String(bmeHum).c_str());
  client.publish(TOPIC_PRESS, String(pressure).c_str());

  // 发布设备状态
  String state = String("{\"temp\":") + bmeTemp +
                 ",\"hum\":" + bmeHum +
                 ",\"fan\":" + digitalRead(RELAY1_PIN) +
                 ",\"heater\":" + digitalRead(RELAY2_PIN) +
                 "}";
  client.publish(TOPIC_STATE, state.c_str());
}

void autoControl() {
  float temp = bme.readTemperature();

  // 自动控制风扇
  if (fanAuto) {
    if (temp > targetTemp + 2) {
      digitalWrite(RELAY1_PIN, HIGH);
    } else if (temp < targetTemp - 1) {
      digitalWrite(RELAY1_PIN, LOW);
    }
  }

  // 自动控制加热器
  if (heaterAuto) {
    if (temp < targetTemp - 2) {
      digitalWrite(RELAY2_PIN, HIGH);
    } else if (temp > targetTemp + 1) {
      digitalWrite(RELAY2_PIN, LOW);
    }
  }
}
```

## MQTT 主题结构

```
home/
└── livingroom/
    ├── temperature       # 温度数据
    ├── humidity          # 湿度数据
    ├── pressure          # 气压数据
    ├── fan/set           # 风扇控制 (ON/OFF/AUTO)
    ├── heater/set        # 加热器控制 (ON/OFF/AUTO)
    └── state             # 设备综合状态
```

## Home Assistant 集成

在 Home Assistant 的 `configuration.yaml` 中添加：

```yaml
mqtt:
  sensor:
    - name: "Living Room Temperature"
      state_topic: "home/livingroom/temperature"
      unit_of_measurement: "°C"
    - name: "Living Room Humidity"
      state_topic: "home/livingroom/humidity"
      unit_of_measurement: "%"
    - name: "Living Room Pressure"
      state_topic: "home/livingroom/pressure"
      unit_of_measurement: "hPa"

  switch:
    - name: "Fan"
      command_topic: "home/livingroom/fan/set"
      state_topic: "home/livingroom/state"
      value_template: "{{ value_json.fan }}"
    - name: "Heater"
      command_topic: "home/livingroom/heater/set"
      state_topic: "home/livingroom/state"
      value_template: "{{ value_json.heater }}"
```

## 扩展功能

- 添加更多传感器类型
- 支持 MQTT 保留消息
- 添加 OTA 升级
- 实现设备发现
- 添加数据加密 (TLS)
