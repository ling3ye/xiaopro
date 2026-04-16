---
title: "Guide anti-galère | OpenClaw de l'installation au contrôle du navigateur, tout en un seul article"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-06
intro: "Vous avez déjà essayé d'installer OpenClaw pour ne rien pouvoir en faire ? L'auteur a désinstallé et réinstallé 10 fois, et a fini par comprendre toute la logique de configuration d'OpenClaw 2026.3.2 — connexion API, fournisseur personnalisé, contrôle du navigateur, permissions de lecture/écriture des fichiers. Chaque étape est illustrée avec des captures d'écran et les commandes correspondantes. Idéal pour les utilisateurs macOS, les débutants, et les anciens utilisateurs floués par de vieux tutoriels."
image: "https://img.lingflux.com/2026/03/015705fbca42171bdf09fabe9220b546.webp"
tags: ["guide configuration openclaw", "installation openclaw 2026", "profil outils openclaw", "tutoriel OpenClaw", "paramètres permissions OpenClaw", "dernière version OpenClaw"]
---

Ça fait un moment qu'on élève des homards, et j'ai l'impression que la version actuelle devrait être assez stable maintenant. Avant, même le nom me faisait suer : l'URL c'était ClawdBot, mais la commande d'installation c'était install MoltBot, et puis hop, ça s'est rebaptisé OpenClaw. C'est pas un bug, c'est la tradition des projets open source : on code d'abord, on change de nom quand les avocats arrivent. (Claude a attaqué ClawBot parce que ça sonnait trop comme Claude, et depuis, Claw est devenu encore plus célèbre.)

Ces derniers jours, en phase de test, j'avais l'impression qu'il y avait une mise à jour tous les jours. Pour comprendre la logique de configuration, j'ai désinstallé, réinstallé, encore et encore, entre les versions :

2026.2.25
2026.2.26
2026.3.1
2026.3.2
....

Le rythme des mises à jour est effréné. En testant la dernière version 2026.3.2 (à la date du 6 mars 2026), j'ai constaté que la méthode de configuration avait changé, rendant mes tests précédents obsolètes. Cette version semble avoir renforcé la sécurité par défaut, il faut configurer manuellement les permissions supérieures.

Ce que j'aime avec OpenClaw, c'est qu'il peut contrôler le navigateur et accéder aux fichiers système. Bien sûr, ça soulève pas mal de problèmes de sécurité, donc il faut faire attention. Pour bien élever ce petit homard, il faut prendre le temps d'apprendre à le configurer.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/flZj-SpTJmQ?si=Jn8A8xWZ-jIZQCeo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

## Avant de commencer : votre solde API est-il suffisant ?

OpenClaw lui-même est open source et gratuit, mais pour qu'il « agisse », il a besoin d'un modèle IA derrière, et ça demande un token API.

Si votre token est presque à sec, ou si vous n'en avez jamais configuré, voici deux plateformes avec un bon rapport qualité-prix actuellement, choisissez selon vos besoins :

- **Zhipu GLM** : compatible avec Claude Code, Cline et plus de 20 outils, offres d'abonnement temporaires → [lien](https://www.bigmodel.cn/glm-coding?ic=IPWNTCEXE2) (c'est ce que j'utilise en ce moment, ce n'est PAS une publicité !!! Ce n'est PAS une publicité !!! Ce n'est PAS une publicité !!! Je ne suis pas payé, les espaces publicitaires sont disponibles)

	![image-20260306102449045](https://img.lingflux.com/2026/03/52e663b49875f0ab36c9fc1f2ff806dd.png)

	1. Votre API KEY : allez dans le centre de contrôle, trouvez l'API key et copiez-la
	2. L'adresse de GLM : https://open.bigmodel.cn/api/anthropic (l'adresse compatible avec Claude Code)
	3. Le nom du modèle : GLM-4.7

	Gardez ces 3 infos en tête, on en aura besoin pour la configuration qui suit.

- **Alibaba Cloud Bailian** : modèles complets, crédits gratuits pour les nouveaux utilisateurs → [lien](https://www.aliyun.com/benefit/ai/aistar?clubBiz=subTask..12406352..10263..) (celle-ci est pas mal non plus, et ce n'est PAS une publicité non plus !!!)

Une fois prêt, on commence.






## Installation d'OpenClaw, c'est parti !

Je suis sur macOS, c'est le meilleur système pour élever des homards, parce que c'est celui qu'utilise l'auteur pour le développement. C'est là qu'il y a le moins de problèmes. Les autres systèmes (Windows, Raspberry Pi OS, Linux) peuvent varier un peu. Mais le projet a beaucoup de contributeurs, les gros problèmes se règlent vite.

Si je devais classer les systèmes du meilleur au pire :

macOS > Linux > Windows > les autres

Allez d'abord jeter un œil sur le site officiel, il y a plusieurs méthodes d'installation : https://openclaw.ai/

### Installation rapide sur macOS

Sur macOS, il existe une app officielle à télécharger, mais je ne sais pas pourquoi, je n'arrive jamais à l'installer. La commande automatique `curl -fsSL https://openclaw.ai/install.sh | bash` ne marche pas à chaque fois non plus, donc j'ai opté pour l'installation via npm. Dans le Terminal, tapez :

```bash
# Installer OpenClaw
npm i -g openclaw
```

Patientez le temps de l'installation, puis continuez avec :

```bash
# Configurer OpenClaw
openclaw onboard
```

Ensuite, l'assistant de configuration s'affiche. Prenez le temps de lire et de choisir vos options étape par étape. Le processus global ressemble à ça :



### 1. On vous demande votre contexte d'utilisation :

- **Personal (usage personnel)** : vous êtes seul à utiliser ce Mac Mini → choisissez **Yes**
- **Shared/multi-user (usage partagé)** : plusieurs comptes utilisateurs partagent cette machine, gestion des permissions supplémentaire nécessaire → choisissez No

**Choisissez simplement Yes**, appuyez sur Entrée pour continuer.

![image-20260306103540426](https://img.lingflux.com/2026/03/f4a9f8ac970e447eadd09b4533d4c6c0.png)



### 2. On vous demande de choisir le **mode de configuration** :

- **QuickStart (démarrage rapide)** : installez rapidement d'abord, les détails (clé API, choix du modèle, etc.) se configurent plus tard
- **Manual (manuel)** : configurez tout manuellement étape par étape dès maintenant

------

**Je recommande QuickStart**, pour les raisons suivantes :

- Vous pouvez faire tourner le truc d'abord, puis ajuster avec `openclaw config set` plus tard
- Ça fait gagner du temps et de l'énergie



![image-20260306104637473](https://img.lingflux.com/2026/03/e3a2171975e988818fbaf4a59195d72d.png)



### 3. Le point clé : choisir **quel modèle IA** va piloter le cerveau d'OpenClaw.

En résumé : **OpenClaw ne fournit pas d'IA lui-même, il faut le connecter à un fournisseur de services IA**.

------

Explication des options courantes

| Option | Description |
| --- | --- |
| **OpenAI** | GPT-4o etc., le plus mainstream |
| **Google** | Série Gemini |
| **XAI (Grok)** | L'IA d'Elon Musk |
| **Moonshot AI (Kimi)** | Modèle chinois, très bon en chinois |
| **Mistral AI** | Modèle open source européen |
| **OpenRouter** | Plateforme agrégée, une clé pour plusieurs modèles |
| **Qianfan** | Baidu ERNIE |
| **Volcano Engine** | ByteDance Volcano Engine |
| **Hugging Face** | Plateforme de modèles open source |

Ce choix est crucial. D'après ce que j'ai lu en ligne, même si vous choisissez un modèle chinois, ces modèles ont des versions locales et internationales. Si vous sélectionnez directement un fournisseur chinois dans cette liste (Qwen, Z.AI, etc.), l'URL d'entrée du modèle peut ne pas correspondre.

Je vous recommande donc de choisir `Custom Provider`, et d'appuyer sur Entrée. (Comme ça, c'est vous qui définissez l'URL d'entrée du modèle, pas de risque de se tromper)



![image-20260306104908514](https://img.lingflux.com/2026/03/f0f7b7cf1b38d23375a9c9d36a8abea8.png)



Ensuite, vous devrez saisir l'API Base URL. Copiez simplement l'URL correspondante. Dans ma démo, je copie l'adresse que je vous ai montrée plus haut :
https://open.bigmodel.cn/api/anthropic (après avoir saisi, appuyez sur Entrée)

![image-20260306105524813](https://img.lingflux.com/2026/03/1bcc60387a3ba29b530e1bb53be24bf8.png)

On vous demande si vous voulez entrer la clé API maintenant ? Choisissez « Paste API key now », appuyez sur Entrée.

![](https://img.lingflux.com/2026/03/05a5eca5b5fa006180662a65d2ae9381.png)

Maintenant, copiez votre API KEY et appuyez sur Entrée.

![image-20260306105827355](https://img.lingflux.com/2026/03/291d99669c65b615d719844ddf743cee.png)

Ensuite, on vous demande **quel format d'interface** utilise votre fournisseur IA :

- **OpenAI-compatible** : le format d'interface est identique à celui d'OpenAI, la plupart des fournisseurs le prennent en charge (OpenRouter, Kimi, Volcano Engine, Mistral, etc.)
- **Anthropic-compatible** : le format d'interface est identique à celui d'Anthropic (Claude)

Mon URL étant compatible avec Claude Code, je choisis « Anthropic-compatible ».

![image-20260306110230234](https://img.lingflux.com/2026/03/b515ca0d12b745463dee0ae52c35b1ab.png)

Après ça, on vous demandera d'entrer l'ID du modèle. Il faut vérifier le nom exact sur l'API de votre fournisseur IA.

Dans ma démo, j'utilise GLM-4.7 (en fait, ça supporte déjà GLM-5.0 désormais, entrez le nom du modèle approprié), puis appuyez sur Entrée.

![image-20260306110457127](https://img.lingflux.com/2026/03/403f089e93c1d87df6cad0021532f953.png)

Patientez un peu, un test de connectivité API va se lancer. Si le test réussit, vous verrez « Verification successful ». Félicitations, vous venez de passer l'étape la plus complexe de la configuration !

![image-20260306110630506](https://img.lingflux.com/2026/03/3d695e4ca1951bb4247a8e87c66f1295.png)

Ensuite, on vous demandera d'entrer un Endpoint ID (un **nom unique** pour cette configuration de fournisseur IA, pour les distinguer facilement). Gardez la valeur par défaut et appuyez sur Entrée.

Puis on vous demandera un Model alias (un **surnom court** pour le modèle, pour taper moins quand vous changez de modèle). Vous pouvez laisser vide ou en mettre un, puis appuyez sur Entrée.



### 4. Choisir **via quelle messagerie** discuter avec l'IA.

En résumé : où voulez-vous discuter avec votre bot IA ?

------

Explication des options courantes

| Option | Description |
| --- | --- |
| **Telegram** | Recommandé — le plus simple à configurer, amical pour les débutants |
| **Discord** | Pour les gamers / communautés |
| **Slack** | Pour le contexte pro |
| **Feishu/Lark** | Courant dans les entreprises chinoises |
| **LINE** | Courant au Japon / Asie du Sud-Est |
| **iMessage** | Pour les utilisateurs Apple |
| **Signal** | Pour les amateurs de vie privée |
| **Skip for now** | Passer pour l'instant, configurer plus tard |

Pour le moment, choisissez « Skip for now », car l'article est déjà assez long, on verra ça la prochaine fois.

![image-20260306111140666](https://img.lingflux.com/2026/03/d1d97190310ba6be3e243af0b89ce93c.png)

### 5. Choisir si on configure les compétences (skills)

Là aussi, choisissez NO, toujours parce que l'article est déjà long, on verra ça la prochaine fois.

![image-20260306111359363](https://img.lingflux.com/2026/03/2fbc070efc12fe983d83711229631147.png)



### 6. Ensuite, une série de configurations API — tout passer avec NO

On vous propose de configurer des **plugins optionnels**, chacun nécessite sa propre clé API :

------

| Prompt | Fonctionnalité | Ce qu'il faut |
| --- | --- | --- |
| **GOOGLE_PLACES_API_KEY** | Recherche de lieux / cartes (Google Maps) | Google Cloud API Key |
| **GEMINI_API_KEY** | Utiliser le modèle Gemini AI | Google AI Studio Key |
| **NOTION_API_KEY** | Connecter vos notes Notion | Notion Integration Token |
| **OPENAI_API_KEY (image-gen)** | Génération d'images IA (DALL-E) | OpenAI API Key |
| **OPENAI_API_KEY (whisper)** | Reconnaissance vocale (audio vers texte) | OpenAI API Key |
| **ELEVENLABS_API_KEY** | Synthèse vocale IA (texte vers parole) | ElevenLabs Key |

------

Comment gérer ça ? **Répondez simplement No / passez tout pour l'instant**, parce que :

- Ce sont des fonctionnalités optionnelles, elles n'affectent pas l'utilisation de base
- Si vous n'avez pas de compte correspondant, ça ne marchera pas même en remplissant
- Vous pourrez toujours revenir les configurer plus tard

![image-20260306111518497](https://img.lingflux.com/2026/03/66c6830490fd101cd8bc45b7b3bf041c.png)

### 7. Les **Hooks sont des déclencheurs automatiques** qui exécutent certaines actions quand des événements spécifiques se produisent.

| Option | Rôle |
| --- | --- |
| **Skip for now** | Tout passer |
| **boot-md** | Charger automatiquement certaines instructions / prompts au démarrage |
| **bootstrap-extra-files** | Charger automatiquement des fichiers supplémentaires au démarrage |
| **command-logger** | Enregistrer tous les logs d'opérations |
| **session-memory** | Sauvegarder automatiquement la mémoire de la conversation en cours quand vous faites `/new` ou `/reset` |

------

Je recommande de **cocher uniquement `session-memory`**, c'est le plus utile. Ça permet à l'IA de se souvenir des conversations précédentes.

Le reste, laissez tomber pour la première utilisation, vous pourrez activer plus tard quand vous serez à l'aise.

Utilisez la **barre d'espace pour cocher**, puis Entrée pour confirmer.

![image-20260306111717358](https://img.lingflux.com/2026/03/ef24d76177a3e999293f7e0da00389da.png)



### 8. Comment démarrer et utiliser votre bot :

- **Hatch in TUI** : l'utiliser directement dans le Terminal, interface en ligne de commande.
- **Open the Web UI** : (recommandé) ouvrir l'interface web dans le navigateur.
- **Do this later** : on verra plus tard.

Choisissez « Open the Web UI », validez avec Entrée.

![image-20260306112107760](https://img.lingflux.com/2026/03/3244eb382e44133d4cc81f6ec18e57af.png)

À ce stade, le navigateur s'ouvre automatiquement sur l'interface Web UI d'OpenClaw.

## Votre première conversation avec le petit homard (OpenClaw)

![image-20260306112419909](https://img.lingflux.com/2026/03/f40a3a5c08362eecb739689dbcba3139.png)

Si OpenClaw répond, c'est que l'installation a réussi et que tout fonctionne normalement.

Félicitations !

Mais pour l'instant, votre petit homard est là, bouche bée, sans bras ni jambes. Vous lui demandez de faire un truc, il peut pas (il n'arrive pas à ouvrir le navigateur, il ne peut pas modifier de fichiers).

![image-20260306113036590](https://img.lingflux.com/2026/03/833a2ec19f73a2caab5a9aeb5138a0d2.png)





## Configurer le contrôle du navigateur et les permissions fichiers

Attention : les opérations suivantes vont élever les permissions d'OpenClaw. Lisez attentivement le contenu associé et continuez à apprendre.

### OpenClaw propose 2 modes de contrôle du navigateur

1. (Mode isolé) Utilise le navigateur intégré à OpenClaw, totalement isolé du système local, avec ses propres informations de connexion.

2. (Mode extension) Utilise le Chrome local, installe l'extension OpenClaw Browser Relay, partage les informations de connexion du système.

> Cet exemple utilise le **mode extension** avec le Chrome local.



### Trouver la clé OpenClaw gateway token

La clé gateway token d'OpenClaw est à traiter comme un mot de passe, gardez-la précieusement.

Il y a 2 méthodes pour la récupérer :

#### 1. La trouver directement dans le fichier de configuration

Le fichier de configuration macOS se trouve dans le dossier utilisateur, c'est un dossier caché. Il faut afficher les fichiers cachés pour trouver le dossier `.openclaw`. Ouvrez-le, puis ouvrez le fichier openclaw.json. Dans la section « gateway », vous trouverez le token.

![image-20260306122344215](https://img.lingflux.com/2026/03/537f4f44ca08c446ef9ede6549ddb90d.png)

#### 2. La voir dans le Web UI (c'est la méthode la plus simple)

Cliquez sur « Overview », sous « Gateway Token » vous la trouverez, tout simplement.

![image-20260306122950056](https://img.lingflux.com/2026/03/54be336e2aaa6342c1289fc5370c270a.png)





### 1. Installer l'extension de contrôle du navigateur dans Chrome

Dans le Chrome Web Store (https://chromewebstore.google.com/) cherchez « OpenClaw Browser Relay »

(à la date de rédaction, on en est à la version 2.7), et installez-la. (Attention, il y a pas mal d'extensions OpenClaw Browser maintenant, lisez bien, ne vous trompez pas d'extension)

Après l'installation, une page s'ouvre et vous demande d'entrer la clé token pour vérification. Ici, vous entrez le gateway token d'OpenClaw, PAS la clé API IA. Ne confondez pas.

Une fois configuré, vous pouvez épingler l'extension pour y accéder facilement. (Il faudra faire une manipulation manuelle tout à l'heure, retenez-le.)

![image-20260306114923386](https://img.lingflux.com/2026/03/9b0e0c0e5bc27812210d0b9886a1962d.png)



### 2. Activer le mode développeur

Dans le navigateur, tapez chrome://extensions/ et appuyez sur Entrée pour accéder à la page de gestion des extensions. En haut à droite, il y a un interrupteur « Developer mode ». Vérifiez qu'il est activé. Si ce n'est pas le cas, activez-le.



### 3. Configurer OpenClaw pour le navigateur et les opérations fichiers

Configuration via CLI. Ouvrez le Terminal et entrez les commandes suivantes :

```bash
# Élever les permissions d'openclaw au niveau coding
openclaw config set tools.profile coding

# S'assurer que la fonctionnalité navigateur est activée
openclaw config set browser.enabled true

# Basculer vers le Chrome système (c'est la méthode officielle pour le « Chrome par défaut du système »)
openclaw config set browser.defaultProfile "chrome"

# Vider l'allowlist (laisser le profil coding exposer automatiquement les bons outils fichiers, c'est la clé !)
openclaw config set tools.allow '[]'

# Une fois la configuration terminée, redémarrer le gateway openclaw (obligatoire)
openclaw gateway restart
```

Comme le montre l'image :

![image-20260306113653129](https://img.lingflux.com/2026/03/02f6c0258cc846cf7699cd372bbb8a03.png)

Après le redémarrage...

1. Ouvrez le navigateur, visitez n'importe quelle page, par exemple https://lingshunlab.com, puis cliquez sur l'extension que vous venez d'installer, le homard. Ça affichera un petit badge « ON », indiquant que tout fonctionne normalement.

![image-20260306124413421](https://img.lingflux.com/2026/03/4ef9d1f4eb78a3ca6b2463ed0e809f89.png)

2. Allez sur la page Web UI d'OpenClaw, lancez une conversation « Chat », mais avant de discuter, faites d'abord « New session », puis envoyez quelque chose comme « Ouvre bilibili.com dans le navigateur ».

Si tout va bien, le navigateur s'ouvrira automatiquement sur le site de bilibili.

![image-20260306123830087](https://img.lingflux.com/2026/03/7580e05a2df8e32d72a7370d3fa964a5.png)

À ce stade, vous pouvez aussi tester les opérations fichiers. Envoyez quelque chose comme « Crée un fichier dans mon dossier utilisateur pour tester la fonctionnalité de création de fichiers ». Le petit homard créera un fichier pour vous.

![image-20260306124032376](https://img.lingflux.com/2026/03/3532062bde99391b12d64eb1c8e2de3b.png)



Tout fonctionne, félicitations ! Mais... ça fait un peu flipper, non ? Et si...

C'est pourquoi je veux limiter les opérations fichiers au répertoire « workspace » (espace de travail). Où se trouve ce workspace ? Vous pouvez le voir dans le fichier openclaw.json, ou dans le Web UI sous « Agents » puis « Overview ».

![image-20260306125311134](https://img.lingflux.com/2026/03/6b0ba79477058ff2819ac69caca95fb3.png)



### 4. Limiter les opérations fichiers au seul répertoire workspace

Configuration via CLI. Ouvrez le Terminal et entrez la commande suivante :

```bash
# Configurer les opérations fichiers uniquement dans le répertoire workspace
openclaw config set tools.fs.workspaceOnly true
```

Puis redémarrez le gateway :

```bash
openclaw gateway restart
```





## Conclusion

Maintenant, le homard a des bras.

Il peut ouvrir le navigateur, cliquer sur des pages, lire et écrire des fichiers dans l'espace de travail que vous avez défini — ça paraît simple, mais tout ce qu'on peut faire derrière, c'est énorme.

Dans le prochain article, je vous montrerai comment le connecter à Feishu, comme ça, où que vous soyez, vous pourrez « élever votre homard à distance ».

Si ça vous intéresse, abonnez-vous à ma chaîne, je continue à publier :

- YouTube : [lingshunlab](https://www.youtube.com/@lingshunlab)
- Bilibili : [lingshunlab](https://space.bilibili.com/456183128)



## Références

### Permissions **`tools.profile`**

https://docs.openclaw.ai/tools#tool-profiles-base-allowlist

Le **`tools.profile`** dans OpenClaw (2026.3.2 et versions récentes) est le **préréglage de base** (base allowlist) des permissions d'outils. Ce paramètre **a un impact majeur sur la sécurité** : par défaut, une nouvelle installation utilise `"messaging"` (un changement de sécurité important depuis 2026.3.x). Les profils broad/coding que les anciens utilisateurs avaient l'habitude d'utiliser doivent maintenant être définis explicitement.

### Comparaison des permissions (les différences clés)

| Dimension | minimal | messaging | coding | full |
| --- | --- | --- | --- | --- |
| **Opérations fichiers** (fs.read/write/edit/apply_patch) | Interdit totalement | Interdit | Autorisé (peut être limité via fs.workspaceOnly) | Autorisé |
| **Exécution Shell** (exec/runtime/process) | Interdit | Interdit | Autorisé (peut nécessiter approvals.exec) | Autorisé |
| **Navigateur** (browser) | Interdit | Interdit | Autorisé | Autorisé |
| **Gestion messages/sessions** (sessions_*, messaging group) | Uniquement session_status | Complet | Complet | Complet |
| **Outils image/mémoire** (image, memory_*) | Interdit | Interdit | Partiel | Complet |
| **Autres outils à haut risque** (cron, gateway, nodes, etc.) | Interdit | Interdit | La plupart interdits (nécessite allow) | Potentiellement ouverts |
| **Installation par défaut** | Non | Oui (changement majeur 2026.3.x) | Configuration manuelle requise | Configuration manuelle requise |
| **Public recommandé** | Sécurité maximale, chat uniquement | Utilisateurs normaux, débutants, chat avant tout | Développeurs, utilisateurs intensifs de code/fichiers | Tests, POC, quand on fait confiance au modèle |

###

### Liste des commandes browser courantes

https://docs.openclaw.ai/tools/browser
