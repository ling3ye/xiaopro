---
title: "ESP32-S3 驱动 EPD037A02（JD7601）六色电子纸：Hello、英文课表、照片三屏演示（SPI + Arduino）"
boardId: esp32s3
moduleId: display/epd-3inch7-epd037a02-jd7601
category: esp32
date: 2026-11-20
intro: "用 ESP32-S3 和 Adafruit GFX 驱动 EPD037A02 六色电子纸，包含 SPI 接线、Arduino 配置，以及 Hello、英文课表、照片三屏的完整代码。适合有 Arduino 上传经验、想学习六色电子纸驱动与照片转换的读者。"
image: "https://img.lingflux.com/2026/11/ff03861dd789ec83465baba962075e98.jpg"
---

难度：⭐⭐（有 Arduino 上传经验即可）<br>
耗时：第一次做，接线、装库、上传大约 30 分钟（估计值，没有计时）。三屏播完约 1～1.5 分钟（每屏全刷 15～25 秒，加两次 3 秒停留）。<br>
测试环境：Arduino IDE 2.3.8；esp32 Arduino Core 3.3.10；Adafruit GFX Library 1.13.0

> **一句话摘要**：用 ESP32-S3、SPI 和 Adafruit GFX 驱动 EPD037A02 六色电子纸，依次显示 Hello、英文课表和照片。

## 快速上手

- 从 [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601) 下载 `EPD_3in7_Showcase_JD7601` 整个文件夹（它在 LingShunLAB 仓库的 `Handbook/Arduino/ESP32-S3/` 下，可克隆或下载整个仓库的 ZIP）。主 `.ino`、驱动 `.h/.cpp` 和 `photo_data.h` 必须放在这个文件夹里，且文件夹名要和主 `.ino` 的文件名一致。
- 接线：BUSY、RST、DC、CS、MOSI、SCK 分别接 GPIO7、8、9、10、11、12；VDD 接 3.3 V，GND 与开发板共地。
- 安装 esp32 Arduino Core 3.3.10、Adafruit GFX Library 1.13.0，以及它依赖的 Adafruit BusIO 1.17.4。
- 开发板选 `ESP32S3 Dev Module`，编译上传，再打开 115200 的串口监视器。
- `HOLD_MS` 默认 3000 ms，是每屏刷新结束后多等的时间，不是换屏的间隔。

## 前言

我想用 ESP32-S3 做一张电子纸演示卡：先显示 Hello，再显示一张英文课表，最后停在一张照片上。

手上的 OSPTEK EPD037A02 是 480×720 的六色 SPI 屏。GxEPD2 里没有这块屏的驱动，所以我自己写了面板驱动，只负责 JD7601 的 SPI 时序和帧格式。文字和图形交给 Adafruit GFX。本文给出接线、库配置和三屏的完整代码。

## 最终效果

程序按 Hello → 英文课表 → 照片的顺序播放一次。前两屏刷新结束后各停 3000 ms，最后停在照片上，`loop()` 里不再刷屏。

![](https://img.lingflux.com/2026/11/dc08d160b6bc55bc5a237bcadf4abc9f.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/kzJw5SoUn40?si=yWxWSi7nY-pc4jXh" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>



## 元件说明
### EPD037A02 六色电子纸

EPD037A02 是 OSPTEK 的 3.7 英寸六色电子纸模组。电子纸靠环境光显色，断电后画面还在。本例用它显示文字、六色色块、课表和一张已经转换好的照片。

它只有黑、白、黄、红、蓝、绿六种颜色，没有灰阶。照片里的中间色要靠不同颜色的像素混排来模拟，所以不能把 JPG 直接发给屏幕，要先转成面板的帧格式。

| 参数 | 规格 |
| --- | --- |
| 型号 | EPD037A02 |
| 尺寸与分辨率 | 3.7 英寸，480×720 |
| 色彩 | 黑、白、黄、红、蓝、绿 |
| 像素格式 | 4 bit/像素，一个字节存两个像素 |
| 接口 | 4 线 SPI，1×8P 2.54 mm 排针 |
| 全刷时间 | 约 15～25 秒 |
| 供电 | 3.3 V |

用这块屏做演示，是因为一块屏就能试到文字、图形和六色照片。缺点是刷新慢，不能做动画。

## 物料清单

| 物料 | 数量 | 备注 |
| --- | --- | --- |
| ESP32-S3 开发板 | 1 | 本例选 `ESP32S3 Dev Module` |
| EPD037A02 模组与 SPI 转接板 | 1 | 480×720 六色电子纸 |
| 2.54 mm 杜邦线 | 8 根 | 6 根信号线，1 根电源，1 根地 |
| USB 数据线 | 1 | 供电、上传、看串口 |

### 引脚说明

| 屏幕引脚 | 方向 | 作用 |
| --- | --- | --- |
| BUSY | 屏 → ESP32-S3 | 高电平表示空闲，低电平表示忙 |
| CS | ESP32-S3 → 屏 | 片选，低电平有效，由程序手动控制 |
| DC | ESP32-S3 → 屏 | 低电平发命令，高电平发数据 |
| RST | ESP32-S3 → 屏 | 复位，低电平有效 |
| SDA / MOSI | ESP32-S3 → 屏 | SPI 数据 |
| CLK / SCK | ESP32-S3 → 屏 | SPI 时钟 |
| VDD | 电源 | 只能接 3.3 V |
| GND | 电源 | 与开发板共地 |

这块屏只接收数据，不回传，所以不用接 MISO。转接板上的 BS0 通过 10 kΩ 电阻接地，固定为 4 线 SPI 模式，这个模式需要 DC 线来区分命令和数据，所以 DC 不能省。

## 接线

先断开开发板电源，再按下表接线。

| 屏幕引脚 | ESP32-S3 | 用途 |
| --- | --- | --- |
| BUSY | GPIO7 | 读取面板忙闲状态 |
| CS | GPIO10 | 手动片选 |
| DC | GPIO9 | 区分命令与数据 |
| RST | GPIO8 | 面板复位 |
| SDA / MOSI | GPIO11 | SPI 数据 |
| CLK / SCK | GPIO12 | SPI 时钟 |
| VDD | 3.3 V | 模组供电 |
| GND | GND | 共地 |

**VDD 只能接 3.3 V，不能接 5 V。** 接完后逐根核对，特别检查 SDA 和 CLK 有没有接反。

接好线后：

1. 用 USB 连接开发板，在 Arduino IDE 里选 `ESP32S3 Dev Module` 和对应端口。
2. 打开完整示例，编译并上传。
3. 打开串口监视器，波特率设为 115200。如果没看到开头的日志，按一下开发板的 RESET 键让程序重新运行。程序只播放一次，晚打开监视器会错过前面的输出。
4. 串口应依次输出：帧缓存信息、面板初始化完成、两次“刷新完成”（照片屏不打印刷新耗时），最后是 `Done. Last picture stays on screen.`。同时屏幕依次显示三屏。两者都对，才说明跑通了。

## 需要安装的库

在 Arduino IDE 的“开发板管理器”里搜索 `esp32`，安装 Espressif Systems 的 esp32 Arduino Core，本文用 3.3.10。

再到“库管理器”里搜索并安装下面的库。安装 Adafruit GFX 时如果提示安装依赖，选择全部安装，这样 Adafruit BusIO 会一起装上。

| 库名 | 测试版本 | 来源 |
| --- | --- | --- |
| Adafruit GFX Library | 1.13.0 | [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library) |
| Adafruit BusIO | 1.17.4 | [Adafruit_BusIO](https://github.com/adafruit/Adafruit_BusIO) |
| SPI | 随 esp32 Core 3.3.10 | [arduino-esp32](https://github.com/espressif/arduino-esp32) 自带，不用另装 |
| EPD037A02_GFX | 未标版本 | 本项目自带，与主 `.ino` 放在同一目录，不用复制到库目录 |

Adafruit GFX 负责画文字和图形。`EPD037A02_GFX` 负责面板初始化、SPI 传输、六色编码和刷新。不同型号的面板命令不同，不能直接用其他电子纸的库替换这一层。

## 完整代码

示例源码在 [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601)。文件夹和主程序文件都叫 `EPD_3in7_Showcase_JD7601`，这两个名字必须一致，Arduino IDE 才能打开。主要文件如下：

```text
EPD_3in7_Showcase_JD7601/
├── EPD_3in7_Showcase_JD7601.ino
├── EPD037A02_GFX.h
├── EPD037A02_GFX.cpp
├── photo_data.h
└── tool/
    ├── epd_photo.py                  # 照片转换脚本
    └── 02-driver-dog-car-480x720.png # 示例照片的原图
```

前三个文件的代码都在下面。`photo_data.h` 有一万多行，文中不贴，请从仓库下载，没有它程序编译不过。

它里面是一个 172800 字节的 `photo_driver` 数组，由 `tool/02-driver-dog-car-480x720.png` 转换而来。存的是转换后的面板帧，不是 PNG 文件的内容。

下面的代码与仓库里的源码逻辑一致，只调整了部分注释，以仓库为准。

### 主程序 EPD_3in7_Showcase_JD7601.ino

```cpp
/*
 * EPD_3in7_Showcase — Hello + 英文课表 + 一张照片
 * 屏幕：OSPTEK 3.7" E6，480×720，JD7601
 * 主控：ESP32-S3
 *
 * 新手只改这个文件就行。字体用 Adafruit GFX 自带的，不用自己做字库。
 * 安装：在 Arduino IDE 库管理器搜索 Adafruit GFX Library。
 * 打开：下载整个 Showcase 文件夹，再打开这个 .ino，别只复制主文件。
 */

#include "EPD037A02_GFX.h"
#include "photo_data.h"

// 引脚顺序：CS、DC、RST、BUSY、SCK、MOSI；供电只能 3.3V。
EPD037A02_GFX epd(10, 9, 8, 7, 12, 11);
#define HOLD_MS 3000

// 内置 5×7 字体的 y 坐标在文字顶边；一个字符占 6×8 像素。
void text(const char *s, int x, int y, uint8_t size, uint8_t color) {
  epd.setFont();                 // 用 GFX 自带字体，不用另外 setFont(字库)
  epd.setTextSize(size);
  epd.setTextColor(color);
  epd.setCursor(x, y);
  epd.print(s);
}

void textCenter(const char *s, int y, uint8_t size, uint8_t color) {
  int w = strlen(s) * 6 * size;
  text(s, (480 - w) / 2, y, size, color);
}

void drawHello() {
  epd.fillScreen(EPD_WHITE);
  epd.drawRect(0, 0, 480, 720, EPD_BLACK);
  textCenter("HELLO", 65, 9, EPD_BLACK);
  textCenter("WORLD", 150, 9, EPD_RED);
  epd.fillRect(40, 245, 400, 4, EPD_BLACK);

  // 六个色块顺便检查六色映射和画面方向。
  const uint8_t colors[6] = {
    EPD_BLACK, EPD_WHITE, EPD_YELLOW, EPD_RED, EPD_BLUE, EPD_GREEN
  };
  const char *labels[6] = { "K", "W", "Y", "R", "B", "G" };
  for (int i = 0; i < 6; i++) {
    int x = 16 + i * 76;
    epd.fillRect(x, 295, 68, 110, colors[i]);
    epd.drawRect(x, 295, 68, 110, EPD_BLACK);
    text(labels[i], x + 22, 430, 4, EPD_BLACK);
  }
  textCenter("3.7INCH 480X720", 525, 4, EPD_BLACK);
  textCenter("E6 6-COLOR EPD", 570, 4, EPD_BLACK);
  textCenter("ESP32-S3 OK", 640, 4, EPD_BLUE);
}

// 改课表内容只改这几行。
const char *subjects[6] = {
  "MATH", "CHINESE", "ENGLISH", "PHYSICS", "CHEMISTRY", "STUDY HALL"
};
const char *rooms[6] = {
  "ROOM 302", "ROOM 302", "AUDIO LAB", "PHYS LAB", "CHEM LAB", "ROOM 302"
};
const char *times[6] = { "08:00", "08:55", "NOW", "11:05", "14:00", "14:55" };
const uint8_t bars[6] = {
  EPD_BLUE, EPD_RED, EPD_RED, EPD_BLACK, EPD_YELLOW, EPD_WHITE
};

void drawAgenda() {
  epd.fillScreen(EPD_WHITE);
  epd.fillRect(0, 0, 480, 100, EPD_BLACK);
  text("MON - NOV 9", 24, 20, 4, EPD_WHITE);
  text("WEEK 12 - 6 CLASSES", 24, 65, 2, EPD_YELLOW);

  for (int i = 0; i < 6; i++) {
    int y = 115 + i * 92;
    bool now = (i == 2);
    epd.fillRoundRect(18, y, 444, 80, 5, now ? EPD_RED : EPD_WHITE);
    if (!now) epd.drawRoundRect(18, y, 444, 80, 5, EPD_BLACK);
    if (bars[i] != EPD_WHITE) epd.fillRect(20, y + 2, 9, 76, bars[i]);

    uint8_t fg = now ? EPD_WHITE : EPD_BLACK;
    text(subjects[i], 45, y + 12, 3, fg);
    text(rooms[i], 45, y + 47, 2, fg);
    text(times[i], 365, y + 25, 2, fg);
  }
  text("NEXT 11:05 PHYSICS", 20, 688, 2, EPD_BLACK);
}

bool showScreen(uint8_t index) {
  switch (index) {
    case 0: drawHello();  return epd.display();
    case 1: drawAgenda(); return epd.display();
    case 2: return epd.displayRawFrame(photo_driver, PHOTO_DRIVER_BYTES);
    default: return false;
  }
}

void setup() {
  // 第一步：打开串口，后面靠它判断卡在哪一步。
  Serial.begin(115200);
  delay(500);
  Serial.println("Showcase: Hello -> English agenda -> portrait");

  // 第二步：分配帧缓存、初始化 SPI，再复位并初始化面板。
  if (!epd.begin()) {
    Serial.println("Init failed: check 3V3, GND, wiring and BUSY.");
    return;
  }

  // 第三步：三屏各播一次。某一屏失败就停，不继续往下刷。
  for (uint8_t i = 0; i < 3; i++) {
    if (!showScreen(i)) {
      Serial.println("Refresh failed; stopped. Check wiring and BUSY.");
      return;
    }
    if (i < 2) delay(HOLD_MS);   // 这是刷新完后的停留时间，不是换屏周期
  }
  Serial.println("Done. Last picture stays on screen.");
}

void loop() {
  // 只播放一次。改课表请修改上方 subjects / rooms / times。
}

// 第四步：编译时就挡住尺寸或长度不对的照片帧。
static_assert(PHOTO_DRIVER_W == 480 && PHOTO_DRIVER_H == 720,
              "Photo must be 480x720");
static_assert(PHOTO_DRIVER_BYTES == EPD037A02_BUF_BYTES,
              "Photo must be 172800 bytes");
```

### 面板驱动接口 EPD037A02_GFX.h

```cpp
/*
 * EPD037A02_GFX — 给 Adafruit_GFX 用的面板驱动类
 * OSPTEK 3.7" E6 电子纸，480×720，六色（JD7601 / IST7601 / IST7163）
 *
 * 这里自己写面板层，图形层直接继承 Adafruit_GFX。
 * 于是 drawLine、fillCircle、setFont、print 都能直接用现成的。
 *
 * MIT / CC BY 4.0，与仓库其余资料一致。
 */

#ifndef EPD037A02_GFX_H
#define EPD037A02_GFX_H

#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>

/* ------------------------------ 面板常量 ------------------------------- */

#define EPD037A02_WIDTH    480
#define EPD037A02_HEIGHT   720
#define EPD037A02_BUF_BYTES ((size_t)EPD037A02_WIDTH * EPD037A02_HEIGHT / 2) /* 172800 */

// 一字节装同列相邻两像素。实测错位 1～2 px 时，把这里改成 1。
#ifndef EPD037A02_SWAP_NIBBLE
#define EPD037A02_SWAP_NIBBLE 0
#endif

// JD7601 的 4 bit 色值，0x4 非法，别按 0～5 连续编号来写。
enum EPDColor : uint8_t {
  EPD_BLACK  = 0x0,
  EPD_WHITE  = 0x1,
  EPD_YELLOW = 0x2,
  EPD_RED    = 0x3,
  EPD_BLUE   = 0x5,
  EPD_GREEN  = 0x6,
};

/* ------------------------------- 驱动类 -------------------------------- */
/*
 * 用法：
 *   EPD037A02_GFX display(10, 9, 8, 7);    // cs、dc、rst、busy
 *   display.begin();                       // 分配帧缓存 + 复位 + INIT
 *   display.setRotation(0);                // 0/2 = 480×720，1/3 = 720×480
 *   display.fillScreen(EPD_WHITE);
 *   display.setFont(&FreeSansBold24pt7b);
 *   display.setCursor(20, 120);  display.print("Hello");
 *   display.display();                     // 推屏 + 全刷（15～25 s）
 *
 * 颜色是 4 bit 索引色，只有六种，不是 RGB565。
 * 传 16 位色值也能编译，但只有低 4 位参与取色，结果没有意义。
 */
class EPD037A02_GFX : public Adafruit_GFX {
 public:
  EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                int8_t sck = -1, int8_t mosi = -1, SPIClass *spi = &SPI);
  ~EPD037A02_GFX();

  // 分配帧缓存、初始化 GPIO/SPI、复位并初始化面板。
  // 内存不够或 BUSY 无响应时返回 false，屏幕保持原样。
  bool begin(uint32_t spi_hz = 2000000);

  // 把帧缓存推到屏幕并全刷。阻塞 15～25 s，BUSY 超时返回 false。
  bool display();

  // 直接发送打包好的 480×720 原生帧，不再申请一份照片帧缓存。
  bool displayRawFrame(const uint8_t *frame, size_t bytes);

  // 面板深睡眠。唤醒要重新上电，或拉 RST 后重新 begin()。
  bool sleep();

  // 只清帧缓存，不立即刷屏。彩色屏有残影时，可以先 clear() 再 display() 刷一次白屏。
  void clear(uint16_t color = EPD_WHITE);

  // drawPixel 是 Adafruit_GFX 要求实现的纯虚函数；fillScreen 重写为 memset，速度更快。
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void fillScreen(uint16_t color) override;

  // 把 RGB 量化到最接近的六色之一，画简单图像时可用。
  static uint8_t fromRGB(uint8_t r, uint8_t g, uint8_t b);

  uint8_t *buffer() const { return _buf; }
  bool ready() const { return _buf != nullptr; }
  uint32_t lastRefreshMs() const { return _lastRefreshMs; }
  void setVerbose(bool v) { _verbose = v; }

 private:
  int8_t _cs, _dc, _rst, _busy, _sck, _mosi;
  SPIClass *_spi;
  uint32_t _spiHz;
  uint8_t *_buf;
  uint32_t _lastRefreshMs;
  bool _verbose;

  void _alloc();
  void _spiSend(const uint8_t *buf, size_t len);
  void _cmd(uint8_t c);
  void _data(uint8_t d);
  void _dataBuf(const uint8_t *buf, size_t len);
  bool _waitBusy(const char *what, uint32_t timeout_ms = 60000);
  bool _reset();
  bool _initPanel();
};

#endif /* EPD037A02_GFX_H */
```

### 面板驱动实现 EPD037A02_GFX.cpp

```cpp
/*
 * EPD037A02_GFX.cpp — 面板层：SPI、时序、帧格式
 * 这层只做三件事：发字节、等 BUSY、把 (x,y) 换成帧缓存下标。
 * 图形、字体和旋转交给 Adafruit_GFX。
 */

#include "EPD037A02_GFX.h"

#include <string.h>
#include <pgmspace.h>

#if defined(ESP32)
#include <esp32-hal-psram.h>
#endif

namespace {
// 一字节两像素，所以一条 720 像素的竖列占 360 字节。
const size_t kColBytes  = EPD037A02_HEIGHT / 2;
const size_t kChunk     = 2048;    // 单次 SPI 传输上限，与厂商例程一致
const uint32_t kBusyTmo = 60000;   // 全刷最长 25 s，这里留余量
}  // namespace

EPD037A02_GFX::EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                             int8_t sck, int8_t mosi, SPIClass *spi)
    : Adafruit_GFX(EPD037A02_WIDTH, EPD037A02_HEIGHT),
      _cs(cs), _dc(dc), _rst(rst), _busy(busy), _sck(sck), _mosi(mosi),
      _spi(spi), _spiHz(2000000), _buf(nullptr), _lastRefreshMs(0),
      _verbose(true) {}

EPD037A02_GFX::~EPD037A02_GFX() {
  if (_buf) {
    free(_buf);   // ps_malloc 申请的内存也用 free() 释放
    _buf = nullptr;
  }
}

/* ============================ 内存 / 初始化 ============================ */

void EPD037A02_GFX::_alloc() {
  if (_buf) return;
#if defined(ESP32)
  if (psramFound()) _buf = (uint8_t *)ps_malloc(EPD037A02_BUF_BYTES);
#endif
  if (!_buf) _buf = (uint8_t *)malloc(EPD037A02_BUF_BYTES);
}

bool EPD037A02_GFX::begin(uint32_t spi_hz) {
  // 第一步：拿到 172800 字节帧缓存，并先填白。
  _spiHz = spi_hz;
  _alloc();
  if (!_buf) {
    if (_verbose) {
      Serial.printf("[EPD] 帧缓存分配失败，需要 %u 字节\n",
                    (unsigned)EPD037A02_BUF_BYTES);
    }
    return false;
  }

  // malloc 不清零；先填白，避免把未初始化内存刷到屏幕上。
  clear(EPD_WHITE);

  // 第二步：配置引脚。CS 手动控制，MISO 不用接。
  pinMode(_cs, OUTPUT);   digitalWrite(_cs, HIGH);
  pinMode(_dc, OUTPUT);   digitalWrite(_dc, HIGH);
  pinMode(_rst, OUTPUT);  digitalWrite(_rst, HIGH);
  pinMode(_busy, INPUT);

  // 参数顺序是 SCK、MISO、MOSI、SS。SS 传 -1，别把 CS 交给外设。
  _spi->begin(_sck, -1, _mosi, -1);

  if (_verbose) {
    Serial.printf("[EPD] 帧缓存 %u B，SPI %lu Hz\n",
                  (unsigned)EPD037A02_BUF_BYTES, (unsigned long)_spiHz);
  }

  // 第三步：复位面板，发送初始化命令。
  return _initPanel();
}

bool EPD037A02_GFX::_initPanel() {
  if (!_reset()) return false;

  _cmd(0xE9); _data(0x01);   // 厂商 INIT：JD7601 初始化命令

  if (_verbose) Serial.println("[EPD] 面板初始化完成");
  return true;
}

/* ============================== 底层 SPI =============================== */

void EPD037A02_GFX::_spiSend(const uint8_t *buf, size_t len) {
  digitalWrite(_cs, LOW);
  _spi->beginTransaction(SPISettings(_spiHz, MSBFIRST, SPI_MODE0));
  _spi->writeBytes(buf, len);
  _spi->endTransaction();
  digitalWrite(_cs, HIGH);
}

void EPD037A02_GFX::_cmd(uint8_t c) {
  digitalWrite(_dc, LOW);    // DC=L：命令
  _spiSend(&c, 1);
}

void EPD037A02_GFX::_data(uint8_t d) {
  digitalWrite(_dc, HIGH);   // DC=H：数据
  _spiSend(&d, 1);
}

void EPD037A02_GFX::_dataBuf(const uint8_t *buf, size_t len) {
  digitalWrite(_dc, HIGH);
  while (len) {
    size_t n = (len > kChunk) ? kChunk : len;
    _spiSend(buf, n);
    buf += n;
    len -= n;
  }
}

// BUSY 高 = 空闲，低 = 忙。规格书 Note 6-4 正文写反了，按引脚表与实测。
bool EPD037A02_GFX::_waitBusy(const char *what, uint32_t timeout_ms) {
  uint32_t t0 = millis();
  while (digitalRead(_busy) == LOW) {
    if (millis() - t0 > timeout_ms) {
      if (_verbose) Serial.printf("[EPD] BUSY 超时：%s\n", what);
      return false;
    }
    delay(2);
  }
  return true;
}

// 厂商 RESET 时序：低 20 → 高 10 → 低 20 → 高 10 ms，再等 BUSY。
bool EPD037A02_GFX::_reset() {
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);

  if (digitalRead(_busy) == LOW) {
    if (_verbose) Serial.println("[EPD] 等待 BUSY 拉高（最长 10 s），超时请查 3V3 / GND / 排线");
    if (!_waitBusy("reset", 10000)) return false;
  }
  delay(10);
  return true;
}

/* ============================== 刷屏流程 =============================== */

bool EPD037A02_GFX::display() {
  if (!_buf) return false;
  uint32_t t0 = millis();

  _cmd(0x10);                             // DTM：准备写 RAM
  if (!_waitBusy("DTM")) return false;
  _dataBuf(_buf, EPD037A02_BUF_BYTES);

  _cmd(0x04);                             // PON：开高压
  if (!_waitBusy("PON")) return false;
  delay(10);

  _cmd(0x12); _data(0x00);                // DRF：开始刷新
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;

  _cmd(0x02); _data(0x00);                // POF：关高压
  if (!_waitBusy("POF")) return false;
  delay(20);

  _lastRefreshMs = millis() - t0;
  if (_verbose) Serial.printf("[EPD] 刷新完成 %lu ms\n", (unsigned long)_lastRefreshMs);
  return true;
}

bool EPD037A02_GFX::displayRawFrame(const uint8_t *frame, size_t bytes) {
  if (!frame || bytes != EPD037A02_BUF_BYTES) return false;

  _cmd(0x10);
  if (!_waitBusy("DTM")) return false;

  // 每次从 Flash 搬 2048 字节到 RAM，再走 SPI；不让 DMA 直接读 Flash。
  uint8_t chunk[kChunk];
  digitalWrite(_dc, HIGH);
  for (size_t off = 0; off < bytes; off += sizeof(chunk)) {
    size_t n = bytes - off;
    if (n > sizeof(chunk)) n = sizeof(chunk);
    memcpy_P(chunk, frame + off, n);
    _spiSend(chunk, n);
  }

  _cmd(0x04);
  if (!_waitBusy("PON")) return false;
  delay(10);
  _cmd(0x12); _data(0x00);
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;
  _cmd(0x02); _data(0x00);
  if (!_waitBusy("POF")) return false;
  delay(20);
  return true;
}

bool EPD037A02_GFX::sleep() {
  _cmd(0x07); _data(0xA5);
  if (_verbose) Serial.println("[EPD] 已进入深睡眠");
  return true;
}

/* ================================ 绘图 ================================= */

void EPD037A02_GFX::clear(uint16_t color) {
  if (!_buf) return;
  uint8_t c = (uint8_t)(color & 0x0F);
  memset(_buf, (int)((c << 4) | c), EPD037A02_BUF_BYTES);
}

void EPD037A02_GFX::fillScreen(uint16_t color) { clear(color); }

void EPD037A02_GFX::drawPixel(int16_t x, int16_t y, uint16_t color) {
  if (!_buf) return;
  if (x < 0 || y < 0 || x >= _width || y >= _height) return;

  // 先把受 rotation 影响的逻辑坐标换成面板自然坐标。
  int16_t dx, dy;
  switch (rotation & 3) {
    case 0:  dx = x;                 dy = y;                 break;
    case 1:  dx = WIDTH - 1 - y;     dy = x;                 break;
    case 2:  dx = WIDTH - 1 - x;     dy = HEIGHT - 1 - y;    break;
    default: dx = y;                 dy = HEIGHT - 1 - x;    break;
  }

  // 面板按竖列装数据，而且每列从下往上扫，所以还要做 Y 镜像。
  // 按常见的横向行优先来写，画面会转 90° 并错位重复。
  const int16_t fy = HEIGHT - 1 - dy;
  size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);

#if EPD037A02_SWAP_NIBBLE
  const bool lowNibble = ((fy & 1) == 0);
#else
  const bool lowNibble = ((fy & 1) != 0);
#endif

  // 一个字节拆成两个半字节，只改目标像素所在的那一半。
  const uint8_t c = (uint8_t)(color & 0x0F);
  if (lowNibble) _buf[i] = (uint8_t)((_buf[i] & 0xF0) | c);
  else           _buf[i] = (uint8_t)((_buf[i] & 0x0F) | (c << 4));
}

/* ============================ RGB → 六色量化 =========================== */

struct EPDRgbRef { uint8_t r, g, b, code; };

// 参考色取自 Spectra 6 / E6 的典型显色，偏暗一点更接近肉眼。
static const EPDRgbRef kRefs[6] = {
    {  0,   0,   0, EPD_BLACK  },
    {255, 255, 255, EPD_WHITE  },
    {255, 232,   0, EPD_YELLOW },
    {190,  30,  45, EPD_RED    },
    { 35,  70, 150, EPD_BLUE   },
    { 40, 110,  60, EPD_GREEN  },
};

uint8_t EPD037A02_GFX::fromRGB(uint8_t r, uint8_t g, uint8_t b) {
  // 加权欧氏距离，绿色的权重更高。
  int32_t best = INT32_MAX;
  uint8_t code = EPD_BLACK;
  for (int k = 0; k < 6; k++) {
    int32_t dr = (int32_t)r - kRefs[k].r;
    int32_t dg = (int32_t)g - kRefs[k].g;
    int32_t db = (int32_t)b - kRefs[k].b;
    int32_t d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < best) { best = d; code = kRefs[k].code; }
  }
  return code;
}
```

### 代码说明

**像素怎么存。** `drawPixel()` 最容易写错。屏幕是 480×720，每像素 4 bit，一帧是 480×720÷2 = 172800 字节。

和普通屏幕按行写不同，这块屏按竖列接收：共 480 列，每列 360 字节，列内还是从下往上扫。所以代码先做 Y 镜像 `fy = HEIGHT-1-dy`，再用 `i = dx*360 + (fy>>1)` 算字节位置。

**颜色编码。** 六种颜色的编码不连续：黑、白、黄、红是 `0x0～0x3`，蓝和绿是 `0x5`、`0x6`，`0x4` 非法。画图时直接用 `EPD_BLACK` 这类枚举，不要自己填序号。

**三屏怎么刷。** `setup()` 里的 `for` 循环执行三次。前两屏先画到帧缓存，再调用 `display()` 推送并刷新。第三屏调用 `displayRawFrame()`，把 `photo_data.h` 的数据每 2048 字节一块，从 Flash 搬到 RAM，再通过 SPI 发出。

**内存。** 照片屏不用帧缓存，但前两屏要用，所以程序始终需要 172800 字节的帧缓存。有 PSRAM 时优先放在 PSRAM，没有或分配失败就放内部 RAM。

**停留时间。** 每屏刷新要 15～25 秒，`HOLD_MS` 只是刷新结束后额外多等的时间。所以前两屏之间的实际间隔，等于刷新时间加 3 秒。程序没有循环播放，想重播就按 RESET 复位开发板。

**改课表。** 修改 `subjects`、`rooms`、`times` 三个数组，六行一一对应。`bars` 是每行左边色条的颜色。高亮的“当前课”固定是第 3 行（`i == 2`）。标题日期、`WEEK 12` 和底部的 `NEXT 11:05 PHYSICS` 都是写死的文字。示例不读时钟，也不会自动更新。

### 照片怎么转成面板数据

照片不在开发板上处理。电脑先把它转成六色点阵，ESP32-S3 只负责把转好的数据发给屏幕。

```text
JPG/PNG → 居中裁切并缩放到 480×720
→ 调整曝光、对比度、饱和度 → 六色抖动 → 换成面板色值
→ 按竖列排列，做 Y 镜像，两个像素合成一个字节
→ 172800 字节数组（photo_data.h）→ 编进 Flash
→ ESP32-S3 通过 SPI 发给屏幕
```

抖动是把不同颜色的像素交错排开，让眼睛把一片点阵看成过渡色。它不会增加颜色种类，转换后每个像素仍然只是黑、白、黄、红、蓝、绿之一。转换脚本按电子纸实际看起来的颜色（偏暗）计算颜色距离，但输出的是面板色值。

像素的排列方式和颜色编码，前面“像素怎么存”和“颜色编码”已经讲过，脚本按同样的规则打包。所以生成的数据可以直接发给面板，开发板不用解码 JPG，也不用算抖动。

### 换照片

先备份原来的 `photo_data.h`，因为下面的命令会覆盖它。电脑上需要 Python 3、Pillow 和 numpy（`pip install pillow numpy`）。只运行示例不需要装它们。

在示例文件夹里运行：

```bash
cd EPD_3in7_Showcase_JD7601
python3 tool/epd_photo.py 我的照片.jpg --header photo_data.h --header-name photo_driver
```

- 数组名必须保持 `photo_driver`。脚本会据此生成 `PHOTO_DRIVER_W`、`PHOTO_DRIVER_H`、`PHOTO_DRIVER_BYTES`，主程序末尾的 `static_assert` 要用到它们。
- 默认居中裁切成 480×720。不想裁掉边缘，可以加 `--fit contain`（留白）或 `--fit stretch`（拉伸变形）。
- 输出始终是 480×720、172800 字节。生成后重新编译上传即可，不用上传文件系统。

## 常见问题排查

### 编译报 undefined reference to EPD037A02_GFX

现象：链接阶段找不到 `begin()`、`display()` 等函数。

原因：`EPD037A02_GFX.cpp` 没有被编译。Arduino 只编译草图根目录和 `src/` 子目录里的 `.cpp`，放在其他子目录（如 `driver/`）里的不会编译。

处理：把主 `.ino`、驱动 `.h` 和 `.cpp` 放在同一级目录，然后重新打开示例，再编译一次。

### 串口监视器没有输出

现象：上传完成，串口一片空白。

原因：波特率不对；或者用板载 USB 口时没有启用 USB CDC；或者监视器打开得太晚，程序已经输出完了。

处理：波特率设为 115200，并确认选对了端口。用板载 USB 口时，在 Arduino IDE 里把 `USB CDC On Boot` 设为 `Enabled`，重新上传。也可以按开发板说明改用 UART 口。最后按一下 RESET，让程序重新运行。

### 串口有输出，屏幕一直全白

现象：程序在跑，屏幕没有图案。

原因：常见是 SDA 和 CLK 接反、CS 或 DC 接错，也可能没有共地。

处理：断电后逐根核对 8 根线。量一下 VDD 是否是 3.3 V，再检查 GND 是否导通。另外，驱动里 `SPI.begin()` 的第四个参数必须是 `-1`，CS 由 `_spiSend()` 手动拉低和拉高。

### 串口提示 reset 阶段 BUSY 超时

现象：日志停在“等待 BUSY 拉高”，随后报 `reset` 超时，最后输出 `Init failed`。

原因：BUSY 一直是低电平。可能是屏没上电、BUSY 线接错或没接好，也可能是排线接触不良。

处理：确认 VDD 接的是 3.3 V，排线插到底，BUSY 接的是 GPIO7。先查这些，不要改刷新代码。修好后重新上电上传。

### DRF 阶段超时，或画面局部花屏

现象：初始化正常，刷新时超时，或者画面局部异常。

常见原因：供电电流不够，杜邦线太长，SPI 速率太高。

处理：缩短杜邦线，检查地线接触，换一个供电稳定的 USB 口或电源。SPI 速率保持默认的 2 MHz。如果改过 `epd.begin()` 的参数，先删掉参数恢复默认。

### 画面转了 90°，还重复出现约三段

现象：文字和色块能认出来，但方向不对，并且错位重复。

原因：帧数据按行排列了，而面板实际按竖列接收。用本文的驱动不应出现这个问题，多见于自己改过驱动或使用旧版驱动的情况。

处理：核对 `drawPixel()` 里是不是 `size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);`，并且 `kColBytes = EPD037A02_HEIGHT / 2`，即 360。

### 画面没有重复，但上下颠倒

现象：字母顺序没反，只是整幅上下翻转。

原因：面板每列从下往上扫，代码缺少 Y 镜像。

处理：核对 `drawPixel()` 里有 `const int16_t fy = HEIGHT - 1 - dy;`，并且后面的地址和半字节判断都用 `fy`。不要只把字节顺序倒过来。

### 细线错开一截，笔画像梳齿

现象：整体位置对，但相邻像素错开 1～2 px。

原因：一个字节里高低半字节的顺序可能反了。

处理：把 `EPD037A02_GFX.h` 里的 `EPD037A02_SWAP_NIBBLE` 从 `0` 改成 `1`。它只交换字节内两个像素的顺序，不处理整幅镜像。

### 编译报 Photo must be 480x720 或 Photo must be 172800 bytes

现象：两条 `static_assert` 中有一条触发。

原因：替换后的 `photo_data.h` 不是 480×720，或者帧长度不是 172800 字节。

处理：用上面的转换命令重新生成，保留 `--header-name photo_driver`。再检查 `PHOTO_DRIVER_W`、`PHOTO_DRIVER_H`、`PHOTO_DRIVER_BYTES` 是否分别是 480、720、172800。

## FAQ

**能不能换别的引脚接 EPD037A02？**

可以。同时修改接线和 `EPD037A02_GFX epd(10, 9, 8, 7, 12, 11)`，参数顺序是 CS、DC、RST、BUSY、SCK、MOSI。ESP32-S3 上建议避开 GPIO0、45、46（启动相关）、GPIO19、20（USB）和 GPIO26～37（Flash/PSRAM 占用），具体还要对照自己开发板的原理图。我只用 GPIO7～12 这组引脚编译过，其他引脚没试。

**SPI 速率是多少？能改成 8 MHz 吗？**

本例默认 2 MHz，Mode 0，高位在前。想提高，可以改 `epd.begin()` 的参数，比如 `epd.begin(4000000)`，建议从 4 MHz 试起；出现噪点或花屏就退回 2 MHz。我没在这份三屏示例上测过 8 MHz。

**能用 5 V 供电吗？刷新时电流多大？**

不能。VDD 只能接 3.3 V，GND 必须与开发板共地。刷新时升压电路的负载会变大，所以杜邦线要短，供电要稳。刷新的峰值电流我没测过，这里不给估计值。

**占多少 RAM 和 Flash？会占满 CPU 吗？**

本次编译结果：Flash 525724 字节（40%），全局变量 23576 字节（7%）。运行时另外申请 172800 字节的帧缓存，发送照片时还用 2048 字节的临时缓冲。刷新是阻塞的，刷新期间 `loop()` 做不了别的事，不要安排需要严格定时的任务。CPU 占用率我没测过。

**能用 GxEPD2 或普通 ESP32 吗？**

我核对的 GxEPD2 1.6.9 里没有这块 480×720、JD7601 六色面板的驱动类，不能直接套用。普通 ESP32 理论上能移植，但要改 SPI 和 PSRAM 相关的平台代码，并确认 RAM 放得下 172800 字节的帧缓存。我没在其他主控上测过。

**屏幕完全不显示，先查哪几根线？**

先量 VDD 是不是 3.3 V，再查 GND、BUSY、CS、DC、SDA 和 CLK。串口设为 115200。出现 `reset` 或 `DRF` 超时，按上面对应的条目处理。如果串口没有任何输出，先检查端口和 USB CDC 设置，不要先改帧格式。

**能直接显示中文或 JPG 吗？**

不能。界面用的是 GFX 内置的 5×7 字体，示例文字都是英文，没有中文字库。JPG 也不能直接发送，要先转成 480×720、172800 字节的面板帧。示例附带的 `photo_data.h` 已经转好，换图的方法见上文“换照片”。

**为什么只播放一次就停了？断电后照片还在吗？**

示例就是只播放一次，`loop()` 是空的，最后停在照片上。电子纸断电后画面会保留。想重播就按 RESET；想自动循环，需要自己加触发逻辑。连续轮播的间隔我没测过。

## 延伸玩法

- 把写死的课表换成从串口输入，排版确认后再接真实数据。
- 加一个按键，手动在 Hello、课表、照片之间切换。
- 加 RTC，让标题日期和“当前课”自动更新。
- 把多张照片放到 LittleFS 或 SD 卡，做成按键翻页的电子相框。

## 参考资料

- [本文示例源码（GitHub）](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601)：三屏示例的完整文件和照片转换脚本。

- [Espressif ESP32-S3 官方产品页](https://www.espressif.com/en/products/socs/esp32-s3)：主控芯片信息。

- [Espressif ESP32-S3 官方数据手册](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)：GPIO、SPI 与电气参数。

- [Adafruit GFX Library GitHub](https://github.com/adafruit/Adafruit-GFX-Library)：文字和图形接口。

- [Adafruit BusIO GitHub](https://github.com/adafruit/Adafruit_BusIO)：Adafruit GFX 的依赖库。

- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)：Arduino 核心与 SPI 支持。

- [Adafruit GFX 字体说明](https://learn.adafruit.com/adafruit-gfx-graphics-library/using-fonts)：内置字体与 FreeFont 的用法。

- [厂家开源资料和例程](https://gitee.com/osptek/display-epd-3.7inch-480x720)：规格书、原理图和厂商例程。