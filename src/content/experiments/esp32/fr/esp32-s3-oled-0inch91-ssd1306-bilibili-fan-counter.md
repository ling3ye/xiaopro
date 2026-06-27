---
title: "ESP32-S3 + OLED 0,91\" pour un compteur d'abonnés Bilibili « satisfaisant »｜avec oscillation physique à ressort amorti"
boardId: esp32s3
moduleId: display/oled091-ssd1306
category: esp32
date: 2026-06-27
intro: "Réalisez avec un ESP32-S3 et un OLED SSD1306 0,91\" (128×32) un compteur d'abonnés Bilibili de bureau, dont les chiffres changent avec une animation de rebond fluide à ressort amorti. Câblage I2C 4 fils + code complet Arduino C++, guide de dépannage inclus."
image: "https://img.lingflux.com/2026/06/e53fb5a7bdaee8448584fb9f21aa504d.jpg"
---

> **En une phrase :** ESP32-S3 + OLED 0,91\" + API Bilibili, pour fabriquer un compteur d'abonnés de bureau qui « rebondit comme un ressort amorti » — finis les allers-retours sur le téléphone pour vérifier les statistiques.

# ESP32-S3 + OLED 0,91\" pour un compteur d'abonnés Bilibili « satisfaisant » (avec oscillation physique à ressort amorti !)

Difficulté : ⭐⭐☆☆☆ (accessible aux débutants)
Temps estimé : 30 minutes
Environnement de test : Arduino IDE 2.3.8 + package de prise en charge ESP32 v3.3.10 + U8g2 v2.36.19 + ArduinoJson v7.4.3

> **TL;DR (démarrage rapide) :**
>
> 1. Câblage : ESP32-S3 GPIO 14 → OLED SDA, GPIO 13 → OLED SCL, puis connectez 3.3V et GND.
> 2. Vérification : assurez-vous que l'écran est correctement alimenté et que les broches I2C ne sont pas inversées.
> 3. Installation des bibliothèques : dans Arduino IDE, recherchez et installez `U8g2` (auteur : oliver) et `ArduinoJson` (auteur : Benoit Blanchon).
> 4. Configuration : remplacez, dans le code complet, le SSID et le mot de passe Wi-Fi ainsi que l'UID Bilibili par les vôtres, flashez, et laissez le nombre d'abonnés s'afficher à l'écran avec une mécanique de rebond parfaitement fluide !

---

## Introduction

Avec ce petit écran OLED, j'ai réalisé un compteur d'abonnés Bilibili de bureau, à la fois fascinant et satisfaisant ! Plus besoin de sortir le téléphone pour consulter les statistiques.

---

## Résultat final

Le résultat que j'ai obtenu est une mise en page élégante en trois sections : à gauche, le logo « FANS » en vertical et une flèche d'indication mécanique ; au centre, l'âme de l'expérience — un **compteur à rouleaux physiques amortis en gros chiffres** de 24 pixels de haut, gras, avec sa propre fenêtre de découpe locale ; à droite, le gain d'abonnés du jour (calcul automatiquement, avec une flèche triangulaire de hausse/baisse), ainsi que la force du signal Wi-Fi et un témoin de pulsation.

![](https://img.lingflux.com/2026/06/13648c6923d1cb24486cb082105d8d59.jpg)

---

## Description du composant

### Écran OLED 0,91\" (SSD1306)

Pour ce projet, en plus de la carte de développement centrale (ESP32-S3), le composant le plus important est cet **écran OLED 0,91\"**.

L'écran OLED 0,91\" est une sorte de « traducteur simultané auto-éclairant », qui traduit en temps réel le nombre d'abonnés récupéré par l'ESP32-S3 depuis le réseau en une matrice de pixels visible à l'œil nu. Comme chaque pixel émet sa propre lumière, il n'a pas besoin d'un épais panneau rétroéclairé comme les LCD classiques, d'où un contraste extrêmement élevé : un noir profond et une luminosité éclatante. Il a été choisi pour ce projet en raison de sa très petite taille, de son prix abordable et du fait qu'il ne nécessite que 4 fils via I2C, ce qui le rend idéal pour une petite décoration de bureau raffinée.

| Caractéristique clé | Valeur |
| --- | --- |
| Pilote | SSD1306 |
| Résolution | 128 x 32 pixels |
| Interface | I2C (IIC) |
| Tension de fonctionnement | 3.3V ~ 5V |
| Couleur d'affichage | généralement blanc pur ou bleu pur |

---

## Liste des composants (BOM)

| Composant | Spécification / modèle | Quantité | Rôle |
| --- | --- | --- | --- |
| Carte ESP32-S3 | n'importe quelle version standard à double port Type-C | 1 | Centre de commande : récupère les données via le réseau et calcule l'animation physique |
| Module OLED 0,91\" | Pilote SSD1306 / interface I2C 4 broches | 1 | Affichage et rendu de l'animation à fenêtre physique |
| Fils Dupont | Femelle-vers-femelle / mâle-vers-femelle (selon la carte) | 4 | Connexion entre la carte et les broches de l'écran |

---

## Broches et câblage

> 💡 **Astuce pratique :** Après le câblage, vérifiez chaque connexion par rapport au tableau ci-dessous. En général, 80 % des problèmes d'écran muet, noir ou d'appareil qui surchauffe proviennent d'un câblage incorrect ; 10 secondes de vérification vous feront gagner beaucoup de temps de débogage !

| Broche OLED | Broche ESP32-S3 | Description de la fonction |
| --- | --- | --- |
| GND | GND | Masse (la ligne de référence qui parle le même langage) |
| VCC | 3.3V (ou 3V3) | Alimentation électrique en entrée |
| SCL | GPIO 13 | Ligne d'horloge I2C |
| SDA | GPIO 14 | Ligne de données I2C |

---

## Bibliothèques requises

Dans Arduino IDE 2.x, cliquez sur l'icône « Gestionnaire de bibliothèques » à gauche (ou appuyez sur `Ctrl+Shift+I`), et recherchez puis installez les versions testées et validées des bibliothèques open source suivantes :

1. **U8g2** (auteur : oliver) — version testée : `v2.36.19` ou supérieure. Sert à piloter l'écran OLED et prend en charge les fenêtres de découpe précises (Clip Window).
2. **ArduinoJson** (auteur : Benoit Blanchon) — version testée : `v7.4.3`. Sert à analyser les données JSON renvoyées par l'API Bilibili.

---

## Code complet + explication

Copiez le code complet ci-dessous dans Arduino IDE. Avant de flasher, **veillez à remplacer `const char* ssid` et `password` par le SSID et le mot de passe de votre Wi-Fi, et remplacez `uid` par l'UID Bilibili de l'utilisateur que vous souhaitez surveiller**.

```cpp
/**
 * =========================================================================
 * ESP32-S3 0.91" OLED (128x32 SSD1306) Afficheur d'abonnés Bilibili version fusion ultime
 * =========================================================================
 * Fonctionnalités : mise en page raffinée en trois sections + véritable moteur d'oscillation physique à ressort amorti
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Preferences.h>
#include <time.h>

// ================== Commutateurs de débogage ==================
#define DEBUG_SIMULATE   0     // [IMPORTANT] 1=activer les données simulées (test de l'animation sans réseau), 0=utiliser la vraie API
#define SIM_INTERVAL_MS  2000  // Intervalle de variation des données simulées (ms)
#define SIM_START_VALUE  9985  // Nombre d'abonnés initial simulé (mettre 9985 permet d'observer rapidement l'effet d'oscillation lors du saut à 5 chiffres)

// ================== Configuration utilisateur ==================
const char* ssid     = "YOUR_WIFI_SSID";      // Remplacez par le nom de votre Wi-Fi
const char* password = "YOUR_WIFI_PASSWORD";  // Remplacez par le mot de passe de votre Wi-Fi
const char* uid      = "YOUR_BILIBILI_UID";   // Remplacez par l'UID Bilibili que vous souhaitez surveiller

String biliApiUrl = "https://api.bilibili.com/x/relation/stat?vmid=" + String(uid);
const unsigned long FETCH_INTERVAL = 30 * 60 * 1000; // Rafraîchit les données via le réseau toutes les 30 minutes

#define OLED_SDA 14
#define OLED_SCL 13
#define SCREEN_CONTRAST 255

// Paramètres d'animation
#define SCROLL_EASING    0.18f   // Coefficient de traction du ressort de base
#define ANIM_FPS         60      // Fréquence d'images de l'animation
#define ANIM_INTERVAL    (1000/ANIM_FPS)

// Initialisation du constructeur U8g2
U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

// ================== Variables d'état ==================
long targetFollowers = 0;
long todayBaseFollowers = 0;
long todayAdded = 0;
bool isInitialFetch = true;
bool connectionError = false;

unsigned long lastFetchTime = 0;
unsigned long lastAnimTime = 0;
unsigned long lastSimTime = 0;

Preferences preferences; // Sert à enregistrer le nombre d'abonnés de base du jour de façon sécurisée dans le Flash, sans perte à la coupure

// ================== Moteur central d'oscillation physique amortie ==================
#define MAX_DIGITS 7

class DigitWheel {
public:
  float currentY = 0.0f;
  int   targetDigit = 0;
  float velocity = 0.0f;  // Variable de vitesse centrale du ressort amorti

  void update(float easing) {
    float diff = (float)targetDigit - currentY;

    // Principe du plus court chemin pour le défilement circulaire (0 <-> 9)
    if (diff > 5.0f)  diff -= 10.0f;
    if (diff < -5.0f) diff += 10.0f;

    if (fabs(diff) > 0.005f) {
      // Modèle physique classique : loi de Hooke + amortissement visqueux, produisant un rebond fluide et une oscillation décroissante
      float accel = diff * easing - velocity * 0.25f;
      velocity += accel;
      currentY += velocity;

      // Contrainte de plage circulaire
      while (currentY >= 10.0f) currentY -= 10.0f;
      while (currentY < 0.0f)   currentY += 10.0f;
    } else {
      currentY = (float)targetDigit;
      velocity = 0.0f; // Arrêt stable
    }
  }
};

DigitWheel wheels[MAX_DIGITS];

// Déclarations anticipées
void drawUI();
void drawLeftPanel();
void drawBigOdometer();
void drawRightPanel();
void drawWifiIcon(int x, int y);
void fetchBiliData();
void checkNewDayReset();

// ================== Initialisation ==================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Bilibili OLED Monitor Deluxe ===");

  Wire.begin(OLED_SDA, OLED_SCL);
  u8g2.begin();
  u8g2.setContrast(SCREEN_CONTRAST);
  u8g2.enableUTF8Print();

  // Étape 1 : dessiner un écran de démarrage élégant
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
    todayBaseFollowers = targetFollowers - 10; // Présume une croissance de 10 pour aujourd'hui
  }
  todayAdded = targetFollowers - todayBaseFollowers;
  isInitialFetch = false;
#else
  // Étape 2 : connexion au réseau Wi-Fi local
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
    // Étape 3 : configurer le service de temps pour la réinitialisation automatique à minuit
    configTime(8 * 3600, 0, "ntp.aliyun.com", "time.windows.com");
    fetchBiliData();
  } else {
    Serial.println("\nWiFi failed");
    connectionError = true;
    targetFollowers = 0;
  }
#endif
}

// ================== Boucle principale ==================
void loop() {
  unsigned long now = millis();

#if DEBUG_SIMULATE
  // Logique de données simulées : sauts réguliers, pratiques pour observer la dynamique fascinante de plusieurs rouleaux rebondissant simultanément
  if (now - lastSimTime >= SIM_INTERVAL_MS) {
    lastSimTime = now;
    int delta = random(-2, 6); // Génère une croissance oscillatoire aléatoire de -2 à +5
    targetFollowers += delta;
    if (targetFollowers < 0) targetFollowers = 0;
    todayAdded = targetFollowers - todayBaseFollowers;
    Serial.printf("[SIM] target=%ld (delta=%+d) today=%+ld\n", targetFollowers, delta, todayAdded);
  }
#else
  // Récupération périodique des vraies données réseau
  if (now - lastFetchTime >= FETCH_INTERVAL || lastFetchTime == 0) {
    fetchBiliData();
    lastFetchTime = now;
  }
  checkNewDayReset();
#endif

  // Étape 4 : rafraîchissement de l'animation centrale (stable à 60 FPS pleine fréquence)
  if (now - lastAnimTime >= ANIM_INTERVAL) {
    lastAnimTime = now;

    // Décompose le nombre total d'abonnés sur la cible de chaque rouleau indépendant correspondant à chaque chiffre
    long temp = targetFollowers;
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      wheels[i].targetDigit = temp % 10;
      temp /= 10;
    }

    // Met à jour le moteur physique, en intégrant un délai en cascade des poids forts, afin que la fluctuation de plusieurs chiffres ait plus de relief entrelacé
    for (int i = MAX_DIGITS - 1; i >= 0; i--) {
      float ease = SCROLL_EASING * (1.0f - i * 0.012f);
      if (ease < 0.07f) ease = 0.07f;
      wheels[i].update(ease);
    }

    // Étape 5 : rendu de sortie sur toute la toile
    u8g2.clearBuffer();
    drawUI();
    u8g2.sendBuffer();
  }
}

// ================== Dessin de la mise en page UI (design classique en trois sections) ==================
void drawUI() {
  drawLeftPanel();    // Étiquette verticale à gauche
  drawBigOdometer();  // Gros chiffres du rouleau physique au centre
  drawRightPanel();   // Delta et signal à droite
}

void drawLeftPanel() {
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(2, 7,  "F");
  u8g2.drawStr(2, 14, "A");
  u8g2.drawStr(2, 21, "N");
  u8g2.drawStr(2, 28, "S");

  u8g2.drawVLine(9, 2, 28); // Ligne de séparation verticale
  u8g2.drawTriangle(11, 14, 11, 18, 14, 16); // Flèche mécanique pointant vers les grands chiffres
}

void drawRightPanel() {
  int rx = 102; // X de départ du panneau droit
  u8g2.drawVLine(rx - 2, 2, 28); // Ligne de séparation droite

  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(rx, 6, "TODAY");

  u8g2.setFont(u8g2_font_5x7_tr);
  char buf[8];
  if (todayAdded >= 0) {
    u8g2.drawTriangle(rx, 14, rx + 4, 14, rx + 2, 10); // Triangle montant
    snprintf(buf, sizeof(buf), "%ld", todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  } else {
    u8g2.drawTriangle(rx, 10, rx + 4, 10, rx + 2, 14); // Triangle descendant
    snprintf(buf, sizeof(buf), "%ld", -todayAdded);
    u8g2.drawStr(rx + 7, 15, buf);
  }

  u8g2.setFont(u8g2_font_4x6_tr);
#if DEBUG_SIMULATE
  u8g2.drawStr(rx, 24, "SIM");
  if ((millis() / 400) % 2) u8g2.drawDisc(rx + 17, 22, 1); // Clignotement de pulsation en mode simulation
#else
  if (connectionError) {
    u8g2.drawStr(rx, 24, "ERR");
  } else {
    u8g2.drawStr(rx, 24, "ON");
  }
#endif

  drawWifiIcon(rx + 12, 27); // Dessine les barres de signal
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

// ================== Rendu central du rouleau (avec fenêtre de découpe locale Clip précise) ==================
void drawBigOdometer() {
  u8g2.setFont(u8g2_font_logisoso24_tn); // Chiffres gras gigantesques de 24 pixels de haut

  int charW = 14;      // Largeur d'un seul chiffre
  int areaTop = 4;     // Bord supérieur de la fenêtre de défilement
  int areaBot = 28;    // Bord inférieur de la fenêtre de défilement
  int areaH = areaBot - areaTop; // Hauteur utile de la fenêtre (24px)
  int baseline = areaBot;        // Hauteur de la ligne de base de la police

  // Calcule dynamiquement le nombre de chiffres effectifs, pour un centrage auto-adaptatif parfait vers la gauche
  long absVal = targetFollowers;
  int needDigits = 1;
  long t = absVal;
  while (t >= 10) { t /= 10; needDigits++; }
  if (needDigits > MAX_DIGITS) needDigits = MAX_DIGITS;

  int totalW = needDigits * charW;
  int startX = 14 + (88 - totalW) / 2;
  if (startX < 14) startX = 14;

  // Rendu chiffre par chiffre avec retour de rebond physique
  for (int idx = 0; idx < needDigits; idx++) {
    int wheelIdx = MAX_DIGITS - needDigits + idx;
    int x = startX + idx * charW;

    float currYVal = wheels[wheelIdx].currentY;
    int digitLower = (int)currYVal;
    int digitUpper = (digitLower + 1) % 10;
    float fraction = currYVal - digitLower;

    // [Contrôle central de la découpe] : crée une fenêtre de découpe locale sur mesure pour le chiffre courant, de sorte que tout dépassement au-dessus ou en dessous des bords soit automatiquement invisible
    u8g2.setClipWindow(x - 1, areaTop, x + charW, areaBot);

    // Le chiffre actuel glisse vers le haut sous l'effet de la traction
    int yLower = baseline - (int)(fraction * areaH);
    char bufL[2] = { (char)('0' + digitLower), 0 };
    u8g2.drawStr(x, yLower, bufL);

    // Le nouveau chiffre suivant entre par le bas dans la fenêtre et rebondit avec énergie une fois en place
    int yUpper = baseline + areaH - (int)(fraction * areaH);
    char bufU[2] = { (char)('0' + digitUpper), 0 };
    u8g2.drawStr(x, yUpper, bufU);

    u8g2.setMaxClipWindow(); // Après le rendu du chiffre courant, restaure immédiatement la pleine toile
  }
}

// ================== Récupération des données réseau ==================
#if !DEBUG_SIMULATE
void fetchBiliData() {
  if (WiFi.status() != WL_CONNECTED) {
    connectionError = true;
    return;
  }
  Serial.println("Requesting Bilibili API...");
  WiFiClientSecure client;
  client.setInsecure(); // Contourne la vérification stricte du certificat SSL pour une connexion légère
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
  // Déclenche pile à minuit le rafraîchissement du compteur de base du jour
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

### Explication des étapes clés

1. **Dessin de l'écran de démarrage** : dans `setup()`, on appelle `u8g2.drawStr()` pour dessiner un logo d'apparition, offrant un tampon visuel au système.
2. **Initialisation Wi-Fi et heure** : on appelle `WiFi.begin()` pour se connecter au réseau, puis `configTime()` pour monter le serveur NTP d'Alibaba Cloud et capturer avec précision l'arrivée de minuit en local.
3. **Déguisement de la requête** : via `http.setUserAgent()` et `addHeader("Referer", ...)`, on fait passer l'ESP32 pour une requête de navigateur d'ordinateur normale, afin d'éviter d'être impitoyablement bloqué par le mécanisme anti-scraping de Bilibili.
4. **Itération physique du ressort amorti** : dans `DigitWheel::update`, on applique la formule physique classique (accélération = distance × coefficient de traction − vitesse × coefficient d'amortissement) pour faire décroître dynamiquement la vitesse. C'est l'âme qui produit ce rebond mécanique fascinant au lieu d'un glissement raide et figé !
5. **Contrôle de la fenêtre de découpe locale (Clip Window)** : lors du rendu des chiffres, on utilise `u8g2.setClipWindow(x, 4, w, 28)` pour imposer que seuls les pixels dans cette plage de hauteur intermédiaire soient affichés ; tout ce qui sort de cette case devient immédiatement invisible, reproduisant parfaitement la sensation d'une fente mécanique d'un rouleau type machine à sous.

---

## Dépannage

Pas de panique ! 95 % des débutants qui se lancent dans ce genre de petits projets matériels rencontrent des problèmes qui se répartissent essentiellement entre les points suivants :

* **L'écran reste tout noir, rien ne s'affiche** :
  1. Vérifiez d'abord le câblage : confirmez que le VCC de l'écran est bien sur 3.3V et que le GND n'est pas desserré.
  2. Vérifiez que les broches SDA et SCL ne sont pas inversées. Le code spécifie `SDA -> 14` et `SCL -> 13`.
  3. Confirmez que le pilote de votre écran OLED est bien le classique `SSD1306`. Une infime partie des écrans d'apparence identique sur le marché utilisent le `SH1106` ; si c'est le cas, vous devrez remplacer la fonction d'initialisation du constructeur U8g2.

* **Le statut à droite reste bloqué sur « ERR »** :
  1. Cela indique une erreur de requête réseau ou d'analyse. Vérifiez que votre `ssid` et votre `password` sont correctement configurés. Attention : l'ESP32 **ne prend pas en charge le Wi-Fi en bande 5G**, connectez-vous impérativement à un réseau sans fil 2.4G ou à un point d'accès mobile.
  2. Vérifiez que votre UID est correct : ouvrez `https://api.bilibili.com/x/relation/stat?vmid=VOTRE_UID` dans un navigateur pour voir si des données JSON valides sont renvoyées.

---

## FAQ

**Q : Puis-je utiliser d'autres broches GPIO pour connecter l'écran ?**
R : Tout à fait ! Il vous suffit de remplacer, en haut du code, les valeurs de `#define OLED_SDA 14` et `#define OLED_SCL 13` par n'importe quel numéro de broche libre sur votre carte ESP32-S3. Pensez ensuite à déplacer les fils Dupont en conséquence.

**Q : Pourquoi, après le flashage, le chiffre reste-t-il bloqué à 0 sans bouger ?**
R : Parce que `#define DEBUG_SIMULATE` dans le code vaut `0` par défaut (utilisation de la récupération réseau réelle). La récupération étant réglée sur 30 minutes, il est possible qu'au démarrage, le Wi-Fi encore en cours de connexion empêche la première récupération de réussir. Vous pouvez passer ce macro à `1` pour activer le mode simulation et voir immédiatement les chiffres sauter aléatoirement toutes les 2 secondes en déclenchant à plein régime l'animation d'oscillation — un effet saisissant !

**Q : Je veux un rafraîchissement plus fréquent, comment faire ?**
R : Modifiez la zone de configuration `const unsigned long FETCH_INTERVAL = 30 * 60 * 1000;`. Cependant, il est déconseillé de fixer un intervalle trop court (par exemple moins de 10 secondes), sous peine de voir votre IP publique temporairement bloquée par le serveur Bilibili en raison de requêtes trop fréquentes.

**Q : Après une coupure de courant, le nombre d'abonnés gagnés dans la journée est-il remis à zéro ?**
R : Non ! Le code utilise en interne la bibliothèque `Preferences` de l'ESP32. Chaque fois qu'un nouveau jour débute et que le nombre d'abonnés de base est capturé avec succès, ce chiffre est verrouillé en toute sécurité dans la puce Flash interne de l'ESP32. Même après une coupure totale et le débranchement des câbles, au redémarrage il se souvient toujours du point de départ du nombre d'abonnés du jour, et calcule ainsi avec précision le gain du jour.

**Q : Cet effet physique peut-il être porté sur un écran à plus haute résolution (par exemple 128x64) ?**
R : Bien sûr. Dans la fonction `drawBigOdometer()`, il existe des variables dédiées au contrôle de la hauteur : `areaTop`, `areaBot`, `baseline` et la taille de police. Pour un grand écran, il suffit de mettre à l'échelle les coordonnées de la zone de découpe et de remplacer par une police grasse U8g2 plus grande (par exemple logisoso42, etc.) pour obtenir un effet de rouleau encore plus imposant.

**Q : Pourquoi la force du signal affichée est-elle toujours au maximum ou un peu imprécise ?**
R : Dans `drawWifiIcon`, nous lisons `WiFi.RSSI()` (indicateur de puissance du signal reçu). Le code le découpe en 3 niveaux grâce à deux seuils durs, `-60dBm` et `-75dBm`. Si votre appareil est relativement proche du routeur sans fil, le signal se stabilisera généralement au maximum, à 3 barres.

---

## Aller plus loin

Une fois cette expérience terminée, votre bureau de geek commence à prendre forme. Voici quelques idées pour la suite :

* **Surveiller plusieurs plateformes** : ajoutez une analyse d'API supplémentaire pour que l'écran fasse défiler en douceur, toutes les 10 secondes, entre le nombre d'abonnés Bilibili et les abonnés TikTok / followers GitHub.
* **Ajouter un moteur vibrant** : branchez un petit moteur vibrant plat sur une broche de la carte. À chaque nouvel abonné, le moteur émet, en rythme avec le défilement des chiffres, un léger retour tactile mécanique « tac-tac-tac » — l'effet satisfaisant est doublé !
* **Imprimer un boîtier 3D** : concevez pour votre ESP32 et votre écran OLED un mini boîtier 3D en forme de téléviseur rétro, qui se transformera instantanément en une œuvre d'art de bureau.

---

## Références

* [Fiche technique officielle ESP32-S3 d'Espressif et guide de conception matérielle](https://www.espressif.com/zh-hans/products/socs/esp32-s3)
* [Page GitHub open source officielle d'U8g2 et configuration des broches des polices haute résolution](https://github.com/olikraus/u8g2)
* [Guide officiel ArduinoJson pour l'analyse efficace et l'analyse en flux](https://arduinojson.org/)
