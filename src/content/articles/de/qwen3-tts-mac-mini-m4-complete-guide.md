---
title: "Qwen3-TTS auf dem Mac Mini M4: Vollstandige Anleitung | Von null an, in 5 Schritten erledigt"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS ist das neueste Text-to-Speech-Modell von Alibaba, aber standardmassig ist es fur NVIDIA-Grafikkarten konzipiert. Diese Anleitung zeigt dir Schritt fur Schritt, wie du es auf einem Mac Mini M4 erfolgreich zum Laufen bringst — von der Installation der Systemabhangigkeiten uber die Python-Umgebung bis hin zur Code-Anpassung fur Apple GPU (MPS). Fur Mac-Nutzer, KI-Einsteiger und Entwickler, die TTS-Modelle ausprobieren mochten."
image: "https://img.lingflux.com/2026/03/2a456838c50928eb67a807431e65c2a3.png"
tags: ["qwen3 tts", "qwen3 tts mac", "qwen tts guide", "Qwen3-TTS Mac Einrichtung", "Qwen3-TTS M4 Chip", "Qwen Text-to-Speech"]
---

# Qwen3-TTS auf dem Mac Mini M4: Vollstandige Anleitung

> **Fur wen ist das?** Wenn du einen Mac Mini M4 hast und das Terminal offnen kannst, ist dieser Artikel fur dich. Kein KI-Hintergrund notig — einfach mitmachen!

> 📝 **Dieser Artikel basiert auf den tatsachlichen Tests des Autors auf einem Mac Mini M4. Alle Schritte sind verifiziert und funktionieren.**

------

## 📋 Bevor du loslegst, lies das hier

**Qwen3-TTS** ist das neueste Text-to-Speech-Modell von Alibaba mit wirklich beeindruckenden Ergebnissen. Es ist aber standardmassig fur NVIDIA-Grafikkarten geschrieben — auf dem Mac braucht es ein paar kleine Anpassungen.

Die gute Nachricht: **Es sind nicht viele Änderungen, und dieser Artikel hat die Fallstricke bereits fur dich ubernommen** 🎉

Der gesamte Prozess besteht aus 5 Schritten und dauert etwa 15 bis 30 Minuten (ein Grossteil der Zeit geht fur den Modelldownload drauf).

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XG7krJlY-jY?si=X-F1_WwBnldVCeiK" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

------

## Schritt 1: Systemabhangigkeiten installieren

Dem Mac fehlen ein paar Audio-Verarbeitungstools. Die holst du mit Homebrew nach.

Terminal offnen und folgenden Befehl einfugen:

```bash
brew install portaudio ffmpeg sox
```

> ⚠️ **Wenn du diesen Schritt uberspringst**, bekommst du spater den Fehler `/bin/sh: sox: command not found`. Dann kannst du immer noch hierher zuruckkehren und nachinstallieren — aber besser gleich richtig machen.

------

## Schritt 2: Python-Umgebung erstellen

Ein Projektverzeichnis aussuchen und dann mit **Conda** eine saubere Python-3.12-Umgebung anlegen, damit sich nichts mit anderen Projekten auf deinem Rechner in die Quere kommt.

```bash
# Umgebung erstellen und aktivieren (einmalig)
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts

# Kern-Bibliotheken installieren
pip install -U qwen-tts

# Offizielles Repository klonen
git clone https://github.com/QwenLM/Qwen3-TTS.git
cd Qwen3-TTS
pip install -e .
```

> 💡 **Was ist eine Conda-Umgebung?** Stell es dir als «isolieres Zimmerchen» vor — alle Abhangigkeiten dieses Projekts werden darin installiert, ohne andere Programme auf deinem Computer zu beeinflussen.

------

## Schritt 3: Code an M4-Chip anpassen ⭐ (Wichtig!)

Die bisherigen Schritte sind identisch mit der Github-Anleitung. Aber wenn du einen Mac mit M-Serie-Chip hast, wird es ab hier etwas anders.

Hier stolpern Mac-Nutzer am häufigsten. Die offiziellen Skripte sind standardmassig fur NVIDIA-Grafikkarten. Wir mussen zwei Stellen andern, damit stattdessen die Apple GPU (MPS) verwendet wird.

Die Datei `examples/test_model_12hz_base.py` offnen, ungefahr Zeile 50 suchen und die folgenden zwei Änderungen vornehmen:

### Änderung A: MPS als Gerat festlegen

```python
# ❌ Ursprüngliche Schreibweise (fur NVIDIA konzipiert)
# tts = Qwen3TTSModel.from_pretrained(..., attn_implementation="flash_attention_2")

# ✅ So andern (fur Mac M4 angepasst)
tts = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",   # Achtung: den Schragstrich / am Ende entfernen
    torch_dtype=torch.bfloat16,          # M4 unterstutzt bfloat16 vollstandig, guter Kompromiss aus Genauigkeit und Geschwindigkeit
    attn_implementation="sdpa",          # Mac-kompatibler Aufmerksamkeitsmechanismus, Alternative zu flash_attention_2
    device_map="mps",                    # Apple GPU erzwingen
)
```

### Änderung B: Synchronisationsbefehl an MPS anpassen

```python
# ❌ Ursprüngliche Schreibweise (nur NVIDIA, auf dem Mac stürzt es direkt ab)
# torch.cuda.synchronize()

# ✅ So andern (automatisch erkennen, welche GPU verwendet wird)
if torch.cuda.is_available():
    torch.cuda.synchronize()
elif torch.backends.mps.is_available():
    torch.mps.synchronize()   # Korrekter Befehl speziell fur Mac
```

> 🔧 **Warum diese zwei Änderungen?** Der M4-Chip verwendet Apples eigenes Metal-Framework (MPS), eine ganz andere Architektur als NVIDIAs CUDA. Die erste Änderung teilt dem Modell mit, die Apple GPU zu nutzen; die zweite sorgt dafur, dass auch der Synchronisations-Wartebefehl die korrekte Apple-Version verwendet.

------

## Schritt 4: Modell herunterladen und ausfuhren

Die Modelldatei ist etwa **4 GB** gross — sicherstellen, dass die Verbindung stabil ist.

```bash
cd examples
python test_model_12hz_base.py
```

### 🐢 Download zu langsam? Spiegel-Server probieren

```bash
export HF_ENDPOINT=https://hf-mirror.com
python test_model_12hz_base.py
```

### Wenn ❌ der Fehler `SafetensorError` auftritt?

Das bedeutet, dass der vorherige Download abgebrochen wurde und die Datei beschedigt ist. Losung:

1. Finder offnen, zu `~/.cache/huggingface/hub` navigieren
2. Den Ordner `Qwen` loschen
3. Das Skript erneut ausfuhren, damit es neu herunterludt

------

## Schritt 5: Prufen, ob die GPU arbeitet

Vor dem Start kurz bestatigen, dass die M4-GPU korrekt erkannt wird:

```python
import torch
print(torch.backends.mps.is_available())  # True ausgeben heisst: Geschafft ✅
```

------

## 🎉 Geschafft!

Wenn alles geklappt hat, erzeugt das Skript nach dem Durchlauf einen neuen Ordner im Verzeichnis `examples/` mit den generierten Audiodateien.

------

## 📎 Vollstandiger Referenzcode

Der folgende Code enthalt bereits alle Mac-Anpassungen sowie Funktionen fur **mehrsprachige kombinierte Ausgabe** und **Sprechgeschwindigkeits-Steuerung**. Kann direkt als `.py`-Datei gespeichert und verwendet werden:

```python
import os
import torch
import soundfile as sf
import numpy as np
# Ensure 'qwen_tts' is installed/present in the environment
# Sicherstellen, dass 'qwen_tts' installiert ist oder im aktuellen Verzeichnis liegt
from qwen_tts import Qwen3TTSModel

# ================= 1. Initialization (Setup) / Initialisierung =================

# Auto-detect the hardware.
# Hardware automatisch erkennen.
# "mps" = Mac (Apple Silicon), "cuda" = NVIDIA GPU, "cpu" = Standard-Prozessor
if torch.backends.mps.is_available():
    device = "mps"   # Mac M1/M2/M3/M4...
elif torch.cuda.is_available():
    device = "cuda"  # NVIDIA GPU
else:
    device = "cpu"   # Standard-Prozessor

print(f"Using device / Verwendetes Gerat: {device}")

# Define where to save the results
# Speicherpfad fur Ergebnisse definieren
OUT_DIR = "qwen3_slow_output"
os.makedirs(OUT_DIR, exist_ok=True)

print("Loading model... (This might take a minute)")
print("Modell wird geladen... (Das kann eine Minute dauern)")

# Loading the model from Hugging Face
# Modell von Hugging Face laden
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    torch_dtype=torch.bfloat16,
    attn_implementation="sdpa",
    device_map=device,
)
print("Model loaded successfully! / Modell erfolgreich geladen!")

# ================= 2. Reference Audio Settings / Referenz-Audio-Einstellungen =================
# This is the voice the model will mimic (clone).
# Dies ist die Stimme, die das Modell imitieren (klonen) wird.

# Option A: Use a URL (Official Qwen Example)
# Option A: Eine URL verwenden (Offizielles Qwen-Beispiel)
ref_audio_url = "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-TTS-Repo/clone_2.wav"

# Option B: Use a local file (Uncomment the line below to use your own file)
# Option B: Eine lokale Datei verwenden (Kommentar in der nachsten Zeile entfernen, um eigene Datei zu nutzen)
# ref_audio_url = "./my_voice.wav"

# CRITICAL: This text MUST match what is said in the reference audio exactly.
# If this is wrong, the quality will be bad.
# WICHTIG: Dieser Text MUSS exakt dem gesprochenen Inhalt des Referenz-Audios entsprechen.
# Wenn der Text nicht ubereinstimmt, leidet die Qualitat.
ref_text_content = "Okay. Yeah. I resent you. I love you. I respect you. But you know what? You blew it! And thanks to you."

# ================= 3. Content to Generate / Zu generierende Inhalte =================
# Tip: To make the speech slower and clearer, we add punctuation (like , . ...)
# This forces the model to pause between words.
# Tipp: Um das Sprechtempo langsamer und klarer zu machen, fugen wir Satzzeichen hinzu (wie , . ...)
# Dadurch wird das Modell gezwungen, zwischen den Wortern zu pausieren.

segments = [
    {
        "lang": "Chinese",
        # Original: 大家好...
        # Trick: Added commas to slow it down.
        # Trick: Kommas hinzufugen, um das Tempo zu verlangsamen.
        "text": "大家好，这个视频是，分享如何在Mac Mini上，部署Qwen.3-TTS，运行官方例子程序，希望你们喜欢。", 
        "temp": 0.7, 
    },
    {
        "lang": "English",
        # Original: This video is about...
        # Trick: Added "..." and extra commas for a relaxed pace.
        # Trick: "..." und zusatzliche Kommas fur ein entspannteres Tempo.
        "text": "Hello everyone! In this video, I'll share how to deploy Qwen.3-TTS on a Mac Mini and run the official demos. I hope you enjoy it.", 
        "temp": 0.7,
    },
    {
        "lang": "Japanese",
        # Trick: Added extra Japanese commas (、)
        # Trick: Zusatzliche japanische Kommas hinzufugen (、)
        "text": "皆さん、こんにちは。この動画では、Mac MiniでQwen.3-TTSを導入し、公式デモを動かす方法をシェアします。気に入っていただけると嬉しいです。", 
        "temp": 0.7,
    },
    {
        "lang": "Korean",
        # Trick: Added breaks between concepts.
        # Trick: Pausen zwischen Konzepten einfugen.
        "text": "안녕하세요 여러분. 이번 영상에서는 맥 미니(Mac Mini)에 Qwen.3-TTS를 구축하고, 공식 예제를 실행하는 방법을 공유해 드리겠습니다. 유익한 시간이 되시길 바랍니다.", 
        "temp": 0.7,
    },
    {
        "lang": "German",
        "text": "Hallo zusammen! In diesem Video zeige ich euch, wie man Qwen.3-TTS auf einem Mac Mini deployt und die offiziellen Demos ausfuhrt. Ich hoffe, es gefallt euch.", 
        "temp": 0.6,
    },
    {
        "lang": "French",
        "text": "Bonjour à tous ! Dans cette vidéo, je vais partager comment déployer Qwen.3-TTS sur un Mac Mini et lancer les démos officielles. J'espère qu'elle vous plaira.", 
        "temp": 0.8,
    }
]

# ================= 4. Generation Loop / Generierungsschleife =================
all_audio_parts = []
final_sr = None # Sample rate / Abtastrate

print("Starting audio generation... / Audiogenerierung wird gestartet...")

for i, seg in enumerate(segments):
    print(f"[{i+1}/{len(segments)}] Generating {seg['lang']} segment... / Generiere {seg['lang']}-Segment...")

    # Try to use the 'speed' parameter if the model supports it
    # Versuchen, den Parameter 'speed' zu verwenden (falls vom Modell unterstutzt)
    try:
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
            speed=0.85,  # 0.85 = 85% Geschwindigkeit (langsamer) / 0.85-fache Geschwindigkeit
        )
    except TypeError:
        # If 'speed' causes an error, remove it and just use the text tricks
        # Wenn 'speed' einen Fehler verursacht, entfernen und nur die Text-Tricks nutzen
        print(f"  (Note: Speed parameter not supported, using standard speed for {seg['lang']})")
        print(f"  (Hinweis: Speed-Parameter nicht unterstutzt, {seg['lang']} wird mit Standardgeschwindigkeit generiert)")
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
        )

    # Process the audio data / Audiodaten verarbeiten
    audio_data = wavs[0]
    if isinstance(audio_data, torch.Tensor):
        audio_data = audio_data.cpu().numpy()

    all_audio_parts.append(audio_data)
    if final_sr is None: final_sr = sr

# ================= 5. Merging Audio / Audios zusammenfugen =================
print("Merging all segments... / Alle Segmente werden zusammengefugt...")

# Create a silence gap between languages
# Changed from 0.3s to 0.8s for a better listening experience
# Stille zwischen den Sprachen einfugen
# Fur bessere Horqualitat auf 0.3 Sekunden gesetzt (kann angepasst werden)
silence_duration = 0.3
silence_samples = int(silence_duration * final_sr)
silence_data = np.zeros(silence_samples, dtype=np.float32)

final_sequence = []
for part in all_audio_parts:
    final_sequence.append(part)
    final_sequence.append(silence_data) # Add silence after each part / Nach jedem Teil Stille hinzufugen

# Remove the very last silence block
# Letzte Stille am Ende entfernen
if final_sequence:
    final_sequence.pop()

full_audio = np.concatenate(final_sequence)

# ================= 6. Save Output / Ausgabe speichern =================
final_path = os.path.join(OUT_DIR, "Final_Slow_Mix.wav")
sf.write(final_path, full_audio, final_sr)

print("="*30)
print(f"Done! Audio saved to: / Fertig! Audio gespeichert unter:\n{final_path}")
print("="*30)
```

------

## 🛠️ Schnelle Hilfe bei häufigen Problemen

| Symptom | Ursache | Losung |
| ------------------------ | -------------------------- | --------------------------------------------- |
| `sox: command not found` | Systemabhangigkeiten fehlen | Schritt 1 ausfuhren (`brew install`) |
| `SafetensorError` | Modelldownload abgebrochen, Datei beschedigt | `~/.cache/huggingface/hub/Qwen` loschen und neu herunterladen |
| `torch.cuda`-Absturz | NVIDIA-exklusiver Befehl verwendet | Prufen, ob Änderung B aus Schritt 3 vorgenommen wurde |
| Download sehr langsam / Timeout | Eingeschrankter Zugriff auf HuggingFace | Spiegel-Server setzen und erneut versuchen |
| Kryptische Treiber-Fehler | Gelegentliches Apple-Silicon-Treiber-Problem | **Mac neu starten** — lost 90 % der seltsamen Probleme |

------
