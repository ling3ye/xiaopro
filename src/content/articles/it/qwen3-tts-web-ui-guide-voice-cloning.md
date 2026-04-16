---
title: "Manuale completo per avviare Qwen3-TTS in locale con Web UI | Clonaggio vocale anche senza sapere programmare"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS è dotato di un'interfaccia web integrata: basta caricare una registrazione per clonare una voce, il tutto senza scrivere una riga di codice. Questa guida supporta la configurazione su Mac (chip serie M) e Windows (scheda grafica NVIDIA)."
image: "https://img.lingflux.com/2026/03/2d1950de23bc0838bd604e391f15a92d.png"
tags: ["qwen3 tts", "qwen tts web ui", "qwen voice clone", "interfaccia web Qwen3-TTS", "clonaggio vocale Qwen", "tutorial Qwen TTS"]
---

# Manuale completo per avviare Qwen3-TTS in locale con Web UI: clonaggio vocale anche senza sapere programmare

Il Qwen3-TTS appena uscito da Alibaba ha davvero qualcosa di speciale: carichi una tua registrazione vocale e lui «impara» a parlare come te; oppure descrivi a parole «voce maschile profonda e magnetica» e lui te la crea. E la parte migliore è che ha un'interfaccia web integrata: apri il browser, fai clic-clic-clic e sei pronto, senza toccare una sola riga di codice.

> Questo manuale è stato testato di persona su **Mac mini M4 (serie M)**, tutte le trappole in cui sono cascato sono segnalate per te.

------

## Prima di tutto, individua la tua situazione



Guida all'installazione locale (deployment):

https://lingflux.com/zh-cn/articles/ai/qwen3-tts-mac-mini-m4-complete-guide/



Non precipitarti a copiare comandi: prima controlla che configurazione ha il tuo computer, così scegli il percorso giusto:

| Il tuo computer | Quale percorso seguire |
| --------------- | ---------------------- |
| Mac, chip M1/M2/M3/M4 | Accelerazione con `mps`, segui il percorso Mac |
| Windows, con scheda grafica NVIDIA | Accelerazione con `cuda`, segui il percorso Windows |
| Nessuna scheda dedicata, solo CPU | Si può fare, ma è lento; preparati un tè e aspetta |

------

## Tre modalità di utilizzo, scegline una

All'avvio selezioni un modello diverso e ottieni una modalità diversa. In breve:

**Clonaggio vocale** → carichi una tua registrazione, il modello imita la tua voce
 Nome del modello: `Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**Voce preimpostata** → scegli tra le voci integrate, puoi anche aggiungere istruzioni del tipo «dillo con tono triste»
 Nome del modello: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`

**Design voce personalizzata** → descrivi a parole la voce che vorresti, e il modello te la crea
 Nome del modello: `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

I comandi seguenti usano come esempio il **modello Base (clonaggio vocale)**; basta sostituire il nome del modello per passare alle altre modalità.

------

## Passo 1: avviare l'interfaccia

### Mac (chip serie M)

Apri il Terminale e incolla questo comando:

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device mps \
  --dtype bfloat16 \
  --no-flash-attn
```

**Cosa significano i tre parametri:**

- `--device mps`: usa la GPU dei chip Apple, molto più veloce rispetto alla sola CPU. Se hai un Mac più vecchio non della serie M, cambia questo valore in `cpu`
- `--dtype bfloat16`: formato di precisione del modello, ben supportato dalla serie M, usalo così com'è
- `--no-flash-attn`: **questo non devi assolutamente dimenticarlo!** Il Mac non supporta FlashAttention, senza questo parametro l'avvio va in errore

------

### Windows (scheda grafica NVIDIA)

Apri il prompt dei comandi (CMD) e incolla:

```cmd
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base ^
  --device cuda:0 ^
  --dtype bfloat16 ^
  --flash-attn
```

**Spiegazione dei parametri:**

- `--device cuda:0`: usa la prima scheda grafica NVIDIA (in genere ne hai una sola, `0` basta)
- `--dtype bfloat16`: le schede della serie RTX 30 e superiori lo supportano tutti, è il formato consigliato
- `--flash-attn`: su Windows + CUDA questa accelerazione si può attivare e rende le cose decisamente più veloci

> Nota: nel comando Windows, per andare a capo si usa `^` (nel CMD) oppure l'apice inverso (PowerShell), non `\` come sul Mac, non confonderti.

------

### Nessuna scheda grafica, solo CPU?

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device cpu \
  --dtype float32
```

Funziona, ma è lento. Per generare una frase potresti dover aspettare qualche minuto, preparati psicologicamente.

------

## Passo 2: apri il browser

Una volta lanciato il comando, nel terminale comparirà una riga come questa:

```
Running on local URL: http://0.0.0.0:8000
```

Apri il browser e vai direttamente su **http://localhost:8000**, l'interfaccia apparirà da sola; il resto è tutto da fare clic.

Vuoi usarlo dal telefono o da un altro dispositivo nella stessa rete locale? Sostituisci `localhost` con l'indirizzo IP di questo computer.
 Per scoprire l'IP: su Mac esegui `ifconfig | grep "inet "`, su Windows esegui `ipconfig`.

------

## Se incontri errori, niente panico: controlla qui

**Su Mac l'avvio dà errore FlashAttention**
 Nove volte su dieci ti sei scordato `--no-flash-attn`; aggiungilo e riavvia.

------

**Windows segnala che CUDA non è disponibile**
 Esegui prima questo controllo:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

Se stampa `True` non c'è problema; se stampa `False` significa che la versione di PyTorch installata non è quella giusta, reinstalla una con supporto CUDA:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

`cu121` corrisponde a CUDA 12.1; adattalo in base alla tua versione di CUDA, per CUDA 11.8 sostituisci con `cu118`.

------

**Memoria video insufficiente, errore OOM (Out of Memory)**
 Cambia `--dtype bfloat16` in `--dtype float16`, abbassa di un livello la precisione e risparmia un po' di memoria.

------

**Download del modello lento o fallito (rete in Cina)**
 Prima di lanciare il comando imposta il mirror:

Mac / Linux:

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Windows:

```cmd
set HF_ENDPOINT=https://hf-mirror.com
```

------

## Non te la senti di installare tutto in locale? Prova prima online

Installare modelli e ambienti può essere faticoso; puoi prima provare la pagina demo ufficiale per qualche minuto, e solo quando sei sicuro che la cosa ti interessa davvero metterti a configurare tutto in locale:

- Hugging Face: https://huggingface.co/spaces/Qwen/Qwen3-TTS
- ModelScope (accesso rapido dalla Cina): https://modelscope.cn/studios/Qwen/Qwen3-TTS

------

Se ti blocchi da qualche parte, copia per intero il messaggio di errore dal terminale, buttalo nel motore di ricerca o in un'AI, e nella maggior parte dei casi lo risolvi in pochi minuti.
