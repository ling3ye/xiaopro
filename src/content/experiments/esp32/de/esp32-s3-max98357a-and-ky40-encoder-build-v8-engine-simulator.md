---
title: "ESP32-S3 + MAX98357A: Baue einen V8-Motorsound-Simulator — Komplettes Tutorial (I2S-Digitalaudio + KY-040-Drehgeber zur Gassteuerung)"
boardId: esp32s3
moduleId: audio/max98357a
moduleIds:
  - audio/max98357a
  - sensor/ky-040
category: esp32
date: 2026-07-14
intro: "Mit dem ESP32-S3 den MAX98357A-Verstärker ansteuern, kombiniert mit einem KY-040-Drehgeber, und den V8-Motorsound rein per Code in Echtzeit synthetisieren — das Gas wird manuell über den Drehgeber gesteuert, der Ton kommt in Echtzeit aus dem Lautsprecher. Inkl. kompletter Verkabelung, Code und Problembehebungs-Log."
image: "https://img.lingflux.com/2026/07/6c72c55fa63614eb8c2086c24d993d5f.jpg"
---

> **TL;DR (Schnellstart):**
>
> 1. Verkabelung: MAX98357A BCLK → GPIO16, LRC → GPIO17, DIN → GPIO15; KY-040 CLK → GPIO5, DT → GPIO6, SW → GPIO7
> 2. Als Board **ESP32S3 Dev Module** wählen, PSRAM auf **QSPI PSRAM** stellen (falsch gewählt → OOM, frag nicht, woher ich das weiß)
> 3. Drehgeber im Uhrzeigersinn = Gas reduzieren, gegen den Uhrzeigersinn = Gas geben, Druck = zurück in den Leerlauf
> 4. Flashen, Strom an, deinen „V8-Elektro-Antrieb" genießen

---

Schwierigkeit: ⭐⭐⭐☆☆ (Arduino-Grundverkabelung und Flashen sollten sitzen)
Zeitaufwand: 45 Minuten
Testumgebung: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + ESP32-S3-WROOM-1-N16R8 (16MB Flash + 8MB PSRAM)

---

## Einleitung

Jeder, der schon mal ein E-Bike gefahren ist, kennt die peinliche Situation: Du näherst dich geräuschlos von hinten, der Fußgänger erschrickt halb zu Tode, dreht sich um und schaut dich mit diesem „Warum machst du keinen Lärm?"-Blick an — und du kannst nur ein peinliches Lächeln andeuten, weil dein Gefährt tatsächlich … keinen Ton von sich gibt.

E-Fahrzeuge sparen Sprit und sind umweltfreundlich, aber genau das nervt: Sie sind zu leise. So leise, dass sie wie ein Geist über die Straße schweben.

Da kam mir der Gedanke: Wenn der Motor von sich aus keinen Sound liefert, warum **baue ich den Sound nicht selbst**? Nicht so ein billiges „Biep" aus dem Hup-Lautsprecher, sondern … den Sound eines V8-Motors? Tief, kraftvoll, donnernd, sobald man aufs Gas tritt.

Das Ziel dieses Artikels: Mit **ESP32-S3 + MAX98357A-Verstärker + KY-040-Drehgeber** einen V8-Motorsound rein per Code synthetisieren; das Gas wird manuell über den Drehgeber gesteuert, der Ton kommt in Echtzeit aus dem Lautsprecher. Keine Samples, keine Audio-Dateien — der Motorsound entsteht komplett aus Mathe in Echtzeit.



---

## Ergebnis

Dreh den KY-040-Drehgeber, um Gas zu geben: Der Lautsprecher geht vom tiefen Leerlauf-Grollen fließend ins hochtourige Donnern über; drückst du den Drehgeber, fällt das Gas sofort auf Null und der Sound geht zurück in den Leerlauf. Die Übergänge sind weich, ohne Sprünge, klingt echt.



---

## Bauteile

> Das Entwicklungsboard (ESP32-S3) bekommt keine eigene Beschreibung; hier geht's um die beiden anderen Protagonisten.

### MAX98357A — der Dolmetscher für digitale Signale

Stell dir vor, du hast eine digitale Aufnahme (eine Kette aus 0 und 1), aber der Lautsprecher versteht nur analoge Signale (Spannungsschwankungen). Der MAX98357A ist der **Simultandolmetscher** zwischen beiden: Er empfängt die digitalen Audiodaten, die der ESP32-S3 über I2S schickt, wandelt sie in Echtzeit in einen analogen Strom um, der den Lautsprecher treibt, und hat einen eingebauten 3W-Verstärker — kein zusätzlicher Verstärker nötig.

| Parameter | Wert |
|------|------|
| Versorgungsspannung | 2.5V ～ 5.5V |
| Ausgangsleistung | 3.2W (4Ω Last, 5V) |
| Abtastraten | 8kHz ～ 96kHz |
| Kommunikationsprotokoll | I2S |
| Verstärkungsstufen | 3dB / 6dB / 9dB / 12dB / 15dB |
| Stummschaltung | SD-Pin auf Low ziehen = stumm |

Der Grund für die Wahl ist einfach: **I2S direkt, filterfrei, als Modul, 3W reichen fürs Rad** — und für unter zwei Euro bei AliExpress ist er auch zu haben.

### Pin-Belegung

| Pin | Funktion |
|----------|----------|
| VIN | Versorgung +, an 5V |
| GND | Masse |
| BCLK | I2S Bit-Clock |
| LRC | I2S Word-Clock (Links/Rechts-Auswahl) |
| DIN | I2S Digital-Audio-Dateneingang |
| SD | Stummschaltung: offen oder High = normal; Low = stumm |
| GAIN | Verstärkungswahl; offen = 9dB Standard |

> **Achtung**: SD offen oder an 3.3V gibt Ton; wenn die Verkabelung stimmt, aber kein Ton kommt, zuerst prüfen, ob SD versehentlich auf Low gezogen wurde.

---

### KY-040 — der „Lautstärkeregler" mit Endlosdrehung

Ein normales Poti blockiert am Anschlag; der KY-040 ist ein 360°-Endlos-Drehgeber. Er gibt keine absolute Position aus, sondern meldet „in welche Richtung, wie viele Rastpunkte". In diesem Projekt nutze ich ihn fürs Gas: **Im Uhrzeigersinn = Gas reduzieren, gegen den Uhrzeigersinn = Gas geben, Druck = zurück in den Leerlauf** — fühlt sich an wie ein echtes Gas-Drehpedal.

| Parameter | Wert |
|------|------|
| Arbeitsspannung | 3.3V ～ 5V |
| Rastpunkte pro Umdrehung | 20 |
| Ausgänge | Phase A (CLK) / Phase B (DT) / Taste (SW) |
| Anschluss | Digitaler GPIO (mit internem Pull-up) |

Gründe für die Wahl: **billig, häufig, mit Taste als Bonus**, interrupt-getrieben, kaum CPU-Last, mit FreeRTOS absolut problemlos.

### Pin-Belegung

| Pin | Funktion |
|----------|----------|
| CLK (Phase A) | Drehgeber-Ausgang A, an Interrupt-Pin |
| DT (Phase B) | Drehgeber-Ausgang B, zur Richtungsbestimmung |
| SW | Tastenausgang, Low bei Druck |
| + | Versorgung +, an 3.3V |
| GND | Masse |

---

## Stückliste

| Bauteil | Modell/Spezifikation | Anzahl | Bemerkung |
|------|-----------|------|------|
| Entwicklungsboard | ESP32-S3-WROOM-1-N16R8 | 1 | 16MB Flash + 8MB PSRAM, PSRAM ist Pflicht |
| I2S-Verstärkermodul | MAX98357A | 1 | inkl. Trägerplatine; lötfreie Version ist praktischer |
| Drehgebermodul | KY-040 | 1 | mit Taste |
| kleiner Lautsprecher | 4Ω 3W | 1 | oder 8Ω, dann etwas leiser |
| Dupont-Kabel | Stecker-Stecker / Stecker-Buchse | einige | zum Verkabeln |
| Breadboard | beliebig | 1 | optional, hält die Verkabelung ordentlich |

---

## Verkabelung

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

> Tipp: Hake jeden Strang direkt in der Tabelle ab — das erspart 80 % der Fehlersuche. Besonders beim GND: gemeinsame Masse über alle Module ist die Voraussetzung für sauberen Ton. Wenn alle auf derselben Masse sitzen, kommt das Signal sauber an.

---

## Benötigte Bibliotheken

Dieses Projekt **benötigt keine Drittanbieter-Audio-Bibliothek**; der komplette Sound wird in Echtzeit per Code synthetisiert. Genutzt wird nur das im ESP32 Arduino Core enthaltene `driver/i2s.h`.

Du musst in der Arduino IDE nur folgende Einstellungen sicherstellen:

| Punkt | Anforderung |
|------|------|
| Arduino IDE | 2.3.8 (getestet) |
| ESP32 Arduino Core | 3.3.10 (im Board Manager nach `esp32` suchen) |
| Board-Option | ESP32S3 Dev Module |
| **PSRAM-Option** | **QSPI PSRAM** (falsch gewählt → OOM, siehe Problembehebung) |
| Flash Size | 16MB |
| Upload Speed | 921600 |

Gehe im Arduino IDE im Menü **Werkzeuge (Tools)** jeden Eintrag durch, besonders die PSRAM-Zeile.

---

## Kompletter Code + Erklärung

```cpp
/*
 * ESP32-S3 + MAX98357A + KY-040-Drehgeber
 * V8-Motorsound-Simulator
 *
 * Verkabelung:
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
 *   SW        -> GPIO7  (Druck setzt Gas zurück)
 *   +         -> 3.3V
 *   GND       -> GND
 *
 * Bedienung:
 *   Im Uhrzeigersinn drehen = Gas reduzieren
 *   Gegen den Uhrzeigersinn drehen = Gas geben
 *   Drehgeber drücken = Gas auf Null (zurück in den Leerlauf)
 *
 * Serielle Baudrate: 115200
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// -----------------------------------------------
// Bei Brownout-Neustarts hier für Tests auf 1 setzen.
// Im produktiven Einsatz auf 0 lassen; dauerhaftes Deaktivieren
// der Unterspannungsschutz wird nicht empfohlen.
// -----------------------------------------------
#define DISABLE_BROWNOUT_FOR_TEST 0

#if DISABLE_BROWNOUT_FOR_TEST
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

// ================= Schritt 1: I2S-Pin-Definitionen =================
#define I2S_BCLK   16
#define I2S_LRC    17
#define I2S_DOUT   15
#define I2S_PORT   I2S_NUM_0

// ================= Schritt 2: KY-040-Pin-Definitionen =================
#define ENCODER_CLK_PIN   5
#define ENCODER_DT_PIN    6
#define ENCODER_SW_PIN    7

// ================= Drehgeber-Gas-Parameter =================
// Gasänderung pro Rastpunkt (Bereich 0.0～1.0)
// Kleinere Werte = mehr Rastpunkte bis Vollgas, feinere Auflösung
#define ENCODER_STEP_SIZE     0.1f

// Glättungsfaktor fürs Gas (größer = schnellere Antwort, kleiner = sanftere Übergänge)
#define ENCODER_SMOOTHING     1.2f

// Entprellzeit des Drehgebers (Mikrosekunden), verhindert mehrfaches Erfassen einer Drehung
#define ENCODER_DEBOUNCE_US   200

// Entprellzeit der Taste (Millisekunden)
#define BUTTON_DEBOUNCE_MS    200

// ================= Grundlegende Audio-Parameter =================
#define SAMPLE_RATE     22050   // Abtastrate in Hz
#define DMA_BUF_COUNT   8       // Anzahl der DMA-Puffer
#define DMA_BUF_LEN     256     // Samples pro DMA-Puffer

// ================= Motor-Drehzahlparameter =================
#define RPM_IDLE        800.0f    // Leerlauf-Drehzahl (RPM)
#define RPM_MAX         8000.0f   // Maximaldrehzahl (RPM)
#define RPM_SMOOTHING   0.006f    // Glättung der Drehzahländerung; kleiner = realistischer Motor
#define NUM_CYLINDERS   8         // V8 = 8 Zylinder

// ================= Auspuff-Puff-Rhythmus =================
// Leerlauf: 2 Puffs pro Sekunde, Volldrehzahl: 7.6 Puffs pro Sekunde
#define THUMP_HZ_IDLE   2.0f
#define THUMP_HZ_MAX    7.6f

// ================= Lautstärke-Parameter =================
#define MASTER_VOLUME       1.00f
#define PCM_OUTPUT_SCALE    26000.0f   // Skalierungsfaktor für die finale 16-Bit-PCM-Ausgabe

// Hintergrund-Motorsound (Leerlauf / Volldrehzahl)
#define BACKGROUND_GAIN_IDLE  0.45f
#define BACKGROUND_GAIN_MAX   0.60f

// Haupt-Puff-Layer-Lautstärke (Leerlauf / Volldrehzahl)
#define THUMP_LAYER_GAIN_IDLE 0.75f
#define THUMP_LAYER_GAIN_MAX  1.05f

// ================= Tuning-Geradeaus-Rohr-Puff-Parameter =================
// Diese Parameter steuern die Wellenform jedes Auspuff-Puffs; vorsichtig anpassen.
#define THUMP_ATTACK_MS       5.0f    // Attack-Zeit (ms)
#define THUMP_BODY_MS         38.0f   // Dauer des Hauptteils (ms)
#define THUMP_TAIL_MS         62.0f   // Auskling-Zeit (ms)

#define THUMP_F_START         105.0f  // Startfrequenz des Puffs (Hz)
#define THUMP_F_BODY          82.0f   // Frequenz des Hauptteils (Hz)
#define THUMP_F_END           64.0f   // Endfrequenz (Hz)

#define THUMP_NOISE_MIX       0.22f   // Rauschanteil (simuliert Auspuff-Luftstrom)
#define THUMP_TONE2_MIX       0.30f   // Anteil der 2. Harmonischen
#define THUMP_TONE3_MIX       0.16f   // Anteil der 3. Harmonischen
#define THUMP_SUB_MIX         0.08f   // Sub-Bass-Anteil (betont die Tiefe)

#define THUMP_DRIVE           2.10f   // Wellenform-Sättigung (tanh-Soft-Clipping-Intensität)
#define THUMP_BURST_MIX       0.28f   // Rauschanteil in der Burst-Phase

#define THUMP_REBOUND_DELAY_MS 30.0f  // Auspuff-Rebound-Verzögerung (ms), simuliert Rohr-Resonanz
#define THUMP_REBOUND_GAIN     0.18f  // Rebound-Verstärkung

#define THUMP_ALT_GAIN         0.94f  // Alternierender Zylinder-Verstärkungsunterschied, simuliert ungleichmäßige Zündung
#define THUMP_SWING            0.06f  // Rhythmus-Swing, erhöht den Groove

#define THUMP_TABLE_GAIN       2.50f  // Gesamt-Verstärkung der Puff-Wellenformtabelle

// ================= Lookup-Table-Definitionen =================
#define SINE_TABLE_SIZE 2048     // Größe der Sinus-Lookup-Tabelle (größer = genauer, mehr Speicher)
#define THUMP_TABLE_MAX 8000     // Max. Sample-Anzahl der Puff-Wellenformtabelle

float sineTable[SINE_TABLE_SIZE];
float thumpTable[THUMP_TABLE_MAX];
int thumpTableLen = 0;

// Stereo-Ausgabepuffer (DMA_BUF_LEN Samples je Kanal)
static int16_t stereoBuffer[DMA_BUF_LEN * 2];

// ================= Globale Zustandsvariablen =================
volatile float throttleValue  = 0.0f;   // Aktueller geglätteter Gas-Wert (0.0～1.0)
volatile float targetThrottle = 0.0f;   // Vom Drehgeber gesetztes Ziel-Gas
volatile float targetRPM      = RPM_IDLE;
volatile float currentRPM     = RPM_IDLE;
volatile float currentThumpHz = THUMP_HZ_IDLE;

uint32_t noiseSeed = 123456789;

// V8-Zylinder-Phasenverschiebung (simuliert 90°-Zündabstand)
float cylinderPhase[NUM_CYLINDERS];

const float firingAngles[NUM_CYLINDERS] = {
  0.0f, 90.0f, 150.0f, 210.0f,
  270.0f, 330.0f, 390.0f, 450.0f
};

// ================= Drehgeber-Interrupt-Variablen =================
volatile int encoderPosition = 0;
volatile unsigned long lastEncoderInterruptUs = 0;
volatile bool encoderButtonPressed = false;
volatile unsigned long lastButtonPressMs = 0;

// ================= Hilfsfunktionen =================

// Wertbegrenzung (Clamp)
static inline float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// Smoothstep-Funktion für sanftere Übergänge (S-Kurve)
static inline float smoothstep01(float x) {
  x = clampf(x, 0.0f, 1.0f);
  return x * x * (3.0f - 2.0f * x);
}

// Schnelle Sinus-Berechnung per Lookup-Tabelle; viel schneller als sinf(), Pflicht für Echtzeit-Audio
float fastSin(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float idx = phase * (float)SINE_TABLE_SIZE;
  int i0 = (int)idx;
  int i1 = (i0 + 1) % SINE_TABLE_SIZE;
  float frac = idx - (float)i0;

  // Lineare Interpolation für höhere Genauigkeit
  return sineTable[i0] + frac * (sineTable[i1] - sineTable[i0]);
}

// Pseudozufalls-Rauschen (linearer Kongruenzgenerator, schnell; simuliert Luftstrom)
float pseudoRandom() {
  noiseSeed = noiseSeed * 1664525UL + 1013904223UL;
  return ((float)(noiseSeed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// Pseudozufall mit eigenem Seed (für die Puff-Wellenform, damit jedes Mal dasselbe herauskommt)
float localRandSigned(uint32_t &seed) {
  seed = seed * 1664525UL + 1013904223UL;
  return ((float)(seed & 0x7FFFFFFF) / 1073741824.0f) - 1.0f;
}

// ================= Drehgeber-Interrupt: Drehrichtung erkennen =================
void IRAM_ATTR encoderISR() {
  unsigned long nowUs = micros();

  // Entprellen: zu kurze Abstände zwischen Interrupts ignorieren, verhindert mechanisches Prellen
  if (nowUs - lastEncoderInterruptUs < ENCODER_DEBOUNCE_US) return;
  lastEncoderInterruptUs = nowUs;

  // Auslöser ist die fallende Flanke von CLK; dann DT-Pegel auslesen, um die Richtung zu bestimmen
  // DT = LOW  → im Uhrzeigersinn → Gas reduzieren
  // DT = HIGH → gegen den Uhrzeigersinn → Gas geben
  int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState == LOW) {
    encoderPosition--;  // Im Uhrzeigersinn: Gas reduzieren
  } else {
    encoderPosition++;  // Gegen den Uhrzeigersinn: Gas geben
  }
}

// ================= Tasten-Interrupt: Druck setzt Gas zurück =================
void IRAM_ATTR buttonISR() {
  unsigned long nowMs = millis();
  if (nowMs - lastButtonPressMs < BUTTON_DEBOUNCE_MS) return;
  lastButtonPressMs = nowMs;
  encoderButtonPressed = true;
}

// ================= Drehgeber-Pins und Interrupts initialisieren =================
void initEncoder() {
  pinMode(ENCODER_CLK_PIN, INPUT_PULLUP);
  pinMode(ENCODER_DT_PIN,  INPUT_PULLUP);
  pinMode(ENCODER_SW_PIN,  INPUT_PULLUP);

  // Fallende Flanke von CLK löst Drehungserkennung aus
  attachInterrupt(digitalPinToInterrupt(ENCODER_CLK_PIN), encoderISR, FALLING);
  // Fallende Flanke von SW löst Tastenerkennung aus (Low bei Druck)
  attachInterrupt(digitalPinToInterrupt(ENCODER_SW_PIN),  buttonISR, FALLING);

  Serial.println("KY-040-Drehgeber initialisiert");
}

// ================= Schritt 3: Sinus-Lookup-Tabelle vorberechnen =================
// 2048 Sinus-Werte vorab in den Speicher schreiben; beim Abspielen nur nachschlagen, spart CPU
void initSineTable() {
  for (int i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = sinf(2.0f * M_PI * (float)i / (float)SINE_TABLE_SIZE);
  }
}

// ================= 8 Zylinder-Phasenverschiebungen initialisieren =================
void initCylinderPhases() {
  for (int i = 0; i < NUM_CYLINDERS; i++) {
    // Winkel in Phase 0.0～1.0 umrechnen (720° = ein vollständiger Verbrennungszyklus)
    cylinderPhase[i] = firingAngles[i] / 720.0f;
  }
}

// ================= Auspuff-Puls eines einzelnen Zylinders erzeugen =================
// phase ist die aktuelle Phase 0.0～1.0; liefert die Amplitude zu diesem Zeitpunkt
float generateCylinderPulse(float phase) {
  while (phase < 0.0f) phase += 1.0f;
  while (phase >= 1.0f) phase -= 1.0f;

  float pulse = 0.0f;

  if (phase < 0.30f) {
    // Erste 30 %: schneller Anstieg, simuliert das Öffnen des Auslassventils
    float t = phase / 0.30f;
    pulse = sinf(M_PI * t) * expf(-2.2f * t) * 1.35f;
  } else if (phase < 0.50f) {
    // 30 %～50 %: leichtes Rebound, simuliert Gegendruck im Rohr
    float t = (phase - 0.30f) / 0.20f;
    pulse = -0.25f * sinf(M_PI * 2.0f * t) * expf(-5.0f * t);
  }
  // Letzte 50 %: still, wartet auf den nächsten Auspufftakt

  return pulse;
}

// ================= Schritt 4: Puff-Wellenformtabelle vorberechnen =================
// Einen vollständigen „Puff" vorab ins Array schreiben; beim Abspielen nur lesen, spart CPU
void buildStraightPipeThumpTable() {
  int attackS  = (int)(THUMP_ATTACK_MS  * SAMPLE_RATE / 1000.0f);
  int bodyS    = (int)(THUMP_BODY_MS    * SAMPLE_RATE / 1000.0f);
  int tailS    = (int)(THUMP_TAIL_MS    * SAMPLE_RATE / 1000.0f);
  int reboundS = (int)(THUMP_REBOUND_DELAY_MS * SAMPLE_RATE / 1000.0f);

  if (attackS < 1) attackS = 1;
  if (bodyS   < 1) bodyS   = 1;
  if (tailS   < 1) tailS   = 1;

  int mainLen  = attackS + bodyS + tailS;
  int totalLen = mainLen + reboundS + tailS / 2;  // plus Rebound-Ausklang

  if (totalLen > THUMP_TABLE_MAX) totalLen = THUMP_TABLE_MAX;

  float phase1   = 0.0f;  // Phase der Grundfrequenz
  float phase2   = 0.0f;  // Phase der 2. Harmonischen
  float phase3   = 0.0f;  // Phase der 3. Harmonischen
  float phaseSub = 0.0f;  // Sub-Bass-Phase

  float noiseLP1 = 0.0f;  // Zustand des Tiefpass 1
  float noiseLP2 = 0.0f;  // Zustand des Tiefpass 2
  uint32_t seed  = 24681357;

  for (int i = 0; i < totalLen; i++) {

    // --- Haupt-Hüllkurve (Attack→Body→Decay) berechnen ---
    float env1 = 0.0f;

    if (i < attackS) {
      float x = (float)i / (float)attackS;
      env1 = smoothstep01(x);
      env1 = env1 * env1;  // Quadrieren macht den Attack knackiger
    } else if (i < attackS + bodyS) {
      float x = (float)(i - attackS) / (float)bodyS;
      env1 = 1.0f - 0.28f * x;
      env1 += 0.10f * sinf(2.0f * M_PI * x) * (1.0f - x);
    } else if (i < mainLen) {
      float x = (float)(i - attackS - bodyS) / (float)tailS;
      env1 = 0.72f * expf(-3.6f * x);
      env1 += 0.04f * sinf(5.0f * M_PI * x) * expf(-4.0f * x);
    }

    // --- Rebound-Hüllkurve (verzögertes kleines Echo) berechnen ---
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
      env2 *= THUMP_REBOUND_GAIN;  // Rebound deutlich leiser als Hauptteil
    }

    float env = clampf(env1 + env2, 0.0f, 1.5f);

    // --- Frequenz sinkt mit der Zeit (simuliert Tonabfall nach Druckentlastung) ---
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

    // --- Tonaler Anteil: Grundfrequenz + Harmonische + Sub-Bass ---
    float base = fastSin(phase1);
    base = tanhf(base * THUMP_DRIVE);  // Soft-Clipping, simuliert die Nichtlinearität des Auspuffs

    float tonal =
        0.82f          * base
      + THUMP_TONE2_MIX * fastSin(phase2)
      + THUMP_TONE3_MIX * fastSin(phase3)
      + THUMP_SUB_MIX   * fastSin(phaseSub);

    // --- Rauschanteil: simuliert das Zischen des Luftstroms ---
    float white = localRandSigned(seed);
    noiseLP1 += 0.18f * (white - noiseLP1);   // Zweistufiger Tiefpass, verlagert Rauschen in tiefere Frequenzen
    noiseLP2 += 0.04f * (noiseLP1 - noiseLP2);
    float bandNoise = noiseLP1 - noiseLP2;     // Bandpass-Effekt

    float earlyEnv = env1;
    if (i > (attackS + bodyS / 2)) earlyEnv *= 0.35f;  // In der zweiten Hälfte Luftstrom dämpfen

    float air = bandNoise * (THUMP_NOISE_MIX * (0.25f * env + THUMP_BURST_MIX * 0.75f * earlyEnv));

    // --- Ton + Luftstrom mischen, dann asymmetrisches Soft-Clipping ---
    float sample = tonal * env + air;
    sample += 0.08f * env * env1;  // Leichte nichtlineare Überlagerung für mehr Textur

    if (sample > 0.0f) {
      sample = tanhf(sample * 1.15f) * 1.05f;  // Positive Halbwelle leicht anheben
    } else {
      sample = tanhf(sample * 0.85f);           // Negative Halbwelle leicht dämpfen
    }

    sample *= THUMP_TABLE_GAIN;
    thumpTable[i] = clampf(sample, -1.0f, 1.0f);
  }

  thumpTableLen = totalLen;

  Serial.printf("Puff-Tabelle erstellt, Länge=%d Samples, ca. %d ms\n",
    thumpTableLen,
    (int)((float)thumpTableLen * 1000.0f / SAMPLE_RATE));
}

// ================= Schritt 5: I2S-Treiber initialisieren =================
void initI2S() {
  i2s_config_t i2s_config = {
    .mode                = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate         = SAMPLE_RATE,
    .bits_per_sample     = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format      = I2S_CHANNEL_FMT_RIGHT_LEFT,   // Stereo (Links und Rechts je eine Spur)
    .communication_format= I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags    = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count       = DMA_BUF_COUNT,
    .dma_buf_len         = DMA_BUF_LEN,
    .use_apll            = false,
    .tx_desc_auto_clear  = true,   // Nach Senden automatisch nullen, verhindert Artefakte
    .fixed_mclk          = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK,
    .ws_io_num    = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num  = I2S_PIN_NO_CHANGE  // Nur Senden, kein Empfang
  };

  esp_err_t err;

  err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("I2S-Treiberinstallation fehlgeschlagen: %d\n", (int)err);
    while (1) delay(100);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("I2S-Pin-Konfiguration fehlgeschlagen: %d\n", (int)err);
    while (1) delay(100);
  }

  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("I2S initialisiert");
}

// ================= Gas-Aktualisierung (alle 20 ms von throttleTask aufgerufen) =================
void updateThrottle() {

  // Taste behandeln: Druck setzt Drehgeberposition und Gas zusammen zurück
  if (encoderButtonPressed) {
    encoderButtonPressed = false;
    encoderPosition = 0;
    targetThrottle  = 0.0f;
    Serial.println(">>> Taste gedrückt: Gas auf Null!");
  }

  // Drehgeberposition begrenzen, damit sie nicht über 0–Vollgas hinausgeht
  int maxSteps = (int)(1.0f / ENCODER_STEP_SIZE);  // Standard: 10 Schritte bis Vollgas

  if (encoderPosition < 0)        encoderPosition = 0;
  if (encoderPosition > maxSteps) encoderPosition = maxSteps;

  // Schritte in Gas-Wert 0.0～1.0 umrechnen
  targetThrottle = clampf((float)encoderPosition * ENCODER_STEP_SIZE, 0.0f, 1.0f);

  // Sanfter Übergang: nur kleine Schritte pro Update, sonst Knacken bei Sprüngen
  throttleValue += (targetThrottle - throttleValue) * ENCODER_SMOOTHING;
  throttleValue  = clampf(throttleValue, 0.0f, 1.0f);

  // Ziel-Drehzahl aus dem Gas-Wert berechnen
  targetRPM = RPM_IDLE + throttleValue * (RPM_MAX - RPM_IDLE);
}

// ================= Audio-Erzeugungs-Task (auf Core 1, höchste Priorität) =================
void audioTask(void *param) {
  float crankPhase = 0.0f;   // Kurbelwellenphase, treibt alle Zylinder an

  float bgLpf    = 0.0f;    // Zustand des Tiefpasses für den Hintergrundsound
  float bgHpfIn  = 0.0f;    // Eingang des Hochpasses für den Hintergrundsound
  float bgHpfOut = 0.0f;    // Ausgang des Hochpasses für den Hintergrundsound

  int   playPosA = -1;       // Aktuelle Abspielposition der Puff-Stimme A (-1 = inaktiv)
  int   playPosB = -1;       // Puff-Stimme B (Ausklang des vorherigen Puffs)
  float gainA    = 1.0f;
  float gainB    = 0.55f;

  int  samplesToNextTrigger = 0;   // Wie viele Samples bis zum nächsten Puff-Trigger
  bool altToggle = false;          // Wechsel-Flag für alternierende Zylinder

  float thumpLpf  = 0.0f;   // Zustand des Puff-Tiefpasses
  float outHpfIn  = 0.0f;   // Eingang des Ausgabe-Hochpasses
  float outHpfOut = 0.0f;   // Ausgang des Ausgabe-Hochpasses

  uint32_t jitterSeed = 987654321;

  unsigned long audioStartMs = millis();

  Serial.println("Audio-Task gestartet");

  while (true) {

    // --- Drehzahl folgt weich (simuliert Motorträgheit) ---
    currentRPM += (targetRPM - currentRPM) * RPM_SMOOTHING;

    // Normalisierter Drehzahlwert im Bereich 0.0～1.0
    float rpmNorm = clampf((currentRPM - RPM_IDLE) / (RPM_MAX - RPM_IDLE), 0.0f, 1.0f);

    // Phasenzuwachs der Kurbelwelle pro Sample (Viertakt ÷ 2)
    float cycleIncrement = ((currentRPM / 60.0f) / (float)SAMPLE_RATE) / 2.0f;

    // Aktuelle Puff-Frequenz
    float thumpHz = THUMP_HZ_IDLE + rpmNorm * (THUMP_HZ_MAX - THUMP_HZ_IDLE);
    currentThumpHz = thumpHz;

    // Lautstärke ändert sich mit der Drehzahl
    float bgGain = BACKGROUND_GAIN_IDLE + rpmNorm * (BACKGROUND_GAIN_MAX - BACKGROUND_GAIN_IDLE);
    float thumpLayerGain = THUMP_LAYER_GAIN_IDLE + rpmNorm * (THUMP_LAYER_GAIN_MAX - THUMP_LAYER_GAIN_IDLE);

    // Tiefpass-Grenzfrequenz steigt mit Drehzahl (bei hohen Drehzahlen hellerer Hintergrund)
    float bgLpfAlpha = 0.16f + 0.55f * rpmNorm;

    // Fade-in beim Start (verhindert Einschalt-Knacks)
    float fadeIn = clampf((float)(millis() - audioStartMs) / 1800.0f, 0.0f, 1.0f);

    // --- Audio Sample für Sample erzeugen ---
    for (int i = 0; i < DMA_BUF_LEN; i++) {

      // ====================================================
      // Layer 1: Hintergrund-Motorsound — überlagerte Auspuff-Pulse aller 8 Zylinder
      // ====================================================
      float bg = 0.0f;

      for (int cyl = 0; cyl < NUM_CYLINDERS; cyl++) {
        float phase = crankPhase - cylinderPhase[cyl];
        while (phase < 0.0f) phase += 1.0f;
        while (phase >= 1.0f) phase -= 1.0f;

        float pulse = generateCylinderPulse(phase);
        float cylGain = (cyl % 2 == 0) ? 1.0f : 0.82f;  // Gerade/ungerade Zylinder leicht unterschiedlich, realistischer
        bg += pulse * cylGain;
      }

      bg /= (float)NUM_CYLINDERS * 0.42f;

      // Harmonischen-Layer hinzufügen (Fokus auf Bass, weniger Brummen durch hohe Harmonische)
      float basePhase  = crankPhase * 4.0f;
      float harmonics  = 0.0f;

      harmonics += fastSin(basePhase)        * 1.00f;
      harmonics += fastSin(basePhase * 0.5f) * 0.60f;   // Halbe Frequenz: mehr Tiefe
      harmonics += fastSin(basePhase * 1.5f) * 0.28f;
      harmonics += fastSin(basePhase * 2.0f) * (0.25f + 0.10f * rpmNorm);
      harmonics += fastSin(basePhase * 3.0f) * (0.08f + 0.08f * rpmNorm);
      harmonics += fastSin(basePhase * 4.0f) * (0.03f * rpmNorm);  // 4. Harmonische erzeugt Brummen, sehr leise halten
      harmonics /= 2.4f;

      bg = bg * 0.55f + harmonics * 0.45f;
      bg = tanhf(bg * (1.05f + rpmNorm * 0.8f));  // Soft-Clipping, simuliert Auspuff-Nichtlinearität

      // Tiefes mechanisches Rauschen (Rumble, kein Zischen) beimischen
      float rumble   = pseudoRandom();
      float rumble2  = pseudoRandom();
      bg += (rumble * 0.6f + rumble2 * 0.4f) * (0.008f + 0.018f * rpmNorm);

      // Tiefpass (klingt dumpfer, als käme der Ton aus dem Auspuff)
      float bgLpfAlpha2 = 0.18f + 0.45f * rpmNorm;
      bgLpf += bgLpfAlpha2 * (bg - bgLpf);
      bg = bgLpf;

      // Leichter Hochpass (entfernt Gleichanteil)
      float bgHp = 0.992f * (bgHpfOut + bg - bgHpfIn);
      bgHpfIn  = bg;
      bgHpfOut = bgHp;
      bg = bg * 0.92f + bgHp * 0.08f;

      bg *= bgGain;

      // ====================================================
      // Layer 2: Haupt-Puff — Tuning-Geradeaus-Rohr-Sound
      // ====================================================

      // Bei Ablauf des Timers neuen Puff auslösen
      if (samplesToNextTrigger <= 0) {

        // Vorherigen Puff als Stimme B ausklingen lassen (Überlappung)
        if (playPosA >= 0 && playPosA < thumpTableLen) {
          playPosB = playPosA;
          gainB = gainA * 0.50f;
        }

        playPosA = 0;

        // Alternierend: simuliert leichte Kraftunterschiede zwischen V8-Zylinderzündungen
        gainA = altToggle ? THUMP_ALT_GAIN : 1.0f;

        // Intervall bis zum nächsten Trigger (mit Swing und Jitter für mehr Groove)
        float intervalSamples = (float)SAMPLE_RATE / thumpHz;
        float swingFactor = altToggle ? (1.0f - THUMP_SWING) : (1.0f + THUMP_SWING);
        float jitter = 1.0f + localRandSigned(jitterSeed) * 0.025f;

        samplesToNextTrigger = (int)clampf(intervalSamples * swingFactor * jitter, 1.0f, 999999.0f);
        altToggle = !altToggle;
      }

      samplesToNextTrigger--;

      float thump = 0.0f;

      // Stimme A lesen
      if (playPosA >= 0) {
        if (playPosA < thumpTableLen) {
          thump += thumpTable[playPosA++] * gainA;
        } else {
          playPosA = -1;
        }
      }

      // Stimme B lesen (Ausklang des vorherigen Puffs)
      if (playPosB >= 0) {
        if (playPosB < thumpTableLen) {
          thump += thumpTable[playPosB++] * gainB;
          gainB *= 0.9992f;  // Langsames Fade-out
        } else {
          playPosB = -1;
        }
      }

      // Tiefpass macht die Puff-Kante runder, weniger hart
      thumpLpf += 0.58f * (thump - thumpLpf);
      thump = thumpLpf * thumpLayerGain;

      // ====================================================
      // Layer 3: Beide Layer mischen und ausgeben
      // ====================================================
      float sample = bg + thump;

      // Finaler Ausgabe-Hochpass (entfernt niederfrequentes Driften)
      float outHp = 0.988f * (outHpfOut + sample - outHpfIn);
      outHpfIn  = sample;
      outHpfOut = outHp;
      sample = sample * 0.86f + outHp * 0.14f;

      // Globales Soft-Clipping (verhindert Übersteuern beim Überlagern)
      sample = tanhf(sample * (1.05f + 0.22f * rpmNorm));

      sample *= MASTER_VOLUME * fadeIn;
      sample  = clampf(sample, -0.98f, 0.98f);

      // In 16-Bit-PCM wandeln, Links = Rechts (Monolautsprecher)
      int16_t out = (int16_t)(sample * PCM_OUTPUT_SCALE);
      stereoBuffer[i * 2]     = out;
      stereoBuffer[i * 2 + 1] = out;

      // Kurbelwellenphase weiterschieben
      crankPhase += cycleIncrement;
      if (crankPhase >= 1.0f) crankPhase -= 1.0f;
    }

    // Dieses Audio-Paket in I2S-DMA schreiben; danach das nächste erzeugen
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, stereoBuffer, sizeof(stereoBuffer), &bytesWritten, portMAX_DELAY);
  }
}

// ================= Gas-Task (auf Core 0, niedrige Priorität) =================
void throttleTask(void *param) {
  while (true) {
    updateThrottle();
    vTaskDelay(pdMS_TO_TICKS(20));  // Alle 20 ms Gas aktualisieren, reicht völlig
  }
}

// ================= Serieller Monitor-Task (auf Core 0, niedrigste Priorität) =================
void monitorTask(void *param) {
  char buf[128];

  while (true) {
    int rpmInt      = (int)(currentRPM + 0.5f);
    int targetInt   = (int)(targetRPM  + 0.5f);
    int throttlePct = (int)(throttleValue * 100.0f + 0.5f);
    int thumpHz10   = (int)(currentThumpHz * 10.0f + 0.5f);

    snprintf(buf, sizeof(buf),
      "RPM=%d  Ziel=%d  Gas=%d%%  Encoder=%d  PuffFreq=%d.%dHz",
      rpmInt, targetInt, throttlePct, encoderPosition,
      thumpHz10 / 10, thumpHz10 % 10);

    Serial.println(buf);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

// ================= setup: System-Initialisierung =================
void setup() {
#if DISABLE_BROWNOUT_FOR_TEST
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  Serial.begin(115200);
  delay(1000);

  // Speicher beim Start prüfen (wenn PSRAM 0 ist, nicht aktiv → zurück zu QSPI)
  Serial.printf("Freier SRAM: %d Bytes\n", ESP.getFreeHeap());
  Serial.printf("Freies PSRAM: %d Bytes\n", ESP.getFreePsram());

  Serial.println("====================================");
  Serial.println("ESP32-S3 V8-Sound-Simulator");
  Serial.println("Hauptpuff: Tuning-Geradeaus-Rohr");
  Serial.println("Gassteuerung: KY-040-Drehgeber");
  Serial.println("====================================");

  initEncoder();
  initSineTable();
  initCylinderPhases();
  buildStraightPipeThumpTable();
  initI2S();

  // Audio-Task: Core 1, höchste Priorität, 12 KB Stack
  xTaskCreatePinnedToCore(audioTask,    "AudioTask", 12288, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  // Gas-Task: Core 0, Priorität 2, 3 KB Stack
  xTaskCreatePinnedToCore(throttleTask, "Throttle",  3072,  NULL, 2,                        NULL, 0);
  // Monitor-Task: Core 0, niedrigste Priorität, 4 KB Stack (nicht zu klein, sonst Stack-Überlauf)
  xTaskCreatePinnedToCore(monitorTask,  "Monitor",   4096,  NULL, 1,                        NULL, 0);

  Serial.println("Systemstart abgeschlossen, Drehgeber steuert das Gas, Druck setzt zurück");
}

// loop macht fast nichts; die ganze Arbeit liegt bei den FreeRTOS-Tasks
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

### Code-Erklärung

Das Programm besteht aus drei parallelen Tasks, die FreeRTOS unabhängig voneinander schedult:

| Task | Core | Priorität | Aufgabe |
|------|------------|--------|--------|
| `audioTask` | Core 1 | höchste | Audio Sample für Sample synthetisieren, in I2S-DMA schreiben |
| `throttleTask` | Core 0 | mittel | alle 20 ms Drehgeber lesen, Gas aktualisieren |
| `monitorTask` | Core 0 | niedrigste | alle 700 ms Status über die serielle Konsole ausgeben |

**Die Sound-Synthese besteht aus drei Layern:**

**Layer 1: Hintergrund-Motorsound.** Jeder der 8 Zylinder hat eine eigene Phase; in den Zündwinkeln des V8 (0°, 90°, 150° … 450°) wird nacheinander die Auspuff-Puls-Wellenform ausgelöst. Alle 8 Zylinder überlagert ergeben das durchgehende tiefe Grollen. Auf den Zylinder-Puls kommen noch Grundfrequenz und einige Harmonische, damit der Motorsound mehr Tiefe bekommt.

**Layer 2: Haupt-Puff.** Alle `thumpHz`-bestimmten Intervalle wird aus der vorgerechneten Puff-Wellenformtabelle ein vollständiger „Puff" abgespielt. Der Puff besteht aus einer dreistufigen Hüllkurve (Attack → Body → Decay), ergänzt um einen Frequenzabfall (simuliert den Druckabbau) und eine Rebound-Verzögerung (simuliert Rohr-Resonanz) — klingt wie ein Tuning-Geradeaus-Auspuff.

**Layer 3: Mix und Ausgabe.** Beide Layer addieren sich, danach ein globales Soft-Clipping gegen Übersteuern, ein Fade-in-Faktor (gegen Einschalt-Knacks), am Ende wird alles als 16-Bit-Stereo-PCM an I2S übergeben.



## Puff-Sample-Debug-Tool (optional)

Um schnell den passenden Auspuff-Sound zu finden, habe ich zusätzlich einen seriellen Carousel-Testcode gebaut: 30 Presets lassen sich über serielle Befehle umschalten und direkt vergleichen, bis der Puff dir gefällt. Im Hauptprogramm kommt am Ende Preset 23 „Tuning-Geradeaus-Rohr" zum Einsatz.

```c
/*
 * ESP32-S3 + MAX98357A
 * Puff-Sample-Carousel-Tester V2
 * 30 Samples + stark angehobene Lautstärke
 *
 * Verkabelung:
 *   BCLK -> GPIO16
 *   LRC  -> GPIO17
 *   DIN  -> GPIO15
 *
 * Serielle Befehle (115200):
 *   n     Nächster
 *   p     Vorheriger
 *   r     Wiederholen
 *   s     Auto-Carousel stoppen
 *   a     Auto-Carousel starten
 *   b     Hintergrund an/aus
 *   1~30  Zur Nummer springen
 *   h     Hilfe
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

// ================= Preset-Parameter-Struktur =================
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

//  name                         atk  body tail  fS   fB   fE  noise t2   t3   sub  drv  burst rebMs rebG  alt   swng  gain  rumble
const ThumpPreset presets[] = {
  {"01 Tiefer Großhubraum",        12,  65, 100,  55,  42,  34,  0.18, 0.24, 0.08, 0.28, 1.7, 0.18, 44, 0.22, 1.00, 0.00, 2.8, 0.20},
  {"02 Runder, dichter",           14,  75, 130,  52,  40,  32,  0.12, 0.18, 0.04, 0.32, 1.5, 0.10, 50, 0.18, 1.00, 0.00, 2.9, 0.16},
  {"03 Klein-Horn-Boost A",         7,  42,  65, 100,  80,  65,  0.16, 0.30, 0.14, 0.06, 1.6, 0.16, 32, 0.14, 1.00, 0.00, 2.6, 0.12},
  {"04 Klein-Horn-Boost B",         5,  35,  55, 120,  95,  78,  0.14, 0.36, 0.20, 0.04, 1.7, 0.12, 26, 0.12, 1.00, 0.00, 2.5, 0.10},
  {"05 US-V8-Leerlauf",             9,  55,  95,  72,  56,  44,  0.22, 0.26, 0.10, 0.14, 1.8, 0.24, 42, 0.30, 0.80, 0.20, 2.7, 0.22},
  {"06 Mehr Glucksen, ungleichmäßig", 11,  58, 105,  68,  52,  42,  0.24, 0.22, 0.08, 0.18, 1.8, 0.22, 54, 0.38, 0.72, 0.26, 2.8, 0.24},
  {"07 Gegendruck-Doppelpuff",      8,  48,  85,  80,  62,  48,  0.20, 0.26, 0.12, 0.12, 1.7, 0.20, 58, 0.48, 0.88, 0.14, 2.6, 0.18},
  {"08 Rau, reißend",               6,  40,  68,  90,  72,  56,  0.28, 0.32, 0.16, 0.08, 2.2, 0.32, 34, 0.22, 0.90, 0.10, 2.5, 0.15},
  {"09 Extrem dick, dumpf",        16,  85, 150,  48,  38,  30,  0.08, 0.14, 0.02, 0.36, 1.6, 0.06, 58, 0.20, 1.00, 0.00, 3.0, 0.14},
  {"10 Kurzer Punch",               4,  28,  45, 100,  78,  60,  0.14, 0.38, 0.20, 0.04, 1.8, 0.12, 22, 0.10, 1.00, 0.00, 2.4, 0.10},
  {"11 Raue Auspuff",               8,  50,  88,  82,  64,  50,  0.32, 0.24, 0.10, 0.10, 1.9, 0.34, 40, 0.26, 0.86, 0.12, 2.6, 0.16},
  {"12 Tieffrequente Kanone",      13,  68, 115,  58,  46,  36,  0.14, 0.20, 0.06, 0.30, 1.8, 0.14, 48, 0.26, 1.00, 0.00, 2.9, 0.20},
  {"13 Trockener Mitten-Punch",     6,  36,  58, 130, 100,  78,  0.10, 0.40, 0.24, 0.02, 1.6, 0.08, 28, 0.10, 1.00, 0.00, 2.4, 0.08},
  {"14 Doppelpuls-Glucksen",        7,  44,  78,  85,  66,  52,  0.18, 0.28, 0.14, 0.10, 1.8, 0.20, 20, 0.45, 0.82, 0.18, 2.6, 0.16},
  {"15 Alter V8, locker",          10,  60, 108,  72,  55,  44,  0.24, 0.22, 0.08, 0.16, 1.7, 0.20, 52, 0.32, 0.68, 0.30, 2.7, 0.22},
  {"16 Extra dick Test",           15,  95, 160,  54,  42,  32,  0.06, 0.14, 0.02, 0.38, 1.6, 0.04, 64, 0.18, 1.00, 0.00, 3.2, 0.12},
  {"17 Harley-Stil",                8,  52,  90,  78,  58,  46,  0.26, 0.24, 0.10, 0.16, 1.9, 0.26, 48, 0.35, 0.65, 0.32, 2.8, 0.25},
  {"18 Sportwagen, hochtourig scharf", 4,  30,  50, 140, 110,  88,  0.12, 0.42, 0.28, 0.02, 1.8, 0.10, 20, 0.08, 1.00, 0.00, 2.3, 0.08},
  {"19 Diesel, tuckernd",          14,  48,  80,  65,  50,  42,  0.30, 0.18, 0.06, 0.20, 2.0, 0.28, 38, 0.40, 0.75, 0.22, 2.7, 0.20},
  {"20 Cruiser, großvolumig",      12,  72, 125,  60,  45,  36,  0.16, 0.20, 0.06, 0.34, 1.7, 0.12, 55, 0.24, 1.00, 0.00, 3.0, 0.18},
  {"21 Extra brutal, reißend",      3,  25,  40, 110,  85,  68,  0.35, 0.34, 0.18, 0.06, 2.5, 0.40, 18, 0.15, 0.92, 0.08, 2.4, 0.12},
  {"22 Sanft, großvolumig",        16,  90, 140,  50,  40,  34,  0.10, 0.16, 0.04, 0.30, 1.4, 0.06, 60, 0.16, 1.00, 0.00, 3.0, 0.10},
  {"23 Tuning-Geradeaus-Rohr",      5,  38,  62, 105,  82,  64,  0.22, 0.30, 0.16, 0.08, 2.1, 0.28, 30, 0.18, 0.94, 0.06, 2.5, 0.14},
  {"24 Tief + starker Gegendruck", 10,  58,  95,  65,  50,  40,  0.18, 0.22, 0.08, 0.22, 1.8, 0.16, 65, 0.52, 0.85, 0.16, 2.8, 0.20},
  {"25 Luftstoß-Typ",               6,  35,  55,  88,  68,  52,  0.38, 0.20, 0.08, 0.10, 1.7, 0.45, 28, 0.14, 1.00, 0.00, 2.5, 0.12},
  {"26 3-Zylinder-Tuckern",        10,  45,  75,  74,  58,  46,  0.20, 0.22, 0.10, 0.14, 1.8, 0.20, 36, 0.30, 0.60, 0.35, 2.6, 0.18},
  {"27 Subwoofer-Test",            18, 100, 180,  42,  32,  26,  0.06, 0.12, 0.02, 0.42, 1.5, 0.04, 70, 0.20, 1.00, 0.00, 3.4, 0.08},
  {"28 Direkter Punch",             5,  32,  48,  95,  75,  58,  0.16, 0.34, 0.18, 0.06, 2.0, 0.16, 24, 0.12, 1.00, 0.00, 2.6, 0.10},
  {"29 Vollfrequenz-Brüllen",       8,  55,  90,  85,  65,  50,  0.20, 0.28, 0.14, 0.18, 1.9, 0.22, 42, 0.28, 0.88, 0.12, 2.8, 0.20},
  {"30 Extremkontrast-Test",        3,  20,  35, 150, 120,  90,  0.40, 0.44, 0.28, 0.02, 2.4, 0.45, 16, 0.08, 1.00, 0.00, 2.2, 0.06},
};

const int NUM_PRESETS = sizeof(presets) / sizeof(presets[0]);

// ================= Initialisierung =================
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

// ================= Wellenformtabelle aufbauen =================
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

// ================= Serielle Steuerung =================
void showHelp() {
  Serial.println();
  Serial.println("===== Befehle =====");
  Serial.println("n     Nächster");
  Serial.println("p     Vorheriger");
  Serial.println("r     Wiederholen");
  Serial.println("s     Auto-Carousel stoppen");
  Serial.println("a     Auto-Carousel starten");
  Serial.println("b     Hintergrund an/aus");
  Serial.println("1~30  Zur Nummer springen");
  Serial.println("h     Hilfe");
  Serial.println("==================");
}

void printPresetInfo(int idx) {
  Serial.println();
  Serial.println("========================================");
  Serial.print("Preset #");
  Serial.print(idx + 1);
  Serial.print(" / ");
  Serial.println(NUM_PRESETS);
  Serial.println(presets[idx].name);
  Serial.print("Vordere 2,5s langsamer Puff, hintere 2,5s schneller Puff, Hintergrund: ");
  Serial.println(backgroundEnabled ? "an" : "aus");
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
  if (cmd == "s") { autoPlay = false; Serial.println("Auto-Carousel gestoppt"); return; }
  if (cmd == "a") { autoPlay = true; lastSwitchMs = millis(); Serial.println("Auto-Carousel gestartet"); return; }
  if (cmd == "b") { backgroundEnabled = !backgroundEnabled; Serial.print("Hintergrund: "); Serial.println(backgroundEnabled ? "an" : "aus"); return; }
  if (cmd == "h") { showHelp(); return; }

  int n = cmd.toInt();
  if (n >= 1 && n <= NUM_PRESETS) { requestPreset(n - 1); return; }

  Serial.print("Unbekannt: ");
  Serial.println(cmd);
}

// ================= Audio-Task =================
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

      // ★ Wichtig: finale Ausgabe-Verstärkung stark erhöhen
      sample *= 1.8f;

      sample = tanhf(sample * 1.1f);
      sample = clampf(sample, -0.98f, 0.98f);

      // ★ Vollaussteuerung
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
  Serial.println("Puff-Sample-Carousel-Tester V2");
  Serial.println("30 Samples + laute Version");
  Serial.println("====================================");

  initSineTable();
  initI2S();
  showHelp();
  requestPreset(0);

  xTaskCreatePinnedToCore(audioTask, "Audio", 10240, NULL, configMAX_PRIORITIES - 1, NULL, 1);
  Serial.println("Wiedergabe startet...");
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

## Häufige Probleme

Keine Panik — 90 % der Fälle stecken in diesen Punkten, ein Durchgang durch die Liste löst meist alles:

**Nach dem Einschalten kommt gar kein Ton aus dem Lautsprecher**

Zuerst den SD-Pin prüfen. Wenn der SD-Pin des MAX98357A versehentlich auf Low gezogen wird (z. B. Berührung mit GND oder nicht offen), geht das Modul auf stumm. SD offen lassen oder an 3.3V, dann neu starten. Danach über die serielle Konsole prüfen, ob die I2S-Initialisierung einen Fehler meldet oder „I2S-Treiberinstallation fehlgeschlagen" ausgegeben wird.

**Der Ton ist sehr leise, kaum hörbar**

Zuerst die Lautsprecher-Impedanz prüfen. Der MAX98357A liefert an 4Ω 3W, an 8Ω nur etwa 1.4W — also die Hälfte Lautstärke. Außerdem prüfen, ob VIN wirklich an 5V hängt; an 3.3V sinkt die Leistung stark. Du kannst im Code `PCM_OUTPUT_SCALE` von 26000 auf 30000 erhöhen, aber nicht über 32767 — sonst Übersteuerung durch Überlauf.

**Drehgeber dreht in die falsche Richtung (im Uhrzeigersinn reduziert, gegen den Uhrzeigersinn erhöht)**

In `encoderISR()` `encoderPosition++` und `encoderPosition--` tauschen — oder direkt die CLK- und DT-Kabel physisch tauschen. Eines von beidem.

**Beim Start sofortiger Absturz/Reboot, seriell kommt `Stack canary watchpoint triggered`**

Stack-Überlauf eines FreeRTOS-Tasks; der Task-Name steht im Fehler (z. B. `Monitor`). Stack-Größe in `xTaskCreatePinnedToCore` (die dritte Zahl) erhöhen; für die Monitor-Task mindestens 4096, sonst 8192.

**Seriell zeigt `OOM: failed to allocate XXX bytes`**

Kein Speicher mehr. In dieser Reihenfolge prüfen:

1. Im Arduino IDE unter **Werkzeuge → PSRAM**: muss **QSPI PSRAM** ausgewählt sein (nicht OPI)
2. Am Anfang von `setup()` `Serial.printf("PSRAM: %d\n", ESP.getFreePsram());` einfügen; nach dem Flashen seriell ansehen — wenn 0, ist PSRAM nicht aktiv, zurück zu den Optionen
3. Prüfen, ob dein Board überhaupt externes PSRAM hat (bei ESP32-S3-WROOM-1-**N16R8** steht R8 für 8MB PSRAM)

**Regelmäßige Knacksgeräusche oder Rauschen im Ton**

Meistens eine Masse-Problematik. Der GND des ESP32-S3 und der GND des MAX98357A müssen auf derselben Leitung liegen, nicht an zwei verschiedenen Versorgungs-Massen. Mit dem Multimeter den Widerstand zwischen den beiden GND messen — sollte fast 0Ω sein.

---

## FAQ

**F: GPIO16/17/15 meines ESP32-S3 sind belegt — kann ich andere Pins nehmen?**
A: Ja, I2S-Pins lassen sich frei auf beliebige GPIOs mappen. Ändere oben im Code die Makros `I2S_BCLK`, `I2S_LRC`, `I2S_DOUT` auf deine Pin-Nummern. Achtung: GPIO 0, 1, 2, 3, 43, 44 haben Sonderfunktionen, besser meiden.

**F: Kann ich zwei Lautsprecher für Stereo anschließen?**
A: Der MAX98357A ist ein Monoverstärker; für Stereo brauchst du zwei Module — eines für den linken, eines für den rechten Kanal, unterschieden über die Beschaltung des GAIN-Pins (eines an GND = rechter Kanal, eines offen = linker Kanal). Im Code sind beide PCM-Daten derzeit gleich (`stereoBuffer[i*2] = stereoBuffer[i*2+1] = out`); echtes Stereo erfordert Änderungen in der Synthese-Logik.

**F: Reicht 22050 Hz Abtastrate? Kann ich auf 44100 Hz wechseln?**
A: 22050 Hz reicht für tiefe und mittlere Motortöne völlig aus; Frequenzen bis 11025 Hz werden wiedergegeben, und Motoren hörst du hauptsächlich zwischen 50 Hz und 4 kHz. 44100 Hz geht theoretisch, verdoppelt aber die CPU-Last — erst Stabilität testen, dann `SAMPLE_RATE` und `sample_rate` in der I2S-Konfiguration zusammen ändern.

**F: Zerstört ein 5V-Anschluss den ESP32-S3?**
A: Der VIN des MAX98357A hängt an 5V; seine Signalpins (BCLK, LRC, DIN) sind 3.3V-Pegel und direkt mit den GPIOs des ESP32-S3 verbindbar — kein Pegelwandler nötig. Der ESP32-S3 gibt 3.3V aus, der MAX98357A erkennt das, alles sicher.

**F: Im Leerlauf ist der Ton zu leise, kaum hörbar — kann ich das lauter machen?**
A: `BACKGROUND_GAIN_IDLE` (Standard 0.45) und `THUMP_LAYER_GAIN_IDLE` (Standard 0.75) erhöhen, z. B. auf 0.6 und 1.0 — die Leerlauf-Lautstärke steigt spürbar. Danach testen, ob bei Vollgas Übersteuern auftritt; falls ja, `PCM_OUTPUT_SCALE` leicht reduzieren.

**F: Eine Rastung des KY-040 ändert das Gas um 10 % — zu viel; kann ich das feiner einstellen?**
A: `ENCODER_STEP_SIZE` von 0.1 verringern, z. B. auf 0.05 → 5 % pro Rastung, 20 Rastungen bis Vollgas, feinere Auflösung.

**F: Läuft der Code auch auf einem ESP32 (ohne S3)?**
A: Theoretisch ja, die I2S-API ist generisch; aber normale ESP32 haben kein oder nur kleines externes PSRAM, das Projekt braucht aber vermutlich mehr Speicher. Mindestens ein PSRAM-Modell wie ESP32-WROVER empfehlen. GPIO-Nummern an dein Board anpassen.

---

## Weiterführende Ideen

Wenn die Basisversion läuft, kannst du in diese Richtungen weiterbauen:

- **Geschwindigkeitssensor anschließen**: Hall-Sensor ans Rad, je schneller du fährst, desto mehr Gas automatisch — Hände frei.
- **Auf V6 / Reihenvier / Motorrad-Sound wechseln**: `NUM_CYLINDERS` und `firingAngles` anpassen; andere Zündwinkel = anderer Motor.
- **TFT-Display ergänzen**: Aktuelle Drehzahl und Gas-Prozent anzeigen, inklusive Cockpit-Feeling.
- **Wasserdichtes Gehäuse**: Am E-Bike einsetzen; bei Regen muss das Gehäuse dicht sein — Wasser im Circuit ist schlimmer als kein Ton.

---

## Referenzen

- [MAX98357A Datenblatt (Analog Devices)](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [MAX98357A Produktseite (Analog Devices)](https://www.analog.com/en/products/max98357a.html)
- [ESP32-S3 Technical Reference Manual (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3-WROOM-1 Produktseite (Espressif)](https://www.espressif.com/en/products/modules/esp32-s3)
- [ESP32 Arduino Core GitHub](https://github.com/espressif/arduino-esp32)
- [FreeRTOS Task Creation API Docs](https://www.freertos.org/a00125.html)
