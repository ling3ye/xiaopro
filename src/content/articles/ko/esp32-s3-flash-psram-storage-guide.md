---
title: "구매 전 꼭 확인: ESP32-S3 접미사, Flash, PSRAM, 대략적 가격(위안화, C3 비교 포함)"
domain: hardware
platforms: ["cross-platform"]
format: "cheatsheet"
date: 2026-11-10
intro: "N4, N8R2, N16R8 같은 접미사가 말해 주는 건 딱 두 가지다. N 뒤는 Flash, R 뒤는 PSRAM. 흔한 다섯 보드의 용량과 대략적 가격(중국 위안화)을 한 표로 정리하고 고르는 법까지 설명한다."
tags: ["ESP32-S3", "ESP32-C3", "PSRAM", "Flash", "개발보드 선택", "ESP-IDF"]
relatedBoards: ["esp32s3"]
image: "https://img.lingflux.com/2026/11/bf80e841c5e9fb342ebc387e1e68edf8.jpg"
---

> 치트시트. 다섯 보드 모두 USB-C를 꽂으면 바로 쓸 수 있는 완성 보드다. 용량은 명칭값, 가격은 대략적인 수치(중국 위안화, CNY)로 단위 크기 비교용이다.

## 00 먼저 기억할 세 가지

1. **접미사는 용량만 말한다.** `N16R8` = 16 MB Flash + 8 MB PSRAM. `N`은 Flash, `R`은 PSRAM, 숫자는 그대로 MB다. 「몇 세대」나 「상위 트림」과 무관하다.
2. **Flash는 메모리가 아니다.** Flash는 하드디스크로 전원이 꺼져도 내용이 남고 펌웨어와 리소스를 담는다. `malloc()`할 수 있는 건 온칩 SRAM(S3는 512 KB)과 PSRAM뿐이다. Flash를 아무리 늘려도 「PSRAM이 없다」는 구해 주지 못한다.
3. **같은 용량 ≠ 같은 가격.** 약 ¥26과 약 ¥62짜리 두 보드는 Flash와 PSRAM이 똑같다. 차액은 RF, 품질 관리, 자료에 쓰인다(04절).

이 글의 다섯 보드: **ESP32-S3 네 개**——S3 SuperMini FH4R2, S3 N16R8 MINI, XIAO S3 / Sense, XIAO S3 Plus. **ESP32-C3 하나**——C3 SuperMini. C3는 다른 아키텍처의 대조군이지 같은 등급의 대체품이 아니다. 모델 앞의 `S3` / `C3`는 칩 계열을 뜻하므로 뒤쪽 용량 접미사와 혼동하지 말 것.

## 01 세 층 구조, 세 종류의 공간

「ESP32-S3」라는 말은 실제로 세 가지 다른 것을 가리킬 수 있다:

- **칩**: ESP32-S3FH4R2, ESP32-S3R8, ESP32-C3FN4. QFN 베어 다이로, Flash와 PSRAM을 칩 안에 패키징할 수 있다. 이것만 손에 쥐어도 기판 설계, RF 매칭, 안테나는 직접 해야 한다.
- **모듈**: WROOM-1 같은 것. 칩 + 온보드 Flash + 크리스탈 + 차폐 캔 + PCB 안테나 + RF 인증. WROOM이 들어간 이름은 보통 이 층이다.
- **개발 보드**: 여기에 USB-C, LDO, 버튼, 핀 헤더, 안테나를 더해 꽂으면 바로 쓴다. **이 글의 다섯 보드는 모두 이 층**이며 모듈 단품은 없다. 같은 층끼리 비교해야 가격과 GPIO 수가 의미를 갖는다.

<svg viewBox="0 0 900 350" width="100%" style="height:auto" role="img" aria-label="칩, 모듈, 개발 보드 세 층 구조와 세 보드 이름이 각각 어느 층에 해당하는지">
  <title>그림 1 · 세 층 구조와 이름 해독</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">같은 「ESP32-S3」라는 이름이 전혀 다른 세 가지를 가리킬 수 있음　·　이 글의 대상: S3 계열 4개 + C3 대조 1개</text>
  <rect x="20" y="40" width="860" height="52" rx="8" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="38" y="62" font-size="13" font-weight="600" fill="var(--ink)">① 칩(die)</text>
  <text x="38" y="80" font-size="12" fill="var(--ink-2)">ESP32-S3FH4R2 / ESP32-S3R8 / ESP32-C3FN4 · QFN 패키지 · Flash와 PSRAM을 칩 안에 패키징 가능</text>
  <text x="862" y="70" font-size="12" text-anchor="end" fill="var(--pen)">눈에 안 보임, 기판 설계 필요</text>
  <rect x="20" y="102" width="860" height="52" rx="8" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="38" y="124" font-size="13" font-weight="600" fill="var(--ink)">② 모듈</text>
  <text x="38" y="142" font-size="12" fill="var(--ink-2)">WROOM-1 = 칩 + 온보드 Flash + 크리스탈 + 차폐 캔 + PCB 안테나 + RF 인증</text>
  <text x="862" y="132" font-size="12" text-anchor="end" fill="var(--accent)">다섯 개 중 어느 것도 아님</text>
  <rect x="20" y="164" width="860" height="52" rx="8" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="38" y="186" font-size="13" font-weight="600" fill="var(--ink)">③ 개발 보드</text>
  <text x="38" y="204" font-size="12" fill="var(--ink-2)">베어 다이 또는 모듈 + USB-C + LDO + 버튼 + 핀 헤더 + 안테나 = 꽂으면 바로 사용</text>
  <text x="862" y="194" font-size="12" text-anchor="end" fill="var(--green)">이 글의 다섯 보드는 모두 여기</text>
  <line x1="20" y1="234" x2="880" y2="234" stroke="var(--line-2)" stroke-width="1"/>
  <text x="20" y="256" font-size="13" fill="var(--ink-2)">이름 해독: 접미사가 뜻하는 건 「용량」이지 「모델 등급」이 아님</text>
  <rect x="20" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="288" font-size="12" font-weight="600" fill="var(--ink)">ESP32-S3FH4R2</text>
  <text x="34" y="306" font-size="11" fill="var(--ink-2)">F=패키지 내 Flash · H=고온 등급 다이</text>
  <text x="34" y="322" font-size="11" fill="var(--ink-2)">4=4 MB Flash · R2=2 MB PSRAM</text>
  <rect x="312" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="326" y="288" font-size="12" font-weight="600" fill="var(--ink)">S3 N16R8 MINI</text>
  <text x="326" y="306" font-size="11" fill="var(--ink-2)">ESP32-S3R8 베어 다이 + 온보드 16 MB Flash</text>
  <text x="326" y="322" font-size="11" fill="var(--ink-2)">N16은 온보드 Flash이지 WROOM 모듈이 아님</text>
  <rect x="604" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="618" y="288" font-size="12" font-weight="600" fill="var(--ink)">XIAO S3 Plus</text>
  <text x="618" y="306" font-size="11" fill="var(--ink-2)">같은 ESP32-S3R8 다이 + 16 MB Flash</text>
  <text x="618" y="322" font-size="11" fill="var(--ink-2)">차액은 크기 / 안테나 단자 / 생태계에서 나옴</text>
</svg>

> **그림 1** · 같은 「ESP32-S3」가 가리킬 수 있는 세 가지. 접미사는 용량을 말하며 모델 등급이 아니다.

**세 종류의 공간**을 섞지 말 것:

- **Flash = 하드디스크.** 펌웨어, 폰트, 웹 리소스를 담고 전원이 꺼져도 남는다. Quad SPI, 명칭상 최대 80 MHz. **메모리가 아니다.**
- **PSRAM = 외장 메모리 스트립.** 큰 배열, 프레임 버퍼, TLS와 JSON 버퍼를 담는다. 전원이 꺼지면 지워지고 온칩보다 느리며, Flash를 지우거나 쓰는 동안에는 잠시 접근할 수 없다.
- **온칩 SRAM = 주머니.** 가장 빠르고 가장 작다. S3 네 개 모두 **512 KB**(추가로 384 KB ROM, 16 KB RTC SRAM), C3는 **400 KB**(그중 16 KB는 캐시) + 384 KB ROM + 8 KB RTC SRAM.

따라서 상품 페이지의 「내장 8 MB PSRAM & 8 MB Flash」라는 문구에서 PSRAM은 칩 패키지 안에 있고, Flash는 기판에 별도로 장착된 Quad SPI 다이다. **Flash가 아무리 커도 `malloc()`할 수 있는 공간이 되지 않는다.**

스펙 페이지에서 가장 잘못 읽는 세 곳:

| 흔한 표기 | 올바른 이해 | 직접 확인하는 방법 |
|---|---|---|
| S3 보드에 「512 KB SRAM」 | S3는 512 KB, ESP32-C3는 400 KB | CPU 확인: Xtensa LX7 듀얼코어 240 MHz가 S3, RISC-V 싱글코어 160 MHz가 C3 |
| 「내장 8 MB Flash」 | 대부분 온보드이며 칩 패키지 내 아님 | 완전한 품번 조회, `F`가 있어야 패키지 내 Flash |
| 「WROOM이 들어가면 모듈」 | 용량 코드의 재사용일 수도 있음 | 기판에 차폐 캔 달린 작은 모듈이 있는지 확인, 베어 다이 설계라면 메인 칩이 그대로 보임 |

## 02 접미사 해독: 아홉 코드는 3×3

아홉 개 주문 코드는 아홉 가지 물건처럼 보이지만 실제로는 3×3 표 한 장이다:

- **`N` = 온보드 Flash**: `N4` 4 MB, `N8` 8 MB, `N16` 16 MB. 다이는 모듈 PCB에 장착되고 Quad SPI로 연결되며 전원이 꺼져도 지워지지 않는다.
- **`R` = 칩 안에 패키징된 PSRAM**: `R2` 2 MB(Quad, 4선), `R8` 8 MB(Octal, 8선). `R`이 없으면 PSRAM 없음.
- Flash 3단 × PSRAM 3단 = 9개 모델.

가격 비교 때 가장 잘못 보는 지점: `N8R8`과 `N16R8`의 PSRAM은 크기가 같고 차이는 Flash뿐이다.

<svg viewBox="0 0 900 406" width="100%" style="height:auto" role="img" aria-label="ESP32-S3-WROOM-1의 N16R8 접미사 분해와 Flash 4/8/16, PSRAM 없음/2/8 두 축으로 이루어진 9개 모델 행렬">
  <title>그림 2 · 접미사 분해와 9개 모델의 3×3 행렬</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">접미사 하나가 말하는 건 딱 두 가지: N 뒤는 Flash 용량, R 뒤는 PSRAM 용량. 두 축이 각각 세 단계로 9개 모델을 만든다</text>
  <rect x="20" y="42" width="246" height="64" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">ESP32-S3-WROOM-1</text>
  <text x="34" y="84" font-size="11" fill="var(--ink-2)">모듈 시리즈 자체: PCB 온보드 안테나</text>
  <text x="34" y="100" font-size="11" fill="var(--ink-2)">U 붙은 1U는 U.FL 안테나 단자로 교체</text>
  <rect x="274" y="42" width="290" height="64" rx="7" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="288" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">N16　→　Flash 16 MB</text>
  <text x="288" y="84" font-size="11" fill="var(--ink-2)">온보드 Quad SPI 다이(모듈 PCB 위)</text>
  <text x="288" y="100" font-size="11" fill="var(--ink-2)">전원이 꺼져도 지워지지 않고 펌웨어·리소스 저장</text>
  <rect x="572" y="42" width="308" height="64" rx="7" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="586" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">R8　→　PSRAM 8 MB</text>
  <text x="586" y="84" font-size="11" fill="var(--ink-2)">칩 패키지 안의 Octal PSRAM, 8선</text>
  <text x="586" y="100" font-size="11" fill="var(--ink-2)">전원이 꺼지면 지워지고 프레임 버퍼·힙용</text>
  <text x="20" y="136" font-size="11" fill="var(--ink-3)">행 = PSRAM 단계　열 = Flash 단계</text>
  <text x="276" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 4 MB</text>
  <text x="498" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 8 MB</text>
  <text x="720" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 16 MB</text>
  <rect x="20" y="166" width="5" height="20" rx="2" fill="var(--accent)"/>
  <text x="34" y="181" font-size="12.5" font-weight="600" fill="var(--ink)">PSRAM 없음</text>
  <rect x="20" y="230" width="5" height="20" rx="2" fill="var(--pen)"/>
  <text x="34" y="245" font-size="12.5" font-weight="600" fill="var(--ink)">2 MB Quad</text>
  <rect x="20" y="294" width="5" height="20" rx="2" fill="var(--green)"/>
  <text x="34" y="309" font-size="12.5" font-weight="600" fill="var(--ink)">8 MB Octal</text>
  <rect x="170" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="276" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4</text>
  <text x="276" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">실행 시 0.5 MB</text>
  <rect x="392" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="498" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8</text>
  <text x="498" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">실행 시 0.5 MB</text>
  <rect x="614" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="720" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16</text>
  <text x="720" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">실행 시 0.5 MB</text>
  <rect x="170" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="276" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R2</text>
  <text x="276" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">실행 시 2.5 MB</text>
  <rect x="392" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="498" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R2</text>
  <text x="498" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">실행 시 2.5 MB</text>
  <rect x="614" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="720" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R2</text>
  <text x="720" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">실행 시 2.5 MB</text>
  <rect x="170" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="276" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R8</text>
  <text x="276" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">실행 시 8.5 MB</text>
  <rect x="392" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="498" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R8</text>
  <text x="498" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">실행 시 8.5 MB</text>
  <rect x="614" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="2.5"/>
  <text x="720" y="300" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R8</text>
  <text x="720" y="318" font-size="11" text-anchor="middle" fill="var(--ink-2)">실행 시 8.5 MB</text>
  <rect x="760" y="284" width="44" height="18" rx="4" fill="var(--card)" stroke="var(--green)" stroke-width="1"/>
  <text x="782" y="297" font-size="10.5" text-anchor="middle" fill="var(--green)">기준</text>
  <text x="20" y="358" font-size="12" fill="var(--ink-2)">R8 세 칸: GPIO33~37을 점유하고 주변 온도 상한 65 °C. 나머지 여섯 칸: GPIO33~37 사용 가능, 상한 85 °C.</text>
  <text x="20" y="378" font-size="12" fill="var(--ink-2)">R8은 PSRAM만 8선으로 올리고 Flash는 4선 Quad SPI 그대로. Flash도 8선인 것은 WROOM-2.</text>
  <text x="20" y="398" font-size="12" fill="var(--ink-3)">실행 시 메모리 = 온칩 SRAM 512 KB + PSRAM 용량. Flash는 메모리에 포함하지 않음.</text>
</svg>

> **그림 2** · 9개 모델은 이 표의 아홉 칸이 정확히 전부이며 열 번째는 없다. 용량이 가장 큰 칸(`N16R8`)일수록 온도 상한이 오히려 가장 낮다.

아홉 칸 밖에도 몇 가지 표기가 있어 유통 페이지에서 자주 섞여 나온다:

| 표기 | 아홉 조합과의 관계 | Flash | PSRAM | 주변 온도 |
|---|---|---|---|---|
| `-1U`(예: `1U-N16R8`) | 아홉 칸 전부 성립, PCB 안테나를 U.FL 단자로만 교체 | 왼쪽과 동일 | 왼쪽과 동일 | 왼쪽과 동일 |
| `H4` | PSRAM 없는 고온 품번 | 4 MB Quad | 없음 | −40~105 °C |
| `N16R16VA` | 표 밖의 초대용량, SPI는 1.8 V | 16 MB Quad | 16 MB Octal | −40~65 °C |
| WROOM-2의 `N16R8V` / `N32R8V` / `N32R16V` | 별도 제품 라인, Flash도 8선 | 16 / 32 MB Octal | 8 / 16 MB Octal | −40~65 °C |

`1U`와 `U` 없음의 차이는 안테나뿐: `U` 있음은 U.FL 단자로 외장 안테나, 18.0×19.2×3.2 mm. `U` 없음은 PCB 온보드 안테나, 18.0×25.5×3.1 mm. 케이스에 넣고 안테나를 밖으로 빼내려면 전자를 고른다. 용량표는 같지만 구조적 여유 공간과 완성품 인증 경로가 다르다.

함정이 두 군데:

- **`R8`은 PSRAM만 8선으로 올리고 Flash는 여전히 4선 Quad SPI.** 모델명의 「Octal」은 PSRAM을 가리킨다. Flash도 8선인 것은 WROOM-2 이야기다.
- **공식 코드에 `N6`는 없다.** WROOM-1의 Flash는 4 / 8 / 16 MB 세 단계뿐. 표 밖의 접미사를 만나면 이름으로 추측하지 말고 완전한 품번을 데이터시트로 확인하자.

`N16R8`을 기준으로 다시 정렬하면:

| 조합 | Flash | PSRAM | `N16R8`과의 차이 | 실행 시 메모리 | 주변 온도 상한 |
|---|---|---|---|---|---|
| `N16R8` | 16 MB | 8 MB Octal | 기준 | 8.5 MB | 65 °C |
| `N8R8` | 8 MB | 8 MB Octal | Flash 8 MB 적음 | 8.5 MB | 65 °C |
| `N4R8` | 4 MB | 8 MB Octal | Flash 12 MB 적음 | 8.5 MB | 65 °C |
| `N16R2` | 16 MB | 2 MB Quad | PSRAM 6 MB 적고 8선→4선 | 2.5 MB | 85 °C |
| `N8R2` | 8 MB | 2 MB Quad | PSRAM 6 MB 적고 Flash도 8 MB 적음 | 2.5 MB | 85 °C |
| `N4R2` | 4 MB | 2 MB Quad | PSRAM 6 MB 적고 Flash도 12 MB 적음 | 2.5 MB | 85 °C |
| `N16` | 16 MB | 없음 | PSRAM 8 MB 적음 | 0.5 MB | 85 °C |
| `N8` | 8 MB | 없음 | PSRAM 8 MB 적고 Flash도 8 MB 적음 | 0.5 MB | 85 °C |
| `N4` | 4 MB | 없음 | PSRAM 8 MB 적고 Flash도 12 MB 적음 | 0.5 MB | 85 °C |

세 가지 포인트:

1. **PSRAM이 큰 도약.** 0 → 2 → 8 MB에서 실행 시 메모리는 0.5 / 2.5 / 8.5 MB. `N16` → `N16R2`는 5배, `N16R2` → `N16R8`은 다시 3.4배. Quad에서 Octal로 바뀌면 데이터 라인도 4개에서 8개로 늘어난다.
2. **Flash는 등차.** 4 / 8 / 16 MB로, 실행 시 메모리에는 전혀 영향이 없다. 키우는 의미는 펌웨어, 폰트, 웹 리소스를 더 많이 담을 수 있다는 것뿐. 그러니 `N16R2`와 `N8R8` 중 누가 더 「크다」는 문제가 아니라, 한쪽은 디스크가 넓고 다른 쪽은 메모리가 넓다.
3. **용량과 제약은 반대 방향으로 움직인다.** R8 행은 용량이 최대지만 온도 상한이 최저(65 °C)이고 GPIO33~37을 점유한다. PSRAM 없는 것들은 85 °C까지 되고 핀도 가장 온전하다. 8 MB PSRAM과 85 °C를 동시에 원하면 이 아홉 칸에서는 불가능하다. R2로 낮추거나 R8에 ECC를 켜는 수밖에 없다(용량이 추가로 1/16 감소).

다섯 보드가 정확히 표에 들어맞는다:

- `S3 N16R8 MINI`, `XIAO S3 Plus` → `N16R8`과 동등
- `XIAO S3 / Sense` → `N8R8`과 동등
- `S3 SuperMini FH4R2` → `N4R2`와 동등. 다만 Flash도 칩 안에 패키징되어 있고(품번의 `F`), 다이 자체도 고온 등급(`H`)
- `C3 SuperMini` → 표 밖. ESP32-C3는 다른 아키텍처 계열로 4 MB Flash, PSRAM 없음(칩 자체가 미지원)

## 03 용량 전체 그림

다섯 완성 보드가 각각 한 칸씩 차지한다: `N16R8`, `N8R8`, `N4R2`, 그리고 표 밖의 C3. S3 네 개(Xtensa LX7 듀얼코어 240 MHz, FPU와 벡터 명령 포함), C3 하나(RISC-V 싱글코어 160 MHz, PSRAM 없음, 칩 미지원). 뒤쪽 세 개의 S3는 모두 같은 ESP32-S3R8 다이를 쓰며, 온보드 Flash가 8 MB인지 16 MB인지만 다르다.

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="다섯 개발 보드와 WROOM-1 아홉 모듈 조합의 Flash + PSRAM 총 용량 누적 막대 차트(같은 스케일, 최대 24 MB)">
  <title>그림 3 · Flash + PSRAM 총량: 다섯 완성 보드와 아홉 모듈 조합(같은 스케일, 단위 MB)</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">파랑 = Flash(하드디스크)　초록 = PSRAM(메모리)　주황 = Flash만 있고 PSRAM 없음</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">완성 보드 · 이 글의 다섯 개</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="420" y1="48" x2="420" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="820" y1="48" x2="820" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="100" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="69" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="69" font-size="11.0" fill="var(--accent)">PSRAM 없음</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="100" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="111" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="94" width="50" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="111" font-size="11.0" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="111" font-size="11.0" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="200" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="153" font-size="11.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="136" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="153" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="153" font-size="11.0" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="195" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="178" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="195" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="195" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="237" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="220" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="237" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="237" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">모듈 조합 · WROOM-1 아홉 가지</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">같은 스케일: S3 완성 보드 네 개는 그중 세 칸과 길이가 같다</text>
  <text x="206" y="301" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="301" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="288" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="301" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="301" font-size="10.5" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="331" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="331" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="318" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="331" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="331" font-size="10.5" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="361" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="361" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="348" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="420" y="361" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="529" y="361" font-size="10.5" fill="var(--ink-3)">12 MB</text>
  <text x="206" y="391" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="391" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="378" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="645" y="391" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="679" y="391" font-size="10.5" fill="var(--ink-3)">18 MB</text>
  <text x="206" y="421" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="421" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="408" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="445" y="421" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="479" y="421" font-size="10.5" fill="var(--ink-3)">10 MB</text>
  <text x="206" y="451" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="451" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="438" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="451" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="451" font-size="10.5" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="481" font-size="11.5" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="400" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="420" y="481" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <text x="629" y="481" font-size="10.5" fill="var(--accent)">PSRAM 없음</text>
  <text x="206" y="511" font-size="11.5" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="200" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="320" y="511" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="429" y="511" font-size="10.5" fill="var(--accent)">PSRAM 없음</text>
  <text x="206" y="541" font-size="11.5" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="100" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="541" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="541" font-size="10.5" fill="var(--accent)">PSRAM 없음</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="420" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">16</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">24 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">위아래 막대 길이가 1대1로 일치: 완성 보드는 스토리지를 추가하지 않고, 쓰는 모듈이 상한을 결정. C3와 N16 / N8 / N4는 PSRAM 없음.</text>
</svg>

> **그림 3** · 위쪽 다섯 완성 보드, 아래쪽 아홉 모듈 조합. 막대 길이가 1대1로 대응한다. 총량은 최대 6배 차이지만, 파란 부분은 하드디스크이지 메모리가 아니다.

「실행 시 메모리」(온칩 SRAM + PSRAM)가 프로그램에서 실제로 할당할 수 있는 양이고, 막대 길이는 PSRAM만으로 결정된다:

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="다섯 개발 보드와 아홉 모듈 조합의 실행 시 사용 가능 메모리 막대 차트(0.4, 0.5, 2.5, 8.5 MB 네 단계)">
  <title>그림 4 · 실행 시 실제로 메모리로 쓸 수 있는 공간: 다섯 완성 보드와 아홉 모듈 조합</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">온칩 SRAM + PSRAM. Flash는 메모리가 아님. 주황 = 0.4~0.5 MB　파랑 = 2.5 MB　초록 = 8.5 MB</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">완성 보드 · 이 글의 다섯 개</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="353" y1="48" x2="353" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="487" y1="48" x2="487" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="753" y1="48" x2="753" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="26.7" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="256" y="69" font-size="12.0" fill="var(--accent)">0.4 MB(온칩 SRAM만)</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="166.7" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="111" font-size="12.0" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="153" font-size="12.0" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="195" font-size="12.0" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="237" font-size="12.0" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">모듈 조합 · WROOM-1 아홉 가지</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">같은 스케일: 0.5 / 2.5 / 8.5 MB 세 단계, 완성 보드와 1대1 대응</text>
  <text x="206" y="301" font-size="11" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="301" font-size="10.5" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="331" font-size="11" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="331" font-size="10.5" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="361" font-size="11" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="361" font-size="10.5" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="391" font-size="11" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="391" font-size="10.5" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="421" font-size="11" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="421" font-size="10.5" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="451" font-size="11" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="451" font-size="10.5" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="481" font-size="11" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="481" font-size="10.5" fill="var(--accent)">0.5 MB</text>
  <text x="206" y="511" font-size="11" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="511" font-size="10.5" fill="var(--accent)">0.5 MB</text>
  <text x="206" y="541" font-size="11" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="541" font-size="10.5" fill="var(--accent)">0.5 MB</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="353" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">2</text>
  <text x="487" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">4</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">6</text>
  <text x="753" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">9 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">최대 단계는 최소 단계의 약 21배. 여분의 0.5 MB는 온칩 SRAM에서 오므로 N4 / N8 / N16과 C3의 차이는 0.1 MB뿐.</text>
</svg>

> **그림 4** · `malloc()`할 수 있는 것은 실행 시 메모리: 0.4 / 0.5 / 2.5 / 8.5 MB 네 단계로 최대 약 21배 차이. `R` 없는 모델은 온칩 SRAM의 작은 조각만 남는다.

크기 감각을 위한 기준: 320×240 RGB565 한 프레임이 약 150 KB. 2 MB PSRAM이면 약 13프레임, 8 MB면 약 53프레임. 16 kHz / 16bit 모노 오디오 10초가 약 320 KB. 2 MB는 약 60초, 8 MB는 약 250초를 버퍼링한다. 「Flash가 충분히 크다」가 「메모리가 충분하다」를 대체하지 못한다.

| 항목 | S3 SuperMini FH4R2 | S3 N16R8 MINI | XIAO S3 / Sense | XIAO S3 Plus | C3 SuperMini |
|---|---|---|---|---|---|
| **시리즈** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-C3**(대조) |
| 메인 칩 | ESP32-S3FH4R2 | ESP32-S3R8 | ESP32-S3R8 | ESP32-S3R8 | ESP32-C3FN4 |
| CPU | 듀얼코어 240 MHz | 듀얼코어 240 MHz | 듀얼코어 240 MHz | 듀얼코어 240 MHz | 싱글코어 160 MHz |
| Flash | 4 MB(패키지 내) | 16 MB(온보드) | 8 MB(온보드) | 16 MB(온보드) | 4 MB(패키지 내) |
| PSRAM | 2 MB Quad | 8 MB Octal | 8 MB Octal | 8 MB Octal | 없음(미지원) |
| 온칩 메모리 | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 400 KB SRAM |
| 실행 시 메모리 | 2.5 MB | 8.5 MB | 8.5 MB | 8.5 MB | 0.4 MB |
| 스토리지 총량 | 6 MB | 24 MB | 16 MB | 24 MB | 4 MB |
| 사용 가능 GPIO | 약 11 | 약 20 | 11(Sense는 +2) | 18 | 11 |
| 동작 온도 | −40~85 °C | −40~65 °C | −20~65 °C | −20~65 °C | −40~85 °C |
| 대략적 가격 | 약 ¥22 | 약 ¥26 | 약 ¥54 | 약 ¥62 | 약 ¥12 |

S3 네 개의 온칩 메모리는 완전히 동일하고 다른 건 Flash와 PSRAM뿐. C3는 완전히 다른 아키텍처 계열: USB OTG, LCD / 카메라 인터페이스, 벡터 명령이 없고 외장 Flash를 늘려도 PSRAM을 보완할 수 없다. 대체품이 아니라 아키텍처 차이를 보여 주기 위해 포함했다.

## 04 가격을 더하다

> **가격 기준**: **약 ¥12 / ¥22 / ¥26 / ¥54 / ¥62**(중국 위안화)는 2026-11 시점 공개 소매 채널에서 가져온 것. 세금, 배송비, 세일, 세트 구성의 차이를 흡수하도록 반올림했다. 공식 가격도 실시간 가격도 아니며 단위 크기 비교용일 뿐. 시장과 시기에 따라 몇 배씩 차이가 날 수 있으니 반드시 현지 실제 판매가로 확인할 것.

<svg viewBox="0 0 900 320" width="100%" style="height:auto" role="img" aria-label="다섯 개발 보드의 대략적 가격 가로 막대 차트(약 12위안~약 62위안)">
  <title>그림 5 · 대략적 가격과 용량: 같은 용량 단계 내 가격 차이(같은 스케일)</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">막대 길이 = 대략적 가격, 막대 안 = 그 가격으로 사는 총 스토리지 / 실행 시 메모리. 품질은 이 차트에 없음</text>
  <rect x="220" y="38" width="600" height="242" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="391" y1="38" x2="391" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="563" y1="38" x2="563" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="734" y1="38" x2="734" y2="280" stroke="var(--line)" stroke-width="1"/>
  <text x="20" y="70" font-size="13" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="103" height="26" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="230" y="70" font-size="12" fill="var(--ink)">4 MB · 0.4 MB</text>
  <text x="331" y="70" font-size="12" fill="var(--accent)">약 ¥12</text>
  <text x="20" y="114" font-size="13" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="96" width="189" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="114" font-size="12" fill="var(--ink)">6 MB · 2.5 MB</text>
  <text x="417" y="114" font-size="12" fill="var(--pen)">약 ¥22</text>
  <text x="20" y="158" font-size="13" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="140" width="223" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="158" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="451" y="158" font-size="12" fill="var(--pen)">약 ¥26</text>
  <text x="20" y="202" font-size="13" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="184" width="463" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="202" font-size="12" fill="var(--ink)">16 MB · 8.5 MB</text>
  <text x="691" y="202" font-size="12" fill="var(--pen)">약 ¥54</text>
  <text x="20" y="246" font-size="13" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="228" width="531" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="246" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="759" y="246" font-size="12" fill="var(--pen)">약 ¥62</text>
  <text x="220" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="391" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">약 ¥20</text>
  <text x="563" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">약 ¥40</text>
  <text x="734" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">약 ¥60</text>
  <text x="20" y="316" font-size="12" fill="var(--ink-3)">가격 범위 12~62위안, 최대 약 5.2배. 막대 길이는 가격만 반영하고 RF, 일관성, 자료는 스케일에 없음.</text>
</svg>

> **그림 5** · 용량과 구성이 완전히 같은 두 개의 가격 차이는 약 ¥36. 이 차이는 용량표 바깥에서 나오며, 차트만으로는 우열을 판단할 수 없다.

가장 직관적인 지점: **약 ¥26의 S3 N16R8 MINI와 약 ¥62의 XIAO S3 Plus는 Flash, PSRAM, 실행 시 메모리, 펌웨어 구성이 모두 동일**한데도 가격 차이가 약 ¥36(58%)이다. 메모리 단위로 환산하면 각각 약 ¥3.06 / MB와 약 ¥7.29 / MB. 차액은 용량표 바깥의 것에 쓰인다.

그 외 세 가지:

1. **단가와 절대 가격은 흔히 반대 방향.** C3의 절대 가격이 가장 낮지만 PSRAM이 없어서 0.4 MB로 환산하면 약 ¥30 / MB. 8 MB Octal 단계의 10배다. C3는 원래 저전력과 소형화를 겨냥한 칩이다.
2. **같은 시리즈 안에서도 트레이드오프가 있다.** 약 ¥54의 XIAO 표준판 / Sense는 Plus보다 약 ¥8 저렴하고, Flash는 절반, GPIO는 7개 적다. 다만 Sense는 카메라, 마이크, SD 카드를 갖추고, 표준판은 더 작고 U.FL 단자가 있다.
3. **아키텍처를 넘는 도약이 가장 크다.** C3 → S3 SuperMini FH4R2로 약 ¥10 오르고 실행 시 메모리는 0.4 → 2.5 MB(6.25배). 동시에 듀얼코어 240 MHz, 벡터 명령, USB OTG를 얻는다. 이건 업그레이드가 아니라 아키텍처를 바꾸는 것이다.

<svg viewBox="0 0 900 420" width="100%" style="height:auto" role="img" aria-label="대략적 가격과 실행 시 메모리의 분포 산점도. 가격과 메모리 두 차원만 표시하고 품질 정보는 없음">
  <title>그림 6 · 대략적 가격 × 실행 시 메모리: 두 차원의 분포</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">이 차트에는 대략적 가격과 실행 시 메모리 두 차원만 있다. RF 성능, 보드 일관성, 생태계, 장기 유지보수는 축에 없음</text>
  <rect x="120" y="50" width="700" height="290" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="108" x2="820" y2="108" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="166" x2="820" y2="166" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="224" x2="820" y2="224" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="282" x2="820" y2="282" stroke="var(--line)" stroke-width="1"/>
  <line x1="320" y1="50" x2="320" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="520" y1="50" x2="520" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="720" y1="50" x2="720" y2="340" stroke="var(--line)" stroke-width="1"/>
  <rect x="132" y="60" width="178" height="42" rx="5" fill="var(--card)" stroke="var(--line-2)" stroke-width="1"/>
  <text x="144" y="78" font-size="11" fill="var(--ink)">이 차트는 가격과 메모리뿐</text>
  <text x="144" y="94" font-size="11" fill="var(--ink)">품질 차원 없음</text>
  <circle cx="240" cy="328" r="5" fill="var(--accent)"/>
  <text x="252" y="332" font-size="12" fill="var(--accent)">C3 SuperMini 약 ¥12 · 0.4 MB</text>
  <circle cx="340" cy="268" r="5" fill="var(--pen)"/>
  <text x="352" y="272" font-size="12" fill="var(--pen)">S3 SuperMini FH4R2 약 ¥22 · 2.5 MB</text>
  <circle cx="380" cy="94" r="5" fill="var(--pen)"/>
  <text x="392" y="80" font-size="12" fill="var(--pen)">S3 N16R8 MINI 약 ¥26 · 8.5 MB</text>
  <circle cx="660" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="650" y="118" font-size="12" fill="var(--ink-2)">XIAO S3 / Sense 약 ¥54 · 8.5 MB</text>
  <circle cx="740" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="880" y="76" font-size="12" text-anchor="end" fill="var(--ink-2)">XIAO S3 Plus 약 ¥62 · 8.5 MB</text>
  <text x="120" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="320" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">약 ¥20</text>
  <text x="520" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">약 ¥40</text>
  <text x="720" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">약 ¥60</text>
  <text x="820" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">약 ¥70</text>
  <text x="112" y="54" font-size="12" text-anchor="end" fill="var(--ink-3)">10</text>
  <text x="112" y="112" font-size="12" text-anchor="end" fill="var(--ink-3)">8</text>
  <text x="112" y="170" font-size="12" text-anchor="end" fill="var(--ink-3)">6</text>
  <text x="112" y="228" font-size="12" text-anchor="end" fill="var(--ink-3)">4</text>
  <text x="112" y="286" font-size="12" text-anchor="end" fill="var(--ink-3)">2</text>
  <text x="112" y="344" font-size="12" text-anchor="end" fill="var(--ink-3)">0</text>
  <text x="20" y="400" font-size="12" fill="var(--ink-3)">↑ 실행 시 메모리(MB)　→ 대략적 가격(위안)　8.5 MB 세 점이 같은 수평선 위: 가격 차이는 스토리지 용량에서 오지 않음.</text>
</svg>

> **그림 6** · 세 점이 같은 8.5 MB 수평선 위에 있다. 가격 차이는 스토리지 용량에서 오지 않는다. 차트에 보이지 않는 RF, 품질 관리, 자료가 차액의 원천인 경우가 많다.

표로 정리하면(마지막 열은 용량당 단가일 뿐):

| 모델 | 대략적 가격 | 스토리지 총량 | 실행 시 메모리 | 용량당 단가(약 ¥ / 실행 MB) | 가격 상대 배수 |
|---|---|---|---|---|---|
| C3 SuperMini | 약 ¥12 | 4 MB | 0.4 MB | 약 ¥30.00 | 1.00× |
| S3 SuperMini FH4R2 | 약 ¥22 | 6 MB | 2.5 MB | 약 ¥8.80 | 1.83× |
| S3 N16R8 MINI | 약 ¥26 | 24 MB | 8.5 MB | 약 ¥3.06 | 2.17× |
| XIAO S3 / Sense | 약 ¥54 | 16 MB | 8.5 MB | 약 ¥6.35 | 4.50× |
| XIAO S3 Plus | 약 ¥62 | 24 MB | 8.5 MB | 약 ¥7.29 | 5.17× |

### 차액이 사는 것

**가로로 비교할 수 있는 건 가격뿐이고 품질이 아니다.** 같은 16 MB Flash + 8 MB Octal PSRAM 조합을 보드로 만들어도 차이는 이런 데서 난다:

- **RF와 안테나**: 매칭, 여유 공간, 튜닝이 WiFi / BLE 실제 성능을 결정하고, U.FL 단자 유무는 또 다른 문제다. 저가 보드에서 흔히 나오는 「신호가 약하고 벽 하나 사이로 불안정하다」는 불만은 스펙 시트에서 알 수 없고, 설계와 인증, 실측 RSSI로만 판단할 수 있다.
- **품질 관리**: 전원과 USB 보호, 납땜, 기판 재질, 로트 편차. 장기 안정 동작에 영향을 주고, 디버깅 중 알 수 없는 문제에 부딪힐지 좌우한다.
- **자료와 유지보수**: 회로도, 핀 배치, 예제 펌웨어, 커뮤니티 지원, 공급 지속성. XIAO 같은 브랜드 보드가 비싼 건 보통 바로 여기이지, Flash나 PSRAM이 비싸서가 아니다.
- **컴플라이언스**: 베어 다이 설계는 모듈의 RF 인증에 기댈 수 없어 보드 레벨 RF 컴플라이언스를 별도로 확인해야 한다.

「값어치를 한다」는 말은 대체로 맞지만, **반대로 쓰면 안 된다**. 비싸다고 모든 면에서 좋은 건 아니며, 브랜드 프리미엄, 채널 마진, 세트 구성 차이도 존재한다. 화이트라벨 보드는 시장을 넘나들며 몇 배씩 차이가 나는 반면, 브랜드 보드의 공식 가격은 전 세계적으로 거의 일정하다. 비교는 자신이 있는 시장에서 다시 해야 한다.

더 안전한 순서: **먼저 용량, PSRAM 모드, 펌웨어 구성으로 「동작 가능한」 보드를 추리고, 다음에 RF, 안정성, 자료, 공급으로 비교한 뒤, 마지막에 가격을 본다.**

## 05 용량을 구성으로 옮기기

스펙 시트의 용량이 저절로 돌아가는 펌웨어가 되지는 않는다. 구매 전에 계산할 수 있는 스위치가 다섯 개 있다:

1. **Flash 크기를 실물에 맞춘다.** `CONFIG_ESPTOOLPY_FLASHSIZE_4MB / 8MB / 16MB`(또는 Arduino의 Flash Size)는 온보드 다이와 일치시킨다. 크게 설정하면 OTA나 파일 시스템 초기화에서 존재하지 않는 주소를 밟는다.
2. **PSRAM 모드를 배선에 맞춘다.** 패키지 내 2 MB Quad는 `CONFIG_SPIRAM_MODE_QUAD`, 8 MB Octal은 `CONFIG_SPIRAM_MODE_OCT`. Arduino에서는 `QSPI PSRAM` / `OPI PSRAM`. **이걸 틀리면 느려지는 게 아니라 부팅 시 바로 abort된다.**
3. **파티션 테이블은 먼저 덧셈을 한다.** Flash ≠ 펌웨어가 쓸 수 있는 영역. 파티션 테이블, nvs, otadata, phy_init이 먼저 일부를 차지하고 나머지를 app과 데이터 파티션으로 나눈다. **듀얼 OTA는 다음 버전과 같은 크기의 영역이 필요**하며, 대략 `app × 2 + 데이터 파티션 + 고정 오버헤드`를 차지한다. 프로토콜 스택과 그래픽 라이브러리를 얹은 펌웨어는 보통 1~2 MB. 듀얼 OTA로 두 배 하면 4 MB에 근접하고, 여기에 폰트와 이미지용으로 1 MB를 잡으면 반드시 넘친다. 4 MB 보드가 가장 자주 넘어지는 지점이 바로 여기다. 먼저 자신의 펌웨어 실제 크기로 덧셈을 해 보고, 부족하면 16 MB로 올리거나 단일 OTA로 되돌린다.
4. **PSRAM 버퍼 예산을 잡는다.** 프레임 버퍼, TLS 핸드셰이크 버퍼, JSON과 이미지 디코드 힙은 모두 PSRAM을 쓴다. 동시에 상주하는 피크 버퍼의 합 × 1.3으로 추정하고 2 MB / 8 MB 두 단계와 대조한다. DMA 버퍼, 태스크 스택, 정적 변수는 기본으로 PSRAM에 둘 수 없고 명시적 설정이 필요하다.
5. **아키텍처를 넘을 때는 타깃을 바꾼다.** C3는 RISC-V, S3는 Xtensa. `CONFIG_IDF_TARGET`, 툴체인, SDK 구성을 한 세트로 바꾼다. `CONFIG_SPIRAM_*`은 C3에서 전부 무효이므로 쓸 필요가 없다.

흔한 16 MB + Octal 구성은 이렇다:

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
```

| 용량 단계 | 설정 항목 | 실제 영향 |
|---|---|---|
| 16 MB Flash + 8 MB Octal | `FLASHSIZE_16MB` + `MODE_OCT` + `SPEED_80M` | 듀얼 OTA와 데이터 파티션이 모두 들어가고 리소스 여유도 있다 |
| 8 MB Flash + 8 MB Octal | 위와 같되 Flash 크기만 `8MB`로 | 듀얼 OTA는 유지되지만 데이터 파티션 여유가 눈에 띄게 줄어 폰트와 이미지를 계획적으로 배치 |
| 4 MB Flash + 2 MB Quad | `FLASHSIZE_4MB` + `MODE_QUAD` + 4 MB 파티션 테이블 | 듀얼 OTA는 보통 안 들어가 단일 OTA가 기본. PSRAM 버퍼 예산을 2 MB 기준으로 재계산 |
| 4 MB Flash, PSRAM 없음(C3) | `IDF_TARGET=esp32c3` + 4 MB 파티션 테이블 | `SPIRAM_*` 전부 비적용. 메모리 예산은 온칩 SRAM만으로 세움 |

한 줄 요약: **선정 전에 세 가지 계산을 하자**——Flash에 펌웨어와 리소스가 들어가는가, PSRAM에 피크 버퍼가 들어가는가, 구성 항목이 실물과 일치하는가. 세 가지를 모두 통과해야 그 보드를 쓸 수 있다.

## 06 고르는 법과 피할 함정

**먼저 프로그램이 필요로 하는 것에서 역산해 용량을 정하고, 기준을 넘는 보드 안에서 고른다.** 가격이나 스펙 숫자로 서열을 매기지 말 것:

| 프로그램의 실제 요구 | 충분한 최소 단계 | 이유 |
|---|---|---|
| 컬러/그레이스케일 전체 화면 갱신, 다중 레이어 프레임 버퍼, 로컬 폰트와 이미지, 오디오 스트리밍, 듀얼 OTA + 파일 시스템 | 16 MB Flash + 8 MB Octal PSRAM | 8.5 MB 실행 시 메모리가 프레임 버퍼와 TLS 양쪽에 여유를 주고, Flash에 app 두 벌과 리소스 영역 하나를 담을 수 있다 |
| 모노 전체 화면 갱신, 센서 집계, 단일 OTA, 소량의 JSON | 4 MB Flash + 2 MB Quad PSRAM | 2.5 MB 실행 시 메모리로 돌릴 수 있지만 폰트와 이미지는 작은 것을 골라야 한다 |
| 통신 송신만, GUI 없음, 전력과 크기 우선 | 4 MB Flash, PSRAM 없음(C3) | 0.4 MB는 프로토콜 스택 + 작은 버퍼에 딱 맞고, 저전력과 최소 크기와 맞바꿀 수 있다 |
| 카메라 / 마이크 / SD 카드 필요, 또는 웨어러블 크기 제약 | 8 MB Flash의 XIAO 표준판 / Sense | 핵심 제약은 용량이 아니라 보드 레벨 통합과 핀 수에 있다 |

표에는 없지만 특정 보드를 즉시 탈락시킬 수 있는 조건이 하나 더 있다: **넓은 온도 범위**. 8 MB Octal PSRAM의 온도 범위는 −40~65 °C. 85 °C에서 돌리려면 패키지 내 Quad 품번으로 바꾸거나 ECC를 켜야 한다(사용 용량이 추가로 1/16 감소). 이 점에서는 `S3 SuperMini FH4R2`가 오히려 더 넓다.

피할 함정 체크리스트:

- 8 MB Octal PSRAM은 **GPIO33~37**을 점유한다. 자료에 「다른 기능에 사용 불가」로 표시된 핀은 재사용하지 말 것.
- `FH4R2`의 `H`는 Flash 다이가 고온 등급이라는 뜻일 뿐, **칩 전체가 105 °C에 도달한다는 뜻이 아니다**. 현행 데이터시트의 온도 범위는 −40~85 °C.
- 베어 다이 설계는 모듈의 RF 인증에 기댈 수 없으므로, 제품화할 때는 보드 레벨 RF 컴플라이언스를 별도로 확인한다. `ESP32-C3FN4`는 에스프레시프 공식 사이트에 EOL로 표기되어 있으니, 신규 설계는 양산 중인 대체 품번을 고른다.
- 패키지 내 Flash와 PSRAM은 같은 SPI 라인을 공유하며 핀이 완전히 점유되어 있다. **외부 스토리지 확장은 불가능**. 스토리지를 커스터마이즈하려면 패키지 내장이 없는 품번부터 기판을 새로 설계해야 한다.
- 온보드 안테나의 실제 성능이 스펙 시트에 적히는 일은 없다. 연결이 불안정하거나 벽 사이로 끊기면, 먼저 안테나 여유 공간과 U.FL 단자 유무를 확인하고, 그다음 RSSI를 실측한다. 일부 저가 보드에서 이런 종류의 보고가 흔하므로, 처음부터 펌웨어 버그로 단정하고 반복해 파고들지 말 것.

### 가격 너머의 비용

소매 대략 가격은 하드웨어의 출발점일 뿐이다. 「불이 켜지는 보드」에서 「수년간 안정적으로 도는 제품」까지에는 「Flash가 몇 MB, PSRAM이 몇 MB」와 무관한 네 종류의 비용이 더 든다. **하드웨어 엔지니어링**(구조와 방열, 전원과 배터리, 안테나 튜닝, 완성품 EMC), **소프트웨어 엔지니어링**(드라이버 적응, 슬립과 웨이크업, 이상 복구, 업그레이드와 롤백, 장기 호환성), **컴플라이언스 인증**(완성품 EMC / RF, 시장 진입), **양산과 사후 서비스**(수율, 로트 일관성, 수리용 예비 부품).

그 규모는 제품 형태에 따라 극단적으로 달라지고 상품 페이지에 적히는 일도 없다. 따라서 이 글이 비교하는 것은 **선정 시점의 하드웨어 스펙**이지 완성품의 비용 구조가 아니다. 스펙을 제대로 읽으면 잘못된 보드를 사는 것은 막을 수 있다. 보드가 도착한 뒤 무엇에 투자할지는 프로젝트 자체가 결정한다.

---

**출처와 기준**: 에스프레시프 『ESP32-S3 Series Datasheet v2.2』 표 1-1 / 2-14 / 5-11 / 5-12, 『ESP32-C3 Series Datasheet』, 『ESP32-S3-WROOM-1 & 1U Datasheet』 표 1-1 / 1-2(아홉 주문 코드, Flash와 PSRAM 종류, 온도 범위, 모듈 치수), 『ESP32-S3-WROOM-2 Datasheet』(1.8 V SPI와 32 MB Flash 단계), Seeed Studio XIAO ESP32-S3 시리즈 공식 위키와 제품 사양서, S3 N16R8 MINI 개발 보드 제조사 공개 자료, ESP-IDF 『Support for External RAM』 및 Arduino-ESP32 보드 구성 문서. 용량은 명칭값이며 실제로 `malloc()` 가능한 힙은 다소 작다. PSRAM 대역폭, 온도 범위, GPIO 점유는 각 품번의 최신 데이터시트를 따른다. 본문의 가격은 2026-11 시점 공개 소매 채널의 **대략적인 가격(중국 위안화)**이며, 기준은 04절 참조. 품질 평가나 구매 조언이 아니다.
