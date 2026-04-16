---
title: "OpenClaw en action : créer un site d'analyse de loterie en 1 heure ! La liberté financière ?"
domain: ai
platforms: ["mac", "windows", "linux"]
format: "tutorial"
date: 2026-03-15
intro: "Un guide pas à pas pour créer une compétence personnalisée dans OpenClaw, puis piloter l'IA par dialogue pour construire un site de prédiction LSTM de loterie — de la demande initiale à la validation en passant par les retours, jusqu'à obtenir une application Web complète, le tout sans écrire une seule ligne de code."
image: "https://img.lingflux.com/2026/03/85e592835608cc53041951e03f4b52fd.png"
tags: ["OpenClaw", "Outil IA", "LSTM", "Loterie", "ClawdHub", "Création de compétences", "Développement sans code"]
---


> ⚠️ Avertissement : le contenu ci-dessous est purement éducatif et ne constitue en aucun cas un conseil en investissement. Acheter ou non des billets de loterie est votre affaire. Si vous gagnez, pensez à m'inviter au resto ; si vous perdez, ne venez pas me voir.

---

## Ce que vous allez apprendre

Ce projet a l'air de construire un site de prédiction de loterie, mais en réalité vous allez vivre :

- La création manuelle d'une compétence personnalisée dans OpenClaw
- L'utilisation d'un modèle de deep learning LSTM pour traiter des séries temporelles
- L'intégration front-end et back-end pour lancer une application Web complète

Les prédictions sont-elles fiables ? Honnêtement, face à des combinaisons de chiffres hautement aléatoires, un modèle LSTM a théoriquement autant de chances qu'un pied qui tape au hasard sur un clavier. Mais ce système vous donne au moins un résultat stable, pas un truc différent à chaque fois — et ça, c'est déjà mieux que l'intuition de pas mal de gens.

---

## Partie 0 : laisser OpenClaw créer automatiquement une compétence

Vous ne savez pas par où commencer ? Pas de panique, vous pouvez simplement lui demander :

```
Quelles sont les étapes pour créer une compétence ? Décris chaque opération en détail.
```

Il va vous lister tout, point par point. Ensuite, demandez-lui de vous faire un exemple concret, et qu'il vous indique où c'est sauvegardé et comment l'appeler — en gros, demandez-lui de vous montrer l'exemple pendant que vous observez et apprenez.

Une fois cette base acquise, vous pourrez créer vos propres compétences manuellement.

Regardez d'abord la vidéo :
<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/JG6JlTcPitE?si=cl44gjuh0uRN_yjV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

---

## Partie 1 : créer manuellement une compétence dans OpenClaw

### Où se trouve le dossier des compétences

Sur macOS, l'espace de travail est caché dans un dossier `.openclaw` situé dans le répertoire utilisateur :

```
~/.openclaw/workspace/
```

Une fois dedans, créez un dossier `skills`. La structure ressemble à ça :

```
skills/
└── nom-de-votre-competence/
    ├── SKILL.md        ← Instructions principales de la compétence
    └── autres fichiers  ← (optionnel) peut ne pas exister
```

Le fichier `SKILL.md`, c'est le « contrat de travail » entre vous et l'IA — vous y décrivez clairement ce qu'elle doit faire, comment le faire, et les pièges à éviter. Elle s'exécute ensuite au pied de la lettre.

### Que mettre dans SKILL.md

Au minimum, il doit contenir :

| Champ | Rôle |
|-------|------|
| Nom de la compétence | Pour que l'IA l'identifie |
| Condition de déclenchement | Quand activer cette compétence |
| Étapes d'exécution | Instructions pas à pas |
| Points d'attention | Ce qu'il ne faut pas faire |

---

## Partie 2 : installer l'écosystème de compétences (ClawdHub)

Avec les compétences créées manuellement, on est vite limité. Pour faire tourner un projet Web complet, il faut des packs de compétences comme App Builder et Tailwind CSS — et tout ça passe par ClawdHub.

### Première étape : installer ClawdHub

Ça se fait dans le terminal (ligne de commande) :

```bash
npm i -g clawhub
```

Une fois installé, lancez la commande de connexion :

```bash
clawhub login
```

Une page de navigateur s'ouvrira pour lier votre compte GitHub. Une fois le lien établi, ClawdHub sera véritablement activé.

> **Pourquoi se connecter ?** Le catalogue de compétences de ClawdHub est hébergé sur un serveur distant. Sans connexion, il ne trouve aucune compétence et les commandes d'installation échouent toutes. Beaucoup de gens restent bloqués à cette étape en pensant à un problème réseau — alors qu'ils ont simplement oublié le `clawhub login`.

### Deuxième étape : installer les compétences nécessaires

Une fois connecté, retournez dans la boîte de dialogue d'OpenClaw et envoyez cette instruction :

```
Aide-moi à installer les compétences App Builder et Tailwind CSS
```

Normalement, le téléchargement se fait automatiquement. En cas d'échec, vérifiez dans l'ordre :

1. **Confirmez que vous êtes connecté à ClawdHub** — huit fois sur dix, c'est la cause
2. **Vérifiez votre connexion** — l'accès au serveur ClawdHub peut être instable selon les régions, attendez et réessayez
3. **Installation manuelle** — allez sur [clawhub.ai](https://clawhub.ai/) pour trouver la compétence correspondante, copiez le dossier directement dans le répertoire `skills/` (voir la structure dans la Partie 1)

### Vérifier que les compétences sont bien installées

Une fois tout installé, demandez simplement :

```
Quelles compétences as-tu actuellement ?
```

Il listera toutes les compétences chargées. Si celles que vous avez installées apparaissent dans la liste, vous pouvez vous mettre au travail.

---

## Partie 3 : le modèle LSTM — que fait-il exactement ici ?

### Pourquoi ne pas utiliser des méthodes statistiques classiques

L'approche la plus intuitive consiste à compter la fréquence d'apparition de chaque numéro pour repérer les numéros « chauds » et « froids ». Le problème, c'est que cette méthode suppose tacitement que chaque tirage est influencé par l'historique — or le tirage au sort est un processus physique aléatoire. Le fait que le 7 soit sorti au tour précédent ne modifie pas d'un iota la probabilité qu'il sorte à nouveau. La statistique de fréquence, dans ce contexte, fait essentiellement quelque chose qui lui donne bonne conscience, mais sans fondement réel.

LSTM, c'est différent. Il ne suppose pas qu'une régularité existe — il la cherche lui-même dans les données. S'il y a vraiment une corrélation temporelle, il la trouvera ; s'il n'y en a pas, il ne la trouvera pas, et tant pis. Au moins, il est honnête.

### Comment fonctionne LSTM (version sans équations)

LSTM est l'abréviation de Long Short-Term Memory, en français « réseau à mémoire court et long terme ».

Un réseau de neurones classique traite chaque donnée d'entrée indépendamment — ce qui s'est passé à l'étape précédente n'a aucune incidence sur la suivante. La particularité de LSTM est d'avoir une « ligne de mémoire » qui parcourt toute la séquence.

Imaginez un éditeur qui traite un roman-feuilleton. Un réseau classique oublie tout à chaque chapitre et doit tout relire depuis le début. LSTM, lui, garde un carnet de notes : il retient quels passages sont importants, lesquels peuvent être oubliés, et à chaque nouveau chapitre, il décide de mettre à jour ou de jeter ce qu'il a dans son carnet avant de prendre une décision.

Appliqué aux données de loterie : on fournit les résultats des N derniers tirages comme séquence d'entrée. LSTM ajuste automatiquement ses poids pendant l'entraînement, tente de repérer des schémas de variation numérique entre les tirages, puis utilise ces schémas pour prédire le prochain.

*(À ce stade, même moi je commence à avoir le vertige...)*

### Structure du modèle (version simplifiée)

```
Historique des tirages (N derniers)
        ↓
  Prétraitement des données + normalisation
        ↓
   Couche LSTM (apprend les séquences)
        ↓
   Couche Dense de sortie (génère les prédictions)
        ↓
  Dénormalisation → Numéros finaux
```

### Une remarque honnête

Ce modèle peut obtenir de très bons résultats sur les données d'entraînement — après tout, il a été entraîné sur l'historique et prédit ensuite ce même historique, donc le taux de réussite est forcément correct.

Mais la vraie épreuve, c'est sur les données futures. Les numéros de loterie sont théoriquement des variables aléatoires indépendantes et identiquement distribuées. Les « régularités » que LSTM parvient à capturer sont probablement du bruit que le modèle prend pour un signal — un peu comme quand vous voyez un dragon dans les nuages, alors que le ciel n'avait absolument pas cette intention.

La valeur de ce système n'est donc pas tant un « outil de prédiction » qu'un exercice complet de modélisation de séries temporelles — traitement des données, entraînement du modèle, évaluation des résultats, intégration front-end/back-end. Parcourir toute la chaîne, c'est ça qu'on retire vraiment.

---

## Partie 4 : créer le système de prédiction de loterie par dialogue

L'essentiel ici n'est pas le code, mais la façon de collaborer avec l'IA pour mener à bien un projet complet.

Tout au long du processus, vous n'avez que trois choses à faire : expliquer clairement ce que vous voulez, valider les résultats, signaler les problèmes. L'IA écrit le code et monte l'architecture ; votre rôle est plus proche de celui d'un chef de projet que d'un développeur.

Une condition tout de même : vous devez avoir une compréhension générale de certains termes techniques — Next.js, Tailwind CSS, par exemple. Pas besoin de savoir coder ni de lire le code, mais il faut savoir à quoi servent ces outils et quelles options techniques s'offrent à vous. Et ce type de questions, l'IA y répond très bien.

### Première étape : envoyer le cahier des charges

Ne donnez pas les instructions au compte-gouttes, une phrase par une phrase. Expliquez le besoin complet en une seule fois. Voici le prompt que j'ai envoyé à OpenClaw :

```
Avec app-builder et tailwindcss, aide-moi à développer une page web de statistiques et prédiction de loterie
(Next.js + Tailwind CSS + Chart.js) :

1. Doit intégrer ma compétence ssq-lstm-predict existante
   (chemin : ~/.openclaw/workspace/skills/ssq-lstm-predict),
   en appelant lottery_lstm.py depuis la page pour obtenir :
   - Le nombre d'absences actuel de chaque numéro (boules rouges 1-33 + boule bleue 1-16)
   - La moyenne des boules rouges du dernier tirage
   - Les numéros chauds (peu d'absences) / numéros froids (beaucoup d'absences)
   - Les numéros prédits par LSTM pour le prochain tirage

2. Mise en page :
   - En haut : titre « Système de statistiques et prédiction de loterie »
   - Au milieu : tableau des absences (triable), graphique en barres des numéros chauds/froids (Chart.js)
   - En bas : affichage de la moyenne récente + gros bouton rouge « Prédire le prochain tirage en un clic »
     (clic = appel LSTM, renvoie 6 boules rouges + 1 boule bleue)
   - Responsive, mobile-friendly, thème rouge loterie

3. Créer le projet dans ~/.openclaw/workspace/ssq-predict-web

4. Une fois terminé, lancer npm run dev en local et me donner le lien localhost

5. Le code doit être propre et modifiable manuellement ; explique-moi ensuite comment continuer le développement ou le débogage
```

> **Une bonne explication dès le départ vaut dix allers-retours.** L'IA comprend l'information dans son ensemble avant d'exécuter. Plus votre besoin est complet, plus le premier résultat sera fiable, et moins vous aurez de retouches à faire.

### Deuxième étape : valider — examiner ce qu'il a livré

Quand il dit que c'est terminé, ne vous précipitez pas pour dire « OK ». Vérifiez point par point :

- L'URL qu'il vous a donnée est-elle accessible ?
- La page affiche-t-elle des données ?
- La fonctionnalité principale (le bouton de prédiction) réagit-elle ?
- Les résultats sont-ils stables, ou différents à chaque clic ?
- Est-ce ce que vous vouliez ? Que manque-t-il ?

Lors de ma première validation, **les cinq points étaient problématiques** — le port de l'URL était erroné (300 au lieu de 3000), la page était blanche, le bouton ne réagissait pas, les résultats changeaient à chaque clic, et certaines fonctionnalités n'étaient tout simplement pas là.

C'est tout à fait normal. Que le premier jet ait des problèmes ne signifie pas que l'IA est mauvaise — un projet complexe nécessite naturellement des itérations. L'essentiel, c'est votre capacité à décrire précisément ce qui ne va pas.

### Troisième étape : faire un retour — décrivez les faits, pas les sentiments

« Ça ne marche pas », « y'a un problème » : c'est le retour le plus inutile possible. L'IA ne sait pas ce qui ne marche pas ni quel est le problème. Même si vous utilisez les mots les plus cinglants de la langue française, ça n'aidera absolument pas — l'IA ne ressent pas la douleur, mais vous, vous perdez votre temps.

Listez les phénomènes que vous observez, un par un :

```
Il y a les problèmes suivants à corriger :
1. Le port de l'URL que tu as donné est 300, ça devrait être 3000, impossible d'y accéder
2. Après le chargement de la page, aucune donnée ne s'affiche
3. Le clic sur le bouton de prédiction ne produit aucune réaction
4. Après correction, merci de confirmer : plusieurs clics sur prédiction doivent donner un résultat cohérent
```

Plus votre description du problème est précise, plus le taux de réussite de la correction est élevé, et moins vous faites d'allers-retours.

### Quatrième étape : valider à nouveau, jusqu'à être satisfait

Une fois qu'il a corrigé, reprenez la liste de la deuxième étape.

J'ai fait quelques allers-retours : le problème de port, il n'arrivait pas à le résoudre après plusieurs tentatives, j'ai fini par accéder directement au port 3000 moi-même ; le problème de stabilité des prédictions a été réglé après correction. Au final : données affichées, prédictions stables, fonctionnalités opérationnelles — projet terminé.

---

Tout au long du processus, je n'ai pas écrit une seule ligne de code. Mais je savais exactement ce que chaque étape faisait, quel était le problème, et comment le décrire.

Cette compétence est plus difficile à acquérir que savoir coder, mais elle vaut bien plus. Un professeur me disait : « Apprendre, c'est apprendre à poser des questions. » Observer le problème central, le décrire correctement, le valider et le transformer en connaissance par l'analyse — ça, l'IA ne peut pas le faire à votre place, il faut s'entraîner soi-même.

---

## Pour conclure

La valeur de ce système n'est pas dans la précision de ses prédictions — mais dans le fait que vous avez vécu de bout en bout la création d'un projet complet.

Les prompts et les données sont là au-dessus. Suivez le guide une fois, et vous découvrirez que vous comprenez plus de choses que vous ne le pensiez.

Si ce contenu vous intéresse, abonnez-vous à ma chaîne, je publie régulièrement :

- 🎬 **YouTube** : [lingshunlab](https://www.youtube.com/@lingshunlab)
- 📺 **Bilibili** : [凌顺实验室](https://space.bilibili.com/456183128)

---

## Références

Le fichier de compétence partagé sur GitHub, comprenant les données historiques des tirages du 2003-01-01 au 2026-03-15 :
[lingshunlab / ssq-lstm-predict](https://github.com/ling3ye/LingShunLAB/tree/main/videos/%23010-OpenClaw-Skills-SSQ/ssq-lstm-predict)
