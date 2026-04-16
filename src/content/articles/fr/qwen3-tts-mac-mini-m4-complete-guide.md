---
title: "Guide complet pour faire tourner Qwen3-TTS sur Mac Mini M4 | De zéro au résultat en 5 étapes"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS est le tout nouveau modèle de synthèse vocale d'Alibaba, mais sa configuration par défaut est prévue pour les cartes NVIDIA. Ce guide vous montre pas à pas comment le faire tourner avec succès sur un Mac Mini M4 — installation des dépendances système, configuration de l'environnement Python, modification du code pour le GPU Apple (MPS). Chaque étape est détaillée. Adapté aux utilisateurs Mac, aux débutants en IA et aux développeurs souhaitant tester les modèles TTS."
image: "https://img.lingflux.com/2026/03/2a456838c50928eb67a807431e65c2a3.png"
tags: ["qwen3 tts", "qwen3 tts mac", "qwen tts guide", "Configuration Qwen3-TTS Mac", "Qwen3-TTS puce M4", "Synthèse vocale Qwen"]
---

# Guide complet pour faire tourner Qwen3-TTS sur Mac Mini M4

> **Pour qui est-ce ?** Si vous avez un Mac Mini M4 et que vous savez ouvrir le Terminal, ce guide est fait pour vous. Pas besoin de background en IA, suivez les étapes !

> 📝 **Cet article est basé sur des tests réels effectués par l'auteur sur Mac Mini M4. Toutes les étapes ont été vérifiées et fonctionnent.**

------

## 📋 Avant de commencer, lisez ceci

**Qwen3-TTS** est le tout dernier modèle de synthèse vocale (text-to-speech) publié par Alibaba, et les résultats sont vraiment impressionnants. Mais il est conçu par défaut pour les cartes graphiques NVIDIA, donc il faut quelques petites adaptations pour le faire tourner sur Mac.

La bonne nouvelle : **les modifications sont minimes, et cet article a déjà défriché le terrain pour vous** 🎉

Le processus se déroule en 5 étapes, environ 15 à 30 minutes (la majeure partie du temps est consacrée au téléchargement du modèle).

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XG7krJlY-jY?si=X-F1_WwBnldVCeiK" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

------

## Première étape : installer les dépendances système

Le système de base de Mac manque de certains outils de traitement audio. Commençons par les installer avec Homebrew.

Ouvrez le Terminal et collez cette commande :

```bash
brew install portaudio ffmpeg sox
```

> ⚠️ **Si vous sautez cette étape**, vous aurez plus tard l'erreur `/bin/sh: sox: command not found`. Vous pourrez toujours revenir l'installer à ce moment-là, mais autant tout faire d'un coup maintenant.

------

## Deuxième étape : créer l'environnement Python

Choisissez un répertoire pour votre projet, puis créez un environnement Python 3.12 propre avec **Conda** pour éviter les conflits avec d'autres projets sur votre machine.

```bash
# Créer et activer l'environnement (à ne faire qu'une seule fois)
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts

# Installer les bibliothèques principales
pip install -U qwen-tts

# Cloner le dépôt officiel
git clone https://github.com/QwenLM/Qwen3-TTS.git
cd Qwen3-TTS
pip install -e .
```

> 💡 **Qu'est-ce qu'un environnement Conda ?** Imaginez que c'est une « petite pièce indépendante » : toutes les dépendances de ce projet s'installent dedans, sans affecter les autres programmes de votre ordinateur.

------

## Troisième étape : adapter le code pour la puce M4 ⭐ (étape clé !)

Les étapes précédentes sont identiques à celles du dépôt GitHub, mais si vous utilisez une puce Apple M-series, c'est à partir d'ici que ça diffère un peu.

C'est ici que les utilisateurs Mac trébuchent le plus souvent. Le script officiel utilise par défaut une carte NVIDIA ; nous devons modifier deux endroits pour qu'il utilise le GPU Apple (MPS).

Ouvrez le fichier `examples/test_model_12hz_base.py`, repérez la ligne 50 environ, et effectuez les deux modifications suivantes :

### Modification A : spécifier l'appareil MPS

```python
# ❌ Version originale (conçue pour NVIDIA)
# tts = Qwen3TTSModel.from_pretrained(..., attn_implementation="flash_attention_2")

# ✅ Remplacez par ceci (adapté pour Mac M4)
tts = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",   # Attention : supprimez le slash / à la fin
    torch_dtype=torch.bfloat16,          # M4 prend parfaitement en charge bfloat16, bon compromis précision/vitesse
    attn_implementation="sdpa",          # Mécanisme d'attention compatible Mac, en remplacement de flash_attention_2
    device_map="mps",                    # Forcer l'utilisation du GPU Apple
)
```

### Modification B : adapter la synchronisation pour MPS

```python
# ❌ Version originale (uniquement NVIDIA, crash direct sur Mac)
# torch.cuda.synchronize()

# ✅ Remplacez par ceci (détecte automatiquement le type de GPU)
if torch.cuda.is_available():
    torch.cuda.synchronize()
elif torch.backends.mps.is_available():
    torch.mps.synchronize()   # Commande correcte spécifique à Mac
```

> 🔧 **Pourquoi ces deux modifications ?** La puce M4 utilise le propre framework Metal d'Apple (MPS), qui est un écosystème totalement différent de CUDA de NVIDIA. La première modification indique au modèle « utilise le GPU Apple », la seconde fait en sorte que la commande de synchronisation utilise la bonne version Apple.

------

## Quatrième étape : télécharger le modèle et l'exécuter

Le fichier du modèle pèse environ **4 Go**, assurez-vous d'avoir une connexion stable.

```bash
cd examples
python test_model_12hz_base.py
```

### 🐢 Le téléchargement est trop lent ? Essayez un miroir

```bash
export HF_ENDPOINT=https://hf-mirror.com
python test_model_12hz_base.py
```

### Si vous avez l'erreur ❌ `SafetensorError` ?

Cela signifie que le téléchargement précédent a été interrompu et que le fichier est corrompu. La solution est simple :

1. Ouvrez le Finder, allez dans `~/.cache/huggingface/hub`
2. Supprimez le dossier `Qwen`
3. Relancez le script pour qu'il télécharge à nouveau

------

## Cinquième étape : vérifier que le GPU est bien utilisé

Avant l'exécution, vous pouvez rapidement confirmer que le GPU du M4 est bien reconnu :

```python
import torch
print(torch.backends.mps.is_available())  # Si ça affiche True, c'est gagné ✅
```

------

## 🎉 C'est un succès !

Si tout s'est bien passé, après l'exécution du script, un nouveau dossier sera créé dans le répertoire `examples/`, contenant les fichiers audio générés.

------

## 📎 Code de référence complet

Le code ci-dessous inclut toutes les adaptations pour Mac, ainsi que des fonctions de **fusion multilingue** et de **contrôle de la vitesse de parole**. Vous pouvez l'enregistrer directement dans un fichier `.py` :

```python
import os
import torch
import soundfile as sf
import numpy as np
# Assurez-vous que 'qwen_tts' est installé/présent dans l'environnement
from qwen_tts import Qwen3TTSModel

# ================= 1. Initialisation =================

# Détection automatique du matériel.
# "mps" = Mac (Apple Silicon), "cuda" = GPU NVIDIA, "cpu" = Processeur standard
if torch.backends.mps.is_available():
    device = "mps"   # Mac M1/M2/M3/M4...
elif torch.cuda.is_available():
    device = "cuda"  # GPU NVIDIA
else:
    device = "cpu"   # Processeur standard

print(f"Appareil utilisé : {device}")

# Définir le répertoire de sauvegarde des résultats
OUT_DIR = "qwen3_slow_output"
os.makedirs(OUT_DIR, exist_ok=True)

print("Chargement du modèle... (cela peut prendre une minute)")

# Chargement du modèle depuis Hugging Face
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    torch_dtype=torch.bfloat16,
    attn_implementation="sdpa",
    device_map=device,
)
print("Modèle chargé avec succès !")

# ================= 2. Paramètres audio de référence =================
# C'est la voix que le modèle va imiter (cloner).

# Option A : Utiliser une URL (exemple officiel Qwen)
ref_audio_url = "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-TTS-Repo/clone_2.wav"

# Option B : Utiliser un fichier local (décommentez la ligne ci-dessous pour utiliser votre propre fichier)
# ref_audio_url = "./my_voice.wav"

# CRUCIAL : Ce texte doit correspondre exactement à ce qui est dit dans l'audio de référence.
# Si le contenu ne correspond pas, la qualité sera dégradée.
ref_text_content = "Okay. Yeah. I resent you. I love you. I respect you. But you know what? You blew it! And thanks to you."

# ================= 3. Configuration du contenu à générer =================
# Astuce : pour ralentir et clarifier la parole, on ajoute de la ponctuation (comme , . ...)
# Cela force le modèle à faire des pauses entre les mots.

segments = [
    {
        "lang": "Chinese",
        # Astuce : ajout de virgules pour ralentir le débit.
        "text": "大家好，这个视频是，分享如何在Mac Mini上，部署Qwen.3-TTS，运行官方例子程序，希望你们喜欢。",
        "temp": 0.7,
    },
    {
        "lang": "English",
        # Astuce : ajout de "..." et de virgules supplémentaires pour un rythme plus détendu.
        "text": "Hello everyone! In this video, I'll share how to deploy Qwen.3-TTS on a Mac Mini and run the official demos. I hope you enjoy it.",
        "temp": 0.7,
    },
    {
        "lang": "Japanese",
        # Astuce : ajout de virgules japonaises supplémentaires (、)
        "text": "皆さん、こんにちは。この動画では、Mac MiniでQwen.3-TTSを導入し、公式デモを動かす方法をシェアします。気に入っていただけると嬉しいです。",
        "temp": 0.7,
    },
    {
        "lang": "Korean",
        # Astuce : ajout de pauses entre les concepts.
        "text": "안녕하세요 여러분. 이번 영상에서는 맥 미니(Mac Mini)에 Qwen.3-TTS를 구축하고, 공식 예제를 실행하는 방법을 공유해 드리겠습니다. 유익한 시간이 되시길 바랍니다.",
        "temp": 0.7,
    },
    {
        "lang": "German",
        "text": "Hallo zusammen! In diesem Video zeige ich euch, wie man Qwen.3-TTS auf einem Mac Mini deployt und die offiziellen Demos ausführt. Ich hoffe, es gefällt euch.",
        "temp": 0.6,
    },
    {
        "lang": "French",
        "text": "Bonjour à tous ! Dans cette vidéo, je vais partager comment déployer Qwen3-TTS sur un Mac Mini et lancer les démos officielles. J'espère qu'elle vous plaira.",
        "temp": 0.8,
    }
]

# ================= 4. Boucle de génération =================
all_audio_parts = []
final_sr = None  # Taux d'échantillonnage

print("Démarrage de la génération audio...")

for i, seg in enumerate(segments):
    print(f"[{i+1}/{len(segments)}] Génération du segment {seg['lang']}...")

    # Essayer d'utiliser le paramètre 'speed' si le modèle le supporte
    try:
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
            speed=0.85,  # 0.85 = 85% de la vitesse (plus lent)
        )
    except TypeError:
        # Si le paramètre 'speed' provoque une erreur, on le retire et on se base uniquement sur la ponctuation
        print(f"  (Note : paramètre speed non supporté, vitesse standard utilisée pour {seg['lang']})")
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
        )

    # Traitement des données audio
    audio_data = wavs[0]
    if isinstance(audio_data, torch.Tensor):
        audio_data = audio_data.cpu().numpy()

    all_audio_parts.append(audio_data)
    if final_sr is None: final_sr = sr

# ================= 5. Fusion des audio =================
print("Fusion de tous les segments...")

# Créer un silence entre les langues
# Durée de 0.3 seconde (ajustable selon vos besoins)
silence_duration = 0.3
silence_samples = int(silence_duration * final_sr)
silence_data = np.zeros(silence_samples, dtype=np.float32)

final_sequence = []
for part in all_audio_parts:
    final_sequence.append(part)
    final_sequence.append(silence_data)  # Ajouter un silence après chaque segment

# Retirer le tout dernier bloc de silence (superflu)
if final_sequence:
    final_sequence.pop()

full_audio = np.concatenate(final_sequence)

# ================= 6. Sauvegarde du résultat =================
final_path = os.path.join(OUT_DIR, "Final_Slow_Mix.wav")
sf.write(final_path, full_audio, final_sr)

print("="*30)
print(f"Terminé ! Audio sauvegardé dans :\n{final_path}")
print("="*30)
```

------

## 🛠️ Tableau de dépannage rapide

| Symptôme                         | Cause                                     | Solution                                                                  |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `sox: command not found`         | Dépendance système manquante              | Exécuter le `brew install` de la première étape                           |
| `SafetensorError`                | Téléchargement du modèle interrompu/fichier corrompu | Supprimer `~/.cache/huggingface/hub/Qwen` et retélécharger               |
| Crash avec erreur `torch.cuda`   | Utilisation d'une commande exclusive NVIDIA | Vérifier que la modification B de l'étape 3 a été appliquée              |
| Téléchargement lent / timeout    | Accès réseau à HuggingFace limité         | Configurer un miroir et réessayer                                         |
| Erreur de pilote inexplicable    | Problème intermittent avec Apple Silicon  | **Redémarrez l'ordinateur**, ça résout 90% des problèmes bizarres        |

------
