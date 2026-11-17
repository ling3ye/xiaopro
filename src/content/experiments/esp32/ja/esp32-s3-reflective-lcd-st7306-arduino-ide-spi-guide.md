---
title: "ESP32-S3 で ST7306 4色反射型 LCD を駆動する完全チュートリアル（Arduino IDE + SPI）"
boardId: esp32s3
moduleId: display/lcd42-st7306-reflective
category: esp32
date: 2026-11-17
intro: "Arduino IDE と SPI で ESP32-S3 から ST7306 4色反射型 LCD（バックライトなし）を駆動：21Pin FPC の配線、完全なコード、表示方向の調整と無表示のトラブルシューティング。実測環境は Arduino IDE 2.3.8 + esp32 Core 3.3.8。"
image: "https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg"
---

> 難易度：⭐⭐☆☆☆  
> 所要時間の目安：約 30～60 分（環境のダウンロードとハードウェアのトラブルシューティングを除く）  
> テスト環境：Arduino IDE v2.3.8 + esp32 Arduino Core v3.3.8

## TL;DR：ESP32-S3 で ST7306 を駆動するクイックスタート

- モジュールは 3.3V のみ使用します。FPC の 5、6 番ピンは両方とも 3.3V に接続し、GND 共通をしっかり取り、5V には接続しないでください。
- デフォルトは `PINSET = 1`：CS→GPIO9、RESET→GPIO10、SCLK→GPIO12、MOSI→GPIO13、RS/D/C→GPIO14。TE は未接続でも構いません。
- Arduino IDE に `esp32 by Espressif Systems` をインストールします。ST7306 専用のライブラリを別途入れる必要はありません。
- プロジェクトディレクトリの `esp32s3-st7306-bringup.ino` を開き、ボードはお手持ちの ESP32-S3 の型番に合わせて選びます（本例は `ESP32S3 Dev Module`）。シリアルにログが出ない場合は、まず `USB CDC On Boot` を確認してください。
- デフォルトの SPI はモード 0、20MHz、論理画面は 400×300 の横画面です。何も表示されない場合は、まず電源を切って GND 共通、FPC の向き、RS の接続ピンを確認し、電源投入後に 3.3V を測定し、明るい光の下で観察してください。それでも駄目なら `SPI_HZ` を 10MHz に下げます。

## はじめに：まず Arduino IDE で ST7306 を点灯させる

この 4.2 インチの画面は ST7306 コントローラーを使用し、SPI 経由でコマンドとフレームバッファのデータを受け取ります。反射型（バックライトなし）の TFT LCD で、環境光によって表示するため、明るい環境でないと見にくいです。プロジェクトディレクトリには ESP-IDF と Arduino IDE の 2 種類のプログラムが用意されていますが、この記事では Arduino IDE のみ扱います。21Pin FPC を接続し、サンプルを書き込み、400×300 の横画面テストページを動かします。ESP-IDF の 20 ページデモもプロジェクトディレクトリに残してあるので、ドライバーのラッピングや描画関数をさらに研究したい読者は、自分でビルドして試すことができます。

## 最終結果：ST7306 の 8 ページ表示テスト

配線と書き込みがどちらも正しければ、プログラムは 8 枚のテストページをループ表示します。通常ページは約 3 秒、移動する四角のページは約 6 秒表示されます。シリアルモニターを開き、ボーレートを 115200 に設定すると、初期化とページ送りのログを確認できます。各ページは表示中、継続的に再描画されます。書き込み後にシリアルモニターを開いた場合、起動ログを見逃すことがありますが、ボードの RST を一度押せば再度確認できます。

| ページ番号 | テスト内容              | チェックポイント            | プログラム内の名称             |
| -: | ----------------- | -------------- | ----------------- |
|  0 | 白・シアン・赤・黒の横バー         | 4 種類の表示状態         | `PAGE_COLOR_BARS` |
|  1 | HELLO WORLD、枠線、四隅 | 文字と横画面の方向        | `PAGE_HELLO`      |
|  2 | 時間、フレーム数、FPS         | 起動からの累積時間、全体フレーム数、累積平均 FPS（このページ単独のフレームレートではない）        | `PAGE_COUNTER`    |
|  3 | 対角線、横線、縦線         | 線と座標マッピング        | `PAGE_DIAGONAL`   |
|  4 | 左右に往復する四角            | 連続リフレッシュ           | `PAGE_REFRESH`    |
|  5 | チェッカーボード               | 白黒のマス（1 マス 20 ピクセル）         | `PAGE_CHECKER`    |
|  6 | 横ストライプ               | 規則的なパターン           | `PAGE_STRIPES`    |
|  7 | CYAN 色テスト         | 全画面シアン（見た目はやや青寄り）、フレームバッファのバイトは `0x33` | `PAGE_CYAN`       |

> 補足：画面上のページ内ラベル（`1: COLOR BARS`、`3: DIAGONAL` など）はコードにハードコードされた文字列で、上表のページ番号と完全には対応していません（COLOR BARS は 0 ページ目）。シリアルの `[PAGE]` ログを基準にしてください。


![](https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg)


## 部品解説：YDP420H005-V3 と ST7306

### YDP420H005-V3 反射型 LCD モジュール

これは 4.2 インチの反射型 TFT LCD（バックライトなし）モジュールで、パネルのネイティブなフレームバッファは 300×400 です。ST7306 コントローラーはモジュールに組み込み済みで、ESP32-S3 は SPI 経由でコマンドとピクセルデータを送ります。本プロジェクトの Arduino プログラムは、アプリケーション層でこれを 400×300 の横画面にマッピングしています。

本プロジェクトのファームウェアは 2bit エンコードで 4 種類の表示状態（白・シアン・赤・黒、`0x00`～`0x03`）を駆動します。1 ピクセルあたり 2bit で、中間のグレー階調はありません。他の ST7306 画面の色や初期化パラメータをそのまま流用しないでください。

| パラメータ      | 本プロジェクトのモジュール                         |
| ------- | ----------------------------- |
| 型番      | Osptek YDP420H005-V3          |
| コントローラー     | Sitronix ST7306               |
| ネイティブ解像度   | 300×400                       |
| 表示状態    | 白・シアン・赤・黒、2bit/ピクセル               |
| ホストインターフェース    | 4 線 SPI（SCLK、MOSI、CS、D/C）、ほかに RESET、オプションの TE。FPC に MISO/SDO はなく、書き込み専用で読み出し不可 |
| モジュール電源とロジック | 3.3V                          |
| 有効表示領域  | 63.6×84.8mm                   |
| 動作温度    | −20～+70°C                     |

### 21Pin FPC 変換ボード

画面は 21Pin FPC で信号を引き出しています。変換ボードはこの微細なピンを、ESP32-S3 に接続しやすいはんだ付けパッドやピンヘッダに変換するもので、本プロジェクトでは別途表示駆動回路を組む必要はありません。

私が使ったのは、メーカーが画面とセットで販売しているデュアル FPC 汎用変換ボードで、型番のシルク印刷はありません。ボードにはソケットが 2 つあり、21Pin は 4.2 インチ用、12Pin は 2.9 インチ用で、そばに `GND`、`3V3` のパッドもあります。

2 つの FPC ソケットの横にはそれぞれ数個のチップ部品がはんだ付けされていますが、パッケージが非常に小さく、値のシルク印刷はありません。私はそれらの役割や値を調べていません。

この汎用ボードには接続を間違えやすい箇所が 1 つあります。ボード上には RS と DC の 2 種類のシルク印刷があり、本モジュールの LCD_D/C はシルク印刷 `RS` に接続します。もう一方の `DC` シルクは本モジュールとは無関係です（どちらのソケットに属するかは確認していません）。そこには接続しないでください。変換ボードを購入・はんだ付けする際は、FPC の接点の向きとピン番号も確認してください。

### ピン解説：YDP420H005-V3 の 21Pin FPC

下の表はモジュールの FPC 番号順に整理したものです。変換ボードのシルク印刷は異なる場合があるため、配線時はモジュールの仕様書と変換ボード実物の配線を基準にしてください（この変換ボードには型番がなく、公開された回路図もありません）。

|   FPC ピン番号 | モジュール信号                               | よくあるシルク印刷      | 本例での使い方                 |
| -------: | ---------------------------------- | --------- | -------------------- |
| 1、4、7、14 | GND                                | GND       | GND 共通に接続                 |
|      2、3 | NC                                 | NC        | 未接続                  |
|      5、6 | VCC(3.3V)                          | VCC、VCI   | 両ピンとも 3.3V に接続            |
|        8 | LCD_RES                            | RESET、RST | GPIO10 に接続、Low でリセット       |
|        9 | LCD_SCLK                           | SCL、SCLK  | GPIO12 に接続、SPI クロックとして使用   |
|       10 | TE                                 | TE        | GPIO11 に接続可。本例では読み取らないため未接続で可  |
|       11 | LCD_SDI                            | SDA、MOSI  | GPIO13 に接続、SPI MOSI として使用 |
|       12 | LCD_D/C                            | RS、A0     | GPIO14 に接続、コマンドかデータかを選択     |
|       13 | LCD_CS                             | CS        | GPIO9 に接続、Low でチップセレクト        |
|    15～19 | TP-VDD、TP-RST、TP-INT、TP-SDA、TP-SCL | タッチ関連のシルク印刷    | 本例のモジュールはタッチなし、未接続          |
|    20、21 | GND                                | GND       | こちらも GND。本例では 1、4、7、14 だけ接続すれば十分（20、21 が変換ボード上でそれらと繋がっているかは 1 本ずつ測定していません。心配なら一緒に GND に接続してください）        |

ここでの SCL と SDA は、変換ボードのシルク印刷に残っている一般的な呼び方です。本例は SPI を使用しており、SCL はこの画面のシリアルクロック、SDA は MOSI に対応します。

## BOM 表：ST7306 の配線に必要な材料

| 部品           | 仕様                    | 数量 | 備考               |
| ------------ | --------------------- | -: | ---------------- |
| ESP32-S3 開発ボード | ESP32-S3 N16R8（16MB Flash / 8MB PSRAM） |  1 | 3.3V GPIO を使用     |
| 表示モジュール         | Osptek YDP420H005-V3  |  1 | 4.2 インチ、21Pin FPC |
| FPC 変換ボード      | メーカーのデュアル FPC 汎用変換ボード、型番なし      |  1 | ピン番号と接点の向きを確認        |
| USB データケーブル      | 開発ボードのインターフェースに合うもの              |  1 | データ転送対応であること          |
| 接続ワイヤ          | 短めのジャンパーワイヤまたははんだ付け用ワイヤ             | 適量 | SPI の配線は短いほど安定し、整理もしやすい      |
## 配線方法：ESP32-S3 と ST7306

まず電源を切ってから、以下のデフォルト `PINSET = 1` に従って配線してください。

|   FPC ピン番号 | 画面の信号            | ESP32-S3 | 必須かどうか | 説明        |
| -------: | --------------- | -------- | ---- | --------- |
|       13 | LCD_CS / CS     | GPIO9    | 必須   | チップセレクト        |
|        8 | LCD_RES / RESET | GPIO10   | 必須   | ハードウェアリセット      |
|       10 | TE              | GPIO11   | 任意   | サンプルでは読み取らないため未接続で可 |
|        9 | LCD_SCLK / SCLK | GPIO12   | 必須   | SPI クロック    |
|       11 | LCD_SDI / MOSI  | GPIO13   | 必須   | SPI データ出力  |
|       12 | LCD_D/C / RS    | GPIO14   | 必須   | メーカー変換ボードでは RS に接続 |
|      5、6 | VCC / VCI       | 3.3V     | 必須   | 電源ピンは 2 本とも接続   |
| 1、4、7、14 | GND             | GND      | 必須   | 開発ボードと GND 共通    |

⚠️ モジュールの電源とロジックはどちらも 3.3V です。モジュールの電源が切れているときも、GPIO から信号を入力し続けないでください。

配線が終わったら、まず**電源を切った**状態で確認します。

1. モジュールの機械図と照らし合わせ、FPC の 1 番ピンと接点の向きを確認します。
2. マルチメーターの導通ブザーモードで、開発ボードの GND と画面の GND ピンが導通していること、3.3V と GND の間に短絡がないことを確認します。
3. CS、RESET、SCLK、MOSI、RS の 5 本の信号線を 1 本ずつ照合します。
4. メーカーのデュアル FPC 変換ボードを使う場合は、GPIO14 が RS に接続されていることを改めて確認します。
5. 緩みや短絡がないか確認します。

次に**電源を入れて**確認します。

6. マルチメーターで 5、6 番ピン（または変換ボードの対応するはんだ付け点）の電圧を測定します。3.3V のはずです。違っていれば直ちに電源を切って調査してください。

配線後は 1 本ずつ 2 回照合することをおすすめします。1 本間違えただけでも、シリアルログからどの線が原因かを見分けるのは困難です（本例のシリアルログは画面の状態を反映しません。トラブルシューティングの節を参照してください）。

## インストールが必要なライブラリ：Arduino IDE の ESP32-S3 サポート

本例には独立した ST7306 Arduino ライブラリはありません。ドライバー、描画、テストページはすべて `.ino` ファイルの中にあります。`SPI.h` と `esp_heap_caps.h` は ESP32 Arduino Core に付属しているため、ライブラリマネージャーで別途検索する必要はありません。

| 名称                                                               | 作者または提供元                     | インストール方法               | 手元で確認したバージョン        |
| ---------------------------------------------------------------- | ------------------------- | ------------------ | ------------- |
| Arduino IDE                                                      | Arduino                   | Arduino 公式サイトからインストール     | v2.3.8        |
| [esp32 Arduino Core](https://github.com/espressif/arduino-esp32) | Espressif Systems         | Arduino IDE のボードマネージャー | v3.3.8        |
| [SPI](https://github.com/espressif/arduino-esp32)                | Espressif Arduino Core に同梱 | Core と一緒にインストール          | Core v3.3.8 に付属 |
| [esp\_heap\_caps](https://github.com/espressif/arduino-esp32)    | Espressif Arduino Core に同梱 | Core と一緒にインストール          | Core v3.3.8 に付属 |

### esp32 Arduino Core のインストール

1. Arduino IDE の環境設定を開き、「追加のボードマネージャの URL」に以下を追加します。


   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
2. 「ツール → ボード → ボードマネージャ」を開き、`esp32` を検索します。
3. `esp32 by Espressif Systems` をインストールします。手元で確認したバージョンは v3.3.8 です。再現時は同じバージョンを選ぶことをおすすめします。Core の違いによるトラブルシューティングの変数を減らせます。

### コードを開いて書き込む

1. [プロジェクトの GitHub ページ](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek)を開き、プロジェクトディレクトリ全体をダウンロードするか、`ArduinoIDE/esp32s3-st7306-bringup` フォルダだけを保存します。
2. Arduino IDE で `ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino` を開きます。
3. コード内の `PINSET` が `1` であることを確認し、`ROT180` のデフォルトが `1` であることも照合します。
4. 「ツール → ボード」でお手持ちの ESP32-S3 開発ボードを選び（本例は `ESP32S3 Dev Module`）、正しいシリアルポートを選択します。参考値は次の節にありますが、すべてそのままコピーする必要はありません。
5. 「検証」をクリックし、通ったら「マイコンボードに書き込む」をクリックします。
6. シリアルモニターを開き、ボーレート 115200 を選択します。`テストページループ開始` が表示されたら、画面がテストページを順番に切り替えているか観察します。ネイティブ USB を使用している場合、書き込み後にシリアルポートが再列挙され、起動ログがすでに出力し終わっていることがあります。見えない場合は RST を一度押すか、その後の `[PAGE]` ページ送りログを基準にしてください。画面は反射型なので、明るい光の下で観察してください。

### Arduino IDE のメニュー設定（参考値）

以下は私が動作確認できたときの設定で、Arduino IDE v2.3.8 + esp32 Core v3.3.8 です。あくまで参考です。ESP32-S3 開発ボードは型番が多すぎて、Flash チップ、PSRAM、USB の接続方法が異なる可能性があり、そのままコピーすると逆に問題が起きやすくなります。表の 3 列目に、どの項目がボード依存かを書いてあります。

| メニュー項目 | 本例の値 | 決め方 |
| --- | --- | --- |
| Board | ESP32S3 Dev Module | お手持ちのボードに合わせて選択。アーキテクチャは必ず esp32s3 |
| Port | /dev/cu.usbmodem1401 | 自分の環境の実際のポートを選択。パスをそのままコピーしない |
| USB CDC On Boot | Enabled | USB をどこに繋ぐかで決まる：ネイティブ USB なら Enabled、ボード搭載のシリアル変換チップ経由なら Disabled |
| CPU Frequency | 240MHz (WiFi) | デフォルトのままでよい。サンプルはクロックダウン不要 |
| Flash Mode | QIO 80MHz | Flash チップに合わせて決定。QIO は多くのモジュールのデフォルト値 |
| Flash Size | 4MB (32Mb) | ボードの実際の容量を超えないこと（大きく選ぶと起動に失敗する可能性あり）。小さく選ぶと容量を使い切らないだけで、プログラムがパーティションを超えたときのみコンパイルエラーになる |
| PSRAM | Disabled | サンプルは PSRAM を使わないため Disabled が最も安定。有効化するならモジュールに合わせて OPI/QSPI を正しく選ぶこと（N16R8 の R8 は通常 Octal なので OPI PSRAM を選択）。間違えると起動しない可能性あり |
| Partition Scheme | Default 4MB with spiffs（1.2MB APP / 1.5MB SPIFFS） | デフォルトで十分。Flash Size を変えたら一緒に変更する |
| Upload Speed | 921600 | 書き込みに失敗したら 115200 または 460800 に下げる |
| Upload Mode | UART0 / Hardware CDC | USB CDC の項目とセットで決まる |
| USB Mode | Hardware CDC and JTAG | ボードの USB ポート数に関係。シングルポートのボードは通常この設定 |

私のボードは N16R8 で、公称 16MB Flash + 8MB PSRAM ですが、上の Flash Size は 4MB、PSRAM は Disabled にしており、容量の大半を使っていないことになります。サンプルはフレームバッファとして RAM を 30000 バイト使うだけで、コンパイルレポートではプログラムがデフォルト APP パーティションの約 24% を占める程度なので、この設定で動きます。容量をフルに使うには Flash Size、PSRAM、パーティションテーブルを変更する必要がありますが、私は試していません。読者にこの落とし穴にハマってほしくないのです。

自分の設定が正しいかどうかは、項目を 1 つずつ照合する必要はありません。コンパイルでき、書き込みでき、シリアルに文字が出て、画面に絵が出れば十分です。どこかの段階で止まったら、まずトラブルシューティングの節で症状と照らし合わせてください。

## 完全なコード：Arduino IDE で ST7306 を駆動

以下はリポジトリ v7.5 の完全な `.ino` です。リポジトリと比べて、本文ではコメントを数箇所のみ変更しています（`PINSET` の意味、回転方法、中央寄せの説明、FPS の算出基準、`DIAG_MODE` の用途）。実行ロジックには手を加えていません。リポジトリ側の対応するコメントも併せて更新することをおすすめします。v7.4 では `PAGE_CYAN` のフィルバイトを修正し、v7.5 ではデータを読み戻せない `0x09` ステータス読み出しの部分を削除しました。それ以外のロジックは変更していません。
```cpp
/*
 * ESP32-S3 + OSPTEK 4.2" 300x400 白黒赤シアン LCD（ST7306 · SPI）テストスイート v7.5
 *
 * v7.5 の変更（無効なステータス読み戻しを削除）：
 *   esp32s3-st7306-readback-test で実測：SPI.begin(...,-1,MOSI,-1) では MISO 未接続のため、
 *   transfer() は常に 0xFF を返し、レジスタアドレスや CS の選択状態とは無関係。
 *   データピンを入力に切り替えてプルアップ/プルダウンでそれぞれ読み取ると、
 *   結果はオール 1 / オール 0 となり、読み出しコマンド中に画面がデータ線を駆動していないことを示す。
 *   結論：このモジュールは現在の接続方法ではレジスタを読み戻せない。元の [DIAG] 0x09 ログは
 *   誤って OK を報告するだけなので、丸ごと削除した。リンクの良否は画面が正常に表示されるかで判断し、
 *   シリアルを見ないこと。
 *
 * v7.4 の変更（PAGE_CYAN の全画面フィルを修正）：
 *   実機で 0x33 / 0x55 / 点ごとの writePoint(C_CYAN) を比較：
 *   0x33 と点ごとの書き込みはどちらも全画面シアン（見た目はやや青寄り）、0x55 は間隔のあるストライプ表示。
 *   点ごとに書き込んだ後の 30000 バイトのフレームバッファもすべて 0x33 だったため、PAGE_CYAN を 0x33 に変更。
 *
 * v7.3 の変更（画面全体をさらに 180° 回転）：
 *   実演時に画面の方向が元のマッピングと逆だったため、画面全体を 180° 回転する必要があった。
 *   writePoint のソフトウェアマッピングの前に、論理座標の中心対称変換を 1 回追加：
 *     x -> LCD_W-1-x, y -> LCD_H-1-y
 *   rx = 299 - y; ry = x; と等価。ROT180 マクロで切り替え、0 にすると v7.1 の方向に戻る。
 *
 * v7.1 の変更（横画面対応 - ソフトウェア回転、方向修正）：
 *   パネルの物理配線は縦 300x400 だが、ユーザーは横向きに置くため、視点は 400x300。
 *   ソフトウェア回転を使用：writePoint が論理横画面座標を縦向きフレームバッファにマッピング。
 *   マッピング式（v7.1 で修正）：rx = y; ry = 399 - x;
 *   v7 では rx=299-y, ry=x（時計回り）を使っていたが、診断用の四角が右下に現れ、方向が逆だった。
 *   v7.1 で反時計回りに変更：四角は左上に現れるはず。
 * v7.2：DIAG_MODE をオフにし、完全な 8 ページテストループに復帰。
 *
 * v4 の重要な修正：
 *   1) pinMode(LCD_CS/RS, OUTPUT) を追加：digitalWrite の内部は gpio_set_level() だけで、
 *      出力モードへの切り替えは自動では行われない。ESP32 のピンはデフォルトが入力のため、
 *      CS/D-C が浮いた状態となり、画面は有効なコマンド/データのタイミングを一切受け取れなかった。
 *      これが以前のバージョンで無表示だった真の原因。
 *   2) ピン定義は board_config.h（BOARD_PINSET 1）と一致させ、配線の変更は不要：
 *      CS=9  RST=10  CLK=12  MOSI=13  RS(D/C)=14
 *   3) SPI クロック 20MHz
 *   4) IDF プロジェクトの app_main で initialize() の後に呼ばれる手順を追加：
 *      High_Power_Mode / display_on / display_Inversion(false) / clearDisplay
 *   5) 色マッピングは IDF の board_color.h と一致：
 *      C_WHITE=0x00  C_CYAN=0x01  C_RED=0x02  C_BLACK=0x03
 *      （bit0=シアン, bit1=赤, 両 bit オン=黒）
 *
 * v5 で 8 枚のテストページを追加（各ページ 3 秒、リフレッシュレートのページは 6 秒）：
 *   0 COLOR_BARS  4 色横バー（白/シアン/赤/黒）
 *   1 HELLO       HELLO WORLD + 四隅のコーナーマーク + 枠線
 *   2 COUNTER     計時 / フレーム数 / FPS
 *   3 DIAGONAL    対角線 + 横線・縦線
 *   4 REFRESH     リフレッシュレートテスト（移動する四角）
 *   5 CHECKER     チェッカーボード
 *   6 STRIPES     横ストライプ
 *   7 CYAN        全画面シアン
 */

#include <SPI.h>
#include <esp_heap_caps.h>

// ---------------- ピン設定 ----------------
#define PINSET 1  // 1=デフォルト接続（GPIO9/10/12/13/14、本文で使用）  0=予備接続（GPIO38～42）

#if PINSET == 1
  // ピンは IDF プロジェクトの board_config.h（BOARD_PINSET 1）と完全に一致、配線の変更は不要
  #define LCD_CS   9
  #define LCD_RST  10
  #define LCD_CLK  12
  #define LCD_MOSI 13
  #define LCD_RS   14   // D/C、シルク印刷は RS
#else
  #define LCD_CS   38
  #define LCD_RST  41
  #define LCD_CLK  39
  #define LCD_MOSI 42
  #define LCD_RS   40
#endif

// ---------------- 画面パラメータ ----------------
// 論理解像度：横画面 400x300（パネルの物理配線は縦 300x400、writePoint() でソフトウェア回転、MV ビットは未使用）
#define LCD_W      400
#define LCD_H      300
// 縦向きフレームバッファのパラメータ（変更なし）
#define LCD_PIVOT_W  300   // 物理幅
#define LCD_PIVOT_H  400   // 物理高さ
#define LCD_ROW_B    (LCD_PIVOT_W / 2)          // 1 行 150 バイト
#define BUF_LEN      (LCD_ROW_B * LCD_PIVOT_H / 2)  // 30000 バイト
#define CHUNK        1500

// 色マッピングは IDF の board_color.h と一致
#define C_WHITE  0x00
#define C_CYAN   0x01
#define C_RED    0x02
#define C_BLACK  0x03

// それでも点灯しない場合は、20000000 を 10000000 に下げて再試行できる
#define SPI_HZ  20000000

static uint8_t *fb = nullptr;

// ---------------- 低レベル SPI（CS は完全手動）----------------
static void spi_begin(void) {
  SPI.beginTransaction(SPISettings(SPI_HZ, MSBFIRST, SPI_MODE0));
}

static void lcd_cmd(uint8_t cmd) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, LOW);
  SPI.transfer(cmd);
  digitalWrite(LCD_CS, HIGH);
}

static void lcd_param(uint8_t p) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  SPI.transfer(p);
  digitalWrite(LCD_CS, HIGH);
}

// ここには元々 lcd_read_reg() があり、SPI.transfer() で 0x09 ステータスレジスタを読んでいた。
// v7.5 で削除した理由（推測ではなく実測）：
//   1) SPI.begin(LCD_CLK, -1, LCD_MOSI, -1) の第 2 引数は MISO で、-1 は未接続を意味する。
//       peripheral に入力ピンがなくサンプリングできないため、transfer() は常に 0xFF を返す。
//   2) 0x04 / 0x0A / 0xDA / 0xA5 の任意のレジスタに変えても、CS をずっと High にして
//      画面を全く選択しなくても、読み戻しはやはり 0xFF —— この値は画面と一切関係がない。
//   3) 半二重に変更（MOSI ピンを入力に切り替え、手動でクロックを叩く）して読むと、
//      内部プルアップでオール 1、内部プルダウンでオール 0 となり、読み出しコマンド中に
//      画面がデータ線を駆動しておらず、読み戻せないことを示す。
// したがってこのモジュールは現在の接続方法では利用可能なリンク自己診断がない。接続の良否は画面が表示されるかで判断する。

// ---------------- 初期化シーケンス（IDF と 1 行ずつ一致）----------------
static void st7306_init(void) {
  // 重要な修正：CS / RS / RST を明示的に出力に設定する必要がある。
  // digitalWrite の内部は gpio_set_level() だけで、出力モードへの切り替えは自動では行われない。
  // ESP32 のピンはデフォルトが入力のため、pinMode しないと CS と D/C が終始浮いた状態となり、画面は有効なタイミングを一切受け取れない。
  pinMode(LCD_CS,  OUTPUT);
  pinMode(LCD_RS,  OUTPUT);
  pinMode(LCD_RST, OUTPUT);
  digitalWrite(LCD_CS, HIGH);   // アイドル時は CS を High に
  digitalWrite(LCD_RS, HIGH);
  digitalWrite(LCD_RST, HIGH); delay(10);
  digitalWrite(LCD_RST, LOW);  delay(10);
  digitalWrite(LCD_RST, HIGH); delay(10);

  // 最後の引数に -1 を渡し、CS は完全に手動の digitalWrite で制御
  SPI.begin(LCD_CLK, -1, LCD_MOSI, -1);
  spi_begin();

  lcd_cmd(0xD6); lcd_param(0x17); lcd_param(0x02);
  lcd_cmd(0xD1); lcd_param(0x01);

  lcd_cmd(0xC0); lcd_param(0x12); lcd_param(0x0A);
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);

  lcd_cmd(0xD8); lcd_param(0xA6); lcd_param(0xE9);
  lcd_cmd(0xB2); lcd_param(0x12);

  lcd_cmd(0xB3); lcd_param(0xE5); lcd_param(0xF6); lcd_param(0x17);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x71);
  lcd_cmd(0xB4); lcd_param(0x05); lcd_param(0x46); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x76); lcd_param(0x45);

  lcd_cmd(0x62); lcd_param(0x32); lcd_param(0x03); lcd_param(0x1F);

  lcd_cmd(0xB7); lcd_param(0x13);
  lcd_cmd(0xB0); lcd_param(0x64);

  lcd_cmd(0x11); delay(120);                         // Sleep Out

  lcd_cmd(0xC9); lcd_param(0x00);
  lcd_cmd(0x36); lcd_param(0x48);                    // MX=1, DO=1
  lcd_cmd(0x3A); lcd_param(0x11);
  lcd_cmd(0xB9); lcd_param(0x20);
  lcd_cmd(0xB8); lcd_param(0x29);

  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);

  lcd_cmd(0x35); lcd_param(0x00);
  lcd_cmd(0xD0); lcd_param(0xFF);
  lcd_cmd(0x38);                                     // HPM

  lcd_cmd(0x29);                                     // DISPLAY ON
  lcd_cmd(0x20);                                     // Inversion Off

  lcd_cmd(0xBB); lcd_param(0x4F);                    // Enable Clear RAM

  // ---- IDF の app_main が initialize() の後にさらに呼ぶ手順 ----
  lcd_cmd(0x38); delay(300);                         // High_Power_Mode() の HPM シーケンス
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);
  lcd_cmd(0xC9); lcd_param(0x00);
  delay(20);
  // display_on(true) / display_Inversion(false) は上で 0x29/0x20 を送信済み
  // clearDisplay() はフレームバッファのゼロクリアと等価で、画面転送前の memset が担う

  SPI.endTransaction();
}
// ---------------- 画面転送（分割送信）----------------
static void st7306_flush(void) {
  spi_begin();
  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);
  lcd_cmd(0x2C);

  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  for (size_t off = 0; off < BUF_LEN; off += CHUNK) {
    size_t n = BUF_LEN - off;
    if (n > CHUNK) n = CHUNK;
    SPI.writeBytes(fb + off, n);
  }
  digitalWrite(LCD_CS, HIGH);
  SPI.endTransaction();
}

// ---------------- ピクセル操作 ----------------
// 論理座標：横画面 400x300
// 縦向きフレームバッファ 300(列) x 400(行)、ソフトウェア回転マッピング：
//   横画面 x (0~399, 左から右) -> 縦向きの行 ry = 399 - x（左右反転）
//   横画面 y (0~299, 上から下) -> 縦向きの列 rx = y
// bit の位置は縦向きの物理座標 rx/ry の偶奇で計算する。
//
// ROT180：画面全体をさらに 180° 回転（パネルを逆向きに取り付けた / 実演時の設置方向が逆の場合に使用）。
//   方法はまず論理座標を中心対称変換 x -> 399-x, y -> 299-y し、その後に上記のマッピングを適用する。
//   整理すると rx = 299 - y; ry = x; と等価。
#define ROT180 1   // 1 = 180° 回転（現在）；0 = v7.1 の元の方向に戻す

static void writePoint(uint16_t x, uint16_t y, uint16_t data) {
  if (x >= LCD_W || y >= LCD_H) return;
#if ROT180
  x = LCD_W - 1 - x;       // 論理 x をミラー
  y = LCD_H - 1 - y;       // 論理 y をミラー
#endif
  uint16_t rx = y;         // 縦向きの列
  uint16_t ry = 399 - x;   // 縦向きの行（反転）
  uint16_t real_x = rx / 2;
  uint16_t real_y = ry / 2;
  uint32_t idx    = (uint32_t)real_y * LCD_ROW_B + real_x;
  uint8_t one_two    = (ry % 2) ? 1 : 0;
  uint8_t line_bit_1 = (rx % 2) * 4;
  uint8_t line_bit_0 = (rx % 2) * 4 + 2;
  uint8_t bit1       = 7 - (line_bit_1 + one_two);
  uint8_t bit0       = 7 - (line_bit_0 + one_two);
  if (data & 0x02) fb[idx] |=  (1 << bit1);
  else             fb[idx] &= ~(1 << bit1);
  if (data & 0x01) fb[idx] |=  (1 << bit0);
  else             fb[idx] &= ~(1 << bit0);
}

static void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  for (uint16_t j = 0; j < h; j++)
    for (uint16_t i = 0; i < w; i++)
      writePoint(x + i, y + j, color);
}

// ---------------- 5x7 フォントデータ（IDF の board_ui_draw.cc から移植）----------------
static const uint8_t s_font_5x7[][7] = {
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, /*   */
    {0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04}, /* ! */
    {0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00}, /* " */
    {0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A}, /* # */
    {0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04}, /* $ */
    {0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03}, /* % */
    {0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0D}, /* & */
    {0x04, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00}, /* ' */
    {0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02}, /* ( */
    {0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08}, /* ) */
    {0x00, 0x04, 0x15, 0x0E, 0x15, 0x04, 0x00}, /* * */
    {0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00}, /* + */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08}, /* , */
    {0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00}, /* - */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00}, /* . */
    {0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00}, /* / */
    {0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E}, /* 0 */
    {0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* 1 */
    {0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F}, /* 2 */
    {0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E}, /* 3 */
    {0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02}, /* 4 */
    {0x1F, 0x10, 0x10, 0x1E, 0x01, 0x01, 0x1E}, /* 5 */
    {0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E}, /* 6 */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08}, /* 7 */
    {0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E}, /* 8 */
    {0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E}, /* 9 */
    {0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00}, /* : */
};

// 大文字 A-Z（5x7）
static const uint8_t s_font_upper[][7] = {
    {0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* A */
    {0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E}, /* B */
    {0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E}, /* C */
    {0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E}, /* D */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F}, /* E */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10}, /* F */
    {0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F}, /* G */
    {0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* H */
    {0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* I */
    {0x01, 0x01, 0x01, 0x01, 0x01, 0x11, 0x0E}, /* J */
    {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11}, /* K */
    {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F}, /* L */
    {0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11}, /* M */
    {0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11}, /* N */
    {0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* O */
    {0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10}, /* P */
    {0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D}, /* Q */
    {0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11}, /* R */
    {0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E}, /* S */
    {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04}, /* T */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* U */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04}, /* V */
    {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A}, /* W */
    {0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11}, /* X */
    {0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04}, /* Y */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F}, /* Z */
};

static void draw_char(int x, int y, char c, int scale, uint16_t color) {
    const uint8_t *rows = nullptr;
    if (c >= ' ' && c <= ':') {
        rows = s_font_5x7[c - ' '];
    } else if (c >= 'A' && c <= 'Z') {
        rows = s_font_upper[c - 'A'];
    } else if (c >= 'a' && c <= 'z') {
        rows = s_font_upper[c - 'a'];   // 大文字のフォントデータを再利用
    } else {
        return;
    }
    for (int ry = 0; ry < 7; ++ry) {
        for (int rx = 0; rx < 5; ++rx) {
            if (rows[ry] & (1U << (4 - rx))) {
                fillRect(x + rx * scale, y + ry * scale, scale, scale, color);
            }
        }
    }
}

static void draw_text(int x, int y, const char *s, int scale, uint16_t color) {
    const int char_w = 5 * scale + scale;
    int pen_x = x;
    for (const char *p = s; *p; ++p) {
        draw_char(pen_x, y, *p, scale, color);
        pen_x += char_w;
    }
}
// ---------------- テストページ ----------------
enum TestPage {
    PAGE_COLOR_BARS = 0,   // 4 色横バー（白/シアン/赤/黒）
    PAGE_HELLO,            // Hello World + 四隅のコーナーマーク + 枠線
    PAGE_COUNTER,          // 秒数 / フレーム数のカウント
    PAGE_DIAGONAL,         // 対角線 + 横線・縦線
    PAGE_REFRESH,          // リフレッシュレートテスト（移動する四角）
    PAGE_CHECKER,          // チェッカーボード
    PAGE_STRIPES,          // 横ストライプ
    PAGE_CYAN,             // 全画面シアン
    kTotalPages
};

static void draw_corner_marks(uint16_t color) {
    const int L = 30, T = 4;  // アームの長さ、太さ
    // 左上
    fillRect(4, 4, L, T, color);  fillRect(4, 4, T, L, color);
    // 右上
    fillRect(LCD_W - 4 - L, 4, L, T, color);  fillRect(LCD_W - 4 - T, 4, T, L, color);
    // 左下
    fillRect(4, LCD_H - 4 - T, L, T, color);  fillRect(4, LCD_H - 4 - L, T, L, color);
    // 右下
    fillRect(LCD_W - 4 - L, LCD_H - 4 - T, L, T, color);
    fillRect(LCD_W - 4 - T, LCD_H - 4 - L, T, L, color);
}

static void draw_border(uint16_t color) {
    fillRect(0, 0, LCD_W, 2, color);
    fillRect(0, LCD_H - 2, LCD_W, 2, color);
    fillRect(0, 0, 2, LCD_H, color);
    fillRect(LCD_W - 2, 0, 2, LCD_H, color);
}

// 任意方向の直線を 1 本描く（Bresenham）
static void draw_line(int x0, int y0, int x1, int y1, int thick, uint16_t color) {
    int dx = abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int dy = -abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    int err = dx + dy;
    while (true) {
        fillRect(x0, y0, thick, thick, color);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

static void render_page(int page, uint32_t frame, uint32_t elapsed_ms) {
    memset(fb, 0x00, BUF_LEN);   // デフォルトは全面白

    switch (page) {
    case PAGE_COLOR_BARS: {
        const uint16_t colors[4] = { C_WHITE, C_CYAN, C_RED, C_BLACK };
        const int bar_h = LCD_H / 4;
        for (int i = 0; i < 4; ++i) {
            int y0 = i * bar_h;
            int y1 = (i == 3) ? LCD_H : (y0 + bar_h);
            fillRect(0, y0, LCD_W, y1 - y0, colors[i]);
        }
        draw_text(10, 10, "1: COLOR BARS", 2, C_BLACK);
        break;
    }
    case PAGE_HELLO:
        // "HELLO WORLD" 11 文字 * scale5 * 6px = 幅 330px、中央寄せ x=(400-330)/2=35
        draw_text(35, 110, "HELLO WORLD", 5, C_BLACK);
        draw_text(110, 175, "ST7306 400X300", 2, C_RED);
        draw_text(110, 200, "ESP32-S3 ARDUINO", 2, C_CYAN);
        draw_corner_marks(C_BLACK);
        draw_border(C_RED);
        break;
    case PAGE_COUNTER: {
        char buf[24];
        uint32_t sec = elapsed_ms / 1000;
        snprintf(buf, sizeof(buf), "T: %02lu:%02lu", (unsigned long)(sec / 60), (unsigned long)(sec % 60));
        draw_text(115, 80, buf, 5, C_BLACK);        // 幅 240；x=115 は手調整で、厳密な中央寄せではない
        snprintf(buf, sizeof(buf), "FRAME: %lu", (unsigned long)frame);
        draw_text(140, 160, buf, 3, C_RED);         // 幅は桁数で変化；x=140 は手調整
        snprintf(buf, sizeof(buf), "FPS: %lu", (unsigned long)(frame * 1000 / max((uint32_t)1, elapsed_ms)));
        draw_text(152, 200, buf, 3, C_CYAN);        // 幅は桁数で変化；x=152 は手調整；FPS は起動から現在までの全ページの累積平均
        break;
    }
    case PAGE_DIAGONAL:
        // 対角線 2 本
        draw_line(0, 0, LCD_W - 1, LCD_H - 1, 3, C_BLACK);
        draw_line(LCD_W - 1, 0, 0, LCD_H - 1, 3, C_RED);
        // 横線
        for (int y = 30; y < LCD_H; y += 60)
            draw_line(0, y, LCD_W - 1, y, 2, C_CYAN);
        // 縦線
        for (int x = 40; x < LCD_W; x += 80)
            draw_line(x, 0, x, LCD_H - 1, 2, C_BLACK);
        draw_text(10, 10, "3: DIAGONAL", 2, C_BLACK);
        break;
    case PAGE_REFRESH: {
        // 四角が左右に往復、動きの滑らかさを観察
        int period = LCD_W - 60;
        int x = (int)((frame * 8) % (period * 2));
        if (x > period) x = period * 2 - x;
        fillRect(x + 10, 130, 40, 40, C_BLACK);     // 垂直方向の中央 y=(300-40)/2
        char buf[24];
        snprintf(buf, sizeof(buf), "FRAME %lu", (unsigned long)frame);
        draw_text(10, 10, buf, 2, C_BLACK);
        break;
    }
    case PAGE_CHECKER: {
        const int cell = 20;
        for (int y = 0; y < LCD_H; y += cell)
            for (int x = 0; x < LCD_W; x += cell)
                fillRect(x, y, cell, cell, ((x / cell + y / cell) & 1) ? C_BLACK : C_WHITE);
        break;
    }
    case PAGE_STRIPES: {
        const int stripe_h = 16;
        for (int y = 0; y < LCD_H; y += stripe_h * 2) {
            fillRect(0, y, LCD_W, stripe_h, C_BLACK);
            fillRect(0, y + stripe_h, LCD_W, stripe_h, C_WHITE);
        }
        break;
    }
    case PAGE_CYAN:
        memset(fb, 0x33, BUF_LEN);   // 0x33 = 各結合ピクセルが 01 -> 全画面シアン
        draw_text(85, 130, "CYAN FULL", 5, C_BLACK);   // 幅 270；x=85 は手調整で、厳密な中央寄せではない
        break;
    default:
        break;
    }

    st7306_flush();
}

// ---------------- Arduino エントリー ----------------

// 診断モード：true のとき論理座標 (50,50) に 50x50 の黒い四角を 1 つだけ描く。
// writePoint のマッピングと方向が正しいかの判断用（画面が全く点灯しない場合は役立たないので、まず配線と電源を確認）。
// 観察ポイント：
//   1. 四角が正方形（長方形や断片ではない）-> ピクセルマッピングの比率が正しい
//   2. 四角が横画面視点の左上 1/4 の領域にある -> 方向が正しい
//   3. 全体が逆なら -> まず ROT180 マクロを変更；それでも駄目なら MADCTL(0x36) の MX/MY ビットの変更を検討
#define DIAG_MODE  false

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println();
    Serial.println("=== ST7306 test suite v7.5 (ROT180) ===");

    fb = (uint8_t *)heap_caps_malloc(BUF_LEN, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!fb) fb = (uint8_t *)malloc(BUF_LEN);
    if (!fb) { Serial.println("[ERR] フレームバッファ確保失敗"); while (1) delay(100); }
    Serial.printf("[OK] フレームバッファ %d バイト @%p\n", BUF_LEN, fb);
    memset(fb, 0x00, BUF_LEN);

    Serial.println("[..] ST7306 初期化中 ...");
    st7306_init();

    // ここでは元々 0x09 ステータスレジスタを 1 回読んで OK / リンク不通 を表示していた。
    // v7.5 で削除：MISO が未接続のため、読み戻し値は常に 0xFF で画面の状態と無関係、誤報になるだけ。
    // リンクが正常かどうかは、画面に正常に絵が出るかで判断する。

    if (DIAG_MODE) {
        Serial.println("[DIAG] (50,50) に 50x50 の四角を描画、画面を観察...");
        fillRect(50, 50, 50, 50, C_BLACK);
        st7306_flush();
    } else {
        Serial.println("[OK] テストページループ開始");
    }
}

void loop() {
    if (DIAG_MODE) { delay(1000); return; }

    static int page = 0;
    static uint32_t page_start = 0;
    static uint32_t frame = 0;
    static uint32_t t_start = 0;

    if (t_start == 0) t_start = millis();
    if (page_start == 0) page_start = millis();

    uint32_t dwell = (page == PAGE_REFRESH) ? 6000 : 3000;
    uint32_t elapsed = millis() - page_start;

    render_page(page, frame, millis() - t_start);
    frame++;

    if (elapsed >= dwell) {
        page = (page + 1) % kTotalPages;
        page_start = millis();
        Serial.printf("[PAGE] %d / %d, frame %lu\n", page, kTotalPages - 1, (unsigned long)frame);
    }
}
```


### コード解説：ST7306 の初期化、フレームバッファと回転

`PINSET` はどの GPIO グループを使うかを決めます。本文の配線は `PINSET = 1` に対応します。ソースには `PINSET = 0` の別のピングループも残っており、グループを切り替える際は配線も同時に変更する必要があります。`PINSET` はあくまで 2 組のピンの切り替えスイッチで、変換ボードを使うかどうかとは無関係です。配線を楽にするために、`PINSET = 1` に対応する接続設定を 1 つ追加しました。

`st7306_init()` はまず CS、RS、RST を出力に設定し、その後ハードウェアリセットと ST7306 の初期化を行います。`SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` で SCLK と MOSI を指定し、CS はコードで手動制御します。MISO に `-1` を渡すのは、本モジュールの FPC に MISO/SDO がなく書き込み専用で読み出しできないためで、本例には読み戻しによる自己診断がありません。転送は `SPI_MODE0` を使用し、クロックは `SPI_HZ` で 20MHz に設定しています。

フレームバッファのサイズは直接計算できます。1 ピクセル 2bit、1 バイトに 2×2 の計 4 ピクセルが入るため、300×400 ピクセルは 1 行 150 バイト、計 200 行（1 行が 2 ピクセル行に対応）となり、`150 × 200 = 30000` バイトです。プログラム起動時に `heap_caps_malloc()` で DMA 利用可能なメモリを確保し、失敗した場合は通常の `malloc()` にフォールバックします。

`writePoint()` は論理 400×300 の横画面座標をネイティブ 300×400 のフレームバッファ座標に変換します。デフォルトの `ROT180 = 1` ではさらに中心対称変換を 1 回行うため、表示方向を変えるときはまずこのマクロを変更し、`LCD_W` と `LCD_H` は変更しないでください。

`st7306_flush()` は毎回フレームバッファ全体を送信し、1 ブロック 1500 バイトです。`loop()` は現在のページを継続的に再描画し、通常ページは約 3 秒後にページ送り、`PAGE_REFRESH` は約 6 秒後にページ送りします。カウンタページの時間と FPS はいずれも起動からの累積値で、ページ単独のデータではありません。

ESP-IDF 版のドライバーは `main/st7306_color4.cpp`、`main/st73xx_ui.c`、`main/color4_demo.c` に分割されており、ページ数も多くなっています。この部分はリポジトリの README に沿って読者自身で研究していただくこととし、本文では ESP-IDF のビルド手順は展開しません。
## よくあるトラブルシューティング：ST7306 が表示されない、方向と色の問題

### 書き込みは成功したのに、画面がまったく変化しない

現象：シリアルは動作しているのに、画面は元のままです。

原因：電源、GND 共通、FPC の向き、RS/DC の誤配線、SPI 信号の不安定さのいずれでも、初期化コマンドが画面に正しく届かないことがあります。反射型 LCD（バックライトなし）はバックライトがないため、周囲が暗すぎると表示されていないように見えることもあります。

対処：まず電源を切って GND 共通と FPC の接点の向きを確認し、再通電後にピン 5、6 が 3.3V かを測定します（前述の確認手順を参照）。メーカー純正の変換ボードでは GPIO14 が RS に接続されています。明るい光の下で角度を変えて観察してください。以上がすべて正常なら、`SPI_HZ` を `20000000` から `10000000` に変更し、SCLK と MOSI の配線を短くしてから再度書き込みます。

### 旧バージョン（v7.4 以前）でシリアルに OK と表示されるのに、画面が点かない

現象：シリアルに `[DIAG] ST7306 0x09 = 0xFF OK` と表示されるのに、画面には何も映りません。

原因：このログは画面の状態を反映しません。上の FPC ピン表のとおり、本モジュールには MISO/SDO がなく、`SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` でも MISO にピンを割り当てていないため、`SPI.transfer()` は常に `0xFF` を返します。どのレジスタを読むか、CS が選択されているかとは無関係です（私は `0x04`、`0x0A`、`0xDA`、`0xA5` を試しましたが、CS を常時 High にしても同じでした）。MOSI ピンを入力に切り替えて手動で読むと、プルアップでオール 1、プルダウンでオール 0 となり、読み出しコマンド中に画面側がデータ線を駆動していないことも確認できます。

対処：v7.5 にアップグレードしてください。この行は削除済みです。v7.5 のシリアルログは画面の状態を反映しないため、リンクの良否は画面に絵が出るかどうかだけで判断し、切り分けは電源、GND 共通、FPC の向き、RS の接続ピンに戻してください。

### ST7306 が動いたり動かなかったり、表示崩れが起きたり、通電ごとに結果が変わる

現象：表示できることもあれば、表示崩れになることもあり、再通電すると結果が変わります。

原因：SPI の配線が長すぎる、GND 共通の接触が悪いと、転送中にデータが化けます。線が長く、クロックが高いほどバイトが失われやすくなります（これは経験的な判断で、定量的なテストは行っていません）。

対処：まず配線を 10cm 以内に短くし、GND が合計 2 本以上接続されていて、細い 1 本だけで GND を通していないことを確認します。次に `SPI_HZ` を 20MHz から 10MHz に下げて試し、安定したら徐々に上げてください。先に初期化コマンドを勝手に削除・変更しないでください。

### ST7306 の横画面の向きが逆になっている

現象：文字や図柄が 180° 回転していますが、図形のアスペクト比は正常です。

原因：現在のコードはデフォルトで `ROT180 = 1` になっており、あなたの設置方向がサンプルと逆の可能性があります。

対処：書き込み後に HELLO WORLD ページを見てください。文字が正しければ変更不要です。画面全体が 180° 反転している場合は、`#define ROT180 1` を `#define ROT180 0` に変更して再度書き込むだけです。方向と座標を個別に確認したいときは `DIAG_MODE` を `true` にすると、50×50 の黒い四角を 1 つだけ描画します。方向が正しければ正方形で、画面の左上領域に表示されるはずです。このモードは方向とマッピングの確認専用で、画面がまったく点かないときには役立ちません。

### ST7306 の表示比率や位置がおかしい

現象：四角が変形する、図柄が断片化する、位置が想定と合わない、などです。

原因：通常は `LCD_W`、`LCD_H`、フレームバッファ配置マクロ、`writePoint()` を変更した後、またはコードを別の ST7306 モジュールに流用した場合に発生します。無改変の v7.5 を本モジュールで使う限り発生しないはずです。400×300 の論理座標と 300×400 のネイティブフレームバッファの間は `writePoint()` でマッピングしており、解像度マクロの変更では解決できません。

対処：`LCD_W = 400`、`LCD_H = 300` はそのままにし、まず `DIAG_MODE` を有効にして四角を確認し、次に `writePoint()` の `rx`、`ry` とビットプレーンの計算を照合してください。

### ST7306 の色が想定と違う

現象：赤、シアン、または塗りつぶしパターンが想定と合いません。

原因：本モジュールは白・シアン・赤・黒の 4 状態のみで、2 つの色ビットはバイト内で交互配置されています。他の ST7306 モジュールでは色の実装が異なる場合もあります。

対処：まず 4 色横バーのページを実行して 4 つの基本状態を確認し、次に `writePoint()` の色書き込みを確認します。v7.4 以降は `PAGE_CYAN` の塗りつぶしバイトを `0x33` に変更済みです。旧版で実行して間隔のあるストライプが見える場合は、コードをアップグレードするか、この 1 箇所だけを変更してください。

### Arduino IDE が `esp_heap_caps.h` が見つからないと表示する

現象：コンパイル段階でヘッダーファイルの欠落が報告されます。

原因：現在選択しているボードまたは Core が正しくありません。このヘッダーは ESP32 Arduino Core に属するもので、独立したサードパーティライブラリではありません。

対処：インストールされているのが `esp32 by Espressif Systems` であることを確認し、ボードメニューで Arduino Uno や他のアーキテクチャではなく ESP32-S3 を選択してください。Core が破損している場合は、現在のバージョンを記録してから再インストールし、ボードとポートを選び直します。

### ESP32-S3 に書き込んだ後、シリアルログが見えない

現象：画面にはすでにページが表示されているのに、シリアルモニターには何も出ません。

原因：ボーレート、シリアルデバイス、USB CDC の設定が合っていないか、シリアルポートが他のプログラムに占有されている可能性があります。

対処：ボーレートを 115200 に設定し、ポートを占有している他のモニターを閉じます。次に本例のメニュー値と照合してください。`USB CDC On Boot = Enabled`、`USB Mode = Hardware CDC and JTAG`、シリアルデバイスは `/dev/cu.usbmodem1401` のような形式です（Windows では COM ポート）。ボードがネイティブ USB ではなく基板上の USB-シリアル変換チップ経由の場合は、`USB CDC On Boot` を `Disabled` に変更してください。この接続方法では `USB Mode` はほぼ影響がないため、デフォルトのままで構いません。

## FAQ：ESP32-S3 で ST7306 を駆動するときのよくある疑問

**Q：ESP32-S3 の別のピンで ST7306 に接続できますか？**  
A：`.ino` の `PINSET = 1` の分岐にある `LCD_CS`、`LCD_RST`、`LCD_CLK`、`LCD_MOSI`、`LCD_RS` を変更でき、配線も同時に変更します。ある GPIO が使えるかどうかはボードの引き出しと起動時の設定次第で、ボードごとに検証はしていません。例えば N16R8 では GPIO35～37 が Octal PSRAM に占有されているため、PSRAM を有効にする場合は避けてください。ソースの `PINSET = 0` には CS=38、RESET=41、SCLK=39、MOSI=42、RS=40 の別の候補グループもあります。

**Q：ST7306 の SPI クロックは変更できますか？**  
A：サンプルのデフォルトは `SPI_HZ = 20000000`、つまり 20MHz です。通信が不安定なときはまず `10000000` に変更してください。プロジェクト資料には ST7306 v0.1 マニュアルの書き込みクロック最小周期 30ns（約 33.3MHz に相当）と記録されていますが、実際のモジュールでは配線や変換ボードも考慮が必要で、このボードの安定上限は測定していません。

**Q：YDP420H005-V3 に 5V を供給できますか？**  
A：やめてください。モジュールの FPC のピン 5、6 は 3.3V に接続し、ロジックも 3.3V で使用します。2 本の電源ピンは両方接続し、ボードとモジュールは GND 共通にしてください。モジュールの電源が切れている状態で GPIO 信号を入力し続けないでください。

**Q：この ST7306 サンプルは RAM をどれだけ使い、何 FPS 出ますか？**  
A：フレームバッファ全体で 30000 バイトです。加えてフォントデータ、ローカル変数、Arduino Core 自体の実行メモリも使用します。リフレッシュごとに完全な 30000 バイトを送信します。20MHz で SPI ペイロードだけを計算すると理論転送時間は約 12ms ですが、描画とコマンドのオーバーヘッドは含みません。実際の FPS は記録していません。カウンタページに表示されるのは起動以来の全ページの累積平均で、単一ページのフレームレートではありません。描画自体（ピクセルごとに `writePoint()` を呼ぶ）にも時間がかかるため、実際のフレーム時間は 12ms より長くなります。

**Q：同じ ST7306 を使う別の画面にそのまま流用できますか？**  
A：保証できません。本例は YDP420H005-V3 の 21Pin FPC、初期化シーケンス、300×400 のフレームバッファ、現在の 4 表示状態を対象にしています。他のモジュールでは電源、アドレス指定、色、初期化パラメータが異なる可能性があるため、まずその仕様書と照合してください。

**Q：ST7306 の配線は済んだのに表示されません。最初にどこを確認しますか？**  
A：まず電源を切って GND 共通、FPC の向き、必須の 5 本の信号線を確認し、メーカー純正変換ボードの GPIO14 が RS に接続されていることを確認します。通電後に 3.3V を測定し、明るい光の下で観察してください。それでも表示されなければ SPI を 10MHz に下げます。`DIAG_MODE` は方向とマッピングの確認専用で、画面がまったく点かないときにはあまり役立ちません。

**Q：ST7306 の TE と MISO は接続が必要ですか？**  
A：TE はフレーム同期出力で、本例では読み取らないため未接続で構いません。画面への書き込みは MOSI のみを使用し、FPC にも MISO/SDO がないため、本例にはレジスタ読み戻しによる自己診断がありません。旧版サンプルの `lcd_read_reg(0x09)` の読み戻し値は常に `0xFF` で、画面の状態とは無関係です。v7.5 で削除済みですので、詳しくはトラブルシューティングの節をご覧ください。

**Q：ESP-IDF でこの ST7306 の画面を動かせますか？**  
A：プロジェクトディレクトリ（`Handbook/ESP-IDF/420-…`）自体が ESP-IDF のプロジェクトで、開発記録には ESP-IDF v6.0.2 で警告ゼロのビルドを完了し、20 ページのデモと描画関数を含むと明記されています。本文ではこのビルドを再実行しておらず、ESP-IDF のチュートリアルも展開しません。リポジトリの README に沿って読者自身で研究してください。

## 応用アイデア：ST7306 サンプルをさらに改造する

- `draw_text()` の 5×7 フォントデータを自作のドットマトリクスフォントに差し替え、4 色のステータスプレートを作る。
- 既存ページに部分更新の戦略を追加し、リフレッシュ時間と表示效果を実測する。
- TE 信号を接続し、画面更新のタイミング設計を研究して、動くページの変化を観察する。
- Arduino 版と対照しながら ESP-IDF の 20 ページデモを読み、必要な描画関数を自分のアプリに切り出す。

## 参考資料：ESP32-S3、ST7306、Arduino

- [LingShunLAB プロジェクトページ](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek)：本文の配線、コード、ドキュメントの出典。
- [Arduino IDE サンプルソース v7.5](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino)：完全な `.ino`。
- [YDP420H005-V3 モジュール仕様書](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/docs/YDP420H005-V3.pdf)：モジュールのパラメータ、機構図、FPC 定義。
- [Sitronix ST7306 公式製品リスト](https://www.sitronix.com.tw/en/products/industrial-display-driver-ic/ultra-low-power-tft-driver-ic/)：Sitronix の超低消費電力 TFT ドライバー IC の製品ページ。
- [ST7306 コントローラーマニュアル v0.1（モジュールメーカー提供）](https://admin.osptek.com/uploads/ST_7306_V0_1_c30c3541a3.pdf)：インターフェース、レジスタ、フレームバッファ、タイミング。リポジトリの `docs/` にも一部保存されています。
- [Osptek メーカー純正サンプルコード](https://gitee.com/osptek/display-rlcd-4.2inch-300x400/tree/main/examples)：メーカー提供の関連表示サンプル。
- [Espressif ESP32-S3 公式製品ページ](https://www.espressif.com/en/products/socs/esp32-s3)と[公式データシート](https://documentation.espressif.com/esp32-s3_datasheet_en.html)：メインコントローラーチップの資料。
- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)と[公式インストールドキュメント](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)：ボードサポートパッケージとインストール方法。