---
title: "ESP32-S3 pilote un écran rond GC9A01 pour dessiner une cardioïde | Animation en coordonnées polaires en 30 minutes"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-05-19
intro: "Piloter un écran TFT rond GC9A01 de 1,28 pouces avec un ESP32-S3 et afficher une animation de cardioïde en coordonnées polaires. Inclus le câblage complet, le code avec double tampon sans scintillement et un guide de dépannage."
image: "https://img.lingflux.com/2026/05/a6a0b0037d4fd0650665e49e7364d65d.jpg"
---

# Tutoriel complet : ESP32-S3 pilote l'écran rond GC9A01 1,28 pouces (SPI + Arduino IDE)

Difficulté : ⭐⭐☆☆☆ (accessible aux débutants)
Temps estimé : 30 minutes
Environnement de test :
Arduino IDE 2.3.8
Arduino_GFX_Library 1.6.5
ESP32 Arduino Core 3.3.8

---

> **Résumé en une phrase** : Piloter un écran rond GC9A01 de 1,28 pouces avec un ESP32-S3, afficher une animation de cardioïde en coordonnées polaires — double tampon sans scintillement, câblage + code complet + dépannage, le tout en 30 minutes.

---

## Avant-propos

Le 520 approche (ndt : en chinois, « 520 » se prononce comme « je t'aime »), que pourrait-on offrir à sa copine ? J'y ai réfléchi longuement sans trouver de réponse.

Puis, je me suis souvenu des cours de maths au lycée sur les coordonnées polaires. Il y avait une courbe dans le manuel — la cardioïde. Je pourrais créer une animation en coordonnées polaires qui dessine un cœur pour exprimer mes sentiments. (L'esprit d'un ingénieur a imaginé toutes les scènes, s'enthousiasmant tout seul...)

Objectif de cet article : vous permettre de démarrer de zéro et, en 30 minutes, piloter cet écran rond de 1,28 pouces avec un ESP32-S3 pour afficher une animation en coordonnées polaires — tout en comprenant chaque étape. (PS : j'espère qu'une fois offert à la personne qui vous est chère, vous n'aurez pas à vous agenouiller sur un clavier ! ~ :P )

(En voyant ce cœur, elle se dit : c'est quoi ce truc ?! ~ passe-moi le durian)

---

## Résultat de l'expérience

L'écran rond affiche en temps réel une **cardioïde (Cardioid)** en rotation, accompagnée d'une grille en coordonnées polaires et d'un point de suivi, comme un mini oscilloscope traçant une courbe mathématique. Zéro scintillement, le frame rate est verrouillé à 16 fps pour un rendu fluide.

![](https://img.lingflux.com/2026/05/8db744891e99902a8045e4e1242911d1.jpg)

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/fcqwhO5Vr7U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Description des composants

### Écran TFT rond GC9A01 1,28 pouces

Le GC9A01 est la puce de commande, le panneau IPS rond constitue l'écran. Les deux sont soudés sur un petit module. Il suffit de lui « envoyer » les données d'image via le protocole SPI, et il se charge d'allumer chaque pixel.

| Paramètre | Valeur |
| --- | --- |
| Résolution | 240 x 240 pixels |
| Profondeur de couleur | 16 bits RGB565, 65 536 couleurs |
| Protocole d'interface | SPI 4 fils, jusqu'à 80 MHz |
| Tension de fonctionnement | 3,3 V (connexion directe à l'ESP32-S3, pas de conversion de niveau nécessaire) |
| Type de panneau | IPS, angle de vision proche de 180° |
| Dimensions du module | Environ 36 mm de diamètre |

Pourquoi choisir cet écran : peu coûteux (5 à 15 yuans), largement disponible, sa forme ronde est naturellement adaptée aux projets de tableaux de bord et d'horloges, et sa résolution de 240x240 convient parfaitement à la mémoire de l'ESP32-S3.

---

## Nomenclature (BOM)

| Composant | Quantité | Remarques |
| --- | --- | --- |
| Carte de développement ESP32-S3 | 1 | Toute version avec broches SPI convient |
| Module écran rond GC9A01 1,28" | 1 | Vérifier la présence de la broche BL sur le module |
| Fils de connexion | Plusieurs | Femelle-femelle ou femelle-mâle, selon le type de broches de la carte |

---

## Description des broches du composant

| Broche du module GC9A01 | Fonction |
| --- | --- |
| VCC | Alimentation positive (3,3 V) |
| GND | Alimentation négative (masse) |
| SCL / CLK | Signal d'horloge SPI |
| SDA / MOSI | Entrée de données SPI (maître vers esclave) |
| CS | Chip Select, l'écran répond au SPI lorsque le niveau est bas |
| DC | Sélection donnée/commande : niveau haut = donnée, niveau bas = commande |
| RST | Reset matériel, déclenché par un niveau bas |
| BL | Contrôle du rétroéclairage, l'écran s'allume uniquement avec un niveau haut |

---

## Câblage

> Il est recommandé de câbler ligne par ligne selon le tableau ci-dessous et de cocher chaque fil au fur et à mesure — cela vous fera gagner 80 % du temps de dépannage.

| Écran GC9A01 | ESP32-S3 |
| --- | --- |
| VCC | 3,3 V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (contrôlé par code) ou directement connecté au 3,3 V |

> **Attention** : la broche BL (rétroéclairage) est souvent oubliée. Si elle n'est pas connectée, l'écran reste noir après la mise sous tension — ce n'est pas un problème de code ni un écran défectueux, vérifiez d'abord cette broche. Certains modules n'ont pas de broche BL exposée, ce qui signifie qu'elle est déjà connectée en interne au 3,3 V. Si votre module n'a pas de broche BL, vous pouvez l'ignorer.

---

## Bibliothèques à installer

Ouvrez Arduino IDE → Outils → Gérer les bibliothèques, recherchez et installez :

| Nom de la bibliothèque | Auteur | Version testée |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | 1.6.5 |

> N'installez pas TFT_eSPI : sous ESP32 Core 3.x, les définitions de macros et l'initialisation DMA de TFT_eSPI entrent en conflit avec la nouvelle version ESP32, provoquant des erreurs de compilation ou des plantages au démarrage. Arduino_GFX_Library prend en charge le C++ moderne et les canevas mémoire depuis sa conception, ce qui en fait le choix le plus simple pour les projets d'écrans. (Date de rédaction : 2026-05-18)

---

## Code complet

```cpp
/**
 * ESP32-S3 + GC9A01 écran rond 1,28" — Démo animation en coordonnées polaires
 * Double tampon sans scintillement, frame rate verrouillé à 16 fps
 * Câblage : SCL=GPIO12, SDA=GPIO11, CS=GPIO9, DC=GPIO10, RST=GPIO18, BL=GPIO7
 */

#include <Arduino_GFX_Library.h>

// ---------------------------------------------------
// Étape 1 : définir manuellement les macros de couleur
// La nouvelle version d'Arduino_GFX a supprimé l'export global de BLACK / WHITE, etc.
// Sans ce bloc, la compilation échoue avec "BLACK was not declared in this scope"
// ---------------------------------------------------
#ifndef BLACK
#define BLACK       0x0000
#endif
#ifndef WHITE
#define WHITE       0xFFFF
#endif
#ifndef RED
#define RED         0xF800
#endif
#ifndef GREEN
#define GREEN       0x07E0
#endif
#ifndef BLUE
#define BLUE        0x001F
#endif
#ifndef YELLOW
#define YELLOW      0xFFE0
#endif
#ifndef CYAN
#define CYAN        0x07FF
#endif
#ifndef MAGENTA
#define MAGENTA     0xF81F
#endif
#ifndef GRAY
#define GRAY        0x8410
#endif
#ifndef DARKGRAY
#define DARKGRAY    0x2104
#endif

// ---------------------------------------------------
// Étape 2 : définir la palette de couleurs (fond bleu foncé + courbe orange-rouge)
// ---------------------------------------------------
#define COLOR_BG        0x1123   // Fond bleu-noir foncé
#define COLOR_GRID      0x19E5   // Grille bleu-gris
#define COLOR_PRIMARY   0xE73C   // Courbe orange-rouge
#define COLOR_ACCENT    0xFDE0   // Rayon polaire doré
#define COLOR_TEXT      0xF7BE   // Texte gris clair

// ---------------------------------------------------
// Étape 3 : définir les broches physiques
// ---------------------------------------------------
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---------------------------------------------------
// Étape 4 : instancier le bus SPI et le pilote d'écran
// ---------------------------------------------------
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA, GFX_NOT_DEFINED /* MISO non nécessaire */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST,
    0,    /* Angle de rotation */
    true  /* Écran IPS */
);

// ---------------------------------------------------
// Étape 5 : allouer le canevas double tampon (240×240×2 octets = 115,2 Ko de SRAM)
// Tous les tracés sont d'abord écrits en mémoire, puis envoyés d'un coup à l'écran,
// éliminant ainsi tout scintillement
// ---------------------------------------------------
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

// ---------------------------------------------------
// Variables d'animation
// ---------------------------------------------------
float angle = 0.0f;
const float  a_scale    = 50.0f;  // Coefficient d'échelle de la cardioïde (en pixels)
const int16_t cx        = 120;    // Centre X
const int16_t cy        = 120;    // Centre Y

unsigned long lastFrameTime = 0;
const int frameDelay = 1000 / 16; // Verrouiller à 16 fps

// Interrupteurs de fonction (mettre à false pour désactiver un calque)
const bool showGrid     = true;
const bool showCurve    = true;
const bool showRadius   = true;
const bool showTelemetry= true;

void setup() {
    Serial.begin(115200);

    // Initialiser le pilote d'écran
    gfx->begin();

    // Allumer le rétroéclairage (oublier cette étape = écran noir)
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);

    // Initialiser le canevas double tampon
    if (!canvas->begin()) {
        Serial.println("Échec de l'allocation mémoire du canevas ! Écriture directe sur l'écran (scintillement possible)");
    } else {
        Serial.println("Double tampon activé avec succès, rendu sans scintillement prêt.");
    }
}

void loop() {
    // Limitation du frame rate
    unsigned long now = millis();
    if (now - lastFrameTime < frameDelay) return;
    lastFrameTime = now;

    // Effacer la trame
    canvas->fillScreen(COLOR_BG);

    // --- Calque 1 : grille en coordonnées polaires ---
    if (showGrid) {
        canvas->drawCircle(cx, cy,  30, COLOR_GRID);
        canvas->drawCircle(cx, cy,  60, COLOR_GRID);
        canvas->drawCircle(cx, cy,  90, COLOR_GRID);
        canvas->drawCircle(cx, cy, 110, COLOR_GRID);
        canvas->drawFastHLine(10, cy, 220, COLOR_GRID);
        canvas->drawFastVLine(cx, 10, 220, COLOR_GRID);
    }

    // --- Calque 2 : trajectoire complète de la cardioïde r = a*(1 - cos θ) ---
    if (showCurve) {
        int16_t lx = 0, ly = 0;
        for (int16_t deg = 0; deg <= 360; deg += 3) {
            float rad = deg * DEG_TO_RAD;
            float r   = a_scale * (1.0f - cos(rad));
            int16_t x = cx + (int16_t)(r * cos(rad));
            int16_t y = cy - (int16_t)(r * sin(rad)); // Axe Y de l'écran vers le bas, donc on inverse
            if (deg > 0) canvas->drawLine(lx, ly, x, y, COLOR_PRIMARY);
            lx = x; ly = y;
        }
    }

    // --- Calque 3 : point de suivi actuel et rayon polaire ---
    float rad_a  = angle * DEG_TO_RAD;
    float active_r = a_scale * (1.0f - cos(rad_a));
    int16_t px = cx + (int16_t)(active_r * cos(rad_a));
    int16_t py = cy - (int16_t)(active_r * sin(rad_a));

    if (showRadius) canvas->drawLine(cx, cy, px, py, COLOR_ACCENT);
    canvas->fillCircle(px, py, 5, COLOR_TEXT);

    // --- Calque 4 : affichage des valeurs ---
    if (showTelemetry) {
        canvas->setTextColor(COLOR_TEXT);
        canvas->setTextSize(1);
        canvas->setCursor(50, 25);
        canvas->print("Polar Coordinates");
        canvas->setCursor(28, 185);
        canvas->print("r = a * (1 - cos(theta))");
        canvas->setCursor(40, 200);
        canvas->print("th:"); canvas->print((int)angle);
        canvas->print("  r:"); canvas->print((int)active_r);
        canvas->print("px");
    }

    // Incrémentation de l'angle (+6° par trame, un tour complet en environ 1 seconde)
    angle += 6.0f;
    if (angle >= 360.0f) angle -= 360.0f;

    // Envoyer le canevas mémoire vers l'écran physique en une seule fois
    canvas->flush();
}
```

### Explication du code

**Mécanisme de double tampon** : toutes les opérations de dessin se produisent sur le `canvas` (en mémoire). C'est uniquement la dernière ligne `canvas->flush()` qui envoie réellement la trame complète à l'écran. Comparé à l'approche qui consiste à effacer le tableau avant d'écrire, c'est comme rédiger sur un brouillon puis le coller d'un coup — l'écran ne voit jamais un état « à moitié dessiné », le scintillement est éliminé.

**Équation de la cardioïde** `r = a * (1 - cos θ)` : c'est une équation en coordonnées polaires, où `r` est la distance depuis le centre et `θ` est l'angle. En convertissant les valeurs (r, θ) calculées pour chaque θ en coordonnées XY de l'écran et en reliant les points, on obtient la courbe en forme de cœur.

**Verrouillage du frame rate** : `frameDelay = 1000 / 16` contrôle l'intervalle minimum entre deux trames à environ 62 ms. Pour accélérer l'animation, augmentez la valeur de l'incrément `+= 6.0f` ; pour plus de fluidité, vous pouvez monter le targetFPS à 30, mais cela occupera davantage le CPU.

**Partition de flashage** : dans Arduino IDE → Outils → Partition Scheme, sélectionnez **Huge APP (3MB No OTA)**. Le canvas de 115 Ko nécessite suffisamment de SRAM ; la partition par défaut peut parfois manquer d'espace sur le tas.

---

## Dépannage des problèmes courants

Pas de panique, 90 % des problèmes viennent de ces quelques points :

**Écran noir à la mise sous tension, aucune erreur sur le port série**
Vérifiez d'abord la broche BL — le rétroéclairage qui n'est pas tiré vers le haut est la cause la plus fréquente. Confirmez que GPIO7 a bien exécuté `digitalWrite(TFT_BL, HIGH)`, ou connectez directement le fil BL au 3,3 V pour écarter un problème de code.

**L'écran s'allume mais affiche tout blanc / tout rouge / des pixels aléatoires**
L'ordre des fils SPI est incorrect. CS et DC sont les plus faciles à confondre (ce sont tous deux des lignes de contrôle, elles se ressemblent). Vérifiez-les par rapport aux macros du code (CS=GPIO9, DC=GPIO10), ne vous fiez pas uniquement au tableau de câblage, le code fait foi.

**Erreur de compilation : `BLACK was not declared in this scope`**
Vous utilisez Arduino_GFX version >= 1.3, qui a supprimé l'export global des macros de couleur. Le bloc `#ifndef BLACK` en haut du code doit être conservé et ne peut pas être supprimé.

**Échec de l'allocation mémoire du canevas, le port série indique l'écriture directe sur l'écran**
Cela signifie que la SRAM disponible est insuffisante pour 115 Ko. Vérifiez : (1) la partition est-elle bien réglée sur Huge APP ; (2) y a-t-il d'autres grands tableaux qui occupent la mémoire ; (3) dans de rares cas, le PSRAM de la carte de développement n'est pas activé (il faut l'activer dans les paramètres de la carte).

**Animation saccadée, ne ressemble pas à 16 fps**
Avez-vous ajouté un `delay()` dans `loop()` ? Si oui, retirez-le — la limitation du frame rate est déjà gérée par `millis()`, combiner les deux double l'intervalle entre les trames.

---

## FAQ

**Q : Les broches CS et DC peuvent-elles être remplacées par d'autres GPIO ?**
R : Oui, il suffit de modifier les `#define TFT_CS` et `#define TFT_DC` en haut du code, n'importe quel GPIO libre convient. Pour SCL et SDA, il est recommandé d'utiliser les broches SPI matérielles (ESP32-S3, SPI2 par défaut : SCLK=12, MOSI=11) pour obtenir la vitesse maximale ; utiliser d'autres broches ferait basculer en SPI logiciel avec une baisse de vitesse notable.

**Q : Quels taux de rafraîchissement l'écran prend-il en charge ?**
R : L'interface SPI du GC9A01 a une fréquence d'horloge maximale théorique de 80 MHz, ce qui correspond à un taux de rafraîchissement maximal d'environ 40 fps pour un écran complet 240x240. Ce code verrouille le frame rate à 16 fps pour conserver une marge CPU sur les modules ESP32-S3 d'entrée de gamme. Si votre carte fonctionne à 240 MHz, vous pouvez monter `targetFPS` à 30-40 sans problème.

**Q : Est-il possible de piloter deux écrans simultanément ?**
R : Oui, les deux écrans partagent SCL/SDA, chaque écran reçoit une broche CS distincte. Instanciez deux objets `Arduino_GC9A01` séparés et basculez le CS pour activer l'écran souhaité. Attention à la mémoire : deux canevas nécessitent 230 Ko de SRAM au total, le PSRAM doit être activé.

**Q : Alimentation en 3,3 V ou 5 V ?**
R : Le module GC9A01 fonctionne en 3,3 V, connectez-le directement à la broche 3,3 V de l'ESP32-S3. Ne le connectez jamais au 5 V, cela endommagerait la puce de commande.

**Q : Comment afficher des caractères chinois ?**
R : Arduino_GFX_Library n'inclut par défaut que les polices ASCII. Pour afficher des caractères chinois, il faut des fichiers de polices supplémentaires (par exemple la bibliothèque U8g2) ou utiliser le framework LVGL. Les polices augmentent considérablement l'utilisation de la Flash ; il est recommandé d'utiliser plutôt une solution LVGL + SPIFFS. Un article dédié pourra être publié si le temps le permet.

**Q : L'écran GC9A01 n'a pas de capacité de sortie audio, c'est uniquement un affichage. Quel est le lien avec les projets audio I2S ?**
R : Aucun lien. Le GC9A01 est purement un écran, l'interface SPI ne transmet que des données d'image. Si vous souhaitez également lire de l'audio, vous aurez besoin d'un module DAC I2S supplémentaire (comme le MAX98357A). Les deux fonctionnent de manière totalement indépendante, sans interférence entre les broches.

---

## Pistes d'extension

- Le transformer en **cadran d'horloge analogique** : dessinez les graduations et les aiguilles, associez un module RTC DS3231 pour lire l'heure en temps réel
- Ajouter un **mode rosace** : mettez `showTangent` à false, changez la courbe en `r = a * sin(k * θ)`, faites varier le paramètre k et le nombre de pétales changera en conséquence
- Connecter des **boutons pour basculer** entre les thèmes d'animation : trois boutons pour alterner cardioïde / rosace / figures de Lissajous
- Combiner avec le **Wi-Fi de l'ESP32** : récupérez les données d'une API météo et affichez la température et l'humidité sur le tableau de bord de l'écran rond
- Acheter 2 écrans ronds :

---

## Références

- [Fiche technique de la puce GC9A01 (Galaxycore officiel)](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Page GitHub d'Arduino_GFX_Library (moononournation)](https://github.com/moononournation/Arduino_GFX)
- [Page produit ESP32-S3 (Espressif)](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
- [Notes de version ESP32 Arduino Core 3.x](https://github.com/espressif/arduino-esp32/releases)
