---
title: "【Schritt fuer Schritt】Kostenlos! Mac-lokale Bereitstellung von ACE-Step 1.5 – AI-Musik mit einem Klick generieren"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-02-23
intro: "AI-Musikmodell ACE-Step 1.5 komplett kostenlos und offline auf dem eigenen Mac betreiben, mit Apple-Chip-Beschleunigung – nur ein paar Befehle noetig."
image: "https://img.lingflux.com/ace-step-1.5-mac-local-deploy-ai-music-generation-guide-c640.png"
tags: ["AI", "Mac", "Musikgenerierung", "ACE-Step", "lokale Bereitstellung"]
---

Da so viele von euch daran interessiert sind, lokal AI laufen zu lassen, teile ich heute ein richtig cooles Projekt -- **ACE-Step 1.5**.

Kurz gesagt: Es kann auf deinem eigenen Mac Musik generieren, komplett kostenlos, funktioniert auch offline, und auf diesem Projekt ist die Performance-Optimierung fuer Apple-Chips richtig gut gelungen.

Keine Sorge, das ist nicht schwer. Alles, was du brauchst, sind ein paar Zeilen im Terminal. Folg einfach meinen Schritten, und in ein paar Minuten ist alles fertig!

## Vorbereitung

Oeffne dein Terminal (Terminal), dann legen wir los.

### 1. Ein Verzeichnis vorbereiten

Zunaechst suchst du dir einen Ort aus, an dem du das Projekt speichern moechtest.

```bash
cd Projects
cd Python
```

### 2. Code klonen & Abhaengigkeiten installieren

Klon das Projekt direkt von GitHub, und dann nutzen wir `uv`, um die Abhaengigkeiten schnell zu installieren (falls du `uv` noch nicht kennst, kann ich es nur wahnwitzig empfehlen – ein absolutes Gamechanger fuer Python-Umgebungsmanagement).

```bash
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv sync
```

*(Hier kurz warten, bis der Fortschrittsbalken durchlaeuft.)*

### 3. Mac-"Leistung" ueberpruefen

Nach der Installation nicht gleich losrennen – pruef zuerst, ob dein Apple-Chip (MPS-Beschleunigung) richtig erkannt wird.

```bash
uv run python -c "import torch; print(f'MPS check: {torch.backends.mps.is_available()}')"
```

Sobald das Terminal **`MPS check: True`** zurueckgibt, ist alles in Ordnung – die Grafikkarte ist bereit fuer den Einsatz!

## Starten und Ausfuehren

### 4. Dienst starten

Nichts Grossartiges zu sagen, einfach ausfuehren:

```bash
uv run acestep
```

### 5. Webinterface oeffnen und loslegen

Wenn das Terminal fertig ist, oeffne deinen Browser und gib ein: `127.0.0.1:7860`

Jetzt solltest du die ACE-Step-Benutzeroberflaeche sehen.

**Hier gibt es ein paar wichtige Punkte zu beachten:**

- **Richtige Konfiguration waehlen**: Waehle auf der Oberflaeche die Groesse des Modell-VRAM. Schau nach, wie viel Unified Memory dein Mac hat – in meiner Demo waehle ich zum Beispiel **16-20GB**.
- **Initialisierung**: Klicke auf **"Initialize Service"**.
  - Achtung: Beim ersten Start wird das Modell automatisch heruntergeladen. Die Datei ist recht gross, daher bleibt hier fuer eine Weile alles stehen – das ist normal! Hol dir einen Kaffee und warte geduldig, bis alles konfiguriert ist.

### 6. Dein erstes AI-Musikstueck generieren

Wenn die Umgebung steht, ist die Bedienung wirklich kinderleicht:

1. Wechsle in den **"Simple"**-Modus.
2. Gib einen Prompt ein – wenn du nicht weisst, was du schreiben sollst, gib einfach `easy example` ein.
3. Klicke auf **"Create Sample"**. Dann siehst du, dass sich unten automatisch eine Menge komplexer Parameter ausgefuellt haben (Custom-Bereich) – einfach ignorieren.
4. Klicke ganz unten auf **"Generate Music"**.

Fertig! Warte kurz, bis der Fortschrittsbalken durchlaeuft, und du kannst die Musik hoeren, die deine lokale Grafikkarte "ausgerechnet" hat.
