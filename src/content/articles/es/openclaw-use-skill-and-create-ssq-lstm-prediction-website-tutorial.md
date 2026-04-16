---
title: "OpenClaw en acción: crea una web de análisis de lotería en 1 hora y llega a la libertad financiera (o no)"
domain: ai
platforms: ["mac", "windows", "linux"]
format: "tutorial"
date: 2026-03-15
intro: "Tutorial paso a paso para crear una skill personalizada en OpenClaw y luego, usando solo conversación, hacer que la IA construya una web de predicción LSTM para la lotería SSQ: desde definir requisitos, revisar entregas, reportar bugs, hasta tener una app web completa corriendo, sin escribir una sola línea de código."
image: "https://img.lingflux.com/2026/03/85e592835608cc53041951e03f4b52fd.png"
tags: ["OpenClaw", "Herramientas de IA", "LSTM", "Lotería SSQ", "ClawdHub", "Creación de Skills", "Desarrollo sin código"]
---


> ⚠️ Aviso legal: el siguiente contenido es puramente educativo. No constituye asesoramiento de inversión. Comprar lotería es cosa tuya. Si ganas, invítame a comer; si pierdes, no me busques.

---

## Qué vas a aprender

Este proyecto, a primera vista, trata de construir una web de predicción de lotería. Pero en realidad vas a vivir esto:

- Crear una skill personalizada en OpenClaw
- Usar un modelo de deep learning LSTM para procesar datos de series temporales
- Integrar frontend y backend para levantar una aplicación web completa

¿Y la predicción es precisa? siendo honesto, frente a combinaciones de números de altísima aleatoriedad, un modelo LSTM es, en teoría, más o menos como pisar un teclado con los pies a ver qué sale. Pero este sistema te da un resultado estable en lugar de algo distinto cada vez, y eso, amigo, ya le gana a la intuición de mucha gente.

---

## Parte 0: Deja que OpenClaw cree una skill automáticamente

¿No sabes por dónde empezar? Tranquilo, puedes simplemente preguntarle:

```
创建一个技能的步骤是什么？详细说出每一个操作步骤。
```

Te va a listar todo paso a paso. Luego le pides que te haga un ejemplo, y cuando termine que te diga dónde lo guardó y cómo se invoca. Básicamente, le dices que te enseñe primero, y tú aprendes mirando.

Con esa base, ya puedes crear tus propias skills manualmente.

Mira el video primero:
<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/JG6JlTcPitE?si=cl44gjuh0uRN_yjV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

---

## Parte 1: Crear una skill manualmente en OpenClaw

### Dónde está la carpeta de skills

Para usuarios de macOS, el workspace está escondido en una carpeta oculta dentro del directorio de usuario, en `.openclaw`:

```
~/.openclaw/workspace/
```

Entra ahí y crea una carpeta `skills`. La estructura queda más o menos así:

```
skills/
└── nombre-de-tu-skill/
    ├── SKILL.md        ← Las instrucciones principales de la skill
    └── Otros archivos  ← (opcional) puede que no haga falta ninguno
```

`SKILL.md` es como el «contrato de trabajo» entre tú y la IA: escribes qué tiene que hacer, cómo hacerlo, y qué evitar, y ella simplemente cumple.

### Qué escribir en SKILL.md

Como mínimo tiene que incluir:

| Campo | Función |
|-------|---------|
| Nombre de la skill | Para que la IA la identifique |
| Condición de activación | Cuándo debe usar esta skill |
| Pasos de ejecución | Instrucciones paso a paso |
| Precauciones | Qué cosas NO debe hacer |

---

## Parte 2: Instalar el ecosistema de skills (ClawdHub)

Con las skills creadas manualmente se puede hacer bastante, pero no suficiente. Para levantar un proyecto web completo necesitas paquetes de skills como App Builder y Tailwind CSS, y esos se instalan a través de ClawdHub.

### Paso 1: Instalar ClawdHub

Esto se hace en la terminal (línea de comandos). Escribe:

```bash
npm i -g clawhub
```

Una vez instalado, ejecuta el comando de login:

```bash
clawhub login
```

Se va a abrir una página en el navegador pidiendo que vincules tu cuenta de GitHub. Cuando termines, ClawdHub queda activado.

> **¿Por qué hay que hacer login?** El repositorio de skills de ClawdHub está en servidores remotos. Sin iniciar sesión, no puede encontrar ninguna skill, y todos los comandos de instalación fallan. Mucha gente se queda trabada aquí pensando que es un problema de red, cuando en realidad solo falta un `clawhub login`.

### Paso 2: Instalar las skills necesarias para el proyecto

Después de iniciar sesión, vuelve al chat de OpenClaw y envíale:

```
帮我安装 App Builder 和 Tailwind CSS 这两个技能
```

Normalmente se descargan solas. Si algo falla, revisa en este orden:

1. **Confirma que hiciste login en ClawdHub** — 8 de cada 10 veces es por esto
2. **Revisa tu conexión** — en algunas regiones el acceso a los servidores de ClawdHub es inestable; espera un rato y vuelve a intentarlo
3. **Instalación manual** — entra a [clawhub.ai](https://clawhub.ai/), busca la skill que necesitas y copia la carpeta directamente al directorio `skills/` (la estructura de archivos está en la Parte 1)

### Verificar que las skills están listas

Cuando termines de instalar todo, simplemente pregúntale:

```
你现在有什么技能？
```

Te listará todas las skills cargadas. Si las que instalaste aparecen en la lista, ya puedes arrancar.

---

## Parte 3: El modelo LSTM — ¿qué hace exactamente aquí?

### Por qué no usar métodos estadísticos normales

Lo más instintivo es contar la frecuencia de cada número y sacar los «números calientes» y los «números fríos». El problema es que esto asume, de forma implícita, que cada sorteo está influenciado por los anteriores. Pero el sorteo de lotería es un proceso físico aleatorio: que haya salido el 7 en el sorteo anterior no significa que esta vez el 7 tenga una probabilidad mayor o menor. La estadística de frecuencias aquí hace, fundamentalmente, algo que te hace sentir bien pero no sirve de mucho.

LSTM es diferente. No asume que exista un patrón; lo busca en los datos por su cuenta. Si hay alguna correlación temporal real, la encuentra; si no la hay, no la encuentra, y listo. Al menos es honesto.

### Cómo funciona LSTM (versión sin fórmulas)

LSTM significa Long Short-Term Memory, o «red de memoria a largo y corto plazo».

Una red neuronal normal procesa cada dato de forma independiente: lo que pasó con el dato anterior no afecta para nada al siguiente. Lo especial de LSTM es que tiene una «línea de memoria» que recorre toda la secuencia.

Imagina a un editor revisando una novela por entregas. Una red normal no recuerda nada de los capítulos anteriores y tiene que empezar de cero cada vez. LSTM, en cambio, lleva un cuaderno de notas: anota qué tramas son importantes y cuáles puede olvidar. Cuando llega un capítulo nuevo, decide si actualiza el cuaderno o lo deja tal cual, y luego toma una decisión.

Aplicado a los datos de lotería: tomas los resultados de los últimos N sorteos como secuencia de entrada. LSTM ajusta los pesos durante el entrenamiento, intentando encontrar patrones de variación numérica entre un sorteo y el siguiente, y luego usa ese patrón para predecir el próximo.

*(Llegado a este punto, yo mismo ya me estoy mareando...)*

### Estructura del modelo (versión simplificada)

```
Historial de sorteos (últimos N períodos)
        ↓
  Preprocesamiento + normalización
        ↓
   Capa LSTM (aprende patrones de secuencia)
        ↓
   Capa Dense de salida (genera valores predichos)
        ↓
  Desnormalización → Números finales
```

### Una aclaración honesta

Este modelo puede funcionar bastante bien con los datos de entrenamiento. Después de todo, fue entrenado con datos históricos y luego predice... esos mismos datos históricos. Claro que tiene cierta tasa de acierto.

La prueba de fuego es con datos futuros. Los números de lotería son, en teoría, variables aleatorias independientes e idénticamente distribuidas. Los «patrones» que LSTM puede «aprender» probablemente sean solo ruido en los datos que el modelo confunde con señal. Es como cuando ves una nube y te parece un dragón, pero el cielo nunca tuvo esa intención.

Así que el valor de este sistema no es tanto como «herramienta de predicción», sino como un ejercicio completo de modelado de series temporales: procesamiento de datos, entrenamiento del modelo, evaluación de resultados, integración frontend-backend. Recorrer todo el flujo de punta a punta, eso sí es lo que de verdad aprendes.

---

## Parte 4: Crear el sistema de predicción de lotería usando solo conversación

Lo importante de esta parte no es el código, sino cómo colaborar con la IA para completar un proyecto de principio a fin.

Lo único que tienes que hacer son tres cosas: explicar qué quieres, revisar lo que entrega y reportar los problemas. El código lo escribe ella, la arquitectura la diseña ella. Tu rol es más bien el de un project manager que el de un desarrollador.

Hay un requisito previo: necesitas tener una idea general de ciertos términos técnicos, como Next.js o Tailwind CSS. No tienes que saber programar ni entender el código, pero sí saber para qué sirven estas herramientas y qué alternativas existen. Y para esas preguntas, la IA es la mejor compañera.

### Paso 1: Enviar el brief del proyecto

No vayas dando instrucciones sueltas una por una. Explica todo de golpe. Este es el prompt que le envié a OpenClaw:

```
用 app-builder 和 tailwindcss 帮我开发一个双色球统计预测网页前端
（Next.js + Tailwind CSS + Chart.js）：

1. 必须集成我已有的 ssq-lstm-predict Skill
   （路径：~/.openclaw/workspace/skills/ssq-lstm-predict），
   在页面调用它的 lottery_lstm.py 来获取：
   - 所有号码当前遗漏次数（红球 1-33 + 蓝球 1-16）
   - 最新一期红球均值
   - 热号（遗漏少）/ 冷号（遗漏多）
   - LSTM 预测的下一期号码

2. 页面布局：
   - 顶部：标题「双色球统计与预测系统」
   - 中间：遗漏次数表格（可排序）、热冷号柱状图（Chart.js）
   - 下面：最新均值显示 + 大红色「一键预测下一期」按钮
     （点击调用 LSTM，返回红球 6 个 + 蓝球）
   - 响应式，手机友好，彩票红色主题

3. 项目创建在 ~/.openclaw/workspace/ssq-predict-web

4. 完成后本地运行 npm run dev，给我 localhost 预览链接

5. 代码要干净、可手动修改，完成后告诉我怎么继续开发或调试
```

> **Explicarlo todo de una vez vale más que diez rondas de ida y vuelta.** La IA procesa la información de forma global y luego ejecuta. Cuanto más completo sea el brief, mejor será el primer resultado, y menos iteraciones necesitarás.

### Paso 2: Revisión — examina lo que entregó

Cuando te diga que terminó, no le digas «ok» de inmediato. Revisa punto por punto:

- ¿La URL que te dio funciona?
- ¿La página muestra datos?
- ¿La función principal (el botón de predicción) responde?
- ¿Los resultados son estables, o cambian cada vez que haces clic?
- ¿Es lo que querías? ¿Falta algo?

La primera vez que revisé, **los cinco puntos tenían problemas**: el puerto de la URL estaba mal (300 en vez de 3000), la página estaba en blanco, el botón no respondía, los resultados cambiaban cada vez, y algunas funciones directamente no aparecían.

Esto es totalmente normal. Que el primer intento tenga problemas no significa que la IA sea mala; los proyectos complejos necesitan iteración por naturaleza. La clave es si puedes describir con precisión dónde están los problemas.

### Paso 3: Feedback — describe síntomas, no sensaciones

«No funciona», «algo está mal» es el feedback más inútil que existe. Ella no sabe a qué te refieres ni qué parte falla. Aunque uses los insultos más creativos de la historia, no ayuda en absoluto: la IA no siente dolor, pero tú sí pierdes el tiempo.

Lista los síntomas que observaste, uno por uno:

```
有以下问题需要修复：
1. 你给的网址端口是 300，实际应该是 3000，访问不到
2. 页面加载后没有任何数据显示
3. 点击预测按钮没有反应
4. 修复后请确认：多次点击预测，结果应该保持一致
```

Cuanto más específico sea el problema que describes, más precisa será la corrección, y menos rondas de ida y vuelta necesitarás.

### Paso 4: Vuelve a revisar, hasta que estés satisfecho

Después de que corrija, repite la lista del Paso 2.

En mi caso hubo varias rondas: el problema del puerto lo intentó arreglar varias veces sin éxito, al final tuve que acceder directamente al puerto 3000 por mi cuenta; la estabilidad de las predicciones se arregló bien después de la primera corrección. Al final la página tenía datos, las predicciones eran estables y todas las funciones funcionaban. Proyecto completado.

---

En todo este proceso, no escribí una sola línea de código. Pero sabía exactamente qué hacía cada componente, qué estaba fallando y cómo describirlo.

Esa habilidad es más difícil de cultivar que saber programar, pero vale mucho más. Un profesor solía decir: «Aprender a preguntar es la verdadera sabiduría.» Observar el problema central, describirlo correctamente, verificarlo y convertirlo en conocimiento... eso, la IA no lo puede hacer por ti. Hay que practicarlo uno mismo.

---

## Para cerrar

El valor de este sistema no es lo precisa que sea la predicción. Es que viviste, de primera mano, el proceso completo de crear un proyecto desde cero.

Los prompts y los datos están todos arriba. Sigue los pasos una vez y te darás cuenta de que entiendes más de lo que creías.

Si te interesa, suscríbete a mi canal. Sigo subiendo contenido:

- 🎬 **YouTube**: [lingshunlab](https://www.youtube.com/@lingshunlab)
- 📺 **Bilibili**: [凌顺实验室](https://space.bilibili.com/456183128)

---

## Referencias

Archivos de la Skill compartidos en GitHub, incluyendo el archivo de datos históricos de la lotería SSQ desde 2003-01-01 hasta 2026-03-15:
[lingshunlab / ssq-lstm-predict](https://github.com/ling3ye/LingShunLAB/tree/main/videos/%23010-OpenClaw-Skills-SSQ/ssq-lstm-predict)