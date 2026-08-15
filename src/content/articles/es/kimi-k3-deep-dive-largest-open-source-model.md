---
title: "Kimi K3 en profundidad: el modelo de código abierto con más parámetros del mundo, ¿qué tan bueno es realmente?"
domain: ai
format: news
date: 2026-08-15
intro: "En julio de 2026, Moonshot AI lanzó Kimi K3, con 2,8 billones de parámetros, convirtiéndolo en el modelo de código abierto con más parámetros del mundo y superando por primera vez de frente a los buques insignia de código cerrado en el ranking de programación frontend. Este artículo explica de una vez, desde la tecnología central, los resultados y el precio hasta las vías de acceso, en qué destaca y si vale la pena usarlo."
image: "https://img.lingflux.com/2026/08/571adb2c06517070adb8f0f31ab2892e.png"
tags: ["Kimi K3", "Moonshot AI", "Modelo de código abierto", "Modelo de lenguaje grande", "Artificial Analysis", "LMArena"]
---

> **Resumen en una frase**: Kimi K3, con 2,8 billones de parámetros, lidera los modelos de código abierto a nivel mundial y supera por primera vez a los buques insignia de código cerrado en el ranking de programación; este artículo explica en qué destaca, cuánto cuesta y dónde usarlo.

> Datos actualizados hasta el 12 de agosto de 2026
> Este artículo combina datos de Xinhua, Artificial Analysis, LMArena, los materiales oficiales de Moonshot y múltiples evaluaciones de terceros; se recomienda volver a verificar los rankings más recientes antes de publicar.

---

## 1. Introducción: el modelo de código abierto toca el "techo" por primera vez

El 16 de julio de 2026, justo un día antes de la inauguración de la Conferencia Mundial de Inteligencia Artificial de Shanghái (WAIC), Moonshot AI lanzó una verdadera bomba: **Kimi K3**.

Sus credenciales impresionan, pero son todas reales:

- **2,8 billones de parámetros en total**, el modelo de código abierto con mayor número de parámetros del mundo actualmente, muy por encima de DeepSeek V4 Pro (1,6 billones) y la serie GLM-5 de Zhipu (744.000 millones);
- **El primer modelo de código abierto del mundo a escala de 3 billones de parámetros**;
- **La primera vez en la historia que un modelo de código abierto supera de frente a los buques insignia de código cerrado en los rankings principales**: en la prueba ciega de programación frontend de Frontend Code Arena, Kimi K3 alcanzó la cima con 1679 puntos, por delante de Claude Fable 5 de Anthropic y GPT-5.6 Sol de OpenAI.

En palabras de Xinhua, esto "marca un nuevo paso en el desarrollo de los modelos de inteligencia artificial de China". Y para el usuario común, las preguntas más prácticas son: ¿en qué destaca? ¿Qué tiene que ver conmigo? ¿Dónde puedo usarlo? Este artículo lo aclara todo de una vez.

---

## 2. ¿Qué es Kimi K3?

### 2.1 Ficha básica

| Ítem | Datos |
|---|---|
| Desarrollador | Moonshot AI (fundada en 2023 por Yang Zhilin, emprendedor procedente de la Universidad de Tsinghua; Alibaba y Tencent son inversores) |
| Fecha de lanzamiento | Lanzado el 16 de julio de 2026; pesos completos liberados como código abierto el 27 de julio |
| Arquitectura | Modelo MoE (mezcla de expertos), 93 capas, 896 expertos en total; solo 16 se activan por token |
| Parámetros totales / activos | 2,8 billones / ~decenas de miles de millones (activación dispersa, coste de inferencia muy inferior a lo que sugiere su tamaño) |
| Ventana de contexto | 1 millón de tokens (1.048.576), de precio único sin escalones |
| Modalidad | Soporte nativo de texto + comprensión de imágenes (codificador visual MoonViT-V2); algunos canales ya admiten entrada de video |
| Licencia | Licencia Kimi K3 personalizada (similar a MIT, con cláusulas de ingresos escalonados) |

### 2.2 Dos innovaciones técnicas clave

Lo interesante de Kimi K3 no es solo su "tamaño", sino la forma en que procesa la información:

**1. Atención lineal híbrida KDA (Kimi Delta Attention)**

El mecanismo de atención completa del Transformer tradicional, al procesar textos largos, hace que el coste computacional crezca de forma casi cuadrática con la longitud del texto: al duplicar el contenido, el cómputo se multiplica por cuatro. Esa es la razón de fondo por la que los textos ultralargos resultan difíciles de llevar a producción. K3 usa el módulo de atención lineal KDA, desarrollado internamente, en 69 de sus 93 capas, reduciendo el cómputo a un crecimiento casi **lineal**. El resultado: una reducción de la caché KV de aproximadamente un 75% y un aumento de la velocidad de decodificación de un millón de tokens de unas 6,3 veces. En pocas palabras, con la misma potencia de cómputo puede "leer" textos más largos y "pensar" más a fondo.

**2. Residuos de atención (Attention Residuals / AttnRes)**

Cuanto más grande es el modelo y más capas tiene, más fácil es que la información se atenúe y distorsione al pasar entre capas, y más fácil que el entrenamiento colapse. La técnica de residuos de atención permite al modelo recuperar representaciones de forma selectiva a través de la profundidad, en lugar de acumular mecánicamente capa por capa: es como instalar un "estabilizador" en un modelo gigante de 2,8 billones de parámetros. Según Moonshot, la combinación de ambas técnicas logró una mejora de aproximadamente **2,5 veces en la eficiencia de escalado del entrenamiento** de K3 respecto a K2.

### 2.3 Estrategia de código abierto: cualquiera puede descargarlo, pero las grandes empresas deben "registrarse"

El 27 de julio, los pesos completos y el informe técnico de K3 llegaron a Hugging Face y GitHub. La licencia es en general cercana a MIT: cualquiera puede usarlo, modificarlo, distribuirlo y ajustarlo de forma gratuita. Solo hay dos restricciones relacionadas con los ingresos:

- Los proveedores de nube que revendan a gran escala la inferencia de K3 como "modelo como servicio" deberán firmar un acuerdo por separado con Moonshot si sus ingresos superan los 200.000 dólares durante 12 meses consecutivos;
- Los productos comerciales con más de 100 millones de usuarios activos mensuales o más de 2 millones de dólares de ingresos mensuales deberán mostrar de forma visible "Kimi K3" en su interfaz.

Para la gran mayoría de desarrolladores y pymes, esto equivale a "gratuito y de uso comercial".

---

## 3. Cara a cara: la posición real en los principales rankings

Los resultados deben leerse por separado: por un lado están las **reevaluaciones independientes de terceros** (mayor fiabilidad) y, por otro, las **cifras declaradas por los fabricantes** (solo como referencia). Empecemos por los dos rankings integrales con más valor.

### 3.1 Índice de inteligencia de Artificial Analysis (resultados objetivos, datos de principios de agosto de 2026)

| Puesto | Modelo | Índice de inteligencia | Tipo |
|---|---|---|---|
| 1 | Claude Opus 5 (max) | 63 | Cerrado |
| 3 | Claude Fable 5 | 62 | Cerrado |
| 5 | GPT-5.6 Sol (max) | 61 | Cerrado |
| **6** | **Kimi K3 (max)** | **60** | **Abierto** |
| 7 | GPT-5.6 Sol (xhigh) | 59 | Cerrado |
| 9 | Qwen3.8 Max | 58 | Cerrado |

**Kimi K3 es el modelo de código abierto mejor clasificado de toda la tabla y también el primer modelo chino.** Su diferencia con los cinco primeros buques insignia de código cerrado es de solo 1–3 puntos: está en la "misma primera línea", no a una generación de distancia.

### 3.2 LMArena (votación ciega con usuarios reales, agosto de 2026)

| Modelo | Elo en texto | Notas |
|---|---|---|
| Claude Fable 5 | 1525 | #1 en texto |
| Claude Opus 5 | 1522 | Nuevo buque insignia |
| GPT-5.6 Sol | 1514 | Buque insignia de OpenAI |
| **Kimi K3** | **≈1500** | **A la par del primer grupo de código cerrado; #1 en la subclasificación de programación** |
| GLM-5.2 | 1483 | Abierto |
| DeepSeek V4 Pro | 1462 | Abierto |

Lo más destacable es la subclasificación de programación: **Kimi K3 se llevó el primer puesto en Frontend Code Arena con 1679 Elo** (Claude Fable 5 tiene 1631 y GPT-5.6 Sol 1618), logrando el primer lugar en 6 de 7 subáreas. Es la primera vez que un modelo de código abierto alcanza la cima en la familia de rankings Arena: la generación anterior, K2.6, estaba en el puesto 18, así que avanzó 17 posiciones en una sola generación.

### 3.3 Comparativa de capacidades específicas (datos oficiales de Moonshot + recopilación de terceros)

| Prueba | Kimi K3 | Claude Fable 5 | GPT-5.6 Sol | Claude Opus 4.8 |
|---|---|---|---|---|
| SWE Marathon (desarrollo de series ultralargas) | **42 (1.º)** | 35 | 39 | 40 |
| Program Bench (ingeniería inversa de software) | **77.8 (1.º)** | 76.8 | 77.6 | 71.9 |
| Terminal-Bench 2.1 (operaciones de terminal) | 88.3 | 84.6 | **88.8** | 84.6 |
| FrontierSWE (ingeniería de software de alta dificultad) | 81.2 | **86.6** | 71.3 | 66.7 |
| BrowseComp (investigación web en profundidad) | **91.2 (SOTA)** | 88.0 | 90.4 | 84.3 |
| Automation Bench (automatización de oficina) | **30.8 (1.º)** | 29.1 | 29.7 | 27.2 |
| SpreadsheetBench 2 (modelado en Excel) | **1.º** | — | — | — |
| GPQA-Diamond (razonamiento científico) | 93.5 | 92.6 | **94.1** | 91.0 |
| MMMU-Pro (razonamiento visual) | 81.6 | 81.2 | **83.0** | 78.9 |
| OmniDocBench (comprensión de documentos) | **91.1 (1.º)** | 89.8 | 85.8 | 87.9 |

(Nota: algunos apartados fueron evaluados con distintos frameworks de agent, por lo que la comparación horizontal es solo orientativa.)

**Resumen en una frase del perfil de capacidades de K3:**

- ✅ **Programación de largo recorrido y desarrollo frontend**: sin rival en el mundo del código abierto actualmente, con varios primeros puestos;
- ✅ **Investigación en profundidad y automatización de oficina**: BrowseComp estableció un nuevo récord;
- ✅ **Comprensión de documentos ultralargos**: contexto de 1 millón de tokens + primer puesto en comprensión de documentos, ideal para analizar repositorios de código completos y materiales voluminosos;
- ⚠️ **Experiencia general**: el propio Moonshot admite que, en la "sensación" de los detalles de interacción y el grado de completado de las tareas, sigue estando ligeramente por detrás de Claude Fable 5 y GPT-5.6 Sol; las mediciones de terceros sitúan la velocidad de salida en torno a 36–55 tokens/s, lo cual no es especialmente rápido, y en modo razonamiento el consumo de tokens es algo elevado.

### 3.4 Relación calidad-precio: lo barato es relativo

| Modelo | Entrada ($/millón de tokens) | Salida ($/millón de tokens) | Entrada con hit de caché |
|---|---|---|---|
| Kimi K3 | 3.0 | 15.0 | 0.30 |
| Claude Fable 5 | 10.0 | 50.0 | — |
| Claude Opus 4.8 | 5.0 | 25.0 | — |
| GPT-5.6 Sol | 5.0 | 30.0 | — |
| Kimi K2.6 | 0.95 | 4.0 | 0.16 |

El precio oficial en China es de ¥20/millón de tokens de entrada, ¥100/millón de tokens de salida y ¥2/millón de tokens con caché acertada.

El precio de K3 es aproximadamente 1/3 del de Claude Fable 5, pero es 4–5 veces más caro que su propio K2.6. El truco clave para ahorrar es la **caché**: en escenarios de programación, Moonshot afirma que la tasa de aciertos de caché puede superar el 90%, y la parte de entrada acertada se paga con un descuento del 90%; según mediciones reales en OpenRouter, el coste efectivo de entrada es de unos $0.55/millón de tokens. Cálculos de terceros estiman que una misma tarea de codificación con un agent (100.000 tokens de entrada + 20.000 de salida) cuesta unos $0.60 con K3 y unos $2.00 con Fable 5.

---

## 4. ¿Dónde puedo usar Kimi K3?

Esta es la parte que más interesa a todos, y la que he estado buscando últimamente; la dejo registrada aquí para compartirla, ordenada de menor a mayor dificultad de acceso:

### 4.1 WorkBuddy (una de las formas más cómodas)

[https://www.workbuddy.cn/](https://www.workbuddy.cn/events/invite?inviteCode=421qev5h73caj0) (enlace de invitación de WorkBuddy)

¿Por qué no recomiendo primero la web oficial de Kimi? Porque ahora mismo simplemente no está abierta; no se sabe cuándo volverá a abrirse la suscripción, y yo ya llevo unas 2 semanas esperando. A menos que seas un miembro antiguo de Kimi, en cuyo caso puedes saltarte esto directamente, jeje.

**WorkBuddy ya tiene Kimi K3 integrado de fábrica**: la conversación que estás leyendo ahora mismo funciona con Kimi K3 en segundo plano. Para usuarios comunes y escenarios de oficina que no quieren lidiar con claves de API ni estudiar parámetros, basta con abrir WorkBuddy y usarlo directamente: redactar documentos, crear tablas, leer PDF, ejecutar código y generar páginas web. El contexto largo y las capacidades de agent de K3 están listos para usarse de inmediato en WorkBuddy. También es una de las vías más cortas para que los usuarios de China experimenten las capacidades completas de K3 sin ninguna barrera.

### 4.2 La familia de productos oficiales de Kimi

https://kimi.com

- **Kimi Web / App** (kimi.com / kimi.moonshot.cn): regístrate y podrás conversar de inmediato; la cuota gratuita tiene límites de contexto y frecuencia, y la membresía desbloquea el contexto completo de 1M;
- **Kimi Work**: entorno de trabajo de conocimiento para escritorio (Windows / Mac con chip de Apple, desde la versión 3.1.0);
- **Kimi Code**: agent de programación para terminal, se instala con `npm i @moonshot-ai/kimi-code` y se cambia a K3 con `/model`.

### 4.3 API oficial (desarrolladores)

- Plataforma: platform.moonshot.cn (China) / platform.kimi.ai (internacional);
- Totalmente compatible con el SDK de OpenAI; el ID del modelo es `kimi-k3`, basta con apuntar `base_url` a `https://api.moonshot.ai/v1` para migrar el código existente.

```python
from openai import OpenAI

client = OpenAI(
    api_key="tu API Key",
    base_url="https://api.moonshot.ai/v1"
)
resp = client.chat.completions.create(
    model="kimi-k3",
    messages=[{"role": "user", "content": "Analiza este código por mí"}]
)
```

### 4.4 Plataformas de terceros

- **OpenRouter**: ID del modelo `moonshotai/kimi-k3`, mismo precio oficial sin recargo;
- **SiliconFlow**: acceso amigable desde China;
- **Cloudflare Workers AI y Groq**: también disponibles;
- **Auto-despliegue**: descarga los pesos desde Hugging Face / GitHub, compatible con vLLM / SGLang y cuantización MXFP4/NVFP4; pero un despliegue a nivel de producción requiere supernodos de más de 64 tarjetas, así que para la mayoría es solo algo para echar un vistazo.

### 4.5 Un pequeño recordatorio

Tras el lanzamiento de K3, ante la enorme demanda, la membresía oficial de Kimi suspendió temporalmente las nuevas compras (a partir del 20 de julio se dio prioridad a los usuarios existentes). Si los canales oficiales están saturados, WorkBuddy, OpenRouter y SiliconFlow son alternativas fiables de acceso.

---

## 5. Palabras finales

El verdadero significado de Kimi K3 quizá no se aprecie del todo hasta dentro de unos años:

1. **Demostró que el código abierto puede igualar al código cerrado.** 2,8 billones de parámetros, primer puesto en el ranking de programación de Arena y primer modelo de código abierto en el índice de inteligencia: se acabó la era del "código abierto = segunda categoría";
2. **Demostró que los equipos chinos pueden innovar en arquitectura de bajo nivel.** La atención lineal KDA y los residuos de atención no son simple acumulación de ingeniería, sino soluciones originales a dos problemas de talla mundial: "calcular textos ultralargos de forma eficiente" y "entrenar modelos gigantes de forma estable";
3. **Derribó el precio de las capacidades de vanguardia.** Un tercio del precio de Claude y pesos descargables por cualquiera harán que más productos e investigaciones crezcan sobre los hombros de K3.

Por supuesto, hay que mantener la cabeza fría: en experiencia general todavía está por detrás de los dos o tres modelos de código cerrado más fuertes, su velocidad de inferencia no es rápida y en modo razonamiento consume muchos tokens. No es una llave maestra, pero si te enfrentas a tareas difíciles como **documentos largos, repositorios de código completos, investigación en profundidad o desarrollo frontend**, Kimi K3 es la respuesta más potente que el mundo del código abierto puede darte hoy, y ahora mismo puedes usarlo abriendo WorkBuddy.

---

## Referencias

1. Xinhua: "Nuevo avance: una empresa china publica el modelo de código abierto de mayor escala del mundo, Kimi K3", 2026-07-17
2. Artificial Analysis Intelligence Index, datos de 2026-08
3. Ranking de LMArena, instantánea de 2026-08
4. Materiales oficiales de Moonshot AI e informe técnico de Kimi K3, 2026-07
5. Evaluaciones de terceros como PureAI / Neowin / SiliconFlow / dev.to, 2026-07~08

> Aviso legal: los resultados del artículo incluyen cifras declaradas por los fabricantes; bajo distintos frameworks de prueba los resultados no son del todo comparables. Los precios y canales de disponibilidad se rigen por las páginas en tiempo real de cada plataforma.
