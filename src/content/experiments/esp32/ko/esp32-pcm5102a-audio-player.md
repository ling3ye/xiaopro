---
title: "ESP32-S3 + PCM5102A MP3 재생｜I2S 배선 + Arduino 코드 전체 가이드"
boardId: esp32s3
moduleId: audio/pcm5102a
category: esp32
date: 2026-04-22
intro: "ESP32-S3과 PCM5102A DAC 모듈을 I2S로 연결하고, ESP32-audioI2S 라이브러리로 Wi-Fi MP3 스트리밍 재생을 구현합니다. 배선 10개 이내, 코드 50줄 이내로 초보자도 쉽게 시작할 수 있습니다."
image: "https://img.lingflux.com/2026/04/0c35d50bc32e0bd67636e15a21d5e2ed.png"
---

# ESP32-S3 + PCM5102A MP3 재생 완전 튜토리얼（I2S 배선 + Arduino 코드）

> **한 줄 요약：** ESP32-S3 개발 보드와 PCM5102A DAC 모듈을 I2S로 연결하고, ESP32-audioI2S 라이브러리를 사용해 Wi-Fi로 MP3를 스트리밍 재생합니다. 배선 10개 이내, 코드 50줄 이내로 초보자도 바로 시작 가능합니다.

---

## TL;DR（빠른 시작）

긴 설명은 필요 없다면 여기만 보세요：

1. ESP32-S3의 GPIO17（BCK）、GPIO16（LCK）、GPIO15（DIN）을 각각 PCM5102A의 BCK、LCK、DIN에 연결
2. PCM5102A의 XMT 핀을 3.3V에 연결（또는 GPIO7로 코드에서 HIGH 설정）. 나머지 제어 핀（FMT/SCL/DMP/FLT）은 모두 GND에 연결
3. Arduino 라이브러리 설치：ESP32-audioI2S（by schreibfaul1）
4. 아래 코드를 복사하고, Wi-Fi 정보를 수정한 후 업로드

---

**ESP32-S3 + PCM5102A** 조합은 DIY 오디오 프로젝트 중 가성비가 뛰어난 선택 중 하나입니다. ESP32-S3이 Wi-Fi 연결, MP3 가져오기, 오디오 스트림 디코딩을 담당하고, PCM5102A가 디지털 신호를 아날로그 오디오로 변환하여 이어폰이나 스피커로 출력합니다. 전체 비용이 몇 천 원에 불과하지만, 동일 가격대 제품을 훨씬 능가하는 음질을 제공합니다.

본 튜토리얼의 모든 배선과 코드는 실제 테스트를 통과했습니다. 단계별로 따라 하면 동일한 결과를 얻을 수 있습니다.

---

## 최종 결과

ESP32-S3에 전원을 연결하면 자동으로 Wi-Fi에 연결되고, 네트워크에서 MP3 오디오 스트림을 가져와 PCM5102A로 디코딩하여 출력합니다. 이어폰이나 스피커에서 소리가 재생됩니다. 터치스크린이나 버튼 조작 없이 전원만 연결하면 바로 재생이 시작됩니다.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/CjGkTj7KaQo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## PCM5102A 오디오 모듈 소개

### PCM5102A란？

**PCM5102A**는 Texas Instruments에서 제조한 고성능 스테레오 **DAC 칩**（디지털-아날로그 변환기）입니다.

ESP32-S3이 출력하는 것은 **디지털 오디오 신호**（I2S 형식의 0과 1）이지만, 이어폰과 스피커는 디지털 신호를 이해하지 못합니다. 이해할 수 있는 것은 **아날로그 전압 신호**（시간에 따라 변화하는 파형）뿐입니다. PCM5102A는 이 둘 사이의 "통역사" 역할을 하여, 디지털 신호를 실시간으로 오디오 기기가 이해할 수 있는 아날로그 신호로 변환합니다.

### PCM5102A 주요 사양

| 파라미터 | 사양 |
|---|---|
| 인터페이스 | I2S（ESP32와 네이티브 호환） |
| 지원 샘플링 레이트 | 8kHz ～ 384kHz |
| 다이내믹 레인지 | 112dB（섬세한 음질, 극히 낮은 노이즈 플로어） |
| 작동 전압 | 3.3V 단일 전원（ESP32와 완벽 호환） |
| MCLK | 내장 PLL, 외부 마스터 클럭 불필요 |
| 출력 | 내장 차동 드라이브, 강력한 노이즈 내성 |

**왜 PCM5102A를 선택하는가？** 저렴하고, 사용하기 쉽고, 3.3V로 직접 구동되고, 외부 클럭이 필요 없으며, 112dB의 다이내믹 레인지는 MCU 기반 오디오로서 매우 우수합니다 — ESP32 프로젝트에서 가장 인기 있는 I2S DAC 파트너입니다.

### PCM5102A 핀 기능 설명

| 핀 라벨 | 기능 | ESP32-S3 연결 | 비고 |
|---|---|---|---|
| **3.3V** | 로직 전원（3.3V） | ESP32 3.3V에 연결 | 필수 |
| **GND** | 그라운드 | ESP32 GND에 연결 | 필수 — 공통 그라운드가 중요 |
| **BCK** | I2S 비트 클럭 | GPIO17에 연결 | 핵심 I2S 신호 |
| **LCK** | I2S 좌우 채널 클럭（LRCK/WS） | GPIO16에 연결 | 핵심 I2S 신호 |
| **DIN** | I2S 오디오 데이터 입력 | GPIO15에 연결 | 핵심 I2S 신호 |
| **XMT** | 소프트 뮤트 제어（HIGH = 정상 출력） | 3.3V 또는 GPIO7 | **반드시 HIGH로 설정해야 함. 그렇지 않으면 소리가 나지 않음** |
| **FMT** | 오디오 포맷 선택（LOW = I2S） | GND에 연결 | GND에 연결만 하면 됨 |
| **SCL** | 시스템 마스터 클럭（내장 PLL로 대체 가능） | GND에 연결 | GND에 연결만 하면 됨 |
| **DMP** | 디엠퍼시스 제어 | GND에 연결 | GND에 연결만 하면 됨 |
| **FLT** | 디지털 필터 모드 | GND에 연결 | GND에 연결만 하면 됨 |

> **기억할 규칙：** FMT、SCL、DMP、FLT 네 개의 제어 핀은 모두 GND에 연결하세요. 간단하고, 안정적이며, 실수가 없습니다.

---

## 필요 부품（BOM）

| 부품 | 수량 | 비고 |
|---|---|---|
| ESP32-S3 개발 보드 | × 1 | 임의의 ESP32-S3 DevKit 가능 |
| PCM5102A 오디오 모듈 | × 1 | 온라인에서 구매 가능, 약 2,000～3,000원 |
| 점퍼 와이어（Dupont 와이어） | 약간 | 수-수 / 수-암 보드에 맞게 |
| 이어폰 또는 소형 스피커 | × 1 | 3.5mm 이어폰 또는 패시브 스피커 |

---

## ESP32-S3과 PCM5102A 배선

배선은 이 실험에서 가장 오류가 발생하기 쉬운 부분입니다. 배선이 끝나면 표와 **하나씩 대조**하는 것이 좋습니다 — 트러블슈팅 시간을 80% 줄일 수 있습니다.

| ESP32-S3 GPIO | PCM5102A 핀 | 기능 설명 |
|---|---|---|
| 3.3V | **3.3V** | 로직 전원 |
| GND | **GND** | 그라운드（반드시 공통으로！） |
| **GPIO 17** | **BCK** | I2S 비트 클럭 |
| **GPIO 16** | **LCK** | I2S 좌우 채널 클럭（LRCK/WS） |
| **GPIO 15** | **DIN** | I2S 오디오 데이터 입력 |
| **GPIO 7** | **XMT** | 소프트 뮤트 제어（코드에서 HIGH로 설정. 또는 3.3V에 직접 연결） |
| GND | FMT / SCL / DMP / FLT | 포맷 및 제어 핀（모두 GND로） |

---

## 필요한 Arduino 라이브러리

Arduino IDE의 라이브러리 매니저에서 검색하여 설치：

**ESP32-audioI2S**（작성자：schreibfaul1）

찾을 수 없는 경우 GitHub에서 ZIP을 다운로드하여 수동 설치：[https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

---

## 전체 Arduino 코드（테스트 완료）

다음 코드는 ESP32-S3 + PCM5102A에서 테스트를 완료했습니다. 복사해서 Wi-Fi 정보를 수정하고 업로드하세요：

```cpp
// 더 많은 실험은 www.lingflux.com에서 확인하세요

#include <Arduino.h>
#include <WiFi.h>
#include <Audio.h>

// ── Wi-Fi 설정（본인 환경에 맞게 수정）──────────────────────
const char* ssid     = "WiFi이름";
const char* password = "WiFi비밀번호";

// ── I2S 핀 정의 ─────────────────────────────────────────
#define I2S_BCLK  17   // BCK：비트 클럭
#define I2S_LRCK  16   // LCK：좌우 채널 클럭
#define I2S_DOUT  15   // DIN：오디오 데이터
#define XMT        7   // XMT：소프트 뮤트 제어（HIGH = 정상 출력）

Audio audio;

void setup() {
  Serial.begin(115200);

  // 1단계：XMT를 HIGH로 설정하여 PCM5102A 뮤트 해제
  pinMode(XMT, OUTPUT);
  digitalWrite(XMT, HIGH);

  // 2단계：Wi-Fi 연결
  WiFi.begin(ssid, password);
  Serial.print("Wi-Fi 연결 중");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi 연결 성공！");

  // 3단계：I2S 핀 및 볼륨 설정
  audio.setPinout(I2S_BCLK, I2S_LRCK, I2S_DOUT);
  audio.setVolume(18);  // 볼륨 범위 0～21, 18은 편안한 기본값

  // 4단계：온라인 MP3 재생
  audio.connecttohost("https://pixabay.com/music/download/id-219731.mp3");
  Serial.println("오디오 재생 시작...");
}

void loop() {
  // 지속적으로 호출하여 오디오 디코딩 및 재생 유지（생략 불가！）
  audio.loop();
}

// 디버그 콜백：라이브러리 동작 상태 출력（트러블슈팅에 유용）
void audio_info(const char *info) {
  Serial.print("Audio Info: ");
  Serial.println(info);
}
```

**코드 설명：**

- `audio.setVolume(18)`：볼륨 범위는 0～21입니다. 18은 기본 테스트값이며, 필요에 따라 조정하세요.
- `connecttohost()`：HTTP/HTTPS 직접 MP3 링크를 지원합니다. URL이 만료되면 다른 링크로 교체하세요.
- `audio.loop()`：`loop()` 안에서 지속적으로 호출해야 합니다. 오디오 스트림의 디코딩과 출력을 유지합니다. 삭제하지 마시고, 옆에 시간이 많이 걸리는 작업도 추가하지 마세요.

---

## 자주 묻는 질문과 트러블슈팅（FAQ）

### Q：배선하고 전원을 켰는데 소리가 전혀 나지 않아요. 어떻게 확인하나요？

초보자가 가장 자주 겪는 문제입니다. 다음 순서대로 확인하면 90%의 경우 해결됩니다：

**① 공통 그라운드 확인** ESP32-S3과 PCM5102A의 GND는 반드시 점퍼 와이어로 연결해야 합니다. 공통 그라운드가 없으면 신호의 회로가 완성되지 않아 어떤 소리도 나지 않습니다. 초보자가 가장 놓치기 쉬운 부분입니다.

**② I2S 핀 배선 오류 확인** BCK、LCK、DIN 세 가닥의 선은 하나라도 잘못 연결하면 완전히 무음이거나 지속적인 노이즈가 발생합니다. 아래 표로 다시 확인하세요：

| ESP32-S3 GPIO | PCM5102A 핀 |
| ------------- | ------------- |
| GPIO 17       | BCK           |
| GPIO 16       | LCK           |
| GPIO 15       | DIN           |

**③ XMT가 HIGH인지 확인** XMT는 PCM5102A의 소프트 뮤트 제어 핀입니다：LOW = 뮤트, HIGH = 정상 재생. HIGH로 설정하는 것을 잊으면 칩이 계속 뮤트 상태가 됩니다. 해결 방법：코드에 `digitalWrite(7, HIGH)`를 추가하거나, XMT를 3.3V에 직접 연결하세요.

------

### Q：재생 중에 "딱딱" 또는 "탁탁"하는 노이즈가 들려요. 원인은？

ESP32 오디오 프로젝트에서 가장 많이 논의되는 문제 중 하나입니다. 여러 원인이 가능하므로 하나씩 확인해야 합니다. 가능성이 높은 순서대로 나열합니다：

**원인 1：I2S 버퍼 언더런**（가장 가능성 높음）

ESP32가 MP3를 디코딩하거나 네트워크/SD 카드에서 데이터를 읽을 때, CPU 부하가 갑자기 증가하거나 버퍼가 너무 작거나 디코딩 속도가 I2S 출력 속도를 따라가지 못하면 일시적인 데이터 끊김이 발생합니다. PCM5102A가 연속적인 클럭을 받고 있지만 데이터 라인이 일시적으로 0이 되면 재현 가능한 노이즈가 발생합니다.

해결 방법：`i2s_config`의 `dma_buf_count`（8～16 권장）와 `dma_buf_len`（256～1024 권장）를 늘리세요. `xTaskCreate`를 사용하는 경우 오디오 태스크의 우선순위를 Wi-Fi 및 다른 백그라운드 태스크보다 높게 설정하세요.

**원인 2：샘플링 레이트 또는 비트 심도 불일치**

오디오 파일의 샘플링 레이트（44.1kHz / 48kHz）가 ESP32 I2S 설정과 일치하지 않거나, 24bit와 16bit가 혼용될 때 발생하기 쉽습니다.

해결 방법：모든 오디오 파일을 44.1kHz, 16bit, 스테레오로 통일 변환하세요（ffmpeg로 일괄 처리 가능）. I2S 설정에서 `bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT`를 명시적으로 설정하세요.

**원인 3：하드웨어 신호 무결성 문제**

I2S 배선이 너무 길거나 직렬 댐핑 저항이 없으면 신호 에지에 리플링이 발생하여 똑딱 소리가 날 수 있습니다. ESP32의 Wi-Fi/CPU 활동이 공유 3.3V 전원을 통해 노이즈를 주입할 수도 있습니다.

해결 방법：BCK, LCK, DIN 세 가닥 신호 라인에 각각 33～100Ω 직렬 저항을 추가하세요（ESP32 쪽 가까이 배치）. PCM5102A에 전용 10μF + 0.1μF 디커플링 커패시터를 추가하거나 독립 LDO로 전원을 공급하세요.

**원인 4：PCM5102A 내부 자동 뮤트 트리거**

DIN 데이터가 일시적으로 0이나 Low 레벨이 되면 칩 내부의 스마트 뮤트 로직이 트리거되어 미세한 팝 노이즈가 발생합니다.

해결 방법：재생 시작/종료 시 소프트웨어로 페이드인/페이드아웃 트랜지션을 삽입하세요.

**빠른 진단 단계：** 먼저 표준 WAV 파일（44.1kHz 16bit）로 테스트하여 MP3 디코딩을 우회하세요. 같은 위치에서 노이즈가 계속 나면 버퍼 관련 문제일 가능성이 높습니다. 그 후 MP3 디코딩과 네트워크 스트리밍을 단계적으로 추가하여 문제 범위를 좁히세요.

------

### Q：온라인 재생이 끊기거나 중단돼요. 어떻게 해야 하나요？

온라인 재생은 네트워크 품질에 의존합니다. 신호가 약하거나 대역폭이 불안정하면 끊기기 쉽습니다. 먼저 더 빠른 MP3 직접 링크로 테스트해 보세요. 네트워크 자체에 문제가 없다면 SD 카드나 SPIFFS에서 로컬 오디오 파일을 읽도록 변경하여 네트워크 요인을 완전히 제거할 수 있습니다.

------

### Q：ESP32-S3의 I2S 핀을 다른 GPIO로 변경할 수 있나요？

네. ESP32-S3의 I2S 페리페럴은 임의 GPIO 매핑을 지원합니다. 코드에서 `#define I2S_BCLK`、`I2S_LRCK`、`I2S_DOUT`의 값만 변경하면 됩니다. 고정 핀에 제약받지 않습니다.

------

### Q：PCM5102A는 어떤 샘플링 레이트를 지원하나요？

PCM5102A는 8kHz、16kHz、32kHz、44.1kHz、48kHz、96kHz、192kHz、384kHz를 지원하며, 일상적인 MP3（일반적으로 44.1kHz）의 모든 재생 요구를 완전히 충족합니다.

------

### Q：PCM5102A를 5V로 구동할 수 있나요？

온보드 LDO가 탑재된 일부 PCM5102A 모듈은 5V 입력을 지원하며 내부에서 3.3V로 강하합니다. 모듈에 3.3V 핀만 있고 5V 핀이 없다면 3.3V로 구동하세요. 안정성과 ESP32-S3과의 로직 레벨 호환성 측면에서 3.3V 전원 공급을 권장합니다.

------

### Q：ESP32-S3에서 MP3 재생 시 CPU 사용률이 높나요？

ESP32-audioI2S 라이브러리는 ESP32-S3의 듀얼코어 아키텍처를 활용하여 오디오 디코딩 태스크를 독립된 코어에서 실행하므로 메인 루프에 미치는 영향이 최소화됩니다. 일반적인 사용 시 CPU 사용률은 10%～30% 범위이며, 다른 동시 태스크에 영향을 주지 않습니다.

------

### Q：오디오 재생과 TFT 디스플레이 구동을 동시에 할 수 있나요？

네. ESP32-S3의 성능은 I2S 오디오 출력과 SPI TFT 디스플레이를 동시에 처리하기에 충분합니다. 단, `loop()`에 오래 차단하는 작업을 넣지 않도록 주의하세요. `audio.loop()`의 호출 빈도에 영향을 주어 오디오 끊김이나 노이즈의 원인이 됩니다.

------

### Q：PCM5102A의 출력 인터페이스는？ 앰프에 연결할 수 있나요？

PCM5102A 모듈은 일반적으로 표준 3.5mm 스테레오 아날로그 오디오 출력을 제공하며, 이어폰이나 패시브 스피커에 직접 연결할 수 있습니다. 앰프에 연결하려면 모듈의 LINE OUT 인터페이스를 사용하는 것이 좋습니다. 출력 레벨이 앰프 입력에 더 적합하고 음질도 좋습니다.

------

### Q：ESP32-S3과 일반 ESP32의 I2S 오디오 차이점은？

ESP32-S3의 클럭 속도（240MHz 듀얼코어）는 초기 ESP32보다 높아 MP3 등의 포맷 디코딩이 더 원활하고, 프레임 드롭과 노이즈 발생 확률이 더 낮습니다. 또한 GPIO 리소스가 더 풍부하여 오디오, 디스플레이, 네트워크를 동시에 다루는 복합 프로젝트에 적합합니다.

---

## 참고 자료

- **PCM5102A 데이터시트（Texas Instruments）：**
  [https://www.ti.com/lit/ds/symlink/pcm5102a.pdf](https://www.ti.com/lit/ds/symlink/pcm5102a.pdf)

- **ESP32-audioI2S 라이브러리（GitHub, by schreibfaul1）：**
  [https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

- **Espressif ESP32-S3 기술 문서：**
  [https://www.espressif.com/en/products/socs/esp32-s3](https://www.espressif.com/en/products/socs/esp32-s3)

---

*더 많은 ESP32 실험과 튜토리얼은 [www.lingflux.com](http://www.lingflux.com)에서 확인하세요*
