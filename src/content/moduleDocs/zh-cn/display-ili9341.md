---
moduleId: display/ili9341
---

## 元件说明

![2.4-tft-uno-display](https://img.lingshunlab.com/2.4-tft-uno-display.jpg?imageView2/0/q/75|watermark/2/text/TGluZ1NodW5sYWIuY29tIOWHjOmhuuWunumqjOWupA==/font/5b6u6L2v6ZuF6buR/fontsize/260/fill/IzAwMDAwMA==/dissolve/66/gravity/SouthEast/dx/10/dy/10|imageslim)

### 产品特点

- 支持ArduinoUNO 和Mega2560等开发板直插使用，无需接线，简单方便
- 320X240分辨率，显示效果清晰，支持触摸功能
- 支持16位RGB 65K颜色显示，显示色彩丰富
- 采用8位并行总线，比串口SPI刷新快
- 板载 5V/3.3V 电平转换 IC，兼容 5V/3.3V 工作电压
- 带SD卡槽方便扩展实验
- 提供Arduino库，提供丰富的示例程序
- 军工级工艺标准，长期稳定工作
- 提供底层驱动技术支持

### 技术规格

| 名称 | 参数 |
|--------|--------|
| 显示颜色 | RGB 65K彩色 |
| SKU | MAR2406 |
| 尺寸 | 2.4(inch) |
| 类型 | TFT |
| 驱动芯片 | ILI9341 |
| 分辨率 | 320*240 (Pixel) |
| 模块接口 | 8-bit parallel interface |
| 有效显示区域 | 48.96*36.72(mm) |
| 模块PCB尺寸 | 72.20*52.7(mm) |
| 工作温度 | -20℃~60℃ |
| 存储温度 | -30℃~70℃ |
| 工作电压 | 5V/3.3V |
| 产品重量(含包装) | 39(g) |

<div style="height:6em"></div>

## 引脚说明

| Pin Label | Pin Description |
|-----------|-----------------|
| LCD_RST | LCD bus reset signal, low level reset<br>LCD总线复位信号，低电平复位 |
| LCD_CS | LCD bus chip select signal, low level enable<br>LCD总线片选信号，低电平使能 |
| LCD_RS | LCD bus command / data selection signal,low level: command, high level: data<br>LCD总线命令/数据选择信号，低电平：命令，高电平：数据 |
| LCD_WR | LCD bus write signal<br>LCD总线写信号 |
| LCD_RD | LCD bus read signal<br>LCD总线读信号 |
| GND | Power ground<br>电源地 |
| 5V | 5V power input<br>5V电源输入 |
| 3V3 | 3.3V power input, this pin can be disconnected<br>3.3V电源输入，此引脚可不接 |
| LCD_D0 | LCD 8-bit data Bit0<br>LCD 8位数据Bit0 |
| LCD_D1 | LCD 8-bit data Bit1<br>LCD 8位数据Bit1 |
| LCD_D2 | LCD 8-bit data Bit2<br>LCD 8位数据Bit2 |
| LCD_D3 | LCD 8-bit data Bit3<br>LCD 8位数据Bit3 |
| LCD_D4 | LCD 8-bit data Bit4<br>LCD 8位数据Bit4 |
| LCD_D5 | LCD 8-bit data Bit5<br>LCD 8位数据Bit5 |
| LCD_D6 | LCD 8-bit data Bit6<br>LCD 8位数据Bit6 |
| LCD_D7 | LCD 8-bit data Bit7<br>LCD 8位数据Bit7 |
| SD_SS | SD card SPI bus chip select signal, low level enable<br>SD卡SPI总线片选信号，低电平使能 |
| SD_DI | SD card SPI bus MOSI signal<br>SD卡SPI总线MOSI信号 |
| SD_DO | SD card SPI bus MISO signal<br>SD卡SPI总线MISO信号 |
| SD_SCK | SD card SPI bus clock signal<br>SD卡SPI总线时钟信号 |

## 使用建议

1. **电源选择**：模块支持 5V 和 3.3V 双电压输入，根据开发板需求选择合适的电压
2. **Arduino直插**：该模块专为 Arduino UNO 和 Mega2560 设计，可直接插入使用，无需额外接线
3. **SD卡使用**：如需使用 SD 卡功能，确保正确连接 SPI 接口引脚
4. **触摸功能**：模块支持触摸，需要相应的触摸控制器和驱动代码

## 常见问题

**Q: 可以用在 ESP32 上吗？**
A: 可以，但 ESP32 不能直插使用，需要通过杜邦线连接 8 位并行总线接口。

**Q: 屏幕无显示怎么办？**
A: 检查电源连接是否正确，确认 LCD_RST 引脚已正确连接到开发板复位引脚，确保初始化代码正确执行。
