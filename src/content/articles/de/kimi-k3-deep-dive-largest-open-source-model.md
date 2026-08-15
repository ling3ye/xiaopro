---
title: "Kimi K3 im Detail: Das größte Open-Source-Modell der Welt – wie gut ist es wirklich?"
domain: ai
format: news
date: 2026-08-15
intro: "Im Juli 2026 veröffentlichte Moonshot AI das 2,8 Billionen Parameter umfassende Kimi K3 – das Open-Source-Modell mit der weltweit größten Parameterzahl – und überholte damit erstmals ein geschlossenes Flaggschiff im Frontend-Programmier-Ranking. Dieser Artikel beleuchtet Kerntechnologie, Benchmarks, Preise und Zugangsmöglichkeiten und klärt auf einen Schlag, wo es stark ist und ob es sich lohnt."
image: "https://img.lingflux.com/2026/08/571adb2c06517070adb8f0f31ab2892e.png"
tags: ["Kimi K3", "Moonshot AI", "Open-Source-Modell", "Großes Sprachmodell", "Artificial Analysis", "LMArena"]
---

> **Kurzfassung**: Kimi K3 erreicht mit 2,8 Billionen Parametern die Spitze der Open-Source-Modelle weltweit und überholt im Programmier-Ranking erstmals ein geschlossenes Flaggschiff; dieser Artikel klärt, wo es stark ist, was es kostet und wo man es nutzt.

> Datenstand: 12. August 2026
> Die Daten dieses Artikels stammen aus Xinhua, Artificial Analysis, LMArena, offiziellen Materialien von Moonshot sowie mehreren unabhängigen Tests; bitte vor Veröffentlichung die aktuellsten Rankings erneut prüfen.

---

## 1. Einleitung: Open-Source-Modelle erreichen erstmals die „Decke"

Am 16. Juli 2026, einen Tag vor der Eröffnung der World Artificial Intelligence Conference (WAIC) in Shanghai, zündete Moonshot AI eine Bombe: **Kimi K3**.

Seine Titel klingen nach Übertreibung, sind aber alle Tatsachen:

- **2,8 Billionen Parameter insgesamt** – das derzeit weltweit größte Open-Source-Modell, weit vor DeepSeek V4 Pro (1,6 Billionen) und der Zhipu GLM-5-Reihe (744 Milliarden);
- **das weltweit erste Open-Source-Modell im 3-Billionen-Parameter-Bereich**;
- **das erste Mal in der Geschichte der Open-Source-Modelle, dass ein Open-Source-Modell ein geschlossenes Flaggschiff in einem großen Ranking direkt überholt** – im Frontend-Programmier-Blindtest-Ranking Frontend Code Arena erreichte Kimi K3 mit 1679 Punkten die Spitze und überholte Anthropics Claude Fable 5 und OpenAIs GPT-5.6 Sol.

Mit den Worten von Xinhua: Das „markiert einen neuen Schritt in der Entwicklung der KI-Modelle unseres Landes". Für normale Nutzer sind die praktischen Fragen wichtiger: Wo ist es stark? Was hat das mit mir zu tun? Wo kann ich es nutzen? Dieser Artikel klärt all das auf einmal.

---

## 2. Was ist Kimi K3?

### 2.1 Steckbrief

| Kategorie | Details |
|---|---|
| Entwickler | Moonshot AI (2023 vom Tsinghua-Gründer Yang Zhilin gegründet; Alibaba und Tencent sind beide Investoren) |
| Veröffentlichung | Veröffentlicht am 16. Juli 2026; vollständige Gewichte am 27. Juli 2026 als Open Source |
| Architektur | MoE-Mixture-of-Experts-Modell, 93 Schichten, insgesamt 896 Experten, pro Token werden nur 16 davon aktiviert |
| Gesamtparameter / aktive Parameter | 2,8 Billionen / rund zehn Milliarden (sparse Aktivierung, die Inferenzkosten liegen weit unter dem, was die Größe vermuten lässt) |
| Kontextfenster | 1 Million Token (1.048.576), ein Preis ohne Stufen |
| Modalitäten | Nativ Text + Bildverständnis (MoonViT-V2 Vision-Encoder), einige Kanäle unterstützen bereits Videoeingabe |
| Open-Source-Lizenz | Eigene Kimi-K3-Lizenz (MIT-ähnlich, mit gestaffelten Umsatzklauseln) |

### 2.2 Zwei zentrale technische Innovationen

Kimi K3s Reiz liegt nicht nur in seiner „Größe", sondern vor allem in der Art, wie es Informationen verarbeitet:

**1. KDA – Hybride lineare Aufmerksamkeit (Kimi Delta Attention)**

Bei der Voll-Attention-Mechanik klassischer Transformer wächst der Rechenaufwand bei langen Texten nahezu quadratisch mit der Textlänge – verdoppelt sich der Inhalt, vervierfacht sich der Aufwand in etwa. Das ist der Kern der Schwierigkeit, sehr lange Texte praktisch umzusetzen. K3 nutzt in 69 seiner 93 Schichten das selbst entwickelte KDA-Lineare-Attention-Modul und drückt den Aufwand auf annähernd **lineares Wachstum**. Ergebnis: rund 75 % weniger KV-Cache und ein etwa 6,3-fach höherer Decodierungsdurchsatz bei einer Million Token. Einfach gesagt: Bei gleicher Rechenleistung kann es länger „lesen" und tiefer nachdenken.

**2. Aufmerksamkeits-Residuen (Attention Residuals / AttnRes)**

Je größer das Modell und je mehr Schichten es hat, desto leichter zerfällt die Information bei der Weitergabe zwischen den Schichten, und desto leichter kollabiert das Training. Die Attention-Residuals-Technik lässt das Modell Repräsentationen gezielt über die Tiefe hinweg abrufen statt sie mechanisch Schicht für Schicht aufzuaddieren – quasi ein „Stabilisator" für ein Riesenmodell mit 2,8 Billionen Parametern. Laut offiziellen Angaben erzielt K3 durch die Kombination beider Techniken gegenüber K2 eine rund **2,5-fache Steigerung der Trainingsskalierungseffizienz**.

### 2.3 Open-Source-Strategie: Jeder kann es herunterladen, große Firmen müssen sich „registrieren"

Am 27. Juli wurden die vollständigen Gewichte und der technische Bericht von K3 auf Hugging Face und GitHub veröffentlicht. Die Lizenz ist insgesamt MIT-nah: Jeder darf das Modell kostenlos nutzen, verändern, verteilen und feinabstimmen. Es gibt nur zwei umsatzbezogene Einschränkungen:

- Cloud-Anbieter, die K3-Inferenz im „Model-as-a-Service"-Modus in großem Umfang weiterverkaufen, müssen nach mehr als 200.000 US-Dollar Umsatz über 12 aufeinanderfolgende Monate eine separate Vereinbarung mit Moonshot schließen;
- Kommerzielle Produkte mit über 100 Millionen monatlich aktiven Nutzern oder über 2 Millionen US-Dollar Monatsumsatz müssen „Kimi K3" sichtbar in der Oberfläche kennzeichnen.

Für die allermeisten Entwickler und KMU ist das praktisch „kostenlos kommerziell nutzbar".

---

## 3. Direktvergleich: Die tatsächliche Position in den großen Rankings

Bei Benchmarks muss man unterscheiden: einerseits **unabhängige Nachmessungen durch Drittanbieter** (hohe Glaubwürdigkeit), andererseits **Herstellerangaben** (nur als Referenz). Zuerst die beiden aussagekräftigsten Gesamt-Rankings.

### 3.1 Artificial Analysis Intelligence Index (objektive Benchmarks, Daten Anfang August 2026)

| Rang | Modell | Intelligenz-Index | Typ |
|---|---|---|---|
| 1 | Claude Opus 5 (max) | 63 | Geschlossen |
| 3 | Claude Fable 5 | 62 | Geschlossen |
| 5 | GPT-5.6 Sol (max) | 61 | Geschlossen |
| **6** | **Kimi K3 (max)** | **60** | **Open Source** |
| 7 | GPT-5.6 Sol (xhigh) | 59 | Geschlossen |
| 9 | Qwen3.8 Max | 58 | Geschlossen |

**Kimi K3 ist das bestplatzierte Open-Source-Modell der gesamten Liste und zugleich die Nummer eins der chinesischen Modelle.** Der Abstand zu den fünf besten geschlossenen Flaggschiffen beträgt nur 1–3 Punkte – das ist „gleiche Spitzenklasse", kein Generationenrückstand.

### 3.2 LMArena (Blindtests mit echten Nutzern, August 2026)

| Modell | Text-Elo | Anmerkungen |
|---|---|---|
| Claude Fable 5 | 1525 | Text #1 |
| Claude Opus 5 | 1522 | Neues Flaggschiff |
| GPT-5.6 Sol | 1514 | OpenAI-Flaggschiff |
| **Kimi K3** | **≈1500** | **Auf Augenhöhe mit der ersten geschlossenen Liga; Programmier-Teilranking #1** |
| GLM-5.2 | 1483 | Open Source |
| DeepSeek V4 Pro | 1462 | Open Source |

Am bemerkenswertesten ist das Programmier-Teilranking: **Kimi K3 holt sich in der Frontend Code Arena mit 1679 Elo den ersten Platz** (Claude Fable 5 liegt bei 1631, GPT-5.6 Sol bei 1618) und gewinnt in 6 von 7 Unterkategorien. Das ist das erste Mal, dass ein Open-Source-Modell ein Arena-Ranking anführt – die Vorgängergeneration K2.6 lag noch auf Platz 18, ein Sprung um 17 Plätze in einer Generation.

### 3.3 Vergleich der Spezialfähigkeiten (offizielle Daten von Moonshot + Drittanbieter-Aufbereitung)

| Benchmark | Kimi K3 | Claude Fable 5 | GPT-5.6 Sol | Claude Opus 4.8 |
|---|---|---|---|---|
| SWE Marathon (Ultralange sequenzielle Entwicklung) | **42 (Platz 1)** | 35 | 39 | 40 |
| Program Bench (Software-Reverse-Engineering) | **77.8 (Platz 1)** | 76.8 | 77.6 | 71.9 |
| Terminal-Bench 2.1 (Terminal-Betrieb) | 88.3 | 84.6 | **88.8** | 84.6 |
| FrontierSWE (Hochkomplexe Softwareentwicklung) | 81.2 | **86.6** | 71.3 | 66.7 |
| BrowseComp (Tiefgehende Web-Recherche) | **91.2 (SOTA)** | 88.0 | 90.4 | 84.3 |
| Automation Bench (Büroautomation) | **30.8 (Platz 1)** | 29.1 | 29.7 | 27.2 |
| SpreadsheetBench 2 (Excel-Modellierung) | **Platz 1** | — | — | — |
| GPQA-Diamond (Wissenschaftliches Schlussfolgern) | 93.5 | 92.6 | **94.1** | 91.0 |
| MMMU-Pro (Visuelles Schlussfolgern) | 81.6 | 81.2 | **83.0** | 78.9 |
| OmniDocBench (Dokumentverständnis) | **91.1 (Platz 1)** | 89.8 | 85.8 | 87.9 |

(Anmerkung: Einige Benchmarks wurden von den Anbietern mit unterschiedlichen Agent-Frameworks getestet; der Quervergleich dient nur als Referenz.)

**Zusammenfassung des Fähigkeitsprofils von K3 in einem Satz:**

- ✅ **Langlaufende Programmierung und Frontend-Entwicklung**: derzeit unübertroffen in der Open-Source-Welt, mehrere Spitzenplätze;
- ✅ **Tiefenrecherche und Büroautomation**: BrowseComp stellt einen neuen Rekord auf;
- ✅ **Verständnis ultralanger Dokumente**: 1-Million-Token-Kontext plus Platz 1 beim Dokumentverständnis, ideal für die Analyse ganzer Codebasen und umfangreicher Unterlagen;
- ⚠️ **Gesamterlebnis**: Selbst der Hersteller räumt ein, bei Interaktionsdetails und dem „Gefühl" der Aufgabenqualität noch etwas hinter Claude Fable 5 und GPT-5.6 Sol zu liegen; unabhängige Messungen zeigen eine Ausgabegeschwindigkeit von etwa 36–55 Token/s – nicht gerade schnell – und einen eher hohen Token-Verbrauch im Denkmodus.

### 3.4 Preis-Leistung: Günstig ist relativ

| Modell | Eingabe ($/Mio. Token) | Ausgabe ($/Mio. Token) | Eingabe bei Cache-Treffer |
|---|---|---|---|
| Kimi K3 | 3.0 | 15.0 | 0.30 |
| Claude Fable 5 | 10.0 | 50.0 | — |
| Claude Opus 4.8 | 5.0 | 25.0 | — |
| GPT-5.6 Sol | 5.0 | 30.0 | — |
| Kimi K2.6 | 0.95 | 4.0 | 0.16 |

Die offizielle Preisgestaltung in China: Eingabe ¥20/Mio. Token, Ausgabe ¥100/Mio. Token, Cache-Treffer ¥2/Mio. Token.

Der Preis von K3 beträgt etwa ein Drittel des Preises von Claude Fable 5, ist aber 4–5-mal teurer als der eigene K2.6. Der wichtigste Spar-Trick ist der **Cache**: In Programmierszenarien liegt die Cache-Trefferquote laut Hersteller bei über 90 %, der getroffene Eingabeanteil kostet nur ein Zehntel, und die auf OpenRouter gemessenen effektiven Eingabekosten betragen etwa 0,55 $/Mio. Token. Nach unabhängigen Berechnungen kostet dieselbe Runde einer Agent-Codierungsaufgabe (100.000 Eingabe + 20.000 Ausgabe) bei K3 etwa 0,60 $, bei Fable 5 etwa 2,00 $.

---

## 4. Wo kann man Kimi K3 nutzen?

Das ist der Teil, der alle am meisten interessiert – und den ich in letzter Zeit selbst gesucht habe. Ich halte ihn hier fest und teile ihn mit euch, sortiert von niedrigster zu höchster Einstiegshürde:

### 4.1 WorkBuddy (eine der unkompliziertesten Möglichkeiten)

[https://www.workbuddy.cn/](https://www.workbuddy.cn/events/invite?inviteCode=421qev5h73caj0) (WorkBuddy-Einladungslink)

Warum empfehle ich nicht zuerst die Kimi-Website? Weil sie derzeit schlicht nicht offen ist und niemand weiß, wann das Abo wieder freigeschaltet wird – ich warte schon seit zwei Wochen. Außer du bist langjähriges Kimi-Mitglied, dann kannst du diesen Abschnitt einfach überspringen, haha.

**WorkBuddy hat Kimi K3 bereits integriert** – der Text, den du gerade liest, läuft tatsächlich auf Kimi K3. Für normale Nutzer und Büroszenarien, die sich nicht mit API-Keys herumschlagen oder Parameter studieren wollen, genügt es, WorkBuddy zu öffnen und direkt loszulegen: Dokumente schreiben, Tabellen erstellen, PDFs lesen, Code ausführen, Webseiten generieren – der lange Kontext und die Agent-Fähigkeiten von K3 sind in WorkBuddy sofort einsatzbereit. Für Nutzer in China ist das einer der kürzesten Wege, die vollen Fähigkeiten von K3 ohne Hürden zu erleben.

### 4.2 Das offizielle Kimi-Produktportfolio

https://kimi.com

- **Kimi Web / App** (kimi.com / kimi.moonshot.cn): Nach der Registrierung kann man sofort chatten; das kostenlose Kontingent unterliegt Kontext- und Frequenzlimits, die Mitgliedschaft schaltet den vollen 1M-Kontext frei;
- **Kimi Work**: Desktop-Wissensarbeitsumgebung (Windows / Mac mit Apple-Chip, ab Version 3.1.0);
- **Kimi Code**: Terminal-Programmier-Agent, Installation via `npm i @moonshot-ai/kimi-code`, Wechsel zu K3 mit `/model`.

### 4.3 Offizielle API (für Entwickler)

- Plattformen: platform.moonshot.cn (China) / platform.kimi.ai (international);
- Vollständig kompatibel mit dem OpenAI SDK, die Modell-ID ist `kimi-k3`; setze einfach die `base_url` auf `https://api.moonshot.ai/v1`, um bestehenden Code zu migrieren.

```python
from openai import OpenAI

client = OpenAI(
    api_key="dein API-Key",
    base_url="https://api.moonshot.ai/v1"
)
resp = client.chat.completions.create(
    model="kimi-k3",
    messages=[{"role": "user", "content": "Analysiere diesen Code für mich"}]
)
```

### 4.4 Plattformen von Drittanbietern

- **OpenRouter**: Modell-ID `moonshotai/kimi-k3`, gleicher Preis wie offiziell, kein Aufschlag;
- **SiliconFlow**: bequemer Zugriff aus China;
- **Cloudflare Workers AI, Groq**: ebenfalls verfügbar;
- **Self-Hosting**: Gewichte von Hugging Face / GitHub herunterladen, unterstützt vLLM / SGLang, Quantisierung MXFP4/NVFP4 – für produktionsreifen Betrieb braucht es aber Super-Nodes mit über 64 Karten; für normale Leute nur zum Anschauen.

### 4.5 Ein kleiner Hinweis

Nach der Veröffentlichung von K3 war die Nachfrage so groß, dass Kimi den Verkauf neuer Mitgliedschaften vorübergehend stoppte (ab dem 20. Juli werden Bestandskunden bevorzugt). Wenn die offiziellen Kanäle überlastet sind, sind WorkBuddy, OpenRouter und SiliconFlow zuverlässige Alternativen.

---

## 5. Zum Schluss

Die Bedeutung von Kimi K3 wird sich vielleicht erst in einigen Jahren vollständig zeigen:

1. **Es beweist, dass Open Source mit geschlossenen Modellen gleichziehen kann.** 2,8 Billionen Parameter, Platz 1 im Arena-Programmierranking, Platz 1 unter den Open-Source-Modellen im Intelligence Index – die Ära „Open Source = zweitklassig" ist vorbei;
2. **Es beweist, dass ein chinesisches Team grundlegende Architektur-Innovation leisten kann.** KDA-lineare Aufmerksamkeit und Attention Residuals sind kein bloßes Stapeln von Engineering, sondern originäre Lösungen für zwei weltklasse schwierige Probleme: „lange Texte rechensparsam verarbeiten" und „riesige Modelle stabil trainieren";
3. **Es hat die Preise für Spitzenfähigkeiten gedrückt.** Ein Drittel des Claude-Preises und frei herunterladbare Gewichte werden dafür sorgen, dass mehr Produkte und Forschung auf den Schultern von K3 entstehen.

Natürlich muss man nüchtern bleiben: Beim Gesamterlebnis liegt es immer noch hinter den zwei, drei stärksten geschlossenen Modellen, die Inferenzgeschwindigkeit ist nicht hoch, und der Denkmodus verbrennt ordentlich Token. Es ist kein Allheilmittel – aber wenn du es mit harten Aufgaben wie **langen Dokumenten, kompletten Codebasen, Tiefenrecherche oder Frontend-Entwicklung** zu tun hast, ist Kimi K3 derzeit die stärkste Antwort, die die Open-Source-Welt dir bieten kann – und sie ist jetzt in WorkBuddy verfügbar.

---

## Referenzen

1. Xinhua: „Neuer Durchbruch – chinesisches Unternehmen veröffentlicht das weltweit größte Open-Source-Modell Kimi K3", 17.07.2026
2. Artificial Analysis Intelligence Index, Daten von 08/2026
3. LMArena-Ranking, Snapshot von 08/2026
4. Offizielle Veröffentlichungsmaterialien und technischer Bericht zu Kimi K3 von Moonshot AI, 07/2026
5. Unabhängige Tests von PureAI / Neowin / SiliconFlow / dev.to u. a., 07–08/2026

> Haftungsausschluss: Die im Text genannten Benchmarks enthalten auch Herstellerangaben; die Ergebnisse sind über unterschiedliche Testframeworks hinweg nicht vollständig vergleichbar. Preise und Verfügbarkeit richten sich nach den jeweils aktuellen Seiten der Plattformen.
