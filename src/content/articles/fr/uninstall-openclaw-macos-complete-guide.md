---
title: "Désinstaller proprement OpenClaw sur macOS (ne laissez rien traîner)"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-12
intro: "Vous croyiez qu'un clic sur « désinstaller » suffisait ? OpenClaw laisse des traces dans trois endroits sur macOS : le répertoire de l'espace de travail, la commande globale npm et la configuration des variables d'environnement dans .zshrc. Si l'un de ces endroits n'est pas nettoyé, vous risquez des erreurs dans le terminal ou des conflits étranges avec de nouveaux outils. Ce guide décrit la procédure complète de suppression, avec captures d'écran, en 5 minutes chrono, sans aucun résidu."
image: "https://img.lingflux.com/2026/03/57911d1d24d0ad3cb8aadbf57ea7fafc.jpg"
tags: ["Désinstallation OpenClaw", "Supprimer OpenClaw", "Suppression complète macOS", "Désinstallation globale npm"]
---

Beaucoup de gens, après avoir désinstallé OpenClaw, ouvrent à nouveau le Terminal et se retrouvent avec une flopée d'erreurs, ou tombent sur des conflits de variables d'environnement incompréhensibles en installant de nouveaux outils. La raison est simple : **vous n'avez supprimé que la surface, il reste des fichiers résiduels dans trois endroits.**

Ce guide décrit la procédure complète de suppression, avec des captures d'écran pour vous guider. En 5 minutes, ce sera propre, sans la moindre trace.



## Avant la désinstallation

⚠️ Avant de commencer : sauvegardez vos fichiers de travail

Rendez-vous dans l'espace de travail d'OpenClaw (l'emplacement par défaut sur macOS est : ~/.openclaw/workspace) et sauvegardez les fichiers qu'il contient : vous y trouverez peut-être des **fichiers de configuration, des fichiers de compétences (skills), des fichiers de projets** que vous aviez paramétrés auparavant.

Le processus de désinstallation supprimera automatiquement ce répertoire. Avant de vous lancer, copiez donc les fichiers que vous souhaitez conserver vers un autre emplacement.



## Lancer la désinstallation

Ouvrez le Terminal et entrez la commande suivante :

```bash
openclaw uninstall
```

Après exécution, le programme vous demandera quels composants supprimer. **Il est recommandé de tout cocher** (appuyez sur la barre d'espace pour sélectionner), ainsi la suppression sera la plus complète possible.

Une fois votre sélection faite, appuyez sur Entrée. Une confirmation vous sera demandée : « Êtes-vous sûr de vouloir supprimer ? », choisissez **Yes** pour confirmer.

Le programme de désinstallation se lance alors. Vous verrez probablement quelque chose comme ceci :

![ScreenShot_2026-03-12_204743_136 (1)](https://img.lingflux.com/2026/03/cdb2215144cdaa58c3d7f26b61bee3a6.png)

Lisez bien le message — il vous indique que **la commande OpenClaw dans le CLI n'a pas encore été supprimée**. C'est le premier piège facile à manquer, il faut la traiter séparément.



## Supprimer OpenClaw du CLI avec npm

Pourquoi une suppression séparée ? Parce que l'outil en ligne de commande d'OpenClaw est installé globalement via npm, il ne fait pas partie de l'application elle-même, et le programme de désinstallation officiel ne gère pas cette partie.

Dans le Terminal, entrez :

```bash
npm uninstall openclaw -g
```

Cela supprimera la commande openclaw du CLI. Le résultat ressemblera à ceci :

![Weixin Image_20260312205126_397_55 (1)](https://img.lingflux.com/2026/03/6d07540cdb4de7cd36eddf7b9cb627be.png)

Une fois cette étape terminée, la commande `openclaw` aura disparu de votre système. Mais ce n'est pas encore fini...



## Nettoyer la configuration des variables d'environnement d'OpenClaw dans .zshrc

C'est **l'étape la plus souvent oubliée, et celle qui provoque le plus de problèmes par la suite**.

Lors de l'installation, OpenClaw ajoute automatiquement un bloc de configuration à la fin du fichier `~/.zshrc`, utilisé pour charger le script de complétion de commandes. Même après les deux premières étapes, ce bout de code est toujours là. À chaque ouverture du Terminal, le système tente de charger un fichier qui n'existe plus, ce qui déclenche des erreurs.

Sur macOS, localisez le fichier .zshrc dans le répertoire utilisateur (~/.zshrc). C'est un fichier caché : pour l'afficher, appuyez sur le raccourci (Shift + Commande + .) dans le répertoire utilisateur. Ouvrez-le avec un éditeur de texte (ou utilisez la commande `nano ~/.zshrc` dans le Terminal pour l'ouvrir et le modifier).



Repérez le bloc de code suivant et supprimez-le entièrement :

```tex
# OpenClaw Completion
source "/Users/{votre-nom-utilisateur}/.openclaw/completions/openclaw.zsh"
```

Voici à quoi ça ressemble — supprimez tout le bloc :

![ScreenShot_2026-03-12_205815_641 (1)](https://img.lingflux.com/2026/03/eb7706d1300a594edd849b787c740a8c.png)

Après suppression, enregistrez le fichier. Si vous utilisez nano, appuyez sur `Control + X`, puis sur `Y` pour confirmer l'enregistrement.

Fermez le Terminal.

Lorsque vous rouvrirez le Terminal, OpenClaw aura été complètement supprimé de votre système. Cette langouste est enfin partie.



## Terminé

En résumé, la désinstallation d'OpenClaw nécessite de nettoyer trois endroits, sans exception :

1. **Exécuter `openclaw uninstall`**, pour supprimer l'application principale et l'espace de travail
2. **Exécuter `npm uninstall openclaw -g`**, pour supprimer la commande CLI globale
3. **Éditer `~/.zshrc`**, pour supprimer le code de configuration de l'auto-complétion

Le tout prend moins de 5 minutes. Suivez l'ordre, faites les trois étapes, et vous pourrez dire adieu à cette langouste 🦞 sans laisser la moindre trace.

### Vérifier que la désinstallation est propre

Une fois ces trois étapes effectuées, vous pouvez utiliser la commande suivante pour confirmer qu'OpenClaw a bien été entièrement retiré du système :

```bash
which openclaw
```

S'il n'y a aucun retour, la désinstallation est complète. Si un chemin s'affiche encore, vérifiez si des résidus subsistent dans le répertoire global de npm :

```bash
npm list -g --depth=0
```

Confirmez que `openclaw` n'apparaît plus dans la liste, et c'est bon.

Si cet article vous a été utile, n'hésitez pas à le sauvegarder et à le partager avec vos amis qui utilisent également OpenClaw.
