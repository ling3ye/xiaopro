---
title: "STM32 入门点灯实验"
boardId: "stm32f4"
moduleId: "other/led"
date: 2024-03-10
intro: "STM32 开发入门：使用 GPIO 控制 LED 闪烁，学习嵌入式基础。"
---

## 实验简介

这是 STM32 开发的经典入门实验，通过控制 GPIO 引脚让 LED 闪烁。本实验使用 Arduino IDE 编写代码，降低入门难度。

## 硬件连接

STM32F411CE Black Pill 板载 LED：

- LED1: 连接 PC13
- LED2: 连接 PC14

(如使用外部 LED，请串联 220Ω 限流电阻)

## 所需环境

1. Arduino IDE
2. STM32duino 开发板支持包
   - 在 Arduino IDE 首选项中添加: `https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stm_index.json`
   - 在开发板管理器中安装 "STM32duino developed by STM32duino"

## 代码示例

```cpp
// 定义 LED 引脚
#define LED1 PC13
#define LED2 PC14

void setup() {
  // 设置 LED 引脚为输出
  pinMode(LED1, OUTPUT);
  pinMode(LED2, OUTPUT);

  // 初始状态：LED1 亮，LED2 灭
  digitalWrite(LED1, LOW);   // 低电平点亮（根据具体板型可能相反）
  digitalWrite(LED2, HIGH);
}

void loop() {
  // LED1 和 LED2 交替闪烁
  digitalWrite(LED1, !digitalRead(LED1));
  digitalWrite(LED2, !digitalRead(LED2));

  delay(500);  // 延时 500ms
}
```

## 使用 PWM 调光

```cpp
// 需要支持 PWM 的引脚，如 PA8
#define LED_PWM PA8

void setup() {
  // 设置 PWM 频率为 1000Hz，分辨率为 8 位
  analogWriteFrequency(LED_PWM, 1000);
  pinMode(LED_PWM, PWM_OUTPUT);
}

void loop() {
  // 呼吸灯效果
  for (int i = 0; i < 255; i++) {
    analogWrite(LED_PWM, i);
    delay(10);
  }
  for (int i = 255; i >= 0; i--) {
    analogWrite(LED_PWM, i);
    delay(10);
  }
}
```

## 按键控制 LED

```cpp
#define LED1 PC13
#define BUTTON PA0  // 用户按键

void setup() {
  pinMode(LED1, OUTPUT);
  pinMode(BUTTON, INPUT_PULLUP);  // 上拉输入
}

void loop() {
  if (digitalRead(BUTTON) == LOW) {
    // 按键按下，点亮 LED
    digitalWrite(LED1, !digitalRead(LED1));  // 切换状态
    delay(200);  // 去抖动
  }
}
```

## 常见问题

1. **LED 不亮/常亮**：检查电平极性，不同板子可能相反
2. **上传失败**：需要按 BOOT0 按键进入 DFU 模式
3. **串口无输出**：检查 TX/RX 引脚连接

## 进阶学习

- 定器中断
- 外部中断
- DMA 传输
- I2C/SPI 通信
