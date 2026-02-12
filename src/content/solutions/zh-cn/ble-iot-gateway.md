---
title: "BLE IoT 网关"
boardId: "nrf52840"
moduleIds:
  - "sensor/dht11"
  - "sensor/bme280"
difficulty: "Hard"
intro: "构建一个基于 BLE 的低功耗物联网网关，支持多节点数据采集。"
---

## 项目简介

本项目使用 nRF52840 创建一个 BLE 网关，可以连接多个 BLE 传感器节点，收集环境数据并转发到 MQTT 服务器。适合需要低功耗、长距离传输的物联网场景。

## 硬件清单

| 组件 | 数量 |
|------|------|
| nRF52840 Dongle | 1 |
| DHT11 温湿度传感器 | 1 |
| BME280 环境传感器 | 1 |
| ESP32 (作为 MQTT 桥接) | 1 |
| 面包板 + 杜邦线 | 若干 |

## 系统架构

```
[BLE 传感器节点] <---> [nRF52840 网关] <--串口--> [ESP32] <--WiFi--> [MQTT 服务器]
```

## 系统功能

1. **BLE Central 角色**
   - 自动扫描并连接周围 BLE 设备
   - 支持多设备同时连接

2. **数据采集**
   - 本地传感器数据采集
   - 远程 BLE 设备数据获取

3. **数据转发**
   - 通过串口与 ESP32 通信
   - ESP32 负责上传到云端

## 核心代码 (nRF52840 - Zephyr RTOS)

```c
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/gatt.h>
#include <zephyr/bluetooth/hci.h>
#include <zephyr/sys/printk.h>

#define DEVICE_NAME "BLE Gateway"

static void scan_cb(const bt_addr_le_t *addr, int8_t rssi, uint8_t type,
                    struct net_buf_simple *buf)
{
    char addr_str[BT_ADDR_LE_STR_LEN];
    bt_addr_le_to_str(addr, addr_str, sizeof(addr_str));

    printk("发现设备: %s, RSSI: %d\n", addr_str, rssi);

    // 在这里处理设备数据...
}

void main(void)
{
    int err;

    printk("启动 BLE 网关...\n");

    err = bt_enable(NULL);
    if (err) {
        printk("蓝牙初始化失败: %d\n", err);
        return;
    }

    printk("蓝牙已启用\n");

    // 开始扫描
    err = bt_le_scan_start(BT_LE_SCAN_PASSIVE, scan_cb);
    if (err) {
        printk("扫描启动失败: %d\n", err);
        return;
    }

    printk("正在扫描 BLE 设备...\n");

    // 主循环
    while (1) {
        k_sleep(K_SECONDS(1));
    }
}
```

## ESP32 桥接代码

```cpp
#include <HardwareSerial.h>
#include <WiFi.h>
#include <PubSubClient.h>

HardwareSerial mySerial(1); // UART1

const char* ssid = "your_ssid";
const char* password = "your_password";
const char* mqtt_server = "mqtt.example.com";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  mySerial.begin(115200, SERIAL_8N1, 16, 17); // RX, TX

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // 从 nRF52840 读取数据并转发
  if (mySerial.available()) {
    String data = mySerial.readStringUntil('\n');
    client.publish("ble/gateway/data", data.c_str());
  }
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32Bridge")) {
      break;
    }
    delay(5000);
  }
}
```

## 应用场景

- 智能楼宇环境监测
- 仓储物流监控
- 农业大棚数据采集
- 工业设备状态监控

## 扩展建议

- 添加 Mesh 网络支持
- 实现 OTA 升级
- 添加数据加密
- 支持更多传感器类型
