---
title: "Discuter avec l'IA directement sur WeChat ? Tutoriel testé : connecter OpenClaw via ClawBot (support officiel, sans risque de bannissement)"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-22
intro: "WeChat a officiellement ouvert son système de plugins. Connectez ClawBot d'OpenClaw pour discuter avec l'IA directement dans WeChat. Cet article fournit le processus d'installation complet et les solutions aux problèmes courants."
image: "https://img.lingflux.com/2026/03/e0160b21b299a1ed5acdb00b763871a7.png"
tags: ["openclaw", "clawbot", "plugin WeChat", "WeChat IA", "tutoriel OpenClaw", "IA WeChat"]
---


WeChat a officiellement ouvert son mécanisme de plugins, et vous pouvez désormais connecter directement ClawBot d'OpenClaw à WeChat — pas besoin de crack tiers, pas de risque de bannissement, il suffit de mettre à jour à la version v8.0.70.

Cet article documente le processus complet que j'ai moi-même réussi à faire fonctionner, y compris les endroits où ça bloque et comment les contourner.

---

## Prérequis : la version de WeChat doit être v8.0.70 ou supérieure

L'entrée des plugins est une fonctionnalité exclusive aux nouvelles versions. Si votre version est trop ancienne, vous ne trouverez pas l'option.

Après la mise à jour, **fermez manuellement WeChat puis rouvrez-le**. Pas simplement le mettre en arrière-plan, mais vraiment quitter et relancer. Au début, je n'avais pas redémarré et j'ai cherché pendant des plombes dans les paramètres sans trouver l'entrée des plugins. Un simple redémarrage et elle est apparue.

---

## Méthode 1 : Le processus officiel (5 minutes si tout se passe bien)

### Étape 1 : Trouvez votre commande d'installation dédiée

Sur WeChat mobile, suivez ce chemin :

**« Moi » → « Paramètres » → « Plugins » → Trouvez ClawBot → « Détails »**

![Page des détails du plugin ClawBot](https://img.lingflux.com/2026/03/f78858448a52037587812f6a540d9166.png)

Une commande dédiée s'affiche, au format :

```bash
npx -y @tencent-weixin/openclaw-weixin-cli@latest install
```

La commande générée est légèrement différente pour chaque compte. Copiez celle qui s'affiche sur votre page.

### Étape 2 : Exécutez la commande sur l'appareil qui fait tourner OpenClaw

Ouvrez le Terminal, collez la commande, appuyez sur Entrée, et attendez que l'installation se termine.

![Exécution de la commande d'installation dans le terminal](https://img.lingflux.com/2026/03/9118db862fbd4f96c48fe012cec2241c.png)

### Étape 3 : Scannez le QR code pour l'appairage

Une fois l'installation terminée, un QR code s'affiche dans le Terminal. Scannez-le avec WeChat, puis confirmez l'autorisation sur votre téléphone.

### Étape 4 : Retrouvez ClawBot dans WeChat et envoyez un message

Une fois l'appairage réussi, ClawBot apparaît dans WeChat. Envoyez-lui directement un message et c'est parti.

---

## Méthode 2 : La procédure manuelle quand l'installation bloque

Si votre Terminal reste bloqué sur « Installation du plugin en cours... » pendant plus de deux ou trois minutes sans aucune activité — n'attendez plus, le processus est planté. Faites `Ctrl+C` pour annuler ou fermez directement la fenêtre du Terminal, et passez à la procédure manuelle ci-dessous. C'est comme ça que j'ai réussi de mon côté.

### Étape 1 : Arrêter le gateway OpenClaw

```bash
openclaw gateway stop
```

### Étape 2 : Vérifier que le processus est bien terminé

```bash
pkill -f openclaw
```

### Étape 3 : Installer manuellement le plugin via npm

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
```

### Étape 4 : Activer le plugin

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

### Étape 5 : Déclencher l'appairage par QR code (étape clé)

```bash
openclaw channels login --channel openclaw-weixin
```

Un QR code apparaît dans le Terminal → scannez-le avec WeChat → confirmez l'autorisation sur le téléphone → quand vous voyez « Connexion à WeChat réussie », c'est que l'appairage est fait.

![Message de connexion WeChat réussie](https://img.lingflux.com/2026/03/b6e5065e87d9175a8499d84e32cf0964.png)

### Étape 6 : Redémarrer le gateway

Cette étape est facile à oublier, mais sans redémarrage, ClawBot ne répondra pas aux messages.

```bash
openclaw gateway restart
```

---

## Vérifier que tout fonctionne

Retournez dans WeChat, trouvez ClawBot, envoyez un message au hasard. Si vous recevez une réponse, tout fonctionne.

![ClawBot répond normalement dans WeChat](https://img.lingflux.com/2026/03/6a7c383c20c33490baa5b8cbcba4f1d0.png)

---

## FAQ rapide

| Problème | Solution |
|---|---|
| La commande d'installation reste bloquée sur « Installation du plugin en cours... » | Arrêtez d'attendre, passez directement à la Méthode 2 |
| Pas de réaction sur le téléphone après le scan du QR code | Fermez complètement WeChat et relancez-le, puis recommencez le scan |
| ClawBot ne répond pas après le redémarrage du gateway | Vérifiez que la configuration `enabled` du plugin à l'étape 4 a bien été enregistrée |

---

Le processus ci-dessus a été testé avec succès sur macOS. Les opérations en ligne de commande sont identiques sur Windows, faites juste attention aux barres obliques inversées pour les chemins.
