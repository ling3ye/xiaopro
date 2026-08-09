---
title: '在 Mac 上从零征服 CH32V307：从"编译出一堆 Windows 病毒"到"灯会亮、嘴会说"的踩坑全记录'
domain: hardware
platforms: ["mac"]
format: "tutorial"
date: 2026-08-08
intro: "在 Mac 上从零搭 CH32V307 开发环境，装完 PlatformIO 平台却发现工具链塞给你一堆 Windows 的 .exe？这篇照着真实踩坑过程原样记录：手动换成 macOS 原生 RISC-V 工具链、解除 Gatekeeper 隔离、打通板载 WCH-Link 烧录，一路挖到「编译烧录都成功，串口有输出、灯却死活不亮」的真正根因——板载 LED 出厂压根没接 MCU。所有命令和报错都是实跑出来的，遇到的 10 个坑一个不漏全摆出来，给从 Arduino/ESP 转过来的你提前打预防针。"
tags: ["CH32V307", "CH32V macOS 开发", "PlatformIO", "WCH-Link", "沁恒 WCH", "RISC-V 单片机", "嵌入式 macOS 开发"]
image: https://img.lingflux.com/2026/08/d9106f173bc51c93033527dd5e206b04.png
---

> 凌顺实验室 · 嵌入式踩坑系列
>
> 硬件：**CH32V307V-EVT-R1**（板载 WCH-Link 调试器，沁恒 RISC-V 芯片）
> 系统：**macOS（Apple Silicon, arm64）**
> 工具：VSCode + PlatformIO
> 目标：把开发环境从 0 搭起来，点亮一颗 LED，并让串口说话——嵌入式圈子里公认的"Hello World"

## 写在前面：为什么会有这篇文章

先交代一下写这篇文章的"人设"，免得你读到后面看到我某些操作，会忍不住嘀咕"这人到底写没写过单片机"——

我玩 Arduino 和 ESP-IDF 算有些年头了，点灯、连 WiFi、跑 MQTT 早就形成了肌肉记忆，闭着眼都能把一颗 LED 点亮。所以刚拿到这块 CH32V307 时，我心里盘算的是："不就是换颗芯片嘛，点个灯能有多难？"

结果被现实结结实实上了一课。CH32 这套生态的"出厂设定"，跟 Arduino、ESP 那种"插上就烧、写对就亮"的世界观，根本不是同一个画风：

- **烧个程序还得请专门的烧录器出场**：Arduino、ESP32 一根 USB 线把供电、烧录、串口三件事全包了；CH32 这边却塞给我一个叫 **wlink** 的板载调试器，光是搞懂"它凭什么能把固件刷进芯片"，就绕了好几圈。
- **板载 LED 居然没接到 MCU 上**：Arduino 的板载灯焊死在 13 脚，`digitalWrite(13, HIGH)` 一下就亮；这块板子的用户 LED……**出厂就是断头的，压根没连到任何引脚**，得我自己拿根杜邦线飞过去，灯才肯赏脸亮一下。
- **串口也得认准了门**：ESP32 插上就是 USB 串口，所见即所得；CH32 默认走的却是调试器虚拟出来的 USART1，端口没对上就是一片死寂，逼着你对着空空荡荡的监视器怀疑板子是不是坏了。

那一刻我算是真切体会到了什么叫"老兵翻车"——点了十几年的灯，居然在一块 RISC-V 单片机上卡到怀疑人生，差点以为自己这些年学的嵌入式都喂了狗。

所以这不只是一篇"教程"，更是一个 Arduino/ESP 老用户第一次玩 CH32 的**踩坑日记**。我那些在熟手看来离谱至极的低级失误，全都会原样摆出来——因为对一个同样从 Arduino/ESP 转过来的你来说，它们大概率会原样踩一遍。提前打个预防针，后面的坑你会觉得格外亲切。

---

唠完人设，说回正题。如果你搜"CH32V307 + Windows"，能搜到官方的 MounRiver Studio，装上就能用；搜"CH32V307 + Linux"，官方工具链也伺候得明明白白。

但你要是搜"CH32V307 + macOS"……大概率会陷入沉默。资料七零八落，还全是暗坑。这块芯片本身其实很争气——32 位 RISC-V 内核，最高 144MHz，性价比吊打一众 ARM 单片机——可就是在 Mac 上"没人疼没人爱"。

这篇文章就是我在 Mac 上从零搭建 CH32V307 开发环境，一路踩坑、一路填坑，最终点亮 LED + 打通串口的全过程记录。**我不会跳过任何一个坑**，因为你大概率也会踩到同样的坑，把它们都摆出来，你能少走很多弯路。具体代码我放在了 GitHub 上（链接见文末），这篇文章负责把"为什么这么做"讲透。

先剧透一下最终效果：编译成功、烧录成功、板子上的 LED 以固定节奏一闪一闪，串口监视器里同步刷出：

```
CH32V307 booted, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

从"什么都没有"到这个画面，中间踩了至少 **8 个坑**。往下看，一个都不会漏。

### 目录

- [一、认识一下主角：CH32V307V-EVT-R1](#一认识一下主角ch32v307v-evt-r1)
- [二、总体思路：这套工具链长什么样](#二总体思路这套工具链长什么样)
- [三、开工：从装 VSCode 到认识 pio 命令](#三开工从装-vscode-到认识-pio-命令)
- [四、安装 CH32V 平台（以及第一个小坑）](#四安装-ch32v-平台以及第一个小坑)
- [五、大坑现场：为什么装出来一堆 .exe](#五大坑现场为什么装出来一堆-exe)
- [六、解坑：换成 macOS 原生工具链](#六解坑换成-macos-原生工具链)
- [七、解除 Gatekeeper 隔离](#七解除-gatekeeper-隔离不然会被-macos-当成病毒拦下)
- [八、验证工具链真的能跑](#八验证工具链真的能跑)
- [九、创建第一个项目：认识 platformio.ini](#九创建第一个项目认识-platformioini)
- [十、第一次编译](#十第一次编译)
- [十一、把 pio 配成全局命令](#十一把-pio-配成全局命令)
- [十二、硬件连接与烧录](#十二硬件连接与烧录)
- [十三、坑①：串口一片死寂](#十三坑编译烧录都成功串口却一片死寂)
- [十四、坑②：灯死活不亮（全文最大的坑）](#十四坑全文最大的坑串口都会说话了灯却死活不亮)
- [十五、跑通之后的完整代码](#十五跑通之后完整的-mainc-长什么样)
- [十六、踩坑总结表](#十六踩坑总结表)
- [十七、命令 & 文件路径速查](#十七关键命令--文件路径速查)
- [十八、建立自己的"CH32 开发逻辑"](#十八建立自己的ch32-开发逻辑以后拿到新项目直接抄作业)
- [十九、常见问题 FAQ](#十九常见问题-faq)
- [二十、下一步方向](#二十跑通之后还能继续玩什么)
- [二十一、参考资料](#二十一参考资料)

---

## 一、认识一下主角：CH32V307V-EVT-R1

开工之前，先花两分钟认识一下这块板子，因为后面 90% 的坑都跟它的"个性"有关。

| 特征 | 说明 |
| --- | --- |
| 主芯片 | CH32V307VCT6，沁恒 QingKe V4F 内核，32 位 RISC-V，主频最高 **144MHz**，LQFP80 封装 |
| Flash 实际容量 | **288KB**（但 PlatformIO 默认按 256KB Flash + 64KB SRAM 编译，后面会解释为什么不用改） |
| 板载调试器 | **WCH-Link**（其实是用一颗 CH32V305 芯片"客串"实现的，效果等同官方的 WCH-LinkE） |
| USB 接口 | 一根 USB-C 搞定供电、调试、虚拟串口三件事 |
| 用户 LED | LED1、LED2 两颗——**⚠️ 默认是悬空的，没接到 MCU 上！**（这是本文最大的坑，第十四章重点讲） |
| 用户按键 KEY | 同样默认悬空 |
| 电源指示灯 | 1 颗，通电就常亮，跟你的代码毫无关系——很多人一上电看到这颗灯亮，还以为"点灯成功了"，其实它只是个电源灯而已 |

板子上还有个容易被忽略的细节：板载调试器芯片（CH32V305）和目标芯片（CH32V307）之间，出厂时用 **4 个跳帽**（丝印分别是 `RX1-TX0`、`TX1-RX0`、`DIO-DIO0`、`CLK-CLK0`）桥接在一起，负责把调试器的 SWIO 信号和串口信号"过桥"到目标芯片。

> ⚠️ **这 4 个跳帽出厂就接好了，千万别手贱拔掉**。拔了轻则烧不进程序，重则串口直接失联，你会以为自己代码写错了，其实是硬件断了路——排查半天最后发现是跳帽的事，会很崩溃，别问我怎么知道的。

好，认完人，开始搭环境。

---

## 二、总体思路：这套工具链长什么样

先上一张"全家福"，搞清楚各个组件谁管谁：

```
┌──────────────────────────────────────────────────────────┐
│  VSCode + PlatformIO IDE 扩展（GUI：编译/烧录/调试/串口）   │
│                          │                                │
│                   PlatformIO Core（pio 命令行）             │
│                          │                                │
│            ┌─────────────┴──────────────┐                 │
│       ch32v 平台（社区维护：Community-PIO-CH32V）│          │
│            │                             │                 │
│   ┌────────┼─────────┬───────────┐       │                 │
│ toolchain  wlink    openocd    board     │                 │
│(RISC-V GCC)(烧录工具)(调试工具) (板级定义)│                 │
└──────────────────────────────────────────┘
                     │ USB
        CH32V307V-EVT-R1（板载 WCH-Link）
```

![](https://img.lingflux.com/2026/08/73dff7f41fe1d3c38d06447b98a39f2b.png)

**一句话讲清楚**：VSCode 的 PlatformIO 插件是前端界面，真正干活的是命令行工具 `pio`；`pio` 又依赖一个叫 `Community-PIO-CH32V` 的社区平台，这个平台把"编译器（toolchain）+ 烧录工具（wlink）+ 调试工具（openocd）+ 板子参数（board）"打包在了一起，理论上装一次就能用。

这个社区平台其实相当豪华，原生支持 CH32V003/103/203/30x 全系列，还提供 WCH 官方外设库（noneos-sdk）、FreeRTOS、RT-Thread、Arduino、ch32fun 等好几种开发框架可选。

但——這裡就是全文最大的转折——**这个平台默认是按 Windows 用户的习惯配置的**，macOS 用户装完之后大概率会傻眼。具体怎么个傻眼法，马上揭晓。

---

## 三、开工：从装 VSCode 到认识 pio 命令

### Step 0：确认基础环境

打开终端，先摸个底：

```bash
python3 --version          # 需要 3.x
brew --version              # Homebrew，非必需但强烈建议装
uname -m                    # Apple Silicon 应输出 arm64，Intel Mac 输出 x86_64
```

然后装 VSCode + PlatformIO 扩展：

1. 去 https://code.visualstudio.com/ 下载装上 VSCode；
2. 打开 VSCode，左侧「扩展」图标 → 搜索 `PlatformIO IDE` → Install；
3. 装完扩展会自动往 `~/.platformio/` 目录里下载 PlatformIO Core 本体（几百 MB，还带一个独立的 Python 虚拟环境），右下角会显示进度条，耐心等几分钟。

装完之后左边栏会冒出一个蚂蚁图标，这就是 PlatformIO 的 Logo（他家的吉祥物真的是蚂蚁）。

### Step 1：找到藏起来的 pio 命令

扩展装好之后，命令行工具 `pio` 其实已经存在了，只是没有加进系统 PATH，你直接在终端敲 `pio` 是找不到的。它实际躺在这里：

```bash
~/.platformio/penv/bin/pio
```

验证一下：

```bash
~/.platformio/penv/bin/pio --version
# PlatformIO Core, version 6.1.19
```

为了后面敲命令方便，先设个临时变量（只在当前终端窗口生效）：

```bash
PIO=~/.platformio/penv/bin/pio
```

本文后面所有命令里的 `$PIO`，说的都是这个路径。等一切搞定后，我们会在第九步把它配成全局命令，以后直接敲 `pio` 就行。

---

## 四、安装 CH32V 平台（以及第一个小坑）

用 PlatformIO 的包管理命令装社区平台：

```bash
$PIO pkg install -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git
```

这一步有两个很容易翻车的细节：

> **坑①：组织名容易打错。** 正确的 GitHub 组织名是 `Community-PIO-CH32V`（注意中间带了 **PIO** 三个字母，而且是大写）。网上不少老文章、老帖子写的是 `community-ch32v`（少了 PIO），照着敲会得到一个非常挫败的报错：
> ```
> remote: Repository not found.
> ```
> 一定要原样抄 `Community-PIO-CH32V`。

> **坑②：命令用老了。** 早期教程喜欢写 `pio platform install ...`，这个命令在新版 PlatformIO 里已经**废弃**，会提示 `This command is deprecated`。现在统一用 `pio pkg install -g -p <地址>` 这种写法。

命令跑起来后会依次拉取平台本体、RISC-V 工具链、openocd、wlink 四个包，看着一切正常，日志也没报错。**但请先别急着开香槟**——真正的大坑还在后面。

---

## 五、大坑现场：为什么装出来一堆 `.exe`

这是本文含金量最高的一节，也是绝大多数 macOS 用户会在这里卡住、然后怀疑人生的地方。

平台装完后，我们检查一下实际下载到本地的工具链长什么样：

```bash
ls ~/.platformio/packages/toolchain-riscv/bin/ | head
# riscv-none-embed-addr2line.exe
# riscv-none-embed-ar.exe
# riscv-none-embed-as.exe
# ...
```

再检查一下烧录工具 wlink：

```bash
file ~/.platformio/packages/tool-wlink/wlink.exe
# PE32 executable (console) Intel 80386, for MS Windows
```

看到没有，全都是 **`.exe`**——地地道道的 Windows PE32 二进制文件，在 macOS 上就是一堆废铁，双击都点不开，更别说编译代码了。第一次看到这个结果的心情，大概就是："我人在 Mac，你却给我发 Windows 的东西，什么意思？"

### 挖根因：问题出在 `platform.json`

翻开这个平台的配置文件看看：

```bash
cat ~/.platformio/platforms/ch32v/platform.json | python3 -m json.tool | grep -A3 toolchain-riscv
```

结果是这样的：

```json
"toolchain-riscv": {
  "type": "toolchain",
  "owner": "platformio",
  "version": "https://github.com/Community-PIO-CH32V/toolchain-riscv-windows.git"
}
```

**真相大白**：这个平台的配置文件把工具链来源**写死**成了 `toolchain-riscv-windows.git`，烧录工具 wlink 同样被写死成了 `#windows` 分支。PlatformIO 安装的时候不会智能判断"你用的是什么系统"，配置文件写啥就装啥，一视同仁地把 Windows 版本发给所有人——包括我们可怜的 Mac 用户。

**好消息是**：同一个 `Community-PIO-CH32V` 组织其实早就做好了 macOS 原生版本的仓库，只是没有被设成默认值而已。既然根因已经摸清，对应的填坑操作也就顺理成章——**手动把这两个 Windows 包换成 macOS 原生版**就行。具体怎么换、每步注意什么，下面这一章就是实操步骤。

---

## 六、解坑：换成 macOS 原生工具链

### 6.1 替换 RISC-V 编译器

先删掉错误的 Windows 版：

```bash
rm -rf ~/.platformio/packages/toolchain-riscv
```

再装 macOS 原生版本：

```bash
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/toolchain-riscv-mac.git
```

安装成功会提示类似这样的信息：

```
Tool Manager: toolchain-riscv@1.80200.190731+sha.99cb62f has been installed!
```

装好之后可以确认一下，它的 `package.json` 里写着 `"system": ["darwin_x86_64", "darwin_arm64"]`，说明这就是给 macOS 用的，包名还是 `toolchain-riscv`，能无缝顶替掉原来那个 Windows 版本。

> **为什么这一步要用 `main` 分支，而不是看起来更新的 `gcc12` 分支？**
>
> 这里有个很隐蔽的技术细节。平台的构建脚本（`builder/main.py`）里有这么一段逻辑：
> ```python
> is_gcc_12 = platform.get_package_version("toolchain-riscv").split(".")[1].startswith("12")
> compiler_triple = "riscv-wch-elf" if is_gcc_12 else "riscv-none-embed"
> ```
> 翻译成人话就是：脚本会看你装的工具链**版本号的第二段**，如果是 `1.8.x` 这种，就认定你用的编译器可执行文件前缀是 `riscv-none-embed-gcc`；如果是 `1.12.x`，就认定前缀是 `riscv-wch-elf-gcc`。这两套前缀对应的是完全不同的可执行文件名，选错了，构建脚本调用的命令在磁盘上根本找不到，直接报错。
>
> `main` 分支装出来的版本号恰好是 `1.80200.190731`（对应 gcc 8.2.0），跟平台原本写死的 Windows 版本号是一致的，触发的是 `riscv-none-embed` 这条路，跟脚本原本的预期完全吻合，零风险，最稳。

安装好之后有个细节要注意：

> ⚠️ **这个 gcc8 版本的编译器，本体其实是 x86_64 架构**，也就是给 Intel Mac 编译的，不是 Apple Silicon 原生的 arm64。原因很简单：xPack（工具链的上游打包方）在 gcc8 那个年代根本还没出 arm64 版本的构建。所以在 M 系列芯片的 Mac 上，这个编译器是靠 **Rosetta 2** 转译运行的。听着好像不够"原生"，但实测编译完全正常，不用有心理负担，第一次运行系统会提示装 Rosetta，装上就完事了。

### 6.2 替换烧录工具 wlink

同样的操作，把 Windows 版 wlink 换成 macOS 原生版：

```bash
rm -rf ~/.platformio/packages/tool-wlink
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_arm64
```

> 如果你用的是 Intel 芯片的老 Mac，分支名换成 `mac_x64`：
> ```bash
> $PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_x64
> ```

装好后提示：

```
Tool Manager: tool-wlink@0.23.241116+sha.0c802d4 has been installed!
```

> **openocd 不用管，它是正常的。** `openocd`（调试用的那个工具）来自 PlatformIO 官方注册表，不是从 `Community-PIO-CH32V` 直接拉的，注册表本身就有按操作系统自动匹配架构的能力，所以在 Apple Silicon 上装出来已经是 arm64 原生版了，可以验证一下：
> ```bash
> file ~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd
> # Mach-O 64-bit executable arm64  ✅ 放心，这个没问题
> ```

### 6.3 重要修正：最终稳定可用的其实是 gcc12 / arm64 原生版

写到这里必须插一句大实话，而且是一次**自我修正**：上面 6.1 节那段"为什么要用 main 分支（gcc8）"的推理，是我早期单纯读平台构建脚本代码得出的**理论判断**——脚本逻辑本身没错，但"应该装哪个版本才稳"这件事，光看代码猜是不够的，最后还是得拿真机编译、烧录、跑通了才算数。

**把实际上板测试、编译、烧录全部跑通的最终环境倒查一遍，结果是：真正稳定好用、而且是 Apple Silicon 原生 arm64（完全不需要 Rosetta 转译）的版本，其实是 gcc 12.2.0，可执行文件前缀 `riscv-wch-elf-gcc`。** 之前担心的"gcc12 分支容易踩雷、对应可执行文件可能不存在"，实测下来并不成立——这一版工具链不仅存在，而且是这套编译器里最完整、最新、跑得最顺的一版，还额外自带了 GDB 调试器，一次装齐。

所以结论反过来了：**如果你现在要装，请直接以 gcc 12.2.0 / arm64 原生 / `riscv-wch-elf-gcc` 这套为目标**，前面 6.1 节里 gcc8/x86_64 靠 Rosetta 跑的那条路，当作"万一你装出来是这个版本，也不用慌，一样能用"的兜底说明保留即可，不必刻意去追求。

之所以把这段"猜错了又改回来"的过程完整地留在文章里，而不是悄悄改掉当作没发生过，是因为这本身就是个挺有价值的经验：**读构建脚本、看版本号规律，能帮你理解"为什么会这样"，但"到底该装哪个版本"这种结论性的判断，最终还是要靠真实编译、烧录跑一遍去验证，光靠代码推理可能会得出过于保守的结论。**

### 6.4 最终确认环境：完整技术规格

下面这份是把实际编译上传成功的那套环境，事无巨细地扒了一遍拿到的完整信息，建议直接把这套配置当成目标去对照：

| 类别 | 组件 / 字段 | 值 |
| --- | --- | --- |
| 编译器 | 名称 | xPack GNU RISC-V Embedded GCC（**WCH 定制版**，与 MounRiver Studio 随附的是同一套） |
| 编译器 | 可执行文件名 | `riscv-wch-elf-gcc`（整套工具统一前缀 `riscv-wch-elf-`） |
| 编译器 | GCC 版本 | **12.2.0** |
| 编译器 | 目标三元组（target triple） | `riscv-wch-elf` |
| 编译器 | 构建/运行宿主（host） | `aarch64-apple-darwin23.6.0`（**Apple Silicon 原生**，不经过 Rosetta） |
| 编译器 | 默认 ABI | `ilp32`（32 位、软浮点调用约定） |
| 编译器 | 默认 ARCH | `rv32imac`（I 整数 / M 乘除 / A 原子 / C 压缩指令） |
| 编译器 | ISA spec | 2.2，启用 multilib |
| 编译器 | 线程模型 | single（裸机，无操作系统） |
| 编译器 | C 标准库 | **newlib 4.2.0**（`printf` 这些标准库函数就是它提供的实现） |
| 编译器 | binutils（汇编器/链接器套件） | **GNU binutils 2.38**（`as`、`ld.bfd`、`objcopy` 都来自这里） |
| 编译器 | 调试器 | 工具链里已经自带 `riscv-wch-elf-gdb`，不用额外装 |
| 编译器 | 二进制路径 | `~/.platformio/packages/toolchain-riscv/bin/` |
| 编译器 | sysroot | `~/.platformio/packages/toolchain-riscv/riscv-wch-elf/` |
| 编译器 | PIO 包名 / 包版本 | `toolchain-riscv` @ `1.120200.220829` |
| 编译器 | 来源 | xPack（`riscv-none-elf-gcc-xpack`），基于上游 GCC 12.2.0 构建 |
| 编译环境 | PlatformIO Core | 6.1.19 |
| 编译环境 | 平台 platform-ch32v | 1.1.0（Community-PIO-CH32V 维护） |
| 编译环境 | 框架 framework-wch-noneos-sdk | 2.30000.0（WCH 标准外设库，裸机） |
| 编译环境 | 构建系统 | PlatformIO 内置（基于 SCons + Python） |
| 编译环境 | 目标芯片 | CH32V307VCT6，ChipID `0x30700568`，QingKe V4F @144MHz |
| 上传环境 | 上传工具 | **wlink 0.1.1**（当前实际在用；PIO 包 `tool-wlink` @ `0.23.241116`） |
| 上传环境 | 上传协议 | `wlink`（对应 `platformio.ini` 里的 `upload_protocol` 配置） |
| 上传环境 | 调试器固件 | WCH-Link v2.18 (v38)，硬件基于 CH32V305 |
| 上传环境 | 备选：OpenOCD | `0.11.0+dev-snapshot`（2026-02-28），PIO 包 `2.1100.260228` |
| 上传环境 | 备选：wchisp | `0.2.3`，PIO 包 `0.23.240914` |
| 上传环境 | 备选：minichlink | `0.1.0` |

> 注意区分：**编译器实际版本是 GCC 12.2.0**；`1.120200.220829` 是 PlatformIO 自己给这个包打的编号（大致是 `1.` + `12.2.0` + `0` + 打包日期 `220829` 拼出来的），不是编译器本身的版本号，两者别搞混了。

**完整工具链套件**（全部统一带 `riscv-wch-elf-` 前缀，一共 30 个可执行文件，装一次全齐）：

- **编译链接常用**：`gcc` `g++` `c++` `cpp` `ld` `ld.bfd` `as`
- **二进制处理**：`objcopy` `objdump` `readelf` `nm` `size` `strip` `strings` `addr2line`
- **归档工具**：`ar` `ranlib` `gcc-ar` `gcc-nm` `gcc-ranlib`
- **调试/分析**：`gdb` `gdb-py3` `gprof` `gcov` `gcov-tool` `gcov-dump`
- **其他**：`gfortran` `elfedit` `c++filt` `lto-dump`

这份清单平时用不上背，留着当字典查就行——比如以后要看某个函数编译后占了多少体积，直接找 `riscv-wch-elf-size`；要反汇编看生成的指令，用 `riscv-wch-elf-objdump -d`；这些工具全都已经在你装好工具链的那一刻，安安静静地待在 `~/.platformio/packages/toolchain-riscv/bin/` 里了。

### 6.5 编译器版本追踪与升级：去哪看最新版、怎么升级

工具链不是装一次就一劳永逸的，社区版本一直在更新。但要搞懂"怎么追最新版"，得先认清一个很容易绕晕人的事实：**你这套编译器其实是"三层套娃"，而且存在两个不一样的"最新版"。**

**先认清：三层结构 + 两个"最新"**

| 层 | 是什么 | 当前最新 | 更新快慢 |
| --- | --- | --- | --- |
| ① 你 PIO 里实际用的（WCH 定制版） | 带 `riscv-wch-elf` 三元组 + WCH 为 QingKe 内核打的专属补丁 | **GCC 12.2.0**（你装的就是这个） | **基本不动**，长期停在 12.2.0 |
| ② ① 的打包方 | Community-PIO-CH32V 把 ① 重新打包成 PIO 包 | 同上（release 名 `riscv-none-embed-gcc 12.2.0-3`） | 跟着 ① 走 |
| ③ 最上游（vanilla） | xPack 的通用 RISC-V GCC，**没有 WCH 补丁** | **GCC 15.2.0**（2025-10-23） | 持续更新，紧追上游 GNU GCC |

> **关键提醒**：网上常说的"社区版本一直在更新"，更新的是第 ③ 层（xPack，已到 15.2.0），不是你 CH32V 实际用的第 ① 层（WCH 定制版，还停在 12.2.0）。这两条线**不能混着追**——直接拿 xPack 15.2.0 顶替你现在的编译器，会丢掉 WCH 给 QingKe 内核加的专属补丁，CH32V 上某些特性可能就不灵了。**对 CH32V 开发，正确做法是跟 ①②，而不是盲目追 ③ 的最新。**
>
> 顺带一个小技能：你编译器的完整身份串 `riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0`，三个信息点一眼可读——`wch-elf` 是 WCH 定制标志，`xPack` 是上游打包方，`arm64` 说明是 Apple Silicon 原生版。

**怎么查自己当前装的到底是哪一版**

```bash
# 1. 看 PIO 包版本（PlatformIO 自己的编号，和编译器版本不是一回事）
pio pkg list | grep -i riscv

# 2. 看编译器完整身份（版本、目标三元组、ABI、ARCH、构建宿主全都有，最推荐记这一条）
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc -v

# 3. 看 C 库（newlib）版本——printf 就是它实现的
grep "_NEWLIB_VERSION" ~/.platformio/packages/toolchain-riscv/riscv-wch-elf/include/_newlib_version.h

# 4. 看 binutils（汇编器/链接器）版本
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-ld.bfd --version

# 5. 看 platform.json 把工具链"钉"在哪个源（决定升级时会拉哪个仓库）
grep -A3 '"toolchain-riscv"' ~/.platformio/platforms/ch32v/platform.json
```

**去哪看最新版（三个渠道，按和你相关度排序）**

- **渠道一：WCH 官方 / MounRiver（WCH 定制版的真正上游，最相关）**。`riscv-wch-elf` 这个三元组和 WCH 内核补丁，源头在 WCH 官方的 MounRiver Studio——你编译器的构建信息里写着构建路径是 `/Users/mrs/...`（mrs = MounRiver Studio），就是这个出处。官网下载页 `www.mounriver.com`（找「MounRiver Studio」和「Toolchain 工具链」），官方 SDK 仓库在 `github.com/openwch`。当前 MRS 工具链版本系列是 v1.91（Community-PIO-CH32V 的 release 说明原话就是 "Update toolchain to v1.91"）。
- **渠道二：Community-PIO-CH32V 打包版（你 PIO 实际在用的）**。它本质是把 MounRiver 的 WCH 工具链重新打包成 PlatformIO 包，盯它的 releases 就能第一时间知道 PIO 这边什么时候跟进新版：`github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`。想第一时间收到通知，页面右上角 Watch → Custom → Releases 勾上，或者订阅 RSS：`github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases.atom`。
- **渠道三：xPack 上游（vanilla，更新最快，仅供了解）**：releases 在 `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack/releases`，版本历史最全的在 `npmjs.com/package/@xpack-dev-tools/riscv-none-elf-gcc`，当前最新 15.2.0-1.1。

**怎么升级（以及一个必须躲的坑）**

```bash
# 升级整个 ch32v 平台（含框架、工具链——由 Community-PIO-CH32V 发布新版时才会真正更新）
pio pkg update -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git

# 或者只单独升级工具链这一个包
pio pkg update -g -t toolchain-riscv
```

> ⚠️ **升级时要躲的坑（呼应第十九章 FAQ 的 Q3）**：第五章挖过，`platform.json` 里把工具链来源**硬编码成了 Windows 仓库**。这意味着一旦你跑了 `pio pkg update` 或者重装平台，极有可能把你好不容易手动换好的 macOS 原生版**覆盖回 Windows 版**。真遇到了，把 6.1 / 6.2 的替换步骤再走一遍就行；想一劳永逸，就自己 fork 一份平台仓库，把 `platform.json` 改成默认指向 macOS 版，彻底根治。
>
> 再强调一遍方向：升级是为了拿到 Community-PIO-CH32V 跟进的新版 **WCH 定制工具链**，不是去追 xPack 的 15.2.0。在 PIO 里玩 CH32V，请始终以 ①②（WCH 定制版）为准。

---

## 七、解除 Gatekeeper 隔离（不然会被 macOS 当成"病毒"拦下）

macOS 有个安全机制，只要一个可执行文件是通过网络下载来的（`git clone` 也算），系统就会给它贴上一个叫 `com.apple.quarantine` 的隔离标签。这类文件如果没有经过苹果的签名认证，运行时会被直接拦截，报错通常长这样：

```
"xxx" cannot be opened because the developer cannot be verified
```

或者更简单粗暴：

```
killed: 9
```

我们刚装的编译器、烧录器都是这种"无签名、网络下载"的典型代表，所以要提前把隔离属性清掉：

```bash
xattr -dr com.apple.quarantine ~/.platformio/packages/toolchain-riscv
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-wlink
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-openocd-riscv-wch
```

> `-r` 是递归参数，会把目录下所有文件的隔离属性一并清掉；就算某个文件本来就没有这个属性，命令也不会报错，属于"先做了也不亏"的预防性操作，放心执行。

---

## 八、验证工具链真的能跑

装完之后不要急着开项目，先花十几秒确认三大件都能正常执行：

```bash
# 编译器（按第六章确认的最终版本，gcc12.2.0，arm64 原生，不需要 Rosetta）
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0

# 如果你装出来的恰好是 gcc8/x86_64 那个老版本，命令和输出对应换成：
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
# riscv-none-embed-gcc (xPack GNU RISC-V Embedded GCC x86_64) 8.2.0

# 烧录工具（原生 arm64）
~/.platformio/packages/tool-wlink/wlink --version
# wlink 0.1.1

# 调试工具（可选，原生 arm64）
~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd --version
```

> **关于 Rosetta 的小提醒**：gcc12/arm64 原生版理论上完全不需要 Rosetta。但如果你装出来的恰好是 gcc8/x86_64 那个老版本，第一次调用时系统可能会弹窗问你要不要装 Rosetta 2，点确认装上就行，这是一次性的操作，装完之后再也不会提示。只要上面的命令能正常吐出版本号，就说明环境已经打通了。

---

## 九、创建第一个项目：认识 `platformio.ini`

### 9.1 项目结构长什么样

一个最简单的 PlatformIO 项目，骨架就两个东西：

```
ch32v307-test/
├── platformio.ini      # 项目配置文件，"这个项目要用什么芯片、什么框架、怎么烧录"全写在这
└── src/
    └── main.c           # 你的固件代码，程序入口
```

用命令行建一个空项目也行（如果你更喜欢在 VSCode 里点「New Project」图形化建也完全一样）：

```bash
$PIO project init -d ~/ch32v307-test --board ch32v307_evt
```

### 9.2 逐行拆解 `platformio.ini`

这是全项目最重要的一个配置文件，每次开新项目都会打交道，所以值得逐行讲透。内容大概是这样：

```ini
[env]
platform = ch32v
framework = noneos-sdk
monitor_speed = 115200
; 板载 WCH-Link 调试器；wlink 是原生支持 macOS arm64 的烧录工具
upload_protocol = wlink

[env:ch32v307_evt]
board = ch32v307_evt
; EVT-R1 出厂默认配置: Flash 256K + SRAM 64K（与 board 默认一致，无需覆盖）
; 如需切换到 288K Flash / 32K SRAM 等其它布局，需先用 WCH 工具改 option bytes，
; 并在此取消注释同步：
; board_upload.maximum_size = 294912
; board_upload.maximum_ram_size = 32768
```

拆开一条条看：

- **`[env]`**：这是"公共配置区"，下面写的东西对所有环境（env）都生效。如果你的项目将来要同时支持好几块不同的板子，公共参数写在这里能少重复。
- **`platform = ch32v`**：告诉 PlatformIO 用哪个平台，也就是我们前面折腾了半天装好的那个 `Community-PIO-CH32V` 社区平台。
- **`framework = noneos-sdk`**：选用 WCH 官方的标准外设库（裸机开发，没有操作系统调度），这也是最经典、资料最全的入门框架，对应的包是 `framework-wch-noneos-sdk`，本文实测确认可用的版本是 `2.30000.0`。如果以后想玩多任务，把这一行换成 `freertos` 或 `rt-thread` 就行，其他配置基本不用动——这也是 PlatformIO 生态的好处之一。
- **`monitor_speed = 115200`**：串口监视器（`pio device monitor`）用的波特率。**这个数字必须和代码里 `USART_Printf_Init()` 传的参数一致**，两边对不上，串口出来的就是一坨乱码，这也是新手很常见的一个小坑。
- **`upload_protocol = wlink`**：告诉 PlatformIO 用哪个工具往板子里烧程序。可选的协议不止一个（下文第十二章会给出完整对照表），macOS arm64 用户选 `wlink` 最省心，因为它是原生支持的。
- **`[env:ch32v307_evt]`**：这是一个具体的"环境"定义，名字随便取，但习惯上会跟板子型号对应，方便管理。
- **`board = ch32v307_evt`**：指定具体的板子型号，PlatformIO 会据此加载对应的引脚定义、Flash/RAM 大小、默认时钟等一整套参数。
- **Flash/RAM 那几行注释**：这里藏着一个容易让人纠结的细节——EVT-R1 这块板子的芯片实际上有 **288KB** 的 Flash，但 `board` 默认给的却是 **256KB**。别急着去改，这不是 bug：出厂默认的 option bytes 配置就是按 256KB Flash + 64KB SRAM 划分的，跟 `board` 默认值刚好对得上，所以新手阶段完全不用动这两行注释。等你以后真的需要把 Flash 用满 288KB，才需要先用 WCH 官方工具去改芯片的 option bytes，再回来同步这两行配置——这是进阶操作，入门阶段可以先放一边。

### 9.3 读懂 PlatformIO 生成的 `main.c` 模板——建立"CH32 开发逻辑"

这一节是重点中的重点。第一次打开 PlatformIO 自动生成的 `main.c`，很多人会被开头一大坨 `#if defined(...)` 劝退，觉得"这也太复杂了吧"。别怕，我们来把它拆开看，你会发现其实没那么可怕，而且看懂这一坨，以后换任何一款沁恒芯片你都能秒懂套路。

模板开头长这样（节选）：

```c
// ① 根据编译期宏，自动挑选当前芯片对应的头文件
#if defined(CH32V003)
#include <ch32v00x.h>
#elif defined(CH32V10X)
#include <ch32v10x.h>
#elif defined(CH32V30X) || defined(CH32V31X)
#include <ch32v30x.h>
// ... 后面还有 V20X / X035 / L103 / H417 等一大串分支
#endif
#include <debug.h>   // ← 这一行是关键：提供了串口初始化、延时、printf 重定向
```

**这段代码为什么长这样？** 因为 PlatformIO 的模板是给沁恒**全系列芯片**通用的一份代码，`CH32V003`、`CH32V307`、`CH32X035`……几十款芯片共用同一份 `main.c` 骨架，靠一堆 `#if defined(...)` 在编译期自动"猜"你用的是哪款芯片，然后 `#include` 对应厂家提供的头文件。这些宏是 `platform = ch32v` + `board = ch32v307_evt` 这套配置在背后自动帮你定义好的，你不用手动写。

**对我们的 CH32V307 来说**，真正生效的其实只有两行：

```c
#include <ch32v30x.h>   // CH32V30X 系列的外设定义（寄存器、GPIO_InitTypeDef 这些都来自这里）
#include <debug.h>      // 关键的调试辅助库
```

看懂这一点之后，那一整坨 `#if defined` 就不再是"复杂逻辑"，而是"一个多选一的开关"，理解了这个套路，以后拿到任何一款 CH32 系列的新板子，看到类似的模板代码都不会慌。**这就是所谓的"CH32 开发逻辑"：先看板子对应哪个系列头文件，再看 `debug.h` 提供了哪些辅助函数。**

### 9.4 `debug.h` 里到底藏了什么

这个头文件是 WCH 官方 SDK 自带的，几乎每个 CH32 项目都会用到，提前认识一下它提供的几个函数，能少走很多弯路：

```c
void Delay_Init(void);                        // 初始化延时用的系统定时器
void Delay_Us(uint32_t n);                    // 微秒级延时
void Delay_Ms(uint32_t n);                    // 毫秒级延时
void USART_Printf_Init(uint32_t baudrate);    // 初始化 USART1，并把 printf 重定向到它
```

配套的 `debug.c`（同样是 SDK 自带，不用你自己写）里，已经实现了 C 标准库要求的底层 `_write()` 函数，并且把它接到了 USART1 上。**这意味着你完全不需要自己写重定向代码，只要调用一次 `USART_Printf_Init(115200)`，之后随便写 `printf(...)` 就能从串口看到输出**——这是很多单片机新手容易忽略、却又极其好用的一个功能，等你踩过后面那个"串口没输出"的坑，会对这行代码印象深刻。

### 9.5 一个"能编译但什么都不干"的最小示例

在深入研究 Hello World 之前，先看一个最基础的点灯代码，感受一下 CH32 GPIO 操作的基本套路：

```c
#include <ch32v30x.h>   // CH32V30X 系列头文件，由 board 配置自动决定引入哪个
#include <debug.h>

#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);   // 配置中断优先级分组（标准开局动作）
    SystemCoreClockUpdate();                          // 刷新系统时钟变量（同样是标准开局动作）
    Delay_Init();                                     // 初始化延时功能

    GPIO_InitTypeDef GPIO_InitStructure = {0};

    BLINKY_CLOCK_ENABLE;                               // ① 先给 GPIOA 外设"通电"（使能时钟）
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;           // ② 选中 PA0 这个引脚
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;    // ③ 模式：推挽输出
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;   // ④ 翻转速度
    GPIO_Init(GPIOA, &GPIO_InitStructure);              // ⑤ 把配置真正写进寄存器

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(GPIOA, GPIO_Pin_0, ledState);   // 把 PA0 电平设成 ledState
        ledState ^= 1;                                 // 电平取反，下一轮反过来
        Delay_Ms(500);                                  // 停 500ms，形成"闪烁"的观感
    }
}
```

**记住这套 GPIO 初始化的固定四步曲**，以后写任何 CH32 项目的外设初始化，都是这个套路的变体：

1. **开时钟**：STM32 系机器人（CH32 的外设库风格几乎是照抄 STM32 标准库）有个特点——所有外设默认是"断电"状态，用之前必须先用 `RCC_XXXClockCmd(...)` 手动使能对应的时钟，忘了这一步，外设就是个摆设，怎么配置都没反应。
2. **填结构体**：声明一个 `XXX_InitTypeDef` 结构体，把想要的模式、速度等参数一一填进去。
3. **调用 `XXX_Init()`**：把结构体"喂"给对应的初始化函数，参数才会真正写进芯片寄存器。
4. **在 `while(1)` 里干活**：用对应的读写函数（比如 `GPIO_WriteBit`）去操作外设。

好，理论讲完了，接下来我们真刀真枪地编译、烧录，然后你会发现——理论上没问题的代码，实操起来还是会遇到"意料之外"的坑。

---

## 十、第一次编译

万事俱备，跑一下编译：

```bash
$PIO run -d ~/ch32v307-test        # 或者 cd 进项目目录后直接 pio run
```

第一次编译会自动去下载 WCH 的 `noneos-sdk` 框架（里面是全套外设驱动源码），需要一点时间，大概 30~60 秒。编译成功的输出长这样：

```
Linking .pio/build/ch32v307_evt/firmware.elf
RAM:   [          ]   3.2% (used 2080 bytes from 65536 bytes)
Flash: [          ]   0.7% (used 1728 bytes from 262144 bytes)
Building .pio/build/ch32v307_evt/firmware.bin
========================= [SUCCESS] Took 47.36 seconds =========================
```

看到绿色的 `[SUCCESS]`，说明整条工具链——从 VSCode、到 pio、到 macOS 原生编译器——已经完全打通了，值得为自己鼓个掌。编译产物在 `.pio/build/ch32v307_evt/` 目录下：

- `firmware.elf`：带完整调试符号，调试时用；
- `firmware.bin`：纯二进制，烧录时用的就是它。

那两条进度条（RAM/Flash 占用）值得留意一下，后面加了 `printf` 功能之后，Flash 占用会明显涨一截，属于正常现象，不用慌，第十三章会具体说明为什么。

---

## 十一、把 `pio` 配成全局命令

每次都要敲一长串 `~/.platformio/penv/bin/pio` 实在麻烦，我们把它软链到系统 PATH 里的某个目录。Apple Silicon 的 Mac 上，Homebrew 默认装在 `/opt/homebrew/bin`，这个目录通常对当前用户（属于 admin 组）是可写的：

```bash
if [ -w /opt/homebrew/bin ]; then
  ln -sf ~/.platformio/penv/bin/pio /opt/homebrew/bin/pio
  ln -sf "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" /opt/homebrew/bin/code
fi
```

验证一下：

```bash
pio --version      # PlatformIO Core, version 6.1.19
code --version     # VSCode 版本号
```

> 如果你的 `/opt/homebrew/bin` 不可写（比较少见），换一个自己的可写目录，比如 `~/.local/bin`，然后把它加进 shell 的 PATH：
> ```bash
> mkdir -p ~/.local/bin
> ln -sf ~/.platformio/penv/bin/pio ~/.local/bin/pio
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
> ```
> 记得改完 `~/.zshrc` 之后，新开一个终端窗口或者执行 `source ~/.zshrc` 让配置生效。

以后本文里所有 `$PIO` 或 `~/.platformio/penv/bin/pio` 的地方，都可以直接简写成 `pio` 了。

---

## 十二、硬件连接与烧录

### 12.1 接线：插对 USB 口

EVT-R1 板上通常有两个 USB 口，**烧录调试要插连着板载 WCH-Link 的那个口**（板子丝印一般会标 DEBUG / Link / WCH-Link 字样），不是标着 USB-Device 的那个口，两个口功能完全不同，插错了设备管理器里根本看不到。macOS 自带 CDC 串口驱动，插上就能用，不需要额外装驱动，这点比 Windows 省心不少。

### 12.2 WCH-Link 的两种模式

WCH-Link 这颗调试器芯片有两种工作模式：**RV 模式**（服务 RISC-V 芯片）和 **DAP 模式**（服务 ARM 芯片）。我们的 CH32V307 是 RISC-V 内核，必须让调试器处于 **RV 模式**才能正常烧录。板子出厂一般默认就是 RV 模式；如果烧录一直失败，可以用 `wlink` 命令或者 WCH 官方工具切换模式确认一下：

```bash
# 列出当前连接的 WCH-Link 设备
pio pkg exec -- wlink list          # 或者直接敲 wlink list（前提是路径已加进 PATH）
```

### 12.3 正式烧录

**方式一：命令行**

```bash
cd ~/ch32v307-test
pio run -t upload
```

前面 `platformio.ini` 里配的 `upload_protocol = wlink` 就是在这一步生效——PlatformIO 会调用 macOS 原生的 wlink 工具，通过 WCH-Link 把 `firmware.bin` 写进芯片。

**方式二：VSCode 图形界面**

打开项目文件夹，左下角 PlatformIO 工具栏有一排图标，点那个箭头图标（Upload）就行，跟命令行效果一样，喜欢点鼠标的可以走这条路。

烧录成功时，`wlink` 会打印出调试器和芯片的详细信息，很有参考价值：

```
04:17:53 [INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
04:17:53 [INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
04:17:53 [INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
04:17:54 [INFO] Flash done
04:17:54 [INFO] Now reset...
```

第一行 `v2.18(v38)` 就是你这个 WCH-Link 调试器本身的固件版本；第三行能看到芯片实际的 Flash 容量是 288KB（呼应第九章提过的那个细节），还有芯片唯一的 UID，做产品序列化的时候可能用得上。

### 12.4 烧录协议怎么选

`board` 定义里其实支持好几种烧录协议，按需切换：

| 协议 | 底层工具 | 说明 |
|---|---|---|
| `wch-link` | openocd（`0.11.0+dev-snapshot`，PIO 包 `2.1100.260228`） | 默认协议，通过 openocd 访问 WCH-Link |
| `wlink` | wlink（工具版本 `0.1.1`，PIO 包 `tool-wlink@0.23.241116`） | **推荐 macOS 用户选这个**，原生、轻量、速度快，也是本文实际在用的协议 |
| `minichlink` | minichlink（`0.1.0`） | 社区维护的另一个轻量工具，备选项 |
| `isp` | wchisp（`0.2.3`，PIO 包 `0.23.240914`） | 走 USB Bootloader 模式烧录，需要先把 BOOT0 引脚拉高进入 bootloader，适合没有 WCH-Link 的场景 |

### 12.5 调试（下断点、单步）

在 VSCode 里直接按 **F5** 就能启动调试会话（底层是 openocd + RISC-V GDB 在配合工作），可以下断点、单步执行、查看变量和寄存器的实时值。板子对应的 SVD 寄存器描述文件（`CH32V307xx.svd`）已经在 board 配置里指定好了，所以外设寄存器的可视化查看也是开箱即用的，不用额外配置。这部分内容展开讲能再写一篇，这里先点到为止，够用就行。

---

## 十三、坑①：编译烧录都成功，串口却一片死寂

工具链打通、烧录成功之后，很多人以为大功告成，兴冲冲打开串口监视器——结果傻眼了。

### 现象

```bash
pio run              # 编译成功 ✅
pio run -t upload    # 烧录成功 ✅
pio device monitor   # 打开串口监视器 → 一片空白，鬼影都没有
```

编译没报错，烧录也确认成功了，串口监视器也确实连上了那个 `/dev/cu.usbmodem***`（也就是板载 WCH-Link 虚拟出来的那个串口设备），可就是**一个字都收不到**。这时候很容易开始怀疑波特率错了、驱动装错了、甚至怀疑板子坏了。

### 根因：其实特别简单

打开代码一看就秒懂——**PlatformIO 默认生成的那份模板代码，压根就没有初始化串口，代码里也没有任何一行 `printf`**。它单纯就是个"配置 GPIO → while 循环里翻转电平 → 延时"的纯点灯程序，从头到尾没有往串口发送过一个字节，串口收不到东西是理所当然的——不是电路坏了，是代码压根没打算跟你说话。

> 板载 WCH-Link 虚拟出来的串口（业内叫 VCP，虚拟串口），默认桥接到目标芯片的 **USART1（对应 PA9 = TX，PA10 = RX）**。硬件链路完全是通的，只是程序自己什么都没往外发。

### 解决：加上初始化 + printf

前面第九章我们已经认识过 `debug.h` 里的 `USART_Printf_Init()` 函数了，现在正式用上它，两行代码就能解决：

```c
Delay_Init();

// USART1 (PA9/PA10) 走板载 WCH-Link 的虚拟串口；SDK 的 _write 已经把 printf 重定向到这里了
USART_Printf_Init(115200);
printf("CH32V307 booted, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);
```

再在 `while(1)` 循环里补一句打印，方便实时看到程序在跑：

```c
while (1) {
    GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
    printf("LED %u\r\n", ledState);
    ledState ^= 1;
    Delay_Ms(100);
}
```

重新编译烧录，串口立刻活了：

```
CH32V307 booted, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

> **小提示**：加上 `printf` 之后，Flash 占用会从 0.7%（1728 字节）左右涨到大约 2.8%（7440 字节左右），因为 `printf` 会把整套格式化字符串的处理逻辑一起链接进固件——这是正常现象，`printf` 从来都不是"免费"的，属于用空间换调试体验，不用慌张，也不用去纠结这几 KB。

### 以后串口没输出，按这个顺序排查

把这次的经验总结成一个通用的排查清单，存起来，以后遇到类似问题直接对着查：

1. **代码里到底有没有真的调用 `USART_Printf_Init` + 真的写了 `printf`？**（本文最常见、也是最容易被忽略的一个坑，先查这个）
2. **波特率对不对？** 代码里的 `USART_Printf_Init(115200)` 要跟 `platformio.ini` 里的 `monitor_speed` 保持一致，两边随便一个改了没同步，收到的就是乱码或者空白。
3. **WCH-Link 的虚拟串口功能有没有被意外关掉？**（可以在 WCH 官方的 WCH-LinkUtility 工具里检查）
4. **你要的到底是不是"芯片自己变成 USB 串口"（USB CDC）？** 如果是，那是另外一套需要 USB 协议栈的固件方案，跟这里讲的走 USART1 + WCH-Link 桥接完全是两条不同的路，别搞混了。

---

## 十四、坑②（全文最大的坑）：串口都会说话了，灯却死活不亮

这是整个折腾过程里最让人抓狂的一个坑，因为**它跟软件几乎没关系**，纯纯的硬件设计问题，代码写得再对也无解。花点耐心看完这一节，能帮你省下至少半小时对着代码抓头发的时间。

### 现象

串口这时候已经能正常打印了（说明固件确实在正常运行，根本没有卡死、没有 HardFault），**但板子上死活看不到任何一颗 LED 在闪**。

### 根因：板载用户 LED 出厂就是"断头"的

**这块板子上的两颗用户 LED（丝印 LED1、LED2），出厂时压根就没有接到 MCU 引脚上，是纯悬空的。** 具体说，它们只有一端接了 GND，另一端就是一个孤零零的裸焊盘或者排针孔，晾在那里等你自己接线——这不是某块板子的个例质量问题，而是 WCH 官方原理图（`CH32V30xSCH.pdf`）本来就是这么设计的。

也就是说：**不管你的代码是在翻转 PC1、PD0 还是 PA0，只要没有拿一根实体的杜邦线把那个引脚接到 LED 焊盘上，LED 永远不会亮，这是一个纯硬件问题，软件代码写得再花哨也无济于事。**

这个坑还不是我一个人踩到的，能找到好几个独立信源互相印证：Zephyr 官方文档在这块板子的说明里明确写着"板载 LED 在电路设计上并没有连接到 SoC"；一篇中文的沁恒 CH32V307EVT-R1 使用说明也提到，板子上的两颗用户 LED 并没有连接到任何 GPIO 引脚，需要用户自己手动接线才能点亮。板载的用户按键 KEY 同理，也是悬空的，同样的坑还得再踩一次。

> **那块板子上唯一默认就接好、通电就亮的灯，是电源指示灯**——就是你刚插上 USB 那一刻就常亮的那颗，跟你的代码毫无关系，很容易被误认成"我点灯成功了"，其实它压根不受 MCU 控制。

### 修复：软件 + 硬件两步走

**第一步：选定要翻转的引脚**

WCH 官方自己的 GPIO 示例代码里，惯用的是 **PA0** 这个引脚，资料最全、社区讨论最多、最不容易踩额外的坑，所以我们把代码里点灯用的引脚统一对齐到 PA0：

```c
// EVT-R1 的用户 LED 默认悬空（未接 MCU），需要用一根杜邦线把 PA0 桥接到 LED1 才会亮
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)
```

> ⚠️ **一个连带的小坑**：如果你是从别的端口（比如原本模板里的 PC1）改成 PA0，**一定要记得把时钟使能那一行也同步改成 `RCC_APB2Periph_GPIOA`**。这里踩过一次实实在在的坑：只改了引脚定义、忘了把时钟使能改到对应的 GPIOA，结果就是 GPIOA 外设的时钟压根没打开，PA0 电平纹丝不动，查了半天代码逻辑，最后发现是"改一处漏一处"的典型失误。改完端口配置之后，一定要把相关的所有宏定义整体检查一遍，别只改一半。

**第二步：接一根实体的杜邦线（二选一）**

- **方案 A（用板载 LED1，WCH 官方推荐做法）**：找一根杜邦线，一头接到 **PA0**（Arduino 排母上标着 `A0` 的那个孔），另一头接到板子上丝印标着 `LED1` 的那个焊盘。焊盘的具体位置可以对照 EVT 资料包里的 `CH32V30xSCH.pdf` 原理图找。
- **方案 B（自己外接一颗 LED，最稳妥、最直观）**：找一颗普通 LED，串联一个 330Ω~1kΩ 的限流电阻，接在 **PA0 和 GND** 之间。极性接反了也没关系，因为代码是在不断翻转高低电平，正接反接总有一个方向能被点亮，唯一的区别是"哪半个周期亮"。

接好线之后，重新执行 `pio run -t upload`，LED1 会以 100ms 的节奏开始闪烁，同时串口同步刷出 `LED 0 / LED 1`，这时候才是真正意义上的"Hello World"跑通了。🎉

> **为什么 WCH 要把 LED 设计成悬空的？** 大概率是出于"给开发者更大自由度"的考虑——你可以把 LED 或按键连到你项目里任意想用的 GPIO，不被出厂焊死的某个固定引脚绑住手脚。出发点是好的，但对第一次上手的新手极其不友好，因为你打开板子的第一反应，肯定不会是"我需要先接根线才能点灯"，而是"我代码是不是哪里写错了"。

### 一个更深层的心得：先分清是软件问题还是硬件问题

这个坑真正的价值不在于"记住 PA0 要接杜邦线"这个具体细节，而在于它教会你一个嵌入式调试里通用的排查思路：

**"没反应"不等于"代码错了"。** 遇到外设没反应，第一件事应该是想办法证明"固件到底有没有真的跑到那段逻辑"，而不是一上来就死磕代码逻辑。这次能这么快定位到是硬件问题而不是代码问题，靠的就是**串口先出字了**——串口能正常打印，就说明主循环在正常跑、没有卡死在什么地方，把"软件层面工作正常"这件事先确认下来，剩下的"没反应"基本就能锁定在硬件链路上了。这也是为什么建议大家新项目第一件事就是先把串口打通——它是排除故障最快、最直观的一把尺子。

---

## 十五、跑通之后：完整的 `main.c` 长什么样

把前面两个坑的修复合起来，这是最终能正常工作的完整代码，比 PlatformIO 生成的原始模板多了串口初始化和打印语句：

```c
#include <ch32v30x.h>
#include <debug.h>

// EVT-R1 的用户 LED 默认悬空（未接 MCU），需要用一根杜邦线把 PA0 桥接到 LED1 才会亮
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void NMI_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void HardFault_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
    SystemCoreClockUpdate();
    Delay_Init();

    // USART1 (PA9/PA10) 走板载 WCH-Link 的虚拟串口；SDK 的 _write 已把 printf 重定向到这里
    USART_Printf_Init(115200);
    printf("CH32V307 booted, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);

    GPIO_InitTypeDef GPIO_InitStructure = {0};
    BLINKY_CLOCK_ENABLE;
    GPIO_InitStructure.GPIO_Pin = BLINKY_GPIO_PIN;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(BLINKY_GPIO_PORT, &GPIO_InitStructure);

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
        printf("LED %u\r\n", ledState);
        ledState ^= 1;
        Delay_Ms(100);
    }
}

void NMI_Handler(void) {}
void HardFault_Handler(void) { while (1) {} }
```

代码结尾这两个中断处理函数值得提一句：`NMI_Handler` 和 `HardFault_Handler` 是 RISC-V/ARM 单片机里非常常见的两个"异常兜底"函数，`__attribute__((interrupt("WCH-Interrupt-fast")))` 这个修饰符告诉编译器"这是个中断服务函数，请按中断的方式生成代码"（比如自动保存和恢复寄存器现场）。这里的实现很简单——`HardFault_Handler` 里直接 `while(1){}` 死循环卡住，是一种保守但有效的兜底策略：一旦程序真的跑飞、触发硬件异常，与其让芯片带着错误状态继续乱跑，不如先卡在这里，方便你接调试器进来查看当时的状态。以后项目做大了，可以在这里加上错误日志、LED 报警灯之类的逻辑，现在先知道它的作用就够了。

完整项目代码（包含 `platformio.ini`）我放在了 GitHub 上，链接见文末，可以直接 clone 下来跑。

---

## 十六、踩坑总结表

把全文所有坑集中列一遍，方便以后翻查：

| # | 现象 | 根因 | 解决 |
| --- | --- | --- | --- |
| 1 | 装平台报 `repository not found` | GitHub 组织名拼错，应为 `Community-PIO-CH32V`（带 PIO，大写） | 用正确的组织名地址 |
| 2 | `pio platform install` 提示 deprecated | 新版 PlatformIO 统一用 `pkg` 子命令 | 改用 `pio pkg install -g -p <地址>` |
| 3（核心） | 平台装好了，工具链目录里全是 `.exe`，编译必然失败 | `platform.json` 把工具链来源硬编码成 Windows 仓库，安装时不判断操作系统 | 删掉 Windows 版，手动装 `toolchain-riscv-mac` 和 `tool-wlink`（`mac_arm64`/`mac_x64` 分支） |
| 4 | 装错工具链分支，编译报编译器可执行文件找不到 | 构建脚本按工具链版本号第二段自动选编译器前缀（`1.8.x`→`riscv-none-embed`，`1.12.x`→`riscv-wch-elf`），装的版本和实际存在的可执行文件对不上 | 先用 `ls` 看清楚实际装出来的可执行文件叫什么名字，再对应使用 |
| 5 | 运行编译器/烧录器报"开发者无法验证"或 `killed: 9` | macOS 给网络下载的未签名二进制加了隔离属性 | `xattr -dr com.apple.quarantine <目录>` |
| 6 | 担心 x86_64 架构的编译器在 Apple Silicon 上"水土不服" | xPack 早期没有 arm64 构建，需要 Rosetta 2 转译 | 不是问题，装上 Rosetta 后编译完全正常 |
| 7 | 想把 `pio` 软链到 `/usr/local/bin` 失败 | 该目录由 root 拥有，普通用户没有写权限 | 改用 `/opt/homebrew/bin` 或自建 `~/.local/bin` 并加入 PATH |
| 8 | 编译、烧录都成功，串口监视器一片空白 | 模板代码只是纯点灯循环，**没有初始化串口、没有任何 `printf`** | 调用 `USART_Printf_Init(115200)`，正常使用 `printf`（SDK 已把它重定向到 USART1） |
| 9（本文最大坑） | 串口已经能正常打印了，但板上看不到任何 LED 在闪 | **板载用户 LED 出厂默认悬空，压根没接到 MCU 引脚** | 接一根杜邦线，PA0 桥接到 LED1（或者自己外接 LED + 限流电阻到 GND） |
| 10（衍生坑） | 改用 PA0 之后 LED 还是不亮 | 改端口时**漏改了对应的时钟使能宏** | 端口定义和时钟使能必须同步修改，改完整体复查一遍 |

**这次踩坑最大的收获，浓缩成一句话**：嵌入式开发里，"没反应"从来不等于"代码写错了"，先想办法分清楚是**软件问题**（固件到底有没有真的执行到那段逻辑）还是**硬件问题**（物理链路通不通、外设到底接没接）。让串口先开口说话，是排除故障最快、最省心的一步棋，永远优先把它调通。

---

## 十七、关键命令 & 文件路径速查

日常开发最常用的几条命令：

```bash
# === 编译 / 烧录 / 监视 ===
pio run                # 只编译
pio run -t upload      # 编译 + 烧录
pio device monitor      # 打开串口监视器（Ctrl+C 退出）

# === 查 WCH-Link 调试器固件版本 & 已连接芯片信息（排查连接问题时最常用）===
~/.platformio/packages/tool-wlink/wlink status

# === 查各工具版本 ===
~/.platformio/packages/tool-wlink/wlink --version    # 烧录工具版本
pio --version                                          # PlatformIO Core 版本

# === 查编译器版本（按最终确认环境，前缀是 riscv-wch-elf-）===
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# 如果你装出来的是老版本 gcc8/x86_64，文件名对应换成：
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
```

`wlink status` 的典型输出，能一眼看到调试器固件版本、目标芯片型号、实际 Flash 容量、芯片 UID 等信息，排查连接问题时非常好用：

```
[INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
[INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
[INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
[INFO] Flash protected: false
[INFO] RISC-V ISA(misa): Some("RV32ACFIMUX")
[INFO] RISC-V arch(marchid): Some("WCH-V4F")
```

> 如果要升级 WCH-Link 调试器本身的固件，需要用官方的 **WCH-LinkUtility** 工具，目前这个工具只有 Windows 版，没有 Mac 版，这也是整个 macOS 生态还不够完善的一个小遗憾。

关键文件路径也整理一份，出问题的时候能快速定位：

| 用途 | 路径 |
|---|---|
| PlatformIO Core 本体 | `~/.platformio/penv/bin/pio` |
| 已安装的平台 | `~/.platformio/platforms/ch32v/` |
| 工具链 / 烧录 / 调试工具 | `~/.platformio/packages/{toolchain-riscv,tool-wlink,tool-openocd-riscv-wch}` |
| board 定义文件 | `~/.platformio/platforms/ch32v/boards/ch32v307_evt.json` |
| 平台构建脚本（前面挖 triple 逻辑那段就在这） | `~/.platformio/platforms/ch32v/builder/main.py` |
| 编译产物 | `<项目目录>/.pio/build/ch32v307_evt/firmware.{elf,bin}` |

`ch32v307_evt` 这个 board 定义里的关键参数，也顺手汇总一下：

| 字段 | 值 |
|---|---|
| MCU 型号 | CH32V307VCT6 |
| 主频 | 144 MHz |
| march / mabi（编译目标 ABI） | rv32imacxw / ilp32 |
| Flash / SRAM（board 默认值） | 256 KB / 64 KB（芯片实际有 288KB Flash，见第九章说明） |
| 板载调试器 | WCH-Link |
| USB VID:PID | 1a86:8010 |
| 支持的烧录协议 | wch-link, wlink, minichlink, isp |

---

## 十八、建立自己的"CH32 开发逻辑"，以后拿到新项目直接抄作业

折腾一圈下来，最值钱的不是记住了多少个具体命令，而是形成一套可以复用的思考框架。以后不管是继续玩 CH32V307，还是换一款 CH32 系列的新芯片、新板子，都可以按这个套路走：

1. **先确认"平台 + 框架 + 板子"这三件套**：对应 `platformio.ini` 里的 `platform`、`framework`、`board` 三行。这三行定了，PlatformIO 就知道该去哪里下载工具链、该按哪套引脚定义编译。
2. **平台装完先别急着写代码，检查一下工具链是不是"对的国籍"**：尤其是社区维护、非官方一线支持的平台，很可能默认只适配了 Windows 或 Linux。装完先 `ls` 一眼工具链目录、`file` 一下关键二进制，确认架构对不对，能省下大把排错时间。
3. **遇到未签名二进制运行报错，先想到 Gatekeeper**：`cannot be opened` / `killed: 9` 这类报错，八成是隔离属性在作祟，`xattr -dr com.apple.quarantine` 一把梭。
4. **烧录/编译都成功但外设没反应，先分清软件问题还是硬件问题**：串口先跑通，是最快的排除法——串口有输出，说明固件在正常执行；没输出，回去检查有没有漏初始化。
5. **默认不要相信板子上的"用户外设"已经接好**：LED、按键这类板载外设，很多评估板出于灵活性考虑，出厂是不接的，用之前对照原理图确认一下，别急着怀疑代码。
6. **善用 `debug.h`（或者对应框架提供的调试辅助库）**：几乎每个厂家 SDK 都会准备好延时函数和 `printf` 重定向，不用自己造轮子。
7. **版本号是会变的，排查思路才是能抄得走的**：社区工具链会持续更新，你装的时候具体版本号跟教程不一样很正常，理解"为什么"比死记"是什么"更重要——这条本文自己就是活生生的例子。

把这套思路记下来，下次拿到任何一款新的嵌入式开发板，基本都能照着这个顺序快速摸清门道。

---

## 十九、常见问题 FAQ

**Q1：为什么不直接用官方的 MounRiver Studio？它不是也有 Mac 版吗？**

A：MounRiver Studio 确实出了 Mac 版，但据社区反馈，它内置的 OpenOCD 在 Mac 上问题不少，感觉像是没有经过认真的 Mac 端适配和测试；而且它是个相对封闭的一体化 IDE，工具链版本你没法自己把控。PlatformIO 基于 VSCode，工具链完全可控、社区活跃、还能跨平台保持一致的开发体验，综合下来更值得折腾这一趟。

**Q2：能不能用 Homebrew 装个 RISC-V 工具链来代替，省得手动替换？**

A：技术上可以，但不推荐用在这个平台上。因为平台自己的构建脚本是靠 PlatformIO 的包管理机制去定位工具链目录的（`get_package_dir("toolchain-riscv")` 这类调用），换成 Homebrew 装的工具链需要额外写配置去覆盖默认行为，反而更麻烦。老老实实用本文提到的 `toolchain-riscv-mac` 包最省心。

**Q3：工具链会不会因为以后升级平台又被打回 Windows 版？**

A：有可能。如果之后执行 `pio pkg update` 或者重新安装整个平台，`platform.json` 里默认写的还是 Windows 仓库地址，可能会把你手动换好的 macOS 版本覆盖掉。届时重复一遍第六章的替换步骤就行，或者更彻底一点，自己 fork 一份平台仓库、把 `platform.json` 改成默认就是 macOS 版，一劳永逸。

**Q4：编译报链接错误，或者提示某个编译器命令找不到，是怎么回事？**

A：大概率是工具链版本和编译器可执行文件前缀对不上（对应第十六章的坑 4）。先确认一下你实际装出来的编译器叫什么名字（`riscv-wch-elf-gcc` 还是老版本的 `riscv-none-embed-gcc`），确保命令和实际文件对得上号，具体可以对照第六章的最终确认环境表。

**Q5：烧录报"找不到 WCH-Link 设备"怎么办？**

A：按这个顺序排查：① 确认插的是连着 WCH-Link 的那个 USB 口，不是 USB-Device 口；② 确认调试器处于 RV 模式而不是 DAP 模式；③ 用 `system_profiler SPUSBDataType | grep -A5 1a86` 看看系统有没有正常识别到 USB 设备（`1a86:8010` 是这颗调试器的 VID:PID）。

**Q6：这套平台支持哪些芯片和开发框架？以后想换别的板子方便吗？**

A：芯片方面覆盖了 CH32V003/103/203/30x、CH32X035、CH56x/57x/58x/59x 等一大票型号；框架方面除了本文用的 noneos-sdk，还支持 FreeRTOS、RT-Thread、TencentOS、Harmony LiteOS、Arduino、ch32fun、Zephyr 等。换板子基本上就是改 `platformio.ini` 里的 `board` 和 `framework` 两行，其他排坑经验（工具链架构、Gatekeeper 隔离、外设默认悬空）大概率还是通用的。

---

## 二十、跑通之后，还能继续玩什么

Hello World 只是起点，跑通之后可以继续往下探索：

- **多路 GPIO / 按键中断**：板载的用户按键 KEY 同样是悬空的，接上线之后可以练习 EXTI 外部中断的用法。
- **USB CDC**：让 CH32V307 自己枚举成一个 USB 串口设备，不再借助 WCH-Link 桥接的 USART1——这是另一套需要 USB 协议栈的固件方案，进阶内容。
- **用满 288KB Flash**：需要先用 WCH 官方工具改芯片的 option bytes，再同步修改 `platformio.ini` 里 `board_upload.maximum_size` 那几行注释。
- **上手 FreeRTOS / RT-Thread**：把 `framework` 换成对应的 RTOS，体验多任务调度。
- **认真学一下调试**：用 OpenOCD + GDB 配合 F5 断点调试（`pio debug`），把嵌入式调试这门手艺练扎实。

---

## 二十一、参考资料

- Community-PIO-CH32V 平台仓库：`github.com/Community-PIO-CH32V/platform-ch32v`
- macOS 工具链包：`github.com/Community-PIO-CH32V/toolchain-riscv-mac`
- 工具链 releases（盯 PIO 这边的新版）：`github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`
- WCH 官方 MounRiver（WCH 定制工具链 + IDE 的源头）：`www.mounriver.com`
- wlink（macOS 分支）：`github.com/Community-PIO-CH32V/tool-wlink`（分支 `mac_arm64` / `mac_x64`）
- 官方文档：`pio-ch32v.readthedocs.io`
- xPack RISC-V GCC（工具链上游）：`github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack`
- wlink 原始项目：`github.com/ch32-rs/wlink`
- WCH 官方产品页：`www.wch.cn/products/CH32V307.html`
- OpenWCH 官方 SDK/例程：`github.com/openwch/ch32v307`
- Zephyr 官方文档中关于本板 LED 悬空的说明
- PlatformIO 官方文档：`docs.platformio.org`

---

*完整项目代码已同步发布到 GitHub，欢迎 clone 下来直接跑。如果你在自己折腾的过程中遇到本文没覆盖到的新坑，欢迎在评论区交流——毕竟 macOS 上玩 CH32V 的资料还是太少了，多一个人分享经验，后面的人就能少踩一个坑。祝你的 LED 早日亮起来！🎉*

https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/CH32V/CH32V307-EVT-R1/01%20HelloWorld