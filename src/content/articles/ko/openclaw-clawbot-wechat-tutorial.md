---
title: "위챗에서 직접 AI와 채팅? OpenClaw ClawBot 통합 실전 튜토리얼 (공식 지원, 계정 정지 없음)"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-22
intro: "위챗이 공식으로 플러그인 메커니즘을 개방했습니다. 위챗의 ClawBot을 사용하여 OpenClaw와 연결하여 채팅할 수 있습니다. 이 문서에서는 완전한 설치 프로세스와 일반적인 문제 해결 방법을 제공합니다."
image: "https://img.lingflux.com/2026/03/e0160b21b299a1ed5acdb00b763871a7.png"
tags: ["openclaw", "clawbot", "위챗 플러그인", "WeChat AI", "OpenClaw 튜토리얼"]
---

위챗이 공식으로 플러그인 메커니즘을 개방했습니다. 이제 OpenClaw의 ClawBot을 위챗에 직접 연결할 수 있습니다—서드파티 크래킹이 필요 없고, 계정 정지 걱정도 없습니다. v8.0.70으로 업데이트하면 바로 사용할 수 있습니다.

이 문서는 제가 직접 테스트하여 성공한 완전한 프로세스를 기록했습니다. 막혔던 부분과 해결 방법도 포함되어 있습니다.

---

## 전제 조건: 위챗 버전은 v8.0.70 이상이어야 함

플러그인 진입점은 새 버전에서만 사용할 수 있는 기능입니다. 버전이 충분하지 않으면 찾을 수 없습니다.

업데이트 후 **위챗을 수동으로 닫았다가 다시 열어주세요**—백그라운드 전환이 아니라 완전히 종료하고 다시 시작하는 것입니다. 처음에는 재시작하지 않아서 설정에서 플러그인 진입점을 찾느라 시간을 낭비했습니다. 재시작하자마자 바로 나타났습니다.

---

## 방법 1: 공식 프로세스 (순조롭다면 5분 완료)

### 1단계: 전용 설치 명령어 찾기

모바일 위챗에서 다음 경로로 이동합니다:

**"나" → "설정" → "플러그인" → ClawBot 찾기 → "상세"**

![ClawBot 플러그인 상세 페이지](https://img.lingflux.com/2026/03/f78858448a52037587812f6a540d9166.png)

여기에 전용 명령어가 표시됩니다. 형식은 다음과 같습니다:

```bash
npx -y @tencent-weixin/openclaw-weixin-cli@latest install
```

각 계정마다 생성되는 명령어는 약간씩 다릅니다. 본인 페이지에 표시된 명령어를 복사하세요.

### 2단계: OpenClaw를 실행하는 기기에서 명령어 실행

터미널을 열고 명령어를 붙여넣은 다음 Enter를 눌러 설치가 완료될 때까지 기다립니다.

![터미널에서 설치 명령어 실행](https://img.lingflux.com/2026/03/9118db862fbd4f96c48fe012cec2241c.png)

### 3단계: QR 코드 스캔으로 페어링

설치가 완료되면 터미널에 QR 코드가 나타납니다. 위챗으로 스캔하고 모바일에서 승인을 확인하세요.

### 4단계: 위챗으로 돌아가 ClawBot에 메시지 전송

페어링 성공 후 위챗에 ClawBot이 나타납니다. 바로 메시지를 보내서 사용할 수 있습니다.

---

## 방법 2: 설치가 멈췄을 때의 수동 해결책

터미널이 "플러그인 설치 중..."에서 2~3분 이상 아무 반응 없이 멈춰 있다면—더 이상 기다릴 필요 없습니다. 프로세스가 막힌 것입니다. `Ctrl+C`로 취소하거나 터미널 창을 직접 닫고 아래 수동 프로세스로 전환하세요. 저도 이 방법으로 성공했습니다.

### 1단계: OpenClaw Gateway 중지

```bash
openclaw gateway stop
```

### 2단계: 프로세스가 완전히 종료되었는지 확인

```bash
pkill -f openclaw
```

### 3단계: npm 방식으로 플러그인 수동 설치

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
```

### 4단계: 플러그인 활성화

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

### 5단계: QR 코드 스캔 바인딩 트리거 (중요 단계)

```bash
openclaw channels login --channel openclaw-weixin
```

터미널에 QR 코드 표시 → 위챗으로 스캔 → 모바일에서 승인 확인 → "위챗과 연결 성공"이 표시되면 바인딩 완료입니다.

![위챗 연결 성공 알림](https://img.lingflux.com/2026/03/b6e5065e87d9175a8499d84e32cf0964.png)

### 6단계: Gateway 재시작

이 단계는 건너뛰기 쉽지만 재시작하지 않으면 ClawBot이 메시지에 응답하지 않습니다.

```bash
openclaw gateway restart
```

---

## 성공 여부 확인

위챗으로 돌아가 ClawBot을 찾고 아무 메시지나 보내세요. 답장이 오면 모든 것이 정상 작동하는 것입니다.

![위챗에서 ClawBot이 정상적으로 응답](https://img.lingflux.com/2026/03/6a7c383c20c33490baa5b8cbcba4f1d0.png)

---

## 일반적인 문제 빠른 참조

| 문제 | 해결책 |
|---|---|
| 설치 명령어가 "플러그인 설치 중..."에서 멈춤 | 더 이상 기다리지 말고 방법 2로 진행 |
| QR 코드 스캔 후 모바일 반응 없음 | 위챗을 완전히 종료하고 다시 열어 스캔 재시도 |
| Gateway 재시작 후 ClawBot 응답 없음 | 4단계의 플러그인 enabled 설정이 저장되었는지 확인 |

---

위 프로세스는 macOS에서 테스트 완료되었습니다. Windows 명령줄 작업은 동일하지만 경로 구분 기호에 주의하세요.
