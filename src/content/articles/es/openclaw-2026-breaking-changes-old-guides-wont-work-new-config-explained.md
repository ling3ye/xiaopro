---
title: "Guía definitiva para no morir en el intento | OpenClaw: de la instalación a controlar el navegador, todo en un solo artículo"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-06
intro: "¿Alguna vez instalaste OpenClaw y no pudiste hacer nada? El autor de este artículo lo desinstaló y reinstaló 10 veces, y al final entendió a fondo la lógica de configuración de OpenClaw 2026.3.2: desde la conexión de la API, proveedores personalizados, hasta el control del navegador y los permisos de lectura/escritura de archivos. Cada paso viene con capturas de pantalla y comandos. Ideal para usuarios de macOS, principiantes, y veteranos que se quemaron con tutoriales viejos."
image: "https://img.lingflux.com/2026/03/015705fbca42171bdf09fabe9220b546.webp"
tags: ["guía de configuración openclaw", "instalación openclaw 2026", "perfil de herramientas openclaw", "tutorial de configuración OpenClaw", "permisos OpenClaw", "última versión OpenClaw"]
---

Llevamos un tiempo criando langostas, y siento que la versión actual ya debería ser bastante estable. Antes, solo con el nombre ya me sacaba canas verdes: la web era de ClawdBot, pero el comando de instalación era install MoltBot, y luego de repente se llamaba OpenClaw. No es un bug, es la tradición de los proyectos open source: primero hazlo, y cuando llegue la carta del abogado, le cambias el nombre. (Claude demandó a ClawBot porque sonaba demasiado parecido, y desde entonces Claw se hizo aún más famoso).

Estos días de pruebas, sentí que se actualizaba todos los días. Para entender la lógica de configuración, estuve desinstalando y reinstalando sin parar, desde:

2026.2.25
2026.2.26
2026.3.1
2026.3.2
....

La velocidad de actualización es brutal. Especialmente cuando probé la última versión 2026.3.2 (a fecha de cierre, 6 de marzo de 2026), me di cuenta de que la forma de configurar había cambiado, y lo que había probado antes ya no funcionaba. Esta versión parece tener la configuración de seguridad más estricta por defecto, y hay que configurar manualmente los permisos más altos.

Lo que me encanta de OpenClaw es que puede controlar el navegador y manipular archivos del sistema, aunque obviamente eso conlleva muchos riesgos de seguridad, así que hay que tener cuidado. Si quieres criar bien a esta pequeña langosta, tienes que invertir un tiempo en aprender a configurarla.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/flZj-SpTJmQ?si=Jn8A8xWZ-jIZQCeo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## Antes de empezar: ¿tienes suficiente saldo en tu API?

OpenClaw en sí es open source y gratis, pero para que "haga cosas" necesita un modelo de AI funcionando detrás, y eso requiere un token de API.

Si tu token está casi agotado, o si aún no lo has configurado, estas dos plataformas tienen buena relación calidad-precio ahora mismo. Elige según lo que necesites:

- **Zhipu GLM**: compatible con Claude Code, Cline y más de 20 herramientas, con descuentos por suscripción por tiempo limitado → [enlace](https://www.bigmodel.cn/glm-coding?ic=IPWNTCEXE2) (ahora mismo estoy usando este, ¡ojo, esto NO es publicidad!!! NO es publicidad!!! NO es publicidad!!! No me están pagando, el espacio publicitario está disponible)

	![image-20260306102449045](https://img.lingflux.com/2026/03/52e663b49875f0ab36c9fc1f2ff806dd.png)

	1. Tu API KEY: entra en el panel de control, busca la API key y cópiala
	2. La dirección de GLM: https://open.bigmodel.cn/api/anthropic (la dirección compatible con Claude Code)
	3. Nombre del modelo: GLM-4.7

	Echa un vistazo a estos 3 datos, los vas a necesitar en la configuración que viene ahora.

- **Alibaba Cloud Bailian**: modelos completos, los usuarios nuevos tienen saldo gratuito → [enlace](https://www.aliyun.com/benefit/ai/aistar?clubBiz=subTask..12406352..10263..) (este también está bien, ¡y esto TAMPOCO es publicidad!!!)

Cuando estés listo, empezamos.




## Instalación de OpenClaw: vamos alla

Yo uso macOS, que es el mejor sistema para criar langostas, porque el autor lo desarrolló en macOS, así que es donde menos problemas hay. En Windows, Raspberry Pi OS o Linux puede que haya alguna diferencia. Pero este proyecto tiene muchísimos colaboradores, y si hay algo gordo se soluciona rápido.

Dicho eso, por orden de mejor a peor compatibilidad, yo diría:

macOS > Linux > Windows > others

Primero echa un vistazo a la web oficial, hay varios métodos de instalación: https://openclaw.ai/

### Instalación rápida en macOS

En macOS, la web oficial ofrece una app para descargar, pero no sé por qué razón nunca conseguí instalarla. El comando de instalación automática `curl -fsSL https://openclaw.ai/install.sh | bash` tampoco funciona siempre, así que opté por el método de instalación vía npm. En la terminal, escribe:

```bash
# Install OpenClaw  | 安装 OpenClaw
npm i -g openclaw
```

Espera pacientemente a que termine la instalación, y luego escribe:

```bash
# Meet your lobster ｜ 配置 OpenClaw
openclaw onboard
```

Después se abrirá el asistente de configuración. Ve revisando paso a paso y configura la API, el proceso más o menos es así:



### 1. Te pregunta tu caso de uso:

- **Personal (uso personal)**: solo tú usas este Mac Mini → elige **Yes**
- **Shared/multi-user (uso compartido)**: varios usuarios comparten esta máquina y necesitan control de permisos adicional → elige No

**Simplemente elige Yes**, pulsa Enter para confirmar y continuar.

![image-20260306103540426](https://img.lingflux.com/2026/03/f4a9f8ac970e447eadd09b4533d4c6c0.png)



### 2. Te pregunta qué tipo de instalación quieres:

- **QuickStart (inicio rápido)**: primero instala rápido, los detalles (claves API, elección de modelo, etc.) se configuran después
- **Manual (manual)**: ahora mismo configuras todo paso a paso

------

**Recomiendo QuickStart**, por estos motivos:

- Primero lo haces funcionar, y después vas ajustando con `openclaw config set`
- Ahorra tiempo y esfuerzo



![image-20260306104637473](https://img.lingflux.com/2026/03/e3a2171975e988818fbaf4a59195d72d.png)



### 3. Clave: elegir qué proveedor de AI quieres para el cerebro de OpenClaw.

En resumen: **OpenClaw no proporciona AI por sí mismo, necesitas conectar un proveedor de servicios de AI**.

------

Explicación de las opciones más comunes

| Opción                   | Descripción                                              |
| ------------------------ | -------------------------------------------------------- |
| **OpenAI**               | GPT-4o etc., el más主流 (mainstream)                     |
| **Google**               | Serie Gemini                                             |
| **XAI (Grok)**           | La AI de Musk                                            |
| **Moonshot AI (Kimi)**   | China, muy buen soporte para chino                       |
| **Mistral AI**           | Modelo europeo open source                               |
| **OpenRouter**           | Plataforma agregadora, una key para varios modelos       |
| **Qianfan**              | Baidu Wenxin                                             |
| **Volcano Engine**       | Volcengine de ByteDance                                  |
| **Hugging Face**         | Plataforma de modelos open source                        |

Esta elección es clave, porque según lo que se dice por internet, incluso si eliges un modelo chino, estos modelos tienen versiones nacionales e internacionales, así que si eliges directamente un proveedor chino de esta lista (como Qwen, Z.AI, etc.) la URL de entrada del modelo podría no coincidir.

Por eso recomiendo elegir `Custom Provider`, y pulsar Enter. (Así la URL de entrada la defines tú mismo, y seguro que no te equivocas)



![image-20260306104908514](https://img.lingflux.com/2026/03/f0f7b7cf1b38d23375a9c9d36a8abea8.png)



Después verás que te pide la API Base URL. Simplemente copia la URL correspondiente. En la demo, copié la dirección que te pedí que memorizaras antes:
https://open.bigmodel.cn/api/anthropic (cuando termines de escribir, pulsa Enter)

![image-20260306105524813](https://img.lingflux.com/2026/03/1bcc60387a3ba29b530e1bb53be24bf8.png)

Te pregunta si quieres introducir la API KEY ahora. Elige Paste API key now (introducir ahora), y pulsa Enter.

![](https://img.lingflux.com/2026/03/05a5eca5b5fa006180662a65d2ae9381.png)

Ahora pega tu API KEY y pulsa Enter.

![image-20260306105827355](https://img.lingflux.com/2026/03/291d99669c65b615d719844ddf743cee.png)

Después, te pregunta qué formato de interfaz usa tu proveedor de AI:

- **OpenAI-compatible**: el formato de la interfaz es igual que el de OpenAI, la mayoría de proveedores lo soportan (OpenRouter, Kimi, Volcengine, Mistral, etc.)
- **Anthropic-compatible**: el formato de la interfaz es igual que el de Anthropic (Claude)

Como mi URL es compatible con Claude Code, elijo "Anthropic-compatible".

![image-20260306110230234](https://img.lingflux.com/2026/03/b515ca0d12b745463dee0ae52c35b1ab.png)

Luego te pedirá el ID del modelo. Tienes que mirar en la API de tu proveedor cómo se llama exactamente.

En la demo uso GLM-4.7 (en realidad ya soporta GLM-5.0, escribe el nombre del modelo que te corresponda), y pulsa Enter.

![image-20260306110457127](https://img.lingflux.com/2026/03/403f089e93c1d87df6cad0021532f953.png)

Espera un momento y se hará una prueba de conectividad de la API. Si sale bien, verás "Verification successful". Enhorabuena, ya has superado el paso más complicado de toda la configuración.

![image-20260306110630506](https://img.lingflux.com/2026/03/3d695e4ca1951bb4247a8e87c66f1295.png)

Después te pedirá un Endpoint ID (un nombre único para esta configuración del proveedor de AI, para distinguirlo de otros). Deja el valor por defecto y pulsa Enter.

Luego te pedirá un Model alias (un apodo corto para el modelo, para escribir menos cuando cambies de modelo). Puedes dejarlo vacío o escribir algo, y pulsar Enter.



### 4. Elegir a través de qué app de chat quieres hablar con la AI.

En resumen: ¿dónde quieres chatear con tu robot de AI?

------

Explicación de las opciones más comunes

| Opción             | Descripción                                     |
| ------------------ | ----------------------------------------------- |
| **Telegram**       | Recomendado ✅ Fácil de configurar, amigable para principiantes |
| **Discord**        | Para usuarios de juegos/comunidades             |
| **Slack**          | Para entornos de trabajo                        |
| **Feishu/Lark**    | Común en empresas chinas                        |
| **LINE**           | Común en Japón/Sudeste asiático                 |
| **iMessage**       | Para usuarios de Apple                          |
| **Signal**         | Para los que priorizan la privacidad            |
| **Skip for now**   | Saltar por ahora, configurar más tarde          |

De momento elige "Skip for now", que por motivos de espacio lo dejamos para otro artículo.

![image-20260306111140666](https://img.lingflux.com/2026/03/d1d97190310ba6be3e243af0b89ce93c.png)

### 5. Elegir si quieres configurar skills (habilidades)

Igualmente, elige NO. Por motivos de espacio, lo dejamos para la próxima.

![image-20260306111359363](https://img.lingflux.com/2026/03/f2bc070efc12fe983d83711229631147.png)



### 6. Después hay una serie de configuraciones de API, todas a NO para saltar

Esto te pregunta si quieres configurar algunos plugins de funciones adicionales, cada uno necesita su propia API Key:

------

| Mensaje                              | Función                                       | Qué necesitas           |
| ------------------------------------ | --------------------------------------------- | ----------------------- |
| **GOOGLE_PLACES_API_KEY**            | Búsqueda de mapas/lugares (Google Maps)        | Google Cloud API Key    |
| **GEMINI_API_KEY**                   | Usar el modelo Gemini AI                      | Google AI Studio Key    |
| **NOTION_API_KEY**                   | Conectar tus notas de Notion                  | Notion Integration Token|
| **OPENAI_API_KEY (image-gen)**       | Generar imágenes con AI (DALL-E)              | OpenAI API Key          |
| **OPENAI_API_KEY (whisper)**         | Voz a texto                                   | OpenAI API Key          |
| **ELEVENLABS_API_KEY**               | Síntesis de voz con AI (texto a voz)          | ElevenLabs Key          |

------

¿Qué hacer? **Ahora simplemente elige No/saltar en todo**, por estos motivos:

- Son funciones opcionales, no afectan al uso básico
- Si no tienes cuenta, da igual que lo rellenes, no va a funcionar
- Siempre puedes volver a configurarlo más tarde

![image-20260306111518497](https://img.lingflux.com/2026/03/66c6830490fd101cd8bc45b7b3bf041c.png)

### 7. Los Hooks son disparadores automáticos que ejecutan ciertas acciones cuando ocurre un evento específico.

| Opción                    | Función                                                      |
| ------------------------- | ------------------------------------------------------------ |
| **Skip for now**          | Saltar todo                                                  |
| **boot-md**               | Cargar automáticamente ciertas instrucciones/prompts al iniciar |
| **bootstrap-extra-files** | Cargar archivos adicionales al iniciar                       |
| **command-logger**        | Registrar un log de todas las operaciones                    |
| **session-memory**        | Guardar automáticamente la memoria de la conversación actual cuando usas `/new` o `/reset` |

------

Recomiendo marcar solo `session-memory`, es lo más útil. Permite que la AI recuerde lo que habéis hablado antes.

Lo demás, mejor saltarlo al principio. Cuando ya le cojas el tranquillo, lo activas.

Usa la barra espaciadora para marcar, y Enter para confirmar.

![image-20260306111717358](https://img.lingflux.com/2026/03/ef24d76177a3e999293f7e0da00389da.png)



### 8. Cómo quieres arrancar y usar tu robot:

- **Hatch in TUI**: usarlo directamente en la terminal, interfaz de línea de comandos.
- **Open the Web UI**: (recomendado) abrir la interfaz web en el navegador.
- **Do this later**: dejarlo para más tarde.

Elige "Open the Web UI", selecciónalo y pulsa Enter.

![image-20260306112107760](https://img.lingflux.com/2026/03/3244eb382e44133d4cc81f6ec18e57af.png)

En este momento, el navegador abrirá automáticamente la interfaz Web UI de OpenClaw.

## Tu primera conversación con la pequeña langosta (OpenClaw)

![image-20260306112419909](https://img.lingflux.com/2026/03/f40a3a5c08362eecb739689dbcba3139.png)

Si ves que OpenClaw te responde, significa que la instalación se ha completado con éxito y está funcionando correctamente.

¡Enhorabuena!

Pero ahora mismo, tu pequeña langosta no tiene ni brazos ni piernas, solo sabe abrir la boca. Le pidas lo que le pidas, no puede hacerlo (no puede abrir el navegador, no puede modificar archivos).

![image-20260306113036590](https://img.lingflux.com/2026/03/833a2ec19f73a2caab5a9aeb5138a0d2.png)





## Configurar los permisos de control del navegador y manipulación de archivos

Aviso: las siguientes operaciones elevarán los permisos de tu OpenClaw. Lee todo con atención y asegúrate de entenderlo bien.

### OpenClaw tiene 2 modos para controlar el navegador

1. (Modo independiente) Usa el navegador integrado de OpenClaw, totalmente aislado del sistema local, con su propia información de inicio de sesión.

2. (Modo extensión) Usa el navegador Chrome local, instalando la extensión OpenClaw Browser Relay, y comparte la información de inicio de sesión del sistema.

>  En este ejemplo usamos el **modo extensión**, con el navegador Chrome local



### Encontrar la OpenClaw gateway token KEY

La OpenClaw gateway token KEY hay que tratarla como una contraseña, guárdala bien.

Hay 2 formas de obtener la OpenClaw gateway token KEY:

#### 1. Buscarla directamente en el archivo de configuración

El archivo de configuración de macOS está en el directorio del usuario, es un archivo oculto. Necesitas mostrar los archivos ocultos para encontrar la carpeta `.openclaw`. Entra y abre el archivo openclaw.json. Busca el token en la sección "gateway".

![image-20260306122344215](https://img.lingflux.com/2026/03/537f4f44ca08c446ef9ede6549ddb90d.png)

#### 2. Verla en la Web UI (este método es el más fácil)

Haz clic en "Overview", y debajo de "Gateway Token" la tienes. Muy fácil de ver.

![image-20260306122950056](https://img.lingflux.com/2026/03/54be336e2aaa6342c1289fc5370c270a.png)




### 1. Instalar la extensión de control del navegador en Chrome

Busca "OpenClaw Browser Relay" en la Chrome Web Store (https://chromewebstore.google.com/)

(a fecha de cierre ya iba por la versión v2.7), e instálala. (Ojo, hay muchas extensiones con "OpenClaw" en el nombre, fíjate bien y no te equivoques).

Cuando termine de instalarse se abrirá una página pidiéndote que introduzcas el token KEY para verificar. Aquí tienes que poner la gateway token KEY de OpenClaw, NO la AI API KEY, no las confundas.

Cuando lo hayas configurado, puedes fijar la extensión para tenerla a mano. (Luego hará falta operar manualmente, así que acuérdate).

![image-20260306114923386](https://img.lingflux.com/2026/03/9b0e0c0e5bc27812210d0b9886a1962d.png)



### 2. Activar el modo desarrollador

En el navegador, escribe chrome://extensions/ y pulsa Enter para entrar en la página de gestión de extensiones. En la esquina superior derecha hay un interruptor "Developer mode" (modo desarrollador). Comprueba que esté activado, y si no lo está, actívalo.



### 3. Configurar OpenClaw para que soporte el navegador y la manipulación de archivos

Usa la CLI para configurar. Abre la terminal y escribe los siguientes comandos:

```bash
# Subir los permisos de openclaw al nivel coding
openclaw config set tools.profile coding

# Asegurarse de que la función de navegador está activada
openclaw config set browser.enabled true

# Cambiar al Chrome del sistema (esta es la forma oficial de usar el "Chrome por defecto del sistema")
openclaw config set browser.defaultProfile "chrome"

# Limpiar la allowlist (para que el perfil coding exponga automáticamente las herramientas de archivo correctas, ¡esto es clave!)
openclaw config set tools.allow '[]' 

# Configuración completada, reiniciar el gateway de openclaw (obligatorio)
openclaw gateway restart
```

Como se muestra en la imagen:

![image-20260306113653129](https://img.lingflux.com/2026/03/02f6c0258cc846cf7699cd372bbb8a03.png)

Después de reiniciar...

1. Abre el navegador y visita cualquier página, por ejemplo https://lingshunlab.com, y haz clic en la extensión que acabas de instalar, la de la langosta. Al hacer clic debería mostrar una marquita que dice "ON", indicando que está funcionando correctamente.

![image-20260306124413421](https://img.lingflux.com/2026/03/4ef9d1f4eb78a3ca6b2463ed0e809f89.png)

2. Entra en la página de la Web UI de OpenClaw, ve a "Chat" para conversar, pero antes de enviar un mensaje haz clic en "New session". Luego envía algo como "Abre bilibili.com en el navegador".

Si todo va bien, el navegador debería abrir automáticamente la página de bilibili.

![image-20260306123830087](https://img.lingflux.com/2026/03/7580e05a2df8e32d72a7370d3fa964a5.png)

En este punto también puedes probar la función de manipulación de archivos. Envía algo como "Ayúdame a crear un archivo en el directorio del usuario, para probar la función de creación de archivos", y tu pequeña langosta te creará el archivo sin problema.

![image-20260306124032376](https://img.lingflux.com/2026/03/3532062bde99391b12d64eb1c8e2de3b.png)



Si todo funciona, enhorabuena, pero... da un poco de miedo, ¿verdad? Y si...

Por eso quiero limitar los permisos de manipulación de archivos al directorio del "workspace" (espacio de trabajo). ¿Y dónde está este workspace? Puedes verlo en el archivo de configuración openclaw.json, o en la Web UI, en la sección "Agents" > "Overview".

![image-20260306125311134](https://img.lingflux.com/2026/03/6b0ba79477058ff2819ac69caca95fb3.png)



### 4. Limitar la manipulación de archivos solo al directorio del workspace

Usa la CLI para configurar. Abre la terminal y escribe el siguiente comando:

```bash
# Configurar la manipulación de archivos solo dentro del directorio del workspace
openclaw config set tools.fs.workspaceOnly true 
```

Reinicia el gateway:

```bash
openclaw gateway restart
```




## Conclusión

Ahora la langosta ya tiene manos.

Puede abrir el navegador, hacer clic en páginas, leer y escribir archivos dentro del workspace que le hayas delimitado. Suena sencillo, pero en realidad las posibilidades son enormes.

En el próximo artículo, te mostraré cómo conectarla con Feishu, para que puedas "criar langostas en la nube" estés donde estés.

Si te interesa, suscríbete a mi canal. Seguiré actualizando:

- 🎬 **YouTube**: [lingshunlab](https://www.youtube.com/@lingshunlab)
- 📺 **Bilibili**: [凌顺实验室](https://space.bilibili.com/456183128)



## Referencias

### Permisos de **`tools.profile`**

https://docs.openclaw.ai/tools#tool-profiles-base-allowlist

En OpenClaw (2026.3.2 y versiones recientes), **`tools.profile`** es el preset base (base allowlist) de los permisos de herramientas. Este ajuste **afeta enormemente a la seguridad**: en las instalaciones nuevas, el valor por defecto es `"messaging"` (un cambio importante de seguridad desde 2026.3.x). Lo que antes era broad/coding y muchos usuarios usaban en versiones antiguas, ahora hay que configurarlo explícitamente.

### Comparativa de permisos (diferencias clave de un vistazo)

| Dimensión                                            | minimal               | messaging                 | coding                                     | full                  |
| ---------------------------------------------------- | --------------------- | ------------------------- | ------------------------------------------ | --------------------- |
| **Manipulación de archivos** (fs.read/write/edit/apply_patch)   | ✗ Totalmente prohibido            | ✗ Prohibido                    | ✓ Permitido (se puede restringir con fs.workspaceOnly) | ✓ Permitido                |
| **Ejecución de Shell** (exec/runtime/process)           | ✗ Prohibido                | ✗ Prohibido                    | ✓ Permitido (se puede añadir aprobación con approvals.exec)         | ✓ Permitido                |
| **Navegador** (browser)                            | ✗ Prohibido                | ✗ Prohibido                    | ✓ Permitido                                     | ✓ Permitido                |
| **Gestión de mensajes/sesiones** (sessions_*, messaging group) | Solo permite session_status | ✓ Soporte completo                | ✓ Soporte completo                                 | ✓ Soporte completo            |
| **Herramientas de imagen/memoria** (image, memory_*)             | ✗ Prohibido                | ✗ Prohibido                    | ✓ Soporte parcial                                 | ✓ Soporte completo                |
| **Otras herramientas de alto riesgo** (cron, gateway, nodes, etc.)      | ✗ Prohibido                | ✗ Prohibido                    | ✗ La mayoría prohibidas (necesita allow)                   | ✓ Posiblemente abierto            |
| **Instalación nueva por defecto**                                  | ✗ No es el valor por defecto              | ✓ Sí (cambio importante en 2026.3.x) | ✗ Necesita configuración manual                             | ✗ Necesita configuración manual        |
| **Público recomendado**                                    | Seguridad máxima, solo chat      | Usuarios normales, principiantes, principalmente chat  | Desarrolladores, usuarios intensivos de código/archivos                  | Para pruebas, POC, cuando confías en el modelo        |

###

### Lista de comandos habituales de browser

https://docs.openclaw.ai/tools/browser
