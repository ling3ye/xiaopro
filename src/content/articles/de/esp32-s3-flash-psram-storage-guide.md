---
title: "Vor dem Kauf genau hinsehen: ESP32-S3-Suffixe, Flash, PSRAM und ungefähre Preise in RMB (mit C3-Vergleich)"
domain: hardware
platforms: ["cross-platform"]
format: "cheatsheet"
date: 2026-11-10
intro: "Suffixe wie N4, N8R2 oder N16R8 sagen genau zwei Dinge: Die Zahl nach dem N ist Flash, die Zahl nach dem R ist PSRAM. Dieser Beitrag stellt Kapazitäten und ungefähre Preise (in chinesischen Yuan) von fünf gängigen Boards in einer Tabelle gegenüber und erklärt die Auswahl."
tags: ["ESP32-S3", "ESP32-C3", "PSRAM", "Flash", "Entwicklungsboard-Auswahl", "ESP-IDF"]
relatedBoards: ["esp32s3"]
image: "https://img.lingflux.com/2026/11/bf80e841c5e9fb342ebc387e1e68edf8.jpg"
---

> Spickzettel. Alle fünf sind fertige Boards, die man nur per USB-C anstecken muss. Kapazitäten sind Nennwerte, Preise sind ungefähre Angaben in chinesischen Yuan (RMB/CNY) und dienen nur dem horizontalen Größenvergleich.

## 00 Drei Sätze zum Merken

1. **Das Suffix beschreibt nur die Kapazität.** `N16R8` = 16 MB Flash + 8 MB PSRAM. `N` ist Flash, `R` ist PSRAM, die Zahl ist MB. Mit „Generation" oder „Ausstattungsstufe" hat das nichts zu tun.
2. **Flash ist kein Arbeitsspeicher.** Flash ist die Festplatte: stromausfallsicher, hält Firmware und Ressourcen. `malloc()` geht nur aus dem On-Chip-SRAM (beim S3 512 KB) plus PSRAM. Noch so viel Flash rettet also nicht vor „kein PSRAM".
3. **Gleiche Kapazität ≠ gleicher Preis.** Zwei Boards für rund ¥26 und ¥62 haben identisches Flash und PSRAM; die Differenz zahlt man für HF-Design, Qualitätskontrolle und Dokumentation (Abschnitt 04).

Die fünf Boards hier: **vier ESP32-S3** — S3 SuperMini FH4R2, S3 N16R8 MINI, XIAO S3 / Sense, XIAO S3 Plus; **ein ESP32-C3** — C3 SuperMini, eine architekturübergreifende Kontrollgruppe, kein Ersatz derselben Klasse. Das `S3` / `C3` vor dem Modellnamen nennt die Chip-Familie — nicht mit dem Kapazitäts-Suffix dahinter verwechseln.

## 01 Drei Ebenen, drei Arten von Speicher

Ein „ESP32-S3" kann drei völlig verschiedene Dinge meinen:

- **Chip**: ESP32-S3FH4R2, ESP32-S3R8, ESP32-C3FN4 — nackte QFN-Dies; Flash und PSRAM können mit eingepackt sein. Damit allein muss man noch selbst die Platine entwerfen, HF anpassen und eine Antenne bauen.
- **Modul**: etwa WROOM-1 — Chip + Flash auf dem Modul + Quarz + Abschirmblech + PCB-Antenne + HF-Zertifizierung. Ein Name mit WROOM meint meist diese Ebene.
- **Entwicklungsboard**: dazu USB-C, LDO, Tasten, Stiftleisten und Antenne — anstecken und loslegen. **Alle fünf Boards hier liegen auf dieser Ebene**, keine nackten Module. Nur innerhalb derselben Ebene sind Preis- und GPIO-Vergleiche sinnvoll.

<svg viewBox="0 0 900 350" width="100%" style="height:auto" role="img" aria-label="Die drei Ebenen Chip, Modul und Entwicklungsboard sowie die Zuordnung dreier Boardnamen">
  <title>Abbildung 1 · Drei Ebenen und das Entschlüsseln der Namen</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">Ein „ESP32-S3" kann drei völlig verschiedene Dinge meinen · Stichprobe hier: 4 S3-Boards + 1 C3-Kontrolle</text>
  <rect x="20" y="40" width="860" height="52" rx="8" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="38" y="62" font-size="13" font-weight="600" fill="var(--ink)">① Chip (Die)</text>
  <text x="38" y="80" font-size="12" fill="var(--ink-2)">ESP32-S3FH4R2 / ESP32-S3R8 / ESP32-C3FN4 · QFN-Gehäuse · Flash und PSRAM können im Chip sitzen</text>
  <text x="862" y="70" font-size="12" text-anchor="end" fill="var(--pen)">Unsichtbar, Platine nötig</text>
  <rect x="20" y="102" width="860" height="52" rx="8" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="38" y="124" font-size="13" font-weight="600" fill="var(--ink)">② Modul</text>
  <text x="38" y="142" font-size="12" fill="var(--ink-2)">WROOM-1 = Chip + Flash auf dem Modul + Quarz + Abschirmblech + PCB-Antenne + HF-Zertifizierung</text>
  <text x="862" y="132" font-size="12" text-anchor="end" fill="var(--accent)">Keines der fünf ist eines</text>
  <rect x="20" y="164" width="860" height="52" rx="8" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="38" y="186" font-size="13" font-weight="600" fill="var(--ink)">③ Entwicklungsboard</text>
  <text x="38" y="204" font-size="12" fill="var(--ink-2)">Nackter Die oder Modul + USB-C + LDO + Tasten + Stiftleisten + Antenne = anstecken und läuft</text>
  <text x="862" y="194" font-size="12" text-anchor="end" fill="var(--green)">Alle fünf hier liegen auf dieser Ebene</text>
  <line x1="20" y1="234" x2="880" y2="234" stroke="var(--line-2)" stroke-width="1"/>
  <text x="20" y="256" font-size="13" fill="var(--ink-2)">Namensentschlüsselung: Das Suffix meint „Kapazität", nicht „Modellstufe"</text>
  <rect x="20" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="288" font-size="12" font-weight="600" fill="var(--ink)">ESP32-S3FH4R2</text>
  <text x="34" y="306" font-size="11" fill="var(--ink-2)">F=Flash im Gehäuse · H=hochtemperaturfester Die</text>
  <text x="34" y="322" font-size="11" fill="var(--ink-2)">4=4 MB Flash · R2=2 MB PSRAM</text>
  <rect x="312" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="326" y="288" font-size="12" font-weight="600" fill="var(--ink)">S3 N16R8 MINI</text>
  <text x="326" y="306" font-size="11" fill="var(--ink-2)">ESP32-S3R8 als nackter Die + 16 MB Flash onboard</text>
  <text x="326" y="322" font-size="11" fill="var(--ink-2)">N16 ist Onboard-Flash, kein WROOM-Modul</text>
  <rect x="604" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="618" y="288" font-size="12" font-weight="600" fill="var(--ink)">XIAO S3 Plus</text>
  <text x="618" y="306" font-size="11" fill="var(--ink-2)">Derselbe ESP32-S3R8-Die + 16 MB Flash</text>
  <text x="618" y="322" font-size="11" fill="var(--ink-2)">Der Aufpreis zahlt Größe / Antennenbuchse / Ökosystem</text>
</svg>

> **Abbildung 1** · Ein „ESP32-S3" kann drei völlig verschiedene Dinge sein; das Suffix beschreibt die Kapazität, nicht die Modellstufe.

Die **drei Arten von Speicher** nicht verwechseln:

- **Flash = die Festplatte.** Hält Firmware, Schriften und Web-Ressourcen, stromausfallsicher. Quad SPI, laut Datenblatt bis 80 MHz. **Kein Arbeitsspeicher.**
- **PSRAM = der zusätzliche Speicherriegel.** Hält große Arrays, Framebuffer, TLS- und JSON-Puffer; beim Ausschalten geleert, langsamer als On-Chip-SRAM; und während Flash gelöscht oder beschrieben wird, kurz nicht erreichbar.
- **On-Chip-SRAM = die Hosentasche.** Am schnellsten und am kleinsten. Alle vier S3-Boards haben **512 KB** (dazu 384 KB ROM und 16 KB RTC-SRAM); der C3 hat **400 KB** (davon 16 KB als Cache) + 384 KB ROM + 8 KB RTC-SRAM.

Wenn ein Produkttext also „integriertes 8 MB PSRAM & 8 MB Flash" verspricht: Das PSRAM sitzt im Chipgehäuse, das Flash ist ein separat auf die Platine gelöteter Quad-SPI-Die. **Noch so viel Flash ist kein per `malloc()` nutzbarer Platz.**

Die drei am häufigsten falsch gelesenen Angaben im Datenblatt:

| Übliche Formulierung | Richtige Lesart | Selbst prüfen |
|---|---|---|
| „512 KB SRAM" auf einem S3-Board | S3 hat 512 KB; ESP32-C3 hat 400 KB | CPU ansehen: Xtensa LX7 Dual-Core 240 MHz ist S3, RISC-V Single-Core 160 MHz ist C3 |
| „integriertes 8 MB Flash" | Meist onboard, nicht im Chipgehäuse | Vollständige Teilenummer prüfen; nur ein `F` bedeutet Flash im Gehäuse |
| „WROOM im Namen heißt Modul" | Kann auch nur ein weiterverwendeter Kapazitätscode sein | Prüfen, ob ein kleines Modul mit Abschirmblech auf der Platine sitzt; bei nackten Dies sieht man den Hauptchip direkt |

## 02 Das Suffix entschlüsseln: Neun Codes bilden ein 3×3-Gitter

Neun Bestellcodes sehen aus wie neun verschiedene Dinge, sind aber eigentlich eine 3×3-Tabelle:

- **`N` = Onboard-Flash**: `N4` 4 MB, `N8` 8 MB, `N16` 16 MB. Der Die sitzt auf der Modul-PCB über Quad SPI und übersteht Stromausfälle.
- **`R` = im Chip verpacktes PSRAM**: `R2` 2 MB (Quad, 4 Leitungen), `R8` 8 MB (Octal, 8 Leitungen). Kein `R` heißt kein PSRAM.
- 3 Flash-Stufen × 3 PSRAM-Stufen = 9 Modelle.

Der häufigste Fehler beim Preisvergleich: `N8R8` und `N16R8` haben gleich viel PSRAM; nur das Flash unterscheidet sich.

<svg viewBox="0 0 900 406" width="100%" style="height:auto" role="img" aria-label="Aufschlüsselung des N16R8-Suffixes beim ESP32-S3-WROOM-1 und die Matrix der neun Modelle aus den Flash-Stufen 4/8/16 und den PSRAM-Stufen keins/2/8">
  <title>Abbildung 2 · Suffix-Aufschlüsselung und die 3×3-Matrix der neun Modelle</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">Ein Suffix sagt nur zwei Dinge: Nach dem N steht die Flash-Kapazität, nach dem R die PSRAM-Kapazität; je drei Stufen pro Achse ergeben neun Modelle</text>
  <rect x="20" y="42" width="246" height="64" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">ESP32-S3-WROOM-1</text>
  <text x="34" y="84" font-size="11" fill="var(--ink-2)">Die Modulserie selbst: PCB-Antenne</text>
  <text x="34" y="100" font-size="11" fill="var(--ink-2)">Die U-Variante (1U) ersetzt sie durch eine U.FL-Buchse</text>
  <rect x="274" y="42" width="290" height="64" rx="7" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="288" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">N16　→　Flash 16 MB</text>
  <text x="288" y="84" font-size="11" fill="var(--ink-2)">Onboard Quad-SPI-Die auf der Modul-PCB</text>
  <text x="288" y="100" font-size="11" fill="var(--ink-2)">Stromausfallsicher; hält Firmware und Ressourcen</text>
  <rect x="572" y="42" width="308" height="64" rx="7" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="586" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">R8　→　PSRAM 8 MB</text>
  <text x="586" y="84" font-size="11" fill="var(--ink-2)">Octal-PSRAM im Chipgehäuse, 8 Leitungen</text>
  <text x="586" y="100" font-size="11" fill="var(--ink-2)">Beim Ausschalten geleert; Framebuffer und Heap</text>
  <text x="20" y="136" font-size="11" fill="var(--ink-3)">Zeilen = PSRAM-Stufe　Spalten = Flash-Stufe</text>
  <text x="276" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 4 MB</text>
  <text x="498" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 8 MB</text>
  <text x="720" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 16 MB</text>
  <rect x="20" y="166" width="5" height="20" rx="2" fill="var(--accent)"/>
  <text x="34" y="181" font-size="12.5" font-weight="600" fill="var(--ink)">Kein PSRAM</text>
  <rect x="20" y="230" width="5" height="20" rx="2" fill="var(--pen)"/>
  <text x="34" y="245" font-size="12.5" font-weight="600" fill="var(--ink)">2 MB Quad</text>
  <rect x="20" y="294" width="5" height="20" rx="2" fill="var(--green)"/>
  <text x="34" y="309" font-size="12.5" font-weight="600" fill="var(--ink)">8 MB Octal</text>
  <rect x="170" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="276" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4</text>
  <text x="276" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB zur Laufzeit</text>
  <rect x="392" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="498" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8</text>
  <text x="498" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB zur Laufzeit</text>
  <rect x="614" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="720" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16</text>
  <text x="720" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB zur Laufzeit</text>
  <rect x="170" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="276" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R2</text>
  <text x="276" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB zur Laufzeit</text>
  <rect x="392" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="498" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R2</text>
  <text x="498" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB zur Laufzeit</text>
  <rect x="614" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="720" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R2</text>
  <text x="720" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB zur Laufzeit</text>
  <rect x="170" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="276" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R8</text>
  <text x="276" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB zur Laufzeit</text>
  <rect x="392" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="498" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R8</text>
  <text x="498" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB zur Laufzeit</text>
  <rect x="614" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="2.5"/>
  <text x="720" y="300" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R8</text>
  <text x="720" y="318" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB zur Laufzeit</text>
  <rect x="760" y="284" width="44" height="18" rx="4" fill="var(--card)" stroke="var(--green)" stroke-width="1"/>
  <text x="782" y="297" font-size="10.5" text-anchor="middle" fill="var(--green)">Basis</text>
  <text x="20" y="358" font-size="12" fill="var(--ink-2)">R8-Zeile: belegt GPIO33~37, Umgebungstemperatur-Limit 65 °C; die übrigen sechs Zellen: GPIO33~37 nutzbar, Limit 85 °C.</text>
  <text x="20" y="378" font-size="12" fill="var(--ink-2)">R8 bringt nur das PSRAM auf 8 Leitungen; Flash bleibt 4-adriges Quad SPI. Flash mit 8 Leitungen ist WROOM-2-Territorium.</text>
  <text x="20" y="398" font-size="12" fill="var(--ink-3)">Laufzeit-RAM = On-Chip-SRAM 512 KB + PSRAM-Kapazität; Flash zählt nicht als Arbeitsspeicher.</text>
</svg>

> **Abbildung 2** · Die neun Modelle sind genau diese neun Zellen — es gibt keine zehnte; ausgerechnet die Zelle mit der größten Kapazität (`N16R8`) hat das niedrigste Temperaturlimit.

Außerhalb dieser neun Zellen gibt es ein paar weitere Bezeichnungen, die auf Vertriebsseiten oft durcheinander auftauchen:

| Bezeichnung | Bezug zu den neun Kombinationen | Flash | PSRAM | Umgebungstemperatur |
|---|---|---|---|---|
| `-1U` (z. B. `1U-N16R8`) | Alle neun Zellen gelten; nur die PCB-Antenne wird durch eine U.FL-Buchse ersetzt | wie links | wie links | wie links |
| `H4` | Hochtemperaturvariante ohne PSRAM | 4 MB Quad | kein | −40~105 °C |
| `N16R16VA` | Extragroße Kapazität außerhalb des Gitters, SPI auf 1,8 V | 16 MB Quad | 16 MB Octal | −40~65 °C |
| WROOM-2 `N16R8V` / `N32R8V` / `N32R16V` | Eine andere Produktlinie; Flash läuft ebenfalls 8-adrig | 16 / 32 MB Octal | 8 / 16 MB Octal | −40~65 °C |

`1U` unterscheidet sich von der Variante ohne `U` nur in der Antenne: mit `U` gibt es eine U.FL-Buchse für eine externe Antenne bei 18,0×19,2×3,2 mm; ohne `U` eine Onboard-PCB-Antenne bei 18,0×25,5×3,1 mm. Für ein Gehäuse mit nach außen geführter Antenne nimmt man die erste. Die Kapazitätstabelle ist gleich, aber Abstandshalter und der Zertifizierungspfad des Gesamtgeräts unterscheiden sich.

Zwei häufige Fallen:

- **`R8` bringt nur das PSRAM auf 8 Leitungen; Flash bleibt 4-adriges Quad SPI.** Das „Octal" im Namen bezieht sich auf das PSRAM; 8-adriges Flash gibt es nur beim WROOM-2.
- **In den offiziellen Codes gibt es kein `N6`.** Beim WROOM-1 kommt Flash nur in 4 / 8 / 16 MB vor. Bei einem Suffix außerhalb der Tabelle die vollständige Teilenummer im Datenblatt prüfen — nicht nach dem Namen raten.

Alle Varianten gegen die `N16R8`-Basis gereiht:

| Kombination | Flash | PSRAM | Unterschied zu `N16R8` | Laufzeit-RAM | Umgebungstemperatur-Limit |
|---|---|---|---|---|---|
| `N16R8` | 16 MB | 8 MB Octal | Basis | 8,5 MB | 65 °C |
| `N8R8` | 8 MB | 8 MB Octal | 8 MB weniger Flash | 8,5 MB | 65 °C |
| `N4R8` | 4 MB | 8 MB Octal | 12 MB weniger Flash | 8,5 MB | 65 °C |
| `N16R2` | 16 MB | 2 MB Quad | 6 MB weniger PSRAM, 8-adrig auf 4-adrig zurückgestuft | 2,5 MB | 85 °C |
| `N8R2` | 8 MB | 2 MB Quad | 6 MB weniger PSRAM; 8 MB weniger Flash | 2,5 MB | 85 °C |
| `N4R2` | 4 MB | 2 MB Quad | 6 MB weniger PSRAM; 12 MB weniger Flash | 2,5 MB | 85 °C |
| `N16` | 16 MB | kein | 8 MB weniger PSRAM | 0,5 MB | 85 °C |
| `N8` | 8 MB | kein | 8 MB weniger PSRAM; 8 MB weniger Flash | 0,5 MB | 85 °C |
| `N4` | 4 MB | kein | 8 MB weniger PSRAM; 12 MB weniger Flash | 0,5 MB | 85 °C |

Drei Punkte:

1. **PSRAM ist der große Sprung.** 0 → 2 → 8 MB ergibt 0,5 / 2,5 / 8,5 MB Laufzeit-RAM. Von `N16` auf `N16R2` ist das das 5-Fache, weiter auf `N16R8` noch einmal das 3,4-Fache; der Wechsel von Quad auf Octal verdoppelt auch die Datenleitungen von 4 auf 8.
2. **Flash wächst in gleichen Schritten.** 4 / 8 / 16 MB, ohne jede Wirkung auf das Laufzeit-RAM — mehr Flash bedeutet nur mehr Platz für Firmware, Schriften und Web-Ressourcen. `N16R2` gegen `N8R8` ist also keine Frage von „größer"; eines hat mehr Festplatte, das andere mehr Arbeitsspeicher.
3. **Kapazität und Einschränkungen laufen gegenläufig.** Die R8-Zeile hat die größte Kapazität, aber das niedrigste Temperaturlimit (65 °C) und belegt GPIO33~37; Varianten ohne PSRAM erreichen 85 °C mit der volleren Pinbelegung. Wer 8 MB PSRAM und 85 °C zugleich will: Diese neun Zellen können es nicht — entweder zurück zu R2 oder ECC beim R8 aktivieren (verliert noch einmal 1/16 der Kapazität).

Die fünf Boards lassen sich sauber in die Tabelle einordnen:

- `S3 N16R8 MINI`, `XIAO S3 Plus` → entsprechen `N16R8`
- `XIAO S3 / Sense` → entsprechen `N8R8`
- `S3 SuperMini FH4R2` → entspricht `N4R2`, wobei auch sein Flash im Chipgehäuse sitzt (das `F` in der Teilenummer) und der Die hochtemperaturfest ist (das `H`)
- `C3 SuperMini` → außerhalb der Tabelle: Der ESP32-C3 ist eine andere Architekturlinie mit 4 MB Flash und ohne PSRAM — der Chip unterstützt es schlicht nicht

## 03 Kapazität im Überblick

Jedes der fünf fertigen Boards besetzt eine Zelle: `N16R8`, `N8R8`, `N4R2`, plus den C3 außerhalb der Tabelle. Die vier S3-Boards (Xtensa LX7 Dual-Core 240 MHz, mit FPU und Vektorbefehlen); der eine C3 (RISC-V Single-Core 160 MHz, kein PSRAM, vom Chip nicht unterstützt). Die drei hinteren S3-Boards verwenden denselben ESP32-S3R8-Die — sie unterscheiden sich nur darin, ob 8 MB oder 16 MB Flash onboard sind.

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Gestapeltes Balkendiagramm der Gesamtkapazität aus Flash plus PSRAM für die fünf Entwicklungsboards und die neun WROOM-1-Modulkombinationen, gemeinsame Skala bis 24 MB">
  <title>Abbildung 3 · Flash + PSRAM gesamt: fünf fertige Boards gegen neun Modulkombinationen (gleiche Skala, MB)</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">Blau = Flash (Festplatte)　Grün = PSRAM (Speicherriegel)　Orange = nur Flash, kein PSRAM</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Fertige Boards · die fünf hier</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="420" y1="48" x2="420" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="820" y1="48" x2="820" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="100" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="69" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="69" font-size="11.0" fill="var(--accent)">kein PSRAM</text>
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
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Modulkombinationen · neun WROOM-1-Varianten</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Gleiche Skala: die vier S3-Boards entsprechen genau drei Zellen</text>
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
  <text x="629" y="481" font-size="10.5" fill="var(--accent)">kein PSRAM</text>
  <text x="206" y="511" font-size="11.5" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="200" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="320" y="511" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="429" y="511" font-size="10.5" fill="var(--accent)">kein PSRAM</text>
  <text x="206" y="541" font-size="11.5" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="100" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="541" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="541" font-size="10.5" fill="var(--accent)">kein PSRAM</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="420" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">16</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">24 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">Die Balkenlängen passen eins zu eins: Boards fügen keinen Speicher hinzu — das verwendete Modul setzt die Obergrenze; C3 sowie N16 / N8 / N4 haben kein PSRAM.</text>
</svg>

> **Abbildung 3** · Oben die fünf fertigen Boards, unten die neun Modulkombinationen — die Balkenlängen passen eins zu eins. Die Summen unterscheiden sich um bis zu 6×, aber der blaue Teil ist Festplatte, kein Arbeitsspeicher.

Das „Laufzeit-RAM" (On-Chip-SRAM + PSRAM) ist das, was das Programm tatsächlich allokieren kann, und die Balkenlänge hängt allein am PSRAM:

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Balkendiagramm des nutzbaren Laufzeit-RAM für die fünf Entwicklungsboards und die neun Modulkombinationen: vier Stufen 0,4, 0,5, 2,5 und 8,5 MB">
  <title>Abbildung 4 · Zur Laufzeit tatsächlich als RAM nutzbarer Speicher: fünf Boards und neun Modulkombinationen</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">On-Chip-SRAM + PSRAM; Flash zählt nicht. Orange = 0,4~0,5 MB　Blau = 2,5 MB　Grün = 8,5 MB</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Fertige Boards · die fünf hier</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="353" y1="48" x2="353" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="487" y1="48" x2="487" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="753" y1="48" x2="753" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="26.7" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="256" y="69" font-size="12.0" fill="var(--accent)">0,4 MB (nur On-Chip-SRAM)</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="166.7" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="111" font-size="12.0" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="153" font-size="12.0" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="195" font-size="12.0" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="237" font-size="12.0" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Modulkombinationen · neun WROOM-1-Varianten</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Gleiche Skala: Stufen 0,5 / 2,5 / 8,5 MB, passend zu den Boards</text>
  <text x="206" y="301" font-size="11" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="301" font-size="10.5" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="331" font-size="11" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="331" font-size="10.5" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="361" font-size="11" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="361" font-size="10.5" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="391" font-size="11" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="391" font-size="10.5" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="421" font-size="11" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="421" font-size="10.5" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="451" font-size="11" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="451" font-size="10.5" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="481" font-size="11" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="481" font-size="10.5" fill="var(--accent)">0,5 MB</text>
  <text x="206" y="511" font-size="11" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="511" font-size="10.5" fill="var(--accent)">0,5 MB</text>
  <text x="206" y="541" font-size="11" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="541" font-size="10.5" fill="var(--accent)">0,5 MB</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="353" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">2</text>
  <text x="487" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">4</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">6</text>
  <text x="753" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">9 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">Die oberste Stufe ist etwa 21× die unterste; die zusätzlichen 0,5 MB stammen aus dem On-Chip-SRAM, deshalb liegen N4 / N8 / N16 nur 0,1 MB über dem C3.</text>
</svg>

> **Abbildung 4** · Was man wirklich `malloc()` kann, ist das Laufzeit-RAM: vier Stufen — 0,4 / 0,5 / 2,5 / 8,5 MB — bis zu rund 21× auseinander. Modelle ohne `R` schrumpfen auf den winzigen Rest des On-Chip-SRAM.

Ein Gefühl für die Größenordnung: Ein 320×240-RGB565-Bild ist rund 150 KB — 2 MB PSRAM halten etwa 13 Bilder, 8 MB etwa 53. Zehn Sekunden 16 kHz / 16 Bit Mono-Audio sind rund 320 KB — 2 MB puffern etwa 60 s, 8 MB etwa 250 s. „Genug Flash" ersetzt nie „genug RAM".

| Merkmal | S3 SuperMini FH4R2 | S3 N16R8 MINI | XIAO S3 / Sense | XIAO S3 Plus | C3 SuperMini |
|---|---|---|---|---|---|
| **Serie** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-C3** (Kontrolle) |
| Hauptchip | ESP32-S3FH4R2 | ESP32-S3R8 | ESP32-S3R8 | ESP32-S3R8 | ESP32-C3FN4 |
| CPU | Dual-Core 240 MHz | Dual-Core 240 MHz | Dual-Core 240 MHz | Dual-Core 240 MHz | Single-Core 160 MHz |
| Flash | 4 MB (im Gehäuse) | 16 MB (onboard) | 8 MB (onboard) | 16 MB (onboard) | 4 MB (im Gehäuse) |
| PSRAM | 2 MB Quad | 8 MB Octal | 8 MB Octal | 8 MB Octal | kein, nicht unterstützt |
| On-Chip-RAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 400 KB SRAM |
| Laufzeit-RAM | 2,5 MB | 8,5 MB | 8,5 MB | 8,5 MB | 0,4 MB |
| Speicher gesamt | 6 MB | 24 MB | 16 MB | 24 MB | 4 MB |
| Nutzbare GPIO | ~11 | ~20 | 11 (Sense +2) | 18 | 11 |
| Betriebstemperatur | −40~85 °C | −40~65 °C | −20~65 °C | −20~65 °C | −40~85 °C |
| Ungefährer Preis | ~¥22 | ~¥26 | ~¥54 | ~¥62 | ~¥12 |

Alle vier S3-Boards haben identisches On-Chip-RAM; nur Flash und PSRAM unterscheiden sich. Der C3 ist eine ganz andere Architekturlinie: kein USB-OTG, keine LCD-/Kamera-Schnittstelle, keine Vektorbefehle — und kein PSRAM lässt sich durch zusätzliches Flash nachrüsten. Er ist zum Zeigen des Architekturunterschieds dabei, nicht als Ersatz.

## 04 Preise ins Spiel bringen

> **Preisbasis**: **~¥12 / ¥22 / ¥26 / ¥54 / ¥62** (chinesische Yuan) stammen aus öffentlichen Einzelhandelskanälen mit Stand 2026-11, gerundet mit Puffer für Steuern, Versand, Aktionen und Set-Unterschiede. Es sind keine offiziellen Preise und keine Live-Angebote — nur zum Vergleich der Größenordnung. Je nach Markt und Zeitpunkt unterscheiden sie sich um ein Mehrfaches; maßgeblich ist immer der lokale tatsächliche Preis.

<svg viewBox="0 0 900 320" width="100%" style="height:auto" role="img" aria-label="Horizontales Balkendiagramm der ungefähren Preise der fünf Entwicklungsboards von rund 12 bis rund 62 Yuan">
  <title>Abbildung 5 · Ungefährer Preis gegen Kapazität: Preisunterschiede innerhalb derselben Kapazitätsstufe (gleiche Skala)</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Balkenlänge = ungefährer Preis; im Balken = Gesamtspeicher / Laufzeit-RAM, das dieser Preis kauft; Qualität ist hier nicht enthalten</text>
  <rect x="220" y="38" width="600" height="242" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="391" y1="38" x2="391" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="563" y1="38" x2="563" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="734" y1="38" x2="734" y2="280" stroke="var(--line)" stroke-width="1"/>
  <text x="20" y="70" font-size="13" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="103" height="26" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="230" y="70" font-size="12" fill="var(--ink)">4 MB · 0,4 MB</text>
  <text x="331" y="70" font-size="12" fill="var(--accent)">~¥12</text>
  <text x="20" y="114" font-size="13" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="96" width="189" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="114" font-size="12" fill="var(--ink)">6 MB · 2,5 MB</text>
  <text x="417" y="114" font-size="12" fill="var(--pen)">~¥22</text>
  <text x="20" y="158" font-size="13" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="140" width="223" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="158" font-size="12" fill="var(--ink)">24 MB · 8,5 MB</text>
  <text x="451" y="158" font-size="12" fill="var(--pen)">~¥26</text>
  <text x="20" y="202" font-size="13" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="184" width="463" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="202" font-size="12" fill="var(--ink)">16 MB · 8,5 MB</text>
  <text x="691" y="202" font-size="12" fill="var(--pen)">~¥54</text>
  <text x="20" y="246" font-size="13" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="228" width="531" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="246" font-size="12" fill="var(--ink)">24 MB · 8,5 MB</text>
  <text x="759" y="246" font-size="12" fill="var(--pen)">~¥62</text>
  <text x="220" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="391" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥20</text>
  <text x="563" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥40</text>
  <text x="734" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥60</text>
  <text x="20" y="316" font-size="12" fill="var(--ink-3)">Spanne ¥12~62, also rund 5,2×; die Balkenlänge zeigt nur den Preis — HF, Konsistenz und Dokumentation stehen nicht auf der Skala.</text>
</svg>

> **Abbildung 5** · Zwei Boards mit identischer Kapazität und Konfiguration liegen rund ¥36 auseinander; diese Differenz kommt von außerhalb der Kapazitätstabelle, und das Diagramm kann keine Überlegenheit zeigen.

Der auffälligste Fall: **Das ~¥26 teure S3 N16R8 MINI und das ~¥62 teure XIAO S3 Plus haben identisches Flash, PSRAM, Laufzeit-RAM und identische Firmware-Konfiguration**, unterscheiden sich aber um rund ¥36 (58 %). Pro Laufzeit-MB sind das ~¥3,06 gegenüber ~¥7,29. Das zusätzliche Geld kauft Dinge außerhalb der Kapazitätstabelle.

Drei weitere Beobachtungen:

1. **Stückpreis und absoluter Preis zeigen oft in entgegengesetzte Richtungen.** Der C3 ist absolut am günstigsten, kommt aber ohne PSRAM auf ~¥30/MB — das Zehnfache der 8-MB-Octal-Stufe. Der C3 ist von Anfang an auf geringen Stromverbrauch und kleine Bauform ausgelegt.
2. **Auch innerhalb einer Serie gibt es Kompromisse.** Das ~¥54 teure XIAO-Standardmodell / Sense ist rund ¥8 günstiger als das Plus, mit halbem Flash und 7 GPIOs weniger; dafür bringt das Sense Kamera, Mikrofon und SD-Karte, während das Standardmodell kleiner ist und eine U.FL-Buchse hat.
3. **Der Sprung über die Architekturgrenze ist der größte.** Vom C3 zum S3 SuperMini FH4R2 sind es rund ¥10 mehr, und das Laufzeit-RAM steigt von 0,4 auf 2,5 MB (6,25×) — bei gleichzeitigem Wechsel auf Dual-Core 240 MHz, Vektorbefehle und USB-OTG. Das ist kein Upgrade, sondern eine andere Architektur.

<svg viewBox="0 0 900 420" width="100%" style="height:auto" role="img" aria-label="Streudiagramm von ungefährem Preis gegen Laufzeit-RAM, nur die zwei Dimensionen Preis und Speicher, ohne Qualitätsangaben">
  <title>Abbildung 6 · Ungefährer Preis × Laufzeit-RAM: Verteilung über zwei Dimensionen</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Nur zwei Dimensionen: ungefährer Preis und Laufzeit-RAM; HF-Leistung, Board-Konsistenz, Ökosystem und Langzeitpflege stehen nicht auf den Achsen</text>
  <rect x="120" y="50" width="700" height="290" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="108" x2="820" y2="108" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="166" x2="820" y2="166" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="224" x2="820" y2="224" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="282" x2="820" y2="282" stroke="var(--line)" stroke-width="1"/>
  <line x1="320" y1="50" x2="320" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="520" y1="50" x2="520" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="720" y1="50" x2="720" y2="340" stroke="var(--line)" stroke-width="1"/>
  <rect x="132" y="60" width="178" height="42" rx="5" fill="var(--card)" stroke="var(--line-2)" stroke-width="1"/>
  <text x="144" y="78" font-size="11" fill="var(--ink)">Nur Preis und Speicher</text>
  <text x="144" y="94" font-size="11" fill="var(--ink)">keine Qualitätsdimension</text>
  <circle cx="240" cy="328" r="5" fill="var(--accent)"/>
  <text x="252" y="332" font-size="12" fill="var(--accent)">C3 SuperMini ~¥12 · 0,4 MB</text>
  <circle cx="340" cy="268" r="5" fill="var(--pen)"/>
  <text x="352" y="272" font-size="12" fill="var(--pen)">S3 SuperMini FH4R2 ~¥22 · 2,5 MB</text>
  <circle cx="380" cy="94" r="5" fill="var(--pen)"/>
  <text x="392" y="80" font-size="12" fill="var(--pen)">S3 N16R8 MINI ~¥26 · 8,5 MB</text>
  <circle cx="660" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="650" y="118" font-size="12" fill="var(--ink-2)">XIAO S3 / Sense ~¥54 · 8,5 MB</text>
  <circle cx="740" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="880" y="76" font-size="12" text-anchor="end" fill="var(--ink-2)">XIAO S3 Plus ~¥62 · 8,5 MB</text>
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
  <text x="20" y="400" font-size="12" fill="var(--ink-3)">↑ Laufzeit-RAM (MB)　→ Ungefährer Preis (¥)　Die drei 8,5-MB-Punkte liegen auf derselben Höhe: der Preisunterschied kommt nicht aus der Speicherkapazität.</text>
</svg>

> **Abbildung 6** · Drei Punkte auf derselben 8,5-MB-Linie: Die Preisunterschiede stammen nicht aus dem Speicher. Was im Diagramm unsichtbar ist — HF, Qualitätskontrolle und Dokumentation — ist oft der Grund für den Aufpreis.

Als Tabelle (die letzte Spalte ist nur der Preis pro Kapazität):

| Modell | Ungefährer Preis | Speicher gesamt | Laufzeit-RAM | Preis pro Kapazität (~¥ / Laufzeit-MB) | Relativer Preis |
|---|---|---|---|---|---|
| C3 SuperMini | ~¥12 | 4 MB | 0,4 MB | ~¥30,00 | 1,00× |
| S3 SuperMini FH4R2 | ~¥22 | 6 MB | 2,5 MB | ~¥8,80 | 1,83× |
| S3 N16R8 MINI | ~¥26 | 24 MB | 8,5 MB | ~¥3,06 | 2,17× |
| XIAO S3 / Sense | ~¥54 | 16 MB | 8,5 MB | ~¥6,35 | 4,50× |
| XIAO S3 Plus | ~¥62 | 24 MB | 8,5 MB | ~¥7,29 | 5,17× |

### Was der Aufpreis kauft

**Vergleichbar sind die Preise, nicht die Qualität.** Dieselbe Kombination aus 16 MB Flash + 8 MB Octal PSRAM kann als Board noch an folgenden Punkten differieren:

- **HF und Antenne**: Anpassung, Freiraum und Abgleich entscheiden über die reale WiFi-/BLE-Leistung, und ob eine U.FL-Buchse vorhanden ist, ist noch einmal etwas anderes. Die häufige Klage über günstige Boards — schwaches Signal, durch eine Wand instabil — steht in keinem Datenblatt; beurteilen lässt sie sich nur über Design, Zertifizierung und gemessenen RSSI.
- **Qualitätskontrolle**: Schutz von Stromversorgung und USB, Lötstellen, Platinenmaterial, Chargenschwankungen — all das beeinflusst die Langzeitstabilität und ob man beim Debuggen auf unerklärliche Probleme stößt.
- **Dokumentation und Pflege**: Schaltpläne, Pinout, Beispiel-Firmware, Community-Support, Lieferkontinuität. Markenboards wie XIAO kosten meist genau hier mehr — nicht weil ihr Flash oder PSRAM teurer wäre.
- **Konformität**: Nackte Die-Designs können sich nicht auf eine HF-Zertifizierung des Moduls stützen; die HF-Konformität auf Boardebene ist separat zu belegen.

„Man bekommt, wofür man zahlt" gilt weitgehend — **aber nicht in umgekehrter Richtung**. Teuer heißt nicht in allem besser; Markenaufschlag, Händlermarge und Set-Unterschiede sind real. White-Label-Boards variieren marktübergreifend um ein Mehrfaches, Markenboards haben weltweit weitgehend einheitliche Preise — der Vergleich muss im eigenen Markt neu gerechnet werden.

Eine sicherere Reihenfolge: **erst anhand von Kapazität, PSRAM-Modus und Firmware-Konfiguration die Boards herausfiltern, die „laufen"; dann HF, Stabilität, Dokumentation und Verfügbarkeit vergleichen; und erst zuletzt den Preis ansehen.**

## 05 Kapazität in Konfiguration übersetzen

Kapazitäten aus dem Datenblatt werden nicht von selbst zu laufender Firmware. Fünf Schalter, alle vor dem Kauf kalkulierbar:

1. **Flash-Größe am realen Baustein ausrichten.** `CONFIG_ESPTOOLPY_FLASHSIZE_4MB / 8MB / 16MB` (oder Flash Size in Arduino) muss zum onboard verbauten Die passen; zu groß eingestellt, tritt OTA oder die Dateisystem-Initialisierung auf Adressen, die es nicht gibt.
2. **PSRAM-Modus an die Verdrahtung anpassen.** Im Gehäuse verpacktes 2 MB Quad nutzt `CONFIG_SPIRAM_MODE_QUAD`, 8 MB Octal nutzt `CONFIG_SPIRAM_MODE_OCT`; in Arduino sind das `QSPI PSRAM` / `OPI PSRAM`. **Falsch gesetzt läuft das Board nicht langsamer — es bricht beim Booten ab.**
3. **Erst die Partitionierung durchrechnen.** Flash ist nicht der für Firmware nutzbare Platz: Partitionstabelle, nvs, otadata und phy_init belegen zuerst einen Teil, der Rest wird zwischen App- und Datenpartition aufgeteilt. **Dual-OTA braucht einen gleich großen Slot für die nächste Version** — grob `App × 2 + Datenpartition + fester Overhead`. Firmware mit Protokollstack und Grafikbibliothek liegt häufig bei 1~2 MB; mit Dual-OTA verdoppelt ist man nahe 4 MB, und 1 MB für Schriften und Bilder sprengt es dann sicher — hier scheitern 4-MB-Boards am häufigsten. Erst die reale Größe der eigenen Firmware zusammenzählen; passt es nicht, auf 16 MB gehen oder auf Single-OTA zurückfallen.
4. **Budget für PSRAM-Puffer einplanen.** Framebuffer, TLS-Handshake-Puffer, JSON- und Bild-Decode-Heaps liegen alle im PSRAM; schätze „Summe der gleichzeitig im Peak residenten Puffer × 1,3" und vergleiche mit den Stufen 2 MB / 8 MB. DMA-Puffer, Task-Stacks und statische Variablen können standardmäßig nicht ins PSRAM — das erfordert explizite Konfiguration.
5. **Bei Architekturwechsel das Target umstellen.** C3 ist RISC-V, S3 ist Xtensa: `CONFIG_IDF_TARGET`, Toolchain und SDK-Konfiguration ändern sich als Paket; alle `CONFIG_SPIRAM_*`-Optionen sind beim C3 wirkungslos — einfach weglassen.

Eine typische 16-MB-plus-Octal-Konfiguration sieht so aus:

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
```

| Kapazitätsstufe | Zu setzende Optionen | Praktische Wirkung |
|---|---|---|
| 16 MB Flash + 8 MB Octal | `FLASHSIZE_16MB` + `MODE_OCT` + `SPEED_80M` | Dual-OTA und Datenpartition passen bequem, Ressourcen bleiben luftig |
| 8 MB Flash + 8 MB Octal | Gleich, Flash-Größe auf `8MB` | Dual-OTA funktioniert weiter, aber die Datenpartition schrumpft deutlich — Schriften und Bilder müssen geplant werden |
| 4 MB Flash + 2 MB Quad | `FLASHSIZE_4MB` + `MODE_QUAD` + 4-MB-Partitionstabelle | Dual-OTA passt meist nicht — üblich ist Single-OTA; PSRAM-Puffer gegen 2 MB neu rechnen |
| 4 MB Flash, kein PSRAM (C3) | `IDF_TARGET=esp32c3` + 4-MB-Partitionstabelle | Alle `SPIRAM_*`-Optionen entfallen; das Speicherbudget beruht allein auf dem On-Chip-SRAM |

In einem Satz: **vor der Boardwahl drei Rechnungen anstellen** — passen Firmware und Ressourcen ins Flash, passen die Peak-Puffer ins PSRAM, und stimmen die Konfigurationsoptionen mit den realen Bausteinen überein. Erst wenn alle drei aufgehen, ist das Board brauchbar.

## 06 Auswahl und typische Fallen

**Erst aus dem Bedarf des Programms rückwärts die Kapazität bestimmen, dann unter den Boards wählen, die die Hürde nehmen** — nicht nach Preis oder Datenblattzahlen rangeln:

| Was das Programm wirklich braucht | Kleinste ausreichende Stufe | Warum |
|---|---|---|
| Farb- oder Graustufen-Vollbildaufbau, mehrschichtige Framebuffer, lokale Schriften und Bilder, Audio-Streaming oder Dual-OTA plus Dateisystem | 16 MB Flash + 8 MB Octal PSRAM | 8,5 MB Laufzeit-RAM lassen Framebuffer und TLS je eigenen Platz, und das Flash hält zwei App-Kopien plus eine Ressourcenpartition |
| Monochrom-Vollbildaufbau, Sensor-Aggregation, Single-OTA, wenig JSON | 4 MB Flash + 2 MB Quad PSRAM | 2,5 MB Laufzeit-RAM genügen, aber Schriften und Bilder müssen klein gewählt werden |
| Nur Konnektivitäts-Meldungen, keine Oberfläche, Strom und Größe vorn | 4 MB Flash, kein PSRAM (C3) | 0,4 MB decken Protokollstack plus kleine Puffer — der Gegenwert sind wenig Strom und minimale Größe |
| Kamera / Mikrofon / SD-Karte nötig oder durch Wearable-Maße begrenzt | XIAO Standard / Sense mit 8 MB Flash | Die bindenden Grenzen sind Board-Integration und Pinzahl, nicht die Kapazität |

Ein Punkt, der nicht in der Tabelle steht, aber manche Boards sofort ausschließt: **der weite Temperaturbereich**. 8 MB Octal PSRAM ist mit −40~65 °C spezifiziert; für 85 °C muss man auf einen im Gehäuse verpackten Quad-Typ wechseln oder ECC aktivieren (verliert 1/16 der nutzbaren Kapazität). In diesem Punkt ist das `S3 SuperMini FH4R2` tatsächlich flexibler.

Checkliste gegen typische Fallen:

- 8 MB Octal PSRAM belegt **GPIO33~37** — Pins, die in der Dokumentation als nicht anders nutzbar markiert sind, nicht zweckentfremden.
- Das `H` in `FH4R2` bedeutet nur, dass der Flash-Die hochtemperaturfest ist; **es heißt nicht, dass der ganze Chip 105 °C erreicht** — das aktuelle Datenblatt nennt −40~85 °C.
- Nackte Die-Designs können sich nicht auf eine Modul-HF-Zertifizierung stützen; für Produkte ist die HF-Konformität auf Boardebene separat zu belegen. `ESP32-C3FN4` ist bei Espressif als EOL gekennzeichnet — für neue Designs einen in Produktion befindlichen Ersatz wählen.
- Flash und PSRAM im Gehäuse teilen sich einen Satz SPI-Leitungen, die Pins sind voll belegt — **eine externe Speichererweiterung ist unmöglich**; für eigenen Speicher muss man mit einer nicht co-packagierten Teilenummer neu entwerfen.
- Die reale Antennenleistung steht in keinem Datenblatt. Bei instabilen Verbindungen oder Abbrüchen durch Wände zuerst Antennenfreiraum und das Vorhandensein einer U.FL-Buchse prüfen, dann RSSI messen — solche Rückmeldungen sind bei manchen günstigen Boards verbreitet; nicht gleich als Firmware-Bug einordnen und im Kreis debuggen.

### Kosten jenseits des Preises

Ein ungefährer Einzelhandelspreis ist nur der Anfang der Hardware. Zwischen „einem Board, das leuchtet" und „einem Produkt, das jahrelang stabil läuft" liegen vier weitere Kostenblöcke, die nichts mit „wie viel MB Flash oder PSRAM" zu tun haben: **Hardware-Entwicklung** (Thermik, Stromversorgung und Akku, Antennenabgleich, EMC des Gesamtgeräts), **Software-Entwicklung** (Treiberanpassung, Sleep/Wake, Fehlerbehandlung, OTA-Rollback, Langzeitkompatibilität), **Konformitätszertifizierung** (EMC / HF des Gesamtgeräts, Marktzugang) und **Serie und Service** (Ausbeute, Chargenkonsistenz, Ersatzteile für Reparaturen).

Ihre Größenordnung schwankt extrem je nach Produktform und steht nie auf einer Produktseite. Dieser Beitrag vergleicht also **Hardware-Parameter zum Auswahlzeitpunkt**, nicht die Kostenstruktur eines fertigen Produkts: Parameter richtig lesen hilft, das falsche Board zu vermeiden; was nach der Ankunft des Boards noch investiert werden muss, entscheidet das Projekt selbst.

---

**Quellen und Methodik**: Espressif *ESP32-S3 Series Datasheet v2.2*, Tabellen 1-1 / 2-14 / 5-11 / 5-12; *ESP32-C3 Series Datasheet*; *ESP32-S3-WROOM-1 & 1U Datasheet*, Tabellen 1-1 / 1-2 (neun Bestellcodes, Flash- und PSRAM-Typen, Temperaturbereiche, Modulmaße); *ESP32-S3-WROOM-2 Datasheet* (1,8-V-SPI und 32-MB-Flash-Stufen); offizielles Wiki und Produktspezifikationen der Seeed Studio XIAO ESP32-S3-Serie; öffentliche Herstellerunterlagen zum S3 N16R8 MINI-Board; ESP-IDF *Support for External RAM* sowie die Board-Konfigurationsdokumentation von Arduino-ESP32. Kapazitäten sind Nennwerte; der tatsächlich `malloc()`-bare Heap ist etwas kleiner. PSRAM-Bandbreite, Temperaturbereich und GPIO-Belegung richten sich nach dem jeweils aktuellen Datenblatt der Teilenummer. Die Preise in diesem Beitrag sind **ungefähre Angaben in chinesischen Yuan (RMB)** aus öffentlichen Einzelhandelskanälen mit Stand 2026-11 — Methodik in Abschnitt 04; sie sind keine Qualitätsbewertung und keine Kaufempfehlung.
