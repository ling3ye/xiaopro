---
moduleId: display/ili9341
---

## Component Description

![2.4-tft-uno-display](https://img.lingshunlab.com/2.4-tft-uno-display.jpg?imageView2/0/q/75|watermark/2/text/TGluZ1NodW5sYWIuY29tIOWHjOmhuuWunumqjOWupA==/font/5b6u6L2v6ZuF6buR/fontsize/260/fill/IzAwMDAwMA==/dissolve/66/gravity/SouthEast/dx/10/dy/10|imageslim)

### Product Features

- Direct plug-in support for Arduino UNO and Mega2560 boards, no wiring required, simple and convenient
- 320x240 resolution with clear display, supports touch function
- Supports 16-bit RGB 65K color display with rich colors
- Uses 8-bit parallel bus, faster refresh than serial SPI
- On-board 5V/3.3V level conversion IC, compatible with 5V/3.3V operating voltages
- Built-in SD card slot for easy expansion experiments
- Provides Arduino library with rich example programs
- Military-grade process standards for long-term stable operation
- Provides underlying driver technical support

### Technical Specifications

| Name | Parameter |
|------|-----------|
| Display Color | RGB 65K |
| SKU | MAR2406 |
| Size | 2.4 inch |
| Type | TFT |
| Driver Chip | ILI9341 |
| Resolution | 320*240 (Pixel) |
| Module Interface | 8-bit parallel interface |
| Active Display Area | 48.96*36.72 (mm) |
| Module PCB Size | 72.20*52.7 (mm) |
| Operating Temperature | -20℃~60℃ |
| Storage Temperature | -30℃~70℃ |
| Operating Voltage | 5V/3.3V |
| Product Weight (with packaging) | 39 (g) |

<div style="height:6em"></div>

## Pin Description

| Pin Label | Pin Description |
|-----------|-----------------|
| LCD_RST | LCD bus reset signal, low level reset |
| LCD_CS | LCD bus chip select signal, low level enable |
| LCD_RS | LCD bus command/data selection signal, low level: command, high level: data |
| LCD_WR | LCD bus write signal |
| LCD_RD | LCD bus read signal |
| GND | Power ground |
| 5V | 5V power input |
| 3V3 | 3.3V power input, this pin can be disconnected |
| LCD_D0 | LCD 8-bit data Bit0 |
| LCD_D1 | LCD 8-bit data Bit1 |
| LCD_D2 | LCD 8-bit data Bit2 |
| LCD_D3 | LCD 8-bit data Bit3 |
| LCD_D4 | LCD 8-bit data Bit4 |
| LCD_D5 | LCD 8-bit data Bit5 |
| LCD_D6 | LCD 8-bit data Bit6 |
| LCD_D7 | LCD 8-bit data Bit7 |
| SD_SS | SD card SPI bus chip select signal, low level enable |
| SD_DI | SD card SPI bus MOSI signal |
| SD_DO | SD card SPI bus MISO signal |
| SD_SCK | SD card SPI bus clock signal |

## Usage Tips

1. **Power Selection**: The module supports both 5V and 3.3V input. Choose the appropriate voltage based on your development board.
2. **Arduino Plug-in**: This module is designed specifically for Arduino UNO and Mega2560 and can be plugged in directly without additional wiring.
3. **SD Card Usage**: If using SD card functionality, ensure proper connection of SPI interface pins.
4. **Touch Function**: The module supports touch function, requiring appropriate touch controller and driver code.

## FAQ

**Q: Can this be used with ESP32?**
A: Yes, but ESP32 cannot plug in directly. You need to connect via jumper wires to the 8-bit parallel bus interface.

**Q: What to do if the screen has no display?**
A: Check if the power connection is correct, confirm that the LCD_RST pin is properly connected to the board's reset pin, and ensure initialization code is executed correctly.
