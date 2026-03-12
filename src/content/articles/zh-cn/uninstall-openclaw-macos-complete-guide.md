---
title: "MacOS 彻底卸载 OpenClaw 的正确姿势（别删一半留一半）"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-12
intro: "你以为点了「卸载」就完事了？OpenClaw 在 MacOS 上其实会在三个地方留下痕迹：工作空间目录、npm 全局命令、以及 .zshrc 环境变量配置。任何一处没清干净，轻则终端报错，重则新工具安装异常。本文记录完整的清除步骤，附截图，5 分钟搞定，不留残留。"
image: "https://img.lingflux.com/2026/03/57911d1d24d0ad3cb8aadbf57ea7fafc.jpg"
tags: ["OpenClaw uninstall", "OpenClaw 卸载", "MacOS 彻底删除", "npm 全局卸载"]
---

很多人卸载 OpenClaw 之后，重新打开终端还是会看到一堆报错，或者装新工具时环境变量莫名冲突。原因很简单：**你只删掉了「表面」，还有三个地方藏着残留文件。**

本文记录完整的清除步骤，附截图说明，5 分钟搞定，彻底不留痕迹。



## 卸载前的工作

⚠️ 开始之前：先备份你的工作文件

请到OpenClaw的工作空间（默认位置在MacOS的：~/.openclaw/workspace），备份里面的文件：里面可能包含你之前配置好的**配置文件、skill 技能文件、项目文件**等。

卸载过程会自动清除这个目录。所以在动手之前，先把需要留存的文件复制到其他地方。



## 开始卸载

打开终端，输入以下命令：

```bash
openclaw uninstall
```

执行后，程序会询问你要删除哪些组件。**建议全部勾选**（按空格键选中），这样清除得最彻底。

选完之后回车，会再次询问「是否确认删除」，选择 **Yes** 确认。

卸载程序随即执行，大概会看到如下画面：

![ScreenShot_2026-03-12_204743_136 (1)](https://img.lingflux.com/2026/03/cdb2215144cdaa58c3d7f26b61bee3a6.png)

注意看提示信息——这里会告诉你，**CLI 中的 OpenClaw 命令还没有被删除**。这是第一个容易漏掉的地方，需要单独处理。



## 使用NPM命令删除CLI中的OpenClaw

为什么需要单独删？因为 OpenClaw 的命令行工具是通过 npm 全局安装的，它不属于应用本体，官方卸载程序不会替你处理这部分。

在命令行输入：

```bash
npm uninstall openclaw -g
```

这样就会删除CLI中的openclaw命令，执行完大概如下图：

![Weixin Image_20260312205126_397_55 (1)](https://img.lingflux.com/2026/03/6d07540cdb4de7cd36eddf7b9cb627be.png)

这一步完成后，`openclaw` 命令就从你的系统里消失了。但还没完——



## 清理 .zshrc 里的OpenClaw环境变量配置

这是**最容易被忽略、也最容易引发后续问题**的一步。

OpenClaw 安装时会在 `~/.zshrc` 文件末尾自动写入一段配置，用于加载命令补全脚本。即使前两步都做完了，这段代码还留在那里，每次打开终端都会尝试去加载一个已经不存在的文件，进而报错。

MacOS系统上，找到用户目录的.zshrc文件（~/.zshrc），这个是隐藏文件，需要显示隐藏文件，例如在用户目录下按快捷键（shift + command + .）显示隐藏文件，使用文本编辑软件打开也可以（或者在命令行` nano ~/.zshrc`，打开比编辑）。



找到下面这段代码，整段删除：

```tex
# OpenClaw Completion
source "/Users/{你的用户名称}/.openclaw/completions/openclaw.zsh"
```

找到下面这段代码，整段删除：

![ScreenShot_2026-03-12_205815_641 (1)](https://img.lingflux.com/2026/03/eb7706d1300a594edd849b787c740a8c.png)

删除后保存文件。如果用的是 nano，按 `Control + X`，然后按 `Y` 确认保存。

关闭终端（命令行工具）。

当你再次打开终端（命令行工具）的时候，已经在系统上完全删除OpenClaw，这只龙虾了。



## 结束

总结卸载 OpenClaw 需要清理三个地方，缺一不可：

1. **运行 `openclaw uninstall`**，删除应用主体和工作空间
2. **运行 `npm uninstall openclaw -g`**，删除全局 CLI 命令
3. **编辑 `~/.zshrc`**，删除自动补全的配置代码

整个过程 5 分钟以内，按顺序做完就能彻底告别这只龙虾 🦞，不留任何残留。

###  验证是否卸载干净

做完以上三步，可以用下面这个命令确认 OpenClaw 是否已经完全从系统移除：

```bash
which openclaw
```

如果没有任何输出，说明卸载干净了。如果还有路径返回，检查 npm 全局目录是否还有残留：

```bash
npm list -g --depth=0
```

在输出列表里确认没有 `openclaw` 即可。

如果这篇文章帮到了你，欢迎收藏转发给同样在用 OpenClaw 的朋友。