---
title: "ESP32-S3 et papier électronique six couleurs EPD037A02 (JD7601) : démo en trois écrans jouée une seule fois — Hello, emploi du temps en anglais et photo préconvertie (SPI + Arduino)"
boardId: esp32s3
moduleId: display/epd-3inch7-epd037a02-jd7601
category: esp32
date: 2026-11-20
intro: "Pilotez le papier électronique six couleurs EPD037A02 avec un ESP32-S3 et Adafruit GFX : câblage SPI, configuration Arduino et code complet pour afficher une seule fois Hello, un emploi du temps en anglais et une photo préconvertie. Pour les lecteurs habitués au téléversement Arduino qui souhaitent découvrir le pilotage du papier électronique six couleurs et la conversion de photos."
image: "https://img.lingflux.com/2026/11/ff03861dd789ec83465baba962075e98.jpg"
---

Difficulté : ⭐⭐ (une expérience du téléversement Arduino suffit)<br>
Durée : pour une première réalisation, comptez environ 30 minutes pour le câblage, l’installation des bibliothèques et le téléversement (estimation, sans chronométrage). La lecture des trois écrans dure environ 1 à 1,5 minute (15 à 25 secondes de rafraîchissement complet par écran, plus deux pauses de 3 secondes).<br>
Environnement de test : Arduino IDE 2.3.8 ; esp32 Arduino Core 3.3.10 ; Adafruit GFX Library 1.13.0

> **En une phrase** : affichez successivement Hello, un emploi du temps en anglais et une photo sur le papier électronique six couleurs EPD037A02, avec un ESP32-S3, SPI et Adafruit GFX.

## Prise en main rapide

- Téléchargez tout le dossier `EPD_3in7_Showcase_JD7601` depuis [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601) (il se trouve dans `Handbook/Arduino/ESP32-S3/` du dépôt LingShunLAB ; clonez le dépôt ou téléchargez son ZIP complet). Le fichier principal `.ino`, les fichiers du pilote `.h/.cpp` et `photo_data.h` doivent se trouver dans ce dossier, dont le nom doit correspondre à celui du fichier principal `.ino`.
- Câblage : reliez BUSY, RST, DC, CS, MOSI et SCK respectivement à GPIO7, 8, 9, 10, 11 et 12 ; VDD à 3,3 V et GND à la masse commune de la carte.
- Installez esp32 Arduino Core 3.3.10, Adafruit GFX Library 1.13.0 et sa dépendance Adafruit BusIO 1.17.4.
- Sélectionnez la carte `ESP32S3 Dev Module`, compilez, téléversez, puis ouvrez le moniteur série à 115200 bauds.
- `HOLD_MS` vaut 3000 ms par défaut : c’est le délai supplémentaire après le rafraîchissement de chaque écran, et non l’intervalle entre deux écrans.

## Avant-propos

Je voulais réaliser une carte de démonstration en papier électronique avec un ESP32-S3 : afficher d’abord Hello, puis un emploi du temps en anglais, et enfin conserver une photo à l’écran.

Mon OSPTEK EPD037A02 est un écran SPI six couleurs de 480×720. GxEPD2 ne propose pas de pilote pour cet écran ; j’ai donc écrit le mien, chargé uniquement du séquencement SPI et du format de trame du JD7601. Adafruit GFX prend en charge le texte et les graphiques. Cet article présente le câblage, la configuration des bibliothèques et le code complet des trois écrans.

## Résultat final

Le programme joue une seule fois la séquence Hello → emploi du temps en anglais → photo. Les deux premiers écrans restent affichés 3000 ms après leur rafraîchissement, puis la photo demeure à l’écran ; `loop()` ne rafraîchit plus rien.

![](https://img.lingflux.com/2026/11/dc08d160b6bc55bc5a237bcadf4abc9f.jpg)



## Présentation des composants
### Papier électronique six couleurs EPD037A02

L’EPD037A02 est un module de papier électronique six couleurs OSPTEK de 3,7 pouces. Le papier électronique utilise la lumière ambiante pour rendre les couleurs et conserve l’image hors tension. Cet exemple affiche du texte, des pastilles de six couleurs, un emploi du temps et une photo déjà convertie.

Il ne propose que le noir, le blanc, le jaune, le rouge, le bleu et le vert, sans niveaux de gris. Les tons intermédiaires d’une photo sont simulés en mêlant des pixels de différentes couleurs : il est donc impossible d’envoyer directement un JPG à l’écran ; il faut d’abord le convertir au format de trame du panneau.

| Paramètre | Caractéristique |
| --- | --- |
| Modèle | EPD037A02 |
| Dimensions et résolution | 3,7 pouces, 480×720 |
| Couleurs | Noir, blanc, jaune, rouge, bleu, vert |
| Format des pixels | 4 bit/pixel, deux pixels par octet |
| Interface | SPI 4 fils, 1 connecteur 8P de 2,54 mm |
| Durée d’un rafraîchissement complet | Environ 15 à 25 secondes |
| Alimentation | 3,3 V |

Cet écran permet de tester le texte, les graphiques et les photos six couleurs avec un seul module. Son inconvénient est la lenteur du rafraîchissement, qui exclut les animations.

## Liste du matériel

| Matériel | Quantité | Remarque |
| --- | --- | --- |
| Carte de développement ESP32-S3 | 1 | Cet exemple utilise `ESP32S3 Dev Module` |
| Module EPD037A02 avec adaptateur SPI | 1 | Papier électronique six couleurs 480×720 |
| Fils Dupont 2,54 mm | 8 | 6 signaux, 1 alimentation et 1 masse |
| Câble USB de données | 1 | Alimentation, téléversement et moniteur série |

### Description des broches

| Broche de l’écran | Direction | Fonction |
| --- | --- | --- |
| BUSY | Écran → ESP32-S3 | Niveau haut = inactif, niveau bas = occupé |
| CS | ESP32-S3 → écran | Sélection du circuit, active à l’état bas, commandée manuellement par le programme |
| DC | ESP32-S3 → écran | Niveau bas pour une commande, niveau haut pour des données |
| RST | ESP32-S3 → écran | Réinitialisation, active à l’état bas |
| SDA / MOSI | ESP32-S3 → écran | Données SPI |
| CLK / SCK | ESP32-S3 → écran | Horloge SPI |
| VDD | Alimentation | 3,3 V uniquement |
| GND | Alimentation | Masse commune avec la carte |

Cet écran reçoit des données mais n’en renvoie pas : MISO n’est donc pas nécessaire. Sur l’adaptateur, BS0 est relié à la masse par une résistance de 10 kΩ, ce qui fixe le mode SPI 4 fils. Ce mode utilise DC pour distinguer commandes et données ; cette broche est donc indispensable.

## Câblage

Mettez la carte hors tension avant d’effectuer les connexions ci-dessous.

| Broche de l’écran | ESP32-S3 | Usage |
| --- | --- | --- |
| BUSY | GPIO7 | Lecture de l’état occupé/inactif du panneau |
| CS | GPIO10 | Sélection manuelle du circuit |
| DC | GPIO9 | Distinction entre commandes et données |
| RST | GPIO8 | Réinitialisation du panneau |
| SDA / MOSI | GPIO11 | Données SPI |
| CLK / SCK | GPIO12 | Horloge SPI |
| VDD | 3,3 V | Alimentation du module |
| GND | GND | Masse commune |

**VDD doit être relié uniquement à 3,3 V, jamais à 5 V.** Vérifiez chaque fil, en particulier que SDA et CLK ne sont pas inversés.

Une fois le câblage terminé :

1. Reliez la carte par USB, puis sélectionnez `ESP32S3 Dev Module` et le port correspondant dans Arduino IDE.
2. Ouvrez l’exemple complet, compilez-le et téléversez-le.
3. Ouvrez le moniteur série à 115200 bauds. Si les premiers journaux ne s’affichent pas, appuyez sur RESET pour relancer le programme. La séquence n’est jouée qu’une fois : un moniteur ouvert trop tard manquera les premiers messages.
4. Le port série doit afficher successivement les informations sur le tampon de trame, la fin de l’initialisation du panneau, deux messages de fin de rafraîchissement (l’écran photo n’affiche pas la durée du rafraîchissement), puis `Done. Last picture stays on screen.`. Les trois écrans doivent apparaître dans le même ordre. La démo fonctionne seulement si ces deux résultats sont corrects.

## Bibliothèques à installer

Dans le gestionnaire de cartes d’Arduino IDE, recherchez `esp32` et installez esp32 Arduino Core d’Espressif Systems ; cet article utilise la version 3.3.10.

Recherchez et installez ensuite les bibliothèques suivantes dans le gestionnaire de bibliothèques. Si l’installation d’Adafruit GFX propose d’installer ses dépendances, choisissez tout installer afin d’ajouter aussi Adafruit BusIO.

| Bibliothèque | Version testée | Source |
| --- | --- | --- |
| Adafruit GFX Library | 1.13.0 | [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library) |
| Adafruit BusIO | 1.17.4 | [Adafruit_BusIO](https://github.com/adafruit/Adafruit_BusIO) |
| SPI | Fournie avec esp32 Core 3.3.10 | Incluse dans [arduino-esp32](https://github.com/espressif/arduino-esp32), aucune installation séparée |
| EPD037A02_GFX | Version non indiquée | Fournie avec ce projet, dans le même dossier que le `.ino` principal ; ne pas copier dans le dossier des bibliothèques |

Adafruit GFX dessine le texte et les graphiques. `EPD037A02_GFX` gère l’initialisation du panneau, les transferts SPI, le codage des six couleurs et le rafraîchissement. Les commandes varient selon les modèles de panneau : cette couche ne peut pas être remplacée directement par la bibliothèque d’un autre papier électronique.

## Code complet

Le code source de l’exemple est disponible sur [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601). Le dossier et le programme principal portent tous deux le nom `EPD_3in7_Showcase_JD7601` ; ces noms doivent correspondre pour qu’Arduino IDE puisse ouvrir le projet. Voici les principaux fichiers :

```text
EPD_3in7_Showcase_JD7601/
├── EPD_3in7_Showcase_JD7601.ino
├── EPD037A02_GFX.h
├── EPD037A02_GFX.cpp
├── photo_data.h
└── tool/
    ├── epd_photo.py                  # Script de conversion des photos
    └── 02-driver-dog-car-480x720.png # Image originale de la photo d’exemple
```

Le code des trois premiers fichiers figure ci-dessous. `photo_data.h` contient plus de dix mille lignes et n’est pas reproduit ici : téléchargez-le depuis le dépôt, car le programme ne compile pas sans lui.

Il contient un tableau `photo_driver` de 172800 octets, généré à partir de `tool/02-driver-dog-car-480x720.png`. Il stocke la trame convertie pour le panneau, et non le contenu du fichier PNG.

Le code ci-dessous suit la même logique que les sources du dépôt ; seuls certains commentaires ont été adaptés. Le dépôt fait référence.

### Programme principal EPD_3in7_Showcase_JD7601.ino

```cpp
/*
 * EPD_3in7_Showcase — Hello + emploi du temps en anglais + une photo
 * Écran : OSPTEK 3.7" E6, 480×720, JD7601
 * Contrôleur : ESP32-S3
 *
 * Les débutants n’ont besoin de modifier que ce fichier. Utilisez les polices fournies avec Adafruit GFX, sans créer de jeu de caractères.
 * Installation : recherchez Adafruit GFX Library dans le gestionnaire de bibliothèques d’Arduino IDE.
 * Ouverture : téléchargez tout le dossier Showcase avant d’ouvrir ce .ino ; ne copiez pas seulement le fichier principal.
 */

#include "EPD037A02_GFX.h"
#include "photo_data.h"

// Ordre des broches : CS, DC, RST, BUSY, SCK, MOSI ; alimentation 3.3V uniquement.
EPD037A02_GFX epd(10, 9, 8, 7, 12, 11);
#define HOLD_MS 3000

// La coordonnée y de la police 5×7 intégrée correspond au bord supérieur du texte ; chaque caractère occupe 6×8 pixels.
void text(const char *s, int x, int y, uint8_t size, uint8_t color) {
  epd.setFont();                 // Utilise la police GFX intégrée, sans setFont(jeu de caractères) supplémentaire
  epd.setTextSize(size);
  epd.setTextColor(color);
  epd.setCursor(x, y);
  epd.print(s);
}

void textCenter(const char *s, int y, uint8_t size, uint8_t color) {
  int w = strlen(s) * 6 * size;
  text(s, (480 - w) / 2, y, size, color);
}

void drawHello() {
  epd.fillScreen(EPD_WHITE);
  epd.drawRect(0, 0, 480, 720, EPD_BLACK);
  textCenter("HELLO", 65, 9, EPD_BLACK);
  textCenter("WORLD", 150, 9, EPD_RED);
  epd.fillRect(40, 245, 400, 4, EPD_BLACK);

  // Les six pastilles permettent aussi de vérifier la correspondance des couleurs et l’orientation de l’image.
  const uint8_t colors[6] = {
    EPD_BLACK, EPD_WHITE, EPD_YELLOW, EPD_RED, EPD_BLUE, EPD_GREEN
  };
  const char *labels[6] = { "K", "W", "Y", "R", "B", "G" };
  for (int i = 0; i < 6; i++) {
    int x = 16 + i * 76;
    epd.fillRect(x, 295, 68, 110, colors[i]);
    epd.drawRect(x, 295, 68, 110, EPD_BLACK);
    text(labels[i], x + 22, 430, 4, EPD_BLACK);
  }
  textCenter("3.7INCH 480X720", 525, 4, EPD_BLACK);
  textCenter("E6 6-COLOR EPD", 570, 4, EPD_BLACK);
  textCenter("ESP32-S3 OK", 640, 4, EPD_BLUE);
}

// Pour modifier l’emploi du temps, changez uniquement ces lignes.
const char *subjects[6] = {
  "MATH", "CHINESE", "ENGLISH", "PHYSICS", "CHEMISTRY", "STUDY HALL"
};
const char *rooms[6] = {
  "ROOM 302", "ROOM 302", "AUDIO LAB", "PHYS LAB", "CHEM LAB", "ROOM 302"
};
const char *times[6] = { "08:00", "08:55", "NOW", "11:05", "14:00", "14:55" };
const uint8_t bars[6] = {
  EPD_BLUE, EPD_RED, EPD_RED, EPD_BLACK, EPD_YELLOW, EPD_WHITE
};

void drawAgenda() {
  epd.fillScreen(EPD_WHITE);
  epd.fillRect(0, 0, 480, 100, EPD_BLACK);
  text("MON - NOV 9", 24, 20, 4, EPD_WHITE);
  text("WEEK 12 - 6 CLASSES", 24, 65, 2, EPD_YELLOW);

  for (int i = 0; i < 6; i++) {
    int y = 115 + i * 92;
    bool now = (i == 2);
    epd.fillRoundRect(18, y, 444, 80, 5, now ? EPD_RED : EPD_WHITE);
    if (!now) epd.drawRoundRect(18, y, 444, 80, 5, EPD_BLACK);
    if (bars[i] != EPD_WHITE) epd.fillRect(20, y + 2, 9, 76, bars[i]);

    uint8_t fg = now ? EPD_WHITE : EPD_BLACK;
    text(subjects[i], 45, y + 12, 3, fg);
    text(rooms[i], 45, y + 47, 2, fg);
    text(times[i], 365, y + 25, 2, fg);
  }
  text("NEXT 11:05 PHYSICS", 20, 688, 2, EPD_BLACK);
}

bool showScreen(uint8_t index) {
  switch (index) {
    case 0: drawHello();  return epd.display();
    case 1: drawAgenda(); return epd.display();
    case 2: return epd.displayRawFrame(photo_driver, PHOTO_DRIVER_BYTES);
    default: return false;
  }
}

void setup() {
  // Étape 1 : ouvrir le port série, qui permettra de repérer l’étape bloquée.
  Serial.begin(115200);
  delay(500);
  Serial.println("Showcase: Hello -> English agenda -> portrait");

  // Étape 2 : allouer le tampon de trame, initialiser SPI, puis réinitialiser et initialiser le panneau.
  if (!epd.begin()) {
    Serial.println("Init failed: check 3V3, GND, wiring and BUSY.");
    return;
  }

  // Étape 3 : jouer chacun des trois écrans une fois. En cas d’échec, arrêter sans rafraîchir les suivants.
  for (uint8_t i = 0; i < 3; i++) {
    if (!showScreen(i)) {
      Serial.println("Refresh failed; stopped. Check wiring and BUSY.");
      return;
    }
    if (i < 2) delay(HOLD_MS);   // Pause après le rafraîchissement, et non période de changement d’écran
  }
  Serial.println("Done. Last picture stays on screen.");
}

void loop() {
  // Lecture unique. Modifiez subjects / rooms / times ci-dessus pour changer l’emploi du temps.
}

// Étape 4 : rejeter à la compilation les trames photo dont les dimensions ou la longueur sont incorrectes.
static_assert(PHOTO_DRIVER_W == 480 && PHOTO_DRIVER_H == 720,
              "Photo must be 480x720");
static_assert(PHOTO_DRIVER_BYTES == EPD037A02_BUF_BYTES,
              "Photo must be 172800 bytes");
```

### Interface du pilote EPD037A02_GFX.h

```cpp
/*
 * EPD037A02_GFX — classe de pilote de panneau pour Adafruit_GFX
 * Papier électronique OSPTEK 3.7" E6, 480×720, six couleurs (JD7601 / IST7601 / IST7163)
 *
 * La couche panneau est écrite ici, tandis que la couche graphique hérite directement d’Adafruit_GFX.
 * drawLine, fillCircle, setFont et print sont donc immédiatement disponibles.
 *
 * MIT / CC BY 4.0, comme les autres ressources du dépôt.
 */

#ifndef EPD037A02_GFX_H
#define EPD037A02_GFX_H

#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>

/* ---------------------------- Constantes du panneau --------------------------- */

#define EPD037A02_WIDTH    480
#define EPD037A02_HEIGHT   720
#define EPD037A02_BUF_BYTES ((size_t)EPD037A02_WIDTH * EPD037A02_HEIGHT / 2) /* 172800 */

// Un octet contient deux pixels adjacents de la même colonne. Si le décalage mesuré est de 1 à 2 px, mettez cette valeur à 1.
#ifndef EPD037A02_SWAP_NIBBLE
#define EPD037A02_SWAP_NIBBLE 0
#endif

// Valeurs de couleur 4 bit du JD7601 : 0x4 est interdit ; ne les numérotez pas continûment de 0 à 5.
enum EPDColor : uint8_t {
  EPD_BLACK  = 0x0,
  EPD_WHITE  = 0x1,
  EPD_YELLOW = 0x2,
  EPD_RED    = 0x3,
  EPD_BLUE   = 0x5,
  EPD_GREEN  = 0x6,
};

/* -------------------------------- Classe du pilote --------------------------- */
/*
 * Utilisation :
 *   EPD037A02_GFX display(10, 9, 8, 7);    // cs, dc, rst, busy
 *   display.begin();                       // Allocation du tampon + réinitialisation + INIT
 *   display.setRotation(0);                // 0/2 = 480×720, 1/3 = 720×480
 *   display.fillScreen(EPD_WHITE);
 *   display.setFont(&FreeSansBold24pt7b);
 *   display.setCursor(20, 120);  display.print("Hello");
 *   display.display();                     // Transfert + rafraîchissement complet (15 à 25 s)
 *
 * Les couleurs sont des indices 4 bit, au nombre de six, et non du RGB565.
 * Une couleur 16 bits compile aussi, mais seuls ses 4 bits de poids faible sont utilisés et le résultat n’a pas de sens.
 */
class EPD037A02_GFX : public Adafruit_GFX {
 public:
  EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                int8_t sck = -1, int8_t mosi = -1, SPIClass *spi = &SPI);
  ~EPD037A02_GFX();

  // Alloue le tampon de trame, initialise GPIO/SPI, puis réinitialise et initialise le panneau.
  // Renvoie false si la mémoire est insuffisante ou si BUSY ne répond pas ; l’écran reste inchangé.
  bool begin(uint32_t spi_hz = 2000000);

  // Transfère le tampon vers l’écran et effectue un rafraîchissement complet. Bloque 15 à 25 s ; renvoie false si BUSY expire.
  bool display();

  // Envoie directement une trame native 480×720 déjà empaquetée, sans allouer un second tampon pour la photo.
  bool displayRawFrame(const uint8_t *frame, size_t bytes);

  // Met le panneau en sommeil profond. Le réveil exige une nouvelle mise sous tension ou une impulsion sur RST suivie de begin().
  bool sleep();

  // Efface seulement le tampon sans rafraîchir immédiatement. En cas d’images résiduelles, appelez clear() puis display() pour rafraîchir un écran blanc.
  void clear(uint16_t color = EPD_WHITE);

  // drawPixel est la fonction virtuelle pure requise par Adafruit_GFX ; fillScreen est réécrit avec memset pour plus de rapidité.
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void fillScreen(uint16_t color) override;

  // Quantifie RGB vers la plus proche des six couleurs ; utile pour des images simples.
  static uint8_t fromRGB(uint8_t r, uint8_t g, uint8_t b);

  uint8_t *buffer() const { return _buf; }
  bool ready() const { return _buf != nullptr; }
  uint32_t lastRefreshMs() const { return _lastRefreshMs; }
  void setVerbose(bool v) { _verbose = v; }

 private:
  int8_t _cs, _dc, _rst, _busy, _sck, _mosi;
  SPIClass *_spi;
  uint32_t _spiHz;
  uint8_t *_buf;
  uint32_t _lastRefreshMs;
  bool _verbose;

  void _alloc();
  void _spiSend(const uint8_t *buf, size_t len);
  void _cmd(uint8_t c);
  void _data(uint8_t d);
  void _dataBuf(const uint8_t *buf, size_t len);
  bool _waitBusy(const char *what, uint32_t timeout_ms = 60000);
  bool _reset();
  bool _initPanel();
};

#endif /* EPD037A02_GFX_H */
```

### Implémentation du pilote EPD037A02_GFX.cpp

```cpp
/*
 * EPD037A02_GFX.cpp — couche panneau : SPI, séquencement et format de trame
 * Cette couche fait seulement trois choses : envoyer des octets, attendre BUSY et convertir (x,y) en indice du tampon.
 * Adafruit_GFX prend en charge les graphiques, les polices et la rotation.
 */

#include "EPD037A02_GFX.h"

#include <string.h>
#include <pgmspace.h>

#if defined(ESP32)
#include <esp32-hal-psram.h>
#endif

namespace {
// Deux pixels par octet : une colonne verticale de 720 pixels occupe donc 360 octets.
const size_t kColBytes  = EPD037A02_HEIGHT / 2;
const size_t kChunk     = 2048;    // Limite d’un transfert SPI, identique à l’exemple du fabricant
const uint32_t kBusyTmo = 60000;   // Un rafraîchissement complet dure au maximum 25 s ; marge incluse
}  // namespace

EPD037A02_GFX::EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                             int8_t sck, int8_t mosi, SPIClass *spi)
    : Adafruit_GFX(EPD037A02_WIDTH, EPD037A02_HEIGHT),
      _cs(cs), _dc(dc), _rst(rst), _busy(busy), _sck(sck), _mosi(mosi),
      _spi(spi), _spiHz(2000000), _buf(nullptr), _lastRefreshMs(0),
      _verbose(true) {}

EPD037A02_GFX::~EPD037A02_GFX() {
  if (_buf) {
    free(_buf);   // La mémoire allouée par ps_malloc est aussi libérée avec free()
    _buf = nullptr;
  }
}

/* ============================ Mémoire / initialisation ============================ */

void EPD037A02_GFX::_alloc() {
  if (_buf) return;
#if defined(ESP32)
  if (psramFound()) _buf = (uint8_t *)ps_malloc(EPD037A02_BUF_BYTES);
#endif
  if (!_buf) _buf = (uint8_t *)malloc(EPD037A02_BUF_BYTES);
}

bool EPD037A02_GFX::begin(uint32_t spi_hz) {
  // Étape 1 : obtenir le tampon de trame de 172800 octets et le remplir d’abord en blanc.
  _spiHz = spi_hz;
  _alloc();
  if (!_buf) {
    if (_verbose) {
      Serial.printf("[EPD] Échec d’allocation du tampon de trame, %u octets nécessaires\n",
                    (unsigned)EPD037A02_BUF_BYTES);
    }
    return false;
  }

  // malloc ne met pas la mémoire à zéro ; remplir en blanc évite d’afficher de la mémoire non initialisée.
  clear(EPD_WHITE);

  // Étape 2 : configurer les broches. CS est commandé manuellement et MISO n’est pas connecté.
  pinMode(_cs, OUTPUT);   digitalWrite(_cs, HIGH);
  pinMode(_dc, OUTPUT);   digitalWrite(_dc, HIGH);
  pinMode(_rst, OUTPUT);  digitalWrite(_rst, HIGH);
  pinMode(_busy, INPUT);

  // L’ordre des paramètres est SCK, MISO, MOSI, SS. Passez -1 à SS : ne confiez pas CS au périphérique.
  _spi->begin(_sck, -1, _mosi, -1);

  if (_verbose) {
    Serial.printf("[EPD] Tampon de trame %u B, SPI %lu Hz\n",
                  (unsigned)EPD037A02_BUF_BYTES, (unsigned long)_spiHz);
  }

  // Étape 3 : réinitialiser le panneau et envoyer les commandes d’initialisation.
  return _initPanel();
}

bool EPD037A02_GFX::_initPanel() {
  if (!_reset()) return false;

  _cmd(0xE9); _data(0x01);   // INIT du fabricant : commande d’initialisation du JD7601

  if (_verbose) Serial.println("[EPD] Initialisation du panneau terminée");
  return true;
}

/* ================================= SPI bas niveau ================================= */

void EPD037A02_GFX::_spiSend(const uint8_t *buf, size_t len) {
  digitalWrite(_cs, LOW);
  _spi->beginTransaction(SPISettings(_spiHz, MSBFIRST, SPI_MODE0));
  _spi->writeBytes(buf, len);
  _spi->endTransaction();
  digitalWrite(_cs, HIGH);
}

void EPD037A02_GFX::_cmd(uint8_t c) {
  digitalWrite(_dc, LOW);    // DC=L : commande
  _spiSend(&c, 1);
}

void EPD037A02_GFX::_data(uint8_t d) {
  digitalWrite(_dc, HIGH);   // DC=H : données
  _spiSend(&d, 1);
}

void EPD037A02_GFX::_dataBuf(const uint8_t *buf, size_t len) {
  digitalWrite(_dc, HIGH);
  while (len) {
    size_t n = (len > kChunk) ? kChunk : len;
    _spiSend(buf, n);
    buf += n;
    len -= n;
  }
}

// BUSY haut = inactif, bas = occupé. Le texte de la Note 6-4 de la fiche technique inverse ces états ; suivre le tableau des broches et les mesures.
bool EPD037A02_GFX::_waitBusy(const char *what, uint32_t timeout_ms) {
  uint32_t t0 = millis();
  while (digitalRead(_busy) == LOW) {
    if (millis() - t0 > timeout_ms) {
      if (_verbose) Serial.printf("[EPD] Expiration de BUSY : %s\n", what);
      return false;
    }
    delay(2);
  }
  return true;
}

// Séquence RESET du fabricant : bas 20 → haut 10 → bas 20 → haut 10 ms, puis attendre BUSY.
bool EPD037A02_GFX::_reset() {
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);

  if (digitalRead(_busy) == LOW) {
    if (_verbose) Serial.println("[EPD] Attente du passage de BUSY au niveau haut (10 s maximum) ; en cas d’expiration, vérifiez 3V3 / GND / la nappe");
    if (!_waitBusy("reset", 10000)) return false;
  }
  delay(10);
  return true;
}

/* ============================ Séquence de rafraîchissement ============================ */

bool EPD037A02_GFX::display() {
  if (!_buf) return false;
  uint32_t t0 = millis();

  _cmd(0x10);                             // DTM : préparation de l’écriture en RAM
  if (!_waitBusy("DTM")) return false;
  _dataBuf(_buf, EPD037A02_BUF_BYTES);

  _cmd(0x04);                             // PON : activation de la haute tension
  if (!_waitBusy("PON")) return false;
  delay(10);

  _cmd(0x12); _data(0x00);                // DRF : démarrage du rafraîchissement
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;

  _cmd(0x02); _data(0x00);                // POF : désactivation de la haute tension
  if (!_waitBusy("POF")) return false;
  delay(20);

  _lastRefreshMs = millis() - t0;
  if (_verbose) Serial.printf("[EPD] Rafraîchissement terminé %lu ms\n", (unsigned long)_lastRefreshMs);
  return true;
}

bool EPD037A02_GFX::displayRawFrame(const uint8_t *frame, size_t bytes) {
  if (!frame || bytes != EPD037A02_BUF_BYTES) return false;

  _cmd(0x10);
  if (!_waitBusy("DTM")) return false;

  // Copier 2048 octets à la fois de Flash vers RAM avant le transfert SPI ; ne pas laisser DMA lire directement Flash.
  uint8_t chunk[kChunk];
  digitalWrite(_dc, HIGH);
  for (size_t off = 0; off < bytes; off += sizeof(chunk)) {
    size_t n = bytes - off;
    if (n > sizeof(chunk)) n = sizeof(chunk);
    memcpy_P(chunk, frame + off, n);
    _spiSend(chunk, n);
  }

  _cmd(0x04);
  if (!_waitBusy("PON")) return false;
  delay(10);
  _cmd(0x12); _data(0x00);
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;
  _cmd(0x02); _data(0x00);
  if (!_waitBusy("POF")) return false;
  delay(20);
  return true;
}

bool EPD037A02_GFX::sleep() {
  _cmd(0x07); _data(0xA5);
  if (_verbose) Serial.println("[EPD] Sommeil profond activé");
  return true;
}

/* ==================================== Dessin ==================================== */

void EPD037A02_GFX::clear(uint16_t color) {
  if (!_buf) return;
  uint8_t c = (uint8_t)(color & 0x0F);
  memset(_buf, (int)((c << 4) | c), EPD037A02_BUF_BYTES);
}

void EPD037A02_GFX::fillScreen(uint16_t color) { clear(color); }

void EPD037A02_GFX::drawPixel(int16_t x, int16_t y, uint16_t color) {
  if (!_buf) return;
  if (x < 0 || y < 0 || x >= _width || y >= _height) return;

  // Convertir d’abord les coordonnées logiques affectées par rotation en coordonnées natives du panneau.
  int16_t dx, dy;
  switch (rotation & 3) {
    case 0:  dx = x;                 dy = y;                 break;
    case 1:  dx = WIDTH - 1 - y;     dy = x;                 break;
    case 2:  dx = WIDTH - 1 - x;     dy = HEIGHT - 1 - y;    break;
    default: dx = y;                 dy = HEIGHT - 1 - x;    break;
  }

  // Le panneau reçoit les données par colonnes verticales, balayées de bas en haut : un miroir Y est donc nécessaire.
  // Une écriture classique par lignes horizontales produit une image tournée de 90° et répétée avec des décalages.
  const int16_t fy = HEIGHT - 1 - dy;
  size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);

#if EPD037A02_SWAP_NIBBLE
  const bool lowNibble = ((fy & 1) == 0);
#else
  const bool lowNibble = ((fy & 1) != 0);
#endif

  // Diviser l’octet en deux quartets et modifier seulement celui du pixel cible.
  const uint8_t c = (uint8_t)(color & 0x0F);
  if (lowNibble) _buf[i] = (uint8_t)((_buf[i] & 0xF0) | c);
  else           _buf[i] = (uint8_t)((_buf[i] & 0x0F) | (c << 4));
}

/* ========================== Quantification RGB vers six couleurs ========================== */

struct EPDRgbRef { uint8_t r, g, b, code; };

// Les couleurs de référence correspondent au rendu typique de Spectra 6 / E6 ; une teinte légèrement plus sombre se rapproche de la perception visuelle.
static const EPDRgbRef kRefs[6] = {
    {  0,   0,   0, EPD_BLACK  },
    {255, 255, 255, EPD_WHITE  },
    {255, 232,   0, EPD_YELLOW },
    {190,  30,  45, EPD_RED    },
    { 35,  70, 150, EPD_BLUE   },
    { 40, 110,  60, EPD_GREEN  },
};

uint8_t EPD037A02_GFX::fromRGB(uint8_t r, uint8_t g, uint8_t b) {
  // Distance euclidienne pondérée, avec un poids plus important pour le vert.
  int32_t best = INT32_MAX;
  uint8_t code = EPD_BLACK;
  for (int k = 0; k < 6; k++) {
    int32_t dr = (int32_t)r - kRefs[k].r;
    int32_t dg = (int32_t)g - kRefs[k].g;
    int32_t db = (int32_t)b - kRefs[k].b;
    int32_t d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < best) { best = d; code = kRefs[k].code; }
  }
  return code;
}
```

### Explication du code

**Stockage des pixels.** `drawPixel()` est la fonction la plus facile à mal écrire. L’écran fait 480×720, chaque pixel occupe 4 bit et une trame représente 480×720÷2 = 172800 octets.

Contrairement à un écran classique écrit par lignes, celui-ci reçoit les données par colonnes verticales : 480 colonnes de 360 octets chacune, balayées de bas en haut. Le code applique donc d’abord le miroir Y `fy = HEIGHT-1-dy`, puis calcule la position de l’octet avec `i = dx*360 + (fy>>1)`.

**Codage des couleurs.** Les six codes ne sont pas continus : noir, blanc, jaune et rouge vont de `0x0` à `0x3`, tandis que bleu et vert valent `0x5` et `0x6` ; `0x4` est interdit. Utilisez directement les énumérations comme `EPD_BLACK`, sans saisir vos propres numéros.

**Rafraîchissement des trois écrans.** La boucle `for` de `setup()` s’exécute trois fois. Les deux premiers écrans sont dessinés dans le tampon de trame, puis transmis et rafraîchis par `display()`. Le troisième appelle `displayRawFrame()`, qui copie les données de `photo_data.h` de Flash vers RAM par blocs de 2048 octets avant de les envoyer par SPI.

**Mémoire.** L’écran photo n’utilise pas le tampon de trame, contrairement aux deux premiers : le programme a donc toujours besoin d’un tampon de 172800 octets. Il est placé de préférence en PSRAM si elle existe, sinon en RAM interne ou en cas d’échec d’allocation.

**Durée d’affichage.** Chaque rafraîchissement prend 15 à 25 secondes ; `HOLD_MS` ajoute seulement une pause après sa fin. L’intervalle réel entre les deux premiers écrans correspond donc au temps de rafraîchissement plus 3 secondes. Il n’y a pas de lecture en boucle : appuyez sur RESET pour la relancer.

**Modifier l’emploi du temps.** Changez les trois tableaux `subjects`, `rooms` et `times`, dont les six lignes se correspondent. `bars` définit la couleur de la barre située à gauche de chaque ligne. Le « cours actuel » surligné est toujours la troisième ligne (`i == 2`). La date du titre, `WEEK 12` et le texte inférieur `NEXT 11:05 PHYSICS` sont codés en dur. L’exemple ne lit pas d’horloge et ne se met pas à jour automatiquement.

### Conversion d’une photo en données pour le panneau

La photo n’est pas traitée sur la carte. L’ordinateur la convertit d’abord en matrice six couleurs ; l’ESP32-S3 se contente d’envoyer les données converties à l’écran.

```text
JPG/PNG → recadrage centré et redimensionnement à 480×720
→ réglage de l’exposition, du contraste et de la saturation → tramage six couleurs → conversion en valeurs de couleur du panneau
→ organisation en colonnes verticales, miroir Y et regroupement de deux pixels par octet
→ tableau de 172800 octets (photo_data.h) → intégration dans Flash
→ envoi à l’écran par SPI depuis l’ESP32-S3
```

Le tramage entrelace des pixels de différentes couleurs pour que l’œil perçoive des tons intermédiaires dans la matrice. Il n’ajoute aucune couleur : après conversion, chaque pixel reste noir, blanc, jaune, rouge, bleu ou vert. Le script calcule les distances à partir du rendu réel des couleurs du papier électronique, plutôt sombre, mais produit les valeurs de couleur du panneau.

L’organisation des pixels et le codage des couleurs ont été présentés dans les sections « Stockage des pixels » et « Codage des couleurs » ; le script applique les mêmes règles d’empaquetage. Les données générées peuvent donc être envoyées directement au panneau : la carte n’a ni à décoder le JPG, ni à calculer le tramage.

### Remplacer la photo

Sauvegardez d’abord l’ancien `photo_data.h`, car la commande ci-dessous l’écrasera. Python 3, Pillow et numpy sont nécessaires sur l’ordinateur (`pip install pillow numpy`). Ils ne sont pas nécessaires pour simplement exécuter l’exemple.

Exécutez cette commande dans le dossier de l’exemple :

```bash
cd EPD_3in7_Showcase_JD7601
python3 tool/epd_photo.py ma-photo.jpg --header photo_data.h --header-name photo_driver
```

- Le nom du tableau doit rester `photo_driver`. Le script l’utilise pour générer `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H` et `PHOTO_DRIVER_BYTES`, requis par les `static_assert` à la fin du programme principal.
- Par défaut, l’image est recadrée au centre en 480×720. Pour conserver les bords, ajoutez `--fit contain` (marges vides) ou `--fit stretch` (étirement et déformation).
- La sortie mesure toujours 480×720 et 172800 octets. Recompilez et téléversez après la génération ; aucun système de fichiers n’est à téléverser.

## Dépannage

### Erreur de compilation undefined reference to EPD037A02_GFX

Symptôme : l’édition des liens ne trouve pas `begin()`, `display()` et d’autres fonctions.

Cause : `EPD037A02_GFX.cpp` n’est pas compilé. Arduino compile seulement les `.cpp` situés à la racine du croquis et dans le sous-dossier `src/`, pas ceux placés dans d’autres sous-dossiers comme `driver/`.

Solution : placez le `.ino` principal, le `.h` et le `.cpp` du pilote au même niveau, rouvrez l’exemple et recompilez.

### Aucune sortie sur le moniteur série

Symptôme : le téléversement se termine, mais le port série reste vide.

Cause : débit incorrect, USB CDC non activé avec le port USB intégré, ou moniteur ouvert après la fin des messages.

Solution : réglez le débit à 115200 et vérifiez le port. Avec le port USB intégré, définissez `USB CDC On Boot` sur `Enabled` dans Arduino IDE et téléversez de nouveau. Vous pouvez aussi utiliser le port UART selon la documentation de la carte. Appuyez enfin sur RESET pour relancer le programme.

### Messages série présents, mais écran entièrement blanc

Symptôme : le programme s’exécute, mais aucun motif n’apparaît.

Cause : SDA et CLK sont souvent inversés, CS ou DC est mal câblé, ou la masse n’est pas commune.

Solution : hors tension, vérifiez les 8 fils un par un. Mesurez VDD à 3,3 V et la continuité de GND. Le quatrième paramètre de `SPI.begin()` dans le pilote doit aussi être `-1` ; `_spiSend()` commande manuellement les niveaux bas et haut de CS.

### Expiration de BUSY pendant reset sur le port série

Symptôme : le journal s’arrête à l’attente du niveau haut de BUSY, signale une expiration de `reset`, puis affiche `Init failed`.

Cause : BUSY reste au niveau bas. L’écran n’est peut-être pas alimenté, le fil BUSY est mal connecté ou la nappe a un mauvais contact.

Solution : vérifiez VDD à 3,3 V, l’insertion complète de la nappe et la connexion de BUSY à GPIO7. Contrôlez ces points avant de modifier le code de rafraîchissement. Après correction, remettez sous tension et téléversez de nouveau.

### Expiration pendant DRF ou artefacts localisés

Symptôme : l’initialisation réussit, mais le rafraîchissement expire ou une partie de l’image est anormale.

Causes fréquentes : courant d’alimentation insuffisant, fils Dupont trop longs ou fréquence SPI trop élevée.

Solution : raccourcissez les fils, vérifiez le contact de la masse et utilisez un port USB ou une alimentation stable. Conservez la fréquence SPI par défaut de 2 MHz. Si vous avez modifié le paramètre d’`epd.begin()`, supprimez-le pour revenir à la valeur par défaut.

### Image tournée de 90° et répétée environ trois fois

Symptôme : le texte et les pastilles sont reconnaissables, mais mal orientés et répétés avec des décalages.

Cause : la trame est organisée par lignes alors que le panneau reçoit des colonnes verticales. Le pilote de cet article ne devrait pas produire ce défaut, qui survient surtout après une modification ou avec une ancienne version.

Solution : vérifiez que `drawPixel()` contient `size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);` et que `kColBytes = EPD037A02_HEIGHT / 2`, soit 360.

### Image non répétée, mais inversée verticalement

Symptôme : l’ordre des lettres est correct, mais toute l’image est retournée de haut en bas.

Cause : chaque colonne du panneau est balayée de bas en haut et le miroir Y manque dans le code.

Solution : vérifiez que `drawPixel()` contient `const int16_t fy = HEIGHT - 1 - dy;` et que les calculs suivants d’adresse et de quartet utilisent `fy`. Ne vous contentez pas d’inverser l’ordre des octets.

### Fines lignes décalées, traits en dents de peigne

Symptôme : la position générale est correcte, mais des pixels adjacents sont décalés de 1 à 2 px.

Cause : l’ordre des quartets haut et bas dans un octet est peut-être inversé.

Solution : passez `EPD037A02_SWAP_NIBBLE` de `0` à `1` dans `EPD037A02_GFX.h`. Ce réglage inverse seulement les deux pixels d’un octet, sans corriger un miroir de toute l’image.

### Erreur de compilation Photo must be 480x720 ou Photo must be 172800 bytes

Symptôme : l’un des deux `static_assert` se déclenche.

Cause : le nouveau `photo_data.h` ne fait pas 480×720 ou sa trame ne contient pas 172800 octets.

Solution : régénérez le fichier avec la commande de conversion ci-dessus en conservant `--header-name photo_driver`. Vérifiez ensuite que `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H` et `PHOTO_DRIVER_BYTES` valent respectivement 480, 720 et 172800.

## FAQ

**Peut-on utiliser d’autres broches pour l’EPD037A02 ?**

Oui. Modifiez à la fois le câblage et `EPD037A02_GFX epd(10, 9, 8, 7, 12, 11)` ; l’ordre des paramètres est CS, DC, RST, BUSY, SCK, MOSI. Sur ESP32-S3, évitez si possible GPIO0, 45 et 46 (liés au démarrage), GPIO19 et 20 (USB), ainsi que GPIO26 à 37 (occupés par Flash/PSRAM), en vous reportant au schéma de votre carte. Je n’ai compilé qu’avec le groupe GPIO7 à 12 et n’ai pas essayé les autres broches.

**Quelle est la fréquence SPI ? Peut-on passer à 8 MHz ?**

Cet exemple utilise par défaut 2 MHz, Mode 0, bit de poids fort en premier. Pour augmenter la fréquence, modifiez le paramètre d’`epd.begin()`, par exemple `epd.begin(4000000)`, en commençant de préférence à 4 MHz ; revenez à 2 MHz en cas de bruit ou d’artefacts. Je n’ai pas testé 8 MHz avec cet exemple à trois écrans.

**Peut-on alimenter en 5 V ? Quel est le courant pendant le rafraîchissement ?**

Non. VDD doit rester à 3,3 V et GND doit être commun avec la carte. La charge du circuit élévateur de tension augmente pendant le rafraîchissement : utilisez donc des fils Dupont courts et une alimentation stable. Je n’ai pas mesuré le courant de crête et ne donne pas d’estimation.

**Quelle est l’occupation de RAM et de Flash ? Le CPU est-il saturé ?**

Résultat de cette compilation : 525724 octets de Flash (40 %) et 23576 octets de variables globales (7 %). À l’exécution, le programme alloue en outre un tampon de trame de 172800 octets et utilise un tampon temporaire de 2048 octets pour envoyer la photo. Le rafraîchissement est bloquant : `loop()` ne peut rien faire d’autre pendant cette période, donc n’y programmez pas de tâche exigeant une temporisation stricte. Je n’ai pas mesuré l’utilisation du CPU.

**Peut-on utiliser GxEPD2 ou un ESP32 classique ?**

La version GxEPD2 1.6.9 que j’ai vérifiée ne contient pas de classe de pilote pour ce panneau six couleurs 480×720 JD7601 et ne peut donc pas être utilisée directement. Un ESP32 classique pourrait théoriquement fonctionner après adaptation du code SPI et PSRAM propre à la plateforme, à condition que sa RAM accueille le tampon de 172800 octets. Je n’ai pas testé d’autre contrôleur.

**Si l’écran n’affiche rien, quels fils vérifier en premier ?**

Mesurez d’abord VDD à 3,3 V, puis vérifiez GND, BUSY, CS, DC, SDA et CLK. Réglez le port série à 115200. En cas d’expiration de `reset` ou `DRF`, suivez la section correspondante ci-dessus. Sans aucune sortie série, vérifiez d’abord le port et le réglage USB CDC, sans modifier le format de trame.

**Peut-on afficher directement du chinois ou un JPG ?**

Non. L’interface utilise la police 5×7 intégrée à GFX et tout le texte de l’exemple est en anglais, sans jeu de caractères chinois. Un JPG ne peut pas non plus être envoyé directement : il faut le convertir en trame de 480×720 et 172800 octets. Le `photo_data.h` fourni est déjà converti ; consultez « Remplacer la photo » pour changer d’image.

**Pourquoi la lecture s’arrête-t-elle après une seule fois ? La photo reste-t-elle visible hors tension ?**

L’exemple est conçu pour une lecture unique : `loop()` est vide et la photo reste affichée en dernier. Le papier électronique conserve l’image hors tension. Appuyez sur RESET pour rejouer la séquence ; pour une lecture automatique en boucle, ajoutez votre propre logique de déclenchement. Je n’ai pas mesuré l’intervalle d’une lecture continue.

## Pour aller plus loin

- Remplacez l’emploi du temps codé en dur par une saisie sur le port série, puis connectez des données réelles après validation de la mise en page.
- Ajoutez un bouton pour basculer manuellement entre Hello, l’emploi du temps et la photo.
- Ajoutez une RTC pour mettre automatiquement à jour la date du titre et le « cours actuel ».
- Stockez plusieurs photos dans LittleFS ou sur une carte SD pour réaliser un cadre photo électronique commandé par boutons.

## Références

- [Code source de l’exemple (GitHub)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601) : fichiers complets de la démo à trois écrans et script de conversion des photos.

- [Page produit officielle Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3) : informations sur le contrôleur.

- [Fiche technique officielle Espressif ESP32-S3](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf) : GPIO, SPI et caractéristiques électriques.

- [Adafruit GFX Library GitHub](https://github.com/adafruit/Adafruit-GFX-Library) : interfaces de texte et de graphiques.

- [Adafruit BusIO GitHub](https://github.com/adafruit/Adafruit_BusIO) : bibliothèque requise par Adafruit GFX.

- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32) : cœur Arduino et prise en charge de SPI.

- [Documentation des polices Adafruit GFX](https://learn.adafruit.com/adafruit-gfx-graphics-library/using-fonts) : utilisation des polices intégrées et FreeFont.

- [Ressources et exemples open source du fabricant](https://gitee.com/osptek/display-epd-3.7inch-480x720) : fiche technique, schéma et exemples du fabricant.
