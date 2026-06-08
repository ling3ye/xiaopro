---
title: "ESP32-S3 + INMP441 + GC9A01 Espectrógrafo de audio circular DIY | Tutorial completo de I2S + FFT + SPI"
boardId: esp32s3
moduleId: audio/inmp441
category: esp32
date: 2026-06-08
intro: "Lee audio I2S del micrófono digital INMP441 con el ESP32-S3, realiza un análisis FFT de 512 puntos y dibuja en tiempo real un espectro de 16 bandas en arcoíris en la pantalla TFT circular GC9A01. Incluye conexiones completas, instalación de librerías y comentarios en el código."
image: "https://img.lingflux.com/2026/06/7747ada90e61ba2360585e6934fbf7a7.jpg"
---

> **Resumen en una frase**: ESP32-S3 + micrófono INMP441 + pantalla circular GC9A01, construye un espectrógrafo de audio circular que "baila", tutorial completo de I2S + FFT + SPI.

# Tutorial completo: ESP32-S3 + INMP441 + GC9A01 — Construye un espectrógrafo de audio circular que "baila" (I2S + FFT + SPI)

Dificultad: ⭐⭐⭐☆☆ (conociendo un poco de Arduino puedes hacerlo)
Tiempo estimado: 45 minutos
Entorno de prueba:
Arduino IDE 2.3.8
GFX Library for Arduino v1.6.5
arduinoFFT v2.0.4

---

> **TL;DR (versión sin rodeos):**
> 1. **Conexiones**: INMP441 SD→GPIO4, WS→GPIO5, SCK→GPIO6, **L/R debe conectarse a GND**
> 2. **Conexiones**: GC9A01 SCL→GPIO12, SDA→GPIO11, CS→GPIO9, DC→GPIO10, RST→GPIO18, BL→GPIO7
> 3. **Instalar librerías**: GFX Library for Arduino (autor moononournation) + `arduinoFFT` (autor kosme)
> 4. **Pega el código, flashea, habla frente al micrófono**, y las barras de arcoíris dentro del círculo comenzarán a bailar

---

## Introducción

Desde que compré una pantalla circular de 1.28 pulgadas, me ha parecido muy divertida; las pantallas circulares ofrecen escenarios muy diferentes a las cuadradas. Ahora, con el módulo de micrófono INMP441, voy a hacer algo realmente bonito: **visualización de espectro de audio en tiempo real**.

Cuando escuchas "espectrógrafo", probablemente te viene a la mente el estilo retro de Winamp con sus barras verticales (yo lo instalé en mi PC antaño; escuchando música y viendo las barras saltar, podía pasar horas mirándolas). Pero un espectro circular es diferente: 16 barras de colores arcoíris irradian desde el centro hacia afuera; cuanto mayor es el volumen, más largas son las barras, y en la punta de cada barra hay un punto blanco de pico que desciende lentamente... Sinceramente, me quedé hipnotizado cinco minutos sin ir a comer.

Este artículo te guía paso a paso para usar un **ESP32-S3 + micrófono digital INMP441 + pantalla TFT circular GC9A01**, desde las conexiones hasta el código, y construir un espectrógrafo circular de arcoíris que responde al sonido en tiempo real. Un maker con un poco de experiencia puede ver resultados en menos de 45 minutos.

---

## Resultado del experimento

![](https://img.lingflux.com/2026/06/21a134efbde1457cff0817a7e18879f3.jpg)

- Captura de audio del micrófono en tiempo real (44.1kHz, 16bit)
- Análisis FFT de 512 puntos, dividido en 16 bandas de frecuencia
- Barras de arcoíris en la pantalla circular irradian de adentro hacia afuera, con puntos blancos de pico que descienden lentamente
- Tasa de refresco de aproximadamente 20fps, completamente fluida a simple vista

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/nmPC6lKog0o" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Descripción de componentes

### Pantalla TFT circular GC9A01

Si la pantalla rectangular normal es un "teléfono candybar", la GC9A01 es la "esfera de un smartwatch": **LCD circular de 1.28 pulgadas, el chip controlador se llama GC9A01, funciona por bus SPI, alimentación de 3.3V**, y se puede controlar con solo 8 cables.

| Parámetro | Valor |
| --- | --- |
| Tamaño de pantalla | 1.28 pulgadas |
| Resolución | 240 × 240 píxeles |
| Interfaz | SPI (4 hilos) |
| Voltaje de trabajo | 3.3V |
| Chip controlador | GC9A01 |
| Tipo de panel | IPS (ángulo de visión completo) |

Razón para elegirla: es la pantalla circular pequeña más común del mercado, la librería Arduino_GFX la soporta nativamente, se inicializa en 5 líneas de código y tiene muy pocos problemas.

---

### Micrófono digital MEMS INMP441

El INMP441 es un **micrófono digital MEMS omnidireccional**; en palabras sencillas: **genera directamente una señal digital I2S, sin necesidad de conectar un ADC**. Es como tener un intérprete simultáneo que traduce en tiempo real lo que dices a un formato digital que el MCU entiende, ahorrándote todos los problemas de las señales analógicas.

| Parámetro | Valor |
| --- | --- |
| Interfaz | I2S (audio digital) |
| Voltaje de trabajo | 1.8V ~ 3.3V |
| Respuesta en frecuencia | 60Hz ~ 15kHz |
| Relación señal/ruido | 61dBA |
| Sensibilidad | -26dBFS (valor típico) |
| Patrón de captación | Omnidireccional |

Razón para elegirlo: la interfaz I2S es limpia, no requiere un ADC externo, su relación señal/ruido de 61dBA es muy superior a la de la mayoría de micrófonos analógicos baratos, y es más que suficiente para un espectrógrafo.

> Cabe destacar que el INMP441 fue fabricado originalmente por InvenSense (posteriormente adquirida por TDK), y TDK lo ha catalogado oficialmente como **Obsolete (descontinuado/fuera de producción)**. En distribuidores de componentes electrónicos principales como Mouser y DigiKey, ya aparece marcado como descontinuado. Sin embargo, en el mercado (por ejemplo, en tiendas online como AliExpress o Taobao) siguen abundando los módulos INMP441 azul/negro a muy bajo precio. Esto se debe principalmente a que en el mercado asiático aún existe una gran cantidad de **inventario residual**, o bien hay **chips compatibles/refurbished de fabricantes nacionales** que continúan usando este nombre. Si solo haces proyectos DIY personales, escribes tutoriales o pruebas pequeñas demos, los módulos que se consiguen actualmente siguen funcionando.
>
> **Por lo tanto, si estás desarrollando un producto comercial, este módulo no es la mejor opción.**

---

## Lista de materiales (BOM)

| Componente | Modelo / Especificación | Cantidad |
| --- | --- | --- |
| Placa controladora principal | ESP32-S3 (con USB-C) | 1 |
| Pantalla TFT circular | GC9A01, 1.28 pulgadas, 240×240 | 1 |
| Micrófono digital | INMP441 módulo I2S | 1 |
| Cables Dupont |  | varios |

---

## Descripción de pines de los componentes

### Pines de la pantalla GC9A01

| Pin | Descripción de función |
| --- | --- |
| VCC | Alimentación positiva (conectar a 3.3V) |
| GND | Alimentación negativa (tierra) |
| SCL / CLK | Reloj SPI |
| SDA / MOSI | Datos SPI (envío del maestro) |
| CS | Selección de chip (activo en nivel bajo) |
| DC | Selección de datos / comando |
| RST | Reset (activado por nivel bajo) |
| BL | Control de retroiluminación (conectar a 3.3V para siempre encendida, o a GPIO para dimming por PWM) |

### Pines del micrófono INMP441

| Pin | Descripción de función |
| --- | --- |
| VDD | Alimentación positiva (conectar a 3.3V) |
| GND | Alimentación negativa (tierra) |
| SD | Salida de datos I2S (conectar a entrada de datos del ESP32) |
| WS | Reloj de palabra / sincronización de trama (selección de canal izquierdo/derecho) |
| SCK | Reloj de bit |
| L/R | Selección de canal: GND = canal izquierdo, 3.3V = canal derecho, **no puede dejarse flotante** |

---

## Esquema de conexiones

**Se recomienda verificar cada cable con la tabla después de conectarlo; esto ahorra el 80% del tiempo de depuración.**

### Conexiones de la pantalla GC9A01

| Pin del módulo | ESP32-S3 | Color de referencia |
| --- | --- | --- |
| VCC | 3.3V | Rojo |
| GND | GND | Gris |
| SCL / CLK | GPIO12 | Amarillo |
| SDA / MOSI | GPIO11 | Azul |
| CS | GPIO9 | Verde |
| DC | GPIO10 | Naranja |
| RST | GPIO18 | Púrpura |
| BL | GPIO7 / 3.3V | Cian |

### Conexiones del micrófono INMP441

| Pin del módulo | ESP32-S3 | Color de referencia |
| --- | --- | --- |
| VDD | 3.3V | Rojo |
| GND | GND | Gris |
| SD | GPIO4 | Azul |
| WS | GPIO5 | Verde |
| SCK | GPIO6 | Amarillo |
| L/R | GND (canal izquierdo) | Gris |

> ⚠️ **El pin L/R debe estar conectado, no puede dejarse flotante.** Si queda flotante, la selección de canal será indefinida y se capturará puro ruido; las barras del espectro saltarán aleatoriamente sin ninguna relación con el sonido — no preguntes cómo lo sé.

####

- Asegúrate de usar alimentación de **3.3V**, no conectes a 5V
- El pin L/R del INMP441 conectado a GND = salida de canal izquierdo
- Conecta todos los cables primero, verifica la alimentación y las tierras con un multímetro antes de energizar, para evitar cortocircuitos

---

## Librerías necesarias

En **Arduino IDE → Herramientas → Administrar librerías** busca e instala:

| Librería | Autor | Versión probada | Uso |
| --- | --- | --- | --- |
| `Arduino_GFX_Library` | moononournation | v1.6.5 | Controlador de pantalla GC9A01 |
| `arduinoFFT` | kosme | v2.0.4 | Transformada rápida de Fourier |

> El controlador I2S (`driver/i2s.h`) es una librería integrada del ESP32, no requiere instalación adicional.
>
> Se recomienda usar Arduino IDE **versión 2.3.x o superior**; la versión antigua 1.x tiene soporte inestable para el ESP32-S3.

---

## Código completo

```cpp
#include <Arduino_GFX_Library.h>
#include <driver/i2s.h>
#include <arduinoFFT.h>

// ====== Paso 1: Definir pines de la pantalla ======
#define TFT_SCK   12
#define TFT_MOSI  11
#define TFT_CS    9
#define TFT_DC    10
#define TFT_RST   18
#define TFT_BL    7

// ====== Paso 2: Definir pines del micrófono ======
#define I2S_WS    5
#define I2S_SD    4
#define I2S_SCK   6
#define I2S_PORT  I2S_NUM_0

// ====== Parámetros FFT ======
#define SAMPLES   512
#define BANDS     16

// ====== Inicializar pantalla GC9A01 ======
Arduino_DataBus *bus = new Arduino_ESP32SPI(
  TFT_DC, TFT_CS, TFT_SCK, TFT_MOSI, -1);
Arduino_GFX *gfx = new Arduino_GC9A01(
  bus, TFT_RST, 0, true);

// ====== Buffers FFT ======
double vReal[SAMPLES];
double vImag[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>(
  vReal, vImag, SAMPLES, 44100);

// ====== Energía por banda y picos ======
float bandValues[BANDS];
float peakValues[BANDS];
int16_t sampleBuf[SAMPLES];

// ====== Utilidad de color: HSL a RGB565 ======
uint16_t hslToRgb565(float h, float s, float l) {
  float c = (1.0f - fabsf(2.0f * l - 1.0f)) * s;
  float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
  float m = l - c / 2.0f;
  float r, g, b;
  if (h < 60)       { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  uint8_t R = (uint8_t)((r + m) * 31);
  uint8_t G = (uint8_t)((g + m) * 63);
  uint8_t B = (uint8_t)((b + m) * 31);
  return (R << 11) | (G << 5) | B;
}

// ====== Paso 3: Inicializar micrófono I2S ======
void setupMicrophone() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

void setup() {
  Serial.begin(115200);

  // Paso 4: Encender retroiluminación, inicializar pantalla
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  gfx->begin();
  gfx->fillScreen(0x0000);

  // Paso 5: Inicializar micrófono
  setupMicrophone();

  memset(peakValues, 0, sizeof(peakValues));
}

// ====== Dibujar espectro circular ======
void drawCircularSpectrum() {
  int cx = 120, cy = 120;
  int innerR = 25;
  int maxLen = 85;
  float angleStep = 2.0f * PI / BANDS;
  float barWidth = angleStep * 0.7f;

  gfx->fillScreen(0x0000);

  for (int i = 0; i < BANDS; i++) {
    float angle = i * angleStep - PI / 2.0f;
    float hue = (float)i / BANDS * 360.0f;
    float val = bandValues[i];
    int barLen = (int)(val * maxLen);

    for (int r = innerR; r < innerR + barLen; r += 2) {
      float t = (float)(r - innerR) / maxLen;
      uint16_t color = hslToRgb565(hue, 1.0f, 0.3f + t * 0.3f);
      float x1 = cx + cosf(angle - barWidth/2) * r;
      float y1 = cy + sinf(angle - barWidth/2) * r;
      float x2 = cx + cosf(angle + barWidth/2) * r;
      float y2 = cy + sinf(angle + barWidth/2) * r;
      gfx->drawLine(x1, y1, x2, y2, color);
    }

    if (peakValues[i] > 0.02f) {
      int peakR = innerR + (int)(peakValues[i] * maxLen) + 3;
      float px = cx + cosf(angle) * peakR;
      float py = cy + sinf(angle) * peakR;
      gfx->fillCircle(px, py, 2, 0xFFFF);
    }

    peakValues[i] *= 0.95f;
    if (bandValues[i] > peakValues[i]) {
      peakValues[i] = bandValues[i];
    }
  }
}

void loop() {
  // Paso 6: Leer datos I2S del micrófono
  size_t bytes_read = 0;
  i2s_read(I2S_PORT, sampleBuf, sizeof(sampleBuf),
           &bytes_read, portMAX_DELAY);

  // Paso 7: Llenar la parte real del FFT con los datos de muestreo
  for (int i = 0; i < SAMPLES; i++) {
    vReal[i] = (double)sampleBuf[i];
    vImag[i] = 0.0;
  }

  // Paso 8: Ejecutar FFT
  FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  FFT.compute(FFT_FORWARD);
  FFT.complexToMagnitude();

  // Paso 9: Mapear resultados FFT a 16 bandas
  memset(bandValues, 0, sizeof(bandValues));
  int specLen = SAMPLES / 2;
  for (int i = 0; i < BANDS; i++) {
    int start = (int)(pow((float)i / BANDS, 1.8f) * specLen * 0.7f);
    int end   = (int)(pow((float)(i+1) / BANDS, 1.8f) * specLen * 0.7f);
    if (end <= start) end = start + 1;
    float sum = 0;
    for (int j = start; j < end && j < specLen; j++) {
      sum += (float)vReal[j];
    }
    float avg = sum / (end - start);
    bandValues[i] = constrain(avg / 5000.0f, 0.0f, 1.0f);
  }

  // Paso 10: Dibujar espectro circular
  drawCircularSpectrum();
}
```

---

## Explicación del código

**1. Por qué SAMPLES = 512?**
512 es una potencia de 2, y el algoritmo FFT es más eficiente con esta longitud. Con una frecuencia de muestreo de 44.1kHz, la resolución de frecuencia de una FFT de 512 puntos es de aproximadamente 86Hz, que es suficiente. Si usas 256, será más rápida pero con menos detalle en frecuencia; si usas 1024, será más fina pero la tasa de refresco se reducirá notablemente.

**2. Por qué se usa pow(..., 1.8) para la distribución de bandas?**
Una distribución lineal de bandas llenaría las bandas de alta frecuencia con datos, dejando las de baja frecuencia vacías. La distribución exponencial hace que las bandas de baja frecuencia sean más estrechas (mayor detalle) y las de alta frecuencia más anchas (agrupando el ruido), acercándose a la curva de percepción de frecuencia del oído humano y logrando un aspecto más "natural".

**3. De dónde sale la normalización dividiendo entre 5000?**
Este valor depende de la distancia entre tu micrófono y la fuente de sonido, así como del volumen ambiental; diferentes escenarios requieren ajustes manuales. Si las barras siempre están al máximo (energía truncada), aumenta el valor de 5000; si las barras son casi invisibles, redúcelo.

**4. Qué hace peakValues[i] *= 0.95?**
Es la técnica clásica de "mantener pico + descenso suave": cuando el sonido se detiene bruscamente, el punto blanco del pico no desaparece instantáneamente, sino que se multiplica por 0.95 en cada fotograma, descendiendo lentamente. Visualmente es más suave, similar al efecto de los equipos de audio profesionales.

---

## Solución de problemas frecuentes

**No te asustes, el 90% de los problemas provienen de estos puntos:**

**La pantalla está completamente negra, no muestra nada**
Primero verifica si la retroiluminación (pin BL) está realmente en alto (si tu módulo no tiene pin BL, puedes ignorar esto). Luego comprueba si los cuatro cables SPI (SCK / MOSI / CS / DC) están mal conectados o sueltos. Usa un multímetro para medir si VCC tiene 3.3V. Si la retroiluminación está encendida pero la pantalla sigue negra, lo más probable es que CS o DC estén intercambiados; prueba a invertirlos.

**Las barras del espectro no se mueven, o saltan aleatoriamente sin relación con el sonido**
Lo primero: **confirma que el pin L/R del INMP441 esté conectado a GND**; este es el error más frecuente. Un pin L/R flotante provoca una selección de canal anómala y se captura puro ruido aleatorio. Una vez verificado L/R, revisa los números de GPIO de los tres cables SD / WS / SCK.

**Todas las barras del espectro están al máximo (energía siempre al tope)**
Aumenta el valor `5000` en la línea `bandValues[i] = constrain(avg / 5000.0f, ...)` del código, por ejemplo a `15000` o `30000`. Si el micrófono está muy cerca de la fuente de sonido también puede ocurrir; prueba a alejar el micrófono unos 30cm.

**Las barras del espectro reaccionan, pero solo se mueven unas pocas**
Es posible que la fuente de sonido utilizada para las pruebas tenga un rango de frecuencias demasiado estrecho (por ejemplo, un solo silbato de tono puro). Prueba con música de espectro completo (con graves, voces e instrumentos de alta frecuencia) y verifica si todas las bandas responden.

**Error de compilación: error de clase plantilla ArduinoFFT**
Confirma que tienes instalado `arduinoFFT` (versión de kosme) **v2.x**. La sintaxis de v1.x es `ArduinoFFT FFT` (sin parámetros de plantilla); v2.x usa `ArduinoFFT<double>`. Las APIs de ambas versiones no son compatibles. Simplemente actualiza a la última versión desde el Administrador de Librerías.

---

## FAQ

**P: Qué pasa si no conecto el pin L/R del INMP441?**
R: La selección de canal queda flotante, el comportamiento de salida del micrófono es indefinido. En la práctica, lo más probable es que se capturen datos aleatorios de puro ruido, las barras del espectro saltarán al azar sin ninguna relación con el sonido. GND = canal izquierdo, 3.3V = canal derecho; elige uno, no puedes dejarlo sin conectar.

**P: Puedo cambiar SAMPLES a 1024? Qué efectos tendría?**
R: Sí, la resolución de frecuencia pasaría de aproximadamente 86Hz a unos 43Hz, con más detalle en bajas frecuencias. El costo es que el tiempo de captura y cálculo por fotograma se duplica, y la tasa de refresco bajaría de unos 20fps a unos 10fps. Para visualización de espectro, 10fps sigue siendo aceptable a simple vista.

**P: Con solo 3.3V, el INMP441 funciona correctamente?**
R: Sin problema alguno. El INMP441 soporta alimentación de 1.8V a 3.3V; 3.3V es el voltaje de trabajo más común y no necesita un regulador de voltaje adicional.

**P: El uso de CPU del ESP32-S3 es alto? Afectará a otras tareas?**
R: Una FFT de 512 puntos consume aproximadamente entre el 10% y el 15% del tiempo de CPU en un solo núcleo a 240MHz del ESP32-S3. Si también necesitas ejecutar Wi-Fi o Bluetooth, se recomienda poner FFT + dibujo en el Core 0, y las tareas de red en el Core 1, para que no interfieran entre sí.

**P: Puedo cambiar la GC9A01 por una ST7789 u otra pantalla?**
R: Sí. Arduino_GFX_Library soporta docenas de chips controladores; solo tienes que cambiar `Arduino_GC9A01` en el código por la clase correspondiente (por ejemplo, `Arduino_ST7789`), modificar los parámetros de resolución y seguir las conexiones del datasheet de la nueva pantalla. Ten en cuenta que para pantallas no circulares tendrás que recalcular las coordenadas del centro.

**P: El espectro tiene "ruido de fondo" en silencio, las barras no vuelven a cero. Qué hago?**
R: El INMP441 tiene ruido de fondo inherente (SNR 61dBA significa que siempre se capta una pequeñísima cantidad de ruido ambiental). Puedes agregar una puerta de ruido: antes del mapeo, añade una línea `if (avg < 200) avg = 0;`, y en silencio las barras volverán completamente a cero. También ayuda ajustar el divisor de normalización aumentándolo ligeramente.

**P: Qué versión del controlador I2S usa el ESP32-S3?**
R: Este artículo utiliza el controlador I2S antiguo estilo ESP-IDF v4.x (`i2s_driver_install` / `i2s_read`). ESP-IDF v5.x introdujo una nueva API I2S (`i2s_new_channel`, etc.); si el paquete de soporte de tu placa ESP32-S3 se ha actualizado a la versión 3.x, necesitarás adaptar la función `setupMicrophone()` siguiendo la nueva API.

---

## Ideas para ir más allá

- Cambiar a 32 bandas de frecuencia, combinado con una pantalla circular más grande (por ejemplo, GC9A01A de 2.1 pulgadas), para un espectro más detallado
- Agregar botones táctiles para cambiar entre modos de visualización (radiación circular / barras verticales / forma de onda de osciloscopio)
- Conectar por Wi-Fi y enviar los datos del espectro a un navegador, renderizándolos nuevamente en una página web
- Usar dos INMP441 para audio estéreo, representando los canales izquierdo y derecho con diferentes colores

---

## Referencias

- [Datasheet oficial del INMP441 — TDK InvenSense](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [Datasheet del chip controlador GC9A01](https://www.buydisplay.com/download/ic/GC9A01A.pdf)
- [Arduino_GFX_Library GitHub — moononournation](https://github.com/moononournation/Arduino_GFX)
- [arduinoFFT GitHub — kosme](https://github.com/kosme/arduinoFFT)
- [Hoja de especificaciones técnicas del ESP32-S3 — Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Documentación del controlador I2S de ESP-IDF — Espressif](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)