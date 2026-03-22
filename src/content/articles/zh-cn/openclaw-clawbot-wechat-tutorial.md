---
title: "微信直接聊 AI？OpenClaw 接入 ClawBot 实测教程（官方支持，不封号）"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-22
intro: "微信官方已开放插件机制，用微信的ClawBot与OpenClaw对接聊天 。本文提供完整安装流程和常见问题解决方案。"
image: "https://img.lingflux.com/2026/03/e0160b21b299a1ed5acdb00b763871a7.png"
tags: ["openclaw", "clawbot", "微信插件", "WeChat AI", "OpenClaw 教程", "微信 AI"]
---


微信官方已经开放了插件机制，可以把 OpenClaw 的 ClawBot 直接挂进微信——不用第三方破解，不用担心封号，更新到 v8.0.70 就能用。

本文记录的是我自己跑通的完整流程，包括卡死的坑和绕过去的办法。

---

## 前置条件：微信版本必须是 v8.0.70 或以上

插件入口是新版本才有的功能，版本不够就找不到。

更新完之后**手动关闭微信再重新打开**，不是后台切换，是真正退出重启。我一开始就是因为没重启，在设置里翻了半天找不到插件入口，重启一下就出来了。

---

## 方法一：官方流程（顺利的话 5 分钟）

### 第一步：找到你的专属安装命令

手机微信按这个路径进去：

**「我」→「设置」→「插件」→ 找到 ClawBot →「详细」**

![ClawBot插件详情页面](https://img.lingflux.com/2026/03/f78858448a52037587812f6a540d9166.png)

这里会显示一条专属命令，格式是：

```bash
npx -y @tencent-weixin/openclaw-weixin-cli@latest install
```

每个账号生成的命令略有不同，复制你自己页面上的那条。

### 第二步：在运行 OpenClaw 的设备上执行命令

打开终端，粘贴命令，回车，等安装走完。

![终端运行安装命令](https://img.lingflux.com/2026/03/9118db862fbd4f96c48fe012cec2241c.png)

### 第三步：扫码配对

安装结束后，终端里会弹出一个二维码，用微信扫一扫，手机上点确认授权。

### 第四步：回微信找 ClawBot 发消息

配对成功后微信里会出现 ClawBot，直接发消息就能用了。

---

## 方法二：安装卡死时的手动方案

如果你的终端在「正在安装插件...」这里停住超过两三分钟没有任何动静——不用再等了，进程卡死了。`Ctrl+C` 取消或者直接关掉终端窗口，改用下面这套手动流程，我自己就是用这个跑通的。

### 第一步：停掉 OpenClaw Gateway

```bash
openclaw gateway stop
```

### 第二步：确认进程彻底退出

```bash
pkill -f openclaw
```

### 第三步：用 npm 方式手动安装插件

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
```

### 第四步：启用插件

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

### 第五步：触发扫码绑定（关键步骤）

```bash
openclaw channels login --channel openclaw-weixin
```

终端弹出二维码 → 微信扫一扫 → 手机确认授权 → 看到「与微信连接成功」就说明绑定好了。

![微信连接成功提示](https://img.lingflux.com/2026/03/b6e5065e87d9175a8499d84e32cf0964.png)

### 第六步：重启 Gateway

这步容易被跳过，但不重启的话 ClawBot 不会响应消息。

```bash
openclaw gateway restart
```

---

## 验证是否成功

回到微信，找到 ClawBot，随手发一句话。收到回复说明全部跑通了。

![ClawBot在微信中正常回复](https://img.lingflux.com/2026/03/6a7c383c20c33490baa5b8cbcba4f1d0.png)

---

## 常见问题速查

| 问题现象 | 处理方式 |
|---|---|
| 安装命令卡在「正在安装插件...」不动 | 放弃等待，直接走方法二 |
| 扫码后手机无反应 | 完全退出微信再重新打开，重试扫码 |
| Gateway 重启后 ClawBot 没有回复 | 确认第四步的插件 enabled 配置有没有写进去 |

---

以上流程在 macOS 上实测通过，Windows 命令行操作相同，路径写法注意用反斜杠。

