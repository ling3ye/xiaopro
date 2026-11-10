---
title: "買板子前先看清楚：ESP32-S3 後綴、Flash、PSRAM 與約價（含 C3 對照）"
domain: hardware
platforms: ["cross-platform"]
format: "cheatsheet"
date: 2026-11-10
intro: "N4、N8R2、N16R8 這些後綴只講兩件事：N 後面是 Flash，R 後面是 PSRAM。這篇把五款常見板子的容量和約價擺到一張表上，順帶說清怎麼選。"
tags: ["ESP32-S3", "ESP32-C3", "PSRAM", "Flash", "開發板選型", "ESP-IDF"]
relatedBoards: ["esp32s3"]
image: "https://img.lingflux.com/2026/11/bf80e841c5e9fb342ebc387e1e68edf8.jpg"
---

> 速查表。五款都是插上 USB-C 就能用的整板，容量是標稱值，價格是約價（人民幣），只用來橫向比量級。

## 00 先記住三句

1. **後綴只講容量。** `N16R8` = 16 MB Flash + 8 MB PSRAM。`N` 是 Flash，`R` 是 PSRAM，數字就是 MB，跟「第幾代」「高低配」沒關係。
2. **Flash 不是記憶體。** Flash 是硬碟，斷電不丟，放韌體和資源。能 `malloc()` 的只有片上 SRAM（S3 是 512 KB）加 PSRAM。所以 Flash 再大，也救不了「沒有 PSRAM」。
3. **同容量不等於同價。** 約 ¥26 和約 ¥62 的兩塊板，Flash 和 PSRAM 一模一樣，差的錢花在射頻、品控和資料上（第 04 節）。

本文五款：**四款 ESP32-S3**——S3 SuperMini FH4R2、S3 N16R8 MINI、XIAO S3 / Sense、XIAO S3 Plus；**一款 ESP32-C3**——C3 SuperMini，跨架構對照組，不是同檔替代品。型號前的 `S3` / `C3` 說的是晶片歸屬，別和後面的容量後綴搞混。

## 01 三層結構，三種空間

一個「ESP32-S3」可能指三個不同的東西：

- **晶片**：ESP32-S3FH4R2、ESP32-S3R8、ESP32-C3FN4，QFN 裸片，Flash 和 PSRAM 可以直接封在裡面。拿到手還得自己畫板、做射頻匹配和天線。
- **模組**：WROOM-1 這種，晶片 + 板載 Flash + 晶振 + 屏蔽罩 + PCB 天線 + 射頻認證。名字帶 WROOM 一般指這層。
- **開發板**：再加 USB-C、LDO、按鍵、排針、天線，插上就能用。**本文五款全在這一層**，沒有模組裸件——同層比，價格和 GPIO 才有意義。

<svg viewBox="0 0 900 350" width="100%" style="height:auto" role="img" aria-label="晶片、模組、開發板三層結構，以及三款板子的名字分別落在哪一層">
  <title>圖 1 · 三層結構與命名解碼</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">同一個「ESP32-S3」名字，可能指三個完全不同的東西　·　本文樣本：S3 系列 4 款 + C3 對照 1 款</text>
  <rect x="20" y="40" width="860" height="52" rx="8" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="38" y="62" font-size="13" font-weight="600" fill="var(--ink)">① 晶片 die</text>
  <text x="38" y="80" font-size="12" fill="var(--ink-2)">ESP32-S3FH4R2 / ESP32-S3R8 / ESP32-C3FN4 · QFN 封裝 · Flash 與 PSRAM 可以封在晶片裡</text>
  <text x="862" y="70" font-size="12" text-anchor="end" fill="var(--pen)">看不見，要畫板</text>
  <rect x="20" y="102" width="860" height="52" rx="8" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="38" y="124" font-size="13" font-weight="600" fill="var(--ink)">② 模組</text>
  <text x="38" y="142" font-size="12" fill="var(--ink-2)">WROOM-1 = 晶片 + 板載 Flash + 晶振 + 屏蔽罩 + PCB 天線 + 射頻認證</text>
  <text x="862" y="132" font-size="12" text-anchor="end" fill="var(--accent)">五款裡沒有一款是它</text>
  <rect x="20" y="164" width="860" height="52" rx="8" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="38" y="186" font-size="13" font-weight="600" fill="var(--ink)">③ 開發板</text>
  <text x="38" y="204" font-size="12" fill="var(--ink-2)">裸片或模組 + USB-C + LDO + 按鍵 + 排針 + 天線 = 插線就能用</text>
  <text x="862" y="194" font-size="12" text-anchor="end" fill="var(--green)">本文五款全在這一層</text>
  <line x1="20" y1="234" x2="880" y2="234" stroke="var(--line-2)" stroke-width="1"/>
  <text x="20" y="256" font-size="13" fill="var(--ink-2)">名字解碼：後綴說的是「容量」，不是「型號等級」</text>
  <rect x="20" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="288" font-size="12" font-weight="600" fill="var(--ink)">ESP32-S3FH4R2</text>
  <text x="34" y="306" font-size="11" fill="var(--ink-2)">F=封裝內 Flash · H=高溫顆粒</text>
  <text x="34" y="322" font-size="11" fill="var(--ink-2)">4=4 MB Flash · R2=2 MB PSRAM</text>
  <rect x="312" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="326" y="288" font-size="12" font-weight="600" fill="var(--ink)">S3 N16R8 MINI</text>
  <text x="326" y="306" font-size="11" fill="var(--ink-2)">板上貼 ESP32-S3R8 裸片 + 16 MB Flash</text>
  <text x="326" y="322" font-size="11" fill="var(--ink-2)">N16 是板載 Flash，不是 WROOM 模組</text>
  <rect x="604" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="618" y="288" font-size="12" font-weight="600" fill="var(--ink)">XIAO S3 Plus</text>
  <text x="618" y="306" font-size="11" fill="var(--ink-2)">同一顆 ESP32-S3R8 裸片 + 16 MB Flash</text>
  <text x="618" y="322" font-size="11" fill="var(--ink-2)">差價買的是體積 / 天線座 / 生態</text>
</svg>

> **圖 1** · 同一個「ESP32-S3」可能指三個完全不同的東西；後綴說的是容量，不是型號等級。

**三種空間**別混：

- **Flash = 硬碟**。放韌體、字庫、網頁資源，斷電不丟。Quad SPI，標稱最高 80 MHz。**它不是記憶體。**
- **PSRAM = 外接記憶體條**。放大陣列、幀緩衝、TLS 和 JSON 緩衝，斷電清空，比片上記憶體慢；Flash 擦寫時還會短暫不可訪問。
- **片上 SRAM = 隨身口袋**。最快也最小。四款 S3 都是 **512 KB**（另有 384 KB ROM、16 KB RTC SRAM），C3 是 **400 KB**（其中 16 KB 作 cache）+ 384 KB ROM + 8 KB RTC SRAM。

所以商品頁那句「內建 8 MB PSRAM & 8 MB Flash」，PSRAM 在晶片封裝內，Flash 是另貼在板上的 Quad SPI 顆粒，**Flash 再大也不等於能 `malloc()` 的空間**。

參數頁上最容易讀錯的三處：

| 常見寫法 | 正確理解 | 怎麼自己核對 |
|---|---|---|
| 「512 KB SRAM」寫在 S3 板上 | S3 是 512 KB；ESP32-C3 是 400 KB | 看 CPU：Xtensa LX7 雙核 240 MHz 才是 S3，RISC-V 單核 160 MHz 是 C3 |
| 「內建 8 MB Flash」 | 多數是板載，不在晶片封裝內 | 查晶片完整料號，帶 `F` 才是封裝內 Flash |
| 「名字裡有 WROOM 就是模組」 | 也可能只是容量代號的沿用 | 觀察板上是否有帶屏蔽罩的小模組；裸片方案直接看得見主晶片 |

## 02 後綴解碼：九個代碼就是 3×3

九個訂購代碼看著像九種東西，其實是一張 3×3 的表：

- **`N` = 板載 Flash**：`N4` 4 MB、`N8` 8 MB、`N16` 16 MB。顆粒貼在模組 PCB 上，走 Quad SPI，斷電不丟。
- **`R` = 封在晶片裡的 PSRAM**：`R2` 2 MB（Quad，4 線）、`R8` 8 MB（Octal，8 線）。沒有 `R` 就是沒有 PSRAM。
- 3 檔 Flash × 3 檔 PSRAM = 9 個型號。

比價時最容易看錯的一點：`N8R8` 和 `N16R8` 的 PSRAM 一樣大，差的只有 Flash。

<svg viewBox="0 0 900 406" width="100%" style="height:auto" role="img" aria-label="ESP32-S3-WROOM-1 的 N16R8 後綴拆解，以及 Flash 四八十六、PSRAM 無二八兩軸組成的九個型號矩陣">
  <title>圖 2 · 後綴拆解與九個型號的 3×3 矩陣</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">一個後綴只講兩件事：N 後面是 Flash 容量，R 後面是 PSRAM 容量；兩軸各三檔，組合出九個型號</text>
  <rect x="20" y="42" width="246" height="64" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">ESP32-S3-WROOM-1</text>
  <text x="34" y="84" font-size="11" fill="var(--ink-2)">模組系列本身：PCB 板載天線</text>
  <text x="34" y="100" font-size="11" fill="var(--ink-2)">帶 U 的 1U 改 U.FL 天線座</text>
  <rect x="274" y="42" width="290" height="64" rx="7" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="288" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">N16　→　Flash 16 MB</text>
  <text x="288" y="84" font-size="11" fill="var(--ink-2)">板載 Quad SPI 顆粒，貼在模組 PCB 上</text>
  <text x="288" y="100" font-size="11" fill="var(--ink-2)">斷電不丟，放韌體與資源</text>
  <rect x="572" y="42" width="308" height="64" rx="7" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="586" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">R8　→　PSRAM 8 MB</text>
  <text x="586" y="84" font-size="11" fill="var(--ink-2)">封裝在晶片內的 Octal PSRAM，8 線</text>
  <text x="586" y="100" font-size="11" fill="var(--ink-2)">斷電清空，放幀緩衝與堆</text>
  <text x="20" y="136" font-size="11" fill="var(--ink-3)">行 = PSRAM 檔　列 = Flash 檔</text>
  <text x="276" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 4 MB</text>
  <text x="498" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 8 MB</text>
  <text x="720" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 16 MB</text>
  <rect x="20" y="166" width="5" height="20" rx="2" fill="var(--accent)"/>
  <text x="34" y="181" font-size="12.5" font-weight="600" fill="var(--ink)">無 PSRAM</text>
  <rect x="20" y="230" width="5" height="20" rx="2" fill="var(--pen)"/>
  <text x="34" y="245" font-size="12.5" font-weight="600" fill="var(--ink)">2 MB Quad</text>
  <rect x="20" y="294" width="5" height="20" rx="2" fill="var(--green)"/>
  <text x="34" y="309" font-size="12.5" font-weight="600" fill="var(--ink)">8 MB Octal</text>
  <rect x="170" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="276" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4</text>
  <text x="276" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">執行期 0.5 MB</text>
  <rect x="392" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="498" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8</text>
  <text x="498" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">執行期 0.5 MB</text>
  <rect x="614" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="720" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16</text>
  <text x="720" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">執行期 0.5 MB</text>
  <rect x="170" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="276" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R2</text>
  <text x="276" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">執行期 2.5 MB</text>
  <rect x="392" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="498" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R2</text>
  <text x="498" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">執行期 2.5 MB</text>
  <rect x="614" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="720" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R2</text>
  <text x="720" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">執行期 2.5 MB</text>
  <rect x="170" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="276" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R8</text>
  <text x="276" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">執行期 8.5 MB</text>
  <rect x="392" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="498" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R8</text>
  <text x="498" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">執行期 8.5 MB</text>
  <rect x="614" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="2.5"/>
  <text x="720" y="300" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R8</text>
  <text x="720" y="318" font-size="11" text-anchor="middle" fill="var(--ink-2)">執行期 8.5 MB</text>
  <rect x="760" y="284" width="44" height="18" rx="4" fill="var(--card)" stroke="var(--green)" stroke-width="1"/>
  <text x="782" y="297" font-size="10.5" text-anchor="middle" fill="var(--green)">基線</text>
  <text x="20" y="358" font-size="12" fill="var(--ink-2)">R8 三格：佔用 GPIO33~37，環境溫度上限 65 °C；其餘六格：GPIO33~37 可用，上限 85 °C。</text>
  <text x="20" y="378" font-size="12" fill="var(--ink-2)">R8 只把 PSRAM 拉到 8 線，Flash 仍是 4 線 Quad SPI；Flash 也走 8 線的是 WROOM-2。</text>
  <text x="20" y="398" font-size="12" fill="var(--ink-3)">執行期記憶體 = 片上 SRAM 512 KB + PSRAM 容量；Flash 不計入記憶體。</text>
</svg>

> **圖 2** · 九個型號就是這張表的九個格子，沒有第十個；容量最大的那一格（`N16R8`）溫度上限反而最低。

九格之外還有幾種寫法，分銷頁上常混著出現：

| 寫法 | 與九個組合的關係 | Flash | PSRAM | 環境溫度 |
|---|---|---|---|---|
| `-1U`（如 `1U-N16R8`） | 九格全部成立，只把 PCB 天線換成 U.FL 座 | 同左 | 同左 | 同左 |
| `H4` | 無 PSRAM 的高溫料號 | 4 MB Quad | 無 | −40~105 °C |
| `N16R16VA` | 九格之外的超大容量，SPI 走 1.8 V | 16 MB Quad | 16 MB Octal | −40~65 °C |
| `WROOM-2` 的 `N16R8V` / `N32R8V` / `N32R16V` | 另一條產品線，Flash 也走 8 線 | 16 / 32 MB Octal | 8 / 16 MB Octal | −40~65 °C |

`1U` 和不帶 `U` 只差天線：帶 `U` 是 U.FL 座外接天線，18.0×19.2×3.2 mm；不帶 `U` 是 PCB 板載天線，18.0×25.5×3.1 mm。要裝機殼、天線引出去就選前者。容量表一樣，但結構淨空和整機認證的路子不同。

兩個容易踩的點：

- **`R8` 只把 PSRAM 拉到 8 線，Flash 還是 4 線 Quad SPI。** 型號裡的「Octal」說的是 PSRAM；Flash 也走 8 線的是 WROOM-2。
- **官方代碼裡沒有 `N6`。** WROOM-1 的 Flash 只有 4 / 8 / 16 MB 三檔。碰到表外後綴，拿完整料號去 datasheet 核，別按名字猜。

以 `N16R8` 為基線排一遍：

| 組合 | Flash | PSRAM | 與 `N16R8` 的差 | 執行期記憶體 | 環境溫度上限 |
|---|---|---|---|---|---|
| `N16R8` | 16 MB | 8 MB Octal | 基線 | 8.5 MB | 65 °C |
| `N8R8` | 8 MB | 8 MB Octal | Flash 少 8 MB | 8.5 MB | 65 °C |
| `N4R8` | 4 MB | 8 MB Octal | Flash 少 12 MB | 8.5 MB | 65 °C |
| `N16R2` | 16 MB | 2 MB Quad | PSRAM 少 6 MB，8 線降為 4 線 | 2.5 MB | 85 °C |
| `N8R2` | 8 MB | 2 MB Quad | PSRAM 少 6 MB；Flash 少 8 MB | 2.5 MB | 85 °C |
| `N4R2` | 4 MB | 2 MB Quad | PSRAM 少 6 MB；Flash 少 12 MB | 2.5 MB | 85 °C |
| `N16` | 16 MB | 無 | PSRAM 少 8 MB | 0.5 MB | 85 °C |
| `N8` | 8 MB | 無 | PSRAM 少 8 MB；Flash 少 8 MB | 0.5 MB | 85 °C |
| `N4` | 4 MB | 無 | PSRAM 少 8 MB；Flash 少 12 MB | 0.5 MB | 85 °C |

三件事：

1. **PSRAM 是大跳。** 0 → 2 → 8 MB，執行期記憶體 0.5 / 2.5 / 8.5 MB。`N16` 到 `N16R2` 漲 5 倍，再到 `N16R8` 又漲 3.4 倍；Quad 換 Octal，資料線也從 4 根變 8 根。
2. **Flash 是等差。** 4 / 8 / 16 MB，對執行期記憶體一點影響都沒有——換大只是多放韌體、字庫和網頁資源。所以 `N16R2` 和 `N8R8` 不是誰更大，是一個多硬碟、一個多記憶體。
3. **容量和限制反著走。** R8 一行容量最大，溫度上限反而最低（65 °C），還佔掉 GPIO33~37；不帶 PSRAM 的能到 85 °C，引腳也最全。想同時要 8 MB PSRAM 和 85 °C，這九個格子給不出來——要麼退到 R2，要麼給 R8 開 ECC（容量再減 1/16）。

五款板的容量正好落在表上：

- `S3 N16R8 MINI`、`XIAO S3 Plus` → 等同 `N16R8`
- `XIAO S3 / Sense` → 等同 `N8R8`
- `S3 SuperMini FH4R2` → 等同 `N4R2`，只是它的 Flash 也封在晶片裡（料號裡的 `F`），顆粒還是高溫等級（`H`）
- `C3 SuperMini` → 不在表內：ESP32-C3 是另一條架構線，4 MB Flash、沒有 PSRAM，晶片也不支援

## 03 容量全景

五款整板各取一格：`N16R8`、`N8R8`、`N4R2`，外加一個表外的 C3。S3 四款（Xtensa LX7 雙核 240 MHz，帶 FPU 和向量指令），C3 一款（RISC-V 單核 160 MHz，無 PSRAM，晶片也不支援）。後三款 S3 用的是同一顆 ESP32-S3R8，差別只在板載 Flash 是 8 MB 還是 16 MB。

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="五款開發板與 WROOM-1 九個模組組合的 Flash 與 PSRAM 總容量堆疊條形圖，同一刻度，最大 24 MB">
  <title>圖 3 · Flash + PSRAM 總容量：五款整板與九個模組組合（同一刻度，單位 MB）</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">藍 = Flash（硬碟）　綠 = PSRAM（記憶體條）　橙 = 只有 Flash、沒有 PSRAM</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">整板 · 本文五款</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="420" y1="48" x2="420" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="820" y1="48" x2="820" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="100" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="69" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="69" font-size="11.0" fill="var(--accent)">無 PSRAM</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="100" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="111" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="94" width="50" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="111" font-size="11.0" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="111" font-size="11.0" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="200" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="153" font-size="11.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="136" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="153" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="153" font-size="11.0" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="195" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="178" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="195" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="195" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="237" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="220" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="237" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="237" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">模組組合 · WROOM-1 九種</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">同一刻度：四款 S3 整板與其中三個格子等長</text>
  <text x="206" y="301" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="301" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="288" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="301" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="301" font-size="10.5" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="331" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="331" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="318" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="331" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="331" font-size="10.5" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="361" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="361" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="348" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="420" y="361" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="529" y="361" font-size="10.5" fill="var(--ink-3)">12 MB</text>
  <text x="206" y="391" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="391" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="378" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="645" y="391" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="679" y="391" font-size="10.5" fill="var(--ink-3)">18 MB</text>
  <text x="206" y="421" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="421" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="408" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="445" y="421" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="479" y="421" font-size="10.5" fill="var(--ink-3)">10 MB</text>
  <text x="206" y="451" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="451" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="438" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="451" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="451" font-size="10.5" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="481" font-size="11.5" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="400" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="420" y="481" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <text x="629" y="481" font-size="10.5" fill="var(--accent)">無 PSRAM</text>
  <text x="206" y="511" font-size="11.5" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="200" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="320" y="511" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="429" y="511" font-size="10.5" fill="var(--accent)">無 PSRAM</text>
  <text x="206" y="541" font-size="11.5" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="100" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="541" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="541" font-size="10.5" fill="var(--accent)">無 PSRAM</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="420" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">16</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">24 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">兩層條長逐一對得上：整板不額外加儲存，容量上限由所選模組決定；C3 與 N16 / N8 / N4 都沒有 PSRAM。</text>
</svg>

> **圖 3** · 上半段五款整板、下半段九個模組組合，兩組條長逐一對得上；總量最大差 6 倍，但藍段是硬碟，不算記憶體。

「執行期記憶體」（片上 SRAM + PSRAM）才是寫程式時真能分配的量，條長只由 PSRAM 決定：

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="五款開發板與九個模組組合的執行期可用記憶體條形圖，0.4、0.5、2.5、8.5 MB 四級">
  <title>圖 4 · 執行期真正能當記憶體用的空間：五款整板與九個模組組合</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">片上 SRAM + PSRAM；Flash 不算記憶體。橙 = 0.4~0.5 MB　藍 = 2.5 MB　綠 = 8.5 MB</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">整板 · 本文五款</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="353" y1="48" x2="353" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="487" y1="48" x2="487" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="753" y1="48" x2="753" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="26.7" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="256" y="69" font-size="12.0" fill="var(--accent)">0.4 MB（僅片上 SRAM）</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="166.7" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="111" font-size="12.0" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="153" font-size="12.0" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="195" font-size="12.0" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="237" font-size="12.0" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">模組組合 · WROOM-1 九種</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">同一刻度：0.5 / 2.5 / 8.5 MB 三級，與整板一一對應</text>
  <text x="206" y="301" font-size="11" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="301" font-size="10.5" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="331" font-size="11" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="331" font-size="10.5" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="361" font-size="11" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="361" font-size="10.5" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="391" font-size="11" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="391" font-size="10.5" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="421" font-size="11" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="421" font-size="10.5" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="451" font-size="11" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="451" font-size="10.5" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="481" font-size="11" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="481" font-size="10.5" fill="var(--accent)">0.5 MB</text>
  <text x="206" y="511" font-size="11" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="511" font-size="10.5" fill="var(--accent)">0.5 MB</text>
  <text x="206" y="541" font-size="11" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="541" font-size="10.5" fill="var(--accent)">0.5 MB</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="353" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">2</text>
  <text x="487" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">4</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">6</text>
  <text x="753" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">9 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">最大檔約為最小檔的 21 倍；多出來的 0.5 MB 來自片上 SRAM，所以 N4 / N8 / N16 與 C3 只差 0.1 MB。</text>
</svg>

> **圖 4** · 真正能 `malloc()` 的是執行期記憶體：0.4 / 0.5 / 2.5 / 8.5 MB 四級，最大差約 21 倍；沒有 `R` 的型號，條長只剩片上 SRAM 那一小截。

給個量級感受：320×240 的 RGB565 一幀約 150 KB，2 MB PSRAM 放約 13 幀，8 MB 約 53 幀；16 kHz / 16 bit 單聲道音訊 10 秒約 320 KB，2 MB 緩約 60 秒，8 MB 約 250 秒。「Flash 夠大」替代不了「記憶體夠用」。

| 維度 | S3 SuperMini FH4R2 | S3 N16R8 MINI | XIAO S3 / Sense | XIAO S3 Plus | C3 SuperMini |
|---|---|---|---|---|---|
| **所屬系列** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-C3**（對照） |
| 主晶片 | ESP32-S3FH4R2 | ESP32-S3R8 | ESP32-S3R8 | ESP32-S3R8 | ESP32-C3FN4 |
| CPU | 雙核 240 MHz | 雙核 240 MHz | 雙核 240 MHz | 雙核 240 MHz | 單核 160 MHz |
| Flash | 4 MB（封裝內） | 16 MB（板載） | 8 MB（板載） | 16 MB（板載） | 4 MB（封裝內） |
| PSRAM | 2 MB Quad | 8 MB Octal | 8 MB Octal | 8 MB Octal | 無，晶片不支援 |
| 片上記憶體 | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 400 KB SRAM |
| 執行期記憶體 | 2.5 MB | 8.5 MB | 8.5 MB | 8.5 MB | 0.4 MB |
| 儲存總量 | 6 MB | 24 MB | 16 MB | 24 MB | 4 MB |
| 可用 GPIO | 約 11 | 約 20 | 11（Sense 多 2） | 18 | 11 |
| 工作溫度 | −40~85 °C | −40~65 °C | −20~65 °C | −20~65 °C | −40~85 °C |
| 約價 | 約 ¥22 | 約 ¥26 | 約 ¥54 | 約 ¥62 | 約 ¥12 |

四款 S3 的片上記憶體一模一樣，差的只有 Flash 和 PSRAM。C3 是另一條架構線：沒有 USB OTG、LCD / 攝影機介面和向量指令，也沒法靠外掛 Flash 補出 PSRAM——放進來是為了說明架構差異，不是當替代品。

## 04 加上價格

> **價格口徑**：**約 ¥12 / ¥22 / ¥26 / ¥54 / ¥62**（人民幣）取自 2026-11 公開零售渠道，取整留了餘量，蓋住含稅、運費、促銷和套裝的差異。不是官方定價也不是即時售價，只適合橫向比量級；不同市場、不同時間能差到數倍，以當地實際售價為準。

<svg viewBox="0 0 900 320" width="100%" style="height:auto" role="img" aria-label="五款開發板約價橫向條形圖，從約 12 元到約 62 元">
  <title>圖 5 · 約價與容量：同容量檔的價差（同一刻度）</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">條長 = 約價，條內 = 該約價買到的總儲存 / 執行期記憶體；本圖不含品質維度</text>
  <rect x="220" y="38" width="600" height="242" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="391" y1="38" x2="391" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="563" y1="38" x2="563" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="734" y1="38" x2="734" y2="280" stroke="var(--line)" stroke-width="1"/>
  <text x="20" y="70" font-size="13" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="103" height="26" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="230" y="70" font-size="12" fill="var(--ink)">4 MB · 0.4 MB</text>
  <text x="331" y="70" font-size="12" fill="var(--accent)">約 ¥12</text>
  <text x="20" y="114" font-size="13" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="96" width="189" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="114" font-size="12" fill="var(--ink)">6 MB · 2.5 MB</text>
  <text x="417" y="114" font-size="12" fill="var(--pen)">約 ¥22</text>
  <text x="20" y="158" font-size="13" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="140" width="223" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="158" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="451" y="158" font-size="12" fill="var(--pen)">約 ¥26</text>
  <text x="20" y="202" font-size="13" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="184" width="463" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="202" font-size="12" fill="var(--ink)">16 MB · 8.5 MB</text>
  <text x="691" y="202" font-size="12" fill="var(--pen)">約 ¥54</text>
  <text x="20" y="246" font-size="13" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="228" width="531" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="246" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="759" y="246" font-size="12" fill="var(--pen)">約 ¥62</text>
  <text x="220" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="391" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥20</text>
  <text x="563" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥40</text>
  <text x="734" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥60</text>
  <text x="20" y="316" font-size="12" fill="var(--ink-3)">約價區間 12~62，最大差約 5.2 倍；條長只反映價格，射頻、一致性與資料都不在刻度上。</text>
</svg>

> **圖 5** · 容量與配置完全相同的兩款，約價相差約 ¥36；這個差值來自容量表之外，圖上判斷不出優劣。

最直觀的一處：**約 ¥26 的 S3 N16R8 MINI 和約 ¥62 的 XIAO S3 Plus，Flash、PSRAM、執行期記憶體、韌體配置全都一樣**，價差約 ¥36（58%）；攤到記憶體上是約 ¥3.06 / MB 和約 ¥7.29 / MB。差出來的錢花在容量表以外。

另外三處：

1. **單價和絕對價常常相反**。C3 絕對價最低，但沒 PSRAM，0.4 MB 攤下來約 ¥30 / MB，是 8 MB Octal 那檔的十倍。C3 本來就是奔著低功耗和小體積去的。
2. **同系列內也有取捨**。約 ¥54 的 XIAO 標準版 / Sense 比 Plus 便宜約 ¥8，Flash 少一半、GPIO 少 7 個；但 Sense 帶攝影機、麥克風和 SD 卡，標準版體積更小、有 U.FL 座。
3. **跨架構那一跳最大**。C3 → S3 SuperMini FH4R2 貴約 ¥10，執行期記憶體 0.4 → 2.5 MB（6.25 倍），同時換成雙核 240 MHz、向量指令和 USB OTG。這不是升級，是換了架構。

<svg viewBox="0 0 900 420" width="100%" style="height:auto" role="img" aria-label="約價與執行期記憶體的分布散點圖，僅呈現價格與記憶體兩個維度，不含品質資訊">
  <title>圖 6 · 約價 × 執行期記憶體：兩個維度的分布</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">本圖只有兩個維度：約價與執行期記憶體；射頻表現、板卡一致性、擴展生態與長期維護都不在坐標軸上</text>
  <rect x="120" y="50" width="700" height="290" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="108" x2="820" y2="108" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="166" x2="820" y2="166" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="224" x2="820" y2="224" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="282" x2="820" y2="282" stroke="var(--line)" stroke-width="1"/>
  <line x1="320" y1="50" x2="320" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="520" y1="50" x2="520" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="720" y1="50" x2="720" y2="340" stroke="var(--line)" stroke-width="1"/>
  <rect x="132" y="60" width="178" height="42" rx="5" fill="var(--card)" stroke="var(--line-2)" stroke-width="1"/>
  <text x="144" y="78" font-size="11" fill="var(--ink)">本圖只有價格與記憶體</text>
  <text x="144" y="94" font-size="11" fill="var(--ink)">不含品質維度</text>
  <circle cx="240" cy="328" r="5" fill="var(--accent)"/>
  <text x="252" y="332" font-size="12" fill="var(--accent)">C3 SuperMini 約 ¥12 · 0.4 MB</text>
  <circle cx="340" cy="268" r="5" fill="var(--pen)"/>
  <text x="352" y="272" font-size="12" fill="var(--pen)">S3 SuperMini FH4R2 約 ¥22 · 2.5 MB</text>
  <circle cx="380" cy="94" r="5" fill="var(--pen)"/>
  <text x="392" y="80" font-size="12" fill="var(--pen)">S3 N16R8 MINI 約 ¥26 · 8.5 MB</text>
  <circle cx="660" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="650" y="118" font-size="12" fill="var(--ink-2)">XIAO S3 / Sense 約 ¥54 · 8.5 MB</text>
  <circle cx="740" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="880" y="76" font-size="12" text-anchor="end" fill="var(--ink-2)">XIAO S3 Plus 約 ¥62 · 8.5 MB</text>
  <text x="120" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="320" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥20</text>
  <text x="520" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥40</text>
  <text x="720" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥60</text>
  <text x="820" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥70</text>
  <text x="112" y="54" font-size="12" text-anchor="end" fill="var(--ink-3)">10</text>
  <text x="112" y="112" font-size="12" text-anchor="end" fill="var(--ink-3)">8</text>
  <text x="112" y="170" font-size="12" text-anchor="end" fill="var(--ink-3)">6</text>
  <text x="112" y="228" font-size="12" text-anchor="end" fill="var(--ink-3)">4</text>
  <text x="112" y="286" font-size="12" text-anchor="end" fill="var(--ink-3)">2</text>
  <text x="112" y="344" font-size="12" text-anchor="end" fill="var(--ink-3)">0</text>
  <text x="20" y="400" font-size="12" fill="var(--ink-3)">↑ 執行期記憶體（MB）　→ 約價（¥）　三個 8.5 MB 的點在同一水平線上：約價差不來自儲存容量。</text>
</svg>

> **圖 6** · 三個點落在同一條 8.5 MB 水平線上：約價差異不來自儲存容量。圖上看不到的射頻、品控與資料，往往才是差價的來源。

整理成表（最後一列只是容量單價）：

| 型號 | 約價 | 總儲存 | 執行期記憶體 | 容量單價（約 ¥ / 執行期 MB） | 約價相對倍數 |
|---|---|---|---|---|---|
| C3 SuperMini | 約 ¥12 | 4 MB | 0.4 MB | 約 ¥30.00 | 1.00× |
| S3 SuperMini FH4R2 | 約 ¥22 | 6 MB | 2.5 MB | 約 ¥8.80 | 1.83× |
| S3 N16R8 MINI | 約 ¥26 | 24 MB | 8.5 MB | 約 ¥3.06 | 2.17× |
| XIAO S3 / Sense | 約 ¥54 | 16 MB | 8.5 MB | 約 ¥6.35 | 4.50× |
| XIAO S3 Plus | 約 ¥62 | 24 MB | 8.5 MB | 約 ¥7.29 | 5.17× |

### 差價買到了什麼

**能橫比的是價格，不是品質。** 同樣一套 16 MB Flash + 8 MB Octal PSRAM，做成板子還能差在這幾處：

- **射頻和天線**：匹配、淨空、調校決定 WiFi / BLE 的實際表現，有沒有 U.FL 座又是另一回事。低成本板常見的吐槽就是信號偏弱、隔牆連不穩，參數表上看不出來，只能看設計、看認證、實測 RSSI。
- **品控**：電源與 USB 保護、焊接、板材、批次差異，影響長期穩定執行，以及除錯時會不會撞上莫名其妙的問題。
- **資料和維護**：原理圖、pinout、範例韌體、社群問答、供貨。XIAO 這類品牌板更貴，通常就貴在這裡，不是 Flash 或 PSRAM 更貴。
- **合規**：裸片方案沒有模組射頻認證可依託，板級 RF 要單獨確認。

「一分價錢一分貨」大體成立，**但別反過來用**——貴不等於每項都好，品牌溢價、渠道加價、套裝差異都在。白牌板跨市場能差到數倍，品牌板官方定價全球基本一致，比價得放回自己所在的市場重算。

順序上更穩的做法：**先用容量、PSRAM 模式和韌體配置篩出「能跑」的板，再按射頻、穩定性、資料、供貨比，最後才看價格。**

## 05 把容量翻譯成配置

參數表上的容量不會自己變成能跑的韌體。五個開關，買板之前都能算清楚：

1. **Flash size 對齊實物**。`CONFIG_ESPTOOLPY_FLASHSIZE_4MB / 8MB / 16MB`（或 Arduino 的 Flash Size）要和板上顆粒一致，寫大了會在 OTA 或檔案系統初始化時踩到不存在的位址。
2. **PSRAM 模式對齊接線**。封裝內 2 MB Quad 用 `CONFIG_SPIRAM_MODE_QUAD`，8 MB Octal 用 `CONFIG_SPIRAM_MODE_OCT`；Arduino 裡對應 `QSPI PSRAM` / `OPI PSRAM`。**這項選錯不是跑得慢，是啟動直接 abort**。
3. **分割表先做加法**。Flash 不等於韌體可用空間：分割表、nvs、otadata、phy_init 先佔掉一小塊，剩下的在 app 和資料分割之間分。**雙 OTA 要給下個版本留同樣大的位置**，佔用約 `app × 2 + 資料分割 + 固定開銷`。帶協定堆疊和圖形庫的韌體常見 1~2 MB，雙 OTA 一乘就接近 4 MB，再留 1 MB 放字庫圖片必然越界——這是 4 MB 板最容易翻車的地方。先按自己韌體的實際體積加一遍，不夠就上 16 MB，或者退回單 OTA。
4. **給 PSRAM 緩衝留預算**。幀緩衝、TLS 握手緩衝、JSON 和圖片解碼堆都走 PSRAM；按「峰值同時駐留的緩衝之和 × 1.3」估，再對照 2 MB / 8 MB 兩檔。DMA 緩衝、任務堆疊、靜態變數預設不能放 PSRAM，要顯式配置。
5. **跨架構換 target**。C3 是 RISC-V，S3 是 Xtensa，`CONFIG_IDF_TARGET`、工具鏈和 SDK 配置要整套換；`CONFIG_SPIRAM_*` 對 C3 全部無效，不用寫。

一組常見的 16 MB + Octal 配置長這樣：

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
```

| 容量檔 | 該配的項 | 實際影響 |
|---|---|---|
| 16 MB Flash + 8 MB Octal | `FLASHSIZE_16MB` + `MODE_OCT` + `SPEED_80M` | 雙 OTA 與資料分割都放得下，資源相對寬鬆 |
| 8 MB Flash + 8 MB Octal | 同上，Flash size 換成 `8MB` | 雙 OTA 仍然成立，但留給資料分割的餘量明顯變小，字庫與圖片要算著放 |
| 4 MB Flash + 2 MB Quad | `FLASHSIZE_4MB` + `MODE_QUAD` + 4 MB 分割表 | 雙 OTA 通常排不下，多為單 OTA；PSRAM 緩衝預算按 2 MB 重算 |
| 4 MB Flash、無 PSRAM（C3） | `IDF_TARGET=esp32c3` + 4 MB 分割表 | `SPIRAM_*` 全部不適用，記憶體預算只能按片上 SRAM 算 |

一句話收口：**選板前先算三筆帳**——Flash 裝不裝得下韌體和資源、PSRAM 放不放得下峰值緩衝、配置項對不對得上實物。三筆都過，這板才能用。

## 06 怎麼選、避哪些坑

**先從程式需要什麼反推容量，再在夠得著的板子裡挑**，別按價格或參數高低排座次：

| 程式對資源的實際要求 | 夠用的最低檔 | 為什麼 |
|---|---|---|
| 彩色或灰度整屏刷新、多圖層幀緩衝、本地字庫與圖片、音訊流，或雙 OTA 加檔案系統 | 16 MB Flash + 8 MB Octal PSRAM | 8.5 MB 執行期記憶體能給幀緩衝與 TLS 各留一塊，Flash 裝得下兩份 app 加一份資源區 |
| 單色屏整屏刷新、感測器聚合、單 OTA、少量 JSON | 4 MB Flash + 2 MB Quad PSRAM | 2.5 MB 執行期記憶體夠跑，但字庫與圖片必須挑小的放 |
| 只做連網上報、無圖形介面、功耗與體積優先 | 4 MB Flash、無 PSRAM（C3） | 0.4 MB 只夠協定堆疊加小緩衝，換來低功耗與最小體積 |
| 需要攝影機 / 麥克風 / SD 卡，或受限於可穿戴尺寸 | 8 MB Flash 的 XIAO 標準版 / Sense | 主要約束在板級整合與引腳數量，不在容量 |

還有一項不在表裡、但能直接否掉某些板子：**寬溫**。8 MB Octal PSRAM 的溫域是 −40~65 °C，要跑 85 °C 就得換封裝內 Quad 的料號，或者開 ECC（可用容量減 1/16）。這條上 `S3 SuperMini FH4R2` 反而更寬。

避坑清單：

- 8 MB Octal PSRAM 會佔用 **GPIO33~37**，資料裡標「不可用於其他功能」的腳別複用。
- `FH4R2` 裡的 `H` 只表示 Flash 顆粒是高溫等級，**不代表整晶片能上 105 °C**，現行 datasheet 的溫域是 −40~85 °C。
- 裸片方案沒有模組射頻認證可依賴，做產品時板級 RF 合規要單獨確認；`ESP32-C3FN4` 在樂鑫官網已標 EOL，新設計選在產替代料號。
- 封裝內 Flash + PSRAM 共用同一組 SPI 線，引腳已佔滿，**不能再外擴儲存**；要自己配儲存，得從沒有合封的料號重新畫板。
- 板載天線的實際表現不寫在參數表裡。連接不穩、隔牆掉線，先看天線淨空和有沒有 U.FL 座，再實測 RSSI——部分低成本板卡這類回饋挺常見，別一上來就當韌體 bug 反覆排查。

### 價格之外的成本

零售約價只是硬體的起點。從一塊能點亮的板子到一個能長期穩定工作的產品，中間還有四類成本，都跟「幾 MB Flash、幾 MB PSRAM」無關：**硬體工程**（結構散熱、供電與電池、天線調校、整機 EMC）、**軟體工程**（驅動適配、休眠喚醒、異常恢復、升級回滾、長期相容）、**合規認證**（整機 EMC / RF、市場准入）、**量產售後**（良率、批次一致性、返修備件）。

量級隨產品形態差得極遠，也從來不寫進商品頁。所以本文比的是**選板時的硬體參數**，不是成品的成本結構：看懂參數能幫你別買錯板，板子到手之後還要投什麼，由專案本身決定。

---

**資料來源與口徑**：樂鑫《ESP32-S3 Series Datasheet v2.2》表 1-1 / 2-14 / 5-11 / 5-12、《ESP32-C3 Series Datasheet》、《ESP32-S3-WROOM-1 & 1U 技術規格書》表 1-1 / 1-2（九個訂購代碼、Flash 與 PSRAM 類型、溫域、模組尺寸）、《ESP32-S3-WROOM-2 技術規格書》（1.8 V SPI 與 32 MB Flash 檔位）、Seeed Studio XIAO ESP32-S3 系列官方 wiki 與產品規格書、S3 N16R8 MINI 開發板廠商公開資料、ESP-IDF《Support for External RAM》與 Arduino-ESP32 板型配置文件。容量為標稱值，實際可 `malloc()` 的堆會略少；PSRAM 頻寬、溫域與 GPIO 佔用以對應料號的最新 datasheet 為準。文中價格為 2026-11 公開零售渠道的**大約價格（人民幣）**，口徑見第 04 節，不構成品質評價或購買建議。
