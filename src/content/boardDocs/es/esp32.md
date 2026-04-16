---
boardId: esp32
---

ESP32 es un microcontrolador con Wi-Fi y Bluetooth de bajo coste y bajo consumo, desarrollado por Espressif. Se ha convertido en uno de los chips más populares del mundo del Internet de las Cosas (IoT).

## Visión general del chip

El ESP32 integra un microprocesador Xtensa de doble núcleo de 32 bits LX6, con una frecuencia de reloj de hasta 240 MHz. Cuenta con 448 KB de ROM y 520 KB de SRAM internos, además de 16 KB de SRAM RTC para asegurar un funcionamiento estable del sistema.

## Comunicación inalámbrica

### Wi-Fi
- Compatible con el protocolo 802.11 b/g/n
- Velocidad de transmisión de datos de hasta 150 Mbps (en modo 802.11n)
- Soporta agregación A-MPDU y A-MSDU para mayor eficiencia de transmisión
- Rango de frecuencias del canal central: 2412 ~ 2484 MHz

### Bluetooth
- Estándar Bluetooth V4.2, compatible con Bluetooth clásico (BR/EDR) y Bluetooth de bajo consumo (BLE)
- Niveles de transmisión Class-1, Class-2 y Class-3
- Soporta salto de frecuencia adaptativo (AFH)
- Soporta códecs de audio CVSD y SBC

## Almacenamiento y pines

### Opciones de almacenamiento
- SPI Flash: disponible en 4/8/16 MB
- PSRAM: algunos modelos incluyen 2 MB de PSRAM interno (por ejemplo, ESP32-D0WDR2-V3)

### Pines GPIO
- Hasta 26 pines GPIO (de los cuales 5 son pines de strapping)
- Compatible con múltiples interfaces de periféricos y funciones

## Amplio soporte de periféricos

El ESP32 ofrece una rica variedad de interfaces periféricas, que incluyen:
- **Interfaces de comunicación**: tarjeta SD, UART, SPI, SDIO, I2C, I2S, TWAI (compatible con CAN 2.0)
- **PWM**: LED PWM y PWM para motores
- **Otros**: emisor de infrarrojos (IR), contador de pulsos, sensor táctil capacitivo, ADC, DAC

## Alimentación y entorno de trabajo

- **Voltaje de operación**: 3.0 ~ 3.6 V
- **Temperatura de operación**:
  - Versión estándar: -40 ~ 85 °C
  - Versión de alta temperatura: -40 ~ 105 °C (solo para módulos con Flash de 4/8 MB integrado)

## Configuración de antena

- **ESP32-WROOM-32E**: antena PCB integrada en la placa
- **ESP32-WROOM-32UE**: conector para antena externa

## Casos de uso

El ESP32 es adecuado para una gran variedad de aplicaciones IoT, incluyendo:
- Dispositivos para el hogar inteligente
- Automatización industrial
- Dispositivos wearables
- Monitorización ambiental
- Sistemas de control remoto
- Proyectos DIY y aprendizaje de desarrollo
