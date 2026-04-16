---
title: "Direkt mit AI in WeChat chatten? OpenClaw mit ClawBot – Praxis-Tutorial (offiziell unterstuetzt, kein Kontoban)"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-22
intro: "WeChat hat offiziell eine Plugin-Schnittstelle freigegeben – ClawBot direkt mit OpenClaw in WeChat nutzen. Dieser Artikel bietet eine vollstaendige Installationsanleitung und Loesungen fuer haeufige Probleme."
image: "https://img.lingflux.com/2026/03/e0160b21b299a1ed5acdb00b763871a7.png"
tags: ["openclaw", "clawbot", "WeChat Plugin", "WeChat AI", "OpenClaw Tutorial", "WeChat AI"]
---


WeChat hat offiziell eine Plugin-Schnittstelle freigegeben, mit der du OpenClaws ClawBot direkt in WeChat einbinden kannst – keine Drittanbieter-Hacks, keine Sorge vor Kontoban. Ab Version v8.0.70 ist das Feature verfuegbar.

Dieser Artikel dokumentiert den kompletten Ablauf, den ich selbst erfolgreich durchlaufen bin – inklusive der Stellen, wo es haengt, und wie man drum herum kommt.

---

## Voraussetzung: WeChat-Version muss v8.0.70 oder hoeher sein

Der Plugin-Eingang ist eine Funktion, die es nur in neueren Versionen gibt. Wenn deine Version zu alt ist, findest du den Punkt nicht.

Nach dem Update **WeChat manuell schliessen und neu oeffnen** – nicht nur in den Hintergrund wechseln, sondern wirklich beenden und neu starten. Bei mir war der Plugin-Eingang anfangs auch nicht sichtbar, weil ich nicht neu gestartet hatte. Einmal neugestartet, und da war er.

---

## Methode 1: Offizieller Ablauf (bei gluecklichem Verlauf 5 Minuten)

### Schritt 1: Deinen persoenlichen Installationsbefehl finden

In der WeChat-App auf dem Handy diesen Pfad folgen:

**"Ich" -> "Einstellungen" -> "Plugins" -> ClawBot finden -> "Details"**

![ClawBot Plugin-Detailseite](https://img.lingflux.com/2026/03/f78858448a52037587812f6a540d9166.png)

Hier wird ein persoenlicher Befehl angezeigt im Format:

```bash
npx -y @tencent-weixin/openclaw-weixin-cli@latest install
```

Der Befehl ist fuer jedes Konto etwas anders. Kopiere den von deiner eigenen Seite.

### Schritt 2: Befehl auf dem Geraet mit OpenClaw ausfuehren

Terminal oeffnen, Befehl einfuegen, Enter druecken, warten bis die Installation durchlaeuft.

![Terminal fuehrt Installationsbefehl aus](https://img.lingflux.com/2026/03/9118db862fbd4f96c48fe012cec2241c.png)

### Schritt 3: QR-Code scannen und koppeln

Nach Abschluss der Installation wird im Terminal ein QR-Code angezeigt. Mit WeChat scannen und auf dem Handy die Autorisierung bestaetigen.

### Schritt 4: In WeChat ClawBot finden und Nachricht senden

Nach erfolgreicher Kopplung erscheint ClawBot in WeChat. Einfach eine Nachricht senden und loslegen.

---

## Methode 2: Manuelle Loesung wenn die Installation haengt

Wenn dein Terminal bei "Plugin wird installiert..." laenger als zwei bis drei Minuten stehen bleibt ohne jegliche Reaktion – warte nicht laenger, der Prozess ist abgestuerzt. `Ctrl+C` zum Abbrechen oder das Terminal-Fenster direkt schliessen, und stattdessen diesen manuellen Ablauf nutzen. Genau so habe ich es bei mir ans Laufen bekommen.

### Schritt 1: OpenClaw Gateway stoppen

```bash
openclaw gateway stop
```

### Schritt 2: Sicherstellen, dass der Prozess komplett beendet ist

```bash
pkill -f openclaw
```

### Schritt 3: Plugin manuell per npm installieren

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
```

### Schritt 4: Plugin aktivieren

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

### Schritt 5: QR-Code-Bindung ausloesen (entscheidender Schritt)

```bash
openclaw channels login --channel openclaw-weixin
```

QR-Code im Terminal -> mit WeChat scannen -> auf dem Handy Autorisierung bestaetigen -> wenn "Verbindung mit WeChat erfolgreich" erscheint, ist die Bindung fertig.

![WeChat-Verbindung erfolgreich](https://img.lingflux.com/2026/03/b6e5065e87d9175a8499d84e32cf0964.png)

### Schritt 6: Gateway neu starten

Dieser Schritt wird leicht vergessen, aber ohne Neustart reagiert ClawBot nicht auf Nachrichten.

```bash
openclaw gateway restart
```

---

## Ueberpruefen, ob alles funktioniert

Zurueck in WeChat, ClawBot finden, irgendeine Nachricht hinschreiben. Wenn eine Antwort kommt, hat alles geklappt.

![ClawBot antwortet normal in WeChat](https://img.lingflux.com/2026/03/6a7c383c20c33490baa5b8cbcba4f1d0.png)

---

## Haeufige Probleme – Schnelltabelle

| Problembeschreibung | Loesung |
|---|---|
| Installationsbefehl bleibt bei "Plugin wird installiert..." stehen | Nicht laenger warten, direkt Methode 2 nutzen |
| Keine Reaktion auf dem Handy nach dem QR-Code-Scan | WeChat komplett beenden und neu oeffnen, Scan wiederholen |
| ClawBot antwortet nicht nach Gateway-Neustart | Pruefen, ob die "enabled"-Konfiguration aus Schritt 4 wirklich gespeichert wurde |

---

Der obige Ablauf wurde auf macOS erfolgreich getestet. Unter Windows sind die Befehle im Terminal identisch, nur bei Pfadangaben auf Backslashes achten.
