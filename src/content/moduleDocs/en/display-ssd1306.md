---
moduleId: display/ssd1306
---

# SSD1306 OLED Display Module

The SSD1306 is a widely used OLED display driver chip, commonly found in various small display modules. It supports monochrome graphics display and features ultra-low power consumption and high contrast.

## Key Features

- **Ultra-low Power Consumption**: Only a few microamps during normal operation, ideal for battery-powered devices
- **High Contrast**: Self-emitting technology with contrast far exceeding traditional LCD
- **Wide Viewing Angle**: Nearly 180-degree viewing angle with almost no visual dead zones
- **Fast Response**: Microsecond response time with no ghosting
- **Multiple Resolutions**: Supports 128x64, 128x32, 96x16 and other resolutions
- **Flexible Interfaces**: Supports I2C, SPI, 6800/8080 parallel interfaces

## Applications

- Smart wearables (watches, fitness bands)
- Portable instrument panels
- Electronic price tags
- IoT device status display
- DIY projects

## Technical Specifications

| Parameter | Value |
|-----------|-------|
| Driver Chip | SSD1306 |
| Display Color | Monochrome (Blue/White/Yellow) |
| Operating Voltage | 3.3V - 5V |
| Operating Temperature | -30°C ~ +70°C |
| Response Time | < 10μs |
| Refresh Rate | > 60fps |

## Usage Tips

1. **Power-up Sequence**: Ensure VCC is stable before connecting I2C/SPI signals
2. **Initialization**: A complete initialization sequence is required after each power-up
3. **Display Buffer**: SSD1306 requires external RAM as a display buffer
4. **Brightness Adjustment**: Brightness can be adjusted through precharge resistor settings

## FAQ

**Q: Why is the screen completely black?**
A: Check if the initialization sequence is complete, especially the display on command.

**Q: Why are there ghost images in the display?**
A: Adjust the precharge and set segment remap parameters appropriately.

**Q: What is the I2C address?**
A: Default address is 0x3C (SA0 grounded) or 0x3D (SA0 high).
