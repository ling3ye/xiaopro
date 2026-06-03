---
title: "ESP32-S3 + GC9A01 + MPU6050 Nivel Digital Completo | SPI + I2C + Arduino"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-03
intro: "Usa ESP32-S3 para controlar una pantalla LCD circular GC9A01 y un sensor de seis ejes MPU6050, mostrando en tiempo real el ángulo de inclinación, el ángulo de balanceo y la temperatura, para crear un nivel digital bonito y práctico."
image: "https://img.lingflux.com/2026/06/64f482f7efccfdc6b16f216a95efc28e.jpg"
---

# ESP32-S3 + GC9A01 + MPU6050 Tutorial Completo de Nivel Digital (SPI + I2C + Arduino)

Dificultad: ⭐⭐☆☆☆ (Apto para principiantes)
Tiempo estimado: 45 minutos
Entorno de pruebas: Arduino IDE 2.3.8 | Arduino_GFX_Library v1.6.5 | MPU6050_light v1.2.1

---

> **Resumen en una frase**: ESP32-S3 controla una pantalla TFT circular GC9A01 + un sensor de seis ejes MPU6050 para crear un nivel de burbuja en tiempo real. El color de la burbuja cambia según el ángulo de inclinación (verde → amarillo → rojo). Incluye tabla de conexiones completa y código Arduino.

---

> **TL;DR (Inicio rápido):**
>
> 1. Conexiones MPU6050: SDA → GPIO 15, SCL → GPIO 16, AD0 → GND (dirección I2C fija 0x68)
> 2. Conexiones GC9A01: CLK → GPIO 12, MOSI → GPIO 11, CS → GPIO 9, DC → GPIO 10, RST → GPIO 18, BL → GPIO 7
> 3. Instalar librerías: `GFX Library for Arduino` (autor moononournation) + `MPU6050_light` (autor rfetick)
> 4. Sube el código, enciende y **mantén el dispositivo en posición horizontal y quieto durante 1 segundo** hasta que desaparezca el mensaje de calibración, luego inclina para ver cómo se mueve la burbuja

---

## Introducción

¿Alguna vez has intentado instalar un estante a mano libre, pensando que "está más o menos nivelado", para darte cuenta después de poner las cosas que todo se desliza hacia un lado?

Yo soy de esos. Como no tenía un nivel tradicional a mano, pensé en revisar la caja de componentes por si había suerte: resultó que la pantalla circular GC9A01 y el MPU6050 estaban acumulando polvo en una esquina, y juntos eran exactamente los ingredientes necesarios para un nivel digital.

Lo mejor es que una pantalla circular es visualmente perfecta para un nivel de burbuja: burbuja centrada = verde, un poco desviada = amarillo, demasiada inclinación = rojo. Se entiende de un vistazo, sin necesidad de instrucciones.

Objetivo de este artículo: **empezar desde cero, conexiones → instalar librerías → subir código → ver la burbuja moverse**. Siguiendo los pasos podrás reproducirlo.

---

## Resultado del experimento

![](https://img.lingflux.com/2026/06/09a4ed83eaa702df1ded539d608c9323.jpg)

La pantalla muestra en tiempo real cuatro elementos:

- **Burbuja central**: se mueve según la inclinación del dispositivo, con indicación de color en tres niveles (verde = nivelado / amarillo = inclinación leve / rojo = inclinación pronunciada)
- **Ángulo de inclinación compuesto** (°): valor combinado de Pitch y Roll, mostrado en grande
- **Valores individuales de Pitch / Roll**: lecturas del ángulo de cabeceo y balanceo
- **Temperatura del chip**: lectura del sensor de temperatura integrado del MPU6050 (es normal que sea más alta que la temperatura ambiente, se explica más adelante)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30s2V_TAoMo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## Descripción de los componentes

### Pantalla TFT circular GC9A01

Imagínatela como **una pantalla de móvil cortada específicamente en forma circular**: la resolución de 240×240 no es la mejor del mercado, pero con el cristal circular colocada sobre la mesa, como cuadrante de un nivel es simplemente perfecta.

| Parámetro | Valor |
| --- | --- |
| Resolución | 240 × 240 px (área de visualización circular) |
| Interfaz | SPI (máx. 80 MHz) |
| Alimentación | 3.3V |
| Profundidad de color | 65K colores (RGB565) |
| Tipo de panel | IPS |

Razón para elegirla: el cuadrante circular se adapta naturalmente al diseño de un nivel de burbuja, y la interfaz SPI de alta velocidad es más que suficiente para animaciones a 20fps.

### Sensor inercial de seis ejes MPU6050

Imagínatelo como **la combinación del giroscopio y el acelerómetro de tu teléfono**: la rotación automática de la pantalla del móvil, el conteo de pasos de WeChat, todo eso usa chips del mismo tipo. El MPU6050 integra un acelerómetro de tres ejes (detecta la dirección de inclinación) y un giroscopio de tres ejes (detecta la velocidad de rotación) en un solo chip de 4mm × 4mm, y además incluye un sensor de temperatura.

| Parámetro | Valor |
| --- | --- |
| Rango del acelerómetro | ±2 / ±4 / ±8 / ±16 g (configurable) |
| Rango del giroscopio | ±250 / ±500 / ±1000 / ±2000 °/s (configurable) |
| Resolución ADC | 16 bits |
| Interfaz | I2C (modo rápido máx. 400 kHz) |
| Alimentación | 3.3V (rango VDD: 2.375 ~ 3.46V) |
| Dirección I2C | 0x68 (AD0 = GND) / 0x69 (AD0 = VCC) |

Razón para elegirlo: precio muy bajo, excelente soporte de librerías, `MPU6050_light` genera directamente ángulos fusionados sin necesidad de escribir tu propio filtro de Kalman.

---

## Lista de materiales (BOM)

| Componente | Modelo / Especificación | Cantidad |
| --- | --- | --- |
| Placa de desarrollo | ESP32-S3 | 1 |
| Pantalla TFT circular | GC9A01 240×240 IPS | 1 |
| Sensor de seis ejes | Módulo MPU6050 | 1 |
| Cables | Cables Dupont | varios |

---

## Descripción de pines de los componentes

### Pines del GC9A01

| Pin | Función |
| --- | --- |
| VCC | Alimentación principal 3.3V |
| GND | Tierra |
| SCL / CLK | Reloj SPI (SCLK) |
| SDA / MOSI | Datos SPI (Master Out Slave In) |
| CS | Selección de chip (activo en bajo) |
| DC | Conmutación datos / comando |
| RST | Reset por hardware (activo en bajo) |
| BL | Control de retroiluminación |

### Pines del MPU6050

| Pin | Función |
| --- | --- |
| VCC | Alimentación principal 3.3V |
| GND | Tierra |
| SDA | Línea de datos I2C |
| SCL | Línea de reloj I2C |
| INT | Salida de interrupción (no conectar en modo polling) |
| AD0 | Selección de dirección I2C (GND = 0x68) |
| XDA / XCL | Interfaz I2C auxiliar (no conectar en este proyecto) |

---

## Esquema de conexiones

> Se recomienda conectar cable por cable según la tabla y marcar cada uno al terminar. Esto ahorra el 80% del tiempo de depuración.

### MPU6050 → ESP32-S3

| Pin MPU6050 | Pin ESP32-S3 | Nota |
| --- | --- | --- |
| VCC | 3.3V | Alimentación principal |
| GND | GND | Tierra común |
| SDA | GPIO 15 | Línea de datos I2C |
| SCL | GPIO 16 | Línea de reloj I2C |
| AD0 | GND | Dirección I2C fija en 0x68 |
| INT / XDA / XCL | No conectar | No necesarios en este proyecto |

**Sobre las resistencias pull-up I2C**: la práctica estándar es conectar una resistencia de pull-up de 4.7kΩ en cada línea SDA y SCL hacia 3.3V, lo cual mejora notablemente la estabilidad frente a interferencias en lecturas a alta velocidad. En este ejemplo se ha omitido este paso, pero si vas a hacer un producto final, se recomienda añadirlas.

### GC9A01 → ESP32-S3

| Pin GC9A01 | Pin ESP32-S3 | Nota |
| --- | --- | --- |
| VCC | 3.3V | Alimentación principal |
| GND | GND | Tierra común |
| SCL / CLK | GPIO 12 | Reloj SPI |
| SDA / MOSI | GPIO 11 | Datos SPI |
| CS | GPIO 9 | Selección de chip |
| DC | GPIO 10 | Conmutación datos / comando |
| RST | GPIO 18 | Reset por hardware |
| BL | GPIO 7 | Retroiluminación (opcional, algunos módulos no tienen este pin. Se controla por nivel alto/bajo en código, o se conecta directamente a 3.3V para luz permanente) |



---

## Librerías necesarias

En el menú de Arduino IDE **Herramientas → Administrar librerías**, busca e instala:

| Nombre de librería | Autor | Versión probada |
| --- | --- | --- |
| GFX Library for Arduino | moononournation | v1.6.5 |
| MPU6050_light | rfetick | v1.2.1 |

Versiones diferentes pueden tener cambios en la API. Se recomienda instalar las versiones indicadas en la tabla. Después de instalar, reinicia Arduino IDE antes de abrir el proyecto.



---

## Código completo

```cpp
/**
 * ESP32-S3 + GC9A01 + MPU6050 Nivel Digital
 * Digital Spirit Level
 *
 * Conexiones:
 *   GC9A01  → SCL=12, SDA=11, CS=9, DC=10, RST=18, BL=7
 *   MPU6050 → SDA=15, SCL=16, AD0=GND (dirección I2C 0x68)
 */

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <MPU6050_light.h>

// ---- Definición de colores (formato RGB565) ----
#define COLOR_BG       0x0863   // Fondo oscuro
#define COLOR_GRID     0x1A69   // Líneas de la cuadrícula de marcas
#define COLOR_GREEN    0x07E6   // Burbuja centrada → verde
#define COLOR_YELLOW   0xFEA0   // Inclinación leve → amarillo
#define COLOR_RED      0xF820   // Inclinación excesiva → rojo
#define COLOR_TEXT     0xC618   // Texto normal
#define COLOR_ACCENT   0xFD20   // Cruz central

// ---- Pines SPI del GC9A01 ----
#define TFT_SCK  12
#define TFT_SDA  11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7

// ---- Pines I2C del MPU6050 (deben coincidir con la tabla de conexiones) ----
#define MPU_SDA  15   // SDA → GPIO 15
#define MPU_SCL  16   // SCL → GPIO 16

// ---- Inicializar controlador de pantalla ----
// Paso 1: crear bus SPI, orden de parámetros: DC, CS, SCK, MOSI, MISO
Arduino_DataBus *bus = new Arduino_ESP32SPI(
    TFT_DC, TFT_CS, TFT_SCK, TFT_SDA,
    GFX_NOT_DEFINED
);
// Paso 2: crear objeto de pantalla GC9A01 (rotación=0, panel IPS=true)
Arduino_GFX *gfx = new Arduino_GC9A01(
    bus, TFT_RST, 0, true
);
// Paso 3: crear Canvas fuera de pantalla 240×240 (doble búfer, evita desgarro de imagen)
Arduino_Canvas *canvas = new Arduino_Canvas(
    240, 240, gfx
);

// ---- MPU6050 ----
MPU6050 mpu(Wire);

// ---- Control de fps ----
const int16_t cx = 120, cy = 120;    // Coordenadas del centro circular de la pantalla (píxeles)
unsigned long lastFrame = 0;
const int frameDelay = 1000 / 20;    // Framerate objetivo: 20fps → 50ms por fotograma

// ---- Declaración adelantada de funciones ----
void drawGrid();
void drawBubble(float pitch, float roll);
void drawReadouts(float pitch, float roll, float temp);

// =============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("=== ESP32-S3 Nivel Digital - Iniciando ===");

    // Paso 1: inicializar pantalla y retroiluminación
    gfx->begin();
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);    // Encender retroiluminación
    canvas->begin();
    Serial.println("[OK] Pantalla inicializada");

    // Paso 2: inicializar I2C, escanear bus (útil para depurar conexiones)
    Wire.begin(MPU_SDA, MPU_SCL);
    Serial.print("[DBG] Escaneando bus I2C SDA=");
    Serial.print(MPU_SDA);
    Serial.print(" SCL=");
    Serial.println(MPU_SCL);

    byte found = 0;
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            Serial.print("  Dispositivo I2C encontrado, dirección: 0x");
            Serial.println(addr, HEX);
            found++;
        }
    }
    if (found == 0) {
        Serial.println("[ERROR] No se encontró ningún dispositivo I2C. Verifica las conexiones.");
    }

    // Paso 3: inicializar MPU6050
    byte status = mpu.begin();
    if (status == 0) {
        Serial.println("[OK] MPU6050 conectado correctamente");
    } else {
        Serial.println("[ERROR] MPU6050 no responde. Verifica conexiones o dirección I2C.");
    }

    // Paso 4: calibración automática del giroscopio (mantener el dispositivo horizontal y quieto durante ~1 segundo)
    Serial.println("[DBG] Calibrando, mantén el dispositivo horizontal y sin movimiento...");
    canvas->fillScreen(COLOR_BG);
    canvas->setTextColor(COLOR_TEXT);
    canvas->setTextSize(1);
    canvas->setCursor(60, 110);
    canvas->print("Calibrating...");
    canvas->setCursor(55, 125);
    canvas->print("Keep device flat");
    canvas->flush();

    delay(1000);
    mpu.calcOffsets();    // Calcular automáticamente el offset del acelerómetro y giroscopio

    Serial.print("[DBG] Offset acelerómetro: ");
    Serial.print(mpu.getAccXoffset());  Serial.print(", ");
    Serial.print(mpu.getAccYoffset());  Serial.print(", ");
    Serial.println(mpu.getAccZoffset());
    Serial.print("[DBG] Offset giroscopio: ");
    Serial.print(mpu.getGyroXoffset()); Serial.print(", ");
    Serial.print(mpu.getGyroYoffset()); Serial.print(", ");
    Serial.println(mpu.getGyroZoffset());
    Serial.println("[OK] Calibración completada, ¡iniciando!");
}

// =============================================================
static int logCnt = 0;    // Contador de limitación de logs de depuración

void loop() {
    unsigned long now = millis();
    if (now - lastFrame < frameDelay) return;    // Limitación de fps
    lastFrame = now;

    // Paso 1: leer sensores
    mpu.update();
    float pitch = mpu.getAngleY();     // Ángulo de cabeceo (inclinación adelante/atrás)
    float roll  = -mpu.getAngleX();    // Ángulo de balanceo (inclinación izquierda/derecha, negativo para alinear con la dirección visual)
    float temp  = mpu.getTemp();       // Temperatura del chip (normal que sea más alta que la ambiente)

    // Log de depuración: imprimir cada 20 fotogramas (~1 segundo), no afecta al framerate
    if (++logCnt >= 20) {
        logCnt = 0;
        Serial.print("[DBG] pitch="); Serial.print(pitch, 2);
        Serial.print(" roll=");       Serial.print(roll,  2);
        Serial.print(" temp=");       Serial.print(temp,  1);
        Serial.print(" | accX=");     Serial.print(mpu.getAccX(), 2);
        Serial.print(" accY=");       Serial.print(mpu.getAccY(), 2);
        Serial.print(" accZ=");       Serial.println(mpu.getAccZ(), 2);
    }

    // Paso 2: limitar valores - cuando supera ±45° la burbuja se queda en el borde, no sale del círculo
    pitch = constrain(pitch, -45.0f, 45.0f);
    roll  = constrain(roll,  -45.0f, 45.0f);

    // Paso 3: dibujar fotograma actual
    canvas->fillScreen(COLOR_BG);        // Limpiar canvas
    drawGrid();                          // Cuadrícula de marcas
    drawBubble(pitch, roll);             // Burbuja
    drawReadouts(pitch, roll, temp);     // Valores numéricos
    canvas->flush();                     // Enviar a pantalla
}

// =============================================================
// Dibujar anillos de marcas de fondo y cruz central
void drawGrid() {
    canvas->drawCircle(cx, cy,  25, COLOR_GRID);
    canvas->drawCircle(cx, cy,  50, COLOR_GRID);
    canvas->drawCircle(cx, cy,  80, COLOR_GRID);
    canvas->drawCircle(cx, cy, 105, COLOR_GRID);
    canvas->drawFastHLine(15, cy,  210, COLOR_GRID);
    canvas->drawFastVLine(cx, 15,  210, COLOR_GRID);
    // Cruz central (usa color de acento, más visible que la cuadrícula)
    canvas->drawFastHLine(cx - 5, cy,     10, COLOR_ACCENT);
    canvas->drawFastVLine(cx,     cy - 5, 10, COLOR_ACCENT);
}

// Mapear la posición de la burbuja según los ángulos pitch/roll y colorear según distancia
void drawBubble(float pitch, float roll) {
    // Mapear ±45° a un desplazamiento de ±90px
    int16_t bx = cx + (int16_t)(roll  / 45.0f * 90.0f);
    int16_t by = cy + (int16_t)(pitch / 45.0f * 90.0f);

    // Calcular distancia en píxeles de la burbuja al centro, determinar nivel de color
    float dist = sqrt((float)((bx - cx) * (bx - cx) + (by - cy) * (by - cy)));
    uint16_t color;
    if      (dist < 10) color = COLOR_GREEN;    // Dentro de ~±5°: nivelado
    else if (dist < 40) color = COLOR_YELLOW;   // Dentro de ~±20°: inclinación leve
    else                color = COLOR_RED;       // Superior a ±20°: inclinación pronunciada

    // Línea del centro a la burbuja + burbuja rellena + borde blanco
    canvas->drawLine(cx, cy, bx, by, COLOR_GRID);
    canvas->fillCircle(bx, by, 8, color);
    canvas->drawCircle(bx, by, 8, 0xFFFF);
}

// Dibujar valores de ángulo, texto de estado y temperatura
void drawReadouts(float pitch, float roll, float temp) {
    float total = sqrt(pitch * pitch + roll * roll);    // Ángulo de inclinación compuesto

    canvas->setTextSize(1);
    canvas->setTextColor(COLOR_TEXT);

    // Título superior
    canvas->setCursor(55, 18);
    canvas->print("DIGITAL LEVEL");

    // Ángulo compuesto: fuente grande, color sincronizado con la burbuja
    canvas->setTextSize(2);
    uint16_t color;
    if      (total < 1)  color = COLOR_GREEN;
    else if (total < 10) color = COLOR_YELLOW;
    else                 color = COLOR_RED;
    canvas->setTextColor(color);
    canvas->setCursor(75, 155);
    canvas->print(total, 1);
    canvas->print((char)247);    // Símbolo ° (ASCII 247)

    // Texto de estado
    canvas->setTextSize(1);
    canvas->setCursor(80, 178);
    if      (total < 1)  canvas->print("  LEVEL");
    else if (total < 10) canvas->print(" TILTED");
    else                 canvas->print("  STEEP");

    // Lecturas individuales de Pitch / Roll
    canvas->setTextColor(COLOR_TEXT);
    canvas->setCursor(20, 195);
    canvas->print("P:"); canvas->print(pitch, 1);
    canvas->print(" R:"); canvas->print(roll,  1);

    // Temperatura (temperatura de unión del chip, normal que sea más alta que la ambiente)
    canvas->setCursor(60, 210);
    canvas->print("T:"); canvas->print(temp, 1);
    canvas->print("C");
}
```

---

## Explicación del código

**Flujo de inicialización (setup)**

En setup se ejecutan cuatro pasos en orden: inicialización de pantalla → escaneo I2C → inicialización del MPU6050 → calibración del giroscopio. La posición en la que coloques el módulo durante la calibración será el punto central de referencia.

La pantalla usa `Arduino_Canvas` para doble búfer fuera de pantalla: todo el dibujado se completa primero en memoria y luego se envía a la pantalla con `flush()`, evitando desgarro o fotogramas intermedios.

El escaneo I2C imprime las direcciones de los dispositivos encontrados en el puerto serie. La primera vez que enciendas, abre el monitor serie para confirmar que el MPU6050 está conectado (normalmente debería imprimir que encontró un dispositivo en 0x68).

`mpu.calcOffsets()` realiza la calibración automática durante aproximadamente 1 segundo. Durante este tiempo es necesario mantener el dispositivo horizontal y quieto. **Cada vez que se enciende se recalibra**, así que colócalo plano en cada inicio y espera a que desaparezca el mensaje en pantalla antes de usarlo.

**Bucle principal (loop)**

El framerate está bloqueado a 20fps. Cada fotograma hace cuatro cosas: leer sensores → limitar valores → dibujar → enviar a pantalla.

`roll = -mpu.getAngleX()` lleva un signo negativo para que la dirección de movimiento de la burbuja en pantalla coincida con la dirección real de inclinación. Sin el negativo, la burbuja se movería en dirección opuesta. Si tu orientación de montaje es diferente, puedes ajustar los signos según necesites.

El color de la burbuja se determina en tres niveles: distancia al centro <10px verde, <40px amarillo, resto rojo, lo que equivale aproximadamente a dentro de ±5°, dentro de ±20°, y superior a ±20°.

---

## Solución de problemas comunes

No te asustes, el 90% de los problemas están en las conexiones y las direcciones:

**Pantalla toda blanca / toda negra, sin mostrar nada**

Primero confirma que VCC esté conectado a 3.3V y no a 5V (el GC9A01 no tolera 5V), y que el pin de retroiluminación BL esté conectado. Luego verifica que los cables CS, DC y RST no estén intercambiados: CS incorrecto hace que la pantalla no responda, RST flotante la deja en estado de reset. Puedes conectar BL directamente a 3.3V para luz permanente; si la pantalla se ilumina en blanco, significa que la pantalla funciona pero la inicialización SPI falló.

**El puerto serie imprime `[ERROR] No se encontró ningún dispositivo I2C`**

Usa un multímetro para verificar que el pin VCC del MPU6050 tiene 3.3V. Confirma que SDA y SCL no estén invertidos (SDA → GPIO 15, SCL → GPIO 16). **AD0 debe estar conectado explícitamente a GND**: si queda flotante, la dirección de algunos módulos es inestable y el bus I2C no responde.

**La burbuja tiembla constantemente y no se estabiliza**

El dispositivo no estaba completamente quieto durante la calibración inicial. Reinicia y colócalo sobre una superficie plana, espera a que desaparezca el mensaje de calibración antes de usarlo. Si la superficie misma vibra (impresora o ventilador cerca), cámbialo de lugar.

**La dirección de Pitch o Roll está invertida**

Según la orientación de montaje de tu placa, ajusta el signo del ángulo correspondiente en el código: cambia `pitch = mpu.getAngleY()` por `pitch = -mpu.getAngleY()`, o ajusta la línea de `roll`, hasta que la dirección sea correcta.

**La temperatura es más de diez grados superior a la ambiente**

Es un comportamiento normal. El MPU6050 mide la temperatura de unión del chip, que suele ser 10~20°C superior a la temperatura ambiente. Es solo de referencia. Si necesitas una temperatura ambiente precisa, conecta un sensor independiente (como el DS18B20).

**La imagen parpadea o muestra desgarro**

El código ya usa doble búfer con `Arduino_Canvas`, normalmente no hay desgarro. Si aún hay problemas, verifica que los cables Dupont del SPI no estén flojos, que no superen los 20cm de longitud, y si es necesario añade un condensador de desacoplo de 100nF cerca de los pines de alimentación.

---

## FAQ

**P: ¿Cuál es la frecuencia de actualización de los ángulos del MPU6050?**
R: `MPU6050_light` lee en modo rápido I2C a 400kHz, con una tasa de muestreo de datos brutos de hasta 1kHz. Este código limita el framerate a 20fps, con una tasa de refresco real de 20Hz. Si necesitas mayor refresco, reduce el valor de `frameDelay`; en pruebas, hasta 40fps es estable (limitado por la velocidad de envío SPI a la pantalla).

**P: ¿Se pueden usar otros GPIO para los pines?**
R: Sí, simplemente modifica los macros `#define` al inicio del código. Para los pines SPI del GC9A01 se recomienda usar el SPI por hardware del ESP32-S3 (GPIO 11/12 son SPI2, con mejor rendimiento); los pines I2C del MPU6050 pueden ser cualquier GPIO, solo asegúrate de que el código y las conexiones coincidan.

**P: ¿Se puede sustituir el GC9A01 por una pantalla cuadrada?**
R: Sí. Reemplaza `Arduino_GC9A01` por la clase de driver correspondiente (por ejemplo, ST7789 usa `Arduino_ST7789`), modifica el ancho, alto y las coordenadas del centro `cx/cy` en `Arduino_Canvas`, y la lógica de dibujado no necesita cambios.

**P: ¿Puede el 3.3V del ESP32-S3 alimentar simultáneamente el GC9A01 y el MPU6050?**
R: Sí. La retroiluminación del GC9A01 consume unos 20mA, el MPU6050 tiene un consumo típico de 3.5mW (~1mA), el total está muy por debajo del límite habitual de 300~500mA del pin 3.3V de la placa.

**P: ¿Se pueden conectar dos MPU6050 en el mismo bus I2C?**
R: Sí. Uno con AD0 a GND (dirección 0x68) y otro con AD0 a VCC (dirección 0x69), compartiendo el mismo par SDA/SCL. En el código declara dos objetos `MPU6050` e inicialízalos con direcciones diferentes.

**P: ¿Hay que recalibrar cada vez que se reinicia?**
R: Sí, este código llama a `mpu.calcOffsets()` en `setup()` cada vez que se enciende. Si tu uso es en instalación fija, puedes guardar los offsets en EEPROM y leerlos en el siguiente inicio, ahorrando el tiempo de espera de calibración.

---

## Ideas para ampliar

- Conectar un botón para cambiar el modo de visualización (nivel / curva de ángulo en tiempo real / termómetro)
- Guardar los valores de calibración en EEPROM para compensar el ángulo de la superficie de instalación fija
- Conectar un zumbador pasivo que emita un sonido cuando esté nivelado
- Cambiar la skin del cuadrante circular para hacer una brújula magnética o un indicador de fuerza G

---

## Referencias

- [MPU-6000 / MPU-6050 Hoja de datos del producto — InvenSense (TDK)](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [GC9A01A Datasheet — Galaxycore](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [MPU6050_light GitHub — rfetick](https://github.com/rfetick/MPU6050_light)
- [ESP32-S3 Manual de referencia técnica — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3 Página del producto — Espressif](https://www.espressif.com/en/products/socs/esp32-s3)
