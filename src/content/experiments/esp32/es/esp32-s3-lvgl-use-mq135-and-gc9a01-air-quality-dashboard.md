---
title: "ESP32-S3 con GC9A01 circular + MQ135: Tutorial completo de panel de calidad del aire (LVGL v9 + SPI + Arduino C++)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
category: esp32
date: 2026-06-25
intro: 'Usa ESP32-S3 + sensor de gas MQ135 + pantalla circular GC9A01 de 1.28", junto con LVGL v9, para crear un panel de calidad del aire con indicador de arco animado, gráfico de tendencia en tiempo real y efectos de iluminación de "respiración", incluye conexiones completas, código y registro de problemas.'
image: "https://img.lingflux.com/2026/06/4217f9f4026039eeca35a691450313dc.jpg"
---




> Dificultad: ⭐⭐☆☆☆ (listo para usar con unos pocos cables Dupont)
> Tiempo estimado: 45 minutos
> Entorno de prueba: Arduino IDE 2.3.8 · ESP32 Arduino Core 3.x · lvgl v9.5.0 · Arduino_GFX_Library v1.6.5

---

> **TL;DR (¿Solo quieres ejecutarlo? Mira aquí)**
>
> **Gestión de expectativas:** Este proyecto es solo para introducción, decoración de escritorio y disfrute visual puro. **¡No lo uses para detectar fugas reales de gas peligroso!** Su precisión es básicamente "misteriosa".
>
> 1. **Conexiones**: MQ135 A0 → GPIO 13; GC9A01 conecta según la tabla a GPIO 7 / 9 / 10 / 11 / 12 / 18
> 2. **Instalar bibliotecas**: Gestor de bibliotecas de Arduino busca `lvgl` (selecciona v9.x) + `Arduino_GFX_Library`
> 3. **Configurar lv_conf.h**: Habilita `LV_FONT_MONTSERRAT_14` y `LV_FONT_MONTSERRAT_28` (cambia 0 → 1)
> 4. Cargar → la pantalla circular se ilumina, el indicador comienza a girar

---

## Introducción

En mi pila de sensores acumulando polvo, encontré otro sensor especializado en la detección de la calidad del aire: el módulo MQ135. Pensando en verificar la calidad del aire de mi estudio, lo conecté para probarlo. La documentación me indicó que este módulo necesita un precalentamiento de 24 horas, lo que me hizo sentir que solo podría usarse para jugar. Sin embargo, este módulo es sensible a varios gases. Aunque no necesariamente preciso, cuando el valor aumenta, relativamente existe cierto gas, que puede ser dióxido de carbono, amoníaco, benceno, alcohol, humo. Usarlo para juzgar valores relativos sobre si la habitación necesita ventilación debería ser posible.

Así surgió este proyecto: ESP32-S3 + sensor de gas MQ135 + pantalla circular GC9A01 de 1.28 pulgadas, junto con la famosa biblioteca gráfica LVGL v9, para crear un panel de calidad del aire con indicador de arco, gráfico de líneas de tendencia en tiempo real y efectos de "respiración" de color.

Objetivo de este artículo: **Desde cero con las conexiones hasta una carga exitosa, reproducir este efecto por completo.**

---

## Resultados del experimento

La pantalla circular muestra en tiempo real el valor ADC de calidad del aire actual, el nivel de estado (EXCELLENT / GOOD / FAIR / MODERATE / POOR / DANGER) y el gráfico de tendencias históricas; el color del indicador cambia gradualmente de verde a rojo según la calidad del aire, con un efecto de iluminación de "respiración" rítmico en el círculo exterior. La esquina inferior izquierda de la pantalla también registra el valor mínimo y máximo desde el encendido actual.



---

## Descripción de componentes

> La placa de desarrollo (ESP32-S3) no se presenta en este artículo. A continuación, solo se describen los dos módulos que los novatos pueden no haber接触ado.

### Sensor de gas MQ135

El MQ135 es un sensor de gas sensible, responsable de detectar cambios en la concentración de gases dañinos como CO₂, amoníaco, benceno en el aire. En este proyecto, su función es generar un valor ADC analógico de 0 a 4095, reflejando el nivel de calidad del aire del entorno actual.

En palabras sencillas: **Es una "nariz" química**, cuanto más contaminado el aire, mayor es el voltaje de salida y mayor es el valor ADC.

| Parámetro | Valor |
|-----------|-------|
| Voltaje de operación estándar | 5V (calefactor) / salida analógica compatible con 3.3V |
| Interfaz de salida | Analógica (A0) + digital (D0) |
| Tiempo de calentamiento | 24～48 horas (precisión completa) /约 3 minutos (referencia de tendencias) |
| Gases detectables | CO₂, NH₃, NOₓ, benceno, alcohol, humo |

**Acerca de la alimentación 3.3V:** El voltaje estándar del MQ135 es 5V. Cuando se alimenta con 3.3V, la potencia del calefactor es aproximadamente el 44% de la estándar, la sensibilidad disminuye y las lecturas son más bajas, pero es suficiente para mostrar tendencias y detectar cambios relativos. Si buscas precisión absoluta, se recomienda alimentar VCC por separado con 5V; la salida analógica A0 no excede 3.3V, por lo que puede conectarse directamente a ESP32-S3 sin división de voltaje.

Motivo de su elección: **Barato (menos de 5 yuanes), modular, se puede usar conectando directamente**, suficiente para este proyecto "orientado a la estética".

**Uso correcto del MQ135 para juzgar ambientes interiores**

```
✅ Adecuado para:
  - Monitoreo de tendencias de cambios en la calidad del aire (valores relativos)
  - Juicio de umbral para activar ventilación/alarmas
  - Indicador de "contaminación integral" de múltiples gases dañinos

❌ No adecuado para:
  - Medición precisa de concentración de un solo gas
  - Detección de seguridad de cumplimiento médico/industrial
  - Valores precisos de CO₂ (el error puede ser ±300ppm o más)
```

---

### Pantalla TFT circular GC9A01 de 1.28 pulgadas

La GC9A01 es una pantalla TFT LCD circular de 1.28 pulgadas que recibe datos de imagen a través de la interfaz SPI y los renderiza. En este proyecto, su función es mostrar la interfaz de indicador con efectos de animación.

Analogía: **Es como esos indicadores circulares en relojes inteligentes que pueden mostrar contenido arbitrario.**

| Parámetro | Valor |
|-----------|-------|
| Tamaño de pantalla | 1.28 pulgadas |
| Resolución | 240 × 240 píxeles |
| Interfaz | SPI (máx. 80 MHz) |
| Chip controlador | GC9A01 |
| Voltaje de operación | 3.3V |
| Control de retroiluminación | Compatible (pin BL, atenuación PWM) |

Motivo de su elección: **Apariencia circular única, tamaño compacto, uso directo con 3.3V, soporte nativo de Arduino_GFX_Library**, combinado con LVGL produce efectos visuales de indicador excepcionales.

---

## Lista de materiales (BOM)

| Componente | Modelo / Especificación | Cantidad |
|-----------|-------------------------|----------|
| Placa principal | ESP32-S3 (con USB-C) | 1 |
| Pantalla TFT circular | GC9A01 1.28" 240×240 | 1 |
| Sensor de gas | Módulo MQ135 | 1 |
| Cables de conexión | Cables Dupont | Varios |



---

## Descripción de pines de componentes

### Pines del módulo MQ135

| Pin | Descripción |
|-----|-------------|
| VCC | Alimentación (este proyecto conecta a 3.3V, estándar es 5V) |
| GND | Tierra |
| A0 | Salida de señal analógica, conecta al pin ADC de ESP32-S3 |
| D0 | Salida digital (no se usa en este proyecto) genera **nivel alto/bajo (HIGH / LOW)** |

### Pines del módulo GC9A01

| Etiqueta de pin | Descripción |
|-----------------|-------------|
| VCC | Alimentación 3.3V |
| GND | Tierra |
| SCL / CLK | Reloj SPI |
| SDA / MOSI | Datos SPI |
| CS | Selección de chip (activo bajo) |
| DC | Cambio dato/comando |
| RST | Reset (reset activo bajo) |
| BL | Control de retroiluminación (HIGH = encendido) (opcional, no todos los módulos lo tienen) |

---

## Diagrama de conexiones

### MQ135 → ESP32-S3

| MQ135 | ESP32-S3 |
|-------|----------|
| VCC | 5V |
| GND | GND |
| A0 | GPIO 13 |

### GC9A01 → ESP32-S3

| Pin GC9A01 | GPIO ESP32-S3 |
|------------|---------------|
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO 12 |
| SDA / MOSI | GPIO 11 |
| CS | GPIO 9 |
| DC | GPIO 10 |
| RST | GPIO 18 |
| BL (retroiluminación) | GPIO 7 (opcional, si no está disponible no es necesario conectar) |

> **Recordatorio práctico:** Después de conectar todos los cables, verifica línea por línea comparando con las dos tablas anteriores, esto puede ahorrar 80% del tiempo de depuración. Lo más fácil de conectar al revés son DC y CS — si intercambias estos dos cables, la pantalla quedará completamente blanca o negra, parece que "la pantalla está rota", pero en realidad los cables están mal conectados.

---

## Bibliotecas necesarias para instalar

Abre Arduino IDE → Herramientas → Administrar bibliotecas, busca e instala las siguientes dos:

| Biblioteca | Autor | Versión probada |
|------------|-------|-----------------|
| `lvgl` | LVGL | v9.5.0 |
| `Arduino_GFX_Library` | Moon On Our Nation | v1.6.5 |

**Después de instalar lvgl, hay un paso obligatorio más:**

1. Encuentra el directorio de la biblioteca lvgl (generalmente en `Documentos/Arduino/libraries/lvgl/`)
2. Copia `lv_conf_template.h` que está dentro, renómbralo como `lv_conf.h`, colócalo en el mismo directorio que `lvgl/`
3. Abre `lv_conf.h`, encuentra las siguientes dos líneas, cambia `0` por `1`:
   ```c
   #define LV_FONT_MONTSERRAT_14  1
   #define LV_FONT_MONTSERRAT_28  1
   ```
4. Abre `lv_conf.h`, encuentra al principio `#if 0` y cámbialo por `#if 1`

> Si olvidas estos pasos y cargas directamente, la compilación fallará con `lv_font_montserrat_28 undeclared`. No me preguntes cómo lo sé.

---

## Código completo

```cpp
/*
 * ESP32-S3 + Panel de calidad del aire con pantalla circular GC9A01 v3.1
 * "Estilo tecnológico minimalista" - barra de progreso de arco + gráfico de tendencias en tiempo real + iluminación de "respiración"
 *
 * Entorno de prueba: Arduino IDE 2.3.2 / ESP32 Core 3.x
 * Bibliotecas dependientes: lvgl v9.2.x + Arduino_GFX_Library v1.4.x
 */

#include <Arduino.h>
#include <lvgl.h>
#include <Arduino_GFX_Library.h>
#include <math.h>

// ===================== Definición de pines =====================
#define TFT_SCK    12   // Reloj SPI
#define TFT_MOSI   11   // Datos SPI
#define TFT_CS     9    // Selección de chip
#define TFT_DC     10   // Cambio dato/comando (si se conecta al revés la pantalla queda totalmente blanca)
#define TFT_RST    18   // Reset
#define TFT_BL     7    // Retroiluminación - debe estar HIGH para encender, si olvidas conectar este cable es inútil
#define MQ135_PIN  13   // Entrada analógica MQ135 (canal ADC2, uso normal sin Wi-Fi)

#define SCREEN_WIDTH   240
#define SCREEN_HEIGHT  240

// ===================== Inicialización del controlador de pantalla =====================
Arduino_ESP32SPI bus = Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01 gfx = Arduino_GC9A01(&bus, TFT_RST, 0, true);

// ===================== Búfer de dibujo LVGL =====================
// Búfer de 40 líneas ocupa aproximadamente 19KB en ESP32-S3, equilibrio entre velocidad y memoria
#define DRAW_BUF_LINES 40
alignas(4) static uint16_t draw_buf[SCREEN_WIDTH * DRAW_BUF_LINES];

// ===================== Datos históricos de tendencias =====================
#define TREND_POINTS 40    // Mantiene los últimos 40 puntos de muestreo (× 300ms ≈ 12 segundos de historia en pantalla)
static int trendData[TREND_POINTS] = {0};
static int trendIdx = 0;
static bool trendFull = false;
static lv_point_precise_t trendLinePoints[TREND_POINTS];

// ===================== Manejadores de objetos UI de LVGL =====================
static lv_obj_t *arc_bg;          // Fondo del arco (oscuro)
static lv_obj_t *arc_main;        // Arco principal + punto knob en el extremo
static lv_obj_t *glow_circle;     // Círculo de borde brillante externo (respira)
static lv_obj_t *center_circle;   // Disco central base
static lv_obj_t *label_value;     // Número grande central (valor ADC)
static lv_obj_t *label_unit;      // Etiqueta de unidad "ADC"
static lv_obj_t *label_status;    // Texto de estado (EXCELLENT / GOOD...)
static lv_obj_t *dot_status;      // Punto pequeño de estado
static lv_obj_t *label_title;     // Título superior "AIR QUALITY"
static lv_obj_t *label_score;     // Puntuación de limpieza inferior
static lv_obj_t *label_minmax;    // Valores mínimo/máximo
static lv_obj_t *trend_line;      // Gráfico de líneas de tendencia
static lv_obj_t *trend_container; // Contenedor de recorte del gráfico

// ===================== Estado del sensor =====================
static float smoothedValue = 0.0f; // Valor suavizado después del promedio ponderado exponencial
static bool firstSample = true;    // Indicador del primer frame, evita animación desde 0
static int minValue = 4095;        // Valor ADC mínimo desde el encendido actual
static int maxValue = 0;           // Valor ADC máximo desde el encendido actual
static float displayValue = 0.0f;  // Para interpolación de animación UI

// ===================== Callback de reloj LVGL =====================
static uint32_t my_tick_cb(void) { return millis(); }

// ===================== Callback de flush: LVGL renderiza un área y la envía a la pantalla =====================
void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = area->x2 - area->x1 + 1;
  uint32_t h = area->y2 - area->y1 + 1;
  gfx.draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)px_map, w, h);
  lv_display_flush_ready(disp); // Le dice a LVGL: esta área está completa, puede continuar con la siguiente
}

// ===================== Sistema de color: valor ADC → color de estado =====================
// Valor más alto = aire peor = color más rojo, seis niveles corresponden a seis estados
uint32_t getColorHex(int v) {
  if (v < 600)  return 0x00E5A0; // EXCELLENT: verde fresco
  if (v < 1200) return 0x22C55E; // GOOD: verde claro
  if (v < 2000) return 0xA3E635; // FAIR: verde amarillento
  if (v < 2800) return 0xEAB308; // MODERATE: amarillo
  if (v < 3500) return 0xF97316; // POOR: naranja
  return 0xFF3355;                // DANGER: rojo (abre la ventana ya)
}

lv_color_t getColor(int v) {
  return lv_color_hex(getColorHex(v));
}

// Color base del arco (versión oscura del color de estado, para fondo oscuro)
uint32_t getDimColorHex(int v) {
  if (v < 600)  return 0x0A2A20;
  if (v < 1200) return 0x0A2A15;
  if (v < 2000) return 0x1A2A10;
  if (v < 2800) return 0x2A2208;
  if (v < 3500) return 0x2A1808;
  return 0x2A0A10;
}

const char* getStatusText(int v) {
  if (v < 600)  return "EXCELLENT";
  if (v < 1200) return "GOOD";
  if (v < 2000) return "FAIR";
  if (v < 2800) return "MODERATE";
  if (v < 3500) return "POOR";
  return "DANGER";
}

// Valor ADC a porcentaje de limpieza (ADC más bajo = más limpio = puntuación más alta)
int adcToScore(int adc) {
  adc = constrain(adc, 0, 4095);
  return constrain(100 - (adc * 100 / 4095), 0, 100);
}

// ===================== Crear interfaz UI =====================
void create_ui() {
  lv_obj_t *scr = lv_screen_active();

  // Primer paso: fondo oscuro
  lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(scr, lv_color_hex(0x050810), 0);

  // Segundo paso: borde brillante más externo (color sigue el estado, con animación de respiración)
  glow_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(glow_circle);
  lv_obj_set_size(glow_circle, 234, 234);
  lv_obj_center(glow_circle);
  lv_obj_set_style_radius(glow_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(glow_circle, LV_OPA_TRANSP, 0);
  lv_obj_set_style_border_width(glow_circle, 2, 0);
  lv_obj_set_style_border_opa(glow_circle, LV_OPA_20, 0);
  lv_obj_set_style_border_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(glow_circle, 30, 0);
  lv_obj_set_style_shadow_spread(glow_circle, 2, 0);
  lv_obj_set_style_shadow_opa(glow_circle, LV_OPA_30, 0);
  lv_obj_set_style_shadow_color(glow_circle, lv_color_hex(0x00E5A0), 0);
  lv_obj_clear_flag(glow_circle, LV_OBJ_FLAG_SCROLLABLE);

  // Tercer paso: color base del arco (muestra el área oscura de "aún no alcanzado")
  arc_bg = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_bg);
  lv_obj_set_size(arc_bg, 210, 210);
  lv_obj_center(arc_bg);
  lv_arc_set_range(arc_bg, 0, 100);
  lv_arc_set_bg_angles(arc_bg, 135, 45);
  lv_arc_set_value(arc_bg, 0);
  lv_obj_set_style_arc_width(arc_bg, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(0x0A2A20), LV_PART_MAIN);
  lv_obj_set_style_arc_rounded(arc_bg, true, LV_PART_MAIN);
  lv_obj_set_style_arc_width(arc_bg, 0, LV_PART_INDICATOR);
  lv_obj_set_style_arc_opa(arc_bg, LV_OPA_TRANSP, LV_PART_INDICATOR);
  lv_obj_set_style_bg_opa(arc_bg, LV_OPA_TRANSP, LV_PART_KNOB);
  lv_obj_clear_flag(arc_bg, LV_OBJ_FLAG_CLICKABLE);

  // Cuarto paso: arco principal (valor en tiempo real + punto knob en el extremo)
  arc_main = lv_arc_create(scr);
  lv_obj_remove_style_all(arc_main);
  lv_obj_set_size(arc_main, 210, 210);
  lv_obj_center(arc_main);
  lv_arc_set_range(arc_main, 0, 4095);
  lv_arc_set_bg_angles(arc_main, 135, 45);
  lv_arc_set_value(arc_main, 0);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_MAIN);
  lv_obj_set_style_arc_opa(arc_main, LV_OPA_TRANSP, LV_PART_MAIN);

  lv_obj_set_style_arc_width(arc_main, 18, LV_PART_INDICATOR);
  lv_obj_set_style_arc_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_INDICATOR);
  lv_obj_set_style_arc_rounded(arc_main, true, LV_PART_INDICATOR);

  // knob = punto brillante en el extremo, borde blanco + interior relleno con color de estado + sombra brillante
  lv_obj_set_style_bg_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_bg_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_pad_all(arc_main, 5, LV_PART_KNOB);
  lv_obj_set_style_radius(arc_main, LV_RADIUS_CIRCLE, LV_PART_KNOB);
  lv_obj_set_style_border_width(arc_main, 3, LV_PART_KNOB);
  lv_obj_set_style_border_color(arc_main, lv_color_hex(0xFFFFFF), LV_PART_KNOB);
  lv_obj_set_style_border_opa(arc_main, LV_OPA_COVER, LV_PART_KNOB);
  lv_obj_set_style_shadow_width(arc_main, 18, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, lv_color_hex(0x00E5A0), LV_PART_KNOB);
  lv_obj_set_style_shadow_opa(arc_main, LV_OPA_70, LV_PART_KNOB);
  lv_obj_set_style_shadow_spread(arc_main, 2, LV_PART_KNOB);
  lv_obj_clear_flag(arc_main, LV_OBJ_FLAG_CLICKABLE);

  // Quinto paso: disco central (coloca valores, gráfico de tendencias, texto de estado)
  center_circle = lv_obj_create(scr);
  lv_obj_remove_style_all(center_circle);
  lv_obj_set_size(center_circle, 140, 140);
  lv_obj_center(center_circle);
  lv_obj_set_style_radius(center_circle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(center_circle, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(center_circle, lv_color_hex(0x080E1A), 0);
  lv_obj_set_style_bg_grad_color(center_circle, lv_color_hex(0x0C1628), 0);
  lv_obj_set_style_bg_grad_dir(center_circle, LV_GRAD_DIR_VER, 0);
  lv_obj_set_style_border_width(center_circle, 1, 0);
  lv_obj_set_style_border_color(center_circle, lv_color_hex(0x1A3050), 0);
  lv_obj_set_style_border_opa(center_circle, LV_OPA_60, 0);
  lv_obj_set_style_pad_all(center_circle, 0, 0);
  lv_obj_clear_flag(center_circle, LV_OBJ_FLAG_SCROLLABLE);

  // Número grande central
  label_value = lv_label_create(center_circle);
  lv_label_set_text(label_value, "0");
  lv_obj_set_style_text_font(label_value, &lv_font_montserrat_28, 0);
  lv_obj_set_style_text_color(label_value, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_value, LV_ALIGN_CENTER, 0, -26);

  // Etiqueta de unidad
  label_unit = lv_label_create(center_circle);
  lv_label_set_text(label_unit, "ADC");
  lv_obj_set_style_text_font(label_unit, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_unit, lv_color_hex(0x506878), 0);
  lv_obj_align(label_unit, LV_ALIGN_CENTER, 0, -6);

  // Contenedor del gráfico de tendencias (responsable de recortar, evita que el gráfico se salga de los límites)
  trend_container = lv_obj_create(center_circle);
  lv_obj_remove_style_all(trend_container);
  lv_obj_set_size(trend_container, 110, 30);
  lv_obj_align(trend_container, LV_ALIGN_CENTER, 0, 16);
  lv_obj_set_style_bg_opa(trend_container, LV_OPA_TRANSP, 0);
  lv_obj_set_style_pad_all(trend_container, 0, 0);
  lv_obj_set_style_clip_corner(trend_container, true, 0);
  lv_obj_set_style_radius(trend_container, 4, 0);
  lv_obj_clear_flag(trend_container, LV_OBJ_FLAG_SCROLLABLE);

  // Línea de referencia base en la parte inferior del gráfico
  static lv_point_precise_t refPts[2] = {{0, 28}, {110, 28}};
  lv_obj_t *refLine = lv_line_create(trend_container);
  lv_line_set_points(refLine, refPts, 2);
  lv_obj_set_style_line_color(refLine, lv_color_hex(0x1A2535), 0);
  lv_obj_set_style_line_width(refLine, 1, 0);

  // Gráfico de tendencias (inicializa todos los puntos en la parte inferior)
  for (int i = 0; i < TREND_POINTS; i++) {
    trendLinePoints[i].x = (int32_t)(i * 110 / (TREND_POINTS - 1));
    trendLinePoints[i].y = 28;
  }
  trend_line = lv_line_create(trend_container);
  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
  lv_obj_set_style_line_color(trend_line, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_line_width(trend_line, 2, 0);
  lv_obj_set_style_line_rounded(trend_line, true, 0);
  lv_obj_set_style_line_opa(trend_line, LV_OPA_70, 0);

  // Punto pequeño de estado
  dot_status = lv_obj_create(center_circle);
  lv_obj_remove_style_all(dot_status);
  lv_obj_set_size(dot_status, 8, 8);
  lv_obj_set_style_radius(dot_status, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_opa(dot_status, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_width(dot_status, 8, 0);
  lv_obj_set_style_shadow_color(dot_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_set_style_shadow_opa(dot_status, LV_OPA_50, 0);
  lv_obj_align(dot_status, LV_ALIGN_CENTER, -42, 42);

  // Texto de estado
  label_status = lv_label_create(center_circle);
  lv_label_set_text(label_status, "EXCELLENT");
  lv_obj_set_style_text_font(label_status, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_status, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_status, LV_ALIGN_CENTER, 3, 42);

  // Título superior
  label_title = lv_label_create(scr);
  lv_label_set_text(label_title, "AIR QUALITY");
  lv_obj_set_style_text_font(label_title, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_title, lv_color_hex(0x4A6070), 0);
  lv_obj_set_style_text_letter_space(label_title, 3, 0);
  lv_obj_align(label_title, LV_ALIGN_TOP_MID, 0, 60);

  // Puntuación inferior
  label_score = lv_label_create(scr);
  lv_label_set_text(label_score, "100% CLEAN");
  lv_obj_set_style_text_font(label_score, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_score, lv_color_hex(0x00E5A0), 0);
  lv_obj_align(label_score, LV_ALIGN_BOTTOM_MID, 0, -8);

  // Registro MIN/MAX (encima de la puntuación inferior)
  label_minmax = lv_label_create(scr);
  lv_label_set_text(label_minmax, "L:-- H:--");
  lv_obj_set_style_text_font(label_minmax, &lv_font_montserrat_14, 0);
  lv_obj_set_style_text_color(label_minmax, lv_color_hex(0x3A4A5A), 0);
  lv_obj_align(label_minmax, LV_ALIGN_BOTTOM_MID, 0, -24);
}

// ===================== Actualizar datos del gráfico de tendencias =====================
void updateTrend(int value) {
  trendData[trendIdx] = value;
  trendIdx = (trendIdx + 1) % TREND_POINTS;
  if (trendIdx == 0) trendFull = true;

  int count = trendFull ? TREND_POINTS : trendIdx;
  if (count < 2) return;

  // Encuentra el rango de datos, para normalizar a la altura del gráfico
  int vMin = 4095, vMax = 0;
  for (int i = 0; i < count; i++) {
    if (trendData[i] < vMin) vMin = trendData[i];
    if (trendData[i] > vMax) vMax = trendData[i];
  }
  // Garantiza amplitud mínima de fluctuación — si el aire es muy estable, el gráfico no es una línea plana muerta
  if (vMax - vMin < 50) vMax = vMin + 50;

  int chartW = 110;
  int chartH = 26;

  for (int i = 0; i < TREND_POINTS; i++) {
    int x = i * chartW / (TREND_POINTS - 1);
    int y;
    if (i < count) {
      int dataIdx = trendFull ? (trendIdx + i) % TREND_POINTS : i;
      int normalized = (trendData[dataIdx] - vMin) * chartH / (vMax - vMin);
      y = chartH - normalized + 1; // eje Y invertido: valor más alto, punto más arriba
    } else {
      y = chartH + 1; // Posiciones sin datos primero en la parte inferior
    }
    trendLinePoints[i].x = x;
    trendLinePoints[i].y = y;
  }

  lv_line_set_points(trend_line, trendLinePoints, TREND_POINTS);
}

// ===================== Actualizar pantalla UI =====================
void update_ui(int value, int raw) {
  value = constrain(value, 0, 4095);
  raw   = constrain(raw, 0, 4095);

  // Animación suave: cada frame se acerca al objetivo 18%, cambios de números suaves sin brusquedad
  float diff = (float)value - displayValue;
  displayValue += diff * 0.18f;
  int dispVal = (int)(displayValue + 0.5f);

  lv_color_t c  = getColor(dispVal);
  uint32_t dimC = getDimColorHex(dispVal);
  int score     = adcToScore(dispVal);

  // Actualiza registros min/max
  if (raw < minValue) minValue = raw;
  if (raw > maxValue) maxValue = raw;

  // Arco principal + knob color sigue el estado
  lv_arc_set_value(arc_main, dispVal);
  lv_obj_set_style_arc_color(arc_main, c, LV_PART_INDICATOR);
  lv_obj_set_style_bg_color(arc_main, c, LV_PART_KNOB);
  lv_obj_set_style_shadow_color(arc_main, c, LV_PART_KNOB);

  // Color base del轨道
  lv_obj_set_style_arc_color(arc_bg, lv_color_hex(dimC), LV_PART_MAIN);

  // Círculo brillante externo: color sigue el estado + función seno simula transparencia de respiración
  lv_obj_set_style_border_color(glow_circle, c, 0);
  lv_obj_set_style_shadow_color(glow_circle, c, 0);
  static uint32_t breathCount = 0;
  breathCount++;
  float sinVal = sinf((breathCount * 6) % 360 * 3.14159f / 180.0f);
  lv_opa_t breathOpa = (lv_opa_t)(LV_OPA_20 + (int)(sinVal * 25.0f));
  lv_obj_set_style_shadow_opa(glow_circle, breathOpa, 0);
  lv_opa_t borderOpa = (lv_opa_t)(LV_OPA_10 + (int)(sinVal * 15.0f));
  lv_obj_set_style_border_opa(glow_circle, borderOpa, 0);

  // Valor central
  lv_label_set_text_fmt(label_value, "%d", dispVal);
  lv_obj_set_style_text_color(label_value, c, 0);

  // Texto de estado + punto pequeño (la sombra del punto pequeño también respira)
  lv_label_set_text(label_status, getStatusText(dispVal));
  lv_obj_set_style_text_color(label_status, c, 0);
  lv_obj_set_style_bg_color(dot_status, c, 0);
  lv_obj_set_style_shadow_color(dot_status, c, 0);
  lv_opa_t dotOpa = (lv_opa_t)(LV_OPA_30 + (int)(sinVal * 40.0f));
  lv_obj_set_style_shadow_opa(dot_status, dotOpa, 0);

  // Color del gráfico de tendencias
  lv_obj_set_style_line_color(trend_line, c, 0);

  // MIN/MAX
  lv_label_set_text_fmt(label_minmax, "L:%d  H:%d", minValue, maxValue);

  // Puntuación de limpieza inferior
  const char *statusWord;
  if (score >= 80)      statusWord = "CLEAN";
  else if (score >= 60) statusWord = "FAIR";
  else if (score >= 40) statusWord = "HAZY";
  else if (score >= 20) statusWord = "DIRTY";
  else                  statusWord = "TOXIC";
  lv_label_set_text_fmt(label_score, "%d%% %s", score, statusWord);
  lv_obj_set_style_text_color(label_score, c, 0);
}

// ===================== setup =====================
void setup() {
  Serial.begin(115200);
  delay(200);

  // Primer paso: retroiluminación a HIGH, sin este paso la pantalla siempre está negra
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);

  // Segundo paso: configurar ADC (precisión de 12 bits, rango 0-3.3V)
  // Nota: ADC_11db en ESP32 Core 3.x equivale a ADC_ATTEN_DB_12, compatible con sintaxis antigua
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Tercer paso: iniciar pantalla, frecuencia SPI 40MHz
  gfx.begin(40000000);

  // Cuarto paso: inicializar LVGL
  lv_init();
  lv_tick_set_cb(my_tick_cb);

  lv_display_t *disp = lv_display_create(SCREEN_WIDTH, SCREEN_HEIGHT);
  lv_display_set_color_format(disp, LV_COLOR_FORMAT_RGB565);
  lv_display_set_buffers(disp, draw_buf, NULL, sizeof(draw_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(disp, my_disp_flush);

  // Quinto paso: construir interfaz, inicializar a valor 0
  create_ui();
  displayValue = 0;
  update_ui(0, 0);

  Serial.println("[SYS] Gauge v3.1 Ready!");
}

// ===================== loop =====================
void loop() {
  static uint32_t lastSensorMs = 0;
  static uint32_t lastTrendMs  = 0;
  static uint32_t lastLogMs    = 0;

  uint32_t now = millis();

  // Cada 50ms: leer sensor + actualizar UI (约 20fps, fluido sin sensación de tartamudeo)
  if (now - lastSensorMs >= 50) {
    int raw = analogRead(MQ135_PIN);
    raw = constrain(raw, 0, 4095);

    if (firstSample) {
      // Primer frame asigna directamente, omite transición de animación desde 0
      smoothedValue = raw;
      displayValue  = raw;
      firstSample   = false;
    } else {
      // Promedio ponderado exponencial: nuevo valor 12%, valor anterior 88%, suave pero no lento
      smoothedValue = smoothedValue * 0.88f + raw * 0.12f;
    }

    update_ui((int)smoothedValue, raw);
    lastSensorMs = now;
  }

  // Cada 300ms: empujar un punto de datos al gráfico de tendencias (40 puntos × 300ms ≈ 12 segundos cubren una pantalla de historia)
  if (now - lastTrendMs >= 300) {
    updateTrend((int)smoothedValue);
    lastTrendMs = now;
  }

  // Cada 1s: salida de registro de depuración por puerto serie (abre monitor serie para ver al investigar problemas)
  if (now - lastLogMs >= 1000) {
    Serial.printf("SCORE=%d%%  ADC=%d  SMOOTH=%d  L=%d H=%d [%s]\n",
                  adcToScore((int)smoothedValue),
                  analogRead(MQ135_PIN),
                  (int)smoothedValue,
                  minValue, maxValue,
                  getStatusText((int)smoothedValue));
    lastLogMs = now;
  }

  lv_timer_handler(); // Programación de tareas internas LVGL, debe llamarse periódicamente, no omitir
  delay(5);
}
```

### Explicación del código

Varios diseños clave explicados, de lo contrario el código puede ser confuso:

**① ¿Por qué usar promedio ponderado exponencial en lugar de mostrar directamente el ADC crudo?**

La salida analógica del MQ135 tiene cierto ruido. Si mostramos el número directamente, saltará constantemente. La fórmula de promedio exponencial ponderado (EMA):

```
Nuevo valor suavizado = Valor anterior × 0.88 + Valor crudo × 0.12
```

El peso de 0.12 significa que los nuevos datos tienen menos impacto, los cambios de valor son suaves pero siguen la tendencia. Si quieres una respuesta más sensible, aumenta `0.12f` (máximo 1.0 = completamente sin suavizado); para más estabilidad, aumenta `0.88f`.

**② ¿Cómo se implementa el efecto de respiración?**

En `update_ui()` se usa `sinf()` para generar un valor que cambia periódicamente de -1 a +1, mapeado al rango de transparencia (`LV_OPA_20` ～ `LV_OPA_45`). El contador se incrementa en cada llamada. La transparencia del borde y sombra del círculo externo se desvanecen y aparecen periódicamente, como si "respirara".

**③ ¿Por qué el gráfico de tendencias a veces es plano?**

Cuando el ambiente es muy estable y la diferencia entre máximo y mínimo de los datos históricos es muy pequeña, el gráfico se fuerza a tener un rango de fluctuación de al menos 50 ADC:

```cpp
if (vMax - vMin < 50) vMax = vMin + 50;
```

Así, incluso si el aire no cambia, el gráfico no se convierte en una línea plana muerta, y aún se pueden ver fluctuaciones mínimas.

---

## Solución de problemas comunes

No entres en pánico, el 80% de los problemas ocurren en estos lugares:

**Pantalla completamente negra, sin ninguna reacción**
Primero: verifica que el pin BL esté conectado a GPIO 7 y que en el código se ejecute `digitalWrite(TFT_BL, HIGH)`. Si la retroiluminación no está encendida, la pantalla estará negra — esto no significa que la pantalla esté rota, es que la retroiluminación no se ha llevado a HIGH.

**Pantalla completamente blanca o completamente roja (con color pero sin contenido)**
90% de probabilidad de que los pines DC y CS estén conectados al revés. Verifica estos dos cables comparando con la tabla de conexiones, o simplemente intercámbialos para probar.

**Error de compilación: `lv_font_montserrat_28 undeclared`**
`lv_conf.h` no está configurado correctamente o está en la ubicación incorrecta. Revisa la sección "Bibliotecas necesarias para instalar", sigue los pasos para cambiar las opciones de fuente de 0 a 1.

**La lectura ADC siempre es 0 o 4095 sin cambios**
Usa un multímetro para medir el voltaje de salida del pin A0 del MQ135, normalmente debería fluctuar entre 0.5V～2.5V. Si es 0V verifica la conexión VCC; si es rango completo (3.3V), el sensor puede no haberse calentado lo suficiente — sensores nuevos acaban de encenderse, las lecturas son inestables, espera 3 minutos y revisa nuevamente.

**Los valores mostrados fluctúan demasiado**
Cambia el coeficiente de suavizado `0.88f` en el código a un valor mayor (por ejemplo `0.95f`), el suavizado aumenta, el costo es una respuesta más lenta.

**LVGL indica memoria insuficiente durante compilación o se congela en tiempo de ejecución**
Cambia `DRAW_BUF_LINES` de 40 a un valor menor (por ejemplo 20), reduce el uso del búfer. La RAM estándar de ESP32-S3 es suficiente, este problema solo se encuentra en placas con RAM más pequeña.

---

## Preguntas frecuentes

**P: ¿El GPIO 13 es fijo? ¿Se puede cambiar a otro pin ADC?**
R: Sí se puede cambiar. En ESP32-S3, GPIO 1～10 pertenecen a ADC1, GPIO 11～20 pertenecen a ADC2. Este proyecto no usa Wi-Fi, los pines ADC2 (incluido GPIO 13) no tienen conflicto y se usan normalmente. Si posteriormente agregas Wi-Fi, se recomienda cambiar el sensor a pines ADC1 (GPIO 1～10), para evitar errores de lectura cuando Wi-Fi ocupa ADC2.

**P: ¿El MQ135 conectado a 3.3V es preciso o no?**
R: No es suficientemente preciso, pero es completamente adecuado para mostrar tendencias. El voltaje nominal del MQ135 es 5V. Cuando se alimenta con 3.3V, la potencia del calefactor es aproximadamente el 44% de la estándar, la sensibilidad disminuye y el valor absoluto es más bajo. Si quieres convertir a concentración ppm, se recomienda alimentar VCC por separado con 5V; la salida analógica A0 no excede 3.3V, no necesita circuito divisor de voltaje adicional.

**P: ¿Es obligatorio usar LVGL v9? ¿Puede funcionar con v8?**
R: v8 no puede ejecutar este código directamente. v9 introdujo nuevas API como `lv_display_t`, `lv_display_create`, que no existen en v8. La compilación directa generará muchos errores. Se recomienda encarecidamente instalar versiones desde v9.2.x en adelante, no降gradar.

**P: Las cuatro esquinas de la pantalla circular tienen "muescas" negras, ¿están dañadas por la soldadura?**
R: Fenómeno normal, no es un problema. GC9A01 tiene un área de visualización circular, el buffer subyacente es cuadrado 240×240, las cuatro esquinas son estructuras físicas de bloqueo de luz de la pantalla, no hay píxeles reales, es correcto que no muestren contenido.

**P: El valor del sensor salta mucho cuando se enciende por primera vez, ¿cuánto tiempo debo esperar para que se estabilice?**
R: El MQ135 necesita calentamiento. Para sensores nuevos, se recomienda encender continuamente 24～48 horas antes de que las lecturas se estabilicen; para sensores ya usados, después de encender aproximadamente 3 minutos las lecturas tienden a estabilizarse. Puedes agregar `delay(180000)` (3 minutos) al final de `setup()`, o agregar un indicador de estado "calentando" en la UI, y comenzar oficialmente la recolección después del tiempo.

**P: La actualización de pantalla es un poco lenta, ¿cómo acelerarla?**
R: Dos direcciones: ① Cambia la frecuencia SPI en `gfx.begin(40000000)` a 80MHz (GC9A01 admite máximo 80MHz, pero algunas placas con mala calidad de ruteo pueden ser inestables, se recomienda probar primero); ② Aumenta `DRAW_BUF_LINES` (por ejemplo a 60), reduce el número de actualizaciones parciales de LVGL, el costo es ocupar aproximadamente 9KB más de RAM.

---

## Extensiones posibles

Después de ejecutarlo, puedes continuar expandiendo en estas direcciones:

- Conectar BME280, agregar temperatura y humedad, el indicador muestra una línea adicional de datos
- Reportar datos ADC a Home Assistant por Wi-Fi, crear gráficos históricos a largo plazo
- Agregar botones para cambiar modos de visualización (indicador / modo de números grandes / solo gráfico)
- Cambiar a sensor MQ-7, monitorear específicamente concentración de monóxido de carbono
- Agregar zumbador, activar alarma cuando la calidad del aire entra en zona DANGER

---

## Materiales de referencia

- [Manual del chip controlador GC9A01 (Galaxycore oficial)](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Especificaciones del sensor MQ135 (Winsen 炜盛 oficial)](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ135%20(Ver1.4)%20-%20Manual.pdf)
- [Página GitHub de Arduino_GFX_Library](https://github.com/moononournation/Arduino_GFX)
- [Documentación oficial de LVGL v9](https://docs.lvgl.io/9.0/)
<!-- - [Manual de referencia técnica ESP32-S3 (Espressif oficial)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf) -->
