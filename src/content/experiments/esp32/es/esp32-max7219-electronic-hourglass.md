---
title: "Reloj de arena electrónico con ESP32 y MAX7219｜Conexión SPI + código del motor de física de rotación 45°"
boardId: esp32
moduleId: lighting/max7219-dot-matrix
category: esp32
date: 2026-07-29
intro: "Con una placa ESP32 y dos matrices MAX7219 8×8, te enseñamos paso a paso a recrear el reloj de arena electrónico viral. Explicamos el principio del motor de física con rotación 45°, la conexión SPI en cadena margarita y el código fuente completo en Arduino C++, con una guía de resolución de problemas. Pensado para makers que ya sepan cargar código básico."
image: "https://img.lingflux.com/2026/07/47600d4280d7a2274f9f47a726329beb.jpg"
---

> **TL;DR (inicio rápido):**
>
> 1. Conexión: ESP32 `GPIO23→DIN`, `GPIO18→CLK`, `GPIO5→CS`; las dos placas MAX7219 se cascadenan en cadena margarita con `DOUT→DIN`
> 2. Alimentación: `5V→VCC`, `GND→GND` (no lo conectes al revés, si se quema no digas que no te avisé)
> 3. Librería: busca `MD_MAX72xx` en el gestor de librerías de Arduino e instálala; `SPI.h` viene integrada, no hace falta instalarla aparte
> 4. Tras cargar el código, la matriz empezará a "verter arena" automáticamente; no hace falta conectar ningún botón ni sensor para que funcione

---

Dificultad: ⭐⭐⭐☆☆ (si ya has cargado código con Arduino IDE, puedes hacerlo)
Tiempo estimado: 40 minutos (15 minutos de conexión + 25 minutos de carga y depuración)
Entorno de prueba: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + MD_MAX72xx v3.5.1

---

## Prefacio

¿También te pica la curiosidad al ver esos relojes de arena electrónicos en los que los granos caen uno a uno y, al inclinarlos, se acumulan formando una pendiente natural? Mi primera reacción también fue "seguro que hace falta conectar un giroscopio y calcular un montón de fórmulas físicas", pero al ponerme manos a la obra descubrí que la verdadera dificultad no está en el hardware, sino en cómo conseguir que dos matrices cuadradas "finjan" en el código que están rotadas 45° y formen la silueta de un reloj de arena. Este artículo recopila los tropezones que me llevé y la lógica física que terminé de entender. Siguiéndolo, también podrás colocar sobre la mesa un adorno electrónico que "vierte arena" con una placa ESP32 y dos MAX7219.

## Resultado del experimento

Al alimentarlo, la matriz entra automáticamente en un bucle: primero vierte arena de forma estable en vertical, luego simula una inclinación a la izquierda y a la derecha, y los granos forman ángulos de acumulación naturales; por último, "voltea" por completo y el reloj de arena se invierte para empezar a verter de nuevo. Todo el proceso no requiere pulsar ningún botón. Mi experimento actual no utiliza giroscopio: el volteo se basa en datos de ángulo fijados en el código. Dentro del código hay una máquina de estados de "giroscopio simulado" que va cambiando la postura automáticamente.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XYurztJ4_mQ?si=tlLQb6wfhkILGEFL" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Descripción de componentes

> La placa de desarrollo (ESP32) ya la conocéis todos, así que no me enrollo; me centro en el MAX7219.

### MAX7219 — el "traductor" de la matriz de LED

El MAX7219 es un chip driver para LED, encargado de controlar con muy pocos pines toda una matriz de 8×8 = 64 LED. En este proyecto su función es "traducir" los pocos GPIO del ESP32 en un lienzo donde se pueda dibujar; de lo contrario, tendrías que tirar 64 cables para encender cada LED uno por uno, solo pensarlo ya tiemblan las manos.

Puedes entenderlo como un "traductor": el ESP32 solo envía comandos SPI sencillos (qué fila y qué puntos deben encenderse), y el MAX7219 se encarga por su cuenta de repartir la corriente a los LED correspondientes mediante barrido, tan rápido que el ojo humano no percibe parpadeo alguno.

| Parámetro | Valor |
| --- | --- |
| Modo de control | SPI (tres hilos DIN/CLK/CS) |
| LED controlados por chip | 64 (8×8) |
| Tensión de funcionamiento | 4,0 V ~ 5,5 V |
| Modo de cascada | DOUT se conecta al DIN del siguiente chip; admite cadena margarita de varias placas |
| Ajuste de brillo | 16 niveles (en el código de este artículo se usa el nivel 5) |

La razón de elegirlo es que es barato, fácil de encontrar y tiene una librería madura; además, dos placas juntas se pueden "rotar físicamente 45°" para componer la silueta romboidal del reloj de arena, una relación calidad-precio difícil de superar.

### Descripción de pines

La disposición de pines habitual del módulo MAX7219 es la siguiente (algunos fabricantes cambian el orden del serigrafiado; prevalece lo indicado en el reverso del módulo):

| Pin | Función |
| --- | --- |
| VCC / GND | Polo positivo y negativo de la alimentación |
| DIN | Entrada de datos (se conecta al DOUT de la etapa previa o al microcontrolador) |
| DOUT | Salida de datos (se conecta al DIN de la siguiente etapa, para cascada) |
| CS | Señal de selección de chip |
| CLK | Señal de reloj |

## Lista de componentes (BOM)

| Componente | Cantidad | Notas |
| --- | --- | --- |
| Placa de desarrollo ESP32 | 1 | Cualquier modelo, siempre que tenga GPIO disponibles |
| Módulo matriz MAX7219 8×8 | 2 | Recomendable comprar el mismo lote y modelo; el color y brillo serán más uniformes |
| Cables puente | Varios | Recomendables hembras en ambos extremos; quedan más ordenados los puentes entre módulos |

## Forma de conexión

La tabla de texto se presta a equivocarse de fila, así que conviene repasar primero la idea con la imagen de arriba y luego verificar cable a cable con la siguiente tabla.

| ESP32 | Módulo 1 (MAX7219 #1) | Módulo 2 (MAX7219 #2) |
| --- | --- | --- |
| 5V | VCC (IN) → VCC (OUT) | ← VCC (IN) |
| GND | GND (IN) → GND (OUT) | ← GND (IN) |
| GPIO23 | DIN → DOUT | → DIN |
| GPIO5 | CS (IN) → CS (OUT) | → CS (IN) |
| GPIO18 | CLK (IN) → CLK (OUT) | → CLK (IN) |

**Recomendable revisar cable a cable al terminar; te ahorrarás el 80 % del tiempo de depuración**, sobre todo con VCC/GND (no los conectes al revés) y con la dirección IN/OUT de los módulos (no los inviertas): son los dos puntos donde es más fácil tener que rehacer el cableado.

## Librerías que hay que instalar

Abre Arduino IDE → Gestor de librerías y busca e instala lo siguiente:

- `MD_MAX72xx` (autor MajicDesigns; la última versión estable actual es v3.5.1): la librería central para controlar la matriz MAX7219
- `SPI.h`: incluida con Arduino IDE, no hace falta instalarla aparte

Pequeño recordatorio: la librería `MD_MAX72xx` incorpora un ejemplo oficial de Hourglass (reloj de arena). Si el código de este artículo no se ve bien al ejecutarlo, compara con el ejemplo de la librería para descartar que `HARDWARE_TYPE` tenga el modelo equivocado.

## Código completo + explicación

```cpp
/*
  ================================================================
   Reloj de arena electrónico con ESP32, dos MAX7219 8x8 (versión ensamblada con rotación 45°)
  ================================================================

  Descripción de la disposición física del hardware:
  ------------------------------------------------------------
  Dos matrices MAX7219 8x8 normales, conectadas en cadena margarita DIN→DOUT:
     [ESP32] --DIN--> [Módulo 1 (embudo superior)] --DOUT--> [Módulo 2 (embudo inferior)]

  El direccionamiento nativo de MD_MAX72XX es «fila 0~7, columna 0~(8*nº_devices-1)»,
  por lo que 2 dispositivos dan de forma natural un espacio de 8 filas x 16 columnas:
     El módulo 1 ocupa las columnas 0~7   (tras una rotación de 45° es el "embudo superior", vértice en fila7,col7)
     El módulo 2 ocupa las columnas 8~15  (tras una rotación de 45° es el "embudo inferior", vértice en fila0,col8)

  Cada módulo se rota físicamente 45° y se ensambla con el otro; únicamente la pareja
  de casillas (fila7,col7) y (fila0,col8) quedan físicamente pegadas — esta es la
  "zona del cuello" del reloj de arena, y el único canal por el que los granos pueden
  cruzar de un módulo a otro. Fuera de esto, no existe ninguna relación de adyacencia
  física entre la columna 7 y la columna 8 (los dos rombos solo se tocan en un vértice),
  de modo que el código debe bloquear explícitamente el resto de "teletransportes"
  entre columnas.

  Intuición física de la dirección de la gravedad:
  ------------------------------------------------------------
  Como el módulo completo está rotado físicamente 45°, la dirección de fila y de
  columna del propio módulo ya no coincide con la vertical, sino que apuntan
  respectivamente a 45° abajo-izquierda y 45° abajo-derecha del "mundo real". Por tanto:
     - Ambas componentes +1 a la vez (fila+1 y col+1) → corresponde al "abajo real"
     - Solo fila +1 (columna sin cambio) → corresponde a "abajo-izquierda real" (ángulo natural de acumulación)
     - Solo columna +1 (fila sin cambio) → corresponde a "abajo-derecha real" (ángulo natural de acumulación)
  Este es el origen del "vector de gravedad" y de la "componente de deslizamiento lateral"
  de este código. Al voltear el reloj de arena (gravityDir pasa de +1 a -1), ambas
  componentes cambian de signo simultáneamente y el significado físico sigue siendo coherente.

  Anti-fantasma / anti-caída demasiado rápida en un mismo frame:
  ------------------------------------------------------------
  Cada frame se barren las casillas en orden inverso "de aguas abajo -> aguas arriba"
  (con gravityDir=+1 se barre desde fila7,col15 hacia fila0,col0; tras el volteo, al revés),
  lo que garantiza:
     1) Cada grano se mueve como máximo una casilla por frame; no pueden darse
        comprobaciones encadenadas que provoquen un "teletransporte".
     2) La comprobación de si la casilla destino está ocupada usa siempre "el estado
        final ya determinado del frame", sin que dos granos en un mismo frame luchen
        por la misma casilla destino, evitando fantasmas o pérdida de granos.

  Pines (se mantienen los de la conexión que ya validaste):
     DATA_PIN 23 (MOSI)   CLK_PIN 18 (SCK)   CS_PIN 5 (CS)

  Giroscopio:
  ------------------------------------------------------------
  Todavía no hay giroscopio real conectado; este código incorpora una máquina de
  estados de "giroscopio simulado" (fakeGyroX / fakeGyroZ) que genera en bucle,
  según el tiempo:
     estable en vertical -> inclinar a un lado -> nivelar -> voltear por completo -> (a la inversa, otra vez)
  En el futuro, al conectar un sensor real tipo MPU6050, basta con conectar readRealGyro()
  y sustituir fakeGyroX/fakeGyroZ por el ángulo real; el resto del motor de física no necesita cambios.
  ================================================================
*/

#include <MD_MAX72xx.h>
#include <SPI.h>

// ---------------- Configuración de hardware ----------------
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES   2          // Solo 2 módulos 8x8

#define DATA_PIN  23  // VSPI MOSI
#define CLK_PIN   18  // VSPI SCK
#define CS_PIN    5   // VSPI CS0

MD_MAX72XX mx = MD_MAX72XX(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

// ---------------- Corrección de orientación de la pantalla ----------------
// Si al encender ves que está "boca abajo" o que "los dos módulos están
// montados al revés (izq/derecha)", solo tienes que tocar estas dos macros,
// sin necesidad de tocar el algoritmo físico de abajo.
#define FLIP_ROW           true   // ¿Hace falta invertir la dirección de la fila? (7-row)
#define SWAP_MODULE_ORDER  false  // Si el módulo 2 se conecta a la cadena margarita antes que el 1, pon true

// ---------------- Rejilla lógica ----------------
#define ROWS 8
#define COLS 16
// Cuello: salida del módulo 1 (7,7) <-> entrada del módulo 2 (0,8)
#define NECK_A_R 7
#define NECK_A_C 7
#define NECK_B_R 0
#define NECK_B_C 8

bool sand[ROWS][COLS];

// ---------------- Parámetros del motor de física ----------------
#define SAND_TOTAL        42     // Número total de granos, ajustable según el efecto visual (recomendado 30~50)
#define TICK_MS           130    // Paso de cálculo físico (ms); cuanto más pequeño, más rápido cae.
                                  // Al subirlo a ~130 ms se ve claramente cómo caen los granos casilla
                                  // a casilla, y entre los granos que caen por el cuello queda naturalmente
                                  // una casilla de hueco (se llegan a ver de 2 a 3 puntos cayendo con
                                  // separación). Si aun así va rápido, sigue subiéndolo (rango recomendado 100~180).
const float LATERAL_FRICTION = 0.85f;  // "Fricción" del deslizamiento lateral: no todos los frames hay deslizamiento, genera una sensación de pausa natural

int   gravityDir  = 1;     // +1 = vertical (módulo 1 -> módulo 2)   -1 = invertido (módulo 2 -> módulo 1)
float targetBias  = 0.0f;  // Sesgo de inclinación objetivo [-1,1]
float currentBias = 0.0f;  // Sesgo de inclinación actual ya suavizado (acercándose lentamente a targetBias, para evitar saltos bruscos)

unsigned long lastTickMs = 0;

// ================================================================
//                        Motor de física de granos
// ================================================================

inline int moduleOf(int c) { return (c < 8) ? 1 : 2; }

// ¿Es un cruce de cuello legítimo (la única pareja de casillas con permiso para cruzar entre módulos, en ambos sentidos)?
inline bool isNeckPair(int r, int c, int nr, int nc) {
  if (r == NECK_A_R && c == NECK_A_C && nr == NECK_B_R && nc == NECK_B_C) return true;
  if (r == NECK_B_R && c == NECK_B_C && nr == NECK_A_R && nc == NECK_A_C) return true;
  return false;
}

inline bool canMove(int r, int c, int nr, int nc) {
  if (nr < 0 || nr > 7 || nc < 0 || nc > 15) return false;   // Fuera de límites
  if (sand[nr][nc]) return false;                             // Destino ya ocupado
  if (moduleOf(c) != moduleOf(nc)) {                          // ¿Cruce entre módulos?
    if (!isNeckPair(r, c, nr, nc)) return false;              // Solo se permite por el cuello
  }
  return true;
}

inline bool tryMove(int r, int c, int nr, int nc) {
  if (!canMove(r, c, nr, nc)) return false;
  sand[r][c]   = false;
  sand[nr][nc] = true;
  return true;
}

// Calcula la casilla destino "justo abajo" (dirección principal de la gravedad).
// Punto clave: al estar en la punta del cuello, (fila+g, col+g) se sale directamente
// de límites (por ejemplo 7+1=8 supera el rango 0~7), así que hay que redirigir
// explícitamente a la casilla del otro lado del cuello; de lo contrario, el grano
// se quedaría atascado en la punta sin poder cruzar.
inline void primaryTarget(int r, int c, int g, int &nr, int &nc) {
  if (g == 1  && r == NECK_A_R && c == NECK_A_C) { nr = NECK_B_R; nc = NECK_B_C; return; }
  if (g == -1 && r == NECK_B_R && c == NECK_B_C) { nr = NECK_A_R; nc = NECK_A_C; return; }
  nr = r + g;
  nc = c + g;
}

float random01() { return random(0, 10001) / 10000.0f; }

// Decisión de un paso para un solo grano: primero se intenta "justo abajo"; si está bloqueado,
// se desliza lateralmente hacia abajo-izquierda o abajo-derecha según el sesgo de inclinación
void moveGrain(int r, int c) {
  int g = gravityDir;
  int pnr, pnc;
  primaryTarget(r, c, g, pnr, pnc);

  // Cuanto mayor es la inclinación, más se tiende a "saltarse justo abajo y deslizarse directamente",
  // simulando el desplazamiento de la componente de gravedad real
  bool primaryFirst = random01() < (1.0f - fabsf(currentBias) * 0.6f);

  if (primaryFirst) {
    if (tryMove(r, c, pnr, pnc)) return;
  }

  // Deslizamiento lateral: componente A (solo dirección fila) / componente B (solo dirección columna);
  // el sesgo decide el orden de intento
  if (random01() < LATERAL_FRICTION) {
    bool aFirst = random01() < (0.5f - currentBias * 0.5f);
    int arn = r + g, acn = c;      // Componente A: abajo-izquierda (o abajo-derecha, según el sentido de rotación)
    int brn = r,     bcn = c + g;  // Componente B: el otro lado

    if (aFirst) {
      if (tryMove(r, c, arn, acn)) return;
      if (tryMove(r, c, brn, bcn)) return;
    } else {
      if (tryMove(r, c, brn, bcn)) return;
      if (tryMove(r, c, arn, acn)) return;
    }
  }

  // Red de seguridad: si por el sesgo se saltó el intento "justo abajo", aquí se repone
  // y se garantiza que, si justo abajo está realmente libre, el grano acabará cayendo
  // (no se queda bloqueado por la lógica de sesgo)
  if (!primaryFirst) {
    tryMove(r, c, pnr, pnc);
  }
}

// Un frame completo de cálculo: barrido en sentido inverso "de aguas abajo -> aguas arriba",
// para evitar fantasasma y caídas demasiado rápidas
void updateSand() {
  int rStart, rEnd, rStep, cStart, cEnd, cStep;
  if (gravityDir == 1) {
    // Aguas abajo = fila y columna altas -> barrer desde (7,15) hacia (0,0)
    rStart = 7; rEnd = -1; rStep = -1;
    cStart = 15; cEnd = -1; cStep = -1;
  } else {
    // Tras el volteo, aguas abajo = fila y columna bajas -> barrer desde (0,0) hacia (7,15)
    rStart = 0; rEnd = 8; rStep = 1;
    cStart = 0; cEnd = 16; cStep = 1;
  }

  for (int r = rStart; r != rEnd; r += rStep) {
    for (int c = cStart; c != cEnd; c += cStep) {
      if (sand[r][c]) moveGrain(r, c);
    }
  }

  // El sesgo se aproxima suavemente al valor objetivo para que la transición entre
  // inclinación y nivelación sea fluida, no brusca
  currentBias += (targetBias - currentBias) * 0.05f;
}

void initHourglass() {
  memset(sand, 0, sizeof(sand));
  int placed = 0;
  // El primer tramo al arrancar es un vertido "de arriba abajo" con dir=-1 (módulo 2→módulo 1),
  // así que los granos iniciales van al módulo 2 (columnas 8~15). El relleno es la imagen
  // especular del "relleno original del módulo 1" respecto a (r,c)->(7-r,15-c), totalmente
  // simétrico respecto a la física tras el volteo: en el arranque ya está en el estado
  // correcto de "arena llena arriba, vertiendo hacia abajo".
  for (int r = ROWS - 1; r >= 0 && placed < SAND_TOTAL; r--) {
    for (int c = 15; c >= 8 && placed < SAND_TOTAL; c--) {   // Solo rellena el módulo 2
      sand[r][c] = true;
      placed++;
    }
  }
}

// ================================================================
//                    Máquina de estados de giroscopio simulado
//                    (se usa cuando no hay sensor real)
// ================================================================
struct GyroPhase {
  unsigned long durationMs;
  int8_t        dir;      // Dirección de la gravedad de esta fase
  float         bias;     // Sesgo de inclinación objetivo de esta fase
  const char*   name;
  float         gx, gz;   // Lecturas simuladas de giroscopio/acelerómetro, solo para depuración por serie
};

GyroPhase phases[] = {
  // —— Primera fase: de arriba a abajo (dir=-1, módulo 2→módulo 1) ——
  { 16000, -1,  0.00f, "UPRIGHT_POUR(invertido) caída estable en vertical",  0.0f, -1.0f },
  {  4000, -1,  0.85f, "TILT_RIGHT     inclinar a la derecha",                0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          nivelar",                               0.0f, -1.0f },
  {  4000, -1, -0.85f, "TILT_LEFT      inclinar a la izquierda",             -0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          nivelar",                               0.0f, -1.0f },
  {  1400,  1,  0.00f, "FLIP           voltear por completo",                 0.0f,  0.2f },
  // —— Segunda fase: de abajo a arriba (dir=+1, módulo 1→módulo 2) ——
  { 16000,  1,  0.00f, "UPRIGHT_POUR   caída estable en vertical",           0.0f,  1.0f },
  {  4000,  1,  0.85f, "TILT_RIGHT     inclinar a la derecha",                0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          nivelar",                               0.0f,  1.0f },
  {  4000,  1, -0.85f, "TILT_LEFT      inclinar a la izquierda",             -0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          nivelar",                               0.0f,  1.0f },
  { 1400, -1,  0.00f, "FLIP           voltear por completo",                 0.0f, -0.2f },
};
const int NUM_PHASES = sizeof(phases) / sizeof(phases[0]);

int phaseIndex = 0;
unsigned long phaseStartMs = 0;

void updateFakeGyro() {
  unsigned long now = millis();
  if (now - phaseStartMs >= phases[phaseIndex].durationMs) {
    phaseIndex = (phaseIndex + 1) % NUM_PHASES;
    phaseStartMs = now;

    gravityDir = phases[phaseIndex].dir;
    targetBias = phases[phaseIndex].bias;

    Serial.print("[GYRO STATE] -> ");
    Serial.print(phases[phaseIndex].name);
    Serial.print("   gx=");
    Serial.print(phases[phaseIndex].gx, 2);
    Serial.print("g  gz=");
    Serial.println(phases[phaseIndex].gz, 2);
  }
}

// ================================================================
//                          Renderizado a la matriz
// ================================================================
void render() {
  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::OFF);   // Desactiva el refresco automático; tras dibujar todo el frame, refresca a la vez para evitar parpadeos
  mx.clear();

  for (int r = 0; r < ROWS; r++) {
    for (int c = 0; c < COLS; c++) {
      if (!sand[r][c]) continue;

      int dispRow = FLIP_ROW ? (7 - r) : r;
      int dispCol = c;
      if (SWAP_MODULE_ORDER) {
        dispCol = (c < 8) ? (c + 8) : (c - 8);
      }
      mx.setPoint(dispRow, dispCol, true);
    }
  }

  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::ON);
}

// ================================================================
//                             Programa principal
// ================================================================
void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  mx.begin();
  mx.control(MD_MAX72XX::INTENSITY, 5);   // Brillo 0~15, ajustable
  mx.clear();

  initHourglass();

  phaseIndex = 0;
  phaseStartMs = millis();
  gravityDir = phases[0].dir;
  targetBias = phases[0].bias;
  currentBias = 0;

  lastTickMs = millis();

  Serial.println("=== Reloj de arena electrónico ESP32 doble 8x8 MAX7219 iniciado ===");
  Serial.print("[GYRO STATE] -> ");
  Serial.println(phases[0].name);
}

void loop() {
  unsigned long now = millis();

  updateFakeGyro();     // Impulsa la máquina de estados / giroscopio simulado

  if (now - lastTickMs >= TICK_MS) {
    lastTickMs = now;
    updateSand();        // Calcula un frame de física
    render();             // Salida a la matriz
  }
}
```

### Explicación del código

El código parece largo, pero se descompone en tres bloques:

**Primer paso, "soldar" las dos matrices en un sistema de coordenadas de reloj de arena.** `MD_MAX72XX` ve por naturaleza los dos módulos como una rejilla grande de 8 filas × 16 columnas, pero físicamente los dos módulos están cada uno rotados 45° y pegados, así que solo la pareja de casillas `(7,7)` y `(0,8)` están realmente juntas. Eso es el "cuello del reloj de arena" definido por `NECK_A / NECK_B`, y `isNeckPair()` es la encargada de vigilar esa puerta para que los granos no se "salten" de un módulo a otro por otro sitio.

**Segundo paso, que los granos caigan obedientemente casilla a casilla.** `moveGrain()` primero intenta la casilla "justo abajo", y si está bloqueada se desliza lateralmente según la inclinación actual; `updateSand()` barre toda la rejilla en orden estricto de "aguas abajo primero", para evitar que dos granos se peleen por la misma casilla en un mismo frame. Esta es también la parte más recomendable de leer de todo el código: con una regla muy sencilla (primero abajo, luego deslizamiento lateral y una red de seguridad), se reproduce una física aparentemente tan compleja como "la arena se acumula formando un ángulo natural".

**Tercer paso, "alimentar" los parámetros con la máquina de estados de giroscopio simulado.** El array `phases[]` ordena temporalmente un conjunto completo de posturas (vertical, inclinación, nivelación, volteo). `updateFakeGyro()` no es más que un temporizador: al llegar el momento, pasa a la siguiente fase y cambia `gravityDir` y `targetBias`. Cuando en el futuro conectes un giroscopio real, basta con sustituir estas dos variables por el ángulo en tiempo real calculado por el sensor; el motor de física no se toca en absoluto.

## Resolución de problemas frecuentes

Tranqui, el 90 % de los problemas vienen de estos puntos:

**La matriz no enciende en absoluto**
Primero comprueba si VCC/GND están invertidos o en falso contacto, y luego confirma que `DATA_PIN`/`CLK_PIN`/`CS_PIN` coinciden con el cableado real (en este artículo, 23/18/5 por defecto).

**La imagen está boca abajo o los dos módulos están montados al revés (izquierda/derecha)**
No hace falta recablear: cambia las macros `FLIP_ROW` o `SWAP_MODULE_ORDER` del código y vuelve a cargar.

**Los granos se "emborronan" formando una mancha; el movimiento es demasiado rápido para verse bien**
Sube `TICK_MS` del valor por defecto 130 a 150~180; el flujo se ralentizará claramente y tendrá más sensación de grano.

**Error de compilación: no se encuentra `MD_MAX72xx.h`**
Significa que la librería no se instaló bien; vuelve a buscar e instalar `MD_MAX72xx` en el gestor de librerías (ojo a mayúsculas y ortografía).

**Los granos se atascan en el cuello (fila7 columna7 o fila0 columna8) y no caen**
Lo más probable es que `HARDWARE_TYPE` tenga el modelo equivocado. Los módulos MAX7219 vienen en varias variantes como `FC16_HW`, `GENERIC_HW`, `PAROLA_HW`; si el cableado es correcto pero se ve mal, prueba a cambiar entre ellas.

**Al alimentar, pantalla basurada o cuelgues/reinicios ocasionales**
Revisa que los cables puente hacen buen contacto, sobre todo en escenarios con placa de prototipos o cables largos; recomendable que los cables de la cadena margarita sean lo más cortos posibles.

## Preguntas frecuentes (FAQ)

**P: ¿Es obligatorio usar los pines GPIO23/18/5 para conectar el MAX7219 al ESP32?**
R: No es obligatorio. El código de este artículo usa SPI por software (al constructor se le pasan directamente los tres pines DATA/CLK/CS); para cambiar a cualquier otro GPIO disponible solo hay que tocar tres `#define`, sin necesidad de atarse a los pines del SPI por hardware.

**P: ¿Cuántas placas MAX7219 se pueden cascadenar como máximo?**
R: El chip en sí admite en teoría decenas en serie; en la práctica está limitado por la tasa de refresco y la integridad de la señal, pero en proyectos habituales funcionan estable 4~8 placas. Aquí se usan 2; basta con cambiar `MAX_DEVICES` al número correspondiente y cablear bien la cadena margarita.

**P: ¿Qué valor debería poner en `HARDWARE_TYPE`?**
R: Depende del cableado interno del módulo que compres; los dos más habituales son `FC16_HW` y `GENERIC_HW`. Elegir mal no quema el hardware, solo muestra todo desplazado o en espejo. Sin tocar el cableado, cambia esta macro y vuelve a cargar para probar.

**P: ¿Por qué la matriz solo muestra caracteres raros o no muestra nada?**
R: Primero mira si el monitor serie imprime normalmente el registro `[GYRO STATE]`; si lo imprime, el programa está corriendo y el problema está en el mapeo de la pantalla (`FLIP_ROW`/`SWAP_MODULE_ORDER`/`HARDWARE_TYPE`); si no hay registro, el código no llegó a ejecutarse, comprueba la alimentación y que la carga del firmware haya tenido éxito.

**P: ¿Se le puede añadir un giroscopio real a este reloj de arena para convertirlo en una versión "sensible a la inclinación"?**
R: Sí, el código ya deja preparada la interfaz. Añade un sensor tipo MPU6050, lee el ángulo en tiempo real y sustituye la asignación de `gravityDir` y `targetBias` dentro de `updateFakeGyro()`; el motor de física no se toca en absoluto.

**P: ¿Cuánto consume el conjunto aproximadamente, se puede alimentar con una batería externa?**
R: Con dos módulos 8×8 a brillo medio (nivel 5 por defecto en el código), la corriente total suele ser del orden de cien miliamperios; una batería externa o adaptador de teléfono con salida 5 V/1 A basta en la mayoría de casos. Si subes el brillo o amplías con más módulos más adelante, recomendable pasar a un adaptador de mayor corriente para evitar sobrecargar de forma prolongada el pin de 5 V del ESP32.

## Ideas para ampliar

- Conectar un giroscopio MPU6050 real para que el reloj de arena se voltee de verdad según la inclinación de la mano y despedirse del guion del "giroscopio simulado"
- Pegar más módulos MAX7219 para formar una matriz mayor y reproducir animaciones sencillas o desplazamiento de texto
- Añadir un zumbador que pite cuando se acabe de verter la arena, convirtiéndolo en un temporizador de verdad
- Añadir botones para pausar o voltear manualmente, sin esperar a que la máquina de estados cambie sola

## Referencias

- [Hoja de datos oficial del MAX7219/MAX7221 (Analog Devices / Maxim Integrated)](https://www.analog.com/media/en/technical-documentation/data-sheets/max7219-max7221.pdf)
- [Página principal en GitHub de la librería open source MD_MAX72xx](https://github.com/MajicDesigns/MD_MAX72XX) (la librería incluye un ejemplo oficial de Hourglass útil para comparar al depurar)
- Documentación oficial de productos y pines del ESP32 (web de Espressif)
