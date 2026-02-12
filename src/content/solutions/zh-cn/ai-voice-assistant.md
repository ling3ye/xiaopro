---
title: "AI 语音助手终端"
boardId: "esp32-s3"
moduleIds:
  - "communication/esp-now"
  - "display/st7735"
  - "sensor/microphone-i2s"
difficulty: "Medium"
intro: "结合语音识别、显示模块和本地推理，打造离线可用的智能语音助手。"
---

## 项目简介

本项目使用 ESP32-S3 的强大算力，结合 I2S 麦克风、TFT 屏幕和 ESP-NOW 通信，实现一个离线可用的 AI 语音助手终端。

## 系统架构

```
┌─────────────────────────────────────┐
│         主控端 (ESP32-S3)           │
│  ┌─────────────────────────────┐   │
│  │   TinyML 语音识别模型       │   │
│  │   ┌─────────────────────┐  │   │
│  │   │  命令词检测 (DNN)    │  │   │
│  │   └─────────────────────┘  │   │
│  └─────────────────────────────┘   │
│         ↓            ↑              │
└─────────┼────────────┼─────────────┘
          │            │
       麦克风        屏幕
       (I2S)        (SPI)
```

## 硬件清单

| 组件 | 数量 | 说明 |
|------|------|------|
| ESP32-S3 | 1 | 主控板 |
| INMP441 麦克风模块 | 1 | I2S 接口 MEMS 麦克风 |
| ST7735 TFT 屏幕 | 1 | 1.8寸彩色显示屏 |
| 扬声器模块 | 1 | I2S 或 PWM 输出 |
| 18650 锂电池 | 1 | 供电 |

## 电路连接

### I2S 麦克风
| ESP32-S3 | INMP441 | 功能 |
|----------|---------|------|
| GPIO 42  | SCK     | 时钟 |
| GPIO 41  | WS      | 左右声道选择 |
| GPIO 40  | SD      | 数据 |
| 3.3V     | VDD     | 电源 |
| GND      | GND     | 地 |

### ST7735 屏幕
| ESP32-S3 | ST7735 | 功能 |
|----------|--------|------|
| GPIO 6   | CS     | 片选 |
| GPIO 7   | DC     | 数据/命令 |
| GPIO 5   | RST    | 复位 |
| GPIO 4   | SDA    | MOSI |
| GPIO 2   | SCK    | 时钟 |
| 3.3V     | VCC    | 电源 |
| GND      | GND    | 地 |

## 核心代码

### I2S 麦克风初始化

```cpp
#include <driver/i2s.h>

#define I2S_WS 41
#define I2S_SD 40
#define I2S_SCK 42
#define I2S_PORT I2S_NUM_0

void setupI2SMicrophone() {
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = 16000,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 8,
        .dma_buf_len = 64,
        .use_apll = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk = 0
    };

    i2s_pin_config_t pin_config = {
        .bck_io_num = I2S_SCK,
        .ws_io_num = I2S_WS,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num = I2S_SD
    };

    i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
    i2s_set_pin(I2S_PORT, &pin_config);
    i2s_zero_dma_buffer(I2S_PORT);
}
```

### 语音特征提取 (MFCC)

```cpp
#include <math.h>

#define SAMPLE_RATE 16000
#define N_FFT 512
#define N_MFCC 13

void calculateMFCC(float *samples, float *mfcc) {
    // 1. 预加重
    float pre_emphasis = 0.97f;
    for (int i = N_FFT - 1; i > 0; i--) {
        samples[i] -= pre_emphasis * samples[i - 1];
    }

    // 2. 分帧加窗
    // ... 窗函数实现 ...

    // 3. FFT
    // ... 使用 ESP-DSP 库的 FFT 函数 ...

    // 4. Mel 滤波器组
    // ... 滤波器组实现 ...

    // 5. DCT 获取 MFCC
    // ... DCT 实现 ...
}

// 简化的特征提取（用于演示）
void extractFeatures(float *samples, float *features) {
    float energy = 0;
    float zero_crossings = 0;

    for (int i = 0; i < N_FFT; i++) {
        energy += samples[i] * samples[i];
        if (i > 0 && ((samples[i] >= 0) != (samples[i-1] >= 0))) {
            zero_crossings++;
        }
    }

    features[0] = energy / N_FFT;         // 能量
    features[1] = zero_crossings / N_FFT;  // 过零率
}
```

### TinyML 推理模型

```cpp
// 简化的命令词分类模型
typedef enum {
    CMD_NONE,
    CMD_TURN_ON,
    CMD_TURN_OFF,
    CMD_OPEN,
    CMD_CLOSE,
    CMD_STOP
} CommandType;

CommandType classifyCommand(float *features) {
    // 这里使用简单的阈值判断
    // 实际应用中应使用 TensorFlow Lite Micro 训练的模型

    float energy = features[0];
    float zcr = features[1];

    if (energy > 100 && zcr < 0.3) {
        return CMD_TURN_ON;
    } else if (energy > 100 && zcr > 0.3) {
        return CMD_TURN_OFF;
    } else if (energy > 50 && energy < 100) {
        return CMD_STOP;
    }

    return CMD_NONE;
}
```

### UI 显示

```cpp
#include <TFT_eSPI.h>

TFT_eSPI tft = TFT_eSPI();
TFT_eSprite spr = TFT_eSprite(&tft);

void setupDisplay() {
    tft.init();
    tft.setRotation(1);
    tft.fillScreen(TFT_BLACK);

    spr.createSprite(160, 128);
}

void drawCommandDetected(const char *command) {
    spr.fillSprite(TFT_BLACK);

    // 绘制波形可视化
    for (int i = 0; i < 160; i++) {
        int height = abs(audio_buffer[i % 64]) / 10;
        spr.drawFastVLine(i, 64 - height, height * 2, TFT_CYAN);
    }

    // 绘制命令文本
    spr.setTextColor(TFT_WHITE);
    spr.setTextSize(2);
    spr.setTextDatum(MC_DATUM);
    spr.drawString(command, 80, 64);

    spr.pushSprite(0, 0);
}

void drawListening() {
    spr.fillSprite(TFT_BLACK);
    spr.setTextColor(TFT_GREEN);
    spr.setTextSize(2);
    spr.setTextDatum(MC_DATUM);
    spr.drawString("Listening...", 80, 64);
    spr.pushSprite(0, 0);
}
```

### 主程序

```cpp
float audio_buffer[1024];
float features[2];
CommandType last_cmd = CMD_NONE;
bool is_listening = true;

void setup() {
    Serial.begin(115200);
    setupI2SMicrophone();
    setupDisplay();
    drawListening();
}

void loop() {
    size_t bytes_read;

    // 读取音频数据
    i2s_read(I2S_PORT, (void*)audio_buffer, sizeof(audio_buffer), &bytes_read, portMAX_DELAY);

    // 转换为 float 归一化
    int32_t *samples = (int32_t*)audio_buffer;
    for (int i = 0; i < 256; i++) {
        audio_buffer[i] = (float)samples[i] / 2147483648.0f;
    }

    // 提取特征
    extractFeatures(audio_buffer, features);

    // 检测语音活动
    if (features[0] > 50) {  // 能量阈值
        // 识别命令
        CommandType cmd = classifyCommand(features);

        if (cmd != CMD_NONE && cmd != last_cmd) {
            last_cmd = cmd;

            // 显示识别结果
            const char *cmd_text = "Unknown";
            switch (cmd) {
                case CMD_TURN_ON: cmd_text = "Turn ON"; break;
                case CMD_TURN_OFF: cmd_text = "Turn OFF"; break;
                case CMD_OPEN: cmd_text = "Open"; break;
                case CMD_CLOSE: cmd_text = "Close"; break;
                case CMD_STOP: cmd_text = "STOP"; break;
            }

            drawCommandDetected(cmd_text);

            // 发送控制命令
            sendControlCommand(cmd);
        }
    }

    delay(10);
}
```

## ESP-NOW 控制命令发送

```cpp
#include <esp_now.h>
#include <WiFi.h>

// 控制命令数据结构
typedef struct {
    uint8_t command;
    uint8_t target_device;
} ControlPacket;

uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

void setupESP_NOW() {
    WiFi.mode(WIFI_STA);

    if (esp_now_init() != ESP_OK) {
        Serial.println("Error initializing ESP-NOW");
        return;
    }

    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, broadcastAddress, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;

    if (esp_now_add_peer(&peerInfo) != ESP_OK) {
        Serial.println("Failed to add peer");
        return;
    }
}

void sendControlCommand(CommandType cmd) {
    ControlPacket packet;
    packet.command = (uint8_t)cmd;
    packet.target_device = 0;  // 广播

    esp_err_t result = esp_now_send(broadcastAddress, (uint8_t*)&packet, sizeof(packet));

    if (result == ESP_OK) {
        Serial.println("Command sent successfully");
    } else {
        Serial.println("Error sending command");
    }
}
```

## 扩展功能

1. **TensorFlow Lite Micro**：集成 TFLite 实现真正的深度学习模型
2. **多语言支持**：训练不同语言的语音模型
3. **自定义训练**：使用 ESP-Skainet SDK 进行自定义关键词训练
4. **语音合成**：添加 TTS 功能实现语音回复

## 常见问题

**Q：识别率低？**
A：检查麦克风连接，调整采样率和能量阈值，训练更多样本数据。

**Q：响应延迟大？**
A：减少模型复杂度，优化特征提取算法，使用硬件加速。

**Q：误触发频繁？**
A：增加语音活动检测（VAD）环节，调整阈值参数。
