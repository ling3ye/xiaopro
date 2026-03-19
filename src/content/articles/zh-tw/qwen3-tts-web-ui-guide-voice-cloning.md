---
title: "本機跑 Qwen3-TTS 啟動 Web UI 完全手冊：不會程式也能玩聲音複製"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS 自帶網頁介面，上傳錄音就能複製聲音，完全不需要寫程式。本文支援 Mac（M 系列晶片）、Windows（NVIDIA 顯卡）設定。"
image: "https://img.lingflux.com/2026/03/2d1950de23bc0838bd604e391f15a92d.png"
tags: ["qwen3 tts", "qwen tts web ui", "qwen voice clone", "Qwen3-TTS Web 介面", "Qwen 聲音複製", "Qwen TTS 教學"]
---

# 本機跑 Qwen3-TTS  啟動Web UI完全手冊：不會程式也能玩聲音複製

阿裡這次出的 Qwen3-TTS 真的有點東西——上傳一段自己的錄音，它就能「學」你說話；或者用文字描述「低沉磁性男聲」，它就給你造一個出來。更香的是，它自帶網頁介面，打開瀏覽器點點點就能用，不用碰一行程式碼。

> 這篇手冊是我在 **Mac mini M4（M 系列）** 上親自跑通的，踩過的坑都幫你標出來了。

------

## 先搞清楚自己是哪種情況



本機安裝（部署）指南：

https://lingflux.com/zh-tw/articles/ai/qwen3-tts-mac-mini-m4-complete-guide/



別急著複製指令，先看看自己的電腦是什麼設定，走哪條路：

| 你的電腦                | 走哪條路                        |
| ----------------------- | ------------------------------- |
| Mac，M1/M2/M3/M4 晶片   | 用 `mps` 加速，走 Mac 那條      |
| Windows，有 NVIDIA 顯卡 | 用 `cuda` 加速，走 Windows 那條 |
| 沒有獨顯，純 CPU        | 也能跑，就是慢，泡杯茶等著      |

------

## 三種玩法，選一個開始

啟動的時候選不同的模型，就對應不同的玩法。簡單說：

**聲音複製** → 上傳你自己的錄音，它學你說話
 模型名：`Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**預設音色** → 從內建音色裡選，還能加「用悲傷的語氣說」這種指令
 模型名：`Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`

**自訂音色設計** → 用文字描述你想要的聲音，它幫你造出來
 模型名：`Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

下面的指令以 **Base 模型（聲音複製）** 為例，把模型名換掉就能切換其他玩法。

------

## 第一步：啟動介面

### Mac（M 系列晶片）

打開終端機，貼上這條指令：

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device mps \
  --dtype bfloat16 \
  --no-flash-attn
```

**三個參數是什麼意思：**

- `--device mps`：用 Apple 晶片的 GPU 跑，比純 CPU 快很多。如果你的 Mac 不是 M 系列的舊款，這裡改成 `cpu`
- `--dtype bfloat16`：模型精確度格式，M 系列支援得很好，照用就行
- `--no-flash-attn`：**這個一定不能漏！** Mac 不支援 FlashAttention 這個功能，不加這個參數啟動就報錯

------

### Windows（NVIDIA 顯卡）

打開命令提示字元（CMD），貼上：

```cmd
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base ^
  --device cuda:0 ^
  --dtype bfloat16 ^
  --flash-attn
```

**參數說明：**

- `--device cuda:0`：用第一塊 NVIDIA 顯卡（一般只有一塊，`0` 就夠了）
- `--dtype bfloat16`：RTX 30 系及以上的顯卡都支援，推薦用這個
- `--flash-attn`：Windows + CUDA 下這個加速是能開的，開了快不少

> 小提示：Windows 指令裡換行用 `^`（CMD）或反引號（PowerShell），和 Mac 的 `\` 不一樣，別搞混。

------

### 沒有顯卡，純 CPU？

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device cpu \
  --dtype float32
```

能跑，就是慢。生成一段話可能要等個幾分鐘，有心理準備。

------

## 第二步：打開瀏覽器

指令跑起來之後，終端機會出現這樣一行：

```
Running on local URL: http://0.0.0.0:8000
```

瀏覽器直接存取 **http://localhost:8000**，介面就出來了，剩下的點點點就行。

想在區域網路裡的手機或其他裝置上用？把 `localhost` 換成這台電腦的 IP 位址。
 查 IP：Mac 跑 `ifconfig | grep "inet "`，Windows 跑 `ipconfig`。

------

## 遇到報錯別慌，對照查

**Mac 啟動就報 FlashAttention 錯誤**
 十有八九是忘加 `--no-flash-attn` 了，補上重跑。

------

**Windows 提示 CUDA 不可用**
 先跑這行檢查一下：

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

輸出 `True` 沒問題；輸出 `False` 說明 PyTorch 裝的版本不對，重裝一個帶 CUDA 支援的：

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

`cu121` 對應 CUDA 12.1，根據自己的 CUDA 版本改，CUDA 11.8 就換成 `cu118`。

------

**顯存不夠，報 OOM（記憶體溢位）**
 把 `--dtype bfloat16` 改成 `--dtype float16`，精確度低一檔，顯存能省一些。

------

**模型下載慢或失敗（國內網路）**
 跑指令之前先設定鏡像：

Mac / Linux：

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Windows：

```cmd
set HF_ENDPOINT=https://hf-mirror.com
```

------

## 不想本機跑？先去線上試試手感

裝模型和環境比較折騰，可以先去官方的線上體驗頁玩幾分鐘，確認自己真的有興趣再折騰本機也不遲：

- Hugging Face：https://huggingface.co/spaces/Qwen/Qwen3-TTS
- ModelScope（國內存取快）：https://modelscope.cn/studios/Qwen/Qwen3-TTS

------

卡在某一步了？把終端機裡的報錯資訊完整複製出來，丟給搜尋引擎或者 AI，大概率幾分鐘就能解決。
