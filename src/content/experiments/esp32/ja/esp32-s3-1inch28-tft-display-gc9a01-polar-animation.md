---
title: "ESP32-S3 で GC9A01 円形ディスプレイに心形線を描く｜極座標アニメーション 30 分で完成"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-05-19
intro: "ESP32-S3 で 1.28 インチ GC9A01 円形 TFT ディスプレイを駆動し、極座標心形線アニメーションを動かす。完全な配線図、ダブルバッファによるチラつきゼロのコード、そしてトラブルシューティングガイド付き。"
image: "https://img.lingflux.com/2026/05/a6a0b0037d4fd0650665e49e7364d65d.jpg"
---

# ESP32-S3 で GC9A01 1.28 インチ円形ディスプレイを駆動する完全チュートリアル（SPI + Arduino IDE）

難易度：⭐⭐☆☆☆（初心者でも挑戦可能）
所要時間：30 分
テスト環境：
Arduino IDE 2.3.8
Arduino_GFX_Library 1.6.5
ESP32 Arduino Core 3.3.8

---

> **一言でいうと**：ESP32-S3 で 1.28 インチ GC9A01 円形ディスプレイを駆動し、極座標心形線アニメーションを動かす。ダブルバッファでチラつきゼロ、配線図＋完全なコード＋トラブルシューティング付き、30 分で完成。

---

## はじめに

520（中国語のネットスラングで「愛してる」を意味する日）がやって来る。彼女にどんなプレゼントを贈ろうか？いくら考えても名案が浮かばない。

そこでふと思い出したのが、高校で極座標を学んだとき教科書に載っていた「心臓線（Cardioid）」という曲線のこと。極座標のデモアニメーションを作って、ハートを描き出し、自分の気持ちを伝えられないか。（理系男子が脳内であらゆるシーンを想像し、ひとり興奮中……）

本記事の目標：ゼロから始めて、30 分以内に ESP32-S3 でこの 1.28 インチ円形ディスプレイを駆動し、極座標アニメーションを動かすこと。ついでに各ステップの「なぜそうするのか」もしっかり理解する。（PS：気になる相手にプレゼントした後、正座して謝る羽目になりませんように！ :P ）

（このハートを見た彼女の心の中：「これ何……？！」～※急いでドリアンを用意）

---

## 実験結果

円形ディスプレイ上に回転する**心形線（Cardioid）**がリアルタイムで描画される。極座標系のグリッドと追跡点が付き、まるで小型オシロスコープが数学曲線を描いているようだ。全程チラつきゼロ、フレームレートは 16fps に固定されスムーズに動作する。

![](https://img.lingflux.com/2026/05/8db744891e99902a8045e4e1242911d1.jpg)

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/fcqwhO5Vr7U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 部品説明

### GC9A01 1.28 インチ円形 TFT ディスプレイ

GC9A01 はドライバチップ、円形 IPS パネルがディスプレイ本体で、両者が同じ小さなモジュール上にはんだ付けされている。SPI プロトコルで画像データを「送り込む」だけで、各ピクセルを点灯してくれる。

| パラメータ | 値 |
| --- | --- |
| 解像度 | 240 × 240 ピクセル |
| 色深度 | 16-bit RGB565、65536 色 |
| インターフェース | 4 線式 SPI、最高 80MHz |
| 動作電圧 | 3.3V（ESP32-S3 に直接接続可能、レベル変換不要） |
| パネルタイプ | IPS、視野角はほぼ 180° |
| モジュールサイズ | 約 36mm 直径 |

選んだ理由：安い（5～15 元）、入手性が良い、円形という形状がダッシュボードや時計系プロジェクトにぴったりで、240×240 の解像度は ESP32-S3 のメモリ負荷にもちょうどよい。

---

## BOM 表

| 部品 | 数量 | 備考 |
| --- | --- | --- |
| ESP32-S3 開発ボード | 1 | SPI ピンがあるバージョンなら何でも可 |
| GC9A01 1.28" 円形ディスプレイモジュール | 1 | モジュールに BL ピンがあることを確認 |
| ジャンパーワイヤー | 適量 | メス‑メスまたはメス‑オス、開発ボードのピン形式に合わせて |

---

## 部品ピン説明

| GC9A01 モジュールピン | 機能 |
| --- | --- |
| VCC | 電源正極（3.3V） |
| GND | 電源負極 |
| SCL / CLK | SPI クロック信号 |
| SDA / MOSI | SPI データ入力（マスター→スレーブ） |
| CS | チップセレクト、Low 時にディスプレイが SPI に応答 |
| DC | データ/コマンド選択：High=データ、Low=コマンド |
| RST | ハードウェアリセット、Low でトリガー |
| BL | バックライト制御、High に接続しないと画面が点灯しない |

---

## 配線方法

> 下表の通りに 1 本ずつ接続し、接続するごとにチェックマークを付けると、トラブルシューティングの時間を 80% 削減できる。

| GC9A01 ディスプレイ | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7（コード制御）または直接 3.3V に接続 |

> **⚠️ 注意**：BL（バックライト）ピンは接続し忘れが多い。接続を忘れると通電しても画面が真っ暗になり、コードの問題でもディスプレイの故障でもない。まずはここを確認すること。一部のモジュールには BL ピンが引き出されていないが、その場合はモジュール内部で 3.3V に接続済みなので気にする必要はない。

---

## 必要なライブラリ

Arduino IDE → ツール → ライブラリを管理 を開き、検索してインストール：

| ライブラリ名 | 作者 | テスト済みバージョン |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | 1.6.5 |

> TFT_eSPI はインストールしないこと：ESP32 Core 3.x では、TFT_eSPI のマクロ定義や DMA 初期化が新しい ESP32 と競合し、コンパイルエラーや起動時のフリーズが発生する。Arduino_GFX_Library は最初からモダンな C++ とメモリキャンバスをサポートしており、現在ディスプレイプロジェクトで最も手間のかからない選択肢だ。（執筆時点：2026-05-18）

---

## 完全なコード

```cpp
/**
 * ESP32-S3 + GC9A01 1.28" 円形ディスプレイ — 極座標アニメーションデモ
 * ダブルバッファでチラつきゼロ、16fps に固定
 * 配線：SCL=GPIO12, SDA=GPIO11, CS=GPIO9, DC=GPIO10, RST=GPIO18, BL=GPIO7
 */

#include <Arduino_GFX_Library.h>

// ---------------------------------------------------
// ステップ1：カラーマクロを手動で定義
// 新版 Arduino_GFX では BLACK / WHITE などのグローバルエクスポートが廃止され、
// この定義がないと "BLACK was not declared in this scope" でコンパイルエラーになる
// ---------------------------------------------------
#ifndef BLACK
#define BLACK       0x0000
#endif
#ifndef WHITE
#define WHITE       0xFFFF
#endif
#ifndef RED
#define RED         0xF800
#endif
#ifndef GREEN
#define GREEN       0x07E0
#endif
#ifndef BLUE
#define BLUE        0x001F
#endif
#ifndef YELLOW
#define YELLOW      0xFFE0
#endif
#ifndef CYAN
#define CYAN        0x07FF
#endif
#ifndef MAGENTA
#define MAGENTA     0xF81F
#endif
#ifndef GRAY
#define GRAY        0x8410
#endif
#ifndef DARKGRAY
#define DARKGRAY    0x2104
#endif

// ---------------------------------------------------
// ステップ2：カラースキームを定義（濃紺背景 + オレンジ赤のメインカラー）
// ---------------------------------------------------
#define COLOR_BG        0x1123   // 濃紺黒の背景
#define COLOR_GRID      0x19E5   // グリッドの青灰色
#define COLOR_PRIMARY   0xE73C   // 曲線のオレンジ赤
#define COLOR_ACCENT    0xFDE0   // 動径の黄金色
#define COLOR_TEXT      0xF7BE   // テキストの薄い灰色

// ---------------------------------------------------
// ステップ3：物理ピンを定義
// ---------------------------------------------------
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---------------------------------------------------
// ステップ4：SPI バスとディスプレイドライバをインスタンス化
// ---------------------------------------------------
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA, GFX_NOT_DEFINED /* MISO は不要 */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST,
    0,    /* 回転角度 */
    true  /* IPS ディスプレイ */
);

// ---------------------------------------------------
// ステップ5：ダブルバッファキャンバスを割り当て（240×240×2 Bytes = 115.2KB SRAM）
// すべての描画はまずメモリに書き込み、完了後に一括でディスプレイに転送してチラつきを完全に解消
// ---------------------------------------------------
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

// ---------------------------------------------------
// アニメーション変数
// ---------------------------------------------------
float angle = 0.0f;
const float  a_scale    = 50.0f;  // 心形線のスケール係数（単位：ピクセル）
const int16_t cx        = 120;    // 中心 X
const int16_t cy        = 120;    // 中心 Y

unsigned long lastFrameTime = 0;
const int frameDelay = 1000 / 16; // 16fps に固定

// 機能スイッチ（false に変更すると各レイヤーを個別にオフにできる）
const bool showGrid     = true;
const bool showCurve    = true;
const bool showRadius   = true;
const bool showTelemetry= true;

void setup() {
    Serial.begin(115200);

    // ディスプレイドライバを初期化
    gfx->begin();

    // バックライトを点灯（これを忘れると = 画面が真っ暗）
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);

    // ダブルバッファキャンバスを初期化
    if (!canvas->begin()) {
        Serial.println("キャンバスのメモリ割り当てに失敗！直接描画モードに切り替え（チラつきが発生します）");
    } else {
        Serial.println("ダブルバッファ起動成功、チラつきゼロレンダリング準備完了。");
    }
}

void loop() {
    // フレームレート制限
    unsigned long now = millis();
    if (now - lastFrameTime < frameDelay) return;
    lastFrameTime = now;

    // フレームをクリア
    canvas->fillScreen(COLOR_BG);

    // --- レイヤー1：極座標グリッド ---
    if (showGrid) {
        canvas->drawCircle(cx, cy,  30, COLOR_GRID);
        canvas->drawCircle(cx, cy,  60, COLOR_GRID);
        canvas->drawCircle(cx, cy,  90, COLOR_GRID);
        canvas->drawCircle(cx, cy, 110, COLOR_GRID);
        canvas->drawFastHLine(10, cy, 220, COLOR_GRID);
        canvas->drawFastVLine(cx, 10, 220, COLOR_GRID);
    }

    // --- レイヤー2：完全な心形線の軌跡 r = a*(1 - cos θ) ---
    if (showCurve) {
        int16_t lx = 0, ly = 0;
        for (int16_t deg = 0; deg <= 360; deg += 3) {
            float rad = deg * DEG_TO_RAD;
            float r   = a_scale * (1.0f - cos(rad));
            int16_t x = cx + (int16_t)(r * cos(rad));
            int16_t y = cy - (int16_t)(r * sin(rad)); // 画面の Y 軸は下向きなので反転
            if (deg > 0) canvas->drawLine(lx, ly, x, y, COLOR_PRIMARY);
            lx = x; ly = y;
        }
    }

    // --- レイヤー3：現在の追跡点と動径 ---
    float rad_a  = angle * DEG_TO_RAD;
    float active_r = a_scale * (1.0f - cos(rad_a));
    int16_t px = cx + (int16_t)(active_r * cos(rad_a));
    int16_t py = cy - (int16_t)(active_r * sin(rad_a));

    if (showRadius) canvas->drawLine(cx, cy, px, py, COLOR_ACCENT);
    canvas->fillCircle(px, py, 5, COLOR_TEXT);

    // --- レイヤー4：数値表示 ---
    if (showTelemetry) {
        canvas->setTextColor(COLOR_TEXT);
        canvas->setTextSize(1);
        canvas->setCursor(50, 25);
        canvas->print("Polar Coordinates");
        canvas->setCursor(28, 185);
        canvas->print("r = a * (1 - cos(theta))");
        canvas->setCursor(40, 200);
        canvas->print("th:"); canvas->print((int)angle);
        canvas->print("  r:"); canvas->print((int)active_r);
        canvas->print("px");
    }

    // 角度を進める（毎フレーム +6°、1 周約 1 秒）
    angle += 6.0f;
    if (angle >= 360.0f) angle -= 360.0f;

    // メモリキャンバスの内容を物理ディスプレイに一括転送
    canvas->flush();
}
```

### コードの解説

**ダブルバッファの仕組み**：すべての描画操作は `canvas`（メモリ）上で行われ、最後の `canvas->flush()` で初めて完成したフレームがディスプレイに送信される。黒板を消してから書くのではなく、下書き用紙に書いてから丸ごと貼り付けるようなもの。ディスプレイ側には「描きかけ」の状態が一切見えず、チラつきはゼロになる。

**心形線の方程式** `r = a * (1 - cos θ)`：これは極座標方程式で、`r` は中心からの距離、`θ` は角度を表す。方程式の各 θ に対して (r, θ) を計算し、画面の XY 座標に変換して線でつなぐと、あの心形曲線が描ける。

**フレームレートロック**：`frameDelay = 1000 / 16` により、各フレームの最小間隔を約 62ms に制御している。アニメーションを速くしたい場合は `+= 6.0f` のステップ値を大きくする。より滑らかにしたい場合は targetFPS を 30 に上げてもよいが、CPU 負荷が増える。

**書き込みパーティション**：Arduino IDE → ツール → Partition Scheme で **Huge APP (3MB No OTA)** を選択すること。115KB の Canvas には十分な SRAM が必要で、デフォルトのパーティションではヒープ容量不足に陥ることがある。

---

## よくある問題のトラブルシューティング

焦らないで。90% の問題は以下の場所にある：

**通電しても画面が真っ暗、シリアルにもエラーなし**
まず BL ピンを確認。バックライトが High になっていないのが最も一般的な原因。GPIO7 で `digitalWrite(TFT_BL, HIGH)` が実行されているか確認するか、BL ジャンパーを直接 3.3V に接続してコードの問題を切り分ける。

**画面は点灯するが全面が白/赤/ノイズ**
SPI の配線順序が間違っている。CS と DC が最も混同しやすい（どちらも制御線で見た目が同じ）。コード内のマクロ定義（CS=GPIO9, DC=GPIO10）と照合し、配線表ではなくコードを正とすること。

**コンパイルエラー：`BLACK was not declared in this scope`**
使用している Arduino_GFX のバージョンが 1.3 以上の場合、新版ではカラーマクロのグローバルエクスポートが廃止されている。コード先頭の `#ifndef BLACK` のセクションは必ず残すこと。削除してはいけない。

**Canvas のメモリ割り当てに失敗、シリアルに直接描画のメッセージが表示される**
利用可能な SRAM が 115KB に満たないということ。以下を確認：①パーティションで Huge APP を選択しているか。②他の場所で大きな配列がメモリを占有していないか。③稀に、開発ボードの PSRAM が有効になっていないケースがある（Board 設定で PSRAM を有効にする必要がある）。

**アニメーションがカクつく、16fps に見えない**
`loop()` の中に `delay()` を入れていないか？ 入れているなら削除すること。フレームレート制限はすでに `millis()` で実装されており、両方を重ねるとフレーム間隔が倍になってしまう。

---

## FAQ

**Q：CS、DC ピンを他の GPIO に変更できるか？**
A：できる。コード先頭の `#define TFT_CS` と `#define TFT_DC` を変更すればよい。空いている GPIO なら何でも使える。SCL と SDA はハードウェア SPI ピン（ESP32-S3 のデフォルト SPI2：SCLK=12、MOSI=11）の使用を推奨。最高速度が出る。他のピンに変更するとソフトウェア SPI にフォールバックし、速度が明確に低下する。

**Q：ディスプレイの対応リフレッシュレートは？**
A：GC9A01 の SPI インターフェースは理論上最高クロック 80MHz で、フルスクリーン 240×240 のリフレッシュレートは約 40fps が上限。本コードでは中低端の ESP32-S3 モジュールでも CPU に余裕を持たせるため 16fps に固定している。ボードの動作周波数が 240MHz であれば、`targetFPS` を 30～40 に引き上げても問題ない。

**Q：2 枚のディスプレイを同時に駆動できるか？**
A：できる。2 枚のディスプレイで SCL/SDA を共有し、それぞれに独立した CS ピンを割り当てる。2 つの `Arduino_GC9A01` オブジェクトを個別にインスタンス化し、CS を切り替えてアクティブなディスプレイを切り替える。ただしメモリに注意：2 つの Canvas で合計 230KB の SRAM が必要になるため、PSRAM の有効化が必須。

**Q：電源は 3.3V と 5V のどちらを使うべきか？**
A：GC9A01 モジュールの動作電圧は 3.3V なので、ESP32-S3 の 3.3V ピンに直接接続する。5V を接続するとドライバチップが破損するので絶対にやめること。

**Q：中国語文字を表示するにはどうすればよいか？**
A：Arduino_GFX_Library はデフォルトで ASCII フォントのみ内蔵している。中国語の表示には追加のフォントファイル（U8g2 フォントなど）か、LVGL フレームワークの使用が必要。フォントデータは Flash の使用量が大幅に増えるため、LVGL + SPIFFS の構成を推奨。別記事で解説する予定。

**Q：GC9A01 ディスプレイには音声出力機能がなく、表示のみだが、I2S オーディオプロジェクトとどう関係があるのか？**
A：関係ない。GC9A01 は純粋なディスプレイであり、SPI インターフェースは画像データのみを転送する。同時にオーディオを再生したい場合は、別途 I2S DAC モジュール（MAX98357A など）が必要。両者は完全に独立して動作し、ピンも干渉しない。

---

## 応用アイデア

- **アナログ時計の文字盤**に改造：目盛りと針を描画し、DS3231 RTC モジュールでリアルタイムの時刻を読み取る
- **ローズ曲線モード**を追加：`showTangent` を false に変更し、曲線を `r = a * sin(k * θ)` に切り替える。パラメータ k の値を変えると花びらの数も変わる
- **ボタンでアニメーションテーマを切り替え**：3 つのボタンで心形線 / ローズ曲線 / リサージュ図形を切り替え表示
- **ESP32 Wi-Fi と組み合わせる**：天気 API からデータを取得し、円形ディスプレイのダッシュボードに温度・湿度を表示
- 円形ディスプレイを 2 個購入する：

---

## 参考資料

- [GC9A01 ドライバチップデータシート（Galaxycore 公式）](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub（moononournation）](https://github.com/moononournation/Arduino_GFX)
- [Espressif ESP32-S3 製品ページ](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
- [ESP32 Arduino Core 3.x リリースノート](https://github.com/espressif/arduino-esp32/releases)
