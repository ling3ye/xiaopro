---
title: "Cómo desinstalar OpenClaw de MacOS de verdad (y no dejarlo a medias)"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-12
intro: "¿Creías que con pulsar «desinstalar» ya estaba todo listo? OpenClaw en MacOS deja rastros en tres sitios: el directorio de trabajo, el comando global de npm y las variables de entorno en .zshrc. Si no limpias bien cada uno, como mínimo te saldrán errores en la terminal; en el peor de los casos, la instalación de otras herramientas fallará. Aquí tienes los pasos completos con capturas de pantalla, en 5 minutos y sin dejar ni rastro."
image: "https://img.lingflux.com/2026/03/57911d1d24d0ad3cb8aadbf57ea7fafc.jpg"
tags: ["desinstalar OpenClaw", "eliminar OpenClaw", "borrado completo MacOS", "desinstalación global npm"]
---

Mucha gente desinstala OpenClaw y, al volver a abrir la terminal, se encuentra con un montón de errores, o descubre que las variables de entorno colisionan con otras herramientas nuevas que intenta instalar. El motivo es sencillo: **solo borraste «lo visible», pero hay tres sitios donde siguen quedando archivos residuales.**

En este artículo te explico los pasos completos con capturas de pantalla. En 5 minutos lo tienes resuelto, y no queda ni el recuerdo.



## Antes de desinstalar

⚠️ Antes de empezar: haz una copia de seguridad de tus archivos de trabajo

Ve al espacio de trabajo de OpenClaw (la ruta por defecto en MacOS es: ~/.openclaw/workspace) y copia lo que quieras conservar. Ahí pueden estar tus **archivos de configuración, archivos de skills y archivos de proyecto**.

El proceso de desinstalación borrará este directorio automáticamente. Así que, antes de ponerte con ello, copia a otra carpeta todo lo que quieras guardar.



## Desinstalación paso a paso

Abre la terminal y escribe:

```bash
openclaw uninstall
```

Al ejecutarlo, el programa te preguntará qué componentes quieres eliminar. **Lo ideal es marcarlos todos** (pulsa la barra espaciadora para seleccionar), así te aseguras de una limpieza a fondo.

Después de seleccionar, pulsa Enter. Te volverá a preguntar si estás seguro; elige **Yes** para confirmar.

El desinstalador se pone en marcha. Verás algo parecido a esto:

![ScreenShot_2026-03-12_204743_136 (1)](https://img.lingflux.com/2026/03/cdb2215144cdaa58c3d7f26b61bee3a6.png)

Fíjate en el mensaje que aparece: te avisa de que **el comando OpenClaw del CLI todavía no se ha eliminado**. Es el primer punto donde la gente se suele equivocar; hay que ocuparse de ello por separado.



## Eliminar OpenClaw del CLI con npm

¿Por qué hay que hacerlo aparte? Porque la herramienta de línea de comandos de OpenClaw se instala de forma global mediante npm, no forma parte de la aplicación en sí, y el desinstalador oficial no se encarga de esta parte.

En la terminal, ejecuta:

```bash
npm uninstall openclaw -g
```

Esto eliminará el comando openclaw del CLI. Al terminar, verás algo así:

![Weixin Image_20260312205126_397_55 (1)](https://img.lingflux.com/2026/03/6d07540cdb4de7cd36eddf7b9cb627be.png)

Con esto, el comando `openclaw` ya habrá desaparecido de tu sistema. Pero todavía no hemos acabado...



## Limpiar las variables de entorno de OpenClaw en .zshrc

Este es **el paso que más gente se salta y el que más dolores de cabeza causa después**.

Cuando se instala, OpenClaw añade automáticamente un bloque de configuración al final del archivo `~/.zshrc` para cargar el script de autocompletado. Aunque hayas completado los dos pasos anteriores, ese código sigue ahí, y cada vez que abras la terminal intentará cargar un archivo que ya no existe... y boom, error.

En MacOS, busca el archivo .zshrc en tu directorio de usuario (~/.zshrc). Es un archivo oculto, así que tendrás que mostrar los archivos ocultos (por ejemplo, en Finder con el atajo shift + command + .). Puedes abrirlo con cualquier editor de texto, o desde la terminal con `nano ~/.zshrc`.

Busca este bloque de código y elimínalo por completo:

```tex
# OpenClaw Completion
source "/Users/{tu-nombre-de-usuario}/.openclaw/completions/openclaw.zsh"
```

Aquí puedes ver dónde está en el archivo:

![ScreenShot_2026-03-12_205815_641 (1)](https://img.lingflux.com/2026/03/eb7706d1300a594edd849b787c740a8c.png)

Después de borrarlo, guarda el archivo. Si usas nano, pulsa `Control + X` y luego `Y` para confirmar el guardado.

Cierra la terminal.

Cuando vuelvas a abrirla, OpenClaw habrá desaparecido por completo de tu sistema. Esta langosta ya se ha ido.



## En resumen

La desinstalación de OpenClaw requiere limpiar tres sitios, y no te puedes saltar ninguno:

1. **Ejecuta `openclaw uninstall`** para eliminar la aplicación principal y el espacio de trabajo
2. **Ejecuta `npm uninstall openclaw -g`** para eliminar el comando global del CLI
3. **Edita `~/.zshrc`** y borra el bloque de configuración de autocompletado

Todo el proceso te lleva menos de 5 minutos. Sigue los pasos en orden y te despides de esta langosta para siempre, sin dejar ni rastro.

### Comprueba que la desinstalación está completa

Después de los tres pasos, puedes verificar que OpenClaw ya no está en tu sistema con este comando:

```bash
which openclaw
```

Si no devuelve nada, está todo limpio. Si te devuelve una ruta, revisa si queda algo en el directorio global de npm:

```bash
npm list -g --depth=0
```

Confirma que en la lista de resultados no aparece `openclaw`, y listo.

Si este artículo te ha sido útil, guárdalo y compártelo con otros amigos que también usen OpenClaw.
