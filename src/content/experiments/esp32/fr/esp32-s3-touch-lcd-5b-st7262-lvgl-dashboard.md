---
title: "Allumer l'écran RGB ST7262 avec l'ESP32-S3 + tableau de bord LVGL : tutoriel complet (Waveshare Touch-LCD-5B / 1024×600)"
boardId: esp32s3
moduleId: display/tft50-st7262
category: esp32
date: 2026-08-03
intro: "Avec l'ESP-IDF, allumer l'écran RGB de zéro sur la Waveshare ESP32-S3-Touch-LCD-5B (5 pouces 1024×600, ST7262 en RGB direct), y brancher LVGL, et réaliser un tableau de bord de télémétrie véhicule animé. On explique le contrôle du rétroéclairage via CH422G, le réglage de la PCLK, le double framebuffer en PSRAM et les animations en ease-in-out, avec code ESP-IDF complet et liste des pièges à éviter."
image: "https://img.lingflux.com/2026/08/b7d201de3550e7561294441b57a205de.jpg"
---

Difficulté : ⭐⭐⭐☆☆ (il suffit de connaître un peu le C et d'avoir touché à ESP-IDF)
Temps estimé : 2 à 3 heures (installation de l'environnement comprise)
Environnement de test : ESP-IDF 5.3.x (ou 5.2.7 avec une macro à ajouter) + LVGL ^9.3 + espressif/esp_lvgl_port 2.8

---

> **Résumé en une phrase** : avec l'ESP-IDF, sur la Waveshare ESP32-S3-Touch-LCD-5B (5 pouces 1024×600, ST7262 en RGB pur direct), on part d'un écran noir pour allumer l'écran RGB, y brancher LVGL, et finir par réaliser un tableau de bord de télémétrie véhicule animé. Tous les pièges dans lesquels je suis tombé (résolution trompeuse, écran blanc à cause de la PCLK, écran blanc par manque de mémoire LVGL, tearing et saccades) et le code pour les contourner sont ici.

---

> **TL;DR (démarrage rapide) :**
> 1. **Connaissez votre matériel** : la 5B est en **1024×600**, pilotée par le IC **ST7262**, en RGB pur direct — ne croyez pas le 800×480 par défaut des exemples officiels.
> 2. **PCLK à 16 MHz** : ne recopiez pas les 21 MHz définis par la carte, avec un framebuffer en PSRAM l'alimentation ne suit pas et l'écran devient tout blanc.
> 3. **Le rétroéclairage passe par le CH422G** : ce n'est pas un GPIO normal ni un PWM, il suffit d'écrire un octet à l'adresse I²C `0x38` pour l'allumer/éteindre.
> 4. **Pour LVGL, activez obligatoirement deux macros** : `LV_USE_CLIB_MALLOC=y` + `SPIRAM_USE_MALLOC=y`, sinon écran blanc + redémarrage du watchdog.
> 5. `idf.py build flash monitor`, ça s'allume, on sabre le champagne.

---

## Préambule

Ce week-end, en déplacement, un ami a acheté une **ESP32-S3-Touch-LCD-5B** de chez Waveshare. Il arrive à flasher le firmware officiel et l'affichage fonctionne, mais il n'arrive pas à l'allumer avec son propre code ; avec les exemples officiels, c'est tantôt noir, tantôt blanc, rien à en tirer. Je prends donc le relais pour me battre avec. C'est une carte de développement avec écran tactile capacitif RGB de 5 pouces en 1024×600. La carte n'est pas chère, mais elle est plutôt bien équipée — CAN, RS485, RTC, charge de batterie lithium, le tout avec 16 Mo de Flash + 8 Mo de PSRAM.

Je la reprends donc pour tenter de l'allumer — j'aime bien, ces derniers temps, allumer des écrans. Mais le processus pour y arriver a été plus long que prévu. Le point le plus décourageant : **si tu suis la doc et les exemples officiels Waveshare, tu n'arrives pas à l'allumer.** Ce n'est pas que tu es nul, c'est que les ressources officielles ne sont tout simplement pas prévues pour cette 5B.

J'ai découpé tout le processus en trois petits exemples progressifs, le code est sur GitHub ([dossier complet du projet](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B), les trois exemples y sont) :

1. **Allumer l'écran** : la méthode la plus simple, afficher un Hello World → [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
2. **Brancher LVGL** : faire un cadran de vitesse semi-circulaire avec animation d'aiguille → [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
3. **En faire un tableau de bord** : le transformer en panneau de télémétrie véhicule avec un vrai design → [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

**Objectif de cet article** : te livrer les pièges rencontrés dans ces trois étapes, le code pour les contourner avec le « pourquoi », et une fiche mémo anti-embûches prête à recopier, pour t'éviter quelques nuits blanches.

---

## Résultat de l'expérience

Tu obtiendras au final un **tableau de bord de télémétrie véhicule animé** : cinq cartes de données — régime, papillon, température d'eau, vitesse, tension — avec valeurs qui montent en ease-in-out, barres de progression qui passent au rouge en surcharge, et une aiguille fluide sans tearing.

![](https://img.lingflux.com/2026/08/032db1082c643b3c0cc44b993101ead1.jpg)

---

## I. Description de la carte : d'abord, connaissez cette 5B

Avant de foncer dans les pièges, posons les caractéristiques matérielles de cette ESP32-S3-Touch-LCD-5B. Les pièges qui suivent — quelle PCLK mettre, la mémoire suffit-elle, quelles broches partagent le même bus I²C — tournent quasiment tous autour de cette table, ce sera plus clair en s'y référant.

### L'écran (c'est lui qu'il faut d'abord identifier)

| Item | Spécification |
| --- | --- |
| Diagonale | 5 pouces |
| Type de dalle | IPS |
| Résolution | **1024 × 600** (mesuré ; la doc officielle ne distingue pas la 5B et met par défaut 800×480 — c'est le gros piège du chapitre I) |
| Couleurs | 65K couleurs |
| Interface | RGB (parallèle), IC pilote **ST7262**, RGB pur direct, **pas de commande d'initialisation SPI à envoyer** |
| Angle de vision | 175° |
| Luminosité | 550 cd/m² |
| Tactile | Tactile capacitif (dalle en verre comprise) |
| IC de surtension du rétroéclairage | AP3032KTR-G1 |

> **ST7262** est un IC pilote de dalle LCD à interface RGB (chez Sitronix), chargé de recevoir le signal RGB parallèle et de piloter les cristaux liquides. Dans ce projet, **tu n'as absolument pas à lui envoyer de commande d'initialisation** — alimente-le, donne-lui les bons timings, nourris-le en données, et il s'allume tout seul. Ça évite bien des soucis.

### Puce principale (MCU)

| Item | Spécification |
| --- | --- |
| Module | ESP32-S3-WROOM-1-**N16R8** |
| Cœurs | Xtensa 32-bit LX7 double cœur, jusqu'à 240 MHz |
| Flash | **16 Mo** |
| PSRAM | **8 Mo** (octal SPI) |
| SRAM interne | 512 Ko |
| Sans fil | Wi-Fi 2.4 GHz (802.11 b/g/n), Bluetooth 5 (LE), antenne embarquée |
| USB | USB Full-Speed, Type-C embarqué |

> La **PSRAM** est une mémoire externe à la puce, « grande mais lente ». C'est dans ces 8 Mo qu'est stocké le framebuffer de l'écran entier, et le DMA la balance en continu vers l'écran. **Ces 8 Mo de PSRAM, c'est l'endroit où vit l'image complète de l'écran.** Une PSRAM mal configurée en quad est un piège classique (voir chapitre VII).

### Tactile

| Item | Spécification |
| --- | --- |
| IC tactile | **GT911** |
| Type | Capacitif |
| Nombre de points | 5 points simultanés |
| Interface | I²C |
| Adresse I²C | **0x5D** |

> **GT911** est un contrôleur tactile capacitif qui convertit la position du doigt en coordonnées numériques et les remonte en I²C. Dans ce projet, il partage le même bus I²C (GPIO8/GPIO9) avec la RTC et le CH422G — les adresses doivent être planifiées. **Cette série d'exemples ne gère pas encore le tactile**, c'est une prochaine étape.

### Alimentation et interfaces

| Item | Spécification |
| --- | --- |
| Alimentation | Type-C 5 V / DC 7–36 V / batterie lithium 3,7 V (MX1.25) |
| Consommation | 5 V / 450 mA (typique) |
| CAN | Compatible CAN 2.0 (TJA1051, résistance de terminaison 120 Ω désactivée par défaut) |
| RS485 | Transceiver SP3485 (résistance de terminaison 120 Ω désactivée par défaut) |
| Température de fonctionnement | 0 °C ~ 65 °C |
| Dimensions | Carte nue 112.4 × 75.1 mm / avec boîtier 116.3 × 79 mm |

---

## II. Cartographie des ressources embarquées (présentes sur la carte, pas de câblage)

> ⚠️ **Cette carte est une carte de développement, les composants sont déjà soudés ; la table ci-dessous est la cartographie des ressources embarquées, pour vérifier les broches / configurer le SDK — pas pour brancher des fils Dupont.** Tu n'as qu'à : brancher le Type-C pour l'alimenter, et l'USB à un PC pour flasher le firmware.

### Brochage de l'interface RGB de l'écran

> Ci-dessous conforme à la doc officielle et vérifié sur carte réelle. Note que le GPIO0 est une broche de strapping (voir la liste des pièges au chapitre VII).

| ESP32-S3 GPIO | Signal LCD | Description |
| --- | --- | --- |
| GPIO0  | G3    | Green bit3 |
| GPIO1  | R3    | Red bit3 |
| GPIO2  | R4    | Red bit4 |
| GPIO3  | VSYNC | Synchronisation verticale |
| GPIO4  | TP_IRQ | Interruption tactile |
| GPIO5  | DE    | Data Enable |
| GPIO7  | PCLK  | Horloge pixel (16 MHz stable en pratique) |
| GPIO10 | B7    | Blue bit7 |
| GPIO14 | B3    | Blue bit3 |
| GPIO17 | B6    | Blue bit6 |
| GPIO18 | B5    | Blue bit5 |
| GPIO21 | G7    | Green bit7 |
| GPIO38 | B4    | Blue bit4 |
| GPIO39 | G2    | Green bit2 |
| GPIO40 | R7    | Red bit7 |
| GPIO41 | R6    | Red bit6 |
| GPIO42 | R5    | Red bit5 |
| GPIO45 | G4    | Green bit4 |
| GPIO46 | HSYNC | Synchronisation horizontale |
| GPIO47 | G6    | Green bit6 |
| GPIO48 | G5    | Green bit5 |

### Tactile / RTC / I²C externe (bus partagé)

| ESP32-S3 GPIO | Signal | Description |
| --- | --- | --- |
| GPIO8 | SDA / TP_SDA / RTC_SDA | Données I²C (partagé entre tactile GT911, RTC PCF85063, I²C externe) |
| GPIO9 | SCL / TP_SCL / RTC_SCL | Horloge I²C (partagé, idem) |
| GPIO4 | TP_IRQ | Interruption tactile |

### USB / SD / RS485 / CAN

| Fonction | ESP32-S3 GPIO | Description |
| --- | --- | --- |
| USB D- / D+ | GPIO19 / GPIO20 | USB Full-Speed |
| SD MOSI / SCK / MISO | GPIO11 / GPIO12 / GPIO13 | Carte SD (SPI) |
| SD CS | (CH422G EXIO4) | Actif à l'état bas, piloté par l'expandeur IO, pas sur le CS SPI natif |
| RS485 RXD / TXD | GPIO43 / GPIO44 | SP3485 |
| CAN TX / RX | GPIO15 / GPIO16 | TJA1051 |

### Une puce incontournable : l'expandeur IO CH422G

La puce sur laquelle sont accrochés le rétroéclairage et le reset, c'est le **CH422G**, piloté en I²C. Sa particularité : **pas de pointeur de registre, l'adresse I²C est directement utilisée comme commande**.

> **CH422G** est un expandeur IO en I²C qui centralise les signaux épars : rétroéclairage, reset écran, reset tactile, select de carte SD. Dans ce projet, tu t'en sers pour allumer le rétroéclairage et reset l'écran.

| Broche CH422G | Fonction | Description |
| --- | --- | --- |
| EXIO0 | DI0  | Entrée numérique 0 |
| EXIO1 | TP_RST | Reset tactile |
| EXIO2 | DISP | Enable rétroéclairage (ON/OFF uniquement, **pas réglable en luminosité**) |
| EXIO3 | LCD_RST | Reset écran |
| EXIO4 | SD_CS | Select carte SD (actif bas) |
| EXIO5 | DI1  | Entrée numérique 1 |
| OD0   | DO0  | Sortie numérique 0 |
| OD1   | DO1  | Sortie numérique 1 |

---

## III. À installer : la toolchain ESP-IDF + composants

Cette carte **n'a pas besoin de bibliothèque à installer**, mais elle utilise **ESP-IDF** (le framework officiel d'Espressif) et non Arduino. Raison : le combo RGB direct + framebuffer en PSRAM + LVGL implique des dizaines de switches dans sdkconfig (PCLK, mode PSRAM, pool mémoire) bien plus faciles à maîtriser en ESP-IDF ; sous Arduino, le réglage est vraiment pénible.

**Check-list (va-y point par point, ça t'épargnera 80 % du temps de débogage) :**

- [ ] **ESP-IDF 5.3.x** (recommandé). La 5.2.7 fonctionne aussi, mais il faut ajouter une macro (voir chapitre VII).
- [ ] **LVGL ^9.3** (`esp_lvgl_port` 2.8 dépend de constantes de couleur ajoutées en 9.3).
- [ ] **espressif/esp_lvgl_port 2.8** (gère pour toi l'horloge LVGL, la tâche dédiée, le verrouillage).
- [ ] **Utilisateurs Windows** : utilise PowerShell + profil EIM, **ne lance pas `idf.py` dans Git Bash** (il détecte `MSYSTEM` et refuse de fonctionner).

Les versions des composants doivent être appariées sur la même génération : `esp_lvgl_port` 2.8 avec LVGL `^9.3` ; sinon à la compilation tu te prends `RGB565_SWAPPED undeclared`.

---

## IV. Première étape : allumer l'écran (ne pas reprendre aveuglément l'exemple officiel)

> 📦 **Code complet de ce chapitre** : [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld) — la méthode la plus simple : allumer l'écran et afficher un Hello World.

C'est le plus gros piège de l'histoire, et c'est ce que je veux raconter en premier.

**L'exemple ESP-IDF officiel Waveshare (par exemple `08_lvgl_Porting`) et la doc sont essentiellement écrits pour du 800×480.** Sa branche `#else` par défaut est 800×480. La doc officielle englobe d'ailleurs toute la série 5 pouces sous un vague « 800×480 ou 1024×600 », **sans préciser ce qu'est la 5B**.

Si tu flashes l'exemple officiel tel quel sur la 5B, tu obtiens une image déroutante : **une grande zone noire avec une bande blanche sur la droite** (noir + blanc). Ce n'est pas une panne, c'est « nourrir une dalle 1024×600 avec un signal 800×480 » — la dalle est plus large que le signal, la partie droite sans signal s'affiche ainsi.

En plus, chez Waveshare, le suffixe **« B désigne souvent un écran carré »** (par ex. 4B est un 480×480 carré). J'ai d'abord cru que la 5B était un carré 720×720 avec initialisation SPI obligatoire. Après pas mal de péripéties, j'ai confirmé : **la 5B est bien en 1024×600, IC pilote ST7262, RGB pur direct, aucune commande d'initialisation SPI à envoyer.** Important, ça simplifie tout.

Donc la première étape, toujours : **ne fais pas confiance à la résolution de l'exemple officiel, vérifie toi-même ce que tu as réellement entre les mains.**

La méthode bourrine pour confirmer, c'est justement ce qui précède : nourrir l'écran en 800×480 et constater la bande blanche à droite — ce qui prouve que c'est du 1024×600 (une dalle plus large que le signal produit exactement cet effet).

### 4.1 Séquence de démarrage (la trame en 6 étapes)

Une fois le tempérament compris, on allume. La séquence de démarrage tient en 6 étapes : **bus I²C up → CH422G reset écran → créer la dalle RGB → dessiner l'image → allumer le rétroéclairage → le CPU se repose, le DMA auto-raffraîchit**.

L'ordre « desser l'image d'abord, allumer le rétroéclairage à la fin » est crucial — il évite l'image brouillée du premier frame au démarrage. Côté code, l'ordre d'allumage est fixe :

```c
/* Étape 1 : démarrer le bus I²C (GPIO8/9, partagé avec le tactile GT911 et la RTC). */
i2c_master_bus_handle_t i2c_bus = NULL;
i2c_master_bus_config_t bus_cfg = {
    .sda_io_num = 8, .scl_io_num = 9, .clk_source = I2C_CLK_SRC_DEFAULT,
    .flags.enable_internal_pullup = true,
};
i2c_new_master_bus(&bus_cfg, &i2c_bus);

/* Étape 2 : piloter le CH422G — reset puis relâcher (rétroéclairage encore éteint). */
ch422g_handle_t io = {0};
ch422g_init(&io, i2c_bus);
ch422g_set_outputs(&io, 0);                              /* EXIO à 0 : reset + rétroéclairage off */
vTaskDelay(pdMS_TO_TICKS(10));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST); /* relâche le reset, rétroéclairage toujours off */
vTaskDelay(pdMS_TO_TICKS(120));                          /* attend que la dalle monte */

/* Étape 3 : créer la dalle RGB, dessiner dans le framebuffer PSRAM (voir plus loin)... */

/* Étape 4 : image prête, dernière étape : allumer le rétroéclairage — mettre EXIO2 à 1. */
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

> **Règle d'or de l'ordre : le rétroéclairage s'allume toujours en dernier.** Au reset, tous les EXIO sont à 0 (rétroéclairage off), on relâche le reset, puis on dessine l'image ; une fois prête, on met EXIO2 à 1. Si tu fais l'inverse (rétroéclairage puis image), tu verras un frame brouillé au démarrage.

### 4.2 Comment le rétroéclairage « s'allume à 1 » : le driver minimal du CH422G

Le « allumer à 1 » du rétroéclairage, en code, c'est deux choses : écrire un driver CH422G, puis l'appeler dans le bon ordre dans la séquence de démarrage. Le cœur du driver tient en un point — **l'adresse fait office de registre** : on écrit le mode à `0x24` et un octet à `0x38` (cet octet est le niveau des 8 sorties). Le driver minimal ressemble à ça (version complète dans `main/ch422g.c` du dépôt) :

```c
/* CH422G : « registre » = l'adresse I²C 7-bit elle-même (pas d'octet de registre séparé). */
#define CH422G_REG_MODE  0x24   /* écrire 0x01 -> EXIO0..7 en sortie push-pull */
#define CH422G_REG_OUT   0x38   /* écrire un octet -> niveaux de EXIO0..7 */

/* Bits de sortie EXIO : bit n = niveau de EXIO_n (1 = haut). */
#define CH422G_TP_RST   (1u << 1)   /* EXIO1 reset tactile */
#define CH422G_BL       (1u << 2)   /* EXIO2 enable rétroéclairage */
#define CH422G_LCD_RST  (1u << 3)   /* EXIO3 reset écran */

/* On crée deux handles I²C pour les deux « adresse = registre ». */
esp_err_t ch422g_init(ch422g_handle_t *ch, i2c_master_bus_handle_t bus) {
    i2c_device_config_t mode_cfg = { .device_address = CH422G_REG_MODE, .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &mode_cfg, &ch->dev_mode);
    i2c_device_config_t out_cfg  = { .device_address = CH422G_REG_OUT,  .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &out_cfg,  &ch->dev_out);

    uint8_t mode = 0x01;                              /* mode sortie push-pull */
    i2c_master_transmit(ch->dev_mode, &mode, 1, -1);
    uint8_t zero = 0;
    i2c_master_transmit(ch->dev_out,  &zero, 1, -1);  /* tout à zéro au départ */
    return ESP_OK;
}

/* Un octet = les niveaux des 8 sorties — c'est ça, « l'adresse comme commande ». */
esp_err_t ch422g_set_outputs(ch422g_handle_t *ch, uint8_t exio_mask) {
    return i2c_master_transmit(ch->dev_out, &exio_mask, 1, -1);
}
```

### 4.3 Créer la dalle RGB (cœur du chapitre)

La création de la dalle est le cœur du chapitre ; les trois pièges qui suivent expliquent chaque ligne :

```c
#define LCD_H_RES        1024
#define LCD_V_RES        600
#define LCD_PIXEL_CLK_HZ (16 * 1000 * 1000)   /* ← piège 1 : 16 MHz, pas les 21 MHz de la carte */

/* En RGB565, vert sur 6 bits (0..63), rouge/bleu sur 5 bits (0..31), blanc pur = 31,63,31 (← piège 2). */
#define RGB565(r, g, b)   ((((r) & 0x1F) << 11) | (((g) & 0x3F) << 5) | ((b) & 0x1F))
#define COLOR_BG          RGB565(2, 8, 20)     /* fond bleu foncé */
#define COLOR_FG          RGB565(31, 63, 31)   /* vrai blanc */

esp_lcd_rgb_panel_config_t panel_cfg = {
    .data_width = 16,                          /* RGB565 = 16 bits */
    .bounce_buffer_size_px = 10 * LCD_H_RES,   /* bounce SRAM : évite l'écran blanc si 16 MHz ne suit pas */
    .disp_gpio_num = -1,                       /* rétroéclairage sur CH422G, pas un GPIO */
    .pclk_gpio_num  = 7, .vsync_gpio_num = 3, .hsync_gpio_num = 46, .de_gpio_num = 5,
    .data_gpio_nums = {
        14, 38, 18, 17, 10,        /* B3..B7 */
        39,  0, 45, 48, 47, 21,    /* G2..G7 */
         1,  2, 42, 41, 40,        /* R3..R7 */
    },
    .timings = {
        .pclk_hz = LCD_PIXEL_CLK_HZ,           /* ← piège 1 */
        .h_res = LCD_H_RES, .v_res = LCD_V_RES,
        .hsync_pulse_width = 30, .hsync_back_porch = 40, .hsync_front_porch = 220,
        .vsync_pulse_width = 4,  .vsync_back_porch  = 8,  .vsync_front_porch = 4,
        .flags.pclk_active_neg = true,
    },
    .flags.fb_in_psram = true,                 /* framebuffer ~1.17 Mo de l'écran complet en PSRAM */
};
esp_lcd_new_rgb_panel(&panel_cfg, &panel);
esp_lcd_panel_init(panel);                     /* ← piège 3 : ajouter cet appel après la création */
```

Une fois la dalle créée, tu récupères le framebuffer et tu peux écrire les pixels directement — l'API RGB d'ESP-IDF ne fournit pas de primitives de dessin en dehors de `draw_bitmap`. L'exemple helloworld embarque donc deux petits utilitaires, `lcd_fill` / `lcd_draw_text` (police matricielle, voir `lcd_draw.c` dans le dépôt) :

```c
/* Récupère le framebuffer en PSRAM, dessine Hello World. */
void *fb = NULL;
esp_lcd_rgb_panel_get_frame_buffer(panel, 1, &fb);
lcd_draw_init((uint16_t *)fb, LCD_H_RES, LCD_V_RES);
lcd_fill(COLOR_BG);
lcd_draw_text((LCD_H_RES - tw) / 2, (LCD_V_RES - th) / 2, "Hello World!", 5, COLOR_FG);

/* Image prête : on allume le rétroéclairage à la fin. Ensuite le DMA refresh depuis la PSRAM tout seul, le CPU se repose. */
vTaskDelay(pdMS_TO_TICKS(60));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

### 4.4 Les trois pièges dans lesquels je suis vraiment tombé

**Piège 1 : PCLK recopiée trop haute, écran entièrement blanc.** En recopiant la définition Arduino officielle de la carte, j'avais mis la PCLK (horloge pixel) à 21 MHz : l'écran devient **tout blanc** (pas noir). La vérité : l'image est en PSRAM et doit être lue en continu par le DMA pour alimenter l'écran. 21 MHz × 16 bits ≈ 336 Mbit/s de bande passante, c'est **trop** pour la chaîne « PSRAM → DMA → écran » ; dès que l'alimentation ne suit pas, l'écran ne reçoit pas de synchro valide et affiche un fond blanc « sans signal ». **Baisser à 16 MHz, ça stabilise tout.**

**Piège 2 : le texte blanc devenu rose, j'ai failli re-câbler les broches.** Une fois allumé, le blanc s'affichait en rose ; premier réflexe : les broches vertes sont inversées — faux. La vraie raison : **en RGB565 le vert est sur 6 bits (0–63), rouge et bleu sur 5 bits (0–31)**. Dans `RGB565(31, 31, 31)`, le 31 du vert ne fait pas la moitié de 0–63, donc rouge/bleu à fond, vert à moitié — ça donne du rose. Il faut `RGB565(31, 63, 31)` pour du vrai blanc. Deux types de dérive de couleur : **blanc → cyan = ordre des broches** ; **blanc → rose = mauvaise valeur saisie**.

**Piège 3 : il manquait une ligne d'initialisation.** La séquence canonique est « créer la dalle → reset → init → afficher », je n'avais appelé que la création. Dans la plupart des cas, la création lance automatiquement le scan, mais ajouter `esp_lcd_panel_init()` élimine le risque « DMA pas lancé » — sans lui, l'écran peut s'allumer de façon intermittente.

### 4.5 Le réflexe qui vaut le plus : observer « comment » ça ne s'allume pas

Face à un « ça s'allume pas », le réflexe le plus utile est **d'abord d'observer comment l'écran ne s'allume pas** :

- **Pas de rétroéclairage du tout** → côté CH422G / séquence de reset
- **Rétroéclairage on mais écran tout blanc/gris** → signal RGB incorrect (le plus fréquent, vérifier PCLK et timings)
- **Rétroéclairage on mais image brouillée/scintillante** → signal présent, timings un peu off
- **Rétroéclairage on mais couleurs erronées (blanc → cyan)** → ordre des canaux RGB inversé

Cette seule observation coupe le problème en deux et t'évite un tas de suppositions au hasard.

---

## V. Deuxième étape : brancher LVGL et animer l'aiguille

> 📦 **Code complet de ce chapitre** : [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer) — brancher LVGL et réaliser un cadran de vitesse semi-circulaire avec animation d'aiguille.

Une fois allumé, pour avoir une interface qui bouge, on monte **LVGL** (une bibliothèque graphique très populaire en embarqué). On la branche via le composant officiel `espressif/esp_lvgl_port`, qui gère l'horloge LVGL, la tâche dédiée et le verrouillage, puis balance l'image dessinée à l'écran.

> **LVGL** est une bibliothèque embarquée open source qui dessine les éléments d'UI (boutons, barres de progression, animations). Dans ce projet, elle sert à réaliser le cadran de vitesse et le tableau de bord, plutôt que d'écrire le code de dessin ligne par ligne.

Le branchement n'est pas long : le cœur, c'est créer la dalle RGB (l'exemple speedometer ajoute juste `.num_fbs = 2` par rapport à helloworld — c'est le double framebuffer anti-tearing), puis la confier à `esp_lvgl_port` :

```c
const lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
lvgl_port_init(&lvgl_cfg);

const lvgl_port_display_cfg_t disp_cfg = {
    .panel_handle  = panel,
    .buffer_size   = LCD_H_RES * LCD_V_RES, /* plein écran : exigence dure du direct mode */
    .hres          = LCD_H_RES, .vres = LCD_V_RES,
    .color_format  = LV_COLOR_FORMAT_RGB565,
    .flags = {
        .direct_mode = true,   /* dessiner directement dans le framebuffer de la dalle, économise une copie */
        .buff_dma    = false,
        .buff_spiram = true,   /* buffer de dessin en PSRAM (← piège 1 : il faut d'abord activer SPIRAM_USE_MALLOC) */
        .swap_bytes  = false,  /* dalle RGB parallèle, pas d'échange d'endianness */
    },
};
const lvgl_port_display_rgb_cfg_t rgb_cfg = {
    .flags = {
        .bb_mode       = true,  /* bounce buffer utilisé → synchronisation via on_bounce_frame_finish */
        .avoid_tearing = true,  /* change de fb en frontière de frame → anti-tearing (voir fin de chapitre) */
    },
};
lvgl_port_add_disp_rgb(&disp_cfg, &rgb_cfg);

/* Tout appel lv_* doit d'abord prendre ce verrou, pour ne pas entrer en collision avec la tâche de rendu esp_lvgl_port. */
lvgl_port_lock(0);
dashboard_create();   /* créer le cadran + lancer l'animation d'aiguille */
lvgl_port_unlock();
```

Trois flags font l'essence de ce bloc : `direct_mode` laisse LVGL dessiner directement dans le framebuffer de la dalle (une copie plein écran en moins) ; `avoid_tearing` fait basculer les deux fb en frontière de frame (anti-tearing) ; `buff_spiram` place le buffer de dessin en PSRAM — c'est celui qui a l'air inoffensif et qui cache le gros piège ci-dessous.

### 5.1 Piège 1 (le plus sournois) : écran blanc + redémarrage watchdog

Une fois branché et flashé, l'écran reste noir deux secondes, puis devient **tout blanc**, sans plus bouger. Symptôme **identique** à l'écran blanc d'une PCLK trop haute — j'ai failli repartir à bidouiller les timings.

**Heureusement, cette fois j'ai d'abord ouvert le moniteur série pour lire le log de démarrage**, et j'ai tout de suite vu la ligne qui tue :

```
E task_wdt: CPU 0: taskLVGL
```

La tâche LVGL a déclenché le watchdog et le système l'a jugée bloquée. **C'est un blocage logiciel, pas un problème de signal.** En remontant la pile d'appels, on voit que LVGL, lors du tout premier dessin plein écran, doit allouer un buffer de dessin de l'ordre du Mo ; or LVGL utilise par défaut son **propre pool interne, limité à 64 Ko** — 1 Mo ne rentre pas dans 64 Ko, le système s'acharne, n'arrive pas à terminer, la tâche se fige, le watchdog s'enflamme.

Drôle de détail : j'avais bien mis le buffer d'affichage en PSRAM, alors pourquoi parler de mémoire insuffisante ? Parce que **le buffer d'affichage** (pour « balancer à l'écran ») et **le pool mémoire interne de LVGL** (pour « calculer l'image ») sont deux choses différentes, ne les confonds pas. La solution, c'est deux switches :

```
CONFIG_LV_USE_CLIB_MALLOC=y    # LVGL utilise le malloc système, pas le petit pool de 64 Ko
CONFIG_SPIRAM_USE_MALLOC=y     # permet au malloc système d'aller chercher de gros blocs en PSRAM
```

> **Et une notion encore plus critique ici : un même « écran blanc » peut avoir au moins deux causes totalement différentes.** L'une est un problème de signal RGB / bande passante (la PCLK précédente), l'autre est un blocage logiciel qui n'atteint jamais le dessin (celle-ci). **Regarde toujours le log série pour distinguer**, ne te précipite pas sur les timings en voyant un écran blanc.

### 5.2 Pièges 2 et 3 : versions des composants et macros IDF désalignées

- **Piège 2 (appairer les versions de composants)** : `esp_lvgl_port` 2.8 utilise en interne des constantes de couleur ajoutées seulement en LVGL 9.3. Épingler LVGL en `~9.2` déclenche `RGB565_SWAPPED undeclared` ; passer à `^9.3` règle le souci.
- **Piège 3 (macros IDF désalignées)** : la nouvelle version de `esp_lvgl_port` vérifie la macro `SOC_LCDCAM_RGB_LCD_SUPPORTED`, mais ce nom **n'existe que depuis IDF 5.3** ; en 5.2.7 c'est l'ancien nom, et à l'exécution tu obtiens « This target does not support RGB ». Solution : ajouter `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)` avant `project()` dans le CMakeLists de plus haut niveau.

### 5.3 « Saccades » et « tearing » : ce n'est jamais une question de vitesse de calcul

Une fois le cadran lancé, deux nouveaux problèmes : l'aiguille n'est **pas assez fluide** et l'image **se déchire** (une ligne horizontale décalée au milieu). Ces deux soucis **n'ont rien à voir avec la vitesse de calcul**.

**D'abord, la fluidité.** J'ai d'abord calculé le taux de rafraîchissement physique de la dalle : PCLK 16 MHz ÷ nombre total de pixels par frame ≈ **20 Hz**. Autrement dit, la dalle ne peut afficher que 20 images par seconde au maximum, logiciels ou non — c'est un plafond matériel. Donc la fluidité n'est pas une question de framerate, mais **de courbe d'animation**. Une aiguille qui balaie à vitesse constante et s'inverse instantanément est très raide ; remplace par `ease-in-out` (décélération aux extrémités, accélération au milieu), le passage devient naturel.

```c
/* Cadran 270° : mode ROUND_INNER, démarre à 135°, laisse un vide de 90° en bas. */
lv_obj_t *scale = lv_scale_create(scr);
lv_obj_set_size(scale, 460, 460);
lv_scale_set_mode(scale, LV_SCALE_MODE_ROUND_INNER);
lv_scale_set_range(scale, 0, 120);
lv_scale_set_angle_range(scale, 270);
lv_scale_set_rotation(scale, 135);          /* angle de départ, décide de l'orientation du vide */
lv_scale_set_total_tick_count(scale, 25);   /* un trait tous les 5 km/h */
lv_scale_set_major_tick_every(scale, 4);    /* un trait majeur tous les 4 traits → 0,20,...,120 */

/* Appelé à chaque frame de l'animation : positionne l'aiguille sur v. La valeur numérique ne se rafraîchit que lorsque l'entier change. */
static void gauge_set_value(void *var, int32_t v) {
    gauge_ctx_t *g = (gauge_ctx_t *)var;
    lv_scale_set_line_needle_value(g->scale, g->needle, 150, v);  /* aiguille, longueur 150 px */
    int vi = (int)v;
    if (vi != g->last_int) {                 /* si l'entier ne change pas, on ne touche pas au label : on évite un redraw */
        g->last_int = vi;
        lv_snprintf(s_value_buf, sizeof(s_value_buf), "%03d", vi);
        lv_label_set_text(g->value_label, s_value_buf);
    }
}

/* 0 → 120 → 0, en boucle infinie. La fluidité tient à la dernière ligne. */
lv_anim_t a;
lv_anim_init(&a);
lv_anim_set_var(&a, &s_ctx);
lv_anim_set_exec_cb(&a, gauge_set_value);
lv_anim_set_values(&a, 0, 120);
lv_anim_set_duration(&a, 2500);                       /* 2,5 s à l'aller */
lv_anim_set_playback_duration(&a, 2500);              /* retour : 0→120→0 */
lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out);    /* ← décélère aux extrémités, le virage est naturel */
lv_anim_set_repeat_count(&a, LV_ANIM_REPEAT_INFINITE);
lv_anim_start(&a);
```

La ligne clé, c'est `lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out)`. `playback_duration` fait que l'animation va à 120 puis revient à 0, et à ce moment-là la vitesse devrait s'inverser brutalement ; `ease-in-out` la fait d'abord décélérer jusqu'à 0 puis réaccélérer en sens inverse — à l'œil nu, on ne voit quasiment pas le demi-tour.

**Ensuite, le tearing.** Cause : un seul buffer d'image. Le DMA balance en continu, LVGL écrit le nouveau pendant ce temps-là, sans synchro — il sort une frame « moitié ancienne, moitié nouvelle ». La solution : **double buffering + bascule sur synchro verticale** : deux images, le DMA ne balance toujours que celle qui est complète. **Attention : sur cette dalle il faut obligatoirement garder un petit buffer appelé bounce buffer** (pour éviter l'écran blanc si 16 MHz ne suit pas), donc c'est « double framebuffer + bounce ensemble » ; ne pas désactiver le bounce comme le fait l'exemple officiel.

> Sur cette dalle, **la fluidité vient de la courbe d'animation, l'absence de tearing vient du double buffering** — aucun des deux n'est lié à la vitesse de calcul.

---

## VI. Troisième étape : en faire un tableau de bord de télémétrie véhicule

> 📦 **Code complet de ce chapitre** : [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry) — transformer le tout en panneau de télémétrie véhicule à cinq cartes, avec du design.

Pour finir, j'ai remplacé le cadran de vitesse par un vrai **panneau de télémétrie véhicule** : cinq données — régime, papillon, température d'eau, vitesse, tension — chaque carte avec un grand chiffre, une barre de progression, des graduations min/max, et passage au rouge en surcharge. Les données sont simulées aléatoirement, mais les mouvements doivent rester naturels.

### 6.1 Comment les cartes sont assemblées

Chaque carte est un **conteneur `lv_obj` auquel on a retiré le style par défaut**, dans lequel on place label, unité, grand chiffre, barre de progression, graduations min/max. Toutes les coordonnées sont écrites en dur, le tout reposant sur des bordures 1 px + aplats de couleurs pour la stratification (pas d'ombre). Le cœur ressemble à ça (version complète dans `make_card` de `lvgl_dashboard.c`) :

```c
static void make_card(lv_obj_t *parent, int i) {
    const metric_cfg_t *c = &CFG[i];      /* géométrie / plage / seuil critique / couleur dans la table de config */
    metric_t *m = &s_m[i];
    m->accent = lv_color_hex(c->accent_hex);

    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_remove_style_all(card);                       /* on vire le style par défaut, on refait tout */
    lv_obj_set_pos(card, c->x, c->y);                    /* coordonnées en dur, pas de flex */
    lv_obj_set_size(card, c->w, c->h);
    lv_obj_set_style_bg_color(card, COL_CARD, 0);
    lv_obj_set_style_radius(card, 18, 0);
    lv_obj_set_style_border_color(card, COL_BORDER, 0);  /* stratification par bordure 1 px, pas d'ombre */
    lv_obj_set_style_border_width(card, 1, 0);

    lv_obj_t *lab = lv_label_create(card);
    lv_label_set_text(lab, c->label);
    lv_obj_align(lab, LV_ALIGN_TOP_LEFT, 0, 0);          /* label en haut à gauche ; unité idem en haut à droite */

    lv_obj_t *val = lv_label_create(card);
    lv_obj_set_style_text_font(val, &lv_font_montserrat_48, 0);  /* grand chiffre */
    lv_obj_align(val, LV_ALIGN_TOP_LEFT, 0, c->value_y);
    m->value = val;

    /* Barre : trough et indicator colorés séparément ; en cas de danger, l'indicator passe au rouge. */
    lv_obj_t *bar = lv_bar_create(card);
    lv_obj_remove_style_all(bar);
    lv_bar_set_range(bar, c->min, c->max);
    lv_obj_set_size(bar, c->w - 2 * c->pad, c->big ? 14 : 10);
    lv_obj_align(bar, LV_ALIGN_BOTTOM_LEFT, 0, -24);
    lv_obj_set_style_bg_color(bar, COL_BAR_BG, 0);                /* trough */
    lv_obj_set_style_bg_color(bar, m->accent, LV_PART_INDICATOR); /* indicator */
    m->bar = bar;
}
```

### 6.2 Donner vie aux chiffres : approche en ease-in-out, pas linéaire

L'approche la plus intuitive, c'est « valeur aléatoire, et on rattrape à vitesse constante ». Mais à vitesse constante, la vitesse tombe à zéro en atteignant l'objectif — très mécanique. J'utilise une **approche en ease-in-out** : chaque donnée mémorise la valeur affichée `current` et la cible `target`, et à chaque rafraîchissement on rattrape 1/6 de l'écart (décroissance exponentielle, plus on approche, plus c'est lent). Toutes les ~1,2 s, on dérive la nouvelle cible au hasard autour de la valeur courante, sans sauter n'importe où dans la plage — comme des données de vraie voiture :

```c
/* Toutes les 30 itérations (~1,2 s) on change de cible : dérive au hasard autour de la valeur courante, amplitude = 1/3 de la plage. */
if (tick % 30 == 0) {
    int span = (m->max - m->min) / 3;
    m->target = clampi(m->current + rnd_range(-span, span), m->min, m->max);
}
/* Rattrapage en ease-in-out : 1/6 de l'écart ; si l'écart est trop petit, on colle à la cible pour ne pas trainer un résidu. */
int diff = m->target - m->current;
if (diff > -6 && diff < 6) m->current = m->target;
else                       m->current += diff / 6;   /* ← c'est cette ligne qui fait la décroissance exponentielle */

/* La barre est mise à jour à chaque frame (c'est elle qui donne l'effet « vivant »). En cas de danger, l'indicator passe au rouge. */
bool danger = in_danger(m);   /* RPM≥6800 / température≥105 / tension≤10.8 ou ≥14.6 */
lv_bar_set_value(m->bar, m->current, LV_ANIM_OFF);
lv_obj_set_style_bg_color(m->bar, danger ? COL_DANGER : m->accent, LV_PART_INDICATOR);
```

Même logique que l'`ease-in-out` de l'aiguille — décélérer au moment du virage. Le test `danger` fait passer la barre au rouge en surcharge : c'est l'origine de l'effet « surcharge → rouge » du panneau.

### 6.3 Une petite optimisation utile : ne pas redessiner si rien n'a changé

Le rafraîchissement a lieu toutes les 40 ms, mais il arrive souvent que deux itérations consécutives produisent le même entier (surtout près de l'objectif, où ça ne bouge plus). Chaque appel à `lv_label_set_text` copie la chaîne et marque l'objet pour redraw — du travail pour rien. On ajoute donc : **mettre à jour uniquement quand le texte affiché change vraiment** :

```c
/* Valeur numérique : on ne fait le set_text que si la chaîne formatée a réellement changé. */
char buf[12];
fmt_scaled(m->current, m->scale, buf, sizeof(buf));
if (strcmp(buf, m->last_text) != 0) {
    strcpy(m->last_text, buf);             /* on mémorise pour comparer la prochaine fois */
    lv_label_set_text(m->value, buf);      /* strdup + redraw, uniquement sur vrai changement */
}
lv_obj_set_style_text_color(m->value, danger ? COL_DANGER : COL_VALUE, 0);
```

### 6.4 Quelques compromis d'UI embarquée

Sur un petit écran à résolution fixe, **écrire les coordonnées en dur** est plus simple et plus prévisible qu'un layout flex automatique ; les cartes **n'ont pas d'ombre** (les ombres LVGL sont un peu coûteuses à 20 Hz) — bordures et aplats suffisent à structurer ; la décimale de la tension est gérée par un scaling entier « 142 représente 14,2 », pour éviter une floppée de calculs flottants. Le scaling entier consiste à caser la géométrie / plage / seuil critique / couleur / scale de chaque métrique dans une table de config :

```c
/* Table de config, une ligne par métrique. Coordonnées / plage / seuil critique / couleur / scale sont dans la table, pratique pour régler tout ensemble. */
static const metric_cfg_t CFG[] = {
    /* label      unit    x   y    w   h  pad v_y  min  max  dHi  dLo init accent   sc big */
    { "ENGINE",  "RPM",  24, 84, 478,242, 28, 78,    0,8000,6800,  0, 850,0xFF5A3C, 1, 1 },
    { "BATTERY", "V",   688,346, 312,230, 24, 64,  100, 150, 146,108, 124,0xB08CFF,10, 0 },
    /*                                                                  ↑ scale=10 : 124 représente 12,4 V */
    /* ... les trois autres lignes sur le même principe */
};

/* À l'affichage, on divise : 124 → "12.4". Entier partout, pas de calcul flottant. */
static void fmt_scaled(int32_t v, int32_t scale, char *buf, size_t n) {
    if (scale == 10) lv_snprintf(buf, n, "%d.%d", (int)(v / 10), (int)(v % 10));
    else             lv_snprintf(buf, n, "%d", (int)v);
}
```

`scale=10` stocke la valeur ×10, `scale=1` stocke la valeur brute. L'ease-in-out, le test de danger, la barre de progression — tout tourne sur ces entiers, et la « traduction » avec décimale n'a lieu qu'au dernier moment, lors du formatage en chaîne.

---

## VII. Dépannage des problèmes courants (pas de panique, il n'y a que ces catégories)

> Pas de panique, 90 % des problèmes viennent de ces quelques endroits. Face à un phénomène bizarre, **commence par regarder le log série et calculer les paramètres physiques**, ne te précipite pas sur le code.

**À propos de cet écran**

- L'exemple/doc officiel est en 800×480 par défaut ; **directement appliqué à la 5B, tu obtiens fond noir + bande blanche à droite**. La 5B est en **1024×600, ST7262, RGB pur direct**, pas d'initialisation SPI.
- Le rétroéclairage passe par **CH422G** EXIO2, pas un GPIO normal ni un PWM (**ON/OFF uniquement, pas réglable en luminosité**).
- Le tactile GT911 (adresse I²C 0x5D) partage le bus I²C avec la RTC et le CH422G — attention à la planification des adresses ; cette série d'exemples **ne gère pas encore le tactile**, à suivre.

**Environnement de build (Windows)**

- **Ne lance pas `idf.py` dans Git Bash** : il détecte `MSYSTEM` et plante. Utilise PowerShell + profil EIM ; avant l'appel, fais `unset MSYSTEM` (ou `$env:MSYSTEM=$null`).
- Erreur « port is busy » sur le port série : c'est presque toujours un moniteur précédent mal tué ; vérifie qu'aucun résiduel ne traîne avant de flasher.
- `sdkconfig.defaults` modifié mais sans effet ? IDF ne réincorpore pas automatiquement les defaults dans un `sdkconfig` déjà existant — **supprime le `sdkconfig` pour qu'il soit régénéré depuis les defaults**.

**Allumage de l'écran**

- **Ne recopie pas les 21 MHz définis par la carte ; avec un framebuffer en PSRAM, commence à 16 MHz**, et si ça reste blanc, tente 12 MHz.
- Ne configure pas mal la PSRAM : N16R8 c'est de l'**octal** (`SPIRAM_MODE_OCT`), pas du quad.
- Après la création de la dalle, **n'oublie pas d'ajouter `esp_lcd_panel_init()`**.
- Attention, GPIO0 est une broche de strapping (doit être haute à la mise sous tension) ; après le boot, l'utiliser comme broche de données RGB ne pose aucun problème, mais n'y branche rien qui tirerait la broche vers le bas au démarrage.
- Pour la dérive de couleur, distingue bien les deux cas : **blanc → cyan = ordre des broches** ; **blanc → rose = valeur saisie pour le canal vert en RGB565** (le vert est sur 6 bits 0–63, le blanc pur s'écrit `31,63,31`).

**Pour faire tourner LVGL**

- **Il faut presque obligatoirement activer `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`**, sinon le pool interne LVGL de 64 Ko ne peut pas contenir le dessin plein écran, et le symptôme c'est écran blanc + redémarrage watchdog.
- Les versions de composants doivent être de la même génération : `esp_lvgl_port` 2.8 avec LVGL `^9.3`.
- IDF 5.2 avec un composant récent : ajoute `SOC_LCDCAM_RGB_LCD_SUPPORTED=1` dans le CMakeLists de plus haut niveau.
- **LVGL / esp_lvgl_port changent les noms d'API d'une version à l'autre** ; n'écris pas de mémoire, va lire les headers réels que tu as rapatriés.

**Fluidité et tearing**

- Calcule d'abord le taux de rafraîchissement physique de la dalle (~20 Hz ici) ; en dessous, les optimisations sont le plus souvent des problèmes de design d'animation.
- Pour la fluidité, le réflexe c'est `ease-in-out`, ne pas empiler du framerate.
- Tearing = buffer unique + pas de synchro ; la solution, c'est double framebuffer + `avoid_tearing`, **tout en conservant le bounce buffer**.

---

## VIII. FAQ

**Q : Quelle est la résolution de la Waveshare ESP32-S3-Touch-LCD-5B ? 800×480 ou 1024×600 ?**
R : La 5B est en **1024×600**. La doc officielle Waveshare englobe toute la série 5 pouces sous un vague « 800×480 ou 1024×600 », sans préciser la 5B. Méthode de vérification : flashe un signal 800×480, tu obtiens fond noir + bande blanche à droite, ce qui prouve que la dalle est plus large que le signal — donc 1024×600. Ne reprends pas le 800×480 de l'exemple officiel.

**Q : L'écran devient tout blanc, que se passe-t-il ?**
R : Regarde d'abord le log série pour distinguer deux cas. ① Pas d'erreur watchdog → probablement un signal RGB mal alimenté : la PCLK recopiée à 21 MHz est trop haute, descends à 16 MHz. ② Le log contient `task_wdt: taskLVGL` → c'est le pool mémoire LVGL trop petit qui fige la tâche : active `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`.

**Q : Peut-on régler la luminosité du rétroéclairage ? Pourquoi je ne trouve pas de broche PWM ?**
R : Non. Le rétroéclairage est accroché à EXIO2 de l'expandeur IO CH422G, deux états seulement (ON/OFF), pas PWM. Pour le rendre réglable, il faudrait modifier la carte matériellement (ajouter un buck/boost réglable) — côté logiciel, ce n'est pas possible.

**Q : Quel est le taux de rafraîchissement de cet écran ? Pourquoi l'aiguille rame-t-elle ?**
R : Environ **20 Hz** (PCLK 16 MHz ÷ nombre total de pixels par frame). C'est un plafond physique, aucun logiciel ne peut le dépasser. Les saccades ne sont quasiment jamais un problème de framerate, mais une courbe d'animation trop raide — remplace l'animation linéaire de l'aiguille par `ease-in-out`, le ralentissement naturel au virage rend l'animation fluide aussitôt.

**Q : Peut-on l'allumer dans l'IDE Arduino ? Pourquoi ESP-IDF ?**
R : Théoriquement oui (Arduino-ESP32 repose sur ESP-IDF en dessous), mais le combo RGB direct + framebuffer PSRAM + LVGL est vraiment pénible à configurer dans Arduino ; les switches comme PCLK, mode PSRAM, pool mémoire sont bien plus maîtrisables en ESP-IDF. Ce tutoriel est basé sur ESP-IDF.

**Q : Après flash LVGL, écran blanc + redémarrage watchdog, que faire ?**
R : Huit chances sur dix, c'est le pool interne de 64 Ko de LVGL qui ne peut pas contenir le dessin plein écran. Active deux switches dans sdkconfig : `CONFIG_LV_USE_CLIB_MALLOC=y` (LVGL utilise le malloc système) et `CONFIG_SPIRAM_USE_MALLOC=y` (permet au malloc d'aller chercher de gros blocs en PSRAM). Sur ESP32-S3 + PSRAM + grand écran, c'est quasi obligatoire.

**Q : PSRAM en quad ou octal ? Que se passe-t-il si on se trompe ?**
R : N16R8 c'est de l'**octal** (`SPIRAM_MODE_OCT`). Configuré en quad, la bande passante devient insuffisante, et le symptôme c'est écran brouillé/blanc ou instabilité dès que la PCLK monte un peu.

**Q : IDF 5.2.7 me dit « This target does not support RGB », comment faire ?**
R : La nouvelle version de esp_lvgl_port vérifie la macro `SOC_LCDCAM_RGB_LCD_SUPPORTED`, renommée seulement dans IDF 5.3 ; en 5.2.7 c'est encore l'ancien nom. Ajoute `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)` avant `project()` dans le CMakeLists de plus haut niveau.

---

## IX. Allons plus loin

Allumer l'écran n'est qu'un point de départ, cette carte ouvre plein d'autres pistes :

- **Gérer le tactile** : le GT911 est déjà sur l'I²C (GPIO8/9), un petit driver et tu as des boutons interactifs.
- **Lire des ressources depuis la SD** : l'emplacement SD embarqué (SPI) permet de charger images et polices, fini la mise en Flash de toutes les ressources.
- **Brancher le bus CAN** : le TJA1051 embarqué + le driver TWAI d'ESP-IDF, et tu obtiens une vraie sonde OBD pour véhicule — les chiffres du tableau de bord ne seront plus simulés.
- **Brancher du RS485** : le transceiver SP3485 pour capteurs industriels / équipements Modbus.
- **Ajouter une RTC pour le timekeeping hors tension** : le PCF85063 est lui aussi sur le bus I²C ; tu peux construire un enregistreur de données avec de vrais timestamps.

---

## X. Références

**Datasheets et pages produits officielles**

- [ESP32-S3 Datasheet (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Datasheet du module ESP32-S3-WROOM-1](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)
- [Page produit ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3)
- [Wiki Waveshare ESP32-S3-Touch-LCD-5B](https://docs.waveshare.net/ESP32-S3-Touch-LCD-5/?variant=ESP32-S3-LCD-5B-touch)

**Bibliothèques open source et frameworks**

- [Documentation officielle ESP-IDF](https://docs.espressif.com/projects/esp-idf/) (RGB LCD Panel, configuration PSRAM, driver I²C Master)
- [espressif/esp_lvgl_port (GitHub)](https://github.com/espressif/esp_lvgl_port)
- [Documentation officielle LVGL](https://docs.lvgl.io/) (widget scale, animations anim, barre de progression bar)

**Code de ce projet**

- Le code complet, la reproduction de chaque piège et la configuration finale sont sur GitHub, avec une doc détaillée dans chaque dossier d'exemple :
  - [Dossier complet du projet (avec les trois exemples)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)
  - [01 HelloWorld — allumer l'écran](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
  - [02 Speedometer — cadran de vitesse](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
  - [03 VehicleTelemetry — tableau de bord télémétrie véhicule](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

---

## Pour conclure

En y revenant, tout le chemin tient en trois couches : **allumer l'écran → brancher LVGL → créer l'interface**. Chaque couche a ses pièges attitrés, mais ces pièges se ressemblent souvent (deux sortes d'écran blanc, deux sortes de dérive de couleur), et ce qui fait travailler pour rien, c'est de se tromper de piège.

S'il ne fallait garder qu'une phrase pour ceux qui suivront, ce serait celle-ci — apprise à force de me vautrer dans les trois exemples :

> **Face à un phénomène bizarre, regarde d'abord le log série et calcule les paramètres physiques, ne te précipite pas sur le code.** Le piège de la résolution dans l'exemple officiel, l'écran blanc de la PCLK, l'écran blanc mémoire de LVGL — tout ressemble à « l'écran est mort », mais l'un est un problème de doc, l'autre de bande passante matérielle, l'autre de blocage logiciel. Si tu inverses la direction, tu travailles pour rien toute la nuit.
