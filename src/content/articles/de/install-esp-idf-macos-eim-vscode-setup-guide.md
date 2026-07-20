---
title:      "ESP-IDF v6.0.2 auf macOS installieren: vom `brew install`-Fehler zum erkannten VSCode-Setup (kompletter Troubleshooting-Pfad)"
domain:     hardware
platforms:  ["mac"]
format:     "tutorial"
relatedBoards: ["esp32s3"]
date:       2026-07-20
intro:      "Auf der Kommandozeile läuft alles, und dann behauptet die VSCode-Erweiterung hartnäckig «setup not found»? Dieser Artikel ist die originalgetreue Aufzeichnung meines Durchlaufs: von `brew install eim` über die Installation von ESP-IDF v6.0.2 per EIM und dem Aufräumen der Windows-Reste im Projekt, bis hin zur wahren Ursache des «setup not found»-Fehlers – eine Config-Variable, die im falschen Scope stand. Alle Befehle und Fehlermeldungen sind real mitgelaufen; bei gleicher Fehlerlage kannst du sie direkt kopieren und weiter suchen."
tags:       ["ESP-IDF installieren", "ESP-IDF macOS", "EIM", "ESP32-S3", "VSCode setup not found", "ESP-IDF konfigurieren"]
image: https://img.lingflux.com/2026/07/79ed5dc15e35419e612ab982e595d127.png
---

# ESP-IDF v6.0.2 auf macOS installieren: vom `brew install`-Fehler zum erkannten VSCode-Setup (kompletter Troubleshooting-Pfad)

Ich hatte vorher schon zweimal manuell ESP-IDF installiert – und zweimal bin ich an irgendeiner Stelle hängengeblieben. Am Ende bin ich nochmal komplett von vorne durchgegangen und habe für jede Fehlermeldung die wahre Ursache ausgegraben. Erst danach wurde mir klar: Das eigentliche Problem steckt gar nicht im »ESP-IDF installieren«, sondern verteilt sich auf fünf voneinander unabhängige Stellen – Homebrew beim Installieren des Tools, der Netzwerkzugriff von EIM, das richtige Plugin in VSCode, ein paar aus Windows übernommene Dateien im Projekt und schließlich die Art, wie die VSCode-Erweiterung ihre Konfiguration liest. Auf der Kommandozeile war nach der Installation alles fein, aber die VSCode-Erweiterung behauptete hartnäckig «setup not found». Die Fehlersuche an genau dieser Stelle hat bei mir am längsten gedauert, und darauf konzentriert sich dieser Artikel.

Das hier ist eine originalgetreue Aufzeichnung der Pannen, die ich durchgemacht habe. Befehle und Fehlermeldungen sind alle wirklich so mitgelaufen; wenn du eine identische Fehlermeldung hast, kannst du sie direkt kopieren und danach suchen, oder du gibst diesen Artikel zusammen mit deiner eigenen Fehlermeldung an eine KI und lässt sie dich nach demselben Gedankengang durch die Diagnose führen.

> **Bevor du loslegst, kurz die Versionsnummern abgleichen.** Von ESP-IDF v5.x auf v6.0.2 wurde die Installationsmethode vom klassischen `install.sh` auf EIM umgestellt; von der VSCode-Erweiterung 1.x auf 2.x wurde die Logik zum Auffinden des Setups komplett neu geschrieben. Wenn deine Versionen abweichen, gilt insbesondere der Abschnitt zur Erweiterungskonfiguration in Schritt 4 höchstwahrscheinlich gar nicht für dich.

## Die getesteten Versionen

| Komponente | Version |
|---|---|
| System | macOS, Apple Silicon (M-Serie) |
| ESP-IDF | v6.0.2 |
| Installations-Tool | EIM 0.17.1 |
| VSCode-Erweiterung | espressif.esp-idf-extension 2.1.0 |
| Ziel-Chip | ESP32-S3 |

Die Pfade in diesem Artikel verwenden meinen lokalen Benutzernamen `shawn`. Wenn du die Befehle direkt übernimmst, ersetze ihn durch deinen eigenen – ein schnelles `whoami` im Terminal zeigt ihn an. Außerdem läuft bei mir lokal ein Clash-Proxy unter `127.0.0.1:7890`. Falls du keinen Proxy brauchst, lass die Umgebungsvariablen mit dem Bestandteil `PROXY` sowie die `--mirror`-Parameter einfach weg – der eigentliche Ablauf ändert sich dadurch nicht.

## Der grobe Fahrplan

Fünf Schritte – je weiter hinten, desto schwerer zu finden:

| Schritt | Was zu tun ist | Typisches Problem |
|---|---|---|
| 0 | Das Tool `eim` selbst per Homebrew installieren | Ein Trust-Hinweis, der leicht als Fehler durchgeht |
| 1 | Mit `eim` ESP-IDF v6.0.2 installieren | Zwei Fallen: Netzwerk und Versionsnummer |
| 2 | In VSCode die ESP-IDF-Erweiterung installieren | Viele ähnlich klingende Plugins – man trifft leicht das falsche |
| 3 | Windows-Reste im Projekt aufräumen | Betrifft nur Projekte, die von Windows kopiert wurden |
| 4 | Die VSCode-Erweiterung dazu bringen, das Setup zu erkennen | Die heimtückischste Falle des ganzen Artikels – hier hängt man am längsten |

---

## Schritt 0: Zuerst das Tool `eim` installieren

`eim` steht für ESP-IDF Manager und ist das offizielle Installations- und Verwaltungstool von Espressif. Sein Vorteil gegenüber dem alten `install.sh`: Du kannst mehrere ESP-IDF-Versionen parallel installieren, ohne dass sie sich in die Quere kommen. Um es selbst zu installieren, musst du zuerst ein Homebrew-Tap (eine Drittanbieter-Quelle) hinzufügen und danach installieren:

Offizielle EIM-Installationsanleitung:
https://dl.espressif.com/dl/eim/index.html

```bash
brew tap espressif/eim
brew install eim
```

Beim ersten Aufruf von `brew install eim` bekam ich diesen Hinweis:

```
Error: Refusing to load formula espressif/eim/eim from untrusted tap espressif/eim.
Run `brew trust --formula espressif/eim/eim` or `brew trust espressif/eim` to trust it.
```

> **Das ist kein Installationsfehler, sondern eine Sicherheitsabfrage von Homebrew.** Neuere Homebrew-Versionen trauen Drittanbieter-Taps (also Quellen außerhalb des offiziellen Repos) standardmäßig nicht. Beim ersten Zugriff auf so einen Tap bekommst du immer erst diesen Hinweis und sollst selbst entscheiden, ob du der Quelle vertraust. Der Tap von Espressif ist offiziell – du kannst ihm bedenkenlos vertrauen:

```bash
brew trust espressif/eim
```

Nach diesem Befehl noch einmal `brew install eim` ausführen, dann läuft die Installation sauber durch. Falls vor dem `brew install` erst eine ganze Liste völlig eim-irrelevanter Pakete auftaucht (irgendwelche Menübar-Tools, KI-Umbennungs-Tools und Ähnliches), ist das Homebrew, das dir zeigt, wie viele veraltete Pakete du gerade hast – irrelevant. Einfach weiter-scrollen bis zur echten Fehlerzeile.

Nach der Installation kurz prüfen:

```bash
eim --version
```

Wenn sauber eine Versionsnummer zurückkommt, ist dieser Schritt geschafft und du kannst mit der eigentlichen ESP-IDF-Installation weitermachen.

---

## Schritt 1: ESP-IDF v6.0.2 mit EIM installieren

Tool installiert – ein einziger Befehl installiert ESP-IDF:

```bash
HTTPS_PROXY=http://127.0.0.1:7890 \
HTTP_PROXY=http://127.0.0.1:7890 \
ALL_PROXY=socks5://127.0.0.1:7890 \
eim install -i v6.0.2 -t esp32s3 -n true \
  --idf-mirror https://git.espressif.com.cn \
  --pypi-mirror https://pypi.mirrors.ustc.edu.cn/simple
```

Bedeutung der Parameter:

- `-i v6.0.2`: die zu installierende Version, **das `v`-Präfix ist Pflicht**, siehe unten;
- `-t esp32s3`: der Ziel-Chip;
- `-n true`: nicht-interaktiver Modus, sonst bleibt der Aufruf an einer Terminal-Rückfrage hängen und wartet auf Enter;
- `--idf-mirror` / `--pypi-mirror`: Inlands-Spiegelserver; den Quellcode über den offiziellen Espressif-China-Spiegel, Python-Pakete über den USTC-Spiegel; wer sie nicht braucht, lässt sie einfach weg;
- die drei `PROXY`-Umgebungsvariablen: für den internen Git-Zugriff von EIM, siehe Falle 1 unten.

Der Befehl wirkt simpel, beim ersten Lauf bin ich aber in zwei Fallen gestolpert – beide vom Typ »Sieht nach normaler Installation aus, aber intern geht heimlich etwas schief«.

### Falle 1: Proxy in der Git-Konfig bringt nichts, EIM ignoriert ihn

EIM zieht den IDF-Quellcode intern über die Rust-Bibliothek `gix`. Diese Bibliothek ignoriert die klassische Konfiguration per `git config --global http.proxy` und liest nur die System-Umgebungsvariablen `HTTPS_PROXY`, `HTTP_PROXY` und `ALL_PROXY`. Steht dein Proxy nur in der Git-Konfiguration, ohne passende Umgebungsvariablen, versucht `gix` eine Direktverbindung, scheitert beim Fetch wiederholt und flutet das Log mit Zeilen wie dieser:

```
WARN - Attempt N failed: "Failed to fetch: Failed to consume the pack sent by the remote"
```

Nach drei Fehlschlägen fällt `gix` automatisch auf das System-Git zurück (das System-Git kennt `git config` und nutzt den Proxy korrekt), daher klappt es am Ende wahrscheinlich trotzdem – aber du wartest mehrere Minuten umsonst, und der Clone-Status nach so einem Fallback ist nicht besonders sauber. Am bequemsten ist es, die Proxy-Variablen von vornherein direkt in den Befehl zu packen, damit `gix` beim ersten Versuch durchläuft, statt erst dreimal zu scheitern und dann zurückzufallen.

### Falle 2: Versionsnummer ohne `v` führt zu Fehler

Die Release-Tags im offiziellen Espressif-Repo haben alle die Form `v6.0.2` mit `v`. Der Parameter `-i` von EIM wird direkt als Git-Tag-Name verwendet. Schreibst du `-i 6.0.2` (ohne v), erscheint:

```
fatal: Remote branch 6.0.2 not found in upstream origin
```

Auch diese Meldung stammt wieder von dem Fallback, den das System-Git nach dem Scheitern von `gix` übernimmt – Git findet remote keinen Branch namens `6.0.2` (ohne v). Mit `-i v6.0.2` funktioniert es einwandfrei. Wenn du dir unsicher bist, wie genau der Tag für eine bestimmte Version heißt, kannst du vorher nachschauen, was es remote gibt:

```bash
git ls-remote --tags https://git.espressif.com.cn/espressif/esp-idf.git 'v6.0*'
```

### Nach der Installation prüfen

```bash
eim list
# Hier sollte v6.0.2 (selected) auftauchen

source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py --version
# Wenn ESP-IDF v6.0.2 ausgegeben wird, ist die Installation erfolgreich
```

### Wo liegt was nach der Installation

Die Verzeichnisstruktur, die EIM erzeugt, unterscheidet sich von der klassischen Methode. Alle späteren Konfigurationen verweisen auf diese Pfade – behalt sie also im Kopf:

```
IDF-Quelle           ~/.espressif/v6.0.2/esp-idf
Toolchain            ~/.espressif/tools/
Python venv          ~/.espressif/tools/python/v6.0.2/venv
Aktivierungs-Skript  ~/.espressif/tools/activate_idf_v6.0.2.sh
EIM-Installationsliste ~/.espressif/tools/eim_idf.json
```

Ein Hinweis zur Lage der Python-Virtualenv: Sie versteckt sich unter `tools/python/v6.0.2/venv` und liegt nicht mehr im Projektverzeichnis unter `python_env/` wie in älteren Versionen. Beim ersten Suchen stolpert man da leicht drüber.

---

## Schritt 2: Die ESP-IDF-Erweiterung in VSCode installieren

Auf der Kommandozeile ist alles erledigt – zurück in VSCode. Erweiterungs-Panel öffnen (`Cmd+Shift+X`) und nach «ESP-IDF» suchen.

> **Viele installieren hier das falsche Plugin – prüf unbedingt den Herausgeber.** Die Suche spuckt mehrere ähnlich klingende Plugins mit fast identischen Icons aus, anhand des Namens allein trifft man schnell das falsche. Gleiche diese Felder ab, und installiere erst, wenn alles passt:

| Feld | Inhalt |
|---|---|
| Plugin-Name | ESP-IDF |
| Herausgeber | Espressif Systems |
| Herausgeber-Seite | espressif.com |
| Installationen | 1.582.039 |
| Bewertung | 145 Bewertungen |
| Kurzbeschreibung | Develop and debug applications for Espressif chips with ESP-IDF |

**Schau auf den Herausgeber, nicht nur auf den Namen.** Als Herausgeber muss **Espressif Systems** stehen, die Domain ist **espressif.com**, die Installationszahlen liegen im Millionenbereich – das sind die offensichtlichsten Merkmale des offiziellen Plugins. Wenn du hier das falsche Plugin erwischt, existieren die Konfigurationsoptionen aus Schritt 4 (`idf.eimIdfJsonPath`, `idf.currentSetup` und so weiter) vielleicht gar nicht, oder das Verhalten passt hinten und vorne nicht. Die Fehlersuche wird mysteriös, weil die eigentliche Ursache ganz am Anfang lag: das falsche Plugin.

Nach der Installation VSCode einmal neu starten (oder `Cmd+Shift+P` → `Reload Window`), damit die Erweiterung aktiv wird. Dann geht es weiter.

---

## Schritt 3: Projekt von Windows übernommen? Erst diese drei Dateien aufräumen

**Wenn dein Projekt frisch neu erstellt ist, kannst du diesen Schritt komplett überspringen.** Bei einem Projekt, das von einem Windows-Rechner kopiert wurde, trittst du hier aber fast garantiert in eine Falle – in drei Dateien verstecken sich Windows-spezifische Pfade, die auf macOS sofort nicht mehr funktionieren.

### ① `.vscode/settings.json`

Ersetze alle Windows-Pfade wie `C:\...`, die COM-Port-Namen (z. B. `COM22`) und die alten Versionsnummern durch die tatsächlichen Werte auf macOS:

```jsonc
{
  "idf.espIdfPath": "/Users/shawn/.espressif/v6.0.2/esp-idf",
  "idf.toolsPath":  "/Users/shawn/.espressif",
  "idf.pythonInstallPath": "/Users/shawn/.espressif/tools/python/v6.0.2/venv/bin/python",
  "idf.port": "/dev/cu.usbmodemXXXXXXXXXXX",
  "idf.customExtraVars": { "IDF_TARGET": "esp32s3" },
  "idf.flashType": "UART"
}
```

Den eigenen seriellen Geräte-Namen findest du mit diesem Befehl heraus:

```bash
ls /dev/cu.usb*
```

### ② `.vscode/c_cpp_properties.json`

Der `compilerPath` zeigt ursprünglich auf die Windows-Variante `xtensa-esp32s3-elf-gcc.exe`, und auch die Toolchain-Versionsnummer ist meist veraltet. Tausche beides gegen die Version, die tatsächlich auf dem Mac installiert ist. Am besten hardcodierst du den Pfad nicht, sondern greifst auf die Variable `toolsPath` zurück – dann musst du beim Upgrade nichts mehr anfassen:

```jsonc
"compilerPath": "${config:idf.toolsPath}/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc"
```

Die Versionsnummer `esp-15.2.0_20251204` erfindest du nicht einfach – schau unter `~/.espressif/tools/xtensa-esp-elf/` nach, welcher Ordner dort tatsächlich existiert, und trag den genau so ein.

### ③ `dependencies.lock` – die am leichtesten übersehene

Das ist die Lock-Datei des idf-component-manager. Unter Windows wurde sie im alten v2.0.0-Format erzeugt, das auch **absolute Pfade** lokaler Components einträgt – etwa das Verzeichnis auf dem Rechner des ursprünglichen Autors:

```yaml
espressif/esp_lcd_touch:
  source:
    path: C:\Users\PC\Desktop\...\espressif__esp_lcd_touch
    type: local
```

Bei einem `reconfigure` auf dem Mac existiert dieser Pfad natürlich nicht, und du bekommst:

```
CMake Error: The "path" field in the manifest file ... does not point to a directory.
```

Diese Datei ist im Grunde ein automatisch erzeugter Cache – am einfachsten löschst du sie und lässt sie neu erzeugen:

```bash
rm dependencies.lock
rm -rf build
source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py reconfigure
```

Danach wird sie im v3.0.0-Format neu erzeugt, die Pfade sind lokal, und die Komponenten aus der Registry werden erneut in das Verzeichnis `managed_components/` heruntergeladen.

**Ab hier sollte `idf.py build` auf der Kommandozeile sauber durchlaufen.** Falls nicht, liegt das Problem nicht in diesen Dateien, sondern woanders.

---

## Schritt 4: Die VSCode-Erweiterung sagt «setup not found» (hier hakt es richtig)

Alles war auf der Kommandozeile fein – ich dachte, ich sei am Ziel. Aber in VSCode zeigte die Statusleiste beharrlich:

```
Current ESP-IDF setup is not found.
```

Zweimal Window reloaded, ein paar verwandt aussehende Config-Einträge geändert – alles zwecklos. Erst nachdem ich den Quellcode der Erweiterung (`dist/extension.js`) durchgesehen hatte, wurde die komplette Setup-Such-Logik klar:

1. Aus der Datei `eim_idf.json`, auf die `idf.eimIdfJsonPath` zeigt, wird eine Liste der installierten Setups gelesen;
2. der Wert von `idf.currentSetup` wird gegen diese Liste per Pfad abgeglichen;
3. findet sich keine Übereinstimmung, wird die Liste komplett durchlaufen und geprüft, ob sich ein Setup verifizieren lässt;
4. schlägt alles fehl, erscheint die Meldung «not found».

Voraussetzung für diese Logik ist, dass die Liste aus Schritt 1 überhaupt lädt. Ich bin zwei Umwege gegangen, bevor ich die eigentliche Ursache gefunden hatte. Der erste war reine Zeitverschwendung und muss nicht nachgemacht werden, der zweite ist die echte Reparatur. Das vorab, damit du beim Mitmachen am Artikel weißt, was du anfassen darfst und was nicht:

- **Umweg eins: keine Aktion nötig, nur die Mechanik verstehen, dann überspringen;**
- **Umweg zwei: hier musst du ran, das ist die echte Reparatur.**

### Umweg eins (kannst du ignorieren, nur fürs Verständnis): Was gehört eigentlich in `idf.currentSetup`?

Die offizielle Beschreibung dieser Option lautet «Current ESP-IDF setup id in eim_idf.json path» – liest sich so, als müsste eine ID (ein Bezeichner) rein. Schaut man aber in den Quellcode, schreibt die Erweiterung nach der Auswahl eines Setups tatsächlich das hier:

```js
await _o("idf.currentSetup", c.idfPath, ConfigurationTarget.WorkspaceFolder, e)
```

Reingeschrieben wird `idfPath` – also ein **Pfad**, keine ID. Taucht dieser Eintrag also in der Workspace-Konfiguration auf, sollte er so aussehen:

```jsonc
"idf.currentSetup": "/Users/shawn/.espressif/v6.0.2/esp-idf"
```

Diesen Eintrag musst du **nicht von Hand anpassen** – er ist nicht die Ursache. Sobald die Setup-Liste aus Umweg zwei unten laden kann, durchläuft die Erweiterung selbstständig die Einträge, findet das einzige installierte v6.0.2 und schreibt den Pfad automatisch in `currentSetup` zurück – das macht die Erweiterung ganz allein. Ich zeige das hier nur, damit du weißt, wofür das Feld gut ist, wenn du es siehst. Du musst es nicht anfassen, nur weil es «falsch aussieht». Hand anlegen musst du erst beim nächsten Punkt.

### Umweg zwei (hier wird repariert): Der Scope von `idf.eimIdfJsonPath` stimmt nicht

VSCode-Optionen haben verschiedene Scopes. Der Scope von `idf.eimIdfJsonPath` ist **`application`** – das heißt, sie **wirkt ausschließlich in der globalen User-settings.json**. Steht sie nur in der projekteigenen `.vscode/settings.json`, wird sie schlicht ignoriert – du kannst sie eintragen, soviel du willst.

Ich hatte `eimIdfJsonPath` vorher immer in der Workspace-Konfiguration des Projekts stehen, deshalb konnte die Erweiterung die Datei `eim_idf.json` gar nicht laden – die Setup-Liste aus Schritt 1 blieb dauerhaft leer. Eine leere Liste lässt sich mit jedem Wert von `currentSetup` nicht abgleichen. Und das war die wahre Ursache, warum die ersten beiden Reloads nichts brachten.

> **Reparatur: Verschieb `idf.eimIdfJsonPath` in die globale Konfigurationsdatei.**

Unter macOS liegt die globale Konfigurationsdatei von VSCode hier:

```
~/Library/Application Support/Code/User/settings.json
```

Datei mit einem Editor öffnen und diese Zeile ergänzen:

```jsonc
"idf.eimIdfJsonPath": "/Users/shawn/.espressif/tools/eim_idf.json"
```

In der Workspace-Datei `.vscode/settings.json` behältst du nur `idf.currentSetup` (gesetzt auf den IDF-Pfad). **Steck `eimIdfJsonPath` nicht ebenfalls in den Workspace** – es wirkt dort nicht und erzeugt nur die Illusion, alles sei richtig konfiguriert.

Nach der Änderung `Cmd+Shift+P` öffnen und **Reload Window** wählen. Nach dem Neuladen zeigt die Statusleiste die ESP-IDF-Version und den Ziel-Chip an – dann hat die Erweiterung das Setup endlich erkannt.

Falls es nach dem Reload noch klemmt, lohnt sich ein Blick ins Live-Log der Erweiterung: `Cmd+Shift+P` → `Output`, dann im Dropdown oben rechts im Output-Panel den Kanal **ESP-IDF** wählen. Die Meldungen dort sind deutlich auskunftsfreudiger als der Einzeiler in der Statusleiste.

### Unsicher, welchen Scope eine Option hat? Nachschlagen statt raten

Die Scope-Informationen einer VSCode-Erweiterung stehen alle in ihrer eigenen `package.json`. Anstatt zu raten, kannst du mit ein paar Zeilen direkt nachschauen:

```bash
python3 -c "
import json
p = json.load(open('/Users/shawn/.vscode/extensions/espressif.esp-idf-extension-2.1.0/package.json'))
cfg = p['contributes']['configuration']
props = {}
if isinstance(cfg, list):
    for c in cfg:
        props.update(c.get('properties', {}))
else:
    props = cfg.get('properties', {})
for k in ['idf.eimIdfJsonPath', 'idf.currentSetup', 'idf.espIdfPath']:
    print(k, '->', props.get(k, {}).get('scope', 'window(Standard)'))
"
```

---

## Spickzettel

### Wohin mit den Config-Optionen

| Option | Scope | Wohin schreiben |
|---|---|---|
| `idf.eimIdfJsonPath` | application | globale User-settings |
| `idf.currentSetup` | resource | Workspace `.vscode/settings.json` |
| `idf.espIdfPath` / `idf.toolsPath` / `idf.pythonInstallPath` | window | Workspace oder global, beides geht |

### Wichtige Pfade

```
IDF-Quelle        ~/.espressif/v6.0.2/esp-idf
Toolchain         ~/.espressif/tools/
xtensa gcc        ~/.espressif/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc
Python venv       ~/.espressif/tools/python/v6.0.2/venv/bin/python
Aktivierung       source ~/.espressif/tools/activate_idf_v6.0.2.sh
EIM-Liste         ~/.espressif/tools/eim_idf.json
globale settings  ~/Library/Application Support/Code/User/settings.json
```

### Häufige Befehle

```bash
brew tap espressif/eim                              # Offizielles Tap hinzufügen
brew trust espressif/eim                            # Beim ersten Drittanbieter-Tap Vertrauen erteilen
brew install eim                                    # eim selbst installieren

eim list                                            # Installierte Versionen anzeigen
eim install -i v6.0.2 -t esp32s3 -n true ...        # ESP-IDF installieren (Parameter siehe Schritt 1)

source ~/.espressif/tools/activate_idf_v6.0.2.sh    # ESP-IDF-Umgebung in der aktuellen Shell aktivieren
idf.py set-target esp32s3                           # Ziel-Chip festlegen
idf.py reconfigure                                  # Nur die CMake-Konfiguration laufen lassen, erzeugt compile_commands.json
idf.py build                                        # Kompilieren
idf.py -p /dev/cu.usbmodemXXXX flash monitor        # Flashen und seriellen Monitor öffnen
```

---

## Reihenfolge bei der Fehlersuche: Wenn du feststeckst, hier zuerst eingrenzen

Wenn du nicht weißt, wo du ansetzen sollst, arbeite diese Reihenfolge von oben nach unten ab – das ist deutlich schneller als planloses Ausprobieren:

1. **Lässt sich `brew install eim` durchführen?** Wenn nicht, schau nach, ob eine `brew trust`-Aufforderung kommt – dann einfach vertrauen, siehe Schritt 0;
2. **Läuft `idf.py --version`?** Wenn nicht → das Problem liegt in der Installation oder Aktivierung, siehe Schritt 1;
3. **Stimmen die Suchergebnisse im Erweiterungs-Panel von VSCode?** Falls nach der Installation die Konfigurationsoptionen nicht passen oder das Plugin sich ganz anders verhält, als in diesem Artikel beschrieben → prüf zuerst, ob als Herausgeber wirklich Espressif Systems steht. Wahrscheinlich hast du von Anfang an das falsche Plugin erwischt, siehe Schritt 2;
4. **Läuft `idf.py reconfigure` durch?** Wenn nicht → das Problem liegt in den Projektdateien, insbesondere `dependencies.lock` prüfen, siehe Schritt 3;
5. **Kommandozeile ist sauber, aber VSCode meldet «setup not found»?** → das Problem liegt in der Erweiterungskonfiguration, insbesondere den Scope von `eimIdfJsonPath` prüfen, siehe Schritt 4.

Zwei Sackgassen vorab, damit du dir die Mühe sparst:

- Der Tag v6.0.2 bringt von sich aus keine `version.txt`-Datei mit. Das ist **kein** fehlendes File beim Clone, und die Erweiterung liest diese Datei ohnehin nicht – keine Panik, wenn sie fehlt.
- Der Wert von `idf.currentSetup` ist fast nie die Ursache für «setup not found». Bei diesem Fehler also nicht sofort diesen Wert ändern, sondern zuerst prüfen, ob `eimIdfJsonPath` wirklich in den globalen settings steht und nicht in der Workspace-Konfiguration.

---

Wenn du nach diesem Artikel durchgehst und trotzdem feststeckst, ist die Ursache meistens ein Versions-Drift – die Installationsmethode von ESP-IDF und die Setup-Such-Logik der VSCode-Erweiterung haben sich in den letzten Jahren mehrfach geändert, und ältere Tutorials passen nicht unbedingt zu neuen Versionen. Gib deiner KI die tatsächlich installierte ESP-IDF-Version, die EIM-Version, die Erweiterungsversion und die konkrete Fehlermeldung zusammen und lass sie anhand der Vier-Schritte-Logik aus diesem Artikel (Tool installieren → IDF installieren → Projektdateien aufräumen → Erweiterung konfigurieren) diagnostizieren – das führt schneller zur kaputten Schicht als das reine Suchen nach Fehler-Keywords.
