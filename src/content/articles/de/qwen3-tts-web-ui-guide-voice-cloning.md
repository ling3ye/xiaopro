---
title: "Qwen3-TTS Web UI lokal starten: Vollstandiges Handbuch | Stimmen klonen ganz ohne Code"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS bringt eine eigene Weboberflache mit — einfach eine Sprachaufnahme hochladen und die Stimme wird geklont, komplett ohne Programmierung. Diese Anleitung unterstutzt Mac (M-Serie-Chips) und Windows (NVIDIA-Grafikkarten)."
image: "https://img.lingflux.com/2026/03/2d1950de23bc0838bd604e391f15a92d.png"
tags: ["qwen3 tts", "qwen tts web ui", "qwen voice clone", "Qwen3-TTS Weboberflache", "Qwen Stimmenklon", "Qwen TTS Tutorial"]
---

# Qwen3-TTS Web UI lokal starten: Vollstandiges Handbuch — Stimmen klonen ganz ohne Code

Das neue Qwen3-TTS von Alibaba hat es wirklich in sich — eine Sprachaufnahme von dir hochladen, und es «lernt», wie du sprichst. Oder du beschreibst per Text eine «tiefe, magnetische Mannerstimme», und es generiert sie dir. Das Beste: Es bringt eine eigene Weboberflache mit. Browser auf, ein paar Klicks, fertig — keine Zeile Code anfassen.

> Dieses Handbuch basiert auf meinen eigenen Tests auf einem **Mac mini M4 (M-Serie)**. Alle Fallstricke sind fur dich markiert.

------

## Zuerst klaren, welche Konfiguration du hast



Lokale Installationsanleitung:

https://lingflux.com/zh-cn/articles/ai/qwen3-tts-mac-mini-m4-complete-guide/



Nicht gleich Befehle kopieren — zuerst prufen, welche Hardware du hast und welchen Weg du gehen musst:

| Dein Computer | Der richtige Weg |
| ----------------------- | ------------------------------- |
| Mac, M1/M2/M3/M4 Chip | Mit `mps`-Beschleunigung, den Mac-Weg gehen |
| Windows, mit NVIDIA-Grafikkarte | Mit `cuda`-Beschleunigung, den Windows-Weg gehen |
| Keine dedizierte Grafikkarte, nur CPU | Lauft auch, aber langsam — einen Tee kochen und warten |

------

## Drei Modi — such dir einen aus

Beim Start wählst du ein anderes Modell, und schon bist du in einem anderen Modus. Kurz gesagt:

**Stimmenklon** → Eigene Sprachaufnahme hochladen, es lernt deine Stimme
 Modellname: `Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**Voreingestellte Stimmen** → Aus eingebauten Stimmen wahlen, plus Anweisungen wie «Sprich mit traurigem Ton»
 Modellname: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`

**Individuelle Stimmdesign** → Per Text beschreiben, wie die Stimme klingen soll, und es generiert sie
 Modellname: `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

Die folgenden Befehle verwenden das **Base-Modell (Stimmenklon)** als Beispiel. Zum Wechseln einfach den Modellnamen austauschen.

------

## Schritt 1: Die Oberflache starten

### Mac (M-Serie-Chips)

Terminal offnen und diesen Befehl einfugen:

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device mps \
  --dtype bfloat16 \
  --no-flash-attn
```

**Was die drei Parameter bedeuten:**

- `--device mps`: Die Apple-Chip-GPU nutzen, deutlich schneller als reine CPU. Wenn dein Mac kein M-Serie-Modell ist, hier `cpu` eintragen
- `--dtype bfloat16`: Das Zahlenformat des Modells — von der M-Serie gut unterstutzt, einfach ubernehmen
- `--no-flash-attn`: **Darf nicht fehlen!** Mac unterstutzt FlashAttention nicht — ohne diesen Parameter stürzt es beim Start ab

------

### Windows (NVIDIA-Grafikkarte)

Eingabeaufforderung (CMD) offnen und einfugen:

```cmd
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base ^
  --device cuda:0 ^
  --dtype bfloat16 ^
  --flash-attn
```

**Parameter-Erklarung:**

- `--device cuda:0`: Die erste NVIDIA-Grafikkarte verwenden (normalerweise gibt es nur eine, `0` reicht)
- `--dtype bfloat16`: Ab RTX-30-Serie unterstutzt, empfohlen
- `--flash-attn`: Unter Windows + CUDA kann diese Beschleunigung aktiviert werden — deutlich schneller

> Kleiner Hinweis: In Windows-Befehlen wird fur Zeilenumbruche `^` (CMD) oder ein Backtick (PowerShell) verwendet, nicht `\` wie auf dem Mac — nicht verwechseln.

------

### Keine Grafikkarte, nur CPU?

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device cpu \
  --dtype float32
```

Lauft, aber langsam. Einen kurzen Text zu generieren kann mehrere Minuten dauern — darauf gefasst sein.

------

## Schritt 2: Browser offnen

Nachdem der Befehl gestartet wurde, erscheint im Terminal eine Zeile wie diese:

```
Running on local URL: http://0.0.0.0:8000
```

Im Browser **http://localhost:8000** aufrufen — die Oberflache erscheint, der Rest ist Klicken.

Von einem Handy oder einem anderen Gerat im lokalen Netzwerk aus nutzen? `localhost` durch die IP-Adresse dieses Computers ersetzen.
 IP herausfinden: Mac: `ifconfig | grep "inet "`, Windows: `ipconfig`.

------

## Fehlermeldung? Keine Panik — hier nachschlagen

**Mac: FlashAttention-Fehler beim Start**
 Wahrscheinlich wurde `--no-flash-attn` vergessen — erganzen und neu starten.

------

**Windows: CUDA nicht verfugbar**
 Zuerst mit diesem Befehl prufen:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

`True` bedeutet alles OK; `False` heisst, die falsche PyTorch-Version ist installiert. Neu installieren mit CUDA-Unterstützung:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

`cu121` entspricht CUDA 12.1 — an die eigene CUDA-Version anpassen. CUDA 11.8? Dann `cu118` verwenden.

------

**Grafikspeicher voll, OOM-Fehler (Out of Memory)**
 `--dtype bfloat16` durch `--dtype float16` ersetzen — etwas weniger Praezision, aber spart Grafikspeicher.

------

**Modelldownload langsam oder fehlgeschlagen (in China)**
 Vor dem Befehl den Spiegel-Server setzen:

Mac / Linux:

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Windows:

```cmd
set HF_ENDPOINT=https://hf-mirror.com
```

------

## Lieber nicht lokal installieren? Erst online ausprobieren

Die Installation von Modell und Umgebung kann etwas muhsam sein. Auf der offiziellen Online-Demo-Seite kann man erst ein paar Minuten herumspielen und schauen, ob es einem wirklich zusagt, bevor man sich an die lokale Installation macht:

- Hugging Face: https://huggingface.co/spaces/Qwen/Qwen3-TTS
- ModelScope (schneller aus China): https://modelscope.cn/studios/Qwen/Qwen3-TTS

------

Hängst du an einem Schritt fest? Die Fehlermeldung aus dem Terminal komplett kopieren und in eine Suchmaschine oder eine KI werfen — meistens ist das Problem in wenigen Minuten gelost.
