---
title: "ESP32-S3 + INMP441 + GC9A01 Analyseur spectral audio circulaire DIY | Tutoriel complet I2S + FFT + SPI"
boardId: esp32s3
moduleId: audio/inmp441
category: esp32
date: 2026-06-08
intro: "Lisez l'audio I2S du microphone numérique INMP441 avec un ESP32-S3, analysez-le par FFT 512 points, puis affichez en temps réel un spectre circulaire en 16 bandes arc-en-ciel sur l'écran TFT circulaire GC9A01. Inclut le câblage complet, l'installation des bibliothèques et les commentaires du code."
image: "https://img.lingflux.com/2026/06/7747ada90e61ba2360585e6934fbf7a7.jpg"
---

> **Résumé en une phrase** : ESP32-S3 + microphone INMP441 + écran circulaire GC9A01, pour réaliser un analyseur spectral audio circulaire qui « danse », tutoriel complet I2S + FFT + SPI.

# ESP32-S3 + INMP441 + GC9A01 — Tutoriel complet pour réaliser un analyseur spectral audio circulaire qui « danse » (I2S + FFT + SPI)

Difficulté : ⭐⭐⭐☆☆ (accessible avec quelques bases Arduino)
Temps estimé : 45 minutes
Environnement de test :
Arduino IDE 2.3.8
GFX Library for Arduino v1.6.5
arduinoFFT v2.0.4

---

> **TL;DR (version sans bla-bla) :**
> 1. **Câblage** : INMP441 SD→GPIO4, WS→GPIO5, SCK→GPIO6, **L/R doit être relié à GND**
> 2. **Câblage** : GC9A01 SCL→GPIO12, SDA→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 3. **Installer les bibliothèques** : GFX Library for Arduino (auteur moononournation) + `arduinoFFT` (auteur kosme)
> 4. **Collez le code, téléversez, parlez devant le microphone**, et les barres arc-en-ciel dans le cercle se mettent à danser

---

## Préface

Depuis que j'ai acheté un écran circulaire de 1,28 pouce, je me suis bien amusé — le format circulaire offre des possibilités très différentes du carré. Je vais donc utiliser le module microphone INMP441 pour réaliser quelque chose de particulièrement joli avec cet écran : **une visualisation spectrale audio en temps réel**.

Quand on dit « analyseur spectral », vous pensez peut-être d'abord aux barres de style Winamp des années 2000 (je l'avais installé sur mon PC, à écouter de la musique en regardant les barres danser pendant des heures). Mais un spectre circulaire, c'est différent — 16 barres arc-en-ciel rayonnent du centre vers l'extérieur, plus le son est fort plus les barres sont longues, et au sommet de chaque barre un point blanc de crête descend lentement... Honnêtement, je suis resté à le fixer pendant cinq minutes sans aller manger.

Cet article vous guide pas à pas pour utiliser un **ESP32-S3 + microphone numérique INMP441 + écran TFT circulaire GC9A01**, du câblage au code, afin de réaliser un spectre arc-en-ciel circulaire qui réagit au son en temps réel. Un maker avec quelques bases pourra voir le résultat en 45 minutes.

---

## Résultat de l'expérience

![](https://img.lingflux.com/2026/06/21a134efbde1457cff0817a7e18879f3.jpg)

- Acquisition audio en temps réel depuis le microphone (44,1 kHz, 16 bits)
- Analyse FFT 512 points, répartie en 16 bandes de fréquences
- Barres arc-en-ciel rayonnant de l'intérieur vers l'extérieur sur l'écran circulaire, points blancs de crête en descente lente
- Taux de rafraîchissement d'environ 20 fps, parfaitement fluide à l'œil nu

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/nmPC6lKog0o" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Description des composants

### Écran TFT circulaire GC9A01

Si l'écran rectangulaire classique est un « téléphone à clapet », le GC9A01 est un « cadran de montre connectée » — **écran LCD circulaire de 1,28 pouce, le chip driver s'appelle GC9A01, bus SPI, alimentation 3,3 V**, pilotable avec seulement 8 fils.

| Paramètre | Valeur |
| --- | --- |
| Taille d'écran | 1,28 pouce |
| Résolution | 240 × 240 pixels |
| Interface | SPI (4 fils) |
| Tension de fonctionnement | 3,3 V |
| Chip driver | GC9A01 |
| Type de panneau | IPS (angle de vision complet) |

Pourquoi le choisir : c'est le plus courant des petits écrans circulaires du marché, nativement supporté par la bibliothèque Arduino_GFX, initialisable en 5 lignes de code, très peu de pièges.

---

### Microphone numérique MEMS INMP441

L'INMP441 est un **microphone MEMS omnidirectionnel numérique** — en langage simple : **il produit directement un signal numérique I2S, pas besoin d'ADC**. C'est comme si vous aviez un interprète simultané qui traduit en temps réel tout ce que vous dites en un format numérique compréhensible par le MCU, en vous affranchissant de toutes les complications du signal analogique.

| Paramètre | Valeur |
| --- | --- |
| Interface | I2S (audio numérique) |
| Tension de fonctionnement | 1,8 V ~ 3,3 V |
| Réponse en fréquence | 60 Hz ~ 15 kHz |
| Rapport signal/bruit | 61 dBA |
| Sensibilité | -26 dBFS (valeur typique) |
| Direction de captation | Omnidirectionnel |

Pourquoi le choisir : l'interface I2S est propre, pas besoin d'ADC supplémentaire, le rapport signal/bruit de 61 dBA est bien supérieur à la plupart des microphones analogiques bon marché, largement suffisant pour un analyseur spectral.

> Il est à noter que l'INMP441 était fabriqué à l'origine par InvenSense (racheté par TDK), qui l'a officiellement classé comme **Obsolete (obsolète / en fin de vie)**. Chez les distributeurs de composants agréés comme Mouser, DigiKey, il porte déjà l'étiquette de produit en fin de vie. Cependant, sur le marché (par exemple sur certaines plateformes de vente en ligne), de nombreux modules INMP441 bleus/noirs à quelques yuans sont toujours disponibles en abondance. Cela s'explique par la présence sur le marché chinois d'importants **stocks de surplus**, ou de **chips compatibles / remanufacturés de fabrication locale** qui continuent d'utiliser ce nom. Si vous ne faites que du DIY personnel, des tutoriels ou de petites démos, les modules actuellement disponibles fonctionnent toujours très bien.
>
> **Par conséquent, si vous développez un produit commercial, ce module n'est pas le premier choix.**

---

## Nomenclature (BOM)

| Composant | Modèle / Spécification | Quantité |
| --- | --- | --- |
| Carte de développement | ESP32-S3 (avec USB-C) | 1 |
| Écran TFT circulaire | GC9A01, 1,28 pouce, 240×240 | 1 |
| Microphone numérique | Module I2S INMP441 | 1 |
| Câbles de prototypage (Dupont) | | Quelques-uns |

---

## Description des broches des composants

### Broches de l'écran GC9A01

| Broche | Description |
| --- | --- |
| VCC | Alimentation positive (relier à 3,3 V) |
| GND | Masse |
| SCL / CLK | Horloge SPI |
| SDA / MOSI | Données SPI (envoyées par le maître) |
| CS | Chip select (actif à l'état bas) |
| DC | Sélection donnée / commande |
| RST | Reset (déclenché par niveau bas) |
| BL | Rétroéclairage (relier à 3,3 V pour toujours allumé, ou à un GPIO pour modulation PWM) |

### Broches du microphone INMP441

| Broche | Description |
| --- | --- |
| VDD | Alimentation positive (relier à 3,3 V) |
| GND | Masse |
| SD | Sortie de données I2S (relier à l'entrée de données de l'ESP32) |
| WS | Word select / synchronisation de trame (sélection canal gauche/droit) |
| SCK | Horloge de bit |
| L/R | Sélection de canal : relier à GND = canal gauche, relier à 3,3 V = canal droit, **ne doit pas être laissé en l'air** |

---

## Câblage

**Il est recommandé de vérifier chaque fil après connexion en vous référant au tableau — cela permet d'éliminer 80 % des erreurs.**

### Câblage de l'écran GC9A01

| Broche du module | ESP32-S3 | Couleur de fil (référence) |
| --- | --- | --- |
| VCC | 3,3 V | Rouge |
| GND | GND | Gris |
| SCL / CLK | GPIO12 | Jaune |
| SDA / MOSI | GPIO11 | Bleu |
| CS | GPIO9 | Vert |
| DC | GPIO10 | Orange |
| RST | GPIO18 | Violet |
| BL | GPIO7 / 3,3 V | Cyan |

### Câblage du microphone INMP441

| Broche du module | ESP32-S3 | Couleur de fil (référence) |
| --- | --- | --- |
| VDD | 3,3 V | Rouge |
| GND | GND | Gris |
| SD | GPIO4 | Bleu |
| WS | GPIO5 | Vert |
| SCK | GPIO6 | Jaune |
| L/R | GND (canal gauche) | Gris |

> ⚠️ **La broche L/R doit être connectée, elle ne doit pas être laissée en l'air.** Une broche L/R flottante entraîne une sélection de canal indéfinie — les données capturées ne seront que du bruit aléatoire, et les barres du spectre sauteront de manière chaotique sans aucun rapport avec le son — ne me demandez pas comment je le sais.

####

- Utilisez impérativement une alimentation en **3,3 V**, ne pas connecter en 5 V
- La broche L/R de l'INMP441 reliée à GND = sortie canal gauche
- Câblez d'abord correctement, vérifiez l'alimentation et la masse au multimètre avant de mettre sous tension, pour éviter les courts-circuits

---

## Bibliothèques à installer

Dans **Arduino IDE → Outils → Gérer les bibliothèques**, recherchez et installez :

| Bibliothèque | Auteur | Version testée | Usage |
| --- | --- | --- | --- |
| `Arduino_GFX_Library` | moononournation | v1.6.5 | Driver écran GC9A01 |
| `arduinoFFT` | kosme | v2.0.4 | Transformée de Fourier rapide |

> Le driver I2S (`driver/i2s.h`) est une bibliothèque intégrée à l'ESP32, aucune installation supplémentaire n'est nécessaire.
>
> Arduino IDE recommandé en version **2.3.x ou supérieure** — la version 1.x plus ancienne a un support instable de l'ESP32-S3.

---

## Code complet

```cpp
#include <Arduino_GFX_Library.h>
#include <driver/i2s.h>
#include <arduinoFFT.h>

// ====== Étape 1 : Définir les broches de l'écran ======
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// ====== Étape 2 : Définir les broches du microphone ======
#define I2S_WS    5
#define I2S_SD    4
#define I2S_SCK   6
#define I2S_PORT  I2S_NUM_0

// ====== Paramètres FFT ======
#define SAMPLES   512
#define BANDS     16

// ====== Initialiser l'écran GC9A01 ======
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0, true);

// ====== Tampons FFT ======
double vReal[SAMPLES];
double vImag[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>(
  vReal, vImag, SAMPLES, 44100);

// ====== Énergie par bande et crêtes ======
float bandValues[BANDS];
float peakValues[BANDS];
int16_t sampleBuf[SAMPLES];

// ====== Utilitaire couleur : HSL vers RGB565 ======
uint16_t hslToRgb565(float h, float s, float l) {
  float c = (1.0f - fabsf(2.0f * l - 1.0f)) * s;
  float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
  float m = l - c / 2.0f;
  float r, g, b;
  if (h < 60)       { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  uint8_t R = (uint8_t)((r + m) * 31);
  uint8_t G = (uint8_t)((g + m) * 63);
  uint8_t B = (uint8_t)((b + m) * 31);
  return (R << 11) | (G << 5) | B;
}

// ====== Étape 3 : Initialiser le microphone I2S ======
void setupMicrophone() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

void setup() {
  Serial.begin(115200);

  // Étape 4 : Allumer le rétroéclairage, initialiser l'écran
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  gfx->begin();
  gfx->fillScreen(0x0000);

  // Étape 5 : Initialiser le microphone
  setupMicrophone();

  memset(peakValues, 0, sizeof(peakValues));
}

// ====== Dessiner le spectre circulaire ======
void drawCircularSpectrum() {
  int cx = 120, cy = 120;
  int innerR = 25;
  int maxLen = 85;
  float angleStep = 2.0f * PI / BANDS;
  float barWidth = angleStep * 0.7f;

  gfx->fillScreen(0x0000);

  for (int i = 0; i < BANDS; i++) {
    float angle = i * angleStep - PI / 2.0f;
    float hue = (float)i / BANDS * 360.0f;
    float val = bandValues[i];
    int barLen = (int)(val * maxLen);

    for (int r = innerR; r < innerR + barLen; r += 2) {
      float t = (float)(r - innerR) / maxLen;
      uint16_t color = hslToRgb565(hue, 1.0f, 0.3f + t * 0.3f);
      float x1 = cx + cosf(angle - barWidth/2) * r;
      float y1 = cy + sinf(angle - barWidth/2) * r;
      float x2 = cx + cosf(angle + barWidth/2) * r;
      float y2 = cy + sinf(angle + barWidth/2) * r;
      gfx->drawLine(x1, y1, x2, y2, color);
    }

    if (peakValues[i] > 0.02f) {
      int peakR = innerR + (int)(peakValues[i] * maxLen) + 3;
      float px = cx + cosf(angle) * peakR;
      float py = cy + sinf(angle) * peakR;
      gfx->fillCircle(px, py, 2, 0xFFFF);
    }

    peakValues[i] *= 0.95f;
    if (bandValues[i] > peakValues[i]) {
      peakValues[i] = bandValues[i];
    }
  }
}

void loop() {
  // Étape 6 : Lire les données I2S du microphone
  size_t bytes_read = 0;
  i2s_read(I2S_PORT, sampleBuf, sizeof(sampleBuf),
           &bytes_read, portMAX_DELAY);

  // Étape 7 : Remplir la partie réelle de la FFT avec les échantillons
  for (int i = 0; i < SAMPLES; i++) {
    vReal[i] = (double)sampleBuf[i];
    vImag[i] = 0.0;
  }

  // Étape 8 : Exécuter la FFT
  FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  FFT.compute(FFT_FORWARD);
  FFT.complexToMagnitude();

  // Étape 9 : Répartir les résultats FFT en 16 bandes
  memset(bandValues, 0, sizeof(bandValues));
  int specLen = SAMPLES / 2;
  for (int i = 0; i < BANDS; i++) {
    int start = (int)(pow((float)i / BANDS, 1.8f) * specLen * 0.7f);
    int end   = (int)(pow((float)(i+1) / BANDS, 1.8f) * specLen * 0.7f);
    if (end <= start) end = start + 1;
    float sum = 0;
    for (int j = start; j < end && j < specLen; j++) {
      sum += (float)vReal[j];
    }
    float avg = sum / (end - start);
    bandValues[i] = constrain(avg / 5000.0f, 0.0f, 1.0f);
  }

  // Étape 10 : Dessiner le spectre circulaire
  drawCircularSpectrum();
}
```

---

## Explications du code

**① Pourquoi SAMPLES = 512 ?**
512 est une puissance de 2, taille pour laquelle l'algorithme FFT est le plus efficace. Avec un taux d'échantillonnage de 44,1 kHz, la résolution fréquentielle d'une FFT 512 points est d'environ 86 Hz — ce qui est suffisant. Passer à 256 serait plus rapide mais avec moins de détails fréquentiels ; passer à 1024 offrirait plus de finesse mais ferait chuter le taux de rafraîchissement de manière noticeable.

**② Pourquoi la distribution des bandes utilise pow(..., 1.8) ?**
Une répartition linéaire des bandes concentrerait les données dans les hautes fréquences, laissant les basses fréquences vides. La distribution exponentielle rend les bandes de basses fréquences plus étroites (plus de détail) et les bandes de hautes fréquences plus larges (regroupant le bruit), ce qui se rapproche de la courbe de perception fréquentielle de l'oreille humaine et donne un résultat visuellement plus « naturel ».

**③ D'où vient la normalisation par 5000 ?**
Cette valeur dépend de la distance entre votre microphone et la source sonore, ainsi que du volume ambiant — elle nécessite un ajustement manuel selon le contexte. Si les barres sont toujours à fond (énergie saturée), augmentez le 5000 ; si les barres sont trop petites et presque invisibles, diminuez-le.

**④ Quel est le rôle de peakValues[i] *= 0.95 ?**
C'est la technique classique du « maintien de crête + descente lente » : quand le son s'arrête brusquement, le point blanc de crête ne disparaît pas instantanément, mais descend progressivement en étant multiplié par 0,95 à chaque trame — visuellement plus fluide, comme sur les équipements audio professionnels.

---

## Dépannage des problèmes courants

**Pas de panique, 90 % des problèmes viennent de ces quelques points :**

**L'écran est totalement noir, rien ne s'affiche**
Vérifiez d'abord que le rétroéclairage (broche BL) est bien tiré vers le haut (si votre module n'a pas de broche BL, ignorez cette vérification), puis vérifiez que les quatre fils SPI (SCK / MOSI / CS / DC) ne sont pas mal connectés ou desserrés. Mesurez au multimètre si VCC délivre bien 3,3 V. Si le rétroéclairage est allumé mais l'écran reste noir, dans neuf cas sur dix c'est CS ou DC qui est mal branché — inversez-les et réessayez.

**Les barres du spectre ne bougent pas, ou sautent de façon chaotique sans rapport avec le son**
Première chose à faire : **vérifiez que la broche L/R de l'INMP441 est reliée à GND** — c'est le piège le plus fréquent. Une broche L/R flottante entraîne une sélection de canal anormale et les données capturées ne seront que du bruit aléatoire. Après avoir correctement connecté L/R, vérifiez les numéros GPIO des trois fils SD / WS / SCK.

**Toutes les barres du spectre sont à fond (énergie toujours au maximum)**
Augmentez la valeur de `5000` dans `bandValues[i] = constrain(avg / 5000.0f, ...)` — par exemple à `15000` ou `30000`. Un microphone trop proche de la source sonore peut aussi provoquer ce phénomène ; essayez d'abord de l'éloigner de 30 cm.

**Les barres du spectre réagissent, mais seules quelques-unes bougent**
Il est possible que la source sonore de test ait un spectre fréquentiel trop étroit (par exemple un sifflet à ton unique). Essayez avec un morceau de musique à spectre complet (avec basse, voix, instruments aigus) et vérifiez si toutes les bandes de fréquences réagissent.

**Échec de compilation : erreur avec la classe template ArduinoFFT**
Vérifiez que vous avez installé `arduinoFFT` (version kosme) en **v2.x**. La syntaxe de la v1.x est `ArduinoFFT FFT` (sans paramètre template), tandis que la v2.x utilise `ArduinoFFT<double>` — les API des deux versions sont incompatibles. Mettez simplement à jour vers la dernière version via le gestionnaire de bibliothèques.

---

## FAQ

**Q : Que se passe-t-il si la broche L/R de l'INMP441 n'est pas connectée ?**
R : La sélection de canal est flottante, le comportement de sortie du microphone est indéfini — en pratique, les données capturées seront très probablement du bruit aléatoire, et les barres du spectre sauteront chaotiquement sans aucun rapport avec le son. Relier à GND = canal gauche, relier à 3,3 V = canal droit — choisissez l'un des deux, mais ne laissez pas la broche en l'air.

**Q : Peut-on changer SAMPLES à 1024 ? Quel impact ?**
R : Oui, la résolution fréquentielle passe d'environ 86 Hz à environ 43 Hz, offrant plus de détails dans les basses fréquences. En contrepartie, le temps d'acquisition et de calcul par trame double, et le taux de rafraîchissement passe d'environ 20 fps à environ 10 fps. Pour de la visualisation spectrale, 10 fps reste acceptable à l'œil nu.

**Q : Avec uniquement du 3,3 V, l'INMP441 fonctionne-t-il correctement ?**
R : Tout à fait. L'INMP441 supporte une alimentation de 1,8 V à 3,3 V ; 3,3 V est la tension de fonctionnement la plus courante, aucun module abaisseur de tension supplémentaire n'est nécessaire.

**Q : Le taux d'utilisation du CPU de l'ESP32-S3 est-il élevé, cela peut-il affecter d'autres tâches ?**
R : La FFT 512 points consomme environ 10 % à 15 % du temps CPU d'un seul cœur à la fréquence de 240 MHz de l'ESP32-S3. Si vous avez également besoin de Wi-Fi ou Bluetooth, il est recommandé d'exécuter la FFT + le dessin sur le cœur 0 et les tâches réseau sur le cœur 1, afin qu'ils ne se gênent pas mutuellement.

**Q : Peut-on remplacer le GC9A01 par un ST7789 ou un autre driver d'écran ?**
R : Oui. Arduino_GFX_Library supporte des dizaines de chips drivers — il suffit de remplacer `Arduino_GC9A01` dans le code par la classe correspondante (par exemple `Arduino_ST7789`), de modifier les paramètres de résolution et de se référer au datasheet du nouvel écran pour le câblage. Attention, pour un écran non circulaire, il faudra recalculer les coordonnées du centre.

**Q : Il y a un « bruit de fond » sur le spectre au repos, les barres ne reviennent pas à zéro — que faire ?**
R : L'INMP441 a un bruit de fond inhérent (le SNR de 61 dBA signifie qu'une quantité minimale de bruit ambiant est toujours captée). Vous pouvez ajouter un seuil de bruit : avant le mapping, ajoutez une ligne `if (avg < 200) avg = 0;` — les barres reviendront alors à zéro au silence. Augmenter légèrement le diviseur de normalisation aide également.

**Q : Quelle version du driver I2S l'ESP32-S3 utilise-t-il ?**
R : Cet article utilise l'ancien driver I2S de style ESP-IDF v4.x (`i2s_driver_install` / `i2s_read`). ESP-IDF v5.x a introduit une nouvelle API I2S (`i2s_new_channel`, etc.) — si le pack de support de votre carte ESP32-S3 a été mis à jour en version 3.x, vous devrez adapter la fonction `setupMicrophone()` en vous référant à la nouvelle API.

---

## Idées d'extensions

- Passer à 32 bandes, couplé à un écran circulaire plus grand (par exemple GC9A01A 2,1 pouces), pour un spectre plus fin
- Ajouter des boutons tactiles pour basculer entre les modes d'affichage (rayonnement circulaire / barres verticales / forme d'onde oscilloscope)
- Se connecter en Wi-Fi pour envoyer les données spectrales à un navigateur et les restituer dans une page web
- Utiliser deux INMP441 pour la stéréo, avec des couleurs différentes pour les canaux gauche et droit

---

## Références

- [Datasheet officiel INMP441 — TDK InvenSense](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [Datasheet du chip driver GC9A01](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [arduinoFFT GitHub — kosme](https://github.com/kosme/arduinoFFT)
- [Fiche technique ESP32-S3 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Documentation du driver I2S ESP-IDF — Espressif](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)