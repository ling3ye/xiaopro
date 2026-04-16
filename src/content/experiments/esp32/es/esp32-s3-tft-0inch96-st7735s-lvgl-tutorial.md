---
title: "ESP32-S3 + pantalla en color de $3 con animaciones LVGL | Guía para principiantes en 10 minutos"
boardId: esp32s3
moduleId: display/tft096-st7735s
category: esp32
date: 2026-04-10
intro: "ESP32-S3 controlando una pantalla TFT ST7735S de 0.96 pulgadas con animaciones LVGL. Desde las conexiones hasta el código completo, con guía para evitar errores comunes. Ideal para principiantes en Arduino y desarrollo embebido."
image: "https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png"
---

# ESP32-S3 + pantalla en color de $3 con animaciones LVGL! Guía para principiantes en 10 minutos (versión 2026 actualizada)

> **Resumen en una frase**: ESP32-S3 controlando una pantalla TFT ST7735S de 0.96 pulgadas + animaciones LVGL, 5 pines clave para la conexión + guía completa para evitar errores comunes

## Resultado final

![image-20260410152138611](https://img.lingflux.com/2026/04/66dc2da51796bd3a7957b9bbc0cbfced.png)

> Una pantalla de 0.96 pulgadas, más pequeña que una uña, también puede reproducir animaciones LVGL fluidas. Este artículo cubre todo desde las conexiones hasta el código, ayudándote a evitar todos los errores de antemano.



------

## Qué vas a aprender

1. Cómo el ESP32-S3 controla una pantalla TFT ST7735S de 0.96 pulgadas mediante SPI
2. Cómo configurar la librería Arduino_GFX (y por qué no usar TFT_eSPI)
3. El proceso completo para portar LVGL v9 a una pantalla pequeña
4. Un ejemplo de interfaz LVGL con doble animación (movimiento horizontal + rebote vertical)



## Lista de materiales (BOM)

| Componente                        | Cantidad | Notas                                  |
| --------------------------------- | -------- | -------------------------------------- |
| Placa de desarrollo ESP32-S3      | 1        | Cualquier variante S3 sirve            |
| Pantalla TFT IPS ST7735S 0.96 pulgadas | 1   | Resolución 80x160, interfaz SPI, 8 pines |
| Cables puente (hembra a hembra)   | Varios   | 8 cables son suficientes               |





## Especificaciones de la pantalla

![image-20260410113243742](https://img.lingflux.com/2026/04/e66957af12d082ebd30b5b8cdb06de8c.png)

> No tienes que memorizar todo. Concéntrate en los parámetros marcados con *****, que son los que necesitarás al escribir el código.

| Parámetro         | Especificación          | Notas                                                    |
| ----------------- | ----------------------- | ------------------------------------------------------- |
| Tamaño            | 0.96 pulgadas TFT IPS   | Ángulo de visión completo, buena reproducción de color   |
| Resolución        | 80(H) x 160(V)          | ***** En el código `screenWidth=160, screenHeight=80` (horizontal) |
| Chip controlador  | ST7735S                 | ***** Debe coincidir al seleccionar la librería          |
| Interfaz de comunicación | SPI de 4 hilos | Máximo 40MHz (se recomienda probar primero con la frecuencia por defecto) |
| Voltaje de trabajo | **3.3V**               | ***** ¡NUNCA conectar a 5V!                             |
| Número de pines   | 8 pines                 | Incluye pin de control de retroiluminación BLK          |



| Parámetro             | Especificación               |
| --------------------- | ---------------------------- |
| Área de visualización | 10.8(H) x 21.7(V) mm        |
| Tamaño del panel       | 19(H) x 24(V) x 2.7(D) mm   |
| Pitch de píxel         | 0.135(H) x 0.1356(V) mm     |
| Corriente de trabajo   | 20mA                         |
| Tipo de retroiluminación | 1 LED                      |
| Temperatura de trabajo | -20 ~ 70°C                  |
| Tamaño del PCB         | 30.00 x 24.04 mm            |
| Diámetro interno de agujeros de montaje | 2 mm       |
| Espaciado de pines     | 2.54 mm                      |

**Definición de la interfaz:**

| N.º | Pin | Descripción                                                     |
| --- | --- | --------------------------------------------------------------- |
| 1   | GND | Tierra                                                         |
| 2   | VCC | Alimentación positiva (3.3V)                                   |
| 3   | SCL | Señal de reloj SPI                                             |
| 4   | SDA | Señal de datos SPI                                             |
| 5   | RES | Reset (reset con nivel bajo)                                   |
| 6   | DC  | Selección registro/datos (bajo=comando, alto=datos)            |
| 7   | CS  | Chip select (activa con nivel bajo)                            |
| 8   | BLK | Control de retroiluminación (nivel alto la enciende; si no se controla, conectar a 3.3V) |





## Conexiones

| Pin ESP32-S3 | Pin ST7735S | Descripción                                        |
| ------------ | ----------- | -------------------------------------------------- |
| GND          | GND         | Tierra común                                       |
| **3.3V**     | VCC         | **Prohibido conectar a 5V**                        |
| GPIO 12      | SCL         | Reloj SPI                                          |
| GPIO 11      | SDA         | Datos SPI (MOSI)                                   |
| GPIO 21      | RES         | Reset                                              |
| GPIO 47      | DC          | Selección comando/datos                            |
| GPIO 38      | CS          | Chip select                                        |
| GPIO 48      | BLK         | Retroiluminación (si no se controla, conectar directamente a 3.3V) |



### Notas sobre las conexiones

- **Alimentación**: Solo conectar a 3.3V, conectar a 5V quemará la pantalla
- **Pin BLK de retroiluminación**: Si no necesitas controlar la retroiluminación por software, conéctalo directamente a 3.3V para que quede siempre encendida
- **CS chip select**: Activo en nivel bajo
- **RES reset**: Se necesita un pulso en nivel bajo para la inicialización al encender
- **Selección de pines**: Los pines anteriores usan los pines por defecto del SPI2 (FSPI) del ESP32-S3. Si cambias los pines, necesitas modificar las definiciones de macros en el código en consecuencia



## Instalación de librerías

Instala las siguientes dos librerías en Arduino IDE:

1. **Arduino_GFX_Library** — Busca "GFX Library for Arduino" e instálala
2. **LVGL** — Busca `lvgl` e instálala (necesitas la versión **v9.x**)

> **¿Por qué usar Arduino_GFX en vez de TFT_eSPI?**
>
> Primero, quiero aclarar que me gusta bastante TFT_eSPI, lo he usado para controlar muchas pantallas. Ambas librerías pueden controlar la pantalla ST7735S, pero la forma de configurarlas es muy diferente:
>
> **El problema con TFT_eSPI: Hay que modificar manualmente los archivos fuente de la librería**
>
> TFT_eSPI requiere que abras el archivo `User_Setup.h` en el directorio de instalación de la librería y modifiques manualmente las definiciones de pines y la selección del chip controlador. Esto significa que:
>
> 1. Tienes que encontrar la ruta de instalación de la librería (la ruta varía según el sistema: `Documents/Arduino/libraries/` o `.platformio/packages/`)
>
> 2. Buscar en un archivo de configuración de cientos de líneas la línea correcta, comentar los valores por defecto y descomentar los que quieres usar
>
> 3. Si trabajas con varios proyectos que usan pantallas diferentes, tienes que volver a modificar este archivo cada vez que cambias de proyecto
>
> 4. **Al actualizar la librería, la configuración se sobrescribe**, y tu proyecto de repente ya no compila
>
>    Esta es la queja más común: "Seguí el tutorial en vídeo pero la pantalla se queda en blanco" — casi siempre es porque `User_Setup.h` se modificó mal o no surtió efecto.
>
>    **El enfoque de Arduino_GFX: Los pines se definen directamente en tu código**
>
>    En comparación, toda la configuración de Arduino_GFX se hace en tu propio archivo `.ino`:
>
>    ```c
>    // Todos los pines y parámetros del controlador se definen directamente en el código, no hay que modificar ningún archivo de la librería
>    Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
>    Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
>    ```
>
>    - ¿Quieres cambiar pines? Cambia una línea de `#define`
>
>    - ¿Quieres cambiar de pantalla? Cambia `Arduino_ST7735` por `Arduino_ILI9341` u otro controlador
>
>    - ¿Actualizar la librería? No afecta tu código
>
>    - ¿Múltiples proyectos? Cada proyecto define lo suyo, sin interferencias
>
>      **Además, la compatibilidad de TFT_eSPI con ESP32-S3 ya presenta problemas**. En GitHub hay varios issues reportando fallos de compilación con ESP32 Arduino Core 3.x, porque ESP32 oficial de Espressif ha cambiado cosas. Arduino_GFX sigue manteniéndose activamente y tiene mejor soporte para chips nuevos.





## Entorno de desarrollo

Entorno de desarrollo usado en este ejemplo

MacOS - v15.1.1

Arduino IDE - v2.3.8

Librería de placa: esp32 (by Espressif Systems) - v3.3.7

Librería de controlador de pantalla: GFX Library for Arduino (by Moon on our nation) - v1.6.5

Librería gráfica: LVGL (by kisvegabor) - v9.5.0



## Código completo



```c
#include <Arduino_GFX_Library.h>
#include <lvgl.h>

// --- Inicialización de pines y GFX ---
#define TFT_CS 38
#define TFT_RST 21
#define TFT_DC 47
#define TFT_MOSI 11
#define TFT_SCLK 12
#define TFT_BLK 48

#define BLACK   0x0000
#define WHITE   0xFFFF
#define ROTATION 1

Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);

static const uint32_t screenWidth  = 160;
static const uint32_t screenHeight = 80;

void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  uint32_t w = lv_area_get_width(area);
  uint32_t h = lv_area_get_height(area);
  uint32_t stride = lv_draw_buf_width_to_stride(w, LV_COLOR_FORMAT_RGB565);
  uint8_t * row_ptr = px_map;
  
  for (uint32_t y = 0; y < h; y++) {
    gfx->draw16bitRGBBitmap(area->x1, area->y1 + y, (uint16_t *)row_ptr, w, 1);
    row_ptr += stride;
  }
  lv_display_flush_ready(display);
}

// ==========================================
// Definir funciones de callback de animación (para recibir los cambios de valor de las animaciones LVGL)
// ==========================================

// Callback: cambiar la coordenada X del objeto (movimiento horizontal)
static void anim_x_cb(void * var, int32_t v) {
  lv_obj_set_x((lv_obj_t *)var, v);
}

// Callback: cambiar la coordenada Y del objeto (movimiento vertical)
static void anim_y_cb(void * var, int32_t v) {
  lv_obj_set_y((lv_obj_t *)var, v);
}

void setup() {
  Serial.begin(115200);
  pinMode(TFT_BLK, OUTPUT);
  digitalWrite(TFT_BLK, HIGH);

  gfx->begin();
  gfx->fillScreen(BLACK);

  lv_init();
  lv_display_t *display = lv_display_create(screenWidth, screenHeight);
  lv_display_set_color_format(display, LV_COLOR_FORMAT_RGB565);

  static lv_color_t buf[screenWidth * screenHeight / 10];
  lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(display, my_disp_flush);

  // Establecer el fondo de la pantalla en blanco estándar
  lv_obj_set_style_bg_color(lv_scr_act(), lv_color_hex(0xFFFFFF), 0);

  // ==========================================
  // Diseño avanzado de UI: crear un contenedor transparente para agrupar elementos
  // ==========================================
  
  // 1. Crear un contenedor transparente (tamaño 100x60)
  lv_obj_t * cont = lv_obj_create(lv_scr_act());
  lv_obj_set_size(cont, 100, 60);
  lv_obj_set_style_bg_opa(cont, 0, 0);             // Fondo completamente transparente
  lv_obj_set_style_border_width(cont, 0, 0);       // Eliminar borde
  lv_obj_set_style_pad_all(cont, 0, 0);            // Eliminar espacio interno
  lv_obj_align(cont, LV_ALIGN_CENTER, 0, 0);       // Centrar el contenedor en la pantalla

  // 2. Colocar el cuadrado verde dentro del contenedor, alineado arriba al centro
  lv_obj_t *rect = lv_obj_create(cont);
  lv_obj_set_size(rect, 30, 30);
  lv_obj_set_style_bg_color(rect, lv_color_hex(0x00FF00), 0);
  lv_obj_set_style_border_width(rect, 0, 0);
  lv_obj_align(rect, LV_ALIGN_TOP_MID, 0, 0);

  // 3. Colocar el texto dentro del contenedor, alineado abajo al centro
  lv_obj_t * label = lv_label_create(cont);
  lv_label_set_text(label, "hello world!");
  lv_obj_set_style_text_color(label, lv_color_hex(0x000000), 0);
  lv_obj_align(label, LV_ALIGN_BOTTOM_MID, 0, 0);


  // ==========================================
  // Agregar doble efecto de animación (motor de animación LVGL v9)
  // ==========================================

  // Animación A: hacer que todo el contenedor (cuadrado + texto) se mueva de izquierda a derecha
  lv_anim_t a_x;
  lv_anim_init(&a_x);
  lv_anim_set_var(&a_x, cont);                       // Vincular objeto de animación: el contenedor
  lv_anim_set_values(&a_x, -30, 30);                 // Mover 30 píxeles a la izquierda desde el centro, luego 30 a la derecha
  lv_anim_set_time(&a_x, 2000);                      // Tiempo de un solo movimiento: 2000 ms (2 segundos)
  lv_anim_set_playback_time(&a_x, 2000);             // El regreso también tarda 2000 ms
  lv_anim_set_repeat_count(&a_x, LV_ANIM_REPEAT_INFINITE); // Bucle infinito
  lv_anim_set_path_cb(&a_x, lv_anim_path_ease_in_out);     // Usar curva "ease in-out", para que el movimiento pareza suave y natural
  lv_anim_set_exec_cb(&a_x, anim_x_cb);              // Vincular la función de callback del eje X definida arriba
  lv_anim_start(&a_x);                               // ¡Iniciar animación!

  // Animación B: hacer que el cuadrado verde rebote rápidamente arriba y abajo
  lv_anim_t a_y;
  lv_anim_init(&a_y);
  lv_anim_set_var(&a_y, rect);                       // Vincular objeto de animación: solo el cuadrado verde
  lv_anim_set_values(&a_y, 0, 10);                   // Desplazamiento vertical de 0 a 10 píxeles
  lv_anim_set_time(&a_y, 300);                       // Rebote rápido, 300 ms por ciclo
  lv_anim_set_playback_time(&a_y, 300);              
  lv_anim_set_repeat_count(&a_y, LV_ANIM_REPEAT_INFINITE); 
  lv_anim_set_path_cb(&a_y, lv_anim_path_ease_in_out); 
  lv_anim_set_exec_cb(&a_y, anim_y_cb);              // Vincular la función de callback del eje Y definida arriba
  lv_anim_start(&a_y);                               // ¡Iniciar animación!
}

// Registrar el tiempo de la última iteración
uint32_t last_tick = 0;
void loop() {
  // 1. Calcular cuántos milisegundos pasaron desde la última ejecución del loop
  uint32_t current_tick = millis();
  uint32_t elapsed_time = current_tick - last_tick;
  last_tick = current_tick;

  // 2. Informar a LVGL del tiempo transcurrido (¡esta es la clave absoluta para que las animaciones funcionen!)
  lv_tick_inc(elapsed_time);

  // 3. LVGL procesa las animaciones y redibuja la interfaz
  lv_timer_handler();
  
  // 4. Pequeña pausa para evitar que la CPU esté al 100%
  delay(5);
}
```





## Explicación de las líneas clave del código

> Estos son los puntos donde los principiantes se equivocan más fácilmente. Revisa tu código línea por línea:

### 1. Parámetros de offset en la inicialización de GFX



```c
Arduino_GFX *gfx = new Arduino_ST7735(bus, TFT_RST, ROTATION, false, 80, 160, 26, 1, 26, 1);
```

Los últimos 4 números `26, 1, 26, 1` corresponden a `col_offset1, row_offset1, col_offset2, row_offset2`. **Si la pantalla muestra el contenido desplazado (todo amontonado en una esquina o con bordes negros), ajusta estos 4 valores.** Los offsets varían según el fabricante del módulo ST7735S; los valores aquí son los más comunes.

### 2. Tamaño de la pantalla — ten en cuenta la orientación horizontal

```c
#define ROTATION 1  // Rotación horizontal
static const uint32_t screenWidth  = 160;  // En horizontal, el ancho pasa a 160
static const uint32_t screenHeight = 80;   // Y el alto pasa a 80
```

La pantalla física es de 80x160 (vertical). Con `ROTATION=1` se gira 90 grados y queda en 160x80. **El tamaño del display de LVGL debe coincidir con la orientación después de la rotación**, de lo contrario la imagen se verá mal.

### 3. Callback flush — el puente entre LVGL y GFX

```c
void my_disp_flush(lv_display_t *display, const lv_area_t *area, uint8_t *px_map) {
  ...
  lv_display_flush_ready(display);  // ¡Esta línea no se puede omitir!
}
```

`lv_display_flush_ready()` le dice a LVGL "ya terminé de dibujar esta área, puedes darme la siguiente". **Si omites esta línea = la pantalla nunca se actualiza.**

### 4. Alimentación de tiempo en el loop

```c
lv_tick_inc(elapsed_time);
lv_timer_handler();
```

Estas dos líneas son el "corazón" de las animaciones LVGL. `lv_tick_inc` alimenta el tiempo, `lv_timer_handler` desencadena el redibujado de la interfaz. **Si falta cualquiera de las dos, las animaciones no se moverán.**





## Solución de problemas comunes

| Síntoma                                               | Posible causa                                                     | Solución                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| **Pantalla en blanco (retroiluminación encendida pero sin contenido)** | Callback flush no vinculado correctamente, o falta `lv_display_flush_ready()` | Verifica que `my_disp_flush` esté configurada correctamente como flush_cb |
| **Pantalla con artefactos / bloques de color aleatorios** | Pines SPI mal conectados o contacto deficiente                    | Revisa las conexiones, asegúrate de que los cables puente estén bien insertados |
| **Imagen desplazada / con bordes negros**              | Parámetros de offset del ST7735S no coinciden                     | Ajusta los parámetros `col_offset` y `row_offset` en el constructor de `Arduino_ST7735` |
| **Colores invertidos (azul se ve rojo, etc.)**         | Configuración RGB/BGR incorrecta                                  | Verifica el parámetro de orden de color en la inicialización de GFX |
| **Imagen invertida arriba/abajo**                      | Parámetro de rotación incorrecto                                  | Prueba cambiar `ROTATION` a 0 o 3                           |
| **Error de compilación: no encuentra lvgl.h**          | Librería LVGL no instalada o versión incorrecta                   | Asegúrate de instalar **LVGL v9.x** (no v8)                 |
| **Las animaciones no se mueven, la interfaz es estática** | Falta `lv_tick_inc()` o `lv_timer_handler()` en el loop           | Asegúrate de que ambas líneas estén presentes               |
