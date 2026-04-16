---
boardId: esp32
---

ESP32 è un microcontrollore con Wi-Fi e Bluetooth dual-mode, prodotto da Espressif a basso costo e basso consumo. Nel mondo dell'IoT (Internet of Things) è praticamente onnipresente — se hai un dispositivo smart a casa, c'è una buona probabilità che dentro ci sia un ESP32.

## Panoramica del chip

L'ESP32 monta un processore Xtensa dual-core a 32 bit LX6 con frequenza fino a 240 MHz — niente male per un chip così piccolo. Include 448 KB di ROM e 520 KB di SRAM integrati, oltre a 16 KB di RTC SRAM per garantire il funzionamento stabile del sistema anche nelle situazioni più critiche.

## Capacità di comunicazione wireless

### Wi-Fi
- Supporta il protocollo 802.11 b/g/n
- Velocità di trasmissione dati fino a 150 Mbps (in modalità 802.11n)
- Supporta l'aggregazione A-MPDU e A-MSDU per migliorare l'efficienza di trasmissione
- Range di frequenza del canale operativo: 2412 ~ 2484 MHz

### Bluetooth
- Standard Bluetooth V4.2, supporta sia il Bluetooth classico (BR/EDR) che il Bluetooth a basso consumo (BLE)
- Livelli di trasmettitore Class-1, Class-2 e Class-3
- Supporta il frequency hopping adattivo (AFH)
- Supporta codec audio CVSD e SBC

## Memoria e pin

### Opzioni di memoria
- SPI Flash: disponibile in varianti da 4/8/16 MB
- PSRAM: alcuni modelli integrano 2 MB di PSRAM (ad esempio ESP32-D0WDR2-V3)

### Pin GPIO
- Fino a 26 pin GPIO (di cui 5 sono pin di strapping)
- Supporta diverse interfacce periferiche e funzionalità

## Ricco supporto di periferiche

L'ESP32 offre un set di interfacce periferiche davvero impressionante, tra cui:
- **Interfacce di comunicazione**: scheda SD, UART, SPI, SDIO, I2C, I2S, TWAI (compatibile con CAN 2.0)
- **PWM**: LED PWM e PWM per motori
- **Altro**: trasmettitore a infrarossi (IR), contatore di impulsi, sensori touch capacitivi, ADC, DAC

## Alimentazione e ambiente operativo

- **Tensione di funzionamento**: 3.0 ~ 3.6 V
- **Temperatura di funzionamento**:
  - Versione standard: -40 ~ 85 °C
  - Versione ad alta temperatura: -40 ~ 105 °C (solo per moduli con Flash integrata da 4/8 MB)

## Configurazione dell'antenna

- **ESP32-WROOM-32E**: antenna PCB integrata sul modulo
- **ESP32-WROOM-32UE**: connettore per antenna esterna

## Casi d'uso

L'ESP32 è adatto a tutte le applicazioni IoT che ti vengono in mente, tra cui:
- Dispositivi per la smart home
- Automazione industriale
- Dispositivi indossabili
- Monitoraggio ambientale
- Sistemi di controllo remoto
- Progetti fai-da-te e sviluppo educativo
