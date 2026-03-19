---
title: "로컬에서 Qwen3-TTS 실행: Web UI 완전 가이드 | 코딩 없이도 음성 클론 가능"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS는 웹 인터페이스를 내장하고 있어, 녹음 파일을 업로드하기만 하면 음성을 클론할 수 있고, 코딩이 전혀 필요하지 않습니다. 이 문서는 Mac(M 시리즈 칩), Windows(NVIDIA 그래픽 카드) 설정을 지원합니다."
image: "https://img.lingflux.com/2026/03/2d1950de23bc0838bd604e391f15a92d.png"
tags: ["qwen3 tts", "qwen tts web ui", "qwen voice clone", "Qwen3-TTS 웹 인터페이스", "Qwen 음성 클론", "Qwen TTS 튜토리얼"]
---

# 로컬에서 Qwen3-TTS 실행: Web UI 완전 가이드 - 코딩 없이도 음성 클론 가능

알리바바가 이번에 내놓은 Qwen3-TTS는 정말 꽤 괜찮습니다 - 자신의 녹음을 업로드하면 그것이 당신의 말투를 "학습"하고, "낮은 목소리의 남자 목소리"라고 텍스트로 설명하면 그걸 만들어 줍니다. 더 좋은 점은 웹 인터페이스가 내장되어 있어서, 브라우저를 열고 클릭만 하면 사용할 수 있고, 코드 한 줄 건드릴 필요가 없습니다.

> 이 가이드는 제가 **Mac mini M4(M 시리즈)**에서 직접 실행해 본 경험이며, 겪은 문제점을 모두 표시했습니다.

------

## 먼저 자신이 어떤 상황인지 파악하세요



로컬 설치(배포) 가이드:

https://lingflux.com/zh-cn/articles/ai/qwen3-tts-mac-mini-m4-complete-guide/



명령어를 복사하기 전에, 먼저 자신의 컴퓨터가 어떤 설정인지, 어떤 경로를 갈지 확인하세요:

| 컴퓨터                | 어떤 경로로 갈까요                 |
| ----------------------- | ---------------------------------- |
| Mac, M1/M2/M3/M4 칩   | `mps` 가속을 사용하면 Mac 경로로   |
| Windows, NVIDIA 그래픽 카드 | `cuda` 가속을 사용하면 Windows 경로로 |
| 독립 그래픽 없이 CPU만   | 실행할 수 있지만, 느리니 차 한 잔 마시고 기다리세요 |

------

## 세 가지 사용법 중 하나를 선택해서 시작하세요

시작할 때 다른 모델을 선택하면 다른 사용법에 대응합니다. 간단히 말해:

**음성 클론** → 자신의 녹음을 업로드하면 그것이 당신의 말투를 학습합니다.
 모델 이름: `Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**사전 설정된 목소리** → 내장된 목소리 중에서 선택하고, "슬픈 말투로 말해" 같은 지시를 추가할 수 있습니다.
 모델 이름: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`

**커스텀 목소리 디자인** → 원하는 목소리를 텍스트로 설명하면 그것을 만들어 줍니다.
 모델 이름: `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

아래의 명령어는 **Base 모델(음성 클론)**을 예로 사용하며, 모델 이름만 바꾸면 다른 사용법으로 전환할 수 있습니다.

------

## 첫 번째 단계: 인터페이스 시작하기

### Mac(M 시리즈 칩)

터미널을 열고 다음 명령어를 붙여넣으세요:

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device mps \
  --dtype bfloat16 \
  --no-flash-attn
```

**세 개의 매개변수는 무엇을 의미할까요:**

- `--device mps`: Apple 칩의 GPU로 실행하면 순수 CPU보다 훨씬 빠릅니다. Mac이 M 시리즈가 아닌 구형이라면 여기를 `cpu`로 바꾸세요
- `--dtype bfloat16`: 모델 정밀도 포맷으로, M 시리즈가 아주 잘 지원하므로 그냥 사용하면 됩니다
- `--no-flash-attn`: **이것은 반드시 추가하세요!** Mac은 FlashAttention 기능을 지원하지 않으므로, 이 매개변수를 추가하지 않으면 시작 시 오류가 발생합니다

------

### Windows(NVIDIA 그래픽 카드)

명령 프롬프트(CMD)를 열고 다음을 붙여넣으세요:

```cmd
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base ^
  --device cuda:0 ^
  --dtype bfloat16 ^
  --flash-attn
```

**매개변수 설명:**

- `--device cuda:0`: 첫 번째 NVIDIA 그래픽 카드를 사용합니다 (보통 하나만 있으므로 `0`이면 충분합니다)
- `--dtype bfloat16`: RTX 30 시리즈 이상의 그래픽 카드는 모두 지원하므로, 이것을 사용하는 것을 권장합니다
- `--flash-attn`: Windows + CUDA에서는 이 가속을 켤 수 있고, 켜면 훨씬 빨라집니다

> 팁: Windows 명령어에서 줄바꿈은 `^`(CMD) 또는 백틱(PowerShell)을 사용하고, Mac의 `\`와 다르므로 혼동하지 마세요.

------

### 그래픽 카드가 없고 CPU만?

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device cpu \
  --dtype float32
```

실행할 수 있지만 느립니다. 한 문장을 생성하려면 몇 분 정도 기다려야 할 수 있습니다.

------

## 두 번째 단계: 브라우저 열기

명령어가 실행되면 터미널에 다음과 같은 줄이 나타납니다:

```
Running on local URL: http://0.0.0.0:8000
```

브라우저에서 **http://localhost:8000**에 직접 액세스하면 인터페이스가 나타나고, 나머지는 클릭만 하면 됩니다.

로컬 네트워크의 휴대폰이나 다른 기기에서 사용하고 싶으시면 `localhost`를 이 컴퓨터의 IP 주소로 바꾸세요.
 IP 확인: Mac에서는 `ifconfig | grep "inet "`, Windows에서는 `ipconfig`를 실행하세요.

------

## 오류가 발생하면 당황하지 말고 확인하세요

**Mac에서 시작하자마자 FlashAttention 오류가 발생**
 십중팔구 `--no-flash-attn`을 추가하는 것을 잊은 것이므로, 추가하고 다시 실행하세요.

------

**Windows에서 CUDA를 사용할 수 없다고 표시**
 먼저 다음을 실행하여 확인하세요:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

`True`가 출력되면 문제가 없습니다. `False`가 출력되면 PyTorch 버전이 맞지 않은 것이므로, CUDA 지원이 있는 버전으로 재설치하세요:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

`cu121`은 CUDA 12.1에 대응하므로, 자신의 CUDA 버전에 따라 바꾸세요. CUDA 11.8이라면 `cu118`로 바꾸세요.

------

**비디오 메모리가 부족하여 OOM(메모리 초과) 오류 발생**
 `--dtype bfloat16`을 `--dtype float16`으로 바꾸면 정밀도가 한 단계 낮아지고 비디오 메모리를 절약할 수 있습니다.

------

**모델 다운로드가 너무 느리거나 실패함 (국내 네트워크)**
 명령어를 실행하기 전에 먼저 미러를 설정하세요:

Mac / Linux:

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Windows:

```cmd
set HF_ENDPOINT=https://hf-mirror.com
```

------

## 로컬에서 실행하고 싶지 않다면? 먼저 온라인에서 체험해 보세요

모델과 환경을 설치하는 게 귀찮다면, 먼저 공식 온라인 체험 페이지에서 몇 분 동안 놀아 보고, 정말 관심이 있으면 로컬 설정을 해도 늦지 않습니다:

- Hugging Face: https://huggingface.co/spaces/Qwen/Qwen3-TTS
- ModelScope (국내에서 빠른 액세스): https://modelscope.cn/studios/Qwen/Qwen3-TTS

------

어느 단계에서 막히셨나요? 터미널의 오류 메시지를 복사해서 검색 엔진이나 AI에 넣으면, 몇 분 만에 해결할 수 있을 것입니다.
