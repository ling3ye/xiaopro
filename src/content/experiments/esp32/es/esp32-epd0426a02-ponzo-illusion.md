---
title: "ESP32-S3 controla una pantalla de tinta electrónica EPD0426A02 SSD1677 de 4.26\" para reproducir la ilusión del pasillo de Ponzo｜Tutorial completo SPI + GxEPD2"
boardId: esp32s3
moduleId: display/epd-4inch26-epd0426a02
category: esp32
date: 2026-10-13
intro: "Controla la pantalla de tinta electrónica EPD0426A02 (800×480, controlador SSD1677) desde un ESP32-S3 por SPI y reproduce la animación de cuatro fotogramas de la ilusión del pasillo de Ponzo con refresco parcial de GxEPD2. Incluye cableado completo, código Arduino y solución de pantallas en blanco o corruptas."
image: "https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg"
---

> **Resumen en una línea**: conecta 8 cables, instala 2 librerías, graba un sketch — y tu ESP32-S3 reproducirá la ilusión del pasillo de Ponzo en una tinta electrónica de 4.26", enseñándote de paso el refresco parcial, la habilidad más útil del e-paper.

```
Dificultad: ⭐⭐☆☆☆ (apto para principiantes, siempre que no conectes VCC a 5V)
Tiempo estimado: 40 minutos (10 de cableado + 15 de entorno + 15 de grabación y espectáculo)
Probado con: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + GxEPD2 1.6.9
```

> **TL;DR (inicio rápido):**
>
> 1. Cableado: MOSI → GPIO11, SCK → GPIO12, CS → GPIO10, DC → GPIO9, RST → GPIO8, BUSY → GPIO7
> 2. VCC a 3.3V (con 5V quemas el panel — no preguntes cómo lo sé)
> 3. Instala dos librerías: GxEPD2 (≥ 1.5.3) + Adafruit_GFX (se instala sola con GxEPD2)
> 4. Selecciona la placa "ESP32S3 Dev Module", graba y espera a que tu cerebro sea engañado

---

## Introducción: un pasillo que lleva engañando a la humanidad más de 100 años

Seguro que conoces esta imagen: dos segmentos idénticos, pero en cuanto se dibujan las líneas de perspectiva de un pasillo, el que está "más lejos" parece más largo. Sabes que son iguales, pero tus ojos se niegan a admitirlo: es la clásica ilusión de Ponzo. Tu cerebro activa automáticamente el modo "inferencia de perspectiva" y traduce "lejos" como "más grande".

Llevaba tiempo buscando la ocasión de materializar esta ilusión con mis propias manos. Resulta que tenía a mano una tinta electrónica EPD0426A02 de 4.26" (800×480, controlador SSD1677) y un ESP32-S3. La personalidad del e-paper — cambios lentos y una imagen que no se borra al cortar la corriente — casa perfectamente con una demo de ilusión: el público tiene tiempo de sobra para dudar de la realidad y, al terminar, puedes desenchufarlo y dejarlo sobre la mesa engañando al siguiente invitado.

Este artículo te guía desde cero: conecta 8 cables, instala 2 librerías, graba un sketch y deja que esta pantalla le dé una lección a tu cerebro. De camino dominarás la habilidad más práctica del e-paper: el refresco parcial.

## Resultado final

Tras la grabación, la pantalla reproduce automáticamente una animación de unos 40 segundos en cuatro fotogramas: primero pregunta "¿estas dos líneas miden lo mismo?", luego revela la respuesta y por fin se queda en la escena de la ilusión del pasillo (el MCU queda inactivo; la imagen se mantiene hasta que resetees manualmente).

![](https://img.lingflux.com/2026/10/71af63a18796270f26845066c55d2283.jpg)

Este es el guion gráfico de los cuatro fotogramas. Las transiciones usan refresco parcial y los segmentos no se mueven ni un ápice:

| Fotograma | Contenido                                                    | Duración |
| --------- | ------------------------------------------------------------ | -------- |
| 1         | Solo los segmentos A y B, "Are these two lines the same length?" | 7 s   |
| 2         | Se añaden guías horizontales de líneas discontinuas, "Yes - exactly equal." | 7 s |
| 3         | Entran las líneas de perspectiva, "And now?"                 | 10 s     |
| 4         | Guías + perspectiva juntas, "Same lines - your brain was fooled." | 7 s  |
| Final     | Escena de ilusión pura + título grande "Ponzo illusion", luego inactivo | Se mantiene |

![](https://img.lingflux.com/2026/10/68b443e3994d10b40d287b13965c7c93.jpg)

## Descripción de componentes

### Tinta electrónica EPD0426A02 — una "pizarra electrónica" que recuerda sin corriente

La EPD0426A02 es un módulo de papel electrónico de 4.26 pulgadas fabricado por Osptek (Shenzhen). Su trabajo es "imprimir" en la pantalla los datos de imagen que le envía el ESP32-S3. En este proyecto reproduce la animación de la ilusión en cuatro fotogramas y mantiene la imagen a largo plazo.

Dicho de forma cotidiana: es un primo de la pantalla del Kindle — una "pizarra electrónica". Escribes, cortas la corriente y las letras siguen ahí; para cambiar el contenido hay que "borrar y reescribir" toda la pantalla (de ahí esos parpadeos al refrescar). Refrescar lento es su carácter; no consumir energía es su superpoder.

Parámetros clave:

| Elemento                  | Parámetro                                                  |
| ------------------------- | ---------------------------------------------------------- |
| Tamaño / Resolución       | 4.26 pulgadas, 800 × 480 (horizontal), 219 DPI             |
| IC controlador            | SSD1677 (controlador 960 source × 680 gate, interfaz SPI)  |
| Capacidad de visualización| B/N biestable, 4 niveles de gris nativos (2 bit/px)        |
| Interfaz                  | FPC de 24 pines, SPI de 4 hilos (solo escritura)           |
| Corriente pico en refresco| ~50 mA                                                     |
| Corriente en reposo profundo | ~3 µA (imagen mantenida sin consumo)                    |
| Vida útil de diseño       | 5 años / 1.000.000 de refrescos (25 ℃ / 60%RH)             |

¿Por qué esta? 800×480 es alta definición para un e-paper de este tamaño: las líneas de perspectiva salen bien afiladas; los 3 µA de reposo profundo hacen que "terminar la función, desenchufar y seguir engañando gente" no cueste nada de batería; y GxEPD2 lo soporta de forma nativa desde la v1.5.3 (clase de driver `GxEPD2_426_GDEQ0426T82`), así que no hay que escribir ningún driver.

### Descripción de pines

La placa adaptadora de la EPD0426A02 saca 8 pines, cada uno con su función:

| Pin        | Para qué sirve                                            |
| ---------- | --------------------------------------------------------- |
| VCC        | Alimentación 3.3V (⚠️ jamás a 5V)                          |
| GND        | Masa común: hablar el mismo idioma que la placa           |
| MOSI (DIN) | Datos SPI: el MCU empuja píxeles hacia el panel           |
| SCK (SCL)  | Reloj SPI: acuerda a qué velocidad va cada bit            |
| CS         | Chip select: en bajo = "este bus es tuyo"                 |
| DC         | Conmutación datos/comando: alto=datos de píxel, bajo=comando |
| RST        | Reset por hardware: se pulsa antes de inicializar         |
| BUSY       | Señal de ocupado: alto = refrescando, no molestar         |

Un apunte: el BUSY de este panel es **activo en alto** (ocupado = alto), aunque el pin suele llamarse `BUSY_N` — justo lo contrario de la intuición. Por suerte GxEPD2 ya ha tapado ese bache por nosotros; basta con saber que existe.

## Lista de materiales (BOM)

| N.º | Componente        | Modelo / Especificación                                        | Cant. | Notas                                     |
| --- | ----------------- | -------------------------------------------------------------- | ----- | ----------------------------------------- |
| 1   | Placa de desarrollo | ESP32-S3 (vale ESP32-S3-DevKitC / Arduino Nano ESP32)        | 1     | Con USB-serie integrado basta             |
| 2   | Módulo e-paper    | EPD0426A02 (SSD1677, 800×480)                                  | 1     | Con placa adaptadora y 8 pines de cabecera |
| 3   | Cables Dupont     | Hembra-hembra o macho-macho                                    | 8     | 6 de señal + alimentación y masa          |
| 4   | Cable USB         | Type-C o Micro (según la placa)                                | 1     | Alimentación + grabación                  |

## Cableado

![](https://img.lingflux.com/2026/10/3ae30dc6faad42836102413a774bc830.jpg)

El diagrama de cableado manda; la tabla sirve de comprobación:

| Pin e-paper | GPIO del ESP32-S3 | Notas                              |
| ----------- | ----------------- | ---------------------------------- |
| VCC         | 3V3               | ⚠️ 3.3V — con 5V quemas el panel    |
| GND         | GND               | Cualquier GND                      |
| MOSI (DIN)  | GPIO11            | Datos SPI                          |
| SCK (SCL)   | GPIO12            | Reloj SPI                          |
| CS          | GPIO10            | Chip select                        |
| DC          | GPIO9             | Datos/Comando                      |
| RST         | GPIO8             | Reset                              |
| BUSY        | GPIO7             | Señal de ocupado (entrada)         |

**Tras cablear, revisa conexión por conexión: te ahorrará el 80% del tiempo de depuración.** Un e-paper mal cableado no da errores ni echa humo; solo muestra en silencio una pantalla blanca o corrupta — no sabrás si falla el código o el cableado. Ojo además: en el ESP32-S3, los pines I2C por defecto del framework Arduino son GPIO8 (SDA) y GPIO9 (SCL), que este sketch asigna a RST y DC. Así que con la pantalla conectada, cualquier dispositivo I2C debe remapearse a otros GPIO libres con `Wire.begin(SDA, SCL)`.

Si usas un **Arduino Nano ESP32**, las serigrafías D4~D7 y A4/A5 no son los números GPIO reales. Tabla de equivalencias:

| Pin e-paper | GPIO real | Serigrafía Nano ESP32 |
| ----------- | --------- | --------------------- |
| MOSI        | GPIO11    | A4                    |
| SCK         | GPIO12    | A5                    |
| CS          | GPIO10    | D7                    |
| DC          | GPIO9     | D6                    |
| RST         | GPIO8     | D5                    |
| BUSY        | GPIO7     | D4                    |

## Librerías necesarias

Abre Arduino IDE → Herramientas → Gestionar librerías e instala:

| Librería     | Autor             | Versión requerida                                    | Propósito                    |
| ------------ | ----------------- | ---------------------------------------------------- | ---------------------------- |
| esp32        | Espressif Systems | 3.3.10 (verificado con Arduino IDE 2.3.x)            | Soporte de placa ESP32-S3    |
| GxEPD2       | Jean-Marc Zingg   | **1.6.9** (incluye la clase `GxEPD2_426_GDEQ0426T82`) | Driver del e-paper           |
| Adafruit_GFX | Adafruit          | Se instala sola con GxEPD2                           | API de dibujo (líneas, fuentes) |

Después selecciona **ESP32S3 Dev Module** en Herramientas → Placa, conecta el puerto serie y listo para grabar.

## Código completo

Copia y graba directamente (el archivo corresponde a `arduino/GxEPD2_CorridorIllusion/GxEPD2_CorridorIllusion.ino` del proyecto):

```cpp
/*
 * EPD0426A02 (e-paper SPI 4.26" 480x800, SSD1677) — Demo de ilusión del pasillo (ilusión de Ponzo)
 * Placa: ESP32-S3 (Arduino IDE, seleccionar "ESP32S3 Dev Module")
 * Librería de driver: GxEPD2, usando la clase integrada GxEPD2_426_GDEQ0426T82
 *
 * Definición de pines idéntica al ejemplo de referencia:
 *   BUSY -> GPIO7    DC -> GPIO9     CS -> GPIO10
 *   SCK  -> GPIO12   MOSI -> GPIO11  RST -> GPIO8
 *
 * Secuencia de la función (una sola pasada, sin bucle):
 *   Fotograma 1: dos segmentos gruesos iguales A y B   "Are these two lines the same length?"
 *   Fotograma 2: guías horizontales discontinuas       "Yes - exactly equal."
 *   Fotograma 3: segmentos quietos, perspectiva de pasillo "And now?"
 *   Fotograma 4: perspectiva + guías, la revelación    "Same lines - your brain was fooled."
 *   Finalmente vuelve al fotograma 3 (escena de ilusión) y se queda
 *
 * El lienzo es horizontal 800x480 (rotation 0 = orientación nativa del controlador).
 */

#include <Arduino.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>

// ---------------- Definición de pines (coincide con board_pins.h del proyecto ESP-IDF) ----------------
#define EPD_CS   10
#define EPD_DC   9
#define EPD_RST  8
#define EPD_BUSY 7
#define EPD_SCK  12
#define EPD_MOSI 11

// Modo de buffer de pantalla completa (page_height = HEIGHT, 48000 bytes)
GxEPD2_BW<GxEPD2_426_GDEQ0426T82, GxEPD2_426_GDEQ0426T82::HEIGHT> display(
  GxEPD2_426_GDEQ0426T82(/*CS=*/EPD_CS, /*DC=*/EPD_DC, /*RST=*/EPD_RST, /*BUSY=*/EPD_BUSY));

// ---------------- Geometría de la escena (800x480 horizontal) ----------------
static const int16_t W = 800;
static const int16_t H = 480;

static const int16_t VPX = 700, VPY = 240;   // punto de fuga, pasillo izquierdo
static const int16_t VP2X = 1600, VP2Y = 240; // 2.º punto de fuga (muy a la derecha, fuera de pantalla), líneas de la pared derecha
static const int16_t VP0X = -900, VP0Y = 260; // 3.er punto de fuga (muy a la izquierda, fuera de pantalla), líneas de la pared izquierda
static const int16_t XN  = 150;              // x de la esquina cercana (segmento A)
static const int16_t XF  = 520;              // x de la esquina lejana (segmento B)
static const int16_t Y1  = 190;              // extremo superior de los segmentos
static const int16_t Y2  = 290;              // extremo inferior (ambos segmentos miden 100px)

static const int16_t SEG_W = 6;              // grosor de los segmentos
static const uint32_t FRAME_MS  = 7000;      // duración por fotograma
static const uint32_t FRAME3_MS = 10000;      // el fotograma 3 dura un poco más

// Experimento: la hoja de datos exige escribir 0x04, 0x63 en el registro de control VCOM (0x2B);
// el driver GxEPD2 no lo envía, así que lo parcheamos a mano
// (hay que llamarlo después de display.init(), porque SWRESET borra ese registro)
static void epdWriteVCOMControl()
{
  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));
  digitalWrite(EPD_CS, LOW);
  digitalWrite(EPD_DC, LOW);
  SPI.transfer(0x2B);
  digitalWrite(EPD_DC, HIGH);
  SPI.transfer(0x04);
  SPI.transfer(0x63);
  digitalWrite(EPD_CS, HIGH);
  SPI.endTransaction();
}

// valor y del punto con coordenada x sobre la recta de (px, py) hacia el punto de fuga (vpx, vpy)
static int16_t onLineYVP(int16_t x, int16_t px, int16_t py, int16_t vpx, int16_t vpy)
{
  float t = (float)(x - px) / (float)(vpx - px);
  return (int16_t)(py + (vpy - py) * t);
}

// Pasillo izquierdo: hacia el punto de fuga VP
static int16_t onLineY(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VPX, VPY);
}

// Pared derecha: hacia el 2.º punto de fuga VP2
static int16_t onLineY2(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP2X, VP2Y);
}

// Pared izquierda: hacia el 3.er punto de fuga VP0
static int16_t onLineY0(int16_t x, int16_t px, int16_t py)
{
  return onLineYVP(x, px, py, VP0X, VP0Y);
}

// ---------------- Elementos de dibujo ----------------

// Los dos segmentos — coordenadas y grosor idénticos en todos los fotogramas
static void drawSegments()
{
  display.fillRect(XN - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // segmento A
  display.fillRect(XF - SEG_W / 2, Y1, SEG_W, Y2 - Y1 + 1, GxEPD_BLACK); // segmento B

  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(XN - 34, Y2 + 30);
  display.print("A");
  display.setCursor(XF + 16, Y2 + 30);
  display.print("B");
}

// Guías discontinuas horizontales de alineación, que demuestran que los extremos de ambos
// segmentos comparten la misma línea horizontal
static void drawGuides()
{
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    for (int16_t x = 0; x < W; x += 12)
    {
      display.drawFastHLine(x, ys[i], 6, GxEPD_BLACK);
    }
  }
}

// Líneas de perspectiva del pasillo
static void drawPerspective()
{
  const int16_t topX = XN, topY = 40;    // parte superior de la esquina cercana
  const int16_t botX = XN, botY = 440;   // parte inferior de la esquina cercana

  int16_t ftY = onLineY(XF, topX, topY); // y superior de la esquina lejana
  int16_t fbY = onLineY(XF, botX, botY); // y inferior de la esquina lejana

  // Techo / suelo (2px)
  display.drawLine(topX, topY, XF, ftY, GxEPD_BLACK);
  display.drawLine(topX, topY + 1, XF, ftY + 1, GxEPD_BLACK);
  display.drawLine(botX, botY, XF, fbY, GxEPD_BLACK);
  display.drawLine(botX, botY - 1, XF, fbY - 1, GxEPD_BLACK);

  // Esquina cercana (2px) / esquina lejana (1px)
  display.drawLine(XN, topY, XN, botY, GxEPD_BLACK);
  display.drawLine(XN + 1, topY, XN + 1, botY, GxEPD_BLACK);
  display.drawLine(XF, ftY, XF, fbY, GxEPD_BLACK);

  // Líneas horizontales de perspectiva por los extremos de los segmentos (hasta la pared lejana)
  const int16_t ys[2] = {Y1, Y2};
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XF, onLineY(XF, XN, ys[i]), GxEPD_BLACK);
  }

  // Divisiones verticales (juntas de ladrillo de la pared)
  static const int16_t divX[] = {260, 350, 420, 470, 500};
  for (uint8_t i = 0; i < sizeof(divX) / sizeof(divX[0]); i++)
  {
    int16_t x = divX[i];
    display.drawLine(x, onLineY(x, topX, topY), x, onLineY(x, botX, botY), GxEPD_BLACK);
  }

  // ---- Pared derecha: de la esquina lejana (XF) al borde derecho, convergiendo en VP2 ----
  const int16_t XR = W - 1;

  // Línea de techo / línea de suelo (continúan hasta el borde derecho)
  display.drawLine(XF, ftY, XR, onLineY2(XR, XF, ftY), GxEPD_BLACK);
  display.drawLine(XF, fbY, XR, onLineY2(XR, XF, fbY), GxEPD_BLACK);

  // Líneas horizontales por los extremos de los segmentos, continuadas en la pared derecha
  for (int i = 0; i < 2; i++)
  {
    int16_t yAtXF = onLineY(XF, XN, ys[i]); // y donde la perspectiva de la pared izquierda llega a la esquina lejana
    display.drawLine(XF, yAtXF, XR, onLineY2(XR, XF, yAtXF), GxEPD_BLACK);
  }

  // Divisiones verticales de la pared derecha (juntas), uniendo techo y suelo
  static const int16_t divXR[] = {600, 660, 710, 750, 780};
  for (uint8_t i = 0; i < sizeof(divXR) / sizeof(divXR[0]); i++)
  {
    int16_t x = divXR[i];
    display.drawLine(x, onLineY2(x, XF, ftY), x, onLineY2(x, XF, fbY), GxEPD_BLACK);
  }

  // ---- Pared izquierda: de la esquina cercana (XN) al borde izquierdo, convergiendo en VP0 ----
  const int16_t XL = 0;

  // Línea de techo / línea de suelo (continúan hasta el borde izquierdo)
  display.drawLine(XN, topY, XL, onLineY0(XL, XN, topY), GxEPD_BLACK);
  display.drawLine(XN, botY, XL, onLineY0(XL, XN, botY), GxEPD_BLACK);

  // Líneas horizontales por los extremos de los segmentos, continuadas en la pared izquierda
  for (int i = 0; i < 2; i++)
  {
    display.drawLine(XN, ys[i], XL, onLineY0(XL, XN, ys[i]), GxEPD_BLACK);
  }

  // Divisiones verticales de la pared izquierda (juntas)
  static const int16_t divXL[] = {30, 80, 120};
  for (uint8_t i = 0; i < sizeof(divXL) / sizeof(divXL[0]); i++)
  {
    int16_t x = divXL[i];
    display.drawLine(x, onLineY0(x, XN, topY), x, onLineY0(x, XN, botY), GxEPD_BLACK);
  }
}

// Texto superior
static void drawTitle(const char *text)
{
  display.setFont(&FreeSansBold12pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(20, 34);
  display.print(text);
}

// Título grande del fotograma final: fuente mayor, centrado horizontalmente arriba
// (la zona central superior queda por encima de la línea de techo, sin solapar la perspectiva)
static void drawTitleBig(const char *text)
{
  display.setFont(&FreeSansBold18pt7b);
  display.setTextColor(GxEPD_BLACK);
  int16_t tbx, tby;
  uint16_t tbw, tbh;
  display.getTextBounds(text, 0, 0, &tbx, &tby, &tbw, &tbh);
  display.setCursor((W - tbw) / 2 - tbx + 200, 48 - tby); // línea base en torno a y=48
  display.print(text);
}

// Dibuja la escena completa según el número de fotograma (1..4), siempre en coordenadas
// absolutas de ventana completa
static void drawFrame(uint8_t frame)
{
  display.fillScreen(GxEPD_WHITE);
  switch (frame)
  {
    case 1:
      drawTitle("Are these two lines the same length?");
      break;
    case 2:
      drawTitle("Yes - exactly equal.");
      drawGuides();
      break;
    case 3:
      drawTitle("And now?");
      drawPerspective();
      break;
    case 5: // fotograma final: escena de ilusión + título grande, sin "And now?"
      drawTitleBig("Ponzo illusion");
      drawPerspective();
      break;
    case 4:
    default:
      drawTitle("Same lines - your brain was fooled.");
      drawPerspective();
      drawGuides();
      break;
  }
  drawSegments(); // siempre se dibuja al final de cada fotograma, coordenadas invariables
}

// Muestra un fotograma con refresco completo
static void showFrameFull(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.display(); // refresco completo
}

// Muestra un fotograma con refresco parcial: dibuja la ventana completa y usa displayWindow()
// para refrescar solo la zona que cambia (ventana a pantalla completa = refresco parcial total)
static void showFramePartial(uint8_t frame)
{
  display.setFullWindow();
  drawFrame(frame);
  display.displayWindow(0, 0, W, H);
}

void setup()
{
  Serial.begin(115200);
  delay(500);
  Serial.println("[EPD] EPD0426A02 Corridor Illusion (GxEPD2 / GDEQ0426T82)");

  // Mapeo de pines SPI personalizado en ESP32: SCK, MISO(-1 = sin usar), MOSI, SS
  SPI.begin(EPD_SCK, -1, EPD_MOSI, EPD_CS);

  display.init(115200);
  display.setRotation(0); // horizontal nativo 800x480
  display.setTextColor(GxEPD_BLACK);

  epdWriteVCOMControl(); // parche del registro de control VCOM 0x2B

  // ---- Una sola pasada: fotograma 1 -> 2 -> 3 -> 4 ----
  // Fotograma 1: apertura con refresco completo
  showFrameFull(1);
  Serial.println("[EPD] frame 1 (full refresh)");
  delay(FRAME_MS);

  // Fotogramas 2 -> 3 -> 4: refresco parcial, segmentos impasibles
  showFramePartial(2);
  Serial.println("[EPD] frame 2 (partial)");
  delay(FRAME_MS);

  showFramePartial(3);
  Serial.println("[EPD] frame 3 (partial)");
  delay(FRAME3_MS);

  showFramePartial(4);
  Serial.println("[EPD] frame 4 (partial, reveal)");
  delay(FRAME_MS);

  // Al final se mantiene la escena de ilusión (fotograma 5: pasillo + título grande
  // "Ponzo illusion", sin "And now?")
  showFramePartial(5);
  Serial.println("[EPD] final frame 5 (illusion + title), hold");
  delay(1000);

  // Demo terminada, la imagen queda en pantalla (sin deep sleep)
  Serial.println("[EPD] done, holding frame");
}

void loop()
{
  // La imagen ya se mantiene en pantalla; aquí solo se pasa el rato
}
```

### Explicación del código

El sketch tiene 300 y pico líneas — parece largo, pero solo hace seis cosas:

1. **Pines y objeto de pantalla (el grupo de `#define` + la declaración `GxEPD2_BW`)**: 6 macros para los 6 cables de señal; `GxEPD2_BW<..., HEIGHT>` es el "modo buffer de pantalla completa": un fotograma entero de 48.000 bytes vive en RAM de golpe, algo que el ESP32-S3 asume sin despeinarse. ¿Quieres otros pines? Edita esas 6 macros y listo.
2. **Guion de cuatro fotogramas (`drawFrame`)**: básicamente una tabla switch. Fíjate en que `drawSegments()` está fuera del switch y se dibuja al final de cada fotograma: las coordenadas de los segmentos no cambian nunca; lo que cambia son las guías y las líneas de perspectiva. Es la ley de hierro que hace la ilusión "honesta".
3. **La matemática de la perspectiva (`drawPerspective` + las tres funciones `onLineY`)**: en el fondo, la ecuación de la recta por dos puntos de secundaria. Cada una de las tres paredes converge en su propio "punto de fuga" (una intersección fuera del lienzo), lo que da profundidad natural a las líneas. Colocar los puntos de fuga fuera de la pantalla (VP2 en x=1600, VP0 en x=-900) hace que la perspectiva se vea aún más natural.
4. **Refresco parcial (`displayWindow` dentro de `showFramePartial`)**: primero redibuja el fotograma entero en memoria y luego envía al panel solo los píxeles que han cambiado. Entre los fotogramas 2 y 4 los segmentos no se mueven ni un pelo; solo parpadean las guías y la perspectiva. Esa es el alma del refresco parcial frente al completo: rápido (~0,42 s por actualización) y sin destellos que taladren la vista.
5. **El parche VCOM 0x2B (`epdWriteVCOMControl`)**: la hoja de datos del SSD1677 exige escribir `0x04, 0x63` en el registro `0x2B` (para suprimir glitches al conmutar ACVCOM), pero ni GxEPD2 ni la demo del fabricante envían ese comando. Las consecuencias de omitirlo son traicioneras: acabada la demo, mientras VCC siga conectado, la imagen se degrada lentamente en cuestión de minutos. Hay que reenviarlo tras cada `display.init()`, porque el reset por software (0x12) borra ese registro. Esta trampa me costó un día entero — detalles en la sección de problemas.

## Solución de problemas

Tranquilo: el 90% de los problemas vienen de estos cinco puntos. Revísalos de arriba abajo:

**1. Tras grabar, pantalla en blanco y nada aparece**

No cuestiones tu existencia todavía. Comprueba en orden de probabilidad: ① ¿Alguno de los 6 cables de señal hace mal contacto (los Dupont se aflojan en la protoboard con el tiempo)? ② ¿VCC está realmente en 3.3V? ③ ¿El monitor serie imprime `[EPD] frame 1` justo tras grabar? Si no hay salida serie, el programa ni siquiera corre y el panel es inocente. El e-paper nunca lanza errores: la pantalla blanca *es* su mensaje de error.

**2. Error de compilación: `'GxEPD2_426_GDEQ0426T82' does not name a type`**

Tu GxEPD2 es anterior a la 1.5.3. Abre el gestor de librerías y actualiza GxEPD2 a la última versión: esta clase de driver solo existe desde la v1.5.3.

**3. La demo terminó, pero la imagen se degrada poco a poco (en escala de decenas de minutos)**

Es el famoso 0x2B. Verifica que `epdWriteVCOMControl()` se llama después de cada `display.init()` — el reset por software borra ese registro; primero init, luego el parche. Si inviertes el orden, es como si no lo hubieras enviado. Con el parche bien puesto, una imagen inactiva con corriente se mantiene firme.

**4. Solo se ve la mitad de la imagen, o está desplazada verticalmente**

Casi seguro es la rotación o la resolución. Este sketch usa `setRotation(0)` (horizontal nativo 800×480); si un sketch anterior dejó la rotación en 1 o 3, devuélvela a 0. (En el lado ESP-IDF existe una variante de renderizado por páginas para cuando la memoria aprieta; el modo buffer completo de Arduino no tiene ese problema.)

**5. Fallo de subida / no aparece el puerto serie**

Mantén pulsado el botón BOOT de la placa mientras enchufas el USB para entrar en modo de descarga. Si aún así no funciona, cambia de cable: muchos "cables de carga" solo llevan alimentación, sin líneas de datos. Es el accidente más frecuente de mi carrera grabando placas.

## FAQ

**P: ¿Un ESP32 normal (no S3) o un ESP32-C3 pueden ejecutar este sketch?**
R: Sí. El código no usa nada exclusivo del S3; cualquier ESP32 soportado por el framework Arduino funciona — basta mover los cables a GPIO libres de tu placa. El buffer de pantalla completa necesita unos 48 KB de RAM, que hasta el ESP32 clásico (520 KB de SRAM) puede permitirse.

**P: ¿Puedo usar otros pines GPIO? ¿Cómo?**
R: Claro. Edita los 6 `#define` del principio del sketch (EPD_CS / EPD_DC / EPD_RST / EPD_BUSY / EPD_SCK / EPD_MOSI) y recablea según los nuevos pines. En el ESP32-S3 evita los pines de strapping GPIO0/3/45/46, GPIO19/20 (USB) y los ocupados por Flash/PSRAM — consulta el esquemático de tu placa.

**P: El e-paper tarda segundos en refrescar y parpadea varias veces, ¿es normal?**
R: El refresco completo lento es pura física: cada refresco "represa" las 480 filas de píxeles. En este panel un refresco completo mide unos 2 segundos (unas 1,5 s con formas de onda rápidas). Los parpadeos son el procedimiento estándar para borrar fantasmas, no una avería. Si te parece lento, usa el refresco parcial (`displayWindow`) de este sketch: unos 0,42 s por actualización y casi sin parpadeos.

**P: ¿El panel aguanta 5V?**
R: No. El VCC de la EPD0426A02 debe ser 3.3V, sin más. Con 5V no echará humo al instante, pero daña el circuito interno de alta tensión del panel: el síntoma aparece como zonas corruptas tras unos pocos usos — y no lo cubre la garantía. Mejor una pantalla apagada que 5V.

**P: La pantalla se degrada lentamente si la dejo alimentada tras la demo, ¿cómo lo arreglo de raíz?**
R: Escribe los dos bytes 0x04, 0x63 en el registro 0x2B del SSD1677 (la hoja de datos dice literalmente "reduce glitch when ACVCOM toggle") y reenvíalos tras cada reset por software. Eso es exactamente lo que hace `epdWriteVCOMControl()`. Una alternativa más física es cortar VCC con un P-MOSFET, pero si dos bytes por software lo solucionan, no hace falta calentar el soldador.

**P: ¿Por qué dices 4 niveles de gris? ¡La página del producto anuncia 16!**
R: Los píxeles del SSD1677 solo tienen físicamente dos estados estables (negro/blanco) y el camino de datos es de 2 bit/px: nativamente son 4 niveles de gris (negro/gris oscuro/gris claro/blanco). La escala de grises se logra con tablas de forma de onda (LUT) que aplican pulsos de distinto número y polaridad a cada píxel dentro de un fotograma; los 16 niveles percibidos se simulan sobre esos 4 mediante dithering ordenado Bayer 4×4. Este sketch de ilusión usa solo blanco y negro, así que no le afecta — pero recuerda ese techo cuando quieras mostrar fotos.

**P: El refresco parcial deja fantasmas con el tiempo, ¿qué hago?**
R: La acumulación de fantasmas es inherente al refresco parcial. La estrategia práctica es "tras una racha de parciales, hacer un refresco completo": `display.clearScreen()`, o simplemente pasar una vez a todo negro y otra a todo blanco para lavar los fantasmas. Este sketch solo refresca 4 veces, así que el fantasma es despreciable.

**P: Quiero cambiar la longitud/posición de los segmentos, o poner los textos en español, ¿dónde edito?**
R: Todos los parámetros de los segmentos están en el grupo de constantes "Geometría de la escena": `XN`/`XF` son las posiciones horizontales, `Y1`/`Y2` los extremos superior e inferior (longitud = Y2 - Y1) y `SEG_W` el grosor. Los textos están en el switch de `drawFrame`. Tras editar, mantén la coherencia de coordenadas entre ambos segmentos — si no, la ilusión deja de ser "honesta".

## Para ir más allá

- Cambia la ilusión: sustituye Ponzo por la ilusión de las flechas de Müller-Lyer o la de los círculos de Ebbinghaus — solo hay que reescribir las funciones geométricas de `drawFrame`
- Avance manual de fotogramas: conecta un botón táctil o un potenciómetro para que el público grite "¡revela!" y solo entonces pase al fotograma 3 — ceremonia máxima
- Cronómetro con refresco parcial: reutiliza el truco de `displayWindow` para construir un cronómetro electrónico que avanza una marca cada 0,42 s, y disfruta de la disonancia de ver e-paper "en movimiento"
- Fotos en escala de grises: incorpora GxEPD2_4G y "imprime" una foto en el e-paper con 4 niveles de gris + dithering Bayer — efecto fondo de pantalla de Kindle
- Pieza de escritorio a batería: 18650 + reposo profundo, despertando unos segundos al día para actualizar la imagen — una pila dura meses y tu pasillo de la ilusión puede engañar gente 24/7

## Referencias

- Página oficial del IC controlador SSD1677 (Solomon Systech): https://www.solomon-systech.com/product/ssd1677/
- Librería GxEPD2 en GitHub (lista completa de paneles soportados): https://github.com/ZinggJM/GxEPD2
- Librería gráfica Adafruit_GFX en GitHub: https://github.com/adafruit/Adafruit-GFX-Library
- Página oficial del SoC ESP32-S3 (Espressif): https://www.espressif.com/en/products/socs/esp32-s3
- Librería hermana GxEPD2_4G (si quieres fotos en grises con 4 niveles + dithering): https://github.com/ZinggJM/GxEPD2_4G
