---
title: "ESP32-S3 驱动 ST7306 四色全反射 LCD 完整教程（Arduino IDE + SPI）"
boardId: esp32s3
moduleId: display/lcd42-st7306-reflective
category: esp32
date: 2026-11-17
intro: "用 Arduino IDE 和 SPI 让 ESP32-S3 驱动 ST7306 四色全反射 LCD：21Pin FPC 接线、完整代码、显示方向调整与无显示排查，实测环境 Arduino IDE 2.3.8 + esp32 Core 3.3.8。"
image: "https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg"
---

> 难度：⭐⭐☆☆☆  
> 预计耗时：约 30～60 分钟（不含环境下载和硬件排错）  
> 测试环境：Arduino IDE v2.3.8 + esp32 Arduino Core v3.3.8

## TL;DR：ESP32-S3 驱动 ST7306 快速上手

- 模组只用 3.3V，FPC 第 5、6 脚都接 3.3V，并接好公共地，不要接 5V。
- 默认 `PINSET = 1`：CS→GPIO9、RESET→GPIO10、SCLK→GPIO12、MOSI→GPIO13、RS/D/C→GPIO14，TE 可不接。
- 在 Arduino IDE 安装 `esp32 by Espressif Systems`，不用另装 ST7306 库。
- 打开项目目录中的 `esp32s3-st7306-bringup.ino`，开发板按手上的 ESP32-S3 型号选（本例是 `ESP32S3 Dev Module`），串口没日志时先查 `USB CDC On Boot`。
- 默认 SPI 为模式 0、20MHz，逻辑画面为 400×300 横屏；无显示时先断电核对共地、FPC 方向和 RS 接脚，上电后量 3.3V，并在明亮光线下观察，仍不行再把 `SPI_HZ` 降到 10MHz。

## 前言：先用 Arduino IDE 点亮 ST7306

这块 4.2 英寸屏使用 ST7306 控制器，通过 SPI 接收命令和显存数据。它是全反射（反射式）TFT LCD，靠环境光显示，没有背光，要在明亮环境下才看得清。项目目录同时提供 ESP-IDF 和 Arduino IDE 两套程序，这篇只走 Arduino IDE：接好 21Pin FPC，烧录示例，让 400×300 横屏测试页跑起来。ESP-IDF 的 20 页演示也保留在项目目录里，想继续研究驱动封装和绘图函数的读者可以自行编译尝试。

## 最终效果：ST7306 的 8 页显示测试

接线和烧录都正确后，程序会循环显示 8 个测试页。普通页停留约 3 秒，移动方块页停留约 6 秒。打开串口监视器，波特率设为 115200，可以看到初始化和翻页日志。每个页面在停留期间都会被持续重绘；若串口监视器是上传后才打开的，可能错过启动日志，按一下开发板 RST 即可重新看到。

| 页码 | 测试内容              | 检查点            | 程序内名称             |
| -: | ----------------- | -------------- | ----------------- |
|  0 | 白、青、红、黑横条         | 四种显示状态         | `PAGE_COLOR_BARS` |
|  1 | HELLO WORLD、边框、四角 | 文字和横屏方向        | `PAGE_HELLO`      |
|  2 | 时间、帧数、FPS         | 开机累计时间、全局帧数、累计平均 FPS（不是本页单独的帧率）        | `PAGE_COUNTER`    |
|  3 | 对角线、横线、竖线         | 线条和坐标映射        | `PAGE_DIAGONAL`   |
|  4 | 左右往返方块            | 连续刷新           | `PAGE_REFRESH`    |
|  5 | 棋盘格               | 黑白方格（单格 20 像素）         | `PAGE_CHECKER`    |
|  6 | 横条纹               | 规则图案           | `PAGE_STRIPES`    |
|  7 | CYAN 颜色测试         | 整屏青（视觉偏蓝），显存字节 `0x33` | `PAGE_CYAN`       |

> 说明：屏幕上的页内标签（如 `1: COLOR BARS`、`3: DIAGONAL`）是代码里写死的字符串，与上表页码不完全对应（COLOR BARS 是第 0 页），以串口 `[PAGE]` 日志为准。


![](https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/Jb9UiMvgtTQ?si=IvvwAvHHZx5RICSM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## 元件说明：YDP420H005-V3 与 ST7306

### YDP420H005-V3 全反射 LCD 模组

这是一块 4.2 英寸全反射 TFT LCD 模组，面板原生显存为 300×400。ST7306 控制器已经集成在模组里，ESP32-S3 通过 SPI 发命令和像素数据。本项目的 Arduino 程序在应用层把它映射成 400×300 横屏。

本项目固件用 2bit 编码驱动出四种显示状态：白、青、红、黑（`0x00`～`0x03`）。每个像素占 2bit，没有中间灰阶。别把其他 ST7306 屏幕的颜色和初始化参数直接套过来。

| 参数      | 本项目模组                         |
| ------- | ----------------------------- |
| 型号      | Osptek YDP420H005-V3          |
| 控制器     | Sitronix ST7306               |
| 原生分辨率   | 300×400                       |
| 显示状态    | 白、青、红、黑，2bit/像素               |
| 主控接口    | 4 线 SPI（SCLK、MOSI、CS、D/C），另有 RESET、可选 TE；FPC 上没有 MISO/SDO，只能写不能读 |
| 模组供电与逻辑 | 3.3V                          |
| 有效显示区域  | 63.6×84.8mm                   |
| 工作温度    | −20～+70°C                     |

### 21Pin FPC 转接板

屏幕通过 21Pin FPC 引出信号。转接板把这些细密脚位转成方便连接 ESP32-S3 的焊点或排针，本项目不需要另外搭显示驱动电路。

我用的是厂家随屏一起卖的双 FPC 通用转接板，没有型号丝印。板子上一共两个座：21Pin 给 4.2 寸，12Pin 给 2.9 寸，旁边还有 `GND`、`3V3` 焊盘。

两个 FPC 座旁边各焊了几颗贴片元件，封装很小，没有数值丝印。我没查过它们的作用和取值。

这块通用板有一个容易接错的地方：板上同时有 RS 和 DC 两种丝印，本模组的 LCD_D/C 要接丝印 `RS`；另一个 `DC` 丝印与本模组无关（我没有核对它属于哪个座），不要接它。购买或焊接转接板时，还要核对 FPC 触点方向和脚位编号。

### 引脚说明：YDP420H005-V3 的 21Pin FPC

下表按模组 FPC 编号整理。转接板丝印可能不同，接线时以模组规格书和转接板实物走线为准（这块转接板没有型号，也没有公开原理图）。

|   FPC 脚位 | 模组信号                               | 常见丝印      | 本例用法                 |
| -------: | ---------------------------------- | --------- | -------------------- |
| 1、4、7、14 | GND                                | GND       | 接公共地                 |
|      2、3 | NC                                 | NC        | 不连接                  |
|      5、6 | VCC(3.3V)                          | VCC、VCI   | 两脚都接 3.3V            |
|        8 | LCD_RES                            | RESET、RST | 接 GPIO10，低电平复位       |
|        9 | LCD_SCLK                           | SCL、SCLK  | 接 GPIO12，作为 SPI 时钟   |
|       10 | TE                                 | TE        | 可接 GPIO11；本例不读取，可悬空  |
|       11 | LCD_SDI                            | SDA、MOSI  | 接 GPIO13，作为 SPI MOSI |
|       12 | LCD_D/C                            | RS、A0     | 接 GPIO14，选择命令或数据     |
|       13 | LCD_CS                             | CS        | 接 GPIO9，低电平片选        |
|    15～19 | TP-VDD、TP-RST、TP-INT、TP-SDA、TP-SCL | 触摸相关丝印    | 本例模组无触摸，不连接          |
|    20、21 | GND                                | GND       | 也是地；本例只接 1、4、7、14 即可（20、21 是否在转接板上与它们相连，我没有逐个量过，不放心就一起接地）        |

这里的 SCL 和 SDA 是转接丝印留下的常见叫法。本例走的是 SPI：SCL 对应当前屏幕的串行时钟，SDA 对应 MOSI。

## BOM 表：ST7306 接线所需材料

| 元件           | 规格                    | 数量 | 备注               |
| ------------ | --------------------- | -: | ---------------- |
| ESP32-S3 开发板 | ESP32-S3 N16R8（16MB Flash / 8MB PSRAM） |  1 | 使用 3.3V GPIO     |
| 显示模组         | Osptek YDP420H005-V3  |  1 | 4.2 英寸，21Pin FPC |
| FPC 转接板      | 厂家双 FPC 通用转接板，无型号      |  1 | 核对脚位和触点方向        |
| USB 数据线      | 与开发板接口匹配              |  1 | 要支持数据传输          |
| 连接线          | 较短杜邦线或焊接线             | 若干 | SPI 线越短越稳，也越好整理      |

## 接线方式：ESP32-S3 与 ST7306

先断电，再按下面的默认 `PINSET = 1` 接线。

|   FPC 脚位 | 屏幕信号            | ESP32-S3 | 是否必需 | 说明        |
| -------: | --------------- | -------- | ---- | --------- |
|       13 | LCD_CS / CS     | GPIO9    | 必需   | 片选        |
|        8 | LCD_RES / RESET | GPIO10   | 必需   | 硬件复位      |
|       10 | TE              | GPIO11   | 可选   | 示例不读取，可悬空 |
|        9 | LCD_SCLK / SCLK | GPIO12   | 必需   | SPI 时钟    |
|       11 | LCD_SDI / MOSI  | GPIO13   | 必需   | SPI 数据输出  |
|       12 | LCD_D/C / RS    | GPIO14   | 必需   | 厂家转接板接 RS |
|      5、6 | VCC / VCI       | 3.3V     | 必需   | 两个供电脚都接   |
| 1、4、7、14 | GND             | GND      | 必需   | 与开发板共地    |

⚠️ 模组电源和逻辑都使用 3.3V。模组断电时，也不要继续从 GPIO 向它输入信号。

接好后先在**断电**状态下检查：

1. 对照模组机械图确认 FPC 的第 1 脚和触点方向。
2. 用万用表蜂鸣档确认开发板 GND 与屏幕 GND 脚导通，且 3.3V 与 GND 之间没有短路。
3. 逐根核对 CS、RESET、SCLK、MOSI、RS 五根信号线。
4. 使用厂家双 FPC 转接板时，再确认 GPIO14 接的是 RS。
5. 检查没有松动或短路。

再**上电**检查：

6. 用万用表量第 5、6 脚（或转接板对应焊点）的电压，应为 3.3V；不对就立即断电排查。

接完建议逐根对照两遍。接错一根，从串口日志里也很难看出是哪一根（本例的串口日志不反映屏幕状态，见排错一节）。

## 需要安装的库：Arduino IDE 的 ESP32-S3 支持

本例没有独立的 ST7306 Arduino 库。驱动、绘图和测试页都在 `.ino` 文件里。`SPI.h` 和 `esp_heap_caps.h` 随 ESP32 Arduino Core 提供，不用在库管理器里另外搜索。

| 名称                                                               | 作者或来源                     | 安装方式               | 本机确认版本        |
| ---------------------------------------------------------------- | ------------------------- | ------------------ | ------------- |
| Arduino IDE                                                      | Arduino                   | 从 Arduino 官网安装     | v2.3.8        |
| [esp32 Arduino Core](https://github.com/espressif/arduino-esp32) | Espressif Systems         | Arduino IDE 开发板管理器 | v3.3.8        |
| [SPI](https://github.com/espressif/arduino-esp32)                | Espressif Arduino Core 自带 | 随 Core 安装          | 随 Core v3.3.8 |
| [esp\_heap\_caps](https://github.com/espressif/arduino-esp32)    | Espressif Arduino Core 自带 | 随 Core 安装          | 随 Core v3.3.8 |

### 安装 esp32 Arduino Core

1. 打开 Arduino IDE 的首选项，在“其他开发板管理器地址”加入：


   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
2. 打开“工具 → 开发板 → 开发板管理器”，搜索 `esp32`。
3. 安装 `esp32 by Espressif Systems`。本机确认版本为 v3.3.8，复现时建议选择同一版本，减少 Core 差异带来的排错变量。

### 打开代码并烧录

1. 打开[项目 GitHub 页面](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek)，下载整个项目目录，或只保存 `ArduinoIDE/esp32s3-st7306-bringup` 文件夹。
2. 用 Arduino IDE 打开 `ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino`。
3. 确认代码中的 `PINSET` 为 `1`，并核对 `ROT180` 默认为 `1`。
4. 在“工具 → 开发板”里选你手上的 ESP32-S3 开发板（本例是 `ESP32S3 Dev Module`），再选对串口。参考值在下一节，不必逐项照抄。
5. 点击“验证”，通过后再点击“上传”。
6. 打开串口监视器，选择 115200 波特率。看到 `进入测试页面循环`，再观察屏幕是否按测试页轮播。用原生 USB 时，上传后串口会重新枚举，启动日志可能已经打完；看不到就按一下 RST，或以后续的 `[PAGE]` 翻页日志为准。屏幕是反射式的，请在明亮光线下观察。

### Arduino IDE 菜单配置（参考值）

下面这套是我跑通时的设置，Arduino IDE v2.3.8 + esp32 Core v3.3.8。只作参考：ESP32-S3 开发板型号太多，Flash 芯片、PSRAM、USB 接法都可能不一样，照抄反而容易出问题。表里第三列写了哪些项跟板子走。

| 菜单项 | 本例取值 | 怎么定 |
| --- | --- | --- |
| Board | ESP32S3 Dev Module | 按你的板子选，架构必须是 esp32s3 |
| Port | /dev/cu.usbmodem1401 | 选本机实际端口，别照抄路径 |
| USB CDC On Boot | Enabled | 看 USB 接到哪：接原生 USB 要 Enabled，走板载串口芯片要 Disabled |
| CPU Frequency | 240MHz (WiFi) | 保持默认即可，示例不需要降频 |
| Flash Mode | QIO 80MHz | 按 Flash 芯片定，QIO 是多数模组的默认值 |
| Flash Size | 4MB (32Mb) | 不要超过板子实际容量（选大了可能启动失败）；选小只是少用容量，程序超出分区才会编译报错 |
| PSRAM | Disabled | 示例不用 PSRAM，保持 Disabled 最稳；要开就必须按模组选对 OPI/QSPI（N16R8 的 R8 通常是 Octal，选 OPI PSRAM），选错可能起不来 |
| Partition Scheme | Default 4MB with spiffs（1.2MB APP / 1.5MB SPIFFS） | 默认够用，改 Flash Size 时要一起改 |
| Upload Speed | 921600 | 上传失败就降到 115200 或 460800 |
| Upload Mode | UART0 / Hardware CDC | 跟 USB CDC 那项配套 |
| USB Mode | Hardware CDC and JTAG | 跟板子的 USB 口数量有关，单口板通常这样 |

我这块是 N16R8，标称 16MB Flash 加 8MB PSRAM，但上面 Flash Size 填的是 4MB、PSRAM 是 Disabled，等于大半容量没用上。示例只占 30000 字节 RAM 做显存，编译报告显示程序约占默认 APP 分区的 24%，所以这套值能跑。要用满容量就得改 Flash Size、PSRAM 和分区表，我没试过，不想让你踩这个坑。

判断自己配置对不对，不用逐项核对：能编译、能上传、串口能出字、屏幕能出画面，就够了。哪一步断了，先去排错那一节按现象对号。

## 完整代码：Arduino IDE 驱动 ST7306

下面是仓库 v7.5 的完整 `.ino`。与仓库相比，本文只改了几处注释（`PINSET` 含义、旋转方式、居中说明、FPS 口径、`DIAG_MODE` 用途），可执行逻辑没有动；仓库里对应的注释建议同步更新。v7.4 修正了 `PAGE_CYAN` 的填充字节，v7.5 删掉了一段读不回数据的 `0x09` 状态读取，其余逻辑未改。
```cpp
/*
 * ESP32-S3 + OSPTEK 4.2" 300x400 黑白红青 LCD（ST7306 · SPI）测试套件 v7.5
 *
 * v7.5 改动（删除无效的状态回读）：
 *   用 esp32s3-st7306-readback-test 实测：SPI.begin(...,-1,MOSI,-1) 时 MISO 未接，
 *   transfer() 恒返回 0xFF，与寄存器地址、CS 是否选中都无关；把数据脚切成输入后
 *   用上拉/下拉各读一遍，结果是全 1 / 全 0，说明屏幕在读命令期间没有驱动数据线。
 *   结论：这块模组在当前接法下读不回寄存器，原来的 [DIAG] 0x09 日志只会误报 OK，
 *   已整段删除。判断链路好坏请看屏幕是否正常显示，不要看串口。
 *
 * v7.4 改动（修复 PAGE_CYAN 全屏填充）：
 *   实机对比 0x33 / 0x55 / 逐点 writePoint(C_CYAN)：
 *   0x33 与逐点写入都显示整屏青（视觉偏蓝），0x55 显示间隔条纹。
 *   逐点写入后的 30000 字节显存也全部为 0x33，故将 PAGE_CYAN 改为 0x33。
 *
 * v7.3 改动（整屏再旋转 180°）：
 *   现场演示时画面方向与原映射相反，需要整屏转 180°。
 *   在 writePoint 的软件映射前加一次逻辑坐标中心对称：
 *     x -> LCD_W-1-x, y -> LCD_H-1-y
 *   等价于 rx = 299 - y; ry = x;  用 ROT180 宏开关，置 0 可回到 v7.1 方向。
 *
 * v7.1 改动（横版适配 - 软件旋转，方向修正）：
 *   面板物理排线是竖版 300x400，用户横着摆放，视角为 400x300。
 *   用软件旋转：writePoint 把逻辑横版坐标映射到竖版显存。
 *   映射公式（v7.1 修正）：rx = y; ry = 399 - x;
 *   v7 曾用 rx=299-y, ry=x（顺时针），诊断方块出现在右下方，方向反了。
 *   v7.1 改为逆时针：方块应出现在左上方。
 * v7.2：关闭 DIAG_MODE，恢复完整 8 页测试循环。
 *
 * v4 关键修复：
 *   1) 补上 pinMode(LCD_CS/RS, OUTPUT)：digitalWrite 底层只是 gpio_set_level()，
 *      不会自动切输出模式，ESP32 引脚默认是输入，CS/D-C 悬空导致屏幕收不到
 *      任何有效命令/数据时序。这是之前几版无显示的真正根因。
 *   2) 引脚定义与 board_config.h（BOARD_PINSET 1）保持一致，接线无需改动：
 *      CS=9  RST=10  CLK=12  MOSI=13  RS(D/C)=14
 *   3) SPI 时钟 20MHz
 *   4) 补上 IDF 工程 app_main 中 initialize() 之后的步骤：
 *      High_Power_Mode / display_on / display_Inversion(false) / clearDisplay
 *   5) 颜色映射与 IDF board_color.h 一致：
 *      C_WHITE=0x00  C_CYAN=0x01  C_RED=0x02  C_BLACK=0x03
 *      （bit0=青, bit1=红, 两bit都开=黑）
 *
 * v5 新增 8 个测试页面（每页 3 秒，刷新率页 6 秒）：
 *   0 COLOR_BARS  四色横条（白/青/红/黑）
 *   1 HELLO       HELLO WORLD + 四角角标 + 边框
 *   2 COUNTER     计时 / 帧数 / FPS
 *   3 DIAGONAL    对角线 + 横竖线
 *   4 REFRESH     刷新率测试（移动方块）
 *   5 CHECKER     棋盘格
 *   6 STRIPES     横条纹
 *   7 CYAN        全屏青色
 */

#include <SPI.h>
#include <esp_heap_caps.h>

// ---------------- 引脚配置 ----------------
#define PINSET 1  // 1=默认接法（GPIO9/10/12/13/14，本文使用）  0=备用接法（GPIO38～42）

#if PINSET == 1
  // 引脚与 IDF 工程 board_config.h（BOARD_PINSET 1）完全一致，接线不需要改动
  #define LCD_CS   9
  #define LCD_RST  10
  #define LCD_CLK  12
  #define LCD_MOSI 13
  #define LCD_RS   14   // D/C，丝印 RS
#else
  #define LCD_CS   38
  #define LCD_RST  41
  #define LCD_CLK  39
  #define LCD_MOSI 42
  #define LCD_RS   40
#endif

// ---------------- 屏幕参数 ----------------
// 逻辑分辨率：横版 400x300（面板物理排线是竖版 300x400，由 writePoint() 软件旋转，未使用 MV 位）
#define LCD_W      400
#define LCD_H      300
// 竖版显存参数（不变）
#define LCD_PIVOT_W  300   // 物理宽
#define LCD_PIVOT_H  400   // 物理高
#define LCD_ROW_B    (LCD_PIVOT_W / 2)          // 每行 150 字节
#define BUF_LEN      (LCD_ROW_B * LCD_PIVOT_H / 2)  // 30000 字节
#define CHUNK        1500

// 颜色映射与 IDF board_color.h 一致
#define C_WHITE  0x00
#define C_CYAN   0x01
#define C_RED    0x02
#define C_BLACK  0x03

// 若仍然点不亮，可把 20000000 降到 10000000 再试
#define SPI_HZ  20000000

static uint8_t *fb = nullptr;

// ---------------- 底层 SPI（CS 全手动）----------------
static void spi_begin(void) {
  SPI.beginTransaction(SPISettings(SPI_HZ, MSBFIRST, SPI_MODE0));
}

static void lcd_cmd(uint8_t cmd) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, LOW);
  SPI.transfer(cmd);
  digitalWrite(LCD_CS, HIGH);
}

static void lcd_param(uint8_t p) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  SPI.transfer(p);
  digitalWrite(LCD_CS, HIGH);
}

// 这里原来有个 lcd_read_reg()，用 SPI.transfer() 读 0x09 状态寄存器。
// v7.5 删掉的原因（实测，不是推测）：
//   1) SPI.begin(LCD_CLK, -1, LCD_MOSI, -1) 的第二个参数是 MISO，传 -1 表示没接，
//      外设没有输入脚可采，transfer() 恒返回 0xFF。
//   2) 换成 0x04 / 0x0A / 0xDA / 0xA5 任意寄存器，或者把 CS 一直拉高根本
//      不选中屏幕，读回的还是 0xFF —— 说明这个值和屏幕没有任何关系。
//   3) 改成半双工（把 MOSI 脚切成输入、手动打时钟）再读，内部上拉得到全 1、
//      内部下拉得到全 0，说明读命令期间屏幕没有驱动数据线，读不回来。
// 所以这块模组在当前接法下没有可用的链路自检。判断接没接好，就看屏幕显不显示。

// ---------------- 初始化序列（与 IDF 逐条一致）----------------
static void st7306_init(void) {
  // 关键修复：必须显式把 CS / RS / RST 配成输出。
  // digitalWrite 底层只是 gpio_set_level()，不会自动切输出模式；
  // ESP32 引脚默认是输入，若不 pinMode，CS 和 D/C 全程悬空，屏幕收不到任何有效时序。
  pinMode(LCD_CS,  OUTPUT);
  pinMode(LCD_RS,  OUTPUT);
  pinMode(LCD_RST, OUTPUT);
  digitalWrite(LCD_CS, HIGH);   // 空闲时 CS 拉高
  digitalWrite(LCD_RS, HIGH);
  digitalWrite(LCD_RST, HIGH); delay(10);
  digitalWrite(LCD_RST, LOW);  delay(10);
  digitalWrite(LCD_RST, HIGH); delay(10);

  // 最后一个参数传 -1，CS 完全由手动 digitalWrite 控制
  SPI.begin(LCD_CLK, -1, LCD_MOSI, -1);
  spi_begin();

  lcd_cmd(0xD6); lcd_param(0x17); lcd_param(0x02);
  lcd_cmd(0xD1); lcd_param(0x01);

  lcd_cmd(0xC0); lcd_param(0x12); lcd_param(0x0A);
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);

  lcd_cmd(0xD8); lcd_param(0xA6); lcd_param(0xE9);
  lcd_cmd(0xB2); lcd_param(0x12);

  lcd_cmd(0xB3); lcd_param(0xE5); lcd_param(0xF6); lcd_param(0x17);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x71);
  lcd_cmd(0xB4); lcd_param(0x05); lcd_param(0x46); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x76); lcd_param(0x45);

  lcd_cmd(0x62); lcd_param(0x32); lcd_param(0x03); lcd_param(0x1F);

  lcd_cmd(0xB7); lcd_param(0x13);
  lcd_cmd(0xB0); lcd_param(0x64);

  lcd_cmd(0x11); delay(120);                         // Sleep Out

  lcd_cmd(0xC9); lcd_param(0x00);
  lcd_cmd(0x36); lcd_param(0x48);                    // MX=1, DO=1
  lcd_cmd(0x3A); lcd_param(0x11);
  lcd_cmd(0xB9); lcd_param(0x20);
  lcd_cmd(0xB8); lcd_param(0x29);

  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);

  lcd_cmd(0x35); lcd_param(0x00);
  lcd_cmd(0xD0); lcd_param(0xFF);
  lcd_cmd(0x38);                                     // HPM

  lcd_cmd(0x29);                                     // DISPLAY ON
  lcd_cmd(0x20);                                     // Inversion Off

  lcd_cmd(0xBB); lcd_param(0x4F);                    // Enable Clear RAM

  // ---- IDF app_main 在 initialize() 之后还会调用的步骤 ----
  lcd_cmd(0x38); delay(300);                         // High_Power_Mode() 的 HPM 序列
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);
  lcd_cmd(0xC9); lcd_param(0x00);
  delay(20);
  // display_on(true) / display_Inversion(false) 已在上面发过 0x29/0x20
  // clearDisplay() 等价于显存清零，由刷屏前的 memset 完成

  SPI.endTransaction();
}

// ---------------- 刷屏（分块发送）----------------
static void st7306_flush(void) {
  spi_begin();
  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);
  lcd_cmd(0x2C);

  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  for (size_t off = 0; off < BUF_LEN; off += CHUNK) {
    size_t n = BUF_LEN - off;
    if (n > CHUNK) n = CHUNK;
    SPI.writeBytes(fb + off, n);
  }
  digitalWrite(LCD_CS, HIGH);
  SPI.endTransaction();
}

// ---------------- 像素操作 ----------------
// 逻辑坐标：横版 400x300
// 竖版显存 300(列) x 400(行)，软件旋转映射：
//   横版 x (0~399, 左到右) -> 竖版行 ry = 399 - x（左右翻转）
//   横版 y (0~299, 上到下) -> 竖版列 rx = y
// bit 位段用竖版物理坐标 rx/ry 的奇偶计算。
//
// ROT180：把整屏再旋转 180°（面板装反 / 演示摆放方向相反时用）。
//   做法是先把逻辑坐标做中心对称 x -> 399-x, y -> 299-y，再套用上面的映射，
//   化简后等价于：rx = 299 - y; ry = x;
#define ROT180 1   // 1 = 旋转 180°（当前）；0 = 恢复 v7.1 原方向

static void writePoint(uint16_t x, uint16_t y, uint16_t data) {
  if (x >= LCD_W || y >= LCD_H) return;
#if ROT180
  x = LCD_W - 1 - x;       // 逻辑 x 镜像
  y = LCD_H - 1 - y;       // 逻辑 y 镜像
#endif
  uint16_t rx = y;         // 竖版列
  uint16_t ry = 399 - x;   // 竖版行（翻转）
  uint16_t real_x = rx / 2;
  uint16_t real_y = ry / 2;
  uint32_t idx    = (uint32_t)real_y * LCD_ROW_B + real_x;
  uint8_t one_two    = (ry % 2) ? 1 : 0;
  uint8_t line_bit_1 = (rx % 2) * 4;
  uint8_t line_bit_0 = (rx % 2) * 4 + 2;
  uint8_t bit1       = 7 - (line_bit_1 + one_two);
  uint8_t bit0       = 7 - (line_bit_0 + one_two);
  if (data & 0x02) fb[idx] |=  (1 << bit1);
  else             fb[idx] &= ~(1 << bit1);
  if (data & 0x01) fb[idx] |=  (1 << bit0);
  else             fb[idx] &= ~(1 << bit0);
}

static void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  for (uint16_t j = 0; j < h; j++)
    for (uint16_t i = 0; i < w; i++)
      writePoint(x + i, y + j, color);
}

// ---------------- 5x7 字模（移植自 IDF board_ui_draw.cc）----------------
static const uint8_t s_font_5x7[][7] = {
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, /*   */
    {0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04}, /* ! */
    {0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00}, /* " */
    {0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A}, /* # */
    {0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04}, /* $ */
    {0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03}, /* % */
    {0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0D}, /* & */
    {0x04, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00}, /* ' */
    {0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02}, /* ( */
    {0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08}, /* ) */
    {0x00, 0x04, 0x15, 0x0E, 0x15, 0x04, 0x00}, /* * */
    {0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00}, /* + */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08}, /* , */
    {0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00}, /* - */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00}, /* . */
    {0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00}, /* / */
    {0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E}, /* 0 */
    {0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* 1 */
    {0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F}, /* 2 */
    {0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E}, /* 3 */
    {0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02}, /* 4 */
    {0x1F, 0x10, 0x10, 0x1E, 0x01, 0x01, 0x1E}, /* 5 */
    {0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E}, /* 6 */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08}, /* 7 */
    {0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E}, /* 8 */
    {0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E}, /* 9 */
    {0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00}, /* : */
};

// 大写字母 A-Z（5x7）
static const uint8_t s_font_upper[][7] = {
    {0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* A */
    {0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E}, /* B */
    {0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E}, /* C */
    {0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E}, /* D */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F}, /* E */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10}, /* F */
    {0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F}, /* G */
    {0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* H */
    {0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* I */
    {0x01, 0x01, 0x01, 0x01, 0x01, 0x11, 0x0E}, /* J */
    {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11}, /* K */
    {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F}, /* L */
    {0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11}, /* M */
    {0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11}, /* N */
    {0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* O */
    {0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10}, /* P */
    {0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D}, /* Q */
    {0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11}, /* R */
    {0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E}, /* S */
    {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04}, /* T */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* U */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04}, /* V */
    {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A}, /* W */
    {0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11}, /* X */
    {0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04}, /* Y */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F}, /* Z */
};

static void draw_char(int x, int y, char c, int scale, uint16_t color) {
    const uint8_t *rows = nullptr;
    if (c >= ' ' && c <= ':') {
        rows = s_font_5x7[c - ' '];
    } else if (c >= 'A' && c <= 'Z') {
        rows = s_font_upper[c - 'A'];
    } else if (c >= 'a' && c <= 'z') {
        rows = s_font_upper[c - 'a'];   // 复用大写字模
    } else {
        return;
    }
    for (int ry = 0; ry < 7; ++ry) {
        for (int rx = 0; rx < 5; ++rx) {
            if (rows[ry] & (1U << (4 - rx))) {
                fillRect(x + rx * scale, y + ry * scale, scale, scale, color);
            }
        }
    }
}

static void draw_text(int x, int y, const char *s, int scale, uint16_t color) {
    const int char_w = 5 * scale + scale;
    int pen_x = x;
    for (const char *p = s; *p; ++p) {
        draw_char(pen_x, y, *p, scale, color);
        pen_x += char_w;
    }
}

// ---------------- 测试页面 ----------------
enum TestPage {
    PAGE_COLOR_BARS = 0,   // 四色横条（白/青/红/黑）
    PAGE_HELLO,            // Hello World + 四角角标 + 边框
    PAGE_COUNTER,          // 秒数 / 帧数计数
    PAGE_DIAGONAL,         // 对角线 + 横竖线
    PAGE_REFRESH,          // 刷新率测试（移动方块）
    PAGE_CHECKER,          // 棋盘格
    PAGE_STRIPES,          // 横条纹
    PAGE_CYAN,             // 全屏青色
    kTotalPages
};

static void draw_corner_marks(uint16_t color) {
    const int L = 30, T = 4;  // 臂长、臂粗
    // 左上
    fillRect(4, 4, L, T, color);  fillRect(4, 4, T, L, color);
    // 右上
    fillRect(LCD_W - 4 - L, 4, L, T, color);  fillRect(LCD_W - 4 - T, 4, T, L, color);
    // 左下
    fillRect(4, LCD_H - 4 - T, L, T, color);  fillRect(4, LCD_H - 4 - L, T, L, color);
    // 右下
    fillRect(LCD_W - 4 - L, LCD_H - 4 - T, L, T, color);
    fillRect(LCD_W - 4 - T, LCD_H - 4 - L, T, L, color);
}

static void draw_border(uint16_t color) {
    fillRect(0, 0, LCD_W, 2, color);
    fillRect(0, LCD_H - 2, LCD_W, 2, color);
    fillRect(0, 0, 2, LCD_H, color);
    fillRect(LCD_W - 2, 0, 2, LCD_H, color);
}

// 画一条任意方向直线（Bresenham）
static void draw_line(int x0, int y0, int x1, int y1, int thick, uint16_t color) {
    int dx = abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int dy = -abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    int err = dx + dy;
    while (true) {
        fillRect(x0, y0, thick, thick, color);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

static void render_page(int page, uint32_t frame, uint32_t elapsed_ms) {
    memset(fb, 0x00, BUF_LEN);   // 默认全白

    switch (page) {
    case PAGE_COLOR_BARS: {
        const uint16_t colors[4] = { C_WHITE, C_CYAN, C_RED, C_BLACK };
        const int bar_h = LCD_H / 4;
        for (int i = 0; i < 4; ++i) {
            int y0 = i * bar_h;
            int y1 = (i == 3) ? LCD_H : (y0 + bar_h);
            fillRect(0, y0, LCD_W, y1 - y0, colors[i]);
        }
        draw_text(10, 10, "1: COLOR BARS", 2, C_BLACK);
        break;
    }
    case PAGE_HELLO:
        // "HELLO WORLD" 11 字符 * scale5 * 6px = 330px 宽，居中 x=(400-330)/2=35
        draw_text(35, 110, "HELLO WORLD", 5, C_BLACK);
        draw_text(110, 175, "ST7306 400X300", 2, C_RED);
        draw_text(110, 200, "ESP32-S3 ARDUINO", 2, C_CYAN);
        draw_corner_marks(C_BLACK);
        draw_border(C_RED);
        break;
    case PAGE_COUNTER: {
        char buf[24];
        uint32_t sec = elapsed_ms / 1000;
        snprintf(buf, sizeof(buf), "T: %02lu:%02lu", (unsigned long)(sec / 60), (unsigned long)(sec % 60));
        draw_text(115, 80, buf, 5, C_BLACK);        // 240 宽；x=115 为手调，未严格居中
        snprintf(buf, sizeof(buf), "FRAME: %lu", (unsigned long)frame);
        draw_text(140, 160, buf, 3, C_RED);         // 宽度随位数变化；x=140 为手调
        snprintf(buf, sizeof(buf), "FPS: %lu", (unsigned long)(frame * 1000 / max((uint32_t)1, elapsed_ms)));
        draw_text(152, 200, buf, 3, C_CYAN);        // 宽度随位数变化；x=152 为手调；FPS 为开机至今所有页面的累计平均
        break;
    }
    case PAGE_DIAGONAL:
        // 两条对角线
        draw_line(0, 0, LCD_W - 1, LCD_H - 1, 3, C_BLACK);
        draw_line(LCD_W - 1, 0, 0, LCD_H - 1, 3, C_RED);
        // 横线
        for (int y = 30; y < LCD_H; y += 60)
            draw_line(0, y, LCD_W - 1, y, 2, C_CYAN);
        // 竖线
        for (int x = 40; x < LCD_W; x += 80)
            draw_line(x, 0, x, LCD_H - 1, 2, C_BLACK);
        draw_text(10, 10, "3: DIAGONAL", 2, C_BLACK);
        break;
    case PAGE_REFRESH: {
        // 方块左右往返，观察运动平滑度
        int period = LCD_W - 60;
        int x = (int)((frame * 8) % (period * 2));
        if (x > period) x = period * 2 - x;
        fillRect(x + 10, 130, 40, 40, C_BLACK);     // 垂直居中 y=(300-40)/2
        char buf[24];
        snprintf(buf, sizeof(buf), "FRAME %lu", (unsigned long)frame);
        draw_text(10, 10, buf, 2, C_BLACK);
        break;
    }
    case PAGE_CHECKER: {
        const int cell = 20;
        for (int y = 0; y < LCD_H; y += cell)
            for (int x = 0; x < LCD_W; x += cell)
                fillRect(x, y, cell, cell, ((x / cell + y / cell) & 1) ? C_BLACK : C_WHITE);
        break;
    }
    case PAGE_STRIPES: {
        const int stripe_h = 16;
        for (int y = 0; y < LCD_H; y += stripe_h * 2) {
            fillRect(0, y, LCD_W, stripe_h, C_BLACK);
            fillRect(0, y + stripe_h, LCD_W, stripe_h, C_WHITE);
        }
        break;
    }
    case PAGE_CYAN:
        memset(fb, 0x33, BUF_LEN);   // 0x33 = 每个合并像素 01 -> 全屏青
        draw_text(85, 130, "CYAN FULL", 5, C_BLACK);   // 270 宽；x=85 为手调，未严格居中
        break;
    default:
        break;
    }

    st7306_flush();
}

// ---------------- Arduino 入口 ----------------

// 诊断模式：true 时只画一个 50x50 黑方块在逻辑 (50,50)，
// 用于判断 writePoint 映射和方向是否正确（屏幕完全不亮时它帮不上忙，先查接线和供电）。
// 观察要点：
//   1. 方块是正方形（不是矩形/碎片）-> 像素映射比例正确
//   2. 方块在横版视角的左上 1/4 区域 -> 方向正确
//   3. 若整体反了 -> 先改 ROT180 宏；仍不对再考虑改 MADCTL(0x36) 的 MX/MY 位
#define DIAG_MODE  false

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println();
    Serial.println("=== ST7306 test suite v7.5 (ROT180) ===");

    fb = (uint8_t *)heap_caps_malloc(BUF_LEN, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!fb) fb = (uint8_t *)malloc(BUF_LEN);
    if (!fb) { Serial.println("[ERR] 显存分配失败"); while (1) delay(100); }
    Serial.printf("[OK] 显存 %d 字节 @%p\n", BUF_LEN, fb);
    memset(fb, 0x00, BUF_LEN);

    Serial.println("[..] 初始化 ST7306 ...");
    st7306_init();

    // 这里原来会读一次 0x09 状态寄存器并打印 OK / 链路不通。
    // v7.5 删除：MISO 没接，读回的值恒为 0xFF，和屏幕状态无关，只会误报。
    // 链路是否正常，看屏幕有没有正常出画面。

    if (DIAG_MODE) {
        Serial.println("[DIAG] 画 50x50 方块 at (50,50)，观察屏幕...");
        fillRect(50, 50, 50, 50, C_BLACK);
        st7306_flush();
    } else {
        Serial.println("[OK] 进入测试页面循环");
    }
}

void loop() {
    if (DIAG_MODE) { delay(1000); return; }

    static int page = 0;
    static uint32_t page_start = 0;
    static uint32_t frame = 0;
    static uint32_t t_start = 0;

    if (t_start == 0) t_start = millis();
    if (page_start == 0) page_start = millis();

    uint32_t dwell = (page == PAGE_REFRESH) ? 6000 : 3000;
    uint32_t elapsed = millis() - page_start;

    render_page(page, frame, millis() - t_start);
    frame++;

    if (elapsed >= dwell) {
        page = (page + 1) % kTotalPages;
        page_start = millis();
        Serial.printf("[PAGE] %d / %d, frame %lu\n", page, kTotalPages - 1, (unsigned long)frame);
    }
}
```


### 代码说明：ST7306 初始化、显存与旋转

`PINSET` 决定使用哪组 GPIO。本文的接线对应 `PINSET = 1`；源码还保留了 `PINSET = 0` 的另一组引脚，换组时必须同时改接线。`PINSET` 只是两组引脚的开关，与是否使用转接板无关；为了方便我接线所以我增加了一个接线配置，对应 `PINSET = 1`。

`st7306_init()` 先把 CS、RS、RST 设为输出，再完成硬件复位和 ST7306 初始化。`SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` 指定 SCLK 和 MOSI，CS 由代码手动控制；MISO 传 `-1`，因为本模组 FPC 上没有 MISO/SDO，只能写不能读，所以本例没有读回自检。传输使用 `SPI_MODE0`，时钟由 `SPI_HZ` 设置为 20MHz。

显存大小可以直接算出来：每像素 2bit，一个字节装 2×2 共 4 个像素，所以 300×400 像素折合为每行 150 字节、共 200 行（每行对应 2 个像素行），`150 × 200 = 30000` 字节。程序启动时用 `heap_caps_malloc()` 申请 DMA 可用内存，失败后再退回普通 `malloc()`。

`writePoint()` 把逻辑 400×300 横屏坐标换算成原生 300×400 显存坐标。默认 `ROT180 = 1` 会再做一次中心对称，所以改显示方向时先动这个宏，不要改 `LCD_W` 和 `LCD_H`。

`st7306_flush()` 每次把完整显存发出去，每块 1500 字节。`loop()` 持续重画当前页面，普通页约 3 秒后翻页，`PAGE_REFRESH` 约 6 秒后翻页。计数页的时间和 FPS 都是开机以来的累计值，不是单页数据。

ESP-IDF 版本的驱动拆在 `main/st7306_color4.cpp`、`main/st73xx_ui.c` 和 `main/color4_demo.c` 中，页面也更多。这部分留给读者按仓库 README 自行研究，本文不展开 ESP-IDF 的编译步骤。

## 常见问题排查：ST7306 无显示、方向与颜色

### 上传成功，屏幕完全没有变化

现象：串口已经运行，屏幕仍保持原样。

原因：供电、共地、FPC 方向、RS/DC 接错或 SPI 信号不稳定，都可能让初始化命令没有正确到达屏幕；反射屏没有背光，环境太暗时也会看起来像没显示。

怎么办：先断电核对公共地和 FPC 触点方向，再上电量第 5、6 脚是否为 3.3V（见前文检查步骤）。厂家转接板的 GPIO14 接 RS。在明亮光线下换个角度观察。以上都正常后，再把 `SPI_HZ` 从 `20000000` 改为 `10000000`，缩短 SCLK 和 MOSI 连线后重新上传。

### 旧版本（v7.4 及以前）串口打印 OK，屏幕却不亮

现象：串口打印 `[DIAG] ST7306 0x09 = 0xFF OK`，屏幕却没有任何画面。

原因：这行日志不能反映屏幕状态。按上面的 FPC 引脚表，本模组没有 MISO/SDO，`SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` 也没有给 MISO 分配引脚，`SPI.transfer()` 恒返回 `0xFF`，与读哪个寄存器、CS 是否选中都无关（我换过 `0x04`、`0x0A`、`0xDA`、`0xA5`，把 CS 一直拉高也一样）。把 MOSI 脚切成输入手动读时，上拉得全 1、下拉得全 0，同样说明读命令期间屏幕没有驱动数据线。

怎么办：升级到 v7.5，该行已删除。v7.5 的串口日志不反映屏幕状态，判断链路只看屏幕有没有出画面，排查回到供电、共地、FPC 方向和 RS 接脚。

### ST7306 时好时坏、花屏或每次上电结果不同

现象：有时能显示，有时花屏，或者重新上电后结果不同。

原因：SPI 连线过长、公共地接触不良，会让数据在传输中出错；线越长、时钟越高越容易丢字节（这是经验判断，我没有做量化测试）。

怎么办：先把线缩短到 10cm 以内，确认 GND 一共接了两根以上、不是只靠一根细线过地。再把 `SPI_HZ` 从 20MHz 降到 10MHz 试，能稳定再往上加。不要先随意删改初始化命令。

### ST7306 横屏方向反了

现象：文字或图案旋转了 180°，但图形比例正常。

原因：当前代码默认 `ROT180 = 1`，你的摆放方向可能与示例相反。

怎么办：上传后看 HELLO WORLD 页：文字是正的就不用动；如果整屏颠倒了 180°，把 `#define ROT180 1` 改为 `#define ROT180 0`，重新上传即可。需要单独检查方向和坐标时，把 `DIAG_MODE` 改为 `true`，程序会只画一个 50×50 黑方块；方向正确时它应是正方形，位于画面左上区域。这个模式只用于检查方向和映射，屏幕完全不亮时它帮不上忙。

### ST7306 显示比例或位置异常

现象：方块变形、图案碎裂或位置不符合预期。

原因：通常出现在改过 `LCD_W`、`LCD_H`、显存布局宏或 `writePoint()` 之后，或把代码用到了别的 ST7306 模组上；未改动的 v7.5 在本模组上不应出现。400×300 逻辑坐标与 300×400 原生显存之间靠 `writePoint()` 映射，不能靠改分辨率宏解决。

怎么办：保留 `LCD_W = 400`、`LCD_H = 300`，先开 `DIAG_MODE` 检查方块，再对照 `writePoint()` 的 `rx`、`ry` 和位平面计算。

### ST7306 颜色与预期不同

现象：红色、青色或填充图案不符合预期。

原因：本模组只有白、青、红、黑四种状态，两个颜色位在字节内交错排列。其他 ST7306 模组也可能采用不同颜色实现。

怎么办：先运行四色横条页，确认四种基础状态，再检查 `writePoint()` 的颜色写入。v7.4 起已把 `PAGE_CYAN` 的填充字节改为 `0x33`；如果运行旧版看到间隔条纹，升级代码或只改这一处。

### Arduino IDE 提示 `esp_heap_caps.h` 找不到

现象：编译阶段提示头文件缺失。

原因：当前选择的开发板或 Core 不对。这个头文件属于 ESP32 Arduino Core，不是单独的第三方库。

怎么办：确认安装的是 `esp32 by Espressif Systems`，并在开发板菜单里选择 ESP32-S3，而不是 Arduino Uno 或其他架构。若 Core 已损坏，记录当前版本后重新安装，再重新选择开发板和端口。

### ESP32-S3 上传后看不到串口日志

现象：屏幕可能已经有页面，串口监视器却没有内容。

原因：波特率、串口设备或 USB CDC 配置不匹配，也可能是串口被其他程序占用。

怎么办：把波特率设为 115200，关闭占用串口的其他监视器。再对照本例的菜单值：`USB CDC On Boot = Enabled`、`USB Mode = Hardware CDC and JTAG`，串口设备形如 `/dev/cu.usbmodem1401`（Windows 上是 COM 口）。如果板子走的是板载 USB 转串口芯片而不是原生 USB，把 `USB CDC On Boot` 改为 `Disabled`；`USB Mode` 对这种接法基本没有影响，保持默认即可。

## FAQ：ESP32-S3 驱动 ST7306 的常见疑问

**Q：ESP32-S3 能不能换别的引脚接 ST7306？**  
A：可以修改 `.ino` 中 `PINSET = 1` 分支下的 `LCD_CS`、`LCD_RST`、`LCD_CLK`、`LCD_MOSI` 和 `LCD_RS`，接线也要同步改。能不能使用某个 GPIO 取决于开发板引出和启动配置，我没逐块板验证。例如 N16R8 上 GPIO35～37 被 Octal PSRAM 占用，开启 PSRAM 时要避开。源码的 `PINSET = 0` 还提供了 CS=38、RESET=41、SCLK=39、MOSI=42、RS=40 这一组备选。

**Q：ST7306 的 SPI 时钟能不能改？**  
A：示例默认 `SPI_HZ = 20000000`，即 20MHz。通信不稳定时先改成 `10000000`。项目资料记录 ST7306 v0.1 手册的写时钟最小周期为 30ns，折合约 33.3MHz；实际模组还要考虑走线和转接板，我没有测出这块板的稳定上限。

**Q：YDP420H005-V3 能不能接 5V 供电？**  
A：不要。模组 FPC 第 5、6 脚接 3.3V，逻辑也按 3.3V 使用。两个供电脚都要接，开发板和模组要共地。模组断电时不要继续给它输入 GPIO 信号。

**Q：这个 ST7306 示例占多少 RAM，能跑多少 FPS？**  
A：完整显存是 30000 字节，程序还会使用字模、局部变量和 Arduino Core 本身的运行内存。每次刷新发送完整 30000 字节；20MHz 下只算 SPI 载荷，理论传输时间约 12ms，不含绘图和命令开销。实际 FPS 我没有记录。计数页显示的是开机以来所有页面的累计平均，不是单页帧率；绘图本身（逐像素调用 `writePoint()`）也要耗时，实际帧时间会比 12ms 长。

**Q：换一块同样使用 ST7306 的屏能直接用吗？**  
A：不能保证。本例针对 YDP420H005-V3 的 21Pin FPC、初始化序列、300×400 显存和当前四种显示状态。其他模组可能改供电、寻址、颜色或初始化参数，要先对照它的规格书。

**Q：ST7306 接好线却没有显示，先查哪里？**  
A：先断电检查公共地、FPC 方向和五根必需信号线，确认厂家转接板的 GPIO14 接 RS；上电后量 3.3V，并在明亮光线下观察。仍无显示，再把 SPI 降到 10MHz。`DIAG_MODE` 只用来检查方向和映射，屏幕完全不亮时用处不大。

**Q：ST7306 的 TE 和 MISO 要不要接？**  
A：TE 是帧同步输出，本例不读取，可以不接。写屏只用到 MOSI，FPC 上也没有 MISO/SDO，所以本例没有读回寄存器的自检方式。老版本示例里的 `lcd_read_reg(0x09)` 读回值恒为 `0xFF`，与屏幕状态无关，v7.5 已删除，详见排错一节。

**Q：能不能用 ESP-IDF 跑这块 ST7306 屏？**  
A：该项目目录（`Handbook/ESP-IDF/420-…`）本身就是 ESP-IDF 工程，开发记录写明 ESP-IDF v6.0.2 已完成零警告编译，包含 20 页演示和绘图函数。本文没有重新执行这套构建，也不展开 ESP-IDF 教程；你可以按仓库 README 自行研究。

## 延伸玩法：在 ST7306 示例上继续改

- 把 `draw_text()` 的 5×7 字模换成自己的点阵字库，做一块四色状态牌。
- 在现有页面上加局部内容更新策略，并实测刷新时间与显示效果。
- 接入 TE 信号，研究如何安排刷屏时机，观察运动页面的变化。
- 对照 Arduino 版本阅读 ESP-IDF 的 20 页演示，把需要的绘图函数拆回自己的应用。

## 参考资料：ESP32-S3、ST7306 与 Arduino

- [LingShunLAB 项目主页](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek)：本文接线、代码和文档的来源。
- [Arduino IDE 示例源码 v7.5](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino)：完整 `.ino`。
- [YDP420H005-V3 模组规格书](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/docs/YDP420H005-V3.pdf)：模组参数、机械图和 FPC 定义。
- [Sitronix ST7306 官方产品列表](https://www.sitronix.com.tw/en/products/industrial-display-driver-ic/ultra-low-power-tft-driver-ic/)：矽创超低功耗 TFT 驱动 IC 产品页。
- [ST7306 控制器手册 v0.1（模组厂家提供）](https://admin.osptek.com/uploads/ST_7306_V0_1_c30c3541a3.pdf)：接口、寄存器、显存和时序；仓库 `docs/` 也保留了一份。
- [Osptek 原厂示例代码](https://gitee.com/osptek/display-rlcd-4.2inch-300x400/tree/main/examples)：厂家提供的相关显示示例。
- [Espressif ESP32-S3 官方产品页](https://www.espressif.com/en/products/socs/esp32-s3)与[官方数据手册](https://documentation.espressif.com/esp32-s3_datasheet_en.html)：主控芯片资料。
- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)与[官方安装文档](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)：开发板支持包及安装方法。
