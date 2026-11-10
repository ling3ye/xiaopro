---
title: "Prima di comprare, guarda bene: suffissi ESP32-S3, Flash, PSRAM e prezzi indicativi in yuan (con confronto C3)"
domain: hardware
platforms: ["cross-platform"]
format: "cheatsheet"
date: 2026-11-10
intro: "Suffissi come N4, N8R2 o N16R8 dicono esattamente due cose: il numero dopo N è la Flash, quello dopo R è la PSRAM. Questa guida mette in un'unica tabella capacità e prezzi indicativi (in yuan) di cinque schede comuni, e spiega come scegliere."
tags: ["ESP32-S3", "ESP32-C3", "PSRAM", "Flash", "scelta scheda di sviluppo", "ESP-IDF"]
relatedBoards: ["esp32s3"]
image: "https://img.lingflux.com/2026/11/bf80e841c5e9fb342ebc387e1e68edf8.jpg"
---

> Scheda di consultazione rapida. Tutte e cinque sono schede complete che funzionano appena si collega l'USB-C. Le capacità sono nominali e i prezzi sono ordini di grandezza in yuan cinesi (CNY), utili solo per confrontare le scale.

## 00 Tre frasi da ricordare

1. **Il suffisso descrive solo la capacità.** `N16R8` = 16 MB di Flash + 8 MB di PSRAM. `N` è la Flash, `R` la PSRAM, il numero è in MB. Non ha niente a che vedere con «generazione» o «fascia alta/bassa».
2. **La Flash non è memoria.** La Flash è il disco: sopravvive all'interruzione di corrente e contiene firmware e risorse. Con `malloc()` si può allocare solo dalla SRAM interna (512 KB sull'S3) più la PSRAM. Quanta Flash ci sia non compensa l'assenza di PSRAM.
3. **Stessa capacità ≠ stesso prezzo.** Due schede da circa ¥26 e ¥62 hanno Flash e PSRAM identiche; la differenza paga RF, controllo qualità e documentazione (sezione 04).

Le cinque schede: **quattro ESP32-S3** — S3 SuperMini FH4R2, S3 N16R8 MINI, XIAO S3 / Sense, XIAO S3 Plus; **una ESP32-C3** — C3 SuperMini, un controllo di un'altra architettura, non un sostituto della stessa fascia. Il `S3` / `C3` davanti al modello indica la famiglia del chip; non confonderlo con il suffisso di capacità che segue.

## 01 Tre livelli, tre tipi di spazio

Un «ESP32-S3» può indicare tre cose diverse:

- **Chip**: ESP32-S3FH4R2, ESP32-S3R8, ESP32-C3FN4 — die nudo in QFN; Flash e PSRAM possono essere integrate nel package. Con questo in mano restano da progettare la scheda, adattare la RF e aggiungere l'antenna.
- **Modulo**: come il WROOM-1 — chip + Flash sul modulo + quarzo + schermo metallico + antenna PCB + certificazione RF. Un nome che contiene WROOM di solito indica questo livello.
- **Scheda di sviluppo**: si aggiungono USB-C, LDO, pulsanti, pin e antenna — si collega e funziona. **Tutte e cinque le schede di questo articolo sono a questo livello**, senza moduli nudi: solo confrontando lo stesso livello prezzo e GPIO hanno senso.

<svg viewBox="0 0 900 350" width="100%" style="height:auto" role="img" aria-label="I tre livelli chip, modulo e scheda di sviluppo, e a quale livello cade ciascun nome di scheda">
  <title>Figura 1 · Tre livelli e decodifica dei nomi</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">Uno stesso nome «ESP32-S3» può indicare tre cose molto diverse　·　Campione dell'articolo: 4 schede S3 + 1 controllo C3</text>
  <rect x="20" y="40" width="860" height="52" rx="8" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="38" y="62" font-size="13" font-weight="600" fill="var(--ink)">① Chip (die)</text>
  <text x="38" y="80" font-size="12" fill="var(--ink-2)">ESP32-S3FH4R2 / ESP32-S3R8 / ESP32-C3FN4 · package QFN · Flash e PSRAM possono essere nel chip</text>
  <text x="862" y="70" font-size="12" text-anchor="end" fill="var(--pen)">Invisibile; serve progettare la scheda</text>
  <rect x="20" y="102" width="860" height="52" rx="8" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="38" y="124" font-size="13" font-weight="600" fill="var(--ink)">② Modulo</text>
  <text x="38" y="142" font-size="12" fill="var(--ink-2)">WROOM-1 = chip + Flash sul modulo + quarzo + schermo + antenna PCB + certificazione RF</text>
  <text x="862" y="132" font-size="12" text-anchor="end" fill="var(--accent)">Nessuna delle cinque lo è</text>
  <rect x="20" y="164" width="860" height="52" rx="8" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="38" y="186" font-size="13" font-weight="600" fill="var(--ink)">③ Scheda di sviluppo</text>
  <text x="38" y="204" font-size="12" fill="var(--ink-2)">Die o modulo + USB-C + LDO + pulsanti + pin + antenna = si collega e funziona</text>
  <text x="862" y="194" font-size="12" text-anchor="end" fill="var(--green)">Le cinque schede sono qui</text>
  <line x1="20" y1="234" x2="880" y2="234" stroke="var(--line-2)" stroke-width="1"/>
  <text x="20" y="256" font-size="13" fill="var(--ink-2)">Decodifica del nome: il suffisso indica «capacità», non «livello del modello»</text>
  <rect x="20" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="288" font-size="12" font-weight="600" fill="var(--ink)">ESP32-S3FH4R2</text>
  <text x="34" y="306" font-size="11" fill="var(--ink-2)">F=Flash nel package · H=die ad alta temperatura</text>
  <text x="34" y="322" font-size="11" fill="var(--ink-2)">4=4 MB Flash · R2=2 MB PSRAM</text>
  <rect x="312" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="326" y="288" font-size="12" font-weight="600" fill="var(--ink)">S3 N16R8 MINI</text>
  <text x="326" y="306" font-size="11" fill="var(--ink-2)">Die ESP32-S3R8 + 16 MB Flash sulla scheda</text>
  <text x="326" y="322" font-size="11" fill="var(--ink-2)">N16 è Flash a bordo, non un modulo WROOM</text>
  <rect x="604" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="618" y="288" font-size="12" font-weight="600" fill="var(--ink)">XIAO S3 Plus</text>
  <text x="618" y="306" font-size="11" fill="var(--ink-2)">Stesso die ESP32-S3R8 + 16 MB Flash</text>
  <text x="618" y="322" font-size="11" fill="var(--ink-2)">Il sovrapprezzo paga dimensioni / connettore / ecosistema</text>
</svg>

> **Figura 1** · Uno stesso «ESP32-S3» può essere tre cose diverse; il suffisso indica la capacità, non il livello del modello.

Non confondere i **tre tipi di spazio**:

- **Flash = il disco.** Contiene firmware, font e risorse web; sopravvive all'interruzione di corrente. Quad SPI, fino a 80 MHz nominali. **Non è memoria.**
- **PSRAM = il banco di memoria esterno.** Contiene array grandi, framebuffer e buffer di TLS e JSON; si svuota allo spegnimento, è più lenta della SRAM interna e resta brevemente inaccessibile durante la cancellazione/scrittura della Flash.
- **SRAM interna = la tasca.** La più veloce e la più piccola. Le quattro schede S3 hanno **512 KB** (più 384 KB di ROM e 16 KB di RTC SRAM); la C3 ha **400 KB** (di cui 16 KB come cache) + 384 KB di ROM + 8 KB di RTC SRAM.

Quando una scheda tecnica dice «8 MB di PSRAM e 8 MB di Flash integrati», la PSRAM è dentro il package del chip e la Flash è un die Quad SPI saldato a parte sulla scheda. **Per quanto grande sia la Flash, non è spazio allocabile con `malloc()`.**

I tre punti più fraintesi su una scheda tecnica:

| Formulazione comune | Lettura corretta | Come verificare da soli |
|---|---|---|
| «512 KB SRAM» su una scheda S3 | L'S3 ha 512 KB; l'ESP32-C3 ha 400 KB | Guarda la CPU: Xtensa LX7 dual-core 240 MHz è S3; RISC-V single-core 160 MHz è C3 |
| «8 MB di Flash integrati» | Il più delle volte a bordo, non dentro il chip | Cerca il codice completo: solo una `F` indica Flash nel package |
| «WROOM nel nome = modulo» | Può essere solo un codice di capacità riutilizzato | Controlla se c'è un piccolo modulo schermato sulla scheda; nei design a die nudo si vede il chip principale |

## 02 Decodifica del suffisso: nove codici formano una griglia 3×3

Nove codici d'ordine sembrano nove cose diverse, ma in realtà sono una tabella 3×3:

- **`N` = Flash a bordo**: `N4` 4 MB, `N8` 8 MB, `N16` 16 MB. Il die è montato sul PCB del modulo via Quad SPI e sopravvive allo spegnimento.
- **`R` = PSRAM nel package del chip**: `R2` 2 MB (Quad, 4 linee), `R8` 8 MB (Octal, 8 linee). Senza `R` non c'è PSRAM.
- 3 livelli di Flash × 3 livelli di PSRAM = 9 modelli.

L'errore più frequente nel confronto prezzi: `N8R8` e `N16R8` hanno la stessa PSRAM; cambia solo la Flash.

<svg viewBox="0 0 900 406" width="100%" style="height:auto" role="img" aria-label="Scomposizione del suffisso N16R8 dell'ESP32-S3-WROOM-1 e matrice dei nove modelli da Flash 4/8/16 e PSRAM nessuna/2/8">
  <title>Figura 2 · Scomposizione del suffisso e matrice 3×3 dei nove modelli</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">Un suffisso dice solo due cose: dopo N la Flash, dopo R la PSRAM; tre livelli per asse danno nove modelli</text>
  <rect x="20" y="42" width="246" height="64" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">ESP32-S3-WROOM-1</text>
  <text x="34" y="84" font-size="11" fill="var(--ink-2)">La serie di moduli in sé: antenna PCB</text>
  <text x="34" y="100" font-size="11" fill="var(--ink-2)">La variante U (1U) passa al connettore U.FL</text>
  <rect x="274" y="42" width="290" height="64" rx="7" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="288" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">N16　→　Flash 16 MB</text>
  <text x="288" y="84" font-size="11" fill="var(--ink-2)">Die Quad SPI sul PCB del modulo</text>
  <text x="288" y="100" font-size="11" fill="var(--ink-2)">Non si cancella; firmware e risorse</text>
  <rect x="572" y="42" width="308" height="64" rx="7" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="586" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">R8　→　PSRAM 8 MB</text>
  <text x="586" y="84" font-size="11" fill="var(--ink-2)">PSRAM Octal dentro il package, 8 linee</text>
  <text x="586" y="100" font-size="11" fill="var(--ink-2)">Si svuota allo spegnimento; framebuffer e heap</text>
  <text x="20" y="136" font-size="11" fill="var(--ink-3)">Righe = livello PSRAM　Colonne = livello Flash</text>
  <text x="276" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 4 MB</text>
  <text x="498" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 8 MB</text>
  <text x="720" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 16 MB</text>
  <rect x="20" y="166" width="5" height="20" rx="2" fill="var(--accent)"/>
  <text x="34" y="181" font-size="12.5" font-weight="600" fill="var(--ink)">Senza PSRAM</text>
  <rect x="20" y="230" width="5" height="20" rx="2" fill="var(--pen)"/>
  <text x="34" y="245" font-size="12.5" font-weight="600" fill="var(--ink)">2 MB Quad</text>
  <rect x="20" y="294" width="5" height="20" rx="2" fill="var(--green)"/>
  <text x="34" y="309" font-size="12.5" font-weight="600" fill="var(--ink)">8 MB Octal</text>
  <rect x="170" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="276" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4</text>
  <text x="276" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB a runtime</text>
  <rect x="392" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="498" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8</text>
  <text x="498" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB a runtime</text>
  <rect x="614" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="720" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16</text>
  <text x="720" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB a runtime</text>
  <rect x="170" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="276" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R2</text>
  <text x="276" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB a runtime</text>
  <rect x="392" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="498" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R2</text>
  <text x="498" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB a runtime</text>
  <rect x="614" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="720" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R2</text>
  <text x="720" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB a runtime</text>
  <rect x="170" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="276" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R8</text>
  <text x="276" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB a runtime</text>
  <rect x="392" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="498" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R8</text>
  <text x="498" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB a runtime</text>
  <rect x="614" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="2.5"/>
  <text x="720" y="300" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R8</text>
  <text x="720" y="318" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB a runtime</text>
  <rect x="760" y="284" width="44" height="18" rx="4" fill="var(--card)" stroke="var(--green)" stroke-width="1"/>
  <text x="782" y="297" font-size="10.5" text-anchor="middle" fill="var(--green)">base</text>
  <text x="20" y="358" font-size="12" fill="var(--ink-2)">Riga R8: occupa GPIO33~37, limite di temperatura ambiente 65 °C; le altre sei caselle: GPIO33~37 liberi, limite 85 °C.</text>
  <text x="20" y="378" font-size="12" fill="var(--ink-2)">R8 porta a 8 linee solo la PSRAM; la Flash resta Quad SPI a 4 linee. La Flash a 8 linee è del WROOM-2.</text>
  <text x="20" y="398" font-size="12" fill="var(--ink-3)">Memoria a runtime = SRAM interna 512 KB + capacità PSRAM; la Flash non conta come memoria.</text>
</svg>

> **Figura 2** · I nove modelli sono esattamente queste nove caselle — non c'è una decima; e proprio la casella con più capacità (`N16R8`) ha il limite termico più basso.

Fuori dalle nove caselle ci sono altre denominazioni, spesso mescolate nelle pagine dei distributori:

| Denominazione | Rapporto con le nove combinazioni | Flash | PSRAM | Temperatura ambiente |
|---|---|---|---|---|
| `-1U` (es. `1U-N16R8`) | Le nove caselle valgono; cambia solo l'antenna PCB con un U.FL | idem | idem | idem |
| `H4` | Codice ad alta temperatura senza PSRAM | 4 MB Quad | nessuna | −40~105 °C |
| `N16R16VA` | Capacità extra-large fuori griglia, SPI a 1,8 V | 16 MB Quad | 16 MB Octal | −40~65 °C |
| WROOM-2 `N16R8V` / `N32R8V` / `N32R16V` | Un'altra linea di prodotto; anche la Flash è a 8 linee | 16 / 32 MB Octal | 8 / 16 MB Octal | −40~65 °C |

`1U` differisce dalla versione senza `U` solo nell'antenna: con `U` c'è un connettore U.FL per antenna esterna, 18,0×19,2×3,2 mm; senza `U` c'è un'antenna PCB, 18,0×25,5×3,1 mm. Se devi chiudere in custodia e portare l'antenna fuori, scegli la prima. La tabella delle capacità è identica, ma cambiano gli ingombri di sicurezza e il percorso di certificazione dell'apparecchio.

Due trappole classiche:

- **`R8` porta a 8 linee solo la PSRAM; la Flash resta Quad SPI a 4 linee.** L'«Octal» nel nome si riferisce alla PSRAM; la Flash a 8 linee è del WROOM-2.
- **Nei codici ufficiali non esiste `N6`.** Sul WROOM-1 la Flash esiste solo in 4 / 8 / 16 MB. Davanti a un suffisso fuori tabella, verifica il codice completo sul datasheet: non indovinare dal nome.

Tutte ordinate rispetto alla base `N16R8`:

| Combinazione | Flash | PSRAM | Differenza da `N16R8` | Memoria a runtime | Limite di temperatura |
|---|---|---|---|---|---|
| `N16R8` | 16 MB | 8 MB Octal | base | 8,5 MB | 65 °C |
| `N8R8` | 8 MB | 8 MB Octal | 8 MB di Flash in meno | 8,5 MB | 65 °C |
| `N4R8` | 4 MB | 8 MB Octal | 12 MB di Flash in meno | 8,5 MB | 65 °C |
| `N16R2` | 16 MB | 2 MB Quad | 6 MB di PSRAM in meno, da 8 a 4 linee | 2,5 MB | 85 °C |
| `N8R2` | 8 MB | 2 MB Quad | 6 MB di PSRAM in meno; 8 MB di Flash in meno | 2,5 MB | 85 °C |
| `N4R2` | 4 MB | 2 MB Quad | 6 MB di PSRAM in meno; 12 MB di Flash in meno | 2,5 MB | 85 °C |
| `N16` | 16 MB | nessuna | 8 MB di PSRAM in meno | 0,5 MB | 85 °C |
| `N8` | 8 MB | nessuna | 8 MB di PSRAM in meno; 8 MB di Flash in meno | 0,5 MB | 85 °C |
| `N4` | 4 MB | nessuna | 8 MB di PSRAM in meno; 12 MB di Flash in meno | 0,5 MB | 85 °C |

Tre considerazioni:

1. **La PSRAM è il salto grosso.** 0 → 2 → 8 MB significa memoria a runtime di 0,5 / 2,5 / 8,5 MB. Da `N16` a `N16R2` è ×5, poi fino a `N16R8` ancora ×3,4; passando da Quad a Octal le linee dati vanno da 4 a 8.
2. **La Flash cresce a passi uguali.** 4 / 8 / 16 MB, senza alcun effetto sulla memoria a runtime: più Flash significa solo più spazio per firmware, font e risorse web. Quindi `N16R2` contro `N8R8` non è «quale è più grande»: una ha più disco, l'altra più memoria.
3. **Capacità e vincoli vanno in direzioni opposte.** La riga R8 ha la capacità maggiore ma il limite termico più basso (65 °C) e occupa GPIO33~37; le versioni senza PSRAM arrivano a 85 °C con il pinout più completo. Avere insieme 8 MB di PSRAM e 85 °C: queste nove caselle non lo permettono — o si scende a R2, o si attiva ECC sulla R8 (perdendo un altro 1/16 di capacità).

Le cinque schede cadono ordinatamente nella tabella:

- `S3 N16R8 MINI`, `XIAO S3 Plus` → equivalenti a `N16R8`
- `XIAO S3 / Sense` → equivalente a `N8R8`
- `S3 SuperMini FH4R2` → equivalente a `N4R2`, con la Flash anch'essa nel package (la `F`) e il die in grado alta temperatura (la `H`)
- `C3 SuperMini` → fuori tabella: l'ESP32-C3 è un'altra linea architetturale, 4 MB di Flash, senza PSRAM — il chip non la supporta

## 03 Panorama delle capacità

Ognuna delle cinque schede occupa una casella: `N16R8`, `N8R8`, `N4R2`, più la C3 fuori tabella. Le quattro S3 (Xtensa LX7 dual-core 240 MHz, con FPU e istruzioni vettoriali); la C3 (RISC-V single-core 160 MHz, senza PSRAM, non supportata dal chip). Le ultime tre S3 usano lo stesso die ESP32-S3R8: cambia solo la Flash a bordo, 8 o 16 MB.

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Barre impilate della capacità totale Flash più PSRAM per le cinque schede e le nove combinazioni di modulo WROOM-1, stessa scala fino a 24 MB">
  <title>Figura 3 · Flash + PSRAM totali: cinque schede contro nove combinazioni di modulo (stessa scala, MB)</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">Blu = Flash (disco)　Verde = PSRAM (memoria)　Arancio = solo Flash, senza PSRAM</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Schede · le cinque dell'articolo</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="420" y1="48" x2="420" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="820" y1="48" x2="820" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="100" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="69" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="69" font-size="11.0" fill="var(--accent)">senza PSRAM</text>
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
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Combinazioni di modulo · nove varianti WROOM-1</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Stessa scala: le quattro schede S3 corrispondono a tre caselle</text>
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
  <text x="629" y="481" font-size="10.5" fill="var(--accent)">senza PSRAM</text>
  <text x="206" y="511" font-size="11.5" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="200" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="320" y="511" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="429" y="511" font-size="10.5" fill="var(--accent)">senza PSRAM</text>
  <text x="206" y="541" font-size="11.5" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="100" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="541" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="541" font-size="10.5" fill="var(--accent)">senza PSRAM</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="420" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">16</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">24 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">Le lunghezze coincidono una a una: le schede non aggiungono storage — il modulo scelto fissa il tetto; la C3 e le N16 / N8 / N4 non hanno PSRAM.</text>
</svg>

> **Figura 3** · Sopra le cinque schede, sotto le nove combinazioni di modulo: le lunghezze coincidono una a una. I totali differiscono fino a 6×, ma il segmento blu è disco, non memoria.

La «memoria a runtime» (SRAM interna + PSRAM) è ciò che il programma può davvero allocare, e la sua lunghezza dipende solo dalla PSRAM:

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Barre della memoria utilizzabile a runtime per le cinque schede e le nove combinazioni di modulo: quattro livelli 0,4, 0,5, 2,5 e 8,5 MB">
  <title>Figura 4 · Spazio realmente utilizzabile come memoria a runtime: cinque schede e nove combinazioni</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">SRAM interna + PSRAM; la Flash non conta. Arancio = 0,4~0,5 MB　Blu = 2,5 MB　Verde = 8,5 MB</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Schede · le cinque dell'articolo</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="353" y1="48" x2="353" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="487" y1="48" x2="487" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="753" y1="48" x2="753" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="26.7" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="256" y="69" font-size="12.0" fill="var(--accent)">0,4 MB (solo SRAM interna)</text>
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
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Combinazioni di modulo · nove varianti WROOM-1</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Stessa scala: livelli 0,5 / 2,5 / 8,5 MB, uno a uno con le schede</text>
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
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">Il livello massimo è circa 21× quello minimo; i 0,5 MB in più vengono dalla SRAM interna, perciò N4 / N8 / N16 superano la C3 di soli 0,1 MB.</text>
</svg>

> **Figura 4** · Ciò che si può davvero `malloc()` è la memoria a runtime: quattro livelli — 0,4 / 0,5 / 2,5 / 8,5 MB — fino a ~21× di differenza. I modelli senza `R` si riducono a quel piccolo pezzo di SRAM interna.

Un riferimento di scala: un fotogramma RGB565 da 320×240 è circa 150 KB — 2 MB di PSRAM ne contengono ~13, 8 MB ~53; dieci secondi di audio mono a 16 kHz / 16 bit sono circa 320 KB — 2 MB ne bufferizzano ~60 s, 8 MB ~250 s. «Flash abbastanza» non sostituisce mai «memoria abbastanza».

| Dimensione | S3 SuperMini FH4R2 | S3 N16R8 MINI | XIAO S3 / Sense | XIAO S3 Plus | C3 SuperMini |
|---|---|---|---|---|---|
| **Serie** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-C3** (controllo) |
| Chip principale | ESP32-S3FH4R2 | ESP32-S3R8 | ESP32-S3R8 | ESP32-S3R8 | ESP32-C3FN4 |
| CPU | dual-core 240 MHz | dual-core 240 MHz | dual-core 240 MHz | dual-core 240 MHz | single-core 160 MHz |
| Flash | 4 MB (nel package) | 16 MB (a bordo) | 8 MB (a bordo) | 16 MB (a bordo) | 4 MB (nel package) |
| PSRAM | 2 MB Quad | 8 MB Octal | 8 MB Octal | 8 MB Octal | nessuna, non supportata |
| RAM interna | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 400 KB SRAM |
| Memoria a runtime | 2,5 MB | 8,5 MB | 8,5 MB | 8,5 MB | 0,4 MB |
| Storage totale | 6 MB | 24 MB | 16 MB | 24 MB | 4 MB |
| GPIO utilizzabili | ~11 | ~20 | 11 (Sense +2) | 18 | 11 |
| Temperatura di esercizio | −40~85 °C | −40~65 °C | −20~65 °C | −20~65 °C | −40~85 °C |
| Prezzo indicativo | ~¥22 | ~¥26 | ~¥54 | ~¥62 | ~¥12 |

Le quattro S3 hanno esattamente la stessa RAM interna; cambiano solo Flash e PSRAM. La C3 è un'altra linea architetturale: niente USB OTG, niente interfaccia LCD/fotocamera, niente istruzioni vettoriali, e nessun modo di ottenere PSRAM aggiungendo Flash. È qui per mostrare la differenza di architettura, non come sostituto.

## 04 Aggiungere i prezzi

> **Base dei prezzi**: **~¥12 / ¥22 / ¥26 / ¥54 / ¥62** (yuan cinesi) provengono da canali retail pubblici a 2026-11, arrotondati con margine per coprire tasse, spedizione, promozioni e differenze di bundle. Non sono prezzi ufficiali né quotazioni in tempo reale: servono solo a confrontare gli ordini di grandezza. Mercati e momenti diversi possono differire di più volte; vale sempre il prezzo locale reale.

<svg viewBox="0 0 900 320" width="100%" style="height:auto" role="img" aria-label="Barre orizzontali dei prezzi indicativi delle cinque schede, da circa 12 a circa 62 yuan">
  <title>Figura 5 · Prezzo indicativo e capacità: scarti nello stesso livello (stessa scala)</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Lunghezza = prezzo indicativo; all'interno = storage totale / memoria a runtime acquistati; la qualità non è nel grafico</text>
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
  <text x="20" y="316" font-size="12" fill="var(--ink-3)">Fascia ~¥12–62, fino a ~5,2× di scarto; la lunghezza riflette solo il prezzo — RF, coerenza e documentazione non sono sulla scala.</text>
</svg>

> **Figura 5** · Due schede con capacità e configurazione identiche differiscono di ~¥36; quello scarto viene da fuori dalla tabella delle capacità, e il grafico non può dire quale sia meglio.

Il caso più evidente: **l'S3 N16R8 MINI da ~¥26 e l'XIAO S3 Plus da ~¥62 hanno Flash, PSRAM, memoria a runtime e configurazione firmware identiche**, con ~¥36 (58 %) di differenza. Per MB di memoria sono ~¥3,06 contro ~¥7,29. Il denaro in più compra cose fuori dalla tabella delle capacità.

Altri tre punti:

1. **Prezzo unitario e prezzo assoluto spesso vanno in direzioni opposte.** La C3 è la più economica in assoluto, ma senza PSRAM i suoi 0,4 MB costano ~¥30/MB — dieci volte il livello 8 MB Octal. La C3 nasce per bassi consumi e ingombri minimi.
2. **Anche dentro la stessa serie ci sono compromessi.** L'XIAO standard / Sense da ~¥54 costa ~¥8 meno del Plus, con metà Flash e 7 GPIO in meno; però il Sense aggiunge fotocamera, microfono e SD, mentre lo standard è più piccolo e ha l'U.FL.
3. **Il salto tra architetture è il più grande.** Da C3 a S3 SuperMini FH4R2 sono ~¥10 in più e la memoria a runtime passa da 0,4 a 2,5 MB (6,25×), passando insieme a dual-core 240 MHz, istruzioni vettoriali e USB OTG. Non è un upgrade: è cambiare architettura.

<svg viewBox="0 0 900 420" width="100%" style="height:auto" role="img" aria-label="Grafico a dispersione del prezzo indicativo rispetto alla memoria a runtime, solo due dimensioni, senza informazioni sulla qualità">
  <title>Figura 6 · Prezzo × memoria a runtime: distribuzione su due dimensioni</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Solo due dimensioni: prezzo indicativo e memoria a runtime; RF, coerenza delle schede, ecosistema e manutenzione a lungo termine non sono sugli assi</text>
  <rect x="120" y="50" width="700" height="290" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="108" x2="820" y2="108" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="166" x2="820" y2="166" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="224" x2="820" y2="224" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="282" x2="820" y2="282" stroke="var(--line)" stroke-width="1"/>
  <line x1="320" y1="50" x2="320" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="520" y1="50" x2="520" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="720" y1="50" x2="720" y2="340" stroke="var(--line)" stroke-width="1"/>
  <rect x="132" y="60" width="178" height="42" rx="5" fill="var(--card)" stroke="var(--line-2)" stroke-width="1"/>
  <text x="144" y="78" font-size="11" fill="var(--ink)">Solo prezzo e memoria</text>
  <text x="144" y="94" font-size="11" fill="var(--ink)">nessuna dimensione qualità</text>
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
  <text x="20" y="400" font-size="12" fill="var(--ink-3)">↑ Memoria a runtime (MB)　→ Prezzo indicativo (¥)　I tre punti a 8,5 MB sono sulla stessa linea orizzontale: lo scarto di prezzo non viene dallo storage.</text>
</svg>

> **Figura 6** · Tre punti sulla stessa linea degli 8,5 MB: le differenze di prezzo non vengono dallo storage. Ciò che il grafico non mostra — RF, controllo qualità, documentazione — è spesso l'origine dello scarto.

In tabella (l'ultima colonna è solo il prezzo per capacità):

| Modello | Prezzo indicativo | Storage totale | Memoria a runtime | Prezzo per capacità (~¥ / MB runtime) | Multiplo di prezzo |
|---|---|---|---|---|---|
| C3 SuperMini | ~¥12 | 4 MB | 0,4 MB | ~¥30,00 | 1,00× |
| S3 SuperMini FH4R2 | ~¥22 | 6 MB | 2,5 MB | ~¥8,80 | 1,83× |
| S3 N16R8 MINI | ~¥26 | 24 MB | 8,5 MB | ~¥3,06 | 2,17× |
| XIAO S3 / Sense | ~¥54 | 16 MB | 8,5 MB | ~¥6,35 | 4,50× |
| XIAO S3 Plus | ~¥62 | 24 MB | 8,5 MB | ~¥7,29 | 5,17× |

### Cosa compra la differenza di prezzo

**Ciò che si può confrontare tra schede è il prezzo, non la qualità.** Lo stesso insieme di 16 MB Flash + 8 MB Octal PSRAM può ancora differire, una volta montato su una scheda, per:

- **RF e antenna**: adattamento, aree di keep-out e taratura decidono le prestazioni reali di WiFi / BLE, e la presenza o meno di un connettore U.FL è un altro discorso. Le lamentele tipiche delle schede economiche — segnale debole, instabile oltre una parete — non compaiono mai sulla scheda tecnica; si giudicano solo da design, certificazioni e RSSI misurato.
- **Controllo qualità**: protezione di alimentazione e USB, saldature, materiale del PCB, variazione tra lotti — tutto ciò influenza la stabilità a lungo termine e il rischio di problemi inspiegabili in debug.
- **Documentazione e manutenzione**: schemi, pinout, firmware di esempio, community, continuità di fornitura. Le schede di marca come XIAO di solito costano di più proprio qui, non per Flash o PSRAM migliori.
- **Conformità**: i design a die nudo non possono appoggiarsi alla certificazione RF di un modulo; la conformità RF a livello scheda va verificata a parte.

«Ottieni quello per cui paghi» vale in generale — **ma non si può usare al contrario**. Caro non significa migliore in tutto; premium di marca, margine di canale e differenze di bundle contano. Le schede senza marca variano di più volte tra mercati, mentre quelle di marca hanno prezzi globali abbastanza uniformi: rifate il confronto nel vostro mercato.

Un ordine più sicuro: **prima filtra le schede che «possono girare» per capacità, modalità PSRAM e configurazione firmware; poi confronta RF, stabilità, documentazione e fornitura; e solo alla fine guarda il prezzo.**

## 05 Tradurre la capacità in configurazione

Le capacità di una scheda tecnica non diventano da sole un firmware che giri. Cinque interruttori, tutti calcolabili prima dell'acquisto:

1. **Allineare Flash size all'hardware.** `CONFIG_ESPTOOLPY_FLASHSIZE_4MB / 8MB / 16MB` (o Flash Size in Arduino) deve corrispondere al die montato; impostato troppo grande, OTA o l'inizializzazione del filesystem sbatteranno su indirizzi inesistenti.
2. **Allineare la modalità PSRAM al cablaggio.** La 2 MB Quad nel package usa `CONFIG_SPIRAM_MODE_QUAD`; la 8 MB Octal usa `CONFIG_SPIRAM_MODE_OCT`; in Arduino sono `QSPI PSRAM` / `OPI PSRAM`. **Se sbagliata, la scheda non va più lenta: abortisce all'avvio.**
3. **Fare prima l'addizione delle partizioni.** Flash non equivale a spazio per il firmware: tabella delle partizioni, nvs, otadata e phy_init occupano prima una fetta, il resto si divide tra app e partizione dati. **La doppia OTA richiede uno slot di pari dimensione per la versione successiva** — circa `app × 2 + partizione dati + spese fisse`. Un firmware con stack di protocolli e libreria grafica occupa di solito 1~2 MB; raddoppiato per l'OTA si avvicina a 4 MB, e riservando 1 MB per font e immagini si sfora — è il punto in cui le schede da 4 MB cadono più spesso. Somma prima la dimensione reale del tuo firmware; se non ci sta, passa a 16 MB o torna all'OTA singola.
4. **Bilanciare i buffer PSRAM.** Framebuffer, buffer di handshake TLS, heap di decodifica JSON e immagini vivono in PSRAM; stima «somma dei buffer residenti di picco × 1,3» e confrontala con i livelli 2 MB / 8 MB. Buffer DMA, stack dei task e variabili statiche non possono andare in PSRAM di default: serve configurazione esplicita.
5. **Cambiare target tra architetture.** La C3 è RISC-V, la S3 Xtensa: `CONFIG_IDF_TARGET`, toolchain e configurazione SDK cambiano come un insieme; tutti i `CONFIG_SPIRAM_*` non si applicano alla C3 — non scriverli.

Una tipica configurazione 16 MB + Octal ha questo aspetto:

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
```

| Livello di capacità | Cosa impostare | Effetto pratico |
|---|---|---|
| 16 MB Flash + 8 MB Octal | `FLASHSIZE_16MB` + `MODE_OCT` + `SPEED_80M` | Doppia OTA e partizione dati entrano, con risorse comode |
| 8 MB Flash + 8 MB Octal | Come sopra, Flash size su `8MB` | La doppia OTA regge ancora, ma la partizione dati si riduce sensibilmente: font e immagini vanno dosate |
| 4 MB Flash + 2 MB Quad | `FLASHSIZE_4MB` + `MODE_QUAD` + tabella partizioni 4 MB | La doppia OTA di solito non entra: tipicamente OTA singola; ricalcola i buffer PSRAM su 2 MB |
| 4 MB Flash, senza PSRAM (C3) | `IDF_TARGET=esp32c3` + tabella partizioni 4 MB | Tutti i `SPIRAM_*` non applicabili; il budget di memoria è solo sulla SRAM interna |

In una frase: **prima di scegliere, fai tre conti** — il firmware e le risorse entrano nella Flash, i buffer di picco entrano nella PSRAM, le opzioni di configurazione corrispondono all'hardware reale. Passati tutti e tre, la scheda serve.

## 06 Come scegliere e cosa evitare

**Prima deduci la capacità da ciò che il programma richiede, poi scegli tra le schede che superano la soglia** — non ordinare per prezzo o per numeri di scheda tecnica:

| Cosa davvero necessaria al programma | Livello minimo sufficiente | Perché |
|---|---|---|
| Refresh a schermo intero a colori o in scala di grigi, framebuffer multilivello, font e immagini locali, streaming audio, oppure doppia OTA più filesystem | 16 MB Flash + 8 MB Octal PSRAM | 8,5 MB di memoria a runtime lasciano spazio a framebuffer e TLS, e la Flash contiene due copie di app più una zona di risorse |
| Refresh a schermo intero monocromatico, aggregazione di sensori, OTA singola, poco JSON | 4 MB Flash + 2 MB Quad PSRAM | 2,5 MB di memoria a runtime bastano, ma font e immagini devono essere piccoli |
| Solo report via rete, senza UI, priorità a consumo e dimensioni | 4 MB Flash, senza PSRAM (C3) | 0,4 MB coprono stack di protocolli e piccoli buffer, in cambio di basso consumo e dimensioni minime |
| Fotocamera / microfono / SD necessari, o vincolo di formato wearable | XIAO standard / Sense da 8 MB Flash | I vincoli rilevanti sono l'integrazione a livello scheda e il numero di pin, non la capacità |

Un criterio fuori dalla tabella ma che può escludere subito certe schede: **l'ampia gamma di temperatura**. La PSRAM Octal da 8 MB è classificata per −40~65 °C; per girare a 85 °C bisogna passare a un codice Quad nel package, o attivare l'ECC (perdendo 1/16 di capacità utile). Su questo punto, l'`S3 SuperMini FH4R2` è più flessibile.

Lista delle trappole da evitare:

- La PSRAM Octal da 8 MB occupa **GPIO33~37** — non riutilizzare i pin segnati come non disponibili nella documentazione.
- La `H` di `FH4R2` indica solo che il die Flash è in grado alta temperatura; **non significa che tutto il chip arrivi a 105 °C** — il datasheet attuale indica −40~85 °C.
- I design a die nudo non possono appoggiarsi alla certificazione RF di un modulo; per i prodotti, la conformità RF a livello scheda va verificata a parte. `ESP32-C3FN4` è marcato EOL sul sito Espressif: per nuovi design scegli un codice in produzione.
- Flash e PSRAM nel package condividono lo stesso set di linee SPI e i pin sono completamente occupati — **nessuna espansione di storage esterno è possibile**; per storage personalizzato bisogna ripartire da un codice non co-packaged e riprogettare.
- Le prestazioni reali dell'antenna non sono mai sulla scheda tecnica. Se la connessione è instabile o cade oltre le pareti, guarda prima l'area di keep-out dell'antenna e la presenza di un U.FL, poi misura il RSSI — questo tipo di feedback è comune su alcune schede economiche; non trattarlo subito come un bug del firmware.

### Costi oltre il prezzo

Un prezzo retail indicativo è solo il punto di partenza dell'hardware. Tra «una scheda che si accende» e «un prodotto che gira in modo stabile per anni» ci sono altri quattro blocchi di costo, nessuno legato a «quanti MB di Flash o PSRAM»: **ingegneria hardware** (termica, alimentazione e batteria, taratura antenna, EMC dell'apparecchio), **ingegneria software** (adattamento driver, sleep/wake, recupero errori, rollback OTA, compatibilità lungo termine), **certificazione di conformità** (EMC / RF dell'apparecchio, accesso al mercato) e **produzione e post-vendita** (resa, coerenza dei lotti, ricambi per riparazioni).

La loro entità varia enormemente in base alla forma del prodotto e non compare mai sulla pagina del prodotto. Quindi questo articolo confronta **parametri hardware al momento della scelta**, non la struttura dei costi di un prodotto finito: leggere bene le schede tecniche evita di comprare la scheda sbagliata; cosa resta da investire dopo che la scheda è arrivata lo decide il progetto.

---

**Fonti e metodo**: Espressif *ESP32-S3 Series Datasheet v2.2*, tabelle 1-1 / 2-14 / 5-11 / 5-12; *ESP32-C3 Series Datasheet*; *ESP32-S3-WROOM-1 & 1U Datasheet*, tabelle 1-1 / 1-2 (nove codici d'ordine, tipi di Flash e PSRAM, range di temperatura, dimensioni del modulo); *ESP32-S3-WROOM-2 Datasheet* (SPI a 1,8 V e livelli da 32 MB di Flash); wiki ufficiale e specifiche della serie Seeed Studio XIAO ESP32-S3; documentazione pubblica del produttore della scheda S3 N16R8 MINI; ESP-IDF *Support for External RAM* e la documentazione di configurazione delle schede di Arduino-ESP32. Le capacità sono nominali; l'heap realmente allocabile con `malloc()` è leggermente minore. Banda della PSRAM, range di temperatura e occupazione GPIO seguono il più recente datasheet di ciascun codice. I prezzi in questo articolo sono **cifre indicative in yuan cinesi (CNY)** da canali retail pubblici a 2026-11, con il metodo descritto nella sezione 04; non costituiscono una valutazione di qualità né consiglio d'acquisto.
