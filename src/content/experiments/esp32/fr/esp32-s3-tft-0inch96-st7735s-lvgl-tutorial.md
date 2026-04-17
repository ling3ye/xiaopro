---
title: "ESP32-S3 + petit ecran couleur a 3$ avec animations LVGL | Guide pour debutants en 10 minutes"
boardId: esp32s3
moduleId: display/tft096-st7735s
category: esp32
date: 2026-04-10
intro: "Piloter un ecran TFT couleur ST7735S 0.96 pouce avec un ESP32-S3 et y faire tourner des animations LVGL. Du cablage au code complet, avec un guide anti-pieges inclus. Ideal pour les debutants en Arduino et en developpement embarque."
image: "https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png"
---

# ESP32-S3 + petit ecran couleur a 3$ avec animations LVGL ! Guide pour debutants en 10 minutes (edition anti-pieges 2026)

> **En une phrase** : ESP32-S3 + ecran TFT ST7735S 0.96 pouce + animations LVGL, avec 5 broches essentielles et un guide complet anti-pieges

## Resultat final

![image-20260410152138611](https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png)

> Un ecran 0.96 pouce, petit comme un ongle, et pourtant capable d'afficher des animations LVGL ultra-fluides. Ce guide couvre tout, du cablage au code, pour que vous n'ayez pas a galerez avec les memes pieges que nous.

------

Youtube：

<iframe width="560" height="315" src="https://www.youtube.com/embed/CQLLgFDcRxQ?si=FN2UYXNuTbGifnBN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

------



## Ce que vous allez apprendre

1. Comment l'ESP32-S3 pilote un ecran TFT ST7735S 0.96 pouce via SPI
2. La methode de configuration de la bibliotheque Arduino_GFX (et pourquoi on n'utilise pas TFT_eSPI)
3. Le processus complet pour porter LVGL v9 sur un petit ecran
4. Un exemple d'interface LVGL avec une double animation (deplacement horizontal + rebond vertical)



## BOM

| Composant                        | Quantite | Remarque                             |
| -------------------------------- | -------- | ------------------------------------ |
| Carte de developpement ESP32-S3  | 1        | N'importe quelle variante S3 convient |
| Ecran TFT IPS ST7735S 0.96 pouce | 1        | Resolution 80x160, interface SPI, 8 broches |
| Cables Dupont (femelle-femelle)  | Quelques | 8 suffisent                          |
|                                  |          |                                      |





## Specifications de l'ecran

![image-20260410113243742](https://img.lingflux.com/2026/04/e66957af12d082ebd30b5b8cdb06de8c.png)

> Pas besoin de tout retenir par coeur. Concentrez-vous sur les parametres avec **\***, ce sont ceux qu'il faut absolument connaitre pour ecrire le code.

| Parametre      | Specification        | Remarque                                                                  |
| -------------- | -------------------- | ------------------------------------------------------------------------- |
| Taille         | 0.96 pouce TFT IPS   | Angle de vue complet, bon rendu des couleurs                              |
| Resolution     | 80(H) x 160(V)       | ***** Dans le code : `screenWidth=160, screenHeight=80` (mode paysage)    |
| Pilote         | ST7735S              | ***** Doit correspondre au choix de bibliotheque                         |
| Interface      | SPI 4 fils           | Jusqu'a 40 MHz (recommande de tester d'abord avec la frequence par defaut) |
| Tension        | **3.3V**             | ***** Ne surtout PAS brancher en 5V !                                    |
| Nombre de broches | 8 broches         | Inclut la broche de retroeclairage BLK                                   |



| Parametre            | Specification              |
| -------------------- | -------------------------- |
| Zone d'affichage     | 10.8(H) x 21.7(V) mm      |
| Dimensions du panneau | 19(H) x 24(V) x 2.7(D) mm |
| Pitch des pixels     | 0.135(H) x 0.1356(V) mm   |
| Courant de fonctionnement | 20mA                     |
| Type de retroeclairage | 1 LED                    |
| Temperature de fonctionnement | -20 ~ 70C           |
| Dimensions du PCB    | 30.00 x 24.04 mm           |
| Diametre des trous de fixation | 2 mm                |
| Espacement des broches | 2.54 mm                  |

**Definition des broches :**

| N° | Broche | Description                                                        |
| -- | ------ | ------------------------------------------------------------------ |
| 1  | GND    | Masse                                                              |
| 2  | VCC    | Alimentation positive (3.3V)                                       |
| 3  | SCL    | Signal d'horloge SPI                                               |
| 4  | SDA    | Signal de donnees SPI                                              |
| 5  | RES    | Reinitialisation (niveau bas = reset)                              |
| 6  | DC     | Selection registre/donnees (bas = commande, haut = donnees)        |
| 7  | CS     | Chip Select (niveau bas = actif)                                   |
| 8  | BLK    | Controle du retroeclairage (niveau haut = allume ; sinon brancher sur 3.3V) |





## Cablage

| Broche ESP32-S3 | Broche ST7735S | Description                                   |
| --------------- | -------------- | --------------------------------------------- |
| GND             | GND            | Masse commune                                 |
| **3.3V**        | VCC            | **Strictement interdit de brancher en 5V**    |
| GPIO 12         | SCL            | Horloge SPI                                   |
| GPIO 11         | SDA            | Donnees SPI (MOSI)                            |
| GPIO 21         | RES            | Reinitialisation                              |
| GPIO 47         | DC             | Selection commande/donnees                    |
| GPIO 38         | CS             | Chip Select                                   |
| GPIO 48         | BLK            | Retroeclairage (si pas de controle logiciel, brancher directement sur 3.3V) |



### Precautions de cablage

- **Alimentation** : Brancher uniquement sur 3.3V. Le 5V detruirait l'ecran
- **Broche BLK (retroeclairage)** : Si vous n'avez pas besoin de controler le retroeclairage par logiciel, branchez-la directement sur 3.3V pour qu'il reste constamment allume
- **CS (Chip Select)** : Actif au niveau bas
- **RES (Reset)** : Necessite un niveau bas lors de l'initialisation au demarrage
- **Choix des broches** : Les broches ci-dessus utilisent les broches par defaut du SPI2 (FSPI) de l'ESP32-S3. Si vous changez de broches, vous devrez aussi modifier les definitions dans le code



## Installation des bibliotheques

Dans l'Arduino IDE, installez les deux bibliotheques suivantes :

1. **Arduino_GFX_Library** -- Cherchez "GFX Library for Arduino" et installez
2. **LVGL** -- Cherchez `lvgl` et installez (la version **v9.x** est requise)

> **Pourquoi Arduino_GFX plutot que TFT_eSPI ?**
>
> Pour clarifier les choses d'emblee : j'aime bien TFT_eSPI, je l'ai utilise pour piloter plein d'ecrans. Les deux bibliotheques peuvent piloter l'ecran ST7735S, mais leur approche de configuration est tres differente :
>
> **Le probleme de TFT_eSPI : il faut modifier les fichiers sources de la bibliotheque**
>
> TFT_eSPI exige que vous ouvriez le fichier `User_Setup.h` dans le dossier d'installation de la bibliotheque, pour y modifier manuellement les definitions de broches et le choix du pilote d'ecran. Ca implique :
>
> 1. Trouver le chemin d'installation de la bibliotheque (different selon le systeme : `Documents/Arduino/libraries/` ou `.platformio/packages/`)
>
> 2. Naviguer dans un fichier de configuration de plusieurs centaines de lignes pour trouver la bonne ligne, commenter les valeurs par defaut et decommenter celles que vous voulez
>
> 3. Si vous travaillez sur plusieurs projets avec des ecrans differents, il faut reprendre ces modifications a chaque changement
>
> 4. **Apres une mise a jour de la bibliotheque, votre configuration est ecrasee**, et votre projet ne compile plus du jour au lendemain
>
>    C'est aussi la plainte la plus courante : "J'ai suivi le tuto video mais j'ai un ecran blanc" -- souvent c'est parce que `User_Setup.h` a ete mal modifie ou n'a pas ete pris en compte.
>
>    **L'approche d'Arduino_GFX : les broches sont definies directement dans votre code**
>
>    En comparaison, avec Arduino_GFX toute la configuration se fait dans votre propre fichier `.ino` :
>
>    ```c
>    // Toutes les broches et parametres du pilote definis directement dans le code, sans modifier aucun fichier de bibliotheque
>    Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
>    Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
>    ```
>
>    - Changer de broche ? Modifiez une seule ligne `#define`
>
>    - Changer d'ecran ? Remplacez `Arduino_ST7735` par `Arduino_ILI9341` ou un autre pilote
>
>    - Mise a jour de la bibliotheque ? Votre code n'est pas affecte
>
>    - Plusieurs projets en parallele ? Chaque projet a sa propre configuration, sans conflit
>
>    **De plus, la compatibilite de TFT_eSPI avec l'ESP32-S3 pose deja probleme**. Plusieurs issues sur GitHub signalent des echecs de compilation avec ESP32 Arduino Core 3.x. Arduino_GFX est toujours activement maintenu et offre un meilleur support pour les nouvelles puces.





## Environnement de developpement

Environnement utilise pour cet exemple :

MacOS - v15.1.1

Arduino IDE - v2.3.8

Bibliotheque de carte : esp32 (by Espressif Systems) - v3.3.7

Bibliotheque de pilote d'ecran : GFX Library for Arduino (by Moon on our nation) - v1.6.5

Bibliotheque graphique : LVGL (by kisvegabor) - v9.5.0



## Code complet



```c
#include <Arduino_GFX_Library.h>
#include <lvgl.h>

// --- Broches et initialisation GFX ---
#define TFT_CS 38
#define TFT_RST 21
#define TFT_DC 47
#define TFT_MOSI 11
#define TFT_SCLK 12
#define TFT_BLK 48

#define BLACK   0x0000
#define WHITE   0xFFFF
#define ROTATION 1

Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);

static const uint32_t screenWidth  = 160;
static const uint32_t screenHeight = 80;

void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = lv_area_get_width(area);
  uint32_t h = lv_area_get_height(area);
  uint32_t stride = lv_draw_buf_width_to_stride(w, LV_COLOR_FORMAT_RGB565);
  uint8_t * row_ptr = px_map;

  for (uint32_t y = 0; y < h; y++) {
    gfx->draw16bitRGBBitmap(area->x1, area->y1 + y, (uint16_t *)row_ptr, w, 1);
    row_ptr += stride;
  }
  lv_display_flush_ready(display);
}

// ==========================================
// Definition des fonctions de rappel d'animation (pour recevoir les changements de valeur des animations LVGL)
// ==========================================

// Rappel : changer la coordonnee X de l'objet (deplacement horizontal)
static void anim_x_cb(void * var, int32_t v) {
  lv_obj_set_x((lv_obj_t *)var, v);
}

// Rappel : changer la coordonnee Y de l'objet (deplacement vertical)
static void anim_y_cb(void * var, int32_t v) {
  lv_obj_set_y((lv_obj_t *)var, v);
}

void setup() {
  Serial.begin(115200);
  pinMode(TFT_BLK, OUTPUT);
  digitalWrite(TFT_BLK, HIGH);

  gfx->begin();
  gfx->fillScreen(BLACK);

  lv_init();
  lv_display_t *display = lv_display_create(screenWidth, screenHeight);
  lv_display_set_color_format(display, LV_COLOR_FORMAT_RGB565);

  static lv_color_t buf[screenWidth * screenHeight / 10];
  lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(display, my_disp_flush);

  // Definir le fond de l'ecran en blanc
  lv_obj_set_style_bg_color(lv_scr_act(), lv_color_hex(0xFFFFFF), 0);

  // ==========================================
  // Disposition avancee de l'interface : creation d'un conteneur transparent pour envelopper les elements
  // ==========================================

  // 1. Creer un conteneur transparent (taille 100x60)
  lv_obj_t * cont = lv_obj_create(lv_scr_act());
  lv_obj_set_size(cont, 100, 60);
  lv_obj_set_style_bg_opa(cont, 0, 0);             // Arriere-plan completement transparent
  lv_obj_set_style_border_width(cont, 0, 0);       // Supprimer la bordure
  lv_obj_set_style_pad_all(cont, 0, 0);            // Supprimer les marges internes
  lv_obj_align(cont, LV_ALIGN_CENTER, 0, 0);       // Centrer le conteneur

  // 2. Placer le carre vert dans le conteneur, aligne en haut au centre
  lv_obj_t *rect = lv_obj_create(cont);
  lv_obj_set_size(rect, 30, 30);
  lv_obj_set_style_bg_color(rect, lv_color_hex(0x00FF00), 0);
  lv_obj_set_style_border_width(rect, 0, 0);
  lv_obj_align(rect, LV_ALIGN_TOP_MID, 0, 0);

  // 3. Placer le texte dans le conteneur, aligne en bas au centre
  lv_obj_t * label = lv_label_create(cont);
  lv_label_set_text(label, "hello world!");
  lv_obj_set_style_text_color(label, lv_color_hex(0x000000), 0);
  lv_obj_align(label, LV_ALIGN_BOTTOM_MID, 0, 0);


  // ==========================================
  // Ajout d'une double animation (moteur d'animation LVGL v9)
  // ==========================================

  // Animation A : faire deplacer le conteneur entier (carre + texte) de gauche a droite
  lv_anim_t a_x;
  lv_anim_init(&a_x);
  lv_anim_set_var(&a_x, cont);                       // Objet lie a l'animation : le conteneur
  lv_anim_set_values(&a_x, -30, 30);                 // Se deplacer de 30 pixels vers la gauche, puis 30 vers la droite
  lv_anim_set_time(&a_x, 2000);                      // Duree d'un deplacement : 2000 ms (2 secondes)
  lv_anim_set_playback_time(&a_x, 2000);             // Le trajet retour prend aussi 2000 ms
  lv_anim_set_repeat_count(&a_x, LV_ANIM_REPEAT_INFINITE); // Boucle infinie
  lv_anim_set_path_cb(&a_x, lv_anim_path_ease_in_out);     // Courbe "ease in-out" pour un mouvement fluide et naturel
  lv_anim_set_exec_cb(&a_x, anim_x_cb);              // Lier la fonction de rappel de l'axe X definie plus haut
  lv_anim_start(&a_x);                               // Lancer l'animation !

  // Animation B : faire rebondir le carre vert de haut en bas
  lv_anim_t a_y;
  lv_anim_init(&a_y);
  lv_anim_set_var(&a_y, rect);                       // Objet lie a l'animation : uniquement le carre vert
  lv_anim_set_values(&a_y, 0, 10);                   // Decalage vertical de 0 a 10 pixels
  lv_anim_set_time(&a_y, 300);                       // Rebond rapide, 300 ms par aller
  lv_anim_set_playback_time(&a_y, 300);
  lv_anim_set_repeat_count(&a_y, LV_ANIM_REPEAT_INFINITE);
  lv_anim_set_path_cb(&a_y, lv_anim_path_ease_in_out);
  lv_anim_set_exec_cb(&a_y, anim_y_cb);              // Lier la fonction de rappel de l'axe Y definie plus haut
  lv_anim_start(&a_y);                               // Lancer l'animation !
}

// Enregistrer l'instant du dernier passage
uint32_t last_tick = 0;
void loop() {
  // 1. Calculer le temps ecoule depuis le dernier passage dans loop
  uint32_t current_tick = millis();
  uint32_t elapsed_time = current_tick - last_tick;
  last_tick = current_tick;

  // 2. Transmettre le temps ecoule a LVGL (c'est absolument crucial pour que les animations fonctionnent !)
  lv_tick_inc(elapsed_time);

  // 3. LVGL traite les animations et le rafraichissement de l'interface
  lv_timer_handler();

  // 4. Petit delai pour eviter de saturer le CPU
  delay(5);
}
```





## Explication des lignes cles du code

> Voici les passages ou les debutants font le plus d'erreurs. Comparez ligne par ligne avec votre code :

### 1. Les parametres de decalage dans l'initialisation GFX



```c
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
```

Les 4 derniers chiffres `26, 1, 26, 1` correspondent a `col_offset1, row_offset1, col_offset2, row_offset2`. **Si l'affichage est decalé (le contenu est coin dans un angle ou avec une bordure noire), ajustez ces 4 valeurs.** Les modules ST7735S de differents fabricants ont des decalages differents ; ceux-ci sont les valeurs les plus courantes.

### 2. Taille de l'ecran -- attention a l'orientation paysage

```c
#define ROTATION 1  // Rotation en mode paysage
static const uint32_t screenWidth  = 160;  // Apres rotation, la largeur devient 160
static const uint32_t screenHeight = 80;   // Et la hauteur devient 80
```

L'ecran physique fait 80x160 (mode portrait). Avec `ROTATION=1`, une rotation de 90 degres le transforme en 160x80. **La taille du display LVGL doit correspondre a l'orientation apres rotation**, sinon l'image sera corrompue.

### 3. Le rappel flush -- le pont entre LVGL et GFX

```c
void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  ...
  lv_display_flush_ready(display);  // Cette ligne ne doit pas etre oubliee !
}
```

`lv_display_flush_ready()` indique a LVGL : "Cette zone est terminee, tu peux m'envoyer la suivante". **Si vous oubliez cette ligne = l'ecran ne se mettra jamais a jour.**

### 4. L'alimentation en temps dans la boucle loop

```c
lv_tick_inc(elapsed_time);
lv_timer_handler();
```

Ces deux lignes sont le "coeur" des animations LVGL. `lv_tick_inc` fournit le temps ecoule, `lv_timer_handler` declenche le rafraichissement de l'interface. **S'il en manque une seule, aucune animation ne fonctionnera.**





## FAQ : Problemes courants

| Symptome                                                 | Cause probable                                                      | Solution                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Ecran blanc (retroeclairage allume mais pas de contenu)** | Le rappel flush n'est pas correctement lie, ou `lv_display_flush_ready()` est absent | Verifiez que `my_disp_flush` est bien defini comme flush_cb                                 |
| **Ecran parasite / blocs de couleur aleatoires**         | Broches SPI mal branchees ou mauvais contact                       | ReVerifier le cablage, assurez-vous que les cables Dupont sont bien enfonces                |
| **Image decalée / bordure noire**                        | Les parametres de decalage ST7735S ne correspondent pas            | Ajustez les parametres `col_offset` et `row_offset` dans le constructeur `Arduino_ST7735`   |
| **Couleurs inversees (bleu au lieu de rouge, etc.)**     | Parametrage RGB/BGR incorrect                                       | Verifiez le parametre d'ordre des couleurs dans l'initialisation GFX                        |
| **Image retournee haut/bas**                             | Parametre de rotation incorrect                                     | Essayez de changer `ROTATION` a 0 ou 3                                                     |
| **Erreur de compilation : lvgl.h introuvable**           | Bibliotheque LVGL non installee ou mauvaise version                | Assurez-vous d'avoir installe **LVGL v9.x** (pas la v8)                                    |
| **Les animations ne bougent pas, interface statique**    | Il manque `lv_tick_inc()` ou `lv_timer_handler()` dans la boucle loop | Verifiez que les deux lignes sont bien presentes                                            |
