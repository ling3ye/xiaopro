---
title: "Piloter un écran e-paper 4,2\" (SSD1683) avec ESP32-S3 | Tableau de bord de la qualité de l'air avec AQICN (GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-4inch2-gdey042a87
category: esp32
date: 2026-07-08
intro: "Pilotez un écran e-paper noir et blanc de 4,2\" (GDEY042A87 / SSD1683) avec un ESP32-S3 et GxEPD2, interrogez l'API de qualité de l'air AQICN et construisez un tableau de bord de bureau qui conserve son image même hors tension. Câblage, code Arduino C++ complet, configuration de partition et guide de dépannage complet inclus."
image: "https://img.lingflux.com/2026/07/39d31272f2976bb195ecea554654502d.jpg"
---

> **En une ligne :** avec un écran e-paper noir et blanc 4,2\" d'occasion dégoté pour une quinzaine de yuans, un ESP32-S3 et l'API de qualité de l'air AQICN, on se fabrique un tableau de bord de bureau qui permet, sans sortir le téléphone, de savoir d'un coup d'œil si aujourd'hui c'est bon pour foncer escalader le mont Baiyun.

Difficulté : ⭐⭐☆☆☆ (accessible aux débutants) Temps estimé : 30 minutes Testé avec : Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 ＋ GxEPD2 v1.6.9 + Adafruit GFX Library v1.12.6 + ArduinoJson v7.4.3 (conseil : cale-toi sur ces versions à l'installation des bibliothèques ; trop récent ou trop ancien, et tu risques de galérer)

> **TL;DR (démarrage rapide) :**
>
> 1. Câblage : GPIO11 → SDI/MOSI, GPIO12 → SCL/SCK, GPIO10 → CS, GPIO9 → DC, GPIO8 → RES, GPIO7 → BUSY, VCC sur 3.3V, GND à la masse commune
> 2. Bibliothèques à installer : ArduinoJson, GxEPD2, Adafruit GFX Library, U8g2_for_Adafruit_GFX (par olikraus)
> 3. Remplace `WIFI_SSID`, `WIFI_PASS`, `API_TOKEN` dans le code par tes propres valeurs (voir la section « Demander un Token API gratuit AQICN » ci-dessous pour obtenir un Token)
> 4. Flash, attends que le Wi-Fi se connecte, l'écran se rafraîchit tout seul avec les données de qualité de l'air

## Préambule

J'ai dégoté pour une quinzaine de yuans un écran e-paper noir et blanc d'occasion sur le marché de seconde main ; honnêtement, au moment de passer commande, j'avais un peu la boule au ventre — si l'écran était mort, l'argent partait en fumée. Heureusement, le test de mise sous tension s'est bien passé, pas de catastrophe, juste une ligne verticale défectueuse, mais rien de grave. Pendant que l'écran était encore chaud, je me suis dit que j'allais en faire un petit tableau de bord qui affiche en permanence, sans app de téléphone, qui permet d'un coup d'œil de savoir si l'air est bon aujourd'hui sur le mont Baiyun — beau temps, on fonce escalader. Cet article raconte le câblage complet, le code et les pièges rencontrés ; en suivant pas à pas, tu devrais réussir à l'allumer du premier coup.

## Résultat

Un ESP32-S3 interroge régulièrement AQICN.ORG pour récupérer les données de qualité de l'air et les rafraîchir sur l'e-paper : un grand chiffre AQI, 12 indicateurs détaillés (PM2.5, PM10, température et humidité, vitesse du vent, etc.) ainsi que des histogrammes de prévision sur 7 jours pour le PM2.5 et l'indice UV ; l'image tient même hors tension. Posé sur le bureau, ça fait une sorte de « boussole feng shui électronique », un très bel objet de déco de bureau.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/foEGSZWcxEE?si=cjtzAEnatEL7e4NY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Description des composants

**La carte de développement ESP32-S3** est une carte SoC avec Wi-Fi : elle se connecte au réseau pour récupérer les données, exécute la logique et pousse l'image à l'écran via SPI. C'est le cerveau du projet. Je l'ai choisie parce qu'elle a beaucoup de broches, assez de puissance de calcul et un Wi-Fi intégré — pas besoin de module réseau supplémentaire.

**La carte pilote e-paper** (faite maison) traduit les commandes SPI envoyées par l'ESP32 en signaux de niveau compréhensibles par l'écran — un véritable « interprète ». Je l'ai dessinée moi-même parce que c'est amusant. Le brochage est identique à ce qu'on trouve sur le marché, donc si tu as une autre carte pilote e-paper, tu peux aussi essayer.

**L'écran e-paper noir et blanc 4,2\"** affiche en faisant basculer des particules noires et blanches dans des microcapsules via un champ électrique ; sa particularité est de garder l'image même hors tension, parfait pour ce genre de tableau d'info « on regarde et on s'en va ». Il ne consomme pas autant qu'un LCD ; en revanche, le rafraîchissement est lent, donc oublie les animations.

## BOM

| Composant | Référence / spé | Quantité |
| --- | --- | --- |
| Carte de développement ESP32 | ESP32-S3 (tout modèle avec assez de broches SPI fait l'affaire) | 1 |
| Carte pilote e-paper | PCB fait maison, brochage identique aux cartes pilotes e-paper courantes du marché | 1 |
| Écran e-paper | 4,2\" noir et blanc, compatible avec le pilote GxEPD2_420_GYE042A87 | 1 |
| Fils Dupont | | quelques-uns |

## Brochage

| Broche | Nom complet | Rôle |
| --- | --- | --- |
| **VCC** | Pôle positif de l'alimentation | Entrée d'alimentation, à relier au 3V3 de l'ESP32-S3 |
| **GND** | Masse | Masse de référence, à relier au GND de l'ESP32-S3 pour boucler le circuit |
| **SDI/MOSI** | Master Out Slave In | Ligne de données SPI, l'ESP32 envoie les données à l'écran |
| **SCL/SCK** | Serial Clock | Ligne d'horloge SPI, donne le tempo des transferts |
| **CS** | Chip Select | Dit à l'écran « les données qui suivent sont pour toi » |
| **DC** | Data/Command | Distingue si l'octet courant est une donnée d'image ou une commande |
| **RES/RST** | Reset | Un coup de bas pour réinitialiser l'écran |
| **BUSY** | Indicateur « occupé » | Tiré vers le bas pendant le rafraîchissement ; l'ESP32 s'en sert pour savoir « est-ce que je peux envoyer la commande suivante » |

## Câblage

| Broche e-paper | Broche ESP32-S3 |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

Conseil : une fois tout câblé, re-vérifie chaque fil un par un, ça économise 80 % du temps de dépannage — le piège avec l'e-paper, c'est qu'un mauvais câblage ne déclenche aucun message d'erreur : l'écran reste juste tout blanc ou affiche du bruit, et à l'œil nu c'est difficile de savoir tout de suite si c'est un problème de code ou de câblage.

## Bibliothèques à installer

Dans le gestionnaire de bibliothèques de l'IDE Arduino, cherche et installe les suivantes (les versions testées sont données à titre indicatif ; en pratique, prends la dernière version stable du gestionnaire) :

| Bibliothèque | Rôle | Version testée |
| --- | --- | --- |
| ArduinoJson | Analyse le JSON renvoyé par l'API AQICN | v7.4.3 |
| GxEPD2 | Bibliothèque pilote cœur de l'e-paper | v1.6.9 |
| Adafruit GFX Library | Bibliothèque graphique de base, dont dépend GxEPD2 | v1.12.6 |
| U8g2_for_Adafruit_GFX | Pont entre la police chinoise U8g2 et Adafruit GFX, pour afficher le chinois | v1.8.0 (par olikraus) |

`WiFi.h`, `HTTPClient.h`, `SPI.h` sont embarqués dans le core ESP32, pas besoin de les installer séparément — ils arrivent avec le paquet de support de la carte ESP32.

## Configuration flash : schéma de partition (important)

Un piège à comprendre avant tout : ce projet utilise les polices chinoises complètes de `U8g2_for_Adafruit_GFX` (le code référence trois jeux : `u8g2_font_wqy16_t_gb2312`, `wqy14`, `wqy12`), qui pèsent à elles toutes près de 500 Ko. Or, le schéma de partition par défaut de l'ESP32 ne réserve que 1 Mo pour le code ; à la compilation, tu vas tomber sur « espace insuffisant (region `app' overflowed) » et le flash sera refusé.

**Solution :** avant le téléversement, agrandis le schéma de partition.

**Chemin :** menu en haut de l'IDE Arduino → `Outils (Tools)` → `Partition Scheme` → choisis **`Huge APP (3MB No OTA/1MB SPIFFS)`**

C'est ce `Huge APP` que j'utilise : il colle d'un coup 3 Mo pour le code, polices et programme y entrent tranquillement, compilation et flash se font sans encombre.

> 💡 Quelques précisions :
> - **Pourquoi les polices sont-elles si grosses ?** GB2312 recense six à sept mille sinogrammes ; chaque police wqy représente une à deux centaines de Ko de données matricielles, impossible de faire aussi compact qu'une police occidentale.
> - **Le prix du No OTA :** avec No OTA, fini les mises à jour « over the air », il faudra flasher via câble USB. Pour un petit gadget de bureau, ça ne change rien : de toute façon, il reste branché sur le bureau.
> - **Encore mieux avec une grosse Flash :** si ton ESP32-S3 a ≥8 Mo de Flash, tu peux choisir un schéma plus généreux (ex. `8M with SPIFFS`), qui préserve l'OTA tout en libérant de la place pour stocker des données.
> - Après avoir changé de schéma de partition, recompile bien — ne te contente pas de cliquer « Téléverser » avec l'ancienne configuration.

## Demander un Token API gratuit AQICN

Le `API_TOKEN` du code et l'identifiant de ville (par ex. `@14370`) proviennent d'AQICN (aqicn.org), c'est gratuit, tu l'obtiens en quatre étapes.

**Étape 1 : trouve ta ville**

Ouvre [aqicn.org](https://aqicn.org/), dans le champ de recherche en haut à droite saisis le nom de la ville ou de la station à surveiller (par ex. « Guangzhou », « Baiyun Mountain »), puis ouvre la page de qualité de l'air correspondante.

**Étape 2 : accède à la plateforme de données API**

Sur la page de la ville, descends pour trouver le lien étiqueté « json: api », clique-dessus : tu seras redirigé vers la plateforme de données AQICN.

**Étape 3 : inscris-toi et active le compte**

Renseigne un e-mail pour créer un compte, va dans ta boîte de réception et clique sur le lien d'activation pour valider. Une fois connecté, tu verras ton **Token** dédié dans la console (une chaîne de caractères aléatoire — garde-la secrète, ne la pousse pas telle quelle dans un dépôt public).

**Étape 4 : assemble l'URL de l'API et renseigne-la dans le code**

Mets ton Token dans la macro `API_TOKEN` du code, puis remplace `@14370` de `API_URL` par l'identifiant de la station voulue (tu peux aussi utiliser directement le nom anglais de la ville ou des coordonnées GPS, voir la [doc de l'API AQICN](https://aqicn.org/api/)), au format complet suivant :

```
https://api.waqi.info/feed/@14370/?token=你的Token
```

Pour vérifier que l'URL est correcte, colle-la dans la barre d'adresse de ton navigateur et ouvre-la : si tu obtiens un JSON contenant `"status":"ok"`, c'est que ça marche.

> Le Token personnel AQICN est totalement gratuit, sans carte bancaire à renseigner ; les quotas sont largement suffisants pour un projet perso, aucune inquiétude à avoir sur la facturation.

## Code complet + explications

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

### Explication du code

Première étape, `connectWiFi()` gère une connexion Wi-Fi standard avec 40 tentatives (20 s) ; en cas de timeout, elle ne fige pas le programme et continue, ce qui permet même hors ligne d'afficher un message d'erreur plutôt qu'un écran noir.

Deuxième étape, `fetchAqiData()` utilise `HTTPClient` pour appeler l'endpoint AQICN `/feed/@villeID/`, puis analyse le JSON reçu via le `JsonDocument` d'`ArduinoJson` et remplit champ par champ la structure `AqiData` : les 12 indicateurs en temps réel ainsi que les tableaux de prévision PM2.5/PM10/UV sur les jours à venir.

Troisième étape, `drawUI()` est le cœur du tracé ; il dessine bloc par bloc dans l'ordre « barre de titre → grand pavé AQI → grille des 12 indicateurs → histogrammes de prévision → barre d'état inférieure » ; les coordonnées de chaque bloc sont des valeurs en pixels figées, pratique pour retoucher la mise en page.

Quatrième étape, le chinois est tracé via le pont `U8g2_for_Adafruit_GFX` ; la famille de fonctions `drawCN` encapsule proprement les deux modes blanc sur noir / noir sur blanc, pour éviter de redéfinir les couleurs à chaque appel.

Cinquième étape, dans `loop()` on rafraîchit toutes les 30 minutes : on réinitialise l'écran, on appelle `drawUI()`, puis on `powerOff()` aussitôt — clé de l'économie d'énergie et de la longévité de l'e-paper : quand il n'affiche rien, autant ne pas l'alimenter.

## Dépannage des problèmes courants

Pas de panique, 80 % des soucis viennent de ces quelques points :

**L'écran reste blanc ou affiche du bruit :** vérifie d'abord le câblage, tout spécialement l'ordre des quatre lignes de contrôle CS, DC, RES, BUSY ; confirme ensuite que la classe pilote `GxEPD2_420_GYE042A87` dans `display.init()` correspond bien au modèle réel de ton écran — un modèle erroné dérègle les timings.

**Le chinois s'affiche en carrés ou en caractères illisibles :** `U8g2_for_Adafruit_GFX` n'est pas correctement initialisé ; vérifie que `u8f.begin(display)` est bien appelé après `display.init()`, et que la police utilisée (ex. `u8g2_font_wqy14_t_gb2312`) contient bien les sinogrammes à afficher.

**Le Wi-Fi ne se connecte pas :** la carte ne supporte que le 2,4 GHz, pas la 5 GHz ; vérifie aussi que le SSID et le mot de passe ne contiennent pas de caractères chinois ou spéciaux qui poseraient un problème d'échappement.

**L'API renvoie tout à 0 :** très probablement `API_TOKEN` non demandé ou mal saisi, ou bien l'ID de ville dans `API_URL` (ex. `@14370`) incorrect ; ouvre d'abord l'URL dans un navigateur pour confirmer qu'elle renvoie un JSON correct.

**L'image est à l'envers (haut/bas inversés) :** passe `ROTATION_FLIP` de 0 à 1 dans le code et re-flash, inutile de recâbler.

**« Espace insuffisant / region `app' overflowed » à la compilation :** les polices chinoises débordent la partition par défaut ; reporte-toi à la section « Configuration flash : schéma de partition » ci-dessus et passe `Partition Scheme` sur `Huge APP (3MB No OTA/1MB SPIFFS)` avant de recompiler.

## FAQ

**Q : Est-ce que je peux remplacer l'ESP32-S3 par un ESP32 classique ?** R : Oui, tant que les broches supportent le SPI et ne sont pas des broches spéciales réservées par la carte (ex. liées à la Flash) ; remplace simplement les 6 macros `EPD_*` du code par les numéros de GPIO correspondant à ton câblage réel, le reste du code n'a pas besoin de bouger.

**Q : La classe pilote GxEPD2_420_GYE042A87 ne correspond pas à mon écran, que faire ?** R : Va sur le dépôt GitHub de GxEPD2 pour trouver le nom de classe correspondant à ton modèle, remplace simplement la ligne de définition de `display`, le reste du code de dessin n'a en général pas besoin d'être modifié.

**Q : Pourquoi un rafraîchissement prend-il plusieurs secondes, peut-on aller plus vite ?** R : Le rafraîchissement complet (Full Refresh) d'un e-paper noir et blanc est intrinsèquement lent, c'est une caractéristique matérielle, pas un souci de code ; si tu ne mets à jour que des chiffres locaux, tu peux creuser l'interface de mise à jour partielle (Partial Update) de GxEPD2, au risque de laisser des images fantômes.

**Q : Le quota gratuit de l'API AQICN est-il suffisant ?** R : Le quota d'un Token personnel AQICN est généralement de 1000 requêtes par minute ; ce projet ne demande qu'une fois toutes les 30 minutes, largement assez, aucune crainte de dépassement.

**Q : Quelle est la consommation de l'ESP32-S3 quand il ne rafraîchit pas ?** R : Le code n'utilise pas le sommeil profond (deep sleep) ; `loop()` s'appuie sur `delay()`, la consommation typique mesurée se situe à quelques dizaines de milliampères ; pour une version sur batterie, remplace `delay(UPDATE_INTERVAL_MS)` par `esp_deep_sleep` pour tomber au niveau du microampère.

**Q : L'écran ne se rafraîchit jamais, mais le moniteur série indique que la récupération des données a réussi, que faire ?** R : Vérifie que la boucle `display.firstPage()/nextPage()` de `drawUI()` n'est pas interrompue par un `return` en cours de route ; GxEPD2 exige que cette boucle tourne complètement au moins une fois pour réellement pousser l'image à l'écran.

## Pour aller plus loin

- Lire une liste de villes locale depuis une carte SD pour faire un tableau de bord multi-villes en carrousel
- Ajouter un bouton : appui court pour rafraîchir manuellement, appui long pour basculer en sommeil profond et économiser de l'énergie
- Remplacer l'intervalle de mise à jour de 30 minutes par une lecture de capteur de luminosité ambiante : à la nuit tombée, réduire automatiquement la fréquence de rafraîchissement

## Références

- [Dépôt GitHub de GxEPD2](https://github.com/ZinggJM/GxEPD2)
- [Documentation officielle ArduinoJson](https://arduinojson.org/)
- [Dépôt GitHub de U8g2_for_Adafruit_GFX](https://github.com/olikraus/U8g2_for_Adafruit_GFX)
- [Documentation de l'API qualité de l'air AQICN](https://aqicn.org/api/)
- [Page produit ESP32-S3 chez Espressif](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
