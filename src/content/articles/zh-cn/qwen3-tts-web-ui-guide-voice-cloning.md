---
title: "本地跑 Qwen3-TTS 启动 Web UI 完全手册｜不会代码也能玩声音克隆"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS 自带网页界面，上传录音就能克隆声音，完全不需要写代码。本文支持 Mac（M 系列芯片）、Windows（NVIDIA 显卡）配置。"
image: "https://img.lingflux.com/2026/03/2d1950de23bc0838bd604e391f15a92d.png"
tags: ["qwen3 tts", "qwen tts web ui", "qwen voice clone", "Qwen3-TTS Web 界面", "Qwen 声音克隆", "Qwen TTS 教程"]
---

# 本地跑 Qwen3-TTS  启动Web UI完全手册：不会代码也能玩声音克隆

阿里这次出的 Qwen3-TTS 真的有点东西——上传一段自己的录音，它就能"学"你说话；或者用文字描述"低沉磁性男声"，它就给你造一个出来。更香的是，它自带网页界面，打开浏览器点点点就能用，不用碰一行代码。

> 这篇手册是我在 **Mac mini M4（M 系列）**  上亲自跑通的，踩过的坑都帮你标出来了。

------

## 先搞清楚自己是哪种情况



本地安装（部署）指南：

https://lingflux.com/zh-cn/articles/ai/qwen3-tts-mac-mini-m4-complete-guide/



别急着复制命令，先看看自己的电脑是什么配置，走哪条路：

| 你的电脑                | 走哪条路                        |
| ----------------------- | ------------------------------- |
| Mac，M1/M2/M3/M4 芯片   | 用 `mps` 加速，走 Mac 那条      |
| Windows，有 NVIDIA 显卡 | 用 `cuda` 加速，走 Windows 那条 |
| 没有独显，纯 CPU        | 也能跑，就是慢，泡杯茶等着      |

------

## 三种玩法，选一个开始

启动的时候选不同的模型，就对应不同的玩法。简单说：

**声音克隆** → 上传你自己的录音，它学你说话
 模型名：`Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**预设音色** → 从内置音色里选，还能加"用悲伤的语气说"这种指令
 模型名：`Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`

**自定义音色设计** → 用文字描述你想要的声音，它帮你造出来
 模型名：`Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

下面的命令以 **Base 模型（声音克隆）** 为例，把模型名换掉就能切换其他玩法。

------

## 第一步：启动界面

### Mac（M 系列芯片）

打开终端，粘贴这条命令：

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device mps \
  --dtype bfloat16 \
  --no-flash-attn
```

**三个参数是什么意思：**

- `--device mps`：用 Apple 芯片的 GPU 跑，比纯 CPU 快很多。如果你的 Mac 不是 M 系列的旧款，这里改成 `cpu`
- `--dtype bfloat16`：模型精度格式，M 系列支持得很好，照用就行
- `--no-flash-attn`：**这个一定不能漏！** Mac 不支持 FlashAttention 这个功能，不加这个参数启动就报错

------

### Windows（NVIDIA 显卡）

打开命令提示符（CMD），粘贴：

```cmd
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base ^
  --device cuda:0 ^
  --dtype bfloat16 ^
  --flash-attn
```

**参数说明：**

- `--device cuda:0`：用第一块 NVIDIA 显卡（一般只有一块，`0` 就够了）
- `--dtype bfloat16`：RTX 30 系及以上的显卡都支持，推荐用这个
- `--flash-attn`：Windows + CUDA 下这个加速是能开的，开了快不少

> 小提示：Windows 命令里换行用 `^`（CMD）或反引号（PowerShell），和 Mac 的 `\` 不一样，别搞混。

------

### 没有显卡，纯 CPU？

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device cpu \
  --dtype float32
```

能跑，就是慢。生成一段话可能要等个几分钟，有心理准备。

------

## 第二步：打开浏览器

命令跑起来之后，终端会出现这样一行：

```
Running on local URL: http://0.0.0.0:8000
```

浏览器直接访问 **http://localhost:8000**，界面就出来了，剩下的点点点就行。

想在局域网里的手机或其他设备上用？把 `localhost` 换成这台电脑的 IP 地址。
 查 IP：Mac 跑 `ifconfig | grep "inet "`，Windows 跑 `ipconfig`。

------

## 遇到报错别慌，对照查

**Mac 启动就报 FlashAttention 错误**
 十有八九是忘加 `--no-flash-attn` 了，补上重跑。

------

**Windows 提示 CUDA 不可用**
 先跑这行检查一下：

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

输出 `True` 没问题；输出 `False` 说明 PyTorch 装的版本不对，重装一个带 CUDA 支持的：

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

`cu121` 对应 CUDA 12.1，根据自己的 CUDA 版本改，CUDA 11.8 就换成 `cu118`。

------

**显存不够，报 OOM（内存溢出）**
 把 `--dtype bfloat16` 改成 `--dtype float16`，精度低一档，显存能省一些。

------

**模型下载慢或失败（国内网络）**
 跑命令之前先设置镜像：

Mac / Linux：

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Windows：

```cmd
set HF_ENDPOINT=https://hf-mirror.com
```

------

## 不想本地跑？先去线上试试手感

装模型和环境比较折腾，可以先去官方的在线体验页玩几分钟，确认自己真的感兴趣再折腾本地也不迟：

- Hugging Face：https://huggingface.co/spaces/Qwen/Qwen3-TTS
- ModelScope（国内访问快）：https://modelscope.cn/studios/Qwen/Qwen3-TTS

------

卡在某一步了？把终端里的报错信息完整复制出来，丢给搜索引擎或者 AI，大概率几分钟就能解决。

