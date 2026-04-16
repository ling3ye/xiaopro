---
title: "¿Hablar con IA directamente en WeChat? Tutorial real de OpenClaw + ClawBot (soporte oficial, sin riesgo de baneo)"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-22
intro: "WeChat ya abrió su sistema oficial de plugins. En este artículo te explico cómo conectar ClawBot con OpenClaw para chatear desde WeChat, con el proceso completo de instalación y soluciones a los problemas más comunes."
image: "https://img.lingflux.com/2026/03/e0160b21b299a1ed5acdb00b763871a7.png"
tags: ["openclaw", "clawbot", "plugin de WeChat", "WeChat AI", "tutorial de OpenClaw", "WeChat AI"]
---


WeChat ya habilitó su sistema de plugins oficiales, lo que significa que puedes conectar ClawBot de OpenClaw directamente en WeChat. No hace falta usar hacks de terceros, no hay riesgo de que te cierren la cuenta. Solo tienes que actualizar a la versión v8.0.70 y listo.

Este artículo recoge el proceso completo que yo mismo seguí paso a paso, incluyendo los momentos en los que se me quedó colgado y cómo logré solucionarlo.

---

## Requisito previo: WeChat tiene que ser v8.0.70 o superior

La entrada de plugins es una función que solo aparece en las versiones nuevas. Si tu versión es más antigua, simplemente no la vas a encontrar.

Después de actualizar, **cierra WeChat manualmente y vuelve a abrirlo**. No me refiero a cambiar de app en segundo plano, sino a cerrarla de verdad y reiniciarla. Yo al principio no lo hice, me pasé un buen rato buscando la entrada de plugins en la configuración y no aparecía por ningún lado. Reinicié y ahí estaba, como por arte de magia.

---

## Método 1: Proceso oficial (si todo va bien, 5 minutos)

### Paso 1: Encuentra tu comando de instalación personalizado

En WeChat del móvil, sigue esta ruta:

**"Yo" → "Configuración" → "Plugins" → busca ClawBot → "Detalles"**

![Página de detalles del plugin ClawBot](https://img.lingflux.com/2026/03/f78858448a52037587812f6a540d9166.png)

Ahí verás un comando personalizado con este formato:

```bash
npx -y @tencent-weixin/openclaw-weixin-cli@latest install
```

Cada cuenta genera un comando ligeramente distinto, así que copia el que aparece en tu pantalla.

### Paso 2: Ejecuta el comando en el dispositivo donde tienes OpenClaw

Abre la terminal, pega el comando, dale a Enter y espera a que termine la instalación.

![Ejecutando el comando de instalación en la terminal](https://img.lingflux.com/2026/03/9118db862fbd4f96c48fe012cec2241c.png)

### Paso 3: Escanea el código QR para emparejar

Cuando termine la instalación, la terminal mostrará un código QR. Escanéalo con WeChat y confirma la autorización en el móvil.

### Paso 4: Busca ClawBot en WeChat y envíale un mensaje

Una vez emparejado correctamente, ClawBot aparecerá en tu WeChat. Ya puedes enviarle mensajes directamente.

---

## Método 2: Solución manual cuando la instalación se cuelga

Si tu terminal se queda parada en "Instalando plugin..." durante más de dos o tres minutos sin hacer absolutamente nada, no sigas esperando: el proceso se ha colgado. Pulsa `Ctrl+C` para cancelar o cierra directamente la ventana de la terminal, y sigue este procedimiento manual. Yo mismo lo hice así y funcionó sin problemas.

### Paso 1: Detén OpenClaw Gateway

```bash
openclaw gateway stop
```

### Paso 2: Asegúrate de que el proceso se ha cerrado del todo

```bash
pkill -f openclaw
```

### Paso 3: Instala el plugin manualmente con npm

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
```

### Paso 4: Activa el plugin

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

### Paso 5: Activa el enlace por código QR (paso clave)

```bash
openclaw channels login --channel openclaw-weixin
```

La terminal mostrará un código QR → escanealo con WeChat → confirma la autorización en el móvil → cuando veas "Conexión con WeChat exitosa", significa que ya está enlazado.

![Mensaje de conexión exitosa con WeChat](https://img.lingflux.com/2026/03/b6e5065e87d9175a8499d84e32cf0964.png)

### Paso 6: Reinicia Gateway

Este paso es fácil de olvidar, pero si no reinicias, ClawBot no responderá a los mensajes.

```bash
openclaw gateway restart
```

---

## Verifica que todo funciona

Vuelve a WeChat, busca ClawBot y envíale cualquier mensaje. Si recibes respuesta, significa que todo está funcionando correctamente.

![ClawBot respondiendo normalmente en WeChat](https://img.lingflux.com/2026/03/6a7c383c20c33490baa5b8cbcba4f1d0.png)

---

## Solución rápida de problemas comunes

| Problema | Qué hacer |
|---|---|
| El comando de instalación se queda en "Instalando plugin..." sin avanzar | Deja de esperar y usa directamente el Método 2 |
| Después de escanear el código QR, el móvil no reacciona | Cierra WeChat por completo y vuelve a abrirlo, luego intenta escanear otra vez |
| Después de reiniciar Gateway, ClawBot no responde | Comprueba que la configuración "enabled" del paso 4 se haya guardado correctamente |

---

Todo este proceso lo he probado personalmente en macOS. En Windows los comandos de la terminal son los mismos, solo ten cuidado con las barras invertidas en las rutas.
