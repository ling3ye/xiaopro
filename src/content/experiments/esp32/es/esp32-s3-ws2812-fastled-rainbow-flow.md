---
title: "ESP32-S3 controla anillo WS2812 para efecto arcoíris fluido rotativo - Tutorial completo (protocolo de bus único + FastLED)"
boardId: esp32s3
moduleId: lighting/ws2812b-40led-ring
category: esp32
date: 2026-05-08
intro: "ESP32-S3 controla un anillo WS2812, usando la librería FastLED para lograr un efecto de rotación arcoíris fluido no bloqueante. Cableado de bus único con solo 3 cables, reproducible por principiantes en 30 minutos."
image: "https://img.lingflux.com/2026/05/d991a873016f98577b8ed80aefa9d67b.jpg"
---



# ESP32-S3 controla anillo WS2812 para efecto arcoíris fluido rotativo - Tutorial completo

Dificultad: ⭐⭐☆☆☆ (adecuado para principiantes)
Tiempo estimado: 30 minutos
Entorno de prueba: Arduino IDE 2.3.8 + FastLED v3.10.3 + ESP32 Arduino Core 3.3.8

---

> **TL;DR (inicio rápido):**
>
> 1. Cableado: Anillo WS2812 `DIN` → ESP32-S3 `GPIO40`, `VCC` → 5V, `GND` → GND
> 2. Instalar librería: Buscar `FastLED` en el gestor de librerías de Arduino (autor Daniel Garcia), instalar la última versión
> 3. Modificar según sea necesario `NUM_LEDS` (cantidad de LEDs) y `LED_PIN` (pin) en el código
> 4. Cargar el código, alimentar, el anillo comienza a rotar

---

## Introducción

Tenía un anillo WS2812 guardado en casa, esperando a tener "tiempo libre" para jugar con él. Pero al verlo acumular polvo, decidí limpiarlo y hacer un ejemplo sencillo.

Lo más ingenioso de las tiras/anillos/bloques de LED WS2812 es que todo el dispositivo **solo necesita un cable de datos**, junto con los cables de alimentación, son apenas 3 cables para controlarlos. Cada LED puede controlarse de forma independiente en color, gracias al chip controlador integrado. No se necesita decodificador, no se necesita registro de desplazamiento, el código se resuelve en unas decenas de líneas.

Objetivo de este artículo: usar ESP32-S3 + librería FastLED para lograr un efecto de flujo arcoíris que rota a lo largo del anillo, completamente no bloqueante, sin afectar futuras expansiones de funcionalidad.

---

## Efecto del experimento

![](https://img.lingflux.com/2026/05/b9b24692bd3fe29d05bafd71a1a6ee89.jpg)

Los 40 LEDs del anillo se encienden simultáneamente, con colores distribuidos en gradiente arcoíris, el tono general rota continuamente, pareciendo un anillo de luz colorida en movimiento.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/kA8XlvHq3_I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Descripción del componente

### Anillo WS2812

El anillo WS2812 funciona como un juego de teléfonos de lata: envías todos los datos al primer LED, este se queda con su propia información de color y pasa el resto al siguiente, el siguiente se queda con la suya y pasa lo que sobra al próximo, y así sucesivamente. Toda la cadena se conecta en serie, esto se llama conexión en cadena margarita (daisy-chain), con un solo cable puedes controlar decenas (incluso cientos) de LEDs cada uno con un color diferente.



```
Ejemplo: secuencia de datos: [rojo, azul, verde, amarillo]
         ↓
   LED 1 toma "rojo" se enciende en rojo → pasa [azul, verde, amarillo] al siguiente
         ↓
   LED 2 toma "azul" se enciende en azul → pasa [verde, amarillo] al siguiente
         ↓
   LED 3 toma "verde" se enciende en verde → pasa [amarillo] al siguiente
   ...
   ...
   ...
```



| Parámetro | Valor |
| --- | --- |
| Voltaje de alimentación | 5V |
| Corriente máxima por LED | 60mA (20mA por cada R/G/B con todos encendidos) |
| Nivel de señal de datos | Compatible con lógica 3.3V (sin necesidad de conversión de nivel) |
| Protocolo de comunicación | Bus único NZR (código de retorno a cero) |
| Orden de colores | GRB |
| Tasa de refresco | 400Hz / 800Hz (depende del modelo) |

> Razón para elegirlo: cableado ultra simple (un solo cable de datos), soporte nativo en FastLED, abundante documentación en la comunidad, difícil que principiantes tengan problemas.



**¿Cuántos LEDs puede controlar teórica y prácticamente una línea de datos WS2812B (un solo GPIO)?**

### Límite teórico

**Prácticamente no hay un límite estricto** (puede controlar miles o incluso decenas de miles). El WS2812B usa conexión en **cadena margarita (daisy-chain)**, la salida DO de cada LED se conecta a la entrada DI del siguiente, los datos se transmiten uno por uno. Mientras el microcontrolador pueda enviar tramas de datos completas a tiempo, teóricamente se puede encadenar infinitamente.

### Cantidad recomendada en la práctica (una línea de datos)

| Escenario de uso | Cantidad máxima recomendada | Descripción |
| ----------------------------- | ----------------- | -------------------------------------------- |
| **Animación fluida/juegos** (alta tasa de refresco) | **300~600 LEDs** | Rango recomendado, tasa de refresco se mantiene por encima de 30~60fps |
| **Efectos generales/iluminación ambiental** | **800~1200 LEDs** | Límite superior más común, tasa de refresco aprox. 15~30fps |
| **Caso extremo** | **2000~4000+ LEDs** | Posible, pero tasa de refresco muy baja (<10fps), señal propensa a problemas |
| **Proyectos profesionales/grandes** | Miles~decenas de miles | Obligatorio **usar múltiples líneas de datos** en paralelo (ESP32 es ideal para esto) |

### Principales factores limitantes

1. **Tasa de refresco (el más crítico)** Cada LED requiere aprox. 30μs de datos (24bit).
   - 1000 LEDs ≈ 30ms → aprox. 33fps
   - 2000 LEDs ≈ 60ms → aprox. 16fps (tartamudeo notable)
2. **Calidad de la señal**
   - Si el cable de datos es demasiado largo (>10~15 metros) o hay demasiados LEDs, los LEDs al final pueden mostrar colores incorrectos, parpadeos o fallos.
   - Se recomienda añadir un **amplificador de señal** (74HCT245 / SN74AHCT125 etc.) o **módulo repetidor** cada 500~1000 LEDs aprox.
3. **Alimentación** (no es una limitación del cable de datos, pero debe resolverse)
   - Cada LED en blanco completo consume aprox. 60mA máximo (normalmente 20~30mA de promedio).
   - **Obligatorio inyectar alimentación en múltiples puntos** (cada 1~2 metros), de lo contrario la caída de voltaje causará que los LEDs al final se atenúen o cambien de color.

###

---

## Lista de materiales (BOM)

| Componente | Especificación | Cantidad |
| --- | --- | --- |
| Placa de desarrollo ESP32-S3 | Cualquier versión con GPIO | ×1 |
| Anillo WS2812 | 40 LEDs (u otra cantidad, cambiar una línea en el código) | ×1 |
| Cables puente | Macho a hembra / macho a macho, según necesidad | Varios |

---

## Descripción de pines del componente

El anillo WS2812 generalmente tiene los siguientes 4 pines:

| Marca del pin | Descripción |
| --- | --- |
| VCC / 5V | Polo positivo de alimentación, conectar a 5V |
| GND | Polo negativo de alimentación, conectar a GND |
| DIN / Data In | Entrada de datos, conectar a GPIO del ESP32-S3 |
| DOUT / Data Out | Salida de datos, se usa al conectar múltiples anillos en cadena, no se conecta en este proyecto |

> ⚠️ Algunos anillos solo marcan `+`, `-`, `Data`, la correspondencia es la misma, no te asustes.

---

## Esquema de cableado

| Pin del anillo WS2812 | ESP32-S3 |
| --- | --- |
| VCC / 5V | 5V (pin 5V de la placa o fuente externa 5V) |
| GND | GND |
| DIN | GPIO40 |

> 💡 **Se recomienda verificar cada conexión una por una al terminar**, esto ahorra el 80% del tiempo de depuración. Presta especial atención a no conectar VCC a 3.3V — los LEDs se encenderán, pero los colores serán incorrectos y el brillo reducido, haciendo perder tiempo de depuración.

---

## Librerías necesarias

Buscar **`FastLED`** en el gestor de librerías de Arduino IDE, el autor es **Daniel Garcia**, instalar la última versión (versión probada en este artículo: v3.10.3).

Ruta de instalación: `Herramientas` → `Gestionar librerías` → buscar `FastLED` → instalar

---

## Código completo

```cpp
/*
 * ESP32-S3 WS2812 Anillo de rotación arcoíris fluido
 * Versión no bloqueante con FastLED - no bloquea loop(), facilita añadir botones, sensores y otras funciones
 */

#include <FastLED.h>

// ===== Modifica aquí según tu situación real =====
#define LED_PIN     40       // Pin GPIO donde está conectado el cable de datos
#define NUM_LEDS    40       // Cantidad de LEDs en el anillo
#define BRIGHTNESS  204      // Brillo global, rango de 0 (apagado) a 255 (brillo máximo)
// ====================================

#define LED_TYPE    WS2812B
#define COLOR_ORDER GRB      // El orden de colores del WS2812 es GRB, no RGB, no te equivoques

CRGB leds[NUM_LEDS];         // Array de colores para cada LED

uint8_t gHue = 0;            // Tono de inicio del arcoíris, se incrementa en cada fotograma para lograr el efecto de "rotación"

void setup() {
    // Paso 1: Dar 1 segundo de arranque al hardware para evitar parpadeos por pico de corriente al encender
    delay(1000);

    // Paso 2: Inicializar FastLED, indicando qué pin, qué tipo de LED y cuántos
    FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS)
           .setCorrection(TypicalLEDStrip);  // Corrección automática de temperatura de color, hace que el blanco se vea más blanco

    // Paso 3: Establecer brillo global (es más fácil cambiar aquí que modificar valores RGB)
    FastLED.setBrightness(BRIGHTNESS);
}

void loop() {
    // Paso 4: Llenar todo el anillo con gradiente arcoíris
    // gHue es el tono de inicio, 255/NUM_LEDS es el intervalo de tono entre cada LED
    fill_rainbow(leds, NUM_LEDS, gHue, 255 / NUM_LEDS);

    // Paso 5: Enviar los datos de color al anillo
    FastLED.show();

    // Paso 6: Cada 10ms el tono se incrementa en 1, valor más pequeño = rotación más rápida, más grande = más lenta
    EVERY_N_MILLISECONDS(10) {
        gHue++;
    }
}
```

### Explicación del código

| Línea clave | Qué hace |
| --- | --- |
| `fill_rainbow(...)` | Función integrada de FastLED, calcula automáticamente colores de gradiente arcoíris y llena el array, sin necesidad de escribir cálculos HSV manualmente |
| `FastLED.show()` | Envía los datos de color del array `leds[]` a través de GPIO40, los LEDs no cambian hasta que se llama esta línea |
| `EVERY_N_MILLISECONDS(10)` | Temporizador no bloqueante integrado en FastLED, equivalente a "ejecutar cada 10ms", no bloquea `loop()` |
| `gHue++` | Cada vez el tono se incrementa en 1, en el siguiente fotograma el tono de inicio de `fill_rainbow` se desplaza, visualmente parece que está rotando |
| `setCorrection(TypicalLEDStrip)` | Corrección automática de temperatura de color del LED, evita que el blanco mezclado se vea verdoso, adecuado para WS2812 |

> Para cambiar la velocidad de rotación: modifica el número en `EVERY_N_MILLISECONDS(10)`, **10 → 5** rota al doble de velocidad, **10 → 20** rota a la mitad.

---

## Solución de problemas comunes

No te asustes, el 90% de los problemas provienen de estos puntos:

**Problema 1: Los LEDs no se encienden al alimentar**

- Verifica que DIN esté conectado a `GPIO40` (el pin definido en `LED_PIN` del código)
- Confirma que VCC esté conectado a **5V** y no a 3.3V
- Verifica que GND esté conectado — sin tierra común, la señal de datos no se puede enviar

**Problema 2: Solo algunos LEDs se encienden, o los colores parpadean aleatoriamente**

- Lo más probable es que la alimentación sea insuficiente. 40 LEDs en blanco completo requieren hasta 2.4A, el puerto USB con 500mA no es suficiente, se recomienda usar una fuente externa de 5V con 2A o más

**Problema 3: Los colores son extraños, al pedir rojo se muestra verde**

- La definición de `COLOR_ORDER` es incorrecta. El WS2812B usa orden GRB, intenta cambiar `GRB` por `RGB` en el código, o viceversa

**Problema 4: Error de compilación `FastLED.h: No such file`**

- La librería no está instalada. Vuelve a abrir el gestor de librerías, confirma que FastLED muestre estado "INSTALLED", luego reinicia Arduino IDE

**Problema 5: La carga funciona pero los LEDs no se mueven**

- Verifica que `NUM_LEDS` coincida con la cantidad real de LEDs de tu anillo, una cantidad incorrecta puede causar visualización anómala

---

## FAQ

**P: ¿Cuál es la diferencia entre WS2812 y WS2812B, se puede usar el mismo código?**
R: El WS2812B es la versión mejorada del WS2812, encapsulado más pequeño, temporización ligeramente ajustada, pero FastLED soporta ambos. Simplemente usa `WS2812B` en `LED_TYPE`, no es necesario modificar el resto del código.

**P: Mi anillo tiene solo 12/16/24 LEDs, ¿cómo modifico el código?**
R: Solo cambia una línea: `#define NUM_LEDS 24`, reemplaza con tu cantidad real de LEDs, el resto no necesita cambios.

**P: ¿Puedo cambiar GPIO40 por otro pin?**
R: Sí, la mayoría de los GPIO del ESP32-S3 se pueden usar (evita los pines 0, 3, 45, 46 relacionados con el arranque). Cambia el número en `#define LED_PIN 40` y conecta el cable al pin correspondiente.

**P: ¿Puedo controlar múltiples anillos simultáneamente?**
R: Sí. Conecta cada anillo a un GPIO independiente, en el código llama `addLeds` una vez más, asignando diferentes segmentos del array `leds[]`.

**P: ¿El anillo necesita alimentación independiente?**
R: Si la cantidad de LEDs es ≤ 8 y el brillo no está al máximo, el pin 5V de la placa puede alimentarlos. Para más de 8 LEDs o si necesitas blanco completo, se recomienda encarecidamente usar una fuente externa de 5V con 2A o más, y conectar la GND de la fuente externa con la GND de la placa.

**P: ¿Qué es `EVERY_N_MILLISECONDS`, por qué no usar `delay()` directamente?**
R: `EVERY_N_MILLISECONDS` es un temporizador no bloqueante integrado en FastLED, `loop()` sigue ejecutándose normalmente, solo ejecuta el código interno cada intervalo especificado. Con `delay()` todo el programa se quedaría bloqueado, imposibilitando procesar simultáneamente botones, puerto serie y otras tareas.

**P: ¿Se puede invertir la dirección de rotación del arcoíris?**
R: Sí, cambia `gHue++` por `gHue--` y la rotación se invierte.

---

## Ideas para expandir

- Añadir botones para cambiar entre efectos (respiración / marquesina / arcoíris fluido al instante)
- Conectar un módulo de micrófono para crear efecto de espectro LED responsivo al audio
- Conectar múltiples anillos en cadena, DIN al DOUT del primero, para lograr un efecto de tira más larga
- Conectar una pantalla OLED para mostrar el nombre del efecto actual y el valor de brillo

---

## Referencias

- [FastLED GitHub oficial](https://github.com/FastLED/FastLED)
- [Hoja de datos WS2812B (WorldSemi oficial)](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf)
- [Manual de referencia técnica ESP32-S3 de Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [Página del producto ESP32-S3 de Espressif](https://www.espressif.com/en/products/socs/esp32-s3)
