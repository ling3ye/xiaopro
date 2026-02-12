---
title: "Raspberry Pi Pico WiFi 基础"
boardId: "rp2040"
moduleId: "communication/wifi"
date: 2024-03-20
intro: "使用 Raspberry Pi Pico W 连接 WiFi，创建一个简单的 Web 服务器。"
---

## 实验简介

Pico W 是 Raspberry Pi Pico 的 WiFi 版本，内置 Infineon CYW43439 无线芯片。本实验演示如何连接 WiFi 并创建一个简单的 Web 服务器。

## 硬件准备

- Raspberry Pi Pico W

## WiFi 连接示例

```python
import network
import time
import socket

# WiFi 配置
SSID = "your_wifi_name"
PASSWORD = "your_password"

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)

    if not wlan.isconnected():
        print("正在连接 WiFi...")
        wlan.connect(SSID, PASSWORD)

        # 等待连接
        for i in range(20):
            if wlan.isconnected():
                break
            time.sleep(0.5)

    if wlan.isconnected():
        print(f"WiFi 已连接!")
        print(f"IP 地址: {wlan.ifconfig()[0]}")
        return wlan
    else:
        print("WiFi 连接失败")
        return None

# 连接 WiFi
wlan = connect_wifi()
```

## 简单 Web 服务器

```python
import network
import socket
import time
import machine
from machine import Pin

# 板载 LED
led = Pin("LED", Pin.OUT)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect("your_wifi_name", "your_password")

    while not wlan.isconnected():
        print("连接中...")
        time.sleep(0.5)

    print(f"IP: {wlan.ifconfig()[0]}")
    return wlan

def start_web_server():
    wlan = connect_wifi()

    # 创建 socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 80))
    s.listen(1)

    print("Web 服务器已启动，等待请求...")

    while True:
        conn, addr = s.accept()
        print(f"来自 {addr} 的连接")

        request = conn.recv(1024).decode('utf-8')

        # 解析请求
        if 'GET /led/on' in request:
            led.value(1)
            response = "LED 已打开"
        elif 'GET /led/off' in request:
            led.value(0)
            response = "LED 已关闭"
        else:
            led_state = "开" if led.value() else "关"
            html = f"""<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width">
    <title>Pico W 控制</title>
    <style>
        body {{ font-family: sans-serif; text-align: center; padding: 50px; }}
        button {{ padding: 15px 30px; font-size: 20px; margin: 10px; }}
        .on {{ background: #4CAF50; color: white; }}
        .off {{ background: #f44336; color: white; }}
    </style>
</head>
<body>
    <h1>Pico W LED 控制</h1>
    <p>当前状态: {led_state}</p>
    <button class="on" onclick="location.href='/led/on'">打开 LED</button>
    <button class="off" onclick="location.href='/led/off'">关闭 LED</button>
</body>
</html>"""
            response = html

        # 发送响应
        conn.send('HTTP/1.1 200 OK\r\n')
        conn.send('Content-Type: text/html; charset=utf-8\r\n\r\n')
        conn.send(response)
        conn.close()

start_web_server()
```

## MQTT 发布示例

```python
import network
import time
from umqtt.simple import MQTTClient

MQTT_BROKER = "mqtt.example.com"
MQTT_CLIENT_ID = "pico-w-client"
MQTT_TOPIC = "pico/sensor"

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect("your_wifi", "your_password")
    while not wlan.isconnected():
        time.sleep(0.5)
    print(f"IP: {wlan.ifconfig()[0]}")

def publish_mqtt():
    connect_wifi()

    client = MQTTClient(MQTT_CLIENT_ID, MQTT_BROKER)
    client.connect()

    print("MQTT 已连接")

    import machine
    import random
    adc = machine.ADC(26)  # 模拟温度传感器

    while True:
        temp = (adc.read_u16() * 3.3 / 65535) * 10  # 模拟温度
        msg = f'{{"temperature": {temp:.1f}}}'
        client.publish(MQTT_TOPIC, msg)
        print(f"已发送: {msg}")
        time.sleep(5)

publish_mqtt()
```

## 实用工具函数

```python
def scan_wifi():
    """扫描可用 WiFi 网络"""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    networks = wlan.scan()
    print("可用 WiFi 网络:")
    for net in networks:
        print(f"  {net[0].decode()} - 信号强度: {net[3]}")

def get_rssi():
    """获取当前 WiFi 信号强度"""
    wlan = network.WLAN(network.STA_IF)
    return wlan.status('rssi')
```

## 应用建议

- 使用 WiFi 连接前先扫描，确认 SSID 正确
- Web 服务器响应尽量简洁，减少内存占用
- MQTT 适合低功耗场景，定期发送数据
- 考虑使用深度睡眠模式省电
