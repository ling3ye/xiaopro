---
title: "ESP32-S3 + Ecran OLED SH1106 1.3\" : Animation de poulpe cyborg | Tutoriel I2C + U8g2"
boardId: esp32s3
moduleId: display/oled13-sh1106
category: esp32
date: 2026-05-06
intro: "Pilotez un ecran OLED SH1106 1.3 pouce avec un ESP32-S3. Utilisez la bibliotheque U8g2 pour creer une animation de poulpe nageant avec des particules de bulles. Branchement I2C en 4 fils, algorithme de mouvement par courbe de Lissajous, guide de deverminage inclus."
image: "https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg"
---

# Tutoriel complet : Piloter un ecran OLED SH1106 1.3" avec un ESP32-S3 -- Animation de poulpe cyborg (I2C + U8g2)

Difficulte : ⭐⭐☆☆☆ (accessible aux debutants)
Temps estime : 30 minutes
Environnement de test : Arduino IDE 2.3.8 · U8g2 v2.35.30 · ESP32 Board Package 3.3.8

---

> **TL;DR (demarrage rapide) :**
>
> 1. Câblage : SDA → GPIO 8, SCL → GPIO 9, VCC → 3.3V, GND → GND
> 2. Installer la bibliotheque : U8g2 (auteur : oliver)
> 3. Dans le constructeur, remplacer l'adresse I2C par `0x3C * 2`, et dans l'initialisation Wire, utiliser `Wire.begin(8, 9)`
> 4. Televerser le code, le poulpe commence a nager
> 5. Le code utilise un algorithme de mouvement par courbe de Lissajous -- si les algorithmes vous interessent, lisez les details

---

## Introduction

Vous etes-vous deja demande, en parcourant les boutiques en ligne, comment ces petits ecrans OLED -- a peine plus grands qu'un ongle -- affichaient des animations aussi fluides dans les videos des vendeurs ?

C'est exactement ce qui m'est arrive. Le lendemain de l'apres-midi, j'avais commande un ecran OLED SH1106 1.3 pouce. Puis le probleme classique est arrive : l'ecran en main, le code televerse avec succes, l'ecran s'allume... mais n'affiche rien.

Apres un apres-midi de deverminage, j'ai decouvert que les problemes se concentraient sur deux points : **les broches I2C ne sont pas les valeurs par defaut 21/22**, et **le chip pilote SH1106 n'est pas un SSD1306** -- ils se ressemblent beaucoup mais ne sont pas interchangeables.

Une fois ces deux points eclaircis, tout s'est debloque. L'objectif de cet article : en 30 minutes, faites nager un poulpe sur votre ecran OLED, avec des bulles qui s'echappent de sa bouche.



---

## Resultat de l'experience



![ESP32-canva-017-1inch3-oled (1) (1)](https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg)



Un poulpe de 32×32 pixels nage sur l'ecran, suivant une trajectoire en courbe de Lissajous (cette elegante figure en forme de 8), tandis que des bulles de taille variable s'echappent de sa bouche et se dissipent progressivement.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/zw06nh7wXp4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Description des composants

### Ecran OLED SH1106 1.3"

Le SH1106 est un chip pilote d'ecran OLED monochrome. Il transforme les 0 et 1 de votre code en pixels lumineux sur l'ecran. Vous pouvez le voir comme un traducteur de matrice de points : vous lui dites « allume la ligne 30, colonne 50 », et il commande la diode electro luminescente organique correspondante.

| Parametre | Valeur |
|-----------|--------|
| Resolution | 128 × 64 pixels |
| Chip pilote | SH1106 (≠ SSD1306) |
| Interface de communication | I2C (adresse par defaut 0x3C) |
| Tension de fonctionnement | 3.3V / 5V compatible |
| Taille de l'ecran | 1.3 pouces |

> Pourquoi choisir celui-ci : pas cher, suffisant, et avec la bibliotheque U8g2, les animations matricielles sont faciles. Attention a ne pas acheter un SSD1306 0.96 pouce par erreur -- le chip pilote est different et le code ne fonctionnera pas directement (ecran blanc).

---

## Nomenclature (BOM)

| Composant | Quantite |
|-----------|----------|
| Carte de developpement ESP32-S3 | × 1 |
| Ecran OLED SH1106 1.3" (I2C) | × 1 |
| Câbles Dupont (mâle-vers-femelle) | × 4 |

---

## Schema de câblage

| Broche OLED SH1106 1.3" | Connexion ESP32-S3 |
|--------------------------|--------------------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

> Il est recommande de verifier chaque connexion une a une apres le câblage -- cela permet d'eviter 80 % du temps de deverminage. L'inversion SDA/SCL est la cause la plus frequente d'ecran blanc : tout semble alimente normalement, mais rien ne s'affiche.

---

## Installation de la bibliotheque

Dans le gestionnaire de bibliotheques d'Arduino IDE, recherchez **U8g2** et installez la version publiee par oliver.

Version testee avec succes : **U8g2 v2.35.30**

U8g2 est une bibliotheque d'affichage open source maintenue par [olikraus/u8g2](https://github.com/olikraus/u8g2). Elle prend en charge presque tous les chips pilotes OLED/LCD monochromes courants, y compris le SH1106.

---

## Code complet

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// Etape 1 : declarer l'objet U8g2
// Note : ici on choisit SH1106, 128×64, mode tampon complet, I2C materiel
// U8G2_R2 = rotation d'ecran de 180 degres (ajustez selon le sens de soudure de votre materiel, utilisez U8G2_R0 si aucune rotation n'est necessaire)
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R2, /* reset=*/ U8X8_PIN_NONE);

// ==================== Images d'animation du poulpe (stockees en Flash, economise la RAM) ====================
// Animation image par image en 4 images, chaque image 32×32 pixels, format matriciel XBM
const unsigned char animation_frame_0[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00,
  0x00, 0xFE, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00,
  0xE0, 0xFF, 0xFF, 0x01, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01,
  0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0x00, 0xEF, 0x3D, 0x00,
  0x00, 0xEF, 0x3D, 0x00, 0x00, 0xC7, 0x38, 0x00, 0x00, 0xC7, 0x38, 0x00,
  0x80, 0xC3, 0x70, 0x00, 0x80, 0xC3, 0x70, 0x00, 0x80, 0xC1, 0x60, 0x00,
  0x80, 0xC1, 0x60, 0x00, 0xC0, 0xC0, 0xC0, 0x00, 0xC0, 0xC0, 0xC0, 0x00,
  0x40, 0x80, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_1[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0xFC, 0x0F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01, 0xE0, 0xFF, 0xFF, 0x01,
  0xE0, 0xE7, 0xE7, 0x01, 0xE0, 0xE1, 0xE1, 0x01, 0xE0, 0xE7, 0xE7, 0x01,
  0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0x00, 0xFF, 0x3F, 0x00, 0x00, 0xFE, 0x1F, 0x00, 0x00, 0xDE, 0x1E, 0x00,
  0x00, 0xCF, 0x3C, 0x00, 0x80, 0xC7, 0x78, 0x00, 0xC0, 0xC3, 0xF0, 0x00,
  0xE0, 0xC1, 0xE0, 0x01, 0xE0, 0xC0, 0xC0, 0x01, 0xC0, 0xC0, 0xC0, 0x00,
  0x80, 0xC0, 0x40, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_2[] PROGMEM = {
  0x00, 0xF0, 0x00, 0x00, 0x00, 0xF8, 0x01, 0x00, 0x00, 0xFC, 0x03, 0x00,
  0x00, 0xFE, 0x07, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x80, 0xFF, 0x1F, 0x00, 0x80, 0xF9, 0x19, 0x00,
  0x80, 0xF0, 0x10, 0x00, 0x80, 0xF9, 0x19, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x00, 0xFE, 0x07, 0x00,
  0x00, 0xFC, 0x03, 0x00, 0x00, 0x6C, 0x03, 0x00, 0x00, 0x66, 0x06, 0x00,
  0x00, 0x63, 0x0C, 0x00, 0x80, 0x61, 0x18, 0x00, 0xC0, 0x60, 0x30, 0x00,
  0x60, 0x60, 0x60, 0x00, 0x30, 0x60, 0xC0, 0x00, 0x18, 0x60, 0x80, 0x01,
  0x0C, 0x60, 0x00, 0x03, 0x06, 0x60, 0x00, 0x06, 0x02, 0x60, 0x00, 0x04,
  0x00, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_3[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00, 0x00, 0xFE, 0x3F, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03, 0xF0, 0xF3, 0xF3, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x00, 0xF6, 0x06, 0x00,
  0x00, 0xF6, 0x06, 0x00, 0x00, 0x63, 0x0C, 0x00, 0x00, 0x63, 0x0C, 0x00,
  0x80, 0x61, 0x18, 0x00, 0x80, 0x61, 0x18, 0x00, 0x80, 0x60, 0x10, 0x00,
  0x80, 0x60, 0x10, 0x00, 0x40, 0x60, 0x20, 0x00, 0x40, 0x60, 0x20, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

// Placer les pointeurs des 4 images dans un tableau pour un acces circulaire facile
const unsigned char* animation_frames[] = {
  animation_frame_0, animation_frame_1, animation_frame_2, animation_frame_3
};

const int TOTAL_FRAMES = 4;
const unsigned long FRAME_DELAY = 120; // Intervalle entre les images (ms), diminuez pour accelerer, augmentez pour ralentir
int currentFrame = 0;
unsigned long lastFrameTime = 0;
const int SPRITE_SIZE = 32; // Taille de la matrice de points du poulpe 32×32

// ==================== Systeme de particules de bulles ====================
#define MAX_BUBBLES 10 // Maximum de 10 bulles simultanees a l'ecran

struct Bubble {
  float x;       // Coordonnee X actuelle
  float y;       // Coordonnee Y actuelle
  float radius;  // Rayon actuel (nombre a virgule flottante, pour reduire progressivement)
  float speedY;  // Pixels de remontee par image
  float wobble;  // Phase aleatoire d'oscillation gauche-droite
  bool active;   // Cette bulle est-elle "vivante"
};

Bubble bubbles[MAX_BUBBLES]; // Pool d'objets, evite l'allocation dynamique de memoire

void setup() {
  Serial.begin(115200);

  // Etape 2 : initialiser la graine aleatoire pour que les bulles soient differentes a chaque demarrage
  randomSeed(analogRead(0));

  // Etape 3 : initialiser I2C, specifier SDA=8, SCL=9
  Wire.begin(8, 9);
  u8g2.setI2CAddress(0x3C * 2); // U8g2 exige un decalage d'adresse d'un bit vers la gauche, 0x3C << 1 = 0x78
  u8g2.begin();

  // Etape 4 : marquer toutes les bulles comme inactives
  for (int i = 0; i < MAX_BUBBLES; i++) {
    bubbles[i].active = false;
  }

  Serial.println("Aquarium a poulpe demarre avec succes !");
}

void loop() {
  unsigned long currentTime = millis();

  // Utiliser un chronometrage non bloquant au lieu de delay() pour garantir une animation fluide
  if (currentTime - lastFrameTime >= FRAME_DELAY) {
    lastFrameTime = currentTime;

    // ======== Etape 1 : calculer la position du poulpe avec une courbe de Lissajous ========
    // Superposition de deux ondes sinusoidales de frequences differentes, produisant une elegante trajectoire en forme de 8
    float t = currentTime * 0.0008;

    float waveX = sin(t * 0.8) * 0.6 + sin(t * 0.3) * 0.4;
    int posX = 48 + (int)(waveX * 48); // Plage horizontale approximative 0~96

    float waveY = cos(t * 0.7) * 0.6 + sin(t * 0.4) * 0.4;
    int posY = 16 + (int)(waveY * 16); // Plage verticale approximative 0~32

    // ======== Etape 2 : 25 % de chance de generer une nouvelle bulle pres de la bouche du poulpe ========
    if (random(100) < 25) {
      for (int i = 0; i < MAX_BUBBLES; i++) {
        if (!bubbles[i].active) {
          bubbles[i].active = true;
          bubbles[i].x      = posX + 16 + random(-8, 8);   // Decalage aleatoire pres de la bouche
          bubbles[i].y      = posY + 24 + random(0, 5);
          bubbles[i].radius = random(15, 35) / 10.0;       // 1.5~3.5 pixels
          bubbles[i].speedY = random(10, 25) / 10.0;       // Vitesse de remontee aleatoire
          bubbles[i].wobble = random(0, 100) / 10.0;       // Phase d'oscillation aleatoire
          break; // Une seule bulle generee par image
        }
      }
    }

    // ======== Etape 3 : effacer le tampon, commencer le dessin ========
    u8g2.clearBuffer();

    // Dessiner le corps du poulpe (image matricielle XBM)
    u8g2.drawXBMP(posX, posY, SPRITE_SIZE, SPRITE_SIZE, animation_frames[currentFrame]);

    // ======== Etape 4 : mettre a jour et dessiner toutes les bulles actives ========
    for (int i = 0; i < MAX_BUBBLES; i++) {
      if (bubbles[i].active) {
        bubbles[i].y -= bubbles[i].speedY; // Remonter vers le haut

        // Oscillation gauche-droite synchronisee avec le temps, comme de vraies bulles dans l'eau
        float currentX = bubbles[i].x + sin(t * 3.0 + bubbles[i].wobble) * 4.0;

        // Retrecir progressivement la bulle, simulant la dissipation
        bubbles[i].radius -= 0.06;

        // Rayon trop petit ou depassement du haut de l'ecran -> recycler cette bulle
        if (bubbles[i].radius <= 0.5 || bubbles[i].y < -5) {
          bubbles[i].active = false;
        } else {
          // Dessiner un cercle vide -- plus realiste qu'un cercle plein
          u8g2.drawCircle((int)currentX, (int)bubbles[i].y, (int)bubbles[i].radius);
        }
      }
    }

    // Etape 5 : envoyer le contenu du tampon a l'ecran en une seule fois
    u8g2.sendBuffer();

    // Passer a l'image suivante
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }
}
```

### Explications du code

**Mouvement en courbe de Lissajous** : la superposition de deux ondes sinusoidales/cosinusoidales de frequences differentes fait suivre au poulpe une elegante trajectoire en forme de 8, bien plus esthetique qu'un simple mouvement de va-et-vient, et tout cela avec seulement quelques lignes de fonctions trigonometriques.

**Pool d'objets de bulles** : 10 structures `Bubble` sont pre-allouees, avec un indicateur `active` pour gerer leur cycle de vie, evitant la fragmentation memoire causee par `new/delete` -- une approche courante et fiable sur MCU.

**Mot-cle `PROGMEM`** : ajouter ce mot-cle aux tableaux matriciels les stocke en Flash au lieu d'occuper la SRAM precious. 4 images × 128 octets = 512 octets, ce serait du gaspillage en RAM.

**Chronometrage non bloquant** : utiliser `millis()` au lieu de `delay()` permet de coordonner naturellement la mise a jour physique des bulles et le changement d'images d'animation dans la meme boucle, sans saccades.

---

## Resolution des problemes courants

Ne paniquez pas, 90 % des problemes proviennent de ces quelques points :

**L'ecran ne s'allume pas du tout / aucune sortie**
Verifiez d'abord l'alimentation -- VCC est connecte au 3.3V et non au 5V (bien que de nombreux modules soient compatibles 5V, confirmez d'abord). Ensuite, utilisez un multimetre pour verifier que les deux fils SDA/SCL ne sont pas inverses -- c'est l'erreur la plus frequente.

**L'ecran est allume mais tout blanc ou tout noir, aucune image**
Il s'agit probablement d'un probleme d'adresse I2C. Le code utilise `0x3C * 2`, c'est une exigence d'U8g2. Si le cavalier d'adresse I2C au dos de votre ecran est regle sur `0x3D`, remplacez `0x3C` par `0x3D` et reessayez. Vous pouvez aussi executer un I2C Scanner pour confirmer l'adresse.

**L'image s'affiche mais a l'envers**
Remplacez `U8G2_R2` par `U8G2_R0` dans le constructeur -- la seule difference est une rotation de 180 degres.

**Le poulpe depasse les bords de l'ecran**
La valeur maximale de `posX` est d'environ 96, plus 32 pixels de largeur ce qui atteint exactement la limite 128. Si vous modifiez les parametres d'amplitude de mouvement, veillez a ne pas depasser `128 - SPRITE_SIZE`.

**Les bulles semblent saccadees**
Essayez de reduire `FRAME_DELAY` de 120 a 80. Si c'est encore saccade, verifiez la vitesse du bus I2C -- vous pouvez ajouter `Wire.setClock(400000)` apres `Wire.begin(8, 9)` pour passer en mode rapide (400 kHz).

---

## FAQ

**Q : Peut-on utiliser d'autres broches GPIO pour l'I2C ?**
R : Oui, l'I2C de l'ESP32-S3 prend en charge le mappage vers n'importe quel GPIO. Il suffit de remplacer les numeros dans `Wire.begin(8, 9)` par les broches souhaitees -- SDA en premier, SCL en second.

**Q : Mon ecran est un SSD1306 0.96 pouce, le code fonctionne-t-il directement ?**
R : Non, le chip pilote est different. Remplacez le constructeur par `U8G2_SSD1306_128X64_NONAME_F_HW_I2C`, le reste du code peut etre conserve.

**Q : Quelle vitesse I2C est prise en charge ?**
R : Le SH1106 supporte le mode standard a 100 kHz et le mode rapide a 400 kHz. Ce code ne definit pas explicitement la vitesse, donc il utilise par defaut 100 kHz. Si le rafraichissement vous semble lent, ajoutez `Wire.setClock(400000)`.

**Q : A quoi sert PROGMEM, peut-on le supprimer ?**
R : `PROGMEM` stocke les tableaux en Flash au lieu de la SRAM. Les 4 images matricielles representent environ 512 octets -- les supprimer n'affectera pas la fonctionnalite, mais occupera 512 octets de SRAM. L'ESP32-S3 a une SRAM genereuse, donc ce n'est pas un probleme, mais il est recommande de le garder par bonne pratique.

**Q : Comment rendre le poulpe plus rapide ou plus lent ?**
R : Modifiez la valeur de `FRAME_DELAY` -- un nombre plus petit rend l'animation plus rapide, un nombre plus grand la ralentit. La vitesse de remontee des bulles est controlee par la plage de `speedY` via `random(10, 25) / 10.0`, egalement ajustable.

**Q : Combien de RAM l'ecran utilise-t-il ?**
R : Le mode tampon complet d'U8g2 (`_F_`) maintient un tampon de trame complet en RAM : 128×64 / 8 = 1024 octets, soit environ 1 Ko. L'ESP32-S3 dispose de 512 Ko de SRAM, c'est largement suffisant.

---

## Idees d'extensions

- **Changer de personnage** : utilisez [image2cpp](https://javl.github.io/image2cpp/) pour convertir n'importe quelle image noir et blanc en matrice de points XBM, et remplacez le poulpe
- **Ajouter de l'interactivite avec des capteurs** : connectez un capteur de son, la vitesse de nage du poulpe varie avec le volume
- **Multi-ecrans** : deux ecrans OLED sur le meme bus I2C (adresses 0x3C et 0x3D respectivement), un poulpe de chaque cote
- **Version ecran couleur TFT** : remplacez par un ST7789 TFT couleur, utilisez des degrade de gris pour des bulles plus detaillees

---

## References

- [Fiche technique ESP32-S3 Espressif (officielle)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_cn.pdf)
- [Page GitHub de la bibliotheque U8g2 (olikraus/u8g2)](https://github.com/olikraus/u8g2)
- [Datasheet du chip pilote SH1106 (Sino Wealth)](https://www.velleman.eu/downloads/29/infosheets/sh1106_datasheet.pdf)
- [image2cpp : outil en ligne de conversion d'images en matrice de points XBM](https://javl.github.io/image2cpp/)
