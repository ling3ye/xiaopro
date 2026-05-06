---
title: "ESP32-S3 + 1.3\" SH1106 OLED Mascota Cibernetica: Pulpo | Tutorial de Animacion con I2C + U8g2"
boardId: esp32s3
moduleId: display/oled13-sh1106
category: esp32
date: 2026-05-06
intro: "Controla una pantalla SH1106 OLED de 1.3 pulgadas con ESP32-S3. Usa la libreria U8g2 para crear una animacion de un pulpo nadando con efectos de burbujas. Conexion I2C de 4 cables, algoritmo de movimiento con curvas de Lissajous y guia para evitar errores comunes."
image: "https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg"
---

# Tutorial Completo: ESP32-S3 + 1.3" SH1106 OLED - Animacion de Pulpo Cibernetico (I2C + U8g2)

Dificultad: (Apto para principiantes)
Tiempo estimado: 30 minutos
Entorno de prueba: Arduino IDE 2.3.8 · U8g2 v2.35.30 · ESP32 Board Package 3.3.8

---

> **TL;DR (Inicio rapido):**
>
> 1. Conexion: SDA -> GPIO 8, SCL -> GPIO 9, VCC -> 3.3V, GND -> GND
> 2. Instalar libreria: U8g2 (autor oliver)
> 3. En el constructor, cambiar la direccion I2C a `0x3C * 2` e inicializar Wire con `Wire.begin(8, 9)`
> 4. Subir el codigo, el pulpo empezara a nadar
> 5. El codigo usa un algoritmo de movimiento con curvas de Lissajous; si te interesa la teoria, puedes profundizar

---

## Introduccion

Alguna vez has visto en tiendas online esas pequenas pantallas OLED que, aunque son del tamano de unauna, en los videos del vendedor muestran todo tipo de animaciones fluidas que se ven geniales y divertidas.

Despues de ver uno de esos videos, pedi una pantalla SH1106 OLED de 1.3 pulgadas al dia siguiente. Y entonces me encontre con el clasico problema: la pantalla llego, el codigo se subio con exito, se encendio, pero no mostraba nada.

Despues de un buen rato de investigacion, descubri que los problemas se concentraban en dos puntos: **los pines I2C no son los 21/22 por defecto** y **el chip driver SH1106 no es un SSD1306**; se parecen mucho pero no son intercambiables.

Una vez aclarados estos dos puntos, todo fue sobre ruedas. El objetivo de este articulo: en 30 minutos, hacer que un pulpo nade en tu pantalla OLED y ademas sopla burbujas.



---

## Resultado del experimento



![ESP32-canva-017-1inch3-oled (1) (1)](https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg)



Un pulpo de 32x32 pixeles nada por la pantalla siguiendo una trayectoria de curva de Lissajous (esas elegantes ondas en forma de 8), mientras desde su boca salen burbujas de distintos tamanos que se desvanecen lentamente.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/zw06nh7wXp4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Descripcion del componente

### 1.3" OLED SH1106

El SH1106 es un chip driver OLED monocromatico que convierte los 0 y 1 de tu codigo en pixeles encendidos en la pantalla. Puedes entenderlo como un traductor de matrices de puntos: le dices "enciende la fila 30, columna 50" y el controla el diodo organico emisor de luz correspondiente.

| Parametro | Valor |
|------|------|
| Resolucion | 128 x 64 pixeles |
| Chip driver | SH1106 (no es SSD1306) |
| Interfaz de comunicacion | I2C (direccion por defecto 0x3C) |
| Voltaje de funcionamiento | 3.3V / 5V compatible |
| Tamano de pantalla | 1.3 pulgadas |

> Por que elegirla: economica y suficiente. Con la libreria U8g2, las animaciones de matrices de puntos son facil de implementar. Ten cuidado de no comprar la version de 0.96 pulgadas con SSD1306; el chip driver es diferente y el codigo no funcionara, la pantalla se quedara en blanco.

---

## Lista de materiales (BOM)

| Componente | Cantidad |
|------|------|
| Placa de desarrollo ESP32-S3 | x 1 |
| 1.3" OLED SH1106 (I2C) | x 1 |
| Cables Dupont (macho a hembra) | x 4 |

---

## Conexion

| Pin 1.3" OLED | Conectar a ESP32-S3 |
|-----------|---------------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

> Recomendacion: verifica cada conexion una por una al terminar; esto ahorra el 80% del tiempo de depuracion. Intercambiar SDA/SCL es la causa mas comun de pantalla en blanco: la alimentacion parece normal pero no muestra nada.

---

## Instalar libreria

En el Gestor de Librerias del Arduino IDE, busca **U8g2** e instala la version publicada por oliver.

Version probada: **U8g2 v2.35.30**

U8g2 es una libreria de pantalla de codigo abierto mantenida en [olikraus/u8g2](https://github.com/olikraus/u8g2), compatible con casi todos los chips drivers comunes de OLED/LCD monocromaticos, incluyendo por supuesto el SH1106.

---

## Codigo completo

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// Paso 1: declarar el objeto U8g2
// Nota: aqui seleccionamos SH1106, 128x64, modo de buffer completo, I2C por hardware
// U8G2_R2 = rotacion de pantalla 180 grados (ajusta segun la orientacion de soldadura de tu hardware; si no necesita rotacion, cambia a U8G2_R0)
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R2, /* reset=*/ U8X8_PIN_NONE);

// ==================== Fotogramas de animacion del pulpo (almacenados en Flash para ahorrar RAM) ====================
// 4 fotogramas de animacion cuadro a cuadro, cada uno de 32x32 pixeles, formato de matriz de puntos XBM
const unsigned char animation_frame_0[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00,
  0x00, 0xFE, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00,
  0xE0, 0xFF, 0xFF, 0x01, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01,
  0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00, 0x00, 0xEF, 0x3D, 0x00,
  0x00, 0xEF, 0x3D, 0x00, 0x00, 0xC7, 0x38, 0x00, 0x00, 0xC7, 0x38, 0x00,
  0x80, 0xC3, 0x70, 0x00, 0x80, 0xC3, 0x70, 0x00, 0x80, 0xC1, 0x60, 0x00,
  0x80, 0xC1, 0x60, 0x00, 0xC0, 0xC0, 0xC0, 0x00, 0xC0, 0xC0, 0xC0, 0x00,
  0x40, 0x80, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_1[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0xFC, 0x0F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01, 0xE0, 0xFF, 0xFF, 0x01,
  0xE0, 0xE7, 0xE7, 0x01, 0xE0, 0xE1, 0xE1, 0x01, 0xE0, 0xE7, 0xE7, 0x01,
  0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00, 0x80, 0xFF, 0x7F, 0x00,
  0x00, 0xFF, 0x3F, 0x00, 0x00, 0xFE, 0x1F, 0x00, 0x00, 0xDE, 0x1E, 0x00,
  0x00, 0xCF, 0x3C, 0x00, 0x80, 0xC7, 0x78, 0x00, 0xC0, 0xC3, 0xF0, 0x00,
  0xE0, 0xC1, 0xE0, 0x01, 0xE0, 0xC0, 0xC0, 0x01, 0xC0, 0xC0, 0xC0, 0x00,
  0x80, 0xC0, 0x40, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_2[] PROGMEM = {
  0x00, 0xF0, 0x00, 0x00, 0x00, 0xF8, 0x01, 0x00, 0x00, 0xFC, 0x03, 0x00,
  0x00, 0xFE, 0x07, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x80, 0xFF, 0x1F, 0x00, 0x80, 0xF9, 0x19, 0x00,
  0x80, 0xF0, 0x10, 0x00, 0x80, 0xF9, 0x19, 0x00, 0x80, 0xFF, 0x1F, 0x00,
  0x80, 0xFF, 0x1F, 0x00, 0x00, 0xFF, 0x0F, 0x00, 0x00, 0xFE, 0x07, 0x00,
  0x00, 0xFC, 0x03, 0x00, 0x00, 0x6C, 0x03, 0x00, 0x00, 0x66, 0x06, 0x00,
  0x00, 0x63, 0x0C, 0x00, 0x80, 0x61, 0x18, 0x00, 0xC0, 0x60, 0x30, 0x00,
  0x60, 0x60, 0x60, 0x00, 0x30, 0x60, 0xC0, 0x00, 0x18, 0x60, 0x80, 0x01,
  0x0C, 0x60, 0x00, 0x03, 0x06, 0x60, 0x00, 0x06, 0x02, 0x60, 0x00, 0x04,
  0x00, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};
const unsigned char animation_frame_3[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x07, 0x00, 0x00, 0xFE, 0x3F, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0xC0, 0xFF, 0xFF, 0x00, 0xE0, 0xFF, 0xFF, 0x01,
  0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03, 0xF0, 0xFF, 0xFF, 0x03,
  0xF0, 0xF3, 0xF3, 0x03, 0xF0, 0xF0, 0xF0, 0x03, 0xF0, 0xF3, 0xF3, 0x03,
  0xF0, 0xFF, 0xFF, 0x03, 0xE0, 0xFF, 0xFF, 0x01, 0xC0, 0xFF, 0xFF, 0x00,
  0x80, 0xFF, 0x7F, 0x00, 0x00, 0xFF, 0x3F, 0x00, 0x00, 0xF6, 0x06, 0x00,
  0x00, 0xF6, 0x06, 0x00, 0x00, 0x63, 0x0C, 0x00, 0x00, 0x63, 0x0C, 0x00,
  0x80, 0x61, 0x18, 0x00, 0x80, 0x61, 0x18, 0x00, 0x80, 0x60, 0x10, 0x00,
  0x80, 0x60, 0x10, 0x00, 0x40, 0x60, 0x20, 0x00, 0x40, 0x60, 0x20, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

// Colocar los punteros de los 4 fotogramas en un arreglo para facilitar el acceso ciclico
const unsigned char* animation_frames[] = {
  animation_frame_0, animation_frame_1, animation_frame_2, animation_frame_3
};

const int TOTAL_FRAMES = 4;
const unsigned long FRAME_DELAY = 120; // Intervalo entre fotogramas (ms), reduce para acelerar, aumenta para ralentizar
int currentFrame = 0;
unsigned long lastFrameTime = 0;
const int SPRITE_SIZE = 32; // Tamano de la matriz de puntos del pulpo 32x32

// ==================== Sistema de particulas de burbujas ====================
#define MAX_BUBBLES 10 // Maximo de burbujas simultaneas en pantalla

struct Bubble {
  float x;       // Coordenada X actual
  float y;       // Coordenada Y actual
  float radius;  // Radio actual (numero flotante, para reducir gradualmente)
  float speedY;  // Pixeles de ascenso por fotograma
  float wobble;  // Desplazamiento de fase aleatorio para el balanceo lateral
  bool active;   // Esta burbuja "viva"?
};

Bubble bubbles[MAX_BUBBLES]; // Pool de objetos, evita asignacion dinamica de memoria

void setup() {
  Serial.begin(115200);

  // Paso 2: usar una semilla aleatoria para que las burbujas sean diferentes en cada inicio
  randomSeed(analogRead(0));

  // Paso 3: inicializar I2C, especificando SDA=8, SCL=9
  Wire.begin(8, 9);
  u8g2.setI2CAddress(0x3C * 2); // U8g2 requiere desplazar la direccion un bit a la izquierda, 0x3C << 1 = 0x78
  u8g2.begin();

  // Paso 4: marcar todas las burbujas como inactivas
  for (int i = 0; i < MAX_BUBBLES; i++) {
    bubbles[i].active = false;
  }

  Serial.println("Acuario de pulpo iniciado correctamente!");
}

void loop() {
  unsigned long currentTime = millis();

  // Usar temporizacion no bloqueante en lugar de delay(), garantizando una animacion fluida
  if (currentTime - lastFrameTime >= FRAME_DELAY) {
    lastFrameTime = currentTime;

    // ======== Paso 1: calcular la posicion del pulpo usando curvas de Lissajous ========
    // Superponer dos ondas sinusoidales de diferentes frecuencias para generar una elegante trayectoria en forma de 8
    float t = currentTime * 0.0008;

    float waveX = sin(t * 0.8) * 0.6 + sin(t * 0.3) * 0.4;
    int posX = 48 + (int)(waveX * 48); // Rango horizontal aprox. 0~96

    float waveY = cos(t * 0.7) * 0.6 + sin(t * 0.4) * 0.4;
    int posY = 16 + (int)(waveY * 16); // Rango vertical aprox. 0~32

    // ======== Paso 2: 25% de probabilidad de generar una nueva burbuja cerca de la boca del pulpo ========
    if (random(100) < 25) {
      for (int i = 0; i < MAX_BUBBLES; i++) {
        if (!bubbles[i].active) {
          bubbles[i].active = true;
          bubbles[i].x      = posX + 16 + random(-8, 8);   // Desplazamiento aleatorio cerca de la boca
          bubbles[i].y      = posY + 24 + random(0, 5);
          bubbles[i].radius = random(15, 35) / 10.0;       // 1.5~3.5 pixeles
          bubbles[i].speedY = random(10, 25) / 10.0;       // Velocidad de ascenso aleatoria
          bubbles[i].wobble = random(0, 100) / 10.0;       // Fase de balanceo aleatoria
          break; // Solo generar una por fotograma
        }
      }
    }

    // ======== Paso 3: limpiar el buffer, empezar a dibujar ========
    u8g2.clearBuffer();

    // Dibujar el cuerpo del pulpo (imagen en matriz de puntos XBM)
    u8g2.drawXBMP(posX, posY, SPRITE_SIZE, SPRITE_SIZE, animation_frames[currentFrame]);

    // ======== Paso 4: actualizar y dibujar todas las burbujas vivas ========
    for (int i = 0; i < MAX_BUBBLES; i++) {
      if (bubbles[i].active) {
        bubbles[i].y -= bubbles[i].speedY; // Ascender

        // Balanceo lateral sincronizado con el tiempo, como burbujas reales en el agua
        float currentX = bubbles[i].x + sin(t * 3.0 + bubbles[i].wobble) * 4.0;

        // La burbuja se reduce fotograma a fotograma, simulando que se desvanece
        bubbles[i].radius -= 0.06;

        // Radio demasiado pequeno o sale por la parte superior de la pantalla -> reciclar esta burbuja
        if (bubbles[i].radius <= 0.5 || bubbles[i].y < -5) {
          bubbles[i].active = false;
        } else {
          // Dibujar circulo hueco -- se parece mas a una burbuja real que uno solido
          u8g2.drawCircle((int)currentX, (int)bubbles[i].y, (int)bubbles[i].radius);
        }
      }
    }

    // Paso 5: enviar el contenido del buffer a la pantalla de una sola vez
    u8g2.sendBuffer();

    // Cambiar al siguiente fotograma
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }
}
```

### Explicacion del codigo

**Movimiento con curvas de Lissajous**: la superposicion de dos ondas sinusoidales/cosenoidales de diferentes frecuencias hace que el pulpo siga una elegante trayectoria en forma de 8, mucho mas vistosa que un simple movimiento de ida y vuelta, y solo requiere unas lineas de funciones trigonometricas.

**Pool de objetos de burbujas**: se asignan previamente 10 estructuras `Bubble`, gestionando su "vida o muerte" con el flag `active`, evitando la fragmentacion de memoria que causaria `new/delete`; en microcontroladores, este es un enfoque comun y recomendado.

**Palabra clave `PROGMEM`**: al agregar esta palabra clave a los arreglos de matrices de puntos, estos se almacenan en Flash en lugar de SRAM. 4 fotogramas x 128 bytes = 512 bytes, un desperdicio si se colocan en RAM.

**Temporizacion no bloqueante**: se usa `millis()` en lugar de `delay()`, de modo que la actualizacion fisica de las burbujas y el cambio de fotogramas de animacion del pulpo se coordinan naturalmente en el mismo bucle, sin tirones.

---

## Solucion de problemas comunes

No te asustes, el 90% de los problemas provienen de estos puntos:

**La pantalla no se enciende / no hay ninguna salida**
Primero verifica la alimentacion: VCC esta conectado a 3.3V, no a 5V (aunque muchos modulos son compatibles con 5V, mejor confirmar). Luego usa un multimetro para comprobar si las lineas SDA/SCL estan intercambiadas; este es el error mas frecuente.

**La pantalla se enciende pero esta toda blanca o toda negra, no se ve imagen**
Lo mas probable es un problema de direccion I2C. El codigo usa `0x3C * 2`, que es un requisito de U8g2. Si el puente de direccion I2C en la parte posterior de tu pantalla es `0x3D`, cambia `0x3C` a `0x3D` y prueba de nuevo. Tambien puedes ejecutar primero un I2C Scanner para confirmar la direccion.

**La imagen se muestra pero esta invertida arriba/abajo**
Cambia `U8G2_R2` por `U8G2_R0` en el constructor; la unica diferencia entre ambos es una rotacion de 180 grados.

**El pulpo se sale del borde de la pantalla**
El valor maximo de `posX` es aproximadamente 96; sumando los 32 pixeles de ancho llega justo al borde 128. Si modificas los parametros de amplitud de movimiento, asegurate de que las coordenadas no superen `128 - SPRITE_SIZE`.

**Las burbujas se ven entrecortadas**
Prueba a reducir `FRAME_DELAY` de 120 a 80. Si sigue entrecortado, verifica la velocidad del bus I2C; puedes anadir `Wire.setClock(400000)` despues de `Wire.begin(8, 9)` para cambiar al modo rapido (400 kHz).

---

## FAQ

**P: Puedo usar otros GPIO para I2C?**
R: Si, el I2C del ESP32-S3 admite mapeo a cualquier GPIO. Cambia los numeros en `Wire.begin(8, 9)` por los pines que quieras usar: primero SDA, luego SCL.

**P: Mi pantalla es una SSD1306 de 0.96 pulgadas, puedo usar el codigo directamente?**
R: No directamente, el chip driver es diferente. Cambia el constructor por `U8G2_SSD1306_128X64_NONAME_F_HW_I2C`; el resto del codigo puede conservarse.

**P: Que velocidad I2C soporta?**
R: El SH1106 soporta modo estandar a 100 kHz y modo rapido a 400 kHz. Este codigo no lo configura explicitamente y usa 100 kHz por defecto; si la actualizacion te parece lenta, puedes anadir `Wire.setClock(400000)`.

**P: Para que sirve PROGMEM, se puede eliminar?**
R: `PROGMEM` almacena los arreglos en Flash en lugar de SRAM. Los datos de los 4 fotogramas ocupan unos 512 bytes; eliminarlo no afecta la funcionalidad, pero consumira 512 bytes de SRAM. El ESP32-S3 tiene SRAM abundante, asi que no habria mayor problema, pero se recomienda mantenerlo como buena practica.

**P: Como hago que el pulpo nade mas rapido o mas lento?**
R: Cambia el valor de `FRAME_DELAY`: numeros mas pequenos significan mas rapido, mas grandes mas lento. La velocidad de ascenso de las burbujas esta controlada por el rango de `speedY` en `random(10, 25) / 10.0`, que tambien puedes ajustar.

**P: Cuanta RAM usa la pantalla?**
R: El modo de buffer completo de U8g2 (`_F_`) mantiene un buffer de fotogramas completo en RAM: 128x64 / 8 = 1024 bytes, aproximadamente 1KB. El ESP32-S3 tiene 512KB de SRAM, mas que suficiente.

---

## Ideas para experimentar

- **Cambia de protagonista**: usa [image2cpp](https://javl.github.io/image2cpp/) para convertir cualquier imagen en blanco y negro a una matriz de puntos XBM y sustituye el pulpo
- **Anade interaccion con sensores**: conecta un sensor de sonido para que la velocidad de nado del pulpo cambie con el volumen
- **Multiples pantallas**: conecta dos OLED al mismo bus I2C (con direcciones 0x3C y 0x3D respectivamente), un pulpo en cada pantalla
- **Version con pantalla TFT a color**: cambia a una TFT ST7789 a color y usa gradientes de grises para crear un efecto de burbujas mas detallado

---

## Referencias

- [Hoja de datos tecnica del ESP32-S3 (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_cn.pdf)
- [Pagina de GitHub de la libreria U8g2 (olikraus/u8g2)](https://github.com/olikraus/u8g2)
- [Hoja de datos del chip driver SH1106 (Sino Wealth)](https://www.velleman.eu/downloads/29/infosheets/sh1106_datasheet.pdf)
- [image2cpp: herramienta online para convertir imagenes a matrices de puntos XBM](https://javl.github.io/image2cpp/)
