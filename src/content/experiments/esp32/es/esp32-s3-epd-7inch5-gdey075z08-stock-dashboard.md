---
title: "ESP32-S3 + pantalla de tinta electrónica tricolor de 7,5\": tablero de cotización de Tencent (00700) en vivo con ahorro automático al cierre de bolsa (GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-7inch5-gdey075z08
category: esp32
date: 2026-07-06
intro: "Con un ESP32-S3 + GxEPD2 manejas una pantalla de tinta electrónica tricolor de 7,5\" (GDEY075Z08), consultas la API gratuita de Tencent Finance y muestras en vivo un tablero con la cotización de Tencent Holdings (00700); cuando la bolsa de HK cierra, alarga el refresco para ahorrar energía. Incluye cableado completo, diagnóstico del BOD por subtensión, una fuente de glifos chinos casera y el código Arduino C++."
image: "https://img.lingflux.com/2026/07/683e33cff80c152435263c8e4e6c546d.jpg"
---

> **Resumen en una línea**: con un ESP32-S3 y una pantalla de tinta electrónica tricolor de 7,5\" (GDEY075Z08) te montas un tablero de cotización de Tencent Holdings que «se duerme solo al cierre»; en la bolsa de HK el rojo sube y el negro baja, así de un vistazo sabes si hoy toca celebrar o irte a dormir al parque.

Dificultad: ⭐⭐⭐☆☆ (necesita un pelín de base en circuitos; si sabes flashear Arduino desde el IDE, puedes seguirlo)
Tiempo estimado: 1～2 horas (sin contar el rato de ansiedad mirando la pantalla esperando a que refresque)
Entorno de prueba:
Arduino IDE 2.3.8 +
ESP32 Arduino Core 3.3.10 ＋
GxEPD2 v1.6.9 +
Adafruit GFX Library v1.12.6
(al instalar las librerías cídete el comparar con estas versiones: si vas demasiado nuevo o demasiado viejo, te puedes llevar sorpresas)

> Como en esta demo usamos la API gratuita de Tencent Finance, he cogido la cotización de Tencent Holdings como ejemplo, sin ninguna otra intención. Este artículo no ofrece asesoramiento financiero; invertir conlleva riesgo, ten cuidado.

> **TL;DR (puesta en marcha rápida):**
>
> 1. Cableado: SDI del EPD → GPIO11, SCL → GPIO12, CS → GPIO10, DC → GPIO9, RES → GPIO8, BUSY → GPIO7, VCC a 3.3V, GND con tierra común
> 2. Librerías: GxEPD2, Adafruit GFX Library (WiFi y HTTPClient ya vienen con el core de ESP32, no hace falta instalarlos aparte)
> 3. Cambia el `ssid` y el `password` del código por los de tu WiFi
> 4. Flashea, espera a que la pantalla escupa el primer precio y listo

---

## Prefacio

Tengo un vicio bastante tonto: sacar el móvil cada poco para mirar mis acciones favoritas, descubrir que no ha cambiado nada y acabar con pura fatiga mental. Así que pensé: en vez de que la app del móvil me martillee la dopamina, mejor me hago un «panel dedicado» que solo hace una cosa: clavar el precio en silencio sobre la mesa, sin popups ni notificaciones; le echo un ojo y ya sé si hoy toca celebrar o dormir en el parque.

Este tutorial cuenta cómo, con un ESP32 y una pantalla de tinta electrónica de 7,5\", me monté un tablero de cotización de Tencent Holdings (00700) que se refresca solo, y de paso cómo rematé dos talones de Aquiles: la «fuente china incompleta» y el «no refresques como un loco cuando la bolsa ya ha cerrado». Cuando acabes de leer podrás replicar tal cual o adaptarlo a la acción que tú quieras seguir.

> Como en esta demo usamos la API gratuita de Tencent Finance, he cogido la cotización de Tencent Holdings como ejemplo, sin ninguna otra intención. Este artículo no ofrece asesoramiento financiero; invertir conlleva riesgo, ten cuidado.

## Resultado del experimento

El resultado final: una pantalla de tinta electrónica en blanco, negro y rojo sobre la mesa, mostrando en silencio el precio, la variación porcentual, el máximo y el mínimo del día y el volumen contratado. En la bolsa de HK el rojo sube y el negro baja, así de un vistazo ya entiendes el mood del día. Cuando hay cierre, descanso de mediodía o fin de semana, el aparato «se hace el muerto» y refresca mucho menos; cuando abre el mercado vuelve al ritmo normal. No te va a estar actualizando a escondidas a medianoche para darte sustos.

> Como en esta demo usamos la API gratuita de Tencent Finance, he cogido la cotización de Tencent Holdings como ejemplo, sin ninguna otra intención. Este artículo no ofrece asesoramiento financiero; invertir conlleva riesgo, ten cuidado.
>
> ¡Las cosas importantes se dicen tres veces!!!

## Descripción de los componentes

**Pantalla de tinta electrónica tricolor de 7,5\"**: piensa en ella como una «versión gigante de las etiquetas de precio de supermercado». Con una sola pulsación de energía «fija» la imagen sobre un soporte parecido al papel; aunque la quites de la corriente, la imagen no desaparece, y solo consume electricidad en el siguiente refresco. La versión tricolor, frente a la habitual blanco/negro, añade un rojo que viene perfecto para representar «sube», algo que encaja con el escenario bursátil como anillo al dedo. El modelo de este proyecto es el `GDEY075Z08`, con resolución 800×480. Lo elegí porque tiene resolución de sobra para pintar a la vez precio, variación y cuatro datos más sin tener que andar paginando.

**Placa driver para la pantalla de tinta electrónica**: la definición de pines es idéntica a la de las placas que se venden en el mercado. Esta me la fabriqué yo soldando SMD a mano; el diseño aún no está del todo afinado: con la pantalla de 7,5\" se ve perfectamente, pero con las de 4,2\" y 1,54\" todavía me da algún problema; ya lo puliré. Comparto el esquema:

![](https://img.lingflux.com/2026/07/7466106c7707c8ef928c57a102df38cb.png)

**Placa ESP32**: se encarga de conectarse a la red para bajar los datos, calcular cuándo tocará el próximo refresco y manejar la pantalla. Es el cerebro de todo el proyecto. El modelo concreto da igual: sirve cualquier ESP32 que tengas por casa siempre que le sobren pines GPIO (los números de pin del ejemplo valen para las placas habituales de la familia ESP32-S3; si usas un ESP32 clásico, simplemente cambia los números por los que tengas disponibles en tu placa).

## Lista de materiales (BOM)

| Componente | Modelo / especificación | Cantidad |
| --- | --- | --- |
| Placa ESP32 | ESP32-S3 o cualquier ESP32 con pines SPI | 1 |
| Placa driver para e-ink | Autoconstruida, pero con los mismos pines que la mayoría de placas driver del mercado. | 1 |
| Pantalla de tinta electrónica de 7,5\" | GDEY075Z08, 7,5\", 800×480, blanco/negro/rojo | 1 |
| Cables Dupont | macho a hembra | varios |

## Pinout de la placa driver para la pantalla de tinta electrónica de 7,5"

Me dibujé el esquema, me fabriqué un PCB y lo soldé a mano; los pines que usa son los mismos que en la mayoría de placas driver de tinta electrónica del mercado.

| Pin | Nombre completo | Función |
| --- | --- | --- |
| **VCC** | polo positivo de alimentación (Voltage Common Collector) | Pin de entrada de alimentación; va al **3V3** (3,3V) del ESP32-S3. |
| **GND** | masa de alimentación (Ground) | Referencia de tierra; va al **GND** del ESP32-S3 para cerrar el circuito de corriente. |
| **SDI/MOSI** | Master Out Slave In | Línea de datos SPI; el ESP32 envía datos a la pantalla. |
| **SCL/SCK** | reloj serie | Línea de reloj SPI; marca el ritmo de la transmisión. |
| **CS** | Chip Select | Le dice a la pantalla «lo que viene ahora va para ti». |
| **DC** | conmutador Datos/Comando | Distingue si lo que envías son datos de imagen o comandos de control. |
| **RES/RST** | Reset | Una pulsación a bajo para reinicializar la pantalla. |
| **BUSY** | indicador de ocupado | Durante el refresco la pantalla lo pone a bajo; el ESP32 lo usa para saber «¿puedo mandarle ya la siguiente instrucción?». |

## Forma de cableado

| Pin de la e-ink | Pin del ESP32 |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

Te recomiendo que, nada más cablear, repases pin a pin antes de darle corriente. Presta especial atención a BUSY: si está mal conectado o tiene un falso contacto, te cargarás el 80 % del tiempo de depuración. Por eso el código lleva un diagnóstico de BUSY al arranque, del que hablaremos cuando expliquemos el código.

## Estabilidad de alimentación: cómo resolver el reinicio por subtensión del ESP32 (error BOD)

Como esta vez uso una placa DIY fabricada por mí, la parte de alimentación puede no estar del todo fina. Durante las pruebas me topé con el error `E BOD: Brownout detector was triggered`, que significa que **el detector de subtensión (Brownout) del ESP32 se ha disparado**: la placa ha visto que el voltaje caía por debajo del umbral de seguridad y se reinicia para protegerse.

### Por qué se dispara el BOD

Cuando el ESP32 arranca el Wi-Fi, el módulo de radio pide durante un instante **un pico de corriente de cientos de miliamperios**. Si el cable de alimentación es muy fino, los cables Dupont tienen mucha resistencia de contacto o el USB no da bastante corriente, el voltaje cae un momento y el ESP32 se reinicia solo. El refresco de la pantalla de tinta electrónica también es un tragaluz tremendo: si le toca pelear por la corriente con el Wi-Fi, todavía es más fácil hundir el voltaje.

Puentear en paralelo un **condensador electrolítico** (reserva de energía) y un **condensador cerámico** (filtrado) es la receta estándar para solucionarlo. Con este combo dejo de ver el BOD para siempre y las pruebas se vuelven mucho más estables.

### 1. Condensadores recomendados

Lo ideal es montar dos condensadores en paralelo; el combo funciona mejor:

* **Condensador electrolítico (el embalse grande):** `470μF` o `1000μF` (la tensión de trabajo puede ser `6,3V`, `10V` o `16V`, cualquiera vale). Cubre el pico de corriente del arranque del Wi-Fi.
* **Condensador cerámico / monolítico (el filtro fino):** `0,1μF` (marcado `104`). Elimina el ruido de alta frecuencia.

### 2. Dónde colocarlos

**Regla de oro: los condensadores deben quedar lo más pegados posible a los pines de la placa ESP32.** Si estás con cables Dupont, lo más cómodo es clavarlos en la protoboard o soldarlos / empalmarlos directo sobre los cables de alimentación, cerca del ESP32.

#### Esquema simbólico del cableado

```text
    [ Alimentación externa / USB ]
          │   │
          ▼   ▼
       ┌─────────┐
       │  5V/3V3 │──────┬───────────────┬──────► [ pin VCC/3V3 del ESP32 ]
       │         │      │               │
       │         │    + │ polaridad      │
       │         │   ┌──┴──┐         ┌──┴──┐
       │         │   │     │         │     │
       │         │   │470uF│         │0.1uF│
       │         │   │     │         │     │
       │         │   └──┬──┘         └──┬──┘
       │         │      │ - negativo    │
       │   GND   │──────┴───────────────┴──────► [ pin GND del ESP32 ]
       └─────────┘
```

#### Conexión pines a pines

* **Positivo (+) del condensador electrolítico (pata larga)** ───►  al **`3V3`** del ESP32 (o a `5V/VIN`, según por dónde alimentes la placa)
* **Negativo (−) del condensador electrolítico (pata corta, lado que lleva la franja gris de la carcasa)** ───► al **`GND`** del ESP32
* **Condensador cerámico de 0,1μF (sin polaridad)** ───► también en paralelo entre **`3V3`** y **`GND`**.

> ⚠️ El condensador electrolítico tiene polaridad: si lo conectas al revés se calienta e incluso puede reventar. Antes de cablear, fíjate bien: «pata larga = positivo, lado de la franja gris = negativo».

### 3. Sugerencias extra de diagnóstico (si sigues con reinicios aun habiendo puesto condensadores)

1. **Cámbiate a un cable USB de calidad:** muchos cables Dupont baratos o cables USB finos tienen muchísima resistencia interna; un cable de carga de móvil más gordito hace auténticas maravillas.
2. **Cambia el punto de alimentación:** no te conectes a los USB frontales del ordenador (suelen dar poca corriente); mejor un USB trasero directo a la placa base o, todavía mejor, un cargador de móvil de 5V/2A.
3. **Evita picos desde el código:** asegúrate de que en el código **no** coincidan a la vez el refresco de la e-ink (también muy tragón) y el `WiFi.begin()`. Primero conecta el Wi-Fi y baja los datos; tras desconectar o dormir el Wi-Fi, refresca la pantalla. Además, este código añade `WiFi.setTxPower(WIFI_POWER_17dBm)` para bajar la potencia de transmisión, como doble red de seguridad por software.

## Librerías que necesitas instalar

En el gestor de librerías del Arduino IDE busca e instala:

- `GxEPD2` (de ZinggJM) — versión probada v1.6.9
- `Adafruit GFX Library` — versión probada v1.12.6

`WiFi.h` y `HTTPClient.h` vienen con el ESP32 Arduino Core, así que no tienes que instalarlos aparte, pero asegúrate de que en el gestor de placas el core de ESP32 esté en la serie 3.0.x: los cores muy antiguos pueden echar en falta alguna API.

## Código completo + explicación

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

### Explicación del código

**Primera clave: la fuente es «hecha a mano».** Los archivos de fuente chinos habituales se van a decenas o cientos de KB y no siempre incluyen los cuatro caracteres de «腾讯控股». Por eso renderizo por adelantado, solo los pocos caracteres chinos que el proyecto realmente usa, como arrays de bits que incrusto en el código: ocupa poco y nunca verás cuadradotes por caracteres ausentes.

**Segunda clave: el horario de mercado se calcula, no se consulta en tabla.** `computeSleepSeconds` usa un algoritmo de fechas (el de conversión gregoriana a días de Howard Hinnant) para averiguar en qué día de la semana estamos y, combinándolo con los instantes de apertura / descanso de mediodía / cierre de la bolsa de HK, decide «cuánto tengo que dormir antes del próximo refresco». Durante sesión refresca cada 10 minutos; tras el cierre salta directo a la apertura del siguiente día hábil, así no se queda dando tumbos a medianoche.

**Tercera clave: si el precio no cambia, no redibuja.** Un refresco de la pantalla de tinta electrónica tarda varios segundos y además parpadea. Por eso el código recuerda el último precio pintado en `lastPriceF`; si es idéntico, se salta el refresco y solo actualiza la pantalla cuando el precio ha cambiado de verdad. Te ahorra muchos refrescos.

**Cuarta clave: diagnóstico del pin BUSY.** Nada más arrancar, el código lee el nivel del pin BUSY; si no está al nivel alto esperado, casi seguro que hay un problema de cableado o de alimentación. Te avisa antes de tiempo para que no termines depurando solo para descubrir que tenías un pin mal puesto.

## Diagnóstico de problemas habituales

Tranqui: el 80 % de los males vienen de estos sitios:

- **El puerto serie escupe `E BOD: Brownout detector was triggered` y se reinicia en bucle:** el protector de subtensión del ESP32 se ha disparado; lo más probable es que el Wi-Fi haya hundido el voltaje al arrancar. La solución está en la sección anterior «Estabilidad de alimentación»: pon en paralelo entre `3V3` y `GND` un condensador electrolítico de 470μF/1000μF más un condensador cerámico de 0,1μF, y cámbiate a un cable USB más gordito.
- **La pantalla se queda en blanco y no reacciona:** primero revisa que el cable BUSY esté bien puesto; en el monitor serie, el valor que imprime `[BUSY diag]` debería ser 1. Si es 0, revisa cableado y alimentación; muchas veces es un Dupont mal enchufado.
- **Cada refresco se cuelga hasta que caducan los 30 segundos de timeout:** casi seguro que BUSY está mal cableado o que la pantalla no recibe bastante corriente (el USB no da suficiente también provoca esto; prueba con un cable de datos más grueso).
- **Los caracteres chinos salen como cuadradotes o faltan:** ese carácter no está en la fuente local. Vuelve al punto de «Explicación del código» y añade el array de bits correspondiente al nuevo carácter.
- **El Wi-Fi no hay forma de conectar:** confirma que has escrito bien `ssid` y `password`, y que tu router está en 2,4GHz; la mayoría de ESP32 no soporta 5GHz.
- **El precio se queda clavado en un número y no se actualiza:** es comportamiento normal. Si la marca de tiempo no cambia, el código interpreta que «ya cerró el mercado» y alarga la espera a 1 hora; cuando vuelva el horario de sesión retomará el ritmo normal.
- **Error de compilación: no encuentra `GxEPD2_750c_GDEY075Z08`:** comprueba que la versión de GxEPD2 no sea demasiado antigua; este modelo de pantalla se añadió más tarde a la lista soportada. Actualiza a una versión más moderna y listo.

## Preguntas frecuentes (FAQ)

**P: ¿Puedo cambiar los pines del ESP32 libremente?**
R: Sí. Mientras sean GPIO normales que soporten SPI, basta con cambiar al principio del código los números de los macros `EPD_MOSI` / `EPD_CLK` / `EPD_CS` / `EPD_DC` / `EPD_RST` / `EPD_BUSY` por los que hayas cableado realmente. No necesitas tocar nada más.

**P: ¿Puedo subir la frecuencia de refresco, por ejemplo a 1 minuto?**
R: Sí: cambia los 10 minutos de `computeSleepSeconds` por los minutos que quieras. Ojo: la pantalla de tinta electrónica tiene un límite de por vida en número de refrescos; abusar de la frecuencia no compensa.

**P: ¿Funcionará bien con batería?**
R: Tal cual está, el código es una demo «con Wi-Fi siempre activo y esperas con delay()», así que mantiene el Wi-Fi encendido y gasta bastante; va mejor con alimentación USB. Para ir a batería conviene pasarlo a modo deep-sleep: que despierte, tire de los datos, suelte el Wi-Fi y se vuelva a dormir.

**P: ¿Cuánta memoria consume? ¿Lo mueve un ESP32 sin problemas?**
R: La fuente y el código en sí ocupan poco; el grueso viene del búfer de pantalla de GxEPD2. Para una tricolor de 7,5\" conviene un ESP32 con algo de holgura en Flash y RAM; cualquier placa ESP32-S3 estándar va sobrada.

**P: ¿Puedo cambiar a otra acción, por ejemplo de la bolsa A o de EE. UU.?**
R: Sí; cambia `api_url` por la URL correspondiente de Tencent Finance. Pero recuerda que los horarios de apertura/cierre de la bolsa A y de EE. UU. no coinciden con los de HK, así que ajusta los instantes de apertura/cierre en `computeSleepSeconds`. Además, cualquier otro carácter chino que necesites exigirá que te fabriques su glifo para que no aparezcan cuadradotes.

**P: ¿Puedo usar otra pantalla de otro tamaño, por ejemplo la de 4,2\"?**
R: Sí; cambia al modelo equivalente soportado por GxEPD2 y, a la vez, ajusta las coordenadas del dibujo (los números 800, 480, etc.) a la resolución de la nueva pantalla, o el diseño quedará descolocado.

## Ideas para seguir jugando

- Rotar varias acciones y cambiar de tablero cada cierto tiempo.
- Añadir una pequeña página web de configuración y no tener que recompilar para cambiar el usuario/contraseña del Wi-Fi.
- Leer una fotorresistencia (LDR) y refrescar normalmente de día, mientras que de noche bajar la frecuencia para ahorrar energía.
- Pasarlo a deep-sleep con batería y tener un adorno inalámbrico de verdad para dejar caer sobre la mesa.

## Referencias

- [Repositorio GitHub de GxEPD2](https://github.com/ZinggJM/GxEPD2)
- [Repositorio GitHub de Adafruit GFX Library](https://github.com/adafruit/Adafruit-GFX-Library)
- [Documentación oficial de Espressif ESP32](https://www.espressif.com/en/products/socs/esp32)
