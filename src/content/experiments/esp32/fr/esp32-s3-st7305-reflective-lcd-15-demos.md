---
title: "ESP32-S3 pilote l'écran LCD monochrome réflectif ST7305 de 4,2 pouces : 15 exemples complets (SPI 4 fils + Arduino)"
boardId: esp32s3
moduleId: display/lcd42-st7305-reflective
category: esp32
date: 2026-11-06
intro: "Utilisez un Arduino Nano ESP32 (ESP32-S3) avec un SPI 4 fils pour piloter un écran LCD monochrome réflectif ST7305 de 4,2 pouces 300×400 : câblage, flashage, 15 exemples d'affichage et dépannage. Parfait pour les makers Arduino qui veulent jouer avec un écran réflectif sans rétroéclairage."
image: "https://img.lingflux.com/2026/11/e43d291425c39954fa157a9adb62fddb.jpg"
---

> **En une phrase** : Un Arduino Nano ESP32 (ESP32-S3) plus un écran LCD monochrome réflectif ST7305 de 4,2 pouces — un seul fichier `.ino` fait tourner le pilote et une démo carrousel automatique de 15 pages, sans aucune bibliothèque d'affichage tierce.

```text
Difficulté : ⭐⭐☆☆☆ (si vous savez brancher des câbles dupont et utiliser l'Arduino IDE, vous pouvez le faire)
Temps estimé : 30 minutes (sans compter le temps passé à lutter contre les mauvais contacts)
Environnement de test : Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10
```

> **TL;DR (démarrage rapide) :**
>
> 1. Câblage : SCLK → D7/GPIO10, MOSI → D5/GPIO8, CS → D6/GPIO9, DC → D4/GPIO7, RES → D3/GPIO6.
> 2. VCI sur 3.3V, et l'écran partage la masse avec la carte ; TE et BLC restent non connectés. Attention : sur le Nano ESP32, D5 est GPIO8, pas GPIO11.
> 3. Installez le package de cartes `esp32 by Espressif Systems` ; pas besoin d'U8g2, d'Adafruit GFX ni d'aucune autre bibliothèque d'affichage.
> 4. Ouvrez le `ST7305_RLCD_Demo.ino` fourni, sélectionnez la carte `Arduino Nano ESP32`, compilez et flashez.
> 5. Réglez le moniteur série sur 115200 bauds ; l'écran fait alors défiler automatiquement 15 exemples. Les pages animées utilisent HPM ; les pages statiques ne sont écrites à l'écran qu'une seule fois.

## Introduction : un écran d'autant plus lisible qu'il brille moins

Regarder un LCD ordinaire le soir donne parfois l'impression que quelqu'un pointe une petite lampe torche directement dans vos yeux. Un écran e-ink est confortable, certes, mais le regarder rafraîchir une animation, c'est comme attendre le bus — vous savez qu'il arrive, mais il ne peut pas arriver plus vite.

Les écrans totalement réflectifs prennent une troisième voie : au lieu d'éclairer les pixels avec un rétroéclairage, ils réfléchissent la lumière ambiante, comme une feuille de papier que votre programme peut réécrire. Avec beaucoup de lumière, l'image devient même plus nette ; quand il fait trop sombre, allumez simplement une lampe — ne prouvez pas votre force de volonté en plissant les yeux.

Cette fois, j'ai utilisé un Arduino Nano ESP32 (dont le microcontrôleur est un ESP32-S3) pour piloter un Mono TFT réflectif de 4,2 pouces, 300×400, à contrôleur ST7305. L'objectif n'était pas de s'arrêter après un `Hello World`, mais d'essayer texte, niveaux de gris, géométrie, animation, cadence d'images et rotation dans quatre sens à travers 15 exemples.

Le « ménage les yeux » ici désigne le visionnage sans rétroéclairage, par réflexion de la lumière ambiante — ce n'est pas une certification médicale. Quand vos yeux ont besoin de repos, aucun écran, si avancé soit-il, ne peut cligner à votre place.

## Le résultat : 15 démos du ST7305 en carrousel automatique

Après avoir flashé un seul fichier `.ino`, l'écran démarre sur la page d'accueil puis boucle automatiquement à travers 15 pages — sans boutons, commandes série, réseau ni ressources d'images externes.

![Carrousel des 15 démos du ST7305](https://img.lingflux.com/2026/11/26bdefa52b9c1d4b6e779c08f9744255.jpg)

|    # | Démo          | À observer                                             | Durée   | FPS cible    |
| ---: | ------------- | ------------------------------------------------------ | ------: | -----------: |
|    1 | Hello World   | Grand texte, bordures, fond tramé et un sourire        |  3,5 s  |     statique |
|    2 | Dither Gray   | 17 niveaux de tramage Bayer 4×4, dégradé et cercles gris | 6,5 s |     statique |
|    3 | Geometry      | Lignes, rectangles, cercles, triangles et polygones    |     5 s |     statique |
|    4 | Pixel Grid    | Bords, rapport d'aspect, diagonales et centrage géométrique | 5 s |   statique |
|    5 | Text & Font   | ASCII 5×7, mise à l'échelle entière et texte inversé   |   5,5 s |     statique |
|    6 | Dashboard UI  | Cartes, barres de progression, interrupteurs, batterie et données live | 9 s | 4 FPS |
|    7 | Frame Rate    | FPS réel, coût par trame et graphe d'historique à 54 points | 8,5 s | sans limite |
|    8 | Fine Patterns | Damiers 1/2/4 pixels et scintillement de lignes fines  |     6 s |       2 FPS  |
|    9 | Bounce        | Rebonds, collisions, ghosting de mouvement et compteur |     9 s |      20 FPS  |
|   10 | Starfield     | Vol en perspective à travers 56 étoiles                |     9 s |      20 FPS  |
|   11 | Game of Life  | Jeu de la vie de Conway sur un tore 34×34              |    12 s |       3 FPS  |
|   12 | Uptime Clock  | Une horloge de durée de fonctionnement basée sur `esp_timer` | 9 s |   4 FPS  |
|   13 | Retro Desktop | Un bureau rétro de style Macintosh                     |   6,5 s |     statique |
|   14 | Inversion     | Inversion noir/blanc plein écran et vérification du contraste | 6 s |     2 FPS  |
|   15 | Rotation      | Bascule 0°/90°/180°/270° dans quatre sens              |    12 s |       4 FPS  |

Le FPS cible est le rythme auquel le programme dessine et envoie des trames — ce n'est pas la fréquence de rafraîchissement optique du panneau de verre. La page 7 mesure « dessin + transfert SPI d'une trame complète de 15000 octets », pas un benchmark gonflé pour frimer.

Vidéo de démonstration YouTube :

<iframe width="560" height="315" src="https://www.youtube.com/embed/IWZMK5AJsvI?si=pXumVzEKfuIYEra9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Description des composants

### Mono TFT réflectif de 4,2 pouces : un écran noir et blanc « développé » par la lumière ambiante

Le Mono TFT réflectif de 4,2 pouces est une LCD monochrome réflective sans rétroéclairage. Elle présente des images en noir et blanc en utilisant la lumière ambiante, et dans ce projet elle affiche les 15 motifs de test et pages animées.

Voyez-la comme une feuille de papier qui obéit à un microcontrôleur : meilleure est la lumière ambiante, plus la lecture est reposante ; sans lumière ambiante, elle ne se transforme pas non plus en lampe torche.

| Paramètre        | Cet écran                            |
| ---------------- | ------------------------------------ |
| Référence        | W420HC018MONO-12Z                    |
| Taille           | 4,2 pouces                           |
| Résolution       | 300×400 pixels, noir & blanc 1 bit   |
| Type d'affichage | Totalement réflectif, normalement blanc, sans rétroéclairage |
| CI pilote        | Sitronix ST7305                      |
| Interface hôte   | SPI 4 fils simple, écriture seule    |
| Alimentation     | 2.8V/3.3V — ici on utilise 3.3V      |
| Zone active      | 63,6×84,84 mm                        |
| Temp. de service | -20℃～+70℃                           |

Pourquoi celui-ci : 300×400 suffit pour un tableau de bord complet, le SPI 4 fils n'occupe que peu de broches, et sans circuit de rétroéclairage il convient aux données d'environnement, horloges et tableaux à faible fréquence de rafraîchissement.

### Définition des broches

Tous les signaux sortent par un câble FPC 12 broches ; avec la carte adaptatrice vous pouvez relier l'écran à votre carte avec des câbles dupont :

| Broche FPC | Nom   | Fonction                    | Usage dans cet exemple   |
| ---------: | ----- | --------------------------- | ------------------------ |
|  1, 5, 12  | GND   | Masse d'alimentation        | Vers GND de la carte     |
|      2, 3  | NC    | Non connecté                | Laisser libre            |
|         4  | VCI   | Alimentation de l'écran     | Vers 3.3V                |
|         6  | TE    | Sortie de synchro de trame  | Inutilisé, en l'air      |
|         7  | DC    | Sélection commande/donnée   | Vers GPIO7               |
|         8  | CS    | Chip select SPI, actif bas  | Vers GPIO9               |
|         9  | SCL   | Horloge SPI                 | Vers GPIO10              |
|        10  | SDA   | Entrée données SPI, soit MOSI | Vers GPIO8             |
|        11  | RESET | Reset matériel, actif bas   | Vers GPIO6               |

Attention : ici `SDA` est le MOSI du SPI, pas de l'I²C. Même nom, travail différent — ne le laissez pas fraterniser avec vos capteurs I²C.

### ST7305 : le « trieur » qui traduit les octets en pixels noir et blanc

Le ST7305 est le contrôleur/pilote de TFT monochrome à ultra basse consommation de Sitronix. Il reçoit les commandes de l'hôte, gère la RAM d'affichage et pilote le panneau — dans ce projet il transforme les données de trame envoyées par l'ESP32-S3 en pixels noir et blanc sur l'écran.

| Paramètre              | Valeur / configuration dans ce projet        |
| ---------------------- | -------------------------------------------- |
| Capacité max.          | 408×408 pixels mono                          |
| Profondeur de pixel    | 1 bit/pixel                                  |
| Cycle d'écriture SPI min. | 30 ns — environ 33 MHz max.               |
| SPI dans ce projet     | Mode 0, 20 MHz, MSB d'abord                  |
| Cadence de trames HPM  | 16 Hz ou 32 Hz ; configurée à 16 Hz ici      |
| Cadence de trames LPM  | 0,25～8 Hz ; configurée à 8 Hz à l'init      |
| Trame complète ici     | 15000 octets                                 |

Ce n'est pas parce qu'il a beaucoup de registres et a l'air pro — c'est que le module l'encapsule déjà très bien : l'hôte n'a besoin que de SPI, DC, CS et RESET pour rafraîchir tout l'écran.

### Carte adaptatrice FPC : traduire le « fin câble plat » en « câbles dupont »

Une carte adaptatrice FPC est une carte de conversion d'interface de câble qui amène le FPC 12 broches de l'écran sur des broches pratiques pour l'expérimentation, de sorte que dans ce projet l'écran peut être relié à la carte avec de simples câbles dupont.

| Paramètre      | Usage dans ce projet                      |
| -------------- | ----------------------------------------- |
| Côté écran     | FPC 12 broches                            |
| Côté expérience | GND, VCC, SCL, SDA, RES, DC, CS, BLC     |
| Signaux requis | 5 lignes de contrôle + 3.3V + GND         |
| Peuvent rester libres | TE, BLC                             |

On l'utilise pour ne pas avoir à souder à la main ce fin câble plat. Nous faisons une expérience d'affichage, nous ne nous inscrivons pas à un double examen d'ophtalmologie et de soudure.

## BOM

| Composant                               | Quantité | Nécessité   | Remarques                                      |
| --------------------------------------- | -------: | ----------- | ---------------------------------------------- |
| Carte Arduino Nano ESP32                |        1 | Requise     | Le microcontrôleur est un ESP32-S3             |
| Écran mono réflectif ST7305 de 4,2"     |        1 | Requise     | 300×400, alimenté en 3.3V                      |
| Carte adaptatrice FPC assortie          |        1 | Recommandée | Facilite juste le câblage ; un connecteur FPC convient aussi |
| Câbles dupont                           |     7+   | Requis      | Le plus courts possible — moins de problèmes de contact et de signal |

## Câblage : SPI 4 fils de l'ESP32-S3 vers le ST7305

![Câblage du ST7305 sur un Arduino Nano ESP32](https://img.lingflux.com/2026/11/a029c2eab88f09f46c951a53287b647e.jpg)

```text
Arduino Nano ESP32                         Carte adaptatrice ST7305
┌──────────────────┐                     ┌──────────────────┐
│ D7  / GPIO10     │ ───── SCLK ───────► │ SCL              │
│ D5  / GPIO8      │ ───── MOSI ───────► │ SDA              │
│ D6  / GPIO9      │ ───── CS ─────────► │ CS               │
│ D4  / GPIO7      │ ───── DC ─────────► │ DC               │
│ D3  / GPIO6      │ ───── RESET ──────► │ RES              │
│ 3V3              │ ───── 3.3V ───────► │ VCC / VCI        │
│ GND              │ ───── GND ────────► │ GND              │
└──────────────────┘                     └──────────────────┘
```

| Sérigraphie adaptateur | FPC écran | Sérigraphie Nano ESP32 | ESP32-S3 GPIO | Usage                |
| ---------------------- | --------: | ---------------------- | ------------: | -------------------- |
| SCL                    |     PIN9  | D7                     |        GPIO10 | Horloge SPI          |
| SDA                    |    PIN10  | D5                     |         GPIO8 | SPI MOSI             |
| CS                     |     PIN8  | D6                     |         GPIO9 | Chip select          |
| DC                     |     PIN7  | D4                     |         GPIO7 | Sélection commande/donnée |
| RES                    |    PIN11  | D3                     |         GPIO6 | Reset matériel       |
| VCC/VCI                |     PIN4  | 3V3                    |  alim. 3.3V   | Alimentation écran   |
| GND                    | PIN1/5/12 | GND                    |           GND | Masse commune        |
| TE                     |     PIN6  | non connecté           |             — | Synchro de trame inutilisée ici |
| BLC                    |        —  | non connecté           |             — | Écran réflectif sans rétroéclairage |

**Dans cet exemple VCI va sur 3.3V — ne le connectez ni à 5V, ni à VBUS, ni à VIN.**

### Sans circuit pilote supplémentaire : l'ESP32-S3 pilote le FPC de l'écran directement

Sous alimentation 3.3V, cet écran peut être piloté directement par les GPIO de l'ESP32-S3 : reliez SCL, SDA, CS, DC et RESET du FPC à leurs GPIO correspondants, VCI à 3.3V et partagez GND. Pas besoin d'intercaler de puce de translation de niveau, de carte pilote d'écran dédiée ni d'aucun autre circuit périphérique.

La « connexion directe » ici désigne la connexion **électrique** — il ne s'agit pas d'enfoncer le câble plat souple et nu directement dans les broches de la carte. En pratique, il vous faut quand même un connecteur FPC 12 broches, un support soudé ou une carte adaptatrice pour sortir les contacts du câble plat de façon fiable. La carte adaptatrice de cet article n'est qu'un adaptateur mécanique pour utiliser des câbles dupont ; ce n'est pas un circuit pilote dont l'écran aurait besoin pour fonctionner. Si vous câblez directement depuis un connecteur FPC, suivez les numéros PIN FPC du tableau ci-dessus — la correspondance des signaux est identique.

Le point où le câblage échoue le plus facilement : le code veut les numéros GPIO de la puce, pas les numéros imprimés dans la sérigraphie de la carte. Ici `D5 = GPIO8`, tandis que `GPIO11 = A4`. Si vous câblez MOSI sur GPIO11 par erreur, le programme tourne quand même et le moniteur série imprime joyeusement — pendant que l'écran reste aussi silencieux qu'une facture d'électricité impayée.

Après le câblage, revérifiez dans l'ordre « alimentation → masse commune → SCLK → MOSI → CS → DC → RESET » — cela économise environ 80 % du temps de débogage. Pour le FPC, confirmez aussi le sens d'insertion, qu'il est enfoncé à fond et verrouillé ; un cran de lâche peut paralyser tout l'écran.

## Bibliothèques à installer : seulement le package de cartes ESP32

Cette démo Arduino du ST7305 ne dépend ni d'U8g2, ni d'Adafruit GFX, ni de TFT_eSPI, ni d'aucune bibliothèque de polices supplémentaire. Le pilote, la police ASCII 5×7, les primitives graphiques et les 15 pages vivent dans un seul fichier `.ino`.

### Étape 1 : installer l'Arduino IDE

Cet article utilise Arduino IDE 2.3.8, téléchargeable sur le site officiel d'Arduino.

### Étape 2 : installer l'ESP32 Arduino Core

Ouvrez le Gestionnaire de cartes, cherchez et installez :

```text
esp32 by Espressif Systems (version testée dans cet article : 3.3.10)
```

Choisissez dans le Gestionnaire de cartes la même version que celle utilisée ici — cela minimise les différences d'API et de configuration par défaut entre packages de cartes.

### Étape 3 : sélectionner la carte et le port

```text
Carte : Arduino Nano ESP32
Port : choisir le port qui apparaît après connexion de la carte
Moniteur série : 115200
```

Le `SPI` standard d'Arduino, les timers et `esp_timer` viennent tous avec l'environnement de la carte — pas besoin d'aller dans le Gestionnaire de bibliothèques « installer au hasard quelques bibliothèques aux noms ressemblants ».

### En plus : et si vous préférez une bibliothèque existante ?

Ce tutoriel utilise un pilote en un seul fichier pour que l'initialisation, le framebuffer et le mapping de pixels restent directement lisibles — cela ne veut pas dire que le ST7305 ne peut pas utiliser de bibliothèque. Si vous voulez développer à partir de ce projet, considérez ces options :

| Option                                                       | Idéal pour                                | À surveiller lors de l'utilisation                           |
| ------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| [U8g2](https://github.com/olikraus/u8g2) v2.36 ou plus récent | Texte, graphiques de base et polices riches | Fournit `U8G2_ST7305_300X400_1_4W_HW_SPI`, avec support du SPI matériel 4 fils à cette résolution ; vérifier la version de la bibliothèque à l'installation et changer CS, DC, RESET et les broches SPI vers les GPIO utilisés dans cet article |
| [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library) | Si vous voulez un pilote Arduino dédié au ST7305 | Fournit des enveloppes comme `ST7305_4p2_BW_DisplayDriver` ; vérifiez la résolution, la séquence d'initialisation et la configuration des broches dans `DisplayConfig.h` — cet article ne l'a pas testée sur ce module |
| LVGL + pilote bas niveau ST7305                              | UI complexes, widgets et gestion de pages | LVGL s'occupe de l'UI et ne remplace pas le pilote du ST7305 ; il faut connecter le pilote de cet article (ou celui du fabricant) au callback de rafraîchissement de LVGL, et évaluer l'usage du framebuffer et le rafraîchissement réel |

Ne supposez pas que des bibliothèques graphiques génériques comme Adafruit GFX, TFT_eSPI ou Arduino_GFX piloteront le ST7305 dès l'installation — vérifiez d'abord si la version actuelle supporte explicitement ce contrôleur ; sinon, il faudra l'adapter vous-même. Même en changeant de bibliothèque, les contraintes matérielles — alimentation 3.3V, SPI 4 fils, HPM/LPM et le mapping de pixels de 2 lignes × 4 colonnes — ne disparaissent pas.

**Choix rapide :** surtout du texte et des graphiques de base → essayez U8g2 d'abord ; UI complexe → considérez LVGL ; contrôle total sur l'initialisation, l'envoi de trames complètes et le rythme d'animation → l'approche en un seul fichier de cet article est la plus directe.

## Code complet : programme Arduino en un seul fichier ST7305_RLCD_Demo

Code source complet et prêt à flasher :

```c
/*
 * ST7305 LCD monochrome totalement réflectif de 4,2" 300x400 — démo Arduino complète en un seul fichier
 *
 * Mêmes fonctions que la version ESP-IDF : pilote + primitives graphiques + démo carrousel automatique de 15 pages.
 * Tout le programme tient dans ce seul fichier .ino, sans dépendance à des bibliothèques tierces, facile à partager.
 *
 * Câblage (sérigraphie de l'Arduino Nano ESP32) :
 *   SCLK = GPIO10 (D7)   MOSI = GPIO8 (D5)   CS  = GPIO9 (D6)
 *   DC   = GPIO7  (D4)   RES  = GPIO6 (D3)   VCI = 3.3V  GND = GND
 *
 * Préparation de l'Arduino IDE :
 *   1. Installer "esp32 by Espressif Systems" dans le Gestionnaire de cartes
 *   2. Sélectionner la carte "Arduino Nano ESP32" et son port série
 *   3. Ce fichier doit se trouver dans un dossier du même nom (l'IDE le proposera à l'ouverture du .ino — cliquer "OK")
 */
#include <Arduino.h>
#include <SPI.h>
#include "esp_timer.h"   /* esp_timer_get_time() */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>

/* ================= Modifiable par l'utilisateur : broches et horloge SPI ================= */
#define PIN_SCLK        10
#define PIN_MOSI         8
#define PIN_CS           9
#define PIN_DC           7
#define PIN_RES          6
#define SPI_CLOCK_HZ     20000000UL   /* 20 MHz ; 20~30 MHz recommandé */

/* ================= Paramètres de base du ST7305 ================= */
#define ST7305_LCD_WIDTH      300
#define ST7305_LCD_HEIGHT     400
#define ST7305_DATA_WIDTH     75      /* 300/4 = 75 octets par ligne */
#define ST7305_BUFFER_LENGTH  15000   /* 75 * 200 */
#define ST7305_COLOR_WHITE    0x00
#define ST7305_COLOR_BLACK    0x01

#define LOGI(fmt, ...) Serial.printf("[st7305] " fmt "\r\n", ##__VA_ARGS__)

/* Périphérique pilote (instance unique, framebuffer de 15000 octets embarqué) */
typedef struct {
    int gpio_dc;
    int gpio_res;
    int gpio_cs;
    uint32_t clock_hz;
    uint8_t rotation;                      /* 0=0° 1=90° 2=180° 3=270° (sens horaire) */
    uint8_t buffer[ST7305_BUFFER_LENGTH];
} st7305_dev_t;

typedef st7305_dev_t *st7305_handle_t;

static st7305_dev_t lcd_dev;               /* instance globale unique */

static inline void dc_cmd(st7305_handle_t dev)  { digitalWrite(dev->gpio_dc, LOW); }
static inline void dc_data(st7305_handle_t dev) { digitalWrite(dev->gpio_dc, HIGH); }

static void spi_write_byte(st7305_handle_t dev, uint8_t data)
{
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.transfer(data);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/* Écrire un registre (commande) : DC=LOW */
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);
    spi_write_byte(dev, reg);
}

/* Écrire un paramètre (donnée) : DC=HIGH */
static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);
    spi_write_byte(dev, data);
}

static void write_params(st7305_handle_t dev, uint8_t reg, const uint8_t *params, size_t len)
{
    write_register(dev, reg);
    for (size_t i = 0; i < len; i++) write_parameter(dev, params[i]);
}

/**
 * Séquence d'initialisation du ST7305 : conforme au code d'initialisation haute fréquence de balayage du fabricant HSD 4,2" 300x400 ;
 * MADCTL=0x48 (MX=1, DO=1), délai de sleep-out de 255 ms, fenêtre de colonnes CASET 0x12~0x2B.
 */
static void initial_st7305(st7305_handle_t dev)
{
    /* reset matériel */
    digitalWrite(dev->gpio_res, HIGH); delay(10);
    digitalWrite(dev->gpio_res, LOW);  delay(10);
    digitalWrite(dev->gpio_res, HIGH); delay(10);

#define WR(reg, ...) do { \
        const uint8_t p[] = {__VA_ARGS__}; \
        write_params(dev, reg, p, sizeof(p)); \
    } while (0)

    WR(0xD6, 0x17, 0x02);   /* NVM Load Control */
    WR(0xD1, 0x01);         /* Booster Enable */
    WR(0xC0, 0x11, 0x04);   /* Gate Voltage: VGH=16.5V, VGL=-7V */
    WR(0xC1, 0x41, 0x41, 0x41, 0x41);  /* VSHP 5.0V x4 */
    WR(0xC2, 0x19, 0x19, 0x19, 0x19);  /* VSLP 0.5V x4 */
    WR(0xC4, 0x41, 0x41, 0x41, 0x41);  /* VSHN -3.8V x4 */
    WR(0xC5, 0x19, 0x19, 0x19, 0x19);  /* VSLN 0.5V x4 */
    WR(0xD8, 0xA6, 0xE9);   /* OSC: HPM~51Hz / LPM~1Hz */
    WR(0xB2, 0x05);         /* Frame Rate: HPM=16Hz, LPM=8Hz */
    WR(0xB3, 0xE5, 0xF6, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45); /* Gate EQ HPM */
    WR(0xB4, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45);             /* Gate EQ LPM */
    WR(0x62, 0x32, 0x03, 0x1F); /* Gate Timing Control */
    WR(0xB7, 0x13);         /* Source EQ Enable */
    WR(0xB0, 0x64);         /* Gate Line : 400 lignes (à configurer avant le Sleep-out) */

    write_register(dev, 0x11);  /* Sleep out */
    delay(255);

    WR(0xC9, 0x00);         /* Source Voltage Select : groupe 1 */
    WR(0x36, 0x48);         /* MADCTL: MX=1, DO=1 */
    WR(0x3A, 0x11);         /* Data Format: 3-write 24-bit */
    WR(0xB9, 0x20);         /* Mode Mono (héritage du fabricant) */
    WR(0xB8, 0x29);         /* Panel : dot_1 inversion + balayage Frame */

    write_register(dev, 0x21);  /* Inverse ON */

    /* WRITE RAM fenêtre d'adresses 300*400 */
    WR(0x2A, 0x12, 0x2B);   /* CASET */
    WR(0x2B, 0x00, 0xC7);   /* RASET 0~199 */
    WR(0x35, 0x00);         /* TE ON（V-Blank） */
    WR(0xD0, 0xFF);         /* Auto power down */

    write_register(dev, 0x39);  /* LPM */
    write_register(dev, 0x29);  /* DISPLAY ON */
#undef WR
}

st7305_handle_t st7305_init(int gpio_dc, int gpio_res, int gpio_cs,
                            int gpio_sclk, int gpio_mosi, uint32_t clock_hz)
{
    st7305_handle_t dev = &lcd_dev;
    dev->gpio_dc = gpio_dc;
    dev->gpio_res = gpio_res;
    dev->gpio_cs = gpio_cs;
    dev->clock_hz = clock_hz;
    dev->rotation = 0;

    pinMode(gpio_dc, OUTPUT);
    pinMode(gpio_res, OUTPUT);
    pinMode(gpio_cs, OUTPUT);
    digitalWrite(gpio_cs, HIGH);
    digitalWrite(gpio_res, HIGH);

    /* MOSI seul, pas de MISO ; CS piloté manuellement par logiciel */
    SPI.begin(gpio_sclk, -1, gpio_mosi, -1);

    initial_st7305(dev);
    memset(dev->buffer, 0, ST7305_BUFFER_LENGTH);
    LOGI("ST7305 init OK (%dx%d)", ST7305_LCD_WIDTH, ST7305_LCD_HEIGHT);
    return dev;
}

/** Remplir le framebuffer (0x00 = tout blanc / 0xFF = tout noir) */
void st7305_fill(st7305_handle_t dev, uint8_t data)
{
    memset(dev->buffer, data, ST7305_BUFFER_LENGTH);
}

/** Effacer le framebuffer (tout blanc) */
void st7305_clear(st7305_handle_t dev)
{
    st7305_fill(dev, 0x00);
}
/**
 * Définir l'orientation d'affichage : 0=0°, 1=90° horaire, 2=180°, 3=270° horaire.
 * La rotation est implémentée par le mapping des coordonnées du framebuffer ; à 90°/270° la résolution logique est 400x300.
 * N'affecte que le dessin ultérieur ; n'efface ni le framebuffer ni ne rafraîchit l'écran immédiatement.
 */
void st7305_set_rotation(st7305_handle_t dev, uint8_t rotation)
{
    if (rotation <= 3) dev->rotation = rotation;
}

/** Obtenir l'orientation actuelle (0~3) */
uint8_t st7305_get_rotation(st7305_handle_t dev)
{
    return dev->rotation;
}

/** Obtenir la largeur/hauteur logique de l'orientation actuelle */
int st7305_get_width(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
}

int st7305_get_height(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
}

/**
 * Les pixels logiques sont d'abord mappés vers les coordonnées physiques 300x400 selon l'orientation, puis écrits dans le framebuffer :
 *   Un octet (8 bits) correspond à 2 lignes × 4 colonnes de pixels :
 *     ligne0 : BIT7 BIT5 BIT3 BIT1   (bits pairs -> ligne suivante)
 *     ligne1 : BIT6 BIT4 BIT2 BIT0
 *   1 = noir, 0 = blanc
 */
void st7305_write_point(st7305_handle_t dev, int x, int y, uint16_t color)
{
    int logical_width = (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
    int logical_height = (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
    if (x < 0 || y < 0 || x >= logical_width || y >= logical_height) return;

    int physical_x;
    int physical_y;
    switch (dev->rotation) {
    case 1: /* 90° horaire, logique 400x300 */
        physical_x = ST7305_LCD_WIDTH - 1 - y;
        physical_y = x;
        break;
    case 2: /* 180°, logique 300x400 */
        physical_x = ST7305_LCD_WIDTH - 1 - x;
        physical_y = ST7305_LCD_HEIGHT - 1 - y;
        break;
    case 3: /* 270° horaire, logique 400x300 */
        physical_x = y;
        physical_y = ST7305_LCD_HEIGHT - 1 - x;
        break;
    default: /* 0°, logique 300x400 */
        physical_x = x;
        physical_y = y;
        break;
    }

    int real_x = physical_x / 4;
    int real_y = physical_y / 2;
    int index = real_y * ST7305_DATA_WIDTH + real_x;
    int one_two = physical_y % 2;          /* 0 ou 1 */
    int line_bit_4 = physical_x % 4;       /* 0~3 */
    int bit = 7 - (line_bit_4 * 2 + one_two);

    if (color) dev->buffer[index] |= (1 << bit);
    else dev->buffer[index] &= ~(1 << bit);
}

/** Définir la fenêtre d'adresses et émettre RAMWR */
static void set_address_window(st7305_handle_t dev)
{
    write_params(dev, 0x2A, (uint8_t[]){0x12, 0x2A}, 2); /* CASET 0x12~0x2A */
    write_params(dev, 0x2B, (uint8_t[]){0x00, 0xC7}, 2); /* RASET 0~199 */
    write_register(dev, 0x2C); /* RAMWR */
}

/** Rafraîchissement pleine trame : pousser le framebuffer de 15000 octets vers l'écran */
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);
    dc_data(dev);
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/** Entrer en mode basse consommation LPM (0x39) ; économe, la cadence de trames est fixée par B2h */
void st7305_low_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x39);
}

/** Entrer en mode haute consommation HPM (0x38) ; pour les contenus animés, 16/32 Hz */
void st7305_high_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x38);
}

/** Affichage on/off (0x29 / 0x28) */
void st7305_display_on(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x29 : 0x28);
}

/** Inversion on/off (0x21 / 0x20) ; un panneau normalement blanc a besoin de l'inversion pour afficher du noir */
void st7305_display_inversion(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x21 : 0x20);
}

/** Obtenir le pointeur du framebuffer (usage avancé : manipuler directement les données bitmap) */
uint8_t *st7305_get_buffer(st7305_handle_t dev)
{
    return dev->buffer;
}

/* ================= Primitives graphiques (portées depuis ST73XX_UI) ================= */

#define SWAP_INT(a, b) do { int _t = (a); (a) = (b); (b) = _t; } while (0)

void ui_draw_fast_hline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x + i, y, color);
}

void ui_draw_fast_vline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x, y + i, color);
}

void ui_draw_line(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    int dx = abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    int dy = -abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    int err = dx + dy, e2;

    while (1) {
        st7305_write_point(dev, x1, y1, color);
        if (x1 == x2 && y1 == y2) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
    }
}

void ui_draw_triangle(st7305_handle_t dev, int x1, int y1, int x2, int y2,
                      int x3, int y3, uint16_t color)
{
    ui_draw_line(dev, x1, y1, x2, y2, color);
    ui_draw_line(dev, x2, y2, x3, y3, color);
    ui_draw_line(dev, x3, y3, x1, y1, color);
}

void ui_draw_filled_triangle(st7305_handle_t dev, int x0, int y0, int x1, int y1,
                             int x2, int y2, uint16_t color)
{
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }
    if (y1 > y2) { SWAP_INT(y1, y2); SWAP_INT(x1, x2); }
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }

    if (y0 == y2) { /* fond plat */
        int xs = x0, xe = x0;
        if (x1 < xs) xs = x1;
        if (x1 > xe) xe = x1;
        if (x2 < xs) xs = x2;
        if (x2 > xe) xe = x2;
        ui_draw_fast_hline(dev, xs, y0, xe - xs + 1, color);
        return;
    }

    int total = y2 - y0;
    for (int i = 0; i <= total; i++) {
        int y = y0 + i;
        int second_half = (i > y1 - y0) || (y1 == y0);
        int seg = second_half ? (y2 - y1) : (y1 - y0);
        if (seg == 0) continue;
        int ax = x0 + (int)((x2 - x0) * (int64_t)i / total);
        int bx = second_half ? x1 + (int)((x2 - x1) * (int64_t)(i - (y1 - y0)) / seg)
                             : x0 + (int)((x1 - x0) * (int64_t)i / seg);
        if (ax > bx) SWAP_INT(ax, bx);
        ui_draw_fast_hline(dev, ax, y, bx - ax + 1, color);
    }
}

void ui_draw_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    ui_draw_fast_hline(dev, x1, y1, x2 - x1 + 1, color);
    ui_draw_fast_hline(dev, x1, y2, x2 - x1 + 1, color);
    ui_draw_fast_vline(dev, x1, y1, y2 - y1 + 1, color);
    ui_draw_fast_vline(dev, x2, y1, y2 - y1 + 1, color);
}

void ui_draw_filled_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    for (int y = y1; y <= y2; y++) {
        ui_draw_fast_hline(dev, x1, y, x2 - x1 + 1, color);
    }
}

void ui_draw_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    int x = 0, y = r, d = 3 - 2 * r;
    while (x <= y) {
        st7305_write_point(dev, xc + x, yc + y, color);
        st7305_write_point(dev, xc - x, yc + y, color);
        st7305_write_point(dev, xc + x, yc - y, color);
        st7305_write_point(dev, xc - x, yc - y, color);
        st7305_write_point(dev, xc + y, yc + x, color);
        st7305_write_point(dev, xc - y, yc + x, color);
        st7305_write_point(dev, xc + y, yc - x, color);
        st7305_write_point(dev, xc - y, yc - x, color);
        if (d < 0) {
            d += 4 * x + 6;
        } else {
            d += 4 * (x - y) + 10;
            y--;
        }
        x++;
    }
}
static int int_sqrt(int x)
{
    int r = 0;
    while ((r + 1) * (r + 1) <= x) r++;
    return r;
}

void ui_draw_filled_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    for (int y = -r; y <= r; y++) {
        int w = int_sqrt(r * r - y * y);
        ui_draw_fast_hline(dev, xc - w, yc + y, 2 * w + 1, color);
    }
}

void ui_draw_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;
    for (int i = 0; i < n; i++) {
        int x1 = points[2 * i], y1 = points[2 * i + 1];
        int x2 = points[2 * ((i + 1) % n)], y2 = points[2 * ((i + 1) % n) + 1];
        ui_draw_line(dev, x1, y1, x2, y2, color);
    }
}

void ui_draw_filled_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;

    int min_y = points[1], max_y = points[1];
    for (int i = 1; i < n; i++) {
        if (points[2 * i + 1] < min_y) min_y = points[2 * i + 1];
        if (points[2 * i + 1] > max_y) max_y = points[2 * i + 1];
    }

    int *xs = (int *)malloc(n * sizeof(int));
    if (!xs) return;

    /* remplissage par ligne de balayage */
    for (int y = min_y; y <= max_y; y++) {
        int cnt = 0;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            int yi = points[2 * i + 1], yj = points[2 * j + 1];
            int xi = points[2 * i], xj = points[2 * j];
            if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
                xs[cnt++] = xi + (int)((int64_t)(y - yi) * (xj - xi) / (yj - yi));
            }
        }
        /* tri par insertion */
        for (int i = 1; i < cnt; i++) {
            int key = xs[i], k = i - 1;
            while (k >= 0 && xs[k] > key) { xs[k + 1] = xs[k]; k--; }
            xs[k + 1] = key;
        }
        for (int i = 0; i + 1 < cnt; i += 2) {
            ui_draw_fast_hline(dev, xs[i], y, xs[i + 1] - xs[i] + 1, color);
        }
    }
    free(xs);
}

/* ================= Démo : carrousel automatique de 15 pages =================
 * Texte, niveaux de gris par tramage ordonné, motifs de test, benchmark de performance, échantillons d'UI et petites animations.
 * Sans polices ni ressources externes. */

#define W ST7305_LCD_WIDTH
#define H ST7305_LCD_HEIGHT
#define BLACK ST7305_COLOR_BLACK
#define WHITE ST7305_COLOR_WHITE
#define ARRAY_LEN(a) ((int)(sizeof(a) / sizeof((a)[0])))

/* Police classique ASCII 5x7, codage par colonnes, LSB en haut. */
static const uint8_t font5x7[96][5] = {
    {0x00,0x00,0x00,0x00,0x00},{0x00,0x00,0x5f,0x00,0x00},
    {0x00,0x07,0x00,0x07,0x00},{0x14,0x7f,0x14,0x7f,0x14},
    {0x24,0x2a,0x7f,0x2a,0x12},{0x23,0x13,0x08,0x64,0x62},
    {0x36,0x49,0x55,0x22,0x50},{0x00,0x05,0x03,0x00,0x00},
    {0x00,0x1c,0x22,0x41,0x00},{0x00,0x41,0x22,0x1c,0x00},
    {0x14,0x08,0x3e,0x08,0x14},{0x08,0x08,0x3e,0x08,0x08},
    {0x00,0x50,0x30,0x00,0x00},{0x08,0x08,0x08,0x08,0x08},
    {0x00,0x60,0x60,0x00,0x00},{0x20,0x10,0x08,0x04,0x02},
    {0x3e,0x51,0x49,0x45,0x3e},{0x00,0x42,0x7f,0x40,0x00},
    {0x42,0x61,0x51,0x49,0x46},{0x21,0x41,0x45,0x4b,0x31},
    {0x18,0x14,0x12,0x7f,0x10},{0x27,0x45,0x45,0x45,0x39},
    {0x3c,0x4a,0x49,0x49,0x30},{0x01,0x71,0x09,0x05,0x03},
    {0x36,0x49,0x49,0x49,0x36},{0x06,0x49,0x49,0x29,0x1e},
    {0x00,0x36,0x36,0x00,0x00},{0x00,0x56,0x36,0x00,0x00},
    {0x08,0x14,0x22,0x41,0x00},{0x14,0x14,0x14,0x14,0x14},
    {0x00,0x41,0x22,0x14,0x08},{0x02,0x01,0x51,0x09,0x06},
    {0x32,0x49,0x79,0x41,0x3e},{0x7e,0x11,0x11,0x11,0x7e},
    {0x7f,0x49,0x49,0x49,0x36},{0x3e,0x41,0x41,0x41,0x22},
    {0x7f,0x41,0x41,0x22,0x1c},{0x7f,0x49,0x49,0x49,0x41},
    {0x7f,0x09,0x09,0x09,0x01},{0x3e,0x41,0x49,0x49,0x7a},
    {0x7f,0x08,0x08,0x08,0x7f},{0x00,0x41,0x7f,0x41,0x00},
    {0x20,0x40,0x41,0x3f,0x01},{0x7f,0x08,0x14,0x22,0x41},
    {0x7f,0x40,0x40,0x40,0x40},{0x7f,0x02,0x0c,0x02,0x7f},
    {0x7f,0x04,0x08,0x10,0x7f},{0x3e,0x41,0x41,0x41,0x3e},
    {0x7f,0x09,0x09,0x09,0x06},{0x3e,0x41,0x51,0x21,0x5e},
    {0x7f,0x09,0x19,0x29,0x46},{0x46,0x49,0x49,0x49,0x31},
    {0x01,0x01,0x7f,0x01,0x01},{0x3f,0x40,0x40,0x40,0x3f},
    {0x1f,0x20,0x40,0x20,0x1f},{0x3f,0x40,0x38,0x40,0x3f},
    {0x63,0x14,0x08,0x14,0x63},{0x07,0x08,0x70,0x08,0x07},
    {0x61,0x51,0x49,0x45,0x43},{0x00,0x7f,0x41,0x41,0x00},
    {0x02,0x04,0x08,0x10,0x20},{0x00,0x41,0x41,0x7f,0x00},
    {0x04,0x02,0x01,0x02,0x04},{0x40,0x40,0x40,0x40,0x40},
    {0x00,0x01,0x02,0x04,0x00},{0x20,0x54,0x54,0x54,0x78},
    {0x7f,0x48,0x44,0x44,0x38},{0x38,0x44,0x44,0x44,0x20},
    {0x38,0x44,0x44,0x48,0x7f},{0x38,0x54,0x54,0x54,0x18},
    {0x08,0x7e,0x09,0x01,0x02},{0x0c,0x52,0x52,0x52,0x3e},
    {0x7f,0x08,0x04,0x04,0x78},{0x00,0x44,0x7d,0x40,0x00},
    {0x20,0x40,0x44,0x3d,0x00},{0x7f,0x10,0x28,0x44,0x00},
    {0x00,0x41,0x7f,0x40,0x00},{0x7c,0x04,0x18,0x04,0x78},
    {0x7c,0x08,0x04,0x04,0x78},{0x38,0x44,0x44,0x44,0x38},
    {0x7c,0x14,0x14,0x14,0x08},{0x08,0x14,0x14,0x18,0x7c},
    {0x7c,0x08,0x04,0x04,0x08},{0x48,0x54,0x54,0x54,0x20},
    {0x04,0x3f,0x44,0x40,0x20},{0x3c,0x40,0x40,0x20,0x7c},
    {0x1c,0x20,0x40,0x20,0x1c},{0x3c,0x40,0x30,0x40,0x3c},
    {0x44,0x28,0x10,0x28,0x44},{0x0c,0x50,0x50,0x50,0x3c},
    {0x44,0x64,0x54,0x4c,0x44},{0x00,0x08,0x36,0x41,0x00},
    {0x00,0x00,0x7f,0x00,0x00},{0x00,0x41,0x36,0x08,0x00},
    {0x08,0x04,0x08,0x10,0x08},{0x00,0x00,0x00,0x00,0x00}
};

static const uint8_t bayer4[4][4] = {
    {0, 8, 2, 10}, {12, 4, 14, 6}, {3, 11, 1, 9}, {15, 7, 13, 5}
};

static void text_char(st7305_handle_t d, int x, int y, char c, int scale, uint16_t color)
{
    if ((unsigned char)c < 32 || (unsigned char)c > 127) c = '?';
    const uint8_t *glyph = font5x7[(unsigned char)c - 32];
    for (int col = 0; col < 5; col++) {
        for (int row = 0; row < 7; row++) {
            if (glyph[col] & (1U << row)) {
                if (scale == 1) st7305_write_point(d, x + col, y + row, color);
                else ui_draw_filled_rectangle(d, x + col * scale, y + row * scale,
                    x + (col + 1) * scale - 1, y + (row + 1) * scale - 1, color);
            }
        }
    }
}

static void text(st7305_handle_t d, int x, int y, const char *s, int scale, uint16_t color)
{
    while (*s) {
        text_char(d, x, y, *s++, scale, color);
        x += 6 * scale;
    }
}

static int text_width(const char *s, int scale)
{
    int n = (int)strlen(s);
    return n ? (n * 6 - 1) * scale : 0;
}
static void text_center(st7305_handle_t d, int y, const char *s, int scale, uint16_t color)
{
    text(d, (W - text_width(s, scale)) / 2, y, s, scale, color);
}

static void gray_rect(st7305_handle_t d, int x0, int y0, int x1, int y1, int level)
{
    if (x0 > x1) { int t = x0; x0 = x1; x1 = t; }
    if (y0 > y1) { int t = y0; y0 = y1; y1 = t; }
    if (level <= 0) return;
    if (level >= 16) {
        ui_draw_filled_rectangle(d, x0, y0, x1, y1, BLACK);
        return;
    }
    for (int y = y0; y <= y1; y++) {
        for (int x = x0; x <= x1; x++) {
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, x, y, BLACK);
        }
    }
}

static void gray_circle(st7305_handle_t d, int cx, int cy, int r, int level)
{
    for (int y = -r; y <= r; y++) {
        for (int x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r && level > bayer4[(cy + y) & 3][(cx + x) & 3]) {
                st7305_write_point(d, cx + x, cy + y, BLACK);
            }
        }
    }
}

static void hline(st7305_handle_t d, int x0, int x1, int y, uint16_t color)
{
    ui_draw_fast_hline(d, x0, y, x1 - x0 + 1, color);
}

static void vline(st7305_handle_t d, int x, int y0, int y1, uint16_t color)
{
    ui_draw_fast_vline(d, x, y0, y1 - y0 + 1, color);
}

static void chrome(st7305_handle_t d, int page, const char *title, const char *subtitle)
{
    char buf[24];
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 31, BLACK);
    text(d, 8, 8, title, 2, WHITE);
    snprintf(buf, sizeof(buf), "%02d/15", page + 1);
    text(d, 251, 11, buf, 1, WHITE);
    text(d, 8, 39, subtitle, 1, BLACK);
    hline(d, 0, W - 1, 51, BLACK);
    hline(d, 8, W - 9, 376, BLACK);
    text(d, 8, 384, "ST7305 RLCD TEST SUITE", 1, BLACK);
    for (int i = 0; i < 15; i++) {
        int x = 210 + i * 6;
        if (i == page) ui_draw_filled_rectangle(d, x, 385, x + 3, 391, BLACK);
        else ui_draw_rectangle(d, x, 385, x + 3, 391, BLACK);
    }
}

static uint32_t rng_state = 0x7305u;
static uint32_t demo_rand(void)
{
    rng_state ^= rng_state << 13;
    rng_state ^= rng_state >> 17;
    rng_state ^= rng_state << 5;
    return rng_state;
}

static int wave(int tick, int period)
{
    int p = tick % (period * 2);
    return p < period ? p : period * 2 - p;
}

static void page_hello(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 2);
    ui_draw_filled_rectangle(d, 12, 12, 287, 387, WHITE);
    ui_draw_rectangle(d, 12, 12, 287, 387, BLACK);
    ui_draw_rectangle(d, 16, 16, 283, 383, BLACK);
    text_center(d, 54, "ST7305  /  RLCD", 2, BLACK);
    hline(d, 42, 258, 82, BLACK);
    text_center(d, 112, "HELLO", 7, BLACK);
    text_center(d, 174, "WORLD!", 7, BLACK);
    text_center(d, 247, "300 x 400  MONOCHROME", 2, BLACK);
    text_center(d, 278, "15 PAGES / AUTO CAROUSEL", 1, BLACK);
    gray_circle(d, 150, 330, 28, 5);
    ui_draw_circle(d, 150, 330, 29, BLACK);
    ui_draw_filled_circle(d, 140, 321, 3, BLACK);
    ui_draw_filled_circle(d, 160, 321, 3, BLACK);
    ui_draw_line(d, 136, 338, 142, 343, BLACK);
    ui_draw_line(d, 142, 343, 158, 343, BLACK);
    ui_draw_line(d, 158, 343, 164, 338, BLACK);
}

static void page_gray(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 1, "DITHER GRAY", "17 LEVELS / STATIC 4x4 BAYER MATRIX");
    for (int i = 0; i < 17; i++) {
        int x = 14 + i * 16;
        gray_rect(d, x, 72, x + 14, 128, i);
        ui_draw_rectangle(d, x, 72, x + 14, 128, BLACK);
    }
    text(d, 14, 136, "0%", 1, BLACK);
    text(d, 139, 136, "50", 1, BLACK);
    text(d, 259, 136, "100%", 1, BLACK);
    text(d, 14, 159, "GRADIENT", 1, BLACK);
    for (int y = 0; y < 36; y++) {
        for (int x = 0; x < 272; x++) {
            int level = x / 17;
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, 14 + x, 176 + y, BLACK);
        }
    }
    ui_draw_rectangle(d, 13, 175, 286, 212, BLACK);
    text(d, 14, 230, "DITHERED FILLS FOR UI DEPTH", 1, BLACK);
    gray_circle(d, 58, 294, 39, 3);
    gray_circle(d, 150, 294, 39, 7);
    gray_circle(d, 242, 294, 39, 12);
    ui_draw_circle(d, 58, 294, 40, BLACK);
    ui_draw_circle(d, 150, 294, 40, BLACK);
    ui_draw_circle(d, 242, 294, 40, BLACK);
    text_center(d, 347, "NO GRAY PIXELS - JUST BLACK + WHITE", 1, BLACK);
}

static void page_geometry(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 2, "GEOMETRY", "LINES / CIRCLES / TRIANGLES / POLYGONS");
    ui_draw_line(d, 12, 65, 285, 350, BLACK);
    ui_draw_line(d, 285, 65, 12, 350, BLACK);
    ui_draw_rectangle(d, 20, 75, 126, 164, BLACK);
    gray_rect(d, 23, 78, 123, 161, 4);
    ui_draw_filled_rectangle(d, 43, 97, 104, 139, BLACK);
    ui_draw_circle(d, 213, 122, 48, BLACK);
    ui_draw_circle(d, 213, 122, 38, BLACK);
    gray_circle(d, 213, 122, 27, 8);
    ui_draw_triangle(d, 24, 323, 87, 188, 143, 323, BLACK);
    ui_draw_filled_triangle(d, 176, 310, 219, 212, 271, 310, BLACK);
    const int p[] = {152,77, 168,95, 162,117, 143,117, 136,95};
    ui_draw_filled_polygon(d, p, 5, BLACK);
    text_center(d, 348, "BRESENHAM + SCANLINE FILL", 1, BLACK);
}

static void page_grid(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 3, "PIXEL GRID", "CHECK EDGES, ASPECT RATIO AND DIAGONALS");
    ui_draw_rectangle(d, 0, 58, 299, 367, BLACK);
    for (int x = 19; x < W; x += 20) gray_rect(d, x, 59, x, 366, 4);
    for (int y = 78; y < 367; y += 20) gray_rect(d, 1, y, 298, y, 4);
    ui_draw_line(d, 0, 58, 299, 367, BLACK);
    ui_draw_line(d, 299, 58, 0, 367, BLACK);
    ui_draw_circle(d, 150, 213, 100, BLACK);
    ui_draw_rectangle(d, 50, 113, 250, 313, BLACK);
    ui_draw_filled_rectangle(d, 0, 58, 5, 63, BLACK);
    ui_draw_filled_rectangle(d, 294, 58, 299, 63, BLACK);
    ui_draw_filled_rectangle(d, 0, 362, 5, 367, BLACK);
    ui_draw_filled_rectangle(d, 294, 362, 299, 367, BLACK);
    ui_draw_filled_rectangle(d, 145, 208, 155, 218, WHITE);
    ui_draw_rectangle(d, 145, 208, 155, 218, BLACK);
}

static void page_text(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 4, "TEXT & FONT", "BUILT-IN 5x7 ASCII / INTEGER SCALING");
    text_center(d, 69, "BIG TEXT 2X", 2, BLACK);
    text_center(d, 96, "HUGE 4X", 4, BLACK);
    hline(d, 18, 281, 135, BLACK);
    text(d, 14, 148, "Regular: ABCDEFGHIJKLM", 1, BLACK);
    text(d, 14, 162, "         NOPQRSTUVWXYZ", 1, BLACK);
    text(d, 14, 179, "Lower:  abcdefghijklm", 1, BLACK);
    text(d, 14, 193, "        nopqrstuvwxyz", 1, BLACK);
    text(d, 14, 214, "Digits: 0123456789", 2, BLACK);
    text(d, 14, 241, "Symbols: !#$%&*+-/<=>?", 1, BLACK);
    gray_rect(d, 14, 265, 285, 304, 12);
    text_center(d, 273, "DITHERED TEXT PANEL", 2, BLACK);
    ui_draw_filled_rectangle(d, 14, 318, 285, 348, BLACK);
    text_center(d, 327, "REVERSED TEXT", 2, WHITE);
    text_center(d, 359, "NO EXTERNAL FONT REQUIRED", 1, BLACK);
}
static void draw_toggle(st7305_handle_t d, int x, int y, bool on)
{
    ui_draw_rectangle(d, x, y, x + 35, y + 16, BLACK);
    if (on) {
        ui_draw_filled_rectangle(d, x + 2, y + 2, x + 32, y + 14, BLACK);
        ui_draw_filled_circle(d, x + 26, y + 8, 5, WHITE);
    } else {
        ui_draw_filled_circle(d, x + 9, y + 8, 5, BLACK);
    }
}

static void page_ui(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 5, "DESKTOP UI", "DITHERED CARDS / GAUGES / LIVE WIDGETS");
    gray_rect(d, 17, 67, 188, 191, 5);
    ui_draw_filled_rectangle(d, 13, 63, 184, 187, WHITE);
    ui_draw_rectangle(d, 13, 63, 184, 187, BLACK);
    text(d, 23, 74, "ENVIRONMENT", 2, BLACK);
    hline(d, 23, 174, 96, BLACK);
    text(d, 23, 109, "23.6", 4, BLACK);
    text(d, 107, 109, "C", 2, BLACK);
    text(d, 23, 145, "HUMIDITY  48%", 1, BLACK);
    text(d, 23, 161, "PRESSURE  1013", 1, BLACK);

    gray_rect(d, 200, 67, 290, 191, 7);
    ui_draw_filled_rectangle(d, 196, 63, 286, 187, WHITE);
    ui_draw_rectangle(d, 196, 63, 286, 187, BLACK);
    text(d, 207, 74, "POWER", 1, BLACK);
    int battery = 20 + wave(frame, 40) * 70 / 40;
    ui_draw_rectangle(d, 210, 99, 267, 121, BLACK);
    ui_draw_filled_rectangle(d, 267, 104, 271, 116, BLACK);
    ui_draw_filled_rectangle(d, 213, 102, 213 + battery * 50 / 100, 118, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%d%%", battery);
    text(d, 241 - text_width(buf, 2) / 2, 134, buf, 2, BLACK);
    text(d, 207, 160, "SOLAR  ON", 1, BLACK);

    ui_draw_filled_rectangle(d, 13, 204, 286, 294, WHITE);
    ui_draw_rectangle(d, 13, 204, 286, 294, BLACK);
    text(d, 24, 216, "SYSTEM ACTIVITY", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        int value = 12 + wave(frame + i * 17, 50) * 180 / 50;
        text(d, 24, 240 + i * 16, i == 0 ? "CPU" : (i == 1 ? "MEM" : "SPI"), 1, BLACK);
        gray_rect(d, 62, 240 + i * 16, 256, 248 + i * 16, 3);
        ui_draw_filled_rectangle(d, 62, 240 + i * 16, 62 + value, 248 + i * 16, BLACK);
    }
    text(d, 22, 316, "WIFI", 1, BLACK);
    draw_toggle(d, 63, 311, true);
    text(d, 118, 316, "SYNC", 1, BLACK);
    draw_toggle(d, 160, 311, (frame / 12) & 1);
    text(d, 215, 316, "LIVE", 1, BLACK);
    if ((frame / 4) & 1) ui_draw_filled_circle(d, 276, 319, 5, BLACK);
    else ui_draw_circle(d, 276, 319, 5, BLACK);
    text_center(d, 351, "A TINY REFLECTIVE DASHBOARD", 1, BLACK);
}

typedef struct {
    uint32_t last_us;
    uint32_t average_us;
    uint16_t history[54];
    int history_pos;
} perf_t;
static perf_t perf;

static void perf_record(uint32_t elapsed_us)
{
    perf.last_us = elapsed_us;
    perf.average_us = perf.average_us ? (perf.average_us * 7 + elapsed_us) / 8 : elapsed_us;
    perf.history[perf.history_pos] = (uint16_t)(elapsed_us / 100);
    perf.history_pos = (perf.history_pos + 1) % ARRAY_LEN(perf.history);
}

static void page_fps(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 6, "FRAME RATE", "UNTHROTTLED FULL-FRAME DRAW + SPI BENCHMARK");
    char buf[40];
    uint32_t avg = perf.average_us ? perf.average_us : 1;
    uint32_t fps10 = 10000000UL / avg;
    snprintf(buf, sizeof(buf), "%lu.%lu FPS", (unsigned long)(fps10 / 10), (unsigned long)(fps10 % 10));
    text_center(d, 66, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "LAST %lu.%lu ms   AVG %lu.%lu ms",
        (unsigned long)(perf.last_us / 1000), (unsigned long)((perf.last_us % 1000) / 100),
        (unsigned long)(avg / 1000), (unsigned long)((avg % 1000) / 100));
    text_center(d, 108, buf, 1, BLACK);
    text(d, 16, 132, "UPDATE TIME HISTORY", 1, BLACK);
    ui_draw_rectangle(d, 15, 148, 285, 254, BLACK);
    gray_rect(d, 16, 174, 284, 174, 3);
    gray_rect(d, 16, 201, 284, 201, 3);
    gray_rect(d, 16, 227, 284, 227, 3);
    int previous_x = -1, previous_y = -1;
    for (int i = 0; i < ARRAY_LEN(perf.history); i++) {
        int index = (perf.history_pos + i) % ARRAY_LEN(perf.history);
        int value = perf.history[index];
        int y = 250 - value * 95 / 150;
        if (y < 151) y = 151;
        if (y > 250) y = 250;
        int x = 20 + i * 5;
        ui_draw_filled_circle(d, x, y, 1, BLACK);
        if (previous_x >= 0) ui_draw_line(d, previous_x, previous_y, x, y, BLACK);
        previous_x = x; previous_y = y;
    }
    snprintf(buf, sizeof(buf), "FRAME: %d", frame + 1);
    text(d, 17, 271, buf, 1, BLACK);
    text(d, 17, 291, "15000 BYTES PER UPDATE", 2, BLACK);
    text(d, 17, 317, "SPI: 20 MHz   PANEL: 16 Hz", 1, BLACK);
    text(d, 17, 337, "CPU number is bus throughput,", 1, BLACK);
    text(d, 17, 351, "not the optical panel limit.", 1, BLACK);
    int scan = 20 + (frame * 7) % 260;
    vline(d, scan, 149, 253, BLACK);
    (void)elapsed;
}

static void page_patterns(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 7, "FINE PATTERNS", "1/2/4 PIXEL CHECKERS + LINE RESOLUTION");
    int phase = frame & 1;
    const int boxes[4][4] = {{12,66,146,184},{153,66,287,184},{12,194,146,332},{153,194,287,332}};
    for (int b = 0; b < 4; b++) {
        for (int y = boxes[b][1]; y <= boxes[b][3]; y++) {
            for (int x = boxes[b][0]; x <= boxes[b][2]; x++) {
                bool black = false;
                if (b == 0) black = ((x ^ y) & 1) == phase;
                if (b == 1) black = (((x / 2) ^ (y / 2)) & 1) == phase;
                if (b == 2) black = (((x / 4) ^ (y / 4)) & 1) == phase;
                if (b == 3) black = ((x + phase) % 4 == 0) || ((y + phase) % 4 == 0);
                if (black) st7305_write_point(d, x, y, BLACK);
            }
        }
        ui_draw_rectangle(d, boxes[b][0] - 1, boxes[b][1] - 1, boxes[b][2] + 1, boxes[b][3] + 1, BLACK);
    }
    text_center(d, 343, "CHECKER / 2PX / 4PX / GRID", 1, BLACK);
    text_center(d, 358, phase ? "PHASE B - CHECK FOR FLICKER" : "PHASE A - CHECK FOR FLICKER", 1, BLACK);
}

static struct { int x, y, vx, vy, hits; } bounce;

static void page_bounce(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 8, "BOUNCE TEST", "MOVEMENT, COLLISIONS AND PANEL GHOSTING");
    const int left = 10, right = 289, top = 65, bottom = 355;
    ui_draw_rectangle(d, left, top, right, bottom, BLACK);
    for (int y = top + 10; y < bottom; y += 20) gray_rect(d, left + 1, y, right - 1, y, 2);
    if (frame > 0) {
        bounce.x += bounce.vx;
        bounce.y += bounce.vy;
        if (bounce.x <= left + 2 || bounce.x + 91 >= right - 1) {
            bounce.vx = -bounce.vx;
            bounce.x += bounce.vx * 2;
            bounce.hits++;
        }
        if (bounce.y <= top + 2 || bounce.y + 43 >= bottom - 1) {
            bounce.vy = -bounce.vy;
            bounce.y += bounce.vy * 2;
            bounce.hits++;
        }
    }
    gray_rect(d, bounce.x + 5, bounce.y + 5, bounce.x + 96, bounce.y + 48, 5);
    ui_draw_filled_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, WHITE);
    ui_draw_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, BLACK);
    text(d, bounce.x + 9, bounce.y + 10, "RLCD", 3, BLACK);
    char buf[24];
    snprintf(buf, sizeof(buf), "WALL HITS: %d", bounce.hits);
    text_center(d, 360, buf, 1, BLACK);
}

#define STAR_COUNT 56
static struct { int x, y, z; } stars[STAR_COUNT];

static void star_reset(int i, bool initial)
{
    stars[i].x = (int)(demo_rand() % 401) - 200;
    stars[i].y = (int)(demo_rand() % 401) - 200;
    stars[i].z = initial ? 30 + (int)(demo_rand() % 220) : 250;
}
static void page_stars(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    ui_draw_filled_rectangle(d, 0, 0, W - 1, H - 1, BLACK);
    text(d, 10, 12, "STARFIELD", 2, WHITE);
    text(d, 190, 17, "56 STARS / HPM", 1, WHITE);
    hline(d, 10, 289, 38, WHITE);
    for (int i = 0; i < STAR_COUNT; i++) {
        int old_z = stars[i].z;
        stars[i].z -= 7;
        if (stars[i].z < 20) star_reset(i, false);
        int z = stars[i].z;
        int x = 150 + stars[i].x * 110 / z;
        int y = 207 + stars[i].y * 110 / z;
        int ox = 150 + stars[i].x * 110 / old_z;
        int oy = 207 + stars[i].y * 110 / old_z;
        if (x > 2 && x < 297 && y > 44 && y < 370) {
            ui_draw_line(d, ox, oy, x, y, WHITE);
            if (z < 80) ui_draw_filled_circle(d, x, y, 2, WHITE);
            else st7305_write_point(d, x, y, WHITE);
        }
    }
    hline(d, 10, 289, 377, WHITE);
    text(d, 10, 385, "WARP THROUGH A MONOCHROME GALAXY", 1, WHITE);
}

#define LIFE_W 34
#define LIFE_H 34
static uint8_t life[LIFE_H][LIFE_W];
static uint8_t life_next[LIFE_H][LIFE_W];
static int generation;

static void life_seed(void)
{
    memset(life, 0, sizeof(life));
    rng_state = 0x42030040u;
    for (int y = 2; y < LIFE_H - 2; y++) {
        for (int x = 2; x < LIFE_W - 2; x++) life[y][x] = (demo_rand() % 100) < 28;
    }
    generation = 0;
}

static void life_step(void)
{
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            int neighbors = 0;
            for (int dy = -1; dy <= 1; dy++) {
                for (int dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    int yy = (y + dy + LIFE_H) % LIFE_H;
                    int xx = (x + dx + LIFE_W) % LIFE_W;
                    neighbors += life[yy][xx];
                }
            }
            life_next[y][x] = neighbors == 3 || (neighbors == 2 && life[y][x]);
        }
    }
    memcpy(life, life_next, sizeof(life));
    generation++;
}

static void page_life(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 10, "GAME OF LIFE", "CONWAY CELLULAR AUTOMATON / TORUS WORLD");
    if (frame > 0) life_step();
    const int cell = 8, ox = 14, oy = 62;
    gray_rect(d, ox - 3, oy - 3, ox + LIFE_W * cell + 1, oy + LIFE_H * cell + 1, 3);
    ui_draw_rectangle(d, ox - 2, oy - 2, ox + LIFE_W * cell, oy + LIFE_H * cell, BLACK);
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            if (life[y][x]) ui_draw_filled_rectangle(d, ox + x * cell + 1, oy + y * cell + 1,
                ox + x * cell + 6, oy + y * cell + 6, BLACK);
        }
    }
    char buf[32];
    snprintf(buf, sizeof(buf), "GENERATION %d", generation);
    text_center(d, 352, buf, 1, BLACK);
}

static void page_clock(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 11, "UPTIME CLOCK", "ESP-TIMER / NO RTC OR NETWORK REQUIRED");
    int total = (int)(elapsed / 1000000);
    int seconds = total % 60, minutes = (total / 60) % 60, hours = total / 3600;
    int cx = 150, cy = 177, radius = 101;
    ui_draw_circle(d, cx, cy, radius, BLACK);
    ui_draw_circle(d, cx, cy, radius - 2, BLACK);
    for (int i = 0; i < 60; i++) {
        /* table de repères sens horaire ; évite les flottants et libm. */
        static const int8_t sx[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
        static const int8_t sy[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
        if (i % 5 == 0) {
            int k = i / 5;
            int x = cx + sx[k] * 88 / 100, y = cy + sy[k] * 88 / 100;
            ui_draw_filled_circle(d, x, y, 3, BLACK);
        }
    }
    static const int8_t sec_x[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
    static const int8_t sec_y[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
    int sk = (seconds / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[sk] * 76 / 100, cy + sec_y[sk] * 76 / 100, BLACK);
    int mk = (minutes / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[mk] * 53 / 100, cy + sec_y[mk] * 53 / 100, BLACK);
    ui_draw_filled_circle(d, cx, cy, 5, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%02d:%02d:%02d", hours, minutes, seconds);
    text_center(d, 301, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "RENDER FRAME %d", frame + 1);
    text_center(d, 343, buf, 1, BLACK);
    text_center(d, 359, "1-BIT DOES NOT MEAN BORING", 1, BLACK);
}

static void tiny_mac(st7305_handle_t d, int x, int y)
{
    ui_draw_rectangle(d, x, y, x + 37, y + 47, BLACK);
    ui_draw_filled_rectangle(d, x + 4, y + 4, x + 33, y + 31, BLACK);
    ui_draw_filled_rectangle(d, x + 6, y + 6, x + 31, y + 29, WHITE);
    ui_draw_filled_rectangle(d, x + 11, y + 12, x + 13, y + 15, BLACK);
    ui_draw_filled_rectangle(d, x + 24, y + 12, x + 26, y + 15, BLACK);
    ui_draw_line(d, x + 12, y + 23, x + 16, y + 25, BLACK);
    ui_draw_line(d, x + 16, y + 25, x + 22, y + 25, BLACK);
    ui_draw_line(d, x + 22, y + 25, x + 26, y + 23, BLACK);
    ui_draw_filled_rectangle(d, x + 7, y + 38, x + 23, y + 41, BLACK);
}

static void page_retro(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 3);
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 21, WHITE);
    hline(d, 0, W - 1, 22, BLACK);
    text(d, 9, 7, "*  File  Edit  View  Special", 1, BLACK);
    text(d, 258, 7, "12:00", 1, BLACK);
    text(d, 181, 34, "RLCD OS", 2, BLACK);
    text(d, 184, 55, "System 1.0", 1, BLACK);
    tiny_mac(d, 228, 77);

    gray_rect(d, 17, 39, 212, 278, 8);
    ui_draw_filled_rectangle(d, 12, 34, 207, 273, WHITE);
    ui_draw_rectangle(d, 12, 34, 207, 273, BLACK);
    ui_draw_filled_rectangle(d, 13, 35, 206, 51, BLACK);
    text(d, 54, 39, "CONTROL PANEL", 1, WHITE);
    ui_draw_rectangle(d, 16, 38, 20, 47, WHITE);
    text(d, 24, 65, "Desktop Pattern", 1, BLACK);
    for (int y = 0; y < 36; y++) for (int x = 0; x < 56; x++) {
        if (((x / 4) ^ (y / 4)) & 1) st7305_write_point(d, 25 + x, 82 + y, BLACK);
    }
    gray_rect(d, 94, 82, 177, 117, 6);
    ui_draw_rectangle(d, 24, 81, 81, 118, BLACK);
    ui_draw_rectangle(d, 93, 81, 178, 118, BLACK);
    hline(d, 22, 196, 130, BLACK);
    text(d, 24, 141, "Double-Click Speed", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        ui_draw_rectangle(d, 26 + i * 51, 163, 37 + i * 51, 174, BLACK);
        if (i == 1) ui_draw_filled_rectangle(d, 28 + i * 51, 165, 35 + i * 51, 172, BLACK);
    }
    text(d, 24, 190, "Key Repeat Rate", 1, BLACK);
    gray_rect(d, 25, 211, 187, 218, 4);
    ui_draw_filled_rectangle(d, 25, 211, 110, 218, BLACK);
    ui_draw_rectangle(d, 25, 210, 188, 219, BLACK);
    text(d, 24, 237, "Reflective. Silent. Timeless.", 1, BLACK);

    ui_draw_filled_rectangle(d, 24, 294, 195, 353, WHITE);
    ui_draw_rectangle(d, 24, 294, 195, 353, BLACK);
    ui_draw_filled_rectangle(d, 25, 295, 194, 310, BLACK);
    text(d, 65, 299, "HELLO, WORLD!", 1, WHITE);
    text(d, 36, 322, "1 bit. Infinite ideas.", 1, BLACK);
    text(d, 36, 338, "OK", 1, BLACK);
    ui_draw_rectangle(d, 135, 324, 180, 344, BLACK);

    text(d, 236, 348, "TRASH", 1, BLACK);
    ui_draw_rectangle(d, 244, 305, 265, 337, BLACK);
    hline(d, 240, 269, 302, BLACK);
    vline(d, 250, 309, 333, BLACK);
    vline(d, 258, 309, 333, BLACK);
}
static void page_inverse(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 13, "BLACK & WHITE", "POLARITY / CONTRAST / FULL-SCREEN INVERSION");
    bool invert = (frame / 2) & 1;
    if (!invert) {
        ui_draw_filled_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "BLACK", 6, WHITE);
        text_center(d, 155, "ON", 4, WHITE);
        text_center(d, 205, "WHITE", 6, WHITE);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, WHITE);
        text_center(d, 289, "REVERSED", 3, BLACK);
    } else {
        ui_draw_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "WHITE", 6, BLACK);
        text_center(d, 155, "ON", 4, BLACK);
        text_center(d, 205, "BLACK", 6, BLACK);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, BLACK);
        text_center(d, 289, "REVERSED", 3, WHITE);
    }
    text_center(d, 357, invert ? "PHASE B" : "PHASE A", 1, BLACK);
}

static void page_rotation(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame;
    static const int angles[4] = {0, 90, 180, 270};
    uint8_t rotation = (uint8_t)((elapsed / 3000000) & 3);
    st7305_set_rotation(d, rotation);

    int width = st7305_get_width(d);
    int height = st7305_get_height(d);
    int cx = width / 2;
    int cy = height / 2 - 5;
    char buf[40];

    ui_draw_rectangle(d, 0, 0, width - 1, height - 1, BLACK);
    ui_draw_filled_rectangle(d, 0, 0, width - 1, 39, BLACK);
    snprintf(buf, sizeof(buf), "ROTATION %d DEG", angles[rotation]);
    text(d, (width - text_width(buf, 2)) / 2, 11, buf, 2, WHITE);
    snprintf(buf, sizeof(buf), "LOGICAL %d x %d / FRAMEBUFFER MAPPING", width, height);
    text(d, (width - text_width(buf, 1)) / 2, 50, buf, 1, BLACK);

    /* flèche asymétrique + marques aux quatre coins rendent chaque orientation sans ambiguïté. */
    ui_draw_circle(d, cx, cy, 43, BLACK);
    ui_draw_line(d, cx, cy + 25, cx, cy - 28, BLACK);
    ui_draw_line(d, cx, cy - 28, cx - 13, cy - 14, BLACK);
    ui_draw_line(d, cx, cy - 28, cx + 13, cy - 14, BLACK);
    text(d, cx - text_width("UP", 2) / 2, cy - 10, "UP", 2, BLACK);
    snprintf(buf, sizeof(buf), "%d", angles[rotation]);
    text(d, cx - text_width(buf, 6) / 2, cy + 57, buf, 6, BLACK);

    text(d, 12, 70, "A / TOP LEFT", 1, BLACK);
    text(d, width - 12 - text_width("B / TOP RIGHT", 1), 70, "B / TOP RIGHT", 1, BLACK);
    text(d, 12, height - 39, "C / BOTTOM LEFT", 1, BLACK);
    text(d, width - 12 - text_width("D / BOTTOM RIGHT", 1), height - 39,
        "D / BOTTOM RIGHT", 1, BLACK);
    ui_draw_filled_rectangle(d, 3, 3, 9, 9, WHITE);
    ui_draw_filled_rectangle(d, width - 10, height - 10, width - 4, height - 4, BLACK);
    hline(d, 12, width - 13, height - 25, BLACK);
    text(d, (width - text_width("AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1)) / 2,
        height - 15, "AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1, BLACK);
}

typedef void (*page_draw_t)(st7305_handle_t, int, int64_t);
typedef struct {
    const char *name;
    page_draw_t draw;
    uint32_t duration_ms;
    uint16_t target_fps; /* 0 = ne rendre qu'une fois, 65535 = sans limite */
} demo_page_t;

static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    {"Geometry", page_geometry, 5000, 0},
    {"Pixel grid", page_grid, 5000, 0},
    {"Text", page_text, 5500, 0},
    {"Dashboard UI", page_ui, 9000, 4},
    {"Frame rate", page_fps, 8500, UINT16_MAX},
    {"Fine patterns", page_patterns, 6000, 2},
    {"Bounce", page_bounce, 9000, 20},
    {"Starfield", page_stars, 9000, 20},
    {"Game of Life", page_life, 12000, 3},
    {"Uptime clock", page_clock, 9000, 4},
    {"Retro desktop", page_retro, 6500, 0},
    {"Inversion", page_inverse, 6000, 2},
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};

static void page_reset(int page)
{
    if (page == 6) memset(&perf, 0, sizeof(perf));
    if (page == 8) bounce = (typeof(bounce)){25, 85, 3, 2, 0};
    if (page == 9) {
        rng_state = 0x51a7f13du;
        for (int i = 0; i < STAR_COUNT; i++) star_reset(i, true);
    }
    if (page == 10) life_seed();
}

void lcd_demo_run(st7305_handle_t lcd)
{
    if (!lcd) return;
    int page = 0;
    while (1) {
        const demo_page_t *p = &pages[page];
        st7305_set_rotation(lcd, 0);
        page_reset(page);
        LOGI("Page %d/%d: %s", page + 1, ARRAY_LEN(pages), p->name);
        int64_t started = (int64_t)esp_timer_get_time();
        uint32_t wake = millis();
        int frame = 0;
        while (1) {
            int64_t draw_started = (int64_t)esp_timer_get_time();
            st7305_clear(lcd);
            p->draw(lcd, frame, draw_started - started);
            st7305_display(lcd);
            perf_record((uint32_t)(esp_timer_get_time() - draw_started));

            if (p->target_fps == 0) {
                delay(p->duration_ms);
                break;
            }
            frame++;
            if (esp_timer_get_time() - started >= (int64_t)p->duration_ms * 1000) break;
            if (p->target_fps != UINT16_MAX) {
                uint32_t interval = 1000 / p->target_fps;
                if (!interval) interval = 1;
                wake += interval;
                int32_t wait = (int32_t)(wake - millis());
                if (wait > 0) delay(wait);
            }
            yield();
        }
        page = (page + 1) % ARRAY_LEN(pages);
    }
}

/* ================= Points d'entrée Arduino ================= */

static st7305_handle_t lcd;

void setup(void)
{
    Serial.begin(115200);
    lcd = st7305_init(PIN_DC, PIN_RES, PIN_CS, PIN_SCLK, PIN_MOSI, SPI_CLOCK_HZ);

    /* L'animation a besoin de HPM ; les pages statiques conservent aussi leur image en LPM. */
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    lcd_demo_run(lcd);
}
```

Ce n'est ni du pseudocode, ni un extrait pédagogique qui ne garderait que les fonctions clés — c'est le programme complet en un seul fichier avec le pilote bas niveau, les primitives graphiques, la police intégrée et le carrousel de 15 pages. Lors de la publication de l'article, il est conseillé d'offrir ce `.ino` en pièce jointe ou dans un dépôt de code compagnon, pour éviter que les lecteurs recousent des bribes éparses du corps de l'article.

Placez le fichier dans un dossier du même nom :

```text
ST7305_RLCD_Demo/
└── ST7305_RLCD_Demo.ino
```

Ouvrez le `.ino` dans l'Arduino IDE, sélectionnez `Arduino Nano ESP32` et son port série, puis compilez et téléversez.

### Flux minimal de démarrage : initialiser d'abord, puis le carrousel de 15 pages

Voici le point d'entrée du programme complet. Le vrai travail est fait par `st7305_init()` et `lcd_demo_run()` — le premier « réveille l'écran », le second « fait faire des tours à l'écran ».

```cpp
static st7305_handle_t lcd;

void setup(void)
{
    // Étape 1 : ouvrir un port série à 115200 pour voir les logs
    Serial.begin(115200);

    // Étape 2 : initialiser SPI et le ST7305 avec le câblage ci-dessus
    lcd = st7305_init(
        PIN_DC, PIN_RES, PIN_CS,
        PIN_SCLK, PIN_MOSI,
        SPI_CLOCK_HZ
    );

    // Étape 3 : les pages animées ont besoin de rafraîchissement — passer en HPM (mode haute cadence)
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    // Étape 4 : cela fait carrousel pour toujours — pas besoin de machine à états
    lcd_demo_run(lcd);
}
```

Les broches et l'horloge SPI sont regroupées en tête de fichier — changez-les d'abord en changeant de carte :

```cpp
// Ici on met des numéros GPIO — ne copiez pas les numéros D de la sérigraphie du Nano
#define PIN_SCLK        10          // D7
#define PIN_MOSI         8          // D5 — important : PAS GPIO11
#define PIN_CS           9          // D6
#define PIN_DC           7          // D4
#define PIN_RES          6          // D3
#define SPI_CLOCK_HZ     20000000UL // 20 MHz — d'abord stable, ensuite rapide
```

### Note de code 1 : pourquoi une trame fait exactement 15000 octets

Cet écran a 300×400 = 120000 pixels ; chaque pixel n'est que noir ou blanc, donc théoriquement 1 bit :

```text
120000 bits ÷ 8 = 15000 octets
```

Avec le format de données de cet exemple, un octet (8 bits) du ST7305 correspond à 2 lignes × 4 colonnes de pixels :

```text
Ligne 0 : BIT7  BIT5  BIT3  BIT1
Ligne 1 : BIT6  BIT4  BIT2  BIT0
```

Donc chaque ligne n'est pas l'habituel 300÷8, mais 300÷4 = 75 octets ; verticalement, les pixels sont groupés par paires de lignes, donnant 400÷2 = 200 groupes :

```cpp
#define ST7305_DATA_WIDTH     75      // 300 ÷ 4
#define ST7305_BUFFER_LENGTH  15000   // 75 × 200
```

Le framebuffer, c'est comme dessiner d'abord sur un brouillon puis le remettre à l'écran d'un coup. Ainsi le dessin ne s'emmêle pas avec le timing SPI et le code reste plus facile à maintenir.

### Note de code 2 : comment une coordonnée atterrit sur un bit précis du framebuffer

Après rotation, les coordonnées logiques sont mappées vers les coordonnées physiques 300×400, puis on calcule la position de l'octet et la position du bit :

```cpp
// Étape 1 : calculer dans quel octet tombe ce pixel
int real_x = physical_x / 4;
int real_y = physical_y / 2;
int index = real_y * ST7305_DATA_WIDTH + real_x;

// Étape 2 : calculer quel bit il occupe dans cet octet
int one_two = physical_y % 2;
int line_bit_4 = physical_x % 4;
int bit = 7 - (line_bit_4 * 2 + one_two);

// Étape 3 : mettre le bit à 1 pour le noir, à 0 pour le blanc
if (color) dev->buffer[index] |= (1 << bit);
else       dev->buffer[index] &= ~(1 << bit);
```

Cette disposition entrelacée est l'endroit où les débutants se trompent le plus souvent dans les calculs. Si les graphiques sortent de travers, déchiquetés en codes-barres ou décalés d'une ligne sur deux — vérifiez ici d'abord, ne vous précipitez pas pour « régler au hasard » les registres d'initialisation.

### Note de code 3 : que font vraiment DC et CS

`DC` est comme l'étiquette d'un colis : `LOW` signifie « ceci est une commande », `HIGH` signifie « ceci est une donnée d'image ». `CS` est comme l'appel nominal — l'écran ne reçoit des données que tant qu'il est tiré bas.

```cpp
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);          // DC=LOW : une commande suit
    spi_write_byte(dev, reg);
}

static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);         // DC=HIGH : un paramètre suit
    spi_write_byte(dev, data);
}
```

Lors de l'envoi d'une trame complète, le programme écrit 15000 octets d'affilée au lieu d'ouvrir une transaction SPI par pixel :

```cpp
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);             // Étape 1 : délimiter la fenêtre d'écriture plein écran
    dc_data(dev);                        // Étape 2 : dire à l'écran que des données suivent
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH); // Étape 3 : expédier la trame entière
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}
```

À 20 MHz, le temps théorique de transfert SPI pur de 15000 octets est d'environ 6 ms ; en pratique on ajoute les commandes, le dessin et l'ordonnancement du programme. La page 7 affiche le coût réel mesuré — on ne fait pas passer des valeurs théoriques pour des FPS mesurés.

### Note de code 4 : HPM, LPM et les images statiques ne sont pas la même chose

À la fin de l'initialisation, le panneau entre en LPM ; cette démo passe en HPM dans `setup()` pour que les pages animées aient des conditions de rafraîchissement de panneau plus adaptées.

```cpp
st7305_high_power_mode(lcd);  // envoyer 0x38 pour entrer en HPM
```

Avec `B2h=0x05`, HPM est configuré à 16 Hz et LPM à 8 Hz dans cet exemple. Le `target_fps` du programme ne contrôle que la vitesse à laquelle l'hôte dessine — il ne peut pas ordonner à la réponse physique du cristal liquide de dépasser les limites du panneau.

Une page statique avec `target_fps=0` signifie : dessiner une fois et conserver l'image, sans renvoi. Mais tout le carrousel reste en HPM — il ne rebascule pas automatiquement en LPM à chaque page statique. Pour un vrai produit basse consommation, il faut aussi ajouter la commutation de modes et le rafraîchissement partiel en suivant le timing de la datasheet.

### Note de code 5 : comment les 15 démos font leur carrousel automatique

Toutes les pages vivent dans le tableau `pages[]` ; chaque entrée contient un nom, une fonction de dessin, une durée et un FPS cible :

```cpp
static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    // les 12 autres pages suivent le même schéma : fonction, durée, FPS cible
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};
```

Envie d'un autre ordre ? Échangez les entrées du tableau. Envie de quelques secondes de plus de champ d'étoiles ? Changez `duration_ms`. Envie de votre propre page ? Écrivez une fonction de dessin avec la même signature et enregistrez-la dans le tableau. Pas besoin d'éparpiller la planification du carrousel partout.

### Note de code 6 : pourquoi la rotation en quatre sens ne repose pas sur des devinettes MADCTL

Le programme définit l'orientation 0~3 via `st7305_set_rotation(lcd, rotation)` et mappe les coordonnées lors de l'écriture dans le framebuffer :

| `rotation` | Orientation     | Résolution logique |
| ---------: | --------------- | ------------------ |
|          0 | 0°              | 300×400            |
|          1 | 90° horaire     | 400×300            |
|          2 | 180°            | 300×400            |
|          3 | 270° horaire    | 400×300            |

Définir l'orientation n'affecte que le dessin ultérieur — cela n'efface ni ne rafraîchit l'écran automatiquement. Après un basculement, il faut effacer le framebuffer et redessiner l'image complète ; au début de chaque page du carrousel, le programme remet aussi l'orientation à 0, pour que la page précédente ne « penche » pas la suivante.

## Dépannage : le ST7305 n'affiche rien, affiche du charabia ou scintille

Pas de panique — 80 % des problèmes d'« écran qui ne s'allume pas » viennent de ces quelques points ; seuls les 20 % restants font porter le chapeau aux registres d'initialisation.

### 1. Le moniteur série dit que l'initialisation a réussi, mais l'écran reste tout blanc

Le SPI en écriture seule n'a pas de relecture MISO — l'hôte dira « transfert terminé » même s'il a envoyé les données dans le vide. Vérifiez d'abord si `D5 → GPIO8` est bien câblé, puis mesurez si VCI est à 3.3V, si les masses sont partagées et si le FPC est verrouillé. Couper complètement l'alimentation quelques secondes et rallumer est plus radical que d'appuyer juste sur RESET.

### 2. L'écran affiche du contenu, mais se corrompt aléatoirement ou gèle parfois

Baissez temporairement `SPI_CLOCK_HZ` de 20 MHz à 5 MHz, raccourcissez les câbles dupont et réenfoncez les connecteurs. Si ça récupère à plus faible vitesse, corrigez d'abord longueur des câbles, contacts et intégrité du signal — ne commencez pas par changer les tensions Gate/Source.

### 3. Les graphiques sont décalés, rayés, ou le texte semble haché

Vérifiez `DTFORM=0x11`, la fenêtre d'adresses de colonne et le mapping de bits de pixels de 2 lignes × 4 colonnes. Confirmez aussi que les coordonnées logiques ne sortent pas des limites : 0°/180° c'est 300×400, 90°/270° c'est 400×300.

### 4. Presque invisible dans le noir

C'est un écran totalement réflectif sans rétroéclairage — il n'a pas soudain appris l'invisibilité. Ajoutez de l'éclairage ambiant, et ne traitez pas BLC comme une ligne de rétroéclairage obligatoire : dans cet exemple BLC peut rester en l'air.

### 5. L'animation laisse des traînées ou les motifs fins scintillent

Les damiers denses, l'alternance de phases et l'inversion rapide pleine trame sont des tests de stress par conception — toutes les UI ne ressembleront pas à ça. Baissez le `target_fps` des pages animées, réduisez l'inversion haute fréquence sur de grandes surfaces et confirmez que vous êtes en HPM ; si le ghosting est marqué, n'accélérez pas contre la physique du panneau.

### 6. Après passage au chinois, seuls des points d'interrogation ou des cases sortent

La police intégrée n'a que 96 caractères ASCII 5×7 — pas de chinois. Il faudrait importer une police chinoise rognée et dessiner via `st7305_write_point()` ; n'y enfoncez pas directement une grosse bibliothèque de polices complète, sinon le firmware aura plus de « poids » que l'UI.

### 7. Vous voulez confirmer que le matériel est vivant sans regarder d'abord des pages complexes

Faites d'abord un test alternatif tout-noir / tout-blanc, en contournant temporairement la logique de texte, de coordonnées et d'animation :

```cpp
// Étape 1 : remplir la trame de 1 — test tout-noir
st7305_fill(lcd, 0xFF);
st7305_display(lcd);
delay(2000);

// Étape 2 : effacer la trame à 0 — test tout-blanc
st7305_fill(lcd, 0x00);
st7305_display(lcd);
delay(2000);
```

Si le tout-noir et le tout-blanc fonctionnent, restaurez le carrousel de 15 pages. Le dépannage est comme aller chez le médecin : d'abord les examens simples, ne passez pas directement à la grande opération.

## FAQ : questions fréquentes sur ESP32-S3 et ST7305

**Q : Peut-on déplacer les broches SPI du ST7305 vers d'autres GPIO ?**
R : Oui. L'ESP32-S3 peut remapper le SPI via la GPIO Matrix — changez `PIN_SCLK`, `PIN_MOSI`, `PIN_CS`, `PIN_DC`, `PIN_RES` et recâblez en conséquence. Évitez les broches déjà utilisées par la carte, les broches de boot et celles liées à l'USB ; après un changement de carte, consultez toujours le pinout officiel de cette carte — ne copiez pas aveuglément sous prétexte que « tout est ESP32-S3 ».

**Q : Pourquoi l'écran ST7305 doit-il être en 3.3V ? Peut-il prendre du 5V ?**
R : Dans cet exemple, le VCI du module utilise 3.3V, et les GPIO de l'ESP32-S3 sont aussi en logique 3.3V — ne mettez pas de 5V directement sur VCI ni sur aucune broche de signal. L'alimentation doit aussi partager la masse ; avec seulement 3.3V connecté et GND oublié, les signaux n'ont pas de référence commune.

**Q : Quelle est la cadence de rafraîchissement réelle du ST7305 — écrire 20 FPS dans le code signifie-t-il 20 Hz ?**
R : Non. Dans cet exemple le HPM du panneau est configuré à 16 Hz ; `target_fps=20` n'est que le rythme cible de l'hôte pour générer et envoyer au plus 20 trames par seconde. À 20 MHz de SPI, envoyer 15000 octets prend environ 6 ms en théorie ; le FPS réel est la mesure « dessin + SPI » de la page 7, et la réponse optique est en outre limitée par le mode du panneau.

**Q : Combien de mémoire de l'ESP32-S3 le framebuffer de 15000 octets occupe-t-il ?**
R : Le framebuffer fixe fait 15000 octets, environ 14,65 Kio, plus la table de polices, l'état des pages et les variables temporaires de dessin. La démo utilise une instance globale statique, donc pas d'allocation dynamique du buffer entier à chaque trame.

**Q : D'autres cartes ESP32-S3 peuvent-elles utiliser directement ce code Arduino du ST7305 ?**
R : La logique du pilote est réutilisable, mais la sélection de carte et le mapping GPIO doivent être changés. Avec une carte autre que Nano ESP32, sélectionnez-la dans l'Arduino IDE et changez les 5 GPIO de contrôle pour correspondre à votre câblage réel ; l'alimentation reste 3.3V comme l'exige le module.

**Q : L'écran ST7305 n'affiche rien du tout — quel paramètre changer en premier ?**
R : Ne touchez d'abord aucun registre de tension. Suivez l'ordre « alimentation 3.3V → masse commune → FPC/câbles dupont → D5=GPIO8 → baisser SPI à 5 MHz → test tout-noir/tout-blanc ». Ce n'est qu'après vérification de la chaîne matérielle qu'il faut regarder la séquence d'initialisation et le framebuffer.

**Q : Pourquoi cet écran monochrome 1 bit peut-il afficher 17 niveaux de gris ?**
R : Il n'a pas de vrais pixels à niveaux de gris — il utilise un tramage ordonné Bayer 4×4 pour contrôler la densité des points noirs et blancs, de sorte que l'œil humain perçoit 17 niveaux de luminosité (0–16) à distance. De près, il n'y a toujours que des points noirs et blancs — du « travail posté » pour créer une sensation de profondeur.

**Q : La démo du ST7305 peut-elle afficher directement des caractères chinois ?**
R : Pas directement. La police intégrée couvre ASCII 32–126 ; les caractères chinois sont remplacés par `?`. Il faudrait ajouter des glyphes chinois rognés et une fonction de dessin, ou pontifier l'interface de dessin existante vers une bibliothèque de polices.

**Q : Faut-il utiliser un écran totalement réflectif dans une pièce sombre ?**
R : Il a besoin de lumière ambiante — plus sombre n'est pas mieux. L'éclairage intérieur normal ou les environnements lumineux le rendent plus lisible ; dans l'obscurité, ajoutez un éclairage externe, car cet exemple n'a pas de rétroéclairage et BLC n'est pas connecté.

## Pour aller plus loin : que faire d'autre après avoir allumé le ST7305

- Brancher un capteur de température/humidité et remplacer les données de démo de la page 6 par de vraies données d'environnement.
- Ajouter des boutons ou un encodeur rotatif pour passer manuellement d'une des 15 pages à l'autre et ajuster la durée.
- Implémenter le rafraîchissement partiel : utiliser CASET/RASET pour définir une fenêtre, combiné avec `WRMEMC 0x3C`, pour réduire les transferts de trame complète.
- Câbler la synchro de trame TE, écrire les trames après le V-Blank et creuser le contrôle du tearing sur les contenus animés.
- Ajouter une police chinoise rognée pour faire un panneau météo, un calendrier ou une horloge à faible cadence de rafraîchissement.
- Rebasculer en LPM sur les pages statiques en suivant le timing de la datasheet, et mesurer réellement la consommation totale — ne pas se contenter des mots « basse consommation ».

## Références

- [Datasheet du ST7305 (Sitronix)](https://www.sitronix.com.tw/) : les définitions de registres, le timing HPM/LPM et le flux d'initialisation suivent la datasheet officielle
- [Bibliothèque U8g2](https://github.com/olikraus/u8g2) : inclut le constructeur `U8G2_ST7305_300X400_1_4W_HW_SPI` depuis v2.36
- [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library) : enveloppe pilote Arduino tierce pour le ST7305
- [Documentation officielle de l'Arduino Nano ESP32](https://docs.arduino.cc/hardware/nano-esp32/) : correspondance entre sérigraphie de la carte et GPIO

Si vous avez aussi allumé le vôtre, commencez par vérifier la grille de pixels de la page 4 et le test de cadence de la page 7, puis ajoutez votre propre UI dans `pages[]`. Un écran avec seulement du noir et du blanc peut quand même occuper joyeusement un tableau de bord, des animations et un bureau rétro.
