---
title: "ESP32-S3 で 4.2 インチ電子ペーパー（SSD1683）を駆動｜AQICN で空気品質ダッシュボードを作る（GxEPD2 + SPI）"
boardId: esp32s3
moduleId: display/epd-4inch2-gdey042a87
category: esp32
date: 2026-07-08
intro: "ESP32-S3 と GxEPD2 で 4.2 インチ白黒電子ペーパー（GDEY042A87 / SSD1683）を駆動し、AQICN の空気品質 API を取得して、電源を切っても画面が消えないデスクトップ空気品質ダッシュボードを作ります。配線、完全な Arduino C++ コード、パーティション設定、トラブルシューティングまで収録。"
image: "https://img.lingflux.com/2026/07/39d31272f2976bb195ecea554654502d.jpg"
---

> **一行サマリ**：中古市場で十数元でゲットした 4.2 インチ白黒電子ペーパーと ESP32-S3 を組み合わせ、AQICN の空気品質 API に接続して、スマホを取り出さずにチラッと見るだけで今日白雲山にハイキングに行けるかがわかる、デスクトップ空気品質ダッシュボードを作ります。

難易度：⭐⭐☆☆☆（初心者でも着手可能） 所要時間：30 分 テスト環境：Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 ＋ GxEPD2 v1.6.9 + Adafruit GFX Library v1.12.6 + ArduinoJson v7.4.3（ライブラリ導入時はこのバージョンに合わせるのがおすすめ。新しすぎても古すぎてもハマるもとです）

> **TL;DR（すぐ始める）：**
>
> 1. 配線：GPIO11 → SDI/MOSI、GPIO12 → SCL/SCK、GPIO10 → CS、GPIO9 → DC、GPIO8 → RES、GPIO7 → BUSY、VCC は 3.3V、GND は共通グランドへ
> 2. ライブラリ導入：ArduinoJson、GxEPD2、Adafruit GFX Library、U8g2_for_Adafruit_GFX（作者 olikraus）
> 3. コード内の `WIFI_SSID`、`WIFI_PASS`、`API_TOKEN` を自分のものに書き換える（Token の申請方法は後述の「AQICN の無料 API Token を申請する」セクションを参照）
> 4. 書き込んで、WiFi が繋がるのを待てば、画面に空気品質データが自動的に表示されます

## はじめに

十数元で中古市場にあった白黒電子ペーパーを 1 枚ゲットしました。正直、注文したときは少し不安もあったんです——もしそれが壊れた画面だったら、このお金は無駄になるわけで。でも通電テストをしてみると問題なく動き、失敗にはなりませんでした。ただ 1 本の縦線が壊れていたものの、実用上はほとんど影響なし。画面がまだホットなうちに、ずっと表示されていて、スマホアプリ不要、チラッと見るだけで今日白雲山の空気がいいか悪いかがわかる小さなダッシュボードを作ってしまおうと思い立ちました——天気がよれば白雲山にハイキングです。この記事では、配線、コード、そしてハマったポイントまでを完全収録。これに沿って進めれば、基本的には一発で点灯するはずです。

## 実験の効果

1 枚の ESP32-S3 が一定間隔で AQICN.ORG から空気品質データを取得し、電子ペーパーに表示します。画面には AQI の大きな数字、12 項目の詳細指標（PM2.5、PM10、温湿度、風速など）、そして PM2.5 と紫外線の 7 日間予測の棒グラフが含まれ、電源を切っても画面は消えません。机の上に置けば「電子風水計」のようなもので、デスク周りの良いアクセントになります。

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/foEGSZWcxEE?si=cjtzAEnatEL7e4NY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## パーツ説明

**ESP32-S3 開発ボード**は WiFi 搭載の SoC 開発ボードで、ネットワークからデータを取得し、ロジックを走らせ、SPI 経由で画面に描画データを送る、プロジェクト全体の頭脳です。これを選んだのは、ピン数が多く、演算能力が十分で、WiFi を内蔵しているため、別途ネットワークモジュールを用意する必要がないからです。

**電子ペーパードライバボード**（自作）は、ESP32 から送られてくる SPI コマンドを画面が理解できるレベル信号に変換する、いわば「通訳」の役割を担います。自作基板にしたのは単に面白そうだったからです。引き出しているインターフェースは市販品と同じなので、他の電子ペーパードライバボードを使っている方でも同様に試せます。

**4.2 インチ白黒電子ペーパーディスプレイ**は、電界でマイクロカプセル内の白黒粒子を反転させて画面を表示するディスプレイで、特徴は電源を切っても画面を保持できること。「チラッと見て去る」ような情報ダッシュボードに適しています。LCD のように電力を食わない反面、唯一の代償は書き換えが遅く、アニメーションには向かないことです。



## BOM 表

| 部品 | 型番／仕様 | 数量 |
| ------------ | -------------------------------------------- | ---- |
| ESP32 開発ボード | ESP32-S3（SPI ピンが十分にある型番なら何でも OK）        | 1    |
| 電子ペーパードライバボード | 自作 PCB、ピン定義は市販の主流な電子ペーパードライバボードと一致 | 1    |
| 電子ペーパーディスプレイ   | 4.2 インチ白黒、GxEPD2_420_GYE042A87 ドライバと互換   | 1    |
| ジャンパワイヤ       |                                              | 適量 |

## ピン説明

| ピン         | 正式名称             | 役割                                             |
| ------------ | ---------------- | ------------------------------------------------ |
| **VCC**      | 電源プラス         | 電源入力。ESP32-S3 の 3V3 出力に接続                |
| **GND**      | 電源グランド           | 基準グラウンド。ESP32-S3 の GND に接続して電流ループを形成             |
| **SDI/MOSI** | マスター出力スレーブ入力 | SPI データ線。ESP32 から画面へデータを送信                   |
| **SCL/SCK**  | シリアルクロック         | SPI クロック線。データ転送のタイミングを制御                     |
| **CS**       | チップセレクト             | 画面に「次のデータは君宛てだよ」と伝える                 |
| **DC**       | データ／コマンド切替    | 現在送っているのが画像データか制御コマンドかを区別               |
| **RES/RST**  | リセット             | 一瞬 LOW に引いて画面を再初期化                         |
| **BUSY**     | ビジー状態表示       | 書き換え中は LOW になり、ESP32 はこれで「次のコマンドを送っていいか」を判断 |

## 配線方式

| 電子ペーパーピン | 接続先 ESP32-S3 ピン |
| ---------- | ---------------- |
| SDI/MOSI   | GPIO11           |
| SCL/SCK    | GPIO12           |
| CS         | GPIO10           |
| DC         | GPIO9            |
| RES        | GPIO8            |
| BUSY       | GPIO7            |
| VCC        | 3.3V             |
| GND        | GND              |

配線が終わったら 1 本ずつ見直すのがおすすめで、トラブルシューティング時間の 80% を削れます——電子ペーパーで最もハマりやすいのは、配線を間違えてもエラーが出ず、ただ画面が乱れたり真っ白になったりするだけで、コードの問題か配線の問題かを一目で判断するのが難しいことです。

## インストールが必要なライブラリ

Arduino IDE のライブラリマネージャで以下を検索してインストールします（動作確認バージョンは参考程度で、実際にはライブラリマネージャの最新安定版を使ってください）。

| ライブラリ                  | 役割                                            | 動作確認バージョン                |
| --------------------- | ----------------------------------------------- | ----------------------- |
| ArduinoJson           | AQICN API が返す JSON をパース                       | v7.4.3                  |
| GxEPD2                | 電子ペーパー駆動のコアライブラリ                                | v1.6.9                  |
| Adafruit GFX Library  | グラフィック描画の基本ライブラリ。GxEPD2 が依存                   | v1.12.6                 |
| U8g2_for_Adafruit_GFX | U8g2 の中国語フォントを Adafruit GFX にブリッジし、中国語表示に使う | v1.8.0（作者 olikraus） |

`WiFi.h`、`HTTPClient.h`、`SPI.h` は ESP32 コアに標準搭載されており、別途インストール不要です。ESP32 ボードサポートパッケージを導入していれば使えます。

## 書き込み設定：パーティション方案（重要）

まず押さえておくべきハマりポイントがあります：本プロジェクトでは `U8g2_for_Adafruit_GFX` の完全な中国語フォント（コード内で `u8g2_font_wqy16_t_gb2312`、`wqy14`、`wqy12` の 3 セットを参照）を使っており、これらの GB2312 フォントを合計すると 500KB 近くになります。一方、ESP32 のデフォルトのパーティション方案ではプログラム領域に 1MB しか割り当てられていないため、コンパイル時に「空間不足（region `app' overflowed）」とエラーになり、書き込めません。

**解決策**：アップロード前にパーティション方案を大きくします。

**操作手順**：Arduino IDE トップメニュー → `ツール (Tools)` → `Partition Scheme` → **`Huge APP (3MB No OTA/1MB SPIFFS)`** を選択

私はこの `Huge APP` を使っており、プログラム領域に一気に 3MB を割り当てて、フォントもコードも快適に収まり、コンパイルも書き込みもスムーズでした。

> 💡 補足：
> - **フォントがこんなに大きい理由**：GB2312 には 6〜7 千字の漢字が収録されており、各 wqy フォントは 1〜2 百 KB のビットマップデータになるため、欧文フォントのように小さくできません。
> - **No OTA の代償**：No OTA を選ぶと「空中アップグレード」でファームウェアを更新できなくなり、USB ケーブルで書き込むしかなくなります。デスク周りの小物にとってはまったく影響ありません——どうせ机に置いて給電しっぱなしですし。
> - **大容量 Flash ボードのさらなる解決策**：もし ESP32-S3 が ≥8MB Flash のバージョンなら、もっと余裕のある方案（例えば `8M with SPIFFS`）を選べば、OTA も活かしつつデータ保存用の空間も増やせます。
> - パーティション方案を変更したら、必ず再コンパイルしてください。「アップロード」だけ押して古い設定のまま使わないように。

## AQICN の無料 API Token を申請する

コード内の `API_TOKEN` と都市番号（例：`@14370`）はどちらも AQICN（aqicn.org）から取得するもので、無料で申請できます。以下の 4 ステップで取得できます。

**ステップ 1：自分の都市を見つける**

[aqicn.org](https://aqicn.org/) を開き、右上の検索ボックスに監視したい都市名や観測ステーション名（例：「Guangzhou」「Baiyun Mountain」）を入力し、対応する空気品質ページに進みます。

**ステップ 2：API データプラットフォームに進む**

その都市ページを下にスクロールし、「json: api」と書かれたリンクを見つけてクリックすると、AQICN データプラットフォームにジャンプします。

**ステップ 3：アカウントを登録して有効化**

メールアドレスを入力してアカウントを登録し、受信箱の有効化リンクをクリックして認証を完了します。ログイン後、コンソールにあなた専用の **Token**（ランダムな文字列。公開リポジトリにそのままプッシュしないよう注意）が表示されます。

**ステップ 4：API アドレスを組み立ててコードに反映**

Token をコードの `API_TOKEN` マクロに設定し、`API_URL` の `@14370` を希望の観測ステーション番号に書き換えます（都市の英語名や緯度経度座標を直接使うことも可能。書き方は [AQICN API ドキュメント](https://aqicn.org/api/) を参照）。完全なフォーマットは以下の通りです：

```
https://api.waqi.info/feed/@14370/?token=你的Token
```

アドレスが正しいか確認したい場合は、上記の文字列をブラウザのアドレスバーに貼り付けて開き、`"status":"ok"` の JSON が返ってくれば通っています。

> AQICN の個人 Token は完全無料、カード登録不要で、個人プロジェクトなら余裕で収まる枠があるため、課金を気にする必要はありません。

## 完全なコード＋解説

```cpp
/*
 * ============================================================
 * ESP32-S3 + 4.2" 墨水屏 空气质量监测站  (v2.1 横屏优化版)
 * Air Quality Monitor using AQICN API
 * ============================================================
 *
 * 本版本相对上一版做了如下修改:
 * 1. 彻底删除了底部显示不全的 PM10 预测表格及其标题。
 * 2. 将上方的 AQI 方块和 12项指标网格高度从 128 扩大至 141，行高更宽松。
 * 3. 将 PM2.5 和紫外线预测图表的高度从 52 扩大至 64，画面更舒展。
 * 4. 重新计算了所有垂直坐标，底部保留少许清爽留白。
 *
 * 硬件连接 (不变):
 * EPD_CS   -> GPIO 10
 * EPD_DC   -> GPIO 9
 * EPD_RST  -> GPIO 8
 * EPD_BUSY -> GPIO 7
 * EPD_MOSI -> GPIO 11
 * EPD_CLK  -> GPIO 12
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Adafruit_GFX.h>
#include <U8g2_for_Adafruit_GFX.h>

// 粗体数字字体 (Adafruit GFX 自带)
#include <Fonts/FreeSansBold9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>

// ==================== 配置区 ====================
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASS     "YOUR_WIFI_PASSWORD"
#define API_TOKEN     "YOUR_WIFI_AQI_API_TONKEN"
#define API_URL       "https://api.waqi.info/feed/@14370/?token=" API_TOKEN

#define UPDATE_INTERVAL_MS  (30 * 60 * 1000)  // 30分钟更新一次

// 如果画面上下颠倒，把这里改成 1
#define ROTATION_FLIP 0

// ==================== 引脚定义 ====================
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_MOSI 11
#define EPD_CLK  12

// ==================== 墨水屏驱动 ====================
GxEPD2_BW<GxEPD2_420_GYE042A87, GxEPD2_420_GYE042A87::HEIGHT> display(
  GxEPD2_420_GYE042A87(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY)
);

// U8g2 中文渲染桥接对象
U8G2_FOR_ADAFRUIT_GFX u8f;

// ==================== 数据结构 ====================
struct ForecastDay {
  char day[6];   // "07-08"
  int avg;
  int maxVal;
  int minVal;
};

struct AqiData {
  int aqi;
  char city[32];
  char timeStr[20];
  char timeShort[12];   // 精简时间 "07-08 14:00"
  char dominentpol[8];
  float lat, lon;

  float co, dew, h, no2, o3, p, pm10, pm25, so2, t, w, wg;

  ForecastDay pm25Forecast[8];
  int pm25ForecastCount;
  ForecastDay pm10Forecast[8];
  int pm10ForecastCount;
  ForecastDay uviForecast[8];
  int uviForecastCount;
};

AqiData aqiData;

// ==================== 辅助函数: AQI 等级 ====================
const char* getAqiLevel(int aqi) {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy-S";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "V.Unhealthy";
  return "Hazardous";
}

const char* getAqiLevelCN(int aqi) {
  if (aqi <= 50)  return "优";
  if (aqi <= 100) return "良";
  if (aqi <= 150) return "轻度污染";
  if (aqi <= 200) return "中度污染";
  if (aqi <= 300) return "重度污染";
  return "严重污染";
}

// ==================== WiFi 连接 ====================
void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nConnected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi connection FAILED!");
  }
}

// ==================== 解析预报数组 ====================
int parseForecastArray(JsonArray arr, ForecastDay* out, int maxCount) {
  int count = 0;
  for (JsonObject item : arr) {
    if (count >= maxCount) break;
    const char* dayStr = item["day"];
    if (dayStr && strlen(dayStr) >= 10) {
      strncpy(out[count].day, dayStr + 5, 5);
      out[count].day[5] = '\0';
    }
    out[count].avg    = item["avg"] | 0;
    out[count].maxVal = item["max"] | 0;
    out[count].minVal = item["min"] | 0;
    count++;
  }
  return count;
}

// ==================== API 请求与解析 ====================
bool fetchAqiData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping fetch.");
    return false;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.setTimeout(15000);
  int httpCode = http.GET();

  if (httpCode != 200) {
    Serial.printf("HTTP GET failed, code: %d\n", httpCode);
    http.end();
    return false;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.printf("JSON parse error: %s\n", err.c_str());
    return false;
  }

  const char* status = doc["status"];
  if (!status || strcmp(status, "ok") != 0) {
    Serial.println("API status not OK");
    return false;
  }

  JsonObject data = doc["data"];
  aqiData.aqi = data["aqi"] | 0;

  const char* cityName = data["city"]["name"];
  if (cityName) {
    const char* comma = strchr(cityName, ',');
    if (comma) {
      int len = comma - cityName;
      if (len > 31) len = 31;
      strncpy(aqiData.city, cityName, len);
      aqiData.city[len] = '\0';
    } else {
      strncpy(aqiData.city, cityName, 31);
      aqiData.city[31] = '\0';
    }
  }

  const char* timeS = data["time"]["s"];
  if (timeS) {
    strncpy(aqiData.timeStr, timeS, 19);
    aqiData.timeStr[19] = '\0';
    if (strlen(timeS) >= 16) {
      memcpy(aqiData.timeShort, timeS + 5, 11);
      aqiData.timeShort[11] = '\0';
    } else {
      aqiData.timeShort[0] = '\0';
    }
  }

  const char* dpol = data["dominentpol"];
  if (dpol) {
    strncpy(aqiData.dominentpol, dpol, 7);
    aqiData.dominentpol[7] = '\0';
  }

  aqiData.lat = data["city"]["geo"][0] | 0.0f;
  aqiData.lon = data["city"]["geo"][1] | 0.0f;

  JsonObject iaqi = data["iaqi"];
  aqiData.co   = iaqi["co"]["v"]   | 0.0f;
  aqiData.dew  = iaqi["dew"]["v"]  | 0.0f;
  aqiData.h    = iaqi["h"]["v"]    | 0.0f;
  aqiData.no2  = iaqi["no2"]["v"]  | 0.0f;
  aqiData.o3   = iaqi["o3"]["v"]   | 0.0f;
  aqiData.p    = iaqi["p"]["v"]    | 0.0f;
  aqiData.pm10 = iaqi["pm10"]["v"] | 0.0f;
  aqiData.pm25 = iaqi["pm25"]["v"] | 0.0f;
  aqiData.so2  = iaqi["so2"]["v"]  | 0.0f;
  aqiData.t    = iaqi["t"]["v"]    | 0.0f;
  aqiData.w    = iaqi["w"]["v"]    | 0.0f;
  aqiData.wg   = iaqi["wg"]["v"]   | 0.0f;

  JsonObject forecast = data["forecast"]["daily"];
  aqiData.pm25ForecastCount = parseForecastArray(
    forecast["pm25"].as<JsonArray>(), aqiData.pm25Forecast, 8);
  aqiData.pm10ForecastCount = parseForecastArray(
    forecast["pm10"].as<JsonArray>(), aqiData.pm10Forecast, 8);
  aqiData.uviForecastCount = parseForecastArray(
    forecast["uvi"].as<JsonArray>(), aqiData.uviForecast, 8);

  Serial.printf("Data parsed OK! AQI=%d, City=%s\n", aqiData.aqi, aqiData.city);
  return true;
}

// ==================== 绘图小工具 ====================
void drawCN(int x, int y, const char* utf8, bool whiteOnBlack, const uint8_t* font) {
  u8f.setFont(font);
  if (whiteOnBlack) {
    u8f.setForegroundColor(GxEPD_WHITE);
    u8f.setBackgroundColor(GxEPD_BLACK);
  } else {
    u8f.setForegroundColor(GxEPD_BLACK);
    u8f.setBackgroundColor(GxEPD_WHITE);
  }
  int baselineY = y + u8f.getFontAscent();
  u8f.setCursor(x, baselineY);
  u8f.print(utf8);
}

void drawCNCentered(int cx, int y, const char* utf8, bool whiteOnBlack, const uint8_t* font) {
  u8f.setFont(font);
  uint16_t w = u8f.getUTF8Width(utf8);
  drawCN(cx - w / 2, y, utf8, whiteOnBlack, font);
}

void drawCNRight(int rightX, int y, const char* utf8, bool whiteOnBlack, const uint8_t* font) {
  u8f.setFont(font);
  uint16_t w = u8f.getUTF8Width(utf8);
  drawCN(rightX - w, y, utf8, whiteOnBlack, font);
}

void drawBold(const GFXfont* font, const char* text, int x, int baselineY) {
  display.setFont(font);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(x, baselineY);
  display.print(text);
  display.setFont(NULL); 
}

void drawBoldCentered(const GFXfont* font, const char* text, int cx, int baselineY) {
  display.setFont(font);
  int16_t x1, y1; uint16_t w, h;
  display.getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  display.setFont(NULL);
  drawBold(font, text, cx - w / 2 - x1, baselineY);
}

// ==================== 绘制 UI (横屏 400x300优化版) ====================
void drawUI() {
  int W = display.width();
  int H = display.height();

  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);

    // ---------- 顶部标题栏 (0-20) ----------
    display.fillRect(0, 0, W, 20, GxEPD_BLACK);
    drawCN(6, 6, "空气质量监测站", true, u8g2_font_wqy14_t_gb2312);
    drawCNRight(W - 6, 5, aqiData.timeShort, true, u8g2_font_wqy12_t_gb2312);

    // ---------- 位置行 (20-34) ----------
    drawCN(6, 24, aqiData.city, false, u8g2_font_wqy14_t_gb2312);
    char levelLine[24];
    snprintf(levelLine, sizeof(levelLine), "%s · 主要污染: %s", getAqiLevelCN(aqiData.aqi), aqiData.dominentpol);
    drawCNRight(W - 6, 24, levelLine, false, u8g2_font_wqy12_t_gb2312);

    display.drawFastHLine(4, 36, W - 8, GxEPD_BLACK);

    // ---------- AQI 大方块 (左, 40-181) [高度增加到141] ----------
    int aqiBoxX = 6, aqiBoxY = 40, aqiBoxW = 118, aqiBoxH = 141;
    display.drawRoundRect(aqiBoxX, aqiBoxY, aqiBoxW, aqiBoxH, 6, GxEPD_BLACK);
    display.drawRoundRect(aqiBoxX + 1, aqiBoxY + 1, aqiBoxW - 2, aqiBoxH - 2, 5, GxEPD_BLACK);

    drawCNCentered(aqiBoxX + aqiBoxW / 2, aqiBoxY + 12, "AQI 指数", false, u8g2_font_wqy12_t_gb2312);

    char aqiStr[8];
    snprintf(aqiStr, sizeof(aqiStr), "%d", aqiData.aqi);
    drawBoldCentered(&FreeSansBold24pt7b, aqiStr, aqiBoxX + aqiBoxW / 2, aqiBoxY + 98);

    drawCNCentered(aqiBoxX + aqiBoxW / 2, aqiBoxY + 114, getAqiLevelCN(aqiData.aqi), false, u8g2_font_wqy16_t_gb2312);

    // ---------- 指标网格 (右, 40-181) [高度增加到141] ----------
    int gridX = 130, gridY = 40, gridW = 264, gridH = 141;
    int cols = 4, rows = 3;
    int cellW = gridW / cols;   // 66
    int cellH = gridH / rows;   // 47 (刚好整除)

    struct Metric {
      const char* label;
      float value;
      const char* unit;
      int decimals;
    };
    Metric metrics[] = {
      {"PM2.5", aqiData.pm25, "ug/m3", 0},
      {"PM10",  aqiData.pm10, "ug/m3", 0},
      {"温度",  aqiData.t,    "C",     0},
      {"湿度",  aqiData.h,    "%",     0},
      {"O3",    aqiData.o3,   "ppb",   0},
      {"NO2",   aqiData.no2,  "ppb",   0},
      {"SO2",   aqiData.so2,  "ppb",   1},
      {"CO",    aqiData.co,   "mg/m3", 1},
      {"风速",  aqiData.w,    "m/s",   1},
      {"阵风",  aqiData.wg,   "m/s",   1},
      {"露点",  aqiData.dew,  "C",     1},
      {"气压",  aqiData.p,    "hPa",   0},
    };

    for (int i = 0; i < 12; i++) {
      int col = i % cols;
      int row = i / cols;
      int x = gridX + col * cellW;
      int y = gridY + row * cellH;
      int h = cellH; 

      display.drawRect(x, y, cellW, h, GxEPD_BLACK);

      // 标签 (稍微靠下一两像素，居中感更好)
      drawCN(x + 3, y + 4, metrics[i].label, false, u8g2_font_wqy12_t_gb2312);

      // 数值 (粗体)
      char valStr[12];
      if (metrics[i].decimals == 0)
        snprintf(valStr, sizeof(valStr), "%.0f", metrics[i].value);
      else
        snprintf(valStr, sizeof(valStr), "%.1f", metrics[i].value);
      drawBold(&FreeSansBold9pt7b, valStr, x + 3, y + h - 8);

      // 单位
      display.setFont(NULL);
      display.setTextSize(1);
      int16_t tx, ty; uint16_t tw, th;
      display.getTextBounds(metrics[i].unit, 0, 0, &tx, &ty, &tw, &th);
      display.setCursor(x + cellW - tw - 3, y + h - 11);
      display.print(metrics[i].unit);
    }

    // 中间分割线
    display.drawFastHLine(4, 183, W - 8, GxEPD_BLACK);

    // ---------- 预报区 (190-282) [高度由52增加至64，排版更宽松] ----------
    drawCN(6, 190, "PM2.5 七日预测", false, u8g2_font_wqy12_t_gb2312);
    drawCNRight(W - 6, 190, "紫外线预测", false, u8g2_font_wqy12_t_gb2312);

    int barStartX = 6;
    int barStartY = 204;
    int barAreaW  = 258;
    int barAreaH  = 64; 
    int barCount  = min(aqiData.pm25ForecastCount, 7);
    int barGap    = 4;
    int barW      = (barCount > 0) ? (barAreaW - (barCount - 1) * barGap) / barCount : barAreaW;

    int maxPm25 = 1;
    for (int i = 0; i < barCount; i++)
      if (aqiData.pm25Forecast[i].maxVal > maxPm25) maxPm25 = aqiData.pm25Forecast[i].maxVal;

    for (int i = 0; i < barCount; i++) {
      ForecastDay& f = aqiData.pm25Forecast[i];
      int x = barStartX + i * (barW + barGap);
      int maxH = (int)((float)f.maxVal / maxPm25 * (barAreaH - 14));
      int avgH = (int)((float)f.avg    / maxPm25 * (barAreaH - 14));

      display.drawRect(x, barStartY + barAreaH - 14 - maxH, barW, max(maxH, 1), GxEPD_BLACK);
      display.fillRect(x, barStartY + barAreaH - 14 - avgH, barW, max(avgH, 1), GxEPD_BLACK);

      char dayLabel[3];
      strncpy(dayLabel, f.day + 3, 2);
      dayLabel[2] = '\0';
      display.setFont(NULL);
      display.setTextSize(1);
      int16_t tx, ty; uint16_t tw, th;
      display.getTextBounds(dayLabel, 0, 0, &tx, &ty, &tw, &th);
      display.setCursor(x + (barW - tw) / 2, barStartY + barAreaH - 10);
      display.print(dayLabel);
    }

    // PM2.5 图例
    display.fillRect(barStartX, barStartY + barAreaH + 2, 6, 5, GxEPD_BLACK);
    drawCN(barStartX + 9, barStartY + barAreaH + 1, "均值", false, u8g2_font_wqy12_t_gb2312);
    display.drawRect(barStartX + 60, barStartY + barAreaH + 2, 6, 5, GxEPD_BLACK);
    drawCN(barStartX + 69, barStartY + barAreaH + 1, "最大", false, u8g2_font_wqy12_t_gb2312);

    // ---------- UV 紫外线小图表 ----------
    int uvX = 272, uvY = 204, uvW = W - uvX - 6, uvH = barAreaH;
    display.drawRect(uvX, uvY, uvW, uvH, GxEPD_BLACK);

    int uvCount  = min(aqiData.uviForecastCount, 6);
    int uvBarGap = 3;
    int uvBarW   = (uvCount > 0) ? (uvW - 6 - (uvCount - 1) * uvBarGap) / uvCount : uvW;

    int maxUvi = 1;
    for (int i = 0; i < uvCount; i++)
      if (aqiData.uviForecast[i].maxVal > maxUvi) maxUvi = aqiData.uviForecast[i].maxVal;

    for (int i = 0; i < uvCount; i++) {
      ForecastDay& u = aqiData.uviForecast[i];
      int x = uvX + 3 + i * (uvBarW + uvBarGap);
      int mH = (int)((float)u.maxVal / maxUvi * (uvH - 16));
      int aH = (int)((float)u.avg   / maxUvi * (uvH - 16));

      if (mH > 0) display.drawRect(x, uvY + uvH - 12 - mH, uvBarW, mH, GxEPD_BLACK);
      if (aH > 0) display.fillRect(x, uvY + uvH - 12 - aH, uvBarW, aH, GxEPD_BLACK);

      char dayL[3];
      strncpy(dayL, u.day + 3, 2);
      dayL[2] = '\0';
      display.setFont(NULL);
      display.setTextSize(1);
      display.setCursor(x, uvY + uvH - 10);
      display.print(dayL);
    }

    // ---------- 最底部状态栏 (286-300) [上方留出少许清爽白边] ----------
    display.fillRect(0, H - 14, W, 14, GxEPD_BLACK);
    display.setFont(NULL);
    display.setTextSize(1);
    display.setTextColor(GxEPD_WHITE);
    display.setCursor(6, H - 11);
    display.print("aqicn.org | ESP32-S3");

    char geoBot[24];
    snprintf(geoBot, sizeof(geoBot), "%.2fN %.2fE", aqiData.lat, aqiData.lon);
    int16_t tx, ty; uint16_t tw, th;
    display.getTextBounds(geoBot, 0, 0, &tx, &ty, &tw, &th);
    display.setCursor(W - tw - 6, H - 11);
    display.print(geoBot);

  } while (display.nextPage());
}

// ==================== 显示错误信息 ====================
void drawError(const char* msg) {
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.drawRect(5, 5, display.width() - 10, display.height() - 10, GxEPD_BLACK);
    display.setFont(NULL);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(2);
    display.setCursor(20, 40);
    display.print("ERROR");
    display.setTextSize(1);
    display.setCursor(20, 80);
    display.print(msg);
    display.setCursor(20, 100);
    display.print("Will retry in 30s...");
  } while (display.nextPage());
}

// ==================== 自动选择横屏方向 ====================
void chooseLandscapeRotation() {
  int candidates[4] = {1, 3, 0, 2};
  int chosen = 1;
  for (int i = 0; i < 4; i++) {
    display.setRotation(candidates[i]);
    if (display.width() > display.height()) {
      chosen = candidates[i];
      break;
    }
  }
  if (ROTATION_FLIP) {
    chosen = (chosen + 2) % 4;
    display.setRotation(chosen);
  }
  Serial.printf("Rotation = %d -> W=%d H=%d\n", chosen, display.width(), display.height());
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32-S3 Air Quality Monitor (v2.1) ===");

  SPI.begin(EPD_CLK, -1, EPD_MOSI, EPD_CS);

  display.init(115200, true, 2, false);
  chooseLandscapeRotation();

  u8f.begin(display);
  u8f.setFontMode(1);          
  u8f.setFontDirection(0);

  // 启动画面
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    drawCNCentered(display.width() / 2, 90, "空气质量监测站", false, u8g2_font_wqy16_t_gb2312);
    drawCNCentered(display.width() / 2, 130, "正在连接 WiFi...", false, u8g2_font_wqy14_t_gb2312);
  } while (display.nextPage());

  connectWiFi();

  if (fetchAqiData()) {
    drawUI();
  } else {
    drawError("Failed to fetch data");
  }

  display.powerOff();
}

// ==================== LOOP ====================
void loop() {
  delay(UPDATE_INTERVAL_MS);

  Serial.println("Refreshing data...");

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (fetchAqiData()) {
    display.init(115200, true, 2, false);
    chooseLandscapeRotation();
    drawUI();
    display.powerOff();
    Serial.println("Screen updated successfully.");
  } else {
    Serial.println("Data fetch failed, will retry next cycle.");
  }
}
```

### コードの解説

第一ステップ、`connectWiFi()` では標準的な WiFi 接続を行い、40 回（20 秒）再試行します。タイムアウトしても固まらず、先に進んでオフラインでも黒画面ではなくエラー表示を見られるようにしています。

第二ステップ、`fetchAqiData()` は `HTTPClient` で AQICN の `/feed/@城市ID/` インターフェースにリクエストし、取得した JSON を `ArduinoJson` の `JsonDocument` でパースし、各フィールドを `AqiData` 構造体に詰めます。現在の 12 項目の指標と、今後数日間の PM2.5/PM10/紫外線予測配列も含まれます。

第三ステップ、`drawUI()` は描画全体のコアで、「タイトルバー → AQI 大枠 → 12 項目指標グリッド → 予測棒グラフ → 下部ステータスバー」の順にブロックごとに描画します。各ブロックの座標は固定のピクセル値で、レイアウトをいじりやすいようにしています。

第四ステップ、中国語は `U8g2_for_Adafruit_GFX` というブリッジ層で描画します。`drawCN` シリーズ関数で黒地に白字／白地に黒字の両モードを統一して包んでおり、毎回色を設定し直す手間を省いています。

第五ステップ、`loop()` で 30 分おきに更新し、画面を再初期化してから `drawUI()` を呼び出し、使い終わったら即座に `powerOff()` で電源を切ります。これが電子ペーパーの省電力と画面保護の鍵——書き換えていないときはまったく給電する必要がありません。

## よくあるトラブルの切り分け

焦らないでください。問題の 80% は以下の数カ所にあります：

**画面がずっと真っ白／乱れる**：まず配線を疑います。特に CS、DC、RES、BUSY の 4 本の制御線の順序が間違っていないか確認。次に `display.init()` のドライバクラス `GxEPD2_420_GYE042A87` が手元の画面の実型番と一致しているかを確認。型番が合わないとタイミングが崩れます。

**中国語が四角や文字化けで表示される**：`U8g2_for_Adafruit_GFX` が正しく初期化されていないサインです。`u8f.begin(display)` が `display.init()` の後に呼ばれているか確認し、使っているフォント（例：`u8g2_font_wqy14_t_gb2312`）に表示したい漢字が含まれているかをチェック。

**WiFi に繋がらない**：開発ボードが 2.4GHz 専用で 5GHz の WiFi に対応していないことを確認。SSID やパスワードに中国語や特殊文字が入っていてエスケープの問題を起こしていないかも確認。

**API の戻り値が全部 0**：たいてい `API_TOKEN` を申請していないか書き間違えているか、`API_URL` の都市 ID（例：`@14370`）が間違っているかのどちらか。まずブラウザで直接このリンクを開いて、正常な JSON が返るか確認してください。

**画面が上下逆さま**：コード内の `ROTATION_FLIP` を 0 から 1 に変更して書き込み直すだけで OK。配線を変える必要はありません。

**コンパイル時に「空間不足 / region `app' overflowed」**：中国語フォントが大きすぎてデフォルトのパーティションを圧迫している状態です。前述の「書き込み設定：パーティション方案」セクションに従い、`Partition Scheme` を `Huge APP (3MB No OTA/1MB SPIFFS)` に変更してからコンパイルすれば解決します。

## FAQ

**Q：ESP32-S3 を通常の ESP32 に変えても動きますか？** A：動きます。ピンが SPI をサポートしており、開発ボードが占有する特殊ピン（Flash 関連ピンなど）でなければ OK。コード内の 6 つの `EPD_*` マクロ定義を実際の配線の GPIO 番号に書き換えるだけで、他のコードは変更不要です。

**Q：GxEPD2_420_GYE042A87 というドライバクラスが自分の画面に合わない場合は？** A：GxEPD2 ライブラリの GitHub リポジトリで該当型番のドライバクラス名を調べ、`display` 定義のその行を置き換えれば OK。他の描画コードは基本的に変更不要です。

**Q：書き換えに何秒もかかるのはなぜですか？もっと速くできますか？** A：白黒電子ペーパーの全画面書き換え（Full Refresh）自体が遅いのがハードウェアの仕様で、コードの問題ではありません。一部の数字だけ更新したい場合は GxEPD2 の部分書き換え（Partial Update）インターフェースを検討できますが、残像が出るリスクがあります。

**Q：AQICN API の無料枠で足りますか？** A：AQICN 個人 Token の無料枠は通常毎分 1000 リクエストで、本プロジェクトは 30 分に 1 回しかリクエストしないため、完全に余裕があります。枠超えを心配する必要はありません。

**Q：ESP32-S3 が書き換えていないときの消費電力はどのくらいですか？** A：本コードではディープスリープを入れておらず、`loop()` 内で `delay()` で待機しているため、実測の典型的な消費電力は数十ミリアンペア程度です。電池駆動版を作るなら `delay(UPDATE_INTERVAL_MS)` を `esp_deep_sleep` に変えることをおすすめします。消費電力をマイクロアンペア級まで下げられます。

**Q：画面がいつまで経っても書き換わらないが、シリアルモニタにはデータ取得成功と出る場合は？** A：`drawUI()` の `display.firstPage()/nextPage()` ループが途中で `return` で抜けられていないか確認してください。GxEPD2 はこのループを最後まで 1 周 回し切らないと、画面に反映されません。

## 応用アイデア

- SD カードからローカルの都市リストを読み込み、複数都市を切り替えるカルーセル型ボードにする
- ボタンを一つ追加し、短押しで手動更新、長押しでディープスリープの省エネモードに切り替え
- 30 分の更新間隔を、環境光センサーの読み取りに変更し、暗くなったら自動的に更新頻度を下げる

## 参考資料

- [GxEPD2 ライブラリ GitHub ホーム](https://github.com/ZinggJM/GxEPD2)
- [ArduinoJson 公式ドキュメント](https://arduinojson.org/)
- [U8g2_for_Adafruit_GFX GitHub ホーム](https://github.com/olikraus/U8g2_for_Adafruit_GFX)
- [AQICN 空気品質 API ドキュメント](https://aqicn.org/api/)
- [Espressif ESP32-S3 製品ページ](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
