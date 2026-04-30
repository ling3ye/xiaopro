---
title: "Guide complet : piloter un module Micro SD avec l'ESP32-S3 (mode SPI + code Arduino)"
boardId: esp32s3
moduleId: storage/microsd-storage-board
category: esp32
date: 2026-04-30
intro: "Piloter un module Micro SD via SPI avec l'ESP32-S3 : lecture de fichiers, ecriture, suppression et plus encore. Cablage, code complet et guide anti-pieges inclus."
image: "https://img.lingflux.com/2026/04/a52d9db02d07cc13df512e06920e4603.jpg"
---

> **En une phrase** : lire et ecrire sur une Micro SD carte avec l'ESP32-S3 en SPI, du cablage a l'affichage des fichiers dans le moniteur serie en 30 minutes.

# Guide complet : piloter un module Micro SD avec l'ESP32-S3 (mode SPI + code Arduino)

> Difficulte : ⭐⭐☆☆☆ (accessible avec un minimum de bases) Temps estime : 30 minutes Environnement de test : Arduino IDE 2.3.x + ESP32 Arduino Core 3.x

------

> **TL;DR (version rapide) :**
>
> 1. Cablage : GPIO5 → CMD (MOSI), GPIO13 → D0 (MISO), GPIO14 → CLK, GPIO4 → D3 (CS)
> 2. Alimentation en **3.3V**, ne PAS brancher en 5V
> 3. Formater la SD carte en **FAT32** (surtout pour les cartes 32 Go)
> 4. Utiliser la bibliotheque integree `SD.h`, pas besoin d'installation supplementaire
> 5. Televerser le code, ouvrir le moniteur serie (115200), si vous voyez la liste des fichiers c'est gagne

------

## Introduction

Au milieu d'un projet ESP32, tu as peut-etre deja eu ce probleme :

> Tu veux lire un fichier audio, stocker plein de donnees de capteurs, ou afficher des images...
> Et tu te rends compte que la Flash integree de l'ESP32 est loin d'etre suffisante.

La solution la plus simple, c'est d'ajouter une carte SD. Le stockage passe de quelques Mo a plusieurs dizaines de Go, et la vitesse de lecture/ecriture est largement suffisante. Ce guide te montre comment faire fonctionner **l'ESP32-S3 + un module Micro SD** depuis zero, en mode SPI, pour lire la liste des fichiers d'une carte SD de 32 Go.

Cablage, televersement, et en 30 minutes tu devrais voir les noms de tes fichiers dans le moniteur serie.

------

## Demonstration

![](https://img.lingflux.com/2026/04/36943c66a6d84fb669a840b29677f2f5.jpg)

La sortie serie ressemble a ca :

```
=== ESP32-S3 SD SPI Test ===
MOSI=5, MISO=13, SCK=14, CS=4
SD card mounted successfully.
SD Card Type: SDHC
SD Card Size: 30436MB
Total space: 30436MB
Used space : 512MB
Listing directory: /
  DIR : music
  FILE: readme.txt  SIZE: 128
  FILE: config.json  SIZE: 256
```


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/EOdWUtUBBMA?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


------

## Presentation du module

![](https://img.lingflux.com/2026/04/6737983c1e0d23072c47461024204cb9.jpg)

Le module SD carte, c'est comme ajouter un "lecteur de carte" a l'ESP32. L'ESP32 n'a pas de slot SD integre, ce petit module fait l'intermediaire : il traduit les signaux SPI de l'ESP32 en un protocole comprehensible par la carte SD, transformant ta carte en un espace de stockage externe lisible et inscriptible a volonte.

| Parametre                  | Specification                                                      |
| -------------------------- | ------------------------------------------------------------------ |
| Protocole d'interface      | Mode SPI / Mode SDIO (ce guide utilise SPI)                        |
| Types de cartes supportees | Micro SD (SDSC / SDHC, jusqu'a 32 Go)                              |
| Tension de fonctionnement  | 3.3V (**ne PAS brancher en 5V, risque de griller le module ou la carte**) |
| Nombre de broches          | CMD / CLK / D0 / D1 / D2 / D3 / 3.3V / GND                        |
| Broches utilisees en SPI   | CMD (MOSI) / D0 (MISO) / CLK / D3 (CS)                             |

Pourquoi choisir ce module : compact, peu de fils (4 lignes de signal en SPI), c'est la solution la plus courante pour etendre le stockage d'un ESP32. En plus, il y a plein de ressources en ligne, donc tu trouveras facilement de l'aide si tu bloques.

------

## BOM

| Composant                      | Quantite | Remarque                                       |
| ------------------------------ | -------- | ---------------------------------------------- |
| Carte de developpement ESP32-S3 | 1       | N'importe quelle carte S3 avec GPIO convient   |
| Module Micro SD                | 1        | Support du mode SPI (indique au dos)           |
| Carte Micro SD                 | 1        | 32 Go maximum recommande, formatee en FAT32    |
| Cables Dupont (femelle)        | Quelques | Mâle-femelle, les plus courts possible          |

------

## Cablage complet

| Broche ESP32-S3 | Broche module SD | Description                                                |
| --------------- | ---------------- | ---------------------------------------------------------- |
| 3.3V            | 3.3V             | **Uniquement 3.3V, ne PAS brancher en 5V**                |
| GND             | GND              | Masse commune, obligatoire                                 |
| GPIO13          | D0               | SPI MISO : la carte SD envoie les donnees a l'ESP32        |
| GPIO5           | CMD              | SPI MOSI : l'ESP32 envoie les donnees a la carte SD        |
| GPIO14          | CLK              | Horloge SPI, l'ESP32 est le maitre                        |
| GPIO4           | D3               | SPI Chip Select (CS), la carte SD est selectionnee a l'etat bas |
| Non connecte    | D1 / D2 / CD     | Inutilises en mode SPI, laisser vide                       |

> ⚠️ Apres avoir branche, verifie chaque fil un par un avec le tableau ci-dessus, ca t'epargnera 80 % du temps de debogage.
> Aussi, evite les cables Dupont trop longs (30 cm max c'est l'ideal), plus le fil est long plus le signal est instable, et les cartes 32 Go sont plus sensibles au timing.

------

## Bibliotheques necessaires

Pas besoin d'installer quoi que ce soit !

Les bibliotheques `SPI.h` et `SD.h` utilisees ici sont deja integrees dans **ESP32 Arduino Core**. Tant que tu as installe le support des cartes ESP32 dans l'Arduino IDE, tu peux compiler directement.

Si ce n'est pas encore fait, va dans Arduino IDE → Outils → Gestionnaire de cartes, cherche `esp32`, et installe le paquet de **Espressif Systems** (version testee pour ce guide : **ESP32 Arduino Core 3.0.x**).

------

## Code complet

```cpp
#include <SPI.h>
#include <SD.h>

// Etape 1 : definir les broches SPI
static const int SD_MOSI = 5;   // correspond a CMD sur le module SD
static const int SD_MISO = 13;  // correspond a D0 sur le module SD
static const int SD_SCK  = 14;  // correspond a CLK sur le module SD
static const int SD_CS   = 4;   // correspond a D3 sur le module SD (chip select)

SPIClass spi = SPIClass(FSPI);  // Utiliser le bus FSPI sur l'ESP32-S3

// Lister recursivement tous les fichiers et sous-dossiers d'un repertoire
void listDir(fs::FS &fs, const char * dirname, uint8_t levels) {
  Serial.printf("Listage du repertoire : %s\n", dirname);

  File root = fs.open(dirname);
  if (!root) {
    Serial.println("Impossible d'ouvrir le repertoire, verifier le cablage ou le format de la carte SD");
    return;
  }
  if (!root.isDirectory()) {
    Serial.println("Ce n'est pas un repertoire");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      Serial.print("  [Dossier] ");
      Serial.println(file.name());
      if (levels) {
        listDir(fs, file.path(), levels - 1);  // recursion dans le sous-dossier
      }
    } else {
      Serial.print("  [Fichier] ");
      Serial.print(file.name());
      Serial.print("    Taille : ");
      Serial.print(file.size());
      Serial.println(" bytes");
    }
    file = root.openNextFile();
  }
}

// Afficher les informations de base de la carte SD
void printCardInfo() {
  uint8_t cardType = SD.cardType();

  if (cardType == CARD_NONE) {
    Serial.println("Aucune carte SD detectee, verifier le cablage et l'alimentation");
    return;
  }

  Serial.print("Type de carte SD : ");
  if      (cardType == CARD_MMC)  Serial.println("MMC");
  else if (cardType == CARD_SD)   Serial.println("SDSC");
  else if (cardType == CARD_SDHC) Serial.println("SDHC (haute capacite standard)");
  else                            Serial.println("Type inconnu");

  uint64_t cardSize   = SD.cardSize()   / (1024 * 1024);
  uint64_t totalBytes = SD.totalBytes() / (1024 * 1024);
  uint64_t usedBytes  = SD.usedBytes()  / (1024 * 1024);

  Serial.printf("Capacite de la carte SD : %llu MB\n", cardSize);
  Serial.printf("Espace total : %llu MB\n",  totalBytes);
  Serial.printf("Espace utilise : %llu MB\n",  usedBytes);
}

void setup() {
  Serial.begin(115200);
  delay(1500);  // attendre la stabilisation du port serie

  Serial.println();
  Serial.println("=== ESP32-S3 SD SPI Test ===");
  Serial.printf("MOSI=%d, MISO=%d, SCK=%d, CS=%d\n",
                SD_MOSI, SD_MISO, SD_SCK, SD_CS);

  // Etape 2 : initialiser le bus SPI, specifier l'ordre des broches : SCK, MISO, MOSI, CS
  spi.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // Etape 3 : mettre CS a l'etat haut pour eviter une selection accidentelle de la carte SD pendant l'initialisation
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  // Etape 4 : monter la carte SD, horloge initiale 10 MHz (reduire a 4 MHz si instable)
  if (!SD.begin(SD_CS, spi, 10000000)) {
    Serial.println("Echec du montage de la carte SD ! Verifier dans cet ordre :");
    Serial.println("1. Cablage GPIO5->CMD / GPIO13->D0 / GPIO14->CLK / GPIO4->D3");
    Serial.println("2. Alimentation confirmee en 3.3V, pas 5V");
    Serial.println("3. Carte SD formatee en FAT32");
    Serial.println("4. Remplacer 10000000 par 4000000 pour reduire la frequence SPI et reessayer");
    return;
  }

  Serial.println("Carte SD montee avec succes !");
  printCardInfo();

  // Etape 5 : lister la structure de fichiers sur 5 niveaux depuis la racine
  listDir(SD, "/", 5);
}

void loop() {
  // La lecture des fichiers n'est faite qu'une seule fois dans setup(), loop() reste vide pour le moment
  // Pour un sondage regulier, ajouter delay + listDir ici
}
```



### Exemples d'operations sur les fichiers

Une fois le programme principal fonctionne, lister les fichiers ne suffit pas. Les fonctions suivantes s'ajoutent **sans modifier le programme principal** : colle-les a cote de la fonction `listDir()`, puis appelle-les a la fin de `setup()` selon tes besoins. Elles couvrent **lecture / ecriture / ajout / creation / suppression / renommage**.

#### Ecrire un fichier — ecrasement et ajout

Le mode `FILE_WRITE` efface le contenu existant avant d'ecrire, le mode `FILE_APPEND` ajoute a la fin du fichier. Pour les logs ou la collecte de donnees de capteurs, on utilise presque toujours le **mode ajout**.

```
// === Ecrire un fichier (ecrasement) ===
// Si le fichier n'existe pas il est cree, s'il existe le contenu est efface avant ecriture
void writeFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("Ecriture du fichier : %s\n", path);

  File file = fs.open(path, FILE_WRITE);  // mode FILE_WRITE : ecrasement
  if (!file) {
    Serial.println("Impossible d'ouvrir le fichier (mode ecriture)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ Ecriture reussie");
  } else {
    Serial.println("❌ Echec de l'ecriture");
  }
  file.close();  // Toujours fermer, sinon les donnees peuvent ne pas etre ecrites sur la carte
}

// === Ajout (sans ecraser le contenu existant) ===
// Ideal pour les logs : ajoute une ligne a la fin du fichier a chaque appel
void appendFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("Ajout au fichier : %s\n", path);

  File file = fs.open(path, FILE_APPEND);  // mode FILE_APPEND : ajout
  if (!file) {
    Serial.println("Impossible d'ouvrir le fichier (mode ajout)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ Ajout reussi");
  } else {
    Serial.println("❌ Echec de l'ajout");
  }
  file.close();
}

// Exemples d'appel (a placer dans setup() apres listDir) :
// writeFile(SD, "/hello.txt", "Hello ESP32-S3 SD!\n");
// appendFile(SD, "/hello.txt", "Ceci est la deuxieme ligne ajoutee\n");
```

💡 **Astuce performance** : chaque `file.close()` declenche une ecriture physique sur la carte SD, ouvrir et fermer frequemment ralentit tout. Pour les logs a haute frequence, garde l'instance `File` ouverte et **appelle `file.flush()` toutes les N lignes** pour vider le tampon sur la carte.

#### Lire un fichier — lecture complete et lecture ligne par ligne

`readFile()` est adapte aux petits fichiers a lire en une fois ; `readFileByLine()` convient pour les fichiers structures comme les CSV ou les fichiers de configuration.

```
// === Lire un fichier (lecture complete, octet par octet) ===
void readFile(fs::FS &fs, const char * path) {
  Serial.printf("Lecture du fichier : %s\n", path);

  File file = fs.open(path);  // le mode par defaut est FILE_READ
  if (!file) {
    Serial.println("Impossible d'ouvrir le fichier, il n'existe peut-etre pas");
    return;
  }

  Serial.print("Contenu du fichier : ");
  while (file.available()) {
    Serial.write(file.read());  // lecture octet par octet et affichage
  }
  Serial.println();
  file.close();
}

// === Lecture ligne par ligne (ideal pour fichiers de config, donnees CSV) ===
void readFileByLine(fs::FS &fs, const char * path) {
  Serial.printf("Lecture ligne par ligne : %s\n", path);

  File file = fs.open(path);
  if (!file) {
    Serial.println("Impossible d'ouvrir le fichier");
    return;
  }

  int lineNum = 1;
  while (file.available()) {
    String line = file.readStringUntil('\n');  // lire jusqu'au saut de ligne
    Serial.printf("Ligne %d : %s\n", lineNum++, line.c_str());
  }
  file.close();
}

// Exemples d'appel :
// readFile(SD, "/hello.txt");
// readFileByLine(SD, "/config.txt");
```

ℹ️ **Note** : `file.available()` renvoie le nombre d'octets restants ; `file.readStringUntil('\n')` lit tout jusqu'au saut de ligne dans un `String`. Pour les gros fichiers, evite `String` (risque de saturation memoire), prefere un `char buf[128]` fixe avec `file.readBytesUntil()`.

#### Creer / Supprimer / Renommer

Couvre la creation de dossiers, la creation de fichiers vides, la suppression de fichiers et de dossiers, ainsi que le renommage (qui peut aussi servir de "deplacement").

```
// === Creer un dossier ===
void createDir(fs::FS &fs, const char * path) {
  Serial.printf("Creation du dossier : %s\n", path);
  if (fs.mkdir(path)) {
    Serial.println("✅ Dossier cree avec succes");
  } else {
    Serial.println("❌ Echec de la creation (existe deja ou dossier parent manquant)");
  }
}

// === Creer un fichier vide ===
// Ouvrir en FILE_WRITE puis fermer cree un fichier vide
void createEmptyFile(fs::FS &fs, const char * path) {
  Serial.printf("Creation d'un fichier vide : %s\n", path);
  File file = fs.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("❌ Echec de la creation");
    return;
  }
  file.close();
  Serial.println("✅ Fichier vide cree avec succes");
}

// === Supprimer un fichier ===
void deleteFile(fs::FS &fs, const char * path) {
  Serial.printf("Suppression du fichier : %s\n", path);
  if (fs.remove(path)) {
    Serial.println("✅ Suppression reussie");
  } else {
    Serial.println("❌ Echec de la suppression (fichier introuvable ou probleme de droits)");
  }
}

// === Supprimer un dossier (doit etre vide) ===
void removeDir(fs::FS &fs, const char * path) {
  Serial.printf("Suppression du dossier : %s\n", path);
  if (fs.rmdir(path)) {
    Serial.println("✅ Dossier supprime avec succes");
  } else {
    Serial.println("❌ Echec de la suppression (dossier non vide ou inexistant)");
  }
}

// === Renommer / Deplacer un fichier ===
void renameFile(fs::FS &fs, const char * oldPath, const char * newPath) {
  Serial.printf("Renommage : %s → %s\n", oldPath, newPath);
  if (fs.rename(oldPath, newPath)) {
    Serial.println("✅ Renommage reussi");
  } else {
    Serial.println("❌ Echec du renommage");
  }
}

// Exemples d'appel (executer dans l'ordre pour voir le flux complet) :
// createDir(SD, "/logs");
// createEmptyFile(SD, "/logs/empty.txt");
// renameFile(SD, "/logs/empty.txt", "/logs/data.txt");
// deleteFile(SD, "/logs/data.txt");
// removeDir(SD, "/logs");
```

⚠️ **Attention** : `SD.rmdir()` **ne peut supprimer qu'un dossier vide**. Pour une suppression recursive d'un dossier complet, il faut d'abord parcourir et supprimer tous les fichiers, puis le dossier lui-meme. La bibliotheque `SD.h` n'a pas de fonction `rm -rf` integree, il faut ecrire sa propre fonction recursive.

------

### Explications du code

**Pourquoi CMD correspond a MOSI ?**
En mode SPI, les donnees envoyees par l'ESP32 a la carte passent par la broche CMD, donc CMD = MOSI. C'est une regle du protocole SD en mode SPI, pas une erreur de cablage.

**Pourquoi D0 correspond a MISO ?**
En mode SPI, la carte SD renvoie les donnees au maitre via la broche D0, donc D0 = MISO.

**Pourquoi D3 correspond a CS ?**
Quand la carte SD passe en mode SPI, D0 assume la fonction de Chip Select, activee a l'etat bas.

**Pourquoi D1 et D2 ne sont pas connectees ?**
Elles sont reservees au mode SDIO 4 bits, inutiles en SPI, on peut les laisser deconnectees.

**Que signifie `SPIClass spi = SPIClass(FSPI)` ?**
L'ESP32-S3 possede plusieurs bus SPI (FSPI / HSPI), ici on specifie manuellement FSPI pour eviter les conflits avec d'autres peripheriques.

------

## Resolution des problemes courants

Pas de panique, 90 % des echecs d'initialisation viennent de ces quelques points, verifie-les dans l'ordre et ca devrait se resoudre :

**1. Le moniteur serie affiche "Echec du montage de la carte SD" et ne bouge plus ?**
Verifie le cablage : GPIO5→CMD, GPIO13→D0, GPIO14→CLK, GPIO4→D3. Un seul fil branche au mauvais endroit et ca ne marchera pas.

**2. Le cablage est bon, mais ca marche toujours pas ?**
Reduis la frequence SPI de 10 MHz a 4 MHz, modifie cette ligne :

```cpp
if (!SD.begin(SD_CS, spi, 4000000)) {
```

Les cartes 32 Go sont plus sensibles au timing, une frequence plus basse passe mieux. Tu pourras l'augmenter ensuite une fois que ca fonctionne.

**3. Aucune sortie dans le moniteur serie ?**
Verifie que le debit en bauds est bien 115200, et que ton cable USB transmet les donnees (un cable de charge seule ne fonctionnera pas).

**4. Le montage echoue de maniere aleatoire, tantot ca marche tantot non ?**
Probleme d'alimentation. Des fils trop longs ou des contacts defaillants provoquent des fluctuations de tension pendant l'initialisation de la carte SD. Essaye avec des cables Dupont plus courts et de meilleure qualite.

**5. La carte 32 Go ne se monte pas, mais une 8 Go fonctionne ?**
Les cartes 32 Go sont generalement au format SDHC et doivent etre formatees en FAT32 (Windows formate par defaut les 32 Go en exFAT, et la bibliotheque `SD.h` de l'ESP32 ne supporte pas exFAT). Utilise [SD Card Formatter](https://www.sdcard.org/downloads/formatter/) pour formater.

**6. Le montage reussit mais listDir n'affiche aucun fichier ?**
La carte SD est peut-etre vide, ou les fichiers a la racine sont dans des dossiers caches. Copie un fichier .txt sur la carte et reteste.

------

## FAQ

**Q : Mon module SD carte s'alimente en 5V, est-ce compatible avec l'ESP32-S3 ?**
R : Non recommande. Les GPIO de l'ESP32-S3 fonctionnent en logique 3.3V. Si le module n'a pas de conversion de niveau, brancher les lignes de signal directement sur un module 5V risque d'endommager les broches. Verifie que le module supporte le 3.3V, ou achete un module avec puce de conversion de niveau.

**Q : Quelle frequence SPI utiliser ?**
R : Commence a 4000000 (4 MHz), et si ca fonctionne teste 10000000 (10 MHz). En theorie, le mode SPI des cartes SD supporte jusqu'a 25 MHz, mais en pratique la longueur des cables Dupont et la qualite du module limitent la frequence atteignable.

**Q : Quels GPIO de l'ESP32-S3 peuvent remplacer ceux utilises pour la carte SD ?**
R : Le FSPI de l'ESP32-S3 supporte les broches personnalisables, en theorie la plupart des GPIO fonctionnent. Mais evite GPIO0 (broche de mode Boot), GPIO45/GPIO46 (fonctions fixes). Apres avoir change les broches, n'oublie pas de mettre a jour les constantes `SD_MOSI / SD_MISO / SD_SCK / SD_CS` dans le code.

**Q : Une carte SD de 32 Go doit-elle absolument etre formatee en FAT32 ? Pas exFAT ?**
R : La bibliotheque Arduino `SD.h` ne supporte que FAT16 et FAT32, pas exFAT. Pour les cartes de 32 Go et moins, le formatage en FAT32 ne pose aucun probleme. Recommandation : utilise l'outil SD Card Formatter, pas le formatage integre de Windows (qui met exFAT par defaut pour les 32 Go).

**Q : Quelle est la vitesse de lecture/ecriture approximative de la carte SD ?**
R : En mode SPI, le debit reel se situe entre 500 Ko/s et 2 Mo/s environ, selon la frequence d'horloge SPI et la classe de vitesse de la carte. Pour des debits plus eleves, envisage le mode SDIO 4 bits (cablage different, hors du cadre de ce guide).

**Q : Peut-on monter plusieurs cartes SD simultanement ?**
R : Oui. Le bus SPI supporte plusieurs peripheriques, chaque carte utilise un CS different et peut etre initialisee separement. Cependant, `SD.h` ne gere qu'une seule instance ; pour plusieurs cartes, il faut utiliser `SD_MMC.h` ou une bibliotheque tierce comme SdFat.

**Q : L'ESP32-S3 utilise-t-il beaucoup de CPU pour ce code ?**
R : Non. Le listage des fichiers est une operation I/O ponctuelle, `setup()` s'execute une seule fois et `loop()` est vide, le CPU est quasiment inutilise. Ce n'est que si tu lis/e cris continuellement dans `loop()` qu'il faudra se soucier des performances.

------

## Pour aller plus loin

Une fois que la lecture de base fonctionne, voici quelques pistes pour continuer :

- **Lire des MP3 depuis la carte SD** : avec la bibliotheque ESP32-audioI2S, un DAC I2S, et des fichiers audio sur la carte SD, tu peux lire de la musique sans dependre du reseau
- **Collecte et stockage de donnees** : ecrire les donnees des capteurs dans un CSV avec un horodatage, resistant a la coupure de courant, facile a analyser ensuite avec Python
- **Ecran TFT** : lire des images (BMP / JPG) depuis la carte SD et les afficher sur un ecran, pour faire un cadre photo numerique
- **Fichier de configuration** : mettre les identifiants Wi-Fi dans un `config.json` sur la carte SD, plus besoin de modifier et televerser le code a chaque changement

------

## References

- [Fiche technique ESP32-S3 Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [SD Specifications Part 1: Physical Layer Simplified Specification (document officiel SD Association)](https://www.sdcard.org/downloads/pls/)
- [GitHub officiel ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
- [Telechargement SD Card Formatter (outil officiel de formatage)](https://www.sdcard.org/downloads/formatter/)
- [Documentation de la bibliotheque Arduino SD](https://www.arduino.cc/reference/en/libraries/sd/)
