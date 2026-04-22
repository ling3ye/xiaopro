---
title: "ESP32-S3 + PCM5102A reproduce MP3｜I2S cableado + código Arduino completo"
boardId: esp32s3
moduleId: audio/pcm5102a
category: esp32
date: 2026-04-22
intro: "Conecta el ESP32-S3 a un módulo PCM5102A DAC vía I2S y reproduce MP3 por Wi-Fi usando la librería ESP32-audioI2S. Menos de 10 cables, menos de 50 líneas de código — ideal para principiantes."
image: "https://img.lingflux.com/2026/04/0c35d50bc32e0bd67636e15a21d5e2ed.png"
---

# ESP32-S3 + PCM5102A para reproducir MP3 — Tutorial completo de cableado I2S y código Arduino

> **Resumen en una línea：** Usa una placa ESP32-S3, conéctala a un módulo PCM5102A DAC por I2S y reproduce MP3 por Wi-Fi con la librería ESP32-audioI2S. Menos de 10 cables, menos de 50 líneas de código — perfecto para principiantes.

---

## TL;DR（Inicio rápido）

¿No quieres leer todo? Aquí tienes lo esencial：

1. Conecta GPIO17（BCK）、GPIO16（LCK）、GPIO15（DIN） del ESP32-S3 a los pines BCK、LCK、DIN del PCM5102A
2. Conecta el pin XMT del PCM5102A a 3.3V（o ponlo en HIGH con GPIO7 en el código）. Los demás pines de control（FMT/SCL/DMP/FLT）todos a GND
3. Instala la librería Arduino：ESP32-audioI2S（by schreibfaul1）
4. Copia el código, cambia el Wi-Fi, flashea y listo

---

**ESP32-S3 + PCM5102A** es una de las combinaciones con mejor relación calidad-precio para proyectos de audio DIY. El ESP32-S3 se encarga de conectar al Wi-Fi, descargar el MP3 y decodificar el flujo de audio, mientras que el PCM5102A convierte la señal digital a audio analógico para auriculares o altavoces. Todo el montaje cuesta apenas unos pocos euros, pero la calidad de sonido supera con creces a otras opciones del mismo rango de precio.

Todo el cableado y código de este tutorial han sido probados y verificados. Sigue los pasos y obtendrás los mismos resultados.

---

## Resultado final

Al encender el ESP32-S3, se conecta automáticamente al Wi-Fi, obtiene un flujo de audio MP3 de la red y lo reproduce a través del PCM5102A. Sin pulsadores, sin pantalla táctil — conecta y escucha.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/CjGkTj7KaQo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Introducción al módulo de audio PCM5102A

### ¿Qué es el PCM5102A？

El **PCM5102A** es un chip DAC（Convertidor Digital a Analógico）estéreo de alto rendimiento fabricado por Texas Instruments.

Tu ESP32-S3 produce **señales de audio digitales**（ceros y unos en formato I2S）, pero los auriculares y altavoces solo entienden **señales de voltaje analógico**（ondas que varían con el tiempo）. El PCM5102A actúa como "intérprete" entre ambos, convirtiendo los datos digitales en audio analógico en tiempo real.

### Especificaciones principales del PCM5102A

| Parámetro | Especificación |
|---|---|
| Interfaz | I2S（compatible nativo con ESP32） |
| Frecuencias de muestreo | 8kHz – 384kHz |
| Rango dinámico | 112dB（detalle fino, piso de ruido extremadamente bajo） |
| Voltaje de operación | 3.3V alimentación simple（perfecto para ESP32） |
| MCLK | PLL integrado, no requiere reloj maestro externo |
| Salida | Controlador diferencial integrado, fuerte anti-interferencia |

**¿Por qué elegir el PCM5102A？** Barato, fácil de usar, funciona con 3.3V, no necesita reloj externo, y su rango dinámico de 112dB es impresionante para audio basado en microcontroladores — es el DAC I2S más popular para proyectos ESP32.

### Función de los pines del PCM5102A

| Pin | Función | Conexión ESP32-S3 | Notas |
|---|---|---|---|
| **3.3V** | Alimentación lógica（3.3V） | ESP32 3.3V | Obligatorio |
| **GND** | Tierra | ESP32 GND | Obligatorio — tierra común es crucial |
| **BCK** | Reloj de bits I2S | GPIO17 | Señal I2S principal |
| **LCK** | Reloj canal izq./der. I2S（LRCK/WS） | GPIO16 | Señal I2S principal |
| **DIN** | Entrada de datos de audio I2S | GPIO15 | Señal I2S principal |
| **XMT** | Control de silencio suave（HIGH = salida normal） | 3.3V o GPIO7 | **Debe estar en HIGH, si no no habrá sonido** |
| **FMT** | Selección de formato de audio（LOW = I2S） | GND | Conectar a tierra |
| **SCL** | Reloj maestro del sistema（PLL interno disponible） | GND | Conectar a tierra |
| **DMP** | Control de des-enfasis | GND | Conectar a tierra |
| **FLT** | Modo de filtro digital | GND | Conectar a tierra |

> **Regla de oro：** Conecta a GND los cuatro pines de control — FMT, SCL, DMP, FLT. Simple, estable y sin errores.

---

## Lista de materiales（BOM）

| Componente | Cantidad | Notas |
|---|---|---|
| Placa ESP32-S3 | × 1 | Cualquier ESP32-S3 DevKit sirve |
| Módulo de audio PCM5102A | × 1 | Disponible online, ~1–2€ |
| Cables puente（Dupont） | Varios | Macho-macho / macho-hembra según la placa |
| Auriculares o altavoz pequeño | × 1 | Auriculares 3.5mm o altavoz pasivo |

---

## Cableado：ESP32-S3 a PCM5102A

El cableado es la parte más propensa a errores de este proyecto. Después de conectar todo, **verifica cada conexión con la tabla** — ahorrarás el 80% del tiempo de troubleshooting.

| ESP32-S3 GPIO | Pin PCM5102A | Descripción |
|---|---|---|
| 3.3V | **3.3V** | Alimentación lógica |
| GND | **GND** | Tierra（¡debe ser común！） |
| **GPIO 17** | **BCK** | Reloj de bits I2S |
| **GPIO 16** | **LCK** | Reloj canal izq./der.（LRCK/WS） |
| **GPIO 15** | **DIN** | Entrada de datos de audio I2S |
| **GPIO 7** | **XMT** | Control de silencio（HIGH en código; o conectar directamente a 3.3V） |
| GND | FMT / SCL / DMP / FLT | Pines de formato y control（todos a GND） |

---

## Librería Arduino necesaria

Busca e instala en el Gestor de Librerías del Arduino IDE：

**ESP32-audioI2S**（por schreibfaul1）

Si no la encuentras, descarga el ZIP desde GitHub e instálala manualmente：[https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

---

## Código Arduino completo（Probado y verificado）

Este código ha sido probado en ESP32-S3 + PCM5102A. Cópialo, actualiza tus credenciales Wi-Fi y súbelo：

```cpp
// Más experimentos en www.lingflux.com

#include <Arduino.h>
#include <WiFi.h>
#include <Audio.h>

// ── Configuración Wi-Fi（cambia a la tuya）─────────────────────
const char* ssid     = "TU_NOMBRE_WIFI";
const char* password = "TU_CONTRASENA_WIFI";

// ── Definición de pines I2S ──────────────────────────────────
#define I2S_BCLK  17   // BCK：reloj de bits
#define I2S_LRCK  16   // LCK：reloj de canal izquierdo/derecho
#define I2S_DOUT  15   // DIN：datos de audio
#define XMT        7   // XMT：control de silencio suave（HIGH = salida normal）

Audio audio;

void setup() {
  Serial.begin(115200);

  // Paso 1：Poner XMT en HIGH para desactivar el silencio del PCM5102A
  pinMode(XMT, OUTPUT);
  digitalWrite(XMT, HIGH);

  // Paso 2：Conectar al Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando al Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n¡Wi-Fi conectado！");

  // Paso 3：Configurar pines I2S y volumen
  audio.setPinout(I2S_BCLK, I2S_LRCK, I2S_DOUT);
  audio.setVolume(18);  // Rango de volumen 0–21, 18 es un valor cómodo

  // Paso 4：Reproducir MP3 en línea
  audio.connecttohost("https://pixabay.com/music/download/id-219731.mp3");
  Serial.println("Iniciando reproducción de audio...");
}

void loop() {
  // Llamar continuamente para mantener la decodificación y reproducción（¡no eliminar！）
  audio.loop();
}

// Callback de depuración：imprime el estado de la librería（útil para troubleshooting）
void audio_info(const char *info) {
  Serial.print("Audio Info: ");
  Serial.println(info);
}
```

**Explicación del código：**

- `audio.setVolume(18)`：El rango de volumen es 0–21. 18 es un valor por defecto cómodo — ajústalo a tu gusto.
- `connecttohost()`：Soporta enlaces directos HTTP/HTTPS de MP3. Si la URL caduca, cámbiala por otra.
- `audio.loop()`：Debe llamarse continuamente en `loop()` — gestiona la decodificación y salida del flujo de audio. No lo elimines ni añadas operaciones bloqueantes que lo ahoguen.

---

## Preguntas frecuentes y troubleshooting（FAQ）

### Q：Después de cablear y encender, no hay sonido. ¿Qué reviso？

Es el problema más común para principiantes. Revisa en este orden — resuelve el 90% de los casos：

**① Verifica la tierra común** El GND del ESP32-S3 y del PCM5102A deben estar conectados con un cable puente. Sin tierra común, la señal no puede completar el circuito y no habrá sonido. Es lo que más olvidan los principiantes.

**② Verifica los pines I2S** Si cualquiera de las tres líneas I2S（BCK, LCK, DIN）está intercambiada o invertida, tendrás silencio total o ruido continuo. Confirma con esta tabla：

| ESP32-S3 GPIO | Pin PCM5102A |
| ------------- | ------------- |
| GPIO 17       | BCK           |
| GPIO 16       | LCK           |
| GPIO 15       | DIN           |

**③ Verifica que XMT esté en HIGH** XMT es el pin de silencio suave del PCM5102A：LOW = silenciado, HIGH = reproducción normal. Si olvidas ponerlo en HIGH, el chip permanecerá silenciado. Solución：añade `digitalWrite(7, HIGH)` al código o conecta XMT directamente a 3.3V.

------

### Q：Durante la reproducción escucho chasquidos o clics. ¿Cuál es la causa？

Es uno de los temas más discutidos en los proyectos de audio con ESP32. Hay varias causas posibles — aquí están ordenadas por probabilidad：

**Causa 1：Subdesbordamiento del buffer I2S（Buffer Underrun）**（más probable）

Cuando el ESP32 está decodificando MP3 o leyendo de la red/SD, picos repentinos de carga de CPU, buffers demasiado pequeños o velocidad de decodificación insuficiente pueden causar interrupciones breves de datos. Cuando el PCM5102A recibe relojes continuos pero la línea de datos va brevemente a cero, produce chasquidos repetibles.

Solución：Aumenta `dma_buf_count`（8–16 recomendado）y `dma_buf_len`（256–1024）en `i2s_config`. Si usas `xTaskCreate`, sube la prioridad de la tarea de audio por encima de Wi-Fi y otras tareas en segundo plano.

**Causa 2：Desajuste de frecuencia de muestreo o profundidad de bits**

Cuando la frecuencia de muestreo del archivo（44.1kHz / 48kHz）no coincide con la configuración I2S del ESP32, o al mezclar 24-bit con 16-bit.

Solución：Convierte todos los archivos de audio a 44.1kHz, 16-bit, estéreo（puedes usar ffmpeg para procesado por lotes）. Configura explícitamente `bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT`.

**Causa 3：Problemas de integridad de señal del hardware**

Cables I2S demasiado largos sin resistencias de amortiguación en serie pueden causar ringing en los bordes de señal, produciendo clics. La actividad Wi-Fi/CPU del ESP32 también puede inyectar ruido a través de la alimentación 3.3V compartida.

Solución：Añade resistencias en serie de 33–100Ω en BCK, LCK, DIN（cerca del ESP32）. Añade condensadores de desacoplo dedicados de 10μF + 0.1μF para el PCM5102A.

**Causa 4：Activación del auto-silencio interno del PCM5102A**

Cuando los datos DIN caen brevemente a cero o nivel bajo, la lógica de silencio inteligente del chip se activa, produciendo un leve pop.

Solución：Añade transiciones de fade-in/fade-out en software al inicio y fin de la reproducción.

**Diagnóstico rápido：** Prueba con un archivo WAV estándar（44.1kHz 16-bit）para saltarte la decodificación MP3. Si los clics persisten en la misma posición, probablemente sea un problema de buffer. Luego añade progresivamente decodificación MP3 y streaming de red para acotar el problema.

------

### Q：La reproducción en línea se entrecorta o se interrumpe. ¿Qué puedo hacer？

El streaming depende de la calidad de la red. Prueba primero con un enlace MP3 más rápido. Si la red no es el problema, cambia a archivos locales desde una tarjeta SD o SPIFFS para descartar la red como causa.

------

### Q：¿Puedo usar otros GPIO para I2S en el ESP32-S3？

Sí. El periférico I2S del ESP32-S3 soporta mapeo de GPIO arbitrario — solo cambia los valores de `#define I2S_BCLK`, `I2S_LRCK`, `I2S_DOUT` en el código.

------

### Q：¿Qué frecuencias de muestreo soporta el PCM5102A？

El PCM5102A soporta 8kHz, 16kHz, 32kHz, 44.1kHz, 48kHz, 96kHz, 192kHz y 384kHz — cubriendo todas las necesidades de reproducción MP3（generalmente 44.1kHz）.

------

### Q：¿Puedo alimentar el PCM5102A con 5V？

Algunos módulos PCM5102A con LDO integrado aceptan 5V y los regulan internamente a 3.3V. Si tu módulo solo tiene pin de 3.3V（sin pin de 5V）, usa 3.3V. Recomendamos alimentar con 3.3V para mayor estabilidad y compatibilidad de niveles lógicos con el ESP32-S3.

------

### Q：¿El uso de CPU es alto al reproducir MP3 con el ESP32-S3？

La librería ESP32-audioI2S aprovecha la arquitectura de doble núcleo del ESP32-S3, ejecutando la decodificación de audio en un núcleo independiente con impacto mínimo en el bucle principal. El uso de CPU típico está entre el 10% y el 30%.

------

### Q：¿Puedo controlar una pantalla TFT mientras reproduzco audio？

Sí. El ESP32-S3 tiene suficiente rendimiento para manejar simultáneamente audio I2S y pantalla TFT por SPI. Solo asegúrate de que `loop()` no contenga operaciones bloqueantes prolongadas — afectarían la frecuencia de llamada de `audio.loop()` y causarían cortes o chasquidos.

------

### Q：¿Cuál es la interfaz de salida del PCM5102A？ ¿Puedo conectar un amplificador？

El módulo PCM5102A generalmente proporciona una salida analógica estéreo de 3.5mm para auriculares o altavoces pasivos. Para conectar un amplificador, usa la interfaz LINE OUT del módulo — su nivel de salida es más adecuado para la entrada del amplificador y ofrece mejor calidad de sonido.

------

### Q：¿En qué se diferencia el ESP32-S3 del ESP32 original para audio I2S？

El ESP32-S3 funciona a 240MHz de doble núcleo（más rápido que el ESP32 original）, lo que hace que la decodificación de MP3 sea más fluida con menos pérdida de frames y chasquidos. También tiene más recursos GPIO, ideal para proyectos que combinan audio, pantalla y red.

---

## Referencias

- **Datasheet del PCM5102A（Texas Instruments）：**
  [https://www.ti.com/lit/ds/symlink/pcm5102a.pdf](https://www.ti.com/lit/ds/symlink/pcm5102a.pdf)

- **Librería ESP32-audioI2S（GitHub, por schreibfaul1）：**
  [https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

- **Documentación técnica ESP32-S3 de Espressif：**
  [https://www.espressif.com/en/products/socs/esp32-s3](https://www.espressif.com/en/products/socs/esp32-s3)

---

*Para más experimentos y tutoriales de ESP32, visita [www.lingflux.com](http://www.lingflux.com)*
