---
title: "Avant d'acheter, regardez bien : suffixes ESP32-S3, Flash, PSRAM et prix indicatifs en yuan (avec comparaison C3)"
domain: hardware
platforms: ["cross-platform"]
format: "cheatsheet"
date: 2026-11-10
intro: "Les suffixes N4, N8R2 ou N16R8 ne disent que deux choses : le chiffre après N est la Flash, celui après R la PSRAM. Ce guide réunit les capacités et les prix indicatifs (en yuan) de cinq cartes courantes dans un seul tableau."
tags: ["ESP32-S3", "ESP32-C3", "PSRAM", "Flash", "choix de carte de développement", "ESP-IDF"]
relatedBoards: ["esp32s3"]
image: "https://img.lingflux.com/2026/11/bf80e841c5e9fb342ebc387e1e68edf8.jpg"
---

> Aide-mémoire. Les cinq sont des cartes complètes qui fonctionnent dès qu'on branche l'USB-C. Les capacités sont nominales et les prix sont des ordres de grandeur en yuan chinois (CNY), utiles uniquement pour comparer des échelles.

## 00 Trois phrases à retenir

1. **Le suffixe ne décrit que la capacité.** `N16R8` = 16 MB de Flash + 8 MB de PSRAM. `N` c'est la Flash, `R` la PSRAM, le chiffre est en MB. Aucun rapport avec une « génération » ou un « niveau de gamme ».
2. **La Flash n'est pas de la mémoire.** La Flash est le disque : elle survit à la coupure et stocke firmware et ressources. Seuls la SRAM interne (512 KB sur le S3) et la PSRAM peuvent être allouées avec `malloc()`. Aucune quantité de Flash ne compense l'absence de PSRAM.
3. **Même capacité ≠ même prix.** Deux cartes à environ ¥26 et ¥62 ont Flash et PSRAM identiques ; l'écart paie la RF, le contrôle qualité et la documentation (section 04).

Les cinq cartes : **quatre ESP32-S3** — S3 SuperMini FH4R2, S3 N16R8 MINI, XIAO S3 / Sense, XIAO S3 Plus ; **une ESP32-C3** — C3 SuperMini, un témoin d'une autre architecture, pas un substitut de même catégorie. Le `S3` / `C3` devant le modèle indique la famille de puce ; ne le confondez pas avec le suffixe de capacité qui suit.

## 01 Trois niveaux, trois types d'espace

Un « ESP32-S3 » peut désigner trois choses différentes :

- **Puce** : ESP32-S3FH4R2, ESP32-S3R8, ESP32-C3FN4 — die nu en QFN ; la Flash et la PSRAM peuvent être intégrées dans le boîtier. Avec cela en main, il reste à concevoir la carte, adapter la RF et ajouter une antenne.
- **Module** : comme le WROOM-1 — puce + Flash sur module + quartz + capot de blindage + antenne PCB + certification RF. Un nom contenant WROOM désigne généralement ce niveau.
- **Carte de développement** : on ajoute USB-C, LDO, boutons, broches et antenne — on branche et ça marche. **Les cinq cartes de cet article sont à ce niveau**, sans module nu : la comparaison de prix et de GPIO n'a de sens qu'à niveau égal.

<svg viewBox="0 0 900 350" width="100%" style="height:auto" role="img" aria-label="Les trois niveaux puce, module et carte, et à quel niveau se situe chaque nom de carte">
  <title>Figure 1 · Trois niveaux et décodage des noms</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">Un même nom « ESP32-S3 » peut désigner trois choses très différentes　·　Échantillon : 4 cartes S3 + 1 témoin C3</text>
  <rect x="20" y="40" width="860" height="52" rx="8" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="38" y="62" font-size="13" font-weight="600" fill="var(--ink)">① Puce (die)</text>
  <text x="38" y="80" font-size="12" fill="var(--ink-2)">ESP32-S3FH4R2 / ESP32-S3R8 / ESP32-C3FN4 · boîtier QFN · Flash et PSRAM peuvent être dans la puce</text>
  <text x="862" y="70" font-size="12" text-anchor="end" fill="var(--pen)">Invisible ; il faut dessiner la carte</text>
  <rect x="20" y="102" width="860" height="52" rx="8" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="38" y="124" font-size="13" font-weight="600" fill="var(--ink)">② Module</text>
  <text x="38" y="142" font-size="12" fill="var(--ink-2)">WROOM-1 = puce + Flash sur module + quartz + capot + antenne PCB + certification RF</text>
  <text x="862" y="132" font-size="12" text-anchor="end" fill="var(--accent)">Aucune des cinq n'en est un</text>
  <rect x="20" y="164" width="860" height="52" rx="8" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="38" y="186" font-size="13" font-weight="600" fill="var(--ink)">③ Carte de développement</text>
  <text x="38" y="204" font-size="12" fill="var(--ink-2)">Die ou module + USB-C + LDO + boutons + broches + antenne = on branche, ça marche</text>
  <text x="862" y="194" font-size="12" text-anchor="end" fill="var(--green)">Les cinq sont à ce niveau</text>
  <line x1="20" y1="234" x2="880" y2="234" stroke="var(--line-2)" stroke-width="1"/>
  <text x="20" y="256" font-size="13" fill="var(--ink-2)">Décodage : le suffixe dit la « capacité », pas le « niveau de modèle »</text>
  <rect x="20" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="288" font-size="12" font-weight="600" fill="var(--ink)">ESP32-S3FH4R2</text>
  <text x="34" y="306" font-size="11" fill="var(--ink-2)">F=Flash dans le boîtier · H=die haute température</text>
  <text x="34" y="322" font-size="11" fill="var(--ink-2)">4=4 MB Flash · R2=2 MB PSRAM</text>
  <rect x="312" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="326" y="288" font-size="12" font-weight="600" fill="var(--ink)">S3 N16R8 MINI</text>
  <text x="326" y="306" font-size="11" fill="var(--ink-2)">Die ESP32-S3R8 + 16 MB Flash sur la carte</text>
  <text x="326" y="322" font-size="11" fill="var(--ink-2)">N16 est une Flash embarquée, pas un module WROOM</text>
  <rect x="604" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="618" y="288" font-size="12" font-weight="600" fill="var(--ink)">XIAO S3 Plus</text>
  <text x="618" y="306" font-size="11" fill="var(--ink-2)">Même die ESP32-S3R8 + 16 MB Flash</text>
  <text x="618" y="322" font-size="11" fill="var(--ink-2)">Le surcoût paie taille / connecteur / écosystème</text>
</svg>

> **Figure 1** · Un même « ESP32-S3 » peut être trois choses différentes ; le suffixe indique la capacité, pas le niveau de modèle.

Ne mélangez pas les **trois types d'espace** :

- **Flash = le disque.** Stocke firmware, polices et ressources web ; survit à la coupure. Quad SPI, jusqu'à 80 MHz annoncés. **Ce n'est pas de la mémoire.**
- **PSRAM = la barrette mémoire externe.** Grands tableaux, framebuffers, tampons TLS/JSON ; effacée à la coupure, plus lente que la SRAM interne, brièvement inaccessible pendant l'effacement ou l'écriture de la Flash.
- **SRAM interne = la poche.** La plus rapide et la plus petite. Les quatre S3 ont **512 KB** (+ 384 KB de ROM et 16 KB de RTC SRAM) ; la C3 a **400 KB** (dont 16 KB en cache) + 384 KB de ROM + 8 KB de RTC SRAM.

Quand une fiche annonce « 8 MB de PSRAM et 8 MB de Flash intégrés », la PSRAM est dans le boîtier de la puce et la Flash est un die Quad SPI soudé séparément. **Aussi grosse soit la Flash, ce n'est pas de l'espace allouable avec `malloc()`.**

Les trois points les plus mal lus sur une fiche technique :

| Formulation courante | Lecture correcte | Comment vérifier |
|---|---|---|
| « 512 KB SRAM » sur une carte S3 | Le S3 a 512 KB ; l'ESP32-C3 a 400 KB | Regardez le CPU : Xtensa LX7 double cœur 240 MHz = S3 ; RISC-V monocœur 160 MHz = C3 |
| « 8 MB de Flash intégrée » | Le plus souvent sur la carte, pas dans le boîtier | Cherchez la référence complète ; seul un `F` signifie Flash dans le boîtier |
| « WROOM dans le nom = module » | Peut n'être qu'un code de capacité réutilisé | Vérifiez la présence d'un petit module blindé ; sur un design à die nu, la puce principale est visible |

## 02 Décoder le suffixe : neuf codes forment une grille 3×3

Neuf codes de commande ressemblent à neuf objets différents, mais forment un tableau 3×3 :

- **`N` = Flash sur module** : `N4` 4 MB, `N8` 8 MB, `N16` 16 MB. Le die est monté sur le PCB du module en Quad SPI et survit à la coupure.
- **`R` = PSRAM dans le boîtier de la puce** : `R2` 2 MB (Quad, 4 lignes), `R8` 8 MB (Octal, 8 lignes). Pas de `R`, pas de PSRAM.
- 3 paliers de Flash × 3 paliers de PSRAM = 9 modèles.

L'erreur la plus fréquente en comparant les prix : `N8R8` et `N16R8` ont la même PSRAM ; seule la Flash change.

<svg viewBox="0 0 900 406" width="100%" style="height:auto" role="img" aria-label="Décomposition du suffixe N16R8 de l'ESP32-S3-WROOM-1 et matrice des neuf modèles">
  <title>Figure 2 · Décomposition du suffixe et matrice 3×3 des neuf modèles</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">Un suffixe ne dit que deux choses : après N la Flash, après R la PSRAM ; trois paliers par axe donnent neuf modèles</text>
  <rect x="20" y="42" width="246" height="64" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">ESP32-S3-WROOM-1</text>
  <text x="34" y="84" font-size="11" fill="var(--ink-2)">La série de modules elle-même : antenne PCB</text>
  <text x="34" y="100" font-size="11" fill="var(--ink-2)">La variante U (1U) passe en connecteur U.FL</text>
  <rect x="274" y="42" width="290" height="64" rx="7" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="288" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">N16　→　Flash 16 MB</text>
  <text x="288" y="84" font-size="11" fill="var(--ink-2)">Die Quad SPI sur le PCB du module</text>
  <text x="288" y="100" font-size="11" fill="var(--ink-2)">Survit à la coupure ; firmware et ressources</text>
  <rect x="572" y="42" width="308" height="64" rx="7" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="586" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">R8　→　PSRAM 8 MB</text>
  <text x="586" y="84" font-size="11" fill="var(--ink-2)">PSRAM Octal dans le boîtier, 8 lignes</text>
  <text x="586" y="100" font-size="11" fill="var(--ink-2)">Effacée à la coupure ; framebuffers et tas</text>
  <text x="20" y="136" font-size="11" fill="var(--ink-3)">Lignes = palier PSRAM　Colonnes = palier Flash</text>
  <text x="276" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 4 MB</text>
  <text x="498" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 8 MB</text>
  <text x="720" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 16 MB</text>
  <rect x="20" y="166" width="5" height="20" rx="2" fill="var(--accent)"/>
  <text x="34" y="181" font-size="12.5" font-weight="600" fill="var(--ink)">Sans PSRAM</text>
  <rect x="20" y="230" width="5" height="20" rx="2" fill="var(--pen)"/>
  <text x="34" y="245" font-size="12.5" font-weight="600" fill="var(--ink)">2 MB Quad</text>
  <rect x="20" y="294" width="5" height="20" rx="2" fill="var(--green)"/>
  <text x="34" y="309" font-size="12.5" font-weight="600" fill="var(--ink)">8 MB Octal</text>
  <rect x="170" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="276" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4</text>
  <text x="276" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB à l'exécution</text>
  <rect x="392" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="498" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8</text>
  <text x="498" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB à l'exécution</text>
  <rect x="614" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="720" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16</text>
  <text x="720" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB à l'exécution</text>
  <rect x="170" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="276" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R2</text>
  <text x="276" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB à l'exécution</text>
  <rect x="392" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="498" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R2</text>
  <text x="498" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB à l'exécution</text>
  <rect x="614" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="720" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R2</text>
  <text x="720" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB à l'exécution</text>
  <rect x="170" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="276" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R8</text>
  <text x="276" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB à l'exécution</text>
  <rect x="392" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="498" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R8</text>
  <text x="498" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB à l'exécution</text>
  <rect x="614" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="2.5"/>
  <text x="720" y="300" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R8</text>
  <text x="720" y="318" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB à l'exécution</text>
  <rect x="760" y="284" width="44" height="18" rx="4" fill="var(--card)" stroke="var(--green)" stroke-width="1"/>
  <text x="782" y="297" font-size="10.5" text-anchor="middle" fill="var(--green)">réf.</text>
  <text x="20" y="358" font-size="12" fill="var(--ink-2)">Ligne R8 : occupe GPIO33~37, limite de température ambiante 65 °C ; les six autres cases : GPIO33~37 libres, limite 85 °C.</text>
  <text x="20" y="378" font-size="12" fill="var(--ink-2)">R8 ne pousse que la PSRAM à 8 lignes ; la Flash reste en Quad SPI 4 lignes. La Flash 8 lignes, c'est le WROOM-2.</text>
  <text x="20" y="398" font-size="12" fill="var(--ink-3)">Mémoire à l'exécution = SRAM interne 512 KB + capacité PSRAM ; la Flash ne compte pas comme mémoire.</text>
</svg>

> **Figure 2** · Les neuf modèles sont exactement ces neuf cases — il n'y en a pas de dixième ; et c'est justement la case la plus capacitaire (`N16R8`) qui a la limite thermique la plus basse.

Hors de ces neuf cases, quelques variantes circulent souvent sur les pages de distributeurs :

| Variante | Lien avec les neuf combinaisons | Flash | PSRAM | Température ambiante |
|---|---|---|---|---|
| `-1U` (ex. `1U-N16R8`) | Les neuf cases tiennent ; seule l'antenne PCB devient un connecteur U.FL | idem | idem | idem |
| `H4` | Référence haute température sans PSRAM | 4 MB Quad | aucune | −40~105 °C |
| `N16R16VA` | Très grande capacité hors grille, SPI en 1,8 V | 16 MB Quad | 16 MB Octal | −40~65 °C |
| WROOM-2 `N16R8V` / `N32R8V` / `N32R16V` | Autre ligne de produits ; la Flash est aussi en 8 lignes | 16 / 32 MB Octal | 8 / 16 MB Octal | −40~65 °C |

`1U` ne diffère de la version sans `U` que par l'antenne : avec `U`, connecteur U.FL pour antenne externe, 18,0×19,2×3,2 mm ; sans `U`, antenne PCB, 18,0×25,5×3,1 mm. Pour intégrer dans un boîtier et sortir l'antenne, prenez la première. Le tableau de capacités est identique, mais les dégagements mécaniques et le parcours de certification de l'appareil complet diffèrent.

Deux pièges classiques :

- **`R8` ne pousse que la PSRAM à 8 lignes ; la Flash reste en Quad SPI 4 lignes.** L'« Octal » du nom désigne la PSRAM ; la Flash 8 lignes appartient au WROOM-2.
- **Il n'existe pas de `N6` dans les codes officiels.** Sur le WROOM-1, la Flash n'existe qu'en 4 / 8 / 16 MB. Face à un suffixe hors tableau, vérifiez la référence complète dans le datasheet — ne devinez pas d'après le nom.

Toutes classées par rapport à la référence `N16R8` :

| Combinaison | Flash | PSRAM | Écart avec `N16R8` | Mémoire à l'exécution | Limite de température |
|---|---|---|---|---|---|
| `N16R8` | 16 MB | 8 MB Octal | référence | 8,5 MB | 65 °C |
| `N8R8` | 8 MB | 8 MB Octal | 8 MB de Flash en moins | 8,5 MB | 65 °C |
| `N4R8` | 4 MB | 8 MB Octal | 12 MB de Flash en moins | 8,5 MB | 65 °C |
| `N16R2` | 16 MB | 2 MB Quad | 6 MB de PSRAM en moins, 8 lignes → 4 | 2,5 MB | 85 °C |
| `N8R2` | 8 MB | 2 MB Quad | 6 MB de PSRAM en moins ; 8 MB de Flash en moins | 2,5 MB | 85 °C |
| `N4R2` | 4 MB | 2 MB Quad | 6 MB de PSRAM en moins ; 12 MB de Flash en moins | 2,5 MB | 85 °C |
| `N16` | 16 MB | aucune | 8 MB de PSRAM en moins | 0,5 MB | 85 °C |
| `N8` | 8 MB | aucune | 8 MB de PSRAM en moins ; 8 MB de Flash en moins | 0,5 MB | 85 °C |
| `N4` | 4 MB | aucune | 8 MB de PSRAM en moins ; 12 MB de Flash en moins | 0,5 MB | 85 °C |

Trois constats :

1. **La PSRAM, c'est le grand saut.** 0 → 2 → 8 MB donne 0,5 / 2,5 / 8,5 MB de mémoire à l'exécution. De `N16` à `N16R2`, c'est ×5, puis encore ×3,4 jusqu'à `N16R8` ; passer de Quad à Octal fait aussi passer les lignes de données de 4 à 8.
2. **La Flash progresse par paliers égaux.** 4 / 8 / 16 MB, sans aucun effet sur la mémoire à l'exécution — plus de Flash, c'est juste plus de place pour firmware, polices et ressources. Donc `N16R2` contre `N8R8` n'est pas une question de « plus gros » : l'une a plus de disque, l'autre plus de mémoire.
3. **Capacité et contraintes vont en sens inverse.** La ligne R8 a le plus de capacité mais la limite thermique la plus basse (65 °C) et consomme GPIO33~37 ; les versions sans PSRAM montent à 85 °C avec le pinout le plus complet. Vouloir à la fois 8 MB de PSRAM et 85 °C : ces neuf cases ne le permettent pas — soit on redescend en R2, soit on active l'ECC sur R8 (encore 1/16 de capacité en moins).

Les cinq cartes se placent proprement dans le tableau :

- `S3 N16R8 MINI`, `XIAO S3 Plus` → équivalent `N16R8`
- `XIAO S3 / Sense` → équivalent `N8R8`
- `S3 SuperMini FH4R2` → équivalent `N4R2`, sauf que sa Flash est aussi dans le boîtier (le `F`) et que le die est en grade haute température (le `H`)
- `C3 SuperMini` → hors tableau : l'ESP32-C3 est une autre ligne d'architecture, 4 MB de Flash, sans PSRAM — la puce ne la prend pas en charge

## 03 Panorama des capacités

Chacune des cinq cartes occupe une case : `N16R8`, `N8R8`, `N4R2`, plus la C3 hors tableau. Les quatre S3 (Xtensa LX7 double cœur 240 MHz, avec FPU et instructions vectorielles) ; la C3 (RISC-V monocœur 160 MHz, sans PSRAM, non prise en charge). Les trois dernières S3 utilisent le même die ESP32-S3R8 : seule change la Flash embarquée, 8 ou 16 MB.

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Barres empilées de la capacité totale Flash + PSRAM pour les cinq cartes et les neuf combinaisons de module WROOM-1, même échelle jusqu'à 24 MB">
  <title>Figure 3 · Flash + PSRAM totaux : cinq cartes face à neuf combinaisons de module (même échelle, MB)</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">Bleu = Flash (disque)　Vert = PSRAM (mémoire)　Orange = Flash seule, sans PSRAM</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Cartes · les cinq de l'article</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="420" y1="48" x2="420" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="820" y1="48" x2="820" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="100" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="69" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="69" font-size="11.0" fill="var(--accent)">sans PSRAM</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="100" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="111" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="94" width="50" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="111" font-size="11.0" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="111" font-size="11.0" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="200" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="153" font-size="11.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="136" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="153" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="153" font-size="11.0" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="195" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="178" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="195" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="195" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="237" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="220" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="237" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="237" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Combinaisons de module · neuf variantes WROOM-1</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Même échelle : les quatre cartes S3 correspondent à trois cases</text>
  <text x="206" y="301" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="301" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="288" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="301" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="301" font-size="10.5" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="331" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="331" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="318" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="331" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="331" font-size="10.5" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="361" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="361" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="348" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="420" y="361" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="529" y="361" font-size="10.5" fill="var(--ink-3)">12 MB</text>
  <text x="206" y="391" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="391" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="378" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="645" y="391" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="679" y="391" font-size="10.5" fill="var(--ink-3)">18 MB</text>
  <text x="206" y="421" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="421" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="408" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="445" y="421" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="479" y="421" font-size="10.5" fill="var(--ink-3)">10 MB</text>
  <text x="206" y="451" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="451" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="438" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="451" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="451" font-size="10.5" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="481" font-size="11.5" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="400" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="420" y="481" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <text x="629" y="481" font-size="10.5" fill="var(--accent)">sans PSRAM</text>
  <text x="206" y="511" font-size="11.5" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="200" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="320" y="511" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="429" y="511" font-size="10.5" fill="var(--accent)">sans PSRAM</text>
  <text x="206" y="541" font-size="11.5" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="100" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="541" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="541" font-size="10.5" fill="var(--accent)">sans PSRAM</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="420" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">16</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">24 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">Les longueurs correspondent une à une : les cartes n'ajoutent pas de stockage — le module choisi fixe le plafond ; la C3 et les N16 / N8 / N4 n'ont pas de PSRAM.</text>
</svg>

> **Figure 3** · En haut les cinq cartes, en bas les neuf combinaisons de module : les longueurs correspondent une à une. Les totaux diffèrent jusqu'à 6×, mais le segment bleu est du disque, pas de la mémoire.

La « mémoire à l'exécution » (SRAM interne + PSRAM) est ce que le programme peut réellement allouer, et sa longueur ne dépend que de la PSRAM :

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Barres de la mémoire utilisable à l'exécution pour les cinq cartes et les neuf combinaisons de module : quatre niveaux 0,4, 0,5, 2,5 et 8,5 MB">
  <title>Figure 4 · Espace réellement utilisable comme mémoire à l'exécution : cinq cartes et neuf combinaisons</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">SRAM interne + PSRAM ; la Flash ne compte pas. Orange = 0,4~0,5 MB　Bleu = 2,5 MB　Vert = 8,5 MB</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Cartes · les cinq de l'article</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="353" y1="48" x2="353" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="487" y1="48" x2="487" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="753" y1="48" x2="753" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="26.7" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="256" y="69" font-size="12.0" fill="var(--accent)">0,4 MB (SRAM interne seule)</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="166.7" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="111" font-size="12.0" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="153" font-size="12.0" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="195" font-size="12.0" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="237" font-size="12.0" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Combinaisons de module · neuf variantes WROOM-1</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Même échelle : paliers 0,5 / 2,5 / 8,5 MB, un à un avec les cartes</text>
  <text x="206" y="301" font-size="11" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="301" font-size="10.5" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="331" font-size="11" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="331" font-size="10.5" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="361" font-size="11" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="361" font-size="10.5" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="391" font-size="11" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="391" font-size="10.5" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="421" font-size="11" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="421" font-size="10.5" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="451" font-size="11" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="451" font-size="10.5" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="481" font-size="11" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="481" font-size="10.5" fill="var(--accent)">0,5 MB</text>
  <text x="206" y="511" font-size="11" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="511" font-size="10.5" fill="var(--accent)">0,5 MB</text>
  <text x="206" y="541" font-size="11" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="541" font-size="10.5" fill="var(--accent)">0,5 MB</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="353" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">2</text>
  <text x="487" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">4</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">6</text>
  <text x="753" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">9 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">Le niveau haut vaut environ 21× le bas ; les 0,5 MB en plus viennent de la SRAM interne, d'où 0,1 MB d'écart seulement entre N4 / N8 / N16 et la C3.</text>
</svg>

> **Figure 4** · Ce que l'on peut vraiment `malloc()` est la mémoire à l'exécution : quatre paliers — 0,4 / 0,5 / 2,5 / 8,5 MB — jusqu'à ~21× d'écart. Les modèles sans `R` se réduisent à ce petit bout de SRAM interne.

Ordre de grandeur pour se repérer : une image RGB565 en 320×240 fait ~150 KB — 2 MB de PSRAM en gardent ~13 et 8 MB ~53 ; dix secondes d'audio mono 16 kHz / 16 bits font ~320 KB — 2 MB en bufferisent ~60 s, 8 MB ~250 s. « Assez de Flash » ne remplace jamais « assez de mémoire ».

| Dimension | S3 SuperMini FH4R2 | S3 N16R8 MINI | XIAO S3 / Sense | XIAO S3 Plus | C3 SuperMini |
|---|---|---|---|---|---|
| **Série** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-C3** (témoin) |
| Puce principale | ESP32-S3FH4R2 | ESP32-S3R8 | ESP32-S3R8 | ESP32-S3R8 | ESP32-C3FN4 |
| CPU | double cœur 240 MHz | double cœur 240 MHz | double cœur 240 MHz | double cœur 240 MHz | monocœur 160 MHz |
| Flash | 4 MB (boîtier) | 16 MB (carte) | 8 MB (carte) | 16 MB (carte) | 4 MB (boîtier) |
| PSRAM | 2 MB Quad | 8 MB Octal | 8 MB Octal | 8 MB Octal | aucune, non prise en charge |
| RAM interne | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 400 KB SRAM |
| Mémoire à l'exécution | 2,5 MB | 8,5 MB | 8,5 MB | 8,5 MB | 0,4 MB |
| Stockage total | 6 MB | 24 MB | 16 MB | 24 MB | 4 MB |
| GPIO utilisables | ~11 | ~20 | 11 (Sense +2) | 18 | 11 |
| Température de service | −40~85 °C | −40~65 °C | −20~65 °C | −20~65 °C | −40~85 °C |
| Prix indicatif | ~¥22 | ~¥26 | ~¥54 | ~¥62 | ~¥12 |

Les quatre S3 ont exactement la même RAM interne ; seules la Flash et la PSRAM changent. La C3 est une autre ligne d'architecture : pas d'USB OTG, pas d'interface LCD/caméra, pas d'instructions vectorielles, et impossible d'ajouter de la PSRAM via de la Flash externe. Elle est là pour illustrer la différence d'architecture, pas comme substitut.

## 04 En ajoutant les prix

> **Base des prix** : **~¥12 / ¥22 / ¥26 / ¥54 / ¥62** (yuan chinois) proviennent de canaux de vente au détail publics en 2026-11, arrondis pour couvrir taxes, port, promotions et différences de lot. Ce ne sont ni des prix officiels ni des cotations en direct : juste bons pour comparer des ordres de grandeur. Selon le marché et le moment, l'écart peut se compter en multiples ; faites foi au prix local réel.

<svg viewBox="0 0 900 320" width="100%" style="height:auto" role="img" aria-label="Barres horizontales des prix indicatifs des cinq cartes, d'environ 12 à environ 62 yuans">
  <title>Figure 5 · Prix indicatif et capacité : écarts au sein du même palier (même échelle)</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Longueur = prix indicatif ; à l'intérieur = stockage total / mémoire à l'exécution achetés ; la qualité n'est pas dans le graphique</text>
  <rect x="220" y="38" width="600" height="242" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="391" y1="38" x2="391" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="563" y1="38" x2="563" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="734" y1="38" x2="734" y2="280" stroke="var(--line)" stroke-width="1"/>
  <text x="20" y="70" font-size="13" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="103" height="26" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="230" y="70" font-size="12" fill="var(--ink)">4 MB · 0,4 MB</text>
  <text x="331" y="70" font-size="12" fill="var(--accent)">~¥12</text>
  <text x="20" y="114" font-size="13" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="96" width="189" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="114" font-size="12" fill="var(--ink)">6 MB · 2,5 MB</text>
  <text x="417" y="114" font-size="12" fill="var(--pen)">~¥22</text>
  <text x="20" y="158" font-size="13" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="140" width="223" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="158" font-size="12" fill="var(--ink)">24 MB · 8,5 MB</text>
  <text x="451" y="158" font-size="12" fill="var(--pen)">~¥26</text>
  <text x="20" y="202" font-size="13" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="184" width="463" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="202" font-size="12" fill="var(--ink)">16 MB · 8,5 MB</text>
  <text x="691" y="202" font-size="12" fill="var(--pen)">~¥54</text>
  <text x="20" y="246" font-size="13" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="228" width="531" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="246" font-size="12" fill="var(--ink)">24 MB · 8,5 MB</text>
  <text x="759" y="246" font-size="12" fill="var(--pen)">~¥62</text>
  <text x="220" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="391" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥20</text>
  <text x="563" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥40</text>
  <text x="734" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥60</text>
  <text x="20" y="316" font-size="12" fill="var(--ink-3)">Fourchette ~¥12 à 62, jusqu'à ~5,2× d'écart ; la longueur reflète le prix seul — la RF, la cohérence et la documentation n'y figurent pas.</text>
</svg>

> **Figure 5** · Deux cartes de capacité et de configuration identiques diffèrent d'environ ¥36 ; cet écart vient d'au-delà du tableau des capacités, et le graphique ne dit pas laquelle est meilleure.

Le cas le plus parlant : **le S3 N16R8 MINI à ~¥26 et le XIAO S3 Plus à ~¥62 ont Flash, PSRAM, mémoire à l'exécution et configuration firmware identiques**, avec ~¥36 (58 %) d'écart. Rapporté à la mémoire : ~¥3,06/MB contre ~¥7,29/MB. L'argent supplémentaire achète ce qui est hors du tableau des capacités.

Trois autres remarques :

1. **Prix au MB et prix absolu vont souvent en sens contraires.** La C3 est la moins chère en absolu, mais sans PSRAM, ses 0,4 MB reviennent à ~¥30/MB — dix fois le palier 8 MB Octal. La C3 est d'emblée pensée pour la basse consommation et la compacité.
2. **Des compromis existent aussi au sein d'une même série.** Le XIAO standard / Sense à ~¥54 coûte ~¥8 de moins que le Plus, avec moitié moins de Flash et 7 GPIO de moins ; mais le Sense ajoute caméra, micro et SD, tandis que le standard est plus petit et doté d'un U.FL.
3. **Le saut d'architecture est le plus important.** C3 → S3 SuperMini FH4R2 coûte ~¥10 de plus, la mémoire à l'exécution passe de 0,4 à 2,5 MB (6,25×), en changeant en même temps pour un double cœur 240 MHz, des instructions vectorielles et l'USB OTG. Ce n'est pas une mise à niveau : c'est un changement d'architecture.

<svg viewBox="0 0 900 420" width="100%" style="height:auto" role="img" aria-label="Nuage de points du prix indicatif en fonction de la mémoire à l'exécution, seules deux dimensions, sans information de qualité">
  <title>Figure 6 · Prix × mémoire à l'exécution : répartition en deux dimensions</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Deux dimensions seulement : prix indicatif et mémoire à l'exécution ; la RF, la cohérence des cartes, l'écosystème et la maintenance long terme ne sont pas sur les axes</text>
  <rect x="120" y="50" width="700" height="290" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="108" x2="820" y2="108" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="166" x2="820" y2="166" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="224" x2="820" y2="224" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="282" x2="820" y2="282" stroke="var(--line)" stroke-width="1"/>
  <line x1="320" y1="50" x2="320" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="520" y1="50" x2="520" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="720" y1="50" x2="720" y2="340" stroke="var(--line)" stroke-width="1"/>
  <rect x="132" y="60" width="178" height="42" rx="5" fill="var(--card)" stroke="var(--line-2)" stroke-width="1"/>
  <text x="144" y="78" font-size="11" fill="var(--ink)">Prix et mémoire seuls</text>
  <text x="144" y="94" font-size="11" fill="var(--ink)">pas de dimension qualité</text>
  <circle cx="240" cy="328" r="5" fill="var(--accent)"/>
  <text x="252" y="332" font-size="12" fill="var(--accent)">C3 SuperMini ~¥12 · 0,4 MB</text>
  <circle cx="340" cy="268" r="5" fill="var(--pen)"/>
  <text x="352" y="272" font-size="12" fill="var(--pen)">S3 SuperMini FH4R2 ~¥22 · 2,5 MB</text>
  <circle cx="380" cy="94" r="5" fill="var(--pen)"/>
  <text x="392" y="80" font-size="12" fill="var(--pen)">S3 N16R8 MINI ~¥26 · 8,5 MB</text>
  <circle cx="660" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="650" y="118" font-size="12" fill="var(--ink-2)">XIAO S3 / Sense ~¥54 · 8,5 MB</text>
  <circle cx="740" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="880" y="76" font-size="12" text-anchor="end" fill="var(--ink-2)">XIAO S3 Plus ~¥62 · 8,5 MB</text>
  <text x="120" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="320" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥20</text>
  <text x="520" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥40</text>
  <text x="720" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥60</text>
  <text x="820" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥70</text>
  <text x="112" y="54" font-size="12" text-anchor="end" fill="var(--ink-3)">10</text>
  <text x="112" y="112" font-size="12" text-anchor="end" fill="var(--ink-3)">8</text>
  <text x="112" y="170" font-size="12" text-anchor="end" fill="var(--ink-3)">6</text>
  <text x="112" y="228" font-size="12" text-anchor="end" fill="var(--ink-3)">4</text>
  <text x="112" y="286" font-size="12" text-anchor="end" fill="var(--ink-3)">2</text>
  <text x="112" y="344" font-size="12" text-anchor="end" fill="var(--ink-3)">0</text>
  <text x="20" y="400" font-size="12" fill="var(--ink-3)">↑ Mémoire à l'exécution (MB)　→ Prix indicatif (¥)　Les trois points à 8,5 MB sont alignés horizontalement : l'écart de prix ne vient pas du stockage.</text>
</svg>

> **Figure 6** · Trois points sur la même ligne horizontale de 8,5 MB : les écarts de prix ne viennent pas du stockage. Ce que le graphique ne montre pas — RF, contrôle qualité, documentation — est souvent l'origine de l'écart.

En tableau (la dernière colonne est le prix par capacité) :

| Modèle | Prix indicatif | Stockage total | Mémoire à l'exécution | Prix par capacité (~¥ / MB d'exécution) | Multiple de prix |
|---|---|---|---|---|---|
| C3 SuperMini | ~¥12 | 4 MB | 0,4 MB | ~¥30,00 | 1,00× |
| S3 SuperMini FH4R2 | ~¥22 | 6 MB | 2,5 MB | ~¥8,80 | 1,83× |
| S3 N16R8 MINI | ~¥26 | 24 MB | 8,5 MB | ~¥3,06 | 2,17× |
| XIAO S3 / Sense | ~¥54 | 16 MB | 8,5 MB | ~¥6,35 | 4,50× |
| XIAO S3 Plus | ~¥62 | 24 MB | 8,5 MB | ~¥7,29 | 5,17× |

### Ce que paie l'écart de prix

**Ce qui se compare, c'est le prix, pas la qualité.** Le même ensemble 16 MB Flash + 8 MB Octal PSRAM peut encore différer sur une carte à cause de :

- **RF et antenne** : adaptation, dégagements et réglage décident de la performance réelle WiFi / BLE, et la présence d'un connecteur U.FL est une autre affaire. Les critiques classiques des cartes bon marché — signal faible, instabilité derrière une cloison — n'apparaissent sur aucune fiche ; seul le design, la certification et le RSSI mesuré les révèlent.
- **Contrôle qualité** : protections d'alimentation et USB, soudures, matériau du PCB, dispersion entre lots — tout cela pèse sur la stabilité à long terme et sur les problèmes inexpliqués en mise au point.
- **Documentation et maintenance** : schémas, brochage, firmware d'exemple, communauté, continuité d'approvisionnement. Les cartes de marque comme XIAO coûtent souvent plus cher ici, pas pour leur Flash ou PSRAM.
- **Conformité** : un design à die nu ne peut pas s'appuyer sur la certification RF d'un module ; la conformité RF au niveau carte doit être vérifiée séparément.

« On en a pour son argent » reste globalement vrai — **mais pas dans l'autre sens**. Cher ne veut pas dire meilleur partout : prime de marque, marge distributeur et différences de lot comptent aussi. Les cartes génériques varient de plusieurs fois selon le marché, tandis que les cartes de marque ont des prix mondiaux assez uniformes ; refaites la comparaison dans votre marché.

Un ordre plus sûr : **filtrez d'abord par capacité, mode PSRAM et configuration firmware les cartes « qui peuvent tourner » ; comparez ensuite RF, stabilité, documentation et approvisionnement ; et ne regardez le prix qu'à la fin.**

## 05 Traduire la capacité en configuration

Les capacités d'une fiche ne deviennent pas d'elles-mêmes un firmware qui tourne. Cinq réglages, tous calculables avant l'achat :

1. **Aligner Flash size sur le matériel.** `CONFIG_ESPTOOLPY_FLASHSIZE_4MB / 8MB / 16MB` (ou Flash Size dans Arduino) doit correspondre au die embarqué ; trop grand, l'OTA ou l'initialisation du système de fichiers accède à des adresses inexistantes.
2. **Aligner le mode PSRAM sur le câblage.** La 2 MB Quad dans le boîtier utilise `CONFIG_SPIRAM_MODE_QUAD`, la 8 MB Octal utilise `CONFIG_SPIRAM_MODE_OCT` ; sous Arduino, `QSPI PSRAM` / `OPI PSRAM`. **Se tromper ici ne ralentit pas la carte : elle abandonne au démarrage.**
3. **Faire d'abord l'addition des partitions.** La Flash n'est pas l'espace disponible pour le firmware : table de partitions, nvs, otadata et phy_init prennent d'abord une part, le reste se partage entre app et partition de données. **La double OTA exige un slot de même taille pour la version suivante** — environ `app × 2 + partition de données + surcoût fixe`. Un firmware avec pile protocolaire et bibliothèque graphique fait souvent 1~2 MB ; doublé pour l'OTA, on approche 4 MB, et 1 MB réservé aux polices et images fait déborder — c'est là que les cartes 4 MB échouent le plus souvent. Additionnez d'abord la taille réelle de votre firmware ; si ça ne tient pas, passez à 16 MB ou revenez à l'OTA simple.
4. **Budgéter les tampons PSRAM.** Framebuffers, tampons de handshake TLS, tas de décodage JSON et images vivent en PSRAM ; estimez « somme des tampons résidents en pic × 1,3 » et comparez aux paliers 2 MB / 8 MB. Les tampons DMA, piles de tâches et variables statiques ne vont pas en PSRAM par défaut : il faut une configuration explicite.
5. **Changer de target entre architectures.** La C3 est RISC-V, la S3 Xtensa : `CONFIG_IDF_TARGET`, toolchain et configuration SDK changent en bloc ; tous les `CONFIG_SPIRAM_*` sont inopérants sur C3 — ne les mettez pas.

Une configuration 16 MB + Octal typique ressemble à ceci :

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
```

| Palier de capacité | Réglages | Effet concret |
|---|---|---|
| 16 MB Flash + 8 MB Octal | `FLASHSIZE_16MB` + `MODE_OCT` + `SPEED_80M` | Double OTA et partition de données tiennent, ressources confortables |
| 8 MB Flash + 8 MB Octal | Idem, Flash size sur `8MB` | La double OTA tient encore, mais la partition de données se réduit nettement : polices et images à doser |
| 4 MB Flash + 2 MB Quad | `FLASHSIZE_4MB` + `MODE_QUAD` + table de partitions 4 MB | La double OTA ne tient généralement pas : OTA simple ; recalculer les tampons PSRAM sur 2 MB |
| 4 MB Flash, sans PSRAM (C3) | `IDF_TARGET=esp32c3` + table de partitions 4 MB | Tous les `SPIRAM_*` sont inapplicables ; budget mémoire sur la seule SRAM interne |

En une phrase : **avant de choisir, faites trois calculs** — le firmware et les ressources tiennent-ils dans la Flash, les tampons de pic tiennent-ils dans la PSRAM, les options correspondent-elles au matériel réel ? Si les trois passent, la carte est utilisable.

## 06 Comment choisir, quels pièges éviter

**Partez de ce dont le programme a besoin pour en déduire la capacité, puis choisissez parmi les cartes qui passent le seuil** — ne classez pas par prix ou par chiffres de fiche :

| Besoin réel du programme | Palier minimal suffisant | Pourquoi |
|---|---|---|
| Rafraîchissement plein écran couleur ou niveaux de gris, framebuffers multicouches, polices et images locales, streaming audio, ou double OTA + système de fichiers | 16 MB Flash + 8 MB Octal PSRAM | 8,5 MB de mémoire à l'exécution laissent de la place au framebuffer et à TLS ; la Flash contient deux copies d'app et une zone de ressources |
| Rafraîchissement plein écran monochrome, agrégation de capteurs, OTA simple, peu de JSON | 4 MB Flash + 2 MB Quad PSRAM | 2,5 MB de mémoire à l'exécution suffisent, mais polices et images doivent être petites |
| Uniquement de la remontée réseau, sans interface, consommation et taille prioritaires | 4 MB Flash, sans PSRAM (C3) | 0,4 MB couvrent la pile protocolaire et de petits tampons, au prix d'une basse consommation et d'un encombrement minimal |
| Caméra / micro / carte SD nécessaires, ou contrainte de format portable | XIAO standard / Sense en 8 MB Flash | Les contraintes portent sur l'intégration carte et le nombre de broches, pas sur la capacité |

Un critère hors tableau peut éliminer d'emblée certaines cartes : **la plage de température étendue**. La PSRAM Octal 8 MB est spécifiée −40~65 °C ; pour tourner à 85 °C, il faut une référence Quad dans le boîtier, ou activer l'ECC (1/16 de capacité utilisable en moins). Sur ce point, la `S3 SuperMini FH4R2` est plus souple.

Liste des pièges :

- La PSRAM Octal 8 MB occupe **GPIO33~37** — ne réutilisez pas les broches marquées indisponibles dans la documentation.
- Le `H` de `FH4R2` indique seulement que le die Flash est en grade haute température ; **cela ne signifie pas que la puce entière tient 105 °C** — le datasheet actuel donne −40~85 °C.
- Un design à die nu ne peut pas s'appuyer sur la certification RF d'un module ; pour un produit, la conformité RF au niveau carte se vérifie séparément. `ESP32-C3FN4` est marqué EOL sur le site d'Espressif : pour un nouveau design, prenez une référence en production.
- La Flash et la PSRAM dans le boîtier partagent le même jeu de lignes SPI et les broches sont saturées — **aucune extension de stockage externe n'est possible** ; pour un stockage propre, repartez d'une référence non co-packagée et redessinez la carte.
- La performance réelle de l'antenne n'est jamais sur la fiche. Si la connexion est instable ou coupe derrière une cloison, vérifiez d'abord le dégagement de l'antenne et la présence d'un U.FL, puis mesurez le RSSI — ce type de retour est fréquent sur certaines cartes bon marché ; n'en faites pas tout de suite un bug de firmware.

### Les coûts au-delà du prix

Un prix indicatif n'est que le point de départ du matériel. Entre « une carte qui s'allume » et « un produit stable pendant des années », il y a quatre blocs de coûts, sans rapport avec « combien de MB de Flash ou de PSRAM » : **ingénierie matérielle** (thermique, alimentation et batterie, réglage d'antenne, CEM de l'appareil), **ingénierie logicielle** (adaptation des pilotes, veille/réveil, reprise sur incident, rollback OTA, compatibilité long terme), **certification** (CEM / RF de l'appareil, accès au marché) et **production et service** (rendement, homogénéité des lots, pièces de rechange).

Leur ampleur varie énormément selon le produit et n'apparaît jamais sur une fiche produit. Cet article compare donc **des paramètres matériels au moment du choix**, pas la structure de coûts d'un produit fini : bien lire les spécifications évite d'acheter la mauvaise carte ; ce qu'il reste à investir ensuite dépend du projet.

---

**Sources et méthode** : Espressif *ESP32-S3 Series Datasheet v2.2*, tableaux 1-1 / 2-14 / 5-11 / 5-12 ; *ESP32-C3 Series Datasheet* ; *ESP32-S3-WROOM-1 & 1U Datasheet*, tableaux 1-1 / 1-2 (neuf codes de commande, types de Flash et PSRAM, plages de température, dimensions du module) ; *ESP32-S3-WROOM-2 Datasheet* (SPI 1,8 V et paliers 32 MB) ; wiki officiel et spécifications de la série Seeed Studio XIAO ESP32-S3 ; documentation publique du fabricant de la carte S3 N16R8 MINI ; ESP-IDF *Support for External RAM* et la documentation de configuration des cartes Arduino-ESP32. Les capacités sont nominales ; le tas réellement allouable avec `malloc()` est un peu plus petit. Bande passante PSRAM, plage de température et occupation des GPIO suivent le dernier datasheet de chaque référence. Les prix de cet article sont des **ordres de grandeur en yuan chinois (CNY)** issus de canaux de détail publics, méthode en section 04 ; ils ne constituent ni une évaluation de qualité ni un conseil d'achat.
