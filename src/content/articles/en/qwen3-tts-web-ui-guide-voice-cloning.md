---
title: "Run Qwen3-TTS Web UI Locally: Complete Guide for Voice Cloning Without Coding"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS comes with a built-in web interface—upload a recording to clone voices without writing any code. This guide covers Mac (M-series chips) and Windows (NVIDIA GPU) setups."
image: "https://img.lingflux.com/2026/03/2d1950de23bc0838bd604e391f15a92d.png"
tags: ["qwen3 tts", "qwen tts web ui", "qwen voice clone", "Qwen3-TTS Web Interface", "Qwen voice cloning", "Qwen TTS tutorial"]
---

# Run Qwen3-TTS Web UI Locally: Complete Guide for Voice Cloning Without Coding

Alibaba's Qwen3-TTS is something else—upload a recording of yourself, and it "learns" to speak like you. Or describe a "deep magnetic male voice" in text, and it generates one for you. Best of all, it comes with a web interface—just open your browser and click away, no code required.

> I personally tested this on a **Mac mini M4 (M-series)** and marked all the pitfalls I encountered so you don't have to fall into them.

------

## First, Know Which Path to Take

Local installation (deployment) guide:

https://lingflux.com/en/articles/ai/qwen3-tts-mac-mini-m4-complete-guide/



Don't rush to copy commands yet. Check your computer specs first:

| Your Computer               | Which Path to Take               |
| --------------------------- | --------------------------------- |
| Mac, M1/M2/M3/M4 chips      | Use `mps` acceleration, take Mac route |
| Windows, with NVIDIA GPU    | Use `cuda` acceleration, take Windows route |
| No dedicated GPU, pure CPU  | It works, just slower—brew some tea while waiting |

------

## Three Ways to Use It, Pick One

You choose different models at startup for different experiences. In short:

**Voice Cloning** → Upload your own recording, it learns your voice
 Model: `Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**Preset Voice** → Choose from built-in voices, plus add instructions like "say it with a sad tone"
 Model: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`

**Custom Voice Design** → Describe the voice you want in text, it creates it for you
 Model: `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

The commands below use the **Base model (voice cloning)** as an example—just swap the model name to switch modes.

------

## Step 1: Start the Interface

### Mac (M-series Chips)

Open Terminal and paste this command:

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device mps \
  --dtype bfloat16 \
  --no-flash-attn
```

**What these parameters mean:**

- `--device mps`: Uses Apple chip's GPU, much faster than pure CPU. If your Mac is an older model without M-series, change this to `cpu`
- `--dtype bfloat16`: Model precision format, M-series supports it well, just use it as-is
- `--no-flash-attn`: **Don't miss this one!** Mac doesn't support FlashAttention, without this flag startup will fail

------

### Windows (NVIDIA GPU)

Open Command Prompt (CMD) and paste:

```cmd
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base ^
  --device cuda:0 ^
  --dtype bfloat16 ^
  --flash-attn
```

**Parameter explanation:**

- `--device cuda:0`: Uses the first NVIDIA GPU (usually you only have one, so `0` is enough)
- `--dtype bfloat16`: RTX 30-series and above support this, recommended
- `--flash-attn`: This acceleration works under Windows + CUDA, significantly speeds things up

> Tip: Windows uses `^` for line breaks (CMD) or backtick (PowerShell), different from Mac's `\`, don't mix them up.

------

### No GPU, Pure CPU?

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device cpu \
  --dtype float32
```

It works, just slow. Generating a sentence might take a few minutes, so be patient.

------

## Step 2: Open Your Browser

After the command runs, you'll see this line in the terminal:

```
Running on local URL: http://0.0.0.0:8000
```

Go directly to **http://localhost:8000** in your browser, and the interface appears. From there, just click around.

Want to use it on other devices in your local network? Replace `localhost` with this computer's IP address.
 Find your IP: Mac runs `ifconfig | grep "inet "`, Windows runs `ipconfig`.

------

## Don't Panic When Errors Hit, Check This List

**Mac shows FlashAttention error on startup**
 Ten to one you forgot `--no-flash-attn`, add it and restart.

------

**Windows says CUDA unavailable**
 Run this to check:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

Output `True` means no problem. Output `False` means you installed the wrong PyTorch version—reinstall with CUDA support:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

`cu121` corresponds to CUDA 12.1. Adjust based on your CUDA version—CUDA 11.8 would be `cu118`.

------

**Not enough VRAM, getting OOM (Out of Memory)**
 Change `--dtype bfloat16` to `--dtype float16`—lower precision, saves some VRAM.

------

**Model download slow or failing (China network)**
 Set up a mirror before running commands:

Mac / Linux:

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Windows:

```cmd
set HF_ENDPOINT=https://hf-mirror.com
```

------

## Don't Want to Run Locally? Try Online First

Setting up the model and environment takes some work. You can try the official online demo for a few minutes first—confirm you're interested before committing to local setup:

- Hugging Face: https://huggingface.co/spaces/Qwen/Qwen3-TTS
- ModelScope (faster access in China): https://modelscope.cn/studios/Qwen/Qwen3-TTS

------

Stuck on a step? Copy the complete error message from the terminal and throw it at a search engine or AI—most likely it'll be solved in a few minutes.
