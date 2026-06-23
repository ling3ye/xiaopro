---
title: "Tutorial completo: ESP32-S3 con pantalla circular GC9A01 + BMP180 para un registrador de altitud de montaña DIY (SPI + I2C + Arduino)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/bmp180
category: esp32
date: 2026-06-23
intro: "Conduce una pantalla circular a color GC9A01 de 1.28 pulgadas con un ESP32-S3, junto con un sensor de presión BMP180, para construir un registrador de montañismo que muestra un fondo dinámico de montañas, altitud en tiempo real, ascenso acumulado y presión atmosférica. Incluye el código completo de Arduino y el esquema de conexiones."
image: "https://img.lingflux.com/2026/06/cc83e55f42460646d2fd372496989222.jpg"
---


> Dificultad: ⭐⭐⭐☆☆ (si ya has soldado unos cuantos cables Dupont, lo tendrás dominado)
> Tiempo estimado: 45 minutos
> Entorno de pruebas: Arduino IDE 2.3.2 · Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · ESP32 Arduino Core 3.0.x

---

> **TL;DR (puesta en marcha rápida):**
> 1. **Conectar la pantalla**: GC9A01 → CS/GPIO9, DC/GPIO10, SCK/GPIO12, MOSI/GPIO11, RST/GPIO18, BL/GPIO7
> 2. **Conectar el sensor**: BMP180 → SDA/GPIO13, SCL/GPIO14
> 3. **El backlight hay que forzarlo a HIGH**: añade `digitalWrite(TFT_BL, HIGH)` en `setup()`; sin esta línea, la pantalla se queda siempre negra
> 4. **Instalar dos librerías**: Arduino_GFX_Library (autor moononournation) + Adafruit BMP085 Library
> 5. **Subir el código directamente**, abrir el monitor serie (115200) y, cuando veas `初始化完成，进入主循环` (inicialización completa, entrando en el bucle principal), ¡lo has logrado!

---

## Introducción

Me encanta el senderismo, pero últimamente solo puedo subir un rato por las montañas de Baiyun. Llevo la mochila cargada con una batería externa, el móvil y la crema solar, pero no tengo nada que me diga en tiempo real "ya has subido X metros". Las apps del móvil necesitan conexión, la señal GPS va a tirones y, cada vez que sacas el teléfono, tienes esa sensación rara de "estoy aquí solo para hacerme la foto". Así que me decidí a construirme un registrador de altitud para montaña.

Al volver, rebuscando en la caja de componentes, encontré una pantalla circular GC9A01 acumulando polvo: ese contorno redondo se parece muchísimo a la esfera de un reloj de montaña. Junto con un sensor de presión BMP180 y un ESP32-S3, solo tres piezas por menos de 50 yuanes, y el resultado me sorprendió mucho más de lo que esperaba.

El objetivo de este artículo: desde cero, conectar estas tres piezas, subir el código y obtener un registrador de montaña que muestra en tiempo real la altitud, el ascenso/descenso acumulado y la presión atmosférica, con un fondo de montañas que cambia de color dinámicamente según la altitud. Siguiendo los pasos lo puedes replicar.

---

## Resultado del experimento

El resultado final: la pantalla circular GC9A01 muestra en tiempo real la altitud actual (m), el ascenso acumulado (flecha naranja hacia arriba), el descenso acumulado (flecha azul hacia abajo) y la presión atmosférica instantánea. El fondo de la pantalla es una escena de montañas que cambia de color según la proporción de altitud: a baja altura predomina el marrón cálido, a gran altura deriva hacia un azul profundo, y la línea de nieve de las cimas va descendiendo a medida que subes. En el borde de la pantalla hay un anillo dorado de progreso que sigue la altitud; manteniendo pulsado el botón BOOT durante 2 segundos se reinicia el cálculo.

![](https://img.lingflux.com/2026/06/9cedc6308f5ac8b32bb260be186b9298.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/BbqvEXOn6Xo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Descripción de los componentes

> El ESP32-S3 no necesita presentación; si estás leyendo esto es porque ya has usado un ESP32. Aquí solo hablamos de los otros dos protagonistas.

### Sensor de presión BMP180

El BMP180 es un sensor de presión MEMS que mide la presión atmosférica y, a partir de ella, estima la altitud. En este proyecto se encarga de tomar una muestra de presión y altitud cada segundo, como fuente de datos de todo el panel.

Para entenderlo de forma sencilla: es como una "mini estación meteorológica" de bolsillo. Midiendo la presión atmosférica deduce a qué altura te encuentras, con el mismo principio por el que te tapan los oídos al despegar o aterrizar un avión: a menor presión, mayor altitud. Como la temperatura afecta a la lectura de presión, lleva integrado un sensor de temperatura que ayuda a corregirla y a afinar la altitud.

| Parámetro | Valor |
| --- | --- |
| Tensión de alimentación | 1.8 V ~ 3.6 V (conéctalo a 3.3 V) |
| Protocolo de comunicación | I2C (dirección fija 0x77) |
| Rango de presión | 300 ~ 1100 hPa |
| Precisión de altitud | modo estándar ±1 m, modo de alta precisión ±0.5 m |
| Consumo | 0.1 µA en reposo; 650 µA pico (durante la conversión); 3–32 µA de media a 1 Hz (según modo) |

Por qué elegirlo: el módulo es barato, la librería de Adafruit está muy bien soportada y la precisión sobra para registrar una ruta de senderismo. Si necesitas más precisión o el dato de humedad, puedes dar el salto a un BMP280 o BME280, pero eso es tema para otro artículo.

### Pantalla TFT circular GC9A01

GC9A01 es el controlador (IC) de una pantalla TFT circular a color de 1.28 pulgadas. Recibe los datos por SPI y gestiona un panel circular de 240×240 píxeles. En este proyecto se encarga de renderizar el fondo dinámico de montañas y los datos de altitud en tiempo real.

Para entenderlo de forma sencilla: imagina la esfera circular de un smartwatch; esto es exactamente eso. Se comunica por SPI, tiene una tasa de refresco rápida y, al ser redonda, encaja perfectamente para un panel de instrumentos. Combinado con el doble buffer Canvas de Arduino_GFX_Library, la animación es fluida y sin parpadeos.

| Parámetro | Valor |
| --- | --- |
| Tamaño de pantalla | 1.28 pulgadas (circular) |
| Resolución | 240 × 240 píxeles |
| IC controlador | GC9A01 |
| Interfaz | SPI (hasta 80 MHz) |
| Tensión de alimentación | 3.3 V |
| Profundidad de color | 16 bits RGB565 (65536 colores) |

Por qué elegirla: la pantalla circular casa a la perfección con el tema de "reloj de montaña"; el diámetro es justo para meter la cifra grande de altitud, los indicadores de ascenso/descenso y el anillo de progreso sin que quede aglomerado.

---

## Lista de materiales (BOM)

| Componente | Modelo / especificación | Cantidad |
| --- | --- | --- |
| Placa controladora | ESP32-S3 (recomendada la versión con USB-C) | 1 |
| Sensor de presión | Módulo BMP180 (módulo con resistencias de pull-up I2C) | 1 |
| Pantalla circular | GC9A01 1.28" TFT, 240×240 | 1 |
| Cables | Cables Dupont (hembra-hembra) | Varios |
| Alimentación | Cable de datos USB-C + ordenador / cargador | 1 |

---

## Descripción de pines de los componentes

### Pines del GC9A01

| Pin de la pantalla | Función |
| --- | --- |
| VCC | Polo positivo de alimentación, a 3.3 V |
| GND | Polo negativo de alimentación |
| SCL / CLK | Línea de reloj SPI |
| SDA / MOSI | Línea de datos SPI (maestro → esclavo) |
| CS | Chip select (activo a nivel bajo) |
| DC | Selección dato / comando |
| RST | Reset (disparado a nivel bajo) |
| BL | Control de backlight, **se enciende a nivel alto** |

### Pines del BMP180

| Pin del sensor | Función |
| --- | --- |
| VCC | Polo positivo de alimentación, a 3.3 V |
| GND | Polo negativo de alimentación |
| SCL | Línea de reloj I2C |
| SDA | Línea de datos I2C |

---

## Esquema de conexiones

### GC9A01 → ESP32-S3

| Pin GC9A01 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL (backlight) | GPIO 7 |

### BMP180 → ESP32-S3

| Pin BMP180 | ESP32-S3 GPIO |
| --- | --- |
| VCC | 3.3 V |
| GND | GND |
| SCL | GPIO 14 |
| SDA | GPIO 13 |



> **Recomendación: revisa cada cable uno a uno una vez terminado el cableado, te ahorrarás el 80% del tiempo de depuración.** Hay dos puntos especialmente propensos a errores comunes: primero, no basta con conectar BL (backlight) a GPIO7, en el código también hay que acompañarlo con `digitalWrite(TFT_BL, HIGH)` para que se encienda; segundo, los pines SCL/SDA del GC9A01 van por **protocolo SPI**, mientras que los del BMP180 van por **protocolo I2C**. Aunque el nombre es el mismo, son dos buses totalmente independientes y los pines jamás deben mezclarse.

---

## Librerías necesarias

Abre Arduino IDE → Herramientas → Administrar bibliotecas, busca e instala las tres siguientes:

| Librería | Autor | Uso |
| --- | --- | --- |
| Arduino_GFX_Library | moononournation | Driver de la pantalla GC9A01 + render con doble buffer Canvas |
| Adafruit BMP085 Library | Adafruit | Driver del sensor de presión BMP180 / BMP085 |
| Adafruit Unified Sensor | Adafruit | Dependencia de la librería anterior, instálala también |

> **Versiones probadas con éxito**: Arduino_GFX_Library v1.4.9 · Adafruit BMP085 Library v1.2.4 · Arduino IDE 2.3.2 · ESP32 Arduino Core 3.0.x
> Si usas un ESP32 Core antiguo (serie 1.x), parte de la inicialización de SPI difiere ligeramente; lo recomendable es actualizar directamente a 3.x y ahorrarte dolores de cabeza.

---

## Código completo

```cpp
/*
  ============================================================
  Registrador de altitud de montaña (Mountain Altitude Logger)
  ============================================================
  Hardware: ESP32-S3 + pantalla circular GC9A01 (240x240) + sensor de presión BMP180
  ============================================================
*/

#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>

// ===================== Paso 1: definición de pines y parámetros =====================
#define TFT_CS    9    // chip select de la pantalla
#define TFT_DC    10   // selección dato/comando
#define TFT_SCK   12   // reloj SPI
#define TFT_MOSI  11   // datos SPI (maestro → esclavo)
#define TFT_RST   18   // reset de la pantalla
#define TFT_BL    7    // control de backlight (se enciende a nivel alto, ¡hay que forzarlo HIGH!)
#define TFT_MISO  -1   // no hace falta MISO (solo se escribe en la pantalla, no se lee)

#define BMP_SDA   13   // línea de datos I2C del BMP180
#define BMP_SCL   14   // línea de reloj I2C del BMP180

#define BTN_PIN   0    // botón BOOT integrado, pulsación larga de 2 s para resetear/ajustar
#define CALIBRATION_HOLD_MS 2000  // umbral de pulsación larga (milisegundos)

#define FILTER_SIZE 5     // ventana del filtro de media móvil (promedia las últimas 5 muestras)
#define DEAD_ZONE   0.3f  // zona muerta del ascenso/descenso acumulado (ignora el ruido por debajo de 0.3 m)
#define ALT_RANGE_MAX 3000.0f  // altitud máxima que corresponde al anillo de progreso completo (3000 m)

// ===================== Paso 2: objetos del driver de hardware =====================
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, TFT_MISO);
Arduino_GFX *gfx = new Arduino_GC9A01(bus, TFT_RST, 0 /* rotación */, true /* modo IPS */);
// Doble buffer Canvas: todo el dibujo se hace primero en un lienzo en memoria y al final flush() lo vuelca de golpe a la pantalla, eliminando el parpadeo
Arduino_Canvas *canvas = new Arduino_Canvas(240, 240, gfx);

Adafruit_BMP085 bmp;

// ===================== Paso 3: estructuras de datos =====================
struct AltitudeData {
  float currentAltitude = 0;       // altitud actual (tras filtrado)
  float maxAltitude = 0;           // altitud máxima de este registro
  float totalAscent = 0;           // ascenso acumulado
  float totalDescent = 0;          // descenso acumulado
  float currentPressure = 1013.25; // presión actual (hPa)

  // Los siguientes son "valores mostrados" para interpolación de animación, de forma que los números transiten suavemente sin saltos bruscos
  float displayedAltitude = 0;
  float displayedAscent = 0;
  float displayedDescent = 0;
  float displayedPressure = 1013.25;
} data;

// Búfer circular para el filtro de media móvil
float altBuffer[FILTER_SIZE] = {0};
int filterIndex = 0;
int filterCount = 0;

// Constantes de color (se inicializan en setup() con color565() para no reservar recursos antes de tiempo)
uint16_t COLOR_WHITE, COLOR_BLACK, COLOR_CREAM_GREEN;

// Estado del botón
unsigned long btnPressStart = 0;
bool btnIsPressed = false;
bool calibrationTriggered = false;


// ============================================================
//                   Módulo 1: lectura del sensor
// ============================================================

void initSensor() {
  Serial.print("[Sensor] Inicializando bus I2C (SDA=");
  Serial.print(BMP_SDA);
  Serial.print(", SCL=");
  Serial.print(BMP_SCL);
  Serial.println(")...");

  Wire.begin(BMP_SDA, BMP_SCL);

  Serial.println("[Sensor] Conectando con el sensor BMP180...");
  if (!bmp.begin()) {
    // Si el programa se queda aquí imprimiendo ERROR, el cableado del sensor tiene algún problema
    // La pantalla tampoco se encenderá, porque el programa no llega a la parte de abajo
    while (1) {
      Serial.println("[ERROR] ¡Inicialización de BMP180 fallida! Revisa el cableado, la alimentación (3.3V) y los pines I2C.");
      delay(2000);
    }
  }
  Serial.println("[Sensor] ¡BMP180 conectado con éxito!");
}

// Lee una muestra bruta de presión y altitud del BMP180
void sampleSensor(float &rawAltitude, float &rawPressure) {
  rawPressure = bmp.readPressure() / 100.0f;  // Pa a hPa
  rawAltitude = bmp.readAltitude(101325);      // 101325 Pa = presión estándar a nivel del mar
}


// ============================================================
//                   Módulo 2: procesamiento de datos
// ============================================================

// Filtro de media móvil: promedia las últimas FILTER_SIZE lecturas para reducir el ruido del sensor
float smoothAltitude(float raw) {
  altBuffer[filterIndex] = raw;
  filterIndex = (filterIndex + 1) % FILTER_SIZE;
  if (filterCount < FILTER_SIZE) filterCount++;

  float sum = 0;
  for (int i = 0; i < filterCount; i++) sum += altBuffer[i];
  return sum / filterCount;
}

// Actualiza las estadísticas: altitud máxima, ascenso acumulado, descenso acumulado
void updateStats(float smoothedAltitude) {
  static bool firstSample = true;
  static float lastAltitude = 0;

  if (firstSample) {
    lastAltitude = smoothedAltitude;
    data.maxAltitude = smoothedAltitude;
    firstSample = false;
  }

  float delta = smoothedAltitude - lastAltitude;
  // Solo se contabilizan los cambios que superan la zona muerta, para que el ruido mínimo en terreno llano no hinche artificialmente el ascenso
  if (delta > DEAD_ZONE) {
    data.totalAscent += delta;
  } else if (delta < -DEAD_ZONE) {
    data.totalDescent += -delta;
  }

  if (smoothedAltitude > data.maxAltitude) {
    data.maxAltitude = smoothedAltitude;
  }

  lastAltitude = smoothedAltitude;
  data.currentAltitude = smoothedAltitude;
}


// ============================================================
//                   Módulo 3: botón y calibración
// ============================================================

void showCalibrationFlash();  // declaración adelantada

// Se dispara al mantener pulsado BOOT: pone a cero ascenso/descenso y reinicia desde la altitud actual como referencia
void doCalibration() {
  Serial.println("[Button] Detectada pulsación larga, ejecutando puesta a cero de la altitud...");
  data.totalAscent = 0;
  data.totalDescent = 0;
  data.displayedAscent = 0;
  data.displayedDescent = 0;
  data.maxAltitude = data.currentAltitude;

  showCalibrationFlash();
  Serial.println("[Button] Calibración completada.");
}

// Detecta el estado del botón; el botón BOOT es activo a nivel bajo
void handleButton() {
  bool pressed = (digitalRead(BTN_PIN) == LOW);

  if (pressed && !btnIsPressed) {
    btnIsPressed = true;
    btnPressStart = millis();
    calibrationTriggered = false;
  } else if (pressed && btnIsPressed) {
    // Si se supera el umbral de pulsación larga y todavía no se ha disparado, ejecuta la calibración
    if (!calibrationTriggered && (millis() - btnPressStart >= CALIBRATION_HOLD_MS)) {
      doCalibration();
      calibrationTriggered = true;  // evita disparos repetidos mientras se mantiene pulsado
    }
  } else if (!pressed && btnIsPressed) {
    btnIsPressed = false;
  }
}


// ============================================================
//                   Módulo 4: renderizado de UI
// ============================================================

// Interpolación lineal entre dos colores RGB565 (t va de 0.0 a 1.0)
uint16_t lerpColor(uint16_t colorA, uint16_t colorB, float t) {
  t = constrain(t, 0.0, 1.0);
  uint8_t r1 = (colorA >> 11) & 0x1F, g1 = (colorA >> 5) & 0x3F, b1 = colorA & 0x1F;
  uint8_t r2 = (colorB >> 11) & 0x1F, g2 = (colorB >> 5) & 0x3F, b2 = colorB & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// Dibuja el fondo de cielo con degradado: a baja altitud tonos marrón cálido, a gran altura degradado a azul profundo
void drawSkyBackground(float altitudeRatio) {
  uint16_t topLow     = canvas->color565(176, 196, 210);  // cénit a baja altitud: azul claro
  uint16_t topHigh    = canvas->color565(30, 30, 90);     // cénit a gran altura: azul profundo
  uint16_t bottomLow  = canvas->color565(210, 200, 180);  // horizonte a baja altitud: gris cálido
  uint16_t bottomHigh = canvas->color565(70, 90, 140);    // horizonte a gran altura: gris azulado

  uint16_t topColor    = lerpColor(topLow, topHigh, altitudeRatio);
  uint16_t bottomColor = lerpColor(bottomLow, bottomHigh, altitudeRatio);

  for (int y = 0; y < 240; y++) {
    float t = (float)y / 240.0;
    canvas->drawFastHLine(0, y, 240, lerpColor(topColor, bottomColor, t));
  }
}

// Dibuja una única cima (con línea de nieve); greenFraction controla la posición de la línea de nieve: a mayor altitud, la línea desciende
void drawSnowyPeak(int16_t apexX, int16_t apexY, int16_t baseLeftX, int16_t baseRightX,
                    int16_t baseY, uint16_t bodyColor, float greenFraction) {
  canvas->fillTriangle(apexX, apexY, baseLeftX, baseY, baseRightX, baseY, bodyColor);

  greenFraction = constrain(greenFraction, 0.05f, 0.85f);
  int16_t snowY      = apexY + (baseY - apexY) * greenFraction;
  int16_t snowLeftX  = apexX + (baseLeftX - apexX) * greenFraction;
  int16_t snowRightX = apexX + (baseRightX - apexX) * greenFraction;

  canvas->fillTriangle(apexX, apexY, snowLeftX, snowY, snowRightX, snowY, COLOR_CREAM_GREEN);
}

// Dibuja tres picos escalonados a distintas distancias
void drawMountains(float altitudeRatio) {
  float greenRatio = 1.0f - altitudeRatio;  // a mayor altitud, menos zona de vegetación y la línea de nieve desciende

  drawSnowyPeak(60,  110, -20, 140, 240, canvas->color565(60, 75, 65),  greenRatio * 0.7);
  drawSnowyPeak(200, 130, 150, 260, 240, canvas->color565(70, 85, 75),  greenRatio * 0.6);
  drawSnowyPeak(130, 70,  40,  220, 240, canvas->color565(45, 55, 50),  greenRatio);
}

// Dibuja un arco de circunferencia (función base para el anillo de progreso)
void drawRingArc(int16_t cx, int16_t cy, int16_t radius, int16_t thickness,
                  float startDeg, float endDeg, uint16_t color) {
  for (float deg = startDeg; deg <= endDeg; deg += 1.0) {
    float rad = deg * PI / 180.0;
    int16_t x0 = cx + cos(rad) * (radius - thickness / 2);
    int16_t y0 = cy + sin(rad) * (radius - thickness / 2);
    int16_t x1 = cx + cos(rad) * (radius + thickness / 2);
    int16_t y1 = cy + sin(rad) * (radius + thickness / 2);
    canvas->drawLine(x0, y0, x1, y1, color);
  }
}

// Dibuja el anillo de progreso de altitud en el borde de la pantalla; enciende un arco dorado según la proporción de altitud
void drawProgressRing(float altitudeRatio) {
  int16_t cx = 120, cy = 120, radius = 115, thickness = 6;
  // Primero dibuja un anillo base gris completo
  drawRingArc(cx, cy, radius, thickness, -90, 269, canvas->color565(50, 50, 60));
  // Luego sobrescribe con dorado la parte de progreso ya ascendida
  float endAngle = -90 + altitudeRatio * 359.0;
  drawRingArc(cx, cy, radius, thickness, -90, endAngle, canvas->color565(255, 200, 80));
}

// Dibuja texto con un halo negro para evitar que el texto blanco se funda con fondos claros
void drawTextWithHalo(int16_t x, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  canvas->setTextColor(haloColor);
  // Desplaza 1 píxel arriba, abajo, izquierda y derecha para dibujar el halo
  canvas->setCursor(x - 1, y); canvas->print(text);
  canvas->setCursor(x + 1, y); canvas->print(text);
  canvas->setCursor(x, y - 1); canvas->print(text);
  canvas->setCursor(x, y + 1); canvas->print(text);

  canvas->setTextColor(textColor);
  canvas->setCursor(x, y);
  canvas->print(text);
}

// Dibuja texto centrado; calcula el desplazamiento automáticamente a partir del ancho del texto
void drawCenteredText(int16_t centerX, int16_t y, const char *text, uint8_t textSize,
                       uint16_t textColor, uint16_t haloColor) {
  canvas->setTextSize(textSize);
  int16_t x1, y1;
  uint16_t w, h;
  canvas->getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  drawTextWithHalo(centerX - w / 2, y, text, textSize, textColor, haloColor);
}

// Dibuja toda la capa superpuesta de datos de texto
void drawDataOverlay() {
  char buf[32];

  // Texto grande en el centro de la pantalla: valor de altitud actual
  sprintf(buf, "%d", (int)round(data.displayedAltitude));
  drawCenteredText(120, 68, buf, 4, COLOR_WHITE, COLOR_BLACK);
  drawCenteredText(120, 104, "m", 2, COLOR_WHITE, COLOR_BLACK);

  // Izquierda: triángulo naranja hacia arriba + ascenso acumulado
  int16_t ascX = 58, ascY = 138;
  canvas->fillTriangle(ascX, ascY - 8, ascX - 7, ascY + 5, ascX + 7, ascY + 5,
                       canvas->color565(255, 140, 60));
  sprintf(buf, "%dm", (int)round(data.displayedAscent));
  drawTextWithHalo(ascX + 13, ascY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // Derecha: triángulo azul hacia abajo + descenso acumulado
  int16_t desX = 150, desY = 138;
  canvas->fillTriangle(desX, desY + 8, desX - 7, desY - 5, desX + 7, desY - 5,
                       canvas->color565(120, 180, 255));
  sprintf(buf, "%dm", (int)round(data.displayedDescent));
  drawTextWithHalo(desX + 13, desY - 7, buf, 2, COLOR_WHITE, COLOR_BLACK);

  // Texto pequeño abajo: presión en tiempo real
  sprintf(buf, "Press: %.1f hPa", data.displayedPressure);
  drawCenteredText(120, 162, buf, 1, COLOR_WHITE, COLOR_BLACK);
}

// Función de renderizado principal: dibuja en orden fondo → montañas → anillo de progreso → números, y al final hace flush a la pantalla
void renderUI() {
  float altitudeRatio = constrain(data.displayedAltitude / ALT_RANGE_MAX, 0.0f, 1.0f);

  drawSkyBackground(altitudeRatio);
  drawMountains(altitudeRatio);
  drawProgressRing(altitudeRatio);
  drawDataOverlay();

  canvas->flush();  // vuelca de golpe el búfer de memoria del Canvas a la pantalla física
}

// Animación de parpadeo al completar la calibración
void showCalibrationFlash() {
  for (int i = 0; i < 2; i++) {
    canvas->fillScreen(COLOR_WHITE);
    canvas->flush();
    delay(120);

    canvas->fillScreen(COLOR_BLACK);
    canvas->setTextColor(COLOR_WHITE);
    canvas->setTextSize(2);
    canvas->setCursor(48, 112);
    canvas->print("Calibrated!");
    canvas->flush();
    delay(120);
  }
  delay(300);
}


// ============================================================
//                       setup / loop
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- [System] Iniciando registrador de montaña ---");

  // Backlight a HIGH; sin este paso la pantalla se queda siempre negra
  Serial.println("[TFT] Configurando pin de backlight...");
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  pinMode(BTN_PIN, INPUT_PULLUP);  // pull-up interno del botón BOOT

  // Inicializa el driver de la pantalla
  Serial.println("[TFT] Inicializando Canvas...");
  if (!canvas->begin()) {
    Serial.println("[ERROR] ¡Inicialización del driver de pantalla fallida! Confirma la configuración de pines SPI.");
  } else {
    Serial.println("[TFT] Driver de pantalla inicializado con éxito.");
  }

  COLOR_WHITE       = canvas->color565(255, 255, 255);
  COLOR_BLACK       = canvas->color565(0, 0, 0);
  COLOR_CREAM_GREEN = canvas->color565(205, 235, 195);  // color de nieve de la cima (verde-blanco claro)

  canvas->fillScreen(COLOR_BLACK);
  canvas->flush();

  // Inicializa el sensor
  initSensor();

  // Lee los primeros datos en el arranque para inicializar todos los valores mostrados
  Serial.println("[Sensor] Leyendo datos iniciales del arranque...");
  float rawAlt, rawPress;
  sampleSensor(rawAlt, rawPress);

  Serial.print("[Sensor] Lectura de arranque → Presión: ");
  Serial.print(rawPress);
  Serial.print(" hPa | Altitud: ");
  Serial.print(rawAlt);
  Serial.println(" m");

  data.currentAltitude   = rawAlt;
  data.maxAltitude       = rawAlt;
  data.displayedAltitude = rawAlt;
  data.currentPressure   = rawPress;
  data.displayedPressure = rawPress;

  // Rellena el búfer del filtro con la altitud de arranque para evitar que los valores salten de 0 a la altitud real al iniciar
  for (int i = 0; i < FILTER_SIZE; i++) altBuffer[i] = rawAlt;
  filterCount = FILTER_SIZE;

  Serial.println("--- [System] Inicialización completada, entrando en el bucle principal ---");
}

// Temporizador de muestreo del sensor (una muestra por segundo)
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL = 1000;

// Temporizador de refresco de pantalla (unos 33 fps)
unsigned long lastRenderTime = 0;
const unsigned long RENDER_INTERVAL = 30;

void loop() {
  handleButton();

  unsigned long now = millis();

  // --- Tarea de baja frecuencia: muestrea el sensor cada 1 segundo ---
  if (now - lastSampleTime >= SAMPLE_INTERVAL) {
    lastSampleTime = now;

    float rawAltitude, rawPressure;
    sampleSensor(rawAltitude, rawPressure);

    float smoothed = smoothAltitude(rawAltitude);
    updateStats(smoothed);
    data.currentPressure = rawPressure;

    // Registro en tiempo real por el puerto serie para confirmar durante la depuración que el sensor funciona bien
    Serial.print("[Loop] Bruto: ");   Serial.print(rawAltitude);
    Serial.print("m | Filtrado: ");  Serial.print(data.currentAltitude);
    Serial.print("m | Presión: ");   Serial.print(data.currentPressure);
    Serial.print(" hPa | Ascenso: ");Serial.println(data.totalAscent);
  }

  // --- Tarea de alta frecuencia: renderiza la UI a unos 33 fps ---
  if (now - lastRenderTime >= RENDER_INTERVAL) {
    lastRenderTime = now;

    // Interpolación con suavizado exponencial: los números mostrados siguen suavemente el valor real; el coeficiente 0.12 controla la velocidad de seguimiento
    data.displayedAltitude += (data.currentAltitude  - data.displayedAltitude) * 0.12f;
    data.displayedAscent   += (data.totalAscent      - data.displayedAscent)   * 0.12f;
    data.displayedDescent  += (data.totalDescent     - data.displayedDescent)  * 0.12f;
    data.displayedPressure += (data.currentPressure  - data.displayedPressure) * 0.12f;

    renderUI();
  }

  delay(2);
}
```

---

## Explicación del código

Todo el código se divide en cuatro módulos, independientes entre sí a nivel lógico:

**Módulo 1: lectura del sensor** — `initSensor()` inicializa el bus I2C y comprueba si el BMP180 responde; si falla, entra en un bucle infinito imprimiendo el error y no continúa (útil para localizar el problema rápidamente). `sampleSensor()` lee en cada llamada la presión bruta (Pa a hPa) y la altitud (calculada tomando como referencia los 101325 Pa estándar a nivel del mar).

**Módulo 2: procesamiento de datos** — `smoothAltitude()` aplica un filtro de media móvil de 5 puntos para reducir el ruido del sensor; `updateStats()` acumula ascenso/descenso con una zona muerta de 0.3 m, evitando que las pequeñas fluctuaciones en terreno llano hinchen artificialmente el acumulado.

**Módulo 3: botón y calibración** — `handleButton()` detecta si el botón BOOT se mantiene pulsado más de 2000 milisegundos y dispara `doCalibration()`, que pone a cero el ascenso/descenso y reinicia las estadísticas tomando la altitud actual como nueva referencia. El flag `calibrationTriggered` evita disparos múltiples durante una misma pulsación larga.

**Módulo 4: renderizado de UI** — usa el doble buffer de `Arduino_Canvas`: cada frame se compone primero en memoria (degradado de fondo, montañas con línea de nieve dinámica, anillo de progreso del borde y números) y al final `canvas->flush()` vuelca todo de golpe a la pantalla, eliminando por completo el parpadeo del refresco línea a línea. Los números se interpolan con suavizado exponencial (coeficiente 0.12) para una animación natural, sin saltos.

En `loop()` se separan, mediante dos temporizadores, el "muestreo de baja frecuencia (cada 1 segundo)" y el "renderizado de alta frecuencia (unos 33 fps)", de modo que ninguno bloquea al otro y el conjunto responde con mucha fluidez.

---

## Solución de problemas / Errores comunes

No te asustes: el 90% de los problemas están en estos puntos:

**Problema 1: la pantalla está totalmente negra, sin siquiera backlight**

Comprueba que en `setup()` se ejecuta `digitalWrite(TFT_BL, HIGH)` para el GPIO 7. El backlight no se enciende solo; sin esa línea en el código, la pantalla se queda siempre negra. Confirma también que VCC va a 3.3 V y no a 5 V: con 5 V puedes quemar la pantalla.

**Problema 2: hay backlight pero la pantalla está toda blanca o toda negra, sin imagen**

Abre el monitor serie (baudrate 115200) y comprueba si aparece `[ERROR]`. Si aparece `Inicialización del driver de pantalla fallida`, los pines SPI están mal conectados; revisa uno a uno contra la tabla de conexiones los cinco cables CS / DC / SCK / MOSI / RST.

**Problema 3: el puerto serie imprime sin parar `Inicialización de BMP180 fallida` y el programa se cuelga sin encender la pantalla**

Un fallo de inicialización del BMP180 provoca un bucle infinito y la pantalla no se enciende. El 99% de las veces es un problema de cableado I2C: SDA a GPIO13, SCL a GPIO14, alimentación a 3.3 V, y confirma que las resistencias de pull-up del módulo están soldadas (los módulos comerciales normalmente ya las traen).

**Problema 4: muestra datos, pero la altitud difiere bastante de la real**

El BMP180 calcula la altitud tomando como referencia la presión estándar a nivel del mar (101325 Pa); la presión local real varía con el clima, así que una desviación de ±30 m es normal. Si conoces la altitud exacta en este momento, puedes sustituir el argumento de `bmp.readAltitude(101325)` por el valor QNH local de presión a nivel del mar (en Pa; lo puedes obtener de una app meteorológica, conversión: hPa × 100 = Pa).

**Problema 5: el número de ascenso acumulado no para de subir, aunque estés parado**

El ruido del sensor supera la zona muerta (0.3 m). Puedes aumentar el valor de `DEAD_ZONE` en el código, por ejemplo a `0.8f` o `1.0f`; o aumentar `FILTER_SIZE` de 5 a 8 para más suavizado. Ambos métodos reducen el sobrecoste.

**Problema 6: el refresco de la imagen parpadea**

Con el doble buffer del Canvas no debería parpadear. Si lo hace, comprueba que `canvas->flush()` se llama al final de `renderUI()` y que no hay ningún otro punto donde se manipule `gfx` directamente saltándose el Canvas.

---

## Preguntas frecuentes (FAQ)

**P: ¿Puedo sustituir la pantalla circular GC9A01 por una pantalla cuadrada de otro modelo?**
R: Sí. Arduino_GFX_Library soporta decenas de controladores de pantalla (ST7789, ILI9341, etc.); basta con cambiar la línea de `Arduino_GC9A01` por el nombre de la clase del controlador correspondiente, ajustar el tamaño del Canvas de 240×240 a la resolución de tu pantalla, y el código de UI prácticamente no necesita cambios.

**P: ¿Puedo cambiar el BMP180 por un BMP280 o un BME280?**
R: Sí, pero necesitas cambiar de librería. El BMP280 usa la librería `Adafruit_BMP280` y el BME280 la `Adafruit_BME280`; la forma de llamar a `readAltitude()` difiere ligeramente. El BMP280 tiene mayor precisión y un consumo en reposo de unos 2.74 µA; el BME280 además permite leer la humedad y es algo más caro.

**P: ¿Cuál es la precisión de altitud del BMP180? Es normal que, probándolo en interiores, los números salten todo el rato?**
R: El BMP180 tiene una precisión de ±1 m en modo estándar y de hasta ±0.5 m en modo de alta resolución. Que la lectura en interiores fluctúe es totalmente normal: abrir o cerrar ventanas o el flujo de aire del aire acondicionado provocan microvariaciones de presión que afectan a la lectura de altitud. Este proyecto usa una media móvil de 5 puntos más una zona muerta de 0.3 m para amortiguar esas oscilaciones; en el uso real el resultado ya es bastante bueno.

**P: ¿Pueden usarse a la vez el SPI (pantalla) y el I2C (sensor) del ESP32-S3?**
R: Por supuesto. SPI e I2C son buses de periféricos independientes; en este proyecto el GC9A01 va por SPI (GPIO11/12) y el BMP180 por I2C (GPIO13/14), cada uno por su bus, sin interferencias. El ESP32-S3 no tiene ningún problema en manejar ambos buses simultáneamente.

**P: ¿Qué es `Arduino_Canvas` en el código y puedo eliminarlo y dibujar directamente con `gfx`?**
R: `Arduino_Canvas` es el lienzo de doble buffer que proporciona Arduino_GFX_Library: todas las órdenes de dibujo se escriben primero en un lienzo virtual en memoria y, al llamar a `flush()`, se vuelcan de golpe a la pantalla, eliminando el parpadeo del refresco línea a línea. Eliminarlo y operar directamente sobre `gfx` todavía funcionaría, pero al dibujar un fondo a pantalla completa con degradado el parpadeo sería muy evidente y la experiencia empeoraría mucho; no lo recomendamos.

**P: ¿Puede el ESP32-S3 funcionar con una batería de litio para llevarlo de montaña?**
R: Sí. Una combinación habitual es una batería de litio de 3.7 V + un módulo de carga/descarga TP4056 + un LDO ME6211 que regula a 3.3 V. Con la configuración de este proyecto, el consumo conjunto del ESP32-S3 + GC9A01 + BMP180 ronda los 80 ~ 120 mA, así que una batería de 500 mAh ofrece una autonomía teórica de 4 a 6 horas, suficiente para una excursión diurna. Para mayor autonomía puedes bajar el brillo del backlight (PWM en GPIO7) o alargar el intervalo de muestreo del sensor.

---

## Ideas para seguir experimentando

Una vez terminada esta versión, puedes seguir dándole vueltas:

- **Añadir una tarjeta SD para registrar la ruta**: cada 10 segundos escribe en un fichero CSV la marca de tiempo + altitud + presión; al volver, impórtalo en un software de trazado GPS para analizar los datos
- **Fusionar con un módulo GPS para posicionamiento**: el BMP180 sufre deriva por el clima; la altitud por GPS tiene una precisión de unos ±10 m pero es más estable; fusionar ambos se complementan a la perfección
- **Conectar un giroscopio MPU6050 como podómetro**: detecta la cadencia de paso para estimar el número de pasos y convertirlo en un registrador completo de senderismo
- **Enviar datos por BLE al móvil**: usa el BLE del ESP32-S3 para enviar los datos en tiempo real a una app móvil que, junto con un mapa, muestre la trazada completa

---

## Referencias

- [Hoja de datos oficial del BMP180 (Bosch Sensortec)](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp180-ds000.pdf)
- [Hoja de datos del controlador GC9A01 (Galaxycore)](http://www.galaxycore.com/file/pdf/GC9A01A.pdf)
- [Repositorio GitHub de Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Repositorio GitHub de Adafruit BMP085 Library](https://github.com/adafruit/Adafruit-BMP085-Library)
- [Página oficial del producto ESP32-S3 (Espressif)](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
