---
title: "Before You Buy: ESP32-S3 Suffixes, Flash, PSRAM and Ballpark Prices in CNY (with a C3 Comparison)"
domain: hardware
platforms: ["cross-platform"]
format: "cheatsheet"
date: 2026-11-10
intro: "Suffixes like N4, N8R2 and N16R8 say exactly two things: the number after N is Flash, the number after R is PSRAM. This guide puts five common boards' capacities and ballpark prices (in Chinese yuan) on one table, and explains how to choose."
tags: ["ESP32-S3", "ESP32-C3", "PSRAM", "Flash", "dev board selection", "ESP-IDF"]
relatedBoards: ["esp32s3"]
image: "https://img.lingflux.com/2026/11/bf80e841c5e9fb342ebc387e1e68edf8.jpg"
---

> Cheat sheet. All five are ready-to-use boards with a USB-C plug. Capacities are nominal; prices are ballpark figures in Chinese yuan (CNY), only good for comparing orders of magnitude.

## 00 Three things to remember first

1. **The suffix only describes capacity.** `N16R8` = 16 MB Flash + 8 MB PSRAM. `N` is Flash, `R` is PSRAM, the numbers are MB. It has nothing to do with "generation" or "trim level".
2. **Flash is not RAM.** Flash is the disk: it survives power loss and holds firmware and resources. The only things you can `malloc()` from are on-chip SRAM (512 KB on the S3) plus PSRAM. So no amount of Flash can save you from "no PSRAM".
3. **Same capacity ≠ same price.** Two boards at roughly ¥26 and ¥62 have identical Flash and PSRAM; the difference pays for RF design, quality control and documentation (section 04).

The five boards here: **four ESP32-S3** — S3 SuperMini FH4R2, S3 N16R8 MINI, XIAO S3 / Sense, XIAO S3 Plus; **one ESP32-C3** — C3 SuperMini, a cross-architecture control, not a same-tier substitute. The `S3` / `C3` in front of a model name tells you which chip family it belongs to — don't confuse it with the capacity suffix that follows.

## 01 Three layers, three kinds of space

An "ESP32-S3" can mean three different things:

- **Chip**: ESP32-S3FH4R2, ESP32-S3R8, ESP32-C3FN4 — bare QFN dies; Flash and PSRAM can be packaged inside. Once you have one you still need to design your own PCB, RF matching and antenna.
- **Module**: like WROOM-1 — chip + on-module Flash + crystal + shield can + PCB antenna + RF certification. A name containing WROOM usually means this layer.
- **Dev board**: adds USB-C, LDO, buttons, pin headers and an antenna — plug in and go. **All five boards in this article live at this layer**, no bare modules — only same-layer comparisons make price and GPIO counts meaningful.

<svg viewBox="0 0 900 350" width="100%" style="height:auto" role="img" aria-label="The three layers — chip, module, dev board — and which layer three example board names fall on">
  <title>Figure 1 · Three layers and how to decode the names</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">One "ESP32-S3" name can mean three very different things · Samples in this article: 4 S3 boards + 1 C3 control</text>
  <rect x="20" y="40" width="860" height="52" rx="8" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="38" y="62" font-size="13" font-weight="600" fill="var(--ink)">① Chip (die)</text>
  <text x="38" y="80" font-size="12" fill="var(--ink-2)">ESP32-S3FH4R2 / ESP32-S3R8 / ESP32-C3FN4 · QFN package · Flash and PSRAM can be inside the chip</text>
  <text x="862" y="70" font-size="12" text-anchor="end" fill="var(--pen)">Invisible; needs a PCB</text>
  <rect x="20" y="102" width="860" height="52" rx="8" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="38" y="124" font-size="13" font-weight="600" fill="var(--ink)">② Module</text>
  <text x="38" y="142" font-size="12" fill="var(--ink-2)">WROOM-1 = chip + on-module Flash + crystal + shield can + PCB antenna + RF certification</text>
  <text x="862" y="132" font-size="12" text-anchor="end" fill="var(--accent)">None of the five is one</text>
  <rect x="20" y="164" width="860" height="52" rx="8" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="38" y="186" font-size="13" font-weight="600" fill="var(--ink)">③ Dev board</text>
  <text x="38" y="204" font-size="12" fill="var(--ink-2)">Bare die or module + USB-C + LDO + buttons + headers + antenna = plug in and go</text>
  <text x="862" y="194" font-size="12" text-anchor="end" fill="var(--green)">All five boards are here</text>
  <line x1="20" y1="234" x2="880" y2="234" stroke="var(--line-2)" stroke-width="1"/>
  <text x="20" y="256" font-size="13" fill="var(--ink-2)">Name decoding: the suffix means "capacity", not "model tier"</text>
  <rect x="20" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="288" font-size="12" font-weight="600" fill="var(--ink)">ESP32-S3FH4R2</text>
  <text x="34" y="306" font-size="11" fill="var(--ink-2)">F=in-package Flash · H=high-temp die</text>
  <text x="34" y="322" font-size="11" fill="var(--ink-2)">4=4 MB Flash · R2=2 MB PSRAM</text>
  <rect x="312" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="326" y="288" font-size="12" font-weight="600" fill="var(--ink)">S3 N16R8 MINI</text>
  <text x="326" y="306" font-size="11" fill="var(--ink-2)">ESP32-S3R8 bare die + 16 MB Flash onboard</text>
  <text x="326" y="322" font-size="11" fill="var(--ink-2)">N16 is onboard Flash, not a WROOM module</text>
  <rect x="604" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="618" y="288" font-size="12" font-weight="600" fill="var(--ink)">XIAO S3 Plus</text>
  <text x="618" y="306" font-size="11" fill="var(--ink-2)">Same ESP32-S3R8 die + 16 MB Flash</text>
  <text x="618" y="322" font-size="11" fill="var(--ink-2)">The premium buys size / antenna / ecosystem</text>
</svg>

> **Figure 1** · One "ESP32-S3" can mean three very different things; the suffix describes capacity, not model tier.

Don't mix up the **three kinds of space**:

- **Flash = the disk.** Holds firmware, font libraries and web assets; survives power loss. Quad SPI, rated up to 80 MHz. **It is not RAM.**
- **PSRAM = the plug-in memory stick.** Holds big arrays, framebuffers, TLS and JSON buffers; cleared on power loss, slower than on-chip RAM; and briefly inaccessible while Flash is being erased/written.
- **On-chip SRAM = your pocket.** Fastest and smallest. All four S3 boards have **512 KB** (plus 384 KB ROM and 16 KB RTC SRAM); the C3 has **400 KB** (16 KB of which serves as cache) + 384 KB ROM + 8 KB RTC SRAM.

So when a product page says "built-in 8 MB PSRAM & 8 MB Flash": the PSRAM is inside the chip package, while the Flash is a separate Quad SPI die soldered onto the board. **No matter how big the Flash is, it is not space you can `malloc()`.**

The three most commonly misread items on a spec page:

| Common wording | Correct reading | How to verify yourself |
|---|---|---|
| "512 KB SRAM" printed on an S3 board | S3 has 512 KB; ESP32-C3 has 400 KB | Check the CPU: Xtensa LX7 dual-core 240 MHz is S3; RISC-V single-core 160 MHz is C3 |
| "Built-in 8 MB Flash" | Usually onboard, not inside the chip package | Look up the full part number; only an `F` means in-package Flash |
| "WROOM in the name means it's a module" | It may just be a reused capacity code | Check whether there is a shielded module can on the board; bare-die designs expose the main chip |

## 02 Decoding the suffix: nine codes form a 3×3 grid

Nine ordering codes look like nine different things, but they're really a 3×3 table:

- **`N` = onboard Flash**: `N4` 4 MB, `N8` 8 MB, `N16` 16 MB. The die sits on the module PCB over Quad SPI and survives power loss.
- **`R` = PSRAM packaged inside the chip**: `R2` 2 MB (Quad, 4 wires), `R8` 8 MB (Octal, 8 wires). No `R` means no PSRAM.
- 3 Flash tiers × 3 PSRAM tiers = 9 models.

The easiest mistake when comparing prices: `N8R8` and `N16R8` have the same amount of PSRAM; only the Flash differs.

<svg viewBox="0 0 900 406" width="100%" style="height:auto" role="img" aria-label="Breaking down the ESP32-S3-WROOM-1 N16R8 suffix, and the nine-model matrix formed by Flash tiers 4/8/16 and PSRAM tiers none/2/8">
  <title>Figure 2 · Suffix breakdown and the 3×3 matrix of nine models</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">A suffix says only two things: the number after N is Flash, the number after R is PSRAM; three tiers on each axis make nine models</text>
  <rect x="20" y="42" width="246" height="64" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">ESP32-S3-WROOM-1</text>
  <text x="34" y="84" font-size="11" fill="var(--ink-2)">The module series itself: PCB antenna</text>
  <text x="34" y="100" font-size="11" fill="var(--ink-2)">The U variant (1U) swaps in a U.FL connector</text>
  <rect x="274" y="42" width="290" height="64" rx="7" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="288" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">N16　→　Flash 16 MB</text>
  <text x="288" y="84" font-size="11" fill="var(--ink-2)">Onboard Quad SPI die on the module PCB</text>
  <text x="288" y="100" font-size="11" fill="var(--ink-2)">Survives power loss; holds firmware &amp; assets</text>
  <rect x="572" y="42" width="308" height="64" rx="7" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="586" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">R8　→　PSRAM 8 MB</text>
  <text x="586" y="84" font-size="11" fill="var(--ink-2)">Octal PSRAM inside the chip package, 8 wires</text>
  <text x="586" y="100" font-size="11" fill="var(--ink-2)">Cleared on power loss; framebuffers &amp; heap</text>
  <text x="20" y="136" font-size="11" fill="var(--ink-3)">Rows = PSRAM tier　Columns = Flash tier</text>
  <text x="276" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 4 MB</text>
  <text x="498" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 8 MB</text>
  <text x="720" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 16 MB</text>
  <rect x="20" y="166" width="5" height="20" rx="2" fill="var(--accent)"/>
  <text x="34" y="181" font-size="12.5" font-weight="600" fill="var(--ink)">No PSRAM</text>
  <rect x="20" y="230" width="5" height="20" rx="2" fill="var(--pen)"/>
  <text x="34" y="245" font-size="12.5" font-weight="600" fill="var(--ink)">2 MB Quad</text>
  <rect x="20" y="294" width="5" height="20" rx="2" fill="var(--green)"/>
  <text x="34" y="309" font-size="12.5" font-weight="600" fill="var(--ink)">8 MB Octal</text>
  <rect x="170" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="276" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4</text>
  <text x="276" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0.5 MB runtime</text>
  <rect x="392" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="498" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8</text>
  <text x="498" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0.5 MB runtime</text>
  <rect x="614" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="720" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16</text>
  <text x="720" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0.5 MB runtime</text>
  <rect x="170" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="276" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R2</text>
  <text x="276" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2.5 MB runtime</text>
  <rect x="392" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="498" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R2</text>
  <text x="498" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2.5 MB runtime</text>
  <rect x="614" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="720" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R2</text>
  <text x="720" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2.5 MB runtime</text>
  <rect x="170" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="276" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R8</text>
  <text x="276" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8.5 MB runtime</text>
  <rect x="392" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="498" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R8</text>
  <text x="498" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8.5 MB runtime</text>
  <rect x="614" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="2.5"/>
  <text x="720" y="300" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R8</text>
  <text x="720" y="318" font-size="11" text-anchor="middle" fill="var(--ink-2)">8.5 MB runtime</text>
  <rect x="760" y="284" width="44" height="18" rx="4" fill="var(--card)" stroke="var(--green)" stroke-width="1"/>
  <text x="782" y="297" font-size="10.5" text-anchor="middle" fill="var(--green)">baseline</text>
  <text x="20" y="358" font-size="12" fill="var(--ink-2)">R8 row: occupies GPIO33~37, ambient limit 65 °C; the other six cells: GPIO33~37 usable, limit 85 °C.</text>
  <text x="20" y="378" font-size="12" fill="var(--ink-2)">R8 only takes PSRAM to 8 wires; Flash stays 4-wire Quad SPI. 8-wire Flash is WROOM-2 territory.</text>
  <text x="20" y="398" font-size="12" fill="var(--ink-3)">Runtime memory = on-chip SRAM 512 KB + PSRAM capacity; Flash does not count as memory.</text>
</svg>

> **Figure 2** · The nine models are exactly these nine cells — there is no tenth; the biggest-capacity cell (`N16R8`) ironically has the lowest temperature limit.

Beyond the nine cells, distributor pages often mix in a few more variants:

| Variant | Relation to the nine combos | Flash | PSRAM | Ambient temp |
|---|---|---|---|---|
| `-1U` (e.g. `1U-N16R8`) | All nine cells hold; only the PCB antenna is swapped for a U.FL connector | same | same | same |
| `H4` | High-temperature part with no PSRAM | 4 MB Quad | none | −40~105 °C |
| `N16R16VA` | Extra-large capacity outside the grid, SPI at 1.8 V | 16 MB Quad | 16 MB Octal | −40~65 °C |
| WROOM-2 `N16R8V` / `N32R8V` / `N32R16V` | A different product line; Flash also runs 8-wire | 16 / 32 MB Octal | 8 / 16 MB Octal | −40~65 °C |

`1U` differs from the non-`U` version only in the antenna: with `U` you get a U.FL connector for an external antenna at 18.0×19.2×3.2 mm; without `U` you get a PCB onboard antenna at 18.0×25.5×3.1 mm. If you need to enclose the unit and route the antenna out, pick the former. The capacity table is the same, but the keep-out requirements and the whole-unit certification path differ.

Two easy traps:

- **`R8` only takes PSRAM to 8 wires; Flash is still 4-wire Quad SPI.** The "Octal" in the part name refers to PSRAM; 8-wire Flash belongs to WROOM-2.
- **There is no `N6` in the official codes.** WROOM-1 Flash only comes in 4 / 8 / 16 MB. If you meet an off-table suffix, verify against the full part number in the datasheet — don't guess from the name.

Ranking everything against the `N16R8` baseline:

| Combo | Flash | PSRAM | Difference vs `N16R8` | Runtime memory | Ambient temp limit |
|---|---|---|---|---|---|
| `N16R8` | 16 MB | 8 MB Octal | baseline | 8.5 MB | 65 °C |
| `N8R8` | 8 MB | 8 MB Octal | 8 MB less Flash | 8.5 MB | 65 °C |
| `N4R8` | 4 MB | 8 MB Octal | 12 MB less Flash | 8.5 MB | 65 °C |
| `N16R2` | 16 MB | 2 MB Quad | 6 MB less PSRAM, 8-wire down to 4-wire | 2.5 MB | 85 °C |
| `N8R2` | 8 MB | 2 MB Quad | 6 MB less PSRAM; 8 MB less Flash | 2.5 MB | 85 °C |
| `N4R2` | 4 MB | 2 MB Quad | 6 MB less PSRAM; 12 MB less Flash | 2.5 MB | 85 °C |
| `N16` | 16 MB | none | 8 MB less PSRAM | 0.5 MB | 85 °C |
| `N8` | 8 MB | none | 8 MB less PSRAM; 8 MB less Flash | 0.5 MB | 85 °C |
| `N4` | 4 MB | none | 8 MB less PSRAM; 12 MB less Flash | 0.5 MB | 85 °C |

Three takeaways:

1. **PSRAM is the big jump.** 0 → 2 → 8 MB means runtime memory of 0.5 / 2.5 / 8.5 MB. `N16` to `N16R2` is a 5× increase, and `N16R2` to `N16R8` another 3.4×; going Quad to Octal also takes the data lines from 4 to 8.
2. **Flash grows in equal steps.** 4 / 8 / 16 MB, with zero effect on runtime memory — bigger Flash just means more room for firmware, fonts and web assets. So `N16R2` vs `N8R8` isn't about which is "bigger"; one has more disk, the other more memory.
3. **Capacity and limits move in opposite directions.** The R8 row has the most capacity yet the lowest temperature limit (65 °C), and it eats GPIO33~37; parts without PSRAM reach 85 °C with the fullest pinout. If you want both 8 MB PSRAM and 85 °C, these nine cells can't give it — either drop to R2, or enable ECC on R8 (losing another 1/16 of capacity).

The five boards map neatly onto the table:

- `S3 N16R8 MINI`, `XIAO S3 Plus` → equivalent to `N16R8`
- `XIAO S3 / Sense` → equivalent to `N8R8`
- `S3 SuperMini FH4R2` → equivalent to `N4R2`, except its Flash is also inside the chip package (the `F` in the part number), and the die is high-temperature grade (the `H`)
- `C3 SuperMini` → off the table: ESP32-C3 is a different architecture line with 4 MB Flash and no PSRAM — the chip doesn't support it at all

## 03 Capacity panorama

Each of the five boards takes one cell: `N16R8`, `N8R8`, `N4R2`, plus the off-table C3. The four S3 boards (Xtensa LX7 dual-core 240 MHz, with FPU and vector instructions); the one C3 (RISC-V single-core 160 MHz, no PSRAM, and the chip doesn't support it). The last three S3 boards all use the same ESP32-S3R8 die — they differ only in whether the onboard Flash is 8 MB or 16 MB.

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Stacked bar chart of total Flash plus PSRAM capacity for the five dev boards and the nine WROOM-1 module combos, on one scale up to 24 MB">
  <title>Figure 3 · Flash + PSRAM totals: five boards vs nine module combos (same scale, MB)</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">Blue = Flash (disk)　Green = PSRAM (memory stick)　Orange = Flash only, no PSRAM</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Boards · the five in this article</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="420" y1="48" x2="420" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="820" y1="48" x2="820" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="100" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="69" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="69" font-size="11.0" fill="var(--accent)">No PSRAM</text>
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
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Module combos · nine WROOM-1 variants</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Same scale: the four S3 boards match three cells exactly</text>
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
  <text x="629" y="481" font-size="10.5" fill="var(--accent)">No PSRAM</text>
  <text x="206" y="511" font-size="11.5" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="200" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="320" y="511" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="429" y="511" font-size="10.5" fill="var(--accent)">No PSRAM</text>
  <text x="206" y="541" font-size="11.5" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="100" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="541" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="541" font-size="10.5" fill="var(--accent)">No PSRAM</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="420" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">16</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">24 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">Bar lengths line up one to one: boards add no extra storage — the module they use sets the ceiling; the C3 and N16 / N8 / N4 all have no PSRAM.</text>
</svg>

> **Figure 3** · Top half: the five boards; bottom half: the nine module combos — bar lengths line up one to one. Totals differ up to 6×, but the blue segment is disk, not memory.

"Runtime memory" (on-chip SRAM + PSRAM) is what your program can actually allocate, and the bar length is set by PSRAM alone:

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Bar chart of usable runtime memory for the five dev boards and the nine module combos: four levels of 0.4, 0.5, 2.5 and 8.5 MB">
  <title>Figure 4 · Space actually usable as memory at runtime: five boards and nine module combos</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">On-chip SRAM + PSRAM; Flash does not count. Orange = 0.4~0.5 MB　Blue = 2.5 MB　Green = 8.5 MB</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Boards · the five in this article</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="353" y1="48" x2="353" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="487" y1="48" x2="487" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="753" y1="48" x2="753" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="26.7" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="256" y="69" font-size="12.0" fill="var(--accent)">0.4 MB (on-chip SRAM only)</text>
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
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Module combos · nine WROOM-1 variants</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Same scale: 0.5 / 2.5 / 8.5 MB tiers, matching the boards one to one</text>
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
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">The top tier is about 21× the bottom one; the extra 0.5 MB comes from on-chip SRAM, so N4 / N8 / N16 differ from the C3 by only 0.1 MB.</text>
</svg>

> **Figure 4** · What you can actually `malloc()` is runtime memory: four tiers — 0.4 / 0.5 / 2.5 / 8.5 MB — up to ~21× apart. Models without an `R` shrink to that tiny slice of on-chip SRAM.

A sense of scale: one 320×240 RGB565 frame is about 150 KB — 2 MB PSRAM holds ~13 frames, 8 MB holds ~53. Ten seconds of 16 kHz / 16-bit mono audio is about 320 KB — 2 MB buffers ~60 s, 8 MB buffers ~250 s. "Big enough Flash" can never replace "enough memory".

| Dimension | S3 SuperMini FH4R2 | S3 N16R8 MINI | XIAO S3 / Sense | XIAO S3 Plus | C3 SuperMini |
|---|---|---|---|---|---|
| **Series** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-C3** (control) |
| Main chip | ESP32-S3FH4R2 | ESP32-S3R8 | ESP32-S3R8 | ESP32-S3R8 | ESP32-C3FN4 |
| CPU | dual-core 240 MHz | dual-core 240 MHz | dual-core 240 MHz | dual-core 240 MHz | single-core 160 MHz |
| Flash | 4 MB (in-package) | 16 MB (onboard) | 8 MB (onboard) | 16 MB (onboard) | 4 MB (in-package) |
| PSRAM | 2 MB Quad | 8 MB Octal | 8 MB Octal | 8 MB Octal | none; not supported |
| On-chip RAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 400 KB SRAM |
| Runtime memory | 2.5 MB | 8.5 MB | 8.5 MB | 8.5 MB | 0.4 MB |
| Total storage | 6 MB | 24 MB | 16 MB | 24 MB | 4 MB |
| Usable GPIO | ~11 | ~20 | 11 (Sense +2) | 18 | 11 |
| Operating temp | −40~85 °C | −40~65 °C | −20~65 °C | −20~65 °C | −40~85 °C |
| Ballpark price | ~¥22 | ~¥26 | ~¥54 | ~¥62 | ~¥12 |

All four S3 boards have identical on-chip RAM; only Flash and PSRAM differ. The C3 is another architecture line entirely: no USB OTG, no LCD/camera interface, no vector instructions — and no way to add PSRAM by hanging more Flash off the chip. It's included to show the architectural contrast, not as a substitute.

## 04 Adding prices

> **Price basis**: **~¥12 / ¥22 / ¥26 / ¥54 / ¥62** (Chinese yuan) come from public retail channels as of 2026-11, rounded with margin to cover tax, shipping, promotions and bundle differences. They are neither official pricing nor live quotes — only good for comparing orders of magnitude. Different markets and different times can differ severalfold; always check your local actual price.

<svg viewBox="0 0 900 320" width="100%" style="height:auto" role="img" aria-label="Horizontal bar chart of ballpark prices for the five dev boards, from about ¥12 to about ¥62">
  <title>Figure 5 · Ballpark price vs capacity: price gaps within the same capacity tier (same scale)</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Bar length = ballpark price; inside the bar = total storage / runtime memory that price buys; quality is not in this chart</text>
  <rect x="220" y="38" width="600" height="242" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="391" y1="38" x2="391" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="563" y1="38" x2="563" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="734" y1="38" x2="734" y2="280" stroke="var(--line)" stroke-width="1"/>
  <text x="20" y="70" font-size="13" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="103" height="26" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="230" y="70" font-size="12" fill="var(--ink)">4 MB · 0.4 MB</text>
  <text x="331" y="70" font-size="12" fill="var(--accent)">~¥12</text>
  <text x="20" y="114" font-size="13" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="96" width="189" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="114" font-size="12" fill="var(--ink)">6 MB · 2.5 MB</text>
  <text x="417" y="114" font-size="12" fill="var(--pen)">~¥22</text>
  <text x="20" y="158" font-size="13" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="140" width="223" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="158" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="451" y="158" font-size="12" fill="var(--pen)">~¥26</text>
  <text x="20" y="202" font-size="13" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="184" width="463" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="202" font-size="12" fill="var(--ink)">16 MB · 8.5 MB</text>
  <text x="691" y="202" font-size="12" fill="var(--pen)">~¥54</text>
  <text x="20" y="246" font-size="13" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="228" width="531" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="246" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="759" y="246" font-size="12" fill="var(--pen)">~¥62</text>
  <text x="220" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="391" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥20</text>
  <text x="563" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥40</text>
  <text x="734" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥60</text>
  <text x="20" y="316" font-size="12" fill="var(--ink-3)">Ballpark range ¥12~62, a ~5.2× spread; bar length reflects price only — RF, consistency and documentation are not on the scale.</text>
</svg>

> **Figure 5** · Two boards with identical capacity and configuration differ by about ¥36; that gap comes from outside the capacity table, and the chart can't tell you which is better.

The most striking case: **the ~¥26 S3 N16R8 MINI and the ~¥62 XIAO S3 Plus have identical Flash, PSRAM, runtime memory and firmware configuration**, yet differ by ~¥36 (58%). Per unit of runtime memory that's ~¥3.06/MB vs ~¥7.29/MB. The extra money buys things outside the capacity table.

Three more observations:

1. **Unit price and absolute price often point in opposite directions.** The C3 is cheapest in absolute terms, but with no PSRAM its 0.4 MB works out to ~¥30/MB — ten times the 8 MB Octal tier. The C3 is built for low power and tiny size in the first place.
2. **Trade-offs exist within a series too.** The ~¥54 XIAO standard / Sense is ~¥8 cheaper than the Plus, with half the Flash and 7 fewer GPIOs; but the Sense adds a camera, microphone and SD card, while the standard version is smaller and has a U.FL connector.
3. **The cross-architecture jump is the biggest.** C3 → S3 SuperMini FH4R2 costs ~¥10 more and takes runtime memory from 0.4 to 2.5 MB (6.25×), while switching to a dual-core 240 MHz chip with vector instructions and USB OTG. That's not an upgrade — it's a different architecture.

<svg viewBox="0 0 900 420" width="100%" style="height:auto" role="img" aria-label="Scatter plot of ballpark price versus runtime memory, showing only the two dimensions of price and memory, no quality information">
  <title>Figure 6 · Ballpark price × runtime memory: distribution across two dimensions</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Only two dimensions here: ballpark price and runtime memory; RF performance, board consistency, ecosystem and long-term maintenance are not on the axes</text>
  <rect x="120" y="50" width="700" height="290" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="108" x2="820" y2="108" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="166" x2="820" y2="166" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="224" x2="820" y2="224" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="282" x2="820" y2="282" stroke="var(--line)" stroke-width="1"/>
  <line x1="320" y1="50" x2="320" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="520" y1="50" x2="520" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="720" y1="50" x2="720" y2="340" stroke="var(--line)" stroke-width="1"/>
  <rect x="132" y="60" width="178" height="42" rx="5" fill="var(--card)" stroke="var(--line-2)" stroke-width="1"/>
  <text x="144" y="78" font-size="11" fill="var(--ink)">Price and memory only</text>
  <text x="144" y="94" font-size="11" fill="var(--ink)">no quality dimension</text>
  <circle cx="240" cy="328" r="5" fill="var(--accent)"/>
  <text x="252" y="332" font-size="12" fill="var(--accent)">C3 SuperMini ~¥12 · 0.4 MB</text>
  <circle cx="340" cy="268" r="5" fill="var(--pen)"/>
  <text x="352" y="272" font-size="12" fill="var(--pen)">S3 SuperMini FH4R2 ~¥22 · 2.5 MB</text>
  <circle cx="380" cy="94" r="5" fill="var(--pen)"/>
  <text x="392" y="80" font-size="12" fill="var(--pen)">S3 N16R8 MINI ~¥26 · 8.5 MB</text>
  <circle cx="660" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="650" y="118" font-size="12" fill="var(--ink-2)">XIAO S3 / Sense ~¥54 · 8.5 MB</text>
  <circle cx="740" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="880" y="76" font-size="12" text-anchor="end" fill="var(--ink-2)">XIAO S3 Plus ~¥62 · 8.5 MB</text>
  <text x="120" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="320" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥20</text>
  <text x="520" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥40</text>
  <text x="720" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥60</text>
  <text x="820" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥70</text>
  <text x="112" y="54" font-size="12" text-anchor="end" fill="var(--ink-3)">10</text>
  <text x="112" y="112" font-size="12" text-anchor="end" fill="var(--ink-3)">8</text>
  <text x="112" y="170" font-size="12" text-anchor="end" fill="var(--ink-3)">6</text>
  <text x="112" y="228" font-size="12" text-anchor="end" fill="var(--ink-3)">4</text>
  <text x="112" y="286" font-size="12" text-anchor="end" fill="var(--ink-3)">2</text>
  <text x="112" y="344" font-size="12" text-anchor="end" fill="var(--ink-3)">0</text>
  <text x="20" y="400" font-size="12" fill="var(--ink-3)">↑ Runtime memory (MB)　→ Ballpark price (¥)　The three 8.5 MB points sit on the same horizontal line: the price gap does not come from storage capacity.</text>
</svg>

> **Figure 6** · Three points on the same 8.5 MB line: price differences don't come from storage. What's invisible on the chart — RF, QC and documentation — is often what the premium pays for.

As a table (the last column is just price per unit of capacity):

| Model | Ballpark price | Total storage | Runtime memory | Price per capacity (~¥ / runtime MB) | Relative price |
|---|---|---|---|---|---|
| C3 SuperMini | ~¥12 | 4 MB | 0.4 MB | ~¥30.00 | 1.00× |
| S3 SuperMini FH4R2 | ~¥22 | 6 MB | 2.5 MB | ~¥8.80 | 1.83× |
| S3 N16R8 MINI | ~¥26 | 24 MB | 8.5 MB | ~¥3.06 | 2.17× |
| XIAO S3 / Sense | ~¥54 | 16 MB | 8.5 MB | ~¥6.35 | 4.50× |
| XIAO S3 Plus | ~¥62 | 24 MB | 8.5 MB | ~¥7.29 | 5.17× |

### What the premium buys

**Prices are comparable across boards; quality is not.** The same 16 MB Flash + 8 MB Octal PSRAM combo can still differ in:

- **RF and antenna**: matching, keep-out and tuning decide real WiFi / BLE performance, and whether there's a U.FL connector is another matter. The common complaint about low-cost boards — weak signal, dropping through walls — never shows on a spec sheet; you can only judge by design, certification and measured RSSI.
- **Quality control**: power and USB protection, soldering, PCB material, batch variation — all affect long-term stability and whether you hit inexplicable problems while debugging.
- **Documentation and maintenance**: schematics, pinouts, example firmware, community support, supply continuity. Brand boards like XIAO usually cost more exactly here — not because their Flash or PSRAM is more expensive.
- **Compliance**: bare-die designs can't rely on a module's RF certification; board-level RF compliance must be verified separately.

"You get what you pay for" mostly holds — **but don't use it in reverse**. Expensive doesn't mean better at everything; brand premium, channel markup and bundle differences are all real. White-label boards can differ severalfold across markets, while brand boards have largely uniform global pricing — redo the comparison in your own market.

A safer order of operations: **first filter boards that "can run" by capacity, PSRAM mode and firmware config; then compare RF, stability, documentation and supply; only then look at price.**

## 05 Turning capacity into configuration

Capacities on a spec sheet don't turn into working firmware by themselves. Five switches, all calculable before you buy:

1. **Match Flash size to the physical part.** `CONFIG_ESPTOOLPY_FLASHSIZE_4MB / 8MB / 16MB` (or Flash Size in Arduino) must match the onboard die; set it too big and OTA or filesystem init will step onto addresses that don't exist.
2. **Match PSRAM mode to the wiring.** In-package 2 MB Quad uses `CONFIG_SPIRAM_MODE_QUAD`; 8 MB Octal uses `CONFIG_SPIRAM_MODE_OCT`; in Arduino these are `QSPI PSRAM` / `OPI PSRAM`. **Get this wrong and the board won't run slowly — it aborts at boot.**
3. **Do the partition math first.** Flash is not firmware-usable space: the partition table, nvs, otadata and phy_init take a slice first, and the rest is split between app and data partitions. **Dual OTA needs an equally sized slot for the next version** — roughly `app × 2 + data partition + fixed overhead`. Firmware with a protocol stack and a graphics library commonly runs 1~2 MB; double it for dual OTA and you're near 4 MB, and reserving 1 MB for fonts and images will overflow — this is where 4 MB boards fail most often. Add up your firmware's real size first; if it doesn't fit, go 16 MB or fall back to single OTA.
4. **Budget your PSRAM buffers.** Framebuffers, TLS handshake buffers, JSON and image decode heaps all live in PSRAM; estimate "sum of peak concurrently resident buffers × 1.3" and check it against the 2 MB / 8 MB tiers. DMA buffers, task stacks and static variables can't go to PSRAM by default — that takes explicit configuration.
5. **Switch target across architectures.** C3 is RISC-V, S3 is Xtensa: `CONFIG_IDF_TARGET`, the toolchain and SDK config all change as a set; every `CONFIG_SPIRAM_*` option is a no-op on C3 — just leave them out.

A typical 16 MB + Octal configuration looks like this:

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
```

| Capacity tier | What to set | Practical effect |
|---|---|---|
| 16 MB Flash + 8 MB Octal | `FLASHSIZE_16MB` + `MODE_OCT` + `SPEED_80M` | Dual OTA and data partitions fit comfortably |
| 8 MB Flash + 8 MB Octal | Same, with Flash size set to `8MB` | Dual OTA still works, but the data partition shrinks noticeably — budget fonts and images |
| 4 MB Flash + 2 MB Quad | `FLASHSIZE_4MB` + `MODE_QUAD` + 4 MB partition table | Dual OTA usually doesn't fit — typically single OTA; recompute PSRAM buffers against 2 MB |
| 4 MB Flash, no PSRAM (C3) | `IDF_TARGET=esp32c3` + 4 MB partition table | All `SPIRAM_*` options inapplicable; memory budget is on-chip SRAM only |

One-line summary: **do three calculations before choosing a board** — does the firmware plus resources fit in Flash, do peak buffers fit in PSRAM, and do the config options match the physical parts. Pass all three and the board will work.

## 06 How to choose, and what to avoid

**Work backwards from what your program needs, then pick among the boards that clear the bar** — don't rank by price or spec-sheet numbers:

| What your program actually needs | Minimum tier that works | Why |
|---|---|---|
| Color or grayscale full-screen refresh, multi-layer framebuffers, local fonts and images, audio streaming, or dual OTA plus a filesystem | 16 MB Flash + 8 MB Octal PSRAM | 8.5 MB runtime memory leaves room for both framebuffer and TLS; Flash holds two app copies plus a resource partition |
| Monochrome full-screen refresh, sensor aggregation, single OTA, light JSON | 4 MB Flash + 2 MB Quad PSRAM | 2.5 MB runtime memory is enough, but fonts and images must be small |
| Connectivity reporting only, no UI, power and size first | 4 MB Flash, no PSRAM (C3) | 0.4 MB covers the protocol stack plus small buffers, trading for low power and minimal size |
| Needs camera / microphone / SD card, or constrained by wearable dimensions | 8 MB Flash XIAO standard / Sense | The binding constraints are board-level integration and pin count, not capacity |

One more item not in the table that can veto certain boards outright: **wide temperature range**. 8 MB Octal PSRAM is rated −40~65 °C; to run at 85 °C you must switch to an in-package Quad part, or enable ECC (losing 1/16 of usable capacity). On this point the `S3 SuperMini FH4R2` is actually the more flexible option.

Pitfall checklist:

- 8 MB Octal PSRAM occupies **GPIO33~37** — don't reuse pins the documentation marks as unavailable.
- The `H` in `FH4R2` only means the Flash die is high-temperature grade; **it does not mean the whole chip reaches 105 °C** — the current datasheet rates −40~85 °C.
- Bare-die designs can't rely on module RF certification; board-level RF compliance needs separate verification for products. `ESP32-C3FN4` is marked EOL on Espressif's site — pick an in-production replacement for new designs.
- In-package Flash + PSRAM share one set of SPI lines and the pins are fully occupied — **no external storage expansion is possible**; if you need custom storage, start from a non-coe-packaged part and lay out your own board.
- Real antenna performance is never on the spec sheet. If connections are unstable or drop through walls, check antenna keep-out and whether there's a U.FL connector first, then measure RSSI — this kind of feedback is common on some low-cost boards; don't treat it as a firmware bug and debug in circles.

### Costs beyond price

A retail ballpark price is only where hardware starts. Between "a board that lights up" and "a product that runs stably for years" there are four more cost categories, none related to "how many MB of Flash or PSRAM": **hardware engineering** (thermal design, power and battery, antenna tuning, whole-unit EMC), **software engineering** (driver adaptation, sleep/wake, fault recovery, OTA rollback, long-term compatibility), **compliance certification** (whole-unit EMC / RF, market access), and **production & after-sales** (yield, batch consistency, spare parts for repairs).

Their magnitude varies wildly by product form, and none of it ever appears on a product page. So this article compares **hardware specs at selection time**, not the cost structure of a finished product: reading the specs right helps you avoid buying the wrong board; what you still need to invest after the board arrives is decided by the project itself.

---

**Sources and methodology**: Espressif *ESP32-S3 Series Datasheet v2.2* tables 1-1 / 2-14 / 5-11 / 5-12, *ESP32-C3 Series Datasheet*, *ESP32-S3-WROOM-1 & 1U Datasheet* tables 1-1 / 1-2 (nine ordering codes, Flash and PSRAM types, temperature ranges, module dimensions), *ESP32-S3-WROOM-2 Datasheet* (1.8 V SPI and 32 MB Flash tiers), Seeed Studio XIAO ESP32-S3 series official wiki and product specifications, public vendor materials for the S3 N16R8 MINI board, ESP-IDF *Support for External RAM* and Arduino-ESP32 board configuration docs. Capacities are nominal; the actually `malloc()`-able heap is slightly smaller. PSRAM bandwidth, temperature range and GPIO occupancy follow the latest datasheet of each part number. Prices in this article are **ballpark figures in Chinese yuan (CNY)** from public retail channels as of 2026-11 — see section 04 for the methodology; they are not a quality judgement or purchase advice.
