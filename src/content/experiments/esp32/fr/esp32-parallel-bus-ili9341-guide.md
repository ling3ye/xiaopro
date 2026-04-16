---
title: "Piloter un ecran ILI9341 avec l'ESP32 via un bus parallele 8 bits"
boardId: esp32
moduleId: display/tft204-ili9341
category: esp32
date: 2026-02-27
intro: "Guide detaille pour utiliser l'ESP32 afin de piloter un ecran ILI9341 via un bus parallele 8 bits. Comparativement au SPI serie, le mode parallele offre un taux de rafraichissement extremement eleve, parfait pour l'affichage de contenus dynamiques."
image: "https://img.lingshunlab.com/image-20260204140130062.png"
---

Ce guide vous explique en detail comment utiliser un **ESP32** pour piloter un ecran **ILI9341** via un **bus parallele 8 bits (8-bit Parallel)**. Comparativement au classique SPI serie, le mode parallele offre un taux de rafraichissement nettement superieur, ce qui le rend parfait pour afficher des images animees ou des interfaces dynamiques.

## Environnement de developpement

OS : MacOS

Arduino IDE Version : 2.3.7

esp32 Version : 3.3.5

TFT_eSPI Version : 2.5.43



## BOM

ESP32 x1

Ecran TFT 2.4 pouces x1

Cables Dupont xN



## Câblage

| Broche TFT      | **Broche ESP32** | **Description**                                            |
| --------------- | ---------------- | ---------------------------------------------------------- |
| **VCC (3V3/5V)** | **3V3 / VIN**   | Alimentation de l'ecran (essayez d'abord 3.3V)            |
| **GND**         | **GND**          | Masse commune                                              |
| **LCD_D0**      | **GPIO 26**      | Bit de donnees 0                                           |
| **LCD_D1**      | **GPIO 25**      | Bit de donnees 1                                           |
| **LCD_D2**      | **GPIO 19**      | Bit de donnees 2                                           |
| **LCD_D3**      | **GPIO 18**      | Bit de donnees 3                                           |
| **LCD_D4**      | **GPIO 5**       | Bit de donnees 4                                           |
| **LCD_D5**      | **GPIO 21**      | Bit de donnees 5                                           |
| **LCD_D6**      | **GPIO 22**      | Bit de donnees 6                                           |
| **LCD_D7**      | **GPIO 23**      | Bit de donnees 7                                           |
| **LCD_CS**      | **GPIO 32**      | Chip Select (Selection de puce)                            |
| **LCD_RTS**     | **GPIO 33**      | Reset (Reinitialisation)                                   |
| **LCD_RS (DC)** | **GPIO 14**      | Data/Command (Selection de registre)                       |
| **LCD_WR**      | **GPIO 27**      | Write Control (Commande d'ecriture)                        |
| **LCD_RD**      | **GPIO 2**       | Read Control (si pas besoin de lire l'ID, brancher sur 3.3V) |




## Bibliotheques requises

### Arduino IDE Boards Manager : esp32

Il faut absolument installer la bibliotheque esp32 d'Espressif Systems. Ici on utilise la derniere version disponible.

### Arduino IDE Library Manager : TFT_eSPI

Il faut egalement installer la bibliotheque TFT_eSPI.



## Configuration TFT_eSPI : fichier « User_Setup.h »

TFT_eSPI est l'outil incontournable pour piloter des ecrans avec l'ESP32. Le probleme, c'est que la definition des broches, du type de carte et du type d'ecran se fait toute dans ce fameux fichier `User_Setup.h`. Du coup, le modifier correctement est absolument crucial.

Ce fichier se trouve ici :

Documents > Arduino > libraries > TFT_eSPI > User_Setup.h

**Operation :** Ouvrez le fichier, effacez tout son contenu, puis collez et sauvegardez le code suivant :

```c++
// =========================================================================
//   User_Setup.h - Display driver configuration file for TFT_eSPI library
//   User_Setup.h - Fichier de configuration du pilote d'affichage pour la bibliotheque TFT_eSPI
//
//   Hardware: ESP32 (No PSRAM or not using GPIO 16/17)
//   Matriel : ESP32 (pas de PSRAM ou n'utilise pas GPIO 16/17)
//
//   Driver: ILI9341 (8-bit parallel mode)
//   Pilote : ILI9341 (mode parallele 8 bits)
// =========================================================================

// -------------------------------------------------------------------------
// 1. Driver Type Definition
//    Definition du type de pilote
// -------------------------------------------------------------------------
#define ILI9341_DRIVER       // Pilote generique ILI9341

// -------------------------------------------------------------------------
// 2. Color Order Definition
//    Definition de l'ordre des couleurs
// -------------------------------------------------------------------------
// If colors are inverted (e.g., red becomes blue), change this.
// Si les couleurs sont inversees (le rouge devient bleu par exemple), modifiez ceci.
#define TFT_RGB_ORDER TFT_BGR  // La plupart des ecrans ILI9341 utilisent l'ordre BGR
// #define TFT_RGB_ORDER TFT_RGB

// -------------------------------------------------------------------------
// 3. Screen Resolution
//    Resolution de l'ecran
// -------------------------------------------------------------------------
#define TFT_WIDTH  240
#define TFT_HEIGHT 320

// -------------------------------------------------------------------------
// 4. Interface Configuration (Critical)
//    Configuration de l'interface (partie critique)
// -------------------------------------------------------------------------
#define ESP32_PARALLEL       // Activer le mode parallele ESP32
#define TFT_PARALLEL_8_BIT   // Utiliser le bus parallele 8 bits

// -------------------------------------------------------------------------
// 5. Pin Definitions
//    Definition des broches
// -------------------------------------------------------------------------

// --- Broches de controle ---
// Optimization: CS/RST moved to GPIO 32+, keeping low GPIOs for data bus and WR.
// Optimisation : CS/RST deplaces sur GPIO 32+, pour garder les GPIO bas pour le bus de donnees et WR.

#define TFT_CS   32  // Chip Select (selection de puce)
#define TFT_RST  33  // Reset (reinitialisation)

// Data/Command selection - Must be in GPIO 0-31 (or RS)
// Selection Donnee/Commande - doit etre sur GPIO 0-31 (ou RS)
#define TFT_DC   14

// Write signal - Critical pin, must be in GPIO 0-31 and keep connections short
// Signal d'ecriture - broche critique, doit etre sur GPIO 0-31 et avec des connexions courtes
#define TFT_WR   27

// Read signal - If not reading screen data, can connect to 3.3V, but must be defined in library
// Signal de lecture - si vous ne lisez pas les donnees de l'ecran, peut etre branche sur 3.3V, mais doit etre defini dans la bibliotheque
#define TFT_RD    2

// --- Data Bus Pins D0 - D7 ---
// Must be within GPIO 0-31 range.
// Doivent etre dans la plage GPIO 0-31.
// Avoided GPIO 16, 17 (PSRAM/Flash) and 12 (Strap).
// GPIO 16, 17 (PSRAM/Flash) et 12 (Strap) evites.

#define TFT_D0   26
#define TFT_D1   25
#define TFT_D2   19
#define TFT_D3   18
#define TFT_D4    5  // Note : GPIO 5 est une broche Strap, assurez-vous que l'ecran ne la tire pas haut au demarrage
#define TFT_D5   21
#define TFT_D6   22
#define TFT_D7   23

// -------------------------------------------------------------------------
// 6. Backlight Control (Optional)
//    Controle du retroeclairage (optionnel)
// -------------------------------------------------------------------------
// If your screen has a BLK or LED pin, connect it to an ESP32 pin and define it here.
// Si votre ecran a une broche BLK ou LED, connectez-la a une broche ESP32 et definissez-la ici.
// #define TFT_BL   4            // Exemple : connecte au GPIO 4
// #define TFT_BACKLIGHT_ON HIGH // Niveau haut allume le retroeclairage

// -------------------------------------------------------------------------
// 7. Font Loading
//    Chargement des polices
// -------------------------------------------------------------------------
// Enable as needed; enabling more fonts consumes more Flash memory.
// Activez selon les besoins ; plus vous activez de polices, plus la memoire Flash est consommee.

#define LOAD_GLCD   // Font 1. Original Glcd font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts. Include access to the 48 Adafruit_GFX free fonts FF1 to FF48

#define SMOOTH_FONT // Activer le chargement des polices lissees

// -------------------------------------------------------------------------
// 8. Other Settings
//    Autres reglages
// -------------------------------------------------------------------------
// In parallel mode, SPI frequency is usually ignored as speed is determined by CPU register write speed.
// Kept here for compatibility.
// En mode parallele, la frequence SPI est generalement ignoree car la vitesse est determinee par la vitesse d'ecriture des registres du CPU.
// Conserve ici pour compatibilite.
#define SPI_FREQUENCY       27000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY  2500000

// --- Touch Screen Settings ---
// If you use XPT2046 touch function.
// Parallel screens usually have a separate SPI interface for touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).
// Si vous utilisez la fonction tactile XPT2046.
// Les ecrans paralleles ont generalement une interface SPI separee pour le tactile (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).

// If using touch, uncomment below and set pins (can use VSPI default pins).
// Si vous utilisez le tactile, decommentez ci-dessous et configurez les broches (vous pouvez utiliser les broches VSPI par defaut).

// #define TOUCH_CS 22
// WARNING: You used TFT_D6 on GPIO 22 above. If using touch, find another pin or use SoftSPI.
// ATTENTION : TFT_D6 utilise le GPIO 22 ci-dessus. Si vous utilisez le tactile, trouvez une autre broche ou utilisez un SPI logiciel.
```



## Ouvrir le programme d'exemple

Ouvrez le programme d'exemple via ce chemin. Ce programme permet de tester l'affichage :

Arduino IDE : File -> Examples -> TFT_eSPI -> 320 x 240 -> TFT_graphicstest_one_lib



## Televerser le programme : probleme de compilation

Si votre bibliotheque ESP32 a ete mise a jour en **version 3.0.0 ou superieure**, il y a de fortes chances que vous tombiez sur cette erreur en compilant TFT_eSPI :

```tex
In file included from /Users/shawn/Documents/Arduino/libraries/TFT_eSPI/TFT_eSPI.cpp:24:

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c: In member function 'uint8_t TFT_eSPI::readByte()':

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c:113:9: error: 'gpio_input_get' was not declared in this scope; did you mean 'gpio_num_t'?
113 |   reg = gpio_input_get(); // Read three times to allow for bus access time
|         ^~~~~~~~~~~~~~
|         gpio_num_t
exit status 1

Compilation error: exit status 1
```



`error: 'gpio_input_get' was not declared in this scope`

### Analyse de l'erreur

`gpio_input_get()` etait une macro ou fonction issue de l'ancien framework bas niveau ESP-IDF. Dans les versions recentes de l'**ESP32 Arduino Core 3.0.x**, Espressif a profondement refondu les API de bas niveau, supprimant ou modifiant de nombreuses anciennes fonctions. Du coup, quand TFT_eSPI appelle cette fonction, il ne la trouve plus et plante.

La solution la plus simple serait de retrograder la bibliotheque esp32 en version 2.0.x, c'est de loin la methode la moins prise de tete. Mais je vous propose une alternative : modifier directement la bibliotheque TFT_eSPI.

Trouvez et ouvrez ce fichier :

Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c

Ajoutez la macro suivante au debut du code, puis sauvegardez le fichier :

```c++
#if !defined(gpio_input_get)
  #define gpio_input_get() GPIO.in
#endif
```



## Televerser a nouveau : probleme d'image miroir

A ce stade, la compilation passe et le programme est bien televerse sur la carte. L'ecran s'allume, tout semble aller bien... mais pas si vite ! En regardant de plus pres, on s'apercit que le texte affiche a l'envers, comme dans un miroir.

Dans le programme d'exemple, j'ai fait une modification. Trouvez la ligne 102 environ du programme d'exemple :

```
void loop(void) {
  for (uint8_t rotation = 4; rotation < 8; rotation++) {
    tft.setRotation(rotation);
    testText();
    delay(2000);
  }
}
```



## Dernier televersement

Cette fois, l'image s'affiche correctement. Felicitations, vous avez reussi a allumer cet ecran TFT 2.4 pouces (ILI9341) !




## FAQ : Problemes courants

Voici les problemes les plus frequemment rencontres lors du developpement, pour vous servir de reference rapide.

### Q1 : L'ecran s'allume en blanc mais n'affiche rien ?

- **A1** : Dans 90 % des cas, c'est parce que le mode parallele n'est pas active. Verifiez une fois de plus que `#define ESP32_PARALLEL` est bien decommente dans `User_Setup.h`.
- **A2** : Verifiez que TFT_RST (GPIO 33) est bien branche et fait bon contact.

### Q2 : Les couleurs sont incorrectes, le rouge devient bleu ?

- **A** : C'est un probleme d'ordre RGB. Dans `User_Setup.h`, changez `#define TFT_RGB_ORDER TFT_RGB` en `TFT_BGR` (ou inversement).

### Q3 : Cette configuration supporte-t-elle le tactile ?

- **A** : Ce guide ne configure que le pilote d'affichage. Les ecrans ILI9341 sont generalement equipes d'une puce tactile XPT2046, qui utilise une interface SPI separee. Vous devez connecter les broches tactiles supplementaires (T_CLK, T_CS, T_DIN, T_DO, T_IRQ) et decommenter `TOUCH_CS` dans `User_Setup.h`. **Attention** : le tactile utilise le protocole SPI, il ne peut pas partager les broches avec le bus de donnees parallele D0-D7.

### Q4 : Pourquoi ne pas utiliser directement VSPI/HSPI ?

- **A** : Le pilote parallele (8-bit Parallel) offre une vitesse de rafraichissement theorique plusieurs fois superieure au SPI. C'est le choix ideal pour les interfaces necessitant un haut nombre d'images par seconde ou pour le developpement d'emulateurs de jeux retro.
