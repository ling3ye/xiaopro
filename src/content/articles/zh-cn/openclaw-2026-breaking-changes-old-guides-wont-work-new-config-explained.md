---
title: "养龙虾避坑手册｜OpenClaw从安装到操控浏览器，一篇全搞掂"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-02-23
intro: "你有没有试过装完 OpenClaw 什么都干不了？本文作者亲历10次卸载重装，彻底摸透了 OpenClaw 2026.3.2 版本的配置逻辑——从 API 接入、自定义服务商，到开放浏览器控制、文件读写权限，每一步都有截图和命令对照。适合 macOS 用户、新手入坑，以及被旧教程坑过的老用户。"
image: "https://img.lingflux.com/2026/03/015705fbca42171bdf09fabe9220b546.webp"
tags: ["openclaw config guide", "openclaw 2026 setup", "openclaw tools profile", "OpenClaw 配置教程", "OpenClaw 权限设置", "OpenClaw 最新版本"]
---

大家养龙虾都有一段时间了，感觉现在的版本应该比较稳定了，之前就名字都可以给我搞到一头烟，明明是ClawdBot的网址，但安装命令是install MoltBot，转过头又叫OpenClaw。这不是 bug，这是开源项目的传统：先做，收到律师信再改名。（Claude 告 ClawBot 发音太像 Claude，从此Claw就更出名了）

这几天在测试的时候，感觉天天都在更新，因为我为了搞明白配置的逻辑，我删了又装，装了又删，从

2026.2.25
2026.2.26
2026.3.1
2026.3.2
....

这更新的速度也太密集了，尤其是我测试最新版本2026.3.2（截稿日期为2026年3月6日）发现配置的方式有所改变，导致之前测试的行不通。这个版本感觉默认配置的安全性提高了，需要自己手动去配置更高权限。

OpenClaw我喜欢它可以操作浏览器，可以操作系统文件，当然这也带来很多安全问题，所以也必须要小心使用。要养好这个小龙虾，就得花点时间学习怎么配置。



## 在开始之前：你的 API 余额够用吗？

OpenClaw 本身是开源免费的，但它要"动手"，得靠 AI 模型在背后驱动，而这需要 API token。

如果你的 token 快见底了，或者还没配过，以下两个平台目前性价比不错，按需选择：

- **智谱 GLM**：支持 Claude Code、Cline 等 20+ 工具，有限时订阅优惠 → [链接](https://www.bigmodel.cn/glm-coding?ic=IPWNTCEXE2) （我现在正在用这个，注意这不是广告！！！这不是广告！！！这不是广告！！！没收钱的，广告位正在招租）

​	![image-20260306102449045](https://img.lingflux.com/2026/03/52e663b49875f0ab36c9fc1f2ff806dd.png)

​	1，你的API KEY ：在控制中心找到API key 进行复制
​	2，GML的地址：https://open.bigmodel.cn/api/anthropic （适配Cladue code的地址）
​	3，模型名称：GLM-4.7

​	以上3个信息请先过目一下，在接下来的配置会需要用

- **阿里云百炼**：全量大模型，新用户有免费额度 → [链接](https://www.aliyun.com/benefit/ai/aistar?clubBiz=subTask..12406352..10263..) （这个也不错的，注意这也不是广告！！！）

准备好之后，我们开始。





## 安装OpenClaw开始吧

我的是macOS系统，这是养龙虾的最好系统，因为作者就是用macOS系统开发的，问题是最少点，其他的windows，Raspberry PI OS，linux，可能会有点不一样。但这个项目的贡献者众多，有大问题也能很快解决。

但我看从高到低最好的顺序应该如下：

macOS > Linux > Windows > others

先去官网看看，有多种安装方法：https://openclaw.ai/

### macOS快速安装

在macOS系统中，官方有提供APP下载，但是我不知道为什么我就是装不上APP。用那个一条自动安装的命令`curl -fsSL https://openclaw.ai/install.sh | bash`，又不是每次都成功，所以我选择使用npm的安装方式，命令行输入：

```bash
# Install OpenClaw  | 安装 OpenClaw
npm i -g openclaw
```

耐心等待安装完成，之后继续输入：

```bash
# Meet your lobster ｜ 配置 OpenClaw
openclaw onboard
```

之后就是配置向导的界面，慢慢查看一步一步选择和配置API即可，大概过程如下：



### 1，这是在问你这的使用场景：

- **Personal（个人使用）**：只有你一个人用这台 Mac Mini → 选 **Yes**
- **Shared/multi-user（多人共用）**：多个用户账号共用这台机器，需要额外的权限管控 → 选 No

**你直接选 Yes 就好**，按回车确认继续。

![image-20260306103540426](https://img.lingflux.com/2026/03/f4a9f8ac970e447eadd09b4533d4c6c0.png)



### 2，这是问你选择哪种**安装配置方式**：

- **QuickStart（快速开始）**：先快速装好，细节配置（API密钥、模型选择等）之后再慢慢设置
- **Manual（手动）**：现在就一步步手动配置所有细节

------

**建议选 QuickStart**，原因：

- 可以先跑起来，之后再用 `openclaw config set` 慢慢调整
- 省时省力



![image-20260306104637473](https://img.lingflux.com/2026/03/e3a2171975e988818fbaf4a59195d72d.png)



### 3，关键：选择**用哪家 AI 模型**来驱动 OpenClaw 的大脑。

简单说就是：**OpenClaw 本身不提供 AI，需要你接入一个 AI 服务商**。

------

常见选项说明

| 选项                   | 说明                          |
| ---------------------- | ----------------------------- |
| **OpenAI**             | GPT-4o 等，最主流             |
| **Google**             | Gemini 系列                   |
| **XAI (Grok)**         | 马斯克的 AI                   |
| **Moonshot AI (Kimi)** | 国产，支持中文很好            |
| **Mistral AI**         | 欧洲开源模型                  |
| **OpenRouter**         | 聚合平台，一个 key 用多个模型 |
| **Qianfan**            | 百度文心                      |
| **Volcano Engine**     | 字节跳动火山引擎              |
| **Hugging Face**       | 开源模型平台                  |

这里的选择非常关键，因为看网上说即使你选择的是国内模型，但由于国内模型有分国内版本和国外版本的，所以你如果直接选择这个列表中的国内模型供应商例如（Qwen，Z.AI等等）可能模型的入口url会有所出入。

所以我建议选择 `Custom Provider`, 按下回车。（这样模型的入口就是由你自己定义，一定不会错）



![image-20260306104908514](https://img.lingflux.com/2026/03/f0f7b7cf1b38d23375a9c9d36a8abea8.png)



之后会见到，需要你输入API Base URL ，这里复制你对应的URL即可，演示中我的就复制刚才让你过目的地址：
https://open.bigmodel.cn/api/anthropic   （输入完成，按回车）

![image-20260306105524813](https://img.lingflux.com/2026/03/1bcc60387a3ba29b530e1bb53be24bf8.png)

问是否现在就输入API KEY？选择Paste API key now （现在输入），按回车即可

![](https://img.lingflux.com/2026/03/05a5eca5b5fa006180662a65d2ae9381.png)

现在就把你的API KEY 复制后回车

![image-20260306105827355](https://img.lingflux.com/2026/03/291d99669c65b615d719844ddf743cee.png)

之后，这是问你选择的 AI 服务商用的是**哪种接口格式**：

- **OpenAI-compatible**：接口格式跟 OpenAI 一样，大多数模型服务商都支持这个格式（OpenRouter、Kimi、火山引擎、Mistral 等）
- **Anthropic-compatible**：接口格式跟 Anthropic（Claude）一样

由于我的URL是兼容Claude Code的，所以选择「Anthropic-compatible」即可

![image-20260306110230234](https://img.lingflux.com/2026/03/b515ca0d12b745463dee0ae52c35b1ab.png)

再之后，会让你输入模型ID，这个需要查看你的AI供应商API上的指定名称是什么，

演示这里使用的GLM-4.7（实际上现在已经支持到GLM-5.0，请根据模型名称输入），按回车

![image-20260306110457127](https://img.lingflux.com/2026/03/403f089e93c1d87df6cad0021532f953.png)

等待一下，就会进行API连通性测试，测试成功就会显示 「Verification successful」，恭喜你完成了配置过程中最复杂的一步了。

![image-20260306110630506](https://img.lingflux.com/2026/03/3d695e4ca1951bb4247a8e87c66f1295.png)

之后会叫你输入Endpoint ID（给这个 AI 服务商配置起一个**唯一的名字**，方便区分）， 直接默认值即可，直接回车

之后会叫你输入Model alias （给模型起一个**简短的昵称**，方便以后切换时少打字），直接默认空也行，输入也行，回车



### 4，选择**通过哪个聊天软件来跟 AI 对话**。

简单说就是：你想在哪里跟你的 AI 机器人聊天？

------

常见选项说明

| 选项             | 说明                       |
| ---------------- | -------------------------- |
| **Telegram**     | 推荐✅ 最容易设置，新手友好 |
| **Discord**      | 适合游戏/社群用户          |
| **Slack**        | 适合工作场景               |
| **飞书/Lark**    | 国内企业常用               |
| **LINE**         | 日本/东南亚常用            |
| **iMessage**     | 苹果用户                   |
| **Signal**       | 注重隐私                   |
| **Skip for now** | 先跳过，以后再配置         |

这里先选择跳过「Skip for now」，因为篇幅有限，下回分解。

![image-20260306111140666](https://img.lingflux.com/2026/03/d1d97190310ba6be3e243af0b89ce93c.png)

### 5，选择是否配置技能（skills）

同样，选择NO，因为篇幅有限，下回分解。

![image-20260306111359363](https://img.lingflux.com/2026/03/2fbc070efc12fe983d83711229631147.png)



### 6，之后有一连串API配置，全NO跳过

这是在问你要不要配置一些**额外的功能插件**，每个都需要对应的 API Key：

------

| 提示                           | 功能                        | 需要什么             |
| ------------------------------ | --------------------------- | -------------------- |
| **GOOGLE_PLACES_API_KEY**      | 地图/地点搜索（Google地图） | Google Cloud API Key |
| **GEMINI_API_KEY**             | 用 Gemini AI 模型           | Google AI Studio Key |
| **NOTION_API_KEY**             | 连接你的 Notion 笔记        | Notion 集成 Token    |
| **OPENAI_API_KEY (image-gen)** | AI 生成图片（DALL-E）       | OpenAI API Key       |
| **OPENAI_API_KEY (whisper)**   | 语音转文字                  | OpenAI API Key       |
| **ELEVENLABS_API_KEY**         | AI 语音合成（文字转语音）   | ElevenLabs Key       |

------

怎么处理？**现在直接全部选 No/跳过就好**，原因：

- 这些都是可选功能，不影响基本使用
- 没有对应账号的话强行填也用不了
- 之后随时可以回来配置

![image-20260306111518497](https://img.lingflux.com/2026/03/66c6830490fd101cd8bc45b7b3bf041c.png)

### 7，**Hooks 是自动化触发器**，当特定事件发生时自动执行某些操作。

| 选项                      | 作用                                         |
| ------------------------- | -------------------------------------------- |
| **Skip for now**          | 全部跳过                                     |
| **boot-md**               | 启动时自动加载某些指令/提示词                |
| **bootstrap-extra-files** | 启动时自动加载额外文件                       |
| **command-logger**        | 记录所有操作日志                             |
| **session-memory**        | 发 `/new` 或 `/reset` 时自动保存当前对话记忆 |

------

建议**只勾选 `session-memory`** 就够了，最实用，能让 AI 记住之前聊过的内容。

其他的初次使用先跳过，之后熟悉了再开启。

用**空格键勾选**，回车确认。

![image-20260306111717358](https://img.lingflux.com/2026/03/ef24d76177a3e999293f7e0da00389da.png)



### 8，用哪种方式来启动和使用你的机器人：

- **Hatch in TUI**：在终端里直接用，命令行界面。
- **Open the Web UI**：（推荐）在浏览器里打开网页界面操作。
- **Do this later**：稍后再说。

这里选择「Open the Web UI」，选择并回车

![image-20260306112107760](https://img.lingflux.com/2026/03/3244eb382e44133d4cc81f6ec18e57af.png)

这时候，浏览器会自动弹出OpenClaw的Web UI 界面，

## 和你的小龙虾（OpenClaw）第一次对话

![image-20260306112419909](https://img.lingflux.com/2026/03/f40a3a5c08362eecb739689dbcba3139.png)

见到OpenClaw 有回应则表示，现在你已经安装成功，并且正常运行中。

恭喜！

但是现在，你养的小龙虾只能嗷嗷待哺，没有手脚，你让它干嘛干嘛不成（打不开浏览器，改不了文件）。

![image-20260306113036590](https://img.lingflux.com/2026/03/833a2ec19f73a2caab5a9aeb5138a0d2.png)





## 配置操作浏览器和文件操作权限

请注意：以下的操作会让你的OpenClaw提升使用权限，请详细阅读相关内容，保持学习。

### OpenClaw控制浏览器有2个模式

1，（独立模式）使用openClaw内置的浏览器，完全隔离本地系统，有独立的登陆信息。

2，（扩展模式）使用本地Chrome浏览器，安装openclaw browser Relay扩展插件，共用本地的登陆信息。

>  本次例子演示的是使用**扩展模式**，使用本地Chrome浏览器



### 找到OpenClaw gateway token KEY

OpenClaw gateway token KEY 要好像密码那样对待，好好保管。

获取OpenClaw gateway token KEY的方法有以下2个：

#### 1，直接在配置文件中找打

macOS的配置文件在用户目录下，隐藏文件，需要显示隐藏文件才能找到`.openclaw`文件夹，打开进入打开openclaw.json文件，里面在「geteway」那段中找到token

![image-20260306122344215](https://img.lingflux.com/2026/03/537f4f44ca08c446ef9ede6549ddb90d.png)

#### 2，在Web UI中查看 （这个方法最简单）

点击「Overview」，在「Gateway Token」下就是，非常简单可以看到。

![image-20260306122950056](https://img.lingflux.com/2026/03/54be336e2aaa6342c1289fc5370c270a.png)





### 1，Chrome安装浏览器接管插件

在Chrome的插件市场（https://chromewebstore.google.com/）搜索「OpenClaw Browser Relay」

（截稿的时候已经到了v2.7版本），并安装。（注意，现在很多OpenClaw Browser 请看清楚，别安装错了）

安装完成则会弹出一个页面，要你输入token KEY 验证，这里输入的是OpenClaw的gateway token KEY，不是AI API KEY不要搞错。

设置完即可，顺便可以置顶显示该插件，方便操作。（等下还要手动操作的，记住了）

![image-20260306114923386](https://img.lingflux.com/2026/03/9b0e0c0e5bc27812210d0b9886a1962d.png)



### 2，开启开发者模式

浏览器再次输入 chrome://extensions/ ，回车，进入插件管理页，在页面的右上角有一个开关「Developer mode」(开发者模式)，检查是否已经启用，如果没有启用的请启用。



### 3，配置OpenClaw 支持浏览器和文件操作

使用CLI配置，打开终端（命令行工具），输入以下命令：

```bash
# 把openclaw的权限提升 coding 级别
openclaw config set tools.profile coding

# 确保浏览器功能开启
openclaw config set browser.enabled true

# 切换到系统 Chrome（这就是“系统默认 Chrome”的官方方式）
openclaw config set browser.defaultProfile "chrome"

# 清空 allowlist（让 coding profile 自动暴露正确文件工具，这是关键！）
openclaw config set tools.allow '[]' 

# 配置完成，重启openclaw gateway（必做）
openclaw gateway restart
```

如下图显示：

![image-20260306113653129](https://img.lingflux.com/2026/03/02f6c0258cc846cf7699cd372bbb8a03.png)

重启完之后。。。

1，打开浏览器，随便访问一个页面，例如 https://lingshunlab.com ，然后点击刚才安装的插件，那个龙虾，点击距会显示「ON」的小标记，表示工作正常。

![image-20260306124413421](https://img.lingflux.com/2026/03/4ef9d1f4eb78a3ca6b2463ed0e809f89.png)

2，进入OpenClaw Web UI 页面，进行「Chat」对话，但对话前请先「New seesion」，然后发送类似「浏览器打开bilibili.com」。

一切正常的话，这个时候，浏览器就会自动打开bilibili的网址。

![image-20260306123830087](https://img.lingflux.com/2026/03/7580e05a2df8e32d72a7370d3fa964a5.png)

此时，你也可以试试文件操作的功能，发送类似「帮我在用户目录下创建一个文件，测试创建文件的功能」，小龙虾就能帮你成功创建一个文件，

![image-20260306124032376](https://img.lingflux.com/2026/03/3532062bde99391b12d64eb1c8e2de3b.png)



一切正常，恭喜但是。。。感觉到有点恐怖了吧，万一。。。

所以我需要把文件操作的权限保留在「workspace」工作空间目录中，而这个工作空间目录在哪里？可以查看openclaw.json配置，也可以在Web UI 的 「Agents」的「Overview」查看到。

![image-20260306125311134](https://img.lingflux.com/2026/03/6b0ba79477058ff2819ac69caca95fb3.png)



### 4，限制文件操作仅在工作空间目录

使用CLI配置的方式，打开终端（命令行工具），输入以下命令：

```bash
# 配置文件操作仅在工作空间目录
openclaw config set tools.fs.workspaceOnly true 
```

重启gateway即可

```bash
openclaw gateway restart
```





## 结语

现在，龙虾已经有手了。

它可以打开浏览器、点击页面、在你划定的工作区里读写文件——这听起来简单，但背后能做的事其实非常多。

下一篇，我会演示怎么把它接入飞书，这样不管你在哪，都能远程"云养虾"。

感兴趣的话，关注我的频道，我会持续更新：

- 🎬 **YouTube**：[lingshunlab](https://www.youtube.com/@lingshunlab)
- 📺 **Bilibili**：[凌顺实验室](https://space.bilibili.com/456183128)



## 参考

### **`tools.profile`** 权限

https://docs.openclaw.ai/tools#tool-profiles-base-allowlist

OpenClaw（2026.3.2 及近期版本）中的 **`tools.profile`** 是工具权限的**基础预设（base allowlist）**，这个配置项**强烈影响安全性**：新安装默认是 `"messaging"`（从 2026.3.x 开始的重大安全升级），旧版本很多用户习惯的 broad/coding 现在需要显式设置。

### 权限对比（核心差异一览）

| 维度                                            | minimal               | messaging                 | coding                                     | full                  |
| ----------------------------------------------- | --------------------- | ------------------------- | ------------------------------------------ | --------------------- |
| **文件操作** (fs.read/write/edit/apply_patch)   | ✗ 完全禁止            | ✗ 禁止                    | ✓ 允许（可进一步用 fs.workspaceOnly 限制） | ✓ 允许                |
| **Shell 执行** (exec/runtime/process)           | ✗ 禁止                | ✗ 禁止                    | ✓ 允许（可加 approvals.exec 审批）         | ✓ 允许                |
| **浏览器** (browser)                            | ✗ 禁止                | ✗ 禁止                    | ✓ 允许                                     | ✓ 允许                |
| **消息/会话管理** (sessions_*, messaging group) | 只允许 session_status | ✓ 完整支持                | ✓ 完整支持                                 | ✓ 完整支持            |
| **图像/内存工具** (image, memory_*)             | ✗ 禁止                | ✗ 禁止                    | ✓ 部分支持                                 | ✓ 完整支持            |
| **其他高危工具** (cron, gateway, nodes 等)      | ✗ 禁止                | ✗ 禁止                    | ✗ 大部分禁止（需 allow）                   | ✓ 可能开放            |
| **默认新安装**                                  | ✗ 不默认              | ✓ 是（2026.3.x 重大变更） | ✗ 需要手动设置                             | ✗ 需要手动设置        |
| **推荐人群**                                    | 极致安全、只聊天      | 普通用户、新手、聊天为主  | 开发者、代码/文件重度用户                  | 测试、POC、信任模型时 |

### 

### browser常用命令列表

https://docs.openclaw.ai/tools/browser


