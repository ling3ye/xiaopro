---
title: "ESP32-S3 controla el papel electrónico de seis colores EPD037A02 (JD7601): demostración única de tres pantallas con Hello, un horario en inglés y una foto preconvertida (SPI + Arduino)"
boardId: esp32s3
moduleId: display/epd-3inch7-epd037a02-jd7601
category: esp32
date: 2026-11-20
intro: "Controla el papel electrónico de seis colores EPD037A02 con ESP32-S3 y Adafruit GFX. Incluye el cableado SPI, la configuración de Arduino y el código completo para mostrar Hello, un horario en inglés y una foto ya convertida en tres pantallas. Ideal para quienes ya han subido programas con Arduino y quieren aprender a controlar papel electrónico de seis colores y convertir fotos."
image: "https://img.lingflux.com/2026/11/ff03861dd789ec83465baba962075e98.jpg"
---

Dificultad: ⭐⭐ (basta con experiencia subiendo programas con Arduino)<br>
Tiempo: la primera vez, cablear, instalar bibliotecas y subir el programa lleva unos 30 minutos (estimación, sin cronometrar). Las tres pantallas tardan aproximadamente 1–1,5 minutos (15–25 segundos de refresco completo por pantalla, más dos pausas de 3 segundos).<br>
Entorno de pruebas: Arduino IDE 2.3.8; esp32 Arduino Core 3.3.10; Adafruit GFX Library 1.13.0

> **Resumen en una frase**: controla el papel electrónico de seis colores EPD037A02 con ESP32-S3, SPI y Adafruit GFX para mostrar, en orden, Hello, un horario en inglés y una foto.

## Inicio rápido

- Descarga la carpeta completa `EPD_3in7_Showcase_JD7601` desde [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601) (está en `Handbook/Arduino/ESP32-S3/` del repositorio LingShunLAB; puedes clonar el repositorio o descargar su ZIP completo). El `.ino` principal, los `.h/.cpp` del controlador y `photo_data.h` deben estar en esta carpeta, cuyo nombre debe coincidir con el del archivo `.ino` principal.
- Cableado: conecta BUSY, RST, DC, CS, MOSI y SCK a GPIO7, 8, 9, 10, 11 y 12, respectivamente; VDD a 3.3 V y GND a la tierra común de la placa.
- Instala esp32 Arduino Core 3.3.10, Adafruit GFX Library 1.13.0 y su dependencia Adafruit BusIO 1.17.4.
- Selecciona `ESP32S3 Dev Module` como placa, compila y sube el programa, y abre el monitor serie a 115200.
- `HOLD_MS` vale 3000 ms por defecto: es la espera adicional después de refrescar cada pantalla, no el intervalo entre cambios de pantalla.

## Introducción

Quería hacer una tarjeta de demostración de papel electrónico con ESP32-S3: primero mostraría Hello, después un horario en inglés y, por último, se quedaría en una foto.

Mi OSPTEK EPD037A02 es una pantalla SPI de seis colores y 480×720. GxEPD2 no incluye un controlador para esta pantalla, así que escribí el controlador del panel, encargado únicamente de la temporización SPI y el formato de trama de JD7601. Adafruit GFX se ocupa del texto y los gráficos. Este artículo incluye el cableado, la configuración de bibliotecas y el código completo de las tres pantallas.

## Resultado final

El programa reproduce una sola vez la secuencia Hello → horario en inglés → foto. Tras refrescar cada una de las dos primeras pantallas, espera 3000 ms; al final se queda en la foto y `loop()` no vuelve a refrescar la pantalla.

![](https://img.lingflux.com/2026/11/dc08d160b6bc55bc5a237bcadf4abc9f.jpg)



## Descripción de los componentes
### Papel electrónico de seis colores EPD037A02

EPD037A02 es un módulo de papel electrónico de seis colores y 3.7 pulgadas de OSPTEK. El papel electrónico muestra los colores con luz ambiental y conserva la imagen sin alimentación. En este ejemplo se usa para mostrar texto, bloques de seis colores, un horario y una foto ya convertida.

Solo dispone de negro, blanco, amarillo, rojo, azul y verde; no tiene escala de grises. Los tonos intermedios de una foto se simulan entremezclando píxeles de distintos colores. Por eso no se puede enviar un JPG directamente a la pantalla: primero hay que convertirlo al formato de trama del panel.

| Parámetro | Especificación |
| --- | --- |
| Modelo | EPD037A02 |
| Tamaño y resolución | 3.7 pulgadas, 480×720 |
| Colores | Negro, blanco, amarillo, rojo, azul y verde |
| Formato de píxel | 4 bit/píxel, dos píxeles por byte |
| Interfaz | SPI de 4 hilos, 1 conector de 8 pines de 2.54 mm |
| Tiempo de refresco completo | Aproximadamente 15–25 segundos |
| Alimentación | 3.3 V |

Esta pantalla permite probar texto, gráficos y fotos de seis colores en una sola demostración. La desventaja es su refresco lento, que impide hacer animaciones.

## Lista de materiales

| Material | Cantidad | Notas |
| --- | --- | --- |
| Placa de desarrollo ESP32-S3 | 1 | En este ejemplo se selecciona `ESP32S3 Dev Module` |
| Módulo EPD037A02 y placa adaptadora SPI | 1 | Papel electrónico de seis colores y 480×720 |
| Cables Dupont de 2.54 mm | 8 | 6 de señal, 1 de alimentación y 1 de tierra |
| Cable de datos USB | 1 | Alimentación, carga del programa y monitor serie |

### Descripción de los pines

| Pin de la pantalla | Dirección | Función |
| --- | --- | --- |
| BUSY | Pantalla → ESP32-S3 | Nivel alto: inactiva; nivel bajo: ocupada |
| CS | ESP32-S3 → pantalla | Selección de chip, activa a nivel bajo y controlada manualmente por el programa |
| DC | ESP32-S3 → pantalla | Nivel bajo para comandos y nivel alto para datos |
| RST | ESP32-S3 → pantalla | Reinicio, activo a nivel bajo |
| SDA / MOSI | ESP32-S3 → pantalla | Datos SPI |
| CLK / SCK | ESP32-S3 → pantalla | Reloj SPI |
| VDD | Alimentación | Solo 3.3 V |
| GND | Alimentación | Tierra común con la placa |

Esta pantalla solo recibe datos y no devuelve ninguno, así que MISO no necesita conexión. BS0 de la placa adaptadora está conectado a tierra mediante una resistencia de 10 kΩ, lo que fija el modo SPI de 4 hilos. Este modo necesita DC para distinguir comandos y datos, por lo que ese pin es imprescindible.

## Cableado

Desconecta primero la alimentación de la placa y realiza las conexiones según la tabla.

| Pin de la pantalla | ESP32-S3 | Uso |
| --- | --- | --- |
| BUSY | GPIO7 | Leer el estado de ocupado/inactivo del panel |
| CS | GPIO10 | Selección manual de chip |
| DC | GPIO9 | Distinguir comandos y datos |
| RST | GPIO8 | Reinicio del panel |
| SDA / MOSI | GPIO11 | Datos SPI |
| CLK / SCK | GPIO12 | Reloj SPI |
| VDD | 3.3 V | Alimentación del módulo |
| GND | GND | Tierra común |

**VDD solo debe conectarse a 3.3 V, nunca a 5 V.** Después de cablear, revisa cada conexión y comprueba especialmente que SDA y CLK no estén intercambiados.

Una vez conectado todo:

1. Conecta la placa por USB y selecciona `ESP32S3 Dev Module` y el puerto correspondiente en Arduino IDE.
2. Abre el ejemplo completo, compílalo y súbelo.
3. Abre el monitor serie a 115200 baudios. Si no aparecen los primeros mensajes, pulsa RESET en la placa para reiniciar el programa. La secuencia solo se reproduce una vez, por lo que, si abres el monitor demasiado tarde, te perderás la salida anterior.
4. El puerto serie debe mostrar, en orden: información del búfer de trama, finalización de la inicialización del panel, dos mensajes de «refresco completado» (la pantalla de la foto no imprime el tiempo de refresco) y, por último, `Done. Last picture stays on screen.`. Al mismo tiempo, la pantalla debe mostrar las tres imágenes en orden. Solo si ambas cosas ocurren correctamente, el ejemplo funciona.

## Bibliotecas necesarias

Busca `esp32` en el «Gestor de placas» de Arduino IDE e instala esp32 Arduino Core de Espressif Systems; este artículo utiliza la versión 3.3.10.

Después, busca e instala las siguientes bibliotecas en el «Gestor de bibliotecas». Si al instalar Adafruit GFX se ofrece instalar dependencias, selecciona instalarlas todas para incluir también Adafruit BusIO.

| Biblioteca | Versión probada | Origen |
| --- | --- | --- |
| Adafruit GFX Library | 1.13.0 | [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library) |
| Adafruit BusIO | 1.17.4 | [Adafruit_BusIO](https://github.com/adafruit/Adafruit_BusIO) |
| SPI | Incluida con esp32 Core 3.3.10 | Incluida con [arduino-esp32](https://github.com/espressif/arduino-esp32); no requiere instalación aparte |
| EPD037A02_GFX | Sin versión indicada | Incluida en este proyecto, en el mismo directorio que el `.ino` principal; no la copies al directorio de bibliotecas |

Adafruit GFX dibuja texto y gráficos. `EPD037A02_GFX` se encarga de inicializar el panel, transmitir por SPI, codificar los seis colores y refrescar. Los comandos varían según el modelo de panel, por lo que esta capa no puede sustituirse directamente por la biblioteca de otro papel electrónico.

## Código completo

El código fuente del ejemplo está en [GitHub](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601). La carpeta y el archivo principal se llaman `EPD_3in7_Showcase_JD7601`; ambos nombres deben coincidir para que Arduino IDE pueda abrirlo. Los archivos principales son:

```text
EPD_3in7_Showcase_JD7601/
├── EPD_3in7_Showcase_JD7601.ino
├── EPD037A02_GFX.h
├── EPD037A02_GFX.cpp
├── photo_data.h
└── tool/
    ├── epd_photo.py                  # Script de conversión de fotos
    └── 02-driver-dog-car-480x720.png # Imagen original de la foto de ejemplo
```

A continuación se incluye el código de los tres primeros archivos. `photo_data.h` tiene más de diez mil líneas y no se reproduce aquí; descárgalo del repositorio, porque sin él el programa no compila.

Contiene un array `photo_driver` de 172800 bytes, generado a partir de `tool/02-driver-dog-car-480x720.png`. Almacena la trama del panel ya convertida, no el contenido del archivo PNG.

El código siguiente tiene la misma lógica que el fuente del repositorio; solo se han ajustado algunos comentarios. El repositorio es la referencia definitiva.

### Programa principal EPD_3in7_Showcase_JD7601.ino

```cpp
/*
 * EPD_3in7_Showcase — Hello + horario en inglés + una foto
 * Pantalla: OSPTEK 3.7" E6, 480×720, JD7601
 * Controlador: ESP32-S3
 *
 * Si estás empezando, solo necesitas modificar este archivo. Usa las fuentes
 * incluidas con Adafruit GFX; no tienes que crear tus propias fuentes.
 * Instalación: busca Adafruit GFX Library en el gestor de bibliotecas de Arduino IDE.
 * Apertura: descarga toda la carpeta Showcase y abre este .ino; no copies solo el archivo principal.
 */

#include "EPD037A02_GFX.h"
#include "photo_data.h"

// Orden de pines: CS, DC, RST, BUSY, SCK, MOSI; la alimentación solo puede ser 3.3V.
EPD037A02_GFX epd(10, 9, 8, 7, 12, 11);
#define HOLD_MS 3000

// La coordenada y de la fuente 5×7 integrada está en el borde superior del texto;
// cada carácter ocupa 6×8 píxeles.
void text(const char *s, int x, int y, uint8_t size, uint8_t color) {
  epd.setFont();                 // Usa la fuente de GFX; no hace falta otro setFont(fuente)
  epd.setTextSize(size);
  epd.setTextColor(color);
  epd.setCursor(x, y);
  epd.print(s);
}

void textCenter(const char *s, int y, uint8_t size, uint8_t color) {
  int w = strlen(s) * 6 * size;
  text(s, (480 - w) / 2, y, size, color);
}

void drawHello() {
  epd.fillScreen(EPD_WHITE);
  epd.drawRect(0, 0, 480, 720, EPD_BLACK);
  textCenter("HELLO", 65, 9, EPD_BLACK);
  textCenter("WORLD", 150, 9, EPD_RED);
  epd.fillRect(40, 245, 400, 4, EPD_BLACK);

  // Los seis bloques también sirven para comprobar la asignación de colores y la orientación.
  const uint8_t colors[6] = {
    EPD_BLACK, EPD_WHITE, EPD_YELLOW, EPD_RED, EPD_BLUE, EPD_GREEN
  };
  const char *labels[6] = { "K", "W", "Y", "R", "B", "G" };
  for (int i = 0; i < 6; i++) {
    int x = 16 + i * 76;
    epd.fillRect(x, 295, 68, 110, colors[i]);
    epd.drawRect(x, 295, 68, 110, EPD_BLACK);
    text(labels[i], x + 22, 430, 4, EPD_BLACK);
  }
  textCenter("3.7INCH 480X720", 525, 4, EPD_BLACK);
  textCenter("E6 6-COLOR EPD", 570, 4, EPD_BLACK);
  textCenter("ESP32-S3 OK", 640, 4, EPD_BLUE);
}

// Para cambiar el horario, modifica únicamente estas líneas.
const char *subjects[6] = {
  "MATH", "CHINESE", "ENGLISH", "PHYSICS", "CHEMISTRY", "STUDY HALL"
};
const char *rooms[6] = {
  "ROOM 302", "ROOM 302", "AUDIO LAB", "PHYS LAB", "CHEM LAB", "ROOM 302"
};
const char *times[6] = { "08:00", "08:55", "NOW", "11:05", "14:00", "14:55" };
const uint8_t bars[6] = {
  EPD_BLUE, EPD_RED, EPD_RED, EPD_BLACK, EPD_YELLOW, EPD_WHITE
};

void drawAgenda() {
  epd.fillScreen(EPD_WHITE);
  epd.fillRect(0, 0, 480, 100, EPD_BLACK);
  text("MON - NOV 9", 24, 20, 4, EPD_WHITE);
  text("WEEK 12 - 6 CLASSES", 24, 65, 2, EPD_YELLOW);

  for (int i = 0; i < 6; i++) {
    int y = 115 + i * 92;
    bool now = (i == 2);
    epd.fillRoundRect(18, y, 444, 80, 5, now ? EPD_RED : EPD_WHITE);
    if (!now) epd.drawRoundRect(18, y, 444, 80, 5, EPD_BLACK);
    if (bars[i] != EPD_WHITE) epd.fillRect(20, y + 2, 9, 76, bars[i]);

    uint8_t fg = now ? EPD_WHITE : EPD_BLACK;
    text(subjects[i], 45, y + 12, 3, fg);
    text(rooms[i], 45, y + 47, 2, fg);
    text(times[i], 365, y + 25, 2, fg);
  }
  text("NEXT 11:05 PHYSICS", 20, 688, 2, EPD_BLACK);
}

bool showScreen(uint8_t index) {
  switch (index) {
    case 0: drawHello();  return epd.display();
    case 1: drawAgenda(); return epd.display();
    case 2: return epd.displayRawFrame(photo_driver, PHOTO_DRIVER_BYTES);
    default: return false;
  }
}

void setup() {
  // Paso 1: abre el puerto serie; después servirá para saber dónde se detiene el programa.
  Serial.begin(115200);
  delay(500);
  Serial.println("Showcase: Hello -> English agenda -> portrait");

  // Paso 2: asigna el búfer de trama, inicializa SPI y reinicia e inicializa el panel.
  if (!epd.begin()) {
    Serial.println("Init failed: check 3V3, GND, wiring and BUSY.");
    return;
  }

  // Paso 3: reproduce cada pantalla una vez. Si una falla, se detiene sin refrescar las demás.
  for (uint8_t i = 0; i < 3; i++) {
    if (!showScreen(i)) {
      Serial.println("Refresh failed; stopped. Check wiring and BUSY.");
      return;
    }
    if (i < 2) delay(HOLD_MS);   // Espera tras el refresco, no periodo entre pantallas
  }
  Serial.println("Done. Last picture stays on screen.");
}

void loop() {
  // Solo se reproduce una vez. Modifica subjects / rooms / times para cambiar el horario.
}

// Paso 4: impide en compilación usar tramas de fotos con dimensiones o longitud incorrectas.
static_assert(PHOTO_DRIVER_W == 480 && PHOTO_DRIVER_H == 720,
              "Photo must be 480x720");
static_assert(PHOTO_DRIVER_BYTES == EPD037A02_BUF_BYTES,
              "Photo must be 172800 bytes");
```

### Interfaz del controlador del panel EPD037A02_GFX.h

```cpp
/*
 * EPD037A02_GFX — Clase de controlador del panel para Adafruit_GFX
 * Papel electrónico OSPTEK 3.7" E6, 480×720, seis colores (JD7601 / IST7601 / IST7163)
 *
 * Aquí implementamos nuestra propia capa de panel y heredamos directamente
 * la capa gráfica de Adafruit_GFX.
 * Así se pueden usar directamente drawLine, fillCircle, setFont y print.
 *
 * MIT / CC BY 4.0, igual que el resto del material del repositorio.
 */

#ifndef EPD037A02_GFX_H
#define EPD037A02_GFX_H

#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>

/* --------------------------- Constantes del panel --------------------------- */

#define EPD037A02_WIDTH    480
#define EPD037A02_HEIGHT   720
#define EPD037A02_BUF_BYTES ((size_t)EPD037A02_WIDTH * EPD037A02_HEIGHT / 2) /* 172800 */

// Un byte contiene dos píxeles adyacentes de la misma columna.
// Si las pruebas muestran un desplazamiento de 1–2 px, cambia este valor a 1.
#ifndef EPD037A02_SWAP_NIBBLE
#define EPD037A02_SWAP_NIBBLE 0
#endif

// Valores de color de 4 bit de JD7601. 0x4 no es válido;
// no los escribas como una numeración continua de 0 a 5.
enum EPDColor : uint8_t {
  EPD_BLACK  = 0x0,
  EPD_WHITE  = 0x1,
  EPD_YELLOW = 0x2,
  EPD_RED    = 0x3,
  EPD_BLUE   = 0x5,
  EPD_GREEN  = 0x6,
};

/* ------------------------------ Clase del controlador ------------------------------ */
/*
 * Uso:
 *   EPD037A02_GFX display(10, 9, 8, 7);    // cs, dc, rst, busy
 *   display.begin();                       // Asignar búfer + reiniciar + INIT
 *   display.setRotation(0);                // 0/2 = 480×720, 1/3 = 720×480
 *   display.fillScreen(EPD_WHITE);
 *   display.setFont(&FreeSansBold24pt7b);
 *   display.setCursor(20, 120);  display.print("Hello");
 *   display.display();                     // Enviar a pantalla + refresco completo (15–25 s)
 *
 * Los colores son índices de 4 bit: solo hay seis, no es RGB565.
 * También compila con valores de 16 bits, pero solo se usan los 4 bits inferiores
 * y el resultado carece de sentido.
 */
class EPD037A02_GFX : public Adafruit_GFX {
 public:
  EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                int8_t sck = -1, int8_t mosi = -1, SPIClass *spi = &SPI);
  ~EPD037A02_GFX();

  // Asigna el búfer de trama, inicializa GPIO/SPI y reinicia e inicializa el panel.
  // Devuelve false si falta memoria o BUSY no responde; la pantalla no cambia.
  bool begin(uint32_t spi_hz = 2000000);

  // Envía el búfer a la pantalla y hace un refresco completo.
  // Se bloquea durante 15–25 s y devuelve false si BUSY agota el tiempo de espera.
  bool display();

  // Envía directamente una trama nativa de 480×720 ya empaquetada,
  // sin asignar otro búfer para la foto.
  bool displayRawFrame(const uint8_t *frame, size_t bytes);

  // Suspensión profunda del panel. Para despertarlo, hay que volver a alimentarlo
  // o activar RST y ejecutar begin() de nuevo.
  bool sleep();

  // Solo limpia el búfer, sin refrescar inmediatamente.
  // Si quedan imágenes fantasma, puedes llamar a clear() y luego a display() para refrescar en blanco.
  void clear(uint16_t color = EPD_WHITE);

  // drawPixel es la función virtual pura exigida por Adafruit_GFX;
  // fillScreen se reimplementa con memset para mayor velocidad.
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void fillScreen(uint16_t color) override;

  // Cuantiza RGB al color más próximo de los seis disponibles; útil para imágenes sencillas.
  static uint8_t fromRGB(uint8_t r, uint8_t g, uint8_t b);

  uint8_t *buffer() const { return _buf; }
  bool ready() const { return _buf != nullptr; }
  uint32_t lastRefreshMs() const { return _lastRefreshMs; }
  void setVerbose(bool v) { _verbose = v; }

 private:
  int8_t _cs, _dc, _rst, _busy, _sck, _mosi;
  SPIClass *_spi;
  uint32_t _spiHz;
  uint8_t *_buf;
  uint32_t _lastRefreshMs;
  bool _verbose;

  void _alloc();
  void _spiSend(const uint8_t *buf, size_t len);
  void _cmd(uint8_t c);
  void _data(uint8_t d);
  void _dataBuf(const uint8_t *buf, size_t len);
  bool _waitBusy(const char *what, uint32_t timeout_ms = 60000);
  bool _reset();
  bool _initPanel();
};

#endif /* EPD037A02_GFX_H */
```

### Implementación del controlador del panel EPD037A02_GFX.cpp

```cpp
/*
 * EPD037A02_GFX.cpp — Capa del panel: SPI, temporización y formato de trama
 * Esta capa solo hace tres cosas: enviar bytes, esperar BUSY
 * y convertir (x,y) en un índice del búfer de trama.
 * Adafruit_GFX se encarga de gráficos, fuentes y rotación.
 */

#include "EPD037A02_GFX.h"

#include <string.h>
#include <pgmspace.h>

#if defined(ESP32)
#include <esp32-hal-psram.h>
#endif

namespace {
// Dos píxeles por byte: una columna vertical de 720 píxeles ocupa 360 bytes.
const size_t kColBytes  = EPD037A02_HEIGHT / 2;
const size_t kChunk     = 2048;    // Límite por transferencia SPI, igual que en el ejemplo del fabricante
const uint32_t kBusyTmo = 60000;   // El refresco completo tarda hasta 25 s; se deja margen
}  // namespace

EPD037A02_GFX::EPD037A02_GFX(int8_t cs, int8_t dc, int8_t rst, int8_t busy,
                             int8_t sck, int8_t mosi, SPIClass *spi)
    : Adafruit_GFX(EPD037A02_WIDTH, EPD037A02_HEIGHT),
      _cs(cs), _dc(dc), _rst(rst), _busy(busy), _sck(sck), _mosi(mosi),
      _spi(spi), _spiHz(2000000), _buf(nullptr), _lastRefreshMs(0),
      _verbose(true) {}

EPD037A02_GFX::~EPD037A02_GFX() {
  if (_buf) {
    free(_buf);   // La memoria asignada con ps_malloc también se libera con free()
    _buf = nullptr;
  }
}

/* ============================ Memoria / inicialización ============================ */

void EPD037A02_GFX::_alloc() {
  if (_buf) return;
#if defined(ESP32)
  if (psramFound()) _buf = (uint8_t *)ps_malloc(EPD037A02_BUF_BYTES);
#endif
  if (!_buf) _buf = (uint8_t *)malloc(EPD037A02_BUF_BYTES);
}

bool EPD037A02_GFX::begin(uint32_t spi_hz) {
  // Paso 1: obtén el búfer de trama de 172800 bytes y rellénalo de blanco.
  _spiHz = spi_hz;
  _alloc();
  if (!_buf) {
    if (_verbose) {
      Serial.printf("[EPD] Error al asignar el búfer de trama; se necesitan %u bytes\n",
                    (unsigned)EPD037A02_BUF_BYTES);
    }
    return false;
  }

  // malloc no pone la memoria a cero; rellénala de blanco para no enviar memoria sin inicializar.
  clear(EPD_WHITE);

  // Paso 2: configura los pines. CS se controla manualmente y MISO no se conecta.
  pinMode(_cs, OUTPUT);   digitalWrite(_cs, HIGH);
  pinMode(_dc, OUTPUT);   digitalWrite(_dc, HIGH);
  pinMode(_rst, OUTPUT);  digitalWrite(_rst, HIGH);
  pinMode(_busy, INPUT);

  // Orden de parámetros: SCK, MISO, MOSI, SS. Pasa -1 como SS; no cedas CS al periférico.
  _spi->begin(_sck, -1, _mosi, -1);

  if (_verbose) {
    Serial.printf("[EPD] Búfer de trama %u B, SPI %lu Hz\n",
                  (unsigned)EPD037A02_BUF_BYTES, (unsigned long)_spiHz);
  }

  // Paso 3: reinicia el panel y envía los comandos de inicialización.
  return _initPanel();
}

bool EPD037A02_GFX::_initPanel() {
  if (!_reset()) return false;

  _cmd(0xE9); _data(0x01);   // INIT del fabricante: comando de inicialización de JD7601

  if (_verbose) Serial.println("[EPD] Inicialización del panel completada");
  return true;
}

/* ================================ SPI de bajo nivel ================================ */

void EPD037A02_GFX::_spiSend(const uint8_t *buf, size_t len) {
  digitalWrite(_cs, LOW);
  _spi->beginTransaction(SPISettings(_spiHz, MSBFIRST, SPI_MODE0));
  _spi->writeBytes(buf, len);
  _spi->endTransaction();
  digitalWrite(_cs, HIGH);
}

void EPD037A02_GFX::_cmd(uint8_t c) {
  digitalWrite(_dc, LOW);    // DC=L: comando
  _spiSend(&c, 1);
}

void EPD037A02_GFX::_data(uint8_t d) {
  digitalWrite(_dc, HIGH);   // DC=H: datos
  _spiSend(&d, 1);
}

void EPD037A02_GFX::_dataBuf(const uint8_t *buf, size_t len) {
  digitalWrite(_dc, HIGH);
  while (len) {
    size_t n = (len > kChunk) ? kChunk : len;
    _spiSend(buf, n);
    buf += n;
    len -= n;
  }
}

// BUSY alto = inactiva, bajo = ocupada. El texto de Note 6-4 de la hoja de datos
// lo indica al revés; se siguen la tabla de pines y las pruebas reales.
bool EPD037A02_GFX::_waitBusy(const char *what, uint32_t timeout_ms) {
  uint32_t t0 = millis();
  while (digitalRead(_busy) == LOW) {
    if (millis() - t0 > timeout_ms) {
      if (_verbose) Serial.printf("[EPD] Tiempo de espera de BUSY agotado: %s\n", what);
      return false;
    }
    delay(2);
  }
  return true;
}

// Secuencia RESET del fabricante: bajo 20 → alto 10 → bajo 20 → alto 10 ms;
// después, espera BUSY.
bool EPD037A02_GFX::_reset() {
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);
  digitalWrite(_rst, LOW);  delay(20);
  digitalWrite(_rst, HIGH); delay(10);

  if (digitalRead(_busy) == LOW) {
    if (_verbose) Serial.println("[EPD] Esperando a que BUSY suba (máx. 10 s); si agota el tiempo, revisa 3V3 / GND / cable plano");
    if (!_waitBusy("reset", 10000)) return false;
  }
  delay(10);
  return true;
}

/* ============================== Proceso de refresco ============================== */

bool EPD037A02_GFX::display() {
  if (!_buf) return false;
  uint32_t t0 = millis();

  _cmd(0x10);                             // DTM: preparar escritura en RAM
  if (!_waitBusy("DTM")) return false;
  _dataBuf(_buf, EPD037A02_BUF_BYTES);

  _cmd(0x04);                             // PON: activar alta tensión
  if (!_waitBusy("PON")) return false;
  delay(10);

  _cmd(0x12); _data(0x00);                // DRF: iniciar refresco
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;

  _cmd(0x02); _data(0x00);                // POF: desactivar alta tensión
  if (!_waitBusy("POF")) return false;
  delay(20);

  _lastRefreshMs = millis() - t0;
  if (_verbose) Serial.printf("[EPD] Refresco completado %lu ms\n", (unsigned long)_lastRefreshMs);
  return true;
}

bool EPD037A02_GFX::displayRawFrame(const uint8_t *frame, size_t bytes) {
  if (!frame || bytes != EPD037A02_BUF_BYTES) return false;

  _cmd(0x10);
  if (!_waitBusy("DTM")) return false;

  // Copia 2048 bytes cada vez de Flash a RAM y luego los envía por SPI;
  // no permite que DMA lea directamente de Flash.
  uint8_t chunk[kChunk];
  digitalWrite(_dc, HIGH);
  for (size_t off = 0; off < bytes; off += sizeof(chunk)) {
    size_t n = bytes - off;
    if (n > sizeof(chunk)) n = sizeof(chunk);
    memcpy_P(chunk, frame + off, n);
    _spiSend(chunk, n);
  }

  _cmd(0x04);
  if (!_waitBusy("PON")) return false;
  delay(10);
  _cmd(0x12); _data(0x00);
  delay(10);
  if (!_waitBusy("DRF", kBusyTmo)) return false;
  _cmd(0x02); _data(0x00);
  if (!_waitBusy("POF")) return false;
  delay(20);
  return true;
}

bool EPD037A02_GFX::sleep() {
  _cmd(0x07); _data(0xA5);
  if (_verbose) Serial.println("[EPD] Suspensión profunda activada");
  return true;
}

/* ==================================== Dibujo ==================================== */

void EPD037A02_GFX::clear(uint16_t color) {
  if (!_buf) return;
  uint8_t c = (uint8_t)(color & 0x0F);
  memset(_buf, (int)((c << 4) | c), EPD037A02_BUF_BYTES);
}

void EPD037A02_GFX::fillScreen(uint16_t color) { clear(color); }

void EPD037A02_GFX::drawPixel(int16_t x, int16_t y, uint16_t color) {
  if (!_buf) return;
  if (x < 0 || y < 0 || x >= _width || y >= _height) return;

  // Convierte primero las coordenadas lógicas, afectadas por rotation,
  // a las coordenadas naturales del panel.
  int16_t dx, dy;
  switch (rotation & 3) {
    case 0:  dx = x;                 dy = y;                 break;
    case 1:  dx = WIDTH - 1 - y;     dy = x;                 break;
    case 2:  dx = WIDTH - 1 - x;     dy = HEIGHT - 1 - y;    break;
    default: dx = y;                 dy = HEIGHT - 1 - x;    break;
  }

  // El panel almacena los datos por columnas verticales y recorre cada columna
  // de abajo arriba, por lo que también hay que reflejar Y.
  // Si se escribe por filas horizontales, la imagen gira 90° y se repite desplazada.
  const int16_t fy = HEIGHT - 1 - dy;
  size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);

#if EPD037A02_SWAP_NIBBLE
  const bool lowNibble = ((fy & 1) == 0);
#else
  const bool lowNibble = ((fy & 1) != 0);
#endif

  // Divide el byte en dos nibbles y modifica solo el del píxel de destino.
  const uint8_t c = (uint8_t)(color & 0x0F);
  if (lowNibble) _buf[i] = (uint8_t)((_buf[i] & 0xF0) | c);
  else           _buf[i] = (uint8_t)((_buf[i] & 0x0F) | (c << 4));
}

/* ========================= Cuantización de RGB a seis colores ========================= */

struct EPDRgbRef { uint8_t r, g, b, code; };

// Los colores de referencia reproducen la apariencia típica de Spectra 6 / E6;
// algo más oscuros se parecen más a lo que percibe el ojo.
static const EPDRgbRef kRefs[6] = {
    {  0,   0,   0, EPD_BLACK  },
    {255, 255, 255, EPD_WHITE  },
    {255, 232,   0, EPD_YELLOW },
    {190,  30,  45, EPD_RED    },
    { 35,  70, 150, EPD_BLUE   },
    { 40, 110,  60, EPD_GREEN  },
};

uint8_t EPD037A02_GFX::fromRGB(uint8_t r, uint8_t g, uint8_t b) {
  // Distancia euclidiana ponderada, con mayor peso para el verde.
  int32_t best = INT32_MAX;
  uint8_t code = EPD_BLACK;
  for (int k = 0; k < 6; k++) {
    int32_t dr = (int32_t)r - kRefs[k].r;
    int32_t dg = (int32_t)g - kRefs[k].g;
    int32_t db = (int32_t)b - kRefs[k].b;
    int32_t d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < best) { best = d; code = kRefs[k].code; }
  }
  return code;
}
```

### Explicación del código

**Cómo se almacenan los píxeles.** `drawPixel()` es la parte más fácil de escribir mal. La pantalla es de 480×720, con 4 bit por píxel, por lo que una trama ocupa 480×720÷2 = 172800 bytes.

A diferencia de las pantallas convencionales, que se escriben por filas, esta recibe los datos por columnas verticales: hay 480 columnas de 360 bytes y cada columna se recorre de abajo arriba. Por eso el código primero refleja Y con `fy = HEIGHT-1-dy` y luego calcula la posición del byte con `i = dx*360 + (fy>>1)`.

**Codificación de colores.** Los códigos de los seis colores no son consecutivos: negro, blanco, amarillo y rojo son `0x0～0x3`; azul y verde son `0x5` y `0x6`, mientras que `0x4` no es válido. Al dibujar, usa enumeraciones como `EPD_BLACK` en lugar de introducir tus propios números.

**Cómo se refrescan las tres pantallas.** El bucle `for` de `setup()` se ejecuta tres veces. Las dos primeras pantallas se dibujan en el búfer de trama y después se envían y refrescan con `display()`. La tercera llama a `displayRawFrame()`, que copia los datos de `photo_data.h` de Flash a RAM en bloques de 2048 bytes y los envía por SPI.

**Memoria.** La pantalla de la foto no utiliza el búfer de trama, pero las dos primeras sí, de modo que el programa siempre necesita 172800 bytes para ese búfer. Si hay PSRAM, se usa preferentemente; si no hay o la asignación falla, se utiliza la RAM interna.

**Tiempo de espera.** Cada pantalla tarda 15–25 segundos en refrescarse; `HOLD_MS` es únicamente la espera adicional posterior. Por tanto, el intervalo real entre las dos primeras pantallas es el tiempo de refresco más 3 segundos. El programa no reproduce la secuencia en bucle; para repetirla, pulsa RESET en la placa.

**Modificar el horario.** Edita los arrays `subjects`, `rooms` y `times`; sus seis filas se corresponden una a una. `bars` define el color de la barra izquierda de cada fila. La «clase actual» resaltada siempre es la tercera fila (`i == 2`). La fecha del título, `WEEK 12` y `NEXT 11:05 PHYSICS` del pie son textos fijos. El ejemplo no lee un reloj ni se actualiza automáticamente.

### Cómo convertir una foto en datos para el panel

La foto no se procesa en la placa. Primero el ordenador la convierte en una matriz de puntos de seis colores; el ESP32-S3 solo envía los datos ya convertidos a la pantalla.

```text
JPG/PNG → recorte centrado y escalado a 480×720
→ ajuste de exposición, contraste y saturación → tramado a seis colores → conversión a valores del panel
→ ordenación por columnas verticales, reflejo de Y y empaquetado de dos píxeles por byte
→ array de 172800 bytes (photo_data.h) → compilación en Flash
→ envío del ESP32-S3 a la pantalla por SPI
```

El tramado entremezcla píxeles de diferentes colores para que el ojo perciba la matriz como tonos de transición. No aumenta el número de colores: después de la conversión, cada píxel sigue siendo negro, blanco, amarillo, rojo, azul o verde. El script calcula las distancias de color según la apariencia real del papel electrónico (algo oscura), pero genera los valores de color del panel.

La disposición de píxeles y la codificación de colores ya se explicaron en «Cómo se almacenan los píxeles» y «Codificación de colores»; el script empaqueta los datos con las mismas reglas. Así, los datos generados pueden enviarse directamente al panel, sin que la placa tenga que decodificar JPG ni calcular el tramado.

### Cambiar la foto

Haz primero una copia de seguridad del `photo_data.h` original, porque el siguiente comando lo sobrescribirá. En el ordenador necesitas Python 3, Pillow y numpy (`pip install pillow numpy`). No hace falta instalarlos para ejecutar el ejemplo.

Ejecuta este comando en la carpeta del ejemplo:

```bash
cd EPD_3in7_Showcase_JD7601
python3 tool/epd_photo.py mi_foto.jpg --header photo_data.h --header-name photo_driver
```

- El nombre del array debe seguir siendo `photo_driver`. A partir de él, el script genera `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H` y `PHOTO_DRIVER_BYTES`, que usa el `static_assert` al final del programa principal.
- Por defecto, recorta la imagen centrada a 480×720. Si no quieres recortar los bordes, puedes añadir `--fit contain` (deja márgenes en blanco) o `--fit stretch` (estira y deforma).
- La salida siempre es de 480×720 y 172800 bytes. Después de generarla, vuelve a compilar y subir el programa; no necesitas subir un sistema de archivos.

## Solución de problemas frecuentes

### Error de compilación undefined reference to EPD037A02_GFX

Síntoma: el enlazador no encuentra funciones como `begin()` y `display()`.

Causa: `EPD037A02_GFX.cpp` no se está compilando. Arduino solo compila los `.cpp` del directorio raíz del sketch y del subdirectorio `src/`; los que están en otros subdirectorios, como `driver/`, no se compilan.

Solución: coloca el `.ino` principal y los `.h` y `.cpp` del controlador en el mismo directorio, vuelve a abrir el ejemplo y compílalo otra vez.

### El monitor serie no muestra nada

Síntoma: la carga termina, pero el puerto serie está en blanco.

Causa: velocidad en baudios incorrecta; USB CDC no habilitado al usar el puerto USB integrado; o monitor abierto demasiado tarde, cuando el programa ya había terminado de escribir.

Solución: configura 115200 baudios y comprueba el puerto. Si usas el USB integrado, pon `USB CDC On Boot` en `Enabled` en Arduino IDE y vuelve a subir el programa. También puedes usar el puerto UART según las instrucciones de la placa. Por último, pulsa RESET para reiniciar el programa.

### Hay salida serie, pero la pantalla permanece blanca

Síntoma: el programa se ejecuta, pero no aparece ninguna imagen.

Causa: habitualmente SDA y CLK están intercambiados, CS o DC están mal conectados, o falta la tierra común.

Solución: desconecta la alimentación y revisa los 8 cables uno por uno. Mide que VDD sea 3.3 V y comprueba la continuidad de GND. Además, el cuarto parámetro de `SPI.begin()` en el controlador debe ser `-1`; `_spiSend()` baja y sube CS manualmente.

### El puerto serie indica que BUSY agota el tiempo durante reset

Síntoma: el registro se detiene en «Esperando a que BUSY suba», después informa de un tiempo agotado en `reset` y finalmente muestra `Init failed`.

Causa: BUSY permanece a nivel bajo. La pantalla puede estar sin alimentación, BUSY puede estar mal conectado o suelto, o el cable plano puede tener mal contacto.

Solución: comprueba que VDD esté conectado a 3.3 V, que el cable plano esté completamente insertado y que BUSY vaya a GPIO7. Revisa esto primero, sin modificar el código de refresco. Después de corregirlo, vuelve a alimentar la placa y sube el programa.

### Tiempo agotado en DRF o zonas de la imagen corruptas

Síntoma: la inicialización es correcta, pero el refresco agota el tiempo o parte de la imagen aparece alterada.

Causas frecuentes: corriente de alimentación insuficiente, cables Dupont demasiado largos o velocidad SPI demasiado alta.

Solución: acorta los cables Dupont, revisa el contacto de tierra y prueba otro puerto USB o fuente con alimentación estable. Mantén la velocidad SPI predeterminada de 2 MHz. Si cambiaste el parámetro de `epd.begin()`, elimínalo para recuperar el valor predeterminado.

### La imagen gira 90° y aparecen unas tres repeticiones

Síntoma: se reconocen el texto y los bloques de color, pero la orientación es incorrecta y se repiten desplazados.

Causa: los datos de la trama están ordenados por filas, mientras que el panel los recibe por columnas verticales. El controlador de este artículo no debería causar este problema; suele ocurrir al modificarlo o usar una versión antigua.

Solución: comprueba que `drawPixel()` contenga `size_t i = (size_t)dx * kColBytes + (size_t)(fy >> 1);` y que `kColBytes = EPD037A02_HEIGHT / 2`, es decir, 360.

### La imagen no se repite, pero está invertida verticalmente

Síntoma: el orden de las letras es correcto, pero toda la imagen está volteada de arriba abajo.

Causa: el panel recorre cada columna de abajo arriba y al código le falta el reflejo de Y.

Solución: comprueba que `drawPixel()` contenga `const int16_t fy = HEIGHT - 1 - dy;` y que los cálculos posteriores de dirección y nibble usen `fy`. No te limites a invertir el orden de los bytes.

### Las líneas finas están desplazadas y los trazos parecen dientes de peine

Síntoma: la posición general es correcta, pero los píxeles adyacentes están desplazados 1–2 px.

Causa: puede estar invertido el orden de los nibbles alto y bajo dentro de cada byte.

Solución: cambia `EPD037A02_SWAP_NIBBLE` de `0` a `1` en `EPD037A02_GFX.h`. Esto solo intercambia el orden de los dos píxeles dentro del byte; no refleja toda la imagen.

### Error de compilación Photo must be 480x720 o Photo must be 172800 bytes

Síntoma: se activa uno de los dos `static_assert`.

Causa: el `photo_data.h` sustituido no es de 480×720 o la longitud de la trama no es de 172800 bytes.

Solución: vuelve a generarlo con el comando de conversión anterior y conserva `--header-name photo_driver`. Después comprueba que `PHOTO_DRIVER_W`, `PHOTO_DRIVER_H` y `PHOTO_DRIVER_BYTES` sean 480, 720 y 172800, respectivamente.

## FAQ

**¿Puedo usar otros pines para conectar EPD037A02?**

Sí. Modifica también el cableado y `EPD037A02_GFX epd(10, 9, 8, 7, 12, 11)`; el orden de los parámetros es CS, DC, RST, BUSY, SCK, MOSI. En ESP32-S3 conviene evitar GPIO0, 45 y 46 (relacionados con el arranque), GPIO19 y 20 (USB) y GPIO26～37 (ocupados por Flash/PSRAM); consulta además el esquema de tu placa. Solo he compilado con el grupo GPIO7～12 y no he probado otros pines.

**¿Qué velocidad SPI utiliza? ¿Se puede cambiar a 8 MHz?**

Este ejemplo usa 2 MHz por defecto, Mode 0 y bit más significativo primero. Para aumentarla, cambia el parámetro de `epd.begin()`, por ejemplo `epd.begin(4000000)`; conviene empezar con 4 MHz. Si aparecen puntos de ruido o errores de imagen, vuelve a 2 MHz. No he probado 8 MHz con este ejemplo de tres pantallas.

**¿Puede alimentarse con 5 V? ¿Cuánta corriente consume al refrescar?**

No. VDD solo admite 3.3 V y GND debe compartir tierra con la placa. Durante el refresco aumenta la carga del circuito elevador, por lo que los cables Dupont deben ser cortos y la alimentación estable. No he medido la corriente máxima de refresco, así que no ofrezco una estimación.

**¿Cuánta RAM y Flash ocupa? ¿Satura la CPU?**

Resultado de esta compilación: Flash 525724 bytes (40%) y variables globales 23576 bytes (7%). En ejecución se asignan además 172800 bytes para el búfer de trama y 2048 bytes de búfer temporal al enviar la foto. El refresco es bloqueante: mientras dura, `loop()` no puede hacer otras tareas, así que no programes tareas que exijan una temporización estricta. No he medido el uso de CPU.

**¿Puedo usar GxEPD2 o un ESP32 normal?**

En la versión GxEPD2 1.6.9 que comprobé no hay una clase de controlador para este panel de seis colores, 480×720 y JD7601, por lo que no se puede utilizar directamente. En teoría se puede portar a un ESP32 normal, pero habría que modificar el código de plataforma relacionado con SPI y PSRAM y comprobar que la RAM admita un búfer de trama de 172800 bytes. No lo he probado con otros controladores.

**Si la pantalla no muestra nada, ¿qué cables reviso primero?**

Mide primero que VDD sea 3.3 V y revisa después GND, BUSY, CS, DC, SDA y CLK. Configura el puerto serie a 115200. Si se agota el tiempo en `reset` o `DRF`, sigue el apartado correspondiente. Si no hay ninguna salida serie, revisa primero el puerto y la configuración de USB CDC, no el formato de trama.

**¿Puede mostrar directamente chino o archivos JPG?**

No. La interfaz utiliza la fuente 5×7 integrada en GFX; todos los textos del ejemplo están en inglés y no hay fuente china. Un JPG tampoco puede enviarse directamente: primero debe convertirse en una trama de panel de 480×720 y 172800 bytes. El `photo_data.h` incluido ya está convertido; para cambiar la imagen, consulta «Cambiar la foto».

**¿Por qué se reproduce una sola vez y se detiene? ¿La foto permanece sin alimentación?**

El ejemplo está diseñado para reproducirse una sola vez: `loop()` está vacío y la última pantalla es la foto. El papel electrónico conserva la imagen sin alimentación. Pulsa RESET para repetirla; si quieres un bucle automático, tendrás que añadir tu propia lógica de activación. No he medido el intervalo para una reproducción continua.

## Otras ideas

- Sustituye el horario fijo por entradas desde el puerto serie y conecta datos reales cuando hayas validado el diseño.
- Añade un botón para cambiar manualmente entre Hello, el horario y la foto.
- Añade un RTC para actualizar automáticamente la fecha del título y la «clase actual».
- Guarda varias fotos en LittleFS o una tarjeta SD para crear un marco de fotos con cambio mediante botones.

## Referencias

- [Código fuente del ejemplo de este artículo (GitHub)](https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/Arduino/ESP32-S3/EPD_3in7_Showcase_JD7601): archivos completos del ejemplo de tres pantallas y script de conversión de fotos.

- [Página oficial del producto Espressif ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3): información del chip controlador.

- [Hoja de datos oficial de Espressif ESP32-S3](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf): parámetros eléctricos, GPIO y SPI.

- [Adafruit GFX Library GitHub](https://github.com/adafruit/Adafruit-GFX-Library): interfaces de texto y gráficos.

- [Adafruit BusIO GitHub](https://github.com/adafruit/Adafruit_BusIO): dependencia de Adafruit GFX.

- [esp32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32): núcleo de Arduino y compatibilidad con SPI.

- [Documentación de fuentes de Adafruit GFX](https://learn.adafruit.com/adafruit-gfx-graphics-library/using-fonts): uso de las fuentes integradas y FreeFont.

- [Material de código abierto y ejemplos del fabricante](https://gitee.com/osptek/display-epd-3.7inch-480x720): hoja de datos, esquema y ejemplos del fabricante.
