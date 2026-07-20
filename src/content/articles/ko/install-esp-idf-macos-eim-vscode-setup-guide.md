---
title: "macOS에 ESP-IDF v6.0.2 설치: `brew install` 에러부터 VSCode가 setup을 잡을 때까지 (삽질 기록)"
domain: hardware
platforms: ["mac"]
format: "tutorial"
relatedBoards: ["esp32s3"]
date: 2026-07-20
intro: "명령줄에서 ESP-IDF 설치는 다 잘 되는데, VSCode 확장만 계속 setup not found 에러를 뱉나요? 이 글은 제가 직접 겪은 삽질 과정을 있는 그대로 적은 것입니다. Homebrew로 eim 설치, EIM으로 ESP-IDF v6.0.2 설치, Windows에서 가져온 프로젝트 찌꺼기 정리, 그리고 VSCode 확장이 setup을 못 찾는 진짜 원인까지 파고 들어갑니다. 명령어와 에러 메시지는 전부 실제로 실행해 본 것이라, 같은 에러를 만나면 그대로 복사해서 검색에 써도 됩니다."
tags: ["ESP-IDF 설치", "ESP-IDF macOS", "EIM", "ESP32-S3", "VSCode setup not found", "ESP-IDF 설정"]
image: https://img.lingflux.com/2026/07/79ed5dc15e35419e612ab982e595d127.png
---

# macOS에 ESP-IDF v6.0.2 설치: `brew install` 에러부터 VSCode가 setup을 잡을 때까지

이전에 수동으로 ESP-IDF를 두 번 설치해 봤는데, 두 번 다 어느 지점에서 막혔습니다. 그래서 이번에는 아예 전체 과정을 처음부터 다시 밟으면서, 각 에러의 진짜 원인을 끝까지 파고들어 봤습니다. 다 돌고 나니까, 문제는 "ESP-IDF를 설치한다"는 것 자체가 아니라 서로 관련 없는 다섯 군데에 흩어져 있었습니다. Homebrew로 도구 설치, EIM의 네트워크 접근, VSCode에서 올바른 플러그인 설치, 프로젝트 안의 Windows 찌꺼기 파일, 그리고 VSCode 확장이 설정을 읽어오는 방식이죠. 명령줄에서는 다 잘 되는데 VSCode 확장만 계속 "setup not found"를 뱉는 문제가 가장 시간을 잡아먹었고, 이 글의 핵심이기도 합니다.

이 글은 제가 직접 밟은 삽질을 있는 그대로 적은 것이라, 명령과 에러 메시지는 전부 실제로 실행한 결과입니다. 같은 에러를 만나면 메시지를 그대로 복사해서 검색하거나, 이 글과 본인의 에러를 함께 AI에게 넘겨서 이 글의 흐름대로 원인을 찾아달라고 해도 됩니다.

> **시작하기 전에 버전부터 확인하세요.** ESP-IDF는 v5.x에서 v6.0.2로 오면서 설치 방식이 기존 `install.sh`에서 EIM으로 바뀌었고, VSCode 확장도 1.x에서 2.x로 오면서 setup을 찾는 로직이 통째로 다시 작성되었습니다. 버전이 다르면, 특히 4단계의 확장 설정 부분은 아예 맞지 않을 가능성이 높습니다.

## 환경 버전

| 항목 | 버전 |
|---|---|
| 시스템 | macOS, Apple Silicon (M 시리즈 칩) |
| ESP-IDF | v6.0.2 |
| 설치 도구 | EIM 0.17.1 |
| VSCode 확장 | espressif.esp-idf-extension 2.1.0 |
| 대상 칩 | ESP32-S3 |

본문 경로는 제 로컬 사용자 이름인 `shawn` 기준으로 적었습니다. 명령을 그대로 복사할 때는 본인 사용자 이름으로 바꾸세요(터미널에서 `whoami`를 치면 나옵니다). 그리고 저는 로컬에서 Clash 프록시를 켜두고 `127.0.0.1:7890`로 나가는 중인데, 프록시가 필요 없다면 명령 안의 `PROXY` 환경변수와 `--mirror` 인자를 빼면 됩니다. 주 흐름에는 영향 없습니다.

## 전체 흐름

다섯 단계, 뒤로 갈수록 더 숨어 있습니다:

| 단계 | 할 일 | 자주 겪는 상황 |
|---|---|---|
| 0 | Homebrew로 `eim` 도구 자체 설치 | 신뢰 확인 메시지 하나, 에러로 오해하기 쉬움 |
| 1 | `eim`으로 ESP-IDF v6.0.2 설치 | 네트워크와 버전 번호 두 개의 구멍 |
| 2 | VSCode에 ESP-IDF 확장 설치 | 같은 이름의 플러그인이 많아 잘못 설치하기 쉬움 |
| 3 | 프로젝트의 Windows 찌꺼기 파일 정리 | Windows에서 가져온 프로젝트만 해당 |
| 4 | VSCode 확장이 설치된 setup을 인식하게 만들기 | 글 전체에서 가장 은밀한 구멍, 가장 오래 막힘 |

---

## 0단계: 먼저 `eim` 도구를 설치합니다

`eim`은 ESP-IDF Manager의 약자로, Espressif 공식 설치 관리 도구입니다. 옛날 `install.sh`보다 편한 점은 ESP-IDF 버전 여러 개를 충돌 없이 설치할 수 있다는 것. 이 도구 자체를 설치하려면 Homebrew tap(서드파티 소스)을 하나 추가한 뒤 설치하면 됩니다:

EIM 공식 설치 가이드:
https://dl.espressif.com/dl/eim/index.html

```bash
brew tap espressif/eim
brew install eim
```

처음 `brew install eim`을 실행했을 때 이런 메시지를 봤습니다:

```
Error: Refusing to load formula espressif/eim/eim from untrusted tap espressif/eim.
Run `brew trust --formula espressif/eim/eim` or `brew trust espressif/eim` to trust it.
```

> **이건 설치 실패가 아니라 Homebrew의 보안 확인입니다.** 비교적 최근 버전의 Homebrew는 서드파티 tap(공식 저장소가 아닌 소프트웨어 소스)을 기본적으로 바로 신뢰하지 않습니다. 처음 어떤 서드파티 tap에 있는 것을 쓸 때 이런 메시지를 한 번 띄워서, 정말 신뢰할 건지 직접 확인합니다. espressif tap은 공식이니 안심하고 신뢰하면 됩니다:

```bash
brew trust espressif/eim
```

이 명령을 실행한 뒤 다시 `brew install eim`을 치면 정상적으로 설치됩니다. 만약 `brew install` 전에 eim과 전혀 상관없는 소프트웨어 목록이 잔뜩 나오면(예: 메뉴바 작은 도구, AI 이름 바꾸기 도구 같은 것들), 그건 Homebrew가 "지금 만료된 패키지가 몇 개 있어요" 같은 관련 없는 정보를 나열하는 것이니 무시하고 아래로 내려가서 진짜 에러 행을 찾으면 됩니다.

설치가 끝났으면 확인해 봅니다:

```bash
eim --version
```

버전 번호가 정상적으로 출력되면 이 단계는 통과, 다음 단계에서 본격적으로 ESP-IDF를 설치하면 됩니다.

---

## 1단계: EIM으로 ESP-IDF v6.0.2 설치

도구 설치가 끝났으면 한 줄로 ESP-IDF를 설치합니다:

```bash
HTTPS_PROXY=http://127.0.0.1:7890 \
HTTP_PROXY=http://127.0.0.1:7890 \
ALL_PROXY=socks5://127.0.0.1:7890 \
eim install -i v6.0.2 -t esp32s3 -n true \
  --idf-mirror https://git.espressif.com.cn \
  --pypi-mirror https://pypi.mirrors.ustc.edu.cn/simple
```

각 인자의 의미:

- `-i v6.0.2`: 설치할 버전 번호, **반드시 `v` 접두사 필수**, 이유는 아래에서;
- `-t esp32s3`: 대상 칩;
- `-n true`: 비대화형 모드. 아니면 터미널 질문에서 엔터를 기다리느라 멈춰 있습니다;
- `--idf-mirror` / `--pypi-mirror`: 중국 미러. 소스코드는 Espressif 공식 중국 미러로, Python 패키지는 USTC 소스로 갑니다. 필요 없으면 빼면 됩니다;
- 세 개의 `PROXY` 환경변수: EIM 내부에서 git 접근할 때 씁니다. 이유는 역시 아래의 구멍 1에서.

이 명령은 단순해 보이지만 처음 실행했을 때 구멍 두 개를 밟았습니다. 둘 다 "겉으로는 정상 설치 중인데 속으로는 몰래 돌아가는" 유형이었습니다.

### 구멍 1: git에 프록시를 설정해도 소용없고, EIM이 안 봅니다

EIM은 내부적으로 Rust의 `gix` 라이브러리로 IDF 소스코드를 받아옵니다. 이 라이브러리는 `git config --global http.proxy` 같은 전통적인 설정 방식을 무시하고 `HTTPS_PROXY`, `HTTP_PROXY`, `ALL_PROXY` 시스템 환경변수만 봅니다. 프록시를 git 설정 파일에만 넣어두고 대응하는 환경변수가 없으면, `gix`는 직접 연결을 시도하다가 반복적으로 실패하며 로그에 이런 것들을 채웁니다:

```
WARN - Attempt N failed: "Failed to fetch: Failed to consume the pack sent by the remote"
```

세 번 실패하면 `gix`는 자동으로 시스템 git(시스템 git는 git config를 인식하므로 프록시를 정상적으로 탑니다)으로 폴백합니다. 그래서 결국 설치는 될 확률이 높지만 몇 분을 더 기다리게 되고, 이렇게 "폴백"된 clone 상태는 그렇게 깔끔하지 않습니다. 귀찮은 일을 피하려면 처음부터 프록시 환경변수를 명령에 넣어서 `gix`가 한 번에 가게 만드는 게 낫습니다. 실패 세 번을 기다릴 필요 없습니다.

### 구멍 2: 버전 번호에 `v`를 안 붙이면 에러

Espressif 공식 저장소의 release tag는 전부 `v6.0.2`처럼 `v`가 붙은 형식이고, EIM의 `-i` 인자는 이를 그대로 git tag 이름으로 씁니다. `-i 6.0.2`(v 없이)로 쓰면 이렇게 나옵니다:

```
fatal: Remote branch 6.0.2 not found in upstream origin
```

이 에러도 사실 `gix`가 실패한 뒤 시스템 git가 폴백을 받으면서 띄운 것인데, git가 원격에서 `6.0.2`(v 없는)라는 브랜치를 못 찾은 겁니다. `-i v6.0.2`로 쓰면 문제없습니다. 어떤 버전의 tag가 정확히 어떤 형태인지 확실하지 않으면 원격에 어떤 것들이 있는지 먼저 확인해 보세요:

```bash
git ls-remote --tags https://git.espressif.com.cn/espressif/esp-idf.git 'v6.0*'
```

### 설치 확인

```bash
eim list
# v6.0.2 (selected)가 보여야 합니다

source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py --version
# ESP-IDF v6.0.2가 출력되면 설치 완료
```

### 설치 후 파일들은 어디에

EIM이 만드는 디렉토리 구조는 기존 방식과 좀 다릅니다. 뒤의 모든 설정에서 이 경로들을 참조하니 미리 눈에 익혀두세요:

```
IDF 소스        ~/.espressif/v6.0.2/esp-idf
툴체인          ~/.espressif/tools/
Python venv     ~/.espressif/tools/python/v6.0.2/venv
활성화 스크립트  ~/.espressif/tools/activate_idf_v6.0.2.sh
EIM 설치 목록   ~/.espressif/tools/eim_idf.json
```

Python 가상환경 위치는 짚고 넘어가야 합니다. `tools/python/v6.0.2/venv` 안에 숨어 있고, 옛날 버전에서 흔히 쓰던 프로젝트 루트의 `python_env/`가 아닙니다. 처음 찾을 때 헤맬 수 있습니다.

---

## 2단계: VSCode에 ESP-IDF 확장 설치

명령줄 쪽이 준비됐으면 VSCode로 돌아가서 확장 패널(`Cmd+Shift+X`)을 열고 "ESP-IDF"를 검색합니다.

> **이 단계에서 잘못 설치하는 분이 많습니다. 출판사를 꼭 확인하세요.** 검색 결과에 이름은 비슷하고 아이콘도 거의 같은 플러그인이 여러 개 나옵니다. 이름만 보면 잘못 누르기 쉽습니다. 아래 정보를 대조해서 같은지 확인한 뒤 설치를 누르세요:

| 필드 | 내용 |
|---|---|
| 플러그인 이름 | ESP-IDF |
| 출판사 | Espressif Systems |
| 출판사 홈페이지 | espressif.com |
| 설치 수 | 1,582,039 |
| 평점 | 145개 리뷰 |
| 소개 | Develop and debug applications for Espressif chips with ESP-IDF |

**플러그인은 이름이 아니라 출판사로 확인하세요.** 출판사는 반드시 **Espressif Systems**여야 하고, 도메인은 **espressif.com**, 설치 수는 백만 단위입니다. 이게 공식 플러그인의 뚜렷한 특징입니다. 잘못된 플러그인을 설치하면 뒤의 4단계에서 설명하는 설정 항목(`idf.eimIdfJsonPath`, `idf.currentSetup` 등)이 아예 없거나 동작이 전혀 맞지 않아서 원인을 잡기가 매우 어렵습니다. 본질적인 원인은 처음에 잘못 설치한 것입니다.

설치가 끝났으면 VSCode를 한 번 재시작하세요(`Cmd+Shift+P` → `Reload Window`). 플러그인이 활성화된 뒤 아래로 내려가면 됩니다.

---

## 3단계: Windows에서 가져온 프로젝트라면 파일 세 개를 먼저 정리

**프로젝트를 새로 만든 거라면 이 단계는 건너뛰어도 됩니다.** 하지만 Windows PC에서 복사해 온 프로젝트라면 거의 확실히 이 단계의 구멍을 밟습니다. 세 개의 파일 안에 Windows 전용 경로가 숨어 있어서 macOS로 복사해 오면 그대로 무효가 됩니다.

### ① `.vscode/settings.json`

안의 `C:\...` 같은 Windows 경로, 직렬 포트 이름(예: `COM22`), 옛날 버전 번호를 전부 macOS의 실제 값으로 바꾸세요:

```jsonc
{
  "idf.espIdfPath": "/Users/shawn/.espressif/v6.0.2/esp-idf",
  "idf.toolsPath":  "/Users/shawn/.espressif",
  "idf.pythonInstallPath": "/Users/shawn/.espressif/tools/python/v6.0.2/venv/bin/python",
  "idf.port": "/dev/cu.usbmodemXXXXXXXXXXX",
  "idf.customExtraVars": { "IDF_TARGET": "esp32s3" },
  "idf.flashType": "UART"
}
```

본인의 직렬 포트 장치 이름은 이 명령으로 확인합니다:

```bash
ls /dev/cu.usb*
```

### ② `.vscode/c_cpp_properties.json`

`compilerPath`가 원래 Windows용 `xtensa-esp32s3-elf-gcc.exe`를 가리키고 있고, 툴체인 버전 번호도 대체로 옛날 것입니다. Mac에 실제로 설치된 버전으로 바꿔야 합니다. 경로를 하드코딩하지 말고 `toolsPath` 변수를 따라가는 걸 추천합니다. 나중에 버전을 올려도 안 바꿔도 됩니다:

```jsonc
"compilerPath": "${config:idf.toolsPath}/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc"
```

`esp-15.2.0_20251204` 부분은 아무 값이나 쓰면 안 됩니다. `~/.espressif/tools/xtensa-esp-elf/` 디렉토리에서 실제로 어떤 폴더가 설치되어 있는지 보고 그대로 적으세요.

### ③ `dependencies.lock` —— 가장 놓치기 쉬운 것

이건 idf-component-manager(컴포넌트 매니저)가 만드는 잠금 파일입니다. Windows에서 만들어진 건 옛날 v2.0.0 형식이라 안에 로컬 component의 **절대 경로**를 기록해 두는데, 예를 들어 원작자 컴퓨터의 디렉토리가 이렇게 들어갑니다:

```yaml
espressif/esp_lcd_touch:
  source:
    path: C:\Users\PC\Desktop\...\espressif__esp_lcd_touch
    type: local
```

mac에서 reconfigure를 실행하면 이 경로가 당연히 없으니 이런 에러가 납니다:

```
CMake Error: The "path" field in the manifest file ... does not point to a directory.
```

이 파일은 본질적으로 자동 생성된 캐시입니다. 지우고 다시 만들게 두는 게 가장 편합니다:

```bash
rm dependencies.lock
rm -rf build
source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py reconfigure
```

다시 생성되면 v3.0.0 형식이 되고, 경로는 로컬화되며, 레지스트리에 있는 컴포넌트들은 `managed_components/` 디렉토리로 다시 다운로드됩니다.

**여기까지 오면 명령줄의 `idf.py build`는 정상적으로 돌아갈 것입니다.** 그래도 안 된다면 문제는 이 파일들 안에 없는 것이니 다른 곳을 봐야 합니다.

---

## 4단계: VSCode 확장이 "setup not found"라고 할 때 (진짜로 막히는 곳)

명령줄은 다 정상인데 VSCode를 열면 상태 표시줄에 계속 이 말이 뜹니다:

```
Current ESP-IDF setup is not found.
```

창을 두 번 Reload하고 관련 있어 보이는 설정 항목을 몇 개 바꿔봐도 소용없었습니다. 나중에 확장의 소스 코드 파일(`dist/extension.js`)을 뒤져서야 setup을 찾는 전체 로직을 이해했습니다:

1. `idf.eimIdfJsonPath`가 가리키는 `eim_idf.json` 파일에서 설치된 setup 목록을 읽어옵니다;
2. `idf.currentSetup`의 값을 이 목록에서 경로로 매칭합니다;
3. 매칭이 안 되면 목록을 하나씩 순회하면서 검증을 통과하는 게 있는지 봅니다;
4. 전부 실패하면 그 "not found"를 띄웁니다.

이 로직이 성립하려면 1단계의 목록이 먼저 로드되어 있어야 합니다. 저는 두 번의 우회로 원인을 찾았습니다. 첫 번째는 사실 쓸데없는 작업이고 따라 하지 않아도 됩니다. 두 번째가 진짜 수정할 곳입니다. 헷갈리지 않게 미리 말씀드립니다:

- **우회 1: 조작 불필요, 원리만 보고 넘어가면 됩니다;**
- **우회 2: 조작 필요, 이게 진짜 수정 단계입니다.**

### 우회 1 (신경 안 써도 됨, 원리 이해용): `idf.currentSetup`에는 뭘 넣어야 하나

이 설정 항목의 공식 설명은 "Current ESP-IDF setup id in eim_idf.json path"로, 글자만 보면 ID(번호)를 적어야 할 것 같습니다. 하지만 소스코드를 보면, 확장이 어떤 setup을 직접 선택한 뒤 실제로 쓰는 값은 이렇습니다:

```js
await _o("idf.currentSetup", c.idfPath, ConfigurationTarget.WorkspaceFolder, e)
```

들어가는 건 `idfPath`, 즉 **경로**이지 번호가 아닙니다. 그래서 이 항목이 작업 공간 설정에 들어 있다면 이런 형태여야 합니다:

```jsonc
"idf.currentSetup": "/Users/shawn/.espressif/v6.0.2/esp-idf"
```

하지만 이 항목은 **직접 고칠 필요가 없습니다**. 이게 원인이 아닙니다. 아래의 우회 2에서 setup 목록이 정상적으로 로드되기만 하면, 확장이 알아서 순회하면서 설치된 유일한 v6.0.2를 찾고 경로를 `currentSetup`에 자동으로 다시 씁니다. 이 단계는 확장이 스스로 합니다. 여기 보여드린 건 순전히 원리 설명을 위해서이고, 이 필드를 봤을 때 용도를 알 수 있도록 할 뿐입니다. "이상해 보인다"고 직접 고치지 마세요. 진짜 손대야 할 곳은 아래입니다.

### 우회 2 (진짜 수정할 곳): `idf.eimIdfJsonPath`의 스코프가 틀렸다

VSCode의 설정 항목은 여러 스코프(scope)로 나뉘는데, `idf.eimIdfJsonPath`의 스코프는 **`application`**입니다. 즉 **전역 User settings.json에서만 작동**하고, 프로젝트 자체의 `.vscode/settings.json`에 적어두면 전혀 읽히지 않습니다. 적어봤자 헛일입니다.

저는 계속 `eimIdfJsonPath`를 프로젝트의 작업 공간 설정에 적어두고 있었습니다. 그래서 확장은 `eim_idf.json` 파일을 전혀 불러오지 못했고, 1단계에서 말한 setup 목록은 항상 비어 있었습니다. 빈 목록은 `currentSetup`을 어떻게 적든 매칭이 안 된다는 뜻이고, 이게 앞의 두 번 Reload해도 효과가 없던 진짜 이유입니다.

> **수정 방법: `idf.eimIdfJsonPath`를 전역 설정 파일로 옮깁니다.**

macOS에서 VSCode의 전역 설정 파일 경로는:

```
~/Library/Application Support/Code/User/settings.json
```

편집기로 이 파일을 열어서 한 줄을 추가합니다:

```jsonc
"idf.eimIdfJsonPath": "/Users/shawn/.espressif/tools/eim_idf.json"
```

작업 공간의 `.vscode/settings.json`에는 `idf.currentSetup`(값은 idf 경로)만 남겨두고, `eimIdfJsonPath`는 절대 작업 공간에 두지 마세요. 둬도 안 먹히고, "이미 맞게 설정한 줄 알았는데" 하는 오해만 만듭니다.

바꾼 뒤 `Cmd+Shift+P`로 명령 패널을 열어 **Reload Window**를 선택합니다. 다시 로드한 뒤 상태 표시줄에 ESP-IDF 버전 번호와 대상 칩이 정상적으로 표시되면 확장이 드디어 인식한 것입니다.

Reload 뒤에도 문제가 있으면 확장 자체의 실시간 로그를 볼 수 있습니다. `Cmd+Shift+P` → `Output`, 출력 패널 오른쪽 위의 드롭다운에서 **ESP-IDF** 채널을 선택하면 상태 표시줄의 한 줄보다 훨씬 자세한 에러 메시지가 나옵니다.

### 어떤 설정 항목의 스코프를 모르겠으면 추측하지 말고 직접 찾아보세요

VSCode 확장의 스코프 정보는 전부 그 확장의 `package.json`에 들어 있습니다. 추측하는 것보다 스크립트 몇 줄로 직접 찾는 게 낫습니다:

```bash
python3 -c "
import json
p = json.load(open('/Users/shawn/.vscode/extensions/espressif.esp-idf-extension-2.1.0/package.json'))
cfg = p['contributes']['configuration']
props = {}
if isinstance(cfg, list):
    for c in cfg:
        props.update(c.get('properties', {}))
else:
    props = cfg.get('properties', {})
for k in ['idf.eimIdfJsonPath', 'idf.currentSetup', 'idf.espIdfPath']:
    print(k, '->', props.get(k, {}).get('scope', 'window(기본값)'))
"
```

---

## 치트 시트

### 설정 항목은 어디에 적어야 하나

| 설정 항목 | 스코프 | 적을 곳 |
|---|---|---|
| `idf.eimIdfJsonPath` | application | 전역 User settings |
| `idf.currentSetup` | resource | 작업 공간 `.vscode/settings.json` |
| `idf.espIdfPath` / `idf.toolsPath` / `idf.pythonInstallPath` | window | 작업 공간이나 전역 어디든 |

### 핵심 경로

```
IDF 소스        ~/.espressif/v6.0.2/esp-idf
툴체인          ~/.espressif/tools/
xtensa gcc     ~/.espressif/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc
Python venv    ~/.espressif/tools/python/v6.0.2/venv/bin/python
활성화 스크립트  source ~/.espressif/tools/activate_idf_v6.0.2.sh
EIM 설치 목록   ~/.espressif/tools/eim_idf.json
전역 settings  ~/Library/Application Support/Code/User/settings.json
```

### 자주 쓰는 명령

```bash
brew tap espressif/eim                              # 공식 tap 추가
brew trust espressif/eim                             # 서드파티 tap 첫 사용 시 신뢰 필요
brew install eim                                     # eim 자체 설치

eim list                                              # 설치된 버전 확인
eim install -i v6.0.2 -t esp32s3 -n true ...          # ESP-IDF 설치 (인자는 1단계 참고)

source ~/.espressif/tools/activate_idf_v6.0.2.sh      # 현재 셸의 ESP-IDF 환경 활성화
idf.py set-target esp32s3                             # 대상 칩 설정
idf.py reconfigure                                    # cmake 설정만 실행, compile_commands.json 생성
idf.py build                                          # 컴파일
idf.py -p /dev/cu.usbmodemXXXX flash monitor          # 플래시 후 직렬 모니터 열기
```

---

## 트러블슈팅 순서: 막혔을 때 범위를 좁히는 흐름

어디서부터 손대야 할지 모르겠다면, 이 순서대로 한 층씩 지워가면 무작정 시도하는 것보다 훨씬 빠릅니다:

1. **`brew install eim`이 설치되나요?** 안 되면, `brew trust`를 요구하는 메시지인지 확인 — 맞다면 그냥 신뢰하면 됩니다, 0단계 참고;
2. **`idf.py --version`이 실행되나요?** 안 된다면 → 설치나 활성화 층의 문제, 1단계 참고;
3. **VSCode 확장 패널 검색 결과가 맞나요?** 설치하고 보니 설정 항목이 안 맞거나 플러그인 동작이 이 글 설명과 전혀 다르다면 → 출판사가 Espressif Systems인지 먼저 확인, 처음부터 잘못 설치했을 확률이 높습니다, 2단계 참고;
4. **`idf.py reconfigure`가 통과되나요?** 안 되면 → 프로젝트 파일 문제, `dependencies.lock`을 중심으로 살펴보세요, 3단계 참고;
5. **명령줄은 다 정상인데 VSCode에서 setup not found라고요?** → 확장 설정 문제, `eimIdfJsonPath`의 스코프를 중점으로 확인, 4단계 참고.

잘못 빠지기 쉬운 방향 두 가지를 미리 짚어둡니다:

- v6.0.2 tag 자체에 `version.txt` 파일이 없습니다. 이건 **clone할 때 파일이 빠진 게 아닙니다**. 확장도 원래 이 파일을 안 읽습니다. 없어도 당황하지 마세요;
- `idf.currentSetup`의 값은 setup not found의 원인이 거의 아닙니다. 이 에러를 만나면 먼저 고치려 하지 말고, `eimIdfJsonPath`가 작업 공간 설정이 아니라 전역 settings에 있는지부터 확인하세요.

---

이 글을 따라 했는데도 막힌다면, 십중팔구는 버전이 안 맞는 것입니다. ESP-IDF 설치 방식과 VSCode 확장이 setup을 찾는 로직은 최근 몇 년 한두 번씩 바뀌었습니다. 옛날 튜토리얼이 새 버전에 맞을 거란 보장은 없습니다. 본인의 로컬 ESP-IDF 버전, EIM 버전, 확장 버전과 구체적인 에러 메시지를 함께 AI에게 넘기고, 이 글의 "도구 설치 → IDF 설치 → 프로젝트 파일 정리 → 확장 설정" 네 단계 흐름에 맞춰 원인을 잡아달라고 해보세요. 에러 키워드로 바로 검색하는 것보다 훨씬 빠르게 어느 층의 문제인지 좁힐 수 있습니다.
