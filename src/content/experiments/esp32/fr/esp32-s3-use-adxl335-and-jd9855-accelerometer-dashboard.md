---
title: "ESP32-S3 + ADXL335 sur écran circulaire JD9855 : tableau de bord d'accélération 3 axes | Pourquoi « secouer » est plus visible qu'« incliner »"
boardId: esp32s3
moduleId: display/tft15-jd9855
moduleIds:
  - display/tft15-jd9855
  - sensor/adxl335
category: esp32
date: 2026-08-05
intro: "Utiliser un ESP32-S3 + ADXL335 (GY-61) pour piloter un écran circulaire JD9855 QSPI afin d'afficher un tableau de bord d'accélération 3 axes en temps réel : câblage, code Arduino complet et dépannage des problèmes courants, avec l'explication des principes physiques de l'accéléromètre derrière le fait que « secouer produit plus d'effet qu'incliner »."
image: "https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg"
---

> Difficulté : ⭐⭐☆☆☆ (des bases d'utilisation d'Arduino suffisent pour s'en sortir)
> Temps estimé : 30 à 40 minutes (étalonnage et débogage inclus)
> Environnement de test : Arduino IDE 2.3.8 · ESP32 Arduino Core 3.3.10

---

> **TL;DR (prise en main rapide) :**
> 1. Câblez l'écran (QSPI 6 fils) et l'ADXL335 (trois entrées analogiques X/Y/Z) selon le tableau de câblage
> 2. GPIO5 / GPIO9 / GPIO10 sont toutes dans la plage ADC1 de l'ESP32-S3, pas de conflit avec le Wi-Fi à craindre
> 3. Après la mise sous tension, gardez l'appareil à plat et immobile, le programme va automatiquement échantillonner et étalonner le zéro (environ 1 seconde)
> 4. Inclinez lentement ou secouez franchement l'appareil, observez l'évolution synchronisée des trois anneaux colorés + de l'aiguille centrale sur l'écran circulaire

---

## Préambule

Après deux jours de bricolage, j'ai poussé en temps réel les données 3 axes de l'ADXL335 sur un écran circulaire 360×360 : quand on incline lentement l'appareil, l'aiguille bouge à peine ; par contre, une petite secousse ou un franc coup de poignet, et l'aiguille part d'un grand demi-tour d'un coup. J'ai d'abord cru que l'étalonnage était mauvais, mais après avoir fouillé dans la doc, j'ai fini par comprendre —— cet appareil, par principe physique, n'est pas un pur « inclinomètre » : il mesure une accélération, et plus tu secoues fort, plus la lecture est exagérée. C'est par conception, pas un bug. J'ai aussi remarqué que ma carte de développement ESP32-S3 fabriquée maison a une alimentation un peu juste : quand on branche le capteur, l'écran a des moments où il s'assombrit visiblement. Il va falloir que je mette à niveau ma carte ESP32-S3.

Cet article, en plus du câblage complet, du code et du journal des pièges rencontrés, a pour but d'expliquer clairement cette histoire de « pourquoi secouer produit plus d'effet qu'incliner », pour t'éviter de douter de tout ton montage quand tu reproduis l'expérience.

---

## Résultat de l'expérience

Cet écran circulaire 360×360 affiche en temps réel les données d'accélération 3 axes de l'ADXL335 (attention : accélération, pas un angle d'attitude pur) : les trois anneaux extérieurs rouge/vert/bleu correspondent respectivement aux axes X / Y / Z, l'aiguille colorée au centre pointe vers la direction de la force résultante actuelle, et plus tu secoues fort, plus l'amplitude de balancement de l'aiguille est exagérée ; le bord présente en plus un anneau à effet de respiration lumineuse pour la déco.

![](https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg)

---

## Composants

> La carte de développement ESP32-S3 n'a pas besoin d'être présentée — si tu lis cet article, c'est que tu as déjà utilisé un ESP32. Je détaille ci-dessous uniquement les deux autres composants centraux.

### Accéléromètre ADXL335 (module GY-61)

L'ADXL335 fait un peu comme un pèse-personne : il ne sait pas si tu « tiens debout bien droit », il sait seulement quelle force s'exerce dessus à l'instant t, et il te la décompose en composantes X/Y/Z. C'est un accéléromètre MEMS 3 axes à sortie analogique, chargé de convertir la force résultante subie par l'appareil (composante de gravité + accélération due au mouvement) en trois signaux de tension.

| Paramètre | Valeur |
| --- | --- |
| Type | Accéléromètre MEMS 3 axes à sortie analogique |
| Plage de mesure | ±3.6g (typique) / ±3g (valeur minimale garantie) |
| Sensibilité | 300 mV/g (valeur typique pour VS = 3V, proportionnelle à l'alimentation) |
| Tension de fonctionnement | 1.8V ~ 3.6V |
| Bande passante (par défaut sur le module GY-61) | Environ 50Hz (déterminée par le condensateur de filtrage de 0,1 μF embarqué) |
| Densité de bruit | X/Y environ 270 µg/√Hz, Z environ 550 µg/√Hz (Z vaut environ le double de X/Y) |

La raison pour laquelle je l'utilise est simple : pas cher, câblage simple pour une sortie analogique, on peut lire sur n'importe quelle broche ADC, idéal pour les petits projets de visualisation ; tant qu'on ne vise pas un calcul d'attitude de niveau pro, c'est largement suffisant.

### Broches

**ADXL335 (GY-61)**

| Broche du module | Description |
| --- | --- |
| VCC / GND | Alimentation 3.3V |
| X / Y / Z | Trois sorties analogiques, à connecter aux broches ADC |
| ST | Broche d'auto-test, généralement non connectée |

### Écran circulaire TK015F5785 (driver JD9855, interface QSPI)

Cet écran peut être vu comme « une toile qui ne comprend que les signaux de quatre fils de données » : le JD9855 est le chip driver, chargé de transférer les données de couleur envoyées par le MCU vers chaque pixel de l'écran ; l'interface QSPI (série sur quatre fils) permet d'obtenir une vitesse de rafraîchissement plus élevée avec moins de broches. C'est un écran TFT circulaire d'environ 1,5 pouce, résolution 360×360, pilotable via les cinq signaux SCLK/D0-D3/CS + l'alimentation, sans nécessiter de broche DC (données/commande) supplémentaire.

| Paramètre | Valeur |
| --- | --- |
| Dimensions | 1,5 pouce IPS circulaire |
| Résolution | 360 × 360 |
| Chip driver | JD9855 |
| Interface | QSPI (quatre fils) |
| Alimentation | 3.3V |
| Luminosité / contraste | Se référer à la fiche technique fournie par le vendeur (peut varier selon les lots) |

Le choix de cet écran est très direct : un écran circulaire est naturellement élégant pour les visualisations de type tableau de bord, l'interface QSPI n'occupe que 5 GPIO, plus économe en broches qu'un port parallèle classique, et le DMA de l'ESP32-S3 arrive à suivre.

### Broches

**Écran TK015F5785 (JD9855 QSPI)**

| Broche de l'écran | Description |
| --- | --- |
| SCLK | Horloge QSPI |
| D0 ~ D3 | Données QSPI sur quatre fils |
| CS | Chip select |
| VCC / GND | Alimentation 3.3V |

---

## BOM

| Composant | Référence / paramètres | Quantité | Prix unitaire indicatif | Usage |
| --- | --- | --- | --- | --- |
| Carte de contrôle | Carte de développement ESP32-S3 | 1 | Environ 30-50 yuans | Contrôle principal + réserve Wi-Fi/Bluetooth |
| Écran circulaire | TK015F5785 (JD9855, 360×360, QSPI) | 1 | Selon le vendeur | Affichage |
| Accéléromètre | ADXL335 (module GY-61) | 1 | Environ 8-15 yuans | Acquisition de l'accélération 3 axes |
| Fils Dupont | Femelle vers femelle | Plusieurs | - | Câblage |

---

## Câblage

**Écran → ESP32-S3**

| Broche écran | Broche ESP32-S3 |
| --- | --- |
| SCLK | GPIO6 |
| D0 | GPIO15 |
| D1 | GPIO7 |
| D2 | GPIO11 |
| D3 | GPIO12 |
| CS | GPIO16 |
| VCC | 3.3V |
| GND | GND |

**ADXL335 → ESP32-S3**

| Broche du module | Broche ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| X | GPIO5 (ADC1) |
| Y | GPIO9 (ADC1) |
| Z | GPIO10 (ADC1) |

Je recommande de tout revérifier un par un une fois le câblage terminé, ça économise 80 % du temps de débogage — surtout les quatre fils D0~D3 de l'écran : inverser un seul fil a de fortes chances de provoquer directement des pixels aléatoires ou un écran qui reste noir.

---

## Bibliothèques à installer

Aucune bibliothèque tierce à installer. Le driver de l'écran appelle directement les interfaces `esp_lcd_panel_io` et `driver/spi_master` intégrées à ESP-IDF, le driver QSPI est écrit à la main, rien à chercher dans le gestionnaire de bibliothèques.

Le seul point de version à respecter :

- Arduino IDE : 2.3.8 (test réussi)
- Pack de support de carte ESP32 (esp32 by Espressif Systems) : **3.3.10** (basé sur ESP-IDF 5.x) —— doit être en v3.x, car le flag `quad_mode` utilisé par le code et une partie des interfaces DMA ne sont pas forcément tous présents dans l'ancien core v2.x
- Choix de la carte : ESP32S3 Dev Module, USB CDC On Boot réglé sur Enabled

---

## Code

```cpp
/*
 * =============================================================================
 *  ADXL335 + écran circulaire TK015F5785 —— tableau de bord d'accélération 3 axes
 *  =====================================================================
 *
 *  Scène unique : tableau de bord d'accélération 3 axes —— affiche en temps réel les données 3 axes + direction de la force résultante, l'aiguille centrale pointe vers la force résultante
 *
 *  Matériel : ESP32-S3 + TK015F5785 (JD9855 QSPI) + ADXL335 (GY-61)
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                          Câblage                                     │
 *  ├─────────────────────────────────────────────────────────────────────┤
 *  │  [Écran TK015F5785]            │  [ADXL335 (GY-61)]                  │
 *  │  SCLK  → GPIO6                 │  VCC → 3.3V                         │
 *  │  D0    → GPIO15                │  GND → GND                          │
 *  │  D1    → GPIO7                 │  X   → GPIO5 (ADC)                  │
 *  │  D2    → GPIO11                │  Y   → GPIO9 (ADC)                  │
 *  │  D3    → GPIO12                │  Z   → GPIO10 (ADC)                 │
 *  │  CS    → GPIO16                │                                      │
 *  │  VCC   → 3.3V                  │                                      │
 *  │  GND   → GND                   │                                      │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 *  Dépendances : uniquement le core esp32 v3.x de l'Arduino IDE
 *  Téléversement : Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled
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
// Broches écran
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1

// Broches ADXL335 (entrées analogiques)
#define PIN_ACCEL_X    5
#define PIN_ACCEL_Y    9
#define PIN_ACCEL_Z    10

/* =====================================================================
 *  Classe driver écran JD9855 QSPI
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

    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b) {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1) {
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
        io_config.pclk_hz            = 20 * 1000 * 1000;  // Le câblage ne tient pas 40 MHz, retour à 20 MHz pour la stabilité
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

    void pushRect(int x, int y, int w, int h, const uint16_t *data) {
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

    void fillScreen(uint16_t color) {
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

    void ensureDmaBuf(size_t need) {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1) {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data) {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    void sendInitCommands() {
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
        sendCmd(0x11);
        delay(120);
        sendCmd(0x29);
        delay(10);
    }
};

/* =====================================================================
 *  Variables globales
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     // 360
static constexpr int H = JD9855_QSPI::V_RES;     // 360
static constexpr int CX = W / 2;                  // centre x = 180
static constexpr int CY = H / 2;                  // centre y = 180
static constexpr int RADIUS = 180;
static constexpr int R2MAX  = RADIUS * RADIUS;

static const int BLOCK_H = 40;
uint16_t blockBuf[W * BLOCK_H];

// Table d'angles par pixel relatif au centre (atan2 précalculé en 0-255), pour éviter d'appeler atan2f par pixel au rendu
uint8_t *angleTab = nullptr;

// Données accéléromètre (après filtrage)
float accelX = 0, accelY = 0, accelZ = 0;
// Valeurs centrales brutes de l'accéléromètre (valeur ADC au repos, à étalonner)
int accelXCenter = 2048, accelYCenter = 2048, accelZCenter = 2730;

// Définition des couleurs
uint16_t COLOR_BLACK;
uint16_t COLOR_WHITE;
uint16_t COLOR_LIGHT_GRAY;

/* =====================================================================
 *  Fonctions utilitaires
 * ===================================================================== */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v) {
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

void initColors() {
    COLOR_BLACK      = JD9855_QSPI::color565(0, 0, 0);
    COLOR_WHITE      = JD9855_QSPI::color565(255, 255, 255);
    COLOR_LIGHT_GRAY = JD9855_QSPI::color565(100, 100, 110);
}

/* =====================================================================
 *  Lecture et filtrage de l'accéléromètre
 * ===================================================================== */
void readAccelerometer() {
    // Lecture des valeurs ADC brutes (ESP32-S3 ADC 12 bits, 0-4095)
    int rawX = analogRead(PIN_ACCEL_X);
    int rawY = analogRead(PIN_ACCEL_Y);
    int rawZ = analogRead(PIN_ACCEL_Z);

    // Conversion en valeur normalisée de -1.0 à 1.0
    // ADXL335 sous 3.3V, environ 330mV par g, centre environ 1.65V
    // ADC 3.3V = 4095, donc environ 409 unités ADC par g
    float newX = (rawX - accelXCenter) / 409.0f;
    float newY = (rawY - accelYCenter) / 409.0f;
    float newZ = (rawZ - accelZCenter) / 409.0f;

    // Écrêtage
    newX = constrain(newX, -1.5f, 1.5f);
    newY = constrain(newY, -1.5f, 1.5f);
    newZ = constrain(newZ, -1.5f, 1.5f);

    // Filtre passe-bas (lissage)
    const float alpha = 0.3f;
    accelX = accelX * (1 - alpha) + newX * alpha;
    accelY = accelY * (1 - alpha) + newY * alpha;
    accelZ = accelZ * (1 - alpha) + newZ * alpha;
}

/* Précalcul de l'angle de chaque pixel par rapport au centre (atan2), stocké dans une table 0-255.
   À l'exécution, chaque pixel ne fait qu'une lecture de table pour retrouver les radians, plus d'atan2f par frame —— c'était le coupable des ralentissements.
   Calculé une seule fois dans setup. Priorité à la RAM interne (~126 Ko), repli sur PSRAM si insuffisant ;
   si aucun des deux, mis à nullptr, le rendu dégrade vers atan2f (l'affichage reste correct, mais plus lent). */
void buildAngleTable() {
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab : échec d'allocation, le rendu sera plus lent")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   // -0.5..0.5
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);
        }
    }
    Serial.printf("[INIT] Table des angles %d Ko prête\n", (int)(n / 1024));
}

/* =====================================================================
 *  Scène : tableau de bord d'accélération 3 axes
 *  Affiche les données 3 axes en temps réel, avec aiguille dynamique et valeurs
 * ===================================================================== */
void renderGaugeScene() {
    // ---- Constantes par frame (sorties de la boucle, pour éviter le recalcul par pixel) ----
    int t = millis() / 50;
    float breathe   = (sinf(t * 0.1f) + 1) / 2;
    float tiltAngle = atan2f(accelY, accelX);
    float tiltMag   = sqrtf(accelX * accelX + accelY * accelY);
    tiltMag = min(1.0f, tiltMag);
    float xAngle    = accelX * M_PI / 2;
    float yAngle    = -M_PI / 2 + accelY * M_PI / 2;
    float zVal      = (accelZ + 1) / 2;
    float fillAngle = -M_PI + zVal * 2 * M_PI;
    const float A8SCALE = M_PI / 128.0f;   // Table d'angles (0-255) -> radians

    // Les seuils de rayon utilisent tous r² (comparaison d'entiers), pour éviter sqrtf par pixel —— seul le petit bloc de l'aiguille centrale a besoin d'un float r
    const int R2_TICK_LO  = 160 * 160, R2_TICK_HI  = 175 * 175;
    const int R2_X_LO     = 135 * 135, R2_X_HI     = 155 * 155;
    const int R2_Y_LO     =  95 *  95, R2_Y_HI     = 115 * 115;
    const int R2_Z_LO     =  55 *  55, R2_Z_HI     =  75 *  75;
    const int R2_NDL_LO   =   5 *   5, R2_NDL_HI   =  50 *  50;
    const int R2_BR_LO    = 175 * 175, R2_BR_HI    = 180 * 180;
    const int R2_145_LO = 145 * 145, R2_145_HI = 146 * 146;
    const int R2_105_LO = 105 * 105, R2_105_HI = 106 * 106;
    const int R2_65_LO  =  65 *  65, R2_65_HI  =  66 *  66;
    const int R2_165    = 165 * 165;

    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = min(BLOCK_H, H - by);
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            const uint8_t *angRow = angleTab ? &angleTab[yy * W] : nullptr;  // On prend le pointeur de début de ligne une fois par ligne
            for (int x = 0; x < W; x++) {
                int dx = x - CX, dy = yy - CY;
                int r2 = dx * dx + dy * dy;

                if (r2 > R2MAX) {
                    blockBuf[y * W + x] = COLOR_BLACK;
                    continue;
                }

                float angle = angRow ? ((int8_t)angRow[x] * A8SCALE)
                                     : atan2f((float)dy, (float)dx);

                // Fond sombre
                uint16_t color = JD9855_QSPI::color565(15, 20, 30);

                // Graduations de l'anneau extérieur
                if (r2 > R2_TICK_LO && r2 < R2_TICK_HI) {
                    int deg = (int)((angle + M_PI) * 180 / M_PI) % 30;
                    if (deg < 3 || (r2 > R2_165 && deg % 10 < 2)) {
                        color = COLOR_LIGHT_GRAY;
                    }
                }

                // Axe X (anneau extérieur, rouge)
                if (r2 > R2_X_LO && r2 < R2_X_HI) {
                    float angleDiff = fabsf(angle - xAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(100 + tt * 155, 30, 30);
                    } else if (r2 >= R2_145_LO && r2 < R2_145_HI) {
                        color = JD9855_QSPI::color565(60, 20, 20);
                    }
                }

                // Axe Y (anneau moyen, vert)
                if (r2 > R2_Y_LO && r2 < R2_Y_HI) {
                    float angleDiff = fabsf(angle - yAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(30, 100 + tt * 155, 30);
                    } else if (r2 >= R2_105_LO && r2 < R2_105_HI) {
                        color = JD9855_QSPI::color565(20, 60, 20);
                    }
                }

                // Axe Z (anneau intérieur, bleu)
                if (r2 > R2_Z_LO && r2 < R2_Z_HI) {
                    if (angle < fillAngle || angle < -M_PI + 0.1) {
                        color = JD9855_QSPI::color565(30, 80, 200);
                    } else if (r2 >= R2_65_LO && r2 < R2_65_HI) {
                        color = JD9855_QSPI::color565(20, 30, 80);
                    }
                }

                // Aiguille centrale (pointe vers la force résultante) —— seul endroit qui a besoin d'un float r
                if (r2 > R2_NDL_LO && r2 < R2_NDL_HI) {
                    float r = sqrtf((float)r2);
                    float angleDiff = fabsf(angle - tiltAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    float needleWidth = 0.15f * (1 - r / 50);

                    if (angleDiff < needleWidth && r < 45 * tiltMag + 10) {
                        int hue = (int)(tiltAngle * 180 / M_PI + 180) % 360;
                        color = hsvTo565(hue, 200, 255);
                    }
                }

                // Point central
                if (r2 < 64) {
                    color = COLOR_WHITE;
                }

                // Décoration lumineuse respirante (breathe déjà calculée hors boucle)
                if (r2 > R2_BR_LO && r2 < R2_BR_HI) {
                    int hue = ((int)(angle * 180 / M_PI) + t * 2) % 360;
                    color = hsvTo565(hue, 255, 100 + breathe * 100);
                }

                blockBuf[y * W + x] = color;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* =====================================================================
 *  Programme principal
 * ===================================================================== */
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[ADXL335 + TK015F5785] tableau de bord d'accélération 3 axes"));

    // Initialisation des couleurs
    initColors();

    // Initialisation de l'ADC (ESP32-S3)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);  // Plage 0-3.3V
    pinMode(PIN_ACCEL_X, INPUT);
    pinMode(PIN_ACCEL_Y, INPUT);
    pinMode(PIN_ACCEL_Z, INPUT);

    // Étalonnage : lecture de la valeur centrale à l'état de repos
    Serial.println(F("[ACCEL] Étalonnage, gardez l'appareil à plat et immobile..."));
    delay(500);
    long sumX = 0, sumY = 0, sumZ = 0;
    for (int i = 0; i < 100; i++) {
        sumX += analogRead(PIN_ACCEL_X);
        sumY += analogRead(PIN_ACCEL_Y);
        sumZ += analogRead(PIN_ACCEL_Z);
        delay(10);
    }
    accelXCenter = sumX / 100;
    accelYCenter = sumY / 100;
    accelZCenter = sumZ / 100 - 409;  // Axe Z à environ 1g au repos, on retire l'offset de 1g
    Serial.printf("[ACCEL] Étalonnage terminé : X=%d, Y=%d, Z=%d\n", accelXCenter, accelYCenter, accelZCenter);

    // Initialisation de l'écran
    Serial.println(F("[LCD] Initialisation..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] Échec de l'initialisation !"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] Initialisation réussie"));

    buildAngleTable();   // Précalcul de l'angle de chaque pixel, pour un rendu fluide du tableau de bord

    lcd.fillScreen(COLOR_BLACK);
    Serial.println(F("[DEMO] tableau de bord d'accélération 3 axes"));
}

void loop() {
    // Lecture de l'accéléromètre
    readAccelerometer();

    // Rendu du tableau de bord
    renderGaugeScene();

    // Affichage des informations de débogage (une fois par seconde)
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint > 1000) {
        lastPrint = millis();
        Serial.printf("X=%.2f  Y=%.2f  Z=%.2f\n", accelX, accelY, accelZ);
    }
}
```

### Explication du code

- **Partie driver de l'écran** : la classe `JD9855_QSPI` appelle directement l'interface `esp_lcd_panel_io_spi` d'ESP-IDF pour un driver écrit à la main, sans dépendre d'aucune bibliothèque graphique tierce. `pclk_hz` a été volontairement réduit de 40 MHz (valeur courante) à 20 MHz, car quand les pistes sont longues, 40 MHz provoque facilement des pixels aléatoires : c'est la valeur stable trouvée après avoir essuyé des plâtres sur le banc, à ajuster toi-même si tes pistes sont courtes et que ton câble d'écran est de bonne qualité.
- **Table d'angles `buildAngleTable()`** : c'est le point clé des performances de tout le rendu. Première étape, dans `setup()`, l'angle de chaque pixel 360×360 par rapport au centre est précalculé, puis stocké compressé dans une table d'un octet en 0-255 ; deuxième étape, au rendu, chaque pixel ne fait qu'une seule lecture de tableau, sans appeler le `atan2f()` plus lent à chaque pixel. Cette optimisation détermine directement si le rafraîchissement du tableau de bord est fluide ou non.
- **Lecture et filtrage dans `readAccelerometer()`** : première étape, lecture de la valeur ADC brute ; deuxième étape, conversion de la tension en valeur normalisée -1~1 selon la conversion de 409 counts/g (ce coefficient vient de la sensibilité typique de 300 mV/g de l'ADXL335 × la valeur théorique de la pleine échelle 3.3V de l'ADC 12 bits de l'ESP32-S3, à ajuster en pratique selon ton propre module) ; troisième étape, un filtre passe-bas du premier ordre (`alpha = 0.3`) pour lisser le bruit.
- **Où se voit dans le code le fait que « secouer » produit plus d'effet que « incliner »** : la ligne `xAngle = accelX * M_PI / 2` mappe linéairement les ±1g de accelX sur ±90°. À l'inclinaison lente, la limite théorique de accelX est ±1g, ce qui correspond pile à ±90° ; mais à la secousse, l'accélération inertielle s'additionne à la gravité, et la lecture réelle de accelX dépasse souvent ±1, elle est écrêtée à ±1.5g par `constrain()`, donc l'angle mappé balaye beaucoup plus brusquement qu'à l'inclinaison lente —— ce n'est pas un problème de logique d'affichage, c'est imposé par la physique de l'accéléromètre.
- **Rendu de l'axe Z** : `zVal` mappe accelZ de -1~1 vers 0~1 puis le convertit en un angle de remplissage `fillAngle`, l'idée est en fait de présenter la valeur de l'axe Z sous forme d'« anneau de progression » ; si tu remarques que cet anneau de progression tremble légèrement en continu, c'est un phénomène normal (explication plus loin dans la FAQ).

---

## Dépannage des problèmes courants

Pas de panique, 80 % des problèmes viennent de ces quelques points :

1. **L'écran ne s'allume pas ou affiche des pixels aléatoires** : vérifie d'abord si les quatre fils de données D0~D3 du QSPI ne sont pas inversés, puis confirme que CS/SCLK sont bien connectés séparément, et enfin que l'alimentation de l'écran est stable à 3.3V (une ondulation de l'alimentation peut aussi provoquer des pixels aléatoires).
2. **La lecture de l'ADXL335 reste bloquée autour de 2048 sans bouger** : vérifie si tu n'as pas branché sur une broche ADC non fonctionnelle, ou si l'alimentation du module elle-même est anormale ; les GPIO5/9/10 utilisées dans ce projet sont toutes dans la plage ADC1 de l'ESP32-S3, non affectées par l'occupation d'ADC2 par le Wi-Fi, tu peux donc écarter cette hypothèse.
3. **La valeur de l'axe Z saute sans cesse** : c'est une caractéristique de conception d'origine de l'ADXL335, la densité de bruit de l'axe Z est naturellement plus élevée que celle des axes X/Y, ce n'est pas un problème de câblage ou de code. Tu peux réduire le coefficient de filtrage `alpha` (par exemple de 0.3 à 0.1), ou faire la moyenne de plusieurs échantillons dans le code (suréchantillonnage) pour atténuer le phénomène.
4. **Aucune réaction à l'inclinaison lente, mais une réaction à la secousse** : c'est la nature physique de l'accéléromètre —— il mesure la « force résultante », pas un simple angle d'attitude. Ce n'est qu'en associant un gyroscope pour faire de la fusion de capteurs que tu peux obtenir une sortie d'attitude stable non perturbée par le mouvement.
5. **Erreur de compilation, `esp_lcd_panel_io.h` introuvable** : vérifie la version du pack de support de carte ESP32 dans l'Arduino IDE, elle doit être en v3.x (basée sur ESP-IDF 5.x), les anciens core n'ont pas ces interfaces.
6. **Après étalonnage, la valeur centrale est nettement décalée** : l'appareil n'était pas à plat ou bougeait pendant la phase d'étalonnage, je conseille de le poser sur une table horizontale avant la mise sous tension et de ne pas y toucher pendant la seconde d'étalonnage.

---

## FAQ

**Q : L'ADXL335 mesure-t-il l'inclinaison ou le mouvement ?**
R : Strictement parlant, il mesure la « force spécifique » (synthèse de la composante de gravité + de l'accélération du mouvement), il ne peut pas distinguer les deux. Une inclinaison lente et continue ne modifie au maximum que la composante de gravité de ±1g, alors qu'une secousse ajoute l'accélération du mouvement et dépasse souvent ±1g en amplitude, donc visuellement « secouer » est bien plus visible que « incliner lentement ». Pour obtenir un angle d'attitude pur, il faut passer à une IMU 6 axes avec gyroscope (comme la MPU6050) et faire de la fusion de capteurs.

**Q : Pourquoi la lecture de l'axe Z saute-t-elle tout le temps, alors que X/Y sont relativement stables ?**
R : C'est une caractéristique de conception d'origine de l'ADXL335 —— la fiche technique indique que la densité de bruit de sortie de l'axe Z est environ le double de celle des axes X/Y, ce n'est pas un problème de câblage ou de code. Tu peux l'atténuer en augmentant le filtrage passe-bas ou en augmentant le suréchantillonnage ADC, mais impossible de l'éliminer complètement.

**Q : Le module GY-61 peut-il mesurer des mouvements jusqu'à quelle vitesse ?**
R : Le condensateur de filtrage embarqué est de 0.1μF, ce qui limite la bande passante de chaque axe à environ 50Hz, largement suffisant pour les secousses et inclinaisons du quotidien ; pour mesurer des vibrations à plus haute fréquence, il faut remplacer le condensateur de filtrage par une valeur plus faible.

**Q : Les GPIO5/9/10 de l'ESP32-S3 utilisées comme ADC risquent-elles d'entrer en conflit avec le Wi-Fi ?**
R : Non. Ces trois broches sont toutes dans la plage ADC1 de l'ESP32-S3 (GPIO1~10), seul l'ADC2 (GPIO11~20) est restreint quand le Wi-Fi fonctionne, ce projet n'a pas à s'en inquiéter.

**Q : Pourquoi faut-il garder l'appareil à plat et immobile pendant l'étalonnage ?**
R : Le code échantillonne en continu 100 fois après la mise sous tension et en fait la moyenne, qu'il utilise comme point de référence « 0g ». Si l'appareil est de travers ou en mouvement pendant l'étalonnage, le point de référence dérive, et toutes les conversions qui suivent seront décalées en conséquence.

**Q : Faut-il installer des bibliothèques tierces supplémentaires pour ce code ?**
R : Non. Le driver de l'écran appelle directement les interfaces `esp_lcd_panel_io` et `spi_master` intégrées à ESP-IDF et est écrit à la main ; tant que le pack de support de carte ESP32 dans l'Arduino IDE est en v3.x, c'est suffisant, rien à installer depuis le gestionnaire de bibliothèques.

---

## Aller plus loin

- Ajouter une IMU 6 axes (par exemple MPU6050), faire de la fusion de capteurs pour obtenir un vrai tableau de bord d'attitude stable, non perturbé par les secousses
- Extraire séparément « l'intensité de secousse » pour en faire un petit « détecteur de chocs » qui change de couleur ou déclenche une alarme au-delà d'un seuil
- Brancher un buzzer ou une LED RGB pour déclencher une alarme dès que l'inclinaison dépasse un angle défini, à utiliser comme niveau à bulle simplifié
- Enregistrer les données de mouvement sur une carte SD, puis les exporter pour tracer des courbes et faire un retour d'expérience

---

## Références

- [Page produit officielle et fiche technique de l'ADXL335 (Analog Devices)](https://www.analog.com/en/products/adxl335.html)
- [Condensateur de filtrage embarqué et bande passante du module GY-61 / ADXL335 breakout (Adafruit)](https://www.adafruit.com/product/163)
- [Fiche technique du chip driver JD9855 QSPI](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
- [Fiche technique de la série ESP32-S3 (Espressif, répartition des broches ADC1/ADC2)](https://documentation.espressif.com/esp32-s3_datasheet_en.pdf)
