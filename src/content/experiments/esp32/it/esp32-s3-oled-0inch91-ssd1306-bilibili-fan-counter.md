---
title: "ESP32-S3 + OLED 0,91\" per un contatore follower Bilibili da scrivania «soddisfacente»｜con animazione fisica a molla smorzata"
boardId: esp32s3
moduleId: display/oled091-ssd1306
category: esp32
date: 2026-06-27
intro: "Con ESP32-S3 e un OLED SSD1306 da 0,91\" (128×32) realizza un contatore follower Bilibili da scrivania, con un'animazione fluida di rimbalzo a molla smorzata quando il numero cambia. Cablaggio I2C a 4 fili + codice completo in Arduino C++, con guida agli errori comuni."
image: "https://img.lingflux.com/2026/06/e53fb5a7bdaee8448584fb9f21aa504d.jpg"
---

> **In breve:** ESP32-S3 + OLED 0,91" + API di Bilibili per un contatore follower da scrivania che «rimbalza a molla smorzata»: addio al tirare fuori il telefono ogni momento per controllare i numeri.

# ESP32-S3 + OLED 0,91" per un contatore follower Bilibili da scrivania «soddisfacente» (con animazione fisica a molla smorzata!)

Difficoltà: ⭐⭐☆☆☆ (adatto ai principianti)
Tempo stimato: 30 minuti
Ambiente di test: Arduino IDE 2.3.8 + pacchetto di supporto schede ESP32 v3.3.10 + U8g2 v2.36.19 + ArduinoJson v7.4.3

> **TL;DR (avvio rapido):**
>
> 1. Cablaggio: ESP32-S3 GPIO 14 → OLED SDA, GPIO 13 → OLED SCL, poi collega 3,3V e GND.
> 2. Verifica: assicurati che lo schermo sia alimentato correttamente e che i pin I2C non siano invertiti.
> 3. Installa le librerie: in Arduino IDE cerca e installa `U8g2` (autore: oliver) e `ArduinoJson` (autore: Benoit Blanchon).
> 4. Modifica la configurazione: nel codice completo inserisci le credenziali Wi-Fi e l'UID Bilibili, carica lo sketch e attendi che il numero di follower appaia sullo schermo con una fluida animazione meccanica di rimbalzo!

---

## Introduzione

Con questo piccolo schermo OLED ho realizzato un contatore follower Bilibili da scrivania, un piccolo progetto magneticamente soddisfacente! Non dovrai più aprire il telefono per controllare i numeri.

---

## Risultato finale

Il risultato finale è un'elegante disposizione rifinita in tre sezioni: sulla sinistra l'etichetta verticale «FANS» con la freccia meccanica indicatrice; al centro l'anima di questo esperimento — il grande contatore a cifre **con animazione fisica a molla smorzata**, alto 24 pixel, in grassetto e solo numeri, con una finestra di ritaglio locale; sulla destra l'incremento giornaliero dei follower (calcolato automaticamente con triangoli su/giù) e l'indicatore della potenza del segnale Wi-Fi con il lampeggio di heartbeat.

![](https://img.lingflux.com/2026/06/13648c6923d1cb24486cb082105d8d59.jpg)

---

## Descrizione del componente

### Schermo OLED 0,91" (SSD1306)

Oltre alla scheda di sviluppo principale (ESP32-S3), il componente chiave di questo progetto è lo **schermo OLED da 0,91"**.

Lo schermo OLED da 0,91" è una sorta di «interprete simultaneo che si illumina da sé»: traduce in tempo reale i numeri dei follower che l'ESP32-S3 recupera dalla rete in una matrice di pixel visibile a occhio nudo. Poiché ogni pixel emette luce propria, non ha bisogno del spesso pannello retroilluminato dei classici LCD: il contrasto è altissimo, con un nero profondo e un bianco accecante. Lo abbiamo scelto per le sue dimensioni estremamente compatte, il prezzo accessibile e il fatto che, tramite I2C, si pilota con soli 4 fili: perfetto per un piccolo e curato oggetto da scrivania.

| Parametro chiave | Valore |
| --- | --- |
| Driver | SSD1306 |
| Risoluzione | 128 x 32 pixel |
| Interfaccia di comunicazione | I2C (IIC) |
| Tensione di lavoro | 3,3V ~ 5V |
| Colore di visualizzazione | in genere bianco puro o blu puro |

---

## Lista dei materiali (BOM)

| Componente | Specifica/modello | Quantità | Utilizzo |
| --- | --- | --- | --- |
| Scheda di sviluppo ESP32-S3 | qualsiasi versione standard con doppia interfaccia Type-C | 1 | centro di controllo: recupera i dati dalla rete e calcola l'animazione fisica |
| Modulo OLED 0,91" | driver SSD1306 / interfaccia I2C a 4 pin | 1 | visualizzazione grafica e rendering dell'animazione con finestra fisica |
| Cavetti Dupont | femmina-femmina / maschio-femmina (in base alla scheda) | 4 | collegamento dei pin tra scheda e schermo |

---

## Pin e collegamenti

> 💡 **Suggerimento pratico:** dopo aver completato il cablaggio, verifica ogni collegamento contro la tabella seguente. Di norma l'80% dei problemi di schermo muto, nero o di dispositivo che si surriscalda dipende da un collegamento errato: 10 secondi di verifica ti fanno risparmiare un sacco di tempo di troubleshooting!

| Pin schermo OLED | Pin ESP32-S3 | Descrizione funzione pin |
| --- | --- | --- |
| GND | GND | massa (la linea di riferimento che parla la stessa lingua) |
| VCC | 3,3V (o 3V3) | alimentazione di ingresso |
| SCL | GPIO 13 | linea del clock I2C |
| SDA | GPIO 14 | linea dei dati I2C |

---

## Librerie necessarie

In Arduino IDE 2.x clicca sull'icona del «Library Manager» sulla sinistra (oppure premi `Ctrl+Shift+I`) e cerca/installa le seguenti librerie open source nelle versioni indicate, già testate con successo:

1. **U8g2** (autore: oliver) — versione testata: `v2.36.19` o superiore. Pilota lo schermo OLED e supporta finestre di ritaglio di precisione (Clip Window).
2. **ArduinoJson** (autore: Benoit Blanchon) — versione testata: `v7.4.3`. Analizza i dati JSON restituiti dall'API di Bilibili.

---

## Codice completo + spiegazione

Copia il codice completo seguente in Arduino IDE. Prima di caricarlo, **ricordati di modificare `const char* ssid` e `password` con le credenziali del tuo Wi-Fi e di sostituire `uid` con l'UID dell'utente Bilibili che vuoi monitorare**.

```cpp
/**
 * =========================================================================
 * ESP32-S3 0.91" OLED (128x32 SSD1306) Display follower Bilibili - versione Deluxe
 * =========================================================================
 * Funzioni: elegante layout a tre sezioni + autentico motore di animazione fisica a molla smorzata
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Preferences.h>
#include <time.h>

// ================== Interruttori di debug ==================
#define DEBUG_SIMULATE   0     // [IMPORTANTE] 1=attiva dati simulati (prova l'animazione senza rete), 0=usa la vera API
#define SIM_INTERVAL_MS  2000  // Intervallo di variazione dati simulati (ms)
#define SIM_START_VALUE  9985  // Numero follower iniziale simulato (imposta 9985 per vedere subito l'effetto del salto a 5 cifre)

// ================== Configurazione utente ==================
const char* ssid     = "YOUR_WIFI_SSID";      // Inserisci il nome della tua rete Wi-Fi
const char* password = "YOUR_WIFI_PASSWORD";  // Inserisci la password del tuo Wi-Fi
const char* uid      = "YOUR_BILIBILI_UID";   // Inserisci l'UID Bilibili che vuoi monitorare

String biliApiUrl = "https://api.bilibili.com/x/relation/stat?vmid=" + String(uid);
const unsigned long FETCH_INTERVAL = 30 * 60 * 1000; // Aggiorna i dati dalla rete ogni 30 minuti

#define OLED_SDA 14
#define OLED_SCL 13
#define SCREEN_CONTRAST 255

// Parametri animazione
#define SCROLL_EASING    0.18f   // Coefficiente base della forza di trazione della molla
#define ANIM_FPS         60      // Frame rate animazione
#define ANIM_INTERVAL    (1000/ANIM_FPS)

// Inizializza il costruttore U8g2
U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

// ================== Variabili di stato ==================
long targetFollowers = 0;
long todayBaseFollowers = 0;
long todayAdded = 0;
bool isInitialFetch = true;
bool connectionError = false;

unsigned long lastFetchTime = 0;
unsigned long lastAnimTime = 0;
unsigned long lastSimTime = 0;

Preferences preferences; // Salva in modo sicuro il numero follower di base del giorno in Flash, preservandolo anche senza alimentazione

// ================== Motore centrale di vibrazione a smorzamento fisico ==================
#define MAX_DIGITS 7

class DigitWheel {
public:
  float currentY = 0.0f;
  int   targetDigit = 0;
  float velocity = 0.0f;  // Variabile di velocità centrale della molla smorzata

  void update(float easing) {
    float diff = (float)targetDigit - currentY;

    // Principio del percorso più corto per lo scorrimento ciclico (0 <-> 9)
    if (diff > 5.0f)  diff -= 10.0f;
    if (diff < -5.0f) diff += 10.0f;

    if (fabs(diff) > 0.005f) {
      // Modello fisico classico: legge di Hooke + smorzamento viscoso, da cui deriva il fluido rimbalzo e l'oscillazione smorzata
      float accel = diff * easing - velocity * 0.25f;
      velocity += accel;
      currentY += velocity;

      // Vincolo di range ciclico
      while (currentY >= 10.0f) currentY -= 10.0f;
      while (currentY < 0.0f)   currentY += 10.0f;
    } else {
      currentY = (float)targetDigit;
      velocity = 0.0f; // Fermata stabile
    }
  }
};

DigitWheel wheels[MAX_DIGITS];

// Dichiarazione anticipata
void drawUI();
void drawLeftPanel();
void drawBigOdometer();
void drawRightPanel();
void drawWifiIcon(int x, int y);
void fetchBiliData();
void checkNewDayReset();

// ================== Inizializzazione ==================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Bilibili OLED Monitor Deluxe ===");

  Wire.begin(OLED_SDA, OLED_SCL);
  u8g2.begin();
  u8g2.setContrast(SCREEN_CONTRAST);
  u8g2.enableUTF8Print();

  // Primo passo: disegna un'elegante schermata di avvio
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
    todayBaseFollowers = targetFollowers - 10; // Predispone un incremento di 10 nella giornata
  }
  todayAdded = targetFollowers - todayBaseFollowers;
  isInitialFetch = false;
#else
  // Secondo passo: connessione alla rete Wi-Fi locale
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
    // Terzo passo: configura il servizio orario per il reset automatico a mezzanotte
    configTime(8 * 3600, 0, "ntp.aliyun.com", "time.windows.com");
    fetchBiliData();
  } else {
    Serial.println("\nWiFi failed");
    connectionError = true;
    targetFollowers = 0;
  }
#endif
}

// ================== Loop principale ==================
void loop() {
  unsigned long now = millis();

#if DEBUG_SIMULATE
  // Logica dati simulati: salti regolari, utili per osservare la dinamica affascinante del rimbalzo simultaneo di più cifre
  if (now - lastSimTime >= SIM_INTERVAL_MS) {
    lastSimTime = now;
    int delta = random(-2, 6); // Genera un incremento oscillante casuale tra -2 e +5
    targetFollowers += delta;
    if (targetFollowers < 0) targetFollowers = 0;
    todayAdded = targetFollowers - todayBaseFollowers;
    Serial.printf("[SIM] target=%ld (delta=%+d) today=%+ld\n", targetFollowers, delta, todayAdded);
  }
#else
  // Recupero periodico dei veri dati di rete
  if (now - lastFetchTime >= FETCH_INTERVAL || lastFetchTime == 0) {
    fetchBiliData();
    lastFetchTime = now;
  }
  checkNewDayReset();
#endif

  // Quarto passo: refresh centrale dell'animazione (running stabile a 60FPS a pieno frame)
  if (now - lastAnimTime >= ANIM_INTERVAL) {
    lastAnimTime = now;

    // Analizza il numero totale di follower e lo assegna al target della singola ruota per ogni cifra
    long temp = targetFollowers;
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      wheels[i].targetDigit = temp % 10;
      temp /= 10;
    }

    // Aggiorna il motore fisico, fondendo un ritardo a cascata sulle cifre più alte per dare al movimento una ricca sensazione di stratificazione sfalsata
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      float ease = SCROLL_EASING * (1.0f - i * 0.012f);
      if (ease < 0.07f) ease = 0.07f;
      wheels[i].update(ease);
    }

    // Quinto passo: rendering sull'intero canvas
    u8g2.clearBuffer();
    drawUI();
    u8g2.sendBuffer();
  }
}

// ================== Disegno layout UI (design classico a tre sezioni) ==================
void drawUI() {
  drawLeftPanel();    // Etichetta verticale a sinistra
  drawBigOdometer();  // Cifre grandi a ruota fisica al centro
  drawRightPanel();   // Incremento e segnale sulla destra
}

void drawLeftPanel() {
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(2, 7,  "F");
  u8g2.drawStr(2, 14, "A");
  u8g2.drawStr(2, 21, "N");
  u8g2.drawStr(2, 28, "S");

  u8g2.drawVLine(9, 2, 28); // Linea di separazione verticale
  u8g2.drawTriangle(11, 14, 11, 18, 14, 16); // Freccia meccanica verso le cifre grandi
}

void drawRightPanel() {
  int rx = 102; // Inizio asse X del pannello di destra
  u8g2.drawVLine(rx - 2, 2, 28); // Linea di separazione destra

  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(rx, 6, "TODAY");

  u8g2.setFont(u8g2_font_5x7_tr);
  char buf[8];
  if (todayAdded >= 0) {
    u8g2.drawTriangle(rx, 14, rx + 4, 14, rx + 2, 10); // Triangolo verso l'alto
    snprintf(buf, sizeof(buf), "%ld", todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  } else {
    u8g2.drawTriangle(rx, 10, rx + 4, 10, rx + 2, 14); // Triangolo verso il basso
    snprintf(buf, sizeof(buf), "%ld", -todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  }

  u8g2.setFont(u8g2_font_4x6_tr);
#if DEBUG_SIMULATE
  u8g2.drawStr(rx, 24, "SIM");
  if ((millis() / 400) % 2) u8g2.drawDisc(rx + 17, 22, 1); // Lampeggio heartbeat simulato
#else
  if (connectionError) {
    u8g2.drawStr(rx, 24, "ERR");
  } else {
    u8g2.drawStr(rx, 24, "ON");
  }
#endif

  drawWifiIcon(rx + 12, 27); // Disegna le barre di segnale
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

// ================== Rendering centrale della ruota (con finestra Clip locale di precisione) ==================
void drawBigOdometer() {
  u8g2.setFont(u8g2_font_logisoso24_tn); // Cifre enormi e dure in grassetto, alte 24 pixel

  int charW = 14;      // Larghezza di una singola cifra
  int areaTop = 4;     // Bordo superiore della finestra di scorrimento
  int areaBot = 28;    // Bordo inferiore della finestra di scorrimento
  int areaH = areaBot - areaTop; // Altezza utile della finestra (24px)
  int baseline = areaBot;        // Altezza della linea di base del font

  // Calcola dinamicamente il numero di cifre valide per un allineamento centrale adattivo perfetto verso sinistra
  long absVal = targetFollowers;
  int needDigits = 1;
  long t = absVal;
  while (t >= 10) { t /= 10; needDigits++; }
  if (needDigits > MAX_DIGITS) needDigits = MAX_DIGITS;

  int totalW = needDigits * charW;
  int startX = 14 + (88 - totalW) / 2;
  if (startX < 14) startX = 14;

  // Rendering cifra per cifra con feedback di rimbalzo fisico
  for (int idx = 0; idx < needDigits; idx++) {
    int wheelIdx = MAX_DIGITS - needDigits + idx;
    int x = startX + idx * charW;

    float currYVal = wheels[wheelIdx].currentY;
    int digitLower = (int)currYVal;
    int digitUpper = (digitLower + 1) % 10;
    float fraction = currYVal - digitLower;

    // [Controllo di ritaglio centrale]: imposta per la cifra corrente una finestra di ritaglio locale in modo che, quando la cifra fuoriesce dal bordo superiore o inferiore, scompaia automaticamente
    u8g2.setClipWindow(x - 1, areaTop, x + charW, areaBot);

    // La cifra corrente scorre verso l'alto, tirata dalla forza
    int yLower = baseline - (int)(fraction * areaH);
    char bufL[2] = { (char)('0' + digitLower), 0 };
    u8g2.drawStr(x, yLower, bufL);

    // La nuova cifra successiva irrompe nella finestra dal basso e, giunta a destinazione, produce un rimbalzo ricco di energia cinetica
    int yUpper = baseline + areaH - (int)(fraction * areaH);
    char bufU[2] = { (char)('0' + digitUpper), 0 };
    u8g2.drawStr(x, yUpper, bufU);

    u8g2.setMaxClipWindow(); // Subito dopo aver renderizzato la cifra corrente, ripristina subito il canvas a tutto schermo
  }
}

// ================== Recupero dati di rete ==================
#if !DEBUG_SIMULATE
void fetchBiliData() {
  if (WiFi.status() != WL_CONNECTED) {
    connectionError = true;
    return;
  }
  Serial.println("Requesting Bilibili API...");
  WiFiClientSecure client;
  client.setInsecure(); // Ignora la verifica stringente del certificato SSL per garantire una connessione leggera
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
  // A mezzanotte precisa si attiva il refresh del valore base della giornata
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

### Spiegazione dei passaggi chiave

1. **Disegno della schermata di avvio**: in `setup()` si richiama `u8g2.drawStr()` per disegnare il logo animato iniziale e fornire al sistema un buffer visivo.
2. **Inizializzazione di Wi-Fi e orario**: si richiama `WiFi.begin()` per connettersi alla rete e, tramite `configTime()`, si aggancia il server NTP di Aliyun per rilevare con precisione l'arrivo della mezzanotte locale.
3. **Camuffamento della richiesta dati**: con `http.setUserAgent()` e `addHeader("Referer", ...)` l'ESP32 si finge un normale browser desktop, evitando di essere bloccato dai meccanismi anti-scraping di Bilibili.
4. **Iterazione fisica a molla smorzata**: in `DigitWheel::update` si applica la classica formula della fisica (accelerazione = distanza × coefficiente di trazione − velocità × coefficiente di smorzamento) per attenuare dinamicamente la velocità. È proprio questo a generare quel magnetico rimbalzo meccanico invece di uno scorrimento rigido e spento!
5. **Controllo della finestra di ritaglio (Clip Window)**: durante il rendering delle cifre, con `u8g2.setClipWindow(x, 4, w, 28)` si stabilisce che i pixel vengano mostrati solo all'interno di quell'altezza centrale; fuori da quel riquadro spariscono subito, simulando alla perfezione il senso di fessura meccanica di un vero contatore a rulli.

---

## Risoluzione dei problemi

Niente panico! Il 95% dei principianti che realizza questo tipo di piccoli progetti hardware incontra problemi riconducibili quasi sempre ai seguenti punti:

* **Lo schermo è completamente nero, non mostra nulla**:
  1. Controlla prima il cablaggio: verifica che il VCC dello schermo sia collegato a 3,3V e che il GND non sia allentato.
  2. Verifica che i pin SDA e SCL non siano invertiti. Nel codice sono impostati `SDA -> 14`, `SCL -> 13`.
  3. Assicurati che il driver dello schermo OLED sia il classico `SSD1306`. Una piccola quota di schermi apparentemente identici sul mercato usa lo `SH1106`: in tal caso occorre sostituire la funzione di inizializzazione del costruttore di U8g2.

* **Lo stato a destra resta fisso su "ERR"**:
  1. Indica un errore di richiesta di rete o di parsing. Controlla che `ssid` e `password` siano configurati correttamente. Nota: l'ESP32 **non supporta il Wi-Fi sulla banda 5G**, quindi collega obbligatoriamente una rete o un hotspot sulla banda 2,4G.
  2. Verifica di aver inserito l'UID corretto: puoi aprire nel browser `https://api.bilibili.com/x/relation/stat?vmid=TUO_UID` per controllare che restituisca i dati JSON corretti.

---

## FAQ

**D: Posso usare altri pin GPIO per collegare lo schermo?**
R: Certo! Ti basta cambiare i numeri in `#define OLED_SDA 14` e `#define OLED_SCL 13` in cima al codice con qualsiasi pin libero della tua scheda ESP32-S3. Dopo la modifica ricordati di spostare anche i cavetti Dupont.

**D: Perché dopo il caricamento il numero resta bloccato a 0 senza muoversi?**
R: Perché nel codice `#define DEBUG_SIMULATE` è impostato di default a `0` (uso del recupero dati reale dalla rete). Poiché la frequenza di recupero è impostata a 30 minuti, appena acceso — con il Wi-Fi ancora in fase di connessione — potrebbe succedere che il primo frame non ottenga dati. Puoi cambiare la macro a `1` per attivare la modalità simulata e vedere subito le cifre saltare a caso ogni 2 secondi innescando in modo spettacolare l'animazione di rimbalzo!

**D: Vorrei un refresh più frequente, come si fa?**
R: Modifica la riga `const unsigned long FETCH_INTERVAL = 30 * 60 * 1000;` nell'area di configurazione. Non è consigliato impostare un valore troppo basso (per esempio meno di 10 secondi), altrimenti richieste troppo frequenti all'API di Bilibili potrebbero far bloccare temporaneamente il tuo IP pubblico.

**D: Dopo un blackout i follower guadagnati oggi si azzerano?**
R: No! Il codice usa internamente la libreria `Preferences` dell'ESP32. Ogni volta che si passa a un nuovo giorno e si cattura con successo il numero base di follower, questo viene conservato in modo sicuro nel chip Flash interno dell'ESP32. Anche in caso di blackout completo e scollegamento dei cavi, alla riaccensione ricorderà qual era il punto di partenza della giornata, calcolando così con precisione l'incremento odierno.

**D: Questo effetto fisico si può portare su schermi a risoluzione maggiore (per esempio 128x64)?**
R: Certamente. Nella funzione `drawBigOdometer()` ci sono variabili dedicate al controllo dell'altezza: `areaTop`, `areaBot`, `baseline` e l'impostazione del corpo del font. Passando a uno schermo più grande basta scalare proporzionalmente le coordinate della finestra di ritaglio e usare un font U8g2 in grassetto più grande (per es. logisoso42) per ottenere un effetto a ruota ancora più imponente.

**D: Perché l'indicatore di segnale sullo schermo è sempre al massimo o poco preciso?**
R: In `drawWifiIcon` leggiamo `WiFi.RSSI()` (indicatore della potenza del segnale ricevuto). Il codioe lo divide in 3 fasce tramite le due soglie di `-60dBm` e `-75dBm`. Se il dispositivo è vicino al router, il segnale si stabilizza in genere alla massima di 3 barre.

---

## Idee per andare oltre

Concluso l'esperimento, la tua scrivania da vero geek comincia a prendere forma. Ecco come puoi moddarlo ulteriormente:

* **Integrazione multi-piattaforma**: aggiungi il parsing di un'altra API e fai scorrere in carosello fluido sullo schermo, ogni 10 secondi, fra «follower Bilibili» e « follower su Douyin/GitHub».
* **Aggiungi un motore vibrante**: collega ai pin della scheda un piccolo motore piatto vibrante: ogni volta che i follower aumentano, il motore segue il ritmo della rotazione delle cifre con un leggero feedback tattile meccanico «tac tac tac», raddoppiando l'effetto soddisfacente!
* **Aggiungi un case stampato in 3D**: disegna per il tuo ESP32 e lo schermo OLED un mini-case stampato in 3D a forma di vecchio televisore: diventerà all'istante un oggetto d'arte da scrivania.

---

## Riferimenti

* [Scheda tecnica ufficiale e guida alla progettazione hardware dell'ESP32-S3 di Espressif](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
* [Repository GitHub ufficiale di U8g2 con font ad alta risoluzione e istruzioni di configurazione dei pin](https://github.com/olikraus/u8g2)
* [Guida ufficiale di ArduinoJson con esempi di parsing efficiente e a flusso](https://arduinojson.org/)
