---
title: "【Guia para principiantes】Gratis! Ensenamos a desplegar ACE-Step 1.5 en tu Mac y generar musica con IA en un clic"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-02-23
intro: "Ejecuta el modelo de generacion de musica con IA ACE-Step 1.5 en tu Mac completamente gratis y sin conexion, con aceleracion de chip Apple, en solo unos pocos comandos."
image: "https://img.lingflux.com/ace-step-1.5-mac-local-deploy-ai-music-generation-guide-c640.png"
tags: ["IA", "Mac", "generacion de musica", "ACE-Step", "despliegue local"]
---

Veo que les interesa bastante correr IA en local, asi que hoy les traigo un proyecto muy divertido: **ACE-Step 1.5**.

En pocas palabras, te permite generar musica directamente en tu Mac, totalmente gratis, sin necesidad de internet. Y lo mejor es que la optimizacion para chips Apple esta bastante lograda.

No te preocupes si parece complicado, solo necesitas escribir unas pocas lineas de codigo. Sigue mis pasos y en unos minutos lo tienes listo!

## Preparativos

Abre tu Terminal y vamos alla.

### 1. Prepara el "nido"

Primero, busca un lugar comodo para guardar el proyecto.

```bash
cd Projects
cd Python
```

### 2. Clona el codigo e instala las dependencias

Clona el proyecto directamente desde GitHub, y luego usamos `uv` para instalar las dependencias rapidamente (si todavia no has probado `uv`, te recomiendo encarecidamente que lo instales, es una maravilla para gestionar entornos de Python).

```bash
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv sync
```

**(Espera un ratito a que termine la barra de progreso.)*

### 3. Comprueba la "potencia" de tu Mac

Una vez instalado, no te lances a correr todavia. Primero confirma que tu chip Apple (aceleracion MPS) esta siendo detectado correctamente.

```bash
uv run python -c "import torch; print(f'MPS check: {torch.backends.mps.is_available()}')"
```

Si la terminal devuelve **`MPS check: True`**, todo esta en orden, la grafica esta lista para ponerse a trabajar!

## Arrancando

### 4. Inicia el servicio

Sin mas dilacion, ejecuta directamente:

```bash
uv run acestep
```

### 5. Abre la web y a jugar

Cuando la terminal muestre que esta corriendo, abre el navegador y entra en: `127.0.0.1:7860`

Veras la interfaz de ACE-Step.

**Hay varios puntos clave a tener en cuenta:**

- **Elige bien la configuracion**: En la interfaz tienes que seleccionar el tamano de memoria de video del modelo. Fijate en la memoria unificada de tu Mac, por ejemplo, en mi demo seleccione **16-20GB**.
- **Inicializacion**: Haz clic en **"Initialize Service"**.
  - ⚠️ Nota: La primera vez que lo ejecutes se descargara el modelo automaticamente. El archivo es bastante grande, asi que aqui se quedara atascado un rato, es completamente normal! Ve a prepararte un cafe y ten paciencia.

### 6. Genera tu primera musica con IA

Una vez que el entorno este listo, la operacion es ridiculamente facil:

1. Cambia al modo **"Simple"**.
2. Introduce un prompt (texto descriptivo). Si no sabes que escribir, pon simplemente `easy example`.
3. Haz clic en **"Create Sample"**. Veras que se rellenan automaticamente un monton de parametros complejos (en la seccion Custom), ignoralos.
4. Haz clic directamente en **"Generate Music"** en la parte inferior.

Listo! Espera un momento a que la barra de progreso avance y podras escuchar la musica que tu grafica local acaba de "calcular" 🎵
