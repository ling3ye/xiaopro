---
title: "ESP32-S3 + 0.91インチ OLED で作るデスクトップ Bilibili フォロワー「ストレス解消」カウンター｜バネダンピング物理揺れ付き"
boardId: esp32s3
moduleId: display/oled091-ssd1306
category: esp32
date: 2026-06-27
intro: "ESP32-S3 と 0.91 インチ SSD1306 OLED（128×32）で、デスクトップ Bilibili フォロワーカウンターを作ります。数字が変化するとき、滑らかなバネダンピング物理リバウンドアニメーションが付きます。I2C 4線配線 + Arduino C++ の完全なコードと、つまずき回避ガイド付き。"
image: "https://img.lingflux.com/2026/06/e53fb5a7bdaee8448584fb9f21aa504d.jpg"
---

> **一言でいうと**：ESP32-S3 + 0.91" OLED + Bilibili API で、「バネダンピングリバウンド」するデスクトップフォロワーカウンターを作り、スマホを取り出してデータを確認する手間をなくします。

# ESP32-S3 + 0.91" OLED で作るデスクトップ Bilibili フォロワー「ストレス解消」カウンター（バネダンピング物理揺れ付き！）

難易度：⭐⭐☆☆☆（初心者でも挑戦可）
想定時間：30 分
テスト環境：Arduino IDE 2.3.8 + ESP32 ボードサポートパッケージ v3.3.10 + U8g2 v2.36.19 + ArduinoJson v7.4.3

> **TL;DR（クイックスタート）：**
>
> 1. 配線：ESP32-S3 GPIO 14 → OLED SDA、GPIO 13 → OLED SCL、さらに 3.3V と GND を接続。
> 2. 確認：画面への電源供給が正常か確認。I2C ピンの逆接続に注意。
> 3. ライブラリのインストール：Arduino IDE で `U8g2`（作者: oliver）と `ArduinoJson`（作者: Benoit Blanchon）を検索してインストール。
> 4. 設定の変更：完全なコードの中の Wi-Fi の SSID・パスワードと Bilibili UID を自分のものに書き換え、そのまま書き込めば、滑らかな機械的リバウンドアニメーションとともにフォロワー数が画面に躍り出ます！

---

## はじめに

この小さな OLED スクリーンを使って、癖になる、癒やされるデスクトップ Bilibili フォロワーカウンターを作りました！もうスマホを開いてデータを確認する必要はありません。

---

## 完成イメージ

最終的に実現したのは、エレガントな三段構成の洗練されたレイアウトです。左側には縦書きの「FANS」ラベルと機械的な矢印マーク、中央には今回の実験の魂である「24ピクセル高・数字のみの太字・局所クリップウィンドウ付き」**物理ダンピングスクロールホイールの大数字**、右側には本日のフォロワー増減数（当日の増減を自動計算し、上下の三角矢印付き）と、システムの Wi-Fi 信号強度、そしてハートビートインジケーターです。

![](https://img.lingflux.com/2026/06/13648c6923d1cb24486cb082105d8d59.jpg)

---

## 使用パーツ

### 0.91" OLED スクリーン（SSD1306）

本プロジェクトでコア開発ボード（ESP32-S3）の次に重要なパーツが、この **0.91" OLED スクリーン** です。

0.91" OLED スクリーンは「自発光の同時通訳者」のような存在で、ESP32-S3 がネットワークから取得したフォロワー数字を、目に見えるピクセルのドットマトリクスにリアルタイムで翻訳してくれます。各ピクセルが自ら発光するため、従来の LCD のような分厚いバックライトパネルが不要で、コントラストが極めて高く、黒は深く、輝きは鮮烈です。本プロジェクトでこれを選んだ理由は、サイズが非常にコンパクトで手頃な価格、そして I2C で配線すればたった 4 本のケーブルで駆動できるため、デスクトップの洗練された小物置きとして最適だからです。

| 主要スペック | 値 |
| --- | --- |
| ドライバチップ | SSD1306 |
| 解像度 | 128 x 32 ピクセル |
| 通信インターフェース | I2C (IIC) |
| 動作電圧 | 3.3V ~ 5V |
| 表示色 | 通常は純白または純青 |

---

## 部品リスト（BOM）

| パーツ名 | スペック/型番 | 数量 | 用途 |
| --- | --- | --- | --- |
| ESP32-S3 開発ボード | 任意の標準デュアル Type-C インターフェース版 | 1 | メインコントロール。ネットワークからデータを取得し物理アニメーションを計算 |
| 0.91" OLED モジュール | SSD1306 ドライバ / 4 ピン I2C インターフェース | 1 | 画面表示と物理ウィンドウアニメーションの提示 |
| ジャンパーワイヤー | メス-メス / オス-メス（開発ボードに依存） | 4 | 開発ボードとスクリーンのピンを接続 |

---

## ピン配置と配線

> 💡 **実用的なアドバイス：** 配線完了後、下表と照らし合わせて 1 つずつ確認することをおすすめします。音が出ない、画面が真っ暗、デバイスが異常発熱するといった問題の 80% は配線ミスに起因します。10 秒多く確認するだけで、トラブルシューティングの時間を大幅に節約できます！

| OLED スクリーンピン | ESP32-S3 ピン | ピン機能の説明 |
| --- | --- | --- |
| GND | GND | グラウンド（共通言語の基準線） |
| VCC | 3.3V（または 3V3） | 電源入力 |
| SCL | GPIO 13 | I2C クロック信号線 |
| SDA | GPIO 14 | I2C データ信号線 |

---

## 必要なライブラリ

Arduino IDE 2.x で、左側の「ライブラリマネージャ」アイコンをクリックし（または `Ctrl+Shift+I`）、以下のオープンソースライブラリのテスト済みバージョンをそれぞれ検索してインストールしてください。

1. **U8g2**（作者：oliver）—— テスト済みバージョン：`v2.36.19` 以上。OLED スクリーンの駆動に使用し、精密なクリップウィンドウ（Clip Window）をサポート。
2. **ArduinoJson**（作者：Benoit Blanchon）—— テスト済みバージョン：`v7.4.3`。Bilibili API が返す JSON データの解析に使用。

---

## 完全なコードと解説

以下の完全なコードを Arduino IDE にコピーしてください。書き込み前に、**必ずコード内の `const char* ssid` と `password` をご自宅の Wi-Fi の SSID・パスワードに変更し、`uid` を監視したい Bilibili ユーザーの UID に置き換えてください**。

```cpp
/**
 * =========================================================================
 * ESP32-S3 0.91" OLED (128x32 SSD1306) Bilibili フォロワー表示器 究極融合版
 * =========================================================================
 * 特徴：洗練された三段構成レイアウト + 本格的なバネダンピングリバウンド物理揺れエンジン
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Preferences.h>
#include <time.h>

// ================== デバッグスイッチ ==================
#define DEBUG_SIMULATE   0     // 【重要】1=シミュレーションデータを有効化(ネット接続不要でアニメーションをテスト), 0=実APIを使用
#define SIM_INTERVAL_MS  2000  // シミュレーションデータの変化間隔(ms)
#define SIM_START_VALUE  9985  // シミュレーション開始フォロワー数 (9985に設定すると5桁へのジャンプ時の揺れエフェクトを素早く観察可能)

// ================== ユーザー設定 ==================
const char* ssid     = "YOUR_WIFI_SSID";      // 自分の Wi-Fi 名に変更
const char* password = "YOUR_WIFI_PASSWORD";  // 自分の Wi-Fi パスワードに変更
const char* uid      = "YOUR_BILIBILI_UID";   // 監視したい Bilibili UID に変更

String biliApiUrl = "https://api.bilibili.com/x/relation/stat?vmid=" + String(uid);
const unsigned long FETCH_INTERVAL = 30 * 60 * 1000; // 30分ごとにネットワークからデータを更新

#define OLED_SDA 14
#define OLED_SCL 13
#define SCREEN_CONTRAST 255

// アニメーションパラメータ
#define SCROLL_EASING    0.18f   // 基本バネ引張り係数
#define ANIM_FPS         60      // アニメーションフレームレート
#define ANIM_INTERVAL    (1000/ANIM_FPS)

// U8g2 コンストラクタを初期化
U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

// ================== 状態変数 ==================
long targetFollowers = 0;
long todayBaseFollowers = 0;
long todayAdded = 0;
bool isInitialFetch = true;
bool connectionError = false;

unsigned long lastFetchTime = 0;
unsigned long lastAnimTime = 0;
unsigned long lastSimTime = 0;

Preferences preferences; // 今日の初期フォロワー数を Flash に安全に保存し、停電でも消えないようにする

// ================== コア物理ダンピング振動エンジン ==================
#define MAX_DIGITS 7

class DigitWheel {
public:
  float currentY = 0.0f;
  int   targetDigit = 0;
  float velocity = 0.0f;  // バネダンピングのコア速度変数

  void update(float easing) {
    float diff = (float)targetDigit - currentY;

    // 最短距離での循環スクロール処理 (0 <-> 9)
    if (diff > 5.0f)  diff -= 10.0f;
    if (diff < -5.0f) diff += 10.0f;

    if (fabs(diff) > 0.005f) {
      // 古典物理モデル：フックの法則 + 粘性ダンピング、滑らかなリバウンドと減衰揺れを生み出す
      float accel = diff * easing - velocity * 0.25f;
      velocity += accel;
      currentY += velocity;

      // 循環範囲の拘束
      while (currentY >= 10.0f) currentY -= 10.0f;
      while (currentY < 0.0f)   currentY += 10.0f;
    } else {
      currentY = (float)targetDigit;
      velocity = 0.0f; // 安定して停止
    }
  }
};

DigitWheel wheels[MAX_DIGITS];

// 前方宣言
void drawUI();
void drawLeftPanel();
void drawBigOdometer();
void drawRightPanel();
void drawWifiIcon(int x, int y);
void fetchBiliData();
void checkNewDayReset();

// ================== 初期化 ==================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Bilibili OLED Monitor Deluxe ===");

  Wire.begin(OLED_SDA, OLED_SCL);
  u8g2.begin();
  u8g2.setContrast(SCREEN_CONTRAST);
  u8g2.enableUTF8Print();

  // 第1ステップ：エレガントな起動画面を描画
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_7x13B_tr);
  u8g2.drawStr(20, 14, "BiliBili");
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(28, 28, "Fan Monitor");
  u8g2.sendBuffer();
  delay(800);

  preferences.begin("bilibili", false);
  todayBaseFollowers = preferences.getLong("base_fans", 0);

#if DEBUG_SIMULATE
  Serial.println("[SIM MODE] Simulation mode active");
  targetFollowers = SIM_START_VALUE;
  if (todayBaseFollowers == 0) {
    todayBaseFollowers = targetFollowers - 10; // 今日すでに+10成長したことにする
  }
  todayAdded = targetFollowers - todayBaseFollowers;
  isInitialFetch = false;
#else
  // 第2ステップ：ローカル無線ネットワークに接続
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(4, 14, "WiFi connecting...");
  u8g2.drawStr(4, 28, ssid);
  u8g2.sendBuffer();

  WiFi.begin(ssid, password);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 30) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK: " + WiFi.localIP().toString());
    // 第3ステップ：時刻サービスを設定し、午前0時の自動リセットに使用
    configTime(8 * 3600, 0, "ntp.aliyun.com", "time.windows.com");
    fetchBiliData();
  } else {
    Serial.println("\nWiFi failed");
    connectionError = true;
    targetFollowers = 0;
  }
#endif
}

// ================== メインループ ==================
void loop() {
  unsigned long now = millis();

#if DEBUG_SIMULATE
  // シミュレーションデータ処理：安定したジャンプで、複数桁のホイールが同時にリバウンドする面白い動きを観察しやすくする
  if (now - lastSimTime >= SIM_INTERVAL_MS) {
    lastSimTime = now;
    int delta = random(-2, 6); // -2 から +5 のランダムな変動増加を生成
    targetFollowers += delta;
    if (targetFollowers < 0) targetFollowers = 0;
    todayAdded = targetFollowers - todayBaseFollowers;
    Serial.printf("[SIM] target=%ld (delta=%+d) today=%+ld\n", targetFollowers, delta, todayAdded);
  }
#else
  // 定期的に実際のネットワークデータを取得
  if (now - lastFetchTime >= FETCH_INTERVAL || lastFetchTime == 0) {
    fetchBiliData();
    lastFetchTime = now;
  }
  checkNewDayReset();
#endif

  // 第4ステップ：コアアニメーションの更新（60FPS のフルフレームで安定動作）
  if (now - lastAnimTime >= ANIM_INTERVAL) {
    lastAnimTime = now;

    // フォロワー総数を各桁に対応する独立したホイールのターゲットに分解
    long temp = targetFollowers;
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      wheels[i].targetDigit = temp % 10;
      temp /= 10;
    }

    // 物理エンジンを更新、上位桁のカスケード遅延を融合し、複数桁の数字の揺れに重なるレイヤー感を持たせる
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      float ease = SCROLL_EASING * (1.0f - i * 0.012f);
      if (ease < 0.07f) ease = 0.07f;
      wheels[i].update(ease);
    }

    // 第5ステップ：全キャンバスのレンダリング出力
    u8g2.clearBuffer();
    drawUI();
    u8g2.sendBuffer();
  }
}

// ================== UI レイアウト描画 (三段構成のクラシックデザイン) ==================
void drawUI() {
  drawLeftPanel();    // 左側の縦書きラベル
  drawBigOdometer();  // 中央の物理ホイール大数字
  drawRightPanel();   // 右側の増減数と信号
}

void drawLeftPanel() {
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(2, 7,  "F");
  u8g2.drawStr(2, 14, "A");
  u8g2.drawStr(2, 21, "N");
  u8g2.drawStr(2, 28, "S");

  u8g2.drawVLine(9, 2, 28); // 縦の区切り線
  u8g2.drawTriangle(11, 14, 11, 18, 14, 16); // 大数字を指す機械的矢印
}

void drawRightPanel() {
  int rx = 102; // 右側パネルの開始 X 軸
  u8g2.drawVLine(rx - 2, 2, 28); // 右の区切り線

  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(rx, 6, "TODAY");

  u8g2.setFont(u8g2_font_5x7_tr);
  char buf[8];
  if (todayAdded >= 0) {
    u8g2.drawTriangle(rx, 14, rx + 4, 14, rx + 2, 10); // 上向き三角
    snprintf(buf, sizeof(buf), "%ld", todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  } else {
    u8g2.drawTriangle(rx, 10, rx + 4, 10, rx + 2, 14); // 下向き三角
    snprintf(buf, sizeof(buf), "%ld", -todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  }

  u8g2.setFont(u8g2_font_4x6_tr);
#if DEBUG_SIMULATE
  u8g2.drawStr(rx, 24, "SIM");
  if ((millis() / 400) % 2) u8g2.drawDisc(rx + 17, 22, 1); // シミュレーションのハートビート点滅
#else
  if (connectionError) {
    u8g2.drawStr(rx, 24, "ERR");
  } else {
    u8g2.drawStr(rx, 24, "ON");
  }
#endif

  drawWifiIcon(rx + 12, 27); // 信号バーを描画
}

void drawWifiIcon(int x, int y) {
#if DEBUG_SIMULATE
  int bars = 3;
#else
  int bars = 0;
  if (WiFi.status() == WL_CONNECTED) {
    int rssi = WiFi.RSSI();
    if (rssi > -60)      bars = 3;
    else if (rssi > -75) bars = 2;
    else                 bars = 1;
  }
#endif
  for (int i = 0; i < 3; i++) {
    int h = (i + 1) * 2;
    if (i < bars) {
      u8g2.drawBox(x + i * 3, y - h, 2, h);
    } else {
      u8g2.drawFrame(x + i * 3, y - h, 2, h);
    }
  }
}

// ================== コアホイールレンダリング (局所 Clip 精密ウィンドウ付き) ==================
void drawBigOdometer() {
  u8g2.setFont(u8g2_font_logisoso24_tn); // 24ピクセル高の超大型ハードコア数字太字

  int charW = 14;      // 1文字あたりの数字の幅
  int areaTop = 4;     // スクロールウィンドウの上端
  int areaBot = 28;    // スクロールウィンドウの下端
  int areaH = areaBot - areaTop; // ウィンドウの有効高さ (24px)
  int baseline = areaBot;        // フォントのベースライン高さ

  // 有効桁数を動的に計算し、完全な左方向の適応型センタリングを実現
  long absVal = targetFollowers;
  int needDigits = 1;
  long t = absVal;
  while (t >= 10) { t /= 10; needDigits++; }
  if (needDigits > MAX_DIGITS) needDigits = MAX_DIGITS;

  int totalW = needDigits * charW;
  int startX = 14 + (88 - totalW) / 2;
  if (startX < 14) startX = 14;

  // 物理リバウンドフィードバックを持つ数字を桁ごとにレンダリング
  for (int idx = 0; idx < needDigits; idx++) {
    int wheelIdx = MAX_DIGITS - needDigits + idx;
    int x = startX + idx * charW;

    float currYVal = wheels[wheelIdx].currentY;
    int digitLower = (int)currYVal;
    int digitUpper = (digitLower + 1) % 10;
    float fraction = currYVal - digitLower;

    // 【コアクリッピング制御】：現在の桁の数字のために局所クリップウィンドウをカスタマイズし、数字が上下の端からはみ出したときに自動的に見えなくする
    u8g2.setClipWindow(x - 1, areaTop, x + charW, areaBot);

    // 現在の数字は引張力を受けて上にスライドアウト
    int yLower = baseline - (int)(fraction * areaH);
    char bufL[2] = { (char)('0' + digitLower), 0 };
    u8g2.drawStr(x, yLower, bufL);

    // 新しい次の数字が下からウィンドウに飛び込み、所定位置に達したときに運動エネルギーに富んだリバウンドを生み出す
    int yUpper = baseline + areaH - (int)(fraction * areaH);
    char bufU[2] = { (char)('0' + digitUpper), 0 };
    u8g2.drawStr(x, yUpper, bufU);

    u8g2.setMaxClipWindow(); // 現在の桁のレンダリング完了後、即座に全画面キャンバスに復元
  }
}

// ================== ネットワークデータ取得 ==================
#if !DEBUG_SIMULATE
void fetchBiliData() {
  if (WiFi.status() != WL_CONNECTED) {
    connectionError = true;
    return;
  }
  Serial.println("Requesting Bilibili API...");
  WiFiClientSecure client;
  client.setInsecure(); // SSL 証明書の厳格な検証をバイパスし、軽量な接続を確保
  HTTPClient http;
  http.begin(client, biliApiUrl);
  http.setUserAgent("Mozilla/5.0 (ESP32)");
  http.addHeader("Referer", "https://space.bilibili.com/");

  int code = http.GET();
  if (code == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, payload)) {
      long fans = doc["data"]["follower"].as<long>();
      if (fans > 0) {
        targetFollowers = fans;
        connectionError = false;
        if (isInitialFetch) {
          if (todayBaseFollowers == 0) {
            todayBaseFollowers = fans;
            preferences.putLong("base_fans", fans);
          }
          isInitialFetch = false;
        }
        todayAdded = targetFollowers - todayBaseFollowers;
        Serial.printf("Fetch Success! Fans=%ld Today=%+ld\n", targetFollowers, todayAdded);
      }
    } else {
      connectionError = true;
    }
  } else {
    Serial.printf("HTTP Code Error: %d\n", code);
    connectionError = true;
  }
  http.end();
}

void checkNewDayReset() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;
  static int lastResetDay = -1;
  // 午前0時ちょうどに今日のベース基数の更新をトリガー
  if (timeinfo.tm_hour == 0 && timeinfo.tm_min == 0 && timeinfo.tm_mday != lastResetDay) {
    lastResetDay = timeinfo.tm_mday;
    todayBaseFollowers = targetFollowers;
    preferences.putLong("base_fans", todayBaseFollowers);
    todayAdded = 0;
    Serial.println("[RTC] Midnight detected. Resetting today's base counter.");
  }
}
#endif
```

### コードの重要ポイント

1. **起動画面の描画**：`setup()` の中で `u8g2.drawStr()` を呼び出して最初のアニメーションロゴを描画し、システムに視覚的なバッファを与えます。
2. **Wi-Fi と時刻の初期化**：`WiFi.begin()` でネットワークに接続し、`configTime()` で Aliyun NTP タイムサーバーをマウントして、午前0時の到来を正確に捉えられるようにします。
3. **データリクエストの偽装**：`http.setUserAgent()` と `addHeader("Referer", ...)` を使って ESP32 を通常のパソコンブラウザのリクエストに偽装し、Bilibili のアンチクロールメカニズムに容赦なくブロックされるのを防ぎます。
4. **バネダンピング物理の反復**：`DigitWheel::update` の中で、古典物理学の公式（加速度 = 距離 × 引張り係数 − 速度 × ダンピング係数）を用いて速度値を動的に減衰させます。これこそが、生硬にスッと流すのではなく、癖になる機械的リバウンドを生み出す魂の部分です！
5. **局所クリップウィンドウ（Clip Window）制御**：数字のレンダリング時に `u8g2.setClipWindow(x, 4, w, 28)` を使って、この中間の高さの中でのみピクセルを表示するよう規定します。この枠から出た瞬間に見えなくなり、実物のスクロールホイールスロットマシンの機械的な隙間感を完璧に再現します。

---

## トラブルシューティング

焦らないで！初心者の 95% がこうした小さなハードウェアプロジェクトを組む際につまずく問題は、基本的に以下のいずれかにあります：

* **画面が真っ暗で何も表示されない**：
  1. まず配線を確認：スクリーンの VCC が 3.3V に接続されているか、GND が緩んでいないか。
  2. SDA と SCL のピンが逆接続されていないか確認。コードで指定しているのは `SDA -> 14`、`SCL -> 13` です。
  3. お使いの OLED スクリーンのドライバチップが古典的な `SSD1306` か確認。ごく一部、同じ見た目でも `SH1106` を使うスクリーンがあり、後者の場合は U8g2 のコンストラクタ初期化関数を変更する必要があります。

* **右側のステータスがずっと "ERR" と表示される**：
  1. ネットワークリクエストまたは解析でエラーが起きています。`ssid` と `password` が正しく設定されているか確認。注意：ESP32 は **5GHz 帯の Wi-Fi に非対応**です。必ず 2.4GHz 帯の無線ネットワークまたはスマートフォンのテザリングに接続してください。
  2. UID が正しく入力されているか確認。ブラウザで `https://api.bilibili.com/x/relation/stat?vmid=あなたのUID` を開き、正しい JSON データが返ってくるか確認できます。

---

## FAQ

**Q：別の GPIO ピンでスクリーンに接続してもいいですか？**
A：もちろん可能です！コード上部の `#define OLED_SDA 14` と `#define OLED_SCL 13` の数字を、ESP32-S3 開発ボードの空きピン番号に変更するだけです。変更後はジャンパーワイヤーも一緒に付け替えるのを忘れないでください。

**Q：書き込み後、数字が 0 で止まったまま動かないのはなぜですか？**
A：コードの `#define DEBUG_SIMULATE` がデフォルトで `0`（実際のネットワーク取得を使用）に設定されているためです。ネットワーク取得の頻度は 30 分に設定されているため、起動直後は Wi-Fi がまだ接続中で最初のフレームの取得に失敗している可能性があります。このマクロを `1` に変更してシミュレーションモードを有効にすれば、数字が 2 秒ごとにランダムにジャンプし、激しく揺れアニメーションを引き起こす迫力の効果をすぐに見られます！

**Q：もっと頻繁に更新したい場合、どうすればいいですか？**
A：設定エリアの `const unsigned long FETCH_INTERVAL = 30 * 60 * 1000;` を変更してください。ただし、頻繁にしすぎる（10秒未満など）と、Bilibili のインターフェースに頻繁にリクエストを送ることでサーバーからあなたのパブリック IP を一時的にブロックされる可能性があります。

**Q：停電すると、今日増えたフォロワー数はゼロにリセットされてしまいますか？**
A：いいえ！コード内部で ESP32 の `Preferences` ライブラリを呼び出しています。新しい一日に入ってベースフォロワー数を正常に取得するたびに、その数字を ESP32 内部の Flash チップに安全に書き込みます。完全に電源を切ってケーブルを抜いても、再起動時に今日最初のフォロワー起点を覚えており、今日の増減数を正確に計算できます。

**Q：この物理効果はより高解像度のスクリーン（128x64 など）に移植できますか？**
A：もちろん可能です。`drawBigOdometer()` 関数の中に、高さ制御用の変数 `areaTop`、`areaBot`、`baseline`、そしてフォントサイズの設定があります。大きなスクリーンに変更する場合は、ウィンドウクリップ領域の座標を比例的に拡大し、より大きな U8g2 太字フォント（logisoso42 など）に置き換えれば、より大きなスクロールホイールのエフェクトが得られます。

**Q：画面の信号強度表示がずっと満タン、あるいはあまり正確でないのはなぜですか？**
A：`drawWifiIcon` の中で読み取っているのは `WiFi.RSSI()`（受信信号強度表示）です。コードは `-60dBm` と `-75dBm` の 2 つの閾値で 3 段階に分割しています。デバイスが無線ルーターに比較的近い場合、一般的に信号は 3 本の満タン状態で安定します。

---

## さらに発展させるには

この実験を終えると、あなたのハードコアギークなデスクトップはすでに形になり始めています。次はこのように魔改造できます：

* **複数プラットフォームの監視を統合**：もう一つ API 解析を書き、スクリーンが 10 秒ごとに「Bilibili フォロワー数」と「Douyin/GitHub フォロワー数」の間で滑らかにスクロールカルーセルするようにします。
* **振動モーターを追加**：開発ボードのピンに小型の偏心振動モーターを接続し、フォロワー数が増えるたびに、モーターが数字のスクロールのリズムに合わせて微弱な「カチカチカチ」という機械的触感フィードバックを発することで、癒やし効果が倍増します！
* **ケースの 3D プリントを追加**：ESP32 と OLED スクリーン用にレトロテレビ風のミニチュア 3D プリントケースをデザインすれば、一瞬でデスクトップアート作品に変身します。

---

## 参考資料

* [Espressif 公式 ESP32-S3 データシートおよびハードウェア設計ガイド](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
* [U8g2 公式 GitHub オープンソースホームページおよび高解像度フォント・ピン設定説明](https://github.com/olikraus/u8g2)
* [ArduinoJson 公式 高効率解析とストリーミング解析のサンプルガイド](https://arduinojson.org/)
