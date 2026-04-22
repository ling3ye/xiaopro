---
title: "ESP32-S3 + PCM5102A lit du MP3｜Câblage I2S + code Arduino complet"
boardId: esp32s3
moduleId: audio/pcm5102a
category: esp32
date: 2026-04-22
intro: "Connectez un ESP32-S3 à un module DAC PCM5102A via I2S et diffusez du MP3 par Wi-Fi avec la bibliothèque ESP32-audioI2S. Moins de 10 fils, moins de 50 lignes de code — accessible aux débutants."
image: "https://img.lingflux.com/2026/04/0c35d50bc32e0bd67636e15a21d5e2ed.png"
---

# ESP32-S3 + PCM5102A Lecteur MP3 — Tutoriel complet de câblage I2S et code Arduino

> **Résumé en une ligne：** Utilisez un ESP32-S3, connectez un module DAC PCM5102A via I2S et diffusez du MP3 par Wi-Fi avec la bibliothèque ESP32-audioI2S. Moins de 10 fils, moins de 50 lignes de code — parfait pour les débutants.

---

## TL;DR（Démarrage rapide）

Vous voulez juste l'essentiel？ Le voici：

1. Connectez GPIO17（BCK）、GPIO16（LCK）、GPIO15（DIN） de l'ESP32-S3 aux broches BCK、LCK、DIN du PCM5102A
2. Connectez la broche XMT du PCM5102A au 3.3V（ou passez-la à HIGH via GPIO7 dans le code）. Les autres broches de contrôle（FMT/SCL/DMP/FLT）toutes au GND
3. Installez la bibliothèque Arduino：ESP32-audioI2S（par schreibfaul1）
4. Copiez le code, modifiez les identifiants Wi-Fi, flashez et écoutez

---

**ESP32-S3 + PCM5102A** est l'une des combinaisons offrant le meilleur rapport qualité-prix pour les projets audio DIY. L'ESP32-S3 gère la connexion Wi-Fi, le téléchargement MP3 et le décodage audio, tandis que le PCM5102A convertit le signal numérique en audio analogique pour le casque ou les enceintes. L'ensemble coûte seulement quelques euros, mais la qualité sonore surpasse largement les alternatives du même prix.

Tout le câblage et le code de ce tutoriel ont été testés et vérifiés — suivez les étapes pour obtenir le même résultat.

---

## Résultat final

Une fois alimenté, l'ESP32-S3 se connecte automatiquement au Wi-Fi, récupère un flux audio MP3 depuis le réseau et le lit via le PCM5102A. Le son sort du casque ou des enceintes. Aucun bouton, aucun écran tactile — branchez et écoutez.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/CjGkTj7KaQo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## Présentation du module audio PCM5102A

### Qu'est-ce que le PCM5102A？

Le **PCM5102A** est une puce **DAC**（Convertisseur Numérique-Analogique）stéréo haute performance fabriquée par Texas Instruments.

Votre ESP32-S3 produit des **signaux audio numériques**（des 0 et des 1 au format I2S）, mais les casques et enceintes ne comprennent que les **signaux analogiques**（des ondes variants dans le temps）. Le PCM5102A sert d'「interprète」 entre les deux, convertissant les données numériques en audio analogique en temps réel.

### Caractéristiques principales du PCM5102A

| Paramètre | Spécification |
|---|---|
| Interface | I2S（compatible natif ESP32） |
| Taux d'échantillonnage | 8kHz – 384kHz |
| Plage dynamique | 112dB（détails fins, plancher de bruit extrêmement bas） |
| Tension de fonctionnement | 3.3V alimentation simple（parfait pour l'ESP32） |
| MCLK | PLL intégrée, pas d'horloge maître externe requise |
| Sortie | Pilote différentiel intégré, forte immunité au bruit |

**Pourquoi choisir le PCM5102A？** Peu coûteux, facile à utiliser, fonctionne en 3.3V, ne nécessite pas d'horloge externe, et sa plage dynamique de 112dB est impressionnante pour l'audio sur microcontrôleur — le compagnon DAC I2S le plus populaire pour les projets ESP32.

### Fonctions des broches du PCM5102A

| Broche | Fonction | Connexion ESP32-S3 | Remarques |
|---|---|---|---|
| **3.3V** | Alimentation logique（3.3V） | ESP32 3.3V | Obligatoire |
| **GND** | Masse | ESP32 GND | Obligatoire — la masse commune est cruciale |
| **BCK** | Horloge de bits I2S | GPIO17 | Signal I2S principal |
| **LCK** | Horloge canal gauche/droit I2S（LRCK/WS） | GPIO16 | Signal I2S principal |
| **DIN** | Entrée données audio I2S | GPIO15 | Signal I2S principal |
| **XMT** | Contrôle de mise en sourdine douce（HIGH = sortie normale） | 3.3V ou GPIO7 | **Doit être à HIGH, sinon aucun son** |
| **FMT** | Sélection format audio（LOW = I2S） | GND | Connecter à la masse |
| **SCL** | Horloge maître système（PLL interne disponible） | GND | Connecter à la masse |
| **DMP** | Contrôle de désaccentuation | GND | Connecter à la masse |
| **FLT** | Mode filtre numérique | GND | Connecter à la masse |

> **Règle d'or：** Connectez les quatre broches de contrôle — FMT, SCL, DMP, FLT — au GND. Simple, stable, infaillible.

---

## Liste des matériaux（BOM）

| Composant | Quantité | Remarques |
|---|---|---|
| Carte ESP32-S3 | × 1 | Tout DevKit ESP32-S3 convient |
| Module audio PCM5102A | × 1 | Disponible en ligne, ~1–2€ |
| Fils de liaison（Dupont） | Plusieurs | Mâle-mâle / mâle-femelle selon la carte |
| Casque ou petite enceinte | × 1 | Casque 3.5mm ou enceinte passive |

---

## Câblage：ESP32-S3 vers PCM5102A

Le câblage est la partie la plus sujette aux erreurs de ce projet. Après avoir tout connecté, **vérifiez chaque connexion avec le tableau** — cela vous fera gagner 80% du temps de dépannage.

| ESP32-S3 GPIO | Broche PCM5102A | Description |
|---|---|---|
| 3.3V | **3.3V** | Alimentation logique |
| GND | **GND** | Masse（doit être commune！） |
| **GPIO 17** | **BCK** | Horloge de bits I2S |
| **GPIO 16** | **LCK** | Horloge canal G/D（LRCK/WS） |
| **GPIO 15** | **DIN** | Entrée données audio I2S |
| **GPIO 7** | **XMT** | Contrôle sourdine（HIGH dans le code；ou relier directement au 3.3V） |
| GND | FMT / SCL / DMP / FLT | Broches format et contrôle（toutes au GND） |

---

## Bibliothèque Arduino requise

Recherchez et installez dans le Gestionnaire de Bibliothèques de l'IDE Arduino：

**ESP32-audioI2S**（par schreibfaul1）

Sinon, téléchargez le ZIP depuis GitHub et installez manuellement：[https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

---

## Code Arduino complet（Testé et vérifié）

Ce code a été testé sur ESP32-S3 + PCM5102A. Copiez, mettez à jour vos identifiants Wi-Fi et téléversez：

```cpp
// Plus d'expériences sur www.lingflux.com

#include <Arduino.h>
#include <WiFi.h>
#include <Audio.h>

// ── Paramètres Wi-Fi（à modifier）─────────────────────────────
const char* ssid     = "VOTRE_NOM_WIFI";
const char* password = "VOTRE_MOT_DE_PASSE";

// ── Définition des broches I2S ───────────────────────────────
#define I2S_BCLK  17   // BCK：horloge de bits
#define I2S_LRCK  16   // LCK：horloge canal gauche/droit
#define I2S_DOUT  15   // DIN：données audio
#define XMT        7   // XMT：contrôle sourdine douce（HIGH = sortie normale）

Audio audio;

void setup() {
  Serial.begin(115200);

  // Étape 1：Mettre XMT à HIGH pour désactiver la sourdine du PCM5102A
  pinMode(XMT, OUTPUT);
  digitalWrite(XMT, HIGH);

  // Étape 2：Connexion au Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connexion au Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connecté！");

  // Étape 3：Configurer les broches I2S et le volume
  audio.setPinout(I2S_BCLK, I2S_LRCK, I2S_DOUT);
  audio.setVolume(18);  // Plage de volume 0–21, 18 est un défaut confortable

  // Étape 4：Lire un MP3 en ligne
  audio.connecttohost("https://pixabay.com/music/download/id-219731.mp3");
  Serial.println("Lecture audio démarrée...");
}

void loop() {
  // Appeler en continu pour maintenir le décodage et la lecture（ne pas supprimer！）
  audio.loop();
}

// Callback de débogage：affiche l'état de la bibliothèque（utile pour le dépannage）
void audio_info(const char *info) {
  Serial.print("Audio Info: ");
  Serial.println(info);
}
```

**Explication du code：**

- `audio.setVolume(18)`：La plage de volume est 0–21. 18 est une bonne valeur par défaut — ajustez selon vos préférences.
- `connecttohost()`：Supporte les liens directs HTTP/HTTPS de MP3. Si l'URL expire, remplacez-la par une autre.
- `audio.loop()`：Doit être appelé en continu dans `loop()` — gère le décodage et la sortie du flux audio. Ne le supprimez pas et n'ajoutez pas d'opérations bloquantes.

---

## Questions fréquentes et dépannage（FAQ）

### Q：Après le câblage et la mise sous tension, aucun son. Que vérifier？

C'est le problème le plus courant chez les débutants. Vérifiez dans cet ordre — cela résout 90% des cas：

**① Vérifier la masse commune** Le GND de l'ESP32-S3 et du PCM5102A doivent être reliés par un fil de liaison. Sans masse commune, le signal ne peut pas boucler le circuit et aucun son ne sortira. C'est ce que les débutants oublient le plus souvent.

**② Vérifier les broches I2S** Si l'une des trois lignes I2S（BCK, LCK, DIN）est inversée ou échangée, vous aurez un silence total ou un bruit continu. Vérifiez avec ce tableau：

| ESP32-S3 GPIO | Broche PCM5102A |
| ------------- | ------------- |
| GPIO 17       | BCK           |
| GPIO 16       | LCK           |
| GPIO 15       | DIN           |

**③ Vérifier que XMT est à HIGH** XMT est la broche de mise en sourdine douce du PCM5102A：LOW = muté, HIGH = lecture normale. Si vous oubliez de la passer à HIGH, la puce reste en sourdine permanente. Solution：ajoutez `digitalWrite(7, HIGH)` dans le code ou reliez XMT directement au 3.3V.

------

### Q：Pendant la lecture, j'entends de légers clics ou crépitements. Pourquoi？

C'est l'un des sujets les plus discutés dans les projets audio ESP32. Plusieurs causes possibles — classées par probabilité：

**Cause 1：Dépassement de buffer I2S（Buffer Underrun）**（plus probable）

Lorsque l'ESP32 décode du MP3 ou lit depuis le réseau/la carte SD, des pics soudains de charge CPU, des buffers trop petits ou un décodage trop lent peuvent causer de brèves interruptions de données. Quand le PCM5102A reçoit des horloges continues mais que la ligne de données passe brièvement à zéro, cela produit des clics reproductibles.

Solution：Augmentez `dma_buf_count`（8–16 recommandé）et `dma_buf_len`（256–1024）dans `i2s_config`. Si vous utilisez `xTaskCreate`, élevez la priorité de la tâche audio au-dessus du Wi-Fi et des autres tâches de fond.

**Cause 2：Incompatibilité de taux d'échantillonnage ou de profondeur de bits**

Quand le taux d'échantillonnage du fichier（44.1kHz / 48kHz）ne correspond pas à la configuration I2S de l'ESP32, ou en mélangeant 24 bits et 16 bits.

Solution：Convertissez tous les fichiers audio en 44.1kHz, 16 bits, stéréo（ffmpeg pour le traitement par lots）. Définissez explicitement `bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT`.

**Cause 3：Problèmes d'intégrité du signal matériel**

Des câbles I2S trop longs sans résistances d'amortissement en série peuvent provoquer du ringing sur les bords du signal. L'activité Wi-Fi/CPU de l'ESP32 peut aussi injecter du bruit via l'alimentation 3.3V partagée.

Solution：Ajoutez des résistances en série de 33–100Ω sur BCK, LCK, DIN（près de l'ESP32）. Ajoutez des condensateurs de découplage dédiés de 10μF + 0.1μF pour le PCM5102A.

**Cause 4：Déclenchement de l'auto-mute interne du PCM5102A**

Quand les données DIN tombent brièvement à zéro ou à un niveau bas, la logique de mise en sourdine intelligente de la puce se déclenche, produisant un léger pop.

Solution：Ajoutez des transitions de fondu en entrée/sortie（fade in/out）au début et à la fin de la lecture.

**Diagnostic rapide：** Testez avec un fichier WAV standard（44.1kHz 16 bits）pour contourner le décodage MP3. Si les clics persistent au même endroit, c'est probablement un problème de buffer. Ajoutez ensuite progressivement le décodage MP3 et le streaming réseau pour cerner la cause.

------

### Q：La lecture en ligne saccade ou s'interrompt. Que faire？

Le streaming dépend de la qualité du réseau. Essayez d'abord un lien MP3 direct plus rapide. Si le réseau n'est pas en cause, passez à des fichiers locaux depuis une carte SD ou SPIFFS.

------

### Q：Puis-je utiliser d'autres GPIO pour l'I2S？

Oui. Le périphérique I2S de l'ESP32-S3 prend en charge le mappage GPIO arbitraire — changez simplement les valeurs de `#define I2S_BCLK`, `I2S_LRCK`, `I2S_DOUT` dans le code.

------

### Q：Quels taux d'échantillonnage le PCM5102A prend-il en charge？

Le PCM5102A prend en charge 8kHz, 16kHz, 32kHz, 44.1kHz, 48kHz, 96kHz, 192kHz et 384kHz — couvrant tous les besoins de lecture MP3（généralement 44.1kHz）.

------

### Q：Puis-je alimenter le PCM5102A en 5V？

Certains modules PCM5102A avec LDO intégré acceptent une entrée 5V et la régulent internement à 3.3V. Si votre module n'a qu'une broche 3.3V（pas de broche 5V）, utilisez le 3.3V. Nous recommandons l'alimentation en 3.3V pour une meilleure stabilité et compatibilité des niveaux logiques avec l'ESP32-S3.

------

### Q：L'utilisation CPU est-elle élevée pendant la lecture MP3？

La bibliothèque ESP32-audioI2S exploite l'architecture double cœur de l'ESP32-S3, exécutant le décodage audio sur un cœur séparé avec un impact minimal sur la boucle principale. L'utilisation CPU typique est de 10 à 30%.

------

### Q：Puis-je piloter un écran TFT tout en lisant de l'audio？

Oui. L'ESP32-S3 a suffisamment de puissance pour gérer simultanément la sortie audio I2S et l'affichage TFT par SPI. Assurez-vous simplement que `loop()` ne contient pas d'opérations bloquantes longues — elles priveraient `audio.loop()` et causeraient des saccades ou des clics.

------

### Q：Quelle est l'interface de sortie du PCM5102A？ Puis-je connecter un amplificateur？

Le module PCM5102A fournit généralement une sortie analogique stéréo 3.5mm standard pour casque ou enceinte passive. Pour un amplificateur, utilisez l'interface LINE OUT du module — son niveau de sortie est mieux adapté à l'entrée d'un amplificateur et offre une meilleure qualité sonore.

------

### Q：ESP32-S3 vs ESP32 original pour l'audio I2S — quelle différence？

L'ESP32-S3 fonctionne à 240MHz double cœur（plus rapide que les variantes ESP32 originales）, rendant le décodage MP3 plus fluide avec moins de pertes d'images et de clics. Il dispose également de plus de ressources GPIO — idéal pour les projets combinant audio, affichage et réseau.

---

## Références

- **Datasheet PCM5102A（Texas Instruments）：**
  [https://www.ti.com/lit/ds/symlink/pcm5102a.pdf](https://www.ti.com/lit/ds/symlink/pcm5102a.pdf)

- **Bibliothèque ESP32-audioI2S（GitHub, par schreibfaul1）：**
  [https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

- **Documentation technique ESP32-S3 d'Espressif：**
  [https://www.espressif.com/en/products/socs/esp32-s3](https://www.espressif.com/en/products/socs/esp32-s3)

---

*Pour plus d'expériences et tutoriels ESP32, visitez [www.lingflux.com](http://www.lingflux.com)*
