---
title: "Tutorial completo: ESP32-S3 con módulo Micro SD (modo SPI + código Arduino)"
boardId: esp32s3
moduleId: storage/microsd-storage-board
category: esp32
date: 2026-04-30
intro: "ESP32-S3 lee y escribe una tarjeta Micro SD mediante SPI: listado de archivos, lectura, escritura y eliminación. Incluye diagrama de conexión, código completo y soluciones a problemas comunes."
image: "https://img.lingflux.com/2026/04/a52d9db02d07cc13df512e06920e4603.jpg"
---

> **Resumen en una línea**: ESP32-S3 lee y escribe una tarjeta Micro SD por SPI, en 30 minutos desde el cableado hasta ver el listado de archivos en el monitor serie.

# Tutorial completo: ESP32-S3 con módulo Micro SD (modo SPI + código Arduino)

> Dificultad: ⭐⭐☆☆☆ (con unos conocimientos básicos basta) Tiempo estimado: 30 minutos Entorno de prueba: Arduino IDE 2.3.x + ESP32 Arduino Core 3.x

------

> **TL;DR (versión rápida):**
>
> 1. Conexiones: GPIO5 → CMD (MOSI), GPIO13 → D0 (MISO), GPIO14 → CLK, GPIO4 → D3 (CS)
> 2. Alimentación a **3.3V**, no conectar a 5V
> 3. Formatea la tarjeta SD como **FAT32** (especialmente con tarjetas de 32 GB)
> 4. Usa la librería `SD.h` incluida, no necesitas instalar nada extra
> 5. Sube el código, abre el monitor serie (115200) y si ves el listado de archivos, listo

------

## Introducción

A la mitad de un proyecto con ESP32, ¿te ha pasado esto?

> Quieres reproducir un audio, guardar un montón de datos de sensores, o almacenar varias imágenes...
> y te das cuenta de que la Flash interna del ESP32 no alcanza.

La solución más sencilla es conectar una tarjeta SD. El almacenamiento pasa de unos pocos MB a decenas de GB, y la velocidad de lectura/escritura es suficiente. En este artículo te guiamos para poner en marcha la combinación **ESP32-S3 + módulo Micro SD** desde cero, usando el modo SPI para leer el listado de archivos de una tarjeta SD de 32 GB.

Cablea bien, sube el código y en menos de 30 minutos deberías ver los nombres de los archivos de tu SD en el monitor serie.

------

## Demo

![](https://img.lingflux.com/2026/04/36943c66a6d84fb669a840b29677f2f5.jpg)

La salida del puerto serie se verá más o menos así:

```
=== ESP32-S3 SD SPI Test ===
MOSI=5, MISO=13, SCK=14, CS=4
SD card mounted successfully.
SD Card Type: SDHC
SD Card Size: 30436MB
Total space: 30436MB
Used space : 512MB
Listing directory: /
  DIR : music
  FILE: readme.txt  SIZE: 128
  FILE: config.json  SIZE: 256
```


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/EOdWUtUBBMA?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


------

## Descripción del módulo

![](https://img.lingflux.com/2026/04/6737983c1e0d23072c47461024204cb9.jpg)

El módulo SD es como conectarle un "lector de tarjetas" al ESP32. El ESP32 no tiene ranura para SD, así que este pequeño módulo hace de intermediario: traduce las señales SPI del ESP32 al protocolo que la tarjeta SD entiende, convirtiendo tu SD en un almacenamiento externo de lectura y escritura.

| Parámetro                      | Especificación                                                  |
| ------------------------------ | --------------------------------------------------------------- |
| Protocolo de interfaz          | Modo SPI / modo SDIO (este artículo usa SPI)                   |
| Tipos de tarjeta compatibles   | Micro SD (SDSC / SDHC, hasta 32 GB)                            |
| Voltaje de trabajo             | 3.3V (**no conectar a 5V, puede dañar el módulo o la tarjeta**)| 
| Pines del módulo               | CMD / CLK / D0 / D1 / D2 / D3 / 3.3V / GND                    |
| Pines usados en modo SPI       | CMD (MOSI) / D0 (MISO) / CLK / D3 (CS)                        |

Por qué elegimos este módulo: tamaño compacto, pocas conexiones (el modo SPI solo usa 4 cables de señal), es la solución más común para expandir el almacenamiento del ESP32, y hay mucha documentación y comunidad disponible.

------

## Lista de materiales

| Componente              | Cantidad | Notas                                         |
| ----------------------- | -------- | --------------------------------------------- |
| Placa ESP32-S3          | 1        | Cualquier placa S3 con GPIO sirve             |
| Módulo Micro SD         | 1        | Que soporte modo SPI (suele indicarse atrás)  |
| Tarjeta Micro SD        | 1        | Recomendado 32 GB o menos, formateada FAT32   |
| Cables puente (Dupont)  | Varios   | Macho a hembra, lo más cortos posible         |

------

## Esquema de conexión completo

| Pin ESP32-S3 | Pin módulo SD | Descripción                                             |
| ------------ | ------------- | ------------------------------------------------------- |
| 3.3V         | 3.3V          | **Solo 3.3V, no conectar a 5V**                        |
| GND          | GND           | Tierra común, obligatorio                               |
| GPIO13       | D0            | SPI MISO: la SD envía datos al ESP32                    |
| GPIO5        | CMD           | SPI MOSI: el ESP32 envía datos a la SD                  |
| GPIO14       | CLK           | Reloj SPI, el ESP32 es maestro                          |
| GPIO4        | D3            | SPI Chip Select (CS), la SD se activa con nivel bajo    |
| Sin conectar | D1 / D2 / CD  | No se usan en modo SPI, déjalos sin conectar            |

> ⚠️ Después de cablear, revisa cable por cable contra la tabla anterior; te ahorrará el 80% del tiempo de depuración.
> Además, no uses cables Dupont demasiado largos (30 cm máximo). Con cables largos la señal se degrada, y las tarjetas de 32 GB son más exigentes con los tiempos.

------

## Librerías necesarias

¡No necesitas instalar nada extra!

Las librerías `SPI.h` y `SD.h` ya vienen incluidas en el **ESP32 Arduino Core**. Si ya tienes instalado el soporte de placas ESP32 en tu Arduino IDE, puedes compilar directamente.

Si aún no tienes el paquete de placas, ve a Arduino IDE → Herramientas → Gestor de placas, busca `esp32` e instala el paquete de **Espressif Systems** (versión probada en este artículo: **ESP32 Arduino Core 3.0.x**).

------

## Código completo

```cpp
#include <SPI.h>
#include <SD.h>

// Paso 1: definir los pines SPI
static const int SD_MOSI = 5;   // corresponde al pin CMD del módulo SD
static const int SD_MISO = 13;  // corresponde al pin D0 del módulo SD
static const int SD_SCK  = 14;  // corresponde al pin CLK del módulo SD
static const int SD_CS   = 4;   // corresponde al pin D3 del módulo SD (chip select)

SPIClass spi = SPIClass(FSPI);  // En ESP32-S3 se usa el bus FSPI

// Listar recursivamente todos los archivos y subcarpetas de un directorio
void listDir(fs::FS &fs, const char * dirname, uint8_t levels) {
  Serial.printf("Listando directorio: %s\n", dirname);

  File root = fs.open(dirname);
  if (!root) {
    Serial.println("Error al abrir el directorio, revisa el cableado o el formato de la SD");
    return;
  }
  if (!root.isDirectory()) {
    Serial.println("Esto no es un directorio");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      Serial.print("  [CARPETA] ");
      Serial.println(file.name());
      if (levels) {
        listDir(fs, file.path(), levels - 1);  // recursión en subdirectorio
      }
    } else {
      Serial.print("  [ARCHIVO] ");
      Serial.print(file.name());
      Serial.print("    Tamaño: ");
      Serial.print(file.size());
      Serial.println(" bytes");
    }
    file = root.openNextFile();
  }
}

// Imprimir información básica de la tarjeta SD
void printCardInfo() {
  uint8_t cardType = SD.cardType();

  if (cardType == CARD_NONE) {
    Serial.println("No se detectó tarjeta SD, revisa el cableado y la alimentación");
    return;
  }

  Serial.print("Tipo de tarjeta SD: ");
  if      (cardType == CARD_MMC)  Serial.println("MMC");
  else if (cardType == CARD_SD)   Serial.println("SDSC");
  else if (cardType == CARD_SDHC) Serial.println("SDHC (alta capacidad estándar)");
  else                            Serial.println("Tipo desconocido");

  uint64_t cardSize   = SD.cardSize()   / (1024 * 1024);
  uint64_t totalBytes = SD.totalBytes() / (1024 * 1024);
  uint64_t usedBytes  = SD.usedBytes()  / (1024 * 1024);

  Serial.printf("Capacidad de la SD: %llu MB\n", cardSize);
  Serial.printf("Espacio total: %llu MB\n",  totalBytes);
  Serial.printf("Espacio usado: %llu MB\n",  usedBytes);
}

void setup() {
  Serial.begin(115200);
  delay(1500);  // Esperar a que el puerto serie se estabilice

  Serial.println();
  Serial.println("=== ESP32-S3 SD SPI Test ===");
  Serial.printf("MOSI=%d, MISO=%d, SCK=%d, CS=%d\n",
                SD_MOSI, SD_MISO, SD_SCK, SD_CS);

  // Paso 2: inicializar el bus SPI con el orden de pines: SCK, MISO, MOSI, CS
  spi.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // Paso 3: poner CS en alto para evitar seleccionar la SD durante la inicialización
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  // Paso 4: montar la tarjeta SD, reloj inicial 10 MHz (si es inestable, bajar a 4 MHz)
  if (!SD.begin(SD_CS, spi, 10000000)) {
    Serial.println("¡Error al montar la tarjeta SD! Revisa en este orden:");
    Serial.println("1. Cableado GPIO5→CMD / GPIO13→D0 / GPIO14→CLK / GPIO4→D3");
    Serial.println("2. Confirma que la alimentación es 3.3V, no 5V");
    Serial.println("3. Formatea la SD como FAT32");
    Serial.println("4. Cambia 10000000 por 4000000 para bajar la frecuencia SPI");
    return;
  }

  Serial.println("¡Tarjeta SD montada correctamente!");
  printCardInfo();

  // Paso 5: listar la estructura de archivos hasta 5 niveles de profundidad
  listDir(SD, "/", 5);
}

void loop() {
  // La lectura de archivos se hace una sola vez en setup(), loop queda vacío
  // Si necesitas sondeo periódico, puedes agregar delay + listDir aquí
}
```



### Ejemplos de operaciones con archivos

Una vez que el programa principal funciona, solo listar archivos no es suficiente. Las siguientes funciones **no modifican el programa principal**; solo pégalas junto a la función `listDir()` y llámalas al final de `setup()` según las necesites. Cubren todas las operaciones comunes: **lectura / escritura / agregar / crear / eliminar / renombrar**.

#### Escribir archivo: sobrescribir y agregar

El modo `FILE_WRITE` borra el contenido original y escribe desde cero; el modo `FILE_APPEND` agrega desde el final del archivo. Para registros de log y captura de datos de sensores, casi siempre se usa el **modo agregar**.

```
// === Escribir archivo (sobrescribir) ===
// Si el archivo no existe lo crea; si existe, borra el contenido y escribe
void writeFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("Escribiendo archivo: %s\n", path);

  File file = fs.open(path, FILE_WRITE);  // modo FILE_WRITE: sobrescribe
  if (!file) {
    Serial.println("Error al abrir el archivo (modo escritura)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ Escritura exitosa");
  } else {
    Serial.println("❌ Error al escribir");
  }
  file.close();  // Siempre hay que cerrar, si no los datos pueden no guardarse en la tarjeta
}

// === Agregar contenido (no sobrescribe) ===
// Ideal para logs: cada vez se agrega una línea al final del archivo
void appendFile(fs::FS &fs, const char * path, const char * message) {
  Serial.printf("Agregando contenido a: %s\n", path);

  File file = fs.open(path, FILE_APPEND);  // modo FILE_APPEND: agregar
  if (!file) {
    Serial.println("Error al abrir el archivo (modo agregar)");
    return;
  }

  if (file.print(message)) {
    Serial.println("✅ Contenido agregado exitosamente");
  } else {
    Serial.println("❌ Error al agregar");
  }
  file.close();
}

// Ejemplo de uso (colocar en setup() después de listDir):
// writeFile(SD, "/hello.txt", "Hola ESP32-S3 SD!\n");
// appendFile(SD, "/hello.txt", "Esta es la segunda línea agregada\n");
```

💡 **Consejo de rendimiento**: cada llamada a `file.close()` provoca una escritura física en la SD; abrir y cerrar archivos con frecuencia es lento. Si haces logging a alta frecuencia, mantén la instancia de `File` abierta y **llama a `file.flush()` cada N líneas** para vaciar el búfer a la tarjeta.

#### Leer archivo: lectura completa y por líneas

`readFile()` es ideal para archivos pequeños que se leen de una vez; `readFileByLine()` es mejor para archivos CSV y de configuración.

```
// === Leer archivo (lectura completa, imprime byte a byte) ===
void readFile(fs::FS &fs, const char * path) {
  Serial.printf("Leyendo archivo: %s\n", path);

  File file = fs.open(path);  // por defecto es modo FILE_READ
  if (!file) {
    Serial.println("Error al abrir el archivo, puede que no exista");
    return;
  }

  Serial.print("Contenido del archivo: ");
  while (file.available()) {
    Serial.write(file.read());  // leer byte a byte e imprimir
  }
  Serial.println();
  file.close();
}

// === Leer por líneas (ideal para archivos de configuración y datos CSV) ===
void readFileByLine(fs::FS &fs, const char * path) {
  Serial.printf("Lectura por líneas: %s\n", path);

  File file = fs.open(path);
  if (!file) {
    Serial.println("Error al abrir el archivo");
    return;
  }

  int lineNum = 1;
  while (file.available()) {
    String line = file.readStringUntil('\n');  // leer hasta el salto de línea
    Serial.printf("Línea %d: %s\n", lineNum++, line.c_str());
  }
  file.close();
}

// Ejemplo de uso:
// readFile(SD, "/hello.txt");
// readFileByLine(SD, "/config.txt");
```

ℹ️ **Nota**: `file.available()` devuelve los bytes restantes; `file.readStringUntil('\n')` lee todo hasta el salto de línea como un `String`. Para archivos grandes, evita usar `String` porque puede agotar la memoria; es más seguro usar un búfer fijo `char buf[128]` + `file.readBytesUntil()`.

#### Crear / eliminar / renombrar

Creación de carpetas y archivos vacíos, eliminación de archivos y carpetas, y renombrado (también sirve para "mover").

```
// === Crear carpeta ===
void createDir(fs::FS &fs, const char * path) {
  Serial.printf("Creando carpeta: %s\n", path);
  if (fs.mkdir(path)) {
    Serial.println("✅ Carpeta creada exitosamente");
  } else {
    Serial.println("❌ Error al crear (puede que ya exista o la carpeta padre no exista)");
  }
}

// === Crear archivo vacío ===
// Abrir con FILE_WRITE y cerrar inmediatamente crea un archivo vacío
void createEmptyFile(fs::FS &fs, const char * path) {
  Serial.printf("Creando archivo vacío: %s\n", path);
  File file = fs.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("❌ Error al crear");
    return;
  }
  file.close();
  Serial.println("✅ Archivo vacío creado exitosamente");
}

// === Eliminar archivo ===
void deleteFile(fs::FS &fs, const char * path) {
  Serial.printf("Eliminando archivo: %s\n", path);
  if (fs.remove(path)) {
    Serial.println("✅ Eliminado exitosamente");
  } else {
    Serial.println("❌ Error al eliminar (el archivo no existe o problema de permisos)");
  }
}

// === Eliminar carpeta (debe estar vacía) ===
void removeDir(fs::FS &fs, const char * path) {
  Serial.printf("Eliminando carpeta: %s\n", path);
  if (fs.rmdir(path)) {
    Serial.println("✅ Carpeta eliminada exitosamente");
  } else {
    Serial.println("❌ Error al eliminar (la carpeta no está vacía o no existe)");
  }
}

// === Renombrar / mover archivo ===
void renameFile(fs::FS &fs, const char * oldPath, const char * newPath) {
  Serial.printf("Renombrando: %s → %s\n", oldPath, newPath);
  if (fs.rename(oldPath, newPath)) {
    Serial.println("✅ Renombrado exitosamente");
  } else {
    Serial.println("❌ Error al renombrar");
  }
}

// Ejemplo de uso (ejecutar en secuencia para demostrar el flujo completo):
// createDir(SD, "/logs");
// createEmptyFile(SD, "/logs/empty.txt");
// renameFile(SD, "/logs/empty.txt", "/logs/data.txt");
// deleteFile(SD, "/logs/data.txt");
// removeDir(SD, "/logs");
```

⚠️ **Nota**: `SD.rmdir()` **solo elimina carpetas vacías**. Para eliminar recursivamente un directorio completo necesitas primero recorrer y borrar todos los archivos dentro y luego la carpeta misma. La librería `SD.h` no tiene un `rm -rf` integrado; tendrías que escribir tu propia función recursiva.

------

### Explicación del código

**¿Por qué CMD corresponde a MOSI?**
 En el modo SPI de la tarjeta SD, los datos que el ESP32 envía a la tarjeta pasan por el pin CMD, por lo tanto CMD = MOSI. Es una regla fija del protocolo SD en modo SPI, no es un error de conexión.

**¿Por qué D0 corresponde a MISO?**
 En modo SPI, la tarjeta SD devuelve los datos al maestro por el pin D0, por lo tanto D0 = MISO.

**¿Por qué D3 corresponde a CS?**
 Cuando la tarjeta SD entra en modo SPI, D3 asume la función de Chip Select; con nivel bajo la tarjeta se activa.

**¿Por qué D1 y D2 no se conectan?**
 Son exclusivos del modo SDIO de 4 bits; en modo SPI no se necesitan, déjalos sin conectar.

**¿Qué significa `SPIClass spi = SPIClass(FSPI)`?**
 El ESP32-S3 tiene múltiples buses SPI (FSPI / HSPI); aquí se especifica manualmente FSPI para evitar conflictos con otros periféricos.

------

## Solución de problemas comunes

No te asustes, el 90% de los errores de inicialización se deben a estos puntos; revísalos en orden y casi seguro se soluciona:

**1. ¿Se queda atascado en "Error al montar la tarjeta SD"?**
 Verifica el cableado: GPIO5→CMD, GPIO13→D0, GPIO14→CLK, GPIO4→D3. Un solo cable mal conectado provocará el fallo.

**2. ¿El cableado está bien pero sigue fallando?**
 Reduce la frecuencia SPI de 10 MHz a 4 MHz; cambia esta línea:

```cpp
if (!SD.begin(SD_CS, spi, 4000000)) {
```

Las tarjetas de 32 GB son más exigentes con los tiempos; una frecuencia baja es más fácil de estabilizar. Una vez que funcione, ve subiéndola poco a poco.

**3. ¿El puerto serie no muestra absolutamente nada?**
 Verifica que la velocidad baud sea 115200 y que el cable USB tenga capacidad de transferencia de datos (los cables de solo carga no sirven).

**4. ¿A veces monta bien y a veces no?**
 Problema de alimentación. Cables demasiado largos o contactos flojos causan fluctuaciones de voltaje durante la inicialización de la SD. Intenta acortar los cables Dupont o usar cables de mejor calidad.

**5. ¿La tarjeta de 32 GB falla pero con una de 8 GB funciona?**
 Las tarjetas de 32 GB suelen ser formato SDHC y necesitan estar formateadas como FAT32 (Windows formatea las de 32 GB como exFAT por defecto, y la librería `SD.h` del ESP32 no soporta exFAT). Puedes usar [SD Card Formatter](https://www.sdcard.org/downloads/formatter/) para formatear.

**6. ¿Monta correctamente pero listDir no muestra ningún archivo?**
 La tarjeta SD puede estar vacía o los archivos en carpetas ocultas. Copia un archivo .txt a la raíz y vuelve a probar.

------

## Preguntas frecuentes

**P: Mi módulo SD funciona a 5V, ¿puedo conectarlo al ESP32-S3?**
 R: No es recomendable. Los GPIO del ESP32-S3 trabajan con lógica de 3.3V. Si el módulo no tiene conversión de nivel, conectar líneas de señal a un módulo de 5V puede dañar los pines. Asegúrate de que el módulo soporte 3.3V o compra uno con chip de conversión de nivel.

**P: ¿Qué frecuencia SPI es adecuada?**
 R: Empieza con 4000000 (4 MHz) y si funciona prueba 10000000 (10 MHz). En teoría el modo SPI de la SD soporta hasta 25 MHz, pero la longitud de los cables Dupont y la calidad del módulo limitan la velocidad real.

**P: ¿Qué GPIO del ESP32-S3 puedo usar para la tarjeta SD?**
 R: El FSPI del ESP32-S3 permite pines personalizables; en teoría la mayoría de los GPIO sirven, pero evita GPIO0 (pin de modo Boot), GPIO45/GPIO46 (tienen funciones fijas). Al cambiar pines, recuerda actualizar las constantes `SD_MOSI / SD_MISO / SD_SCK / SD_CS` en el código.

**P: ¿Es obligatorio formatear una tarjeta de 32 GB como FAT32? ¿No puedo usar exFAT?**
 R: La librería `SD.h` de Arduino solo soporta FAT16 y FAT32, no exFAT. Las tarjetas de 32 GB o menos formateadas como FAT32 funcionan sin problema. Recomendamos la herramienta SD Card Formatter en lugar del formateador de Windows (que asigna exFAT por defecto a tarjetas de 32 GB).

**P: ¿Cuál es la velocidad aproximada de lectura/escritura de la SD?**
 R: En modo SPI el rendimiento real está entre 500 KB/s y 2 MB/s, dependiendo de la frecuencia del reloj SPI y la clase de velocidad de la tarjeta. Si necesitas mayor velocidad, considera el modo SDIO de 4 bits (requiere cableado diferente y queda fuera del alcance de este artículo).

**P: ¿Puedo montar varias tarjetas SD al mismo tiempo?**
 R: Sí. El bus SPI soporta múltiples dispositivos; cada tarjeta usa un pin CS diferente y se inicializa como una instancia de `SD` independiente. Sin embargo, `SD.h` solo soporta una instancia; para varias tarjetas necesitas usar `SD_MMC.h` o la librería de terceros SdFat.

**P: ¿El uso de CPU es alto al ejecutar este código en el ESP32-S3?**
 R: No. Las operaciones de listado de archivos son E/S puntuales; `setup()` se ejecuta una vez y `loop()` está vacío, así que el CPU prácticamente no se usa. Solo si haces lecturas/escrituras continuas en `loop()` necesitarás prestar atención al rendimiento.

------

## Proyectos relacionados

Una vez que domines la lectura básica, estos son algunos caminos para seguir explorando:

- **Reproducir MP3 desde la SD**: con la librería ESP32-audioI2S y un DAC I2S, lee archivos de audio desde la SD y despídete del streaming con cortes por red
- **Captura y almacenamiento de datos**: escribe datos de sensores con marca de tiempo en CSV; sobrevive a cortes de energía y facilita el análisis posterior con Python
- **Pantalla TFT**: lee imágenes (BMP / JPG) desde la SD y muéstralas en pantalla para crear un portarretratos digital
- **Archivo de configuración**: guarda el usuario y contraseña del Wi-Fi en `config.json` en la SD y evita tener que modificar y regrabar el código cada vez

------

## Referencias

- [Espressif ESP32-S3 Hoja de datos técnica](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [SD Specifications Part 1: Physical Layer Simplified Specification (documento oficial de la SD Association)](https://www.sdcard.org/downloads/pls/)
- [ESP32 Arduino Core GitHub oficial](https://github.com/espressif/arduino-esp32)
- [SD Card Formatter descarga (herramienta oficial de formateo)](https://www.sdcard.org/downloads/formatter/)
- [Documentación de la librería Arduino SD](https://www.arduino.cc/reference/en/libraries/sd/)
