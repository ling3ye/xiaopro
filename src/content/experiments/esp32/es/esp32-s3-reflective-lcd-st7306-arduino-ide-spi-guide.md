---
title: "Tutorial completo para controlar por SPI un LCD reflectante de cuatro colores ST7306 con ESP32-S3 (Arduino IDE)"
boardId: esp32s3
moduleId: display/lcd42-st7306-reflective
category: esp32
date: 2026-11-17
intro: "Controla un panel LCD reflectante (sin retroiluminación) de cuatro colores ST7306 con ESP32-S3 usando Arduino IDE y SPI: cableado del FPC de 21 pines, código completo, ajuste de la orientación y diagnóstico cuando no hay imagen. Entorno probado: Arduino IDE 2.3.8 + esp32 Core 3.3.8."
image: "https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg"
---

> Dificultad: ⭐⭐☆☆☆  
> Tiempo estimado: unos 30–60 minutos (sin contar las descargas del entorno ni la depuración del hardware)  
> Entorno de prueba: Arduino IDE v2.3.8 + esp32 Arduino Core v3.3.8

## TL;DR: arranque rápido de ESP32-S3 con ST7306

- El módulo solo usa 3.3V: los pines 5 y 6 del FPC van ambos a 3.3V, con una masa común (GND) bien conectada; no conectes 5V.
- Por defecto `PINSET = 1`: CS→GPIO9, RESET→GPIO10, SCLK→GPIO12, MOSI→GPIO13, RS/D/C→GPIO14; TE puede quedar sin conectar.
- Instala `esp32 by Espressif Systems` en Arduino IDE; no hace falta ninguna librería ST7306 adicional.
- Abre `esp32s3-st7306-bringup.ino` del directorio del proyecto y elige la placa según tu modelo de ESP32-S3 (en este ejemplo, `ESP32S3 Dev Module`); si no salen logs por el puerto serie, revisa primero `USB CDC On Boot`.
- El SPI por defecto va en modo 0 a 20MHz y la imagen lógica es de 400×300 en horizontal; si no hay imagen, corta la alimentación y verifica la masa común (GND), la orientación del FPC y el pin RS; al encender, mide 3.3V y observa con buena luz; si sigue sin funcionar, baja `SPI_HZ` a 10MHz.

## Introducción: enciende primero el ST7306 con Arduino IDE

Esta pantalla de 4.2 pulgadas usa el controlador ST7306 y recibe los comandos y los datos del framebuffer por SPI. Es un TFT LCD totalmente reflectante (sin retroiluminación): muestra la imagen con la luz ambiental y no tiene backlight, así que solo se ve bien en entornos luminosos. El directorio del proyecto incluye dos programas, para ESP-IDF y para Arduino IDE; este artículo sigue solo la vía Arduino IDE: conectar el FPC de 21 pines, subir el ejemplo y poner en marcha la página de prueba de 400×300 en horizontal. La demo de 20 páginas para ESP-IDF también sigue en el directorio del proyecto; quien quiera profundizar en la encapsulación del driver y las funciones de dibujo puede compilarla por su cuenta.

## Resultado final: la prueba de 8 páginas del ST7306

Con el cableado y la subida correctos, el programa muestra en bucle 8 páginas de prueba. Las páginas normales se mantienen unos 3 segundos; la del cuadrado en movimiento, unos 6 segundos. Abre el monitor serie a 115200 baudios para ver los logs de inicialización y de cambio de página. Cada página se redibuja continuamente mientras está activa; si abres el monitor serie después de subir el código, puede que te pierdas los logs de arranque: pulsa RST en la placa para volver a verlos.

| Página | Contenido de la prueba | Punto de comprobación | Nombre en el programa |
| -: | ----------------- | -------------- | ----------------- |
|  0 | Barras horizontales blanca, cian, roja y negra | Los cuatro estados de visualización | `PAGE_COLOR_BARS` |
|  1 | HELLO WORLD, marco, cuatro esquinas | Texto y orientación horizontal | `PAGE_HELLO`      |
|  2 | Tiempo, fotogramas, FPS | Tiempo acumulado desde el arranque, contador global de fotogramas, FPS medio acumulado (no la tasa de esta página por separado) | `PAGE_COUNTER`    |
|  3 | Diagonales, líneas horizontales y verticales | Líneas y mapeo de coordenadas | `PAGE_DIAGONAL`   |
|  4 | Cuadrado que va y viene de izquierda a derecha | Refresco continuo | `PAGE_REFRESH`    |
|  5 | Tablero de ajedrez | Casillas blancas y negras (20 píxeles por casilla) | `PAGE_CHECKER`    |
|  6 | Rayas horizontales | Patrón regular | `PAGE_STRIPES`    |
|  7 | Prueba de color CYAN | Pantalla completa cian (visualmente azulada), byte de framebuffer `0x33` | `PAGE_CYAN`       |

> Nota: las etiquetas dentro de cada página (como `1: COLOR BARS`, `3: DIAGONAL`) son cadenas fijadas en el código y no coinciden del todo con los números de página de la tabla (COLOR BARS es la página 0); guíate por los logs `[PAGE]` del puerto serie.


![](https://img.lingflux.com/2026/11/0784aa352ac306a54f4bc28e49cd0d48.jpg)


## Componentes: YDP420H005-V3 y ST7306

### Módulo LCD reflectante YDP420H005-V3

Es un módulo TFT LCD reflectante (sin retroiluminación) de 4.2 pulgadas cuyo framebuffer nativo del panel es de 300×400. El controlador ST7306 ya viene integrado en el módulo; el ESP32-S3 le envía comandos y datos de píxeles por SPI. El programa Arduino de este proyecto lo mapea a nivel de aplicación como una pantalla horizontal de 400×300.

El firmware de este proyecto usa una codificación de 2bit para producir cuatro estados de visualización: blanco, cian, rojo y negro (`0x00`–`0x03`). Cada píxel ocupa 2bit y no hay tonos de gris intermedios. No copies sin más los colores ni los parámetros de inicialización de otras pantallas ST7306.

| Parámetro | Módulo de este proyecto |
| ------- | ----------------------------- |
| Modelo | Osptek YDP420H005-V3 |
| Controlador | Sitronix ST7306 |
| Resolución nativa | 300×400 |
| Estados de visualización | Blanco, cian, rojo y negro; 2bit/píxel |
| Interfaz con el MCU | SPI de 4 hilos (SCLK, MOSI, CS, D/C), más RESET y TE opcional; el FPC no tiene MISO/SDO: solo se puede escribir, no leer |
| Alimentación y lógica del módulo | 3.3V |
| Área activa de visualización | 63.6×84.8mm |
| Temperatura de operación | −20～+70°C |

### Placa adaptadora FPC de 21 pines

La pantalla saca las señales por un FPC de 21 pines. La placa adaptadora convierte esos pines tan finos en puntos de soldadura o tiras de pines cómodos para conectar el ESP32-S3; este proyecto no necesita montar ningún circuito de driver de pantalla adicional.

Yo uso la placa adaptadora universal de doble FPC que el fabricante vende junto con la pantalla; no lleva ningún modelo serigrafiado. La placa tiene dos conectores: el de 21 pines para la pantalla de 4.2 pulgadas y el de 12 pines para la de 2.9, además de unos pads `GND` y `3V3` al lado.

Junto a cada conector FPC hay unos pocos componentes SMD soldados, de encapsulado muy pequeño y sin valores serigrafiados. No he investigado su función ni sus valores.

Esta placa universal tiene un punto donde es fácil equivocarse: lleva serigrafiados tanto RS como DC. El LCD_D/C de este módulo debe ir al serigrafiado `RS`; el otro serigrafiado `DC` no tiene nada que ver con este módulo (no he comprobado a qué conector pertenece), no lo conectes. Al comprar o soldar una placa adaptadora, verifica también la orientación de los contactos del FPC y la numeración de los pines.
### Pinout: el FPC de 21 pines del YDP420H005-V3

La tabla siguiente sigue la numeración del FPC del módulo. La serigrafía de la placa adaptadora puede ser distinta: al cablear, guíate por la hoja de especificaciones del módulo y por las pistas reales de la placa (esta adaptadora no tiene modelo ni esquema público).

| Pin FPC | Señal del módulo | Serigrafía habitual | Uso en este ejemplo |
| -------: | ---------------------------------- | --------- | -------------------- |
| 1、4、7、14 | GND | GND | Conectar a la masa común |
|      2、3 | NC | NC | Sin conectar |
|      5、6 | VCC(3.3V) | VCC、VCI | Ambos pines a 3.3V |
|        8 | LCD_RES | RESET、RST | A GPIO10, reset activo en bajo |
|        9 | LCD_SCLK | SCL、SCLK | A GPIO12, como reloj SPI |
|       10 | TE | TE | Puede ir a GPIO11; este ejemplo no lo lee, puede quedar al aire |
|       11 | LCD_SDI | SDA、MOSI | A GPIO13, como MOSI del SPI |
|       12 | LCD_D/C | RS、A0 | A GPIO14, selecciona comando o dato |
|       13 | LCD_CS | CS | A GPIO9, chip select activo en bajo |
|    15～19 | TP-VDD、TP-RST、TP-INT、TP-SDA、TP-SCL | Serigrafías del táctil | El módulo de este ejemplo no tiene táctil: sin conectar |
|    20、21 | GND | GND | También son masa; en este ejemplo basta con conectar 1、4、7、14 (no he medido uno por uno si 20 y 21 están unidos a ellos en la adaptadora; si tienes dudas, conéctalos también a masa) |

Los nombres SCL y SDA que aparecen aquí son la denominación habitual heredada de la serigrafía de la adaptadora. Este ejemplo usa SPI: SCL corresponde al reloj serie de esta pantalla y SDA, a MOSI.

## BOM: materiales para cablear el ST7306

| Componente | Especificación | Cantidad | Notas |
| ------------ | --------------------- | -: | ---------------- |
| Placa de desarrollo ESP32-S3 | ESP32-S3 N16R8 (16MB Flash / 8MB PSRAM) |  1 | GPIO a 3.3V |
| Módulo de pantalla | Osptek YDP420H005-V3 |  1 | 4.2 pulgadas, FPC de 21 pines |
| Placa adaptadora FPC | Placa universal de doble FPC del fabricante, sin modelo |  1 | Verifica pines y orientación de los contactos |
| Cable USB de datos | Compatible con el conector de la placa |  1 | Debe soportar transferencia de datos |
| Cables de conexión | Cables Dupont cortos o cable para soldar | varios | Cuanto más cortos los cables SPI, más estables y más fáciles de ordenar |

## Cableado: ESP32-S3 y ST7306

Corta primero la alimentación y cablea según el `PINSET = 1` por defecto:

| Pin FPC | Señal de la pantalla | ESP32-S3 | ¿Obligatorio? | Descripción |
| -------: | --------------- | -------- | ---- | --------- |
|       13 | LCD_CS / CS | GPIO9 | Sí | Chip select |
|        8 | LCD_RES / RESET | GPIO10 | Sí | Reset por hardware |
|       10 | TE | GPIO11 | Opcional | El ejemplo no lo lee, puede quedar al aire |
|        9 | LCD_SCLK / SCLK | GPIO12 | Sí | Reloj SPI |
|       11 | LCD_SDI / MOSI | GPIO13 | Sí | Salida de datos SPI |
|       12 | LCD_D/C / RS | GPIO14 | Sí | En la adaptadora del fabricante va a RS |
|      5、6 | VCC / VCI | 3.3V | Sí | Conectar ambos pines de alimentación |
| 1、4、7、14 | GND | GND | Sí | Masa común con la placa |

⚠️ La alimentación y la lógica del módulo son a 3.3V. Cuando el módulo esté sin alimentación, no sigas enviándole señales desde los GPIO.

Con todo conectado, revisa primero **sin alimentación**:

1. Confirma el pin 1 del FPC y la orientación de los contactos con el dibujo mecánico del módulo.
2. Con el multímetro en modo continuidad, comprueba que el GND de la placa y el pin GND de la pantalla están unidos, y que no hay cortocircuito entre 3.3V y GND.
3. Verifica uno a uno los cinco cables de señal: CS, RESET, SCLK, MOSI y RS.
4. Si usas la adaptadora de doble FPC del fabricante, confirma además que GPIO14 va a RS.
5. Comprueba que no haya conexiones flojas ni cortocircuitos.

Después, revisa **con alimentación**:

6. Mide con el multímetro la tensión en los pines 5 y 6 (o en los puntos de soldadura correspondientes de la adaptadora): debe ser 3.3V; si no, corta la alimentación de inmediato y depura.

Te recomiendo repasar cada cable dos veces. Con un solo cable mal puesto, es muy difícil deducir cuál es a partir de los logs serie (en este ejemplo los logs serie no reflejan el estado de la pantalla; ver la sección de solución de problemas).

## Librerías necesarias: soporte ESP32-S3 en Arduino IDE

Este ejemplo no usa ninguna librería Arduino ST7306 independiente. El driver, el dibujo y las páginas de prueba están todos en el archivo `.ino`. `SPI.h` y `esp_heap_caps.h` vienen con el ESP32 Arduino Core; no hace falta buscarlos en el gestor de librerías.

| Nombre | Autor u origen | Instalación | Versión confirmada en mi equipo |
| ---------------------------------------------------------------- | ------------------------- | ------------------ | ------------- |
| Arduino IDE | Arduino | Desde la web oficial de Arduino | v2.3.8 |
| [esp32 Arduino Core](https://github.com/espressif/arduino-esp32) | Espressif Systems | Gestor de placas de Arduino IDE | v3.3.8 |
| [SPI](https://github.com/espressif/arduino-esp32) | Incluido en el Espressif Arduino Core | Se instala con el Core | Con el Core v3.3.8 |
| [esp\_heap\_caps](https://github.com/espressif/arduino-esp32) | Incluido en el Espressif Arduino Core | Se instala con el Core | Con el Core v3.3.8 |

### Instalar el esp32 Arduino Core

1. Abre las preferencias de Arduino IDE y añade en «URLs adicionales del gestor de placas»:


   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
2. Abre «Herramientas → Placa → Gestor de placas» y busca `esp32`.
3. Instala `esp32 by Espressif Systems`. La versión confirmada en mi equipo es la v3.3.8; para reproducir el ejemplo te recomiendo la misma versión y así reducir las variables de depuración debidas a diferencias del Core.

### Abrir el código y flashear

1. Abre la [página del proyecto en GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek) y descarga el directorio completo del proyecto, o guarda solo la carpeta `ArduinoIDE/esp32s3-st7306-bringup`.
2. Abre `ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino` con Arduino IDE.
3. Confirma que `PINSET` vale `1` en el código y que `ROT180` está por defecto en `1`.
4. En «Herramientas → Placa», elige tu placa ESP32-S3 (en este ejemplo, `ESP32S3 Dev Module`) y selecciona el puerto serie correcto. Los valores de referencia están en la sección siguiente; no hace falta copiarlos todos al pie de la letra.
5. Pulsa «Verificar» y, si pasa, pulsa «Subir».
6. Abre el monitor serie a 115200 baudios. Cuando veas `Entrando en el bucle de páginas de prueba`, observa si la pantalla rota por las páginas de prueba. Con USB nativo, el puerto serie se reenumera tras la subida y los logs de arranque pueden haber salido ya; si no los ves, pulsa RST una vez, o guíate por los logs `[PAGE]` posteriores. La pantalla es reflectante: obsérvala con buena luz.

### Configuración de menús de Arduino IDE (valores de referencia)

Esta es la configuración con la que me funcionó: Arduino IDE v2.3.8 + esp32 Core v3.3.8. Solo como referencia: hay demasiados modelos de placa ESP32-S3 y el chip Flash, la PSRAM y el conexionado USB pueden variar; copiarla tal cual puede darte más problemas que soluciones. La tercera columna de la tabla indica qué opciones dependen de la placa.

| Opción de menú | Valor de este ejemplo | Cómo decidirlo |
| --- | --- | --- |
| Board | ESP32S3 Dev Module | Elige según tu placa; la arquitectura debe ser esp32s3 |
| Port | /dev/cu.usbmodem1401 | Elige el puerto real de tu equipo; no copies la ruta |
| USB CDC On Boot | Enabled | Depende de por dónde va el USB: con USB nativo, Enabled; con chip serie a bordo, Disabled |
| CPU Frequency | 240MHz (WiFi) | Deja el valor por defecto; el ejemplo no necesita bajar la frecuencia |
| Flash Mode | QIO 80MHz | Según el chip Flash; QIO es el valor por defecto de la mayoría de módulos |
| Flash Size | 4MB (32Mb) | No superes la capacidad real de la placa (elegir de más puede impedir el arranque); elegir de menos solo desaprovecha capacidad, y el error de compilación llega cuando el programa no cabe en la partición |
| PSRAM | Disabled | El ejemplo no usa PSRAM; dejarlo en Disabled es lo más estable; si lo activas, elige bien OPI/QSPI según el módulo (la R8 del N16R8 suele ser Octal: elige OPI PSRAM); una elección incorrecta puede impedir el arranque |
| Partition Scheme | Default 4MB with spiffs（1.2MB APP / 1.5MB SPIFFS） | El valor por defecto basta; si cambias Flash Size, cámbialo también |
| Upload Speed | 921600 | Si la subida falla, baja a 115200 o 460800 |
| Upload Mode | UART0 / Hardware CDC | Va emparejado con la opción USB CDC |
| USB Mode | Hardware CDC and JTAG | Depende del número de puertos USB de la placa; las de un solo puerto suelen ir así |

Mi placa es una N16R8, nominalmente con 16MB de Flash y 8MB de PSRAM, pero arriba Flash Size está en 4MB y PSRAM en Disabled, o sea que la mayor parte de la capacidad queda sin usar. El ejemplo solo ocupa 30000 bytes de RAM como framebuffer y el informe de compilación indica que el programa ocupa alrededor del 24% de la partición APP por defecto, así que estos valores funcionan. Para aprovechar toda la capacidad habría que cambiar Flash Size, PSRAM y la tabla de particiones; no lo he probado y no quiero que caigas en esa trampa.

Para saber si tu configuración es correcta no hace falta revisar opción por opción: si compila, sube, salen caracteres por el serie y la pantalla muestra imagen, es suficiente. Si algo se rompe en algún paso, ve a la sección de solución de problemas y busca tu síntoma.

## Código completo: ST7306 con Arduino IDE

Este es el `.ino` completo de la v7.5 del repositorio. Respecto al repositorio, este artículo solo cambia unos comentarios (el significado de `PINSET`, el método de rotación, la nota de centrado, el criterio del FPS y el uso de `DIAG_MODE`); la lógica ejecutable no se ha tocado. Recomiendo actualizar también los comentarios correspondientes en el repositorio. La v7.4 corrigió el byte de relleno de `PAGE_CYAN` y la v7.5 eliminó una lectura de estado `0x09` que no devolvía datos; el resto de la lógica no cambió.
```cpp
/*
 * ESP32-S3 + OSPTEK 4.2" 300x400 LCD negro blanco rojo cian (ST7306 · SPI) suite de pruebas v7.5
 *
 * Cambios en v7.5 (eliminada la lectura de estado inútil):
 *   Medido con esp32s3-st7306-readback-test: con SPI.begin(...,-1,MOSI,-1) MISO no está conectado,
 *   transfer() devuelve siempre 0xFF, sin relación con la dirección del registro ni con si CS está seleccionado; al poner el pin de datos como entrada
 *   y leer una vez con pull-up y otra con pull-down, el resultado es todo unos / todo ceros: la pantalla no maneja la línea de datos durante los comandos de lectura.
 *   Conclusión: con este conexionado el módulo no puede leer registros; el antiguo log [DIAG] 0x09 solo daba un OK falso,
 *   se eliminó el bloque entero. Para juzgar si el enlace funciona, mira si la pantalla muestra imagen con normalidad, no el puerto serie.
 *
 * Cambios en v7.4 (arreglado el relleno de pantalla completa de PAGE_CYAN):
 *   Comparación en hardware real de 0x33 / 0x55 / writePoint(C_CYAN) píxel a píxel:
 *   0x33 y la escritura píxel a píxel muestran toda la pantalla cian (visualmente azulada); 0x55 muestra rayas alternas.
 *   Tras la escritura píxel a píxel, los 30000 bytes del framebuffer también son todos 0x33, así que PAGE_CYAN pasa a usar 0x33.
 *
 * Cambios en v7.3 (rotar toda la pantalla 180° adicionales):
 *   En la demo en vivo la orientación de la imagen era la opuesta al mapeo original; había que girar toda la pantalla 180°.
 *   Añadir una simetría central de las coordenadas lógicas antes del mapeo por software de writePoint:
 *     x -> LCD_W-1-x, y -> LCD_H-1-y
 *   Equivale a rx = 299 - y; ry = x;  se activa con la macro ROT180; ponerla a 0 vuelve a la orientación de v7.1.
 *
 * Cambios en v7.1 (adaptación horizontal - rotación por software, corrección de orientación):
 *   El cableado físico del panel es vertical 300x400; el usuario lo coloca en horizontal, con vista de 400x300.
 *   Rotación por software: writePoint mapea las coordenadas lógicas horizontales al framebuffer vertical.
 *   Fórmula de mapeo (corregida en v7.1): rx = y; ry = 399 - x;
 *   v7 usaba rx=299-y, ry=x (sentido horario): el cuadrado de diagnóstico salía abajo a la derecha, orientación invertida.
 *   v7.1 cambia a sentido antihorario: el cuadrado debe salir arriba a la izquierda.
 * v7.2: DIAG_MODE desactivado, restaurado el bucle completo de 8 páginas de prueba.
 *
 * Correcciones clave de v4:
 *   1) Añadido pinMode(LCD_CS/RS, OUTPUT): digitalWrite por debajo es solo gpio_set_level(),
 *      no cambia automáticamente a modo salida; los pines del ESP32 son entrada por defecto y CS/D-C al aire hacían que la pantalla no recibiera
 *      ninguna secuencia válida de comandos/datos. Esa era la causa raíz real de la falta de imagen en las versiones anteriores.
 *   2) Definiciones de pines coherentes con board_config.h del proyecto IDF (BOARD_PINSET 1); el cableado no necesita cambios:
 *      CS=9  RST=10  CLK=12  MOSI=13  RS(D/C)=14
 *   3) Reloj SPI a 20MHz
 *   4) Añadidos los pasos que el app_main del proyecto IDF ejecuta después de initialize():
 *      High_Power_Mode / display_on / display_Inversion(false) / clearDisplay
 *   5) Mapeo de colores coherente con board_color.h del IDF:
 *      C_WHITE=0x00  C_CYAN=0x01  C_RED=0x02  C_BLACK=0x03
 *      (bit0=cian, bit1=rojo, ambos bits activos=negro)
 *
 * v5 añade 8 páginas de prueba (3 segundos por página, 6 la de tasa de refresco):
 *   0 COLOR_BARS  barras horizontales de cuatro colores (blanco/cian/rojo/negro)
 *   1 HELLO       HELLO WORLD + marcas en las cuatro esquinas + marco
 *   2 COUNTER     tiempo / fotogramas / FPS
 *   3 DIAGONAL    diagonales + líneas horizontales y verticales
 *   4 REFRESH     prueba de tasa de refresco (cuadrado en movimiento)
 *   5 CHECKER     tablero de ajedrez
 *   6 STRIPES     rayas horizontales
 *   7 CYAN        pantalla completa cian
 */

#include <SPI.h>
#include <esp_heap_caps.h>

// ---------------- Configuración de pines ----------------
#define PINSET 1  // 1=conexionado por defecto (GPIO9/10/12/13/14, usado en este artículo)  0=conexionado alternativo (GPIO38–42)

#if PINSET == 1
  // Pines idénticos a board_config.h del proyecto IDF (BOARD_PINSET 1); el cableado no necesita cambios
  #define LCD_CS   9
  #define LCD_RST  10
  #define LCD_CLK  12
  #define LCD_MOSI 13
  #define LCD_RS   14   // D/C, serigrafiado RS
#else
  #define LCD_CS   38
  #define LCD_RST  41
  #define LCD_CLK  39
  #define LCD_MOSI 42
  #define LCD_RS   40
#endif

// ---------------- Parámetros de la pantalla ----------------
// Resolución lógica: horizontal 400x300 (el cableado físico del panel es vertical 300x400; writePoint() rota por software, sin usar el bit MV)
#define LCD_W      400
#define LCD_H      300
// Parámetros del framebuffer vertical (sin cambios)
#define LCD_PIVOT_W  300   // ancho físico
#define LCD_PIVOT_H  400   // alto físico
#define LCD_ROW_B    (LCD_PIVOT_W / 2)          // 150 bytes por fila
#define BUF_LEN      (LCD_ROW_B * LCD_PIVOT_H / 2)  // 30000 bytes
#define CHUNK        1500

// Mapeo de colores coherente con board_color.h del IDF
#define C_WHITE  0x00
#define C_CYAN   0x01
#define C_RED    0x02
#define C_BLACK  0x03

// Si sigue sin encender, prueba a bajar 20000000 a 10000000
#define SPI_HZ  20000000

static uint8_t *fb = nullptr;

// ---------------- SPI de bajo nivel (CS totalmente manual) ----------------
static void spi_begin(void) {
  SPI.beginTransaction(SPISettings(SPI_HZ, MSBFIRST, SPI_MODE0));
}

static void lcd_cmd(uint8_t cmd) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, LOW);
  SPI.transfer(cmd);
  digitalWrite(LCD_CS, HIGH);
}

static void lcd_param(uint8_t p) {
  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  SPI.transfer(p);
  digitalWrite(LCD_CS, HIGH);
}

// Aquí había antes un lcd_read_reg() que leía el registro de estado 0x09 con SPI.transfer().
// Motivo de la eliminación en v7.5 (medido, no suposiciones):
//   1) El segundo parámetro de SPI.begin(LCD_CLK, -1, LCD_MOSI, -1) es MISO; pasar -1 significa que no está conectado,
//      el periférico no tiene pin de entrada que muestrear y transfer() devuelve siempre 0xFF.
//   2) Con cualquier otro registro 0x04 / 0x0A / 0xDA / 0xA5, o con CS siempre en alto sin
//      seleccionar la pantalla, se sigue leyendo 0xFF: ese valor no tiene ninguna relación con la pantalla.
//   3) Leyendo en semidúplex (pin MOSI como entrada, reloj generado a mano), el pull-up interno da todo unos y
//      el pull-down interno todo ceros: la pantalla no maneja la línea de datos durante los comandos de lectura; no se puede leer nada.
// Así que este módulo, con este conexionado, no tiene autocomprobación de enlace utilizable. Para saber si está bien conectado, mira si la pantalla muestra imagen.

// ---------------- Secuencia de inicialización (idéntica comando a comando al IDF) ----------------
static void st7306_init(void) {
  // Corrección clave: hay que configurar explícitamente CS / RS / RST como salidas.
  // digitalWrite por debajo es solo gpio_set_level(); no cambia automáticamente a modo salida;
  // los pines del ESP32 son entrada por defecto; sin pinMode, CS y D/C quedan al aire todo el tiempo y la pantalla no recibe ninguna secuencia válida.
  pinMode(LCD_CS,  OUTPUT);
  pinMode(LCD_RS,  OUTPUT);
  pinMode(LCD_RST, OUTPUT);
  digitalWrite(LCD_CS, HIGH);   // CS en alto en reposo
  digitalWrite(LCD_RS, HIGH);
  digitalWrite(LCD_RST, HIGH); delay(10);
  digitalWrite(LCD_RST, LOW);  delay(10);
  digitalWrite(LCD_RST, HIGH); delay(10);

  // El último parámetro es -1: CS se controla por completo con digitalWrite manual
  SPI.begin(LCD_CLK, -1, LCD_MOSI, -1);
  spi_begin();

  lcd_cmd(0xD6); lcd_param(0x17); lcd_param(0x02);
  lcd_cmd(0xD1); lcd_param(0x01);

  lcd_cmd(0xC0); lcd_param(0x12); lcd_param(0x0A);
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);

  lcd_cmd(0xD8); lcd_param(0xA6); lcd_param(0xE9);
  lcd_cmd(0xB2); lcd_param(0x12);

  lcd_cmd(0xB3); lcd_param(0xE5); lcd_param(0xF6); lcd_param(0x17);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x71);
  lcd_cmd(0xB4); lcd_param(0x05); lcd_param(0x46); lcd_param(0x77); lcd_param(0x77);
                 lcd_param(0x77); lcd_param(0x77); lcd_param(0x76); lcd_param(0x45);

  lcd_cmd(0x62); lcd_param(0x32); lcd_param(0x03); lcd_param(0x1F);

  lcd_cmd(0xB7); lcd_param(0x13);
  lcd_cmd(0xB0); lcd_param(0x64);

  lcd_cmd(0x11); delay(120);                         // Sleep Out

  lcd_cmd(0xC9); lcd_param(0x00);
  lcd_cmd(0x36); lcd_param(0x48);                    // MX=1, DO=1
  lcd_cmd(0x3A); lcd_param(0x11);
  lcd_cmd(0xB9); lcd_param(0x20);
  lcd_cmd(0xB8); lcd_param(0x29);

  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);

  lcd_cmd(0x35); lcd_param(0x00);
  lcd_cmd(0xD0); lcd_param(0xFF);
  lcd_cmd(0x38);                                     // HPM

  lcd_cmd(0x29);                                     // DISPLAY ON
  lcd_cmd(0x20);                                     // Inversion Off

  lcd_cmd(0xBB); lcd_param(0x4F);                    // Enable Clear RAM

  // ---- Pasos que el app_main del IDF ejecuta después de initialize() ----
  lcd_cmd(0x38); delay(300);                         // secuencia HPM de High_Power_Mode()
  lcd_cmd(0xC1); lcd_param(115); lcd_param(0x3E); lcd_param(0x3C); lcd_param(0x3C);
  lcd_cmd(0xC2); lcd_param(0);   lcd_param(0x21); lcd_param(0x23); lcd_param(0x23);
  lcd_cmd(0xC4); lcd_param(50);  lcd_param(0x5C); lcd_param(0x5A); lcd_param(0x5A);
  lcd_cmd(0xC5); lcd_param(50);  lcd_param(0x35); lcd_param(0x37); lcd_param(0x37);
  lcd_cmd(0xC9); lcd_param(0x00);
  delay(20);
  // display_on(true) / display_Inversion(false) ya se enviaron arriba como 0x29/0x20
  // clearDisplay() equivale a poner el framebuffer a cero; lo hace el memset previo al refresco

  SPI.endTransaction();
}

// ---------------- Refresco de pantalla (envío por bloques) ----------------
static void st7306_flush(void) {
  spi_begin();
  lcd_cmd(0x2A); lcd_param(0x05); lcd_param(0x36);
  lcd_cmd(0x2B); lcd_param(0x00); lcd_param(0xC7);
  lcd_cmd(0x2C);

  digitalWrite(LCD_CS, LOW);
  digitalWrite(LCD_RS, HIGH);
  for (size_t off = 0; off < BUF_LEN; off += CHUNK) {
    size_t n = BUF_LEN - off;
    if (n > CHUNK) n = CHUNK;
    SPI.writeBytes(fb + off, n);
  }
  digitalWrite(LCD_CS, HIGH);
  SPI.endTransaction();
}

// ---------------- Operaciones de píxeles ----------------
// Coordenadas lógicas: horizontal 400x300
// Framebuffer vertical 300(columnas) x 400(filas), mapeo con rotación por software:
//   x horizontal (0~399, de izquierda a derecha) -> fila vertical ry = 399 - x (espejo izquierda-derecha)
//   y horizontal (0~299, de arriba abajo) -> columna vertical rx = y
// El segmento de bits se calcula con la paridad de las coordenadas físicas verticales rx/ry.
//
// ROT180: rota toda la pantalla 180° más (para panel montado al revés / orientación de demo opuesta).
//   Se aplica primero una simetría central a las coordenadas lógicas x -> 399-x, y -> 299-y y luego el mapeo de arriba;
//   simplificado equivale a: rx = 299 - y; ry = x;
#define ROT180 1   // 1 = rotar 180° (actual); 0 = restaurar la orientación original de v7.1

static void writePoint(uint16_t x, uint16_t y, uint16_t data) {
  if (x >= LCD_W || y >= LCD_H) return;
#if ROT180
  x = LCD_W - 1 - x;       // espejo de la x lógica
  y = LCD_H - 1 - y;       // espejo de la y lógica
#endif
  uint16_t rx = y;         // columna vertical
  uint16_t ry = 399 - x;   // fila vertical (invertida)
  uint16_t real_x = rx / 2;
  uint16_t real_y = ry / 2;
  uint32_t idx    = (uint32_t)real_y * LCD_ROW_B + real_x;
  uint8_t one_two    = (ry % 2) ? 1 : 0;
  uint8_t line_bit_1 = (rx % 2) * 4;
  uint8_t line_bit_0 = (rx % 2) * 4 + 2;
  uint8_t bit1       = 7 - (line_bit_1 + one_two);
  uint8_t bit0       = 7 - (line_bit_0 + one_two);
  if (data & 0x02) fb[idx] |=  (1 << bit1);
  else             fb[idx] &= ~(1 << bit1);
  if (data & 0x01) fb[idx] |=  (1 << bit0);
  else             fb[idx] &= ~(1 << bit0);
}

static void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  for (uint16_t j = 0; j < h; j++)
    for (uint16_t i = 0; i < w; i++)
      writePoint(x + i, y + j, color);
}

// ---------------- Fuente de mapa de bits 5x7 (portada de board_ui_draw.cc del IDF) ----------------
static const uint8_t s_font_5x7[][7] = {
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, /*   */
    {0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04}, /* ! */
    {0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00}, /* " */
    {0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A}, /* # */
    {0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04}, /* $ */
    {0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03}, /* % */
    {0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0D}, /* & */
    {0x04, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00}, /* ' */
    {0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02}, /* ( */
    {0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08}, /* ) */
    {0x00, 0x04, 0x15, 0x0E, 0x15, 0x04, 0x00}, /* * */
    {0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00}, /* + */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08}, /* , */
    {0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00}, /* - */
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00}, /* . */
    {0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00}, /* / */
    {0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E}, /* 0 */
    {0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* 1 */
    {0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F}, /* 2 */
    {0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E}, /* 3 */
    {0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02}, /* 4 */
    {0x1F, 0x10, 0x10, 0x1E, 0x01, 0x01, 0x1E}, /* 5 */
    {0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E}, /* 6 */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08}, /* 7 */
    {0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E}, /* 8 */
    {0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E}, /* 9 */
    {0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00}, /* : */
};

// Letras mayúsculas A-Z (5x7)
static const uint8_t s_font_upper[][7] = {
    {0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* A */
    {0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E}, /* B */
    {0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E}, /* C */
    {0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E}, /* D */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F}, /* E */
    {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10}, /* F */
    {0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F}, /* G */
    {0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}, /* H */
    {0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E}, /* I */
    {0x01, 0x01, 0x01, 0x01, 0x01, 0x11, 0x0E}, /* J */
    {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11}, /* K */
    {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F}, /* L */
    {0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11}, /* M */
    {0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11}, /* N */
    {0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* O */
    {0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10}, /* P */
    {0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D}, /* Q */
    {0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11}, /* R */
    {0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E}, /* S */
    {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04}, /* T */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}, /* U */
    {0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04}, /* V */
    {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A}, /* W */
    {0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11}, /* X */
    {0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04}, /* Y */
    {0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F}, /* Z */
};

static void draw_char(int x, int y, char c, int scale, uint16_t color) {
    const uint8_t *rows = nullptr;
    if (c >= ' ' && c <= ':') {
        rows = s_font_5x7[c - ' '];
    } else if (c >= 'A' && c <= 'Z') {
        rows = s_font_upper[c - 'A'];
    } else if (c >= 'a' && c <= 'z') {
        rows = s_font_upper[c - 'a'];   // reutiliza la fuente de mapa de bits de mayúsculas
    } else {
        return;
    }
    for (int ry = 0; ry < 7; ++ry) {
        for (int rx = 0; rx < 5; ++rx) {
            if (rows[ry] & (1U << (4 - rx))) {
                fillRect(x + rx * scale, y + ry * scale, scale, scale, color);
            }
        }
    }
}

static void draw_text(int x, int y, const char *s, int scale, uint16_t color) {
    const int char_w = 5 * scale + scale;
    int pen_x = x;
    for (const char *p = s; *p; ++p) {
        draw_char(pen_x, y, *p, scale, color);
        pen_x += char_w;
    }
}

// ---------------- Páginas de prueba ----------------
enum TestPage {
    PAGE_COLOR_BARS = 0,   // barras horizontales de cuatro colores (blanco/cian/rojo/negro)
    PAGE_HELLO,            // Hello World + marcas en las cuatro esquinas + marco
    PAGE_COUNTER,          // segundos / contador de fotogramas
    PAGE_DIAGONAL,         // diagonales + líneas horizontales y verticales
    PAGE_REFRESH,          // prueba de tasa de refresco (cuadrado en movimiento)
    PAGE_CHECKER,          // tablero de ajedrez
    PAGE_STRIPES,          // rayas horizontales
    PAGE_CYAN,             // pantalla completa cian
    kTotalPages
};

static void draw_corner_marks(uint16_t color) {
    const int L = 30, T = 4;  // longitud y grosor del brazo
    // arriba a la izquierda
    fillRect(4, 4, L, T, color);  fillRect(4, 4, T, L, color);
    // arriba a la derecha
    fillRect(LCD_W - 4 - L, 4, L, T, color);  fillRect(LCD_W - 4 - T, 4, T, L, color);
    // abajo a la izquierda
    fillRect(4, LCD_H - 4 - T, L, T, color);  fillRect(4, LCD_H - 4 - L, T, L, color);
    // abajo a la derecha
    fillRect(LCD_W - 4 - L, LCD_H - 4 - T, L, T, color);
    fillRect(LCD_W - 4 - T, LCD_H - 4 - L, T, L, color);
}

static void draw_border(uint16_t color) {
    fillRect(0, 0, LCD_W, 2, color);
    fillRect(0, LCD_H - 2, LCD_W, 2, color);
    fillRect(0, 0, 2, LCD_H, color);
    fillRect(LCD_W - 2, 0, 2, LCD_H, color);
}

// Dibuja una línea recta en cualquier dirección (Bresenham)
static void draw_line(int x0, int y0, int x1, int y1, int thick, uint16_t color) {
    int dx = abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int dy = -abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    int err = dx + dy;
    while (true) {
        fillRect(x0, y0, thick, thick, color);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

static void render_page(int page, uint32_t frame, uint32_t elapsed_ms) {
    memset(fb, 0x00, BUF_LEN);   // todo blanco por defecto

    switch (page) {
    case PAGE_COLOR_BARS: {
        const uint16_t colors[4] = { C_WHITE, C_CYAN, C_RED, C_BLACK };
        const int bar_h = LCD_H / 4;
        for (int i = 0; i < 4; ++i) {
            int y0 = i * bar_h;
            int y1 = (i == 3) ? LCD_H : (y0 + bar_h);
            fillRect(0, y0, LCD_W, y1 - y0, colors[i]);
        }
        draw_text(10, 10, "1: COLOR BARS", 2, C_BLACK);
        break;
    }
    case PAGE_HELLO:
        // "HELLO WORLD" 11 caracteres * scale5 * 6px = 330px de ancho, centrado x=(400-330)/2=35
        draw_text(35, 110, "HELLO WORLD", 5, C_BLACK);
        draw_text(110, 175, "ST7306 400X300", 2, C_RED);
        draw_text(110, 200, "ESP32-S3 ARDUINO", 2, C_CYAN);
        draw_corner_marks(C_BLACK);
        draw_border(C_RED);
        break;
    case PAGE_COUNTER: {
        char buf[24];
        uint32_t sec = elapsed_ms / 1000;
        snprintf(buf, sizeof(buf), "T: %02lu:%02lu", (unsigned long)(sec / 60), (unsigned long)(sec % 60));
        draw_text(115, 80, buf, 5, C_BLACK);        // 240 de ancho; x=115 ajustado a mano, no centrado estricto
        snprintf(buf, sizeof(buf), "FRAME: %lu", (unsigned long)frame);
        draw_text(140, 160, buf, 3, C_RED);         // el ancho varía con el número de dígitos; x=140 ajustado a mano
        snprintf(buf, sizeof(buf), "FPS: %lu", (unsigned long)(frame * 1000 / max((uint32_t)1, elapsed_ms)));
        draw_text(152, 200, buf, 3, C_CYAN);        // el ancho varía con el número de dígitos; x=152 ajustado a mano; FPS = media acumulada de todas las páginas desde el arranque
        break;
    }
    case PAGE_DIAGONAL:
        // las dos diagonales
        draw_line(0, 0, LCD_W - 1, LCD_H - 1, 3, C_BLACK);
        draw_line(LCD_W - 1, 0, 0, LCD_H - 1, 3, C_RED);
        // línea horizontal
        for (int y = 30; y < LCD_H; y += 60)
            draw_line(0, y, LCD_W - 1, y, 2, C_CYAN);
        // línea vertical
        for (int x = 40; x < LCD_W; x += 80)
            draw_line(x, 0, x, LCD_H - 1, 2, C_BLACK);
        draw_text(10, 10, "3: DIAGONAL", 2, C_BLACK);
        break;
    case PAGE_REFRESH: {
        // el cuadrado va y viene de izquierda a derecha; observa la suavidad del movimiento
        int period = LCD_W - 60;
        int x = (int)((frame * 8) % (period * 2));
        if (x > period) x = period * 2 - x;
        fillRect(x + 10, 130, 40, 40, C_BLACK);     // centrado vertical y=(300-40)/2
        char buf[24];
        snprintf(buf, sizeof(buf), "FRAME %lu", (unsigned long)frame);
        draw_text(10, 10, buf, 2, C_BLACK);
        break;
    }
    case PAGE_CHECKER: {
        const int cell = 20;
        for (int y = 0; y < LCD_H; y += cell)
            for (int x = 0; x < LCD_W; x += cell)
                fillRect(x, y, cell, cell, ((x / cell + y / cell) & 1) ? C_BLACK : C_WHITE);
        break;
    }
    case PAGE_STRIPES: {
        const int stripe_h = 16;
        for (int y = 0; y < LCD_H; y += stripe_h * 2) {
            fillRect(0, y, LCD_W, stripe_h, C_BLACK);
            fillRect(0, y + stripe_h, LCD_W, stripe_h, C_WHITE);
        }
        break;
    }
    case PAGE_CYAN:
        memset(fb, 0x33, BUF_LEN);   // 0x33 = cada píxel empaquetado 01 -> pantalla completa cian
        draw_text(85, 130, "CYAN FULL", 5, C_BLACK);   // 270 de ancho; x=85 ajustado a mano, no centrado estricto
        break;
    default:
        break;
    }

    st7306_flush();
}

// ---------------- Punto de entrada de Arduino ----------------

// Modo diagnóstico: con true solo se dibuja un cuadrado negro de 50x50 en la posición lógica (50,50),
// para comprobar si el mapeo y la orientación de writePoint son correctos (si la pantalla no enciende en absoluto no ayuda; revisa primero cableado y alimentación).
// Qué observar:
//   1. El bloque es un cuadrado (no un rectángulo ni fragmentos) -> la proporción del mapeo de píxeles es correcta
//   2. El cuadrado está en el cuarto superior izquierdo de la vista horizontal -> la orientación es correcta
//   3. Si todo está invertido -> cambia primero la macro ROT180; si sigue mal, considera los bits MX/MY de MADCTL(0x36)
#define DIAG_MODE  false

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println();
    Serial.println("=== ST7306 test suite v7.5 (ROT180) ===");

    fb = (uint8_t *)heap_caps_malloc(BUF_LEN, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!fb) fb = (uint8_t *)malloc(BUF_LEN);
    if (!fb) { Serial.println("[ERR] Fallo al reservar el framebuffer"); while (1) delay(100); }
    Serial.printf("[OK] Framebuffer %d bytes @%p\n", BUF_LEN, fb);
    memset(fb, 0x00, BUF_LEN);

    Serial.println("[..] Inicializando ST7306 ...");
    st7306_init();

    // Aquí antes se leía una vez el registro de estado 0x09 y se imprimía OK / enlace caído.
    // Eliminado en v7.5: MISO no está conectado, el valor leído es siempre 0xFF, sin relación con el estado de la pantalla; solo daba falsos positivos.
    // Para saber si el enlace funciona, mira si la pantalla muestra imagen con normalidad.

    if (DIAG_MODE) {
        Serial.println("[DIAG] Dibujando cuadrado 50x50 en (50,50), observa la pantalla...");
        fillRect(50, 50, 50, 50, C_BLACK);
        st7306_flush();
    } else {
        Serial.println("[OK] Entrando en el bucle de páginas de prueba");
    }
}

void loop() {
    if (DIAG_MODE) { delay(1000); return; }

    static int page = 0;
    static uint32_t page_start = 0;
    static uint32_t frame = 0;
    static uint32_t t_start = 0;

    if (t_start == 0) t_start = millis();
    if (page_start == 0) page_start = millis();

    uint32_t dwell = (page == PAGE_REFRESH) ? 6000 : 3000;
    uint32_t elapsed = millis() - page_start;

    render_page(page, frame, millis() - t_start);
    frame++;

    if (elapsed >= dwell) {
        page = (page + 1) % kTotalPages;
        page_start = millis();
        Serial.printf("[PAGE] %d / %d, frame %lu\n", page, kTotalPages - 1, (unsigned long)frame);
    }
}
```


### Explicación del código: inicialización del ST7306, framebuffer y rotación

`PINSET` decide qué grupo de GPIO se usa. El cableado de este artículo corresponde a `PINSET = 1`; el código fuente conserva otro grupo de pines para `PINSET = 0`, y si cambias de grupo debes cambiar también el cableado. `PINSET` es solo un conmutador entre dos grupos de pines y no tiene nada que ver con usar o no una placa adaptadora; añadí una configuración de cableado adicional para que me resultara más cómodo conectar, y corresponde a `PINSET = 1`.

`st7306_init()` primero configura CS, RS y RST como salidas y después realiza el reset por hardware y la inicialización del ST7306. `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` especifica SCLK y MOSI; el CS se controla manualmente desde el código. A MISO se le pasa `-1` porque el FPC de este módulo no tiene MISO/SDO: solo se puede escribir, no leer, así que este ejemplo no incluye autocomprobación por lectura. La transferencia usa `SPI_MODE0` y el reloj se fija a 20MHz mediante `SPI_HZ`.

El tamaño del framebuffer se puede calcular directamente: 2bit por píxel y un byte almacena 2×2, es decir 4 píxeles, así que los 300×400 píxeles equivalen a 150 bytes por fila y 200 filas en total (cada fila corresponde a 2 filas de píxeles): `150 × 200 = 30000` bytes. Al arrancar, el programa reserva memoria apta para DMA con `heap_caps_malloc()` y, si falla, recurre al `malloc()` normal.

`writePoint()` convierte las coordenadas lógicas horizontales de 400×300 a las coordenadas nativas del framebuffer de 300×400. Con el valor por defecto `ROT180 = 1` se aplica además una simetría central, así que para cambiar la orientación de la pantalla toca primero esa macro, no `LCD_W` ni `LCD_H`.

`st7306_flush()` envía cada vez el framebuffer completo, en bloques de 1500 bytes. `loop()` redibuja continuamente la página actual: las páginas normales avanzan tras unos 3 segundos y `PAGE_REFRESH`, tras unos 6. El tiempo y los FPS de la página de contadores son valores acumulados desde el arranque, no datos de una sola página.

El driver de la versión ESP-IDF está repartido entre `main/st7306_color4.cpp`, `main/st73xx_ui.c` y `main/color4_demo.c`, y tiene más páginas. Esa parte queda para que el lector la estudie por su cuenta con el README del repositorio; este artículo no detalla los pasos de compilación con ESP-IDF.

## Solución de problemas: ST7306 sin imagen, orientación y colores

### La subida funciona, pero la pantalla no cambia en absoluto

Síntoma: el puerto serie ya muestra actividad y la pantalla sigue igual.

Causa: la alimentación, la masa común (GND), la orientación del FPC, un RS/DC mal conectado o señales SPI inestables pueden impedir que los comandos de inicialización lleguen correctamente a la pantalla; además, la pantalla reflectante no tiene retroiluminación y con poca luz ambiental también parece que no muestra nada.

Qué hacer: corta la alimentación y verifica la masa común y la orientación de los contactos del FPC; después enciende y mide si los pines 5 y 6 están a 3.3V (ver los pasos de comprobación anteriores). En la adaptadora del fabricante, GPIO14 va a RS. Observa la pantalla con buena luz y desde otro ángulo. Si todo lo anterior está bien, cambia `SPI_HZ` de `20000000` a `10000000`, acorta los cables de SCLK y MOSI y vuelve a subir.

### Versiones antiguas (v7.4 y anteriores): el serie imprime OK pero la pantalla no enciende

Síntoma: el puerto serie imprime `[DIAG] ST7306 0x09 = 0xFF OK` y la pantalla no muestra ninguna imagen.

Causa: esa línea de log no refleja el estado de la pantalla. Según la tabla de pines del FPC anterior, este módulo no tiene MISO/SDO, `SPI.begin(LCD_CLK, -1, LCD_MOSI, -1)` no asigna ningún pin a MISO y `SPI.transfer()` devuelve siempre `0xFF`, sin importar qué registro se lea ni si el CS está seleccionado (probé `0x04`, `0x0A`, `0xDA` y `0xA5`, y también con el CS permanentemente en alto: igual). Al poner el pin MOSI como entrada y leer manualmente, con pull-up sale todo unos y con pull-down todo ceros, lo que también indica que la pantalla no maneja la línea de datos durante los comandos de lectura.

Qué hacer: actualiza a la v7.5, donde esa línea ya se eliminó. Los logs serie de la v7.5 no reflejan el estado de la pantalla: para juzgar el enlace, mira solo si la pantalla muestra imagen, y vuelve a revisar alimentación, masa común (GND), orientación del FPC y pin RS.

### El ST7306 funciona a veces, muestra imagen corrupta o cambia con cada encendido

Síntoma: a veces muestra imagen, a veces aparece imagen corrupta, o el resultado cambia al volver a encender.

Causa: cables SPI demasiado largos o una masa común con mal contacto provocan errores de datos durante la transmisión; cuanto más largos los cables y más alto el reloj, más fácil es perder bytes (es una valoración basada en la experiencia; no he hecho pruebas cuantitativas).

Qué hacer: primero acorta los cables a menos de 10cm y confirma que GND tiene dos o más conexiones, no una sola hebra fina haciendo de masa. Después prueba a bajar `SPI_HZ` de 20MHz a 10MHz y, si se estabiliza, sube poco a poco. No empieces borrando o modificando comandos de inicialización al azar.

### La orientación horizontal del ST7306 está invertida

Síntoma: el texto o los gráficos aparecen girados 180°, pero las proporciones son correctas.

Causa: el código actual usa por defecto `ROT180 = 1` y puede que tu forma de colocar la pantalla sea la opuesta a la del ejemplo.

Qué hacer: tras subir, mira la página HELLO WORLD: si el texto está derecho, no toques nada; si toda la pantalla está invertida 180°, cambia `#define ROT180 1` por `#define ROT180 0` y vuelve a subir. Para comprobar por separado la orientación y las coordenadas, pon `DIAG_MODE` en `true`: el programa dibujará solo un cuadrado negro de 50×50; con la orientación correcta debe ser un cuadrado perfecto situado en la zona superior izquierda de la imagen. Este modo solo sirve para comprobar orientación y mapeo; si la pantalla no enciende en absoluto, no te ayudará.

### Proporciones o posición anómalas en el ST7306

Síntoma: el cuadrado sale deformado, los patrones aparecen fragmentados o la posición no es la esperada.

Causa: suele ocurrir después de modificar `LCD_W`, `LCD_H`, las macros del layout del framebuffer o `writePoint()`, o al usar el código con otro módulo ST7306; con la v7.5 sin modificar no debería pasar en este módulo. El mapeo entre las coordenadas lógicas de 400×300 y el framebuffer nativo de 300×400 lo hace `writePoint()`; no se arregla cambiando las macros de resolución.

Qué hacer: mantén `LCD_W = 400` y `LCD_H = 300`, activa primero `DIAG_MODE` para comprobar el cuadrado y después revisa el cálculo de `rx`, `ry` y los planos de bits en `writePoint()`.

### Los colores del ST7306 no son los esperados

Síntoma: el rojo, el cian o los patrones de relleno no salen como se espera.

Causa: este módulo solo tiene cuatro estados (blanco, cian, rojo y negro) y los dos bits de color van intercalados dentro del byte. Otros módulos ST7306 pueden implementar los colores de forma distinta.

Qué hacer: ejecuta primero la página de barras de cuatro colores para confirmar los cuatro estados básicos y después revisa la escritura de color en `writePoint()`. Desde la v7.4, el byte de relleno de `PAGE_CYAN` es `0x33`; si con una versión antigua ves rayas alternas, actualiza el código o cambia solo ese punto.

### Arduino IDE dice que no encuentra `esp_heap_caps.h`

Síntoma: error de cabecera no encontrada durante la compilación.

Causa: la placa o el Core seleccionados no son los correctos. Esa cabecera pertenece al ESP32 Arduino Core, no es una librería de terceros independiente.

Qué hacer: confirma que tienes instalado `esp32 by Espressif Systems` y que en el menú de placas has elegido un ESP32-S3, no un Arduino Uno u otra arquitectura. Si el Core está dañado, anota la versión actual, reinstálalo y vuelve a seleccionar placa y puerto.

### No se ven logs serie tras subir al ESP32-S3

Síntoma: puede que la pantalla ya muestre páginas, pero el monitor serie está vacío.

Causa: baudios, dispositivo serie o configuración de USB CDC que no coinciden, o el puerto ocupado por otro programa.

Qué hacer: pon los baudios a 115200 y cierra cualquier otro monitor que ocupe el puerto. Después compara con los valores de menú de este ejemplo: `USB CDC On Boot = Enabled`, `USB Mode = Hardware CDC and JTAG`, con un dispositivo serie del tipo `/dev/cu.usbmodem1401` (un puerto COM en Windows). Si tu placa usa el chip USB-serie a bordo en lugar del USB nativo, pon `USB CDC On Boot` en `Disabled`; con ese conexionado `USB Mode` apenas influye, déjalo por defecto.

## FAQ: dudas frecuentes sobre ESP32-S3 con ST7306

**P: ¿Puedo conectar el ST7306 a otros pines del ESP32-S3?**  
R: Sí: modifica `LCD_CS`, `LCD_RST`, `LCD_CLK`, `LCD_MOSI` y `LCD_RS` dentro de la rama `PINSET = 1` del `.ino`, y cambia el cableado en consecuencia. Que un GPIO concreto sea utilizable depende de los pines expuestos por la placa y de la configuración de arranque; no lo he verificado placa por placa. Por ejemplo, en la N16R8 los GPIO35～37 los ocupa la PSRAM Octal: hay que evitarlos si activas la PSRAM. La rama `PINSET = 0` del código ofrece además el grupo alternativo CS=38, RESET=41, SCLK=39, MOSI=42, RS=40.

**P: ¿Se puede cambiar el reloj SPI del ST7306?**  
R: El ejemplo usa por defecto `SPI_HZ = 20000000`, es decir 20MHz. Si la comunicación es inestable, prueba primero con `10000000`. La documentación del proyecto recoge que el manual v0.1 del ST7306 fija un periodo mínimo del reloj de escritura de 30ns, unos 33.3MHz; en un módulo real hay que contar además con las pistas y la placa adaptadora, y no he medido el límite estable de esta placa.

**P: ¿Puedo alimentar el YDP420H005-V3 con 5V?**  
R: No. Los pines 5 y 6 del FPC del módulo van a 3.3V y la lógica también trabaja a 3.3V. Conecta ambos pines de alimentación y comparte la masa común (GND) entre la placa y el módulo. Con el módulo sin alimentación, no sigas enviándole señales GPIO.

**P: ¿Cuánta RAM ocupa este ejemplo del ST7306 y cuántos FPS alcanza?**  
R: El framebuffer completo son 30000 bytes; además, el programa usa memoria para la fuente de mapa de bits, variables locales y el propio funcionamiento del Arduino Core. Cada refresco envía los 30000 bytes completos; a 20MHz, contando solo la carga útil del SPI, el tiempo teórico de transmisión es de unos 12ms, sin el coste del dibujo ni de los comandos. No he registrado los FPS reales. La página de contadores muestra la media acumulada de todas las páginas desde el arranque, no la tasa de una sola página; el propio dibujo (llamadas a `writePoint()` píxel a píxel) también consume tiempo, así que el tiempo real por fotograma será mayor que 12ms.

**P: ¿Puedo usar directamente otra pantalla que también lleve ST7306?**  
R: No está garantizado. Este ejemplo está pensado para el FPC de 21 pines del YDP420H005-V3, su secuencia de inicialización, su framebuffer de 300×400 y sus cuatro estados de visualización actuales. Otros módulos pueden cambiar la alimentación, el direccionamiento, los colores o los parámetros de inicialización: consulta primero su hoja de especificaciones.

**P: El ST7306 está bien cableado pero no muestra nada, ¿por dónde empiezo?**  
R: Primero, sin alimentación, revisa la masa común, la orientación del FPC y las cinco señales obligatorias, y confirma que en la adaptadora del fabricante GPIO14 va a RS; después enciende, mide 3.3V y observa con buena luz. Si sigue sin imagen, baja el SPI a 10MHz. `DIAG_MODE` solo sirve para comprobar orientación y mapeo; si la pantalla no enciende en absoluto, aporta poco.

**P: ¿Hay que conectar el TE y el MISO del ST7306?**  
R: TE es una salida de sincronización de fotograma; este ejemplo no la lee, así que puede quedar sin conectar. Para escribir en la pantalla solo se usa MOSI, y el FPC tampoco tiene MISO/SDO, por lo que este ejemplo no dispone de autocomprobación leyendo registros. En las versiones antiguas del ejemplo, `lcd_read_reg(0x09)` devolvía siempre `0xFF`, sin relación con el estado de la pantalla; en la v7.5 ya se eliminó (ver la sección de solución de problemas).

**P: ¿Puedo usar esta pantalla ST7306 con ESP-IDF?**  
R: El propio directorio del proyecto (`Handbook/ESP-IDF/420-…`) es un proyecto ESP-IDF; el registro de desarrollo indica que compila sin avisos con ESP-IDF v6.0.2 e incluye una demo de 20 páginas y funciones de dibujo. Este artículo no ha vuelto a ejecutar esa compilación ni desarrolla un tutorial de ESP-IDF; puedes estudiarlo por tu cuenta siguiendo el README del repositorio.

## Ideas para seguir: modifica el ejemplo del ST7306

- Sustituye la fuente de mapa de bits de 5×7 de `draw_text()` por tu propia librería de fuentes matriciales y monta un panel de estado de cuatro colores.
- Añade a las páginas existentes una estrategia de actualización parcial y mide de verdad el tiempo de refresco y el resultado visual.
- Conecta la señal TE, estudia cómo programar el momento del refresco y observa los cambios en las páginas con movimiento.
- Compara la demo de 20 páginas de ESP-IDF con la versión Arduino y extrae las funciones de dibujo que necesites para tu propia aplicación.

## Referencias: ESP32-S3, ST7306 y Arduino

- [Página del proyecto LingShunLAB](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek): origen del cableado, el código y la documentación de este artículo.
- [Código fuente del ejemplo Arduino IDE v7.5](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/ArduinoIDE/esp32s3-st7306-bringup/esp32s3-st7306-bringup.ino): el `.ino` completo.
- [Hoja de especificaciones del módulo YDP420H005-V3](https://github.com/ling3ye/LingShunLAB/blob/main/Handbook/ESP-IDF/420-RLCD-BWBR-400x300-ST7306-YDP420H005-Osptek/docs/YDP420H005-V3.pdf): parámetros del módulo, dibujo mecánico y definición del FPC.
- [Lista oficial de productos Sitronix ST7306](https://www.sitronix.com.tw/en/products/industrial-display-driver-ic/ultra-low-power-tft-driver-ic/): página de los IC de driver TFT de consumo ultrabajo de Sitronix.
- [Manual del controlador ST7306 v0.1 (proporcionado por el fabricante del módulo)](https://admin.osptek.com/uploads/ST_7306_V0_1_c30c3541a3.pdf): interfaz, registros, framebuffer y temporización; el repositorio también guarda una copia en `docs/`.
- [Código de ejemplo original de Osptek](https://gitee.com/osptek/display-rlcd-4.2inch-300x400/tree/main/examples): ejemplos de visualización relacionados, del fabricante.
- [Página oficial del producto Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3) y [datasheet oficial](https://documentation.espressif.com/esp32-s3_datasheet_en.html): documentación del chip principal.
- [GitHub del esp32 Arduino Core](https://github.com/espressif/arduino-esp32) y [documentación oficial de instalación](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html): paquete de soporte de placas y método de instalación.
