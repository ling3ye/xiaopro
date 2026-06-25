---
title: "ESP32-S3 : Tableau de bord de la qualité de l'air avec écran GC9A01 + MQ135 (LVGL v9 + SPI + Arduino C++)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-25
intro: "Utilisez un ESP32-S3 + capteur de gaz MQ135 + écran circulaire GC9A01 de 1,28 pouces avec LVGL v9 pour créer un tableau de bord de la qualité de l'air avec jauge à arc animée, courbe de tendance en temps réel et effet de lueur respiratoire. Guide complet de câblage, code et dépannage."
image: "https://img.lingluft.com/2026/06/4217f9f4026039eeca35a691450313dc.jpg"
---




> Difficulté : ⭐⭐☆☆☆ (quelques fils Dupont suffisent pour commencer)
> Temps estimé : 45 minutes
> Environnement de test : Arduino IDE 2.3.8 · ESP32 Arduino Core 3.x · lvgl v9.5.0 · Arduino_GFX_Library v1.6.5

---

> **TL;DR (Pour aller droit au but)**
>
> **Avertissement :** Ce projet est destiné à l'apprentissage, comme objet de bureau et pour le plaisir visuel. **Ne l'utilisez jamais pour détecter de vraies fuites de gaz dangereux !** Sa précision est plutôt "approximative".
>
> 1. **Câblage** : MQ135 A0 → GPIO 13 ; GC9A01 selon le tableau vers GPIO 7 / 9 / 10 / 11 / 12 / 18
> 2. **Bibliothèques** : Gestionnaire de bibliothèques Arduino → recherchez `lvgl` (choisissez v9.x) + `Arduino_GFX_Library`
> 3. **Configurer lv_conf.h** : activez `LV_FONT_MONTSERRAT_14` et `LV_FONT_MONTSERRAT_28` (changez 0 → 1)
> 4. Flashage → l'écran s'allume, la jauge commence à tourner

---

## Introduction

Dans ma pile de capteurs poussiéreux, j'ai trouvé un capteur spécialisé pour la qualité de l'air — le module MQ135. Je voulais voir la qualité de l'air dans mon atelier, alors je l'ai connecté et j'ai fait des tests. La documentation m'a dit que ce module nécessite un préchauffage de 24 heures, ce qui m'a semblé un peu limité pour le "jeu". Cependant, ce module est sensible à plusieurs gaz ; bien qu'il ne soit pas nécessairement précis, une augmentation des valeurs indique relativement la présence de certains gaz : dioxyde de carbone, ammoniac, benzène, alcool, fumée. Il devrait convenir pour juger si une pièce a besoin d'aération basée sur des valeurs relatives.

C'est ainsi qu'est né ce projet : ESP32-S3 + capteur de gaz MQ135 + écran circulaire GC9A01 de 1,28 pouces, avec la célèbre bibliothèque graphique LVGL v9, pour créer un tableau de bord de la qualité de l'air avec jauge à arc, courbe de tendance en temps réel, et effet de "respiration" de changement de couleur.

Objectif de cet article : **du câblage zéro au flashage réussi, reproduire complètement cet effet.**

---

## Résultat de l'expérience

L'écran circulaire affiche en temps réel la valeur ADC de la qualité de l'air actuelle, le niveau de statut (EXCELLENT / GOOD / FAIR / MODERATE / POOR / DANGER) et la courbe de tendance historique ; la couleur de la jauge passe du vert au rouge selon la qualité de l'air, avec un effet de lueur "respiratoire" rythmique sur le cercle extérieur. Le coin inférieur gauche de l'écran enregistre également les valeurs minimales et maximales depuis le dernier démarrage.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/2M6HRdpfW-Q" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Présentation des composants

> La carte de développement (ESP32-S3) n'est pas présentée dans cet article ; seuls les deux modules que les débutants n'ont peut-être jamais rencontrés sont décrits ci-dessous.

### Capteur de gaz MQ135

Le MQ135 est un capteur sensible au gaz, chargé de détecter les changements de concentration de gaz nocifs tels que le CO₂, l'ammoniac, le benzène dans l'air. Dans ce projet, il sert à sortir une valeur ADC analogique de 0 à 4095, reflétant le niveau de qualité de l'air de l'environnement actuel.

En termes simples : **c'est un "nez" chimique** — plus l'air est vicié, plus la tension de sortie est élevée, plus la valeur ADC est grande.

| Paramètre | Valeur |
|-----------|--------|
| Tension de fonctionnement standard | 5V (fil chauffant) / sortie analogique compatible 3.3V |
| Interface de sortie | Analogique (A0) + Numérique (D0) |
| Temps de préchauffage | 24~48 heures (pleine précision) / environ 3 minutes (référence de tendance) |
| Gaz détectables | CO₂, NH₃, NOₓ, benzène, alcool, fumée |

**À propos de l'alimentation 3.3V :** La tension standard du MQ135 est 5V. Avec une alimentation 3.3V, la puissance du fil chauffant est d'environ 44% de la normale, la sensibilité diminue et les lectures sont plus faibles, mais cela suffit pour l'affichage des tendances et la détection des changements relatifs. Pour une précision absolue, il est recommandé d'alimenter le VCC séparément avec 5V ; la sortie analogique A0 ne dépasse pas 3.3V et peut être connectée directement à l'ESP32-S3 sans diviseur de tension.

Raison de son choix : **bon marché (moins de 5 yuans), modulaire, prêt à l'emploi après simple câblage** — suffisant pour ce projet "orienté esthétique".

**Bonne utilisation du MQ135 pour les jugements intérieurs**

```
✅ Convient pour :
  - Surveillance des tendances de la qualité de l'air (valeurs relatives)
  - Jugement de seuil pour déclencher la ventilation/alarme
  - Indication de "pollution combinée" de plusieurs gaz nocifs

❌ Pas convient pour :
  - Mesure précise de concentration d'un gaz unique
  - Tests de conformité de sécurité médicale/industrielle
  - Valeurs précises de CO₂ (erreur peut atteindre ±300ppm ou plus)
```

---

### Écran TFT circulaire GC9A01 1.28 pouces

Le GC9A01 est un écran LCD TFT circulaire de 1,28 pouces qui reçoit les données d'image via l'interface SPI et les affiche. Dans ce projet, il affiche l'interface de jauge avec effets d'animation.

Analogie : **comme ces cadrans circulaires sur les montres intelligentes qui peuvent afficher n'importe quel contenu.**

| Paramètre | Valeur |
|-----------|--------|
| Taille de l'écran | 1,28 pouces |
| Résolution | 240 × 240 pixels |
| Interface | SPI (jusqu'à 80 MHz) |
| Pilote d'écran | GC9A01 |
| Tension de fonctionnement | 3.3V |
| Contrôle du rétroéclairage | Pris en charge (broche BL, dimmable PWM) |

Raison de son choix : **forme circulaire unique, taille compacte, utilisation directe 3.3V, support natif par Arduino_GFX_Library** — excellent avec LVGL pour les effets visuels de cadran.

---

## Liste des composants (BOM)

| Composant | Modèle / Spécification | Quantité |
|-----------|----------------------|----------|
| Carte principale | ESP32-S3 (avec USB-C) | 1 |
| Écran TFT circulaire | GC9A01 1.28" 240×240 | 1 |
| Capteur de gaz | Module MQ135 | 1 |
| Fils de connexion | Fils Dupont | Quelques-uns |



---

## Description des broches des composants

### Broches du module MQ135

| Broche | Description |
|--------|-------------|
| VCC | Alimentation (connecté à 3.3V dans ce projet, standard est 5V) |
| GND | Masse |
| A0 | Sortie de signal analogique, connecté à la broche ADC de l'ESP32-S3 |
| D0 | Sortie numérique (non utilisée dans ce projet) sortie **niveau haut/bas (HIGH / LOW)** |

### Broches du module GC9A01

| Marquage de broche | Description |
|-------------------|-------------|
| VCC | Alimentation 3.3V |
| GND | Masse |
| SCL / CLK | Horloge SPI |
| SDA / MOSI | Données SPI |
| CS | Sélection de puce (actif à l'état bas) |
| DC | Commutation données/commandes |
| RST | Reset (reset à l'état bas) |
| BL | Contrôle du rétroéclairage (HIGH = allumé) (optionnel, pas forcément disponible sur tous les modules) |

---

## Schéma de câblage

### MQ135 → ESP32-S3

| MQ135 | ESP32-S3 |
|-------|----------|
| VCC | 5V |
| GND | GND |
| A0 | GPIO 13 |

### GC9A01 → ESP32-S3

| Broche GC9A01 | GPIO ESP32-S3 |
|--------------|---------------|
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL (rétroéclairage) | GPIO 7 (si disponible, sinon non connecté) |

> **Rappel pratique :** Après le câblage, vérifiez ligne par ligne les deux tableaux ci-dessus — cela fait gagner 80% du temps de dépannage. L'erreur la plus fréquente est d'inverser DC et CS — une fois ces deux fils échangés, l'écran devient tout blanc ou tout noir, ce qui ressemble beaucoup à "l'écran est cassé", mais en fait les fils sont juste mal branchés.

---

## Bibliothèques à installer

Ouvrez Arduino IDE → Outils → Gérer les bibliothèques, recherchez et installez les deux suivantes :

| Nom de la bibliothèque | Auteur | Version testée |
|-----------------------|--------|----------------|
| `lvgl` | LVGL | v9.5.0 |
| `Arduino_GFX_Library` | Moon On Our Nation | v1.6.5 |

**Après l'installation de lvgl, une étape obligatoire reste :**

1. Trouvez le répertoire de la bibliothèque lvgl (généralement dans `Documents/Arduino/libraries/lvgl/`)
2. Copiez le fichier `lv_conf_template.h` à l'intérieur, renommez-le en `lv_conf.h`, et placez-le dans le même répertoire que `lvgl/`
3. Ouvrez `lv_conf.h`, trouvez les deux lignes suivantes, et changez `0` en `1` :
   ```c
   #define LV_FONT_MONTSERRAT_14  1
   #define LV_FONT_MONTSERRAT_28  1
   ```
4. Ouvrez `lv_conf.h`, trouvez le tout début `#if 0` et changez-le en `#if 1`

> Si vous oubliez cette étape et flashez directement, la compilation générera une erreur `lv_font_montserrat_28 undeclared`. Ne me demandez pas comment je le sais.

---

## Code complet

```cpp
/*
 * ESP32-S3 + Écran circulaire GC9A01 tableau de bord qualité de l'air v3.1
 * "Style technologique minimaliste" - barre de progression arc + courbe de tendance temps réel + lueur respiratoire
 *
 * Environnement de test : Arduino IDE 2.3.2 / ESP32 Core 3.x
 * Bibliothèques dépendantes : lvgl v9.2.x + Arduino_GFX_Library v1.4.x
 */

#include <Arduino.h>
#include <lvgl.h>
#include <Arduino_GFX_Library.h>
#include <math.h>

// ===================== Définition des broches =====================
#define TFT_SCK    12   // Horloge SPI
#define TFT_MOSI   11   // Données SPI
#define TFT_CS     9    // Sélection de puce
#define TFT_DC     10   // Commutation données/commandes (si inversé, l'écran devient tout blanc)
#define TFT_RST    18   // Reset
#define TFT_BL     7    // Rétroéclairage — HIGH pour allumer, oublier ce fil rend le projet inutile
#define MQ135_PIN  13   // Entrée analogique MQ135 (canal ADC2, utilisation normale sans Wi-Fi)

#define SCREEN_WIDTH   240
#define SCREEN_HEIGHT  240

// ===================== Initialisation du pilote d'affichage =====================
Arduino_ESP32SPI bus = Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01 gfx = Arduino_GC9A01(&bus, TFT_RST, 0, true);

// ===================== Tampon de dessin LVGL =====================
// 40 lignes de tampon occupent environ 19KB sur ESP32-S3, équilibre vitesse/mémoire
#define DRAW_BUF_LINES 40
alignas(4) static uint16_t draw_buf[SCREEN_WIDTH * DRAW_BUF_LINES];

// ===================== Données historiques de tendance =====================
#define TREND_POINTS 40    // Conserver les 40 derniers échantillons (× 300ms ≈ 12 secondes d'historique)
static int trendData[TREND_POINTS] = {0};
static int trendIdx = 0;
static bool trendFull = false;
static lv_point_precise_t trendLinePoints[TREND_POINTS];

// ===================== Handles d'objets UI LVGL =====================
static lv_obj_t *arc_bg;          // Fond d'arc (foncé)
static lv_obj_t *arc_main;        // Arc principal + petit cercle knob à l'extrémité
static lv_obj_t *glow_circle;     // Cercle de lueur extérieure (respire)
static lv_obj_t *center_circle;   // Disque central
static lv_obj_t *label_value;     // Grand chiffre central (valeur ADC)
static lv_obj_t *label_unit;      // Étiquette d'unité "ADC"
static lv_obj_t *label_status;    // Texte de statut (EXCELLENT / GOOD...)
static lv_obj_t *dot_status;      // Petit point de statut
static lv_obj_t *label_title;     // Titre supérieur "AIR QUALITY"
static lv_obj_t *label_score;     // Score de propreté inférieur
static lv_obj_t *label_minmax;    // Valeurs minimales/maximales
static lv_obj_t *trend_line;      // Courbe de tendance
static lv_obj_t *trend_container; // Conteneur de clip pour la courbe

// ===================== État du capteur =====================
static float smoothedValue = 0.0f; // Valeur lissée par moyenne pondérée exponentielle
static bool firstSample = true;    // Indicateur de premier échantillon, évite l'animation depuis 0
static int minValue = 4095;        // Valeur ADC minimale depuis démarrage
static int maxValue = 0;           // Valeur ADC maximale depuis démarrage
static float displayValue = 0.0f;  // Pour interpolation d'animation UI

// ===================== Callback d'horloge LVGL =====================
static uint32_t my_tick_cb(void) { return millis(); }

// ===================== Callback de flush : après rendu LVGL, pousser vers l'écran =====================
void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = area->x2 - area->x1 + 1;
  uint32_t h = area->y2 - area->y1 + 1;
  gfx.draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)px_map, w, h);
  lv_display_flush_ready(disp); // Dit à LVGL : cette zone est finie, peut continuer la suivante
}

// ===================== Système de couleurs : valeur ADC → couleur de statut =====================
// Plus la valeur est élevée = air plus mauvais = couleur plus rouge, six niveaux pour six statuts
uint32_t getColorHex(int v) {
  if (v < 600)  return 0x00E5A0; // EXCELLENT : vert frais
  if (v < 1200) return 0x22C55E; // GOOD : vert clair
  if (v < 2000) return 0xA3E635; // FAIR : vert-jaune
  if (v < 2800) return 0xEAB308; // MODERATE : jaune
  if (v < 3500) return 0xF97316; // POOR : orange
  return 0xFF3355;                // DANGER : rouge (ouvrez les fenêtres vite)
}

lv_color_t getColor(int v) {
  return lv_color_hex(getColorHex(v));
}

// Couleur de fond d'arc (version sombre de la couleur de statut, pour fond sombre)
uint32_t getDimColorHex(int v) {
  if (v < 600)  return 0x0A2A20;
  if (v < 1200) return 0x0A2A15;
  if (v < 2000) return 0x1A2A10;
  if (v < 2800) return 0x2A2208;
  if (v < 3500) return 0x2A1808;
  return 0x2A0A10;
}

const char* getStatusText(int v) {
  if (v < 600)  return "EXCELLENT";
  if (v < 1200) return "GOOD";
  if (v < 2000) return "FAIR";
  if (v < 2800) return "MODERATE";
  if (v < 3500) return "POOR";
  return "DANGER";
}

// Convertir valeur ADC en pourcentage de propreté (ADC plus bas = plus propre = score plus élevé)
int adcToScore(int adc) {
  adc = constrain(adc, 0, 4095);
  return constrain(100 - (adc * 100 / 4095), 0, 100);
}

// ===================== Créer l'interface UI =====================
void create_ui() {
  lv_obj_t *scr = lv_screen_active();

  // Première étape : fond sombre
  lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(scr, lv_color_hex(0x050810), 0);

  // Deuxième étape : bordure de lueur extérieure (couleur suit le statut, animation de respiration)
  glow_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(glow_circle);
  lv_obj_set_size(glow_circle, 234, 234);
  lv_obj_center(glow_circle);
  lv_obj_set_style_radius(glow_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(glow_circle, LV_OPA_TRANSP, 0);
  lv_obj_set_style_border_width(glow_circle, 2, 0);
  lv_obj_set_style_border_opa(glow_circle, LV_OPA_20, 0);
  lv_obj_set_style_border_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(glow_circle, 30, 0);
  lv_obj_set_style_shadow_spread(glow_circle, 2, 0);
  lv_obj_set_style_shadow_opa(glow_circle, LV_OPA_30, 0);
  lv_obj_set_style_shadow_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_clear_flag(glow_circle, LV_OBJ_FLAG_SCROLLABLE);

  // Troisième étape : fond d'arc (affiche la zone sombre "pas encore atteinte")
  arc_bg = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_bg);
  lv_obj_set_size(arc_bg, 210, 210);
  lv_obj_center(arc_bg);
  lv_arc_set_range(arc_bg, 0, 100);
  lv_arc_set_bg_angles(arc_bg, 135, 45);
  lv_arc_set_value(arc_bg, 0);
  lv_obj_set_style_arc_width(arc_bg, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(0x0A2A20), LV_PART_MAIN);
  lv_obj_set_style_arc_rounded(arc_bg, true, LV_PART_MAIN);
  lv_obj_set_style_arc_width(arc_bg, 0, LV_PART_INDICATOR);
  lv_obj_set_style_arc_opa(arc_bg, LV_OPA_TRANSP, LV_PART_INDICATOR);
  lv_obj_set_style_bg_opa(arc_bg, LV_OPA_TRANSP, LV_PART_KNOB);
  lv_obj_clear_flag(arc_bg, LV_OBJ_FLAG_CLICKABLE);

  // Quatrième étape : arc principal (valeur temps réel + petit cercle knob à l'extrémité)
  arc_main = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_main);
  lv_obj_set_size(arc_main, 210, 210);
  lv_obj_center(arc_main);
  lv_arc_set_range(arc_main, 0, 4095);
  lv_arc_set_bg_angles(arc_main, 135, 45);
  lv_arc_set_value(arc_main, 0);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_opa(arc_main, LV_OPA_TRANSP, LV_PART_MAIN);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_INDICATOR);
  lv_obj_set_style_arc_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_INDICATOR);
  lv_obj_set_style_arc_rounded(arc_main, true, LV_PART_INDICATOR);

  // knob = petit point lumineux à l'extrémité, bordure blanche + intérieur rempli de couleur de statut + ombre lumineuse
  lv_obj_set_style_bg_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_bg_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_pad_all(arc_main, 5, LV_PART_KNOB);
  lv_obj_set_style_radius(arc_main, LV_RADIUS_CIRCLE, LV_PART_KNOB);
  lv_obj_set_style_border_width(arc_main, 3, LV_PART_KNOB);
  lv_obj_set_style_border_color(arc_main, lv_color_hex(0xFFFFFF), LV_PART_KNOB);
  lv_obj_set_style_border_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_shadow_width(arc_main, 18, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_shadow_opa(arc_main, LV_OPA_70, LV_PART_KNOB);
  lv_obj_set_style_shadow_spread(arc_main, 2, LV_PART_KNOB);
  lv_obj_clear_flag(arc_main, LV_OBJ_FLAG_CLICKABLE);

  // Cinquième étape : disque central (affiche valeur, courbe de tendance, texte de statut)
  center_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(center_circle);
  lv_obj_set_size(center_circle, 140, 140);
  lv_obj_center(center_circle);
  lv_obj_set_style_radius(center_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(center_circle, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(center_circle, lv_color_hex(0x080E1A), 0);
  lv_obj_set_style_bg_grad_color(center_circle, lv_color_hex(0x0C1628), 0);
  lv_obj_set_style_bg_grad_dir(center_circle, LV_GRAD_DIR_VER, 0);
  lv_obj_set_style_border_width(center_circle, 1, 0);
  lv_obj_set_style_border_color(center_circle, lv_color_hex(0x1A3050), 0);
  lv_obj_set_style_border_opa(center_circle, LV_OPA_60, 0);
  lv_obj_set_style_pad_all(center_circle, 0, 0);
  lv_obj_clear_flag(center_circle, LV_OBJ_FLAG_SCROLLABLE);

  // Grand chiffre central
  label_value = lv_label_create(center_circle);
  lv_label_set_text(label_value, "0");
  lv_obj_set_style_text_font(label_value, &lv_font_montserrat_28, 0);
  lv_obj_set_style_text_color(label_value, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_value, LV_ALIGN_CENTER, 0, -26);

  // Étiquette d'unité
  label_unit = lv_label_create(center_circle);
  lv_label_set_text(label_unit, "ADC");
  lv_obj_set_style_text_font(label_unit, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_unit, lv_color_hex(0x506878), 0);
  lv_obj_align(label_unit, LV_ALIGN_CENTER, 0, -6);

  // Conteneur de courbe de tendance (responsable du clip, empêche la courbe de déborder)
  trend_container = lv_obj_create(center_circle);
  lv_obj_remove_style_all(trend_container);
  lv_obj_set_size(trend_container, 110, 30);
  lv_obj_align(trend_container, LV_ALIGN_CENTER, 0, 16);
  lv_obj_set_style_bg_opa(trend_container, LV_OPA_TRANSP, 0);
  lv_obj_set_style_pad_all(trend_container, 0, 0);
  lv_obj_set_style_clip_corner(trend_container, true, 0);
  lv_obj_set_style_radius(trend_container, 4, 0);
  lv_obj_clear_flag(trend_container, LV_OBJ_FLAG_SCROLLABLE);

  // Ligne de référence de base sous la courbe
  static lv_point_precise_t refPts[2] = {{0, 28}, {110, 28}};
  lv_obj_t *refLine = lv_line_create(trend_container);
  lv_line_set_points(refLine, refPts, 2);
  lv_obj_set_style_line_color(refLine, lv_color_hex(0x1A2535), 0);
  lv_obj_set_style_line_width(refLine, 1, 0);

  // Courbe de tendance (initialiser tous les points en bas)
  for (int i = 0; i < TREND_POINTS; i++) {
    trendLinePoints[i].x = (int32_t)(i * 110 / (TREND_POINTS - 1));
    trendLinePoints[i].y = 28;
  }
  trend_line = lv_line_create(trend_container);
  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
  lv_obj_set_style_line_color(trend_line, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_line_width(trend_line, 2, 0);
  lv_obj_set_style_line_rounded(trend_line, true, 0);
  lv_obj_set_style_line_opa(trend_line, LV_OPA_70, 0);

  // Petit point de statut
  dot_status = lv_obj_create(center_circle);
  lv_obj_remove_style_all(dot_status);
  lv_obj_set_size(dot_status, 8, 8);
  lv_obj_set_style_radius(dot_status, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(dot_status, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(dot_status, 8, 0);
  lv_obj_set_style_shadow_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_opa(dot_status, LV_OPA_50, 0);
  lv_obj_align(dot_status, LV_ALIGN_CENTER, -42, 42);

  // Texte de statut
  label_status = lv_label_create(center_circle);
  lv_label_set_text(label_status, "EXCELLENT");
  lv_obj_set_style_text_font(label_status, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_status, LV_ALIGN_CENTER, 3, 42);

  // Titre supérieur
  label_title = lv_label_create(scr);
  lv_label_set_text(label_title, "AIR QUALITY");
  lv_obj_set_style_text_font(label_title, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_title, lv_color_hex(0x4A6070), 0);
  lv_obj_set_style_text_letter_space(label_title, 3, 0);
  lv_obj_align(label_title, LV_ALIGN_TOP_MID, 0, 60);

  // Score inférieur
  label_score = lv_label_create(scr);
  lv_label_set_text(label_score, "100% CLEAN");
  lv_obj_set_style_text_font(label_score, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_score, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_score, LV_ALIGN_BOTTOM_MID, 0, -8);

  // Enregistrement MIN/MAX (au-dessus du score inférieur)
  label_minmax = lv_label_create(scr);
  lv_label_set_text(label_minmax, "L:-- H:--");
  lv_obj_set_style_text_font(label_minmax, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_minmax, lv_color_hex(0x3A4A5A), 0);
  lv_obj_align(label_minmax, LV_ALIGN_BOTTOM_MID, 0, -24);
}

// ===================== Mettre à jour les données de la courbe de tendance =====================
void updateTrend(int value) {
  trendData[trendIdx] = value;
  trendIdx = (trendIdx + 1) % TREND_POINTS;
  if (trendIdx == 0) trendFull = true;

  int count = trendFull ? TREND_POINTS : trendIdx;
  if (count < 2) return;

  // Trouver la plage de données pour la normalisation à la hauteur de la courbe
  int vMin = 4095, vMax = 0;
  for (int i = 0; i < count; i++) {
    if (trendData[i] < vMin) vMin = trendData[i];
    if (trendData[i] > vMax) vMax = trendData[i];
  }
  // Garantir une amplitude minimale — sinon quand l'air est trop stable, la courbe devient une ligne plate morte
  if (vMax - vMin < 50) vMax = vMin + 50;

  int chartW = 110;
  int chartH = 26;

  for (int i = 0; i < TREND_POINTS; i++) {
    int x = i * chartW / (TREND_POINTS - 1);
    int y;
    if (i < count) {
      int dataIdx = trendFull ? (trendIdx + i) % TREND_POINTS : i;
      int normalized = (trendData[dataIdx] - vMin) * chartH / (vMax - vMin);
      y = chartH - normalized + 1; // axe y inversé : valeur plus élevée = point plus haut
    } else {
      y = chartH + 1; // positions sans données d'abord en bas
    }
    trendLinePoints[i].x = x;
    trendLinePoints[i].y = y;
  }

  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
}

// ===================== Mettre à jour l'affichage UI =====================
void update_ui(int value, int raw) {
  value = constrain(value, 0, 4095);
  raw   = constrain(raw, 0, 4095);

  // Animation lisse : chaque frame s'approche de 18% de la valeur cible, changement de chiffre fluide sans à-coups
  float diff = (float)value - displayValue;
  displayValue += diff * 0.18f;
  int dispVal = (int)(displayValue + 0.5f);

  lv_color_t c  = getColor(dispVal);
  uint32_t dimC = getDimColorHex(dispVal);
  int score     = adcToScore(dispVal);

  // Mettre à jour l'enregistrement min/max
  if (raw < minValue) minValue = raw;
  if (raw > maxValue) maxValue = raw;

  // Arc principal + knob couleur suit le statut
  lv_arc_set_value(arc_main, dispVal);
  lv_obj_set_style_arc_color(arc_main, c, LV_PART_INDICATOR);
  lv_obj_set_style_bg_color(arc_main, c, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, c, LV_PART_KNOB);

  // Couleur de fond d'arc
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(dimC), LV_PART_MAIN);

  // Cercle de lueur extérieur : couleur suit le statut + fonction sin simule la transparence respiratoire
  lv_obj_set_style_border_color(glow_circle, c, 0);
  lv_obj_set_style_shadow_color(glow_circle, c, 0);
  static uint32_t breathCount = 0;
  breathCount++;
  float sinVal = sinf((breathCount * 6) % 360 * 3.14159f / 180.0f);
  lv_opa_t breathOpa = (lv_opa_t)(LV_OPA_20 + (int)(sinVal * 25.0f));
  lv_obj_set_style_shadow_opa(glow_circle, breathOpa, 0);
  lv_opa_t borderOpa = (lv_opa_t)(LV_OPA_10 + (int)(sinVal * 15.0f));
  lv_obj_set_style_border_opa(glow_circle, borderOpa, 0);

  // Valeur centrale
  lv_label_set_text_fmt(label_value, "%d", dispVal);
  lv_obj_set_style_text_color(label_value, c, 0);

  // Texte de statut + petit point (l'ombre du petit point respire aussi)
  lv_label_set_text(label_status, getStatusText(dispVal));
  lv_obj_set_style_text_color(label_status, c, 0);
  lv_obj_set_style_bg_color(dot_status, c, 0);
  lv_obj_set_style_shadow_color(dot_status, c, 0);
  lv_opa_t dotOpa = (lv_opa_t)(LV_OPA_30 + (int)(sinVal * 40.0f));
  lv_obj_set_style_shadow_opa(dot_status, dotOpa, 0);

  // Couleur de la courbe de tendance
  lv_obj_set_style_line_color(trend_line, c, 0);

  // MIN/MAX
  lv_label_set_text_fmt(label_minmax, "L:%d  H:%d", minValue, maxValue);

  // Score de propreté inférieur
  const char *statusWord;
  if (score >= 80)      statusWord = "CLEAN";
  else if (score >= 60) statusWord = "FAIR";
  else if (score >= 40) statusWord = "HAZY";
  else if (score >= 20) statusWord = "DIRTY";
  else                  statusWord = "TOXIC";
  lv_label_set_text_fmt(label_score, "%d%% %s", score, statusWord);
  lv_obj_set_style_text_color(label_score, c, 0);
}

// ===================== setup =====================
void setup() {
  Serial.begin(115200);
  delay(200);

  // Première étape : rétroéclairage HIGH, sans cela l'écran reste noir
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // Deuxième étape : configurer l'ADC (précision 12 bits, plage 0-3.3V)
  // Note : ADC_11db dans ESP32 Core 3.x équivaut à ADC_ATTEN_DB_12, compatible avec l'ancienne syntaxe
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Troisième étape : démarrer l'écran, fréquence SPI 40MHz
  gfx.begin(40000000);

  // Quatrième étape : initialiser LVGL
  lv_init();
  lv_tick_set_cb(my_tick_cb);

  lv_display_t *disp = lv_display_create(SCREEN_WIDTH, SCREEN_HEIGHT);
  lv_display_set_color_format(disp, LV_COLOR_FORMAT_RGB565);
  lv_display_set_buffers(disp, draw_buf, NULL, sizeof(draw_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(disp, my_disp_flush);

  // Cinquième étape : construire l'interface, initialiser à la valeur 0
  create_ui();
  displayValue = 0;
  update_ui(0, 0);

  Serial.println("[SYS] Jauge v3.1 prête !");
}

// ===================== loop =====================
void loop() {
  static uint32_t lastSensorMs = 0;
  static uint32_t lastTrendMs  = 0;
  static uint32_t lastLogMs    = 0;

  uint32_t now = millis();

  // Toutes les 50ms : lire le capteur + rafraîchir UI (environ 20fps, fluide sans à-coups)
  if (now - lastSensorMs >= 50) {
    int raw = analogRead(MQ135_PIN);
    raw = constrain(raw, 0, 4095);

    if (firstSample) {
      // Première frame : assignation directe, saute l'animation de transition depuis 0
      smoothedValue = raw;
      displayValue  = raw;
      firstSample   = false;
    } else {
      // Moyenne pondérée exponentielle : nouvelle valeur 12%, ancienne valeur 88%, lisse mais pas lent
      smoothedValue = smoothedValue * 0.88f + raw * 0.12f;
    }

    update_ui((int)smoothedValue, raw);
    lastSensorMs = now;
  }

  // Toutes les 300ms : pousser un point de données à la courbe de tendance (40 points × 300ms ≈ 12 secondes d'historique)
  if (now - lastTrendMs >= 300) {
    updateTrend((int)smoothedValue);
    lastTrendMs = now;
  }

  // Toutes les 1s : sortie de log de débogage série (ouvrez le moniteur série pour le dépannage)
  if (now - lastLogMs >= 1000) {
    Serial.printf("SCORE=%d%%  ADC=%d  SMOOTH=%d  L=%d H=%d [%s]\n",
                  adcToScore((int)smoothedValue),
                  analogRead(MQ135_PIN),
                  (int)smoothedValue,
                  minValue, maxValue,
                  getStatusText((int)smoothedValue));
    lastLogMs = now;
  }

  lv_timer_handler(); // Planification des tâches internes LVGL, doit être appelé périodiquement, ne pas oublier
  delay(5);
}
```

### Explications du code

Quelques points clés de la conception, sinon le code peut sembler confus :

**① Pourquoi utiliser une moyenne pondérée exponentielle, et non afficher directement l'ADC brut ?**

La sortie analogique du MQ135 comporte un certain bruit, l'affichage direct des chiffres sauterait constamment. La formule de moyenne pondérée exponentielle (EMA) :

```
Nouvelle valeur lissée = Ancienne valeur lissée × 0.88 + Valeur brute × 0.12
```

Le poids de 0.12 signifie que les nouvelles données ont moins d'impact, la variation des valeurs est douce mais suit la tendance. Pour une réponse plus sensible, augmentez `0.12f` (maximum 1.0 = pas de lissage) ; pour plus de stabilité, augmentez `0.88f`.

**② Comment l'effet de respiration est-il réalisé ?**

Dans `update_ui()`, `sinf()` génère une valeur variant périodiquement de -1 à +1, mappée à la plage de transparence (`LV_OPA_20` ~ `LV_OPA_45`), le compteur s'incrémente à chaque appel. La transparence de la bordure et de l'ombre du cercle extérieur s'estompent et apparaissent ainsi périodiquement, comme une "respiration".

**③ Pourquoi la courbe de tendance est-elle parfois plate ?**

Lorsque l'environnement est très stable et que l'écart max-min des données historiques est très faible, la courbe est forcée à au moins 50 ADC d'amplitude :

```cpp
if (vMax - vMin < 50) vMax = vMin + 50;
```

Ainsi, même si l'air ne change pas, la courbe ne devient pas une ligne plate morte, et les fluctuations minimes restent visibles.

---

## Dépannage des problèmes courants

Pas de panique, 80% des problèmes viennent de ces endroits :

**Écran tout noir, aucune réaction**
Première chose : vérifiez que la broche BL est connectée au GPIO 7, et que `digitalWrite(TFT_BL, HIGH)` dans le code est exécuté. Sans rétroéclairage, l'écran reste noir — ce n'est pas que l'écran est cassé, c'est que le rétroéclairage n'est pas à HIGH.

**Écran tout blanc ou tout rouge (de la couleur mais pas de contenu)**
90% de chances que les broches DC et CS soient inversées. Vérifiez ces deux fils selon le tableau de câblage, ou échangez-les directement pour tester.

**Erreur de compilation : `lv_font_montserrat_28 undeclared`**
`lv_conf.h` n'est pas correctement configuré, ou au mauvais endroit. Retournez à la section "Bibliothèques à installer", et suivez les étapes pour changer les options de police de 0 à 1.

**Lecture ADC toujours 0 ou 4095 sans changement**
Utilisez un multimètre pour mesurer la tension de sortie de la broche A0 du MQ135, normalement elle devrait osciller entre 0.5V et 2.5V. Si c'est 0V, vérifiez le câblage VCC ; si c'est pleine échelle (3.3V), le capteur n'est peut-être pas assez préchauffé — un nouveau capteur juste alimenté a des lectures instables, attendez 3 minutes.

**Les valeurs affichées sautent beaucoup**
Augmentez le coefficient de lissage `0.88f` dans le code (par exemple `0.95f`), le lissage augmente, au prix d'une réponse plus lente.

**Compilation LVGL indique mémoire insuffisante ou plantage à l'exécution**
Changez `DRAW_BUF_LINES` de 40 à une valeur plus petite (par exemple 20), pour réduire l'occupation du tampon. L'ESP32-S3 standard a assez de RAM, seules les cartes avec moins de RAM rencontrent ce problème.

---

## FAQ

**Q : Le GPIO 13 est-il fixe ? Peut-on le remplacer par une autre broche ADC ?**
R : Oui. Sur ESP32-S3, les GPIO 1~10 appartiennent à ADC1, les GPIO 11~20 à ADC2. Ce projet n'utilise pas le Wi-Fi, les broches ADC2 (y compris GPIO 13) n'ont pas de conflit, utilisation normale. Si vous ajoutez le Wi-Fi plus tard, il est recommandé de déplacer le capteur vers les broches ADC1 (GPIO 1~10), pour éviter les erreurs de lecture quand le Wi-Fi occupe l'ADC2.

**Q : Le MQ135 alimenté en 3.3V, est-ce que les lectures sont précises ?**
R : Pas assez précis, mais suffisant pour l'affichage de tendance. La tension nominale du MQ135 est 5V ; avec 3.3V, la puissance du fil chauffant est d'environ 44% de la normale, la sensibilité diminue et les valeurs absolues sont plus faibles. Pour convertir en concentration ppm, il est recommandé d'alimenter VCC séparément avec 5V ; la sortie analogique A0 ne dépasse pas 3.3V, aucun circuit diviseur supplémentaire nécessaire.

**Q : LVGL doit-il être en v9 ? Est-ce que v8 peut fonctionner ?**
R : v8 ne peut pas exécuter ce code directement. v9 introduit `lv_display_t`, `lv_display_create` et d'autres nouvelles API qui n'existent pas dans v8 ; la compilation directe générera de nombreuses erreurs. Fortement recommandé d'installer une version à partir de v9.2.x, ne pas downgrade.

**Q : L'écran circulaire a des "coins" noirs aux quatre coins, est-ce que c'est mal soudé ?**
R : Phénomène normal, pas un problème. GC9A01 a une zone d'affichage circulaire, le buffer sous-jacent est carré 240×240, les quatre coins sont des structures de masquage physique de l'écran, sans pixels réels, ne pas afficher de contenu est correct.

**Q : Le capteur saute beaucoup à l'allumage, combien de temps attendre pour stabiliser ?**
R : Le MQ135 a besoin de préchauffage. Pour un nouveau capteur, il est recommandé de l'alimenter continuellement pendant 24~48 heures avant que les lectures ne se stabilisent ; pour un capteur déjà utilisé, les lectures se stabilisent après environ 3 minutes d'alimentation. Vous pouvez ajouter `delay(180000)` (3 minutes) à la fin de `setup()`, ou ajouter une indication de statut "préchauffage" dans l'UI, et commencer la collecte seulement après le délai.

**Q : Le rafraîchissement de l'écran est un peu saccadé, comment accélérer ?**
R : Deux directions : ① changez la fréquence SPI dans `gfx.begin(40000000)` à 80MHz (GC9A01 supporte jusqu'à 80MHz, mais certains boards de mauvaise qualité de routage sont instables, testez d'abord) ; ② augmentez `DRAW_BUF_LINES` (par exemple 60), pour réduire le nombre de rafraîchements partiels LVGL, au prix d'environ 9KB de RAM supplémentaire.

---

## Extensions possibles

Une fois que cela fonctionne, vous pouvez continuer dans ces directions :

- Connecter un BME280, ajouter température et humidité, afficher une ligne de données supplémentaire sur la jauge
- Rapporter les données ADC à Home Assistant via Wi-Fi, pour des courbes historiques à long terme
- Ajouter des boutons pour changer de mode d'affichage (jauge / mode grand texte / courbe pure)
- Remplacer par capteur MQ-7, pour surveiller spécifiquement la concentration de monoxyde de carbone
- Ajouter un buzzer, déclencher une alarme quand la qualité de l'air entre dans la zone DANGER

---

## Références

- [Manuel du pilote d'écran GC9A01 (Galaxycore officiel)](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Spécifications du capteur MQ135 (Winsen officiel)](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ135%20(Ver1.4)%20-%20Manual.pdf)
- [GitHub Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Documentation LVGL officielle v9](https://docs.lvgl.io/9.0/)
<!-- - [Manuel de référence technique ESP32-S3 (Espressif officiel)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf) -->