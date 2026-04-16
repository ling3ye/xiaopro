---
moduleId: display/ili9341
---

## Description du composant

![2.4-tft-uno-display](https://img.lingshunlab.com/2.4-tft-uno-display.jpg?imageView2/0/q/75|watermark/2/text/TGluZ1NodW5sYWIuY29tIOWHjOmhuuWunumqjOWupA==/font/5b6u6L2v6ZuF6buR/fontsize/260/fill/IzAwMDAwMA==/dissolve/66/gravity/SouthEast/dx/10/dy/10|imageslim)

### Caractéristiques du produit

- Compatible avec les cartes Arduino UNO et Mega2560 en insertion directe -- pas de câblage nécessaire, simple et pratique
- Résolution 320 x 240, affichage net, avec prise en charge tactile
- Affichage couleur RGB 16 bits (65 000 couleurs) pour un rendu coloré
- Bus parallèle 8 bits, rafraîchissement plus rapide qu'en SPI série
- Circuit intégré de conversion de niveau 5 V / 3,3 V embarqué, compatible avec les deux tensions de fonctionnement
- Slot pour carte SD intégré, pratique pour les expériences d'extension
- Bibliothèque Arduino fournie avec de nombreux exemples de programmes
- Norme de fabrication de grade militaire pour un fonctionnement stable sur le long terme
- Support technique pour les pilotes bas niveau

### Spécifications techniques

| Nom | Paramètre |
|--------|--------|
| Couleurs d'affichage | RGB 65K couleurs |
| Taille | 2,4 pouces |
| Type | TFT |
| Pilote | ILI9341 |
| Résolution | 320 x 240 (pixels) |
| Interface du module | Interface parallèle 8 bits |
| Zone d'affichage utile | 48,96 x 36,72 mm |
| Dimensions du PCB du module | 72,20 x 52,70 mm |
| Température de fonctionnement | -20 °C ~ 60 °C |
| Température de stockage | -30 °C ~ 70 °C |
| Tension de fonctionnement | 5 V / 3,3 V |
| Poids du produit (emballage inclus) | 39 g |

<div style="height:6em"></div>

## Description des broches

| Label de broche | Description de la broche |
|-----------|-----------------|
| LCD_RST | Signal de reset du bus LCD, reset à l'état bas<br>Signal de réinitialisation du bus LCD, réinitialisation au niveau bas |
| LCD_CS | Signal de sélection de puce du bus LCD, activé à l'état bas<br>Signal de sélection de puce du bus LCD, activation au niveau bas |
| LCD_RS | Signal de sélection commande / données du bus LCD, niveau bas : commande, niveau haut : données<br>Signal de sélection commande/données du bus LCD, niveau bas : commande, niveau haut : données |
| LCD_WR | Signal d'écriture du bus LCD<br>Signal d'écriture du bus LCD |
| LCD_RD | Signal de lecture du bus LCD<br>Signal de lecture du bus LCD |
| GND | Masse<br>Masse de l'alimentation |
| 5V | Entrée d'alimentation 5 V<br>Entrée d'alimentation 5 V |
| 3V3 | Entrée d'alimentation 3,3 V, cette broche peut rester non connectée<br>Entrée d'alimentation 3,3 V, cette broche peut ne pas être connectée |
| LCD_D0 | Bit 0 des données 8 bits du LCD<br>Bit 0 des données 8 bits du LCD |
| LCD_D1 | Bit 1 des données 8 bits du LCD<br>Bit 1 des données 8 bits du LCD |
| LCD_D2 | Bit 2 des données 8 bits du LCD<br>Bit 2 des données 8 bits du LCD |
| LCD_D3 | Bit 3 des données 8 bits du LCD<br>Bit 3 des données 8 bits du LCD |
| LCD_D4 | Bit 4 des données 8 bits du LCD<br>Bit 4 des données 8 bits du LCD |
| LCD_D5 | Bit 5 des données 8 bits du LCD<br>Bit 5 des données 8 bits du LCD |
| LCD_D6 | Bit 6 des données 8 bits du LCD<br>Bit 6 des données 8 bits du LCD |
| LCD_D7 | Bit 7 des données 8 bits du LCD<br>Bit 7 des données 8 bits du LCD |
| SD_SS | Signal de sélection de puce du bus SPI de la carte SD, activé à l'état bas<br>Signal de sélection de puce du bus SPI de la carte SD, activation au niveau bas |
| SD_DI | Signal MOSI du bus SPI de la carte SD<br>Signal MOSI du bus SPI de la carte SD |
| SD_DO | Signal MISO du bus SPI de la carte SD<br>Signal MISO du bus SPI de la carte SD |
| SD_SCK | Signal d'horloge du bus SPI de la carte SD<br>Signal d'horloge du bus SPI de la carte SD |

## Conseils d'utilisation

1. **Choix de l'alimentation** : le module accepte une double tension d'entrée (5 V et 3,3 V). Choisissez la tension appropriée selon les besoins de votre carte de développement.
2. **Insertion directe Arduino** : ce module est conçu pour l'Arduino UNO et le Mega2560. Il suffit de l'insérer directement, sans câblage supplémentaire.
3. **Utilisation de la carte SD** : si vous souhaitez utiliser la fonctionnalité carte SD, assurez-vous de connecter correctement les broches de l'interface SPI.
4. **Fonctionnalité tactile** : le module prend en charge le tactile, mais nécessite un contrôleur tactile et le code de pilote correspondant.

## Questions fréquentes

**Q : Peut-on l'utiliser avec un ESP32 ?**
R : Oui, mais l'ESP32 ne permet pas l'insertion directe -- il faut connecter l'interface parallèle 8 bits avec des fils Dupont.

**Q : L'écran n'affiche rien, que faire ?**
R : Vérifiez que l'alimentation est correctement branchée, confirmez que la broche LCD_RST est bien reliée à la broche de reset de votre carte de développement, et assurez-vous que le code d'initialisation s'exécute correctement.
