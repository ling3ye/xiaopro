---
title: "ESP32-S3 + ADXL335 impulsando una pantalla redonda JD9855 como panel de aceleración de 3 ejes｜Por qué agitar se nota más que inclinar"
boardId: esp32s3
moduleId: display/tft15-jd9855
moduleIds:
  - display/tft15-jd9855
  - sensor/adxl335
category: esp32
date: 2026-08-05
intro: "Usa un ESP32-S3 + ADXL335 (GY-61) para impulsar una pantalla redonda QSPI JD9855 como panel de aceleración de 3 ejes en tiempo real. Incluye esquema de cableado, código completo de Arduino y resolución de problemas frecuentes, y explica con claridad la física del acelerómetro que hay detrás de «por qué agitar se nota más que inclinar»."
image: "https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg"
---

> Dificultad: ⭐⭐☆☆☆ (con algo de experiencia previa en Arduino basta para empezar)
> Tiempo estimado: 30-40 minutos (incluyendo calibración y depuración)
> Entorno de prueba: Arduino IDE 2.3.8 · ESP32 Arduino Core 3.3.10

---

> **TL;DR (puesta en marcha rápida):**
> 1. Conecta la pantalla (QSPI de 6 hilos) y el ADXL335 (tres entradas analógicas X/Y/Z) según la tabla de cableado
> 2. GPIO5 / GPIO9 / GPIO10 están todos dentro del rango ADC1 del ESP32-S3, así que no tienes que preocuparte por conflictos con el Wi-Fi
> 3. Tras dar corriente, deja el dispositivo plano y quieto para que el programa muestree y calibre el cero automáticamente (unos 1 segundo)
> 4. Inclina lentamente o agita el dispositivo con fuerza y observa cómo reaccionan en la pantalla los tres anillos de color junto con la aguja central

---

## Prefacio

Tras dos días de trasteo, conseguí subir los datos de tres ejes del ADXL335 en tiempo real a una pantalla redonda de 360×360. Al inclinar el dispositivo despacio, la aguja casi no se mueve; en cuanto lo agitas con fuerza, la aguja sale disparada casi media vuelta. Al principio pensé que la calibración estaba mal; tras consultar varias fuentes me di cuenta de que, por su principio físico, esto no es un «inclinómetro» puro: mide aceleración, y cuanto más fuerte agites, más exagerada será la lectura. Es así por diseño, no es un bug. También descubrí que mi placa de desarrollo ESP32-S3 casera no aguanta bien la alimentación: al conectar el sensor y la pantalla hay momentos en los que la pantalla se oscurece claramente. Parece que tendré que actualizar mi placa de desarrollo ESP32-S3.

Así que además del cableado completo, el código y el registro de tropiezos, este artículo quiere dejar clara la razón de «por qué agitar se nota más que inclinar», para que no acabes dudando de ti mismo cuando reproduzcas el experimento.

---

## Resultado del experimento

Esta pantalla redonda de 360×360 muestra en tiempo real los datos de aceleración de 3 ejes del ADXL335 (ojo, es aceleración, no un ángulo de actitud puro): los tres anillos exterores rojo / verde / azul corresponden a los ejes X / Y / Z respectivamente, y la aguja de colores central apunta a la dirección de la fuerza resultante. Cuanto más fuerte agites, más exagerado será el balanceo de la aguja; además, el borde tiene un efecto de luz «respiratoria» como decoración.

![](https://img.lingflux.com/2026/08/2f9b34d8e6a707ccb2ff2bb3d17f1084.jpg)

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/B2hNfww6fXo?si=yirZlC1QrNw2urEF" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

## Descripción de los componentes

> La placa de desarrollo ESP32-S3 no necesita presentación; si estás leyendo este artículo es que ya has usado un ESP32. Aquí solo hablo de los otros dos componentes centrales.

### Acelerómetro ADXL335 (módulo GY-61)

Lo que hace el ADXL335 se parece un poco a una báscula de baño: no sabe si «estás derecho o torcido», solo sabe qué fuerza está recibiendo en este momento, y descompone esa fuerza en tres componentes X/Y/Z para ti. Es un acelerómetro MEMS de 3 ejes con salida analógica, encargado de convertir la fuerza resultante que recibe el dispositivo (componente de gravedad + aceleración generada por el movimiento) en tres señales de voltaje.

| Parámetro | Valor |
| --- | --- |
| Tipo | Acelerómetro MEMS de 3 ejes con salida analógica |
| Rango | ±3.6g (típico) / ±3g (mínimo garantizado) |
| Sensibilidad | 300 mV/g (valor típico con VS = 3V, proporcional a la alimentación) |
| Tensión de trabajo | 1.8V ~ 3.6V |
| Ancho de banda (por defecto del módulo GY-61) | aprox. 50Hz (determinado por el condensador de filtrado de 0.1μF de la placa) |
| Densidad de ruido | X/Y aprox. 270 µg/√Hz, Z aprox. 550 µg/√Hz (Z es aproximadamente 2× la de X/Y) |

La razón para usarlo es sencilla: es barato, su salida analógica facilita el cableado y se puede leer con cualquier pin ADC. Es ideal para proyectos pequeños de visualización; si no persigues una resolución profesional de actitud, es más que suficiente.

### Descripción de pines

**ADXL335 (GY-61)**

| Pin del módulo | Descripción |
| --- | --- |
| VCC / GND | Alimentación 3.3V |
| X / Y / Z | Tres salidas analógicas, a pines ADC |
| ST | Pin de autocomprobación, normalmente sin conectar |

### Pantalla redonda TK015F5785 (driver JD9855, interfaz QSPI)

Esta pantalla puede entenderse como «un lienzo que solo entiende las señales de cuatro líneas de datos»: el JD9855 es el chip driver, encargado de llevar los datos de color enviados por el MCU a cada píxel de la pantalla; la interfaz QSPI (serie de cuatro hilos) se encarga de alcanzar mayor velocidad de refresco con menos pines. Es una pantalla TFT redonda de unas 1.5 pulgadas y resolución 360×360, que se controla con cinco señales (SCLK/D0-D3/CS) más la alimentación, sin necesitar un pin DC (datos/comando) adicional.

| Parámetro | Valor |
| --- | --- |
| Tamaño | 1.5 pulgadas IPS redonda |
| Resolución | 360 × 360 |
| Chip driver | JD9855 |
| Interfaz | QSPI (cuatro hilos) |
| Alimentación | 3.3V |
| Brillo / contraste | Según la hoja de datos del vendedor (puede variar entre lotes) |

La razón para elegirlo es también directa: una pantalla redonda queda genial para visualizaciones tipo cuadro de mandos, la interfaz QSPI solo ocupa 5 GPIO (ahorra pines frente al puerto paralelo tradicional) y el DMA del ESP32-S3 puede moverla sin problemas.

### Descripción de pines

**Pantalla TK015F5785 (JD9855 QSPI)**

| Pin de la pantalla | Descripción |
| --- | --- |
| SCLK | Reloj QSPI |
| D0 ~ D3 | Cuatro líneas de datos QSPI |
| CS | Selección de chip |
| VCC / GND | Alimentación 3.3V |

---

## Lista de materiales (BOM)

| Componente | Modelo / parámetros | Cantidad | Precio aprox. | Uso |
| --- | --- | --- | --- | --- |
| Placa principal | Placa de desarrollo ESP32-S3 | 1 | aprox. 30-50 yuanes | MCU + Wi-Fi/Bluetooth de reserva |
| Pantalla redonda | TK015F5785 (JD9855, 360×360, QSPI) | 1 | según vendedor | Visualización |
| Acelerómetro | ADXL335 (módulo GY-61) | 1 | aprox. 8-15 yuanes | Captura de aceleración de 3 ejes |
| Cables Dupont | Hembra a hembra | varios | - | Cableado |

---

## Forma de cableado

**Pantalla → ESP32-S3**

| Pin de la pantalla | Pin ESP32-S3 |
| --- | --- |
| SCLK | GPIO6 |
| D0 | GPIO15 |
| D1 | GPIO7 |
| D2 | GPIO11 |
| D3 | GPIO12 |
| CS | GPIO16 |
| VCC | 3.3V |
| GND | GND |

**ADXL335 → ESP32-S3**

| Pin del módulo | Pin ESP32-S3 |
| --- | --- |
| VCC | 3.3V |
| GND | GND |
| X | GPIO5 (ADC1) |
| Y | GPIO9 (ADC1) |
| Z | GPIO10 (ADC1) |

Recomienda revisarlos uno por uno tras cablear; te ahorrará el 80 % del tiempo de depuración — sobre todo las cuatro líneas D0~D3 de la pantalla: si inviertes una, lo más probable es que la pantalla muestre ruido o no se encienda.

---

## Librerías que necesitas instalar

No hace falta instalar ninguna librería de terceros. El driver de la pantalla llama directamente a las interfaces `esp_lcd_panel_io` y `driver/spi_master` incluidas en ESP-IDF para escribir a mano el driver QSPI; no necesitas buscar nada en el gestor de librerías.

Lo único a tener en cuenta respecto a versiones:

- Arduino IDE: 2.3.8 (probado OK)
- Paquete de placa ESP32 (esp32 by Espressif Systems): **3.3.10** (basado en ESP-IDF 5.x) — debe ser v3.x, porque el flag `quad_mode` usado por el código y algunas interfaces DMA no siempre están completos en el núcleo v2.x anterior
- Selección de placa: ESP32S3 Dev Module, con USB CDC On Boot puesto en Enabled

---

## Código

```cpp
/*
 * =============================================================================
 *  ADXL335 + TK015F5785 pantalla redonda —— panel de aceleración de 3 ejes
 *  =====================================================================
 *
 *  Escena única: panel de aceleración de 3 ejes —— muestra en tiempo real los datos de los 3 ejes + dirección de la fuerza resultante; la aguja central apunta hacia la fuerza resultante
 *
 *  Hardware: ESP32-S3 + TK015F5785 (JD9855 QSPI) + ADXL335 (GY-61)
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                          Esquema de cableado                        │
 *  ├─────────────────────────────────────────────────────────────────────┤
 *  │  【Pantalla TK015F5785】       │  【ADXL335 (GY-61)】                 │
 *  │  SCLK  → GPIO6                │  VCC → 3.3V                         │
 *  │  D0    → GPIO15               │  GND → GND                          │
 *  │  D1    → GPIO7                │  X   → GPIO5 (ADC)                  │
 *  │  D2    → GPIO11               │  Y   → GPIO9 (ADC)                  │
 *  │  D3    → GPIO12               │  Z   → GPIO10 (ADC)                 │
 *  │  CS    → GPIO16               │                                      │
 *  │  VCC   → 3.3V                 │                                      │
 *  │  GND   → GND                  │                                      │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 *  Dependencias: solo el núcleo de placa esp32 v3.x de Arduino IDE
 *  Subida: Placa=ESP32S3 Dev Module, USB CDC On Boot=Enabled
 * =============================================================================
 */

#include <Arduino.h>
#include <math.h>
#include <initializer_list>
#include "driver/spi_master.h"
#include "esp_lcd_panel_io.h"
#include "esp_heap_caps.h"

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/* ----------------------------- Configuración de pines ----------------------------- */
// Pines de la pantalla
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1

// Pines del ADXL335 (entradas analógicas)
#define PIN_ACCEL_X    5
#define PIN_ACCEL_Y    9
#define PIN_ACCEL_Z    10

/* =====================================================================
 *  Clase de driver para pantalla JD9855 QSPI
 * ===================================================================== */
#define JD9855_SWRESET 0x01
#define JD9855_CASET   0x2A
#define JD9855_RASET   0x2B
#define JD9855_RAMWR   0x2C
#define JD9855_MADCTL  0x36
#define JD9855_COLMOD  0x3A
#define JD9855_SLPOUT  0x11
#define JD9855_DISPON  0x29

class JD9855_QSPI {
public:
    static constexpr int H_RES = 360;
    static constexpr int V_RES = 360;

    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b) {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1) {
        if (backlight >= 0) { pinMode(backlight, OUTPUT); digitalWrite(backlight, HIGH); }

        spi_bus_config_t buscfg = {};
        buscfg.sclk_io_num  = sclk;
        buscfg.data0_io_num = d0;
        buscfg.data1_io_num = d1;
        buscfg.data2_io_num = d2;
        buscfg.data3_io_num = d3;
        buscfg.max_transfer_sz = H_RES * V_RES * 2;
        esp_err_t ret = spi_bus_initialize(SPI2_HOST, &buscfg, SPI_DMA_CH_AUTO);
        if (ret != ESP_OK) { log_e("spi_bus_initialize: %s", esp_err_to_name(ret)); return false; }

        esp_lcd_panel_io_spi_config_t io_config = {};
        io_config.cs_gpio_num        = cs;
        io_config.dc_gpio_num        = -1;
        io_config.spi_mode           = 3;
        io_config.pclk_hz            = 20 * 1000 * 1000;  // El cableado no aguanta 40MHz; bajamos a 20MHz estable
        io_config.trans_queue_depth  = 10;
        io_config.lcd_cmd_bits       = 32;
        io_config.lcd_param_bits     = 8;
        io_config.flags.quad_mode    = true;
        ret = esp_lcd_new_panel_io_spi(SPI2_HOST, &io_config, &io);
        if (ret != ESP_OK) { log_e("esp_lcd_new_panel_io_spi: %s", esp_err_to_name(ret)); return false; }

        sendCmd(JD9855_SWRESET);
        delay(20);
        sendInitCommands();
        return true;
    }

    void pushRect(int x, int y, int w, int h, const uint16_t *data) {
        if (w <= 0 || h <= 0) return;
        setAddrWindow(x, y, x + w - 1, y + h - 1);
        size_t n = (size_t)w * h;
        ensureDmaBuf(n * 2);
        for (size_t i = 0; i < n; i++) {
            uint16_t c = data[i];
            dma_buf[i * 2]     = c >> 8;
            dma_buf[i * 2 + 1] = c & 0xFF;
        }
        sendColor(JD9855_RAMWR, dma_buf, n * 2);
    }

    void fillScreen(uint16_t color) {
        uint8_t hi = color >> 8, lo = color & 0xFF;
        const int BUF_PIX = H_RES;
        ensureDmaBuf(BUF_PIX * 2);
        for (int i = 0; i < BUF_PIX; i++) { dma_buf[i*2] = hi; dma_buf[i*2+1] = lo; }
        for (int y = 0; y < V_RES; y++) {
            setAddrWindow(0, y, H_RES - 1, y);
            sendColor(JD9855_RAMWR, dma_buf, BUF_PIX * 2);
        }
    }

private:
    esp_lcd_panel_io_handle_t io = nullptr;
    uint8_t *dma_buf = nullptr;
    size_t   dma_buf_size = 0;

    void ensureDmaBuf(size_t need) {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1) {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data) {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len) {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    void sendInitCommands() {
        sendCmd(0xFF, {0x20, 0x10, 0x00});
        sendCmd(JD9855_MADCTL, {0x00});
        sendCmd(JD9855_COLMOD, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0xDF, {0x98, 0x55});
        sendCmd(0xCE, {0x0D, 0x00});
        sendCmd(0xD8, {0x08, 0x00});
        sendCmd(0xB2, {0x30});
        sendCmd(0xB7, {0x01, 0x35, 0x01, 0x5D});
        sendCmd(0xBB, {0x1B, 0x64, 0xE3, 0x34, 0x3E, 0xF3});
        sendCmd(0xBC, {0x00, 0x1A, 0xF3, 0xC0});
        sendCmd(0xC0, {0x22, 0xC1});
        sendCmd(0xC3, {0x00, 0x01, 0x8D, 0x0B, 0x08, 0x48, 0x07, 0x04, 0x62, 0x30, 0x30});
        sendCmd(0xC4, {0x40, 0x00, 0xAD, 0x68, 0x37, 0x07, 0x04, 0x16, 0x43, 0x07, 0x04});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xC8, {0x3F, 0x2D, 0x22, 0x1D, 0x1D, 0x1F, 0x1B, 0x1C, 0x1B, 0x1B, 0x17, 0x0D, 0x09, 0x05, 0x01, 0x02});
        sendCmd(0xD3, {0x28, 0x13});
        sendCmd(0xD9, {0x00, 0x00, 0xFF, 0x00, 0xF0, 0x00});
        sendCmd(0xDE, {0x01});
        sendCmd(0xB7, {0x17, 0xA7, 0x64, 0x3B, 0x06, 0x36, 0x18, 0x18});
        sendCmd(0xBE, {0x00});
        sendCmd(0xC1, {0x04, 0x40, 0x90, 0x08});
        sendCmd(0xC2, {0x00, 0x16, 0xDA, 0xE7});
        sendCmd(0xC4, {0x72, 0x12});
        sendCmd(0xC7, {0x00, 0x00, 0x02, 0x32, 0x10, 0x32});
        sendCmd(0xC8, {0x00, 0x00, 0x0B, 0x32, 0x12, 0x2E});
        sendCmd(0xC9, {0x00, 0x0A, 0x08, 0x06, 0x04});
        sendCmd(0xCA, {0x1E, 0x1F, 0x10, 0x17, 0x18});
        sendCmd(0xCB, {0x01, 0x0B, 0x09, 0x07, 0x05});
        sendCmd(0xCC, {0x1E, 0x1F, 0x11, 0x17, 0x18});
        sendCmd(0xCD, {0x31, 0x25, 0x27, 0x29, 0x2B});
        sendCmd(0xCE, {0x3F, 0x3E, 0x21, 0x37, 0x38});
        sendCmd(0xCF, {0x30, 0x24, 0x26, 0x28, 0x2A});
        sendCmd(0xD0, {0x3F, 0x3E, 0x20, 0x37, 0x38});
        sendCmd(0xD1, {0x06, 0x30, 0xA5, 0xDB, 0x30});
        sendCmd(0xD3, {0x3B, 0x08, 0x00, 0x00, 0x00, 0x00});
        sendCmd(0xD4, {0x67, 0x00, 0x00, 0x01, 0x00, 0x01});
        sendCmd(0xD5, {0x10, 0x10, 0x07, 0x07, 0x0F, 0x94, 0x26});
        sendCmd(0xD6, {0x00, 0x00, 0x40});
        sendCmd(0xD7, {0x01, 0x84, 0x20});
        sendCmd(0xDE, {0x02});
        sendCmd(0xB6, {0x1C});
        sendCmd(0xDE, {0x00});
        sendCmd(0x2A, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x2B, {0x00, 0x00, 0x01, 0x67});
        sendCmd(0x35);
        sendCmd(0x36, {0x00});
        sendCmd(0x3A, {0x55});
        sendCmd(0xDE, {0x00});
        sendCmd(0x11);
        delay(120);
        sendCmd(0x29);
        delay(10);
    }
};

/* =====================================================================
 *  Variables globales
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     // 360
static constexpr int H = JD9855_QSPI::V_RES;     // 360
static constexpr int CX = W / 2;                  // Centro x = 180
static constexpr int CY = H / 2;                  // Centro y = 180
static constexpr int RADIUS = 180;
static constexpr int R2MAX  = RADIUS * RADIUS;

static const int BLOCK_H = 40;
uint16_t blockBuf[W * BLOCK_H];

// Tabla de ángulos por píxel relativos al centro (atan2 precalculado en 0-255), para no llamar atan2f píxel a píxel al renderizar
uint8_t *angleTab = nullptr;

// Datos del acelerómetro (tras filtrado)
float accelX = 0, accelY = 0, accelZ = 0;
// Valor central bruto del acelerómetro (valor ADC en reposo, necesita calibración)
int accelXCenter = 2048, accelYCenter = 2048, accelZCenter = 2730;

// Definiciones de color
uint16_t COLOR_BLACK;
uint16_t COLOR_WHITE;
uint16_t COLOR_LIGHT_GRAY;

/* =====================================================================
 *  Funciones de utilidad
 * ===================================================================== */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v) {
    uint8_t region = h / 60;
    uint8_t rem    = (h - region * 60) * 255 / 60;
    uint8_t p = (uint16_t)v * (255 - s) / 255;
    uint8_t q = (uint16_t)v * (255 - (uint16_t)s * rem / 255) / 255;
    uint8_t t = (uint16_t)v * (255 - (uint16_t)s * (255 - rem) / 255) / 255;
    uint8_t r, g, b;
    switch (region) {
        case 0:  r = v; g = t; b = p; break;
        case 1:  r = q; g = v; b = p; break;
        case 2:  r = p; g = v; b = t; break;
        case 3:  r = p; g = q; b = v; break;
        case 4:  r = t; g = p; b = v; break;
        default: r = v; g = p; b = q; break;
    }
    return JD9855_QSPI::color565(r, g, b);
}

void initColors() {
    COLOR_BLACK      = JD9855_QSPI::color565(0, 0, 0);
    COLOR_WHITE      = JD9855_QSPI::color565(255, 255, 255);
    COLOR_LIGHT_GRAY = JD9855_QSPI::color565(100, 100, 110);
}

/* =====================================================================
 *  Lectura y filtrado del acelerómetro
 * ===================================================================== */
void readAccelerometer() {
    // Lectura de valores ADC en bruto (ESP32-S3 ADC de 12 bits, 0-4095)
    int rawX = analogRead(PIN_ACCEL_X);
    int rawY = analogRead(PIN_ACCEL_Y);
    int rawZ = analogRead(PIN_ACCEL_Z);

    // Conversión a valor normalizado de -1.0 a 1.0
    // ADXL335 con alimentación de 3.3V: unos 330mV por g, centro aprox. 1.65V
    // ADC 3.3V = 4095, por tanto ~409 unidades ADC por g
    float newX = (rawX - accelXCenter) / 409.0f;
    float newY = (rawY - accelYCenter) / 409.0f;
    float newZ = (rawZ - accelZCenter) / 409.0f;

    // Limitación
    newX = constrain(newX, -1.5f, 1.5f);
    newY = constrain(newY, -1.5f, 1.5f);
    newZ = constrain(newZ, -1.5f, 1.5f);

    // Filtro paso bajo (suavizado)
    const float alpha = 0.3f;
    accelX = accelX * (1 - alpha) + newX * alpha;
    accelY = accelY * (1 - alpha) + newY * alpha;
    accelZ = accelZ * (1 - alpha) + newZ * alpha;
}

/* Precalcula el ángulo (atan2) de cada píxel relativo al centro y lo guarda en una tabla 0-255.
   En runtime, cada píxel solo consulta la tabla y convierte a radianes, sin llamar atan2f en cada frame — eso era el culpable del parón original.
   Se calcula una sola vez en setup. Prioridad RAM interna (~126KB); si no cabe, cae a PSRAM;
   si tampoco hay, se deja nullptr y el render regresa a atan2f (sigue funcionando, solo más lento). */
void buildAngleTable() {
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] angleTab: asignación fallida, el render será más lento")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   // -0.5..0.5
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);
        }
    }
    Serial.printf("[INIT] Tabla de ángulos %d KB lista\n", (int)(n / 1024));
}

/* =====================================================================
 *  Escena: panel de aceleración de 3 ejes
 *  Muestra datos en tiempo real de los 3 ejes, con aguja dinámica y valores
 * ===================================================================== */
void renderGaugeScene() {
    // ---- Constantes por frame (sacadas del bucle, para no recalcularlas por píxel) ----
    int t = millis() / 50;
    float breathe   = (sinf(t * 0.1f) + 1) / 2;
    float tiltAngle = atan2f(accelY, accelX);
    float tiltMag   = sqrtf(accelX * accelX + accelY * accelY);
    tiltMag = min(1.0f, tiltMag);
    float xAngle    = accelX * M_PI / 2;
    float yAngle    = -M_PI / 2 + accelY * M_PI / 2;
    float zVal      = (accelZ + 1) / 2;
    float fillAngle = -M_PI + zVal * 2 * M_PI;
    const float A8SCALE = M_PI / 128.0f;   // Tabla de ángulos (0-255) -> radianes

    // Los umbrales de radio usan r^2 (comparación entera) para evitar sqrtf por píxel — solo la pequeña aguja central necesita float r
    const int R2_TICK_LO  = 160 * 160, R2_TICK_HI  = 175 * 175;
    const int R2_X_LO     = 135 * 135, R2_X_HI     = 155 * 155;
    const int R2_Y_LO     =  95 *  95, R2_Y_HI     = 115 * 115;
    const int R2_Z_LO     =  55 *  55, R2_Z_HI     =  75 *  75;
    const int R2_NDL_LO   =   5 *   5, R2_NDL_HI   =  50 *  50;
    const int R2_BR_LO    = 175 * 175, R2_BR_HI    = 180 * 180;
    const int R2_145_LO = 145 * 145, R2_145_HI = 146 * 146;
    const int R2_105_LO = 105 * 105, R2_105_HI = 106 * 106;
    const int R2_65_LO  =  65 *  65, R2_65_HI  =  66 *  66;
    const int R2_165    = 165 * 165;

    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = min(BLOCK_H, H - by);
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            const uint8_t *angRow = angleTab ? &angleTab[yy * W] : nullptr;  // Puntero a inicio de fila, una vez por fila
            for (int x = 0; x < W; x++) {
                int dx = x - CX, dy = yy - CY;
                int r2 = dx * dx + dy * dy;

                if (r2 > R2MAX) {
                    blockBuf[y * W + x] = COLOR_BLACK;
                    continue;
                }

                float angle = angRow ? ((int8_t)angRow[x] * A8SCALE)
                                     : atan2f((float)dy, (float)dx);

                // Fondo oscuro
                uint16_t color = JD9855_QSPI::color565(15, 20, 30);

                // Marcas exteriores
                if (r2 > R2_TICK_LO && r2 < R2_TICK_HI) {
                    int deg = (int)((angle + M_PI) * 180 / M_PI) % 30;
                    if (deg < 3 || (r2 > R2_165 && deg % 10 < 2)) {
                        color = COLOR_LIGHT_GRAY;
                    }
                }

                // Eje X (anillo exterior, rojo)
                if (r2 > R2_X_LO && r2 < R2_X_HI) {
                    float angleDiff = fabsf(angle - xAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(100 + tt * 155, 30, 30);
                    } else if (r2 >= R2_145_LO && r2 < R2_145_HI) {
                        color = JD9855_QSPI::color565(60, 20, 20);
                    }
                }

                // Eje Y (anillo medio, verde)
                if (r2 > R2_Y_LO && r2 < R2_Y_HI) {
                    float angleDiff = fabsf(angle - yAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    if (angleDiff < 0.3f) {
                        float tt = 1 - angleDiff / 0.3f;
                        color = JD9855_QSPI::color565(30, 100 + tt * 155, 30);
                    } else if (r2 >= R2_105_LO && r2 < R2_105_HI) {
                        color = JD9855_QSPI::color565(20, 60, 20);
                    }
                }

                // Eje Z (anillo interior, azul)
                if (r2 > R2_Z_LO && r2 < R2_Z_HI) {
                    if (angle < fillAngle || angle < -M_PI + 0.1) {
                        color = JD9855_QSPI::color565(30, 80, 200);
                    } else if (r2 >= R2_65_LO && r2 < R2_65_HI) {
                        color = JD9855_QSPI::color565(20, 30, 80);
                    }
                }

                // Aguja central (apunta a la dirección de la fuerza resultante) —— solo aquí hace falta float r
                if (r2 > R2_NDL_LO && r2 < R2_NDL_HI) {
                    float r = sqrtf((float)r2);
                    float angleDiff = fabsf(angle - tiltAngle);
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;

                    float needleWidth = 0.15f * (1 - r / 50);

                    if (angleDiff < needleWidth && r < 45 * tiltMag + 10) {
                        int hue = (int)(tiltAngle * 180 / M_PI + 180) % 360;
                        color = hsvTo565(hue, 200, 255);
                    }
                }

                // Punto central
                if (r2 < 64) {
                    color = COLOR_WHITE;
                }

                // Decoración de luz respiratoria (breathe ya calculado fuera del bucle)
                if (r2 > R2_BR_LO && r2 < R2_BR_HI) {
                    int hue = ((int)(angle * 180 / M_PI) + t * 2) % 360;
                    color = hsvTo565(hue, 255, 100 + breathe * 100);
                }

                blockBuf[y * W + x] = color;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* =====================================================================
 *  Programa principal
 * ===================================================================== */
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[ADXL335 + TK015F5785] panel de aceleración de 3 ejes"));

    // Inicializar colores
    initColors();

    // Inicializar ADC (ESP32-S3)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);  // Rango 0-3.3V
    pinMode(PIN_ACCEL_X, INPUT);
    pinMode(PIN_ACCEL_Y, INPUT);
    pinMode(PIN_ACCEL_Z, INPUT);

    // Calibración: leer el valor central en estado de reposo
    Serial.println(F("[ACCEL] Calibrando, mantén el dispositivo plano y quieto..."));
    delay(500);
    long sumX = 0, sumY = 0, sumZ = 0;
    for (int i = 0; i < 100; i++) {
        sumX += analogRead(PIN_ACCEL_X);
        sumY += analogRead(PIN_ACCEL_Y);
        sumZ += analogRead(PIN_ACCEL_Z);
        delay(10);
    }
    accelXCenter = sumX / 100;
    accelYCenter = sumY / 100;
    accelZCenter = sumZ / 100 - 409;  // El eje Z en reposo es aprox. 1g; restamos el offset de 1g
    Serial.printf("[ACCEL] Calibración completa: X=%d, Y=%d, Z=%d\n", accelXCenter, accelYCenter, accelZCenter);

    // Inicializar la pantalla
    Serial.println(F("[LCD] Inicializando..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] Inicialización fallida!"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] Inicialización correcta"));

    buildAngleTable();   // Precalcula el ángulo por píxel para que el render del panel no tiemble

    lcd.fillScreen(COLOR_BLACK);
    Serial.println(F("[DEMO] Panel de aceleración de 3 ejes"));
}

void loop() {
    // Leer el acelerómetro
    readAccelerometer();

    // Renderizar el panel
    renderGaugeScene();

    // Imprimir información de depuración (una vez por segundo)
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint > 1000) {
        lastPrint = millis();
        Serial.printf("X=%.2f  Y=%.2f  Z=%.2f\n", accelX, accelY, accelZ);
    }
}
```

### Explicación del código

- **Parte del driver de la pantalla**: la clase `JD9855_QSPI` llama directamente a la interfaz `esp_lcd_panel_io_spi` de ESP-IDF para escribir el driver a mano, sin depender de ninguna librería gráfica de terceros. `pclk_hz` se bajó a propósito de los habituales 40MHz a 20MHz porque, cuando el cableado es largo, 40MHz tiende a producir ruido en pantalla. Es el valor estable tras probar y tropezar; si tu cableado es corto y la calidad del cable de la pantalla es buena, puedes intentar subirlo.
- **Tabla de ángulos `buildAngleTable()`**: es la clave de rendimiento de todo el render. Primero, en `setup()`, precalcula el ángulo de cada píxel de 360×360 relativo al centro, lo comprime y guarda en una tabla de un byte (0-255); segundo, al renderizar, cada píxel solo hace una consulta a la matriz, sin llamar al lento `atan2f()` por píxel. Esta optimización decide directamente si el refresco del panel es fluido o no.
- **`readAccelerometer()` lectura y filtrado**: primero lee el valor ADC en bruto; segundo convierte el voltaje a un valor normalizado -1~1 con el factor de 409 counts/g (este factor viene de la sensibilidad típica de 300mV/g del ADXL335 × el valor teórico de fondo de escala de 3.3V del ADC de 12 bits del ESP32-S3; en la práctica se recomienda ajustarlo a tu propio módulo); tercero aplica un filtro paso bajo de primer orden (`alpha = 0.3`) para suavizar los picos.
- **Por qué «agitar» se nota más que «inclinar» y dónde se ve en el código**: la línea `xAngle = accelX * M_PI / 2` mapea linealmente los ±1g de accelX a ±90°. Al inclinar despacio, el límite teórico de accelX es ±1g, que corresponde exactamente a ±90°; pero al agitar, la aceleración inercial se suma a la gravedad y la lectura real de accelX supera a menudo ±1, siendo limitada por `constrain()` a ±1.5g, así que el ángulo mapeado se balancea mucho más violentamente que con una inclinación lenta — no es un problema de la lógica de dibujo, lo decide la física del acelerómetro.
- **Render del eje Z**: `zVal` mapea accelZ de -1~1 a 0~1 y luego lo convierte en un ángulo de relleno `fillAngle`; en el fondo muestra el valor del eje Z en forma de «anillo de progreso»; si observas que este anillo tiembla ligeramente todo el tiempo, es normal (más abajo, en las FAQ, se explica).

---

## Resolución de problemas frecuentes

No te asustes: el 80 % de los problemas vienen de estos sitios:

1. **La pantalla no se enciende o muestra ruido**: primero comprueba si las cuatro líneas de datos D0~D3 del QSPI están invertidas; luego confirma que CS/SCLK van cada una a su pin correcto de forma independiente; por último verifica que la alimentación de la pantalla esté estable en 3.3V (también ripple alto en la alimentación produce ruido en pantalla).
2. **La lectura del ADXL335 se queda atascada cerca de 2048 sin moverse**: comprueba si lo has conectado a un pin ADC que no funciona, o si la alimentación del módulo itself es anómala; los GPIO5/9/10 usados en este proyecto están todos dentro del rango ADC1 del ESP32-S3, así que no se ven afectados por el uso de ADC2 por parte del Wi-Fi; puedes descartar esa posibilidad.
3. **El valor del eje Z no deja de saltar**: es una característica de diseño original del ADXL335; la densidad de ruido del eje Z es inherentemente más alta que la de los ejes X/Y, no es un problema de cableado ni de código. Puedes aliviarlo bajando el coeficiente de filtrado `alpha` (por ejemplo de 0.3 a 0.1), o haciendo múltiples muestras y promediando en el código (sobremuestreo).
4. **Al inclinar despacio no reacciona, solo al agitar**: es la naturaleza física del acelerómetro — mide la «fuerza resultante», no un ángulo de actitud puro. Solo combinándolo con un giroscopio y haciendo fusión de sensores se obtiene una salida de actitud estable y no afectada por el movimiento.
5. **Error de compilación: no se encuentra `esp_lcd_panel_io.h`**: revisa la versión del paquete de placa ESP32 en Arduino IDE; debe ser v3.x (basado en ESP-IDF 5.x); el núcleo antiguo no tiene estas interfaces.
6. **El valor central está claramente desplazado tras calibrar**: durante la fase de calibración el dispositivo no estaba plano o estaba en movimiento; se recomienda ponerlo sobre una mesa horizontal antes de darle corriente y, durante ese segundo de calibración, evitar tocarlo.

---

## Preguntas frecuentes (FAQ)

**P: ¿El ADXL335 mide inclinación o movimiento?**
R: Estrictamente, mide «fuerza específica» (la composición de componente gravitatoria + aceleración de movimiento), no puede separar las dos. Una inclinación lenta y continua solo cambia la componente de gravedad en ±1g como máximo, mientras que agitar añade la aceleración de movimiento, con una amplitud que a menudo supera ±1g, por lo que visualmente «agitar» se nota mucho más que «inclinar despacio». Para obtener un ángulo de actitud puro hace falta pasar a una IMU de 6 ejes con giroscopio (p. ej. MPU6050) y hacer fusión de sensores.

**P: ¿Por qué la lectura del eje Z no para de saltar, mientras que X/Y son relativamente estables?**
R: Es una característica de diseño original del ADXL335 — la hoja de datos indica que la densidad de ruido de salida del eje Z es aproximadamente el doble que la de los ejes X/Y, no es un problema de cableado ni de código. Se puede mitigar aumentando el filtro paso bajo o añadiendo sobremuestreo del ADC, pero no eliminarlo del todo.

**P: ¿Qué tan rápido puede medir el módulo GY-61?**
R: El condensador de filtrado integrado de 0.1μF limita el ancho de banda de cada eje a unos 50Hz, suficiente para agitaciones e inclinaciones cotidianas; si necesitas medir vibraciones de mayor frecuencia, tendrás que cambiar a un condensador de filtrado de menor capacidad.

**P: ¿Usar GPIO5/9/10 del ESP32-S3 como ADC entra en conflicto con el Wi-Fi?**
R: No. Estos tres pines están dentro del rango ADC1 del ESP32-S3 (GPIO1~10); solo el ADC2 (GPIO11~20) se ve restringido cuando el Wi-Fi está activo. En este proyecto no tienes que preocuparte por ese problema.

**P: ¿Por qué hay que mantener el dispositivo plano y quieto al calibrar?**
R: Tras dar corriente, el código muestrea 100 veces seguidas y promedia, usando esa media como punto de referencia de «0g». Si durante la calibración el dispositivo está torcido o en movimiento, el punto de referencia se desviará y todas las conversiones posteriores se arrastrarán con ese desfase.

**P: ¿Hace falta instalar alguna librería de terceros adicional para este código?**
R: No. El driver de la pantalla llama directamente a las interfaces `esp_lcd_panel_io` y `spi_master` incluidas en ESP-IDF, escritas a mano; siempre que el paquete de placa ESP32 en Arduino IDE sea v3.x es suficiente, no hace falta instalar nada desde el gestor de librerías.

---

## Ideas para seguir experimentando

- Añade una IMU de 6 ejes (por ejemplo MPU6050) y haz fusión de sensores para obtener un panel de actitud verdaderamente estable y no afectado por sacudidas
- Extrae por separado la «intensidad de agitación» y construye un sencillo «detector de impactos» que cambie de color o avise al superar un umbral
- Conecta un zumbador o un LED RGB que avise al superar un ángulo determinado, como un nivel de burbuja casero
- Registra los datos de movimiento en una tarjeta SD y expórtalos después para dibujar curvas y revisarlos

---

## Referencias

- [Página oficial y hoja de datos del ADXL335 (Analog Devices)](https://www.analog.com/en/products/adxl335.html)
- [Condensador de filtrado y ancho de banda de la placa GY-61 / ADXL335 breakout (Adafruit)](https://www.adafruit.com/product/163)
- [Hoja de datos del chip driver JD9855 QSPI](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
- [Hoja de datos de la serie ESP32-S3 (Espressif, distribución de pines ADC1/ADC2)](https://documentation.espressif.com/esp32-s3_datasheet_en.pdf)
