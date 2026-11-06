---
title: "ESP32-S3 controla la pantalla LCD monocroma reflectiva ST7305 de 4,2 pulgadas: 15 ejemplos completos (SPI de 4 hilos + Arduino)"
boardId: esp32s3
moduleId: display/lcd42-st7305-reflective
category: esp32
date: 2026-11-06
intro: "Usa un Arduino Nano ESP32 (ESP32-S3) con SPI de 4 hilos para controlar una pantalla LCD monocroma reflectiva ST7305 de 4,2 pulgadas y 300×400: cableado, grabación, 15 ejemplos de visualización y solución de problemas. Perfecto para makers de Arduino que quieran jugar con pantallas reflectivas sin retroiluminación."
image: "https://img.lingflux.com/2026/11/e43d291425c39954fa157a9adb62fddb.jpg"
---

> **En una frase**: Un Arduino Nano ESP32 (ESP32-S3) más una pantalla LCD monocroma reflectiva ST7305 de 4,2 pulgadas: un solo archivo `.ino` ejecuta el controlador y una demo de carrusel automático de 15 páginas, sin ninguna librería de pantalla de terceros.

```text
Dificultad: ⭐⭐☆☆☆ (si sabes conectar cables dupont y usar el Arduino IDE, puedes hacerlo)
Tiempo estimado: 30 minutos (sin contar el tiempo de luchar con conexiones flojas)
Entorno de pruebas: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10
```

> **TL;DR (inicio rápido):**
>
> 1. Cableado: SCLK → D7/GPIO10, MOSI → D5/GPIO8, CS → D6/GPIO9, DC → D4/GPIO7, RES → D3/GPIO6.
> 2. VCI va a 3.3V y la pantalla comparte tierra con la placa; TE y BLC quedan sin conectar. Ojo: en el Nano ESP32, D5 es GPIO8, no GPIO11.
> 3. Instala el paquete de placas `esp32 by Espressif Systems`; no necesitas U8g2, Adafruit GFX ni ninguna otra librería de pantalla.
> 4. Abre el `ST7305_RLCD_Demo.ino` incluido, selecciona la placa `Arduino Nano ESP32`, compila y graba.
> 5. Pon el monitor serie a 115200 baudios; la pantalla hará un carrusel automático por 15 ejemplos. Las páginas animadas usan HPM; las estáticas solo se escriben en pantalla una vez.

## Introducción: una pantalla que se ve mejor cuanto menos brilla

Mirar una LCD normal por la noche a veces es como si alguien apuntara una pequeña linterna directa a tus ojos. Las pantallas de tinta electrónica son cómodas, sí, pero ver una actualizar una animación es como esperar el autobús: sabes que llegará, pero no puede llegar más rápido.

Las pantallas totalmente reflectivas toman otro camino: en lugar de iluminar píxeles con una retroiluminación, reflejan la luz ambiente, como una hoja de papel que tu programa puede reescribir. Con buena luz, la imagen se ve aún más clara; cuando está demasiado oscuro, enciende una lámpara — no demuestres tu fuerza de voluntad entrecerrando los ojos.

Esta vez usé un Arduino Nano ESP32 (cuyo microcontrolador es un ESP32-S3) para controlar un Mono TFT reflectivo de 4,2 pulgadas, 300×400, con controlador ST7305. El objetivo no era parar tras un `Hello World`, sino probar texto, escala de grises, geometría, animación, tasa de tramas y rotación en cuatro direcciones a lo largo de 15 ejemplos.

Lo de "descansa la vista" aquí se refiere a ver sin retroiluminación, reflejando luz ambiente — no es una certificación médica. Cuando tus ojos necesiten descanso, ninguna pantalla, por avanzada que sea, puede parpadear por ti.

## El resultado: 15 demos del ST7305 en carrusel automático

Tras grabar un único archivo `.ino`, la pantalla empieza por la página de inicio y recorre 15 páginas en bucle, sin botones, comandos serie, red ni recursos de imagen externos.

![Carrusel de 15 demos del ST7305](https://img.lingflux.com/2026/11/26bdefa52b9c1d4b6e779c08f9744255.jpg)

|    # | Demo          | Qué mirar                                              | Duración | FPS objetivo |
| ---: | ------------- | ------------------------------------------------------ | -------: | -----------: |
|    1 | Hello World   | Texto grande, bordes, fondo tramado y una carita       |   3.5 s  |      estática |
|    2 | Dither Gray   | 17 niveles de tramado Bayer 4×4, gradiente y círculos grises | 6.5 s |  estática |
|    3 | Geometry      | Líneas, rectángulos, círculos, triángulos y polígonos  |      5 s |      estática |
|    4 | Pixel Grid    | Bordes, relación de aspecto, diagonales y centrado geométrico | 5 s |   estática |
|    5 | Text & Font   | ASCII 5×7, escalado entero y texto invertido           |    5.5 s |      estática |
|    6 | Dashboard UI  | Tarjetas, barras de progreso, interruptores, batería y datos en vivo | 9 s | 4 FPS |
|    7 | Frame Rate    | FPS real, coste por trama y gráfico histórico de 54 puntos | 8.5 s | sin límite |
|    8 | Fine Patterns | Tableros de 1/2/4 píxeles y parpadeo de líneas finas   |      6 s |       2 FPS  |
|    9 | Bounce        | Rebotes, colisiones, ghosting de movimiento y contador |      9 s |      20 FPS  |
|   10 | Starfield     | Vuelo en perspectiva a través de 56 estrellas          |      9 s |      20 FPS  |
|   11 | Game of Life  | Juego de la vida de Conway en un toroide 34×34         |     12 s |       3 FPS  |
|   12 | Uptime Clock  | Reloj de tiempo activo basado en `esp_timer`           |      9 s |       4 FPS  |
|   13 | Retro Desktop | Escritorio estilo Macintosh retro                      |    6.5 s |      estática |
|   14 | Inversion     | Inversión blanco/negro a pantalla completa y contraste |      6 s |       2 FPS  |
|   15 | Rotation      | Conmutación 0°/90°/180°/270° en cuatro direcciones     |     12 s |       4 FPS  |

El FPS objetivo es el ritmo al que el programa dibuja y envía tramas — no es la tasa de refresco óptica del panel de cristal. La página 7 mide "dibujo + transferencia SPI de una trama completa de 15000 bytes", no una marca de benchmark inflada para presumir.

Vídeo de demostración en YouTube:

<iframe width="560" height="315" src="https://www.youtube.com/embed/IWZMK5AJsvI?si=pXumVzEKfuIYEra9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Descripción de componentes

### Mono TFT reflectivo de 4,2 pulgadas: una pantalla blanco y negro "revelada" por la luz ambiente

El Mono TFT reflectivo de 4,2 pulgadas es una LCD monocroma reflectiva sin retroiluminación. Presenta imágenes en blanco y negro usando la luz ambiente, y en este proyecto muestra los 15 patrones de prueba y páginas animadas.

Piénsalo como una hoja de papel que obedece a un microcontrolador: cuanto mejor la luz ambiental, más descansada la lectura; sin luz ambiente, tampoco se convierte sola en linterna.

| Parámetro        | Esta pantalla                       |
| ---------------- | ----------------------------------- |
| N.º de parte     | W420HC018MONO-12Z                   |
| Tamaño           | 4,2 pulgadas                        |
| Resolución       | 300×400 píxeles, blanco/negro 1 bit |
| Tipo de pantalla | Totalmente reflectiva, normalmente blanca, sin retroiluminación |
| IC controlador   | Sitronix ST7305                     |
| Interfaz host    | SPI de 4 hilos único, solo escritura |
| Alimentación     | 2.8V/3.3V — aquí se usa 3.3V        |
| Área activa      | 63.6×84.84 mm                       |
| Temp. de trabajo | -20℃～+70℃                          |

Por qué esta: 300×400 basta para un panel de instrumentos completo, el SPI de 4 hilos apenas ocupa pines, y al no necesitar circuito de retroiluminación es ideal para datos ambientales, relojes y cuadros de baja tasa de refresco.

### Definición de pines

Todas las señales salen por un cable FPC de 12 pines; con la placa adaptadora puedes conectar la pantalla a tu placa con cables dupont:

| Pin FPC   | Nombre | Función                    | Uso en este ejemplo      |
| --------: | ------ | -------------------------- | ------------------------ |
|  1, 5, 12 | GND    | Tierra de alimentación     | A GND de la placa        |
|      2, 3 | NC     | No conectado               | Sin conectar             |
|         4 | VCI    | Alimentación de pantalla   | A 3.3V                   |
|         6 | TE     | Salida de sincronismo de trama | Sin usar, al aire    |
|         7 | DC     | Selección comando/datos    | A GPIO7                  |
|         8 | CS     | Chip select SPI, activo bajo | A GPIO9                |
|         9 | SCL    | Reloj SPI                  | A GPIO10                 |
|        10 | SDA    | Entrada de datos SPI, es decir MOSI | A GPIO8           |
|        11 | RESET  | Reset por hardware, activo bajo | A GPIO6             |

Ojo: aquí `SDA` es MOSI de SPI, no I²C. Mismo nombre, distinto trabajo — no la dejes ir de visita con tus sensores I²C.

### ST7305: el "clasificador" que traduce bytes a píxeles blanco y negro

El ST7305 es el controlador/driver IC de TFT monocromo de ultra bajo consumo de Sitronix. Recibe comandos del host, gestiona la RAM de pantalla y maneja el panel — en este proyecto convierte los datos de trama enviados por el ESP32-S3 en píxeles blanco y negro sobre la pantalla.

| Parámetro              | Valor / configuración en este proyecto       |
| ---------------------- | -------------------------------------------- |
| Capacidad máx.         | 408×408 píxeles mono                         |
| Profundidad de píxel   | 1 bit/píxel                                  |
| Ciclo mín. escritura SPI | 30 ns — unos 33 MHz máx.                   |
| SPI en este proyecto   | Mode 0, 20 MHz, MSB primero                  |
| Tasa de tramas HPM     | 16 Hz o 32 Hz; configurada a 16 Hz aquí      |
| Tasa de tramas LPM     | 0.25～8 Hz; configurada a 8 Hz en el init    |
| Trama completa aquí    | 15000 bytes                                  |

No lo elegimos porque tenga muchos registros y parezca profesional, sino porque el módulo ya lo encapsula muy bien: el host solo necesita SPI, DC, CS y RESET para refrescar toda la pantalla.

### Placa adaptadora FPC: traduciendo "cable plano fino" a "cables dupont"

Una placa adaptadora FPC es una tarjeta de conversión de interfaz de cable que saca el FPC de 12 pines de la pantalla a pines de cabecera fáciles de experimentar, de modo que en este proyecto la pantalla se puede conectar a la placa con cables dupont corrientes.

| Parámetro      | Uso en este proyecto                      |
| -------------- | ----------------------------------------- |
| Lado pantalla  | FPC de 12 pines                           |
| Lado experimento | GND, VCC, SCL, SDA, RES, DC, CS, BLC    |
| Señales necesarias | 5 líneas de control + 3.3V + GND        |
| Se pueden dejar | TE, BLC                                   |

La usamos para no tener que soldar a mano ese cable plano tan fino. Estamos haciendo un experimento de pantalla, no presentándonos a un examen doble de vista y soldadura.

## BOM

| Componente                              | Cantidad | Necesidad   | Notas                                          |
| --------------------------------------- | -------: | ----------- | ---------------------------------------------- |
| Placa Arduino Nano ESP32                |        1 | Necesaria   | El microcontrolador es un ESP32-S3             |
| Pantalla mono reflectiva ST7305 de 4,2" |        1 | Necesaria   | 300×400, alimentada a 3.3V                     |
| Placa adaptadora FPC correspondiente    |        1 | Recomendada | Solo facilita el cableado; vale un conector FPC |
| Cables dupont                           |     7+   | Necesarios  | Cuanto más cortos, menos problemas de contacto y señal |

## Cableado: SPI de 4 hilos del ESP32-S3 al ST7305

![Cableado del ST7305 a un Arduino Nano ESP32](https://img.lingflux.com/2026/11/a029c2eab88f09f46c951a53287b647e.jpg)

```text
Arduino Nano ESP32                         Placa adaptadora ST7305
┌──────────────────┐                     ┌──────────────────┐
│ D7  / GPIO10     │ ───── SCLK ───────► │ SCL              │
│ D5  / GPIO8      │ ───── MOSI ───────► │ SDA              │
│ D6  / GPIO9      │ ───── CS ─────────► │ CS               │
│ D4  / GPIO7      │ ───── DC ─────────► │ DC               │
│ D3  / GPIO6      │ ───── RESET ──────► │ RES              │
│ 3V3              │ ───── 3.3V ───────► │ VCC / VCI        │
│ GND              │ ───── GND ────────► │ GND              │
└──────────────────┘                     └──────────────────┘
```

| Serigrafía adaptador | FPC pantalla | Serigrafía Nano ESP32 | ESP32-S3 GPIO | Uso                  |
| -------------------- | -----------: | --------------------- | ------------: | -------------------- |
| SCL                  |        PIN9  | D7                    |        GPIO10 | Reloj SPI            |
| SDA                  |       PIN10  | D5                    |         GPIO8 | SPI MOSI             |
| CS                   |        PIN8  | D6                    |         GPIO9 | Chip select          |
| DC                   |        PIN7  | D4                    |         GPIO7 | Selección comando/datos |
| RES                  |       PIN11  | D3                    |         GPIO6 | Reset por hardware   |
| VCC/VCI              |        PIN4  | 3V3                   |   3.3V fuente | Alimentación pantalla |
| GND                  |   PIN1/5/12  | GND                   |           GND | Tierra común         |
| TE                   |        PIN6  | sin conectar          |             — | Sincronismo de trama no usado aquí |
| BLC                  |           —  | sin conectar          |             — | Pantalla reflectiva sin retroiluminación |

**En este ejemplo VCI va a 3.3V — no lo conectes a 5V, VBUS ni VIN.**

### Sin circuito driver extra: el ESP32-S3 controla el FPC de la pantalla directamente

Con alimentación a 3.3V, esta pantalla puede ser manejada directamente por los GPIO del ESP32-S3: conecta SCL, SDA, CS, DC y RESET del FPC a sus GPIO correspondientes, VCI a 3.3V y comparte GND. No hace falta intercalar chip de cambio de nivel, placa driver de pantalla dedicada ni ningún otro circuito periférico.

La "conexión directa" aquí se refiere a la conexión **eléctrica** — no significa meter el cable plano desnudo y blando directamente en los pines de la placa. En la práctica sigues necesitando un conector FPC de 12 pines, un zócalo soldado o una placa adaptadora para sacar los contactos del cable plano de forma fiable. La placa adaptadora de este artículo es solo un adaptador mecánico para usar cables dupont; no es un circuito driver que la pantalla necesite para funcionar. Si cableas directamente desde un conector FPC, sigue los números PIN FPC de la tabla de arriba — la correspondencia de señales es idéntica.

El punto donde el cableado falla más fácilmente: el código quiere los números GPIO del chip, no los números impresos en la serigrafía de la placa. Aquí `D5 = GPIO8`, mientras que `GPIO11 = A4`. Si cableas MOSI a GPIO11 por error, el programa sigue corriendo y el monitor serie sigue imprimiendo — mientras la pantalla se queda tan callada como si no hubiera pagado la factura de la luz.

Tras cablear, repasa en el orden "alimentación → tierra común → SCLK → MOSI → CS → DC → RESET" — ahorra un 80% del tiempo de depuración. Para el FPC, confirma también el sentido de inserción, que esté totalmente metido y bloqueado; una muesca suelta puede tumbar toda la pantalla.

## Librerías a instalar: solo el paquete de placas ESP32

Esta demo Arduino del ST7305 no depende de U8g2, Adafruit GFX, TFT_eSPI ni de ninguna librería de fuentes extra. El driver, la fuente ASCII 5×7, las primitivas gráficas y las 15 páginas viven en un único archivo `.ino`.

### Paso 1: instala el Arduino IDE

Este artículo usa Arduino IDE 2.3.8, descargable del sitio web oficial de Arduino.

### Paso 2: instala el ESP32 Arduino Core

Abre el Gestor de Placas, busca e instala:

```text
esp32 by Espressif Systems (versión probada en este artículo: 3.3.10)
```

Elige en el Gestor de Placas la misma versión usada aquí — así minimizas las diferencias de API y de configuración por defecto entre paquetes de placas.

### Paso 3: selecciona la placa y el puerto

```text
Placa: Arduino Nano ESP32
Puerto: elige el puerto que aparece tras conectar la placa
Monitor serie: 115200
```

El `SPI` estándar de Arduino, los temporizadores y `esp_timer` vienen todos con el entorno de la placa — no hace falta ir al Gestor de Librerías a "instalar al azar unas cuantas librerías de nombre parecido".

### Extra: ¿y si quieres usar una librería existente?

Este tutorial usa un driver de un solo archivo para que la inicialización, el framebuffer y el mapeo de píxeles se puedan leer directamente — no significa que el ST7305 no pueda usar librerías. Si quieres desarrollar sobre este proyecto, considera estas opciones:

| Opción                                                       | Ideal para                                | Qué vigilar al usarla                                        |
| ------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| [U8g2](https://github.com/olikraus/u8g2) v2.36 o superior    | Texto, gráficos básicos y fuentes ricas   | Ofrece `U8G2_ST7305_300X400_1_4W_HW_SPI`, con soporte de SPI hardware de 4 hilos a esta resolución; comprueba la versión de la librería al instalar y cambia CS, DC, RESET y los pines SPI a los GPIO usados en este artículo |
| [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library) | Si quieres un driver Arduino dedicado para ST7305 | Ofrece envoltorios como `ST7305_4p2_BW_DisplayDriver`; verifica la resolución, la secuencia de inicialización y la configuración de pines de `DisplayConfig.h` — este artículo no la ha probado en este módulo |
| LVGL + driver de bajo nivel ST7305                           | UI complejas, widgets y gestión de páginas | LVGL se encarga de la UI y no sustituye al driver del ST7305; hay que conectar el driver de este artículo (o el del fabricante) al callback de refresco de LVGL, y evaluar el uso de framebuffer y el refresco real |

No des por hecho que librerías gráficas genéricas como Adafruit GFX, TFT_eSPI o Arduino_GFX manejarán el ST7305 nada más instalarlas — comprueba primero si la versión actual soporta explícitamente este controlador; si no, tendrás que adaptarlo tú. Incluso cambiando de librería, las restricciones de hardware — alimentación 3.3V, SPI de 4 hilos, HPM/LPM y el mapeo de píxeles de 2 filas × 4 columnas — no desaparecen.

**Recomendación rápida:** si es sobre todo texto y gráficos básicos → prueba U8g2 primero; si quieres UI compleja → considera LVGL; si quieres control total sobre la inicialización, el envío de tramas completas y el ritmo de animación → el enfoque de un solo archivo de este artículo es lo más directo.

## Código completo: programa Arduino de un solo archivo ST7305_RLCD_Demo

Código fuente completo y listo para grabar:

```c
/*
 * ST7305 LCD monocroma totalmente reflectiva de 4.2" 300x400 — demo Arduino completa en un solo archivo
 *
 * Mismas funciones que la versión ESP-IDF: driver + primitivas gráficas + demo de carrusel automático de 15 páginas.
 * Todo el programa es este único archivo .ino, sin dependencias de librerías de terceros, fácil de compartir.
 *
 * Cableado (serigrafía del Arduino Nano ESP32):
 *   SCLK = GPIO10 (D7)   MOSI = GPIO8 (D5)   CS  = GPIO9 (D6)
 *   DC   = GPIO7  (D4)   RES  = GPIO6 (D3)   VCI = 3.3V  GND = GND
 *
 * Preparación del Arduino IDE:
 *   1. Instala "esp32 by Espressif Systems" en el Gestor de Placas
 *   2. Selecciona la placa "Arduino Nano ESP32" y su puerto serie
 *   3. Este archivo debe estar en una carpeta con el mismo nombre (el IDE lo pedirá al abrir el .ino; pulsa "Aceptar")
 */
#include <Arduino.h>
#include <SPI.h>
#include "esp_timer.h"   /* esp_timer_get_time() */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>

/* ================= Configurable por el usuario: pines y reloj SPI ================= */
#define PIN_SCLK        10
#define PIN_MOSI         8
#define PIN_CS           9
#define PIN_DC           7
#define PIN_RES          6
#define SPI_CLOCK_HZ     20000000UL   /* 20 MHz; se recomienda 20~30 MHz */

/* ================= Parámetros básicos del ST7305 ================= */
#define ST7305_LCD_WIDTH      300
#define ST7305_LCD_HEIGHT     400
#define ST7305_DATA_WIDTH     75      /* 300/4 = 75 bytes por fila */
#define ST7305_BUFFER_LENGTH  15000   /* 75 * 200 */
#define ST7305_COLOR_WHITE    0x00
#define ST7305_COLOR_BLACK    0x01

#define LOGI(fmt, ...) Serial.printf("[st7305] " fmt "\r\n", ##__VA_ARGS__)

/* Dispositivo driver (instancia única, framebuffer de 15000 bytes incrustado) */
typedef struct {
    int gpio_dc;
    int gpio_res;
    int gpio_cs;
    uint32_t clock_hz;
    uint8_t rotation;                      /* 0=0° 1=90° 2=180° 3=270° (sentido horario) */
    uint8_t buffer[ST7305_BUFFER_LENGTH];
} st7305_dev_t;

typedef st7305_dev_t *st7305_handle_t;

static st7305_dev_t lcd_dev;               /* instancia global única */

static inline void dc_cmd(st7305_handle_t dev)  { digitalWrite(dev->gpio_dc, LOW); }
static inline void dc_data(st7305_handle_t dev) { digitalWrite(dev->gpio_dc, HIGH); }

static void spi_write_byte(st7305_handle_t dev, uint8_t data)
{
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.transfer(data);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/* Escribir registro (comando): DC=LOW */
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);
    spi_write_byte(dev, reg);
}

/* Escribir parámetro (dato): DC=HIGH */
static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);
    spi_write_byte(dev, data);
}

static void write_params(st7305_handle_t dev, uint8_t reg, const uint8_t *params, size_t len)
{
    write_register(dev, reg);
    for (size_t i = 0; i < len; i++) write_parameter(dev, params[i]);
}

/**
 * Secuencia de inicialización del ST7305: coincide con el código de inicialización de alta velocidad de escaneo del fabricante HSD 4.2" 300x400;
 * MADCTL=0x48 (MX=1, DO=1), retardo de sleep-out de 255 ms, ventana de columnas CASET 0x12~0x2B.
 */
static void initial_st7305(st7305_handle_t dev)
{
    /* reset por hardware */
    digitalWrite(dev->gpio_res, HIGH); delay(10);
    digitalWrite(dev->gpio_res, LOW);  delay(10);
    digitalWrite(dev->gpio_res, HIGH); delay(10);

#define WR(reg, ...) do { \
        const uint8_t p[] = {__VA_ARGS__}; \
        write_params(dev, reg, p, sizeof(p)); \
    } while (0)

    WR(0xD6, 0x17, 0x02);   /* NVM Load Control */
    WR(0xD1, 0x01);         /* Booster Enable */
    WR(0xC0, 0x11, 0x04);   /* Gate Voltage: VGH=16.5V, VGL=-7V */
    WR(0xC1, 0x41, 0x41, 0x41, 0x41);  /* VSHP 5.0V x4 */
    WR(0xC2, 0x19, 0x19, 0x19, 0x19);  /* VSLP 0.5V x4 */
    WR(0xC4, 0x41, 0x41, 0x41, 0x41);  /* VSHN -3.8V x4 */
    WR(0xC5, 0x19, 0x19, 0x19, 0x19);  /* VSLN 0.5V x4 */
    WR(0xD8, 0xA6, 0xE9);   /* OSC: HPM~51Hz / LPM~1Hz */
    WR(0xB2, 0x05);         /* Frame Rate: HPM=16Hz, LPM=8Hz */
    WR(0xB3, 0xE5, 0xF6, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45); /* Gate EQ HPM */
    WR(0xB4, 0x05, 0x46, 0x77, 0x77, 0x77, 0x77, 0x76, 0x45);             /* Gate EQ LPM */
    WR(0x62, 0x32, 0x03, 0x1F); /* Gate Timing Control */
    WR(0xB7, 0x13);         /* Source EQ Enable */
    WR(0xB0, 0x64);         /* Gate Line: 400 filas (debe configurarse antes del Sleep-out) */

    write_register(dev, 0x11);  /* Sleep out */
    delay(255);

    WR(0xC9, 0x00);         /* Source Voltage Select: grupo 1 */
    WR(0x36, 0x48);         /* MADCTL: MX=1, DO=1 */
    WR(0x3A, 0x11);         /* Data Format: 3-write 24-bit */
    WR(0xB9, 0x20);         /* Modo Mono (legado del fabricante) */
    WR(0xB8, 0x29);         /* Panel: dot_1 inversión + escaneo Frame */

    write_register(dev, 0x21);  /* Inverse ON */

    /* WRITE RAM ventana de direcciones 300*400 */
    WR(0x2A, 0x12, 0x2B);   /* CASET */
    WR(0x2B, 0x00, 0xC7);   /* RASET 0~199 */
    WR(0x35, 0x00);         /* TE ON（V-Blank） */
    WR(0xD0, 0xFF);         /* Auto power down */

    write_register(dev, 0x39);  /* LPM */
    write_register(dev, 0x29);  /* DISPLAY ON */
#undef WR
}

st7305_handle_t st7305_init(int gpio_dc, int gpio_res, int gpio_cs,
                            int gpio_sclk, int gpio_mosi, uint32_t clock_hz)
{
    st7305_handle_t dev = &lcd_dev;
    dev->gpio_dc = gpio_dc;
    dev->gpio_res = gpio_res;
    dev->gpio_cs = gpio_cs;
    dev->clock_hz = clock_hz;
    dev->rotation = 0;

    pinMode(gpio_dc, OUTPUT);
    pinMode(gpio_res, OUTPUT);
    pinMode(gpio_cs, OUTPUT);
    digitalWrite(gpio_cs, HIGH);
    digitalWrite(gpio_res, HIGH);

    /* Solo MOSI, sin MISO; CS se controla manualmente por software */
    SPI.begin(gpio_sclk, -1, gpio_mosi, -1);

    initial_st7305(dev);
    memset(dev->buffer, 0, ST7305_BUFFER_LENGTH);
    LOGI("ST7305 init OK (%dx%d)", ST7305_LCD_WIDTH, ST7305_LCD_HEIGHT);
    return dev;
}

/** Rellenar framebuffer (0x00 = todo blanco / 0xFF = todo negro) */
void st7305_fill(st7305_handle_t dev, uint8_t data)
{
    memset(dev->buffer, data, ST7305_BUFFER_LENGTH);
}

/** Limpiar framebuffer (todo blanco) */
void st7305_clear(st7305_handle_t dev)
{
    st7305_fill(dev, 0x00);
}
/**
 * Establecer orientación de pantalla: 0=0°, 1=90° horario, 2=180°, 3=270° horario.
 * La rotación se implementa mediante el mapeo de coordenadas del framebuffer; a 90°/270° la resolución lógica es 400x300.
 * Solo afecta al dibujo posterior; no borra el framebuffer ni actualiza la pantalla inmediatamente.
 */
void st7305_set_rotation(st7305_handle_t dev, uint8_t rotation)
{
    if (rotation <= 3) dev->rotation = rotation;
}

/** Obtener orientación actual (0~3) */
uint8_t st7305_get_rotation(st7305_handle_t dev)
{
    return dev->rotation;
}

/** Obtener ancho/alto lógico de la orientación actual */
int st7305_get_width(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
}

int st7305_get_height(st7305_handle_t dev)
{
    return (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
}

/**
 * Los píxeles lógicos se mapean primero a coordenadas físicas 300x400 según la orientación, y luego se escriben en el framebuffer:
 *   Un byte (8 bits) corresponde a 2 filas × 4 columnas de píxeles:
 *     fila0: BIT7 BIT5 BIT3 BIT1   (bits pares -> siguiente fila)
 *     fila1: BIT6 BIT4 BIT2 BIT0
 *   1 = negro, 0 = blanco
 */
void st7305_write_point(st7305_handle_t dev, int x, int y, uint16_t color)
{
    int logical_width = (dev->rotation & 1) ? ST7305_LCD_HEIGHT : ST7305_LCD_WIDTH;
    int logical_height = (dev->rotation & 1) ? ST7305_LCD_WIDTH : ST7305_LCD_HEIGHT;
    if (x < 0 || y < 0 || x >= logical_width || y >= logical_height) return;

    int physical_x;
    int physical_y;
    switch (dev->rotation) {
    case 1: /* 90° horario, lógico 400x300 */
        physical_x = ST7305_LCD_WIDTH - 1 - y;
        physical_y = x;
        break;
    case 2: /* 180°, lógico 300x400 */
        physical_x = ST7305_LCD_WIDTH - 1 - x;
        physical_y = ST7305_LCD_HEIGHT - 1 - y;
        break;
    case 3: /* 270° horario, lógico 400x300 */
        physical_x = y;
        physical_y = ST7305_LCD_HEIGHT - 1 - x;
        break;
    default: /* 0°, lógico 300x400 */
        physical_x = x;
        physical_y = y;
        break;
    }

    int real_x = physical_x / 4;
    int real_y = physical_y / 2;
    int index = real_y * ST7305_DATA_WIDTH + real_x;
    int one_two = physical_y % 2;          /* 0 o 1 */
    int line_bit_4 = physical_x % 4;       /* 0~3 */
    int bit = 7 - (line_bit_4 * 2 + one_two);

    if (color) dev->buffer[index] |= (1 << bit);
    else dev->buffer[index] &= ~(1 << bit);
}

/** Establecer ventana de direcciones y emitir RAMWR */
static void set_address_window(st7305_handle_t dev)
{
    write_params(dev, 0x2A, (uint8_t[]){0x12, 0x2A}, 2); /* CASET 0x12~0x2A */
    write_params(dev, 0x2B, (uint8_t[]){0x00, 0xC7}, 2); /* RASET 0~199 */
    write_register(dev, 0x2C); /* RAMWR */
}

/** Actualización de trama completa: enviar el framebuffer de 15000 bytes a la pantalla */
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);
    dc_data(dev);
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH);
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}

/** Entrar en modo de bajo consumo LPM (0x39); ahorro de energía, la tasa de tramas la fija B2h */
void st7305_low_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x39);
}

/** Entrar en modo de alto consumo HPM (0x38); para contenido en movimiento, 16/32Hz */
void st7305_high_power_mode(st7305_handle_t dev)
{
    write_register(dev, 0x38);
}

/** Pantalla on/off (0x29 / 0x28) */
void st7305_display_on(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x29 : 0x28);
}

/** Inversión on/off (0x21 / 0x20); un panel normalmente blanco necesita inversión para mostrar negro */
void st7305_display_inversion(st7305_handle_t dev, bool enabled)
{
    write_register(dev, enabled ? 0x21 : 0x20);
}

/** Obtener puntero al framebuffer (uso avanzado: manipular datos de bitmap directamente) */
uint8_t *st7305_get_buffer(st7305_handle_t dev)
{
    return dev->buffer;
}

/* ================= Primitivas gráficas (portadas de ST73XX_UI) ================= */

#define SWAP_INT(a, b) do { int _t = (a); (a) = (b); (b) = _t; } while (0)

void ui_draw_fast_hline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x + i, y, color);
}

void ui_draw_fast_vline(st7305_handle_t dev, int x, int y, int len, uint16_t color)
{
    for (int i = 0; i < len; i++) st7305_write_point(dev, x, y + i, color);
}

void ui_draw_line(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    int dx = abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    int dy = -abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    int err = dx + dy, e2;

    while (1) {
        st7305_write_point(dev, x1, y1, color);
        if (x1 == x2 && y1 == y2) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
    }
}

void ui_draw_triangle(st7305_handle_t dev, int x1, int y1, int x2, int y2,
                      int x3, int y3, uint16_t color)
{
    ui_draw_line(dev, x1, y1, x2, y2, color);
    ui_draw_line(dev, x2, y2, x3, y3, color);
    ui_draw_line(dev, x3, y3, x1, y1, color);
}

void ui_draw_filled_triangle(st7305_handle_t dev, int x0, int y0, int x1, int y1,
                             int x2, int y2, uint16_t color)
{
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }
    if (y1 > y2) { SWAP_INT(y1, y2); SWAP_INT(x1, x2); }
    if (y0 > y1) { SWAP_INT(y0, y1); SWAP_INT(x0, x1); }

    if (y0 == y2) { /* fondo plano */
        int xs = x0, xe = x0;
        if (x1 < xs) xs = x1;
        if (x1 > xe) xe = x1;
        if (x2 < xs) xs = x2;
        if (x2 > xe) xe = x2;
        ui_draw_fast_hline(dev, xs, y0, xe - xs + 1, color);
        return;
    }

    int total = y2 - y0;
    for (int i = 0; i <= total; i++) {
        int y = y0 + i;
        int second_half = (i > y1 - y0) || (y1 == y0);
        int seg = second_half ? (y2 - y1) : (y1 - y0);
        if (seg == 0) continue;
        int ax = x0 + (int)((x2 - x0) * (int64_t)i / total);
        int bx = second_half ? x1 + (int)((x2 - x1) * (int64_t)(i - (y1 - y0)) / seg)
                             : x0 + (int)((x1 - x0) * (int64_t)i / seg);
        if (ax > bx) SWAP_INT(ax, bx);
        ui_draw_fast_hline(dev, ax, y, bx - ax + 1, color);
    }
}

void ui_draw_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    ui_draw_fast_hline(dev, x1, y1, x2 - x1 + 1, color);
    ui_draw_fast_hline(dev, x1, y2, x2 - x1 + 1, color);
    ui_draw_fast_vline(dev, x1, y1, y2 - y1 + 1, color);
    ui_draw_fast_vline(dev, x2, y1, y2 - y1 + 1, color);
}

void ui_draw_filled_rectangle(st7305_handle_t dev, int x1, int y1, int x2, int y2, uint16_t color)
{
    if (x1 > x2) SWAP_INT(x1, x2);
    if (y1 > y2) SWAP_INT(y1, y2);
    for (int y = y1; y <= y2; y++) {
        ui_draw_fast_hline(dev, x1, y, x2 - x1 + 1, color);
    }
}

void ui_draw_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    int x = 0, y = r, d = 3 - 2 * r;
    while (x <= y) {
        st7305_write_point(dev, xc + x, yc + y, color);
        st7305_write_point(dev, xc - x, yc + y, color);
        st7305_write_point(dev, xc + x, yc - y, color);
        st7305_write_point(dev, xc - x, yc - y, color);
        st7305_write_point(dev, xc + y, yc + x, color);
        st7305_write_point(dev, xc - y, yc + x, color);
        st7305_write_point(dev, xc + y, yc - x, color);
        st7305_write_point(dev, xc - y, yc - x, color);
        if (d < 0) {
            d += 4 * x + 6;
        } else {
            d += 4 * (x - y) + 10;
            y--;
        }
        x++;
    }
}
static int int_sqrt(int x)
{
    int r = 0;
    while ((r + 1) * (r + 1) <= x) r++;
    return r;
}

void ui_draw_filled_circle(st7305_handle_t dev, int xc, int yc, int r, uint16_t color)
{
    for (int y = -r; y <= r; y++) {
        int w = int_sqrt(r * r - y * y);
        ui_draw_fast_hline(dev, xc - w, yc + y, 2 * w + 1, color);
    }
}

void ui_draw_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;
    for (int i = 0; i < n; i++) {
        int x1 = points[2 * i], y1 = points[2 * i + 1];
        int x2 = points[2 * ((i + 1) % n)], y2 = points[2 * ((i + 1) % n) + 1];
        ui_draw_line(dev, x1, y1, x2, y2, color);
    }
}

void ui_draw_filled_polygon(st7305_handle_t dev, const int *points, int n, uint16_t color)
{
    if (n < 3) return;

    int min_y = points[1], max_y = points[1];
    for (int i = 1; i < n; i++) {
        if (points[2 * i + 1] < min_y) min_y = points[2 * i + 1];
        if (points[2 * i + 1] > max_y) max_y = points[2 * i + 1];
    }

    int *xs = (int *)malloc(n * sizeof(int));
    if (!xs) return;

    /* relleno por línea de escaneo */
    for (int y = min_y; y <= max_y; y++) {
        int cnt = 0;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            int yi = points[2 * i + 1], yj = points[2 * j + 1];
            int xi = points[2 * i], xj = points[2 * j];
            if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
                xs[cnt++] = xi + (int)((int64_t)(y - yi) * (xj - xi) / (yj - yi));
            }
        }
        /* ordenación por inserción */
        for (int i = 1; i < cnt; i++) {
            int key = xs[i], k = i - 1;
            while (k >= 0 && xs[k] > key) { xs[k + 1] = xs[k]; k--; }
            xs[k + 1] = key;
        }
        for (int i = 0; i + 1 < cnt; i += 2) {
            ui_draw_fast_hline(dev, xs[i], y, xs[i + 1] - xs[i] + 1, color);
        }
    }
    free(xs);
}

/* ================= Demo: carrusel automático de 15 páginas =================
 * Texto, escala de grises por tramado ordenado, patrones de prueba, benchmark de rendimiento, muestras de UI y pequeñas animaciones.
 * Sin fuentes ni recursos externos. */

#define W ST7305_LCD_WIDTH
#define H ST7305_LCD_HEIGHT
#define BLACK ST7305_COLOR_BLACK
#define WHITE ST7305_COLOR_WHITE
#define ARRAY_LEN(a) ((int)(sizeof(a) / sizeof((a)[0])))

/* Fuente clásica 5x7 ASCII, codificación por columnas, LSB arriba. */
static const uint8_t font5x7[96][5] = {
    {0x00,0x00,0x00,0x00,0x00},{0x00,0x00,0x5f,0x00,0x00},
    {0x00,0x07,0x00,0x07,0x00},{0x14,0x7f,0x14,0x7f,0x14},
    {0x24,0x2a,0x7f,0x2a,0x12},{0x23,0x13,0x08,0x64,0x62},
    {0x36,0x49,0x55,0x22,0x50},{0x00,0x05,0x03,0x00,0x00},
    {0x00,0x1c,0x22,0x41,0x00},{0x00,0x41,0x22,0x1c,0x00},
    {0x14,0x08,0x3e,0x08,0x14},{0x08,0x08,0x3e,0x08,0x08},
    {0x00,0x50,0x30,0x00,0x00},{0x08,0x08,0x08,0x08,0x08},
    {0x00,0x60,0x60,0x00,0x00},{0x20,0x10,0x08,0x04,0x02},
    {0x3e,0x51,0x49,0x45,0x3e},{0x00,0x42,0x7f,0x40,0x00},
    {0x42,0x61,0x51,0x49,0x46},{0x21,0x41,0x45,0x4b,0x31},
    {0x18,0x14,0x12,0x7f,0x10},{0x27,0x45,0x45,0x45,0x39},
    {0x3c,0x4a,0x49,0x49,0x30},{0x01,0x71,0x09,0x05,0x03},
    {0x36,0x49,0x49,0x49,0x36},{0x06,0x49,0x49,0x29,0x1e},
    {0x00,0x36,0x36,0x00,0x00},{0x00,0x56,0x36,0x00,0x00},
    {0x08,0x14,0x22,0x41,0x00},{0x14,0x14,0x14,0x14,0x14},
    {0x00,0x41,0x22,0x14,0x08},{0x02,0x01,0x51,0x09,0x06},
    {0x32,0x49,0x79,0x41,0x3e},{0x7e,0x11,0x11,0x11,0x7e},
    {0x7f,0x49,0x49,0x49,0x36},{0x3e,0x41,0x41,0x41,0x22},
    {0x7f,0x41,0x41,0x22,0x1c},{0x7f,0x49,0x49,0x49,0x41},
    {0x7f,0x09,0x09,0x09,0x01},{0x3e,0x41,0x49,0x49,0x7a},
    {0x7f,0x08,0x08,0x08,0x7f},{0x00,0x41,0x7f,0x41,0x00},
    {0x20,0x40,0x41,0x3f,0x01},{0x7f,0x08,0x14,0x22,0x41},
    {0x7f,0x40,0x40,0x40,0x40},{0x7f,0x02,0x0c,0x02,0x7f},
    {0x7f,0x04,0x08,0x10,0x7f},{0x3e,0x41,0x41,0x41,0x3e},
    {0x7f,0x09,0x09,0x09,0x06},{0x3e,0x41,0x51,0x21,0x5e},
    {0x7f,0x09,0x19,0x29,0x46},{0x46,0x49,0x49,0x49,0x31},
    {0x01,0x01,0x7f,0x01,0x01},{0x3f,0x40,0x40,0x40,0x3f},
    {0x1f,0x20,0x40,0x20,0x1f},{0x3f,0x40,0x38,0x40,0x3f},
    {0x63,0x14,0x08,0x14,0x63},{0x07,0x08,0x70,0x08,0x07},
    {0x61,0x51,0x49,0x45,0x43},{0x00,0x7f,0x41,0x41,0x00},
    {0x02,0x04,0x08,0x10,0x20},{0x00,0x41,0x41,0x7f,0x00},
    {0x04,0x02,0x01,0x02,0x04},{0x40,0x40,0x40,0x40,0x40},
    {0x00,0x01,0x02,0x04,0x00},{0x20,0x54,0x54,0x54,0x78},
    {0x7f,0x48,0x44,0x44,0x38},{0x38,0x44,0x44,0x44,0x20},
    {0x38,0x44,0x44,0x48,0x7f},{0x38,0x54,0x54,0x54,0x18},
    {0x08,0x7e,0x09,0x01,0x02},{0x0c,0x52,0x52,0x52,0x3e},
    {0x7f,0x08,0x04,0x04,0x78},{0x00,0x44,0x7d,0x40,0x00},
    {0x20,0x40,0x44,0x3d,0x00},{0x7f,0x10,0x28,0x44,0x00},
    {0x00,0x41,0x7f,0x40,0x00},{0x7c,0x04,0x18,0x04,0x78},
    {0x7c,0x08,0x04,0x04,0x78},{0x38,0x44,0x44,0x44,0x38},
    {0x7c,0x14,0x14,0x14,0x08},{0x08,0x14,0x14,0x18,0x7c},
    {0x7c,0x08,0x04,0x04,0x08},{0x48,0x54,0x54,0x54,0x20},
    {0x04,0x3f,0x44,0x40,0x20},{0x3c,0x40,0x40,0x20,0x7c},
    {0x1c,0x20,0x40,0x20,0x1c},{0x3c,0x40,0x30,0x40,0x3c},
    {0x44,0x28,0x10,0x28,0x44},{0x0c,0x50,0x50,0x50,0x3c},
    {0x44,0x64,0x54,0x4c,0x44},{0x00,0x08,0x36,0x41,0x00},
    {0x00,0x00,0x7f,0x00,0x00},{0x00,0x41,0x36,0x08,0x00},
    {0x08,0x04,0x08,0x10,0x08},{0x00,0x00,0x00,0x00,0x00}
};

static const uint8_t bayer4[4][4] = {
    {0, 8, 2, 10}, {12, 4, 14, 6}, {3, 11, 1, 9}, {15, 7, 13, 5}
};

static void text_char(st7305_handle_t d, int x, int y, char c, int scale, uint16_t color)
{
    if ((unsigned char)c < 32 || (unsigned char)c > 127) c = '?';
    const uint8_t *glyph = font5x7[(unsigned char)c - 32];
    for (int col = 0; col < 5; col++) {
        for (int row = 0; row < 7; row++) {
            if (glyph[col] & (1U << row)) {
                if (scale == 1) st7305_write_point(d, x + col, y + row, color);
                else ui_draw_filled_rectangle(d, x + col * scale, y + row * scale,
                    x + (col + 1) * scale - 1, y + (row + 1) * scale - 1, color);
            }
        }
    }
}

static void text(st7305_handle_t d, int x, int y, const char *s, int scale, uint16_t color)
{
    while (*s) {
        text_char(d, x, y, *s++, scale, color);
        x += 6 * scale;
    }
}

static int text_width(const char *s, int scale)
{
    int n = (int)strlen(s);
    return n ? (n * 6 - 1) * scale : 0;
}
static void text_center(st7305_handle_t d, int y, const char *s, int scale, uint16_t color)
{
    text(d, (W - text_width(s, scale)) / 2, y, s, scale, color);
}

static void gray_rect(st7305_handle_t d, int x0, int y0, int x1, int y1, int level)
{
    if (x0 > x1) { int t = x0; x0 = x1; x1 = t; }
    if (y0 > y1) { int t = y0; y0 = y1; y1 = t; }
    if (level <= 0) return;
    if (level >= 16) {
        ui_draw_filled_rectangle(d, x0, y0, x1, y1, BLACK);
        return;
    }
    for (int y = y0; y <= y1; y++) {
        for (int x = x0; x <= x1; x++) {
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, x, y, BLACK);
        }
    }
}

static void gray_circle(st7305_handle_t d, int cx, int cy, int r, int level)
{
    for (int y = -r; y <= r; y++) {
        for (int x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r && level > bayer4[(cy + y) & 3][(cx + x) & 3]) {
                st7305_write_point(d, cx + x, cy + y, BLACK);
            }
        }
    }
}

static void hline(st7305_handle_t d, int x0, int x1, int y, uint16_t color)
{
    ui_draw_fast_hline(d, x0, y, x1 - x0 + 1, color);
}

static void vline(st7305_handle_t d, int x, int y0, int y1, uint16_t color)
{
    ui_draw_fast_vline(d, x, y0, y1 - y0 + 1, color);
}

static void chrome(st7305_handle_t d, int page, const char *title, const char *subtitle)
{
    char buf[24];
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 31, BLACK);
    text(d, 8, 8, title, 2, WHITE);
    snprintf(buf, sizeof(buf), "%02d/15", page + 1);
    text(d, 251, 11, buf, 1, WHITE);
    text(d, 8, 39, subtitle, 1, BLACK);
    hline(d, 0, W - 1, 51, BLACK);
    hline(d, 8, W - 9, 376, BLACK);
    text(d, 8, 384, "ST7305 RLCD TEST SUITE", 1, BLACK);
    for (int i = 0; i < 15; i++) {
        int x = 210 + i * 6;
        if (i == page) ui_draw_filled_rectangle(d, x, 385, x + 3, 391, BLACK);
        else ui_draw_rectangle(d, x, 385, x + 3, 391, BLACK);
    }
}

static uint32_t rng_state = 0x7305u;
static uint32_t demo_rand(void)
{
    rng_state ^= rng_state << 13;
    rng_state ^= rng_state >> 17;
    rng_state ^= rng_state << 5;
    return rng_state;
}

static int wave(int tick, int period)
{
    int p = tick % (period * 2);
    return p < period ? p : period * 2 - p;
}

static void page_hello(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 2);
    ui_draw_filled_rectangle(d, 12, 12, 287, 387, WHITE);
    ui_draw_rectangle(d, 12, 12, 287, 387, BLACK);
    ui_draw_rectangle(d, 16, 16, 283, 383, BLACK);
    text_center(d, 54, "ST7305  /  RLCD", 2, BLACK);
    hline(d, 42, 258, 82, BLACK);
    text_center(d, 112, "HELLO", 7, BLACK);
    text_center(d, 174, "WORLD!", 7, BLACK);
    text_center(d, 247, "300 x 400  MONOCHROME", 2, BLACK);
    text_center(d, 278, "15 PAGES / AUTO CAROUSEL", 1, BLACK);
    gray_circle(d, 150, 330, 28, 5);
    ui_draw_circle(d, 150, 330, 29, BLACK);
    ui_draw_filled_circle(d, 140, 321, 3, BLACK);
    ui_draw_filled_circle(d, 160, 321, 3, BLACK);
    ui_draw_line(d, 136, 338, 142, 343, BLACK);
    ui_draw_line(d, 142, 343, 158, 343, BLACK);
    ui_draw_line(d, 158, 343, 164, 338, BLACK);
}

static void page_gray(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 1, "DITHER GRAY", "17 LEVELS / STATIC 4x4 BAYER MATRIX");
    for (int i = 0; i < 17; i++) {
        int x = 14 + i * 16;
        gray_rect(d, x, 72, x + 14, 128, i);
        ui_draw_rectangle(d, x, 72, x + 14, 128, BLACK);
    }
    text(d, 14, 136, "0%", 1, BLACK);
    text(d, 139, 136, "50", 1, BLACK);
    text(d, 259, 136, "100%", 1, BLACK);
    text(d, 14, 159, "GRADIENT", 1, BLACK);
    for (int y = 0; y < 36; y++) {
        for (int x = 0; x < 272; x++) {
            int level = x / 17;
            if (level > bayer4[y & 3][x & 3]) st7305_write_point(d, 14 + x, 176 + y, BLACK);
        }
    }
    ui_draw_rectangle(d, 13, 175, 286, 212, BLACK);
    text(d, 14, 230, "DITHERED FILLS FOR UI DEPTH", 1, BLACK);
    gray_circle(d, 58, 294, 39, 3);
    gray_circle(d, 150, 294, 39, 7);
    gray_circle(d, 242, 294, 39, 12);
    ui_draw_circle(d, 58, 294, 40, BLACK);
    ui_draw_circle(d, 150, 294, 40, BLACK);
    ui_draw_circle(d, 242, 294, 40, BLACK);
    text_center(d, 347, "NO GRAY PIXELS - JUST BLACK + WHITE", 1, BLACK);
}

static void page_geometry(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 2, "GEOMETRY", "LINES / CIRCLES / TRIANGLES / POLYGONS");
    ui_draw_line(d, 12, 65, 285, 350, BLACK);
    ui_draw_line(d, 285, 65, 12, 350, BLACK);
    ui_draw_rectangle(d, 20, 75, 126, 164, BLACK);
    gray_rect(d, 23, 78, 123, 161, 4);
    ui_draw_filled_rectangle(d, 43, 97, 104, 139, BLACK);
    ui_draw_circle(d, 213, 122, 48, BLACK);
    ui_draw_circle(d, 213, 122, 38, BLACK);
    gray_circle(d, 213, 122, 27, 8);
    ui_draw_triangle(d, 24, 323, 87, 188, 143, 323, BLACK);
    ui_draw_filled_triangle(d, 176, 310, 219, 212, 271, 310, BLACK);
    const int p[] = {152,77, 168,95, 162,117, 143,117, 136,95};
    ui_draw_filled_polygon(d, p, 5, BLACK);
    text_center(d, 348, "BRESENHAM + SCANLINE FILL", 1, BLACK);
}

static void page_grid(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 3, "PIXEL GRID", "CHECK EDGES, ASPECT RATIO AND DIAGONALS");
    ui_draw_rectangle(d, 0, 58, 299, 367, BLACK);
    for (int x = 19; x < W; x += 20) gray_rect(d, x, 59, x, 366, 4);
    for (int y = 78; y < 367; y += 20) gray_rect(d, 1, y, 298, y, 4);
    ui_draw_line(d, 0, 58, 299, 367, BLACK);
    ui_draw_line(d, 299, 58, 0, 367, BLACK);
    ui_draw_circle(d, 150, 213, 100, BLACK);
    ui_draw_rectangle(d, 50, 113, 250, 313, BLACK);
    ui_draw_filled_rectangle(d, 0, 58, 5, 63, BLACK);
    ui_draw_filled_rectangle(d, 294, 58, 299, 63, BLACK);
    ui_draw_filled_rectangle(d, 0, 362, 5, 367, BLACK);
    ui_draw_filled_rectangle(d, 294, 362, 299, 367, BLACK);
    ui_draw_filled_rectangle(d, 145, 208, 155, 218, WHITE);
    ui_draw_rectangle(d, 145, 208, 155, 218, BLACK);
}

static void page_text(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    chrome(d, 4, "TEXT & FONT", "BUILT-IN 5x7 ASCII / INTEGER SCALING");
    text_center(d, 69, "BIG TEXT 2X", 2, BLACK);
    text_center(d, 96, "HUGE 4X", 4, BLACK);
    hline(d, 18, 281, 135, BLACK);
    text(d, 14, 148, "Regular: ABCDEFGHIJKLM", 1, BLACK);
    text(d, 14, 162, "         NOPQRSTUVWXYZ", 1, BLACK);
    text(d, 14, 179, "Lower:  abcdefghijklm", 1, BLACK);
    text(d, 14, 193, "        nopqrstuvwxyz", 1, BLACK);
    text(d, 14, 214, "Digits: 0123456789", 2, BLACK);
    text(d, 14, 241, "Symbols: !#$%&*+-/<=>?", 1, BLACK);
    gray_rect(d, 14, 265, 285, 304, 12);
    text_center(d, 273, "DITHERED TEXT PANEL", 2, BLACK);
    ui_draw_filled_rectangle(d, 14, 318, 285, 348, BLACK);
    text_center(d, 327, "REVERSED TEXT", 2, WHITE);
    text_center(d, 359, "NO EXTERNAL FONT REQUIRED", 1, BLACK);
}
static void draw_toggle(st7305_handle_t d, int x, int y, bool on)
{
    ui_draw_rectangle(d, x, y, x + 35, y + 16, BLACK);
    if (on) {
        ui_draw_filled_rectangle(d, x + 2, y + 2, x + 32, y + 14, BLACK);
        ui_draw_filled_circle(d, x + 26, y + 8, 5, WHITE);
    } else {
        ui_draw_filled_circle(d, x + 9, y + 8, 5, BLACK);
    }
}

static void page_ui(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 5, "DESKTOP UI", "DITHERED CARDS / GAUGES / LIVE WIDGETS");
    gray_rect(d, 17, 67, 188, 191, 5);
    ui_draw_filled_rectangle(d, 13, 63, 184, 187, WHITE);
    ui_draw_rectangle(d, 13, 63, 184, 187, BLACK);
    text(d, 23, 74, "ENVIRONMENT", 2, BLACK);
    hline(d, 23, 174, 96, BLACK);
    text(d, 23, 109, "23.6", 4, BLACK);
    text(d, 107, 109, "C", 2, BLACK);
    text(d, 23, 145, "HUMIDITY  48%", 1, BLACK);
    text(d, 23, 161, "PRESSURE  1013", 1, BLACK);

    gray_rect(d, 200, 67, 290, 191, 7);
    ui_draw_filled_rectangle(d, 196, 63, 286, 187, WHITE);
    ui_draw_rectangle(d, 196, 63, 286, 187, BLACK);
    text(d, 207, 74, "POWER", 1, BLACK);
    int battery = 20 + wave(frame, 40) * 70 / 40;
    ui_draw_rectangle(d, 210, 99, 267, 121, BLACK);
    ui_draw_filled_rectangle(d, 267, 104, 271, 116, BLACK);
    ui_draw_filled_rectangle(d, 213, 102, 213 + battery * 50 / 100, 118, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%d%%", battery);
    text(d, 241 - text_width(buf, 2) / 2, 134, buf, 2, BLACK);
    text(d, 207, 160, "SOLAR  ON", 1, BLACK);

    ui_draw_filled_rectangle(d, 13, 204, 286, 294, WHITE);
    ui_draw_rectangle(d, 13, 204, 286, 294, BLACK);
    text(d, 24, 216, "SYSTEM ACTIVITY", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        int value = 12 + wave(frame + i * 17, 50) * 180 / 50;
        text(d, 24, 240 + i * 16, i == 0 ? "CPU" : (i == 1 ? "MEM" : "SPI"), 1, BLACK);
        gray_rect(d, 62, 240 + i * 16, 256, 248 + i * 16, 3);
        ui_draw_filled_rectangle(d, 62, 240 + i * 16, 62 + value, 248 + i * 16, BLACK);
    }
    text(d, 22, 316, "WIFI", 1, BLACK);
    draw_toggle(d, 63, 311, true);
    text(d, 118, 316, "SYNC", 1, BLACK);
    draw_toggle(d, 160, 311, (frame / 12) & 1);
    text(d, 215, 316, "LIVE", 1, BLACK);
    if ((frame / 4) & 1) ui_draw_filled_circle(d, 276, 319, 5, BLACK);
    else ui_draw_circle(d, 276, 319, 5, BLACK);
    text_center(d, 351, "A TINY REFLECTIVE DASHBOARD", 1, BLACK);
}

typedef struct {
    uint32_t last_us;
    uint32_t average_us;
    uint16_t history[54];
    int history_pos;
} perf_t;
static perf_t perf;

static void perf_record(uint32_t elapsed_us)
{
    perf.last_us = elapsed_us;
    perf.average_us = perf.average_us ? (perf.average_us * 7 + elapsed_us) / 8 : elapsed_us;
    perf.history[perf.history_pos] = (uint16_t)(elapsed_us / 100);
    perf.history_pos = (perf.history_pos + 1) % ARRAY_LEN(perf.history);
}

static void page_fps(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 6, "FRAME RATE", "UNTHROTTLED FULL-FRAME DRAW + SPI BENCHMARK");
    char buf[40];
    uint32_t avg = perf.average_us ? perf.average_us : 1;
    uint32_t fps10 = 10000000UL / avg;
    snprintf(buf, sizeof(buf), "%lu.%lu FPS", (unsigned long)(fps10 / 10), (unsigned long)(fps10 % 10));
    text_center(d, 66, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "LAST %lu.%lu ms   AVG %lu.%lu ms",
        (unsigned long)(perf.last_us / 1000), (unsigned long)((perf.last_us % 1000) / 100),
        (unsigned long)(avg / 1000), (unsigned long)((avg % 1000) / 100));
    text_center(d, 108, buf, 1, BLACK);
    text(d, 16, 132, "UPDATE TIME HISTORY", 1, BLACK);
    ui_draw_rectangle(d, 15, 148, 285, 254, BLACK);
    gray_rect(d, 16, 174, 284, 174, 3);
    gray_rect(d, 16, 201, 284, 201, 3);
    gray_rect(d, 16, 227, 284, 227, 3);
    int previous_x = -1, previous_y = -1;
    for (int i = 0; i < ARRAY_LEN(perf.history); i++) {
        int index = (perf.history_pos + i) % ARRAY_LEN(perf.history);
        int value = perf.history[index];
        int y = 250 - value * 95 / 150;
        if (y < 151) y = 151;
        if (y > 250) y = 250;
        int x = 20 + i * 5;
        ui_draw_filled_circle(d, x, y, 1, BLACK);
        if (previous_x >= 0) ui_draw_line(d, previous_x, previous_y, x, y, BLACK);
        previous_x = x; previous_y = y;
    }
    snprintf(buf, sizeof(buf), "FRAME: %d", frame + 1);
    text(d, 17, 271, buf, 1, BLACK);
    text(d, 17, 291, "15000 BYTES PER UPDATE", 2, BLACK);
    text(d, 17, 317, "SPI: 20 MHz   PANEL: 16 Hz", 1, BLACK);
    text(d, 17, 337, "CPU number is bus throughput,", 1, BLACK);
    text(d, 17, 351, "not the optical panel limit.", 1, BLACK);
    int scan = 20 + (frame * 7) % 260;
    vline(d, scan, 149, 253, BLACK);
    (void)elapsed;
}

static void page_patterns(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 7, "FINE PATTERNS", "1/2/4 PIXEL CHECKERS + LINE RESOLUTION");
    int phase = frame & 1;
    const int boxes[4][4] = {{12,66,146,184},{153,66,287,184},{12,194,146,332},{153,194,287,332}};
    for (int b = 0; b < 4; b++) {
        for (int y = boxes[b][1]; y <= boxes[b][3]; y++) {
            for (int x = boxes[b][0]; x <= boxes[b][2]; x++) {
                bool black = false;
                if (b == 0) black = ((x ^ y) & 1) == phase;
                if (b == 1) black = (((x / 2) ^ (y / 2)) & 1) == phase;
                if (b == 2) black = (((x / 4) ^ (y / 4)) & 1) == phase;
                if (b == 3) black = ((x + phase) % 4 == 0) || ((y + phase) % 4 == 0);
                if (black) st7305_write_point(d, x, y, BLACK);
            }
        }
        ui_draw_rectangle(d, boxes[b][0] - 1, boxes[b][1] - 1, boxes[b][2] + 1, boxes[b][3] + 1, BLACK);
    }
    text_center(d, 343, "CHECKER / 2PX / 4PX / GRID", 1, BLACK);
    text_center(d, 358, phase ? "PHASE B - CHECK FOR FLICKER" : "PHASE A - CHECK FOR FLICKER", 1, BLACK);
}

static struct { int x, y, vx, vy, hits; } bounce;

static void page_bounce(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 8, "BOUNCE TEST", "MOVEMENT, COLLISIONS AND PANEL GHOSTING");
    const int left = 10, right = 289, top = 65, bottom = 355;
    ui_draw_rectangle(d, left, top, right, bottom, BLACK);
    for (int y = top + 10; y < bottom; y += 20) gray_rect(d, left + 1, y, right - 1, y, 2);
    if (frame > 0) {
        bounce.x += bounce.vx;
        bounce.y += bounce.vy;
        if (bounce.x <= left + 2 || bounce.x + 91 >= right - 1) {
            bounce.vx = -bounce.vx;
            bounce.x += bounce.vx * 2;
            bounce.hits++;
        }
        if (bounce.y <= top + 2 || bounce.y + 43 >= bottom - 1) {
            bounce.vy = -bounce.vy;
            bounce.y += bounce.vy * 2;
            bounce.hits++;
        }
    }
    gray_rect(d, bounce.x + 5, bounce.y + 5, bounce.x + 96, bounce.y + 48, 5);
    ui_draw_filled_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, WHITE);
    ui_draw_rectangle(d, bounce.x, bounce.y, bounce.x + 91, bounce.y + 43, BLACK);
    text(d, bounce.x + 9, bounce.y + 10, "RLCD", 3, BLACK);
    char buf[24];
    snprintf(buf, sizeof(buf), "WALL HITS: %d", bounce.hits);
    text_center(d, 360, buf, 1, BLACK);
}

#define STAR_COUNT 56
static struct { int x, y, z; } stars[STAR_COUNT];

static void star_reset(int i, bool initial)
{
    stars[i].x = (int)(demo_rand() % 401) - 200;
    stars[i].y = (int)(demo_rand() % 401) - 200;
    stars[i].z = initial ? 30 + (int)(demo_rand() % 220) : 250;
}
static void page_stars(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    ui_draw_filled_rectangle(d, 0, 0, W - 1, H - 1, BLACK);
    text(d, 10, 12, "STARFIELD", 2, WHITE);
    text(d, 190, 17, "56 STARS / HPM", 1, WHITE);
    hline(d, 10, 289, 38, WHITE);
    for (int i = 0; i < STAR_COUNT; i++) {
        int old_z = stars[i].z;
        stars[i].z -= 7;
        if (stars[i].z < 20) star_reset(i, false);
        int z = stars[i].z;
        int x = 150 + stars[i].x * 110 / z;
        int y = 207 + stars[i].y * 110 / z;
        int ox = 150 + stars[i].x * 110 / old_z;
        int oy = 207 + stars[i].y * 110 / old_z;
        if (x > 2 && x < 297 && y > 44 && y < 370) {
            ui_draw_line(d, ox, oy, x, y, WHITE);
            if (z < 80) ui_draw_filled_circle(d, x, y, 2, WHITE);
            else st7305_write_point(d, x, y, WHITE);
        }
    }
    hline(d, 10, 289, 377, WHITE);
    text(d, 10, 385, "WARP THROUGH A MONOCHROME GALAXY", 1, WHITE);
}

#define LIFE_W 34
#define LIFE_H 34
static uint8_t life[LIFE_H][LIFE_W];
static uint8_t life_next[LIFE_H][LIFE_W];
static int generation;

static void life_seed(void)
{
    memset(life, 0, sizeof(life));
    rng_state = 0x42030040u;
    for (int y = 2; y < LIFE_H - 2; y++) {
        for (int x = 2; x < LIFE_W - 2; x++) life[y][x] = (demo_rand() % 100) < 28;
    }
    generation = 0;
}

static void life_step(void)
{
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            int neighbors = 0;
            for (int dy = -1; dy <= 1; dy++) {
                for (int dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    int yy = (y + dy + LIFE_H) % LIFE_H;
                    int xx = (x + dx + LIFE_W) % LIFE_W;
                    neighbors += life[yy][xx];
                }
            }
            life_next[y][x] = neighbors == 3 || (neighbors == 2 && life[y][x]);
        }
    }
    memcpy(life, life_next, sizeof(life));
    generation++;
}

static void page_life(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 10, "GAME OF LIFE", "CONWAY CELLULAR AUTOMATON / TORUS WORLD");
    if (frame > 0) life_step();
    const int cell = 8, ox = 14, oy = 62;
    gray_rect(d, ox - 3, oy - 3, ox + LIFE_W * cell + 1, oy + LIFE_H * cell + 1, 3);
    ui_draw_rectangle(d, ox - 2, oy - 2, ox + LIFE_W * cell, oy + LIFE_H * cell, BLACK);
    for (int y = 0; y < LIFE_H; y++) {
        for (int x = 0; x < LIFE_W; x++) {
            if (life[y][x]) ui_draw_filled_rectangle(d, ox + x * cell + 1, oy + y * cell + 1,
                ox + x * cell + 6, oy + y * cell + 6, BLACK);
        }
    }
    char buf[32];
    snprintf(buf, sizeof(buf), "GENERATION %d", generation);
    text_center(d, 352, buf, 1, BLACK);
}

static void page_clock(st7305_handle_t d, int frame, int64_t elapsed)
{
    chrome(d, 11, "UPTIME CLOCK", "ESP-TIMER / NO RTC OR NETWORK REQUIRED");
    int total = (int)(elapsed / 1000000);
    int seconds = total % 60, minutes = (total / 60) % 60, hours = total / 3600;
    int cx = 150, cy = 177, radius = 101;
    ui_draw_circle(d, cx, cy, radius, BLACK);
    ui_draw_circle(d, cx, cy, radius - 2, BLACK);
    for (int i = 0; i < 60; i++) {
        /* tabla de marcas en sentido horario; evita flotantes y libm. */
        static const int8_t sx[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
        static const int8_t sy[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
        if (i % 5 == 0) {
            int k = i / 5;
            int x = cx + sx[k] * 88 / 100, y = cy + sy[k] * 88 / 100;
            ui_draw_filled_circle(d, x, y, 3, BLACK);
        }
    }
    static const int8_t sec_x[12] = {0,50,87,100,87,50,0,-50,-87,-100,-87,-50};
    static const int8_t sec_y[12] = {-100,-87,-50,0,50,87,100,87,50,0,-50,-87};
    int sk = (seconds / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[sk] * 76 / 100, cy + sec_y[sk] * 76 / 100, BLACK);
    int mk = (minutes / 5) % 12;
    ui_draw_line(d, cx, cy, cx + sec_x[mk] * 53 / 100, cy + sec_y[mk] * 53 / 100, BLACK);
    ui_draw_filled_circle(d, cx, cy, 5, BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "%02d:%02d:%02d", hours, minutes, seconds);
    text_center(d, 301, buf, 4, BLACK);
    snprintf(buf, sizeof(buf), "RENDER FRAME %d", frame + 1);
    text_center(d, 343, buf, 1, BLACK);
    text_center(d, 359, "1-BIT DOES NOT MEAN BORING", 1, BLACK);
}

static void tiny_mac(st7305_handle_t d, int x, int y)
{
    ui_draw_rectangle(d, x, y, x + 37, y + 47, BLACK);
    ui_draw_filled_rectangle(d, x + 4, y + 4, x + 33, y + 31, BLACK);
    ui_draw_filled_rectangle(d, x + 6, y + 6, x + 31, y + 29, WHITE);
    ui_draw_filled_rectangle(d, x + 11, y + 12, x + 13, y + 15, BLACK);
    ui_draw_filled_rectangle(d, x + 24, y + 12, x + 26, y + 15, BLACK);
    ui_draw_line(d, x + 12, y + 23, x + 16, y + 25, BLACK);
    ui_draw_line(d, x + 16, y + 25, x + 22, y + 25, BLACK);
    ui_draw_line(d, x + 22, y + 25, x + 26, y + 23, BLACK);
    ui_draw_filled_rectangle(d, x + 7, y + 38, x + 23, y + 41, BLACK);
}

static void page_retro(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame; (void)elapsed;
    gray_rect(d, 0, 0, W - 1, H - 1, 3);
    ui_draw_filled_rectangle(d, 0, 0, W - 1, 21, WHITE);
    hline(d, 0, W - 1, 22, BLACK);
    text(d, 9, 7, "*  File  Edit  View  Special", 1, BLACK);
    text(d, 258, 7, "12:00", 1, BLACK);
    text(d, 181, 34, "RLCD OS", 2, BLACK);
    text(d, 184, 55, "System 1.0", 1, BLACK);
    tiny_mac(d, 228, 77);

    gray_rect(d, 17, 39, 212, 278, 8);
    ui_draw_filled_rectangle(d, 12, 34, 207, 273, WHITE);
    ui_draw_rectangle(d, 12, 34, 207, 273, BLACK);
    ui_draw_filled_rectangle(d, 13, 35, 206, 51, BLACK);
    text(d, 54, 39, "CONTROL PANEL", 1, WHITE);
    ui_draw_rectangle(d, 16, 38, 20, 47, WHITE);
    text(d, 24, 65, "Desktop Pattern", 1, BLACK);
    for (int y = 0; y < 36; y++) for (int x = 0; x < 56; x++) {
        if (((x / 4) ^ (y / 4)) & 1) st7305_write_point(d, 25 + x, 82 + y, BLACK);
    }
    gray_rect(d, 94, 82, 177, 117, 6);
    ui_draw_rectangle(d, 24, 81, 81, 118, BLACK);
    ui_draw_rectangle(d, 93, 81, 178, 118, BLACK);
    hline(d, 22, 196, 130, BLACK);
    text(d, 24, 141, "Double-Click Speed", 1, BLACK);
    for (int i = 0; i < 3; i++) {
        ui_draw_rectangle(d, 26 + i * 51, 163, 37 + i * 51, 174, BLACK);
        if (i == 1) ui_draw_filled_rectangle(d, 28 + i * 51, 165, 35 + i * 51, 172, BLACK);
    }
    text(d, 24, 190, "Key Repeat Rate", 1, BLACK);
    gray_rect(d, 25, 211, 187, 218, 4);
    ui_draw_filled_rectangle(d, 25, 211, 110, 218, BLACK);
    ui_draw_rectangle(d, 25, 210, 188, 219, BLACK);
    text(d, 24, 237, "Reflective. Silent. Timeless.", 1, BLACK);

    ui_draw_filled_rectangle(d, 24, 294, 195, 353, WHITE);
    ui_draw_rectangle(d, 24, 294, 195, 353, BLACK);
    ui_draw_filled_rectangle(d, 25, 295, 194, 310, BLACK);
    text(d, 65, 299, "HELLO, WORLD!", 1, WHITE);
    text(d, 36, 322, "1 bit. Infinite ideas.", 1, BLACK);
    text(d, 36, 338, "OK", 1, BLACK);
    ui_draw_rectangle(d, 135, 324, 180, 344, BLACK);

    text(d, 236, 348, "TRASH", 1, BLACK);
    ui_draw_rectangle(d, 244, 305, 265, 337, BLACK);
    hline(d, 240, 269, 302, BLACK);
    vline(d, 250, 309, 333, BLACK);
    vline(d, 258, 309, 333, BLACK);
}
static void page_inverse(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)elapsed;
    chrome(d, 13, "BLACK & WHITE", "POLARITY / CONTRAST / FULL-SCREEN INVERSION");
    bool invert = (frame / 2) & 1;
    if (!invert) {
        ui_draw_filled_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "BLACK", 6, WHITE);
        text_center(d, 155, "ON", 4, WHITE);
        text_center(d, 205, "WHITE", 6, WHITE);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, WHITE);
        text_center(d, 289, "REVERSED", 3, BLACK);
    } else {
        ui_draw_rectangle(d, 12, 66, 287, 346, BLACK);
        text_center(d, 92, "WHITE", 6, BLACK);
        text_center(d, 155, "ON", 4, BLACK);
        text_center(d, 205, "BLACK", 6, BLACK);
        ui_draw_filled_rectangle(d, 42, 276, 257, 324, BLACK);
        text_center(d, 289, "REVERSED", 3, WHITE);
    }
    text_center(d, 357, invert ? "PHASE B" : "PHASE A", 1, BLACK);
}

static void page_rotation(st7305_handle_t d, int frame, int64_t elapsed)
{
    (void)frame;
    static const int angles[4] = {0, 90, 180, 270};
    uint8_t rotation = (uint8_t)((elapsed / 3000000) & 3);
    st7305_set_rotation(d, rotation);

    int width = st7305_get_width(d);
    int height = st7305_get_height(d);
    int cx = width / 2;
    int cy = height / 2 - 5;
    char buf[40];

    ui_draw_rectangle(d, 0, 0, width - 1, height - 1, BLACK);
    ui_draw_filled_rectangle(d, 0, 0, width - 1, 39, BLACK);
    snprintf(buf, sizeof(buf), "ROTATION %d DEG", angles[rotation]);
    text(d, (width - text_width(buf, 2)) / 2, 11, buf, 2, WHITE);
    snprintf(buf, sizeof(buf), "LOGICAL %d x %d / FRAMEBUFFER MAPPING", width, height);
    text(d, (width - text_width(buf, 1)) / 2, 50, buf, 1, BLACK);

    /* flecha asimétrica + marcas en las cuatro esquinas hacen cada orientación inequívoca. */
    ui_draw_circle(d, cx, cy, 43, BLACK);
    ui_draw_line(d, cx, cy + 25, cx, cy - 28, BLACK);
    ui_draw_line(d, cx, cy - 28, cx - 13, cy - 14, BLACK);
    ui_draw_line(d, cx, cy - 28, cx + 13, cy - 14, BLACK);
    text(d, cx - text_width("UP", 2) / 2, cy - 10, "UP", 2, BLACK);
    snprintf(buf, sizeof(buf), "%d", angles[rotation]);
    text(d, cx - text_width(buf, 6) / 2, cy + 57, buf, 6, BLACK);

    text(d, 12, 70, "A / TOP LEFT", 1, BLACK);
    text(d, width - 12 - text_width("B / TOP RIGHT", 1), 70, "B / TOP RIGHT", 1, BLACK);
    text(d, 12, height - 39, "C / BOTTOM LEFT", 1, BLACK);
    text(d, width - 12 - text_width("D / BOTTOM RIGHT", 1), height - 39,
        "D / BOTTOM RIGHT", 1, BLACK);
    ui_draw_filled_rectangle(d, 3, 3, 9, 9, WHITE);
    ui_draw_filled_rectangle(d, width - 10, height - 10, width - 4, height - 4, BLACK);
    hline(d, 12, width - 13, height - 25, BLACK);
    text(d, (width - text_width("AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1)) / 2,
        height - 15, "AUTO 0 > 90 > 180 > 270 / 3 SEC EACH", 1, BLACK);
}

typedef void (*page_draw_t)(st7305_handle_t, int, int64_t);
typedef struct {
    const char *name;
    page_draw_t draw;
    uint32_t duration_ms;
    uint16_t target_fps; /* 0 = renderizar una sola vez, 65535 = sin límite */
} demo_page_t;

static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    {"Geometry", page_geometry, 5000, 0},
    {"Pixel grid", page_grid, 5000, 0},
    {"Text", page_text, 5500, 0},
    {"Dashboard UI", page_ui, 9000, 4},
    {"Frame rate", page_fps, 8500, UINT16_MAX},
    {"Fine patterns", page_patterns, 6000, 2},
    {"Bounce", page_bounce, 9000, 20},
    {"Starfield", page_stars, 9000, 20},
    {"Game of Life", page_life, 12000, 3},
    {"Uptime clock", page_clock, 9000, 4},
    {"Retro desktop", page_retro, 6500, 0},
    {"Inversion", page_inverse, 6000, 2},
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};

static void page_reset(int page)
{
    if (page == 6) memset(&perf, 0, sizeof(perf));
    if (page == 8) bounce = (typeof(bounce)){25, 85, 3, 2, 0};
    if (page == 9) {
        rng_state = 0x51a7f13du;
        for (int i = 0; i < STAR_COUNT; i++) star_reset(i, true);
    }
    if (page == 10) life_seed();
}

void lcd_demo_run(st7305_handle_t lcd)
{
    if (!lcd) return;
    int page = 0;
    while (1) {
        const demo_page_t *p = &pages[page];
        st7305_set_rotation(lcd, 0);
        page_reset(page);
        LOGI("Page %d/%d: %s", page + 1, ARRAY_LEN(pages), p->name);
        int64_t started = (int64_t)esp_timer_get_time();
        uint32_t wake = millis();
        int frame = 0;
        while (1) {
            int64_t draw_started = (int64_t)esp_timer_get_time();
            st7305_clear(lcd);
            p->draw(lcd, frame, draw_started - started);
            st7305_display(lcd);
            perf_record((uint32_t)(esp_timer_get_time() - draw_started));

            if (p->target_fps == 0) {
                delay(p->duration_ms);
                break;
            }
            frame++;
            if (esp_timer_get_time() - started >= (int64_t)p->duration_ms * 1000) break;
            if (p->target_fps != UINT16_MAX) {
                uint32_t interval = 1000 / p->target_fps;
                if (!interval) interval = 1;
                wake += interval;
                int32_t wait = (int32_t)(wake - millis());
                if (wait > 0) delay(wait);
            }
            yield();
        }
        page = (page + 1) % ARRAY_LEN(pages);
    }
}

/* ================= Puntos de entrada de Arduino ================= */

static st7305_handle_t lcd;

void setup(void)
{
    Serial.begin(115200);
    lcd = st7305_init(PIN_DC, PIN_RES, PIN_CS, PIN_SCLK, PIN_MOSI, SPI_CLOCK_HZ);

    /* La animación necesita HPM; las páginas estáticas también conservan su imagen en LPM. */
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    lcd_demo_run(lcd);
}
```

No es pseudocódigo ni un extracto didáctico que solo conserva las funciones clave — es el programa completo de un solo archivo con el driver de bajo nivel, las primitivas gráficas, la fuente integrada y el carrusel de 15 páginas. Al publicar el artículo, es recomendable ofrecer este `.ino` como adjunto o en un repositorio de código complementario, para que los lectores no tengan que ir pegando fragmentos sueltos del cuerpo del artículo.

Pon el archivo en una carpeta con el mismo nombre:

```text
ST7305_RLCD_Demo/
└── ST7305_RLCD_Demo.ino
```

Abre el `.ino` en el Arduino IDE, selecciona `Arduino Nano ESP32` y su puerto serie, luego compila y sube.

### Flujo mínimo de arranque: primero inicializa, luego el carrusel de 15 páginas

Este es el punto de entrada del programa completo. El trabajo de verdad lo hacen `st7305_init()` y `lcd_demo_run()` — el primero "despierta la pantalla", el segundo "hace que la pantalla se luzca".

```cpp
static st7305_handle_t lcd;

void setup(void)
{
    // Paso 1: abre un puerto serie a 115200 para ver los logs
    Serial.begin(115200);

    // Paso 2: inicializa SPI y el ST7305 con el cableado anterior
    lcd = st7305_init(
        PIN_DC, PIN_RES, PIN_CS,
        PIN_SCLK, PIN_MOSI,
        SPI_CLOCK_HZ
    );

    // Paso 3: las páginas animadas necesitan refresco — cambia a HPM (modo de alta tasa)
    st7305_high_power_mode(lcd);
    LOGI("Starting 15-page LCD demo carousel");
}

void loop(void)
{
    // Paso 4: esto hace carrusel para siempre — no hace falta máquina de estados
    lcd_demo_run(lcd);
}
```

Los pines y el reloj SPI están agrupados al principio del archivo — cámbialos primero al cambiar de placa:

```cpp
// Aquí van números GPIO — no copies los números D de la serigrafía del Nano
#define PIN_SCLK        10          // D7
#define PIN_MOSI         8          // D5 — importante: NO es GPIO11
#define PIN_CS           9          // D6
#define PIN_DC           7          // D4
#define PIN_RES          6          // D3
#define SPI_CLOCK_HZ     20000000UL // 20 MHz — primero estabilidad, luego velocidad
```

### Nota de código 1: por qué una trama son exactamente 15000 bytes

Esta pantalla tiene 300×400 = 120000 píxeles; cada píxel es solo negro o blanco, así que teóricamente ocupa 1 bit:

```text
120000 bits ÷ 8 = 15000 bytes
```

Con el formato de datos de este ejemplo, un byte (8 bits) del ST7305 corresponde a 2 filas × 4 columnas de píxeles:

```text
Fila 0: BIT7  BIT5  BIT3  BIT1
Fila 1: BIT6  BIT4  BIT2  BIT0
```

Así que cada fila no es el habitual 300÷8, sino 300÷4 = 75 bytes; verticalmente los píxeles se agrupan de dos en dos filas, dando 400÷2 = 200 grupos:

```cpp
#define ST7305_DATA_WIDTH     75      // 300 ÷ 4
#define ST7305_BUFFER_LENGTH  15000   // 75 × 200
```

El framebuffer es como dibujar primero en un borrador y entregarlo después a la pantalla de una vez. Así el dibujo no se enreda con el timing de SPI y el código es más fácil de mantener.

### Nota de código 2: cómo una coordenada aterriza en un bit concreto del framebuffer

Tras la rotación, las coordenadas lógicas se mapean de vuelta a coordenadas físicas 300×400, y luego se calculan la posición del byte y la posición del bit:

```cpp
// Paso 1: calcula en qué byte cae este píxel
int real_x = physical_x / 4;
int real_y = physical_y / 2;
int index = real_y * ST7305_DATA_WIDTH + real_x;

// Paso 2: calcula qué bit ocupa dentro de ese byte
int one_two = physical_y % 2;
int line_bit_4 = physical_x % 4;
int bit = 7 - (line_bit_4 * 2 + one_two);

// Paso 3: pon el bit a 1 para negro, a 0 para blanco
if (color) dev->buffer[index] |= (1 << bit);
else       dev->buffer[index] &= ~(1 << bit);
```

Esta disposición entrelazada es donde los principiantes más a menudo se equivocan en las cuentas. Si los gráficos salen torcidos, rotos en códigos de barras o desplazados cada dos líneas — revisa aquí primero, no te pongas a "ajustar a ciegas" los registros de inicialización.

### Nota de código 3: qué hacen realmente DC y CS

`DC` es como la etiqueta de un paquete: `LOW` significa "esto es un comando", `HIGH` significa "esto son datos de imagen". `CS` es como pasar lista: la pantalla solo recibe datos mientras está en bajo.

```cpp
static void write_register(st7305_handle_t dev, uint8_t reg)
{
    dc_cmd(dev);          // DC=LOW: a continuación viene un comando
    spi_write_byte(dev, reg);
}

static void write_parameter(st7305_handle_t dev, uint8_t data)
{
    dc_data(dev);         // DC=HIGH: a continuación viene un parámetro
    spi_write_byte(dev, data);
}
```

Al enviar una trama completa, el programa escribe 15000 bytes seguidos en lugar de abrir una transacción SPI por cada píxel:

```cpp
void st7305_display(st7305_handle_t dev)
{
    set_address_window(dev);             // Paso 1: delimitar la ventana de escritura de toda la pantalla
    dc_data(dev);                        // Paso 2: decir a la pantalla que a continuación vienen datos
    SPI.beginTransaction(SPISettings(dev->clock_hz, MSBFIRST, SPI_MODE0));
    digitalWrite(dev->gpio_cs, LOW);
    SPI.writeBytes(dev->buffer, ST7305_BUFFER_LENGTH); // Paso 3: enviar la trama entera
    digitalWrite(dev->gpio_cs, HIGH);
    SPI.endTransaction();
}
```

A 20 MHz, el tiempo teórico de transferencia SPI pura de 15000 bytes es de unos 6 ms; en la práctica hay que sumar comandos, dibujo y planificación del programa. La página 7 muestra el coste real medido — no se hacen pasar valores teóricos por FPS medidos.

### Nota de código 4: HPM, LPM y las imágenes estáticas no son lo mismo

Al terminar la inicialización, el panel entra en LPM; esta demo cambia a HPM en `setup()` para que las páginas animadas tengan condiciones de refresco de panel más adecuadas.

```cpp
st7305_high_power_mode(lcd);  // enviar 0x38 para entrar en HPM
```

Con `B2h=0x05`, en este ejemplo HPM queda configurado a 16 Hz y LPM a 8 Hz. El `target_fps` del programa solo controla lo rápido que dibuja el host — no puede ordenar a la respuesta física del cristal líquido superar los límites del panel.

Una página estática con `target_fps=0` significa: dibujar una vez y conservar la imagen, sin reenvíos. Pero todo el carrusel sigue en HPM — no vuelve automáticamente a LPM en cada página estática. Para un producto real de bajo consumo, conviene añadir además conmutación de modos y refresco parcial siguiendo el timing del datasheet.

### Nota de código 5: cómo hacen carrusel automático las 15 demos

Todas las páginas viven en el array `pages[]`; cada entrada contiene nombre, función de dibujo, duración y FPS objetivo:

```cpp
static const demo_page_t pages[] = {
    {"Hello World", page_hello, 3500, 0},
    {"Dither gray", page_gray, 6500, 0},
    // las otras 12 páginas siguen el mismo patrón: función, duración, FPS objetivo
    {"Rotation 0/90/180/270", page_rotation, 12000, 4},
};
```

¿Quieres otro orden? Intercambia entradas del array. ¿Unos segundos más de campo de estrellas? Cambia `duration_ms`. ¿Tu propia página? Escribe una función de dibujo con la misma firma y regístrala en el array. No hace falta desperdigar la planificación del carrusel por todas partes.

### Nota de código 6: por qué la rotación en cuatro direcciones no depende de adivinar MADCTL

El programa establece la orientación 0~3 mediante `st7305_set_rotation(lcd, rotation)` y mapea coordenadas al escribir en el framebuffer:

| `rotation` | Orientación     | Resolución lógica |
| ---------: | --------------- | ----------------- |
|          0 | 0°              | 300×400           |
|          1 | 90° horario     | 400×300           |
|          2 | 180°            | 300×400           |
|          3 | 270° horario    | 400×300           |

Establecer la orientación solo afecta al dibujo posterior — no borra la pantalla ni la refresca automáticamente. Tras cambiarla, debes limpiar el framebuffer y redibujar la imagen completa; al inicio de cada página del carrusel, el programa también resetea la orientación a 0, para que la página anterior no "incline" la siguiente.

## Solución de problemas: el ST7305 no muestra nada, sale borroso o parpadea

No te asustes — el 80% de los problemas de "la pantalla no se enciende" vienen de estos pocos puntos; solo el 20% restante le toca cargar con la culpa a los registros de inicialización.

### 1. El serie dice que la inicialización fue bien, pero la pantalla queda toda blanca

El SPI de solo escritura no tiene lectura MISO — el host dirá "transferencia completa" aunque haya mandado los datos al aire. Primero comprueba si `D5 → GPIO8` está bien cableado, luego mide si VCI es 3.3V, si hay tierra común y si el FPC está bloqueado. Apagar del todo unos segundos y volver a encender es más a fondo que solo pulsar RESET.

### 2. La pantalla muestra contenido, pero se corrompe aleatoriamente o a veces se congela

Baja temporalmente `SPI_CLOCK_HZ` de 20 MHz a 5 MHz, acorta los cables dupont y vuelve a asentar los conectores. Si se recupera a menor velocidad, arregla primero longitud de cables, contactos e integridad de señal — no empieces cambiando los voltajes Gate/Source.

### 3. Los gráficos salen desplazados, rayados, o el texto parece troceado

Comprueba `DTFORM=0x11`, la ventana de direcciones de columna y el mapeo de bits de píxeles de 2 filas × 4 columnas. Confirma también que las coordenadas lógicas no se salen de rango: 0°/180° es 300×400, 90°/270° es 400×300.

### 4. Casi no se ve en la oscuridad

Es una pantalla totalmente reflectiva sin retroiluminación — no ha aprendido de repente a hacerse invisible. Añade iluminación ambiental, y no trates BLC como una línea de retroiluminación obligatoria: en este ejemplo BLC puede quedar al aire.

### 5. La animación deja estelas o los patrones finos parpadean

Los tableros densos, la alternancia de fases y la inversión rápida de trama completa son pruebas de estrés por diseño — no todas las UI se verán así. Baja el `target_fps` de las páginas animadas, reduce la inversión de alta frecuencia en áreas grandes y confirma que estás en HPM; si el ghosting es evidente, no sigas acelerando contra la física del panel.

### 6. Tras cambiar a chino solo salen signos de interrogación o cuadros

La fuente integrada solo tiene 96 caracteres ASCII 5×7 — sin chino. Necesitarías importar una fuente china recortada y dibujar con `st7305_write_point()`; no metas directamente una librería de fuentes grande completa, o el firmware tendrá más "peso" que la UI.

### 7. Quieres confirmar que el hardware está vivo sin mirar páginas complejas primero

Haz primero una prueba alternante todo-negro / todo-blanco, esquivando temporalmente la lógica de texto, coordenadas y animación:

```cpp
// Paso 1: llenar la trama de 1s — prueba todo-negro
st7305_fill(lcd, 0xFF);
st7305_display(lcd);
delay(2000);

// Paso 2: limpiar la trama a 0 — prueba todo-blanco
st7305_fill(lcd, 0x00);
st7305_display(lcd);
delay(2000);
```

Si el todo-negro y el todo-blanco funcionan, restaura el carrusel de 15 páginas. Diagnosticar es como ir al médico: primero las pruebas sencillas, no vayas directo a la operación mayor.

## FAQ: preguntas frecuentes sobre ESP32-S3 y ST7305

**P: ¿Se pueden mover los pines SPI del ST7305 a otros GPIO?**
R: Sí. El ESP32-S3 puede remapear SPI a través de la GPIO Matrix — cambia `PIN_SCLK`, `PIN_MOSI`, `PIN_CS`, `PIN_DC`, `PIN_RES` y recablea a la par. Evita pines ya usados por la placa, pines de arranque y pines relacionados con USB; tras cambiar de placa, consulta siempre el pinout oficial de esa placa — no copies a ciegas solo porque "todo es ESP32-S3".

**P: ¿Por qué la pantalla ST7305 necesita 3.3V? ¿Puede con 5V?**
R: En este ejemplo el VCI del módulo usa 3.3V, y los GPIO del ESP32-S3 también son lógica de 3.3V — no pongas 5V directamente en VCI ni en ningún pin de señal. La alimentación también debe compartir tierra; con solo 3.3V conectado y GND olvidado, las señales no tienen referencia común.

**P: ¿Cuál es la tasa de refresco real del ST7305 — escribir 20 FPS en el código significa 20 Hz?**
R: No. En este ejemplo el HPM del panel está configurado a 16 Hz; `target_fps=20` es solo el ritmo objetivo del host para generar y enviar como máximo 20 tramas por segundo. A 20 MHz de SPI, enviar 15000 bytes tarda unos 6 ms en teoría; el FPS real es la medición de "dibujo + SPI" de la página 7, y la respuesta óptica está además limitada por el modo del panel.

**P: ¿Cuánta memoria del ESP32-S3 ocupa el framebuffer de 15000 bytes?**
R: El framebuffer fijo son 15000 bytes, unos 14.65 KiB, más la tabla de fuentes, el estado de páginas y las variables temporales de dibujo. La demo usa una instancia global estática, así que no hay asignación dinámica de todo el buffer por cada trama.

**P: ¿Pueden otras placas ESP32-S3 usar directamente este código Arduino del ST7305?**
R: La lógica del driver es reutilizable, pero hay que cambiar la selección de placa y el mapeo de GPIO. Con una placa que no sea Nano ESP32, selecciónala en el Arduino IDE y cambia los 5 GPIO de control a tu cableado real; la alimentación sigue siendo 3.3V según pide el módulo.

**P: La pantalla ST7305 no muestra nada en absoluto — ¿qué parámetro cambio primero?**
R: Primero no toques registros de voltaje. Sigue el orden "alimentación 3.3V → tierra común → FPC/cables dupont → D5=GPIO8 → bajar SPI a 5 MHz → prueba todo-negro/todo-blanco". Solo tras verificar la cadena de hardware mira la secuencia de inicialización y el framebuffer.

**P: ¿Por qué esta pantalla monocroma de 1 bit puede mostrar 17 niveles de gris?**
R: No tiene píxeles de escala de grises reales — usa un tramado ordenado Bayer 4×4 para controlar la densidad de puntos negros y blancos, de modo que el ojo humano percibe 17 niveles de brillo (0–16) a cierta distancia. Ampliando, sigue habiendo solo puntos negros y blancos — "turnos de trabajo" para crear sensación de profundidad.

**P: ¿Puede la demo del ST7305 mostrar caracteres chinos directamente?**
R: No directamente. La fuente integrada cubre ASCII 32–126; los caracteres chinos se reemplazan por `?`. Necesitarías añadir glifos chinos recortados y una función de dibujo, o puentear la interfaz de dibujo existente a una librería de fuentes.

**P: ¿Hay que usar una pantalla totalmente reflectiva en una habitación oscura?**
R: Necesita luz ambiente — más oscuro no es mejor. La iluminación interior normal o ambientes luminosos la hacen más legible; en la oscuridad debes añadir iluminación externa, porque este ejemplo no tiene retroiluminación y BLC no está conectado.

## Para ir más lejos: qué más puedes hacer tras encender el ST7305

- Conecta un sensor de temperatura/humedad y sustituye los datos de demo de la página 6 por datos ambientales reales.
- Añade botones o un codificador rotatorio para cambiar manualmente entre las 15 páginas y ajustar la duración.
- Implementa refresco parcial: usa CASET/RASET para definir una ventana, combinado con `WRMEMC 0x3C`, para reducir las transferencias de trama completa.
- Cablea el sincronismo de trama TE, escribe tramas tras el V-Blank e investiga a fondo el control de tearing en contenido en movimiento.
- Añade una fuente china recortada para hacer un cartel meteorológico, calendario o reloj de baja tasa de refresco.
- Vuelve a LPM en páginas estáticas siguiendo el timing del datasheet, y mide de verdad el consumo total — no te conformes con las palabras "bajo consumo".

## Referencias

- [Hoja de datos del ST7305 (Sitronix)](https://www.sitronix.com.tw/): las definiciones de registros, el timing HPM/LPM y el flujo de inicialización se rigen por la hoja de datos oficial
- [Librería U8g2](https://github.com/olikraus/u8g2): incluye el constructor `U8G2_ST7305_300X400_1_4W_HW_SPI` desde v2.36
- [ST7305_MonoTFT_Arduino_Library](https://github.com/FT-tele/ST7305_MonoTFT_Arduino_Library): envoltorio driver Arduino de terceros para el ST7305
- [Documentación oficial del Arduino Nano ESP32](https://docs.arduino.cc/hardware/nano-esp32/): correspondencia entre serigrafía de la placa y GPIO

Si también encendiste la tuya, empieza comprobando la cuadrícula de píxeles de la página 4 y la prueba de tasa de tramas de la página 7, y luego añade tu propia UI a `pages[]`. Una pantalla con solo blanco y negro aún puede mantener un panel de instrumentos, animaciones y un escritorio retro bien ocupados.
