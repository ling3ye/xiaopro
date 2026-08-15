---
title: "Kimi K3 in profondità: il modello open source con più parametri al mondo, quanto vale davvero?"
domain: ai
format: news
date: 2026-08-15
intro: "A luglio 2026, Moonshot AI ha rilasciato Kimi K3 con 2,8 trilioni di parametri, il modello open source con più parametri al mondo, superando per la prima volta i flagship closed source nella classifica di programmazione frontend. Questo articolo analizza in modo completo tecnologie chiave, benchmark, prezzi e punti di accesso, spiegando dove eccelle e se vale la pena usarlo."
image: "https://img.lingflux.com/2026/08/571adb2c06517070adb8f0f31ab2892e.png"
tags: ["Kimi K3", "Moonshot AI", "modello open source", "modello di grandi dimensioni", "Artificial Analysis", "LMArena"]
---

> **Riassunto in una frase**: con 2,8 trilioni di parametri, Kimi K3 è in cima ai modelli open source mondiali e ha superato per la prima volta i flagship closed source nella classifica di programmazione; questo articolo spiega dove eccelle, quanto costa e dove usarlo.

> Dati aggiornati al 12 agosto 2026
> I dati di questo articolo provengono da Xinhua News Agency, Artificial Analysis, LMArena, materiali di lancio ufficiali di Moonshot e diverse valutazioni di terze parti; prima della pubblicazione si consiglia di verificare nuovamente le classifiche più recenti.

---

## 1. Introduzione: il modello open source tocca per la prima volta il "soffitto"

Il 16 luglio 2026, il giorno prima dell'apertura della World Artificial Intelligence Conference (WAIC) di Shanghai, Moonshot AI ha lanciato una vera e propria bomba: **Kimi K3**.

I suoi titoli sembrano esagerati, ma sono tutti reali:

- **2,8 trilioni di parametri totali**, il modello open source con il maggior numero di parametri al mondo, ben oltre DeepSeek V4 Pro (1,6 trilioni) e la serie GLM-5 di Zhipu AI (744 miliardi);
- **il primo modello open source al mondo a livello di 3 trilioni di parametri**;
- **la prima volta nella storia dei modelli open source che un modello open source supera direttamente i flagship closed source nelle classifiche principali**: nella classifica di programmazione frontend Frontend Code Arena, Kimi K3 è in cima con 1679 punti, superando Claude Fable 5 di Anthropic e GPT-5.6 Sol di OpenAI.

Come ha detto Xinhua, questo "segna un nuovo passo nello sviluppo dei modelli di intelligenza artificiale del Paese". Per gli utenti comuni, invece, la domanda più concreta è: dove eccelle? Cosa c'entra con me? Dove posso usarlo? Questo articolo risponde a tutto una volta per tutte.

---

## 2. Che cos'è Kimi K3?

### 2.1 Scheda di base

| Voce | Dettagli |
|---|---|
| Sviluppatore | Moonshot AI (fondata nel 2023 da Yang Zhilin, imprenditore legato a Tsinghua; Alibaba e Tencent sono tra gli investitori) |
| Data di rilascio | pubblicato il 16 luglio 2026, pesi completi resi open source il 27 luglio |
| Architettura | modello MoE a mistura di esperti, 93 livelli, 896 esperti in totale, di cui solo 16 attivati per ogni token |
| Parametri totali / attivi | 2,8 trilioni / circa dieci miliardi (attivazione sparsa, costo di inferenza di gran lunga inferiore a quanto suggerisca la dimensione) |
| Finestra di contesto | 1 milione di token (1.048.576), prezzo unico senza fasce |
| Modalità | supporto nativo testo + comprensione immagini (encoder visivo MoonViT-V2); alcuni canali supportano già input video |
| Licenza open source | Kimi K3 License personalizzata (simile a MIT, con clausole a scaglioni sui ricavi) |

### 2.2 Due innovazioni tecniche fondamentali

Il punto forte di Kimi K3 non è solo la "grandezza", ma anche il modo in cui elabora le informazioni:

**1. Attenzione lineare ibrida KDA (Kimi Delta Attention)**

Con il meccanismo di attenzione completa dei Transformer tradizionali, quando si elaborano testi lunghi il costo computazionale cresce in modo quasi quadratico rispetto alla lunghezza del testo: se il contenuto raddoppia, il costo diventa circa 4 volte maggiore. Questa è la ragione fondamentale per cui i testi molto lunghi sono difficili da gestire nella pratica. K3 usa il modulo di attenzione lineare KDA sviluppato internamente in 69 dei suoi 93 livelli, riducendo il costo a una crescita quasi **lineare**. Il risultato: cache KV ridotta di circa il 75% e throughput di decodifica di un milione di token aumentato di circa 6,3 volte. In breve, a parità di potenza di calcolo riesce a "leggere" più a lungo e a "ragionare" più in profondità.

**2. Residui di attenzione (Attention Residuals / AttnRes)**

Più il modello è grande e più livelli ha, più l'informazione tende ad attenuarsi e distorcersi nel passaggio tra i livelli, e più l'addestramento rischia di collassare. La tecnica dei residui di attenzione permette al modello di recuperare selettivamente le rappresentazioni attraverso la profondità, invece di accumularle meccanicamente livello per livello: è come dotare un modello gigante da 2,8 trilioni di parametri di uno "stabilizzatore". Secondo il team ufficiale, la combinazione delle due tecniche porta K3 a un'efficienza di **scaling dell'addestramento di circa 2,5 volte** superiore rispetto a K2.

### 2.3 Strategia open source: chiunque può scaricarlo, ma le big tech devono "registrarsi"

Il 27 luglio, i pesi completi e il technical report di K3 sono stati pubblicati su Hugging Face e GitHub. La licenza è complessivamente vicina a MIT: chiunque può usare, modificare, distribuire e fare fine-tuning gratuitamente. Ci sono solo due restrizioni legate ai ricavi:

- i provider cloud che rivendono l'inferenza di K3 su larga scala in modalità "model-as-a-service" devono firmare un accordo separato con Moonshot dopo che i loro ricavi superano 200.000 dollari in 12 mesi consecutivi;
- i prodotti commerciali con più di 100 milioni di utenti attivi mensili o ricavi mensili superiori a 2 milioni di dollari devono indicare chiaramente "Kimi K3" nell'interfaccia.

Per la stragrande maggioranza degli sviluppatori e delle PMI, questo significa "gratuito e utilizzabile commercialmente".

---

## 3. Testa a testa: la posizione reale nelle classifiche principali

I benchmark vanno letti separatamente: da un lato le **verifiche indipendenti di enti terzi** (alta affidabilità), dall'altro i **dati dichiarati dai produttori** (solo come riferimento). Partiamo dalle due classifiche complessive più significative.

### 3.1 Indice di intelligenza di Artificial Analysis (benchmark oggettivi, dati di inizio agosto 2026)

| Posizione | Modello | Indice di intelligenza | Tipo |
|---|---|---|---|
| 1 | Claude Opus 5 (max) | 63 | Chiuso |
| 3 | Claude Fable 5 | 62 | Chiuso |
| 5 | GPT-5.6 Sol (max) | 61 | Chiuso |
| **6** | **Kimi K3 (max)** | **60** | **Open source** |
| 7 | GPT-5.6 Sol (xhigh) | 59 | Chiuso |
| 9 | Qwen3.8 Max | 58 | Chiuso |

**Kimi K3 è il modello open source con la posizione più alta in classifica ed è anche il primo tra i modelli cinesi.** Il suo divario rispetto ai primi cinque flagship closed source è di soli 1-3 punti: appartiene alla "stessa fascia di frontiera", non a una generazione di distanza.

### 3.2 LMArena (votazioni reali in blind test, agosto 2026)

| Modello | Elo classifica testo | Note |
|---|---|---|
| Claude Fable 5 | 1525 | testo #1 |
| Claude Opus 5 | 1522 | nuovo flagship |
| GPT-5.6 Sol | 1514 | flagship OpenAI |
| **Kimi K3** | **≈1500** | **in linea con la prima fascia closed source; #1 nella classifica di programmazione** |
| GLM-5.2 | 1483 | Open source |
| DeepSeek V4 Pro | 1462 | Open source |

Ciò che merita di essere messo in evidenza è la classifica di programmazione: **Kimi K3 si è classificato primo su Frontend Code Arena con 1679 Elo** (Claude Fable 5 a 1631, GPT-5.6 Sol a 1618), conquistando il primo posto in 6 dei 7 sotto-ambiti. È la prima volta che un modello open source sale in cima a una classifica della serie Arena: la generazione precedente K2.6 era ancora al 18° posto, una generazione ha fatto guadagnare 17 posizioni.

### 3.3 Confronto delle capacità specialistiche (dati ufficiali Moonshot + elaborazioni di terze parti)

| Benchmark | Kimi K3 | Claude Fable 5 | GPT-5.6 Sol | Claude Opus 4.8 |
|---|---|---|---|---|
| SWE Marathon (sviluppo sequenziale molto lungo) | **42 (#1)** | 35 | 39 | 40 |
| Program Bench (reverse engineering software) | **77.8 (#1)** | 76.8 | 77.6 | 71.9 |
| Terminal-Bench 2.1 (operazioni da terminale) | 88.3 | 84.6 | **88.8** | 84.6 |
| FrontierSWE (ingegneria del software ad alta difficoltà) | 81.2 | **86.6** | 71.3 | 66.7 |
| BrowseComp (ricerca web approfondita) | **91.2 (SOTA)** | 88.0 | 90.4 | 84.3 |
| Automation Bench (automazione d'ufficio) | **30.8 (#1)** | 29.1 | 29.7 | 27.2 |
| SpreadsheetBench 2 (modellazione Excel) | **#1** | — | — | — |
| GPQA-Diamond (ragionamento scientifico) | 93.5 | 92.6 | **94.1** | 91.0 |
| MMMU-Pro (ragionamento visivo) | 81.6 | 81.2 | **83.0** | 78.9 |
| OmniDocBench (comprensione di documenti) | **91.1 (#1)** | 89.8 | 85.8 | 87.9 |

(Nota: alcune voci sono state testate con framework agent diversi da ciascun produttore; il confronto trasversale è solo indicativo.)

**Profilo delle capacità di K3 in una frase:**

- ✅ **Programmazione di lungo corso e sviluppo frontend**: attualmente senza rivali nell'ambito open source, con diversi primi posti;
- ✅ **Ricerca approfondita e automazione d'ufficio**: nuovo record su BrowseComp;
- ✅ **Comprensione di documenti molto lunghi**: contesto da 1 milione di token + primo posto nella comprensione di documenti, ideale per analizzare interi repository di codice e grandi volumi di materiale;
- ⚠️ **Esperienza complessiva**: il team ufficiale stesso ammette che, sul piano della "sensazione" legata ai dettagli interattivi e al completamento dei task, K3 è ancora leggermente inferiore a Claude Fable 5 e GPT-5.6 Sol; test indipendenti misurano una velocità di output di circa 36-55 token/s, non elevata, e in modalità di ragionamento il consumo di token è piuttosto alto.

### 3.4 Rapporto qualità-prezzo: l'economicità è relativa

| Modello | Input ($/milione di token) | Output ($/milione di token) | Input con cache hit |
|---|---|---|---|
| Kimi K3 | 3.0 | 15.0 | 0.30 |
| Claude Fable 5 | 10.0 | 50.0 | — |
| Claude Opus 4.8 | 5.0 | 25.0 | — |
| GPT-5.6 Sol | 5.0 | 30.0 | — |
| Kimi K2.6 | 0.95 | 4.0 | 0.16 |

Il prezzo ufficiale in Cina è di ¥20/milione di token in input, ¥100/milione di token in output e ¥2/milione di token con cache hit.

Il prezzo di K3 è circa 1/3 di quello di Claude Fable 5, ma è 4-5 volte più costoso del suo stesso K2.6. Il trucco chiave per risparmiare è la **cache**: nello scenario di programmazione il team ufficiale dichiara che il tasso di cache hit può superare il 90%, e la parte di input con hit viene scontata a un decimo del prezzo; su OpenRouter il costo effettivo dell'input misurato è di circa $0,55/milione di token. Secondo calcoli di terze parti, per lo stesso round di un task di coding agent (100.000 token in input + 20.000 in output), K3 costa circa $0,60 contro circa $2,00 di Fable 5.

---

## 4. Dove posso usare Kimi K3?

Questa è la parte che interessa di più a tutti, ed è anche quella che stavo cercando di recente; la riporto qui per condividerla con voi, ordinata dalla soglia d'accesso più bassa alla più alta:

### 4.1 WorkBuddy (uno dei modi più semplici)

[https://www.workbuddy.cn/](https://www.workbuddy.cn/events/invite?inviteCode=421qev5h73caj0) (link di invito a WorkBuddy)

Perché non consiglio in primo luogo il sito ufficiale di Kimi? Perché al momento non è proprio aperto, non si sa quando verrà aperta la sottoscrizione; sono ormai 2 settimane che aspetto. A meno che tu non sia già un membro storico di Kimi, nel qual caso puoi passare direttamente oltre, ahah.

**WorkBuddy integra già Kimi K3**: la conversazione che stai leggendo ora è alimentata proprio da Kimi K3. Per gli utenti comuni e gli scenari d'ufficio che non vogliono smanettare con chiavi API o studiare i parametri, basta aprire WorkBuddy e usarlo direttamente: scrivere documenti, creare tabelle, leggere PDF, eseguire codice, generare pagine web; il lungo contesto e le capacità di agent di K3 sono pronti all'uso in WorkBuddy. È anche uno dei percorsi più brevi per gli utenti cinesi per sperimentare a costo zero le capacità complete di K3.

### 4.2 La gamma di prodotti ufficiali di Kimi

https://kimi.com

- **Kimi Web / App** (kimi.com / kimi.moonshot.cn): basta registrarsi per conversare; la quota gratuita ha limiti di contesto e di frequenza, e l'abbonamento sblocca il contesto completo da 1M;
- **Kimi Work**: ambiente di knowledge working desktop (Windows / Mac con chip Apple, dalla versione 3.1.0);
- **Kimi Code**: agent di programmazione da terminale, installabile con `npm i @moonshot-ai/kimi-code`, passando a K3 con `/model`.

### 4.3 API ufficiale (sviluppatori)

- Piattaforma: platform.moonshot.cn (Cina) / platform.kimi.ai (internazionale);
- Totalmente compatibile con l'SDK di OpenAI, con ID modello `kimi-k3`; basta puntare `base_url` a `https://api.moonshot.ai/v1` per migrare il codice esistente.

```python
from openai import OpenAI

client = OpenAI(
    api_key="la tua chiave API",
    base_url="https://api.moonshot.ai/v1"
)
resp = client.chat.completions.create(
    model="kimi-k3",
    messages=[{"role": "user", "content": "Analizza questo codice per me"}]
)
```

### 4.4 Piattaforme di terze parti

- **OpenRouter**: ID modello `moonshotai/kimi-k3`, stesso prezzo ufficiale senza sovrapprezzo;
- **SiliconFlow**: accesso agevole dalla Cina;
- **Cloudflare Workers AI, Groq**: anch'essi già disponibili;
- **Auto-hosting**: scarica i pesi da Hugging Face / GitHub, con supporto a vLLM / SGLang e quantizzazione MXFP4/NVFP4; ma il deployment a livello di produzione richiede supernodi da oltre 64 GPU, quindi per la gente comune è giusto un'occhiata.

### 4.5 Un piccolo promemoria

Dopo il rilascio di K3, a causa della domanda esplosiva, l'abbonamento ufficiale a Kimi ha temporaneamente sospeso i nuovi acquisti (dal 20 luglio, con priorità agli utenti esistenti). Se il canale ufficiale è congestionato, WorkBuddy, OpenRouter, SiliconFlow e simili sono ingressi alternativi affidabili.

---

## 5. In conclusione

Il significato di Kimi K3 potrà essere compreso appieno solo tra qualche anno:

1. **Ha dimostrato che l'open source può raggiungere il closed source.** 2,8 trilioni di parametri, primo posto nella classifica di programmazione di Arena, primo open source nell'indice di intelligenza: l'era in cui "open source = seconda fascia" è finita;
2. **Ha dimostrato che i team cinesi possono fare innovazione architetturale di fondo.** L'attenzione lineare KDA e i residui di attenzione non sono semplice accumulo ingegneristico, ma soluzioni originali per due problemi di livello mondiale: "calcolare in modo efficiente testi molto lunghi" e "addestrare in modo stabile modelli molto grandi";
3. **Ha fatto crollare il prezzo delle capacità di frontiera.** Un terzo del prezzo di Claude e pesi scaricabili da chiunque permetteranno a più prodotti e ricerche di crescere sulle spalle di K3.

Occorre però essere lucidi: sul piano dell'esperienza complessiva resta indietro rispetto ai due o tre modelli closed source più forti, la velocità di inferenza non è elevata e la modalità di ragionamento consuma parecchi token. Non è una chiave universale, ma se ti trovi di fronte a task ostici come **documenti lunghi, interi repository di codice, ricerche approfondite e sviluppo frontend**, Kimi K3 è oggi la risposta più forte che il mondo open source può offrirti, e ora puoi usarlo semplicemente aprendo WorkBuddy.

---

## Riferimenti

1. Xinhua News Agency: "Nuova svolta: un'azienda cinese pubblica il più grande modello open source al mondo, Kimi K3", 17-07-2026
2. Artificial Analysis Intelligence Index, dati agosto 2026
3. Classifica LMArena, snapshot agosto 2026
4. Materiali di lancio ufficiali di Moonshot AI e technical report di Kimi K3, luglio 2026
5. Valutazioni di terze parti come PureAI / Neowin / SiliconFlow / dev.to, luglio-agosto 2026

> Disclaimer: i benchmark riportati nell'articolo includono dati dichiarati dai produttori, e i risultati ottenuti con framework di test diversi non sono pienamente confrontabili; prezzi e canali disponibili fanno riferimento alle pagine in tempo reale delle rispettive piattaforme.
