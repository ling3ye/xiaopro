---
title: "ESP32-S3 + afficheur e-paper tricolore 7,5\" : tableau de bord boursier Tencent (00700) en direct, mise en veille auto hors séance (GxEPD2 + SPI)"
boardId: esp32s3
moduleId: display/epd-7inch5-gdey075z08
category: esp32
date: 2026-07-06
intro: "Pilotez un afficheur e-paper tricolore 7,5\" (GDEY075Z08) avec un ESP32-S3 et GxEPD2, récupérez l'API gratuite de Tencent Finance pour afficher en direct le cours de Tencent Holdings (00700), et mettez automatiquement le tout en veille hors séance cotations HK. Inclus : câblage complet, diagnostic BOD de sous-tension, police chinoise maison et code Arduino C++."
image: "https://img.lingflux.com/2026/07/683e33cff80c152435263c8e4e6c546d.jpg"
---

> **En une ligne :** avec un ESP32-S3 et un afficheur e-paper tricolore 7,5\" (GDEY075Z08), on se fabrique un tableau de bord du cours de Tencent Holdings qui s'endort tout seul hors séance — convention HK, rouge = hausse, noir = baisse — pour savoir d'un seul coup d'œil si aujourd'hui on sort le champagne ou si on dort sur un banc.

Difficulté : ⭐⭐⭐☆☆ (un tout petit peu de base en électronique suffit ; si tu sais flasher un Arduino, tu peux suivre)
Temps estimé : 1 à 2 h (hors temps passé à scruter l'écran e-paper pendant qu'il se rafraîchit)
Environnement de test :
Arduino IDE 2.3.8 +
ESP32 Arduino Core 3.3.10 ＋
GxEPD2 v1.6.9 +
Adafruit GFX Library v1.12.6
(Conseil : quand tu installes les bibliothèques, cale-toi sur ces versions ; trop récent ou trop ancien, et tu vas droit dans le décor)

> Cette démo utilise l'API gratuite de Tencent Finance, du coup j'ai pris le cours de Tencent Holdings comme exemple, sans aucune autre arrière-pensée. Cet article ne constitue pas un conseil en investissement. Investir comporte des risques, sois prudent.

> **TL;DR (démarrage rapide) :**
>
> 1. Câblage : SDI de l'EPD → GPIO11, SCL → GPIO12, CS → GPIO10, DC → GPIO9, RES → GPIO8, BUSY → GPIO7, VCC sur 3.3V, GND à la masse commune
> 2. Bibliothèques à installer : GxEPD2, Adafruit GFX Library (WiFi et HTTPClient sont embarqués dans le core ESP32, rien à rajouter)
> 3. Renseigne ton propre WiFi dans `ssid` et `password` du code
> 4. Flash, attends que l'écran crache le premier prix, c'est plié

---

## Préambule

J'ai un truc un peu bête : je sors mon téléphone toutes les cinq minutes pour checker mes actions, je regarde, rien n'a bougé, et hop — pure perte de dopamine. Du coup je me suis dit qu'au lieu de laisser une app pourrir ma vie, j'allais me faire un « tableau de bord dédié » — un machin qui ne fait qu'une seule chose : planter calmement le cours sur un bureau, sans notification, sans popup, juste un coup d'œil pour savoir si aujourd'hui c'est champagne ou sac de couchage.

Ce tuto raconte comment j'ai utilisé un ESP32 et un afficheur e-paper 7,5\" pour fabriquer un tableau de bord du cours de Tencent Holdings (00700) qui se rafraîchit tout seul, et au passage comment j'ai réglé deux gros pièges : « la police chinoise incomplète » et « arrêter de刷 l'écran pour rien après la clôture ». À la fin, tu pourras reproduire le même à l'identique, ou le retaper pour suivre n'importe quelle autre action qui t'intéresse.

> Cette démo utilise l'API gratuite de Tencent Finance, du coup j'ai pris le cours de Tencent Holdings comme exemple, sans aucune autre arrière-pensée. Cet article ne constitue pas un conseil en investissement. Investir comporte des risques, sois prudent.

## Résultat

Le résultat final : un afficheur e-paper noir / blanc / rouge posé sur le bureau, qui affiche calmement le cours, la variation en %, le plus haut et le plus bas du jour, ainsi que le volume traité ; bourse de HK donc rouge = hausse et noir = baisse, on comprend l'humeur d'un seul coup d'œil ; à la clôture, sur la pause déjeuner ou le week-end, il « fait le mort » et rafraîchit rarement, et dès la reprise il reprend son rythme — bref, il ne va pas clignoter tout seul à 3 h du matin pour te flanquer la trouille.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/y-SnIM3DxUE?si=Z7g5KeeUtolxDj1T" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

> Cette démo utilise l'API gratuite de Tencent Finance, du coup j'ai pris le cours de Tencent Holdings comme exemple, sans aucune autre arrière-pensée. Cet article ne constitue pas un conseil en investissement. Investir comporte des risques, sois prudent.
>
> Les choses importantes, il faut les dire trois fois !!!

## Description des composants

**Afficheur e-paper tricolore 7,5\"** : en gros, c'est « une étiquette de prix électronique de supermarché, mais en plus grand » — une seule impulsion électrique « fige » l'image sur un support type papier, et même en coupant l'alimentation l'image ne disparaît pas ; seule la prochaine mise à jour consomme du courant. La version tricolore ajoute du rouge par rapport à la classique noir & blanc, pile ce qu'il faut pour signifier « ça monte », parfait pour la bourse. Le modèle utilisé ici est le `GDEY075Z08`, résolution 800×480. Choisi parce que la résolution est suffisamment large pour tout caser sur un écran — prix, variation, quatre données — sans avoir à paginer.

**Carte pilote d'écran e-paper** : les broches sont identiques à ce qu'on trouve sur le marché. Celle-ci est soudée à la main par mes soins, le design n'est pas encore finalisé — sur le 7,5\" l'affichage est nickel, en revanche sur les 4,2\" et 1,54\" il reste quelques soucis, à corriger plus tard. Voici le schéma :

![](https://img.lingflux.com/2026/07/7466106c7707c8ef928c57a102df38cb.png)

**Carte de développement ESP32** : c'est le cerveau du projet — elle se connecte au réseau, récupère les données, calcule le moment du prochain rafraîchissement et pilote l'écran. N'importe quelle carte que tu as sous le main fera l'affaire, du moment qu'il y a assez de GPIO (les numéros de broches donnés ici conviennent aux cartes ESP32-S3 courantes ; si tu joues sur un vieil ESP32, remplace simplement par des broches disponibles sur ta carte).

## BOM

| Composant | Référence / spé | Quantité |
| --- | --- | --- |
| Carte ESP32 | ESP32-S3 ou n'importe quel ESP32 avec des broches SPI | 1 |
| Carte pilote e-paper | Soudée main, mais brochage identique à la plupart des cartes pilotes du marché | 1 |
| Afficheur e-paper 7,5\" | GDEY075Z08, 7,5\", 800×480, tricolore noir / blanc / rouge | 1 |
| Fils Dupont | mâle-femelle | quelques-uns |

## Brochage de la carte pilote e-paper 7,5\"

J'ai dessiné le schéma moi-même, fait tirer un PCB et soudé les composants à la main ; le brochage est le même que sur la plupart des cartes pilotes du marché.

| Broche | Nom complet | Rôle |
| --- | --- | --- |
| **VCC** | Pôle positif de l'alimentation (Voltage Common Collector) | Broche d'entrée d'alimentation, à relier au **3V3** (3,3 V) de l'ESP32-S3. |
| **GND** | Masse (Ground) | Masse de référence, à relier au **GND** de l'ESP32-S3 pour boucler le circuit. |
| **SDI/MOSI** | Master Out Slave In | Ligne de données SPI, l'ESP32 envoie les données à l'écran |
| **SCL/SCK** | Serial Clock | Ligne d'horloge SPI, donne le tempo des transferts |
| **CS** | Chip Select | Dit à l'écran « les données qui suivent sont pour toi » |
| **DC** | Data/Command | Distingue si l'octet courant est une donnée d'image ou une commande |
| **RES/RST** | Reset | Un coup de bas vers le haut pour réinitialiser l'écran |
| **BUSY** | Indicateur « occupé » | Tiré vers le bas pendant que l'écran se rafraîchit ; l'ESP32 s'en sert pour savoir « est-ce que je peux envoyer la commande suivante » |

## Câblage

| Broche e-paper | Broche ESP32 |
| --- | --- |
| SDI/MOSI | GPIO11 |
| SCL/SCK | GPIO12 |
| CS | GPIO10 |
| DC | GPIO9 |
| RES | GPIO8 |
| BUSY | GPIO7 |
| VCC | 3.3V |
| GND | GND |

Bonne pratique : une fois tout câblé, re-vérifie chaque fil avant de mettre sous tension — tout spécialement la broche BUSY ; une erreur ou une soudure froide sur cette ligne, c'est 80 % du temps de dépannage d'économisé. Le code contient d'ailleurs un petit diagnostic au démarrage pensé exactement pour ce piège, on en reparle dans l'explication du code.

## Stabilité de l'alimentation : régler le reboot de sous-tension de l'ESP32 (erreur BOD)

Comme j'utilise une carte DIY pas tout à fait finalisée côté alimentation, je suis tombé en test sur l'erreur `E BOD: Brownout detector was triggered`, ce qui veut dire exactement **le détecteur de brownout de l'ESP32 a déclenché** — la carte a vu la tension chuter sous le seuil de sécurité et a rebooté pour se protéger.

### Pourquoi le BOD se déclenche

Quand l'ESP32 active le Wi-Fi, le module RF tire un **gros pic de courant de plusieurs centaines de milliampères** pendant un instant. Si les câbles d'alimentation sont trop fins, si les fils Dupont ont trop de résistance de contact, ou si l'USB ne fournit pas assez de jus, la tension s'effondre une fraction de seconde et l'ESP32 reboot. Le rafraîchissement de l'e-paper est lui aussi très gourmand ; s'il se bat avec le Wi-Fi pour le courant, c'est encore pire.

Mettre en parallèle un **condensateur électrolytique** (réserve d'énergie) et un **condensateur céramique** (filtrage) est la méthode standard pour régler ça. Avec le duo ci-dessous, c'est devenu rock-stable, plus aucun BOD.

### 1. Choix des condensateurs

On monte les deux en parallèle, le combo marche le mieux :

* **Condensateur électrolytique (le gros réservoir) :** `470μF` ou `1000μF` (tension de service `6,3 V`, `10 V` ou `16 V` ok). Pour absorber le pic de courant au démarrage du Wi-Fi.
* **Condensateur céramique / monolithique (le filtre fin) :** `0,1μF` (marqué `104`). Pour filtrer le bruit haute fréquence.

### 2. Où les placer

**Principe clé : les condensateurs doivent être au plus près des broches de l'ESP32.** Si tu utilises des fils Dupont, tu peux les planter sur la breadboard, ou les souder / twist directement sur les fils d'alimentation tout près de l'ESP32.

#### Schéma de principe

```text
    [ Alimentation externe / USB ]
          │   │
          ▼   ▼
       ┌─────────┐
       │  5V/3V3 │──────┬───────────────┬──────► [ broche VCC/3V3 de l'ESP32 ]
       │         │      │               │
       │         │    + │ polarité      │
       │         │   ┌──┴──┐         ┌──┴──┐
       │         │   │     │         │     │
       │         │   │470uF│         │0.1uF│
       │         │   │     │         │     │
       │         │   └──┬──┘         └──┬──┘
       │         │      │ − négatif    │
       │   GND   │──────┴───────────────┴──────► [ broche GND de l'ESP32 ]
       └─────────┘
```

#### Correspondance des broches

* **Pôle positif (+, patte longue) du condensateur électrolytique** ───►  sur **`3V3`** de l'ESP32 (ou `5V/VIN`, selon la broche par laquelle tu alimentes la carte)
* **Pôle négatif (−, patte courte, côté bande grise sur le boîtier) du condensateur électrolytique** ───►  sur **`GND`** de l'ESP32
* **Condensateur céramique 0,1μF (non polarisé)** ───►  branches en parallèle entre **`3V3`** et **`GND`**.

> ⚠️ Le condensateur électrolytique est polarisé : branché à l'envers il chauffe et peut littéralement exploser. Avant de câbler, vérifie bien la règle : « patte longue = +, côté bande grise = − ».

### 3. Pistes complémentaires (si ça reboot malgré les condensateurs)

1. **Change de câble USB de qualité :** beaucoup de câbles Dupont ou USB bon marché ont une résistance interne énorme — un câble de chargeur de téléphone un peu costaud fait souvent des miracles.
2. **Change de prise d'alimentation :** évite les ports USB en façade de PC (souvent faiblards), privilégie les ports USB de la carte mère à l'arrière, ou branche directement un chargeur de téléphone 5V/2A.
3. **Décale les pics en software :** dans le code, **ne lance jamais** le rafraîchissement de l'e-paper (gros consommateur) en même temps que `WiFi.begin()`. Connecte d'abord le Wi-Fi, récupère les données, coupe ou endors le Wi-Fi, et seulement après pilote le rafraîchissement de l'e-paper. Le code ci-dessous ajoute aussi `WiFi.setTxPower(WIFI_POWER_17dBm)` pour baisser la puissance d'émission — une double sécurité côté software.

## Bibliothèques à installer

Dans le gestionnaire de bibliothèques d'Arduino IDE, cherche et installe :

- `GxEPD2` (par ZinggJM) — version testée v1.6.9
- `Adafruit GFX Library` — version testée v1.12.6

`WiFi.h` et `HTTPClient.h` sont embarqués dans le ESP32 Arduino Core, pas besoin de les installer séparément ; en revanche, vérifie que le core ESP32 dans le gestionnaire de cartes est bien dans la série 3.0.x — trop ancien, il risque de manquer certaines API.

## Code complet + explications

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

### Explications du code

**Première étape, la police est « faite maison »** : les polices chinoises toutes faites pèsent vite des dizaines, voire des centaines de Ko, et même pas sûr qu'elles contiennent les quatre caractères « 腾讯控股 ». Du coup, j'ai pré-rendu les dix et quelques sinogrammes réellement utilisés en tableaux de points, directement intégrés au code — c'est minuscule, et plus jamais de carrés vides quand un glyphe manque.

**Deuxième étape, les heures de cotation se calculent, pas en lookup** : `computeSleepSeconds` utilise un algorithme de dates (l'algorithme de conversion grégorien → jours d'Howard Hinnant) pour déterminer le jour de la semaine, puis croise ça avec les heures d'ouverture / pause déjeuner / clôture de la bourse de HK pour décider « combien de temps dormir avant le prochain rafraîchissement ». Pendant les heures de cotation : un rafraîchissement toutes les 10 min ; après la clôture, saut direct à l'ouverture du jour de bourse suivant — fini le rafraîchissement à 3 h du matin pour rien.

**Troisième étape, pas de re-dessin si le prix n'a pas bougé** : un rafraîchissement d'e-paper prend plusieurs secondes et clignote ; le code mémorise donc le dernier prix dessiné dans `lastPriceF`, saute le rafraîchissement si la valeur est identique, et ne redessine vraiment que quand le prix a changé — un bon cru de rafraîchissements économisé.

**Quatrième étape, diagnostic de la broche BUSY** : dès le démarrage, on lit le niveau de la broche BUSY. Si elle n'est pas au niveau haut attendu, c'est presque sûrement un souci de câblage ou d'alimentation — un avertissement précoce qui t'évite de dépanner pendant deux heures avant de réaliser qu'un fil était mal branché.

## Un simple programme « Hello World »

Voici un code de test minimal, pratique pour vérifier que tout fonctionne : le code précédent, avec toute la partie réseau, paraît bien complexe et gêne la compréhension.

```c
#include <GxEPD2_3C.h>
#include <Adafruit_GFX.h>
#include <SPI.h>

// 1. Définir les broches de l'e-paper
#define EPD_MOSI 11  // SDI / MOSI
#define EPD_CLK  12  // SCL / SCK
#define EPD_CS   10  // CS
#define EPD_DC   9   // DC
#define EPD_RST  8   // RES / RESET
#define EPD_BUSY 7   // BUSY

// 2. Construire l'instance du driver (pour tester rapidement différents modèles de driver)
// Pendant les tests, ne garder qu'une option décommentée, commenter les autres avec //

// Option A : GDEW075Z08 (800x480, chip driver GD7965)
// GxEPD2_3C<GxEPD2_750c_Z08, GxEPD2_750c_Z08::HEIGHT> display(GxEPD2_750c_Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Option B : GDEW075Z09 (640x384, chip driver UC8179 / IL0371)
// GxEPD2_3C<GxEPD2_750c, GxEPD2_750c::HEIGHT> display(GxEPD2_750c(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Option C : GDEH075Z90 (880x528, chip driver SSD1677) — gourmand en mémoire, utilise la pagination HEIGHT / 2
// GxEPD2_3C<GxEPD2_750c_Z90, GxEPD2_750c_Z90::HEIGHT / 2> display(GxEPD2_750c_Z90(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Option D : GDEW075Z08 (800x480, une autre variante basée sur le chip UC8179)
// GxEPD2_3C<GxEPD2_750c_GDEW075Z08, GxEPD2_750c_GDEW075Z08::HEIGHT / 2> display(GxEPD2_750c_GDEW075Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Option E : GDEY075Z08 (800x480, chip driver UC8179)
GxEPD2_3C<GxEPD2_750c_GDEY075Z08, GxEPD2_750c_GDEY075Z08::HEIGHT / 2> display(GxEPD2_750c_GDEY075Z08(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));


void setup() {
  Serial.begin(115200);
  delay(1000);

  // 3. [ÉTAPE CLÉ] Comme on utilise des broches SPI non standard, il faut d'abord initialiser manuellement le bus SPI de l'ESP32-S3
  // Ordre des paramètres : SCK, MISO (-1 = aucun), MOSI, SS (-1 = non assigné pour le moment)
  SPI.begin(EPD_CLK, -1, EPD_MOSI, -1);

  // 4. Initialiser l'écran
  Serial.println("Initializing e-Paper...");
  display.init(115200);
  display.setRotation(0); // 0 = orientation paysage standard

  // 5. Commencer à dessiner une page simple
  Serial.println("Rendering test page...");
  drawSimplePage();

  // 6. Une fois le rafraîchissement terminé, mettre l'écran en veille profonde pour le protéger et couper l'alimentation
  display.powerOff();
  Serial.println("Done! Screen is now in deep sleep.");
}

void loop() {
  // Garder la boucle vide pour éviter des rafraîchissements répétés qui abîment l'e-paper
  delay(1000);
}

// Fonction de dessin minimale
void drawSimplePage() {
  display.firstPage();
  do {
    // Effacer l'écran (tout blanc)
    display.fillScreen(GxEPD_WHITE);

    // 1. Bande rouge en haut
    display.fillRect(0, 0, display.width(), 50, GxEPD_RED);
    display.setTextColor(GxEPD_WHITE);
    display.setTextSize(3);
    display.setCursor(30, 15);
    display.print("ESP32-S3 TEST");

    // 2. Grand texte noir au milieu
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(5);
    display.setCursor(50, 180);
    display.print("Hello World!");

    // 3. Indication en rouge en bas
    display.setTextColor(GxEPD_RED);
    display.setTextSize(2);
    display.setCursor(50, 300);
    display.print("7.5 inch E-Paper Display Works!");

  } while (display.nextPage());
}
```

## Dépannage courant

Pas de panique, 80 % des problèmes se ramènent à cette liste :

- **Le moniteur série affiche `E BOD: Brownout detector was triggered` en boucle** : la protection de sous-tension de l'ESP32 a déclenché — le démarrage du Wi-Fi a fait chuter la tension. Voir la section « Stabilité de l'alimentation » ci-dessus : mets en parallèle un condensateur électrolytique 470μF/1000μF et un condensateur céramique 0,1μF entre `3V3` et `GND`, et change pour un câble USB un peu costaud.
- **L'écran reste désespérément blanc** : commence par vérifier la ligne BUSY ; dans le moniteur série, la ligne `[BUSY diag]` doit afficher 1. Si c'est 0, checke le câblage et l'alimentation — très souvent, un fil Dupont mal enfoncé.
- **Chaque rafraîchissement se bloque et finit par timeout après 30 s** : quasi toujours une broche BUSY mal câblée ou une alimentation insuffisante de l'écran (un USB qui fournit trop peu de courant provoque le même symptôme — essaie un câble de données plus épais).
- **Les sinogrammes s'affichent en carrés ou il en manque** : ce caractère n'est pas dans la police locale ; retourne au passage mentionné dans « Explications du code » et ajoute le tableau de points correspondant au nouveau caractère.
- **Le Wi-Fi refuse de se connecter** : vérifie que tu n'as pas typo `ssid` et `password`, et que ton routeur est bien en 2,4 GHz — la plupart des ESP32 ne supportent pas le 5 GHz.
- **Le cours reste bloqué sur un chiffre sans se rafraîchir** : c'est normal — si l'horodatage n'a pas changé, le code considère que « le marché est fermé » et passe à un réveil toutes les heures ; dès la réouverture, le rythme normal reprend tout seul.
- **Erreur de compilation : `GxEPD2_750c_GDEY075Z08` introuvable** : vérifie que ta bibliothèque GxEPD2 n'est pas trop ancienne ; ce modèle d'écran a été ajouté plus tard dans la liste supportée, mets à jour vers une version plus récente.

## FAQ

**Q : Est-ce que je peux changer les broches de l'ESP32 ?**
R : Oui, tant que ce sont des GPIO standards compatibles SPI ; modifie simplement les macros `EPD_MOSI` / `EPD_CLK` / `EPD_CS` / `EPD_DC` / `EPD_RST` / `EPD_BUSY` en tête de fichier pour mettre les numéros de broches que tu as réellement utilisés — rien d'autre à toucher.

**Q : Je peux accélérer le rafraîchissement, par exemple 1 fois par minute ?**
R : Oui, remplace les 10 minutes dans `computeSleepSeconds` par la cadence voulue. Mais attention : un e-paper a un nombre de rafraîchissements limité dans sa durée de vie ; trop fréquent, ce n'est pas rentable.

**Q : Ça fonctionne sur batterie ?**
R : Le code actuel est un mode démo « Wi-Fi constant + delay » ; le Wi-Fi reste sous tension et consomme pas mal, donc plutôt adapté à une alimentation USB. Sur batterie, mieux vaut passer en deep-sleep : réveil, récupération des données, déconnexion du Wi-Fi, et back au dodo.

**Q : Ça consomme combien de mémoire, l'ESP32 tient-il le choc ?**
R : La police et le code en eux-mêmes sont tout petits ; le gros poste, c'est le tampon d'affichage de GxEPD2. Sur un 7,5\" tricolore, privilégie un ESP32 avec un peu de marge en Flash et RAM ; une carte ESP32-S3 standard passe largement.

**Q : Est-ce que je peux afficher une autre action, par exemple une action A ou une action US ?**
R : Oui, remplace `api_url` par l'URL Tencent Finance de l'action voulue. Attention en revanche : les horaires d'ouverture / clôture A-shares et US ne sont pas ceux de HK, il faut ajuster en conséquence les heures d'ouverture / clôture dans `computeSleepSeconds`. Et pour tout nouveau caractère chinois, il faudra générer toi-même les glyphes correspondants dans la police, sinon tu auras des carrés vides.

**Q : Est-ce que je peux changer de taille d'écran, par exemple un 4,2\" plus petit ?**
R : Oui, passe sur le modèle GxEPD2 correspondant et pense à réajuster les coordonnées graphiques (les 800, 480, etc.) à la résolution du nouvel écran, sinon la mise en page sera décalée.

## Pistes d'extension

- Carousel de plusieurs actions avec rotation automatique du tableau de bord
- Ajouter une petite page web de configuration pour renseigner le Wi-Fi sans recompiler
- Brancher une photorésistance : rafraîchissement normal le jour, fréquence réduite la nuit pour économiser
- Passer en deep-sleep + batterie pour en faire un vrai petit objet sans fil posé sur le bureau

## Références

- [Dépôt GitHub de GxEPD2](https://github.com/ZinggJM/GxEPD2)
- [Dépôt GitHub de la bibliothèque Adafruit GFX](https://github.com/adafruit/Adafruit-GFX-Library)
- [Documentation officielle ESP32 chez Espressif](https://www.espressif.com/en/products/socs/esp32)
