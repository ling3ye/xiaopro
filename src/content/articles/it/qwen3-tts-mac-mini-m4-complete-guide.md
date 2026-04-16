---
title: "Guida completa per far girare Qwen3-TTS su Mac Mini M4 | Da zero, in 5 passaggi"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS è l'ultimo modello di sintesi vocale di Alibaba, ma quello ufficiale è pensato di default per schede grafiche NVIDIA. Questa guida ti accompagna passo-passo nell'esecuzione su Mac Mini M4 — dall'installazione delle dipendenze di sistema e la configurazione dell'ambiente Python, fino alla modifica del codice per adattarlo alla GPU Apple (MPS), con istruzioni dettagliate per ogni passaggio. Ideale per utenti Mac, principianti dell'AI e sviluppatori che vogliono cimentarsi con i modelli TTS."
image: "https://img.lingflux.com/2026/03/2a456838c50928eb67a807431e65c2a3.png"
tags: ["qwen3 tts", "qwen3 tts mac", "qwen tts guide", "configurazione Qwen3-TTS Mac", "chip Qwen3-TTS M4", "sintesi vocale Qwen"]
---

# Guida completa per far girare Qwen3-TTS su Mac Mini M4

> **Per chi è questa guida?** Se hai un Mac Mini M4 e sai aprire il Terminale, questa guida è pensata per te. Non serve alcuna esperienza pregressa nell'AI, basta seguire i passaggi!

> 📝 **Questo articolo è basato su test diretti dell'autore su Mac Mini M4, tutti i passaggi sono stati verificati come funzionanti.**

------

## 📋 Prima di iniziare, leggi qui

**Qwen3-TTS** è l'ultimo modello text-to-speech rilasciato da Alibaba, con risultati davvero notevoli. È progettato di default per schede grafiche NVIDIA, quindi per farlo girare su Mac servono alcune piccole modifiche.

La buona notizia: **le modifiche sono poche, e in questa guida ho già sbattuto la testa al posto tuo** 🎉

L'intero processo si divide in 5 passaggi e richiede circa 15-30 minuti (gran parte del tempo è per il download del modello).

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XG7krJlY-jY?si=X-F1_WwBnldVCeiK" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

------

## Passo 1: installare le dipendenze di sistema

Il Mac di serie manca di alcuni strumenti per l'elaborazione audio, provvediamo con Homebrew.

Apri il Terminale e incolla questo comando:

```bash
brew install portaudio ffmpeg sox
```

> ⚠️ **Se salti questo passaggio**, in fase di esecuzione otterrai l'errore `/bin/sh: sox: command not found`. Potrai sempre tornare a installarli dopo, ma meglio farlo subito e togliersi il pensiero.

------

## Passo 2: creare l'ambiente Python

Scegli una cartella per il tuo progetto, poi usa **Conda** per creare un ambiente Python 3.12 pulito, così da evitare conflitti con altri progetti già presenti nel sistema.

```bash
# Crea e attiva l'ambiente (da fare solo una volta)
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts

# Installa la libreria principale
pip install -U qwen-tts

# Clona il repository ufficiale
git clone https://github.com/QwenLM/Qwen3-TTS.git
cd Qwen3-TTS
pip install -e .
```

> 💡 **Cos'è un ambiente Conda?** Puoi pensarla come una «stanza tutta per sé»: tutte le dipendenze di questo progetto vengono installate lì dentro, senza impattare sugli altri programmi del tuo computer.

------

## Passo 3: modificare il codice per adattarlo al chip M4 ⭐ (punto chiave!)

I passaggi precedenti sono identici a quelli su GitHub, ma se hai un Mac con chip Apple Silicon da qui in poi le cose cambiano un po'.

È qui che gli utenti Mac inciampano più spesso. Lo script ufficiale usa di default la scheda NVIDIA; noi dobbiamo apportare due modifiche per farlo usare la GPU Apple (MPS).

Apri il file `examples/test_model_12hz_base.py`, trova all'incirca la riga 50, e fai le due modifiche seguenti:

### Modifica A: specificare il dispositivo MPS

```python
# ❌ Codice originale (pensato per NVIDIA)
# tts = Qwen3TTSModel.from_pretrained(..., attn_implementation="flash_attention_2")

# ✅ Modifica così (adattato per Mac M4)
tts = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",   # Attenzione: rimuovi la barra finale /
    torch_dtype=torch.bfloat16,          # M4 supporta pienamente bfloat16, buon compromesso tra precisione e velocità
    attn_implementation="sdpa",          # Meccanismo di attenzione compatibile con Mac, in sostituzione di flash_attention_2
    device_map="mps",                    # Forza l'uso della GPU Apple
)
```

### Modifica B: adattare l'istruzione di sincronizzazione per MPS

```python
# ❌ Codice originale (solo per NVIDIA, su Mac va in crash diretto)
# torch.cuda.synchronize()

# ✅ Modifica così (rileva automaticamente il tipo di GPU)
if torch.cuda.is_available():
    torch.cuda.synchronize()
elif torch.backends.mps.is_available():
    torch.mps.synchronize()   # Istruzione corretta specifica per Mac
```

> 🔧 **Perché queste due modifiche?** Il chip M4 usa il framework Metal di Apple (MPS), che è un sistema completamente diverso dal CUDA di NVIDIA. La prima modifica dice al modello «usa la GPU Apple», la seconda fa in modo che anche l'istruzione di sincronizzazione usi la corretta versione Apple.

------

## Passo 4: scaricare il modello ed eseguirlo

Il file del modello pesa circa **4 GB**, assicurati che la connessione sia stabile.

```bash
cd examples
python test_model_12hz_base.py
```

### 🐢 Download troppo lento? Prova con il mirror

```bash
export HF_ENDPOINT=https://hf-mirror.com
python test_model_12hz_base.py
```

### Se compare l'errore ❌ `SafetensorError`?

Significa che il download precedente si è interrotto e il file si è corrotto. La soluzione è semplice:

1. Apri il Finder, vai su `~/.cache/huggingface/hub`
2. Elimina la cartella `Qwen`
3. Esegui di nuovo lo script per far partire il download da capo

------

## Passo 5: verificare che la GPU stia lavorando

Prima dell'esecuzione puoi fare un rapido controllo per verificare che la GPU del M4 sia stata riconosciuta correttamente:

```python
import torch
print(torch.backends.mps.is_available())  # Se stampa True, il gioco è fatto ✅
```

------

## 🎉 Fatto!

Se tutto è andato per il verso giusto, dopo l'esecuzione dello script troverai una nuova cartella nella directory `examples/`, con all'interno i file audio generati.

------

## 📎 Codice di riferimento completo

Il codice seguente include già tutte le modifiche per la compatibilità Mac, più l'output **multi-lingua con combinazione** e il controllo della velocità del parlato. Puoi salvarlo direttamente come file `.py`:

```python
import os
import torch
import soundfile as sf
import numpy as np
# Ensure 'qwen_tts' is installed/present in the environment
# Assicurati che 'qwen_tts' sia installato o presente nell'ambiente
from qwen_tts import Qwen3TTSModel

# ================= 1. Initialization (Setup) / Impostazioni di inizializzazione =================

# Auto-detect the hardware.
# Rilevamento automatico dell'hardware.
# "mps" = Mac (Apple Silicon), "cuda" = NVIDIA GPU, "cpu" = Standard Processor
if torch.backends.mps.is_available():
    device = "mps"   # Mac M1/M2/M3/M4...
elif torch.cuda.is_available():
    device = "cuda"  # NVIDIA GPU / Scheda NVIDIA
else:
    device = "cpu"   # Standard CPU / Processore standard

print(f"Using device / Dispositivo in uso: {device}")

# Define where to save the results
# Definisci il percorso di salvataggio dei risultati
OUT_DIR = "qwen3_slow_output"
os.makedirs(OUT_DIR, exist_ok=True)

print("Loading model... (This might take a minute)")
print("Caricamento del modello... (potrebbe volerci un minuto)")

# Loading the model from Hugging Face
# Caricamento del modello da Hugging Face
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    torch_dtype=torch.bfloat16,
    attn_implementation="sdpa",
    device_map=device,
)
print("Model loaded successfully! / Modello caricato con successo!")

# ================= 2. Reference Audio Settings / Impostazioni audio di riferimento =================
# This is the voice the model will mimic (clone).
# Questa è la voce che il modello imiterà (clonerà).

# Option A: Use a URL (Official Qwen Example)
# Opzione A: Usa un URL (esempio ufficiale Qwen)
ref_audio_url = "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-TTS-Repo/clone_2.wav"

# Option B: Use a local file (Uncomment the line below to use your own file)
# Opzione B: Usa un file locale (decommenta la riga sotto per usare il tuo file)
# ref_audio_url = "./my_voice.wav"

# CRITICAL: This text MUST match what is said in the reference audio exactly.
# If this is wrong, the quality will be bad.
# FONDAMENTALE: Questo testo DEVE corrispondere esattamente a ciò che viene detto nell'audio di riferimento.
# Se il testo è sbagliato, la qualità ne risentirà.
ref_text_content = "Okay. Yeah. I resent you. I love you. I respect you. But you know what? You blew it! And thanks to you."

# ================= 3. Content to Generate / Contenuto da generare =================
# Tip: To make the speech slower and clearer, we add punctuation (like , . ...)
# This forces the model to pause between words.
# Suggerimento: Per rendere il parlato più lento e chiaro, aggiungiamo punteggiatura (come , . ...)
# Questo costringe il modello a fare pause tra le parole.

segments = [
    {
        "lang": "Chinese",
        # Original: 大家好...
        # Trick: Added commas to slow it down.
        # Trucco: Aggiunte virgole per rallentare.
        "text": "大家好，这个视频是，分享如何在Mac Mini上，部署Qwen.3-TTS，运行官方例子程序，希望你们喜欢。", 
        "temp": 0.7, 
    },
    {
        "lang": "English",
        # Original: This video is about...
        # Trick: Added "..." and extra commas for a relaxed pace.
        # Trucco: Aggiunti "..." e virgole extra per un ritmo più rilassato.
        "text": "Hello everyone! In this video, I'll share how to deploy Qwen.3-TTS on a Mac Mini and run the official demos. I hope you enjoy it.", 
        "temp": 0.7,
    },
    {
        "lang": "Japanese",
        # Trick: Added extra Japanese commas (、)
        # Trucco: Aggiunte virgole giapponesi extra (、)
        "text": "皆さん、こんにちは。この動画では、Mac MiniでQwen.3-TTSを導入し、公式デモを動かす方法をシェアします。気に入っていただけると嬉しいです。", 
        "temp": 0.7,
    },
    {
        "lang": "Korean",
        # Trick: Added breaks between concepts.
        # Trucco: Aggiunte pause tra i concetti.
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

# ================= 4. Generation Loop / Ciclo di generazione =================
all_audio_parts = []
final_sr = None # Sample rate / Frequenza di campionamento

print("Starting audio generation... / Avvio generazione audio...")

for i, seg in enumerate(segments):
    print(f"[{i+1}/{len(segments)}] Generating {seg['lang']} segment... / Generazione del segmento {seg['lang']}...")

    # Try to use the 'speed' parameter if the model supports it
    # Prova a usare il parametro 'speed' se il modello lo supporta
    try:
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
            speed=0.85,  # 0.85 = 85% speed (Slower) / 0.85x (più lento)
        )
    except TypeError:
        # If 'speed' causes an error, remove it and just use the text tricks
        # Se il parametro 'speed' dà errore, lo rimuoviamo e ci affidiamo solo alla punteggiatura
        print(f"  (Note: Speed parameter not supported, using standard speed for {seg['lang']})")
        print(f"  (Nota: parametro Speed non supportato, {seg['lang']} userà velocità standard)")
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
        )

    # Process the audio data / Elaborazione dei dati audio
    audio_data = wavs[0]
    if isinstance(audio_data, torch.Tensor):
        audio_data = audio_data.cpu().numpy()

    all_audio_parts.append(audio_data)
    if final_sr is None: final_sr = sr

# ================= 5. Merging Audio / Unione dell'audio =================
print("Merging all segments... / Unione di tutti i segmenti...")

# Create a silence gap between languages
# Changed from 0.3s to 0.8s for a better listening experience
# Crea un intervallo di silenzio tra le lingue
# Impostato a 0.3 secondi per un'esperienza d'ascolto migliore (puoi regolarlo a piacimento)
silence_duration = 0.3
silence_samples = int(silence_duration * final_sr)
silence_data = np.zeros(silence_samples, dtype=np.float32)

final_sequence = []
for part in all_audio_parts:
    final_sequence.append(part)
    final_sequence.append(silence_data) # Add silence after each part / Aggiungi silenzio dopo ogni parte

# Remove the very last silence block
# Rimuovi l'ultimo blocco di silenzio in eccesso
if final_sequence:
    final_sequence.pop()

full_audio = np.concatenate(final_sequence)

# ================= 6. Save Output / Salvataggio dell'output =================
final_path = os.path.join(OUT_DIR, "Final_Slow_Mix.wav")
sf.write(final_path, full_audio, final_sr)

print("="*30)
print(f"Done! Audio saved to: / Fatto! Audio salvato in:\n{final_path}")
print("="*30)
```

------

## 🛠️ Risoluzione rapida dei problemi comuni

| Sintomo | Causa | Soluzione |
| ------- | ----- | --------- |
| `sox: command not found` | Dipendenze di sistema mancanti | Esegui il `brew install` del Passo 1 |
| `SafetensorError` | Download del modello interrotto, file corrotto | Elimina `~/.cache/huggingface/hub/Qwen` e riscarica |
| Crash con errore `torch.cuda` | Usate istruzioni esclusive per NVIDIA | Verifica di aver apportato la Modifica B del Passo 3 |
| Download lento / timeout | Accesso a HuggingFace limitato dalla rete | Imposta il mirror e riprova |
| Strani errori dei driver | Problema sporadico dei driver Apple Silicon | **Riavvia il Mac**, risolve il 90% dei problemi strani |

------
