---
title: "ESP32-S3 Piloter un anneau WS2812 pour un effet arc-en-ciel rotatif - Tutoriel complet (protocole 1-wire + FastLED)"
boardId: esp32s3
moduleId: lighting/ws2812b-40led-ring
category: esp32
date: 2026-05-08
intro: "Piloter un anneau WS2812 avec l'ESP32-S3 et la bibliotheque FastLED pour un effet arc-en-ciel rotatif non bloquant. Branchement 1-wire en 3 fils, realisable en 30 minutes par un debutant."
image: "https://img.lingflux.com/2026/05/d991a873016f98577b8ed80aefa9d67b.jpg"
---



# ESP32-S3 Piloter un anneau WS2812 pour un effet arc-en-ciel rotatif - Tutoriel complet

Difficulte : ⭐⭐☆☆☆ (debutant)
Temps estime : 30 minutes
Environnement de test : Arduino IDE 2.3.8 + FastLED v3.10.3 + ESP32 Arduino Core 3.3.8

---

> **TL;DR (demarrage rapide) :**
>
> 1. Branchement : anneau WS2812 `DIN` → ESP32-S3 `GPIO40`, `VCC` → 5V, `GND` → GND
> 2. Installer la bibliotheque : dans le gestionnaire de bibliotheques Arduino, chercher `FastLED` (auteur Daniel Garcia), installer la derniere version
> 3. Modifier selon vos besoins `NUM_LEDS` (nombre de LED) et `LED_PIN` (broche) dans le code
> 4. Televerser, alimenter, l'anneau commence a tourner

---

## Avant-propos

J'avais un anneau WS2812 qui trainait a la maison, en me disant que je m'y mettrais "quand j'aurais le temps". Mais voyant qu'il accumulait la poussiere, j'en ai profite pour faire un exemple simple.

Le plus remarquable avec les rubans/anneaux/blocs WS2812, c'est que l'ensemble **ne necessite qu'un seul fil de donnees**. Avec l'alimentation, cela fait seulement 3 fils au total pour piloter le tout. Chaque LED peut etre controlee individuellement en couleur grace a la puce pilote integree. Pas besoin de decodeur, pas besoin de registre a decalage, quelques lignes de code suffisent.

Objectif de cet article : utiliser un ESP32-S3 et la bibliotheque FastLED pour realiser un effet de flux arc-en-ciel rotatif sur l'anneau, entierement non bloquant, sans gener les futures extensions.

---

## Resultat de l'experience

![](https://img.lingflux.com/2026/05/b9b24692bd3fe29d05bafd71a1a6ee89.jpg)

Les 40 LED de l'anneau s'allument simultanement, les couleurs sont reparties selon un degrade arc-en-ciel et l'ensemble des teintes tourne en continu, donnant l'impression d'un anneau de lumiere coloree en mouvement.
<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/kA8XlvHq3_I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Description du composant

### Anneau WS2812

L'anneau WS2812 fonctionne comme un telephone sans fil - on envoie toutes les donnees a la premiere LED, elle garde les informations de couleur qui la concernent, transmet le reste a la suivante, qui garde a son tour sa part et transmet le reste a la suivante, et ainsi de suite. L'ensemble est connecte en serie, ce qu'on appelle une liaison daisy-chain. Un seul fil permet de controler des dizaines (voire des centaines) de LED, chacune affichant une couleur differente.



```
Exemple : sequence de donnees : [rouge, bleu, vert, jaune]
             ↓
   LED 1 prend « rouge » et s'allume en rouge → transmet [bleu, vert, jaune] a la suivante
             ↓
   LED 2 prend « bleu » et s'allume en bleu → transmet [vert, jaune] a la suivante
             ↓
   LED 3 prend « vert » et s'allume en vert → transmet [jaune] a la suivante
   ...
   ...
   ...
```



| Parametre | Valeur |
| --- | --- |
| Tension d'alimentation | 5V |
| Courant max par LED | 60mA (R/G/B 20mA chacune, toutes allumees) |
| Niveau du signal de donnees | Compatible logique 3.3V (pas de conversion de niveau necessaire) |
| Protocole de communication | 1-wire NZR (Non-Return-to-Zero) |
| Ordre des couleurs | GRB |
| Taux de rafraichissement | 400Hz / 800Hz (selon le modele) |

> Pourquoi le choisir : branchement ultra-simple (un seul fil de donnees), support natif par FastLED, documentation communautaire abondante, peu de pieges pour les debutants.



**Combien de LED un seul fil de donnees WS2812B (un seul GPIO) peut-il theoriquement et pratiquement piloter ?**

### Limite theorique

**Il n'y a pratiquement pas de limite stricte** (on peut piloter plusieurs milliers, voire des dizaines de milliers). Le WS2812B utilise une topologie **daisy-chain** : la broche DO d'une LED est reliee a la broche DI de la suivante, les donnees passent de LED en LED. Tant que le microcontroleur peut emettre une trame de donnees complete en temps opportun, le chainage peut etre theoriquement infini.

### Quantites recommandees en pratique (un seul fil de donnees)

| Cas d'utilisation | Quantite maximale recommandee | Remarques |
| --- | --- | --- |
| **Animations fluides / jeux** (taux de rafraichissement eleve) | **300 a 600 LED** | Gamme recommandee, taux de rafraichissement maintenu au-dessus de 30 a 60 fps |
| **Effets generaux / eclairage d'ambiance** | **800 a 1200 LED** | Limite d'utilisation courante, taux de rafraichissement d'environ 15 a 30 fps |
| **Cas extreme** | **2000 a 4000+ LED** | Faisable, mais taux de rafraichissement tres bas (<10 fps), signal sujet a des problemes |
| **Projets professionnels / a grande echelle** | Quelques milliers a dizaines de milliers | Necessaire d'utiliser **plusieurs fils de donnees** en parallele (l'ESP32 est ideal pour cela) |

### Principaux facteurs limitants

1. **Taux de rafraichissement (le plus critique)** Chaque LED necessite environ 30us de donnees (24 bits).
   - 1000 LED ≈ 30ms → environ 33 fps
   - 2000 LED ≈ 60ms → environ 16 fps (saccades visibles)
2. **Qualite du signal**
   - Fil de donnees trop long (>10 a 15 metres) ou trop de LED, les dernieres LED peuvent afficher des artefacts, des couleurs erronees ou clignoter.
   - Il est recommande d'ajouter un **amplificateur de signal** (74HCT245 / SN74AHCT125, etc.) ou un **module repeteur** tous les 500 a 1000 LED environ.
3. **Alimentation** (pas une limitation du fil de donnees, mais a resoudre imperativement)
   - Chaque LED allumee en blanc consomme au maximum environ 60mA (generalement 20 a 30mA en moyenne).
   - **Il est imperatif d'injecter l'alimentation en plusieurs points** (tous les 1 a 2 metres), sinon la chute de tension provoque un assombrissement ou un changement de couleur en bout de chaine.

###

---

## Nomenclature (BOM)

| Composant | Specifications | Quantite |
| --- | --- | --- |
| Carte de developpement ESP32-S3 | N'importe quelle version avec GPIO | ×1 |
| Anneau WS2812 | 40 LED (ou autre nombre, modifier une ligne dans le code) | ×1 |
| Cables de raccordement | Male-femelle / male-male, selon les besoins | Quelques-uns |

---

## Description des broches du composant

L'anneau WS2812 possede generalement les 4 broches suivantes :

| Marquage de la broche | Description |
| --- | --- |
| VCC / 5V | Alimentation positive, connecter au 5V |
| GND | Alimentation negative, connecter au GND |
| DIN / Data In | Entree de donnees, connecter a un GPIO de l'ESP32-S3 |
| DOUT / Data Out | Sortie de donnees, utilise lors du chainage de plusieurs anneaux, non connecte dans ce projet |

> ⚠️ Certains anneaux sont simplement marques `+`, `-`, `Data` ; la correspondance est la meme, ne vous inquietez pas.

---

## Schema de branchement

| Broche anneau WS2812 | ESP32-S3 |
| --- | --- |
| VCC / 5V | 5V (broche 5V de la carte ou alimentation externe 5V) |
| GND | GND |
| DIN | GPIO40 |

> 💡 **Il est recommande de verifier chaque connexion une par une apres le branchement**, cela permet d'eviter 80 % du temps de debogage. Attention particulierement a ne pas connecter VCC au 3.3V - les LED s'allumeront, mais les couleurs seront fausses et la luminosite reduite, gaspillant votre temps de debogage.

---

## Bibliotheque a installer

Dans le gestionnaire de bibliotheques d'Arduino IDE, recherchez **`FastLED`**, auteur **Daniel Garcia**, et installez la derniere version (version testee dans cet article : v3.10.3).

Chemin d'installation : `Outils` → `Gerer les bibliotheques` → rechercher `FastLED` → Installer

---

## Code complet

```cpp
/*
 * ESP32-S3 WS2812 anneau arc-en-ciel rotatif
 * Version FastLED non bloquante - ne bloque pas loop(), facilite l'ajout de boutons, capteurs, etc.
 */

#include <FastLED.h>

// ===== Modifiez ici selon votre configuration =====
#define LED_PIN     40       // Broche GPIO connectee au fil de donnees
#define NUM_LEDS    40       // Nombre de LED sur l'anneau
#define BRIGHTNESS  204      // Luminosite globale, plage de 0 (eteint) a 255 (maximum)
// ====================================

#define LED_TYPE    WS2812B
#define COLOR_ORDER GRB      // L'ordre des couleurs du WS2812 est GRB, pas RGB, ne vous trompez pas

CRGB leds[NUM_LEDS];         // Tableau de couleurs pour chaque LED

uint8_t gHue = 0;            // Teinte de depart de l'arc-en-ciel, incrementee a chaque image pour l'effet "rotation"

void setup() {
    // Etape 1 : laisser 1 seconde au materiel pour demarrer, eviter le scintillement des LED du a l'appel de courant a la mise sous tension
    delay(1000);

    // Etape 2 : initialiser FastLED, lui indiquer la broche, le type de LED et le nombre
    FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS)
           .setCorrection(TypicLEDStrip);  // Correction automatique de la temperature de couleur, pour un blanc plus blanc

    // Etape 3 : regler la luminosite globale (plus simple que de modifier les valeurs RGB)
    FastLED.setBrightness(BRIGHTNESS);
}

void loop() {
    // Etape 4 : remplir l'anneau avec un degrade arc-en-ciel
    // gHue est la teinte de depart, 255/NUM_LEDS est l'ecart de teinte entre chaque LED
    fill_rainbow(leds, NUM_LEDS, gHue, 255 / NUM_LEDS);

    // Etape 5 : envoyer les donnees de couleur a l'anneau
    FastLED.show();

    // Etape 6 : toutes les 10ms la teinte augmente de 1, plus la valeur est petite plus c'est rapide, plus grande plus c'est lent
    EVERY_N_MILLISECONDS(10) {
        gHue++;
    }
}
```

### Explications du code

| Ligne cle | Ce qu'elle fait |
| --- | --- |
| `fill_rainbow(...)` | Fonction integree de FastLED, calcule automatiquement les couleurs du degrade arc-en-ciel et remplit le tableau, pas besoin d'ecrire manuellement les calculs HSV |
| `FastLED.show()` | Envoie les donnees de couleur du tableau `leds[]` via GPIO40, les LED ne changent pas tant que cette ligne n'est pas appelee |
| `EVERY_N_MILLISECONDS(10)` | Timer non bloquant integre a FastLED, equivalent a "executer toutes les 10ms", ne bloque pas `loop()` |
| `gHue++` | Incremente la teinte de 1 a chaque fois, la teinte de depart de `fill_rainbow` est decalee a l'image suivante, ce qui donne l'impression de rotation |
| `setCorrection(TypicalLEDStrip)` | Correction automatique de la temperature de couleur des LED, evite que le blanc obtenu par melange ne tire vers le vert, adapte au WS2812 |

> Pour modifier la vitesse de rotation : ajustez la valeur dans `EVERY_N_MILLISECONDS(10)`. **10 → 5** tourne deux fois plus vite, **10 → 20** tourne deux fois moins vite.

---

## Resolution des problemes courants

Pas de panique, 90 % des problemes viennent de ces quelques points :

**Probleme 1 : Les LED ne s'allument pas du tout apres mise sous tension**

- Verifiez que DIN est bien connecte a `GPIO40` (la broche definie par `LED_PIN` dans le code)
- Confirmez que VCC est relie au **5V** et non au 3.3V
- Verifiez que GND est bien connecte - sans masse commune, le signal de donnees ne peut pas etre emis

**Probleme 2 : Seulement certaines LED s'allument, ou les couleurs clignotent de maniere aleatoire**

- Il s'agit tres probablement d'une alimentation insuffisante. 40 LED allumees en blanc peuvent consommer jusqu'a 2.4A, le port USB avec ses 500mA ne suffit pas, il est recommande d'utiliser une alimentation externe 5V 2A ou plus

**Probleme 3 : Les couleurs sont bizarres, le rouge s'affiche en vert**

- La definition de `COLOR_ORDER` est incorrecte. Le WS2812B utilise l'ordre GRB, essayez de remplacer `GRB` par `RGB` dans le code, ou inversement

**Probleme 4 : Erreur de compilation `FastLED.h: No such file`**

- La bibliotheque n'est pas installee. Rouvrez le gestionnaire de bibliotheques, verifiez que FastLED affiche le statut "INSTALLE", puis redemarrez Arduino IDE

**Probleme 5 : Le televersement se passe bien mais les LED ne bougent pas**

- Verifiez que `NUM_LEDS` correspond bien au nombre reel de LED de votre anneau, un nombre incorrect peut provoquer des anomalies d'affichage

---

## FAQ

**Q : Quelle est la difference entre WS2812 et WS2812B, le code est-il compatible ?**
R : Le WS2812B est la version amelioree du WS2812, boitier plus petit, timing legerement ajuste, mais FastLED prend en charge les deux. Il suffit de renseigner `WS2812B` pour `LED_TYPE`, aucune autre modification necessaire.

**Q : Mon anneau n'a que 12/16/24 LED, comment modifier le code ?**
R : Changez une seule ligne : `#define NUM_LEDS 24`, remplacez par votre nombre reel de LED, le reste du code reste inchange.

**Q : GPIO40 peut-il etre remplace par une autre broche ?**
R : Oui, la plupart des GPIO de l'ESP32-S3 peuvent etre utilises (evitez les broches 0, 3, 45, 46 liees au demarrage). Modifiez le nombre dans `#define LED_PIN 40` et connectez le fil a la broche correspondante.

**Q : Peut-on piloter plusieurs anneaux simultanement ?**
R : Oui. Connectez chaque anneau a un GPIO independant, appelez `addLeds` une fois supplementaire dans le code, en assignant des segments distincts du tableau `leds[]`.

**Q : L'anneau necessite-t-il une alimentation independante ?**
R : Si le nombre de LED est inferieur ou egal a 8 et que la luminosite n'est pas au maximum, la broche 5V de la carte peut suffire. Au-dela de 8 LED ou pour un blanc pleine luminosite, il est fortement recommande d'utiliser une alimentation externe 5V 2A ou plus, en reliant les masses (GND) de l'alimentation externe et de la carte.

**Q : Qu'est-ce que `EVERY_N_MILLISECONDS`, pourquoi ne pas utiliser directement `delay()` ?**
R : `EVERY_N_MILLISECONDS` est un timer non bloquant integre a FastLED. La fonction `loop()` s'execute normalement, seul le code a l'interieur est execute a l'intervalle specifie. Avec `delay()`, tout le programme se bloquerait, rendant impossible le traitement simultane de boutons, du port serie ou d'autres taches.

**Q : Le sens de rotation de l'arc-en-ciel peut-il etre inverse ?**
R : Oui, remplacez `gHue++` par `gHue--` pour inverser le sens de rotation.

---

## Idees d'extensions

- Ajouter un bouton pour basculer entre les effets (respiration / chenillard / arc-en-ciel rotatif a volonte)
- Connecter un module micro pour creer un effet de spectre LED reactive a l'audio
- Chaniner plusieurs anneaux, DIN relie au DOUT du premier, pour un ruban plus long
- Connecter un ecran OLED pour afficher le nom de l'effet actuel et la valeur de luminosite

---

## References

- [FastLED - GitHub officiel](https://github.com/FastLED/FastLED)
- [Fiche technique WS2812B (WorldSemi officiel)](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf)
- [Manuel de reference technique ESP32-S3 (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [Page produit ESP32-S3 (Espressif)](https://www.espressif.com/en/products/socs/esp32-s3)
