---
title: "Pilotare un display e-paper 4.2\" (SSD1683) con ESP32-S3 | Dashboard della qualità dell'aria con AQICN (GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-4inch2-gdey042a87
category: esp32
date: 2026-07-08
intro: "Usa un ESP32-S3 e GxEPD2 per pilotare un display e-paper bianco e nero da 4.2\" (GDEY042A87 / SSD1683) e prelevare i dati dall'API di qualità dell'aria AQICN per costruire una dashboard da scrivania che mantiene l'immagine anche senza alimentazione. Include cablaggio, codice completo in Arduino C++, configurazione della partizione e guida completa al troubleshooting."
image: "https://img.lingflux.com/2026/07/39d31272f2976bb195ecea554654502d.jpg"
---

> **In breve:** con un display e-paper bianco e nero da 4.2" rimediato a pochissimi soldi sul mercato dell'usato e un ESP32-S3, ti colleghi all'API di qualità dell'aria AQICN per costruirti una dashboard da scrivania: niente più telefono in mano, basta un'occhiata per capire se oggi si può correre a scalare il Baiyun Mountain.

Difficoltà: ⭐⭐☆☆☆ (adatta ai principianti)
Tempo stimato: 30 minuti
Testato con: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 ＋ GxEPD2 v1.6.9 + Adafruit GFX Library v1.12.6 + ArduinoJson v7.4.3 (ti consiglio di attenerti a queste versioni quando installi le librerie: versioni troppo nuove o troppo vecchie possono creare grattacapi)

> **TL;DR (avvio rapido):**
>
> 1. Cablaggio: GPIO11 → SDI/MOSI, GPIO12 → SCL/SCK, GPIO10 → CS, GPIO9 → DC, GPIO8 → RES, GPIO7 → BUSY, VCC a 3.3V, GND in comune con la massa
> 2. Librerie da installare: ArduinoJson, GxEPD2, Adafruit GFX Library, U8g2_for_Adafruit_GFX (di olikraus)
> 3. Modifica nel codice `WIFI_SSID`, `WIFI_PASS` e `API_TOKEN` con i tuoi dati (per il Token vedi la sezione «Richiedere un Token API gratuito su AQICN» qui sotto)
> 4. Flasha, aspetta che il Wi-Fi si colleghi, lo schermo si aggiornerà da solo con i dati sulla qualità dell'aria

## Introduzione

Ho rimediato, spendendo pochissimo, un display e-paper bianco e nero sul mercato dell'usato: a dire il vero, nel fare l'ordine avevo una mezza paura — se era un pannello difettoso, i soldi andavano persi. Per fortuna il test di accensione è andato liscio, nessun disastro; c'è una linea verticale guasta, ma non dà troppo fastidio. Finché il display era ancora «caldo», ho pensato di costruirci una piccola dashboard che stia sempre accesa, senza app sul telefono, dove un'occhiata basta per capire se oggi l'aria sul Baiyun Mountain è buona — e se il tempo è bello, si corre a scalarlo. Questo articolo racconta il cablaggio completo, il codice e i trabocchetti incontrati strada facendo: seguendolo passo passo, dovresti riuscire ad accenderlo al primo colpo.

## Risultato finale

Un ESP32-S3 preleva a intervalli regolari i dati sulla qualità dell'aria da AQICN.ORG e li aggiorna sull'e-paper: sullo schermo compaiono il numero grande dell'AQI, 12 indicatori di dettaglio (PM2.5, PM10, temperatura e umidità, velocità del vento, ecc.) e i grafici a barre delle previsioni a sette giorni per PM2.5 e raggi UV. Scollegando l'alimentazione l'immagine resta lì: sulla scrivania diventa una specie di «barometro elettronico dell'aria», un bell'oggetto da tenere a portata di mano.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/foEGSZWcxEE?si=cjtzAEnatEL7e4NY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Descrizione dei componenti

**La scheda di sviluppo ESP32-S3** è una SoC con il Wi-Fi integrato: si occupa di andare in rete a recuperare i dati, eseguire la logica e spingere il disegno allo schermo via SPI; è il cervello di tutto il progetto. L'ho scelta perché ha tanti pin, calcolo sufficiente e il Wi-Fi incorporato, senza dover aggiungere un modulo di rete esterno.

**La scheda driver per e-paper** (autocostruita) traduce i comandi SPI provenienti dall'ESP32 nei segnali di livello che lo schermo riesce a capire; in pratica fa da «interprete». L'ho disegnata da me perché è divertente. I pin portati fuori sono gli stessi dei moduli in commercio, quindi se hai un'altra scheda driver per e-paper puoi tranquillamente provarla.

**Il display e-paper bianco e nero da 4.2"** funziona ribaltando, tramite un campo elettrico, le microcapsule contenenti particelle bianche e nere: la sua caratteristica è che mantiene l'immagine anche senza alimentazione, ideale per una dashboard «un'occhiata e via». Non consuma come un LCD; il prezzo da pagare è che si aggiorna lentamente, quindi non è adatto alle animazioni.



## Lista dei materiali (BOM)

| Componente | Modello/specifica | Quantità |
| --- | --- | --- |
| Scheda di sviluppo ESP32 | ESP32-S3 (va bene qualsiasi modello con pin SPI sufficienti) | 1 |
| Scheda driver per e-paper | PCB autocostruito, definizione dei pin identica a quella delle principali schede driver per e-paper in commercio | 1 |
| Display e-paper | 4.2" bianco e nero, compatibile con il driver GxEPD2_420_GYE042A87 | 1 |
| Cavetti Dupont | | alcuni |

## Descrizione dei pin dei componenti

| Pin | Nome completo | Funzione |
| --- | --- | --- |
| **VCC** | polo positivo alimentazione | ingresso di alimentazione, collega l'uscita 3V3 dell'ESP32-S3 |
| **GND** | massa di alimentazione | riferimento di massa, collega il GND dell'ESP32-S3 per chiudere il circuito |
| **SDI/MOSI** | Master Out Slave In | linea dati SPI, l'ESP32 invia i dati allo schermo |
| **SCL/SCK** | Serial Clock | clock SPI, scandisce il ritmo di trasmissione |
| **CS** | Chip Select | comunica allo schermo «i prossimi dati sono per te» |
| **DC** | Data/Command | distingue se stai inviando dati immagine o comandi di controllo |
| **RES/RST** | Reset | un colpo a basso per reinizializzare lo schermo |
| **BUSY** | stato occupato | durante l'aggiornamento viene tenuto basso; l'ESP32 lo legge per capire «posso mandare il prossimo comando?» |

## Modalità di cablaggio

| Pin e-paper | Pin ESP32-S3 |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

Ti consiglio, finito il cablaggio, di ricontrollare ogni filo uno per uno: risparmia l'80% del tempo di troubleshooting. La cosa più subdola degli e-paper è che i fili sbagliati non generano alcun errore, ma solo schermate artefatte o bianche, ed è difficile capire a occhio se si tratta di un problema di codice o di collegamento.

## Librerie da installare

Nel Library Manager dell'Arduino IDE cerca e installa le seguenti librerie (le versioni testate sono solo indicative; fai riferimento all'ultima versione stabile disponibile nel Library Manager):

| Libreria | Funzione | Versione testata |
| --- | --- | --- |
| ArduinoJson | analizza il JSON restituito dall'API AQICN | v7.4.3 |
| GxEPD2 | libreria core del driver e-paper | v1.6.9 |
| Adafruit GFX Library | libreria base per la grafica, da cui dipende GxEPD2 | v1.12.6 |
| U8g2_for_Adafruit_GFX | fa da ponte tra i font cinesi di U8g2 e Adafruit GFX, per visualizzare il cinese | v1.8.0 (di olikraus) |

`WiFi.h`, `HTTPClient.h` ed `SPI.h` sono incluse nel core ESP32: non servono installazioni separate, ci sono già una volta che hai installato il pacchetto di supporto alla scheda ESP32.

## Configurazione di flash: lo schema di partizione (importante)

Qui c'è un trabocchetto da chiarire prima di tutto: il progetto usa la libreria di font cinesi completa di `U8g2_for_Adafruit_GFX` (nel codice sono richiamati `u8g2_font_wqy16_t_gb2312`, `wqy14` e `wqy12`); messi insieme, questi font GB2312 sfiorano i 500KB. Lo schema di partizione predefinito dell'ESP32 riserva solo 1MB alla memoria programma, quindi in fase di compilazione otterrai un errore del tipo «spazio insufficiente (region `app' overflowed)» e non riuscirai a flashare.

**Soluzione:** prima di fare l'upload, allarga lo schema di partizione.

**Percorso:** menu in alto dell'Arduino IDE → `Strumenti (Tools)` → `Partition Scheme` → scegli **`Huge APP (3MB No OTA/1MB SPIFFS)`**

Io uso proprio questo `Huge APP`: assegna 3MB filati alla memoria programma, font e codice ci entrano comodamente, e compilazione e upload vanno lisci.

> 💡 Alcune note:
> - **Perché il font è così grande?** GB2312 raccoglie seimila-settemila caratteri cinesi; ogni set di font wqy è una matrice di punti da un paio di centinaia di KB: non può essere piccolo come un font latino.
> - **Il prezzo di No OTA:** scegliendo No OTA non potrai più flashare il firmware «over the air», dovrai collegare il cavo USB. Per un piccolo oggetto da scrivania non cambia nulla: sta lì, attaccato alla corrente.
> - **Ancora meglio con una scheda dal Flash grande:** se il tuo ESP32-S3 ha ≥8MB di Flash, puoi scegliere uno schema più generoso (per esempio `8M with SPIFFS`), che non sacrifica l'OTA e ti lascia spazio extra per i dati.
> - Dopo aver cambiato lo schema di partizione ricordati di ricompilare: non limitarti a cliccare «Upload» con la vecchia configurazione.

## Richiedere un Token API gratuito su AQICN

Nel codice, `API_TOKEN` e l'ID della città (per esempio `@14370`) provengono da AQICN (aqicn.org): è gratuito, basta seguire i quattro passi qui sotto per ottenerli.

**Primo passo: trova la tua città**

Apri [aqicn.org](https://aqicn.org/) e, nella casella di ricerca in alto a destra, digita il nome della città o della stazione di monitoraggio che vuoi seguire (per esempio «Guangzhou» o «Baiyun Mountain»), poi entra nella pagina corrispondente alla qualità dell'aria.

**Secondo passo: entra nella piattaforma dati API**

Scorri la pagina della città verso il basso, trova il link etichettato «json: api» e cliccaci sopra: verrai portato alla piattaforma dati di AQICN.

**Terzo passo: registrati e attiva l'account**

Registrati con la tua email, apri l'email di attivazione e clicca sul link per completare la verifica. Una volta entrato, nel tuo pannello trovi il tuo **Token** personale (una stringa casuale di caratteri: tienila segreta, non caricarla in un repo pubblico).

**Quarto passo: componi l'URL dell'API e inseriscilo nel codice**

Metti il Token nella macro `API_TOKEN` del codice e sostituisci `@14370` in `API_URL` con l'ID della stazione che ti interessa (puoi anche usare direttamente il nome della città in inglese o le coordinate lat/long: la sintassi è descritta nella [documentazione dell'API AQICN](https://aqicn.org/api/)). Il formato completo è:

```
https://api.waqi.info/feed/@14370/?token=你的Token
```

Per verificare che l'indirizzo sia giusto, incolla quella stringa nella barra degli indirizzi del browser e aprila: se vedi tornare un JSON con `"status":"ok"`, la connessione è a posto.

> Il Token personale di AQICN è del tutto gratuito, senza carta di credito collegata; la quota è più che sufficiente per qualsiasi progetto personale, non devi preoccuparti di pagare.

## Codice completo + spiegazione

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

### Spiegazione del codice

Per primo, `connectWiFi()` fa la classica connessione Wi-Fi, con 40 tentativi (20 secondi): se va in timeout non si blocca, ma continua l'esecuzione, così in mancanza di rete vedi comunque un messaggio di errore invece di uno schermo nero.

Per secondo, `fetchAqiData()` usa `HTTPClient` per chiamare l'endpoint `/feed/@IDcittà/` di AQICN; una volta ottenuto il JSON lo analizza con il `JsonDocument` di `ArduinoJson` e riempie campo per campo la struttura `AqiData`, compresi i 12 indicatori attuali e gli array di previsione dei prossimi giorni per PM2.5, PM10 e raggi UV.

Per terzo, `drawUI()` è il cuore del disegno: impagina per blocchi nell'ordine «barra del titolo → riquadrone dell'AQI → griglia dei 12 indicatori → grafici a barre delle previsioni → barra di stato in fondo». Le coordinate di ogni blocco sono pixel fissi, così è facile regolare il layout a colpo d'occhio.

Per quarto, il cinese viene disegnato grazie al ponte di `U8g2_for_Adafruit_GFX`: le funzioni della serie `drawCN` incapsulano in modo uniforme le due modalità bianco-su-nero e nero-su-bianco, così non devi ripetere l'impostazione del colore a ogni chiamata.

Per quinto, nel `loop()` l'aggiornamento avviene ogni 30 minuti: dopo aver reinizializzato lo schermo richiama `drawUI()` e, finito il lavoro, stacca subito la corrente con `powerOff()`. Questo è il segreto per risparmiare energia e far durare il pannello: quando non si aggiorna, l'e-paper non ha bisogno di alimentazione.

## Risoluzione dei problemi più comuni

Niente panico: l'80% dei problemi nasce in questi punti.

**Schermo sempre bianco o artefatto:** controlla prima il cablaggio, in particolare le quattro linee di controllo CS, DC, RES e BUSY (ordine sbagliato?). Poi verifica che la classe driver passata a `display.init()`, `GxEPD2_420_GYE042A87`, corrisponda al modello reale del pannello che hai in mano: un modello sbagliato sballa i tempi e il display non si aggiorna mai correttamente.

**Il cinese compare come quadratini o caratteri senza senso:** significa che `U8g2_for_Adafruit_GFX` non si è inizializzato correttamente; controlla che `u8f.begin(display)` sia chiamato dopo `display.init()`, e verifica che il font in uso (per esempio `u8g2_font_wqy14_t_gb2312`) contenga effettivamente i caratteri cinesi che vuoi mostrare.

**Il Wi-Fi non si collega:** la scheda supporta solo i 2.4GHz, non le reti 5GHz; verifica inoltre che SSID e password non contengano caratteri cinesi o caratteri speciali che generino problemi di escaping.

**I dati tornati dall'API sono tutti a 0:** quasi sempre `API_TOKEN` non è stato richiesto o è scritto male, oppure l'ID città in `API_URL` (per esempio `@14370`) è sbagliato; prova prima ad aprire il link nel browser per controllare che torni un JSON corretto.

**L'immagine è capovolta (sopra/sotto):** cambia `ROTATION_FLIP` da 0 a 1 nel codice e riflasha, senza toccare il cablaggio.

**In compilazione, errore «spazio insufficiente / region `app' overflowed»:** il font cinese è troppo grosso e fa traboccare la partizione predefinita; segui la sezione «Configurazione di flash: lo schema di partizione» e imposta `Partition Scheme` su `Huge APP (3MB No OTA/1MB SPIFFS)`, poi ricompila.

## Domande frequenti

**D: Posso sostituire l'ESP32-S3 con un ESP32 normale?** R: Sì, basta che i pin supportino SPI e non siano pin speciali già occupati dalla scheda (per esempio quelli legati al Flash); cambia i 6 define `EPD_*` nel codice con i GPIO che hai effettivamente cablato, il resto del codice non si tocca.

**D: La classe `GxEPD2_420_GYE042A87` non corrisponde al mio schermo, come faccio?** R: Vai nel repo GitHub della libreria GxEPD2, cerca il nome della classe driver del tuo modello e sostituiscila nella riga in cui è definito `display`; in genere il resto del codice di disegno non ha bisogno di modifiche.

**D: Perché un aggiornamento dura vari secondi, si può accelerare?** R: Il full refresh di un e-paper bianco e nero è di per sé lento, è una caratteristica hardware, non un problema di codice; se devi cambiare solo qualche numero puoi studiare l'interfaccia di Partial Update di GxEPD2, ma rischi di lasciare immagine fantasma.

**D: La quota gratuita dell'API AQICN basta?** R: La quota del Token personale AQICN è di solito 1000 richieste al minuto; questo progetto fa una richiesta ogni 30 minuti, quindi è largamente sufficiente: nessun rischio di superare il limite.

**D: Quanto consuma l'ESP32-S3 quando non aggiorna?** R: Nel codice non ho inserito il deep sleep: nel `loop()` uso un `delay()` che sospende la scheda, e il consumo reale è dell'ordine di alcune decine di milliampere; per una versione a batteria ti consiglio di sostituire `delay(UPDATE_INTERVAL_MS)` con `esp_deep_sleep`, così scendi a livello di microampere.

**D: Lo schermo non si aggiorna mai, ma il monitor seriale dice che il recupero dati è riuscito.** R: Controlla che il ciclo `display.firstPage()/nextPage()` dentro `drawUI()` non venga interrotto da un `return` lungo la strada: GxEPD2 richiede che il ciclo sia completato per intero almeno una volta, altrimenti l'immagine non viene mai spinta fisicamente al display.

## Idee per andare oltre

- Leggere da SD card una lista di città locale e realizzare una dashboard che scorre tra più località
- Aggiungere un pulsante: pressione breve per l'aggiornamento manuale, pressione lunga per passare al deep sleep e risparmiare corrente
- Sostituire l'intervallo fisso di 30 minuti con la lettura di un sensore di luce ambientale, così al buio la frequenza di aggiornamento si abbassa da sola

## Riferimenti

- [Repository GitHub di GxEPD2](https://github.com/ZinggJM/GxEPD2)
- [Documentazione ufficiale di ArduinoJson](https://arduinojson.org/)
- [Repository GitHub di U8g2_for_Adafruit_GFX](https://github.com/olikraus/U8g2_for_Adafruit_GFX)
- [Documentazione dell'API di qualità dell'aria AQICN](https://aqicn.org/api/)
- [Pagina prodotto Espressif ESP32-S3](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
