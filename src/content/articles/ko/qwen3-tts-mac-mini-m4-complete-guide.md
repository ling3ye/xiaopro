---
title: "Mac Mini M4에서 Qwen3-TTS 실행 완전 가이드 | 처음부터, 5단계로 완료"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS는 알리바바의 최신 텍스트-음성 변환 모델입니다. 하지만 기본값은 NVIDIA 그래픽 카드용으로 설계되었습니다. 이 문서에서는 Mac Mini M4에서 성공적으로 실행하는 방법을 단계별로 안내합니다 - 시스템 의존성 설치, Python 환경 구성, Apple GPU(MPS)용 코드 수정까지, 모든 단계에 상세한 설명이 있습니다. Mac 사용자, AI 초보자, TTS 모델을 시도해 보고 싶은 개발자에게 적합합니다."
image: "https://img.lingflux.com/2026/03/2a456838c50928eb67a807431e65c2a3.png"
tags: ["qwen3 tts", "qwen3 tts mac", "qwen tts guide", "Qwen3-TTS Mac 설정", "Qwen3-TTS M4 칩", "Qwen 텍스트 음성 변환"]
---

# Mac Mini M4에서 Qwen3-TTS 실행 완전 가이드

> **누가 읽나요?** Mac Mini M4가 있고 터미널을 열 수 있는 사람이라면, 이 문서는 당신을 위해 쓴 것입니다. AI 배경이 필요 없고, 그냥 따라 하세요!

> 📝 **이 문서는 저의 Mac Mini M4에서의 실제 테스트를 기반으로 하며, 모든 단계가 검증되었습니다.**

------

## 📋 시작하기 전에, 먼저 여기를 보세요

**Qwen3-TTS**는 알리바바가 최근에 출시한 텍스트-음성 변환 모델로, 효과가 상당히 좋습니다. 하지만 기본값은 NVIDIA 그래픽 카드용으로 작성되었으므로, Mac에서 실행하려면 몇 군데 수정이 필요합니다.

좋은 소식은: **수정할 곳이 많지 않고, 이 문서에서 이미 모든 문제를 해결했습니다** 🎉

전체 과정은 5단계로, 대략 15~30분이 걸립니다 (대부분의 시간은 모델 다운로드를 기다리는 것).

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XG7krJlY-jY?si=X-F1_WwBnldVCeiK" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

------

## 첫 번째 단계: 시스템 의존성 설치

Mac 자체에 오디오 처리 도구가 부족하므로, 먼저 Homebrew로 보충하세요.

터미널을 열고 다음 명령어를 붙여넣으세요:

```bash
brew install portaudio ffmpeg sox
```

> ⚠️ **이 단계를 건너뛰면** 나중에 실행할 때 `/bin/sh: sox: command not found` 오류가 발생합니다. 그때 돌아와서 설치할 수도 있지만, 지금 한 번에 해결하는 것이 좋습니다.

------

## 두 번째 단계: Python 환경 만들기

프로젝트를 저장할 디렉토리를 찾고, **Conda**를 사용하여 깨끗한 Python 3.12 환경을 만들어서, 시스템의 다른 프로젝트와 충돌하지 않도록 하세요.

```bash
# 환경 생성 및 활성화 (한 번만 하면 됩니다)
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts

# 핵심 라이브러리 설치
pip install -U qwen-tts

# 공식 저장소 다운로드
git clone https://github.com/QwenLM/Qwen3-TTS.git
cd Qwen3-TTS
pip install -e .
```

> 💡 **Conda 환경이란?** "독립된 작은 방"으로 이해할 수 있습니다. 이 프로젝트의 모든 의존성이 안에 설치되므로, 컴퓨터의 다른 프로그램에 영향을 주지 않습니다.

------

## 세 번째 단계: M4 칩용 코드 수정 ⭐ (중요!)

이전 단계는 GitHub의 단계와 같지만, Mac M 시리즈 칩을 사용한다면 여기부터 다릅니다.

이것은 Mac 사용자가 가장 문제에 빠지기 쉬운 곳입니다. 공식 스크립트는 기본값이 NVIDIA 그래픽 카드이므로, 두 군데를 수정하여 Apple GPU(MPS)를 사용하도록 해야 합니다.

`examples/test_model_12hz_base.py` 파일을 열고, 대략 50번째 줄을 찾아서 다음 두 군데를 수정하세요:

### 수정 A: 장치를 MPS로 지정

```python
# ❌ 원래 작성 방식 (NVIDIA용)
# tts = Qwen3TTSModel.from_pretrained(..., attn_implementation="flash_attention_2")

# ✅ 이렇게 변경 (Mac M4용)
tts = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",   # 참고: 끝에 슬래시 /를 제거하세요
    torch_dtype=torch.bfloat16,          # M4는 bfloat16을 완전히 지원합니다, 정밀도와 속도 모두 고려
    attn_implementation="sdpa",          # Mac 호환 주의 메커니즘, flash_attention_2 대체
    device_map="mps",                    # Apple GPU 사용 강제
)
```

### 수정 B: 동기화 명령어 MPS용으로 수정

```python
# ❌ 원래 작성 방식 (NVIDIA만, Mac에서 바로 오류로 충돌)
# torch.cuda.synchronize()

# ✅ 이렇게 변경 (어떤 GPU를 사용할지 자동 판단)
if torch.cuda.is_available():
    torch.cuda.synchronize()
elif torch.backends.mps.is_available():
    torch.mps.synchronize()   # Mac 전용 올바른 명령어
```

> 🔧 **왜 이 두 군데를 수정해야 하나요?** M4 칩은 애플의 Metal 프레임워크(MPS)를 사용하고, NVIDIA의 CUDA와는 완전히 다른 시스템입니다. 첫 번째 수정은 모델에게 "Apple GPU를 사용하라고" 알리고, 두 번째 수정은 동기화 대기 명령어도 올바른 애플 버전을 사용하도록 합니다.

------

## 네 번째 단계: 모델 다운로드 및 실행

모델 파일은 대략 **4 GB**입니다. 네트워크가 안정적인지 확인하세요.

```bash
cd examples
python test_model_12hz_base.py
```

### 🐢 다운로드가 너무 느린가요? 미러를 사용해 보세요

```bash
export HF_ENDPOINT=https://hf-mirror.com
python test_model_12hz_base.py
```

### ❌ `SafetensorError`가 발생하면?

다운로드가 중간에 끊겨서 파일이 손상되었다는 뜻입니다. 해결 방법은 간단합니다:

1. Finder를 열고 `~/.cache/huggingface/hub`로 이동하세요
2. `Qwen` 폴더를 삭제하세요
3. 스크립트를 다시 실행하여 다시 다운로드하게 하세요

------

## 다섯 번째 단계: GPU가 작동하는지 확인

실행 전 M4의 GPU가 올바르게 인식되었는지 빠르게 확인할 수 있습니다:

```python
import torch
print(torch.backends.mps.is_available())  # True가 출력되면 성공 ✅
```

------

## 🎉 성공했습니다!

모든 게 정상이면, 스크립트 실행 후 `examples/` 디렉토리에 새로운 폴더가 생성되고, 그 안에 생성된 오디오 파일이 있습니다.

------

## 📎 전체 참조 코드

아래 코드에는 모든 Mac 호환 수정이 포함되어 있고, **다국어 병합 출력**과 **속도 제어** 기능도 추가되어 있으므로, 그냥 `.py` 파일로 저장하여 사용할 수 있습니다:

```python
import os
import torch
import soundfile as sf
import numpy as np
# 'qwen_tts'가 설치되어 있거나 현재 디렉토리에 있는지 확인하세요
from qwen_tts import Qwen3TTSModel

# ================= 1. 초기화 (설정) / 초기화 설정 =================

# 하드웨어 자동 감지.
if torch.backends.mps.is_available():
    device = "mps"   # Mac M1/M2/M3/M4...
elif torch.cuda.is_available():
    device = "cuda"  # NVIDIA GPU / 엔비디아 그래픽 카드
else:
    device = "cpu"   # 표준 CPU / 일반 프로세서

print(f"Using device / 현재 사용 장치: {device}")

# 결과 저장 경로 정의
OUT_DIR = "qwen3_slow_output"
os.makedirs(OUT_DIR, exist_ok=True)

print("Loading model... (This might take a minute)")
print("모델 로드 중... (약 1분 정도 걸릴 수 있습니다)")

# Hugging Face에서 모델 로드
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    torch_dtype=torch.bfloat16,
    attn_implementation="sdpa",
    device_map=device,
)
print("Model loaded successfully! / 모델 로드 완료!")

# ================= 2. 참조 오디오 설정 / 참조 오디오 설정 =================
# 이것은 모델이 모방(클론)할 목소리입니다.

# 옵션 A: URL 사용 (Qwen 공식 예시)
ref_audio_url = "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-TTS-Repo/clone_2.wav"

# 옵션 B: 로컬 파일 사용 (아래 줄의 주석을 해제하여 자신의 파일 사용)
# ref_audio_url = "./my_voice.wav"

# 중요: 이 텍스트는 참조 오디오의 내용과 정확히 일치해야 합니다.
# 틀리면 품질이 나빠집니다.
ref_text_content = "Okay. Yeah. I resent you. I love you. I respect you. But you know what? You blew it! And thanks to you."

# ================= 3. 생성 내용 구성 / 생성 내용 구성 =================
# 팁: 말을 더 천천히하고 명확하게 하기 위해, 문장 부호를 추가합니다 ( , . ... 등)
# 이것은 모델이 단어 사이에 멈추도록 강제합니다.

segments = [
    {
        "lang": "Chinese",
        "text": "大家好，这个视频是，分享如何在Mac Mini上，部署Qwen.3-TTS，运行官方例子程序，希望你们喜欢。",
        "temp": 0.7,
    },
    {
        "lang": "English",
        "text": "Hello everyone! In this video, I'll share how to deploy Qwen.3-TTS on a Mac Mini and run the official demos. I hope you enjoy it.",
        "temp": 0.7,
    },
    {
        "lang": "Japanese",
        "text": "皆さん、こんにちは。この動画では、Mac MiniでQwen.3-TTSを導入し、公式デモを動かす方法をシェアします。気に入っていただけると嬉しいです。",
        "temp": 0.7,
    },
    {
        "lang": "Korean",
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

# ================= 4. 생성 루프 / 생성 루프 =================
all_audio_parts = []
final_sr = None # 샘플링 레이트 / 샘플링 레이트

print("Starting audio generation... / 오디오 생성 시작...")

for i, seg in enumerate(segments):
    print(f"[{i+1}/{len(segments)}] Generating {seg['lang']} segment... / {seg['lang']} 세그먼트 생성 중...")

    try:
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
            speed=0.85,  # 0.85 = 85% 속도 (느림)
        )
    except TypeError:
        print(f"  (Note: Speed parameter not supported, using standard speed for {seg['lang']})")
        print(f"  (참고: Speed 매개변수가 지원되지 않으므로, {seg['lang']}에 표준 속도를 사용합니다)")
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
        )

    # 오디오 데이터 처리
    audio_data = wavs[0]
    if isinstance(audio_data, torch.Tensor):
        audio_data = audio_data.cpu().numpy()

    all_audio_parts.append(audio_data)
    if final_sr is None: final_sr = sr

# ================= 5. 오디오 병합 / 오디오 병합 =================
print("Merging all segments... / 모든 세그먼트 병합 중...")

silence_duration = 0.3
silence_samples = int(silence_duration * final_sr)
silence_data = np.zeros(silence_samples, dtype=np.float32)

final_sequence = []
for part in all_audio_parts:
    final_sequence.append(part)
    final_sequence.append(silence_data)

# 마지막 무음 블록 제거
if final_sequence:
    final_sequence.pop()

full_audio = np.concatenate(final_sequence)

# ================= 6. 출력 저장 / 출력 저장 =================
final_path = os.path.join(OUT_DIR, "Final_Slow_Mix.wav")
sf.write(final_path, full_audio, final_sr)

print("="*30)
print(f"Done! Audio saved to: / 완료! 오디오가 다음에 저장되었습니다:\n{final_path}")
print("="*30)
```

------

## 🛠️ 일반적인 문제 빠르게 확인하기

| 증상                     | 원인                       | 해결 방법                                      |
| ------------------------ | -------------------------- | --------------------------------------------- |
| `sox: command not found` | 시스템 의존성 부족         | 첫 번째 단계의 `brew install`을 실행하세요    |
| `SafetensorError`        | 모델 파일 다운로드 중단 손상 | `~/.cache/huggingface/hub/Qwen`을 삭제하고 다시 다운로드하세요 |
| `torch.cuda` 오류 충돌    | NVIDIA 전용 명령어 사용     | 세 번째 단계 수정 B를 했는지 확인하세요       |
| 다운로드가 느림 / 시간 초과 | HuggingFace 네트워크 접근 제한 | 미러를 설정하고 다시 시도하세요               |
| 이상한 드라이버 오류     | Apple Silicon 드라이버 간헐적 문제 | **컴퓨터 재시작**, 이상한 문제의 90%를 해결합니다        |

------
