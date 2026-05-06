---
title: "ESP32-S3 + 1.3\" SH1106 OLED 赛博养章鱼｜I2C + U8g2 动画教程"
boardId: esp32s3
moduleId: display/oled13-sh1106
category: esp32
date: 2026-05-06
intro: "ESP32-S3 驱动 1.3 寸 SH1106 OLED，用 U8g2 库实现章鱼游泳动画 + 泡泡粒子特效。I2C 接线 4 根，Lissajous 曲线运动算法，附避坑指南。"
image: "https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg"
---

# ESP32-S3 驱动 1.3" SH1106 OLED 完整教程——赛博养章鱼动画（I2C + U8g2）

难度：⭐⭐☆☆☆（新手可上手）
预计时间：30 分钟
测试环境：Arduino IDE 2.3.8 · U8g2 v2.35.30 · ESP32 Board Package 3.3.8

---

> **TL;DR（快速上手）：**
>
> 1. 接线：SDA → GPIO 8，SCL → GPIO 9，VCC → 3.3V，GND → GND
> 2. 安装库：U8g2（作者 oliver）
> 3. 构造函数里把 I2C 地址改成 `0x3C * 2`，Wire 初始化改成 `Wire.begin(8, 9)`
> 4. 烧录代码，章鱼开始游泳
> 5. 代码使用Lissajous曲线运动算法，对算法有兴趣的可以详细了解

---

## 前言

你有没有在某宝刷到过那些 OLED 小屏幕——明明只有拇指指甲盖那么大，卖家视频里却能显示出各种流畅动画，看起来又炫又好玩。

我就是看完那段视频之后，第二天下午就下单了一块 1.3 寸 SH1106 OLED。然后就遇到了经典问题：屏幕到手，代码上传成功，亮了——但什么都不显示。

折腾了一个下午，发现坑主要集中在两个地方：**I2C 引脚不是默认的 21/22**，还有 **SH1106 的驱动芯片不是 SSD1306**，两个长得很像但不能混用。

搞清楚这两点之后，后面就顺了。本文目标：带你 30 分钟之内，让一只章鱼在你的 OLED 屏幕上游起来，还会吐泡泡。



---

## 实验效果



![ESP32-canva-017-1inch3-oled (1) (1)](https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg)



一只 32×32 像素的章鱼在屏幕上游泳，运动轨迹是 Lissajous 曲线（就是那种 8 字形的优雅波浪），同时嘴部持续吐出大小不一、会慢慢飘散消失的气泡。

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/zw06nh7wXp4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 元件说明

### 1.3" OLED SH1106

SH1106 是一款单色 OLED 驱动芯片，负责把你代码里的 0 和 1 变成屏幕上亮着的像素点。可以把它理解成一个点阵翻译官——你告诉它"第 30 行第 50 列亮起来"，它就去控制对应的有机发光二极管发光。

| 参数 | 数值 |
|------|------|
| 分辨率 | 128 × 64 像素 |
| 驱动芯片 | SH1106（≠ SSD1306） |
| 通信接口 | I2C（默认地址 0x3C） |
| 工作电压 | 3.3V / 5V 兼容 |
| 屏幕尺寸 | 1.3 寸 |

> 选它的理由：便宜、够用，配合 U8g2 库，点阵动画轻松搞定。注意别买成 0.96 寸的 SSD1306，驱动芯片不一样，代码直接套用会白屏。

---

## BOM 表

| 元件 | 数量 |
|------|------|
| ESP32-S3 开发板 | × 1 |
| 1.3" OLED SH1106（I2C） | × 1 |
| 杜邦线（公对母） | × 4 |

---

## 接线方式

| 1.3" OLED 引脚 | 接到 ESP32-S3 |
|-----------|---------------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

> 建议接完之后逐一核对，能省 80% 的排错时间。SDA/SCL 接反是最常见的白屏原因，看起来完全正常通电，就是什么都不显示。

---

## 安装库

在 Arduino IDE 的库管理器里搜索 **U8g2**，安装 oliver 发布的版本。

测试通过版本：**U8g2 v2.35.30**

U8g2 是 [olikraus/u8g2](https://github.com/olikraus/u8g2) 维护的开源显示库，支持几乎所有常见的单色 OLED/LCD 驱动芯片，SH1106 当然也在其中。

---

## 完整代码

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// 第一步：声明 U8g2 对象
// 注意：这里选 SH1106，128×64，全缓冲模式，硬件 I2C
// U8G2_R2 = 屏幕旋转 180 度（根据你的硬件焊接方向调整，不需要旋转就换成 U8G2_R0）
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R2, /* reset=*/ U8X8_PIN_NONE);

// ==================== 章鱼动画帧（存在 Flash 里，省 RAM）====================
// 4 帧逐帧动画，每帧 32×32 像素，XBM 点阵格式
const unsigned char animation_frame_0[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00,
  0x00, 0xFE, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00,
  0xE0, 0xFF, 0xFF, 0x01, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01,
  0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0x00, 0xEF, 0x3D, 0x00,
  0x00, 0xEF, 0x3D, 0x00, 0x00, 0xC7, 0x38, 0x00, 0x00, 0xC7, 0x38, 0x00,
  0x80, 0xC3, 0x70, 0x00, 0x80, 0xC3, 0x70, 0x00, 0x80, 0xC1, 0x60, 0x00,
  0x80, 0xC1, 0x60, 0x00, 0xC0, 0xC0, 0xC0, 0x00, 0xC0, 0xC0, 0xC0, 0x00,
  0x40, 0x80, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_1[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0xFC, 0x0F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01, 0xE0, 0xFF, 0xFF, 0x01,
  0xE0, 0xE7, 0xE7, 0x01, 0xE0, 0xE1, 0xE1, 0x01, 0xE0, 0xE7, 0xE7, 0x01,
  0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0x00, 0xFF, 0x3F, 0x00, 0x00, 0xFE, 0x1F, 0x00, 0x00, 0xDE, 0x1E, 0x00,
  0x00, 0xCF, 0x3C, 0x00, 0x80, 0xC7, 0x78, 0x00, 0xC0, 0xC3, 0xF0, 0x00,
  0xE0, 0xC1, 0xE0, 0x01, 0xE0, 0xC0, 0xC0, 0x01, 0xC0, 0xC0, 0xC0, 0x00,
  0x80, 0xC0, 0x40, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_2[] PROGMEM = {
  0x00, 0xF0, 0x00, 0x00, 0x00, 0xF8, 0x01, 0x00, 0x00, 0xFC, 0x03, 0x00,
  0x00, 0xFE, 0x07, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x80, 0xFF, 0x1F, 0x00, 0x80, 0xF9, 0x19, 0x00,
  0x80, 0xF0, 0x10, 0x00, 0x80, 0xF9, 0x19, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x00, 0xFE, 0x07, 0x00,
  0x00, 0xFC, 0x03, 0x00, 0x00, 0x6C, 0x03, 0x00, 0x00, 0x66, 0x06, 0x00,
  0x00, 0x63, 0x0C, 0x00, 0x80, 0x61, 0x18, 0x00, 0xC0, 0x60, 0x30, 0x00,
  0x60, 0x60, 0x60, 0x00, 0x30, 0x60, 0xC0, 0x00, 0x18, 0x60, 0x80, 0x01,
  0x0C, 0x60, 0x00, 0x03, 0x06, 0x60, 0x00, 0x06, 0x02, 0x60, 0x00, 0x04,
  0x00, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_3[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00, 0x00, 0xFE, 0x3F, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03, 0xF0, 0xF3, 0xF3, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x00, 0xF6, 0x06, 0x00,
  0x00, 0xF6, 0x06, 0x00, 0x00, 0x63, 0x0C, 0x00, 0x00, 0x63, 0x0C, 0x00,
  0x80, 0x61, 0x18, 0x00, 0x80, 0x61, 0x18, 0x00, 0x80, 0x60, 0x10, 0x00,
  0x80, 0x60, 0x10, 0x00, 0x40, 0x60, 0x20, 0x00, 0x40, 0x60, 0x20, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

// 把 4 帧指针放进数组，方便循环访问
const unsigned char* animation_frames[] = {
  animation_frame_0, animation_frame_1, animation_frame_2, animation_frame_3
};

const int TOTAL_FRAMES = 4;
const unsigned long FRAME_DELAY = 120; // 帧间隔（毫秒），改小就变快，改大就变慢
int currentFrame = 0;
unsigned long lastFrameTime = 0;
const int SPRITE_SIZE = 32; // 章鱼点阵尺寸 32×32

// ==================== 泡泡粒子系统 ====================
#define MAX_BUBBLES 10 // 屏幕上最多同时存在 10 个泡泡

struct Bubble {
  float x;       // 当前 X 坐标
  float y;       // 当前 Y 坐标
  float radius;  // 当前半径（浮点数，方便逐帧缩小）
  float speedY;  // 每帧上浮的像素数
  float wobble;  // 左右摇摆的随机相位偏移
  bool active;   // 这个泡泡"活着"吗
};

Bubble bubbles[MAX_BUBBLES]; // 对象池，避免动态分配内存

void setup() {
  Serial.begin(115200);

  // 第二步：用随机种子让每次开机的泡泡都不一样
  randomSeed(analogRead(0));

  // 第三步：初始化 I2C，指定 SDA=8，SCL=9
  Wire.begin(8, 9);
  u8g2.setI2CAddress(0x3C * 2); // U8g2 要求地址左移一位，0x3C << 1 = 0x78
  u8g2.begin();

  // 第四步：把所有泡泡标记为未激活
  for (int i = 0; i < MAX_BUBBLES; i++) {
    bubbles[i].active = false;
  }

  Serial.println("章鱼水族箱启动成功！");
}

void loop() {
  unsigned long currentTime = millis();

  // 用非阻塞计时代替 delay()，保证动画流畅
  if (currentTime - lastFrameTime >= FRAME_DELAY) {
    lastFrameTime = currentTime;

    // ======== 第一步：用 Lissajous 曲线计算章鱼位置 ========
    // 两个不同频率的正弦波叠加，产生优雅的 8 字形游动轨迹
    float t = currentTime * 0.0008;

    float waveX = sin(t * 0.8) * 0.6 + sin(t * 0.3) * 0.4;
    int posX = 48 + (int)(waveX * 48); // 横向范围大约 0~96

    float waveY = cos(t * 0.7) * 0.6 + sin(t * 0.4) * 0.4;
    int posY = 16 + (int)(waveY * 16); // 纵向范围大约 0~32

    // ======== 第二步：25% 概率在章鱼嘴边生成一个新泡泡 ========
    if (random(100) < 25) {
      for (int i = 0; i < MAX_BUBBLES; i++) {
        if (!bubbles[i].active) {
          bubbles[i].active = true;
          bubbles[i].x      = posX + 16 + random(-8, 8);   // 嘴部附近随机偏移
          bubbles[i].y      = posY + 24 + random(0, 5);
          bubbles[i].radius = random(15, 35) / 10.0;       // 1.5~3.5 像素
          bubbles[i].speedY = random(10, 25) / 10.0;       // 上浮速度随机
          bubbles[i].wobble = random(0, 100) / 10.0;       // 摇摆相位随机
          break; // 一帧只生成一个
        }
      }
    }

    // ======== 第三步：清空缓冲区，开始绘制 ========
    u8g2.clearBuffer();

    // 绘制章鱼本体（XBM 点阵图）
    u8g2.drawXBMP(posX, posY, SPRITE_SIZE, SPRITE_SIZE, animation_frames[currentFrame]);

    // ======== 第四步：更新并绘制所有存活的泡泡 ========
    for (int i = 0; i < MAX_BUBBLES; i++) {
      if (bubbles[i].active) {
        bubbles[i].y -= bubbles[i].speedY; // 往上浮

        // 配合时间轴做左右摇摆，像真水里的气泡
        float currentX = bubbles[i].x + sin(t * 3.0 + bubbles[i].wobble) * 4.0;

        // 泡泡逐帧缩小，模拟越飘越淡最后消失
        bubbles[i].radius -= 0.06;

        // 半径太小或飘出屏幕顶部 → 回收这个泡泡
        if (bubbles[i].radius <= 0.5 || bubbles[i].y < -5) {
          bubbles[i].active = false;
        } else {
          // 画空心圆——比实心圆更像真实气泡
          u8g2.drawCircle((int)currentX, (int)bubbles[i].y, (int)bubbles[i].radius);
        }
      }
    }

    // 第五步：把缓冲区内容一次性推送到屏幕
    u8g2.sendBuffer();

    // 切换到下一帧
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }
}
```

### 代码说明

**Lissajous 曲线运动**：两个不同频率的正弦/余弦叠加，让章鱼走出优雅的 8 字形路径，比简单来回移动好看很多，而且只需要几行三角函数。

**泡泡对象池**：提前分配好 10 个 `Bubble` 结构体，用 `active` 标志位管理"生死"，避免 `new/delete` 带来的内存碎片——在 MCU 上这是常见的省心写法。

**`PROGMEM` 关键字**：点阵数组加上这个关键字之后存进 Flash，不会占用宝贵的 SRAM。4 帧 × 128 字节 = 512 字节，放 RAM 里有点浪费。

**非阻塞计时**：用 `millis()` 而不是 `delay()`，这样泡泡的物理更新和章鱼动画帧切换可以在同一个循环里自然协调，不会出现卡顿。

---

## 常见问题排查

别慌，90% 的问题出在这几个地方：

**屏幕完全不亮 / 没有任何输出**
先检查供电——VCC 接的是 3.3V 不是 5V（虽然很多模块兼容 5V，但先确认）。然后用万用表量一下 SDA/SCL 两根线有没有接反，这是最高频的错误。

**屏幕亮了但全白或全黑，看不到图像**
八成是 I2C 地址问题。代码里用的是 `0x3C * 2`，这是 U8g2 的要求。如果你的屏幕背面 I2C 地址跳线是 `0x3D`，把 `0x3C` 改成 `0x3D` 再试。也可以先跑一遍 I2C Scanner 确认地址。

**图像显示但上下颠倒**
把构造函数里的 `U8G2_R2` 改成 `U8G2_R0` 即可，两者的区别只是旋转 180 度。

**章鱼位置超出屏幕边缘**
`posX` 的最大值大约是 96，加上 32 像素宽度正好到达 128 边界。如果你改动了运动幅度参数，注意别让坐标超过 `128 - SPRITE_SIZE`。

**泡泡看起来很卡**
把 `FRAME_DELAY` 从 120 改小到 80 试试。如果还卡，检查一下 I2C 总线速度，可以在 `Wire.begin(8, 9)` 之后加一行 `Wire.setClock(400000)` 切换到快速模式（400 kHz）。

---

## FAQ

**Q：能换成其他 GPIO 当 I2C 用吗？**
A：可以，ESP32-S3 的 I2C 支持映射到任意 GPIO。把 `Wire.begin(8, 9)` 里的数字改成你想用的引脚号就行，SDA 在前，SCL 在后。

**Q：我的屏幕是 0.96 寸 SSD1306，代码能直接用吗？**
A：不能直接用，驱动芯片不同。把构造函数换成 `U8G2_SSD1306_128X64_NONAME_F_HW_I2C`，其他代码部分可以保留。

**Q：I2C 速度支持多快？**
A：SH1106 标准模式 100 kHz，快速模式 400 kHz。本代码没有显式设置，默认走 100 kHz，如果觉得刷新慢可以加 `Wire.setClock(400000)`。

**Q：PROGMEM 是干什么的，可以删掉吗？**
A：`PROGMEM` 把数组存进 Flash 而不是 SRAM。4 帧点阵数据约 512 字节，删掉不影响功能，但会占用 512 字节 SRAM——ESP32-S3 SRAM 比较宽裕，删掉问题不大，建议保留是个好习惯。

**Q：想让章鱼游得更快或更慢怎么改？**
A：改 `FRAME_DELAY` 这个值——数字越小越快，越大越慢。泡泡的上浮速度由 `speedY` 范围 `random(10, 25) / 10.0` 控制，同样可以调。

**Q：屏幕用了多少 RAM？**
A：U8g2 全缓冲模式（`_F_`）会在 RAM 里维护一个完整帧缓冲区，128×64 ÷ 8 = 1024 字节，约 1KB。ESP32-S3 有 512KB SRAM，完全够用。

---

## 延伸玩法

- **换个主角**：用 [image2cpp](https://javl.github.io/image2cpp/) 把任意黑白图片转成 XBM 点阵，换掉章鱼
- **加传感器互动**：接一个声音传感器，章鱼的游速随音量变化
- **多屏联动**：两块 OLED 接在同一组 I2C 总线上（地址分别设 0x3C 和 0x3D），左右各一只章鱼
- **加 TFT 彩屏版**：换成 ST7789 彩色 TFT，用灰度渐变做出更细腻的泡泡效果

---

## 参考资料

- [乐鑫 ESP32-S3 技术规格书（官方）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_cn.pdf)
- [U8g2 库 GitHub 主页（olikraus/u8g2）](https://github.com/olikraus/u8g2)
- [SH1106 驱动芯片数据手册（Sino Wealth）](https://www.velleman.eu/downloads/29/infosheets/sh1106_datasheet.pdf)
- [image2cpp：图片转 XBM 点阵在线工具](https://javl.github.io/image2cpp/)
