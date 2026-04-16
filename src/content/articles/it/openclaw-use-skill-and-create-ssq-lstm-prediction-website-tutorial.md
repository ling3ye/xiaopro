---
title: "OpenClaw sul campo: creare un sito di analisi del SuperEnalotto in 1 ora! Libertà finanziaria?"
domain: ai
platforms: ["mac", "windows", "linux"]
format: "tutorial"
date: 2026-03-15
intro: "Una guida passo-passo su come creare competenze personalizzate in OpenClaw, poi usare la conversazione per guidare l'AI a completare un sito web di previsione LSTM per il SuperEnalotto — dal brief iniziale alla verifica, segnalazione problemi, fino ad avere un'applicazione web completa e funzionante, tutto senza scrivere una riga di codice."
image: "https://img.lingflux.com/2026/03/85e592835608cc53041951e03f4b52fd.png"
tags: ["OpenClaw", "strumenti AI", "LSTM", "SuperEnalotto", "ClawdHub", "creazione competenze", "sviluppo senza codice"]
---


> ⚠️ Disclaimer: il contenuto seguente è puramente a scopo di studio e non costituisce alcun consiglio di investimento. Se compri un biglietto della lotteria sono fatti tuoi; se vinci ricordati di offrire la cena, se perdi non venire a cercare me.

---

## Cosa imparerai

Questo progetto in apparenza è la realizzazione di un sito web di previsione della lotteria, ma in realtà vivrai l'esperienza di:

- Creare manualmente una competenza personalizzata in OpenClaw
- Utilizzare un modello di deep learning LSTM per elaborare serie temporali
- Integrare frontend e backend per far girare un'applicazione web completa

Le previsioni sono affidabili? A dire il vero, un modello LSTM davanti a combinazioni numeriche ad altissima casualità, in teoria, fa più o meno lo stesso effetto di pestare i tasti col piede. Ma questo sistema ti fornisce un risultato stabile, non un risultato diverso ogni volta — e già questo batte l'intuito di un sacco di gente.

---

## Part 0: Far creare una competenza a OpenClaw in automatico

Non sai da dove iniziare? Nessuna fretta, puoi semplicemente chiederglielo:

```
创建一个技能的步骤是什么？详细说出每一个操作步骤。
```

Ti elencherà tutto per filo e per segno. Poi gli chiedi di prepararti un esempio, e alla fine ti dice dove l'ha salvato e come richiamarlo — in pratica lo fai dimostrare una volta, e tu guardi e impari.

Con questa base alle spalle, vai a creare manualmente la tua competenza.

Prima guarda il video:
<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/JG6JlTcPitE?si=cl44gjuh0uRN_yjV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

---

## Part 1: Creare manualmente una competenza in OpenClaw

### Dove si trova la cartella delle competenze

Per gli utenti macOS, lo spazio di lavoro è nascosto nella cartella `.openclaw` nella directory utente:

```
~/.openclaw/workspace/
```

Entra e crea una nuova cartella `skills`, la struttura sarà più o meno questa:

```
skills/
└── nome-della-tua-competenza/
    ├── SKILL.md        ← Istruzioni principali della competenza
    └── altri file       ← (opzionale) possono anche non esserci
```

`SKILL.md` è il «contratto di lavoro» tra te e l'AI — ci scrivi chiaramente cosa deve fare, come farlo, a cosa prestare attenzione, e lui esegue alla lettera.

### Cosa scrivere in SKILL.md

Come minimo devi includere:

| Campo | Funzione |
|-------|----------|
| Nome della competenza | Per l'identificazione da parte dell'AI |
| Condizione di attivazione | Quando richiamare questa competenza |
| Passaggi di esecuzione | Istruzioni passo-passo |
| Avvertenze | Cosa non fare |

---

## Part 2: Installare l'ecosistema delle competenze (ClawdHub)

Con le sole competenze create manualmente si può fare ben poco. Per far girare un progetto web completo servono pacchetti di competenze come App Builder e Tailwind CSS — e per installarli bisogna passare da ClawdHub.

### Primo passaggio: installare ClawdHub

Apri il terminale (riga di comando) e digita:

```bash
npm i -g clawhub
```

Al termine dell'installazione, esegui il comando di login:

```bash
clawhub login
```

Si aprirà una pagina del browser che ti chiederà di collegare il tuo account GitHub. Una volta completato il collegamento, ClawdHub sarà davvero attivo.

> **Perché bisogna fare il login?** La libreria di competenze di ClawdHub è ospitata su un server remoto; senza login non trova proprio nulla, e tutti i comandi di installazione falliscono automaticamente. Un sacco di gente si blocca qui pensando sia un problema di rete — in realtà si sono semplicemente scordati un `clawhub login`.

### Secondo passaggio: installare le competenze necessarie al progetto

Dopo il login, torna nella chat di OpenClaw e invia il comando:

```
帮我安装 App Builder 和 Tailwind CSS 这两个技能
```

Normalmente il download si completa in automatico. In caso di problemi, controlla nell'ordine:

1. **Verifica di aver fatto il login su ClawdHub** — nove volte su dieci è questo il motivo
2. **Controlla la rete** — in alcune zone l'accesso al server di ClawdHub è instabile, aspetta e riprova
3. **Installazione manuale** — visita [clawhub.ai](https://clawhub.ai/) per trovare la competenza corrispondente, copia direttamente la cartella nella directory `skills/` per saltare il problema di rete (per la struttura dei file vedi Part 1)

### Verificare che le competenze siano disponibili

Una volta completata l'installazione, chiedi:

```
你现在有什么技能？
```

Ti elencherà tutti i nomi delle competenze caricate. Le competenze che hai installato compaiono nella lista? Solo allora si può cominciare a lavorare.

---

## Part 3: Il modello LSTM — che cosa ci fa esattamente qui

### Perché non usare un normale metodo statistico

L'approccio più intuitivo è contare la frequenza di ogni numero e trovare i numeri «caldi» e «freddi». Il problema è che questo metodo dà per scontato che ogni estrazione sia influenzata da quelle precedenti — ma l'estrazione delle palline della lotteria è un processo fisico casuale: se al turno precedente è uscito il 7, questo non significa che al turno successivo il 7 avrà una probabilità in più o in meno. La statistica delle frequenze, in questo contesto, fondamentalmente fa qualcosa che serve solo a farci sentire bene.

LSTM è diverso. Non parte dal presupposto che esista un pattern, ma lo cerca nei dati — se c'è davvero qualche correlazione temporale, la impara; se non c'è, non la impara, e amen. Almeno è onesto.

### Come funziona LSTM (senza formule)

LSTM sta per Long Short-Term Memory, in italiano «rete a memoria lunga e breve termine».

Una rete neurale normale, quando elabora dati, tratta ogni singolo input come indipendente: quello che è successo prima non ha alcuna influenza su quello che viene dopo. La particolarità di LSTM è avere una «linea di memoria» che attraversa l'intera sequenza.

Puoi immaginarlo come un redattore che lavora su una storia a puntate. Una rete normale non ricorda mai cosa è successo prima, e ogni volta ricomincia da capo. LSTM invece conserva dei «appunti», annota quali trame sono importanti e quali può dimenticare; quando legge un nuovo capitolo, decide se aggiornare o scartare il contenuto degli appunti, e solo allora formula un giudizio.

Riportandolo ai dati della lotteria: si usano gli storici delle ultime N estrazioni come sequenza di input, LSTM durante l'addestramento regola automaticamente i pesi cercando di individuare pattern di variazione numerica tra un'estrazione e l'altra, e poi utilizza questo pattern per prevedere l'estrazione successiva.

*(A raccontarlo così, mi sto confondendo un po' anch'io...)*

### Struttura del modello (versione semplificata)

```
Storico delle estrazioni (ultime N)
        ↓
  Preprocessing dei dati + normalizzazione
        ↓
   Strato LSTM (apprende i pattern delle sequenze)
        ↓
   Strato Dense di output (genera i valori previsti)
        ↓
  Denormalizzazione → numeri finali
```

### Una precisazione onesta

Questo modello sul set di addestramento può performare anche molto bene — dopotutto è stato addestrato con dati storici e poi va a predire quegli stessi storici, quindi ha naturalmente una certa percentuale di successo.

Ma la vera prova è sui dati futuri. I numeri della lotteria sono, in teoria, variabili casuali indipendenti e identicamente distribuite; i «pattern» che LSTM riesce a imparare sono molto probabilmente solo rumore nei dati che il modello scambia per segnale — un po' come quando guardi le nuvole e ci vedi un drago, ma il cielo non aveva intenzionalmente disegnato proprio nulla.

Quindi il valore di questo sistema, più che come «strumento di previsione», sta nell'essere un esercizio completo di modellazione di serie temporali — trattamento dei dati, addestramento del modello, valutazione dei risultati, integrazione frontend e backend, dall'inizio alla fine: è questo che si impara davvero.

---

## Part 4: Creare il sistema di previsione del SuperEnalotto tramite conversazione

La parte importante qui non è il codice, ma come collaborare con l'AI per completare un progetto intero.

In tutto il processo le cose che devi fare tu sono solo tre: spiegare chiaramente cosa vuoi, verificare il risultato, segnalare i problemi. Il codice lo scrive lui, l'architettura la monta lui, il tuo ruolo è più vicino a quello di un project manager che a uno sviluppatore.

C'è un prerequisito: devi avere un'idea approssimativa di alcuni termini tecnici — per esempio Next.js, Tailwind CSS. Non serve saperli scrivere, non serve saper leggere il codice, ma devi sapere a cosa servono e quali alternative tecniche ci sono. E questo tipo di domande è proprio quello a cui l'AI sa rispondere meglio.

### Primo passaggio: inviare il brief del progetto

Non spiegare le cose una frase alla volta: descrivi tutto il progetto in un'unica volta. Ecco il prompt che ho inviato a OpenClaw:

```
用 app-builder 和 tailwindcss 帮我开发一个双色球统计预测网页前端
（Next.js + Tailwind CSS + Chart.js）：

1. 必须集成我已有的 ssq-lstm-predict Skill
   （路径：~/.openclaw/workspace/skills/ssq-lstm-predict），
   在页面调用它的 lottery_lstm.py 来获取：
   - 所有号码当前遗漏次数（红球 1-33 + 蓝球 1-16）
   - 最新一期红球均值
   - 热号（遗漏少）/ 冷号（遗漏多）
   - LSTM 预测的下一期号码

2. 页面布局：
   - 顶部：标题「双色球统计与预测系统」
   - 中间：遗漏次数表格（可排序）、热冷号柱状图（Chart.js）
   - 下面：最新均值显示 + 大红色「一键预测下一期」按钮
     （点击调用 LSTM，返回红球 6 个 + 蓝球）
   - 响应式，手机友好，彩票红色主题

3. 项目创建在 ~/.openclaw/workspace/ssq-predict-web

4. 完成后本地运行 npm run dev，给我 localhost 预览链接

5. 代码要干净、可手动修改，完成后告诉我怎么继续开发或调试
```

> **Spiegare tutto in una volta vale più di dieci integrazioni a posteriori.** L'AI elabora le informazioni per comprensione globale e poi esegue: più il brief è completo, più il primo risultato sarà affidabile, e meno iterazioni dovrai fare.

### Secondo passaggio: verifica — esamina cosa ti ha consegnato

Quando ti dice che ha finito, non precipitarti a dire «va bene». Controlla punto per punto:

- L'URL che ti ha dato è accessibile?
- La pagina mostra dei dati?
- La funzione principale (il pulsante di previsione) risponde?
- I risultati sono stabili, oppure cambiano a ogni click?
- È quello che volevi? Cosa manca ancora?

Al primo giro di verifica, la mia esperienza è stata che **tutti e cinque i punti avevano problemi** — la porta dell'URL era sbagliata (300 invece di 3000), la pagina era vuota, il pulsante non rispondeva, i risultati cambiavano ogni volta, e alcune funzionalità non erano state proprio implementate.

È del tutto normale. Che al primo tentativo ci siano problemi non significa che l'AI sia scarsa, ma che un progetto complesso richiede iterazione per natura. La chiave è saper descrivere con precisione dove sta il problema.

### Terzo passaggio: feedback — descrivi i fatti, non le sensazioni

«Non va», «c'è un problema» è il feedback più inutile possibile. L'AI non sa a cosa ti riferisci. Anche se usi il linguaggio più truce e sarcastico del mondo, non aiuterà minimamente — l'AI non sente dolore, ma tu stai perdendo tempo.

Elenca uno per uno i fenomeni che hai osservato:

```
有以下问题需要修复：
1. 你给的网址端口是 300，实际应该是 3000，访问不到
2. 页面加载后没有任何数据显示
3. 点击预测按钮没有反应
4. 修复后请确认：多次点击预测，结果应该保持一致
```

Più la descrizione del problema è specifica, più alta sarà la precisione della correzione, e meno andirivieni farai.

### Quarto passaggio: verifica di nuovo, finché non sei soddisfatto

Dopo la correzione, ripeti la checklist del secondo passaggio.

Nel mio caso ho fatto qualche giro: il problema della porta l'ha sistemata diverse volte senza successo, alla fine ho semplicemente raggiunto la porta 3000 direttamente; il problema della stabilità delle previsioni invece, una volta corretto, ha funzionato bene. Alla fine: pagina con dati, previsioni stabili, funzionalità a posto — progetto completato.

---

In tutto il processo, non ho scritto una sola riga di codice. Ma sapevo chiaramente cosa stava succedendo in ogni fase, dove erano i problemi, e come descriverli.

Questa capacità è più difficile da sviluppare rispetto a saper scrivere codice, ma vale di più. Un professore diceva: «Il vero studio sta nel saper fare domande.» Osservare il problema centrale, descriverlo correttamente, verificarlo e analizzarlo per trasformarlo in conoscenza — è qualcosa che l'AI non può fare al posto tuo, devi allenarti da solo.

---

## Infine

Il valore di questo sistema non sta nella precisione delle previsioni — ma nel fatto che hai vissuto in prima persona il processo completo, dal nulla al prodotto finito.

I prompt e i dati sono tutti qui sopra; seguili e prova una volta, e scoprirai che hai capito molto più di quanto pensavi.

Se l'argomento ti interessa, iscriviti al mio canale, continerò ad aggiornare:

- 🎬 **YouTube**: [lingshunlab](https://www.youtube.com/@lingshunlab)
- 📺 **Bilibili**: [凌顺实验室](https://space.bilibili.com/456183128)

---

## Riferimenti

Il file della competenza condiviso su GitHub, con i dati storici delle estrazioni del SuperEnalotto dal 2003-01-01 al 2026-03-15:
[lingshunlab / ssq-lstm-predict](https://github.com/ling3ye/LingShunLAB/tree/main/videos/%23010-OpenClaw-Skills-SSQ/ssq-lstm-predict)
