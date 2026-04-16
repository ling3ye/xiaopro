---
title: "【Registro di risoluzione】Dopo l'aggiornamento di OpenClaw appare HTTP 500:404 NOT_FOUND? La mia esperienza con l'errore e come l'ho risolto"
domain: ai
platforms: ["mac", "windows", "linux"]
format: "tutorial"
date: 2026-03-12
intro: "Condivido l'errore HTTP 500:404 NOT_FOUND apparso dopo l'aggiornamento di OpenClaw dalla versione 2026.3.2 alla 2026.3.8, e come l'ho risolto rapidamente con onboard per resettare la configurazione, per aiutarvi a evitare la trappola della configurazione residua dopo l'aggiornamento."
image: "https://img.lingflux.com/2026/03/c6a0b5445b7fa406ea90e39681d8c2be.jpg"
tags: ["OpenClaw", "strumenti AI", "distribuzione locale", "problemi di aggiornamento", "errore HTTP", "reset configurazione"]
---

**Dopo l'aggiornamento di OpenClaw vi appare HTTP 500 500:404 NOT_FOUND? Il mio registro di risoluzione**

Ciao a tutti, sono un programmatore che adora trafficare con gli strumenti AI in locale. Recentemente ho aggiornato OpenClaw da una versione precedente all'ultima, anche se poi non era tanto vecchia: sono passato dalla 2026.3.2 alla 2026.3.8. Ma al riavvio, quando ho provato a chattare, sono rimasto di sasso: la Web UI mostrava una sfilza di messaggi rossi:

```
HTTP 500 500:404 NOT_FOUND
```

Solo a vederlo mi veniva male. Prima dell'aggiornamento andava tutto alla perfezione, i log non mostravano errori, e invece improvvisamente non riuscivo più a collegarmi al Gateway e l'agent si bloccava non appena cercavo di inviare un messaggio.

La mia prima reazione è stata ovviamente la chiave universale consigliata dalla documentazione ufficiale: `openclaw doctor`.

```bash
openclaw doctor --fix
```

L'ho eseguito due volte e tutte e due le volte l'output diceva "Everything looks good!", nemmeno un avviso. A quel punto ho pensato il peggio: la configurazione era andata completamente in tilt? Mi sono messo a cercare nelle issue di GitHub, nel gruppo Discord, nella documentazione, setacciando tutto. Qualche bug simile con errori 404 c'era, ma era praticamente sempre colpa del fallback dei modelli o della OpenAI Responses API, nulla a che vedere con la mia situazione "dopo l'aggiornamento è andato tutto in tilt".

Dopo quasi un'ora di tentativi, stavo quasi per disinstallare e reinstallare da zero (anche se mi dispiaceva perdere i channel e gli skill che avevo configurato). Alla fine, con l'atteggiamento di chi non ha più niente da perdere, ho provato la soluzione più drastica: **eseguire direttamente `openclaw onboard` per resettare la configurazione**. (Ricordatevi di salvare bene il file di configurazione originale e la cartella degli skill; se siete pratici, potete confrontarli e fare una sostituzione manuale)

L'operazione concreta sono due passi:

1. Prima fermate il Gateway corrente (per sicurezza):

   ```bash
   openclaw gateway stop
   # oppure systemctl stop openclaw-gateway (dipende da come avete installato il daemon)
   ```

2. Eseguite la procedura guidata di reset:

   ```bash
   openclaw onboard --reset
   ```

   (Nota: aggiungendo `--reset` verranno cancellati vecchi config, credentials e sessions; la documentazione dice che questo è il comportamento predefinito. Io ho usato direttamente il reset completo `--reset-scope full`, tanto avevo già fatto il backup di tutto)

Ho percorso la procedura guidata selezionando "Quick Start" fino in fondo, ho riconfigurato il token API, i channel... e ho scoperto che le opzioni di configurazione erano aumentate, con compatibilità per il nuovo modello ChatGPT 5.4. Tutto il processo è durato meno di 3 minuti. (Come dire: sono uno che l'ha installato più di 10 volte)



All'ultima opzione ho selezionato Web UI, la pagina si è aperta automaticamente, ho detto un "hello" e la chat funzionava di nuovo! Quel maledetto 500:404 è sparito senza lasciare traccia.

**Perché `doctor` non è riuscito a risolvere il problema, mentre `onboard` l'ha resuscitato?**

In realtà è un classico caso di "trappola della configurazione residua dopo l'aggiornamento". OpenClaw si evolve molto velocemente (prima si chiamava Clawdbot/Moltbot), e all'inizio di marzo aveva già 4 aggiornamenti. Ogni salto di versione può modificare lo schema del config, e la documentazione non lo sottolinea in modo particolare, non dice che "dopo ogni aggiornamento dovete eseguire onboard per resettare". Questa volta ci sono cascato, e spero di lasciare un piccolo consiglio per chi viene dopo.

Questa avventura mi ha fatto perdere un po' di tempo, ma mi ha anche fatto capire meglio il meccanismo di configurazione di OpenClaw. Insomma, per quanto gli strumenti AI locali siano comodi, con gli aggiornamenti bisogna sempre andarci con i piedi di piombo.

Spero che questo articolo sia d'aiuto a chi è alle prese con il 500:404! Alla prossima.
