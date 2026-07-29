---
title: "Elektronische Sanduhr mit ESP32 und MAX7219｜SPI-Verkabelung + 45°-Rotations-Physik-Engine-Quellcode"
boardId: esp32
moduleId: lighting/max7219-dot-matrix
category: esp32
date: 2026-07-29
intro: "Mit einem ESP32 und zwei MAX7219 8×8-Punktmatrix-Modulen Schritt für Schritt die beliebte elektronische Sanduhr nachbauen. Erklärt die Funktionsweise der 45°-Rotations-Physik-Engine, die SPI-Daisy-Chain-Verkabelung und enthält den vollständigen Arduino-C++-Quellcode samt Führer zu den typischen Stolpersteinen. Für Maker, die bereits Grundkenntnisse im Flashen mitbringen."
image: "https://img.lingflux.com/2026/07/47600d4280d7a2274f9f47a726329beb.jpg"
---

> **TL;DR (Schnellstart):**
>
> 1. Verkabelung: ESP32 `GPIO23→DIN`, `GPIO18→CLK`, `GPIO5→CS`; die zwei MAX7219-Module über `DOUT→DIN` als Daisy-Chain kaskadieren
> 2. Stromversorgung: `5V→VCC`, `GND→GND` (bitte nicht vertauschen – wenn's abraucht, sag nicht, ich hätte nicht gewarnt)
> 3. Bibliothek: Im Arduino-Bibliotheksverwalter nach `MD_MAX72xx` suchen und installieren; `SPI.h` ist eingebaut und muss nicht extra installiert werden
> 4. Nach dem Flashen beginnt die Punktmatrix automatisch mit dem „Sand rieseln" – ohne Buttons oder Sensoren läuft alles sofort

---

Schwierigkeit: ⭐⭐⭐☆☆ (funktioniert, wenn du mit der Arduino IDE schon Code geflasht hast)
Geschätzte Zeit: 40 Minuten (Verkabelung 15 Min. + Flashen & Debuggen 25 Min.)
Getestete Umgebung: Arduino IDE 2.3.8 + ESP32 Arduino Core 3.3.10 + MD_MAX72xx v3.5.1

---

## Einleitung

Wenn du im Netz eine elektronische Sanduhr siehst, bei der die Sandkörner Feld für Feld nach unten rieseln und beim Kippen von selbst kleine Schrägen bilden, juckt es dir dann auch in den Fingern? Mein erster Gedanke war auch: „Da brauchst du bestimmt ein Gyroskop und einen ganzen Haufen Physik-Formeln". Nach dem Ausprobieren hat sich aber gezeigt: Die eigentliche Hürde ist gar nicht die Hardware, sondern die Frage, wie man zwei ordentlich quadratische Punktmatrix-Module im Code dazu bringt, so zu tun, als wären sie jeweils um 45° gedreht, und zusammen die Form einer Sanduhr zu bilden. Dieser Artikel fasst die Stolpersteine, die ich erlebt habe, und die Physik-Logik, die mir dann klar wurde, zusammen. Wenn du Schritt für Schritt mitmachst, kannst du mit einem ESP32 und zwei MAX7219-Modulen ebenfalls ein elektronisches Schmuckstück auf den Tisch stellen, durch das der Sand rieselt.

## Versuchsergebnis

Nach dem Einschalten geht die Punktmatrix automatisch in eine Schleife über: Zuerst rieselt der Sand in aufrechter Position gleichmäßig, dann wird ein Kippen nach links und rechts simuliert, wobei die Sandkörner natürliche Schrägen bilden, und am Ende wird die ganze Sanduhr einmal „umgedreht", sodass sie invertiert wieder von vorn rieselt. Der gesamte Ablauf braucht keinen einzigen Button. In der aktuellen Version des Experiments kommt kein echtes Gyroskop zum Einsatz; das Kippen läuft über fest einprogrammierte Winkeldaten. Im Code steckt eine „Pseudo-Gyroskop"-Zustandsmaschine, die die Haltungen automatisch umschaltet.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/XYurztJ4_mQ?si=tlLQb6wfhkILGEFL" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Bauteile

> Mit dem Entwicklungsboard (ESP32) seid ihr vermutlich alle vertraut – dazu spare ich mir die vielen Worte und konzentriere mich auf den MAX7219.

### MAX7219 — der „Dolmetscher" der LED-Matrix

Der MAX7219 ist ein LED-Treiber-IC, das mit sehr wenigen Pins eine komplette 8×8 = 64 LEDs umfassende Punktmatrix ansteuert. In diesem Projekt übernimmt er die Aufgabe, die wenigen GPIOs des ESP32 in eine große Zeichenfläche zu „übersetzen" – sonst müsstest du 64 Leitungen ziehen, um jede LED einzeln anzusteuern, und allein der Gedanke lässt die Hände zittern.

Stell ihn dir als „Dolmetscher" vor: Der ESP32 schickt nur einfache SPI-Befehle (welche Zeile, welche Punkte leuchten sollen), und der MAX7219 kümmert sich selbst darum, per Multiplexing den Strom reihum auf die entsprechenden LEDs zu verteilen – so schnell, dass das menschliche Auge kein Flimmern wahrnimmt.

| Parameter | Wert |
| --- | --- |
| Ansteuerung | SPI (DIN/CLK/CS, drei Leitungen) |
| Angesteuerte LEDs pro Modul | 64 Stück (8×8) |
| Betriebsspannung | 4,0 V – 5,5 V |
| Kaskadierung | DOUT an den nächsten DIN, mehrere Module als Daisy-Chain |
| Helligkeit | 16 Stufen (im Code dieses Artikels: Stufe 5) |

Die Wahl fällt auf ihn, weil er günstig, weit verbreitet und von einer ausgereiften Bibliothek unterstützt wird. Zwei Module zusammen, jeweils physisch um 45° gedreht, ergeben die rautenförmige Silhouette einer Sanduhr – das Preis-Leistungs-Verhältnis ist kaum zu überbieten.

### Pin-Belegung

Die typische Pin-Belegung eines MAX7219-Moduls sieht so aus (manche Hersteller drucken die Beschriftung in anderer Reihenfolge auf – maßgeblich ist die Kennzeichnung auf der Modulrückseite):

| Pin | Funktion |
| --- | --- |
| VCC / GND | Stromversorgung, Plus und Minus |
| DIN | Dateneingang (an DOUT der vorherigen Stufe oder an den Mikrocontroller) |
| DOUT | Datenausgang (an DIN der nächsten Stufe, für Kaskadierung) |
| CS | Chip-Select-Signal |
| CLK | Taktsignal |

## Stückliste (BOM)

| Bauteil | Anzahl | Hinweise |
| --- | --- | --- |
| ESP32-Entwicklungsboard | 1 | Beliebiges Modell, Hauptsache freie GPIOs |
| MAX7219 8×8-Punktmatrix-Modul | 2 | Am besten aus derselben Charge/demselben Modell, dann stimmen Farbe und Helligkeit besser überein |
| Jumper-Kabel (Dupont) | mehrere | Empfohlen beidseitig Buchse-Buchse, dann wird die Verdrahtung zwischen den Modulen sauberer |

## Verkabelung

Texttabellen liest man leicht mal in der falschen Zeile. Am besten zuerst anhand der obigen Abbildung den Gedankengang klären und dann Kabel für Kabel an der folgenden Tabelle prüfen.

| ESP32 | Modul 1 (MAX7219 #1) | Modul 2 (MAX7219 #2) |
| --- | --- | --- |
| 5V | VCC (IN) → VCC (OUT) | ← VCC (IN) |
| GND | GND (IN) → GND (OUT) | ← GND (IN) |
| GPIO23 | DIN → DOUT | → DIN |
| GPIO5 | CS (IN) → CS (OUT) | → CS (IN) |
| GPIO18 | CLK (IN) → CLK (OUT) | → CLK (IN) |

**Tipp: Nach dem Verdrahten jede Leitung einzeln abgehen – das spart 80 % der Fehleranalyse-Zeit.** Besonders wichtig: VCC/GND nicht vertauschen und die IN/OUT-Richtung der Module nicht verwechseln – an diesen zwei Stellen muss man am häufigsten neu ansetzen.

## Benötigte Bibliotheken

Arduino IDE öffnen → Bibliotheksverwalter, die folgenden Bibliotheken suchen und installieren:

- `MD_MAX72xx` (Autor MajicDesigns, aktuellste stabile Version v3.5.1) – die Kern-Bibliothek zum Ansteuern der MAX7219-Punktmatrix
- `SPI.h` – in der Arduino IDE bereits enthalten, keine separate Installation nötig

Kleiner Hinweis: Die Bibliothek `MD_MAX72xx` bringt ein offizielles Hourglass-(Sanduhr-)Beispiel mit. Falls der Code aus diesem Artikel nicht das gewünschte Ergebnis zeigt, lohnt sich ein Vergleich mit dem Bibliotheks-Beispiel, um auszuschließen, dass `HARDWARE_TYPE` auf das falsche Modell gesetzt ist.

## Vollständiger Code + Erklärung

```cpp
/*
  ================================================================
   ESP32 doppelte 8x8 MAX7219 elektronische Sanduhr (45°-Rotations-Steckversion)
  ================================================================

  Hardware-Layout:
  ------------------------------------------------------------
  Zwei gewöhnliche 8x8 MAX7219-Punktmatrix-Module, entlang der
  Daisy-Chain über DIN->DOUT nacheinander verbunden:
     [ESP32] --DIN--> [Modul 1 (oberer Trichter)] --DOUT--> [Modul 2 (unterer Trichter)]

  Die native Adressierung von MD_MAX72XX ist "Zeile 0~7, Spalte 0~(8*Gerätezahl-1)",
  zwei Geräte liefern also von Natur aus einen Adressraum von 8 Zeilen x 16 Spalten:
     Modul 1 belegt Spalten 0~7   (nach 45°-Drehung der "oberer Trichter", Spitze bei Zeile 7, Spalte 7)
     Modul 2 belegt Spalten 8~15  (nach 45°-Drehung der "unterer Trichter", Spitze bei Zeile 0, Spalte 8)

  Beide Module werden jeweils physisch um 45° gedreht und oben/unten zusammengefügt.
  Nur das Zellenpaar (Zeile 7, Spalte 7) und (Zeile 0, Spalte 8) grenzt wirklich
  physisch aneinander – das ist der "Hals" der Sanduhr und der einzige Kanal, über
  den ein Sandkorn von einem Modul ins andere wechseln darf. Ansonsten gibt es
  zwischen Spalte 7 und Spalte 8 keinerlei physische Nachbarschaft (die beiden
  Rauten berühren sich nur in einem einzigen Punkt); im Code muss jedes weitere
  spaltenübergreifende "Teleportieren" explizit unterbunden werden.

  Physische Anschauung der Gravitationsrichtung:
  ------------------------------------------------------------
  Weil das gesamte Modul physisch um 45° gedreht wurde, verlaufen die Zeilen-
  bzw. Spaltenrichtung des Moduls selbst nicht mehr vertikal, sondern zeigen
  jeweils auf "45° unten links" bzw. "45° unten rechts" in der realen Welt. Also:
     - Beide Komponenten gleichzeitig +1 (Zeile+1 und Spalte+1) – entspricht "direkt unten" in der realen Welt
     - Nur Zeile +1 (Spalte unverändert) – entspricht "unten links" (natürliche Böschung des Sandhaufens)
     - Nur Spalte +1 (Zeile unverändert) – entspricht "unten rechts" (natürliche Böschung des Sandhaufens)
  Das ist der Ursprung des "Gravitationsvektors" und der "Seitwärts-Komponente" in
  diesem Code. Beim Umdrehen der Sanduhr (gravityDir wechselt von +1 auf -1)
  wechseln beide Komponenten gleichzeitig das Vorzeichen; die physikalische
  Bedeutung bleibt konsistent.

  Anti-Ghosting / Anti-zu-schneller Fall in einem Frame:
  ------------------------------------------------------------
  Jeder Frame durchläuft die Zellen in der Reihenfolge "gravitationsabwärts ->
  gravitationsaufwärts" rückwärts (bei gravityDir=+1 von Zeile 7, Spalte 15 nach
  Zeile 0, Spalte 0; nach dem Umdrehen umgekehrt). So wird sichergestellt:
     1) Jedes Sandkorn bewegt sich pro Frame höchstens eine Zelle weiter – keine
        wiederholte Auswertung, die zu "Teleportieren" führen würde.
     2) Ob eine Zielzelle belegt ist, wird immer am "endgültigen Zustand des
        aktuellen Frames" geprüft – kein Ghosting oder Sandverlust dadurch,
        dass zwei Körner im selben Frame dieselbe Zielzelle reklamieren.

  Pins (unverändert gemäß der bei dir funktionierenden Verkabelung):
     DATA_PIN 23 (MOSI)   CLK_PIN 18 (SCK)   CS_PIN 5 (CS)

  Gyroskop:
  ------------------------------------------------------------
  Noch ist kein echtes Gyroskop angeschlossen; dieser Code enthält eine
  "Pseudo-Gyroskop"-Zustandsmaschine (fakeGyroX / fakeGyroZ), die zeitgesteuert
  zyklisch erzeugt:
     aufrecht gleichmäßiges Rieseln -> zu einer Seite kippen -> waagerecht -> komplett umdrehen (invertiert) -> (umgekehrt nochmal von vorn)
  Sobald später ein echter Sensor wie MPU6050 angeschlossen wird, muss nur
  readRealGyro() angebunden und fakeGyroX/fakeGyroZ durch echte Winkel ersetzt
  werden – die restliche Physik-Engine bleibt unangetastet.
  ================================================================
*/

#include <MD_MAX72xx.h>
#include <SPI.h>

// ---------------- Hardware-Konfiguration ----------------
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES   2          // nur 2 8x8-Module

#define DATA_PIN  23  // VSPI MOSI
#define CLK_PIN   18  // VSPI SCK
#define CS_PIN    5   // VSPI CS0

MD_MAX72XX mx = MD_MAX72XX(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

// ---------------- Anzeige-Richtungskorrektur ----------------
// Falls nach dem Ansteuern auffällt, dass "die Anzeige kopfsteht" oder "die
// beiden Module seitenverkehrt verbaut sind", genügt es, diese beiden Makros
// anzupassen – die Physik unten muss dafür nicht angerührt werden.
#define FLIP_ROW           true   // Zeilenrichtung umdrehen? (7-row)
#define SWAP_MODULE_ORDER  false  // Falls Modul 2 vor Modul 1 in der Daisy-Chain hängt, auf true setzen

// ---------------- Logisches Gitter ----------------
#define ROWS 8
#define COLS 16
// Hals: Modul-1-Ausgang (7,7) <-> Modul-2-Eingang (0,8)
#define NECK_A_R 7
#define NECK_A_C 7
#define NECK_B_R 0
#define NECK_B_C 8

bool sand[ROWS][COLS];

// ---------------- Physik-Engine-Parameter ----------------
#define SAND_TOTAL        42     // Gesamtzahl der Sandkörner, nach optischem Geschmack justierbar (empfohlen 30~50)
#define TICK_MS           130    // Physik-Schrittweite (ms), je kleiner, desto schneller fließt der Sand.
                                  // Bei ca. 130 ms sieht man mit bloßem Auge klar, wie die Körner Feld für Feld
                                  // fallen, und am Hals entsteht von Natur aus je eine freie Zelle zwischen
                                  // den fallenden Körnern (man sieht gleichzeitig 2~3 Punkte im Abstand fallen).
                                  // Wenn es noch zu schnell wirkt, weiter vergrößern (empfohlener Bereich 100~180).
const float LATERAL_FRICTION = 0.85f;  // "Reibung" beim Seitwärtsrutschen: nicht jeder Frame rutscht – erzeugt natürliche Pausen

int   gravityDir  = 1;     // +1 = aufrecht (Modul 1 -> Modul 2)   -1 = invertiert (Modul 2 -> Modul 1)
float targetBias  = 0.0f;  // Ziel-Kippbias [-1,1]
float currentBias = 0.0f;  // geglätteter aktueller Kippbias (nähert sich langsam targetBias an, um Sprünge zu vermeiden)

unsigned long lastTickMs = 0;

// ================================================================
//                        Sandkorn-Physik-Engine
// ================================================================

inline int moduleOf(int c) { return (c < 8) ? 1 : 2; }

// Handelt es sich um einen gültigen Hals-Übergang? (das einzige erlaubte Zellenpaar modulübergreifend, in beide Richtungen)
inline bool isNeckPair(int r, int c, int nr, int nc) {
  if (r == NECK_A_R && c == NECK_A_C && nr == NECK_B_R && nc == NECK_B_C) return true;
  if (r == NECK_B_R && c == NECK_B_C && nr == NECK_A_R && nc == NECK_A_C) return true;
  return false;
}

inline bool canMove(int r, int c, int nr, int nc) {
  if (nr < 0 || nr > 7 || nc < 0 || nc > 15) return false;   // außerhalb des Gitters
  if (sand[nr][nc]) return false;                             // Ziel bereits belegt
  if (moduleOf(c) != moduleOf(nc)) {                          // modulübergreifend?
    if (!isNeckPair(r, c, nr, nc)) return false;              // nur am Hals erlaubt
  }
  return true;
}

inline bool tryMove(int r, int c, int nr, int nc) {
  if (!canMove(r, c, nr, nc)) return false;
  sand[r][c]   = false;
  sand[nr][nc] = true;
  return true;
}

// Berechnet die Zielzelle "direkt unten" (Haupt-Gravitationsrichtung).
// Wichtig: An der Hals-Spitze würde (Zeile+g, Spalte+g) sofort außerhalb
// des Gitters landen (z. B. 7+1=8, außerhalb von 0~7) – dann muss explizit
// auf die gegenüberliegende Hals-Zelle umgelenkt werden, sonst bleibt das
// Sandkorn an der Spitze stecken und kann nicht durch den Hals wechseln.
inline void primaryTarget(int r, int c, int g, int &nr, int &nc) {
  if (g == 1  && r == NECK_A_R && c == NECK_A_C) { nr = NECK_B_R; nc = NECK_B_C; return; }
  if (g == -1 && r == NECK_B_R && c == NECK_B_C) { nr = NECK_A_R; nc = NECK_A_C; return; }
  nr = r + g;
  nc = c + g;
}

float random01() { return random(0, 10001) / 10000.0f; }

// Entscheidungsschritt für ein einzelnes Sandkorn: zuerst "direkt unten" versuchen;
// wenn blockiert, entsprechend dem Kippbias nach unten links/rechts seitwärts rutschen
void moveGrain(int r, int c) {
  int g = gravityDir;
  int pnr, pnc;
  primaryTarget(r, c, g, pnr, pnc);

  // Je stärker die Neigung, desto eher wird "direkt unten übersprungen und gleich
  // seitwärts gerutscht" – simuliert die Verlagerung der realen Gravitationskomponente
  bool primaryFirst = random01() < (1.0f - fabsf(currentBias) * 0.6f);

  if (primaryFirst) {
    if (tryMove(r, c, pnr, pnc)) return;
  }

  // Seitwärts: Komponente A (nur Zeilenrichtung) / Komponente B (nur Spaltenrichtung);
  // die Reihenfolge der Versuche wird durch den Bias bestimmt
  if (random01() < LATERAL_FRICTION) {
    bool aFirst = random01() < (0.5f - currentBias * 0.5f);
    int arn = r + g, acn = c;      // Komponente A: unten links (oder unten rechts, je nach Drehrichtung)
    int brn = r,     bcn = c + g;  // Komponente B: die jeweils andere Seite

    if (aFirst) {
      if (tryMove(r, c, arn, acn)) return;
      if (tryMove(r, c, brn, bcn)) return;
    } else {
      if (tryMove(r, c, brn, bcn)) return;
      if (tryMove(r, c, arn, acn)) return;
    }
  }

  // Fallback: Falls wegen des Bias der Versuch "direkt unten" übersprungen wurde,
  // hier noch einmal nachholen. So ist sichergestellt, dass das Korn letztlich
  // immer fällt, sobald "direkt unten" wirklich frei ist (kein Festhängen in der Bias-Logik)
  if (!primaryFirst) {
    tryMove(r, c, pnr, pnc);
  }
}

// Ein kompletter Frame: Scan entgegen der Richtung "gravitationsabwärts -> aufwärts",
// gegen Ghosting / zu schnelles Fallen
void updateSand() {
  int rStart, rEnd, rStep, cStart, cEnd, cStep;
  if (gravityDir == 1) {
    // Abwärts = große Zeile und große Spalte -> von (7,15) nach (0,0) scannen
    rStart = 7; rEnd = -1; rStep = -1;
    cStart = 15; cEnd = -1; cStep = -1;
  } else {
    // Nach Umdrehen: Abwärts = kleine Zeile und kleine Spalte -> von (0,0) nach (7,15) scannen
    rStart = 0; rEnd = 8; rStep = 1;
    cStart = 0; cEnd = 16; cStep = 1;
  }

  for (int r = rStart; r != rEnd; r += rStep) {
    for (int c = cStart; c != cEnd; c += cStep) {
      if (sand[r][c]) moveGrain(r, c);
    }
  }

  // Bias geglättet an den Zielwert annähern, damit Kippen/Waagerechtstellen weicher und nicht ruckartig wirken
  currentBias += (targetBias - currentBias) * 0.05f;
}

void initHourglass() {
  memset(sand, 0, sizeof(sand));
  int placed = 0;
  // Beim Start ist die erste Phase "von oben nach unten rieseln" mit dir=-1 (Modul 2 -> Modul 1),
  // deshalb kommen die anfänglichen Sandkörner in Modul 2 (Spalten 8~15).
  // Die Füllung ist die Spiegelung der ursprünglichen "Modul-1-Füllung" an (r,c)->(7-r,15-c)
  // und zur gedrehten Physik vollständig symmetrisch – beim Start steht das System sofort
  // im richtigen Zustand "oben voll Sand, rieselt nach unten".
  for (int r = ROWS - 1; r >= 0 && placed < SAND_TOTAL; r--) {
    for (int c = 15; c >= 8 && placed < SAND_TOTAL; c--) {   // nur Modul 2 füllen
      sand[r][c] = true;
      placed++;
    }
  }
}

// ================================================================
//                    Pseudo-Gyroskop-Zustandsmaschine
//                    (verwendet, solange kein echter Sensor vorhanden)
// ================================================================
struct GyroPhase {
  unsigned long durationMs;
  int8_t        dir;      // Gravitationsrichtung in dieser Phase
  float         bias;     // Ziel-Kippbias dieser Phase
  const char*   name;
  float         gx, gz;   // simulierte Gyroskop-/Beschleunigungsmesser-Werte, nur für die serielle Debug-Ausgabe
};

GyroPhase phases[] = {
  // —— Phase 1: von oben nach unten (dir=-1, Modul 2 -> Modul 1) ——
  { 16000, -1,  0.00f, "UPRIGHT_POUR(invertiert) gleichmäßiges Rieseln aufrecht",  0.0f, -1.0f },
  {  4000, -1,  0.85f, "TILT_RIGHT     nach rechts kippen",          0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          waagerecht",              0.0f, -1.0f },
  {  4000, -1, -0.85f, "TILT_LEFT      nach links kippen",         -0.6f, -0.8f },
  {  2500, -1,  0.00f, "LEVEL          waagerecht",              0.0f, -1.0f },
  {  1400,  1,  0.00f, "FLIP           komplett umdrehen",      0.0f,  0.2f },
  // —— Phase 2: von unten nach oben (dir=+1, Modul 1 -> Modul 2) ——
  { 16000,  1,  0.00f, "UPRIGHT_POUR   gleichmäßiges Rieseln aufrecht",     0.0f,  1.0f },
  {  4000,  1,  0.85f, "TILT_RIGHT     nach rechts kippen",          0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          waagerecht",              0.0f,  1.0f },
  {  4000,  1, -0.85f, "TILT_LEFT      nach links kippen",         -0.6f,  0.8f },
  {  2500,  1,  0.00f, "LEVEL          waagerecht",              0.0f,  1.0f },
  { 1400, -1,  0.00f, "FLIP           komplett umdrehen",      0.0f, -0.2f },
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
//                          Auf Punktmatrix rendern
// ================================================================
void render() {
  mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::OFF);   // Auto-Refresh deaktivieren, erst nach dem kompletten Frame gemeinsam aktualisieren – verhindert Flackern
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
//                             Hauptprogramm
// ================================================================
void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  mx.begin();
  mx.control(MD_MAX72XX::INTENSITY, 5);   // Helligkeit 0~15, frei einstellbar
  mx.clear();

  initHourglass();

  phaseIndex = 0;
  phaseStartMs = millis();
  gravityDir = phases[0].dir;
  targetBias = phases[0].bias;
  currentBias = 0;

  lastTickMs = millis();

  Serial.println("=== ESP32 doppelte 8x8 MAX7219 elektronische Sanduhr – Start ===");
  Serial.print("[GYRO STATE] -> ");
  Serial.println(phases[0].name);
}

void loop() {
  unsigned long now = millis();

  updateFakeGyro();     // Zustandsmaschine / Pseudo-Gyroskop antreiben

  if (now - lastTickMs >= TICK_MS) {
    lastTickMs = now;
    updateSand();        // einen Frame Physik berechnen
    render();             // auf die Punktmatrix ausgeben
  }
}
```

### Code-Erklärung

Der Code wirkt lang, zerlegt sich aber in drei Blöcke:

**Schritt 1: Die beiden Punktmatrix-Module zu einem Sanduhr-Koordinatensystem „zusammenfügen".** `MD_MAX72XX` betrachtet die beiden Module von Haus aus als ein großes Gitter aus 8 Zeilen × 16 Spalten, aber physisch sind die beiden Module jeweils um 45° gedreht und dann zusammengefügt – nur das Zellenpaar `(7,7)` und `(0,8)` grenzt wirklich aneinander. Das ist der über `NECK_A / NECK_B` definierte „Hals der Sanduhr", und `isNeckPair()` ist genau die Wache an dieser Tür: Sie lässt Sandkörner nicht anderswo modulübergreifend „abkürzen".

**Schritt 2: Die Sandkörner dafür bringen, ordentlich Feld für Feld zu fallen.** `moveGrain()` versucht immer zuerst die Zelle „direkt unten"; erst wenn sie blockiert ist, wird entsprechend dem aktuellen Kippwinkel seitwärts gerutscht. `updateSand()` hingegen durchläuft das ganze Gitter streng in der Reihenfolge „zuerst abwärts", damit sich nicht zwei Körner im selben Frame um dieselbe Zelle streiten. Das ist der lesenswerteste Teil des gesamten Codes: Mit einer sehr schlichten Regel (erst nach unten, dann seitwärts, mit einem Fallback) wird eine scheinbar komplizierte Physik reproduziert – dass ein Sandhaufen von selbst eine natürliche Böschung bildet.

**Schritt 3: Der Pseudo-Gyroskop-Zustandsmaschine die Parameter „eintrichtern".** Das Array `phases[]` hält eine komplette Abfolge von Haltungen bereit (aufrecht, gekippt, waagerecht, umgedreht); `updateFakeGyro()` ist lediglich ein Timer, der nach Ablauf der Zeit in die nächste Phase wechselt und dabei `gravityDir` und `targetBias` anpasst. Sobald später ein echtes Gyroskop angeschlossen ist, genügt es, diese beiden Variablen durch die vom Sensor berechneten Echtzeit-Winkel zu ersetzen – die Physik-Engine bleibt komplett unangetastet.

## Häufige Probleme

Keine Panik – 90 % aller Probleme liegen an einer der folgenden Stellen:

**Die Punktmatrix bleibt komplett dunkel**
Zuerst prüfen, ob VCC/GND vertauscht oder lose sind, dann sicherstellen, dass `DATA_PIN`/`CLK_PIN`/`CS_PIN` mit der tatsächlichen Verkabelung übereinstimmen (in diesem Artikel default 23/18/5).

**Das Bild steht kopf, oder die beiden Module sind seitenverkehrt verbaut**
Kein Neuverkabeln nötig: einfach die Makros `FLIP_ROW` bzw. `SWAP_MODULE_ORDER` im Code anpassen und neu flashen.

**Die Sandkörner „verschmieren" zu einem Block, alles passiert zu schnell, um es zu erkennen**
`TICK_MS` vom Default 130 auf 150–180 erhöhen – die Fließgeschwindigkeit nimmt spürbar ab und das Geschehen wirkt körniger.

**Beim Kompilieren wird `MD_MAX72xx.h` nicht gefunden**
Die Bibliothek wurde nicht richtig installiert – im Bibliotheksverwalter erneut nach `MD_MAX72xx` suchen und installieren (auf Groß-/Kleinschreibung und Schreibweise achten).

**Sandkörner bleiben am Hals stecken (Zeile 7, Spalte 7 oder Zeile 0, Spalte 8) und fallen nicht weiter**
Sehr wahrscheinlich ist `HARDWARE_TYPE` auf das falsche Modell gesetzt. MAX7219-Module gibt es in mehreren Varianten wie `FC16_HW`, `GENERIC_HW`, `PAROLA_HW` usw. – wenn die Verkabelung stimmt, die Anzeige aber falsch aussieht, diese der Reihe nach ausprobieren.

**Nach dem Einschalten gibt es Bildfehler oder gelegentliche Abstürze/Neustarts**
Prüfen, ob die Jumper-Kabel fest sitzen – besonders bei Steckbrett-/langen-Kabel-Aufbauten; die Leitungen der Daisy-Chain sollten möglichst kurz gehalten werden.

## FAQ – Fragen & Antworten

**F: Muss der ESP32 für den MAX7219 unbedingt die Pins GPIO23/18/5 verwenden?**
A: Nein. Der Code in diesem Artikel verwendet software-seitiges SPI (dem Konstruktor werden direkt die drei Pins DATA/CLK/CS übergeben) – für andere freie GPIOs müssen nur die drei `#define` angepasst werden; es besteht keine Bindung an die Hardware-SPI-Pins.

**F: Wie viele MAX7219-Module lassen sich maximal kaskadieren?**
A: Der Chip selbst unterstützt im Prinzip einige Dutzend Module in Reihe; in der Praxis sind es die Bildwiederholrate und die Signalintegrität, die den Rahmen setzen – in typischen Projekten laufen 4–8 Module stabil. In diesem Artikel werden 2 verwendet; man muss lediglich `MAX_DEVICES` entsprechend setzen und die Daisy-Chain anschließen.

**F: Welcher `HARDWARE_TYPE` ist der richtige?**
A: Hängt von der internen Verdrahtung des gekauften Moduls ab; die zwei häufigsten sind `FC16_HW` und `GENERIC_HW`. Eine falsche Wahl zerstört keine Hardware – die Anzeige wirkt lediglich verschoben oder gespiegelt. Verkabelung unverändert lassen, nur dieses eine Makro anpassen und neu flashen.

**F: Warum zeigt die Punktmatrix durchgehend Zeichensalat oder gar nichts an?**
A: Zuerst im Seriellen Monitor prüfen, ob `[GYRO STATE]`-Logs ausgegeben werden. Tauchen sie auf, läuft das Programm – das Problem liegt beim Anzeige-Mapping (`FLIP_ROW`/`SWAP_MODULE_ORDER`/`HARDWARE_TYPE`). Fehlen die Logs, ist der Code nicht am Laufen; Stromversorgung und erfolgreichen Flash-Vorgang kontrollieren.

**F: Kann man die Sanduhr mit einem echten Gyroskop zu einer „kippempfindlichen" Version ausbauen?**
A: Ja, im Code ist dafür eine Schnittstelle vorgesehen. Einen Sensor wie MPU6050 ergänzen, nach dem Auslesen des Echtzeit-Kippwinkels die Zuweisungen an `gravityDir` und `targetBias` in `updateFakeGyro()` ersetzen – an der Physik-Engine muss nichts geändert werden.

**F: Wie hoch ist die Leistungsaufnahme der gesamten Anordnung, und reicht eine Powerbank?**
A: Bei zwei 8×8-Modulen und mittlerer Helligkeit (im Code Default Stufe 5) liegt der Gesamtstrom üblicherweise im Bereich von einigen hundert Milliampere; eine Powerbank oder ein Handy-Netzteil mit 5 V/1 A Ausgang reicht grundsätzlich aus. Wer die Helligkeit erhöht oder später weitere Module ergänzt, sollte auf ein Netzteil mit höherer Stromstärke wechseln, um den 5-V-Pin des ESP32 nicht dauerhaft zu überlasten.

## Weiterführende Ideen

- Ein echtes MPU6050-Gyroskop anschließen, sodass die Sanduhr dem Kippen der Hand wirklich folgt – Schluss mit dem Skript des „Pseudo-Gyroskops"
- Mehrere MAX7219-Module zu einer größeren Punktmatrix zusammensetzen und einfache Animationen oder Lauftexte abspielen
- Einen Summer ergänzen, der ertönt, sobald der Sand vollständig durchgelaufen ist – so entsteht ein echter, nutzbarer Timer
- Taster für Pause/manuelles Umdrehen hinzufügen, anstatt auf die automatische Umschaltung der Zustandsmaschine zu warten

## Referenzen

- [MAX7219/MAX7221 offizielles Datenblatt (Analog Devices / Maxim Integrated)](https://www.analog.com/media/en/technical-documentation/data-sheets/max7219-max7221.pdf)
- [MD_MAX72xx Open-Source-Bibliothek auf GitHub](https://github.com/MajicDesigns/MD_MAX72XX) (die Bibliothek bringt ein offizielles Hourglass-Beispiel mit, gut zum Vergleich bei der Fehlersuche)
- Offizielle ESP32-Produkt- und Pin-Dokumentation (Espressif-Website)
