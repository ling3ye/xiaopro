---
title: "Allumer l'écran circulaire TK015F5785 avec l'ESP32-S3 (JD9855 QSPI) | Tutoriel complet d'animations colorées par tables précalculées"
boardId: esp32s3
moduleId: display/tft15-jd9855
category: esp32
date: 2026-07-30
intro: "Allumer l'écran circulaire TK015F5785 1,5 pouce via QSPI avec l'ESP32-S3 (le driver est en réalité un JD9855, pas le ST77916 annoncé par le fabricant), driver écrit à la main en un seul fichier + trois animations par tables précalculées (Plasma / palette arc-en-ciel / ondulations radiales), compilation et flash directs depuis l'Arduino IDE, avec un guide de dépannage."
image: "https://img.lingflux.com/2026/07/8f43dd78cc005af725bd601e0a262621.jpg"
---

Difficulté : ⭐⭐⭐☆☆ (avoir des bases en microcontrôleurs facilite la prise en main, mais un débutant complet peut aussi la faire tourner juste en recopiant le code)
Temps estimé : 30 à 45 minutes (hors délai de livraison Taobao)
Environnement de test : Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 (basé sur ESP-IDF v5, doit être cette version majeure, explication plus loin)

---

> **En une phrase** : allumer l'écran circulaire TK015F5785 1,5 pouce via QSPI avec l'ESP32-S3 — le fabricant annonce un driver ST77916, mais la lecture de l'IC ID révèle qu'il s'agit en fait d'un JD9855. Cet article utilise le composant `esp_lcd_panel_io` intégré à ESP-IDF pour écrire à la main un mini-driver mono-fichier de quelques dizaines de lignes, qui fait tourner trois animations par tables précalculées (Plasma / palette arc-en-ciel / ondulations radiales), sans installer aucune bibliothèque et sans appeler `sin`/`atan2`/`sqrt` à l'exécution, pour un plein-écran fluide en 30 minutes.

---

## Préambule

Au début, je pensais aussi qu'allumer un écran circulaire était l'affaire de cinq minutes : brancher l'alimentation et envoyer n'importe quel bloc de couleur. Comme le fabricant indiquait que le chip driver était un ST77916 — qui existe bien dans la GFX library for Arduino — j'ai fait confiance. Sauf qu'une fois le code téléversé, l'écran passait progressivement du noir au blanc complet, donc... ça ne marchait pas du tout. Plus tard, après avoir demandé le code de driver ESP-IDF au fabricant, j'ai découvert que le driver réel de cet écran est le JD9855, ce que l'IC ID de l'écran (le code renvoyé est `FF 98 55 00`) est également venu confirmer. Pour vous faciliter la reproduction, j'ai écrit à la main un mini-driver de quelques dizaines de lignes directement à partir du composant `esp_lcd_panel_io` intégré à ESP-IDF — pas de bibliothèque à installer, pas de police à configurer, même pas besoin d'un fichier d'en-tête dédié, tout tient dans un seul .ino.

Ce tutoriel documente l'ensemble du processus qui permet de faire passer cet écran circulaire TK015F5785 1,5 pouce de « simple verre noir à la réception » à « plein-écran d'animations colorées fluides » : câblage, principe du driver et trois algorithmes d'animation fluides qui n'appellent pas `sin`/`atan2`/`sqrt`. En suivant pas à pas, votre écran circulaire sera animé en moins de 30 minutes.

> **TL;DR (si vous êtes pressé, lisez ceci) :**
>
> 1. Câblage : SCLK→GPIO6, D0→GPIO15, D1→GPIO7, D2→GPIO11, D3→GPIO12, CS→GPIO16
> 2. Dans l'Arduino IDE, choisir Board = **ESP32S3 Dev Module**, USB CDC On Boot = **Enabled**
> 3. Aucune bibliothèque tierce à installer, tout repose sur le composant `esp_lcd_panel_io` intégré à ESP-IDF ; la version du core doit être **v3.x**
> 4. Copiez-collez l'intégralité du .ino, compilez, flashez : à la mise sous tension vous obtenez un plein-écran d'animations colorées fluides ; si rien ne s'affiche, vous avez rencontré un piège — voir la section « Dépannage » ci-dessous.

---

## Résultat de l'expérience

Après la mise sous tension, l'écran diffuse en boucle trois animations colorées générées par des algorithmes par tables précalculées, chacune durant 6 secondes, le tout sans aucune saccade ni effet de déchirement de balayage ligne par ligne :

- **Plasma (flux de plasma)** : les couleurs s'écoulent continûment comme un liquide
- **Palette arc-en-ciel** : le spectre complet tourne lentement autour du centre, comme une palette qui n'arrête pas de pivoter
- **Ondulations radiales** : des ondulations colorées se propagent du centre vers l'extérieur

Dès la mise sous tension, l'écran est rempli d'animations, sans aucune action supplémentaire — parfait comme test de validation du type « cet écran est bel et bien vivant ».

---

## Composants

> La carte de développement (ESP32-S3) n'est pas détaillée ici ; seuls les composants clés autres que la carte sont présentés.

### Écran circulaire TK015F5785

Le TK015F5785 est un écran circulaire **IPS** de 1,5 pouce (chip driver JD9855) qui se charge d'afficher les données de pixels envoyées par l'ESP32-S3. Dans ce projet, il sert de sortie visuelle finale pour les trois animations par tables précalculées. Sauf indication contraire, les paramètres du tableau ci-dessous proviennent de la fiche technique du module fournie par le fabricant :

| Paramètre               | Valeur / description                                                                      | Source                            |
| ----------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- |
| Taille                  | 1,5 pouce                                                                                 | Fiche technique fabricant        |
| Type LCD                | IPS, angle de vue complet                                                                 | Fiche technique fabricant        |
| Résolution              | 360 × 360                                                                                 | Fiche technique fabricant        |
| Chip driver             | JD9855 (le même module existe aussi en version ST77916, à confirmer par lecture de l'IC ID) | Fiche technique fabricant + mesure |
| Zone d'affichage        | Φ38,16 mm (diamètre)                                                                      | Fiche technique fabricant        |
| Dimensions              | 44,32 × 44,32 × 3,5 mm                                                                    | Fiche technique fabricant        |
| Pas de pixel            | 0,106 × 0,106 mm                                                                          | Fiche technique fabricant        |
| Nombre de couleurs      | 65K couleurs (RGB565, 16 bits/pixel)                                                      | Fiche technique fabricant        |
| Luminosité              | 500 cd/m²                                                                                 | Fiche technique fabricant        |
| Rétroéclairage          | 4 LED blanches en parallèle                                                               | Fiche technique fabricant        |
| Température de fonctionnement | -20 ~ 60 ℃                                                                          | Fiche technique fabricant        |
| Type d'interface        | QSPI (SCLK + D0~D3 + CS)                                                                  | Mesures de ce tutoriel           |
| Horloge de communication | 20 MHz (valeur testée dans ce tutoriel)                                                  | Mesuré                            |

> **Vérifiez impérativement la version avant de commander** : la fiche technique du module indique pour cet écran « interface RGB / chip driver ST77916 **ou** JD9855 » — ce qui signifie que le même modèle TK015F5785 est livré dans différentes combinaisons de driver IC et d'interface. Ce tutoriel cible la version **JD9855 + QSPI** (c'est d'ailleurs en lisant l'IC ID = `FF 98 55 00` dans le préambule qu'on a confirmé que le chip n'était pas le ST77916 annoncé au départ par le fabricant). Si vous avez acheté la version ST77916 ou la version à interface RGB, la séquence d'initialisation des registres et le câblage doivent être adaptés : vous ne pourrez pas recopier tel quel le code de cet article.

La zone physiquement visible de l'écran circulaire est un disque de diamètre Φ38,16 mm, ce qui, à 0,106 mm/pixel, correspond exactement à un rayon de 180 px — c'est pourquoi le code utilise `R2MAX = 180²` pour forcer à noir les pixels hors du disque et obtenir un bord circulaire net (voir le point 4 de la section « Dépannage »).

Le choix de cet écran se justifie très simplement : l'interface QSPI ajoute 3 lignes de données au SPI classique, soit une bande passante 4 fois supérieure ; à l'échelle de 360 × 360 pixels, pousser les données sur un SPI à une seule ligne donnerait une fréquence d'image exécrable.

### Broches

| Broche            | Fonction                                                       |
| ----------------- | -------------------------------------------------------------- |
| SCLK              | Ligne d'horloge QSPI                                           |
| D0 / D1 / D2 / D3 | Les quatre lignes de données QSPI (transmises en parallèle en mode Quad) |
| CS                | Chip select, à mettre bas pour sélectionner cet écran          |
| BL (rétroéclairage) | Contrôle du rétroéclairage, non routée sur certains modules  |
| VCC               | Alimentation, en général 3,3 V                                 |
| GND               | Masse commune                                                  |

### JD9855 (chip driver)

Le JD9855 est un chip driver IC TFT LCD mono-puce intégré au module d'écran, lancé par le fabricant de chips Jadard. Il embarque un framebuffer (GRAM) intégré qui se charge d'écrire les données de pixels reçues dans le tampon et de piloter les cellules LCD pour l'affichage des couleurs. Dans ce projet, son rôle est d'exécuter la séquence d'initialisation des registres et la commande d'écriture RAMWR envoyées par `esp_lcd_panel_io`.

Mieux, le JD9855 **dispose d'une fiche technique publique** (version Preliminary V0.00 publiée par le fabricant de chips Jadard, octobre 2023). D'après la fiche, ses spécifications clés sont les suivantes :

| Paramètre                | Valeur / description                                                                                            | Source fiche technique |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Capacité de pilotage     | SOC mono-puce pilotant a-Si TFT, max 360 RGB×390 (Dual-Gate=780) points, 540 voies source driver                | Features / Intro       |
| Framebuffer intégré      | 360×390×18 bit (env. 315 KB GRAM)                                                                                | Features               |
| Interfaces pris en charge | 8080 parallèle (8 bits), RGB (6 bits), SPI (8/9 bits, 2-lane), **QSPI (DDR pris en charge)**, MIPI-DSI         | System Interface       |
| Format de couleur        | RGB565 (16 bits) / RGB666 (18 bits)                                                                              | Color Format           |
| Tension E/S              | 1,65 V ~ 3,3 V                                                                                                   | Features               |
| Température de fonctionnement | -40 ~ +85 ℃                                                                                                 | Features               |

Cette fiche technique détaille clairement les définitions de bits et les timings des commandes 0x2A (CASET), 0x2B (RASET), 0x2C (RAMWR), 0x36 (MADCTL), 0x3A (COLMOD) — autant de commandes standards que l'on retrouve dans le code de cet article. **À noter** : la fiche technique rend publics le jeu d'instructions et les timings, mais les paramètres de réglage d'écran comme la correction Gamma, l'élévation de tension ou les sous-commandes définies par chaque fabricant (par exemple les registres à « bascule de bank de commandes » comme `0xDE` / `0xDF` / `0xC3` dans notre séquence d'initialisation) restent des tables d'initialisation propriétaires, ajustées individuellement par le fabricant du panneau pour son écran. Pour allumer l'écran, il suffit de recopier telles quelles les séquences fournies par le fabricant, sans chercher à comprendre chaque entrée.

---

## BOM

| Composant                                       | Quantité    | Remarques                                                                                    |
| ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| Carte de développement ESP32-S3                 | 1           | Préférez une version avec PSRAM, pour le repli de la table d'angles                          |
| Module écran circulaire TK015F5785 (JD9855 / QSPI) | 1        | Confirmez impérativement qu'il s'agit de la version JD9855+QSPI (le même modèle existe aussi en ST77916/RGB, voir la section Composants) |
| Fils Dupont (femelle-femelle, selon la nappe du module) | à partir de 6 | SCLK / D0~D3 / CS = 6 fils, plus VCC / GND                                          |

---

## Câblage

| Broche écran  | Vers broche ESP32-S3                                                      |
| ------------- | ------------------------------------------------------------------------- |
| SCLK          | GPIO6                                                                     |
| D0            | GPIO15                                                                    |
| D1            | GPIO7                                                                     |
| D2            | GPIO11                                                                    |
| D3            | GPIO12                                                                    |
| CS            | GPIO16                                                                    |
| BL (rétroéclairage) | Non routé sur ce module, aucun contrôle logiciel ; reste allumé dès qu'il est alimenté |
| VCC           | 3,3 V                                                                     |
| GND           | GND                                                                       |

Une fois le câblage terminé, vérifiez chaque fil un par un — cela économise 80 % du temps de débogage : le QSPI a quatre lignes de données, et en inverser deux entraîne généralement non pas un écran noir mais un écran brouillé, plus difficile à diagnostiquer qu'un écran complètement noir.

---

## Bibliothèques à installer

Bonne nouvelle : **aucune bibliothèque tierce à installer**. Le driver appelle directement les en-têtes intégrés à ESP-IDF `driver/spi_master.h`, `esp_lcd_panel_io.h`, `esp_heap_caps.h`, fournis avec le core Arduino ESP32.

La seule exigence matérielle : le **core de la carte de développement ESP32 dans l'Arduino IDE doit être en v3.x** (basé sur ESP-IDF v5). Le core v2.x repose sur ESP-IDF v4.4 ; les API `esp_lcd_panel_io_tx_param` / `esp_lcd_panel_io_tx_color` ont un comportement et des chemins d'en-tête différents sur l'ancienne version, et la compilation échouera avec des erreurs du type « symbole introuvable » ou « signature de fonction non correspondante ».

Méthode de mise à niveau : Arduino IDE → Outils → Carte → Gestionnaire de carte, recherchez « esp32 », et mettez à jour le paquet de core espressif en version 3.x ou supérieure.

---

## Code complet

> Le code est mono-fichier : copiez-collez dans un nouveau .ino pour compiler. Notez que la broche CS est `16` (une ancienne version l'avait par erreur écrite `160`, qui n'existe pas — voir le point 1 de la section « Dépannage »).

```cpp
/*
 * =============================================================================
 *  Démo colorée mono-fichier pour écran circulaire TK015F5785 (JD9855, QSPI) — version Arduino IDE
 * =============================================================================
 *
 *  ✦ Mono-fichier : driver + démo dans ce seul .ino, copier-coller, aucun fichier externe nécessaire.
 *
 *  Rendu (3 scènes en boucle, environ 6 s chacune, toutes fluides et continues) :
 *    [1] Plasma (flux de plasma)  — couleurs s'écoulant comme un liquide (table sin)
 *    [2] Palette arc-en-ciel      — spectre complet + rotation lente (table d'angles précalculée)
 *    [3] Ondulations radiales     — ondulations colorées du centre vers l'extérieur (phase r²)
 *
 *  Dès la mise sous tension : plein-écran de couleurs fluides, preuve visuelle que « l'écran s'allume + les couleurs sont correctes », idéal pour une démo.
 *
 *  Clé de performance : par pixel, chaque scène ne fait que « consultation de table + additions/soustractions entières », sans appeler sin/atan2/sqrt,
 *                       donc chaque image est rendue très vite, sans balayage ligne par ligne perceptible, le tout fluide.
 *
 *  Matériel : ESP32-S3 + TK015F5785 (JD9855, QSPI)
 *    SCLK=6  D0=15  D1=7  D2=11  D3=12  CS=16  rétroéclairage=-1 (non routé, non contrôlable)
 *  Dépendances : uniquement le core esp32 v3.x de l'Arduino IDE, aucune bibliothèque externe / police / en-tête externe.
 *  Téléversement : Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled, série 115200.
 * =============================================================================
 */

#include <Arduino.h>
#include <math.h>
#include <initializer_list>
#include "driver/spi_master.h"
#include "esp_lcd_panel_io.h"
#include "esp_heap_caps.h"

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/* ----------------------------- Configuration des broches ----------------------------- */
/* Identique au programme HelloWorld / de test, à modifier en même temps que le câblage */
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1      /* Rétroéclairage, -1 = non contrôlé */ // Le module actuel ne l'expose pas, donc non contrôlable

/* =====================================================================
 *  Driver écran (JD9855 QSPI) — recopier tel quel, en général rien à modifier
 *  Principe : Arduino-ESP32 3.x est basé sur ESP-IDF, on appelle directement esp_lcd_panel_io pour piloter le QSPI.
 * ===================================================================== */
#define JD9855_SWRESET 0x01
#define JD9855_CASET   0x2A
#define JD9855_RASET   0x2B
#define JD9855_RAMWR   0x2C
#define JD9855_MADCTL  0x36
#define JD9855_COLMOD  0x3A
#define JD9855_SLPOUT  0x11
#define JD9855_DISPON  0x29

class JD9855_QSPI {
public:
    static constexpr int H_RES = 360;
    static constexpr int V_RES = 360;

    /* RGB565 standard */
    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b)
    {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1)
    {
        if (backlight >= 0) { pinMode(backlight, OUTPUT); digitalWrite(backlight, HIGH); }

        spi_bus_config_t buscfg = {};
        buscfg.sclk_io_num  = sclk;
        buscfg.data0_io_num = d0;
        buscfg.data1_io_num = d1;
        buscfg.data2_io_num = d2;
        buscfg.data3_io_num = d3;
        buscfg.max_transfer_sz = H_RES * V_RES * 2;
        esp_err_t ret = spi_bus_initialize(SPI2_HOST, &buscfg, SPI_DMA_CH_AUTO);
        if (ret != ESP_OK) { log_e("spi_bus_initialize: %s", esp_err_to_name(ret)); return false; }

        esp_lcd_panel_io_spi_config_t io_config = {};
        io_config.cs_gpio_num        = cs;
        io_config.dc_gpio_num        = -1;
        io_config.spi_mode           = 3;
        io_config.pclk_hz            = 20 * 1000 * 1000;
        io_config.trans_queue_depth  = 10;
        io_config.lcd_cmd_bits       = 32;
        io_config.lcd_param_bits     = 8;
        io_config.flags.quad_mode    = true;
        ret = esp_lcd_new_panel_io_spi(SPI2_HOST, &io_config, &io);
        if (ret != ESP_OK) { log_e("esp_lcd_new_panel_io_spi: %s", esp_err_to_name(ret)); return false; }

        sendCmd(JD9855_SWRESET);
        delay(20);
        sendInitCommands();
        return true;
    }

    /* Pousse un tampon RGB565 (petit-boutiste) vers une zone rectangulaire */
    void pushRect(int x, int y, int w, int h, const uint16_t *data)
    {
        if (w <= 0 || h <= 0) return;
        setAddrWindow(x, y, x + w - 1, y + h - 1);
        size_t n = (size_t)w * h;
        ensureDmaBuf(n * 2);
        for (size_t i = 0; i < n; i++) {
            uint16_t c = data[i];
            dma_buf[i * 2]     = c >> 8;
            dma_buf[i * 2 + 1] = c & 0xFF;
        }
        sendColor(JD9855_RAMWR, dma_buf, n * 2);
    }

    /* Remplissage plein-écran (ligne par ligne, empreinte mémoire minime) */
    void fillScreen(uint16_t color)
    {
        uint8_t hi = color >> 8, lo = color & 0xFF;
        const int BUF_PIX = H_RES;
        ensureDmaBuf(BUF_PIX * 2);
        for (int i = 0; i < BUF_PIX; i++) { dma_buf[i*2] = hi; dma_buf[i*2+1] = lo; }
        for (int y = 0; y < V_RES; y++) {
            setAddrWindow(0, y, H_RES - 1, y);
            sendColor(JD9855_RAMWR, dma_buf, BUF_PIX * 2);
        }
    }

private:
    esp_lcd_panel_io_handle_t io = nullptr;
    uint8_t *dma_buf = nullptr;
    size_t   dma_buf_size = 0;

    void ensureDmaBuf(size_t need)
    {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1)
    {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data)
    {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    /* Séquence d'initialisation usine JD9855 (portée depuis le driver esp_lcd_jd9855 d'ESP-IDF) */
    void sendInitCommands()
    {
        sendCmd(0xFF, {0x20, 0x10, 0x00});
        sendCmd(JD9855_MADCTL, {0x00});
        sendCmd(JD9855_COLMOD, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0xDF, {0x98, 0x55});
        sendCmd(0xCE, {0x0D, 0x00});
        sendCmd(0xD8, {0x08, 0x00});
        sendCmd(0xB2, {0x30});
        sendCmd(0xB7, {0x01, 0x35, 0x01, 0x5D});
        sendCmd(0xBB, {0x1B, 0x64, 0xE3, 0x34, 0x3E, 0xF3});
        sendCmd(0xBC, {0x00, 0x1A, 0xF3, 0xC0});
        sendCmd(0xC0, {0x22, 0xC1});
        sendCmd(0xC3, {0x00, 0x01, 0x8D, 0x0B, 0x08, 0x48, 0x07, 0x04, 0x62, 0x30, 0x30});
        sendCmd(0xC4, {0x40, 0x00, 0xAD, 0x68, 0x37, 0x07, 0x04, 0x16, 0x43, 0x07, 0x04});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xD3, {0x28, 0x13});
        sendCmd(0xD9, {0x00, 0x00, 0xFF, 0x00, 0xF0, 0x00});
        sendCmd(0xDE, {0x01});
        sendCmd(0xB7, {0x17, 0xA7, 0x64, 0x3B, 0x06, 0x36, 0x18, 0x18});
        sendCmd(0xBE, {0x00});
        sendCmd(0xC1, {0x04, 0x40, 0x90, 0x08});
        sendCmd(0xC2, {0x00, 0x16, 0xDA, 0xE7});
        sendCmd(0xC4, {0x72, 0x12});
        sendCmd(0xC7, {0x00, 0x00, 0x02, 0x32, 0x10, 0x32});
        sendCmd(0xC8, {0x00, 0x00, 0x0B, 0x32, 0x12, 0x2E});
        sendCmd(0xC9, {0x00, 0x0A, 0x08, 0x06, 0x04});
        sendCmd(0xCA, {0x1E, 0x1F, 0x10, 0x17, 0x18});
        sendCmd(0xCB, {0x01, 0x0B, 0x09, 0x07, 0x05});
        sendCmd(0xCC, {0x1E, 0x1F, 0x11, 0x17, 0x18});
        sendCmd(0xCD, {0x31, 0x25, 0x27, 0x29, 0x2B});
        sendCmd(0xCE, {0x3F, 0x3E, 0x21, 0x37, 0x38});
        sendCmd(0xCF, {0x30, 0x24, 0x26, 0x28, 0x2A});
        sendCmd(0xD0, {0x3F, 0x3E, 0x20, 0x37, 0x38});
        sendCmd(0xD1, {0x06, 0x30, 0xA5, 0xDB, 0x30});
        sendCmd(0xD3, {0x3B, 0x08, 0x00, 0x00, 0x00, 0x00});
        sendCmd(0xD4, {0x67, 0x00, 0x00, 0x01, 0x00, 0x01});
        sendCmd(0xD5, {0x10, 0x10, 0x07, 0x07, 0x0F, 0x94, 0x26});
        sendCmd(0xD6, {0x00, 0x00, 0x40});
        sendCmd(0xD7, {0x01, 0x84, 0x20});
        sendCmd(0xDE, {0x02});
        sendCmd(0xB6, {0x1C});
        sendCmd(0xDE, {0x00});
        sendCmd(0x2A, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x2B, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x35);
        sendCmd(0x36, {0x00});
        sendCmd(0x3A, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0x11);            /* Sortie du mode sommeil */
        delay(120);
        sendCmd(0x29);            /* Activation de l'affichage */
        delay(10);
    }
};

/* =====================================================================
 *  Partie démo — c'est ici qu'il faut regarder
 *  Idée : à chaque image, calculer la couleur de chaque pixel ligne par ligne, puis pousser vers l'écran.
 *       Toutes les quantités « liées à la position, pas au temps » (sin, teinte, angle) sont précalculées en tables,
 *       à l'exécution chaque pixel ne fait que « consultation de table + additions/soustractions entières », d'où la fluidité des trois scènes.
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     /* 360 */
static constexpr int H = JD9855_QSPI::V_RES;     /* 360 */
static constexpr int CX = W / 2;                  /* Centre x */
static constexpr int CY = H / 2;                  /* Centre y */
static constexpr int RADIUS = 180;                /* Rayon visible de l'écran circulaire */
static constexpr int R2MAX  = RADIUS * RADIUS;    /* Seuil r² hors disque (180²=32400) */

static const int BLOCK_H = 40;             /* Rendu + poussée de 40 lignes par lot, réduit fortement le nombre de transferts */
uint16_t blockBuf[W * BLOCK_H];            /* Tampon de bloc (360*40*2=28KB, RAM interne, pas de PSRAM nécessaire) */
uint8_t  sinTab[256];       /* Table sin : sinTab[i] = sin(i/256*2π)*127+128 */
uint16_t hsvTab[256];       /* Teinte (0-255) -> table RGB565 (saturation/luminosité au max) */
uint8_t *angleTab = nullptr;/* Table d'angle par pixel relative au centre (360*360 o), évite d'appeler atan2 pour la scène du disque */

/* HSV(0-359, 0-255, 0-255) -> RGB565 */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v)
{
    uint8_t region = h / 60;
    uint8_t rem    = (h - region * 60) * 255 / 60;
    uint8_t p = (uint16_t)v * (255 - s) / 255;
    uint8_t q = (uint16_t)v * (255 - (uint16_t)s * rem / 255) / 255;
    uint8_t t = (uint16_t)v * (255 - (uint16_t)s * (255 - rem) / 255) / 255;
    uint8_t r, g, b;
    switch (region) {
        case 0:  r = v; g = t; b = p; break;
        case 1:  r = q; g = v; b = p; break;
        case 2:  r = p; g = v; b = t; break;
        case 3:  r = p; g = q; b = v; break;
        case 4:  r = t; g = p; b = v; break;
        default: r = v; g = p; b = q; break;
    }
    return JD9855_QSPI::color565(r, g, b);
}

/* Génère les deux tables sin / teinte au démarrage, le rendu ne fait plus que consulter */
void buildTables()
{
    for (int i = 0; i < 256; i++) {
        float s = sinf(i / 256.0f * 2.0f * (float)M_PI);
        sinTab[i] = (uint8_t)(s * 127.0f + 128.0f);
    }
    for (int h = 0; h < 256; h++) {
        hsvTab[h] = hsvTo565(h * 360 / 256, 255, 255);
    }
}

/* Précalcule l'angle (atan2) de chaque pixel par rapport au centre, stocké dans une table 0-255.
   La scène du disque ne fait que consulter la table à l'exécution, sans rappeler atan2f à chaque image (c'était la cause des saccades).
   Calculé une seule fois dans setup, le temps de calcul n'a pas d'importance. Placée en priorité en RAM interne (~126KB), repli sur PSRAM sinon ;
   si aucun des deux, mis à nullptr et la scène dégrade vers atan2f (encore visible, mais saccadé). */
void buildAngleTable()
{
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] Échec d'allocation de angleTab, scène du disque plus lente")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   /* -0.5..0.5 */
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);        /* Mappage circulaire vers 0-255 */
        }
    }
    Serial.printf("[INIT] Table d'angles %d KB prête (le disque sera fluide)\n", (int)(n / 1024));
}

inline uint8_t sin8(int phase) { return sinTab[(uint8_t)phase]; }

/* ---- Scène 1 : Plasma (flux de plasma) (table pure) ---- */
inline uint16_t plasmaPixel(int x, int y, int t)
{
    int v = sin8(x * 3 + t)
          + sin8(y * 3 - t * 2)
          + sin8((x + y) * 2 + t / 2)
          + sin8((x - y) * 2 - t / 2);
    return hsvTab[(uint8_t)(v / 4 + t)];
}

/* ---- Scène 2 : Palette arc-en-ciel (table d'angles + r², tout entier) ---- */
inline uint16_t wheelPixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;                 /* Hors disque mis à noir, bord net */
    int ang = angleTab ? angleTab[y * W + x]
                       : (int)(atan2f((float)dy, (float)dx) / (2.0f * (float)M_PI) * 256.0f);
    int hue = ang + r2 / 200 + t;             /* Superposition de la teinte le long du rayon, formant une palette en spirale */
    return hsvTab[(uint8_t)hue];
}

/* ---- Scène 3 : Ondulations radiales (r² directement en phase, pas de racine) ---- */
inline uint16_t ripplePixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;
    int v = sin8(r2 / 80 - t * 3);            /* Phase des ondulations : s'étend selon la distance + le temps */
    return hsvTab[(uint8_t)(v + r2 / 400)];
}

/* Rend une image : calcule BLOCK_H lignes puis pousse le bloc d'un coup (9 transferts au lieu de 360, ce qui économise le surcoût des commandes et améliore le framerate,
   tout en rafraîchissant simultanément chaque bloc de 40 lignes, réduisant fortement l'effet de balayage ligne par ligne). sceneId sélectionne la fonction de pixel (0=plasma 1=wheel 2=ripple) */
void renderFrame(int sceneId, int t)
{
    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = (H - by < BLOCK_H) ? (H - by) : BLOCK_H;
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            for (int x = 0; x < W; x++) {
                uint16_t c;
                switch (sceneId) {
                    case 0:  c = plasmaPixel(x, yy, t); break;
                    case 1:  c = wheelPixel(x, yy, t);  break;
                    default: c = ripplePixel(x, yy, t); break;
                }
                blockBuf[y * W + x] = c;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* Noms des scènes */
const char *SCENE_NAMES[] = { "Plasma (flux de plasma)", "Palette arc-en-ciel", "Ondulations radiales" };
const int      N_SCENES   = 3;
const uint32_t SCENE_MS   = 6000;    /* Chaque scène dure 6 secondes */

int      curScene   = 0;
uint32_t sceneStart = 0;

/* ----------------------------- setup ------------------------------- */
void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[TK015F5785] Démo colorée mono-fichier (JD9855 QSPI)"));

    Serial.println(F("[LCD] begin..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] init FAILED! Vérifier les broches/la version du core (esp32 v3.x requis)"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] init OK"));

    buildTables();
    buildAngleTable();          /* Précalcule la table d'angles pour des scènes de disque fluides */
    lcd.fillScreen(0);
    sceneStart = millis();
    Serial.printf("[DEMO] Scène 1/%d: %s\n", N_SCENES, SCENE_NAMES[curScene]);
}

/* ----------------------------- loop -------------------------------- */
void loop()
{
    int t = (int)(millis() / 12);     /* Pas d'avance de l'animation, plus c'est grand plus c'est rapide */

    renderFrame(curScene, t);

    if (millis() - sceneStart >= SCENE_MS) {
        sceneStart = millis();
        curScene   = (curScene + 1) % N_SCENES;
        Serial.printf("[DEMO] Scène %d/%d: %s\n",
                      curScene + 1, N_SCENES, SCENE_NAMES[curScene]);
    }
}
```

### Explication du code

Première étape : dans `JD9855_QSPI::begin()`, on initialise d'abord avec `spi_bus_initialize` un bus QSPI circulant sur 4 lignes de données, puis on attache avec `esp_lcd_new_panel_io_spi` un périphérique LCD IO avec `quad_mode = true` — c'est l'étape clé qui permet au driver de fonctionner : sans `quad_mode`, une seule des quatre lignes de données transmet réellement, et le framerate s'effondre.

Deuxième étape : `sendInitCommands()` recopie la table d'initialisation des registres fournie par le fabricant du panneau, envoyée élément par élément via `esp_lcd_panel_io_tx_param`. Il n'est pas nécessaire de comprendre la signification de chaque registre ; ne modifiez pas ce bloc si vous changez d'écran.

Troisième étape, et véritable point fort de ce code : aucune des trois scènes d'animation n'appelle à l'exécution les fonctions lentes `sin`, `atan2`, `sqrt`. Elles sont toutes précalculées sous forme de tables de recherche (`sinTab`, `hsvTab`, `angleTab`) dans la phase `setup()`, de sorte qu'à l'exécution chaque pixel ne fait que « consulter une table + additions/soustractions entières » — c'est ce qui permet à 360 × 360 = 129 600 pixels par image de rester fluide sans déchirement.

Quatrième étape : `renderFrame()` ne pousse pas ligne par ligne, mais accumule `BLOCK_H = 40` lignes avant un `pushRect` en bloc, si bien que 360 lignes ne nécessitent que 9 transferts, économisant une grande quantité de surcoût de commandes SPI par rapport à 360 transferts ligne à ligne.

---

## Dépannage

Pas de panique : les problèmes ci-dessous représentent la majorité des erreurs rencontrées pour allumer un écran circulaire :

**1. Écran complètement noir après la mise sous tension, et la série n'affiche pas `[LCD] init OK`** Vérifiez d'abord que la broche CS est correctement câblée — c'est le piège le plus fréquent dans les brouillons de ce code : `PIN_LCD_CS` avait été écrit par erreur `160` (un numéro de GPIO inexistant). Le bloc de code de cet article l'a corrigé en `16` ; si vous avez recopié une ancienne version provenant d'ailleurs, assurez-vous que cette ligne vaut bien `16` et non `160`.

**2. L'écran s'allume mais l'image est brouillée, les couleurs sont erronées** Très probablement l'ordre des quatre lignes de données D0~D3 est inversé. Le QSPI est sensible à l'ordre des lignes — ce n'est pas la même chose que d'inverser MOSI/MISO sur un SPI classique : vérifiez chaque fil à partir de la table de câblage, ne vous fiez pas au ressenti.

**3. Erreur de compilation indiquant que `esp_lcd_panel_io.h` est introuvable** Cela signifie que le core Arduino ESP32 est encore en v2.x (basé sur ESP-IDF v4.4). Ouvrez le gestionnaire de carte et mettez à jour le core esp32 d'espressif en v3.x ou supérieure avant de recompiler.

**4. Les quatre coins de l'écran circulaire restent toujours noirs, est-ce un mauvais câblage ?** C'est un comportement normal, pas une panne. Dans le code, `R2MAX = 180²`, et les pixels au-delà de ce rayon sont volontairement mis à noir, car la zone physiquement visible de l'écran circulaire est de toute façon un disque et les quatre coins sont masqués par le cadre — le bord n'en est que plus net.

**5. La série affiche `Échec d'allocation de angleTab` et la scène du disque devient saccadée** La RAM interne est insuffisante pour allouer cette table d'angles d'environ 126KB (360 × 360 octets). Le code implémente déjà une logique de repli : essayer d'abord la RAM interne, sinon basculer sur la PSRAM, et en dernier recours calculer à la volée avec `atan2f` (visible mais nettement plus lent). Si votre carte n'a pas de PSRAM et que la scène du disque semble toujours plus saccadée que les deux autres, c'est la cause ; remplacer par une carte avec PSRAM règle définitivement le problème.

**6. Le rétroéclairage reste allumé et impossible à éteindre** Dans le code, `PIN_LCD_BL` est défini à `-1`, et le commentaire précise « Le module actuel ne l'expose pas, donc non contrôlable » — si votre module expose effectivement la broche de contrôle du rétroéclairage, modifiez cette macro pour le numéro de GPIO correspondant et transmettez-la à `begin()` pour activer la gradation/l'extinction logicielle.

---

## FAQ

**Q : Comment allumer un écran circulaire avec un ESP32 ?** R : L'essentiel est d'utiliser l'interface QSPI + `esp_lcd_panel_io` pour se connecter directement au chip driver, sans dépendre d'une bibliothèque graphique générale comme TFT_eSPI. Câblez correctement les cinq lignes SCLK/D0~D3/CS et recopiez la séquence d'initialisation des registres fournie par le fabricant du panneau pour l'allumer.

**Q : Quelle bibliothèque utiliser pour un écran circulaire piloté par JD9855 ?** R : Aucune bibliothèque supplémentaire n'est nécessaire. Le JD9855 n'est pris en charge nativement par aucune bibliothèque graphique majeure (comme TFT_eSPI ou la liste officielle de drivers LVGL). L'approche la plus fiable consiste, comme dans cet article, à appeler directement l'API `esp_lcd_panel_io` intégrée à ESP-IDF et à écrire à la main quelques dizaines de lignes d'initialisation.

**Q : Quelle est la différence de câblage entre un écran QSPI et un écran SPI classique ?** R : Le SPI classique n'a qu'une seule ligne de données (MOSI), tandis que le QSPI en a 4 (D0~D3) transmises en parallèle, soit une bande passante 4 fois supérieure. En contrepartie, le câblage compte 3 fils supplémentaires et il faut obligatoirement mettre `flags.quad_mode` à `true` dans `esp_lcd_panel_io_spi_config_t`.

**Q : Pourquoi un écran circulaire sur ESP32-S3 reste-t-il noir ?** R : Les trois causes les plus fréquentes, par ordre de probabilité : broche CS mal câblée ou numéro erroné, version du core de la carte inférieure à v3.x entraînant un échec d'initialisation, alimentation instable (plus marquée lorsque le câblage QSPI est long). La présence ou non de `[LCD] init OK` sur la série permet de déterminer rapidement s'il s'agit d'un problème de driver ou de câblage.

**Q : Comment piloter un écran avec esp_lcd_panel_io sous Arduino ?** R : En trois étapes : `spi_bus_initialize` pour établir le bus SPI, `esp_lcd_new_panel_io_spi` pour créer le handle LCD IO (cette étape spécifie CS / fréquence d'horloge / mode SPI / quad_mode), puis `esp_lcd_panel_io_tx_param` pour envoyer les commandes et `esp_lcd_panel_io_tx_color` pour envoyer les données de pixels.

**Q : Peut-on utiliser la bibliothèque TFT_eSPI avec un écran circulaire ESP32 ?** R : TFT_eSPI cible principalement les chips drivers de sa liste de prise en charge intégrée ; les chips drivers QSPI peu courants comme le JD9855 n'en font pas partie. Forcer leur utilisation nécessite généralement de modifier soi-même la couche driver, ce qui s'avère moins simple que d'écrire directement le code avec l'API native ESP-IDF.

**Q : La mémoire est-elle suffisante pour un écran circulaire en 360 × 360 ?** R : Oui, mais il faut faire attention à la façon d'allouer. Un tampon plein écran d'un coup nécessite 360 × 360 × 2 octets ≈ 253KB ; cet article utilise un rendu par blocs (40 lignes par bloc, environ 28KB), plus l'éventuelle table d'angles de 126KB — la RAM interne suffit largement, pas besoin d'ajouter une PSRAM spécifiquement pour cet écran (sauf si vous voulez aussi garder sereinement la table d'angles en RAM interne).

---

## Aller plus loin

Une fois la démo de base fonctionnelle, cet écran circulaire ouvre plusieurs pistes à explorer :

- Remplacer les trois scènes par tables par des visualisations de données en temps réel (charge CPU, météo, fréquence cardiaque, etc. ; la forme circulaire se prête très bien à un tableau de bord)
- Ajouter une entrée tactile / un encodeur rotatif pour en faire un panneau de contrôle circulaire interactif
- Porter le même principe esp_lcd_panel_io vers d'autres écrans à chip driver QSPI
- Augmenter BLOCK_H et pclk_hz pour un stress-test de framerate afin de trouver la fréquence de rafraîchissement limite de votre module spécifique

---

## Références

- <cite index="3-1">La documentation officielle du périphérique LCD d'ESP-IDF indique que le composant esp_lcd est un ensemble d'API transversales aux chips fourni par Espressif pour prendre en charge divers écrans : SPI LCD, I80 LCD, RGB/SRGB LCD, etc.</cite> : [ESP-IDF LCD Peripheral (ESP32-S3)](https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32s3/api-reference/peripherals/lcd.html)
- [Fiche technique officielle de la série ESP32-S3 (PDF, Espressif officiel)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Dépôt GitHub officiel espressif/arduino-esp32](https://github.com/espressif/arduino-esp32)
- <cite index="3-2">La fiche technique publique du JD9855 (version Preliminary V0.00 publiée par le fabricant de chips Jadard, 2023-10-17 ; miroir PDF hébergé par OSPTek ci-dessous) liste les 540 voies source driver, la résolution 360 RGB×390, le GRAM intégré, les multiples interfaces 8080/SPI/QSPI/MIPI-DSI ainsi que les timings complets des commandes CASET/RASET/RAMWR, etc.</cite> : [JD9855 Data Sheet (Preliminary V0.00, PDF)](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
