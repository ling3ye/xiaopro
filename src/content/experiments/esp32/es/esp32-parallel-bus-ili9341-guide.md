---
title: "Controlar una pantalla ILI9341 con ESP32 mediante bus paralelo de 8 bits"
boardId: esp32
moduleId: display/tft204-ili9341
category: esp32
date: 2026-02-27
intro: "Guia detallada sobre como usar un ESP32 para controlar una pantalla ILI9341 mediante bus paralelo de 8 bits. Comparado con el bus SPI serie, el modo paralelo ofrece una tasa de refresco muy superior, ideal para mostrar imagenes en movimiento."
image: "https://img.lingflux.com/2026/04/09744a0e9009ab9ac1938e81cf1e6ac4.png"
---

En este articulo te explico en detalle como usar un **ESP32** para controlar una pantalla **ILI9341** mediante un **bus paralelo de 8 bits (8-bit Parallel)**. Comparado con el clasico bus SPI serie, el modo paralelo ofrece una tasa de refresco muy alta, lo que lo hace perfecto para mostrar animaciones o contenido dinamico.

## Entorno de desarrollo

OS: MacOS

Arduino IDE Version: 2.3.7

esp32 Version:  3.3.5

TFT_eSPI Version: 2.5.43




## BOM

ESP32 x1

Pantalla TFT de 2.4 pulgadas x1

Cables Dupont xN



## Conexion de pines

| Pin de la TFT    | **Pin ESP32** | **Descripcion**                                      |
| ---------------- | ------------- | ---------------------------------------------------- |
| **VCC (3V3/5V)** | **3V3 / VIN** | Alimentacion de la pantalla (recomiendo probar primero con 3.3V) |
| **GND**          | **GND**       | Tierra comun                                         |
| **LCD_D0**       | **GPIO 26**   | Bit de datos 0                                       |
| **LCD_D1**       | **GPIO 25**   | Bit de datos 1                                       |
| **LCD_D2**       | **GPIO 19**   | Bit de datos 2                                       |
| **LCD_D3**       | **GPIO 18**   | Bit de datos 3                                       |
| **LCD_D4**       | **GPIO 5**    | Bit de datos 4                                       |
| **LCD_D5**       | **GPIO 21**   | Bit de datos 5                                       |
| **LCD_D6**       | **GPIO 22**   | Bit de datos 6                                       |
| **LCD_D7**       | **GPIO 23**   | Bit de datos 7                                       |
| **LCD_CS**       | **GPIO 32**   | Chip Select                                          |
| **LCD_RTS**      | **GPIO 33**   | Reset                                                |
| **LCD_RS (DC)**  | **GPIO 14**   | Seleccion dato/comando (Register Select)             |
| **LCD_WR**       | **GPIO 27**   | Habilitacion de escritura (Write Control)            |
| **LCD_RD**       | **GPIO 2**    | Habilitacion de lectura (si no necesitas leer el ID, puedes conectarlo a 3.3V) |




## Librerias necesarias

### Arduino IDE Boards Manager: esp32

Tienes que instalar la libreria esp32 de Espressif Systems. Aqui instalamos la ultima version disponible.

### Arduino IDE Library Manager: TFT_eSPI

Tienes que instalar la libreria TFT_eSPI



##  Configurar el archivo 「User_Setup.h」 de TFT_eSPI

TFT_eSPI es la herramienta estrella del ESP32 para controlar pantallas, pero toda la configuracion de pines, placas y pantallas se define en el archivo User_Setup.h, asi que es muy importante modificarlo correctamente.

El archivo esta en:

Documents > Arduino > libraries > TFT_eSPI > User_Setup.h

**Paso:** Abre el archivo, borra todo su contenido, copia el siguiente codigo y guardalo:

```c++
// =========================================================================
//   User_Setup.h - Display driver configuration file for TFT_eSPI library
//   User_Setup.h - Archivo de configuracion del driver de pantalla para la libreria TFT_eSPI
//
//   Hardware: ESP32 (No PSRAM or not using GPIO 16/17)
//   Hardware: ESP32 (sin PSRAM o sin usar GPIO 16/17)
//
//   Driver: ILI9341 (8-bit parallel mode)
//   Driver: ILI9341 (modo paralelo de 8 bits)
// =========================================================================

// -------------------------------------------------------------------------
// 1. Driver Type Definition
//    Definicion del tipo de driver
// -------------------------------------------------------------------------
#define ILI9341_DRIVER       // Generic ILI9341 Driver (Driver generico ILI9341)

// -------------------------------------------------------------------------
// 2. Color Order Definition
//    Definicion del orden de colores
// -------------------------------------------------------------------------
// If colors are inverted (e.g., red becomes blue), change this.
// Si los colores estan invertidos (por ejemplo, el rojo se ve azul), cambia esto.
#define TFT_RGB_ORDER TFT_BGR  // La mayoria de las pantallas ILI9341 usan orden BGR
// #define TFT_RGB_ORDER TFT_RGB

// -------------------------------------------------------------------------
// 3. Screen Resolution
//    Resolucion de la pantalla
// -------------------------------------------------------------------------
#define TFT_WIDTH  240
#define TFT_HEIGHT 320

// -------------------------------------------------------------------------
// 4. Interface Configuration (Critical)
//    Configuracion de la interfaz (parte critica)
// -------------------------------------------------------------------------
#define ESP32_PARALLEL       // Enable ESP32 parallel mode (Habilitar modo paralelo del ESP32)
#define TFT_PARALLEL_8_BIT   // Use 8-bit parallel bus (Usar bus paralelo de 8 bits)

// -------------------------------------------------------------------------
// 5. Pin Definitions
//    Definicion de pines
// -------------------------------------------------------------------------

// --- Control Pins (Pines de control) ---
// Optimization: CS/RST moved to GPIO 32+, keeping low GPIOs for data bus and WR.
// Optimizacion: CS/RST movidos a GPIO 32+, dejando los GPIO bajos para el bus de datos y WR.

#define TFT_CS   32  // Chip Select
#define TFT_RST  33  // Reset

// Data/Command selection - Must be in GPIO 0-31 (or RS)
// Seleccion dato/comando - Debe estar en GPIO 0-31 (tambien llamado RS)
#define TFT_DC   14

// Write signal - ★ Critical pin, must be in GPIO 0-31 and keep connections short
// Senal de escritura - ★Pin critico, debe estar en GPIO 0-31 y con conexiones cortas
#define TFT_WR   27

// Read signal - If not reading screen data, can connect to 3.3V, but must be defined in library
// Senal de lectura - Si no lees datos de la pantalla, puedes conectar a 3.3V, pero debe definirse en la libreria
#define TFT_RD    2

// --- Data Bus Pins D0 - D7 (Pines del bus de datos) ---
// Must be within GPIO 0-31 range.
// Deben estar dentro del rango GPIO 0-31.
// Avoided GPIO 16, 17 (PSRAM/Flash) and 12 (Strap).
// Se evitaron GPIO 16, 17 (PSRAM/Flash) y 12 (Strap).

#define TFT_D0   26
#define TFT_D1   25
#define TFT_D2   19
#define TFT_D3   18
#define TFT_D4    5  // Note: GPIO 5 is a Strap pin, ensure screen does not pull it high during power-up
                     // Nota: GPIO 5 es un pin Strap, asegurate de que la pantalla no lo ponga en alto durante el encendido
#define TFT_D5   21
#define TFT_D6   22
#define TFT_D7   23

// -------------------------------------------------------------------------
// 6. Backlight Control (Optional)
//    Control de retroiluminacion (opcional)
// -------------------------------------------------------------------------
// If your screen has a BLK or LED pin, connect it to an ESP32 pin and define it here.
// Si tu pantalla tiene un pin BLK o LED, conectalo a un pin del ESP32 y definelop aqui.
// #define TFT_BL   4            // Example: Connected to GPIO 4 (Ejemplo: conectado a GPIO 4)
// #define TFT_BACKLIGHT_ON HIGH // High logic level turns on backlight (La retroiluminacion se enciende con nivel logico alto)

// -------------------------------------------------------------------------
// 7. Font Loading
//    Carga de fuentes
// -------------------------------------------------------------------------
// Enable as needed; enabling more fonts consumes more Flash memory.
// Activa segun necesites; cuantas mas fuentes actives, mas Flash ocupas.

#define LOAD_GLCD   // Font 1. Original Glcd font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts. Include access to the 48 Adafruit_GFX free fonts FF1 to FF48

#define SMOOTH_FONT // Enable smooth font loading (Habilitar carga de fuentes suavizadas)

// -------------------------------------------------------------------------
// 8. Other Settings
//    Otras configuraciones
// -------------------------------------------------------------------------
// In parallel mode, SPI frequency is usually ignored as speed is determined by CPU register write speed.
// Kept here for compatibility.
// En modo paralelo, la frecuencia SPI normalmente se ignora porque la velocidad la determina la escritura de registros del CPU.
// Se mantiene por compatibilidad.
#define SPI_FREQUENCY       27000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY  2500000

// --- Touch Screen Settings (Configuracion de pantalla tactil) ---
// If you use XPT2046 touch function.
// Parallel screens usually have a separate SPI interface for touch (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).
// Si usas la funcion tactil XPT2046.
// Las pantallas paralelas suelen tener una interfaz SPI independiente para el tactil (T_CLK, T_CS, T_DIN, T_DO, T_IRQ).

// If using touch, uncomment below and set pins (can use VSPI default pins).
// Si usas tactil, descomenta lo siguiente y configura los pines (puedes usar los pines por defecto de VSPI).

// #define TOUCH_CS 22
// WARNING: You used TFT_D6 on GPIO 22 above. If using touch, find another pin or use SoftSPI.
// AVISO: Arriba usaste TFT_D6 en GPIO 22. Si quieres usar tactil, busca otro pin o usa SoftSPI.
```



## Abrir el programa de ejemplo

Abre el programa de ejemplo desde esta ruta. Este programa sirve para hacer pruebas:

Arduino IDE: File -> Examples -> TFT_eSPI -> 320 x 240 -> TFT_graphicstest_one_lib



## Subir el programa y solucionar errores de compilacion

Si tu libreria de la placa ESP32 esta actualizada a la **version 3.0.0 o superior**, es casi seguro que al compilar TFT_eSPI te encuentres con este error:

```tex
In file included from /Users/shawn/Documents/Arduino/libraries/TFT_eSPI/TFT_eSPI.cpp:24:

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c: In member function 'uint8_t TFT_eSPI::readByte()':

/Users/shawn/Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c:113:9: error: 'gpio_input_get' was not declared in this scope; did you mean 'gpio_num_t'?
113 |   reg = gpio_input_get(); // Read three times to allow for bus access time
|         ^~~~~~~~~~~~~~
|         gpio_num_t
exit status 1

Compilation error: exit status 1
```



`error: 'gpio_input_get' was not declared in this scope`

### Analisis del error

`gpio_input_get()` era una macro o funcion del framework de bajo nivel de ESP32 (ESP-IDF) en sus versiones antiguas. En las nuevas versiones **ESP32 Arduino Core 3.0.x**, Espressif ha reestructurado bastante la API de bajo nivel, eliminando o modificando muchas funciones antiguas. Esto hace que TFT_eSPI no encuentre la definicion de esa funcion al compilar.

La forma mas facil de solucionarlo es hacer un downgrade de la libreria esp32 a la version 2.0.x, que es lo mas comodo. Pero aqui te ofrezco otra solucion: modificar directamente la libreria TFT_eSPI.

Busca y abre este archivo:

Documents/Arduino/libraries/TFT_eSPI/Processors/TFT_eSPI_ESP32.c

Al inicio del codigo, agrega la siguiente definicion de macro y guarda el archivo:

```c++
#if !defined(gpio_input_get)
  #define gpio_input_get() GPIO.in
#endif
```



## Subir el programa de nuevo y solucionar el problema de imagen espejada

Ahora la compilacion pasa sin problemas y el programa se sube correctamente a la placa. La pantalla se enciende, pero no te emociones demasiado todavia: si te fijas bien, veras que el texto de la pantalla esta espejado.

En el programa de ejemplo, hacemos una modificacion. Busca alrededor de la linea 102 del programa de ejemplo:

```
void loop(void) {
  for (uint8_t rotation = 4; rotation < 8; rotation++) {
    tft.setRotation(rotation);
    testText();
    delay(2000);
  }
}
```



## Subir el programa final

Ahora la imagen se ve correctamente. Felicidades, has encendido con exito esta pantalla TFT de 2.4 pulgadas (ILI9341)




## Preguntas frecuentes (FAQ)

Aqui tienes las preguntas mas comunes que surgen durante el desarrollo, para consulta rapida.

### Q1: La pantalla se ilumina en blanco pero no muestra ninguna imagen?

- **A1**: En el 90% de los casos es porque no has activado el modo paralelo. Revisa de nuevo el archivo User_Setup.h y asegurate de que `#define ESP32_PARALLEL` este descomentado.
- **A2**: Comprueba que TFT_RST (GPIO 33) tiene buena conexion.

### Q2: Los colores estan mal, el rojo se ve azul?

- **A**: Es un problema de orden RGB. En User_Setup.h, cambia `#define TFT_RGB_ORDER TFT_RGB` por `TFT_BGR` (o viceversa).

### Q3: Esta configuracion soporta pantalla tactil (Touch)?

- **A**: Este articulo solo configura el driver de pantalla. Las pantallas ILI9341 suelen incluir un chip tactil XPT2046, que usa una interfaz SPI independiente. Necesitas conectar los pines tactiles por separado (T_CLK, T_CS, T_DIN, T_DO, T_IRQ) y descomentar `TOUCH_CS` en User_Setup.h. **Aviso**: el tactil funciona por SPI, no se pueden compartir pines con el bus de datos paralelo D0-D7.

### Q4: Por que no usar directamente VSPI/HSPI?

- **A**: El bus paralelo (8-bit Parallel) tiene una velocidad de refresco teorica varias veces superior a la de SPI, lo que lo hace ideal para interfaces con alta tasa de refresco o para desarrollo de emuladores de juegos retro.
