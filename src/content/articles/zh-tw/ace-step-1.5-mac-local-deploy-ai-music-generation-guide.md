---
title: "【保姆級】零成本！教你在 Mac 上本地部署 ACE-Step 1.5，一鍵生成 AI 音樂"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-02-23
intro: "在自己的 Mac 上完全免費、離線運行 AI 音樂生成模型 ACE-Step 1.5，Apple 芯片加速，全程只需幾行命令。"
image: "https://img.lingflux.com/ace-step-1.5-mac-local-deploy-ai-music-generation-guide-cc.png"
tags: ["AI", "Mac", "音樂生成", "ACE-Step", "本地部署"]
---

既然大家對本地跑 AI 這麼感興趣，今天分享個好玩的項目——**ACE-Step 1.5**。

簡單說，就是能在你自己的 Mac 上生成音樂，完全免費，不用聯網也能跑，而且在這個項目上，Apple 芯片的性能優化做得挺不錯。

不用擔心很難，全程只需要敲幾行代碼。跟著我的步驟來，幾分鐘就能搞定！

## 準備工作

打開你的終端（Terminal），我們開始吧。

### 1. 把"窩"搭好

首先，找個你順眼的地方存放項目。

```bash
cd Projects
cd Python
```

### 2. 拉取代碼 & 安裝依賴

直接把項目從 GitHub 上克隆下來，然後我們用 `uv` 來快速安裝依賴（如果你還沒用過 `uv`，強烈推薦裝一個，Python 環境管理的神器）。

```bash
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv sync
```

*（這裡稍微等一下，等它跑完進度條。）*

### 3. 檢查一下 Mac 的"馬力"

裝好後，先別急著跑，確認一下你的 Apple 芯片（MPS加速）是不是被正確識別了。

```bash
uv run python -c "import torch; print(f'MPS check: {torch.backends.mps.is_available()}')"
```

只要終端返回了 **`MPS check: True`**，就說明一切正常，顯卡準備好幹活了！

## 啟動與運行

### 4. 啟動服務

沒啥好說的，直接運行：

```bash
uv run acestep
```

### 5. 進網頁開玩

終端那邊跑起來後，打開瀏覽器，輸入：`127.0.0.1:7860`

這時候你會看到 ACE-Step 的操作界面。

**這裡有幾個關鍵點要注意：**

- **選對配置**：界面上要選模型顯存大小。看你自己 Mac 的統一內存是多少，比如我這裡演示選的是 **16-20GB**。
- **初始化**：點一下 **「Initialize Service」**。
  - ⚠️ 注意：第一次運行會自動下載模型，文件有點大，這裡會卡住一會兒，是正常的！去喝杯水，耐心等它配置好。

### 6. 生成你的第一首 AI 音樂

環境好了之後，操作其實特別無腦：

1. 切到 **「Simple」** 模式。
2. 輸入提示詞（Prompt），不知道寫啥就填個 `easy example`。
3. 點 **「Create Sample」**。這時候你會發現下方自動填好了一堆複雜的參數（Custom 內容），不用管它。
4. 直接點最下面的 **「Generate Music」**。

搞定！稍等一會兒，進度條走完，就能聽到本地顯卡"算"出來的音樂了 🎵
