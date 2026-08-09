---
title: 'Mac에서 CH32V307을 처음부터 정복하기: "Windows 바이러스 잔뜩 컴파일"에서 "불도 들어오고 말도 하는"까지의 삽질 전 기록'
domain: hardware
platforms: ["mac"]
format: "tutorial"
date: 2026-08-08
intro: "Mac에서 CH32V307 개발 환경을 처음부터 세팅하는데, PlatformIO 플랫폼을 설치하니 도구 체인이 Windows용 .exe를 잔뜩 쥐여주네요? 이 글은 실제 삽질 과정을 그대로 기록한 것입니다. macOS 네이티브 RISC-V 도구 체인으로 수동 교체, Gatekeeper 격리 해제, 온보드 WCH-Link 플래싱까지 뚫고, 마침내 '컴파일과 플래싱은 성공했고 시리얼 출력도 나오는데 LED는 도통 켜지지 않는' 진짜 원인까지 파고듭니다. 결국 온보드 LED가 공장 출고 시점부터 MCU에 아예 연결되어 있지 않았던 거죠. 모든 명령과 에러는 실제로 실행한 것이며, 만난 10개의 구멍을 빠짐없이 전부 꺼내놨습니다. Arduino/ESP에서 넘어오는 분들에게 미리 예방주사를 놓아드립니다."
tags: ["CH32V307", "CH32V macOS 개발", "PlatformIO", "WCH-Link", "WCH RISC-V", "임베디드 macOS 개발"]
image: https://img.lingflux.com/2026/08/d9106f173bc51c93033527dd5e206b04.png
---

> Lingshun Lab · 임베디드 삽질 시리즈
>
> 하드웨어: **CH32V307V-EVT-R1**(온보드 WCH-Link 디버거, WCH RISC-V 칩)
> 운영체제: **macOS(Apple Silicon, arm64)**
> 도구: VSCode + PlatformIO
> 목표: 개발 환경을 0부터 세팅해서 LED 하나를 켜고, 시리얼 포트가 말하게 만들기. 임베디드 세계에서 공인된 "Hello World"죠.

## 글을 시작하며: 왜 이 글을 썼는가

먼저 이 글을 쓰는 '사람'이 어떤 사람인지부터 밝혀두겠습니다. 그래야 뒤쪽에서 제가 하는 짓을 보다가 "이 사람이 진짜 MCU 코드를 짜본 적이 있는 거 맞나?" 중얼거리는 일이 덜할 테니까요.

저는 Arduino랑 ESP-IDF를 꽤 오래 만졌습니다. LED 깜빡이기, WiFi 연결, MQTT 돌리기는 이미 근육 기억으로 자리 잡아서 눈 감고도 LED 하나쯤은 켭니다. 그래서 이 CH32V307 보드를 처음 받았을 때 마음속으로 계산한 건 이랬습니다: "칩 하나 바뀌었을 뿐인데, LED 하나 켜는 게 얼마나 어렵겠어?"

현실은 아주 시원하게 제 면구침을 시켜주더군요. CH32 생태계의 '공장 출고 설정'은 Arduino나 ESP처럼 '꽂으면 되고, 코드 맞으면 켜진다'는 세계관과는 완전히 다른 차원의 이야기였습니다.

- **프로그램 하나 굽는 데 전용 라이터를 부릅니다**: Arduino나 ESP32는 USB 선 하나로 전원, 플래싱, 시리얼까지 세 가지를 전부 때웁니다. 반면 CH32은 **wlink**라는 온보드 디버거를 끼워 주는데, "이 녀석이 대체 무슨 수로 펌웨어를 칩에 밀어 넣는 건지" 이해하는 것만 해도 한 바퀴를 돌아야 했습니다.
- **온보드 LED가 MCU에 안 붙어 있습니다**: Arduino의 온보드 LED는 13번 핀에 딱 붙어 있어서 `digitalWrite(13, HIGH)` 한 방이면 켜집니다. 근데 이 보드의 사용자 LED는... **출고 시점부터 뜯겨 나간 상태로, 어느 핀에도 연결되어 있지 않습니다**. 점퍼선 하나를 날려서 직접 연결해 줘야 그제야 불을 켜 줍니다.
- **시리얼 포트도 문을 잘 골라야 합니다**: ESP32는 꽂으면 바로 USB 시리얼, WYSIWYG입니다. CH32이 기본적으로 타는 건 디버거가 가상으로 만들어낸 USART1이라, 포트가 안 맞으면 그냥 고요할 뿐입니다. 텅 빈 모니터를 들여다보며 보드가 고장 난 건 아닌지 의심하게 됩니다.

그 순간 저는 '베테랑의 어이없는 실수'가 뭔지 뼈에 사무치게 느꼈습니다. 십 년 넜게 불을 켜 왔는데, RISC-V MCU 하나에서 자아비판까지 하게 될 줄이야. 그동안 배운 임베디드가 다 개한테 간 거 아닌가 의심까지 들더라고요.

그래서 이건 단순한 '튜토리얼'이 아니라, Arduino/ESP 베테랑이 처음 CH32을 만졌을 때의 **삽질 일기**이기도 합니다. 숙련자 눈에는 황당하기 짝이 없어 보일 저의 초보적 실수들을 전부 있는 그대로 꺼내놓을 겁니다. 왜냐면, Arduino/ESP에서 넘어오는 여러분도 십중팔구 똑같이 밟을 테니까요. 미리 예방주사를 맞아 두면, 뒤에 나오는 구멍들이 유독 반갑게(?) 느껴지실 겁니다.

---

인사사는 여기까지 하고 본론으로 돌아가죠. "CH32V307 + Windows"를 검색하면 공식 MounRiver Studio가 나와서 설치하면 그만입니다. "CH32V307 + Linux"를 검색해도 공식 도구 체인이 제법 잘 챙겨줍니다.

근데 "CH32V307 + macOS"를 검색하면... 아마 침묵에 빠지실 겁니다. 자료는 파편화되어 있고, 어두운 구멍투성이입니다. 칩 자체는 꽤 괜찮습니다. 32비트 RISC-V 코어, 최대 144MHz, 가격 대비 ARM MCU들을 다 농락하는 수준이죠. 근데 Mac에서는 '사랑 안 받는 아이' 신세입니다.

이 글은 제가 Mac에서 CH32V307 개발 환경을 0부터 세팅하면서, 구멍을 밟고 또 메우기를 반복해 마침내 LED 점등 + 시리얼 통신을 뚫은 전 과정을 기록한 것입니다. **저는 어떤 구멍도 건너뛰지 않을 겁니다.** 여러분도 십중팔구 같은 구멍을 만날 테니, 전부 꺼내놓으면 훨씬 덜 돌아가실 수 있을 겁니다. 전체 코드는 GitHub에 올려뒀습니다(링크는 글 맨 끝에). 이 글은 '왜 이렇게 하는가'를 제대로 파헤치는 역할만 맡겠습니다.

최종 결과부터 스포일러하자면, 컴파일 성공, 플래싱 성공, 보드 위 LED가 일정한 박자로 깜빡이고, 시리얼 모니터에는 이렇게 찍힙니다:

```
CH32V307 booted, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

'아무것도 없는' 상태에서 이 화면까지 오는 동안 최소 **8개의 구멍**을 밟았습니다. 아래로 내려가 보시면, 하나도 빠짐없이 전부 보실 수 있습니다.

### 목차

- [1. 주인공부터 소개: CH32V307V-EVT-R1](#1-주인공부터-소개-ch32v307v-evt-r1)
- [2. 전체 그림: 이 도구 체인은 어떤 모양인가](#2-전체-그림-이-도구-체인은-어떤-모양인가)
- [3. 작업 시작: VSCode 설치부터 pio 명령 익히기까지](#3-작업-시작-vscode-설치부터-pio-명령-익히기까지)
- [4. CH32V 플랫폼 설치(그리고 첫 번째 작은 구멍)](#4-ch32v-플랫폼-설치그리고-첫-번째-작은-구멍)
- [5. 대형 구멍 현장: 왜 .exe가 잔뜩 깔리는가](#5-대형-구멍-현장-왜-exe가-잔뜩-깔리는가)
- [6. 구멍 메우기: macOS 네이티브 도구 체인으로 교체](#6-구멍-메우기-macos-네이티브-도구-체인으로-교체)
- [7. Gatekeeper 격리 해제](#7-gatekeeper-격리-해제하지-않으면-macos가-바이러스로-간주해-막아버립니다)
- [8. 도구 체인이 진짜로 돌아가는지 확인](#8-도구-체인이-진짜로-돌아가는지-확인)
- [9. 첫 프로젝트 만들기: platformio.ini 이해하기](#9-첫-프로젝트-만들기-platformioini-이해하기)
- [10. 첫 컴파일](#10-첫-컴파일)
- [11. pio를 전역 명령으로 설정](#11-pio를-전역-명령으로-설정)
- [12. 하드웨어 연결과 플래싱](#12-하드웨어-연결과-플래싱)
- [13. 구멍 ①: 시리얼이 완전히 고요함](#13-구멍-컴파일과-플래싱은-성공했는데-시리얼이-완전히-고요함)
- [14. 구멍 ②: LED가 도통 켜지지 않음(글 전체에서 가장 큰 구멍)](#14-구멍-글-전체에서-가장-큰-구멍-시리얼은-말하기-시작했는데-led는-도통-켜지지-않음)
- [15. 다 뚫고 난 뒤의 전체 코드](#15-다-뚫고-난-뒤-완성된-mainc-는-이런-모양)
- [16. 삽질 요약 표](#16-삽질-요약-표)
- [17. 명령 & 파일 경로 빠른 참조](#17-핵심-명령--파일-경로-빠른-참조)
- [18. 나만의 'CH32 개발 로직' 세우기](#18-나만의-ch32-개발-로직-세우기-앞으로-새-프로젝트-잡으면-그냥-베끼면-됩니다)
- [19. 자주 묻는 질문 FAQ](#19-자주-묻는-질문-faq)
- [20. 다음으로 할 만한 것들](#20-다-뚫고-난-뒤-더-뭘-해볼-수-있을까)
- [21. 참고 자료](#21-참고-자료)

---

## 1. 주인공부터 소개: CH32V307V-EVT-R1

본격 작업 전에 이 보드와 2분 정도 친해질 필요가 있습니다. 뒤에 나올 구멍의 90%가 이 보드의 '개성'에서 비롯되기 때문입니다.

| 특징 | 설명 |
| --- | --- |
| 주 칩 | CH32V307VCT6, WCH QingKe V4F 코어, 32비트 RISC-V, 클럭 최대 **144MHz**, LQFP80 패키지 |
| Flash 실제 용량 | **288KB**(단 PlatformIO는 기본적으로 256KB Flash + 64KB SRAM 기준으로 컴파일. 왜 안 바꿔도 되는지는 뒤에서 설명) |
| 온보드 디버거 | **WCH-Link**(사실 CH32V305 칩 하나가 '대역 출연'하는 것으로, 공식 WCH-LinkE와 동급) |
| USB 포트 | USB-C 하나로 전원, 디버그, 가상 시리얼 세 가지를 전부 처리 |
| 사용자 LED | LED1, LED2 두 개. **⚠️ 기본은 떠 있는 상태, MCU에 연결되어 있지 않음!**(이게 본문 최대의 구멍, 14장에서 집중 조명) |
| 사용자 버튼 KEY | 마찬가지로 기본 떠 있음 |
| 전원 표시등 | 1개. 전원 넣으면 항상 켜져 있고, 여러분 코드와는 아무 상관 없습니다. 많은 분이 전원 넣자마자 이 불 켜진 걸 보고 "점등 성공!"이라고 오해하시는데, 그냥 전원 표시등일 뿐입니다 |

보드에서 또 놓치기 쉬운 디테일이 하나 있습니다. 온보드 디버거 칩(CH32V305)과 타깃 칩(CH32V307) 사이가 공장 출고 시점에 **점퍼 4개**(실크는 각각 `RX1-TX0`, `TX1-RX0`, `DIO-DIO0`, `CLK-CLK0`)로 다리 놓아져 있다는 점입니다. 디버거의 SWIO 신호와 시리얼 신호를 타깃 칩 쪽으로 '건너가게' 해주는 다리죠.

> ⚠️ **이 점퍼 4개는 공장에서 이미 꽂혀 있습니다. 절대 손대지 마세요.** 뽑으면 가벼운 경우 플래시가 안 들어가고, 심하면 시리얼까지 먹통이 됩니다. 코드를 잘못 짠 줄 알고 반나절 삽질하다가, 결국 점퍼 문제였다는 걸 깨닫게 되면 정신이 나갑니다. 제가 어떻게 아느냐고요? 그냥 묻지 마세요.

자, 인물 소개는 끝났으니 환경 세팅으로 들어갑시다.

---

## 2. 전체 그림: 이 도구 체인은 어떤 모양인가

먼저 '단체 사진' 한 장로 각 구성 요소가 누구-누구를 담당하는지 정리해 봅시다.

```
┌──────────────────────────────────────────────────────────┐
│  VSCode + PlatformIO IDE 확장(GUI: 컴파일/플래싱/디버그/시리얼) │
│                          │                                │
│                   PlatformIO Core(pio 명령행)              │
│                          │                                │
│            ┌─────────────┴──────────────┐                 │
│       ch32v 플랫폼(커뮤니티 유지보수: Community-PIO-CH32V)│          │
│            │                             │                 │
│   ┌────────┼─────────┬───────────┐       │                 │
│ toolchain  wlink    openocd    board     │                 │
│(RISC-V GCC)(플래싱 도구)(디버그 도구)(보드 정의)│                 │
└──────────────────────────────────────────┘
                     │ USB
        CH32V307V-EVT-R1(온보드 WCH-Link)
```

![](https://img.lingflux.com/2026/08/73dff7f41fe1d3c38d06447b98a39f2b.png)

**한마디로 정리하면**: VSCode의 PlatformIO 플러그인이 프론트엔드 인터페이스이고, 진짜 일을 하는 건 명령행 도구인 `pio`입니다. `pio`는 다시 `Community-PIO-CH32V`라는 커뮤니티 플랫폼에 의존하고, 이 플랫폼이 '컴파일러(toolchain) + 플래싱 도구(wlink) + 디버그 도구(openocd) + 보드 파라미터(board)'를 한데 묶어줍니다. 이론상 한 번 설치하면 바로 쓸 수 있는 구조죠.

이 커뮤니티 플랫폼은 꽤 알차습니다. CH32V003/103/203/30x 전 시리즈를 네이티브로 지원하고, WCH 공식 주변부 라이브러리(noneos-sdk), FreeRTOS, RT-Thread, Arduino, ch32fun 등 여러 프레임워크도 선택할 수 있습니다.

하지만, 여기서 글 전체를 관통하는 가장 큰 전환점이 등장합니다. **이 플랫폼은 기본적으로 Windows 사용자 기준으로 설정되어 있습니다.** macOS 사용자는 설치하고 나면 십중팔구 멍해질 겁니다. 얼마나 멍해지는지, 바로 공개하죠.

---

## 3. 작업 시작: VSCode 설치부터 pio 명령 익히기까지

### Step 0: 기본 환경 확인

터미널을 열고 먼저 바닥부터 훑어봅니다:

```bash
python3 --version          # 3.x 필요
brew --version              # Homebrew, 필수는 아니지만 강력 추천
uname -m                    # Apple Silicon은 arm64, Intel Mac은 x86_64 출력
```

VSCode와 PlatformIO 확장을 설치합니다:

1. https://code.visualstudio.com/ 에 가서 VSCode를 다운로드해 설치합니다.
2. VSCode를 열고 왼쪽 'Extensions' 아이콘 → `PlatformIO IDE` 검색 → Install.
3. 확장 설치가 끝나면 `~/.platformio/` 디렉터리로 PlatformIO Core 본체(수백 MB, 전용 Python 가상환도 포함)를 자동으로 내려받습니다. 우측 하단에 진행률이 표시되니 몇 분간 가만히 기다려주세요.

설치가 끝나면 왼쪽 사이드바에 개미 아이콘이 하나 나타납니다. 이게 PlatformIO 로고입니다(이 친구 마스코트가 진짜 개미예요).

### Step 1: 숨어 있는 pio 명령 찾기

확장까지 설치하고 나면 명령행 도구 `pio`는 이미 존재합니다. 다만 시스템 PATH에 들어가 있지 않아서 터미널에서 그냥 `pio`를 치면 못 찾습니다. 실제로는 여기 누워 있습니다:

```bash
~/.platformio/penv/bin/pio
```

확인해 봅니다:

```bash
~/.platformio/penv/bin/pio --version
# PlatformIO Core, version 6.1.19
```

뒤에 명령을 치기 편하게 임시 변수를 하나 만들어 둡니다(현재 터미널 창에서만 유효):

```bash
PIO=~/.platformio/penv/bin/pio
```

이 글 뒤에 등장하는 모든 `$PIO`는 이 경로를 가리킵니다. 전부 끝나고 나면 11단계에서 이걸 전역 명령으로 만들어서, 앞으로는 그냥 `pio`만 쳐도 되게 할 겁니다.

---

## 4. CH32V 플랫폼 설치(그리고 첫 번째 작은 구멍)

PlatformIO의 패키지 관리 명령으로 커뮤니티 플랫폼을 설치합니다:

```bash
$PIO pkg install -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git
```

이 단계에는 빠지기 쉬운 디테일이 두 개 있습니다:

> **구멍 ①: 조직 이름 오타.** 올바른 GitHub 조직 이름은 `Community-PIO-CH32V`입니다(중간에 **PIO** 세 글자가 들어가 있고, 대문자). 오래된 글이나 게시물 중에는 `community-ch32v`(PIO 빠짐)라고 쓴 것이 많아서, 그대로 치면 아주 절망스러운 에러가 뜹니다:
> ```
> remote: Repository not found.
> ```
> 반드시 `Community-PIO-CH32V`를 정확히 베끼세요.

> **구멍 ②: 옛날 명령 사용.** 초창기 튜토리얼은 `pio platform install ...`을 쓰라고 하는데, 이 명령은 새 버전 PlatformIO에서 **deprecated** 처리되어 `This command is deprecated`라고 뜹니다. 지금은 `pio pkg install -g -p <주소>` 형태로 통일했습니다.

명령이 돌기 시작하면 플랫폼 본체, RISC-V 도구 체인, openocd, wlink 4개 패키지를 순서대로 가져옵니다. 로그에 에러도 없고 모두 정상처럼 보입니다. **하지만 아직 샴페인을 열지 마세요.** 진짜 큰 구멍은 지금부터입니다.

---

## 5. 대형 구멍 현장: 왜 `.exe`가 잔뜩 깔리는가

이번 장이 본문에서 가장 알차습니다. 대다수 macOS 사용자가 여기서 막혀서 자아비판에 빠지는 구간이기도 합니다.

플랫폼 설치가 끝났으니 실제로 로컬에 내려받은 도구 체인이 어떤 모양인지 확인해 봅시다:

```bash
ls ~/.platformio/packages/toolchain-riscv/bin/ | head
# riscv-none-embed-addr2line.exe
# riscv-none-embed-ar.exe
# riscv-none-embed-as.exe
# ...
```

플래싱 도구 wlink도 확인합니다:

```bash
file ~/.platformio/packages/tool-wlink/wlink.exe
# PE32 executable (console) Intel 80386, for MS Windows
```

보이시나요. 전부 **`.exe`**입니다. 지극히 Windows다운 PE32 바이너리로, macOS에서는 그냥 고철 덩어리입니다. 더블클릭도 안 열리고, 코드 컴파일은 더더욱 불가능하죠. 이 결과를 처음 봤을 때의 심정은 대충 이랬습니다: "나 Mac인데 왜 나한테 Windows 물건을 주는 건데?"

### 원인 파기: 문제는 `platform.json`에 있다

이 플랫폼의 설정 파일을 열어봅니다:

```bash
cat ~/.platformio/platforms/ch32v/platform.json | python3 -m json.tool | grep -A3 toolchain-riscv
```

결과는 이렇습니다:

```json
"toolchain-riscv": {
  "type": "toolchain",
  "owner": "platformio",
  "version": "https://github.com/Community-PIO-CH32V/toolchain-riscv-windows.git"
}
```

**진실이 밝혀졌습니다.** 이 플랫폼은 설정 파일에 도구 체인 출처를 `toolchain-riscv-windows.git`으로 **굳어 있게** 적어두고, 플래싱 도구 wlink도 `#windows` 브랜치로 굳어 있습니다. PlatformIO는 설치할 때 '이 시스템이 뭔지'를 똑똑하게 판단하지 않습니다. 설정 파일에 뭐라 해서 그걸 그대로 설치할 뿐이에요. Windows 버전을 모두에게 똑같이 나눠주는 거죠. 우리 불쌍한 Mac 사용자도 포함해서요.

**다행인 점은**: 같은 `Community-PIO-CH32V` 조직이 이미 macOS 네이티브 버전 저장소도 갖춰두었습니다. 다만 기본값으로 설정되어 있지 않을 뿐입니다. 원인을 잡았으니 메우는 작업도 자연스럽습니다. **이 두 Windows 패키지만 macOS 네이티브 버전으로 수동 교체**하면 됩니다. 구체적으로 어떻게 바꾸는지, 단계별 주의점은 아래 챕터에서 실전으로 다룹니다.

---

## 6. 구멍 메우기: macOS 네이티브 도구 체인으로 교체

### 6.1 RISC-V 컴파일러 교체

먼저 잘못 깔린 Windows 버전을 지웁니다:

```bash
rm -rf ~/.platformio/packages/toolchain-riscv
```

macOS 네이티브 버전을 설치합니다:

```bash
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/toolchain-riscv-mac.git
```

설치 성공하면 이런 메시지가 뜹니다:

```
Tool Manager: toolchain-riscv@1.80200.190731+sha.99cb62f has been installed!
```

설치 뒤에 확인해 보면, `package.json`에 `"system": ["darwin_x86_64", "darwin_arm64"]`라고 적혀 있습니다. 즉 macOS 용이라는 뜻이고, 패키지 이름은 여전히 `toolchain-riscv`라, 예전 Windows 버전을 매끄럽게 대체합니다.

> **왜 이 단계에서 '더 최신처럼 보이는 gcc12 브랜치'가 아니라 `main` 브랜치를 써야 할까요?**
>
> 여기엔 아주 은밀한 기술 디테일이 숨어 있습니다. 플랫폼의 빌드 스크립트(`builder/main.py`) 안에 이런 로직이 있습니다:
> ```python
> is_gcc_12 = platform.get_package_version("toolchain-riscv").split(".")[1].startswith("12")
> compiler_triple = "riscv-wch-elf" if is_gcc_12 else "riscv-none-embed"
> ```
> 사람 말로 옮기면 이렇습니다: 스크립트는 설치된 도구 체인 **버전 번호의 두 번째 마디**를 보고, `1.8.x` 같으면 컴파일러 실행 파일 접두사가 `riscv-none-embed-gcc`라고 가정합니다. 반대로 `1.12.x`면 접두사가 `riscv-wch-elf-gcc`라고 가정하죠. 이 두 접두사는 완전히 다른 실행 파일 이름에 대응합니다. 잘못 고르면 빌드 스크립트가 부르는 명령이 디스크에 아예 없어서 바로 에러가 납니다.
>
> `main` 브랜치로 깔리는 버전 번호는 마침 `1.80200.190731`(gcc 8.2.0에 대응)이라, 플랫폼이 원래 굳어둔 Windows 버전 번호와 일치합니다. 즉 `riscv-none-embed` 경로로 빠지고, 스크립트의 원래 기대와 완벽히 일치해서 리스크 제로, 가장 안정적입니다.

설치한 뒤 주의할 디테일이 하나 있습니다:

> ⚠️ **이 gcc8 버전 컴파일러는 본체가 사실 x86_64 아키텍처입니다.** 즉 Intel Mac 용으로 빌된 것이지, Apple Silicon 네이티브 arm64가 아닙니다. 이유는 단순합니다. xPack(도구 체인의 상스트림 패키징 주체)이 gcc8 시절에는 arm64 빌드를 아예 내놓지 않았기 때문입니다. 그래서 M 시리즈 칩을 단 Mac에서는 이 컴파일러가 **Rosetta 2**로 번역돼서 돌아갑니다. '네이티브' 아닌 느낌이 들지만 실측에서 컴파일은 완전히 정상입니다. 부담 갖지 마세요. 처음 실행하면 Rosetta 설치하라고 시스템이 뜰 텐데, 한 번 설치하면 그만입니다.

### 6.2 플래싱 도구 wlink 교체

같은 요령으로 Windows 버전 wlink를 macOS 네이티브 버전으로 바꿉니다:

```bash
rm -rf ~/.platformio/packages/tool-wlink
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_arm64
```

> Intel 칩을 단 오래된 Mac이라면 브랜치 이름을 `mac_x64`로 바꾸세요:
> ```bash
> $PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_x64
> ```

설치 뒤 메시지:

```
Tool Manager: tool-wlink@0.23.241116+sha.0c802d4 has been installed!
```

> **openocd는 신경 안 써도 됩니다. 정상입니다.** `openocd`(디버그용 도구)는 PlatformIO 공식 레지스트리에서 가져오는 거라 `Community-PIO-CH32V`에서 직접 당겨온 게 아닙니다. 레지스트리 자체가 운영체제별 아키텍처를 자동으로 매칭하는 능력이 있어서, Apple Silicon에서 설치하면 이미 arm64 네이티브 버전입니다. 확인해 보면:
> ```bash
> file ~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd
> # Mach-O 64-bit executable arm64  ✅ 안심하세요, 이건 문제없음
> ```

### 6.3 중요 수정: 최종적으로 안정적으로 쓸 수 있는 건 gcc12 / arm64 네이티브 버전이다

여기까지 적다가 큰일 하나 짚고 넘어가야겠습니다. 그것도 **자기 정정** 형태로요. 위 6.1절에서 '왜 main 브랜치(gcc8)를 써야 하나'라고 풀었던 추론은, 제가 초기에 플랫폼 빌드 스크립트 코드만 읽고 내린 **이론적 판단**이었습니다. 스크립트 논리 자체는 맞습니다. 하지만 '어느 버전을 깔아야 안정적일까'는 코드만 보고 찍어서는 부족합니다. 결국 실기기에서 컴파일, 플래싱, 실행까지 전부 통과해야 정답으로 인정됩니다.

**실제 보드에서 테스트, 컴파일, 플래싱을 전부 통과한 최종 환경을 역추적해 보니, 진짜로 안정적이고 Apple Silicon 네이티브 arm64(Rosetta 번역 불필요)인 버전은 gcc 12.2.0, 실행 파일 접두사 `riscv-wch-elf-gcc`였습니다.** 예전에 걱정했던 'gcc12 브랜치는 구멍이 많고, 대응 실행 파일이 없을 수도 있다'는 것은 실측 결과와 맞지 않았습니다. 이 버전 도구 체인은 존재할 뿐만 아니라, 이 컴파일러 모음 중 가장 완전하고 최신이며 가장 잘 돌아가는 버전입니다. 게다가 GDB 디버거까지 추가로 들어 있어서 한 번에 다 갖춰집니다.

그래서 결론이 뒤집어졌습니다. **지금 설치하신다면, gcc 12.2.0 / arm64 네이티브 / `riscv-wch-elf-gcc` 이 세트를 목표로 하세요.** 앞의 6.1절에서 다뤘던 gcc8/x86_64를 Rosetta로 돌리는 경로는 '설정상 그렇게 깔렸어도 당황하지 마세요, 똑같이 쓸 수 있습니다'라는 안전망 설명으로만 남겨두면 됩니다. 굳이 그쪽을 쫓을 필요는 없습니다.

이 '추측이 틀려서 다시 고친' 과정을 글에서 슬쩍 지우지 않고 그대로 남겨두는 이유는, 이 자체가 꽤 가치 있는 경험이기 때문입니다. **빌드 스크립트를 읽고 버전 번호 규칙을 보면 '왜 이런 현상이 벌어지는가'를 이해할 수 있습니다. 하지만 '결국 어느 버전을 깔아야 하나' 같은 결론적 판단은 실제 컴파일과 플래싱을 한 번 돌려보는 것으로 검증해야 합니다. 코드만 보고 추론하면 지나치게 보수적인 결론에 도달할 수 있습니다.**

### 6.4 최종 환경 확인: 완전한 기술 사양

아래 표는 실제로 컴파일과 업로드에 성공한 환경을 모조리 뒤져서 얻은 완전한 정보입니다. 이 세트를 목표로 삼아 맞춰가시길 권합니다:

| 카테고리 | 컴포넌트 / 필드 | 값 |
| --- | --- | --- |
| 컴파일러 | 이름 | xPack GNU RISC-V Embedded GCC(**WCH 커스텀 버전**, MounRiver Studio에 딸려 오는 것과 동일) |
| 컴파일러 | 실행 파일 이름 | `riscv-wch-elf-gcc`(전체 도구가 `riscv-wch-elf-` 접두사로 통일) |
| 컴파일러 | GCC 버전 | **12.2.0** |
| 컴파일러 | 타깃 트리플(target triple) | `riscv-wch-elf` |
| 컴파일러 | 빌드/실행 호스트(host) | `aarch64-apple-darwin23.6.0`(**Apple Silicon 네이티브**, Rosetta 경유 안 함) |
| 컴파일러 | 기본 ABI | `ilp32`(32비트, 소프트 플로트 호출 규약) |
| 컴파일러 | 기본 ARCH | `rv32imac`(I 정수 / M 곱나눗셈 / A 원자 / C 압축 명령어) |
| 컴파일러 | ISA spec | 2.2, multilib 활성화 |
| 컴파일러 | 스레드 모델 | single(bare metal, OS 없음) |
| 컴파일러 | C 표준 라이브러리 | **newlib 4.2.0**(`printf` 같은 표준 라이브러리 함수의 구현을 제공) |
| 컴파일러 | binutils(어셈블러/링커 모음) | **GNU binutils 2.38**(`as`, `ld.bfd`, `objcopy`가 모두 여기서 옴) |
| 컴파일러 | 디버거 | 도구 체인에 `riscv-wch-elf-gdb`가 이미 포함, 별도 설치 불필요 |
| 컴파일러 | 바이너리 경로 | `~/.platformio/packages/toolchain-riscv/bin/` |
| 컴파일러 | sysroot | `~/.platformio/packages/toolchain-riscv/riscv-wch-elf/` |
| 컴파일러 | PIO 패키지명 / 패키지 버전 | `toolchain-riscv` @ `1.120200.220829` |
| 컴파일러 | 출처 | xPack(`riscv-none-elf-gcc-xpack`), 상스트림 GCC 12.2.0 기반 빌드 |
| 컴파일 환경 | PlatformIO Core | 6.1.19 |
| 컴파일 환경 | 플랫폼 platform-ch32v | 1.1.0(Community-PIO-CH32V 유지보수) |
| 컴파일 환경 | 프레임워크 framework-wch-noneos-sdk | 2.30000.0(WCH 표준 주변부 라이브러리, bare metal) |
| 컴파일 환경 | 빌드 시스템 | PlatformIO 내장(SCons + Python 기반) |
| 컴파일 환경 | 타깃 칩 | CH32V307VCT6, ChipID `0x30700568`, QingKe V4F @144MHz |
| 업로드 환경 | 업로드 도구 | **wlink 0.1.1**(현재 실사 중, PIO 패키지 `tool-wlink` @ `0.23.241116`) |
| 업로드 환경 | 업로드 프로토콜 | `wlink`(`platformio.ini`의 `upload_protocol`에 대응) |
| 업로드 환경 | 디버거 펌웨어 | WCH-Link v2.18 (v38), 하드웨어는 CH32V305 기반 |
| 업로드 환경 | 대안: OpenOCD | `0.11.0+dev-snapshot`(2026-02-28), PIO 패키지 `2.1100.260228` |
| 업로드 환경 | 대안: wchisp | `0.2.3`, PIO 패키지 `0.23.240914` |
| 업로드 환경 | 대안: minichlink | `0.1.0` |

> 헷갈리지 마세요: **컴파일러 실제 버전은 GCC 12.2.0**입니다. `1.120200.220829`는 PlatformIO가 이 패키지에 붙인 자체 번호(대략 `1.` + `12.2.0` + `0` + 패키징 날짜 `220829`를 합친 것)이지 컴파일러 자체의 버전 번호가 아닙니다. 둘을 섞지 마세요.

**완전한 도구 체인 구성**(전부 `riscv-wch-elf-` 접두사로 통일, 실행 파일 30개, 한 번 설치로 전부 갖춰짐):

- **컴파일/링크 자주 씀**: `gcc` `g++` `c++` `cpp` `ld` `ld.bfd` `as`
- **바이너리 처리**: `objcopy` `objdump` `readelf` `nm` `size` `strip` `strings` `addr2line`
- **아카이브 도구**: `ar` `ranlib` `gcc-ar` `gcc-nm` `gcc-ranlib`
- **디버그/분석**: `gdb` `gdb-py3` `gprof` `gcov` `gcov-tool` `gcov-dump`
- **기타**: `gfortran` `elfedit` `c++filt` `lto-dump`

이 목록을 평소에 외울 필요는 없습니다. 사전처럼 찾아 쓰면 됩니다. 예를 들어, 나중에 어느 함수가 컴파일 뒤 얼마나 차지하는지 보고 싶으면 `riscv-wch-elf-size`를 찾으면 되고, 생성된 명령어를 디스어셈블하고 싶으면 `riscv-wch-elf-objdump -d`를 쓰면 됩니다. 이 도구들은 도구 체인을 설치한 순간 이미 `~/.platformio/packages/toolchain-riscv/bin/`에 조용히 자리 잡고 있습니다.

### 6.5 컴파일러 버전 추적과 업그레이드: 최신 버전은 어디서 보고, 어떻게 올리나

도구 체인은 한 번 깔았다고 끝이 아닙니다. 커뮤니티 버전은 계속 갱신됩니다. 다만 '최신을 어떻게 따라가나'를 이해하려면, 먼저 아주 헷갈리기 쉬운 사실 하나를 짚어야 합니다. **여러분의 컴파일러는 사실 '3단 마트료시카'이고, '최신 버전'이 두 개 있습니다.**

**먼저 이해하기: 3단 구조 + 두 개의 '최신'**

| 단 | 무엇인가 | 현재 최신 | 업데이트 속도 |
| --- | --- | --- | --- |
| ① 여러분이 PIO에서 실제로 쓰는 것(WCH 커스텀 버전) | `riscv-wch-elf` 트리플 + WCH가 QingKe 코어에 넣은 전용 패치 포함 | **GCC 12.2.0**(지금 깐 게 이것) | **거의 안 움직임**, 장기적으로 12.2.0에 머무름 |
| ② ① 의 패키징 주체 | Community-PIO-CH32V가 ①을 PIO 패키지로 다시 포장 | 동일(release 이름 `riscv-none-embed-gcc 12.2.0-3`) | ①을 따라감 |
| ③ 가장 상스트림(vanilla) | xPack의 범용 RISC-V GCC, **WCH 패치 없음** | **GCC 15.2.0**(2025-10-23) | 계속 갱신, 상스트림 GNU GCC를 추격 |

> **핵심 알림**: 인터넷에서 흔히 '커뮤니티 버전이 계속 갱신된다'고 할 때, 그 갱신 대상은 ③(xPack, 이미 15.2.0)이지 여러분이 CH32V에서 실제로 쓰는 ①(WCH 커스텀 버전, 여전히 12.2.0)이 아닙니다. 이 두 라인을 **섞어서 따라가면 안 됩니다.** xPack 15.2.0을 지금 컴파일러에 그냥 끼워 넣으면 WCH가 QingKe 코어에 넣은 전용 패치가 날아가서, CH32V에서 어떤 기능이 동작하지 않을 수 있습니다. **CH32V 개발에는 ①②를 따르는 게 올바른 자세입니다.** ③의 최신을 맹목적으로 따지지 마세요.
>
> 보너스로 작은 스킬 하나: 컴파일러의 완전한 신원 문자열 `riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0`은 세 정보가 한눈에 읽힙니다. `wch-elf`는 WCH 커스텀 표시, `xPack`은 상스트림 패키징 주체, `arm64`는 Apple Silicon 네이티브 버전이라는 뜻입니다.

**내가 지금 설치한 게 정확히 어느 버전인지 확인**

```bash
# 1. PIO 패키지 버전 보기(PlatformIO 자체 번호, 컴파일러 버전과 다름)
pio pkg list | grep -i riscv

# 2. 컴파일러 완전 신원 보기(버전, 타깃 트리플, ABI, ARCH, 빌드 호스트를 전부 볼 수 있음. 이걸 외워 두길 권함)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc -v

# 3. C 라이브러리(newlib) 버전 보기 — printf가 이것의 구현
grep "_NEWLIB_VERSION" ~/.platformio/packages/toolchain-riscv/riscv-wch-elf/include/_newlib_version.h

# 4. binutils(어셈블러/링커) 버전 보기
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-ld.bfd --version

# 5. platform.json이 도구 체인을 어느 소스로 '고정'했는지 보기(업그레이드 시 어느 저장소를 당겨올지 결정)
grep -A3 '"toolchain-riscv"' ~/.platformio/platforms/ch32v/platform.json
```

**최신 버전은 어디서 보나(세 가지 경로, 관련도 순)**

- **경로 1: WCH 공식 / MounRiver(WCH 커스텀 버전의 진짜 상스트림, 가장 관련 있음)**. `riscv-wch-elf`라는 트리플과 WCH 코어 패치의 출처는 WCH 공식 MounRiver Studio입니다. 컴파일러의 빌드 정보에 빌드 경로가 `/Users/mrs/...`라고 적혀 있는데(mrs = MounRiver Studio), 여기서 온 겁니다. 공식 다운로드 페이지는 `www.mounriver.com`에서('MounRiver Studio'와 'Toolchain' 섹션을 찾아보세요), 공식 SDK 저장소는 `github.com/openwch`입니다. 현재 MRS 도구 체인 버전대는 v1.91입니다(Community-PIO-CH32V의 release 설명에 "Update toolchain to v1.91"이라는 원문이 등장).
- **경로 2: Community-PIO-CH32V 패키징 버전(여러분이 PIO에서 실제로 쓰는 것)**. 본질적으로 MounRiver의 WCH 도구 체인을 PlatformIO 패키지로 다시 포장한 것입니다. releases를 보면 PIO 쪽이 언제 새 버전을 따라가는지 가장 먼저 알 수 있습니다: `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`. 알림을 받으려면 페이지 우측 상단 Watch → Custom → Releases를 체크하거나, RSS를 구독하세요: `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases.atom`.
- **경로 3: xPack 상스트림(vanilla, 갱신 가장 빠름, 참고용)**: releases는 `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack/releases`, 버전 히스토리가 가장 잘 정리된 곳은 `npmjs.com/package/@xpack-dev-tools/riscv-none-elf-gcc`이고, 현재 최신은 15.2.0-1.1입니다.

**업그레이드 방법(그리고 반드시 피해야 할 구멍)**

```bash
# ch32v 플랫폼 전체 업그레이드(프레임워크, 도구 체인 포함 — Community-PIO-CH32V가 새 버전을 낼 때 진짜로 갱신됨)
pio pkg update -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git

# 또는 도구 체인 패키지만 따로 업그레이드
pio pkg update -g -t toolchain-riscv
```

> ⚠️ **업그레이드할 때 피해야 할 구멍(19장 FAQ Q3와 연결)**: 5장에서 파들어 갔듯, `platform.json`이 도구 체인 출처를 **Windows 저장소로 하드코딩**해두었습니다. 즉 `pio pkg update`를 돌리거나 플랫폼을 다시 설치하면, 여러분이 힘들게 macOS 네이티브으로 바꿔놓은 게 **Windows 버전으로 덮어씌워질 가능성이 큽니다.** 진짜 당했다면 6.1/6.2의 교체 단계를 다시 한 번 돌리면 됩니다. 영구적으로 해결하려면 플랫폼 저장소를 fork해서 `platform.json`이 기본적으로 macOS 버전을 가리키도록 고쳐서 원천 해결하세요.
>
> 방향을 다시 한 번 강조: 업그레이드의 목적은 Community-PIO-CH32V가 따라간 새 **WCH 커스텀 도구 체인**을 받는 것이지, xPack의 15.2.0을 쫓는 게 아닙니다. PIO에서 CH32V를 다룰 때는 항상 ①②(WCH 커스텀 버전)을 기준으로 삼으세요.

---

## 7. Gatekeeper 격리 해제(하지 않으면 macOS가 '바이러스'로 간주해 막아버립니다)

macOS에는 보안 메커니즘이 있어서, 실행 파일이 네트워크를 통해 다운로드된 것이라면(`git clone`도 포함) 시스템은 그것에 `com.apple.quarantine`이라는 격리 태그를 붙입니다. 이런 파일이 Apple의 서명 인증을 받지 않았다면, 실행할 때 바로 차단됩니다. 에러는 보통 이런 식:

```
"xxx" cannot be opened because the developer cannot be verified
```

아니면 더 직설적으로:

```
killed: 9
```

방금 설치한 컴파일러와 라이터가 전형적인 '미서명 + 네트워크 다운로드' 조합이므로, 미리 격리 속성을 지워야 합니다:

```bash
xattr -dr com.apple.quarantine ~/.platformio/packages/toolchain-riscv
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-wlink
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-openocd-riscv-wch
```

> `-r`은 재귀 파라미터라 디렉터리 아래 모든 파일의 격리 속성을 한 번에 지워줍니다. 어떤 파일에 원래 그 속성이 없더라도 명령이 에러를 뱉지 않으니, '미리 해둬도 손해 없는' 예방 작업으로 안심하고 실행하시면 됩니다.

---

## 8. 도구 체인이 진짜로 돌아가는지 확인

설치가 끝났다고 바로 프로젝트를 열지 말고, 10초 정도 투자해 큰 축 3개가 정상 실행되는지 확인합시다:

```bash
# 컴파일러(6장에서 확인한 최종 버전 기준, gcc12.2.0, arm64 네이티브, Rosetta 불필요)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0

# 만약 깔린 게 gcc8/x86_64 오래된 버전이라면, 명령과 출력은 이렇게 바뀝니다:
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
# riscv-none-embed-gcc (xPack GNU RISC-V Embedded GCC x86_64) 8.2.0

# 플래싱 도구(네이티브 arm64)
~/.platformio/packages/tool-wlink/wlink --version
# wlink 0.1.1

# 디버그 도구(옵션, 네이티브 arm64)
~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd --version
```

> **Rosetta에 대한 작은 알림**: gcc12/arm64 네이티브 버전은 이론적으로 Rosetta가 전혀 필요 없습니다. 하지만 깔린 게 gcc8/x86_64 오래된 버전이라면, 처음 호출할 때 시스템이 Rosetta 2 설치하겠냐고 물어볼 수 있습니다. 확인을 눌러 한 번 설치하면 그만이고, 일회성 작업이라 이후엔 더 이상 묻지 않습니다. 위 명령들이 정상적으로 버전 번호를 뱉어내면, 환경이 다 뚫렸다는 뜻입니다.

---

## 9. 첫 프로젝트 만들기: `platformio.ini` 이해하기

### 9.1 프로젝트 구조는 어떤 모양인가

가장 단순한 PlatformIO 프로젝트의 뼈대는 두 가지뿐입니다:

```
ch32v307-test/
├── platformio.ini      # 프로젝트 설정 파일. "이 프로젝트가 어떤 칩, 어떤 프레임워크, 어떻게 플래싱할지"를 전부 여기에 적습니다
└── src/
    └── main.c           # 여러분의 펌웨어 코드, 프로그램 진입점
```

명령행으로 빈 프로젝트를 만들어도 됩니다(VSCode에서 'New Project'를 클릭해 만들어도 똑같습니다):

```bash
$PIO project init -d ~/ch32v307-test --board ch32v307_evt
```

### 9.2 `platformio.ini`을 한 줄씩 해체하기

프로젝트에서 가장 중요한 설정 파일입니다. 새 프로젝트를 열 때마다 매번 상대하게 되니, 한 줄씩 제대로 짚고 넘어갈 가치가 있습니다. 내용은 대충 이런 모양입니다:

```ini
[env]
platform = ch32v
framework = noneos-sdk
monitor_speed = 115200
; 온보드 WCH-Link 디버거, wlink는 macOS arm64를 네이티브로 지원하는 플래싱 도구
upload_protocol = wlink

[env:ch32v307_evt]
board = ch32v307_evt
; EVT-R1 공장 기본 설정: Flash 256K + SRAM 64K(board 기본값과 동일, 덮어쓸 필요 없음)
; 288K Flash / 32K SRAM 등 다른 레이아웃으로 바꾸려면 먼저 WCH 도구로 option bytes를 수정하고,
; 아래 주석을 풀어 동기화:
; board_upload.maximum_size = 294912
; board_upload.maximum_ram_size = 32768
```

한 줄씩 뜯어보면:

- **`[env]`**: '공용 설정 구역'입니다. 아래에 적은 것은 모든 환경(env)에 적용됩니다. 프로젝트가 나중에 여러 보드를 동시에 지원해야 한다면, 공용 파라미터를 여기에 두면 중복이 줄어듭니다.
- **`platform = ch32v`**: PlatformIO에게 어느 플랫폼을 쓸지 알려줍니다. 즉 우리가 반나절 씨름하며 설치한 `Community-PIO-CH32V` 커뮤니티 플랫폼이죠.
- **`framework = noneos-sdk`**: WCH 공식 표준 주변부 라이브러리(bare metal, OS 스케줄링 없음)를 선택합니다. 가장 클래식하고 자료가 풍부한 입문 프레임워크이기도 합니다. 대응 패키지는 `framework-wch-noneos-sdk`이고, 본문에서 실측 확인한 버전은 `2.30000.0`입니다. 나중에 멀티태스킹을 하고 싶으면 이 줄을 `freertos`나 `rt-thread`로 바꾸면 그만입니다. 다른 설정은 거의 안 건드려도 됩니다. 이것도 PlatformIO 생태계의 이점 중 하나죠.
- **`monitor_speed = 115200`**: 시리얼 모니터(`pio device monitor`)가 쓰는 보드 레이트입니다. **이 숫자는 코드 안의 `USART_Printf_Init()`에 넘기는 인자와 반드시 같아야 합니다.** 양쪽이 안 맞으면 시리얼에서 나오는 건 쓰레기데이터뿐입니다. 초보자가 흔히 빠지는 작은 구멍이기도 하죠.
- **`upload_protocol = wlink`**: PlatformIO에게 어떤 도구로 보드에 프로그램을 굽을지 알려줍니다. 선택 가능한 프로토콜은 여럿입니다(아래 12장에 전체 비교표). macOS arm64 사용자는 `wlink`가 가장 머리 아플 게 없습니다. 네이티브로 지원되니까요.
- **`[env:ch32v307_evt]`**: 구체적인 '환경' 정의입니다. 이름은 마음대로 지어도 되지만, 관리 편의상 보드 모델과 맞추는 게 관례입니다.
- **`board = ch32v307_evt`**: 구체적인 보드 모델을 지정합니다. PlatformIO는 이를 바탕으로 대응하는 핀 정의, Flash/RAM 크기, 기본 클럭 등 파라미터 세트를 통째로 불러옵니다.
- **Flash/RAM 관련 주석**: 여기엔 사람을 헷갈리게 하는 디테일이 숨어 있습니다. EVT-R1 보드의 칩은 실제로 **288KB**의 Flash가 있지만, `board`가 주는 기본값은 **256KB**입니다. 급히 고치려 하지 마세요. 이건 버그가 아닙니다. 공장 기본 option bytes 설정이 256KB Flash + 64KB SRAM으로 나뉘어 있어서 `board` 기본값과 딱 맞기 때문입니다. 초보 단계에서는 이 두 줄 주석을 건드릴 필요가 전혀 없습니다. 나중에 정말 Flash를 288KB까지 꽉 채워 써야 할 때가 오면, 그때 WCH 공식 도구로 칩의 option bytes를 먼저 바꾸고 돌아와서 이 두 줄을 동기화하면 됩니다. 고급 작업이니 입문 단계에서는 일단 접어두세요.

### 9.3 PlatformIO가 만들어준 `main.c` 템플릿 읽기: 'CH32 개발 로직' 세우기

이번 절은 핵심 중 핵심입니다. 처음 PlatformIO가 자동 생성한 `main.c`를 열면, 시작부터 `#if defined(...)` 덩어리가 커다란 덩이로 덮쳐서 "이건 너무 복잡한 거 아닌가" 하고 물러서게 됩니다. 겁먹지 마세요. 뜯어보면 별것 아닙니다. 그리고 이 덩어리를 이해하고 나면, 앞으로 WCH 칩 어떤 것으로 바꿔도 패턴을 초읽기 초로 파악할 수 있습니다.

템플릿 시작은 이런 모양입니다(발췌):

```c
// ① 컴파일 타임 매크로를 보고, 현재 칩에 해당하는 헤더 파일을 자동으로 고름
#if defined(CH32V003)
#include <ch32v00x.h>
#elif defined(CH32V10X)
#include <ch32v10x.h>
#elif defined(CH32V30X) || defined(CH32V31X)
#include <ch32v30x.h>
// ... 뒤에 V20X / X035 / L103 / H417 등 여러 갈래가 더 이어짐
#endif
#include <debug.h>   // ← 이 줄이 핵심: 시리얼 초기화, 딜레이, printf 리다이렉트를 제공
```

**이 코드는 왜 이런 모양일까?** PlatformIO의 템플릿은 WCH **전 시리즈 칩**에 범용으로 쓰는 코드 한 부분이기 때문입니다. `CH32V003`, `CH32V307`, `CH32X035`... 수십 종의 칩이 같은 `main.c` 뼈대를 공유합니다. 컴파일 타임에 `#if defined(...)` 무리로 여러분이 어느 칩을 쓰는지 자동으로 '추론'한 뒤, 제조사 헤더 파일을 `#include`합니다. 이 매크로들은 `platform = ch32v`와 `board = ch32v307_evt` 조합이 배경에서 자동으로 정의해주니, 여러분이 직접 쓸 필요는 없습니다.

**CH32V307 입장에서 진짜로 효과가 있는 건 사실 두 줄뿐입니다:**

```c
#include <ch32v30x.h>   // CH32V30X 시리즈의 주변부 정의(레지스터, GPIO_InitTypeDef 등이 모두 여기서 옴)
#include <debug.h>      // 핵심 디버그 보조 라이브러리
```

이 사실을 이해하고 나면, `#if defined` 덩어리는 더 이상 '복잡한 로직'이 아니라 '다중 선택 스위치'일 뿐입니다. 이 패턴을 알고 나면, 앞으로 CH32 시리즈의 새 보드를 잡았을 때 비슷한 템플릿 코드를 봐도 당황하지 않게 됩니다. **이게 소위 'CH32 개발 로직'입니다. 먼저 보드가 어느 시리즈 헤더 파일에 대응하는지 보고, 다음으로 `debug.h`가 어떤 보조 함수를 제공하는지 살핍니다.**

### 9.4 `debug.h` 안에는 도대체 뭐가 숨어 있나

이 헤더 파일은 WCH 공식 SDK에 딸려 오는 것으로, 거의 모든 CH32 프로젝트에서 쓰입니다. 미리 이 친구가 제공하는 함수 몇 개를 알아두면 삽질을 크게 줄일 수 있습니다:

```c
void Delay_Init(void);                        // 딜레이용 시스템 타이머 초기화
void Delay_Us(uint32_t n);                    // 마이크로초 단위 딜레이
void Delay_Ms(uint32_t n);                    // 밀리초 단위 딜레이
void USART_Printf_Init(uint32_t baudrate);    // USART1 초기화, printf를 USART1로 리다이렉트
```

짝이 되는 `debug.c`(이것도 SDK에 포함, 직접 짤 필요 없음)에는 C 표준 라이브러리가 요구하는 저수준 `_write()` 함수가 이미 구현되어 있고, 이것이 USART1에 연결되어 있습니다. **즉 여러분이 리다이렉트 코드를 직접 짤 필요가 전혀 없습니다. `USART_Printf_Init(115200)`을 한 번 부르기만 하면, 이후에는 그냥 `printf(...)`를 쓰는 것만으로 시리얼에 출력이 나옵니다.** MCU 초보자가 놓치기 쉬운데 엄청나게 편리한 기능입니다. 뒤에 나올 '시리얼 출력 없음' 구멍을 밟고 나면 이 한 줄 코드에 깊이 감사하게 될 겁니다.

### 9.5 '컴파일은 되지만 아무 일도 안 하는' 최소 예제

Hello World로 들어가기 전에, 가장 기본적인 점등 코드를 보며 CH32 GPIO 조작의 기본 패턴을 한번 느껴봅시다:

```c
#include <ch32v30x.h>   // CH32V30X 시리즈 헤더, board 설정이 어느 것을 가져올지 자동 결정
#include <debug.h>

#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);   // 인터럽트 우선순위 그룹 설정(표준 오프닝)
    SystemCoreClockUpdate();                          // 시스템 클럭 변수 갱신(역시 표준 오프닝)
    Delay_Init();                                     // 딜레이 기능 초기화

    GPIO_InitTypeDef GPIO_InitStructure = {0};

    BLINKY_CLOCK_ENABLE;                               // ① 먼저 GPIOA 주변부에 '전원 공급'(클럭 인에이블)
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;           // ② PA0 핀 선택
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;    // ③ 모드: 푸시풀 출력
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;   // ④ 토글 속도
    GPIO_Init(GPIOA, &GPIO_InitStructure);              // ⑤ 설정을 레지스터에 진짜로 기록

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(GPIOA, GPIO_Pin_0, ledState);   // PA0 레벨을 ledState로 설정
        ledState ^= 1;                                 // 레벨 반전, 다음 회차는 반대로
        Delay_Ms(500);                                  // 500ms 멈춤, '깜빡임' 느낌 연출
    }
}
```

**이 GPIO 초기화 4단 고정 패턴을 기억해 두세요.** 앞으로 CH32 프로젝트에서 주변부 초기화를 짤 때마다 이 패턴의 변형일 뿐입니다:

1. **클럭 켜기**: STM32 계열(CH32의 주변부 라이브러리 스타일은 거의 STM32 표준 라이브러리를 복사한 수준)의 특성상, 모든 주변부는 기본적으로 '전원 꺼짐' 상태입니다. 쓰기 전에 반드시 `RCC_XXXClockCmd(...)`로 대응하는 클럭을 수동으로 인에이블해야 합니다. 이 단계를 잊으면 주변부는 장식품이라, 아무리 설정을 바꿔도 반응이 없습니다.
2. **구조체 채우기**: `XXX_InitTypeDef` 구조체를 선언하고, 원하는 모드/속도 등 파라미터를 하나하나 채워 넣습니다.
3. **`XXX_Init()` 호출**: 구조체를 대응하는 초기화 함수에 '먹이면', 파라미터가 비로소 칩 레지스터에 기록됩니다.
4. **`while(1)` 안에서 일하기**: 대응하는 읽기/쓰기 함수(예: `GPIO_WriteBit`)로 주변부를 다룹니다.

자, 이론은 끝났으니 진짜로 컴파일하고 플래싱해 봅시다. 그리고 나면, 이론상 문제없는 코드조차 실전에서는 '예상치 못한' 구멍을 만난다는 걸 깨닫게 됩니다.

---

## 10. 첫 컴파일

만반의 준비가 끝났습니다. 컴파일을 한 번 돌려봅니다:

```bash
$PIO run -d ~/ch32v307-test        # 또는 프로젝트 디렉터리로 cd 한 뒤 pio run
```

첫 컴파일은 WCH의 `noneos-sdk` 프레임워크(전체 주변부 드라이버 소스 포함)를 자동으로 다운로드합니다. 30~60초 정도 걸립니다. 컴파일 성공 출력은 이런 모양입니다:

```
Linking .pio/build/ch32v307_evt/firmware.elf
RAM:   [          ]   3.2% (used 2080 bytes from 65536 bytes)
Flash: [          ]   0.7% (used 1728 bytes from 262144 bytes)
Building .pio/build/ch32v307_evt/firmware.bin
========================= [SUCCESS] Took 47.36 seconds =========================
```

초록색 `[SUCCESS]`가 보이면, VSCode → pio → macOS 네이티브 컴파일러까지 도구 체인 전 라인이 다 뚫렸다는 뜻입니다. 자기 자신에게 박수 한 번 쳐줍시다. 컴파일 결과물은 `.pio/build/ch32v307_evt/` 디렉터리 아래에 있습니다:

- `firmware.elf`: 디버그 심볼 완전 포함. 디버그할 때 사용.
- `firmware.bin`: 순수 바이너리. 플래싱할 때 쓰는 게 이것입니다.

RAM/Flash 점유 두 줄은 눈여겨볼 가치가 있습니다. 뒤에 `printf` 기능을 추가하고 나면 Flash 점유가 체감 가능하게 한 단계 뜁니다. 정상 현상이니 놀라지 마시고, 13장에서 그 이유를 구체적으로 설명합니다.

---

## 11. `pio`를 전역 명령으로 설정

매번 `~/.platformio/penv/bin/pio`라는 긴 명령을 치는 건 영 귀찮습니다. 시스템 PATH 안의 디렉터리 하나로 심볼릭 링크를 겁니다. Apple Silicon Mac에서 Homebrew의 기본 설치 경로는 `/opt/homebrew/bin`이고, 이 디렉터리는 보통 현재 사용자(admin 그룹 소속)에게 쓰기 권한이 있습니다:

```bash
if [ -w /opt/homebrew/bin ]; then
  ln -sf ~/.platformio/penv/bin/pio /opt/homebrew/bin/pio
  ln -sf "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" /opt/homebrew/bin/code
fi
```

확인:

```bash
pio --version      # PlatformIO Core, version 6.1.19
code --version     # VSCode 버전 번호
```

> 만약 `/opt/homebrew/bin`이 쓰기 불가라면(드문 경우), 자신이 쓸 수 있는 다른 디렉터리로 바꿉니다. 예를 들어 `~/.local/bin`을 만들고, 그걸 shell PATH에 추가:
> ```bash
> mkdir -p ~/.local/bin
> ln -sf ~/.platformio/penv/bin/pio ~/.local/bin/pio
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
> ```
> `~/.zshrc`를 수정한 뒤에는 새 터미널 창을 열거나 `source ~/.zshrc`를 실행해 설정을 적용해야 합니다.

이제부터 이 글에서 `$PIO`나 `~/.platformio/penv/bin/pio`로 적힌 모든 곳은 그냥 `pio`로 줄여 쓰면 됩니다.

---

## 12. 하드웨어 연결과 플래싱

### 12.1 배선: USB 포트를 잘 잡기

EVT-R1 보드에는 보통 USB 포트가 두 개 있습니다. **플래싱/디버그는 온보드 WCH-Link에 연결된 포트에 꽂아야 합니다.**(보드 실크에 대개 DEBUG / Link / WCH-Link라고 적혀 있습니다.) USB-Device라고 적힌 포트가 아닙니다. 두 포트는 기능이 완전히 다르고, 잘못 꽂으면 장치 관리자에 아예 안 보입니다. macOS는 CDC 시리얼 드라이버를 내장하고 있어서, 꽂으면 바로 씁니다. 추가 드라이버 설치 불필요라는 점에서 Windows보다 훨씬 편합니다.

### 12.2 WCH-Link의 두 가지 모드

WCH-Link라는 디버거 칩에는 동작 모드가 두 개 있습니다. **RV 모드**(RISC-V 칩 서비스)와 **DAP 모드**(ARM 칩 서비스). 우리의 CH32V307은 RISC-V 코어이므로, 디버거가 **RV 모드**여야 정상 플래싱이 됩니다. 보드는 공장에서 보통 기본적으로 RV 모드입니다. 플래싱이 계속 실패한다면 `wlink` 명령이나 WCH 공식 도구로 모드를 전환해 확인해 보세요:

```bash
# 현재 연결된 WCH-Link 장치 목록
pio pkg exec -- wlink list          # 또는 경로가 PATH에 있다면 wlink list를 직접
```

### 12.3 본격 플래싱

**방법 1: 명령행**

```bash
cd ~/ch32v307-test
pio run -t upload
```

앞서 `platformio.ini`에 적어둔 `upload_protocol = wlink`가 바로 이 단계에서 효력을 발휘합니다. PlatformIO가 macOS 네이티브 wlink 도구를 호출해서 WCH-Link를 통해 `firmware.bin`을 칩에 써 넣습니다.

**방법 2: VSCode 그래픽 인터페이스**

프로젝트 폴더를 열고 왼쪽 아래 PlatformIO 도구 모음의 아이콘 줄에서 화살표 아이콘(Upload)을 누르면 됩니다. 명령행과 효과는 동일합니다. 마우스 클릭을 선호하시면 이쪽으로 가셔도 됩니다.

플래싱 성공 시 `wlink`는 디버거와 칩의 상세 정보를 출력합니다. 참고로 아주 유용합니다:

```
04:17:53 [INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
04:17:53 [INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
04:17:53 [INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
04:17:54 [INFO] Flash done
04:17:54 [INFO] Now reset...
```

첫 줄의 `v2.18(v38)`이 WCH-Link 디버거 자체의 펌웨어 버전입니다. 세 번째 줄에서 칩의 실제 Flash 용량이 288KB라는 것(9장에서 언급한 디테일과 연결)을 볼 수 있고, 칩만의 고유 UID도 나옵니다. 제품 시리얼화할 때 요긴할 수 있습니다.

### 12.4 플래싱 프로토콜 선택

`board` 정의 안에는 플래싱 프로토콜이 여러 개 지원됩니다. 필요에 따라 바꾸면 됩니다:

| 프로토콜 | 하위 도구 | 설명 |
|---|---|---|
| `wch-link` | openocd(`0.11.0+dev-snapshot`, PIO 패키지 `2.1100.260228`) | 기본 프로토콜, openocd를 통해 WCH-Link에 접근 |
| `wlink` | wlink(도구 버전 `0.1.1`, PIO 패키지 `tool-wlink@0.23.241116`) | **macOS 사용자에게 추천**. 네이티브, 가볍고, 빠름. 본문에서 실제로 사용 중인 프로토콜 |
| `minichlink` | minichlink(`0.1.0`) | 커뮤니티가 유지보수하는 또 다른 가벼운 도구, 대안 |
| `isp` | wchisp(`0.2.3`, PIO 패키지 `0.23.240914`) | USB Bootloader 모드로 플래싱. BOOT0 핀을 high로 당겨 bootloader에 진입해야 해서, WCH-Link가 없는 상황에 적합 |

### 12.5 디버그(중단점, 한 단계씩 실행)

VSCode에서 **F5**를 누르면 바로 디버그 세션이 시작됩니다(내부적으로 openocd + RISC-V GDB가 협동). 중단점 설정, 한 단계씩 실행, 변수와 레지스터의 실시간 값 확인이 가능합니다. 보드에 대응하는 SVD 레지스터 설명 파일(`CH32V307xx.svd`)이 board 설정에 이미 지정되어 있어서, 주변부 레지스터의 시각화 확인도 별도 설정 없이 바로 됩니다. 이 주제는 더 파고들면 글 한 편이 또 나옵니다. 여기서는 '이 정도면 충분하다' 정도만 짚고 넘어가겠습니다.

---

## 13. 구멍 ①: 컴파일과 플래싱은 성공했는데, 시리얼이 완전히 고요함

도구 체인이 뚫리고, 플래싱이 성공한 뒤 "이제 다 됐다!"며 신나게 시리얼 모니터를 여는 순간, 멍해집니다.

### 증상

```bash
pio run              # 컴파일 성공 ✅
pio run -t upload    # 플래싱 성공 ✅
pio device monitor   # 시리얼 모니터 열기 → 완전히 빈 화면, 유령도 안 보임
```

컴파일 에러도 없고, 플래싱도 성공을 확인했고, 시리얼 모니터도 분명히 그 `/dev/cu.usbmodem***`(온보드 WCH-Link가 가상으로 만들어낸 시리얼 장치)에 연결되었습니다. 그런데도 **한 글자도 받지 못합니다.** 이쯤 되면 보드레이트를 잘못 넣었나, 드라이버를 잘못 깔았나, 보드가 고장 났나 의심하기 시작합니다.

### 원인: 사실 엄청 단순합니다

코드를 열어보면 바로 답이 나옵니다. **PlatformIO가 기본으로 만들어준 템플릿 코드에는 시리얼 초기화가 전혀 없고, 코드 어디에도 `printf` 한 줄 없습니다.** 그저 'GPIO 설정 → while 루프에서 레벨 토글 → 딜레이'라는 순수 점등 프로그램입니다. 처음부터 끝까지 시리얼로 바이트 한 바이트 보낸 적이 없으니, 시리얼이 받지 못하는 게 당연합니다. 회로가 고장 난 게 아니라, 코드가 애초에 말을 할 생각이 없었던 겁니다.

> 온보드 WCH-Link가 가상으로 만드는 시리얼(업계에서 VCP, 가상 시리얼이라고 부름)은 기본적으로 타깃 칩의 **USART1(PA9 = TX, PA10 = RX)**로 다리 놓아집니다. 하드웨어 링크는 완전히 뚫려 있습니다. 단지 프로그램이 아무것도 밖으로 안 보내는 것뿐입니다.

### 해결: 초기화 + printf 추가

앞서 9장에서 `debug.h`의 `USART_Printf_Init()` 함수를 이미 만났습니다. 이제 정식으로 써먹을 차례입니다. 두 줄이면 해결됩니다:

```c
Delay_Init();

// USART1(PA9/PA10)은 온보드 WCH-Link의 가상 시리얼 경유. SDK의 _write가 이미 printf를 여기로 리다이렉트
USART_Printf_Init(115200);
printf("CH32V307 booted, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);
```

`while(1)` 루프에도 한 줄 출력을 추가해, 프로그램이 실행 중임을 실시간으로 볼 수 있게 합니다:

```c
while (1) {
    GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
    printf("LED %u\r\n", ledState);
    ledState ^= 1;
    Delay_Ms(100);
}
```

다시 컴파일하고 플래싱하면 시리얼이 바로 삽니다:

```
CH32V307 booted, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

> **작은 팁**: `printf`를 추가한 뒤에는 Flash 점유가 0.7%(1728바이트)에서 약 2.8%(7440바이트 안팎)로 뜁니다. `printf`가 형식화 문자열 처리 로직 전체를 펌웨어에 링크하기 때문입니다. 정상 현상입니다. `printf`는 공짜가 아닙니다. 공간을 디버깅 편의로 바꾸는 트레이드오프일 뿐이니 놀라거나 이 몇 KB에 집착하지 마세요.

### 앞으로 시리얼 출력이 없을 때, 이 순서대로 점검

이번 경험을 일반적인 점검 체크리스트로 정리해 둡니다. 저장해 두고, 비슷한 문제를 만나면 바로 대조해 보세요:

1. **코드 안에 진짜로 `USART_Printf_Init` 호출이 있고, 진짜로 `printf`를 짰는가?**(본문에서 가장 흔하면서도 가장 놓치기 쉬운 구멍. 먼저 이걸 점검)
2. **보드레이트가 맞는가?** 코드 안의 `USART_Printf_Init(115200)`은 `platformio.ini`의 `monitor_speed`와 일치해야 합니다. 어느 한쪽만 바꾸고 동기화를 안 하면, 받는 건 쓰레기데이터이거나 빈 화면입니다.
3. **WCH-Link의 가상 시리얼 기능이 실수로 꺼지지 않았는가?**(WCH 공식 WCH-LinkUtility 도구로 확인 가능)
4. **여러분이 진짜 원하는 게 '칩 자체가 USB 시리얼이 되는 것'(USB CDC)이 아닌가?** 그렇다면 그건 또 다른, USB 프로토콜 스택이 필요한 펌웨어 방안입니다. 여기서 다루는 USART1 + WCH-Link 브릿지와는 완전히 다른 길이니, 섞지 마세요.

---

## 14. 구멍 ②(글 전체에서 가장 큰 구멍): 시리얼은 말하기 시작했는데, LED는 도통 켜지지 않음

이건 전체 삽질 중 가장 사람 미치게 만드는 구멍입니다. 왜냐면 **소프트웨어와는 거의 상관이 없고**, 순수 하드웨어 설계 문제이기 때문입니다. 코드를 아무리 잘 짜도 답이 없습니다. 조금 인내를 갖고 이 절을 끝까지 읽으시면, 코드를 보며 머리 쥐어뜯는 시간을 적어도 30분은 아낄 수 있습니다.

### 증상

시리얼은 이때 이미 정상적으로 출력됩니다(즉 펌웨어가 확실히 정상 실행 중이고, 멈추거나 HardFault가 난 게 아님). **근데 보드 위에서 깜빡이는 LED는 눈을 씻고 찾아봐도 안 보입니다.**

### 원인: 온보드 사용자 LED는 공장 출고 시점부터 '끊어져 있습니다'

**이 보드의 사용자 LED 두 개(실크 LED1, LED2)는 공장에서 MCU 핀에 아예 연결되지 않았습니다. 완전히 떠 있는 상태입니다.** 구체적으로, 한쪽 끝만 GND에 붙어 있고 다른 쪽은 외로운 솔더 패드나 핀 헤더 구멍 하나로 남겨져 있습니다. 여러분이 직접 선을 연결해 주길 기다리는 거죠. 이건 어떤 보드 하나의 개별 불량이 아니라 WCH 공식 회로도(`CH32V30xSCH.pdf`) 자체가 원래 이렇게 설계되어 있습니다.

즉, **여러분의 코드가 PC1을 토글하든 PD0을 토글하든 PA0을 토글하든, 점퍼선 한 대기로 그 핀을 LED 패드에 직접 연결하지 않는 한 LED는 절대 켜지지 않습니다.** 순수 하드웨어 문제라 소프트웨어 코드를 아무리 화려하게 짜도 소용없습니다.

이 구멍을 밟은 게 저 혼자만은 아닙니다. 여러 독립 출처가 서로 교차 검증해 줍니다: Zephyr 공식 문서의 이 보드 설명에 "온보드 LED는 회로 설계상 SoC에 연결되어 있지 않다"고 명시되어 있습니다. 중국어로 된 WCH CH32V307EVT-R1 사용 설명서에도 보드 위 사용자 LED 두 개가 어느 GPIO 핀에도 연결되어 있지 않아, 사용자가 직접 배선해야 점등할 수 있다고 나옵니다. 온보드 사용자 버튼 KEY도 마찬가지로 떠 있어서, 같은 구멍을 한 번 더 밟게 됩니다.

> **그 보드 위에서 유일하게 기본적으로 연결되어, 전원 넣으면 바로 켜지는 게 전원 표시등입니다.** 여러분이 처음 USB를 꽂은 순간 계속 켜져 있는 바로 그 불이죠. 코드와는 아무 상관이 없습니다. "점등 성공!"으로 오해하기 딱 좋은데, 사실 MCU가 통제하지 않는 불입니다.

### 수리: 소프트웨어 + 하드웨어 양단 작업

**1단계: 토글할 핀 선택**

WCH 공식 GPIO 예제 코드에서 관행적으로 쓰는 핀은 **PA0**입니다. 자료가 가장 풍부하고 커뮤니티 논의도 가장 많아 추가 구멍을 밟을 확률이 가장 낮습니다. 그래서 코드의 점등용 핀을 PA0으로 통일합니다:

```c
// EVT-R1의 사용자 LED는 기본 떠 있음(MCU에 연결 안 됨). 점퍼선으로 PA0을 LED1에 다리 놓아야 점등
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)
```

> ⚠️ **연달아 나오는 작은 구멍**: 다른 포트(예: 템플릿 원래의 PC1)에서 PA0으로 바꿀 때, **반드시 클럭 인에이블 줄도 함께 `RCC_APB2Periph_GPIOA`로 바꿔주세요.** 저도 여기서 진짜 구멍을 밟은 적 있습니다. 핀 정의만 고치고 클럭 인에이블을 GPIOA로 바꾸는 걸 잊었더니, GPIOA 주변부 클럭이 아예 켜지지 않아 PA0 레벨이 꿈쩍도 안 하더라고요. 반나절 코드 로직을 들여다보다가 결국 '한 군데 고치고 한 군데 빠뜨린' 전형적인 실수였음을 깨달았습니다. 포트 설정을 바꾼 뒤에는 관련 매크로 정의 전체를 한 번 훑어주세요. 절반만 고치는 일이 없도록.

**2단계: 점퍼선 한 대기를 물리로 꽂기(둘 중 하나 선택)**

- **방안 A(온보드 LED1 사용, WCH 공식 추천 방식)**: 점퍼선을 한 대 찾아, 한쪽 끝은 **PA0**(Arduino 소켓에서 `A0`라고 적힌 구멍)에, 다른 쪽은 보드 실크에 `LED1`이라고 적힌 솔더 패드에 꽂습니다. 패드의 정확한 위치는 EVT 자료 패키지의 `CH32V30xSCH.pdf` 회로도를 참고해 찾으세요.
- **방안 B(직접 LED 한 개 추가, 가장 확실하고 직관적)**: 일반 LED 한 개에 330Ω~1kΩ의 전류 제한 저항을 직렬로 달아 **PA0과 GND 사이**에 연결합니다. 극성을 반대로 꽂아도 괜찮습니다. 코드가 계속 높낮은 레벨을 토글하니 어느 쪽으로 꽂든 한 방향은 점등합니다. 차이는 '어느 반주기에 불이 들어오느냐'뿐입니다.

배선이 끝난 뒤 `pio run -t upload`를 다시 실행하면, LED1이 100ms 박자로 깜빡이기 시작하고 동시에 시리얼에는 `LED 0 / LED 1`이 동기화돼서 찍힙니다. 이때 비로소 진정한 의미의 'Hello World'가 통과된 겁니다.

> **왜 WCH는 LED를 떠 있는 상태로 설계했을까요?** 아마도 '개발자에게 더 큰 자유도를 주기 위해서'일 겁니다. LED나 버튼을 프로젝트에서 쓰고 싶은 어느 GPIO에든 연결할 수 있게 해서, 공장에서 납땜해 고정된 핀에 속박하지 않겠다는 거죠. 의도는 좋습니다. 하지만 처음 보드를 잡는 초보에겐 극도로 불친절합니다. 보드를 처음 열었을 때 드는 첫 생각이 '배선을 해야 점등이 되는구나'가 아니라 '내 코드 어디가 잘못된 거지'일 테니까요.

### 좀 더 깊은 깨달음: 소프트웨어 문제인지 하드웨어 문제인지부터 가르기

이 구멍이 진짜로 주는 가치는 'PA0에 점퍼선을 꽂아야 한다'는 구체적 디테일이 아닙니다. 임베디드 디버깅에서 통용되는 점검 사고방식을 가르쳐준다는 데 있습니다:

**'반응 없음'은 '코드가 틀렸음'과 동의어가 아닙니다.** 주변부 반응이 없을 때 가장 먼저 할 일은 '펌웨어가 진짜로 그 로직까지 도달했는지'를 증명할 방법을 찾는 것이지, 곧바로 코드 로직과 사투를 벌이는 게 아닙니다. 이번에 이렇게 빨리 하드웨어 문제를 특정할 수 있었던 건 **시리얼이 먼저 글자를 뱉었기 때문**입니다. 시리얼이 정상적으로 출력된다는 건 메인 루프가 정상적으로 돌고 있다는 뜻이고, 어디서 멈추지도 않았다는 뜻이죠. '소프트웨어 층은 정상 동작'을 먼저 확인하고 나면, 남은 '반응 없음'은 대개 하드웨어 링크에 한정됩니다. 그래서 새 프로젝트의 첫 번째 작업을 시리얼 뚫기로 권하는 겁니다. 고장 배제에 가장 빠르고 직관적인 자입니다.

---

## 15. 다 뚫고 난 뒤, 완성된 `main.c`는 이런 모양

앞의 두 구멍에 대한 수정을 합치면, 최종적으로 정상 동작하는 전체 코드가 나옵니다. PlatformIO가 만들어준 원본 템플릿보다 시리얼 초기화와 출력 문이 추가된 버전입니다:

```c
#include <ch32v30x.h>
#include <debug.h>

// EVT-R1의 사용자 LED는 기본 떠 있음(MCU에 연결 안 됨). 점퍼선으로 PA0을 LED1에 다리 놓아야 점등
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void NMI_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void HardFault_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
    SystemCoreClockUpdate();
    Delay_Init();

    // USART1(PA9/PA10)은 온보드 WCH-Link의 가상 시리얼 경유. SDK의 _write가 이미 printf를 여기로 리다이렉트
    USART_Printf_Init(115200);
    printf("CH32V307 booted, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);

    GPIO_InitTypeDef GPIO_InitStructure = {0};
    BLINKY_CLOCK_ENABLE;
    GPIO_InitStructure.GPIO_Pin = BLINKY_GPIO_PIN;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(BLINKY_GPIO_PORT, &GPIO_InitStructure);

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
        printf("LED %u\r\n", ledState);
        ledState ^= 1;
        Delay_Ms(100);
    }
}

void NMI_Handler(void) {}
void HardFault_Handler(void) { while (1) {} }
```

코드 끝의 두 인터럽트 핸들러 함수에 대해 한마디 합시다. `NMI_Handler`와 `HardFault_Handler`는 RISC-V/ARM MCU에서 아주 흔한 두 개의 '예외 처리' 함수입니다. `__attribute__((interrupt("WCH-Interrupt-fast")))` 수식어는 컴파일러에게 "이건 인터럽트 서비스 함수니까 인터럽트 방식대로 코드를 생성해 줘"(예: 자동으로 레지스터 저장/복구)라고 알려줍니다. 여기서 구현은 아주 단순합니다. `HardFault_Handler` 안에서 `while(1){}`로 무한 루프를 돌며 멈춰버리는 보수적이면서도 효과적인 방식입니다. 프로그램이 진짜로 날아가 하드웨어 예외가 터졌을 때, 칩이 잘못된 상태로 계속 돌아다니게 두느니 차라리 여기서 멈춰두는 게 디버거를 연결해 당시 상태를 들여다보기에 편합니다. 나중에 프로젝트가 커지면 여기에 에러 로그, LED 알람 같은 로직을 추가하면 됩니다. 지금은 이 정도 역할만 알아도 충분합니다.

전체 프로젝트 코드(`platformio.ini` 포함)는 GitHub에 올려뒀습니다. 링크는 글 맨 끝에 있으니 바로 clone해 돌려보셔도 됩니다.

---

## 16. 삽질 요약 표

글 전체의 모든 구멍을 한 번에 정리합니다. 나중에 찾아보기 편하게요:

| # | 현상 | 원인 | 해결 |
| --- | --- | --- | --- |
| 1 | 플랫폼 설치 시 `repository not found` | GitHub 조직 이름 오타, 정확히는 `Community-PIO-CH32V`(PIO 포함, 대문자) | 올바른 조직 이름 주소 사용 |
| 2 | `pio platform install`이 deprecated 표시 | 새 버전 PlatformIO는 `pkg` 서브명령으로 통일 | `pio pkg install -g -p <주소>`로 변경 |
| 3(핵심) | 플랫폼 설치는 됐는데 도구 체인 디렉터리가 온통 `.exe`, 컴파일 필히 실패 | `platform.json`이 도구 체인 출처를 Windows 저장소로 하드코딩, 설치 시 운영체제 판단 안 함 | Windows 버전을 지우고 `toolchain-riscv-mac`과 `tool-wlink`를 수동으로 설치(`mac_arm64`/`mac_x64` 브랜치) |
| 4 | 도구 체인 브랜치 잘못 깔아 컴파일러 실행 파일을 못 찾는다는 에러 | 빌드 스크립트가 도구 체인 버전 번호의 두 번째 마디로 컴파일러 접두사를 자동 선택(`1.8.x`→`riscv-none-embed`, `1.12.x`→`riscv-wch-elf`), 깐 버전과 실제 존재하는 실행 파일이 안 맞음 | 먼저 `ls`로 실제 깔린 실행 파일 이름을 정확히 보고, 그에 맞춰 사용 |
| 5 | 컴파일러/라이터 실행 시 '개발자를 확인할 수 없음' 또는 `killed: 9` | macOS가 네트워크 다운로드된 미서명 바이너리에 격리 속성 부여 | `xattr -dr com.apple.quarantine <디렉터리>` |
| 6 | x86_64 아키텍처 컴파일러가 Apple Silicon에서 '물 토하지 않을까' 걱정 | xPack 초기엔 arm64 빌드가 없어서 Rosetta 2 번역 필요 | 문제 아님. Rosetta 설치하면 컴파일 완전 정상 |
| 7 | `pio`를 `/usr/local/bin`에 심볼릭 링크하려니 실패 | 이 디렉터리는 root 소유라 일반 사용자에겐 쓰기 권한 없음 | `/opt/homebrew/bin` 또는 자체 제작 `~/.local/bin`으로 바꾸고 PATH에 추가 |
| 8 | 컴파일, 플래싱 모두 성공인데 시리얼 모니터가 빈 화면 | 템플릿 코드는 순수 점등 루프일 뿐, **시리얼 초기화도 없고 어떤 `printf`도 없음** | `USART_Printf_Init(115200)` 호출 후 `printf` 정상 사용(SDK가 이미 이것을 USART1로 리다이렉트) |
| 9(본문 최대 구멍) | 시리얼은 정상 출력인데 보드 위에서 깜빡이는 LED가 안 보임 | **온보드 사용자 LED는 공장 기본 떠 있고, MCU 핀에 아예 연결 안 됨** | 점퍼선 한 대로 PA0을 LED1에 다리 놓기(또는 외부 LED + 전류 제한 저항을 GND에 직접 연결) |
| 10(파생 구멍) | PA0으로 바꾼 뒤에도 LED가 안 켜짐 | 포트 변경 시 **대응 클럭 인에이블 매크로 변경을 깜빡함** | 포트 정의와 클럭 인에이블을 반드시 동기화, 바꾼 뒤 전체를 다시 훑기 |

**이번 삽질의 가장 큰 수확을 한마디로**: 임베디드 개발에서 '반응 없음'은 결코 '코드가 틀렸음'과 동의어가 아닙니다. 먼저 **소프트웨어 문제**(펌웨어가 진짜로 그 로직까지 실행했는가)인지, 아니면 **하드웨어 문제**(물리 링크가 뚫려 있는가, 주변부가 진짜 연결돼 있는가)인지를 가리는 데 힘을 쏟으세요. 시리얼이 먼저 말을 하게 만드는 게 고장 배제에 가장 빠르고 가장 머리 아프지 않은 한 수입니다. 항상 먼저 뚫어두세요.

---

## 17. 핵심 명령 & 파일 경로 빠른 참조

일상 개발에서 가장 자주 쓰는 몇 가지 명령입니다:

```bash
# === 컴파일 / 플래싱 / 모니터 ===
pio run                # 컴파일만
pio run -t upload      # 컴파일 + 플래싱
pio device monitor      # 시리얼 모니터 열기(Ctrl+C로 종료)

# === WCH-Link 디버거 펌웨어 버전 & 연결된 칩 정보 보기(연결 문제 점검에 가장 자주 사용) ===
~/.platformio/packages/tool-wlink/wlink status

# === 각 도구 버전 보기 ===
~/.platformio/packages/tool-wlink/wlink --version    # 플래싱 도구 버전
pio --version                                          # PlatformIO Core 버전

# === 컴파일러 버전 보기(최종 확인 환경 기준, 접두사는 riscv-wch-elf-)===
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# 만약 깔린 게 오래된 gcc8/x86_64 버전이라면, 파일 이름을 이렇게 바꿔 줍니다:
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
```

`wlink status`의 전형적인 출력은 디버거 펌웨어 버전, 타깃 칩 모델, 실제 Flash 용량, 칩 UID 등을 한눈에 보여줍니다. 연결 문제를 점검할 때 매우 유용합니다:

```
[INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
[INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
[INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
[INFO] Flash protected: false
[INFO] RISC-V ISA(misa): Some("RV32ACFIMUX")
[INFO] RISC-V arch(marchid): Some("WCH-V4F")
```

> WCH-Link 디버거 자체의 펌웨어를 업그레이드하려면 공식 **WCH-LinkUtility** 도구가 필요합니다. 현재 이 도구는 Windows 버전만 있고 Mac 버전이 없습니다. macOS 생태계가 아직 덜 성숙했다는 또 하나의 작은 아쉬움이죠.

핵심 파일 경로도 정리해 둡니다. 문제 생겼을 때 빠르게 찾기 좋습니다:

| 용도 | 경로 |
|---|---|
| PlatformIO Core 본체 | `~/.platformio/penv/bin/pio` |
| 설치된 플랫폼 | `~/.platformio/platforms/ch32v/` |
| 도구 체인 / 플래싱 / 디버그 도구 | `~/.platformio/packages/{toolchain-riscv,tool-wlink,tool-openocd-riscv-wch}` |
| board 정의 파일 | `~/.platformio/platforms/ch32v/boards/ch32v307_evt.json` |
| 플랫폼 빌드 스크립트(앞서 triple 로직을 파들어간 곳이 바로 여기) | `~/.platformio/platforms/ch32v/builder/main.py` |
| 컴파일 결과물 | `<프로젝트 디렉터리>/.pio/build/ch32v307_evt/firmware.{elf,bin}` |

`ch32v307_evt` board 정의 안의 핵심 파라미터도 함께 정리합니다:

| 필드 | 값 |
|---|---|
| MCU 모델 | CH32V307VCT6 |
| 메인 클럭 | 144 MHz |
| march / mabi(컴파일 타깃 ABI) | rv32imacxw / ilp32 |
| Flash / SRAM(board 기본값) | 256 KB / 64 KB(칩의 실제 Flash는 288KB. 9장 설명 참조) |
| 온보드 디버거 | WCH-Link |
| USB VID:PID | 1a86:8010 |
| 지원 플래싱 프로토콜 | wch-link, wlink, minichlink, isp |

---

## 18. 나만의 'CH32 개발 로직' 세우기: 앞으로 새 프로젝트 잡으면 그냥 베끼면 됩니다

한 바퀴 돌고 나서 가장 값비싼 자산은 구체적 명령을 얼마나 외웠느냐가 아니라, 재사용 가능한 사고 틀을 하나 갖게 됐다는 것입니다. 앞으로 CH32V307을 계속 하든, CH32 시리즈의 새 칩/새 보드로 갈아타든 이 패턴대로 가면 됩니다:

1. **먼저 '플랫폼 + 프레임워크 + 보드' 3종 세트 확인**: `platformio.ini`의 `platform`, `framework`, `board` 세 줄에 대응합니다. 이 세 줄이 정해지면 PlatformIO는 어디서 도구 체인을 다운로드할지, 어느 핀 정의 세트로 컴파일할지를 압니다.
2. **플랫폼 설치 직후 코드 짜기 전에, 도구 체인의 '국적'이 맞는지 확인**: 특히 커뮤니티가 유지보수하고 공식이 일선 지원하지 않는 플랫폼은 기본이 Windows나 Linux만 적응돼 있을 가능성이 큽니다. 설치 뒤 도구 체인 디렉터리를 `ls`로, 핵심 바이너리를 `file`로 보고 아키텍처가 맞는지 확인하면 디버깅 시간을 크게 줄일 수 있습니다.
3. **미서명 바이너리 실행 에러를 만나면 Gatekeeper부터 떠올리기**: `cannot be opened` / `killed: 9` 류의 에러는 십중팔구 격리 속성의 장난입니다. `xattr -dr com.apple.quarantine`을 한 방에 날리면 됩니다.
4. **플래싱/컴파일은 성공인데 주변부 반응이 없으면, 먼저 소프트웨어 문제인지 하드웨어 문제인지 가리기**: 시리얼을 먼저 뚫는 게 가장 빠른 배제법입니다. 시리얼 출력이 있으면 펌웨어가 정상 실행 중이라는 뜻이고, 출력이 없으면 초기화 누락을 의심하러 돌아가면 됩니다.
5. **보드의 '사용자 주변부'가 기본적으로 연결돼 있다고 믿지 않기**: LED나 버튼 같은 온보드 주변부는 유연성을 위해 출고 시 연결하지 않는 경우가 많습니다. 사용 전 회로도를 대조해 확인하세요. 코드부터 의심하는 서두르지 마세요.
6. **`debug.h`(또는 프레임워크가 제공하는 디버그 보조 라이브러리) 잘 활용하기**: 거의 모든 제조사 SDK가 딜레이 함수와 `printf` 리다이렉트를 미리 준비해 둡니다. 바퀴를 다시 발명하지 마세요.
7. **버전 번호는 변합니다. 점검 사고방식이 진짜 '베껴 갈 수 있는 자산'입니다**: 커뮤니티 도구 체인은 계속 갱신됩니다. 여러분이 깔 때의 구체 버전 번호가 튜토리얼과 다른 건 아주 정상입니다. '왜'를 이해하는 게 '무엇'을 외우는 것보다 중요합니다. 이 글 자체가 살아 있는 본보기입니다.

이 사고 틀을 기억해 두면, 앞으로 어떤 임베디드 개발 보드를 잡든 기본적으로 이 순서대로 빠르게 길을 찾을 수 있을 겁니다.

---

## 19. 자주 묻는 질문 FAQ

**Q1: 왜 그냥 공식 MounRiver Studio를 안 쓰나요? Mac 버전도 있다면서요?**

A: MounRiver Studio는 분명 Mac 버전을 내놓았습니다. 다만 커뮤니티 피드백에 따르면 내장 OpenOCD가 Mac에서 문제가 많아, 진지한 Mac 지원과 테스트를 거치지 않은 느낌입니다. 게다가 비교적 폐쇄적인 통합 IDE라, 도구 체인 버전을 직접 통제할 수 없습니다. PlatformIO는 VSCode 기반이라 도구 체인이 완전히 통제 가능하고, 커뮤니티가 활발하며, 크로스 플랫폼으로 동일한 개발 경험을 유지할 수 있습니다. 종합하면 이 한 번의 삽질이 충분히 가치 있습니다.

**Q2: Homebrew로 RISC-V 도구 체인을 깔아서 대체하면 수동 교체 안 해도 되지 않을까요?**

A: 기술적으로는 가능하지만, 이 플랫폼에서는 추천하지 않습니다. 플랫폼 자체의 빌드 스크립트가 PlatformIO의 패키지 관리 메커니즘으로 도구 체인 디렉터리를 찾기 때문입니다(`get_package_dir("toolchain-riscv")` 같은 호출). Homebrew로 깐 도구 체인으로 바꾸려면 추가로 설정을 써서 기본 동작을 덮어써야 해서 오히려 더 성가십니다. 그냥 본문에서 소개한 `toolchain-riscv-mac` 패키지를 쓰는 게 가장 머리 아프지 않습니다.

**Q3: 나중에 플랫폼을 업그레이드하면 도구 체인이 다시 Windows 버전으로 되돌아가나요?**

A: 그럴 수 있습니다. 나중에 `pio pkg update`를 실행하거나 플랫폼 전체를 재설치하면, `platform.json`에 기본으로 적힌 Windows 저장소 주소 때문에 여러분이 수동으로 바꿔둔 macOS 버전이 덮어씌워질 수 있습니다. 그땐 6장의 교체 단계를 한 번 더 돌리면 됩니다. 아니면 더 근본적으로, 플랫폼 저장소를 fork해서 `platform.json`이 기본적으로 macOS 버전을 가리키도록 고쳐 영구 해결할 수도 있습니다.

**Q4: 컴파일이 링크 에러를 뱉거나, 어떤 컴파일러 명령을 못 찾겠다는 에러가 뜹니다. 이유가 뭔가요?**

A: 십중팔구 도구 체인 버전과 컴파일러 실행 파일 접두사가 안 맞아서입니다(16장의 구멍 4에 대응). 먼저 실제로 깔린 컴파일러 이름이 무엇인지(`riscv-wch-elf-gcc`인지, 오래된 `riscv-none-embed-gcc`인지) 확인하고, 명령과 실제 파일이 맞도록 하세요. 자세한 건 6장의 최종 확인 환경 표를 대조하시면 됩니다.

**Q5: 플래싱이 'WCH-Link 장치를 찾을 수 없다'고 합니다. 어떡하죠?**

A: 이 순서대로 점검: ① 꽂은 포트가 WCH-Link에 연결된 그 포트가 맞는지, USB-Device 포트가 아닌지 확인. ② 디버거가 DAP 모드가 아니라 RV 모드인지 확인. ③ `system_profiler SPUSBDataType | grep -A5 1a86`로 시스템이 USB 장치를 정상적으로 인식하는지 보기(`1a86:8010`이 이 디버거의 VID:PID).

**Q6: 이 플랫폼은 어떤 칩과 개발 프레임워크를 지원하나요? 나중에 다른 보드로 바꾸기 편한가요?**

A: 칩은 CH32V003/103/203/30x, CH32X035, CH56x/57x/58x/59x 등 대거 포함. 프레임워크는 본문에서 쓴 noneos-sdk 외에 FreeRTOS, RT-Thread, TencentOS, Harmony LiteOS, Arduino, ch32fun, Zephyr 등을 지원합니다. 보드를 바꾸는 건 기본적으로 `platformio.ini`의 `board`와 `framework` 두 줄을 바꾸는 것만으로 됩니다. 다른 삽질 점검 경험(도구 체인 아키텍처, Gatekeeper 격리, 주변부 기본 떠 있음)은 십중팔구 그대로 통합니다.

---

## 20. 다 뚫고 난 뒤, 더 뭘 해볼 수 있을까

Hello World는 시작점일 뿐, 다 뚫고 난 뒤 계속 파고들 수 있습니다:

- **다채널 GPIO / 버튼 인터럽트**: 온보드 사용자 버튼 KEY도 마찬가지로 떠 있습니다. 선을 꽂으면 EXTI 외부 인터럽트 연습을 할 수 있습니다.
- **USB CDC**: CH32V307 자체를 USB 시리얼 장치로 enumerate시키기. WCH-Link 브릿지의 USART1에 기대지 않는 방식입니다. 별도의 USB 프로토콜 스택이 필요한 펌웨어 방안이라 심화 내용입니다.
- **288KB Flash 꽉 채우기**: 먼저 WCH 공식 도구로 칩의 option bytes를 수정한 뒤, `platformio.ini`의 `board_upload.maximum_size` 주석 관련 줄을 동기화해 수정.
- **FreeRTOS / RT-Thread 입문**: `framework`를 해당 RTOS로 바꿔 멀티태스크 스케줄링을 경험.
- **디버그 제대로 배우기**: OpenOCD + GDB로 F5 중단점 디버그(`pio debug`)를 돌려 임베디드 디버깅 솜씨를 탄탄하게.

---

## 21. 참고 자료

- Community-PIO-CH32V 플랫폼 저장소: `github.com/Community-PIO-CH32V/platform-ch32v`
- macOS 도구 체인 패키지: `github.com/Community-PIO-CH32V/toolchain-riscv-mac`
- 도구 체인 releases(PIO 쪽 새 버전 감시): `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`
- WCH 공식 MounRiver(WCH 커스텀 도구 체인 + IDE의 원천): `www.mounriver.com`
- wlink(macOS 브랜치): `github.com/Community-PIO-CH32V/tool-wlink`(브랜치 `mac_arm64` / `mac_x64`)
- 공식 문서: `pio-ch32v.readthedocs.io`
- xPack RISC-V GCC(도구 체인 상스트림): `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack`
- wlink 원본 프로젝트: `github.com/ch32-rs/wlink`
- WCH 공식 제품 페이지: `www.wch.cn/products/CH32V307.html`
- OpenWCH 공식 SDK/예제: `github.com/openwch/ch32v307`
- Zephyr 공식 문서 중 이 보드의 LED 떠 있음에 대한 설명
- PlatformIO 공식 문서: `docs.platformio.org`

---

*전체 프로젝트 코드는 GitHub에 동기화해 올려뒀습니다. clone해서 바로 돌려보셔도 됩니다. 본문이 다루지 않은 새 구멍을 만나면 댓글에서 교류해 주세요. macOS에서 CH32V를 다루는 자료는 아직 너무 적습니다. 한 사람이 경험을 공유할 때마다, 뒤에 오는 사람이 구멍 하나를 덜 밟게 됩니다. 여러분의 LED가 하루빨리 켜지기를!*

https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/CH32V/CH32V307-EVT-R1/01%20HelloWorld
