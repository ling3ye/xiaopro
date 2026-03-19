---
title: "가재 키우기 문제 해결 가이드｜OpenClaw 설치부터 브라우저 제어까지, 한 번에 완료"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-06
intro: "OpenClaw를 설치하고 아무것도 할 수 없는 경험이 있으신가요? 저자가 직접 10번 삭제 후 재설치를 경험하며 OpenClaw 2026.3.2 버전의 설정 로직을 완전히 파악했습니다 - API 연결, 커스텀 제공업체, 브라우저 제어 개방, 파일 읽기/쓰기 권한까지, 모든 단계에 스크린샷과 명령어 비교가 있습니다. macOS 사용자, 초보자, 오래된 튜토리얼로 고생한 사용자에게 적합합니다."
image: "https://img.lingflux.com/2026/03/015705fbca42171bdf09fabe9220b546.webp"
tags: ["openclaw config guide", "openclaw 2026 setup", "openclaw tools profile", "OpenClaw 설정 튜토리얼", "OpenClaw 권한 설정", "OpenClaw 최신 버전"]
---

가재 키우기를 한동안 해보니, 이제 버전이 비교적 안정된 것 같습니다. 이전에는 이름 때문에 머리가 아팠습니다. 분명히 ClawdBot 사이트인데, 설치 명령어는 install MoltBot이고, 다시 돌아서면 OpenClaw라고 불렀습니다. 이것은 버그가 아니라 오픈소스 프로젝트의 전통입니다: 먼저 만들고, 변호사 편지를 받으면 이름을 바꿉니다. (Claude는 ClawBot 발음이 Claude와 너무 비슷하다고 해서, 그 이후로 Claw가 더 유명해졌습니다)

며칠 동안 테스트를 해보니 매일 업데이트가 있는 것 같습니다. 설정 로직을 이해하려고 삭제하고 설치하고, 설치하고 삭제하고를 반복했습니다.

2026.2.25
2026.2.26
2026.3.1
2026.3.2
....

이 업데이트 속도는 너무 빽빽합니다. 특히 최신 버전 2026.3.2를 테스트할 때 (기사 작성일은 2026년 3월 6일), 설정 방식이 바뀌어서 이전 테스트가 작동하지 않았습니다. 이 버전은 기본 설정의 보안이 향상되었고, 더 높은 권한을 수동으로 구성해야 합니다.

저는 OpenClaw가 브라우저를 제어하고 시스템 파일을 조작할 수 있다는 점을 좋아합니다. 물론 이것은 많은 보안 문제를 가져오므로, 조심해서 사용해야 합니다. 이 가재를 잘 키우려면 설정하는 방법을 배우는 데 시간을 투자해야 합니다.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/flZj-SpTJmQ?si=Jn8A8xWZ-jIZQCeo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## 시작하기 전에: API 잔액이 충분한가요?

OpenClaw 자체는 오픈소스이고 무료이지만, "동작"하려면 뒤에서 AI 모델이 구동해야 하고, 이것은 API 토큰이 필요합니다.

토큰이 거의 다 되었거나 아직 설정하지 않았다면, 현재 가성비가 좋은 두 플랫폼이 있으니 필요에 따라 선택하세요:

- **지푸 GLM**: Claude Code, Cline 등 20+ 도구를 지원하고, 한정 구독 혜택이 있습니다 → [링크](https://www.bigmodel.cn/glm-coding?ic=IPWNTCEXE2) (저는 지금 이것을 사용하고 있습니다. 주의하세요, 이것은 광고가 아닙니다!!! 광고가 아닙니다!!! 광고가 아닙니다!!! 돈을 받지 않았고, 광고 자리는 현재 모집 중입니다)

​	![image-20260306102449045](https://img.lingflux.com/2026/03/52e663b49875f0ab36c9fc1f2ff806dd.png)

​	1, API KEY: 제어 센터에서 API key를 찾아 복사하세요
​	2, GLM 주소: https://open.bigmodel.cn/api/anthropic (Claude Code 호환 주소)
​	3, 모델 이름: GLM-4.7

​	이 3가지 정보는 먼저 읽어보세요. 다음 설정에서 필요합니다.

- **알리윈 바이롄**: 전체 대규모 모델, 신규 사용자는 무료 한도가 있습니다 → [링크](https://www.aliyun.com/benefit/ai/aistar?clubBiz=subTask..12406352..10263..) (이것도 괜찮습니다. 주의하세요, 이것도 광고가 아닙니다!!!)

준비가 완료되었으면 시작해 보세요.





## OpenClaw 설치 시작하기

저는 macOS 시스템을 사용합니다. 가재 키우기에 가장 좋은 시스템입니다. 왜냐하면 작성자가 macOS 시스템으로 개발했고, 문제가 가장 적기 때문입니다. 다른 Windows, Raspberry PI OS, Linux는 약간 다를 수 있습니다. 하지만 이 프로젝트의 기여자가 많아서 큰 문제도 빠르게 해결될 수 있습니다.

제가 보기에 좋은 순서는 다음과 같습니다:

macOS > Linux > Windows > others

먼저 공식 사이트를 확인하세요. 여러 가지 설치 방법이 있습니다: https://openclaw.ai/

### macOS 빠른 설치

macOS 시스템에서 공식으로 APP 다운로드를 제공하지만, 저는 모르는 이유로 APP를 설치할 수 없었습니다. 자동 설치 명령어 `curl -fsSL https://openclaw.ai/install.sh | bash`도 매번 성공하지 않아서, 저는 npm 설치 방법을 선택했습니다. 명령행에 다음을 입력하세요:

```bash
# Install OpenClaw  | OpenClaw 설치
npm i -g openclaw
```

설치가 완료될 때까지 기다린 후 다음을 입력하세요:

```bash
# Meet your lobster ｜ OpenClaw 설정
openclaw onboard
```

그러면 설정 위저드 인터페이스가 나타나고, 하나씩 보면서 API를 선택하고 설정하면 됩니다. 대략적인 과정은 다음과 같습니다:



### 1, 이것은 사용 시나리오를 묻는 것입니다:

- **Personal(개인 사용)**: 이 Mac Mini를 오직 당신만 사용합니다 → **Yes**를 선택하세요
- **Shared/multi-user(다중 사용자 공유)**: 여러 사용자 계정이 이 기계를 공유하므로 추가적인 권한 관리가 필요합니다 → No를 선택하세요

**그냥 Yes를 선택하세요**, 엔터를 눌러 계속하세요.

![image-20260306103540426](https://img.lingflux.com/2026/03/f4a9f8ac970e447eadd09b4533d4c6c0.png)



### 2, 이것은 **설정 방식**을 선택하는 것입니다:

- **QuickStart(빠른 시작)**: 먼저 빠르게 설치하고, 세부 설정(API 키, 모델 선택 등)은 나중에 천천히 설정하세요
- **Manual(수동)**: 지금 바로 모든 세부 사항을 수동으로 설정하세요

------

**QuickStart를 선택하는 것을 권장합니다**, 이유:

- 먼저 실행하고, 나중에 `openclaw config set`로 천천히 조정할 수 있습니다
- 시간과 노력을 절약할 수 있습니다



![image-20260306104637473](https://img.lingflux.com/2026/03/e3a2171975e988818fbaf4a59195d72d.png)



### 3, 중요: **어떤 AI 모델**을 사용하여 OpenClaw의 뇌를 구동할지 선택합니다.

간단히 말하면: **OpenClaw 자체는 AI를 제공하지 않으므로, AI 제공업체에 연결해야 합니다.**

------

일반 옵션 설명

| 옵션                   | 설명                          |
| ---------------------- | ----------------------------- |
| **OpenAI**             | GPT-4o 등, 가장 주류          |
| **Google**             | Gemini 시리즈                 |
| **XAI (Grok)**         | 일론 머스크의 AI               |
| **Moonshot AI (Kimi)** | 중국산, 중국어 지원이 아주 좋음 |
| **Mistral AI**         | 유럽 오픈소스 모델            |
| **OpenRouter**         | 집계 플랫폼, 하나의 키로 여러 모델 사용 |
| **Qianfan**            | 바이두 언썬(ERNIE)            |
| **Volcano Engine**     | 바이트댄스 화산 엔진         |
| **Hugging Face**       | 오픈소스 모델 플랫폼         |

이 선택이 매우 중요합니다. 왜냐하면 온라인에서 보면, 국내 모델을 선택하더라도 국내 버전과 해외 버전이 나뉘어 있어서, 이 목록의 국내 모델 공급업체(예: Qwen, Z.AI 등)를 직접 선택하면 모델 진입 URL이 다를 수 있습니다.

그래서 저는 `Custom Provider`를 선택하고, 엔터를 눌러 주는 것을 권장합니다. (이렇게 하면 모델 진입 경로를 직접 정의하므로, 절대 틀리지 않습니다)



![image-20260306104908514](https://img.lingflux.com/2026/03/f0f7b7cf1b38d23375a9c9d36a8abea8.png)



그러면 API Base URL을 입력하라는 메시지가 나타납니다. 여기에 해당 URL을 복사하면 됩니다. 데모에서 저는 방금 읽어보라고 한 주소를 복사했습니다:
https://open.bigmodel.cn/api/anthropic   (입력이 완료되면 엔터를 누르세요)

![image-20260306105524813](https://img.lingflux.com/2026/03/1bcc60387a3ba29b530e1bb53be24bf8.png)

지금 API KEY를 입력할지 묻습니다. Paste API key now(지금 입력)를 선택하고, 엔터를 누르세요

![](https://img.lingflux.com/2026/03/05a5eca5b5fa006180662a65d2ae9381.png)

이제 API KEY를 복사한 후 엔터를 누르세요

![image-20260306105827355](https://img.lingflux.com/2026/03/291d99669c65b615d719844ddf743cee.png)

그러면 선택한 AI 제공업체가 **어떤 인터페이스 형식**을 사용하는지 묻습니다:

- **OpenAI-compatible**: 인터페이스 형식이 OpenAI와 같습니다. 대부분의 모델 제공업체가 이 형식을 지원합니다 (OpenRouter, Kimi, 화산 엔진, Mistral 등)
- **Anthropic-compatible**: 인터페이스 형식이 Anthropic(Claude)과 같습니다

저의 URL은 Claude Code 호환이므로, 「Anthropic-compatible」를 선택하면 됩니다

![image-20260306110230234](https://img.lingflux.com/2026/03/b515ca0d12b745463dee0ae52c35b1ab.png)

그 다음 모델 ID를 입력하라는 메시지가 나타납니다. 이것은 AI 제공업체 API의 지정된 이름을 확인해야 합니다.

데모에서는 GLM-4.7을 사용했습니다(실제로는 GLM-5.0까지 지원되므로, 모델 이름에 따라 입력하세요), 엔터를 누르세요

![image-20260306110457127](https://img.lingflux.com/2026/03/403f089e93c1d87df6cad0021532f953.png)

잠시 기다리면 API 연결성 테스트를 진행하고, 테스트가 성공하면 「Verification successful」이 표시됩니다. 축하합니다. 설정 과정 중 가장 복잡한 단계를 완료했습니다.

![image-20260306110630506](https://img.lingflux.com/2026/03/3d695e4ca1951bb4247a8e87c66f1295.png)

그러면 Endpoint ID를 입력하라는 메시지가 나타납니다. 이 AI 제공업체에 **고유한 이름**을 지정하여 구분하기 위함입니다. 기본값 그대로 엔터를 누르세요.

그러면 Model alias를 입력하라는 메시지가 나타납니다. 모델에 **짧은 별명**을 지정하여 나중에 전환할 때 타이핑을 줄입니다. 기본값 비워두거나 입력한 후 엔터를 누르세요.



### 4, **어떤 채팅 소프트웨어**를 통해 AI와 대화할지 선택합니다.

간단히 말하면: AI 봇과 어디서 채팅하고 싶으세요?

------

일반 옵션 설명

| 옵션             | 설명                       |
| ---------------- | -------------------------- |
| **Telegram**     | 추천✅ 설정하기 가장 쉽고, 초보자에게 친화적 |
| **Discord**      | 게임/커뮤니티 사용자에게 적합 |
| **Slack**        | 업무 환경에 적합           |
| **飞书/Lark**    | 국내 기업에서 자주 사용     |
| **LINE**         | 일본/동남아시아에서 자주 사용 |
| **iMessage**     | 애플 사용자                |
| **Signal**       | 프라이버시 중요            |
| **Skip for now** | 나중에 설정                |

여기서는 일단 「Skip for now」를 선택하세요. 지면 관계상 다음에 설명하겠습니다.

![image-20260306111140666](https://img.lingflux.com/2026/03/d1d97190310ba6be3e243af0b89ce93c.png)

### 5, 스킬(skills)을 설정할지 선택합니다.

마찬가지로 NO를 선택하세요. 지면 관계상 다음에 설명하겠습니다.

![image-20260306111359363](https://img.lingflux.com/2026/03/2fbc070efc12fe983d83711229631147.png)



### 6, 그 다음 일련의 API 설정이 나옵니다. 모두 NO로 건너뛰세요

이것은 **추가 기능 플러그인**을 설정할지 묻는 것이고, 각각은 해당 API Key가 필요합니다:

------

| 프롬프트                       | 기능                        | 필요한 것             |
| ------------------------------ | --------------------------- | -------------------- |
| **GOOGLE_PLACES_API_KEY**      | 지도/장소 검색(Google 지도) | Google Cloud API Key |
| **GEMINI_API_KEY**             | Gemini AI 모델 사용         | Google AI Studio Key |
| **NOTION_API_KEY**             | Notion 노트 연결            | Notion 통합 Token    |
| **OPENAI_API_KEY (image-gen)** | AI 이미지 생성(DALL-E)       | OpenAI API Key       |
| **OPENAI_API_KEY (whisper)**   | 음성 텍스트 변환            | OpenAI API Key       |
| **ELEVENLABS_API_KEY**         | AI 음성 합성(텍스트 음성 변환) | ElevenLabs Key       |

------

어떻게 처리할까요? **지금은 모두 No/건너뛰기를 선택하세요**, 이유:

- 이것들은 선택적 기능이고, 기본 사용에 영향을 주지 않습니다
- 해당 계정이 없으면 억지로 입력해도 사용할 수 없습니다
- 나중에 언제든지 설정할 수 있습니다

![image-20260306111518497](https://img.lingflux.com/2026/03/66c6830490fd101cd8bc45b7b3bf041c.png)

### 7, **Hooks는 자동화 트리거**로, 특정 이벤트가 발생할 때 자동으로 특정 작업을 실행합니다.

| 옵션                      | 작용                                         |
| ------------------------- | -------------------------------------------- |
| **Skip for now**          | 모두 건너뛰기                                 |
| **boot-md**               | 시작 시 자동으로 특정 명령어/프롬프트 로드   |
| **bootstrap-extra-files** | 시작 시 자동으로 추가 파일 로드               |
| **command-logger**        | 모든 작업 로그 기록                           |
| **session-memory**        | `/new` 또는 `/reset`를 보낼 때 현재 대화 기억 자동 저장 |

------

**`session-memory`만 선택**하는 것을 권장합니다. 가장 실용적이고, AI가 이전 대화 내용을 기억하게 해줍니다.

다른 것들은 처음 사용할 때는 건너뛰고, 익숙해진 후에 활성화하세요.

**스페이스바로 선택**, 엔터로 확인합니다.

![image-20260306111717358](https://img.lingflux.com/2026/03/ef24d76177a3e999293f7e0da00389da.png)



### 8, 어떤 방식으로 봇을 시작하고 사용할지 선택합니다:

- **Hatch in TUI**: 터미널에서 직접 사용, 명령행 인터페이스.
- **Open Web UI**: (추천) 브라우저에서 웹 인터페이스를 열어서 조작.
- **Do this later**: 나중에.

여기서 「Open Web UI」를 선택하고, 엔터를 누르세요

![image-20260306112107760](https://img.lingflux.com/2026/03/3244eb382e44133d4cc81f6ec18e57af.png)

그러면 브라우저가 자동으로 OpenClaw Web UI를 엽니다.

## 가재(OpenClaw)와 처음 대화하기

![image-20260306112419909](https://img.lingflux.com/2026/03/f40a3a5c08362eecb739689dbcba3139.png)

OpenClaw가 응답하면 설치가 성공하고 정상적으로 실행 중인 것입니다.

축하합니다!

하지만 지금, 키우는 가재는 밥만 먹고 손발이 없어서, 시키는 것을 할 수 없습니다 (브라우저를 열 수 없고, 파일을 수정할 수 없습니다).

![image-20260306113036590](https://img.lingflux.com/2026/03/833a2ec19f73a2caab5a9aeb5138a0d2.png)





## 브라우저 및 파일 작업 권한 설정

주의하세요: 다음 작업은 OpenClaw의 권한을 높이므로, 관련 내용을 자세히 읽고 학습해 주세요.

### OpenClaw 브라우저 제어에는 2가지 모드가 있습니다

1, (독립 모드) OpenClaw 내장 브라우저를 사용하여, 로컬 시스템과 완전히 격리하고, 독립적인 로그인 정보가 있습니다.

2, (확장 모드) 로컬 Chrome 브라우저를 사용하고, OpenClaw Browser Relay 확장 프로그램을 설치하여, 로컬 로그인 정보를 공유합니다.

>  이 예제는 **확장 모드**를 사용합니다. 로컬 Chrome 브라우저를 사용합니다.



### OpenClaw gateway token KEY 찾기

OpenClaw gateway token KEY는 비밀번호처럼 다뤄야 하고, 잘 보관해야 합니다.

OpenClaw gateway token KEY를 얻는 방법은 2가지가 있습니다:

#### 1, 설정 파일에서 직접 찾기

macOS의 설정 파일은 사용자 디렉토리에 있고, 숨김 파일이므로 숨김 파일 표시를 활성화해야 `.openclaw` 폴더를 찾을 수 있습니다. 열어서 openclaw.json 파일을 열고, 「gateway」 부분에서 token을 찾으세요.

![image-20260306122344215](https://img.lingflux.com/2026/03/537f4f44ca08c446ef9ede6549ddb90d.png)

#### 2, Web UI에서 보기 (이 방법이 가장 간단합니다)

「Overview」를 클릭하고, 「Gateway Token」 아래에 있으며, 아주 간단하게 볼 수 있습니다.

![image-20260306122950056](https://img.lingflux.com/2026/03/54be336e2aaa6342c1289fc5370c270a.png)




### 1, Chrome에 브라우저接管(제어) 확장 프로그램 설치

Chrome 확장 프로그램 마켓 (https://chromewebstore.google.com/)에서「OpenClaw Browser Relay」를 검색하세요

(기사 작성 시점 이미 v2.7 버전)을 설치합니다. (주의: 현재 많은 OpenClaw Browser가 있으니, 잘 보고 틀리지 말고 설치하세요)

설치가 완료되면 페이지가 뜨고, token KEY를 입력하여 인증하라는 메시지가 나타납니다. 여기에 입력하는 것은 OpenClaw의 gateway token KEY입니다. AI API KEY가 아니므로 혼동하지 마세요.

설정이 완료되면, 이 확장 프로그램을 상단에 고정하여 사용하기 편하게 할 수 있습니다. (나중에 수동으로 조작해야 하니, 기억하세요)

![image-20260306114923386](https://img.lingflux.com/2026/03/9b0e0c0e5bc27812210d0b9886a1962d.png)



### 2, 개발자 모드 활성화

브라우저에 chrome://extensions/를 다시 입력하고, 엔터를 눌러 확장 프로그램 관리 페이지로 들어가세요. 페이지 오른쪽 상단에 「Developer mode」(개발자 모드) 스위치가 있고, 활성화되었는지 확인하세요. 활성화되지 않았으면 활성화하세요.



### 3, OpenClaw 브라우저 및 파일 작업 지원 설정

CLI 설정을 사용합니다. 터미널(명령행 도구)을 열고 다음 명령어를 입력하세요:

```bash
# openclaw의 권한을 coding 레벨로 높이기
openclaw config set tools.profile coding

# 브라우저 기능 활성화 확인
openclaw config set browser.enabled true

# 시스템 Chrome으로 전환 (이것이 "시스템 기본 Chrome"의 공식 방법)
openclaw config set browser.defaultProfile "chrome"

# allowlist 비우기 (coding profile가 올바른 파일 도구를 자동으로 노출하도록 함, 이것이 핵심!)
openclaw config set tools.allow '[]'

# 설정 완료, openclaw gateway 재시작 (필수)
openclaw gateway restart
```

다음과 같이 표시됩니다:

![image-20260306113653129](https://img.lingflux.com/2026/03/02f6c0258cc846cf7699cd372bbb8a03.png)

재시작이 완료된 후...

1, 브라우저를 열고, 아무 페이지나 방문하세요. 예를 들어 https://lingshunlab.com, 그리고 방금 설치한 확장 프로그램(가재)을 클릭하면, 「ON」이라는 작은 표시가 나타나고, 정상적으로 작동하는 것을 의미합니다.

![image-20260306124413421](https://img.lingflux.com/2026/03/4ef9d1f4eb78a3ca6b2463ed0e809f89.png)

2, OpenClaw Web UI 페이지로 들어가서 「Chat」 대화를 하세요. 하지만 대화 전에 먼저 「New session」을 하고, 「브라우저로 bilibili.com 열어」와 같은 메시지를 보내세요.

모든 것이 정상이면, 이때 브라우저가 자동으로 bilibili 사이트를 엽니다.

![image-20260306123830087](https://img.lingflux.com/2026/03/7580e05a2df8e32d72a7370d3fa964a5.png)

이때 파일 작업 기능도 시도해 보세요. 「사용자 디렉토리에 파일을 만들어 주세요, 파일 생성 기능을 테스트합니다」와 같은 메시지를 보내면, 가재가 파일을 성공적으로 만들어 줍니다.

![image-20260306124032376](https://img.lingflux.com/2026/03/3532062bde99391b12d64eb1c8e2de3b.png)



모든 것이 정상이면 축하합니다. 하지만... 조금 무섭죠? 만약...

그래서 저는 파일 작업 권한을 「workspace」작업 공간 디렉토리로 제한해야 합니다. 이 작업 공간 디렉토리는 어디에 있나요? openclaw.json 설정을 보거나, Web UI의 「Agents」의 「Overview」에서 볼 수 있습니다.

![image-20260306125311134](https://img.lingflux.com/2026/03/6b0ba79477058ff2819ac69caca95fb3.png)



### 4, 파일 작업을 작업 공간 디렉토리로만 제한

CLI 설정을 사용합니다. 터미널(명령행 도구)을 열고 다음 명령어를 입력하세요:

```bash
# 파일 작업을 작업 공간 디렉토리로만 제한
openclaw config set tools.fs.workspaceOnly true
```

gateway를 재시작하세요

```bash
openclaw gateway restart
```




## 마무리

이제 가재에게 손이 생겼습니다.

그것은 브라우저를 열고, 페이지를 클릭하고, 지정한 작업 영역에서 파일을 읽고 쓸 수 있습니다 - 이것은 간단하게 들리지만, 뒤에서 할 수 있는 것은 사실 많습니다.

다음 글에서는 그것을 비트다오(Feishu)에 연결하는 방법을 보여드리겠습니다. 어디에 있든 "가재를 키우는 클라우드"를 할 수 있습니다.

관심이 있으시면 제 채널을 팔로우해 주세요. 계속 업데이트하겠습니다:

- 🎬 **YouTube**: [lingshunlab](https://www.youtube.com/@lingshunlab)
- 📺 **Bilibili**: [凌顺实验室](https://space.bilibili.com/456183128)


## 참고

### **`tools.profile`** 권한

https://docs.openclaw.ai/tools#tool-profiles-base-allowlist

OpenClaw(2026.3.2 및 최신 버전)의 **`tools.profile`**은 도구 권한의 **기본 프리셋(base allowlist)**이고, 이 설정 항목은 **보안에 큰 영향**을 줍니다: 새로 설치하면 기본값은 `"messaging"`입니다(2026.3.x부터 중요한 보안 업그레이드). 이전 버전의 많은 사용자가 익숙한 broad/coding은 이제 명시적으로 설정해야 합니다.

### 권한 비교(핵심 차이점)

| 차원                                            | minimal               | messaging                 | coding                                     | full                  |
| ----------------------------------------------- | --------------------- | ------------------------- | ------------------------------------------ | --------------------- |
| **파일 작업** (fs.read/write/edit/apply_patch)   | ✗ 완전 금지          | ✗ 금지                    | ✓ 허용(fs.workspaceOnly로 추가 제한 가능) | ✓ 허용                |
| **Shell 실행** (exec/runtime/process)           | ✗ 금지                | ✗ 금지                    | ✓ 허용(approvals.exec 승인 추가 가능)      | ✓ 허용                |
| **브라우저** (browser)                           | ✗ 금지                | ✗ 금지                    | ✓ 허용                                     | ✓ 허용                |
| **메시지/세션 관리** (sessions_*, messaging group) | session_status만 허용 | ✓ 완전 지원                | ✓ 완전 지원                                 | ✓ 완전 지원            |
| **이미지/메모리 도구** (image, memory_*)        | ✗ 금지                | ✗ 금지                    | ✓ 부분 지원                                 | ✓ 완전 지원            |
| **기타 위험 도구** (cron, gateway, nodes 등)    | ✗ 금지                | ✗ 금지                    | ✗ 대부분 금지(허용 필요)                   | ✓ 가능 열기           |
| **기본 새로 설치**                               | ✗ 기본값 아님         | ✓ 예(2026.3.x 중요 변경) | ✗ 수동 설정 필요                            | ✗ 수동 설정 필요        |
| **추천 대상**                                    | 극도 보안, 채팅만    | 일반 사용자, 초보자, 채팅 위주 | 개발자, 코드/파일 중도 사용자              | 테스트, POC, 모델을 신뢰할 때 |


### browser 자주 사용하는 명령어 목록

https://docs.openclaw.ai/tools/browser

