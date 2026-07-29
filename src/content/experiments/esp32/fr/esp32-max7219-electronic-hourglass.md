---
title: "Sablier électronique avec ESP32 et MAX7219｜Câblage SPI + code source du moteur physique à rotation 45°"
boardId: esp32
moduleId: lighting/max7219-dot-matrix
category: esp32
date: 2026-07-29
intro: "Avec une carte ESP32 et deux modules MAX7219 8×8, reproduis pas à pas le sablier électronique vu sur les réseaux. Explication du principe du moteur physique à rotation 45°, du câblage SPI en guirlande (daisy-chain) et du code source complet en Arduino C++, avec un guide de dépannage. Pour les makers qui savent déjà téléverser un programme."
image: "https://img.lingflux.com/2026/07/47600d4280d7a2274f9f47a726329beb.jpg"
---

> **TL;DR (démarrage rapide) :**
>
> 1. Câblage : ESP32 `GPIO23→DIN`, `GPIO18→CLK`, `GPIO5→CS`, les deux MAX7219 en cascade guirlande via `DOUT→DIN`
> 2. Alimentation : `5V→VCC`, `GND→GND` (ne pas inverser la polarité, sinon ça fume, tu es prévenu)
> 3. Bibliothèque : recherche `MD_MAX72xx` dans le gestionnaire de bibliothèques Arduino et installe-la ; `SPI.h` est intégrée nativement, rien à installer en plus
> 4. Après le téléversement, la matrice se met à « écouler le sable » toute seule, aucun bouton ni capteur à brancher

---

Difficulté : ⭐⭐⭐☆☆ (accessible si tu as déjà téléversé du code avec l'Arduino IDE)
Temps estimé : 40 minutes (câblage 15 min + téléversement et débogage 25 min)
Environnement de test : Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + MD_MAX72xx v3.5.1

---

## Préambule

Tu as sûrement vu passer sur le web ces sabliers électroniques où les grains tombent un par un et qui, quand on les incline, forment naturellement des petits tas en pente douce — ça donne envie d'en fabriquer un, non ? Ma première réaction a été, comme toi sans doute : « il va falloir un gyroscope et une tripotée de formules de physiques ». Mais une fois lancé, j'ai compris que la vraie difficulté n'est pas matérielle : elle consiste à faire croire au code que deux matrices bien carrées ont été pivotées de 45° et assemblées pour former la silhouette d'un sablier. Cet article rassemble les pièges que j'ai traversés et la logique physique que j'ai fini par démêler. Suis le guide, et toi aussi tu poseras sur ton bureau un bibelot qui « s'écoule », avec simplement une ESP32 et deux MAX7219.

## Résultat de l'expérience

À la mise sous tension, la matrice entre automatiquement dans une boucle : d'abord le sable s'écoule à la verticale, de façon stable, puis elle simule une inclinaison à gauche puis à droite, les grains formant naturellement des angles de tas, et enfin l'ensemble se « retourne » une fois pour recommencer à l'envers. Aucun bouton à presser ; mon expérimentation actuelle n'utilise pas de gyroscope, le retournement est piloté par des données d'angle écrites en dur. Le code embarque une machine à états de « pseudo-gyroscope » qui enchaîne les postures automatiquement.

---

## Présentation des composants

> La carte de développement (ESP32) est déjà bien connue, je n'insiste pas ; l'essentiel ici porte sur le MAX7219.

### MAX7219 — le « traducteur » des matrices LED

Le MAX7219 est un circuit intégré de pilotage de LED qui commande une matrice complète de 8×8 = 64 LED avec très peu de broches. Dans ce projet, son rôle est de « traduire » les quelques GPIO de l'ESP32 en une véritable toile où l'on peut dessiner — sinon, il faudrait tirer 64 fils pour allumer chaque LED une à une, rien que d'y penser, ça fait trembler les mains.

Vois-le comme un « traducteur » : l'ESP32 n'envoie que de simples commandes SPI (telle ligne, tels points à allumer), et le MAX7219 se charge d'effectuer un scan qui répartit le courant vers les LED concernées, suffisamment vite pour que l'œil ne perçoive aucun clignotement.

| Paramètre | Valeur |
| --- | --- |
| Mode de pilotage | SPI (3 fils : DIN/CLK/CS) |
| Nombre de LED par puce | 64 (8×8) |
| Tension de fonctionnement | 4.0V ~ 5.5V |
| Mise en cascade | DOUT relié au DIN de la puce suivante, guirlande (daisy-chain) possible |
| Réglage de la luminosité | 16 niveaux (le code présent utilise le niveau 5) |

On le choisit parce qu'il est bon marché, très répandu, avec une bibliothèque éprouvée, et que deux modules assemblés forment — après une « rotation physique de 45° » — la silhouette en losange du sablier. Rapport qualité/prix imbattable.

### Brochage

Le brochage typique d'un module MAX7219 est le suivant (la sérigraphie varie selon les fabricants ; se référer au marquage au dos du module) :

| Broche | Rôle |
| --- | --- |
| VCC / GND | Alimentation positive / négative |
| DIN | Entrée de données (reliée au DOUT de l'étage précédent ou au microcontrôleur) |
| DOUT | Sortie de données (reliée au DIN de l'étage suivant pour la mise en cascade) |
| CS | Signal de sélection de puce (Chip Select) |
| CLK | Signal d'horloge |

## Liste de composants (BOM)

| Composant | Quantité | Remarques |
| --- | --- | --- |
| Carte de développement ESP32 | 1 | Tout modèle convient, du moment qu'elle a des GPIO disponibles |
| Module matrice de LED MAX7219 8×8 | 2 | Même lot et même référence conseillés, pour une couleur/luminosité homogène |
| Fils de raccordement (Dupont) | Quelques-uns | Femelle-Femelle conseillés pour des liaisons entre modules plus propres |

## Câblage

Les tableaux de texte se suivent mal ; commence par parcourir le schéma ci-dessus pour te faire une idée, puis vérifie fil par fil à l'aide du tableau.

| ESP32 | Module 1 (MAX7219 #1) | Module 2 (MAX7219 #2) |
| --- | --- | --- |
| 5V | VCC (IN) → VCC (OUT) | ← VCC (IN) |
| GND | GND (IN) → GND (OUT) | ← GND (IN) |
| GPIO23 | DIN → DOUT | → DIN |
| GPIO5 | CS (IN) → CS (OUT) | → CS (IN) |
| GPIO18 | CLK (IN) → CLK (OUT) | → CLK (IN) |

**Vérifie chaque fil après câblage, ça économise 80 % du temps de débogage** — en particulier ne pas inverser VCC/GND, et ne pas se tromper sur le sens IN/OUT des modules : ce sont les deux points qui ramènent le plus souvent à re câbler.

## Bibliothèques à installer

Dans l'Arduino IDE → Gestionnaire de bibliothèques, recherche et installe :

- `MD_MAX72xx` (auteur MajicDesigns, dernière version stable v3.5.1) — la bibliothèque cœur pour piloter la matrice MAX7219
- `SPI.h` — intégrée à l'Arduino IDE, aucune installation séparée nécessaire

Petit rappel : la bibliothèque `MD_MAX72xx` embarque un exemple officiel Hourglass (sablier). Si le code de cet article ne donne pas un bon rendu, compare avec l'exemple de la bibliothèque pour vérifier si `HARDWARE_TYPE` ne correspond pas à la mauvaise variante de module.

## Code complet + explications

```cpp
/*
  ================================================================
   Sablier électronique ESP32 double 8x8 MAX7219 (version assemblée par rotation 45°)
  ================================================================

  Disposition matérielle :
  ------------------------------------------------------------
   Deux matrices MAX7219 8x8 standard, reliées en guirlande DIN→DOUT :
      [ESP32] --DIN--> [Module 1 (entonnoir supérieur)] --DOUT--> [Module 2 (entonnoir inférieur)]

   L'adressage natif de MD_MAX72XX est « ligne 0~7, colonne 0~(8*nb_modules-1) »,
   donc 2 modules donnent naturellement un espace d'adressage de 8 lignes x 16 colonnes :
      Module 1 occupe les colonnes 0~7   (après rotation 45° : « entonnoir supérieur », pointe en ligne7,colonne7)
      Module 2 occupe les colonnes 8~15  (après rotation 45° : « entonnoir inférieur », pointe en ligne0,colonne8)

   Les deux modules sont physiquement pivotés de 45° et assemblés verticalement ; seules les cases
   (ligne7,colonne7) et (ligne0,colonne8) se trouvent réellement côte à côte — c'est le « col »
   du sablier, le seul passage autorisé pour qu'un grain traverse d'un module à l'autre.
   En dehors de cela, il n'existe aucune contiguïté physique entre la colonne 7 et la colonne 8
   (les deux losanges ne se touchent que par un seul sommet) ; le code doit donc explicitement
   interdire tout « téléportement » entre colonnes autres que par le col.

   Intuition physique pour la direction de la gravité :
   ------------------------------------------------------------
   Comme le module entier est physiquement pivoté de 45°, ses directions « ligne » et « colonne »
   ne sont plus verticales : elles pointent respectivement vers le bas-gauche 45° et le bas-droite 45°
   du « monde réel ». Par conséquent :
      - Les deux composantes +1 simultanément (ligne+1 ET colonne+1) -> correspond au « bas » réel
      - Seulement ligne +1 (colonne inchangée) -> correspond au « bas-gauche » réel (talus naturel du tas)
      - Seulement colonne +1 (ligne inchangée) -> correspond au « bas-droite » réel (talus naturel du tas)
   C'est l'origine du « vecteur gravité » et de la « composante de glissement latéral » dans ce code.
   Lorsqu'on retourne le sablier (gravityDir passe de +1 à -1), les deux composantes changent de
   signe en même temps et la signification physique reste cohérente.

   Anti-fantôme / anti-chute trop rapide en une seule frame :
   ------------------------------------------------------------
   Chaque frame balaie les cases à contre-courant, dans l'ordre « aval gravité -> amont gravité »
   (pour gravityDir=+1 on parcourt de ligne7,colonne15 vers ligne0,colonne0 ; inverse après
   retournement), afin de garantir que :
      1) Chaque grain se déplace d'au plus une case par frame, sans « téléportation » due à des
         vérifications en chaîne.
      2) La disponibilité d'une case cible est toujours jugée sur l'état final déjà déterminé pour
         cette frame ; impossible que deux grains se disputent la même cible dans la même frame
         (ce qui provoquerait fantômes ou pertes de grains).

   Broches (conserve les affectations validées) :
      DATA_PIN 23 (MOSI)   CLK_PIN 18 (SCK)   CS_PIN 5 (CS)

   Gyroscope :
   ------------------------------------------------------------
   Pas encore de vrai gyroscope ; le code embarque une machine à états « pseudo-gyroscope »
   (fakeGyroX / fakeGyroZ) qui produit en boucle selon le temps :
      écoulement stable à la verticale -> inclinaison d'un côté -> remise d'aplomb ->
      retournement complet inversé -> (le tout à l'envers)
   Plus tard, en branchant un vrai capteur type MPU6050, il suffira de connecter readRealGyro()
   et de remplacer fakeGyroX/fakeGyroZ par les angles réels ; le reste du moteur physique est
   inchangé.
   ================================================================
*/

#include <MD_MAX72xx.h>
#include <SPI.h>

// ---------------- Configuration matérielle ----------------
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES   2          // Seulement 2 modules 8x8

#define DATA_PIN  23  // VSPI MOSI
#define CLK_PIN   18  // VSPI SCK
#define CS_PIN    5   // VSPI CS0

MD_MAX72XX mx = MD_MAX72XX(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

// ---------------- Correction de l'orientation d'affichage ----------------
// Si à l'allumage tu constates un « renversement haut/bas » ou que « les deux modules
// sont inversés gauche/droite », modifie uniquement ces deux macros, sans toucher à
// l'algorithme physique ci-dessous.
#define FLIP_ROW           true   // Faut-il retourner la direction ligne (7-row)
#define SWAP_MODULE_ORDER  false  // Si le module 2 est inséré avant le module 1 dans la guirlande, mettre true

// ---------------- Grille logique ----------------
#define ROWS 8
#define COLS 16
// Col : sortie module 1 (7,7) <-> entrée module 2 (0,8)
#define NECK_A_R 7
#define NECK_A_C 7
#define NECK_B_R 0
#define NECK_B_C 8

bool sand[ROWS][COLS];

// ---------------- Paramètres du moteur physique ----------------
#define SAND_TOTAL        42     // Nombre total de grains, ajustable selon l'effet visuel (conseillé : 30~50)
#define TICK_MS           130    // Pas de calcul physique (ms), plus petit = flux plus rapide.
                                  // Vers ~130ms, l'œil distingue clairement les grains tomber case par case,
                                  // et les grains qui chutent au col sont naturellement séparés par une case
                                  // vide (on voit simultanément 2~3 points tomber par à-coups). Si c'est
                                  // encore trop rapide, augmente encore (plage conseillée : 100~180).
const float LATERAL_FRICTION = 0.85f;  // « Frottement » du glissement latéral : pas de glissement à chaque frame, pour un effet de pause naturel

int   gravityDir  = 1;     // +1 = à l'endroit (module1->module2)   -1 = inversé (module2->module1)
float targetBias  = 0.0f;  // Biais d'inclinaison cible [-1,1]
float currentBias = 0.0f;  // Biais d'inclinaison courant lissé (poursuit lentement targetBias, sans à-coup)

unsigned long lastTickMs = 0;

// ================================================================
//                        Moteur physique des grains
// ================================================================

inline int moduleOf(int c) { return (c < 8) ? 1 : 2; }

// Est-ce un franchissement de col autorisé (la seule paire de cases autorisée
// entre modules, dans les deux sens)
inline bool isNeckPair(int r, int c, int nr, int nc) {
  if (r == NECK_A_R && c == NECK_A_C && nr == NECK_B_R && nc == NECK_B_C) return true;
  if (r == NECK_B_R && c == NECK_B_C && nr == NECK_A_R && nc == NECK_A_C) return true;
  return false;
}

inline bool canMove(int r, int c, int nr, int nc) {
  if (nr < 0 || nr > 7 || nc < 0 || nc > 15) return false;   // Hors limite
  if (sand[nr][nc]) return false;                             // Cible déjà occupée
  if (moduleOf(c) != moduleOf(nc)) {                          // Changement de module ?
    if (!isNeckPair(r, c, nr, nc)) return false;              // Seul le col l'autorise
  }
  return true;
}

inline bool tryMove(int r, int c, int nr, int nc) {
  if (!canMove(r, c, nr, nc)) return false;
  sand[r][c]   = false;
  sand[nr][nc] = true;
  return true;
}

// Calcule la case cible « directement sous » (direction principale de la gravité).
// Point clé : sur la pointe du col, (ligne+g, colonne+g) sort tout de suite des limites
// (par ex. 7+1=8 au-delà de 0~7). Il faut explicitement rediriger vers la case opposée
// du col, sinon les grains resteraient bloqués sur la pointe sans pouvoir traverser.
inline void primaryTarget(int r, int c, int g, int &nr, int &nc) {
  if (g == 1  && r == NECK_A_R && c == NECK_A_C) { nr = NECK_B_R; nc = NECK_B_C; return; }
  if (g == -1 && r == NECK_B_R && c == NECK_B_C) { nr = NECK_A_R; nc = NECK_A_C; return; }
  nr = r + g;
  nc = c + g;
}

float random01() { return random(0, 10001) / 10000.0f; }

// Décision pour un grain à un pas : tente d'abord la case directe sous, et si elle est
// bloquée, glisse vers le bas-gauche/bas-droite selon le biais d'inclinaison
void moveGrain(int r, int c) {
  int g = gravityDir;
  int pnr, pnc;
  primaryTarget(r, c, g, pnr, pnc);

  // Plus l'inclinaison est forte, plus le grain a tendance à « sauter la case sous »
  // pour glisser directement latéralement — simule le décalage de la composante de gravité réelle
  bool primaryFirst = random01() < (1.0f - fabsf(currentBias) * 0.6f);

  if (primaryFirst) {
    if (tryMove(r, c, pnr, pnc)) return;
  }

  // Glissement latéral : composante A (ligne seule) / composante B (colonne seule),
  // l'ordre d'essai dépend du biais
  if (random01() < LATERAL_FRICTION) {
    bool aFirst = random01() < (0.5f - currentBias * 0.5f);
    int arn = r + g, acn = c;      // Composante A : bas-gauche (ou bas-droite selon le sens de rotation)
    int brn = r,     bcn = c + g;  // Composante B : l'autre côté

    if (aFirst) {
      if (tryMove(r, c, arn, acn)) return;
      if (tryMove(r, c, brn, bcn)) return;
    } else {
      if (tryMove(r, c, brn, bcn)) return;
      if (tryMove(r, c, arn, acn)) return;
    }
  }

  // Filet de sécurité : si la case directe sous a été sautée à cause du biais, on la retente
  // ici, afin que — du moment que la case sous est bien vide — le grain finisse toujours par
  // tomber (impossible de rester bloqué par la logique de biais)
  if (!primaryFirst) {
    tryMove(r, c, pnr, pnc);
  }
}

// Une frame complète : balaie à contre-courant « aval gravité -> amont », anti-fantôme /
// anti-chute trop rapide
void updateSand() {
  int rStart, rEnd, rStep, cStart, cEnd, cStep;
  if (gravityDir == 1) {
    // Aval = grandes valeurs de ligne et de colonne -> balaie de (7,15) vers (0,0)
    rStart = 7; rEnd = -1; rStep = -1;
    cStart = 15; cEnd = -1; cStep = -1;
  } else {
    // Après retournement, aval = petites valeurs de ligne et de colonne -> balaie de (0,0) vers (7,15)
    rStart = 0; rEnd = 8; rStep = 1;
    cStart = 0; cEnd = 16; cStep = 1;
  }

  for (int r = rStart; r != rEnd; r += rStep) {
    for (int c = cStart; c != cEnd; c += cStep) {
      if (sand[r][c]) moveGrain(r, c);
    }
  }

  // Le biais poursuit en douceur la valeur cible, pour des transitions inclinaison/remise
  // d'aplomb plus fluides, sans à-coups
  currentBias += (targetBias - currentBias) * 0.05f;
}

void initHourglass() {
  memset(sand, 0, sizeof(sand));
  int placed = 0;
  // La première phase au démarrage est un écoulement « de haut en bas » avec dir=-1
  // (module2 -> module1), on place donc les grains initiaux dans le module 2 (colonnes 8~15).
  // Le remplissage est l'image, par (r,c)->(7-r,15-c), du remplissage « initial du module 1 »,
  // parfaitement symétrique avec la physique après retournement : à la mise sous tension on est
  // déjà dans le bon état « compartiment supérieur plein, le sable s'écoule vers le bas ».
  for (int r = ROWS - 1; r >= 0 && placed < SAND_TOTAL; r--) {
    for (int c = 15; c >= 8 && placed < SAND_TOTAL; c--) {   // Ne remplit que le module 2
      sand[r][c] = true;
      placed++;
    }
  }
}

// ================================================================
//                    Machine à états pseudo-gyroscope
//                    (utilisée en l'absence de capteur réel)
// ================================================================
struct GyroPhase {
  unsigned long durationMs;
  int8_t        dir;      // Direction de gravité pour cette phase
  float         bias;     // Biais d'inclinaison cible pour cette phase
  const char*   name;
  float         gx, gz;   // Lectures simulées gyroscope/accéléromètre, pour le debug série uniquement
};

GyroPhase phases[] = {
  // —— Première phase : de haut en bas (dir=-1, module2 -> module1) ——
  { 16000, -1,  0.00f, "UPRIGHT_POUR(inversé) écoulement stable à la verticale",  0.0f, -1.0f },
  {  4000, -1,  0.85f, "TILT_RIGHT     incliner à droite",          0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          remettre d'aplomb",              0.0f, -1.0f },
  {  4000, -1, -0.85f, "TILT_LEFT      incliner à gauche",         -0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          remettre d'aplomb",              0.0f, -1.0f },
  {  1400,  1,  0.00f, "FLIP           retournement complet",      0.0f,  0.2f },
  // —— Deuxième phase : de bas en haut (dir=+1, module1 -> module2) ——
  { 16000,  1,  0.00f, "UPRIGHT_POUR   écoulement stable à la verticale",     0.0f,  1.0f },
  {  4000,  1,  0.85f, "TILT_RIGHT     incliner à droite",          0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          remettre d'aplomb",              0.0f,  1.0f },
  {  4000,  1, -0.85f, "TILT_LEFT      incliner à gauche",         -0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          remettre d'aplomb",              0.0f,  1.0f },
  { 1400, -1,  0.00f, "FLIP           retournement complet",      0.0f, -0.2f },
};
const int NUM_PHASES = sizeof(phases) / sizeof(phases[0]);

int phaseIndex = 0;
unsigned long phaseStartMs = 0;

void updateFakeGyro() {
  unsigned long now = millis();
  if (now - phaseStartMs >= phases[phaseIndex].durationMs) {
    phaseIndex = (phaseIndex + 1) % NUM_PHASES;
    phaseStartMs = now;

    gravityDir = phases[phaseIndex].dir;
    targetBias = phases[phaseIndex].bias;

    Serial.print("[GYRO STATE] -> ");
    Serial.print(phases[phaseIndex].name);
    Serial.print("   gx=");
    Serial.print(phases[phaseIndex].gx, 2);
    Serial.print("g  gz=");
    Serial.println(phases[phaseIndex].gz, 2);
  }
}

// ================================================================
//                          Rendu sur la matrice
// ================================================================
void render() {
  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::OFF);   // Désactive le rafraîchissement auto, on rafraîchit toute la frame d'un coup, pour éviter le scintillement
  mx.clear();

  for (int r = 0; r < ROWS; r++) {
    for (int c = 0; c < COLS; c++) {
      if (!sand[r][c]) continue;

      int dispRow = FLIP_ROW ? (7 - r) : r;
      int dispCol = c;
      if (SWAP_MODULE_ORDER) {
        dispCol = (c < 8) ? (c + 8) : (c - 8);
      }
      mx.setPoint(dispRow, dispCol, true);
    }
  }

  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::ON);
}

// ================================================================
//                             Programme principal
// ================================================================
void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  mx.begin();
  mx.control(MD_MAX72XX::INTENSITY, 5);   // Luminosité 0~15, ajustable
  mx.clear();

  initHourglass();

  phaseIndex = 0;
  phaseStartMs = millis();
  gravityDir = phases[0].dir;
  targetBias = phases[0].bias;
  currentBias = 0;

  lastTickMs = millis();

  Serial.println("=== Sablier électronique ESP32 double 8x8 MAX7219 : démarrage ===");
  Serial.print("[GYRO STATE] -> ");
  Serial.println(phases[0].name);
}

void loop() {
  unsigned long now = millis();

  updateFakeGyro();     // Pilote la machine à états / pseudo-gyroscope

  if (now - lastTickMs >= TICK_MS) {
    lastTickMs = now;
    updateSand();        // Calcule une frame physique
    render();             // Sortie vers la matrice
  }
}
```

### Explications du code

Le code a l'air long, mais il se décompose en trois blocs :

**Première étape : « souder » les deux matrices en un système de coordonnées de sablier.** `MD_MAX72XX` considère naturellement les deux modules comme une grande grille 8 lignes × 16 colonnes, mais physiquement les deux modules sont chacun pivotés de 45° puis assemblés ; seules les cases `(7,7)` et `(0,8)` sont réellement adjacentes — c'est le « col du sablier » défini par `NECK_A / NECK_B`, et `isNeckPair()` est précisément le gardien qui empêche les grains de « raccourcir » d'un module à l'autre par un autre chemin.

**Deuxième étape : faire tomber les grains sagement, case par case.** `moveGrain()` tente d'abord la case directement sous, et ne glisse latéralement que si elle est bloquée, en fonction de l'inclinaison courante ; `updateSand()` balaie toute la grille strictement dans l'ordre « aval calculé en premier », pour éviter que deux grains ne visent la même case dans la même frame. C'est la partie du code qui mérite le plus qu'on la lise — avec une règle très simple (d'abord sous, puis glissement, puis filet de sécurité), elle restitue une physique qui semblait complexe : le tas qui s'étale naturellement en pente.

**Troisième étape : « nourrir » le moteur avec une machine à états pseudo-gyroscope.** Le tableau `phases[]` ordonnance toute une séquence de postures (à l'endroit, inclinaison, remise d'aplomb, retournement) ; `updateFakeGyro()` n'est qu'une minuterie qui passe à la phase suivante au bon moment en modifiant `gravityDir` et `targetBias`. Quand tu brancheras un vrai gyroscope, il suffira de remplacer ces deux variables par les angles calculés en temps réel par le capteur, sans toucher au moteur physique.

## Dépannage des problèmes courants

Pas de panique, 90 % des soucis viennent de la liste ci-dessous :

**La matrice ne s'allume pas du tout**
Vérifie d'abord si VCC/GND sont inversés ou en faux contact, puis confirme que `DATA_PIN`/`CLK_PIN`/`CS_PIN` correspondent au câblage réel (par défaut 23/18/5 dans cet article).

**L'image est renversée haut/bas, ou les deux modules sont inversés gauche/droite**
Inutile de recâbler : modifie les macros `FLIP_ROW` ou `SWAP_MODULE_ORDER` dans le code et retéléverse.

**Les grains « bavent » en une tache, ça va trop vite pour voir**
Augmente `TICK_MS` depuis la valeur par défaut 130 jusqu'à 150~180 ; le flux ralentit visiblement et devient plus « granuleux ».

**Erreur de compilation : `MD_MAX72xx.h` introuvable**
La bibliothèque n'est pas installée ; retourne dans le gestionnaire de bibliothèques et réinstalle `MD_MAX72xx` (attention à la casse et à l'orthographe).

**Les grains restent bloqués au col (ligne7 colonne7 ou ligne0 colonne8) et ne descendent pas**
Très probablement `HARDWARE_TYPE` ne correspond pas au bon modèle ; les modules MAX7219 existent en plusieurs variantes (`FC16_HW`, `GENERIC_HW`, `PAROLA_HW`, etc.) — si le câblage est bon mais l'affichage incohérent, essaie-les tour à tour.

**Écran parasite ou redémarrages intempestifs à la mise sous tension**
Vérifie la qualité des contacts des fils Dupont, en particulier sur platine d'essai ou avec de longs fils ; sur la guirlande, garde les fils aussi courts que possible.

## Foire aux questions (FAQ)

**Q : L'ESP32 avec un MAX7219 impose-t-il absolument les broches GPIO23/18/5 ?**
R : Non. Le code utilise un SPI logiciel (le constructeur reçoit directement les trois broches DATA/CLK/CS) ; tu peux remplacer ces GPIO par n'importe quelles autres broches disponibles en modifiant uniquement les trois `#define`, sans avoir besoin des broches du SPI matériel.

**Q : Combien de modules MAX7219 peut-on mettre en cascade au maximum ?**
R : La puce elle-même accepte théoriquement des dizaines d'unités en série ; en pratique, c'est le taux de rafraîchissement et l'intégrité du signal qui limitent, mais les projets courants tournent de façon stable avec 4 à 8 modules. L'article en utilise 2 ; il suffit d'ajuster `MAX_DEVICES` et de câbler la guirlande en conséquence.

**Q : Que choisir pour `HARDWARE_TYPE` ?**
R : Ça dépend du câblage interne du module acheté ; les deux variantes les plus courantes sont `FC16_HW` et `GENERIC_HW`. Se tromper ne grille pas le matériel, l'affichage sera simplement décalé ou en miroir ; câblage inchangé, modifie cette macro et retéléverse pour tester.

**Q : Pourquoi la matrice affiche-t-elle du n'importe quoi ou rien du tout ?**
R : D'abord regarde si le moniteur série affiche bien les logs `[GYRO STATE]` : s'ils sont là, le programme tourne et le problème vient du mapping d'affichage (`FLIP_ROW`/`SWAP_MODULE_ORDER`/`HARDWARE_TYPE`) ; s'ils sont absents, le code n'a pas démarré, vérifie l'alimentation et la réussite du téléversement.

**Q : Peut-on ajouter un vrai gyroscope pour en faire une version « sensible à l'inclinaison » ?**
R : Oui, le code a prévu l'interface. Ajoute un capteur type MPU6050, et après avoir lu l'angle en temps réel, remplace dans `updateFakeGyro()` les affectations de `gravityDir` et `targetBias` par celles issues du capteur — le moteur physique, lui, ne change pas du tout.

**Q : Quelle est la consommation de l'ensemble, puis-je l'alimenter avec une batterie externe ?**
R : Deux modules 8×8 à luminosité moyenne (niveau 5 par défaut dans le code) tirent en général autour de la centaine de milliampères ; une batterie externe ou un chargeur de téléphone 5V/1A suffit largement. Si tu montes la luminosité ou ajoutes d'autres modules par la suite, passe sur un adaptateur plus costaud pour ne pas faire travailler la broche 5V de l'ESP32 en surcharge prolongée.

## Pistes d'extension

- Brancher un vrai gyroscope MPU6050 pour que le sablier s'incline réellement avec la main, et dire adieu au scénario « pseudo-gyroscope »
- Assembler davantage de modules MAX7219 pour composer une matrice plus grande et y jouer des animations simples ou du défilement de texte
- Ajouter un buzzer qui émet un « bip » quand le sable est entièrement écoulé, pour en faire un vrai minuteur
- Ajouter des boutons pour mettre en pause ou déclencher manuellement le retournement, sans attendre la machine à états

## Références

- [Fiche technique officielle MAX7219/MAX7221 (Analog Devices / Maxim Integrated)](https://www.analog.com/media/en/technical-documentation/data-sheets/max7219-max7221.pdf)
- [Page GitHub de la bibliothèque open-source MD_MAX72xx](https://github.com/MajicDesigns/MD_MAX72XX) (la bibliothèque embarque l'exemple officiel Hourglass, à comparer pour le dépannage)
- Documentation officielle des produits et brochages ESP32 (site Espressif)
