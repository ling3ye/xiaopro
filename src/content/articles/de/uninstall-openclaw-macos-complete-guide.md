---
title: "MacOS: OpenClaw richtig und vollstandig deinstallieren (nicht nur halb)"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-12
intro: "Du dachtest, ein Klick auf «Deinstallieren» reicht? OpenClaw hinterlasst auf MacOS Spuren an drei Orten: Workspace-Verzeichnis, npm-Globalbefehl und .zshrc-Umgebungsvariablenkonfiguration. Wenn auch nur einer dieser Orte nicht sauber bereinigt wird, kann das zu Terminal-Fehlern oder Problemen bei der Installation neuer Tools fuhren. Dieser Artikel dokumentiert die vollstandigen Deinstallationsschritte mit Screenshots — in 5 Minuten erledigt, keine Ruckstande."
image: "https://img.lingflux.com/2026/03/57911d1d24d0ad3cb8aadbf57ea7fafc.jpg"
tags: ["OpenClaw deinstallieren", "OpenClaw Removal", "MacOS vollstandig loschen", "npm global deinstallieren"]
---

Viele Leute sehen nach der Deinstallation von OpenClaw beim erneuten Offnen des Terminals noch immer eine Reihe von Fehlermeldungen, oder bei der Installation neuer Tools kommt es zu unerklarlichen Konflikten mit Umgebungsvariablen. Der Grund ist einfach: **Du hast nur die «Oberflache» entfernt — an drei weiteren Orten verstecken sich noch Uberbleibsel.**

Dieser Artikel dokumentiert die vollstandigen Deinstallationsschritte mit Screenshot-Erlauterungen — in 5 Minuten erledigt, spurlos verschwunden.



## Vor der Deinstallation

⚠️ Bevor es losgeht: Zuerst deine Arbeitsdateien sichern

Gehe zum OpenClaw-Workspace (Standardmassig unter MacOS unter: ~/.openclaw/workspace) und sichere die darin enthaltenen Dateien. Dort konnten sich von dir konfigurierte **Konfigurationsdateien, Skill-Dateien, Projektdateien** usw. befinden.

Der Deinstallationsvorgang wird dieses Verzeichnis automatisch loschen. Bevor du loslegst, also alle benotigten Dateien an einen anderen Ort kopieren.



## Deinstallation starten

Terminal offnen und folgenden Befehl eingeben:

```bash
openclaw uninstall
```

Nach der Ausfuhrung fragt das Programm, welche Komponenten du entfernen mochtest. **Empfehlung: Alle auswahlen** (mit der Leertaste markieren), so wird am grundlichsten aufgeraumt.

Nach der Auswahl mit Enter bestatigen. Es erfolgt eine weitere Ruckfrage zur Bestatigung der Loschung — **Yes** wahlen.

Das Deinstallationsprogramm startet dann. Es erscheint etwa folgendes Bild:

![ScreenShot_2026-03-12_204743_136 (1)](https://img.lingflux.com/2026/03/cdb2215144cdaa58c3d7f26b61bee3a6.png)

Beachte die Hinweismeldung — hier wird dir mitgeteilt, dass **der OpenClaw-Befehl in der CLI noch nicht entfernt wurde**. Das ist die erste Stelle, die leicht ubersehen wird und separat behandelt werden muss.



## Mit dem NPM-Befehl OpenClaw aus der CLI entfernen

Warum muss das separat gemacht werden? Weil das Kommandozeilen-Tool von OpenClaw uber npm global installiert wurde — es gehort nicht zum Anwendungskern, und das offizielle Deinstallationsprogramm kummert sich nicht darum.

In der Kommandozeile eingeben:

```bash
npm uninstall openclaw -g
```

Damit wird der openclaw-Befehl aus der CLI entfernt. Nach der Ausfuhrung sieht es etwa so aus:

![Weixin Image_20260312205126_397_55 (1)](https://img.lingflux.com/2026/03/6d07540cdb4de7cd36eddf7b9cb627be.png)

Nach diesem Schritt ist der Befehl `openclaw` aus deinem System verschwunden. Aber noch nicht ganz —



## Die OpenClaw-Umgebungsvariablenkonfiguration in .zshrc bereinigen

Das ist **der am haufigsten ubersehene und gleichzeitig fehleranfalligste** Schritt.

Bei der Installation schreibt OpenClaw automatisch einen Konfigurationsblock ans Ende der Datei `~/.zshrc`, um das Autovervollstandigungsskript zu laden. Selbst wenn die ersten zwei Schritte erledigt sind, bleibt dieser Code dort stehen. Bei jedem Offnen des Terminals wird versucht, eine Datei zu laden, die gar nicht mehr existiert — was zu Fehlermeldungen fuhrt.

Unter MacOS die .zshrc-Datei im Benutzerverzeichnis finden (~/.zshrc). Das ist eine versteckte Datei — versteckte Dateien anzeigen, z. B. im Benutzerverzeichnis den Kurzbefehl (Shift + Command + .) verwenden, um versteckte Dateien einzublenden. Mit einem Texteditor offnen (oder in der Kommandozeile `nano ~/.zshrc` zum Bearbeiten).



Den folgenden Codeblock suchen und komplett loschen:

```tex
# OpenClaw Completion
source "/Users/{Dein-Benutzername}/.openclaw/completions/openclaw.zsh"
```

Den folgenden Codeblock suchen und komplett loschen:

![ScreenShot_2026-03-12_205815_641 (1)](https://img.lingflux.com/2026/03/eb7706d1300a594edd849b787c740a8c.png)

Nach dem Loschen die Datei speichern. Wenn du nano verwendest: `Control + X` drucken, dann `Y` zum Bestatigen.

Das Terminal (Kommandozeilen-Programm) schliessen.

Beim nachsten Offnen des Terminals ist OpenClaw komplett vom System entfernt — dieser Lobster ist Geschichte.



## Fazit

Zusammenfassend muss OpenClaw an drei Stellen bereinigt werden — kein Schritt darf fehlen:

1. **`openclaw uninstall` ausfuhren** — Anwendungskern und Workspace entfernen
2. **`npm uninstall openclaw -g` ausfuhren** — globalen CLI-Befehl entfernen
3. **`~/.zshrc` bearbeiten** — Autovervollstandigungskonfiguration entfernen

Der gesamte Vorgang dauert weniger als 5 Minuten. Der Reihe nach erledigen, und du kannst dich endgultig von diesem Lobster verabschieden 🦞 — keine Ruckstande.

###  Prufen, ob die Deinstallation vollstandig ist

Nach den drei Schritten kann mit folgendem Befehl bestatigt werden, ob OpenClaw vollstandig vom System entfernt wurde:

```bash
which openclaw
```

Wenn keine Ausgabe erfolgt, ist die Deinstallation gelungen. Wenn noch ein Pfad zuruckgegeben wird, prufen, ob im globalen npm-Verzeichnis noch Uberbleibsel vorhanden sind:

```bash
npm list -g --depth=0
```

In der Ausgabeliste bestatigen, dass `openclaw` nicht mehr aufgefuhrt ist.

Wenn dieser Artikel geholfen hat, gerne speichern und an Freunde weiterleiten, die ebenfalls OpenClaw verwenden.
