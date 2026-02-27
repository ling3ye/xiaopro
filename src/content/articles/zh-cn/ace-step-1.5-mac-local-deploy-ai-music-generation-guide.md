---
title: "【保姆级】零成本！教你在 Mac 上本地部署 ACE-Step 1.5，一键生成 AI 音乐"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-02-23
intro: "在自己的 Mac 上完全免费、离线运行 AI 音乐生成模型 ACE-Step 1.5，Apple 芯片加速，全程只需几行命令。"
image: "https://img.lingflux.com/ace-step-1.5-mac-local-deploy-ai-music-generation-guide-c640.png"
tags: ["AI", "Mac", "音乐生成", "ACE-Step", "本地部署"]
---

既然大家对本地跑 AI 这么感兴趣，今天分享个好玩的项目——**ACE-Step 1.5**。

简单说，就是能在你自己的 Mac 上生成音乐，完全免费，不用联网也能跑，而且在这个项目上，Apple 芯片的性能优化做得挺不错。

不用担心很难，全程只需要敲几行代码。跟着我的步骤来，几分钟就能搞定！

## 准备工作

打开你的终端（Terminal），我们开始吧。

### 1. 把"窝"搭好

首先，找个你顺眼的地方存放项目。

```bash
cd Projects
cd Python
```

### 2. 拉取代码 & 安装依赖

直接把项目从 GitHub 上克隆下来，然后我们用 `uv` 来快速安装依赖（如果你还没用过 `uv`，强烈推荐装一个，Python 环境管理的神器）。

```bash
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv sync
```

*（这里稍微等一下，等它跑完进度条。）*

### 3. 检查一下 Mac 的"马力"

装好后，先别急着跑，确认一下你的 Apple 芯片（MPS加速）是不是被正确识别了。

```bash
uv run python -c "import torch; print(f'MPS check: {torch.backends.mps.is_available()}')"
```

只要终端返回了 **`MPS check: True`**，就说明一切正常，显卡准备好干活了！

## 启动与运行

### 4. 启动服务

没啥好说的，直接运行：

```bash
uv run acestep
```

### 5. 进网页开玩

终端那边跑起来后，打开浏览器，输入：`127.0.0.1:7860`

这时候你会看到 ACE-Step 的操作界面。

**这里有几个关键点要注意：**

- **选对配置**：界面上要选模型显存大小。看你自己 Mac 的统一内存是多少，比如我这里演示选的是 **16-20GB**。
- **初始化**：点一下 **「Initialize Service」**。
  - ⚠️ 注意：第一次运行会自动下载模型，文件有点大，这里会卡住一会儿，是正常的！去喝杯水，耐心等它配置好。

### 6. 生成你的第一首 AI 音乐

环境好了之后，操作其实特别无脑：

1. 切到 **「Simple」** 模式。
2. 输入提示词（Prompt），不知道写啥就填个 `easy example`。
3. 点 **「Create Sample」**。这时候你会发现下方自动填好了一堆复杂的参数（Custom 内容），不用管它。
4. 直接点最下面的 **「Generate Music」**。

搞定！稍等一会儿，进度条走完，就能听到本地显卡"算"出来的音乐了 🎵
