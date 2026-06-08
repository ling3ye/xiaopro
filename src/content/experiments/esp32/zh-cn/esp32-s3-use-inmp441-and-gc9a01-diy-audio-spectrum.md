---
title: "ESP32-S3 + INMP441 + GC9A01 DIY 圆形音频频谱仪｜I2S + FFT + SPI 完整教程"
boardId: esp32s3
moduleId: audio/inmp441
category: esp32
date: 2026-06-08
intro: "用 ESP32-S3 读取 INMP441 数字麦克风的 I2S 音频，经 512 点 FFT 分析后在 GC9A01 圆形 TFT 屏上实时绘制 16 段彩虹频谱柱。附完整接线、库安装和代码注释。"
image: "https://img.lingflux.com/2026/06/7747ada90e61ba2360585e6934fbf7a7.jpg"
---

> **一句话摘要**：ESP32-S3 + INMP441 麦克风 + GC9A01 圆形屏，做一个会"跳舞"的圆形音频频谱仪，I2S + FFT + SPI 全流程教程。

# ESP32-S3 + INMP441 + GC9A01 做一个会"跳舞"的圆形音频频谱仪完整教程（I2S + FFT + SPI）

难度：⭐⭐⭐☆☆（有点 Arduino 基础就能上手）  
预计时间：45 分钟  
测试环境：
Arduino IDE 2.3.8
GFX Library for Arduino v1.6.5
arduinoFFT v2.0.4

---

> **TL;DR（不想看废话版）：**
> 1. **接线**：INMP441 的 SD→GPIO4，WS→GPIO5，SCK→GPIO6，**L/R 必须接 GND**
> 2. **接线**：GC9A01 的 SCL→GPIO12，SDA→GPIO11，CS→GPIO9，DC→GPIO10，RST→GPIO18，BL→GPIO7
> 3. **安装库**：GFX Library for Arduino（作者 moononournation）+ `arduinoFFT`（作者 kosme）
> 4. **粘代码、烧录、对着麦克风说话**，圆圈里的彩虹柱就跳起来了

---

## 前言

自从买了块 1.28 寸圆形屏之后，都挺好玩的，圆形有很多场景跟方形不太一样，现在我就通过INMP441麦克风模块和它做一件特别好看的事：**实时音频频谱可视化**。

你说"频谱仪"，脑子里可能先浮现出 Winamp 那种上世纪风格的长条柱（我以前电脑上安装过，听着歌，看着频频的跳动可以看一下午）。但圆形的频谱就不一样了——16 条彩虹色柱子从圆心往外辐射，音量越大柱子越长，每条柱子顶端还有一个白色峰值光点缓缓下落……说实话，我对着它发呆了五分钟没去吃饭。

本文手把手带你用 **ESP32-S3 + INMP441 数字麦克风 + GC9A01 圆形 TFT 屏**，从接线到代码，做出一个实时响应声音的圆形彩虹频谱仪。有点基础的 maker 跟着做，45 分钟内能看到效果。

---

## 实验效果

![](https://img.lingflux.com/2026/06/21a134efbde1457cff0817a7e18879f3.jpg)



- 实时采集麦克风音频（44.1kHz，16bit）
- 512 点 FFT 分析，分成 16 个频段
- 圆形屏上彩虹柱从内向外辐射，峰值白点缓降
- 刷新率约 20fps，肉眼看完全流畅

---

## 元件说明



### GC9A01 圆形 TFT 屏

如果说普通矩形屏是"直板手机"，GC9A01 就是"智能手表表盘"——**1.28 英寸圆形 LCD，驱动芯片就叫 GC9A01，走 SPI 总线，3.3V 工作**，8 根线就能驱动。

| 参数 | 值 |
| --- | --- |
| 屏幕尺寸 | 1.28 英寸 |
| 分辨率 | 240 × 240 像素 |
| 接口 | SPI（4 线） |
| 工作电压 | 3.3V |
| 驱动芯片 | GC9A01 |
| 面板类型 | IPS（全视角） |

选它的理由：市面上最常见的圆形小屏，Arduino_GFX 库原生支持，5 行代码初始化，坑极少。

---

### INMP441 MEMS 数字麦克风

INMP441 是一颗**全向 MEMS 数字麦克风**，说人话就是：**它直接输出数字 I2S 信号，不用接 ADC**。就像你请了一个同声传译，说什么它帮你实时翻译成 MCU 能懂的数字，省去了模拟信号那一堆麻烦。

| 参数 | 值 |
| --- | --- |
| 接口 | I2S（数字音频） |
| 工作电压 | 1.8V ～ 3.3V |
| 频率响应 | 60Hz ～ 15kHz |
| 信噪比 | 61dBA |
| 灵敏度 | -26dBFS（典型值） |
| 拾音方向 | 全向 |

选它的理由：I2S 接口干净，不需要额外 ADC，信噪比 61dBA 比大多数廉价模拟咪头强一截，做频谱绰绰有余。

> 值得注意的是INMP441 原本由应美盛（InvenSense，后被 TDK 收购）生产，官方早已经将其列为 **Obsolete（淘汰/停产）** 状态。在贸泽（Mouser）、得捷（DigiKey）等主流正规元器件分销商处，它已经被打上了停产标签。而市场上（如某宝、某多）大量几块钱一个的 INMP441 蓝色/黑色小板子依然供货充足。这主要是因为大陆市场仍有大量的**库存尾货**，或者市场上存在一些**兼容/翻新的国产芯片**在继续沿用这个名字。如果你只是做个人 DIY、写教程或跑小 Demo，目前买到的模块依然能用。
>
> **因此，如果你是要开发产品这个型号的模块并不是首选。**



---

## BOM 表

| 元件 | 型号 / 规格 | 数量 |
| --- | --- | --- |
| 主控开发板 | ESP32-S3（带 USB-C） | 1 |
| 圆形 TFT 屏 | GC9A01，1.28 寸，240×240 | 1 |
| 数字麦克风 | INMP441 I2S 模块 | 1 |
| 杜邦线 |  | 若干 |

---

## 元件引脚说明

### GC9A01 屏幕引脚

| 引脚 | 功能说明 |
| --- | --- |
| VCC | 电源正（接 3.3V） |
| GND | 电源负 |
| SCL / CLK | SPI 时钟 |
| SDA / MOSI | SPI 数据（主机发送） |
| CS | 片选（低电平有效） |
| DC | 数据 / 命令选择 |
| RST | 复位（低电平触发） |
| BL | 背光控制（接 3.3V 常亮，或接 GPIO 用 PWM 调光） |

### INMP441 麦克风引脚

| 引脚 | 功能说明 |
| --- | --- |
| VDD | 电源正（接 3.3V） |
| GND | 电源负 |
| SD | I2S 数据输出（接 ESP32 数据输入） |
| WS | 字时钟 / 帧同步（左右声道选择） |
| SCK | 位时钟 |
| L/R | 声道选择：接 GND = 左声道，接 3.3V = 右声道，**不能悬空** |

---

## 接线方式

**建议接完一根对照表核对一根，能省 80% 的排错时间。**

### GC9A01 屏幕接线

| 模块引脚 | ESP32-S3 | 线色参考 |
| --- | --- | --- |
| VCC | 3.3V | 红 |
| GND | GND | 灰 |
| SCL / CLK | GPIO12 | 黄 |
| SDA / MOSI | GPIO11 | 蓝 |
| CS | GPIO9 | 绿 |
| DC | GPIO10 | 橙 |
| RST | GPIO18 | 紫 |
| BL | GPIO7 / 3.3V | 青 |



### INMP441 麦克风接线

| 模块引脚 | ESP32-S3 | 线色参考 |
| --- | --- | --- |
| VDD | 3.3V | 红 |
| GND | GND | 灰 |
| SD | GPIO4 | 蓝 |
| WS | GPIO5 | 绿 |
| SCK | GPIO6 | 黄 |
| L/R | GND（左声道） | 灰 |

> ⚠️ **L/R 必须接，不能悬空。** 悬空会导致声道选择未定义，采集到的全是噪声，频谱柱会乱跳跟声音毫无关系——别问我怎么知道的。

#### 

- 务必使用 **3.3V** 供电，不要接 5V
- INMP441 的 L/R 引脚接 GND = 左声道输出
- 先接好线，供电和地线用万用表测试一下再通电，避免短路

---

## 需要安装的库

在 **Arduino IDE → 工具 → 管理库** 中搜索并安装：

| 库名 | 作者 | 测试通过版本 | 用途 |
| --- | --- | --- | --- |
| `Arduino_GFX_Library` | moononournation | v1.6.5 | GC9A01 屏幕驱动 |
| `arduinoFFT` | kosme | v2.0.4 | 快速傅里叶变换 |

> I2S 驱动（`driver/i2s.h`）是 ESP32 内置库，不需要额外安装。
>
> Arduino IDE 推荐用 **2.3.x 及以上版本**，旧版 1.x 对 ESP32-S3 的支持不稳定。

---

## 完整代码

```cpp
#include <Arduino_GFX_Library.h>
#include <driver/i2s.h>
#include <arduinoFFT.h>

// ====== 第一步：定义屏幕引脚 ======
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// ====== 第二步：定义麦克风引脚 ======
#define I2S_WS    5    // 字时钟（帧同步）
#define I2S_SD    4    // 数据输入
#define I2S_SCK   6    // 位时钟
#define I2S_PORT  I2S_NUM_0

// ====== FFT 参数 ======
#define SAMPLES   512   // 每次采样点数，2 的幂次效率最高
#define BANDS     16    // 频谱显示的频段数量

// ====== 初始化 GC9A01 屏幕 ======
// Arduino_ESP32SPI 告诉库"我用的是 ESP32 的硬件 SPI"
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);  // -1 = 不用 MISO（屏幕只需要写）
Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0, true);  // 0 = 不旋转，true = IPS 屏

// ====== FFT 缓冲区 ======
double vReal[SAMPLES];   // 实部（存原始采样数据）
double vImag[SAMPLES];   // 虚部（FFT 内部用，初始化全 0）
ArduinoFFT<double> FFT = ArduinoFFT<double>(
  vReal, vImag, SAMPLES, 44100);  // 44100 = 采样率 44.1kHz

// ====== 频段能量和峰值 ======
float bandValues[BANDS];    // 每个频段当前的能量（归一化到 0~1）
float peakValues[BANDS];    // 每个频段的峰值（用于画峰值白点）
int16_t sampleBuf[SAMPLES]; // 原始采样缓冲区

// ====== 颜色工具：HSL 转 RGB565 ======
// 彩虹效果靠这个函数实现——把色相(H)映射成屏幕能用的 RGB565 格式
uint16_t hslToRgb565(float h, float s, float l) {
  float c = (1.0f - fabsf(2.0f * l - 1.0f)) * s;
  float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
  float m = l - c / 2.0f;
  float r, g, b;
  if (h < 60)       { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  uint8_t R = (uint8_t)((r + m) * 31);
  uint8_t G = (uint8_t)((g + m) * 63);
  uint8_t B = (uint8_t)((b + m) * 31);
  return (R << 11) | (G << 5) | B;  // 打包成 RGB565 格式
}

// ====== 第三步：初始化麦克风 I2S ======
void setupMicrophone() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),  // 主机模式，只接收
    .sample_rate = 44100,                                   // 采样率 44.1kHz
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,          // 16 位精度
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,           // 只用左声道（L/R 接 GND）
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,    // DMA 缓冲区数量
    .dma_buf_len = 64,     // 每个缓冲区的帧数
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,      // 不需要输出（不是扬声器）
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

void setup() {
  Serial.begin(115200);

  // 第四步：点亮背光，初始化屏幕
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);  // 背光常亮
  gfx->begin();
  gfx->fillScreen(0x0000);     // 先填黑，防止上电花屏

  // 第五步：初始化麦克风
  setupMicrophone();

  memset(peakValues, 0, sizeof(peakValues));  // 峰值数组清零
}

// ====== 绘制圆形频谱 ======
void drawCircularSpectrum() {
  int cx = 120, cy = 120;           // 圆心坐标（240×240 屏幕正中心）
  int innerR = 25;                  // 频谱柱内半径（中心空心圆的大小）
  int maxLen = 85;                  // 频谱柱最长像素数
  float angleStep = 2.0f * PI / BANDS;   // 每个频段占的角度
  float barWidth = angleStep * 0.7f;     // 柱子宽度（留 30% 间隙，好看）

  gfx->fillScreen(0x0000);  // 每帧先清屏（全黑）

  for (int i = 0; i < BANDS; i++) {
    float angle = i * angleStep - PI / 2.0f;  // 从 12 点方向开始顺时针排列
    float hue = (float)i / BANDS * 360.0f;    // 每个频段一个颜色（彩虹渐变）
    float val = bandValues[i];
    int barLen = (int)(val * maxLen);          // 根据能量算柱子长度

    // 画彩虹柱（从内到外，每隔 2 像素画一条弧线，越靠外越亮）
    for (int r = innerR; r < innerR + barLen; r += 2) {
      float t = (float)(r - innerR) / maxLen;
      uint16_t color = hslToRgb565(hue, 1.0f, 0.3f + t * 0.3f);
      float x1 = cx + cosf(angle - barWidth/2) * r;
      float y1 = cy + sinf(angle - barWidth/2) * r;
      float x2 = cx + cosf(angle + barWidth/2) * r;
      float y2 = cy + sinf(angle + barWidth/2) * r;
      gfx->drawLine(x1, y1, x2, y2, color);
    }

    // 画峰值白点（能量超过 2% 才显示，太小就不画了）
    if (peakValues[i] > 0.02f) {
      int peakR = innerR + (int)(peakValues[i] * maxLen) + 3;
      float px = cx + cosf(angle) * peakR;
      float py = cy + sinf(angle) * peakR;
      gfx->fillCircle(px, py, 2, 0xFFFF);  // 白色小圆点
    }

    // 峰值缓降：每帧乘以 0.95，慢慢往下掉，像专业设备那种效果
    peakValues[i] *= 0.95f;
    if (bandValues[i] > peakValues[i]) {
      peakValues[i] = bandValues[i];  // 能量超过峰值就更新峰值
    }
  }
}

void loop() {
  // 第六步：读取麦克风 I2S 数据
  size_t bytes_read = 0;
  i2s_read(I2S_PORT, sampleBuf, sizeof(sampleBuf),
           &bytes_read, portMAX_DELAY);  // 一直等到读满为止

  // 第七步：把采样数据填入 FFT 实部
  for (int i = 0; i < SAMPLES; i++) {
    vReal[i] = (double)sampleBuf[i];
    vImag[i] = 0.0;  // 虚部清零
  }

  // 第八步：执行 FFT（三步走：加窗 → 计算 → 取模）
  FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);  // 加 Hamming 窗，减少频谱泄漏
  FFT.compute(FFT_FORWARD);                           // 正向 FFT
  FFT.complexToMagnitude();                           // 复数转幅度

  // 第九步：把 FFT 结果映射到 16 个频段
  memset(bandValues, 0, sizeof(bandValues));
  int specLen = SAMPLES / 2;  // FFT 有效长度是采样点数的一半
  for (int i = 0; i < BANDS; i++) {
    // 指数分段，让低频显示更细腻（人耳对低频更敏感）
    int start = (int)(pow((float)i / BANDS, 1.8f) * specLen * 0.7f);
    int end   = (int)(pow((float)(i+1) / BANDS, 1.8f) * specLen * 0.7f);
    if (end <= start) end = start + 1;
    float sum = 0;
    for (int j = start; j < end && j < specLen; j++) {
      sum += (float)vReal[j];
    }
    float avg = sum / (end - start);
    bandValues[i] = constrain(avg / 5000.0f, 0.0f, 1.0f);  // 归一化到 0~1
  }

  // 第十步：画圆形频谱
  drawCircularSpectrum();
}
```

---

## 代码说明

**① 为什么 SAMPLES = 512？**
512 是 2 的幂次，FFT 算法在这种长度下效率最高。以 44.1kHz 采样率为例，512 点 FFT 的频率分辨率约为 86Hz——够用了。换成 256 更快但频率细节少，换成 1024 更细腻但帧率会明显下降。

**② 频段分布为什么用 pow(..., 1.8)?**
线性分频段会让高频区域的频段挤满数据，低频却空空如也。指数分法让低频频段更窄（细腻）、高频频段更宽（合并噪音），和人耳的频率感知曲线更接近，看起来更"正常"。

**③ 归一化除以 5000 是怎么来的？**
这个值和你的麦克风距离声源、环境音量都有关系——不同场景需要手动调。如果柱子总是顶到头（能量截断），就把 5000 改大；如果柱子太矮几乎看不见，就改小。

**④ peakValues[i] *= 0.95 的作用？**
这是"峰值保持 + 缓降"的经典套路：声音突然停止时，峰值白点不会瞬间消失，而是每帧乘以 0.95 缓缓下落，视觉上更顺滑，像专业音频设备那种效果。

---

## 常见问题排查

**别慌，90% 的问题出在这几个地方：**

**屏幕全黑，什么都不显示**
先检查背光（BL 引脚）是否真的拉高了（如果你的模块没有BL引脚可以忽略），再检查 SPI 四根线（SCK / MOSI / CS / DC）有没有接错或接虚。用万用表量一下 VCC 是否有 3.3V 输出。如果背光亮但屏幕全黑，十有八九是 CS 或 DC 接错了，换过来试试。

**频谱柱一动不动，或者乱跳跟声音毫无关系**
第一件事：**确认 INMP441 的 L/R 引脚接了 GND**，这是最高频的坑。悬空的 L/R 会导致声道选择异常，采集到的全是随机噪声。L/R 接好之后再检查 SD / WS / SCK 三根线的 GPIO 编号。

**频谱柱全部顶到头（能量一直最大）**
把代码里 `bandValues[i] = constrain(avg / 5000.0f, ...)` 中的 `5000` 改大，比如 `15000` 或 `30000`。麦克风离声源太近也会这样，先把麦克风移远 30cm 试试。

**频谱柱有反应，但只有少数几根动**
可能是测试用的声源频率范围太窄（比如只用单音哨声）。换一段全频段音乐（带低音、人声、高频乐器的），看各频段是否都有响应。

**编译失败：ArduinoFFT 模板类报错**
确认安装的是 `arduinoFFT`（kosme 版）**v2.x**。v1.x 的写法是 `ArduinoFFT FFT`（没有模板参数），v2.x 才是 `ArduinoFFT<double>`，两个版本 API 不兼容。在库管理器里直接更新到最新版本即可。

---

## FAQ

**Q：INMP441 的 L/R 引脚不接会怎样？**
A：声道选择悬空，麦克风输出行为未定义，实测大概率采集到全是噪声的随机数据，频谱柱会乱跳，和声音完全无关。接 GND = 左声道，接 3.3V = 右声道，二选一，不能不接。

**Q：SAMPLES 能改成 1024 吗？会有什么影响？**
A：可以改，频率分辨率从约 86Hz 提升到约 43Hz，低频细节更丰富。代价是每帧采集和计算时间翻倍，刷新率会从约 20fps 降到约 10fps。对频谱可视化来说 10fps 肉眼仍然可以接受。

**Q：只有 3.3V，INMP441 能正常工作吗？**
A：完全没问题。INMP441 支持 1.8V ～ 3.3V 供电，3.3V 是最常见的工作电压，不需要额外降压模块。

**Q：ESP32-S3 的 CPU 占用率高吗，会影响其他任务吗？**
A：512 点 FFT 在 ESP32-S3 的 240MHz 主频下大约占单核 10%～15% 的 CPU 时间。如果还需要跑 Wi-Fi 或蓝牙，建议把 FFT + 绘图放到 Core 0，网络任务放到 Core 1，两者互不干扰。

**Q：GC9A01 能换成 ST7789 或其他屏幕驱动吗？**
A：可以换。Arduino_GFX_Library 支持几十种驱动芯片，把代码里的 `Arduino_GC9A01` 换成对应的类（如 `Arduino_ST7789`），修改分辨率参数，接线参考新屏幕数据手册即可。注意非圆形屏需要重新计算圆心坐标。

**Q：频谱安静时有"底噪"，柱子不归零，怎么办？**
A：INMP441 本身有底噪（SNR 61dBA 意味着总有极少量环境噪声被采入），可以加一个噪声门限：在映射前加一行 `if (avg < 200) avg = 0;`，安静时柱子就能完全归零了。同时把归一化除数适当调大也有帮助。

**Q：ESP32-S3 用的是哪个版本的 I2S 驱动？**
A：本文使用的是 ESP-IDF v4.x 风格的旧版 I2S 驱动（`i2s_driver_install` / `i2s_read`）。ESP-IDF v5.x 引入了新版 I2S API（`i2s_new_channel` 等），如果你的 ESP32-S3 板支持包升级到了 3.x，需要参考新版 API 对 `setupMicrophone()` 函数进行改写。

---

## 延伸玩法

- 换成 32 个频段，搭配更大圆屏（如 2.1 寸 GC9A01A），频谱更细腻
- 加触摸按键切换显示模式（圆形辐射 / 竖向柱形 / 示波器波形）
- 接入 Wi-Fi，把频谱数据推送到浏览器，在网页里再渲染一遍
- 用两块 INMP441 实现立体声，左右声道分别用不同颜色呈现

---

## 参考资料

- [INMP441 官方数据手册 — TDK InvenSense](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [GC9A01 驱动芯片数据手册](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [arduinoFFT GitHub — kosme](https://github.com/kosme/arduinoFFT)
- [ESP32-S3 技术规格书 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP-IDF I2S 驱动文档 — Espressif](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)
