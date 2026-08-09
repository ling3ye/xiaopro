---
title: "CH32V307 auf dem Mac von null an besiegen: Vom 'Windows-Viren-Haufen' zur blinkenden LED und sprechenden seriellen Schnittstelle – mein komplettes Stolperstein-Tagebuch"
domain: hardware
platforms: ["mac"]
format: "tutorial"
date: 2026-08-08
intro: "Die CH32V307-Entwicklungsumgebung auf dem Mac von null aufzubauen, und nach der Installation der PlatformIO-Plattform stopft dir die Toolchain eine Handvoll Windows-.exe zu? Dieser Artikel hält sich exakt an den tatsächlichen Leidensweg: manuell auf die macOS-native RISC-V-Toolchain wechseln, die Gatekeeper-Quarantäne aufheben, das Onboard-WCH-Link zum Flashen überreden – und dann bis zu der Stelle graben, wo „Kompilieren und Flashen klappen, die serielle Schnittstelle liefert Output, aber die LED will verdammt noch mal nicht leuchten\" seinen wahren Grund findet: die Onboard-LED ist ab Werk schlicht nicht mit dem MCU verbunden. Alle Kommandos und Fehlermeldungen sind wirklich so mitgelaufen, alle zehn Fallgruben kommen ohne Ausnahme auf den Tisch – als Vorsorge-Impfung für alle, die von Arduino/ESP herüberwechseln."
tags: ["CH32V307", "CH32V macOS Entwicklung", "PlatformIO", "WCH-Link", "WCH", "RISC-V Mikrocontroller", "Eingebettete Entwicklung Mac"]
image: https://img.lingflux.com/2026/08/d9106f173bc51c93033527dd5e206b04.png
---

> Lingshun Lab · Eingebettete-Stolpersteine-Serie
>
> Hardware: **CH32V307V-EVT-R1** (mit Onboard-WCH-Link-Debugger, WCH RISC-V Chip)
> System: **macOS (Apple Silicon, arm64)**
> Tools: VSCode + PlatformIO
> Ziel: Die Entwicklungsumgebung von null an aufbauen, eine LED zum Blinken bringen und die serielle Schnittstelle zum Sprechen bringen – das in Embedded-Kreisen anerkannte „Hello World"

## Erstmal vorab: Warum es diesen Artikel gibt

Vorab kurz zu meiner „Persona" in diesem Artikel – damit du bei einigen meiner späteren Aktionen nicht unwillkürlich murst „Hat der Typ überhaupt schon mal was für Mikrocontroller geschrieben?" –

Ich schraube mittlerweile schon einige Jahre an Arduino und ESP-IDF herum: eine LED blinken lassen, WLAN verbinden und MQTT laufen lassen sind reine Muskelmemorie, ich bekomme eine LED praktisch mit geschlossenen Augen zum Leuchten. Als ich also dieses CH32V307-Board in der Hand hielt, dachte ich mir: „Wie schwer kann es schon sein, nur weil es ein anderer Chip ist?"

Die Realität hat mir dann aber eine deutliche Lektion erteilt. Die „Werkseinstellungen" der CH32-Ecosystem-Welt passen überhaupt nicht zu der „einstecken, flashen, richtig schreiben – und sie leuchtet"-Welt von Arduino und ESP:

- **Um ein Programm zu flashen, braucht es einen eigenen Flasher**: Bei Arduino und ESP32 erledigt ein einziges USB-Kabel Stromversorgung, Flashen und serielle Schnittstelle in einem; die CH32-Seite drückt mir dagegen einen Onboard-Debugger namens **wlink** in die Hand, und allein zu kapieren, „warum dieses Ding überhaupt Firmware in den Chip kriegt", hat mich mehrere Runden gekostet.
- **Die Onboard-LED ist nicht mal mit dem MCU verbunden**: Bei Arduino hängt die Onboard-LED fest auf Pin 13, ein `digitalWrite(13, HIGH)` reicht und sie leuchtet; die User-LED dieses Boards … **ist ab Werk quasi „kaputt-angeschlossen", also an gar keinen Pin angebunden**. Ich musste erst mit einem Dupont-Kabel rüberfliegen, bevor die LED gütigst das Leuchten für wert befand.
- **Auch der serielle Port will richtig angesprochen sein**: Beim ESP32 ist nach dem Einstecken sofort der USB-Seriell-Port da – What You See Is What You Get; beim CH32 läuft dagegen standardmäßig ein vom Debugger virtuell durchgereichter USART1, und wenn der Port nicht zusammenpasst, herrscht gähnende Leere, die dich dazu bringt, am leeren Monitor zu zweifeln, ob das Board vielleicht kaputt ist.

In dem Moment habe ich am eigenen Leib gespürt, was „ein Veteran baut schmerzhafte Fehler" heißt – ich habe über zehn Jahre lang LEDs blinken lassen, und ausgerechnet an einem RISC-V-Mikrocontroller bin ich so sehr hängengeblieben, dass ich kurz davor war, zu glauben, alles, was ich in all den Jahren über Embedded gelernt habe, sei für die Katz gewesen.

Also ist dies nicht einfach ein „Tutorial", sondern das **Stolperstein-Tagebuch** eines Arduino/ESP-Veterans, der zum ersten Mal mit dem CH32 spielt. All meine absurden Anfängerfehler, die ein Profi nur mit dem Kopf schütteln wird, kommen ungeschönt auf den Tisch – denn für jemanden wie dich, der ebenfalls von Arduino/ESP kommt, stehen die Chancen gut, dass du genau dieselben Fehler noch mal machst. Betrachte es als Vorsorge-Impfung; die kommenden Fallgruben wirken danach gleich viel vertrauter.

---

Persönlichkeit abgehakt, zurück zum Eigentlichen. Wenn du nach „CH32V307 + Windows" suchst, findest du die offizielle MounRiver Studio, die sich nach der Installation einfach nutzen lässt; suchst du nach „CH32V307 + Linux", wird dich die offizielle Toolchain ebenfalls rundum versorgen.

Suchst du aber nach „CH32V307 + macOS" … wirst du wahrscheinlich in betretenem Schweigen verfallen. Die Dokumente sind verstreut, und überall lauern dunkle Löcher. Der Chip selbst ist nämlich ziemlich kampfstark – 32-Bit-RISC-V-Kern, bis zu 144 MHz, preistechnisch lässt er eine ganze Reihe von ARM-Mikrocontrollern alt aussehen – nur auf dem Mac führt er ein echtes Aschenputtel-Dasein.

Dieser Artikel ist das vollständige Protokoll davon, wie ich auf dem Mac die CH32V307-Entwicklungsumgebung von null aufgebaut, mich die ganze Zeit durchgehangelt und -gegraben und am Ende die LED plus serielle Schnittstelle zum Laufen gebracht habe. **Ich überspringe keine einzige Fallgrube**, denn du wirst höchstwahrscheinlich in genau dieselben tappen – alle offen auf dem Tisch bedeutet für dich viele Umwege weniger. Den konkreten Code habe ich auf GitHub geparkt (Link ganz am Ende); dieser Artikel hier kümmert sich um das „Warum macht man das so?".

Kurz schon mal der Spoiler zum Endergebnis: Kompilieren erfolgreich, Flashen erfolgreich, die LED auf dem Board blinkt in einem festen Takt, und im seriellen Monitor erscheint synchron:

```
CH32V307 gebootet, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

Vom „gar nichts" bis zu diesem Bild habe ich mindestens **8 Fallgruben** eingesammelt. Weiterlesen, es fehlt keine.

### Inhaltsverzeichnis

- [1. Lernen wir den Hauptdarsteller kennen: CH32V307V-EVT-R1](#1-lernen-wir-den-hauptdarsteller-kennen-ch32v307v-evt-r1)
- [2. Grobüberblick: Wie diese Toolchain aufgebaut ist](#2-grobüberblick-wie-diese-toolchain-aufgebaut-ist)
- [3. Los gehts: Von der VSCode-Installation bis zum pio-Kommando](#3-los-gehts-von-der-vscode-installation-bis-zum-pio-kommando)
- [4. Die CH32V-Plattform installieren (und die erste kleine Falle)](#4-die-ch32v-plattform-installieren-und-die-erste-kleine-falle)
- [5. Die große Falle: Warum da ein Haufen .exe-Dateien landet](#5-die-große-falle-warum-da-ein-haufen-exe-dateien-landet)
- [6. Falle entschärft: Auf die macOS-native Toolchain wechseln](#6-falle-entschärft-auf-die-macos-native-toolchain-wechseln)
- [7. Gatekeeper-Quarantäne aufheben](#7-gatekeeper-quarantäne-aufheben-sonst-hält-macos-alles-für-einen-virus)
- [8. Prüfen, ob die Toolchain wirklich läuft](#8-prüfen-ob-die-toolchain-wirklich-läuft)
- [9. Erstes Projekt anlegen: platformio.ini verstehen](#9-erstes-projekt-anlegen-platformioini-verstehen)
- [10. Der erste Build](#10-der-erste-build)
- [11. pio als globales Kommando einrichten](#11-pio-als-globales-kommando-einrichten)
- [12. Hardware anschließen und flashen](#12-hardware-anschließen-und-flashen)
- [13. Falle 1: Build und Flash klappen, aber die serielle Schnittstelle ist tot](#13-falle-1-build-und-flash-klappen-aber-die-serielle-schnittstelle-ist-tot)
- [14. Falle 2 (die größte überhaupt): Die serielle Schnittstelle spricht, aber die LED will nicht leuchten](#14-falle-2-die-größte-überhaupt-die-serielle-schnittstelle-spricht-aber-die-led-will-nicht-leuchten)
- [15. Wenn alles läuft: Wie die vollständige main.c aussieht](#15-wenn-alles-läuft-wie-die-vollständige-mainc-aussieht)
- [16. Stolperstein-Übersichtstabelle](#16-stolperstein-übersichtstabelle)
- [17. Kommando- & Pfad-Spickzettel](#17-kommando---pfad-spickzettel)
- [18. Eine eigene CH32-Entwicklungslogik aufbauen](#18-eine-eigene-ch32-entwicklungslogik-aufbauen)
- [19. Häufige Fragen (FAQ)](#19-häufige-fragen-faq)
- [20. Was man danach noch spielen kann](#20-was-man-danach-noch-spielen-kann)
- [21. Referenzen](#21-referenzen)

---

## 1. Lernen wir den Hauptdarsteller kennen: CH32V307V-EVT-R1

Bevor wir loslegen, lass uns zwei Minuten investieren, um dieses Board kennenzulernen – denn 90 % aller späteren Fallgruben hängen mit seiner „Persönlichkeit" zusammen.

| Merkmal | Beschreibung |
| --- | --- |
| Hauptchip | CH32V307VCT6, WCH QingKe V4F Core, 32-Bit RISC-V, bis zu **144 MHz**, LQFP80-Gehäuse |
| Tatsächliche Flash-Größe | **288 KB** (PlatformIO kompiliert aber standardmäßig für 256 KB Flash + 64 KB SRAM; später erkläre ich, warum man das nicht ändern muss) |
| Onboard-Debugger | **WCH-Link** (eigentlich ein CH32V305-Chip, der diese Rolle „spielt"; entspricht dem offiziellen WCH-LinkE) |
| USB-Anschluss | Ein einziges USB-Kabel übernimmt Stromversorgung, Debugging und virtuelle serielle Schnittstelle in einem |
| User-LED | LED1 und LED2 – **⚠️ werkseitig freischwebend, nicht mit dem MCU verbunden!** (das ist die größte Falle in diesem Artikel, ausführlich in Kapitel 14) |
| User-Taster KEY | Ebenso werkseitig freischwebend |
| Power-LED | Eine Stück, leuchtet dauerhaft, sobald Strom anliegt, und hat absolut nichts mit deinem Code zu tun – viele denken beim ersten Anschließen „LED an!", obwohl es nur die Stromversorgungs-LED ist |

Auf dem Board gibt es noch eine leicht zu übersehende Details: zwischen dem Onboard-Debugger-Chip (CH32V305) und dem Zielchip (CH32V307) sind ab Werk **4 Jumper-Kappen** (Silk-Druck `RX1-TX0`, `TX1-RX0`, `DIO-DIO0`, `CLK-CLK0`) als Brücke gesteckt, die das SWIO-Signal und die seriellen Signale des Debuggers auf den Zielchip „hinüberbrücken".

> ⚠️ **Diese 4 Jumper sitzen ab Werk richtig, fummel nicht einfach daran herum**. Ziehst du sie, flasht es im besten Fall nicht mehr, im schlimmsten Fall verabschiedet sich die serielle Schnittstelle sang- und klanglos, und du glaubst, dein Code sei falsch – dabei ist nur die Hardware-Leitung unterbrochen. Wenn du dann ewig suchst und am Ende feststellst, dass es die Jumper waren, wird dir speiübel. Frag mich nicht, wie ich das weiß.

Gut, Person vorgestellt, jetzt bauen wir die Umgebung auf.

---

## 2. Grobüberblick: Wie diese Toolchain aufgebaut ist

Vorab ein „Familienfoto", damit klar ist, wer hier wem untergeordnet ist:

```
┌──────────────────────────────────────────────────────────┐
│  VSCode + PlatformIO IDE Erweiterung (GUI: Build/Flash/Debug/Seriell) │
│                          │                                │
│                   PlatformIO Core (pio Kommandozeile)     │
│                          │                                │
│            ┌─────────────┴──────────────┐                 │
│       ch32v Plattform (Community: Community-PIO-CH32V)    │
│            │                             │                 │
│   ┌────────┼─────────┬───────────┐       │                 │
│ toolchain  wlink    openocd    board     │                 │
│(RISC-V GCC)(Flasher)(Debugger) (Board)   │                 │
└──────────────────────────────────────────┘
                     │ USB
        CH32V307V-EVT-R1 (Onboard-WCH-Link)
```

![](https://img.lingflux.com/2026/08/73dff7f41fe1d3c38d06447b98a39f2b.png)

**In einem Satz**: Die PlatformIO-Erweiterung in VSCode ist das Frontend; die eigentliche Arbeit macht das Kommandozeilen-Tool `pio`; `pio` wiederum verlässt sich auf eine Community-Plattform namens `Community-PIO-CH32V`, die „Compiler (Toolchain) + Flash-Tool (wlink) + Debug-Tool (openocd) + Board-Parameter (board)" zu einem Paket schnürt, das theoretisch nach einmaliger Installation sofort funktionieren sollte.

Diese Community-Plattform ist sogar ziemlich luxuriös bestückt: Sie unterstützt nativ die ganze CH32V003/103/203/30x-Familie und bietet als Frameworks unter anderem WCHs offizielle Peripheriebibliothek (noneos-sdk), FreeRTOS, RT-Thread, Arduino und ch32fun zur Auswahl.

Aber – und hier kommt die größte Wende des ganzen Artikels – **diese Plattform ist standardmäßig nach den Gewohnheiten von Windows-Nutzern konfiguriert**, und macOS-Nutzer stehen nach der Installation ziemlich oft wie der Ochs vorm Berg. Wie genau, wird gleich offenbart.

---

## 3. Los gehts: Von der VSCode-Installation bis zum pio-Kommando

### Step 0: Basisumgebung prüfen

Terminal auf, erst mal den Stand sondieren:

```bash
python3 --version          # benötigt 3.x
brew --version              # Homebrew, nicht zwingend, aber sehr empfohlen
uname -m                    # Apple Silicon liefert arm64, Intel-Mac x86_64
```

Dann VSCode + die PlatformIO-Erweiterung installieren:

1. Unter https://code.visualstudio.com/ VSCode herunterladen und installieren.
2. VSCode öffnen, links auf das „Erweiterungen"-Symbol → nach `PlatformIO IDE` suchen → Install.
3. Nach der Installation lädt die Erweiterung automatisch das PlatformIO-Core selbst nach `~/.platformio/` (ein paar hundert MB inkl. einer eigenen Python-Virtual-Environment); unten rechts läuft ein Fortschrittsbalken – ein paar Minuten Geduld.

Danach taucht in der linken Seitenleiste ein Ameisen-Symbol auf, das ist das PlatformIO-Logo (ihr Maskottchen ist tatsächlich eine Ameise).

### Step 1: Das versteckte pio-Kommando finden

Nach der Installation der Erweiterung ist das Kommandozeilen-Tool `pio` zwar schon da, aber nicht im System-PATH; wenn du im Terminal einfach `pio` eintippst, findest du es nicht. Es liegt hier:

```bash
~/.platformio/penv/bin/pio
```

Kurz prüfen:

```bash
~/.platformio/penv/bin/pio --version
# PlatformIO Core, version 6.1.19
```

Damit die folgenden Befehle angenehmer zu tippen sind, legen wir erst mal eine temporäre Variable an (nur im aktuellen Terminal-Fenster gültig):

```bash
PIO=~/.platformio/penv/bin/pio
```

Mit `$PIO` ist in allen Kommandos dieses Artikels genau dieser Pfad gemeint. Sobald alles läuft, richten wir in Schritt 11 ein globales Kommando ein, sodass du künftig einfach `pio` tippen kannst.

---

## 4. Die CH32V-Plattform installieren (und die erste kleine Falle)

Die Community-Plattform über den Paketmanager von PlatformIO installieren:

```bash
$PIO pkg install -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git
```

Bei diesem Schritt gibt es zwei Details, an denen man leicht ausrutscht:

> **Falle 1: Der Organisationsname ist fehlerträchtig.** Der korrekte GitHub-Organisationsname heißt `Community-PIO-CH32V` (beachte die drei Buchstaben **PIO** in der Mitte, und zwar großgeschrieben). Eine Reihe älterer Artikel und Posts schreiben `community-ch32v` (ohne PIO) – tippst du das ein, landet bei dir eine ziemlich frustrierende Fehlermeldung:
> ```
> remote: Repository not found.
> ```
> Bitte exakt `Community-PIO-CH32V` abtippen.

> **Falle 2: Veraltete Kommando-Syntax.** Frühere Tutorials schreiben gerne `pio platform install ...` – dieses Kommando ist in neueren PlatformIO-Versionen **deprecated** und quittiert mit `This command is deprecated`. Heute nimmt man einheitlich die Schreibweise `pio pkg install -g -p <Adresse>`.

Das Kommando zieht nacheinander Plattform-Körper, RISC-V-Toolchain, openocd und wlink. Sieht alles bestens aus, die Logs werfen keinen Fehler. **Aber jetzt bitte noch keinen Sekt entkorken** – die richtige große Falle kommt erst.

---

## 5. Die große Falle: Warum da ein Haufen .exe-Dateien landet

Das ist der gehaltvollste Abschnitt dieses Artikels, und genau hier bleiben die meisten macOS-Nutzer hängen und fangen an, am Leben zu zweifeln.

Nach der Installation schauen wir uns an, wie die tatsächlich heruntergeladene Toolchain aussieht:

```bash
ls ~/.platformio/packages/toolchain-riscv/bin/ | head
# riscv-none-embed-addr2line.exe
# riscv-none-embed-ar.exe
# riscv-none-embed-as.exe
# ...
```

Und kurz das Flash-Tool wlink gecheckt:

```bash
file ~/.platformio/packages/tool-wlink/wlink.exe
# PE32 executable (console) Intel 80386, for MS Windows
```

Siehst du? Alles **`.exe`** – ausgewachsene Windows-PE32-Binaries, die auf macOS nicht weiter als ein Haufen Schrott sind, sich nicht mal per Doppelklick öffnen lassen, geschweige denn Code kompilieren. Wie man sich beim ersten Anblick fühlt? Etwa so: „Ich sitz am Mac, und du schickst mir Windows-Zeug – was soll das?"

### Der Ursache auf der Spur: Es liegt an `platform.json`

Wir schauen in die Konfigurationsdatei der Plattform:

```bash
cat ~/.platformio/platforms/ch32v/platform.json | python3 -m json.tool | grep -A3 toolchain-riscv
```

Das Ergebnis sieht so aus:

```json
"toolchain-riscv": {
  "type": "toolchain",
  "owner": "platformio",
  "version": "https://github.com/Community-PIO-CH32V/toolchain-riscv-windows.git"
}
```

**Jetzt ist alles klar**: Diese Konfigurationsdatei hat die Toolchain-Quelle **hart auf** `toolchain-riscv-windows.git` **codiert**, und auch das Flash-Tool wlink ist fest auf den `#windows`-Branch genagelt. Bei der Installation prüft PlatformIO keineswegs intelligent „welches System hast du" – was in der Konfiguration steht, wird installiert, und zwar für alle gleich, Windows-Version inklusive – und damit auch für uns arme Mac-Nutzer.

**Die gute Nachricht**: Dieselbe `Community-PIO-CH32V`-Organisation hat Repos mit nativen macOS-Builds schon lange fertig, sie sind nur nicht der Default. Damit ist die Ursache geklärt und die Gegenmaßnahme liegt auf der Hand – **die beiden Windows-Pakete manuell gegen die macOS-nativen Versionen austauschen**. Wie genau und worauf an jedem Schritt zu achten ist, steht im nächsten Kapitel.

---

## 6. Falle entschärft: Auf die macOS-native Toolchain wechseln

### 6.1 Den RISC-V-Compiler austauschen

Zuerst die falsche Windows-Version löschen:

```bash
rm -rf ~/.platformio/packages/toolchain-riscv
```

Dann die native macOS-Version installieren:

```bash
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/toolchain-riscv-mac.git
```

Bei Erfolg erscheint etwas in dieser Art:

```
Tool Manager: toolchain-riscv@1.80200.190731+sha.99cb62f has been installed!
```

Danach kannst du prüfen, dass in ihrer `package.json` `"system": ["darwin_x86_64", "darwin_arm64"]` steht – sie ist also für macOS gedacht, und der Paketname bleibt `toolchain-riscv`, sodass sie den alten Windows-Build nahtlos ersetzt.

> **Warum hier der `main`-Branch und nicht der scheinbar neuere `gcc12`-Branch?**
>
> Hier steckt ein ziemlich verstecktes technisches Detail. Im Build-Skript der Plattform (`builder/main.py`) steht nämlich diese Logik:
> ```python
> is_gcc_12 = platform.get_package_version("toolchain-riscv").split(".")[1].startswith("12")
> compiler_triple = "riscv-wch-elf" if is_gcc_12 else "riscv-none-embed"
> ```
> Auf Deutsch: Das Skript schaut sich den **zweiten Abschnitt der Versionsnummer** deiner installierten Toolchain an. Bei sowas wie `1.8.x` nimmt es an, dass dein Compiler-Executable das Präfix `riscv-none-embed-gcc` hat; bei `1.12.x` geht es von `riscv-wch-elf-gcc` aus. Diese beiden Präfixe stehen für komplett unterschiedliche Executable-Namen, und wenn du was Falsches erwischt, sucht das Build-Skript nach einem Kommando, das gar nicht auf der Platte existiert, und bricht direkt mit Fehler ab.
>
> Der `main`-Branch liefert ausgerechnet die Versionsnummer `1.80200.190731` (entspricht gcc 8.2.0) – identisch mit der vom Standard hartcodierten Windows-Version, löst also den `riscv-none-embed`-Pfad aus und passt exakt zu dem, was das Skript ohnehin erwartet: null Risiko, die stabilste Wahl.

Nach der Installation gibt es eine Detail, das du kennen solltest:

> ⚠️ **Dieser gcc8-Compiler ist selbst ein x86_64-Build**, ist also für Intel-Macs kompiliert und nicht nativ arm64 für Apple Silicon. Der Grund ist einfach: xPack (der upstream-Packager) hatte zur gcc8-Zeit noch gar keine arm64-Builds. Auf einer M-Serie-Mac läuft dieser Compiler also über **Rosetta 2** translyiert. Klingt erst mal „nicht ganz nativ", in der Praxis kompiliert er aber völlig problemlos – keine Sorge. Beim ersten Aufruf schlägt das System vor, Rosetta zu installieren; bestätigen, fertig.

### 6.2 Das Flash-Tool wlink austauschen

Gleiche Prozedur: die Windows-Version von wlink gegen die native macOS-Version tauschen:

```bash
rm -rf ~/.platformio/packages/tool-wlink
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_arm64
```

> Auf einer älteren Intel-Mac heißt der Branch `mac_x64`:
> ```bash
> $PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_x64
> ```

Danach erscheint:

```
Tool Manager: tool-wlink@0.23.241116+sha.0c802d4 has been installed!
```

> **openocd kannst du ignorieren, das ist in Ordnung.** `openocd` (das Debug-Tool) kommt aus dem offiziellen PlatformIO-Registry, nicht direkt von `Community-PIO-CH32V`, und das Registry kann selbstständig die Architektur ans Betriebssystem anpassen. Unter Apple Silicon ist es also bereits der native arm64-Build – kurz nachprüfen:
> ```bash
> file ~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd
> # Mach-O 64-bit executable arm64  ✅ alles gut, kein Problem
> ```

### 6.3 Wichtige Korrektur: Am Ende stabil läuft tatsächlich gcc12 / arm64-nativ

Hier muss ich jetzt einen großen Batzen Wahrheit zwischenschieben – und zwar als **Selbstkorrektur**: Die Herleitung oben in 6.1 („warum der `main`-Branch / gcc8") war eine **theoretische Schlussfolgerung**, die ich damals ausschließlich aus dem Lesen des Build-Skripts gezogen hatte. Die Skriptlogik ist nicht falsch – aber bei der Frage „welche Version nun wirklich stabil läuft", reicht Code-Lesen allein nicht; am Ende muss es auf echter Hardware kompiliert, geflasht und ausgeführt worden sein.

**Der Rückblick auf die Umgebung, die tatsächlich auf dem Board kompiliert, geflasht und zum Laufen gebracht wurde, zeigt: Die wirklich stabile, runde und dazu Apple-Silicon-nativ arm64 (komplett ohne Rosetta) lauffähige Version ist gcc 12.2.0 mit dem Executable-Präfix `riscv-wch-elf-gcc`.** Die früheren Sorgen – „der gcc12-Branch ist heikel, das zugehörige Executable existiert womöglich gar nicht" – haben sich in der Praxis nicht bestätigt: Diese Toolchain ist nicht nur vorhanden, sondern die vollständigste, aktuellste und rund laufendste Variante dieses Compilers, und sie bringt zusätzlich gleich den GDB-Debugger mit, alles in einer Installation.

Die Schlussfolgerung dreht sich also um: **Wenn du jetzt neu installierst, peile direkt gcc 12.2.0 / arm64-nativ / `riscv-wch-elf-gcc` an.** Den gcc8/x86_64-Pfad aus 6.1, der über Rosetta läuft, solltest du lediglich als Fallback im Hinterkopf behalten – falls bei dir diese Version herauskommt, keine Panik, sie funktioniert ebenfalls; du musst sie aber nicht gezielt anstreben.

Dass ich dieses „erst geraten, dann korrigiert" vollständig im Artikel lasse, statt es stillschweigend umzuschreiben, hat seinen eigenen Wert: **Build-Skripte lesen und Versionsnummern-Regeln verstehen hilft dir zu begreifen, „warum etwas so ist" – aber die entscheidende Aussage „welche Version soll ich installieren" musst du am Ende durch echtes Kompilieren und Flashen verifizieren. Wer sich nur auf Code-Schlussfolgerungen verlässt, landet leicht bei einer zu konservativen Empfehlung.**

### 6.4 Die Umgebung final bestätigen: Vollständige technische Spezifikation

Die folgende Tabelle ist die komplette, in allen Details ausgebreitete Ausgabe der Umgebung, mit der der echte Build und Upload funktioniert haben. Am besten orientierst du dich direkt an dieser Konfiguration:

| Kategorie | Komponente / Feld | Wert |
| --- | --- | --- |
| Compiler | Name | xPack GNU RISC-V Embedded GCC (**WCH Custom Build**, identisch mit dem in MounRiver Studio mitgelieferten) |
| Compiler | Executable-Name | `riscv-wch-elf-gcc` (einheitliches Präfix für die gesamte Suite: `riscv-wch-elf-`) |
| Compiler | GCC-Version | **12.2.0** |
| Compiler | Target-Triple | `riscv-wch-elf` |
| Compiler | Build-/Lauf-Host | `aarch64-apple-darwin23.6.0` (**Apple Silicon nativ**, ohne Rosetta) |
| Compiler | Default-ABI | `ilp32` (32-Bit, Softfloat-Aufrufkonvention) |
| Compiler | Default-ARCH | `rv32imac` (I Integer / M Mul-Div / A Atomic / C Compressed) |
| Compiler | ISA spec | 2.2, mit multilib |
| Compiler | Thread-Modell | single (Bare-Metal, ohne OS) |
| Compiler | C-Standardbibliothek | **newlib 4.2.0** (implementiert Standardfunktionen wie `printf`) |
| Compiler | binutils (Assembler/Linker) | **GNU binutils 2.38** (kommt von hier: `as`, `ld.bfd`, `objcopy`) |
| Compiler | Debugger | Toolchain bringt `riscv-wch-elf-gdb` direkt mit, keine Extra-Installation |
| Compiler | Binary-Pfad | `~/.platformio/packages/toolchain-riscv/bin/` |
| Compiler | sysroot | `~/.platformio/packages/toolchain-riscv/riscv-wch-elf/` |
| Compiler | PIO-Paketname / -version | `toolchain-riscv` @ `1.120200.220829` |
| Compiler | Quelle | xPack (`riscv-none-elf-gcc-xpack`), basierend auf upstream GCC 12.2.0 |
| Build-Umgebung | PlatformIO Core | 6.1.19 |
| Build-Umgebung | Plattform platform-ch32v | 1.1.0 (Community-PIO-CH32V) |
| Build-Umgebung | Framework framework-wch-noneos-sdk | 2.30000.0 (WCH-Standard-Peripheriebibliothek, Bare-Metal) |
| Build-Umgebung | Build-System | PlatformIO-intern (SCons + Python) |
| Build-Umgebung | Zielchip | CH32V307VCT6, ChipID `0x30700568`, QingKe V4F @144 MHz |
| Upload-Umgebung | Upload-Tool | **wlink 0.1.1** (aktuell in Nutzung; PIO-Paket `tool-wlink` @ `0.23.241116`) |
| Upload-Umgebung | Upload-Protokoll | `wlink` (entspricht dem `upload_protocol`-Eintrag in `platformio.ini`) |
| Upload-Umgebung | Debugger-Firmware | WCH-Link v2.18 (v38), Hardware-basis CH32V305 |
| Upload-Umgebung | Alternative: OpenOCD | `0.11.0+dev-snapshot` (2026-02-28), PIO-Paket `2.1100.260228` |
| Upload-Umgebung | Alternative: wchisp | `0.2.3`, PIO-Paket `0.23.240914` |
| Upload-Umgebung | Alternative: minichlink | `0.1.0` |

> Bitte nicht verwechseln: **Die echte Compilerversion ist GCC 12.2.0**; `1.120200.220829` ist hingegen die Nummerierung, die PlatformIO selbst für dieses Paket vergibt (grob zusammengesetzt aus `1.` + `12.2.0` + `0` + Paketdatum `220829`) – also nicht die Versionsnummer des Compilers selbst. Beide nicht durcheinanderbringen.

**Die komplette Toolchain-Suite** (allesamt mit Präfix `riscv-wch-elf-`, insgesamt 30 Executables, eine Installation reicht):

- **Kompilieren/Linken**: `gcc` `g++` `c++` `cpp` `ld` `ld.bfd` `as`
- **Binär-Verarbeitung**: `objcopy` `objdump` `readelf` `nm` `size` `strip` `strings` `addr2line`
- **Archiv-Tools**: `ar` `ranlib` `gcc-ar` `gcc-nm` `gcc-ranlib`
- **Debug/Analyse**: `gdb` `gdb-py3` `gprof` `gcov` `gcov-tool` `gcov-dump`
- **Sonstige**: `gfortran` `elfedit` `c++filt` `lto-dump`

Diese Liste musst du dir nicht merken – leg sie dir als Nachschlagewerk zurecht. Wenn du später sehen willst, wie groß eine Funktion nach dem Kompilieren ist, nimmst du `riscv-wch-elf-size`; für einen Disassembler-Look der erzeugten Instruktionen `riscv-wch-elf-objdump -d`. All diese Tools liegen ab dem Moment, in dem deine Toolchain installiert ist, ruhig und bereit in `~/.platformio/packages/toolchain-riscv/bin/`.

### 6.5 Compiler-Versionen verfolgen und updaten: Wo gibt es die neueste Version, wie update ich?

Eine Toolchain ist nicht einmal installiert und dann für immer erledigt – die Community-Versionen werden fortlaufend gepflegt. Um zu verstehen, „wie man auf dem Laufenden bleibt", musst du aber zuerst eine leicht verwirrende Tatsache ausbaden: **Dein Compiler ist eine „Drei-Schicht-Matrjoschka", und es gibt zwei unterschiedliche „aktuellste Versionen".**

**Zuerst das Modell: Drei Schichten + zwei „Neueste"**

| Schicht | Was sie ist | aktuellste Version | Update-Tempo |
| --- | --- | --- | --- |
| ① Was in deinem PIO wirklich läuft (WCH-Custom-Build) | Mit `riscv-wch-elf`-Triple + den WCH-Patches exklusiv für den QingKe-Kern | **GCC 12.2.0** (genau das hast du installiert) | **Praktisch stillstehend**, langfristig bei 12.2.0 |
| ② Der Packager von ① | Community-PIO-CH32V verpackt ① neu als PIO-Paket | identisch (Release-Name `riscv-none-embed-gcc 12.2.0-3`) | folgt ① |
| ③ Ganz upstream (vanilla) | xPacks generischen RISC-V GCC, **ohne WCH-Patches** | **GCC 15.2.0** (2025-10-23) | fortlaufend aktualisiert, nah an upstream GNU GCC |

> **Wichtiger Hinweis**: Wenn im Netz von „ständig aktualisierten Community-Versionen" die Rede ist, ist Schicht ③ gemeint (xPack, inzwischen 15.2.0), **nicht** die Schicht ①, die dein CH32V real nutzt (WCH-Custom, weiterhin bei 12.2.0). Diese beiden Linien **darfst du nicht durcheinander jagen** – wenn du xPack 15.2.0 einfach an Stelle deines jetzigen Compilers setzt, verlierst du die exklusiven WCH-Patches für den QingKe-Kern, und bestimmte Features des CH32V funktionieren dann eventuell nicht mehr. **Für CH32V-Entwicklung bleibst du bei ①②, anstatt blind der neuesten ③ hinterherzulaufen.**
>
> Nebenbei eine kleine Fertigkeit: Die komplette Identitätskette deines Compilers lautet `riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0` – drei Infos auf einen Blick: `wch-elf` ist das WCH-Custom-Merkmal, `xPack` der upstream-Packager und `arm64` zeigt die Apple-Silicon-native Variante.

**Wie findest du heraus, welche Version du tatsächlich installiert hast?**

```bash
# 1. PIO-Paketversion anzeigen (PlatformIOs eigene Nummer, nicht mit der Compilerversion zu verwechseln)
pio pkg list | grep -i riscv

# 2. Vollständige Identität des Compilers (Version, Target-Triple, ABI, ARCH, Build-Host – dieser Befehl ist der einprägsamste)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc -v

# 3. C-Library-Version (newlib) – printf wird davon implementiert
grep "_NEWLIB_VERSION" ~/.platformio/packages/toolchain-riscv/riscv-wch-elf/include/_newlib_version.h

# 4. binutils-Version (Assembler/Linker)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-ld.bfd --version

# 5. In platform.json nachsehen, auf welche Quelle die Toolchain „festgenagelt" ist (entscheidet, welches Repo beim Update gezogen wird)
grep -A3 '"toolchain-riscv"' ~/.platformio/platforms/ch32v/platform.json
```

**Wo gibt es die neueste Version? (Drei Kanäle, nach Relevanz für dich sortiert)**

- **Kanal 1: WCH offiziell / MounRiver (der echte upstream der WCH-Custom-Variante, am relevantesten).** Das `riscv-wch-elf`-Triple und die WCH-Kern-Patches stammen ursprünglich aus WCHs offiziellem MounRiver Studio – in den Build-Infos deines Compilers steht der Build-Pfad `/Users/mrs/...` (mrs = MounRiver Studio), das ist genau diese Herkunft. Download-Seite `www.mounriver.com` (such nach „MounRiver Studio" und „Toolchain"), das offizielle SDK-Repo liegt unter `github.com/openwch`. Die aktuelle MRS-Toolchain-Reihe ist v1.91 (im Release-Text von Community-PIO-CH32V heißt es wörtlich „Update toolchain to v1.91").
- **Kanal 2: Community-PIO-CH32V-Paket (was dein PIO real nutzt).** Es ist im Kern eine Neuverpackung der MounRiver-WCH-Toolchain als PlatformIO-Paket – wenn du die Releases beobachtest, erfährst du sofort, wann PIO hier nachzieht: `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`. Für Benachrichtigungen oben rechts auf Watch → Custom → Releases setzen, oder den RSS-Feed abonnieren: `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases.atom`.
- **Kanal 3: xPack upstream (vanilla, das schnellste Update, nur zum Kenntnisnehmen)**: Releases unter `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack/releases`, die vollständigste Versionshistorie unter `npmjs.com/package/@xpack-dev-tools/riscv-none-elf-gcc`, aktuell 15.2.0-1.1.

**Wie updatet man? (Und eine Falle, die du unbedingt umgehen musst)**

```bash
# Die gesamte ch32v-Plattform updaten (inkl. Framework und Toolchain – wird erst wirklich aktualisiert, wenn Community-PIO-CH32V eine neue Version released)
pio pkg update -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git

# Oder nur das Toolchain-Paket für sich updaten
pio pkg update -g -t toolchain-riscv
```

> ⚠️ **Beim Update diese Falle umgehen (Querverweis auf Q3 in Kapitel 19)**: In Kapitel 5 hatten wir ausgegraben, dass `platform.json` die Toolchain-Quelle **hart auf das Windows-Repo codiert** hat. Das heißt, sobald du `pio pkg update` laufen lässt oder die Plattform neu installierst, besteht die reale Gefahr, dass deine mühsam manuell getauschte macOS-native Version **wieder mit der Windows-Version überschrieben wird**. Falls das passiert, spielst du die Schritte aus 6.1 / 6.2 einfach noch einmal durch; wer es ein für alle Mal erledigen will, forked das Plattform-Repo, ändert `platform.json` so, dass es standardmäßig auf die macOS-Version zeigt, und hat endgültig Ruhe.
>
> Noch mal die Richtung: Ein Update dient dazu, eine neuere **WCH-Custom-Toolchain** zu bekommen, die Community-PIO-CH32V nachgezogen hat – nicht, um xPacks 15.2.0 zu jagen. Mit CH32V in PIO bleibst du stets bei ①② (WCH-Custom).

---

## 7. Gatekeeper-Quarantäne aufheben (sonst hält macOS alles für einen „Virus")

macOS hat einen Sicherheitsmechanismus: Jedes Executable, das aus dem Netz geladen wurde (`git clone` inklusive), bekommt das Quarantäne-Attribut `com.apple.quarantine` angeklebt. Solche Dateien ohne Apple-Signatur werden beim Ausführen direkt blockiert; der Fehler sieht meist so aus:

```
"xxx" cannot be opened because the developer cannot be verified
```

Oder etwas drastischer:

```
killed: 9
```

Frisch installierte Compiler und Flasher sind genau diese „unsignierten, aus dem Netz bezogenen" Kandidaten, also heben wir das Quarantäne-Attribut prophylaktisch auf:

```bash
xattr -dr com.apple.quarantine ~/.platformio/packages/toolchain-riscv
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-wlink
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-openocd-riscv-wch
```

> `-r` ist der rekursive Schalter und entfernt das Attribut über alle Dateien im Verzeichnis; selbst falls eine Datei das Attribut gar nicht hat, meckert das Kommando nicht – eine „macht nichts kaputt"-Prophylaxe, die du sorgenfrei laufen lassen kannst.

---

## 8. Prüfen, ob die Toolchain wirklich läuft

Nach der Installation nicht sofort das Projekt aufklappen – nimm dir zehn Sekunden, um die drei großen Bauteile auszuführen:

```bash
# Compiler (gemäß der in Kapitel 6 bestätigten Endversion: gcc12.2.0, arm64-nativ, ohne Rosetta)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0

# Falls bei dir zufällig die alte gcc8/x86_64-Version herausgekommen ist, entsprechend anpassen:
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
# riscv-none-embed-gcc (xPack GNU RISC-V Embedded GCC x86_64) 8.2.0

# Flash-Tool (nativ arm64)
~/.platformio/packages/tool-wlink/wlink --version
# wlink 0.1.1

# Debug-Tool (optional, nativ arm64)
~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd --version
```

> **Kleiner Rosetta-Hinweis**: Die gcc12/arm64-native Variante braucht theoretisch überhaupt kein Rosetta. Falls bei dir aber zufällig die alte gcc8/x86_64-Version herausgekommen ist, kann das System beim ersten Aufruf nachfragen, ob du Rosetta 2 installieren willst – bestätigen, das ist eine einmalige Aktion und danach kommt nie wieder eine Nachfrage. Sobald die Kommandos oben saubere Versionsnummern liefern, steht die Umgebung.

---

## 9. Erstes Projekt anlegen: platformio.ini verstehen

### 9.1 Wie die Projektstruktur aussieht

Das Skelett eines minimalen PlatformIO-Projekts besteht aus nur zwei Dingen:

```
ch32v307-test/
├── platformio.ini      # Projektkonfiguration; „welcher Chip, welches Framework, wie flashen" steht alles hier
└── src/
    └── main.c           # Dein Firmware-Code, der Programmeinstieg
```

Ein leeres Projekt lässt sich auch per Kommandozeile anlegen (wer in VSCode lieber „New Project" per Maus klickt, bekommt exakt dasselbe Ergebnis):

```bash
$PIO project init -d ~/ch32v307-test --board ch32v307_evt
```

### 9.2 Die `platformio.ini` Zeile für Zeile zerlegt

Das ist die wichtigste Konfigurationsdatei des gesamten Projekts, mit der du bei jedem Neustart Kontakt hast – sie ist es also wert, sie Zeile für Zeile zu erklären. Der Inhalt sieht ungefähr so aus:

```ini
[env]
platform = ch32v
framework = noneos-sdk
monitor_speed = 115200
; Onboard-WCH-Link-Debugger; wlink ist das Flash-Tool mit nativer macOS-arm64-Unterstützung
upload_protocol = wlink

[env:ch32v307_evt]
board = ch32v307_evt
; EVT-R1 Werkseinstellung: 256K Flash + 64K SRAM (entspricht dem board-Standard, kein Override nötig)
; Wer auf 288K Flash / 32K SRAM oder ein anderes Layout wechseln will, muss vorher mit dem WCH-Tool die
; option bytes ändern und hier die Kommentierung aufheben:
; board_upload.maximum_size = 294912
; board_upload.maximum_ram_size = 32768
```

Stück für Stück:

- **`[env]`**: Das ist der „gemeinsame Konfigurationsbereich"; was hierunter steht, gilt für alle Umgebungen (envs). Wenn dein Projekt später mehrere Boards gleichzeitig unterstützen soll, kommen die gemeinsamen Parameter hierher und du sparst dir Wiederholungen.
- **`platform = ch32v`**: Sagt PlatformIO, welche Plattform genutzt wird – also die `Community-PIO-CH32V`-Community-Plattform, die wir im vorigen Teil halb umgekrempelt installiert haben.
- **`framework = noneos-sdk`**: Wählt WCHs offizielle Standard-Peripheriebibliothek (Bare-Metal-Entwicklung ohne OS-Scheduler) – das ist das klassische, am besten dokumentierte Einsteiger-Framework; das zugehörige Paket heißt `framework-wch-noneos-sdk`, die hier bestätigte funktionierende Version ist `2.30000.0`. Wenn du später Multitasking willst, tauschst du diese Zeile einfach gegen `freertos` oder `rt-thread` aus, sonst ändert sich kaum etwas – eines der netten Features des PlatformIO-Ökosystems.
- **`monitor_speed = 115200`**: Die Baudrate des Seriell-Monitors (`pio device monitor`). **Diese Zahl muss identisch sein mit dem Argument, das du in Code an `USART_Printf_Init()` übergibst** – passt es auf einer Seite nicht, kommt nur noch Zeichensalat raus, eine sehr häufige Anfängerfalle.
- **`upload_protocol = wlink`**: Sagt PlatformIO, mit welchem Tool ins Board geflasht wird. Mehrere Protokolle sind möglich (in Kapitel 12 gibt es die komplette Vergleichstabelle); für macOS-arm64-Nutzer ist `wlink` die stressfreie Wahl, weil es nativ unterstützt wird.
- **`[env:ch32v307_evt]`**: Eine konkrete „Umgebung"; der Name ist frei wählbar, wird aber üblicherweise an das Board-Modell angelehnt, damit es übersichtlich bleibt.
- **`board = ch32v307_evt`**: Bestimmt das konkrete Board-Modell; PlatformIO lädt danach die kompletten Parameter – Pin-Definitionen, Flash-/RAM-Größen, Default-Takt.
- **Die auskommentierten Flash-/RAM-Zeilen**: Hier versteckt sich ein Detail, an dem viele herumgrübeln – der Chip auf dem EVT-R1 hat tatsächlich **288 KB** Flash, aber das `board` liefert standardmäßig **256 KB**. Eile nicht, das zu ändern, das ist kein Bug: Die werkseitig gesetzten option bytes teilen den Speicher genau in 256 KB Flash + 64 KB SRAM, identisch mit dem board-Default, also bleibt der Eintrag für Einsteiger komplett unangetastet. Erst wenn du später wirklich die vollen 288 KB Flash ausreizen willst, musst du vorher mit dem offiziellen WCH-Tool die option bytes ändern und danach diese beiden Zeilen synchronisieren – das ist fortgeschrittene Bedienung, in der Startphase erst mal bedeutungslos.

### 9.3 Die von PlatformIO generierte `main.c`-Vorlage lesen – eine „CH32-Entwicklungslogik" aufbauen

Dieser Abschnitt ist der Clou unter den Schwerpunkten. Wer zum ersten Mal die automatisch generierte `main.c` aufklappt, wird vom anfänglichen `#if defined(...)`-Block erschlagen und denkt „das ist ja wahnsinnig kompliziert". Keine Angst, wir zerlegen das; du wirst sehen, es ist alles andere als schrecklich, und wenn du diesen Block einmal kapiert hast, durchschaust du das Muster bei jedem WCH-Chip sofort.

Die Vorlage beginnt so (Auszug):

```c
// ① Anhand von Compile-Makros automatisch den passenden Header für den aktuellen Chip wählen
#if defined(CH32V003)
#include <ch32v00x.h>
#elif defined(CH32V10X)
#include <ch32v10x.h>
#elif defined(CH32V30X) || defined(CH32V31X)
#include <ch32v30x.h>
// ... danach folgen noch V20X / X035 / L103 / H417 und ein ganzer Schwung weiterer Zweige
#endif
#include <debug.h>   // ← Diese Zeile ist der Schlüssel: liefert UART-Init, Delays und printf-Redirect
```

**Warum sieht der Code so aus?** Weil die PlatformIO-Vorlage eine einzige, für die **gesamte WCH-Familie** generische Codebasis ist. `CH32V003`, `CH32V307`, `CH32X035` … Dutzende Chips teilen sich dasselbe `main.c`-Skelett, und ein ganzer Schwung `#if defined(...)` „errät" zur Compile-Zeit, welcher Chip gemeint ist, und `#include`d danach den herstellerspezifischen Header. Diese Makros werden von der Kombination `platform = ch32v` + `board = ch32v307_evt` automatisch für dich definiert; du musst sie nicht selbst setzen.

**Für deinen CH32V307** sind effektiv nur zwei Zeilen aktiv:

```c
#include <ch32v30x.h>   // Peripherie-Definitionen der CH32V30X-Familie (Register, GPIO_InitTypeDef usw.)
#include <debug.h>      // Die entscheidende Debug-Hilfsbibliothek
```

Wenn du das einmal verstanden hast, ist dieser `#if defined`-Wust nicht mehr „komplexe Logik", sondern „eine Entweder-Oder-Weiche". Wer dieses Muster einmal kapiert hat, gerät bei einer neuen CH32-Variante mit ähnlichem Vorlagen-Code nicht in Panik. **Genau das meint die „CH32-Entwicklungslogik": zuerst schauen, zu welcher Familie der Header gehört, dann ansehen, was `debug.h` an Hilfsfunktionen liefert.**

### 9.4 Was in `debug.h` eigentlich steckt

Dieser Header ist Teil des offiziellen WCH-SDK und kommt in nahezu jedem CH32-Projekt vor; wenn du die paar Funktionen schon vorher kennst, sparst du dir viele Umwege:

```c
void Delay_Init(void);                        // System-Timer für Delays initialisieren
void Delay_Us(uint32_t n);                    // Mikrosekunden-Delay
void Delay_Ms(uint32_t n);                    // Millisekunden-Delay
void USART_Printf_Init(uint32_t baudrate);    // USART1 initialisieren und printf darauf umleiten
```

In der passenden `debug.c` (ebenfalls SDK-Hausleistung, du musst sie nicht selbst schreiben) ist bereits die vom C-Standard geforderte Low-Level-Funktion `_write()` implementiert und auf USART1 angebunden. **Das heißt: Du brauchst keinen eigenen Redirect-Code zu schreiben – ein einziger Aufruf `USART_Printf_Init(115200)`, danach funktioniert `printf(...)` direkt mit Ausgabe über die serielle Schnittstelle.** Das ist ein von vielen Mikrocontroller-Neulingen übersehenes, aber extrem nützliches Feature; wenn du die „seriell liefert nichts"-Falle weiter hinten überstanden hast, wirst du an dieser Zeile kleben.

### 9.5 Ein „kompiliert, macht aber gar nichts"-Minimalbeispiel

Bevor wir uns in das Hello World vertiefen, erst mal ein Basis-Blinky, um das Grundmuster der CH32-GPIO-Programmierung zu spüren:

```c
#include <ch32v30x.h>   // Header der CH32V30X-Familie; die board-Konfiguration wählt automatisch den richtigen
#include <debug.h>

#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);   // Interrupt-Prioritätsgruppe setzen (Standard-Eröffnungszug)
    SystemCoreClockUpdate();                          // SystemClock-Variable aktualisieren (ebenso Standard-Eröffnungszug)
    Delay_Init();                                     // Delay-Funktion initialisieren

    GPIO_InitTypeDef GPIO_InitStructure = {0};

    BLINKY_CLOCK_ENABLE;                               // ① Zuerst der GPIOA-Peripherie „Strom geben" (Clock aktivieren)
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;           // ② Pin PA0 auswählen
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;    // ③ Modus: Push-Pull-Ausgang
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;   // ④ Umschaltgeschwindigkeit
    GPIO_Init(GPIOA, &GPIO_InitStructure);              // ⑤ Konfiguration wirklich ins Register schreiben

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(GPIOA, GPIO_Pin_0, ledState);   // Pegel von PA0 auf ledState setzen
        ledState ^= 1;                                 // Pegel invertieren, nächste Runde andersherum
        Delay_Ms(500);                                  // 500 ms warten, damit „Blinken" sichtbar wird
    }
}
```

**Merke dir diese feste GPIO-Vierer-Schrittkette** – bei jedem CH32-Projekt ist die Peripherie-Initialisierung eine Variante genau dieses Musters:

1. **Clock aktivieren**: Die STM32-Familie (und CH32s Peripheriebibliothek ist fast eine 1:1-Kopie der STM32-Standardbibliothek) hat die Eigenschaft, dass alle Peripheriebausteine default „stromlos" sind; vor der Nutzung musst du mit `RCC_XXXClockCmd(...)` die zugehörige Clock manuell einschalten. Wer diesen Schritt vergisst, hat eine Papp-Peripherie, die sich nicht regt, egal wie sehr man sie konfiguriert.
2. **Struct befüllen**: Eine `XXX_InitTypeDef`-Struktur deklarieren und die gewünschten Parameter für Modus, Geschwindigkeit usw. eintragen.
3. **`XXX_Init()` aufrufen**: Die Struktur an die passende Initialisierungsfunktion „verfüttern"; erst dann werden die Werte wirklich in die Chip-Register geschrieben.
4. **In der `while(1)` arbeiten**: Mit der passenden Lese-/Schreibfunktion (z. B. `GPIO_WriteBit`) auf die Peripherie zugreifen.

Gut, Theorie erledigt – jetzt kompilieren und flashen wir es ernsthaft, und du wirst merken: auch Code, auf Papier völlig in Ordnung, läuft in der Praxis trotzdem in „unerwartete" Fallgruben.

---

## 10. Der erste Build

Alles bereit, ein Build angestoßen:

```bash
$PIO run -d ~/ch32v307-test        # oder nach cd ins Projektverzeichnis einfach pio run
```

Beim ersten Build wird automatisch das `noneos-sdk`-Framework von WCH (komplette Peripherie-Treiber-Quellen) heruntergeladen – das dauert einen Moment, etwa 30–60 Sekunden. Eine erfolgreiche Ausgabe sieht so aus:

```
Linking .pio/build/ch32v307_evt/firmware.elf
RAM:   [          ]   3.2% (used 2080 bytes from 65536 bytes)
Flash: [          ]   0.7% (used 1728 bytes from 262144 bytes)
Building .pio/build/ch32v307_evt/firmware.bin
========================= [SUCCESS] Took 47.36 seconds =========================
```

Das grüne `[SUCCESS]` sagt dir: Die gesamte Kette – von VSCode über pio bis zum nativen macOS-Compiler – ist durchgängig verbunden; ein klein wenig Applaus ist angebracht. Die Build-Artefakte liegen unter `.pio/build/ch32v307_evt/`:

- `firmware.elf`: inklusive kompletter Debug-Symbole, fürs Debugging;
- `firmware.bin`: reines Binärfile, das beim Flashen zum Einsatz kommt.

Die beiden Balken (RAM-/Flash-Belegung) solltest du im Auge behalten; sobald später `printf` dazukommt, wächst die Flash-Belegung ordentlich an – ganz normal, kein Grund zur Sorge, in Kapitel 13 erkläre ich warum.

---

## 11. pio als globales Kommando einrichten

Jedes Mal `~/.platformio/penv/bin/pio` abzutippen ist nervig – wir linken es in ein Verzeichnis, das im System-PATH liegt. Auf Apple-Silicon-Macs installiert Homebrew standardmäßig nach `/opt/homebrew/bin`; dieses Verzeichnis ist für den aktuellen Nutzer (Mitglied der admin-Gruppe) für gewöhnlich beschreibbar:

```bash
if [ -w /opt/homebrew/bin ]; then
  ln -sf ~/.platformio/penv/bin/pio /opt/homebrew/bin/pio
  ln -sf "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" /opt/homebrew/bin/code
fi
```

Kurz prüfen:

```bash
pio --version      # PlatformIO Core, version 6.1.19
code --version     # VSCode-Versionsnummer
```

> Falls dein `/opt/homebrew/bin` nicht beschreibbar ist (selten), wähle ein eigenes beschreibbares Verzeichnis, z. B. `~/.local/bin`, und nimm es in den PATH deiner Shell auf:
> ```bash
> mkdir -p ~/.local/bin
> ln -sf ~/.platformio/penv/bin/pio ~/.local/bin/pio
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
> ```
> Denk dran: Nach der Änderung an `~/.zshrc` ein neues Terminal-Fenster öffnen oder `source ~/.zshrc` ausführen, damit die Konfiguration greift.

Ab jetzt kannst du überall, wo in diesem Artikel `$PIO` oder `~/.platformio/penv/bin/pio` steht, einfach `pio` schreiben.

---

## 12. Hardware anschließen und flashen

### 12.1 Verkabelung: Den richtigen USB-Port treffen

Auf dem EVT-R1 gibt es in der Regel zwei USB-Ports – **zum Flashen und Debuggen muss das Kabel in den Port, der mit dem Onboard-WCH-Link verbunden ist** (Silk-Druck meist DEBUG / Link / WCH-Link), nicht in den mit USB-Device beschrifteten. Die beiden Ports haben völlig unterschiedliche Funktionen; vertust du dich, taucht im Geräte-Manager gar nichts auf. macOS bringt den CDC-Seriell-Treiber mit, es funktioniert sofort, ohne dass du einen zusätzlichen Treibers installieren müsstest – deutlich entspannter als unter Windows.

### 12.2 Die zwei Modi des WCH-Link

Der Debugger-Chip WCH-Link hat zwei Betriebsmodi: **RV-Modus** (für RISC-V-Chips) und **DAP-Modus** (für ARM-Chips). Der CH32V307 hat einen RISC-V-Kern, der Debugger muss also zwingend im **RV-Modus** sein, sonst geht das Flashen schief. Ab Werk ist das Board meist schon auf RV eingestellt; falls das Flashen wiederholt scheitert, kannst du mit dem `wlink`-Kommando oder dem offiziellen WCH-Tool den Modus umschalten und bestätigen:

```bash
# Angeschlossene WCH-Link-Geräte auflisten
pio pkg exec -- wlink list          # oder direkt wlink list (vorausgesetzt, der Pfad liegt im PATH)
```

### 12.3 Jetzt richtig flashen

**Variante 1: Kommandozeile**

```bash
cd ~/ch32v307-test
pio run -t upload
```

Der in der `platformio.ini` gesetzte Eintrag `upload_protocol = wlink` greift genau in diesem Schritt – PlatformIO ruft das native macOS-wlink-Tool auf, das über den WCH-Link die `firmware.bin` in den Chip schreibt.

**Variante 2: VSCode-GUI**

Projektordner auf, in der PlatformIO-Werkzeugleiste unten links gibt es eine Reihe Icons; das Pfeil-Icon (Upload) erledigt denselben Job wie die Kommandozeile – wer lieber klickt, ist hier richtig.

Bei erfolgreichem Flashen druckt `wlink` die Details zu Debugger und Chip – ziemlich nützlich:

```
04:17:53 [INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
04:17:53 [INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
04:17:53 [INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
04:17:54 [INFO] Flash done
04:17:54 [INFO] Now reset...
```

Die erste Zeile `v2.18(v38)` ist die Firmware-Version deines WCH-Link-Debuggers; in der dritten Zeile siehst du die echte Flash-Größe des Chips (288 KB, cf. Kapitel 9) und die einmalige UID des Chips, die bei Produkt-Seralisierung nützlich sein kann.

### 12.4 Welches Flash-Protokoll?

In der `board`-Definition sind mehrere Flash-Protokolle hinterlegt, die du nach Bedarf umschaltest:

| Protokoll | Zugrundeliegendes Tool | Hinweis |
|---|---|---|
| `wch-link` | openocd (`0.11.0+dev-snapshot`, PIO-Paket `2.1100.260228`) | Default-Protokoll, spricht den WCH-Link über openocd an |
| `wlink` | wlink (Tool-Version `0.1.1`, PIO-Paket `tool-wlink@0.23.241116`) | **Für macOS-Nutzer empfohlen** – nativ, leicht, schnell; das in diesem Artikel real genutzte Protokoll |
| `minichlink` | minichlink (`0.1.0`) | Ein weiteres leichtes Community-Tool als Alternative |
| `isp` | wchisp (`0.2.3`, PIO-Paket `0.23.240914`) | Flashen über den USB-Bootloader; setzt voraus, dass BOOT0 vorher auf High gezogen wird, um in den Bootloader zu kommen – praktisch, wenn kein WCH-Link vorhanden ist |

### 12.5 Debuggen (Breakpoints, Single-Step)

In VSCode startest du mit **F5** eine Debug-Session (unter der Haube kooperieren openocd + RISC-V GDB); du kannst Breakpoints setzen, Single-Step ausführen und Variablen sowie Register in Echtzeit ansehen. Die zum Board passende SVD-Register-Beschreibung (`CH32V307xx.svd`) ist in der board-Konfiguration bereits hinterlegt, also ist die grafische Ansicht der Peripherie-Register sofort einsatzbereit, ohne dass du noch etwas konfigurieren müsstest. Das auszufalten würde einen weiteren Artikel füllen – hier nur so viel: Es reicht für den Anfang.

---

## 13. Falle 1: Build und Flash klappen, aber die serielle Schnittstelle ist tot

Sobald die Toolchain steht und das Flashen durch ist, denken viele, sie seien am Ziel, und schlagen begeistert den Seriell-Monitor auf – und dann: Fassungskrause.

### Symptom

```bash
pio run              # Build erfolgreich ✅
pio run -t upload    # Flashen erfolgreich ✅
pio device monitor   # Seriell-Monitor auf → leer, nicht mal ein Geist
```

Kompilieren ohne Fehler, Flashen bestätigt erfolgreich, der Seriell-Monitor ist definitiv mit dem `/dev/cu.usbmodem***` verbunden (also dem virtuellen COM-Port des Onboard-WCH-Link) – und trotzdem **kommt kein einziges Zeichen an**. Jetzt fängt man schnell an, an der Baudrate zu zweifeln, am Treiber oder gar am durchgebrannten Board.

### Ursache: Eigentlich völlig simpel

Ein Blick in den Code, und alles ist klar – **die von PlatformIO generierte Vorlage initialisiert schlicht keine serielle Schnittstelle, und im Code steht keine einzige `printf`-Zeile**. Sie ist reines „GPIO konfigurieren → Pegel toggeln in while → Delay"-Blinky, von dem von Anfang bis Ende nie ein einziges Byte über die serielle Schnittstelle geschickt wurde – dass da nichts ankommt, ist nur logisch. Die Hardware ist nicht kaputt, der Code hat einfach nie vor, mit dir zu reden.

> Der vom Onboard-WCH-Link durchgereichte virtuelle COM-Port (in der Branche VCP, Virtual COM Port, genannt) ist default auf **USART1 des Zielchips abgebildet (PA9 = TX, PA10 = RX)**. Die Hardware-Kette ist völlig intakt; das Programm sendet nur einfach gar nichts.

### Lösung: Initialisierung + printf dazugeben

In Kapitel 9 hatten wir `USART_Printf_Init()` aus `debug.h` bereits kennengelernt; jetzt setzen wir es offiziell ein – zwei Zeilen Code erledigen das:

```c
Delay_Init();

// USART1 (PA9/PA10) läuft über den virtuellen COM-Port des Onboard-WCH-Link; das _write des SDK leitet printf bereits dorthin um
USART_Printf_Init(115200);
printf("CH32V307 gebootet, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);
```

Und in der `while(1)`-Schleife noch eine Zeile Print ergänzen, damit du live siehst, dass das Programm läuft:

```c
while (1) {
    GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
    printf("LED %u\r\n", ledState);
    ledState ^= 1;
    Delay_Ms(100);
}
```

Erneut kompilieren und flashen – die serielle Schnittstelle erwacht sofort:

```
CH32V307 gebootet, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

> **Kleiner Hinweis**: Sobald `printf` dazukommt, wächst die Flash-Belegung von grob 0,7 % (1728 Byte) auf etwa 2,8 % (rund 7440 Byte), weil `printf` die komplette Formatierungslogik mit in die Firmware linkt – völlig normal. `printf` war nie „kostenlos"; es ist ein Tausch von Speicher gegen Debug-Komfort. Keine Sorge, und keine Not, dir über die paar KB Gedanken zu machen.

### Falls die serielle Schnittstelle in Zukunft nichts liefert: In dieser Reihenfolge prüfen

Die Erfahrung aus diesem Mal, zusammengefasst als generische Checkliste – abspeichern und bei ähnlichen Problemen direkt abarbeiten:

1. **Rufst du im Code wirklich `USART_Printf_Init` auf und hast du wirklich ein `printf` geschrieben?** (die häufigste und am leichtesten übersehene Falle in diesem Artikel – zuerst hier nachsehen)
2. **Stimmt die Baudrate?** Das `USART_Printf_Init(115200)` im Code muss mit dem `monitor_speed` in `platformio.ini` übereinstimmen; passt es auf einer Seite nicht, kommt Salat oder Leere an.
3. **Ist die virtuelle COM-Funktion des WCH-Link versehentlich deaktiviert?** (prüfbar im offiziellen WCH-Tool WCH-LinkUtility)
4. **Willst du womöglich, dass der Chip selbst zum USB-COM-Port (USB CDC) wird?** Falls ja: Das ist ein ganz anderes Firmware-Konzept, das einen USB-Stack benötigt, und nicht dasselbe wie die hier beschriebene Variante über USART1 + WCH-Link-Bridge – bitte nicht verwechseln.

---

## 14. Falle 2 (die größte überhaupt): Die serielle Schnittstelle spricht, aber die LED will nicht leuchten

Das ist die nervigste Falle des gesamten Prozesses, denn **sie hat fast nichts mit Software zu tun** – pures Hardware-Design-Problem; egal wie korrekt dein Code ist, er ist machtlos. Nimm dir kurz Zeit für diesen Abschnitt; er erspart dir mindestens eine halbe Stunde, in der du sonst an deinem CodeHaare ausraufen würdest.

### Symptom

Die serielle Schnittstelle druckt inzwischen einwandfrei (die Firmware läuft also einwandfrei, kein Einfrieren, kein HardFault), **aber auf dem Board ist von einer blinkenden LED nichts zu sehen**.

### Ursache: Die Onboard-User-LED ist ab Werk „freigeschnitten"

**Die beiden User-LEDs (Silk-Druck LED1 und LED2) auf diesem Board sind ab Werk schlicht nicht mit dem MCU-Pin verbunden, sondern freischwebend.** Genauer: Sie haben nur eine Seite an GND, die andere Seite ist ein nacktes Lötpad oder Stiftleisten-Loch, das auf deine Verkabelung wartet – das ist keine Quality-Klagemauer eines einzelnen Boards, sondern genau so steht es im offiziellen WCH-Schaltplan (`CH32V30xSCH.pdf`).

Mit anderen Worten: **Egal ob dein Code PC1, PD0 oder PA0 toggelt – solange du kein echtes Dupont-Kabel von diesem Pin zum LED-Pad ziehst, wird die LED nie leuchten. Das ist ein rein hardwareseitiges Problem, und Software-Code hilft da nicht, egal wie elegant er formuliert ist.**

Diese Falle habe ich nicht allein ausgelöst; es lassen sich mehrere unabhängige Quellen finden, die sich gegenseitig bestätigen: Die offizielle Zephyr-Doku merkt zu diesem Board ausdrücklich an, dass die Onboard-LED schaltungstechnisch nicht mit dem SoC verbunden ist; eine deutsch- und chinesischsprachige Anleitung zum CH32V307EVT-R1 erwähnt ebenfalls, dass die beiden User-LEDs nicht an GPIO-Pins angeschlossen sind und per Hand verdrahtet werden müssen, damit sie leuchten. Dasselbe gilt für den User-Taster KEY – ebenfalls freischwebend, dieselbe Falle ein zweites Mal.

> **Die einzige Lampe auf dem Board, die ab Werk angeschlossen ist und bei Strom sofort leuchtet, ist die Power-LED** – also die, die gleich beim Aufstecken des USB-Kabels konstant angeht; sie hat mit deinem Code rein gar nichts zu tun und wird sehr leicht mit „ich habe eine LED zum Leuchten gebracht" verwechselt, obwohl sie vom MCU überhaupt nicht gesteuert wird.

### Behebung: Software + Hardware in zwei Schritten

**Schritt 1: Den zu toggelden Pin festlegen**

In WCHs eigenen GPIO-Beispielen wird bevorzugt der Pin **PA0** verwendet – am besten dokumentiert, am häufigsten in der Community diskutiert und mit den wenigsten Nebenfallen verbunden; daher richten wir den Blink-Pin im Code einheitlich auf PA0 aus:

```c
// Die User-LED des EVT-R1 ist default freischwebend (nicht mit MCU verbunden); mit einem Dupont-Kabel PA0 auf LED1 brücken, sonst leuchtet nichts
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)
```

> ⚠️ **Eine mitlaufende kleine Falle**: Wenn du von einem anderen Port (z. B. PC1 aus der Vorlage) auf PA0 wechselst, **musst du unbedingt auch die Clock-Enable-Zeile auf `RCC_APB2Periph_GPIOA` umstellen**. Hier habe ich eine richtig saftige Falle eingebaut: nur die Pin-Definition geändert, die Clock-Enable-Zeile vergessen – die Folge ist, dass die Clock der GPIOA-Peripherie gar nicht läuft, PA0 sich keinen Millimeter rührt und du erst ewig in der Code-Logik suchst, bis du merkst, dass es der Klassiker „an einer Stelle geändert, an der anderen vergessen" war. Nach jeder Port-Umstellung solltest du alle betroffenen Makros insgesamt noch einmal prüfen – niemals nur die Hälfte ändern.

**Schritt 2: Ein echtes Dupont-Kabel ziehen (eine von zwei Varianten)**

- **Variante A (mit der Onboard-LED1, von WCH empfohlen)**: Nimm ein Dupont-Kabel, eine Seite an **PA0** (das Loch, das auf der Arduino-Buchsenleiste mit `A0` beschriftet ist), die andere an das Pad mit dem Silk-Druck `LED1` auf dem Board. Die genaue Position des Pads findest du im Schaltplan `CH32V30xSCH.pdf` im EVT-Unterlagenpaket.
- **Variante B (eigene LED extra anlöten, die sicherste und anschaulichste Variante)**: Nimm eine handelsübliche LED in Reihe mit einem 330 Ω–1 kΩ-Vorwiderstand zwischen **PA0 und GND**. Polung verkehrt herum? Egal – der Code toggelt permanent zwischen High und Low, also wird mindestens in einer Halbwelle Strom in der richtigen Richtung fließen; der einzige Unterschied ist „in welcher Halbwelle es leuchtet".

Nach der Verkabelung noch einmal `pio run -t upload` – LED1 blinkt im 100-ms-Takt, gleichzeitig spuckt die serielle Schnittstelle synchron `LED 0 / LED 1` aus. In diesem Moment ist das „Hello World" wirklich durch. 🎉

> **Warum hat WCH die LED überhaupt freischwebend designt?** Höchstwahrscheinlich, um Entwicklern „mehr Freiheit" zu lassen – du kannst eine LED oder einen Taster an den GPIO legen, den dein Projekt gerade braucht, und bist nicht an einen ab Werk festverlöteten Pin gebunden. Die Idee ist gut, aber für einen Neueinsteiger extrem unfreundlich, denn beim ersten Auspackpen eines Boards ist die erste Assoziation nie „ich muss erst ein Kabel ziehen, um eine LED zum Leuchten zu bringen", sondern „habe ich im Code irgendwas falsch gemacht?".

### Eine tiefergehende Lektion: Zuerst Software- von Hardware-Problemen trennen

Der wahre Wert dieser Falle liegt nicht im Detail „merk dir, PA0 braucht ein Dupont-Kabel", sondern in einer allgemeinen Debug-Strategie für Embedded:

**„Keine Reaktion" heißt nicht „Code falsch".** Wenn eine Peripherie sich rührt, solltest du als Erstes versuchen nachzuweisen, ob die Firmware „an diesem Stück Logik wirklich ankommt", anstatt sofort in der Code-Logik zu graben. Dass wir diesmal so schnell auf ein Hardware-Problem kamen, lag schlicht daran, dass **die serielle Schnittstelle zuerst gesprochen hat** – wenn printf sauber ankommt, läuft die Hauptschleife normal und steckt nirgendwo fest; damit ist die Frage „Software-Ebene funktioniert" erst mal bestätigt, und das restliche „keine Reaktion" lässt sich auf die Hardware-Kette eingrenzen. Genau deshalb rate ich, in neuen Projekten als Erstes die serielle Schnittstelle zum Laufen zu bringen – sie ist das schnellste und direkteste Messinstrument zum Eingrenzen von Störungen.

---

## 15. Wenn alles läuft: Wie die vollständige main.c aussieht

Die Behebungen beider Fallgruben zusammengeführt – das ist die am Ende funktionierende komplette Datei, die gegenüber der ursprünglichen PlatformIO-Vorlage noch UART-Initialisierung und Print-Anweisungen dazugewonnen hat:

```c
#include <ch32v30x.h>
#include <debug.h>

// Die User-LED des EVT-R1 ist default freischwebend (nicht mit MCU verbunden); mit einem Dupont-Kabel PA0 auf LED1 brücken, sonst leuchtet nichts
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void NMI_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void HardFault_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
    SystemCoreClockUpdate();
    Delay_Init();

    // USART1 (PA9/PA10) läuft über den virtuellen COM-Port des Onboard-WCH-Link; das _write des SDK leitet printf bereits dorthin um
    USART_Printf_Init(115200);
    printf("CH32V307 gebootet, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);

    GPIO_InitTypeDef GPIO_InitStructure = {0};
    BLINKY_CLOCK_ENABLE;
    GPIO_InitStructure.GPIO_Pin = BLINKY_GPIO_PIN;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(BLINKY_GPIO_PORT, &GPIO_InitStructure);

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
        printf("LED %u\r\n", ledState);
        ledState ^= 1;
        Delay_Ms(100);
    }
}

void NMI_Handler(void) {}
void HardFault_Handler(void) { while (1) {} }
```

Zu den beiden Interrupthandler am Ende noch ein Wort: `NMI_Handler` und `HardFault_Handler` sind in der RISC-V-/ARM-Mikrocontroller-Welt zwei sehr gängige „Ausnahme-Auffangbecken"; das Attribut `__attribute__((interrupt("WCH-Interrupt-fast")))` sagt dem Compiler „das ist eine Interrupt-Service-Routine, bitte generiere den Code entsprechend" (also mit automatischem Sichern und Wiederherstellen der Register). Die Implementierung hier ist minimalistisch – `HardFault_Handler` bleibt mit `while(1){}` in einer Endlosschleife stecken, eine konservative, aber wirksame Auffangstrategie: Falls das Programm wirklich abstützt und eine Hardware-Ausnahme auslöst, ist es besser, kontrolliert hier festzustecken, als mit fehlerhaftem Zustand weiterzuhechten, sodass du den Debugger anstöpseln und dir den damaligen Zustand ansehen kannst. Wenn das Projekt später größer wird, kannst du hier Fehler-Logging, eine LED-Alarmlampe oder ähnliches ergänzen; fürs Erste reicht es, die Wirkung zu kennen.

Den kompletten Projektcode (inkl. `platformio.ini`) habe ich auf GitHub geparkt – der Link steht ganz am Ende, du kannst ihn direkt klonen und losrennen.

---

## 16. Stolperstein-Übersichtstabelle

Zum leichten Nachschlagen hier alle Fallgruben des Artikels noch einmal konzentriert:

| # | Symptom | Ursache | Lösung |
| --- | --- | --- | --- |
| 1 | Bei der Installation `repository not found` | GitHub-Organisationsname falsch geschrieben; korrekt heißt es `Community-PIO-CH32V` (mit PIO, groß) | Adresse mit korrektem Organisationsnamen verwenden |
| 2 | `pio platform install` meldet deprecated | Neuere PlatformIO-Versionen nutzen einheitlich den `pkg`-Subbefehl | Auf `pio pkg install -g -p <Adresse>` umsteigen |
| 3 (Kernstück) | Plattform ist installiert, aber der Toolchain-Ordner ist voller `.exe`, Build scheitert zwingend | `platform.json` hat die Toolchain-Quelle hart auf das Windows-Repo codiert; bei der Installation wird das OS nicht geprüft | Windows-Version löschen und manuell `toolchain-riscv-mac` und `tool-wlink` (Branch `mac_arm64`/`mac_x64`) installieren |
| 4 | Falscher Toolchain-Branch, Build meldet „Compiler-Executable nicht gefunden" | Das Build-Skript wählt das Compiler-Präfix anhand des zweiten Versionsabschnitts (`1.8.x`→`riscv-none-embed`, `1.12.x`→`riscv-wch-elf`); installierte Version und real vorhandener Executable-Name passen nicht zusammen | Zuerst mit `ls` nachsehen, wie der tatsächlich installierte Executable heißt, und dann passend verwenden |
| 5 | Compiler/Flasher melden „Entwickler nicht verifizierbar" oder `killed: 9` | macOS hat unsignierten, aus dem Netz geladenen Binaries das Quarantäne-Attribut verpasst | `xattr -dr com.apple.quarantine <Verzeichnis>` |
| 6 | Sorge, dass der x86_64-Compiler auf Apple Silicon nicht rund läuft | xPack hatte früher keine arm64-Builds, benötigt Rosetta 2 | Kein Problem – nach Rosetta-Installation kompiliert er völlig einwandfrei |
| 7 | Versuch, `pio` nach `/usr/local/bin` zu linken, scheitert | Das Verzeichnis gehört root, als normaler User hast du keine Schreibrechte | Stattdessen `/opt/homebrew/bin` oder ein selbst angelegtes `~/.local/bin` mit PATH-Eintrag verwenden |
| 8 | Build und Flash erfolgreich, aber der Seriell-Monitor ist leer | Die Vorlage ist reiner Blinky-Loop, **keine UART-Initialisierung, kein einziges `printf`** | `USART_Printf_Init(115200)` aufrufen und `printf` normal nutzen (das SDK leitet es bereits auf USART1 um) |
| 9 (größte Falle) | Die serielle Schnittstelle druckt, aber auf dem Board blinkt keine LED | **Die Onboard-User-LED ist ab Werk freischwebend und schlicht nicht mit dem MCU-Pin verbunden** | Ein Dupont-Kabel ziehen, PA0 auf LED1 brücken (oder selbst eine LED + Vorwiderstand gegen GND anschließen) |
| 10 (Folge-Falle) | Nach Umstellung auf PA0 leuchtet die LED noch immer nicht | Beim Port-Wechsel **wurde das zugehörige Clock-Enable-Makro vergessen** | Port-Definition und Clock-Enable müssen synchron geändert werden; nach der Änderung die kompletten Makros noch einmal prüfen |

**Die ganze Ernte aus diesem Stolperstein-Marathon in einem Satz**: Bei Embedded-Entwicklung heißt „keine Reaktion" niemals „Code falsch"; trenne zuerst **Software-Problem** (kommt die Firmware wirklich an diesem Stück Logik an?) von **Hardware-Problem** (ist die physikalische Kette durchgängig, ist die Peripherie tatsächlich angeschlossen?). Lass die serielle Schnittstelle zuerst reden – das ist der schnellste und stressfreiste Zug zum Eingrenzen von Störungen; bring sie immer zuerst zum Laufen.

---

## 17. Kommando- & Pfad-Spickzettel

Die alltäglichen Befehle:

```bash
# === Kompilieren / Flashen / Monitor ===
pio run                # nur kompilieren
pio run -t upload      # kompilieren + flashen
pio device monitor      # Seriell-Monitor öffnen (beenden mit Ctrl+C)

# === WCH-Link-Debugger-Firmwareversion & angeschlossenen Chip abfragen (bei Verbindungsproblemen am häufigsten genutzt) ===
~/.platformio/packages/tool-wlink/wlink status

# === Versionen der einzelnen Tools ===
~/.platformio/packages/tool-wlink/wlink --version    # Flash-Tool-Version
pio --version                                          # PlatformIO Core Version

# === Compiler-Version (gemäß der bestätigten Umgebung, Präfix riscv-wch-elf-) ===
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# Falls bei dir die alte gcc8/x86_64-Version herausgekommen ist, Dateinamen entsprechend anpassen:
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
```

Die typische Ausgabe von `wlink status` zeigt auf einen Blick Debugger-Firmwareversion, Zielchip-Modell, echte Flash-Größe und Chip-UID – sehr nützlich bei Verbindungsproblemen:

```
[INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
[INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
[INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
[INFO] Flash protected: false
[INFO] RISC-V ISA(misa): Some("RV32ACFIMUX")
[INFO] RISC-V arch(marchid): Some("WCH-V4F")
```

> Falls du die Firmware des WCH-Link-Debuggers selbst updaten willst, brauchst du das offizielle **WCH-LinkUtility**-Tool – momentan gibt es das nur für Windows, nicht für Mac. Das ist eine kleine Träne in der ansonsten noch wackeligen macOS-Story.

Auch die wichtigen Dateipfade als Übersicht, um bei Problemen schnell ansetzen zu können:

| Zweck | Pfad |
|---|---|
| PlatformIO Core selbst | `~/.platformio/penv/bin/pio` |
| Installierte Plattform | `~/.platformio/platforms/ch32v/` |
| Toolchain / Flash- / Debug-Tools | `~/.platformio/packages/{toolchain-riscv,tool-wlink,tool-openocd-riscv-wch}` |
| board-Definition | `~/.platformio/platforms/ch32v/boards/ch32v307_evt.json` |
| Build-Skript der Plattform (wo wir oben die Triple-Logik ausgegraben haben) | `~/.platformio/platforms/ch32v/builder/main.py` |
| Build-Artefakte | `<Projektverzeichnis>/.pio/build/ch32v307_evt/firmware.{elf,bin}` |

Die wichtigsten Parameter aus der `ch32v307_evt`-board-Definition gleich mit:

| Feld | Wert |
|---|---|
| MCU-Modell | CH32V307VCT6 |
| Taktfrequenz | 144 MHz |
| march / mabi (Compile-Target-ABI) | rv32imacxw / ilp32 |
| Flash / SRAM (board-Default) | 256 KB / 64 KB (der Chip hat real 288 KB Flash, cf. Kapitel 9) |
| Onboard-Debugger | WCH-Link |
| USB VID:PID | 1a86:8010 |
| Unterstützte Flash-Protokolle | wch-link, wlink, minichlink, isp |

---

## 18. Eine eigene CH32-Entwicklungslogik aufbauen

Nach dieser ganzen Odyssee ist nicht das Wissen um eine bestimmte Anzahl konkreter Befehle das Wertvollste, sondern ein Denkmuster, das sich immer wieder verwerten lässt. Egal ob du beim CH32V307 bleibst oder zu einem anderen Chip- oder Board-Modell der CH32-Familie wechselst – nach diesem Muster gehst du vor:

1. **Zuerst die Dreier-Tasche „Plattform + Framework + Board" bestätigen**: Sie entspricht den drei Zeilen `platform`, `framework` und `board` in `platformio.ini`. Stehen diese, weiß PlatformIO, woher die Toolchain zu laden ist und nach welcher Pin-Definition kompiliert wird.
2. **Nach der Plattform-Installation nicht sofort Code schreiben – erst prüfen, ob die Toolchain die „richtige Staatsangehörigkeit" hat**: Besonders bei Community-gepflegten, nicht in erster Linie offiziell unterstützten Plattformen kann es passieren, dass nur Windows oder Linux abgedeckt sind. Ein kurzer `ls`-Blick ins Toolchain-Verzeichnis und ein `file` auf die zentralen Binaries, um die Architektur zu bestätigen, spart massiv Debug-Zeit.
3. **Bei „unsignt binary"-Fehlermeldungen als Erstes an Gatekeeper denken**: `cannot be opened` / `killed: 9` sind zu 80 % das Quarantäne-Attribut; `xattr -dr com.apple.quarantine` als Rundumschlag.
4. **Wenn Flash/Build klappen, die Peripherie aber stumm bleibt – zuerst Software- von Hardware-Problemen trennen**: Die serielle Schnittstelle zuerst zum Laufen zu bringen, ist die schnellste Eliminierungsmethode – Output bedeutet: Die Firmware läuft ordentlich; kein Output: zurück an die Initialisierung.
5. **Den „User-Peripherie" auf dem Board nie blind vertrauen**: LEDs und Taster sind bei vielen Eval-Boards aus Flexibilitätsgründen ab Werk gar nicht verkabelt – vorab per Schaltplan prüfen, bevor du den Code verdächtigst.
6. **`debug.h` (oder die vom Framework gelieferte Debug-Hilfsbibliothek) konsequent nutzen**: Nahezu jeder Hersteller-SDK liefert Delay-Funktionen und `printf`-Redirect mit – du musst das Rad nicht neu erdachen.
7. **Versionsnummern ändern sich, Denkweisen lassen sich abschauen**: Community-Toolchains werden laufend gepflegt; dass die konkreten Versionsnummern bei deiner Installation von denen im Tutorial abweichen, ist normal. Zu verstehen, „warum", ist wichtiger, als sich zu merken, „was" – dieser Artikel hier ist selbst ein lebendiges Beispiel dafür.

Mit diesem Gerüst im Kopf wirst du bei jedem neuen Embedded-Board im Wesentlichen nach derselben Reihenfolge schnell durchsteigen.

---

## 19. Häufige Fragen (FAQ)

**Q1: Warum nicht einfach das offizielle MounRiver Studio nehmen? Das hat doch eine Mac-Version?**

A: MounRiver Studio hat tatsächlich eine Mac-Version; laut Community-Feedback macht der eingebaute OpenOCD auf dem Mac jedoch etliche Probleme und wirkt, als wäre die Mac-Seite nie ernsthaft adaptiert und getestet worden; außerdem ist es eine relativ geschlossene All-in-One-IDE, in der du die Toolchain-Version nicht selbst unter Kontrolle hast. PlatformIO basiert auf VSCode, gibt dir die volle Kontrolle über die Toolchain, hat eine aktive Community und sorgt plattformübergreifend für ein konsistentes Entwicklungserlebnis – die Investition in diese eine Runde lohnt sich.

**Q2: Kann man sich die manuelle Ersetzung sparen und einfach eine RISC-V-Toolchain über Homebrew installieren?**

A: Technisch ja, aber für diese Plattform nicht empfohlen. Das Build-Skript der Plattform lokalisiert das Toolchain-Verzeichnis über den Paketmanager von PlatformIO (Aufrufe wie `get_package_dir("toolchain-riscv")`); auf eine Homebrew-Toolchain umzusteigen erfordert zusätzliche Konfigurations-Overrides für das Standardverhalten und macht es eher komplizierter. Bleib bei dem in diesem Artikel genannten `toolchain-riscv-mac`-Paket, dann bist du entspannt.

**Q3: Kann es passieren, dass die Toolchain nach einem späteren Plattform-Update wieder zur Windows-Version zurückgekehrt wird?**

A: Ja, möglich. Wenn du danach `pio pkg update` ausführst oder die gesamte Plattform neu installierst, steht in `platform.json` weiterhin die Windows-Repo-Adresse; dabei kann deine manuell getauschte macOS-Version überschrieben werden. In dem Fall spielst du die Austauschschritte aus Kapitel 6 einfach noch einmal durch; oder, ganz gründlich, du forkst das Plattform-Repo, änderst `platform.json` so, dass es standardmäßig auf die macOS-Version zeigt, und hast endgültig Ruhe.

**Q4: Der Build meldet Link-Fehler oder sagt, ein Compiler-Kommando sei nicht gefunden – was steckt dahinter?**

A: Sehr wahrscheinlich passen Toolchain-Version und Compiler-Executable-Präfix nicht zusammen (entspricht Falle 4 in Kapitel 16). Prüfe zuerst, wie dein tatsächlich installierter Compiler heißt (`riscv-wch-elf-gcc` oder die alte `riscv-none-embed-gcc`), und stell sicher, dass das Kommando zum real existierenden File passt – nachzulesen in der finalen Umgebungstabelle in Kapitel 6.

**Q5: Das Flashen meldet „WCH-Link-Gerät nicht gefunden" – was nun?**

A: In dieser Reihenfolge prüfen: ① Bestätigen, dass das USB-Kabel im Port mit dem WCH-Link steckt, nicht im USB-Device-Port; ② Bestätigen, dass der Debugger im RV-Modus und nicht im DAP-Modus ist; ③ Mit `system_profiler SPUSBDataType | grep -A5 1a86` schauen, ob das System das USB-Gerät sauber erkennt (`1a86:8010` ist die VID:PID dieses Debuggers).

**Q6: Welche Chips und Frameworks unterstützt diese Plattform? Ist ein späterer Board-Wechsel unkompliziert?**

A: An Chips deckt sie eine breite Palette ab – CH32V003/103/203/30x, CH32X035, CH56x/57x/58x/59x und mehr; an Frameworks neben dem hier verwendeten noneos-sdk auch FreeRTOS, RT-Thread, TencentOS, Harmony LiteOS, Arduino, ch32fun und Zephyr. Ein Board-Wechsel bedeutet im Wesentlichen, die beiden Zeilen `board` und `framework` in `platformio.ini` anzupassen; die restlichen Debug-Erfahrungen (Toolchain-Architektur, Gatekeeper-Quarantäne, per Default freischwebende Peripherie) bleiben überwiegend generisch anwendbar.

---

## 20. Was man danach noch spielen kann

Hello World ist nur die Startlinie – nach dem Durchlauf kannst du dich weiter vorwagen:

- **Mehrere GPIO-Kanäle / Taster-Interrupts**: Der User-Taster KEY ist ebenfalls freischwebend; verkabelt, kannst du die Nutzung des EXTI-externen Interrupts üben.
- **USB CDC**: Den CH32V307 selbst als USB-COM-Port-Device enumerieren lassen, ohne über den WCH-Link-gebrückten USART1 zu gehen – ein separates Firmware-Konzept mit USB-Stack, fortgeschrittenes Terrain.
- **Die vollen 288 KB Flash ausreizen**: Zuerst mit dem offiziellen WCH-Tool die option bytes ändern, danach die auskommentierten `board_upload.maximum_size`-Zeilen in `platformio.ini` synchronisieren.
- **FreeRTOS / RT-Thread ansehen**: `framework` auf das passende RTOS umstellen und Multitasking-Scheduling erleben.
- **Debuggen ernsthaft lernen**: Mit OpenOCD + GDB und F5-Breakpoint-Debugging (`pio debug`) das Handwerk des Embedded-Debuggens solide aufbauen.

---

## 21. Referenzen

- Community-PIO-CH32V Plattform-Repo: `github.com/Community-PIO-CH32V/platform-ch32v`
- macOS-Toolchain-Paket: `github.com/Community-PIO-CH32V/toolchain-riscv-mac`
- Toolchain-Releases (auf neue PIO-Versionen lauschen): `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`
- WCH offizielles MounRiver (Quelle der WCH-Custom-Toolchain + IDE): `www.mounriver.com`
- wlink (macOS-Branch): `github.com/Community-PIO-CH32V/tool-wlink` (Branches `mac_arm64` / `mac_x64`)
- Offizielle Doku: `pio-ch32v.readthedocs.io`
- xPack RISC-V GCC (upstream der Toolchain): `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack`
- ursprüngliches wlink-Projekt: `github.com/ch32-rs/wlink`
- WCH offizielle Produktseite: `www.wch.cn/products/CH32V307.html`
- OpenWCH offizielles SDK/Beispiele: `github.com/openwch/ch32v307`
- Hinweis zur freischwebenden LED dieses Boards in der offiziellen Zephyr-Doku
- PlatformIO offizielle Doku: `docs.platformio.org`

---

*Den kompletten Projektcode gibt es synchron auf GitHub – gerne klonen und direkt losrennen. Wenn du bei deinem eigenen Gestolpere auf eine neue Falle stößt, die dieser Artikel nicht abdeckt, freuen wir uns über einen Kommentar – Unterlagen zum CH32V auf dem Mac sind einfach noch zu dünn gesät, und jede geteilte Erfahrung ist eine Falle weniger für die, die danach kommen. Möge deine LED bald leuchten! 🎉*

https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/CH32V/CH32V307-EVT-R1/01%20HelloWorld
