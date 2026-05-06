---
title: "ESP32-S3 + 1.3\" SH1106 OLED サイバー章魚飼育｜I2C + U8g2 アニメーションチュートリアル"
boardId: esp32s3
moduleId: display/oled13-sh1106
category: esp32
date: 2026-05-06
intro: "ESP32-S3 で 1.3 インチ SH1106 OLED を駆動し、U8g2 ライブラリで章魚の泳ぎアニメーション＋泡パーティクルエフェクトを実現。I2C 配線 4 本、リサージュ曲線運動アルゴリズム、トラブルシューティング付き。"
image: "https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg"
---

# ESP32-S3 で 1.3" SH1106 OLED を駆動する完全チュートリアル——サイバー章魚アニメーション（I2C + U8g2）

難易度：⭐⭐☆☆☆（初心者でも挑戦可能）
所要時間：30 分
テスト環境：Arduino IDE 2.3.8 ・ U8g2 v2.35.30 ・ ESP32 Board Package 3.3.8

---

> **TL;DR（クイックスタート）：**
>
> 1. 配線：SDA → GPIO 8、SCL → GPIO 9、VCC → 3.3V、GND → GND
> 2. ライブラリインストール：U8g2（作者 oliver）
> 3. コンストラクタで I2C アドレスを `0x3C * 2` に変更し、Wire の初期化を `Wire.begin(8, 9)` に変更
> 4. コードを書き込むと、章魚が泳ぎ始める
> 5. コードはリサージュ曲線運動アルゴリズムを使用。アルゴリズムに興味がある方は詳細を参照

---

## はじめに

ネットショップで OLED 小型ディスプレイを見たことがありませんか？親指の爪ほどの大きさしかないのに、販売ページの動画では滑らかなアニメーションが表示されていて、とてもクールで面白そう。

その動画を見た翌日の午後には、1.3 インチ SH1106 OLED を注文していました。そして定番の問題にぶつかりました。画面が届き、コードをアップロードして、バックライトは点いたものの——何も表示されない。

半日格闘した結果、原因は大きく2つに絞られました。**I2C ピンがデフォルトの 21/22 ではない**こと、そして **SH1106 のドライバチップは SSD1306 ではない**こと。この2つはよく似ていますが、混用はできません。

この2点を理解すれば、あとは順調です。本記事の目標：30 分以内に、OLED 画面上で章魚を泳がせ、さらに泡を吹かせること。



---

## 実験結果



![ESP32-canva-017-1inch3-oled (1) (1)](https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg)



32×32 ピクセルの章魚が画面上を泳ぎ、運動軌跡はリサージュ曲線（あの優雅な 8 の字型の波）です。同時に口元から大小さまざまな泡が次々と吐き出され、ゆっくりと広がって消えていきます。

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/zw06nh7wXp4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## パーツ説明

### 1.3" OLED SH1106

SH1106 はモノクロ OLED ドライバチップで、コード内の 0 と 1 を画面上の点灯ピクセルに変換します。ドットマトリックスの通訳係のようなものです。「30 行目 50 列目を点灯」と指示すると、対応する有機 EL ダイオードを制御して発光させます。

| パラメータ | 数値 |
|------|------|
| 解像度 | 128 × 64 ピクセル |
| ドライバチップ | SH1106（≠ SSD1306） |
| 通信インターフェース | I2C（デフォルトアドレス 0x3C） |
| 動作電圧 | 3.3V / 5V 互換 |
| 画面サイズ | 1.3 インチ |

> 選んだ理由：安くて十分な性能。U8g2 ライブラリと組み合わせれば、ドットマトリックスアニメーションは簡単。0.96 インチの SSD1306 と間違えて買わないように注意。ドライバチップが異なり、コードをそのまま流用すると白い画面になります。

---

## BOM（部品表）

| パーツ | 数量 |
|------|------|
| ESP32-S3 開発ボード | × 1 |
| 1.3" OLED SH1106（I2C） | × 1 |
| ジャンパーワイヤー（オス-メス） | × 4 |

---

## 配線方法

| 1.3" OLED ピン | 接続先 ESP32-S3 |
|-----------|---------------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

> 配線後は一つずつ確認することをお勧めします。トラブルシューティングの時間を 80% 削減できます。SDA/SCL の逆接続は最も多い白い画面の原因で、通電は正常に見えるのに何も表示されません。

---

## ライブラリのインストール

Arduino IDE のライブラリマネージャーで **U8g2** を検索し、oliver が公開しているバージョンをインストールしてください。

テスト済みバージョン：**U8g2 v2.35.30**

U8g2 は [olikraus/u8g2](https://github.com/olikraus/u8g2) が管理するオープンソースディスプレイライブラリで、ほぼすべての一般的なモノクロ OLED/LCD ドライバチップをサポートしており、SH1106 ももちろん含まれます。

---

## 完整コード

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// ステップ1：U8g2 オブジェクトの宣言
// 注意：ここでは SH1106、128×64、フルバッファモード、ハードウェア I2C を選択
// U8G2_R2 = 画面を180度回転（ハードウェアの実装方向に合わせて調整。回転不要なら U8G2_R0 に変更）
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R2, /* reset=*/ U8X8_PIN_NONE);

// ==================== 章魚アニメーションフレーム（Flash に保存、RAM を節約）====================
// 4コマのコマアニメーション、各フレーム 32×32 ピクセル、XBM ドットマトリックス形式
const unsigned char animation_frame_0[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00,
  0x00, 0xFE, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00,
  0xE0, 0xFF, 0xFF, 0x01, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01,
  0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0x00, 0xEF, 0x3D, 0x00,
  0x00, 0xEF, 0x3D, 0x00, 0x00, 0xC7, 0x38, 0x00, 0x00, 0xC7, 0x38, 0x00,
  0x80, 0xC3, 0x70, 0x00, 0x80, 0xC3, 0x70, 0x00, 0x80, 0xC1, 0x60, 0x00,
  0x80, 0xC1, 0x60, 0x00, 0xC0, 0xC0, 0xC0, 0x00, 0xC0, 0xC0, 0xC0, 0x00,
  0x40, 0x80, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_1[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0xFC, 0x0F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01, 0xE0, 0xFF, 0xFF, 0x01,
  0xE0, 0xE7, 0xE7, 0x01, 0xE0, 0xE1, 0xE1, 0x01, 0xE0, 0xE7, 0xE7, 0x01,
  0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0x00, 0xFF, 0x3F, 0x00, 0x00, 0xFE, 0x1F, 0x00, 0x00, 0xDE, 0x1E, 0x00,
  0x00, 0xCF, 0x3C, 0x00, 0x80, 0xC7, 0x78, 0x00, 0xC0, 0xC3, 0xF0, 0x00,
  0xE0, 0xC1, 0xE0, 0x01, 0xE0, 0xC0, 0xC0, 0x01, 0xC0, 0xC0, 0xC0, 0x00,
  0x80, 0xC0, 0x40, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_2[] PROGMEM = {
  0x00, 0xF0, 0x00, 0x00, 0x00, 0xF8, 0x01, 0x00, 0x00, 0xFC, 0x03, 0x00,
  0x00, 0xFE, 0x07, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x80, 0xFF, 0x1F, 0x00, 0x80, 0xF9, 0x19, 0x00,
  0x80, 0xF0, 0x10, 0x00, 0x80, 0xF9, 0x19, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x00, 0xFE, 0x07, 0x00,
  0x00, 0xFC, 0x03, 0x00, 0x00, 0x6C, 0x03, 0x00, 0x00, 0x66, 0x06, 0x00,
  0x00, 0x63, 0x0C, 0x00, 0x80, 0x61, 0x18, 0x00, 0xC0, 0x60, 0x30, 0x00,
  0x60, 0x60, 0x60, 0x00, 0x30, 0x60, 0xC0, 0x00, 0x18, 0x60, 0x80, 0x01,
  0x0C, 0x60, 0x00, 0x03, 0x06, 0x60, 0x00, 0x06, 0x02, 0x60, 0x00, 0x04,
  0x00, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_3[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00, 0x00, 0xFE, 0x3F, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03, 0xF0, 0xF3, 0xF3, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x00, 0xF6, 0x06, 0x00,
  0x00, 0xF6, 0x06, 0x00, 0x00, 0x63, 0x0C, 0x00, 0x00, 0x63, 0x0C, 0x00,
  0x80, 0x61, 0x18, 0x00, 0x80, 0x61, 0x18, 0x00, 0x80, 0x60, 0x10, 0x00,
  0x80, 0x60, 0x10, 0x00, 0x40, 0x60, 0x20, 0x00, 0x40, 0x60, 0x20, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

// 4フレームのポインタを配列に格納、ループアクセスに便利
const unsigned char* animation_frames[] = {
  animation_frame_0, animation_frame_1, animation_frame_2, animation_frame_3
};

const int TOTAL_FRAMES = 4;
const unsigned long FRAME_DELAY = 120; // フレーム間隔（ミリ秒）、小さくすると速く、大きくすると遅くなる
int currentFrame = 0;
unsigned long lastFrameTime = 0;
const int SPRITE_SIZE = 32; // 章魚ドットマトリックスサイズ 32×32

// ==================== 泡パーティクルシステム ====================
#define MAX_BUBBLES 10 // 画面上に同時存在できる泡は最大 10 個

struct Bubble {
  float x;       // 現在の X 座標
  float y;       // 現在の Y 座標
  float radius;  // 現在の半径（浮動小数点、フレームごとの縮小に便利）
  float speedY;  // 1フレームあたりの上浮ピクセル数
  float wobble;  // 左右揺れのランダム位相オフセット
  bool active;   // この泡は「生存中」か
};

Bubble bubbles[MAX_BUBBLES]; // オブジェクトプール、動的メモリ割り当てを回避

void setup() {
  Serial.begin(115200);

  // ステップ2：乱数シードで起動ごとに異なる泡を生成
  randomSeed(analogRead(0));

  // ステップ3：I2C を初期化、SDA=8、SCL=9 を指定
  Wire.begin(8, 9);
  u8g2.setI2CAddress(0x3C * 2); // U8g2 はアドレスを1ビット左シフトする必要がある、0x3C << 1 = 0x78
  u8g2.begin();

  // ステップ4：すべての泡を未アクティブにマーク
  for (int i = 0; i < MAX_BUBBLES; i++) {
    bubbles[i].active = false;
  }

  Serial.println("章魚水族館が起動しました！");
}

void loop() {
  unsigned long currentTime = millis();

  // delay() の代わりにノンブロッキングタイマーを使用、アニメーションをスムーズに保つ
  if (currentTime - lastFrameTime >= FRAME_DELAY) {
    lastFrameTime = currentTime;

    // ======== ステップ1：リサージュ曲線で章魚の位置を計算 ========
    // 異なる周波数の正弦波を重ね合わせ、優雅な 8 の字型の遊泳軌跡を生成
    float t = currentTime * 0.0008;

    float waveX = sin(t * 0.8) * 0.6 + sin(t * 0.3) * 0.4;
    int posX = 48 + (int)(waveX * 48); // 水平方向の範囲は約 0～96

    float waveY = cos(t * 0.7) * 0.6 + sin(t * 0.4) * 0.4;
    int posY = 16 + (int)(waveY * 16); // 垂直方向の範囲は約 0～32

    // ======== ステップ2：25% の確率で章魚の口元に新しい泡を生成 ========
    if (random(100) < 25) {
      for (int i = 0; i < MAX_BUBBLES; i++) {
        if (!bubbles[i].active) {
          bubbles[i].active = true;
          bubbles[i].x      = posX + 16 + random(-8, 8);   // 口元付近のランダムオフセット
          bubbles[i].y      = posY + 24 + random(0, 5);
          bubbles[i].radius = random(15, 35) / 10.0;       // 1.5～3.5 ピクセル
          bubbles[i].speedY = random(10, 25) / 10.0;       // 上浮速度はランダム
          bubbles[i].wobble = random(0, 100) / 10.0;       // 揺れ位相はランダム
          break; // 1フレームにつき1つだけ生成
        }
      }
    }

    // ======== ステップ3：バッファをクリア、描画開始 ========
    u8g2.clearBuffer();

    // 章魚本体を描画（XBM ドットマトリックス画像）
    u8g2.drawXBMP(posX, posY, SPRITE_SIZE, SPRITE_SIZE, animation_frames[currentFrame]);

    // ======== ステップ4：生存中のすべての泡を更新・描画 ========
    for (int i = 0; i < MAX_BUBBLES; i++) {
      if (bubbles[i].active) {
        bubbles[i].y -= bubbles[i].speedY; // 上に浮上

        // 時間軸に合わせて左右に揺れ、本物の水中の泡のように
        float currentX = bubbles[i].x + sin(t * 3.0 + bubbles[i].wobble) * 4.0;

        // 泡をフレームごとに縮小、遠ざかるにつれて薄くなり消える様子をシミュレート
        bubbles[i].radius -= 0.06;

        // 半径が小さすぎるか画面上部に飛び出した → この泡を回収
        if (bubbles[i].radius <= 0.5 || bubbles[i].y < -5) {
          bubbles[i].active = false;
        } else {
          // 中空円を描画——塗りつぶし円より本物の泡に近い
          u8g2.drawCircle((int)currentX, (int)bubbles[i].y, (int)bubbles[i].radius);
        }
      }
    }

    // ステップ5：バッファの内容を一括で画面に送信
    u8g2.sendBuffer();

    // 次のフレームに切り替え
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }
}
```

### コードの説明

**リサージュ曲線運動**：異なる周波数の正弦/余弦を重ね合わせることで、章魚が優雅な 8 の字型の経路を描きます。単純な往復移動よりはるかに美しく、数行の三角関数で実現できます。

**泡オブジェクトプール**：10 個の `Bubble` 構造体を事前に割り当て、`active` フラグで「生死」を管理。`new/delete` によるメモリ断片化を回避します。MCU では一般的な安心できる実装手法です。

**`PROGMEM` キーワード**：ドットマトリックス配列にこのキーワードを付けると Flash に保存され、貴重な SRAM を消費しません。4 フレーム × 128 バイト = 512 バイト、RAM に置くには少しもったいないです。

**ノンブロッキングタイマー**：`delay()` ではなく `millis()` を使用することで、泡の物理更新と章魚のアニメーションフレーム切り替えが同じループ内で自然に連携し、カクつきが発生しません。

---

## よくある問題のトラブルシューティング

落ち着いてください。90% の問題は以下の箇所にあります。

**画面が全く点かない / 何も出力されない**
まず電源を確認してください。VCC は 5V ではなく 3.3V に接続されていますか（多くのモジュールは 5V 互換ですが、まず確認を）。その後、テスターで SDA/SCL の2本の線が逆接続されていないか確認してください。これが最も頻度の高いエラーです。

**画面は点くが真っ白または真っ黒、画像が見えない**
十中八九 I2C アドレスの問題です。コードでは `0x3C * 2` を使用していますが、これは U8g2 の要件です。画面裏面の I2C アドレスジャンパーが `0x3D` の場合は、`0x3C` を `0x3D` に変更して再試行してください。I2C Scanner を先に実行してアドレスを確認するのも良い方法です。

**画像は表示されるが上下が反転している**
コンストラクタの `U8G2_R2` を `U8G2_R0` に変更してください。両者の違いは 180 度の回転のみです。

**章魚の位置が画面端を超える**
`posX` の最大値は約 96 で、32 ピクセル幅を加えるとちょうど 128 の境界に達します。運動幅度パラメータを変更した場合は、座標が `128 - SPRITE_SIZE` を超えないように注意してください。

**泡がカクカクして見える**
`FRAME_DELAY` を 120 から 80 に減らしてみてください。まだカクつく場合は、I2C バス速度を確認し、`Wire.begin(8, 9)` の後に `Wire.setClock(400000)` を追加してファストモード（400 kHz）に切り替えてみてください。

---

## FAQ

**Q：他の GPIO を I2C に使えますか？**
A：はい、ESP32-S3 の I2C は任意の GPIO にマッピングできます。`Wire.begin(8, 9)` の数値を使いたいピン番号に変更してください。SDA が前、SCL が後です。

**Q：私の画面は 0.96 インチ SSD1306 です。コードをそのまま使えますか？**
A：そのままでは使えません。ドライバチップが異なります。コンストラクタを `U8G2_SSD1306_128X64_NONAME_F_HW_I2C` に変更してください。他のコード部分はそのまま使用できます。

**Q：I2C の速度はどれくらいまで対応していますか？**
A：SH1106 は標準モード 100 kHz、ファストモード 400 kHz に対応しています。本コードでは明示的に設定していないため、デフォルトの 100 kHz で動作します。リフレッシュが遅いと感じる場合は `Wire.setClock(400000)` を追加してください。

**Q：PROGMEM は何をするものですか？削除できますか？**
A：`PROGMEM` は配列を SRAM ではなく Flash に保存します。4 フレームのドットマトリックスデータは約 512 バイトで、削除しても機能に影響はありませんが、512 バイトの SRAM を消費します。ESP32-S3 は SRAM に余裕があるので、削除しても大きな問題はありませんが、残しておくのが良い習慣です。

**Q：章魚の速度を速く、または遅くしたい場合はどうすればいいですか？**
A：`FRAME_DELAY` の値を変更してください。数値が小さいほど速く、大きいほど遅くなります。泡の上浮速度は `speedY` の範囲 `random(10, 25) / 10.0` で制御されているので、こちらも調整可能です。

**Q：画面はどれくらい RAM を消費していますか？**
A：U8g2 フルバッファモード（`_F_`）では RAM 内に完全なフレームバッファを維持します。128×64 ÷ 8 = 1024 バイト、約 1KB です。ESP32-S3 には 512KB の SRAM があるので、十分に余裕があります。

---

## 応用アイデア

- **キャラクターを変える**：[image2cpp](https://javl.github.io/image2cpp/) で任意の白黒画像を XBM ドットマトリックスに変換し、章魚と差し替える
- **センサーでインタラクション**：サウンドセンサーを接続し、音量に合わせて章魚の遊泳速度を変化させる
- **マルチ画面連携**：2 枚の OLED を同じ I2C バスに接続（アドレスをそれぞれ 0x3C と 0x3D に設定）、左右に章魚を1匹ずつ表示
- **TFT カラー版**：ST7789 カラー TFT に切り替え、グレースケールグラデーションでより繊細な泡エフェクトを実現

---

## 参考資料

- [Espressif ESP32-S3 データシート（公式）](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_cn.pdf)
- [U8g2 ライブラリ GitHub ページ（olikraus/u8g2）](https://github.com/olikraus/u8g2)
- [SH1106 ドライバチップデータシート（Sino Wealth）](https://www.velleman.eu/downloads/29/infosheets/sh1106_datasheet.pdf)
- [image2cpp：画像を XBM ドットマトリックスに変換するオンラインツール](https://javl.github.io/image2cpp/)
