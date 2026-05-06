---
title: "ESP32-S3 + 1.3\" SH1106 OLED Cyber-Octopus | I2C + U8g2 Animations-Tutorial"
boardId: esp32s3
moduleId: display/oled13-sh1106
category: esp32
date: 2026-05-06
intro: "ESP32-S3 steuert ein 1,3\" SH1106 OLED und realisiert mit der U8g2-Bibliothek eine schwimmende Oktopus-Animation mit Blasen-Partikeleffekt. I2C mit 4 Leitungen, Lissajous-Kurven-Bewegungsalgorithmus, inklusive Fehlerbehebung."
image: "https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg"
---

# ESP32-S3 steuert 1,3" SH1106 OLED - Komplett-Tutorial: Cyber-Octopus Animation (I2C + U8g2)

Schwierigkeit: ⭐⭐☆☆☆ (auch fuer Anfaenger geeignet)
Geschaetzte Dauer: 30 Minuten
Getestet mit: Arduino IDE 2.3.8 · U8g2 v2.35.30 · ESP32 Board Package 3.3.8

---

> **TL;DR (Schnellstart):**
>
> 1. Verkabelung: SDA → GPIO 8, SCL → GPIO 9, VCC → 3.3V, GND → GND
> 2. Bibliothek installieren: U8g2 (von oliver)
> 3. Im Konstruktor die I2C-Adresse auf `0x3C * 2` aendern, Wire-Initialisierung auf `Wire.begin(8, 9)` anpassen
> 4. Code hochladen — der Oktopus faengt an zu schwimmen
> 5. Der Code verwendet einen Lissajous-Kurven-Bewegungsalgorithmus; Details dazu fuer Interessierte weiter unten

---

## Einleitung

Hast du schon einmal diese kleinen OLED-Bildschirme in Online-Shops gesehen — kaum groeßer als ein Daumennagel, aber in den Videos des Verkäufers laufen darauf fluessige Animationen, die einfach cool aussehen?

Genau das hat mich dazu gebracht, am naechsten Nachmittag ein 1,3" SH1106 OLED zu bestellen. Und dann kam das klassische Problem: Bildschirm angekommen, Code hochgeladen, es leuchtet — aber es wird nichts angezeigt.

Nach einem ganzen Nachmittag Fehlersuche stellte sich heraus, dass die Probleme hauptsaechlich an zwei Stellen lagen: **die I2C-Pins sind nicht die Standard-Pins 21/22**, und **der SH1106-Treiberchip ist nicht der SSD1306** — beide sehen aehnlich aus, sind aber nicht austauschbar.

Sobald diese beiden Punkte geklaert sind, laeuft alles reibungslos. Ziel dieses Tutorials: Innerhalb von 30 Minuten einen Oktopus auf deinem OLED-Bildschirm schwimmen zu lassen — inklusive Blasen, die er ausstößt.



---

## Ergebnis




![ESP32-canva-017-1inch3-oled (1) (1)](https://img.lingflux.com/2026/05/5b0acee583b859615b68c15453b18a1f.jpg)



Ein 32×32 Pixel großer Oktopus schwimmt ueber den Bildschirm. Die Bewegung folgt einer Lissajous-Kurve (einer eleganten 8-foermigen Wellenbahn), waehrend am Mund fortlaufend Blasen unterschiedlicher Größe ausgestoßen werden, die langsam aufsteigen und verschwinden.

<br>

<iframe width="560" height="315" src="https://www.youtube.com/embed/zw06nh7wXp4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Komponentenbeschreibung

### 1.3" OLED SH1106

Der SH1106 ist ein einfarbiger OLED-Treiberchip, der die Nullen und Einsen aus deinem Code in leuchtende Pixel auf dem Bildschirm umwandelt. Man kann sich ihn als eine Art Punktmatrix-Uebersetzer vorstellen — du sagst ihm „Zeile 30, Spalte 50 soll leuchten", und er steuert das entsprechende organische Leuchtdiode-Element an.

| Parameter | Wert |
|-----------|------|
| Aufloesung | 128 × 64 Pixel |
| Treiberchip | SH1106 (≠ SSD1306) |
| Kommunikationsschnittstelle | I2C (Standardadresse 0x3C) |
| Betriebsspannung | 3.3V / 5V kompatibel |
| Bildschirmgroesse | 1,3 Zoll |

> Warum dieses Display: Guenstig, ausreichend, und in Kombination mit der U8g2-Bibliothek lassen sich Punktmatrix-Animationen problemlos umsetzen. Achtung: Nicht versehentlich das 0,96" SSD1306-Display kaufen — der Treiberchip ist anders, und der Code fuehrt zu einem weißen Bildschirm.

---

## Stueckliste (BOM)

| Komponente | Menge |
|------------|-------|
| ESP32-S3 Entwicklungsboard | × 1 |
| 1.3" OLED SH1106 (I2C) | × 1 |
| Jumper-Kabel (Maennlich-Weiblich) | × 4 |

---

## Verkabelung

| 1.3" OLED Pin | Verbindung mit ESP32-S3 |
|-----------|---------------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

> Empfehlung: Nach dem Anschließen alle Verbindungen einzeln ueberpruefen — das spart 80 % der Fehlerbehebungszeit. Vertauschte SDA/SCL-Leitungen sind die haeufigste Ursache fuer einen weißen Bildschirm: Das Display wird scheinbar normal mit Strom versorgt, zeigt aber einfach nichts an.

---

## Bibliothek installieren

In der Arduino IDE den Bibliotheksverwalter oeffnen und nach **U8g2** suchen. Die von oliver veroeffentlichte Version installieren.

Getestete Version: **U8g2 v2.35.30**

U8g2 ist eine Open-Source-Display-Bibliothek, die von [olikraus/u8g2](https://github.com/olikraus/u8g2) gepflegt wird. Sie unterstuetzt nahezu alle gaengigen einfarbigen OLED/LCD-Treiberchips, einschließlich des SH1106.

---

## Vollstaendiger Code

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// Schritt 1: U8g2-Objekt deklarieren
// Hinweis: Hier SH1106, 128×64, Vollpuffer-Modus, Hardware-I2C
// U8G2_R2 = Bildschirm um 180 Grad gedreht (je nach Loetrichtung des Displays anpassen; keine Drehung noetig → U8G2_R0)
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R2, /* reset=*/ U8X8_PIN_NONE);

// ==================== Oktopus-Animationsframes (im Flash gespeichert, spart RAM) ====================
// 4 Frames Animation, jeder Frame 32×32 Pixel, XBM-Punktmatrix-Format
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

// 4 Frame-Zeiger in einem Array ablegen, fuer einfachen zyklischen Zugriff
const unsigned char* animation_frames[] = {
  animation_frame_0, animation_frame_1, animation_frame_2, animation_frame_3
};

const int TOTAL_FRAMES = 4;
const unsigned long FRAME_DELAY = 120; // Frame-Intervall (ms), kleiner = schneller, groesser = langsamer
int currentFrame = 0;
unsigned long lastFrameTime = 0;
const int SPRITE_SIZE = 32; // Oktopus-Punktmatrixgroesse 32×32

// ==================== Blasen-Partikelsystem ====================
#define MAX_BUBBLES 10 // Maximal 10 Blasen gleichzeitig auf dem Bildschirm

struct Bubble {
  float x;       // Aktuelle X-Koordinate
  float y;       // Aktuelle Y-Koordinate
  float radius;  // Aktueller Radius (Float, fuer schrittweises Schrumpfen)
  float speedY;  // Aufstiegsgeschwindigkeit in Pixel pro Frame
  float wobble;  // Zufaellige Phasenverschiebung fuer Seitwaertsbewegung
  bool active;   // Ist diese Blase "am Leben"?
};

Bubble bubbles[MAX_BUBBLES]; // Objektpool, vermeidet dynamische Speicherallokation

void setup() {
  Serial.begin(115200);

  // Schritt 2: Zufallsgenerator initialisieren, damit Blasen bei jedem Start anders aussehen
  randomSeed(analogRead(0));

  // Schritt 3: I2C initialisieren, SDA=8, SCL=9
  Wire.begin(8, 9);
  u8g2.setI2CAddress(0x3C * 2); // U8g2 erfordert Links-Shift der Adresse, 0x3C << 1 = 0x78
  u8g2.begin();

  // Schritt 4: Alle Blasen als inaktiv markieren
  for (int i = 0; i < MAX_BUBBLES; i++) {
    bubbles[i].active = false;
  }

  Serial.println("Oktopus-Aquarium erfolgreich gestartet!");
}

void loop() {
  unsigned long currentTime = millis();

  // Non-Blocking-Timing statt delay(), fuer fluessige Animation
  if (currentTime - lastFrameTime >= FRAME_DELAY) {
    lastFrameTime = currentTime;

    // ======== Schritt 1: Oktopus-Position mit Lissajous-Kurve berechnen ========
    // Ueberlagerung zweier Sinuswellen unterschiedlicher Frequenz erzeugt eine elegante 8-foermige Schwimmbahn
    float t = currentTime * 0.0008;

    float waveX = sin(t * 0.8) * 0.6 + sin(t * 0.3) * 0.4;
    int posX = 48 + (int)(waveX * 48); // Horizontaler Bereich ca. 0~96

    float waveY = cos(t * 0.7) * 0.6 + sin(t * 0.4) * 0.4;
    int posY = 16 + (int)(waveY * 16); // Vertikaler Bereich ca. 0~32

    // ======== Schritt 2: 25% Wahrscheinlichkeit, eine neue Blase am Mund zu erzeugen ========
    if (random(100) < 25) {
      for (int i = 0; i < MAX_BUBBLES; i++) {
        if (!bubbles[i].active) {
          bubbles[i].active = true;
          bubbles[i].x      = posX + 16 + random(-8, 8);   // Zufaellige Abweichung am Mund
          bubbles[i].y      = posY + 24 + random(0, 5);
          bubbles[i].radius = random(15, 35) / 10.0;       // 1.5~3.5 Pixel
          bubbles[i].speedY = random(10, 25) / 10.0;       // Zufaellige Aufstiegsgeschwindigkeit
          bubbles[i].wobble = random(0, 100) / 10.0;       // Zufaellige Schwingungsphase
          break; // Nur eine Blase pro Frame erzeugen
        }
      }
    }

    // ======== Schritt 3: Puffer loeschen, Zeichnen beginnen ========
    u8g2.clearBuffer();

    // Oktopus zeichnen (XBM-Punktmatrixbild)
    u8g2.drawXBMP(posX, posY, SPRITE_SIZE, SPRITE_SIZE, animation_frames[currentFrame]);

    // ======== Schritt 4: Alle aktiven Blasen aktualisieren und zeichnen ========
    for (int i = 0; i < MAX_BUBBLES; i++) {
      if (bubbles[i].active) {
        bubbles[i].y -= bubbles[i].speedY; // Nach oben steigen

        // Seitwaertsbewegung ueber Zeitachse, wie echte Wasserblasen
        float currentX = bubbles[i].x + sin(t * 3.0 + bubbles[i].wobble) * 4.0;

        // Blase schrumpft pro Frame, simuliert Verblassen und Verschwinden
        bubbles[i].radius -= 0.06;

        // Radius zu klein oder ueber oberen Bildschirmrand → Blase zurueckgeben
        if (bubbles[i].radius <= 0.5 || bubbles[i].y < -5) {
          bubbles[i].active = false;
        } else {
          // Hohlkreis zeichnen — sieht eher aus wie eine echte Blase als ein gefuellter Kreis
          u8g2.drawCircle((int)currentX, (int)bubbles[i].y, (int)bubbles[i].radius);
        }
      }
    }

    // Schritt 5: Pufferinhalt auf einmal an das Display senden
    u8g2.sendBuffer();

    // Zum naechsten Frame wechseln
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }
}
```

### Code-Erklaerung

**Lissajous-Kurven-Bewegung**: Zwei Sinus-/Kosinuswellen unterschiedlicher Frequenz werden ueberlagert, wodurch der Oktopus eine elegante 8-foermige Bahn beschreibt. Das sieht viel besser aus als eine einfache Hin- und Herbewegung und erfordert nur wenige Zeilen mit trigonometrischen Funktionen.

**Blasen-Objektpool**: Im Voraus werden 10 `Bubble`-Strukturen allokiert und ueber das `active`-Flag verwaltet ("leben" oder "tot"). Das vermeidet Speicherfragmentierung durch `new/delete` — ein auf MCUs haeufig verwendetes, zuverlaessiges Muster.

**`PROGMEM`-Schluesselwort**: Damit werden die Punktmatrix-Arrays im Flash statt im SRAM gespeichert. 4 Frames × 128 Bytes = 512 Bytes — das im SRAM zu speichern waere Verschwendung.

**Non-Blocking-Timing**: `millis()` statt `delay()` sorgt dafuer, dass die physikalische Aktualisierung der Blasen und der Animationswechsel des Oktopus im selben Loop natuerlich koordiniert werden, ohne Ruckeln.

---

## Haeufige Probleme und Loesungen

Keine Panik — 90 % der Probleme haben eine dieser Ursachen:

**Bildschirm leuchtet ueberhaupt nicht / keine Ausgabe**
Zuerst die Stromversorgung pruefen — VCC ist mit 3.3V verbunden, nicht mit 5V (viele Module sind zwar 5V-kompatibel, aber zur Sicherheit erst einmal bestaetigen). Dann mit einem Multimeter messen, ob SDA/SCL vertauscht sind — das ist der haeufigste Fehler.

**Bildschirm leuchtet, aber komplett weiß oder schwarz, kein Bild**
Hoehstwahrscheinlich ein I2C-Adressproblem. Der Code verwendet `0x3C * 2`, wie es U8g2 erfordert. Wenn das Display auf der Rueckseite einen I2C-Adress-Jumper auf `0x3D` hat, `0x3C` durch `0x3D` ersetzen. Alternativ zuerst einen I2C-Scanner laufen lassen, um die Adresse zu bestaetigen.

**Bild wird angezeigt, aber oben/unten vertauscht**
Im Konstruktor `U8G2_R2` durch `U8G2_R0` ersetzen. Der einzige Unterschied ist eine 180-Grad-Drehung.

**Oktopus-Position ragt ueber den Bildschirmrand**
Der Maximalwert von `posX` liegt bei ca. 96; plus 32 Pixel Breite ergibt genau den Rand bei 128. Wenn die Bewegungsamplitude geaendert wird, darauf achten, dass die Koordinaten `128 - SPRITE_SIZE` nicht ueberschreiten.

**Blasen ruckeln stark**
`FRAME_DELAY` von 120 auf 80 reduzieren. Wenn es immer noch ruckelt, die I2C-Busgeschwindigkeit pruefen — nach `Wire.begin(8, 9)` die Zeile `Wire.setClock(400000)` hinzufuegen, um in den Schnellmodus (400 kHz) zu wechseln.

---

## FAQ

**F: Koennen andere GPIOs fuer I2C verwendet werden?**
A: Ja, der I2C des ESP32-S3 unterstuetzt das Mapping auf beliebige GPIOs. Einfach die Zahlen in `Wire.begin(8, 9)` durch die gewuenschten Pin-Nummern ersetzen — SDA zuerst, dann SCL.

**F: Mein Display ist ein 0,96" SSD1306 — kann der Code direkt verwendet werden?**
A: Nicht direkt, der Treiberchip ist anders. Den Konstruktor durch `U8G2_SSD1306_128X64_NONAME_F_HW_I2C` ersetzen; der restliche Code kann beibehalten werden.

**F: Welche I2C-Geschwindigkeit wird unterstuetzt?**
A: SH1106 im Standardmodus 100 kHz, im Schnellmodus 400 kHz. Dieser Code setzt keine explizite Geschwindigkeit; standardmaeßig werden 100 kHz verwendet. Falls die Aktualisierung zu langsam ist, `Wire.setClock(400000)` hinzufuegen.

**F: Wozu dient PROGMEM, kann es entfernt werden?**
A: `PROGMEM` speichert die Arrays im Flash statt im SRAM. Die 4 Frame-Daten betragen ca. 512 Bytes. Entfernen beeintraechtigt die Funktion nicht, belegt aber 512 Bytes SRAM. Der ESP32-S3 hat ausreichend SRAM, daher ist es kein grosses Problem — es ist jedoch eine gute Gewohnheit, es beizubehalten.

**F: Wie kann der Oktopus schneller oder langsamer schwimmen?**
A: Den Wert von `FRAME_DELAY` aendern — kleinere Zahl = schneller, groeßere Zahl = langsamer. Die Aufstiegsgeschwindigkeit der Blasen wird durch den Bereich `random(10, 25) / 10.0` von `speedY` gesteuert und kann ebenfalls angepasst werden.

**F: Wie viel RAM benoetigt das Display?**
A: Der Vollpuffer-Modus von U8g2 (`_F_`) haelt einen kompletten Framepuffer im RAM: 128×64 / 8 = 1024 Bytes, ca. 1 KB. Der ESP32-S3 hat 512 KB SRAM — mehr als ausreichend.

---

## Erweiterte Ideen

- **Anderen Charakter verwenden**: Mit [image2cpp](https://javl.github.io/image2cpp/) beliebige Schwarz-Weiß-Bilder in XBM-Punktmatrizen umwandeln und den Oktopus ersetzen
- **Sensor-Interaktion hinzufuegen**: Einen Sound-Sensor anschließen; die Schwimmgeschwindigkeit des Oktopus aendert sich mit der Lautstaerke
- **Multi-Display-Betrieb**: Zwei OLED-Displays am selben I2C-Bus (Adressen 0x3C und 0x3D), auf jedem Display ein Oktopus
- **TFT-Farbdisplay-Version**: Auf ST7789 Farb-TFT umsteigen und mit Graustufenverlaufen feinere Blaseneffekte erzeugen

---

## Referenzen

- [Espressif ESP32-S3 Datenblatt (offiziell)](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_cn.pdf)
- [U8g2 Bibliothek GitHub (olikraus/u8g2)](https://github.com/olikraus/u8g2)
- [SH1106 Treiberchip Datenblatt (Sino Wealth)](https://www.velleman.eu/downloads/29/infosheets/sh1106_datasheet.pdf)
- [image2cpp: Online-Tool zur Umwandlung von Bildern in XBM-Punktmatrizen](https://javl.github.io/image2cpp/)
