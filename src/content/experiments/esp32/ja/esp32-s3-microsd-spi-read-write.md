---
title: "ESP32-S3 で Micro SD カードモジュールを動かす完全チュートリアル（SPI モード + Arduino コード）"
boardId: esp32s3
moduleId: storage/microsd-storage-board
category: esp32
date: 2026-04-30
intro: "ESP32-S3 で SPI モードを使って Micro SD カードモジュールを動かし、ファイル一覧の読み取り、読み書き・削除などの操作を完璧に行います。配線図、完全なコード、トラブルシューティングガイド付き。"
image: "https://img.lingflux.com/2026/04/a52d9db02d07cc13df512e06920e4603.jpg"
---

> **一言でいうと**：ESP32-S3 で SPI モードを使って Micro SD カードの読み書きを行い、配線からシリアル出力でのファイル一覧表示まで 30 分で完了します。

# ESP32-S3 で Micro SD カードモジュールを動かす完全チュートリアル（SPI モード + Arduino コード）

> 難易度：⭐⭐☆☆☆（少しの基礎知識があればOK） 所要時間：30 分 テスト環境：Arduino IDE 2.3.x + ESP32 Arduino Core 3.x

------

> **TL;DR（さっさと始める場合）：**
>
> 1. 配線：GPIO5 → CMD（MOSI）、GPIO13 → D0（MISO）、GPIO14 → CLK、GPIO4 → D3（CS）
> 2. 電源は **3.3V** に接続、5V には接続しない
> 3. SD カードは **FAT32** でフォーマット（32GB カードは特に注意）
> 4. 内蔵の `SD.h` ライブラリを使うので、追加インストール不要
> 5. コードを書き込み、シリアルモニタを開いて（115200）、ファイル一覧が表示されれば成功

------

## はじめに

ESP32 プロジェクトを進めていると、こんな問題に直面したことはありませんか。

> 音声を再生したい、センサーデータを大量に保存したい、画像をいくつか入れたい……
>  でも、ESP32 の内蔵 Flash では容量が全然足りない。

そんな時、一番シンプルな解決策が SD カードの外付けです。ストレージ容量が数 MB から数十 GB へ一気にアップグレードされ、読み書き速度も十分使えます。本記事では、**ESP32-S3 + Micro SD カードモジュール** の組み合わせをゼロから動かし、SPI モードで 32GB の SD カード内のファイル一覧を読み取ってみましょう。

配線をして、コードを書き込めば、30 分以内にシリアルモニタで SD カード内のファイル名を確認できるはずです。

------

## デモ

![](https://img.lingflux.com/2026/04/36943c66a6d84fb669a840b29677f2f5.jpg)

シリアル出力はこんな感じになります。

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

## モジュール紹介

![](https://img.lingflux.com/2026/04/6737983c1e0d23072c47461024204cb9.jpg)

SD カードモジュールは、ESP32 に「カードリーダー」を取り付けるようなものです。ESP32 自体には SD カードスロットがないため、この小さなモジュールが仲介役となり、ESP32 の SPI 信号を SD カードが理解できるプロトコルに変換して、SD カードを自由に読み書きできる外部ストレージとして使えるようにします。

| パラメータ           | 仕様                                                    |
| -------------------- | ------------------------------------------------------- |
| インターフェース     | SPI モード / SDIO モード（本記事では SPI を使用）       |
| 対応カードタイプ     | Micro SD（SDSC / SDHC、最大 32GB まで対応）             |
| 動作電圧             | 3.3V（**5V に接続しないでください、モジュールやカードが焼損します**） |
| ピン数               | CMD / CLK / D0 / D1 / D2 / D3 / 3.3V / GND              |
| SPI モードで使用するピン | CMD（MOSI）/ D0（MISO）/ CLK / D3（CS）               |

このモジュールを選んだ理由は、サイズが小さく、配線が少ない（SPI モードでは信号線 4 本のみ）こと。ESP32 で外部ストレージを拡張する最も一般的な方法で、ネット上の情報も多く、ハマっても先人の知恵が頼りになります。

------

## BOM（部品リスト）

| 部品                 | 数量 | 備考                                       |
| -------------------- | ---- | ------------------------------------------ |
| ESP32-S3 開発ボード  | 1    | GPIO 搭載の S3 ボードなら何でもOK          |
| Micro SD カードモジュール | 1    | SPI モード対応（裏面に記載あり）           |
| Micro SD カード      | 1    | 32GB 以内を推奨、FAT32 でフォーマット      |
| ジャンパーワイヤー（デュポンワイヤー） | 適量 | オス‑メス、できるだけ短いものを            |

------

## 完全配線方法

| ESP32-S3 ピン | SD モジュールピン | 説明                                        |
| ------------- | ----------------- | ------------------------------------------- |
| 3.3V          | 3.3V              | **3.3V のみ接続、5V には接続しない**        |
| GND           | GND               | グラウンド共用、必ず接続                    |
| GPIO13        | D0                | SPI MISO：SD カードから ESP32 へデータを送信 |
| GPIO5         | CMD               | SPI MOSI：ESP32 から SD カードへデータを送信 |
| GPIO14        | CLK               | SPI クロック、ESP32 がマスター              |
| GPIO4         | D3                | SPI チップセレクト（CS）、Low レベルで SD カードを選択 |
| 未接続        | D1 / D2 / CD      | SPI モードでは使用しない、そのままでOK      |

> ⚠️ 配線が完了したら、上記の表と1本ずつ照合することをお勧めします。トラブルシューティングの時間を 80% 削減できます。
>  また、デュポンワイヤーは長すぎないように（30cm 以内が最も安定）。長くなると信号が乱れやすく、32GB の大容量カードはタイミングによりシビアです。

------

## 必要なライブラリ

追加インストール不要です。

本記事で使用する `SPI.h` と `SD.h` は、**ESP32 Arduino Core** にすでに内蔵されています。Arduino IDE に ESP32 のボードサポートパッケージがインストールされていれば、そのままコンパイルできます。

まだボードパッケージをインストールしていない場合は、Arduino IDE → ツール → ボードマネージャで `esp32` を検索し、**Espressif Systems** が提供しているパッケージをインストールしてください（本記事のテストバージョン：**ESP32 Arduino Core 3.0.x**）。

------

## 完全コード

```cpp
#include <SPI.h>
#include <SD.h>

// ステップ1：SPI ピンを定義
static const int SD_MOSI = 5;   // SD モジュールの CMD に対応
static const int SD_MISO = 13;  // SD モジュールの D0 に対応
static const int SD_SCK  = 14;  // SD モジュールの CLK に対応
static const int SD_CS   = 4;   // SD モジュールの D3（チップセレクト）に対応

SPIClass spi = SPIClass(FSPI);  // ESP32-S3 では FSPI バスを使用

// ディレクトリ内のすべてのファイルとサブフォルダを再帰的に一覧表示
void listDir(fs::FS &fs, const char * dirname, uint8_t levels) {
  Serial.printf("ディレクトリの一覧表示：%s\n", dirname);

  File root = fs.open(dirname);
  if (!root) {
    Serial.println("ディレクトリを開けませんでした。配線または SD カードのフォーマットを確認してください");
    return;
  }
  if (!root.isDirectory()) {
    Serial.println("これはディレクトリではありません");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      Serial.print("  [フォルダ] ");
      Serial.println(file.name());
      if (levels) {
        listDir(fs, file.path(), levels - 1);  // サブディレクトリに再帰的に入る
      }
    } else {
      Serial.print("  [ファイル] ");
      Serial.print(file.name());
      Serial.print("    サイズ：");
      Serial.print(file.size());
      Serial.println(" bytes");
    }
    file = root.openNextFile();
  }
}

// SD カードの基本情報を表示
void printCardInfo() {
  uint8_t cardType = SD.cardType();

  if (cardType == CARD_NONE) {
    Serial.println("SD カードが検出されませんでした。配線と電源を確認してください");
    return;
  }

  Serial.print("SD カードタイプ：");
  if      (cardType == CARD_MMC)  Serial.println("MMC");
  else if (cardType == CARD_SD)   Serial.println("SDSC");
  else if (cardType == CARD_SDHC) Serial.println("SDHC（標準大容量）");
  else                            Serial.println("不明なタイプ");

  uint64_t cardSize   = SD.cardSize()   / (1024 * 1024);
  uint64_t totalBytes = SD.totalBytes() / (1024 * 1024);
  uint64_t usedBytes  = SD.usedBytes()  / (1024 * 1024);

  Serial.printf("SD カード容量：%llu MB\n", cardSize);
  Serial.printf("合計容量：%llu MB\n",  totalBytes);
  Serial.printf("使用済み：%llu MB\n",  usedBytes);
}

void setup() {
  Serial.begin(115200);
  delay(1500);  // シリアルが安定するまで待機

  Serial.println();
  Serial.println("=== ESP32-S3 SD SPI Test ===");
  Serial.printf("MOSI=%d, MISO=%d, SCK=%d, CS=%d\n",
                SD_MOSI, SD_MISO, SD_SCK, SD_CS);

  // ステップ2：SPI バスを初期化、ピンの順序を指定：SCK, MISO, MOSI, CS
  spi.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // ステップ3：最初に CS を High にして、初期化時に SD カードが誤って選択されないようにする
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  // ステップ4：SD カードをマウント、初期クロック 10MHz（不安定な場合は 4MHz に下げる）
  if (!SD.begin(SD_CS, spi, 10000000)) {
    Serial.println("SD カードのマウントに失敗しました！以下の順序で確認してください：");
    Serial.println("1. 配線 GPIO5→CMD / GPIO13→D0 / GPIO14→CLK / GPIO4→D3");
    Serial.println("2. 電源が 3.3V であることを確認、5V ではないか");
    Serial.println("3. SD カードを FAT32 でフォーマット");
    Serial.println("4. 10000000 を 4000000 に変更して SPI 周波数を下げて再試行");
    return;
  }

  Serial.println("SD カードのマウントに成功しました！");
  printCardInfo();

  // ステップ5：ルートディレクトリ以下 5 階層のファイル構造を一覧表示
  listDir(SD, "/", 5);
}

void loop() {
  // ファイルの読み取りは setup() で一度だけ実行、loop() は一旦空にしておく
  // 定期的にポーリングしたい場合は、ここに delay + listDir を追加
}
```




### ファイル操作の拡張例

メインプログラムが動いたら、ファイル一覧を表示するだけでは不十分です。以下の関数は**メインプログラムを変更せず**、`listDir()` 関数の横に貼り付けるだけで、`setup()` の最後で必要に応じて呼び出せます。**読み取り / 書き込み / 追記 / 作成 / 削除 / 名前変更**のすべての一般的な操作をカバーしています。

#### ファイル書き込み ・ 上書きと追記

`FILE_WRITE` モードは元のファイルをクリアしてから書き込み、`FILE_APPEND` モードはファイルの末尾から追記します。ログ記録やセンサーデータの収集では、ほぼ **追記モード** を使います。

```
// === ファイル書き込み（上書き）===
// ファイルが存在しない場合は作成、既に存在する場合は元の内容をクリアしてから書き込み
void writeFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("ファイルに書き込み：%s\n", path);

  File file = fs.open(path, FILE_WRITE);  // FILE_WRITE モード：上書き
  if (!file) {
    Serial.println("ファイルを開けませんでした（書き込みモード）");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ 書き込み成功");
  } else {
    Serial.println("❌ 書き込み失敗");
  }
  file.close();  // 必ず閉じること。そうしないとデータがカードに書き込まれない場合がある
}

// === 追記書き込み（元の内容を上書きしない）===
// ログに最適：毎回ファイルの末尾に1行を追加
void appendFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("ファイルに追記：%s\n", path);

  File file = fs.open(path, FILE_APPEND);  // FILE_APPEND モード：追記
  if (!file) {
    Serial.println("ファイルを開けませんでした（追記モード）");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ 追記成功");
  } else {
    Serial.println("❌ 追記失敗");
  }
  file.close();
}

// 呼び出し例（setup() の listDir の後に記述）：
// writeFile(SD, "/hello.txt", "Hello ESP32-S3 SD!\n");
// appendFile(SD, "/hello.txt", "これは追記された2行目です\n");
```

💡パフォーマンスのヒント：`file.close()` を呼ぶたびに SD カードへの物理書き込みが発生するため、頻繁にファイルを開閉すると遅くなります。高頻度のログ記録の場合は、`File` インスタンスを開いたままにし、**N 行書き込むごとに `file.flush()` を呼び出して**バッファをカードにフラッシュすることをお勧めします。

#### ファイル読み取り ・ 全体読み取りと行単位読み取り

`readFile()` は小さなファイルを一気に読み切るのに適しています。`readFileByLine()` は CSV や設定ファイルなど、構造化テキストの処理に適しています。

```
// === ファイル読み取り（一気に全読み込み、バイト単位で表示）===
void readFile(fs::FS &fs, const char * path) {
  Serial.printf("ファイルを読み取り：%s\n", path);

  File file = fs.open(path);  // デフォルトで FILE_READ モード
  if (!file) {
    Serial.println("ファイルを開けませんでした。ファイルが存在しない可能性があります");
    return;
  }

  Serial.print("ファイル内容：");
  while (file.available()) {
    Serial.write(file.read());  // 1 バイトずつ読み取って表示
  }
  Serial.println();
  file.close();
}

// === 行単位読み取り（設定ファイル、CSV データに最適）===
void readFileByLine(fs::FS &fs, const char * path) {
  Serial.printf("行単位で読み取り：%s\n", path);

  File file = fs.open(path);
  if (!file) {
    Serial.println("ファイルを開けませんでした");
    return;
  }

  int lineNum = 1;
  while (file.available()) {
    String line = file.readStringUntil('\n');  // 改行文字まで読み取る
    Serial.printf("行 %d：%s\n", lineNum++, line.c_str());
  }
  file.close();
}

// 呼び出し例：
// readFile(SD, "/hello.txt");
// readFileByLine(SD, "/config.txt");
```

ℹ️補足：`file.available()` は残りのバイト数を返します。`file.readStringUntil('\n')` は改行文字より前の内容を一度に `String` として読み取ります。大きなファイルでは `String` を使うとメモリ不足になるため、固定サイズの `char buf[128]` + `file.readBytesUntil()` を使う方が安全です。

#### 作成 / 削除 / 名前変更

フォルダの作成と削除、空ファイルの作成、ファイルの削除、名前変更（「移動」としても使えます）をカバーしています。

```
// === フォルダ作成 ===
void createDir(fs::FS &fs, const char * path) {
  Serial.printf("フォルダを作成：%s\n", path);
  if (fs.mkdir(path)) {
    Serial.println("✅ フォルダの作成に成功しました");
  } else {
    Serial.println("❌ 作成に失敗しました（既に存在するか、親ディレクトリが存在しない可能性があります）");
  }
}

// === 空ファイル作成 ===
// FILE_WRITE で開いて閉じるだけで空ファイルが作成される
void createEmptyFile(fs::FS &fs, const char * path) {
  Serial.printf("空ファイルを作成：%s\n", path);
  File file = fs.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("❌ 作成に失敗しました");
    return;
  }
  file.close();
  Serial.println("✅ 空ファイルの作成に成功しました");
}

// === ファイル削除 ===
void deleteFile(fs::FS &fs, const char * path) {
  Serial.printf("ファイルを削除：%s\n", path);
  if (fs.remove(path)) {
    Serial.println("✅ 削除に成功しました");
  } else {
    Serial.println("❌ 削除に失敗しました（ファイルが存在しないか、権限の問題）");
  }
}

// === フォルダ削除（空のフォルダである必要があります）===
void removeDir(fs::FS &fs, const char * path) {
  Serial.printf("フォルダを削除：%s\n", path);
  if (fs.rmdir(path)) {
    Serial.println("✅ フォルダの削除に成功しました");
  } else {
    Serial.println("❌ 削除に失敗しました（フォルダが空でないか、存在しません）");
  }
}

// === 名前変更 / ファイル移動 ===
void renameFile(fs::FS &fs, const char * oldPath, const char * newPath) {
  Serial.printf("名前を変更：%s → %s\n", oldPath, newPath);
  if (fs.rename(oldPath, newPath)) {
    Serial.println("✅ 名前変更に成功しました");
  } else {
    Serial.println("❌ 名前変更に失敗しました");
  }
}

// 呼び出し例（順番に実行すると完全なフローを確認できます）：
// createDir(SD, "/logs");
// createEmptyFile(SD, "/logs/empty.txt");
// renameFile(SD, "/logs/empty.txt", "/logs/data.txt");
// deleteFile(SD, "/logs/data.txt");
// removeDir(SD, "/logs");
```

⚠️注意：`SD.rmdir()` は**空のフォルダしか削除できません**。ディレクトリ全体を再帰的に削除するには、まず中のすべてのファイルを削除してからフォルダ自体を削除する必要があります。`SD.h` ライブラリには `rm -rf` のような機能は組み込まれていないため、自前で再帰関数を書く必要があります。

------

### コードの解説

**なぜ CMD が MOSI に対応するのか？**
 SD カードの SPI モードでは、ESP32 からカードに送られるデータが CMD ピンを通るため、CMD = MOSI となります。これは SD プロトコルの SPI モードでの決まりであり、配線ミスではありません。

**なぜ D0 が MISO に対応するのか？**
 SPI モードでは、SD カードがホストにデータを返す際に D0 ピンを使用するため、D0 = MISO となります。

**なぜ D3 が CS に対応するのか？**
 SD カードが SPI モードに入ると、D3 がチップセレクト（Chip Select）の役割を担い、Low レベルでカードがアクティブになります。

**なぜ D1、D2 を接続しないのか？**
 これらは 4-bit SDIO モード専用で、SPI モードでは使用しません。そのままで問題ありません。

**`SPIClass spi = SPIClass(FSPI)` とはどういう意味か？**
 ESP32-S3 には複数の SPI バス（FSPI / HSPI）があります。ここでは手動で FSPI を指定し、他のペリフェラルとの競合を避けています。

------

## よくある問題のトラブルシューティング

焦らないでください。初期化に失敗する原因の 90% は以下の場所にあります。順番に確認すれば基本的に解決します。

**1. "SD カードのマウントに失敗しました" で止まる？**
 まず配線を確認してください：GPIO5→CMD、GPIO13→D0、GPIO14→CLK、GPIO4→D3。1本でも間違っていると失敗します。

**2. 配線に問題がないのに失敗する？**
 SPI 周波数を 10MHz から 4MHz に下げて、この行を変更してください。

```cpp
if (!SD.begin(SD_CS, spi, 4000000)) {
```

32GB カードはタイミングによりシビアで、低い周波数の方が動きやすいです。動作を確認してから徐々に上げていきましょう。

**3. シリアルに一切出力がない？**
 シリアルのボーレートが 115200 になっているか、USB ケーブルにデータ通信機能があるか（充電専用ケーブルは不可）を確認してください。

**4. たまにマウントに失敗する、不安定？**
 電源の問題です。ケーブルが長すぎたり、接触不良があったりすると、SD カードの初期化時に電圧が不安定になります。デュポンワイヤーを短くするか、質の良いケーブルに交換してみてください。

**5. 32GB カードはマウントに失敗するが、8GB なら大丈夫？**
 32GB カードは通常 SDHC フォーマットで、FAT32 でフォーマットする必要があります（Windows は 32GB カードをデフォルトで exFAT でフォーマットしますが、ESP32 の `SD.h` は exFAT に対応していません）。[SD Card Formatter](https://www.sdcard.org/downloads/formatter/) を使ってフォーマットしてください。

**6. マウントに成功したが listDir でファイルが何も表示されない？**
 SD カードが空の可能性があるか、ルートディレクトリのファイルがすべて隠しフォルダに入っている可能性があります。カードに txt ファイルを入れてから再度テストしてください。

------

## FAQ

**Q：SD カードモジュールが 5V 駆動のものですが、ESP32-S3 に接続できますか？**
 A：お勧めしません。ESP32-S3 の GPIO は 3.3V ロジックです。モジュールにレベル変換回路がない場合、信号線を直接 5V モジュールに接続するとピンが破損する可能性があります。モジュールが 3.3V 動作電圧に対応していることを確認するか、レベル変換チップ搭載のモジュールを購入してください。

**Q：SPI 周波数はどのくらいに設定するのが良いですか？**
 A：4000000（4MHz）から始め、動作確認できたら 10000000（10MHz）を試してください。理論上は SD カードの SPI モードで最大 25MHz まで対応していますが、デュポンワイヤーの長さやモジュールの品質の影響で、実際にはそこまでの速度は出ません。

**Q：ESP32-S3 のどの GPIO を SD カードに使っても良いですか？**
 A：ESP32-S3 の FSPI はカスタムピンに対応しており、理論上はほとんどの GPIO が使用可能です。ただし、GPIO0（Boot モードピン）、GPIO45/GPIO46（固定機能あり）は避けることをお勧めします。ピンを変更した後は、コード内の `SD_MOSI / SD_MISO / SD_SCK / SD_CS` 定数も忘れずに更新してください。

**Q：32GB の SD カードは必ず FAT32 でフォーマットする必要がありますか？exFAT ではダメですか？**
 A：Arduino の `SD.h` ライブラリは FAT16 と FAT32 のみ対応しており、exFAT には対応していません。32GB 以下のカードは FAT32 でフォーマットすれば問題ありません。SD Card Formatter ツールの使用を推奨します。Windows 標準のフォーマットツールは使わないでください（32GB カードにデフォルトで exFAT を割り当てます）。

**Q：SD カードの読み書き速度は大体どのくらいですか？**
 A：SPI モードでの実際のスループットは約 500KB/s～2MB/s の範囲で、SPI クロック周波数とカードの速度クラスに依存します。より高い速度が必要な場合は、SDIO 4-bit モードを検討してください（配線方法が変わるため、本記事の範囲外となります）。

**Q：複数の SD カードを同時にマウントできますか？**
 A：可能です。SPI バスは複数デバイスに対応しており、各カードに異なる CS ピンを使用して、それぞれ別の `SD` インスタンスとして初期化できます。ただし、`SD.h` は単一インスタンスのみ対応のため、複数カードを使用する場合は `SD_MMC.h` またはサードパーティライブラリの SdFat に切り替える必要があります。

**Q：ESP32-S3 でこのコードを実行した場合、CPU 負荷は高いですか？**
 A：高くありません。ファイル一覧の取得は一回限りの I/O 操作で、`setup()` の実行が終われば終了です。`loop()` は空なので、CPU をほとんど占有しません。`loop()` 内で継続的にファイルの読み書きを行う場合のみ、パフォーマンスを気にする必要があります。

------

## 応用アイデア

基本的な読み取りができるようになったら、以下の方向にも挑戦してみてください。

- **SD カードからの MP3 再生**：ESP32-audioI2S ライブラリと組み合わせて I2S DAC を接続し、SD カードから音声ファイルを読み込めば、ネットワークの遅延から解放されます
- **データ収集・保存**：センサーデータをタイムスタンプ付きで CSV に書き込み。電源が切れてもデータは失われず、後で Python で分析するのに便利です
- **TFT ディスプレイの接続**：SD カード内の画像（BMP / JPG）を読み取って画面に表示し、シンプルなフォトフレームを作る
- **設定ファイルの読み取り**：Wi-Fi の SSID とパスワードを SD カードの `config.json` に記述すれば、コードを書き換えて再書き込みする必要がありません

------

## 参考資料

- [Espressif ESP32-S3 データシート](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [SD Specifications Part 1: Physical Layer Simplified Specification（SD 協会公式ドキュメント）](https://www.sdcard.org/downloads/pls/)
- [ESP32 Arduino Core 公式 GitHub](https://github.com/espressif/arduino-esp32)
- [SD Card Formatter ダウンロード（公式フォーマットツール）](https://www.sdcard.org/downloads/formatter/)
- [Arduino SD ライブラリドキュメント](https://www.arduino.cc/reference/en/libraries/sd/)
