---
title: "ESP32-S3 + GC9A01 pantalla circular brújula: HMC5883L experimento divertido, pero no confíes en él al aire libre (tutorial completo)"
boardId: esp32s3
moduleId: display/tft128-gc9a01
moduleIds:
  - display/tft128-gc9a01
  - sensor/hmc5883l
category: esp32
date: 2026-06-10
intro: "Construí una brújula electrónica con ESP32-S3 + GC9A01 pantalla circular + HMC5883L, pero al terminar descubrí que la precisión es cuestionable. Este artículo documenta completamente el cableado, calibración y código, y explica por qué esta solución solo es adecuada para demostraciones experimentales, no para aplicaciones de navegación serias."
image: "https://img.lingflux.com/2026/06/79dbcadeea8dba2436b055a92f76fc20.jpg"
---



# Registro completo de la brújula circular ESP32-S3 + GC9A01 + HMC5883L — Se puede hacer, se ve bien, pero la precisión ya sabes (tutorial completo)

Dificultad: ⭐⭐⭐☆☆ (conociendo un poco los conceptos básicos puedes empezar)
Tiempo estimado: 45 minutos
Entorno de prueba: Arduino IDE 2.3.8 · Arduino_GFX_Library v1.6.5 · Adafruit_HMC5883_U v1.2.4

---

> ⚠️ **Conclusión primero:** La brújula hecha con esta solución se ve impresionante y la dirección general es correcta, pero la precisión típica está entre ±5°~±15°, muy afectada por el campo magnético circundante. Para aprender el flujo de drivers, hacer demostraciones o usar como adorno de escritorio — totalmente suficiente. Para navegación al aire libre, orientación de drones o cualquier situación que requiera precisión estricta — **no recomendado**, más adelante explico por qué.

> **TL;DR (inicio rápido):**
> 1. Primero ejecuta un escaneo I2C para confirmar la dirección del chip — `0x0D` es QMC5883L (clon), `0x1E` es el verdadero HMC5883L, instala la librería correspondiente según el modelo, de lo contrario las lecturas serán basura
> 2. Conecta los 12 cables según la tabla de cableado (8 para la pantalla + 4 para el sensor, 3.3V/GND se pueden compartir)
> 3. Cambia `DECLINATION_DEG` a la declinación magnética de tu ciudad (Pekín aprox. -6.5°, Tokio aprox. -7.5°, enlace de consulta al final del artículo)
> 4. Al encender, mantén presionado el botón BOOT (GPIO0) para entrar en la calibración de rotación de 15 segundos, gira lentamente una vuelta completa en horizontal
> 5. Al soltar, los datos de calibración se guardan automáticamente en NVS, no se pierden al apagar, la próxima vez se usan directamente

---

## Prefacio

Cuando compré esta pantalla circular GC9A01, la miré fijamente un rato — 1.28 pulgadas, 240×240, un círculo perfecto. ¿No es esta la esfera de brújula perfecta?

Luego me pasé un fin de semana haciéndola, abrí el teléfono para comparar... bueno, la aguja marca la dirección correcta en general, solo que se desvía un poco, unos diez grados más o menos. Despues de girar un par de veces más, me di cuenta de que dejaba de moverse. Apagué y volví a encender, y seguía sin moverse mucho...

"Seguro que no está bien calibrada." Volví a calibrar, cambié de lugar para medir, di vueltas comparando con el iPhone — la diferencia seguía ahí. No es que el código esté mal, es una limitación inherente del módulo sensor. Se puede observar que al acercar el teléfono, también le afecta.

Así que este artículo tiene dos propósitos: primero, construir la brújula de pantalla circular completa, con código funcional y calibración que pase, el resultado es realmente bonito; segundo, explicar claramente sus limitaciones de precisión, para que sepas "dónde falla" antes de empezar — y no descubras después que la aguja no coincide con Google Maps.

Si quieres aprender el método de driver para GC9A01 + HMC5883L, o hacer un adorno de escritorio llamativo, este proyecto vale totalmente la pena. Si tu objetivo es "precisión de navegación", te sugiero ir directamente a la sección "¿Es adecuado para proyectos serios?" más adelante, y luego decidir si continúas.

---

## Resultado del experimento

![](https://img.lingflux.com/2026/06/61587ad00164cf25e866feb4066e069f.jpg)

La pantalla circular GC9A01 muestra en tiempo real una esfera de brújula: la aguja roja apunta al norte, los números verdes centrales muestran el acimut actual (0°~359°), las letras amarillas indican las ocho direcciones más cercanas (N / NE / E / SE / S / SW / W / NW). Al encender, mantén presionado el botón BOOT para entrar en el modo de calibración de rotación de 15 segundos; la pantalla muestra una barra de progreso y el rango de campo magnético en tiempo real; una vez completada la calibración, el movimiento de la aguja es suave, aproximadamente 25fps, sin los temblores que se ven sin calibrar.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/DDc_7iRCPy8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

> **Sobre la precisión, seamos claros:** El HMC5883L calibrado en un entorno ideal (lejos de metal y otras fuentes de campo magnético) tiene un error de acimut de aproximadamente ±5°. Cerca de la CPU de un ordenador, cargadores, altavoces o destornilladores, el error sube fácilmente a ±15° o más. En uso diario de escritorio "la dirección general es correcta", pero no sé si el módulo que compré es original, a veces se bloquea y no se mueve, no puedes esperar precisión en las decenas de grados. Esta es una limitación inherente del hardware, no un problema de código; la sección "¿Es adecuado para proyectos serios?" lo explica en detalle.

---

## Descripción de componentes

**Pantalla TFT circular GC9A01**

Imagina una pantalla de reloj circular de 3.2 cm de diámetro — la GC9A01 es exactamente eso, interfaz SPI, resolución 240×240, el driver está integrado en el controlador de la pantalla, el ESP32 solo necesita enviar píxeles directamente, no necesita RAM externa. La elegí porque, primero, la forma circular es naturalmente ideal para una UI de brújula, y segundo, Arduino_GFX_Library tiene soporte completo, el código del driver se resuelve en pocas líneas.

| Parámetro | Especificación |
| --- | --- |
| Resolución | 240 × 240 px |
| Interfaz | SPI (máximo 80 MHz) |
| Alimentación | 3.3V |
| Control de retroiluminación | Nivel alto para encender |
| Consumo típico | Aprox. 20 mA (máximo brillo) |



**Módulo de pantalla GC9A01 (8 pines)**

| Etiqueta del pin | Función |
| ---------- | -------------------- |
| VCC | Alimentación 3.3V |
| GND | Tierra |
| SCL / CLK | Reloj SPI |
| SDA / MOSI | Datos SPI (maestro→esclavo) |
| CS | Selección de chip, activo en bajo |
| DC | Selección datos/comando |
| RST | Reset por hardware, activo en bajo |
| BL | Control de retroiluminación, nivel alto para encender |



**Magnetómetro de tres ejes HMC5883L / QMC5883L**

El magnetómetro es el "olfato" de la brújula, responsable de detectar la intensidad del campo magnético terrestre en las tres direcciones X/Y/Z, y luego usar funciones trigonométricas inversas para calcular hacia dónde te facing. Interfaz I2C, alimentación 3.3V, la lectura de datos tarda solo unos milisegundos.

Hay que aclarar algo especial: la gran mayoría de los módulos etiquetados como "HMC5883L" en el mercado usan en realidad el chip QMC5883L de la empresa QST — ambos son compatibles en pines, pero los registros son completamente diferentes, y las librerías driver correspondientes tampoco son iguales. **No te precipites instalando la librería, sigue el paso de escaneo I2C más abajo para confirmar qué chip tienes, y luego instala la librería correspondiente; esto te ahorrará la mayor parte del tiempo de troubleshooting.**

| Parámetro | HMC5883L (original) | QMC5883L (clon) |
| --- | --- | --- |
| Dirección I2C | 0x1E | 0x0D |
| Rango de medición | ±8 Gauss | ±8 Gauss |
| Resolución | 2 mGauss | 2 mGauss |
| Densidad de ruido | ~2 mGauss/√Hz | ~2 mGauss/√Hz |



**Módulo magnetómetro HMC5883L / QMC5883L (4 pines de uso común)**

| Etiqueta del pin | Función |
| -------- | ------------------------------------ |
| VCC | Alimentación 3.3V |
| GND | Tierra |
| SDA | Datos I2C |
| SCL | Reloj I2C |
| DRDY | Interrupción de datos listos (no se usa en este proyecto, no es necesario conectar) |

El rendimiento básico de ambos es similar, no hay problema para uso en demostraciones experimentales. Pero hay que ser claro: independientemente del chip, los módulos de magnetómetro en este rango de precio no tienen compensación de deriva térmica en chip, ni fusión de sensores; solo hacen mediciones bidimensionales básicas de campo magnético — esto determina su límite de precisión y también determina que solo son adecuados para demostraciones y aprendizaje, no para aplicaciones de navegación reales.

---

## Lista de materiales (BOM)

| Componente | Modelo / Especificación | Cantidad | Precio de referencia |
| --- | --- | --- | --- |
| Placa de desarrollo | ESP32-S3 (cualquier placa) | 1 | ¥25~40 |
| Pantalla TFT circular | GC9A01, 1.28 pulgadas, 240×240 | 1 | ¥12~20 |
| Módulo magnetómetro | HMC5883L o QMC5883L | 1 | ¥3~8 |
| Cables Dupont | Macho a hembra, 20cm | Varios | ¥3 |

---

## Esquema de cableado

> Se recomienda verificar cable por cable con la tabla después de conectar; este paso evita el 80% del tiempo de troubleshooting de "¿por qué no funciona?".

**Pantalla circular GC9A01 → ESP32-S3**

| Pin de la pantalla | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SCL / CLK | GPIO12 |
| SDA / MOSI | GPIO11 |
| CS | GPIO9 |
| DC | GPIO10 |
| RST | GPIO18 |
| BL | GPIO7 (o conectar directamente a 3.3V para luz permanente) |

**HMC5883L / QMC5883L → ESP32-S3**

| Pin del sensor | ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO14 |
| SCL | GPIO13 |



---

## Librerías necesarias

Antes de instalar, haz una cosa — confirma el modelo de tu chip magnetómetro. Sube el siguiente código, abre el monitor serie (115200), y mira la dirección I2C que se imprime:

```cpp
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(13, 14);  // SDA=13, SCL=14, consistente con este proyecto

  Serial.println("Escaneando I2C...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("Dispositivo encontrado en 0x%02X\n", addr);
    }
  }
  Serial.println("Listo.");
}

void loop() {}
```

- Si imprime `0x1E` → es un verdadero HMC5883L, instala **Adafruit HMC5883 Unified** (por Adafruit)
- Si imprime `0x0D` → es un QMC5883L, necesitas cambiar el `#include` y el objeto sensor en el código por la librería correspondiente (ver pregunta frecuente #3)

Después de confirmar el chip, abre Arduino IDE → Gestor de librerías, busca e instala:

| Nombre de librería | Chip compatible | Versión probada |
| --- | --- | --- |
| Arduino_GFX_Library | — | v1.6.5 |
| Adafruit HMC5883 Unified | HMC5883L (0x1E) | v1.2.4 |
| Adafruit Unified Sensor | Necesaria para ambos | v1.1.15 |

Si tienes un QMC5883L (0x0D), hay una solución alternativa en las preguntas frecuentes más adelante.

---

## Código completo

```cpp
#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>
#include <Preferences.h>
#include <math.h>

// ─── Paso 1: Definición de pines ────────────────────────────────
#define TFT_SCK  12
#define TFT_MOSI 11
#define TFT_CS    9
#define TFT_DC   10
#define TFT_RST  18
#define TFT_BL    7
#define I2C_SDA  14
#define I2C_SCL  13

// Mantén presionado este botón al encender para entrar en modo calibración (botón BOOT, GPIO0, no necesita botón adicional)
#define CAL_BTN   0

// Declinación magnética (oeste es negativo) — Herramienta de consulta: https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
// Pekín ≈ -6.5°, Shanghái ≈ -5.5°, Guangzhou ≈ -3°, Tokio ≈ -7.5°
// Si no cambias este valor, la brújula se desviará X grados, todas las direcciones estarán mal
#define DECLINATION_DEG  (-3.0f)

// ─── Paso 2: Inicialización del objeto de pantalla ────────────────────────────────
Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GC9A01  *gfx = new Arduino_GC9A01(bus, TFT_RST, 0, true);

// Doble búfer con Canvas: primero dibuja el frame completo en memoria, luego lo envía de una vez a la pantalla, resolviendo el parpadeo
// Uso de memoria: 240×240×2 = 115 KB (PSRAM del ESP32-S3 o SRAM interna son suficientes)
Arduino_Canvas  *canvas = new Arduino_Canvas(240, 240, gfx, 0, 0);

// ─── Objeto del sensor ──────────────────────────────────
Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);

// ─── Parámetros de calibración (offset de hierro duro + escala de hierro blando, guardados en NVS) ───────────────────
Preferences prefs;
float calOffX = 0, calOffY = 0;
float calSclX = 1, calSclY = 1;

// ─── Parámetros del filtro paso bajo EMA ────────────────────────────
float gSmooth    = 0;
bool  gFirstRead = true;

// alpha más pequeño = más suave (pero respuesta más lenta); para escritorio usar 0.15, en mano en movimiento se puede subir a 0.25
#define EMA_ALPHA  0.15f

// ─── Definición de colores (formato RGB565) ────────────────────────────────
#define C_BG      0x0000   // Fondo negro
#define C_RING    0x4208   // Anillo exterior gris oscuro
#define C_TICK    0x7BEF   // Marcas pequeñas grises
#define C_MAJOR   0xFFFF   // Marcas principales / etiquetas blancas
#define C_NORTH   0xF800   // N rojo
#define C_NDL_N   0xF800   // Aguja roja (extremo norte)
#define C_NDL_S   0xCE79   // Aguja plateada (extremo sur)
#define C_DEG     0x07E0   // Grados verdes
#define C_DIR     0xFFE0   // Letras de dirección amarillas

const char* kDir[] = {"N","NE","E","SE","S","SW","W","NW"};

#define CX 120   // Centro X
#define CY 120   // Centro Y
#define R  100   // Radio de la esfera

// ─────────────────────────────────────────────
//  Lectura del acimut (con corrección de calibración hierro duro/blando)
// ─────────────────────────────────────────────
float readHeading() {
  sensors_event_t ev;
  mag.getEvent(&ev);

  // Restar offset de hierro duro, eliminando interferencias de campos magnéticos fijos circundantes (tornillos, pilares de cobre, etc.)
  float x = ev.magnetic.x - calOffX;
  float y = ev.magnetic.y - calOffY;
  // Normalización de hierro blando: mapear la respuesta elíptica del campo magnético de vuelta a circular
  if (calSclX > 0.01f) x /= calSclX;
  if (calSclY > 0.01f) y /= calSclY;

  float h = atan2f(y, x) + DECLINATION_DEG * (float)M_PI / 180.0f;
  if (h <  0)               h += 2.0f * (float)M_PI;
  if (h > 2.0f*(float)M_PI) h -= 2.0f * (float)M_PI;
  return h * 180.0f / (float)M_PI;
}

// ─────────────────────────────────────────────
//  Filtro paso bajo EMA (maneja correctamente el salto circular 0°/360°)
// ─────────────────────────────────────────────
float emaFilter(float newAngle) {
  if (gFirstRead) { gFirstRead = false; return newAngle; }
  float d = newAngle - gSmooth;
  if (d >  180.0f) d -= 360.0f;   // Por ejemplo, saltar de 359° a 1°, la diferencia debería ser +2°, no -358°
  if (d < -180.0f) d += 360.0f;
  float r = gSmooth + d * EMA_ALPHA;
  if (r <   0.0f) r += 360.0f;
  if (r >= 360.0f) r -= 360.0f;
  return r;
}

// ─────────────────────────────────────────────
//  Renderizado de frame completo (dibuja el frame completo y luego lo envía a pantalla, eliminando parpadeo)
// ─────────────────────────────────────────────
void drawFrame(float angle) {
  canvas->fillScreen(C_BG);

  // Anillo exterior (4 píxeles de ancho, da sensación de borde a la esfera)
  for (int r = R; r > R - 4; r--)
    canvas->drawCircle(CX, CY, r, C_RING);

  // Marcas: una cada 10°, más largas cada 30°, blancas cada 90°
  for (int deg = 0; deg < 360; deg += 10) {
    float rad = deg * (float)M_PI / 180.0f;
    int   len = (deg % 30 == 0) ? 12 : 6;
    canvas->drawLine(
      CX + (int)(cosf(rad) * (R - 5)),    CY + (int)(sinf(rad) * (R - 5)),
      CX + (int)(cosf(rad) * (R-5-len)),  CY + (int)(sinf(rad) * (R-5-len)),
      (deg % 90 == 0) ? C_MAJOR : C_TICK
    );
  }

  // Etiquetas N/E/S/W, N en rojo para destacarlo
  canvas->setTextSize(2);
  canvas->setTextColor(C_NORTH); canvas->setCursor(CX-6,    CY-R+20);  canvas->print("N");
  canvas->setTextColor(C_MAJOR); canvas->setCursor(CX+R-32, CY-7);     canvas->print("E");
                                 canvas->setCursor(CX-6,    CY+R-32);  canvas->print("S");
                                 canvas->setCursor(CX-R+20, CY-7);     canvas->print("W");

  // Aguja (3 píxeles de ancho, visualmente más clara)
  float rad  = angle * (float)M_PI / 180.0f;
  float perp = rad + (float)M_PI / 2.0f;
  int   pdx  = (int)roundf(cosf(perp));
  int   pdy  = (int)roundf(sinf(perp));
  int   nx   = CX + (int)(sinf(rad) * 68);   // Aguja roja (extremo norte)
  int   ny   = CY - (int)(cosf(rad) * 68);
  int   sx   = CX - (int)(sinf(rad) * 42);   // Aguja plateada (extremo sur, más corta)
  int   sy   = CY + (int)(cosf(rad) * 42);
  for (int d = -1; d <= 1; d++) {
    canvas->drawLine(CX+pdx*d, CY+pdy*d, nx+pdx*d, ny+pdy*d, C_NDL_N);
    canvas->drawLine(CX+pdx*d, CY+pdy*d, sx+pdx*d, sy+pdy*d, C_NDL_S);
  }

  // Círculo pequeño del eje central (decorativo)
  canvas->fillCircle(CX, CY, 9, C_RING);
  canvas->drawCircle(CX, CY, 9, 0xA534);
  canvas->fillCircle(CX, CY, 3, C_MAJOR);

  // Visualización central de grados (verde) y letras de ocho direcciones (amarillo)
  canvas->setTextSize(2);
  canvas->setTextColor(C_DEG);
  char buf[8]; sprintf(buf, "%3d", (int)angle);
  canvas->setCursor(CX - 18, CY - 14); canvas->print(buf);

  int   idx = ((int)(angle + 22.5f) % 360) / 45;
  int   w   = strlen(kDir[idx]) * 6;
  canvas->setTextSize(1);
  canvas->setTextColor(C_DIR);
  canvas->setCursor(CX - w/2, CY + 6); canvas->print(kDir[idx]);

  canvas->flush();   // ← Envía el frame completo a la pantalla de una vez, esta línea es clave para resolver el parpadeo
}

// ─────────────────────────────────────────────
//  Calibración de rotación de 15 segundos
//  Principio: registra los valores máximo/mínimo del sensor en todas las direcciones,
//       calcula el offset de hierro duro (offset) y la escala de hierro blando (scale)
// ─────────────────────────────────────────────
void runCalibration() {
  float minX =  1e6f, maxX = -1e6f;
  float minY =  1e6f, maxY = -1e6f;
  const uint32_t DUR = 15000;
  uint32_t t0 = millis();

  while (millis() - t0 < DUR) {
    sensors_event_t ev; mag.getEvent(&ev);
    if (ev.magnetic.x < minX) minX = ev.magnetic.x;
    if (ev.magnetic.x > maxX) maxX = ev.magnetic.x;
    if (ev.magnetic.y < minY) minY = ev.magnetic.y;
    if (ev.magnetic.y > maxY) maxY = ev.magnetic.y;

    // Mostrar pantalla de progreso de calibración en tiempo real
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR);  canvas->setTextSize(2);
    canvas->setCursor(15, 60);  canvas->print("CALIBRATING");
    canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
    canvas->setCursor(8, 95);   canvas->print("Gira lentamente 360 grados");
    canvas->setCursor(18, 109); canvas->print("Mantén el dispositivo horizontal");
    // Barra de progreso
    int p = (millis() - t0) * (R*2-2) / DUR;
    canvas->drawRect(20, 130, R*2, 14, C_MAJOR);
    canvas->fillRect(21, 131, p, 12, 0x07E0);
    // Mostrar rango de campo magnético en tiempo real (ayuda a confirmar si se completó una vuelta completa)
    char b[44];
    canvas->setTextColor(0x7BEF);
    sprintf(b, "X[%.1f ~ %.1f]", minX, maxX);
    canvas->setCursor(8, 157); canvas->print(b);
    sprintf(b, "Y[%.1f ~ %.1f]", minY, maxY);
    canvas->setCursor(8, 170); canvas->print(b);
    canvas->flush();
    delay(50);
  }

  // Calcular offset y escala
  calOffX = (maxX + minX) / 2.0f;
  calOffY = (maxY + minY) / 2.0f;
  calSclX = (maxX - minX) / 2.0f;  if (calSclX < 0.01f) calSclX = 1.0f;
  calSclY = (maxY - minY) / 2.0f;  if (calSclY < 0.01f) calSclY = 1.0f;

  // Guardar en NVS (no se pierde al apagar)
  prefs.begin("compass", false);
  prefs.putFloat("offX", calOffX);  prefs.putFloat("offY", calOffY);
  prefs.putFloat("sclX", calSclX);  prefs.putFloat("sclY", calSclY);
  prefs.end();

  // Pantalla de resultado de calibración
  canvas->fillScreen(C_BG);
  canvas->setTextColor(0x07E0); canvas->setTextSize(2);
  canvas->setCursor(30, 88); canvas->print("CAL DONE!");
  canvas->setTextColor(C_MAJOR); canvas->setTextSize(1);
  char b[44];
  sprintf(b, "offX = %.1f", calOffX); canvas->setCursor(10, 120); canvas->print(b);
  sprintf(b, "offY = %.1f", calOffY); canvas->setCursor(10, 133); canvas->print(b);
  sprintf(b, "sclX = %.1f", calSclX); canvas->setCursor(10, 148); canvas->print(b);
  sprintf(b, "sclY = %.1f", calSclY); canvas->setCursor(10, 161); canvas->print(b);
  canvas->flush();
  delay(3000);
}

// ─────────────────────────────────────────────
//  Cargar datos de calibración guardados previamente desde NVS
// ─────────────────────────────────────────────
void loadCalibration() {
  prefs.begin("compass", true);
  calOffX = prefs.getFloat("offX", 0.0f);
  calOffY = prefs.getFloat("offY", 0.0f);
  calSclX = prefs.getFloat("sclX", 1.0f);
  calSclY = prefs.getFloat("sclY", 1.0f);
  prefs.end();
  if (calSclX < 0.01f) calSclX = 1.0f;
  if (calSclY < 0.01f) calSclY = 1.0f;
  Serial.printf("[CAL] off=(%.2f, %.2f)  scl=(%.2f, %.2f)\n",
                calOffX, calOffY, calSclX, calSclY);
}

// ─────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TFT_BL, OUTPUT); digitalWrite(TFT_BL, HIGH);  // Encender retroiluminación
  pinMode(CAL_BTN, INPUT_PULLUP);

  gfx->begin();
  canvas->begin();       // Asigna el búfer de frame, consume aprox. 115 KB de memoria en este punto

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000); // Modo rápido 400 kHz, reduce la latencia de lectura I2C

  if (!mag.begin()) {
    // Cuando no se encuentra el sensor, la pantalla muestra un mensaje de error en rojo
    canvas->fillScreen(0xF800);
    canvas->setTextColor(0xFFFF); canvas->setTextSize(2);
    canvas->setCursor(10, 100); canvas->print("SENSOR ERROR");
    canvas->setCursor(10, 125); canvas->print("Check wiring!");
    canvas->flush();
    while (1) delay(500);
  }

  loadCalibration();

  // Al encender, mantener presionado BOOT(GPIO0) → entra en calibración de rotación
  if (digitalRead(CAL_BTN) == LOW) {
    canvas->fillScreen(C_BG);
    canvas->setTextColor(C_DIR); canvas->setTextSize(1);
    canvas->setCursor(10, 112); canvas->print("Suelta para iniciar cal...");
    canvas->flush();
    while (digitalRead(CAL_BTN) == LOW) delay(10);
    delay(500);
    runCalibration();
  }

  // Descartar las primeras lecturas inestables de calentamiento
  for (int i = 0; i < 8; i++) {
    sensors_event_t ev; mag.getEvent(&ev); delay(15);
  }
  gSmooth    = readHeading();
  gFirstRead = false;
}

// ─────────────────────────────────────────────
//  Loop: lectura → filtrado → renderizado, ciclo aprox. 25fps
// ─────────────────────────────────────────────
void loop() {
  float raw = readHeading();
  gSmooth   = emaFilter(raw);
  drawFrame(gSmooth);
  delay(30);  // 30ms ≈ 33fps, con el tiempo de renderizado real es aprox. 25fps
}
```

### Explicación del código

**¿Por qué usar Canvas?** `Arduino_Canvas` es como abrir un "borrador" de 115KB en memoria: primero dibujas el frame completo, y luego usas `canvas->flush()` para enviarlo todo de una vez a la pantalla. Si dibujas directamente en la pantalla, cada trazo se muestra inmediatamente, y cuando la aguja gira se nota un parpadeo evidente. Canvas resuelve este problema, a costa de consumir más memoria.

**¿Qué hace `readHeading()`?** Toma la intensidad del campo magnético X/Y del sensor, resta el offset de hierro duro (elimina interferencias de campos magnéticos fijos), divide por el factor de escala de hierro blando (corrige la inconsistencia de sensibilidad entre ejes), y finalmente suma la corrección de declinación magnética, obteniendo el ángulo respecto al norte verdadero.

**¿Por qué `emaFilter()` necesita manejar el salto circular?** Si la aguja pasa de 359° a 1°, la diferencia entre las dos lecturas es -358°; si haces un promedio ponderado directamente, la aguja girará en sentido contrario dando una vuelta larga. El código primero limita la diferencia al rango [-180°, +180°], y luego suaviza, así maneja correctamente el cruce por 0°.

**¿Cuál es el principio de calibración?** Girando una vuelta completa en el plano horizontal, las lecturas X/Y del sensor trazan una elipse (en condiciones ideales sería un círculo). Se registran los valores máximo y mínimo; el punto medio es el offset de hierro duro, y el radio es el factor de escala de hierro blando. Una vez completada la calibración, los datos se guardan en NVS (similar a la EEPROM de un teléfono), la próxima vez que se encienda se cargan automáticamente, no es necesario recalibrar cada vez.

---

## Solución de problemas comunes

No te asustes, el 90% de los problemas provienen de estos puntos.

**La pantalla está completamente negra o blanca, no muestra nada.** Primero verifica que el pin BL (retroiluminación) esté en nivel alto — si está conectado a GPIO7, confirma que el código tenga `digitalWrite(TFT_BL, HIGH)`; si está conectado directamente a 3.3V, la retroiluminación debería estar siempre encendida, si está negra significa que otro pin tiene problemas. Luego verifica con la tabla de cableado cable por cable que CS, DC y RST estén conectados a los GPIO correctos; intercambiar CS y DC es un error muy frecuente.

**El puerto serie imprime `SENSOR ERROR`, la pantalla muestra error en rojo.** El magnetómetro no responde, lo más probable es un problema de cableado I2C — SDA/SCL están invertidos, o conectados a GPIO diferentes. Confirma que `Wire.begin(13, 14)` corresponde a los pines que realmente has conectado. Otra posibilidad es que el módulo no tenga alimentación 3.3V, usa un multímetro para medir el pin VCC.

**La aguja salta de forma errática, es completamente inexacta, o siempre se queda en una dirección fija.** La causa más probable es que tu módulo sea QMC5883L (0x0D), pero el código usa la librería de HMC5883L — las definiciones de registros de ambas librerías son completamente diferentes, los números leídos no tienen sentido. Primero ejecuta el escaneo I2C para confirmar la dirección; si es 0x0D, necesitas cambiar el `#include <Adafruit_HMC5883_U.h>` y el objeto sensor por la forma de usar la librería QMC5883LCompass, hay ejemplos de adaptación disponibles en línea.

**Después de calibrar, la dirección sigue desviada 10°~20°.** Verifica si `DECLINATION_DEG` ha sido cambiado al valor de tu ciudad; si este parámetro difiere en 5°, todas las direcciones tendrán un desplazamiento sistemático. Tokio aprox. -7.5°, Pekín aprox. -6.5°, para valores precisos usa la herramienta NOAA al final del artículo. Otra razón puede ser que durante la calibración había campos magnéticos fuertes cerca (teléfono, destornillador, imán de altavoz), ve a un lugar más despejado y recalibra.

**Error de compilación `Adafruit_HMC5883_U.h: No such file or directory`.** La librería no está instalada o se instaló la incorrecta. Abre Arduino IDE → Herramientas → Gestor de librerías, busca `HMC5883`, instala Adafruit HMC5883 Unified y su dependencia Adafruit Unified Sensor.

---

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre HMC5883L y QMC5883L? ¿Se puede usar la misma librería?**
R: No se pueden intercambiar. Ambos son completamente compatibles en pines (la apariencia de soldadura es idéntica), pero las direcciones de registros internos son diferentes, el protocolo driver es diferente, si usas la librería incorrecta las lecturas serán valores sin sentido. La dirección I2C del HMC5883L es 0x1E, la del QMC5883L es 0x0D; con un escaneo I2C puedes confirmarlo en un segundo.

**P: ¿Se puede conectar el pin BL de retroiluminación directamente a 3.3V, o es obligatorio usar un GPIO?**
R: Conectar directamente a 3.3V es totalmente válido, la pantalla estará encendida todo el tiempo. La ventaja de usar un GPIO es que puedes controlar el brillo desde el código o apagar la retroiluminación en modo reposo para ahorrar energía. Si no necesitas estas funciones, conectar a 3.3V te ahorra un GPIO.

**P: ¿Cómo busco el valor exacto de `DECLINATION_DEG` para mi ciudad?**
R: Usa la herramienta de cálculo de declinación magnética proporcionada por NOAA (ver referencias al final), introduce las coordenadas de tu ciudad, selecciona el modelo WMM, y te dará la declinación magnética precisa para la fecha actual. Este es positivo, oeste es negativo. Las ciudades del este de Japón generalmente están entre -7° y -8°, la costa este de China aprox. -5° a -6°.

**P: ¿Qué diferencia hay al aumentar o disminuir `EMA_ALPHA`?**
R: Cuanto mayor sea alpha, más rápida será la respuesta de la aguja, pero más propensa a temblar; cuanto menor, más suave será la aguja, pero con un notable retardo al girar. 0.15 es adecuado para un escenario de uso apoyado en el escritorio; si caminas sosteniéndolo en la mano, puedes subir a 0.25 ~ 0.3. El rango de valores es de 0.0 (completamente inmóvil) a 1.0 (sin filtrado, valor bruto).

**P: ¿Dónde se guardan los datos de calibración? ¿Se conservan al flashear código nuevo desde otro ordenador?**
R: Los datos de calibración se guardan en la NVS del ESP32 (almacenamiento no volátil, similar a EEPROM), flashear código nuevo no borra la NVS, la próxima vez que encienda se cargan directamente. Solo se pierden al ejecutar una operación "Borrar todo el Flash", en cuyo caso necesitarás recalibrar una vez.

**P: ¿El búfer de frame de 115 KB es demasiado grande? ¿Se puede usar con ESP32-C3?**
R: El ESP32-S3 tiene 512KB de SRAM, 115KB no es problema. El ESP32-C3 solo tiene 400KB de SRAM; sumando código y stack, en la práctica es bastante ajustado, se recomienda usar la versión con PSRAM o cambiar a una pantalla más pequeña. El ESP32 original (WROOM / WROVER) tiene menos SRAM; la versión WROVER con PSRAM se puede usar, la versión WROOM sin PSRAM probablemente tendrá un crash por OOM.

**P: ¿Por qué mi brújula difiere en más de diez grados del teléfono, es normal?**
R: Con esta solución, una diferencia de más de diez grados es completamente normal, no es un bug. En un entorno real con interferencias, ±10°~±15° es un rango de error común para el HMC5883L/QMC5883L. Si el error se mantiene estable dentro de ±5°, ya se puede considerar una buena calibración. Para reducir el error necesitarías cambiar a un sensor de mayor precisión e introducir fusión de nueve ejes; solo ajustando parámetros no es suficiente.

**P: ¿Se puede usar esta solución para un producto de navegación u orientación serio?**
R: No recomendado. La precisión es solo ±5°~±15°, muy afectada por el campo magnético del entorno, y no tiene compensación de inclinación — mientras no esté colocado estrictamente en horizontal, el error aumentará notablemente. Para demostraciones, aprender principios o como adorno de escritorio es totalmente suficiente; para situaciones que requieran precisión de navegación real, se recomienda cambiar a una solución como ICM-20948 con fusión de sensores por hardware.

---

## ¿Es el HMC5883L adecuado para proyectos serios?

Conclusión directa: no lo es.

Para demostraciones experimentales no hay problema, aprender el flujo de drivers, mostrar proyectos maker, adornos de escritorio — todo es posible. Pero si estás haciendo un producto que realmente necesita percepción de dirección, esta solución tiene tres problemas insuperables:

Primero, no tiene compensación de inclinación. Una vez que el módulo no está colocado horizontalmente, el error de acimut aumenta rápidamente — una inclinación de 20° puede provocar una desviación de dirección superior a 10°. El iPhone usa el acelerómetro para compensar este error en tiempo real; este módulo por sí solo no puede hacerlo, necesitarías conectar un MPU6050 adicional y modificar el algoritmo.

Segundo, está gravemente afectado por el campo magnético del entorno. La fuente de alimentación del ordenador cercana, cables USB, soportes metálicos, todos contaminan las lecturas, y esta interferencia es dinámica; una calibración guardada en NVS no puede compensar campos magnéticos que cambian en tiempo real durante el movimiento.

Tercero, la calidad de los módulos comerciales es desigual. La mayoría son versiones clon QMC5883L, sin la compensación de deriva térmica en chip del HMC5883L original, y las lecturas se desvían con los cambios de temperatura.

Si tu proyecto necesita percepción de dirección fiable, una opción más adecuada es el ICM-20948 (sensor de nueve ejes integrado + fusión DMP por hardware), o usar directamente un módulo GPS combinando coordenadas de dos puntos para calcular la orientación — la precisión y estabilidad son de otro nivel.

La posición correcta de este proyecto es: una muestra de aprendizaje pequeña pero completa. Te permite recorrer toda la cadena "driver de magnetómetro → calibración de hierro duro → filtrado → visualización", y este conocimiento es completamente transferible cuando lo apliques a mejores sensores.

---

## Ideas para ampliar

Después de completar la versión básica, hay varias direcciones para seguir explorando:

Añadir un sensor de seis ejes MPU6050, leer los datos del acelerómetro para hacer compensación de inclinación. Esta es una de las mayores limitaciones mencionadas anteriormente — esta versión actual solo tiene campo magnético 2D, si el dispositivo se inclina un poco ya produce un error notable; con compensación de inclinación, también será preciso sosteniéndolo vertical, y esta es una de las razones principales por las que la brújula del iPhone es estable. Es el paso más valioso para "evolucionar este proyecto de juguete a utilizable".

Conectar un módulo de tarjeta SD, usar LVGL o un mapa propio superponiendo la dirección de la brújula, para hacer un navegador offline. El área de visualización de la pantalla circular es limitada, pero para mostrar una flecha con la dirección actual y la dirección objetivo es totalmente suficiente.

Enviar los datos de acimut vía Wi-Fi a un broker MQTT, integrándolo con Home Assistant o tu propio dashboard, para convertirlo en un sensor de percepción de dirección de escritorio, útil para determinar la orientación de puertas y ventanas o alinear antenas.

---

## Referencias

- Datasheet original del HMC5883L (Honeywell): https://cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf
- Datasheet del QMC5883L (QST): https://datasheetspdf.com/pdf/1309218/QST/QMC5883L/1
- Arduino_GFX_Library GitHub: https://github.com/moononournation/Arduino_GFX
- Adafruit_HMC5883_U GitHub: https://github.com/adafruit/Adafruit_HMC5883_U
- Página del producto ESP32-S3 (Espressif): https://www.espressif.com/en/products/socs/esp32-s3
- Herramienta de consulta de declinación magnética (NOAA): https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
