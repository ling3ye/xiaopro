---
boardId: esp32
---

ESP32 ist ein kostenguenstiger, stromsparender Wi-Fi- und Bluetooth-Mikrocontroller des Herstellers Espressif. Er wird im Bereich Internet of Things (IoT) vielfach eingesetzt.

## Chip-Ueberblick

Der ESP32 integriert einen Xtensa-Dual-Core-32-Bit-LX6-Mikroprozessor mit bis zu 240 MHz Taktfrequenz und bietet damit beachtliche Leistung. Onboard befinden sich 448 KB ROM und 520 KB SRAM sowie zusaetzlich 16 KB RTC SRAM fuer einen stabilen Systembetrieb.

## Drahtlose Kommunikation

### Wi-Fi
- Unterstuetzt 802.11 b/g/n
- Datenraten bis zu 150 Mbps (im 802.11n-Modus)
- A-MPDU- und A-MSDU-Aggregation fuer verbesserte Uebertragungseffizienz
- Kanalfrequenzbereich: 2412 ~ 2484 MHz

### Bluetooth
- Bluetooth V4.2 mit Classic Bluetooth (BR/EDR) und Bluetooth Low Energy (BLE)
- Class-1, Class-2 und Class-3 Sendeleistungsstufen
- Adaptive Frequency Hopping (AFH)
- CVSD- und SBC-Audio-Codec-Unterstuetzung

## Speicher und Pins

### Speicheroptionen
- SPI Flash: verfuegbar mit 4/8/16 MB
- PSRAM: einige Varianten mit integriertem 2 MB PSRAM (z. B. ESP32-D0WDR2-V3)

### GPIO-Pins
- Bis zu 26 GPIO-Pins (davon 5 Strapping-Pins)
- Unterstuetzung fuer vielfaeltige Peripherieschnittstellen und Funktionen

## Umfangreiche Peripherie-Unterstuetzung

Der ESP32 bietet eine reichhaltige Auswahl an Peripherieschnittstellen:
- **Kommunikationsschnittstellen**: SD-Karte, UART, SPI, SDIO, I2C, I2S, TWAI (CAN 2.0 kompatibel)
- **PWM**: LED PWM und Motor PWM
- **Weitere**: IR-Sender, Impulszaehler, kapazitive Touch-Sensoren, ADC, DAC

## Spannungsversorgung und Betriebsbedingungen

- **Betriebsspannung**: 3,0 ~ 3,6 V
- **Betriebstemperatur**:
  - Standardvariante: -40 ~ 85 °C
  - Hochtemperaturvariante: -40 ~ 105 °C (nur Module mit integriertem 4/8 MB Flash)

## Antennenkonfiguration

- **ESP32-WROOM-32E**: Onboard-PCB-Antenne
- **ESP32-WROOM-32UE**: Externe Antenne ueber Steckverbinder

## Einsatzbereiche

Der ESP32 eignet sich fuer vielfaeltige IoT-Anwendungen:
- Smart-Home-Geraete
- Industrieautomation
- Wearables
- Umweltueberwachung
- Fernsteuerungssysteme
- DIY-Projekte und Lernplattformen
