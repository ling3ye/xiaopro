---
title: "ESP32-S3 + 7.5インチ3色電子ペーパーで騰訊控股(00700)の株価ボード：香港市場クローズで自動省エネ待機（GxEPD2 + SPI）"
boardId: esp32s3
moduleId: display/epd-7inch5-gdey075z08
category: esp32
date: 2026-07-06
intro: "ESP32-S3 + GxEPD2 で 7.5インチ3色電子ペーパー（GDEY075Z08）を駆動し、騰訊財経の API を叩いて騰訊控股(00700)の株価ボードをリアルタイム表示。香港市場の休場時は自動で更新間隔を伸ばして省エネ。配線全体、BOD 欠圧トラブルシューティング、自作中文字ライブラリ、Arduino C++ コード一式を収録。"
image: "https://img.lingflux.com/2026/07/683e33cff80c152435263c8e4e6c546d.jpg"
---

> **一行サマリ**：ESP32-S3 と 7.5インチ3色電子ペーパー（GDEY075Z08）で「市場クローズ時に自動でおやすみ」する騰訊控股の株価ボードを作る。香港市場は赤＝上昇、黒＝下落なので、今日が喜ぶ日か公園で寝る日かが一目でわかる。

難易度：⭐⭐⭐☆☆（ちょっとだけ回路の基礎が必要。Arduino の書き込みができればついてこられます）
予定時間：1～2 時間（電子ペーパーの書き換えをぼーっと待つ格闘時間は含まず）
テスト環境：
Arduino IDE 2.3.8 +
ESP32 Arduino Core 3.3.10 ＋
GxEPD2 v1.6.9 +
Adafruit GFX Library v1.12.6
（ライブラリを入れるときはこのバージョンに合わせるのがおすすめ。新しすぎても古すぎてもハマるもとです）

> 今回のデモでは騰訊財経の無料 API を使っているため、デモ用に騰訊控股の株価を取り上げています。他意はありません。本記事は投資助言を一切提供しません。投資にはリスクがありますので、慎重にご判断ください。

> **TL;DR（すぐ始める）：**
>
> 1. 配線：EPD の SDI→GPIO11、SCL→GPIO12、CS→GPIO10、DC→GPIO9、RES→GPIO8、BUSY→GPIO7、VCC は 3.3V、GND は共通グランドへ
> 2. ライブラリ導入：GxEPD2、Adafruit GFX Library（WiFi、HTTPClient は ESP32 に標準搭載なので別途入れなくて OK）
> 3. コード内の `ssid` と `password` を自分の WiFi に書き換える
> 4. 書き込んで、最初の価格が画面に出たら完成

---

## はじめに

私にはちょっとおバカな習慣があって、毎日暇さえあればスマホを取り出してウォッチリストを眺めては、結局何も変わっていなくて純粋なドーパミンの無駄遣いをしています。で、考えたんです。スマホアプリにドーパミンをいじくり回されるより、「専用ダッシュボード」を一つ作っちゃおうと——そいつがやることは一つだけ。机の上に静かに株価を釘付けにして、ポップアップもプッシュ通知もなし。チラッと見るだけで今日が喜ぶ日か公園で寝る日かがわかる。

このチュートリアルは、ESP32 1枚と 7.5インチ電子ペーパー 1枚で、自動更新される騰訊控股（00700）の株価ボードを作る記録です。ついでに「中文字ライブラリが足りない」「クローズ後にムダに画面を書き換えない」という 2 つの大きな穴にも対処しています。最後まで読めば同じものをコピペで作れますし、気になる銘柄に変えることもできます。

> 今回のデモでは騰訊財経の無料 API を使っているため、デモ用に騰訊控股の株価を取り上げています。他意はありません。本記事は投資助言を一切提供しません。投資にはリスクがありますので、慎重にご判断ください。

## 実験の効果

最終的な仕上がりはこんな感じです。机の上に黒・白・赤の 3 色電子ペーパーが鎮座し、静かに株価、変動率、当日の最高値・最安値、出来高を表示します。香港市場は赤＝上昇、黒＝下落なので、今日の気分が一目でわかります。クローズ・昼休み・週末は自動で「死んだふり」をして更新を減らし、寄り付きが近づくとまた本来のペースに戻ります。真夜中にこっそり画面を書き換えて自分をびっくりさせることもありません。

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/y-SnIM3DxUE?si=Z7g5KeeUtolxDj1T" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

> 今回のデモでは騰訊財経の無料 API を使っているため、デモ用に騰訊控股の株価を取り上げています。他意はありません。本記事は投資助言を一切提供しません。投資にはリスクがありますので、慎重にご判断ください。
>
> 重要なことは 3 回言う！！！

## パーツ説明

**7.5インチ3色電子ペーパー**：「スーパーの電子値札の拡大版」と考えてください。1 回の通電で紙のようなメディアに画像を「定着」させ、その後電源を切っても画像は消えず、次に書き換えるときだけ電力を消費します。3 色版は一般的な白黒版より赤が 1 色多く、これが「上昇」を表すのにぴったりで、株式のユースケースに非常に合っています。本プロジェクトで使う型番は `GDEY075Z08`、解像度 800×480。これを選んだ理由は、解像度が十分大きく 1 画面に価格・変動・4 つのデータを同時に表示でき、ページを行き来しなくて済むからです。

**電子ペーパードライバボード**：市販品とピン配置は同じです。これは自分ではんだ付けしたもので、設計はまだ完璧ではありません。7.5インチ画面では完璧に表示されますが、4.2インチや 1.54インチの電子ペーパーではまだ問題があり、今後最適化していきます。回路図をシェアします：

![](https://img.lingflux.com/2026/07/7466106c7707c8ef928c57a102df38cb.png)

**ESP32 開発ボード**：ネットワークからデータを取得し、更新タイミングを計算し、画面を駆動する、プロジェクト全体の頭脳です。具体的な型番は手元にあるボードで大丈夫です。GPIO さえ足りれば OK です（本記事のピン番号の例は一般的な ESP32-S3 シリーズの開発ボードに適用されます。旧型 ESP32 を使う場合は、ボードで実際に使えるピン番号に置き換えてください）。

## BOM 表

| 部品 | 型番／仕様 | 数量 |
| --- | --- | --- |
| ESP32 開発ボード | ESP32-S3 または SPI ピンを持つ他の ESP32 シリーズ | 1 |
| 電子ペーパードライバボード | 自作ですが、ピンは市販の大多数の電子ペーパードライバと同じです。 | 1 |
| 7.5インチ電子ペーパー | GDEY075Z08、7.5インチ、800×480、黒／白／赤の 3 色 | 1 |
| ジャンパワイヤ | オス‑メス | 適量 |

## 7.5インチ電子ペーパードライバボードのピン説明

自分で回路図を引き、PCB を発注し、はんだ付けしました。使っているピンは市販の大多数の電子ペーパードライバボードと同じです。

| ピン | 正式名称 | 役割 |
| --- | --- | --- |
| **VCC** | 電源プラス (Voltage Common Collector) | 電源入力ピン。ESP32-S3 の **3V3**（3.3V）出力に接続します。 |
| **GND** | 電源グランド (Ground) | 電源の基準グラウンド。ESP32-S3 の **GND** に接続して電流ループを形成します。 |
| **SDI/MOSI** | マスター出力スレーブ入力 | SPI データ線。ESP32 から画面へデータを送ります。 |
| **SCL/SCK** | シリアルクロック | SPI クロック線。データ転送のタイミングを制御します。 |
| **CS** | チップセレクト | 画面に「次のデータは君宛てだよ」と伝えます。 |
| **DC** | データ／コマンド切替 | 現在送っているのが画像データか制御コマンドかを区別します。 |
| **RES/RST** | リセット | 一瞬 LOW に引いて画面を再初期化します。 |
| **BUSY** | ビジー状態表示 | 画面の書き換え中は LOW になります。ESP32 はこれで「次のコマンドを送っていいか」を判断します。 |

## 配線方式

| 電子ペーパーピン | 接続先 ESP32 ピン |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

配線が終わったら、電源を入れる前に全体をもう一度見直すのがおすすめです。特に BUSY 線の接続間違いやハンダ不良に気をつければ、トラブルシューティング時間の 80% は削れます——コード内にわざわざ起動時診断を入れたのはこのハマりどころを防ぐためで、後述のコード説明で触れます。

## 電源の安定性：ESP32 の欠圧リセット（BOD エラー）を解決する

今回は自作の開発ボードを使ったため、電源周りが十分に詰め切れていなかったせいもあって、テスト中に `E BOD: Brownout detector was triggered` というエラーに遭遇しました。これは **ESP32 のブラウンアウト検出器がトリガされた** ことを意味します——ボードが電圧低下を検出すると、自己保護のために自動再起動します。

### なぜ BOD がトリガされるのか

ESP32 が Wi-Fi を起動するとき、無線モジュールが瞬間的に**数百ミリアンペアの突発的大電流**を要求します。給電線が細すぎたり、ジャンパワイヤの接触抵抗が大きかったり、USB 給電能力が不足したりすると、瞬間的に電圧が下がり、ESP32 が自動再起動してしまいます。電子ペーパーの書き換え時も同じく電力を食う大口なので、Wi-Fi と電力を奪い合うと、さらに電圧を引き下げやすくなります。

回路に**電解コンデンサ**（エネルギー貯蔵）と**セラミックコンデンサ**（フィルタ）を並列に入れるのが、この問題に対する標準的な解決策です。私は次のコンビネーションを使ってからテストがずっと安定し、二度と BOD に遭遇することはありませんでした。

### 1. コンデンサ選定のおすすめ

2 つのコンデンサを並列に使うのがベストです。

* **電解コンデンサ（大貯水池）：** `470μF` または `1000μF`（耐圧は `6.3V`、`10V`、`16V` のいずれでも OK）。Wi-Fi 起動時の瞬間大電流に対応します。
* **積層／セラミックコンデンサ（小さなフィルタ）：** `0.1μF`（表記 `104`）。高周波ノイズを除去します。

### 2. 具体的な接続場所

**最も重要な原則：コンデンサは ESP32 開発ボードのピンにできるだけ近づけること。** ジャンパワイヤで接続する場合は、ブレッドボードに直接挿すか、ESP32 に近い電源線にはんだ付け／撚り付けします。

#### 配線記号図

```text
    [ 外部電源 / USB ]
          │   │
          ▼   ▼
       ┌─────────┐
       │  5V/3V3 │──────┬───────────────┬──────► [ ESP32 の VCC/3V3 ピン ]
       │         │      │               │
       │         │    + │ 極性           │
       │         │   ┌──┴──┐         ┌──┴──┐
       │         │   │     │         │     │
       │         │   │470uF│         │0.1uF│
       │         │   │     │         │     │
       │         │   └──┬──┘         └──┬──┘
       │         │      │ - 負極         │
       │   GND   │──────┴───────────────┴──────► [ ESP32 の GND ピン ]
       └─────────┘
```

#### ピン対応の接続関係

* **電解コンデンサのプラス（+、長い足）** ───►  ESP32 の **`3V3`** に接続（または `5V/VIN`、どのピンからボードに給電するかによります）
* **電解コンデンサのマイナス（-、短い足、外装にグレーの帯がある側）** ───► ESP32 の **`GND`** に接続
* **0.1μF セラミックコンデンサ（極性なし）** ───► 同じく **`3V3`** と **`GND`** の間に並列に入れます。

> ⚠️ 電解コンデンサには極性があります。逆接すると発熱したり最悪の場合破裂します。配線前に「長い足がプラス、グレーの帯側がマイナス」を必ず確認してください。

### 3. 追加のトラブルシューティング（コンデンサを入れても再起動する場合）

1. **質の良い USB ケーブルに替える：** 安価なジャンパワイヤや細い USB ケーブルは内部抵抗が非常に大きいことが多く、少し太めのスマホ充電用ケーブルに替えるだけで劇的に改善することがあります。
2. **給電口を変える：** パソコン前面の USB ポートは給電が弱いので使わず、背面のマザーボード USB ポートを使うか、5V/2A のスマホ充電アダプタで直接給電するのが良いです。
3. **コードでピークを避ける：** コード上で、電子ペーパーの書き換え（これも電力の大口）と `WiFi.begin()` が同時に起こらないようにします。まず Wi-Fi を繋いでデータを取り、Wi-Fi を切るかスリープさせてから電子ペーパーを書き換えるのが良いです。本記事のコードではさらに `WiFi.setTxPower(WIFI_POWER_17dBm)` で送信電力を下げ、ソフト面での二重の保険にしています。

## インストールが必要なライブラリ

Arduino IDE のライブラリマネージャで検索してインストールします：

- `GxEPD2`（作者 ZinggJM）—— テスト済みバージョン v1.6.9
- `Adafruit GFX Library` —— テスト済みバージョン v1.12.6

`WiFi.h` と `HTTPClient.h` は ESP32 Arduino Core に標準搭載されているので別途インストール不要ですが、ボードマネージャの ESP32 コアは 3.0.x シリーズであることを確認してください。古すぎるコアは API が足りないことがあります。

## 完全なコード＋解説

```cpp
// ============================================================
//  ESP32 + 电子墨水屏「腾讯控股」股票看板
//  - 每隔几分钟抓一次腾讯财经接口，把股价刷到 7.5 寸三色墨水屏上
//  - 港股收盘 / 周末会自动拉长等待，到下一个交易日再恢复刷新
//  - 演示版：用 delay() 等待、WiFi 常驻，不使用深度睡眠（适合 USB 供电）
// ============================================================
#include <GxEPD2_3C.h>
#include <Adafruit_GFX.h>
#include <SPI.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ==================== 配置区域 ====================
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// 腾讯财经接口（这里以腾讯控股 hk00700 为例，换股票改这个地址即可）
const String api_url = "http://qt.gtimg.cn/q=hk00700";
// ==================================================

// 1. 墨水屏与 ESP32 的接线引脚（按你的实际接线改这里的数字）
#define EPD_MOSI 11  // SDI / MOSI
#define EPD_CLK  12  // SCL / SCK
#define EPD_CS   10  // CS
#define EPD_DC   9   // DC
#define EPD_RST  8   // RES / RESET
#define EPD_BUSY 7   // BUSY

// 2. 构造驱动实例 (GDEY075Z08 800x480)
GxEPD2_3C<GxEPD2_750c_GDEY075Z08, GxEPD2_750c_GDEY075Z08::HEIGHT / 2> display(GxEPD2_750c_GDEY075Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// 股票数据结构体
struct StockData {
  String name;       // 股票名称
  String code;       // 股票代码
  String price;      // 当前价格
  String change;     // 涨跌额
  String changePct;  // 涨跌幅 (%)
  String high;       // 今日最高
  String low;        // 今日最低
  String volume;     // 成交额 (亿)
  String yestClose;  // 昨收
  String time;       // 更新时间
  bool isUp;         // 是否上涨
};

StockData stock;

float  lastPriceF    = -1.0f;
String lastStockTime = "";

// ==================== 本地中文字库（自动生成，无需修改） ====================
struct ZhGlyph { uint16_t cp; const uint8_t* bmp; };

const uint8_t ZH24_W = 24;
const uint8_t ZH24_H = 24;
const uint8_t zh24_817E[72] PROGMEM = {0,0,0,0,192,0,248,201,24,248,217,12,152,217,4,152,253,31,152,65,0,152,65,0,248,255,63,152,49,6,152,17,12,152,249,63,152,15,50,248,7,34,136,49,2,136,17,3,140,241,31,140,1,24,140,254,27,230,0,24,100,0,30,0,0,14,0,0,0,0,0,0};
const uint8_t zh24_8BAF[72] PROGMEM = {0,0,0,16,0,0,24,255,7,56,255,7,48,24,6,0,24,6,0,24,6,62,24,6,62,24,6,48,24,6,48,255,6,48,255,6,48,24,6,48,24,6,48,24,6,48,24,6,176,24,6,240,25,108,240,24,108,120,24,124,56,24,56,16,24,0,0,0,0,0,0,0};
const uint8_t zh24_63A7[72] PROGMEM = {0,0,0,112,192,0,48,192,1,32,254,63,32,254,63,252,7,48,252,103,54,32,48,2,32,48,6,32,24,62,224,13,62,224,1,0,120,0,0,60,252,31,44,252,31,32,128,0,32,128,0,32,128,0,32,128,0,48,255,127,60,255,127,56,0,0,24,0,0,0,0,0};
const uint8_t zh24_80A1[72] PROGMEM = {0,0,0,248,227,15,248,227,15,24,99,12,24,99,12,24,35,12,248,51,12,248,59,124,24,3,0,24,3,0,24,251,31,24,251,31,248,51,12,248,35,12,24,99,4,12,99,6,12,195,3,12,131,3,12,195,7,206,115,126,198,61,56,4,8,32,0,0,0,0,0,0};
const ZhGlyph ZH_GLYPHS_24[] PROGMEM = {
  {0x817E, zh24_817E}, {0x8BAF, zh24_8BAF}, {0x63A7, zh24_63A7}, {0x80A1, zh24_80A1},
};
const uint8_t ZH24_COUNT = 4;

const uint8_t ZH16_W = 16;
const uint8_t ZH16_H = 16;
const uint8_t zh16_4ECA[32] PROGMEM = {128,1,128,1,64,2,96,6,48,28,152,121,142,97,0,0,248,31,0,12,0,12,0,6,0,7,0,3,0,1,0,0};
const uint8_t zh16_65E5[32] PROGMEM = {0,0,248,31,24,24,24,24,24,24,24,24,24,24,248,31,24,24,24,24,24,24,24,24,248,31,24,24,0,0,0,0};
const uint8_t zh16_6700[32] PROGMEM = {0,0,248,31,24,16,248,31,248,31,0,0,254,127,136,0,248,63,136,50,248,18,136,28,252,12,132,126,128,35,0,0};
const uint8_t zh16_9AD8[32] PROGMEM = {128,1,128,1,254,127,0,0,240,15,16,8,240,15,0,0,252,63,4,32,228,39,36,36,228,39,4,48,4,24,0,0};
const uint8_t zh16_4F4E[32] PROGMEM = {16,0,24,60,200,15,200,4,204,4,204,4,206,127,202,12,200,8,200,11,200,9,72,16,8,112,232,111,8,0,0,0};
const uint8_t zh16_6628[32] PROGMEM = {0,2,0,3,62,1,38,127,166,3,230,2,126,2,38,62,38,2,38,2,62,62,6,2,0,2,0,2,0,2,0,0};
const uint8_t zh16_6536[32] PROGMEM = {0,0,32,2,32,2,36,3,36,127,36,17,164,17,164,16,164,19,36,26,60,10,62,14,32,14,32,59,160,113,32,0};
const uint8_t zh16_76D8[32] PROGMEM = {0,0,192,0,240,31,16,24,144,25,16,25,254,127,16,24,152,25,8,12,248,31,72,18,72,18,72,18,254,127,0,0};
const uint8_t zh16_6210[32] PROGMEM = {0,0,0,3,0,27,0,3,252,63,12,2,12,18,252,18,204,26,76,14,76,12,68,12,36,14,6,91,128,112,0,0};
const uint8_t zh16_4EA4[32] PROGMEM = {128,1,128,1,0,0,252,127,32,4,112,28,24,48,12,36,100,6,64,6,192,3,128,1,224,7,60,124,12,48,0,0};
const uint8_t zh16_91D1[32] PROGMEM = {0,0,128,0,192,1,96,2,48,12,24,56,246,111,128,1,128,1,252,31,128,1,144,9,144,9,128,5,252,63,0,0};
const uint8_t zh16_989D[32] PROGMEM = {16,0,16,127,254,8,138,12,8,63,124,35,38,43,48,43,204,43,126,43,68,8,68,28,124,54,68,99,0,1,0,0};
const uint8_t zh16_4EBF[32] PROGMEM = {48,0,48,0,208,63,24,24,8,12,12,4,14,6,10,2,8,3,136,1,136,0,200,64,200,96,136,127,8,0,0,0};
const ZhGlyph ZH_GLYPHS_16[] PROGMEM = {
  {0x4ECA, zh16_4ECA}, {0x65E5, zh16_65E5}, {0x6700, zh16_6700}, {0x9AD8, zh16_9AD8},
  {0x4F4E, zh16_4F4E}, {0x6628, zh16_6628}, {0x6536, zh16_6536}, {0x76D8, zh16_76D8},
  {0x6210, zh16_6210}, {0x4EA4, zh16_4EA4}, {0x91D1, zh16_91D1}, {0x989D, zh16_989D},
  {0x4EBF, zh16_4EBF},
};
const uint8_t ZH16_COUNT = 13;

void drawZh(int16_t x, int16_t y, const String &text, uint16_t color, uint8_t size = 24) {
  const ZhGlyph* table; uint8_t count, cw, ch;
  if (size == 16) { table = ZH_GLYPHS_16; count = ZH16_COUNT; cw = ZH16_W; ch = ZH16_H; }
  else            { table = ZH_GLYPHS_24; count = ZH24_COUNT; cw = ZH24_W; ch = ZH24_H; }
  int16_t cx = x;
  int i = 0;
  int n = text.length();
  while (i < n) {
    uint16_t cp = 0;
    int adv = 1;
    uint8_t c = (uint8_t)text[i];
    if (c < 0x80) { cp = c; adv = 1; }
    else if ((c & 0xE0) == 0xC0 && i + 1 < n) { cp = ((c & 0x1F) << 6) | ((uint8_t)text[i + 1] & 0x3F); adv = 2; }
    else if ((c & 0xF0) == 0xE0 && i + 2 < n) { cp = ((c & 0x0F) << 12) | (((uint8_t)text[i + 1] & 0x3F) << 6) | ((uint8_t)text[i + 2] & 0x3F); adv = 3; }
    const uint8_t* bmp = nullptr;
    for (int k = 0; k < count; k++) {
      if (table[k].cp == cp) { bmp = table[k].bmp; break; }
    }
    if (bmp) display.drawXBitmap(cx, y, bmp, cw, ch, color);
    cx += cw;
    i += adv;
  }
}

long daysFromCivil(int y, int m, int d) {
  y -= m <= 2;
  const long era = (y >= 0 ? y : y - 399) / 400;
  const long yoe = y - era * 400;
  const long doy = (153L * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const long doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097L + doe - 719468L;
}

int weekdayOfEpochDay(long day) {
  return (int)(((day % 7) + 7 + 4) % 7);
}

void parseStockTime(const String &t, int &y, int &mo, int &d, int &h, int &mi, int &s) {
  y  = t.substring(0, 4).toInt();
  mo = t.substring(5, 7).toInt();
  d  = t.substring(8, 10).toInt();
  h  = t.substring(11, 13).toInt();
  mi = t.substring(14, 16).toInt();
  s  = t.substring(17, 19).toInt();
}

unsigned long computeSleepSeconds(int y, int mo, int d, int h, int mi, int s) {
  const long OPEN_AM = 570, CLOSE_AM = 720;
  const long OPEN_PM = 780, CLOSE_PM = 960;
  long today = daysFromCivil(y, mo, d);
  long mod   = h * 60L + mi;
  long nowEp = today * 1440L + mod;
  long wakeEp = -1;

  int wd = weekdayOfEpochDay(today);
  bool isWeekday = (wd >= 1 && wd <= 5);
  if (isWeekday) {
    if      (mod <  OPEN_AM)  wakeEp = today * 1440L + OPEN_AM;
    else if (mod <  CLOSE_AM) wakeEp = ((nowEp / 10) + 1) * 10;
    else if (mod <  OPEN_PM)  wakeEp = today * 1440L + OPEN_PM;
    else if (mod <  CLOSE_PM) wakeEp = ((nowEp / 10) + 1) * 10;
  }
  if (wakeEp < 0) {
    for (int k = 1; k <= 7; k++) {
      long day = today + k;
      if (weekdayOfEpochDay(day) >= 1 && weekdayOfEpochDay(day) <= 5) {
        wakeEp = day * 1440L + OPEN_AM;
        break;
      }
    }
  }
  if (wakeEp < 0) wakeEp = nowEp + 600;

  long sleepSec = (wakeEp - nowEp) * 60L - s;
  if (sleepSec < 60)   sleepSec = 60;
  if (sleepSec > 3600) sleepSec = 3600;
  return (unsigned long)sleepSec;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // 第一步：诊断 BUSY 引脚。GDEY075Z08 空闲时 BUSY=高(1)，忙时=低(0)。
  //         若读到 0，通常是接错脚/虚焊/短路到地，或面板供电不足卡在忙状态，
  //         这正是刷新总卡满 30s 超时的根因。
  pinMode(EPD_BUSY, INPUT_PULLUP);
  delay(1);
  Serial.printf("[BUSY diag] GPIO%d idle=%d (期望 1)\n", EPD_BUSY, digitalRead(EPD_BUSY));

  SPI.begin(EPD_CLK, -1, EPD_MOSI, -1);

  // 第二步：画开机页
  Serial.println(">>> Boot: drawing boot screen...");
  display.init(115200);
  display.setRotation(0);
  drawBootPage("Connecting Network...");
  display.powerOff();
  delay(1000);

  // 第三步：连接 WiFi（常驻，不再每轮重连）
  Serial.println(">>> Connecting WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_17dBm); // 降低发射功率，缓解连网瞬间的电流尖峰导致的欠压重启
  WiFi.begin(ssid, password);
  int timeout_count = 0;
  while (WiFi.status() != WL_CONNECTED && timeout_count < 30) {
    delay(500);
    Serial.print(".");
    timeout_count++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
  } else {
    Serial.println("\nWiFi Failed, will keep retrying in loop.");
  }
  delay(2000);
}

void fetchAndDraw() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(">>> WiFi dropped, reconnecting...");
    WiFi.reconnect();
    delay(3000);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(">>> Fetching stock data...");
    fetchStockData();
  } else {
    stock.name = "腾讯控股"; stock.code = "00700"; stock.price = "431.20";
    stock.change = "+1.00"; stock.changePct = "+0.23%"; stock.high = "445.80";
    stock.low = "431.20"; stock.volume = "108.97"; stock.yestClose = "430.20";
    stock.time = "2026/07/03 16:08:18"; stock.isUp = true;
  }

  float priceF = stock.price.toFloat();
  if (priceF != lastPriceF) {
    display.init(115200);
    display.setRotation(0);
    drawStockDashboard();
    display.powerOff();
    lastPriceF = priceF;
    Serial.println(">>> Screen refreshed.");
  } else {
    Serial.println(">>> Price unchanged, skip redraw.");
  }
}

void loop() {
  fetchAndDraw();

  unsigned long waitSec;
  if (stock.time == lastStockTime) {
    waitSec = 3600;
    Serial.println(">>> Timestamp frozen (market closed), wait 1h.");
  } else {
    int y, mo, d, h, mi, s;
    parseStockTime(stock.time, y, mo, d, h, mi, s);
    waitSec = computeSleepSeconds(y, mo, d, h, mi, s);
    Serial.printf(">>> Next refresh in %lu s (now %04d/%02d/%02d %02d:%02d:%02d)\n",
                  waitSec, y, mo, d, h, mi, s);
  }
  lastStockTime = stock.time;

  delay(waitSec * 1000UL);
}

void drawBootPage(const char* statusText) {
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    const char* title = "STOCK MONITOR";
    int titleW = strlen(title) * 18;
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(3);
    display.setCursor((800 - titleW) / 2, 200);
    display.print(title);
    display.fillRect((800 - titleW) / 2, 244, titleW, 2, GxEPD_RED);
    display.setTextColor(GxEPD_RED);
    display.setTextSize(2);
    int sw = strlen(statusText) * 12;
    display.setCursor((800 - sw) / 2, 276);
    display.print(statusText);
  } while (display.nextPage());
}

void drawStockDashboard() {
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    uint16_t themeColor = stock.isUp ? GxEPD_RED : GxEPD_BLACK;

    display.fillRect(48, 48, 6, 40, GxEPD_RED);
    drawZh(64, 56, stock.name, GxEPD_BLACK);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(2);
    display.setCursor(172, 60);
    display.print("(" + stock.code + ")");
    String tm = stock.time.substring(5, 16);
    display.setCursor(752 - (int)(tm.length() * 12), 60);
    display.print(tm);

    display.drawFastHLine(48, 104, 704, GxEPD_BLACK);

    display.setTextColor(themeColor);
    display.setTextSize(8);
    display.setCursor(48, 130);
    display.print(stock.price);

    if (stock.isUp) {
      display.fillTriangle(58, 222, 48, 240, 68, 240, themeColor);
    } else {
      display.fillTriangle(48, 222, 68, 222, 58, 240, themeColor);
    }
    display.setTextColor(themeColor);
    display.setTextSize(4);
    display.setCursor(78, 222);
    display.print(stock.changePct);

    float chgMag = stock.change.toFloat();
    if (chgMag < 0) chgMag = -chgMag;
    String changeStr = String(stock.isUp ? "+" : "-") + String(chgMag, 2);
    display.setTextSize(2);
    display.setCursor(234, 230);
    display.print(changeStr);

    display.drawFastHLine(48, 296, 704, GxEPD_BLACK);
    display.drawFastVLine(224, 308, 76, GxEPD_BLACK);
    display.drawFastVLine(400, 308, 76, GxEPD_BLACK);
    display.drawFastVLine(576, 308, 76, GxEPD_BLACK);

    drawZh(48,  318, "今日最高", GxEPD_BLACK, 16);
    drawZh(236, 318, "今日最低", GxEPD_BLACK, 16);
    drawZh(412, 318, "昨日收盘", GxEPD_BLACK, 16);
    drawZh(588, 318, "成交金额", GxEPD_BLACK, 16);

    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(3);
    display.setCursor(48,  354); display.print(stock.high);
    display.setCursor(236, 354); display.print(stock.low);
    display.setCursor(412, 354); display.print(stock.yestClose);
    display.setCursor(588, 354); display.print(stock.volume);
    drawZh(588 + stock.volume.length() * 18 + 4, 362, "亿", GxEPD_BLACK, 16);

    display.drawFastHLine(48, 432, 704, GxEPD_BLACK);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(1);
    display.setCursor(48, 446);
    display.print("TENCENT HOLDINGS");
    String dateStr = stock.time.substring(0, 10);
    display.setCursor(752 - (int)(dateStr.length() * 6), 446);
    display.print(dateStr);

  } while (display.nextPage());
}

void fetchStockData() {
  HTTPClient http;
  http.begin(api_url);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Raw Data received.");

    int tokens[40];
    int tokenCount = 0;

    int pos = 0;
    while ((pos = payload.indexOf('~', pos)) != -1 && tokenCount < 40) {
      tokens[tokenCount++] = pos;
      pos++;
    }

    if (tokenCount > 35) {
      auto getField = [&](int index) {
        return payload.substring(tokens[index-1] + 1, tokens[index]);
      };

      stock.name      = "腾讯控股";
      stock.code      = getField(2);
      stock.price     = getField(3);
      stock.yestClose = getField(4);
      stock.high      = getField(33);
      stock.low       = getField(34);
      stock.time      = getField(30);
      stock.change    = getField(31);
      stock.changePct = getField(32);

      stock.price = String(stock.price.toFloat(), 2);
      stock.high = String(stock.high.toFloat(), 2);
      stock.low = String(stock.low.toFloat(), 2);
      stock.yestClose = String(stock.yestClose.toFloat(), 2);

      double volBytes = getField(37).toFloat();
      stock.volume = String((volBytes / 100000000.0), 2);

      float chg = stock.change.toFloat();
      if (chg >= 0) {
        stock.isUp = true;
        stock.changePct = "+" + String(stock.changePct.toFloat(), 2) + "%";
      } else {
        stock.isUp = false;
        stock.changePct = String(stock.changePct.toFloat(), 2) + "%";
      }
    }
  } else {
    Serial.printf("HTTP GET Failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
```

### コードの説明

**第一歩、フォントは「手作り」：** 一般的な中文字ライブラリファイルは数十〜数百 KB にもなり、「腾讯控股」の 4 文字が揃うとも限りません。そこで、プロジェクトで本当に使う十数文字だけをあらかじめ点字データにしてコードに埋め込みました。サイズが小さく、文字欠けして四角になることもまずありません。

**第二歩、取引時間は自力で計算する、表ではない：** `computeSleepSeconds` は Howard Hinnant のグレゴリオ暦→日数変換アルゴリズムで今日の曜日を計算し、香港市場の寄り付き／昼休み／引け時間と組み合わせて「次に起きて書き換えるまで何秒寝るべきか」を決めます。取引時間中は 10 分ごとに更新、引けた後は翌取引日の寄り付き時刻までスキップするので、真夜中に空転することはありません。

**第三歩、価格が変わらなければ再描画しない：** 電子ペーパーは 1 回の書き換えに数秒かかり、その間にちらつきも出ます。そのためコード内で `lastPriceF` に前回描画した価格を記憶し、変わらなければスキップします。本当に変わったときだけ書き換えるので、更新回数を大幅に減らせます。

**第四歩、BUSY ピン診断：** 起動直後に BUSY ピンのレベルを確認します。期待される HIGH になっていなければ、確率高めで配線か給電に問題があるので、最後までトラブルシューティングしてから配線ミスに気づくような事態を防げます。

## シンプルな Hello World プログラム

テストしやすいように、ごく最小限のテストコードを載せておきます。前のコードはネットワーク処理が混ざっていて複雑なので、理解のじゃまになります。

```c
#include <GxEPD2_3C.h>
#include <Adafruit_GFX.h>
#include <SPI.h>

// 1. 電子ペーパーのピンを定義
#define EPD_MOSI 11  // SDI / MOSI
#define EPD_CLK  12  // SCL / SCK
#define EPD_CS   10  // CS
#define EPD_DC   9   // DC
#define EPD_RST  8   // RES / RESET
#define EPD_BUSY 7   // BUSY

// 2. ドライバのインスタンスを生成（いろいろなドライバ型番を手早く試すため）
// テスト時は毎回1つだけコメント解除し、残りは // でコメントアウトすること

// オプション A: GDEW075Z08（800x480、ドライバIC GD7965）
// GxEPD2_3C<GxEPD2_750c_Z08, GxEPD2_750c_Z08::HEIGHT> display(GxEPD2_750c_Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// オプション B: GDEW075Z09（640x384、ドライバIC UC8179 / IL0371）
// GxEPD2_3C<GxEPD2_750c, GxEPD2_750c::HEIGHT> display(GxEPD2_750c(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// オプション C: GDEH075Z90（880x528、ドライバIC SSD1677）— メモリ消費が大きいので HEIGHT / 2 のページングを使用
// GxEPD2_3C<GxEPD2_750c_Z90, GxEPD2_750c_Z90::HEIGHT / 2> display(GxEPD2_750c_Z90(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// オプション D: GDEW075Z08（800x480、UC8179 を採用する別バージョン）
// GxEPD2_3C<GxEPD2_750c_GDEW075Z08, GxEPD2_750c_GDEW075Z08::HEIGHT / 2> display(GxEPD2_750c_GDEW075Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// オプション E: GDEY075Z08（800x480、ドライバIC UC8179）
GxEPD2_3C<GxEPD2_750c_GDEY075Z08, GxEPD2_750c_GDEY075Z08::HEIGHT / 2> display(GxEPD2_750c_GDEY075Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));


void setup() {
  Serial.begin(115200);
  delay(1000);

  // 3. 【重要】デフォルト以外の SPI ピンを使うため、まず手動で ESP32-S3 の SPI バスを初期化する必要がある
  // 引数の順序: SCK, MISO（-1 はなしを意味する）, MOSI, SS（-1 は当面未指定）
  SPI.begin(EPD_CLK, -1, EPD_MOSI, -1);

  // 4. ディスプレイを初期化
  Serial.println("Initializing e-Paper...");
  display.init(115200);
  display.setRotation(0); // 0 は標準の横向き

  // 5. シンプルなページの描画を開始
  Serial.println("Rendering test page...");
  drawSimplePage();

  // 6. リフレッシュ完了後、画面を保護して完全に通電を切るためディープスリープにする
  display.powerOff();
  Serial.println("Done! Screen is now in deep sleep.");
}

void loop() {
  // 空のループのままにし、電子ペーパーを傷める繰り返しリフレッシュを避ける
  delay(1000);
}

// 最小限の描画関数
void drawSimplePage() {
  display.firstPage();
  do {
    // 画面クリア（全面白）
    display.fillScreen(GxEPD_WHITE);

    // 1. 上部の赤い帯
    display.fillRect(0, 0, display.width(), 50, GxEPD_RED);
    display.setTextColor(GxEPD_WHITE);
    display.setTextSize(3);
    display.setCursor(30, 15);
    display.print("ESP32-S3 TEST");

    // 2. 中央の大きな黒字
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(5);
    display.setCursor(50, 180);
    display.print("Hello World!");

    // 3. 下部の赤い注意書き
    display.setTextColor(GxEPD_RED);
    display.setTextSize(2);
    display.setCursor(50, 300);
    display.print("7.5 inch E-Paper Display Works!");

  } while (display.nextPage());
}
```

## よくあるトラブルシューティング

あわてないでください。問題の 80% はこのあたりにあります：

- **シリアルに `E BOD: Brownout detector was triggered` が出て繰り返し再起動する：** ESP32 の欠圧保護がトリガされたので、十中八九 Wi-Fi 起動の瞬間に電圧が下がったせいです。対策は前述の「電源の安定性」節を参照——`3V3` と `GND` の間に 470μF／1000μF の電解コンデンサと 0.1μF のセラミックコンデンサを並列に入れ、少し太めの USB ケーブルに替えてみてください。
- **画面がずっと真っ白で反応しない：** まず BUSY 線の接続を確認します。シリアルモニタの `[BUSY diag]` の表示は 1 であるべきです。0 の場合は配線と給電を確認してください。多くの場合ジャンパワイヤが緩んでいるだけです。
- **毎回の書き換えが 30 秒でタイムアウトするまで引っかかる：** ほぼ確実に BUSY ピンの接続間違いか、画面への給電不足です（USB 給電の電流不足でもこれが出ます。もっと太いデータケーブルに替えてみてください）。
- **中国語が四角になったり文字が欠ける：** その文字がローカルフォントに収録されていないということです。「コードの説明」で触れた箇所に戻り、新しい漢字に対応する点字データを追加してください。
- **WiFi がどうしても繋がらない：** `ssid` と `password` の入力ミスを確認してください。またルーターが 2.4GHz 帯であることも確認を。ESP32 は大部分が 5GHz 非対応です。
- **株価がずっと一つの数字のまま更新されない：** これは正常な動作です——タイムスタンプが変わっていない場合、コードは「引けた」と判断して自動的に 1 時間おきにしか起きなくなります。取引時間になれば自然と通常の更新ペースに戻ります。
- **コンパイルエラーで `GxEPD2_750c_GDEY075Z08` が見つからない：** GxEPD2 ライブラリのバージョンが古すぎないか確認してください。この画面型番は後にライブラリのサポートリストに追加されたもので、新しいバージョンにアップデートすれば解決します。

## FAQ Q&A

**Q：ESP32 のピンは自由に変えられますか？**
A：はい、SPI に対応する通常の GPIO なら何でも大丈夫です。コード先頭の `EPD_MOSI` / `EPD_CLK` / `EPD_CS` / `EPD_DC` / `EPD_RST` / `EPD_BUSY` の各マクロを実際に接続したピン番号に書き換えるだけで、他は変更不要です。

**Q：更新頻度をもっと速く、たとえば 1 分ごとにできますか？**
A：できます。`computeSleepSeconds` の 10 分を希望の分数に書き換えるだけです。ただし電子ペーパーの書き換え回数には寿命があるので、頻繁にしすぎるとかえって割に合いません。

**Q：電池駆動でも大丈夫ですか？**
A：現在のコードは「WiFi 常駐 ＋ delay 待ち」のデモ書き方で、WiFi をずっと通電しているため消費電力が高く、USB 給電のほうが向いています。電池で使う場合はディープスリープモードに変更し、毎回起きてデータを取ったら WiFi を切ってまた寝るようにするのがおすすめです。

**Q：このプロジェクトはどれくらいメモリを消費しますか？ESP32 で動かせますか？**
A：フォントとコード自体はとても小さいです。主な負担は GxEPD2 のディスプレイバッファで、7.5インチ 3 色画面の場合は Flash や RAM に比較的余裕のある ESP32 型番を選ぶのが無難です。普通の ESP32-S3 開発ボードなら完全に足ります。

**Q：他の銘柄、たとえば A 株や米国株に変えられますか？**
A：できます。`api_url` を対応する銘柄の騰訊財経 API アドレスに替えるだけですが、A 株／米国株の寄り付き／引け時間は香港株とは違うため、`computeSleepSeconds` 内の寄り付き／引け時刻をそれぞれ調整する必要があります。また、他の中国語文字を使う場合は、四角にならないようにフォントを自作する必要があります。

**Q：画面を別のサイズ、たとえばもっと小さい 4.2 インチに変えられますか？**
A：できます。GxEPD2 ライブラリが対応する型番に替え、同時に画面座標（800 や 480 といった数字）を新しい画面の解像度に合わせて再調整してください。そうしないとレイアウトが崩れます。

## 応用アイデア

- 複数銘柄をローテーション表示し、定期的にダッシュボードを切り替える
- 簡易的な Wi-Fi 設定 Web ページを追加し、コード内の WiFi パスワードを毎回書き換えずに済むようにする
- CDS セル（光依存性抵抗）を追加し、昼間は通常更新、夜間は自動で更新頻度を下げて省電力化
- ディープスリップ＋電池駆動に変更し、本当にとっておけるワイヤレス小物を卓上に作る

## 参考資料

- [GxEPD2 GitHub リポジトリ](https://github.com/ZinggJM/GxEPD2)
- [Adafruit GFX Library GitHub リポジトリ](https://github.com/adafruit/Adafruit-GFX-Library)
- [Espressif ESP32 公式ドキュメント](https://www.espressif.com/en/products/socs/esp32)
