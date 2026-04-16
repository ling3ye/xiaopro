---
boardId: esp32
---

ESP32, c'est la petite merveille signée Espressif : une puce microcontrôleur Wi-Fi et Bluetooth double mode, à la fois économique et économe en énergie. Pas étonnant qu'elle soit partout dans le monde de l'IoT !

## Aperçu de la puce

Sous le capot, l'ESP32 embarque un microprocesseur double cœur Xtensa LX6 32 bits cadencé jusqu'à 240 MHz -- de quoi envoyer du lourd. La puce intègre 448 Ko de ROM et 520 Ko de SRAM, accompagnés de 16 Ko de RTC SRAM pour assurer un fonctionnement stable du système.

## Capacités de communication sans fil

### Wi-Fi
- Compatible 802.11 b/g/n
- Débit allant jusqu'à 150 Mbps (en mode 802.11n)
- Agrégation A-MPDU et A-MSDU pour une meilleure efficacité de transmission
- Plage de fréquences centrales des canaux : 2412 ~ 2484 MHz

### Bluetooth
- Norme Bluetooth V4.2, avec prise en charge du Bluetooth classique (BR/EDR) et du Bluetooth basse consommation (BLE)
- Niveaux d'émetteur Class-1, Class-2 et Class-3
- Saut de fréquence adaptatif (AFH)
- Codecs audio CVSD et SBC pris en charge

## Stockage et broches

### Options de stockage
- SPI Flash : 4/8/16 Mo au choix
- PSRAM : certains modèles intègrent 2 Mo de PSRAM (par exemple ESP32-D0WDR2-V3)

### Broches GPIO
- Jusqu'à 26 broches GPIO (dont 5 sont des broches de configuration « strapping »)
- Prise en charge de multiples interfaces et fonctionnalités de périphériques

## Des périphériques en veux-tu en voilà

L'ESP32 propose un riche ensemble d'interfaces périphériques, notamment :
- **Interfaces de communication** : carte SD, UART, SPI, SDIO, I2C, I2S, TWAI (compatible CAN 2.0)
- **PWM** : PWM pour LED et PWM pour moteurs
- **Autres** : émetteur infrarouge (IR), compteur d'impulsions, capteurs tactiles capacitifs, ADC, DAC

## Alimentation et environnement de fonctionnement

- **Tension de fonctionnement** : 3,0 ~ 3,6 V
- **Température de fonctionnement** :
  - Version standard : -40 ~ 85 °C
  - Version haute température : -40 ~ 105 °C (uniquement pour les modules avec Flash intégré de 4/8 Mo)

## Configuration de l'antenne

- **ESP32-WROOM-32E** : antenne PCB intégrée
- **ESP32-WROOM-32UE** : connexion d'une antenne externe via connecteur

## Cas d'utilisation

L'ESP32 convient à toutes sortes d'applications IoT, entre autres :
- Appareils pour la maison connectée
- Automatisation industrielle
- Dispositifs portables (wearables)
- Surveillance environnementale
- Systèmes de contrôle à distance
- Projets DIY et apprentissage du développement
