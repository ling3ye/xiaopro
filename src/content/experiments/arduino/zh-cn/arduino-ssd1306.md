---
title: "Arduino 控制 SSD1306 OLED 显示"
boardId: "arduino-uno"
moduleId: "display/ssd1306"
date: 2024-01-15
intro: "学习如何使用 I2C 协议驱动 OLED 显示屏，显示文字和图形。"
---

## 实验简介

SSD1306 是一款非常流行的单色 OLED 显示屏驱动芯片，支持 I2C 和 SPI 接口。本实验将使用 Arduino 通过 I2C 接口控制它显示文字和简单的图形。

## 硬件连接

| SSD1306 | Arduino UNO |
|---------|-------------|
| VCC | 3.3V |
| GND | GND |
| SCL | A5 (SCL) |
| SDA | A4 (SDA) |

## 所需库

- Adafruit SSD1306
- Adafruit GFX Library

## 代码示例

```cpp
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

void setup() {
  Serial.begin(9600);

  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 allocation failed");
    for(;;);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0,0);
  display.println("Hello, World!");
  display.display();
}

void loop() {
}
```

## 预期效果

屏幕上显示 "Hello, World!" 文字。
