---
title: "Lobster-Halten fuer Anfaenger | OpenClaw von der Installation bis zur Browser-Steuerung – alles in einem Artikel"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-06
intro: "Schon mal OpenClaw installiert und konnte danach nichts damit anfangen? Der Autor hat persoenlich 10 Mal deinstalliert und neu installiert und die Konfigurationslogik von OpenClaw 2026.3.2 komplett durchschaut – von der API-Einbindung ueber eigene Provider bis hin zur Browser-Steuerung und Dateizugriff-Berechtigungen. Jeder Schritt mit Screenshots und Befehlen. Perfekt fuer macOS-Nutzer, Anfaenger und alle, die von veralteten Tutorials in die Irre gefuehrt wurden."
image: "https://img.lingflux.com/2026/03/015705fbca42171bdf09fabe9220b546.webp"
tags: ["openclaw config guide", "openclaw 2026 setup", "openclaw tools profile", "OpenClaw Konfigurations-Tutorial", "OpenClaw Berechtigungseinstellungen", "OpenClaw neueste Version"]
---

Ihr haltet jetzt alle schon eine Weile Lobster, und ich habe das Gefuehl, die aktuelle Version sollte mittlerweile recht stabil sein. Frueher hat mich schon der Name zur Verzweiflung getrieben – die Webseite hiess ClawdBot, aber der Installationsbefehl hiess install MoltBot, und dann auf einmal hiess es OpenClaw. Das ist kein Bug, das ist Open-Source-Tradition: Erstmal machen, und wenn die Abmahnung kommt, dann wird umbenannt. (Claude hat ClawBot verklagt, weil es zu aehnlich klingt, und seitdem ist Claw noch beruehmtter.)

In den letzten Tagen beim Testen hatte ich das Gefuehl, es gibt jeden Tag ein Update. Um die Konfigurationslogik zu verstehen, habe ich es geloescht, neu installiert, wieder geloescht – von

2026.2.25
2026.2.26
2026.3.1
2026.3.2
....

Die Update-Frequenz ist einfach irre. Vor allem beim Testen der neuesten Version 2026.3.2 (Stand 6. Maerz 2026) habe ich festgestellt, dass sich die Konfigurationsmethode geaendert hat, weshalb die vorherigen Tests nicht mehr funktionieren. In dieser Version ist die Standardkonfiguration sicherheitstechnisch deutlich restriktiver geworden – hoehere Berechtigungen muessen manuell konfiguriert werden.

An OpenClaw mag ich besonders, dass es den Browser steuern und auf Systemdateien zugreifen kann. Natürlich bringt das auch viele Sicherheitsfragen mit sich, also muss man es sorgfaeltig einsetzen. Um diesen kleinen Lobster richtig zu halten, muss man sich die Zeit nehmen und lernen, wie man ihn konfiguriert.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/flZj-SpTJmQ?si=Jn8A8xWZ-jIZQCeo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## Bevor wir beginnen: Reicht dein API-Guthaben?

OpenClaw selbst ist Open Source und kostenlos, aber damit es "Hand anlegen" kann, braucht es ein AI-Modell im Hintergrund – und das erfordert einen API-Token.

Wenn dein Token fast aufgebraucht ist oder du noch nie eines konfiguriert hast, hier zwei Plattformen mit guter Preis-Leistung:

- **ZhiPu GLM**: Unterstuetzt Claude Code, Cline und 20+ weitere Tools, mit zeitlich begrenztem Abo-Angebot -> [Link](https://www.bigmodel.cn/glm-coding?ic=IPWNTCEXE2) (Ich nutze das gerade – und nein, das ist KEINE Werbung!!! KEINE Werbung!!! KEINE Werbung!!! Keine Bezahlung. Werbeplaetze noch zu vermieten.)

	![image-20260306102449045](https://img.lingflux.com/2026/03/52e663b49875f0ab36c9fc1f2ff806dd.png)

	1. Dein API KEY: Im Control Center den API Key finden und kopieren
	2. GLM-Adresse: https://open.bigmodel.cn/api/anthropic (Adresse kompatibel mit Claude Code)
	3. Modellname: GLM-4.7

	Merk dir diese drei Informationen, du wirst sie bei der kommenden Konfiguration brauchen.

- **Alibaba Cloud Bailian**: Alle grossen Modelle, Neukunden haben ein kostenloses Kontingent -> [Link](https://www.aliyun.com/benefit/ai/aistar?clubBiz=subTask..12406352..10263..) (Das ist auch gut – und nein, auch das ist KEINE Werbung!!!)

Wenn du bereit bist, legen wir los.





## OpenClaw installieren – los geht's

Ich nutze macOS, das ist das beste System fuer die Lobster-Haltung, weil der Entwickler selbst macOS nutzt. Da gibt es die wenigsten Probleme. Bei Windows, Raspberry Pi OS oder Linux kann es kleine Unterschiede geben. Aber das Projekt hat viele Mitwirkende, auch grosse Probleme werden schnell behoben.

Meine Empfehlung, von besten bis "am besten":

macOS > Linux > Windows > others

Schau zuerst auf der offiziellen Webseite, es gibt verschiedene Installationsmethoden: https://openclaw.ai/

### Schnellinstallation unter macOS

Bei macOS bietet die offizielle Seite einen App-Download an, aber ich weiss nicht warum, ich konnte die App einfach nicht installieren. Der Einzeiler `curl -fsSL https://openclaw.ai/install.sh | bash` funktioniert auch nicht immer zuverlaessig, also waehle ich die npm-Installationsmethode. Im Terminal eingeben:

```bash
# OpenClaw installieren
npm i -g openclaw
```

Geduldig warten, bis die Installation abgeschlossen ist, dann weiter eingeben:

```bash
# Deinen Lobster konfigurieren
openclaw onboard
```

Dann startet der Konfigurationsassistent. Geh alles in Ruhe durch und konfiguriere Schritt fuer Schritt die API. Der ungefaehre Ablauf sieht so aus:



### 1. Hier wird nach deinem Anwendungsszenario gefragt:

- **Personal (persoenliche Nutzung)**: Nur du nutzt diesen Mac Mini -> waehle **Yes**
- **Shared/multi-user (Mehrpersonenbetrieb)**: Mehrere Benutzerkonten teilen sich diese Maschine, zusaetzliche Berechtigungsverwaltung noetig -> waehle No

**Waehl einfach Yes**, mit Enter bestaetigen und weiter.

![image-20260306103540426](https://img.lingflux.com/2026/03/f4a9f8ac970e447eadd09b4533d4c6c0.png)



### 2. Hier waehlst du die **Installationskonfigurationsmethode**:

- **QuickStart**: Erstmal schnell installieren, Detailkonfiguration (API-Schluessel, Modellauswahl etc.) spaeter vornehmen
- **Manual**: Jetzt schrittweise alles manuell konfigurieren

------

**Empfehlung: QuickStart**, aus folgenden Gruenden:

- Erstmal zum Laufen bringen, spaeter mit `openclaw config set` in Ruhe anpassen
- Spart Zeit und Muhe



![image-20260306104637473](https://img.lingflux.com/2026/03/e3a2171975e988818fbaf4a59195d72d.png)



### 3. Entscheidend: Welchen **AI-Model-Provider** waehlst du als "Gehirn" fuer OpenClaw.

Kurz gesagt: **OpenClaw selbst bietet keine AI, du musst einen AI-Dienstleister anbinden.**

------

Erklaerung der haeufigsten Optionen

| Option                  | Beschreibung                                   |
| ----------------------- | ---------------------------------------------- |
| **OpenAI**              | GPT-4o etc., am weitesten verbreitet           |
| **Google**              | Gemini-Serie                                   |
| **XAI (Grok)**          | Musks AI                                       |
| **Moonshot AI (Kimi)**  | Chinesisch, sehr gute Chinesisch-Unterstuetzung |
| **Mistral AI**          | Europa, Open-Source-Modelle                    |
| **OpenRouter**          | Aggregator, ein Key fuer mehrere Modelle       |
| **Qianfan**             | Baidu Wenxin                                   |
| **Volcano Engine**      | ByteDance Volcano Engine                       |
| **Hugging Face**        | Open-Source-Modellplattform                    |

Diese Auswahl ist extrem wichtig, denn laut Internetberichten kann es selbst bei chinesischen Modellen Unterschiede zwischen inlaendischen und auslaendischen Versionen geben. Wenn du direkt einen Anbieter aus der Liste waehlst (z.B. Qwen, Z.AI etc.), stimmt die URL des Modelleingangs moeglicherweise nicht.

Daher empfehle ich `Custom Provider`, mit Enter bestaetigen. (So bestimmst du die URL selbst – da kann nichts schiefgehen.)



![image-20260306104908514](https://img.lingflux.com/2026/03/f0f7b7cf1b38d23375a9c9d36a8abea8.png)



Danach wirst du nach der API Base URL gefragt. Kopiere einfach die entsprechende URL. In meiner Demo verwende ich die Adresse, die ich dir weiter oben gezeigt habe:
https://open.bigmodel.cn/api/anthropic   (Nach der Eingabe Enter druecken)

![image-20260306105524813](https://img.lingflux.com/2026/03/1bcc60387a3ba29b530e1bb53be24bf8.png)

Ob du jetzt den API KEY eingeben moechtest? Waehle "Paste API key now", mit Enter bestaetigen.

![](https://img.lingflux.com/2026/03/05a5eca5b5fa006180662a65d2ae9381.png)

Jetzt deinen API KEY einfuegen und Enter druecken.

![image-20260306105827355](https://img.lingflux.com/2026/03/291d99669c65b615d719844ddf743cee.png)

Danach wird gefragt, welches **Schnittstellenformat** dein AI-Dienstleister verwendet:

- **OpenAI-compatible**: Schnittstellenformat wie bei OpenAI – die meisten Modelanbieter unterstuetzen dieses Format (OpenRouter, Kimi, Volcano Engine, Mistral etc.)
- **Anthropic-compatible**: Schnittstellenformat wie bei Anthropic (Claude)

Da meine URL mit Claude Code kompatibel ist, waehle ich einfach "Anthropic-compatible".

![image-20260306110230234](https://img.lingflux.com/2026/03/b515ca0d12b745463dee0ae52c35b1ab.png)

Danach wirst du nach der Modell-ID gefragt. Hier musst du bei deinem AI-Anbieter nachschauen, wie das Modell genau heisst.

In der Demo verwende ich GLM-4.7 (inzwischen wird bereits GLM-5.0 unterstuetzt – bitte gib den entsprechenden Modellnamen ein), mit Enter bestaetigen.

![image-20260306110457127](https://img.lingflux.com/2026/03/403f089e93c1d87df6cad0021532f953.png)

Kurz warten, dann wird ein API-Verbindungstest durchgefuehrt. Wenn der Test erfolgreich ist, erscheint "Verification successful". Herzlichen glueckwunsch, du hast den kompliziertesten Teil der Konfiguration geschafft!

![image-20260306110630506](https://img.lingflux.com/2026/03/3d695e4ca1951bb4247a8e87c66f1295.png)

Danach wirst du nach einer Endpoint ID gefragt (ein **einzigartiger Name** fuer diese AI-Anbieterkonfiguration, zur besseren Unterscheidung). Einfach den Standardwert verwenden und Enter druecken.

Danach wirst du nach einem Model alias gefragt (ein **kurzer Spitzname** fuer das Modell, damit du beim Wechseln weniger tippen musst). Leer lassen oder etwas eingeben – beides geht, mit Enter bestaetigen.



### 4. Waehlen, ueber **welche Chat-App** du mit der AI kommunizieren moechtest.

Kurz gesagt: Wo moechtest du mit deinem AI-Bot chatten?

------

Erklaerung der haeufigsten Optionen

| Option             | Beschreibung                                |
| ------------------ | ------------------------------------------- |
| **Telegram**       | Empfohlen, am einfachsten einzurichten, anfaengerfreundlich |
| **Discord**        | Fuer Gaming/Community-Nutzer                |
| **Slack**          | Fuer Arbeitsumgebungen                      |
| **Feishu/Lark**    | Haeufig in chinesischen Unternehmen         |
| **LINE**           | Haeufig in Japan/Suedostasien               |
| **iMessage**       | Fuer Apple-Nutzer                           |
| **Signal**         | Fuer Datenschutz-Enthusiasten              |
| **Skip for now**   | Erstmal ueberspringen, spaeter konfigurieren |

Hier waehlen wir zunaechst "Skip for now", da der Platz begrenzt ist – das folgt im naechsten Teil.

![image-20260306111140666](https://img.lingflux.com/2026/03/d1d97190310ba6be3e243af0b89ce93c.png)

### 5. Waehlen, ob Skills konfiguriert werden sollen

Auch hier waehlen wir NO – Platzgrunde, naechstes Mal mehr.

![image-20260306111359363](https://img.lingflux.com/2026/03/2fbc070efc12fe983d83711229631147.png)



### 6. Danach kommt eine Reihe von API-Konfigurationen – alle mit NO ueberspringen

Hier wird gefragt, ob du zusaetzliche **Funktions-Plugins** konfigurieren moechtest. Jedes benoetigt einen eigenen API Key:

------

| Abfrage                         | Funktion                          | Was du brauchst             |
| ------------------------------- | --------------------------------- | --------------------------- |
| **GOOGLE_PLACES_API_KEY**       | Karten/Ortssuche (Google Maps)    | Google Cloud API Key        |
| **GEMINI_API_KEY**              | Gemini AI-Modell nutzen           | Google AI Studio Key        |
| **NOTION_API_KEY**              | Notion-Notizen verbinden          | Notion Integration Token    |
| **OPENAI_API_KEY (image-gen)**  | AI-Bildgenerierung (DALL-E)       | OpenAI API Key              |
| **OPENAI_API_KEY (whisper)**    | Sprache zu Text                   | OpenAI API Key              |
| **ELEVENLABS_API_KEY**          | AI-Sprachsynthese (Text zu Sprache) | ElevenLabs Key            |

------

Was tun? **Jetzt einfach alle mit No ueberspringen**, aus folgenden Gruenden:

- Das sind alles optionale Funktionen, die die grundlegende Nutzung nicht beeinflussen
- Ohne das entsprechende Konto bringts auch nichts, etwas einzutragen
- Spaeter jederzeit nachkonfigurierbar

![image-20260306111518497](https://img.lingflux.com/2026/03/66c6830490fd101cd8bc45b7b3bf041c.png)

### 7. **Hooks sind Automatisierungs-Ausloeser** – sie fuehren bei bestimmten Ereignissen automatisch Aktionen aus.

| Option                      | Funktion                                               |
| --------------------------- | ------------------------------------------------------ |
| **Skip for now**            | Alle ueberspringen                                     |
| **boot-md**                 | Beim Start automatisch bestimmte Anweisungen/Prompts laden |
| **bootstrap-extra-files**   | Beim Start zusaetzliche Dateien laden                  |
| **command-logger**          | Alle Aktionen im Log aufzeichnen                       |
| **session-memory**          | Bei `/new` oder `/reset` automatisch den aktuellen Chat-Verlauf speichern |

------

Empfehlung: **Nur `session-memory` auswaehlen**, das ist das praktischste – es ermoeglicht der AI, sich an fruehere Gespraeeche zu erinnern.

Den Rest beim ersten Mal ueberspringen, spaeter wenn du mehr Erfahrung hast kannst du es aktivieren.

Mit **Leertaste** auswaehlen, mit Enter bestaetigen.

![image-20260306111717358](https://img.lingflux.com/2026/03/ef24d76177a3e999293f7e0da00389da.png)



### 8. Auf welche Weise du deinen Bot starten und nutzen moechtest:

- **Hatch in TUI**: Direkt im Terminal nutzen, Kommandozeilenoberflaeche.
- **Open the Web UI**: (Empfohlen) Im Browser eine Weboberflaeche oeffnen.
- **Do this later**: Spaeter.

Hier waehle "Open the Web UI", bestaetigen mit Enter.

![image-20260306112107760](https://img.lingflux.com/2026/03/3244eb382e44133d4cc81f6ec18e57af.png)

Jetzt oeffnet sich automatisch die OpenClaw-Web-UI im Browser.

## Dein erstes Gespraech mit dem kleinen Lobster (OpenClaw)

![image-20260306112419909](https://img.lingflux.com/2026/03/f40a3a5c08362eecb739689dbcba3139.png)

Wenn OpenClaw antwortet, heisst das: Installation erfolgreich, alles laeuft.

Herzlichen glueckwunsch!

Aber im Moment kann dein kleiner Lobster nur schreien und auf Futter warten – er hat noch keine Haende. Alles, was du ihm sagst, kann er nicht ausfuehren (Browser oeffnen, Dateien aendern – alles nicht).

![image-20260306113036590](https://img.lingflux.com/2026/03/833a2ec19f73a2caab5a9aeb5138a0d2.png)





## Browser-Steuerung und Dateizugriff-Berechtigungen konfigurieren

Achtung: Die folgenden Schritte erhoehen die Berechtigungen deines OpenClaw. Bitte lies alles aufmerksam durch und lerne die Zusammenhaenge.

### OpenClaw hat 2 Modi fuer die Browser-Steuerung

1. (Isolationsmodus) Nutzt den in OpenClaw eingebauten Browser, komplett vom lokalen System isoliert, mit eigenen Login-Daten.

2. (Erweiterungsmodus) Nutzt den lokalen Chrome-Browser, installiert die OpenClaw Browser Relay-Erweiterung und teilt die lokalen Login-Daten.

> In diesem Beispiel demoen wir den **Erweiterungsmodus** mit dem lokalen Chrome-Browser.



### OpenClaw Gateway Token KEY finden

Behandle den OpenClaw Gateway Token KEY wie ein Passwort – gut aufbewahren.

Es gibt zwei Moeglichkeiten, den OpenClaw Gateway Token KEY zu finden:

#### 1. Direkt in der Konfigurationsdatei finden

Die macOS-Konfigurationsdatei befindet sich im Benutzerverzeichnis als versteckte Datei. Du musst versteckte Dateien anzeigen, um den Ordner `.openclaw` zu finden. Oeffne ihn und dann die Datei openclaw.json. Im Abschnitt "gateway" findest du den Token.

![image-20260306122344215](https://img.lingflux.com/2026/03/537f4f44ca08c446ef9ede6549ddb90d.png)

#### 2. In der Web UI ansehen (am einfachsten)

Klicke auf "Overview", unter "Gateway Token" steht er direkt – ganz einfach.



![image-20260306122950056](https://img.lingflux.com/2026/03/54be336e2aaa6342c1289fc5370c270a.png)





### 1. Chrome: Browser-Uebernahme-Erweiterung installieren

Im Chrome Web Store (https://chromewebstore.google.com/) nach "OpenClaw Browser Relay" suchen

(Zum Redaktionsschluss war bereits Version v2.7 erreicht) und installieren. (Achtung, es gibt mittlerweile viele "OpenClaw Browser"-Erweiterungen – lies genau, nicht die falsche installieren.)

Nach der Installation oeffnet sich eine Seite, auf der du den Token KEY zur Verifizierung eingeben musst. Hier kommt der OpenClaw Gateway Token KEY rein, nicht der AI API KEY – nicht verwechseln!

Nach dem Eintragen kannst du die Erweiterung gleich anpinnen, damit du sie leichter findest. (Wir muessen gleich noch manuell damit arbeiten, merk dir das.)

![image-20260306114923386](https://img.lingflux.com/2026/03/9b0e0c0e5bc27812210d0b9886a1962d.png)



### 2. Entwicklermodus aktivieren

Gib im Browser `chrome://extensions/` ein, Enter, um die Erweiterungsverwaltung zu oeffnen. Oben rechts gibt es einen Schalter "Developer mode" (Entwicklermodus) – pruefe, ob er aktiviert ist. Falls nicht, bitte aktivieren.



### 3. OpenClaw fuer Browser- und Datei-Operationen konfigurieren

Mit CLI konfigurieren. Oeffne das Terminal und gib folgende Befehle ein:

```bash
# OpenClaw-Berechtigungen auf coding-Level erhoehen
openclaw config set tools.profile coding

# Sicherstellen, dass die Browser-Funktion aktiviert ist
openclaw config set browser.enabled true

# Zum System-Chrome wechseln (offizielle Methode fuer "System-Standard-Chrome")
openclaw config set browser.defaultProfile "chrome"

# Allowlist leeren (damit das coding-Profil automatisch die richtigen Datei-Tools freigibt – das ist entscheidend!)
openclaw config set tools.allow '[]'

# Konfiguration abgeschlossen, openclaw gateway neu starten (Pflicht!)
openclaw gateway restart
```

Sieht aus wie im folgenden Bild:

![image-20260306113653129](https://img.lingflux.com/2026/03/02f6c0258cc846cf7699cd372bbb8a03.png)

Nach dem Neustart...

1. Oeffne den Browser und besuche irgendeine Seite, z.B. https://lingshunlab.com, dann klicke auf die gerade installierte Erweiterung – den kleinen Lobster. Es sollte ein "ON"-Markierung erscheinen, die anzeigt, dass alles funktioniert.

![image-20260306124413421](https://img.lingflux.com/2026/03/4ef9d1f4eb78a3ca6b2463ed0e809f89.png)

2. Gehe zur OpenClaw Web UI-Seite, starte einen "Chat", aber vorher unbedingt "New session" klicken. Dann sende etwas wie "Oeffne bilibili.com im Browser".

Wenn alles funktioniert, oeffnet sich der Browser automatisch und navigiert zu bilibili.

![image-20260306123830087](https://img.lingflux.com/2026/03/7580e05a2df8e32d72a7370d3fa964a5.png)

Jetzt kannst du auch die Datei-Operationen testen. Sende etwas wie "Erstelle eine Datei in meinem Benutzerverzeichnis, um die Dateierstellung zu testen" – und dein kleiner Lobster wird die Datei erfolgreich anlegen.

![image-20260306124032376](https://img.lingflux.com/2026/03/3532062bde99391b12d64eb1c8e2de3b.png)



Alles funktioniert – glueckwunsch! Aber... irgendwie unheimlich, oder? Wenn mal...

Daher moechte ich die Dateizugriff-Berechtigungen auf das "workspace"-Arbeitsverzeichnis beschraenken. Wo befindet sich dieses Arbeitsverzeichnis? Das kannst du in der openclaw.json-Konfiguration sehen oder in der Web UI unter "Agents" > "Overview".

![image-20260306125311134](https://img.lingflux.com/2026/03/6b0ba79477058ff2819ac69caca95fb3.png)



### 4. Datei-Operationen auf das Arbeitsverzeichnis beschraenken

Mit CLI konfigurieren. Oeffne das Terminal und gib folgenden Befehl ein:

```bash
# Datei-Operationen nur im Arbeitsverzeichnis erlauben
openclaw config set tools.fs.workspaceOnly true
```

Gateway neu starten:

```bash
openclaw gateway restart
```





## Fazit

Jetzt hat der Lobster endlich Haende.

Er kann den Browser oeffnen, Seiten anklicken und in deinem definierten Arbeitsbereich Dateien lesen und schreiben – klingt einfach, aber was dahinter moeglich ist, ist enorm.

Im naechsten Artikel werde ich zeigen, wie man ihn mit Feishu verbindet, damit du von ueberall aus deinen Lobster "fernstehen" kannst.

Wenn dich das interessiert, abonniere meinen Kanal – ich werde weiterhin Updates veroeffentlichen:

- **YouTube**: [lingshunlab](https://www.youtube.com/@lingshunlab)
- **Bilibili**: [lingshunlab](https://space.bilibili.com/456183128)



## Referenzen

### **`tools.profile`** Berechtigungen

https://docs.openclaw.ai/tools#tool-profiles-base-allowlist

**`tools.profile`** in OpenClaw (2026.3.2 und neuere Versionen) ist die **Basis-Voreinstellung (base allowlist)** fuer Werkzeugberechtigungen. Diese Konfiguration hat **starke Auswirkungen auf die Sicherheit**: Bei Neuinstallationen ist der Standard seit dem grossen Sicherheitsupgrade ab 2026.3.x `"messaging"`. Das broad/coding-Profil, das viele Nutzer aelterer Versionen gewohnt waren, muss jetzt explizit gesetzt werden.

### Berechtigungsvergleich (Kernunterschiede auf einen Blick)

| Aspekt                                         | minimal                | messaging                     | coding                                          | full                  |
| ---------------------------------------------- | ---------------------- | ----------------------------- | ----------------------------------------------- | --------------------- |
| **Datei-Operationen** (fs.read/write/edit/apply_patch) | Nein, komplett verboten | Nein, verboten              | Ja, erlaubt (kann mit fs.workspaceOnly weiter eingeschraenkt werden) | Ja, erlaubt   |
| **Shell-Ausfuehrung** (exec/runtime/process)   | Nein, verboten         | Nein, verboten                | Ja, erlaubt (kann mit approvals.exec abgesichert werden) | Ja, erlaubt  |
| **Browser** (browser)                          | Nein, verboten         | Nein, verboten                | Ja, erlaubt                                     | Ja, erlaubt           |
| **Nachrichten/Session-Verwaltung** (sessions_*, messaging group) | Nur session_status | Ja, vollstaendig unterstuetzt | Ja, vollstaendig unterstuetzt          | Ja, vollstaendig unterstuetzt |
| **Bild/Cache-Tools** (image, memory_*)         | Nein, verboten         | Nein, verboten                | Ja, teilweise unterstuetzt                      | Ja, vollstaendig unterstuetzt |
| **Andere hochriskante Tools** (cron, gateway, nodes etc.) | Nein, verboten     | Nein, verboten                | Nein, meistens verboten (erfordert allow)       | Ja, moeglicherweise freigegeben |
| **Standard bei Neuinstallation**               | Nein, nicht Standard   | Ja (grosse Aenderung ab 2026.3.x) | Nein, muss manuell gesetzt werden        | Nein, muss manuell gesetzt werden |
| **Empfohlen fuer**                             | Maximale Sicherheit, nur chatten | Normale Nutzer, Anfaenger, Chat-Fokus | Entwickler, intensive Code/Datei-Nutzer | Tests, POC, wenn man dem Modell vertraut |



### Haeufige Browser-Befehle

https://docs.openclaw.ai/tools/browser


