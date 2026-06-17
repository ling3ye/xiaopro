---
title: "DHT11 + GC9A01 pantalla redonda: termohigrómetro retro de píxeles estilo Game Boy | ESP32-S3 conexión SPI + código Arduino completo"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/dht11
category: esp32
date: 2026-06-18
intro: "Usa un ESP32-S3 para controlar una pantalla redonda GC9A01 240×240 junto con un sensor DHT11, y recrear la clásica paleta de cuatro tonos verde crema del Game Boy DMG, construyendo un termohigrómetro de escritorio retro con píxeles y alarma parpadeante. Incluye tabla de conexiones completa, instalación de librerías en Arduino y código totalmente comentado, ideal para principiantes."
image: "https://img.lingflux.com/2026/06/4d154493c9e833bc839cec1050f749f6.jpg"
---

# DHT11 + GC9A01 pantalla redonda: termohigrómetro retro de píxeles estilo Game Boy (tutorial completo) (ESP32-S3 · conexión SPI · código Arduino)

---

## TL;DR · Resumen en tres minutos

> ¿No tienes tiempo para leerlo todo? Aquí están los pasos clave; quien ya tenga experiencia puede volar con esto:
>
> 1. **Conexiones**: pin de datos del DHT11 → GPIO 47; pantalla redonda GC9A01 por SPI: SCK→GPIO12, MOSI→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 2. **Instala dos librerías**: busca e instala en Arduino IDE `Arduino_GFX_Library` (Moon On Our Nation) y `DHT sensor library` (Adafruit)
> 3. **Pega el código completo del final**, y en Arduino IDE selecciona la placa `ESP32S3 Dev Module`
> 4. **Compila y sube**, espera unos 30 segundos a que termine el flasheo
> 5. **Verifica al encender**: la pantalla redonda se ilumina con fondo verde crema, la mitad superior muestra la temperatura (°C), la inferior la humedad (%), y los valores extremos disparan una alarma parpadeante ✅

---

## Introducción: un termohigrómetro con "alma"

Siendo sincero, he probado muchas formas de mostrar temperatura y humedad: pantallas OLED grandes, pequeños displays de siete segmentos, incluso imprimir por el puerto serie... Cada vez que veo esos números solitarios en la pantalla, siento una especie de vacío inexplicable. No es que no funcionen, es que les falta **alma**.

Hasta que un día saqué el Game Boy de mi infancia, y esa clásica pantalla verde amarillenta me dio una idea: **si al final vamos a mostrar números, ¿por qué no hacerlo con un toque retro y divertido?**

Y así nació este proyecto: usar un ESP32-S3 para controlar una pantalla LCD redonda GC9A01, junto con un sensor de temperatura y humedad DHT11, dibujando a mano la fuente de píxeles y trasladando la icónica paleta de cuatro tonos verdes del Game Boy DMG a la pantalla redonda, para hacer un **termohigrómetro retro de píxeles** que, cuando lo dejas en la mesa, incita a mirarlo un par de veces más.

Sin librería de UI preconstruida, sin frameworks complejos, todo a base de `fillRect()` apilando píxel a píxel los números; este método "torpe" es justo el que más encanto tiene.

**Objetivo de este artículo**: que también quien parte de cero pueda recorrer todo el proceso y, al final, ver la temperatura y humedad en tiempo real en la pantalla redonda GC9A01 con un acabado lo suficientemente llamativo.

---

## Resultado del experimento

![](https://img.lingflux.com/2026/06/755f0087c027a35770edb0fd87a81a35.jpg)

El resultado final en una frase: **pantalla redonda 240×240, fondo verde crema, números grandes de píxeles centrados para temperatura y humedad, transición suave al cambiar de valor, parpadeo de alarma automático cuando se superan los límites, una tasa de unos 30fps y sin ningún tipo de tearing ni parpadeo**.

---

## Descripción de los componentes

Antes de comprar las piezas, conozcamos a los tres protagonistas de hoy.

### ESP32-S3 · la única parte con "cerebro" de este proyecto

El ESP32-S3 es un chip Wi-Fi + Bluetooth dual de Espressif, pero hoy no vamos a usar su capacidad de red, sino sus **GPIO abundantes, su generosa memoria y un bus SPI suficientemente rápido**.

> Analogía: si la pantalla redonda GC9A01 fuera un televisor, el ESP32-S3 sería el descodificador que le inyecta la señal de programa; todo el "contenido" parte de él y la pantalla se limita a "reproducirlo".

Parámetros clave:
- Reloj a 240 MHz (doble núcleo Xtensa LX7)
- 512 KB de SRAM, con PSRAM opcional
- Soporta SPI por hardware, hasta 80 MHz
- Tensión de funcionamiento de 3.3V, GPIO tolerante a 3.3V (⚠️ nunca conectes señales de 5V)

---

### Pantalla redonda GC9A01 · la fuente del estilo retro de píxeles

El GC9A01 es un controlador de LCD IPS redonda con resolución **240×240**, normalmente comercializado como un módulo de pantalla redonda de unas 1.28 pulgadas de diámetro, con interfaz SPI estándar de 4 hilos.

> Analogía: ¿Recuerdas esas esferas de relojes mecánicos antiguos? El GC9A01 es como sustituir esa esfera por una pequeña pantalla en color programable que puede mostrar lo que quieras; redonda, así de elegante.

Parámetros clave:
- Resolución: 240 × 240 píxeles, área visible circular
- Interfaz: SPI de 4 hilos (soporta reloj de hasta 80 MHz)
- Profundidad de color: RGB565 de 16 bits (65536 colores)
- Tensión de funcionamiento: 3.3V (tanto VCC como la lógica van a 3.3V, **¡no conectes 5V!**)
- Retroiluminación: controlada por un pin dedicado (BL), se enciende con nivel alto

---

### DHT11 · el vecinito entrometido

El DHT11 es un sensor digital económico que integra temperatura + humedad en un solo componente; con un único cable de datos te devuelve ambos valores, lo que lo hace cómodísimo de usar.

> Analogía: el DHT11 es como un vecino que vive en tu habitación y te informa en todo momento de "cuántos grados hace y cuánta humedad hay en el aire"; aunque su precisión es modesta, basta, y además es silencioso.

Parámetros clave:
- Rango de temperatura: 0 ~ 50°C, precisión ±2°C
- Rango de humedad: 20% ~ 90% RH, precisión ±5% RH
- Intervalo de muestreo: mínimo 1 segundo (en el código se lee cada 2 segundos)
- Interfaz de datos: protocolo digital de un solo cable (variante 1-Wire)
- Tensión de funcionamiento: 3.3V o 5V (en este proyecto va a 3.3V)

---

## Tabla BOM (lista de materiales)

| Componente | Modelo / especificación | Cantidad | Notas |
| :--- | :--- | :---: | :--- |
| Placa de control | ESP32-S3 Dev Module | 1 | Confirma que lleva puerto USB-C para flashear |
| Pantalla redonda a color | GC9A01 · 1.28 pulg · 240×240 SPI | 1 | Al comprar elige la versión con pin BL |
| Sensor de temperatura y humedad | Módulo DHT11 (versión módulo con resistencia pull-up) | 1 | Recomendable la versión módulo, te ahorras una resistencia externa |
| Cables puente | Cables Dupont (macho-macho / macho-hembra) | varios | Ten a mano de ambos tipos |

---

## Esquema de conexiones

### DHT11 → ESP32-S3

| Pin DHT11 | Pin ESP32-S3 | Notas |
| :--- | :--- | :--- |
| GND | GND | tierra común |
| VCC | 3V3 | alimentación del sensor (3.3V) |
| DAT (DATA) | GPIO 47 | bus de datos |

### Pantalla redonda GC9A01 → ESP32-S3

| Pin GC9A01 | Pin ESP32-S3 | Notas |
| :--- | :--- | :--- |
| VCC | 3.3V | alimentación principal de la pantalla (⚠️ asegúrate de conectar 3.3V y no 5V) |
| GND | GND | tierra común |
| SCL / CLK | GPIO 12 | línea de reloj SPI |
| SDA / MOSI | GPIO 11 | línea de datos SPI |
| CS | GPIO 9 | señal de selección de chip (activo en bajo) |
| DC | GPIO 10 | conmutación dato/comando |
| RST | GPIO 18 | reset por hardware |
| BL | GPIO 7 | control de retroiluminación (puede que tu módulo no tenga este pin; en el código se deja en alto siempre encendida; también puedes conectarla directamente a 3.3V) |

> 💡 **Aviso práctico**: cuando termines de cablear, no enciendas todavía; revisa línea por línea contra la tabla anterior y confirma sobre todo que VCC está conectado a **3.3V y no a 5V** (un GC9A01 conectado a 5V queda prácticamente inservible) y que el pin DAT del DHT11 está en el GPIO correcto. Quien ya haya caído en ese pozo conoce la desesperación de "encender y que la pantalla no vuelva a iluminarse jamás".

---

## Instalación de las librerías necesarias

Abre Arduino IDE, entra en **Herramientas → Administrar bibliotecas**, busca e instala estas dos librerías:

**1. Arduino_GFX_Library**

- Palabra de búsqueda: `Arduino_GFX`
- Autor: `Moon On Our Nation`
- Función: se encarga de controlar la pantalla redonda GC9A01 e incluye la funcionalidad de Canvas con doble búfer (la clave para eliminar el parpadeo)

**2. DHT sensor library**

- Palabra de búsqueda: `DHT sensor library`
- Autor: `Adafruit`
- Si durante la instalación aparece el aviso "¿instalar dependencias?", elige **Install all** (de paso instalas también Adafruit Unified Sensor)

> Tras la instalación conviene reiniciar Arduino IDE para asegurarte de que las librerías se cargan correctamente.

---

## Código completo

Descripción de la estructura del código:
- **Fase de inicialización**: enciende la retroiluminación → inicializa la pantalla → lee por primera vez el DHT11
- **Bucle principal**: lee el sensor cada 2 segundos y renderiza un fotograma cada 33ms (aprox. 30fps)
- **Mecanismo de renderizado**: primero dibuja en un Canvas en memoria y luego hace flush de una sola vez a la pantalla, eliminando el tearing y el parpadeo
- **Fuente de píxeles**: 5×7 para los textos de etiqueta, 5×9 para los números grandes, todo dibujado manualmente celda a celda con `fillRect()`
- **Animación de alarma**: cuando la temperatura supera los 35°C o baja de 5°C, o la humedad supera el 85% o baja del 20%, el número parpadea a intervalos de 400ms

```cpp
/**
 * ╔══════════════════════════════════════════════════╗
 * ║   Termohigrómetro redondo ESP32-S3 · GAME BOY     ║
 * ║   edición nostálgica de píxeles                   ║
 * ║   Hardware: ESP32-S3 + GC9A01(240×240) + DHT11    ║
 * ║   Librerías: Arduino_GFX_Library + DHT(Adafruit)  ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Paleta de color —— los cuatro tonos verdes clásicos del Game Boy DMG:
 *   PAL_BG      #CADC9F  verde amarillento crema (fondo, fuente de la nostalgia)
 *   PAL_LITE    #9BBC0F  verde más claro        (detalles de brillo)
 *   PAL_MID     #8BAC0F  verde brillante        (puntos decorativos)
 *   PAL_DARK    #306230  verde medio            (texto de etiqueta / separadores)
 *   PAL_DARKEST #0F380F  verde tinta            (números principales / marco, máximo contraste)
 *
 * Lógica de alarma (truco clásico de las máquinas monocromo):
 *   Temperatura >35°C o <5°C → el número parpadea a intervalos de 400ms
 *   Humedad >85% o <20%       → igual que arriba
 */

#include <Arduino_GFX_Library.h>
#include <DHT.h>

// ══════════════════════════════════════════
// Paso 1: definición de pines
//   Cambia aquí los números para reasignar pines; no hace falta tocar nada más
// ══════════════════════════════════════════
#define DHTPIN    47      // Pin de datos del DHT11
#define DHTTYPE   DHT11

#define TFT_SCK   12     // Reloj SPI del GC9A01
#define TFT_MOSI  11     // Datos SPI del GC9A01
#define TFT_CS    9      // Selección de chip del GC9A01
#define TFT_DC    10     // Dato/comando del GC9A01
#define TFT_RST   18     // Reset por hardware del GC9A01
#define TFT_BL    7      // Retroiluminación del GC9A01 (HIGH = encendida)

// ══════════════════════════════════════════
// Paso 2: paleta de cuatro tonos verdes del Game Boy (DMG)
//   Formato de color: RGB565 (16 bits)
//   No cambies los colores aquí, si no deja de ser estilo Game Boy :)
// ══════════════════════════════════════════
#define PAL_BG       0xCF69   // Verde amarillento crema —— fondo
#define PAL_LITE     0x9DC2   // Verde más claro        —— brillos (aún poco usado)
#define PAL_MID      0x8D42   // Verde brillante        —— punto parpadeante de la barra superior
#define PAL_DARK     0x3306   // Verde medio            —— etiquetas/separadores
#define PAL_DARKEST  0x11C2   // Verde tinta            —— números principales/marco

// ══════════════════════════════════════════
// Paso 3: constantes de pantalla y escalas de fuente
// ══════════════════════════════════════════
#define CX  120        // Centro X (en el centro exacto de la pantalla)
#define CY  120        // Centro Y (en el centro exacto de la pantalla)

#define BOLD_SCALE  6  // Factor de escala de los números grandes (glifo 5×9 × 6 = 30×54 píxeles)
#define DOT_INSET   1  // Cada celda de píxel se reduce 1px hacia dentro para dejar una rendija del color de fondo y dar sensación de matriz de puntos
#define UNIT_SCALE  2  // Tamaño de fuente de la unidad (°C / %)
#define LBL_SCALE   2  // Tamaño de fuente de la etiqueta (TEMP / HUM)

// ══════════════════════════════════════════
// Paso 4: inicialización de objetos de hardware
// ══════════════════════════════════════════
DHT dht(DHTPIN, DHTTYPE);

// Bus SPI por hardware
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, GFX_NOT_DEFINED);

// Controlador GC9A01 (el último parámetro true = sin rotación, color con fase invertida)
Arduino_GFX *display = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Canvas con doble búfer: primero se dibuja el fotograma completo en memoria y flush() lo envía de golpe a la pantalla
//   Esta es la técnica clave para eliminar el parpadeo, parecido al renderizado off-screen de un motor de juegos
Arduino_GFX *gfx = new Arduino_Canvas(240, 240, display);

// ══════════════════════════════════════════
// Variables de estado globales
// ══════════════════════════════════════════
float g_temp = 0, g_hum = 0;          // Lecturas reales del sensor
float g_dispTemp = 0, g_dispHum = 0;  // Valores mostrados en pantalla (con transición suave para evitar saltos bruscos)
bool  g_hasData = false;              // ¿Se ha obtenido al menos una lectura válida?

// ══════════════════════════════════════════
// Prototipos de funciones (le dicen al compilador "más abajo existen estas funciones")
// ══════════════════════════════════════════
const uint8_t* glyph(char ch);
int16_t  pixelAdvance(char ch, uint8_t scale);
int16_t  pixelTextWidth(const char *s, uint8_t scale);
void     drawPixelText(const char *s, int16_t x, int16_t y,
                       uint8_t scale, uint16_t c);
void     drawCenteredPixel(const char *s, int16_t y,
                           uint8_t scale, uint16_t c);
const uint8_t* boldGlyph(char ch);
int16_t  boldAdvance(char ch, uint8_t scale);
int16_t  boldTextWidth(const char *s, uint8_t scale);
void     drawBoldText(const char *s, int16_t x, int16_t y,
                      uint8_t scale, uint16_t c);
void     drawBezel();
void     drawTopBar(unsigned long t);
void     drawValue(const char *num, const char *unit,
                   int16_t yTop, uint16_t col);
void     drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c);
uint16_t tempColor(unsigned long t);
uint16_t humColor(unsigned long t);
void     drawScene(unsigned long t);

// ══════════════════════════════════════════
// setup() —— se ejecuta una sola vez al encender
// ══════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=============================");
  Serial.println("  Termohigrómetro de píxeles GAME BOY");
  Serial.println("=============================");

  // 1. Encender la retroiluminación
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // 2. Inicializar la pantalla
  if (!gfx->begin()) {
    Serial.println("[ERROR] ¡Inicialización de pantalla fallida! Revisa las conexiones y vuelve a encender.");
    while (true) delay(500);   // Se queda bloqueado aquí para evitar que el resto se ejecute mal
  }
  gfx->fillScreen(PAL_BG);
  gfx->flush();
  Serial.println("[OK] Inicialización de pantalla completada");

  // 3. Inicializar el DHT11 y, tras esperar 2 segundos a que el sensor se estabilice, leer un valor inicial
  dht.begin();
  Serial.println("[OK] DHT11 inicializado, leyendo...");
  delay(2000);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    g_temp = g_dispTemp = t;
    g_hum  = g_dispHum  = h;
    g_hasData = true;
    Serial.printf("[DATA] Lectura inicial T=%.1f°C  H=%.1f%%\n", t, h);
  } else {
    Serial.println("[WARN] Lectura inicial fallida, la pantalla muestra --.- a la espera de la próxima lectura válida");
  }
}

// ══════════════════════════════════════════
// loop() —— lee el sensor cada 2 segundos y renderiza un fotograma cada 33ms (aprox. 30fps)
// ══════════════════════════════════════════
unsigned long lastRead  = 0;
unsigned long lastFrame = 0;

void loop() {
  unsigned long now = millis();

  // Leer el sensor cada 2 segundos (el DHT11 admite como mínimo 1 segundo; 2 segundos es más estable)
  if (now - lastRead >= 2000) {
    lastRead = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      g_temp = t;
      g_hum  = h;
      g_hasData = true;
      Serial.printf("[DATA] T=%.1f°C  H=%.1f%%\n", t, h);
    } else {
      // Si la lectura falla, no se actualiza el valor y se sigue mostrando la última lectura válida
      Serial.println("[WARN] Lectura del DHT11 fallida, se mantiene el valor anterior");
    }
  }

  // El valor mostrado persigue el valor real con un suavizado del 8% (cada fotograma se acerca poco a poco)
  //   Analogía: como la aguja de un dial antiguo, que no salta instantáneamente a la nueva posición
  g_dispTemp += (g_temp - g_dispTemp) * 0.08f;
  g_dispHum  += (g_hum  - g_dispHum)  * 0.08f;

  // Renderizado a unos 30fps (un fotograma cada 33ms)
  if (now - lastFrame >= 33) {
    lastFrame = now;
    drawScene(now);
    gfx->flush();    // Envía de golpe el Canvas en memoria a la pantalla física
  }
}

// ══════════════════════════════════════════
// drawScene() —— renderiza todo el contenido de un fotograma
//   Orden de dibujo: fondo → marco circular → barra superior → zona de temperatura → separador → zona de humedad
// ══════════════════════════════════════════
void drawScene(unsigned long t) {
  // 1. Limpiar la pantalla (fondo verde crema)
  gfx->fillScreen(PAL_BG);

  // 2. Dibujar el marco circular y los puntos decorativos
  drawBezel();

  // 3. Dibujar la barra superior (título + indicador de funcionamiento)
  drawTopBar(t);

  // 4. Zona de temperatura
  char num[8];
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispTemp);
  else           strcpy(num, "--.-");       // Si no hay datos, se muestra un marcador de posición

  drawCenteredPixel("TEMP", 44, LBL_SCALE, PAL_DARK);
  drawValue(num, "*C", 62, tempColor(t));   // '*' se mapea en esta fuente al círculo de grados °

  // 5. Separador de puntos en el medio
  drawDottedH(80, 160, 118, PAL_DARK);

  // 6. Zona de humedad
  if (g_hasData) snprintf(num, sizeof(num), "%.1f", g_dispHum);
  else           strcpy(num, "--.-");

  drawCenteredPixel("HUM", 124, LBL_SCALE, PAL_DARK);
  drawValue(num, "%", 142, humColor(t));
}

// ──────────────────────────────────────────
// Marco circular: contorno verde tinta de doble línea + cuatro pequeños cuadrados decorativos a 45°
// ──────────────────────────────────────────
void drawBezel() {
  gfx->drawCircle(CX, CY, 116, PAL_DARKEST);
  gfx->drawCircle(CX, CY, 115, PAL_DARKEST);

  // Cuatro pequeños cuadrados en las diagonales a 45° (cos45° ≈ 0.707)
  const int r = 104, d = (int)(r * 0.707f);
  gfx->fillRect(CX + d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // Arriba derecha
  gfx->fillRect(CX - d - 1, CY - d - 1, 3, 3, PAL_DARKEST);   // Arriba izquierda
  gfx->fillRect(CX + d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // Abajo derecha
  gfx->fillRect(CX - d - 1, CY + d - 1, 3, 3, PAL_DARKEST);   // Abajo izquierda
}

// ──────────────────────────────────────────
// Barra superior: título "DHT11" centrado + punto indicador parpadeante a la izquierda cada 500ms (indica que el sistema está funcionando)
// ──────────────────────────────────────────
void drawTopBar(unsigned long t) {
  drawCenteredPixel("DHT11", 12, 1, PAL_DARK);

  // Punto parpadeante (encendido/apagado alternados): cambia de color cada 500ms
  bool on = (t / 500) % 2 == 0;
  uint16_t c = on ? PAL_DARKEST : PAL_MID;
  int16_t tw = pixelTextWidth("DHT11", 1);
  int16_t sx = CX - tw / 2;         // Coordenada X del extremo izquierdo del título
  gfx->fillRect(sx - 12, 13, 4, 4, c);
}

// ──────────────────────────────────────────
// Fila de valores: el número grande se centra horizontalmente y la unidad °C/% va como pequeño superíndice en la esquina superior derecha
//   Así el número aparece centrado y la unidad no lo desplaza
// ──────────────────────────────────────────
void drawValue(const char *num, const char *unit,
               int16_t yTop, uint16_t col) {
  int16_t nw = boldTextWidth(num, BOLD_SCALE);
  int16_t sx = CX - nw / 2;                  // X de inicio del número centrado

  drawBoldText(num, sx, yTop, BOLD_SCALE, col);
  // La unidad va pegada a la derecha del número y subida 2px para dar sensación de superíndice
  drawPixelText(unit, sx + nw + 3, yTop + 2, UNIT_SCALE, col);
}

// ──────────────────────────────────────────
// Línea de puntos horizontal (cuadraditos de 2×2, separados cada 5px)
// ──────────────────────────────────────────
void drawDottedH(int16_t x0, int16_t x1, int16_t y, uint16_t c) {
  for (int16_t x = x0; x <= x1; x += 5) {
    gfx->fillRect(x, y, 2, 2, c);
  }
}

// ══════════════════════════════════════════
// Mapeo de color —— normal = verde tinta; extremo = parpadea "apagado" cada 400ms como alarma
// ══════════════════════════════════════════
uint16_t tempColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispTemp > 35.0f || g_dispTemp < 5.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;   // Apagado = mismo color que el fondo
  return PAL_DARKEST;
}

uint16_t humColor(unsigned long t) {
  if (!g_hasData) return PAL_DARK;
  bool extreme = (g_dispHum > 85.0f || g_dispHum < 20.0f);
  if (extreme && (t / 400) % 2 == 0) return PAL_BG;
  return PAL_DARKEST;
}

// ══════════════════════════════════════════
// Fuente de píxeles 5×7 (para etiquetas/unidades)
//   Cada carácter son 7 filas; los 5 bits bajos de cada fila = columnas 0~4 (bit4 = columna más a la izquierda)
//   Caracteres especiales: '*' se mapea al círculo de grados °, '.' se dibuja como un pequeño cuadrado en la línea base
// ══════════════════════════════════════════
const uint8_t EMPTY[7] = {0, 0, 0, 0, 0, 0, 0};

const uint8_t* glyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[7]={0x0E,0x11,0x13,0x15,0x19,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[7]={0x04,0x0C,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[7]={0x0E,0x11,0x01,0x02,0x04,0x08,0x1F}; return g; }
    case '3': { static const uint8_t g[7]={0x1F,0x02,0x04,0x02,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[7]={0x02,0x06,0x0A,0x12,0x1F,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[7]={0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E}; return g; }
    case '6': { static const uint8_t g[7]={0x06,0x08,0x10,0x1E,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[7]={0x1F,0x01,0x02,0x04,0x08,0x08,0x08}; return g; }
    case '8': { static const uint8_t g[7]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[7]={0x0E,0x11,0x11,0x1F,0x01,0x02,0x0C}; return g; }
    case '-': { static const uint8_t g[7]={0x00,0x00,0x00,0x0E,0x00,0x00,0x00}; return g; }
    case '%': { static const uint8_t g[7]={0x18,0x18,0x08,0x04,0x02,0x03,0x03}; return g; }
    case '*': { static const uint8_t g[7]={0x00,0x0E,0x11,0x0E,0x00,0x00,0x00}; return g; } // ° círculo de grados
    case 'C': { static const uint8_t g[7]={0x0E,0x11,0x10,0x10,0x10,0x11,0x0E}; return g; }
    case 'D': { static const uint8_t g[7]={0x1E,0x11,0x11,0x11,0x11,0x11,0x1E}; return g; }
    case 'E': { static const uint8_t g[7]={0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F}; return g; }
    case 'H': { static const uint8_t g[7]={0x11,0x11,0x11,0x1F,0x11,0x11,0x11}; return g; }
    case 'I': { static const uint8_t g[7]={0x0E,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case 'M': { static const uint8_t g[7]={0x11,0x1B,0x15,0x15,0x11,0x11,0x11}; return g; }
    case 'N': { static const uint8_t g[7]={0x11,0x19,0x15,0x13,0x11,0x11,0x11}; return g; }
    case 'O': { static const uint8_t g[7]={0x0E,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case 'P': { static const uint8_t g[7]={0x1E,0x11,0x11,0x1E,0x10,0x10,0x10}; return g; }
    case 'T': { static const uint8_t g[7]={0x1F,0x04,0x04,0x04,0x04,0x04,0x04}; return g; }
    case 'U': { static const uint8_t g[7]={0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    default:  return EMPTY;
  }
}

// Avance de un solo carácter (ancho de píxeles + espacio a la derecha)
int16_t pixelAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale + (scale >> 1) + gap;   // El punto decimal es un poco más estrecho
  return 5 * scale + gap;
}

// Calcula el ancho total en píxeles de un texto
int16_t pixelTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += pixelAdvance(*s, scale);
  return w;
}

// Dibuja celda a celda texto de matriz de puntos 5×7
void drawPixelText(const char *s, int16_t x, int16_t y,
                   uint8_t scale, uint16_t c) {
  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      gfx->fillRect(x, y + 5 * scale, scale, scale, c);   // El punto decimal va en la línea base
      x += 2 * scale + (scale >> 1) + scale;
      continue;
    }
    const uint8_t *g = glyph(ch);
    for (uint8_t r = 0; r < 7; ++r) {
      uint8_t bits = g[r];
      for (uint8_t col = 0; col < 5; ++col) {
        if (bits & (0x10 >> col)) {
          gfx->fillRect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    x += 5 * scale + scale;
  }
}

// Dibuja texto 5×7 centrado horizontalmente
void drawCenteredPixel(const char *s, int16_t y, uint8_t scale, uint16_t c) {
  int16_t w = pixelTextWidth(s, scale);
  drawPixelText(s, CX - w / 2, y, scale, c);
}

// ══════════════════════════════════════════
// Fuente de números grandes de matriz de puntos 5×9 (exclusiva para los valores protagonistas de temperatura y humedad)
//
//   Características de diseño:
//   · Cada celda se reduce DOT_INSET px hacia dentro, dejando una rendija del color de fondo para dar sensación de matriz de puntos LCD
//   · '2' lleva arista en la parte superior + trazo diagonal en escalera celda a celda + base sólida de dos filas
//   · '5' tiene tanto la fila superior como la inferior como barras sólidas completas
//   · '.' no se define en la tabla de glifos; drawBoldText lo dibuja directamente como una sola celda en la línea base
// ══════════════════════════════════════════
const uint8_t* boldGlyph(char ch) {
  switch (ch) {
    case '0': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '1': { static const uint8_t g[9]={0x0C,0x04,0x04,0x04,0x04,0x04,0x04,0x04,0x0E}; return g; }
    case '2': { static const uint8_t g[9]={0x0E,0x11,0x01,0x02,0x04,0x08,0x10,0x1F,0x1F}; return g; }
    case '3': { static const uint8_t g[9]={0x0E,0x11,0x01,0x01,0x06,0x01,0x01,0x11,0x0E}; return g; }
    case '4': { static const uint8_t g[9]={0x02,0x06,0x0A,0x12,0x12,0x1F,0x02,0x02,0x02}; return g; }
    case '5': { static const uint8_t g[9]={0x1F,0x10,0x10,0x1E,0x01,0x01,0x01,0x11,0x1F}; return g; }
    case '6': { static const uint8_t g[9]={0x0E,0x11,0x10,0x10,0x1E,0x11,0x11,0x11,0x0E}; return g; }
    case '7': { static const uint8_t g[9]={0x1F,0x01,0x02,0x02,0x04,0x04,0x08,0x08,0x10}; return g; }
    case '8': { static const uint8_t g[9]={0x0E,0x11,0x11,0x0E,0x11,0x11,0x11,0x11,0x0E}; return g; }
    case '9': { static const uint8_t g[9]={0x0E,0x11,0x11,0x11,0x0F,0x01,0x01,0x11,0x0E}; return g; }
    case '-': { static const uint8_t g[9]={0x00,0x00,0x00,0x00,0x1F,0x00,0x00,0x00,0x00}; return g; }
    default:  return nullptr;
  }
}

// Avance de un solo carácter para los números grandes
int16_t boldAdvance(char ch, uint8_t scale) {
  uint8_t gap = scale;
  if (ch == '.') return 2 * scale;    // El punto decimal = 1 celda de ancho + 1 celda de espacio
  return 5 * scale + gap;
}

// Calcula el ancho total del texto de números grandes
int16_t boldTextWidth(const char *s, uint8_t scale) {
  int16_t w = 0;
  for (; *s; ++s) w += boldAdvance(*s, scale);
  return w;
}

// Dibuja celda a celda números grandes de matriz de puntos 5×9 (cada celda reducida DOT_INSET para que la rendija deje ver el fondo)
void drawBoldText(const char *s, int16_t x, int16_t y,
                  uint8_t scale, uint16_t c) {
  int8_t dot = scale - 2 * DOT_INSET;      // Lado real del cuadrado encendido (tras la reducción)
  if (dot < 1) dot = 1;                    // Al menos 1px, que no desaparezca

  for (; *s; ++s) {
    char ch = *s;
    if (ch == '.') {
      // Punto decimal: en la fila 7 (línea base) se dibuja un solo cuadrado reducido
      gfx->fillRect(x + DOT_INSET, y + 7 * scale + DOT_INSET, dot, dot, c);
      x += 2 * scale;
      continue;
    }
    const uint8_t *g = boldGlyph(ch);
    if (g) {
      for (uint8_t r = 0; r < 9; ++r) {
        uint8_t bits = g[r];
        for (uint8_t col = 0; col < 5; ++col) {
          if (bits & (0x10 >> col)) {
            gfx->fillRect(
              x + col * scale + DOT_INSET,
              y + r   * scale + DOT_INSET,
              dot, dot, c);
          }
        }
      }
    }
    x += 5 * scale + scale;
  }
}
```

---

## Resolución de problemas frecuentes

Tranquilo, el 90% de los problemas vienen de estos puntos; revisándolos uno a uno casi siempre se resuelven:

**La pantalla, una vez encendida, no se ilumina en absoluto (ni la retroiluminación)**

Lo más probable es que el pin BL no esté bien conectado, o que la línea `digitalWrite(TFT_BL, HIGH)` del código no se esté ejecutando. Revisa primero el cable de GPIO7 a BL, y luego prueba a conectar BL directamente a 3.3V (omitiendo el control por código). Si la retroiluminación se enciende pero la pantalla sigue completamente negra, mira el siguiente punto.

**La retroiluminación se enciende pero la pantalla está toda negra, o muestra "nieve"**

Hay un problema con el cableado SPI; revisa sobre todo SCK (GPIO12), MOSI (GPIO11), CS (GPIO9) y DC (GPIO10). DC y CS se confunden con facilidad, y si los inviertes la pantalla se queda negra o se ve completamente corrupta. Además, el último parámetro del controlador GC9A01, `true/false`, controla la inversión de color: si los colores parecen un negativo, cambia `true` por `false` (o viceversa).

**El color general de la pantalla está desplazado, no es verde crema**

Es un problema de orden de bytes en RGB565. Arduino_GFX_Library suele encargarse de ello, pero si los colores están completamente equivocados, prueba a cambiar el último `true` por `false` al construir el `Arduino_GC9A01`.

**El puerto serie sigue mostrando `[WARN] Lectura del DHT11 fallida`**

- Comprueba que el pin DAT esté conectado a GPIO47
- Si usas un DHT11 suelto (no la versión módulo), necesitas una resistencia pull-up de 10kΩ entre DAT y VCC; la versión módulo ya la suele llevar soldada
- No elimines el `delay(2000)` que va después de `dht.begin()`: el DHT11 necesita около 1 segundo para estabilizarse al encender; si tienes prisa obtendrás NaN
- Confirma que VCC va a 3.3V (en este proyecto); si tu DHT11 solo admite 5V, cambia VCC a 5V y, entre DAT y GPIO47, intercala una resistencia como conversión de nivel (o cambia directamente a un módulo DHT11, que suele funcionar a 3.3V)

**El número se actualiza, pero la imagen parpadea o tiene tearing visible**

¿Está funcionando el doble búfer del Canvas? Comprueba que no falte el `gfx->flush()` en el código, y sobre todo **dibuja siempre con el objeto Canvas `gfx->`, no con `display->`**. Además, en el ESP32-S3 hay que elegir bien el modelo de placa (`ESP32S3 Dev Module`), porque si no la velocidad del SPI será incorrecta.

**Error de compilación: `'drawScene' was not declared in this scope`**

Es un problema de orden de declaraciones de funciones; asegúrate de que la lista de prototipos al inicio del código incluye `void drawScene(unsigned long t);`, o mueve la definición de `drawScene` antes de `loop()`.

---

## Preguntas frecuentes

**P: ¿Se pueden cambiar los pines GPIO por otros números?**
R: Sí; basta con modificar los `#define` al inicio del código, sin tocar nada más. El pin DAT del DHT11 puede ir a cualquier GPIO; en cuanto al GC9A01, conviene usar los pines SPI por hardware por defecto del ESP32-S3 (GPIO 11/12) para SCK/MOSI y obtener la máxima velocidad. Otros pines también sirven, pero entonces haría falta configurar un SPI por software.

**P: ¿Puedo sustituir el DHT11 por un DHT22?**
R: Por supuesto. Solo tienes que cambiar la línea 16 del código a `#define DHTTYPE DHT22`; el resto no cambia. El DHT22 tiene mayor precisión (temperatura ±0.5°C, humedad ±2~5% RH) y un intervalo de muestreo mínimo de 2 segundos (en el código ya está fijado en 2 segundos, así que encaja justo).

**P: ¿Cuál es la velocidad de reloj SPI máxima que admite el GC9A01?**
R: La especificación oficial del GC9A01 admite un reloj SPI de hasta 100 MHz; en la práctica, el ESP32-S3 a 80 MHz suele funcionar sin problemas. Arduino_GFX_Library usa por defecto la velocidad máxima del SPI por hardware, sin que haga falta configurarla a mano.

**P: ¿Cuál es la tensión de los GPIO del ESP32-S3? ¿Puedo conectar directamente dispositivos de 5V?**
R: Los GPIO del ESP32-S3 trabajan a 3.3V y **no toleran señales de 5V**; conectar directamente un dispositivo lógico de 5V puede dañar el chip. La pantalla redonda GC9A01 también es un componente de 3.3V. Si alimentas tu DHT11 a 5V, el nivel alto del pin DAT ronda los 4.5V; conviene añadir un divisor de tensión (10kΩ + 20kΩ) o un módulo de conversión de nivel para bajarlo.

**P: ¿Cuál es aproximadamente la tasa de fotogramas y el uso de CPU del código?**
R: El código actual corre a unos 30fps (un fotograma cada 33ms); cada fotograma tarda unos 8~15ms en renderizarse (dependiendo de la velocidad del SPI), con un uso de CPU de aproximadamente el 20~40%. El otro núcleo del ESP32-S3 de doble núcleo queda totalmente libre; si hace falta, puedes mover la lectura del sensor al Core 0 y el renderizado al Core 1 para ganar aún más fluidez.

**P: Si los valores de temperatura y humedad se quedan siempre en `--.-` sin actualizarse, ¿qué hago?**
R: Significa que `g_hasData` sigue siendo `false`, es decir, el DHT11 nunca devolvió una lectura válida. Sigue este orden: ① confirma que DAT está en GPIO47; ② el módulo DHT11 no necesita resistencia pull-up adicional, pero el suelto sí requiere 10kΩ; ③ con el monitor serie (115200 baudios) comprueba si aparece `[DATA]` o `[WARN]`, y a partir de ahí decide si el problema está en el sensor o en el cableado; ④ verifica la tensión de VCC (recomendado 3.3V).

**P: ¿Qué significa el parámetro `true` del código (constructor de GC9A01)?**
R: En `new Arduino_GC9A01(bus, TFT_RST, 0, true)`, el cuarto parámetro controla la inversión de color (diferencia de salida RGB entre paneles IPS y paneles TN). Con `true` el color se emite con normalidad; con `false` aparece una inversión de color parecida a un "efecto negativo". Si tu pantalla se ve con los colores invertidos, cambia `true` por `false`.

---

## Referencias

- [Documentación y ejemplos oficiales de Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Documentación de la librería Adafruit DHT sensor library](https://github.com/adafruit/DHT-sensor-library)
- [Hoja de datos del GC9A01 (PDF oficial)](https://www.waveshare.com/w/upload/5/5e/GC9A01A.pdf)
- [Hoja de datos oficial del DHT11 (fabricante Aosong)](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf)
- [Manual de referencia técnica del ESP32-S3 de Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_cn.pdf)
