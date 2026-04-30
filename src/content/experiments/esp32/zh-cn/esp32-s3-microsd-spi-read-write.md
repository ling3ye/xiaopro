---
title: "ESP32-S3 驱动 Micro SD 卡模块完整教程（SPI 模式 + Arduino 代码）"
boardId: esp32s3
moduleId: storage/microsd-storage-board
category: esp32
date: 2026-04-30
intro: "ESP32-S3 通过 SPI 模式驱动 Micro SD 卡模块，实现文件列表读取、读写删除等完整操作。附接线图、完整代码和避坑指南。"
image: "https://img.lingflux.com/2026/04/a52d9db02d07cc13df512e06920e4603.jpg"
---

> **一句话摘要**：ESP32-S3 通过 SPI 模式读写 Micro SD 卡，30 分钟从接线到串口输出文件列表。

# ESP32-S3 驱动 Micro SD 卡模块完整教程（SPI 模式 + Arduino 代码）

> 难度：⭐⭐☆☆☆（有一点基础就能上手） 预计时间：30 分钟 测试环境：Arduino IDE 2.3.x + ESP32 Arduino Core 3.x

------

> **TL;DR（直接上手版）：**
>
> 1. 接线：GPIO5 → CMD（MOSI），GPIO13 → D0（MISO），GPIO14 → CLK，GPIO4 → D3（CS）
> 2. 电源接 **3.3V**，不要接 5V
> 3. SD 卡格式化成 **FAT32**（32G 卡尤其注意）
> 4. 用内置 `SD.h` 库，无需额外安装
> 5. 烧录代码，打开串口监视器（115200），看到文件列表就成功了

------

## 前言

做 ESP32 项目做到一半，你有没有遇到过这个问题：

> 想播一段音频、存一堆传感器数据、或者塞几张图片进去……
>  结果发现 ESP32 的内置 Flash 根本不够用。

这时候最简单的解法就是外挂一张 SD 卡。存储从几 MB 直接升级到几十 GB，读写速度也够用。本文就带你把 **ESP32-S3 + Micro SD 卡模块** 这套组合从零跑通，用 SPI 模式读取 32G 的 SD 卡里的文件列表。

接好线、烧录代码，30 分钟内你应该能在串口监视器里看到自己 SD 卡里的文件名。

------

## 演示效果

![](https://img.lingflux.com/2026/04/36943c66a6d84fb669a840b29677f2f5.jpg)

串口输出大概长这样：

```
=== ESP32-S3 SD SPI Test ===
MOSI=5, MISO=13, SCK=14, CS=4
SD card mounted successfully.
SD Card Type: SDHC
SD Card Size: 30436MB
Total space: 30436MB
Used space : 512MB
Listing directory: /
  DIR : music
  FILE: readme.txt  SIZE: 128
  FILE: config.json  SIZE: 256
```


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/EOdWUtUBBMA?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


------

## 模块介绍

![](https://img.lingflux.com/2026/04/6737983c1e0d23072c47461024204cb9.jpg)

SD 卡模块就像是给 ESP32 装了一个"读卡器"。ESP32 本身没有 SD 卡槽，这块小模块充当中间人，把 ESP32 的 SPI 信号翻译成 SD 卡能听懂的协议，让你的 SD 卡变成可以随意读写的外部存储空间。

| 参数               | 规格说明                                   |
| ------------------ | ------------------------------------------ |
| 接口协议           | SPI 模式 / SDIO 模式（本文用 SPI）         |
| 支持卡类型         | Micro SD（SDSC / SDHC，最高支持 32GB）     |
| 工作电压           | 3.3V（**不要接 5V，会烧模块或烧卡**）      |
| 引脚数量           | CMD / CLK / D0 / D1 / D2 / D3 / 3.3V / GND |
| SPI 模式用到的引脚 | CMD（MOSI）/ D0（MISO）/ CLK / D3（CS）    |

选这款模块的原因：体积小、接线少（SPI 模式只用 4 根信号线），是 ESP32 外扩存储最常见的方案，网上资料也多，踩坑有人陪。

------

## BOM 清单

| 元件            | 数量 | 备注                        |
| --------------- | ---- | --------------------------- |
| ESP32-S3 开发板 | 1    | 任意带 GPIO 的 S3 板均可    |
| Micro SD 卡模块 | 1    | 支持 SPI 模式（背面有标注） |
| Micro SD 卡     | 1    | 建议 32G 以内，格式化 FAT32 |
| 跳线（杜邦线）  | 若干 | 公对母，尽量短              |

------

## 完整接线方法

| ESP32-S3 引脚 | SD 模块引脚  | 说明                               |
| ------------- | ------------ | ---------------------------------- |
| 3.3V          | 3.3V         | **只接 3.3V，不要接 5V**           |
| GND           | GND          | 共地，必须接                       |
| GPIO13        | D0           | SPI MISO：SD 卡回传数据给 ESP32    |
| GPIO5         | CMD          | SPI MOSI：ESP32 发数据给 SD 卡     |
| GPIO14        | CLK          | SPI 时钟，ESP32 主控               |
| GPIO4         | D3           | SPI 片选（CS），低电平时选中 SD 卡 |
| 不接          | D1 / D2 / CD | SPI 模式下用不到，空着即可         |

> ⚠️ 接好线之后，建议逐根对照上表过一遍，能省你 80% 的排错时间。
>  另外，杜邦线别太长（30cm 以内最稳），线一长信号容易抖，32G 大卡对时序更挑剔。

------

## 需要安装的库

不需要额外安装！

本文用到的 `SPI.h` 和 `SD.h` 都已经内置在 **ESP32 Arduino Core** 里了。只要你的 Arduino IDE 已经安装了 ESP32 的板子支持包，直接编译就行。

如果还没装板子包，在 Arduino IDE → 工具 → 开发板管理器 里搜 `esp32`，安装 **Espressif Systems** 出的那个包（本文测试版本：**ESP32 Arduino Core 3.0.x**）。

------

## 完整代码

```cpp
#include <SPI.h>
#include <SD.h>

// 第一步：定义 SPI 引脚
static const int SD_MOSI = 5;   // 对应 SD 模块 CMD
static const int SD_MISO = 13;  // 对应 SD 模块 D0
static const int SD_SCK  = 14;  // 对应 SD 模块 CLK
static const int SD_CS   = 4;   // 对应 SD 模块 D3（片选）

SPIClass spi = SPIClass(FSPI);  // ESP32-S3 上用 FSPI 总线

// 递归列出目录里的所有文件和子文件夹
void listDir(fs::FS &fs, const char * dirname, uint8_t levels) {
  Serial.printf("正在列出目录：%s\n", dirname);

  File root = fs.open(dirname);
  if (!root) {
    Serial.println("打开目录失败，检查接线或 SD 卡格式");
    return;
  }
  if (!root.isDirectory()) {
    Serial.println("这不是一个目录");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      Serial.print("  [文件夹] ");
      Serial.println(file.name());
      if (levels) {
        listDir(fs, file.path(), levels - 1);  // 递归进子目录
      }
    } else {
      Serial.print("  [文件]   ");
      Serial.print(file.name());
      Serial.print("    大小：");
      Serial.print(file.size());
      Serial.println(" bytes");
    }
    file = root.openNextFile();
  }
}

// 打印 SD 卡基本信息
void printCardInfo() {
  uint8_t cardType = SD.cardType();

  if (cardType == CARD_NONE) {
    Serial.println("没有检测到 SD 卡，检查接线和供电");
    return;
  }

  Serial.print("SD 卡类型：");
  if      (cardType == CARD_MMC)  Serial.println("MMC");
  else if (cardType == CARD_SD)   Serial.println("SDSC");
  else if (cardType == CARD_SDHC) Serial.println("SDHC（标准大容量）");
  else                            Serial.println("未知类型");

  uint64_t cardSize   = SD.cardSize()   / (1024 * 1024);
  uint64_t totalBytes = SD.totalBytes() / (1024 * 1024);
  uint64_t usedBytes  = SD.usedBytes()  / (1024 * 1024);

  Serial.printf("SD 卡容量：%llu MB\n", cardSize);
  Serial.printf("可用空间：%llu MB\n",  totalBytes);
  Serial.printf("已用空间：%llu MB\n",  usedBytes);
}

void setup() {
  Serial.begin(115200);
  delay(1500);  // 等串口稳定

  Serial.println();
  Serial.println("=== ESP32-S3 SD SPI Test ===");
  Serial.printf("MOSI=%d, MISO=%d, SCK=%d, CS=%d\n",
                SD_MOSI, SD_MISO, SD_SCK, SD_CS);

  // 第二步：初始化 SPI 总线，指定引脚顺序：SCK, MISO, MOSI, CS
  spi.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // 第三步：先把 CS 拉高，避免初始化时误选中 SD 卡
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  // 第四步：挂载 SD 卡，初始时钟 10MHz（不稳定可降到 4MHz）
  if (!SD.begin(SD_CS, spi, 10000000)) {
    Serial.println("SD 卡挂载失败！按以下顺序排查：");
    Serial.println("1. 接线 GPIO5→CMD / GPIO13→D0 / GPIO14→CLK / GPIO4→D3");
    Serial.println("2. 供电确认是 3.3V，不是 5V");
    Serial.println("3. SD 卡格式化成 FAT32");
    Serial.println("4. 把 10000000 改成 4000000，降低 SPI 频率再试");
    return;
  }

  Serial.println("SD 卡挂载成功！");
  printCardInfo();

  // 第五步：列出根目录下 5 层文件结构
  listDir(SD, "/", 5);
}

void loop() {
  // 文件读取只在 setup 里做一次，loop 暂时留空
  // 如需定时轮询，可在这里加 delay + listDir
}
```




### 文件操作扩展示例

跑通主程序之后，光列文件还不够用。下面这些函数**不修改主程序**， 只需要把它们贴在主程序的 `listDir()` 函数旁边， 然后在 `setup()` 末尾按需调用即可， 覆盖**读 / 写 / 追加 / 创建 / 删除 / 重命名**所有常用操作。

#### 写文件 · 覆盖与追加

`FILE_WRITE` 模式会清空原文件后写入，`FILE_APPEND` 模式会从文件末尾追加。 做日志记录、传感器数据采集，几乎都用 **追加模式**。

```
// === 写文件（覆盖写入）===
// 如果文件不存在则创建，如果已存在则清空原内容后写入
void writeFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("写入文件：%s\n", path);

  File file = fs.open(path, FILE_WRITE);  // FILE_WRITE 模式：覆盖
  if (!file) {
    Serial.println("打开文件失败（写入模式）");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ 写入成功");
  } else {
    Serial.println("❌ 写入失败");
  }
  file.close();  // 一定要关闭，否则数据可能没刷到卡上
}

// === 追加写入（不覆盖原内容）===
// 适合做日志：每次往文件尾部追加一行
void appendFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("追加内容到：%s\n", path);

  File file = fs.open(path, FILE_APPEND);  // FILE_APPEND 模式：追加
  if (!file) {
    Serial.println("打开文件失败（追加模式）");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ 追加成功");
  } else {
    Serial.println("❌ 追加失败");
  }
  file.close();
}

// 调用示例（写在 setup() 里 listDir 后面即可）：
// writeFile(SD, "/hello.txt", "Hello ESP32-S3 SD!\n");
// appendFile(SD, "/hello.txt", "这是追加的第二行\n");
```

💡性能提醒每次 `file.close()` 都会触发 SD 卡的物理写入，频繁开关文件会很慢。 如果是高频日志，建议保持 `File` 实例打开，**每写 N 行调用一次 `file.flush()`** 把缓冲刷到卡里。

#### 读文件 · 整体读 与 按行读

`readFile()` 适合小文件一次性读完；`readFileByLine()` 适合处理 CSV、配置文件等结构化文本。

```
// === 读文件（一次性读完，按字节打印）===
void readFile(fs::FS &fs, const char * path) {
  Serial.printf("读取文件：%s\n", path);

  File file = fs.open(path);  // 默认就是 FILE_READ 模式
  if (!file) {
    Serial.println("打开文件失败，文件可能不存在");
    return;
  }

  Serial.print("文件内容：");
  while (file.available()) {
    Serial.write(file.read());  // 逐字节读取并打印
  }
  Serial.println();
  file.close();
}

// === 按行读取（适合配置文件、CSV 数据）===
void readFileByLine(fs::FS &fs, const char * path) {
  Serial.printf("按行读取：%s\n", path);

  File file = fs.open(path);
  if (!file) {
    Serial.println("打开文件失败");
    return;
  }

  int lineNum = 1;
  while (file.available()) {
    String line = file.readStringUntil('\n');  // 读到换行符为止
    Serial.printf("第 %d 行：%s\n", lineNum++, line.c_str());
  }
  file.close();
}

// 调用示例：
// readFile(SD, "/hello.txt");
// readFileByLine(SD, "/config.txt");
```

ℹ️说明`file.available()` 返回剩余字节数；`file.readStringUntil('\n')` 会把换行符之前的内容一次性读成 `String`， 注意大文件别用 `String`，会爆内存，改用固定大小的 `char buf[128]` + `file.readBytesUntil()` 更安全。

#### 创建 / 删除 / 重命名

覆盖文件夹的创建删除、空文件创建、文件删除、重命名（也可用于"移动"）。

```
// === 创建文件夹 ===
void createDir(fs::FS &fs, const char * path) {
  Serial.printf("创建文件夹：%s\n", path);
  if (fs.mkdir(path)) {
    Serial.println("✅ 文件夹创建成功");
  } else {
    Serial.println("❌ 创建失败（可能已存在或父目录不存在）");
  }
}

// === 创建空文件 ===
// 直接用 FILE_WRITE 打开再关闭就会创建一个空文件
void createEmptyFile(fs::FS &fs, const char * path) {
  Serial.printf("创建空文件：%s\n", path);
  File file = fs.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("❌ 创建失败");
    return;
  }
  file.close();
  Serial.println("✅ 空文件创建成功");
}

// === 删除文件 ===
void deleteFile(fs::FS &fs, const char * path) {
  Serial.printf("删除文件：%s\n", path);
  if (fs.remove(path)) {
    Serial.println("✅ 删除成功");
  } else {
    Serial.println("❌ 删除失败（文件不存在或权限问题）");
  }
}

// === 删除文件夹（必须是空文件夹）===
void removeDir(fs::FS &fs, const char * path) {
  Serial.printf("删除文件夹：%s\n", path);
  if (fs.rmdir(path)) {
    Serial.println("✅ 文件夹删除成功");
  } else {
    Serial.println("❌ 删除失败（文件夹不为空或不存在）");
  }
}

// === 重命名 / 移动文件 ===
void renameFile(fs::FS &fs, const char * oldPath, const char * newPath) {
  Serial.printf("重命名：%s → %s\n", oldPath, newPath);
  if (fs.rename(oldPath, newPath)) {
    Serial.println("✅ 重命名成功");
  } else {
    Serial.println("❌ 重命名失败");
  }
}

// 调用示例（按顺序执行可演示完整流程）：
// createDir(SD, "/logs");
// createEmptyFile(SD, "/logs/empty.txt");
// renameFile(SD, "/logs/empty.txt", "/logs/data.txt");
// deleteFile(SD, "/logs/data.txt");
// removeDir(SD, "/logs");
```

⚠️注意`SD.rmdir()` **只能删空文件夹**。如果要递归删除整个目录，需要先遍历删掉里面所有文件， 再删文件夹本身，`SD.h` 库没有内置 `rm -rf`，需要自己写递归函数。

------

### 代码说明

**为什么 CMD 对应 MOSI？**
 SD 卡在 SPI 模式下，ESP32 发给卡的数据走的就是 CMD 引脚，所以 CMD = MOSI。这是 SD 协议 SPI 模式的硬性规定，不是接错了。

**为什么 D0 对应 MISO？**
 SPI 模式下，SD 卡把数据回传给主机走 D0 引脚，所以 D0 = MISO。

**为什么 D3 对应 CS？**
 SD 卡进入 SPI 模式后，D3 承担片选（Chip Select）功能，低电平时卡被激活。

**为什么 D1、D2 不接？**
 它们是 4-bit SDIO 模式专用，SPI 模式用不到，空着就行。

**`SPIClass spi = SPIClass(FSPI)` 是什么意思？**
 ESP32-S3 有多个 SPI 总线（FSPI / HSPI），这里手动指定用 FSPI，避免和其他外设冲突。

------

## 常见问题排查

别慌，90% 的初始化失败都出在这几个地方，按顺序查一遍基本能解决：

**1. Serial.println 卡在"SD 卡挂载失败"不动？**
 先确认接线：GPIO5→CMD、GPIO13→D0、GPIO14→CLK、GPIO4→D3，任何一根接错都会失败。

**2. 接线没问题，还是失败？**
 把 SPI 频率从 10MHz 降到 4MHz，改这一行：

```cpp
if (!SD.begin(SD_CS, spi, 4000000)) {
```

32G 卡对时序更挑剔，低频率更容易跑通，跑通后再慢慢往上提。

**3. 串口根本没有任何输出？**
 检查串口波特率是不是 115200，以及 USB 线有没有数据传输能力（纯充电线不行）。

**4. 偶发挂载失败，时好时坏？**
 供电问题。导线太长、接触不良都会导致 SD 卡初始化时电压抖动，尝试缩短杜邦线、换质量好一点的线。

**5. 32G 卡挂载失败，换 8G 就好了？**
 32G 卡通常是 SDHC 格式，需要格式化成 FAT32（Windows 默认给 32G 卡格式化成 exFAT，ESP32 的 `SD.h` 不支持 exFAT）。可以用 [SD Card Formatter](https://www.sdcard.org/downloads/formatter/) 格式化。

**6. 挂载成功但 listDir 没有输出任何文件？**
 SD 卡可能是空的，或者根目录文件全在隐藏文件夹里。往卡里放一个 txt 文件再测试。

------

## FAQ

**Q：我的 SD 卡模块是 5V 供电的，能接 ESP32-S3 吗？**
 A：不建议。ESP32-S3 的 GPIO 是 3.3V 逻辑，如果模块没有做电平转换，信号线直接接 5V 模块会导致引脚损坏。确认模块支持 3.3V 工作电压，或者买带电平转换芯片的模块。

**Q：SPI 频率设多少合适？**
 A：从 4000000（4MHz）开始，能跑通再试 10000000（10MHz）。理论上 SD 卡 SPI 模式最高支持 25MHz，但受杜邦线长度和模块质量影响，实际跑不了那么高。

**Q：ESP32-S3 的哪些 GPIO 可以替换接 SD 卡？**
 A：ESP32-S3 的 FSPI 支持自定义引脚，理论上大多数 GPIO 都可以用，但建议避开 GPIO0（Boot 模式引脚）、GPIO45/GPIO46（有固定功能）。换引脚后记得同步修改代码里的 `SD_MOSI / SD_MISO / SD_SCK / SD_CS` 常量。

**Q：32G 的 SD 卡必须格式化 FAT32 吗？不能用 exFAT？**
 A：Arduino 的 `SD.h` 库只支持 FAT16 和 FAT32，不支持 exFAT。32G 及以下的卡格式化成 FAT32 没有问题，推荐用 SD Card Formatter 工具，不要用 Windows 自带的格式化（它会给 32G 卡默认 exFAT）。

**Q：SD 卡读写速度大概是多少？**
 A：SPI 模式下实际吞吐量大约在 500KB/s～2MB/s 之间，取决于 SPI 时钟频率和卡的速度等级。如果需要更高速度，可以考虑 SDIO 4-bit 模式（需要换接法，不在本文范围内）。

**Q：可以同时挂载多张 SD 卡吗？**
 A：可以。SPI 总线支持多设备，每张卡用不同的 CS 引脚，分别初始化成不同的 `SD` 实例即可。不过 `SD.h` 只支持单实例，多卡需要换用 `SD_MMC.h` 或第三方库 SdFat。

**Q：ESP32-S3 运行这段代码，CPU 占用高吗？**
 A：不高。文件列表操作是一次性的 I/O，`setup()` 执行完就结束，`loop()` 是空的，CPU 几乎不占用。如果你在 `loop()` 里持续读写文件，才需要关注性能。

------

## 延伸玩法

跑通了基础读取之后，这些方向可以继续探索：

- **从 SD 卡播放 MP3**：配合 ESP32-audioI2S 库，接上 I2S DAC，从 SD 卡读音频文件，告别网络卡顿
- **数据采集存储**：传感器数据按时间戳写入 CSV，掉电不丢，方便后续用 Python 分析
- **接 TFT 屏幕**：读取 SD 卡里的图片（BMP / JPG），显示在屏幕上，做一个简易相框
- **配置文件读取**：把 Wi-Fi 账号密码写在 SD 卡的 `config.json` 里，代码不用每次修改再烧录

------

## 参考资料

- [Espressif ESP32-S3 技术规格书](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [SD Specifications Part 1: Physical Layer Simplified Specification（SD 协会官方文档）](https://www.sdcard.org/downloads/pls/)
- [ESP32 Arduino Core 官方 GitHub](https://github.com/espressif/arduino-esp32)
- [SD Card Formatter 下载（官方格式化工具）](https://www.sdcard.org/downloads/formatter/)
- [Arduino SD 库文档](https://www.arduino.cc/reference/en/libraries/sd/)
