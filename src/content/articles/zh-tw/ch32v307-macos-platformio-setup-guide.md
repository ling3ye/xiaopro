---
title: "在 Mac 上從零征服 CH32V307：從「編譯出一堆 Windows 病毒」到「燈會亮、嘴會說」的踩坑全記錄"
domain: hardware
platforms: ["mac"]
format: "tutorial"
date: 2026-08-08
intro: "在 Mac 上從零搭建 CH32V307 開發環境，裝完 PlatformIO 平台卻發現工具鏈塞給你一堆 Windows 的 .exe？這篇照著真實踩坑過程原樣記錄：手動換成 macOS 原生 RISC-V 工具鏈、解除 Gatekeeper 隔離、打通板載 WCH-Link 燒錄，一路挖到「編譯燒錄都成功、串列埠有輸出、燈卻死活不亮」的真正根因——板載 LED 出廠壓根沒接 MCU。所有指令和報錯都是實跑出來的，遇到的 10 個坑一個不漏全擺出來，給從 Arduino/ESP 轉過來的你提前打預防針。"
tags: ["CH32V307", "CH32V macOS 開發", "PlatformIO", "WCH-Link", "沁恒 WCH", "RISC-V 單晶片", "嵌入式 macOS 開發"]
image: https://img.lingflux.com/2026/08/d9106f173bc51c93033527dd5e206b04.png
---

> 凌順實驗室 · 嵌入式踩坑系列
>
> 硬體：**CH32V307V-EVT-R1**（板載 WCH-Link 除錯器，沁恒 RISC-V 晶片）
> 系統：**macOS（Apple Silicon, arm64）**
> 工具：VSCode + PlatformIO
> 目標：把開發環境從 0 搭起來，點亮一顆 LED，並讓串列埠說話——嵌入式圈子裡公認的「Hello World」

## 寫在前面：為什麼會有這篇文章

先交代一下寫這篇文章的「人設」，免得你讀到後面看到我某些操作，會忍不住嘀咕「這人到底寫沒寫過單晶片」——

我玩 Arduino 和 ESP-IDF 算有些年頭了，點燈、連 WiFi、跑 MQTT 早就形成了肌肉記憶，閉著眼都能把一顆 LED 點亮。所以剛拿到這塊 CH32V307 時，我心裡盤算的是：「不就是換顆晶片嘛，點個燈能有多難？」

結果被現實結結實實上了一課。CH32 這套生態的「出廠設定」，跟 Arduino、ESP 那種「插上就燒、寫對就亮」的世界觀，根本不是同一個畫風：

- **燒個程式還得請專門的燒錄器出場**：Arduino、ESP32 一根 USB 線把供電、燒錄、串列埠三件事全包了；CH32 這邊卻塞給我一個叫 **wlink** 的板載除錯器，光是搞懂「它憑什麼能把韌體刷進晶片」，就繞了好幾圈。
- **板載 LED 居然沒接到 MCU 上**：Arduino 的板載燈焊死在 13 號腳位，`digitalWrite(13, HIGH)` 一下就亮；這塊板子的使用者 LED……**出廠就是斷頭的，壓根沒連到任何腳位**，得我自己拿一條杜邦線飛過去，燈才肯賞臉亮一下。
- **串列埠也得認準了門**：ESP32 插上就是 USB 串列埠，所見即所得；CH32 預設走的卻是除錯器虛擬出來的 USART1，埠沒對上就是一片死寂，逼著你對著空空蕩蕩的監視器懷疑板子是不是壞了。

那一刻我算是真切體會到了什麼叫「老兵翻車」——點了十幾年的燈，居然在一塊 RISC-V 單晶片上卡到懷疑人生，差點以為自己這些年學的嵌入式都餵了狗。

所以這不只是一篇「教學」，更是一個 Arduino/ESP 老使用者第一次玩 CH32 的**踩坑日記**。我那些在熟手看來離譜至極的低級失誤，全都會原樣擺出來——因為對一個同樣從 Arduino/ESP 轉過來的你來說，它們大概率會原樣踩一遍。提前打個預防針，後面的坑你會覺得格外親切。

---

嘮完人設，說回正題。如果你搜「CH32V307 + Windows」，能搜到官方的 MounRiver Studio，裝上就能用；搜「CH32V307 + Linux」，官方工具鏈也伺候得明明白白。

但你要是搜「CH32V307 + macOS」……大概率會陷入沉默。資料七零八落，還全是暗坑。這顆晶片本身其實很爭氣——32 位元 RISC-V 核心，最高 144MHz，性價比吊打一眾 ARM 單晶片——可就是在 Mac 上「沒人疼沒人愛」。

這篇文章就是我在 Mac 上從零搭建 CH32V307 開發環境，一路踩坑、一路填坑，最終點亮 LED + 打通串列埠的全過程記錄。**我不會跳過任何一個坑**，因為你大概率也會踩到同樣的坑，把它們都擺出來，你能少走很多彎路。具體程式碼我放在了 GitHub 上（連結見文末），這篇文章負責把「為什麼這麼做」講透。

先劇透一下最終效果：編譯成功、燒錄成功、板子上的 LED 以固定節奏一閃一閃，串列埠監視器裡同步刷出：

```
CH32V307 booted, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

從「什麼都沒有」到這個畫面，中間踩了至少 **8 個坑**。往下看，一個都不會漏。

### 目錄

- [一、認識一下主角：CH32V307V-EVT-R1](#一認識一下主角ch32v307v-evt-r1)
- [二、整體思路：這套工具鏈長什麼樣](#二整體思路這套工具鏈長什麼樣)
- [三、開工：從裝 VSCode 到認識 pio 命令](#三開工從裝-vscode-到認識-pio-命令)
- [四、安裝 CH32V 平台（以及第一個小坑）](#四安裝-ch32v-平台以及第一個小坑)
- [五、大坑現場：為什麼裝出來一堆 .exe](#五大坑現場為什麼裝出來一堆-exe)
- [六、解坑：換成 macOS 原生工具鏈](#六解坑換成-macos-原生工具鏈)
- [七、解除 Gatekeeper 隔離（不然會被 macOS 當成病毒攔下）](#七解除-gatekeeper-隔離不然會被-macos-當成病毒攔下)
- [八、驗證工具鏈真的能跑](#八驗證工具鏈真的能跑)
- [九、建立第一個專案：認識 platformio.ini](#九建立第一個專案認識-platformioini)
- [十、第一次編譯](#十第一次編譯)
- [十一、把 pio 設成全域命令](#十一把-pio-設成全域命令)
- [十二、硬體連接與燒錄](#十二硬體連接與燒錄)
- [十三、坑①：編譯燒錄都成功，串列埠卻一片死寂](#十三坑編譯燒錄都成功串列埠卻一片死寂)
- [十四、坑②（全文最大的坑）：串列埠都會說話了，燈卻死活不亮](#十四坑全文最大的坑串列埠都會說話了燈卻死活不亮)
- [十五、跑通之後完整的 main.c 長什麼樣](#十五跑通之後完整的-mainc-長什麼樣)
- [十六、踩坑總結表](#十六踩坑總結表)
- [十七、關鍵指令與檔案路徑速查](#十七關鍵指令--檔案路徑速查)
- [十八、建立自己的 CH32 開發邏輯以後拿到新專案直接抄作業](#十八建立自己的ch32-開發邏輯以後拿到新專案直接抄作業)
- [十九、常見問題 FAQ](#十九常見問題-faq)
- [二十、跑通之後還能繼續玩什麼](#二十跑通之後還能繼續玩什麼)
- [二十一、參考資料](#二十一參考資料)

---

## 一、認識一下主角：CH32V307V-EVT-R1

開工之前，先花兩分鐘認識一下這塊板子，因為後面 90% 的坑都跟它的「個性」有關。

| 特徵 | 說明 |
| --- | --- |
| 主晶片 | CH32V307VCT6，沁恒 QingKe V4F 核心，32 位元 RISC-V，主頻最高 **144MHz**，LQFP80 封裝 |
| Flash 實際容量 | **288KB**（但 PlatformIO 預設按 256KB Flash + 64KB SRAM 編譯，後面會解釋為什麼不用改） |
| 板載除錯器 | **WCH-Link**（其實是用一顆 CH32V305 晶片「客串」實現的，效果等同官方的 WCH-LinkE） |
| USB 介面 | 一根 USB-C 搞定供電、除錯、虛擬串列埠三件事 |
| 使用者 LED | LED1、LED2 兩顆——**⚠️ 預設是懸空的，沒接到 MCU 上！**（這是本文最大的坑，第十四章重點講） |
| 使用者按鍵 KEY | 同樣預設懸空 |
| 電源指示燈 | 1 顆，通電就常亮，跟你的程式碼毫無關係——很多人一上電看到這顆燈亮，還以為「點燈成功了」，其實它只是個電源燈而已 |

板子上還有個容易被忽略的細節：板載除錯器晶片（CH32V305）和目標晶片（CH32V307）之間，出廠時用 **4 個跳帽**（絲印分別是 `RX1-TX0`、`TX1-RX0`、`DIO-DIO0`、`CLK-CLK0`）橋接在一起，負責把除錯器的 SWIO 訊號和串列埠訊號「過橋」到目標晶片。

> ⚠️ **這 4 個跳帽出廠就接好了，千萬別手癢拔掉**。拔了輕則燒不進程式，重則串列埠直接失聯，你會以為自己程式碼寫錯了，其實是硬體斷了路——排查半天最後發現是跳帽的事，會很崩潰，別問我怎麼知道的。

好，認完人，開始搭環境。

---

## 二、整體思路：這套工具鏈長什麼樣

先上一張「全家福」，搞清楚各個組件誰管誰：

```
┌──────────────────────────────────────────────────────────┐
│  VSCode + PlatformIO IDE 擴充功能（GUI：編譯/燒錄/除錯/串列埠）│
│                          │                                │
│                   PlatformIO Core（pio 命令列）             │
│                          │                                │
│            ┌─────────────┴──────────────┐                 │
│       ch32v 平台（社群維護：Community-PIO-CH32V）│          │
│            │                             │                 │
│   ┌────────┼─────────┬───────────┐       │                 │
│ toolchain  wlink    openocd    board     │                 │
│(RISC-V GCC)(燒錄工具)(除錯工具) (板級定義)│                 │
└──────────────────────────────────────────┘
                     │ USB
        CH32V307V-EVT-R1（板載 WCH-Link）
```

![](https://img.lingflux.com/2026/08/73dff7f41fe1d3c38d06447b98a39f2b.png)

**一句話講清楚**：VSCode 的 PlatformIO 外掛是前端介面，真正幹活的是命令列工具 `pio`；`pio` 又依賴一個叫 `Community-PIO-CH32V` 的社群平台，這個平台把「編譯器（toolchain）+ 燒錄工具（wlink）+ 除錯工具（openocd）+ 板子參數（board）」打包在了一起，理論上裝一次就能用。

這個社群平台其實相當豪華，原生支援 CH32V003/103/203/30x 全系列，還提供 WCH 官方週邊函式庫（noneos-sdk）、FreeRTOS、RT-Thread、Arduino、ch32fun 等好幾種開發框架可選。

但——這裡就是全文最大的轉折——**這個平台預設是按 Windows 使用者的習慣設定的**，macOS 使用者裝完之後大概率會傻眼。具體怎麼個傻眼法，馬上揭曉。

---

## 三、開工：從裝 VSCode 到認識 pio 命令

### Step 0：確認基礎環境

打開終端機，先摸個底：

```bash
python3 --version          # 需要 3.x
brew --version              # Homebrew，非必需但強烈建議裝
uname -m                    # Apple Silicon 應輸出 arm64，Intel Mac 輸出 x86_64
```

然後裝 VSCode + PlatformIO 擴充功能：

1. 去 https://code.visualstudio.com/ 下載裝上 VSCode；
2. 打開 VSCode，左側「擴充功能」圖示 → 搜尋 `PlatformIO IDE` → Install；
3. 裝完擴充功能會自動往 `~/.platformio/` 目錄裡下載 PlatformIO Core 本體（幾百 MB，還帶一個獨立的 Python 虛擬環境），右下角會顯示進度條，耐心等幾分鐘。

裝完之後左邊欄會冒出一個螞蟻圖示，這就是 PlatformIO 的 Logo（他家的吉祥物真的是螞蟻）。

### Step 1：找到藏起來的 pio 命令

擴充功能裝好之後，命令列工具 `pio` 其實已經存在了，只是沒有加進系統 PATH，你直接在終端機敲 `pio` 是找不到的。它實際躺在這裡：

```bash
~/.platformio/penv/bin/pio
```

驗證一下：

```bash
~/.platformio/penv/bin/pio --version
# PlatformIO Core, version 6.1.19
```

為了後面敲命令方便，先設個臨時變數（只在當前終端機視窗生效）：

```bash
PIO=~/.platformio/penv/bin/pio
```

本文後面所有命令裡的 `$PIO`，說的都是這個路徑。等一切搞定後，我們會在第九步把它設成全域命令，以後直接敲 `pio` 就行。

---

## 四、安裝 CH32V 平台（以及第一個小坑）

用 PlatformIO 的套件管理命令裝社群平台：

```bash
$PIO pkg install -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git
```

這一步有兩個很容易翻車的細節：

> **坑①：組織名容易打錯。** 正確的 GitHub 組織名是 `Community-PIO-CH32V`（注意中間帶了 **PIO** 三個字母，而且是大寫）。網上不少老文章、老貼文寫的是 `community-ch32v`（少了 PIO），照著敲會得到一個非常挫折的報錯：
> ```
> remote: Repository not found.
> ```
> 一定要原樣抄 `Community-PIO-CH32V`。

> **坑②：命令用老了。** 早期教學喜歡寫 `pio platform install ...`，這個命令在新版 PlatformIO 裡已經**廢棄**，會提示 `This command is deprecated`。現在統一用 `pio pkg install -g -p <地址>` 這種寫法。

命令跑起來後會依次拉取平台本體、RISC-V 工具鏈、openocd、wlink 四個包，看著一切正常，日誌也沒報錯。**但請先別急著開香檳**——真正的大坑還在後面。

---

## 五、大坑現場：為什麼裝出來一堆 `.exe`

這是本文含金量最高的一節，也是絕大多數 macOS 使用者會在這裡卡住、然後懷疑人生的地方。

平台裝完後，我們檢查一下實際下載到本地的工具鏈長什麼樣：

```bash
ls ~/.platformio/packages/toolchain-riscv/bin/ | head
# riscv-none-embed-addr2line.exe
# riscv-none-embed-ar.exe
# riscv-none-embed-as.exe
# ...
```

再檢查一下燒錄工具 wlink：

```bash
file ~/.platformio/packages/tool-wlink/wlink.exe
# PE32 executable (console) Intel 80386, for MS Windows
```

看到沒有，全都是 **`.exe`**——道道地地的 Windows PE32 二進位檔案，在 macOS 上就是一堆廢鐵，雙擊都點不開，更別說編譯程式碼了。第一次看到這個結果的心情，大概就是：「我人在 Mac，你卻給我發 Windows 的東西，什麼意思？」

### 挖根因：問題出在 `platform.json`

翻開這個平台的設定檔看看：

```bash
cat ~/.platformio/platforms/ch32v/platform.json | python3 -m json.tool | grep -A3 toolchain-riscv
```

結果是這樣的：

```json
"toolchain-riscv": {
  "type": "toolchain",
  "owner": "platformio",
  "version": "https://github.com/Community-PIO-CH32V/toolchain-riscv-windows.git"
}
```

**真相大白**：這個平台的設定檔把工具鏈來源**寫死**成了 `toolchain-riscv-windows.git`，燒錄工具 wlink 同樣被寫死成了 `#windows` 分支。PlatformIO 安裝的時候不會智慧判斷「你用的是什麼系統」，設定檔寫啥就裝啥，一視同仁地把 Windows 版本發給所有人——包括我們可憐的 Mac 使用者。

**好消息是**：同一個 `Community-PIO-CH32V` 組織其實早就做好了 macOS 原生版本的倉庫，只是沒有被設成預設值而已。既然根因已經摸清，對應的填坑操作也就順理成章——**手動把這兩個 Windows 包換成 macOS 原生版**就行。具體怎麼換、每步注意什麼，下面這一章就是實操步驟。

---

## 六、解坑：換成 macOS 原生工具鏈

### 6.1 替換 RISC-V 編譯器

先刪掉錯誤的 Windows 版：

```bash
rm -rf ~/.platformio/packages/toolchain-riscv
```

再裝 macOS 原生版本：

```bash
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/toolchain-riscv-mac.git
```

安裝成功會提示類似這樣的訊息：

```
Tool Manager: toolchain-riscv@1.80200.190731+sha.99cb62f has been installed!
```

裝好之後可以確認一下，它的 `package.json` 裡寫著 `"system": ["darwin_x86_64", "darwin_arm64"]`，說明這就是給 macOS 用的，包名還是 `toolchain-riscv`，能無縫頂替掉原來那個 Windows 版本。

> **為什麼這一步要用 `main` 分支，而不是看起來更新的 `gcc12` 分支？**
>
> 這裡有個很隱蔽的技術細節。平台的建置腳本（`builder/main.py`）裡有這麼一段邏輯：
> ```python
> is_gcc_12 = platform.get_package_version("toolchain-riscv").split(".")[1].startswith("12")
> compiler_triple = "riscv-wch-elf" if is_gcc_12 else "riscv-none-embed"
> ```
> 翻譯成人話就是：腳本會看你裝的工具鏈**版本號的第二段**，如果是 `1.8.x` 這種，就認定你用的編譯器可執行檔前綴是 `riscv-none-embed-gcc`；如果是 `1.12.x`，就認定前綴是 `riscv-wch-elf-gcc`。這兩套前綴對應的是完全不同的可執行檔名，選錯了，建置腳本呼叫的命令在磁碟上根本找不到，直接報錯。
>
> `main` 分支裝出來的版本號恰好是 `1.80200.190731`（對應 gcc 8.2.0），跟平台原本寫死的 Windows 版本號是一致的，觸發的是 `riscv-none-embed` 這條路，跟腳本原本的預期完全吻合，零風險，最穩。

安裝好之後有個細節要注意：

> ⚠️ **這個 gcc8 版本的編譯器，本體其實是 x86_64 架構**，也就是給 Intel Mac 編譯的，不是 Apple Silicon 原生的 arm64。原因很簡單：xPack（工具鏈的上游打包方）在 gcc8 那個年代根本還沒出 arm64 版本的建置。所以在 M 系列晶片的 Mac 上，這個編譯器是靠 **Rosetta 2** 轉譯執行的。聽著好像不夠「原生」，但實測編譯完全正常，不用有心理負擔，第一次執行系統會提示裝 Rosetta，裝上就完事了。

### 6.2 替換燒錄工具 wlink

同樣的操作，把 Windows 版 wlink 換成 macOS 原生版：

```bash
rm -rf ~/.platformio/packages/tool-wlink
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_arm64
```

> 如果你用的是 Intel 晶片的老 Mac，分支名換成 `mac_x64`：
> ```bash
> $PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_x64
> ```

裝好後提示：

```
Tool Manager: tool-wlink@0.23.241116+sha.0c802d4 has been installed!
```

> **openocd 不用管，它是正常的。** `openocd`（除錯用的那個工具）來自 PlatformIO 官方註冊表，不是從 `Community-PIO-CH32V` 直接拉的，註冊表本身就有按作業系統自動匹配架構的能力，所以在 Apple Silicon 上裝出來已經是 arm64 原生版了，可以驗證一下：
> ```bash
> file ~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd
> # Mach-O 64-bit executable arm64  ✅ 放心，這個沒問題
> ```

### 6.3 重要修正：最終穩定可用的其實是 gcc12 / arm64 原生版

寫到這裡必須插一句大實話，而且是一次**自我修正**：上面 6.1 節那段「為什麼要用 main 分支（gcc8）」的推理，是我早期單純讀平台建置腳本原始碼得出的**理論判斷**——腳本邏輯本身沒錯，但「應該裝哪個版本才穩」這件事，光看程式碼猜是不夠的，最後還是得拿真機編譯、燒錄、跑通了才算數。

**把實際上板測試、編譯、燒錄全部跑通的最終環境倒查一遍，結果是：真正穩定好用、而且是 Apple Silicon 原生 arm64（完全不需要 Rosetta 轉譯）的版本，其實是 gcc 12.2.0，可執行檔前綴 `riscv-wch-elf-gcc`。** 之前擔心的「gcc12 分支容易踩雷、對應可執行檔可能不存在」，實測下來並不成立——這一版工具鏈不僅存在，而且是這套編譯器裡最完整、最新、跑得最順的一版，還額外自帶了 GDB 除錯器，一次裝齊。

所以結論反過來了：**如果你現在要裝，請直接以 gcc 12.2.0 / arm64 原生 / `riscv-wch-elf-gcc` 這套為目標**，前面 6.1 節裡 gcc8/x86_64 靠 Rosetta 跑的那條路，當作「萬一你裝出來是這個版本，也不用慌，一樣能用」的兜底說明保留即可，不必刻意去追求。

之所以把這段「猜錯了又改回來」的過程完整地留在文章裡，而不是悄悄改掉當作沒發生過，是因為這本身就是個挺有價值的經驗：**讀建置腳本、看版本號規律，能幫你理解「為什麼會這樣」，但「到底該裝哪個版本」這種結論性的判斷，最終還是要靠真實編譯、燒錄跑一遍去驗證，光靠程式碼推理可能會得出過於保守的結論。**

### 6.4 最終確認環境：完整技術規格

下面這份是把實際編譯上傳成功的那套環境，事無巨細地扒了一遍拿到的完整資訊，建議直接把這套設定當成目標去對照：

| 類別 | 組件 / 欄位 | 值 |
| --- | --- | --- |
| 編譯器 | 名稱 | xPack GNU RISC-V Embedded GCC（**WCH 訂製版**，與 MounRiver Studio 隨附的是同一套） |
| 編譯器 | 可執行檔名 | `riscv-wch-elf-gcc`（整套工具統一前綴 `riscv-wch-elf-`） |
| 編譯器 | GCC 版本 | **12.2.0** |
| 編譯器 | 目標三元組（target triple） | `riscv-wch-elf` |
| 編譯器 | 建置/執行宿主（host） | `aarch64-apple-darwin23.6.0`（**Apple Silicon 原生**，不經過 Rosetta） |
| 編譯器 | 預設 ABI | `ilp32`（32 位元、軟浮點呼叫約定） |
| 編譯器 | 預設 ARCH | `rv32imac`（I 整數 / M 乘除 / A 原子 / C 壓縮指令） |
| 編譯器 | ISA spec | 2.2，啟用 multilib |
| 編譯器 | 執行緒模型 | single（裸機，無作業系統） |
| 編譯器 | C 標準函式庫 | **newlib 4.2.0**（`printf` 這些標準函式庫函式就是它提供的實作） |
| 編譯器 | binutils（組譯器/連結器套件） | **GNU binutils 2.38**（`as`、`ld.bfd`、`objcopy` 都來自這裡） |
| 編譯器 | 除錯器 | 工具鏈裡已經自帶 `riscv-wch-elf-gdb`，不用額外裝 |
| 編譯器 | 二進位路徑 | `~/.platformio/packages/toolchain-riscv/bin/` |
| 編譯器 | sysroot | `~/.platformio/packages/toolchain-riscv/riscv-wch-elf/` |
| 編譯器 | PIO 包名 / 包版本 | `toolchain-riscv` @ `1.120200.220829` |
| 編譯器 | 來源 | xPack（`riscv-none-elf-gcc-xpack`），基於上游 GCC 12.2.0 建置 |
| 編譯環境 | PlatformIO Core | 6.1.19 |
| 編譯環境 | 平台 platform-ch32v | 1.1.0（Community-PIO-CH32V 維護） |
| 編譯環境 | 框架 framework-wch-noneos-sdk | 2.30000.0（WCH 標準週邊函式庫，裸機） |
| 編譯環境 | 建置系統 | PlatformIO 內建（基於 SCons + Python） |
| 編譯環境 | 目標晶片 | CH32V307VCT6，ChipID `0x30700568`，QingKe V4F @144MHz |
| 上傳環境 | 上傳工具 | **wlink 0.1.1**（當前實際在用；PIO 包 `tool-wlink` @ `0.23.241116`） |
| 上傳環境 | 上傳協定 | `wlink`（對應 `platformio.ini` 裡的 `upload_protocol` 設定） |
| 上傳環境 | 除錯器韌體 | WCH-Link v2.18 (v38)，硬體基於 CH32V305 |
| 上傳環境 | 備選：OpenOCD | `0.11.0+dev-snapshot`（2026-02-28），PIO 包 `2.1100.260228` |
| 上傳環境 | 備選：wchisp | `0.2.3`，PIO 包 `0.23.240914` |
| 上傳環境 | 備選：minichlink | `0.1.0` |

> 注意區分：**編譯器實際版本是 GCC 12.2.0**；`1.120200.220829` 是 PlatformIO 自己給這個包打的編號（大致是 `1.` + `12.2.0` + `0` + 打包日期 `220829` 拼出來的），不是編譯器本身的版本號，兩者別搞混了。

**完整工具鏈套件**（全部統一帶 `riscv-wch-elf-` 前綴，一共 30 個可執行檔，裝一次全齊）：

- **編譯連結常用**：`gcc` `g++` `c++` `cpp` `ld` `ld.bfd` `as`
- **二進位處理**：`objcopy` `objdump` `readelf` `nm` `size` `strip` `strings` `addr2line`
- **封存工具**：`ar` `ranlib` `gcc-ar` `gcc-nm` `gcc-ranlib`
- **除錯/分析**：`gdb` `gdb-py3` `gprof` `gcov` `gcov-tool` `gcov-dump`
- **其他**：`gfortran` `elfedit` `c++filt` `lto-dump`

這份清單平時用不上背，留著當字典查就行——比如以後要看某個函式編譯後占了多少體積，直接找 `riscv-wch-elf-size`；要反組譯看生成的指令，用 `riscv-wch-elf-objdump -d`；這些工具全都已經在你裝好工具鏈的那一刻，安安靜靜地待在 `~/.platformio/packages/toolchain-riscv/bin/` 裡了。

### 6.5 編譯器版本追蹤與升級：去哪看最新版、怎麼升級

工具鏈不是裝一次就一勞永逸的，社群版本一直在更新。但要搞懂「怎麼追最新版」，得先認清一個很容易繞暈人的事實：**你這套編譯器其實是「三層套娃」，而且存在兩個不一樣的「最新版」。**

**先認清：三層結構 + 兩個「最新」**

| 層 | 是什麼 | 當前最新 | 更新快慢 |
| --- | --- | --- | --- |
| ① 你 PIO 裡實際用的（WCH 訂製版） | 帶 `riscv-wch-elf` 三元組 + WCH 為 QingKe 核心打的專屬補丁 | **GCC 12.2.0**（你裝的就是這個） | **基本不動**，長期停在 12.2.0 |
| ② ① 的打包方 | Community-PIO-CH32V 把 ① 重新打包成 PIO 包 | 同上（release 名 `riscv-none-embed-gcc 12.2.0-3`） | 跟著 ① 走 |
| ③ 最上游（vanilla） | xPack 的通用 RISC-V GCC，**沒有 WCH 補丁** | **GCC 15.2.0**（2025-10-23） | 持續更新，緊追上游 GNU GCC |

> **關鍵提醒**：網上常說的「社群版本一直在更新」，更新的是第 ③ 層（xPack，已到 15.2.0），不是你 CH32V 實際用的第 ① 層（WCH 訂製版，還停在 12.2.0）。這兩條線**不能混著追**——直接拿 xPack 15.2.0 頂替你現在的編譯器，會丟掉 WCH 給 QingKe 核心加的專屬補丁，CH32V 上某些特性可能就不靈了。**對 CH32V 開發，正確做法是跟 ①②，而不是盲目追 ③ 的最新。**
>
> 順帶一個小技能：你編譯器的完整身分字串 `riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0`，三個資訊點一眼可讀——`wch-elf` 是 WCH 訂製標誌，`xPack` 是上游打包方，`arm64` 說明是 Apple Silicon 原生版。

**怎麼查自己當前裝的到底是哪一版**

```bash
# 1. 看 PIO 包版本（PlatformIO 自己的編號，和編譯器版本不是一回事）
pio pkg list | grep -i riscv

# 2. 看編譯器完整身分（版本、目標三元組、ABI、ARCH、建置宿主全都有，最推薦記這一條）
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc -v

# 3. 看 C 函式庫（newlib）版本——printf 就是它實作的
grep "_NEWLIB_VERSION" ~/.platformio/packages/toolchain-riscv/riscv-wch-elf/include/_newlib_version.h

# 4. 看 binutils（組譯器/連結器）版本
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-ld.bfd --version

# 5. 看 platform.json 把工具鏈「釘」在哪個源（決定升級時會拉哪個倉庫）
grep -A3 '"toolchain-riscv"' ~/.platformio/platforms/ch32v/platform.json
```

**去哪看最新版（三個管道，按和你相關度排序）**

- **管道一：WCH 官方 / MounRiver（WCH 訂製版的真正上游，最相關）**。`riscv-wch-elf` 這個三元組和 WCH 核心補丁，源頭在 WCH 官方的 MounRiver Studio——你編譯器的建置資訊裡寫著建置路徑是 `/Users/mrs/...`（mrs = MounRiver Studio），就是這個出處。官網下載頁 `www.mounriver.com`（找「MounRiver Studio」和「Toolchain 工具鏈」），官方 SDK 倉庫在 `github.com/openwch`。當前 MRS 工具鏈版本系列是 v1.91（Community-PIO-CH32V 的 release 說明原話就是 "Update toolchain to v1.91"）。
- **管道二：Community-PIO-CH32V 打包版（你 PIO 實際在用的）**。它本質是把 MounRiver 的 WCH 工具鏈重新打包成 PlatformIO 包，盯它的 releases 就能第一時間知道 PIO 這邊什麼時候跟進新版：`github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`。想第一時間收到通知，頁面右上角 Watch → Custom → Releases 勾上，或訂閱 RSS：`github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases.atom`。
- **管道三：xPack 上游（vanilla，更新最快，僅供了解）**：releases 在 `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack/releases`，版本歷史最全的在 `npmjs.com/package/@xpack-dev-tools/riscv-none-elf-gcc`，當前最新 15.2.0-1.1。

**怎麼升級（以及一個必須躲的坑）**

```bash
# 升級整個 ch32v 平台（含框架、工具鏈——由 Community-PIO-CH32V 發佈新版時才會真正更新）
pio pkg update -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git

# 或者只單獨升級工具鏈這一個包
pio pkg update -g -t toolchain-riscv
```

> ⚠️ **升級時要躲的坑（呼應第十九章 FAQ 的 Q3）**：第五章挖過，`platform.json` 裡把工具鏈來源**硬編碼成了 Windows 倉庫**。這意味著一旦你跑了 `pio pkg update` 或者重裝平台，極有可能把你好不容易手動換好的 macOS 原生版**覆蓋回 Windows 版**。真遇到了，把 6.1 / 6.2 的替換步驟再走一遍就行；想一勞永逸，就自己 fork 一份平台倉庫，把 `platform.json` 改成預設指向 macOS 版，徹底根治。
>
> 再強調一遍方向：升級是為了拿到 Community-PIO-CH32V 跟進的新版 **WCH 訂製工具鏈**，不是去追 xPack 的 15.2.0。在 PIO 裡玩 CH32V，請始終以 ①②（WCH 訂製版）為準。

---

## 七、解除 Gatekeeper 隔離（不然會被 macOS 當成「病毒」攔下）

macOS 有個安全機制，只要一個可執行檔是透過網路下載來的（`git clone` 也算），系統就會給它貼上一個叫 `com.apple.quarantine` 的隔離標籤。這類檔案如果沒有經過蘋果的簽章認證，執行時會被直接攔截，報錯通常長這樣：

```
"xxx" cannot be opened because the developer cannot be verified
```

或者更簡單粗暴：

```
killed: 9
```

我們剛裝的編譯器、燒錄器都是這種「無簽章、網路下載」的典型代表，所以要提前把隔離屬性清掉：

```bash
xattr -dr com.apple.quarantine ~/.platformio/packages/toolchain-riscv
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-wlink
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-openocd-riscv-wch
```

> `-r` 是遞迴參數，會把目錄下所有檔案的隔離屬性一併清掉；就算某個檔案本來就沒有這個屬性，命令也不會報錯，屬於「先做了也不虧」的預防性操作，放心執行。

---

## 八、驗證工具鏈真的能跑

裝完之後不要急著開專案，先花十幾秒確認三大件都能正常執行：

```bash
# 編譯器（按第六章確認的最終版本，gcc12.2.0，arm64 原生，不需要 Rosetta）
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0

# 如果你裝出來的恰好是 gcc8/x86_64 那個老版本，命令和輸出對應換成：
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
# riscv-none-embed-gcc (xPack GNU RISC-V Embedded GCC x86_64) 8.2.0

# 燒錄工具（原生 arm64）
~/.platformio/packages/tool-wlink/wlink --version
# wlink 0.1.1

# 除錯工具（可選，原生 arm64）
~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd --version
```

> **關於 Rosetta 的小提醒**：gcc12/arm64 原生版理論上完全不需要 Rosetta。但如果你裝出來的恰好是 gcc8/x86_64 那個老版本，第一次呼叫時系統可能會彈窗問你要不要裝 Rosetta 2，點確認裝上就行，這是一次性的操作，裝完之後再也不會提示。只要上面的命令能正常吐出版本號，就說明環境已經打通了。

---

## 九、建立第一個專案：認識 `platformio.ini`

### 9.1 專案結構長什麼樣

一個最簡單的 PlatformIO 專案，骨架就兩個東西：

```
ch32v307-test/
├── platformio.ini      # 專案設定檔，「這個專案要用什麼晶片、什麼框架、怎麼燒錄」全寫在這
└── src/
    └── main.c           # 你的韌體程式碼，程式進入點
```

用命令列建一個空專案也行（如果你更喜歡在 VSCode 裡點「New Project」圖形化建也完全一樣）：

```bash
$PIO project init -d ~/ch32v307-test --board ch32v307_evt
```

### 9.2 逐行拆解 `platformio.ini`

這是全專案最重要的一個設定檔，每次開新專案都會打交道，所以值得逐行講透。內容大概是這樣：

```ini
[env]
platform = ch32v
framework = noneos-sdk
monitor_speed = 115200
; 板載 WCH-Link 除錯器；wlink 是原生支援 macOS arm64 的燒錄工具
upload_protocol = wlink

[env:ch32v307_evt]
board = ch32v307_evt
; EVT-R1 出廠預設設定: Flash 256K + SRAM 64K（與 board 預設一致，無需覆蓋）
; 如需切換到 288K Flash / 32K SRAM 等其它佈局，需先用 WCH 工具改 option bytes，
; 並在此取消註解同步：
; board_upload.maximum_size = 294912
; board_upload.maximum_ram_size = 32768
```

拆開一條條看：

- **`[env]`**：這是「公共設定區」，下面寫的東西對所有環境（env）都生效。如果你的專案將來要同時支援好幾塊不同的板子，公共參數寫在這裡能少重複。
- **`platform = ch32v`**：告訴 PlatformIO 用哪個平台，也就是我們前面折騰了半天裝好的那個 `Community-PIO-CH32V` 社群平台。
- **`framework = noneos-sdk`**：選用 WCH 官方的標準週邊函式庫（裸機開發，沒有作業系統調度），這也是最經典、資料最全的入門框架，對應的包是 `framework-wch-noneos-sdk`，本文實測可用的版本是 `2.30000.0`。如果以後想玩多工，把這一行換成 `freertos` 或 `rt-thread` 就行，其他設定基本不用動——這也是 PlatformIO 生態的好處之一。
- **`monitor_speed = 115200`**：串列埠監視器（`pio device monitor`）用的鮑率。**這個數字必須和程式碼裡 `USART_Printf_Init()` 傳的參數一致**，兩邊對不上，串列埠出來的就是一坨亂碼，這也是新手很常見的一個小坑。
- **`upload_protocol = wlink`**：告訴 PlatformIO 用哪個工具往板子裡燒程式。可選的協定不止一個（下文第十二章會給出完整對照表），macOS arm64 使用者選 `wlink` 最省心，因為它是原生支援的。
- **`[env:ch32v307_evt]`**：這是一個具體的「環境」定義，名字隨便取，但習慣上會跟板子型號對應，方便管理。
- **`board = ch32v307_evt`**：指定具體的板子型號，PlatformIO 會據此載入對應的腳位定義、Flash/RAM 大小、預設時鐘等一整套參數。
- **Flash/RAM 那幾行註解**：這裡藏著一個容易讓人糾結的細節——EVT-R1 這塊板子的晶片實際上有 **288KB** 的 Flash，但 `board` 預設給的卻是 **256KB**。別急著去改，這不是 bug：出廠預設的 option bytes 設定就是按 256KB Flash + 64KB SRAM 劃分的，跟 `board` 預設值剛好對得上，所以新手階段完全不用動這兩行註解。等你以後真的需要把 Flash 用滿 288KB，才需要先用 WCH 官方工具去改晶片的 option bytes，再回來同步這兩行設定——這是進階操作，入門階段可以先放一邊。

### 9.3 讀懂 PlatformIO 生成的 `main.c` 範本——建立「CH32 開發邏輯」

這一節是重點中的重點。第一次打開 PlatformIO 自動生成的 `main.c`，很多人會被開頭一大坨 `#if defined(...)` 勸退，覺得「這也太複雜了吧」。別怕，我們來把它拆開看，你會發現其實沒那麼可怕，而且看懂這一坨，以後換任何一款沁恒晶片你都能秒懂套路。

範本開頭長這樣（節選）：

```c
// ① 根據編譯期巨集，自動挑選當前晶片對應的標頭檔
#if defined(CH32V003)
#include <ch32v00x.h>
#elif defined(CH32V10X)
#include <ch32v10x.h>
#elif defined(CH32V30X) || defined(CH32V31X)
#include <ch32v30x.h>
// ... 後面還有 V20X / X035 / L103 / H417 等一大串分支
#endif
#include <debug.h>   // ← 這一行是關鍵：提供了串列埠初始化、延時、printf 重新導向
```

**這段程式碼為什麼長這樣？** 因為 PlatformIO 的範本是給沁恒**全系列晶片**通用的一份程式碼，`CH32V003`、`CH32V307`、`CH32X035`……幾十款晶片共用同一份 `main.c` 骨架，靠一堆 `#if defined(...)` 在編譯期自動「猜」你用的是哪款晶片，然後 `#include` 對應廠家提供的標頭檔。這些巨集是 `platform = ch32v` + `board = ch32v307_evt` 這套設定在背後自動幫你定義好的，你不用手動寫。

**對我們的 CH32V307 來說**，真正生效的其實只有兩行：

```c
#include <ch32v30x.h>   // CH32V30X 系列的週邊定義（暫存器、GPIO_InitTypeDef 這些都來自這裡）
#include <debug.h>      // 關鍵的除錯輔助函式庫
```

看懂這一點之後，那一整坨 `#if defined` 就不再是「複雜邏輯」，而是「一個多選一的開關」，理解了這個套路，以後拿到任何一款 CH32 系列的新板子，看到類似的範本程式碼都不會慌。**這就是所謂的「CH32 開發邏輯」：先看板子對應哪個系列標頭檔，再看 `debug.h` 提供了哪些輔助函式。**

### 9.4 `debug.h` 裡到底藏了什麼

這個標頭檔是 WCH 官方 SDK 自帶的，幾乎每個 CH32 專案都會用到，提前認識一下它提供的幾個函式，能少走很多彎路：

```c
void Delay_Init(void);                        // 初始化延時用的系統計時器
void Delay_Us(uint32_t n);                    // 微秒級延時
void Delay_Ms(uint32_t n);                    // 毫秒級延時
void USART_Printf_Init(uint32_t baudrate);    // 初始化 USART1，並把 printf 重新導向到它
```

配套的 `debug.c`（同樣是 SDK 自帶，不用你自己寫）裡，已經實作了 C 標準函式庫要求的底層 `_write()` 函式，並且把它接到了 USART1 上。**這意味著你完全不需要自己寫重新導向程式碼，只要呼叫一次 `USART_Printf_Init(115200)`，之後隨便寫 `printf(...)` 就能從串列埠看到輸出**——這是很多單晶片新手容易忽略、卻又極其好用的一個功能，等你踩過後面那個「串列埠沒輸出」的坑，會對這行程式碼印象深刻。

### 9.5 一個「能編譯但什麼都不幹」的最小範例

在深入研究 Hello World 之前，先看一個最基礎的點燈程式碼，感受一下 CH32 GPIO 操作的基本套路：

```c
#include <ch32v30x.h>   // CH32V30X 系列標頭檔，由 board 設定自動決定引入哪個
#include <debug.h>

#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);   // 設定中斷優先級分組（標準開局動作）
    SystemCoreClockUpdate();                          // 刷新系統時脈變數（同樣是標準開局動作）
    Delay_Init();                                     // 初始化延時功能

    GPIO_InitTypeDef GPIO_InitStructure = {0};

    BLINKY_CLOCK_ENABLE;                               // ① 先給 GPIOA 週邊「通電」（使能時脈）
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;           // ② 選中 PA0 這個腳位
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;    // ③ 模式：推挽輸出
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;   // ④ 翻轉速度
    GPIO_Init(GPIOA, &GPIO_InitStructure);              // ⑤ 把設定真正寫進暫存器

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(GPIOA, GPIO_Pin_0, ledState);   // 把 PA0 電位設成 ledState
        ledState ^= 1;                                 // 電位取反，下一輪反過來
        Delay_Ms(500);                                  // 停 500ms，形成「閃爍」的觀感
    }
}
```

**記住這套 GPIO 初始化的固定四步曲**，以後寫任何 CH32 專案的週邊初始化，都是這個套路的變體：

1. **開時脈**：STM32 系機器人（CH32 的週邊函式庫風格幾乎是照抄 STM32 標準函式庫）有個特點——所有週邊預設是「斷電」狀態，用之前必須先用 `RCC_XXXClockCmd(...)` 手動使能對應的時脈，忘了這一步，週邊就是個擺設，怎麼設定都沒反應。
2. **填結構**：宣告一個 `XXX_InitTypeDef` 結構，把想要的模式、速度等參數一一填進去。
3. **呼叫 `XXX_Init()`**：把結構「餵」給對應的初始化函式，參數才會真正寫進晶片暫存器。
4. **在 `while(1)` 裡幹活**：用對應的讀寫函式（比如 `GPIO_WriteBit`）去操作週邊。

好，理論講完了，接下來我們真刀真槍地編譯、燒錄，然後你會發現——理論上沒問題的程式碼，實操起來還是會遇到「意料之外」的坑。

---

## 十、第一次編譯

萬事俱備，跑一下編譯：

```bash
$PIO run -d ~/ch32v307-test        # 或者 cd 進專案目錄後直接 pio run
```

第一次編譯會自動去下載 WCH 的 `noneos-sdk` 框架（裡面是全套週邊驅動原始碼），需要一點時間，大概 30~60 秒。編譯成功的輸出長這樣：

```
Linking .pio/build/ch32v307_evt/firmware.elf
RAM:   [          ]   3.2% (used 2080 bytes from 65536 bytes)
Flash: [          ]   0.7% (used 1728 bytes from 262144 bytes)
Building .pio/build/ch32v307_evt/firmware.bin
========================= [SUCCESS] Took 47.36 seconds =========================
```

看到綠色的 `[SUCCESS]`，說明整條工具鏈——從 VSCode、到 pio、到 macOS 原生編譯器——已經完全打通了，值得為自己鼓個掌。編譯產物在 `.pio/build/ch32v307_evt/` 目錄下：

- `firmware.elf`：帶完整除錯符號，除錯時用；
- `firmware.bin`：純二進位，燒錄時用的就是它。

那兩條進度條（RAM/Flash 占用）值得留意一下，後面加了 `printf` 功能之後，Flash 占用會明顯漲一截，屬於正常現象，不用慌，第十三章會具體說明為什麼。

---

## 十一、把 `pio` 設成全域命令

每次都要敲一長串 `~/.platformio/penv/bin/pio` 實在麻煩，我們把它軟連結到系統 PATH 裡的某個目錄。Apple Silicon 的 Mac 上，Homebrew 預設裝在 `/opt/homebrew/bin`，這個目錄通常對當前使用者（屬於 admin 群組）是可寫的：

```bash
if [ -w /opt/homebrew/bin ]; then
  ln -sf ~/.platformio/penv/bin/pio /opt/homebrew/bin/pio
  ln -sf "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" /opt/homebrew/bin/code
fi
```

驗證一下：

```bash
pio --version      # PlatformIO Core, version 6.1.19
code --version     # VSCode 版本號
```

> 如果你的 `/opt/homebrew/bin` 不可寫（比較少見），換一個自己的可寫目錄，比如 `~/.local/bin`，然後把它加進 shell 的 PATH：
> ```bash
> mkdir -p ~/.local/bin
> ln -sf ~/.platformio/penv/bin/pio ~/.local/bin/pio
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
> ```
> 記得改完 `~/.zshrc` 之後，新開一個終端機視窗或者執行 `source ~/.zshrc` 讓設定生效。

以後本文裡所有 `$PIO` 或 `~/.platformio/penv/bin/pio` 的地方，都可以直接簡寫成 `pio` 了。

---

## 十二、硬體連接與燒錄

### 12.1 接線：插對 USB 埠

EVT-R1 板上通常有兩個 USB 埠，**燒錄除錯要插連著板載 WCH-Link 的那個埠**（板子絲印一般會標 DEBUG / Link / WCH-Link 字樣），不是標著 USB-Device 的那個埠，兩個埠功能完全不同，插錯了系統裡根本看不到。macOS 自帶 CDC 串列埠驅動，插上就能用，不需要額外裝驅動，這點比 Windows 省心不少。

### 12.2 WCH-Link 的兩種模式

WCH-Link 這顆除錯器晶片有兩種工作模式：**RV 模式**（服務 RISC-V 晶片）和 **DAP 模式**（服務 ARM 晶片）。我們的 CH32V307 是 RISC-V 核心，必須讓除錯器處於 **RV 模式**才能正常燒錄。板子出廠一般預設就是 RV 模式；如果燒錄一直失敗，可以用 `wlink` 命令或 WCH 官方工具切換模式確認一下：

```bash
# 列出當前連接的 WCH-Link 裝置
pio pkg exec -- wlink list          # 或者直接敲 wlink list（前提是路徑已加進 PATH）
```

### 12.3 正式燒錄

**方式一：命令列**

```bash
cd ~/ch32v307-test
pio run -t upload
```

前面 `platformio.ini` 裡設的 `upload_protocol = wlink` 就是在這一步生效——PlatformIO 會呼叫 macOS 原生的 wlink 工具，透過 WCH-Link 把 `firmware.bin` 寫進晶片。

**方式二：VSCode 圖形介面**

打開專案資料夾，左下角 PlatformIO 工具列有一排圖示，點那個箭頭圖示（Upload）就行，跟命令列效果一樣，喜歡點滑鼠的可以走這條路。

燒錄成功時，`wlink` 會印出除錯器和晶片的詳細資訊，很有參考價值：

```
04:17:53 [INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
04:17:53 [INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
04:17:53 [INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
04:17:54 [INFO] Flash done
04:17:54 [INFO] Now reset...
```

第一行 `v2.18(v38)` 就是你這個 WCH-Link 除錯器本身的韌體版本；第三行能看到晶片實際的 Flash 容量是 288KB（呼應第九章提過的那個細節），還有晶片唯一的 UID，做產品序列化的時候可能用得上。

### 12.4 燒錄協定怎麼選

`board` 定義裡其實支援好幾種燒錄協定，按需切換：

| 協定 | 底層工具 | 說明 |
|---|---|---|
| `wch-link` | openocd（`0.11.0+dev-snapshot`，PIO 包 `2.1100.260228`） | 預設協定，透過 openocd 存取 WCH-Link |
| `wlink` | wlink（工具版本 `0.1.1`，PIO 包 `tool-wlink@0.23.241116`） | **推薦 macOS 使用者選這個**，原生、輕量、速度快，也是本文實際在用的協定 |
| `minichlink` | minichlink（`0.1.0`） | 社群維護的另一個輕量工具，備選項 |
| `isp` | wchisp（`0.2.3`，PIO 包 `0.23.240914`） | 走 USB Bootloader 模式燒錄，需要先把 BOOT0 腳位拉高進入 bootloader，適合沒有 WCH-Link 的場景 |

### 12.5 除錯（下中斷點、單步）

在 VSCode 裡直接按 **F5** 就能啟動除錯工作階段（底層是 openocd + RISC-V GDB 在配合工作），可以下中斷點、單步執行、查看變數和暫存器的即時值。板子對應的 SVD 暫存器描述檔（`CH32V307xx.svd`）已經在 board 設定裡指定好了，所以週邊暫存器的視覺化查看也是開箱即用的，不用額外設定。這部分內容展開講能再寫一篇，這裡先點到為止，夠用就行。

---

## 十三、坑①：編譯燒錄都成功，串列埠卻一片死寂

工具鏈打通、燒錄成功之後，很多人以為大功告成，興沖沖打開串列埠監視器——結果傻眼了。

### 現象

```bash
pio run              # 編譯成功 ✅
pio run -t upload    # 燒錄成功 ✅
pio device monitor   # 打開串列埠監視器 → 一片空白，鬼影都沒有
```

編譯沒報錯，燒錄也確認成功了，串列埠監視器也確實連上了那個 `/dev/cu.usbmodem***`（也就是板載 WCH-Link 虛擬出來的那個串列埠裝置），可就是**一個字都收不到**。這時候很容易開始懷疑鮑率錯了、驅動裝錯了、甚至懷疑板子壞了。

### 根因：其實特別簡單

打開程式碼一看就秒懂——**PlatformIO 預設生成的那份範本程式碼，壓根就沒有初始化串列埠，程式碼裡也沒有任何一行 `printf`**。它單純就是個「設定 GPIO → while 迴圈裡翻轉電位 → 延時」的純點燈程式，從頭到尾沒有往串列埠發送過一個位元組，串列埠收不到東西是理所當然的——不是電路壞了，是程式碼壓根沒打算跟你說話。

> 板載 WCH-Link 虛擬出來的串列埠（業內叫 VCP，虛擬串列埠），預設橋接到目標晶片的 **USART1（對應 PA9 = TX，PA10 = RX）**。硬體鏈路完全是通的，只是程式自己什麼都沒往外發。

### 解決：加上初始化 + printf

前面第九章我們已經認識過 `debug.h` 裡的 `USART_Printf_Init()` 函式了，現在正式用上它，兩行程式碼就能解決：

```c
Delay_Init();

// USART1 (PA9/PA10) 走板載 WCH-Link 的虛擬串列埠；SDK 的 _write 已經把 printf 重新導向到這裡了
USART_Printf_Init(115200);
printf("CH32V307 booted, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);
```

再在 `while(1)` 迴圈裡補一句列印，方便即時看到程式在跑：

```c
while (1) {
    GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
    printf("LED %u\r\n", ledState);
    ledState ^= 1;
    Delay_Ms(100);
}
```

重新編譯燒錄，串列埠立刻活了：

```
CH32V307 booted, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

> **小提示**：加上 `printf` 之後，Flash 占用會從 0.7%（1728 位元組）左右漲到大約 2.8%（7440 位元組左右），因為 `printf` 會把整套格式化字串的處理邏輯一起連結進韌體——這是正常現象，`printf` 從來都不是「免費」的，屬於用空間換除錯體驗，不用慌張，也不用去糾結這幾 KB。

### 以後串列埠沒輸出，按這個順序排查

把這次的經驗總結成一個通用的排查清單，存起來，以後遇到類似問題直接對著查：

1. **程式碼裡到底有沒有真的呼叫 `USART_Printf_Init` + 真的寫了 `printf`？**（本文最常見、也是最容易被忽略的一個坑，先查這個）
2. **鮑率對不對？** 程式碼裡的 `USART_Printf_Init(115200)` 要跟 `platformio.ini` 裡的 `monitor_speed` 保持一致，兩邊隨便一個改了沒同步，收到的就是亂碼或者空白。
3. **WCH-Link 的虛擬串列埠功能有沒有被意外關掉？**（可以在 WCH 官方的 WCH-LinkUtility 工具裡檢查）
4. **你要的到底是不是「晶片自己變成 USB 串列埠」（USB CDC）？** 如果是，那是另外一套需要 USB 協定棧的韌體方案，跟這裡講的走 USART1 + WCH-Link 橋接完全是兩條不同的路，別搞混了。

---

## 十四、坑②（全文最大的坑）：串列埠都會說話了，燈卻死活不亮

這是整個折騰過程裡最讓人抓狂的一個坑，因為**它跟軟體幾乎沒關係**，純純的硬體設計問題，程式碼寫得再對也無解。花點耐心看完這一節，能幫你省下至少半小時對著程式碼抓頭髮的時間。

### 現象

串列埠這時候已經能正常列印了（說明韌體確實在正常執行，根本沒有卡死、沒有 HardFault），**但板子上死活看不到任何一顆 LED 在閃**。

### 根因：板載使用者 LED 出廠就是「斷頭」的

**這塊板子上的兩顆使用者 LED（絲印 LED1、LED2），出廠時壓根就沒有接到 MCU 腳位上，是純懸空的。** 具體說，它們只有一端接了 GND，另一端就是一個孤零零的裸焊盤或者排針孔，晾在那裡等你自己接線——這不是某塊板子的個例品質問題，而是 WCH 官方電路圖（`CH32V30xSCH.pdf`）本來就是這樣設計的。

也就是說：**不管你的程式碼是在翻轉 PC1、PD0 還是 PA0，只要沒有拿一根實體的杜邦線把那個腳位接到 LED 焊盤上，LED 永遠不會亮，這是一個純硬體問題，軟體程式碼寫得再花哨也無濟於事。**

這個坑還不是我一個人踩到的，能找到好幾個獨立信源互相印證：Zephyr 官方文件在這塊板子的說明裡明確寫著「板載 LED 在電路設計上並沒有連接到 SoC」；一篇中文的沁恒 CH32V307EVT-R1 使用說明也提到，板子上的兩顆使用者 LED 並沒有連接到任何 GPIO 腳位，需要使用者自己手動接線才能點亮。板載的使用者按鍵 KEY 同理，也是懸空的，同樣的坑還得再踩一次。

> **那塊板子上唯一預設就接好、通電就亮的燈，是電源指示燈**——就是你剛插上 USB 那一刻就常亮的那顆，跟你的程式碼毫無關係，很容易被誤認成「我點燈成功了」，其實它壓根不受 MCU 控制。

### 修復：軟體 + 硬體兩步走

**第一步：選定要翻轉的腳位**

WCH 官方自己的 GPIO 範例程式碼裡，慣用的是 **PA0** 這個腳位，資料最全、社群討論最多、最不容易踩額外的坑，所以我們把程式碼裡點燈用的腳位統一對齊到 PA0：

```c
// EVT-R1 的使用者 LED 預設懸空（未接 MCU），需要用一根杜邦線把 PA0 橋接到 LED1 才會亮
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)
```

> ⚠️ **一個連帶的小坑**：如果你是從別的埠（比如原本範本裡的 PC1）改成 PA0，**一定要記得把時脈使能那一行也同步改成 `RCC_APB2Periph_GPIOA`**。這裡踩過一次實實在在的坑：只改了腳位定義、忘了把時脈使能改到對應的 GPIOA，結果就是 GPIOA 週邊的時脈壓根沒打開，PA0 電位紋絲不動，查了半天程式邏輯，最後發現是「改一處漏一處」的典型失誤。改完埠設定之後，一定要把相關的所有巨集定義整體檢查一遍，別只改一半。

**第二步：接一根實體的杜邦線（二選一）**

- **方案 A（用板載 LED1，WCH 官方推薦做法）**：找一根杜邦線，一頭接到 **PA0**（Arduino 母座上標著 `A0` 的那個孔），另一頭接到板子上絲印標著 `LED1` 的那個焊盤。焊盤的具體位置可以對照 EVT 資料包裡的 `CH32V30xSCH.pdf` 電路圖找。
- **方案 B（自己外接一顆 LED，最穩妥、最直觀）**：找一顆普通 LED，串聯一個 330Ω~1kΩ 的限流電阻，接在 **PA0 和 GND** 之間。極性接反了也沒關係，因為程式碼是在不斷翻轉高低電位，正接反接總有一個方向能被點亮，唯一的區別是「哪半個週期亮」。

接好線之後，重新執行 `pio run -t upload`，LED1 會以 100ms 的節奏開始閃爍，同時串列埠同步刷出 `LED 0 / LED 1`，這時候才是真正意義上的「Hello World」跑通了。🎉

> **為什麼 WCH 要把 LED 設計成懸空的？** 大概率是出於「給開發者更大自由度」的考慮——你可以把 LED 或按鍵連到你專案裡任意想用的 GPIO，不被出廠焊死的某個固定腳位綁住手腳。出發點是好的，但對第一次上手的新手極度不友好，因為你打開板子的第一反應，肯定不會是「我需要先接根線才能點燈」，而是「我程式碼是不是哪裡寫錯了」。

### 一個更深層的心得：先分清是軟體問題還是硬體問題

這個坑真正的價值不在於「記住 PA0 要接杜邦線」這個具體細節，而在於它教會你一個嵌入式除錯裡通用的排查思路：

**「沒反應」不等於「程式碼錯了」。** 遇到週邊沒反應，第一件事應該是想辦法證明「韌體到底有沒有真的跑到那段邏輯」，而不是一上來就死磕程式邏輯。這次能這麼快定位到是硬體問題而不是程式碼問題，靠的就是**串列埠先出字了**——串列埠能正常列印，就說明主迴圈在正常跑、沒有卡死在什麼地方，把「軟體層面工作正常」這件事先確認下來，剩下的「沒反應」基本就能鎖定在硬體鏈路上了。這也是為什麼建議大家新專案第一件事就是先把串列埠打通——它是排除故障最快、最直觀的一把尺子。

---

## 十五、跑通之後：完整的 `main.c` 長什麼樣

把前面兩個坑的修複合起來，這是最終能正常工作的完整程式碼，比 PlatformIO 生成的原始範本多了串列埠初始化和列印語句：

```c
#include <ch32v30x.h>
#include <debug.h>

// EVT-R1 的使用者 LED 預設懸空（未接 MCU），需要用一根杜邦線把 PA0 橋接到 LED1 才會亮
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

    // USART1 (PA9/PA10) 走板載 WCH-Link 的虛擬串列埠；SDK 的 _write 已把 printf 重新導向到這裡
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

程式碼結尾這兩個中斷處理函式值得提一句：`NMI_Handler` 和 `HardFault_Handler` 是 RISC-V/ARM 單晶片裡非常常見的兩個「異常兜底」函式，`__attribute__((interrupt("WCH-Interrupt-fast")))` 這個修飾符告訴編譯器「這是個中斷服務函式，請按中斷的方式生成程式碼」（比如自動儲存和恢復暫存器現場）。這裡的實作很簡單——`HardFault_Handler` 裡直接 `while(1){}` 死循環卡住，是一種保守但有效的兜底策略：一旦程式真的跑飛、觸發硬體異常，與其讓晶片帶著錯誤狀態繼續亂跑，不如先卡在這裡，方便你接除錯器進來查看當時的狀態。以後專案做大了，可以在這裡加上錯誤日誌、LED 警報燈之類的邏輯，現在先知道它的作用就夠了。

完整專案程式碼（包含 `platformio.ini`）我放在了 GitHub 上，連結見文末，可以直接 clone 下來跑。

---

## 十六、踩坑總結表

把全文所有坑集中列一遍，方便以後翻查：

| # | 現象 | 根因 | 解決 |
| --- | --- | --- | --- |
| 1 | 裝平台報 `repository not found` | GitHub 組織名拼錯，應為 `Community-PIO-CH32V`（帶 PIO，大寫） | 用正確的組織名地址 |
| 2 | `pio platform install` 提示 deprecated | 新版 PlatformIO 統一用 `pkg` 子命令 | 改用 `pio pkg install -g -p <地址>` |
| 3（核心） | 平台裝好了，工具鏈目錄裡全是 `.exe`，編譯必然失敗 | `platform.json` 把工具鏈來源硬編碼成 Windows 倉庫，安裝時不判斷作業系統 | 刪掉 Windows 版，手動裝 `toolchain-riscv-mac` 和 `tool-wlink`（`mac_arm64`/`mac_x64` 分支） |
| 4 | 裝錯工具鏈分支，編譯報編譯器可執行檔找不到 | 建置腳本按工具鏈版本號第二段自動選編譯器前綴（`1.8.x`→`riscv-none-embed`，`1.12.x`→`riscv-wch-elf`），裝的版本和實際存在的可執行檔對不上 | 先用 `ls` 看清楚實際裝出來的可執行檔叫什麼名字，再對應使用 |
| 5 | 執行編譯器/燒錄器報「開發者無法驗證」或 `killed: 9` | macOS 給網路下載的未簽章二進位加了隔離屬性 | `xattr -dr com.apple.quarantine <目錄>` |
| 6 | 擔心 x86_64 架構的編譯器在 Apple Silicon 上「水土不服」 | xPack 早期沒有 arm64 建置，需要 Rosetta 2 轉譯 | 不是問題，裝上 Rosetta 後編譯完全正常 |
| 7 | 想把 `pio` 軟連結到 `/usr/local/bin` 失敗 | 該目錄由 root 擁有，普通使用者沒有寫入權限 | 改用 `/opt/homebrew/bin` 或自建 `~/.local/bin` 並加入 PATH |
| 8 | 編譯、燒錄都成功，串列埠監視器一片空白 | 範本程式碼只是純點燈迴圈，**沒有初始化串列埠、沒有任何 `printf`** | 呼叫 `USART_Printf_Init(115200)`，正常使用 `printf`（SDK 已把它重新導向到 USART1） |
| 9（本文最大坑） | 串列埠已經能正常列印了，但板上看不到任何 LED 在閃 | **板載使用者 LED 出廠預設懸空，壓根沒接到 MCU 腳位** | 接一根杜邦線，PA0 橋接到 LED1（或者自己外接 LED + 限流電阻到 GND） |
| 10（衍生坑） | 改用 PA0 之後 LED 還是不亮 | 改埠時**漏改了對應的時脈使能巨集** | 埠定義和時脈使能必須同步修改，改完整體複查一遍 |

**這次踩坑最大的收穫，濃縮成一句話**：嵌入式開發裡，「沒反應」從來不等於「程式碼寫錯了」，先想辦法分清楚是**軟體問題**（韌體到底有沒有真的執行到那段邏輯）還是**硬體問題**（物理鏈路通不通、週邊到底接沒接）。讓串列埠先開口說話，是排除故障最快、最省心的一步棋，永遠優先把它調通。

---

## 十七、關鍵指令與檔案路徑速查

日常開發最常用的幾條命令：

```bash
# === 編譯 / 燒錄 / 監視 ===
pio run                # 只編譯
pio run -t upload      # 編譯 + 燒錄
pio device monitor      # 打開串列埠監視器（Ctrl+C 退出）

# === 查 WCH-Link 除錯器韌體版本 & 已連接晶片資訊（排查連接問題時最常用）===
~/.platformio/packages/tool-wlink/wlink status

# === 查各工具版本 ===
~/.platformio/packages/tool-wlink/wlink --version    # 燒錄工具版本
pio --version                                          # PlatformIO Core 版本

# === 查編譯器版本（按最終確認環境，前綴是 riscv-wch-elf-）===
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# 如果你裝出來的是老版本 gcc8/x86_64，檔名對應換成：
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
```

`wlink status` 的典型輸出，能一眼看到除錯器韌體版本、目標晶片型號、實際 Flash 容量、晶片 UID 等資訊，排查連接問題時非常好用：

```
[INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
[INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
[INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
[INFO] Flash protected: false
[INFO] RISC-V ISA(misa): Some("RV32ACFIMUX")
[INFO] RISC-V arch(marchid): Some("WCH-V4F")
```

> 如果要升級 WCH-Link 除錯器本身的韌體，需要用官方的 **WCH-LinkUtility** 工具，目前這個工具只有 Windows 版，沒有 Mac 版，這也是整個 macOS 生態還不夠完善的一個小遺憾。

關鍵檔案路徑也整理一份，出問題的時候能快速定位：

| 用途 | 路徑 |
|---|---|
| PlatformIO Core 本體 | `~/.platformio/penv/bin/pio` |
| 已安裝的平台 | `~/.platformio/platforms/ch32v/` |
| 工具鏈 / 燒錄 / 除錯工具 | `~/.platformio/packages/{toolchain-riscv,tool-wlink,tool-openocd-riscv-wch}` |
| board 定義檔 | `~/.platformio/platforms/ch32v/boards/ch32v307_evt.json` |
| 平台建置腳本（前面挖 triple 邏輯那段就在這） | `~/.platformio/platforms/ch32v/builder/main.py` |
| 編譯產物 | `<專案目錄>/.pio/build/ch32v307_evt/firmware.{elf,bin}` |

`ch32v307_evt` 這個 board 定義裡的關鍵參數，也順手彙總一下：

| 欄位 | 值 |
|---|---|
| MCU 型號 | CH32V307VCT6 |
| 主頻 | 144 MHz |
| march / mabi（編譯目標 ABI） | rv32imacxw / ilp32 |
| Flash / SRAM（board 預設值） | 256 KB / 64 KB（晶片實際有 288KB Flash，見第九章說明） |
| 板載除錯器 | WCH-Link |
| USB VID:PID | 1a86:8010 |
| 支援的燒錄協定 | wch-link, wlink, minichlink, isp |

---

## 十八、建立自己的「CH32 開發邏輯」，以後拿到新專案直接抄作業

折騰一圈下來，最值錢的不是記住了多少個具體命令，而是形成一套可以重複使用的思考框架。以後不管是繼續玩 CH32V307，還是換一款 CH32 系列的新晶片、新板子，都可以按這個套路走：

1. **先確認「平台 + 框架 + 板子」這三件套**：對應 `platformio.ini` 裡的 `platform`、`framework`、`board` 三行。這三行定了，PlatformIO 就知道該去哪裡下載工具鏈、該按哪套腳位定義編譯。
2. **平台裝完先別急著寫程式碼，檢查一下工具鏈是不是「對的國籍」**：尤其是社群維護、非官方一線支援的平台，很可能預設只適配了 Windows 或 Linux。裝完先 `ls` 一眼工具鏈目錄、`file` 一下關鍵二進位，確認架構對不對，能省下大把排錯時間。
3. **遇到未簽章二進位執行報錯，先想到 Gatekeeper**：`cannot be opened` / `killed: 9` 這類報錯，八成是隔離屬性在作祟，`xattr -dr com.apple.quarantine` 一把梭。
4. **燒錄/編譯都成功但週邊沒反應，先分清軟體問題還是硬體問題**：串列埠先跑通，是最快的排除法——串列埠有輸出，說明韌體在正常執行；沒輸出，回去檢查有沒有漏初始化。
5. **預設不要相信板子上的「使用者週邊」已經接好**：LED、按鍵這類板載週邊，很多評估板出於靈活性考慮，出廠是不接的，用之前對照電路圖確認一下，別急著懷疑程式碼。
6. **善用 `debug.h`（或者對應框架提供的除錯輔助函式庫）**：幾乎每個廠家 SDK 都會準備好延時函式和 `printf` 重新導向，不用自己造輪子。
7. **版本號是會變的，排查思路才是能抄得走的**：社群工具鏈會持續更新，你裝的時候具體版本號跟教學不一樣很正常，理解「為什麼」比死記「是什麼」更重要——這條本文自己就是活生生的例子。

把這套思路記下來，下次拿到任何一款新的嵌入式開發板，基本都能照著這個順序快速摸清門道。

---

## 十九、常見問題 FAQ

**Q1：為什麼不直接用官方的 MounRiver Studio？它不是也有 Mac 版嗎？**

A：MounRiver Studio 確實出了 Mac 版，但據社群回饋，它內建的 OpenOCD 在 Mac 上問題不少，感覺像是沒有經過認真的 Mac 端適配和測試；而且是個相對封閉的一體化 IDE，工具鏈版本你沒辦法自己把控。PlatformIO 基於 VSCode，工具鏈完全可控、社群活躍、還能跨平台保持一致的開發體驗，綜合下來更值得折騰這一趟。

**Q2：能不能用 Homebrew 裝個 RISC-V 工具鏈來代替，省得手動替換？**

A：技術上可以，但不推薦用在這個平台上。因為平台自己的建置腳本是靠 PlatformIO 的套件管理機制去定位工具鏈目錄的（`get_package_dir("toolchain-riscv")` 這類呼叫），換成 Homebrew 裝的工具鏈需要額外寫設定去覆蓋預設行為，反而更麻煩。老老實實用本文提到的 `toolchain-riscv-mac` 包最省心。

**Q3：工具鏈會不會因為以後升級平台又被退回 Windows 版？**

A：有可能。如果之後執行 `pio pkg update` 或者重新安裝整個平台，`platform.json` 裡預設寫的還是 Windows 倉庫地址，可能會把你手動換好的 macOS 版本覆蓋掉。屆時重複一遍第六章的替換步驟就行，或者更徹底一點，自己 fork 一份平台倉庫、把 `platform.json` 改成預設就是 macOS 版，一勞永逸。

**Q4：編譯報連結錯誤，或者提示某個編譯器命令找不到，是怎麼回事？**

A：大概率是工具鏈版本和編譯器可執行檔前綴對不上（對應第十六章的坑 4）。先確認一下你實際裝出來的編譯器叫什麼名字（`riscv-wch-elf-gcc` 還是老版本的 `riscv-none-embed-gcc`），確保命令和實際檔案對得上號，具體可以對照第六章的最終確認環境表。

**Q5：燒錄報「找不到 WCH-Link 裝置」怎麼辦？**

A：按這個順序排查：① 確認插的是連著 WCH-Link 的那個 USB 埠，不是 USB-Device 埠；② 確認除錯器處於 RV 模式而不是 DAP 模式；③ 用 `system_profiler SPUSBDataType | grep -A5 1a86` 看看系統有沒有正常識別到 USB 裝置（`1a86:8010` 是這顆除錯器的 VID:PID）。

**Q6：這套平台支援哪些晶片和開發框架？以後想換別的板子方便嗎？**

A：晶片方面覆蓋了 CH32V003/103/203/30x、CH32X035、CH56x/57x/58x/59x 等一大票型號；框架方面除了本文用的 noneos-sdk，還支援 FreeRTOS、RT-Thread、TencentOS、Harmony LiteOS、Arduino、ch32fun、Zephyr 等。換板子基本上就是改 `platformio.ini` 裡的 `board` 和 `framework` 兩行，其他排坑經驗（工具鏈架構、Gatekeeper 隔離、週邊預設懸空）大概率還是通用的。

---

## 二十、跑通之後，還能繼續玩什麼

Hello World 只是起點，跑通之後可以繼續往下探索：

- **多路 GPIO / 按鍵中斷**：板載的使用者按鍵 KEY 同樣是懸空的，接上線之後可以練習 EXTI 外部中斷的用法。
- **USB CDC**：讓 CH32V307 自己枚舉成一個 USB 串列埠裝置，不再借助 WCH-Link 橋接的 USART1——這是另一套需要 USB 協定棧的韌體方案，進階內容。
- **用滿 288KB Flash**：需要先用 WCH 官方工具改晶片的 option bytes，再同步修改 `platformio.ini` 裡 `board_upload.maximum_size` 那幾行註解。
- **上手 FreeRTOS / RT-Thread**：把 `framework` 換成對應的 RTOS，體驗多工排程。
- **認真學一下除錯**：用 OpenOCD + GDB 配合 F5 中斷點除錯（`pio debug`），把嵌入式除錯這門手藝練扎實。

---

## 二十一、參考資料

- Community-PIO-CH32V 平台倉庫：`github.com/Community-PIO-CH32V/platform-ch32v`
- macOS 工具鏈包：`github.com/Community-PIO-CH32V/toolchain-riscv-mac`
- 工具鏈 releases（盯 PIO 這邊的新版）：`github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`
- WCH 官方 MounRiver（WCH 訂製工具鏈 + IDE 的源頭）：`www.mounriver.com`
- wlink（macOS 分支）：`github.com/Community-PIO-CH32V/tool-wlink`（分支 `mac_arm64` / `mac_x64`）
- 官方文件：`pio-ch32v.readthedocs.io`
- xPack RISC-V GCC（工具鏈上游）：`github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack`
- wlink 原始專案：`github.com/ch32-rs/wlink`
- WCH 官方產品頁：`www.wch.cn/products/CH32V307.html`
- OpenWCH 官方 SDK/範例：`github.com/openwch/ch32v307`
- Zephyr 官方文件中關於本板 LED 懸空的說明
- PlatformIO 官方文件：`docs.platformio.org`

---

*完整專案程式碼已同步發佈到 GitHub，歡迎 clone 下來直接跑。如果你在自己折騰的過程中遇到本文沒覆蓋到的新坑，歡迎在留言區交流——畢竟 macOS 上玩 CH32V 的資料還是太少了，多一個人分享經驗，後面的人就能少踩一個坑。祝你的 LED 早日亮起來！🎉*

https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/CH32V/CH32V307-EVT-R1/01%20HelloWorld
