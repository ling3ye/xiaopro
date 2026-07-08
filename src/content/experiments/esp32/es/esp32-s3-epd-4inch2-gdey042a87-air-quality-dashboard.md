---
title: "Controlar una pantalla e-paper de 4.2\" (SSD1683) con ESP32-S3 | Panel de calidad del aire con AQICN (GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-4inch2-gdey042a87
category: esp32
date: 2026-07-08
intro: "Usa un ESP32-S3 y GxEPD2 para controlar una pantalla e-paper blanco y negro de 4.2\" (GDEY042A87 / SSD1683) y obtén datos de la API de calidad del aire AQICN para construir un panel de escritorio que conserva la imagen incluso sin alimentación. Incluye cableado, código completo en Arduino C++, configuración de partición y guía completa de resolución de problemas."
image: "https://img.lingflux.com/2026/07/39d31272f2976bb195ecea554654502d.jpg"
---

> **Resumen en una línea**: con una pantalla e-paper blanco y negro de 4,2\" que compré de segunda mano por poco dinero y un ESP32-S3, te montas un panel de calidad del aire conectado a la API de AQICN para saber de un vistazo, sin sacar el móvil, si hoy hace bueno para salir a correr a la montaña.

Dificultad: ⭐⭐☆☆☆ (aptto para principiantes)
Tiempo estimado: 30 minutos
Entorno de prueba: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 ＋ GxEPD2 v1.6.9 + Adafruit GFX Library v1.12.6 + ArduinoJson v7.4.3 (a la hora de instalar las librerías, coteja con estas versiones; si vas demasiado nuevo o demasiado viejo, te puedes llevar sorpresas)

> **TL;DR (puesta en marcha rápida):**
>
> 1. Cableado: GPIO11 → SDI/MOSI, GPIO12 → SCL/SCK, GPIO10 → CS, GPIO9 → DC, GPIO8 → RES, GPIO7 → BUSY, VCC a 3.3V, GND con tierra común
> 2. Librerías: ArduinoJson, GxEPD2, Adafruit GFX Library, U8g2_for_Adafruit_GFX (del autor olikraus)
> 3. Cambia el `WIFI_SSID`, el `WIFI_PASS` y el `API_TOKEN` del código por los tuyos (para conseguir el Token, mira el apartado «Solicitar un Token gratuito de la API de AQICN»)
> 4. Flashea, espera a que se conecte al WiFi y la pantalla se refrescará sola con los datos de calidad del aire

## Prefacio

Aquélla pantalla e-paper blanco y negro de 4,2\" la pillé de segunda mano por muy poco dinero; para serte sincero, al hacer el pedido iba con un poco de miedo: si resultaba estar rota, el dinero se iba al garete. Por suerte, al probarla todo funcionaba y no hubo susto, aunque tiene una línea vertical muerta que por fortuna no afecta gran cosa. Aprovechando que la pantalla seguía «caliente», me lancé a montar un pequeño panel que siempre esté mostrando algo, sin necesidad de app de móvil, y que de un vistazo te diga si hoy el aire está limpio para irse a la montaña: si hace bueno, ¡a correr! Este artículo recoge el cableado completo, el código y las trampas que fui pisando, de forma que si lo sigas, lo más probable es que lo enciendas a la primera.

## Resultado del experimento

Un ESP32-S3 tira cada cierto tiempo de los datos de calidad del aire desde AQICN.ORG y los refresca sobre la pantalla e-paper. La pantalla incluye el número grande de AQI, 12 indicadores detallados (PM2.5, PM10, temperatura y humedad, velocidad del viento, etc.) y un gráfico de barras con la previsión de 7 días para PM2.5 y para el índice UV. Aunque se vaya la luz, la imagen se queda ahí: sobre la mesa se convierte en una especie de «barómetro digital» y hace un adorno estupendo.

## Descripción de los componentes

**La placa ESP32-S3** es una placa SoC con WiFi que se encarga de conectarse a la red para bajar los datos, ejecutar la lógica y empujar la imagen a la pantalla por SPI: es el cerebro de todo el proyecto. La elegí porque tiene muchos pines, sobra de potencia y WiFi integrado, así que no hace falta añadir ningún módulo de red aparte.

**La placa driver para la e-paper** (casera) traduce las instrucciones SPI que manda el ESP32 a las señales de nivel que la pantalla entiende; viene a ser un «intérprete». La dibujé yo porque me apetecía. Los pines que saqué a la placa son los mismos que en las placas driver del mercado, así que si tienes otra placa driver para e-paper, también puedes probar.

**La pantalla e-paper blanco y negro de 4,2\"** muestra la imagen girando las partículas blancas y negras dentro de microcápsulas mediante un campo eléctrico. Su característica clave es que conserva la imagen incluso sin alimentación, así que va genial para un panel de información de esos que «miras un momento y te vas». No gasta tanta energía como un LCD; la contra es que refresca lento, así que no sirve para animaciones.



## Lista de materiales (BOM)

| Componente | Modelo / especificación | Cantidad |
| ---------- | ----------------------- | -------- |
| Placa ESP32 | ESP32-S3 (cualquier modelo con suficientes pines SPI) | 1 |
| Placa driver para e-paper | PCB casero, con los mismos pines que las placas driver habituales del mercado | 1 |
| Pantalla e-paper | 4,2\" blanco y negro, compatible con el driver GxEPD2_420_GYE042A87 | 1 |
| Cables Dupont | | varios |

## Descripción de los pines del componente

| Pin | Nombre completo | Función |
| ------------ | ---------------- | ------------------------------------------------ |
| **VCC**      | polo positivo de alimentación | entrada de alimentación, va al 3V3 del ESP32-S3 |
| **GND**      | masa de alimentación           | referencia de tierra, va al GND del ESP32-S3 para cerrar el circuito |
| **SDI/MOSI** | Master Out Slave In | línea de datos SPI; el ESP32 envía datos a la pantalla |
| **SCL/SCK**  | reloj serie | línea de reloj SPI; marca el ritmo de la transmisión |
| **CS**       | Chip Select | le dice a la pantalla «lo que viene ahora va para ti» |
| **DC**       | conmutador Datos/Comando | distingue si lo que envías son datos de imagen o comandos de control |
| **RES/RST**  | Reset | una pulsación a bajo para reinicializar la pantalla |
| **BUSY**     | indicador de ocupado | durante el refresco lo pone a bajo; el ESP32 lo usa para saber «¿puedo mandarle ya la siguiente instrucción?» |

## Forma de cableado

| Pin de la e-paper | Pin del ESP32-S3 |
| ---------- | ---------------- |
| SDI/MOSI   | GPIO11           |
| SCL/SCK    | GPIO12           |
| CS         | GPIO10           |
| DC         | GPIO9            |
| RES        | GPIO8            |
| BUSY       | GPIO7            |
| VCC        | 3.3V             |
| GND        | GND              |

Te recomiendo que, nada más cablear, repases pin a pin; te ahorrarás el 80 % del tiempo de depuración. Lo peor que tiene la e-paper es que si te equivocas en el cableado no te va a soltar ningún error: simplemente se queda con la pantalla llena de ruido o en blanco, y a ojo es muy difícil saber a primera vista si es problema del código o de los cables.

## Librerías que necesitas instalar

En el gestor de librerías del Arduino IDE busca e instala las siguientes (las versiones probadas son solo orientativas; en la práctica, instala la última versión estable del gestor):

| Librería | Función | Versión probada |
| --------------------- | ----------------------------------------------- | ----------------------- |
| ArduinoJson           | parsear el JSON que devuelve la API de AQICN    | v7.4.3                  |
| GxEPD2                | librería núcleo para el driver de la e-paper    | v1.6.9                  |
| Adafruit GFX Library  | librería base de gráficos; GxEPD2 depende de ella | v1.12.6                 |
| U8g2_for_Adafruit_GFX | puentea el catálogo de fuentes chinas de U8g2 hacia Adafruit GFX para mostrar chino | v1.8.0 (autor olikraus) |

`WiFi.h`, `HTTPClient.h` y `SPI.h` ya vienen con el core de ESP32, no hace falta instalarlos aparte; los tienes en cuanto instalas el soporte de placas ESP32.

## Configuración de flasheo: el esquema de partición (importante)

Aquí hay una trampa que conviene tener clara antes de empezar. Este proyecto usa los catálogos completos de fuentes chinas de `U8g2_for_Adafruit_GFX` (en el código se referencian las tres familias `u8g2_font_wqy16_t_gb2312`, `wqy14` y `wqy12`); entre todas, las fuentes GB2312 se acercan a los 500 KB. El esquema de partición por defecto del ESP32 solo le deja 1 MB a la zona de programa, así que al compilar te suelta «espacio insuficiente (region `app' overflowed)» y no te deja flashear.

**Solución**: antes de subir, amplía el esquema de partición.

**Ruta de operación**: menú superior del Arduino IDE → `Herramientas (Tools)` → `Partition Scheme` → elige **`Huge APP (3MB No OTA/1MB SPIFFS)`**

Yo uso justo ese `Huge APP`, que le asigna de golpe 3 MB a la zona de programa: fuentes y código entran holgados y todo compila y flashea sin tugurios.

> 💡 Un par de apuntes más:
> - **¿Por qué son tan grandes las fuentes?** GB2312 recoge entre seis y siete mil caracteres chinos; cada familia de fuentes wqy son un par de cientos de KB de datos de mapa de bits, no hay forma de que ocupen tan poco como una fuente occidental.
> - **La contra del No OTA**: si eliges No OTA, te despides de actualizar el firmware «por aire»; tendrás que flashear con el cable USB honestamente. Para un cacharro de escritorio no afecta en absoluto; al final va a estar ahí, enchufado a la corriente.
> - **Mejor opción para placas con mucha Flash**: si tu ESP32-S3 es una versión con ≥8 MB de Flash, puedes elegir un esquema más holgado (por ejemplo `8M with SPIFFS`): así no renuncias al OTA y además te sobra sitio para guardar datos.
> - Después de cambiar el esquema de partición, acuerdate de recompilar; no vayas a darle solo a «Subir» con la configuración vieja.

## Solicitar un Token gratuito de la API de AQICN

El `API_TOKEN` del código y el identificador de ciudad (por ejemplo `@14370`) salen de AQICN (aqicn.org); es gratis, y en cuatro pasos lo tienes.

**Primer paso: encuentra tu ciudad**

Abre [aqicn.org](https://aqicn.org/) y, en el buscador de la esquina superior derecha, escribe la ciudad o estación de medición que quieras vigilar (por ejemplo «Guangzhou» o «Baiyun Mountain»); entra en la página de calidad del aire correspondiente.

**Segundo paso: entra en la plataforma de datos API**

En esa página de la ciudad, haz scroll hacia abajo, busca el enlace marcado como «json: api», haz clic y saltarás a la plataforma de datos de AQICN.

**Tercer paso: regístrate y activa la cuenta**

Regístrate con tu correo, ve a la bandeja de entrada y haz clic en el enlace de activación para verificarla. Una vez dentro, en la consola verás tu **Token** personal (una cadena aleatoria de caracteres; mantenlo en secreto y no lo subas tal cual a un repositorio público).

**Cuarto paso: monta la URL de la API y pégala en el código**

Pega el Token en la macro `API_TOKEN` del código y cambia el `@14370` de `API_URL` por el identificador de la estación que quieras (también puedes usar directamente el nombre de la ciudad en inglés o unas coordenadas de latitud/longitud; el formato lo tienes en la [documentación de la API de AQICN](https://aqicn.org/api/)). La forma completa es esta:

```
https://api.waqi.info/feed/@14370/?token=你的Token
```

Para confirmar que la dirección queda bien, pega esa cadena tal cual en la barra de direcciones del navegador; si al abrirla recibes un JSON con `"status":"ok"`, es que tira.

> El Token personal de AQICN es totalmente gratuito, no hace falta tarjeta, y el cupo da de sobra para juguetear en proyectos personales; no te preocupes por cargos.

## Código completo + explicación

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

### Explicación del código

El primer paso, dentro de `connectWiFi()`, es la conexión WiFi estándar con 40 reintentos (20 s); si se agota el tiempo no se queda colgado, sino que sigue para que, incluso sin red, primero veas un mensaje de error en vez de una pantalla en negro.

El segundo paso, `fetchAqiData()`, usa `HTTPClient` para pedir el endpoint `/feed/@IDciudad/` de AQICN; una vez tiene el JSON, lo parsea con el `JsonDocument` de `ArduinoJson` y va rellenando campo a campo la estructura `AqiData`, incluyendo los 12 indicadores actuales y las previsiones de PM2.5/PM10/UV de los próximos días.

El tercer paso, `drawUI()`, es el núcleo del dibujo: pinta por bloques en el orden «barra de título → caja grande de AQI → rejilla de 12 indicadores → gráfico de barras de previsión → barra de estado inferior». Las coordenadas de cada bloque están escritas a fuego en píxeles, así te resulta cómodo retocar el layout a tu gusto.

El cuarto paso: el chino se dibuja gracias al puente de `U8g2_for_Adafruit_GFX`; la familia de funciones `drawCN` encapsula por ti los dos modos de blanco sobre negro y negro sobre blanco, y así evitas repetir la configuración de color en cada llamada.

El quinto paso: el `loop()` refresca cada 30 minutos; tras reinicializar la pantalla, llama a `drawUI()` y, al terminar, suelta la corriente con `powerOff()`. Ese es el truco clave para que una e-paper gaste poco y viva más: cuando no está refrescando, no hace falta alimentarla.

## Resolución de problemas frecuentes

Tranqui: el 80 % de los problemas sale de estos sitios:

**La pantalla se queda en blanco o llena de ruido**: revisa primero el cableado, sobre todo los cuatro cables de control CS, DC, RES y BUSY (que no estén cruzados de orden); después confirma que la clase de driver `GxEPD2_420_GYE042A87` que has puesto en `display.init()` coincide con el modelo real de tu pantalla; si el modelo no encaja, los tiempos se vuelven locos.

**El chino se ve como cuadraditos o como basura**: significa que `U8g2_for_Adafruit_GFX` no se ha inicializado bien. Comprueba que llamas a `u8f.begin(display)` después de `display.init()`, y confirma que la fuente que usas (por ejemplo `u8g2_font_wqy14_t_gb2312`) contiene los caracteres chinos que quieres mostrar.

**No conecta al WiFi**: ojo, la placa solo soporta 2,4 GHz, no 5 GHz; y comprueba también que el SSID o la contraseña no lleven caracteres especiales o acentos que lien con las secuencias de escape.

**La API devuelve todo ceros**: lo más probable es que el `API_TOKEN` no lo hayas solicitado o lo hayas escrito mal; también puede ser que el ID de ciudad dentro de `API_URL` (por ejemplo `@14370`) no sea correcto. Abre antes la URL en el navegador y confirma que devuelve un JSON sano.

**La imagen sale del revés (boca abajo)**: cambia `ROTATION_FLIP` de 0 a 1 en el código, vuelve a flashear y listo; no hace falta tocar el cableado.

**Al compilar te sale «espacio insuficiente / region `app' overflowed»**: las fuentes chinas son tan grandes que revientan la partición por defecto; siguiendo el apartado «Configuración de flasheo: el esquema de partición», cambia el `Partition Scheme` a `Huge APP (3MB No OTA/1MB SPIFFS)` y vuelve a compilar.

## Preguntas frecuentes (FAQ)

**P: ¿Puedo cambiar el ESP32-S3 por un ESP32 normal?** R: Sí; mientras los pines que uses soporten SPI y no sean pines especiales reservados por la placa (como los del Flash), simplemente cambia los 6 macros `EPD_*` del código por los números GPIO a los que hayas cableado; el resto del código no hace falta tocarlo.

**P: ¿Y si la clase GxEPD2_420_GYE042A87 no encaja con mi pantalla?** R: busca en el repositorio GitHub de GxEPD2 el nombre de la clase de driver que corresponde a tu modelo, sustituye esa línea en la definición de `display` y normalmente no tendrás que tocar nada más del código de dibujo.

**P: ¿Por qué tarda varios segundos en refrescar? ¿Se puede acelerar?** R: el refresco completo (Full Refresh) de una pantalla e-paper blanco y negro es lento por naturaleza, es una característica del hardware, no del código; si solo quieres actualizar números sueltos, puedes investigar el refresco parcial (Partial Update) de GxEPD2, aunque te arriesgas a que queden fantasmas en pantalla.

**P: ¿La cuota gratuita de la API de AQICN llega?** R: el Token personal de AQICN suele permitir en torno a 1000 peticiones por minuto; este proyecto solo pide una cada 30 minutos, así que vas sobrado, no te preocupes por pasarte.

**P: ¿Cuánto consume el ESP32-S3 cuando no está refrescando?** R: el código no entra en deep sleep, en el `loop()` se queda colgado con `delay()`; el consumo típico medido anda por las decenas de miliamperios. Si quieres una versión a pilas, te recomiendo sustituir el `delay(UPDATE_INTERVAL_MS)` por `esp_deep_sleep`: el consumo se desploma a nivel de microamperios.

**P: La pantalla no se refresca, pero el monitor serie dice que la captura de datos ha ido bien. ¿Qué miro?** R: revisa que dentro de `drawUI()` el bucle `display.firstPage()/nextPage()` no se interrumpe por algún `return` a mitad; GxEPD2 exige que este bucle se complete entero al menos una vez para que la imagen realmente llegue a la pantalla.

## Ideas para seguir jugando

- Leer desde la SD una lista local de ciudades y montar un panel que vaya rotando entre varias
- Añadir un botón: pulsación corta para refrescar a mano, pulsación larga para cambiar al modo de bajo consumo con deep sleep
- Cambiar el intervalo de 30 minutos por una lectura de sensor de luz ambiente: cuando se hace de noche, bajar automáticamente la frecuencia de refresco

## Referencias

- [Repositorio GitHub de GxEPD2](https://github.com/ZinggJM/GxEPD2)
- [Documentación oficial de ArduinoJson](https://arduinojson.org/)
- [Repositorio GitHub de U8g2_for_Adafruit_GFX](https://github.com/olikraus/U8g2_for_Adafruit_GFX)
- [Documentación de la API de calidad del aire de AQICN](https://aqicn.org/api/)
- [Página de producto del ESP32-S3 en Espressif](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
