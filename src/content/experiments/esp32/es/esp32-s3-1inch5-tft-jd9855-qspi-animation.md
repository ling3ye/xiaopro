---
title: "ESP32-S3 enciende la pantalla circular TK015F5785 (JD9855 QSPI) | Tutorial completo de animaciones coloridas por tabla de consulta"
boardId: esp32s3
moduleId: display/tft15-jd9855
category: esp32
date: 2026-07-30
intro: "Con un ESP32-S3, enciende por QSPI la pantalla circular TK015F5785 de 1.5 pulgadas (el driver en realidad es JD9855, no el ST77916 declarado por el fabricante), con un driver escrito a mano en un solo archivo más tres animaciones por tabla de consulta — Plasma / rueda de arcoíris / ondas radiales —; compila y flashea directamente desde Arduino IDE, con una guía de prevención de errores incluida."
image: "https://img.lingflux.com/2026/07/8f43dd78cc005af725bd601e0a262621.jpg"
---

Dificultad: ⭐⭐⭐☆☆ (más fácil si ya tienes base en microcontroladores, pero los principiantes también pueden copiar y ejecutar)
Tiempo estimado: 30-45 minutos (sin contar el tiempo de espera al envío desde Taobao)
Entorno de prueba: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 (basado en ESP-IDF v5, debe ser esta versión mayor; el motivo se explica más adelante)

---

> **Resumen en una frase**: enciende por QSPI la pantalla circular TK015F5785 de 1.5 pulgadas con un ESP32-S3 — el fabricante declara el driver ST77916, pero al medir el IC ID descubrimos que en realidad es JD9855. En este artículo escribimos a mano un mini-driver de un solo archivo de unas decenas de líneas con `esp_lcd_panel_io` incluido en ESP-IDF, para ejecutar tres animaciones por tabla de consulta: Plasma (flujo de plasma) / rueda de arcoíris / ondas radiales. Sin instalar ninguna librería y sin llamar a `sin`/`atan2`/`sqrt` en tiempo de ejecución, en 30 minutos tienes la pantalla llena de animaciones fluidas.

---

## Introducción

Al principio también pensaba que encender una pantalla circular era una tarea de cinco minutos del tipo "conectar la alimentación y enviarle un bloque de color al azar". Porque el fabricante decía que el chip driver era ST77916, que sí está en GFX library for Arduino. Sin embargo, tras subir el código, la pantalla pasó de negro a blanco completo, así que... me quedé sin saber cómo seguir. Más adelante pedí al fabricante el código del driver para ESP-IDF y descubrí que el driver de esta pantalla en realidad es JD9855, y a través del IC ID de la pantalla (el código que devuelve el IC ID es `FF 98 55 00`) también se confirma que el chip driver de esta pantalla efectivamente es JD9855. Para que podáis replicarlo fácilmente, escribí a mano un mini-driver de unas decenas de líneas usando el `esp_lcd_panel_io` integrado en ESP-IDF: sin instalar librerías, sin configurar fuentes y ni siquiera con un archivo de cabecera dedicado; todo cabe en un único .ino y funciona.

Este tutorial recoge el proceso completo de llevar esta pantalla circular TK015F5785 de 1.5 pulgadas desde "al recibirla es un cristal negro" hasta "pantalla llena de animaciones coloridas en movimiento", incluyendo cableado, principios del driver y tres algoritmos de animación fluidos que no llaman a `sin`/`atan2`/`sqrt`. Sigue los pasos y en 30 minutos tu pantalla circular también estará animada.

> **TL;DR (si vas con prisa, lee directamente aquí):**
>
> 1. Cableado: SCLK→GPIO6, D0→GPIO15, D1→GPIO7, D2→GPIO11, D3→GPIO12, CS→GPIO16
> 2. En Arduino IDE elige Board = **ESP32S3 Dev Module**, USB CDC On Boot = **Enabled**
> 3. No hace falta instalar ninguna librería de terceros; el código se apoya totalmente en `esp_lcd_panel_io` incluido en ESP-IDF, y la versión del núcleo debe ser **v3.x**
> 4. Copia, pega, compila y flashea el .ino completo; al dar alimentación verás la pantalla llena de animaciones de color en movimiento. Si no hay imagen es que has caído en algún error; baja a "Resolución de problemas comunes"

---

## Resultado del experimento

Al dar alimentación, la pantalla reproduce automáticamente en bucle tres animaciones de color generadas por algoritmos de tabla de consulta, cada una durante 6 segundos, sin sensación de tartamudeo ni de desgarro por barrido línea a línea:

- **Plasma (flujo de plasma)**: los colores fluyen de forma continua como un líquido
- **Rueda de arcoíris**: todo el espectro cromático gira lentamente alrededor del centro, como una paleta que no deja de dar vueltas
- **Ondas radiales**: ondulaciones de color se expanden desde el centro hacia afuera

En cuanto se da alimentación, la pantalla se llena de animaciones, sin necesidad de ninguna acción adicional; ideal como experimento de verificación de que "esta pantalla realmente funciona".

---

## Descripción del componente

> La placa de desarrollo (ESP32-S3) no se describe en detalle aquí; solo se explican los componentes clave además de la placa.

### Pantalla circular TK015F5785

TK015F5785 es una pantalla **IPS** circular de 1.5 pulgadas (chip driver JD9855), encargada de mostrar como imagen los datos de píxel enviados por el ESP32-S3; en este proyecto su función es soportar la salida visual final de las tres animaciones por tabla de consulta. Salvo cuando se indique lo contrario, los parámetros de la siguiente tabla proceden de la hoja de especificaciones del módulo proporcionada por el fabricante:

| Parámetro                       | Valor / Descripción                                                                               | Origen                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Tamaño                          | 1.5 pulgadas                                                                                      | Hoja de especificaciones del fabricante                 |
| Tipo de LCD                     | IPS, ángulo de visión completo                                                                    | Hoja de especificaciones del fabricante                 |
| Resolución                      | 360 × 360                                                                                         | Hoja de especificaciones del fabricante                 |
| Chip driver                     | JD9855 (del mismo modelo existe también una versión con ST77916; prevalece el IC ID medido)       | Hoja de especificaciones del fabricante + medición propia |
| Área de visualización           | Φ38.16 mm (diámetro)                                                                              | Hoja de especificaciones del fabricante                 |
| Dimensiones externas            | 44.32 × 44.32 × 3.5 mm                                                                            | Hoja de especificaciones del fabricante                 |
| Paso de píxel                   | 0.106 × 0.106 mm                                                                                  | Hoja de especificaciones del fabricante                 |
| Número de colores               | 65K colores (RGB565, 16 bits/píxel)                                                               | Hoja de especificaciones del fabricante                 |
| Brillo                          | 500 cd/m²                                                                                         | Hoja de especificaciones del fabricante                 |
| Retroiluminación                | 4 LED blancos en paralelo                                                                         | Hoja de especificaciones del fabricante                 |
| Temperatura de funcionamiento    | -20 ~ 60 ℃                                                                                        | Hoja de especificaciones del fabricante                 |
| Tipo de interfaz                | QSPI (SCLK + D0~D3 + CS)                                                                          | Medición propia de este tutorial                        |
| Reloj de comunicación           | 20 MHz (valor de prueba de este tutorial)                                                         | Medición propia                                         |

> **Antes de comprar, confirma la versión**: la hoja de especificaciones del módulo del fabricante etiqueta esta pantalla como «interfaz RGB / chip driver ST77916 **o** JD9855», lo que indica que el mismo modelo TK015F5785 se suministra con distintas combinaciones de chip driver e interfaz. Este tutorial está pensado para la versión **JD9855 + QSPI** (en la introducción fue leyendo el IC ID = `FF 98 55 00` como se confirmó que el chip en realidad no era el ST77916 que el fabricante indicaba al principio). Si has comprado la versión con ST77916 o la versión con interfaz RGB, tanto la secuencia de registros de inicialización como el cableado deben cambiarse y no puedes copiar el código de este artículo tal cual.

La zona visible física de la pantalla circular es un círculo de diámetro Φ38.16 mm, que convertido a razón de 0.106 mm/píxel corresponde exactamente a un radio de píxel de 180 px; por eso en el código `R2MAX = 180²` pone deliberadamente en negro los píxeles fuera del círculo para que el borde circular quede limpio (ver el punto 4 de «Resolución de problemas comunes»).

La razón para elegirlo es muy directa: la interfaz QSPI tiene 3 líneas de datos más que el SPI tradicional, por lo que el ancho de banda para enviar datos es 4 veces el del SPI normal; para un volumen de píxeles como 360×360, seguir usando SPI de una sola línea daría una tasa de refresco bastante pobre.

### Descripción de pines

| Pin                | Función                                                    |
| ------------------ | ---------------------------------------------------------- |
| SCLK               | Línea de reloj QSPI                                        |
| D0 / D1 / D2 / D3  | Las cuatro líneas de datos QSPI (transmisión en paralelo en Quad Mode) |
| CS                 | Chip select; se pone a bajo para seleccionar esta pantalla |
| BL (retroiluminación) | Control de retroiluminación; algunos módulos no exponen este pin |
| VCC                | Alimentación, normalmente 3.3V                             |
| GND                | Masa común                                                 |

### JD9855 (chip driver)

JD9855 es un driver IC de LCD TFT en un solo chip, integrado en el módulo de pantalla, lanzado por el fabricante de chips Jadard (Jadard Technology). Incorpora una caché de imagen (GRAM) y se encarga de escribir los datos de píxel recibidos en la caché y de controlar las celdas líquidas para mostrar el color; en este proyecto su función es ejecutar la secuencia de registros de inicialización y la orden de escritura de píxeles RAMWR enviadas a través de `esp_lcd_panel_io`.

La buena noticia es que JD9855 **tiene una hoja de datos pública** (versión Preliminary V0.00 publicada por el fabricante de chips Jadard (Jadard Technology), octubre de 2023). Según la hoja de datos, sus especificaciones clave son:

| Parámetro                | Valor / Descripción                                                                                            | Origen en la hoja de datos |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Capacidad de driver      | SOC de un solo chip para driving de a-Si TFT, máximo 360 RGB×390 (Dual-Gate=780) puntos, 540 canales de source driver | Features / Intro           |
| Frame buffer integrado   | 360×390×18 bits (aprox. 315 KB de GRAM)                                                                         | Features                   |
| Interfaces admitidos     | 8080 paralelo (8-bit), RGB (6-bit), SPI (8/9-bit, 2-lane), **QSPI (con DDR)**, MIPI-DSI                        | System Interface           |
| Formato de color         | RGB565 (16-bit) / RGB666 (18-bit)                                                                              | Color Format               |
| Tensión de E/S           | 1.65V ~ 3.3V                                                                                                    | Features                   |
| Temperatura de funcionamiento | -40 ~ +85 ℃                                                                                                  | Features                   |

Esta hoja de datos detalla las definiciones de bits y la temporización de órdenes como 0x2A (CASET), 0x2B (RASET), 0x2C (RAMWR), 0x36 (MADCTL), 0x3A (COLMOD), etc.; las que se usan en el código de este artículo son precisamente estas órdenes estándar. **Cabe señalar**: la hoja de datos hace públicos el conjunto de instrucciones y la temporización, pero parámetros de ajuste de pantalla como la corrección Gamma, el boost de alimentación o las sub-órdenes definidas por cada fabricante (como los registros `0xDE` / `0xDF` / `0xC3` con «conmutación de banco de órdenes» de la secuencia de inicialización de este artículo) siguen siendo tablas de inicialización privadas ajustadas por el fabricante del panel para cada pantalla concreta. Basta con copiar la secuencia que da el fabricante para encender la pantalla; no hace falta profundizar en el significado de cada registro.

---

## Lista de materiales (BOM)

| Componente                                               | Cantidad   | Notas                                                                                                |
| -------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| Placa de desarrollo ESP32-S3                             | 1          | Recomendado con PSRAM, para el retroceso de la tabla de ángulos                                     |
| Módulo de pantalla circular TK015F5785 (JD9855 / QSPI)   | 1          | Asegúrate de que es la versión JD9855+QSPI (el mismo modelo tiene también versión ST77916/RGB; ver la descripción del componente) |
| Cables Dupont (hembra a hembra, según los pines del módulo) | A partir de 6 | SCLK / D0~D3 / CS, en total 6 cables, más VCC / GND                                              |

---

## Esquema de cableado

| Pin de la pantalla   | Conectar al pin del ESP32-S3                                |
| -------------------- | ----------------------------------------------------------- |
| SCLK                 | GPIO6                                                       |
| D0                   | GPIO15                                                      |
| D1                   | GPIO7                                                       |
| D2                   | GPIO11                                                      |
| D3                   | GPIO12                                                      |
| CS                   | GPIO16                                                      |
| BL (retroiluminación) | No expuesto en este módulo, no se puede controlar por software; se queda siempre encendida al recibir alimentación |
| VCC                  | 3.3V                                                        |
| GND                  | GND                                                         |

Recomendado revisar uno a uno tras terminar el cableado; ahorra el 80 % del tiempo de depuración. Al tener cuatro líneas de datos, si inviertes dos de ellas en QSPI el síntoma no suele ser pantalla negra sino pantalla con ruido de color, más difícil de diagnosticar que una pantalla totalmente negra.

---

## Bibliotecas necesarias

Buenas noticias: **no hace falta instalar ninguna librería de terceros**. El driver completo llama directamente a `driver/spi_master.h`, `esp_lcd_panel_io.h`, `esp_heap_caps.h` incluidos en ESP-IDF; estas cabeceras forman parte del núcleo de Arduino ESP32.

El único requisito estricto: el **núcleo de placa ESP32 en Arduino IDE debe ser v3.x** (basado en ESP-IDF v5). El núcleo v2.x se basa en ESP-IDF v4.4; el conjunto de API `esp_lcd_panel_io_tx_param` / `esp_lcd_panel_io_tx_color` tiene un comportamiento y rutas de cabecera distintos en las versiones antiguas, por lo que al compilar dará errores de «símbolo no encontrado» o «la firma de la función no coincide».

Forma de actualizar: Arduino IDE → Herramientas → Placa → Gestor de placas, busca "esp32" y actualiza el paquete del núcleo de espressif a una versión 3.x o superior.

---

## Código completo

> El propio código es de un solo archivo: cópialo y pégalo en un .ino nuevo para compilar. Ten en cuenta que el pin CS es `16` (hubo una versión antigua que por error lo escribía como `160`, que no existe; ver el punto 1 de «Resolución de problemas comunes»).

```cpp
/*
 * =============================================================================
 *  Demo colorida de un solo archivo para la pantalla circular TK015F5785 (JD9855, QSPI) — versión Arduino IDE
 * =============================================================================
 *
 *  ✦ Un solo archivo: driver + demo, todo en este único .ino; copia y pega, sin ningún archivo externo.
 *
 *  Efecto del demo (3 escenas en bucle automático, unas 6 s cada una, todas fluidas y continuas):
 *    [1] Plasma (flujo de plasma) — los colores fluyen como un líquido (tabla de sin)
 *    [2] Rueda de arcoíris        — espectro completo + giro lento (tabla precalculada de ángulos)
 *    [3] Ondas radiales           — ondulaciones de color del centro hacia afuera (fase con r²)
 *
 *  Al alimentar, la pantalla se llena de colores en movimiento; una prueba visual de que "la pantalla enciende + los colores son correctos", ideal como demo de encendido.
 *
 *  Clave de rendimiento: la operación por píxel de las tres escenas es "tabla de consulta + suma/resta de enteros", sin llamar a sin/atan2/sqrt,
 *                        por lo que el renderizado de cada frame es muy rápido, sin que el ojo perciba el barrido línea a línea; todo fluido.
 *
 *  Hardware: ESP32-S3 + TK015F5785 (JD9855, QSPI)
 *    SCLK=6  D0=15  D1=7  D2=11  D3=12  CS=16  retroiluminación=-1 (no expuesta, no se puede controlar)
 *  Dependencias: solo el núcleo de placa esp32 v3.x de Arduino IDE, sin librerías externas / sin fuentes / sin cabeceras externas.
 *  Carga: Board=ESP32S3 Dev Module, USB CDC On Boot=Enabled, puerto serie 115200.
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
/* Igual que en HelloWorld / programa de prueba; modificar a la vez si se cambia el cableado */
#define PIN_LCD_SCLK   6
#define PIN_LCD_D0     15
#define PIN_LCD_D1     7
#define PIN_LCD_D2     11
#define PIN_LCD_D3     12
#define PIN_LCD_CS     16
#define PIN_LCD_BL     -1      /* Retroiluminación; -1 significa que no se controla */ // El módulo actual no la expone, por lo que no se puede controlar

/* =====================================================================
 *  Driver de pantalla (JD9855 QSPI) — copia tal cual, normalmente no hace falta modificarlo
 *  Principio: Arduino-ESP32 3.x se basa en ESP-IDF y llama directamente a esp_lcd_panel_io para driver QSPI.
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

    /* RGB565 estándar */
    static uint16_t color565(uint8_t r, uint8_t g, uint8_t b)
    {
        return ((uint16_t)(r & 0xF8) << 8) | ((uint16_t)(g & 0xFC) << 3) | (b >> 3);
    }

    bool begin(int sclk, int d0, int d1, int d2, int d3, int cs, int backlight = -1)
    {
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
        io_config.pclk_hz            = 20 * 1000 * 1000;
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

    /* Envía un búfer RGB565 (little-endian) a una región rectangular */
    void pushRect(int x, int y, int w, int h, const uint16_t *data)
    {
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

    /* Relleno de pantalla completa (línea a línea, uso de memoria mínimo) */
    void fillScreen(uint16_t color)
    {
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

    void ensureDmaBuf(size_t need)
    {
        if (dma_buf_size >= need) return;
        if (dma_buf) free(dma_buf);
        dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_DMA);
        if (!dma_buf) dma_buf = (uint8_t *)heap_caps_malloc(need, MALLOC_CAP_8BIT);
        dma_buf_size = need;
    }

    void setAddrWindow(int x0, int y0, int x1, int y1)
    {
        uint8_t caset[4] = { (uint8_t)(x0>>8),(uint8_t)(x0&0xFF),(uint8_t)(x1>>8),(uint8_t)(x1&0xFF) };
        uint8_t raset[4] = { (uint8_t)(y0>>8),(uint8_t)(y0&0xFF),(uint8_t)(y1>>8),(uint8_t)(y1&0xFF) };
        sendCmd(JD9855_CASET, caset, 4);
        sendCmd(JD9855_RASET, raset, 4);
    }

    void sendCmd(uint8_t cmd, const uint8_t *data = nullptr, size_t len = 0)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x02UL << 24);
        esp_lcd_panel_io_tx_param(io, c, data, len);
    }
    void sendCmd(uint8_t cmd, std::initializer_list<uint8_t> data)
    {
        sendCmd(cmd, data.begin(), data.size());
    }

    void sendColor(uint8_t cmd, const uint8_t *data, size_t len)
    {
        uint32_t c = ((uint32_t)cmd << 8) | (0x32UL << 24);
        esp_lcd_panel_io_tx_color(io, c, data, len);
    }

    /* Secuencia de inicialización del fabricante para JD9855 (portada desde el driver esp_lcd_jd9855 de ESP-IDF) */
    void sendInitCommands()
    {
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
        sendCmd(0x11);            /* Salir de sleep */
        delay(120);
        sendCmd(0x29);            /* Encender la visualización */
        delay(10);
    }
};

/* =====================================================================
 *  Parte del demo — aquí está lo interesante
 *  Idea: en cada frame se calcula línea a línea el color de cada píxel y se envía a la pantalla.
 *       Toda cantidad "dependiente de la posición pero no del tiempo" (sin, tono, ángulo) se precalcula como tabla,
 *       de modo que en tiempo de ejecución cada píxel solo hace "tabla + suma/resta de enteros"; por eso las tres escenas son fluidas.
 * ===================================================================== */
JD9855_QSPI lcd;

static constexpr int W = JD9855_QSPI::H_RES;     /* 360 */
static constexpr int H = JD9855_QSPI::V_RES;     /* 360 */
static constexpr int CX = W / 2;                  /* x del centro */
static constexpr int CY = H / 2;                  /* y del centro */
static constexpr int RADIUS = 180;                /* Radio visible de la pantalla circular */
static constexpr int R2MAX  = RADIUS * RADIUS;    /* Umbral de r² fuera del círculo (180²=32400) */

static const int BLOCK_H = 40;             /* Renderiza + envía 40 líneas por lote, reduce drásticamente el número de envíos */
uint16_t blockBuf[W * BLOCK_H];            /* Búfer de bloque (360*40*2=28 KB, RAM interna, sin necesidad de PSRAM) */
uint8_t  sinTab[256];       /* Tabla de seno: sinTab[i] = sin(i/256*2π)*127+128 */
uint16_t hsvTab[256];       /* Tabla de consulta tono (0-255) -> RGB565 (saturación/valor máximos) */
uint8_t *angleTab = nullptr;/* Tabla de consulta del ángulo de cada píxel relativo al centro (360*360 B), para que la escena de la rueda no llame a atan2 */

/* HSV(0-359, 0-255, 0-255) -> RGB565 */
uint16_t hsvTo565(int h, uint8_t s, uint8_t v)
{
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

/* Genera en el arranque las dos tablas (sin / tono); después el render solo consulta las tablas */
void buildTables()
{
    for (int i = 0; i < 256; i++) {
        float s = sinf(i / 256.0f * 2.0f * (float)M_PI);
        sinTab[i] = (uint8_t)(s * 127.0f + 128.0f);
    }
    for (int h = 0; h < 256; h++) {
        hsvTab[h] = hsvTo565(h * 360 / 256, 255, 255);
    }
}

/* Precalcula el ángulo de cada píxel respecto al centro (atan2) y lo guarda como tabla de consulta 0-255.
   En tiempo de ejecución, la escena de la rueda solo consulta la tabla y no llama a atan2f en cada frame (eso era el culpable del tartamudeo original).
   Se calcula una sola vez en setup; el tiempo empleado da igual. Se intenta primero en RAM interna (~126 KB); si no, se retrocede a PSRAM;
   si tampoco hay, se deja a nullptr y la escena se degrada a atan2f (aún se ve, solo que va a tirones). */
void buildAngleTable()
{
    size_t n = (size_t)W * H;
    angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (!angleTab) angleTab = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM);
    if (!angleTab) { Serial.println(F("[WARN] Fallo al asignar angleTab, la escena de la rueda será más lenta")); return; }
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            float dx = (float)(x - CX), dy = (float)(y - CY);
            float a = atan2f(dy, dx) / (2.0f * (float)M_PI);   /* -0.5..0.5 */
            angleTab[y * W + x] = (uint8_t)(a * 256.0f);        /* Se mapea en anillo a 0-255 */
        }
    }
    Serial.printf("[INIT] Tabla de ángulos lista, %d KB (la escena de la rueda será fluida)\n", (int)(n / 1024));
}

inline uint8_t sin8(int phase) { return sinTab[(uint8_t)phase]; }

/* ---- Escena 1: Plasma, flujo de plasma (solo tabla de consulta) ---- */
inline uint16_t plasmaPixel(int x, int y, int t)
{
    int v = sin8(x * 3 + t)
          + sin8(y * 3 - t * 2)
          + sin8((x + y) * 2 + t / 2)
          + sin8((x - y) * 2 - t / 2);
    return hsvTab[(uint8_t)(v / 4 + t)];
}

/* ---- Escena 2: Rueda de arcoíris (tabla de ángulos + r², solo enteros) ---- */
inline uint16_t wheelPixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;                 /* Fuera del círculo se pone en negro, borde limpio */
    int ang = angleTab ? angleTab[y * W + x]
                       : (int)(atan2f((float)dy, (float)dx) / (2.0f * (float)M_PI) * 256.0f);
    int hue = ang + r2 / 200 + t;             /* Superpone el tono a lo largo del radio, formando una rueda en espiral */
    return hsvTab[(uint8_t)hue];
}

/* ---- Escena 3: Ondas radiales (r² se usa directamente como fase, sin raíz cuadrada) ---- */
inline uint16_t ripplePixel(int x, int y, int t)
{
    int dx = x - CX, dy = y - CY;
    int r2 = dx * dx + dy * dy;
    if (r2 > R2MAX) return 0;
    int v = sin8(r2 / 80 - t * 3);            /* Fase de la onda: se expande con la distancia y el tiempo */
    return hsvTab[(uint8_t)(v + r2 / 400)];
}

/* Renderiza un frame: calcula BLOCK_H líneas cada vez y luego envía el bloque entero (9 envíos en lugar de 360, ahorra el coste de órdenes y sube la tasa de refresco,
   y además hace que cada bloque de 40 líneas se refresque a la vez, lo que reduce notablemente la sensación de barrido línea a línea). sceneId elige la función de píxel (0=plasma 1=wheel 2=ripple) */
void renderFrame(int sceneId, int t)
{
    for (int by = 0; by < H; by += BLOCK_H) {
        int bh = (H - by < BLOCK_H) ? (H - by) : BLOCK_H;
        for (int y = 0; y < bh; y++) {
            int yy = by + y;
            for (int x = 0; x < W; x++) {
                uint16_t c;
                switch (sceneId) {
                    case 0:  c = plasmaPixel(x, yy, t); break;
                    case 1:  c = wheelPixel(x, yy, t);  break;
                    default: c = ripplePixel(x, yy, t); break;
                }
                blockBuf[y * W + x] = c;
            }
        }
        lcd.pushRect(0, by, W, bh, blockBuf);
    }
}

/* Nombres de las escenas */
const char *SCENE_NAMES[] = { "Plasma (flujo de plasma)", "Rueda de arcoíris", "Ondas radiales" };
const int      N_SCENES   = 3;
const uint32_t SCENE_MS   = 6000;    /* Cada escena dura 6 segundos */

int      curScene   = 0;
uint32_t sceneStart = 0;

/* ----------------------------- setup ------------------------------- */
void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println(F("[TK015F5785] Demo colorida de un solo archivo (JD9855 QSPI)"));

    Serial.println(F("[LCD] begin..."));
    bool ok = lcd.begin(PIN_LCD_SCLK, PIN_LCD_D0, PIN_LCD_D1, PIN_LCD_D2,
                        PIN_LCD_D3, PIN_LCD_CS, PIN_LCD_BL);
    if (!ok) {
        Serial.println(F("[LCD] init FAILED! Revisa los pines / la versión del núcleo (necesita esp32 v3.x)"));
        while (true) { delay(1000); }
    }
    Serial.println(F("[LCD] init OK"));

    buildTables();
    buildAngleTable();          /* Precalcula la tabla de ángulos para que la escena de la rueda sea fluida */
    lcd.fillScreen(0);
    sceneStart = millis();
    Serial.printf("[DEMO] Escena 1/%d: %s\n", N_SCENES, SCENE_NAMES[curScene]);
}

/* ----------------------------- loop -------------------------------- */
void loop()
{
    int t = (int)(millis() / 12);     /* Paso de avance de la animación; cuanto mayor, más rápido */

    renderFrame(curScene, t);

    if (millis() - sceneStart >= SCENE_MS) {
        sceneStart = millis();
        curScene   = (curScene + 1) % N_SCENES;
        Serial.printf("[DEMO] Escena %d/%d: %s\n",
                      curScene + 1, N_SCENES, SCENE_NAMES[curScene]);
    }
}
```

### Explicación del código

Primer paso: en `JD9855_QSPI::begin()`, primero se arranca con `spi_bus_initialize` un bus QSPI que discurre por 4 líneas de datos, y luego se conecta con `esp_lcd_new_panel_io_spi` un dispositivo LCD IO con `quad_mode = true`; este paso es la clave para que todo el driver funcione. Si no se activa `quad_mode`, de las cuatro líneas de datos solo una transmite realmente datos y la tasa de refresco se desploma hasta un nivel inutilizable.

Segundo paso: `sendInitCommands()` copia la tabla de inicialización de registros que da el fabricante del panel y la envía registro a registro a través de `esp_lcd_panel_io_tx_param`. No hace falta entender el significado de cada registro; si cambias de pantalla, no toques este bloque.

Tercer paso, el verdadero punto fuerte de este código: las tres escenas de animación no llaman en tiempo de ejecución a funciones lentas como `sin`, `atan2`, `sqrt`, sino que en la fase `setup()` se precalculan todas como tablas de consulta (`sinTab`, `hsvTab`, `angleTab`). En tiempo de ejecución cada píxel solo hace «tabla de consulta + suma/resta de enteros», y de ahí que 360×360 = 129 600 píxeles por frame se mantengan fluidos sin desgarro.

Cuarto paso: `renderFrame()` no envía línea a línea, sino que acumula `BLOCK_H = 40` líneas y luego hace un único `pushRect` del bloque entero; las 360 líneas solo necesitan 9 envíos, lo que ahorra muchísimo coste de órdenes SPI frente a 360 envíos línea por línea.

---

## Resolución de problemas comunes

Tranquilo: los siguientes problemas cubren la mayoría de los errores al no conseguir encender una pantalla circular.

**1. Al alimentar, totalmente negra y el puerto serie tampoco imprime `[LCD] init OK`** Primero comprueba si el pin CS está bien conectado; es también la trampa más frecuente de la versión borrador de este código: `PIN_LCD_CS` llegó a escribirse por error como `160` (un número de GPIO inexistente). En el bloque de código de este artículo ya se ha corregido a `16`. Si copiaste una versión antigua de otro sitio, asegúrate de que esa línea sea `16` y no `160`.

**2. La pantalla se ilumina pero con ruido de color / colores desordenados** Casi seguro que el orden de las cuatro líneas de datos D0~D3 está invertido. QSPI es sensible al orden de los cables, no es lo mismo que invertir MOSI/MISO en un SPI normal; conviene revisar cable a cable con la tabla de cableado y no ir «a ojo».

**3. Error de compilación: no encuentra `esp_lcd_panel_io.h`** Significa que el núcleo actual de Arduino ESP32 sigue siendo v2.x (basado en ESP-IDF v4.4). Ve al Gestor de placas y actualiza el núcleo esp32 de espressif a v3.x o superior antes de compilar.

**4. Las cuatro esquinas de la pantalla circular siempre están negras, ¿es que está mal conectada?** Es un comportamiento normal, no un fallo. En el código `R2MAX = 180²`; los píxeles que superan ese radio se ponen deliberadamente en negro, porque la zona visible física de la pantalla circular ya es de por sí un círculo y las cuatro esquinas ya quedan tapadas por el marco. Así el borde queda más limpio.

**5. El puerto serie imprime `Fallo al asignar angleTab` y la escena de la rueda va a tirones** Significa que no hay RAM interna suficiente para asignar esta tabla de ángulos de unos 126 KB (360×360 bytes). El código ya incluye una lógica de retroceso: primero prueba la RAM interna; si no, retrocede a la PSRAM; y si tampoco, calcula directamente con `atan2f` (se ve, pero va claramente más lento). Si tu placa de desarrollo no tiene PSRAM y siempre notas que la escena de la rueda va más a tirones que las otras dos, este es el motivo; cambiarte a una placa con PSRAM lo soluciona de raíz.

**6. La retroiluminación siempre encendida y no se puede apagar** En el código `PIN_LCD_BL` está puesto a `-1`, y el comentario también indica «el módulo actual no la expone, por lo que no se puede controlar»; si tu módulo sí expone el pin de control de retroiluminación, cambia esta macro al número de GPIO correspondiente y pásalo en `begin()` para implementar el control de brillo/apagado por software.

---

## FAQ

**P: ¿Cómo enciende un ESP32 una pantalla circular?** R: Lo esencial es usar la interfaz QSPI + `esp_lcd_panel_io` para conectar directamente con el chip driver, sin depender de librerías gráficas generales como TFT_eSPI; al cablear, conecta correctamente los cinco cables SCLK/D0~D3/CS y copia la tabla de registros de inicialización con la secuencia que proporciona el fabricante del panel para encenderla.

**P: ¿Qué librería usar para una pantalla circular con driver JD9855?** R: No hace falta ninguna librería adicional. JD9855 no está soportado de forma nativa por las librerías gráficas más extendidas (como TFT_eSPI o la lista oficial de drivers de LVGL); lo más fiable es, como en este artículo, llamar directamente a la API `esp_lcd_panel_io` que viene con ESP-IDF y escribir a mano unas decenas de líneas de inicialización.

**P: ¿Cuál es la diferencia de cableado entre una pantalla QSPI y una SPI normal?** R: Una SPI normal solo tiene 1 línea de datos (MOSI), mientras que QSPI tiene 4 (D0~D3) que transmiten en paralelo; el ancho de banda es 4 veces el del SPI normal, a cambio de 3 cables más y de que en `esp_lcd_panel_io_spi_config_t` hay que poner `flags.quad_mode` a `true`.

**P: ¿Por qué una pantalla circular con ESP32-S3 se queda siempre en negro?** R: Las tres causas más comunes, por probabilidad: pin CS mal conectado o número equivocado; versión del núcleo de la placa por debajo de v3.x que provoca fallo en la inicialización; alimentación inestable (más evidente cuando el cableado QSPI es largo). Imprimir o no `[LCD] init OK` en el puerto serie permite localizar rápidamente si es un problema de la capa de driver o del cableado.

**P: ¿Cómo se usa esp_lcd_panel_io desde Arduino para driver una pantalla?** R: En tres pasos: `spi_bus_initialize` crea el bus SPI; `esp_lcd_new_panel_io_spi` crea el handle de LCD IO (en este paso se indican CS / frecuencia de reloj / modo SPI / quad_mode); por último, `esp_lcd_panel_io_tx_param` envía órdenes y `esp_lcd_panel_io_tx_color` envía los datos de píxel.

**P: ¿Se puede usar la librería TFT_eSPI con una pantalla circular ESP32?** R: TFT_eSPI está pensada sobre todo para los chips driver de su lista de soporte integrada, y un chip driver QSPI poco habitual como JD9855 no está en ella; intentar encajarlo suele requerir modificar por tu cuenta el código de la capa de driver, así que resulta más sencillo escribirlo a mano con la API nativa de ESP-IDF.

**P: ¿Hay memoria suficiente para una pantalla circular de 360×360?** R: Sí, pero hay que prestar atención a cómo se asigna. Un búfer de pantalla completa necesita 360×360×2 bytes ≈ 253 KB; en este artículo se usa renderizado por bloques (cada bloque, 40 líneas, unos 28 KB), más la tabla de consulta de ángulos opcional de 126 KB; la RAM interna basta para alojarlo todo y no hace falta añadir PSRAM solo para esta pantalla (salvo que quieras asegurar que la tabla de ángulos se queda en la RAM interna).

---

## Ideas para ampliar

Una vez que el demo básico funciona, hay bastantes direcciones por donde seguir trasteando con esta pantalla circular:

- Sustituir las tres escenas por visualización de datos en tiempo real (carga de CPU, clima, ritmo cardíaco, etc.; la forma circular es muy adecuada para cuadros de mando)
- Añadir un sensor táctil o un mando rotativo y convertirla en un panel de control circular interactivo
- Portar, con la misma idea de esp_lcd_panel_io, pantallas con otros chips driver QSPI
- Aumentar BLOCK_H y pclk_hz para hacer pruebas de estrés de la tasa de refresco y encontrar el límite de tu módulo concreto

---

## Referencias

- <cite index="3-1">La documentación oficial del periférico LCD de ESP-IDF explica que el componente esp_lcd es un conjunto de API genéricas multi-chip que Espressif proporciona para soportar múltiples tipos de pantalla (SPI LCD, I80 LCD, RGB/SRGB LCD, etc.)</cite>: [ESP-IDF LCD Peripheral (ESP32-S3)](https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32s3/api-reference/peripherals/lcd.html)
- [Hoja de datos oficial de la serie ESP32-S3 (PDF, oficial de Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Repositorio GitHub oficial de espressif/arduino-esp32](https://github.com/espressif/arduino-esp32)
- <cite index="3-2">La hoja de datos pública de JD9855 (versión Preliminary V0.00 publicada por el fabricante de chips Jadard (Jadard Technology), 2023-10-17; abajo se enlaza el espejo PDF hospedado por OSPTek) lista 540 canales de source driver, resolución 360 RGB×390, GRAM integrado, múltiples interfaces 8080/SPI/QSPI/MIPI-DSI y la temporización completa de órdenes como CASET/RASET/RAMWR</cite>: [JD9855 Data Sheet (Preliminary V0.00, PDF)](https://admin.osptek.com/uploads/JD_9855_DS_Preliminary_V0_00_20231017_154f0917e1.pdf)
