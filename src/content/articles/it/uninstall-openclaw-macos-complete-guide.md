---
title: "Il modo corretto per disinstallare completamente OpenClaw su MacOS (non fare le cose a metà)"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-12
intro: "Pensavi che cliccare «Disinstalla» fosse sufficiente? OpenClaw su MacOS lascia tracce in tre posti: la directory dello spazio di lavoro, il comando globale npm e la configurazione delle variabili d'ambiente in .zshrc. Se non pulisci tutto per bene, nel migliore dei casi il terminale ti sputerà errori, nel peggiore l'installazione di nuovi strumenti andrà in tilt. Questo articolo raccoglie la procedura di rimozione completa, con screenshot: in 5 minuti hai finito, senza residui."
image: "https://img.lingflux.com/2026/03/57911d1d24d0ad3cb8aadbf57ea7fafc.jpg"
tags: ["disinstallazione OpenClaw", "rimuovere OpenClaw", "rimozione completa MacOS", "disinstallazione globale npm"]
---

Molta gente, dopo aver disinstallato OpenClaw, riaprendo il terminale si ritrova davanti una sfilza di errori, oppure scopre che durante l'installazione di nuovi strumenti le variabili d'ambiente vanno in conflitto senza alcun motivo apparente. La ragione è semplice: **hai cancellato solo la «superficie», ci sono ancora tre posti dove restano file residui.**

Questo articolo raccoglie la procedura di rimozione completa, con screenshot esplicativi: in 5 minuti hai finito, senza lasciare traccia.



## Operazioni preliminari alla disinstallazione

⚠️ Prima di iniziare: fai un backup dei tuoi file di lavoro

Vai nello spazio di lavoro di OpenClaw (la posizione predefinita su MacOS è: ~/.openclaw/workspace) e fai il backup dei file contenuti: potresti avere al suo interno **file di configurazione, file delle competenze (skill), file di progetti** già pronti e funzionanti.

Il processo di disinstallazione eliminerà automaticamente questa directory. Quindi prima di metterti al lavoro, copia in un'altra posizione i file che vuoi conservare.



## Avvia la disinstallazione

Apri il terminale e digita il seguente comando:

```bash
openclaw uninstall
```

Dopo l'esecuzione, il programma ti chiederà quali componenti eliminare. **Si consiglia di selezionarli tutti** (usa la barra spaziatrice per spuntare), così la pulizia sarà la più radicale possibile.

Fatto ciò, premi Invio: ti verrà chiesto di nuovo «Confermi l'eliminazione?», seleziona **Yes** per confermare.

Il programma di disinstallazione parte e vedrai all'incirca questa schermata:

![ScreenShot_2026-03-12_204743_136 (1)](https://img.lingflux.com/2026/03/cdb2215144cdaa58c3d7f26b61bee3a6.png)

Fai attenzione al messaggio — qui ti viene comunicato che **il comando OpenClaw nel CLI non è ancora stato rimosso**. È il primo punto che si tende a trascurare, e va gestito a parte.



## Eliminare OpenClaw dal CLI tramite il comando npm

Perché serve un passaggio separato? Perché lo strumento a riga di comando di OpenClaw è installato globalmente tramite npm, non fa parte del corpo principale dell'applicazione, e il programma di disinstallazione ufficiale non se ne occupa.

Nella riga di comando digita:

```bash
npm uninstall openclaw -g
```

Questo eliminerà il comando openclaw dal CLI; al termine vedrai qualcosa del genere:

![Weixin Image_20260312205126_397_55 (1)](https://img.lingflux.com/2026/03/6d07540cdb4de7cd36eddf7b9cb627be.png)

Una volta completato questo passaggio, il comando `openclaw` sarà scomparso dal tuo sistema. Ma non è ancora finita —



## Pulire la configurazione delle variabili d'ambiente di OpenClaw nel file .zshrc

Questo è **il passaggio più facile da trascurare e quello che causa più problemi in seguito**.

Al momento dell'installazione, OpenClaw scrive automaticamente un pezzo di configurazione alla fine del file `~/.zshrc`, usato per caricare lo script di autocompletamento dei comandi. Anche se hai completato i primi due passaggi, quel codice è ancora lì, e ogni volta che apri il terminale tenta di caricare un file che ormai non esiste più, generando errori.

Su MacOS, individua il file .zshrc nella directory utente (~/.zshrc): è un file nascosto, quindi devi abilitare la visualizzazione dei file nascosti (per esempio, nella cartella utente premi la scorciatoia Shift + Command + .). Puoi aprirlo con un editor di testo qualunque (oppure da riga di comando con `nano ~/.zshrc`).



Trova questo blocco di codice ed eliminalo per intero:

```tex
# OpenClaw Completion
source "/Users/{il-tuo-nome-utente}/.openclaw/completions/openclaw.zsh"
```

Trova questo blocco di codice ed eliminalo per intero:

![ScreenShot_2026-03-12_205815_641 (1)](https://img.lingflux.com/2026/03/eb7706d1300a594edd849b787c740a8c.png)

Dopo l'eliminazione salva il file. Se stai usando nano, premi `Control + X`, poi premi `Y` per confermare il salvataggio.

Chiudi il terminale.

Quando riaprirai il terminale, OpenClaw sarà stato completamente rimosso dal sistema — anche questo piccolo «gambero».



## Fine

In sintesi, la disinstallazione di OpenClaw richiede la pulizia di tre punti, nessuno dei quali può essere saltato:

1. **Esegui `openclaw uninstall`**, per eliminare il corpo dell'applicazione e lo spazio di lavoro
2. **Esegui `npm uninstall openclaw -g`**, per eliminare il comando CLI globale
3. **Modifica `~/.zshrc`**, per eliminare il codice di configurazione dell'autocompletamento

L'intera operazione richiede meno di 5 minuti: fai tutto nell'ordine giusto e potrai dire addio a questo «gambero» 🦞 senza lasciare alcun residuo.

### Verificare che la disinstallazione sia completa

Dopo aver eseguito tutti e tre i passaggi, puoi usare questo comando per confermare che OpenClaw è stato completamente rimosso dal sistema:

```bash
which openclaw
```

Se non c'è alcun output, significa che la disinstallazione è pulita. Se invece viene ancora restituito un percorso, controlla che nella directory globale di npm non ci siano residui:

```bash
npm list -g --depth=0
```

Verifica che nella lista non compaia `openclaw` e il gioco è fatto.

Se questo articolo ti è stato utile, sentiti libero di salvarlo e condividerlo con altri amici che usano OpenClaw.
