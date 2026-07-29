---
title: "ESP32-S3 + MAX98357A: Construye un simulador de sonido de motor V8 (audio digital I2S + encoder KY-040 para controlar el acelerador)"
boardId: esp32s3
moduleId: audio/max98357a
moduleIds:
  - audio/max98357a
  - sensor/ky-040
category: esp32
date: 2026-07-14
intro: "Usa un ESP32-S3 para controlar el módulo amplificador MAX98357A junto con un encoder rotatorio KY-040 y sintetiza en tiempo real, puramente por código, el sonido de un motor V8: el acelerador se controla manualmente con el encoder y el sonido sale por un altavoz en tiempo real. Incluye cableado completo, código y registro de tropiezos."
image: "https://img.lingflux.com/2026/07/6c72c55fa63614eb8c2086c24d993d5f.jpg"
---

> **TL;DR (inicio rápido):**
>
> 1. Cableado: BCLK del MAX98357A → GPIO16, LRC → GPIO17, DIN → GPIO15; CLK del KY-040 → GPIO5, DT → GPIO6, SW → GPIO7
> 2. En la placa selecciona **ESP32S3 Dev Module** y en PSRAM **QSPI PSRAM** (si te equivocas tendrás OOM, no me preguntes cómo lo sé)
> 3. Girar el encoder en sentido horario = reducir acelerador, en sentido antihorario = aumentar acelerador, pulsar = volver a ralentí
> 4. Flashea, alimenta y disfruta de tu "vehículo eléctrico con V8"

---

Dificultad: ⭐⭐⭐☆☆ (necesitas saber cablear y flashear básico en Arduino)
Tiempo estimado: 45 minutos
Entorno de pruebas: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + ESP32-S3-WROOM-1-N16R8 (16MB Flash + 8MB PSRAM)

---

## Prefacio

Quien haya montado alguna vez una bici eléctrica conoce esa situación incómoda: te acercas en silencio por detrás a un peatón, que se asusta de golpe, se da la vuelta y te mira con cara de "¿por qué no haces ruido?" — y tú solo puedes ofrecer una sonrisa torpe, porque tu vehículo, efectivamente… no hace ruido.

Los vehículos eléctricos ahorran combustible y son ecológicos, pero tienen una pega que vuelve loco a uno: son demasiado silenciosos. Tanto que parecen un fantasma flotando por la carretera.

Así que me puse a pensar: ya que no podemos depender del ruido natural de un motor, ¿podríamos **fabricar uno** nosotros mismos? No ese "bip bip" barato de un claxon cualquiera, sino… ¡el sonido de un motor V8? Grave, potente, que retumba al pisar a fondo.

El objetivo de este artículo es: con **ESP32-S3 + módulo amplificador MAX98357A + encoder rotatorio KY-040**, sintetizar puramente por código un conjunto de sonido de motor V8, donde el acelerador se controla a mano con el encoder y el sonido sale por un altavoz en tiempo real. Sin samples, sin archivos de audio, todo generado por operaciones matemáticas en tiempo real.



---

## Resultado del experimento

Al girar el encoder KY-040 para subir el acelerador, el altavaz pasa gradualmente del retumbar grave del ralentí al rugido agudo de un motor a altas revoluciones; al pulsar el botón del encoder, el acelerador vuelve a cero al instante y se regresa al ralentí. Toda la transición de sonido es suave, sin saltos bruscos, y suena bastante convincente.


<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/30IWSgfp3IY?si=XXwD3KaDonejM5WD" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
---

## Descripción de los componentes

> La placa (ESP32-S3) no se describe, nos centramos en los otros dos protagonistas.

### MAX98357A — el traductor de señales digitales

Imagina que tienes una grabación digital (una cadena de 0 y 1), pero el altavoz solo entiende señales analógicas (variaciones de tensión). El MAX98357A es el **intérprete simultáneo** entre ambos: recibe el audio digital que el ESP32-S3 envía por el protocolo I2S, lo convierte al instante en una corriente analógica capaz de mover el altavoz, y lleva integrado un amplificador de 3W, así que no hace falta ninguna etapa extra.

| Parámetro | Valor |
|-----------|-------|
| Tensión de alimentación | 2.5V ~ 5.5V |
| Potencia de salida | 3.2W (carga 4Ω, alimentación 5V) |
| Frecuencias de muestreo | 8kHz ~ 96kHz |
| Protocolo de comunicación | I2S |
| Pasos de ganancia | 3dB / 6dB / 9dB / 12dB / 15dB |
| Control de silencio | El pin SD a bajo silencia |

La razón para elegirlo es sencilla: **conexión directa por I2S, sin filtro necesario, encapsulado modular, 3W suficientes para una bici**, y además se encuentra por menos de diez yuanes en tiendas online.

### Descripción de pines

| Marca del pin | Descripción de la función |
|---------------|---------------------------|
| VIN | Polo positivo de la alimentación, a 5V |
| GND | Masa de la alimentación |
| BCLK | Reloj de bit I2S |
| LRC | Reloj de palabra I2S (selección de canal izquierdo/derecho) |
| DIN | Entrada de datos de audio digital I2S |
| SD | Control de silencio, al aire o a nivel alto = funcionamiento normal, a bajo = silencio |
| GAIN | Selección de ganancia, por defecto 9dB si se deja al aire |

> **Atención**: el pin SD se puede dejar sin conectar o a 3.3V y el altavoz sonará; si ves que el cableado está bien pero no hay sonido, comprueba primero que el pin SD no se haya puesto a bajo por accidente.

---

### KY-040 — el "dial de volumen" de rotación infinita

Un potenciómetro normal se atasca al llegar al fondo; el KY-040 es un encoder con rotación continua de 360°. No entrega una posición absoluta, sino que te dice "en qué dirección y cuántos pasos has girado". En este proyecto lo uso para controlar el acelerador: **sentido horario reduce acelerador, sentido antihorario aumenta acelerador, pulsar el botón vuelve a ralentí**, con una sensación táctil como si estuvieras girando un mando real de acelerador.

| Parámetro | Valor |
|-----------|-------|
| Tensión de trabajo | 3.3V ~ 5V |
| Pasos por vuelta | 20 pasos |
| Señales de salida | Fase A (CLK) / Fase B (DT) / Botón (SW) |
| Tipo de interfaz | GPIO digital (con pull-up interno) |

Por qué elegirlo: **barato, común y el botón es un plus**, está basado en interrupciones y apenas carga la CPU, así que encaja sin esfuerzo con una arquitectura de tareas FreeRTOS.

### Descripción de pines

| Marca del pin | Descripción de la función |
|---------------|---------------------------|
| CLK (fase A) | Salida de la fase A del encoder rotatorio, a un pin de interrupción |
| DT (fase B) | Salida de la fase B del encoder rotatorio, para determinar el sentido de giro |
| SW | Salida del botón, nivel bajo al pulsar |
| + | Polo positivo de la alimentación, a 3.3V |
| GND | Masa de la alimentación |

---

## Lista de materiales (BOM)

| Componente | Modelo / especificación | Cantidad | Notas |
|------------|-------------------------|----------|-------|
| Placa principal | ESP32-S3-WROOM-1-N16R8 | 1 | 16MB Flash + 8MB PSRAM, imprescindible que tenga PSRAM |
| Módulo amplificador I2S | MAX98357A | 1 | Incluye la placa del módulo, la versión sin soldadura es más cómoda |
| Módulo de encoder rotatorio | KY-040 | 1 | Con botón |
| Altavoz pequeño | 4Ω 3W | 1 | O de 8Ω, el volumen será algo menor |
| Cables Dupont | Macho-macho / macho-hembra | Varios | Para el cableado |
| Protoboard | Cualquiera | 1 | Opcional, fija el cableado con más comodidad |

---

## Esquema de cableado

### MAX98357A ↔ ESP32-S3

| MAX98357A | ESP32-S3 |
|-----------|----------|
| VIN | 5V |
| GND | GND |
| BCLK | GPIO16 |
| LRC | GPIO17 |
| DIN | GPIO15 |

### KY-040 ↔ ESP32-S3

| KY-040 | ESP32-S3 |
|--------|----------|
| CLK | GPIO5 |
| DT | GPIO6 |
| SW | GPIO7 |
| + | 3.3V |
| GND | GND |

> Recomendación: tras conectar cada cable, ve marcándolo en la tabla uno a uno; este hábito te ahorra el 80% del tiempo de depuración. Sobre todo la GND: que varios módulos compartan masa es imprescindible para que el audio funcione — solo si todos "hablan el mismo idioma", la señal se transmite con precisión.

---

## Librerías que necesitas instalar

Este proyecto **no depende de ninguna librería de audio de terceros**; todo el audio se sintetiza por código en tiempo real y solo se usa el `driver/i2s.h` que viene con el ESP32 Arduino Core.

Solo necesitas verificar este entorno en Arduino IDE:

| Elemento | Requisito |
|----------|-----------|
| Arduino IDE | 2.3.8 (probado OK) |
| ESP32 Arduino Core | 3.3.10 (instala desde Board Manager buscando `esp32`) |
| Opción de placa | ESP32S3 Dev Module |
| **Opción PSRAM** | **QSPI PSRAM** (si te equivocas aquí tendrás OOM directo, ver registro de tropiezos) |
| Flash Size | 16MB |
| Upload Speed | 921600 |

En el menú **Herramientas (Tools)** de Arduino IDE repasa cada una de las opciones anteriores, sobre todo la línea de PSRAM.

---

## Código completo + explicación

```cpp
/*
 * ESP32-S3 + MAX98357A + encoder rotatorio KY-040
 * Simulador de sonido de motor V8
 *
 * Cableado:
 *   MAX98357A    ESP32-S3
 *   VIN       -> 5V
 *   GND       -> GND
 *   BCLK      -> GPIO16
 *   LRC       -> GPIO17
 *   DIN       -> GPIO15
 *
 *   KY-040       ESP32-S3
 *   CLK       -> GPIO5
 *   DT        -> GPIO6
 *   SW        -> GPIO7  (pulsar pone el acelerador a cero)
 *   +         -> 3.3V
 *   GND       -> GND
 *
 * Instrucciones de uso:
 *   Giro en sentido horario = reducir acelerador
 *   Giro en sentido antihorario = aumentar acelerador
 *   Pulsar el encoder = acelerador a cero (volver a ralentí)
 *
 * Velocidad de puerto serie: 115200
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// -----------------------------------------------
// Si te enfrentas a reinicios por Brownout,
// cambia esto a 1 temporalmente para hacer pruebas.
// En uso real mantén 0; no se recomienda desactivar
// la protección de subtensión de forma prolongada.
// -----------------------------------------------
#define DISABLE_BROWNOUT_FOR_TEST 0

#if DISABLE_BROWNOUT_FOR_TEST
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

// ================= Paso 1: definición de pines I2S =================
#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

// ================= Paso 2: definición de pines del KY-040 =================
#define ENCODER_CLK_PIN   5
#define ENCODER_DT_PIN    6
#define ENCODER_SW_PIN    7

// ================= Parámetros del acelerador por encoder =================
// Variación de acelerador por cada paso girado (rango 0.0~1.0)
// Redúcelo = harán falta más pasos hasta acelerador a fondo, tacto más fino
#define ENCODER_STEP_SIZE     0.1f

// Coeficiente de suavizado del acelerador (mayor = respuesta más rápida, menor = transición más sedosa)
#define ENCODER_SMOOTHING     1.2f

// Tiempo de rebote del encoder (microsegundos), evita que un giro se lea como varios
#define ENCODER_DEBOUNCE_US   200

// Tiempo de rebote del botón (milisegundos)
#define BUTTON_DEBOUNCE_MS    200

// ================= Parámetros básicos de audio =================
#define SAMPLE_RATE     22050   // Frecuencia de muestreo, en Hz
#define DMA_BUF_COUNT   8       // Número de búferes DMA
#define DMA_BUF_LEN     256     // Muestras por búfer DMA

// ================= Parámetros de revoluciones del motor =================
#define RPM_IDLE        800.0f    // RPM de ralentí
#define RPM_MAX         8000.0f   // RPM máximas
#define RPM_SMOOTHING   0.006f    // Suavizado de cambios de RPM, menor = más realista
#define NUM_CYLINDERS   8         // V8 = 8 cilindros

// ================= Ritmo del "pum" de escape =================
// En ralentí 2 pulsos por segundo, a máximas revoluciones 7.6 por segundo
#define THUMP_HZ_IDLE   2.0f
#define THUMP_HZ_MAX    7.6f

// ================= Parámetros de volumen =================
#define MASTER_VOLUME       1.00f
#define PCM_OUTPUT_SCALE    26000.0f   // Escala final a PCM de 16 bits

// Volumen del sonido de fondo del motor (ralentí / máx. revoluciones)
#define BACKGROUND_GAIN_IDLE  0.45f
#define BACKGROUND_GAIN_MAX   0.60f

// Volumen de la capa principal de "pum" (ralentí / máx. revoluciones)
#define THUMP_LAYER_GAIN_IDLE 0.75f
#define THUMP_LAYER_GAIN_MAX  1.05f

// ================= Parámetros del "pum" de escape recto modificado =================
// Los siguientes parámetros controlan la forma de onda de cada pulso de escape; ajusta con cuidado
#define THUMP_ATTACK_MS       5.0f    // Tiempo de ataque (ms)
#define THUMP_BODY_MS         38.0f   // Duración del cuerpo (ms)
#define THUMP_TAIL_MS         62.0f   // Tiempo de caída de la cola (ms)

#define THUMP_F_START         105.0f  // Frecuencia inicial del "pum" (Hz)
#define THUMP_F_BODY          82.0f   // Frecuencia del cuerpo (Hz)
#define THUMP_F_END           64.0f   // Frecuencia de la cola (Hz)

#define THUMP_NOISE_MIX       0.22f   // Proporción de ruido mezclado (simula el flujo de escape)
#define THUMP_TONE2_MIX       0.30f   // Proporción del 2º armónico
#define THUMP_TONE3_MIX       0.16f   // Proporción del 3er armónico
#define THUMP_SUB_MIX         0.08f   // Proporción subsónica (refuerza el carácter grave)

#define THUMP_DRIVE           2.10f   // Saturación de la onda (intensidad del recorte suave tanh)
#define THUMP_BURST_MIX       0.28f   // Peso del ruido de flujo en el ataque

#define THUMP_REBOUND_DELAY_MS 30.0f  // Retardo del rebote de escape (ms), simula la resonancia del tubo
#define THUMP_REBOUND_GAIN     0.18f  // Ganancia del rebote

#define THUMP_ALT_GAIN         0.94f  // Diferencia de ganancia entre cilindros alternos, simula encendido desigual
#define THUMP_SWING            0.06f  // Cantidad de swing del ritmo, añade groove

#define THUMP_TABLE_GAIN       2.50f  // Ganancia global de la tabla de ondas del "pum"

// ================= Definición de tablas de búsqueda =================
#define SINE_TABLE_SIZE 2048     // Tamaño de la tabla de seno (mayor = más precisión y más memoria)
#define THUMP_TABLE_MAX 8000     // Número máximo de muestras en la tabla del "pum"

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

// Búfer de salida estéreo (DMA_BUF_LEN muestras por cada canal L/R)
static int16_t stereoBuffer[DMA_BUF_LEN * 2];

// ================= Variables de estado globales =================
volatile float throttleValue  = 0.0f;   // Valor de acelerador ya suavizado (0.0~1.0)
volatile float targetThrottle = 0.0f;   // Acelerador objetivo fijado por el encoder
volatile float targetRPM      = RPM_IDLE;
volatile float currentRPM     = RPM_IDLE;
volatile float currentThumpHz = THUMP_HZ_IDLE;

uint32_t noiseSeed = 123456789;

// Tabla de desfases de fase de los cilindros del V8 (simula encendido cada 90°)
float cylinderPhase[NUM_CYLINDERS];

const float firingAngles[NUM_CYLINDERS] = {
  0.0f, 90.0f, 150.0f, 210.0f,
  270.0f, 330.0f, 390.0f, 450.0f
};

// ================= Variables de interrupción del encoder =================
volatile int encoderPosition = 0;
volatile unsigned long lastEncoderInterruptUs = 0;
volatile bool encoderButtonPressed = false;
volatile unsigned long lastButtonPressMs = 0;

// ================= Funciones auxiliares =================

// Limita un valor a un rango
static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// Escalón suave para transiciones más sedosas (curva forma de S)
static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

// Cálculo rápido de sin usando tabla, mucho más veloz que sinf(), imprescindible en audio en tiempo real
float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;

  // Interpolación lineal para mayor precisión
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

// Generador de rudo pseudoaleatorio (congruencia lineal, rápido, simula el sonido de flujo de aire)
float pseudoRandom() {
  noiseSeed = noiseSeed * 1664525UL + 1013904223UL;
  return ((float)(noiseSeed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// Pseudoaleatorio con semilla independiente, para que cada "pum" suene igual
float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= Interrupción del encoder: determina el sentido de giro =================
void IRAM_ATTR encoderISR() {
  unsigned long nowUs = micros();

  // Antirrebote: si dos interrupciones están demasiado cerca, se ignora para evitar falsos disparos
  if (nowUs - lastEncoderInterruptUs < ENCODER_DEBOUNCE_US) return;
  lastEncoderInterruptUs = nowUs;

  // Se dispara en el flanco de bajida de CLK; en ese momento se lee DT para saber el sentido
  // DT = LOW  -> sentido horario    -> reducir acelerador
  // DT = HIGH -> sentido antihorario -> aumentar acelerador
  int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState == LOW) {
    encoderPosition--;  // Horario: reducir acelerador
  } else {
    encoderPosition++;  // Antihorario: aumentar acelerador
  }
}

// ================= Interrupción del botón: pulsar pone el acelerador a cero =================
void IRAM_ATTR buttonISR() {
  unsigned long nowMs = millis();
  if (nowMs - lastButtonPressMs < BUTTON_DEBOUNCE_MS) return;
  lastButtonPressMs = nowMs;
  encoderButtonPressed = true;
}

// ================= Inicializa pines e interrupciones del encoder =================
void initEncoder() {
  pinMode(ENCODER_CLK_PIN, INPUT_PULLUP);
  pinMode(ENCODER_DT_PIN,  INPUT_PULLUP);
  pinMode(ENCODER_SW_PIN,  INPUT_PULLUP);

  // Flanco de bajida de CLK dispara la detección de giro
  attachInterrupt(digitalPinToInterrupt(ENCODER_CLK_PIN), encoderISR, FALLING);
  // Flanco de bajida de SW dispara la detección del botón (nivel bajo al pulsar)
  attachInterrupt(digitalPinToInterrupt(ENCODER_SW_PIN),  buttonISR, FALLING);

  Serial.println("Encoder KY-040 inicializado");
}

// ================= Paso 3: precalcular la tabla de seno =================
// Calcula de antemano 2048 valores de sin y los guarda en memoria; en reproducción se consulta la tabla, ahorra CPU
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

// ================= Inicializa los desfases de los 8 cilindros =================
void initCylinderPhases() {
  for (int i = 0; i < NUM_CYLINDERS; i++) {
    // Convierte el ángulo a fase 0.0~1.0 (720° = un ciclo de combustión completo)
    cylinderPhase[i] = firingAngles[i] / 720.0f;
  }
}

// ================= Genera la forma de onda del pulso de escape de un cilindro =================
// phase es la fase actual 0.0~1.0; devuelve la amplitud en ese instante
float generateCylinderPulse(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float pulse = 0.0f;

  if (phase < 0.30f) {
    // Primer 30%: subida rápida, simula el impacto de la apertura de la válvula de escape
    float t = phase / 0.30f;
    pulse = sinf(M_PI * t) * expf(-2.2f * t) * 1.35f;
  } else if (phase < 0.50f) {
    // 30%~50%: ligero rebote, simula la contrapresión del tubo
    float t = (phase - 0.30f) / 0.20f;
    pulse = -0.25f * sinf(M_PI * 2.0f * t) * expf(-5.0f * t);
  }
  // Último 50%: silencio, a la espera del siguiente escape

  return pulse;
}

// ================= Paso 4: precalcular la tabla de ondas del "pum" =================
// Calcula de antemano un "pum" completo y lo guarda en un array; en reproducción se lee, ahorra CPU
void buildStraightPipeThumpTable() {
  int attackS  = (int)(THUMP_ATTACK_MS  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(THUMP_BODY_MS    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(THUMP_TAIL_MS    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(THUMP_REBOUND_DELAY_MS * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen  = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;  // Más la cola del rebote

  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1   = 0.0f;  // Fase de la frecuencia fundamental
  float phase2   = 0.0f;  // Fase del 2º armónico
  float phase3   = 0.0f;  // Fase del 3er armónico
  float phaseSub = 0.0f;  // Fase subsónica

  float noiseLP1 = 0.0f;  // Estado del filtro paso bajo 1
  float noiseLP2 = 0.0f;  // Estado del filtro paso bajo 2
  uint32_t seed  = 24681357;

  for (int i = 0; i < totalLen; i++) {

    // --- Envoltorio principal (ataque -> cuerpo -> caída) ---
    float env1 = 0.0f;

    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;  // Cuadrado para un ataque más agresivo
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    // --- Envoltorio del rebote (un eco pequeño retardado) ---
    int j = i - reboundS;
    float env2 = 0.0f;

    if (j >= 0) {
      if (j < attackS) {
        float x = (float)j / (float)attackS;
        env2 = smoothstep01(x);
        env2 = env2 * env2;
      } else if (j < attackS + bodyS) {
        float x = (float)(j - attackS) / (float)bodyS;
        env2 = 1.0f - 0.28f * x;
      } else if (j < mainLen) {
        float x = (float)(j - attackS - bodyS) / (float)tailS;
        env2 = 0.72f * expf(-3.8f * x);
      }
      env2 *= THUMP_REBOUND_GAIN;  // El rebote es mucho menor que el cuerpo
    }

    float env = clampf(env1 + env2, 0.0f, 1.5f);

    // --- La frecuencia cae con el tiempo (simula la caída de tono tras liberar la presión de escape) ---
    float freq = THUMP_F_END;
    if (i < attackS) {
      freq = THUMP_F_START;
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      freq = THUMP_F_START + (THUMP_F_BODY - THUMP_F_START) * x;
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      freq = THUMP_F_BODY + (THUMP_F_END - THUMP_F_BODY) * x;
    }

    float inc1 = freq / (float)SAMPLE_RATE;

    phase1   += inc1;       if (phase1   >= 1.0f) phase1   -= 1.0f;
    phase2   += inc1 * 2.0f; if (phase2  >= 1.0f) phase2   -= 1.0f;
    phase3   += inc1 * 3.0f; if (phase3  >= 1.0f) phase3   -= 1.0f;
    phaseSub += inc1 * 0.5f; if (phaseSub >= 1.0f) phaseSub -= 1.0f;

    // --- Parte tonal: fundamental + armónicos + subsónica ---
    float base = fastSin(phase1);
    base = tanhf(base * THUMP_DRIVE);  // Recorte suave, simula la distorsión no lineal del tubo

    float tonal =
        0.82f          * base
      + THUMP_TONE2_MIX * fastSin(phase2)
      + THUMP_TONE3_MIX * fastSin(phase3)
      + THUMP_SUB_MIX   * fastSin(phaseSub);

    // --- Parte de ruido: simula el siseo del flujo de aire ---
    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);   // Paso bajo de dos etapas, desplaza el rudio hacia graves
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;     // Efecto paso banda

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;  // En la segunda mitad el rudio de flujo baja

    float air = bandNoise * (THUMP_NOISE_MIX * (0.25f * env + THUMP_BURST_MIX * 0.75f * earlyEnv));

    // --- Mezcla tono y flujo, y aplica otro recorte suave asimétrico ---
    float sample = tonal * env + air;
    sample += 0.08f * env * env1;  // Ligera saturación no lineal, da más cuerpo al sonido

    if (sample > 0.0f) {
      sample = tanhf(sample * 1.15f) * 1.05f;  // Semionda positiva un poco empujada
    } else {
      sample = tanhf(sample * 0.85f);           // Semionda negativa un poco comprimida
    }

    sample *= THUMP_TABLE_GAIN;
    thumpTable[i] = clampf(sample, -1.0f, 1.0f);
  }

  thumpTableLen = totalLen;

  Serial.printf("Tabla del pum generada, longitud=%d muestras, aprox. %d ms\n",
    thumpTableLen,
    (int)((float)thumpTableLen * 1000.0f / SAMPLE_RATE));
}

// ================= Paso 5: inicializar el driver I2S =================
void initI2S() {
  i2s_config_t i2s_config = {
    .mode                = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate         = SAMPLE_RATE,
    .bits_per_sample     = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format      = I2S_CHANNEL_FMT_RIGHT_LEFT,   // Estéreo (un canal L y uno R)
    .communication_format= I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags    = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count       = DMA_BUF_COUNT,
    .dma_buf_len         = DMA_BUF_LEN,
    .use_apll            = false,
    .tx_desc_auto_clear  = true,   // Limpia automáticamente tras enviar, evita ruido
    .fixed_mclk          = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK,
    .ws_io_num    = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num  = I2S_PIN_NO_CHANGE  // Solo envío, no recepción
  };

  esp_err_t err;

  err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("Fallo al instalar el driver I2S: %d\n", (int)err);
    while (1) delay(100);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("Fallo al configurar los pines I2S: %d\n", (int)err);
    while (1) delay(100);
  }

  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S inicializado");
}

// ================= Actualizar acelerador (lo llama throttleTask cada 20ms) =================
void updateThrottle() {

  // Gestiona el botón: al pulsar, pone a cero la posición del encoder y el acelerador
  if (encoderButtonPressed) {
    encoderButtonPressed = false;
    encoderPosition = 0;
    targetThrottle  = 0.0f;
    Serial.println(">>> Botón pulsado: acelerador a cero!");
  }

  // Limita el rango de la posición del encoder para no pasarse del rango 0~acelerador a fondo
  int maxSteps = (int)(1.0f / ENCODER_STEP_SIZE);  // Por defecto 10 pasos hasta el fondo

  if (encoderPosition < 0)        encoderPosition = 0;
  if (encoderPosition > maxSteps) encoderPosition = maxSteps;

  // Convierte el número de pasos en un valor de acelerador 0.0~1.0
  targetThrottle = clampf((float)encoderPosition * ENCODER_STEP_SIZE, 0.0f, 1.0f);

  // Transición suave: avanza solo un paso pequeño cada vez, evita saltos bruscos que producen clics
  throttleValue += (targetThrottle - throttleValue) * ENCODER_SMOOTHING;
  throttleValue  = clampf(throttleValue, 0.0f, 1.0f);

  // Calcula las RPM objetivo según el acelerador
  targetRPM = RPM_IDLE + throttleValue * (RPM_MAX - RPM_IDLE);
}

// ================= Tarea de generación de audio (núcleo 1, máxima prioridad) =================
void audioTask(void *param) {
  float crankPhase = 0.0f;   // Fase del cigüeñal, impulsa todos los cilindros

  float bgLpf    = 0.0f;    // Estado del paso bajo del sonido de fondo
  float bgHpfIn  = 0.0f;    // Entrada del paso alto del fondo
  float bgHpfOut = 0.0f;    // Salida del paso alto del fondo

  int   playPosA = -1;       // Posición actual de reproducción de la voz A del pum (-1 = inactiva)
  int   playPosB = -1;       // Voz B del pum (fundido de la voz anterior)
  float gainA    = 1.0f;
  float gainB    = 0.55f;

  int  samplesToNextTrigger = 0;   // Muestras que faltan hasta el siguiente disparo del pum
  bool altToggle = false;          // Marca de alternancia entre cilindros

  float thumpLpf  = 0.0f;   // Estado del paso bajo del pum
  float outHpfIn  = 0.0f;   // Entrada del paso alto de salida
  float outHpfOut = 0.0f;   // Salida del paso alto de salida

  uint32_t jitterSeed = 987654321;

  unsigned long audioStartMs = millis();

  Serial.println("Tarea de audio iniciada");

  while (true) {

    // --- Las RPM siguen suavemente al objetivo (simula la inercia real del motor) ---
    currentRPM += (targetRPM - currentRPM) * RPM_SMOOTHING;

    // Valor normalizado de las RPM actuales en el rango 0.0~1.0
    float rpmNorm = clampf((currentRPM - RPM_IDLE) / (RPM_MAX - RPM_IDLE), 0.0f, 1.0f);

    // Incremento de fase del cigüeñal por cada muestra (ciclo de 4 tiempos / 2)
    float cycleIncrement = ((currentRPM / 60.0f) / (float)SAMPLE_RATE) / 2.0f;

    // Frecuencia actual del pum
    float thumpHz = THUMP_HZ_IDLE + rpmNorm * (THUMP_HZ_MAX - THUMP_HZ_IDLE);
    currentThumpHz = thumpHz;

    // El volumen cambia con las RPM
    float bgGain = BACKGROUND_GAIN_IDLE + rpmNorm * (BACKGROUND_GAIN_MAX - BACKGROUND_GAIN_IDLE);
    float thumpLayerGain = THUMP_LAYER_GAIN_IDLE + rpmNorm * (THUMP_LAYER_GAIN_MAX - THUMP_LAYER_GAIN_IDLE);

    // La frecuencia de corte del paso bajo sube con las RPM (a altas revoluciones el fondo brilla más)
    float bgLpfAlpha = 0.16f + 0.55f * rpmNorm;

    // Fundido de entrada (evita el pop al arrancar)
    float fadeIn = clampf((float)(millis() - audioStartMs) / 1800.0f, 0.0f, 1.0f);

    // --- Generación de audio muestra a muestra ---
    for (int i = 0; i < DMA_BUF_LEN; i++) {

      // ====================================================
      // Capa 1: sonido de fondo del motor — suma de los pulsos de escape de los 8 cilindros
      // ====================================================
      float bg = 0.0f;

      for (int cyl = 0; cyl < NUM_CYLINDERS; cyl++) {
        float phase = crankPhase - cylinderPhase[cyl];
        while (phase < 0.0f) phase += 1.0f;
        while (phase >= 1.0f) phase -= 1.0f;

        float pulse = generateCylinderPulse(phase);
        float cylGain = (cyl % 2 == 0) ? 1.0f : 0.82f;  // Ligera diferencia entre cilindros pares e impares, más realista
        bg += pulse * cylGain;
      }

      bg /= (float)NUM_CYLINDERS * 0.42f;

      // Capa de armónicos (énfasis en graves, reduce el zumbido de los armónicos altos)
      float basePhase  = crankPhase * 4.0f;
      float harmonics  = 0.0f;

      harmonics += fastSin(basePhase)        * 1.00f;
      harmonics += fastSin(basePhase * 0.5f) * 0.60f;   // Frecuencia mitad: refuerza el carácter grave
      harmonics += fastSin(basePhase * 1.5f) * 0.28f;
      harmonics += fastSin(basePhase * 2.0f) * (0.25f + 0.10f * rpmNorm);
      harmonics += fastSin(basePhase * 3.0f) * (0.08f + 0.08f * rpmNorm);
      harmonics += fastSin(basePhase * 4.0f) * (0.03f * rpmNorm);  // El 4º armónico es la fuente del zumbido, muy atenuado
      harmonics /= 2.4f;

      bg = bg * 0.55f + harmonics * 0.45f;
      bg = tanhf(bg * (1.05f + rpmNorm * 0.8f));  // Recorte suave, simula la no linealidad del tubo

      // Añade ruido mecánico de bajas frecuencias (retumbar, no siseo)
      float rumble   = pseudoRandom();
      float rumble2  = pseudoRandom();
      bg += (rumble * 0.6f + rumble2 * 0.4f) * (0.008f + 0.018f * rpmNorm);

      // Paso bajo (hace que suene más apagado, como si viniera del tubo)
      float bgLpfAlpha2 = 0.18f + 0.45f * rpmNorm;
      bgLpf += bgLpfAlpha2 * (bg - bgLpf);
      bg = bgLpf;

      // Paso alto ligero (elimina el offset DC)
      float bgHp = 0.992f * (bgHpfOut + bg - bgHpfIn);
      bgHpfIn  = bg;
      bgHpfOut = bgHp;
      bg = bg * 0.92f + bgHp * 0.08f;

      bg *= bgGain;

      // ====================================================
      // Capa 2: pum principal — sonido del tubo recto modificado
      // ====================================================

      // Al llegar el momento se dispara un nuevo pum
      if (samplesToNextTrigger <= 0) {

        // Fundir el pum anterior como voz B (superposición de colas)
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.50f;
        }

        playPosA = 0;

        // Alternar par/impar: simula la ligera diferencia de fuerza entre cilindros del V8
        gainA = altToggle ? THUMP_ALT_GAIN : 1.0f;

        // Calcula el intervalo hasta el siguiente disparo (con swing y jitter para más groove)
        float intervalSamples = (float)SAMPLE_RATE / thumpHz;
        float swingFactor = altToggle ? (1.0f - THUMP_SWING) : (1.0f + THUMP_SWING);
        float jitter = 1.0f + localRandSigned(jitterSeed) * 0.025f;

        samplesToNextTrigger = (int)clampf(intervalSamples * swingFactor * jitter, 1.0f, 999999.0f);
        altToggle = !altToggle;
      }

      samplesToNextTrigger--;

      float thump = 0.0f;

      // Lee la voz A
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) {
          thump += thumpTable[playPosA++] * gainA;
        } else {
          playPosA = -1;
        }
      }

      // Lee la voz B (la cola en fundido del pum anterior)
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) {
          thump += thumpTable[playPosB++] * gainB;
          gainB *= 0.9992f;  // Fundido lento
        } else {
          playPosB = -1;
        }
      }

      // Paso bajo para redondear el borde del pum y que no suene tan duro
      thumpLpf += 0.58f * (thump - thumpLpf);
      thump = thumpLpf * thumpLayerGain;

      // ====================================================
      // Capa 3: mezcla ambas capas y saca la salida
      // ====================================================
      float sample = bg + thump;

      // Paso alto final de salida (elimina el desplazamiento DC de baja frecuencia)
      float outHp = 0.988f * (outHpfOut + sample - outHpfIn);
      outHpfIn  = sample;
      outHpfOut = outHp;
      sample = sample * 0.86f + outHp * 0.14f;

      // Recorte suave global (evita saturación al sumar las dos capas)
      sample = tanhf(sample * (1.05f + 0.22f * rpmNorm));

      sample *= MASTER_VOLUME * fadeIn;
      sample  = clampf(sample, -0.98f, 0.98f);

      // Convierte a PCM de 16 bits, canales L y R iguales (altavoz mono)
      int16_t out = (int16_t)(sample * PCM_OUTPUT_SCALE);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;

      // Avanza la fase del cigüeñal
      crankPhase += cycleIncrement;
      if (crankPhase >= 1.0f) crankPhase -= 1.0f;
    }

    // Escribe este lote de audio en el DMA de I2S; al terminar genera el siguiente
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= Tarea del acelerador (núcleo 0, prioridad baja) =================
void throttleTask(void *param) {
  while (true) {
    updateThrottle();
    vTaskDelay(pdMS_TO_TICKS(20));  // Actualiza el acelerador cada 20ms, suficientemente fluido
  }
}

// ================= Tarea de monitorización por puerto serie (núcleo 0, prioridad mínima) =================
void monitorTask(void *param) {
  char buf[128];

  while (true) {
    int rpmInt      = (int)(currentRPM + 0.5f);
    int targetInt   = (int)(targetRPM  + 0.5f);
    int throttlePct = (int)(throttleValue * 100.0f + 0.5f);
    int thumpHz10   = (int)(currentThumpHz * 10.0f + 0.5f);

    snprintf(buf, sizeof(buf),
      "RPM=%d  objetivo=%d  acelerador=%d%%  encoder=%d  f_pum=%d.%dHz",
      rpmInt, targetInt, throttlePct, encoderPosition,
      thumpHz10 / 10, thumpHz10 % 10);

    Serial.println(buf);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

// ================= setup: inicialización del sistema =================
void setup() {
#if DISABLE_BROWNOUT_FOR_TEST
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  Serial.begin(115200);
  delay(1000);

  // Al arrancar comprueba el estado de la memoria (si PSRAM es 0, no se inició; vuelve y pon QSPI)
  Serial.printf("SRAM de chip libre: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("PSRAM externa libre: %d bytes\n", ESP.getFreePsram());

  Serial.println("====================================");
  Serial.println("Simulador de sonido V8 para ESP32-S3");
  Serial.println("Pum principal: tubo recto modificado");
  Serial.println("Control del acelerador: encoder KY-040");
  Serial.println("====================================");

  initEncoder();
  initSineTable();
  initCylinderPhases();
  buildStraightPipeThumpTable();
  initI2S();

  // Tarea de audio: núcleo 1, máxima prioridad, pila de 12KB
  xTaskCreatePinnedToCore(audioTask,    "AudioTask", 12288, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  // Tarea del acelerador: núcleo 0, prioridad 2, pila de 3KB
  xTaskCreatePinnedToCore(throttleTask, "Throttle",  3072,  NULL, 2,                        NULL, 0);
  // Tarea de monitorización: núcleo 0, prioridad mínima, pila de 4KB (no demasiado pequeña, evitaría desbordamiento de pila)
  xTaskCreatePinnedToCore(monitorTask,  "Monitor",   4096,  NULL, 1,                        NULL, 0);

  Serial.println("Sistema iniciado; gira el encoder para controlar el acelerador, pulsa para volver a cero");
}

// loop prácticamente inactivo; todo el trabajo recae en las tareas FreeRTOS
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

### Explicación del código

El programa completo está formado por tres tareas paralelas gestionadas por FreeRTOS sin interferir entre sí:

| Tarea | Núcleo | Prioridad | Qué hace |
|-------|--------|-----------|----------|
| `audioTask` | Núcleo 1 | Máxima | Sintetiza el audio muestra a muestra y lo escribe en el DMA de I2S |
| `throttleTask` | Núcleo 0 | Media | Lee el encoder cada 20ms y actualiza el acelerador |
| `monitorTask` | Núcleo 0 | Mínima | Imprime el estado por puerto serie cada 700ms |

**La lógica central de la síntesis de sonido se divide en tres capas:**

**Capa 1: sonido de fondo del motor.** Los 8 cilindros mantienen cada uno su propia fase; cada cilindro dispara su pulso de escape en el orden de encendido del V8 (0°, 90°, 150°……450°). La suma de las salidas de los 8 cilindros produce ese retumbar grave y continuo. Sobre los pulsos de los cilindros se añaden la frecuencia fundamental y varios armónicos para dar más cuerpo al sonido del motor.

**Capa 2: el pum principal.** Cada cierto tiempo (la frecuencia la decide `thumpHz`) se lee una vez completa de la tabla precalculada y se reproduce un "pum". El propio pum tiene una envolvente de tres tramos (ataque → cuerpo → caída), con un deslizamiento de frecuencia hacia abajo (simula la liberación de la presión de escape) y un retardo de rebote (simula la resonancia del tubo); el resultado suena como el escape recto de un tubo modificado.

**Capa 3: mezcla y salida.** Tras sumar ambas capas, se aplica un recorte suave global para evitar saturación, se multiplica por el coeficiente de fundido de entrada (evita el pop al arrancar) y por último se escribe como PCM estéreo de 16 bits al I2S.



## Herramienta de depuración de muestras del pum (opcional)

Para encontrar más rápido el sonido de escape adecuado, hice además una versión de prueba que va rotando por puerto serie: lleva 30 conjuntos de parámetros predefinidos y se cambian con comandos de puerto serie, de modo que puedes comparar directamente qué "pum" te gusta más. En el programa principal se acabó usando el número 23, «tubo recto modificado».

```c
/*
 * ESP32-S3 + MAX98357A
 * Probador de rotación de muestras del pum V2
 * 30 muestras + volumen muy reforzado
 *
 * Cableado:
 *   BCLK -> GPIO16
 *   LRC  -> GPIO17
 *   DIN  -> GPIO15
 *
 * Comandos de puerto serie (115200):
 *   n     Siguiente
 *   p     Anterior
 *   r     Repetir
 *   s     Detener rotación automática
 *   a     Activar rotación automática
 *   b     Activar/desactivar capa de fondo
 *   1~30  Saltar al número correspondiente
 *   h     Ayuda
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

#define SAMPLE_RATE     22050
#define DMA_BUF_COUNT   8
#define DMA_BUF_LEN     256

#define PRESET_PLAY_MS  5000
#define SLOW_PART_MS    2500
#define TEST_SLOW_HZ    2.2f
#define TEST_FAST_HZ    5.0f

#define SINE_TABLE_SIZE 2048
#define THUMP_TABLE_MAX 8000

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

static int16_t stereoBuffer[DMA_BUF_LEN * 2];

volatile int requestedPresetIndex = 0;
volatile uint32_t presetStartMs = 0;
volatile bool backgroundEnabled = true;

bool autoPlay = true;
uint32_t lastSwitchMs = 0;
String cmdBuffer;

static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;
  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= Estructura de parámetros de una muestra =================
struct ThumpPreset {
  const char* name;
  float attackMs;
  float bodyMs;
  float tailMs;
  float fStart;
  float fBody;
  float fEnd;
  float noiseMix;
  float tone2Mix;
  float tone3Mix;
  float subMix;
  float drive;
  float burstMix;
  float reboundDelayMs;
  float reboundGain;
  float altGain;
  float swing;
  float gain;
  float rumbleGain;
};

//  nombre                       atk  body tail  fS   fB   fE  noise t2   t3   sub  drv  burst rebMs rebG  alt   swng  gain  rumble
const ThumpPreset presets[] = {
  {"01 Grave alta cilindrada",      12,  65, 100,  55,  42,  34,  0.18, 0.24, 0.08, 0.28, 1.7, 0.18, 44, 0.22, 1.00, 0.00, 2.8, 0.20},
  {"02 Mas redondo denso",          14,  75, 130,  52,  40,  32,  0.12, 0.18, 0.04, 0.32, 1.5, 0.10, 50, 0.18, 1.00, 0.00, 2.9, 0.16},
  {"03 Trompeta pequena A",          7,  42,  65, 100,  80,  65,  0.16, 0.30, 0.14, 0.06, 1.6, 0.16, 32, 0.14, 1.00, 0.00, 2.6, 0.12},
  {"04 Trompeta pequena B",          5,  35,  55, 120,  95,  78,  0.14, 0.36, 0.20, 0.04, 1.7, 0.12, 26, 0.12, 1.00, 0.00, 2.5, 0.10},
  {"05 V8 USA ralenti",               9,  55,  95,  72,  56,  44,  0.22, 0.26, 0.10, 0.14, 1.8, 0.24, 42, 0.30, 0.80, 0.20, 2.7, 0.22},
  {"06 Mas borbotante irregular",   11,  58, 105,  68,  52,  42,  0.24, 0.22, 0.08, 0.18, 1.8, 0.22, 54, 0.38, 0.72, 0.26, 2.8, 0.24},
  {"07 Doble pum con contrapresion",  8,  48,  85,  80,  62,  48,  0.20, 0.26, 0.12, 0.12, 1.7, 0.20, 58, 0.48, 0.88, 0.14, 2.6, 0.18},
  {"08 Aspero explosivo",             6,  40,  68,  90,  72,  56,  0.28, 0.32, 0.16, 0.08, 2.2, 0.32, 34, 0.22, 0.90, 0.10, 2.5, 0.15},
  {"09 Muy grueso muy apagado",     16,  85, 150,  48,  38,  30,  0.08, 0.14, 0.02, 0.36, 1.6, 0.06, 58, 0.20, 1.00, 0.00, 3.0, 0.14},
  {"10 Corto seco Punch",             4,  28,  45, 100,  78,  60,  0.14, 0.38, 0.20, 0.04, 1.8, 0.12, 22, 0.10, 1.00, 0.00, 2.4, 0.10},
  {"11 Tubo de escape ronco",         8,  50,  88,  82,  64,  50,  0.32, 0.24, 0.10, 0.10, 1.9, 0.34, 40, 0.26, 0.86, 0.12, 2.6, 0.16},
  {"12 Subgraves cañonero",         13,  68, 115,  58,  46,  36,  0.14, 0.20, 0.06, 0.30, 1.8, 0.14, 48, 0.26, 1.00, 0.00, 2.9, 0.20},
  {"13 Punch medio nitido",          6,  36,  58, 130, 100,  78,  0.10, 0.40, 0.24, 0.02, 1.6, 0.08, 28, 0.10, 1.00, 0.00, 2.4, 0.08},
  {"14 Doble pulso gorgoteo",        7,  44,  78,  85,  66,  52,  0.18, 0.28, 0.14, 0.10, 1.8, 0.20, 20, 0.45, 0.82, 0.18, 2.6, 0.16},
  {"15 V8 viejo suelto",            10,  60, 108,  72,  55,  44,  0.24, 0.22, 0.08, 0.16, 1.7, 0.20, 52, 0.32, 0.68, 0.30, 2.7, 0.22},
  {"16 Test ultra grueso",          15,  95, 160,  54,  42,  32,  0.06, 0.14, 0.02, 0.38, 1.6, 0.04, 64, 0.18, 1.00, 0.00, 3.2, 0.12},
  {"17 Estilo Harley",                8,  52,  90,  78,  58,  46,  0.26, 0.24, 0.10, 0.16, 1.9, 0.26, 48, 0.35, 0.65, 0.32, 2.8, 0.25},
  {"18 Deportivo altas revoluciones", 4,  30,  50, 140, 110,  88,  0.12, 0.42, 0.28, 0.02, 1.8, 0.10, 20, 0.08, 1.00, 0.00, 2.3, 0.08},
  {"19 Diesel tut-tut",             14,  48,  80,  65,  50,  42,  0.30, 0.18, 0.06, 0.20, 2.0, 0.28, 38, 0.40, 0.75, 0.22, 2.7, 0.20},
  {"20 Crucero alta cilindrada",    12,  72, 125,  60,  45,  36,  0.16, 0.20, 0.06, 0.34, 1.7, 0.12, 55, 0.24, 1.00, 0.00, 3.0, 0.18},
  {"21 Ultra brusco explosivo",       3,  25,  40, 110,  85,  68,  0.35, 0.34, 0.18, 0.06, 2.5, 0.40, 18, 0.15, 0.92, 0.08, 2.4, 0.12},
  {"22 Gran cilindrada suave",      16,  90, 140,  50,  40,  34,  0.10, 0.16, 0.04, 0.30, 1.4, 0.06, 60, 0.16, 1.00, 0.00, 3.0, 0.10},
  {"23 Tubo recto modificado",        5,  38,  62, 105,  82,  64,  0.22, 0.30, 0.16, 0.08, 2.1, 0.28, 30, 0.18, 0.94, 0.06, 2.5, 0.14},
  {"24 Grave + fuerte contrapresion",10,  58,  95,  65,  50,  40,  0.18, 0.22, 0.08, 0.22, 1.8, 0.16, 65, 0.52, 0.85, 0.16, 2.8, 0.20},
  {"25 Rafaga de flujo",              6,  35,  55,  88,  68,  52,  0.38, 0.20, 0.08, 0.10, 1.7, 0.45, 28, 0.14, 1.00, 0.00, 2.5, 0.12},
  {"26 Sensacion 3 cilindros",      10,  45,  75,  74,  58,  46,  0.20, 0.22, 0.10, 0.14, 1.8, 0.20, 36, 0.30, 0.60, 0.35, 2.6, 0.18},
  {"27 Test ultra subgraves",       18, 100, 180,  42,  32,  26,  0.06, 0.12, 0.02, 0.42, 1.5, 0.04, 70, 0.20, 1.00, 0.00, 3.4, 0.08},
  {"28 Puño a puño",                  5,  32,  48,  95,  75,  58,  0.16, 0.34, 0.18, 0.06, 2.0, 0.16, 24, 0.12, 1.00, 0.00, 2.6, 0.10},
  {"29 Rugido todas las frecuencias", 8,  55,  90,  85,  65,  50,  0.20, 0.28, 0.14, 0.18, 1.9, 0.22, 42, 0.28, 0.88, 0.12, 2.8, 0.20},
  {"30 Test contraste extremo",       3,  20,  35, 150, 120,  90,  0.40, 0.44, 0.28, 0.02, 2.4, 0.45, 16, 0.08, 1.00, 0.00, 2.2, 0.06},
};

const int NUM_PRESETS = sizeof(presets) / sizeof(presets[0]);

// ================= Inicialización =================
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

void initI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = DMA_BUF_COUNT,
    .dma_buf_len = DMA_BUF_LEN,
    .use_apll = false,
    .tx_desc_auto_clear = true,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_BCLK,
    .ws_io_num = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S OK");
}

// ================= Construye la tabla de ondas =================
void buildThumpTable(int presetIndex) {
  const ThumpPreset &p = presets[presetIndex];

  int attackS  = (int)(p.attackMs  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(p.bodyMs    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(p.tailMs    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(p.reboundDelayMs * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;
  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1 = 0, phase2 = 0, phase3 = 0, phaseSub = 0;
  float noiseLP1 = 0, noiseLP2 = 0;
  uint32_t seed = 24681357;

  for (int i = 0; i < totalLen; i++) {
    float env1 = 0.0f;
    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    int j = i - reboundS;
    float env2 = 0.0f;
    if (j >= 0) {
      if (j < attackS) {
        float x = (float)j / (float)attackS;
        env2 = smoothstep01(x); env2 *= env2;
      } else if (j < attackS + bodyS) {
        float x = (float)(j - attackS) / (float)bodyS;
        env2 = 1.0f - 0.28f * x;
      } else if (j < mainLen) {
        float x = (float)(j - attackS - bodyS) / (float)tailS;
        env2 = 0.72f * expf(-3.8f * x);
      }
      env2 *= p.reboundGain;
    }

    float env = env1 + env2;
    env = clampf(env, 0.0f, 1.5f);

    float freq = p.fEnd;
    if (i < attackS) freq = p.fStart;
    else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      freq = p.fStart + (p.fBody - p.fStart) * x;
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      freq = p.fBody + (p.fEnd - p.fBody) * x;
    }

    float inc1 = freq / (float)SAMPLE_RATE;
    phase1 += inc1;       if (phase1 >= 1.0f) phase1 -= 1.0f;
    phase2 += inc1 * 2;   if (phase2 >= 1.0f) phase2 -= 1.0f;
    phase3 += inc1 * 3;   if (phase3 >= 1.0f) phase3 -= 1.0f;
    phaseSub += inc1 * 0.5f; if (phaseSub >= 1.0f) phaseSub -= 1.0f;

    float base = fastSin(phase1);
    base = tanhf(base * p.drive);

    float tonal = 0.82f * base
                + p.tone2Mix * fastSin(phase2)
                + p.tone3Mix * fastSin(phase3)
                + p.subMix   * fastSin(phaseSub);

    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;

    float air = bandNoise * (p.noiseMix * (0.25f * env + p.burstMix * 0.75f * earlyEnv));

    float sample = tonal * env + air;
    sample += 0.08f * env * env1;

    if (sample > 0.0f) sample = tanhf(sample * 1.15f) * 1.05f;
    else sample = tanhf(sample * 0.85f);

    sample *= p.gain;
    sample = clampf(sample, -1.0f, 1.0f);

    thumpTable[i] = sample;
  }

  thumpTableLen = totalLen;
}

// ================= Control por puerto serie =================
void showHelp() {
  Serial.println();
  Serial.println("===== Comandos =====");
  Serial.println("n     Siguiente");
  Serial.println("p     Anterior");
  Serial.println("r     Repetir");
  Serial.println("s     Detener rotacion automatica");
  Serial.println("a     Activar rotacion automatica");
  Serial.println("b     Activar/desactivar fondo");
  Serial.println("1~30  Saltar al numero");
  Serial.println("h     Ayuda");
  Serial.println("====================");
}

void printPresetInfo(int idx) {
  Serial.println();
  Serial.println("========================================");
  Serial.print("Muestra #");
  Serial.print(idx + 1);
  Serial.print(" / ");
  Serial.println(NUM_PRESETS);
  Serial.println(presets[idx].name);
  Serial.print("2.5s pum lento + 2.5s pum rapido  fondo: ");
  Serial.println(backgroundEnabled ? "on" : "off");
  Serial.println("========================================");
}

void requestPreset(int idx) {
  while (idx < 0) idx += NUM_PRESETS;
  while (idx >= NUM_PRESETS) idx -= NUM_PRESETS;
  requestedPresetIndex = idx;
  presetStartMs = millis();
  lastSwitchMs = millis();
  printPresetInfo(idx);
}

void processCommand(String cmd) {
  cmd.trim();
  cmd.toLowerCase();
  if (cmd.length() == 0) return;

  if (cmd == "n") { requestPreset(requestedPresetIndex + 1); return; }
  if (cmd == "p") { requestPreset(requestedPresetIndex - 1); return; }
  if (cmd == "r") { requestPreset(requestedPresetIndex); return; }
  if (cmd == "s") { autoPlay = false; Serial.println("Rotacion automatica detenida"); return; }
  if (cmd == "a") { autoPlay = true; lastSwitchMs = millis(); Serial.println("Rotacion automatica activada"); return; }
  if (cmd == "b") { backgroundEnabled = !backgroundEnabled; Serial.print("Fondo: "); Serial.println(backgroundEnabled ? "on" : "off"); return; }
  if (cmd == "h") { showHelp(); return; }

  int n = cmd.toInt();
  if (n >= 1 && n <= NUM_PRESETS) { requestPreset(n - 1); return; }

  Serial.print("Desconocido: ");
  Serial.println(cmd);
}

// ================= Tarea de audio =================
void audioTask(void *param) {
  int loadedPreset = -1;
  ThumpPreset currentPreset;

  int playPosA = -1, playPosB = -1;
  float gainA = 1.0f, gainB = 0.5f;
  int samplesToNextTrigger = 0;
  bool altToggle = false;

  float thumpLP = 0.0f;
  float hpIn = 0.0f, hpOut = 0.0f;
  float bgPhase1 = 0, bgPhase2 = 0;
  float bgNoise1 = 0, bgNoise2 = 0;
  uint32_t bgSeed = 123456789;

  while (true) {
    int req = requestedPresetIndex;

    if (req != loadedPreset) {
      currentPreset = presets[req];
      buildThumpTable(req);
      loadedPreset = req;
      playPosA = -1; playPosB = -1;
      gainA = 1.0f; gainB = 0.5f;
      samplesToNextTrigger = 0;
      altToggle = false;
      thumpLP = 0.0f;
    }

    uint32_t ageMs = millis() - presetStartMs;
    float baseHz = (ageMs < SLOW_PART_MS) ? TEST_SLOW_HZ : TEST_FAST_HZ;
    float speedNorm = (ageMs < SLOW_PART_MS) ? 0.25f : 0.70f;

    for (int i = 0; i < DMA_BUF_LEN; i++) {
      if (samplesToNextTrigger <= 0) {
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.55f;
        }
        playPosA = 0;
        gainA = altToggle ? currentPreset.altGain : 1.0f;

        float intervalSamples = (float)SAMPLE_RATE / baseHz;
        float swingFactor = altToggle ? (1.0f - currentPreset.swing) : (1.0f + currentPreset.swing);
        if (swingFactor < 0.2f) swingFactor = 0.2f;
        samplesToNextTrigger = (int)(intervalSamples * swingFactor);
        if (samplesToNextTrigger < 1) samplesToNextTrigger = 1;
        altToggle = !altToggle;
      }
      samplesToNextTrigger--;

      float thump = 0.0f;
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) { thump += thumpTable[playPosA] * gainA; playPosA++; }
        else playPosA = -1;
      }
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) { thump += thumpTable[playPosB] * gainB; playPosB++; gainB *= 0.9993f; }
        else playPosB = -1;
      }

      thumpLP += 0.55f * (thump - thumpLP);
      thump = thumpLP;

      float bg = 0.0f;
      if (backgroundEnabled) {
        float bgFreq = 28.0f + speedNorm * 36.0f;
        bgPhase1 += bgFreq / (float)SAMPLE_RATE;
        if (bgPhase1 >= 1.0f) bgPhase1 -= 1.0f;
        bgPhase2 += (bgFreq * 2.1f) / (float)SAMPLE_RATE;
        if (bgPhase2 >= 1.0f) bgPhase2 -= 1.0f;
        float white = localRandSigned(bgSeed);
        bgNoise1 += 0.06f * (white - bgNoise1);
        bgNoise2 += 0.015f * (bgNoise1 - bgNoise2);
        bg = fastSin(bgPhase1) * 0.65f + fastSin(bgPhase2) * 0.18f + bgNoise2 * 0.07f;
        bg = tanhf(bg * 1.35f) * currentPreset.rumbleGain;
      }

      float sample = thump + bg;

      float hp = 0.985f * (hpOut + sample - hpIn);
      hpIn = sample;
      hpOut = hp;
      sample = sample * 0.82f + hp * 0.18f;

      // ★ Clave: ganancia final de salida muy reforzada
      sample *= 1.8f;

      sample = tanhf(sample * 1.1f);
      sample = clampf(sample, -0.98f, 0.98f);

      // ★ Salida a escala completa
      int16_t out = (int16_t)(sample * 30000.0f);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;
    }

    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= setup / loop =================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("====================================");
  Serial.println("Probador de rotacion de muestras V2");
  Serial.println("30 muestras + version de gran volumen");
  Serial.println("====================================");

  initSineTable();
  initI2S();
  showHelp();
  requestPreset(0);

  xTaskCreatePinnedToCore(audioTask, "Audio", 10240, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  Serial.println("Comenzando la reproduccion...");
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r' || c == '\n') {
      if (cmdBuffer.length() > 0) {
        processCommand(cmdBuffer);
        cmdBuffer = "";
      }
    } else {
      cmdBuffer += c;
    }
  }

  if (autoPlay) {
    if (millis() - lastSwitchMs >= PRESET_PLAY_MS) {
      int nextIdx = requestedPresetIndex + 1;
      if (nextIdx >= NUM_PRESETS) nextIdx = 0;
      requestPreset(nextIdx);
    }
  }

  delay(10);
}
```




---

## Resolución de problemas frecuentes

Tranquilo, el 90% de los problemas vienen de estos puntos; repásalos y casi siempre lo resuelves:

**El altavoz no suena en absoluto después de alimentar**

Revisa primero el pin SD. Si el pin SD del MAX98357A se pone a bajo por accidente (por ejemplo, si toca GND o no queda flotante), el módulo entra en modo silencio. Deja el pin SD al aire o a 3.3V y vuelve a alimentar. Luego, desde el monitor serie, confirma que la inicialización de I2S no haya dado error y que no aparezca "Fallo al instalar el driver I2S" en la salida.

**El volumen es muy bajo, casi no se oye**

Confirma primero la impedancia del altavoz. El MAX98357A entrega 3W con un altavoz de 4Ω, pero solo unos 1.4W con uno de 8Ω, la mitad de volumen. Después comprueba que VIN esté conectado a 5V; si lo pones a 3.3V la potencia cae mucho. También puedes subir en el código `PCM_OUTPUT_SCALE` de 26000 a 30000, pero sin pasarte de 32767; por encima aparecerá distorsión por desbordamiento.

**El sentido del encoder está al revés (horario reduce, antihorario aumenta)**

En `encoderISR()` intercambia `encoderPosition++` y `encoderPosition--`, o simplemente cambia los cables físicos CLK y DT entre sí. Una de las dos.

**Reinicia y se cuelga nada más arrancar; el puerto serie muestra `Stack canary watchpoint triggered`**

Es el desbordamiento de pila de alguna tarea FreeRTOS; el mensaje de error mostrará el nombre (por ejemplo `Monitor`). Localiza la tarea correspondiente y aumenta el tamaño de pila (el tercer número) en `xTaskCreatePinnedToCore`. La tarea Monitor necesita al menos 4096, y si no es suficiente, 8192.

**El puerto serie muestra `OOM: failed to allocate XXX bytes`**

Sin memoria. Revisa en este orden:

1. En Arduino IDE, **Herramientas → PSRAM** debe estar activado y puesto en **QSPI PSRAM** (no OPI)
2. Añade al inicio de `setup()` la línea `Serial.printf("PSRAM: %d\n", ESP.getFreePsram());`, vuelve a flashear y mira el puerto serie; si imprime 0, la PSRAM no se ha iniciado, vuelve atrás y cambia la opción
3. Confirma que tu placa lleva PSRAM externa (la R8 de ESP32-S3-WROOM-1-**N16R8** significa 8MB de PSRAM)

**El sonido tiene chasquidos o ruido periódico**

Casi siempre es un problema de masa común. La GND del ESP32-S3 y la del MAX98357A deben conectarse al mismo hilo, no por separado a dos masas distintas de dos fuentes. Mide con un multímetro la resistencia entre las dos GND; debería ser cercana a 0Ω.

---

## FAQ

**P: ¿Están ocupados los GPIO16/17/15 del ESP32-S3; puedo usar otros pines?**
R: Sí, los pines I2S se pueden mapear libremente a cualquier GPIO. Cambia en la cabecera del código las tres macros `I2S_BCLK`, `I2S_LRC`, `I2S_DOUT` por los números de pin que quieras usar. Ojo: los GPIO 0, 1, 2, 3, 43 y 44 tienen usos especiales, conviene evitarlos.

**P: ¿Puedo conectar dos altavoces para estéreo?**
R: El MAX98357A es un amplificador mono; para estéreo necesitas dos módulos, uno para el canal izquierdo y otro para el derecho, diferenciados por la conexión del pin GAIN (uno con GAIN a GND = canal derecho, otro flotante = canal izquierdo). En el código, los datos PCM de ambos canales son actualmente iguales (`stereoBuffer[i*2] = stereoBuffer[i*2+1] = out`); si quieres estéreo real tendrás que modificar la lógica de síntesis.

**P: ¿Es suficiente la frecuencia de muestreo de 22050Hz? ¿Puedo cambiarla a 44100Hz?**
R: 22050Hz es totalmente suficiente para contenido medio-grave como el de un motor; reproduce hasta 11025Hz, y la percepción humana del sonido de un motor se concentra entre 50Hz y 4kHz. Cambiar a 44100Hz es viable en teoría, pero duplica la carga de CPU; conviene verificar primero la estabilidad y modificar al mismo tiempo `SAMPLE_RATE` y `sample_rate` en la configuración I2S.

**P: ¿Conectarlo a una alimentación de 5V quemará el ESP32-S3?**
R: El VIN del MAX98357A va a 5V, pero sus pines de señal (BCLK, LRC, DIN) son de nivel 3.3V y se pueden conectar directamente a los GPIO del ESP32-S3 sin conversión de nivel. Los GPIO del ESP32-S3 sacan 3.3V y el MAX98357A los reconoce, es seguro.

**P: En ralentí el sonido es muy bajo, casi no se oye, ¿se puede subir?**
R: Sube `BACKGROUND_GAIN_IDLE` (por defecto 0.45) y `THUMP_LAYER_GAIN_IDLE` (por defecto 0.75), por ejemplo a 0.6 y 1.0; el volumen en ralentí aumentará claramente. Tras ajustar, comprueba si a acelerador a fondo hay saturación, y si la hay baja un poco `PCM_OUTPUT_SCALE`.

**P: El encoder KY-040 cambia un 10% por paso, es demasiado, ¿se puede afinar?**
R: Reduce `ENCODER_STEP_SIZE` desde 0.1, por ejemplo a 0.05; serán un 5% por paso y necesitarás 20 pasos para llegar al acelerador a fondo, con un tacto mucho más fino.

**P: ¿Funciona en un ESP32 (no el S3)?**
R: En teoría es compatible; la API I2S es común, pero un ESP32 normal no lleva PSRAM externa o lleva poca, por lo que este proyecto puede quedarse sin memoria. Recomendable usar al menos un modelo con PSRAM, como el ESP32-WROVER. Los números de GPIO también deberán mapearse según tu placa.

---

## Ideas para seguir experimentando

Con la versión básica lista, puedes ampliar en estas direcciones:

- **Añade un sensor de velocidad**: monta un sensor Hall en la rueda, de modo que a mayor velocidad mayor acelerador automáticamente; manos libres
- **Cámbialo a sonido V6 / 4 cilindros en línea / moto**: modifica `NUM_CYLINDERS` y `firingAngles`, con otro conjunto de ángulos de encendido tendrás un motor distinto
- **Pon una pantalla TFT**: muestra el tacómetro y el porcentaje de acelerador en tiempo real, con pinta de cuadro de mandos
- **Inclúyelo en una caja estanca**: para montarlo en un vehículo eléctrico, los días de lluvia todavía hay que cuidar la estanqueidad; si entra agua en el circuitio, será más lío que ir en silencio

---

## Referencias

- [Hoja de datos del MAX98357A (Analog Devices)](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [Página del producto MAX98357A (Analog Devices)](https://www.analog.com/en/products/max98357a.html)
- [Manual de referencia técnica del ESP32-S3 (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [Página del producto ESP32-S3-WROOM-1 (Espressif)](https://www.espressif.com/en/products/modules/esp32-s3)
- [ESP32 Arduino Core en GitHub](https://github.com/espressif/arduino-esp32)
- [Documentación de la API de creación de tareas FreeRTOS](https://www.freertos.org/a00125.html)
