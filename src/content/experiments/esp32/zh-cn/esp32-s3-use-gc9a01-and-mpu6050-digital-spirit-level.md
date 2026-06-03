---
title: "ESP32-S3 + GC9A01 + MPU6050 制作数字水平仪完整教程｜SPI + I2C + Arduino"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-03
intro: "用 ESP32-S3 驱动 GC9A01 圆形 LCD 和 MPU6050 六轴传感器，实时显示俯仰角、横滚角和温度，制作一个好看又实用的数字水平仪。"
image: "https://img.lingflux.com/2026/06/64f482f7efccfdc6b16f216a95efc28e.jpg"
---

# ESP32-S3 + GC9A01 + MPU6050 数字水平仪完整教程（SPI + I2C + Arduino）

难度：⭐⭐☆☆☆（新手可上手）
预计时间：45 分钟
测试环境：Arduino IDE 2.3.8 ｜ Arduino_GFX_Library v1.6.5 ｜ MPU6050_light v1.2.1

---

> **一句话摘要**：ESP32-S3 驱动 GC9A01 圆形 TFT + MPU6050 六轴传感器，做一个实时气泡水平仪，气泡颜色随倾斜角度变化（绿→黄→红），附完整接线表和 Arduino 代码。

---

> **TL;DR（快速上手）：**
>
> 1. MPU6050 接线：SDA → GPIO 15，SCL → GPIO 16，AD0 → GND（固定 I2C 地址 0x68）
> 2. GC9A01 接线：CLK → GPIO 12，MOSI → GPIO 11，CS → GPIO 9，DC → GPIO 10，RST → GPIO 18，BL → GPIO 7
> 3. 安装库：`GFX Library for Arduino`（作者 moononournation）+ `MPU6050_light`（作者 rfetick）
> 4. 烧录代码，上电后**保持水平静置约 1 秒**等校准提示消失，然后随意倾斜看气泡跑

---

## 前言

你有没有试过徒手安装一块搁板，觉得"差不多水平了"，放上东西才发现所有东西都在往一边溜？

我就是这种人。本来是借不到传统水平仪，想着翻翻零件盒碰碰运气——结果圆形屏 GC9A01 和 MPU6050 都在角落里吃灰，两个凑在一起刚好就是一个数字水平仪的全部原料。

更妙的是，圆形屏做水平仪在视觉上也天作之合：气泡居中 = 绿色，偏一点 = 黄色，倾斜过头 = 红色，一眼就看懂，不需要任何说明书。

本文目标：**从零开始，接线 → 装库 → 烧代码 → 看气泡动**，照着做就能复现。

---

## 实验效果

![](https://img.lingflux.com/2026/06/09a4ed83eaa702df1ded539d608c9323.jpg)

屏幕实时显示四项内容：

- **中央气泡**：随设备倾斜移动，颜色三段指示（绿 = 水平 / 黄 = 轻微倾斜 / 红 = 明显倾斜）
- **合成倾斜角**（°）：Pitch 和 Roll 的合成值，大字显示
- **Pitch / Roll 分项数值**：俯仰角与横滚角各自的读数
- **芯片温度**：MPU6050 内置温度传感器的读数（比室温偏高属正常，后文有说明）


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30s2V_TAoMo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## 元件说明

### GC9A01 圆形 TFT 显示屏

把它想象成**一块被专门裁成圆形的手机屏**——240×240 的分辨率不算顶尖，但贴着圆形玻璃放在桌上，做水平仪的表盘简直是为它量身定制的。

| 参数 | 数值 |
| --- | --- |
| 分辨率 | 240 × 240 px（圆形显示区域） |
| 接口 | SPI（最高 80 MHz） |
| 供电 | 3.3V |
| 色深 | 65K 色（RGB565） |
| 面板类型 | IPS |

选它的原因：圆形表盘天然适配气泡水平仪造型，SPI 高速接口跑 20fps 动画完全够用。

### MPU6050 六轴惯性传感器

把它想象成**手机陀螺仪和加速度计的合体版**——手机自动旋转屏幕、微信运动计步，用的就是同类芯片。MPU6050 把三轴加速度计（感知倾斜方向）和三轴陀螺仪（感知旋转速率）塞进同一颗 4mm × 4mm 的小芯片，还顺手附赠了一个温度传感器。

| 参数 | 数值 |
| --- | --- |
| 加速度量程 | ±2 / ±4 / ±8 / ±16 g（可配置） |
| 陀螺仪量程 | ±250 / ±500 / ±1000 / ±2000 °/s（可配置） |
| ADC 分辨率 | 16 位 |
| 接口 | I2C（最高 400 kHz 快速模式） |
| 供电 | 3.3V（VDD 范围：2.375 ～ 3.46V） |
| I2C 地址 | 0x68（AD0 = GND）/ 0x69（AD0 = VCC） |

选它的原因：价格极低、库支持完善，`MPU6050_light` 直接输出融合角度，不用自己写卡尔曼滤波。

---

## BOM 表

| 元件 | 型号 / 规格 | 数量 |
| --- | --- | --- |
| 主控开发板 | ESP32-S3 | 1 |
| 圆形 TFT 屏 | GC9A01 240×240 IPS | 1 |
| 六轴传感器 | MPU6050 模块 | 1 |
| 导线 | 杜邦线 | 若干 |

---

## 元件引脚说明

### GC9A01 引脚

| 引脚标注 | 功能 |
| --- | --- |
| VCC | 3.3V 主供电 |
| GND | 电源地 |
| SCL / CLK | SPI 时钟（SCLK） |
| SDA / MOSI | SPI 主出从入数据 |
| CS | 片选（低电平有效） |
| DC | 数据 / 命令切换 |
| RST | 硬件复位（低电平有效） |
| BL | 背光控制 |

### MPU6050 引脚

| 引脚标注 | 功能 |
| --- | --- |
| VCC | 3.3V 主供电 |
| GND | 电源地 |
| SDA | I2C 数据线 |
| SCL | I2C 时钟线 |
| INT | 中断输出（轮询模式不接） |
| AD0 | I2C 地址选择（接 GND = 0x68） |
| XDA / XCL | 辅助 I2C 接口（本项目不接） |

---

## 接线方式

> 建议按下表逐行接完，每接一根在旁边打个钩，能省 80% 的排错时间。

### MPU6050 → ESP32-S3

| MPU6050 引脚 | ESP32-S3 引脚 | 说明 |
| --- | --- | --- |
| VCC | 3.3V | 主供电 |
| GND | GND | 共地 |
| SDA | GPIO 15 | I2C 数据线 |
| SCL | GPIO 16 | I2C 时钟线 |
| AD0 | GND | 固定 I2C 地址为 0x68 |
| INT / XDA / XCL | 不接 | 本项目不需要 |

**关于 I2C 上拉电阻**：标准做法是在 SDA 和 SCL 各接一颗 4.7kΩ 上拉电阻到 3.3V，能明显提升高速读取的抗干扰稳定性。本示例省略了这一步，但如果你要做成成品，建议加上。

### GC9A01 → ESP32-S3

| GC9A01 引脚 | ESP32-S3 引脚 | 说明 |
| --- | --- | --- |
| VCC | 3.3V | 主供电 |
| GND | GND | 共地 |
| SCL / CLK | GPIO 12 | SPI 时钟 |
| SDA / MOSI | GPIO 11 | SPI 数据 |
| CS | GPIO 9 | 片选 |
| DC | GPIO 10 | 数据 / 命令切换 |
| RST | GPIO 18 | 硬件复位 |
| BL | GPIO 7 | 背光（可选，有些模块没有这个PIN口的。代码控制高低电平，或直接接 3.3V 常亮） |



---

## 需要安装的库

在 Arduino IDE 菜单 **工具 → 管理库** 里搜索并安装：

| 库名称 | 作者 | 测试通过版本 |
| --- | --- | --- |
| GFX Library for Arduino | moononournation | v1.6.5 |
| MPU6050_light | rfetick | v1.2.1 |

版本不一致可能导致 API 变动，建议安装表中版本。安装完后重启 Arduino IDE，再开项目。



---

## 完整代码

```cpp
/**
 * ESP32-S3 + GC9A01 + MPU6050 数字水平仪
 * Digital Spirit Level
 *
 * 接线：
 *   GC9A01  → SCL=12, SDA=11, CS=9, DC=10, RST=18, BL=7
 *   MPU6050 → SDA=15, SCL=16, AD0=GND（I2C 地址 0x68）
 */

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <MPU6050_light.h>

// ---- 颜色定义（RGB565 格式）----
#define COLOR_BG       0x0863   // 深色背景
#define COLOR_GRID     0x1A69   // 刻度网格线
#define COLOR_GREEN    0x07E6   // 气泡居中 → 绿色
#define COLOR_YELLOW   0xFEA0   // 轻微倾斜 → 黄色
#define COLOR_RED      0xF820   // 倾斜过大 → 红色
#define COLOR_TEXT     0xC618   // 普通文字
#define COLOR_ACCENT   0xFD20   // 中心十字线

// ---- GC9A01 SPI 引脚 ----
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---- MPU6050 I2C 引脚（务必与接线表一致）----
#define MPU_SDA  15   // SDA → GPIO 15
#define MPU_SCL  16   // SCL → GPIO 16

// ---- 初始化显示驱动 ----
// 第一步：创建 SPI 总线，参数顺序：DC, CS, SCK, MOSI, MISO
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA,
    GFX_NOT_DEFINED
);
// 第二步：创建 GC9A01 屏幕对象（rotation=0，IPS 面板=true）
Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST, 0, true
);
// 第三步：创建 240×240 离屏 Canvas（双缓冲，防画面撕裂）
Arduino_Canvas *canvas = new Arduino_Canvas(
    240, 240, gfx
);

// ---- MPU6050 ----
MPU6050 mpu(Wire);

// ---- 帧率控制 ----
const int16_t cx = 120, cy = 120;    // 屏幕圆心坐标（像素）
unsigned long lastFrame = 0;
const int frameDelay = 1000 / 20;    // 目标帧率：20fps → 每帧 50ms

// ---- 函数前向声明 ----
void drawGrid();
void drawBubble(float pitch, float roll);
void drawReadouts(float pitch, float roll, float temp);

// =============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("=== ESP32-S3 数字水平仪 启动中 ===");

    // 第一步：初始化屏幕和背光
    gfx->begin();
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);    // 打开背光
    canvas->begin();
    Serial.println("[OK] 屏幕初始化完成");

    // 第二步：初始化 I2C，扫描总线（方便调试时确认接线）
    Wire.begin(MPU_SDA, MPU_SCL);
    Serial.print("[DBG] 扫描 I2C 总线 SDA=");
    Serial.print(MPU_SDA);
    Serial.print(" SCL=");
    Serial.println(MPU_SCL);

    byte found = 0;
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            Serial.print("  找到 I2C 设备，地址：0x");
            Serial.println(addr, HEX);
            found++;
        }
    }
    if (found == 0) {
        Serial.println("[ERROR] 未找到任何 I2C 设备！请检查接线。");
    }

    // 第三步：初始化 MPU6050
    byte status = mpu.begin();
    if (status == 0) {
        Serial.println("[OK] MPU6050 连接成功");
    } else {
        Serial.println("[ERROR] MPU6050 未响应！检查接线或 I2C 地址。");
    }

    // 第四步：陀螺仪自动校准（运行期间保持设备水平静置约 1 秒）
    Serial.println("[DBG] 校准中，请保持设备水平，不要移动...");
    canvas->fillScreen(COLOR_BG);
    canvas->setTextColor(COLOR_TEXT);
    canvas->setTextSize(1);
    canvas->setCursor(60, 110);
    canvas->print("Calibrating...");
    canvas->setCursor(55, 125);
    canvas->print("Keep device flat");
    canvas->flush();

    delay(1000);
    mpu.calcOffsets();    // 自动计算加速度计和陀螺仪的零偏

    Serial.print("[DBG] 加速度偏移: ");
    Serial.print(mpu.getAccXoffset());  Serial.print(", ");
    Serial.print(mpu.getAccYoffset());  Serial.print(", ");
    Serial.println(mpu.getAccZoffset());
    Serial.print("[DBG] 陀螺仪偏移: ");
    Serial.print(mpu.getGyroXoffset()); Serial.print(", ");
    Serial.print(mpu.getGyroYoffset()); Serial.print(", ");
    Serial.println(mpu.getGyroZoffset());
    Serial.println("[OK] 校准完成，开始运行！");
}

// =============================================================
static int logCnt = 0;    // 调试日志节流计数器

void loop() {
    unsigned long now = millis();
    if (now - lastFrame < frameDelay) return;    // 帧率节流
    lastFrame = now;

    // 第一步：读取传感器
    mpu.update();
    float pitch = mpu.getAngleY();     // 俯仰角（前后倾斜）
    float roll  = -mpu.getAngleX();    // 横滚角（左右倾斜，取反对齐视觉方向）
    float temp  = mpu.getTemp();       // 芯片温度（比环境温度偏高属正常）

    // 调试日志：每 20 帧（约 1 秒）打印一次，不影响帧率
    if (++logCnt >= 20) {
        logCnt = 0;
        Serial.print("[DBG] pitch="); Serial.print(pitch, 2);
        Serial.print(" roll=");       Serial.print(roll,  2);
        Serial.print(" temp=");       Serial.print(temp,  1);
        Serial.print(" | accX=");     Serial.print(mpu.getAccX(), 2);
        Serial.print(" accY=");       Serial.print(mpu.getAccY(), 2);
        Serial.print(" accZ=");       Serial.println(mpu.getAccZ(), 2);
    }

    // 第二步：限幅——超过 ±45° 时气泡贴边显示，不会跑出圆圈
    pitch = constrain(pitch, -45.0f, 45.0f);
    roll  = constrain(roll,  -45.0f, 45.0f);

    // 第三步：绘制当前帧
    canvas->fillScreen(COLOR_BG);        // 清空画布
    drawGrid();                          // 刻度网格
    drawBubble(pitch, roll);             // 气泡
    drawReadouts(pitch, roll, temp);     // 数值文字
    canvas->flush();                     // 推送到屏幕
}

// =============================================================
// 绘制背景刻度圈和中心十字准星
void drawGrid() {
    canvas->drawCircle(cx, cy,  25, COLOR_GRID);
    canvas->drawCircle(cx, cy,  50, COLOR_GRID);
    canvas->drawCircle(cx, cy,  80, COLOR_GRID);
    canvas->drawCircle(cx, cy, 105, COLOR_GRID);
    canvas->drawFastHLine(15, cy,  210, COLOR_GRID);
    canvas->drawFastVLine(cx, 15,  210, COLOR_GRID);
    // 中心十字准星（使用强调色，比网格更显眼）
    canvas->drawFastHLine(cx - 5, cy,     10, COLOR_ACCENT);
    canvas->drawFastVLine(cx,     cy - 5, 10, COLOR_ACCENT);
}

// 根据 pitch/roll 角度映射气泡位置，并按距离着色
void drawBubble(float pitch, float roll) {
    // ±45° 线性映射到 ±90px 偏移
    int16_t bx = cx + (int16_t)(roll  / 45.0f * 90.0f);
    int16_t by = cy + (int16_t)(pitch / 45.0f * 90.0f);

    // 计算气泡与中心的像素距离，决定颜色等级
    float dist = sqrt((float)((bx - cx) * (bx - cx) + (by - cy) * (by - cy)));
    uint16_t color;
    if      (dist < 10) color = COLOR_GREEN;    // ≈ ±5° 内：水平
    else if (dist < 40) color = COLOR_YELLOW;   // ≈ ±20° 内：轻微倾斜
    else                color = COLOR_RED;       // 超过 ±20°：明显倾斜

    // 中心到气泡的连线 + 实心气泡 + 白色描边
    canvas->drawLine(cx, cy, bx, by, COLOR_GRID);
    canvas->fillCircle(bx, by, 8, color);
    canvas->drawCircle(bx, by, 8, 0xFFFF);
}

// 绘制角度数值、状态文字和温度
void drawReadouts(float pitch, float roll, float temp) {
    float total = sqrt(pitch * pitch + roll * roll);    // 合成倾斜角

    canvas->setTextSize(1);
    canvas->setTextColor(COLOR_TEXT);

    // 顶部标题
    canvas->setCursor(55, 18);
    canvas->print("DIGITAL LEVEL");

    // 合成角度：大字体，颜色与气泡同步
    canvas->setTextSize(2);
    uint16_t color;
    if      (total < 1)  color = COLOR_GREEN;
    else if (total < 10) color = COLOR_YELLOW;
    else                 color = COLOR_RED;
    canvas->setTextColor(color);
    canvas->setCursor(75, 155);
    canvas->print(total, 1);
    canvas->print((char)247);    // ° 符号（ASCII 247）

    // 状态文字
    canvas->setTextSize(1);
    canvas->setCursor(80, 178);
    if      (total < 1)  canvas->print("  LEVEL");
    else if (total < 10) canvas->print(" TILTED");
    else                 canvas->print("  STEEP");

    // Pitch / Roll 分项读数
    canvas->setTextColor(COLOR_TEXT);
    canvas->setCursor(20, 195);
    canvas->print("P:"); canvas->print(pitch, 1);
    canvas->print(" R:"); canvas->print(roll,  1);

    // 温度（芯片结温，比室温偏高属正常现象）
    canvas->setCursor(60, 210);
    canvas->print("T:"); canvas->print(temp, 1);
    canvas->print("C");
}
```

---

## 代码说明

**初始化流程（setup）**

setup 里按顺序走四步：屏幕初始化 → I2C 扫描 → MPU6050 初始化 → 陀螺仪校准。这个时候，你的模块如何摆放，那么中心点就会设置在那个位置。

屏幕用 `Arduino_Canvas` 做离屏双缓冲——所有绘制先在内存里完成，最后一次性 `flush()` 推到屏幕，画面不会出现撕裂或中间帧。

I2C 扫描那一段会在串口打印找到的设备地址，上电第一次调试时可以先打开串口监视器确认 MPU6050 有没有接通（正常应该打印 `Found I2C device at 0x68`）。

`mpu.calcOffsets()` 是自动校准，运行约 1 秒，期间需要保持设备水平静置。**每次上电都会重新校准**，所以每次开机先放平，等屏幕提示消失再使用。

**主循环（loop）**

帧率锁定在 20fps，每帧做四件事：读传感器 → 限幅 → 绘制 → 推屏。

`roll = -mpu.getAngleX()` 前面加了负号——目的是让屏幕气泡的移动方向和实际倾斜方向保持一致，不取反的话气泡会往反方向跑。如果你的安装方向不同，可以自行调整正负号。

气泡颜色三段判断：距圆心 <10px 绿色，<40px 黄色，其余红色，大约对应 ±5° 以内、±20° 以内、超过 ±20°。

---

## 常见问题排查

别慌，90% 的问题就出在接线和地址这几个地方：

**屏幕全白 / 全黑，没有任何显示**

先确认 VCC 是否接的 3.3V 而不是 5V（GC9A01 不耐压），BL 背光引脚是否已接通。再检查 CS、DC、RST 三根线有没有接错——CS 接错屏幕不响应，RST 悬空会卡在复位状态。可以先把 BL 直接接 3.3V 常亮，如果屏幕亮白，说明屏幕没问题，是 SPI 初始化失败。

**串口打印 `[ERROR] 未找到任何 I2C 设备`**

用万用表量一下 MPU6050 的 VCC 引脚有没有 3.3V。再确认 SDA 和 SCL 没有接反（SDA → GPIO 15，SCL → GPIO 16）。**AD0 必须显式接 GND**，悬空状态下部分模块地址不稳定，I2C 总线会不应答。

**气泡持续乱抖，无法稳定下来**

上电校准时设备没有完全静置。重新上电，放在平整桌面上，等待屏幕上的校准提示消失后再使用。如果桌面本身在振动（旁边有打印机、风扇），换个位置。

**Pitch 或 Roll 方向反了**

根据开发板的安装方向，在代码里调整对应角度前面的正负号：`pitch = mpu.getAngleY()` 改为 `pitch = -mpu.getAngleY()`，或者调整 `roll` 那行，调到方向正确为止。

**温度比室温高出十几度**

正常现象。MPU6050 测的是芯片结温，比环境温度高 10～20°C 很常见，仅供参考。如果需要精确环境温度，接一颗独立传感器（如 DS18B20）。

**画面闪烁或有撕裂感**

代码已启用 `Arduino_Canvas` 双缓冲，正常情况下不撕裂。如果依然有问题，检查 SPI 杜邦线是否松动，线材不要超过 20cm，必要时加 100nF 去耦电容在电源引脚附近。

---

## FAQ

**Q：MPU6050 的角度更新频率是多少？**
A：`MPU6050_light` 以 I2C 400kHz 快速模式读取，原始数据采样率最高 1kHz。本代码帧率限定 20fps，实际刷新 20Hz。如果需要更高刷新率，把 `frameDelay` 改为更小的值，实测 40fps 以内比较稳定（受 SPI 推屏速度限制）。

**Q：引脚可以换其他的 GPIO 吗？**
A：可以，修改代码顶部的 `#define` 宏即可。GC9A01 的 SPI 引脚建议选 ESP32-S3 硬件 SPI（GPIO 11 / 12 是 SPI2，性能最佳）；MPU6050 的 I2C 引脚任意 GPIO 均可，只需代码和接线保持一致。

**Q：GC9A01 能换成方形屏吗？**
A：可以。把 `Arduino_GC9A01` 替换成对应驱动类（例如 ST7789 用 `Arduino_ST7789`），修改 `Arduino_Canvas` 的宽高和圆心坐标 `cx/cy` 即可，绘制逻辑不用动。

**Q：ESP32-S3 的 3.3V 同时带 GC9A01 和 MPU6050 够用吗？**
A：够用。GC9A01 背光电流约 20mA，MPU6050 典型功耗 3.5mW（约 1mA），合计远低于开发板 3.3V 引脚通常 300～500mA 的限流。

**Q：能在同一条 I2C 总线上挂两个 MPU6050 吗？**
A：可以。一个 AD0 接 GND（地址 0x68），另一个 AD0 接 VCC（地址 0x69），共用同一组 SDA/SCL。代码里声明两个 `MPU6050` 对象并分别传入不同地址初始化即可。

**Q：每次断电重启都要重新校准吗？**
A：是的，本代码每次上电都在 `setup()` 里调用 `mpu.calcOffsets()` 做一次动态校准。如果你的使用场景是固定安装，可以把偏移量保存到 EEPROM，下次上电直接读取，省去校准等待时间。

---

## 延伸玩法

- 接按键切换显示模式（水平仪 / 实时角度曲线 / 温度计）
- 把校准基准值存入 EEPROM，补偿固定安装面的偏角
- 接无源蜂鸣器，水平时发出提示音
- 换一套圆形表盘皮肤，做成磁力罗盘或 G-Force 显示器

---

## 参考资料

- [MPU-6000 / MPU-6050 产品规格书 — InvenSense（TDK）](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [GC9A01A 数据手册 — Galaxycore](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [MPU6050_light GitHub — rfetick](https://github.com/rfetick/MPU6050_light)
- [ESP32-S3 技术参考手册 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3 产品页 — Espressif](https://www.espressif.com/en/products/socs/esp32-s3)
