---
title: "Guia completa para ejecutar Qwen3-TTS con Web UI en local | Clona voces sin saber programar"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS viene con una interfaz web integrada: sube una grabacion y clona tu voz, sin escribir ni una linea de codigo. Esta guia cubre la configuracion tanto para Mac (chip de la serie M) como para Windows (GPU NVIDIA)."
image: "https://img.lingflux.com/2026/03/2d1950de23bc0838bd604e391f15a92d.png"
tags: ["qwen3 tts", "qwen tts interfaz web", "qwen clonar voz", "Qwen3-TTS interfaz Web", "Qwen clonacion de voz", "Qwen TTS tutorial"]
---

# Guia completa para ejecutar Qwen3-TTS con Web UI en local: clona voces sin saber programar

El Qwen3-TTS que ha sacado Alibaba tiene bastante miga: subes una grabacion de tu propia voz y es capaz de "aprender" a hablar como tu; o si le describes por texto "voz masculina grave y profunda", te genera una desde cero. Y lo mejor de todo: trae interfaz web, asi que abres el navegador, haces clic clic clic y listo, sin tocar ni una linea de codigo.

> Esta guia la he probado personalmente en un **Mac mini M4 (serie M)**. Todos los errores en los que me tropece ya estan marcados para que tu no pises los mismos.

------

## Aclara primero que caso es el tuyo

Guia de instalacion local (despliegue):

https://lingflux.com/zh-cn/articles/ai/qwen3-tts-mac-mini-m4-complete-guide/

Antes de lanzarte a copiar comandos, mira que configuracion tienes y por donde ir:

| Tu ordenador | Por donde ir |
| ------------ | ------------ |
| Mac, chip M1/M2/M3/M4 | Aceleracion con `mps`, sigue la ruta de Mac |
| Windows, con GPU NVIDIA | Aceleracion con `cuda`, sigue la ruta de Windows |
| Sin GPU dedicada, solo CPU | Tambien funciona, pero es lento. Preparate un te mientras esperas |

------

## Tres modos de uso, elige uno para empezar

Al iniciar, eliges un modelo distinto y eso corresponde a un modo de uso distinto. En resumen:

**Clonacion de voz** → Subes tu propia grabacion y aprende a hablar como tu
Modelo: `Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**Voces predefinidas** → Eliges entre las voces que vienen integradas, y ademas puedes anadir instrucciones como "di esto con tono triste"
Modelo: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`

**Diseno de voz personalizada** → Describes con texto como quieres que suene la voz, y te la genera
Modelo: `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

Los comandos de abajo usan el **modelo Base (clonacion de voz)** como ejemplo. Cambia el nombre del modelo para activar los otros modos.

------

## Paso 1: Iniciar la interfaz

### Mac (chip de la serie M)

Abre la Terminal y pega este comando:

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device mps \
  --dtype bfloat16 \
  --no-flash-attn
```

**Que significan los tres parametros:**

- `--device mps`: Usa la GPU del chip de Apple, bastante mas rapido que CPU solo. Si tu Mac no es de la serie M (un modelo antiguo), cambia esto a `cpu`
- `--dtype bfloat16`: Formato de precision del modelo, la serie M lo soporta de maravilla, usalo tal cual
- `--no-flash-attn`: **Este no te lo puedes olvidar!** Mac no soporta FlashAttention, sin este parametro falla al arrancar

------

### Windows (GPU NVIDIA)

Abre el Simbolo del sistema (CMD) y pega:

```cmd
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base ^
  --device cuda:0 ^
  --dtype bfloat16 ^
  --flash-attn
```

**Explicacion de los parametros:**

- `--device cuda:0`: Usa la primera GPU NVIDIA (normalmente solo tienes una, asi que `0` basta)
- `--dtype bfloat16`: Las tarjetas RTX serie 30 en adelante lo soportan, es lo recomendado
- `--flash-attn`: En Windows + CUDA esta aceleracion si se puede activar, y nota la diferencia

> Pequeno consejo: En Windows, para saltar de linea en comandos se usa `^` (en CMD) o la comilla invertida (en PowerShell). Es distinto al `\` de Mac, no los mezcles.

------

### Sin GPU, solo CPU?

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base \
  --device cpu \
  --dtype float32
```

Funciona, pero es lento. Generar un parrafo puede tardar varios minutos. Ve preparandote mentalmente.

------

## Paso 2: Abrir el navegador

Cuando el comando arranque, la Terminal mostrara algo asi:

```
Running on local URL: http://0.0.0.0:8000
```

Abre el navegador y ve a **http://localhost:8000**, la interfaz aparecera y lo demas es ir haciendo clic.

Quieres usarlo desde el movil u otro dispositivo en la misma red? Cambia `localhost` por la direccion IP de este ordenador.
Para ver la IP: en Mac ejecuta `ifconfig | grep "inet "`, en Windows ejecuta `ipconfig`.

------

## Si te da un error, no te asustes, mira aqui

**Al arrancar en Mac da error de FlashAttention**
Nueve de cada diez veces es que te olvidaste de poner `--no-flash-attn`. Anadelo y vuelve a ejecutar.

------

**Windows dice que CUDA no esta disponible**
Primero ejecuta esto para comprobar:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

Si muestra `True`, todo bien; si muestra `False`, es que la version de PyTorch no es la correcta. Reinstala una con soporte CUDA:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

`cu121` corresponde a CUDA 12.1. Cambialo segun tu version de CUDA; por ejemplo, si tienes CUDA 11.8, pon `cu118`.

------

**Sin suficiente VRAM, error OOM (desbordamiento de memoria)**
Cambia `--dtype bfloat16` por `--dtype float16`. Bajas un nivel de precision y te ahorras algo de memoria.

------

**Descarga del modelo lenta o fallida (red en China)**
Configura el mirror antes de ejecutar el comando:

Mac / Linux:

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Windows:

```cmd
set HF_ENDPOINT=https://hf-mirror.com
```

------

## No quieres instalarlo en local? Prueba primero online

Instalar modelos y entornos es un poco lioso. Puedes ir antes a la pagina de prueba oficial y jugar unos minutos, para confirmar que de verdad te interesa antes de meterte con la instalacion local:

- Hugging Face: https://huggingface.co/spaces/Qwen/Qwen3-TTS
- ModelScope (mas rapido desde China): https://modelscope.cn/studios/Qwen/Qwen3-TTS

------

Te has quedado atascado en algun paso? Copia el mensaje de error completo de la Terminal, pegalo en un buscador o en una IA, y lo mas probable es que lo soluciones en un par de minutos.
