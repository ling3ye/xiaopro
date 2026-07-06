---
title: "ESP32-S3 + display e-paper tricolore da 7,5\": bacheca prezzi Tencent (00700) in tempo reale, riposo automatico a mercato chiuso (GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-7inch5-gdey075z08
category: esp32
date: 2026-07-06
intro: "Con ESP32-S3 + GxEPD2 piloti un display e-paper tricolore da 7,5\" (GDEY075Z08), recuperando i dati dall'API gratuita di Tencent Finance per mostrare in tempo reale la quotazione di Tencent Holdings (00700), con allungamento automatico degli aggiornamenti a mercato HK chiuso per risparmiare corrente. Cablaggio completo, risoluzione del brownout BOD, font cinese fatto a mano e codice Arduino C++."
image: "https://img.lingflux.com/2026/07/683e33cff80c152435263c8e4e6c546d.jpg"
---

> **In breve:** con ESP32-S3 e un display e-paper tricolore da 7,5" (GDEY075Z08) realizzi una bacheca prezzi di Tencent Holdings che «si addormenta da sola a mercato chiuso»; rosso = su secondo la convenzione di HK, così a colpo d'occhio sai se oggi è il caso di festeggiare o di dormire al parco.

Difficoltà: ⭐⭐⭐☆☆ (serve un minimo di basi di circuiti, ma se sai flashare su Arduino riesci a seguire)
Tempo stimato: 1-2 ore (escluso il tempo passato a fissare il display e-paper che si aggiorna)
Ambiente di test:
Arduino IDE 2.3.8 +
ESP32 Arduino Core 3.3.10 ＋
GxEPD2 v1.6.9 +
Adafruit GFX Library v1.12.6
(consiglio di usare queste versioni quando installi le librerie: versioni troppo nuove o troppo vecchie possono creare grattacapi)

> Poiché questa demo si appoggia all'API gratuita di Tencent Finance, ho scelto come esempio la quotazione di Tencent Holdings, senza alcun altro intento. Questo articolo non costituisce consulenza di investimento: investire comporta rischi, procedi con cautela.

> **TL;DR (avvio rapido):**
>
> 1. Cablaggio: EPD SDI→GPIO11, SCL→GPIO12, CS→GPIO10, DC→GPIO9, RES→GPIO8, BUSY→GPIO7, VCC a 3,3V, GND in comune con la massa
> 2. Librerie: GxEPD2, Adafruit GFX Library (WiFi ed HTTPClient sono già incluse nel core ESP32, non serve installarle)
> 3. Modifica `ssid` e `password` nel codice con i tuoi dati Wi-Fi
> 4. Flasha, aspetta che lo schermo disegni la prima quotazione, hai finito

---

## Introduzione

Ho un'abitudine un po' sciocca: ogni giorno, appena ho un momento, tiro fuori il telefono e controllo il portafoglio azionario; dopo essermi reso conto che non è cambiato nulla, è solo puro logorio mentale. Poi ho pensato: invece di lasciare che l'app sul telefono continui a tartassare la mia dopamina, meglio costruirmi una «dashboard dedicata» — che fa una sola cosa: piazzare tranquillamente il prezzo azionario sulla scrivania, senza popup, senza notifiche, così con un'occhiata capisco se oggi devo essere felice o se è meglio il parco.

Questo tutorial racconta come ho usato un ESP32 e un display e-paper da 7,5" per costruire una bacheca prezzi di Tencent Holdings (00700) che si aggiorna da sola, risolvendo anche due begli inciampi: il «font cinese incompleto» e il «non stare a rinfrescare a vuoto dopo la chiusura del mercato». Una volta finito di leggere potrai realizzarne una identica oppure adattarla a qualsiasi titolo tu voglia seguire.

> Poiché questa demo si appoggia all'API gratuita di Tencent Finance, ho scelto come esempio la quotazione di Tencent Holdings, senza alcun altro intento. Questo articolo non costituisce consulenza di investimento: investire comporta rischi, procedi con cautela.

## Risultato finale

Il risultato finale è questo: sulla scrivania, un display e-paper bianco/nero/rosso che mostra, in tutta calma, prezzo, variazione percentuale, massimo e minimo della seduta e volume degli scambi; secondo la convenzione di Hong Kong il rosso significa su, quindi capisci l'umore della giornata a colpo d'occhio; durante la pausa pranzo, dopo la chiusura o nel weekend il pannello «fa il morto» e si aggiorna di rado, per poi tornare al ritmo normale quando il mercato riapre, così non si mette a rinfrescare di nascosto nel cuore della notte spaventandoti.

> Poiché questa demo si appoggia all'API gratuita di Tencent Finance, ho scelto come esempio la quotazione di Tencent Holdings, senza alcun altro intento. Questo articolo non costituisce consulenza di investimento: investire comporta rischi, procedi con cautela.
>
> Le cose importanti vanno dette tre volte!!!

## Descrizione dei componenti

**Display e-paper tricolore da 7,5"**: puoi immaginarlo come una «versione ingrandita dei cartellini elettronici dei supermercati» — grazie a una singola pulsazione di corrente «fissa» l'immagine su un supporto simile alla carta; anche se togli alimentazione, l'immagine non sparisce, e consuma solo quando si aggiorna. Rispetto alla più diffusa versione in bianco e nero, quella tricolore aggiunge il rosso, perfetto per indicare il «rialzo», una scelta molto azzeccata per il contesto azionario. Il modello usato in questo progetto è il `GDEY075Z08`, risoluzione 800×480. L'ho scelto perché la risoluzione è sufficientemente grande: ci stanno insieme prezzo, variazione e quattro dati aggiuntivi, senza dover scorrere.

**Scheda driver per display e-paper**: la definizione dei pin è identica a quella dei moduli in commercio. Questa me la sono saldata a mano da solo, quindi il design non è ancora perfetto: con il pannello da 7,5" funziona che è una meraviglia, mentre con i display e-paper da 4,2" e 1,54" ho ancora qualche problema, da sistemare in futuro. Condivido lo schema:

![](https://img.lingflux.com/2026/07/7466106c7707c8ef928c57a102df38cb.png)

**Scheda di sviluppo ESP32**: si occupa di connettersi alla rete per recuperare i dati, calcolare gli istanti di aggiornamento e pilotare lo schermo; è il cervello dell'intero progetto. Il modello specifico dipende da cosa hai tra le mani, l'importante è che abbia GPIO a sufficienza (i numeri di pin di questo tutorial valgono per le comuni schede della serie ESP32-S3; se usi un ESP32 «classico», sostituisci i pin con quelli effettivamente disponibili sulla tua scheda).

## Lista dei materiali (BOM)

| Componente | Modello/specifica | Quantità |
| --- | --- | --- |
| Scheda di sviluppo ESP32 | ESP32-S3 o qualsiasi ESP32 con pin SPI | 1 |
| Scheda driver per e-paper | realizzata a mano, ma con pin compatibili con la maggior parte delle schede driver per e-paper in commercio | 1 |
| Display e-paper da 7,5" | GDEY075Z08, 7,5", 800×480, bianco/nero/rosso tricolore | 1 |
| Cavetti Dupont | maschio-femmina | alcuni |

## Pin della scheda driver per e-paper da 7,5"

Ho disegnato lo schema, fatto una PCB e saldato i SMD a mano; i pin utilizzati sono gli stessi della maggior parte delle schede driver per e-paper in commercio.

| Pin | Nome completo | Funzione |
| --- | --- | --- |
| **VCC** | polo positivo alimentazione (Voltage Common Collector) | pin di alimentazione in ingresso, collega l'uscita **3V3** (3,3V) dell'ESP32-S3. |
| **GND** | massa (Ground) | riferimento di massa, collega il **GND** dell'ESP32-S3 per chiudere il circuito. |
| **SDI/MOSI** | Master Out Slave In | linea dati SPI, l'ESP32 invia i dati allo schermo |
| **SCL/SCK** | Serial Clock | clock SPI, scandisce il ritmo di trasmissione |
| **CS** | Chip Select | comunica allo schermo «i prossimi dati sono per te» |
| **DC** | Data/Command | distingue se stai inviando dati immagine o comandi di controllo |
| **RES/RST** | Reset | un colpo a basso per reinizializzare lo schermo |
| **BUSY** | stato occupato | durante l'aggiornamento viene tenuto basso; l'ESP32 lo legge per capire «posso mandare il prossimo comando?» |

## Modalità di cablaggio

| Pin e-paper | Pin ESP32 |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3,3V |
| GND | GND |

Ti consiglio, una volta finito il cablaggio, di ricontrollare ogni filo prima di alimentare: in particolare avere il BUSY sbagliato o una saldatura fredda ti fa sprecare l'80% del tempo di troubleshooting — nel codice ho inserito una diagnostica all'avvio proprio per intercettare questa casistica, ne parliamo più avanti nella spiegazione del codice.

## Stabilità dell'alimentazione: risolvere i riavvii per sottotensione dell'ESP32 (allarme BOD)

Siccome stavolta sto usando una scheda di sviluppo fatta da me, la parte di alimentazione potrebbe non essere il massimo; durante le prove mi sono imbattuto nell'errore `E BOD: Brownout detector was triggered`, che significa **il rilevatore di brownout dell'ESP32 è scattato** — la scheda ha rilevato una tensione sotto la soglia di sicurezza e si è riavviata per autoprotezione.

### Perché scatta il BOD

Quando l'ESP32 attiva il Wi-Fi, il modulo radio genera un bisogno istantaneo di corrente di **centinaia di milliampere**. Se i cavi di alimentazione sono troppo sottili, i Dupont hanno una resistenza di contatto elevata oppure la porta USB non eroga abbastanza, la tensione crolla per un attimo e l'ESP32 si riavvia da solo. Anche l'aggiornamento del display e-paper è un bell'assorbimento: se si mette a «litigare» con il Wi-Fi per la corrente, è ancora più facile far crollare la tensione.

Mettere in parallelo un **condensatore elettrolitico** (accumulo) e un **condensatore ceramico** (filtraggio) è la pratica standard per risolvere il problema. Con la combinazione seguente le prove sono diventate molto più stabili e non ho più visto un BOD.

### 1. Scelta dei condensatori

Si raccomanda di usare due condensatori in parallelo, il effetto combinato è il migliore:

* **Condensatore elettrolitico (serbatoio grande):** `470μF` oppure `1000μF` (tensione di lavoro `6,3V`, `10V` o `16V` vanno tutti bene). Serve a reggere il picco di corrente quando il Wi-Fi parte.
* **Condensatore ceramico/a film (filtro fine):** `0,1μF` (codice `104`). Per filtrare il rumore ad alta frequenza.

### 2. Posizione di collegamento

**Principio fondamentale: i condensatori vanno il più vicino possibile ai pin dell'ESP32.** Se stai usando i Dupont, puoi inserirli sulla breadboard oppure saldarli / attorciarli direttamente sui fili di alimentazione vicino alla scheda.

#### Schema simbolico del cablaggio

```text
    [ Alimentazione esterna / USB ]
          │   │
          ▼   ▼
       ┌─────────┐
       │  5V/3V3 │──────┬───────────────┬──────► [ pin VCC/3V3 dell'ESP32 ]
       │         │      │               │
       │         │    + │ polarità       │
       │         │   ┌──┴──┐         ┌──┴──┐
       │         │   │     │         │     │
       │         │   │470uF│         │0.1uF│
       │         │   │     │         │     │
       │         │   └──┬──┘         └──┬──┘
       │         │      │ - negativo     │
       │   GND   │──────┴───────────────┴──────► [ pin GND dell'ESP32 ]
       └─────────┘
```

#### Mappatura dei collegamenti

* **Polo positivo del condensatore elettrolitico (+, pin lungo)** ───► collega al **`3V3`** dell'ESP32 (oppure a `5V/VIN`, a seconda di quale pin usi per alimentare la scheda)
* **Polo negativo del condensatore elettrolitico (−, pin corto, lato con la striscia grigia sul contenitore)** ───► collega al **`GND`** dell'ESP32
* **Condensatore ceramico da 0,1μF (senza polarità)** ───► collegato a sua volta in parallelo tra **`3V3`** e **`GND`**.

> ⚠️ Il condensatore elettrolitico è polarizzato: se lo monti al contrario si riscalda e può persino esplodere; prima di collegarlo verifica sempre «pin lungo = positivo, lato con striscia grigia = negativo».

### 3. Suggerimenti aggiuntivi (se anche con i condensatori continua a riavviarsi)

1. **Cambia cavo USB con uno di qualità:** molti cavi Dupont economici o USB sottilissimi hanno una resistenza interna altissima; un cavo di ricarica per telefono un po' più spesso spesso risolve la situazione.
2. **Cambia presa di alimentazione:** evita le porte USB frontali del PC (erogano poco); privilegia le porte USB sul retro, collegate direttamente alla scheda madre, oppure usa direttamente un alimentatore da parete da 5V/2A.
3. **A livello di codice evita i picchi sovrapposti:** assicurati che nel codice **non** ci siano contemporaneamente l'aggiornamento del display e-paper (anch'esso assetato di corrente) e la `WiFi.begin()`. Connettiti prima al Wi-Fi per recuperare i dati, quindi disconnetti o metti in stop il Wi-Fi e solo dopo fai rinfrescare il pannello. Nel codice di questo articolo ho anche inserito `WiFi.setTxPower(WIFI_POWER_17dBm)` per ridurre la potenza di trasmissione, come ulteriore rete di sicurezza software.

## Librerie da installare

Nel Library Manager di Arduino IDE cerca e installa:

- `GxEPD2` (autore ZinggJM) — versione verificata v1.6.9
- `Adafruit GFX Library` — versione verificata v1.12.6

`WiFi.h` ed `HTTPClient.h` sono inclusi nel ESP32 Arduino Core, non vanno installati a parte, ma accertati che il core ESP32 nel Board Manager sia della serie 3.0.x: core troppo vecchi potrebbero non avere alcune API.

## Codice completo + spiegazione

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

### Spiegazione del codice

**Primo passo, il font è «fatto a mano»:** i font cinesi completi sono facilmente decine o centinaia di KB e non è detto contengano i quattro caratteri di «腾讯控股» (Tencent Holdings). Ho quindi preso solo le una dozzina di caratteri cinesi davvero usati nel progetto, li ho pre-renderizzati come array bitmap e li ho infilati nel codice: l'ingombro è minimo e non si rischia mai l'odioso quadrettino di «carattere mancante».

**Secondo passo, gli orari di contrattazione si calcolano, non si guardano da tabella:** `computeSleepSeconds` usa un algoritmo di calendario (la conversione da data civile a giorni di Howard Hinnant) per ricavare il giorno della settimana odierno, e in base agli orari di apertura/pausa/chiusura di HK decide «quanto devo dormire prima del prossimo aggiornamento». Durante le contrattazioni si rinfresca ogni 10 minuti; dopo la chiusura salta direttamente all'apertura della seduta successiva, evitando di girare a vuoto nel cuore della notte.

**Terzo passo, se il prezzo non è cambiato non ridisegno:** ogni refresh del display e-paper richiede vari secondi e sfarfalla, quindi nel codice conservo in `lastPriceF` l'ultimo prezzo disegnato; se è identico salto l'aggiornamento e ridisegno solo quando il valore cambia davvero: un bel risparmio di refresh.

**Quarto passo, diagnostica del pin BUSY:** subito dopo l'avvio leggo il livello del pin BUSY; se non è alto come ci si aspetterebbe, con ogni probabilità c'è un problema di cablaggio o di alimentazione: una spia utile subito all'accensione, per non dover scoprire solo alla fine che il cablaggio era sbagliato.

## Risoluzione dei problemi più comuni

Niente panico, l'80% dei problemi rientra in questi punti:

- **Il monitor seriale stampa `E BOD: Brownout detector was triggered` e la scheda si riavvia di continuo:** il rilevatore di sottotensione dell'ESP32 è scattato, molto probabilmente perché l'accensione del Wi-Fi ha fatto crollare la tensione. Vedi la sezione precedente «Stabilità dell'alimentazione» — tra `3V3` e `GND` monta in parallelo un condensatore elettrolitico da 470μF/1000μF più un condensatore ceramico da 0,1μF, e usa un cavo USB più spesso.
- **Lo schermo resta sempre bianco e non reagisce:** controlla prima il filo BUSY; nel monitor seriale il valore stampato da `[BUSY diag]` deve essere 1; se è 0, verifica cablaggio e alimentazione — molto spesso è un Dupont male inserito.
- **Ogni refresh si blocca e va in timeout dopo 30 secondi:** con quasi totale certezza il pin BUSY è collegato male oppure l'alimentazione del pannello non è sufficiente (anche un cavo dati troppo sottile causa il problema: prova con uno più spesso).
- **I caratteri cinesi appaiono come quadretti oppure mancano:** significa che quel carattere non è stato incluso nel font locale; torna al paragrafo «Spiegazione del codice» e aggiungi l'array bitmap corrispondente al nuovo carattere.
- **Il Wi-Fi non si connette in alcun modo:** verifica di aver digitato bene `ssid` e `password` e che il router sia sulla banda da 2,4GHz; la maggior parte degli ESP32 non supporta i 5GHz.
- **Il prezzo resta bloccato su un numero e non si aggiorna:** è normale — se il timestamp non cambia, il codice stabilisce che il mercato è chiuso e si porta a un aggiornamento ogni ora; quando si entra nelle ore di contrattazione il ritmo normale riprende da solo.
- **Errore di compilazione «impossibile trovare `GxEPD2_750c_GDEY075Z08`»:** controlla che la versione di GxEPD2 non sia troppo vecchia; questo modello di schermo è stato aggiunto alla lista supportata in un secondo momento, basta aggiornare a una versione più recente.

## Domande frequenti (FAQ)

**D: Posso cambiare a piacere i pin dell'ESP32?**
R: Sì, l'importante è usare GPIO generici con supporto SPI; modifica i macro `EPD_MOSI` / `EPD_CLK` / `EPD_CS` / `EPD_DC` / `EPD_RST` / `EPD_BUSY` all'inizio del codice con i pin che hai effettivamente usato. Non serve toccare altro.

**D: Posso rendere l'aggiornamento più frequente, ad esempio ogni 1 minuto?**
R: Sì, sostituisci i 10 minuti in `computeSleepSeconds` con il numero di minuti desiderato. Fai però attenzione che i display e-paper hanno un numero massimo di aggiornamenti nella loro vita:refresh troppo ravvicinati non convengono.

**D: Ci sono problemi se lo alimento a batteria?**
R: Attualmente il codice è pensato in modalità demo con «Wi-Fi sempre attivo + delay», quindi il consumo è elevato ed è più adatto all'alimentazione USB. Per l'uso a batteria conviene passare alla modalità deep sleep: ogni risveglio recupera i dati, poi scolleghi il Wi-Fi e si torna a dormire.

**D: Quanta memoria occupa il progetto, l'ESP32 lo regge?**
R: Il font e il codice in sé sono piccoli; l'ingombro principale viene dal buffer di GxEPD2. Per un e-paper tricolore da 7,5" conviene scegliere un ESP32 con Flash e RAM un po' generosi; una qualsiasi ESP32-S3 normale è più che sufficiente.

**D: Posso mostrare un altro titolo, ad esempio di borsa A o americana?**
R: Sì, basta sostituire `api_url` con l'indirizzo API Tencent Finance del titolo che ti interessa. Ricorda però che gli orari di apertura/chiusura di borsa A e USA sono diversi da quelli di HK, per cui in `computeSleepSeconds` vanno adattati gli orari. Inoltre, gli eventuali caratteri cinesi aggiuntivi richiedono la creazione del rispettivo font, altrimenti appariranno come quadretti.

**D: Posso usare uno schermo di dimensioni diverse, ad esempio il 4,2"?**
R: Sì, passa al modello corrispondente supportato dalla libreria GxEPD2 e tieni presente che le coordinate usate nel disegno (i valori 800, 480, ecc.) vanno ricalcolate in base alla risoluzione del nuovo pannello, altrimenti la composizione va fuori posto.

## Spunti di approfondimento

- Mostra più titoli in sequenza, cambiando bacheca a intervalli
- Aggiungi una piccola pagina web di configurazione: niente più modifica del SSID/password nel codice a ogni cambio
- Collega una fotoresistenza: refresh normale di giorno, frequenza ridotta di notte per risparmiare
- Passa alla modalità deep sleep + alimentazione a batteria: un piccolo oggetto da scrivania davvero wireless

## Riferimenti

- [Repository GitHub di GxEPD2](https://github.com/ZinggJM/GxEPD2)
- [Repository GitHub di Adafruit GFX Library](https://github.com/adafruit/Adafruit-GFX-Library)
- [Documentazione ufficiale Espressif ESP32](https://www.espressif.com/en/products/socs/esp32)
