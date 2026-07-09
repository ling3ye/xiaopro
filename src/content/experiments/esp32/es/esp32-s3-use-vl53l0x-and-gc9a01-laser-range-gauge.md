---
title: "ESP32-S3 con pantalla circular GC9A01 + VL53L0X-V2: tutorial completo de medición de distancia por láser (cableado SPI + I2C y errores comunes)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/vl53l0x
category: esp32
date: 2026-07-09
intro: "Conduce una pantalla circular GC9A01 de 1.28 pulgadas con un ESP32-S3, junto al sensor de medición de distancia por láser VL53L0X-V2, para construir un medidor láser cyberpunk con aguja que se mueve en tiempo real y un arco que cambia de color según la distancia. Incluye guía para evitar conflictos de pines SPI+I2C y todo el código fuente en Arduino."
image: "https://img.lingflux.com/2026/07/68114f0f73885a81414b9432bd0d95eb.jpg"
---



# ESP32-S3 con pantalla circular GC9A01 + VL53L0X-V2 medición de distancia por láser: del cableado a encender el medidor cyberpunk (con todo el código)

Dificultad: ⭐⭐⭐☆☆ (un maker con un poco de base puede seguirlo, hace falta algo de paciencia con los cables)
Tiempo estimado: 45 minutos
Entorno de prueba: Arduino IDE 2.3.8 + ESP32 Core 3.3.10 + Arduino_GFX_Library v1.6.5 + Adafruit_VL53L0X v1.2.5

---

> **TL;DR (inicio rápido):**
>
> 1. Cableado de la pantalla: GPIO12→SCL, GPIO11→SDA, GPIO9→CS, GPIO10→DC, GPIO18→RST, GPIO7→BL
> 2. Cableado del sensor: GPIO13→SDA, GPIO14→SCL (**ojo, no son los pines I2C por defecto**, porque GPIO9 ya lo usa el CS de la pantalla)
> 3. Instala dos librerías: `Arduino_GFX_Library`, `Adafruit_VL53L0X`
> 4. Sube primero el «código de prueba del sensor» y, cuando veas la distancia en el puerto serie, carga el programa principal
> 5. Carga el programa principal y en la pantalla circular aparecerá un medidor láser con aguja giratoria y arco que cambia de color

---

## Prefacio: por qué pelearse con este medidor circular

Los módulos de medición de distancia por láser (ToF) los ha jugado muchísima gente, pero la mayoría se quedan en la fase de «imprimir números en el puerto serie». El objetivo de este proyecto es muy sencillo: aprovechar la potencia del ESP32-S3 y el atractivo visual de la pantalla circular GC9A01 para convertir datos de distancia abstractos en un tablero de alta tasa de refresco que combina utilidad y estética cyberpunk.

La parte difícil del proyecto no es la lógica, sino el conflicto de pines entre la interfaz SPI de la pantalla y la interfaz I2C del sensor. Para resolver los fallos de inicialización que provoca que los pines por defecto de la placa «se pisen» entre sí, reasigné el mapeo de pines de hardware. A continuación tienes la guía completa para evitar trampas y la implementación del programa principal.

## Demo del resultado

El resultado final es este: sobre la pantalla circular se dibuja un arco de escala parecido al cuentarrevoluciones de un coche de carreras, con una aguja que apunta en tiempo real a la distancia medida; el color del arco pasa de rojo (cerca/peligro) a verde (lejos/seguro), y en el centro se muestran los milímetros concretos y el texto de estado (DANGER / WARNING / CAUTION / SAFE / CLEAR). Pasa la mano por delante del sensor y verás la aguja moverse siguiéndola en tiempo real. Es bastante relajante, la verdad.

## Descripción de los componentes

La placa (ESP32-S3) no necesita muchas más presentaciones; vamos a centrarnos en los otros dos protagonistas.

### GC9A01 pantalla circular 240×240

El GC9A01 es un chip controlador de pantalla diseñado específicamente para pantallas circulares. Se encarga de «traducir» los datos de píxeles que le envías a una imagen en pantalla: tú dices qué dibujar y él se encarga de cómo, gestionando todo el refresco y el barrido por dentro; tú solo llamas a la API.

| Parámetro       | Valor                |
| --------------- | -------------------- |
| Resolución      | 240×240              |
| Tamaño          | 1.28 pulgadas        |
| Interfaz        | SPI                  |
| Profundidad de color | 65K colores (RGB565) |
| Librería driver | Arduino_GFX_Library  |

Lo elegí porque es barato, una pantalla circular queda genial para un medidor, y la interfaz SPI es lo bastante rápida para que la aguja no deje estela al girar.

### VL53L0X-V2 sensor de medición de distancia por láser

El VL53L0X es un sensor de medición de distancia por láser basado en el principio de tiempo de vuelo (ToF). En cristiano: dispara un láser infrarrojo que tú no puedes ver, cronometra cuánto tarda el láser en rebotar contra un objeto y volver, y a partir de ahí calcula la distancia. Es la misma idea que la ecolocalización de los murciélagos, solo que usa luz en lugar de sonido.

| Parámetro        | Valor                                                    |
| ----------------- | -------------------------------------------------------- |
| Rango de medición | 30mm～1200mm (en modo larga distancia, hasta ~2000mm)    |
| Precisión         | ±3%                                                      |
| Interfaz          | I2C (hasta 400kHz)                                       |
| Longitud de onda  | 940nm (invisible al ojo humano, láser Class 1, seguro)   |

Lo elegí porque no le afecta el color ni el material del objeto (comparado con la medición infrarroja por reflexión o los ultrasonidos, casi no le importa la superficie), es tan pequeño que cabe en cualquier caja, y por I2C solo necesita dos hilos de señal.

> 💡 **Aviso: este módulo casi nunca trae cubierta óptica (a mí se me olvidó comprarla junto con el módulo)**
>
> Para las pruebas de desarrollo funciona perfectamente «en pelota», pero conviene conocer algunas trampillas de antemano:
>
> - **No toques la superficie del chip con el dedo**: las dos ventanas de cristal del chip, más pequeñas que una semilla de sésamo (una emisora, otra receptora) temen el polvo, la grasa y la humedad. Si se ensucian, el polvo dispersa el láser de vuelta y provoca «diafonía (crosstalk)»: la distancia medida se acorta sin motivo, los números saltan, y en casos graves deja de funcionar.
> - **Si se ensucia, no frotes a lo loco**: desde luego no lo limpies con el bajo de la camiseta o una servilleta (lo rayarás enseguida). Si solo es polvo, dale un toque con un **soplador (perilla de aire)**; si hay grasa, usa un bastoncillo con una gotita de **alcohol isopropílico** y pasa suavemente, después deja que se evapore.
> - **Bajo luz intensa «se queda ciego»**: la luz del sol y la de bombillas incandescentes antiguas contienen infrarrojos; sin cubierta, la distancia máxima se reduce bastante. Sobre una mesa en interior apenas se nota, pero si lo vas a usar en el exterior, tenlo en cuenta.
>
> Si más adelante planeas meterlo en una caja para uso prolongado: **no pongas cinta adhesiva transparente normal ni un cristal cualquiera delante del chip**: los materiales corrientes reflejan los infrarrojos y el sensor interpretará la cubierta como un obstáculo, quedándose bloqueado en `0mm` o en pocos centímetros. O bien haces un agujero para que asome, o compras una **cubierta filtrante de infrarrojos de 940nm** y la pegas lo más cerca posible (separación menor a 1mm).

## Lista BOM (componentes)

| Componente                          | Cantidad | Notas                                     |
| ----------------------------------- | -------- | ----------------------------------------- |
| Placa ESP32-S3                      | 1        | Cualquier modelo con suficientes GPIO     |
| Pantalla circular GC9A01 1.28" (SPI) | 1        | Confirma que es la versión SPI, no paralelo |
| Módulo ToF VL53L0X-V2               | 1        | Versión para placa de protoboard          |
| Cables Dupont                       | varios   |                                           |

## Descripción de pines de los componentes

### Pines del GC9A01

| Pin       | Función                                                       |
| --------- | ------------------------------------------------------------- |
| VCC       | Polo positivo de alimentación, a 3.3V                         |
| GND       | Masa                                                          |
| SCL/CLK   | Línea de reloj SPI                                            |
| SDA/MOSI  | Línea de datos SPI                                            |
| CS        | Chip select, el chip trabaja con nivel bajo                   |
| DC        | Pin de conmutación dato/comando                               |
| RST       | Pin de reset                                                  |
| BL        | Pin de control de retroiluminación (algunos módulos no lo exponen; puedes ignorarlo) |

### Pines del VL53L0X-V2

| Pin   | Función                                                                                  |
| ----- | ---------------------------------------------------------------------------------------- |
| VIN   | Polo positivo de alimentación                                                            |
| GND   | Masa                                                                                     |
| SCL   | Reloj serie I2C                                                                          |
| SDA   | Datos serie I2C                                                                          |
| GPIO1 | Salida de interrupción, indica si hay datos listos (este proyecto no la usa, déjala al aire) |
| XSHUT | Pin de apagado; por defecto en alto para funcionamiento normal, en bajo entra en modo apagado (este proyecto no lo usa, déjalo al aire) |

## Forma de cableado

Te recomiendo cablear fila a fila según la tabla e ir marcando cada cable conforme lo conectes; te ahorrarás el 80% del tiempo de depuración.

### ESP32-S3 a la pantalla GC9A01

| Pantalla GC9A01 | ESP32-S3                                                       |
| --------------- | -------------------------------------------------------------- |
| VCC             | 3.3V                                                           |
| GND             | GND                                                            |
| SCL / CLK       | GPIO12                                                         |
| SDA / MOSI      | GPIO11                                                         |
| CS              | GPIO9                                                          |
| DC              | GPIO10                                                         |
| RST             | GPIO18                                                         |
| BL              | GPIO7 (controlado por código) o directo a 3.3V (algunas placas no tienen control independiente de retroiluminación) |

### ESP32-S3 al sensor VL53L0X-V2

| VL53L0X-V2 | ESP32-S3                       |
| ---------- | ------------------------------ |
| VIN        | 3.3V                           |
| GND        | GND                            |
| SDA        | GPIO13                         |
| SCL        | GPIO14                         |
| GPIO1      | Sin conectar                   |
| XSHUT      | Sin conectar (pull-up interno por defecto) |

> ⚠️ **Atención**: los pines I2C por defecto del ESP32-S3 suelen ser GPIO8 (SDA) / GPIO9 (SCL), pero en este proyecto GPIO9 ya lo ocupa el CS de la pantalla, así que el I2C del sensor se ha movido manualmente a GPIO13/GPIO14. En el código, `Wire.begin(I2C_SDA, I2C_SCL)` especifica esos dos pines. Al cablear, no vuelvas a los pines por defecto por ahorrar tiempo, porque la pantalla y el sensor se pisarán mutuamente y no funcionará ninguno de los dos.

## Librerías necesarias

Desde Arduino IDE, busca e instala mediante el «Gestor de librerías»:

- `Arduino_GFX_Library` (autor moononournation) — versión probada v1.6.5
- `Adafruit_VL53L0X` (autor Adafruit) — versión probada v1.2.5; al instalar te pedirá instalar también `Adafruit BusIO`, acéptalo

Versión del IDE: Arduino IDE 2.3.8; el paquete de soporte de la placa ESP32 usado es el 3.3.10. Si tus versiones difieren mucho puedes topar con incompatibilidades de API, así que mejor alinéalas.

## Código completo

### Programa principal del medidor

```cpp
/*
 * ═══════════════════════════════════════════════════════
 *  Medidor cyberpunk · Cyber Gauge Dashboard
 *  Pantalla circular GC9A01 (240×240) + VL53L0X-V2 medición de distancia por láser
 *  MCU: ESP32-S3
 *  Librería driver: Arduino_GFX_Library v1.6.5
 * ═══════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <Arduino_GFX_Library.h>

// ───────── Definición de colores (Arduino_GFX v1.6.5 requiere definición manual) ─────────
#define BLACK       0x0000
#define WHITE       0xFFFF
#define RED         0xF800
#define GREEN       0x07E0
#define BLUE        0x001F
#define CYAN        0x07FF
#define YELLOW      0xFFE0
#define ORANGE      0xFD20
#define DARKGREY    0x4208
#define LIGHTGREY   0xC618

// Colores del tema cyberpunk
#define CYBER_BG      0x0841    // Fondo profundo
#define CYBER_PANEL   0x1082    // Color del panel
#define CYBER_BLUE    0x06DF    // Azul fluorescente
#define CYBER_CYAN    0x07F5    // Cian fluorescente
#define CYBER_GREEN   0x47E0    // Verde fluorescente
#define CYBER_RED     0xF806    // Rojo de alerta
#define CYBER_ORANGE  0xFB40    // Naranja
#define CYBER_YELLOW  0xFF80    // Amarillo
#define CYBER_DIM     0x4A49    // Color tenue

// ───────── Definición de pines ─────────
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// El VL53L0X va por I2C aparte, evitando el GPIO9 que ya usa TFT_CS
#define I2C_SDA   13
#define I2C_SCL   14

// ───────── Tamaño de pantalla ─────────
#define SCREEN_W  240
#define SCREEN_H  240
#define CX        120     // Centro X
#define CY        120     // Centro Y

// ───────── Parámetros del medidor ─────────
#define GAUGE_R       95      // Radio del arco de escala
#define GAUGE_WIDTH   10      // Grosor del arco
#define NEEDLE_LEN    78      // Longitud de la aguja
#define START_ANGLE   135     // Ángulo inicial (grados)
#define END_ANGLE     405     // Ángulo final (grados)
#define MAX_DIST      800     // Distancia máxima mostrada mm
#define MIN_DIST      20      // Distancia mínima mm
#define TICK_COUNT    16      // Número de marcas

// ───────── Objetos globales ─────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1 /* MISO */
);

Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0 /* rotation */, true /* IPS */
);

Adafruit_VL53L0X lox = Adafruit_VL53L0X();
Arduino_Canvas *canvas;   // Lienzo fuera de pantalla, elimina el parpadeo

// ───────── Variables de estado ─────────
float currentAngle = START_ANGLE;
float targetAngle  = START_ANGLE;
int   currentDist  = 0;
int   lastDist     = -1;

// ═══════════════════════════════════════
//  Funciones de utilidad
// ═══════════════════════════════════════

// Mezcla de colores RGB565
uint16_t blendColor(uint16_t c1, uint16_t c2, float t) {
  uint8_t r1 = (c1 >> 11) & 0x1F, g1 = (c1 >> 5) & 0x3F, b1 = c1 & 0x1F;
  uint8_t r2 = (c2 >> 11) & 0x1F, g2 = (c2 >> 5) & 0x3F, b2 = c2 & 0x1F;
  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;
  return (r << 11) | (g << 5) | b;
}

// Color según la distancia (cerca=rojo, lejos=verde)
uint16_t getDistColor(int dist) {
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  if (ratio < 0.15)  return CYBER_RED;
  if (ratio < 0.30)  return blendColor(CYBER_RED, CYBER_ORANGE, (ratio - 0.15) / 0.15);
  if (ratio < 0.50)  return blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.30) / 0.20);
  if (ratio < 0.70)  return blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.50) / 0.20);
  return blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.70) / 0.30);
}

// Texto de estado
const char* getStatusText(int dist) {
  if (dist < 100) return "DANGER";
  if (dist < 200) return "WARNING";
  if (dist < 400) return "CAUTION";
  if (dist < 600) return "SAFE";
  return "CLEAR";
}

// ═══════════════════════════════════════
//  Funciones de dibujo
// ═══════════════════════════════════════

// Dibuja un arco grueso (simulado con segmentos cortos)
void drawArc(Arduino_Canvas *c, int cx, int cy, int r,
             float startDeg, float endDeg, int thickness,
             uint16_t color) {
  float step = 1.5;  // Ángulo por paso
  for (float a = startDeg; a <= endDeg; a += step) {
    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// Dibuja un arco con degradado
void drawGradientArc(Arduino_Canvas *c, int cx, int cy, int r,
                     float startDeg, float endDeg, int thickness) {
  float totalAngle = endDeg - startDeg;
  float step = 1.5;

  for (float a = startDeg; a <= endDeg; a += step) {
    float ratio = (a - startDeg) / totalAngle;
    uint16_t color;

    // Rojo -> Naranja -> Amarillo -> Cian -> Verde
    if (ratio < 0.2)       color = blendColor(CYBER_RED, CYBER_ORANGE, ratio / 0.2);
    else if (ratio < 0.4)  color = blendColor(CYBER_ORANGE, CYBER_YELLOW, (ratio - 0.2) / 0.2);
    else if (ratio < 0.6)  color = blendColor(CYBER_YELLOW, CYBER_CYAN, (ratio - 0.4) / 0.2);
    else                   color = blendColor(CYBER_CYAN, CYBER_GREEN, (ratio - 0.6) / 0.4);

    float rad = a * DEG_TO_RAD;
    int x = cx + cos(rad) * r;
    int y = cy + sin(rad) * r;
    c->fillCircle(x, y, thickness / 2, color);
  }
}

// Dibuja las marcas de la escala
void drawTicks(Arduino_Canvas *c) {
  float totalAngle = END_ANGLE - START_ANGLE;

  for (int i = 0; i <= TICK_COUNT; i++) {
    float angle = START_ANGLE + (float)i / TICK_COUNT * totalAngle;
    float rad = angle * DEG_TO_RAD;
    float ratio = (float)i / TICK_COUNT;

    // Color de la marca
    uint16_t color;
    if (ratio < 0.2)       color = CYBER_RED;
    else if (ratio < 0.4)  color = CYBER_ORANGE;
    else if (ratio < 0.6)  color = CYBER_YELLOW;
    else if (ratio < 0.8)  color = CYBER_CYAN;
    else                   color = CYBER_GREEN;

    // Marca larga / corta
    bool isMajor = (i % 4 == 0);
    int innerR  = GAUGE_R + 4;
    int outerR  = innerR + (isMajor ? 12 : 6);
    int thick   = isMajor ? 2 : 1;

    int x1 = CX + cos(rad) * innerR;
    int y1 = CY + sin(rad) * innerR;
    int x2 = CX + cos(rad) * outerR;
    int y2 = CY + sin(rad) * outerR;

    // Dibuja la marca
    for (int t = 0; t < thick; t++) {
      c->drawLine(x1 + t, y1, x2 + t, y2, color);
    }

    // Etiqueta numérica en las marcas principales
    if (isMajor) {
      int labelR = outerR + 12;
      int lx = CX + cos(rad) * labelR;
      int ly = CY + sin(rad) * labelR;
      int val = (float)i / TICK_COUNT * MAX_DIST;

      c->setTextColor(CYBER_DIM);
      c->setTextSize(1);
      c->setCursor(lx - 8, ly - 4);
      c->print(val);
    }
  }
}

// Dibuja la aguja
void drawNeedle(Arduino_Canvas *c, float angleDeg, uint16_t color) {
  float rad = angleDeg * DEG_TO_RAD;

  // Punta de la aguja
  int tipX = CX + cos(rad) * NEEDLE_LEN;
  int tipY = CY + sin(rad) * NEEDLE_LEN;

  // Base de la aguja (dos puntos perpendiculares a la dirección de la aguja)
  float perpRad = rad + PI / 2;
  int baseW = 4;
  int bx1 = CX + cos(perpRad) * baseW;
  int by1 = CY + sin(perpRad) * baseW;
  int bx2 = CX - cos(perpRad) * baseW;
  int by2 = CY - sin(perpRad) * baseW;

  // Dibuja la aguja triangular
  c->fillTriangle(tipX, tipY, bx1, by1, bx2, by2, color);

  // Aro decorativo central
  c->fillCircle(CX, CY, 7, CYBER_PANEL);
  c->drawCircle(CX, CY, 7, color);
  c->fillCircle(CX, CY, 3, color);
}

// Dibuja el medidor completo
void drawDashboard(int dist) {
  canvas->fillScreen(CYBER_BG);

  // Aro exterior decorativo
  canvas->drawCircle(CX, CY, 118, CYBER_PANEL);

  // Arco de fondo (pista oscura)
  drawArc(canvas, CX, CY, GAUGE_R,
          START_ANGLE, END_ANGLE, GAUGE_WIDTH, CYBER_PANEL);

  // Arco con degradado (completo)
  drawGradientArc(canvas, CX, CY, GAUGE_R,
                  START_ANGLE, END_ANGLE, GAUGE_WIDTH);

  // Marcas
  drawTicks(canvas);

  // Cálculo del ángulo de la aguja
  float ratio = constrain((float)dist / MAX_DIST, 0.0, 1.0);
  targetAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);

  // Interpolación suave
  currentAngle += (targetAngle - currentAngle) * 0.15;

  // Obtiene el color
  uint16_t needleColor = getDistColor(dist);

  // Dibuja la aguja
  drawNeedle(canvas, currentAngle, WHITE);

  // ── Zona central de números ──
  // Valor de distancia
  canvas->setTextColor(WHITE);
  canvas->setTextSize(3);
  String distStr = String(dist);
  int textW = distStr.length() * 18;
  canvas->setCursor(CX - textW / 2, CY + 16);
  canvas->print(distStr);

  // Unidad
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 6, CY + 42);
  canvas->print("mm");

  // Título
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(CX - 30, CY - 28);
  canvas->print("LASER RANGE");

  // Indicador de estado
  canvas->setTextColor(needleColor);
  canvas->setTextSize(1);
  const char* status = getStatusText(dist);
  int sLen = strlen(status);
  canvas->setCursor(CX - sLen * 3, CY + 56);
  canvas->print(status);

  // Envía a la pantalla
  canvas->flush();
}

// ═══════════════════════════════════════
//  setup() & loop()
// ═══════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n═══ Cyber Gauge Dashboard ═══");

  // Paso 1: encender la retroiluminación
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // Paso 2: inicializar la pantalla
  gfx->begin();
  gfx->fillScreen(BLACK);
  gfx->setRotation(0);

  // Paso 3: crear el lienzo fuera de pantalla (doble búfer para evitar parpadeo)
  canvas = new Arduino_Canvas(SCREEN_W, SCREEN_H, gfx);
  canvas->begin();

  // Pantalla de arranque
  canvas->fillScreen(CYBER_BG);
  canvas->setTextColor(CYBER_BLUE);
  canvas->setTextSize(2);
  canvas->setCursor(40, 100);
  canvas->print("CYBER");
  canvas->setCursor(40, 125);
  canvas->print("GAUGE");
  canvas->setTextColor(CYBER_DIM);
  canvas->setTextSize(1);
  canvas->setCursor(55, 160);
  canvas->print("Booting...");
  canvas->flush();

  delay(1000);

  // Paso 4: inicializar I2C y el sensor (ojo: aquí se usan pines personalizados, no los por defecto)
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("¡VL53L0X inicialización fallida!");
    canvas->fillScreen(CYBER_BG);
    canvas->setTextColor(CYBER_RED);
    canvas->setTextSize(1);
    canvas->setCursor(50, 110);
    canvas->print("SENSOR ERROR");
    canvas->setCursor(40, 130);
    canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(100);
  }

  Serial.println("VL53L0X listo ✓");

  // Paso 5: arrancar el modo de medición continua
  lox.startRangeContinuous();

  Serial.println("¡Medidor arrancado!");
}

void loop() {
  // Leer distancia
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();

    // Filtrar valores no válidos
    if (dist > 0 && dist < 8190) {
      // Filtro de suavizado sencillo para evitar que salten los números
      currentDist = currentDist * 0.7 + dist * 0.3;
      currentDist = constrain(currentDist, MIN_DIST, MAX_DIST);

      // Solo redibujar cuando el cambio supera un umbral, para ahorrar rendimiento
      if (abs(currentDist - lastDist) > 2) {
        drawDashboard(currentDist);
        lastDist = currentDist;

        Serial.printf("Distancia: %d mm\n", currentDist);
      }
    }
  }

  delay(30);  // ~33 FPS
}
```

### Código de prueba del sensor (recomendado ejecutarlo primero)

Antes de cargar el programa principal, te recomiendo encarecidamente subir antes este código mínimo para confirmar que el sensor funciona correctamente; si algo falla, también es más fácil aislar el problema sin tener que buscar entre un montón de código de dibujo.

```cpp
/*
 *  Prueba del sensor VL53L0X
 */

#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define I2C_SDA  13
#define I2C_SCL  14

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Prueba del sensor VL53L0X");

  Wire.begin(I2C_SDA, I2C_SCL);

  if (!lox.begin()) {
    Serial.println("❌ Sensor no encontrado, revisa el cableado!");
    while (1);
  }

  Serial.println("✓ Sensor listo, comenzando la medición...");
  lox.startRangeContinuous();
}

void loop() {
  if (lox.isRangeComplete()) {
    int dist = lox.readRange();
    Serial.printf("Distancia: %d mm\n", dist);
  }
  delay(100);
}
```

### Explicación del código

Algunos puntos clave que pueden liar, destaco por separado:

- **`blendColor()`**: mezcla dos colores RGB565 en la proporción `t`, usado para lograr el degradado rojo→naranja→amarillo→cian→verde del arco. No cambia de color de golpe, por eso se ve suave.
- **`Arduino_Canvas` (lienzo fuera de pantalla)**: todo el dibujo se hace primero en un lienzo en memoria y al final se envía de golpe con `flush()` a la pantalla, en lugar de trazar directamente sobre ella. Si no lo hicieras así, al girar la aguja verías parpadeos y «tearing» bastante evidentes.
- **Filtro de suavizado `currentDist * 0.7 + dist * 0.3`**: la lectura cruda del sensor tiene pequeñas oscilaciones; aquí se aplica un filtro pasa-bajos de primer orden sencillo para que la aguja se mueva de forma más suave y no dé sobresaltos.
- **`I2C_SDA=13, I2C_SCL=14`**: la trampa que repetimos en la sección de cableado; la refresco aquí: estos no son los pines I2C por defecto del ESP32-S3, se han cambiado manualmente porque el GPIO9 por defecto lo ocupa el CS de la pantalla.

## Resolución de problemas habituales

Tranqui, el 80% de los problemas vienen por estos sitios:

1. **Tras flashear, la pantalla se queda completamente negra**
   Primero comprueba que `TFT_BL` (retroiluminación) está bien cableado y que se ejecuta `digitalWrite(TFT_BL, HIGH)` en el código; después revisa si el pin RST hace mal contacto. Un RST flojo es la causa más habitual de pantalla negra en módulos circulares.

2. **El puerto serie imprime «VL53L0X inicialización fallida!»**
   El 99% de las veces es cableado: confirma que VIN/GND no están invertidos, que SDA/SCL van realmente a GPIO13/GPIO14 (y no a los GPIO8/9 por defecto) y que los cables Dupont no están flojos. Puedes ejecutar aparte el «código de prueba del sensor» para descartar la interferencia de la pantalla.

3. **La pantalla enciende, pero se ve corrupta / con bandas / colores raros**
   Lo más probable es mal contacto en la línea de reloj o de datos de SPI, o que los cables Dupont sean demasiado largos y la señal se degrade. Comprueba que SCL/SDA corresponden a GPIO12/GPIO11 y mantén los cables Dupont por debajo de 15 cm.

4. **La aguja salta como loca y los números no paran de cambiar**
   Suele ser que el coeficiente del filtro es insuficiente, o que hay objetos reflectantes o transparentes delante del sensor interfiriendo. Puedes cambiar los pesos `currentDist * 0.7 + dist * 0.3` a `0.85/0.15`: el filtro será más fuerte (a cambio de una respuesta más lenta).

5. **Error de compilación: no se encuentra `Adafruit_VL53L0X.h` o `Arduino_GFX_Library.h`**
   Significa que la librería no está bien instalada. Ve al Gestor de librerías, busca el nombre exacto y reinstala; cuidado con instalar un fork de terceros con el mismo nombre.

6. **El ángulo de la aguja no cuadra con los números de la escala**
   Comprueba si has reducido `MAX_DIST` sin actualizar también las etiquetas de las marcas: ambos deben mantenerse consistentes, si no los números y la posición real de la aguja quedarán desplazados.

## Preguntas frecuentes (FAQ)

**P: ¿Cuáles son los pines I2C por defecto del ESP32-S3?**
R: Por defecto suelen ser GPIO8 (SDA) y GPIO9 (SCL), pero en este proyecto GPIO9 lo ocupa el CS de la pantalla, por eso el I2C del sensor se ha movido a GPIO13/GPIO14.

**P: ¿Qué distancia máxima mide el VL53L0X y con qué precisión?**
R: El fabricante indica un rango efectivo de unos 30mm～1200mm (en modo larga distancia puede llegar hasta 2000mm), con una precisión de ±3%.

**P: ¿La pantalla circular GC9A01 es táctil?**
R: El GC9A01 en sí es solo un controlador de pantalla y no incluye función táctil; algunos módulos del mercado integran adicionalmente un chip táctil capacitivo. Antes de comprar, confirma si la variante concreta lleva o no táctil.

**P: ¿El láser del VL53L0X daña los ojos?**
R: No. Es un producto láser Class 1, con longitud de onda de 940nm invisible al ojo humano y potencia extremadamente baja, cumple los estándares de seguridad ocular; no hay de qué preocuparse en uso normal.

**P: La pantalla GC9A01 no enciende pero la alimentación es correcta, ¿por qué?**
R: La causa más habitual es un mal contacto en el pin RST (reset), o que el pin de retroiluminación BL no esté en alto. Empieza descartando esas dos cosas.

**P: ¿Por qué el código usa el lienzo fuera de pantalla `Arduino_Canvas` en lugar de dibujar directamente en la pantalla?**
R: Dibujar directamente provoca parpadeos y «tearing» evidentes al girar la aguja y al redibujar los arcos; usar un lienzo como doble búfer y refrescar de una sola vez deja la imagen nítida.

**P: ¿Hay diferencia entre el VL53L0X-V2 y el VL53L0X normal?**
R: El principio de medición y la definición de pines son los mismos; la «V2» suele ser una revisión que el fabricante del módulo hace en el diseño del circuito impreso y la regulación de tensión. Para diferencias concretas, consulta la documentación del módulo que hayas comprado.

**P: ¿La alimentación USB del ESP32-S3 es suficiente para este proyecto?**
R: Sí. El consumo conjunto de pantalla y sensor no es alto; una alimentación USB normal de 5V/500mA va sobrada.

## Ideas para seguir jugando

- Añade un zumbador que suene cuando la distancia entre en la zona DANGER: tienes un radar de aparcamiento casero en un momento.
- Guarda el historial de distancias y dibuja una gráfica en tiempo real para observar la trayectoria de un objeto en movimiento.
- Pon dos botones para cambiar la unidad mostrada (mm / cm / inch).
- Imprime una caja con ventosa para el parabrisas y úsalo de verdad como sensor de marcha atrás.

## Referencias

- [Hoja de datos oficial del ST VL53L0X](https://www.st.com/en/imaging-and-photonics-solutions/vl53l0x.html)
- [Repositorio GitHub de Adafruit_VL53L0X](https://github.com/adafruit/Adafruit_VL53L0X)
- [Repositorio GitHub de Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Página oficial del producto Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3)
