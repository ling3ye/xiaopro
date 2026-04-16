---
title: "Manuale per allevare aragoste senza farsi male | OpenClaw: dall'installazione al controllo del browser, tutto in un articolo"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-06
intro: "Vi è mai capitato di installare OpenClaw e non riuscire a farci nulla? L'autore ha disinstallato e reinstallato 10 volte, arrivando a capire a fondo la logica di configurazione della versione OpenClaw 2026.3.2: dall'accesso API, ai provider personalizzati, fino al controllo del browser e ai permessi di lettura/scrittura dei file. Ogni passaggio è corredato di screenshot e comandi. Adatto a utenti macOS, principianti e veterani ingannati da vecchie guide."
image: "https://img.lingflux.com/2026/03/015705fbca42171bdf09fabe9220b546.webp"
tags: ["guida configurazione openclaw", "openclaw 2026 setup", "openclaw tools profile", "tutorial OpenClaw", "permessi OpenClaw", "ultima versione OpenClaw"]
---

È un po' che alleviamo aragoste, e mi sembra che la versione attuale sia ormai abbastanza stabile. Prima mi faceva impazzire solo la questione dei nomi: il sito era di ClawdBot, ma il comando di installazione era install MoltBot, e poi l'hanno rinominato OpenClaw. Non è un bug, è la tradizione dei progetti open source: prima si fa, poi quando arriva la lettera dell'avvocato si cambia nome. (Claude ha fatto causa a ClawBot perché suonava troppo simile a Claude, e da allora Claw è diventato ancora più famoso.)

In questi giorni di test, mi sembrava di aggiornare ogni giorno. Per capire bene la logica della configurazione, ho disinstallato e reinstallato in continuazione, passando per

2026.2.25
2026.2.26
2026.3.1
2026.3.2
....

La frequenza degli aggiornamenti è incredibile. Soprattutto, testando l'ultima versione 2026.3.2 (alla data del 6 marzo 2026) ho scoperto che il metodo di configurazione è cambiato, rendendo inutilizzabili le procedure testate in precedenza. Questa versione ha migliorato la sicurezza della configurazione predefinita, ma richiede configurazione manuale per ottenere permessi più elevati.

Mi piace OpenClaw perché può controllare il browser e gestire i file di sistema, il che ovviamente porta anche un bel po' di problemi di sicurezza, quindi bisogna usarlo con cautela. Per allevare bene questa piccola aragosta, bisogna investire un po' di tempo per imparare a configurarla.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/flZj-SpTJmQ?si=Jn8A8xWZ-jIZQCeo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## Prima di iniziare: avete abbastanza credito API?

OpenClaw in sé è open source e gratuito, ma per "agire" ha bisogno di un modello AI che lo alimenti, e questo richiede un token API.

Se il vostro token è quasi esaurito o non l'avete ancora configurato, ecco due piattaforme che attualmente offrono un buon rapporto qualità-prezzo, scegliete in base alle vostre esigenze:

- **Zhipu GLM**: supporta Claude Code, Cline e oltre 20 strumenti, con offerte in abbonamento a tempo limitato → [Link](https://www.bigmodel.cn/glm-coding?ic=IPWNTCEXE2) (Lo sto usando ora, attenzione: NON è una pubblicità!!! NON è una pubblicità!!! NON è una pubblicità!!! Non sono stato pagato, lo spazio pubblicitario è disponibile)

	L'immagine seguente mostra:
	![image-20260306102449045](https://img.lingflux.com/2026/03/52e663b49875f0ab36c9fc1f2ff806dd.png)

	1. La vostra API KEY: trovate e copiate la API key nel centro di controllo
	2. L'indirizzo di GLM: https://open.bigmodel.cn/api/anthropic (l'indirizzo compatibile con Claude Code)
	3. Nome del modello: GLM-4.7

	Tenete a mente queste 3 informazioni, vi serviranno nella configurazione seguente

- **Alibaba Cloud Bailian**: modelli completi, nuovi utenti hanno credito gratuito → [Link](https://www.aliyun.com/benefit/ai/aistar?clubBiz=subTask..12406352..10263..) (Anche questa è buona, e anche questa NON è una pubblicità!!!)

Una volta pronti, cominciamo.





## Installazione di OpenClaw: iniziamo!

Io uso macOS, che è il sistema migliore per allevare aragoste, perché l'autore ha sviluppato tutto su macOS: i problemi sono minimi. Altri sistemi come Windows, Raspberry PI OS, Linux potrebbero avere qualche differenza. Ma il progetto ha molti contributori, quindi anche i problemi grossi vengono risolti in fretta.

Secondo me, la classifica di compatibilità è questa:

macOS > Linux > Windows > others

Andate prima sul sito ufficiale per vedere i vari metodi di installazione: https://openclaw.ai/

### Installazione rapida su macOS

Su macOS, il sito ufficiale offre un'APP da scaricare, ma non so perché non riesco proprio a installarla. Anche il comando automatico `curl -fsSL https://openclaw.ai/install.sh | bash` non funziona sempre, quindi ho scelto il metodo di installazione via npm. Digitate nel terminale:

```bash
# Installa OpenClaw
npm i -g openclaw
```

Aspettate pazientemente che l'installazione finisca, poi continuate con:

```bash
# Configura OpenClaw
openclaw onboard
```

Si aprirà l'interfaccia della procedura guidata di configurazione. Esaminate tutto con calma e procedete passo dopo passo per selezionare e configurare l'API. Il processo è più o meno questo:



### 1. Vi chiede il vostro scenario d'uso:

- **Personal (uso personale)**: Siete gli unici a usare questo Mac Mini → selezionate **Yes**
- **Shared/multi-user (uso condiviso)**: Più account utente condividono questa macchina, servono controlli aggiuntivi sui permessi → selezionate No

**Scegliete direttamente Yes** e premete Invio per continuare.

![image-20260306103540426](https://img.lingflux.com/2026/03/f4a9f8ac970e447eadd09b4533d4c6c0.png)



### 2. Vi chiede quale metodo di configurazione dell'installazione scegliere:

- **QuickStart (avvio rapido)**: Installate velocemente, i dettagli (chiave API, scelta del modello ecc.) li configurerete dopo
- **Manual (manuale)**: Configurate subito tutti i dettagli passo dopo passo

------

**Vi consiglio QuickStart**, per questi motivi:

- Potete farlo funzionare subito e poi regolare con calma usando `openclaw config set`
- Risparmiate tempo e fatica



![image-20260306104637473](https://img.lingflux.com/2026/03/e3a2171975e988818fbaf4a59195d72d.png)



### 3. Punto chiave: scegliete quale modello AI utilizzerà il "cervello" di OpenClaw.

In pratica: **OpenClaw non fornisce un'IA propria, dovete collegarlo a un provider di servizi AI.**

------

Spiegazione delle opzioni più comuni

| Opzione                    | Descrizione                                               |
| -------------------------- | --------------------------------------------------------- |
| **OpenAI**                 | GPT-4o ecc., il più diffuso                               |
| **Google**                 | Serie Gemini                                              |
| **XAI (Grok)**             | L'IA di Musk                                              |
| **Moonshot AI (Kimi)**     | Cinese, ottimo supporto per il cinese                     |
| **Mistral AI**             | Modello open source europeo                               |
| **OpenRouter**             | Piattaforma aggregata, una key per più modelli            |
| **Qianfan**                | Baidu Ernie                                               |
| **Volcano Engine**         | ByteDance Volcano Engine                                  |
| **Hugging Face**           | Piattaforma di modelli open source                        |

Questa scelta è fondamentale, perché a quanto si legge online, anche se scegliete un modello nazionale, questi hanno versioni diverse per il mercato interno e internazionale. Se selezionate direttamente un provider nazionale dalla lista (per esempio Qwen, Z.AI ecc.), l'URL di ingresso del modello potrebbe non corrispondere.

Quindi vi consiglio di scegliere `Custom Provider` e premere Invio. (Così l'URL del modello sarà definito da voi e non potrete sbagliarvi.)



![image-20260306104908514](https://img.lingflux.com/2026/03/f0f7b7cf1b38d23375a9c9d36a8abea8.png)



Poi vi chiederà di inserire l'API Base URL. Copiate l'URL corrispondente al vostro servizio. Nella demo, ho incollato l'indirizzo che vi ho fatto notare prima:
https://open.bigmodel.cn/api/anthropic (dopo aver inserito, premete Invio)

![image-20260306105524813](https://img.lingflux.com/2026/03/1bcc60387a3ba29b530e1bb53be24bf8.png)

Vi chiede se volete inserire subito la API KEY? Scegliete "Paste API key now" (inserisci ora) e premete Invio.

![](https://img.lingflux.com/2026/03/05a5eca5b5fa006180662a65d2ae9381.png)

Ora copiate la vostra API KEY e premete Invio.

![image-20260306105827355](https://img.lingflux.com/2026/03/291d99669c65b615d719844ddf743cee.png)

Poi vi chiede quale formato di interfaccia utilizza il vostro provider AI:

- **OpenAI-compatible**: il formato dell'interfaccia è come quello di OpenAI. La maggior parte dei provider di modelli supporta questo formato (OpenRouter, Kimi, Volcano Engine, Mistral ecc.)
- **Anthropic-compatible**: il formato dell'interfaccia è come quello di Anthropic (Claude)

Poiché il mio URL è compatibile con Claude Code, seleziono "Anthropic-compatible".

![image-20260306110230234](https://img.lingflux.com/2026/03/b515ca0d12b745463dee0ae52c35b1ab.png)

Successivamente vi verrà chiesto di inserire il model ID, che dovete verificare sul sito del vostro provider AI in base al nome specificato.

Nella demo sto usando GLM-4.7 (in realtà ora supporta già fino a GLM-5.0, inserite il nome del modello che avete). Premete Invio.

![image-20260306110457127](https://img.lingflux.com/2026/03/403f089e93c1d87df6cad0021532f953.png)

Dopo un breve attesa, partirà il test di connettività dell'API. Se il test ha successo, vedrete "Verification successful". Congratulazioni, avete completato il passaggio più complesso di tutta la configurazione.

![image-20260306110630506](https://img.lingflux.com/2026/03/3d695e4ca1951bb4247a8e87c66f1295.png)

Poi vi chiederà di inserire un Endpoint ID (un nome univoco per identificare questo provider AI, per distinguerlo dagli altri). Lasciate il valore predefinito e premete Invio.

Quindi vi chiederà un Model alias (un breve soprannome per il modello, per digitare meno quando lo cambiate). Potete lasciarlo vuoto o inserirne uno, poi premete Invio.



### 4. Scegliete attraverso quale app di chat volete comunicare con l'IA.

In pratica: dove volete chattare con il vostro bot AI?

------

Spiegazione delle opzioni più comuni

| Opzione          | Descrizione                                              |
| ---------------- | -------------------------------------------------------- |
| **Telegram**     | Consigliato ✅ Il più facile da configurare, amico dei principianti |
| **Discord**      | Per utenti gaming/comunità                               |
| **Slack**        | Per l'ambiente di lavoro                                 |
| **Feishu/Lark**  | Comune nelle aziende cinesi                              |
| **LINE**         | Comune in Giappone/Sud-est asiatico                      |
| **iMessage**     | Per utenti Apple                                         |
| **Signal**       | Per chi tiene alla privacy                               |
| **Skip for now** | Saltare, configurerete dopo                              |

Per ora selezionate "Skip for now", per motivi di spazio ne parleremo la prossima volta.

![image-20260306111140666](https://img.lingflux.com/2026/03/d1d97190310ba6be3e243af0b89ce93c.png)

### 5. Scegliete se configurare le competenze (skills)

Anche qui, selezionate NO, per motivi di spazio, ne parleremo in un altro articolo.

![image-20260306111359363](https://img.lingflux.com/2026/03/2fbc070efc12fe983d83711229631147.png)



### 6. Poi c'è una serie di configurazioni API: saltate tutto con NO

Vi sta chiedendo se volete configurare alcuni plugin per funzionalità aggiuntive, ognuno dei quali richiede la propria API Key:

------

| Prompt                              | Funzione                                       | Cosa serve              |
| ----------------------------------- | ---------------------------------------------- | ----------------------- |
| **GOOGLE_PLACES_API_KEY**           | Ricerca mappe/luoghi (Google Maps)             | Google Cloud API Key    |
| **GEMINI_API_KEY**                  | Usare il modello Gemini AI                     | Google AI Studio Key    |
| **NOTION_API_KEY**                  | Connettere le vostre note Notion               | Notion Integration Token |
| **OPENAI_API_KEY (image-gen)**      | Generazione immagini AI (DALL-E)               | OpenAI API Key          |
| **OPENAI_API_KEY (whisper)**        | Trascrizione vocale                            | OpenAI API Key          |
| **ELEVENLABS_API_KEY**              | Sintesi vocale AI (text-to-speech)             | ElevenLabs Key          |

------

Cosa fare? **Per ora selezionate No / Saltate tutto**, ecco perché:

- Sono funzionalità opzionali, non influenzano l'uso di base
- Se non avete l'account corrispondente, non funzionerebbero comunque
- Potete sempre tornare a configurarle in seguito

![image-20260306111518497](https://img.lingflux.com/2026/03/66c6830490fd101cd8bc45b7b3bf041c.png)

### 7. Gli Hook sono trigger automatici che eseguono determinate azioni quando si verificano eventi specifici.

| Opzione                    | Funzione                                                       |
| -------------------------- | -------------------------------------------------------------- |
| **Skip for now**           | Saltare tutto                                                  |
| **boot-md**                | Caricare automaticamente alcune istruzioni/prompt all'avvio    |
| **bootstrap-extra-files**  | Caricare automaticamente file aggiuntivi all'avvio             |
| **command-logger**         | Registrare tutti i log delle operazioni                        |
| **session-memory**         | Salvare automaticamente la memoria della conversazione quando si esegue `/new` o `/reset` |

------

Vi consiglio di selezionare solo **`session-memory`**, è la più utile: permette all'IA di ricordare le conversazioni precedenti.

Per le altre, saltatele per il primo utilizzo e attivatele quando avrete più familiarità.

Usate la **barra spaziatrice per selezionare** e Invio per confermare.

![image-20260306111717358](https://img.lingflux.com/2026/03/ef24d76177a3e999293f7e0da00389da.png)



### 8. Come avviare e utilizzare il vostro bot:

- **Hatch in TUI**: Usatelo direttamente nel terminale, interfaccia a riga di comando.
- **Open the Web UI**: (Consigliato) Aprite l'interfaccia web nel browser.
- **Do this later**: Più tardi.

Selezionate "Open the Web UI" e premete Invio.

![image-20260306112107760](https://img.lingflux.com/2026/03/3244eb382e44133d4cc81f6ec18e57af.png)

A questo punto, il browser aprirà automaticamente l'interfaccia Web UI di OpenClaw.

## La prima conversazione con la vostra piccola aragosta (OpenClaw)

![image-20260306112419909](https://img.lingflux.com/2026/03/f40a3a5c08362eecb739689dbcba3139.png)

Se OpenClaw risponde, significa che l'installazione è riuscita e sta funzionando correttamente.

Congratulazioni!

Però ora, la vostra piccola aragosta sa solo piangere per la fame: non ha né mani né piedi, e qualsiasi cosa le chiediate di fare non ci riesce (non apre il browser, non modifica i file).

![image-20260306113036590](https://img.lingflux.com/2026/03/833a2ec19f73a2caab5a9aeb5138a0d2.png)





## Configurazione del controllo del browser e dei permessi sui file

Attenzione: le operazioni seguenti aumenteranno i privilegi del vostro OpenClaw. Leggete attentamente i contenuti e continuate a imparare.

### OpenClaw ha 2 modalità per controllare il browser

1. (Modalità indipendente) Usa il browser integrato di OpenClaw, completamente isolato dal sistema locale, con informazioni di login indipendenti.

2. (Modalità estensione) Usa il browser Chrome locale, installa l'estensione OpenClaw Browser Relay e condivide le informazioni di login del sistema.

> In questo esempio dimostriamo l'uso della **modalità estensione** con il browser Chrome locale



### Trovare la OpenClaw gateway token KEY

Trattate la OpenClaw gateway token KEY come una password, conservatela con cura.

Ci sono 2 modi per ottenere la OpenClaw gateway token KEY:

#### 1. Trovarla direttamente nel file di configurazione

Il file di configurazione su macOS si trova nella directory utente, è un file nascosto: dovete abilitare la visualizzazione dei file nascosti per trovare la cartella `.openclaw`. Apritela e aprite il file openclaw.json; nella sezione "gateway" troverete il token.

![image-20260306122344215](https://img.lingflux.com/2026/03/537f4f44ca08c446ef9ede6549ddb90d.png)

#### 2. Visualizzarla nella Web UI (il metodo più semplice)

Cliccate su "Overview" e sotto "Gateway Token" la troverete, comodamente visibile.

![image-20260306122950056](https://img.lingflux.com/2026/03/54be336e2aaa6342c1289fc5370c270a.png)





### 1. Installare l'estensione per il controllo del browser su Chrome

Cercate "OpenClaw Browser Relay" nel Chrome Web Store (https://chromewebstore.google.com/)

(al momento della scrittura era arrivato alla versione v2.7) e installatelo. (Attenzione: ci sono molte estensioni che si chiamano OpenClaw Browser, leggete bene e non installate quella sbagliata)

Dopo l'installazione si aprirà una pagina che vi chiede di inserire il token KEY per la verifica. Qui dovete inserire la gateway token KEY di OpenClaw, NON la AI API KEY, non confondetele.

Una volta configurato, vi consiglio di fissare l'estensione in alto per comodità. (Più avanti dovrete operare manualmente, tenetelo a mente.)

![image-20260306114923386](https://img.lingflux.com/2026/03/9b0e0c0e5bc27812210d0b9886a1962d.png)



### 2. Abilitare la modalità sviluppatore

Inserite `chrome://extensions/` nella barra degli indirizzi del browser e premete Invio per accedere alla pagina di gestione delle estensioni. In alto a destra c'è un interruttore "Developer mode" (modalità sviluppatore): verificate che sia attivato e, se non lo è, abilitatelo.



### 3. Configurare OpenClaw per supportare il browser e le operazioni sui file

Usate la configurazione CLI. Aprite il terminale e inserite i seguenti comandi:

```bash
# Imposta i permessi di openclaw al livello coding
openclaw config set tools.profile coding

# Assicurati che la funzionalità browser sia attiva
openclaw config set browser.enabled true

# Passa a Chrome di sistema (questo è il metodo ufficiale per usare il Chrome predefinito del sistema)
openclaw config set browser.defaultProfile "chrome"

# Svuota la allowlist (per far esporre automaticamente gli strumenti file corretti al profilo coding, questo è fondamentale!)
openclaw config set tools.allow '[]'

# Configurazione completata, riavvia openclaw gateway (obbligatorio)
openclaw gateway restart
```

Come mostrato nell'immagine:

![image-20260306113653129](https://img.lingflux.com/2026/03/02f6c0258cc846cf7699cd372bbb8a03.png)

Dopo il riavvio...

1. Aprite il browser e visitate una pagina qualsiasi, per esempio https://lingshunlab.com, poi cliccate sull'estensione appena installata, quella con l'aragesta. Cliccate e dovrebbe apparire un piccolo contrassegno "ON", che indica che funziona correttamente.

![image-20260306124413421](https://img.lingflux.com/2026/03/4ef9d1f4eb78a3ca6b2463ed0e809f89.png)

2. Andate alla pagina Web UI di OpenClaw e aprite una chat in "Chat", ma prima di iniziare a chattare create un "New session", poi inviate qualcosa come "Apri il sito bilibili.com nel browser".

Se tutto funziona correttamente, il browser si aprirà automaticamente all'indirizzo di bilibili.

![image-20260306123830087](https://img.lingflux.com/2026/03/7580e05a2df8e32d72a7370d3fa964a5.png)

A questo punto potete anche provare la funzionalità di operazione sui file: inviate qualcosa come "Aiutami a creare un file nella directory utente, per testare la funzione di creazione file", e la piccola aragesta creerà il file con successo.

![image-20260306124032376](https://img.lingflux.com/2026/03/3532062bde99391b12d64eb1c8e2de3b.png)



Tutto funziona, congratulazioni! Ma... inizia a fare un po' paura, vero? E se...

Quindi voglio limitare le operazioni sui file alla directory "workspace". Ma dove si trova questa directory workspace? Potete verificarla nel file di configurazione openclaw.json, oppure nella Web UI sotto "Agents" > "Overview".

![image-20260306125311134](https://img.lingflux.com/2026/03/6b0ba79477058ff2819ac69caca95fb3.png)



### 4. Limitare le operazioni sui file alla sola directory workspace

Usate la configurazione CLI. Aprite il terminale e inserite il seguente comando:

```bash
# Configura le operazioni sui file limitate alla directory workspace
openclaw config set tools.fs.workspaceOnly true
```

Poi riavviate il gateway:

```bash
openclaw gateway restart
```





## Conclusione

Ora la vostra aragosta ha le mani.

Può aprire il browser, cliccare sulle pagine, leggere e scrivere file nell'area di lavoro che le avete assegnato. Sembra semplice, ma in realtà le possibilità sono enormi.

Nel prossimo articolo vi mostrerò come collegarla a Feishu, così potrete allevare la vostra aragesta "nel cloud" da ovunque vi troviate.

Se vi interessa, iscrivetevi al mio canale, continuerò ad aggiornare:

- **YouTube**: [lingshunlab](https://www.youtube.com/@lingshunlab)
- **Bilibili**: [凌顺实验室](https://space.bilibili.com/456183128)



## Riferimenti

### Permessi di **`tools.profile`**

https://docs.openclaw.ai/tools#tool-profiles-base-allowlist

In OpenClaw (versione 2026.3.2 e versioni recenti), **`tools.profile`** è il preset di base dei permessi degli strumenti (base allowlist). Questa impostazione ha un impatto forte sulla sicurezza: nelle nuove installazioni il valore predefinito è `"messaging"` (un cambiamento importante introdotto dalla versione 2026.3.x). Nelle vecchie versioni molti utenti erano abituati a usare broad/coding, che ora va impostato esplicitamente.

### Confronto dei permessi (differenze chiave a colpo d'occhio)

| Dimensione                                              | minimal                | messaging                       | coding                                           | full                   |
| ------------------------------------------------------- | ---------------------- | ------------------------------- | ------------------------------------------------ | ---------------------- |
| **Operazioni sui file** (fs.read/write/edit/apply_patch) | ✗ Completamente vietato | ✗ Vietato                       | ✓ Consentito (può essere limitato con fs.workspaceOnly) | ✓ Consentito           |
| **Esecuzione shell** (exec/runtime/process)             | ✗ Vietato              | ✗ Vietato                       | ✓ Consentito (può aggiungere approvals.exec)     | ✓ Consentito           |
| **Browser** (browser)                                   | ✗ Vietato              | ✗ Vietato                       | ✓ Consentito                                     | ✓ Consentito           |
| **Gestione messaggi/sessioni** (sessions_*, messaging group) | Solo session_status    | ✓ Supporto completo             | ✓ Supporto completo                               | ✓ Supporto completo    |
| **Strumenti immagine/memoria** (image, memory_*)        | ✗ Vietato              | ✗ Vietato                       | ✓ Supporto parziale                               | ✓ Supporto completo    |
| **Altri strumenti ad alto rischio** (cron, gateway, nodes ecc.) | ✗ Vietato              | ✗ Vietato                       | ✗ La maggior parte vietata (serve allow)         | ✓ Probabilmente aperto |
| **Predefinito nelle nuove installazioni**               | ✗ Non predefinito      | ✓ Sì (cambiamento importante 2026.3.x) | ✗ Richiede impostazione manuale                  | ✗ Richiede impostazione manuale |
| **Utenti consigliati**                                  | Sicurezza massima, solo chat | Utente normale, principianti, prevalentemente chat | Sviluppatori, utenti intensivi di codice/file    | Test, POC, quando ci si fida del modello |

###

### Lista comandi comuni del browser

https://docs.openclaw.ai/tools/browser


