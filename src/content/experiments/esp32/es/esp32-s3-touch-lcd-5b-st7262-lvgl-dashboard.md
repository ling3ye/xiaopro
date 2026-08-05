---
title: "Encender la pantalla RGB ST7262 con ESP32-S3 + dashboard LVGL: tutorial completo (Waveshare Touch-LCD-5B / 1024×600)"
boardId: esp32s3
moduleId: display/tft50-st7262
category: esp32
date: 2026-08-03
intro: "Con ESP-IDF, enciende desde cero la pantalla RGB en la Waveshare ESP32-S3-Touch-LCD-5B (5 pulgadas 1024×600, controlada directamente por ST7262), intégrala con LVGL y conviértelas en un dashboard de telemetría vehicular animado. Explica a fondo el control del backlight vía CH422G, el ajuste de PCLK, el doble framebuffer en PSRAM y las animaciones con easing, con código ESP-IDF completo y lista de trampas."
image: "https://img.lingflux.com/2026/08/b7d201de3550e7561294441b57a205de.jpg"
---

Dificultad: ⭐⭐⭐☆☆ (te basta con saber algo de C y haber tocado ESP-IDF)
Tiempo estimado: 2～3 horas (incluyendo la configuración del entorno)
Entorno de prueba: ESP-IDF 5.3.x (o 5.2.7 añadiendo una macro) + LVGL ^9.3 + espressif/esp_lvgl_port 2.8

---

> **Resumen en una frase**: con ESP-IDF, en la Waveshare ESP32-S3-Touch-LCD-5B (5 pulgadas 1024×600, controlada directamente por RGB puro vía ST7262), enciende desde una pantalla negra la pantalla RGB, intégrala con LVGL y termina con un dashboard de telemetría vehicular animado. Aquí están todas las trampas en las que caí (la mentira de la resolución, la pantalla blanca por PCLK, la pantalla blanca por memoria de LVGL, el tearing y la falta de fluidez) y el código que las resuelve.

---

> **TL;DR (inicio rápido):**
> 1. **Reconoce lo que tienes en las manos**: la 5B es **1024×600**, con driver IC **ST7262** y RGB directo — no te creas el 800×480 que viene por defecto en los ejemplos oficiales.
> 2. **Usa PCLK = 16MHz**: no copies los 21MHz que define la placa; con el framebuffer en PSRAM no da abasto y se vuelve todo blanco.
> 3. **El backlight va por CH422G**: no es un GPIO normal ni es PWM; escribes un byte en la dirección I²C `0x38` y se enciende/apaga.
> 4. **Para correr LVGL abre dos macros**: `LV_USE_CLIB_MALLOC=y` + `SPIRAM_USE_MALLOC=y`, si no, pantalla blanca + reinicio por watchdog.
> 5. `idf.py build flash monitor`, enciende, saca el champán.

---

## Prefacio

Este fin de semana estaba fuera de casa; un amigo había comprado una **ESP32-S3-Touch-LCD-5B** de Waveshare. Con el firmware oficial quemado se veía bien, pero no conseguía encenderla por código; con los ejemplos oficiales iba entre negra y blanca y no había manera de entenderlo. Así que me la llevó para pelearme con ella. Es una placa de desarrollo con pantalla RGB capacitiva táctil de 5 pulgadas y 1024×600. No es cara, pero trae un equipazo: CAN, RS485, RTC, carga de batería de litio, además de 16MB de Flash + 8MB de PSRAM.

Así que la tomé para intentar encenderla — últimamente me gusta mucho encender pantallas. Pero el proceso tuvo más trampas de las que esperaba. Lo más desmotivador: **si sigues la documentación y los ejemplos oficiales de Waveshare, no la enciendes.** No es que seas malo, es que los recursos oficiales directamente no están pensados para esta 5B.

He dividido todo el proceso en tres pequeños ejemplos progresivos; el código está en GitHub ([directorio completo del proyecto](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B), los tres ejemplos están ahí dentro):

1. **Encender la pantalla**: la forma más sencilla, mostrar un Hello World → [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
2. **Integrar LVGL**: hacer un velocímetro semicircular con animación de aguja → [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
3. **Convertirlo en dashboard**: cambiarlo por un panel de telemetría vehicular con diseño → [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

**Objetivo de este artículo**: entregarte las trampas pisadas en estos tres pasos, el código que explica por qué se resuelven así, y una lista de referencia lista para copiar, para que no pases tantas noches en vela.

---

## Resultado del experimento

Al final obtendrás un **dashboard de telemetría vehicular animado**: cinco tarjetas de datos — RPM, acelerador, temperatura del agua, velocidad y voltaje — con números que se aproximan con easing, barras de progreso que se ponen rojas en sobrecarga y un aguja con animación fluida y sin tearing.

![](https://img.lingflux.com/2026/08/032db1082c643b3c0cc44b993101ead1.jpg)


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/doq81VdEQRI?si=bIy_tzkslkScLqzU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## 1. Descripción de la placa: conoce primero esta 5B

Antes de pisar trampas, pongamos sobre la mesa las especificaciones de la ESP32-S3-Touch-LCD-5B. Las trampas que vienen después — qué PCLK poner, si hay memoria suficiente, qué pines comparten un mismo bus I²C — casi todas giran en torno a esta tabla; te será más fácil seguirla con ella a mano.

### Pantalla (lo primero que hay que reconocer)

| Concepto | Especificación |
| --- | --- |
| Tamaño | 5 pulgadas |
| Tipo de panel | IPS |
| Resolución | **1024 × 600** (medido; la documentación oficial no separa la 5B y por defecto trae 800×480 — esta es la trampa gorda del capítulo 1) |
| Colores | 65K colores |
| Interfaz | RGB (paralelo), driver IC **ST7262**, RGB directo puro, **no hay que enviarle comandos de inicialización por SPI** |
| Ángulo de visión | 175° |
| Brillo | 550 cd/m² |
| Táctil | Táctil capacitivo (panel de cristal incluido) |
| Chip de boost de backlight | AP3032KTR-G1 |

> **ST7262** es un driver IC de panel LCD con interfaz RGB (de Sitronix); recibe la señal RGB paralela y maneja los cristales líquidos. En este proyecto **no tienes que enviarle comandos de inicialización en absoluto** — alimentación, timings correctos, darle datos, y se enciende solo. Esto ahorra muchos dolores de cabeza.

### Chip principal (MCU)

| Concepto | Especificación |
| --- | --- |
| Módulo | ESP32-S3-WROOM-1-**N16R8** |
| Núcleos | Xtensa 32-bit LX7 de doble núcleo, hasta 240 MHz |
| Flash | **16 MB** |
| PSRAM | **8 MB** (SPI octal) |
| SRAM interna | 512 KB |
| Conectividad | Wi-Fi 2.4 GHz (802.11 b/g/n), Bluetooth 5 (LE), antena de placa |
| USB | USB Full-Speed, Type-C de placa |

> La **PSRAM** es una memoria "grande pero lenta" externa al chip. El framebuffer de toda la pantalla se coloca en estos 8MB, y la DMA la vuelca sin parar hacia la pantalla. **Esa PSRAM de 8MB es el sitio donde vive el framebuffer de la pantalla entera.** Configurar la PSRAM como quad en lugar de octal es una trampa común (ver capítulo 7).

### Táctil

| Concepto | Especificación |
| --- | --- |
| IC táctil | **GT911** |
| Tipo | Capacitivo |
| Puntos soportados | 5 puntos |
| Interfaz | I²C |
| Dirección I²C | **0x5D** |

> **GT911** es un controlador táctil capacitivo que convierte la posición del dedo en coordenadas digitales y las reporta por I²C. En este proyecto comparte el mismo bus I²C (GPIO8/GPIO9) con el RTC y el CH422G, así que hay que planificar bien las direcciones. **Esta serie de ejemplos todavía no integra el táctil**, queda pendiente para más adelante.

### Alimentación e interfaces

| Concepto | Especificación |
| --- | --- |
| Alimentación | Type-C 5V / DC 7–36V / batería de litio de una celda 3.7V (MX1.25) |
| Consumo | 5V / 450 mA (típico) |
| CAN | Compatible con CAN 2.0 (TJA1051, resistencia de terminación 120Ω desactivada por defecto) |
| RS485 | Transceptor SP3485 (resistencia de terminación 120Ω desactivada por defecto) |
| Temperatura de operación | 0 °C ~ 65 °C |
| Dimensiones | Placa desnuda 112.4 × 75.1 mm / con carcasa 116.3 × 79 mm |

---

## 2. Mapa de recursos de placa (incluidos en la placa, no hace falta cablear)

> ⚠️ **Esta placa es una placa de desarrollo, los componentes ya vienen soldados; lo que sigue es el mapa de recursos integrados, para que consultes pines y configures el SDK, no para que conectes con cables Dupont.** Lo único que tienes que hacer: enchufar el Type-C a la corriente y el USB al ordenador para flashear.

### Pines de la interfaz RGB de la pantalla

> Lo siguiente se corresponde con la documentación oficial y ha sido verificado conduciendo la placa real. Ten en cuenta que GPIO0 es un pin strapping (ver lista de trampas del capítulo 7).

| ESP32-S3 GPIO | Señal LCD | Descripción |
| --- | --- | --- |
| GPIO0  | G3    | Green dato bit3 |
| GPIO1  | R3    | Red dato bit3 |
| GPIO2  | R4    | Red dato bit4 |
| GPIO3  | VSYNC | Sincronismo vertical |
| GPIO4  | TP_IRQ | Interrupción táctil |
| GPIO5  | DE    | Habilitación de datos |
| GPIO7  | PCLK  | Reloj de píxel (16MHz estable en pruebas) |
| GPIO10 | B7    | Blue dato bit7 |
| GPIO14 | B3    | Blue dato bit3 |
| GPIO17 | B6    | Blue dato bit6 |
| GPIO18 | B5    | Blue dato bit5 |
| GPIO21 | G7    | Green dato bit7 |
| GPIO38 | B4    | Blue dato bit4 |
| GPIO39 | G2    | Green dato bit2 |
| GPIO40 | R7    | Red dato bit7 |
| GPIO41 | R6    | Red dato bit6 |
| GPIO42 | R5    | Red dato bit5 |
| GPIO45 | G4    | Green dato bit4 |
| GPIO46 | HSYNC | Sincronismo horizontal |
| GPIO47 | G6    | Green dato bit6 |
| GPIO48 | G5    | Green dato bit5 |

### Táctil / RTC / I²C externo (bus compartido)

| ESP32-S3 GPIO | Señal | Descripción |
| --- | --- | --- |
| GPIO8 | SDA / TP_SDA / RTC_SDA | Datos I²C (compartido por táctil GT911, RTC PCF85063 e I²C externo) |
| GPIO9 | SCL / TP_SCL / RTC_SCL | Reloj I²C (compartido igual que arriba) |
| GPIO4 | TP_IRQ | Interrupción táctil |

### USB / SD / RS485 / CAN

| Función | ESP32-S3 GPIO | Descripción |
| --- | --- | --- |
| USB D- / D+ | GPIO19 / GPIO20 | USB Full-Speed |
| SD MOSI / SCK / MISO | GPIO11 / GPIO12 / GPIO13 | Tarjeta SD (SPI) |
| SD CS | (CH422G EXIO4) | Activo en bajo, controlado por el expansor de IO, no está en el CS nativo del SPI |
| RS485 RXD / TXD | GPIO43 / GPIO44 | SP3485 |
| CAN TX / RX | GPIO15 / GPIO16 | TJA1051 |

### Un chip del que no puedes huir: el expansor de IO CH422G

Ese chip del que cuelgan el backlight y el reset de la placa es el **CH422G**, y se maneja por I²C. Su rareza es: **no tiene puntero de registro, usa directamente la dirección I²C como comando**.

> **CH422G** es un expansor de IO con interfaz I²C que unifica señales sueltas como el backlight, el reset de pantalla, el reset del táctil y el chip select de la SD. En este proyecto lo usas para encender el backlight y resetear la pantalla.

| Pin CH422G | Función | Descripción |
| --- | --- | --- |
| EXIO0 | DI0  | Entrada digital 0 |
| EXIO1 | TP_RST | Reset del táctil |
| EXIO2 | DISP | Habilitación del backlight (solo on/off, **no es dimmable**) |
| EXIO3 | LCD_RST | Reset de la pantalla |
| EXIO4 | SD_CS | Chip select de la SD (activo en bajo) |
| EXIO5 | DI1  | Entrada digital 1 |
| OD0   | DO0  | Salida digital 0 |
| OD1   | DO1  | Salida digital 1 |

---

## 3. Lo que hay que instalar: toolchain ESP-IDF + componentes

Esta placa **no necesita que instales librerías**, pero usa **ESP-IDF** (el framework oficial de Espressif) en lugar de Arduino. Motivo: la combinación RGB directo + framebuffer en PSRAM + LVGL tiene decenas de interruptores en sdkconfig (PCLK, modo PSRAM, pool de memoria) que se controlan mucho mejor en ESP-IDF; en Arduino, ajustar parámetros es bastante torpe.

**Lista de preparación (revisa con esto, te ahorrará el 80% del tiempo de depuración):**

- [ ] **ESP-IDF 5.3.x** (recomendado). Con 5.2.7 también corre, pero hay que añadir una macro (ver capítulo 7).
- [ ] **LVGL ^9.3** (`esp_lvgl_port` 2.8 depende de constantes de color añadidas en 9.3).
- [ ] **espressif/esp_lvgl_port 2.8** (se encarga del reloj de LVGL, la tarea independiente y los bloqueos).
- [ ] **Usuarios de Windows**: usad PowerShell + el profile de EIM, **no ejecutéis `idf.py` dentro de Git Bash** (nada más detectar `MSYSTEM` se niega a funcionar).

Las versiones de los componentes tienen que emparejarse dentro de la misma generación: `esp_lvgl_port` 2.8 con LVGL `^9.3`; si los mezclas mal, en compilación te saldrá `RGB565_SWAPPED undeclared`.

---

## 4. Primer paso: encender la pantalla (sin aplicar directamente el ejemplo oficial)

> 📦 **Código completo de este capítulo**: [01 HelloWorld](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld) — la forma más sencilla, encender la pantalla y mostrar un Hello World.

Esta es la trampa más gorda de todo el asunto y lo que más quiero contar primero.

**Los ejemplos oficiales de ESP-IDF de Waveshare (por ejemplo `08_lvgl_Porting`) y la documentación están, en su práctica totalidad, escritos para 800×480.** Su rama `#else` por defecto es 800×480. La documentación oficial, además, etiqueta toda la serie de 5 pulgadas de forma vaga como "800×480 o 1024×600", **y precisamente no indica cuál es la 5B en concreto**.

Si sin más quemas el ejemplo oficial en la 5B, obtendrás una imagen muy confusa: **la pantalla casi toda negra y una franja blanca en el lado derecho** (negro + blanco). No está rota; es "estar alimentando un panel de 1024×600 con una señal de 800×480" — el panel es más ancho que la señal, y la parte sobrante de la derecha no tiene señal, así que se muestra así.

Sumado a que en la nomenclatura de Waveshare **"el sufijo B suele representar pantalla cuadrada"** (por ejemplo la 4B es 480×480 cuadrada), llegué a sospechar que la 5B era una pantalla cuadrada de 720×720 y que había que pasar primero por una inicialización por SPI. Después de pelearme un rato confirmé: **la 5B es 1024×600, con driver IC ST7262, RGB directo puro, no hay que enviarle ningún comando de inicialización por SPI.** Esto es muy importante y ahorra muchos dolores de cabeza.

Así que el primer paso es siempre: **no te creas la resolución del ejemplo oficial, confirma tú mismo cuál es exactamente la que tienes en las manos.**

El método torpe para confirmarlo es el de arriba — darle 800×480, ver que sale una franja blanca a la derecha, y por reducción deducir que es 1024×600 (sólo si el panel es más ancho que la señal pasa eso).

### 4.1 Flujo de arranque (el esqueleto de 6 pasos)

Una vez entendido el carácter, empezamos a encender. El flujo de arranque son justo 6 pasos: **levantar el I²C → resetear la pantalla vía CH422G → crear el panel RGB → dibujar la imagen → encender el backlight → la CPU queda ociosa, la DMA se refresca sola**.

Lo de "dibujar la imagen y solo al final encender el backlight" es crítico — evita la imagen corrupta del primer frame de arranque. Llevado a código, el orden de encendido es fijo:

```c
/* Paso 1: levantar primero el bus I²C (GPIO8/9, compartido con el táctil GT911 y el RTC).*/
i2c_master_bus_handle_t i2c_bus = NULL;
i2c_master_bus_config_t bus_cfg = {
    .sda_io_num = 8, .scl_io_num = 9, .clk_source = I2C_CLK_SRC_DEFAULT,
    .flags.enable_internal_pullup = true,
};
i2c_new_master_bus(&bus_cfg, &i2c_bus);

/* Paso 2: conducir el CH422G — primero reset, luego soltar (aquí el backlight sigue apagado).*/
ch422g_handle_t io = {0};
ch422g_init(&io, i2c_bus);
ch422g_set_outputs(&io, 0);                              /* Todo EXIO a bajo: reset + backlight off */
vTaskDelay(pdMS_TO_TICKS(10));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST); /* Soltar reset, backlight aún off */
vTaskDelay(pdMS_TO_TICKS(120));                          /* Esperar a que el panel se levante */

/* Paso 3: crear el panel RGB y dibujar la imagen en el framebuffer PSRAM (ver siguiente bloque)…*/

/* Paso 4: imagen lista, el último paso es encender el backlight — escribir EXIO2 a alto.*/
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

> **Regla de orden: el backlight siempre se enciende el último.** Durante el reset todos los EXIO están a bajo (backlight off), tras soltar el reset se dibuja la imagen y solo cuando está lista se escribe EXIO2 a alto. Si lo haces al revés, encendiendo el backlight antes de dibujar, verás un frame corrupto de arranque.

### 4.2 Cómo se "enciende al escribir a alto": el driver mínimo de CH422G

Lo de "escribe a alto y se enciende", en código se traduce en dos cosas: escribir un driver para el CH422G y luego llamarlo en el orden correcto dentro del flujo de arranque. El núcleo del driver es un único punto — **la dirección es el registro**: escribe el modo en `0x24` y un byte en `0x38` (ese byte es justo el nivel de las 8 salidas). El driver mínimo se ve así (versión completa en `main/ch422g.c` del repo):

```c
/* "Registro" CH422G = la propia dirección I²C de 7 bits del dispositivo (no hay byte de registro separado).*/
#define CH422G_REG_MODE  0x24   /* Escribir 0x01 -> EXIO0..7 salida push-pull */
#define CH422G_REG_OUT   0x38   /* Escribir un byte -> el nivel de EXIO0..7 */

/* Bits de salida EXIO: el bit n = el nivel de EXIO_n (1 = alto).*/
#define CH422G_TP_RST   (1u << 1)   /* EXIO1 reset del táctil */
#define CH422G_BL       (1u << 2)   /* EXIO2 habilitación del backlight */
#define CH422G_LCD_RST  (1u << 3)   /* EXIO3 reset de la pantalla */

/* Para cada una de las dos "dirección como registro" se crea un handle de dispositivo I²C.*/
esp_err_t ch422g_init(ch422g_handle_t *ch, i2c_master_bus_handle_t bus) {
    i2c_device_config_t mode_cfg = { .device_address = CH422G_REG_MODE, .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &mode_cfg, &ch->dev_mode);
    i2c_device_config_t out_cfg  = { .device_address = CH422G_REG_OUT,  .scl_speed_hz = 100000 };
    i2c_master_bus_add_device(bus, &out_cfg,  &ch->dev_out);

    uint8_t mode = 0x01;                              /* Modo salida push-pull */
    i2c_master_transmit(ch->dev_mode, &mode, 1, -1);
    uint8_t zero = 0;
    i2c_master_transmit(ch->dev_out,  &zero, 1, -1);  /* Empezar todo a cero */
    return ESP_OK;
}

/* Un byte es justo el nivel de las 8 salidas — esto es "usar la dirección como comando".*/
esp_err_t ch422g_set_outputs(ch422g_handle_t *ch, uint8_t exio_mask) {
    return i2c_master_transmit(ch->dev_out, &exio_mask, 1, -1);
}
```

### 4.3 Crear el panel RGB (el núcleo de este capítulo)

Este bloque de creación del panel es el núcleo de todo el capítulo; las tres trampas siguientes explican línea a línea por qué se rellena así:

```c
#define LCD_H_RES        1024
#define LCD_V_RES        600
#define LCD_PIXEL_CLK_HZ (16 * 1000 * 1000)   /* ← Trampa 1: 16MHz, no los 21MHz que define la placa */

/* En RGB565 el verde es 6 bits (0..63), rojo y azul 5 bits (0..31); el blanco puro hay que escribirlo como 31,63,31 (← Trampa 2).*/
#define RGB565(r, g, b)   ((((r) & 0x1F) << 11) | (((g) & 0x3F) << 5) | ((b) & 0x1F))
#define COLOR_BG          RGB565(2, 8, 20)     /* Fondo azul oscuro */
#define COLOR_FG          RGB565(31, 63, 31)   /* Blanco real */

esp_lcd_rgb_panel_config_t panel_cfg = {
    .data_width = 16,                          /* RGB565 = 16 bits */
    .bounce_buffer_size_px = 10 * LCD_H_RES,   /* bounce en SRAM: evita pantalla blanca por no dar abasto a 16MHz */
    .disp_gpio_num = -1,                       /* El backlight está en el CH422G, no es un GPIO */
    .pclk_gpio_num  = 7, .vsync_gpio_num = 3, .hsync_gpio_num = 46, .de_gpio_num = 5,
    .data_gpio_nums = {
        14, 38, 18, 17, 10,        /* B3..B7 */
        39,  0, 45, 48, 47, 21,    /* G2..G7 */
         1,  2, 42, 41, 40,        /* R3..R7 */
    },
    .timings = {
        .pclk_hz = LCD_PIXEL_CLK_HZ,           /* ← Trampa 1 */
        .h_res = LCD_H_RES, .v_res = LCD_V_RES,
        .hsync_pulse_width = 30, .hsync_back_porch = 40, .hsync_front_porch = 220,
        .vsync_pulse_width = 4,  .vsync_back_porch  = 8,  .vsync_front_porch = 4,
        .flags.pclk_active_neg = true,
    },
    .flags.fb_in_psram = true,                 /* Framebuffer de toda la pantalla (~1.17MB) en PSRAM */
};
esp_lcd_new_rgb_panel(&panel_cfg, &panel);
esp_lcd_panel_init(panel);                     /* ← Trampa 3: añadir esta línea tras crear el panel */
```

Una vez creado el panel, con el framebuffer en la mano ya puedes escribir píxeles directamente — el panel RGB de ESP-IDF no ofrece primitivas de dibujo más allá de `draw_bitmap`, así que el helloworld trae sus propias utilidades `lcd_fill` / `lcd_draw_text` (fuente de puntos, ver `lcd_draw.c` en el repo):

```c
/* Obtener el framebuffer que está en PSRAM y dibujar Hello World.*/
void *fb = NULL;
esp_lcd_rgb_panel_get_frame_buffer(panel, 1, &fb);
lcd_draw_init((uint16_t *)fb, LCD_H_RES, LCD_V_RES);
lcd_fill(COLOR_BG);
lcd_draw_text((LCD_H_RES - tw) / 2, (LCD_V_RES - th) / 2, "Hello World!", 5, COLOR_FG);

/* Imagen lista, al final encender el backlight. Después la DMA refresca la pantalla desde PSRAM por su cuenta, la CPU queda ociosa.*/
vTaskDelay(pdMS_TO_TICKS(60));
ch422g_set_outputs(&io, CH422G_LCD_RST | CH422G_TP_RST | CH422G_BL);
```

### 4.4 Tres trampas en las que realmente caí

**Trampa 1: el PCLK copiado demasiado alto, toda la pantalla en blanco.** Al copiar la definición oficial de placa de Arduino, el reloj de píxel (PCLK) puesto era 21MHz, y el resultado era una pantalla **completamente blanca** (no negra). La verdad es: la imagen está en PSRAM y la DMA tiene que leerla sin parar para mandarla a la pantalla. 21MHz × 16 bits ≈ 336M bits por segundo de ancho de banda, lo cual es **demasiado** para el camino "PSRAM → DMA → pantalla"; en cuanto no da abasto, la pantalla no recibe una señal de sincronismo válida y directamente muestra un fondo blanco de "sin señal". **Bajar a 16MHz, estable.**

**Trampa 2: el texto blanco se volvió rosa, a punto de reordenar los pines.** Tras encenderla, el texto blanco se veía rosa; la primera reacción es que los pines del verde estaban al revés — error. La verdadera causa es que **en RGB565 el verde es 6 bits (0–63), y el rojo y azul son 5 bits (0–31)**. En `RGB565(31, 31, 31)`, ese 31 del verde, dentro del rango 0–63, no llega ni a la mitad; rojo y azul al máximo, verde a la mitad, y la mezcla da rosa. Cambiar a `RGB565(31, 63, 31)` es el blanco real. Los sesgos de color vienen en dos tipos: **blanco que se vuelve cian = problema de orden de pines**; **blanco que se vuelve rosa = valor mal rellenado**.

**Trampa 3: falta una línea de inicialización.** El flujo canónico es "crear panel → resetear → inicializar → encender display"; al principio solo llamé al paso de crear el panel. En la mayoría de los casos, al crear se empieza a escanear automáticamente, pero añadir una línea `esp_lcd_panel_init()` descarta el problema oculto de "la DMA no arrancó" — sin ella, a veces encendía y a veces no.

### 4.5 El truco más valioso: mirar primero "cómo no enciende"

Frente a un "no la enciendo", el truco más útil es **mirar primero cómo es exactamente el no-encender de la pantalla**:

- **No hay backlight en absoluto** → asunto del CH422G / secuencia de reset
- **Backlight encendido pero todo blanco/gris** → la señal RGB no se ha dado bien (lo más común; revisa PCLK y timings)
- **Backlight encendido pero imagen corrupta/temblando** → la señal ya está, los parámetros de timing andan cerca pero no del todo
- **Backlight encendido pero color incorrecto (blanco que se vuelve cian)** → el orden de los canales RGB está mal

Una sola observación así parte el problema en dos y te ahorra un montón de conjeturas a ciegas.

---

## 5. Segundo paso: integrar LVGL y hacer una animación de aguja

> 📦 **Código completo de este capítulo**: [02 Speedometer](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer) — integrar LVGL y hacer un velocímetro semicircular con animación de aguja.

Tras encender, quise hacer una interfaz que se moviera y metí **LVGL** (una librería gráfica muy popular en el mundo embebido). La integración usa el componente `espressif/esp_lvgl_port` recomendado oficialmente, que se encarga del reloj de LVGL, de la tarea independiente y de los bloqueos, y vuelca la imagen dibujada a la pantalla.

> **LVGL** es una librería gráfica embebida open source que se encarga de dibujar elementos de UI como botones, barras de progreso y animaciones. En este proyecto la usas para construir el velocímetro y el dashboard en vez de escribir tú mismo el código de dibujo línea a línea.

La integración en sí no es larga; el núcleo es crear el panel RGB (en el ejemplo del speedometer hay una línea más que en el helloworld, `.num_fbs = 2`, que es justo el doble framebuffer que después evita el tearing) y entregárselo a `esp_lvgl_port`:

```c
const lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
lvgl_port_init(&lvgl_cfg);

const lvgl_port_display_cfg_t disp_cfg = {
    .panel_handle  = panel,
    .buffer_size   = LCD_H_RES * LCD_V_RES, /* Pantalla completa: requisito duro del direct mode */
    .hres          = LCD_H_RES, .vres = LCD_V_RES,
    .color_format  = LV_COLOR_FORMAT_RGB565,
    .flags = {
        .direct_mode = true,   /* Dibujar directo en el framebuffer del panel, ahorra una copia */
        .buff_dma    = false,
        .buff_spiram = true,   /* Buffer de dibujo en PSRAM (← Trampa 1: antes hay que abrir SPIRAM_USE_MALLOC)*/
        .swap_bytes  = false,  /* Panel RGB paralelo, sin intercambio de bytes */
    },
};
const lvgl_port_display_rgb_cfg_t rgb_cfg = {
    .flags = {
        .bb_mode       = true,  /* Con bounce buffer -> sincronizar por on_bounce_frame_finish */
        .avoid_tearing = true,  /* Cambiar fb en el borde de frame -> evita tearing (ver final del capítulo)*/
    },
};
lvgl_port_add_disp_rgb(&disp_cfg, &rgb_cfg);

/* Cualquier llamada lv_* necesita antes coger este candado, para no chocar con la tarea de render de esp_lvgl_port.*/
lvgl_port_lock(0);
dashboard_create();   /* Crear el velocímetro + arrancar la animación del aguja */
lvgl_port_unlock();
```

Los tres flags son la esencia de este bloque: `direct_mode` deja que LVGL dibuje directamente en el framebuffer del panel (una copia entera de pantalla menos); `avoid_tearing` hace que los dos fb se intercambien en el borde de frame (evita tearing); `buff_spiram` mueve el buffer de dibujo a PSRAM — este, que parece inofensivo, es justo el que dispara la trampa gorda de abajo.

### 5.1 Trampa 1 (la más escondida): pantalla blanca + reinicio por watchdog

Tras integrarlo y grabarlo, la pantalla primero se queda negra un par de segundos, después se vuelve **completamente blanca** y ya no se mueve. El síntoma es **idéntico** al de la pantalla blanca por PCLK demasiado alto, y casi me lanzo otra vez a ajustar timings.

**Menos mal que esta vez abrí primero el puerto serie para ver el log de arranque**; ahí mismo apareció la línea clave:

```
E task_wdt: CPU 0: taskLVGL
```

La tarea de LVGL disparó el watchdog y el sistema la marcó como colgada. **Es un cuelgue de software, no un problema de señal.** Siguiendo la pila de llamadas, vi que cuando LVGL dibuja la pantalla entera por primera vez necesita pedir transitoriamente un buffer de dibujo de nivel MB; pero por defecto LVGL usa **su propio pool interno, que solo tiene 64KB** — 1MB no cabe en 64KB, así que se pelea una y otra vez, no termina de dibujar, la tarea se cuelga y el watchdog se enfada.

Lo curioso es: si ya había puesto el buffer de display en PSRAM, ¿cómo es que sigue diciendo que no hay memoria? Porque el **buffer de display** (para "refrescar la pantalla") y el **pool de memoria interno de LVGL** (para "calcular la imagen") son dos cosas distintas; no los mezcles. La solución son dos interruptores:

```
CONFIG_LV_USE_CLIB_MALLOC=y    # Que LVGL use el malloc del sistema, no el pool de 64KB
CONFIG_SPIRAM_USE_MALLOC=y     # Que el malloc del sistema pueda sacar bloques grandes de PSRAM
```

> **Aquí hay además una distinción critical: aunque el síntoma sea "pantalla blanca", hay al menos dos causas totalmente distintas.** Una es un problema de señal RGB / ancho de banda (la del PCLK de antes); otra es un cuelgue de software que no llega a dibujar la imagen (esta). **Distínguelas mirando siempre el log del puerto serie**; no te pongas a ajustar timings nada más ver una pantalla blanca.

### 5.2 Trampas 2 y 3: versión de componentes y macros de IDF que no cuadran

- **Trampa 2 (versiones de componentes emparejadas)**: `esp_lvgl_port` 2.8 usa internamente constantes de color añadidas en LVGL 9.3. Fijar la versión de LVGL a `~9.2` da un error `RGB565_SWAPPED undeclared`; cambiarlo a `^9.3` lo resuelve.
- **Trampa 3 (macros de IDF que no cuadran)**: la versión nueva de `esp_lvgl_port` comprueba la macro `SOC_LCDCAM_RGB_LCD_SUPPORTED`, pero **en IDF 5.3 se le cambió el nombre**; en 5.2.7 sigue siendo el antiguo y en tiempo de ejecución reporta "This target does not support RGB". La solución es añadir, antes de `project()` en el CMakeLists de nivel superior, una línea `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)`.

### 5.3 "Poca fluidez" y "tearing": ninguno de los dos es que el cálculo vaya lento

Cuando el velocímetro corre, aparecen dos problemas nuevos: el aguja se mueve **poco fluido** y además se produce **tearing** (una línea horizontal desfasada a media pantalla). Ambos **no tienen nada que ver con lo rápido que calcule**.

**Primero, lo de la fluidez.** Primero calculé la tasa de refresco física de esta pantalla: PCLK 16MHz ÷ número total de píxeles por frame ≈ **20Hz**. Es decir, esta pantalla como mucho puede redibujar la imagen 20 veces por segundo; por muy rápido que sea el software, es un techo duro. Así que "ser fluido o no" no es un problema de framerate, es un problema de **curva de animación**. Que el aguja barre a velocidad constante hasta el tope y al instante invierte dirección queda muy brusco; cambiando a `ease-in-out` (desacelerar en los extremos, acelerar en el medio), el giro se vuelve natural.

```c
/* Velocímetro de 270°: modo ROUND_INNER, arranca en 135°, deja un hueco de 90° abajo.*/
lv_obj_t *scale = lv_scale_create(scr);
lv_obj_set_size(scale, 460, 460);
lv_scale_set_mode(scale, LV_SCALE_MODE_ROUND_INNER);
lv_scale_set_range(scale, 0, 120);
lv_scale_set_angle_range(scale, 270);
lv_scale_set_rotation(scale, 135);          /* Ángulo inicial, decide hacia dónde mira el hueco */
lv_scale_set_total_tick_count(scale, 25);   /* Una marca cada 5 km/h */
lv_scale_set_major_tick_every(scale, 4);    /* Una marca mayor cada 4 -> 0,20,...,120 */

/* La animación llama a esto en cada frame: apuntar el aguja a v. La lectura numérica solo se refresca cuando cambia el entero.*/
static void gauge_set_value(void *var, int32_t v) {
    gauge_ctx_t *g = (gauge_ctx_t *)var;
    lv_scale_set_line_needle_value(g->scale, g->needle, 150, v);  /* Aguja, 150px de largo */
    int vi = (int)v;
    if (vi != g->last_int) {                 /* Si el entero no cambia, no toques el label, ahorras redibujar */
        g->last_int = vi;
        lv_snprintf(s_value_buf, sizeof(s_value_buf), "%03d", vi);
        lv_label_set_text(g->value_label, s_value_buf);
    }
}

/* 0 -> 120 -> 0, en bucle infinito. Que sea fluido o no depende de la última línea.*/
lv_anim_t a;
lv_anim_init(&a);
lv_anim_set_var(&a, &s_ctx);
lv_anim_set_exec_cb(&a, gauge_set_value);
lv_anim_set_values(&a, 0, 120);
lv_anim_set_duration(&a, 2500);                       /* Tramo de ida 2.5s */
lv_anim_set_playback_duration(&a, 2500);              /* Vuelta: 0->120->0 */
lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out);    /* ← Desacelerar en los extremos, así el giro no es brusco */
lv_anim_set_repeat_count(&a, LV_ANIM_REPEAT_INFINITE);
lv_anim_start(&a);
```

La clave es justo `lv_anim_set_path_cb(&a, lv_anim_path_ease_in_out)`. El `playback_duration` hace que la animación al llegar a 120 retroceda automáticamente hasta 0; en el instante de revertir, la velocidad invertiría bruscamente; con `ease-in-out` primero se desacelera hasta 0 y luego acelera en sentido contrario, de modo que el cambio de dirección es casi imperceptible a la vista.

**Ahora el tearing.** La causa es que solo se había preparado un buffer de imagen; la DMA no para de sacarlo mientras LVGL escribe el nuevo al mismo tiempo, sin sincronización, y termina sacando un frame "mitad nuevo, mitad viejo". La solución es **doble buffer + cambio por sincronismo vertical**: dos imágenes, y la DMA vuelca siempre la que está completa. **Ojo: en esta pantalla hay que mantener obligatoriamente un buffer pequeño llamado bounce buffer** (evita la pantalla blanca por no dar abasto a 16MHz), así que es "doble buffer + bounce usados juntos"; no puedes seguir el ejemplo oficial y desactivar el bounce.

> En esta pantalla, **la "fluidez" la da la curva de easing y el "no tearing" el doble buffer**; nada que ver con lo rápido que se calcule.

---

## 6. Tercer paso: convertirlo en un dashboard de telemetría vehicular

> 📦 **Código completo de este capítulo**: [03 VehicleTelemetry](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry) — cambiar el velocímetro por un panel de telemetría vehicular de cinco tarjetas con diseño.

Para terminar, cambié el velocímetro por un **panel de telemetría vehicular** como debía ser: cinco datos — RPM, acelerador, temperatura del agua, velocidad y voltaje —, cada tarjeta con número grande, barra de progreso, escalas min/max, y encima en rojo si se sobrecarga. Los datos son simulados aleatorios, pero el movimiento tiene que verse natural.

### 6.1 Cómo se construye una tarjeta

Cada tarjeta es un **contenedor `lv_obj` al que se le ha quitado el estilo por defecto**, con etiqueta, unidad, número grande, barra de progreso y escalas min/max dentro. Todas las coordenadas van escritas fijas, apoyándose en bordes de 1px + colores sólidos para separar capas (sin sombras). El núcleo se ve así (versión completa en `make_card` de `lvgl_dashboard.c`):

```c
static void make_card(lv_obj_t *parent, int i) {
    const metric_cfg_t *c = &CFG[i];      /* Geometría/rango/umbral de peligro/colores están todos en la tabla de configuración */
    metric_t *m = &s_m[i];
    m->accent = lv_color_hex(c->accent_hex);

    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_remove_style_all(card);                       /* Quitar estilo por defecto, lo ponemos todo nosotros */
    lv_obj_set_pos(card, c->x, c->y);                    /* Coordenadas fijas, sin flex automático */
    lv_obj_set_size(card, c->w, c->h);
    lv_obj_set_style_bg_color(card, COL_CARD, 0);
    lv_obj_set_style_radius(card, 18, 0);
    lv_obj_set_style_border_color(card, COL_BORDER, 0);  /* Borde de 1px para separar, sin sombra */
    lv_obj_set_style_border_width(card, 1, 0);

    lv_obj_t *lab = lv_label_create(card);
    lv_label_set_text(lab, c->label);
    lv_obj_align(lab, LV_ALIGN_TOP_LEFT, 0, 0);          /* Etiqueta arriba a la izquierda; la unidad igual pero a la derecha */

    lv_obj_t *val = lv_label_create(card);
    lv_obj_set_style_text_font(val, &lv_font_montserrat_48, 0);  /* Número grande */
    lv_obj_align(val, LV_ALIGN_TOP_LEFT, 0, c->value_y);
    m->value = val;

    /* Barra de progreso: el trough y el indicator se colorean por separado; en peligro, el indicator pasa a rojo.*/
    lv_obj_t *bar = lv_bar_create(card);
    lv_obj_remove_style_all(bar);
    lv_bar_set_range(bar, c->min, c->max);
    lv_obj_set_size(bar, c->w - 2 * c->pad, c->big ? 14 : 10);
    lv_obj_align(bar, LV_ALIGN_BOTTOM_LEFT, 0, -24);
    lv_obj_set_style_bg_color(bar, COL_BAR_BG, 0);                /* trough */
    lv_obj_set_style_bg_color(bar, m->accent, LV_PART_INDICATOR); /* indicator */
    m->bar = bar;
}
```

### 6.2 Para que los números estén "vivos": acercamiento con easing, no velocidad constante

Lo más intuitivo es "dar un valor nuevo al azar y que la visualización lo persiga a velocidad constante". Pero persiguiendo en línea recta, la velocidad cae a cero justo al llegar al objetivo y se ve muy mecánico. Yo uso un **acercamiento con easing**: cada dato guarda un valor mostrado actual `current` y un objetivo `target`; en cada refresco se acerca a 1/6 de la diferencia (decaimiento exponencial, cuanto más cerca más despacio). Cada ~1.2 segundos además se genera un nuevo objetivo haciendo un random walk cerca del valor actual, no saltando a lo loco por todo el rango, para que parezcan datos de un coche real:

```c
/* Cada 30 ticks (~1.2s) cambia el objetivo: random walk cerca del valor actual, amplitud = 1/3 del rango.*/
if (tick % 30 == 0) {
    int span = (m->max - m->min) / 3;
    m->target = clampi(m->current + rnd_range(-span, span), m->min, m->max);
}
/* Acercamiento con easing: persigue 1/6 de la diferencia; si es muy pequeño, lo absorbe de golpe para no quedarse a un pelo.*/
int diff = m->target - m->current;
if (diff > -6 && diff < 6) m->current = m->target;
else                       m->current += diff / 6;   /* ← Justo esta línea es el decaimiento exponencial */

/* La barra de progreso se actualiza en cada frame (es lo visual "vivo"). En peligro, el indicator se pone rojo.*/
bool danger = in_danger(m);   /* RPM>=6800 / agua>=105 / voltaje<=10.8 o >=14.6 */
lv_bar_set_value(m->bar, m->current, LV_ANIM_OFF);
lv_obj_set_style_bg_color(m->bar, danger ? COL_DANGER : m->accent, LV_PART_INDICATOR);
```

Es la misma idea que el `ease-in-out` del aguja — desacelerar en los puntos de transición. El chequeo de `danger` hace que la barra se ponga roja al sobrecargarse; de ahí viene el efecto de "se pone rojo en sobrecarga" del panel.

### 6.3 Una pequeña optimización de paso: si no ha cambiado, no redibujes

Se refresca cada 40 ms, pero muchas veces dos cálculos consecutivos salen con el mismo entero (sobre todo cerca del objetivo, que prácticamente se para). Cada llamada a `lv_label_set_text` copia la cadena y marca para redibujar; todo trabajo en vano. Así que añade una línea: **solo actualiza si el texto mostrado realmente ha cambiado**:

```c
/* Lectura numérica: solo set_text si la cadena formateada realmente ha cambiado.*/
char buf[12];
fmt_scaled(m->current, m->scale, buf, sizeof(buf));
if (strcmp(buf, m->last_text) != 0) {
    strcpy(m->last_text, buf);             /* Lo guardo, para comparar la próxima vez */
    lv_label_set_text(m->value, buf);      /* strdup + marcar redibujado, solo ocurre cuando de verdad cambia */
}
lv_obj_set_style_text_color(m->value, danger ? COL_DANGER : COL_VALUE, 0);
```

### 6.4 Algunas concesiones de UI embebida

En una pantalla pequeña de resolución fija, **escribir las coordenadas fijas** sale más barato y más predecible que un layout automático con flex; las tarjetas **no llevan sombra** (las sombras de LVGL a 20Hz de refresco son un poco caras), los bordes y los colores sólidos bastan para separar capas; el decimal del voltaje se maneja con un escalado entero del tipo "guardar 142 para representar 14.2", ahorrando un montón de coma flotante. Esta práctica del escalado entero mete geometría/rango/umbral de peligro/colores/scale de cada métrica en una tabla de configuración:

```c
/* Tabla de configuración, una fila por métrica. Coordenadas/rango/umbral de peligro/colores/scale están todos aquí, fáciles de ajustar de forma uniforme.*/
static const metric_cfg_t CFG[] = {
    /* label      unit    x   y    w   h  pad v_y  min  max  dHi  dLo init accent   sc big */
    { "ENGINE",  "RPM",  24, 84, 478,242, 28, 78,    0,8000,6800,  0, 850,0xFF5A3C, 1, 1 },
    { "BATTERY", "V",   688,346, 312,230, 24, 64,  100, 150, 146,108, 124,0xB08CFF,10, 0 },
    /*                                                                  ↑ scale=10: 124 representa 12.4V */
    /* ...las otras tres filas igual */
};

/* Al mostrar se divide de vuelta: 124 -> "12.4". Todo enteros, sin coma flotante.*/
static void fmt_scaled(int32_t v, int32_t scale, char *buf, size_t n) {
    if (scale == 10) lv_snprintf(buf, n, "%d.%d", (int)(v / 10), (int)(v % 10));
    else             lv_snprintf(buf, n, "%d", (int)v);
}
```

Los que tienen `scale=10` guardan x10, los de `scale=1` guardan el valor a pelo; el easing, el chequeo de peligro y la barra de progreso corren todos sobre esos enteros, y solo en el último instante de formatear la cadena se "traduce" a la versión con decimal.

---

## 7. Resolución de problemas frecuentes (no te asustes, los problemas son de estos tipos)

> No te asustes: el 90% de los problemas vienen de estos sitios. Ante un síntoma raro **mira primero el log del puerto serie y calcula primero los parámetros físicos**; no te lanzques a cambiar código.

**Sobre esta pantalla**

- El ejemplo/documentación oficial trae por defecto 800×480; **aplicado tal cual a la 5B sale fondo negro + franja blanca a la derecha**. La 5B es **1024×600, ST7262, RGB directo puro**, sin inicialización por SPI.
- El backlight va por EXIO2 del **CH422G**, no es un GPIO normal ni es PWM (**solo on/off, no dimmable**).
- El chip táctil GT911 (dirección I²C 0x5D) comparte bus I²C con el RTC y el CH422G; ojo con la planificación de direcciones. Esta serie de ejemplos **todavía no integra el táctil**, queda pendiente.

**Entorno de compilación (Windows)**

- **No ejecutes `idf.py` dentro de Git Bash**; nada más detectar `MSYSTEM` se niega. Usa PowerShell + el profile de EIM, y antes de invocarlo haz `unset MSYSTEM` (o `$env:MSYSTEM=$null`).
- Si el puerto está ocupado y reporta "port is busy", lo más probable es que un monitor anterior no se haya matado bien; confirma que no quede residual y vuelve a flashear.
- ¿Modificaste `sdkconfig.defaults` y no se aplica? IDF no vuelve a mezclar defaults en un `sdkconfig` ya existente; **borra el sdkconfig para que regenere desde defaults**.

**Encender la pantalla**

- **No copies los 21MHz que define la placa para el PCLK; cuando uses framebuffer en PSRAM empieza por 16MHz**, y si sigue blanca prueba a bajar a 12MHz.
- No configure mal la PSRAM: la N16R8 es **octal** (`SPIRAM_MODE_OCT`), no quad.
- Tras crear el panel, **no olvides añadir una línea `esp_lcd_panel_init()`**.
- Ten en cuenta que GPIO0 es un pin strapping (debe estar alto en el instante de arranque); después del arranque usarlo como pin de dato RGB no da problema, pero no le conectes circuitos que lo bajen durante el encendido.
- Para el sesgo de color, distingue primero los dos tipos: **blanco que se vuelve cian = orden de pines**; **blanco que se vuelve rosa = valor del canal verde en RGB565** (el verde es 6 bits 0–63; el blanco puro se escribe `31,63,31`).

**Correr LVGL**

- **Casi seguro que hay que abrir `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`**; si no, el pool interno de 64KB de LVGL no cabe el dibujado de pantalla entera y el síntoma es pantalla blanca + reinicio por watchdog.
- Las versiones de los componentes tienen que ser de la misma generación: `esp_lvgl_port` 2.8 con LVGL `^9.3`.
- Con IDF 5.2 y componentes nuevos, añade `SOC_LCDCAM_RGB_LCD_SUPPORTED=1` al CMakeLists de nivel superior.
- **LVGL / esp_lvgl_port cambia nombres de API entre versiones**; no escribas de memoria, ve a leer los headers reales que te hayas bajado.

**Fluidez y tearing**

- Calcula primero la tasa de refresco física del panel (esta es de unos 20Hz); por debajo de ella, casi todas las optimizaciones son un problema de diseño de la animación.
- Para la fluidez, primera opción `ease-in-out`; no te lances a subir el framerate.
- Tearing = buffer único + sin sincronismo; la solución es doble framebuffer + `avoid_tearing`, **y manteniendo el bounce buffer**.

---

## 8. FAQ

**P: ¿Cuál es la resolución real de la Waveshare ESP32-S3-Touch-LCD-5B? ¿800×480 o 1024×600?**
R: La 5B es **1024×600**. La documentación oficial de Waveshare etiqueta toda la serie de 5 pulgadas de forma vaga como "800×480 o 1024×600" y no detalla la 5B en concreto. Método de verificación: graba una señal de 800×480 y la pantalla quedará con fondo negro + franja blanca a la derecha, lo que indica que el panel es más ancho que la señal, o sea, 1024×600. No apliques tal cual el 800×480 del ejemplo oficial.

**P: ¿Por qué la pantalla se queda completamente blanca?**
R: Primero mira el log del puerto serie y distingue dos tipos de pantalla blanca. ① Sin error de watchdog → lo más probable es que la señal RGB no se está sirviendo; el PCLK copiado de 21MHz es demasiado alto; bájalo a 16MHz. ② El puerto serie muestra `task_wdt: taskLVGL` → es un cuelgue por pool de memoria de LVGL demasiado pequeño; abre `LV_USE_CLIB_MALLOC` + `SPIRAM_USE_MALLOC`.

**P: ¿Se puede ajustar el brillo del backlight? ¿Por qué no encuentro un pin PWM?**
R: No. El backlight está colgado del EXIO2 del expansor de IO CH422G; solo tiene dos estados, on/off, no es PWM. Para hacerlo dimmable habría que modificar el hardware (añadir un boost/buck ajustable); a nivel de software no se puede.

**P: ¿Cuál es la tasa de refresco de esta pantalla? ¿Por qué el aguja se mueve a tirones?**
R: Aproximadamente **20Hz** (PCLK 16MHz ÷ número total de píxeles por frame). Es un techo físico; por muy rápido que sea el software, no se supera. Los tirones casi nunca son un problema de framerate, sino que la curva de animación es demasiado rígida — cambia la animación del aguja de lineal a `ease-in-out` y la desaceleración natural en los extremos lo dejará fluido al instante.

**P: ¿Se puede encender desde Arduino IDE? ¿Por qué usar ESP-IDF?**
R: Teóricamente sí (Arduino-ESP32 por debajo también es ESP-IDF), pero la combinación RGB directo + framebuffer en PSRAM + LVGL hace que ajustar el sdkconfig en Arduino sea bastante torpe; interruptores como PCLK, modo PSRAM o pool de memoria se controlan mucho mejor en ESP-IDF. Este tutorial se basa en ESP-IDF.

**P: Grave LVGL y aparece pantalla blanca + reinicio por watchdog, ¿qué hago?**
R: El 80% de las veces es que el pool interno de 64KB de LVGL no cabe el dibujado de pantalla entera. Abre dos opciones en sdkconfig: `CONFIG_LV_USE_CLIB_MALLOC=y` (que LVGL use el malloc del sistema) y `CONFIG_SPIRAM_USE_MALLOC=y` (que el malloc pueda sacar bloques grandes de PSRAM). En ESP32-S3 + PSRAM + pantalla grande es casi obligatorio.

**P: ¿PSRAM se configura como quad o como octal? ¿Qué pasa si me equivoco?**
R: La N16R8 es **octal** (`SPIRAM_MODE_OCT`). Si la configuras como quad, el ancho de banda no da; el síntoma es que en cuanto subes un poco el PCLK aparece imagen corrupta/pantalla blanca o se vuelve inestable.

**P: Con IDF 5.2.7 me reporta "This target does not support RGB", ¿qué hago?**
R: La versión nueva de esp_lvgl_port comprueba la macro `SOC_LCDCAM_RGB_LCD_SUPPORTED`, que en IDF 5.3 cambió de nombre; en 5.2.7 sigue siendo el antiguo. Añade, antes de `project()` en el CMakeLists de nivel superior, una línea `add_compile_definitions(SOC_LCDCAM_RGB_LCD_SUPPORTED=1)`.

---

## 9. Ideas para seguir jugando

Encenderla es solo el punto de partida; esta placa se puede estirar mucho más:

- **Integrar el táctil**: el GT911 ya está en el bus I²C (GPIO8/9); añadiendo un driver puedes hacer interacción con botones.
- **Leer recursos desde la SD**: la ranura SD de placa (SPI) permite cargar imágenes, fuentes y dejar de meterlo todo en la Flash.
- **Conectar al bus CAN**: la placa lleva TJA1051; junto al driver TWAI de ESP-IDF puedes construir un verdadero escáner OBD y que los números del dashboard dejen de ser simulados.
- **Subir a RS485**: el transceptor SP3485 para conectar sensores industriales / dispositivos Modbus.
- **Añadir RTC para reloj respaldado por batería**: el PCF85063 también está en ese mismo bus I²C; puedes montar un registrador de datos con timestamps reales.

---

## 10. Referencias

**Datasheets y páginas de producto oficiales**

- [ESP32-S3 Datasheet (Espressif oficial, en inglés)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [Datasheet del módulo ESP32-S3-WROOM-1](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)
- [Página de producto ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3)
- [Wiki Waveshare ESP32-S3-Touch-LCD-5B](https://docs.waveshare.net/ESP32-S3-Touch-LCD-5/?variant=ESP32-S3-LCD-5B-touch)

**Librerías y frameworks open source**

- [Documentación oficial de ESP-IDF](https://docs.espressif.com/projects/esp-idf/) (RGB LCD Panel, configuración PSRAM, driver I²C Master)
- [espressif/esp_lvgl_port (GitHub)](https://github.com/espressif/esp_lvgl_port)
- [Documentación oficial de LVGL](https://docs.lvgl.io/) (control scale, animaciones, barra de progreso)

**Código de este proyecto**

- El código completo, la reproducción de cada trampa y la configuración final están en GitHub, con docs completos en cada directorio de ejemplo:
  - [Directorio completo del proyecto (con los tres ejemplos)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B)
  - [01 HelloWorld — encender la pantalla](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/01%20HelloWorld)
  - [02 Speedometer — velocímetro](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/02%20Speedometer)
  - [03 VehicleTelemetry — dashboard de telemetría vehicular](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/ESP32-S3-Touch-LCD-5B/03%20VehicleTelemetry)

---

## Para cerrar

Mirando hacia atrás, todo el camino en realidad tiene tres capas: **encender la pantalla → integrar LVGL → convertirlo en interfaz**. Cada capa tiene su trampa específica, pero las trampas se parecen mucho entre sí (dos tipos de pantalla blanca, dos tipos de sesgo de color), y lo que más fácil te hace trabajar en vano es confundir una trampa con otra.

Si solo pudiera dejarle una frase a quien venga detrás, probablemente sería esta — la que de verdad aprendí tras tropezar una y otra vez en estos tres ejemplos:

> **Ante un síntoma raro, mira primero el log del puerto serie y calcula primero los parámetros físicos; no te lanzques a cambiar código.** La trampa de la resolución en el ejemplo oficial, la pantalla blanca del PCLK y la pantalla blanca de la memoria de LVGL se parecen todas a "la pantalla está rota", pero una es documentación incorrecta, otra es ancho de banda de hardware y otra es software colgado; si te equivocas de dirección, te pasarás la noche en vela trabajando en vano.
