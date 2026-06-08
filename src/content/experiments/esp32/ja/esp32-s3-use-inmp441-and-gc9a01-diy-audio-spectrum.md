---
title: "ESP32-S3 + INMP441 + GC9A01 DIY 円形オーディオスペクトラムアナライザー｜I2S + FFT + SPI 完全チュートリアル"
boardId: esp32s3
moduleId: audio/inmp441
category: esp32
date: 2026-06-08
intro: "ESP32-S3 で INMP441 デジタルマイクの I2S オーディオを読み取り、512点 FFT 解析後に GC9A01 円形 TFT ディスプレイにリアルタイムで16バンドのレインボースペクトラムバーを描画します。完全な配線図、ライブラリ導入、コードコメント付き。"
image: "https://img.lingflux.com/2026/06/7747ada90e61ba2360585e6934fbf7a7.jpg"
---

> **一言でいうと**：ESP32-S3 + INMP441 マイク + GC9A01 円形ディスプレイで、「踊る」円形オーディオスペクトラムアナライザーを作ります。I2S + FFT + SPI の全工程チュートリアル。

# ESP32-S3 + INMP441 + GC9A01 で「踊る」円形オーディオスペクトラムアナライザーを作る完全チュートリアル（I2S + FFT + SPI）

難易度：⭐⭐⭐☆☆（Arduino の基礎があれば大丈夫）
所要時間：45 分
テスト環境：
Arduino IDE 2.3.8
GFX Library for Arduino v1.6.5
arduinoFFT v2.0.4

---

> **TL;DR（長文は読みたくない人向け）：**
> 1. **配線**：INMP441 の SD→GPIO4、WS→GPIO5、SCK→GPIO6、**L/R は必ず GND に接続**
> 2. **配線**：GC9A01 の SCL→GPIO12、SDA→GPIO11、CS→GPIO9、DC→GPIO10、RST→GPIO18、BL→GPIO7
> 3. **ライブラリ導入**：GFX Library for Arduino（作者 moononournation）+ `arduinoFFT`（作者 kosme）
> 4. **コードを貼り付けて書き込み、マイクに向かって話しかける**と、円の中のレインボーバーが踊り出します

---

## はじめに

1.28インチ円形ディスプレイを買ってからとても面白く使っている。円形は方形とは違った活用法がたくさんある。今回は INMP441 マイクモジュールと組み合わせて、特に見栄えのするものを作ってみる：**リアルタイムオーディオスペクトラムの可視化**。

「スペクトラムアナライザー」と聞くと、Winamp のような前世紀の長方形バーを思い浮かべるかもしれない（筆者も昔パソコンにインストールして、音楽を聴きながらバーの動きを何時間も見ていた）。しかし円形のスペクトラムは一味違う——16本のレインボーバーが中心から外側に向かって放射状に伸び、音量が大きいほどバーが長くなり、各バーの先端には白いピーク光点がゆっくりと落下していく……正直、これに見入って5分間食事に行くのを忘れてしまった。

本記事では **ESP32-S3 + INMP441 デジタルマイク + GC9A01 円形 TFT ディスプレイ** を使い、配線からコードまで、音声にリアルタイムに反応する円形レインボースペクトラムアナライザーを手順を追って作っていく。基礎知識のある maker なら、45分以内に動作を確認できる。

---

## 実験結果

![](https://img.lingflux.com/2026/06/21a134efbde1457cff0817a7e18879f3.jpg)

- マイク音声をリアルタイム取得（44.1kHz、16bit）
- 512点 FFT 解析、16バンドに分割
- 円形ディスプレイ上にレインボーバーが内側から外側に放射、ピーク白点がゆっくり下降
- リフレッシュレート約 20fps、肉眼で十分滑らかに表示

---

## パーツ説明

### GC9A01 円形 TFT ディスプレイ

普通の矩形ディスプレイが「ストレート携帯」だとすれば、GC9A01 は「スマートウォッチの文字盤」——**1.28インチ円形 LCD、ドライバチップが GC9A01、SPI バスで通信、3.3V 駆動**、8本の配線で動かせる。

| パラメータ | 値 |
| --- | --- |
| ディスプレイサイズ | 1.28 インチ |
| 解像度 | 240 × 240 ピクセル |
| インターフェース | SPI（4線） |
| 駆動電圧 | 3.3V |
| ドライバチップ | GC9A01 |
| パネルタイプ | IPS（全方位角） |

選定理由：市場で最も一般的な小型円形ディスプレイで、Arduino_GFX ライブラリがネイティブサポート、5行のコードで初期化でき、ハマりどころが非常に少ない。

---

### INMP441 MEMS デジタルマイク

INMP441 は**無指向性 MEMS デジタルマイク**で、平たく言うと：**I2S デジタル信号を直接出力するため、ADC を接続する必要がない**。同時通訳を雇ったようなもので、話した内容を MCU が理解できるデジタルデータにリアルタイム変換してくれ、アナログ信号回りの面倒な処理を省ける。

| パラメータ | 値 |
| --- | --- |
| インターフェース | I2S（デジタルオーディオ） |
| 駆動電圧 | 1.8V ～ 3.3V |
| 周波数特性 | 60Hz ～ 15kHz |
| S/N比 | 61dBA |
| 感度 | -26dBFS（典型値） |
| 拾音方向 | 無指向性 |

選定理由：I2S インターフェースがシンプルで、追加の ADC が不要。S/N比 61dBA は安価なアナログマイクカプセルよりはるかに優れており、スペクトラム用途には十分すぎるほど。

> 値得注意的是 INMP441 は元々 InvenSense（後に TDK に買収）が製造していたが、公式では既に **Obsolete（生産終了）** ステータスになっている。Mouser や DigiKey などの主要正規部品販売店では生産終了のラベルが貼られている。しかし市場（淘宝網など）では数元で手に入る INMP441 の青/黒い小型モジュールが依然として豊富に出回っている。これは主に中国大陸市場に大量の**在庫余剰品**が残っているか、市場に**互換/リファービッシュの国产チップ**が同じ名称で流通し続けているためだ。個人での DIY、チュートリアル作成、小規模デモ用途であれば、現在入手できるモジュールは依然として使用可能。
>
> **したがって、製品開発を目的とする場合、この型番のモジュールは推奨されない。**

---

## BOM（部品表）

| 部品 | 型番 / 仕様 | 数量 |
| --- | --- | --- |
| メイン開発ボード | ESP32-S3（USB-C 搭載） | 1 |
| 円形 TFT ディスプレイ | GC9A01、1.28インチ、240×240 | 1 |
| デジタルマイク | INMP441 I2S モジュール | 1 |
| ジャンパーワイヤー |  | 適量 |

---

## ピン配置説明

### GC9A01 ディスプレイピン

| ピン | 機能説明 |
| --- | --- |
| VCC | 電源正（3.3V に接続） |
| GND | 電源負 |
| SCL / CLK | SPI クロック |
| SDA / MOSI | SPI データ（マスター送信） |
| CS | チップセレクト（Lowアクティブ） |
| DC | データ / コマンド選択 |
| RST | リセット（Lowでトリガー） |
| BL | バックライト制御（3.3V に接続で常時点灯、または GPIO に接続して PWM 調光） |

### INMP441 マイクピン

| ピン | 機能説明 |
| --- | --- |
| VDD | 電源正（3.3V に接続） |
| GND | 電源負 |
| SD | I2S データ出力（ESP32 のデータ入力に接続） |
| WS | ワードクロック / フレーム同期（左右チャンネル選択） |
| SCK | ビットクロック |
| L/R | チャンネル選択：GND に接続 = 左チャンネル、3.3V に接続 = 右チャンネル、**オープン不可** |

---

## 配線方法

**1本接続するごとに表と照合することをお勧めします。トラブルシューティングの時間を80%削減できます。**

### GC9A01 ディスプレイ配線

| モジュールピン | ESP32-S3 | 配線色の参考 |
| --- | --- | --- |
| VCC | 3.3V | 赤 |
| GND | GND | 灰 |
| SCL / CLK | GPIO12 | 黄 |
| SDA / MOSI | GPIO11 | 青 |
| CS | GPIO9 | 緑 |
| DC | GPIO10 | 橙 |
| RST | GPIO18 | 紫 |
| BL | GPIO7 / 3.3V | シアン |

### INMP441 マイク配線

| モジュールピン | ESP32-S3 | 配線色の参考 |
| --- | --- | --- |
| VDD | 3.3V | 赤 |
| GND | GND | 灰 |
| SD | GPIO4 | 青 |
| WS | GPIO5 | 緑 |
| SCK | GPIO6 | 黄 |
| L/R | GND（左チャンネル） | 灰 |

> ⚠️ **L/R は必ず接続すること。オープンにしてはいけない。** L/R をオープンにするとチャンネル選択が未定義となり、取得されるデータはすべてノイズとなり、スペクトラムバーが音とは無関係に乱れ飛ぶ——筆者が身をもって知ったこと。

####

- 必ず **3.3V** で給電すること。5V に接続しない
- INMP441 の L/R ピンを GND に接続 = 左チャンネル出力
- 先に配線を完了させ、電源線とグラウンド線をテスターで確認してから通電し、ショートを防止する

---

## 必要なライブラリの導入

**Arduino IDE → ツール → ライブラリを管理** で検索してインストール：

| ライブラリ名 | 作者 | テスト済みバージョン | 用途 |
| --- | --- | --- | --- |
| `Arduino_GFX_Library` | moononournation | v1.6.5 | GC9A01 ディスプレイドライバ |
| `arduinoFFT` | kosme | v2.0.4 | 高速フーリエ変換 |

> I2S ドライバ（`driver/i2s.h`）は ESP32 の内蔵ライブラリであり、追加インストールは不要。
>
> Arduino IDE は **2.3.x 以上**を推奨。旧バージョン 1.x は ESP32-S3 のサポートが不安定。

---

## 完全コード

```cpp
#include <Arduino_GFX_Library.h>
#include <driver/i2s.h>
#include <arduinoFFT.h>

// ====== ステップ1: ディスプレイピンの定義 ======
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// ====== ステップ2: マイクピンの定義 ======
#define I2S_WS    5
#define I2S_SD    4
#define I2S_SCK   6
#define I2S_PORT  I2S_NUM_0

// ====== FFT パラメータ ======
#define SAMPLES   512
#define BANDS     16

// ====== GC9A01 ディスプレイの初期化 ======
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0, true);

// ====== FFT バッファ ======
double vReal[SAMPLES];
double vImag[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>(
  vReal, vImag, SAMPLES, 44100);

// ====== バンドエネルギーとピーク ======
float bandValues[BANDS];
float peakValues[BANDS];
int16_t sampleBuf[SAMPLES];

// ====== カスタムユーティリティ: HSL から RGB565 への変換 ======
uint16_t hslToRgb565(float h, float s, float l) {
  float c = (1.0f - fabsf(2.0f * l - 1.0f)) * s;
  float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
  float m = l - c / 2.0f;
  float r, g, b;
  if (h < 60)       { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  uint8_t R = (uint8_t)((r + m) * 31);
  uint8_t G = (uint8_t)((g + m) * 63);
  uint8_t B = (uint8_t)((b + m) * 31);
  return (R << 11) | (G << 5) | B;
}

// ====== ステップ3: マイク I2S の初期化 ======
void setupMicrophone() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

void setup() {
  Serial.begin(115200);

  // ステップ4: バックライトをオンにしてディスプレイを初期化
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  gfx->begin();
  gfx->fillScreen(0x0000);

  // ステップ5: マイクを初期化
  setupMicrophone();

  memset(peakValues, 0, sizeof(peakValues));
}

// ====== 円形スペクトラムの描画 ======
void drawCircularSpectrum() {
  int cx = 120, cy = 120;
  int innerR = 25;
  int maxLen = 85;
  float angleStep = 2.0f * PI / BANDS;
  float barWidth = angleStep * 0.7f;

  gfx->fillScreen(0x0000);

  for (int i = 0; i < BANDS; i++) {
    float angle = i * angleStep - PI / 2.0f;
    float hue = (float)i / BANDS * 360.0f;
    float val = bandValues[i];
    int barLen = (int)(val * maxLen);

    for (int r = innerR; r < innerR + barLen; r += 2) {
      float t = (float)(r - innerR) / maxLen;
      uint16_t color = hslToRgb565(hue, 1.0f, 0.3f + t * 0.3f);
      float x1 = cx + cosf(angle - barWidth/2) * r;
      float y1 = cy + sinf(angle - barWidth/2) * r;
      float x2 = cx + cosf(angle + barWidth/2) * r;
      float y2 = cy + sinf(angle + barWidth/2) * r;
      gfx->drawLine(x1, y1, x2, y2, color);
    }

    if (peakValues[i] > 0.02f) {
      int peakR = innerR + (int)(peakValues[i] * maxLen) + 3;
      float px = cx + cosf(angle) * peakR;
      float py = cy + sinf(angle) * peakR;
      gfx->fillCircle(px, py, 2, 0xFFFF);
    }

    peakValues[i] *= 0.95f;
    if (bandValues[i] > peakValues[i]) {
      peakValues[i] = bandValues[i];
    }
  }
}

void loop() {
  // ステップ6: マイクの I2S データを読み取り
  size_t bytes_read = 0;
  i2s_read(I2S_PORT, sampleBuf, sizeof(sampleBuf),
           &bytes_read, portMAX_DELAY);

  // ステップ7: サンプルデータで FFT の実数部を埋める
  for (int i = 0; i < SAMPLES; i++) {
    vReal[i] = (double)sampleBuf[i];
    vImag[i] = 0.0;
  }

  // ステップ8: FFT を実行
  FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  FFT.compute(FFT_FORWARD);
  FFT.complexToMagnitude();

  // ステップ9: FFT の結果を16バンドにマッピング
  memset(bandValues, 0, sizeof(bandValues));
  int specLen = SAMPLES / 2;
  for (int i = 0; i < BANDS; i++) {
    int start = (int)(pow((float)i / BANDS, 1.8f) * specLen * 0.7f);
    int end   = (int)(pow((float)(i+1) / BANDS, 1.8f) * specLen * 0.7f);
    if (end <= start) end = start + 1;
    float sum = 0;
    for (int j = start; j < end && j < specLen; j++) {
      sum += (float)vReal[j];
    }
    float avg = sum / (end - start);
    bandValues[i] = constrain(avg / 5000.0f, 0.0f, 1.0f);
  }

  // ステップ10: 円形スペクトラムを描画
  drawCircularSpectrum();
}
```

---

## コード解説

**① なぜ SAMPLES = 512 なのか？**
512 は2の累乗であり、FFT アルゴリズムはこの長さで最も効率的。44.1kHz のサンプリングレートの場合、512点 FFT の周波数分解能は約 86Hz になる——実用上十分。256 にすると高速だが周波数のディテールが減り、1024 にすると精密だがフレームレートが著しく低下する。

**② バンド分布で pow(..., 1.8) を使う理由は？**
線形にバンドを分割すると、高周波領域のバンドにデータが集中し、低周波は空っぽになる。指数分布により、低周波バンドはより狭く（精密に）、高周波バンドはより広く（ノイズを統合）なり、人間の耳の周波数知覚カーブに近くなり、より「自然」に見える。

**③ 5000 で正規化する根拠は？**
この値はマイクから音源までの距離や環境音量によって異なる——シーンに応じて手動調整が必要。バーが常に最大まで伸びきる（エネルギーがクリップされる）場合は 5000 を大きくし、バーが短すぎてほとんど見えない場合は小さくする。

**④ peakValues[i] *= 0.95 の役割は？**
これは「ピークホールド + 緩やかな落下」の定番テクニック：音が突然止まっても、ピークの白い点は瞬間的に消えず、毎フレーム 0.95 を掛けてゆっくりと落下する。視覚的に滑らかで、プロ用オーディオ機器のようなエフェクトになる。

---

## トラブルシューティング

**慌てずに。問題の90%は以下の箇所にある：**

**ディスプレイが完全に真っ暗で何も表示されない**
まずバックライト（BL ピン）が実際に High になっているか確認する（モジュールに BL ピンがない場合は無視してよい）。次に SPI の4本の線（SCK / MOSI / CS / DC）が間違っていないか、接触不良がないかチェックする。テスターで VCC に 3.3V が出ているか測定する。バックライトは点くが画面が真っ暗な場合、十中八九は CS または DC の接続が間違っているので、入れ替えて試す。

**スペクトラムバーが全く動かない、または音と無関係に乱れる**
まず最初に：**INMP441 の L/R ピンが GND に接続されているか確認**——これが最も多いハマりどころ。L/R がオープンだとチャンネル選択が異常になり、取得されるデータはすべてランダムノイズになる。L/R を正しく接続した後、SD / WS / SCK の3本の線の GPIO 番号を確認する。

**スペクトラムバーがすべて最大まで伸びきっている（エネルギーが常に最大）**
コード内の `bandValues[i] = constrain(avg / 5000.0f, ...)` の `5000` を大きくする（例：`15000` や `30000`）。マイクが音源に近すぎる場合も同様になるので、まずマイクを30cm程度離してみる。

**スペクトラムバーは反応するが、動くのは一部のバーだけ**
テストに使っている音源の周波数範囲が狭すぎる可能性がある（例：単音のホイッスルのみ）。低音、ボーカル、高音楽器を含むフルレンジの音楽に切り替えて、各バンドが反応するか確認する。

**コンパイルエラー：ArduinoFFT テンプレートクラスのエラー**
インストールされているのが `arduinoFFT`（kosme 版）**v2.x** であることを確認。v1.x の書き方は `ArduinoFFT FFT`（テンプレートパラメータなし）で、v2.x では `ArduinoFFT<double>` となり、2つのバージョン間で API に互換性がない。ライブラリマネージャで最新版に更新すればよい。

---

## FAQ

**Q：INMP441 の L/R ピンを接続しないとどうなる？**
A：チャンネル選択がオープンになり、マイク出力の動作が未定義となる。実測ではほぼ確実にノイズだけのランダムデータが取得され、スペクトラムバーが乱れ、音とは完全に無関係になる。GND に接続 = 左チャンネル、3.3V に接続 = 右チャンネル。どちらかを選択し、必ず接続すること。

**Q：SAMPLES を 1024 に変更できるか？影響は？**
A：変更可能。周波数分解能が約 86Hz から約 43Hz に向上し、低域のディテールがより豊かになる。代償として1フレームあたりの取得・計算時間が倍になり、リフレッシュレートが約 20fps から約 10fps に低下する。スペクトラムの可視化において 10fps は肉眼で十分許容範囲。

**Q：3.3V だけの場合、INMP441 は正常に動作するか？**
A：全く問題ない。INMP441 は 1.8V ～ 3.3V の給電に対応しており、3.3V が最も一般的な駆動電圧。追加の降圧モジュールは不要。

**Q：ESP32-S3 の CPU 負荷は高いか？他のタスクに影響するか？**
A：512点 FFT は ESP32-S3 の 240MHz クロックでシングルコアの 10%～15% 程度の CPU 時間を消費する。Wi-Fi や Bluetooth も動かす必要がある場合は、FFT + 描画を Core 0 に、ネットワークタスクを Core 1 に割り当てると、互いに干渉しない。

**Q：GC9A01 を ST7789 や他のディスプレイドライバに変更できるか？**
A：変更可能。Arduino_GFX_Library は数十種類のドライバチップをサポートしている。コード内の `Arduino_GC9A01` を対応するクラス（例：`Arduino_ST7789`）に置き換え、解像度パラメータを変更し、新しいディスプレイのデータシートに従って配線する。ただし非円形ディスプレイの場合は中心座標を再計算する必要がある。

**Q：静寂時に「ノイズフロア」があり、バーがゼロに戻らない場合の対処法は？**
A：INMP441 自体にノイズフロアがある（S/N比 61dBA は常に微量の環境ノイズが取り込まれることを意味する）。ノイズゲートを追加できる：マッピング前に `if (avg < 200) avg = 0;` の1行を追加すれば、静寂時にバーが完全にゼロになる。また正規化の除数を適度に大きくするのも効果的。

**Q：ESP32-S3 はどのバージョンの I2S ドライバを使用しているか？**
A：本記事では ESP-IDF v4.x スタイルの旧版 I2S ドライバ（`i2s_driver_install` / `i2s_read`）を使用している。ESP-IDF v5.x では新しい I2S API（`i2s_new_channel` など）が導入されており、ESP32-S3 ボードサポートパッケージが 3.x にアップグレードされている場合は、`setupMicrophone()` 関数を新しい API に合わせて書き直す必要がある。

---

## 応用アイデア

- 32バンドに変更し、より大型の円形ディスプレイ（例：2.1インチ GC9A01A）と組み合わせて、より繊細なスペクトラムを実現
- タッチボタンを追加して表示モードを切り替え（円形放射 / 縦型バー / オシロスコープ波形）
- Wi-Fi に接続してスペクトラムデータをブラウザにプッシュし、Web ページで再度レンダリング
- INMP441 を2つ使用してステレオを実現し、左右チャンネルをそれぞれ異なる色で表示

---

## 参考文献

- [INMP441 公式データシート — TDK InvenSense](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [GC9A01 ドライバチップデータシート](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [arduinoFFT GitHub — kosme](https://github.com/kosme/arduinoFFT)
- [ESP32-S3 技術仕様書 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP-IDF I2S ドライバドキュメント — Espressif](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)