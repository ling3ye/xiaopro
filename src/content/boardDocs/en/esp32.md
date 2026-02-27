---
boardId: esp32
---

The ESP32 is a low-cost, low-power Wi-Fi and Bluetooth dual-mode microcontroller chip introduced by Espressif, widely used in the Internet of Things (IoT) field.

## Chip Overview

The ESP32 integrates an Xtensa dual-core 32-bit LX6 microprocessor with a clock frequency of up to 240 MHz, providing powerful performance. The chip includes 448 KB ROM and 520 KB SRAM, along with 16 KB RTC SRAM for stable system operation.

## Wireless Communication Capabilities

### Wi-Fi
- Supports 802.11 b/g/n protocol
- Data transfer rate up to 150 Mbps (802.11n mode)
- Supports A-MPDU and A-MSDU aggregation for improved transmission efficiency
- Operating channel center frequency range: 2412 ~ 2484 MHz

### Bluetooth
- Bluetooth V4.2 standard, supporting both Classic Bluetooth (BR/EDR) and Low Energy Bluetooth (BLE)
- Class-1, class-2, and class-3 transmitter levels
- Supports Adaptive Frequency Hopping (AFH)
- Supports CVSD and SBC audio codecs

## Storage and Pins

### Storage Options
- SPI Flash: Optional 4/8/16 MB
- PSRAM: 2 MB PSRAM built-in on some models (e.g., ESP32-D0WDR2-V3)

### GPIO Pins
- Up to 26 GPIO pins (5 are strapping pins)
- Supports various peripheral interfaces and functions

## Rich Peripheral Support

The ESP32 provides abundant peripheral interfaces, including:
- **Communication Interfaces**: SD Card, UART, SPI, SDIO, I2C, I2S, TWAI (CAN 2.0 compatible)
- **PWM**: LED PWM and Motor PWM
- **Others**: Infrared (IR), Pulse Counter, Capacitive Touch Sensor, ADC, DAC

## Power and Operating Environment

- **Operating Voltage**: 3.0 ~ 3.6 V
- **Operating Temperature**:
  - Standard version: -40 ~ 85 °C
  - High-temperature version: -40 ~ 105 °C (only for modules with 4/8 MB Flash)

## Antenna Configuration

- **ESP32-WROOM-32E**: On-board PCB antenna
- **ESP32-WROOM-32UE**: External antenna via connector

## Applications

The ESP32 is suitable for various IoT applications, including:
- Smart home devices
- Industrial automation
- Wearable devices
- Environmental monitoring
- Remote control systems
- DIY projects and learning development
