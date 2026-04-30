---
title: "ESP32-S3 Micro SD 카드 모듈 완벽 가이드 (SPI 모드 + Arduino 코드)"
boardId: esp32s3
moduleId: storage/microsd-storage-board
category: esp32
date: 2026-04-30
intro: "ESP32-S3으로 SPI 모드를 통해 Micro SD 카드 모듈을 구동하고, 파일 목록 읽기, 읽기/쓰기/삭제 등 전체 작업을 수행해 봅니다. 배선도, 전체 코드, 문제 해결 가이드 포함."
image: "https://img.lingflux.com/2026/04/a52d9db02d07cc13df512e06920e4603.jpg"
---

> **한 줄 요약**: ESP32-S3으로 SPI 모드를 통해 Micro SD 카드를 읽고 쓰기, 배선부터 시리얼 출력으로 파일 목록 확인까지 30분이면 됩니다.

# ESP32-S3 Micro SD 카드 모듈 완벽 가이드 (SPI 모드 + Arduino 코드)

> 난이도: ⭐⭐☆☆☆ (기초만 있으면 바로 시작 가능) 예상 소요 시간: 30분 테스트 환경: Arduino IDE 2.3.x + ESP32 Arduino Core 3.x

------

> **TL;DR (바로 시작하기):**
>
> 1. 배선: GPIO5 → CMD (MOSI), GPIO13 → D0 (MISO), GPIO14 → CLK, GPIO4 → D3 (CS)
> 2. 전원은 **3.3V**에 연결, 5V는 사용하지 마세요
> 3. SD 카드는 **FAT32**로 포맷 (32GB 카드는 특히 주의)
> 4. 내장 `SD.h` 라이브러리 사용, 추가 설치 불필요
> 5. 코드를 업로드하고 시리얼 모니터를 열면 (115200), 파일 목록이 보이면 성공

------

## 들어가며

ESP32 프로젝트를 진행하다 보면 이런 문제를 겪으신 적 있나요?

> 오디오를 재생하거나, 센서 데이터를 저장하거나, 이미지를 넣고 싶은데...
> ESP32의 내장 Flash 용량이 턱없이 부족한 상황.

이때 가장 간단한 해결책이 바로 SD 카드를 외부에 추가하는 것입니다. 저장 용량이 몇 MB에서 수십 GB로 바로 업그레이드되고, 읽기/쓰기 속도도 충분합니다. 이 글에서는 **ESP32-S3 + Micro SD 카드 모듈** 조합을 처음부터 끝까지 실행해 보고, SPI 모드로 32GB SD 카드의 파일 목록을 읽어보겠습니다.

배선을 완료하고 코드를 업로드하면, 30분 안에 시리얼 모니터에서 SD 카드 안의 파일 이름을 확인할 수 있을 겁니다.

------

## 데모 결과

![](https://img.lingflux.com/2026/04/36943c66a6d84fb669a840b29677f2f5.jpg)

시리얼 출력은 대략 이렇게 나옵니다:

```
=== ESP32-S3 SD SPI Test ===
MOSI=5, MISO=13, SCK=14, CS=4
SD card mounted successfully.
SD Card Type: SDHC
SD Card Size: 30436MB
Total space: 30436MB
Used space : 512MB
Listing directory: /
  DIR : music
  FILE: readme.txt  SIZE: 128
  FILE: config.json  SIZE: 256
```


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/EOdWUtUBBMA?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


------

## 모듈 소개

![](https://img.lingflux.com/2026/04/6737983c1e0d23072c47461024204cb9.jpg)

SD 카드 모듈은 ESP32에 "카드 리더기"를 달아주는 역할을 합니다. ESP32 자체에는 SD 카드 슬롯이 없는데, 이 작은 모듈이 중간에서 ESP32의 SPI 신호를 SD 카드가 이해할 수 있는 프로토콜로 변환해 주어, SD 카드를 자유롭게 읽고 쓸 수 있는 외부 저장 공간으로 만들어 줍니다.

| 파라미터           | 사양                                          |
| ------------------ | --------------------------------------------- |
| 인터페이스 프로토콜 | SPI 모드 / SDIO 모드 (이 글에서는 SPI 사용)   |
| 지원 카드 유형     | Micro SD (SDSC / SDHC, 최대 32GB 지원)        |
| 작동 전압          | 3.3V (**5V를 연결하지 마세요, 모듈이나 카드가 손상될 수 있습니다**) |
| 핀 수              | CMD / CLK / D0 / D1 / D2 / D3 / 3.3V / GND   |
| SPI 모드 사용 핀   | CMD (MOSI) / D0 (MISO) / CLK / D3 (CS)        |

이 모듈을 선택한 이유: 크기가 작고, 배선이 적으며 (SPI 모드는 신호선 4개만 사용), ESP32 외부 저장 확장에 가장 널리 사용되는 방식이라 온라인 자료도 많아 문제 해결이 쉽습니다.

------

## BOM 리스트

| 부품              | 수량 | 비고                                     |
| ----------------- | ---- | ---------------------------------------- |
| ESP32-S3 개발 보드 | 1    | GPIO가 있는 S3 보드라면 모두 가능        |
| Micro SD 카드 모듈 | 1    | SPI 모드 지원 (뒷면에 표시됨)            |
| Micro SD 카드     | 1    | 32GB 이하 권장, FAT32로 포맷             |
| 점퍼 와이어 (듀폰 케이블) | 필요한 만큼 | 수컷-암컷, 가능한 짧게 사용           |

------

## 전체 배선 방법

| ESP32-S3 핀    | SD 모듈 핀    | 설명                                    |
| -------------- | ------------- | --------------------------------------- |
| 3.3V           | 3.3V          | **3.3V에만 연결, 5V는 사용하지 마세요** |
| GND            | GND           | 공통 그라운드, 반드시 연결              |
| GPIO13         | D0            | SPI MISO: SD 카드에서 ESP32로 데이터 수신 |
| GPIO5          | CMD           | SPI MOSI: ESP32에서 SD 카드로 데이터 송신 |
| GPIO14         | CLK           | SPI 클럭, ESP32가 마스터                |
| GPIO4          | D3            | SPI 칩 셀렉트 (CS), Low 레벨에서 SD 카드 활성화 |
| 연결 안 함     | D1 / D2 / CD  | SPI 모드에서는 사용하지 않음, 비워두세요 |

> ⚠️ 배선을 완료한 후, 위 표를 보고 한 줄씩 다시 확인해 보세요. 이렇게 하면 문제 해결 시간의 80%를 아낄 수 있습니다.
> 또한, 듀폰 케이블은 너무 길지 않게 (30cm 이내가 가장 안정적), 케이블이 길어지면 신호가 불안정해지고, 32GB 대용량 카드는 타이밍에 더 민감합니다.

------

## 설치 필요 라이브러리

추가 설치가 필요 없습니다!

이 글에서 사용하는 `SPI.h`와 `SD.h`는 모두 **ESP32 Arduino Core**에 내장되어 있습니다. Arduino IDE에 ESP32 보드 지원 패키지만 설치되어 있으면 바로 컴파일할 수 있습니다.

보드 패키지가 아직 설치되지 않았다면, Arduino IDE → 도구 → 보드 매니저에서 `esp32`를 검색하여 **Espressif Systems**에서 제공하는 패키지를 설치하세요 (이 글의 테스트 버전: **ESP32 Arduino Core 3.0.x**).

------

## 전체 코드

```cpp
#include <SPI.h>
#include <SD.h>

// 첫 번째 단계: SPI 핀 정의
static const int SD_MOSI = 5;   // SD 모듈 CMD에 해당
static const int SD_MISO = 13;  // SD 모듈 D0에 해당
static const int SD_SCK  = 14;  // SD 모듈 CLK에 해당
static const int SD_CS   = 4;   // SD 모듈 D3에 해당 (칩 셀렉트)

SPIClass spi = SPIClass(FSPI);  // ESP32-S3에서 FSPI 버스 사용

// 디렉토리의 모든 파일과 하위 폴더를 재귀적으로 나열
void listDir(fs::FS &fs, const char * dirname, uint8_t levels) {
  Serial.printf("디렉토리 나열 중: %s\n", dirname);

  File root = fs.open(dirname);
  if (!root) {
    Serial.println("디렉토리 열기 실패, 배선이나 SD 카드 포맷을 확인하세요");
    return;
  }
  if (!root.isDirectory()) {
    Serial.println("디렉토리가 아닙니다");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      Serial.print("  [폴더] ");
      Serial.println(file.name());
      if (levels) {
        listDir(fs, file.path(), levels - 1);  // 하위 디렉토리로 재귀 진입
      }
    } else {
      Serial.print("  [파일]   ");
      Serial.print(file.name());
      Serial.print("    크기: ");
      Serial.print(file.size());
      Serial.println(" bytes");
    }
    file = root.openNextFile();
  }
}

// SD 카드 기본 정보 출력
void printCardInfo() {
  uint8_t cardType = SD.cardType();

  if (cardType == CARD_NONE) {
    Serial.println("SD 카드가 감지되지 않았습니다, 배선과 전원을 확인하세요");
    return;
  }

  Serial.print("SD 카드 유형: ");
  if      (cardType == CARD_MMC)  Serial.println("MMC");
  else if (cardType == CARD_SD)   Serial.println("SDSC");
  else if (cardType == CARD_SDHC) Serial.println("SDHC (대용량 표준)");
  else                            Serial.println("알 수 없는 유형");

  uint64_t cardSize   = SD.cardSize()   / (1024 * 1024);
  uint64_t totalBytes = SD.totalBytes() / (1024 * 1024);
  uint64_t usedBytes  = SD.usedBytes()  / (1024 * 1024);

  Serial.printf("SD 카드 용량: %llu MB\n", cardSize);
  Serial.printf("전체 공간: %llu MB\n",  totalBytes);
  Serial.printf("사용 공간: %llu MB\n",  usedBytes);
}

void setup() {
  Serial.begin(115200);
  delay(1500);  // 시리얼 안정화 대기

  Serial.println();
  Serial.println("=== ESP32-S3 SD SPI Test ===");
  Serial.printf("MOSI=%d, MISO=%d, SCK=%d, CS=%d\n",
                SD_MOSI, SD_MISO, SD_SCK, SD_CS);

  // 두 번째 단계: SPI 버스 초기화, 핀 순서 지정: SCK, MISO, MOSI, CS
  spi.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // 세 번째 단계: CS를 High로 설정하여 초기화 시 SD 카드가 잘못 선택되지 않도록 방지
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  // 네 번째 단계: SD 카드 마운트, 초기 클럭 10MHz (불안정하면 4MHz로 낮추세요)
  if (!SD.begin(SD_CS, spi, 10000000)) {
    Serial.println("SD 카드 마운트 실패! 다음 순서로 확인해 보세요:");
    Serial.println("1. 배선 확인: GPIO5→CMD / GPIO13→D0 / GPIO14→CLK / GPIO4→D3");
    Serial.println("2. 전원이 3.3V인지 확인, 5V가 아닌지");
    Serial.println("3. SD 카드를 FAT32로 포맷");
    Serial.println("4. 10000000을 4000000으로 변경하여 SPI 주파수를 낮추고 다시 시도");
    return;
  }

  Serial.println("SD 카드 마운트 성공!");
  printCardInfo();

  // 다섯 번째 단계: 루트 디렉토리의 5단계 파일 구조 나열
  listDir(SD, "/", 5);
}

void loop() {
  // 파일 읽기는 setup()에서 한 번만 수행, loop()는 비워둠
  // 정기적으로 확인하려면 여기에 delay + listDir을 추가하면 됩니다
}
```



### 파일 작업 확장 예제

메인 프로그램이 정상 작동하는 것을 확인한 후, 파일 목록만 나오는 것으로는 부족하죠. 아래 함수들은 **메인 프로그램을 수정하지 않고**, `listDir()` 함수 옆에 붙여넣기만 하면 되고, `setup()` 끝에서 필요에 따라 호출하면 됩니다. **읽기 / 쓰기 / 추가 / 생성 / 삭제 / 이름 변경** 등 모든 일반적인 작업을 다룹니다.

#### 파일 쓰기 - 덮어쓰기와 추가

`FILE_WRITE` 모드는 기존 파일을 비우고 쓰며, `FILE_APPEND` 모드는 파일 끝에 추가합니다. 로그 기록이나 센서 데이터 수집에는 거의 **추가 모드**를 사용합니다.

```
// === 파일 쓰기 (덮어쓰기) ===
// 파일이 없으면 생성, 이미 있으면 기존 내용을 지우고 씁니다
void writeFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("파일 쓰기: %s\n", path);

  File file = fs.open(path, FILE_WRITE);  // FILE_WRITE 모드: 덮어쓰기
  if (!file) {
    Serial.println("파일 열기 실패 (쓰기 모드)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ 쓰기 성공");
  } else {
    Serial.println("❌ 쓰기 실패");
  }
  file.close();  // 반드시 닫아야 데이터가 카드에 기록됩니다
}

// === 추가 쓰기 (기존 내용 유지) ===
// 로그에 적합: 매번 파일 끝에 한 줄씩 추가
void appendFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("내용 추가: %s\n", path);

  File file = fs.open(path, FILE_APPEND);  // FILE_APPEND 모드: 추가
  if (!file) {
    Serial.println("파일 열기 실패 (추가 모드)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ 추가 성공");
  } else {
    Serial.println("❌ 추가 실패");
  }
  file.close();
}

// 호출 예제 (setup()의 listDir 뒤에 작성):
// writeFile(SD, "/hello.txt", "Hello ESP32-S3 SD!\n");
// appendFile(SD, "/hello.txt", "추가된 두 번째 줄\n");
```

💡성능 팁: `file.close()`를 호출할 때마다 SD 카드에 실제 쓰기가 발생하므로, 파일을 자주 열고 닫으면 속도가 느려집니다. 고빈도 로그의 경우 `File` 인스턴스를 열어둔 채로, **N줄마다 한 번씩 `file.flush()`를 호출**하여 버퍼를 카드에 기록하는 것이 좋습니다.

#### 파일 읽기 - 전체 읽기와 줄 단위 읽기

`readFile()`은 작은 파일을 한 번에 읽기에 적합하고, `readFileByLine()`은 CSV나 설정 파일 등 구조화된 텍스트를 처리하는 데 적합합니다.

```
// === 파일 읽기 (한 번에 전체 읽기, 바이트 단위로 출력) ===
void readFile(fs::FS &fs, const char * path) {
  Serial.printf("파일 읽기: %s\n", path);

  File file = fs.open(path);  // 기본값은 FILE_READ 모드
  if (!file) {
    Serial.println("파일 열기 실패, 파일이 존재하지 않을 수 있습니다");
    return;
  }

  Serial.print("파일 내용: ");
  while (file.available()) {
    Serial.write(file.read());  // 바이트 단위로 읽고 출력
  }
  Serial.println();
  file.close();
}

// === 줄 단위 읽기 (설정 파일, CSV 데이터에 적합) ===
void readFileByLine(fs::FS &fs, const char * path) {
  Serial.printf("줄 단위 읽기: %s\n", path);

  File file = fs.open(path);
  if (!file) {
    Serial.println("파일 열기 실패");
    return;
  }

  int lineNum = 1;
  while (file.available()) {
    String line = file.readStringUntil('\n');  // 줄바꿈 문자까지 읽기
    Serial.printf("줄 %d: %s\n", lineNum++, line.c_str());
  }
  file.close();
}

// 호출 예제:
// readFile(SD, "/hello.txt");
// readFileByLine(SD, "/config.txt");
```

ℹ️참고: `file.available()`은 남은 바이트 수를 반환합니다. `file.readStringUntil('\n')`은 줄바꿈 문자 이전의 내용을 `String`으로 한 번에 읽습니다. 대용량 파일에서는 `String`을 사용하지 마세요. 메모리가 초과될 수 있으므로, 고정 크기의 `char buf[128]` + `file.readBytesUntil()`을 사용하는 것이 더 안전합니다.

#### 생성 / 삭제 / 이름 변경

디렉토리 생성 및 삭제, 빈 파일 생성, 파일 삭제, 이름 변경 (이동에도 사용 가능) 방법입니다.

```
// === 디렉토리 생성 ===
void createDir(fs::FS &fs, const char * path) {
  Serial.printf("디렉토리 생성: %s\n", path);
  if (fs.mkdir(path)) {
    Serial.println("✅ 디렉토리 생성 성공");
  } else {
    Serial.println("❌ 생성 실패 (이미 존재하거나 상위 디렉토리가 없을 수 있음)");
  }
}

// === 빈 파일 생성 ===
// FILE_WRITE로 열었다가 닫으면 빈 파일이 생성됩니다
void createEmptyFile(fs::FS &fs, const char * path) {
  Serial.printf("빈 파일 생성: %s\n", path);
  File file = fs.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("❌ 생성 실패");
    return;
  }
  file.close();
  Serial.println("✅ 빈 파일 생성 성공");
}

// === 파일 삭제 ===
void deleteFile(fs::FS &fs, const char * path) {
  Serial.printf("파일 삭제: %s\n", path);
  if (fs.remove(path)) {
    Serial.println("✅ 삭제 성공");
  } else {
    Serial.println("❌ 삭제 실패 (파일이 없거나 권한 문제)");
  }
}

// === 디렉토리 삭제 (빈 디렉토리만 가능) ===
void removeDir(fs::FS &fs, const char * path) {
  Serial.printf("디렉토리 삭제: %s\n", path);
  if (fs.rmdir(path)) {
    Serial.println("✅ 디렉토리 삭제 성공");
  } else {
    Serial.println("❌ 삭제 실패 (디렉토리가 비어있지 않거나 존재하지 않음)");
  }
}

// === 이름 변경 / 파일 이동 ===
void renameFile(fs::FS &fs, const char * oldPath, const char * newPath) {
  Serial.printf("이름 변경: %s → %s\n", oldPath, newPath);
  if (fs.rename(oldPath, newPath)) {
    Serial.println("✅ 이름 변경 성공");
  } else {
    Serial.println("❌ 이름 변경 실패");
  }
}

// 호출 예제 (순서대로 실행하면 전체 흐름을 확인할 수 있습니다):
// createDir(SD, "/logs");
// createEmptyFile(SD, "/logs/empty.txt");
// renameFile(SD, "/logs/empty.txt", "/logs/data.txt");
// deleteFile(SD, "/logs/data.txt");
// removeDir(SD, "/logs");
```

⚠️주의: `SD.rmdir()`은 **빈 디렉토리만 삭제**할 수 있습니다. 디렉토리 전체를 재귀적으로 삭제하려면 먼저 내부의 모든 파일을 삭제한 후 디렉토리 자체를 삭제해야 합니다. `SD.h` 라이브러리에는 `rm -rf` 기능이 내장되어 있지 않으므로 직접 재귀 함수를 작성해야 합니다.

------

### 코드 설명

**왜 CMD가 MOSI에 해당하나요?**
SD 카드가 SPI 모드에서 ESP32가 카드로 보내는 데이터는 CMD 핀을 통해 전송되므로 CMD = MOSI입니다. 이는 SD 프로토콜 SPI 모드의 고정 사양이며, 배선 오류가 아닙니다.

**왜 D0가 MISO에 해당하나요?**
SPI 모드에서 SD 카드가 호스트로 데이터를 돌려보낼 때 D0 핀을 사용하므로 D0 = MISO입니다.

**왜 D3가 CS에 해당하나요?**
SD 카드가 SPI 모드로 진입한 후, D3가 칩 셀렉트 (Chip Select) 역할을 하며, Low 레벨일 때 카드가 활성화됩니다.

**왜 D1, D2는 연결하지 않나요?**
D1과 D2는 4-bit SDIO 모드 전용 핀으로, SPI 모드에서는 사용하지 않으므로 비워두면 됩니다.

**`SPIClass spi = SPIClass(FSPI)`는 무슨 의미인가요?**
ESP32-S3에는 여러 SPI 버스 (FSPI / HSPI)가 있으며, 여기서 FSPI를 수동으로 지정하여 다른 주변 장치와의 충돌을 피합니다.

------

## 일반적인 문제 해결

당황하지 마세요. 초기화 실패의 90%는 다음 몇 가지 원인에서 발생하며, 순서대로 확인하면 대부분 해결됩니다:

**1. 시리얼 출력이 "SD 카드 마운트 실패"에서 멈추나요?**
먼저 배선을 확인하세요: GPIO5→CMD, GPIO13→D0, GPIO14→CLK, GPIO4→D3. 하나라도 틀리면 실패합니다.

**2. 배선에 문제가 없는데도 여전히 실패하나요?**
SPI 주파수를 10MHz에서 4MHz로 낮춰보세요. 이 줄을 수정하세요:

```cpp
if (!SD.begin(SD_CS, spi, 4000000)) {
```

32GB 카드는 타이밍에 더 민감하므로, 낮은 주파수에서 먼저 성공시킨 후 천천히 올려보세요.

**3. 시리얼 출력이 전혀 없나요?**
시리얼 보드 레이트가 115200인지, USB 케이블이 데이터 전송을 지원하는지 확인하세요 (충전 전용 케이블은 안 됩니다).

**4. 간헐적으로 마운트가 실패하고 불안정한가요?**
전원 문제일 가능성이 높습니다. 케이블이 너무 길거나 접촉 불량이면 SD 카드 초기화 시 전압이 흔들릴 수 있습니다. 듀폰 케이블을 짧게 하거나 품질이 좋은 케이블로 교체해 보세요.

**5. 32GB 카드는 마운트가 안 되고 8GB로 바꾸면 되나요?**
32GB 카드는 보통 SDHC 포맷이며, FAT32로 포맷해야 합니다 (Windows는 기본적으로 32GB 카드를 exFAT으로 포맷하지만, ESP32의 `SD.h`는 exFAT을 지원하지 않습니다). [SD Card Formatter](https://www.sdcard.org/downloads/formatter/)를 사용하여 포맷하세요.

**6. 마운트는 성공했는데 listDir에서 파일이 나오지 않나요?**
SD 카드가 비어 있거나, 루트 디렉토리의 파일이 모두 숨김 폴더에 있을 수 있습니다. 카드에 txt 파일을 하나 넣고 다시 테스트해 보세요.

------

## FAQ

**Q: 제 SD 카드 모듈은 5V 전원을 사용하는데, ESP32-S3에 연결해도 되나요?**
A: 권장하지 않습니다. ESP32-S3의 GPIO는 3.3V 로직이며, 모듈에 레벨 변환 회로가 없다면 5V 모듈에 직접 연결하면 핀이 손상될 수 있습니다. 모듈이 3.3V 작동 전압을 지원하는지 확인하거나, 레벨 변환 칩이 있는 모듈을 구매하세요.

**Q: SPI 주파수는 얼마로 설정하는 게 좋나요?**
A: 4000000 (4MHz)부터 시작하여, 정상 작동하면 10000000 (10MHz)을 시도해 보세요. 이론적으로 SD 카드 SPI 모드는 최대 25MHz를 지원하지만, 듀폰 케이블 길이와 모듈 품질의 영향으로 실제로는 그렇게 높게 설정하기 어렵습니다.

**Q: ESP32-S3의 어떤 GPIO를 SD 카드에 사용할 수 있나요?**
A: ESP32-S3의 FSPI는 커스텀 핀을 지원하므로, 이론적으로 대부분의 GPIO를 사용할 수 있습니다. 단, GPIO0 (Boot 모드 핀), GPIO45/GPIO46 (고정 기능)은 피하는 것이 좋습니다. 핀을 변경한 후 코드의 `SD_MOSI / SD_MISO / SD_SCK / SD_CS` 상수도 함께 수정하세요.

**Q: 32GB SD 카드는 반드시 FAT32로 포맷해야 하나요? exFAT은 안 되나요?**
A: Arduino의 `SD.h` 라이브러리는 FAT16과 FAT32만 지원하며, exFAT은 지원하지 않습니다. 32GB 이하의 카드를 FAT32로 포맷하면 문제없습니다. SD Card Formatter 도구를 사용하는 것을 권장하며, Windows 기본 포맷 도구는 사용하지 마세요 (32GB 카드를 기본적으로 exFAT으로 포맷합니다).

**Q: SD 카드 읽기/쓰기 속도는 대략 얼마인가요?**
A: SPI 모드에서 실제 처리량은 약 500KB/s~2MB/s로, SPI 클럭 주파수와 카드의 속도 등급에 따라 다릅니다. 더 높은 속도가 필요하다면 SDIO 4-bit 모드를 고려해 볼 수 있습니다 (배선 방법이 달라지며, 이 글의 범위를 벗어납니다).

**Q: SD 카드를 여러 장 동시에 마운트할 수 있나요?**
A: 가능합니다. SPI 버스는 다중 장치를 지원하므로, 각 카드에 다른 CS 핀을 사용하여 개별적으로 초기화하면 됩니다. 다만 `SD.h`는 단일 인스턴스만 지원하므로, 다중 카드를 사용하려면 `SD_MMC.h`나 서드파티 라이브러리인 SdFat으로 전환해야 합니다.

**Q: ESP32-S3에서 이 코드를 실행하면 CPU 사용량이 높나요?**
A: 높지 않습니다. 파일 목록 작업은 일회성 I/O이며, `setup()`이 완료되면 끝나고 `loop()`는 비어 있어 CPU를 거의 사용하지 않습니다. `loop()`에서 지속적으로 파일을 읽고 쓰는 경우에만 성능을 고려하면 됩니다.

------

## 더 해볼 수 있는 것들

기본 읽기가 정상 작동하는 것을 확인한 후, 다음 방향으로 계속 탐색해 보세요:

- **SD 카드에서 MP3 재생**: ESP32-audioI2S 라이브러리와 I2S DAC를 결합하여, SD 카드에서 오디오 파일을 읽어 재생. 네트워크 지연 없이 음악 감상
- **데이터 수집 및 저장**: 센서 데이터를 타임스탬프와 함께 CSV로 기록. 전원이 꺼져도 데이터 유지, Python으로 분석 가능
- **TFT 화면 연결**: SD 카드의 이미지 (BMP / JPG)를 읽어 화면에 표시. 간단한 디지털 액자 만들기
- **설정 파일 읽기**: Wi-Fi 계정과 비밀번호를 SD 카드의 `config.json`에 저장. 코드 수정 후 다시 업로드할 필요 없음

------

## 참고 자료

- [Espressif ESP32-S3 데이터시트](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [SD Specifications Part 1: Physical Layer Simplified Specification (SD 협회 공식 문서)](https://www.sdcard.org/downloads/pls/)
- [ESP32 Arduino Core 공식 GitHub](https://github.com/espressif/arduino-esp32)
- [SD Card Formatter 다운로드 (공식 포맷 도구)](https://www.sdcard.org/downloads/formatter/)
- [Arduino SD 라이브러리 문서](https://www.arduino.cc/reference/en/libraries/sd/)
