---
title: "Qwen3-TTSをローカルで動かすWeb UI完全ガイド：コード不要でボイスクローン"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTSはWebインターフェースを備えており、録音をアップロードするだけでボイスクローンが可能。コードを書く必要がありません。Mac（Mシリーズチップ）、Windows（NVIDIA GPU）の設定をサポートしています。"
image: "https://img.lingflux.com/2026/03/2d1950de23bc0838bd604e391f15a92d.png"
tags: ["qwen3 tts", "qwen tts web ui", "qwen voice clone", "Qwen3-TTS Web インターフェース", "Qwen ボイスクローン", "Qwen TTS チュートリアル"]
---

# Qwen3-TTSをローカルで動かすWeb UI完全ガイド：コード不要でボイスクローン

アリババが出したQwen3-TTSはかなりすごいです——自分の録音をアップロードすると、あなたの話し方を「学習」して話してくれます。あるいは「低くて磁力のある男性の声」とテキストで説明すると、その声を作り出してくれます。さらに嬉しいことに、Webインターフェースが内蔵されているので、ブラウザを開いてクリックするだけで使えます。コードは一行も触る必要がありません。

> このガイドは私が**Mac mini M4（Mシリーズ）**で実際に動かして確認したもので、私がハマった落とし穴をすべてマークしてあります。

------

## まず、自分がどの状況かを把握する

ローカルインストール（デプロイ）ガイド：

https://lingflux.com/ja/articles/ai/qwen3-tts-mac-mini-m4-complete-guide/



慌ててコマンドをコピーする前に、まず自分のPCの設定を見て、どのルートを選ぶか確認しましょう：

| あなたのPC               | どのルートを選ぶか               |
| ------------------------ | --------------------------------- |
| Mac、M1/M2/M3/M4チップ    | `mps`アクセラレーション、Macルートへ |
| Windows、NVIDIA GPU搭載   | `cuda`アクセラレーション、Windowsルートへ |
| 独立GPUなし、CPUのみ     | 動くけど遅い——お茶を淹れて待つ      |

------

## 3つの使い方、1つを選んで始める

起動時に異なるモデルを選ぶと、それぞれ異なる使い方になります。簡単に言うと：

**ボイスクローン** → 自分の録音をアップロード、あなたの声を学習
 モデル名：`Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**プリセット音声** → 内蔵の音声から選択、「悲しいトーンで言って」のような命令も追加可能
 モデル名：`Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`

**カスタム音声デザイン** → 望む声をテキストで説明、それを作り出してくれる
 モデル名：`Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

以下のコマンドは**Baseモデル（ボイスクローン）**を例にしています。モデル名を変えるだけで、他の使い方に切り替えられます。

------

## ステップ1：インターフェースを起動

### Mac（Mシリーズチップ）

ターミナルを開いて、このコマンドをペースト：

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device mps \
  --dtype bfloat16 \
  --no-flash-attn
```

**3つのパラメータの意味：**

- `--device mps`：AppleチップのGPUを使用、純粋なCPUよりかなり速い。MacがMシリーズでない旧型の場合、ここを`cpu`に変更
- `--dtype bfloat16`：モデル精度フォーマット、Mシリーズでよくサポートされているのでそのまま使えばOK
- `--no-flash-attn`：**これを忘れないで！** MacはFlashAttention機能をサポートしていないので、このパラメータなしで起動するとエラーになります

------

### Windows（NVIDIA GPU）

コマンドプロンプト（CMD）を開いて、ペースト：

```cmd
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base ^
  --device cuda:0 ^
  --dtype bfloat16 ^
  --flash-attn
```

**パラメータ説明：**

- `--device cuda:0`：最初のNVIDIA GPUを使用（通常は1つしかないので`0`で十分）
- `--dtype bfloat16`：RTX 30シリーズ以上はこれをサポート、推奨
- `--flash-attn`：Windows + CUDA環境ではこのアクセラレーションが有効、かなり速くなる

> 小技：Windowsのコマンドでは改行に`^`（CMD）またはバッククォート（PowerShell）を使用、Macの`\`とは違うので混同しないでください。

------

### GPUなし、CPUのみ？

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device cpu \
  --dtype float32
```

動きますが、遅いです。1つの文を生成するのに数分待つこともあるので、覚悟してください。

------

## ステップ2：ブラウザを開く

コマンドが動き出した後、ターミナルにこの行が表示されます：

```
Running on local URL: http://0.0.0.0:8000
```

ブラウザで**http://localhost:8000**にアクセスすると、インターフェースが表示されます。あとはクリックするだけです。

ローカルネットワーク内のスマホや他のデバイスで使いたい？`localhost`をこのPCのIPアドレスに置き換えてください。
 IP確認：Macは`ifconfig | grep "inet "`、Windowsは`ipconfig`。

------

## エラーが出ても慌てない、照らし合わせて確認

**Macで起動時にFlashAttentionエラーが出る**
 十中八九、`--no-flash-attn`を忘れています。追加して再実行。

------

**WindowsでCUDAが使えないと言われる**
 まずこれを実行して確認：

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

`True`が出れば問題なし。`False`が出ればPyTorchのバージョンが間違っています。CUDAサポート付きで再インストール：

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

`cu121`はCUDA 12.1に対応。自分のCUDAバージョンに合わせて変更してください。CUDA 11.8なら`cu118`に変更。

------

**VRAM不足、OOM（Out of Memory）エラー**
 `--dtype bfloat16`を`--dtype float16`に変更。精度が下がりますが、VRAMを節約できます。

------

**モデルダウンロードが遅い、または失敗（中国国内ネットワーク）**
 コマンド実行前にミラーを設定：

Mac / Linux：

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Windows：

```cmd
set HF_ENDPOINT=https://hf-mirror.com
```

------

## ローカルで動かしたくない？先にオンラインで試す

モデルと環境の設定は結構ハマるので、まず公式のオンラインデモで数分遊んでみて、本当に興味があると確認してからローカルに挑戦しても遅くはありません：

- Hugging Face：https://huggingface.co/spaces/Qwen/Qwen3-TTS
- ModelScope（中国国内からアクセスしやすい）：https://modelscope.cn/studios/Qwen/Qwen3-TTS

------

どこかで行き詰まった？ターミナルのエラーメッセージを丸ごとコピーして、検索エンジンかAIに投げれば、たぶん数分で解決できます。
