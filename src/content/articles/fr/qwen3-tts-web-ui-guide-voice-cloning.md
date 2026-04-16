---
title: "Lancer Qwen3-TTS en local avec Web UI | Clone vocal sans écrire une ligne de code"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS est livré avec une interface web : uploadez un enregistrement et clonez une voix, sans toucher au code. Ce guide couvre la configuration sur Mac (puces M-series) et Windows (GPU NVIDIA)."
image: "https://img.lingflux.com/2026/03/2d1950de23bc0838bd604e391f15a92d.png"
tags: ["qwen3 tts", "qwen tts web ui", "qwen clone vocal", "Interface Web Qwen3-TTS", "Qwen clonage vocal", "Tutoriel Qwen TTS"]
---

# Lancer Qwen3-TTS en local avec Web UI : clone vocal sans savoir coder

Le Qwen3-TTS d'Alibaba a vraiment de la gueule — uploadez un extrait de votre voix, et il « apprend » à parler comme vous ; ou décrivez en texte « une voix masculine grave et magnétique », et il vous en fabrique une sur mesure. Encore mieux : il est livré avec une interface web, il suffit d'ouvrir un navigateur et de cliquer partout, pas besoin de toucher à la moindre ligne de code.

> Ce manuel a été testé et validé par mes soins sur un **Mac mini M4 (série M)**. Tous les pièges que j'ai rencontrés sont signalés pour vous.

------

## D'abord, déterminez votre situation



Guide d'installation locale (déploiement) :

https://lingflux.com/fr/articles/ai/qwen3-tts-mac-mini-m4-complete-guide/



Ne vous précipitez pas pour copier des commandes. Regardez d'abord la configuration de votre ordinateur pour savoir quel chemin suivre :

| Votre ordinateur                              | Le chemin à suivre                                         |
| --------------------------------------------- | ---------------------------------------------------------- |
| Mac, puce M1/M2/M3/M4                         | Accélération `mps`, suivez la voie Mac                    |
| Windows, avec carte graphique NVIDIA          | Accélération `cuda`, suivez la voie Windows               |
| Pas de carte graphique dédiée, CPU uniquement | Ça marche aussi, mais c'est lent, préparez un thé en attendant |

------

## Trois modes de jeu, choisissez-en un

Au lancement, le choix du modèle détermine le mode. En résumé :

**Clonage vocal** → Uploadez votre propre enregistrement, il apprend votre voix
 Nom du modèle : `Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**Voix prédéfinies** → Choisissez parmi les voix intégrées, avec la possibilité d'ajouter des instructions comme « dis-le sur un ton triste »
 Nom du modèle : `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`

**Design vocal personnalisé** → Décrivez la voix que vous voulez en texte, il vous la crée
 Nom du modèle : `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

Les commandes ci-dessous prennent pour exemple le **modèle Base (clonage vocal)**. Remplacez simplement le nom du modèle pour basculer vers un autre mode.

------

## Première étape : lancer l'interface

### Mac (puces M-series)

Ouvrez le Terminal et collez cette commande :

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device mps \
  --dtype bfloat16 \
  --no-flash-attn
```

**Que signifient ces trois paramètres :**

- `--device mps` : Utilise le GPU de la puce Apple, bien plus rapide que le CPU seul. Si votre Mac n'est pas de la série M (un ancien modèle), remplacez par `cpu`
- `--dtype bfloat16` : Format de précision du modèle, très bien pris en charge par la série M, utilisez-le tel quel
- `--no-flash-attn` : **Ne l'oubliez surtout pas !** Mac ne prend pas en charge FlashAttention, sans ce paramètre le lancement plantera

------

### Windows (GPU NVIDIA)

Ouvrez l'Invite de commandes (CMD) et collez :

```cmd
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base ^
  --device cuda:0 ^
  --dtype bfloat16 ^
  --flash-attn
```

**Explication des paramètres :**

- `--device cuda:0` : Utilise la première carte NVIDIA (en général vous n'en avez qu'une, `0` suffit)
- `--dtype bfloat16` : Pris en charge par les cartes RTX série 30 et supérieures, recommandé
- `--flash-attn` : Sous Windows + CUDA, cette accélération peut être activée, et ça va nettement plus vite

> Petite astuce : dans les commandes Windows, le saut de ligne se fait avec `^` (CMD) ou l'apostrophe inversée (PowerShell), pas avec `\` comme sur Mac. Ne vous trompez pas.

------

### Pas de carte graphique, CPU uniquement ?

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device cpu \
  --dtype float32
```

Ça tourne, mais c'est lent. La génération d'une seule phrase peut prendre quelques minutes, soyez prêt à patienter.

------

## Deuxième étape : ouvrir le navigateur

Une fois la commande lancée, le Terminal affichera une ligne comme celle-ci :

```
Running on local URL: http://0.0.0.0:8000
```

Accédez directement à **http://localhost:8000** dans votre navigateur, l'interface apparaîtra. Ensuite, quelques clics et c'est parti.

Vous voulez l'utiliser depuis un téléphone ou un autre appareil sur le réseau local ? Remplacez `localhost` par l'adresse IP de cet ordinateur.
 Pour trouver l'IP : sur Mac, lancez `ifconfig | grep "inet "` ; sur Windows, lancez `ipconfig`.

------

## En cas d'erreur, pas de panique, vérifiez ici

**Au lancement sur Mac, erreur FlashAttention**
 Dans neuf cas sur dix, vous avez oublié d'ajouter `--no-flash-attn`. Ajoutez-le et relancez.

------

**Windows indique que CUDA n'est pas disponible**
 Lancez d'abord cette commande pour vérifier :

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

Si ça affiche `True`, pas de souci ; si ça affiche `False`, c'est que la version de PyTorch installée ne prend pas en charge CUDA. Réinstallez-la avec le support CUDA :

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

`cu121` correspond à CUDA 12.1. Adaptez selon votre version de CUDA : pour CUDA 11.8, remplacez par `cu118`.

------

**Mémoire vidéo insuffisante, erreur OOM (dépassement mémoire)**
 Remplacez `--dtype bfloat16` par `--dtype float16`. La précision baisse d'un cran, mais vous gagnez un peu de mémoire vidéo.

------

**Téléchargement du modèle lent ou échoué (réseau en Chine)**
 Configurez un miroir avant de lancer la commande :

Mac / Linux :

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Windows :

```cmd
set HF_ENDPOINT=https://hf-mirror.com
```

------

## Vous ne voulez pas tourner en local ? Testez d'abord en ligne

Installer le modèle et l'environnement, c'est un peu fastidieux. Vous pouvez d'abord essayer la démo en ligne officielle pendant quelques minutes pour voir si ça vous plaît vraiment avant de vous lancer dans l'installation locale :

- Hugging Face : https://huggingface.co/spaces/Qwen/Qwen3-TTS
- ModelScope (accès rapide depuis la Chine) : https://modelscope.cn/studios/Qwen/Qwen3-TTS

------

Bloqué à une étape ? Copiez le message d'erreur complet du Terminal, collez-le dans un moteur de recherche ou demandez à une IA, et vous aurez probablement la solution en quelques minutes.
