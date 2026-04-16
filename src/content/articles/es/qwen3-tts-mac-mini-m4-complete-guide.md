---
title: "Guia completa para ejecutar Qwen3-TTS en Mac Mini M4 | Desde cero, en 5 pasos"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS es el modelo de texto a voz mas reciente de Alibaba, pero esta disenado por defecto para tarjetas graficas NVIDIA. En este articulo te enseno paso a paso como ejecutarlo con exito en un Mac Mini M4: desde instalar las dependencias del sistema y configurar el entorno Python, hasta modificar el codigo para adaptarlo a la GPU de Apple (MPS). Cada paso viene con instrucciones detalladas. Ideal para usuarios de Mac, principiantes en IA y desarrolladores que quieren probar modelos TTS."
image: "https://img.lingflux.com/2026/03/2a456838c50928eb67a807431e65c2a3.png"
tags: ["qwen3 tts", "qwen3 tts mac", "qwen tts guia", "Qwen3-TTS configuracion Mac", "Qwen3-TTS chip M4", "Qwen texto a voz"]
---

# Guia completa para ejecutar Qwen3-TTS en Mac Mini M4

> **Para quien es esto?** Si tienes un Mac Mini M4 y sabes abrir la Terminal, esta guia es para ti. No necesitas experiencia en IA, solo sigue los pasos.

> Nota: **Este articulo esta basado en pruebas reales del autor en un Mac Mini M4. Todos los pasos han sido verificados y funcionan.**

------

## Antes de empezar, lee esto

**Qwen3-TTS** es el modelo de texto a voz que acaba de lanzar Alibaba, y la verdad es que funciona bastante bien. Pero esta programado por defecto para tarjetas graficas NVIDIA, asi que para ejecutarlo en Mac hay que hacer un par de modificaciones.

La buena noticia: **los cambios son minimos, y yo ya me comi todos los errores por ti**

Todo el proceso tiene 5 pasos y te va a llevar entre 15 y 30 minutos (la mayor parte del tiempo es esperando a que se descargue el modelo).

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XG7krJlY-jY?si=X-F1_WwBnldVCeiK" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

------

## Paso 1: Instalar las dependencias del sistema

El Mac trae algunas herramientas de procesamiento de audio que le faltan, asi que primero las instalamos con Homebrew.

Abre la Terminal y pega este comando:

```bash
brew install portaudio ffmpeg sox
```

> Si te saltas este paso, despues te va a saltar el error `/bin/sh: sox: command not found`. Puedes volver a instalarlo en ese momento, pero mejor hacerlo todo de una vez.

------

## Paso 2: Crear el entorno Python

Busca un directorio donde guardar el proyecto, y luego crea un entorno Python 3.12 limpio con **Conda** para que no entre en conflicto con otros proyectos de tu sistema.

```bash
# Crear y activar el entorno (solo se hace una vez)
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts

# Instalar la libreria principal
pip install -U qwen-tts

# Descargar el repositorio oficial
git clone https://github.com/QwenLM/Qwen3-TTS.git
cd Qwen3-TTS
pip install -e .
```

> Que es un entorno Conda? Puedes imaginarlo como una "habitacion independiente" donde instalas todas las dependencias de este proyecto sin que afecte al resto de programas de tu ordenador.

------

## Paso 3: Modificar el codigo para el chip M4 (Importante!)

Los pasos anteriores son iguales que en Github, pero a partir de aqui las cosas cambian un poco si usas un Mac con chip de la serie M.

Aqui es donde los usuarios de Mac se suelen tropezar. El script oficial esta configurado para NVIDIA por defecto, asi que tenemos que hacer dos cambios para que use la GPU de Apple (MPS).

Abre el archivo `examples/test_model_12hz_base.py`, busca mas o menos la linea 50, y haz estos dos cambios:

### Cambio A: Especificar el dispositivo MPS

```python
# Forma original (disenada para NVIDIA)
# tts = Qwen3TTSModel.from_pretrained(..., attn_implementation="flash_attention_2")

# Cambiar a esto (adaptado para Mac M4)
tts = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",   # Nota: quitar la barra / del final
    torch_dtype=torch.bfloat16,          # M4 soporta bfloat16 sin problema, buen equilibrio entre precision y velocidad
    attn_implementation="sdpa",          # Mecanismo de atencion compatible con Mac, en vez de flash_attention_2
    device_map="mps",                    # Forzar el uso de la GPU de Apple
)
```

### Cambio B: Adaptar la instruccion de sincronizacion para MPS

```python
# Forma original (solo para NVIDIA, en Mac crashea directamente)
# torch.cuda.synchronize()

# Cambiar a esto (detecta automaticamente que GPU usar)
if torch.cuda.is_available():
    torch.cuda.synchronize()
elif torch.backends.mps.is_available():
    torch.mps.synchronize()   # Instruccion correcta especifica de Mac
```

> Por que hay que hacer estos dos cambios? El chip M4 usa el framework Metal de Apple (MPS), que es un sistema completamente distinto al CUDA de NVIDIA. El primer cambio le dice al modelo "usa la GPU de Apple", y el segundo hace que la instruccion de sincronizacion use tambien la version correcta de Apple.

------

## Paso 4: Descargar el modelo y ejecutarlo

El archivo del modelo pesa unos **4 GB**, asegurate de tener una conexion estable.

```bash
cd examples
python test_model_12hz_base.py
```

### La descarga va muy lenta? Prueba con un mirror

```bash
export HF_ENDPOINT=https://hf-mirror.com
python test_model_12hz_base.py
```

### Si te sale el error `SafetensorError`?

Significa que la descarga se interrumpio la ultima vez y el archivo se corrompio. La solucion es sencilla:

1. Abre el Finder y ve a `~/.cache/huggingface/hub`
2. Borra la carpeta `Qwen`
3. Vuelve a ejecutar el script para que se descargue de nuevo

------

## Paso 5: Verificar que la GPU esta funcionando

Antes de ejecutar, puedes confirmar rapidamente que la GPU del M4 se ha detectado correctamente:

```python
import torch
print(torch.backends.mps.is_available())  # Si muestra True, ya esta todo listo
```

------

## Listo, funciona!

Si todo ha ido bien, despues de ejecutar el script se creara una nueva carpeta dentro de `examples/` con los archivos de audio generados.

------

## Codigo de referencia completo

Aqui tienes un codigo que ya incluye todas las adaptaciones para Mac, ademas de funciones de **combinacion multilingue** y **control de velocidad**, puedes guardarlo directamente como archivo `.py`:

```python
import os
import torch
import soundfile as sf
import numpy as np
# Asegurate de que 'qwen_tts' esta instalado/presente en el entorno
from qwen_tts import Qwen3TTSModel

# ================= 1. Inicializacion (Configuracion) =================

# Detectar el hardware automaticamente.
# "mps" = Mac (Apple Silicon), "cuda" = GPU NVIDIA, "cpu" = Procesador estandar
if torch.backends.mps.is_available():
    device = "mps"   # Mac M1/M2/M3/M4...
elif torch.cuda.is_available():
    device = "cuda"  # GPU NVIDIA
else:
    device = "cpu"   # CPU estandar

print(f"Usando dispositivo: {device}")

# Definir donde guardar los resultados
OUT_DIR = "qwen3_slow_output"
os.makedirs(OUT_DIR, exist_ok=True)

print("Cargando modelo... (Esto puede tardar un minuto)")

# Cargar el modelo desde Hugging Face
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    torch_dtype=torch.bfloat16,
    attn_implementation="sdpa",
    device_map=device,
)
print("Modelo cargado correctamente!")

# ================= 2. Configuracion del audio de referencia =================
# Esta es la voz que el modelo va a imitar (clonar).

# Opcion A: Usar una URL (Ejemplo oficial de Qwen)
ref_audio_url = "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-TTS-Repo/clone_2.wav"

# Opcion B: Usar un archivo local (Descomenta la linea de abajo para usar tu propio archivo)
# ref_audio_url = "./my_voice.wav"

# IMPORTANTE: Este texto debe coincidir EXACTAMENTE con lo que se dice en el audio de referencia.
# Si no es correcto, la calidad sera mala.
ref_text_content = "Okay. Yeah. I resent you. I love you. I respect you. But you know what? You blew it! And thanks to you."

# ================= 3. Contenido a generar =================
# Consejo: Para que el habla sea mas lenta y clara, anadimos puntuacion (como , . ...)
# Esto obliga al modelo a hacer pausas entre palabras.

segments = [
    {
        "lang": "Chinese",
        "text": "大家好，这个视频是，分享如何在Mac Mini上，部署Qwen.3-TTS，运行官方例子程序，希望你们喜欢。",
        "temp": 0.7,
    },
    {
        "lang": "English",
        "text": "Hello everyone! In this video, I'll share how to deploy Qwen.3-TTS on a Mac Mini and run the official demos. I hope you enjoy it.",
        "temp": 0.7,
    },
    {
        "lang": "Japanese",
        "text": "皆さん、こんにちは。この動画では、Mac MiniでQwen.3-TTSを導入し、公式デモを動かす方法をシェアします。気に入っていただけると嬉しいです。",
        "temp": 0.7,
    },
    {
        "lang": "Korean",
        "text": "안녕하세요 여러분. 이번 영상에서는 맥 미니(Mac Mini)에 Qwen.3-TTS를 구축하고, 공식 예제을 실행하는 방법을 공유해 드리겠습니다. 유익한 시간이 되시길 바랍니다.",
        "temp": 0.7,
    },
    {
        "lang": "German",
        "text": "Hallo zusammen! In diesem Video zeige ich euch, wie man Qwen.3-TTS auf einem Mac Mini deployt und die offiziellen Demos ausfuhrt. Ich hoffe, es gefallt euch.",
        "temp": 0.6,
    },
    {
        "lang": "French",
        "text": "Bonjour a tous ! Dans cette video, je vais partager comment deployer Qwen.3-TTS sur un Mac Mini et lancer les demos officielles. J'espere qu'elle vous plaira.",
        "temp": 0.8,
    }
]

# ================= 4. Bucle de generacion =================
all_audio_parts = []
final_sr = None

print("Iniciando generacion de audio...")

for i, seg in enumerate(segments):
    print(f"[{i+1}/{len(segments)}] Generando segmento en {seg['lang']}...")

    try:
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
            speed=0.85,
        )
    except TypeError:
        print(f"  (Nota: Parametro de velocidad no soportado, usando velocidad estandar para {seg['lang']})")
        wavs, sr = model.generate_voice_clone(
            text=seg['text'],
            language=seg['lang'],
            ref_audio=ref_audio_url,
            ref_text=ref_text_content,
            temperature=seg['temp'],
        )

    audio_data = wavs[0]
    if isinstance(audio_data, torch.Tensor):
        audio_data = audio_data.cpu().numpy()

    all_audio_parts.append(audio_data)
    if final_sr is None: final_sr = sr

# ================= 5. Fusionar audio =================
print("Fusionando todos los segmentos...")

silence_duration = 0.3
silence_samples = int(silence_duration * final_sr)
silence_data = np.zeros(silence_samples, dtype=np.float32)

final_sequence = []
for part in all_audio_parts:
    final_sequence.append(part)
    final_sequence.append(silence_data)

if final_sequence:
    final_sequence.pop()

full_audio = np.concatenate(final_sequence)

# ================= 6. Guardar resultado =================
final_path = os.path.join(OUT_DIR, "Final_Slow_Mix.wav")
sf.write(final_path, full_audio, final_sr)

print("="*30)
print(f"Listo! Audio guardado en:\n{final_path}")
print("="*30)
```

------

## Solucion rapida de problemas frecuentes

| Sintoma | Causa | Solucion |
| ------- | ----- | -------- |
| `sox: command not found` | Faltan dependencias del sistema | Ejecutar el `brew install` del paso 1 |
| `SafetensorError` | Descarga del modelo interrumpida, archivo danado | Borrar `~/.cache/huggingface/hub/Qwen` y descargar de nuevo |
| Error con `torch.cuda` | Se usaron instrucciones exclusivas de NVIDIA | Verificar que se hizo el cambio B del paso 3 |
| Descarga muy lenta / timeout | Acceso a HuggingFace limitado por la red | Configurar un mirror y reintentar |
| Error de driver inexplicable | Problema intermitente de drivers en Apple Silicon | **Reiniciar el ordenador**, soluciona el 90% de los problemas raros |

------
