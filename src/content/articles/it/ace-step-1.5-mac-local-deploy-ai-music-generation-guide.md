---
title: "【Guida passo-passo】Gratis! Come distribuire ACE-Step 1.5 in locale sul tuo Mac e generare musica AI con un clic"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-02-23
intro: "Esegui il modello di generazione musicale AI ACE-Step 1.5 completamente gratis e offline sul tuo Mac, con accelerazione Apple Silicon. Bastano pochi comandi da terminale."
image: "https://img.lingflux.com/ace-step-1.5-mac-local-deploy-ai-music-generation-guide-c640.png"
tags: ["AI", "Mac", "generazione musicale", "ACE-Step", "distribuzione locale"]
---

Visto che a tutti interessa tanto eseguire l'AI in locale, oggi vi presento un progetto davvero divertente: **ACE-Step 1.5**.

In pratica, potete generare musica direttamente sul vostro Mac, completamente gratis, anche senza connessione internet. E su questo progetto, le ottimizzazioni per i chip Apple sono davvero ben fatte.

Non preoccupatevi se sembra complicato: bastano poche righe di codice. Seguite i miei passi e in pochi minuti sarà tutto pronto!

## Preparazione

Aprite il Terminale e iniziamo.

### 1. Preparate la "casa"

Prima di tutto, scegliete una cartella dove conservare il progetto.

```bash
cd Projects
cd Python
```

### 2. Clonate il codice e installate le dipendenze

Scaricate il progetto da GitHub e poi usiamo `uv` per installare velocemente le dipendenze (se non avete mai usato `uv`, vi consiglio vivamente di installarlo: è una meraviglia per la gestione degli ambienti Python).

```bash
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv sync
```

*(Aspettate un attimo che finisca la barra di progresso.)*

### 3. Verificate la "potenza" del vostro Mac

Una volta installato, non abbiate fretta di avviare: prima controllate che il vostro chip Apple (accelerazione MPS) sia stato riconosciuto correttamente.

```bash
uv run python -c "import torch; print(f'MPS check: {torch.backends.mps.is_available()}')"
```

Se il terminale restituisce **`MPS check: True`**, significa che tutto funziona a dovere e la GPU è pronta a mettersi al lavoro!

## Avvio e funzionamento

### 4. Avviate il servizio

Niente di speciale, eseguite direttamente:

```bash
uv run acestep
```

### 5. Aprite la pagina web e divertitevi

Quando il terminale mostra che il server è partito, aprite il browser e inserite: `127.0.0.1:7860`

A questo punto vedrete l'interfaccia di ACE-Step.

**Ecco alcuni punti chiave da tenere a mente:**

- **Scegliete la configurazione giusta**: nell'interfaccia dovete selezionare la dimensione della memoria video del modello. Guardate quanta memoria unificata ha il vostro Mac; per esempio, nella mia demo ho selezionato **16-20GB**.
- **Inizializzazione**: cliccate su **"Initialize Service"**.
  - Attenzione: la prima esecuzione scaricherà automaticamente il modello, il file è piuttosto grande e ci vorrà un po'. È normale! Andate a prendervi un caffè e aspettate con pazienza che finisca.

### 6. Generate la vostra prima musica AI

Una volta pronto l'ambiente, l'operazione è davvero elementare:

1. Passate alla modalità **"Simple"**.
2. Inserite il prompt (Prompt); se non sapete cosa scrivere, mettete semplicemente `easy example`.
3. Cliccate su **"Create Sample"**. A questo punto vedrete che un sacco di parametri complessi vengono compilati in automatico (nella sezione Custom), ma ignorateli.
4. Cliccate direttamente su **"Generate Music"** in fondo alla pagina.

Fatto! Aspettate un po' che la barra di progresso arrivi in fondo, e potrete ascoltare la musica "calcolata" dalla vostra GPU locale.
