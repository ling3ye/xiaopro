---
title: "ESP32-S3 + PCM5102A 播放 MP3｜I2S 接线 + Arduino 代码全教程"
boardId: esp32s3
moduleId: audio/pcm5102a
category: esp32
date: 2026-04-22
intro: "ESP32-S3 通过 I2S 接口连接 PCM5102A DAC 模块，配合 ESP32-audioI2S 库实现 Wi-Fi 在线 MP3 播放。接线不超过 10 根，代码不超过 50 行，小白可直接上手。"
image: "https://img.lingflux.com/2026/04/0c35d50bc32e0bd67636e15a21d5e2ed.png"
---

# ESP32-S3 驱动 PCM5102A 播放 MP3 完整教程（I2S 接线 + Arduino 代码）

> **一句话摘要**：使用 ESP32-S3 开发板，通过 I2S 接口连接 PCM5102A DAC 模块，配合 ESP32-audioI2S 库，实现 Wi-Fi 在线 MP3 播放。接线不超过 10 根，代码不超过 50 行，小白可直接上手。

---

## TL;DR（快速上手版）

不想看废话？直接看这里：

1. ESP32-S3 的 GPIO17（BCK）、GPIO16（LCK）、GPIO15（DIN）分别接 PCM5102A 的 BCK、LCK、DIN
2. PCM5102A 的 XMT 引脚接 3.3V（或用 GPIO7 代码拉高），其余控制引脚（FMT/SCL/DMP/FLT）全部接 GND
3. 安装 Arduino 库：ESP32-audioI2S（by schreibfaul1）
4. 复制本文代码，改 Wi-Fi 账号密码，烧录，开声

---



**ESP32-S3 + PCM5102A** 是目前 DIY 音频项目里性价比最高的组合之一：ESP32-S3 负责连 Wi-Fi、拉取 MP3、解码音频流，PCM5102A 负责把数字信号转换成模拟音频输出（注意：这是纯 DAC 输出，无功放，接喇叭需外加功放模块）。整个方案成本不超过几十块，音质却远超同价位方案。

本文所有接线和代码均已实测通过，跟着一步步做，你也能实现同样的效果。

---

## 最终效果

ESP32-S3 上电后自动连接 Wi-Fi，从网络拉取 MP3 音频流，通过 PCM5102A 解码输出（通过耳机或外接功放+喇叭播放出声音）。全程无需触屏、无需按键，上电即播。

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/CjGkTj7KaQo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## PCM5102A 音频模块介绍

### PCM5102A 是什么？

**PCM5102A** 是德州仪器（Texas Instruments）出品的一颗高性能立体声 **DAC 芯片**（Digital-to-Analog Converter，数模转换器）。

你的 ESP32-S3 输出的是 **数字音频信号**（I2S 格式的 0 和 1），但功放、耳机等音频设备听不懂数字信号，它们只认 **模拟电压信号**（随时间变化的波形）。PCM5102A 就是这两者之间的"同声传译"，把数字信号实时翻译成音频设备能理解的模拟信号。

### PCM5102A 核心参数

| 参数 | 规格 |
|---|---|
| 接口类型 | I2S（与 ESP32 原生兼容） |
| 支持采样率 | 8kHz ～ 384kHz |
| 动态范围 | 112dB（音质细腻，底噪极低） |
| 工作电压 | 3.3V 单电源（与 ESP32 完美匹配） |
| MCLK | 内置 PLL，无需外部主时钟 |
| 输出 | 差分线路级输出（Line Level，无功放，不能直驱喇叭） |

**为什么选 PCM5102A？** 便宜、好用、3.3V 直接驱动、不需要外部时钟、动态范围 112dB 在单片机音频里相当能打——是 ESP32 项目里最常见的 I2S DAC 搭档。

> **⚠️ 重要：PCM5102A 是纯 DAC 模块，没有功放！**
>
> PCM5102A 只负责把数字信号转换成模拟信号（Line Level 线路级电平），**它本身没有任何放大能力**。
>
> - **绝对不能直接接喇叭（扬声器）**：喇叭阻抗低（通常 4Ω～8Ω），PCM5102A 的输出电流远不足以驱动，直接接会**烧毁模块**。
> - **接耳机也有风险**：大部分耳机的阻抗较低（16Ω～32Ω），PCM5102A 的线路级输出并非设计用来驱动耳机，长时间使用可能损坏模块。高阻抗耳机（≥250Ω）风险相对较低，但仍不推荐。
> - **正确做法**：如果需要接喇叭，必须在 PCM5102A 和喇叭之间加一级**功放模块**（如 PAM8403、MAX98357、TPA2016 等）。如果只是调试测试，建议用高阻抗耳机且音量不要开太大。

### PCM5102A 引脚功能说明

| 引脚标签 | 功能 | ESP32-S3 接法 | 备注 |
|---|---|---|---|
| **3.3V** | 逻辑电源（3.3V） | 接 ESP32 3.3V | 必须接 |
| **GND** | 地 | 接 ESP32 GND | 必须接，共地很重要 |
| **BCK** | I2S 位时钟 | 接 GPIO17 | 核心 I2S 信号 |
| **LCK** | I2S 左右声道时钟（LRCK/WS） | 接 GPIO16 | 核心 I2S 信号 |
| **DIN** | I2S 音频数据输入 | 接 GPIO15 | 核心 I2S 信号 |
| **XMT** | 软静音控制（High = 正常输出） | 接 3.3V 或 GPIO7 | **必须拉高，否则永远无声** |
| **FMT** | 音频格式选择（Low = I2S） | 接 GND | 接地即可 |
| **SCL** | 系统主时钟（内置 PLL 可省略） | 接 GND | 接地即可 |
| **DMP** | 去加重控制 | 接 GND | 接地即可 |
| **FLT** | 数字滤波器模式 | 接 GND | 接地即可 |

> **记住这条规则：** FMT、SCL、DMP、FLT 这四个控制引脚全部接地，简单、稳定、不出错。

---

## 所需材料（BOM 表）

| 元件 | 数量 | 说明 |
|---|---|---|
| ESP32-S3 开发板 | × 1 | 任意 ESP32-S3 DevKit 均可 |
| PCM5102A 音频模块 | × 1 | 淘宝有售，约 10 元左右 |
| 跳线（杜邦线） | 若干 | 公对公 / 公对母视开发板而定 |
| 高阻抗耳机 | × 1 | 调试用，建议 ≥64Ω；低阻抗耳机或喇叭需外加功放模块（如 PAM8403） |

---

## ESP32-S3 与 PCM5102A 接线方式

接线是整个实验最容易出错的环节。建议接完之后对照表格**逐一检查一遍**，能省去 80% 的排错时间。

| ESP32-S3 GPIO | PCM5102A 引脚 | 功能说明 |
|---|---|---|
| 3.3V | **3.3V** | 逻辑电源 |
| GND | **GND** | 地（必须共地！） |
| **GPIO 17** | **BCK** | I2S 位时钟（Bit Clock） |
| **GPIO 16** | **LCK** | I2S 左右声道时钟（LRCK/WS） |
| **GPIO 15** | **DIN** | I2S 音频数据输入 |
| **GPIO 7** | **XMT** | 软静音控制（代码里拉高；也可直接接 3.3V） |
| GND | FMT / SCL / DMP / FLT | 格式与控制引脚（全部接地） |

---

## 需要安装的 Arduino 库

在 Arduino IDE 的库管理器中搜索并安装：

**ESP32-audioI2S**（作者：schreibfaul1）

找不到的话可以去 GitHub 下载 ZIP 手动安装：[https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

---

## 完整 Arduino 代码（测试通过）

以下代码已在 ESP32-S3 + PCM5102A 上测试通过，直接复制，改 Wi-Fi 信息，上传即可：

```cpp
// 更多实验见 www.lingflux.com

#include <Arduino.h>
#include <WiFi.h>
#include <Audio.h>

// ── Wi-Fi 配置（改成你自己的）──────────────────────────
const char* ssid     = "你的WiFi名称";
const char* password = "你的WiFi密码";

// ── I2S 引脚定义 ─────────────────────────────────────────
#define I2S_BCLK  17   // BCK：位时钟
#define I2S_LRCK  16   // LCK：左右声道时钟
#define I2S_DOUT  15   // DIN：音频数据
#define XMT        7   // XMT：软静音控制（HIGH = 正常输出）

Audio audio;

void setup() {
  Serial.begin(115200);

  // 第一步：拉高 XMT，解除 PCM5102A 静音
  pinMode(XMT, OUTPUT);
  digitalWrite(XMT, HIGH);

  // 第二步：连接 Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("正在连接 Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi 连接成功！");

  // 第三步：配置 I2S 引脚与音量
  audio.setPinout(I2S_BCLK, I2S_LRCK, I2S_DOUT);
  audio.setVolume(12);  // 音量范围 0～21，建议从 10 开始逐步调高，避免损伤耳机或模块

  // 第四步：播放在线 MP3
  audio.connecttohost("https://pixabay.com/music/download/id-219731.mp3");
  Serial.println("开始播放音频...");
}

void loop() {
  // 持续调用，维持音频解码与播放（不能省！）
  audio.loop();
}

// 调试回调：打印库运行状态（排错时很有用）
void audio_info(const char *info) {
  Serial.print("Audio Info: ");
  Serial.println(info);
}
```

**代码说明：**

- `audio.setVolume(12)`：音量范围 0～21，建议从 10 左右开始逐步调高。音量过大会增加 PCM5102A 的输出电流，接耳机时尤其注意不要开太大。
- `connecttohost()`：支持 HTTP / HTTPS 直链 MP3，失效了换一个即可。
- `audio.loop()`：必须放在 `loop()` 里持续调用，负责维持音频流的解码和输出，不能删，也不能在旁边加太多耗时操作。

---

## 常见问题与排查（FAQ）

### Q：接好线上电后完全没有声音，怎么排查？

没有声音是新手最常遇到的问题，按以下顺序逐一检查，90% 的情况都能解决：

**① 检查共地** ESP32-S3 和 PCM5102A 的 GND 必须用杜邦线连在一起。没有共地，信号无法形成回路，任何声音都不会出现。这是新手最容易忽略的一步。

**② 检查 I2S 引脚是否接错** BCK、LCK、DIN 三根线，接错或接反任意一根都会导致完全无声或持续杂音。对照下表重新确认一遍：

| ESP32-S3 GPIO | PCM5102A 引脚 |
| ------------- | ------------- |
| GPIO 17       | BCK           |
| GPIO 16       | LCK           |
| GPIO 15       | DIN           |

**③ 检查 XMT 是否拉高** XMT 是 PCM5102A 的软静音控制脚：LOW = 静音，HIGH = 正常播放。如果忘记拉高，芯片会一直处于静音状态，任何配置都没有声音。 解决方法：代码里加上 `digitalWrite(7, HIGH)`，或直接用杜邦线把 XMT 接到 3.3V。

------

### Q：播放时出现轻微的"滴滴"（di di）或"咔哒"（tick tick）爆音，是什么原因？

这是 ESP32 音频项目中讨论最多的问题之一，原因较多，需要逐一排查。以下按概率从高到低列出常见原因和对应解决方法：

**原因一：I2S 缓冲区欠载（Buffer Underrun）**（概率最高）

ESP32 在解码 MP3 或从网络/SD 卡读取数据时，若 CPU 负载突然升高、缓冲区过小或解码速度跟不上 I2S 输出速率，就会出现短暂的数据中断。PCM5102A 收到连续时钟但数据线短暂为零时，就会产生可重复的爆音。如果爆音总在歌曲的同一位置出现，基本可以确认是这个原因（高比特率段、复杂帧或特定格式问题导致单帧处理耗时骤增）。

解决方法：增大 `i2s_config` 中的 `dma_buf_count`（推荐 8～16）和 `dma_buf_len`（推荐 256～1024）；如果使用 `xTaskCreate` 创建音频任务，将其优先级调高，高于 Wi-Fi 和其他后台任务。使用 ESP32-audioI2S 等库时，检查并调大库内的 buffer size 设置。

**原因二：采样率或位深配置不匹配**

音频文件采样率（44.1kHz / 48kHz）与 ESP32 I2S 配置不一致，或者 24bit 与 16bit 混用时容易触发。

解决方法：将所有音频文件统一转换为 44.1kHz、16bit、Stereo（可用 ffmpeg 批量处理）；I2S 配置中明确设置 `bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT`；确认 PCM5102A 模块的 SCK/FLT/DEMP/FMT 引脚均已接地，启用内部 PLL 模式。

**原因三：硬件信号完整性问题**

I2S 连线过长、没有串联阻尼电阻，信号边沿会产生振铃（ringing），进而引发咔哒声；ESP32 的 Wi-Fi/CPU 活动也可能通过共用的 3.3V 电源注入噪声。

解决方法：在 BCK、LCK、DIN 三根信号线上各串联一个 33～100Ω 电阻（靠近 ESP32 端放置）；给 PCM5102A 单独加 10μF + 0.1μF 去耦电容，或使用独立 LDO 供电；连线尽量短，并远离 ESP32 的 Wi-Fi 天线区域。

**原因四：PCM5102A 内部自动静音触发**

当 DIN 数据短暂为零或低电平时，芯片内部的智能静音逻辑会触发，产生轻微的 pop 声，在静音段或音量较低部分更为明显。

解决方法：在播放开始/结束或缓冲区为空时，软件层面插入淡入淡出（fade in/out）过渡；避免向 I2S 填充纯零数据，改为填充极小幅度的静音帧。

**快速验证步骤：** 先用标准 WAV 文件（44.1kHz 16bit）测试，绕过 MP3 解码，确认是否仍在固定位置爆音；再逐步加回 MP3 解码、网络拉流，缩小问题范围。

------

### Q：在线播放时卡顿或中断，怎么处理？

在线播放依赖网络质量，信号弱或带宽不稳定时容易卡顿。可先换一个速度更快的 MP3 直链测试；若网络本身没问题，改为从 SD 卡或 SPIFFS 读取本地音频文件，可以彻底排除网络因素。

------

### Q：ESP32-S3 的 I2S 引脚可以换成其他 GPIO 吗？

可以。ESP32-S3 的 I2S 外设支持任意 GPIO 映射，直接修改代码中的 `#define I2S_BCLK`、`I2S_LRCK`、`I2S_DOUT` 的值即可，不受固定引脚限制。

------

### Q：PCM5102A 支持哪些采样率？

PCM5102A 支持 8kHz、16kHz、32kHz、44.1kHz、48kHz、96kHz、192kHz 和 384kHz，完整覆盖日常 MP3（通常为 44.1kHz）的所有播放需求。

------

### Q：PCM5102A 可以用 5V 供电吗？

部分带 LDO 的 PCM5102A 模块支持 5V 输入，内部会降压至 3.3V。如果你的模块只标注了 3.3V 引脚而没有 5V 引脚，请直接接 3.3V。建议优先使用 3.3V 供电，更稳定，也与 ESP32-S3 的逻辑电平完全匹配。

------

### Q：ESP32-S3 播放 MP3 时 CPU 占用高吗？

ESP32-audioI2S 库会利用 ESP32-S3 的双核架构，将音频解码任务运行在独立核心上，对主循环影响极小。日常使用中 CPU 占用通常在 10%～30% 之间，不会影响其他并发任务。

------

### Q：可以同时播放音频和驱动 TFT 屏幕吗？

可以。ESP32-S3 的性能足以同时处理 I2S 音频输出和 SPI TFT 显示。需要注意的是，`loop()` 中不能有长时间阻塞的操作，否则会影响 `audio.loop()` 的调用频率，导致音频卡顿或爆音。

------

### Q：PCM5102A 的输出可以直接接喇叭或耳机吗？

**不能直接接喇叭，接耳机也需要谨慎。** PCM5102A 是纯 DAC 模块，输出的是线路级电平（Line Level），没有放大能力。直接接喇叭（4Ω～8Ω）会因为电流过大而**烧毁模块**。接低阻抗耳机（16Ω～32Ω）长时间使用也有损坏风险。

如果需要接喇叭，必须在 PCM5102A 输出端加一级功放模块，推荐搭配：PAM8403（3W×2，便宜好用）、MAX98357（I2S 直入，自带 DAC 可替换 PCM5102A）、TPA2016（2W×2，带 AGC）。调试阶段建议使用高阻抗耳机（≥64Ω）且音量调低。

------

### Q：ESP32-S3 与普通 ESP32 在 I2S 音频上有什么区别？

ESP32-S3 的主频（240MHz 双核）高于早期 ESP32 版本，MP3 等格式的解码更流畅，丢帧和爆音的概率更低。同时 ESP32-S3 的 GPIO 资源更丰富，适合同时跑音频、显示和网络的复合项目。



---

## 参考资料

- **PCM5102A 官方数据手册（Texas Instruments）：**
  [https://www.ti.com/lit/ds/symlink/pcm5102a.pdf](https://www.ti.com/lit/ds/symlink/pcm5102a.pdf)

- **ESP32-audioI2S 库（GitHub，by schreibfaul1）：**
  [https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

- **Espressif ESP32-S3 技术文档：**
  [https://www.espressif.com/zh-hans/products/socs/esp32-s3](https://www.espressif.com/zh-hans/products/socs/esp32-s3)

---

*更多 ESP32 实验与教程见 [www.lingflux.com](http://www.lingflux.com)*
