---
title: "Mac Mini M4 で Qwen3-TTS を動かす完全ガイド｜ゼロから5ステップで完了"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS はAlibabaが公開した最新のテキスト読み上げモデルですが、公式はデフォルトでNVIDIA GPU向けに設計されています。この記事では、システム依存関係のインストール、Python環境のセットアップから、Apple GPU（MPS）用にコードを修正するまで、Mac Mini M4で正常に動作させるための手順を詳しく解説します。Macユーザー、AI初心者、TTSモデルを試してみたい開発者に最適です。"
image: "https://img.lingflux.com/2026/03/2a456838c50928eb67a807431e65c2a3.png"
tags: ["qwen3 tts", "qwen3 tts mac", "qwen tts guide", "Qwen3-TTS Mac設定", "Qwen3-TTS M4チップ", "Qwen 音声合成"]
---

# Mac Mini M4 で Qwen3-TTS を動かす完全ガイド

> **誰向け？** Mac Mini M4をお持ちで、ターミナルを開ける方なら誰でも。AIの知識は必要ありません、手順通りに進めるだけ！

> 📝 **この記事は、筆者がMac Mini M4で実際にテストした内容に基づいています。すべての手順が動作することを確認済みです。**

------

## 📋 始める前に

**Qwen3-TTS** はAlibabaが最新公開したテキスト読み上げモデルで、非常に優れたパフォーマンスを発揮します。ただし、デフォルトではNVIDIA GPU向けに作られているため、Macで動かすにはいくつか小さな変更が必要です。

朗報は：**変更点は少なく、すでにハマりどころは解決済みです** 🎉

プロセス全体は5ステップで、所要時間は約15〜30分（ほとんどはモデルのダウンロード待ちです）。

------

## ステップ1：システム依存関係をインストール

macOSには音声処理ツールが足りないため、Homebrewでインストールします。

ターミナルを開いて、以下のコマンドを貼り付けます：

```bash
brew install portaudio ffmpeg sox
```

> ⚠️ **このステップをスキップすると**、後で `/bin/sh: sox: command not found` エラーが発生します。そのときに戻ってきてもできますが、今やっておく方が楽です。

------

## ステップ2：Python環境をセットアップ

プロジェクト用のディレクトリを決めたら、**Conda** を使ってクリーンなPython 3.12環境を作成します。システムの他のプロジェクトと競合しないようにするためです。

```bash
# 環境を作成してアクティベート（1回だけ）
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts

# コアライブラリをインストール
pip install -U qwen-tts

# 公式リポジトリをクローン
git clone https://github.com/QwenLM/Qwen3-TTS.git
cd Qwen3-TTS
pip install -e .
```

> 💡 **Conda環境って何？** 「独立した部屋」のようなものと考えてください。このプロジェクトのすべての依存関係はそこにインストールされ、コンピュータの他のプログラムには影響しません。

------

## ステップ3：M4チップ用にコードを修正 ⭐（重要！）

ここまではGitHubの手順と同じですが、Mシリーズチップを搭載したMacを使用している場合、ここから少し違ってきます。

ここがMacユーザーが最もハマりやすいポイントです。公式スクリプトはデフォルトでNVIDIA GPUを使用するようになっているため、Apple GPU（MPS）を使用するように2箇所修正する必要があります。

ファイル `examples/test_model_12hz_base.py` を開き、約50行目を見つけて、以下の2つの変更を行います：

### 変更A：デバイスをMPSに指定

```python
# ❌ 元のコード（NVIDIA向け）
# tts = Qwen3TTSModel.from_pretrained(..., attn_implementation="flash_attention_2")

# ✅ これに変更（Mac M4対応）
tts = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",   # 注意：末尾のスラッシュ / を削除
    torch_dtype=torch.bfloat16,          # M4はbfloat16を完全サポート、精度と速度を両立
    attn_implementation="sdpa",          # Mac互換のアテンション機構、flash_attention_2の代わり
    device_map="mps",                    # Apple GPUの使用を強制
)
```

### 変更B：MPS用の同期処理

```python
# ❌ 元のコード（NVIDIA専用、Macでクラッシュする）
# torch.cuda.synchronize()

# ✅ これに変更（どのGPUを使うか自動検出）
if torch.cuda.is_available():
    torch.cuda.synchronize()
elif torch.backends.mps.is_available():
    torch.mps.synchronize()   # Mac用の正しいコマンド
```

> 🔧 **なぜこの2箇所を変更するの？** M4チップはApple独自のMetalフレームワーク（MPS）を使用しており、NVIDIAのCUDAとは全く異なるシステムです。1箇所目はモデルに「Apple GPUを使う」ことを伝え、2箇所目は同期待機コマンドも正しいAppleバージョンを使用するようにします。

------

## ステップ4：モデルをダウンロードして実行

モデルファイルは約 **4 GB** あるため、安定したインターネット接続を確保してください。

```bash
cd examples
python test_model_12hz_base.py
```

### 🐢 ダウンロードが遅すぎる？ミラーを試してみて

```bash
export HF_ENDPOINT=https://hf-mirror.com
python test_model_12hz_base.py
```

### ❌ `SafetensorError` が表示された場合？

これは以前のダウンロードが中断され、ファイルが破損していることを意味します。解決策は簡単です：

1. Finderで `~/.cache/huggingface/hub` に移動
2. `Qwen` フォルダを削除
3. スクリプトを再実行して再ダウンロード

------

## ステップ5：GPUが動作しているか確認

実行前に、M4のGPUが正しく認識されているかを素早く確認できます：

```python
import torch
print(torch.backends.mps.is_available())  # True と出力されれば成功 ✅
```

------

## 🎉 成功！

すべてうまくいけば、スクリプト実行後、`examples/` ディレクトリに新しいフォルダが作成され、その中に生成された音声ファイルが保存されます。

------

## 📎 完全なリファレンスコード

以下は、Mac対応のすべての変更に加えて、**多言語統合出出力**と**速度制御**機能を含む完全なコードです。`.py` ファイルとして保存してそのまま使用できます：

```python
import os
import torch
import soundfile as sf
import numpy as np
# 環境に 'qwen_tts' がインストールされているか確認
from qwen_tts import Qwen3TTSModel

# ================= 1. 初期化（セットアップ） =================

# ハードウェアを自動検出。
# "mps" = Mac（Apple Silicon）, "cuda" = NVIDIA GPU, "cpu" = 通常のプロセッサ
if torch.backends.mps.is_available():
    device = "mps"   # Mac M1/M2/M3/M4...
elif torch.cuda.is_available():
    device = "cuda"  # NVIDIA GPU
else:
    device = "cpu"   # 通常のプロセッサ

print(f"使用デバイス: {device}")

# 結果の保存場所を定義
OUT_DIR = "qwen3_slow_output"
os.makedirs(OUT_DIR, exist_ok=True)

print("モデルをロード中...（1分ほどかかる場合があります）")

# Hugging Faceからモデルをロード
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    torch_dtype=torch.bfloat16,
    attn_implementation="sdpa",
    device_map=device,
)
print("モデルのロードに成功しました！")

# ================= 2. 参照音声設定 =================
# ここはモデルが模倣（クローン）する声です。

# 選択肢A: URLを使用（Qwen公式の例）
ref_audio_url = "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-TTS-Repo/clone_2.wav"

# 選択肢B: ローカルファイルを使用（独自のファイルを使う場合は以下の行のコメントを外してください）
# ref_audio_url = "./my_voice.wav"

# 重要：このテキストは参照音声で話されている内容と完全に一致している必要があります。
# 一致していない場合、品質が悪化します。
ref_text_content = "Okay. Yeah. I resent you. I love you. I respect you. But you know what? You blew it! And thanks to you."

# ================= 3. 生成コンテンツ設定 =================
# ヒント：音声をより遅く、より明確にするために、句読点（, . ...など）を追加します。
# これによりモデルが単語間で一時停止するようになります。

segments = [
    {
        "lang": "Chinese",
        # 元: 大家好...
        # ヒント: カンマを追加して速度を遅くする。
        "text": "大家好，这个视频是，分享如何在Mac Mini上，部署Qwen.3-TTS，运行官方例子程序，希望你们喜欢。",
        "temp": 0.7,
    },
    {
        "lang": "English",
        # 元: This video is about...
        # ヒント: "..." と追加のカンマでリラックスしたペースにする。
        "text": "Hello everyone! In this video, I'll share how to deploy Qwen.3-TTS on a Mac Mini and run the official demos. I hope you enjoy it.",
        "temp": 0.7,
    },
    {
        "lang": "Japanese",
        # ヒント: 追加の日本語句読点（、）を追加
        "text": "皆さん、こんにちは。この動画では、Mac MiniでQwen.3-TTSを導入し、公式デモを動かす方法をシェアします。気に入っていただけると嬉しいです。",
        "temp": 0.7,
    },
    {
        "lang": "Korean",
        # ヒント: 概念間に区切りを追加
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

# ================= 4. 生成ループ =================
all_audio_parts = []
final_sr = None # サンプリングレート

print("音声生成を開始します...")

for i, seg in enumerate(segments):
    print(f"[{i+1}/{len(segments)}] {seg['lang']}セグメントを生成中...")

    # モデルがサポートしている場合は 'speed' パラメータを使用
    try:
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
            speed=0.85,  # 0.85 = 85% 速度（遅い）
        )
    except TypeError:
        # 'speed' でエラーが出る場合は、テキストのトリックだけを使う
        print(f"  (注意: Speedパラメータはサポートされていないため、{seg['lang']}は標準速度を使用します)")
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
        )

    # オーディオデータを処理
    audio_data = wavs[0]
    if isinstance(audio_data, torch.Tensor):
        audio_data = audio_data.cpu().numpy()

    all_audio_parts.append(audio_data)
    if final_sr is None: final_sr = sr

# ================= 5. 音声を統合 =================
print("すべてのセグメントを統合中...")

# 言語間に無音間隔を作成
# 聞き取りやすくするため、0.3秒に設定（必要に応じて調整）
silence_duration = 0.3
silence_samples = int(silence_duration * final_sr)
silence_data = np.zeros(silence_samples, dtype=np.float32)

final_sequence = []
for part in all_audio_parts:
    final_sequence.append(part)
    final_sequence.append(silence_data) # 各パート後に無音を追加

# 最後の無音ブロックを削除
if final_sequence:
    final_sequence.pop()

full_audio = np.concatenate(final_sequence)

# ================= 6. 出力を保存 =================
final_path = os.path.join(OUT_DIR, "Final_Slow_Mix.wav")
sf.write(final_path, full_audio, final_sr)

print("="*30)
print(f"完了！音声を保存しました:\n{final_path}")
print("="*30)
```

------

## 🛠️ クイックトラブルシューティング

| 症状                           | 原因                           | 解決方法                                          |
| ------------------------------ | ------------------------------ | ------------------------------------------------- |
| `sox: command not found`       | システム依存関係が不足         | ステップ1の `brew install` を実行                 |
| `SafetensorError`              | モデルファイルのダウンロードが中断 | `~/.cache/huggingface/hub/Qwen` を削除して再試行 |
| `torch.cuda` クラッシュエラー  | NVIDIA専用コマンドを使用している | ステップ3の変更Bが適用されているか確認            |
| ダウンロードが遅い / タイムアウト | HuggingFaceへのアクセスが制限されている | ミラーを設定して再試行                           |
| 原因不明のドライバエラー       | Apple Siliconドライバの一時的な問題 | **コンピュータを再起動** - 変な問題の90%が解決   |

------
