---
title: "Tutoriel complet : piloter un LCD réflectif quatre couleurs ST7306 avec l'ESP32-S3 (Arduino IDE + SPI)"
boardId: esp32s3
moduleId: display/lcd42-st7306-reflective
category: esp32
date: 2026-11-17
intro: "Pilotez un LCD réflectif quatre couleurs ST7306 avec l'ESP32-S3 via Arduino IDE et SPI : câblage du FPC 21 broches, code complet, réglage de l'orientation et diagnostic d'écran muet. Environ testé : Arduino IDE 2.3.8 + esp32 Core 3.3.8."
image: "https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg"
---

> Difficulté : ⭐⭐☆☆☆  
> Durée estimée : environ 30 à 60 minutes (hors téléchargement de l'environnement et débogage matériel)  
> Environnement de test : Arduino IDE v2.3.8 + esp32 Arduino Core v3.3.8

## TL;DR : démarrer vite avec l'ESP32-S3 et le ST7306

- Le module fonctionne uniquement en 3.3V : reliez les broches 5 et 6 du FPC au 3.3V, assurez une masse commune (GND), et ne branchez jamais de 5V.
- Par défaut `PINSET = 1` : CS→GPIO9, RESET→GPIO10, SCLK→GPIO12, MOSI→GPIO13, RS/D/C→GPIO14 ; TE peut rester déconnecté.
- Installez `esp32 by Espressif Systems` dans l'Arduino IDE ; aucune bibliothèque ST7306 supplémentaire n'est nécessaire.
- Ouvrez `esp32s3-st7306-bringup.ino` depuis le dossier du projet, choisissez la carte correspondant à votre modèle d'ESP32-S3 (ici `ESP32S3 Dev Module`) ; si aucun log n'apparaît sur le port série, vérifiez d'abord `USB CDC On Boot`.
- Le SPI est par défaut en mode 0 à 20MHz, avec une image logique de 400×300 en paysage ; si rien ne s'affiche, coupez l'alimentation et vérifiez la masse commune, le sens du FPC et la broche RS, puis sous tension mesurez le 3.3V et observez l'écran sous une lumière vive ; si cela ne suffit pas, abaissez `SPI_HZ` à 10MHz.

## Avant-propos : allumer le ST7306 avec l'Arduino IDE

Cet écran de 4,2 pouces utilise un contrôleur ST7306 qui reçoit commandes et données du framebuffer via SPI. C'est un TFT LCD entièrement réflectif (sans rétroéclairage, lisible à la lumière ambiante) : il n'est bien visible que dans un environnement lumineux. Le dossier du projet contient deux programmes, ESP-IDF et Arduino IDE ; cet article suit uniquement la voie Arduino IDE : câblez le FPC 21 broches, téléversez l'exemple et faites tourner les pages de test en 400×300 paysage. La démo ESP-IDF de 20 pages reste disponible dans le dossier du projet ; les lecteurs qui veulent approfondir l'encapsulation du pilote et les fonctions de dessin peuvent la compiler eux-mêmes.

## Résultat final : les 8 pages de test du ST7306

Une fois le câblage et le téléversement corrects, le programme fait défiler 8 pages de test en boucle. Les pages normales restent environ 3 secondes, la page du carré mobile environ 6 secondes. Ouvrez le moniteur série à 115200 bauds pour voir les logs d'initialisation et de changement de page. Chaque page est redessinée en continu pendant son affichage ; si vous ouvrez le moniteur série après le téléversement, vous pouvez manquer les logs de démarrage : appuyez sur RST sur la carte pour les revoir.

| Page | Contenu du test              | Point de contrôle            | Nom dans le programme             |
| -: | ----------------- | -------------- | ----------------- |
|  0 | Bandes horizontales blanc, cyan, rouge, noir         | Les quatre états d'affichage         | `PAGE_COLOR_BARS` |
|  1 | HELLO WORLD, bordure, quatre coins | Texte et orientation paysage        | `PAGE_HELLO`      |
|  2 | Temps, nombre de frames, FPS         | Temps cumulé depuis le démarrage, compteur global de frames, FPS moyen cumulé (pas le taux propre à cette page)        | `PAGE_COUNTER`    |
|  3 | Diagonales, lignes horizontales et verticales         | Tracés et mapping des coordonnées        | `PAGE_DIAGONAL`   |
|  4 | Carré en aller-retour gauche-droite            | Rafraîchissement continu           | `PAGE_REFRESH`    |
|  5 | Damier               | Cases noir et blanc (20 pixels par case)         | `PAGE_CHECKER`    |
|  6 | Rayures horizontales               | Motif régulier           | `PAGE_STRIPES`    |
|  7 | Test de couleur CYAN         | Écran entièrement cyan (visuellement bleuté), octets du framebuffer `0x33` | `PAGE_CYAN`       |

> Note : les libellés affichés à l'écran (comme `1: COLOR BARS`, `3: DIAGONAL`) sont des chaînes codées en dur et ne correspondent pas exactement aux numéros du tableau (COLOR BARS est la page 0) ; fiez-vous aux logs `[PAGE]` du port série.


![](https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg)


## Les composants : YDP420H005-V3 et ST7306

### Le module LCD réflectif YDP420H005-V3

Il s'agit d'un module TFT LCD réflectif de 4,2 pouces dont le framebuffer natif du panneau est en 300×400. Le contrôleur ST7306 est déjà intégré au module ; l'ESP32-S3 lui envoie commandes et données de pixels via SPI. Le programme Arduino de ce projet le mappe au niveau applicatif en 400×300 paysage.

Le firmware du projet pilote quatre états d'affichage avec un codage 2bit : blanc, cyan, rouge, noir (`0x00` à `0x03`). Chaque pixel occupe 2bit, sans niveaux de gris intermédiaires. Ne reprenez pas telles quelles les couleurs et paramètres d'initialisation d'autres écrans ST7306.

| Paramètre      | Module de ce projet                         |
| ------- | ----------------------------- |
| Modèle      | Osptek YDP420H005-V3          |
| Contrôleur     | Sitronix ST7306               |
| Résolution native   | 300×400                       |
| États d'affichage    | Blanc, cyan, rouge, noir, 2bit/pixel               |
| Interface maître    | SPI 4 fils (SCLK, MOSI, CS, D/C), plus RESET et TE optionnel ; pas de MISO/SDO sur le FPC, écriture seule, pas de lecture |
| Alimentation et logique du module | 3.3V                          |
| Zone d'affichage active  | 63.6×84.8mm                   |
| Température de fonctionnement    | −20～+70°C                     |

### Carte adaptateur FPC 21 broches

L'écran sort ses signaux via un FPC 21 broches. La carte adaptateur convertit ces contacts très fins en points de soudure ou barrettes de broches faciles à relier à l'ESP32-S3 ; aucun circuit de pilotage d'affichage supplémentaire n'est nécessaire pour ce projet.

J'utilise la carte adaptateur universelle double FPC vendue par le fabricant avec l'écran, sans référence sérigraphiée. Elle porte deux connecteurs : 21 broches pour le 4,2 pouces, 12 broches pour le 2,9 pouces, avec des pastilles `GND` et `3V3` à côté.

Quelques composants CMS sont soudés près de chaque connecteur FPC, dans de très petits boîtiers, sans valeur sérigraphiée. Je n'ai pas cherché leur rôle ni leurs valeurs.

Cette carte universelle a un piège de câblage : elle porte à la fois les sérigraphies RS et DC. Le LCD_D/C de ce module doit être relié à la sérigraphie `RS` ; l'autre sérigraphie `DC` ne concerne pas ce module (je n'ai pas vérifié à quel connecteur elle appartient), ne l'utilisez pas. À l'achat ou à la soudure d'une carte adaptateur, vérifiez aussi le sens des contacts FPC et la numérotation des broches.

### Brochage : le FPC 21 broches du YDP420H005-V3

Le tableau ci-dessous suit la numérotation du FPC du module. Les sérigraphies de la carte adaptateur peuvent différer : lors du câblage, fiez-vous à la datasheet du module et au routage réel de la carte (celle-ci n'a ni référence ni schéma public).

|   Broche FPC | Signal du module                               | Sérigraphie courante      | Usage dans cet exemple                 |
| -------: | ---------------------------------- | --------- | -------------------- |
| 1、4、7、14 | GND                                | GND       | Masse commune                 |
|      2、3 | NC                                 | NC        | Non connecté                  |
|      5、6 | VCC(3.3V)                          | VCC、VCI   | Les deux broches au 3.3V            |
|        8 | LCD_RES                            | RESET、RST | Vers GPIO10, reset actif bas       |
|        9 | LCD_SCLK                           | SCL、SCLK  | Vers GPIO12, horloge SPI   |
|       10 | TE                                 | TE        | Peut aller au GPIO11 ; non lu ici, peut rester en l'air  |
|       11 | LCD_SDI                            | SDA、MOSI  | Vers GPIO13, MOSI du SPI |
|       12 | LCD_D/C                            | RS、A0     | Vers GPIO14, sélection commande ou donnée     |
|       13 | LCD_CS                             | CS        | Vers GPIO9, chip select actif bas        |
|    15～19 | TP-VDD、TP-RST、TP-INT、TP-SDA、TP-SCL | Sérigraphies liées au tactile    | Ce module n'a pas de tactile, non connectés          |
|    20、21 | GND                                | GND       | Également la masse ; ici, relier 1、4、7、14 suffit (je n'ai pas mesuré une à une si 20 et 21 y sont reliées sur la carte adaptateur ; dans le doute, mettez-les aussi à la masse)        |

Les noms SCL et SDA viennent des habitudes de sérigraphie des adaptateurs. Ici tout passe par le SPI : SCL correspond à l'horloge série de l'écran, SDA au MOSI.

## BOM : le matériel nécessaire au câblage du ST7306

| Composant           | Spécification                    | Qté | Remarque               |
| ------------ | --------------------- | -: | ---------------- |
| Carte ESP32-S3 | ESP32-S3 N16R8 (16MB Flash / 8MB PSRAM) |  1 | GPIO en 3.3V     |
| Module d'affichage         | Osptek YDP420H005-V3  |  1 | 4,2 pouces, FPC 21 broches |
| Carte adaptateur FPC      | Carte universelle double FPC du fabricant, sans référence      |  1 | Vérifiez les broches et le sens des contacts        |
| Câble USB      | Compatible avec le connecteur de la carte              |  1 | Doit supporter le transfert de données          |
| Fils de liaison          | Câbles Dupont courts ou fils soudés             | quelques-uns | Plus les fils SPI sont courts, plus c'est stable et facile à ranger      |

## Câblage : ESP32-S3 et ST7306

Coupez d'abord l'alimentation, puis câblez selon le `PINSET = 1` par défaut ci-dessous.

|   Broche FPC | Signal écran            | ESP32-S3 | Requis | Remarque        |
| -------: | --------------- | -------- | ---- | --------- |
|       13 | LCD_CS / CS     | GPIO9    | Oui   | Chip select        |
|        8 | LCD_RES / RESET | GPIO10   | Oui   | Reset matériel      |
|       10 | TE              | GPIO11   | Optionnel   | Non lu par l'exemple, peut rester en l'air |
|        9 | LCD_SCLK / SCLK | GPIO12   | Oui   | Horloge SPI    |
|       11 | LCD_SDI / MOSI  | GPIO13   | Oui   | Sortie de données SPI  |
|       12 | LCD_D/C / RS    | GPIO14   | Oui   | Sur la carte du fabricant, relier à RS |
|      5、6 | VCC / VCI       | 3.3V     | Oui   | Relier les deux broches d'alimentation   |
| 1、4、7、14 | GND             | GND      | Oui   | Masse commune avec la carte    |

⚠️ L'alimentation et la logique du module sont en 3.3V. Quand le module est hors tension, ne continuez pas non plus à lui envoyer des signaux depuis les GPIO.

Une fois câblé, vérifiez d'abord **hors tension** :

1. Confirmez la broche 1 du FPC et le sens des contacts à l'aide du plan mécanique du module.
2. Au multimètre en mode continuité, vérifiez que le GND de la carte et les broches GND de l'écran sont bien reliés, et qu'il n'y a pas de court-circuit entre 3.3V et GND.
3. Vérifiez un à un les cinq fils de signal CS, RESET, SCLK, MOSI, RS.
4. Avec la carte double FPC du fabricant, confirmez en plus que GPIO14 est bien relié à RS.
5. Vérifiez l'absence de connexion lâche ou de court-circuit.

Puis vérifiez **sous tension** :

6. Mesurez au multimètre la tension des broches 5 et 6 (ou des points de soudure correspondants sur l'adaptateur) : elle doit être de 3.3V ; sinon, coupez immédiatement l'alimentation et cherchez la cause.

Je vous conseille de repasser deux fois sur chaque fil. Un seul fil mal branché est très difficile à identifier dans les logs série (ici, les logs série ne reflètent pas l'état de l'écran, voir la section dépannage).

## Bibliothèques à installer : le support ESP32-S3 dans l'Arduino IDE

Cet exemple n'utilise pas de bibliothèque Arduino ST7306 séparée. Le pilote, le dessin et les pages de test sont tous dans le fichier `.ino`. `SPI.h` et `esp_heap_caps.h` sont fournis avec l'ESP32 Arduino Core : inutile de les chercher dans le gestionnaire de bibliothèques.

| Nom                                                               | Auteur ou source                     | Installation               | Version confirmée sur ma machine        |
| ---------------------------------------------------------------- | ------------------------- | ------------------ | ------------- |
| Arduino IDE                                                      | Arduino                   | Depuis le site officiel Arduino     | v2.3.8        |
| [esp32 Arduino Core](https://github.com/espressif/arduino-esp32) | Espressif Systems         | Gestionnaire de cartes de l'Arduino IDE | v3.3.8        |
| [SPI](https://github.com/espressif/arduino-esp32)                | Inclus dans l'Espressif Arduino Core | Installé avec le Core          | Avec le Core v3.3.8 |
| [esp\_heap\_caps](https://github.com/espressif/arduino-esp32)    | Inclus dans l'Espressif Arduino Core | Installé avec le Core          | Avec le Core v3.3.8 |

### Installer l'esp32 Arduino Core

1. Ouvrez les préférences de l'Arduino IDE et ajoutez dans « URL de gestionnaire de cartes supplémentaires » :


   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
2. Ouvrez « Outils → Type de carte → Gestionnaire de carte » et cherchez `esp32`.
3. Installez `esp32 by Espressif Systems`. La version confirmée sur ma machine est la v3.3.8 ; pour reproduire ce tutoriel, je vous conseille la même version afin de réduire les variables de débogage liées aux différences de Core.

### Ouvrir le code et téléverser

1. Ouvrez la [page GitHub du projet](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek), téléchargez tout le dossier du projet ou enregistrez seulement le dossier `ArduinoIDE/esp32s3-st7306-bringup`.
2. Ouvrez `ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino` avec l'Arduino IDE.
3. Vérifiez que `PINSET` vaut `1` dans le code et que `ROT180` vaut `1` par défaut.
4. Dans « Outils → Type de carte », choisissez votre carte ESP32-S3 (ici `ESP32S3 Dev Module`), puis le bon port série. Les valeurs de référence sont dans la section suivante ; inutile de tout recopier à l'identique.
5. Cliquez sur « Vérifier », puis, si la compilation passe, sur « Téléverser ».
6. Ouvrez le moniteur série à 115200 bauds. Quand vous voyez `Entrée dans la boucle des pages de test`, observez si l'écran fait défiler les pages de test. En USB natif, le port série se ré-énumère après le téléversement et les logs de démarrage peuvent déjà être passés ; si vous ne les voyez pas, appuyez sur RST, ou fiez-vous aux logs de changement de page `[PAGE]` qui suivent. L'écran étant réflectif, observez-le sous une lumière vive.

### Réglages des menus de l'Arduino IDE (valeurs de référence)

Voici la configuration avec laquelle j'ai réussi, sur Arduino IDE v2.3.8 + esp32 Core v3.3.8. À titre de référence seulement : il existe trop de modèles de cartes ESP32-S3, la puce Flash, la PSRAM et le branchement USB peuvent varier, et recopier aveuglément crée plutôt des problèmes. La troisième colonne du tableau indique quels réglages dépendent de la carte.

| Élément de menu | Valeur de cet exemple | Comment choisir |
| --- | --- | --- |
| Board | ESP32S3 Dev Module | Selon votre carte ; l'architecture doit être esp32s3 |
| Port | /dev/cu.usbmodem1401 | Choisissez le port réel de votre machine, ne recopiez pas ce chemin |
| USB CDC On Boot | Enabled | Selon le branchement USB : Enabled en USB natif, Disabled via la puce série embarquée |
| CPU Frequency | 240MHz (WiFi) | Gardez la valeur par défaut, l'exemple n'a pas besoin de baisser la fréquence |
| Flash Mode | QIO 80MHz | Selon la puce Flash ; QIO est la valeur par défaut de la plupart des modules |
| Flash Size | 4MB (32Mb) | Ne dépassez pas la capacité réelle de la carte (trop grand peut empêcher le démarrage) ; trop petit ne fait que limiter la capacité utilisée, la compilation n'échoue que si le programme dépasse la partition |
| PSRAM | Disabled | L'exemple n'utilise pas la PSRAM, Disabled est le plus sûr ; pour l'activer, choisissez le bon OPI/QSPI selon le module (le R8 du N16R8 est généralement Octal, donc OPI PSRAM), un mauvais choix peut empêcher le démarrage |
| Partition Scheme | Default 4MB with spiffs（1.2MB APP / 1.5MB SPIFFS） | Le défaut suffit ; à ajuster si vous changez Flash Size |
| Upload Speed | 921600 | Si le téléversement échoue, descendez à 115200 ou 460800 |
| Upload Mode | UART0 / Hardware CDC | À assortir au réglage USB CDC |
| USB Mode | Hardware CDC and JTAG | Dépend du nombre de ports USB de la carte ; c'est le cas typique des cartes à un seul port |

Ma carte est une N16R8, annoncée avec 16MB de Flash et 8MB de PSRAM, mais ci-dessus Flash Size est à 4MB et PSRAM à Disabled : la majeure partie de la capacité reste inutilisée. L'exemple n'occupe que 30000 octets de RAM pour le framebuffer, et le rapport de compilation indique que le programme occupe environ 24% de la partition APP par défaut, donc ces valeurs fonctionnent. Pour exploiter toute la capacité, il faudrait modifier Flash Size, PSRAM et la table de partitions ; je ne l'ai pas essayé et je ne veux pas vous faire tomber dans ce piège.

Pour savoir si votre configuration est bonne, pas besoin de tout vérifier point par point : si ça compile, ça téléverse, le port série affiche du texte et l'écran affiche une image, c'est suffisant. Si une étape casse, allez d'abord à la section dépannage et cherchez votre symptôme.

## Code complet : piloter le ST7306 avec l'Arduino IDE

Voici le `.ino` complet de la v7.5 du dépôt. Par rapport au dépôt, cet article ne modifie que quelques commentaires (signification de `PINSET`, méthode de rotation, explication du centrage, définition du FPS, rôle de `DIAG_MODE`) ; la logique exécutable est inchangée. Je vous suggère de mettre à jour les commentaires correspondants dans le dépôt. La v7.4 a corrigé l'octet de remplissage de `PAGE_CYAN`, la v7.5 a supprimé une lecture d'état `0x09` qui ne pouvait rien lire ; le reste de la logique est inchangé.
```cpp
/*
 * Suite de test ESP32-S3 + OSPTEK 4.2" 300x400 LCD noir/blanc/rouge/cyan (ST7306 · SPI) v7.5
 *
 * Changements v7.5 (suppression de la relecture d'état invalide) :
 *   Test réel avec esp32s3-st7306-readback-test : avec SPI.begin(...,-1,MOSI,-1), MISO n'est pas connecté,
 *   transfer() renvoie toujours 0xFF, quel que soit l'adresse du registre ou l'état du CS ; en passant la broche de données en entrée
 *   et en lisant avec pull-up puis pull-down, on obtient tous les bits à 1 / tous à 0 : l'écran ne pilote pas la ligne de données pendant les commandes de lecture.
 *   Conclusion : ce module ne peut pas relire ses registres dans ce câblage ; l'ancien log [DIAG] 0x09 ne faisait que signaler OK à tort,
 *   tout le bloc a été supprimé. Pour juger de la liaison, regardez si l'écran affiche normalement, pas le port série.
 *
 * Changements v7.4 (correction du remplissage plein écran de PAGE_CYAN) :
 *   Comparaison sur matériel réel entre 0x33 / 0x55 / writePoint(C_CYAN) pixel par pixel :
 *   0x33 et l'écriture pixel par pixel affichent tous deux un écran entièrement cyan (visuellement bleuté), 0x55 affiche des rayures espacées.
 *   Après écriture pixel par pixel, les 30000 octets du framebuffer sont aussi tous à 0x33, donc PAGE_CYAN passe à 0x33.
 *
 * Changements v7.3 (rotation supplémentaire de 180° de tout l'écran) :
 *   En démonstration, l'orientation de l'image était inverse du mapping initial : il faut tourner tout l'écran de 180°.
 *   Ajout d'une symétrie centrale des coordonnées logiques avant le mapping logiciel de writePoint :
 *     x -> LCD_W-1-x, y -> LCD_H-1-y
 *   Équivalent à rx = 299 - y; ry = x;  commutable via la macro ROT180 ; à 0, retour à l'orientation v7.1.
 *
 * Changements v7.1 (adaptation paysage - rotation logicielle, correction d'orientation) :
 *   Le panneau est physiquement câblé en portrait 300x400, l'utilisateur le pose en paysage, vue en 400x300.
 *   Rotation logicielle : writePoint mappe les coordonnées logiques paysage vers le framebuffer portrait.
 *   Formule de mapping (corrigée en v7.1) : rx = y; ry = 399 - x;
 *   v7 utilisait rx=299-y, ry=x (sens horaire) : le carré de diagnostic apparaissait en bas à droite, orientation inversée.
 *   v7.1 passe en sens antihoraire : le carré doit apparaître en haut à gauche.
 * v7.2 : DIAG_MODE désactivé, retour à la boucle complète des 8 pages de test.
 *
 * Correctifs clés v4 :
 *   1) Ajout de pinMode(LCD_CS/RS, OUTPUT) : digitalWrite ne fait que gpio_set_level() en interne,
 *      il ne passe pas automatiquement la broche en sortie ; les broches ESP32 sont en entrée par défaut, CS/D-C flottants
 *      empêchaient l'écran de recevoir toute séquence valide de commande/donnée. C'était la vraie cause racine de l'absence d'affichage des versions précédentes.
 *   2) Définitions de broches alignées sur board_config.h du projet IDF (BOARD_PINSET 1), aucun changement de câblage nécessaire :
 *      CS=9  RST=10  CLK=12  MOSI=13  RS(D/C)=14
 *   3) Horloge SPI 20MHz
 *   4) Ajout des étapes appelées après initialize() dans app_main du projet IDF :
 *      High_Power_Mode / display_on / display_Inversion(false) / clearDisplay
 *   5) Mapping des couleurs identique à board_color.h de l'IDF :
 *      C_WHITE=0x00  C_CYAN=0x01  C_RED=0x02  C_BLACK=0x03
 *      (bit0=cyan, bit1=rouge, les deux bits à 1=noir)
 *
 * v5 ajoute 8 pages de test (3 secondes par page, 6 secondes pour la page de taux de rafraîchissement) :
 *   0 COLOR_BARS  bandes horizontales quatre couleurs (blanc/cyan/rouge/noir)
 *   1 HELLO       HELLO WORLD + repères aux quatre coins + bordure
 *   2 COUNTER     chronomètre / nombre de frames / FPS
 *   3 DIAGONAL    diagonales + lignes horizontales et verticales
 *   4 REFRESH     test de taux de rafraîchissement (carré mobile)
 *   5 CHECKER     damier
 *   6 STRIPES     rayures horizontales
 *   7 CYAN        plein écran cyan
 */

#include <SPI.h>
#include <esp_heap_caps.h>

// ---------------- Configuration des broches ----------------
#define PINSET 1  // 1=câblage par défaut (GPIO9/10/12/13/14, utilisé dans cet article)  0=câblage alternatif (GPIO38～42)

#if PINSET == 1
  // Broches strictement identiques à board_config.h du projet IDF (BOARD_PINSET 1), aucun changement de câblage nécessaire
  #define LCD_CS   9
  #define LCD_RST  10
  #define LCD_CLK  12
  #define LCD_MOSI 13
  #define LCD_RS   14   // D/C, sérigraphie RS
#else
  #define LCD_CS   38
  #define LCD_RST  41
  #define LCD_CLK  39
  #define LCD_MOSI 42
  #define LCD_RS   40
#endif

// ---------------- Paramètres de l'écran ----------------
// Résolution logique : paysage 400x300 (panneau physiquement câblé en portrait 300x400, rotation logicielle par writePoint(), bit MV non utilisé)
#define LCD_W      400
#define LCD_H      300
// Paramètres du framebuffer portrait (inchangés)
#define LCD_PIVOT_W  300   // largeur physique
#define LCD_PIVOT_H  400   // hauteur physique
#define LCD_ROW_B    (LCD_PIVOT_W / 2)          // 150 octets par ligne
#define BUF_LEN      (LCD_ROW_B * LCD_PIVOT_H / 2)  // 30000 octets
#define CHUNK        1500

// Mapping des couleurs identique à board_color.h de l'IDF
#define C_WHITE  0x00
#define C_CYAN   0x01
#define C_RED    0x02
#define C_BLACK  0x03

// Si l'écran ne s'allume toujours pas, essayez de baisser 20000000 à 10000000
#define SPI_HZ  20000000

static uint8_t *fb = nullptr;

// ---------------- SPI bas niveau (CS entièrement manuel)----------------
static void spi_begin(void) {
  SPI.beginTransaction(SPISettings(SPI_HZ, MSBFIRST, SPI_MODE0));
}

static void lcd_cmd(uint8_t cmd) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, LOW);
  SPI.transfer(cmd);
  digitalWrite(LCD_CS, HIGH);
}

static void lcd_param(uint8_t p) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  SPI.transfer(p);
  digitalWrite(LCD_CS, HIGH);
}

// Il y avait ici un lcd_read_reg() qui lisait le registre d'état 0x09 via SPI.transfer().
// Raison de la suppression en v7.5 (mesuré, pas supposé) :
//   1) Le deuxième paramètre de SPI.begin(LCD_CLK, -1, LCD_MOSI, -1) est MISO ; -1 signifie non connecté,
//      le périphérique n'a aucune broche d'entrée à échantillonner, transfer() renvoie toujours 0xFF.
//   2) Avec n'importe quel registre 0x04 / 0x0A / 0xDA / 0xA5, ou en maintenant CS constamment haut
//      sans jamais sélectionner l'écran, la relecture donne encore 0xFF —— cette valeur n'a aucun rapport avec l'écran.
//   3) En semi-duplex (broche MOSI passée en entrée, horloge générée manuellement), le pull-up interne donne tous les bits à 1,
//      le pull-down interne tous à 0 : l'écran ne pilote pas la ligne de données pendant les commandes de lecture, rien à relire.
// Ce module n'offre donc aucun auto-test de liaison utilisable dans ce câblage. Pour savoir si c'est bien branché, regardez si l'écran affiche.

// ---------------- Séquence d'initialisation (identique commande par commande à l'IDF)----------------
static void st7306_init(void) {
  // Correctif clé : CS / RS / RST doivent être explicitement configurés en sortie.
  // digitalWrite ne fait que gpio_set_level() en interne, il ne passe pas automatiquement la broche en sortie ;
  // les broches ESP32 sont en entrée par défaut : sans pinMode, CS et D/C restent flottants et l'écran ne reçoit aucune séquence valide.
  pinMode(LCD_CS,  OUTPUT);
  pinMode(LCD_RS,  OUTPUT);
  pinMode(LCD_RST, OUTPUT);
  digitalWrite(LCD_CS, HIGH);   // CS au repos à l'état haut
  digitalWrite(LCD_RS, HIGH);
  digitalWrite(LCD_RST, HIGH); delay(10);
  digitalWrite(LCD_RST, LOW);  delay(10);
  digitalWrite(LCD_RST, HIGH); delay(10);

  // Dernier paramètre à -1 : CS entièrement contrôlé manuellement par digitalWrite
  SPI.begin(LCD_CLK, -1, LCD_MOSI, -1);
  spi_begin();

  lcd_cmd(0xD6); lcd_param(0x17); lcd_param(0x02);
  lcd_cmd(0xD1); lcd_param(0x01);

  lcd_cmd(0xC0); lcd_param(0x12); lcd_param(0x0A);
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);

  lcd_cmd(0xD8); lcd_param(0xA6); lcd_param(0xE9);
  lcd_cmd(0xB2); lcd_param(0x12);

  lcd_cmd(0xB3); lcd_param(0xE5); lcd_param(0xF6); lcd_param(0x17);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x71);
  lcd_cmd(0xB4); lcd_param(0x05); lcd_param(0x46); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x76); lcd_param(0x45);

  lcd_cmd(0x62); lcd_param(0x32); lcd_param(0x03); lcd_param(0x1F);

  lcd_cmd(0xB7); lcd_param(0x13);
  lcd_cmd(0xB0); lcd_param(0x64);

  lcd_cmd(0x11); delay(120);                         // Sleep Out

  lcd_cmd(0xC9); lcd_param(0x00);
  lcd_cmd(0x36); lcd_param(0x48);                    // MX=1, DO=1
  lcd_cmd(0x3A); lcd_param(0x11);
  lcd_cmd(0xB9); lcd_param(0x20);
  lcd_cmd(0xB8); lcd_param(0x29);

  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);

  lcd_cmd(0x35); lcd_param(0x00);
  lcd_cmd(0xD0); lcd_param(0xFF);
  lcd_cmd(0x38);                                     // HPM

  lcd_cmd(0x29);                                     // DISPLAY ON
  lcd_cmd(0x20);                                     // Inversion Off

  lcd_cmd(0xBB); lcd_param(0x4F);                    // Enable Clear RAM

  // ---- Étapes encore appelées par app_main de l'IDF après initialize() ----
  lcd_cmd(0x38); delay(300);                         // séquence HPM de High_Power_Mode()
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);
  lcd_cmd(0xC9); lcd_param(0x00);
  delay(20);
  // display_on(true) / display_Inversion(false) déjà envoyés plus haut via 0x29/0x20
  // clearDisplay() équivaut à remettre le framebuffer à zéro, fait par le memset avant le rafraîchissement

  SPI.endTransaction();
}

// ---------------- Rafraîchissement (envoi par blocs)----------------
static void st7306_flush(void) {
  spi_begin();
  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);
  lcd_cmd(0x2C);

  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  for (size_t off = 0; off < BUF_LEN; off += CHUNK) {
    size_t n = BUF_LEN - off;
    if (n > CHUNK) n = CHUNK;
    SPI.writeBytes(fb + off, n);
  }
  digitalWrite(LCD_CS, HIGH);
  SPI.endTransaction();
}

// ---------------- Opérations sur les pixels ----------------
// Coordonnées logiques : paysage 400x300
// Framebuffer portrait 300(colonnes) x 400(lignes), mapping par rotation logicielle :
//   x paysage (0~399, gauche à droite) -> ligne portrait ry = 399 - x (inversion gauche-droite)
//   y paysage (0~299, haut en bas) -> colonne portrait rx = y
// Les segments de bits se calculent avec la parité des coordonnées physiques portrait rx/ry.
//
// ROT180 : tourne tout l'écran de 180° supplémentaires (panneau monté à l'envers / sens de pose inverse en démo).
//   Méthode : symétrie centrale des coordonnées logiques x -> 399-x, y -> 299-y, puis application du mapping ci-dessus,
//   ce qui se simplifie en : rx = 299 - y; ry = x;
#define ROT180 1   // 1 = rotation 180° (actuel) ; 0 = retour à l'orientation d'origine v7.1

static void writePoint(uint16_t x, uint16_t y, uint16_t data) {
  if (x >= LCD_W || y >= LCD_H) return;
#if ROT180
  x = LCD_W - 1 - x;       // miroir du x logique
  y = LCD_H - 1 - y;       // miroir du y logique
#endif
  uint16_t rx = y;         // colonne portrait
  uint16_t ry = 399 - x;   // ligne portrait (inversée)
  uint16_t real_x = rx / 2;
  uint16_t real_y = ry / 2;
  uint32_t idx    = (uint32_t)real_y * LCD_ROW_B + real_x;
  uint8_t one_two    = (ry % 2) ? 1 : 0;
  uint8_t line_bit_1 = (rx % 2) * 4;
  uint8_t line_bit_0 = (rx % 2) * 4 + 2;
  uint8_t bit1       = 7 - (line_bit_1 + one_two);
  uint8_t bit0       = 7 - (line_bit_0 + one_two);
  if (data & 0x02) fb[idx] |=  (1 << bit1);
  else             fb[idx] &= ~(1 << bit1);
  if (data & 0x01) fb[idx] |=  (1 << bit0);
  else             fb[idx] &= ~(1 << bit0);
}

static void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  for (uint16_t j = 0; j < h; j++)
    for (uint16_t i = 0; i < w; i++)
      writePoint(x + i, y + j, color);
}

// ---------------- Police bitmap 5x7 (portée depuis board_ui_draw.cc de l'IDF)----------------
static const uint8_t s_font_5x7[][7] = {
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, /*   */
    {0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04}, /* ! */
    {0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00}, /* " */
    {0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A}, /* # */
    {0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04}, /* $ */
    {0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03}, /* % */
    {0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0D}, /* & */
    {0x04, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00}, /* ' */
    {0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02}, /* ( */
    {0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08}, /* ) */
    {0x00, 0x04, 0x15, 0x0E, 0x15, 0x04, 0x00}, /* * */
    {0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00}, /* + */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08}, /* , */
    {0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00}, /* - */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00}, /* . */
    {0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00}, /* / */
    {0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E}, /* 0 */
    {0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* 1 */
    {0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F}, /* 2 */
    {0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E}, /* 3 */
    {0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02}, /* 4 */
    {0x1F, 0x10, 0x10, 0x1E, 0x01, 0x01, 0x1E}, /* 5 */
    {0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E}, /* 6 */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08}, /* 7 */
    {0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E}, /* 8 */
    {0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E}, /* 9 */
    {0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00}, /* : */
};

// Lettres majuscules A-Z (5x7)
static const uint8_t s_font_upper[][7] = {
    {0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* A */
    {0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E}, /* B */
    {0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E}, /* C */
    {0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E}, /* D */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F}, /* E */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10}, /* F */
    {0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F}, /* G */
    {0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* H */
    {0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* I */
    {0x01, 0x01, 0x01, 0x01, 0x01, 0x11, 0x0E}, /* J */
    {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11}, /* K */
    {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F}, /* L */
    {0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11}, /* M */
    {0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11}, /* N */
    {0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* O */
    {0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10}, /* P */
    {0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D}, /* Q */
    {0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11}, /* R */
    {0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E}, /* S */
    {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04}, /* T */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* U */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04}, /* V */
    {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A}, /* W */
    {0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11}, /* X */
    {0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04}, /* Y */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F}, /* Z */
};

static void draw_char(int x, int y, char c, int scale, uint16_t color) {
    const uint8_t *rows = nullptr;
    if (c >= ' ' && c <= ':') {
        rows = s_font_5x7[c - ' '];
    } else if (c >= 'A' && c <= 'Z') {
        rows = s_font_upper[c - 'A'];
    } else if (c >= 'a' && c <= 'z') {
        rows = s_font_upper[c - 'a'];   // réutilise la police bitmap majuscule
    } else {
        return;
    }
    for (int ry = 0; ry < 7; ++ry) {
        for (int rx = 0; rx < 5; ++rx) {
            if (rows[ry] & (1U << (4 - rx))) {
                fillRect(x + rx * scale, y + ry * scale, scale, scale, color);
            }
        }
    }
}

static void draw_text(int x, int y, const char *s, int scale, uint16_t color) {
    const int char_w = 5 * scale + scale;
    int pen_x = x;
    for (const char *p = s; *p; ++p) {
        draw_char(pen_x, y, *p, scale, color);
        pen_x += char_w;
    }
}

// ---------------- Pages de test ----------------
enum TestPage {
    PAGE_COLOR_BARS = 0,   // bandes horizontales quatre couleurs (blanc/cyan/rouge/noir)
    PAGE_HELLO,            // Hello World + repères aux quatre coins + bordure
    PAGE_COUNTER,          // compteur de secondes / de frames
    PAGE_DIAGONAL,         // diagonales + lignes horizontales et verticales
    PAGE_REFRESH,          // test de taux de rafraîchissement (carré mobile)
    PAGE_CHECKER,          // damier
    PAGE_STRIPES,          // rayures horizontales
    PAGE_CYAN,             // plein écran cyan
    kTotalPages
};

static void draw_corner_marks(uint16_t color) {
    const int L = 30, T = 4;  // longueur et épaisseur des branches
    // en haut à gauche
    fillRect(4, 4, L, T, color);  fillRect(4, 4, T, L, color);
    // en haut à droite
    fillRect(LCD_W - 4 - L, 4, L, T, color);  fillRect(LCD_W - 4 - T, 4, T, L, color);
    // en bas à gauche
    fillRect(4, LCD_H - 4 - T, L, T, color);  fillRect(4, LCD_H - 4 - L, T, L, color);
    // en bas à droite
    fillRect(LCD_W - 4 - L, LCD_H - 4 - T, L, T, color);
    fillRect(LCD_W - 4 - T, LCD_H - 4 - L, T, L, color);
}

static void draw_border(uint16_t color) {
    fillRect(0, 0, LCD_W, 2, color);
    fillRect(0, LCD_H - 2, LCD_W, 2, color);
    fillRect(0, 0, 2, LCD_H, color);
    fillRect(LCD_W - 2, 0, 2, LCD_H, color);
}

// Trace une droite de direction quelconque (Bresenham)
static void draw_line(int x0, int y0, int x1, int y1, int thick, uint16_t color) {
    int dx = abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int dy = -abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    int err = dx + dy;
    while (true) {
        fillRect(x0, y0, thick, thick, color);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

static void render_page(int page, uint32_t frame, uint32_t elapsed_ms) {
    memset(fb, 0x00, BUF_LEN);   // tout blanc par défaut

    switch (page) {
    case PAGE_COLOR_BARS: {
        const uint16_t colors[4] = { C_WHITE, C_CYAN, C_RED, C_BLACK };
        const int bar_h = LCD_H / 4;
        for (int i = 0; i < 4; ++i) {
            int y0 = i * bar_h;
            int y1 = (i == 3) ? LCD_H : (y0 + bar_h);
            fillRect(0, y0, LCD_W, y1 - y0, colors[i]);
        }
        draw_text(10, 10, "1: COLOR BARS", 2, C_BLACK);
        break;
    }
    case PAGE_HELLO:
        // "HELLO WORLD" 11 caractères * scale5 * 6px = 330px de large, centré x=(400-330)/2=35
        draw_text(35, 110, "HELLO WORLD", 5, C_BLACK);
        draw_text(110, 175, "ST7306 400X300", 2, C_RED);
        draw_text(110, 200, "ESP32-S3 ARDUINO", 2, C_CYAN);
        draw_corner_marks(C_BLACK);
        draw_border(C_RED);
        break;
    case PAGE_COUNTER: {
        char buf[24];
        uint32_t sec = elapsed_ms / 1000;
        snprintf(buf, sizeof(buf), "T: %02lu:%02lu", (unsigned long)(sec / 60), (unsigned long)(sec % 60));
        draw_text(115, 80, buf, 5, C_BLACK);        // 240 de large ; x=115 ajusté à la main, pas strictement centré
        snprintf(buf, sizeof(buf), "FRAME: %lu", (unsigned long)frame);
        draw_text(140, 160, buf, 3, C_RED);         // largeur variable selon le nombre de chiffres ; x=140 ajusté à la main
        snprintf(buf, sizeof(buf), "FPS: %lu", (unsigned long)(frame * 1000 / max((uint32_t)1, elapsed_ms)));
        draw_text(152, 200, buf, 3, C_CYAN);        // largeur variable selon le nombre de chiffres ; x=152 ajusté à la main ; FPS = moyenne cumulée de toutes les pages depuis le démarrage
        break;
    }
    case PAGE_DIAGONAL:
        // deux diagonales
        draw_line(0, 0, LCD_W - 1, LCD_H - 1, 3, C_BLACK);
        draw_line(LCD_W - 1, 0, 0, LCD_H - 1, 3, C_RED);
        // ligne horizontale
        for (int y = 30; y < LCD_H; y += 60)
            draw_line(0, y, LCD_W - 1, y, 2, C_CYAN);
        // ligne verticale
        for (int x = 40; x < LCD_W; x += 80)
            draw_line(x, 0, x, LCD_H - 1, 2, C_BLACK);
        draw_text(10, 10, "3: DIAGONAL", 2, C_BLACK);
        break;
    case PAGE_REFRESH: {
        // carré en aller-retour gauche-droite, pour observer la fluidité du mouvement
        int period = LCD_W - 60;
        int x = (int)((frame * 8) % (period * 2));
        if (x > period) x = period * 2 - x;
        fillRect(x + 10, 130, 40, 40, C_BLACK);     // centré verticalement y=(300-40)/2
        char buf[24];
        snprintf(buf, sizeof(buf), "FRAME %lu", (unsigned long)frame);
        draw_text(10, 10, buf, 2, C_BLACK);
        break;
    }
    case PAGE_CHECKER: {
        const int cell = 20;
        for (int y = 0; y < LCD_H; y += cell)
            for (int x = 0; x < LCD_W; x += cell)
                fillRect(x, y, cell, cell, ((x / cell + y / cell) & 1) ? C_BLACK : C_WHITE);
        break;
    }
    case PAGE_STRIPES: {
        const int stripe_h = 16;
        for (int y = 0; y < LCD_H; y += stripe_h * 2) {
            fillRect(0, y, LCD_W, stripe_h, C_BLACK);
            fillRect(0, y + stripe_h, LCD_W, stripe_h, C_WHITE);
        }
        break;
    }
    case PAGE_CYAN:
        memset(fb, 0x33, BUF_LEN);   // 0x33 = chaque pixel combiné à 01 -> plein écran cyan
        draw_text(85, 130, "CYAN FULL", 5, C_BLACK);   // 270 de large ; x=85 ajusté à la main, pas strictement centré
        break;
    default:
        break;
    }

    st7306_flush();
}

// ---------------- Point d'entrée Arduino ----------------

// Mode diagnostic : à true, ne dessine qu'un carré noir 50x50 aux coordonnées logiques (50,50),
// pour vérifier le mapping et l'orientation de writePoint (inutile si l'écran reste totalement noir : vérifiez d'abord câblage et alimentation).
// Points à observer :
//   1. Le carré est bien carré (pas un rectangle/des fragments) -> proportions du mapping de pixels correctes
//   2. Le carré est dans le quart supérieur gauche de la vue paysage -> orientation correcte
//   3. Si tout est inversé -> changez d'abord la macro ROT180 ; si c'est encore faux, envisagez les bits MX/MY de MADCTL(0x36)
#define DIAG_MODE  false

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println();
    Serial.println("=== ST7306 test suite v7.5 (ROT180) ===");

    fb = (uint8_t *)heap_caps_malloc(BUF_LEN, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!fb) fb = (uint8_t *)malloc(BUF_LEN);
    if (!fb) { Serial.println("[ERR] Échec d'allocation du framebuffer"); while (1) delay(100); }
    Serial.printf("[OK] Framebuffer %d octets @%p\n", BUF_LEN, fb);
    memset(fb, 0x00, BUF_LEN);

    Serial.println("[..] Initialisation du ST7306 ...");
    st7306_init();

    // Il y avait ici une lecture du registre d'état 0x09 avec affichage OK / liaison HS.
    // Supprimé en v7.5 : MISO non connecté, la valeur relue est toujours 0xFF, sans rapport avec l'état de l'écran, donc trompeuse.
    // Pour savoir si la liaison fonctionne, regardez si l'écran affiche normalement une image.

    if (DIAG_MODE) {
        Serial.println("[DIAG] Dessin d'un carré 50x50 en (50,50), observez l'écran...");
        fillRect(50, 50, 50, 50, C_BLACK);
        st7306_flush();
    } else {
        Serial.println("[OK] Entrée dans la boucle des pages de test");
    }
}

void loop() {
    if (DIAG_MODE) { delay(1000); return; }

    static int page = 0;
    static uint32_t page_start = 0;
    static uint32_t frame = 0;
    static uint32_t t_start = 0;

    if (t_start == 0) t_start = millis();
    if (page_start == 0) page_start = millis();

    uint32_t dwell = (page == PAGE_REFRESH) ? 6000 : 3000;
    uint32_t elapsed = millis() - page_start;

    render_page(page, frame, millis() - t_start);
    frame++;

    if (elapsed >= dwell) {
        page = (page + 1) % kTotalPages;
        page_start = millis();
        Serial.printf("[PAGE] %d / %d, frame %lu\n", page, kTotalPages - 1, (unsigned long)frame);
    }
}
```


### Explication du code : initialisation du ST7306, framebuffer et rotation

`PINSET` détermine quel jeu de GPIO est utilisé. Le câblage de cet article correspond à `PINSET = 1` ; le code source conserve aussi l'autre jeu de broches pour `PINSET = 0`, et changer de jeu impose de modifier le câblage en même temps. `PINSET` n'est qu'un commutateur entre deux jeux de broches, sans rapport avec l'utilisation ou non d'une carte adaptateur ; j'ai ajouté une configuration de câblage, correspondant à `PINSET = 1`, pour faciliter mon propre branchement.

`st7306_init()` configure d'abord CS, RS et RST en sortie, puis effectue le reset matériel et l'initialisation du ST7306. `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` spécifie SCLK et MOSI ; CS est contrôlé manuellement par le code. MISO reçoit `-1` car le FPC de ce module n'a pas de MISO/SDO : écriture seule, pas de lecture, donc pas d'auto-test par relecture dans cet exemple. Les transferts utilisent `SPI_MODE0`, et l'horloge est fixée à 20MHz par `SPI_HZ`.

La taille du framebuffer se calcule directement : 2bit par pixel, un octet contient 2×2 soit 4 pixels, donc 300×400 pixels équivalent à 150 octets par ligne sur 200 lignes (chaque ligne correspond à 2 lignes de pixels), soit `150 × 200 = 30000` octets. Au démarrage, le programme demande de la mémoire compatible DMA via `heap_caps_malloc()`, puis retombe sur un `malloc()` ordinaire en cas d'échec.

`writePoint()` convertit les coordonnées logiques 400×300 paysage en coordonnées du framebuffer natif 300×400. Avec `ROT180 = 1` par défaut, une symétrie centrale supplémentaire est appliquée : pour changer l'orientation d'affichage, touchez d'abord cette macro, pas `LCD_W` ni `LCD_H`.

`st7306_flush()` envoie à chaque fois le framebuffer complet, par blocs de 1500 octets. `loop()` redessine en continu la page courante ; les pages normales changent après environ 3 secondes, `PAGE_REFRESH` après environ 6 secondes. Le temps et le FPS de la page compteur sont des valeurs cumulées depuis le démarrage, pas des données propres à une page.

La version ESP-IDF répartit le pilote dans `main/st7306_color4.cpp`, `main/st73xx_ui.c` et `main/color4_demo.c`, avec davantage de pages. Je laisse cette partie aux lecteurs qui voudront l'étudier via le README du dépôt ; cet article ne détaille pas les étapes de compilation ESP-IDF.

## Dépannage : ST7306 sans affichage, orientation et couleurs

### Téléversement réussi, mais l'écran ne change pas du tout

Symptôme : le port série tourne déjà, l'écran reste tel quel.

Cause : alimentation, masse commune, sens du FPC, RS/DC mal branché ou signaux SPI instables peuvent empêcher les commandes d'initialisation d'arriver correctement à l'écran ; un écran réflectif n'a pas de rétroéclairage, et dans un environnement trop sombre il peut sembler éteint.

Que faire : coupez d'abord l'alimentation et vérifiez la masse commune et le sens des contacts FPC, puis sous tension mesurez si les broches 5 et 6 sont à 3.3V (voir les étapes de vérification plus haut). Sur la carte adaptateur du fabricant, GPIO14 va à RS. Observez sous une lumière vive, en changeant d'angle. Si tout cela est normal, passez `SPI_HZ` de `20000000` à `10000000`, raccourcissez les fils SCLK et MOSI, puis téléversez à nouveau.

### Ancienne version (v7.4 et antérieures) : le port série affiche OK, mais l'écran reste noir

Symptôme : le port série affiche `[DIAG] ST7306 0x09 = 0xFF OK`, mais aucune image n'apparaît.

Cause : cette ligne de log ne reflète pas l'état de l'écran. D'après le tableau du FPC ci-dessus, ce module n'a pas de MISO/SDO, `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` n'attribue aucune broche au MISO, et `SPI.transfer()` renvoie toujours `0xFF`, quel que soit le registre lu ou l'état du CS (j'ai essayé `0x04`, `0x0A`, `0xDA`, `0xA5`, et même en maintenant CS constamment haut, c'est pareil). En passant la broche MOSI en entrée pour lire manuellement, le pull-up donne tous les bits à 1 et le pull-down tous à 0 : là encore, l'écran ne pilote pas la ligne de données pendant les commandes de lecture.

Que faire : passez à la v7.5, cette ligne a été supprimée. Les logs série de la v7.5 ne reflètent pas l'état de l'écran ; pour juger de la liaison, regardez seulement si une image apparaît, et revenez à l'alimentation, la masse commune, le sens du FPC et la broche RS.

### ST7306 intermittent, affichage corrompu ou résultat différent à chaque mise sous tension

Symptôme : parfois ça affiche, parfois l'affichage est corrompu, ou le résultat change après une nouvelle mise sous tension.

Cause : des fils SPI trop longs ou une masse commune mal connectée provoquent des erreurs de transmission ; plus les fils sont longs et l'horloge élevée, plus des octets se perdent facilement (c'est un jugement d'expérience, je n'ai pas fait de test quantitatif).

Que faire : raccourcissez d'abord les fils à moins de 10cm, vérifiez qu'au moins deux fils GND sont reliés et que la masse ne repose pas sur un seul fil fin. Puis essayez `SPI_HZ` de 20MHz à 10MHz ; si c'est stable, remontez progressivement. Ne commencez pas par supprimer ou modifier au hasard les commandes d'initialisation.

### Orientation paysage du ST7306 inversée

Symptôme : le texte ou les motifs sont tournés de 180°, mais les proportions sont normales.

Cause : le code actuel utilise `ROT180 = 1` par défaut ; votre sens de pose est peut-être l'opposé de celui de l'exemple.

Que faire : après le téléversement, regardez la page HELLO WORLD : si le texte est à l'endroit, ne touchez à rien ; si tout l'écran est retourné de 180°, remplacez `#define ROT180 1` par `#define ROT180 0` et téléversez à nouveau. Pour vérifier séparément l'orientation et les coordonnées, passez `DIAG_MODE` à `true` : le programme ne dessine alors qu'un carré noir de 50×50 ; avec la bonne orientation, il doit être carré et situé dans la zone en haut à gauche. Ce mode ne sert qu'à vérifier l'orientation et le mapping ; si l'écran reste totalement noir, il ne vous aidera pas.

### Proportions ou position d'affichage anormales sur le ST7306

Symptôme : carré déformé, motifs fragmentés ou position inattendue.

Cause : cela arrive généralement après avoir modifié `LCD_W`, `LCD_H`, les macros de disposition du framebuffer ou `writePoint()`, ou en utilisant le code sur un autre module ST7306 ; la v7.5 non modifiée ne devrait pas présenter ce problème sur ce module. Le mapping entre les coordonnées logiques 400×300 et le framebuffer natif 300×400 repose sur `writePoint()` ; changer les macros de résolution ne résout rien.

Que faire : gardez `LCD_W = 400` et `LCD_H = 300`, activez d'abord `DIAG_MODE` pour vérifier le carré, puis comparez avec le calcul de `rx`, `ry` et des plans de bits dans `writePoint()`.

### Couleurs du ST7306 différentes de l'attendu

Symptôme : le rouge, le cyan ou les motifs de remplissage ne correspondent pas à l'attendu.

Cause : ce module n'a que quatre états — blanc, cyan, rouge, noir — et les deux bits de couleur sont entrelacés dans l'octet. D'autres modules ST7306 peuvent utiliser une implémentation de couleurs différente.

Que faire : lancez d'abord la page des bandes quatre couleurs pour confirmer les quatre états de base, puis vérifiez l'écriture des couleurs dans `writePoint()`. Depuis la v7.4, l'octet de remplissage de `PAGE_CYAN` est `0x33` ; si une ancienne version affiche des rayures espacées, mettez le code à jour ou ne changez que ce point.

### L'Arduino IDE indique que `esp_heap_caps.h` est introuvable

Symptôme : la compilation signale un fichier d'en-tête manquant.

Cause : la carte ou le Core sélectionné n'est pas le bon. Cet en-tête appartient à l'ESP32 Arduino Core, ce n'est pas une bibliothèque tierce séparée.

Que faire : vérifiez que `esp32 by Espressif Systems` est bien installé et choisissez ESP32-S3 dans le menu des cartes, pas un Arduino Uno ou une autre architecture. Si le Core est corrompu, notez la version actuelle puis réinstallez-le, et resélectionnez la carte et le port.

### Aucun log série visible après le téléversement sur l'ESP32-S3

Symptôme : l'écran affiche peut-être déjà des pages, mais le moniteur série reste vide.

Cause : débit, périphérique série ou configuration USB CDC inadaptés, ou port série occupé par un autre programme.

Que faire : réglez le débit sur 115200 et fermez les autres moniteurs qui occupent le port. Puis comparez avec les valeurs de menu de cet exemple : `USB CDC On Boot = Enabled`, `USB Mode = Hardware CDC and JTAG`, périphérique série du type `/dev/cu.usbmodem1401` (un port COM sous Windows). Si la carte passe par une puce USB-série embarquée plutôt que l'USB natif, passez `USB CDC On Boot` à `Disabled` ; `USB Mode` n'a pratiquement aucun effet dans ce branchement, gardez la valeur par défaut.

## FAQ : questions fréquentes sur l'ESP32-S3 et le ST7306

**Q : Peut-on relier le ST7306 à d'autres broches de l'ESP32-S3 ?**  
R : Oui, modifiez `LCD_CS`, `LCD_RST`, `LCD_CLK`, `LCD_MOSI` et `LCD_RS` dans la branche `PINSET = 1` du `.ino`, et adaptez le câblage en conséquence. La possibilité d'utiliser un GPIO donné dépend des broches exposées par la carte et de sa configuration de démarrage ; je n'ai pas vérifié carte par carte. Par exemple, sur N16R8 les GPIO35～37 sont occupés par la PSRAM Octal : évitez-les quand la PSRAM est activée. Le `PINSET = 0` du code source propose aussi le jeu alternatif CS=38, RESET=41, SCLK=39, MOSI=42, RS=40.

**Q : Peut-on changer l'horloge SPI du ST7306 ?**  
R : L'exemple utilise par défaut `SPI_HZ = 20000000`, soit 20MHz. Si la communication est instable, passez d'abord à `10000000`. La documentation du projet note que le manuel ST7306 v0.1 donne une période minimale d'horloge d'écriture de 30ns, soit environ 33.3MHz ; sur un module réel il faut aussi compter le routage et la carte adaptateur, et je n'ai pas mesuré la limite stable de cette carte.

**Q : Le YDP420H005-V3 peut-il être alimenté en 5V ?**  
R : Non. Les broches 5 et 6 du FPC du module vont au 3.3V, et la logique s'utilise aussi en 3.3V. Reliez les deux broches d'alimentation, et assurez la masse commune entre la carte et le module. Quand le module est hors tension, ne continuez pas à lui envoyer des signaux GPIO.

**Q : Combien de RAM occupe cet exemple ST7306, et quel FPS peut-il atteindre ?**  
R : Le framebuffer complet fait 30000 octets ; le programme utilise en plus la police bitmap, des variables locales et la mémoire de fonctionnement de l'Arduino Core lui-même. Chaque rafraîchissement envoie les 30000 octets complets ; à 20MHz, en ne comptant que la charge utile SPI, le temps de transfert théorique est d'environ 12ms, hors dessin et commandes. Je n'ai pas enregistré le FPS réel. La page compteur affiche la moyenne cumulée de toutes les pages depuis le démarrage, pas le taux d'une seule page ; le dessin lui-même (appel de `writePoint()` pixel par pixel) prend aussi du temps, donc le temps de frame réel sera supérieur à 12ms.

**Q : Un autre écran à base de ST7306 fonctionnera-t-il directement ?**  
R : Aucune garantie. Cet exemple cible le FPC 21 broches du YDP420H005-V3, sa séquence d'initialisation, son framebuffer 300×400 et ses quatre états d'affichage actuels. D'autres modules peuvent changer l'alimentation, l'adressage, les couleurs ou les paramètres d'initialisation : comparez d'abord avec leur datasheet.

**Q : Le ST7306 est câblé mais n'affiche rien : que vérifier en premier ?**  
R : Hors tension, vérifiez d'abord la masse commune, le sens du FPC et les cinq fils de signal requis, et confirmez que GPIO14 va à RS sur la carte adaptateur du fabricant ; sous tension, mesurez le 3.3V et observez sous une lumière vive. Toujours rien ? Abaissez le SPI à 10MHz. `DIAG_MODE` ne sert qu'à vérifier l'orientation et le mapping ; il est peu utile quand l'écran reste totalement noir.

**Q : Faut-il connecter TE et MISO du ST7306 ?**  
R : TE est une sortie de synchronisation de trame ; cet exemple ne la lit pas, elle peut rester déconnectée. L'écriture n'utilise que MOSI, et le FPC n'a pas de MISO/SDO : il n'y a donc pas d'auto-test par relecture de registres ici. Dans les anciennes versions, `lcd_read_reg(0x09)` renvoyait toujours `0xFF`, sans rapport avec l'état de l'écran ; supprimé en v7.5, voir la section dépannage.

**Q : Peut-on faire tourner cet écran ST7306 avec ESP-IDF ?**  
R : Le dossier du projet (`Handbook/ESP-IDF/420-…`) est lui-même un projet ESP-IDF ; le journal de développement indique une compilation sans avertissement sous ESP-IDF v6.0.2, avec une démo de 20 pages et des fonctions de dessin. Cet article n'a pas relancé cette build et ne développe pas de tutoriel ESP-IDF ; vous pouvez l'étudier vous-même via le README du dépôt.

## Pour aller plus loin : continuer à modifier l'exemple ST7306

- Remplacez la police bitmap 5×7 de `draw_text()` par votre propre fonte matricielle et fabriquez un panneau d'état quatre couleurs.
- Ajoutez une stratégie de mise à jour partielle aux pages existantes, et mesurez réellement le temps de rafraîchissement et le rendu.
- Branchez le signal TE, étudiez comment planifier le moment du rafraîchissement, et observez les pages animées.
- Lisez la démo ESP-IDF de 20 pages en parallèle de la version Arduino, et récupérez les fonctions de dessin dont vous avez besoin pour votre propre application.

## Références : ESP32-S3, ST7306 et Arduino

- [Page du projet LingShunLAB](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek) : source du câblage, du code et de la documentation de cet article.
- [Code source de l'exemple Arduino IDE v7.5](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino) : le `.ino` complet.
- [Datasheet du module YDP420H005-V3](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/docs/YDP420H005-V3.pdf) : paramètres du module, plan mécanique et définition du FPC.
- [Liste officielle des produits Sitronix ST7306](https://www.sitronix.com.tw/en/products/industrial-display-driver-ic/ultra-low-power-tft-driver-ic/) : page produit des IC de pilotage TFT ultra basse consommation de Sitronix.
- [Manuel du contrôleur ST7306 v0.1 (fourni par le fabricant du module)](https://admin.osptek.com/uploads/ST_7306_V0_1_c30c3541a3.pdf) : interface, registres, framebuffer et timings ; une copie est aussi conservée dans `docs/` du dépôt.
- [Code d'exemple du fabricant Osptek](https://gitee.com/osptek/display-rlcd-4.2inch-300x400/tree/main/examples) : exemples d'affichage associés fournis par le fabricant.
- [Page produit officielle Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3) et [datasheet officielle](https://documentation.espressif.com/esp32-s3_datasheet_en.html) : documentation de la puce maître.
- [GitHub de l'esp32 Arduino Core](https://github.com/espressif/arduino-esp32) et [documentation d'installation officielle](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html) : paquet de support de cartes et méthode d'installation.
