---
title: "ESP32-S3 + GC9A01 + MPU6050 デジタル水準器の作り方｜SPI + I2C + Arduino"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-03
intro: "ESP32-S3 で GC9A01 円形 LCD と MPU6050 6軸センサーを駆動し、ピッチ角・ロール角・温度をリアルタイム表示する、見た目も実用性も兼ね備えたデジタル水準器を作ります。"
image: "https://img.lingflux.com/2026/06/64f482f7efccfdc6b16f216a95efc28e.jpg"
---

# ESP32-S3 + GC9A01 + MPU6050 デジタル水準器の完全ガイド（SPI + I2C + Arduino）

難易度：⭐⭐☆☆☆（初心者でも挑戦可能）
所要時間：約45分
テスト環境：Arduino IDE 2.3.8 ｜ Arduino_GFX_Library v1.6.5 ｜ MPU6050_light v1.2.1

---

> **一言で言うと**：ESP32-S3 で GC9A01 円形 TFT + MPU6050 6軸センサーを駆動し、リアルタイムバブル水準器を作ります。バブルの色は傾き角度に応じて変化（緑→黄→赤）。完全な配線表と Arduino コード付き。

---

> **TL;DR（クイックスタート）：**
>
> 1. MPU6050 配線：SDA → GPIO 15、SCL → GPIO 16、AD0 → GND（I2C アドレス固定 0x68）
> 2. GC9A01 配線：CLK → GPIO 12、MOSI → GPIO 11、CS → GPIO 9、DC → GPIO 10、RST → GPIO 18、BL → GPIO 7
> 3. ライブラリのインストール：`GFX Library for Arduino`（作者 moononournation）+ `MPU6050_light`（作者 rfetick）
> 4. コードを書き込み、電源投入後**水平な場所で約1秒静置**してキャリブレーション完了を待ち、その後自由に傾けてバブルの動きを確認

---

## はじめに

棚を素手で取り付けて、「だいたい水平かな」と思ったのに、物を置いたら全部片側に滑っていった経験はありませんか？

私もそんな一人です。伝統的な水準器が手元になく、パーツ箱を漁ってみたら——GC9A01 円形スクリーンと MPU6050 が埃を被って転がっていました。この2つを組み合わせれば、デジタル水準器の材料がすべて揃うことに気づきました。

さらに素晴らしいのは、円形スクリーンが水準器の表示として視覚的に完璧にマッチすること。バブルが中央 = 緑色、少しズレ = 黄色、傾きすぎ = 赤色。説明書なしでも一目でわかります。

本記事の目標：**ゼロから始めて、配線 → ライブラリインストール → コード書き込み → バブルの動作確認**まで、手順通りに進めれば確実に再現できます。

---

## 動作イメージ

![](https://img.lingflux.com/2026/06/09a4ed83eaa702df1ded539d608c9323.jpg)

スクリーンには以下の4つの情報がリアルタイムで表示されます：

- **中央バブル**：デバイスの傾きに追従して移動、3段階の色で状態を表示（緑 = 水平 / 黄 = わずかな傾き / 赤 = 明らかな傾き）
- **合成傾斜角**（°）：Pitch と Roll の合成値、大きい文字で表示
- **Pitch / Roll 個別値**：ピッチ角とロール角それぞれの読み取り値
- **チップ温度**：MPU6050 内蔵温度センサーの読み取り値（室温より高めになるのは正常、後で説明します）


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30s2V_TAoMo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## 使用パーツ

### GC9A01 円形 TFT ディスプレイ

**わかりやすく言うと、わざわざ円形にカットされたスマホ画面**です。240×240 の解像度は最高というわけではありませんが、丸いガラスをテーブルに置くと、水準器のダイヤルにうってつけです。

| パラメータ | 数値 |
| --- | --- |
| 解像度 | 240 × 240 px（円形表示領域） |
| インターフェース | SPI（最大 80 MHz） |
| 電源 | 3.3V |
| 色深度 | 65K 色（RGB565） |
| パネルタイプ | IPS |

選んだ理由：円形ダイヤルはバブル水準器のデザインと天然に相性が良く、SPI 高速インターフェースで 20fps アニメーションも余裕です。

### MPU6050 6軸慣性センサー

**スマホのジャイロスコープと加速度センサーを1つにまとめたもの**です。スマホの自動画面回転や歩数計に使われているのと同じタイプのチップ。MPU6050 は3軸加速度センサー（傾き方向を検出）と3軸ジャイロスコープ（回転速度を検出）を4mm × 4mm の小さなチップに詰め込み、おまけで温度センサーも内蔵しています。

| パラメータ | 数値 |
| --- | --- |
| 加速度レンジ | ±2 / ±4 / ±8 / ±16 g（設定可能） |
| ジャイロレンジ | ±250 / ±500 / ±1000 / ±2000 °/s（設定可能） |
| ADC 分解能 | 16 bit |
| インターフェース | I2C（最大 400 kHz ファストモード） |
| 電源 | 3.3V（VDD 範囲：2.375 ～ 3.46V） |
| I2C アドレス | 0x68（AD0 = GND）/ 0x69（AD0 = VCC） |

選んだ理由：価格が非常に安く、ライブラリのサポートも充実。`MPU6050_light` がセンサーフュージョン済みの角度を直接出力してくれるので、カルマンフィルタを自作する必要がありません。

---

## パーツリスト（BOM）

| パーツ | 型番 / スペック | 数量 |
| --- | --- | --- |
| メインボード | ESP32-S3 | 1 |
| 円形 TFT ディスプレイ | GC9A01 240×240 IPS | 1 |
| 6軸センサー | MPU6050 モジュール | 1 |
| ジャンパーワイヤー | デュポンワイヤー | 適量 |

---

## ピン配置

### GC9A01 ピン

| ピンラベル | 機能 |
| --- | --- |
| VCC | 3.3V メイン電源 |
| GND | グラウンド |
| SCL / CLK | SPI クロック（SCLK） |
| SDA / MOSI | SPI マスターアウトスレーブインデータ |
| CS | チップセレクト（Low アクティブ） |
| DC | データ / コマンド切替 |
| RST | ハードウェアリセット（Low アクティブ） |
| BL | バックライト制御 |

### MPU6050 ピン

| ピンラベル | 機能 |
| --- | --- |
| VCC | 3.3V メイン電源 |
| GND | グラウンド |
| SDA | I2C データライン |
| SCL | I2C クロックライン |
| INT | 割り出力（ポーリングモードでは未接続） |
| AD0 | I2C アドレス選択（GND 接続 = 0x68） |
| XDA / XCL | セカンダリ I2C インターフェース（本プロジェクトでは未使用） |

---

## 配線

> 下表の通りに1行ずつ配線し、接続するたびにチェックを入れると、トラブルシューティングの時間を80%減らせます。

### MPU6050 → ESP32-S3

| MPU6050 ピン | ESP32-S3 ピン | 説明 |
| --- | --- | --- |
| VCC | 3.3V | メイン電源 |
| GND | GND | グラウンド共通 |
| SDA | GPIO 15 | I2C データライン |
| SCL | GPIO 16 | I2C クロックライン |
| AD0 | GND | I2C アドレスを 0x68 に固定 |
| INT / XDA / XCL | 未接続 | 本プロジェクトでは不要 |

**I2C プルアップ抵抗について**：標準的な做法として、SDA と SCL にそれぞれ 4.7kΩ のプルアップ抵抗を 3.3V に接続すると、高速読み取り時のノイズ耐性が明らかに向上します。本例では省略していますが、製品化する場合は追加を推奨します。

### GC9A01 → ESP32-S3

| GC9A01 ピン | ESP32-S3 ピン | 説明 |
| --- | --- | --- |
| VCC | 3.3V | メイン電源 |
| GND | GND | グラウンド共通 |
| SCL / CLK | GPIO 12 | SPI クロック |
| SDA / MOSI | GPIO 11 | SPI データ |
| CS | GPIO 9 | チップセレクト |
| DC | GPIO 10 | データ / コマンド切替 |
| RST | GPIO 18 | ハードウェアリセット |
| BL | GPIO 7 | バックライト（オプション。モジュールによってはこのピンがない場合があります。コードで High/Low 制御、または直接 3.3V に接続して常時点灯） |



---

## 必要なライブラリ

Arduino IDE のメニュー **ツール → ライブラリを管理** から検索してインストール：

| ライブラリ名 | 作者 | テスト済みバージョン |
| --- | --- | --- |
| GFX Library for Arduino | moononournation | v1.6.5 |
| MPU6050_light | rfetick | v1.2.1 |

バージョンが異なると API の変更によりコンパイルエラーになる可能性があるため、表中のバージョンのインストールを推奨します。インストール後に Arduino IDE を再起動してからプロジェクトを開いてください。



---

## 完全コード

```cpp
/**
 * ESP32-S3 + GC9A01 + MPU6050 デジタル水準器
 * Digital Spirit Level
 *
 * 配線：
 *   GC9A01  → SCL=12, SDA=11, CS=9, DC=10, RST=18, BL=7
 *   MPU6050 → SDA=15, SCL=16, AD0=GND（I2C アドレス 0x68）
 */

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <MPU6050_light.h>

// ---- 色定義（RGB565 フォーマット）----
#define COLOR_BG       0x0863   // ダーク背景
#define COLOR_GRID     0x1A69   // 目盛りグリッド線
#define COLOR_GREEN    0x07E6   // バブル中央 → 緑色
#define COLOR_YELLOW   0xFEA0   // わずかな傾き → 黄色
#define COLOR_RED      0xF820   // 傾き過大 → 赤色
#define COLOR_TEXT     0xC618   // 通常テキスト
#define COLOR_ACCENT   0xFD20   // 中心十字線

// ---- GC9A01 SPI ピン ----
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---- MPU6050 I2C ピン（配線表と必ず一致させること）----
#define MPU_SDA  15   // SDA → GPIO 15
#define MPU_SCL  16   // SCL → GPIO 16

// ---- ディスプレイドライバの初期化 ----
// 手順1：SPI バスを作成、パラメータ順：DC, CS, SCK, MOSI, MISO
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA,
    GFX_NOT_DEFINED
);
// 手順2：GC9A01 スクリーンオブジェクトを作成（rotation=0、IPS パネル=true）
Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST, 0, true
);
// 手順3：240×240 オフスクリーン Canvas を作成（ダブルバッファ、画面のティアリング防止）
Arduino_Canvas *canvas = new Arduino_Canvas(
    240, 240, gfx
);

// ---- MPU6050 ----
MPU6050 mpu(Wire);

// ---- フレームレート制御 ----
const int16_t cx = 120, cy = 120;    // スクリーン中心座標（ピクセル）
unsigned long lastFrame = 0;
const int frameDelay = 1000 / 20;    // 目標フレームレート：20fps → 1フレーム 50ms

// ---- 関数前方宣言 ----
void drawGrid();
void drawBubble(float pitch, float roll);
void drawReadouts(float pitch, float roll, float temp);

// =============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("=== ESP32-S3 デジタル水準器 起動中 ===");

    // 手順1：ディスプレイとバックライトの初期化
    gfx->begin();
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);    // バックライト点灯
    canvas->begin();
    Serial.println("[OK] ディスプレイ初期化完了");

    // 手順2：I2C 初期化、バススキャン（デバッグ時に配線確認に便利）
    Wire.begin(MPU_SDA, MPU_SCL);
    Serial.print("[DBG] I2C バススキャン SDA=");
    Serial.print(MPU_SDA);
    Serial.print(" SCL=");
    Serial.println(MPU_SCL);

    byte found = 0;
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            Serial.print("  I2C デバイス発見、アドレス：0x");
            Serial.println(addr, HEX);
            found++;
        }
    }
    if (found == 0) {
        Serial.println("[ERROR] I2C デバイスが見つかりません！配線を確認してください。");
    }

    // 手順3：MPU6050 初期化
    byte status = mpu.begin();
    if (status == 0) {
        Serial.println("[OK] MPU6050 接続成功");
    } else {
        Serial.println("[ERROR] MPU6050 が応答しません！配線または I2C アドレスを確認してください。");
    }

    // 手順4：ジャイロスコープ自動キャリブレーション（実行中はデバイスを水平に静置して約1秒待つ）
    Serial.println("[DBG] キャリブレーション中、デバイスを水平に保ち、動かさないでください...");
    canvas->fillScreen(COLOR_BG);
    canvas->setTextColor(COLOR_TEXT);
    canvas->setTextSize(1);
    canvas->setCursor(60, 110);
    canvas->print("Calibrating...");
    canvas->setCursor(55, 125);
    canvas->print("Keep device flat");
    canvas->flush();

    delay(1000);
    mpu.calcOffsets();    // 加速度センサーとジャイロのゼロオフセットを自動計算

    Serial.print("[DBG] 加速度オフセット: ");
    Serial.print(mpu.getAccXoffset());  Serial.print(", ");
    Serial.print(mpu.getAccYoffset());  Serial.print(", ");
    Serial.println(mpu.getAccZoffset());
    Serial.print("[DBG] ジャイロオフセット: ");
    Serial.print(mpu.getGyroXoffset()); Serial.print(", ");
    Serial.print(mpu.getGyroYoffset()); Serial.print(", ");
    Serial.println(mpu.getGyroZoffset());
    Serial.println("[OK] キャリブレーション完了、動作開始！");
}

// =============================================================
static int logCnt = 0;    // デバッグログ間引きカウンター

void loop() {
    unsigned long now = millis();
    if (now - lastFrame < frameDelay) return;    // フレームレート間引き
    lastFrame = now;

    // 手順1：センサー読み取り
    mpu.update();
    float pitch = mpu.getAngleY();     // ピッチ角（前後の傾き）
    float roll  = -mpu.getAngleX();    // ロール角（左右の傾き、視覚方向に合わせるため符号反転）
    float temp  = mpu.getTemp();       // チップ温度（環境温度より高めになるのは正常）

    // デバッグログ：20フレームごと（約1秒）に1回出力、フレームレートに影響なし
    if (++logCnt >= 20) {
        logCnt = 0;
        Serial.print("[DBG] pitch="); Serial.print(pitch, 2);
        Serial.print(" roll=");       Serial.print(roll,  2);
        Serial.print(" temp=");       Serial.print(temp,  1);
        Serial.print(" | accX=");     Serial.print(mpu.getAccX(), 2);
        Serial.print(" accY=");       Serial.print(mpu.getAccY(), 2);
        Serial.print(" accZ=");       Serial.println(mpu.getAccZ(), 2);
    }

    // 手順2：クリッピング——±45° を超えるとバブルが端に張り付く、円の外には出ない
    pitch = constrain(pitch, -45.0f, 45.0f);
    roll  = constrain(roll,  -45.0f, 45.0f);

    // 手順3：現在のフレームを描画
    canvas->fillScreen(COLOR_BG);        // キャンバスクリア
    drawGrid();                          // 目盛りグリッド
    drawBubble(pitch, roll);             // バブル
    drawReadouts(pitch, roll, temp);     // 数値テキスト
    canvas->flush();                     // スクリーンに転送
}

// =============================================================
// 背景の目盛りサークルと中心十字照準を描画
void drawGrid() {
    canvas->drawCircle(cx, cy,  25, COLOR_GRID);
    canvas->drawCircle(cx, cy,  50, COLOR_GRID);
    canvas->drawCircle(cx, cy,  80, COLOR_GRID);
    canvas->drawCircle(cx, cy, 105, COLOR_GRID);
    canvas->drawFastHLine(15, cy,  210, COLOR_GRID);
    canvas->drawFastVLine(cx, 15,  210, COLOR_GRID);
    // 中心十字照準（アクセント色を使用、グリッドより目立つ）
    canvas->drawFastHLine(cx - 5, cy,     10, COLOR_ACCENT);
    canvas->drawFastVLine(cx,     cy - 5, 10, COLOR_ACCENT);
}

// pitch/roll 角度に基づいてバブル位置をマッピングし、距離に応じて着色
void drawBubble(float pitch, float roll) {
    // ±45° を ±90px オフセットに線形マッピング
    int16_t bx = cx + (int16_t)(roll  / 45.0f * 90.0f);
    int16_t by = cy + (int16_t)(pitch / 45.0f * 90.0f);

    // バブルと中心のピクセル距離を計算し、カラーレベルを決定
    float dist = sqrt((float)((bx - cx) * (bx - cx) + (by - cy) * (by - cy)));
    uint16_t color;
    if      (dist < 10) color = COLOR_GREEN;    // ≈ ±5° 以内：水平
    else if (dist < 40) color = COLOR_YELLOW;   // ≈ ±20° 以内：わずかな傾き
    else                color = COLOR_RED;       // ±20° 超過：明らかな傾き

    // 中心からバブルへのライン + 塗りつぶしバブル + 白い枠線
    canvas->drawLine(cx, cy, bx, by, COLOR_GRID);
    canvas->fillCircle(bx, by, 8, color);
    canvas->drawCircle(bx, by, 8, 0xFFFF);
}

// 角度数値、ステータステキスト、温度を描画
void drawReadouts(float pitch, float roll, float temp) {
    float total = sqrt(pitch * pitch + roll * roll);    // 合成傾斜角

    canvas->setTextSize(1);
    canvas->setTextColor(COLOR_TEXT);

    // 上部タイトル
    canvas->setCursor(55, 18);
    canvas->print("DIGITAL LEVEL");

    // 合成角度：大フォント、バブルと同じ色
    canvas->setTextSize(2);
    uint16_t color;
    if      (total < 1)  color = COLOR_GREEN;
    else if (total < 10) color = COLOR_YELLOW;
    else                 color = COLOR_RED;
    canvas->setTextColor(color);
    canvas->setCursor(75, 155);
    canvas->print(total, 1);
    canvas->print((char)247);    // ° 記号（ASCII 247）

    // ステータステキスト
    canvas->setTextSize(1);
    canvas->setCursor(80, 178);
    if      (total < 1)  canvas->print("  LEVEL");
    else if (total < 10) canvas->print(" TILTED");
    else                 canvas->print("  STEEP");

    // Pitch / Roll 個別読み取り値
    canvas->setTextColor(COLOR_TEXT);
    canvas->setCursor(20, 195);
    canvas->print("P:"); canvas->print(pitch, 1);
    canvas->print(" R:"); canvas->print(roll,  1);

    // 温度（チップジャンクション温度、室温より高めになるのは正常）
    canvas->setCursor(60, 210);
    canvas->print("T:"); canvas->print(temp, 1);
    canvas->print("C");
}
```

---

## コードの解説

**初期化処理（setup）**

setup では4つのステップを順番に実行します：ディスプレイ初期化 → I2C スキャン → MPU6050 初期化 → ジャイロスコープキャリブレーション。この時点でモジュールがどの向きで設置されていても、その位置が中心点として設定されます。

ディスプレイには `Arduino_Canvas` でオフスクリーンダブルバッファリングを使用——すべての描画操作がまずメモリ上で完了し、最後に `flush()` で一括してスクリーンに転送されるため、ティアリングや中間フレームは発生しません。

I2C スキャンの部分は、発見されたデバイスのアドレスをシリアルに出力します。初回のデバッグ時は、シリアルモニタを開いて MPU6050 が正しく認識されているか確認できます（正常なら `I2C デバイス発見、アドレス：0x68` と表示されます）。

`mpu.calcOffsets()` は自動キャリブレーションで、約1秒間実行されます。その間、デバイスを水平に静置する必要があります。**電源を入れるたびにキャリブレーションが実行される**ため、起動ごとに平らな場所に置き、画面のプロンプトが消えるのを待ってから使用してください。

**メインループ（loop）**

フレームレートは 20fps に固定。各フレームで4つの処理を行います：センサー読み取り → クリッピング → 描画 → スクリーン転送。

`roll = -mpu.getAngleX()` の前にマイナス符号を付けています——これは、スクリーン上のバブルの移動方向と実際の傾き方向を一致させるためです。反転しないとバブルが逆方向に動いてしまいます。実装の向きが異なる場合は、符号を適宜調整してください。

バブルの色は3段階で判定：中心からの距離が 10px 未満で緑色、40px 未満で黄色、それ以上で赤色。およそ ±5° 以内、±20° 以内、±20° 超過にそれぞれ対応します。

---

## トラブルシューティング

落ち着いて。問題の90%は配線とアドレスにあります：

**スクリーンが全面白または全面黒で、何も表示されない**

まず VCC が 3.3V に接続されていて 5V ではないことを確認（GC9A01 は高電圧に耐えられません）。BL バックライトピンが接続されているかも確認。次に CS、DC、RST の3本が間違っていないかチェック——CS が間違っているとスクリーンが応答せず、RST が浮いているとリセット状態のままになります。まず BL を直接 3.3V に接続して常時点灯にし、スクリーンが白く光るならスクリーン自体は正常で、SPI の初期化に失敗しています。

**シリアルに `[ERROR] I2C デバイスが見つかりません` と表示される**

テスターで MPU6050 の VCC ピンに 3.3V が来ているか確認。SDA と SCL が逆になっていないかも確認（SDA → GPIO 15、SCL → GPIO 16）。**AD0 は必ず GND に明示的に接続**してください。浮いている状態では一部モジュールでアドレスが不安定になり、I2C バスが応答しません。

**バブルが絶えずブレて安定しない**

電源投入時のキャリブレーション中にデバイスが完全に静置されていません。再起動して、平らな机の上に置き、画面のキャリブレーションプロンプトが消えるのを待ってから使用してください。机自体が振動している場合（近くにプリンターやファンがあるなど）は、場所を変えてみてください。

**Pitch または Roll の方向が逆**

開発ボードの取り付け方向に応じて、コード内の対応する角度の符号を調整してください：`pitch = mpu.getAngleY()` を `pitch = -mpu.getAngleY()` に変更するか、`roll` の行を調整して方向が正しくなるまで試してください。

**温度が室温より10数度高い**

正常な動作です。MPU6050 が測定しているのはチップのジャンクション温度で、環境温度より 10～20°C 高くなるのはよくあること。参考値として扱ってください。正確な環境温度が必要な場合は、独立したセンサー（DS18B20 など）を追加してください。

**画面がちらつく、またはティアリングが見える**

コードでは `Arduino_Canvas` のダブルバッファリングを有効にしているため、通常はティアリングは発生しません。それでも問題がある場合は、SPI デュポンワイヤーが緩んでいないか確認し、ケーブルは 20cm 以内に抑え、必要に応じて電源ピン近くに 100nF のデカップリングコンデンサを追加してください。

---

## FAQ

**Q：MPU6050 の角度更新頻度は？**
A：`MPU6050_light` は I2C 400kHz ファストモードで読み取り、生データのサンプリングレートは最大 1kHz です。本コードではフレームレートを 20fps に制限しているため、実際の更新は 20Hz です。より高いリフレッシュレートが必要な場合は `frameDelay` を小さくしてください。実測では 40fps までは安定動作します（SPI のスクリーン転送速度が制限要因）。

**Q：他の GPIO ピンに変更できる？**
A：はい。コード先頭の `#define` マクロを変更してください。GC9A01 の SPI ピンは ESP32-S3 のハードウェア SPI（GPIO 11 / 12 は SPI2、パフォーマンス最適）を選ぶことを推奨。MPU6050 の I2C ピンは任意の GPIO が使用可能で、コードと配線が一致していれば問題ありません。

**Q：GC9A01 を角型スクリーンに変更できる？**
A：はい。`Arduino_GC9A01` を対応するドライバクラスに置き換え（例：ST7789 なら `Arduino_ST7789`）、`Arduino_Canvas` の幅・高さと中心座標 `cx/cy` を変更すれば OK です。描画ロジックはそのまま使えます。

**Q：ESP32-S3 の 3.3V で GC9A01 と MPU6050 を同時に駆動できる？**
A：可能です。GC9A01 のバックライト電流は約 20mA、MPU6050 の典型的な消費電力は 3.5mW（約 1mA）で、合計しても開発ボードの 3.3V ピンの通常電流制限 300～500mA を大幅に下回ります。

**Q：同じ I2C バスに MPU6050 を2つ接続できる？**
A：はい。一方の AD0 を GND（アドレス 0x68）、もう一方の AD0 を VCC（アドレス 0x69）に接続し、同じ SDA/SCL を共有します。コードで2つの `MPU6050` オブジェクトを宣言し、それぞれ異なるアドレスで初期化してください。

**Q：電源を切るたびにキャリブレーションが必要？**
A：はい。本コードでは起動ごとに `setup()` で `mpu.calcOffsets()` を呼び出して動的キャリブレーションを実行します。固定設置で使用する場合は、オフセット値を EEPROM に保存し、次回起動時に直接読み込むことで、キャリブレーションの待ち時間を省略できます。

---

## 応用アイデア

- ボタンを追加して表示モードを切替（水準器 / リアルタイム角度グラフ / 温度計）
- キャリブレーションの基準値を EEPROM に保存し、固定設置面の角度オフセットを補正
- パッシブブザーを追加し、水平時に通知音を鳴らす
- 円形ダイヤルのスキンを変更して、磁気コンパスや G-Force メーターに改造

---

## 参考文献

- [MPU-6000 / MPU-6050 Product Specification — InvenSense（TDK）](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [GC9A01A Datasheet — Galaxycore](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [MPU6050_light GitHub — rfetick](https://github.com/rfetick/MPU6050_light)
- [ESP32-S3 Technical Reference Manual — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3 Product Page — Espressif](https://www.espressif.com/en/products/socs/esp32-s3)
