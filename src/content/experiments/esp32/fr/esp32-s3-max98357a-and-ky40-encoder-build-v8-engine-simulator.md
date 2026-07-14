---
title: "ESP32-S3 + MAX98357A : Construisez un simulateur de son de moteur V8 — tutoriel complet (audio numérique I2S + encodeur rotatif KY-040 pour contrôler l'accélérateur)"
boardId: esp32s3
moduleId: audio/max98357a
moduleIds:
  - audio/max98357a
  - sensor/ky-040
category: esp32
date: 2026-07-14
intro: "Utilisez un ESP32-S3 pour piloter le module amplificateur MAX98357A, accompagné d'un encodeur rotatif KY-040, et synthétisez en temps réel et en code pur un son de moteur V8 — l'accélérateur est contrôlé manuellement via l'encodeur, le son est restitué en direct par le haut-parleur. Inclus : câblage complet, code et journal de débogage."
image: "https://img.lingflux.com/2026/07/6c72c55fa63614eb8c2086c24d993d5f.jpg"
---

> **TL;DR (démarrage rapide) :**
>
> 1. Câblage : BCLK du MAX98357A → GPIO16, LRC → GPIO17, DIN → GPIO15 ; CLK du KY-040 → GPIO5, DT → GPIO6, SW → GPIO7
> 2. Carte : choisissez **ESP32S3 Dev Module**, PSRAM : **QSPI PSRAM** (si vous vous trompez, c'est OOM garanti — ne me demandez pas comment je le sais)
> 3. Tourner l'encodeur dans le sens horaire = réduire l'accélérateur, sens anti-horaire = augmenter l'accélérateur, appui = retour au ralenti
> 4. Téléversez, alimentez, profitez de votre « véhicule électrique V8 »

---

Difficulté : ⭐⭐⭐☆☆ (il faut savoir faire un câblage Arduino de base et téléverser)
Temps estimé : 45 minutes
Environnement de test : Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + ESP32-S3-WROOM-1-N16R8 (16 Mo Flash + 8 Mo PSRAM)

---

## Préambule

Tous ceux qui ont déjà roulé en vélo électrique connaissent la situation gênante : vous approchez silencieusement un piéton par derrière, la personne sursaute à moitié morte de peur, se retourne avec un regard « tiens, tu ne fais donc aucun bruit » — et vous ne pouvez répondre qu'avec un sourire gêné, parce que votre vélo, justement… ne fait aucun bruit.

Les véhicules électriques sont économes et écologiques, mais il y a bien un point qui chiffonne : ils sont trop silencieux. Tellement silencieux qu'on se croirait à bord d'un fantôme qui glisserait sur la route.

Alors je me suis dit : puisque le moteur ne fournit pas lui-même de bruit, pourquoi ne pas **en créer un** ? Pas le « bip bip » d'un klaxon bon marché, non… le vrombissement d'un moteur V8. Grave, puissant, qui hurle quand on écrase la pédale.

L'objectif de cet article : avec un **ESP32-S3 + module amplificateur MAX98357A + encodeur rotatif KY-040**, synthétiser en code pur un son de moteur V8, l'accélérateur étant contrôlé manuellement par l'encodeur, le son restitué en temps réel par le haut-parleur. Pas d'échantillonnage, pas de fichier audio à lire, uniquement du moteur sonore entièrement calculé en temps réel par des mathématiques.



---

## Résultat de l'expérience

Tournez l'encodeur KY-040 pour ouvrir l'accélérateur : le haut-parleur passe progressivement d'un grave ronronnement au ralenti à un rugissement de moteur à haut régime ; appuyez sur le bouton de l'encodeur et l'accélérateur retombe immédiatement à zéro, retour au ralenti. Les transitions sonores sont fluides, sans sautillements ni à-coups, et le résultat est étonnamment crédible.



---

## Description des composants

> La carte de développement (ESP32-S3) n'est pas détaillée ici, on se concentre sur les deux autres protagonistes.

### MAX98357A — le traducteur de signaux numériques

Imaginez que vous ayez un enregistrement numérique (une suite de 0 et de 1), mais que le haut-parleur ne comprenne que le signal analogique (des variations de tension). Le MAX98357A, c'est l'**interprète simultané** entre les deux : il reçoit l'audio numérique envoyé par l'ESP32-S3 via le protocole I2S, le convertit en temps réel en un courant analogique capable d'alimenter un haut-parleur, et intègre en plus un amplificateur de 3 W — pas besoin d'ajouter un étage d'amplification supplémentaire.

| Paramètre | Valeur |
|-----------|--------|
| Tension d'alimentation | 2,5 V ~ 5,5 V |
| Puissance de sortie | 3,2 W (charge 4 Ω, alimentation 5 V) |
| Fréquences d'échantillonnage | 8 kHz ~ 96 kHz |
| Protocole de communication | I2S |
| Gain sélectionnable | 3 dB / 6 dB / 9 dB / 12 dB / 15 dB |
| Muet | Broche SD à LOW = muet |

On le choisit pour une raison simple : **liaison directe I2S, sans filtre, boîtier modulaire, 3 W largement assez pour un vélo**, et on le trouve à moins de dix yuans sur Taobao.

### Brochage

| Nom de broche | Fonction |
|---------------|----------|
| VIN | Pôle positif de l'alimentation, à relier au 5 V |
| GND | Masse |
| BCLK | Horloge de bit I2S |
| LRC | Horloge de mot I2S (sélection canal gauche/droit) |
| DIN | Entrée de données audio numériques I2S |
| SD | Contrôle muet, laissée flottante ou à HIGH = fonctionnement normal, à LOW = muet |
| GAIN | Sélection du gain, par défaut 9 dB si laissée flottante |

> **Remarque** : la broche SD laissée non connectée ou reliée au 3,3 V fonctionne normalement ; si votre câblage est correct mais qu'il n'y a aucun son, vérifiez d'abord que la broche SD n'a pas été tirée accidentellement vers le LOW.

---

### KY-040 — le « bouton de volume » qui tourne à l'infini

Un potentiomètre ordinaire bute en bout de course, alors que le KY-040 est un encodeur rotatif à 360° infinis : il ne renvoie pas une position absolue, il vous indique « tourner de tant de crans dans telle direction ». Dans ce projet, je l'utilise pour piloter l'accélérateur : **sens horaire = réduire l'accélérateur, sens anti-horaire = augmenter l'accélérateur, appui sur le bouton = retour au ralenti**, avec le ressenti d'un vrai bouton d'accélérateur rotatif.

| Paramètre | Valeur |
|-----------|--------|
| Tension de fonctionnement | 3,3 V ~ 5 V |
| Pas par tour | 20 pas |
| Signaux de sortie | Phase A (CLK) / Phase B (DT) / Bouton (SW) |
| Type d'interface | GPIO numérique (avec pull-up interne) |

On le choisit parce qu'il est **bon marché, courant, et qu'il a un bouton en prime**, piloté par interruption il ne charge pas le CPU, et avec une architecture de tâches FreeRTOS il ne pose aucun souci.

### Brochage

| Nom de broche | Fonction |
|---------------|----------|
| CLK (phase A) | Sortie phase A de l'encodeur, à relier à une broche d'interruption |
| DT (phase B) | Sortie phase B de l'encodeur, sert à déterminer le sens de rotation |
| SW | Sortie du bouton, LOW lorsqu'il est appuyé |
| + | Pôle positif de l'alimentation, à relier au 3,3 V |
| GND | Masse |

---

## Liste de composants (BOM)

| Composant | Référence / Spécification | Quantité | Remarque |
|-----------|---------------------------|----------|----------|
| Carte de développement | ESP32-S3-WROOM-1-N16R8 | 1 | 16 Mo Flash + 8 Mo PSRAM, PSRAM indispensable |
| Module amplificateur I2S | MAX98357A | 1 | Module soudé sur PCB, la version sans soudure est encore plus pratique |
| Module d'encodeur rotatif | KY-040 | 1 | Avec bouton |
| Petit haut-parleur | 4 Ω 3 W | 1 | Ou 8 Ω, le volume sera un peu plus faible |
| Fils Dupont | Mâle-mâle / mâle-femelle | plusieurs | Pour le câblage |
| Breadboard | quelconque | 1 | Optionnel, pour fixer le câblage plus proprement |

---

## Câblage

### MAX98357A ↔ ESP32-S3

| MAX98357A | ESP32-S3 |
|-----------|----------|
| VIN | 5V |
| GND | GND |
| BCLK | GPIO16 |
| LRC | GPIO17 |
| DIN | GPIO15 |

### KY-040 ↔ ESP32-S3

| KY-040 | ESP32-S3 |
|--------|----------|
| CLK | GPIO5 |
| DT | GPIO6 |
| SW | GPIO7 |
| + | 3.3V |
| GND | GND |

> Petit conseil : une fois chaque fil branché, cochez-le dans le tableau au fur et à mesure. Cette habitude vous épargnera 80 % du temps de débogage. Surtout pour le GND : partager la même masse entre plusieurs modules est la condition sine qua non d'un audio propre — tout le monde doit parler la même langue pour que les signaux transitent correctement.

---

## Bibliothèques à installer

Ce projet **ne dépend d'aucune bibliothèque audio tierce** : l'audio est entièrement synthétisé en temps réel par le code, on n'utilise que `driver/i2s.h` fourni avec l'ESP32 Arduino Core.

Vous avez uniquement besoin de vérifier l'environnement suivant dans l'IDE Arduino :

| Élément | Configuration requise |
|---------|------------------------|
| IDE Arduino | 2.3.8 (testé) |
| ESP32 Arduino Core | 3.3.10 (installez-le via le Board Manager en cherchant `esp32`) |
| Type de carte | ESP32S3 Dev Module |
| **Option PSRAM** | **QSPI PSRAM** (si vous vous trompez, c'est OOM direct, voir le journal de débogage) |
| Taille Flash | 16MB |
| Vitesse d'upload | 921600 |

Dans le menu **Outils (Tools)** de l'IDE Arduino, vérifiez ligne par ligne chaque entrée ci-dessus, tout spécialement la ligne PSRAM.

---

## Code complet + explications

```cpp
/*
 * ESP32-S3 + MAX98357A + encodeur rotatif KY-040
 * Simulateur de son de moteur V8
 *
 * Câblage :
 *   MAX98357A    ESP32-S3
 *   VIN       -> 5V
 *   GND       -> GND
 *   BCLK      -> GPIO16
 *   LRC       -> GPIO17
 *   DIN       -> GPIO15
 *
 *   KY-040       ESP32-S3
 *   CLK       -> GPIO5
 *   DT        -> GPIO6
 *   SW        -> GPIO7  (appui = accélérateur à zéro)
 *   +         -> 3.3V
 *   GND       -> GND
 *
 * Mode d'emploi :
 *   Sens horaire = réduire l'accélérateur
 *   Sens anti-horaire = augmenter l'accélérateur
 *   Appui sur l'encodeur = accélérateur à zéro (retour au ralenti)
 *
 * Vitesse série : 115200
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// -----------------------------------------------
// En cas de redémarrage Brownout (sous-tension), passez ceci à 1 pour tester
// En usage normal laissez 0 ; il est déconseillé de désactiver la protection
// de sous-tension sur la durée
// -----------------------------------------------
#define DISABLE_BROWNOUT_FOR_TEST 0

#if DISABLE_BROWNOUT_FOR_TEST
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

// ================= Étape 1 : définition des broches I2S =================
#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

// ================= Étape 2 : définition des broches KY-040 =================
#define ENCODER_CLK_PIN   5
#define ENCODER_DT_PIN    6
#define ENCODER_SW_PIN    7

// ================= Paramètres d'accélérateur de l'encodeur =================
// Variation d'accélérateur par cran (plage 0.0 ~ 1.0)
// Diminuez cette valeur = il faudra plus de crans pour atteindre l'accélérateur
// plein, pour un ressenti plus fin
#define ENCODER_STEP_SIZE     0.1f

// Coefficient de lissage de l'accélérateur (plus grand = réponse plus rapide,
// plus petit = transition plus soyeuse)
#define ENCODER_SMOOTHING     1.2f

// Temps d'anti-rebond de l'encodeur (microsecondes), évite qu'une rotation soit
// comptée plusieurs fois par erreur
#define ENCODER_DEBOUNCE_US   200

// Temps d'anti-rebond du bouton (millisecondes)
#define BUTTON_DEBOUNCE_MS    200

// ================= Paramètres audio de base =================
#define SAMPLE_RATE     22050   // Fréquence d'échantillonnage, en Hz
#define DMA_BUF_COUNT   8       // Nombre de tampons DMA
#define DMA_BUF_LEN     256     // Nombre d'échantillons par tampon DMA

// ================= Paramètres de régime moteur =================
#define RPM_IDLE        800.0f    // Régime au ralenti (RPM)
#define RPM_MAX         8000.0f   // Régime maximal (RPM)
#define RPM_SMOOTHING   0.006f    // Coefficient de lissage du régime, plus petit
                                  // = plus proche d'un vrai moteur
#define NUM_CYLINDERS   8         // V8 = 8 cylindres

// ================= Cadence des boufs d'échappement =================
// Au ralenti 2 boufs/s, à plein régime 7,6 boufs/s
#define THUMP_HZ_IDLE   2.0f
#define THUMP_HZ_MAX    7.6f

// ================= Paramètres de volume =================
#define MASTER_VOLUME       1.00f
#define PCM_OUTPUT_SCALE    26000.0f   // Coefficient de mise à l'échelle final vers
                                       // le PCM 16 bits

// Volume du son moteur de fond (ralenti / plein régime)
#define BACKGROUND_GAIN_IDLE  0.45f
#define BACKGROUND_GAIN_MAX   0.60f

// Volume de la couche de bouf principale (ralenti / plein régime)
#define THUMP_LAYER_GAIN_IDLE 0.75f
#define THUMP_LAYER_GAIN_MAX  1.05f

// ================= Paramètres du bouf « pot droit modifié » =================
// Les paramètres ci-dessous contrôlent la forme d'onde de chaque bouf
// d'échappement, à régler avec précaution
#define THUMP_ATTACK_MS       5.0f    // Temps d'attaque (ms)
#define THUMP_BODY_MS         38.0f   // Durée du corps (ms)
#define THUMP_TAIL_MS         62.0f   // Durée de la queue (ms)

#define THUMP_F_START         105.0f  // Fréquence de départ du bouf (Hz)
#define THUMP_F_BODY          82.0f   // Fréquence du corps (Hz)
#define THUMP_F_END           64.0f   // Fréquence de la queue (Hz)

#define THUMP_NOISE_MIX       0.22f   // Proportion de bruit (simule le flux d'air)
#define THUMP_TONE2_MIX       0.30f   // Proportion de la 2e harmonique
#define THUMP_TONE3_MIX       0.16f   // Proportion de la 3e harmonique
#define THUMP_SUB_MIX         0.08f   // Proportion sub-basse (renforce le grave)

#define THUMP_DRIVE           2.10f   // Saturation (intensité du soft-clipping tanh)
#define THUMP_BURST_MIX       0.28f   // Part du bruit d'air en phase d'attaque

#define THUMP_REBOUND_DELAY_MS 30.0f  // Délai de rebond (ms), simule la résonance
                                      // du tuyau
#define THUMP_REBOUND_GAIN     0.18f  // Gain du rebond

#define THUMP_ALT_GAIN         0.94f  // Différence de gain entre cylindres alternés,
                                      // simule un allumage irrégulier
#define THUMP_SWING            0.06f  // Swing du rythme, ajoute du groove

#define THUMP_TABLE_GAIN       2.50f  // Gain global de la table de boufs

// ================= Définition des tables de recherche =================
#define SINE_TABLE_SIZE 2048     // Taille de la table sinusoïdale (plus grand =
                                 // plus de précision, plus de mémoire)
#define THUMP_TABLE_MAX 8000     // Nombre maximum d'échantillons de la table de boufs

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

// Tampon de sortie stéréo (DMA_BUF_LEN échantillons par canal gauche/droit)
static int16_t stereoBuffer[DMA_BUF_LEN * 2];

// ================= Variables d'état globales =================
volatile float throttleValue  = 0.0f;   // Valeur d'accélérateur lissée (0.0 ~ 1.0)
volatile float targetThrottle = 0.0f;   // Cible d'accélérateur définie par l'encodeur
volatile float targetRPM      = RPM_IDLE;
volatile float currentRPM     = RPM_IDLE;
volatile float currentThumpHz = THUMP_HZ_IDLE;

uint32_t noiseSeed = 123456789;

// Table des déphasages des cylindres du V8 (simule un allumage à intervalles de 90°)
float cylinderPhase[NUM_CYLINDERS];

const float firingAngles[NUM_CYLINDERS] = {
  0.0f, 90.0f, 150.0f, 210.0f,
  270.0f, 330.0f, 390.0f, 450.0f
};

// ================= Variables liées aux interruptions de l'encodeur =================
volatile int encoderPosition = 0;
volatile unsigned long lastEncoderInterruptUs = 0;
volatile bool encoderButtonPressed = false;
volatile unsigned long lastButtonPressMs = 0;

// ================= Fonctions utilitaires =================

// Écrêtage numérique
static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// Fonction en marche d'escalier lissée, transitions plus soyeuses (courbe en S)
static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

// Calcul de sin via table de recherche, bien plus rapide que sinf() — indispensable
// pour de l'audio temps réel
float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;

  // Interpolation linéaire pour plus de précision
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

// Génération de bruit pseudo-aléatoire (méthode congruentielle linéaire, rapide,
// utilisée pour simuler le bruit de flux d'air)
float pseudoRandom() {
  noiseSeed = noiseSeed * 1664525UL + 1013904223UL;
  return ((float)(noiseSeed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// Pseudo-aléatoire avec sa propre graine (utilisé dans la génération de la table de
// boufs pour garantir un son identique à chaque fois)
float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= Interruption encodeur : détection du sens de rotation =================
void IRAM_ATTR encoderISR() {
  unsigned long nowUs = micros();

  // Anti-rebond : intervalle trop court entre deux interruptions, on ignore pour
  // éviter les faux déclenchements liés aux rebonds mécaniques
  if (nowUs - lastEncoderInterruptUs < ENCODER_DEBOUNCE_US) return;
  lastEncoderInterruptUs = nowUs;

  // Déclenchement sur front descendant de CLK, on lit alors le niveau de DT pour
  // connaître le sens
  // DT = LOW  -> sens horaire    -> réduire l'accélérateur
  // DT = HIGH -> sens anti-horaire -> augmenter l'accélérateur
  int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState == LOW) {
    encoderPosition--;  // Sens horaire : réduire l'accélérateur
  } else {
    encoderPosition++;  // Sens anti-horaire : augmenter l'accélérateur
  }
}

// ================= Interruption bouton : appui = accélérateur à zéro =================
void IRAM_ATTR buttonISR() {
  unsigned long nowMs = millis();
  if (nowMs - lastButtonPressMs < BUTTON_DEBOUNCE_MS) return;
  lastButtonPressMs = nowMs;
  encoderButtonPressed = true;
}

// ================= Initialisation des broches et interruptions de l'encodeur =================
void initEncoder() {
  pinMode(ENCODER_CLK_PIN, INPUT_PULLUP);
  pinMode(ENCODER_DT_PIN,  INPUT_PULLUP);
  pinMode(ENCODER_SW_PIN,  INPUT_PULLUP);

  // Front descendant de CLK déclenche la détection de rotation
  attachInterrupt(digitalPinToInterrupt(ENCODER_CLK_PIN), encoderISR, FALLING);
  // Front descendant de SW déclenche la détection du bouton (LOW quand appuyé)
  attachInterrupt(digitalPinToInterrupt(ENCODER_SW_PIN),  buttonISR, FALLING);

  Serial.println("Initialisation de l'encodeur KY-040 terminée");
}

// ================= Étape 3 : précalcul de la table sinusoïdale =================
// On pré-calcule 2048 valeurs de sin en mémoire ; à la lecture il suffit de
// consulter la table, on économise du CPU
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

// ================= Initialisation des déphasages des 8 cylindres =================
void initCylinderPhases() {
  for (int i = 0; i < NUM_CYLINDERS; i++) {
    // Conversion angle -> phase 0.0~1.0 (720° = un cycle de combustion complet)
    cylinderPhase[i] = firingAngles[i] / 720.0f;
  }
}

// ================= Génération de l'impulsion d'échappement d'un cylindre =================
// phase est la phase courante 0.0~1.0, renvoie l'amplitude à cet instant
float generateCylinderPulse(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float pulse = 0.0f;

  if (phase < 0.30f) {
    // 30 % initiaux : montée rapide, simule le choc à l'ouverture de la soupape
    // d'échappement
    float t = phase / 0.30f;
    pulse = sinf(M_PI * t) * expf(-2.2f * t) * 1.35f;
  } else if (phase < 0.50f) {
    // 30 % ~ 50 % : léger rebond, simule la contre-pression du tuyau
    float t = (phase - 0.30f) / 0.20f;
    pulse = -0.25f * sinf(M_PI * 2.0f * t) * expf(-5.0f * t);
  }
  // 50 % restants : silence, en attente du prochain échappement

  return pulse;
}

// ================= Étape 4 : précalcul de la table de boufs =================
// On pré-calcule un bouf complet « bouf » dans un tableau ; à la lecture on lit
// directement le tableau, on économise du CPU
void buildStraightPipeThumpTable() {
  int attackS  = (int)(THUMP_ATTACK_MS  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(THUMP_BODY_MS    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(THUMP_TAIL_MS    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(THUMP_REBOUND_DELAY_MS * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen  = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;  // Plus la queue du rebond

  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1   = 0.0f;  // Phase de la fondamentale
  float phase2   = 0.0f;  // Phase de la 2e harmonique
  float phase3   = 0.0f;  // Phase de la 3e harmonique
  float phaseSub = 0.0f;  // Phase sub-basse

  float noiseLP1 = 0.0f;  // État du filtre passe-bas 1
  float noiseLP2 = 0.0f;  // État du filtre passe-bas 2
  uint32_t seed  = 24681357;

  for (int i = 0; i < totalLen; i++) {

    // --- Enveloppe principale (attaque -> corps -> decay) ---
    float env1 = 0.0f;

    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;  // Carré pour une attaque plus incisive
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    // --- Enveloppe de rebond (petit écho décalé dans le temps) ---
    int j = i - reboundS;
    float env2 = 0.0f;

    if (j >= 0) {
      if (j < attackS) {
        float x = (float)j / (float)attackS;
        env2 = smoothstep01(x);
        env2 = env2 * env2;
      } else if (j < attackS + bodyS) {
        float x = (float)(j - attackS) / (float)bodyS;
        env2 = 1.0f - 0.28f * x;
      } else if (j < mainLen) {
        float x = (float)(j - attackS - bodyS) / (float)tailS;
        env2 = 0.72f * expf(-3.8f * x);
      }
      env2 *= THUMP_REBOUND_GAIN;  // Le rebond est bien plus faible que le corps
    }

    float env = clampf(env1 + env2, 0.0f, 1.5f);

    // --- Glissement de fréquence dans le temps (simule la chute de hauteur quand
    // la pression d'échappement se relâche) ---
    float freq = THUMP_F_END;
    if (i < attackS) {
      freq = THUMP_F_START;
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      freq = THUMP_F_START + (THUMP_F_BODY - THUMP_F_START) * x;
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      freq = THUMP_F_BODY + (THUMP_F_END - THUMP_F_BODY) * x;
    }

    float inc1 = freq / (float)SAMPLE_RATE;

    phase1   += inc1;       if (phase1   >= 1.0f) phase1   -= 1.0f;
    phase2   += inc1 * 2.0f; if (phase2  >= 1.0f) phase2   -= 1.0f;
    phase3   += inc1 * 3.0f; if (phase3  >= 1.0f) phase3   -= 1.0f;
    phaseSub += inc1 * 0.5f; if (phaseSub >= 1.0f) phaseSub -= 1.0f;

    // --- Synthèse tonale : fondamentale + harmoniques + sub-basse ---
    float base = fastSin(phase1);
    base = tanhf(base * THUMP_DRIVE);  // Soft-clipping, simule la distorsion non
                                       // linéaire du tuyau d'échappement

    float tonal =
        0.82f          * base
      + THUMP_TONE2_MIX * fastSin(phase2)
      + THUMP_TONE3_MIX * fastSin(phase3)
      + THUMP_SUB_MIX   * fastSin(phaseSub);

    // --- Synthèse du bruit : simule le sifflement du flux d'air ---
    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);   // Passe-bas à deux étages, pour un
                                              // bruit plus centré sur le grave
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;     // Effet passe-bande

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;  // Flux d'air réduit en 2e moitié

    float air = bandNoise * (THUMP_NOISE_MIX * (0.25f * env + THUMP_BURST_MIX * 0.75f * earlyEnv));

    // --- Mélange tonalité + flux d'air, puis un soft-clipping asymétrique ---
    float sample = tonal * env + air;
    sample += 0.08f * env * env1;  // Légère composante non linéaire pour plus de corps

    if (sample > 0.0f) {
      sample = tanhf(sample * 1.15f) * 1.05f;  // Alternance positive légèrement poussée
    } else {
      sample = tanhf(sample * 0.85f);           // Alternance négative légèrement compressée
    }

    sample *= THUMP_TABLE_GAIN;
    thumpTable[i] = clampf(sample, -1.0f, 1.0f);
  }

  thumpTableLen = totalLen;

  Serial.printf("Table de boufs générée, longueur=%d échantillons, environ %d ms\n",
    thumpTableLen,
    (int)((float)thumpTableLen * 1000.0f / SAMPLE_RATE));
}

// ================= Étape 5 : initialisation du pilote I2S =================
void initI2S() {
  i2s_config_t i2s_config = {
    .mode                = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate         = SAMPLE_RATE,
    .bits_per_sample     = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format      = I2S_CHANNEL_FMT_RIGHT_LEFT,   // Stéréo (un canal gauche + droit)
    .communication_format= I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags    = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count       = DMA_BUF_COUNT,
    .dma_buf_len         = DMA_BUF_LEN,
    .use_apll            = false,
    .tx_desc_auto_clear  = true,   // RAZ automatique après envoi, évite les artefacts
    .fixed_mclk          = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK,
    .ws_io_num    = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num  = I2S_PIN_NO_CHANGE  // Émission seule, pas de réception
  };

  esp_err_t err;

  err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("Échec d'installation du pilote I2S : %d\n", (int)err);
    while (1) delay(100);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("Échec de configuration des broches I2S : %d\n", (int)err);
    while (1) delay(100);
  }

  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("Initialisation I2S terminée");
}

// ================= Mise à jour de l'accélérateur (appelée toutes les 20 ms par
// throttleTask) =================
void updateThrottle() {

  // Traitement du bouton : un appui remet à zéro position encodeur et accélérateur
  if (encoderButtonPressed) {
    encoderButtonPressed = false;
    encoderPosition = 0;
    targetThrottle  = 0.0f;
    Serial.println(">>> Bouton appuyé : accélérateur à zéro !");
  }

  // On borne la position de l'encodeur pour éviter de dépasser l'intervalle
  // 0 ~ accélérateur plein
  int maxSteps = (int)(1.0f / ENCODER_STEP_SIZE);  // 10 pas par défaut pour
                                                   // atteindre l'accélérateur plein

  if (encoderPosition < 0)        encoderPosition = 0;
  if (encoderPosition > maxSteps) encoderPosition = maxSteps;

  // Conversion des pas en valeur d'accélérateur 0.0 ~ 1.0
  targetThrottle = clampf((float)encoderPosition * ENCODER_STEP_SIZE, 0.0f, 1.0f);

  // Transition lissée : on n'avance que d'un petit pas à chaque fois, pour éviter
  // les à-coups qui se traduisent par des clics sonores
  throttleValue += (targetThrottle - throttleValue) * ENCODER_SMOOTHING;
  throttleValue  = clampf(throttleValue, 0.0f, 1.0f);

  // Régime cible en fonction de l'accélérateur
  targetRPM = RPM_IDLE + throttleValue * (RPM_MAX - RPM_IDLE);
}

// ================= Tâche de génération audio (cœur 1, priorité maximale) =================
void audioTask(void *param) {
  float crankPhase = 0.0f;   // Phase du vilebrequin, entraîne tous les cylindres

  float bgLpf    = 0.0f;    // État du passe-bas du son de fond
  float bgHpfIn  = 0.0f;    // Entrée du passe-haut du son de fond
  float bgHpfOut = 0.0f;    // Sortie du passe-haut du son de fond

  int   playPosA = -1;       // Position de lecture courante de la voix de bouf A
                             // (-1 = inactive)
  int   playPosB = -1;       // Voix de bouf B (fondu sortante du bouf précédent)
  float gainA    = 1.0f;
  float gainB    = 0.55f;

  int  samplesToNextTrigger = 0;   // Nombre d'échantillons avant le prochain déclenchement
  bool altToggle = false;          // Flag d'alternance des cylindres

  float thumpLpf  = 0.0f;   // État du passe-bas du bouf
  float outHpfIn  = 0.0f;   // Entrée du passe-haut de sortie
  float outHpfOut = 0.0f;   // Sortie du passe-haut de sortie

  uint32_t jitterSeed = 987654321;

  unsigned long audioStartMs = millis();

  Serial.println("Tâche audio démarrée");

  while (true) {

    // --- Poursuite lissée du régime (simule l'inertie d'un vrai moteur) ---
    currentRPM += (targetRPM - currentRPM) * RPM_SMOOTHING;

    // Régime courant normalisé dans la plage 0.0 ~ 1.0
    float rpmNorm = clampf((currentRPM - RPM_IDLE) / (RPM_MAX - RPM_IDLE), 0.0f, 1.0f);

    // Incrément de phase du vilebrequin par échantillon (cycle 4 temps / 2)
    float cycleIncrement = ((currentRPM / 60.0f) / (float)SAMPLE_RATE) / 2.0f;

    // Fréquence courante des boufs
    float thumpHz = THUMP_HZ_IDLE + rpmNorm * (THUMP_HZ_MAX - THUMP_HZ_IDLE);
    currentThumpHz = thumpHz;

    // Volume en fonction du régime
    float bgGain = BACKGROUND_GAIN_IDLE + rpmNorm * (BACKGROUND_GAIN_MAX - BACKGROUND_GAIN_IDLE);
    float thumpLayerGain = THUMP_LAYER_GAIN_IDLE + rpmNorm * (THUMP_LAYER_GAIN_MAX - THUMP_LAYER_GAIN_IDLE);

    // La fréquence de coupure du passe-bas monte avec le régime (à haut régime le
    // son de fond est plus brillant)
    float bgLpfAlpha = 0.16f + 0.55f * rpmNorm;

    // Fondu à l'ouverture (pour éviter le « pop » à la mise sous tension)
    float fadeIn = clampf((float)(millis() - audioStartMs) / 1800.0f, 0.0f, 1.0f);

    // --- Génération audio échantillon par échantillon ---
    for (int i = 0; i < DMA_BUF_LEN; i++) {

      // ====================================================
      // Couche 1 : son moteur de fond — superposition des
      // impulsions d'échappement des 8 cylindres
      // ====================================================
      float bg = 0.0f;

      for (int cyl = 0; cyl < NUM_CYLINDERS; cyl++) {
        float phase = crankPhase - cylinderPhase[cyl];
        while (phase < 0.0f) phase += 1.0f;
        while (phase >= 1.0f) phase -= 1.0f;

        float pulse = generateCylinderPulse(phase);
        float cylGain = (cyl % 2 == 0) ? 1.0f : 0.82f;  // Léger écart entre cylindres
                                                        // pairs/impairs, plus réaliste
        bg += pulse * cylGain;
      }

      bg /= (float)NUM_CYLINDERS * 0.42f;

      // Couche harmonique (le grave est mis en avant, on réduit le bourdonnement des
      // harmoniques élevées)
      float basePhase  = crankPhase * 4.0f;
      float harmonics  = 0.0f;

      harmonics += fastSin(basePhase)        * 1.00f;
      harmonics += fastSin(basePhase * 0.5f) * 0.60f;   // Demi-fréquence : renforce le grave
      harmonics += fastSin(basePhase * 1.5f) * 0.28f;
      harmonics += fastSin(basePhase * 2.0f) * (0.25f + 0.10f * rpmNorm);
      harmonics += fastSin(basePhase * 3.0f) * (0.08f + 0.08f * rpmNorm);
      harmonics += fastSin(basePhase * 4.0f) * (0.03f * rpmNorm);  // La 4e harmonique
                                                                  // est la source du
                                                                  // bourdonnement, on
                                                                  // la tasse
      harmonics /= 2.4f;

      bg = bg * 0.55f + harmonics * 0.45f;
      bg = tanhf(bg * (1.05f + rpmNorm * 0.8f));  // Soft-clipping, simule la non-linéarité
                                                  // du tuyau d'échappement

      // Ajout d'un bruit mécanique basse fréquence (ronronnement, pas sifflement)
      float rumble   = pseudoRandom();
      float rumble2  = pseudoRandom();
      bg += (rumble * 0.6f + rumble2 * 0.4f) * (0.008f + 0.018f * rpmNorm);

      // Passe-bas (rend le son plus étouffé, comme s'il sortait d'un pot)
      float bgLpfAlpha2 = 0.18f + 0.45f * rpmNorm;
      bgLpf += bgLpfAlpha2 * (bg - bgLpf);
      bg = bgLpf;

      // Léger passe-haut (supprimé la composante continue)
      float bgHp = 0.992f * (bgHpfOut + bg - bgHpfIn);
      bgHpfIn  = bg;
      bgHpfOut = bgHp;
      bg = bg * 0.92f + bgHp * 0.08f;

      bg *= bgGain;

      // ====================================================
      // Couche 2 : bouf principal — son « pot droit modifié »
      // ====================================================

      // Au bon moment, on déclenche un nouveau bouf
      if (samplesToNextTrigger <= 0) {

        // L'ancien bouf devient la voix B (fondu sortante pour le chevauchement)
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.50f;
        }

        playPosA = 0;

        // Alternance pair/impair : simule la différence de force entre cylindres du V8
        gainA = altToggle ? THUMP_ALT_GAIN : 1.0f;

        // Intervalle avant le prochain déclenchement (avec Swing + jitter pour un
        // rythme plus groove)
        float intervalSamples = (float)SAMPLE_RATE / thumpHz;
        float swingFactor = altToggle ? (1.0f - THUMP_SWING) : (1.0f + THUMP_SWING);
        float jitter = 1.0f + localRandSigned(jitterSeed) * 0.025f;

        samplesToNextTrigger = (int)clampf(intervalSamples * swingFactor * jitter, 1.0f, 999999.0f);
        altToggle = !altToggle;
      }

      samplesToNextTrigger--;

      float thump = 0.0f;

      // Lecture de la voix A
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) {
          thump += thumpTable[playPosA++] * gainA;
        } else {
          playPosA = -1;
        }
      }

      // Lecture de la voix B (fondu sortante du bouf précédent)
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) {
          thump += thumpTable[playPosB++] * gainB;
          gainB *= 0.9992f;  // Fondu sortant lent
        } else {
          playPosB = -1;
        }
      }

      // Passe-bas pour arrondir les bords du bouf
      thumpLpf += 0.58f * (thump - thumpLpf);
      thump = thumpLpf * thumpLayerGain;

      // ====================================================
      // Couche 3 : mixage des deux couches, sortie
      // ====================================================
      float sample = bg + thump;

      // Passe-haut final (supprime la dérive continue basse fréquence)
      float outHp = 0.988f * (outHpfOut + sample - outHpfIn);
      outHpfIn  = sample;
      outHpfOut = outHp;
      sample = sample * 0.86f + outHp * 0.14f;

      // Soft-clipping global (évite la saturation quand les deux couches se
      // superposent)
      sample = tanhf(sample * (1.05f + 0.22f * rpmNorm));

      sample *= MASTER_VOLUME * fadeIn;
      sample  = clampf(sample, -0.98f, 0.98f);

      // Conversion en PCM 16 bits, canaux gauche/droit identiques (haut-parleur mono)
      int16_t out = (int16_t)(sample * PCM_OUTPUT_SCALE);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;

      // Avancement de la phase vilebrequin
      crankPhase += cycleIncrement;
      if (crankPhase >= 1.0f) crankPhase -= 1.0f;
    }

    // Écriture de ce lot de données audio dans le DMA I2S ; on génère le suivant
    // une fois l'écriture terminée
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= Tâche accélérateur (cœur 0, priorité basse) =================
void throttleTask(void *param) {
  while (true) {
    updateThrottle();
    vTaskDelay(pdMS_TO_TICKS(20));  // Mise à jour de l'accélérateur toutes les 20 ms,
                                    // largement suffisant
  }
}

// ================= Tâche de monitoring série (cœur 0, priorité minimale) =================
void monitorTask(void *param) {
  char buf[128];

  while (true) {
    int rpmInt      = (int)(currentRPM + 0.5f);
    int targetInt   = (int)(targetRPM  + 0.5f);
    int throttlePct = (int)(throttleValue * 100.0f + 0.5f);
    int thumpHz10   = (int)(currentThumpHz * 10.0f + 0.5f);

    snprintf(buf, sizeof(buf),
      "RPM=%d  cible=%d  accel=%d%%  encodeur=%d  f_bouf=%d.%dHz",
      rpmInt, targetInt, throttlePct, encoderPosition,
      thumpHz10 / 10, thumpHz10 % 10);

    Serial.println(buf);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

// ================= setup : initialisation du système =================
void setup() {
#if DISABLE_BROWNOUT_FOR_TEST
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  Serial.begin(115200);
  delay(1000);

  // Vérification de l'état de la mémoire au démarrage (PSRAM à 0 = pas démarrée,
  // retournez cocher QSPI)
  Serial.printf("SRAM libre : %d octets\n", ESP.getFreeHeap());
  Serial.printf("PSRAM externe libre : %d octets\n", ESP.getFreePsram());

  Serial.println("====================================");
  Serial.println("Simulateur de son V8 ESP32-S3");
  Serial.println("Bouf principal : pot droit modifié");
  Serial.println("Contrôle accel : encodeur rotatif KY-040");
  Serial.println("====================================");

  initEncoder();
  initSineTable();
  initCylinderPhases();
  buildStraightPipeThumpTable();
  initI2S();

  // Tâche audio : cœur 1, priorité maximale, pile 12 Ko
  xTaskCreatePinnedToCore(audioTask,    "AudioTask", 12288, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  // Tâche accélérateur : cœur 0, priorité 2, pile 3 Ko
  xTaskCreatePinnedToCore(throttleTask, "Throttle",  3072,  NULL, 2,                        NULL, 0);
  // Tâche monitoring : cœur 0, priorité minimale, pile 4 Ko (ne pas trop réduire,
  // sinon débordement de pile)
  xTaskCreatePinnedToCore(monitorTask,  "Monitor",   4096,  NULL, 1,                        NULL, 0);

  Serial.println("Système démarré, tournez l'encodeur pour contrôler l'accélérateur, appuyez pour revenir au ralenti");
}

// loop est quasi inactive : tout le travail est délégué aux tâches FreeRTOS
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

### Explications du code

Le programme est organisé en trois tâches parallèles, ordonnancées par FreeRTOS, qui ne se gênent pas mutuellement :

| Tâche | Cœur | Priorité | Rôle |
|-------|------|----------|------|
| `audioTask` | Cœur 1 | Max | synthétise l'audio échantillon par échantillon, l'écrit dans le DMA I2S |
| `throttleTask` | Cœur 0 | Moyenne | lit l'encodeur toutes les 20 ms, met à jour l'accélérateur |
| `monitorTask` | Cœur 0 | Min | imprime l'état sur le port série toutes les 700 ms |

**La logique de synthèse sonore se décompose en trois couches :**

**Couche 1 : son moteur de fond.** Chacun des 8 cylindres possède sa propre phase ; chaque cylindre déclenche son impulsion d'échappement selon l'angle d'allumage du V8 (0°, 90°, 150° … 450°). La superposition des 8 cylindres produit ce ronronnement grave et continu. Au-dessus de ces impulsions, on ajoute une fondamentale et quelques harmoniques pour apporter de la matière au son moteur.

**Couche 2 : bouf principal.** À intervalle régulier (cadence fixée par `thumpHz`), on relit un « bouf » complet depuis la table précalculée. Le bouf lui-même est une enveloppe en trois temps (attaque → corps → décroissance), combinée à un glissement de fréquence (simulant la relâche de la pression d'échappement) et à un rebond décalé (simulant la résonance du tuyau) : on obtient ce qu'on dirait un pot droit modifié de voiture de course.

**Couche 3 : mixage et sortie.** Une fois les deux couches additionnées, on passe un soft-clipping global pour éviter tout « pop » de saturation, on multiplie par le coefficient de fondu (pour éviter le « pop » à la mise sous tension), puis on écrit le résultat en PCM stéréo 16 bits vers le périphérique I2S.



## Outil de réglage des boufs (optionnel)

Pour trouver plus rapidement le son d'échappement qui me conviendrait, j'ai écrit une variante : un testeur à carrousel piloté par le port série, intégrant 30 préréglages que l'on peut interchanger via des commandes série afin de comparer directement quel « bouf » vous parle le plus. Dans le programme principal, c'est finalement le numéro 23, « pot droit modifié », qui est utilisé.

```c
/*
 * ESP32-S3 + MAX98357A
 * Testeur de carrousel de boufs V2
 * 30 préréglages + volume largement relevé
 *
 * Câblage :
 *   BCLK -> GPIO16
 *   LRC  -> GPIO17
 *   DIN  -> GPIO15
 *
 * Commandes série (115200) :
 *   n     Suivant
 *   p     Précédent
 *   r     Rejouer
 *   s     Arrêter le carrousel auto
 *   a     Activer le carrousel auto
 *   b     Activer/désactiver le fond
 *   1~30  Aller au numéro correspondant
 *   h     Aide
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

#define SAMPLE_RATE     22050
#define DMA_BUF_COUNT   8
#define DMA_BUF_LEN     256

#define PRESET_PLAY_MS  5000
#define SLOW_PART_MS    2500
#define TEST_SLOW_HZ    2.2f
#define TEST_FAST_HZ    5.0f

#define SINE_TABLE_SIZE 2048
#define THUMP_TABLE_MAX 8000

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

static int16_t stereoBuffer[DMA_BUF_LEN * 2];

volatile int requestedPresetIndex = 0;
volatile uint32_t presetStartMs = 0;
volatile bool backgroundEnabled = true;

bool autoPlay = true;
uint32_t lastSwitchMs = 0;
String cmdBuffer;

static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;
  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= Structure des paramètres d'un préréglage =================
struct ThumpPreset {
  const char* name;
  float attackMs;
  float bodyMs;
  float tailMs;
  float fStart;
  float fBody;
  float fEnd;
  float noiseMix;
  float tone2Mix;
  float tone3Mix;
  float subMix;
  float drive;
  float burstMix;
  float reboundDelayMs;
  float reboundGain;
  float altGain;
  float swing;
  float gain;
  float rumbleGain;
};

//  nom                          atk  body tail  fS   fB   fE  noise t2   t3   sub  drv  burst rebMs rebG  alt   swng  gain  rumble
const ThumpPreset presets[] = {
  {"01 Grosse cylindrée grave",    12,  65, 100,  55,  42,  34,  0.18, 0.24, 0.08, 0.28, 1.7, 0.18, 44, 0.22, 1.00, 0.00, 2.8, 0.20},
  {"02 Plus rond et dense",        14,  75, 130,  52,  40,  32,  0.12, 0.18, 0.04, 0.32, 1.5, 0.10, 50, 0.18, 1.00, 0.00, 2.9, 0.16},
  {"03 Petite trompette renforcée A", 7,  42,  65, 100,  80,  65,  0.16, 0.30, 0.14, 0.06, 1.6, 0.16, 32, 0.14, 1.00, 0.00, 2.6, 0.12},
  {"04 Petite trompette renforcée B", 5,  35,  55, 120,  95,  78,  0.14, 0.36, 0.20, 0.04, 1.7, 0.12, 26, 0.12, 1.00, 0.00, 2.5, 0.10},
  {"05 V8 américain au ralenti",    9,  55,  95,  72,  56,  44,  0.22, 0.26, 0.10, 0.14, 1.8, 0.24, 42, 0.30, 0.80, 0.20, 2.7, 0.22},
  {"06 Plus gargouillant, irrégulier", 11,  58, 105,  68,  52,  42,  0.24, 0.22, 0.08, 0.18, 1.8, 0.22, 54, 0.38, 0.72, 0.26, 2.8, 0.24},
  {"07 Double bouf à contre-pression", 8,  48,  85,  80,  62,  48,  0.20, 0.26, 0.12, 0.12, 1.7, 0.20, 58, 0.48, 0.88, 0.14, 2.6, 0.18},
  {"08 Brut et claquement",         6,  40,  68,  90,  72,  56,  0.28, 0.32, 0.16, 0.08, 2.2, 0.32, 34, 0.22, 0.90, 0.10, 2.5, 0.15},
  {"09 Très épais et sourd",       16,  85, 150,  48,  38,  30,  0.08, 0.14, 0.02, 0.36, 1.6, 0.06, 58, 0.20, 1.00, 0.00, 3.0, 0.14},
  {"10 Punch court et puissant",    4,  28,  45, 100,  78,  60,  0.14, 0.38, 0.20, 0.04, 1.8, 0.12, 22, 0.10, 1.00, 0.00, 2.4, 0.10},
  {"11 Pot d'échappement rauque",   8,  50,  88,  82,  64,  50,  0.32, 0.24, 0.10, 0.10, 1.9, 0.34, 40, 0.26, 0.86, 0.12, 2.6, 0.16},
  {"12 Canon grave",               13,  68, 115,  58,  46,  36,  0.14, 0.20, 0.06, 0.30, 1.8, 0.14, 48, 0.26, 1.00, 0.00, 2.9, 0.20},
  {"13 Punch médium net",           6,  36,  58, 130, 100,  78,  0.10, 0.40, 0.24, 0.02, 1.6, 0.08, 28, 0.10, 1.00, 0.00, 2.4, 0.08},
  {"14 Double impulsion gargouillis", 7,  44,  78,  85,  66,  52,  0.18, 0.28, 0.14, 0.10, 1.8, 0.20, 20, 0.45, 0.82, 0.18, 2.6, 0.16},
  {"15 V8 ancien, sensation lâche", 10,  60, 108,  72,  55,  44,  0.24, 0.22, 0.08, 0.16, 1.7, 0.20, 52, 0.32, 0.68, 0.30, 2.7, 0.22},
  {"16 Test ultra-épais",          15,  95, 160,  54,  42,  32,  0.06, 0.14, 0.02, 0.38, 1.6, 0.04, 64, 0.18, 1.00, 0.00, 3.2, 0.12},
  {"17 Style Harley-Davidson",      8,  52,  90,  78,  58,  46,  0.26, 0.24, 0.10, 0.16, 1.9, 0.26, 48, 0.35, 0.65, 0.32, 2.8, 0.25},
  {"18 Sportif haut régime, tranchant", 4,  30,  50, 140, 110,  88,  0.12, 0.42, 0.28, 0.02, 1.8, 0.10, 20, 0.08, 1.00, 0.00, 2.3, 0.08},
  {"19 Diesel claquement",         14,  48,  80,  65,  50,  42,  0.30, 0.18, 0.06, 0.20, 2.0, 0.28, 38, 0.40, 0.75, 0.22, 2.7, 0.20},
  {"20 Gros cruiser",              12,  72, 125,  60,  45,  36,  0.16, 0.20, 0.06, 0.34, 1.7, 0.12, 55, 0.24, 1.00, 0.00, 3.0, 0.18},
  {"21 Ultra-agressif, explosion",  3,  25,  40, 110,  85,  68,  0.35, 0.34, 0.18, 0.06, 2.5, 0.40, 18, 0.15, 0.92, 0.08, 2.4, 0.12},
  {"22 Grosse cylindrée douce",    16,  90, 140,  50,  40,  34,  0.10, 0.16, 0.04, 0.30, 1.4, 0.06, 60, 0.16, 1.00, 0.00, 3.0, 0.10},
  {"23 Pot droit modifié",          5,  38,  62, 105,  82,  64,  0.22, 0.30, 0.16, 0.08, 2.1, 0.28, 30, 0.18, 0.94, 0.06, 2.5, 0.14},
  {"24 Grave + forte contre-pression", 10,  58,  95,  65,  50,  40,  0.18, 0.22, 0.08, 0.22, 1.8, 0.16, 65, 0.52, 0.85, 0.16, 2.8, 0.20},
  {"25 Rafale d'air",               6,  35,  55,  88,  68,  52,  0.38, 0.20, 0.08, 0.10, 1.7, 0.45, 28, 0.14, 1.00, 0.00, 2.5, 0.12},
  {"26 Sensation 3 cylindres",     10,  45,  75,  74,  58,  46,  0.20, 0.22, 0.10, 0.14, 1.8, 0.20, 36, 0.30, 0.60, 0.35, 2.6, 0.18},
  {"27 Test subwoofer ultra-grave", 18, 100, 180,  42,  32,  26,  0.06, 0.12, 0.02, 0.42, 1.5, 0.04, 70, 0.20, 1.00, 0.00, 3.4, 0.08},
  {"28 Coups bien sentis",          5,  32,  48,  95,  75,  58,  0.16, 0.34, 0.18, 0.06, 2.0, 0.16, 24, 0.12, 1.00, 0.00, 2.6, 0.10},
  {"29 Vrombissement pleine bande",  8,  55,  90,  85,  65,  50,  0.20, 0.28, 0.14, 0.18, 1.9, 0.22, 42, 0.28, 0.88, 0.12, 2.8, 0.20},
  {"30 Test contraste extrême",     3,  20,  35, 150, 120,  90,  0.40, 0.44, 0.28, 0.02, 2.4, 0.45, 16, 0.08, 1.00, 0.00, 2.2, 0.06},
};

const int NUM_PRESETS = sizeof(presets) / sizeof(presets[0]);

// ================= Initialisation =================
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

void initI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = DMA_BUF_COUNT,
    .dma_buf_len = DMA_BUF_LEN,
    .use_apll = false,
    .tx_desc_auto_clear = true,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_BCLK,
    .ws_io_num = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S OK");
}

// ================= Construction de la table d'onde =================
void buildThumpTable(int presetIndex) {
  const ThumpPreset &p = presets[presetIndex];

  int attackS  = (int)(p.attackMs  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(p.bodyMs    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(p.tailMs    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(p.reboundDelayMs * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;
  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1 = 0, phase2 = 0, phase3 = 0, phaseSub = 0;
  float noiseLP1 = 0, noiseLP2 = 0;
  uint32_t seed = 24681357;

  for (int i = 0; i < totalLen; i++) {
    float env1 = 0.0f;
    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    int j = i - reboundS;
    float env2 = 0.0f;
    if (j >= 0) {
      if (j < attackS) {
        float x = (float)j / (float)attackS;
        env2 = smoothstep01(x); env2 *= env2;
      } else if (j < attackS + bodyS) {
        float x = (float)(j - attackS) / (float)bodyS;
        env2 = 1.0f - 0.28f * x;
      } else if (j < mainLen) {
        float x = (float)(j - attackS - bodyS) / (float)tailS;
        env2 = 0.72f * expf(-3.8f * x);
      }
      env2 *= p.reboundGain;
    }

    float env = env1 + env2;
    env = clampf(env, 0.0f, 1.5f);

    float freq = p.fEnd;
    if (i < attackS) freq = p.fStart;
    else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      freq = p.fStart + (p.fBody - p.fStart) * x;
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      freq = p.fBody + (p.fEnd - p.fBody) * x;
    }

    float inc1 = freq / (float)SAMPLE_RATE;
    phase1 += inc1;       if (phase1 >= 1.0f) phase1 -= 1.0f;
    phase2 += inc1 * 2;   if (phase2 >= 1.0f) phase2 -= 1.0f;
    phase3 += inc1 * 3;   if (phase3 >= 1.0f) phase3 -= 1.0f;
    phaseSub += inc1 * 0.5f; if (phaseSub >= 1.0f) phaseSub -= 1.0f;

    float base = fastSin(phase1);
    base = tanhf(base * p.drive);

    float tonal = 0.82f * base
                + p.tone2Mix * fastSin(phase2)
                + p.tone3Mix * fastSin(phase3)
                + p.subMix   * fastSin(phaseSub);

    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;

    float air = bandNoise * (p.noiseMix * (0.25f * env + p.burstMix * 0.75f * earlyEnv));

    float sample = tonal * env + air;
    sample += 0.08f * env * env1;

    if (sample > 0.0f) sample = tanhf(sample * 1.15f) * 1.05f;
    else sample = tanhf(sample * 0.85f);

    sample *= p.gain;
    sample = clampf(sample, -1.0f, 1.0f);

    thumpTable[i] = sample;
  }

  thumpTableLen = totalLen;
}

// ================= Contrôle série =================
void showHelp() {
  Serial.println();
  Serial.println("===== Commandes =====");
  Serial.println("n     Suivant");
  Serial.println("p     Précédent");
  Serial.println("r     Rejouer");
  Serial.println("s     Arrêter le carrousel auto");
  Serial.println("a     Activer le carrousel auto");
  Serial.println("b     Activer/désactiver le fond");
  Serial.println("1~30  Aller au numéro");
  Serial.println("h     Aide");
  Serial.println("================");
}

void printPresetInfo(int idx) {
  Serial.println();
  Serial.println("========================================");
  Serial.print("Préréglage #");
  Serial.print(idx + 1);
  Serial.print(" / ");
  Serial.println(NUM_PRESETS);
  Serial.println(presets[idx].name);
  Serial.print("2,5 s de boufs lents puis 2,5 s de boufs rapides, fond : ");
  Serial.println(backgroundEnabled ? "on" : "off");
  Serial.println("========================================");
}

void requestPreset(int idx) {
  while (idx < 0) idx += NUM_PRESETS;
  while (idx >= NUM_PRESETS) idx -= NUM_PRESETS;
  requestedPresetIndex = idx;
  presetStartMs = millis();
  lastSwitchMs = millis();
  printPresetInfo(idx);
}

void processCommand(String cmd) {
  cmd.trim();
  cmd.toLowerCase();
  if (cmd.length() == 0) return;

  if (cmd == "n") { requestPreset(requestedPresetIndex + 1); return; }
  if (cmd == "p") { requestPreset(requestedPresetIndex - 1); return; }
  if (cmd == "r") { requestPreset(requestedPresetIndex); return; }
  if (cmd == "s") { autoPlay = false; Serial.println("Carrousel auto arrêté"); return; }
  if (cmd == "a") { autoPlay = true; lastSwitchMs = millis(); Serial.println("Carrousel auto activé"); return; }
  if (cmd == "b") { backgroundEnabled = !backgroundEnabled; Serial.print("Fond : "); Serial.println(backgroundEnabled ? "on" : "off"); return; }
  if (cmd == "h") { showHelp(); return; }

  int n = cmd.toInt();
  if (n >= 1 && n <= NUM_PRESETS) { requestPreset(n - 1); return; }

  Serial.print("Inconnu : ");
  Serial.println(cmd);
}

// ================= Tâche audio =================
void audioTask(void *param) {
  int loadedPreset = -1;
  ThumpPreset currentPreset;

  int playPosA = -1, playPosB = -1;
  float gainA = 1.0f, gainB = 0.5f;
  int samplesToNextTrigger = 0;
  bool altToggle = false;

  float thumpLP = 0.0f;
  float hpIn = 0.0f, hpOut = 0.0f;
  float bgPhase1 = 0, bgPhase2 = 0;
  float bgNoise1 = 0, bgNoise2 = 0;
  uint32_t bgSeed = 123456789;

  while (true) {
    int req = requestedPresetIndex;

    if (req != loadedPreset) {
      currentPreset = presets[req];
      buildThumpTable(req);
      loadedPreset = req;
      playPosA = -1; playPosB = -1;
      gainA = 1.0f; gainB = 0.5f;
      samplesToNextTrigger = 0;
      altToggle = false;
      thumpLP = 0.0f;
    }

    uint32_t ageMs = millis() - presetStartMs;
    float baseHz = (ageMs < SLOW_PART_MS) ? TEST_SLOW_HZ : TEST_FAST_HZ;
    float speedNorm = (ageMs < SLOW_PART_MS) ? 0.25f : 0.70f;

    for (int i = 0; i < DMA_BUF_LEN; i++) {
      if (samplesToNextTrigger <= 0) {
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.55f;
        }
        playPosA = 0;
        gainA = altToggle ? currentPreset.altGain : 1.0f;

        float intervalSamples = (float)SAMPLE_RATE / baseHz;
        float swingFactor = altToggle ? (1.0f - currentPreset.swing) : (1.0f + currentPreset.swing);
        if (swingFactor < 0.2f) swingFactor = 0.2f;
        samplesToNextTrigger = (int)(intervalSamples * swingFactor);
        if (samplesToNextTrigger < 1) samplesToNextTrigger = 1;
        altToggle = !altToggle;
      }
      samplesToNextTrigger--;

      float thump = 0.0f;
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) { thump += thumpTable[playPosA] * gainA; playPosA++; }
        else playPosA = -1;
      }
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) { thump += thumpTable[playPosB] * gainB; playPosB++; gainB *= 0.9993f; }
        else playPosB = -1;
      }

      thumpLP += 0.55f * (thump - thumpLP);
      thump = thumpLP;

      float bg = 0.0f;
      if (backgroundEnabled) {
        float bgFreq = 28.0f + speedNorm * 36.0f;
        bgPhase1 += bgFreq / (float)SAMPLE_RATE;
        if (bgPhase1 >= 1.0f) bgPhase1 -= 1.0f;
        bgPhase2 += (bgFreq * 2.1f) / (float)SAMPLE_RATE;
        if (bgPhase2 >= 1.0f) bgPhase2 -= 1.0f;
        float white = localRandSigned(bgSeed);
        bgNoise1 += 0.06f * (white - bgNoise1);
        bgNoise2 += 0.015f * (bgNoise1 - bgNoise2);
        bg = fastSin(bgPhase1) * 0.65f + fastSin(bgPhase2) * 0.18f + bgNoise2 * 0.07f;
        bg = tanhf(bg * 1.35f) * currentPreset.rumbleGain;
      }

      float sample = thump + bg;

      float hp = 0.985f * (hpOut + sample - hpIn);
      hpIn = sample;
      hpOut = hp;
      sample = sample * 0.82f + hp * 0.18f;

      // ★ Clé : gain de sortie final largement relevé
      sample *= 1.8f;

      sample = tanhf(sample * 1.1f);
      sample = clampf(sample, -0.98f, 0.98f);

      // ★ Sortie pleine échelle
      int16_t out = (int16_t)(sample * 30000.0f);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;
    }

    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= setup / loop =================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("====================================");
  Serial.println("Testeur de carrousel de boufs V2");
  Serial.println("30 préréglages + version volume max");
  Serial.println("====================================");

  initSineTable();
  initI2S();
  showHelp();
  requestPreset(0);

  xTaskCreatePinnedToCore(audioTask, "Audio", 10240, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  Serial.println("Démarrage de la lecture...");
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r' || c == '\n') {
      if (cmdBuffer.length() > 0) {
        processCommand(cmdBuffer);
        cmdBuffer = "";
      }
    } else {
      cmdBuffer += c;
    }
  }

  if (autoPlay) {
    if (millis() - lastSwitchMs >= PRESET_PLAY_MS) {
      int nextIdx = requestedPresetIndex + 1;
      if (nextIdx >= NUM_PRESETS) nextIdx = 0;
      requestPreset(nextIdx);
    }
  }

  delay(10);
}
```




---

## Dépannage fréquent

Pas de panique, 90 % des problèmes se situent dans les quelques cas suivants ; un passage en revue suffit en général à s'en sortir :

**Aucun son dans le haut-parleur une fois alimenté**

Commencez par la broche SD. Si la broche SD du MAX98357A est tirée accidentent vers le LOW (par exemple en touchant le GND, ou en l'ayant laissée flottante), le module passe en mode muet. Laissez SD flottante ou reliez-la au 3,3 V, puis remettez sous tension. Vérifiez ensuite dans le moniteur série que l'initialisation I2S ne remonte aucune erreur et qu'il n'y a pas le message « Échec d'installation du pilote I2S ».

**Le son est très faible, à peine audible**

Vérifiez d'abord l'impédance du haut-parleur. Le MAX98357A délivre 3 W sur 4 Ω, mais seulement environ 1,4 W sur 8 Ω, soit moitié moins. Vérifiez ensuite que VIN est bien sur 5 V : sur 3,3 V la puissance chute fortement. Vous pouvez aussi augmenter dans le code `PCM_OUTPUT_SCALE` de 26000 à 30000, mais ne dépassez pas 32767 — au-delà, débordement et distorsion.

**Le sens de rotation de l'encodeur est inversé (sens horaire = réduire, anti-horaire = augmenter)**

Dans `encoderISR()`, inversez `encoderPosition++` et `encoderPosition--`, ou plus simplement croisez physiquement les fils CLK et DT — l'une ou l'autre solution convient.

**Crash et redémarrage immédiat au démarrage, avec `Stack canary watchpoint triggered` sur le port série**

Il s'agit d'un débordement de pile d'une tâche FreeRTOS ; le nom de la tâche est indiqué dans le message (par exemple `Monitor`). Repérez la tâche concernée et augmentez la taille de pile dans l'appel `xTaskCreatePinnedToCore` (le 3e nombre), au moins 4096 pour la tâche Monitor, ou 8192 si ce n'est pas assez.

**Le port série affiche `OOM: failed to allocate XXX bytes`**

Débordement mémoire. Vérifiez dans cet ordre :

1. Dans l'IDE Arduino, **Outils → PSRAM** doit être activé et réglé sur **QSPI PSRAM** (pas OPI)
2. Ajoutez en début de `setup()` un `Serial.printf("PSRAM: %d\n", ESP.getFreePsram());`, re-téléversez et regardez le port série : si la valeur affichée est 0, la PSRAM n'est pas démarrée, retournez corriger l'option
3. Vérifiez que votre carte a bien une PSRAM externe (sur l'ESP32-S3-WROOM-1-**N16R8**, le « R8 » signifie 8 Mo de PSRAM)

**« Pop » régulier ou grésillement**

C'est presque toujours un problème de masse commune. Le GND de l'ESP32-S3 et celui du MAX98357A doivent être reliés sur le même fil, pas sur deux masses d'alimentation séparées. Mesurez à l'ohmmètre la résistance entre les deux GND : elle doit être proche de 0 Ω.

---

## FAQ

**Q : Les GPIO16/17/15 de l'ESP32-S3 sont déjà utilisés, puis-je choisir d'autres broches ?**
R : Oui, les broches I2S peuvent être librement redirigées vers n'importe quel GPIO. Il suffit de modifier les trois macros `I2S_BCLK`, `I2S_LRC`, `I2S_DOUT` en haut du code avec les numéros de broches voulus. Attention toutefois aux GPIO 0, 1, 2, 3, 43 et 44 qui ont des fonctions spéciales : évitez-les.

**Q : Peut-on brancher deux haut-parleurs pour de la stéréo ?**
R : Le MAX98357A est un amplificateur mono. Pour de la stéréo, il faut deux modules : l'un sur le canal gauche, l'autre sur le droit, distingués par le câblage de la broche GAIN (un relié au GND = canal droit, l'autre laissé flottant = canal gauche). Dans le code, les données PCM gauche et droite sont actuellement identiques (`stereoBuffer[i*2] = stereoBuffer[i*2+1] = out`) ; pour de la vraie stéréo, il faudrait aussi modifier la logique de synthèse.

**Q : La fréquence d'échantillonnage de 22050 Hz est-elle suffisante ? Peut-on passer à 44100 Hz ?**
R : 22050 Hz est largement suffisant pour un contenu plutôt grave-médium comme un son de moteur : on peut restituer jusqu'à 11025 Hz, et la perception du son moteur se situe essentiellement entre 50 Hz et 4 kHz. Le passage à 44100 Hz est théoriquement possible, mais il double la charge CPU ; testez d'abord la stabilité, et modifiez conjointement `SAMPLE_RATE` et le champ `sample_rate` de la configuration I2S.

**Q : Une alimentation 5 V ne va-t-elle pas griller l'ESP32-S3 ?**
R : Le VIN du MAX98357A est sur 5 V, mais ses broches de signal (BCLK, LRC, DIN) sont en logique 3,3 V, que l'on peut relier directement aux GPIO de l'ESP32-S3 sans conversion de niveau. Les GPIO de l'ESP32-S3 sortent du 3,3 V, parfaitement reconnus par le MAX98357A, donc tout va bien.

**Q : Au ralenti le son est trop faible, on l'entend mal, peut-on l'augmenter ?**
R : Réglez `BACKGROUND_GAIN_IDLE` (par défaut 0,45) et `THUMP_LAYER_GAIN_IDLE` (par défaut 0,75), augmentez-les tous les deux, par exemple à 0,6 et 1,0, et le volume au ralenti montera sensiblement. Après modification, vérifiez qu'il n'y a pas de « pop » à l'accélérateur plein ; si oui, baissez très légèrement `PCM_OUTPUT_SCALE`.

**Q : Un cran du KY-040 fait varier l'accélérateur de 10 %, c'est trop, peut-on affiner ?**
R : Diminuez `ENCODER_STEP_SIZE`, par exemple à 0,05 : cela fait 5 % par cran, soit 20 crans pour atteindre l'accélérateur plein, pour un ressenti plus fin.

**Q : Le programme peut-il tourner sur un ESP32 (non S3) ?**
R : Compatible en théorie : l'API I2S est commune, mais un ESP32 classique n'a généralement pas de PSRAM externe (ou très peu), donc ce projet risque de manquer de mémoire. Privilégiez un modèle avec PSRAM, par exemple l'ESP32-WROVER. Le mapping des numéros GPIO est aussi à refaire en fonction de votre carte.

---

## Pistes d'extension

Une fois la version de base maîtrisée, voici quelques directions possibles :

- **Capteur de vitesse** : montez un capteur à effet Hall sur la roue, plus le vélo va vite plus l'accélérateur s'ouvre tout seul — sans les mains
- **Sonorités V6 / 4 cylindres / moto** : modifiez `NUM_CYLINDERS` et `firingAngles`, changez les angles d'allumage et vous obtiendrez un autre type de moteur
- **Écran TFT** : affichez le compte-tours et le pourcentage d'accélérateur pour un vrai tableau de bord
- **Boîtier étanche** : pour un usage sur un vélo électrique, l'étanchéité reste importante sous la pluie — une carte qui prend l'eau, c'est encore plus embêtant que l'absence de son

---

## Références

- [Fiche technique MAX98357A (Analog Devices)](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [Page produit MAX98357A (Analog Devices)](https://www.analog.com/en/products/max98357a.html)
- [Manuel de référence technique ESP32-S3 (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [Page produit ESP32-S3-WROOM-1 (Espressif)](https://www.espressif.com/en/products/modules/esp32-s3)
- [ESP32 Arduino Core (GitHub)](https://github.com/espressif/arduino-esp32)
- [Documentation de l'API FreeRTOS xTaskCreatePinnedToCore](https://www.freertos.org/a00125.html)
