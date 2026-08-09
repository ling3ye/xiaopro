---
title: "Dompter le CH32V307 sur Mac depuis zéro : du « il me pond un tas de .exe Windows » au « la LED clignote, le port série cause » — journal de galère complet"
domain: hardware
platforms: ["mac"]
format: "tutorial"
date: 2026-08-08
intro: "Monter un environnement de dév CH32V307 sur Mac depuis zéro, installer la plateforme PlatformIO, et découvrir que la toolchain te balance une floppée de .exe Windows ? Voici le récit brut de mes galères réelles : passer manuellement à la toolchain RISC-V native macOS, lever la quarantaine Gatekeeper, faire marcher le flash via le WCH-Link intégré, jusqu'à creuser la vraie cause du « compile et flash OK, le port série a bien des sorties, mais la LED refuse de s'allumer » — à savoir que la LED utilisateur n'est même pas câblée au MCU en usine. Toutes les commandes et messages d'erreur viennent d'une session réelle ; les 10 pièges rencontrés sont tous exposés, sans exception, pour vacciner à l'avance celles et ceux qui débarquent de l'écosystème Arduino/ESP."
tags: ["CH32V307", "PlatformIO", "WCH-Link", "RISC-V", "microcontrôleur RISC-V", "développement embarqué macOS", "WCH", "CH32V macOS"]
image: https://img.lingflux.com/2026/08/d9106f173bc51c93033527dd5e206b04.png
---

> Lingshun Lab · Série « galères embarquées »
>
> Matériel : **CH32V307V-EVT-R1** (débogueur WCH-Link intégré, puce RISC-V de WCH)
> Système : **macOS (Apple Silicon, arm64)**
> Outils : VSCode + PlatformIO
> Objectif : monter l'environnement de dév depuis zéro, allumer une LED, et faire parler le port série — le « Hello World » universel de l'embarqué

## Avant-propos : pourquoi cet article existe

Laisse-moi d'abord poser le « personnage » de cet article, sinon en lisant la suite tu vas voir certaines de mes manips et marmonner « ce mec a vraiment déjà codé sur un microcontrôleur un jour ? » —

Ça fait un bail que je bricole sur Arduino et ESP-IDF. Faire clignoter une LED, se connecter en WiFi, faire tourner MQTT, tout ça c'est devenu de la mémoire musculaire : je pourrais allumer une LED les yeux fermés. Du coup, quand j'ai reçu cette carte CH32V307, je me disais tranquillement : « c'est juste une puce de plus, allumer une LED, ça peut être si dur que ça ? »

Résultat, j'ai pris une belle leçon de la part du réel. Le « réglage d'usine » de l'écosystème CH32 n'a absolument rien à voir avec la vision du monde Arduino/ESP où « tu branches, tu flashes, tu écris juste, ça s'allume » :

- **Pour flasher un programme, faut sortir un programmateur dédié.** Arduino et ESP32 gèrent tout (alim, flash, port série) avec un seul câble USB ; CH32 me colle un débogueur embarqué qui s'appelle **wlink**, et juste pour comprendre « comment il fait pour coller le firmware dans la puce », j'ai tourné en rond un bon moment.
- **La LED embarquée n'est même pas câblée au MCU.** Chez Arduino, la LED intégrée est soudée fixe sur la pin 13, un coup de `digitalWrite(13, HIGH)` et elle s'allume ; sur cette carte, les LED utilisateur sont **… livrées en l'air, déconnectées de toute broche**, il faut que je file un câble Dupont pour que la LED veuille bien daigner s'illuminer.
- **Côté port série, faut choisir la bonne porte.** Sur ESP32, tu branches, c'est un port série USB, what you see is what you get ; CH32 par défaut passe par l'USART1 virtualisé par le débogueur, et si tu ne pointes pas le bon port, c'est silence radio, à te faire douter que la carte est grillée devant un moniteur désespérément vide.

C'est là que j'ai vraiment compris ce que veut dire « un vétéran qui se plante magistralement » : plus d'une décennie à faire clignoter des LED, et je me retrouve à douter de moi sur une puce RISC-V, presque persuadé que tout ce que j'avais appris en embarqué était bon à jeter.

Du coup, cet article n'est pas juste un « tuto », c'est aussi un **journal de galère** d'un utilisateur Arduino/ESP qui découvre CH32 pour la première fois. Mes erreurs bêtes, celles qui feront hurler les habitués, seront toutes exposées brutes — parce que si toi aussi tu débarques d'Arduino/ESP, il y a de fortes chances que tu les refasses exactement pareilles. Prends-les comme un vaccin ; après, les pièges te paraîtront beaucoup plus familiers.

---

Bon, fini de parler de moi, revenons au sujet. Si tu cherches « CH32V307 + Windows », tu trouves le MounRiver Studio officiel, tu installes, ça marche ; si tu cherches « CH32V307 + Linux », la toolchain officielle est plutôt bien servie.

Mais si tu cherches « CH32V307 + macOS »… t'as intérêt à préparer un bon silence. Les docs sont dispersées, et tout est truffé de pièges. La puce en elle-même est une bête : cœur RISC-V 32 bits, jusqu'à 144 MHz, rapport qualité/prix qui écrase pas mal de microcontrôleurs ARM — mais sur Mac, c'est l'orpheline que personne n'aime.

Cet article, c'est le récit complet de mon installation depuis zéro de l'environnement de dév CH32V307 sur Mac, à travers tous les pièges et toutes les rustines, jusqu'à l'allumage final de la LED + port série opérationnel. **Je n'en saute aucun**, parce que tu vas probablement tomber dedans aussi ; tout poser sur la table t'évitera bien des détours. Le code complet est sur GitHub (lien en fin d'article), ici on se concentre sur le « pourquoi on fait ça ».

Petit teaser du résultat final : compilation OK, flash OK, la LED sur la carte clignote à un rythme régulier, et le moniteur série affiche en parallèle :

```
CH32V307 démarré, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

Entre « rien du tout » et ce tableau, j'ai pris au moins **8 pièges**. Lis la suite, je n'en lâche aucun.

### Sommaire

- [1. Rencontre avec la protagoniste : la CH32V307V-EVT-R1](#1-rencontre-avec-la-protagoniste--la-ch32v307v-evt-r1)
- [2. Plan d'ensemble : à quoi ressemble cette toolchain](#2-plan-densemble--à-quoi-ressemble-cette-toolchain)
- [3. Au boulot : de l'install de VSCode à la commande pio](#3-au-boulot--de-linstall-de-vscode-à-la-commande-pio)
- [4. Installer la plateforme CH32V (et un premier petit piège)](#4-installer-la-plateforme-ch32v-et-un-premier-petit-piège)
- [5. Le gros piège : pourquoi tu te retrouves avec plein de `.exe`](#5-le-gros-piège--pourquoi-tu-te-retrouves-avec-plein-de-exe)
- [6. Le dépiégeage : passer à la toolchain native macOS](#6-le-dépiégeage--passer-à-la-toolchain-native-macos)
- [7. Lever la quarantaine Gatekeeper (sinon macOS te traite de virus et te bloque)](#7-lever-la-quarantaine-gatekeeper-sinon-macos-te-traite-de-virus-et-te-bloque)
- [8. Vérifier que la toolchain tourne vraiment](#8-vérifier-que-la-toolchain-tourne-vraiment)
- [9. Créer ton premier projet : comprendre `platformio.ini`](#9-créer-ton-premier-projet--comprendre-platformioini)
- [10. Première compilation](#10-première-compilation)
- [11. Mettre `pio` en commande globale](#11-mettre-pio-en-commande-globale)
- [12. Câblage matériel et flash](#12-câblage-matériel-et-flash)
- [13. Piège ① : compile et flash OK, mais le port série est muet](#13-piège---compile-et-flash-ok-mais-le-port-série-est-muet)
- [14. Piège ② (le plus gros de tout l'article) : le port série cause, mais la LED ne veut rien savoir](#14-piège--le-plus-gros-de-tout-larticle--le-port-série-cause-mais-la-led-ne-veut-rien-savoir)
- [15. Une fois que ça roule : à quoi ressemble le `main.c` complet](#15-une-fois-que-ça-roule--à-quoi-ressemble-le-mainc-complet)
- [16. Tableau récapitulatif des pièges](#16-tableau-récapitulatif-des-pièges)
- [17. Anti-sèche : commandes clés & chemins](#17-anti-sèche--commandes-clés--chemins)
- [18. Te bâtir ta « logique de dév CH32 » pour recoller direct sur le prochain projet](#18-te-bâtir-ta-logique-de-dév-ch32-pour-recoller-direct-sur-le-prochain-projet)
- [19. FAQ](#19-faq)
- [20. Et après ?](#20-et-après)
- [21. Références](#21-références)

---

## 1. Rencontre avec la protagoniste : la CH32V307V-EVT-R1

Avant de se lancer, prends deux minutes pour faire connaissance avec cette carte, parce que 90 % des pièges qui suivent sont liés à sa « personnalité ».

| Caractéristique | Détail |
| --- | --- |
| Puce principale | CH32V307VCT6, noyau QingKe V4F de WCH, RISC-V 32 bits, fréquence max **144 MHz**, boîtier LQFP80 |
| Capacité Flash réelle | **288KB** (mais PlatformIO compile par défaut avec 256KB Flash + 64KB SRAM, on verra plus loin pourquoi ne pas y toucher) |
| Débogueur embarqué | **WCH-Link** (en fait incarné par une puce CH32V305 qui « joue le rôle », équivalent au WCH-LinkE officiel) |
| Port USB | Un seul USB-C qui gère alim, debug et port série virtuel |
| LED utilisateur | LED1, LED2, deux LED — **⚠️ par défaut elles sont en l'air, pas câblées au MCU !** (c'est le plus gros piège de l'article, voir chapitre 14) |
| Bouton utilisateur KEY | Lui aussi en l'air par défaut |
| LED de puissance | 1, allumée fixe dès que la carte est alimentée, complètement indépendante de ton code — pas mal de monde la voit s'allumer à la mise sous tension et croit « j'ai réussi à allumer la LED », alors que c'est juste la LED d'alim |

Il y a aussi un détail facile à rater sur cette carte : entre la puce du débogueur (CH32V305) et la puce cible (CH32V307), l'usine a ponté les deux via **4 cavaliers** (les sérigraphies sont `RX1-TX0`, `TX1-RX0`, `DIO-DIO0`, `CLK-CLK0`), chargés de faire « passer le pont » au signal SWIO et au signal série du débogueur vers la puce cible.

> ⚠️ **Ces 4 cavaliers sont mis d'usine, ne vas pas les arracher par réflexe.** Sans eux, au mieux tu ne flash plus, au pire le port série disparaît, et tu vas croire que ton code bug, alors que c'est juste le hardware qui est coupé — tu vas bidouiller pendant des heures pour finalement découvrir que c'était les cavaliers. Ça pique, ne me demande pas comment je sais.

Bon, présentations faites, on attaque l'environnement.

---

## 2. Plan d'ensemble : à quoi ressemble cette toolchain

D'abord la « photo de famille », pour clarifier qui dirige qui :

```
┌──────────────────────────────────────────────────────────┐
│ VSCode + extension PlatformIO IDE (GUI : compile/flash/debug/série)│
│                          │                                │
│                   PlatformIO Core (CLI pio)               │
│                          │                                │
│            ┌─────────────┴──────────────┐                 │
│       plateforme ch32v (communauté : Community-PIO-CH32V)  │
│            │                             │                 │
│   ┌────────┼─────────┬───────────┐       │                 │
│ toolchain  wlink    openocd    board     │                 │
│(RISC-V GCC)(flash)  (debug)  (config board)│               │
└──────────────────────────────────────────┘
                     │ USB
        CH32V307V-EVT-R1 (WCH-Link intégré)
```

![](https://img.lingflux.com/2026/08/73dff7f41fe1d3c38d06447b98a39f2b.png)

**En une phrase** : l'extension PlatformIO de VSCode est l'interface frontale, celui qui bosse vraiment c'est l'outil en ligne de commande `pio` ; `pio` s'appuie sur une plateforme communautaire appelée `Community-PIO-CH32V`, qui empaquette ensemble « compilateur (toolchain) + outil de flash (wlink) + outil de debug (openocd) + paramètres de la carte (board) ». En théorie, une install et ça roule.

Cette plateforme communautaire est plutôt bien fournie : elle supporte nativement toute la gamme CH32V003/103/203/30x, et propose en plus plusieurs frameworks au choix — la bibliothèque périphérique officielle WCH (noneos-sdk), FreeRTOS, RT-Thread, Arduino, ch32fun…

Mais — et c'est là que se niche le plus gros tournant de tout l'article — **cette plateforme est configurée par défaut pour les habitudes des utilisateurs Windows**, et les utilisateurs macOS vont probablement rester bouche bée après l'install. Comment ça, bouche bée ? Réponse dans la section suivante.

---

## 3. Au boulot : de l'install de VSCode à la commande pio

### Step 0 : vérifier l'environnement de base

Ouvre un terminal et prends la température :

```bash
python3 --version          # il faut du 3.x
brew --version              # Homebrew, pas obligatoire mais fortement recommandé
uname -m                    # Apple Silicon doit renvoyer arm64, Intel Mac renvoie x86_64
```

Puis installe VSCode + l'extension PlatformIO :

1. Va sur https://code.visualstudio.com/ télécharger et installer VSCode ;
2. Ouvre VSCode, icône « Extensions » à gauche → cherche `PlatformIO IDE` → Install ;
3. Une fois l'extension installée, elle va automatiquement télécharger PlatformIO Core lui-même dans `~/.platformio/` (quelques centaines de Mo, avec son propre environnement virtuel Python), une barre de progression s'affiche en bas à droite, patiente quelques minutes.

Une fois terminé, une icône en forme de fourmi apparaît dans la barre de gauche : c'est le logo de PlatformIO (leur mascotte est vraiment une fourmi).

### Step 1 : débusquer la commande pio cachée

Une fois l'extension installée, l'outil en ligne de commande `pio` existe déjà, mais il n'est pas dans le PATH système, donc si tu tapes `pio` directement dans le terminal, tu ne le trouveras pas. Il est planqué là :

```bash
~/.platformio/penv/bin/pio
```

Vérifions :

```bash
~/.platformio/penv/bin/pio --version
# PlatformIO Core, version 6.1.19
```

Pour se simplifier la vie dans les commandes qui suivent, on pose une variable temporaire (valable seulement dans la fenêtre de terminal courante) :

```bash
PIO=~/.platformio/penv/bin/pio
```

Tous les `$PIO` qu'on verra dans les commandes qui suivent désignent ce chemin. Une fois tout en place, on le transformera en commande globale au chapitre 11, pour pouvoir taper directement `pio`.

---

## 4. Installer la plateforme CH32V (et un premier petit piège)

On installe la plateforme communautaire via la commande de gestion de paquets de PlatformIO :

```bash
$PIO pkg install -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git
```

Cette étape cache deux détails faciles à rater :

> **Piège ① : le nom de l'organisation est facile à mal taper.** Le nom correct de l'organisation GitHub est `Community-PIO-CH32V` (note le **PIO** au milieu, en majuscules). Pas mal de vieux articles et de vieux posts écrivent `community-ch32v` (sans le PIO), et si tu recopies ça, tu te prends une erreur assez frustrante :
> ```
> remote: Repository not found.
> ```
> Recopie bien `Community-PIO-CH32V` à la lettre.

> **Piège ② : utiliser une commande obsolète.** Les vieux tutos aiment écrire `pio platform install ...`, mais cette commande est **dépréciée** dans les nouvelles versions de PlatformIO, elle te sort `This command is deprecated`. Aujourd'hui on passe tous par `pio pkg install -g -p <adresse>`.

La commande en route va récupérer l'un après l'autre la plateforme elle-même, la toolchain RISC-V, openocd, wlink — quatre paquets. Tout a l'air normal, pas d'erreur dans les logs. **Mais ne débouche pas le champagne trop vite** — le vrai gros piège arrive maintenant.

---

## 5. Le gros piège : pourquoi tu te retrouves avec plein de `.exe`

C'est la section la plus dense de l'article, et c'est aussi là que la grande majorité des utilisateurs macOS restent bloqués à douter d'eux-mêmes.

Une fois la plateforme installée, regardons à quoi ressemble la toolchain réellement téléchargée en local :

```bash
ls ~/.platformio/packages/toolchain-riscv/bin/ | head
# riscv-none-embed-addr2line.exe
# riscv-none-embed-ar.exe
# riscv-none-embed-as.exe
# ...
```

Regardons aussi l'outil de flash wlink :

```bash
file ~/.platformio/packages/tool-wlink/wlink.exe
# PE32 executable (console) Intel 80386, for MS Windows
```

Tu vois ? Tout est en **`.exe`** — de vrais binaires Windows PE32, totalement inutiles sur macOS, tu peux toujours double-cliquer, ça ne s'ouvrira pas, et encore moins compiler du code. Première réaction en voyant ça : « je suis sur Mac, tu m'envoies des trucs Windows, c'est quoi cette blague ? »

### Creuser la cause racine : le problème vient de `platform.json`

Ouvrons le fichier de config de la plateforme :

```bash
cat ~/.platformio/platforms/ch32v/platform.json | python3 -m json.tool | grep -A3 toolchain-riscv
```

Résultat :

```json
"toolchain-riscv": {
  "type": "toolchain",
  "owner": "platformio",
  "version": "https://github.com/Community-PIO-CH32V/toolchain-riscv-windows.git"
}
```

**Affaire classée** : le fichier de config de la plateforme a **figé en dur** la source de la toolchain sur `toolchain-riscv-windows.git`, et l'outil de flash wlink est lui aussi figé sur la branche `#windows`. PlatformIO ne détecte pas intelligemment « quel système tu utilises » à l'installation : il installe ce que le fichier de config dit d'installer, et traite tout le monde de la même manière — y compris nous, les malheureux utilisateurs Mac — avec la version Windows.

**La bonne nouvelle** : la même organisation `Community-PIO-CH32V` a depuis longtemps préparé des dépôts avec les versions natives macOS, ils ne sont juste pas le défaut. Maintenant que la cause racine est claire, la rustine coule de source — **remplacer manuellement ces deux paquets Windows par leurs versions natives macOS**. Comment faire exactement, et à quoi faire attention à chaque étape, c'est l'objet du chapitre suivant.

---

## 6. Le dépiégeage : passer à la toolchain native macOS

### 6.1 Remplacer le compilateur RISC-V

D'abord virer la version Windows :

```bash
rm -rf ~/.platformio/packages/toolchain-riscv
```

Puis installer la version native macOS :

```bash
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/toolchain-riscv-mac.git
```

Si l'install réussit, tu vois un message de ce genre :

```
Tool Manager: toolchain-riscv@1.80200.190731+sha.99cb62f has been installed!
```

Une fois installé, vérifie : son `package.json` contient `"system": ["darwin_x86_64", "darwin_arm64"]`, donc c'est bien prévu pour macOS, le nom du paquet reste `toolchain-riscv`, il remplace sans couture l'ancienne version Windows.

> **Pourquoi prendre la branche `main` ici, et pas la branche `gcc12` qui a l'air plus récente ?**
>
> Il y a une subtilité technique pas évidente. Le script de build de la plateforme (`builder/main.py`) contient ce bout de logique :
> ```python
> is_gcc_12 = platform.get_package_version("toolchain-riscv").split(".")[1].startswith("12")
> compiler_triple = "riscv-wch-elf" if is_gcc_12 else "riscv-none-embed"
> ```
> En langage humain : le script regarde le **deuxième segment du numéro de version** de la toolchain installée ; si c'est `1.8.x`, il décrète que le préfixe de l'exécutable compilateur est `riscv-none-embed-gcc` ; si c'est `1.12.x`, il décrète que c'est `riscv-wch-elf-gcc`. Les deux préfixes correspondent à des noms d'exécutables complètement différents, et si tu te trompes, la commande appelée par le script de build n'existe tout simplement pas sur le disque — erreur directe.
>
> La branche `main` produit exactement la version `1.80200.190731` (gcc 8.2.0), identique à celle figée par défaut pour Windows dans la plateforme, ce qui déclenche la branche `riscv-none-embed` — exactement ce que le script attend. Zéro risque, le plus sûr.

Attention à un détail une fois installé :

> ⚠️ **Cette version gcc8 du compilateur est en fait un binaire x86_64**, c'est-à-dire compilé pour Intel Mac, pas arm64 natif pour Apple Silicon. La raison est simple : xPack (l'empaqueteur en amont de la toolchain) n'avait pas de build arm64 à l'époque de gcc8. Sur Mac à puce série M, ce compilateur tourne donc traduit par **Rosetta 2**. Ça paraît moins « natif », mais en pratique la compile fonctionne parfaitement, ne te prends pas la tête : à la première exécution, le système te proposera d'installer Rosetta, installe-le et c'est plié.

### 6.2 Remplacer l'outil de flash wlink

Même opération, remplacer la version Windows de wlink par la version native macOS :

```bash
rm -rf ~/.platformio/packages/tool-wlink
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_arm64
```

> Si tu es sur un vieux Mac à processeur Intel, le nom de branche devient `mac_x64` :
> ```bash
> $PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_x64
> ```

Une fois installé :

```
Tool Manager: tool-wlink@0.23.241116+sha.0c802d4 has been installed!
```

> **openocd, on n'y touche pas, il est normal.** `openocd` (l'outil de debug) vient du registre officiel PlatformIO, pas directement de `Community-PIO-CH32V`, et ce registre sait automatiquement adapter l'architecture au système ; sur Apple Silicon, tu as donc déjà la version native arm64. Vérifions :
> ```bash
> file ~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd
> # Mach-O 64-bit executable arm64  ✅ rassure-toi, celui-là est bon
> ```

### 6.3 Correction importante : ce qui tourne vraiment au final, c'est gcc12 / arm64 natif

Il faut poser un aveu à ce stade, et c'est une **autocorrection** : le raisonnement « pourquoi prendre la branche main (gcc8) » de la section 6.1 plus haut est un jugement **théorique** que j'avais déduit à la lecture du code du script de build — la logique du script n'est pas fausse, mais pour trancher « quelle version installer pour que ça marche », lire le code ne suffit pas, il faut compiler, flasher, faire tourner sur la vraie carte pour avoir la réponse.

**En remontant l'environnement qui a réellement compilé, flashé et tourné sur la carte, le verdict est : la version stable et vraiment utilisable, qui est en plus native arm64 pour Apple Silicon (sans aucune traduction Rosetta), c'est gcc 12.2.0, avec le préfixe d'exécutable `riscv-wch-elf-gcc`.** Les craintes que j'avais (« la branche gcc12 est piégée, l'exécutable correspondant n'existe peut-être pas ») ne tiennent pas en pratique — cette toolchain existe bel et bien, c'est même la plus complète, la plus récente et la plus fluide de la série, et elle embarque en bonus le débogueur GDB, tout en un.

La conclusion s'inverse donc : **si tu installes aujourd'hui, vise directement la trinité gcc 12.2.0 / arm64 natif / `riscv-wch-elf-gcc`**. La piste gcc8/x86_64 sous Rosetta de la section 6.1 reste valable comme filet de sécurité (« si jamais tu obtiens cette version, pas de panique, elle marche aussi »), mais ne va pas la chercher exprès.

Si je laisse dans l'article ce cheminement de « je m'étais trompé et je me corrige », plutôt que de gommer l'erreur en douce, c'est justement parce que c'est un enseignement valuable en soi : **lire le script de build et repérer les règles de numérotation de version aide à comprendre « pourquoi ça fait ça », mais pour trancher « quelle version installer », il faut finir par compiler et flasher pour de vrai ; se fier uniquement à la lecture du code mène parfois à des conclusions trop prudentes.**

### 6.4 Confirmation finale de l'environnement : specs techniques complètes

Le tableau ci-dessous est la passe complète sur l'environnement qui a réellement compilé et flashé avec succès — garde-le comme cible de référence pour ta propre install :

| Catégorie | Composant / champ | Valeur |
| --- | --- | --- |
| Compilateur | Nom | xPack GNU RISC-V Embedded GCC (**version personnalisée WCH**, la même que celle livrée avec MounRiver Studio) |
| Compilateur | Nom de l'exécutable | `riscv-wch-elf-gcc` (préfixe unifié `riscv-wch-elf-` pour toute la suite) |
| Compilateur | Version GCC | **12.2.0** |
| Compilateur | Triple cible | `riscv-wch-elf` |
| Compilateur | Hôte de build/exécution | `aarch64-apple-darwin23.6.0` (**Apple Silicon natif**, sans passer par Rosetta) |
| Compilateur | ABI par défaut | `ilp32` (convention d'appel 32 bits, soft float) |
| Compilateur | ARCH par défaut | `rv32imac` (I entier / M mult/div / A atomiques / C instructions compressées) |
| Compilateur | Spéc ISA | 2.2, multilib activé |
| Compilateur | Modèle de threads | single (bare metal, sans OS) |
| Compilateur | Bibliothèque C standard | **newlib 4.2.0** (c'est elle qui fournit `printf` et les autres fonctions standard) |
| Compilateur | binutils (assembleur/éditeur de liens) | **GNU binutils 2.38** (`as`, `ld.bfd`, `objcopy` viennent de là) |
| Compilateur | Débogueur | La toolchain embarque déjà `riscv-wch-elf-gdb`, rien à ajouter |
| Compilateur | Chemin des binaires | `~/.platformio/packages/toolchain-riscv/bin/` |
| Compilateur | sysroot | `~/.platformio/packages/toolchain-riscv/riscv-wch-elf/` |
| Compilateur | Nom du paquet PIO / version du paquet | `toolchain-riscv` @ `1.120200.220829` |
| Compilateur | Source | xPack (`riscv-none-elf-gcc-xpack`), build à partir du GCC 12.2.0 amont |
| Environnement de build | PlatformIO Core | 6.1.19 |
| Environnement de build | Plateforme platform-ch32v | 1.1.0 (maintenu par Community-PIO-CH32V) |
| Environnement de build | Framework framework-wch-noneos-sdk | 2.30000.0 (bibliothèque périphérique standard WCH, bare metal) |
| Environnement de build | Système de build | PlatformIO intégré (SCons + Python) |
| Environnement de build | Puce cible | CH32V307VCT6, ChipID `0x30700568`, QingKe V4F @144MHz |
| Environnement d'upload | Outil d'upload | **wlink 0.1.1** (celui réellement utilisé ; paquet PIO `tool-wlink` @ `0.23.241116`) |
| Environnement d'upload | Protocole d'upload | `wlink` (correspond à la config `upload_protocol` dans `platformio.ini`) |
| Environnement d'upload | Firmware du débogueur | WCH-Link v2.18 (v38), hardware basé sur CH32V305 |
| Environnement d'upload | Alternative : OpenOCD | `0.11.0+dev-snapshot` (2026-02-28), paquet PIO `2.1100.260228` |
| Environnement d'upload | Alternative : wchisp | `0.2.3`, paquet PIO `0.23.240914` |
| Environnement d'upload | Alternative : minichlink | `0.1.0` |

> Attention à ne pas confondre : **la version réelle du compilateur est GCC 12.2.0** ; `1.120200.220829` est le numéro que PlatformIO attribue lui-même à ce paquet (grosso modo `1.` + `12.2.0` + `0` + date d'empaquetage `220829`), ce n'est pas le numéro de version du compilateur lui-même. Ne mélange pas les deux.

**Suite complète de la toolchain** (tous préfixés par `riscv-wch-elf-`, 30 exécutables en tout, installés en un coup) :

- **Compile/édition de liens courants** : `gcc` `g++` `c++` `cpp` `ld` `ld.bfd` `as`
- **Traitement binaire** : `objcopy` `objdump` `readelf` `nm` `size` `strip` `strings` `addr2line`
- **Outils d'archive** : `ar` `ranlib` `gcc-ar` `gcc-nm` `gcc-ranlib`
- **Debug/analyse** : `gdb` `gdb-py3` `gprof` `gcov` `gcov-tool` `gcov-dump`
- **Autres** : `gfortran` `elfedit` `c++filt` `lto-dump`

Cette liste n'est pas à retenir par cœur, garde-la comme dictionnaire — par exemple plus tard, pour voir quelle taille prend une fonction compilée, file voir `riscv-wch-elf-size` ; pour désassembler et lire les instructions générées, lance `riscv-wch-elf-objdump -d`. Tous ces outils sont déjà sagement posés dans `~/.platformio/packages/toolchain-riscv/bin/` depuis le moment où tu as installé la toolchain.

### 6.5 Suivi de version et upgrade : où voir la dernière version, comment upgrader

Une toolchain ne s'installe pas une fois pour toutes, la version communautaire évolue en permanence. Mais pour comprendre « comment suivre la dernière », il faut d'abord avaler une vérité qui fait tourner la tête : **ta toolchain est en fait une poupée russe à trois étages, et elle cache deux « dernières versions » différentes.**

**D'abord le décor : trois étages + deux « dernières »**

| Étage | C'est quoi | Dernière actuelle | Rythme de mise à jour |
| --- | --- | --- | --- |
| ① Ce que PIO utilise réellement (perso WCH) | Triple `riscv-wch-elf` + patchs spécifiques de WCH pour le noyau QingKe | **GCC 12.2.0** (ce que tu as installé) | **Quasiment immobile**, resté sur 12.2.0 |
| ② L'empaqueteur de ① | Community-PIO-CH32V re-paquette ① en paquet PIO | Identique (release `riscv-none-embed-gcc 12.2.0-3`) | Suit ① |
| ③ L'amont pur (vanilla) | Le GCC RISC-V universel de xPack, **sans les patchs WCH** | **GCC 15.2.0** (2025-10-23) | Mises à jour continues, colle au GNU GCC amont |

> **Rappel clé** : quand on dit un peu partout « la version communautaire bouge tout le temps », c'est l'étage ③ qui bouge (xPack, déjà à 15.2.0), pas l'étage ① que ton CH32V utilise vraiment (perso WCH, toujours à 12.2.0). Les deux fils **ne se mélangent pas** — remplacer bêtement ta toolchain actuelle par xPack 15.2.0 te ferait perdre les patchs spécifiques que WCH a ajoutés au noyau QingKe, et certaines fonctionnalités du CH32V pourraient cesser de marcher. **Pour le dév CH32V, la bonne politique est de suivre ①②, pas de courir après le dernier ③.**
>
> Au passage une petite compétence : la chaîne d'identité complète de ton compilateur `riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0` se lit en trois points — `wch-elf` est la marque de la personnalisation WCH, `xPack` est l'empaqueteur amont, `arm64` indique la version native Apple Silicon.

**Comment vérifier quelle version tu as réellement installée**

```bash
# 1. Voir la version du paquet PIO (numérotation PlatformIO, ce n'est pas la version du compilateur)
pio pkg list | grep -i riscv

# 2. Voir l'identité complète du compilateur (version, triple cible, ABI, ARCH, hôte de build — à retenir par préférence)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc -v

# 3. Voir la version de la bibliothèque C (newlib) — c'est elle qui implémente printf
grep "_NEWLIB_VERSION" ~/.platformio/packages/toolchain-riscv/riscv-wch-elf/include/_newlib_version.h

# 4. Voir la version de binutils (assembleur/éditeur de liens)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-ld.bfd --version

# 5. Voir sur quelle source platform.json « cloue » la toolchain (détermine quel dépôt sera tiré à l'upgrade)
grep -A3 '"toolchain-riscv"' ~/.platformio/platforms/ch32v/platform.json
```

**Où voir la dernière version (trois canaux, triés par pertinence pour toi)**

- **Canal un : officiel WCH / MounRiver (le vrai amont de la perso WCH, le plus pertinent)**. Le triple `riscv-wch-elf` et les patchs noyau WCH viennent à l'origine du MounRiver Studio officiel de WCH — les infos de build de ton compilateur mentionnent un chemin `/Users/mrs/...` (mrs = MounRiver Studio), c'est cette provenance. Page de téléchargement `www.mounriver.com` (cherche « MounRiver Studio » et « Toolchain »), dépôt officiel SDK sur `github.com/openwch`. La série actuelle de la toolchain MRS est v1.91 (les notes de release de Community-PIO-CH32V disent textuellement « Update toolchain to v1.91 »).
- **Canal deux : empaquetage Community-PIO-CH32V (ce que PIO utilise vraiment)**. C'est en gros la toolchain WCH de MounRiver réempaquetée en paquet PlatformIO ; surveiller ses releases te prévient en direct quand PIO aligne une nouvelle version : `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`. Pour être prévenu en direct, en haut à droite Watch → Custom → Releases, ou abonne-toi au flux RSS : `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases.atom`.
- **Canal trois : amont xPack (vanilla, le plus rapide, pour culture seulement)** : releases sur `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack/releases`, l'historique le plus complet sur `npmjs.com/package/@xpack-dev-tools/riscv-none-elf-gcc`, dernier en date 15.2.0-1.1.

**Comment upgrader (et un piège à éviter absolument)**

```bash
# Upgrader toute la plateforme ch32v (framework, toolchain — ne bouge vraiment que quand Community-PIO-CH32V publie une nouvelle version)
pio pkg update -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git

# Ou juste upgrader le paquet toolchain isolément
pio pkg update -g -t toolchain-riscv
```

> ⚠️ **Le piège à éviter à l'upgrade (echo de la Q3 du chapitre 19)** : on l'a vu au chapitre 5, `platform.json` **code en dur la source de la toolchain sur le dépôt Windows**. Ça veut dire qu'un `pio pkg update` ou une réinstall de la plateforme risque fort d'**écraser ta version native macOS péniblement installée** pour la remplacer par la version Windows. Si ça t'arrive, rejoue simplement les étapes de remplacement de 6.1 / 6.2 ; pour un truc définitif, fork le dépôt de la plateforme, modifie `platform.json` pour pointer par défaut sur la version macOS, et c'est réglé à la racine.
>
> Encore une fois, le cap à tenir : l'upgrade sert à récupérer la nouvelle version de la **toolchain perso WCH** alignée par Community-PIO-CH32V, pas à courir après xPack 15.2.0. Sur CH32V dans PIO, prends toujours ①② (perso WCH) pour référence.

---

## 7. Lever la quarantaine Gatekeeper (sinon macOS te traite de virus et te bloque)

macOS a un mécanisme de sécurité : dès qu'un exécutable a été téléchargé depuis le réseau (`git clone` compris), le système lui colle une étiquette de quarantaine nommée `com.apple.quarantine`. Sans signature Apple, ces fichiers sont interceptés à l'exécution, avec une erreur qui ressemble en général à ça :

```
"xxx" cannot be opened because the developer cannot be verified
```

Ou, plus expéditif :

```
killed: 9
```

Le compilateur et l'outil de flash qu'on vient d'installer sont pile de ces cas typiques « sans signature, téléchargés du réseau », donc on va retirer l'attribut de quarantaine à l'avance :

```bash
xattr -dr com.apple.quarantine ~/.platformio/packages/toolchain-riscv
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-wlink
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-openocd-riscv-wch
```

> `-r` est l'option récursive : elle nettoie l'attribut sur tous les fichiers du répertoire ; même si un fichier n'avait pas l'attribut, la commande ne râle pas, c'est une opération préventive du type « ça ne coûte rien de le faire », lance sans hésiter.

---

## 8. Vérifier que la toolchain tourne vraiment

Une fois l'install terminée, n'ouvre pas encore de projet — passe d'abord 10 secondes à confirmer que les trois gros morceaux s'exécutent normalement :

```bash
# Compilateur (version finale confirmée au chapitre 6, gcc12.2.0, arm64 natif, pas besoin de Rosetta)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0

# Si tu as récupéré l'ancienne version gcc8/x86_64, la commande et la sortie correspondantes deviennent :
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
# riscv-none-embed-gcc (xPack GNU RISC-V Embedded GCC x86_64) 8.2.0

# Outil de flash (arm64 natif)
~/.platformio/packages/tool-wlink/wlink --version
# wlink 0.1.1

# Outil de debug (optionnel, arm64 natif)
~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd --version
```

> **Petit rappel Rosetta** : la version gcc12/arm64 native ne devrait pas du tout avoir besoin de Rosetta. Mais si tu as récupéré l'ancienne version gcc8/x86_64, à la première invocation le système risque de te proposer d'installer Rosetta 2 — confirme, c'est une opération one-shot, plus jamais il te le redemandera. Du moment que les commandes ci-dessus crachent un numéro de version, l'environnement est en place.

---

## 9. Créer ton premier projet : comprendre `platformio.ini`

### 9.1 À quoi ressemble la structure d'un projet

Un projet PlatformIO minimal, c'est deux fichiers pour squelette :

```
ch32v307-test/
├── platformio.ini      # Fichier de config du projet : « quelle puce, quel framework, comment flasher » — tout est ici
└── src/
    └── main.c           # Ton code de firmware, point d'entrée du programme
```

Tu peux aussi créer un projet vide depuis la ligne de commande (si tu préfères cliquer « New Project » dans VSCode, ça revient exactement au même) :

```bash
$PIO project init -d ~/ch32v307-test --board ch32v307_evt
```

### 9.2 Décortiquer `platformio.ini` ligne par ligne

C'est le fichier de config le plus important du projet, à régler à chaque nouveau projet, donc ça vaut le coup de le passer au peigne fin. Le contenu ressemble à ça :

```ini
[env]
platform = ch32v
framework = noneos-sdk
monitor_speed = 115200
; Débogueur WCH-Link embarqué ; wlink est l'outil de flash qui supporte nativement macOS arm64
upload_protocol = wlink

[env:ch32v307_evt]
board = ch32v307_evt
; Config usine par défaut de l'EVT-R1 : Flash 256K + SRAM 64K (identique au défaut board, pas besoin de surcharger)
; Pour basculer vers 288K Flash / 32K SRAM ou une autre répartition, il faut d'abord modifier les option bytes
; avec un outil WCH, puis décommenter ici pour synchroniser :
; board_upload.maximum_size = 294912
; board_upload.maximum_ram_size = 32768
```

Reprenons ligne par ligne :

- **`[env]`** : c'est la « zone de config commune », ce qui est écrit dessous vaut pour tous les environnements (env). Si ton projet doit plus tard tourner sur plusieurs cartes différentes, poser les paramètres communs ici évite les répétitions.
- **`platform = ch32v`** : dit à PlatformIO quelle plateforme utiliser — autrement dit, la plateforme communautaire `Community-PIO-CH32V` qu'on a péniblement installée plus tôt.
- **`framework = noneos-sdk`** : on choisit la bibliothèque périphérique standard officielle de WCH (dév bare metal, sans ordonnanceur d'OS) — c'est aussi le framework d'introduction le plus classique et le mieux documenté. Le paquet correspondant est `framework-wch-noneos-sdk`, version confirmée fonctionnelle dans cet article : `2.30000.0`. Plus tard, pour jouer au multitâche, change cette ligne en `freertos` ou `rt-thread`, le reste de la config bouge à peine — c'est aussi l'intérêt de l'écosystème PlatformIO.
- **`monitor_speed = 115200`** : le débit baud utilisé par le moniteur série (`pio device monitor`). **Ce nombre doit correspondre au paramètre passé à `USART_Printf_Init()` dans le code** — si les deux côtés ne tombent pas d'accord, ce qui sort du port série est une bouillie de caractères, et c'est un grand classique des petits pièges de débutant.
- **`upload_protocol = wlink`** : indique à PlatformIO quel outil utiliser pour flasher la carte. Il y a plusieurs protocoles possibles (tableau complet au chapitre 12) ; pour les utilisateurs macOS arm64, `wlink` est le moins prise de tête parce qu'il est supporté nativement.
- **`[env:ch32v307_evt]`** : une définition concrète d'« environnement », le nom est libre mais on prend l'habitude de le faire correspondre au modèle de carte, pour s'y retrouver.
- **`board = ch32v307_evt`** : précise le modèle exact de la carte — PlatformIO va charger à partir de là tout le tas de paramètres : définition des broches, tailles Flash/RAM, horloge par défaut, etc.
- **Les lignes commentées Flash/RAM** : là se cache un détail qui fait hésiter — la puce de l'EVT-R1 a en réalité **288KB** de Flash, mais le `board` par défaut donne **256KB**. Ne te précipite pas pour modifier, ce n'est pas un bug : les option bytes d'usine divisent la puce en 256KB Flash + 64KB SRAM, ce qui tombe juste sur le défaut du `board`, donc au stade débutant, laisse ces commentaires tranquilles. Ce n'est que quand tu auras vraiment besoin de pousser la Flash à 288KB qu'il faudra d'abord modifier les option bytes via un outil officiel WCH, puis revenir synchroniser ces lignes — c'est une manipulation avancée, à laisser de côté pour l'instant.

### 9.3 Lire le template `main.c` généré par PlatformIO — se bâtir une « logique de dév CH32 »

Cette sous-section, c'est la plus importante des importantes. La première fois qu'on ouvre le `main.c` auto-généré par PlatformIO, pas mal de monde se fait peur avec le gros pavé de `#if defined(...)` au début en se disant « c'est beaucoup trop complex ». Ne panique pas, on va le démonter ensemble, tu verras que c'est nettement moins terrifiant ; et une fois ce bloc compris, tu pourras passer à n'importe quelle puce de la famille WCH et piger la mécanique immédiatement.

Le template commence par ça (extrait) :

```c
// ① Choisit automatiquement le header correspondant à la puce courante, selon des macros de compilation
#if defined(CH32V003)
#include <ch32v00x.h>
#elif defined(CH32V10X)
#include <ch32v10x.h>
#elif defined(CH32V30X) || defined(CH32V31X)
#include <ch32v30x.h>
// ... après, encore V20X / X035 / L103 / H417 etc., toute une série de branches
#endif
#include <debug.h>   // ← Cette ligne est clé : fournit l'init du port série, les délais et la redirection de printf
```

**Pourquoi le code a cette tête ?** Parce que le template de PlatformIO est un code générique partagé par **toute la gamme de puces WCH** — `CH32V003`, `CH32V307`, `CH32X035`… des dizaines de modèles qui se partagent le même squelette de `main.c`, et qui se servent d'une pile de `#if defined(...)` pour « deviner » à la compilation quelle puce tu utilises, puis `#include` le header constructeur correspondant. Ces macros sont définies en coulisses par la combinaison `platform = ch32v` + `board = ch32v307_evt`, tu n'as rien à écrire à la main.

**Pour ton CH32V307**, ce sont en fait deux lignes qui comptent :

```c
#include <ch32v30x.h>   // Définitions des périphériques de la série CH32V30X (registres, GPIO_InitTypeDef viennent de là)
#include <debug.h>      // La bibliothèque d'aide au debug, cruciale
```

Une fois que t'as pigé ça, tout le pavé de `#if defined` n'est plus « une logique complex », mais « un interrupteur multi-positions ». Avec cette mécanique en tête, à l'avenir tu tomberas sur n'importe quelle nouvelle carte de la gamme CH32 et ce genre de template ne te fera plus peur. **C'est ce qu'on appelle la « logique de dév CH32 » : d'abord regarder à quel header de série la carte correspond, puis regarder quelles fonctions d'aide `debug.h` fournit.**

### 9.4 Qu'est-ce qu'il y a vraiment dans `debug.h`

Ce header fait partie du SDK officiel WCH, presque tous les projets CH32 l'utilisent, donc faisons connaissance à l'avance avec ses quelques fonctions — ça t'évitera bien des détours :

```c
void Delay_Init(void);                        // Initialise le timer système utilisé pour les délais
void Delay_Us(uint32_t n);                    // Délai en microsecondes
void Delay_Ms(uint32_t n);                    // Délai en millisecondes
void USART_Printf_Init(uint32_t baudrate);    // Initialise USART1 et redirige printf vers celle-ci
```

Le `debug.c` associé (lui aussi fourni par le SDK, pas à écrire toi-même) implémente déjà la fonction bas niveau `_write()` exigée par la bibliothèque C standard, et la branche sur USART1. **Ça veut dire que tu n'as absolument pas besoin d'écrire toi-même la redirection : un seul appel à `USART_Printf_Init(115200)`, et ensuite n'importe quel `printf(...)` s'affiche côté port série** — une fonctionnalité souvent ignorée des débutants sur microcontrôleur mais incroyablement pratique. Après le piège « port série muet » qui arrive plus loin, cette ligne de code va te marquer.

### 9.5 Un exemple minimal qui « compile mais ne fait rien »

Avant de plonger dans le Hello World, regardons un code de clignotement basique pour sentir la mécanique des GPIO CH32 :

```c
#include <ch32v30x.h>   // Header de la série CH32V30X, c'est la config board qui décide lequel est inclus
#include <debug.h>

#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);   // Configure le groupe de priorités d'interruptions (ouverture standard)
    SystemCoreClockUpdate();                          // Rafraîchit la variable d'horloge système (ouverture standard aussi)
    Delay_Init();                                     // Initialise les fonctions de délai

    GPIO_InitTypeDef GPIO_InitStructure = {0};

    BLINKY_CLOCK_ENABLE;                               // ① D'abord « alimenter » le périph GPIOA (activer son horloge)
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;           // ② Sélectionner la broche PA0
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;    // ③ Mode : sortie push-pull
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;   // ④ Vitesse de bascule
    GPIO_Init(GPIOA, &GPIO_InitStructure);              // ⑤ Écrire réellement la config dans les registres

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(GPIOA, GPIO_Pin_0, ledState);   // Met le niveau de PA0 à ledState
        ledState ^= 1;                                 // Inverse le niveau, au prochain tour on bascule
        Delay_Ms(500);                                  // Pause de 500 ms pour donner l'effet « clignotement »
    }
}
```

**Garde en tête cette routine GPIO en quatre temps** ; à l'avenir, pour initialiser un périphérique sur n'importe quel projet CH32, tu réutiliseras des variantes de ce schéma :

1. **Activer l'horloge** : la famille STM32 (le style de la bibliothèque périphérique CH32 copie presque à la lettre la bibliothèque standard STM32) a un trait — tous les périphériques sont « hors tension » par défaut, et avant de t'en servir tu dois activer l'horloge correspondante avec `RCC_XXXClockCmd(...)`. Si tu oublies cette étape, le périph est une coquille vide : aucune config ne donnera de résultat.
2. **Remplir la structure** : déclare une structure `XXX_InitTypeDef`, et remplis-y un par un les paramètres voulus (mode, vitesse, etc.).
3. **Appeler `XXX_Init()`** : « nourris » la structure à la fonction d'init correspondante, sans quoi les paramètres ne seront jamais écrits dans les registres.
4. **Travailler dans `while(1)`** : pilote le périph avec les fonctions de lecture/écriture qui vont bien (par exemple `GPIO_WriteBit`).

Bon, théorie terminée. On compile et on flashe pour de vrai — et là, tu vas découvrir que du code qui marche en théorie peut quand même se prendre des pièges « imprévus » en pratique.

---

## 10. Première compilation

Tout est prêt, on lance la compile :

```bash
$PIO run -d ~/ch32v307-test        # ou, après un cd dans le répertoire du projet, simplement pio run
```

À la première compile, ça va automatiquement télécharger le framework `noneos-sdk` de WCH (qui contient tout le code source des drivers périphériques) — ça prend un peu de temps, environ 30 à 60 secondes. Une compile réussie crache ça :

```
Linking .pio/build/ch32v307_evt/firmware.elf
RAM:   [          ]   3.2% (used 2080 bytes from 65536 bytes)
Flash: [          ]   0.7% (used 1728 bytes from 262144 bytes)
Building .pio/build/ch32v307_evt/firmware.bin
========================= [SUCCESS] Took 47.36 seconds =========================
```

Le `[SUCCESS]` en vert signifie que toute la chaîne — de VSCode à pio, jusqu'au compilateur natif macOS — est complètement opérationnelle, tu peux t'applaudir. Les artéfacts de build sont dans `.pio/build/ch32v307_evt/` :

- `firmware.elf` : contient tous les symboles de debug, utilisé quand tu débogues ;
- `firmware.bin` : le binaire brut, c'est lui qu'on flash.

Les deux barres de progression (RAM/Flash) valent un coup d'œil : une fois qu'on aura ajouté `printf`, l'occupation Flash va grimper d'un coup, c'est normal, ne t'inquiète pas, le chapitre 13 expliquera pourquoi.

---

## 11. Mettre `pio` en commande globale

Taper à chaque fois la longue série `~/.platformio/penv/bin/pio` est barbant, donc on va faire un lien symbolique dans un répertoire du PATH. Sur Mac Apple Silicon, Homebrew s'installe par défaut dans `/opt/homebrew/bin`, répertoire généralement inscriptible par l'utilisateur courant (membre du groupe admin) :

```bash
if [ -w /opt/homebrew/bin ]; then
  ln -sf ~/.platformio/penv/bin/pio /opt/homebrew/bin/pio
  ln -sf "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" /opt/homebrew/bin/code
fi
```

Vérifions :

```bash
pio --version      # PlatformIO Core, version 6.1.19
code --version     # Numéro de version de VSCode
```

> Si ton `/opt/homebrew/bin` n'est pas inscriptible (rare), choisis un autre répertoire à toi, par exemple `~/.local/bin`, et ajoute-le au PATH de ton shell :
> ```bash
> mkdir -p ~/.local/bin
> ln -sf ~/.platformio/penv/bin/pio ~/.local/bin/pio
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
> ```
> Pense, après avoir modifié `~/.zshrc`, à ouvrir un nouveau terminal ou à lancer `source ~/.zshrc` pour que la config prenne effet.

À partir de maintenant, partout dans cet article, `$PIO` ou `~/.platformio/penv/bin/pio` peut s'écrire simplement `pio`.

---

## 12. Câblage matériel et flash

### 12.1 Câblage : brancher le bon port USB

La carte EVT-R1 a en général deux ports USB, **pour flasher/debug, branche celui relié au WCH-Link embarqué** (la sérigraphie indique en général DEBUG / Link / WCH-Link), pas celui étiqueté USB-Device — les deux n'ont rien à voir, si tu te trompes, le gestionnaire de périphériques ne verra rien. macOS embarque le pilote série CDC, donc ça marche branche, pas de driver à installer, c'est plus cool que sur Windows.

### 12.2 Les deux modes du WCH-Link

Le débogueur WCH-Link a deux modes : **mode RV** (pour les puces RISC-V) et **mode DAP** (pour les puces ARM). Notre CH32V307 a un cœur RISC-V, donc le débogueur doit être en **mode RV** pour flasher correctement. Le défaut usine est en général RV ; si le flash échoue systématiquement, vérifie le mode via la commande `wlink` ou un outil officiel WCH :

```bash
# Lister les WCH-Link actuellement connectés
pio pkg exec -- wlink list          # ou simplement wlink list (à condition que le chemin soit dans le PATH)
```

### 12.3 Le flash, pour de vrai

**Option 1 : ligne de commande**

```bash
cd ~/ch32v307-test
pio run -t upload
```

C'est ici que prend effet le `upload_protocol = wlink` configuré dans `platformio.ini` — PlatformIO appelle l'outil natif macOS wlink, qui écrit `firmware.bin` dans la puce via le WCH-Link.

**Option 2 : GUI VSCode**

Ouvre le dossier du projet, la barre d'outils PlatformIO en bas à gauche a une rangée d'icônes, clique sur la flèche (Upload) — même effet que la ligne de commande, pour ceux qui préfèrent cliquer.

Quand le flash réussit, `wlink` imprime tout un tas d'infos sur le débogueur et la puce, vraiment utile :

```
04:17:53 [INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
04:17:53 [INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
04:17:53 [INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
04:17:54 [INFO] Flash done
04:17:54 [INFO] Now reset...
```

La première ligne `v2.18(v38)` donne la version firmware du débogueur WCH-Link lui-même ; la troisième ligne te montre la Flash réelle de la puce (288KB, echo du détail du chapitre 9) ainsi que son UID unique, qui peut servir pour sérialiser des produits.

### 12.4 Quel protocole de flash choisir

La définition `board` supporte en fait plusieurs protocoles, à switcher selon le besoin :

| Protocole | Outil sous-jacent | Détail |
|---|---|---|
| `wch-link` | openocd (`0.11.0+dev-snapshot`, paquet PIO `2.1100.260228`) | Protocole par défaut, accède au WCH-Link via openocd |
| `wlink` | wlink (version outil `0.1.1`, paquet PIO `tool-wlink@0.23.241116`) | **Recommandé pour les utilisateurs macOS** : natif, léger, rapide — c'est aussi le protocole réellement utilisé dans cet article |
| `minichlink` | minichlink (`0.1.0`) | Un autre outil léger maintenu par la communauté, alternative |
| `isp` | wchisp (`0.2.3`, paquet PIO `0.23.240914`) | Flash via le mode USB Bootloader, il faut d'abord tirer la pin BOOT0 à l'état haut pour entrer dans le bootloader ; pertinent quand tu n'as pas de WCH-Link |

### 12.5 Debug (poser des breakpoints, step-by-step)

Dans VSCode, appuie simplement sur **F5** pour lancer une session de debug (en coulisses, openocd + RISC-V GDB travaillent ensemble) — tu peux poser des breakpoints, exécuter pas à pas, inspecter la valeur en temps réel des variables et des registres. Le fichier SVD de description des registres de la puce (`CH32V307xx.svd`) est déjà désigné dans la config board, donc la visualisation des registres périphériques est aussi disponible out-of-the-box, aucune config supplémentaire. Ça mériterait un article entier à lui seul, donc on s'arrête là pour cette fois — l'essentiel est que tu saches que c'est possible.

---

## 13. Piège ① : compile et flash OK, mais le port série est muet

Une fois la toolchain en place et le flash réussi, pas mal de monde se dit « c'est gagné », ouvre tout excité le moniteur série — et reste coi.

### Symptôme

```bash
pio run              # Compile OK ✅
pio run -t upload    # Flash OK ✅
pio device monitor   # Ouvrir le moniteur série → écran blanc, pas même un fantôme
```

La compile n'a pas râlé, le flash est confirmé OK, le moniteur série est bien connecté au `/dev/cu.usbmodem***` (le device série virtualisé par le WCH-Link embarqué)… mais **pas un seul caractère à se mettre sous la dent**. C'est là qu'on commence à douter : mauvais baudrate ? Mauvais driver ? Carte grillée ?

### Cause racine : ultra simple en fait

Ouvre le code et c'est limpide — **le template par défaut de PlatformIO n'initialise tout simplement pas le port série, et le code ne contient pas la moindre ligne `printf`**. C'est un pur programme de clignotement « config GPIO → boucle while qui bascule le niveau → délai », du début à la fin pas un seul octet n'est envoyé au port série. Logique de ne rien recevoir — ce n'est pas le circuit qui est mort, c'est le code qui n'a tout simplement pas prévu de te parler.

> Le port série virtualisé par le WCH-Link embarqué (VCP dans le jargon, virtual COM port) est par défaut ponté vers **USART1 de la puce cible (PA9 = TX, PA10 = RX)**. La chaîne hardware est totalement en place, c'est juste le programme lui-même qui n'envoie rien.

### Solution : ajouter l'init + printf

On a déjà rencontré `USART_Printf_Init()` de `debug.h` au chapitre 9, on s'en sert maintenant pour de bon — deux lignes suffisent :

```c
Delay_Init();

// USART1 (PA9/PA10) passe par le port série virtuel du WCH-Link embarqué ; le _write du SDK a déjà redirigé printf ici
USART_Printf_Init(115200);
printf("CH32V307 démarré, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);
```

Et on ajoute un `printf` dans la boucle `while(1)` pour voir le programme tourner en temps réel :

```c
while (1) {
    GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
    printf("LED %u\r\n", ledState);
    ledState ^= 1;
    Delay_Ms(100);
}
```

Recompile, reflash, le port série prend vie aussitôt :

```
CH32V307 démarré, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

> **Petit repère** : une fois `printf` ajouté, l'occupation Flash grimpe d'environ 0,7 % (1728 octets) à à peu près 2,8 % (autour de 7440 octets), parce que `printf` embarque toute la logique de formatage de chaîne dans le firmware — c'est normal, `printf` n'a jamais été « gratuit », c'est de l'espace échangé contre de la qualité de debug. Pas de panique, et ne te prends pas la tête sur ces quelques Ko.

### Quand le port série ne dit rien, vérifier dans cet ordre

Récapitulons cette mésaventure en checklist générique, à garder sous la main pour la prochaine fois :

1. **Le code appelle vraiment `USART_Printf_Init` et écrit vraiment un `printf` ?** (Le piège le plus courant et le plus négligé de cet article — vérifie ça en premier.)
2. **Le baudrate est-il correct ?** Le `USART_Printf_Init(115200)` côté code doit correspondre au `monitor_speed` de `platformio.ini` — si l'un des deux change sans synchroniser l'autre, tu reçois du charabia ou du vide.
3. **La fonction VCP du WCH-Link n'a pas été désactivée par accident ?** (À vérifier dans l'outil officiel WCH-LinkUtility.)
4. **Ce que tu veux, c'est vraiment que « la puce elle-même se transforme en port série USB » (USB CDC) ?** Si oui, c'est une autre paire de manches — il faut une stack USB, ça n'a rien à voir avec la piste USART1 + pont WCH-Link décrite ici, ne mélange pas les deux.

---

## 14. Piège ② (le plus gros de tout l'article) : le port série cause, mais la LED ne veut rien savoir

C'est le piège le plus rageant de toute l'histoire, parce qu'**il n'a presque rien à voir avec le logiciel** — un pur problème de design hardware, ton code peut être impeccable, ça ne changera rien. Prends le temps d'avaler cette section, elle t'économisera au moins une demi-heure à t'arracher les cheveux devant ton code.

### Symptôme

Le port série imprime déjà nickel (donc le firmware tourne bien, pas de blocage, pas de HardFault), **mais sur la carte, impossible de voir une seule LED clignoter**.

### Cause racine : la LED utilisateur embarquée est livrée « en l'air » d'usine

**Les deux LED utilisateur de cette carte (sérigraphies LED1, LED2) ne sont tout simplement pas câblées aux pins du MCU en usine, elles sont purement et simplement en l'air.** Plus précisément, elles ont une patte sur le GND, et l'autre est un pad nu tout seul ou un trou de pin header, laissé là en attendant que tu viennes câbler toi-même — ce n'est pas un défaut de qualité d'une carte précise, c'est le schéma officiel de WCH (`CH32V30xSCH.pdf`) qui est dessiné comme ça depuis le départ.

Autrement dit : **que ton code bascule PC1, PD0 ou PA0, tant que tu ne fichiers pas un vrai câble Dupont entre cette broche et le pad de la LED, elle ne s'allumera jamais. C'est un problème hardware pur, le logiciel le plus brillant n'y peut rien.**

Je ne suis pas le seul à m'être fait avoir, plusieurs sources indépendantes le confirment : la doc officielle de Zephyr dit explicitement pour cette carte que « la LED embarquée n'est pas reliée au SoC au niveau du circuit » ; un guide d'utilisation chinois de la CH32V307EVT-R1 de WCH mentionne lui aussi que les deux LED utilisateur ne sont câblées à aucune pin GPIO et qu'il faut câbler à la main pour les allumer. Le bouton utilisateur KEY embarqué est dans le même cas, lui aussi en l'air — même piège à revisser.

> **La seule LED de la carte qui soit bien câblée par défaut et qui s'allume à la mise sous tension, c'est la LED d'alim** — celle qui s'allume fixe dès que tu branches l'USB, totalement indépendante de ton code. Très facile à confondre avec « j'ai réussi à allumer ma LED », alors qu'elle n'est absolument pas pilotée par le MCU.

### Réparation : logiciel + hardware, en deux temps

**Étape 1 : choisir la pin à basculer**

Dans le code d'exemple GPIO officiel de WCH, la pin utilisée par habitude est **PA0**, la mieux documentée, la plus discutée en communauté, la moins sujette à des pièges supplémentaires, donc on aligne la pin de notre LED sur PA0 :

```c
// La LED utilisateur de l'EVT-R1 est en l'air par défaut (non câblée au MCU), il faut un câble Dupont entre PA0 et LED1 pour qu'elle s'allume
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)
```

> ⚠️ **Un piège connexe** : si tu repasses d'un autre port (par exemple le PC1 du template d'origine) à PA0, **pense bien à synchroniser la ligne d'activation d'horloge sur `RCC_APB2Periph_GPIOA`**. Je m'y suis cassé les dents pour de vrai : n'avoir changé que la définition de pin, oublié de modifier l'activation d'horloge vers GPIOA — résultat, l'horloge du périph GPIOA n'était jamais lancée, PA0 ne bougeait pas d'un poil, et j'ai passé un moment à soupçonner la logique du code avant de comprendre que c'était la classique erreur « modifier un endroit, en oublier un autre ». Après avoir changé de port, vérifie en bloc toutes les macros associées, ne fais pas les choses à moitié.

**Étape 2 : câbler un vrai fil Dupont (au choix)**

- **Plan A (utiliser la LED1 embarquée, ce que recommande WCH)** : prends un fil Dupont, branche une extrémité sur **PA0** (le trou étiqueté `A0` sur le connecteur Arduino), l'autre extrémité sur le pad sérigraphié `LED1` sur la carte. L'emplacement exact du pad se trouve dans le schéma `CH32V30xSCH.pdf` livré dans le pack EVT.
- **Plan B ( câbler ta propre LED, le plus solide et le plus visuel)** : prends une LED classique, mets une résistance de limitation de 330 Ω à 1 kΩ en série, branche le tout entre **PA0 et GND**. Si tu inverses la polarité, pas grave : le code ne fait que basculer le niveau haut/bas en permanence, donc un sens sur deux finira par allumer ; la seule différence est « quelle demi-période est lumineuse ».

Une fois câblé, relance `pio run -t upload` — LED1 se met à clignoter à un rythme de 100 ms, et en parallèle le port série déroule `LED 0 / LED 1`. C'est seulement à cet instant que le « Hello World » est vraiment réalisé. 🎉

> **Pourquoi WCH livre-t-il ses LED en l'air ?** Très probablement pour « laisser plus de liberté aux développeurs » — tu peux câbler la LED ou le bouton sur n'importe quel GPIO que tu veux utiliser dans ton projet, sans être enfermé dans une pin soudée fixe en usine. L'intention est louable, mais pour un débutant qui découvre la carte, c'est redoutable : ta première réaction en ouvrant la carte ne sera jamais « il faut que je câble un fil pour allumer une LED », mais « qu'est-ce que j'ai mal codé ? ».

### Une leçon plus profonde : d'abord, distinguer logiciel de matériel

La vraie valeur de ce piège n'est pas « retenir que PA0 a besoin d'un fil Dupont », mais une méthodologie de debug embarqué applicable partout :

**« Pas de réaction » ne veut pas dire « code faux ».** Quand un périph ne répond pas, la première chose à faire est d'essayer de prouver « le firmware est-il vraiment arrivé à cette logique ? », pas de se jeter sur la logique du code à corps perdu. Si j'ai pu si vite conclure que c'était un souci hardware plutôt que logiciel, c'est grâce au fait que **le port série a parlé en premier** — si le port série imprime normalement, c'est que la boucle principale tourne, qu'il n'y a pas de blocage. Une fois « côté logiciel, ça tourne » vérifié, le « pas de réaction » restant se concentre sur la chaîne hardware. C'est aussi pour ça qu'il faut toujours commencer un nouveau projet par faire parler le port série — c'est la jauge la plus rapide et la plus intuitive pour isoler un problème.

---

## 15. Une fois que ça roule : à quoi ressemble le `main.c` complet

En combinant les rustines des deux pièges précédents, voici le code complet final qui fonctionne — il ajoute au template d'origine de PlatformIO l'initialisation du port série et les `printf` :

```c
#include <ch32v30x.h>
#include <debug.h>

// La LED utilisateur de l'EVT-R1 est en l'air par défaut (non câblée au MCU), il faut un câble Dupont entre PA0 et LED1 pour qu'elle s'allume
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void NMI_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void HardFault_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
    SystemCoreClockUpdate();
    Delay_Init();

    // USART1 (PA9/PA10) passe par le port série virtuel du WCH-Link embarqué ; le _write du SDK a déjà redirigé printf ici
    USART_Printf_Init(115200);
    printf("CH32V307 démarré, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);

    GPIO_InitTypeDef GPIO_InitStructure = {0};
    BLINKY_CLOCK_ENABLE;
    GPIO_InitStructure.GPIO_Pin = BLINKY_GPIO_PIN;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(BLINKY_GPIO_PORT, &GPIO_InitStructure);

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
        printf("LED %u\r\n", ledState);
        ledState ^= 1;
        Delay_Ms(100);
    }
}

void NMI_Handler(void) {}
void HardFault_Handler(void) { while (1) {} }
```

Petit mot sur les deux gestionnaires d'interruption à la fin : `NMI_Handler` et `HardFault_Handler` sont deux fonctions « filet de secours » très courantes sur les microcontrôleurs RISC-V/ARM. Le modificateur `__attribute__((interrupt("WCH-Interrupt-fast")))` dit au compilateur « c'est une routine d'interruption, génère le code comme il faut » (sauvegarde et restauration automatiques des registres, notamment). L'implémentation ici est expéditive — `HardFault_Handler` fait un `while(1){}` pour bloquer net, une stratégie conservatrice mais efficace : si le programme part vraiment en vrille et déclenche une exception hardware, plutôt que de laisser la puce continuer à tourner avec un état corrompu, on la fige ici pour que tu puisses brancher un débogueur et inspecter l'état. Plus tard, sur un gros projet, tu pourras ajouter ici du logging d'erreur, une LED d'alarme, etc. Pour l'instant, savoir à quoi ça sert suffit.

Le projet complet (incluant `platformio.ini`) est sur GitHub, lien en fin d'article, tu peux le cloner et le lancer directement.

---

## 16. Tableau récapitulatif des pièges

Tous les pièges de l'article récapitulés en un seul endroit, pratique pour s'y référer plus tard :

| N° | Symptôme | Cause racine | Solution |
| --- | --- | --- | --- |
| 1 | Install de la plateforme avec `repository not found` | Le nom de l'organisation GitHub est mal orthographié, c'est `Community-PIO-CH32V` (avec PIO, en majuscules) | Utiliser la bonne adresse |
| 2 | `pio platform install` dit deprecated | La nouvelle version de PlatformIO unifie sur la sous-commande `pkg` | Passer à `pio pkg install -g -p <adresse>` |
| 3 (cœur) | Plateforme installée, mais le répertoire toolchain ne contient que des `.exe`, compile inévitablement vouée à l'échec | `platform.json` code en dur la source sur le dépôt Windows, l'install ne détecte pas l'OS | Virer la version Windows, installer manuellement `toolchain-riscv-mac` et `tool-wlink` (branche `mac_arm64` / `mac_x64`) |
| 4 | Mauvaise branche de toolchain installée, la compile râle sur un exécutable compilateur introuvable | Le script de build choisit le préfixe compilateur à partir du deuxième segment du numéro de version (`1.8.x` → `riscv-none-embed`, `1.12.x` → `riscv-wch-elf`) ; la version installée et les exécutables réellement présents ne correspondent pas | D'abord `ls` pour voir comment s'appellent réellement les exécutables installés, puis s'aligner |
| 5 | Le compilateur/outil de flash dit « développeur ne peut être vérifié » ou `killed: 9` | macOS a collé l'attribut de quarantaine aux binaires sans signature téléchargés du réseau | `xattr -dr com.apple.quarantine <répertoire>` |
| 6 | Crainte que le compilateur x86_64 ne « s'acclimate mal » sur Apple Silicon | xPack n'avait pas de build arm64 au début, nécessite la traduction Rosetta 2 | Pas un souci, une fois Rosetta installé, la compile marche très bien |
| 7 | Tentative de lien symbolique de `pio` vers `/usr/local/bin` qui échoue | Ce répertoire appartient à root, l'utilisateur normal n'a pas le droit d'écriture | Passer à `/opt/homebrew/bin` ou créer `~/.local/bin` et l'ajouter au PATH |
| 8 | Compile et flash OK, mais moniteur série blanc | Le template est juste une boucle de clignotement pure, **pas d'init série, pas le moindre `printf`** | Appeler `USART_Printf_Init(115200)`, utiliser `printf` normalement (le SDK l'a déjà redirigé vers USART1) |
| 9 (plus gros piège) | Le port série imprime déjà normalement, mais aucune LED ne clignote sur la carte | **La LED utilisateur embarquée est livrée en l'air, pas câblée au MCU** | Câbler un fil Dupont entre PA0 et LED1 (ou câbler sa propre LED + résistance vers GND) |
| 10 (dérivé) | Après passage à PA0, la LED ne s'allume toujours pas | En changeant de port, **on a oublié de modifier la macro d'activation d'horloge correspondante** | Définition de port et activation d'horloge doivent être modifiées ensemble, vérifier le tout après modification |

**La plus grosse leçon de cette session de pièges, en une phrase** : en dév embarqué, « pas de réaction » n'est jamais synonyme de « code faux ». D'abord, trouve un moyen de distinguer **problème logiciel** (le firmware est-il vraiment arrivé à cette logique ?) et **problème hardware** (la chaîne physique est-elle en place ? le périph est-il effectivement câblé ?). Faire parler le port série en premier est le coup le plus rapide et le plus sûr pour isoler un problème — toujours le rendre opérationnel en priorité.

---

## 17. Anti-sèche : commandes clés & chemins

Les commandes les plus utiles au quotidien :

```bash
# === Compile / flash / moniteur ===
pio run                # Compile seulement
pio run -t upload      # Compile + flash
pio device monitor      # Ouvrir le moniteur série (Ctrl+C pour quitter)

# === Voir la version firmware du débogueur WCH-Link & les infos de la puce connectée (le plus utile pour les soucis de connexion)===
~/.platformio/packages/tool-wlink/wlink status

# === Voir les versions des outils ===
~/.platformio/packages/tool-wlink/wlink --version    # Version de l'outil de flash
pio --version                                          # Version de PlatformIO Core

# === Voir la version du compilateur (selon l'environnement final confirmé, préfixe riscv-wch-elf-)===
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# Si tu as l'ancienne version gcc8/x86_64, change le nom de fichier en :
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
```

Sortie typique de `wlink status` — d'un coup d'œil tu vois la version firmware du débogueur, le modèle de puce cible, la Flash réelle, l'UID de la puce, etc. Indispensable pour les pannes de connexion :

```
[INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
[INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
[INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
[INFO] Flash protected: false
[INFO] RISC-V ISA(misa): Some("RV32ACFIMUX")
[INFO] RISC-V arch(marchid): Some("WCH-V4F")
```

> Pour upgrader le firmware du débogueur WCH-Link lui-même, il faut l'outil officiel **WCH-LinkUtility**, actuellement Windows only, pas de version Mac — un petit regret de plus sur un écosystème macOS encore incomplet.

Voici aussi un récap des chemins clés, pour localiser vite en cas de souci :

| Usage | Chemin |
|---|---|
| Binaire PlatformIO Core | `~/.platformio/penv/bin/pio` |
| Plateformes installées | `~/.platformio/platforms/ch32v/` |
| Toolchain / flash / outils de debug | `~/.platformio/packages/{toolchain-riscv,tool-wlink,tool-openocd-riscv-wch}` |
| Fichier de définition board | `~/.platformio/platforms/ch32v/boards/ch32v307_evt.json` |
| Script de build de la plateforme (là où on a creusé la logique du triple) | `~/.platformio/platforms/ch32v/builder/main.py` |
| Artéfacts de compilation | `<répertoire projet>/.pio/build/ch32v307_evt/firmware.{elf,bin}` |

Les paramètres clés de la définition board `ch32v307_evt`, pour compléter :

| Champ | Valeur |
|---|---|
| Modèle MCU | CH32V307VCT6 |
| Fréquence | 144 MHz |
| march / mabi (ABI cible de compile) | rv32imacxw / ilp32 |
| Flash / SRAM (défaut board) | 256 KB / 64 KB (la puce a en réalité 288KB Flash, voir chapitre 9) |
| Débogueur embarqué | WCH-Link |
| USB VID:PID | 1a86:8010 |
| Protocoles de flash supportés | wch-link, wlink, minichlink, isp |

---

## 18. Te bâtir ta « logique de dév CH32 », pour recoller direct sur le prochain projet

Au bout du compte, ce qui vaut le plus cher, ce n'est pas le nombre de commandes retenues, c'est de te forger un cadre de pensée réutilisable. Que tu continues sur CH32V307 ou que tu passes à une nouvelle puce, une nouvelle carte de la gamme CH32, tu peux suivre la même mécanique :

1. **D'abord vérifier la trinité « plateforme + framework + board »** : ce sont les trois lignes `platform`, `framework`, `board` dans `platformio.ini`. Une fois ces trois fixées, PlatformIO sait où télécharger la toolchain et quelles définitions de broches utiliser pour compiler.
2. **Après l'install de la plateforme, ne te précipite pas sur le code, vérifie d'abord la « nationalité » de la toolchain** : surtout sur les plateformes maintenues par la communauté et non supportées officiellement en première ligne, le défaut peut très bien n'adapter que Windows ou Linux. Après l'install, un coup d'œil `ls` sur le répertoire toolchain et un `file` sur les binaires clés pour confirmer l'architecture t'économise beaucoup de temps de debug.
3. **Devant un binaire non signé qui refuse de se lancer, pense tout de suite à Gatekeeper** : les erreurs `cannot be opened` / `killed: 9`, à 80 % c'est l'attribut de quarantaine ; `xattr -dr com.apple.quarantine` règle ça en un coup.
4. **Quand flash et compile réussissent mais qu'un périph ne répond pas, distingue d'abord logiciel de matériel** : faire parler le port série en premier est la méthode d'élimination la plus rapide — si tu as une sortie, le firmware tourne ; sinon, revérifier ce qui a pu échapper à l'init.
5. **Par défaut, ne fais pas confiance aux « périphériques utilisateur » déjà câblés sur la carte** : sur beaucoup de cartes d'évaluation, les LED, les boutons et autres sont laissés non connectés en usine pour des raisons de flexibilité. Vérifie sur le schéma avant de soupçonner ton code.
6. **Exploite `debug.h` (ou toute bibliothèque d'aide au debug équivalente fournie par le framework)** : presque tous les SDK constructeur préparent des fonctions de délai et une redirection de `printf`, inutile de réinventer la roue.
7. **Les numéros de version changent, ce qui se recolle d'un projet à l'autre, c'est la méthode de debug** : la toolchain communautaire évolue en permanence, il est tout à fait normal que les numéros soient différents de ceux du tuto quand tu installes. Comprendre le « pourquoi » compte plus que mémoriser le « quoi » — cet article en est lui-même l'illustration vivante.

Garde cette grille en tête, et la prochaine fois que tu déballeras n'importe quelle nouvelle carte de dev embarquée, tu sauras rapidement en faire le tour.

---

## 19. FAQ

**Q1 : Pourquoi ne pas utiliser directement MounRiver Studio officiel ? Il a bien une version Mac, non ?**

R : MounRiver Studio a bien une version Mac, mais d'après les retours de la communauté, son OpenOCD intégré a pas mal de problèmes sur Mac — on dirait que la version Mac n'a pas été sérieusement adaptée et testée. Et puis c'est un IDE intégré relativement fermé, tu ne maîtrises pas la version de la toolchain. PlatformIO, lui, s'appuie sur VSCode, la toolchain est entièrement sous contrôle, la communauté est active, et l'expérience de dév reste cohérente entre plateformes — ça vaut le coup de se battre un peu au départ.

**Q2 : Ne peut-on pas installer une toolchain RISC-V via Homebrew pour éviter le remplacement manuel ?**

R : Techniquement oui, mais pas recommandé pour cette plateforme. Le script de build de la plateforme localise la toolchain via le gestionnaire de paquets de PlatformIO (appels du genre `get_package_dir("toolchain-riscv")`) ; pour utiliser une toolchain Homebrew, il faudrait écrire une config supplémentaire pour surcharger le défaut, et c'est encore plus prise de tête. Reste sur le paquet `toolchain-riscv-mac` mentionné dans cet article, c'est le moins fatigant.

**Q3 : La toolchain peut-elle se faire écraser et revenir à la version Windows à la prochaine mise à jour de la plateforme ?**

R : C'est possible. Si tu lances ensuite `pio pkg update` ou que tu réinstalles toute la plateforme, le `platform.json` pointe toujours par défaut sur le dépôt Windows, et il peut écraser ta version macOS installée à la main. Dans ce cas, rejoue simplement les étapes de remplacement du chapitre 6 ; pour un truc définitif, fork le dépôt de la plateforme, modifie `platform.json` pour pointer par défaut sur la version macOS, et c'est plié à la racine.

**Q4 : La compile crache une erreur d'édition de liens, ou dit qu'une commande compilateur est introuvable — que se passe-t-il ?**

R : Très probablement, la version de la toolchain et le préfixe de l'exécutable compilateur ne correspondent pas (piège 4 du chapitre 16). Vérifie d'abord comment s'appelle réellement ton compilateur installé (`riscv-wch-elf-gcc` ou l'ancien `riscv-none-embed-gcc`), et assure-toi que la commande et le fichier réel tombent juste — tu peux t'aider du tableau de l'environnement final du chapitre 6.

**Q5 : Le flash dit « WCH-Link device introuvable », que faire ?**

R : Vérifie dans cet ordre : ① confirmer que tu as branché le port USB relié au WCH-Link, pas le port USB-Device ; ② confirmer que le débogueur est en mode RV et non DAP ; ③ lance `system_profiler SPUSBDataType | grep -A5 1a86` pour voir si le système reconnaît bien le périphérique USB (`1a86:8010` est le VID:PID de ce débogueur).

**Q6 : Quelles puces et quels frameworks de dév cette plateforme supporte-t-elle ? Si je change de carte plus tard, c'est compliqué ?**

R : Côté puces, elle couvre CH32V003/103/203/30x, CH32X035, CH56x/57x/58x/59x et toute une floppée. Côté frameworks, outre le noneos-sdk de cet article, elle supporte aussi FreeRTOS, RT-Thread, TencentOS, Harmony LiteOS, Arduino, ch32fun, Zephyr, etc. Changer de carte, c'est en gros modifier les deux lignes `board` et `framework` dans `platformio.ini` ; le reste de l'expérience de dépiégeage (architecture toolchain, quarantaine Gatekeeper, périphériques livrés en l'air) restera très probablement valable.

---

## 20. Et après ?

Hello World n'est qu'un point de départ — une fois que ça roule, tu peux pousser plus loin :

- **GPIO multi-canaux / interruptions bouton** : le bouton utilisateur KEY embarqué est lui aussi en l'air ; une fois câblé, tu peux t'entraîner aux interruptions externes EXTI.
- **USB CDC** : faire que le CH32V307 s'énumère lui-même comme un port série USB, sans plus passer par le pont USART1 du WCH-Link — c'est une autre piste qui demande une stack USB, du contenu avancé.
- **Utiliser les 288KB Flash en entier** : il faut d'abord modifier les option bytes via un outil officiel WCH, puis synchroniser les lignes commentées `board_upload.maximum_size` dans `platformio.ini`.
- **Se mettre à FreeRTOS / RT-Thread** : changer `framework` pour le RTOS correspondant, et découvrir l'ordonnancement multitâche.
- **Apprendre à debugger proprement** : avec OpenOCD + GDB et le debug via F5 (`pio debug`), consolider tes fondamentaux de debug embarqué.

---

## 21. Références

- Dépôt de la plateforme Community-PIO-CH32V : `github.com/Community-PIO-CH32V/platform-ch32v`
- Paquet toolchain macOS : `github.com/Community-PIO-CH32V/toolchain-riscv-mac`
- Releases de la toolchain (surveiller les nouveautés côté PIO) : `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`
- MounRiver officiel WCH (source de la toolchain perso WCH + IDE) : `www.mounriver.com`
- wlink (branche macOS) : `github.com/Community-PIO-CH32V/tool-wlink` (branches `mac_arm64` / `mac_x64`)
- Doc officielle : `pio-ch32v.readthedocs.io`
- xPack RISC-V GCC (amont de la toolchain) : `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack`
- Projet wlink d'origine : `github.com/ch32-rs/wlink`
- Page produit officielle WCH : `www.wch.cn/products/CH32V307.html`
- SDK / exemples officiels OpenWCH : `github.com/openwch/ch32v307`
- Note sur la LED livrée en l'air dans la doc officielle Zephyr pour cette carte
- Documentation officielle PlatformIO : `docs.platformio.org`

---

*Le code complet du projet est aussi sur GitHub, clone-le et lance-le directement. Si pendant tes propres galères tu tombes sur un piège qui n'est pas couvert ici, viens en parler en commentaires — les ressources sur CH32V sous macOS sont encore bien maigres, et plus on est de monde à partager, moins les suivants trinquent. Que ta LED s'allume enfin ! 🎉*

https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/CH32V/CH32V307-EVT-R1/01%20HelloWorld
