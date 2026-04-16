---
title: "OpenClaw Praxis-Workshop: In 1 Stunde eine Lottoanalyse-Website bauen! Der Weg zur finanziellen Freiheit?"
domain: ai
platforms: ["mac", "windows", "linux"]
format: "tutorial"
date: 2026-03-15
intro: "Schritt-für-Schritt-Anleitung, wie man in OpenClaw einen eigenen Skill erstellt und dann per Konversation eine KI dazu bringt, eine Lotto-LSTM-Vorhersagewebsite zu bauen — von der Anforderung uber Prüfung und Fehler-Feedback bis zum laufenden Web-App, komplett ohne Code."
image: "https://img.lingflux.com/2026/03/85e592835608cc53041951e03f4b52fd.png"
tags: ["OpenClaw", "KI-Tools", "LSTM", "Lotto", "ClawdHub", "Skill erstellen", "No-Code-Entwicklung"]
---


> ⚠️ Haftungsausschluss: Der folgende Inhalt dient ausschliesslich Lernzwecken und stellt keine Anlageberatung dar. Ob du Lotto spielst, ist deine Sache. Gewinnen? Einladen nicht vergessen. Verlieren? Mich nicht anschuldigen.

---

## Was du lernen wirst

Dieses Projekt geht auf den ersten Blick um eine Lotterie-Vorhersagewebsite. Tatsächlich erlebst du dabei:

- Wie man in OpenClaw manuell einen eigenen Skill erstellt
- Wie man ein LSTM Deep-Learning-Modell fur Zeitreihendaten nutzt
- Wie man Frontend und Backend integriert und eine vollstandige Web-App zum Laufen bringt

Ist die Vorhersage genau? Ganz ehrlich: Ein LSTM-Modell steht bei hochgradig zufalligen Zahlenkombinationen theoretisch auf derselben Stufe wie das zufallige Drauftippen mit dem Fuss. Aber dieses System liefert dir zumindest konsistent ein Ergebnis, statt jedes Mal ein anderes zu produzieren — und das allein ist schon mehr, als viele Menschen ihrer Intuition zutrauen.

---

## Part 0: OpenClaw einen Skill automatisch erstellen lassen

Keine Ahnung, wo man anfangt? Ganz ruhig, du kannst einfach fragen:

```
创建一个技能的步骤是什么？详细说出每一个操作步骤。
```

Dann listet es dir alles haarklein auf. Danach kannst du es bitten, ein Beispiel zu erstellen und dir zu sagen, wo es gespeichert ist und wie man es aufruft — es macht dir also erst mal eine Demo, und du schaust zu und lernst.

Mit diesem Fundament kannst du dann deine eigenen Skills manuell erstellen.

Schau dir zuerst das Video an:
<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/JG6JlTcPitE?si=cl44gjuh0uRN_yjV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

---

## Part 1: Einen Skill manuell in OpenClaw erstellen

### Wo liegt der Skill-Ordner

Fur macOS-Nutzer versteckt sich der Workspace in einem versteckten Ordner im Benutzerverzeichnis unter `.openclaw`:

```
~/.openclaw/workspace/
```

Dort einen neuen Ordner `skills` anlegen. Die Struktur sieht etwa so aus:

```
skills/
└── dein-skill-name/
    ├── SKILL.md        ← Kernanweisungen des Skills
    └── Weitere Dateien ← (optional, kann auch fehlen)
```

`SKILL.md` ist quasi dein «Arbeitsvertrag» mit der KI — du beschreibst genau, was sie tun soll, wie sie es tun soll und worauf sie achten muss, und sie halt sich daran.

### Was in die SKILL.md gehort

Das Minimum sollte Folgendes enthalten:

| Feld | Zweck |
|------|-------|
| Skill-Name | Zur Identifikation durch die KI |
| Auslosebedingung | Wann dieser Skill aufgerufen werden soll |
| Ausforschritte | Schrittweise Anweisungen |
| Hinweise | Was auf keinen Fall getan werden darf |

---

## Part 2: Das Skill-Ökosystem installieren (ClawdHub)

Mit manuell erstellten Skills kommt man nur begrenzt weit. Um ein vollstandiges Web-Projekt aufzuziehen, braucht man noch Skill-Pakete wie App Builder und Tailwind CSS — und die werden uber ClawdHub installiert.

### Schritt 1: ClawdHub selbst installieren

Das erfolgt im Terminal (Kommandozeile):

```bash
npm i -g clawhub
```

Nach der Installation den Login-Befehl ausfuhren:

```bash
clawhub login
```

Dadurch offnet sich eine Browserseite, auf der du dein GitHub-Konto verknupfen musst. Erst danach ist ClawdHub wirklich aktiviert.

> **Warum muss man sich einloggen?** Die Skill-Bibliothek von ClawdHub liegt auf einem Remote-Server. Ohne Login findet er uberhaupt keine Skills, und alle Installationsbefehle schlagen fehl. Viele Leute bleiben hier stecken und denken, es sei ein Netzwerkproblem — dabei fehlt einfach nur ein `clawhub login`.

### Schritt 2: Die benotigten Skills installieren

Nach dem Login zuruck in den OpenClaw-Chat wechseln und folgende Anweisung senden:

```
帮我安装 App Builder 和 Tailwind CSS 这两个技能
```

Normalerweise wird alles automatisch heruntergeladen. Falls es fehlschlägt, der Reihe nach prufen:

1. **ClawdHub-Login bestätigen** — in 8 von 10 Fällen liegt es daran
2. **Netzwerk prufen** — in manchen Regionen ist der Zugriff auf die ClawdHub-Server instabil; einfach etwas warten und nochmal probieren
3. **Manuell installieren** — [clawhub.ai](https://clawhub.ai/) aufrufen, den entsprechenden Skill finden und den Skill-Ordner direkt in das Verzeichnis `skills/` kopieren (Dateistruktur siehe Part 1)

### Prufen, ob alle Skills vorhanden sind

Wenn alles installiert ist, einfach fragen:

```
你现在有什么技能？
```

Es listet dann alle geladenen Skills auf. Erst wenn deine installierten Skills in der Liste auftauchen, kannst du loslegen.

---

## Part 3: Das LSTM-Modell — was genau macht es hier?

### Warum keine einfachen Statistikmethoden?

Die naheliegendste Methode ware, die Haufigkeit jeder Zahl zu zählen und «heisse» und «kalte» Zahlen zu identifizieren. Das Problem: Diese Methode nimmt stillschweigend an, dass jede Ziehung von den fruheren beeinflusst wird — aber Lotteriekugeln sind ein physikalischer Zufallsprozess. Dass in der letzten Runde die 7 kam, heisst nicht, dass die 7 diesmal haufiger oder seltener auftritt. Frequenzstatistik betreibt hier im Grunde etwas, das sich nur gut anfuhlt.

LSTM ist anders. Es nimmt nicht an, dass es eine Regel gibt, sondern sucht selbst in den Daten — wenn es tatsachlich eine zeitliche Korrelation gibt, lernt es sie; wenn nicht, lernt es nichts, und dann ist es eben so. Zumindest ist die Einstellung ehrlich.

### Wie LSTM funktioniert (ohne Formeln)

LSTM steht fur Long Short-Term Memory, ein «Lang-Kurzzeit-Gedachtnisnetzwerk».

Ein gewohnliches neuronales Netzwerk behandelt jeden Eingabedatensatz unabhangig — was vorher passiert ist, hat keinen Einfluss auf das nachste. Das Besondere an LSTM ist eine «Gedachtnislinie», die sich durch die gesamte Sequenz zieht.

Stell dir einen Lektor vor, der eine Fortsetzungsgeschichte bearbeitet. Ein normales Netzwerk erinnert sich jedes Mal an nichts und muss von vorne lesen. LSTM hingegen fuhrt ein «Notizbuch» mit: Es notiert sich, welche Handlungsstrange wichtig sind und welche vergessen werden konnen. Bei jedem neuen Kapitel entscheidet es neu, ob das Notizbuch aktualisiert oder etwas gestrichen wird, bevor es sein Urteil fallt.

Angewendet auf Lotto-Daten: Man gibt die letzten N Ziehungen als Eingabesequenz ein. LSTM passt wahrend des Trainings die Gewichte automatisch an und versucht, Zahlenmuster zwischen den Ziehungen zu finden, um damit die nachste Ziehung vorherzusagen.

*(An diesem Punkt fange ich selbst an, verwirrt zu werden...)*

### Modellstruktur (vereinfacht)

```
Historische Ziehungsdaten (letzten N Ziehungen)
        ↓
  Datenvorverarbeitung + Normalisierung
        ↓
   LSTM-Schicht (lernt Sequenzmuster)
        ↓
   Dense-Ausgabeschicht (generiert Vorhersagewerte)
        ↓
  Rücknormalisierung → endgültige Zahlen
```

### Eine ehrliche Anmerkung

Dieses Modell kann auf den Trainingsdaten recht gute Ergebnisse liefern — schliesslich wurde es mit historischen Daten trainiert und sagt dann die Historie vorher, was naturlich eine gewisse Trefferquote ergibt.

Die eigentliche Bewahrungsprobe sind aber zukunftige Daten. Lottozahlen sind theoretisch unabhangig und identisch verteilte Zufallsvariablen. Die «Muster», die LSTM lernt, sind wahrscheinlich bloss Rauschen in den Daten, das das Modell fälschlicherweise fur Signale halt — so wie man in Wolken einen Drachen erkennen kann, aber der Himmel hatte das gar nicht so geplant.

Der Wert dieses Systems liegt also weniger im «Vorhersage-Tool» als vielmehr in einer vollstandigen Zeitreihenmodellierungs-Ubung — Datenverarbeitung, Modelltraining, Ergebnisauswertung, Frontend-Backend-Integration, alles in einem Durchgang. Das ist das, was man wirklich lernt.

---

## Part 4: Per Konversation ein Lotto-Vorhersagesystem erstellen

Der Schwerpunkt liegt hier nicht auf Code, sondern darauf, wie man mit einer KI zusammen ein vollstandiges Projekt umsetzt.

Das Einzige, was du tun musst: klar sagen, was du willst, das Ergebnis abnehmen und Probleme ruckmelden. Den Code schreibt sie, die Architektur baut sie — deine Rolle ist eher die eines Projektleiters als die eines Entwicklers.

Eine Voraussetzung gibt es: Du solltest technische Begriffe wie Next.js und Tailwind CSS grob einordnen konnen. Du musst sie nicht schreiben oder den Code verstehen, aber du solltest wissen, wozu diese Dinge dienen und welche technischen Wege es gibt. Und genau solche Fragen beantwortet dir eine KI am besten.

### Schritt 1: Die Aufgabenstellung senden

Nicht Satz fur Satz vorgehen, sondern das gesamte Projekt auf einmal beschreiben. Hier ist der Prompt, den ich OpenClaw geschickt habe:

```
用 app-builder 和 tailwindcss 帮我开发一个双色球统计预测网页前端
（Next.js + Tailwind CSS + Chart.js）：

1. 必须集成我已有的 ssq-lstm-predict Skill
   （路径：~/.openclaw/workspace/skills/ssq-lstm-predict），
   在页面调用它的 lottery_lstm.py 来获取：
   - 所有号码当前遗漏次数（红球 1-33 + 蓝球 1-16）
   - 最新一期红球均值
   - 热号（遗漏少）/ 冷号（遗漏多）
   - LSTM 预测的下一期号码

2. 页面布局：
   - 顶部：标题「双色球统计与预测系统」
   - 中间：遗漏次数表格（可排序）、热冷号柱状图（Chart.js）
   - 下面：最新均值显示 + 大红色「一键预测下一期」按钮
     （点击调用 LSTM，返回红球 6 个 + 蓝球）
   - 响应式，手机友好，彩票红色主题

3. 项目创建在 ~/.openclaw/workspace/ssq-predict-web

4. 完成后本地运行 npm run dev，给我 localhost 预览链接

5. 代码要干净、可手动修改，完成后告诉我怎么继续开发或调试
```

> **Einmal komplett beschreiben, statt zehnmal nachzubessern.** Die KI verarbeitet Informationen ganzheitlich: Je vollstandiger die Anforderungen, desto besser das erste Ergebnis — und desto weniger Nachbesserungen brauchst du.

### Schritt 2: Abnahme — prufen, was sie abliefert

Wenn sie sagt, sie sei fertig, nicht voreilig «Okay» sagen. Punkt fur Punkt prufen:

- Kannst du die angegebene URL aufrufen?
- Sind Daten auf der Seite sichtbar?
- Reagiert die Kernfunktion (Vorhersage-Button)?
- Sind die Ergebnisse stabil oder jedes Mal anders?
- Entspricht es dem, was du wolltest? Fehlt noch etwas?

Bei meiner ersten Abnahme waren **alle funf Punkte fehlerhaft** — falscher Port (300 statt 3000), leere Seite, Button ohne Reaktion, jedes Mal andere Ergebnisse, und einige Funktionen fehlten komplett.

Das ist vollkommen normal. Dass beim ersten Versuch etwas nicht stimmt, heisst nicht, dass die KI unfahig ist — komplexe Projekte brauchen einfach Iterationen. Entscheidend ist, ob du die Probleme prazise beschreiben kannst.

### Schritt 3: Feedback — Phanomene beschreiben, nicht Gefuhle

«Funzt nicht», «Da gibt's Probleme» — das sind die nutzlosesten Rückmeldungen. Die KI weiss nicht, was genau nicht funktioniert oder wo das Problem liegt. Und selbst wenn du sie mit den schärfsten Worten der Welt traktierst, bringt das nichts — die KI fuhlt keinen Schmerz, aber du verschwendest deine Zeit.

Stattdessen die beobachteten Phanomene punkt fur Punkt auflisten:

```
有以下问题需要修复：
1. 你给的网址端口是 300，实际应该是 3000，访问不到
2. 页面加载后没有任何数据显示
3. 点击预测按钮没有反应
4. 修复后请确认：多次点击预测，结果应该保持一致
```

Je praziser die Fehlerbeschreibung, desto genauer die Reparatur — und desto weniger Hin- und Her brauchst du.

### Schritt 4: Erneut abnehmen, bis du zufrieden bist

Nach der Reparatur die Checkliste aus Schritt 2 nochmal durchgehen.

Bei mir gab es einige Runden: Das Port-Problem hat sie mehrfach nicht hingekriegt, am Ende habe ich selbst direkt Port 3000 aufgerufen; die Stabilitat der Vorhersage war nach der Reparatur dann in Ordnung. Am Ende: Daten auf der Seite, stabile Vorhersage, alle Funktionen da — Projekt abgeschlossen.

---

Im gesamten Prozess habe ich keine Zeile Code geschrieben. Aber ich wusste genau, was jeder Schritt tat, wo Probleme auftraten und wie man sie beschreibt.

Diese Fahigkeit ist schwerer zu erlernen als Code schreiben — aber wertvoller. Ein Lehrer hat mal gesagt: «Fragen lernen, das ist es.» Das Kernproblem zu erkennen, es korrekt zu beschreiben und durch Prüfung zu Wissen zu verdichten — das kann dir keine KI abnehmen, das musst du selbst uben.

---

## Zum Schluss

Der Wert dieses Systems liegt nicht darin, wie genau es vorhersagt — sondern darin, dass du einen vollstandigen Projektprozess von Null an miterlebt hast.

Prompt und Daten sind alle oben angegeben. Mach es einmal nach, und du wirst merken, dass du mehr verstehst, als du dachtest.

Wenn es dich interessiert, abonniere meinen Kanal. Ich update regelmassig:

- 🎬 **YouTube**: [lingshunlab](https://www.youtube.com/@lingshunlab)
- 📺 **Bilibili**: [凌顺实验室](https://space.bilibili.com/456183128)

---

## Referenzen

Die auf GitHub geteilten Skill-Dateien enthalten historische Lotto-Daten vom 2003-01-01 bis 2026-03-15:
[lingshunlab / ssq-lstm-predict](https://github.com/ling3ye/LingShunLAB/tree/main/videos/%23010-OpenClaw-Skills-SSQ/ssq-lstm-predict)
