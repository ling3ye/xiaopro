---
title: "ESP32-S3 con pantalla circular GC9A01: cardioide en coordenadas polares en 30 minutos"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-05-19
intro: "Usa un ESP32-S3 para controlar una pantalla circular TFT GC9A01 de 1.28 pulgadas y ejecutar una animación de cardioide en coordenadas polares. Incluye cableado completo, código con doble búfer sin parpadeo y guía de resolución de problemas."
image: "https://img.lingflux.com/2026/05/a6a0b0037d4fd0650665e49e7364d65d.jpg"
---

# Tutorial completo: ESP32-S3 con pantalla circular GC9A01 de 1.28 pulgadas (SPI + Arduino IDE)

Dificultad: ⭐⭐☆☆☆ (accesible para principiantes)
Tiempo estimado: 30 minutos
Entorno de pruebas:
Arduino IDE 2.3.8
Arduino_GFX_Library 1.6.5
ESP32 Arduino Core 3.3.8

---

> **Resumen en una frase**: Usa un ESP32-S3 para controlar la pantalla circular GC9A01 de 1.28 pulgadas y ejecutar una animación de cardioide en coordenadas polares, con doble búfer sin parpadeo. Cableado + código completo + resolución de problemas, todo en 30 minutos.

---

## Introducción

Se acerca el 520 (día del "te amo" en la cultura china), y me preguntaba qué regalo podría hacerle a mi novia. No se me ocurría nada.

Después, recordé que en el instituto, cuando estudiábamos las coordenadas polares, había una curva en el libro de texto: la cardioide. Podría hacer una animación en coordenadas polares que dibuje un corazón para expresar mis sentimientos. (El cerebro de un ingeniero imaginando todas las escenas, en su propio mundo...)

Objetivo de este artículo: que partiendo de cero, en 30 minutos uses un ESP32-S3 para controlar esta pantalla circular de 1.28" y ejecutes una animación en coordenadas polares, entendiendo también por qué se hace cada paso. (Espero que cuando se lo regales a esa persona especial, no tengas que arrodillarte sobre el teclado... :P)

(Y ella, al ver el corazoncito, pensando: "¿Qué es esto?!" ... ¡que prepare el durian!)

---

## Resultado del experimento

En la pantalla circular se dibujará en tiempo real una **cardioide (Cardioid)** rotatoria, acompañada de una cuadrícula de coordenadas polares y un punto de seguimiento animado, como un mini osciloscopio trazando una curva matemática. Sin parpadeo alguno, con la tasa de fotogramas bloqueada a 16 fps.

![](https://img.lingflux.com/2026/05/8db744891e99902a8045e4e1242911d1.jpg)

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/fcqwhO5Vr7U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Descripción del componente

### Pantalla TFT circular GC9A01 de 1.28 pulgadas

El GC9A01 es el chip controlador, el panel circular IPS es la pantalla, ambos están soldados en un pequeño módulo. Solo necesitas usar el protocolo SPI para "enviarle" los datos de imagen, y él se encarga de iluminar cada píxel.

| Parámetro | Valor |
| --- | --- |
| Resolución | 240 × 240 píxeles |
| Profundidad de color | 16-bit RGB565, 65536 colores |
| Protocolo de interfaz | SPI de 4 cables, máximo 80MHz |
| Voltaje de trabajo | 3.3V (conexión directa al ESP32-S3, sin conversión de nivel) |
| Tipo de panel | IPS, ángulo de visión cercano a 180° |
| Dimensiones del módulo | Aprox. 36mm de diámetro |

Por qué elegirlo: es económico (5-15 yuanes), fácil de conseguir, su forma circular es ideal para proyectos de tableros de instrumentos y relojes, y la resolución de 240×240 supone una carga de memoria adecuada para el ESP32-S3.

---

## Lista de materiales (BOM)

| Componente | Cantidad | Notas |
| --- | --- | --- |
| Placa de desarrollo ESP32-S3 | 1 | Cualquier versión con pines SPI sirve |
| Módulo de pantalla circular GC9A01 1.28" | 1 | Verificar que el módulo tenga pin BL |
| Cables puente | varios | Hembra-hembra o hembra-macho, según el formato de pines de la placa |

---

## Descripción de pines del componente

| Pin del módulo GC9A01 | Función |
| --- | --- |
| VCC | Polo positivo de alimentación (3.3V) |
| GND | Polo negativo de alimentación |
| SCL / CLK | Señal de reloj SPI |
| SDA / MOSI | Entrada de datos SPI (maestro → esclavo) |
| CS | Selección de chip, la pantalla responde al SPI cuando está en nivel bajo |
| DC | Selección dato/comando: alto = dato, bajo = comando |
| RST | Reset por hardware, se activa en nivel bajo |
| BL | Control de retroiluminación, se enciende con nivel alto |

---

## Esquema de cableado

> Se recomienda conectar cable por cable según la tabla siguiente, marcando cada uno al terminar. Así se ahorra un 80% del tiempo de depuración.

| Pantalla GC9A01 | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (control por código) o conectar directamente a 3.3V |

> **Aviso**: El pin BL (retroiluminación) es fácil de olvidar. Si no se conecta, la pantalla se quedará en negro al encender; no es un problema de código ni de que la pantalla esté defectuosa; revisa esto primero. Algunos módulos no tienen este pin BL expuesto, lo que significa que ya está conectado internamente a 3.3V. Si tu módulo no tiene BL, puedes ignorarlo.

---

## Bibliotecas necesarias

Abre Arduino IDE → Herramientas → Administrar bibliotecas, busca e instala:

| Biblioteca | Autor | Versión probada |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | 1.6.5 |

> No instales TFT_eSPI: con ESP32 Core 3.x, las definiciones de macros y la inicialización DMA de TFT_eSPI entran en conflicto con la nueva versión de ESP32, causando errores de compilación o cuelgues al encender. Arduino_GFX_Library es compatible desde el inicio con C++ moderno y canvas en memoria, siendo la opción más sencilla para proyectos con pantalla en la actualidad. (Fecha de corte: 2026-05-18)

---

## Código completo

```cpp
/**
 * ESP32-S3 + GC9A01 pantalla circular de 1.28" — demo de animación en coordenadas polares
 * Doble búfer sin parpadeo, bloqueado a 16fps
 * Cableado: SCL=GPIO12, SDA=GPIO11, CS=GPIO9, DC=GPIO10, RST=GPIO18, BL=GPIO7
 */

#include <Arduino_GFX_Library.h>

// ---------------------------------------------------
// Paso 1: añadir manualmente las macros de color
// La nueva versión de Arduino_GFX eliminó la exportación global de BLACK / WHITE, etc.
// Sin este bloque, la compilación dará error "BLACK was not declared in this scope"
// ---------------------------------------------------
#ifndef BLACK
#define BLACK       0x0000
#endif
#ifndef WHITE
#define WHITE       0xFFFF
#endif
#ifndef RED
#define RED         0xF800
#endif
#ifndef GREEN
#define GREEN       0x07E0
#endif
#ifndef BLUE
#define BLUE        0x001F
#endif
#ifndef YELLOW
#define YELLOW      0xFFE0
#endif
#ifndef CYAN
#define CYAN        0x07FF
#endif
#ifndef MAGENTA
#define MAGENTA     0xF81F
#endif
#ifndef GRAY
#define GRAY        0x8410
#endif
#ifndef DARKGRAY
#define DARKGRAY    0x2104
#endif

// ---------------------------------------------------
// Paso 2: definir el esquema de colores (fondo azul oscuro + color principal rojo anaranjado)
// ---------------------------------------------------
#define COLOR_BG        0x1123   // fondo azul oscuro casi negro
#define COLOR_GRID      0x19E5   // cuadrícula azul grisáceo
#define COLOR_PRIMARY   0xE73C   // curva rojo anaranjado
#define COLOR_ACCENT    0xFDE0   // radio dorado
#define COLOR_TEXT      0xF7BE   // texto gris claro

// ---------------------------------------------------
// Paso 3: definir los pines físicos
// ---------------------------------------------------
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---------------------------------------------------
// Paso 4: instanciar el bus SPI y el controlador de pantalla
// ---------------------------------------------------
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA, GFX_NOT_DEFINED /* MISO no necesario */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST,
    0,    /* ángulo de rotación */
    true  /* pantalla IPS */
);

// ---------------------------------------------------
// Paso 5: asignar el canvas de doble búfer (240×240×2 Bytes = 115.2KB SRAM)
// Todos los trazados se escriben primero en memoria, y al completarse
// se envían de una vez a la pantalla, eliminando por completo el parpadeo
// ---------------------------------------------------
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

// ---------------------------------------------------
// Variables de animación
// ---------------------------------------------------
float angle = 0.0f;
const float  a_scale    = 50.0f;  // coeficiente de escala de la cardioide (unidad: píxeles)
const int16_t cx        = 120;    // centro X
const int16_t cy        = 120;    // centro Y

unsigned long lastFrameTime = 0;
const int frameDelay = 1000 / 16; // bloquear a 16fps

// Interruptores de funcionalidad (cambiar a false para desactivar cada capa)
const bool showGrid     = true;
const bool showCurve    = true;
const bool showRadius   = true;
const bool showTelemetry= true;

void setup() {
    Serial.begin(115200);

    // Inicializar el controlador de pantalla
    gfx->begin();

    // Encender la retroiluminación (olvidar este paso = pantalla en negro)
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);

    // Inicializar el canvas de doble búfer
    if (!canvas->begin()) {
        Serial.println("¡Error al asignar memoria del Canvas! Se escribirá directamente en pantalla (habrá parpadeo)");
    } else {
        Serial.println("Doble búfer iniciado correctamente, renderizado sin parpadeo listo.");
    }
}

void loop() {
    // Limitador de tasa de fotogramas
    unsigned long now = millis();
    if (now - lastFrameTime < frameDelay) return;
    lastFrameTime = now;

    // Limpiar fotograma
    canvas->fillScreen(COLOR_BG);

    // --- Capa 1: cuadrícula de coordenadas polares ---
    if (showGrid) {
        canvas->drawCircle(cx, cy,  30, COLOR_GRID);
        canvas->drawCircle(cx, cy,  60, COLOR_GRID);
        canvas->drawCircle(cx, cy,  90, COLOR_GRID);
        canvas->drawCircle(cx, cy, 110, COLOR_GRID);
        canvas->drawFastHLine(10, cy, 220, COLOR_GRID);
        canvas->drawFastVLine(cx, 10, 220, COLOR_GRID);
    }

    // --- Capa 2: traza completa de la cardioide r = a*(1 - cos θ) ---
    if (showCurve) {
        int16_t lx = 0, ly = 0;
        for (int16_t deg = 0; deg <= 360; deg += 3) {
            float rad = deg * DEG_TO_RAD;
            float r   = a_scale * (1.0f - cos(rad));
            int16_t x = cx + (int16_t)(r * cos(rad));
            int16_t y = cy - (int16_t)(r * sin(rad)); // el eje Y de la pantalla apunta hacia abajo, se invierte
            if (deg > 0) canvas->drawLine(lx, ly, x, y, COLOR_PRIMARY);
            lx = x; ly = y;
        }
    }

    // --- Capa 3: punto de seguimiento actual y radio polar ---
    float rad_a  = angle * DEG_TO_RAD;
    float active_r = a_scale * (1.0f - cos(rad_a));
    int16_t px = cx + (int16_t)(active_r * cos(rad_a));
    int16_t py = cy - (int16_t)(active_r * sin(rad_a));

    if (showRadius) canvas->drawLine(cx, cy, px, py, COLOR_ACCENT);
    canvas->fillCircle(px, py, 5, COLOR_TEXT);

    // --- Capa 4: visualización de valores ---
    if (showTelemetry) {
        canvas->setTextColor(COLOR_TEXT);
        canvas->setTextSize(1);
        canvas->setCursor(50, 25);
        canvas->print("Polar Coordinates");
        canvas->setCursor(28, 185);
        canvas->print("r = a * (1 - cos(theta))");
        canvas->setCursor(40, 200);
        canvas->print("th:"); canvas->print((int)angle);
        canvas->print("  r:"); canvas->print((int)active_r);
        canvas->print("px");
    }

    // Incremento de ángulo (+6° por fotograma, una vuelta completa en aprox. 1 segundo)
    angle += 6.0f;
    if (angle >= 360.0f) angle -= 360.0f;

    // Enviar el canvas en memoria a la pantalla física de una vez
    canvas->flush();
}
```

### Explicación del código

**Mecanismo de doble búfer**: Todas las operaciones de dibujo ocurren en el `canvas` (memoria), y solo la última línea `canvas->flush()` envía realmente el fotograma completo a la pantalla. Comparado con borrar la pizarra antes de escribir, esto es como escribir en un borrador y pegarlo completo; la pantalla nunca ve un estado "a medio dibujar", eliminando por completo el parpadeo.

**Ecuación de la cardioide** `r = a * (1 - cos θ)`: Esta es una ecuación en coordenadas polares, donde `r` es la distancia desde el centro y `θ` es el ángulo. Convirtiendo los valores (r, θ) calculados para cada θ en coordenadas XY de pantalla y uniendo los puntos, se obtiene la curva cardíaca.

**Bloqueo de tasa de fotogramas**: `frameDelay = 1000 / 16` controla el intervalo mínimo entre fotogramas en aproximadamente 62ms. Para acelerar la animación, aumenta el valor del incremento `+= 6.0f`; para más fluidez, puedes subir targetFPS a 30, pero consumirá más CPU.

**Partición de grabación**: En Arduino IDE → Herramientas → Partition Scheme, selecciona **Huge APP (3MB No OTA)**. Un Canvas de 115KB necesita suficiente SRAM; con la partición por defecto a veces se agota el espacio del heap.

---

## Resolución de problemas comunes

No te asustes, el 90% de los problemas provienen de estos puntos:

**Pantalla en negro al encender, sin errores en el puerto serie**
Primero revisa el pin BL; la retroiluminación sin nivel alto es la causa más común. Confirma que GPIO7 ha ejecutado `digitalWrite(TFT_BL, HIGH)`, o conecta directamente el cable BL a 3.3V para descartar problemas de código.

**La pantalla se enciende pero muestra todo blanco/rojo/ruido**
El orden de los cables SPI está incorrecto. CS y DC se confunden fácilmente (ambos son líneas de control y se parecen). Verifica contra las macros del código (CS=GPIO9, DC=GPIO10), no confíes solo en la tabla de cableado; el código es la referencia definitiva.

**Error de compilación: `BLACK was not declared in this scope`**
Estás usando Arduino_GFX versión >= 1.3, la nueva versión eliminó la exportación global de macros de color. El bloque `#ifndef BLACK` al inicio del código debe conservarse, no se puede eliminar.

**Error al asignar memoria del Canvas, el puerto serie indica escritura directa en pantalla**
Significa que no hay 115KB de SRAM disponibles. Verifica: (1) si la partición seleccionada es Huge APP; (2) si hay otros arrays grandes ocupando memoria; (3) en casos excepcionales, la PSRAM de la placa no está habilitada (necesita activarse en la configuración de Board).

**Animación entrecortada, no parece 16fps**
¿Has añadido un `delay()` en `loop()`? Si es así, elimínalo; la limitación de fotogramas ya está implementada con `millis()`, y combinar ambos duplica el intervalo entre fotogramas.

---

## FAQ

**P: ¿Se pueden cambiar los pines CS y DC por otros GPIO?**
R: Sí, modifica los `#define TFT_CS` y `#define TFT_DC` al inicio del código; cualquier GPIO libre sirve. Para SCL y SDA se recomienda usar los pines de SPI por hardware (SPI2 por defecto del ESP32-S3: SCLK=12, MOSI=11) para obtener la máxima velocidad; si usas otros pines, pasará a SPI por software con una caída de velocidad notable.

**P: ¿Qué tasas de refresco soporta la pantalla?**
R: La interfaz SPI del GC9A01 tiene un reloj máximo teórico de 80MHz, lo que corresponde a un límite superior de aproximadamente 40fps para la pantalla completa de 240×240. Este código bloquea a 16fps para reservar margen de CPU en módulos ESP32-S3 de gama media-baja. Si tu placa funciona a 240MHz, cambiar `targetFPS` a 30-40 no será problema.

**P: ¿Se pueden controlar dos pantallas simultáneamente?**
R: Sí, ambas pantallas comparten SCL/SDA, asigna un pin CS independiente a cada una, instancia dos objetos `Arduino_GC9A01` por separado y alterna el CS para activar la pantalla correspondiente. Nota sobre memoria: dos Canvas requieren 230KB de SRAM en total, es imprescindible activar PSRAM.

**P: ¿Alimentación con 3.3V o 5V?**
R: El módulo GC9A01 funciona a 3.3V; conéctalo directamente al pin de 3.3V del ESP32-S3. Nunca conectes a 5V, ya que dañarías el chip controlador.

**P: ¿Cómo se muestran caracteres en chino u otros idiomas?**
R: Arduino_GFX_Library solo incluye fuentes ASCII por defecto; para mostrar chino se necesitan archivos de fuentes adicionales (como la biblioteca U8g2) o usar el framework LVGL. Las fuentes aumentan significativamente el uso de Flash; se recomienda usar LVGL + SPIFFS, del que podremos hacer un artículo aparte cuando haya tiempo.

**P: La pantalla GC9A01 no tiene capacidad de salida de audio, solo de visualización. ¿Qué relación tiene con los proyectos de audio I2S?**
R: Ninguna. El GC9A01 es puramente una pantalla de visualización; su interfaz SPI solo transmite datos de imagen. Si quieres reproducir audio simultáneamente, necesitas un módulo DAC I2S adicional (como el MAX98357A); ambos funcionan de forma completamente independiente y sus pines no interfieren entre sí.

---

## Ideas para ampliar

- Convertirlo en un **reloj analógico**: dibujar marcas y agujas, con un módulo RTC DS3231 para leer la hora en tiempo real
- Añadir un **modo de rosa polar**: cambiar `showTangent` a false, cambiar la curva a `r = a * sin(k * θ)`, con diferentes valores del parámetro k se obtienen distintas cantidades de pétalos
- Conectar **botones para cambiar** el tema de animación: tres botones para alternar entre cardioide / rosa polar / figuras de Lissajous
- Combinar con **Wi-Fi del ESP32**: consultar una API de clima y mostrar temperatura y humedad en la pantalla circular como panel de instrumentos
- Comprar dos pantallas circulares:

---

## Referencias

- [Hoja de datos del chip controlador GC9A01 (Galaxycore oficial)](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Página de GitHub de Arduino_GFX_Library (moononournation)](https://github.com/moononournation/Arduino_GFX)
- [Página del producto ESP32-S3 de Espressif](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
- [Notas de la versión ESP32 Arduino Core 3.x](https://github.com/espressif/arduino-esp32/releases)
