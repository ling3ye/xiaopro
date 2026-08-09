---
title: "Domare il CH32V307 su Mac da zero: dalla 'valanga di virus Windows' al 'LED che lampeggia e seriale che parla' — cronaca di tutte le trappole"
domain: hardware
platforms: ["mac"]
format: "tutorial"
date: 2026-08-08
intro: "Configuri da zero l'ambiente CH32V307 su Mac, installi la piattaforma PlatformIO e scopri che la toolchain ti scarica una sfilza di .exe Windows? Questo articolo ripercorre la cronaca vera delle trappole incontrate: sostituire a mano la toolchain RISC-V nativa macOS, sbloccare la quarantena di Gatekeeper, far comunicare il WCH-Link di bordo per il flash, fino ad arrivare alla vera radice del «compilazione e flash OK, la seriale stampa ma il LED si rifiuta di lampeggiare» — il LED utente di bordo in fabbrica non è proprio collegato al MCU. Tutti i comandi e gli errori sono stati eseguiti sul serio, e tutte e 10 le trappole sono messe in fila senza lasciarne indietro neanche mezza, per vaccinare in anticipo chi sta arrivando da Arduino/ESP."
tags: ["CH32V307", "CH32V su macOS", "PlatformIO", "WCH-Link", "WCH", "microcontrollore RISC-V", "embedded macOS"]
image: https://img.lingflux.com/2026/08/d9106f173bc51c93033527dd5e206b04.png
---

> Lingshun Lab · Cronaca embedded delle trappole
>
> Hardware: **CH32V307V-EVT-R1** (debugger WCH-Link di bordo, chip RISC-V di WCH)
> Sistema: **macOS (Apple Silicon, arm64)**
> Strumenti: VSCode + PlatformIO
> Obiettivo: tirare su l'ambiente di sviluppo da zero, far lampeggiare un LED e far parlare la porta seriale — l'universale "Hello World" nel mondo embedded

## Premessa: perché esiste questo articolo

Prima di tutto presento il mio "ruolo", così quando più avanti vedrai certe mie mosse non borbottaio fra te "questo tizio ha mai davvero programmato un microcontrollore?".

Bazzico Arduino ed ESP-IDF da un bel po' di anni: far lampeggiare un LED, connettermi al WiFi, far girare MQTT sono operazioni diventate memoria muscolare, riesco ad accendere un LED anche a occhi chiusi. Quindi, quando ho preso in mano questa CH32V307, mi ero fatto i conti in tasca: "è solo cambiare chip, quanto sarà mai difficile far lampeggiare un LED?".

La realtà mi ha dato una bella lezione. L'"impostazione di fabbrica" dell'ecosistema CH32 non c'entra niente con la visione del mondo Arduino ed ESP, dove "colleghi, flashi, scrivi giusto e si accende":

- **Per flashare un programma devi chiamare in causa un programmatore dedicato**: Arduino ed ESP32 fanno fare a un unico cavo USB alimentazione, flash e seriale; la CH32 invece mi ha rifilato un debugger di bordo chiamato **wlink**, e solo per capire "ma come diamine fa a infilare il firmware nel chip" ho dovuto fare un bel po' di giri.
- **Il LED di bordo non è collegato al MCU**: sulla scheda Arduino il LED integrato è saldato sul pin 13, un `digitalWrite(13, HIGH)` e si accende; il LED utente su questa scheda... **è letteralmente "staccato" in fabbrica, non collegato a nessun pin**, devo prendere io un cavetto jumper e portarlo fin lì, solo così il LED si degna di accennare un lampeggio.
- **Anche la seriale va cercata dal lato giusto**: su ESP32 colleghi ed ecco la seriale USB, WYSIWYG; la CH32 invece passa di default dalla USART1 virtualizzata dal debugger, e se la porta è sbagliata c'è solo silenzio, ti tocca fissare il monitor vuoto chiedendoti se la scheda sia morta.

In quel momento ho capito bene cosa si intende per "un veterano che fa una brutta figura": faccio lampeggiare LED da più di dieci anni e mi sono incastrato su un micro RISC-V fino a dubitare di me stesso, stavo quasi per convincermi che tutto l'embedded imparato in questi anni fosse andato sprecato.

Quindi questo non è solo un "tutorial", ma il **diario delle trappole** di un utente storico di Arduino/ESP alla prima volta con CH32. Tutte le mie cantonate pietose, che a un esperto sembreranno assurde, le metto qui per filo e per segno — perché per chi, come te, sta arrivando da Arduino/ESP è molto probabile che le farai tutte uguali. Un piccolo vaccino preventivo e le trappole ti sembreranno molto più amichevoli.

---

Finito il ruolo, torniamo al sodo. Se cerchi "CH32V307 + Windows" trovi l'ufficiale MounRiver Studio, installi e funziona; se cerchi "CH32V307 + Linux" anche la toolchain ufficiale è servita e spolverata.

Ma se cerchi "CH32V307 + macOS"... molto probabilmente precipiterai nel silenzio. Le informazioni sono sparse e con buche ovunque. Il chip in sé se la cava alla grande: core RISC-V a 32 bit, fino a 144 MHz, rapporto qualità-prezzo che manda in crisi un mucchio di MCU ARM — ma su Mac è proprio "solo e abbandonato".

Questo articolo è la cronaca completa di come ho tirato su da zero l'ambiente di sviluppo CH32V307 su Mac, trappola dopo trappola, fino ad accendere il LED e far parlare la seriale. **Non salterò nessuna trappola**, perché è probabile che tu ci metterai il piede nelle stesse; mettendole tutte sul tavolo risparmierai un sacco di strada. Il codice è su GitHub (link a fine articolo), il compito di questo articolo è spiegare per bene il "perché lo facciamo".

Anticipo subito il risultato finale: compilazione OK, flash OK, il LED sulla scheda lampeggia a ritmo costante e il monitor seriale stampa in parallelo:

```
CH32V307 booted, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

Da "niente di niente" a questa scena, in mezzo ho inciampato in almeno **8 trappole**. Prosegui nella lettura, non ne salteremo mezza.

### Indice

- [1. Conosciamo il protagonista: CH32V307V-EVT-R1](#1-conosciamo-il-protagonista-ch32v307v-evt-r1)
- [2. L'idea generale: com'è fatta questa toolchain](#2-lidea-generale-come-e-fatta-questa-toolchain)
- [3. Si parte: da VSCode al comando pio](#3-si-parte-da-vscode-al-comando-pio)
- [4. Installare la piattaforma CH32V (e la prima piccola trappola)](#4-installare-la-piattaforma-ch32v-e-la-prima-piccola-trappola)
- [5. La trappola grossa: perché spuntano fuori un mucchio di .exe](#5-la-trappola-grossa-perche-spuntano-fuori-un-mucchio-di-exe)
- [6. Via d'uscita: passare alla toolchain nativa macOS](#6-via-discita-passare-alla-toolchain-nativa-macos)
- [7. Sbloccare la quarantena di Gatekeeper](#7-sbloccare-la-quarantena-di-gatekeeper-altrimenti-macos-lo-tratta-da-virus)
- [8. Verificare che la toolchain giri davvero](#8-verificare-che-la-toolchain-giri-davvero)
- [9. Creare il primo progetto: conosciamo platformio.ini](#9-creare-il-primo-progetto-conosciamo-platformioini)
- [10. La prima compilazione](#10-la-prima-compilazione)
- [11. Rendere pio un comando globale](#11-rendere-pio-un-comando-globale)
- [12. Collegamento hardware e flashing](#12-collegamento-hardware-e-flashing)
- [13. Trappola 1: silenzio assoluto sulla seriale](#13-trappola-1-compilazione-e-flash-ok-seriale-muta)
- [14. Trappola 2: il LED si rifiuta di accendersi (la più grossa dell'articolo)](#14-trappola-2-la-piu-grossa-dellarticolo-la-seriale-parla-ma-il-led-non-si-accende-mai)
- [15. Il codice completo che gira alla fine](#15-il-codice-completo-che-gira-alla-fine-come-e-fatto-mainc)
- [16. Tabella riassuntiva delle trappole](#16-tabella-riassuntiva-delle-trappole)
- [17. Scheda di riferimento: comandi chiave e percorsi file](#17-scheda-di-riferimento-comandi-chiave-e-percorsi-file)
- [18. Costruirsi un "metodo di sviluppo CH32" tutto proprio](#18-costruirsi-un-metodo-di-sviluppo-ch32-tutto-proprio-per-ricopiarlo-sul-prossimo-progetto)
- [19. Domande frequenti FAQ](#19-domande-frequenti-faq)
- [20. Cosa fare dopo aver fatto girare tutto](#20-dopo-aver-fatto-girare-tutto-cosa-si-puo-fare-ancora)
- [21. Riferimenti](#21-riferimenti)

---

## 1. Conosciamo il protagonista: CH32V307V-EVT-R1

Prima di partire, dedichiamo due minuti a questa scheda, perché il 90% delle trappole più avanti ha a che fare con la sua "personalità".

| Caratteristica | Descrizione |
| --- | --- |
| Chip principale | CH32V307VCT6, core QingKe V4F di WCH, RISC-V a 32 bit, frequenza massima **144MHz**, package LQFP80 |
| Capacità Flash effettiva | **288KB** (ma PlatformIO compila per default con 256KB Flash + 64KB SRAM, più avanti spieghiamo perché non va cambiato) |
| Debugger di bordo | **WCH-Link** (in realtà realizzato "in prestito" con un chip CH32V305, equivalente al WCH-LinkE ufficiale) |
| Porta USB | Una USB-C che fa alimentazione, debug e seriale virtuale in un colpo solo |
| LED utente | Due LED, LED1 e LED2 — **⚠️ di default sono sospesi, non collegati al MCU!** (è la trappola più grossa dell'articolo, trattata nel capitolo 14) |
| Pulsante utente KEY | Anche lui sospeso di default |
| LED di alimentazione | 1, acceso fisso appena alimentato, non c'entra niente col tuo codice — tanta gente lo vede acceso all'accensione e pensa "ho fatto lampeggiare il LED!", invece è solo il led di potenza |

Sulla scheda c'è anche un dettaglio facile da sottovalutare: fra il chip del debugger di bordo (CH32V305) e il chip target (CH32V307), in fabbrica ci sono **4 jumper** (serigrafia `RX1-TX0`, `TX1-RX0`, `DIO-DIO0`, `CLK-CLK0`) che li collegano, e fanno "passare il ponte" al chip target sia il segnale SWIO del debugger sia i segnali della seriale.

> ⚠️ **Questi 4 jumper sono già montati in fabbrica, per favore non toglierli per sbaglio**. Se li levi, nel migliore dei casi non flashi più niente, nel peggiore la seriale sparisce, e ti convincerai di avere sbagliato il codice quando in realtà si è interrotto un collegamento hardware — e dopo ore di troubleshooting scopri che era colpa dei jumper. Molto destabilizzante, non chiedermi come lo so.

Ok, presentations fatte, si comincia a costruire l'ambiente.

---

## 2. L'idea generale: com'è fatta questa toolchain

Partiamo con una "foto di famiglia", per capire chi comanda chi:

```
┌──────────────────────────────────────────────────────────┐
│  VSCode + estensione PlatformIO IDE (GUI: compile/flash/debug/seriale) │
│                          │                                │
│                   PlatformIO Core (riga di comando pio)   │
│                          │                                │
│            ┌─────────────┴──────────────┐                 │
│       piattaforma ch32v (manutenuta dalla community: Community-PIO-CH32V) │
│            │                             │                 │
│   ┌────────┼─────────┬───────────┐       │                 │
│ toolchain  wlink    openocd    board     │                 │
│(RISC-V GCC)(flash)  (debug)   (def. scheda)│                │
└──────────────────────────────────────────┘
                     │ USB
        CH32V307V-EVT-R1 (WCH-Link di bordo)
```

![](https://img.lingflux.com/2026/08/73dff7f41fe1d3c38d06447b98a39f2b.png)

**In una frase**: l'estensione PlatformIO di VSCode è il frontend, il lavoro vero lo fa lo strumento a riga di comando `pio`; `pio` dipende da una piattaforma community chiamata `Community-PIO-CH32V`, che impacchetta insieme "compilatore (toolchain) + strumento di flash (wlink) + strumento di debug (openocd) + parametri della scheda (board)" — in teoria una volta installata è pronta.

Questa piattaforma community è piuttosto fornita: supporta nativamente tutta la serie CH32V003/103/203/30x, e mette a disposizione diversi framework di sviluppo — la libreria periferica ufficiale WCH (noneos-sdk), FreeRTOS, RT-Thread, Arduino, ch32fun e così via.

Ma — ed è qui la curva più stretta di tutto l'articolo — **la piattaforma è configurata di default per le abitudini degli utenti Windows**, e chi è su macOS una volta installata probabilmente resta di sasso. Che genere di sasso, lo vediamo subito.

---

## 3. Si parte: da VSCode al comando pio

### Step 0: controlla l'ambiente di base

Apri il terminale e fa' un primo sondaggio:

```bash
python3 --version          # serve 3.x
brew --version              # Homebrew, non obbligatoria ma fortemente consigliata
uname -m                    # Apple Silicon deve restituire arm64, Intel Mac x86_64
```

Poi installa VSCode + l'estensione PlatformIO:

1. Vai su https://code.visualstudio.com/, scarica e installa VSCode;
2. Apri VSCode, icona "Estensioni" sulla sinistra → cerca `PlatformIO IDE` → Install;
3. A installazione fatta, l'estensione scarica automaticamente PlatformIO Core in `~/.platformio/` (qualche centinaio di MB, con anche un ambiente virtuale Python dedicato), in basso a destra vedi la barra di avanzamento, pazienta qualche minuto.

Alla fine sulla barra laterale sinistra spunta un'icona a forma di formica: è il logo di PlatformIO (la loro mascotte è davvero una formica).

### Step 1: trova il comando pio nascosto

Una volta installata l'estensione, il tool da riga di comando `pio` in realtà c'è già, solo che non è stato aggiunto al PATH di sistema, e se digiti `pio` nel terminale non lo trova. Se ne sta qui:

```bash
~/.platformio/penv/bin/pio
```

Verifica:

```bash
~/.platformio/penv/bin/pio --version
# PlatformIO Core, version 6.1.19
```

Per comodità dei comandi che seguiranno, impostiamo una variabile temporanea (vale solo nel terminale corrente):

```bash
PIO=~/.platformio/penv/bin/pio
```

Tutte le volte che in questo articolo comparirà `$PIO`, si intende proprio questo percorso. Una volta sistemato tutto, nel punto 9 lo configureremo come comando globale, così potrai scrivere direttamente `pio`.

---

## 4. Installare la piattaforma CH32V (e la prima piccola trappola)

Usa il comando di package management di PlatformIO per installare la piattaforma community:

```bash
$PIO pkg install -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git
```

In questo passo ci sono due dettagli dove è facilissimo cadere a faccia in giù:

> **Trappola 1: il nome dell'organizzazione è facile da sbagliare.** Il nome corretto dell'organizzazione GitHub è `Community-PIO-CH32V` (nota le tre lettere **PIO** in mezzo, tutte maiuscole). Parecchi articoli e post vecchi in rete scrivono `community-ch32v` (manca PIO), e se copi alla lettera ottieni un errore parecchio frustrante:
> ```
> remote: Repository not found.
> ```
> Copia esattamente `Community-PIO-CH32V`.

> **Trappola 2: usare un comando vecchio.** I tutorial di una volta scrivono volentieri `pio platform install ...`, ma in PlatformIO nuovo questo comando è **deprecato**, e ricevi `This command is deprecated`. Adesso si usa in modo uniforme la sintassi `pio pkg install -g -p <indirizzo>`.

Il comando parte e si tira giù in sequenza i quattro pacchetti: piattaforma, toolchain RISC-V, openocd, wlink. Sembra tutto a posto, nessun errore nel log. **Però per favore non stappare lo champagne** — la trappola vera arriva adesso.

---

## 5. La trappola grossa: perché spuntano fuori un mucchio di `.exe`

Questa è la sezione col maggior contenuto tecnico dell'articolo, ed è dove la stragrande maggioranza degli utenti macOS si incarta e inizia a dubitare di se stessa.

Finita l'installazione della piattaforma, controlliamo che cosa si è scaricato davvero in locale:

```bash
ls ~/.platformio/packages/toolchain-riscv/bin/ | head
# riscv-none-embed-addr2line.exe
# riscv-none-embed-ar.exe
# riscv-none-embed-as.exe
# ...
```

Controlliamo anche lo strumento di flash wlink:

```bash
file ~/.platformio/packages/tool-wlink/wlink.exe
# PE32 executable (console) Intel 80386, for MS Windows
```

Visto? Sono tutti **`.exe`** — binari Windows PE32 veri e propri, su macOS sono ferro vecchio, non si aprono nemmeno col doppio clic, figuriamoci compilare codice. La sensazione la prima volta che ti capita è tipo: "io sono su Mac, e tu mi mandi roba per Windows, che significa?".

### Scavando nella causa: il problema sta in `platform.json`

Apriamo il file di configurazione della piattaforma:

```bash
cat ~/.platformio/platforms/ch32v/platform.json | python3 -m json.tool | grep -A3 toolchain-riscv
```

Risultato:

```json
"toolchain-riscv": {
  "type": "toolchain",
  "owner": "platformio",
  "version": "https://github.com/Community-PIO-CH32V/toolchain-riscv-windows.git"
}
```

**Mistero svelato**: il file di configurazione della piattaforma ha **scritto hard-coded** la sorgente della toolchain come `toolchain-riscv-windows.git`, e anche lo strumento di flash wlink è fissato al branch `#windows`. PlatformIO durante l'installazione non è che controlli intelligentemente "che sistema stai usando" — installa quello che c'è scritto, e lo serve uguale a tutti, versione Windows compresa: noi poveri utenti Mac inclusi.

**La buona notizia**: la stessa organizzazione `Community-PIO-CH32V` ha da tempo pronto un repo con la versione nativa per macOS, semplicemente non è il default. Una volta capita la radice, la contromossa fila via liscia — **sostituire a mano i due pacchetti Windows con le rispettive versioni native macOS**. Come si fa nel dettaglio e cosa occhio a ogni passo, lo vediamo nel prossimo capitolo.

---

## 6. Via d'uscita: passare alla toolchain nativa macOS

### 6.1 Sostituire il compilatore RISC-V

Cancelliamo prima la versione Windows sbagliata:

```bash
rm -rf ~/.platformio/packages/toolchain-riscv
```

E installiamo quella nativa macOS:

```bash
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/toolchain-riscv-mac.git
```

A installazione riuscita riceverai un messaggio tipo:

```
Tool Manager: toolchain-riscv@1.80200.190731+sha.99cb62f has been installed!
```

Dopo l'installazione puoi verificare che nel suo `package.json` c'è scritto `"system": ["darwin_x86_64", "darwin_arm64"]`, conferma che è destinato a macOS; il nome del pacchetto resta `toolchain-riscv`, quindi sostituisce senza intoppi la versione Windows precedente.

> **Perché qui si usa il branch `main` e non il branch `gcc12`, che sembra più recente?**
>
> C'è un dettaglio tecnico piuttosto nascosto. Nello script di build della piattaforma (`builder/main.py`) c'è un pezzetto di logica:
> ```python
> is_gcc_12 = platform.get_package_version("toolchain-riscv").split(".")[1].startswith("12")
> compiler_triple = "riscv-wch-elf" if is_gcc_12 else "riscv-none-embed"
> ```
> In parole povere: lo script legge il **secondo segmento del numero di versione** della toolchain installata. Se è `1.8.x` decide che il prefisso degli eseguibili del compilatore è `riscv-none-embed-gcc`; se è `1.12.x`, che sia `riscv-wch-elf-gcc`. I due prefissi corrispondono a nomi di eseguibili completamente diversi; se sbagli, il comando che lo script di build richiama non esiste su disco e va direttamente in errore.
>
> Il branch `main` produce per l'appunto la versione `1.80200.190731` (corrispondente a gcc 8.2.0), uguale a quella Windows che la piattaforma aveva hard-coded di default: si attiva quindi la via `riscv-none-embed`, in perfetto accordo con quanto lo script si aspetta. Zero rischi, massima stabilità.

Dopo l'installazione, un dettaglio a cui badare:

> ⚠️ **Questo compilatore gcc8 è in realtà un eseguibile x86_64**, cioè pensato per i Mac Intel, non arm64 nativo per Apple Silicon. Il motivo è semplice: xPack (chi impacchetta la toolchain a monte) all'epoca di gcc8 non aveva ancora build arm64. Quindi sui Mac serie M il compilatore gira **tradotto da Rosetta 2**. Sembra poco "nativo", ma nei test compila senza il minimo problema, non farti prendere dall'ansia: il primo avvio il sistema ti propone di installare Rosetta, confermi ed è fatta.

### 6.2 Sostituire lo strumento di flash wlink

Stessa manovra, scambiamo la wlink Windows con quella nativa macOS:

```bash
rm -rf ~/.platformio/packages/tool-wlink
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_arm64
```

> Se sei su un Mac Intel col processore vecchio, il branch diventa `mac_x64`:
> ```bash
> $PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_x64
> ```

Conferma dell'installazione:

```
Tool Manager: tool-wlink@0.23.241116+sha.0c802d4 has been installed!
```

> **openocd non va toccato, è già a posto.** `openocd` (lo strumento di debug) arriva dal registro ufficiale di PlatformIO, non è tirato giù direttamente da `Community-PIO-CH32V`; il registro ha di suo la capacità di scegliere l'architettura corretta in base al sistema operativo, quindi su Apple Silicon ti ritrovi già la build nativa arm64. Puoi verificarlo:
> ```bash
> file ~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd
> # Mach-O 64-bit executable arm64  ✅ tranquillo, questo è a posto
> ```

### 6.3 Importante correzione: in realtà la versione finalmente stabile è gcc12 / arm64 nativa

A questo punto devo inserire una sincerità capitale, e si tratta di una **autocorrezione**: il ragionamento di 6.1 sul "perché usare il branch main (gcc8)" l'avevo tirato fuori leggendo solo lo script di build della piattaforma — un'**ipotesi teorica**. La logica dello script in sé è corretta, ma "quale versione conviene installare per stare tranquilli" non lo si capisce solo leggendo il codice: alla fine bisogna prendere la macchina vera, compilare, flashare e vedere se gira.

**Tirando le somme sull'ambiente che ha davvero superato la prova su scheda, compilazione e flash, il risultato è: la versione realmente stabile e nativa arm64 per Apple Silicon (senza Rosetta) è gcc 12.2.0, con prefisso `riscv-wch-elf-gcc`.** Il timore che "il branch gcc12 sia una mina, magari gli eseguibili corrispondenti nemmeno esistono" in pratica non si è concretizzato — questa versione della toolchain non solo esiste, ma è la più completa, la più recente e la più liscia della serie, e porta in regalo anche il debugger GDB, tutto in un colpo.

La conclusione si capovolge: **se devi installare adesso, punta direttamente a gcc 12.2.0 / arm64 nativa / `riscv-wch-elf-gcc`**. La via gcc8/x86_64 su Rosetta descritta in 6.1 vale come fallback del tipo "se ti è uscita questa versione niente panico, funziona lo stesso": non devi andarcela a cercare.

Se ho lasciato in articolo questo pezzo di "ipotesi sbagliata e poi corretta", senza riscriverlo in silenzio fingendo nulla, è perché in sé è un'esperienza che vale: **leggere lo script di build e osservare il pattern dei numeri di versione ti aiuta a capire "perché è così"; ma su "quale versione installare davvero", un giudizio conclusivo lo puoi dare solo provando a compilare e flashare sul serio. Basarsi solo sul ragionamento sul codice può portarti a conclusioni troppo prudenti.**

### 6.4 Conferma finale dell'ambiente: specifiche tecniche complete

Quella che segue è l'informazione completa ottenuta dissezionando per filo e per segno l'ambiente che ha effettivamente compilato e flashato con successo. Ti consiglio di usare questa configurazione come target di riferimento:

| Categoria | Componente / campo | Valore |
| --- | --- | --- |
| Compilatore | Nome | xPack GNU RISC-V Embedded GCC (**versione personalizzata WCH**, la stessa fornita con MounRiver Studio) |
| Compilatore | Nome eseguibile | `riscv-wch-elf-gcc` (tutta la suite usa il prefisso `riscv-wch-elf-`) |
| Compilatore | Versione GCC | **12.2.0** |
| Compilatore | Triple di destinazione (target triple) | `riscv-wch-elf` |
| Compilatore | Host di build/esecuzione (host) | `aarch64-apple-darwin23.6.0` (**nativo Apple Silicon**, senza Rosetta) |
| Compilatore | ABI di default | `ilp32` (32 bit, calling convention soft-float) |
| Compilatore | ARCH di default | `rv32imac` (I interi / M moltiplica-dividi / A atomici / C istruzioni compresse) |
| Compilatore | Specifica ISA | 2.2, multilib attivo |
| Compilatore | Modello thread | single (bare metal, senza OS) |
| Compilatore | Libreria C standard | **newlib 4.2.0** (è lei a fornire `printf` e le altre funzioni di libreria standard) |
| Compilatore | binutils (assemblatore/linker) | **GNU binutils 2.38** (`as`, `ld.bfd`, `objcopy` arrivano da qui) |
| Compilatore | Debugger | La toolchain include già `riscv-wch-elf-gdb`, non serve installarlo a parte |
| Compilatore | Percorso dei binari | `~/.platformio/packages/toolchain-riscv/bin/` |
| Compilatore | sysroot | `~/.platformio/packages/toolchain-riscv/riscv-wch-elf/` |
| Compilatore | Nome / versione pacchetto PIO | `toolchain-riscv` @ `1.120200.220829` |
| Compilatore | Sorgente | xPack (`riscv-none-elf-gcc-xpack`), basato su GCC 12.2.0 a monte |
| Ambiente di compilazione | PlatformIO Core | 6.1.19 |
| Ambiente di compilazione | Piattaforma platform-ch32v | 1.1.0 (manutenuta da Community-PIO-CH32V) |
| Ambiente di compilazione | Framework framework-wch-noneos-sdk | 2.30000.0 (libreria periferica standard WCH, bare metal) |
| Ambiente di compilazione | Sistema di build | PlatformIO built-in (basato su SCons + Python) |
| Ambiente di compilazione | Chip target | CH32V307VCT6, ChipID `0x30700568`, QingKe V4F @144MHz |
| Ambiente di upload | Strumento di upload | **wlink 0.1.1** (in uso davvero; pacchetto PIO `tool-wlink` @ `0.23.241116`) |
| Ambiente di upload | Protocollo di upload | `wlink` (corrisponde al campo `upload_protocol` in `platformio.ini`) |
| Ambiente di upload | Firmware del debugger | WCH-Link v2.18 (v38), hardware basato su CH32V305 |
| Ambiente di upload | Alternativa: OpenOCD | `0.11.0+dev-snapshot` (2026-02-28), pacchetto PIO `2.1100.260228` |
| Ambiente di upload | Alternativa: wchisp | `0.2.3`, pacchetto PIO `0.23.240914` |
| Ambiente di upload | Alternativa: minichlink | `0.1.0` |

> Attenzione a non confondere: **la versione reale del compilatore è GCC 12.2.0**; `1.120200.220829` è il numero che PlatformIO attribuisce al pacchetto (più o meno `1.` + `12.2.0` + `0` + data di impacchettamento `220829`), non la versione del compilatore: non mescolarle.

**La suite completa di toolchain** (tutti col prefisso `riscv-wch-elf-`, in tutto 30 eseguibili, installati in un colpo solo):

- **Compilazione/link comuni**: `gcc` `g++` `c++` `cpp` `ld` `ld.bfd` `as`
- **Trattamento binari**: `objcopy` `objdump` `readelf` `nm` `size` `strip` `strings` `addr2line`
- **Strumenti di archivio**: `ar` `ranlib` `gcc-ar` `gcc-nm` `gcc-ranlib`
- **Debug/analisi**: `gdb` `gdb-py3` `gprof` `gcov` `gcov-tool` `gcov-dump`
- **Altri**: `gfortran` `elfedit` `c++filt` `lto-dump`

Questa lista non la devi imparare a memoria, tienila come dizionario: ad esempio in futuro vuoi sapere quanto occupa una funzione dopo la compilazione, vai su `riscv-wch-elf-size`; per disassemblare le istruzioni generate, usa `riscv-wch-elf-objdump -d`. Tutti questi strumenti, dal momento in cui hai installato la toolchain, se ne stanno tranquilli dentro `~/.platformio/packages/toolchain-riscv/bin/`.

### 6.5 Tenere dietro alle versioni del compilatore e aggiornarlo: dove vedere l'ultima versione, come aggiornare

La toolchain non è "installata una, sistemata per sempre": la versione community continua ad aggiornarsi. Ma per capire "come stare dietro all'ultima versione" bisogna prima fare i conti con un fatto che confonde facilmente: **la tua toolchain è una "matrioska a tre strati", con in più due "ultime versioni" diverse.**

**Da riconoscere prima: struttura a tre strati + due "ultime"**

| Strato | Cos'è | Ultima oggi | Frequenza di aggiornamento |
| --- | --- | --- | --- |
| ① Quello che usi davvero in PIO (versione WCH) | Triple `riscv-wch-elf` + patch specifiche WCH per il core QingKe | **GCC 12.2.0** (quello che hai installato) | **Praticamente ferma**, 12.2.0 da tanto |
| ② Chi impacchetta ① | Community-PIO-CH32V ripacchettizza ① in un pacchetto PIO | Uguale (nome release `riscv-none-embed-gcc 12.2.0-3`) | Segue ① |
| ③ Il più a monte (vanilla) | GCC RISC-V generico di xPack, **senza patch WCH** | **GCC 15.2.0** (2025-10-23) | In continuo aggiornamento, segue GNU GCC a monte |

> **Promemoria chiave**: quando in rete si dice "la versione community si aggiorna di continuo", si parla dello strato ③ (xPack, arrivato a 15.2.0), non dello strato ① che usi davvero su CH32V (versione WCH, ferma a 12.2.0). Le due linee **non vanno confuse** — se sostituisci il tuo compilatore attuale con xPack 15.2.0 ci perdi le patch specifiche che WCH ha aggiunto al core QingKe, e su certe funzionalità CH32V le cose potrebbero non girare più. **Per lo sviluppo CH32V l'approccio corretto è seguire ①②, non rincorrere ciecamente ③.**
>
> Una competenza di contorno: la stringa di identità completa del tuo compilatore `riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0` si legge a colpo d'occhio in tre informazioni — `wch-elf` è il marchio WCH, `xPack` è chi impacchetta a monte, `arm64` dice che è nativo Apple Silicon.

**Come scoprire quale versione hai installato davvero**

```bash
# 1. Vedere la versione del pacchetto PIO (il numero interno di PlatformIO, non coincide con quella del compilatore)
pio pkg list | grep -i riscv

# 2. Vedere l'identità completa del compilatore (versione, triple di destinazione, ABI, ARCH, host di build; la riga che vale la pena ricordare)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc -v

# 3. Vedere la versione della libreria C (newlib) — è lei a implementare printf
grep "_NEWLIB_VERSION" ~/.platformio/packages/toolchain-riscv/riscv-wch-elf/include/_newlib_version.h

# 4. Vedere la versione di binutils (assemblatore/linker)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-ld.bfd --version

# 5. Vedere da quale sorgente platform.json "fissa" la toolchain (decide quale repo viene tirato giù in fase di upgrade)
grep -A3 '"toolchain-riscv"' ~/.platformio/platforms/ch32v/platform.json
```

**Dove vedere l'ultima versione (tre canali, in ordine di rilevanza per te)**

- **Canale 1: WCH ufficiale / MounRiver (la vera sorgente della versione WCH, il più rilevante)**. Il triple `riscv-wch-elf` e le patch al core WCH nascono su MounRiver Studio di WCH — nelle informazioni di build del tuo compilatore il path di build è `/Users/mrs/...` (mrs = MounRiver Studio), ed è da lì che viene. Pagina di download: `www.mounriver.com` (cerca «MounRiver Studio» e «Toolchain»); repo ufficiale dell'SDK: `github.com/openwch`. L'attuale serie di toolchain MRS è v1.91 (le note di release di Community-PIO-CH32V dicono testualmente "Update toolchain to v1.91").
- **Canale 2: build Community-PIO-CH32V (quello che usi davvero in PIO)**. In pratica è la toolchain WCH di MounRiver ripacchettizzata come pacchetto PlatformIO; seguendo le sue releases sai in tempo reale quando PIO fa il suo backtrack: `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`. Per ricevere notifiche subito: in alto a destra Watch → Custom → Releases, oppure tramite RSS: `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases.atom`.
- **Canale 3: upstream xPack (vanilla, il più veloce, solo per informazione)**: releases su `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack/releases`, lo storico più completo su `npmjs.com/package/@xpack-dev-tools/riscv-none-elf-gcc`, l'ultima oggi è 15.2.0-1.1.

**Come aggiornare (e una trappola da evitare)**

```bash
# Aggiorna l'intera piattaforma ch32v (framework e toolchain insieme — si aggiorna davvero solo quando Community-PIO-CH32V rilascia una nuova versione)
pio pkg update -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git

# Oppure aggiorna solo il pacchetto della toolchain
pio pkg update -g -t toolchain-riscv
```

> ⚠️ **La trappola da evitare in fase di upgrade (richiama la Q3 della FAQ, capitolo 19)**: abbiamo visto nel capitolo 5 che `platform.json` ha la sorgente della toolchain **hard-coded sul repo Windows**. Questo significa che se lanci `pio pkg update` oppure reinstalli la piattaforma, c'è un grosso rischio che la tua versione macOS faticosamente sostituita a mano **venga ricoperta dalla versione Windows**. Se capita, ridai le istruzioni di sostituzione di 6.1 / 6.2 e si sistema; per risolvere alla radice, fai un fork del repo piattaforma, modifica `platform.json` perché punti di default alla versione macOS, e chiudi la questione per sempre.
>
> Ribadisco la direzione: l'aggiornamento serve a prendere la nuova **toolchain WCH** che Community-PIO-CH32V mette in fila, non a rincorrere xPack 15.2.0. Su PIO con CH32V fate riferimento sempre a ①② (versione WCH).

---

## 7. Sbloccare la quarantena di Gatekeeper (altrimenti macOS lo tratta da "virus")

macOS ha un meccanismo di sicurezza: ogni qual volta un eseguibile arriva via rete (anche `git clone` conta), il sistema gli appiccica un'etichetta di quarantena chiamata `com.apple.quarantine`. Se il file non è firmato da Apple, all'avvio viene bloccato sul nascere con un errore che di solito si presenta così:

```
"xxx" cannot be opened because the developer cannot be verified
```

O, ancora più terra terra:

```
killed: 9
```

Il compilatore e il flasher che abbiamo appena installato sono proprio il classico "non firmato, scaricato da rete", quindi conviene togliere in anticipo l'attributo di quarantena:

```bash
xattr -dr com.apple.quarantine ~/.platformio/packages/toolchain-riscv
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-wlink
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-openocd-riscv-wch
```

> `-r` è il parametro ricorsivo, che ripulisce l'attributo di quarantena su tutti i file nella directory; anche se un file non lo aveva, il comando non va in errore — è un'operazione preventiva del tipo "fare non guasta", puoi lanciarla tranquillamente.

---

## 8. Verificare che la toolchain giri davvero

Fatta l'installazione, non aprire subito un progetto: prima dedica una quindicina di secondi a controllare che i tre pezzi grossi partano regolarmente:

```bash
# Compilatore (in linea col capitolo 6, versione finale gcc12.2.0, arm64 nativa, senza Rosetta)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0

# Se per caso ti è uscita la vecchia versione gcc8/x86_64, comando e output cambiano di conseguenza:
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
# riscv-none-embed-gcc (xPack GNU RISC-V Embedded GCC x86_64) 8.2.0

# Strumento di flash (arm64 nativo)
~/.platformio/packages/tool-wlink/wlink --version
# wlink 0.1.1

# Strumento di debug (opzionale, arm64 nativo)
~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd --version
```

> **Piccola nota su Rosetta**: la versione gcc12/arm64 nativa in teoria non ha alcun bisogno di Rosetta. Però se ti è capitata la vecchia gcc8/x86_64, al primo avvio il sistema potrebbe proporti di installare Rosetta 2: confermi ed è fatta, è un'operazione una-tantum, dopo non te lo chiede mai più. Se i comandi qui sopra sputano un numero di versione senza problemi, l'ambiente è sistemato.

---

## 9. Creare il primo progetto: conosciamo `platformio.ini`

### 9.1 Com'è fatta la struttura di un progetto

Un progetto PlatformIO minimale ha uno scheletro di due cose:

```
ch32v307-test/
├── platformio.ini      # file di configurazione del progetto; "quale chip, quale framework, come flashare" sta tutto qui
└── src/
    └── main.c           # il tuo firmware, punto di ingresso del programma
```

Creare un progetto vuoto da riga di comando va benissimo (se preferisci "New Project" da VSCode è la identica cosa):

```bash
$PIO project init -d ~/ch32v307-test --board ch32v307_evt
```

### 9.2 Smontiamo `platformio.ini` riga per riga

È il file di configurazione più importante del progetto, ci avrai a che fare ogni volta che ne inizi uno nuovo, quindi merita di essere spiegato per bene. Il contenuto è più o meno questo:

```ini
[env]
platform = ch32v
framework = noneos-sdk
monitor_speed = 115200
; debugger WCH-Link di bordo; wlink è lo strumento di flash con supporto nativo macOS arm64
upload_protocol = wlink

[env:ch32v307_evt]
board = ch32v307_evt
; Configurazione di default di fabbrica per EVT-R1: Flash 256K + SRAM 64K (coincide col default del board, nessun override necessario)
; Per passare a 288K Flash / 32K SRAM o altri layout, serve prima modificare gli option bytes con lo strumento WCH,
; e qui decommentare per allineare:
; board_upload.maximum_size = 294912
; board_upload.maximum_ram_size = 32768
```

Vediamole a una a una:

- **`[env]`**: è la "zona di configurazione comune", ciò che scrivi qui vale per tutti gli ambienti (env). Se in futuro il progetto supporta più schede, mettere qui i parametri condivisi ti salva dalla ripetizione.
- **`platform = ch32v`**: dice a PlatformIO quale piattaforma usare, cioè quella `Community-PIO-CH32V` che abbiamo sbattuto per mezza giornata a installare.
- **`framework = noneos-sdk`**: scegli la libreria periferica standard ufficiale WCH (sviluppo bare metal, senza OS), il framework di ingresso più classico e con la documentazione più ricca. Il pacchetto si chiama `framework-wch-noneos-sdk`, e la versione verificata in questo articolo è `2.30000.0`. Se più avanti vuoi smanettare col multitasking, basta cambiare questa riga in `freertos` o `rt-thread`, il resto della configurazione non si muove quasi — uno dei vantaggi dell'ecosistema PlatformIO.
- **`monitor_speed = 115200`**: il baud rate del monitor seriale (`pio device monitor`). **Questo numero deve essere uguale al parametro passato a `USART_Printf_Init()` nel codice**: se non combaciano, dalla seriale arriva solo una sfilza di roba senza senso, ed è un'altra classica piccola trappola da principianti.
- **`upload_protocol = wlink`**: dice a PlatformIO quale strumento usare per flashare. Di protocolli ne esistono diversi (nel capitolo 12 trovi la tabella completa), ma per chi è su macOS arm64 la scelta più indolore è `wlink`, perché è quello supportato nativamente.
- **`[env:ch32v307_evt]`**: è la definizione di un "ambiente" specifico; il nome è libero, ma per consuetudine segue il modello della scheda, per comodità.
- **`board = ch32v307_evt`**: specifica il modello esatto della scheda; PlatformIO usa questa informazione per caricare il pacchetto completo di definizioni dei pin, dimensioni Flash/RAM, clock di default e così via.
- **Le righe commentate su Flash/RAM**: qui si nasconde un dettaglio che fa tribolare — il chip sulla EVT-R1 ha in realtà **288KB** di Flash, ma il `board` di default ne dà **256KB**. Non avere fretta di cambiarlo, non è un bug: la configurazione di fabbrica degli option bytes è proprio impostata su 256KB Flash + 64KB SRAM, in coincide col default del `board`. Da principiante non devi toccare quelle righe. Solo quando, in futuro, ti servirà davvero sfruttare tutti i 288KB di Flash, dovrai prima modificare gli option bytes del chip con lo strumento ufficiale WCH, poi tornare qui a sincronizzare la configurazione — è un'operazione avanzata, da lasciar da parte per ora.

### 9.3 Leggiamo il template `main.c` generato da PlatformIO — per costruirci un "metodo di sviluppo CH32"

Questa sezione è il cuore del cuore. La prima volta che si apre il `main.c` autogenerato da PlatformIO, tanti si fanno scoraggiare dall'enorme `#if defined(...)` iniziale e pensano "che roba complicatissima". Niente paura: la smontiamo pezzo per pezzo, vedrai che non è così tremenda, e una volta capito questo blocco, davanti a qualunque chip WCH capirai al volo lo schema.

L'inizio del template è fatto così (estratto):

```c
// ① In base alle macro definite al momento della compilazione, sceglie automaticamente l'header del chip corrente
#if defined(CH32V003)
#include <ch32v00x.h>
#elif defined(CH32V10X)
#include <ch32v10x.h>
#elif defined(CH32V30X) || defined(CH32V31X)
#include <ch32v30x.h>
// ... di seguito un'altra sfilza di rami: V20X / X035 / L103 / H417 ecc.
#endif
#include <debug.h>   // ← questa riga è chiave: fornisce init della seriale, delay, redirect di printf
```

**Perché il codice si presenta così?** Perché il template di PlatformIO è condiviso da **tutta la serie di chip WCH**: `CH32V003`, `CH32V307`, `CH32X035`... decine di chip che condividono lo stesso scheletro di `main.c`, e tramite una sfilza di `#if defined(...)` "indovinano" al momento della compilazione quale chip stai usando, per poi `#include` l'header di corrispettivo fornito dal produttore. Quelle macro sono definite automaticamente dietro le quinte dalla combinazione `platform = ch32v` + `board = ch32v307_evt`, non devi scriverle tu.

**Per la nostra CH32V307, in realtà contano solo due righe**:

```c
#include <ch32v30x.h>   // definizioni dei periferici della serie CH32V30X (registri, GPIO_InitTypeDef vengono da qui)
#include <debug.h>      // la libreria di debug chiave
```

Una volta capito questo, tutta quella pappardella di `#if defined` non è più "logica complessa" ma "un interruttore a scelta multipla": afferrato lo schema, davanti a qualunque scheda nuova della serie CH32 con codice template simile, non ti farà paura. **È quello che chiamiamo "metodo di sviluppo CH32": prima vedi quale header di serie corrisponde alla scheda, poi controlla quali funzioni di supporto ti mette a disposizione `debug.h`.**

### 9.4 Cosa si nasconde davvero dentro `debug.h`

Questo header è fornito dall'SDK ufficiale WCH e si usa praticamente in ogni progetto CH32; familiarizzare in anticipo con le sue funzioni ti fa risparmiare un sacco di strada:

```c
void Delay_Init(void);                        // Inizializza il timer di sistema per i delay
void Delay_Us(uint32_t n);                    // Delay in microsecondi
void Delay_Ms(uint32_t n);                    // Delay in millisecondi
void USART_Printf_Init(uint32_t baudrate);    // Inizializza la USART1 e reindirizza printf su di essa
```

Nel corrispondente `debug.c` (anch'esso incluso nell'SDK, non devi scriverlo tu) è già implementata la funzione `_write()` che la libreria standard C richiede, e risulta collegata alla USART1. **Questo significa che non devi scrivere tu il codice di reindirizzamento: basta chiamare una volta `USART_Printf_Init(115200)` e poi ogni `printf(...)` finisce dritto sulla seriale** — una funzionalità comodissima e troppo spesso ignorata dai principianti; una volta cascata nella trappola della "seriale muta" di più avanti, ti ricorderai per sempre di questa riga.

### 9.5 Un esempio minimo "compila ma non fa niente"

Prima di addentrarci nella Hello World vera e propria, guardiamo un banale codice di blink, per familiarizzare con lo schema di base delle operazioni GPIO su CH32:

```c
#include <ch32v30x.h>   // header della serie CH32V30X, scelto automaticamente dalla configurazione board
#include <debug.h>

#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);   // Configura il gruppo di priorità degli interrupt (mossa standard di apertura)
    SystemCoreClockUpdate();                          // Aggiorna la variabile del clock di sistema (anche questa standard)
    Delay_Init();                                     // Inizializza le funzioni di delay

    GPIO_InitTypeDef GPIO_InitStructure = {0};

    BLINKY_CLOCK_ENABLE;                               // ① Prima "dai corrente" al periferico GPIOA (abilita il clock)
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;           // ② Seleziona il pin PA0
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;    // ③ Modalità: push-pull output
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;   // ④ Velocità di commutazione
    GPIO_Init(GPIOA, &GPIO_InitStructure);              // ⑤ Scrive davvero la configurazione nei registri

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(GPIOA, GPIO_Pin_0, ledState);   // Porta il livello di PA0 a ledState
        ledState ^= 1;                                 // Inverti il livello: al giro successivo è opposto
        Delay_Ms(500);                                  // Aspetta 500ms per dare l'effetto "lampeggio"
    }
}
```

**Impara a memoria questa sequenza fissa di quattro tempi per l'inizializzazione GPIO**. Tutta l'inizializzazione dei periferici nei progetti CH32 non è che una variante di questo schema:

1. **Abilita il clock**: la famiglia STM32 (la libreria periferica CH32 è praticamente una copia della libreria standard STM32) ha una caratteristica — tutti i periferici sono "senza corrente" di default, e prima di usarli devi abilitarne manualmente il clock con `RCC_XXXClockCmd(...)`. Se dimentichi questo passo, il periferico è un soprammobile: qualunque configurazione scrivi non succede nulla.
2. **Riempi la struct**: dichiara una struct `XXX_InitTypeDef` e compila uno per uno i parametri voluti (modalità, velocità, ecc.).
3. **Chiama `XXX_Init()`**: "nutri" la funzione di init con la struct, è lì che i parametri vengono davvero scritti nei registri del chip.
4. **Lavora dentro `while(1)`**: usa le funzioni di lettura/scrittura corrispondenti (ad esempio `GPIO_WriteBit`) per pilotare il periferico.

Bene, teoria finita. Adesso compiliamo e flashiamo concretamente — e scopriremo che, anche con un codice che in teoria è corretto, in pratica salta fuori sempre una trappola "inaspettata".

---

## 10. La prima compilazione

Tutto pronto, lanciamo la compilazione:

```bash
$PIO run -d ~/ch32v307-test        # oppure: cd nella directory del progetto e poi direttamente pio run
```

La prima compilazione scarica automaticamente il framework `noneos-sdk` di WCH (il codice sorgente completo dei driver periferici), e ci vuole un po' — circa 30~60 secondi. L'output di una compilazione riuscita si presenta così:

```
Linking .pio/build/ch32v307_evt/firmware.elf
RAM:   [          ]   3.2% (used 2080 bytes from 65536 bytes)
Flash: [          ]   0.7% (used 1728 bytes from 262144 bytes)
Building .pio/build/ch32v307_evt/firmware.bin
========================= [SUCCESS] Took 47.36 seconds =========================
```

Quando vedi il `[SUCCESS]` verde, significa che l'intera catena — da VSCode, a pio, fino al compilatore nativo macOS — è completamente in piedi, meriti un applauso. I prodotti della compilazione sono in `.pio/build/ch32v307_evt/`:

- `firmware.elf`: con simboli di debug completi, serve per il debug;
- `firmware.bin`: il puro binario, quello che si flasha.

Le due barre di avanzamento (occupazione RAM/Flash) vale la pena tenerle d'occhio: più avanti, una volta aggiunto `printf`, l'occupazione Flash farà un bel salto, è normale, non ti spaventare — nel capitolo 13 spieghiamo il perché.

---

## 11. Rendere `pio` un comando globale

Digitare ogni volta una sfilza come `~/.platformio/penv/bin/pio` è una scocciatura, gli facciamo un symlink dentro una directory che è già nel PATH. Sui Mac Apple Silicon, Homebrew si installa di default in `/opt/homebrew/bin`, che normalmente è scrivibile dall'utente corrente (gruppo admin):

```bash
if [ -w /opt/homebrew/bin ]; then
  ln -sf ~/.platformio/penv/bin/pio /opt/homebrew/bin/pio
  ln -sf "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" /opt/homebrew/bin/code
fi
```

Verifica:

```bash
pio --version      # PlatformIO Core, version 6.1.19
code --version     # numero di versione di VSCode
```

> Se la tua `/opt/homebrew/bin` non è scrivibile (raro), scegli un'altra directory scrivibile, ad esempio `~/.local/bin`, e aggiungila al PATH della shell:
> ```bash
> mkdir -p ~/.local/bin
> ln -sf ~/.platformio/penv/bin/pio ~/.local/bin/pio
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
> ```
> Ricordati che dopo aver modificato `~/.zshrc` devi aprire una nuova finestra di terminale o lanciare `source ~/.zshrc` per rendere effettiva la modifica.

Da qui in poi, in tutto l'articolo, le ricorrenze di `$PIO` o `~/.platformio/penv/bin/pio` si potranno scrivere direttamente `pio`.

---

## 12. Collegamento hardware e flashing

### 12.1 Collegamenti: infila il cavo nel USB giusto

La EVT-R1 ha di solito due porte USB, **per flashare e fare debug devi collegare quella attaccata al WCH-Link di bordo** (la serigrafia riporta di norma DEBUG / Link / WCH-Link), non quella etichettata USB-Device: le due porte hanno funzioni completamente diverse, e se sbagli il gestore dispositivi non vedi niente. macOS ha già il driver CDC seriale, appena colleghi è pronto, niente driver da installare: rispetto a Windows è una bella boccata d'ossigeno.

### 12.2 Le due modalità del WCH-Link

Il chip del debugger WCH-Link ha due modalità di lavoro: **modalità RV** (per chip RISC-V) e **modalità DAP** (per chip ARM). La nostra CH32V307 ha core RISC-V, e perché il flash vada a buon fine il debugger deve stare in **modalità RV**. Dalla fabbrica la scheda è già normalmente in modalità RV; se il flash continua a fallire puoi usare il comando `wlink` oppure lo strumento ufficiale WCH per controllare o cambiare modalità:

```bash
# Elenca i dispositivi WCH-Link attualmente collegati
pio pkg exec -- wlink list          # oppure direttamente wlink list (purché il percorso sia nel PATH)
```

### 12.3 Il flashing vero e proprio

**Modo 1: riga di comando**

```bash
cd ~/ch32v307-test
pio run -t upload
```

L'`upload_protocol = wlink` configurato in `platformio.ini` entra in azione proprio in questo passo — PlatformIO richiama la wlink nativa macOS e, tramite il WCH-Link, scrive `firmware.bin` dentro il chip.

**Modo 2: interfaccia grafica di VSCode**

Apri la cartella del progetto, sulla barra strumenti PlatformIO in basso a sinistra trovi una sfilza di icone; basta cliccare quella con la freccia (Upload), stessa roba della riga di comando. Per chi preferisce il mouse, è la via preferibile.

In caso di successo, `wlink` stampa informazioni diagnostice sul debugger e sul chip, utili da tenere sott'occhio:

```
04:17:53 [INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
04:17:53 [INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
04:17:53 [INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
04:17:54 [INFO] Flash done
04:17:54 [INFO] Now reset...
```

La prima riga `v2.18(v38)` è la versione del firmware del tuo WCH-Link; la terza riga ti dice che il chip ha davvero 288KB di Flash (raccordo col dettaglio del capitolo 9) e anche l'UID univoco del chip, che potrebbe servire per serializzare i prodotti.

### 12.4 Quale protocollo di flash scegliere

La definizione del `board` supporta in realtà diversi protocolli, da cambiare in base alle necessità:

| Protocollo | Tool sottostante | Note |
|---|---|---|
| `wch-link` | openocd (`0.11.0+dev-snapshot`, pacchetto PIO `2.1100.260228`) | Protocollo di default, parla col WCH-Link tramite openocd |
| `wlink` | wlink (versione tool `0.1.1`, pacchetto PIO `tool-wlink@0.23.241116`) | **Consigliato per chi sta su macOS**, nativo, leggero, veloce — è il protocollo effettivamente usato in questo articolo |
| `minichlink` | minichlink (`0.1.0`) | Altro tool leggero manutenuto dalla community, come alternativa |
| `isp` | wchisp (`0.2.3`, pacchetto PIO `0.23.240914`) | Flash in modalità USB Bootloader; serve prima tirare su il pin BOOT0 per entrare nel bootloader, utile negli scenari senza WCH-Link |

### 12.5 Debug (breakpoint, step)

In VSCode basta premere **F5** per far partire la sessione di debug (sotto il cofano cooperano openocd + RISC-V GDB), puoi mettere breakpoint, fare step, ispezionare variabili e registri in tempo reale. Il file SVD con la descrizione dei registri della scheda (`CH32V307xx.svd`) è già specificato nella configurazione del board, quindi anche la visualizzazione dei registri periferici funziona out-of-the-box, senza configurazione aggiuntiva. Basterebbe un articolo a sé, quindi qui mi fermo al minimo indispensabile.

---

## 13. Trappola 1: compilazione e flash OK, seriale muta

Una volta sistemata la toolchain e andato a buon fine il flash, in tanti pensano di avercela fatta, aprono il monitor seriale con entusiasmo — e resto di sasso.

### Sintomo

```bash
pio run              # compilazione OK ✅
pio run -t upload    # flash OK ✅
pio device monitor   # apre il monitor seriale → vuoto, neanche un fantasma
```

Nessun errore in compilazione, flash confermato, il monitor seriale è certamente collegato a quel `/dev/cu.usbmodem***` (quello virtualizzato dal WCH-Link di bordo), eppure **non arriva una sola parola**. A questo punto è facile iniziare a dubitare del baud rate, del driver, persino della scheda.

### Causa radice: è semplicissima

Apri il codice e si capisce al volo — **il template autogenerato da PlatformIO non inizializza affatto la seriale, e nel codice non c'è una sola riga di `printf`**. È un programma "puro blink" che fa solo "configura GPIO → mentre (1) commuta il livello → delay", e non spedisce un byte sulla seriale dall'inizio alla fine; il silenzio della seriale è la conseguenza naturale, non è che il circuito è rotto, è che il codice non ha mai avuto intenzione di parlarti.

> La seriale virtualizzata dal WCH-Link di bordo (in gergo VCP, virtual COM port) fa da ponte, di default, verso la **USART1 del chip target (PA9 = TX, PA10 = RX)**. Il canale hardware è perfettamente aperto; è solo il programma che non trasmette nulla.

### Soluzione: aggiungi init + printf

Nel capitolo 9 abbiamo già conosciuto la funzione `USART_Printf_Init()` di `debug.h`; adesso la usiamo sul serio, due righe e il problema è risolto:

```c
Delay_Init();

// La USART1 (PA9/PA10) passa per la seriale virtuale del WCH-Link di bordo; la _write dell'SDK ha già reindirizzato printf qui
USART_Printf_Init(115200);
printf("CH32V307 booted, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);
```

E dentro il ciclo `while(1)` aggiungiamo una stampa, così vedi in tempo reale che il programma sta girando:

```c
while (1) {
    GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
    printf("LED %u\r\n", ledState);
    ledState ^= 1;
    Delay_Ms(100);
}
```

Ricompila e riflasha, la seriale si risveglia subito:

```
CH32V307 booted, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

> **Piccolo appunto**: dopo aver aggiunto `printf`, l'occupazione Flash fa un salto dallo 0,7% (1728 byte) a circa 2,8% (7440 byte), perché `printf` trascina dentro al firmware anche tutta la logica di formattazione delle stringhe — è normale, `printf` non è mai "gratis"; è uno scambio di spazio in cambio di comodità di debug, niente panico e niente fissa per quei pochi KB.

### Quando la seriale non parla, segue questo ordine diagnostico

Riassumiamo l'esperienza di questa volta in una lista di troubleshooting generale, tienila a portare di mano: ogni volta che si ripresenta un problema simile la segui punto per punto.

1. **Nel codice hai davvero chiamato `USART_Printf_Init` e hai davvero scritto `printf`?** (la trappola più frequente in assoluto, e la più trascurata — controlla questa per prima)
2. **Il baud rate è corretto?** Il valore di `USART_Printf_Init(115200)` nel codice deve coincidere col `monitor_speed` in `platformio.ini`; se uno dei due cambia senza sincronizzare l'altro, ricevi caratteri a caso o il vuoto.
3. **La funzione di seriale virtuale del WCH-Link è stata spenta per sbaglio?** (puoi controllarla con lo strumento ufficiale WCH-LinkUtility)
4. **Quello che vuoi è davvero che "il chip stesso diventi una seriale USB" (USB CDC)?** Se sì, è un'altra famiglia di firmware che richiede uno stack USB: è una strada completamente diversa rispetto alla USART1 + bridge WCH-Link trattata qui, non confonderle.

---

## 14. Trappola 2 (la più grossa dell'articolo): la seriale parla, ma il LED non si accende mai

Questa è la trappola più esasperante di tutto il travagliamento, perché **non c'entra quasi niente col software**: è un problema hardware puro e duro, per quanto tu scriva il codice bene non c'è verso. Vale la pena dedicarle qualche minuto di pazienza: ti risparmia mezz'ora passata a strapparti i capelli davanti al codice.

### Sintomo

La seriale a questo punto stampa correttamente (segno che il firmware sta davvero girando, no freeze, no HardFault), **ma sulla scheda non si vede lampeggiare nessun LED**.

### Causa radice: i LED utente di bordo in fabbrica sono "staccati"

**I due LED utente su questa scheda (serigrafia LED1, LED2) non sono collegati ai pin del MCU: sono sospesi nel vuoto.** Nello specifico, hanno solo un lato verso GND; l'altro è un pad o un foro per pin nudo e crudo, lasciato lì in attesa che tu ci collegassi il filo. Non è un difetto di un singolo esemplare, ma proprio così com'è sullo schematico ufficiale WCH (`CH32V30xSCH.pdf`).

In altre parole: **che tu stia commutando PC1, PD0 o PA0, finché non prendi un cavetto jumper fisico e lo porti dal pin al pad del LED, il LED non si accenderà mai. È un problema hardware puro; per quanto il software sia brilliant, non risolvi.**

Non sono l'unico ad essere cascato in questa buca: ci sono diverse fonti indipendenti a confermarlo. La documentazione ufficiale di Zephyr per questa scheda dice esplicitamente che "il LED di bordo nel design del circuito non è collegato al SoC"; un'introdotiva cinese alla CH32V307EVT-R1 di WCH riporta la stessa cosa: i due LED utente non sono collegati a nessun GPIO, serve che l'utente li cabli a mano per accenderli. Stesso discorso per il pulsante utente KEY di bordo: è sospeso, stessa trappola da rifare.

> **L'unica luce accesa di default sulla scheda è il LED di alimentazione** — quella che si accende fissa appena infili l'USB, non ha niente a che fare col tuo codice, ed è facilissimo scambiarla per "ho fatto lampeggiare il LED!" quando invece non è controllata dal MCU.

### Risoluzione: due passi, software + hardware

**Passo uno: scegli il pin da commutare**

Negli esempi GPIO ufficiali di WCH si usa di consueto il pin **PA0**: è quello con la documentazione più ricca, più dibattito community, meno probabilità di cadere in trappole extra. Allineamo anche noi il pin del blink a PA0:

```c
// Sulla EVT-R1 i LED utente sono sospesi di default (non collegati al MCU): serve un cavetto jumper da PA0 a LED1 perché si accenda
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)
```

> ⚠️ **Una trappola collegata**: se stai cambiando porta (ad esempio dal PC1 del template a PA0), **ricordati di aggiornare anche la riga di abilitazione del clock a `RCC_APB2Periph_GPIOA`**. Ci sono cascato concretamente: avevo modificato solo il pin e mi ero scordato di portare il clock su GPIOA; risultato, il clock del periferico GPIOA restava chiuso, e PA0 non si muoveva di un millimetro. A furia di scartabinnare la logica del codice, alla fine mi sono reso conto del classico "modificato un punto e dimenticato l'altro". Dopo aver cambiato la configurazione di un porta, fai una revisione completa di tutte le macro correlate, non fermarti a metà.

**Passo due: collega un cavetto jumper fisico (due varianti, scegli)**

- **Variante A (usi il LED1 di bordo, raccomandata da WCH)**: prendi un jumper, collega un capo a **PA0** (il foro contrassegnato `A0` sul connettore Arduino) e l'altro capo al pad con la serigrafia `LED1` sulla scheda. La posizione del pad la trovi nello schematico `CH32V30xSCH.pdf` dentro il pacchetto di documentazione EVT.
- **Variante B (LED esterno tuo, la più solida e intuitiva)**: prendi un LED qualunque, in serie a una resistenza di limitazione di corrente fra 330Ω e 1kΩ, collega il tutto fra **PA0 e GND**. Se sbagli la polarità non importa: il codice continua a commutare alto/basso, quindi in una delle due metà del ciclo il LED si accende comunque — l'unica differenza è "quale metà del ciclo risulta accesa".

Fatto il collegamento, rilancia `pio run -t upload`: il LED1 inizierà a lampeggiare a ritmo di 100 ms e in parallelo la seriale stampa `LED 0 / LED 1`. Solo qui hai davvero fatto girare la "Hello World". 🎉

> **Perché WCH ha lasciato i LED sospesi?** Molto probabilmente per "dare più libertà allo sviluppatore": puoi collegare LED e pulsanti al GPIO che preferisci nel tuo progetto, senza rimanere vincolato a un pin fissato in fabbrica. L'intenzione è nobile, ma per un principiante alla prima volta è una mazzata, perché quando accendi la scheda il primo pensiero non è certo "devo collegare un filo per far lampeggiare il LED", bensì "ho sbagliato qualcosa nel codice".

### Una lezione più profonda: prima stabilisci se è un problema software o hardware

Il vero valore di questa trappola non sta nel "ricordare che PA0 vuole il jumper", quanto in un metodo di troubleshooting che vale per tutto l'embedded:

**"Nessuna reazione" non significa "il codice è sbagliato".** Quando un periferico non risponde, la prima cosa da fare è cercare di dimostrare "il firmware è davvero arrivato a eseguire quel pezzo di logica", non mettersi a strazio sul codice. In questa occasione ho capito alla svelta che era un problema hardware e non software perché **la seriale aveva già stampato qualcosa**: se la seriale stampa correttamente, significa che il main sta girando, che non è bloccato chissà dove; accertato che "a livello software è tutto a posto", il resto del "nessuna reazione" lo puoi isolare sul collegamento hardware. Ecco perché consiglio, come primissima cosa in un progetto nuovo, di far parlare la seriale: è la riga più rapida e diretta per escludere i guasti.

---

## 15. Il codice completo che gira alla fine: come è fatto `main.c`

Mettendo insieme i due fix di cui sopra, ecco il codice completo e funzionante — in più rispetto al template grezzo di PlatformIO ha init seriale e printf:

```c
#include <ch32v30x.h>
#include <debug.h>

// Sulla EVT-R1 i LED utente sono sospesi di default (non collegati al MCU): serve un cavetto jumper da PA0 a LED1
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void NMI_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void HardFault_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
    SystemCoreClockUpdate();
    Delay_Init();

    // La USART1 (PA9/PA10) passa per la seriale virtuale del WCH-Link di bordo; la _write dell'SDK ha già reindirizzato printf qui
    USART_Printf_Init(115200);
    printf("CH32V307 booted, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);

    GPIO_InitTypeDef GPIO_InitStructure = {0};
    BLINKY_CLOCK_ENABLE;
    GPIO_InitStructure.GPIO_Pin = BLINKY_GPIO_PIN;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(BLINKY_GPIO_PORT, &GPIO_InitStructure);

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
        printf("LED %u\r\n", ledState);
        ledState ^= 1;
        Delay_Ms(100);
    }
}

void NMI_Handler(void) {}
void HardFault_Handler(void) { while (1) {} }
```

Le due funzioni in fondo al codice meritano una nota: `NMI_Handler` e `HardFault_Handler` sono due "gestori di eccezioni di fallback" comunissimi nei micro RISC-V/ARM. Il modificatore `__attribute__((interrupt("WCH-Interrupt-fast")))` dice al compilatore "questa è una interrupt service routine, generane il codice di conseguenza" (ad esempio salvando e ripristinando automaticamente i registri). Qui l'implementazione è elementare — dentro `HardFault_Handler` c'è un `while(1){}` che si blocca in un loop infinito, una strategia conservativa ma efficace: se il programma va davvero fuori binario e solleva un'eccezione hardware, meglio restare inchiodati lì piuttosto che lasciare che il chip continu a correre con uno stato di errore; resta comodo per collegarsi col debugger e ispezionare lo stato al momento del crash. Più avanti, quando il progetto cresce, puoi aggiungerci log degli errori, segnalazione via LED e via dicendo; per ora sapere che esiste è sufficiente.

Il codice completo del progetto (compreso `platformio.ini`) è su GitHub, il link è a fine articolo: puoi clonarlo e farlo girare direttamente.

---

## 16. Tabella riassuntiva delle trappole

Riepiloghiamo in una tabella tutte le trappole dell'articolo, comoda da tenere a portata di mano:

| # | Sintomo | Causa radice | Risoluzione |
| --- | --- | --- | --- |
| 1 | Installando la piattaforma ricevi `repository not found` | Nome dell'organizzazione GitHub sbagliato, deve essere `Community-PIO-CH32V` (con PIO, maiuscolo) | Usa l'indirizzo corretto |
| 2 | `pio platform install` segnala deprecated | Le nuove versioni di PlatformIO usano il sotto-comando `pkg` | Passa a `pio pkg install -g -p <indirizzo>` |
| 3 (cuore) | Piattaforma installata, ma la directory della toolchain è piena di `.exe`, compilazione destinata a fallire | `platform.json` ha la sorgente della toolchain hard-coded sul repo Windows, e l'installazione non discrimina per sistema operativo | Cancella la versione Windows, installa a mano `toolchain-riscv-mac` e `tool-wlink` (branch `mac_arm64` / `mac_x64`) |
| 4 | Sbagli il branch della toolchain, la compilazione non trova l'eseguibile del compilatore | Lo script di build seleziona il prefisso del compilatore in base al secondo segmento della versione (`1.8.x`→`riscv-none-embed`, `1.12.x`→`riscv-wch-elf`); se la versione installata non corrisponde agli eseguibili realmente presenti, salta l'errore | Prima fai un `ls` per vedere come si chiamano gli eseguibili installati davvero, poi comportati di conseguenza |
| 5 | Lanciando il compilatore/flasher ricevi "developer cannot be verified" o `killed: 9` | macOS ha appioppato l'attributo di quarantena ai binari non firmati scaricati da rete | `xattr -dr com.apple.quarantine <directory>` |
| 6 | Temi che il compilatore x86_64 "non digerisca" Apple Silicon | xPack una volta non aveva build arm64, serve Rosetta 2 | Non è un problema: con Rosetta installato compila benissimo |
| 7 | Provi a symlinkare `pio` in `/usr/local/bin` e fallisci | La directory è di proprietà di root, l'utente ordinario non ha permessi di scrittura | Usa `/opt/homebrew/bin` oppure creati `~/.local/bin` e aggiungilo al PATH |
| 8 | Compilazione e flash OK, il monitor seriale è vuoto | Il template è un puro loop di blink, **non inizializza la seriale, non contiene alcun `printf`** | Chiama `USART_Printf_Init(115200)`, usa `printf` normalmente (l'SDK lo reindirizza già alla USART1) |
| 9 (la più grossa dell'articolo) | La seriale stampa correttamente, ma nessun LED lampeggia sulla scheda | **I LED utente di bordo sono sospesi di default, non sono collegati al pin del MCU** | Collega un cavetto jumper da PA0 a LED1 (oppure LED esterno + resistenza di limitazione verso GND) |
| 10 (derivata) | Dopo essere passato a PA0 il LED continua a non lampeggiare | Cambiando porta hai **dimenticato di aggiornare anche la macro di abilitazione del clock** | La definizione del port e l'abilitazione del clock vanno cambiate in coppia; dopo la modifica fai un controllo incrociato completo |

**Il guadagno più grande di questo giro, in una frase**: nello sviluppo embedded "nessuna reazione" non equivale mai a "il codice è sbagliato"; prima cerca di capire se è un **problema software** (il firmware è davvero arrivato a eseguire quella logica) o un **problema hardware** (il canale fisico è aperto? il periferico è davvero collegato?). Far parlare la seriale per prima è la mossa più veloce e più riposante per escludere i guasti: aprile sempre per primo.

---

## 17. Scheda di riferimento: comandi chiave e percorsi file

I comandi che si usano più spesso nello sviluppo quotidiano:

```bash
# === Compila / flasha / monitor ===
pio run                # Solo compilazione
pio run -t upload      # Compilazione + flash
pio device monitor      # Apre il monitor seriale (Ctrl+C per uscire)

# === Versione firmware del debugger WCH-Link e info chip connesso (i più utili in fase di troubleshooting) ===
~/.platformio/packages/tool-wlink/wlink status

# === Versioni dei vari tool ===
~/.platformio/packages/tool-wlink/wlink --version    # versione del flasher
pio --version                                          # versione di PlatformIO Core

# === Versione del compilatore (in linea con l'ambiente finale, prefisso riscv-wch-elf-) ===
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# Se ti è uscita la vecchia versione gcc8/x86_64, cambia il nome del file:
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
```

L'output tipico di `wlink status`, dove a colpo d'occhio trovi versione firmware del debugger, modello del chip target, capacità Flash effettiva, UID del chip — utilissimo nel troubleshooting:

```
[INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
[INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
[INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
[INFO] Flash protected: false
[INFO] RISC-V ISA(misa): Some("RV32ACFIMUX")
[INFO] RISC-V arch(marchid): Some("WCH-V4F")
```

> Per aggiornare il firmware del debugger WCH-Link in sé serve lo strumento ufficiale **WCH-LinkUtility**, che oggi esiste solo per Windows e non ha una versione Mac — una piccola macchia nell'ecosistema macOS ancora incompleto.

Un elenco dei percorsi file chiave, per localizzare in fretta i problemi:

| Uso | Percorso |
|---|---|
| PlatformIO Core | `~/.platformio/penv/bin/pio` |
| Piattaforme installate | `~/.platformio/platforms/ch32v/` |
| Tool di toolchain / flash / debug | `~/.platformio/packages/{toolchain-riscv,tool-wlink,tool-openocd-riscv-wch}` |
| File di definizione board | `~/.platformio/platforms/ch32v/boards/ch32v307_evt.json` |
| Script di build della piattaforma (la logica del triple scavata prima sta qui) | `~/.platformio/platforms/ch32v/builder/main.py` |
| Output di compilazione | `<directory-progetto>/.pio/build/ch32v307_evt/firmware.{elf,bin}` |

Un riepilogo anche dei parametri chiave della definizione board `ch32v307_evt`:

| Campo | Valore |
|---|---|
| Modello MCU | CH32V307VCT6 |
| Frequenza principale | 144 MHz |
| march / mabi (ABI di target) | rv32imacxw / ilp32 |
| Flash / SRAM (valore di default del board) | 256 KB / 64 KB (il chip ha in realtà 288KB Flash, vedi cap. 9) |
| Debugger di bordo | WCH-Link |
| USB VID:PID | 1a86:8010 |
| Protocolli di flash supportati | wch-link, wlink, minichlink, isp |

---

## 18. Costruirsi un "metodo di sviluppo CH32" tutto proprio, per ricopiarlo sul prossimo progetto

A fine giro, ciò che vale di più non è quanti comandi hai memorizzato, ma esserti costruito un'ossatura mentale riusabile. Che tu prosegua con la CH32V307 o passi a un'altra scheda della serie CH32, puoi seguire questo schema:

1. **Prima di tutto conferma il trittico "piattaforma + framework + scheda"**: corrisponde alle tre righe `platform`, `framework`, `board` dentro `platformio.ini`. Fissate queste, PlatformIO sa dove scaricare la toolchain e quale set di definizioni dei pin usare per la compilazione.
2. **Una volta installata la piattaforma, prima di scrivere codice, controlla che la toolchain sia della "cittadinanza giusta"**: in particolare per le piattaforme manutenute dalla community e non supportate ufficialmente in prima battuta, è facilissimo che il default copra solo Windows o Linux. Fai un `ls` nella directory della toolchain e un `file` sui binari chiave per verificare che l'architettura combaci — risparmia un sacco di tempo di troubleshooting.
3. **Se binari non firmati vanno in errore all'avvio, pensa subito a Gatekeeper**: errori tipo `cannot be opened` / `killed: 9` sono quasi sempre la quarantena; un `xattr -dr com.apple.quarantine` chiude la questione.
4. **Se il flash e la compilazione vanno ma un periferico tace, prima stabilisci se è software o hardware**: far parlare la seriale è l'esclusione più rapida — se la seriale stampa, il firmware sta eseguendo; se non stampa, torna a controllare le init mancanti.
5. **Di default, non fidarti che i "periferici utente" di bordo siano già cablati**: LED, pulsanti e simili su tante schede di valutazione, per flessibilità, in fabbrica non sono collegati; prima di dubitare del codice, confrontali con lo schematico.
6. **Sfrutta `debug.h` (o la libreria di debug corrispondente al framework)**: quasi ogni SDK di produttore fornisce delay e redirect di `printf`, non devi reinventarli tu.
7. **I numeri di versione cambiano; il metodo di troubleshooting è quello che ti porti a casa**: la toolchain community continua ad aggiornarsi, è normalissimo che la tua versione non coincida con quella del tutorial. Capire il "perché" vale più del memorizzare il "cosa" — questo articolo stesso ne è un caso vivente.

Tieni a mente questo schema, e davanti a qualunque scheda embedded nuova saprai in breve tempo orientarti seguendo più o meno quest'ordine.

---

## 19. Domande frequenti FAQ

**D1: Perché non usare direttamente l'ufficiale MounRiver Studio? Non ha anche una versione Mac?**

R: MounRiver Studio ha davvero una versione Mac, ma a detta della community il suo OpenOCD integrato su Mac ha un po' di problemi, sembra non abbia ricevuto un serio lavoro di adattamento e testing su Mac; ed è un IDE chiuso e monolitico, non controlli la versione della toolchain. PlatformIO si basa su VSCode, toolchain completamente sotto controllo, community attiva, e ti garantisce un'esperienza di sviluppo coerente fra piattaforme — messi sulla bilancia, ne vale la pena di sbatterci la testa una volta.

**D2: Si può installare una toolchain RISC-V da Homebrew e usarla al posto, evitando la sostituzione manuale?**

R: Tecnicamente sì, ma per questa piattaforma è sconsigliato. Lo script di build individua la directory della toolchain tramite il sistema di package management di PlatformIO (chiamate tipo `get_package_dir("toolchain-riscv")`); passare a una toolchain installata da Homebrew richiederebbe scrivere configurazione aggiuntiva per rimpiazzare il comportamento di default, ed è ancora più scomodo. La cosa più riposante è usare il pacchetto `toolchain-riscv-mac` menzionato in questo articolo.

**D3: È possibile che un futuro aggiornamento della piattaforma riporti la toolchain alla versione Windows?**

R: Sì, è possibile. Se in seguito lanci `pio pkg update` o reinstalli l'intera piattaforma, in `platform.json` resta hardcoded l'indirizzo del repo Windows, e potrebbe ricoprire la tua versione macOS faticosamente sistemata. In quel caso ridai i passi di sostituzione del capitolo 6; o, più alla radice, fai un fork del repo piattaforma e modifica `platform.json` perché punti di default alla versione macOS: chiuso per sempre.

**D4: In compilazione ricevo un errore di link, oppure mi dice che non trova un comando del compilatore. Cos'è?**

R: Molto probabilmente la versione della toolchain non corrisponde al prefisso degli eseguibili del compilatore (la trappola 4 del capitolo 16). Prima verifica come si chiama fisicamente il compilatore che ti trovi installato (`riscv-wch-elf-gcc` oppure il vecchio `riscv-none-embed-gcc`), e assicurati che il comando corrisponda al file reale. Per i dettagli fai riferimento alla tabella di conferma finale dell'ambiente nel capitolo 6.

**D5: In fase di flash mi arriva "impossibile trovare il dispositivo WCH-Link", cosa controllo?**

R: Segui quest'ordine: ① conferma di aver collegato il cavo alla USB del WCH-Link, non a quella USB-Device; ② conferma che il debugger sia in modalità RV e non DAP; ③ con `system_profiler SPUSBDataType | grep -A5 1a86` guarda se il sistema vede il dispositivo USB (`1a86:8010` è il VID:PID del debugger).

**D6: Quali chip e framework supporta questa piattaforma? Cambiare scheda in futuro è comodo?**

R: Per i chip copre CH32V003/103/203/30x, CH32X035, CH56x/57x/58x/59x e una bella schiera; per i framework, oltre al noneos-sdk usato qui, supporta FreeRTOS, RT-Thread, TencentOS, Harmony LiteOS, Arduino, ch32fun, Zephyr e via dicendo. Cambiare scheda è praticamente modificare le due righe `board` e `framework` in `platformio.ini`; il resto del bagaglio di troubleshooting (architettura della toolchain, quarantena di Gatekeeper, periferici sospesi di default) sarà quasi sicuramente ancora valido.

---

## 20. Dopo aver fatto girare tutto, cosa si può fare ancora

La Hello World è solo l'inizio; una volta filato liscio puoi andare oltre:

- **GPIO multipli / interrupt di pulsante**: il pulsante utente KEY di bordo è anch'esso sospeso; una volta cablato puoi esercitarti con gli interrupt esterni EXTI.
- **USB CDC**: far sì che la CH32V307 si enumeri da sola come seriale USB, senza passare per la USART1 bridgiata dal WCH-Link — è un'altra famiglia di firmware che richiede uno stack USB, roba avanzata.
- **Sfruttare tutti i 288KB di Flash**: serve prima modificare gli option bytes del chip con lo strumento ufficiale WCH, poi decommentare e aggiornare le righe `board_upload.maximum_size` in `platformio.ini`.
- **Passare a FreeRTOS / RT-Thread**: cambi `framework` con il RTOS corrispondente e provi lo scheduling multitask.
- **Fai sul serio col debug**: affianca OpenOCD + GDB con F5 e breakpoint (`pio debug`), e consolidi l'arte del debugging embedded.

---

## 21. Riferimenti

- Repo della piattaforma Community-PIO-CH32V: `github.com/Community-PIO-CH32V/platform-ch32v`
- Pacchetto toolchain macOS: `github.com/Community-PIO-CH32V/toolchain-riscv-mac`
- Releases della toolchain (per seguire le novità lato PIO): `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`
- MounRiver ufficiale WCH (sorgente della toolchain WCH personalizzata + IDE): `www.mounriver.com`
- wlink (branch macOS): `github.com/Community-PIO-CH32V/tool-wlink` (branch `mac_arm64` / `mac_x64`)
- Documentazione ufficiale: `pio-ch32v.readthedocs.io`
- xPack RISC-V GCC (upstream della toolchain): `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack`
- Progetto wlink originario: `github.com/ch32-rs/wlink`
- Pagina prodotto ufficiale WCH: `www.wch.cn/products/CH32V307.html`
- SDK ed esempi ufficiali OpenWCH: `github.com/openwch/ch32v307`
- Documentazione ufficiale Zephyr, nota sul LED sospeso di questa scheda
- Documentazione ufficiale PlatformIO: `docs.platformio.org`

---

*Il codice completo del progetto è stato pubblicato su GitHub, sei benvenuto a clonarlo e lanciarlo. Se nel tuo sbattimento ti imbatti in una trappola non coperta qui, passa a condividerla nei commenti — il materiale su CH32V con macOS è ancora poco, e ogni persona in più che condivide esperienza è una trappola in meno per chi verrà dopo. Che il tuo LED si accenda alla svelta! 🎉*

https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/CH32V/CH32V307-EVT-R1/01%20HelloWorld
