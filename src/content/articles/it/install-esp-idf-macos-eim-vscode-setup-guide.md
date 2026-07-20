---
title: "Installare ESP-IDF v6.0.2 su macOS: dall'errore di `brew install` al setup riconosciuto da VSCode"
domain: hardware
platforms: ["mac"]
format: "tutorial"
relatedBoards: ["esp32s3"]
date: 2026-07-20
intro: "Hai installato ESP-IDF da riga di comando senza problemi, ma l'estensione VSCode continua a lamentarsi con setup not found? Questo articolo ripercorre esattamente i casini reali che ho incontrato: dalla Homebrew che installa eim, a EIM che tira giù ESP-IDF v6.0.2, alla pulizia dei residui portati da Windows, fino ad arrivare alla vera causa del «setup non trovato» di VSCode — un campo di configurazione scritto nel posto sbagliato. Comandi ed errori sono tutti veri, copiati dal terminale, così se ti capita lo stesso pasticcio puoi incollarlo direttamente su Google."
tags: ["installare ESP-IDF", "ESP-IDF macOS", "EIM", "ESP32-S3", "VSCode setup not found", "configurazione ESP-IDF"]
image: https://img.lingflux.com/2026/07/79ed5dc15e35419e612ab982e595d127.png
---

# Installare ESP-IDF v6.0.2 su macOS: dall'errore di `brew install` al setup riconosciuto da VSCode

In passato avevo già provato a installare ESP-IDF due volte, e tutte e due le volte mi ero incartato a un certo punto del processo. Alla fine ho rifatto tutto da capo, passo per passo, e sono andato a scovare la vera causa di ogni singolo errore. Solo alla fine mi è venuto chiaro: il problema non è «installare ESP-IDF» in sé, ma cinque trabocchetti sparsi in posti tra loro slegati — la Homebrew che installa lo strumento, l'accesso di rete di EIM, l'installazione del plugin giusto su VSCode, alcuni file portati a mano dal Windows del progetto, e il modo in cui l'estensione VSCode legge la configurazione. Una volta pronto da riga di comando andava tutto liscio, ma l'estensione VSCode continuava a sputare "setup not found": ed è proprio questo il punto che mi ha fatto perdere più tempo, e al centro di questo articolo.

È un resoconto genuino dei casini che ho preso, con comandi ed errori reali che ho raccolto dal terminale. Se ti capita uno di quegli errori, puoi copiarlo direttamente e cercarlo su Google, oppure passare questo articolo insieme al tuo output a un'AI e lasciare che ti guidi seguendo lo stesso filo logico.

> **Prima di iniziare, controlla bene le versioni.** ESP-IDF è passato dalle v5.x alla v6.0.2 cambiando il metodo di installazione: dal vecchio `install.sh` si è passati a EIM. Anche l'estensione VSCode dalla 1.x alla 2.x è stata riscritta parecchio, inclusa la logica con cui cerca il setup. Se le tue versioni sono diverse, soprattutto al punto 4 sulla configurazione dell'estensione, è probabile che gran parte di questo articolo non si applichi per niente.

## Versioni dell'ambiente

| Voce | Versione |
|---|---|
| Sistema | macOS, Apple Silicon (chip serie M) |
| ESP-IDF | v6.0.2 |
| Strumento di installazione | EIM 0.17.1 |
| Estensione VSCode | espressif.esp-idf-extension 2.1.0 |
| Chip di destinazione | ESP32-S3 |

I percorsi nell'articolo usano il mio nome utente `shawn`: quando copi i comandi, ricordati di sostituirlo col tuo (basta un `whoami` nel terminale per vederlo). Inoltre ho il proxy Clash attivo in locale, quindi passo da `127.0.0.1:7890`: se non ti serve il proxy, togli dalle variabili d'ambiente quelle con la parola `PROXY` e i parametri `--mirror`, il flusso principale non ne risente.

## La strada in sintesi

Cinque passaggi, e più si va avanti più i trabocchetti si nascondono:

| Passo | Cosa devi fare | Situazione tipica |
|---|---|---|
| 0 | Installare `eim` stesso con Homebrew | Un avviso di trust, facile da scambiare per un errore |
| 1 | Usare `eim` per installare ESP-IDF v6.0.2 | Rete e numero di versione, due buchi |
| 2 | Installare l'estensione ESP-IDF su VSCode | Troppe estensioni con nome simile, è facilissimo sbagliare |
| 3 | Pulire i file residui di Windows dentro il progetto | Lo beccano solo i progetti portati da Windows |
| 4 | Far riconoscere il setup installato dall'estensione VSCode | Il buco più nascosto di tutti, quello dove resti bloccato di più |

---

## Passo 0: prima installa lo strumento `eim`

`eim` sta per ESP-IDF Manager, è lo strumento ufficiale di Espressif per l'installazione e la gestione. Rispetto al vecchio `install.sh` ha un vantaggio enorme: puoi tenere installate più versioni di ESP-IDF in parallelo senza che si pestino i piedi a vicenda. Per installarlo devi prima aggiungere un tap Homebrew (sorgente software di terze parti) e poi installarlo:

Guida ufficiale all'installazione di EIM:
https://dl.espressif.com/dl/eim/index.html

```bash
brew tap espressif/eim
brew install eim
```

La prima volta che lanci `brew install eim`, ti bevi questo avviso:

```
Error: Refusing to load formula espressif/eim/eim from untrusted tap espressif/eim.
Run `brew trust --formula espressif/eim/eim` or `brew trust espressif/eim` to trust it.
```

> **Non è un fallimento dell'installazione, è un controllo di sicurezza di Homebrew.** Le versioni più recenti di Homebrew non si fidano in automatico dei tap di terze parti (cioè sorgenti non presenti nel repository ufficiale). La prima volta che usi qualcosa proveniente da un tap di terze parti, ti viene sempre fuori questo avviso: tocca a te decidere se fidarti o meno. Il tap espressif è quello ufficiale, quindi puoi fidarti tranquillamente:

```bash
brew trust espressif/eim
```

Dopo questo comando, rilanci `brew install eim` e l'installazione va a buon fine. Se prima di `brew install` vedi scorrere una sfilza di pacchetti che non c'entrano niente con eim (tipo piccoli tool per la barra dei menu, rename assistiti dall'AI e via dicendo), è solo Homebrew che ti elenca quanti pacchetti obsoleti hai — roba di poco conto, ignora tutto e scorri fino alla riga dell'errore vero.

A installazione conclusa, fai una verifica:

```bash
eim --version
```

Se ti stampa un numero di versione, questo passo è andato, puoi passare a installare ESP-IDF sul serio.

---

## Passo 1: installare ESP-IDF v6.0.2 con EIM

Una volta pronto lo strumento, basta un comando per installare ESP-IDF:

```bash
HTTPS_PROXY=http://127.0.0.1:7890 \
HTTP_PROXY=http://127.0.0.1:7890 \
ALL_PROXY=socks5://127.0.0.1:7890 \
eim install -i v6.0.2 -t esp32s3 -n true \
  --idf-mirror https://git.espressif.com.cn \
  --pypi-mirror https://pypi.mirrors.ustc.edu.cn/simple
```

Significato dei parametri:

- `-i v6.0.2`: la versione da installare, **con il prefisso `v` obbligatorio**, motivo spiegato più sotto;
- `-t esp32s3`: chip di destinazione;
- `-n true`: modalità non interattiva, altrimenti resta in attesa di un Invio a ogni domanda;
- `--idf-mirror` / `--pypi-mirror`: mirror cinesi — il sorgente dal mirror ufficiale Espressif in Cina, i pacchetti Python dal mirror USTC; se non ti servono, toglili;
- le tre variabili d'ambiente `PROXY`: servono a EIM per i suoi accessi git interni, anche qui il motivo è spiegato nel trabocchetto 1 qui sotto.

Il comando sembra semplice, ma la prima volta ci sono cascato due volte, entrambe del tipo «sopra sembra installare normalmente, sotto scorre in diagonale».

### Trabocchetto 1: il proxy messo in git non serve a niente, EIM se ne frega

EIM internamente usa la libreria Rust `gix` per tirare giù il sorgente dell'IDF. Questa libreria non guarda `git config --global http.proxy`, considera solo le variabili d'ambiente di sistema `HTTPS_PROXY`, `HTTP_PROXY`, `ALL_PROXY`. Se il proxy è configurato solo nel file di git senza le corrispondenti variabili d'ambiente, `gix` prova la connessione diretta, fallisce a ripetizione, e nei log si riempie di righe come questa:

```
WARN - Attempt N failed: "Failed to fetch: Failed to consume the pack sent by the remote"
```

Dopo tre fallimenti `gix` rientra e si affida al git di sistema (che invece legge `git config` e quindi passerebbe dal proxy), quindi alla fine l'installazione quasi sempre riesce — però ti tocca aspettare minuti inutili, e il clone risultante da questo "fallback" non è proprio pulitissimo. La cosa più comoda è mettere le variabili proxy direttamente nel comando fin dall'inizio, così `gix` passa in un colpo solo senza dover fallire tre volte prima di arrendersi.

### Trabocchetto 2: numero di versione senza `v` dà errore

I tag di release del repository ufficiale Espressif sono tutti nel formato `v6.0.2` con la `v`, e il parametro `-i` di EIM viene passato tal quale come nome del tag git. Se scrivi `-i 6.0.2` (senza v), parte questo errore:

```
fatal: Remote branch 6.0.2 not found in upstream origin
```

Anche questo è in realtà l'errore sparato dal git di sistema quando, dopo il fallimento di `gix`, subentra il fallback: git non trova un branch remoto chiamato `6.0.2` (senza la v). Scrivendo `-i v6.0.2` tutto liscio. Se non sei sicuro di come sia scritto il tag di una certa versione, puoi prima controllare cosa c'è sul remoto:

```bash
git ls-remote --tags https://git.espressif.com.cn/espressif/esp-idf.git 'v6.0*'
```

### Come verificare l'installazione

```bash
eim list
# dovresti vedere v6.0.2 (selected)

source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py --version
# se stampa ESP-IDF v6.0.2 è andato tutto bene
```

### Dove finisce tutto dopo l'installazione

La struttura delle directory prodotte da EIM non è quella classica, e tutti i passaggi successivi fanno riferimento a questi percorsi, quindi fatti un'idea mentale:

```
Sorgente IDF       ~/.espressif/v6.0.2/esp-idf
Toolchain          ~/.espressif/tools/
Python venv        ~/.espressif/tools/python/v6.0.2/venv
Script di attivazione  ~/.espressif/tools/activate_idf_v6.0.2.sh
Manifesto EIM      ~/.espressif/tools/eim_idf.json
```

Una nota sulla posizione del virtualenv Python: è sepolto in `tools/python/v6.0.2/venv`, non più nella `python_env/` sotto la root del progetto come capitava nelle vecchie versioni — la prima volta che lo cerchi è facile smarrirsi.

---

## Passo 2: installa l'estensione ESP-IDF su VSCode

Sistema anche la riga di comando? Bene, torniamo in VSCode. Apri il pannello estensioni (`Cmd+Shift+X`) e cerca "ESP-IDF".

> **Tantissima gente installa quella sbagliata, controlla sempre il pubblicatore.** Nei risultati trovi diverse estensioni con nomi simili e icone quasi uguali, e se guardi solo il nome è un attimo cliccare su quella errata. Verifica queste informazioni e solo quando combaciano tutte clicca Installa:

| Campo | Valore |
|---|---|
| Nome estensione | ESP-IDF |
| Pubblicatore | Espressif Systems |
| Sito del pubblicatore | espressif.com |
| Installazioni | 1.582.039 |
| Valutazione | 145 recensioni |
| Descrizione | Develop and debug applications for Espressif chips with ESP-IDF |

**Guarda il pubblicatore, non solo il nome.** Il pubblicatore deve essere **Espressif Systems**, il dominio **espressif.com**, e le installazioni nell'ordine del milione — questi sono i contrassegni tipici dell'estensione ufficiale. Se sbagli estensione, i campi di configurazione di cui si parla al passo 4 (`idf.eimIdfJsonPath`, `idf.currentSetup` e simili) potrebbero proprio non esistere, oppure avere un comportamento del tutto diverso. Quando poi andrai a fare debug ti sembrerà tutto senza senso, ma la vera ragione è che avevi installato la roba sbagliata fin dall'inizio.

Una volta installata, riavvia VSCode (oppure `Cmd+Shift+P` → `Reload Window`) per farla caricare, poi si continua.

---

## Passo 3: il progetto arriva da Windows? Pulisci tre file

**Se il progetto è stato creato da zero su macOS, puoi saltare tutto questo passo.** Ma se è stato copiato da un computer Windows, ci cascherai quasi sicuramente: tre file nascondono percorsi in stile Windows che, una volta portati su macOS, smettono subito di funzionare.

### ① `.vscode/settings.json`

Sostituisci i percorsi Windows tipo `C:\...`, i nomi delle porte seriali (per esempio `COM22`) e i numeri di versione vecchi con i valori reali del tuo macOS:

```jsonc
{
  "idf.espIdfPath": "/Users/shawn/.espressif/v6.0.2/esp-idf",
  "idf.toolsPath":  "/Users/shawn/.espressif",
  "idf.pythonInstallPath": "/Users/shawn/.espressif/tools/python/v6.0.2/venv/bin/python",
  "idf.port": "/dev/cu.usbmodemXXXXXXXXXXX",
  "idf.customExtraVars": { "IDF_TARGET": "esp32s3" },
  "idf.flashType": "UART"
}
```

Per scoprire il nome del tuo dispositivo seriale:

```bash
ls /dev/cu.usb*
```

### ② `.vscode/c_cpp_properties.json`

Il campo `compilerPath` prima puntava alla versione Windows di `xtensa-esp32s3-elf-gcc.exe`, e anche il numero di versione della toolchain è quasi sicuramente vecchio. Va sostituito con quello effettivamente installato sul Mac. Il consiglio è di non scrivere il percorso in modo rigido: segui la variabile `toolsPath`, così quando aggiorni non devi toccare niente:

```jsonc
"compilerPath": "${config:idf.toolsPath}/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc"
```

Il pezzo `esp-15.2.0_20251204` non l'ho mica inventato: vai in `~/.espressif/tools/xtensa-esp-elf/` e guarda quale cartella è stata installata davvero, e metti quella.

### ③ `dependencies.lock` — il più facile da dimenticare

Questo è il file di lock generato da idf-component-manager (il gestore dei componenti). Su Windows è stato prodotto nel vecchio formato v2.0.0, e al suo interno vengono registrati anche i **percorsi assoluti** dei componenti locali, per esempio le cartelle del computer di chi l'ha creato:

```yaml
espressif/esp_lcd_touch:
  source:
    path: C:\Users\PC\Desktop\...\espressif__esp_lcd_touch
    type: local
```

Quando su macOS lanci reconfigure, ovviamente quel percorso non esiste più, e parte questo errore:

```
CMake Error: The "path" field in the manifest file ... does not point to a directory.
```

In pratica questo file è una cache autogenerata: cancellarlo e farlo rigenerare è la cosa più comoda:

```bash
rm dependencies.lock
rm -rf build
source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py reconfigure
```

Una volta rigenerato, avrai il formato v3.0.0 con percorsi locali, e i componenti dal registry verranno scaricati di nuovo dentro `managed_components/`.

**A questo punto il `idf.py build` da riga di comando dovrebbe funzionare senza intoppi.** Se ancora non passa, il problema non è in questi file e devi cercare altrove.

---

## Passo 4: l'estensione VSCode continua a dire "setup not found" (il vero trabocchetto)

Riga di comando a posto, mi aspettavo di avercela fatta. Invece apro VSCode e la status bar continua a dirmi:

```
Current ESP-IDF setup is not found.
```

Ho fatto due volte il Reload Window, ho cambiato un paio di campi che sembravano collegati, niente. Alla fine ho aperto il sorgente dell'estensione (`dist/extension.js`) e ho capito la logica completa con cui cerca il setup:

1. legge il file `eim_idf.json` puntato da `idf.eimIdfJsonPath` per ricavarne la lista dei setup installati;
2. usa il valore di `idf.currentSetup` per cercare una corrispondenza tramite percorso dentro quella lista;
3. se non la trova, scorre la lista voce per voce cercando qualcosa che si riesca a validare;
4. solo se tutto fallisce, sputa il "not found".

Tutta questa logica funziona solo se al passo 1 la lista viene caricata. Ho preso due strade sbagliate prima di arrivare alla vera causa: la prima in realtà era tempo perso e non devi replicarla, la seconda è il vero remedio da applicare. Le spiego entrambe chiaramente, così quando seguimi l'articolo sai benissimo cosa devi toccare e cosa no:

- **Deviazione uno: non serve toccare nulla, leggi solo per capire il principio, poi salta;**
- **Deviazione due: qui devi metter mano, è il vero remedio.**

### Deviazione uno (ignorala, serve solo a capire): cosa va dentro `idf.currentSetup`

La descrizione ufficiale di questo campo dice "Current ESP-IDF setup id in eim_idf.json path", e a leggerla sembra proprio che ci vada un ID (un numero). Ma se vai a spulciare il sorgente, quando l'estensione stessa seleziona un setup, ciò che scrive dentro è in realtà:

```js
await _o("idf.currentSetup", c.idfPath, ConfigurationTarget.WorkspaceFolder, e)
```

Quello che scrive è `idfPath`, cioè un **percorso**, non un numero. Quindi se questo campo si presenta nella configurazione di workspace, deve avere quest'aspetto:

```jsonc
"idf.currentSetup": "/Users/shawn/.espressif/v6.0.2/esp-idf"
```

Però **non devi metterci mano** — non è la causa. Se la lista dei setup di cui sotto (deviazione due) si carica correttamente, l'estensione scorre da sola i setup, trova l'unica v6.0.2 installata e riscrive automaticamente il percorso dentro `currentSetup`: questo passaggio lo fa lei. L'ho messo qui solo per spiegare il principio, così quando vedi questo campo sai cos'è, e non ti viene la tentazione di correggerlo a mano solo perché «sembra sbagliato». Quello che va davvero sistemato è la prossima cosa.

### Deviazione due (qui devi operare): il `scope` di `idf.eimIdfJsonPath` è sbagliato

I campi di configurazione di VSCode hanno vari scope (ambiti), e quello di `idf.eimIdfJsonPath` è **`application`** — il che significa che **viene letto solo dal `settings.json` globale (User)**. Se lo scrivi dentro il `.vscode/settings.json` del tuo progetto, viene completamente ignorato: scriverlo o non scriverlo è la stessa cosa.

Per molto tempo avevo tenuto `eimIdfJsonPath` dentro il file di configurazione del progetto, così l'estensione non riusciva a caricare il file `eim_idf.json`, e la lista dei setup del passo 1 restava vuota in eterno — lista vuota significa che qualunque valore metti in `currentSetup` non trova mai corrispondenza. E questo è il vero motivo per cui i primi due Reload non avevano sortito alcun effetto.

> **Il fix: sposta `idf.eimIdfJsonPath` dentro il file di configurazione globale.**

Il percorso del file di configurazione globale di VSCode su macOS è:

```
~/Library/Application Support/Code/User/settings.json
```

Aprilo con un editor e aggiungi questa riga:

```jsonc
"idf.eimIdfJsonPath": "/Users/shawn/.espressif/tools/eim_idf.json"
```

Nel `.vscode/settings.json` del workspace lascia solo `idf.currentSetup` (valorizzato col percorso dell'IDF). E non rimetterci anche `eimIdfJsonPath`: anche se lo scrivi lì non funziona, e ti lascia solo con l'illusione di aver fatto le cose per bene.

A modifiche fatte, apri la palette con `Cmd+Shift+P` e scegli **Reload Window**. A ricarico finito la status bar mostrerà versione di ESP-IDF e chip di destinazione, segno che alla fine l'estensione ha trovato tutto.

Se dopo il Reload hai ancora problemi, puoi guardare i log in tempo reale dell'estensione: `Cmd+Shift+P` → `Output`, e nel menu a tendina in alto a destra del pannello Output scegli il canale **ESP-IDF** — gli errori saranno molto più chiacchieroni di quell'unica riga della status bar.

### Non sai lo scope di un campo? Vai a leggerlo, niente ipotesi

Tutte le informazioni sugli scope di un'estensione VSCode vivono nel suo `package.json`. Invece di tirare a indovinare, scriviti qualche riga di script:

```bash
python3 -c "
import json
p = json.load(open('/Users/shawn/.vscode/extensions/espressif.esp-idf-extension-2.1.0/package.json'))
cfg = p['contributes']['configuration']
props = {}
if isinstance(cfg, list):
    for c in cfg:
        props.update(c.get('properties', {}))
else:
    props = cfg.get('properties', {})
for k in ['idf.eimIdfJsonPath', 'idf.currentSetup', 'idf.espIdfPath']:
    print(k, '->', props.get(k, {}).get('scope', 'window (predefinito)'))
"
```

---

## Scheda riassuntiva

### Dove vanno messi i campi di configurazione

| Campo | Scope | Dove scriverlo |
|---|---|---|
| `idf.eimIdfJsonPath` | application | User settings globale |
| `idf.currentSetup` | resource | `.vscode/settings.json` del workspace |
| `idf.espIdfPath` / `idf.toolsPath` / `idf.pythonInstallPath` | window | workspace o globale, indifferente |

### Percorsi chiave

```
Sorgente IDF       ~/.espressif/v6.0.2/esp-idf
Toolchain          ~/.espressif/tools/
xtensa gcc         ~/.espressif/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc
Python venv        ~/.espressif/tools/python/v6.0.2/venv/bin/python
Script di attivazione  source ~/.espressif/tools/activate_idf_v6.0.2.sh
Manifesto EIM      ~/.espressif/tools/eim_idf.json
Settings globale   ~/Library/Application Support/Code/User/settings.json
```

### Comandi utili

```bash
brew tap espressif/eim                              # aggiunge il tap ufficiale
brew trust espressif/eim                             # al primo uso di un tap di terze parti va dato il trust
brew install eim                                     # installa eim stesso

eim list                                              # elenca le versioni installate
eim install -i v6.0.2 -t esp32s3 -n true ...          # installa ESP-IDF (parametri al passo 1)

source ~/.espressif/tools/activate_idf_v6.0.2.sh      # attiva l'ambiente ESP-IDF nella shell corrente
idf.py set-target esp32s3                             # imposta il chip di destinazione
idf.py reconfigure                                    # rilancia solo la configurazione cmake, genera compile_commands.json
idf.py build                                          # compila
idf.py -p /dev/cu.usbmodemXXXX flash monitor          # flash e apre il monitor seriale
```

---

## Ordine di indagine: quando sei bloccato, restringi il campo così

Se non sai da dove cominciare, eliminare le cause una strato dopo l'altro in questo ordine è molto più veloce che tentare a caso:

1. **Riesci a installare con `brew install eim`?** Se no, controlla se l'output ti chiede `brew trust` — in caso, fidati del tap e via, vedi passo 0;
2. **Riesce a partire `idf.py --version`?** Se non parte, il problema è a livello di installazione o attivazione, vedi passo 1;
3. **I risultati nel pannello estensioni di VSCode sono quelli giusti?** Se dopo l'installazione i campi di configurazione non combaciano o le funzionalità dell'estensione sono del tutto diverse da quelle descritte in questo articolo, controlla prima che il pubblicatore sia Espressif Systems — molto probabilmente hai installato l'estensione sbagliata fin dall'inizio, vedi passo 2;
4. **Riesce a partire `idf.py reconfigure`?** Se non parte, il problema è nei file del progetto, in particolare guarda `dependencies.lock`, vedi passo 3;
5. **La riga di comando è a posto ma VSCode sputa setup not found?** Allora il problema è nella configurazione dell'estensione, con focus sullo scope di `eimIdfJsonPath`, vedi passo 4.

Anticipo subito due falsi amici che ti fanno solo perdere tempo:

- il tag v6.0.2 in sé non porta alcun file `version.txt` allegato: **non** significa che il clone sia incompleto, e l'estensione tra l'altro non lo legge nemmeno — vederlo mancante non è un problema;
- il valore di `idf.currentSetup` quasi mai è la vera causa del "setup not found": quando ti capita quell'errore, non avere fretta di modificarlo, priorità assoluta va alla verifica che `eimIdfJsonPath` sia scritto nel settings globale e non nel settings del workspace.

---

Se anche seguendo passo passo rimani bloccato, le probabilità sono che le versioni non combaciano: il modo di installare ESP-IDF e la logica con cui l'estensione VSCode cerca il setup sono cambiati più di una volta in questi anni, e i tutorial vecchi non sempre funzionano con le versioni nuove. Ti conviene raccogliere versione di ESP-IDF, di EIM, dell'estensione, insieme al messaggio di errore, passarli a un'AI e chiederle di seguire l'ordine di questo articolo — "installa lo strumento → installa IDF → pulisci i file del progetto → configura l'estensione" — di solito si arriva alla diagnosi molto più in fretta che cercare l'errore parola per parola.
