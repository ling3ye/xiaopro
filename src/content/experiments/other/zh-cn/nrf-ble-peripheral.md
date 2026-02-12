---
title: "nRF52840 创建 BLE 外设"
boardId: "nrf52840"
moduleId: "communication/ble"
date: 2024-03-15
intro: "使用 nRF52840 创建一个 BLE 外设，提供温度数据服务。"
---

## 实验简介

本实验使用 nRF52840 Dongle 创建一个 BLE 外设，模拟一个温度传感器。可以通过手机 BLE 扫描 APP 连接并读取温度数据。

## 硬件准备

- nRF52840 Dongle
- DHT11 温湿度传感器（可选，也可以发送模拟数据）

## 连接 (使用 DHT11)

| DHT11 | nRF52840 |
|-------|----------|
| VCC | VDD |
| GND | GND |
| DATA | P0.24 |

## 开发环境

- nRF Connect SDK (Zephyr RTOS)
- 或使用 MicroPython

## MicroPython 代码示例

```python
import bluetooth
import struct
import random
from machine import Pin
import time

# DHT11 初始化 (可选)
# 使用简化的读取方法
def read_dht11(pin):
    pin.init(Pin.OUT)
    pin.value(0)
    time.sleep_ms(20)
    pin.init(Pin.IN, Pin.PULL_UP)
    # 简化的 DHT11 读取实现
    return 25 + random.random() * 5  # 返回模拟温度

# BLE 服务 UUID
_ENV_SENSE_UUID = bluetooth.UUID(0x181A)
_ENV_SENSE_TEMP_UUID = bluetooth.UUID(0x2A6E)

# 定义 BLE 外设
class EnvironmentalSense:
    def __init__(self):
        self._ble = bluetooth.BLE()
        self._ble.active(True)
        self._ble.irq(self._irq)

        # 注册服务
        self._ble.gatts_register_services((
            (
                _ENV_SENSE_UUID,
                (
                    (_ENV_SENSE_TEMP_UUID,
                     bluetooth.FLAG_READ | bluetooth.FLAG_NOTIFY),
                ),
            ),
        ))

        # 获取特征值句柄
        (
            self._temp_handle,
        ) = self._ble.gatts_register_handles

        # 设置初始值
        self._connections = set()
        self._payload = advertising_payload(
            services=[_ENV_SENSE_UUID],
            name="nRF52840 Sensor"
        )
        self._advertise()

    def _irq(self, event, data):
        if event == 1:  # _IRQ_CENTRAL_CONNECT
            conn_handle, _, _ = data
            self._connections.add(conn_handle)
        elif event == 2:  # _IRQ_CENTRAL_DISCONNECT
            conn_handle, _, _ = data
            self._connections.remove(conn_handle)
            self._advertise()

    def _advertise(self):
        self._ble.gap_advertise(100, adv_data=self._payload)

    def update_temperature(self, temp):
        data = struct.pack("<h", int(temp * 100))  # 0.01°C 单位
        self._ble.gatts_write(self._temp_handle, data)
        for conn_handle in self._connections:
            self._ble.gatts_notify(conn_handle, self._temp_handle)

def advertising_payload(limited_disc=False, br_edr=False, name=None, services=None, appearance=0):
    payload = bytearray()
    # 添加标志
    payload.extend(struct.pack("BB", 0x02, 0x01))
    # 添加名称
    if name:
        name_bytes = name.encode('utf-8')
        payload.extend(struct.pack("BB", len(name_bytes) + 1, 0x08))
        payload.extend(name_bytes)
    # 添加服务 UUID
    if services:
        for uuid in services:
            b = uuid.bytes
            payload.extend(struct.pack("BB", len(b) + 1, 0x03))
            payload.extend(b)
    return payload

# 主程序
sensor = EnvironmentalSense()

print("BLE 外设已启动，等待连接...")

while True:
    # 读取或模拟温度
    temp = read_dht11(Pin(24))
    sensor.update_temperature(temp)
    print(f"温度: {temp:.1f}°C")
    time.sleep(2)
```

## 测试步骤

1. 上传代码到 nRF52840
2. 打开手机 BLE 扫描 APP（如 nRF Connect）
3. 搜索并连接 "nRF52840 Sensor"
4. 读取温度特征值

## BLE 服务 UUID 参考

| 服务 | UUID (16-bit) | 描述 |
|------|---------------|------|
| Environmental Sensing | 0x181A | 环境感知服务 |
| Battery Service | 0x180F | 电池服务 |
| Device Information | 0x180A | 设备信息服务 |

## 进阶方向

- 添加湿度特征值
- 实现数据记录
- 添加 OTA 升级
- 创建自定义服务
