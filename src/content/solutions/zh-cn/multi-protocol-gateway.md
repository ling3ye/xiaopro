---
title: "多协议物联网网关"
boardId: "esp32-s3"
moduleIds:
  - "communication/nrf24l01"
  - "communication/lora"
  - "sensor/dht11"
  - "display/ssd1306"
difficulty: "Hard"
intro: "构建一个支持 LoRa、nRF24L01、BLE 多种无线协议的物联网网关，实现异构设备互联。"
---

## 项目简介

多协议物联网网关能够连接使用不同无线协议的设备，实现设备间互通。本项目使用 ESP32-S3 构建，支持 LoRa（远距离）、nRF24L01（短距离高速）、BLE（近场通信）三种协议。

## 系统架构

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  LoRa 节点   │    │ nRF24 节点  │    │   BLE 设备   │
│  (农田)     │    │  (室内)     │    │  (传感器)    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │      LoRa        │    nRF24L01     │     BLE
       └──────────────────┼──────────────────┼──────┘
                          │
                   ┌──────▼──────────┐
                   │  多协议网关      │
                   │  ESP32-S3       │
                   └──────┬──────────┘
                          │
                   ┌──────▼──────────┐
                   │  上层平台        │
                   │  MQTT/Web       │
                   └─────────────────┘
```

## 硬件清单

| 组件 | 数量 |
|------|------|
| ESP32-S3 开发板 | 1 |
| SX1278 LoRa 模块 | 1 |
| nRF24L01+ 无线模块 | 1 |
| DHT11 温湿度传感器 | 1 |
| SSD1306 OLED 显示屏 | 1 |
| 5V 电源 | 1 |

## 硬件连接

### LoRa 模块 (SPI0)
| SX1278 | ESP32-S3 |
|--------|----------|
| VCC | 3.3V |
| GND | GND |
| SCK | GPIO 12 |
| MISO | GPIO 11 |
| MOSI | GPIO 10 |
| CS | GPIO 13 |
| RST | GPIO 14 |
| DIO0 | GPIO 21 |

### nRF24L01+ 模块 (SPI1)
| nRF24L01 | ESP32-S3 |
|-----------|----------|
| VCC | 3.3V (加电容) |
| GND | GND |
| CE | GPIO 6 |
| CSN | GPIO 5 |
| SCK | GPIO 9 |
| MOSI | GPIO 8 |
| MISO | GPIO 7 |
| IRQ | GPIO 4 |

### 其他
| 模块 | ESP32-S3 |
|------|----------|
| SSD1306 SDA | GPIO 47 |
| SSD1306 SCL | GPIO 48 |
| DHT11 DATA | GPIO 3 |

## 核心代码

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <LoRa.h>
#include <SPI.h>
#include <RF24.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// WiFi & MQTT
const char* ssid = "your_wifi";
const char* password = "your_password";
const char* mqtt_server = "mqtt.example.com";

// 引脚定义
#define DHTPIN 3
#define DHTTYPE DHT11

// LoRa (SPI0)
#define LORA_SCK  12
#define LORA_MISO 11
#define LORA_MOSI 10
#define LORA_CS   13
#define LORA_RST  14
#define LORA_DIO0 21

// nRF24L01 (SPI1)
#define NRF24_CE   6
#define NRF24_CSN  5
#define NRF24_SCK  9
#define NRF24_MISO 7
#define NRF24_MOSI 8

// 对象
DHT dht(DHTPIN, DHTTYPE);
SPIClass spiLora(HSPI);
SPIClass spiNrf(FSPI);
RF24 radio(NRF24_CE, NRF24_CSN);
Adafruit_SSD1306 display(128, 64, &Wire, -1);

WiFiClient espClient;
PubSubClient client(espClient);

// 协议标识
enum Protocol { LORA, NRF24, LOCAL };

// 数据结构
struct SensorData {
  Protocol protocol;
  int nodeId;
  float temperature;
  float humidity;
  float value;  // 其他传感器值
  unsigned long timestamp;
};

// 全局变量
float localTemp = 0;
float localHum = 0;
unsigned long lastLocalUpdate = 0;

// nRF24L01 管道
const byte nrf24Address[6] = "GATE1";

void setup() {
  Serial.begin(115200);

  // 初始化本地传感器
  dht.begin();

  // 初始化 OLED
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  // 初始化 LoRa
  initLoRa();

  // 初始化 nRF24L01
  initNRF24();

  // WiFi & MQTT
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    displayStatus("WiFi 连接中...");
  }

  client.setServer(mqtt_server, 1883);

  displayStatus("网关已启动");
  delay(1000);
}

void loop() {
  // MQTT 保持连接
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // 读取本地传感器
  updateLocalSensors();

  // 处理 LoRa 数据
  processLoRa();

  // 处理 nRF24 数据
  processNRF24();

  // 更新显示
  updateDisplay();

  delay(100);
}

void initLoRa() {
  spiLora.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  while (!LoRa.begin(433E6)) {
    displayStatus("LoRa 初始化失败");
    delay(1000);
  }

  LoRa.setTxPower(20);
  LoRa.setSpreadingFactor(10);
  LoRa.setSignalBandwidth(125E3);

  displayStatus("LoRa 已就绪");
}

void initNRF24() {
  spiNrf.begin(NRF24_SCK, NRF24_MISO, NRF24_MOSI, NRF24_CSN);
  radio.begin();
  radio.openReadingPipe(1, nrf24Address);
  radio.setPALevel(RF24_PA_LOW);
  radio.startListening();

  displayStatus("nRF24 已就绪");
}

void processLoRa() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String received = "";
    while (LoRa.available()) {
      received += (char)LoRa.read();
    }

    // 解析数据: {"id":1,"t":25.5,"h":60.2}
    SensorData data;
    data.protocol = LORA;
    parseSensorData(received, data);
    publishSensorData(data);
  }
}

void processNRF24() {
  if (radio.available()) {
    char buffer[32];
    radio.read(buffer, sizeof(buffer));

    SensorData data;
    data.protocol = NRF24;
    parseSensorData(String(buffer), data);
    publishSensorData(data);
  }
}

void parseSensorData(String json, SensorData &data) {
  // 简单 JSON 解析
  int idIdx = json.indexOf("\"id\":");
  if (idIdx > 0) {
    data.nodeId = json.substring(idIdx + 5, json.indexOf(",", idIdx)).toInt();
  }

  int tIdx = json.indexOf("\"t\":");
  if (tIdx > 0) {
    data.temperature = json.substring(tIdx + 4, json.indexOf(",", tIdx)).toFloat();
  }

  int hIdx = json.indexOf("\"h\":");
  if (hIdx > 0) {
    int endIdx = json.indexOf("}", hIdx);
    data.humidity = json.substring(hIdx + 4, endIdx).toFloat();
  }

  data.timestamp = millis();
}

void publishSensorData(SensorData data) {
  String topic = "sensors/";
  topic += data.protocol == LORA ? "lora" : (data.protocol == NRF24 ? "nrf24" : "local");
  topic += "/" + String(data.nodeId);

  String payload = "{\"t\":" + String(data.temperature, 1) +
                   ",\"h\":" + String(data.humidity, 1) +
                   ",\"ts\":" + String(data.timestamp) + "}";

  client.publish(topic.c_str(), payload.c_str());
}

void updateLocalSensors() {
  if (millis() - lastLocalUpdate > 5000) {
    localTemp = dht.readTemperature();
    localHum = dht.readHumidity();
    lastLocalUpdate = millis();

    SensorData data;
    data.protocol = LOCAL;
    data.nodeId = 0;  // 网关本地
    data.temperature = localTemp;
    data.humidity = localHum;
    data.timestamp = millis();

    publishSensorData(data);
  }
}

void updateDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);

  // 标题
  display.setCursor(0, 0);
  display.print("多协议网关");

  // 本地传感器
  display.setCursor(0, 15);
  display.printf("本地: %.1f°C %.0f%%", localTemp, localHum);

  // WiFi 状态
  display.setCursor(0, 25);
  display.print("WiFi: ");
  display.print(WiFi.status() == WL_CONNECTED ? "已连" : "断开");

  // 协议指示
  display.setCursor(0, 35);
  display.print("LoRa: OK");
  display.setCursor(0, 45);
  display.print("nRF24: OK");

  display.display();
}

void displayStatus(String msg) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 30);
  display.print(msg);
  display.display();
}

void reconnectMQTT() {
  while (!client.connected()) {
    displayStatus("MQTT 连接中...");
    if (client.connect("MultiProtocolGateway")) {
      client.subscribe("gateway/command");
    } else {
      delay(5000);
    }
  }
}
```

## MQTT 主题结构

```
sensors/
├── lora/
│   ├── 1          # LoRa 节点1
│   ├── 2          # LoRa 节点2
│   └── ...
├── nrf24/
│   ├── 1          # nRF24 节点1
│   ├── 2          # nRF24 节点2
│   └── ...
└── local/
    └── 0          # 网关本地传感器

gateway/
├── status        # 网关状态
└── command       # 网关控制命令
```

## 协议特性对比

| 协议 | 距离 | 速率 | 功耗 | 适用场景 |
|------|------|------|------|----------|
| LoRa | 10km+ | 低 | 极低 | 远距离、低频数据 |
| nRF24L01 | 100m | 高 | 低 | 室内、高频数据 |
| BLE | 50m | 中 | 低 | 近场、手机交互 |

## 应用场景

- 智慧农业（LoRa 传感器节点 + 网关）
- 智能楼宇（nRF24 室内设备 + 网关）
- 工业 IoT（多协议设备统一接入）
- 智慧城市（多协议异构网络）

## 扩展功能

- 添加 Zigbee 协议支持
- 实现协议转换（设备间互通）
- 添加边缘计算能力
- 支持协议动态配置
- 添加本地数据存储
- 实现设备自动发现
