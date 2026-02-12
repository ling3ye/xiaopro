---
title: "ESP32 读取 BME280 精密环境数据"
boardId: "esp32-s3"
moduleId: "sensor/bme280"
date: 2024-02-20
intro: "使用 ESP32-S3 通过 I2C 接口读取 BME280 的温度、湿度和气压数据。"
image: "https://picsum.photos/400/200"
---

## 实验简介

BME280 是 Bosch 的高精度环境传感器芯片，同时测量温度、湿度和气压。相比 DHT11，它具有更高的精度和更快的响应速度。

## 硬件连接

| BME280 | ESP32-S3 |
|--------|----------|
| VCC | 3.3V |
| GND | GND |
| SCL | GPIO 6 |
| SDA | GPIO 4 |

## 所需库

- Adafruit BME280 Library
- Adafruit Unified Sensor

## 代码示例

```cpp
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <Adafruit_Sensor.h>

Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);

  // BME280 默认 I2C 地址为 0x76 或 0x77
  if (!bme.begin(0x76)) {
    Serial.println("无法找到 BME280 传感器!");
    while (1);
  }

  Serial.println("BME280 初始化成功");
  delay(1000);
}

void loop() {
  float temperature = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F; // 转换为 hPa
  float altitude = bme.readAltitude(1013.25); // 使用标准海平面气压

  Serial.println("=== 环境数据 ===");
  Serial.print("温度: ");
  Serial.print(temperature);
  Serial.println(" °C");

  Serial.print("湿度: ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("气压: ");
  Serial.print(pressure);
  Serial.println(" hPa");

  Serial.print("海拔: ");
  Serial.print(altitude);
  Serial.println(" m");

  Serial.println("------------------");
  delay(2000);
}
```

## 数据精度

| 参数 | 测量范围 | 精度 | 分辨率 |
|------|----------|------|--------|
| 温度 | -40~85°C | ±1°C | 0.01°C |
| 湿度 | 0~100% | ±3% | 0.008% |
| 气压 | 300~1100hPa | ±1hPa | 0.18Pa |

## 高级功能

### 自适应采样率

```cpp
void setup() {
  bme.setSampling(
    Adafruit_BME280::MODE_NORMAL,
    Adafruit_BME280::SAMPLING_X16,  // 温度过采样
    Adafruit_BME280::SAMPLING_X16,  // 压力过采样
    Adafruit_BME280::SAMPLING_X16,  // 湿度过采样
    Adafruit_BME280::FILTER_X16,    // IIR 滤波
    Adafruit_BME280::STANDBY_MS_500 // 待机时间
  );
}
```

### 计算露点温度

```cpp
float calculateDewPoint(float temp, float hum) {
  float a = 17.27;
  float b = 237.7;
  float alpha = ((a * temp) / (b + temp)) + log(hum / 100.0);
  return (b * alpha) / (a - alpha);
}
```

## 应用场景

- 气象站
- 室内环境监测
- 工业过程控制
- 海拔测量
