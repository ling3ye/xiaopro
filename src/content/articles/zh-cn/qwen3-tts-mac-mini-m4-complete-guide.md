---
title: "在 Mac Mini M4 上跑 Qwen3-TTS 完全指南｜从零开始，5步搞定"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS 是阿里巴巴最新的文字转语音模型，但官方默认是为 NVIDIA 显卡设计的。本文手把手教你在 Mac Mini M4 上成功运行——从安装系统依赖、配置 Python 环境，到修改代码适配 Apple GPU（MPS），每一步都有详细说明。适合 Mac 用户、AI 新手，以及想尝试 TTS 模型的开发者。"
image: "https://img.lingflux.com/2026/03/2a456838c50928eb67a807431e65c2a3.png"
tags: ["qwen3 tts", "qwen3 tts mac", "qwen tts guide", "Qwen3-TTS Mac 配置", "Qwen3-TTS M4 芯片", "Qwen 文字转语音"]
---

# 在 Mac Mini M4 上跑 Qwen3-TTS 完全指南

> **写给谁看的？** 只要你有一台 Mac Mini M4，会开终端，这篇就是为你写的。不需要 AI 背景，跟着做就行！

> 📝 **本文基于作者在 Mac Mini M4 上的实测，所有步骤均验证可行。**

------

## 📋 开始之前，先看这里

**Qwen3-TTS** 是阿里巴巴最新发布的文字转语音模型，效果非常不错。但它默认是为 NVIDIA 显卡写的，放到 Mac 上跑需要做几处小改动。

好消息是：**改动不多，而且本文已经帮你踩完坑了** 🎉

整个流程分 5 步，大约需要 15～30 分钟（大部分时间在等模型下载）。

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XG7krJlY-jY?si=X-F1_WwBnldVCeiK" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

------

## 第一步：安装系统依赖

Mac 自带的系统缺少一些音频处理工具，先用 Homebrew 补上。

打开终端，粘贴以下命令：

```bash
brew install portaudio ffmpeg sox
```

> ⚠️ **如果跳过这步**，后面运行时会报错 `/bin/sh: sox: command not found`，那时候再回来装也来得及，但不如现在一次搞定。

------

## 第二步：创建 Python 环境

找一个存放项目的目录，然后用 **Conda** 创建一个干净的 Python 3.12 环境，避免跟系统里其他项目打架。

```bash
# 创建并激活环境（只需做一次）
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts

# 安装核心库
pip install -U qwen-tts

# 下载官方仓库
git clone https://github.com/QwenLM/Qwen3-TTS.git
cd Qwen3-TTS
pip install -e .
```

> 💡 **什么是 Conda 环境？** 可以把它理解成一个"独立小房间"，这个项目的所有依赖都装在里面，不会影响你电脑上的其他程序。

------

## 第三步：修改代码适配 M4 芯片 ⭐（重点！）

之前的步骤，跟Github的步骤是一样的，但如果你用的是Mac M系列芯片的从这里开始会有点不一样。

这是 Mac 用户最容易踩坑的地方。官方脚本默认用 NVIDIA 显卡，我们要改两处让它用 Apple 的 GPU（MPS）。

打开文件 `examples/test_model_12hz_base.py`，找到大约第 50 行，做以下两处修改：

### 修改 A：指定设备为 MPS

```python
# ❌ 原来的写法（为 NVIDIA 设计）
# tts = Qwen3TTSModel.from_pretrained(..., attn_implementation="flash_attention_2")

# ✅ 改成这样（适配 Mac M4）
tts = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",   # 注意：去掉末尾的斜杠 /
    torch_dtype=torch.bfloat16,          # M4 完整支持 bfloat16，精度与速度兼顾
    attn_implementation="sdpa",          # Mac 兼容的注意力机制，替代 flash_attention_2
    device_map="mps",                    # 强制使用 Apple GPU
)
```

### 修改 B：同步指令适配 MPS

```python
# ❌ 原来的写法（仅限 NVIDIA，在 Mac 上会直接报错崩溃）
# torch.cuda.synchronize()

# ✅ 改成这样（自动判断用哪种 GPU）
if torch.cuda.is_available():
    torch.cuda.synchronize()
elif torch.backends.mps.is_available():
    torch.mps.synchronize()   # Mac 专用的正确指令
```

> 🔧 **为什么要改这两处？** M4 芯片用的是苹果自己的 Metal 框架（MPS），跟 NVIDIA 的 CUDA 是两套不同的体系。第一处告诉模型"用苹果 GPU"，第二处让同步等待指令也用正确的苹果版本。

------

## 第四步：下载模型并运行

模型文件大约 **4 GB**，请确保网络稳定。

```bash
cd examples
python test_model_12hz_base.py
```

### 🐢 下载太慢？试试镜像源

```bash
export HF_ENDPOINT=https://hf-mirror.com
python test_model_12hz_base.py
```

### 如果 ❌ 报错 `SafetensorError`？

这说明上次下载中途断了，文件损坏。解决方法很简单：

1. 打开 Finder，前往 `~/.cache/huggingface/hub`
2. 删除 `Qwen` 文件夹
3. 重新运行脚本，让它重新下载

------

## 第五步：验证 GPU 是否在工作

运行前可以快速确认一下 M4 的 GPU 是否被正确识别：

```python
import torch
print(torch.backends.mps.is_available())  # 输出 True 就大功告成 ✅
```

------

## 🎉 成功了！

如果一切正常，脚本运行后会在 `examples/` 目录下生成一个新文件夹，里面就是生成的音频文件。

------

## 📎 完整参考代码

下面这份代码已经包含所有 Mac 适配修改，还加了**多语言合并输出**和**语速控制**的功能，可以直接保存为 `.py` 文件使用：

```python
import os
import torch
import soundfile as sf
import numpy as np
# Ensure 'qwen_tts' is installed/present in the environment
# 确保环境中已安装 'qwen_tts' 或该文件在当前目录下
from qwen_tts import Qwen3TTSModel

# ================= 1. Initialization (Setup) / 初始化设置 =================

# Auto-detect the hardware.
# 自动检测硬件设备。
# "mps" = Mac (Apple Silicon), "cuda" = NVIDIA GPU, "cpu" = Standard Processor
if torch.backends.mps.is_available():
    device = "mps"   # Mac M1/M2/M3/M4...
elif torch.cuda.is_available():
    device = "cuda"  # NVIDIA GPU / 英伟达显卡
else:
    device = "cpu"   # Standard CPU / 普通处理器

print(f"Using device / 当前使用设备: {device}")

# Define where to save the results
# 定义结果保存路径
OUT_DIR = "qwen3_slow_output"
os.makedirs(OUT_DIR, exist_ok=True)

print("Loading model... (This might take a minute)")
print("正在加载模型... (可能需要一分钟)")

# Loading the model from Hugging Face
# 从 Hugging Face 加载模型
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    torch_dtype=torch.bfloat16,
    attn_implementation="sdpa",
    device_map=device,
)
print("Model loaded successfully! / 模型加载完成！")

# ================= 2. Reference Audio Settings / 参考音频设置 =================
# This is the voice the model will mimic (clone).
# 这是模型将要模仿（克隆）的声音。

# Option A: Use a URL (Official Qwen Example)
# 选项 A: 使用在线 URL (Qwen 官方示例)
ref_audio_url = "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-TTS-Repo/clone_2.wav"

# Option B: Use a local file (Uncomment the line below to use your own file)
# 选项 B: 使用本地文件 (取消下面这行的注释以使用自己的文件)
# ref_audio_url = "./my_voice.wav"

# CRITICAL: This text MUST match what is said in the reference audio exactly.
# If this is wrong, the quality will be bad.
# 关键：此文本必须与参考音频中的说话内容完全一致。
# 如果内容对不上，生成质量会变差。
ref_text_content = "Okay. Yeah. I resent you. I love you. I respect you. But you know what? You blew it! And thanks to you."

# ================= 3. Content to Generate / 生成内容配置 =================
# Tip: To make the speech slower and clearer, we add punctuation (like , . ...)
# This forces the model to pause between words.
# 技巧：为了让语速更慢、更清晰，我们增加了标点符号（如 , . ...）
# 这会强制模型在词与词之间停顿。

segments = [
    {
        "lang": "Chinese",
        # Original: 大家好...
        # Trick: Added commas to slow it down.
        # 技巧：增加逗号以减慢语速。
        "text": "大家好，这个视频是，分享如何在Mac Mini上，部署Qwen.3-TTS，运行官方例子程序，希望你们喜欢。", 
        "temp": 0.7, 
    },
    {
        "lang": "English",
        # Original: This video is about...
        # Trick: Added "..." and extra commas for a relaxed pace.
        # 技巧：增加 "..." 和额外的逗号，让节奏更舒缓。
        "text": "Hello everyone! In this video, I'll share how to deploy Qwen.3-TTS on a Mac Mini and run the official demos. I hope you enjoy it.", 
        "temp": 0.7,
    },
    {
        "lang": "Japanese",
        # Trick: Added extra Japanese commas (、)
        # 技巧：增加额外的日文逗号 (、)
        "text": "皆さん、こんにちは。この動画では、Mac MiniでQwen.3-TTSを導入し、公式デモを動かす方法をシェアします。気に入っていただけると嬉しいです。", 
        "temp": 0.7,
    },
    {
        "lang": "Korean",
        # Trick: Added breaks between concepts.
        # 技巧：在概念之间增加断句。
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
        "text": "Bonjour à tous ! Dans cette vidéo, je vais partager comment déployer Qwen.3-TTS sur un Mac Mini et lancer les démos officielles. J'espère qu'elle vous plaira.", 
        "temp": 0.8,
    }
]

# ================= 4. Generation Loop / 生成循环 =================
all_audio_parts = []
final_sr = None # Sample rate / 采样率

print("Starting audio generation... / 开始生成音频...")

for i, seg in enumerate(segments):
    print(f"[{i+1}/{len(segments)}] Generating {seg['lang']} segment... / 正在生成 {seg['lang']} 片段...")

    # Try to use the 'speed' parameter if the model supports it
    # 尝试使用 'speed' 参数（如果模型支持）
    try:
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
            speed=0.85,  # 0.85 = 85% speed (Slower) / 0.85倍速（更慢）
        )
    except TypeError:
        # If 'speed' causes an error, remove it and just use the text tricks
        # 如果 'speed' 参数报错，则移除它，仅依赖文本标点技巧
        print(f"  (Note: Speed parameter not supported, using standard speed for {seg['lang']})")
        print(f"  (注意：不支持 Speed 参数，{seg['lang']} 将使用标准语速)")
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
        )

    # Process the audio data / 处理音频数据
    audio_data = wavs[0]
    if isinstance(audio_data, torch.Tensor):
        audio_data = audio_data.cpu().numpy()

    all_audio_parts.append(audio_data)
    if final_sr is None: final_sr = sr

# ================= 5. Merging Audio / 合并音频 =================
print("Merging all segments... / 正在合并所有片段...")

# Create a silence gap between languages
# Changed from 0.3s to 0.8s for a better listening experience
# 在语言之间创建静音间隔
# 为了更好的听感，时长设置为 0.3秒 (可根据需要调整)
silence_duration = 0.3
silence_samples = int(silence_duration * final_sr)
silence_data = np.zeros(silence_samples, dtype=np.float32)

final_sequence = []
for part in all_audio_parts:
    final_sequence.append(part)
    final_sequence.append(silence_data) # Add silence after each part / 每段后加静音

# Remove the very last silence block
# 移除最后一段多余的静音
if final_sequence:
    final_sequence.pop()

full_audio = np.concatenate(final_sequence)

# ================= 6. Save Output / 保存输出 =================
final_path = os.path.join(OUT_DIR, "Final_Slow_Mix.wav")
sf.write(final_path, full_audio, final_sr)

print("="*30)
print(f"Done! Audio saved to: / 完成！音频已保存至:\n{final_path}")
print("="*30)
```

------

## 🛠️ 常见问题速查

| 症状                     | 原因                       | 解决方法                                      |
| ------------------------ | -------------------------- | --------------------------------------------- |
| `sox: command not found` | 缺少系统依赖               | 执行第一步的 `brew install`                   |
| `SafetensorError`        | 模型文件下载中断损坏       | 删除 `~/.cache/huggingface/hub/Qwen` 重新下载 |
| `torch.cuda` 报错崩溃    | 用了 NVIDIA 专属指令       | 检查第三步修改 B 是否做了                     |
| 下载很慢 / 超时          | 网络访问 HuggingFace 受限  | 设置镜像源后重试                              |
| 莫名其妙的驱动报错       | Apple Silicon 驱动偶发问题 | **重启电脑**，能解决 90% 的奇怪问题           |

------

