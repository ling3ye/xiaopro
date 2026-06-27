---
title: "ESP32-S3 + OLED de 0.91\" para crear un contador de seguidores de Bilibili «satisfactorio» con rebote físico de muelle amortiguado"
boardId: esp32s3
moduleId: display/oled091-ssd1306
category: esp32
date: 2026-06-27
intro: "Construye con un ESP32-S3 y una OLED SSD1306 de 0.91\" (128×32) un contador de seguidores de Bilibili para el escritorio, con una animación de rebote de muelle amortiguado sedosa al cambiar los números. Cableado I2C de 4 hilos + código completo en Arduino C++, con guía de errores comunes."
image: "https://img.lingflux.com/2026/06/e53fb5a7bdaee8448584fb9f21aa504d.jpg"
---

> **Resumen en una línea**: ESP32-S3 + OLED de 0.91" + la API de Bilibili para hacer un contador de seguidores de escritorio que «rebota como un muelle amortiguado» y dejar de sacar el móvil a cada rato para consultar las cifras.

# ESP32-S3 + OLED de 0.91" para crear un contador de seguidores de Bilibili «satisfactorio» (¡con rebote físico de muelle amortiguado!)

Dificultad: ⭐⭐☆☆☆ (aptos para principiantes)
Tiempo estimado: 30 minutos
Entorno de pruebas: Arduino IDE 2.3.8 + paquete de placa ESP32 v3.3.10 + U8g2 v2.36.19 + ArduinoJson v7.4.3

> **TL;DR (inicio rápido):**
>
> 1. Cableado: ESP32-S3 GPIO 14 → OLED SDA, GPIO 13 → OLED SCL, y conecta también 3.3V y GND.
> 2. Comprobación: asegúrate de que la pantalla reciba alimentación correctamente; no inviertas los pines I2C.
> 3. Instalación de bibliotecas: en Arduino IDE busca e instala `U8g2` (autor: oliver) y `ArduinoJson` (autor: Benoit Blanchon).
> 4. Configuración: en el código completo sustituye el nombre y la contraseña de tu Wi-Fi y el UID de Bilibili, grábalo directamente y espera a que el número de seguidores aparezca en pantalla con una animación mecánica de rebote sedosa.

---

## Introducción

Con esta pequeña pantalla OLED he montado un contador de seguidores de Bilibili para el escritorio, adictivo y satisfactorio. ¡Ya no hace falta desbloquear el móvil para mirar las cifras!

---

## Resultado final

El resultado que conseguí es una elegante disposición refinada en tres secciones: a la izquierda, la etiqueta «FANS» en vertical y una flecha indicadora mecánica; en el centro, el alma de este experimento: un **gran número en rueda de desplazamiento con física amortiguada** de 24 píxeles de alto, en negrita y con una ventana de recorte local; a la derecha, el incremento de seguidores del día (calcula automáticamente la variación diaria con triángulos de subida/bajada), junto con la intensidad de la señal Wi-Fi y un indicador de latido del sistema.

![](https://img.lingflux.com/2026/06/13648c6923d1cb24486cb082105d8d59.jpg)

---

## Descripción del componente

### Pantalla OLED de 0.91" (SSD1306)

Además de la placa de desarrollo principal (ESP32-S3), el componente clave de este proyecto es esta **pantalla OLED de 0.91"**.

La pantalla OLED de 0.91" es como «un intérprete simultáneo con luz propia»: traduce en tiempo real los números de seguidores que el ESP32-S3 obtiene de la red en una matriz de píxeles visible a simple vista. Como cada píxel emite su propia luz, no necesita el grueso panel de retroiluminación de los LCD tradicionales, por lo que el contraste es altísimo: negro profundo y brillo deslumbrante. La elegimos por su tamaño extremadamente compacto, su precio asequible y porque con I2C solo se necesitan 4 cables para controlarla, ideal para un pequeño adorno de escritorio.

| Parámetro clave | Valor |
| --- | --- |
| Chip controlador | SSD1306 |
| Resolución | 128 x 32 píxeles |
| Interfaz de comunicación | I2C (IIC) |
| Tensión de trabajo | 3.3V ~ 5V |
| Color de visualización | normalmente blanco puro o azul puro |

---

## Lista de materiales (BOM)

| Componente | Especificación/modelo | Cantidad | Uso |
| --- | --- | --- | --- |
| Placa de desarrollo ESP32-S3 | cualquier versión estándar con doble puerto Type-C | 1 | centro de control: se conecta a la red para obtener los datos y calcula la animación física |
| Módulo OLED de 0.91" | controlador SSD1306 / interfaz I2C de 4 pines | 1 | visualización en pantalla y renderizado de la animación con ventana física |
| Cables Dupont | hembra-hembra / macho-hembra (según la placa) | 4 | conectar los pines de la placa y de la pantalla |

---

## Pines y cableado

> 💡 **Consejo útil:** Tras cablear, verifica punto por punto contra la tabla siguiente. Normalmente el 80% de los problemas de pantalla sin imagen, negra o de dispositivo que se calienta vienen de un cable mal puesto; 10 segundos de repaso te ahorrarán mucho tiempo de depuración.

| Pin de la pantalla OLED | Pin del ESP32-S3 | Descripción de la función del pin |
| --- | --- | --- |
| GND | GND | masa (la línea de referencia que «habla el mismo idioma») |
| VCC | 3.3V (o 3V3) | entrada de alimentación |
| SCL | GPIO 13 | línea de reloj I2C |
| SDA | GPIO 14 | línea de datos I2C |

---

## Bibliotecas necesarias

En Arduino IDE 2.x, haz clic en el icono del «Gestor de bibliotecas» a la izquierda (o pulsa `Ctrl+Shift+I`) y busca e instala por separado las siguientes versiones probadas de estas bibliotecas de código abierto:

1. **U8g2** (autor: oliver): versión probada `v2.36.19` o superior. Se usa para controlar la pantalla OLED y admite una ventana de recorte de precisión (Clip Window).
2. **ArduinoJson** (autor: Benoit Blanchon): versión probada `v7.4.3`. Se usa para analizar los datos JSON devueltos por la API de Bilibili.

---

## Código completo + explicación

Copia el código completo siguiente en Arduino IDE. Antes de grabarlo, **asegúrate de modificar en el código `const char* ssid` y `password` con el nombre y la contraseña de tu Wi-Fi, y de sustituir `uid` por el UID del usuario de Bilibili que quieras monitorizar**.

```cpp
/**
 * =========================================================================
 * ESP32-S3 0.91" OLED (128x32 SSD1306) Monitor de seguidores de Bilibili - versión definitiva fusionada
 * =========================================================================
 * Funciones: disposición refinada en tres secciones + motor de rebote físico de muelle amortiguado puro
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Preferences.h>
#include <time.h>

// ================== Interruptor de depuración ==================
#define DEBUG_SIMULATE   0     // [IMPORTANTE] 1=activar datos simulados (probar animación sin red), 0=usar API real
#define SIM_INTERVAL_MS  2000  // Intervalo de cambio de datos simulados (ms)
#define SIM_START_VALUE  9985  // Número de seguidores inicial simulado (9985 permite observar rápido el efecto al saltar a 5 cifras)

// ================== Configuración de usuario ==================
const char* ssid     = "YOUR_WIFI_SSID";      // Sustituye por el nombre de tu Wi-Fi
const char* password = "YOUR_WIFI_PASSWORD";  // Sustituye por la contraseña de tu Wi-Fi
const char* uid      = "YOUR_BILIBILI_UID";   // Sustituye por el UID de Bilibili que quieres monitorizar

String biliApiUrl = "https://api.bilibili.com/x/relation/stat?vmid=" + String(uid);
const unsigned long FETCH_INTERVAL = 30 * 60 * 1000; // Refresca los datos por red cada 30 minutos

#define OLED_SDA 14
#define OLED_SCL 13
#define SCREEN_CONTRAST 255

// Parámetros de animación
#define SCROLL_EASING    0.18f   // Coeficiente básico de fuerza del muelle
#define ANIM_FPS         60      // Fotogramas por segundo de la animación
#define ANIM_INTERVAL    (1000/ANIM_FPS)

// Inicializa el constructor de U8g2
U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

// ================== Variables de estado ==================
long targetFollowers = 0;
long todayBaseFollowers = 0;
long todayAdded = 0;
bool isInitialFetch = true;
bool connectionError = false;

unsigned long lastFetchTime = 0;
unsigned long lastAnimTime = 0;
unsigned long lastSimTime = 0;

Preferences preferences; // Se usa para guardar de forma segura en Flash el número de seguidores inicial del día, sin pérdida al apagar

// ================== Motor central de vibración amortiguada ==================
#define MAX_DIGITS 7

class DigitWheel {
public:
  float currentY = 0.0f;
  int   targetDigit = 0;
  float velocity = 0.0f;  // Variable de velocidad central del muelle amortiguado

  void update(float easing) {
    float diff = (float)targetDigit - currentY;

    // Principio del camino más corto para el desplazamiento circular (0 <-> 9)
    if (diff > 5.0f)  diff -= 10.0f;
    if (diff < -5.0f) diff += 10.0f;

    if (fabs(diff) > 0.005f) {
      // Modelo físico clásico: ley de Hooke + amortiguamiento viscoso, que produce un rebote sedoso y una oscilación amortiguada
      float accel = diff * easing - velocity * 0.25f;
      velocity += accel;
      currentY += velocity;

      // Restricción del rango circular
      while (currentY >= 10.0f) currentY -= 10.0f;
      while (currentY < 0.0f)   currentY += 10.0f;
    } else {
      currentY = (float)targetDigit;
      velocity = 0.0f; // Detención estable
    }
  }
};

DigitWheel wheels[MAX_DIGITS];

// Declaración anticipada
void drawUI();
void drawLeftPanel();
void drawBigOdometer();
void drawRightPanel();
void drawWifiIcon(int x, int y);
void fetchBiliData();
void checkNewDayReset();

// ================== Inicialización ==================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Bilibili OLED Monitor Deluxe ===");

  Wire.begin(OLED_SDA, OLED_SCL);
  u8g2.begin();
  u8g2.setContrast(SCREEN_CONTRAST);
  u8g2.enableUTF8Print();

  // Primer paso: dibujar una pantalla de inicio elegante
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_7x13B_tr);
  u8g2.drawStr(20, 14, "BiliBili");
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(28, 28, "Fan Monitor");
  u8g2.sendBuffer();
  delay(800);

  preferences.begin("bilibili", false);
  todayBaseFollowers = preferences.getLong("base_fans", 0);

#if DEBUG_SIMULATE
  Serial.println("[SIM MODE] Simulation mode active");
  targetFollowers = SIM_START_VALUE;
  if (todayBaseFollowers == 0) {
    todayBaseFollowers = targetFollowers - 10; // Presupone un crecimiento diario de 10
  }
  todayAdded = targetFollowers - todayBaseFollowers;
  isInitialFetch = false;
#else
  // Segundo paso: conectarse a la red inalámbrica local
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(4, 14, "WiFi connecting...");
  u8g2.drawStr(4, 28, ssid);
  u8g2.sendBuffer();

  WiFi.begin(ssid, password);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 30) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK: " + WiFi.localIP().toString());
    // Tercer paso: configurar el servicio de hora para el reinicio automático a medianoche
    configTime(8 * 3600, 0, "ntp.aliyun.com", "time.windows.com");
    fetchBiliData();
  } else {
    Serial.println("\nWiFi failed");
    connectionError = true;
    targetFollowers = 0;
  }
#endif
}

// ================== Bucle principal ==================
void loop() {
  unsigned long now = millis();

#if DEBUG_SIMULATE
  // Lógica de datos simulados: saltos estables que permiten observar el movimiento dinámico de varias ruedas rebotando a la vez
  if (now - lastSimTime >= SIM_INTERVAL_MS) {
    lastSimTime = now;
    int delta = random(-2, 6); // Genera un crecimiento oscilante aleatorio entre -2 y +5
    targetFollowers += delta;
    if (targetFollowers < 0) targetFollowers = 0;
    todayAdded = targetFollowers - todayBaseFollowers;
    Serial.printf("[SIM] target=%ld (delta=%+d) today=%+ld\n", targetFollowers, delta, todayAdded);
  }
#else
  // Obtención periódica de datos reales de la red
  if (now - lastFetchTime >= FETCH_INTERVAL || lastFetchTime == 0) {
    fetchBiliData();
    lastFetchTime = now;
  }
  checkNewDayReset();
#endif

  // Cuarto paso: refresco central de la animación (funciona estable a 60 FPS completos)
  if (now - lastAnimTime >= ANIM_INTERVAL) {
    lastAnimTime = now;

    // Descompone el total de seguidores en el objetivo de cada rueda de cada dígito
    long temp = targetFollowers;
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      wheels[i].targetDigit = temp % 10;
      temp /= 10;
    }

    // Actualiza el motor físico, integrando un retardo en cascada para los dígitos altos, de modo que la oscilación de varias cifras gane en sensación de capas escalonadas
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      float ease = SCROLL_EASING * (1.0f - i * 0.012f);
      if (ease < 0.07f) ease = 0.07f;
      wheels[i].update(ease);
    }

    // Quinto paso: renderizado de todo el lienzo
    u8g2.clearBuffer();
    drawUI();
    u8g2.sendBuffer();
  }
}

// ================== Dibujo del diseño de la interfaz (diseño clásico en tres secciones) ==================
void drawUI() {
  drawLeftPanel();    // Etiqueta vertical a la izquierda
  drawBigOdometer();  // Número grande de rueda física en el centro
  drawRightPanel();   // Incremento y señal a la derecha
}

void drawLeftPanel() {
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(2, 7,  "F");
  u8g2.drawStr(2, 14, "A");
  u8g2.drawStr(2, 21, "N");
  u8g2.drawStr(2, 28, "S");

  u8g2.drawVLine(9, 2, 28); // Línea divisoria vertical
  u8g2.drawTriangle(11, 14, 11, 18, 14, 16); // Flecha mecánica que apunta al número grande
}

void drawRightPanel() {
  int rx = 102; // Inicio del eje X del panel derecho
  u8g2.drawVLine(rx - 2, 2, 28); // Línea divisoria derecha

  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(rx, 6, "TODAY");

  u8g2.setFont(u8g2_font_5x7_tr);
  char buf[8];
  if (todayAdded >= 0) {
    u8g2.drawTriangle(rx, 14, rx + 4, 14, rx + 2, 10); // Triángulo ascendente
    snprintf(buf, sizeof(buf), "%ld", todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  } else {
    u8g2.drawTriangle(rx, 10, rx + 4, 10, rx + 2, 14); // Triángulo descendente
    snprintf(buf, sizeof(buf), "%ld", -todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  }

  u8g2.setFont(u8g2_font_4x6_tr);
#if DEBUG_SIMULATE
  u8g2.drawStr(rx, 24, "SIM");
  if ((millis() / 400) % 2) u8g2.drawDisc(rx + 17, 22, 1); // Parpadeo de latido simulado
#else
  if (connectionError) {
    u8g2.drawStr(rx, 24, "ERR");
  } else {
    u8g2.drawStr(rx, 24, "ON");
  }
#endif

  drawWifiIcon(rx + 12, 27); // Dibuja las barras de señal
}

void drawWifiIcon(int x, int y) {
#if DEBUG_SIMULATE
  int bars = 3;
#else
  int bars = 0;
  if (WiFi.status() == WL_CONNECTED) {
    int rssi = WiFi.RSSI();
    if (rssi > -60)      bars = 3;
    else if (rssi > -75) bars = 2;
    else                 bars = 1;
  }
#endif
  for (int i = 0; i < 3; i++) {
    int h = (i + 1) * 2;
    if (i < bars) {
      u8g2.drawBox(x + i * 3, y - h, 2, h);
    } else {
      u8g2.drawFrame(x + i * 3, y - h, 2, h);
    }
  }
}

// ================== Renderizado central de la rueda (con ventana Clip local de precisión) ==================
void drawBigOdometer() {
  u8g2.setFont(u8g2_font_logisoso24_tn); // Número grande en negrita de 24 píxeles de alto

  int charW = 14;      // Ancho de un único dígito
  int areaTop = 4;     // Borde superior de la ventana de desplazamiento
  int areaBot = 28;    // Borde inferior de la ventana de desplazamiento
  int areaH = areaBot - areaTop; // Altura útil de la ventana (24 px)
  int baseline = areaBot;        // Altura de la línea base de la fuente

  // Cálculo dinámico del número de dígitos válido, para lograr un centrado adaptativo perfecto hacia la izquierda
  long absVal = targetFollowers;
  int needDigits = 1;
  long t = absVal;
  while (t >= 10) { t /= 10; needDigits++; }
  if (needDigits > MAX_DIGITS) needDigits = MAX_DIGITS;

  int totalW = needDigits * charW;
  int startX = 14 + (88 - totalW) / 2;
  if (startX < 14) startX = 14;

  // Renderizado dígito a dígito con retroalimentación de rebote físico
  for (int idx = 0; idx < needDigits; idx++) {
    int wheelIdx = MAX_DIGITS - needDigits + idx;
    int x = startX + idx * charW;

    float currYVal = wheels[wheelIdx].currentY;
    int digitLower = (int)currYVal;
    int digitUpper = (digitLower + 1) % 10;
    float fraction = currYVal - digitLower;

    // [Control central de recorte]: define una ventana de recorte local a medida para el dígito actual, de modo que el número que rebase los bordes superior e inferior quede oculto automáticamente
    u8g2.setClipWindow(x - 1, areaTop, x + charW, areaBot);

    // El dígito actual se desliza hacia arriba al ser «tirado» por la fuerza
    int yLower = baseline - (int)(fraction * areaH);
    char bufL[2] = { (char)('0' + digitLower), 0 };
    u8g2.drawStr(x, yLower, bufL);

    // El nuevo dígito siguiente entra en la ventana desde abajo y rebota con energía al llegar a su posición
    int yUpper = baseline + areaH - (int)(fraction * areaH);
    char bufU[2] = { (char)('0' + digitUpper), 0 };
    u8g2.drawStr(x, yUpper, bufU);

    u8g2.setMaxClipWindow(); // Tras renderizar el dígito actual, restaura de inmediato el lienzo completo
  }
}

// ================== Obtención de datos por red ==================
#if !DEBUG_SIMULATE
void fetchBiliData() {
  if (WiFi.status() != WL_CONNECTED) {
    connectionError = true;
    return;
  }
  Serial.println("Requesting Bilibili API...");
  WiFiClientSecure client;
  client.setInsecure(); // Omite la validación estricta del certificado SSL para garantizar una conexión ligera
  HTTPClient http;
  http.begin(client, biliApiUrl);
  http.setUserAgent("Mozilla/5.0 (ESP32)");
  http.addHeader("Referer", "https://space.bilibili.com/");

  int code = http.GET();
  if (code == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, payload)) {
      long fans = doc["data"]["follower"].as<long>();
      if (fans > 0) {
        targetFollowers = fans;
        connectionError = false;
        if (isInitialFetch) {
          if (todayBaseFollowers == 0) {
            todayBaseFollowers = fans;
            preferences.putLong("base_fans", fans);
          }
          isInitialFetch = false;
        }
        todayAdded = targetFollowers - todayBaseFollowers;
        Serial.printf("Fetch Success! Fans=%ld Today=%+ld\n", targetFollowers, todayAdded);
      }
    } else {
      connectionError = true;
    }
  } else {
    Serial.printf("HTTP Code Error: %d\n", code);
    connectionError = true;
  }
  http.end();
}

void checkNewDayReset() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;
  static int lastResetDay = -1;
  // A medianoche en punto se dispara el refresco del contador base del día
  if (timeinfo.tm_hour == 0 && timeinfo.tm_min == 0 && timeinfo.tm_mday != lastResetDay) {
    lastResetDay = timeinfo.tm_mday;
    todayBaseFollowers = targetFollowers;
    preferences.putLong("base_fans", todayBaseFollowers);
    todayAdded = 0;
    Serial.println("[RTC] Midnight detected. Resetting today's base counter.");
  }
}
#endif
```

### Explicación de los pasos clave

1. **Dibujo de la pantalla de inicio**: en `setup()` se llama a `u8g2.drawStr()` para dibujar un logo animado inicial que da al sistema un respiro visual.
2. **Inicialización de Wi-Fi y hora**: se llama a `WiFi.begin()` para conectarse a la red y se monta el servidor NTP de Alibaba Cloud mediante `configTime()` para capturar con precisión la llegada de la medianoche en local.
3. **Camuflaje de la petición de datos**: con `http.setUserAgent()` y `addHeader("Referer", ...)` se disfraza al ESP32 como una petición normal de un navegador de escritorio, para evitar que el mecanismo anti-raspado de Bilibili lo bloquee de forma despiadada.
4. **Iteración física del muelle amortiguado**: en `DigitWheel::update` se aplica la fórmula física clásica (aceleración = distancia × coeficiente de tracción − velocidad × coeficiente de amortiguación) para atenuar dinámicamente la velocidad. ¡Precisamente ahí reside el alma de ese rebote mecánico adictivo, en lugar de un deslizamiento rígido y sin gracia!
5. **Control de la ventana de recorte local (Clip Window)**: al renderizar los números se usa `u8g2.setClipWindow(x, 4, w, 28)` para indicar que solo dentro de esa franja de altura central se muestran los píxeles; en cuanto se sale de ese recuadro, desaparece al instante, simulando a la perfección la sensación mecánica de las rendijas de una máquina tragaperras de rueda física.

---

## Solución de problemas

¡No te asustes! El 95% de los principiantes que montan este tipo de pequeños proyectos de hardware se topa con problemas que casi siempre se concentran en estos puntos:

* **La pantalla está totalmente negra y no muestra nada**:
  1. Revisa primero el cableado: confirma que el VCC de la pantalla está en 3.3V y que el GND no está flojo.
  2. Comprueba que no has invertido los pines SDA y SCL. En el código se especifica `SDA -> 14` y `SCL -> 13`.
  3. Verifica que el chip controlador de tu OLED es el clásico `SSD1306`. En el mercado hay muy pocas pantallas de aspecto idéntico que usan `SH1106`; si es tu caso, tendrás que cambiar la función de inicialización del constructor de U8g2.

* **El estado de la derecha muestra siempre "ERR"**:
  1. Significa que la petición de red o el análisis han fallado. Revisa que tu `ssid` y `password` están bien configurados. Atención: el ESP32 **no admite Wi-Fi de 5 GHz**, así que debes conectarte a una red de 2.4 GHz o a un punto de acceso del móvil en esa banda.
  2. Comprueba que el UID es correcto: abre en el navegador `https://api.bilibili.com/x/relation/stat?vmid=tuUID` y verifica que devuelve datos JSON correctos.

---

## Preguntas frecuentes (FAQ)

**P: ¿Puedo usar otros pines GPIO para la pantalla?**
R: ¡Por supuesto! Solo tienes que cambiar los números en `#define OLED_SDA 14` y `#define OLED_SCL 13` en la parte superior del código por cualquier pin libre de tu placa ESP32-S3. Y recuerda mover también los cables Dupont.

**P: ¿Por qué después de grabar el número se queda en 0 sin moverse?**
R: Porque `#define DEBUG_SIMULATE` está por defecto en `0` (uso de datos reales por red). Como la frecuencia de obtención por red está fijada en 30 minutos, al arrancar es posible que el primer frame aún no haya obtenido datos porque el Wi-Fi sigue conectándose. Pon esa macro a `1` para activar el modo simulado y al instante verás el número saltar de forma aleatoria cada 2 segundos con un espectacular efecto de animación de rebote.

**P: ¿Cómo hago para que se refresque con más frecuencia?**
R: Modifica `const unsigned long FETCH_INTERVAL = 30 * 60 * 1000;` en la zona de configuración. No se recomienda ponerlo demasiado frecuente (por ejemplo, menos de 10 segundos), o el servidor podría bloquear temporalmente tu IP pública por hacer demasiadas peticiones a la interfaz de Bilibili.

**P: ¿Al apagar se pierde el incremento de seguidores del día?**
R: ¡No! El código recurre a la biblioteca `Preferences` del ESP32. Cada vez que se cambia de día y se captura con éxito el número base de seguidores, ese valor queda guardado de forma segura en la memoria Flash interna del ESP32. Aunque lo desconectes por completo y retires los cables, al volver a encender sigue recordando cuál era el punto de partida inicial del día, de modo que calcula con precisión el incremento diario.

**P: ¿Se puede portar este efecto físico a una pantalla de mayor resolución (por ejemplo, 128x64)?**
R: Por supuesto. En la función `drawBigOdometer()` hay variables específicas para controlar la altura: `areaTop`, `areaBot`, `baseline` y el ajuste del cuerpo de fuente. Si cambias a una pantalla más grande, solo tienes que escalar proporcionalmente las coordenadas de la ventana de recorte y cambiar a una fuente U8g2 en negrita mayor (como logisoso42, etc.) para conseguir un efecto de rueda de mayor tamaño.

**P: ¿Por qué la intensidad de señal en pantalla aparece siempre al máximo o no demasiado precisa?**
R: En `drawWifiIcon` leemos `WiFi.RSSI()` (indicador de intensidad de señal recibida). El código la divide en 3 niveles mediante dos umbrales duros: `-60dBm` y `-75dBm`. Si tu dispositivo está cerca del router inalámbrico, la señal suele estabilizarse en 3 barras (máximo).

---

## Ideas para seguir experimentando

Una vez terminado este experimento, tu escritorio friki ya empieza a tomar forma. Estos son algunos retoques que puedes aplicar a continuación:

* **Monitor multiplataforma**: añade el análisis de otra API para que la pantalla alterne cada 10 segundos, con un carrusel de ruedas sedoso, entre el «número de seguidores de Bilibili» y los «seguidores de GitHub/Douyin».
* **Añade un motor de vibración**: conecta un micro motor plano de vibración a un pin de la placa. Cada vez que aumente el número de seguidores, el motor emite una leve retroalimentación táctil mecánica de «tac, tac, tac» al ritmo del desplazamiento de los números. ¡El efecto satisfactorio se multiplica por dos!
* **Carcasa impresa en 3D**: diseña para tu ESP32 y pantalla OLED una mini carcasa impresa en 3D con forma de televisor retro y conviértelo al instante en una obra de arte de escritorio.

---

## Referencias

* [Hoja de datos oficial del ESP32-S3 de Espressif y guía de diseño de hardware](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
* [Repositorio oficial de U8g2 en GitHub con descripción de fuentes en alta resolución y configuración de pines](https://github.com/olikraus/u8g2)
* [Guía oficial de ArduinoJson para análisis eficiente y análisis en streaming](https://arduinojson.org/)
