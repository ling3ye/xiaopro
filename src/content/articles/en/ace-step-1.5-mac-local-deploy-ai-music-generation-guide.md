---
title: "Run ACE-Step 1.5 Locally on Mac — Free AI Music Generation in Minutes"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-02-23
intro: "Deploy the ACE-Step 1.5 AI music generation model entirely offline on your Mac. Apple Silicon optimized, no subscription required — just a few terminal commands."
image: "https://img.lingflux.com/ace-step-1.5-mac-local-deploy-ai-music-generation-guide-ccc.png"
tags: ["AI", "Mac", "Music Generation", "ACE-Step", "Local Deployment"]
---

Since so many of you are curious about running AI locally, here's a fun one — **ACE-Step 1.5**.

In short, it lets you generate music right on your own Mac, completely free, no internet required, and the project has solid Apple Silicon (MPS) optimizations baked in.

Don't worry if you're not a developer — the whole setup takes just a handful of commands. Follow the steps below and you'll have it running in no time.

## Setup

Open your Terminal and let's get started.

### 1. Choose a home for the project

Pick a directory you're comfortable with and navigate to it.

```bash
cd Projects
cd Python
```

### 2. Clone the repo & install dependencies

Clone the project from GitHub, then use `uv` to install dependencies quickly. If you haven't tried `uv` yet, it's highly recommended — it's a fast, modern Python environment manager.

```bash
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv sync
```

*Wait for the progress bar to finish before moving on.*

### 3. Verify Apple Silicon acceleration

Before running the model, confirm that your Apple chip (MPS backend) is recognized correctly.

```bash
uv run python -c "import torch; print(f'MPS check: {torch.backends.mps.is_available()}')"
```

If the terminal prints **`MPS check: True`**, everything is good — your GPU is ready to work.

## Running the App

### 4. Start the service

Simply run:

```bash
uv run acestep
```

### 5. Open the web UI

Once the terminal shows it's running, open your browser and go to: `127.0.0.1:7860`

You'll see the ACE-Step interface.

**A few important things to know:**

- **Choose the right memory config**: The UI asks you to select your model VRAM size. Match it to your Mac's Unified Memory — for example, select **16-20GB** if that's what you have.
- **Initialize the service**: Click **"Initialize Service"**.
  - ⚠️ Note: The first run will automatically download the model weights, which are fairly large. The UI may appear frozen for a while — this is normal. Grab a coffee and wait for it to finish.

### 6. Generate your first AI track

Once initialized, it's surprisingly simple:

1. Switch to **"Simple"** mode.
2. Type a prompt — if you're not sure what to write, try `easy example`.
3. Click **"Create Sample"**. The "Custom" parameters below will be filled in automatically — ignore them for now.
4. Hit **"Generate Music"** at the bottom.

That's it! Wait for the progress bar to complete, and you'll hear music generated entirely on your local machine 🎵
