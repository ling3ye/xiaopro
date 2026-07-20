---
title:      "Installer ESP-IDF v6.0.2 sur macOS : du `brew install` qui râle au setup enfin vu par VSCode (le dépannage complet)"
domain:     hardware
platforms:  ["mac"]
format:     "tutorial"
relatedBoards: ["esp32s3"]
date:       2026-07-20
intro:      "Tu as installé ESP-IDF en ligne de commande sans broncher, et pourtant l'extension VSCode te sort froidement un « setup not found » ? Voici le récit brut d'une après-midi de débogage, depuis le `brew install eim` qui fait le difficile jusqu'à la vraie raison de l'erreur — une option de config écrite dans le mauvais scope. Toutes les commandes et messages d'erreur viennent d'une session réelle : tu peux les copier-coller tels quels pour ta propre recherche."
tags:       ["installer ESP-IDF", "ESP-IDF macOS", "EIM", "ESP32-S3", "VSCode setup not found", "configuration ESP-IDF"]
image: https://img.lingflux.com/2026/07/79ed5dc15e35419e612ab982e595d127.png
---

# Installer ESP-IDF v6.0.2 sur macOS : du `brew install` qui râle au setup enfin vu par VSCode

J'avais déjà installé ESP-IDF deux fois à la main, et deux fois je me suis cassé les dents sur un truc au milieu. Du coup, j'ai tout refait depuis le début en creusant la cause réelle de chaque erreur. Au final, le piège n'est pas tant « installer ESP-IDF » en lui-même : il est éparpillé dans cinq endroits qui n'ont rien à voir entre eux — Homebrew pour l'outil, l'accès réseau d'EIM, la bonne extension côté VSCode, quelques fichiers Windows qui traînent dans le projet, et la manière dont l'extension VSCode lit sa config. Une fois la ligne de commande en place, tout roule… sauf l'extension VSCode qui continue de balancer « setup not found ». Ça, c'est le problème qui m'a pris le plus de temps à déboguer, et c'est le cœur de cet article.

C'est un récit brut de mes propres galères : les commandes et les messages d'erreur sont ceux que j'ai vraiment eus. Si tu tombes sur la même erreur, tu peux les copier-coller pour chercher, ou balancer l'article et ton message d'erreur à un chatbot en lui demandant de suivre ce plan pour t'aider à localiser.

> **Avant de te lancer, vérifie bien les numéros de version.** Entre ESP-IDF v5.x et v6.0.2, la méthode d'installation a changé du traditionnel `install.sh` à EIM ; entre l'extension VSCode 1.x et 2.x, la logique de recherche du setup a été entièrement réécrite. Si tes versions diffèrent, surtout à l'étape 4 sur la config de l'extension, il y a de fortes chances que ça ne s'applique pas du tout.

## Versions de l'environnement

| Élément | Version |
|---|---|
| Système | macOS, Apple Silicon (puce série M) |
| ESP-IDF | v6.0.2 |
| Outil d'installation | EIM 0.17.1 |
| Extension VSCode | espressif.esp-idf-extension 2.1.0 |
| Puce cible | ESP32-S3 |

Les chemins dans l'article sont écrits avec mon nom d'utilisateur `shawn`. Si tu recopies les commandes, remplace-le par le tien (tape `whoami` dans le terminal pour le récupérer). J'ai aussi un proxy Clash qui tourne en local sur `127.0.0.1:7890` ; si tu n'en as pas besoin, vire les variables d'environnement avec `PROXY` dans leur nom et les arguments `--mirror` — ça n'impacte pas le déroulé principal.

## Plan d'ensemble

Cinq étapes, de la plus visible à la plus tordue :

| Étape | Ce qu'il faut faire | Erreur typique |
|---|---|---|
| 0 | Installer l'outil `eim` lui-même via Homebrew | Une confirmation de confiance souvent prise pour une erreur |
| 1 | Installer ESP-IDF v6.0.2 via `eim` | Deux pièges : réseau et numéro de version |
| 2 | Installer l'extension ESP-IDF dans VSCode | Plein de plugins homonymes, facile de se tromper |
| 3 | Nettoyer les fichiers Windows qui traînent dans le projet | Uniquement pour les projets ramenés de Windows |
| 4 | Faire en sorte que l'extension VSCode reconnaisse le setup | Le piège le plus fourbe de l'article, celui qui te bloquera le plus longtemps |

---

## Étape 0 : installer l'outil `eim` lui-même

`eim`, c'est l'acronyme d'ESP-IDF Manager : l'outil officiel d'Espressif pour gérer les installations. Son avantage sur le vieil `install.sh`, c'est que tu peux installer plusieurs versions d'ESP-IDF côte à côte sans qu'elles se marchent sur les pieds. Pour l'installer, il faut d'abord ajouter un tap Homebrew (dépôt tiers), puis lancer l'install :

Guide d'installation officiel d'EIM :
https://dl.espressif.com/dl/eim/index.html

```bash
brew tap espressif/eim
brew install eim
```

Au premier `brew install eim`, je suis tombé là-dessus :

```
Error: Refusing to load formula espressif/eim/eim from untrusted tap espressif/eim.
Run `brew trust --formula espressif/eim/eim` or `brew trust espressif/eim` to trust it.
```

> **Ce n'est pas un échec de l'install, juste une confirmation de sécurité de Homebrew.** Les versions récentes de Homebrew ne font plus confiance par défaut aux taps tiers (ceux qui ne sont pas dans le dépôt officiel). La première fois que tu utilises un truc issu d'un tap tiers, tu as droit à ce petit message qui te demande de confirmer en conscience. Le tap espressif est officiel, tu peux y aller les yeux fermés :

```bash
brew trust espressif/eim
```

Une fois que c'est fait, relance `brew install eim` et l'installation se passe normalement. Si, juste avant le `brew install`, tu vois défiler une liste de softs qui n'ont rien à voir avec eim (genre des petits outils de barre de menus, des trucs d'IA pour renommer des fichiers…), c'est juste Homebrew qui te rappelle combien de paquets tu as en retard de mise à jour — ignore-les et scrolle jusqu'à la vraie ligne d'erreur.

Une fois l'install terminée, vérifie :

```bash
eim --version
```

Si tu récupères bien un numéro de version, c'est bon, tu peux passer à l'étape suivante et installer ESP-IDF pour de vrai.

---

## Étape 1 : installer ESP-IDF v6.0.2 avec EIM

L'outil en place, une seule commande pour installer ESP-IDF :

```bash
HTTPS_PROXY=http://127.0.0.1:7890 \
HTTP_PROXY=http://127.0.0.1:7890 \
ALL_PROXY=socks5://127.0.0.1:7890 \
eim install -i v6.0.2 -t esp32s3 -n true \
  --idf-mirror https://git.espressif.com.cn \
  --pypi-mirror https://pypi.mirrors.ustc.edu.cn/simple
```

Détail des arguments :

- `-i v6.0.2` : le numéro de version à installer, **avec le préfixe `v` obligatoire** (voir pourquoi plus bas) ;
- `-t esp32s3` : la puce cible ;
- `-n true` : mode non-interactif, sinon ça reste bloqué à te demander d'appuyer sur Entrée ;
- `--idf-mirror` / `--pypi-mirror` : miroirs pour la Chine — le code source passe par le miroir officiel chinois d'Espressif, les paquets Python par celui de l'USTC. Vire-les si tu n'en as pas besoin ;
- les trois variables `PROXY` : pour qu'EIM puisse parler à git en interne (voir le piège 1 ci-dessous).

Cette commande a l'air toute bête, mais au premier run je me suis pris deux pieds dans la porte — le genre d'erreurs où « en surface ça a l'air d'installer tranquillement, mais en fait ça fait un détour silencieux ».

### Piège 1 : le proxy configuré dans git ne sert à rien, EIM l'ignore

En interne, EIM utilise la bibliothèque Rust `gix` pour récupérer le code source d'IDF. Cette bibliothèque ne lit pas `git config --global http.proxy` — elle ne regarde que les variables d'environnement système `HTTPS_PROXY`, `HTTP_PROXY`, `ALL_PROXY`. Si ton proxy n'est configuré que dans la config de git, sans variable d'environnement correspondante, `gix` tente une connexion directe, échoue en boucle, et le log se remplit de :

```
WARN - Attempt N failed: "Failed to fetch: Failed to consume the pack sent by the remote"
```

Après trois échecs, `gix` bascule sur le git système (qui, lui, lit la config git et passe bien par le proxy), donc au final ça finit généralement par s'installer — mais avec quelques minutes de perdues, et le clone obtenu après repli n'est pas super propre. Le plus simple, c'est de balancer les variables de proxy directement dans la commande dès le départ, pour que `gix` réussisse du premier coup sans attendre trois échecs avant de se rabattre.

### Piège 2 : oublier le `v` du numéro de version → erreur

Les tags de release du dépôt officiel Espressif sont tous au format `v6.0.2` (avec le `v`), et le paramètre `-i` d'EIM est utilisé tel quel comme nom de tag git. Si tu écris `-i 6.0.2` (sans le v), tu te prends :

```
fatal: Remote branch 6.0.2 not found in upstream origin
```

Là encore, c'est le message du git système qui prend la relance après l'échec de `gix` — il ne trouve pas de branche nommée `6.0.2` (sans v) sur le remote. Avec `-i v6.0.2`, plus de souci. Si tu n'es pas sûr de la forme exacte d'un tag, vérifie d'abord ce qui existe sur le remote :

```bash
git ls-remote --tags https://git.espressif.com.cn/espressif/esp-idf.git 'v6.0*'
```

### Vérifier que l'install a bien pris

```bash
eim list
# Tu devrais voir v6.0.2 (selected)

source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py --version
# Si ça sort ESP-IDF v6.0.2, c'est tout bon
```

### Où sont rangés les fichiers après install

La structure de répertoires produite par EIM n'est pas tout à fait la même qu'avec l'ancienne méthode. Toutes les configs suivantes feront référence à ces chemins, donc autant s'en imprégner dès maintenant :

```
Source IDF           ~/.espressif/v6.0.2/esp-idf
Toolchain            ~/.espressif/tools/
Python venv          ~/.espressif/tools/python/v6.0.2/venv
Script d'activation  ~/.espressif/tools/activate_idf_v6.0.2.sh
Manifeste EIM        ~/.espressif/tools/eim_idf.json
```

Petite mention spéciale pour le venv Python : il est planqué dans `tools/python/v6.0.2/venv`, et non dans le bon vieux `python_env/` à la racine du projet qu'on croisait dans les anciennes versions. La première fois, c'est facile de chercher pendant 10 minutes.

---

## Étape 2 : installer l'extension ESP-IDF dans VSCode

Une fois la ligne de commande opérationnelle, retour dans VSCode : ouvre le panneau des extensions (`Cmd+Shift+X`), cherche « ESP-IDF ».

> **Beaucoup de monde se plante à cette étape, donc vérifie bien l'éditeur.** Les résultats de recherche vont te sortir plusieurs plugins au nom quasi identique et avec des icônes très ressemblantes — au nom seul, c'est super facile de cliquer sur le mauvais. Contrôle ces infos avant de cliquer sur Install, et installe uniquement si tout colle :

| Champ | Valeur |
|---|---|
| Nom de l'extension | ESP-IDF |
| Éditeur | Espressif Systems |
| Site de l'éditeur | espressif.com |
| Nombre d'installations | 1 582 039 |
| Note | 145 avis |
| Description | Develop and debug applications for Espressif chips with ESP-IDF |

**Regarde l'éditeur, pas juste le nom.** L'éditeur doit être **Espressif Systems**, le domaine **espressif.com**, et le compteur d'installations dans le million — ce sont les signes distinctifs les plus clairs de la vraie extension officielle. Si tu installes la mauvaise, les options de config dont on parle à l'étape 4 (`idf.eimIdfJsonPath`, `idf.currentSetup` et cie) n'existent tout simplement pas, ou pire elles existent mais ne se comportent pas du tout pareil — et tu vas passer un temps fou à chercher pourquoi, alors que la cause réelle, c'est « tu as installé la mauvaise extension dès le départ ».

Une fois la bonne extension en place, redémarre VSCode (ou `Cmd+Shift+P` → `Reload Window`) pour qu'elle soit active, puis on continue.

---

## Étape 3 : projet ramené de Windows ? Nettoyer trois fichiers avant tout

**Si ton projet est tout neuf, saute cette étape.** Mais si c'est un projet ramené de Windows, tu vas presque forcément tomber sur les pièges de cette section : trois fichiers contiennent des chemins spécifiques à Windows qui cassent direct sous macOS.

### ① `.vscode/settings.json`

Remplace tous les `C:\...` (chemins Windows), les noms de port série (genre `COM22`) et les anciens numéros de version par leurs vraies valeurs côté macOS :

```jsonc
{
  "idf.espIdfPath": "/Users/shawn/.espressif/v6.0.2/esp-idf",
  "idf.toolsPath":  "/Users/shawn/.espressif",
  "idf.pythonInstallPath": "/Users/shawn/.espressif/tools/python/v6.0.2/venv/bin/python",
  "idf.port": "/dev/cu.usbmodemXXXXXXXXXXX",
  "idf.customExtraVars": { "IDF_TARGET": "esp32s3" },
  "idf.flashType": "UART"
}
```

Pour trouver le nom de ton port série :

```bash
ls /dev/cu.usb*
```

### ② `.vscode/c_cpp_properties.json`

Le `compilerPath` pointe vers la version Windows de `xtensa-esp32s3-elf-gcc.exe`, et le numéro de version du toolchain est probablement obsolète — il faut remplacer par ce qui est réellement installé sur ton Mac. Mon conseil : ne code pas le chemin en dur, utilise la variable `${config:idf.toolsPath}` comme base. Comme ça, à la prochaine mise à jour, tu n'as rien à retoucher :

```jsonc
"compilerPath": "${config:idf.toolsPath}/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc"
```

Le numéro `esp-15.2.0_20251204` ne s'invente pas : va fouiller dans `~/.espressif/tools/xtensa-esp-elf/` pour voir quel dossier est réellement installé, et utilise celui-là.

### ③ `dependencies.lock` — le plus souvent oublié

C'est un fichier de lock généré par idf-component-manager (le gestionnaire de composants). Sur Windows, c'était l'ancien format v2.0.0 qui était produit, et ce format enregistre aussi les **chemins absolus** des composants locaux — par exemple le dossier de l'auteur original :

```yaml
espressif/esp_lcd_touch:
  source:
    path: C:\Users\PC\Desktop\...\espressif__esp_lcd_touch
    type: local
```

Au moment du reconfigure sur Mac, ce chemin n'existe évidemment plus, et tu te prends :

```
CMake Error: The "path" field in the manifest file ... does not point to a directory.
```

Ce fichier n'est qu'un cache auto-généré : le plus simple, c'est de le supprimer et de le laisser se reconstruire tout seul :

```bash
rm dependencies.lock
rm -rf build
source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py reconfigure
```

À la régénération, tu passes en format v3.0.0, les chemins deviennent locaux, et les composants du registry sont re-téléchargés dans `managed_components/`.

**À ce stade, `idf.py build` en ligne de commande devrait tourner sans souci.** Si ça ne passe toujours pas, le problème n'est pas dans ces fichiers-là, il faut chercher ailleurs.

---

## Étape 4 : l'extension VSCode qui dit « setup not found » (le vrai calvaire)

Une fois la ligne de commande OK, je pensais en avoir fini. J'ouvre VSCode, et la barre d'état m'affiche invariablement :

```
Current ESP-IDF setup is not found.
```

Deux Reload Window plus tard, après avoir bidouillé quelques options qui avaient l'air liées, toujours rien. J'ai fini par ouvrir le code source de l'extension (`dist/extension.js`) pour comprendre la logique complète de recherche du setup :

1. Lire le fichier `eim_idf.json` pointé par `idf.eimIdfJsonPath` pour récupérer la liste des setups installés ;
2. Prendre la valeur de `idf.currentSetup` et la faire matcher par chemin dans cette liste ;
3. Si pas de match, parcourir la liste en entier pour voir si un setup valide le test ;
4. Si tout échoue, balancer le fameux « not found ».

Tout ce mécanisme ne tient que si la liste de l'étape 1 est correctement chargée. J'ai fait deux détours avant de trouver la vraie cause : le premier était une perte de temps (inutile de le suivre), le second est la vraie modif à faire. Je l'explique clairement pour que tu saches quoi modifier quand tu suis l'article :

- **Détour 1 : pas d'action nécessaire, c'est juste pour comprendre — tu peux sauter ;**
- **Détour 2 : il faut y aller, c'est la vraie correction.**

### Détour 1 (à lire pour la culture, pas à appliquer) : que mettre dans `idf.currentSetup` ?

La description officielle de cette option dit « Current ESP-IDF setup id in eim_idf.json path » — littéralement, on dirait qu'il faut mettre un ID (un numéro). Mais en lisant le code source, on voit que quand l'extension sélectionne elle-même un setup, elle écrit en réalité :

```js
await _o("idf.currentSetup", c.idfPath, ConfigurationTarget.WorkspaceFolder, e)
```

Ce qui est écrit, c'est `idfPath` — un **chemin**, pas un numéro. Donc si tu retrouves cette option dans la config workspace, elle doit ressembler à :

```jsonc
"idf.currentSetup": "/Users/shawn/.espressif/v6.0.2/esp-idf"
```

Mais **tu n'as pas besoin de la modifier à la main** — ce n'est pas la cause du problème. Si la liste de setups du Détour 2 se charge correctement, l'extension va elle-même parcourir la liste, trouver le seul v6.0.2 installé, et écrire son chemin dans `currentSetup` toute seule. Je ne mentionne cette option que pour que tu saches à quoi elle sert si tu la croises — inutile de la bricoler parce qu'elle « a l'air fausse ». La vraie modif à faire, c'est celle qui suit.

### Détour 2 (la vraie modif à faire) : le scope de `idf.eimIdfJsonPath` est mauvais

Les options de config de VSCode ont plusieurs scopes possibles. Le scope de `idf.eimIdfJsonPath` est **`application`** — ce qui veut dire qu'elle **n'est lue que dans le User settings.json global**. L'écrire dans le `.vscode/settings.json` du projet ne sert littéralement à rien.

Pendant longtemps, j'avais mis `eimIdfJsonPath` dans la config workspace du projet — du coup, l'extension ne chargeait jamais le fichier `eim_idf.json`, et la fameuse liste de setups restait désespérément vide. Or, liste vide = aucun moyen de matcher `currentSetup`, peu importe ce que tu mets dedans. C'est ça, la vraie raison pour laquelle mes deux Reload d'avant ne servaient à rien.

> **La correction : déplacer `idf.eimIdfJsonPath` dans la config globale.**

Le chemin du fichier de config global de VSCode sur macOS, c'est :

```
~/Library/Application Support/Code/User/settings.json
```

Ouvre-le avec ton éditeur de texte et ajoute cette ligne :

```jsonc
"idf.eimIdfJsonPath": "/Users/shawn/.espressif/tools/eim_idf.json"
```

Dans le `.vscode/settings.json` du projet, ne garde que `idf.currentSetup` (avec le chemin du IDF). Et surtout ne mets pas aussi `eimIdfJsonPath` dans la config workspace — ça ne marchera pas, et ça te donnera juste l'illusion que tout est bien configuré.

Une fois la modif faite, `Cmd+Shift+P` pour ouvrir la palette de commandes, et choisis **Reload Window**. Au prochain chargement, si la barre d'état affiche normalement la version d'ESP-IDF et la puce cible, c'est que l'extension a enfin reconnu ton setup.

Si jamais ça ne marche toujours pas après le Reload, tu peux regarder les logs en temps réel de l'extension : `Cmd+Shift+P` → `Output`, puis dans le menu déroulant en haut à droite du panneau de sortie, choisis le canal **ESP-IDF**. Les messages d'erreur y seront bien plus bavards que la ligne de la barre d'état.

### Tu ne connais pas le scope d'une option ? Cherche-le, ne devine pas

Les infos de scope des options d'une extension VSCode sont écrites dans son propre `package.json`. Plutôt que de deviner, balance quelques lignes de Python pour le vérifier directement :

```bash
python3 -c "
import json
p = json.load(open('/Users/shawn/.vscode/extensions/espressif.esp-idf-extension-2.1.0/package.json'))
cfg = p['contributes']['configuration']
props = {}
if isinstance(cfg, list):
    for c in cfg:
        props.update(c.get('properties', {}))
else:
    props = cfg.get('properties', {})
for k in ['idf.eimIdfJsonPath', 'idf.currentSetup', 'idf.espIdfPath']:
    print(k, '->', props.get(k, {}).get('scope', 'window(par défaut)'))
"
```

---

## Anti-sèche

### Où écrire chaque option de config

| Option | Scope | Où l'écrire |
|---|---|---|
| `idf.eimIdfJsonPath` | application | User settings global |
| `idf.currentSetup` | resource | `.vscode/settings.json` du projet |
| `idf.espIdfPath` / `idf.toolsPath` / `idf.pythonInstallPath` | window | Workspace ou global, au choix |

### Chemins clés

```
Source IDF           ~/.espressif/v6.0.2/esp-idf
Toolchain            ~/.espressif/tools/
xtensa gcc           ~/.espressif/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc
Python venv          ~/.espressif/tools/python/v6.0.2/venv/bin/python
Script d'activation  source ~/.espressif/tools/activate_idf_v6.0.2.sh
Manifeste EIM        ~/.espressif/tools/eim_idf.json
Settings global      ~/Library/Application Support/Code/User/settings.json
```

### Commandes utiles

```bash
brew tap espressif/eim                              # Ajouter le tap officiel
brew trust espressif/eim                             # Confiance nécessaire au 1er usage d'un tap tiers
brew install eim                                     # Installer eim lui-même

eim list                                              # Lister les versions installées
eim install -i v6.0.2 -t esp32s3 -n true ...          # Installer ESP-IDF (args : voir étape 1)

source ~/.espressif/tools/activate_idf_v6.0.2.sh      # Activer l'environnement ESP-IDF dans le shell courant
idf.py set-target esp32s3                             # Définir la puce cible
idf.py reconfigure                                    # Uniquement la conf cmake, produit compile_commands.json
idf.py build                                          # Compiler
idf.py -p /dev/cu.usbmodemXXXX flash monitor          # Flasher + ouvrir le moniteur série
```

---

## Ordre de débogage : quand tu es bloqué, commence par réduire le terrain

Si tu ne sais pas par où attaquer, suis cet ordre pour éliminer les couches une à une — bien plus rapide que de piocher au hasard :

1. **`brew install eim` passe-t-il ?** Si non, regarde si le message te demande de faire `brew trust` — si oui, fais-le sans paniquer, voir étape 0 ;
2. **`idf.py --version` tourne-t-il ?** Si non → le souci est à la couche installation ou activation, voir étape 1 ;
3. **Ce que tu as trouvé dans le panneau d'extensions VSCode est-il bien le bon ?** Si après install, les options ne correspondent pas ou l'extension ne se comporte pas comme décrit dans cet article → vérifie d'abord que l'éditeur est bien « Espressif Systems », très probable que tu as installé la mauvaise dès le départ, voir étape 2 ;
4. **`idf.py reconfigure` passe-t-il ?** Si non → le souci est dans les fichiers du projet, et le coupable principal est `dependencies.lock`, voir étape 3 ;
5. **La ligne de commande est OK mais VSCode te dit « setup not found » ?** → le souci est dans la config de l'extension, et le truc à vérifier en priorité, c'est le scope de `eimIdfJsonPath`, voir étape 4.

Deux fausses pistes à éviter, pour t'épargner du temps perdu :

- Le tag v6.0.2 ne contient pas de fichier `version.txt` — ce n'est **pas** un fichier oublié pendant le clone. De toute façon, l'extension ne lit pas ce fichier, donc pas de panique en le voyant manquant ;
- La valeur de `idf.currentSetup` n'est quasiment jamais la cause d'un « setup not found ». Si tu as ce message, ne te précipite pas pour la modifier ; vérifie d'abord que `eimIdfJsonPath` est bien dans le settings global, pas dans la config workspace.

---

Si tu as suivi tout le plan et que ça coince encore, il y a de fortes chances que ce soit une histoire de versions qui ne collent pas — la méthode d'installation d'ESP-IDF et la logique de recherche du setup côté extension VSCode ont changé plusieurs fois ces dernières années, et les vieux tutos ne s'appliquent pas forcément aux nouvelles versions. Le mieux, c'est de balancer à un chatbot ta version locale d'ESP-IDF, ta version d'EIM, ta version de l'extension, ainsi que le message d'erreur exact, en lui demandant de suivre la trame « installer l'outil → installer IDF → nettoyer les fichiers projet → configurer l'extension » de cet article. En général, ça permet de localiser la couche fautive bien plus vite qu'une recherche à l'aveugle sur les mots-clés de l'erreur.
