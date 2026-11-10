---
title: "买板子前先看清：ESP32-S3 后缀、Flash、PSRAM 与约价（含 C3 对照）"
domain: hardware
platforms: ["cross-platform"]
format: "cheatsheet"
date: 2026-11-10
intro: "N4、N8R2、N16R8 这些后缀只讲两件事：N 后面是 Flash，R 后面是 PSRAM。这篇把五款常见板子的容量和约价摆到一张表上，顺带说清怎么选。"
tags: ["ESP32-S3", "ESP32-C3", "PSRAM", "Flash", "开发板选型", "ESP-IDF"]
relatedBoards: ["esp32s3"]
image: "https://img.lingflux.com/2026/11/bf80e841c5e9fb342ebc387e1e68edf8.jpg"
---

> 速查表。五款都是插上 USB-C 就能用的整板，容量是标称值，价格是约价，只用来横向比量级。

## 00 先记住三句

1. **后缀只讲容量。** `N16R8` = 16 MB Flash + 8 MB PSRAM。`N` 是 Flash，`R` 是 PSRAM，数字就是 MB，跟「第几代」「高低配」没关系。
2. **Flash 不是内存。** Flash 是硬盘，断电不丢，放固件和资源。能 `malloc()` 的只有片上 SRAM（S3 是 512 KB）加 PSRAM。所以 Flash 再大，也救不了「没有 PSRAM」。
3. **同容量不等于同价。** 约 ¥26 和约 ¥62 的两块板，Flash 和 PSRAM 一模一样，差的钱花在射频、品控和资料上（第 04 节）。

本文五款：**四款 ESP32-S3**——S3 SuperMini FH4R2、S3 N16R8 MINI、XIAO S3 / Sense、XIAO S3 Plus；**一款 ESP32-C3**——C3 SuperMini，跨架构对照组，不是同档替代品。型号前的 `S3` / `C3` 说的是芯片归属，别和后面的容量后缀搞混。

## 01 三层结构，三种空间

一个「ESP32-S3」可能指三个不同的东西：

- **芯片**：ESP32-S3FH4R2、ESP32-S3R8、ESP32-C3FN4，QFN 裸片，Flash 和 PSRAM 可以直接封在里面。拿到手还得自己画板、做射频匹配和天线。
- **模组**：WROOM-1 这种，芯片 + 板载 Flash + 晶振 + 屏蔽罩 + PCB 天线 + 射频认证。名字带 WROOM 一般指这层。
- **开发板**：再加 USB-C、LDO、按键、排针、天线，插上就能用。**本文五款全在这一层**，没有模组裸件——同层比，价格和 GPIO 才有意义。

<svg viewBox="0 0 900 350" width="100%" style="height:auto" role="img" aria-label="芯片、模组、开发板三层结构，以及三款板子的名字分别落在哪一层">
  <title>图 1 · 三层结构与命名解码</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">同一个「ESP32-S3」名字，可能指三个完全不同的东西　·　本文样本：S3 系列 4 款 + C3 对照 1 款</text>
  <rect x="20" y="40" width="860" height="52" rx="8" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="38" y="62" font-size="13" font-weight="600" fill="var(--ink)">① 芯片 die</text>
  <text x="38" y="80" font-size="12" fill="var(--ink-2)">ESP32-S3FH4R2 / ESP32-S3R8 / ESP32-C3FN4 · QFN 封装 · Flash 与 PSRAM 可以封在芯片里</text>
  <text x="862" y="70" font-size="12" text-anchor="end" fill="var(--pen)">看不见，要画板</text>
  <rect x="20" y="102" width="860" height="52" rx="8" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="38" y="124" font-size="13" font-weight="600" fill="var(--ink)">② 模组</text>
  <text x="38" y="142" font-size="12" fill="var(--ink-2)">WROOM-1 = 芯片 + 板载 Flash + 晶振 + 屏蔽罩 + PCB 天线 + 射频认证</text>
  <text x="862" y="132" font-size="12" text-anchor="end" fill="var(--accent)">五款里没有一款是它</text>
  <rect x="20" y="164" width="860" height="52" rx="8" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="38" y="186" font-size="13" font-weight="600" fill="var(--ink)">③ 开发板</text>
  <text x="38" y="204" font-size="12" fill="var(--ink-2)">裸片或模组 + USB-C + LDO + 按键 + 排针 + 天线 = 插线就能用</text>
  <text x="862" y="194" font-size="12" text-anchor="end" fill="var(--green)">本文五款全在这一层</text>
  <line x1="20" y1="234" x2="880" y2="234" stroke="var(--line-2)" stroke-width="1"/>
  <text x="20" y="256" font-size="13" fill="var(--ink-2)">名字解码：后缀说的是「容量」，不是「型号等级」</text>
  <rect x="20" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="288" font-size="12" font-weight="600" fill="var(--ink)">ESP32-S3FH4R2</text>
  <text x="34" y="306" font-size="11" fill="var(--ink-2)">F=封装内 Flash · H=高温颗粒</text>
  <text x="34" y="322" font-size="11" fill="var(--ink-2)">4=4 MB Flash · R2=2 MB PSRAM</text>
  <rect x="312" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="326" y="288" font-size="12" font-weight="600" fill="var(--ink)">S3 N16R8 MINI</text>
  <text x="326" y="306" font-size="11" fill="var(--ink-2)">板上贴 ESP32-S3R8 裸片 + 16 MB Flash</text>
  <text x="326" y="322" font-size="11" fill="var(--ink-2)">N16 是板载 Flash，不是 WROOM 模组</text>
  <rect x="604" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="618" y="288" font-size="12" font-weight="600" fill="var(--ink)">XIAO S3 Plus</text>
  <text x="618" y="306" font-size="11" fill="var(--ink-2)">同颗 ESP32-S3R8 裸片 + 16 MB Flash</text>
  <text x="618" y="322" font-size="11" fill="var(--ink-2)">差价买的是体积 / 天线座 / 生态</text>
</svg>

> **图 1** · 同一个「ESP32-S3」可能指三个完全不同的东西；后缀说的是容量，不是型号等级。

**三种空间**别混：

- **Flash = 硬盘**。放固件、字库、网页资源，断电不丢。Quad SPI，标称最高 80 MHz。**它不是内存。**
- **PSRAM = 外接内存条**。放大数组、帧缓冲、TLS 和 JSON 缓冲，断电清空，比片上内存慢；Flash 擦写时还会短暂不可访问。
- **片上 SRAM = 随身口袋**。最快也最小。四款 S3 都是 **512 KB**（另有 384 KB ROM、16 KB RTC SRAM），C3 是 **400 KB**（其中 16 KB 作 cache）+ 384 KB ROM + 8 KB RTC SRAM。

所以商品页那句「内置 8 MB PSRAM & 8 MB Flash」，PSRAM 在芯片封装内，Flash 是另贴在板上的 Quad SPI 颗粒，**Flash 再大也不等于能 `malloc()` 的空间**。

参数页上最容易读错的三处：

| 常见写法 | 正确理解 | 怎么自己核对 |
|---|---|---|
| 「512 KB SRAM」写在 S3 板上 | S3 是 512 KB；ESP32-C3 是 400 KB | 看 CPU：Xtensa LX7 双核 240 MHz 才是 S3，RISC-V 单核 160 MHz 是 C3 |
| 「内置 8 MB Flash」 | 多数是板载，不在芯片封装内 | 查芯片完整料号，带 `F` 才是封装内 Flash |
| 「名字里有 WROOM 就是模组」 | 也可能只是容量代号的沿用 | 观察板上是否有带屏蔽罩的小模组；裸片方案直接看得见主芯片 |

## 02 后缀解码：九个代码就是 3×3

九个订购代码看着像九种东西，其实是一张 3×3 的表：

- **`N` = 板载 Flash**：`N4` 4 MB、`N8` 8 MB、`N16` 16 MB。颗粒贴在模组 PCB 上，走 Quad SPI，断电不丢。
- **`R` = 封在芯片里的 PSRAM**：`R2` 2 MB（Quad，4 线）、`R8` 8 MB（Octal，8 线）。没有 `R` 就是没有 PSRAM。
- 3 档 Flash × 3 档 PSRAM = 9 个型号。

比价时最容易看错的一点：`N8R8` 和 `N16R8` 的 PSRAM 一样大，差的只有 Flash。

<svg viewBox="0 0 900 406" width="100%" style="height:auto" role="img" aria-label="ESP32-S3-WROOM-1 的 N16R8 后缀拆解，以及 Flash 四八十六、PSRAM 无二八两轴组成的九个型号矩阵">
  <title>图 2 · 后缀拆解与九个型号的 3×3 矩阵</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">一个后缀只讲两件事：N 后面是 Flash 容量，R 后面是 PSRAM 容量；两轴各三档，组合出九个型号</text>
  <rect x="20" y="42" width="246" height="64" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">ESP32-S3-WROOM-1</text>
  <text x="34" y="84" font-size="11" fill="var(--ink-2)">模组系列本身：PCB 板载天线</text>
  <text x="34" y="100" font-size="11" fill="var(--ink-2)">带 U 的 1U 改 U.FL 天线座</text>
  <rect x="274" y="42" width="290" height="64" rx="7" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="288" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">N16　→　Flash 16 MB</text>
  <text x="288" y="84" font-size="11" fill="var(--ink-2)">板载 Quad SPI 颗粒，贴在模组 PCB 上</text>
  <text x="288" y="100" font-size="11" fill="var(--ink-2)">断电不丢，放固件与资源</text>
  <rect x="572" y="42" width="308" height="64" rx="7" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="586" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">R8　→　PSRAM 8 MB</text>
  <text x="586" y="84" font-size="11" fill="var(--ink-2)">封装在芯片内的 Octal PSRAM，8 线</text>
  <text x="586" y="100" font-size="11" fill="var(--ink-2)">断电清空，放帧缓冲与堆</text>
  <text x="20" y="136" font-size="11" fill="var(--ink-3)">行 = PSRAM 档　列 = Flash 档</text>
  <text x="276" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 4 MB</text>
  <text x="498" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 8 MB</text>
  <text x="720" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 16 MB</text>
  <rect x="20" y="166" width="5" height="20" rx="2" fill="var(--accent)"/>
  <text x="34" y="181" font-size="12.5" font-weight="600" fill="var(--ink)">无 PSRAM</text>
  <rect x="20" y="230" width="5" height="20" rx="2" fill="var(--pen)"/>
  <text x="34" y="245" font-size="12.5" font-weight="600" fill="var(--ink)">2 MB Quad</text>
  <rect x="20" y="294" width="5" height="20" rx="2" fill="var(--green)"/>
  <text x="34" y="309" font-size="12.5" font-weight="600" fill="var(--ink)">8 MB Octal</text>
  <rect x="170" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="276" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4</text>
  <text x="276" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">运行时 0.5 MB</text>
  <rect x="392" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="498" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8</text>
  <text x="498" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">运行时 0.5 MB</text>
  <rect x="614" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="720" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16</text>
  <text x="720" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">运行时 0.5 MB</text>
  <rect x="170" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="276" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R2</text>
  <text x="276" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">运行时 2.5 MB</text>
  <rect x="392" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="498" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R2</text>
  <text x="498" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">运行时 2.5 MB</text>
  <rect x="614" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="720" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R2</text>
  <text x="720" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">运行时 2.5 MB</text>
  <rect x="170" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="276" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R8</text>
  <text x="276" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">运行时 8.5 MB</text>
  <rect x="392" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="498" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R8</text>
  <text x="498" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">运行时 8.5 MB</text>
  <rect x="614" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="2.5"/>
  <text x="720" y="300" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R8</text>
  <text x="720" y="318" font-size="11" text-anchor="middle" fill="var(--ink-2)">运行时 8.5 MB</text>
  <rect x="760" y="284" width="44" height="18" rx="4" fill="var(--card)" stroke="var(--green)" stroke-width="1"/>
  <text x="782" y="297" font-size="10.5" text-anchor="middle" fill="var(--green)">基线</text>
  <text x="20" y="358" font-size="12" fill="var(--ink-2)">R8 三格：占用 GPIO33~37，环境温度上限 65 °C；其余六格：GPIO33~37 可用，上限 85 °C。</text>
  <text x="20" y="378" font-size="12" fill="var(--ink-2)">R8 只把 PSRAM 拉到 8 线，Flash 仍是 4 线 Quad SPI；Flash 也走 8 线的是 WROOM-2。</text>
  <text x="20" y="398" font-size="12" fill="var(--ink-3)">运行时内存 = 片上 SRAM 512 KB + PSRAM 容量；Flash 不计入内存。</text>
</svg>

> **图 2** · 九个型号就是这张表的九个格子，没有第十个；容量最大的那一格（`N16R8`）温度上限反而最低。

九格之外还有几种写法，分销页上常混着出现：

| 写法 | 与九个组合的关系 | Flash | PSRAM | 环境温度 |
|---|---|---|---|---|
| `-1U`（如 `1U-N16R8`） | 九格全部成立，只把 PCB 天线换成 U.FL 座 | 同左 | 同左 | 同左 |
| `H4` | 无 PSRAM 的高温料号 | 4 MB Quad | 无 | −40~105 °C |
| `N16R16VA` | 九格之外的超大容量，SPI 走 1.8 V | 16 MB Quad | 16 MB Octal | −40~65 °C |
| `WROOM-2` 的 `N16R8V` / `N32R8V` / `N32R16V` | 另一条产品线，Flash 也走 8 线 | 16 / 32 MB Octal | 8 / 16 MB Octal | −40~65 °C |

`1U` 和不带 `U` 只差天线：带 `U` 是 U.FL 座外接天线，18.0×19.2×3.2 mm；不带 `U` 是 PCB 板载天线，18.0×25.5×3.1 mm。要装机壳、天线引出去就选前者。容量表一样，但结构净空和整机认证的路子不同。

两个容易踩的点：

- **`R8` 只把 PSRAM 拉到 8 线，Flash 还是 4 线 Quad SPI。** 型号里的「Octal」说的是 PSRAM；Flash 也走 8 线的是 WROOM-2。
- **官方代码里没有 `N6`。** WROOM-1 的 Flash 只有 4 / 8 / 16 MB 三档。碰到表外后缀，拿完整料号去 datasheet 核，别按名字猜。

以 `N16R8` 为基线排一遍：

| 组合 | Flash | PSRAM | 与 `N16R8` 的差 | 运行时内存 | 环境温度上限 |
|---|---|---|---|---|---|
| `N16R8` | 16 MB | 8 MB Octal | 基线 | 8.5 MB | 65 °C |
| `N8R8` | 8 MB | 8 MB Octal | Flash 少 8 MB | 8.5 MB | 65 °C |
| `N4R8` | 4 MB | 8 MB Octal | Flash 少 12 MB | 8.5 MB | 65 °C |
| `N16R2` | 16 MB | 2 MB Quad | PSRAM 少 6 MB，8 线降为 4 线 | 2.5 MB | 85 °C |
| `N8R2` | 8 MB | 2 MB Quad | PSRAM 少 6 MB；Flash 少 8 MB | 2.5 MB | 85 °C |
| `N4R2` | 4 MB | 2 MB Quad | PSRAM 少 6 MB；Flash 少 12 MB | 2.5 MB | 85 °C |
| `N16` | 16 MB | 无 | PSRAM 少 8 MB | 0.5 MB | 85 °C |
| `N8` | 8 MB | 无 | PSRAM 少 8 MB；Flash 少 8 MB | 0.5 MB | 85 °C |
| `N4` | 4 MB | 无 | PSRAM 少 8 MB；Flash 少 12 MB | 0.5 MB | 85 °C |

三件事：

1. **PSRAM 是大跳。** 0 → 2 → 8 MB，运行时内存 0.5 / 2.5 / 8.5 MB。`N16` 到 `N16R2` 涨 5 倍，再到 `N16R8` 又涨 3.4 倍；Quad 换 Octal，数据线也从 4 根变 8 根。
2. **Flash 是等差。** 4 / 8 / 16 MB，对运行时内存一点影响都没有——换大只是多放固件、字库和网页资源。所以 `N16R2` 和 `N8R8` 不是谁更大，是一个多硬盘、一个多内存。
3. **容量和限制反着走。** R8 一行容量最大，温度上限反而最低（65 °C），还占掉 GPIO33~37；不带 PSRAM 的能到 85 °C，引脚也最全。想同时要 8 MB PSRAM 和 85 °C，这九个格子给不出来——要么退到 R2，要么给 R8 开 ECC（容量再减 1/16）。

五款板的容量正好落在表上：

- `S3 N16R8 MINI`、`XIAO S3 Plus` → 等同 `N16R8`
- `XIAO S3 / Sense` → 等同 `N8R8`
- `S3 SuperMini FH4R2` → 等同 `N4R2`，只是它的 Flash 也封在芯片里（料号里的 `F`），颗粒还是高温等级（`H`）
- `C3 SuperMini` → 不在表内：ESP32-C3 是另一条架构线，4 MB Flash、没有 PSRAM，芯片也不支持

## 03 容量全景

五款整板各取一格：`N16R8`、`N8R8`、`N4R2`，外加一个表外的 C3。S3 四款（Xtensa LX7 双核 240 MHz，带 FPU 和向量指令），C3 一款（RISC-V 单核 160 MHz，无 PSRAM，芯片也不支持）。后三款 S3 用的是同一颗 ESP32-S3R8，差别只在板载 Flash 是 8 MB 还是 16 MB。

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="五款开发板与 WROOM-1 九个模组组合的 Flash 与 PSRAM 总容量堆叠条形图，同一刻度，最大 24 MB">
  <title>图 3 · Flash + PSRAM 总容量：五款整板与九个模组组合（同一刻度，单位 MB）</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">蓝 = Flash（硬盘）　绿 = PSRAM（内存条）　橙 = 只有 Flash、没有 PSRAM</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">整板 · 本文五款</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="420" y1="48" x2="420" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="820" y1="48" x2="820" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="100" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="69" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="69" font-size="11.0" fill="var(--accent)">无 PSRAM</text>
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
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">模组组合 · WROOM-1 九种</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">同一刻度：四款 S3 整板与其中三个格子等长</text>
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
  <text x="629" y="481" font-size="10.5" fill="var(--accent)">无 PSRAM</text>
  <text x="206" y="511" font-size="11.5" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="200" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="320" y="511" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="429" y="511" font-size="10.5" fill="var(--accent)">无 PSRAM</text>
  <text x="206" y="541" font-size="11.5" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="100" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="541" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="541" font-size="10.5" fill="var(--accent)">无 PSRAM</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="420" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">16</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">24 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">两层条长逐一对得上：整板不额外加存储，容量上限由所选模组决定；C3 与 N16 / N8 / N4 都没有 PSRAM。</text>
</svg>

> **图 3** · 上半段五款整板、下半段九个模组组合，两组条长逐一对得上；总量最大差 6 倍，但蓝段是硬盘，不算内存。

「运行时内存」（片上 SRAM + PSRAM）才是写程序时真能分配的量，条长只由 PSRAM 决定：

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="五款开发板与九个模组组合的运行时可用内存条形图，0.4、0.5、2.5、8.5 MB 四级">
  <title>图 4 · 运行时真正能当内存用的空间：五款整板与九个模组组合</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">片上 SRAM + PSRAM；Flash 不算内存。橙 = 0.4~0.5 MB　蓝 = 2.5 MB　绿 = 8.5 MB</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">整板 · 本文五款</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="353" y1="48" x2="353" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="487" y1="48" x2="487" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="753" y1="48" x2="753" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="26.7" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="256" y="69" font-size="12.0" fill="var(--accent)">0.4 MB（仅片上 SRAM）</text>
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
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">模组组合 · WROOM-1 九种</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">同一刻度：0.5 / 2.5 / 8.5 MB 三级，与整板一一对应</text>
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
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">最大档约为最小档的 21 倍；多出来的 0.5 MB 来自片上 SRAM，所以 N4 / N8 / N16 与 C3 只差 0.1 MB。</text>
</svg>

> **图 4** · 真正能 `malloc()` 的是运行时内存：0.4 / 0.5 / 2.5 / 8.5 MB 四级，最大差约 21 倍；没有 `R` 的型号，条长只剩片上 SRAM 那一小截。

给个量级感受：320×240 的 RGB565 一帧约 150 KB，2 MB PSRAM 放约 13 帧，8 MB 约 53 帧；16 kHz / 16 bit 单声道音频 10 秒约 320 KB，2 MB 缓约 60 秒，8 MB 约 250 秒。「Flash 够大」替代不了「内存够用」。

| 维度 | S3 SuperMini FH4R2 | S3 N16R8 MINI | XIAO S3 / Sense | XIAO S3 Plus | C3 SuperMini |
|---|---|---|---|---|---|
| **所属系列** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-C3**（对照） |
| 主芯片 | ESP32-S3FH4R2 | ESP32-S3R8 | ESP32-S3R8 | ESP32-S3R8 | ESP32-C3FN4 |
| CPU | 双核 240 MHz | 双核 240 MHz | 双核 240 MHz | 双核 240 MHz | 单核 160 MHz |
| Flash | 4 MB（封装内） | 16 MB（板载） | 8 MB（板载） | 16 MB（板载） | 4 MB（封装内） |
| PSRAM | 2 MB Quad | 8 MB Octal | 8 MB Octal | 8 MB Octal | 无，芯片不支持 |
| 片上内存 | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 400 KB SRAM |
| 运行时内存 | 2.5 MB | 8.5 MB | 8.5 MB | 8.5 MB | 0.4 MB |
| 存储总量 | 6 MB | 24 MB | 16 MB | 24 MB | 4 MB |
| 可用 GPIO | 约 11 | 约 20 | 11（Sense 多 2） | 18 | 11 |
| 工作温度 | −40~85 °C | −40~65 °C | −20~65 °C | −20~65 °C | −40~85 °C |
| 约价 | 约 ¥22 | 约 ¥26 | 约 ¥54 | 约 ¥62 | 约 ¥12 |

四款 S3 的片上内存一模一样，差的只有 Flash 和 PSRAM。C3 是另一条架构线：没有 USB OTG、LCD / 摄像头接口和向量指令，也没法靠外挂 Flash 补出 PSRAM——放进来是为了说明架构差异，不是当替代品。

## 04 加上价格

> **价格口径**：**约 ¥12 / ¥22 / ¥26 / ¥54 / ¥62** 取自 2026-11 公开零售渠道，取整留了余量，盖住含税、运费、促销和套装的差异。不是官方定价也不是实时售价，只适合横向比量级；不同市场、不同时间能差到数倍，以当地实际售价为准。

<svg viewBox="0 0 900 320" width="100%" style="height:auto" role="img" aria-label="五款开发板约价横向条形图，从约 12 元到约 62 元">
  <title>图 5 · 约价与容量：同容量档的价差（同一刻度）</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">条长 = 约价，条内 = 该约价买到的总存储 / 运行时内存；本图不含品质维度</text>
  <rect x="220" y="38" width="600" height="242" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="391" y1="38" x2="391" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="563" y1="38" x2="563" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="734" y1="38" x2="734" y2="280" stroke="var(--line)" stroke-width="1"/>
  <text x="20" y="70" font-size="13" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="103" height="26" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="230" y="70" font-size="12" fill="var(--ink)">4 MB · 0.4 MB</text>
  <text x="331" y="70" font-size="12" fill="var(--accent)">约 ¥12</text>
  <text x="20" y="114" font-size="13" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="96" width="189" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="114" font-size="12" fill="var(--ink)">6 MB · 2.5 MB</text>
  <text x="417" y="114" font-size="12" fill="var(--pen)">约 ¥22</text>
  <text x="20" y="158" font-size="13" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="140" width="223" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="158" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="451" y="158" font-size="12" fill="var(--pen)">约 ¥26</text>
  <text x="20" y="202" font-size="13" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="184" width="463" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="202" font-size="12" fill="var(--ink)">16 MB · 8.5 MB</text>
  <text x="691" y="202" font-size="12" fill="var(--pen)">约 ¥54</text>
  <text x="20" y="246" font-size="13" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="228" width="531" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="246" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="759" y="246" font-size="12" fill="var(--pen)">约 ¥62</text>
  <text x="220" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="391" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">约 ¥20</text>
  <text x="563" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">约 ¥40</text>
  <text x="734" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">约 ¥60</text>
  <text x="20" y="316" font-size="12" fill="var(--ink-3)">约价区间 12~62，最大差约 5.2 倍；条长只反映价格，射频、一致性与资料都不在刻度上。</text>
</svg>

> **图 5** · 容量与配置完全相同的两款，约价相差约 ¥36；这个差值来自容量表之外，图上判断不出优劣。

最直观的一处：**约 ¥26 的 S3 N16R8 MINI 和约 ¥62 的 XIAO S3 Plus，Flash、PSRAM、运行时内存、固件配置全都一样**，价差约 ¥36（58%）；摊到内存上是约 ¥3.06 / MB 和约 ¥7.29 / MB。差出来的钱花在容量表以外。

另外三处：

1. **单价和绝对价常常相反**。C3 绝对价最低，但没 PSRAM，0.4 MB 摊下来约 ¥30 / MB，是 8 MB Octal 那档的十倍。C3 本来就是奔着低功耗和小体积去的。
2. **同系列内也有取舍**。约 ¥54 的 XIAO 标准版 / Sense 比 Plus 便宜约 ¥8，Flash 少一半、GPIO 少 7 个；但 Sense 带摄像头、麦克风和 SD 卡，标准版体积更小、有 U.FL 座。
3. **跨架构那一跳最大**。C3 → S3 SuperMini FH4R2 贵约 ¥10，运行时内存 0.4 → 2.5 MB（6.25 倍），同时换成双核 240 MHz、向量指令和 USB OTG。这不是升级，是换了架构。

<svg viewBox="0 0 900 420" width="100%" style="height:auto" role="img" aria-label="约价与运行时内存的分布散点图，仅呈现价格与内存两个维度，不含品质信息">
  <title>图 6 · 约价 × 运行时内存：两个维度的分布</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">本图只有两个维度：约价与运行时内存；射频表现、板卡一致性、扩展生态与长期维护都不在坐标轴上</text>
  <rect x="120" y="50" width="700" height="290" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="108" x2="820" y2="108" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="166" x2="820" y2="166" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="224" x2="820" y2="224" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="282" x2="820" y2="282" stroke="var(--line)" stroke-width="1"/>
  <line x1="320" y1="50" x2="320" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="520" y1="50" x2="520" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="720" y1="50" x2="720" y2="340" stroke="var(--line)" stroke-width="1"/>
  <rect x="132" y="60" width="178" height="42" rx="5" fill="var(--card)" stroke="var(--line-2)" stroke-width="1"/>
  <text x="144" y="78" font-size="11" fill="var(--ink)">本图只有价格与内存</text>
  <text x="144" y="94" font-size="11" fill="var(--ink)">不含品质维度</text>
  <circle cx="240" cy="328" r="5" fill="var(--accent)"/>
  <text x="252" y="332" font-size="12" fill="var(--accent)">C3 SuperMini 约 ¥12 · 0.4 MB</text>
  <circle cx="340" cy="268" r="5" fill="var(--pen)"/>
  <text x="352" y="272" font-size="12" fill="var(--pen)">S3 SuperMini FH4R2 约 ¥22 · 2.5 MB</text>
  <circle cx="380" cy="94" r="5" fill="var(--pen)"/>
  <text x="392" y="80" font-size="12" fill="var(--pen)">S3 N16R8 MINI 约 ¥26 · 8.5 MB</text>
  <circle cx="660" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="650" y="118" font-size="12" fill="var(--ink-2)">XIAO S3 / Sense 约 ¥54 · 8.5 MB</text>
  <circle cx="740" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="880" y="76" font-size="12" text-anchor="end" fill="var(--ink-2)">XIAO S3 Plus 约 ¥62 · 8.5 MB</text>
  <text x="120" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="320" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">约 ¥20</text>
  <text x="520" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">约 ¥40</text>
  <text x="720" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">约 ¥60</text>
  <text x="820" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">约 ¥70</text>
  <text x="112" y="54" font-size="12" text-anchor="end" fill="var(--ink-3)">10</text>
  <text x="112" y="112" font-size="12" text-anchor="end" fill="var(--ink-3)">8</text>
  <text x="112" y="170" font-size="12" text-anchor="end" fill="var(--ink-3)">6</text>
  <text x="112" y="228" font-size="12" text-anchor="end" fill="var(--ink-3)">4</text>
  <text x="112" y="286" font-size="12" text-anchor="end" fill="var(--ink-3)">2</text>
  <text x="112" y="344" font-size="12" text-anchor="end" fill="var(--ink-3)">0</text>
  <text x="20" y="400" font-size="12" fill="var(--ink-3)">↑ 运行时内存（MB）　→ 约价（¥）　三个 8.5 MB 的点在同一水平线上：约价差不来自存储容量。</text>
</svg>

> **图 6** · 三个点落在同一条 8.5 MB 水平线上：约价差异不来自存储容量。图上看不到的射频、品控与资料，往往才是差价的来源。

整理成表（最后一列只是容量单价）：

| 型号 | 约价 | 总存储 | 运行时内存 | 容量单价（约 ¥ / 运行时 MB） | 约价相对倍数 |
|---|---|---|---|---|---|
| C3 SuperMini | 约 ¥12 | 4 MB | 0.4 MB | 约 ¥30.00 | 1.00× |
| S3 SuperMini FH4R2 | 约 ¥22 | 6 MB | 2.5 MB | 约 ¥8.80 | 1.83× |
| S3 N16R8 MINI | 约 ¥26 | 24 MB | 8.5 MB | 约 ¥3.06 | 2.17× |
| XIAO S3 / Sense | 约 ¥54 | 16 MB | 8.5 MB | 约 ¥6.35 | 4.50× |
| XIAO S3 Plus | 约 ¥62 | 24 MB | 8.5 MB | 约 ¥7.29 | 5.17× |

### 差价买到了什么

**能横比的是价格，不是品质。** 同样一套 16 MB Flash + 8 MB Octal PSRAM，做成板子还能差在这几处：

- **射频和天线**：匹配、净空、调试决定 WiFi / BLE 的实际表现，有没有 U.FL 座又是另一回事。低成本板常见的吐槽就是信号偏弱、隔墙连不稳，参数表上看不出来，只能看设计、看认证、实测 RSSI。
- **品控**：电源与 USB 保护、焊接、板材、批次差异，影响长期稳定运行，以及调试时会不会撞上莫名其妙的问题。
- **资料和维护**：原理图、pinout、示例固件、社区问答、供货。XIAO 这类品牌板更贵，通常就贵在这里，不是 Flash 或 PSRAM 更贵。
- **合规**：裸片方案没有模组射频认证可依托，板级 RF 要单独确认。

「一分价钱一分货」大体成立，**但别反过来用**——贵不等于每项都好，品牌溢价、渠道加价、套装差异都在。白牌板跨市场能差到数倍，品牌板官方定价全球基本一致，比价得放回自己所在的市场重算。

顺序上更稳的做法：**先用容量、PSRAM 模式和固件配置筛出「能跑」的板，再按射频、稳定性、资料、供货比，最后才看价格。**

## 05 把容量翻译成配置

参数表上的容量不会自己变成能跑的固件。五个开关，买板之前都能算清楚：

1. **Flash size 对齐实物**。`CONFIG_ESPTOOLPY_FLASHSIZE_4MB / 8MB / 16MB`（或 Arduino 的 Flash Size）要和板上颗粒一致，写大了会在 OTA 或文件系统初始化时踩到不存在的地址。
2. **PSRAM 模式对齐接线**。封装内 2 MB Quad 用 `CONFIG_SPIRAM_MODE_QUAD`，8 MB Octal 用 `CONFIG_SPIRAM_MODE_OCT`；Arduino 里对应 `QSPI PSRAM` / `OPI PSRAM`。**这项选错不是跑得慢，是启动直接 abort**。
3. **分区表先做加法**。Flash 不等于固件可用空间：分区表、nvs、otadata、phy_init 先占掉一小块，剩下的在 app 和数据分区之间分。**双 OTA 要给下个版本留同样大的位置**，占用约 `app × 2 + 数据分区 + 固定开销`。带协议栈和图形库的固件常见 1~2 MB，双 OTA 一乘就接近 4 MB，再留 1 MB 放字库图片必然越界——这是 4 MB 板最容易翻车的地方。先按自己固件的实际体积加一遍，不够就上 16 MB，或者退回单 OTA。
4. **给 PSRAM 缓冲留预算**。帧缓冲、TLS 握手缓冲、JSON 和图片解码堆都走 PSRAM；按「峰值同时驻留的缓冲之和 × 1.3」估，再对照 2 MB / 8 MB 两档。DMA 缓冲、任务栈、静态变量默认不能放 PSRAM，要显式配置。
5. **跨架构换 target**。C3 是 RISC-V，S3 是 Xtensa，`CONFIG_IDF_TARGET`、工具链和 SDK 配置要整套换；`CONFIG_SPIRAM_*` 对 C3 全部无效，不用写。

一组常见的 16 MB + Octal 配置长这样：

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
```

| 容量档 | 该配的项 | 实际影响 |
|---|---|---|
| 16 MB Flash + 8 MB Octal | `FLASHSIZE_16MB` + `MODE_OCT` + `SPEED_80M` | 双 OTA 与数据分区都放得下，资源相对宽松 |
| 8 MB Flash + 8 MB Octal | 同上，Flash size 换成 `8MB` | 双 OTA 仍然成立，但留给数据分区的余量明显变小，字库与图片要算着放 |
| 4 MB Flash + 2 MB Quad | `FLASHSIZE_4MB` + `MODE_QUAD` + 4 MB 分区表 | 双 OTA 通常排不下，多为单 OTA；PSRAM 缓冲预算按 2 MB 重算 |
| 4 MB Flash、无 PSRAM（C3） | `IDF_TARGET=esp32c3` + 4 MB 分区表 | `SPIRAM_*` 全部不适用，内存预算只能按片上 SRAM 算 |

一句话收口：**选板前先算三笔账**——Flash 装不装得下固件和资源、PSRAM 放不放得下峰值缓冲、配置项对不对得上实物。三笔都过，这板才能用。

## 06 怎么选、避哪些坑

**先从程序需要什么反推容量，再在够得着的板子里挑**，别按价格或参数高低排座次：

| 程序对资源的实际要求 | 够用的最低档 | 为什么 |
|---|---|---|
| 彩色或灰度整屏刷新、多图层帧缓冲、本地字库与图片、音频流，或双 OTA 加文件系统 | 16 MB Flash + 8 MB Octal PSRAM | 8.5 MB 运行时内存能给帧缓冲与 TLS 各留一块，Flash 装得下两份 app 加一份资源区 |
| 单色屏整屏刷新、传感器聚合、单 OTA、少量 JSON | 4 MB Flash + 2 MB Quad PSRAM | 2.5 MB 运行时内存够跑，但字库与图片必须挑小的放 |
| 只做联网上报、无图形界面、功耗与体积优先 | 4 MB Flash、无 PSRAM（C3） | 0.4 MB 只够协议栈加小缓冲，换来低功耗与最小体积 |
| 需要摄像头 / 麦克风 / SD 卡，或受限于可穿戴尺寸 | 8 MB Flash 的 XIAO 标准版 / Sense | 主要约束在板级集成与引脚数量，不在容量 |

还有一项不在表里、但能直接否掉某些板子：**宽温**。8 MB Octal PSRAM 的温域是 −40~65 °C，要跑 85 °C 就得换封装内 Quad 的料号，或者开 ECC（可用容量减 1/16）。这条上 `S3 SuperMini FH4R2` 反而更宽。

避坑清单：

- 8 MB Octal PSRAM 会占用 **GPIO33~37**，资料里标「不可用于其他功能」的脚别复用。
- `FH4R2` 里的 `H` 只表示 Flash 颗粒是高温等级，**不代表整芯片能上 105 °C**，现行 datasheet 的温域是 −40~85 °C。
- 裸片方案没有模组射频认证可依赖，做产品时板级 RF 合规要单独确认；`ESP32-C3FN4` 在乐鑫官网已标 EOL，新设计选在产替代料号。
- 封装内 Flash + PSRAM 共用同一组 SPI 线，引脚已占满，**不能再外扩存储**；要自己配存储，得从没有合封的料号重新画板。
- 板载天线的实际表现不写在参数表里。连接不稳、隔墙掉线，先看天线净空和有没有 U.FL 座，再实测 RSSI——部分低成本板卡这类反馈挺常见，别一上来就当固件 bug 反复排查。

### 价格之外的成本

零售约价只是硬件的起点。从一块能点亮的板子到一个能长期稳定工作的产品，中间还有四类成本，都跟「几 MB Flash、几 MB PSRAM」无关：**硬件工程**（结构散热、供电与电池、天线调校、整机 EMC）、**软件工程**（驱动适配、休眠唤醒、异常恢复、升级回滚、长期兼容）、**合规认证**（整机 EMC / RF、市场准入）、**量产售后**（良率、批次一致性、返修备件）。

量级随产品形态差得极远，也从来不写进商品页。所以本文比的是**选板时的硬件参数**，不是成品的成本结构：看懂参数能帮你别买错板，板子到手之后还要投什么，由项目本身决定。

---

**数据来源与口径**：乐鑫《ESP32-S3 Series Datasheet v2.2》表 1-1 / 2-14 / 5-11 / 5-12、《ESP32-C3 Series Datasheet》、《ESP32-S3-WROOM-1 & 1U 技术规格书》表 1-1 / 1-2（九个订购代码、Flash 与 PSRAM 类型、温域、模组尺寸）、《ESP32-S3-WROOM-2 技术规格书》（1.8 V SPI 与 32 MB Flash 档位）、Seeed Studio XIAO ESP32-S3 系列官方 wiki 与产品规格书、S3 N16R8 MINI 开发板厂商公开资料、ESP-IDF《Support for External RAM》与 Arduino-ESP32 板型配置文档。容量为标称值，实际可 `malloc()` 的堆会略少；PSRAM 带宽、温域与 GPIO 占用以对应料号的最新 datasheet 为准。文中价格为 2026-11 公开零售渠道的**大约价格**，口径见第 04 节，不构成品质评价或购买建议。
