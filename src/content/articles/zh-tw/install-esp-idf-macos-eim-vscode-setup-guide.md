---
title:      "在 macOS 上裝 ESP-IDF v6.0.2：從 `brew install` 報錯到 VSCode 認到 setup"
domain:     hardware
platforms:  ["mac"]
format:     "tutorial"
relatedBoards: ["esp32s3"]
date:       2026-07-20
intro:      "命令列裝 ESP-IDF 一切正常，VSCode 擴充功能卻死活報 setup not found？這篇照著真實踩坑過程原樣記錄：從 Homebrew 裝 eim、用 EIM 裝 ESP-IDF v6.0.2、清掉從 Windows 帶過來的專案殘留，一路挖到 VSCode 擴充功能「找不到 setup」的真正根因——設定項作用域寫錯了地方。命令和報錯都是實跑出來的，遇到同樣報錯可以直接複製去搜。"
tags:       ["ESP-IDF 安裝", "ESP-IDF macOS", "EIM", "ESP32-S3", "VSCode setup not found", "ESP-IDF 設定"]
image: https://img.lingflux.com/2026/07/79ed5dc15e35419e612ab982e595d127.png
---

# 在 macOS 上裝 ESP-IDF v6.0.2：從 `brew install` 報錯到 VSCode 認到 setup

之前手動裝過兩次 ESP-IDF，兩次都在某個環節卡住，最後乾脆把整個過程重新走了一遍，把每個報錯的根因都挖出來了。走完才發現，坑其實不在「裝 ESP-IDF」這件事本身，而是分散在五個互不相關的地方：Homebrew 裝工具、EIM 的網路存取、VSCode 裡裝對擴充功能、專案裡從 Windows 帶過來的幾個檔案、VSCode 擴充功能讀設定的方式。命令列裝好之後一切正常，但 VSCode 擴充功能死活報 "setup not found"，這個問題排查起來最費時間，也是這篇文章的重點。

這篇是照著自己踩過的坑原樣記錄的，命令、報錯訊息都是實際跑出來的，遇到同樣報錯的話可以直接複製去搜尋，或者把這篇文章連同你自己的報錯一起丟給 AI，讓它按這個思路幫你定位。

> **在開始之前，先核對一下版本號。** ESP-IDF 從 v5.x 到 v6.0.2，安裝方式從傳統的 `install.sh` 換成了 EIM；VSCode 擴充功能從 1.x 到 2.x，找 setup 的邏輯整個重寫過。版本不一樣，尤其是第 4 步關於擴充功能設定的部分，很可能完全不適用。

## 環境版本

| 項目 | 版本 |
|---|---|
| 系統 | macOS，Apple Silicon（M 系列晶片） |
| ESP-IDF | v6.0.2 |
| 安裝工具 | EIM 0.17.1 |
| VSCode 擴充功能 | espressif.esp-idf-extension 2.1.0 |
| 目標晶片 | ESP32-S3 |

文中路徑按我本機的使用者名稱 `shawn` 寫的，照抄命令時記得換成你自己的使用者名稱（終端機裡輸入 `whoami` 就能看到）。另外我本地開著 Clash 代理，走的是 `127.0.0.1:7890`，如果你不需要代理，把命令裡帶 `PROXY` 字樣的環境變數和 `--mirror` 參數去掉就行，不影響主流程。

## 整體路線

五步走，越往後越隱蔽：

| 步驟 | 要做的事 | 常見狀況 |
|---|---|---|
| 0 | 用 Homebrew 裝 `eim` 這個工具本身 | 一個信任提示，容易被當成報錯 |
| 1 | 用 `eim` 裝 ESP-IDF v6.0.2 | 網路和版本號兩個坑 |
| 2 | 在 VSCode 裡裝 ESP-IDF 擴充功能 | 同名的擴充功能太多，很容易裝錯 |
| 3 | 清掉專案裡的 Windows 遺留檔案 | 只有從 Windows 搬過來的專案才會遇到 |
| 4 | 讓 VSCode 擴充功能認到裝好的 setup | 全文最隱蔽的坑，卡人最久 |

---

## 第 0 步：先把 `eim` 這個工具裝上

`eim` 全名 ESP-IDF Manager，是 Espressif 官方出的安裝管理工具，比舊的 `install.sh` 方便的地方在於可以裝多個 ESP-IDF 版本，互不衝突。裝它本身要先加一個 Homebrew 的 tap（第三方軟體源），再裝：

EIM官方安裝指南：
https://dl.espressif.com/dl/eim/index.html

```bash
brew tap espressif/eim
brew install eim
```

第一次跑 `brew install eim` 的時候，我遇到了這個提示：

```
Error: Refusing to load formula espressif/eim/eim from untrusted tap espressif/eim.
Run `brew trust --formula espressif/eim/eim` or `brew trust espressif/eim` to trust it.
```

> **這不是安裝失敗，是 Homebrew 的一道安全確認。** 較新版本的 Homebrew 對第三方 tap（也就是不在官方倉庫裡的軟體源）預設不直接信任，第一次用某個第三方 tap 裡的東西，都會先彈這麼一句，讓你自己確認要不要信任它。espressif 這個 tap 是官方的，放心信任即可：

```bash
brew trust espressif/eim
```

跑完這句之後再執行一次 `brew install eim` 就能正常裝上了。如果你在 `brew install` 之前先看到一大堆跟 eim 毫不相關的軟體名單（比如什麼選單列小工具、AI 改名工具之類的），那是 Homebrew 在列出「你現在有多少過期的套件」之類的無關訊息，不用管，往下翻到真正的報錯行就行。

裝完驗證一下：

```bash
eim --version
```

能正常輸出版本號就說明這一步過了，可以進入下一步正式裝 ESP-IDF。

---

## 第 1 步：用 EIM 裝 ESP-IDF v6.0.2

工具裝好之後，一條命令裝 ESP-IDF：

```bash
HTTPS_PROXY=http://127.0.0.1:7890 \
HTTP_PROXY=http://127.0.0.1:7890 \
ALL_PROXY=socks5://127.0.0.1:7890 \
eim install -i v6.0.2 -t esp32s3 -n true \
  --idf-mirror https://git.espressif.com.cn \
  --pypi-mirror https://pypi.mirrors.ustc.edu.cn/simple
```

各參數含義：

- `-i v6.0.2`：要裝的版本號，**必須帶 `v` 前綴**，原因下面細說；
- `-t esp32s3`：目標晶片；
- `-n true`：非互動模式，不然會卡在終端機問答裡等你按 Enter；
- `--idf-mirror` / `--pypi-mirror`：國內鏡像，原始碼走 Espressif 官方的中國鏡像，Python 包走中科大源，不需要可以去掉；
- 三個 `PROXY` 環境變數：給 EIM 內部存取 git 用的，原因也是下面細說的坑 1。

這條命令看著簡單，第一次跑的時候我踩了兩個坑，都是那種「表面在正常安裝，其實內部悄悄走了彎路」的類型。

### 坑 1：代理配在 git 裡沒用，EIM 不認

EIM 內部是用 Rust 的 `gix` 庫去拉取 IDF 原始碼的，這個庫不認 `git config --global http.proxy` 這種傳統設定方式，只看 `HTTPS_PROXY`、`HTTP_PROXY`、`ALL_PROXY` 這幾個系統環境變數。如果你的代理只配在 git 的設定檔裡，沒有對應的環境變數，`gix` 會嘗試直連，拉取過程中反覆失敗，紀錄裡會刷這種東西：

```
WARN - Attempt N failed: "Failed to fetch: Failed to consume the pack sent by the remote"
```

失敗三次之後 `gix` 會自動退回去用系統自帶的 git（系統 git 認 git config，能正常走代理），所以最後大概率還是能裝上，但白白多等幾分鐘，而且這種「回退」出來的 clone 狀態不算太乾淨。省事的辦法就是一開始就把代理變數直接放進命令裡，讓 `gix` 一次走通，不用等它失敗三次再回退。

### 坑 2：版本號不帶 `v` 會報錯

Espressif 官方倉庫的 release tag 全都是 `v6.0.2` 這種帶 `v` 的格式，EIM 的 `-i` 參數是直接拿去當 git tag 名用的。如果寫成 `-i 6.0.2`（不帶 v），會報：

```
fatal: Remote branch 6.0.2 not found in upstream origin
```

這個報錯其實也是 `gix` 失敗之後，系統 git 接手 fallback 時報的——git 在遠端找不到一個叫 `6.0.2`（沒有 v）的分支。寫成 `-i v6.0.2` 就沒問題了。如果不確定某個版本的 tag 到底怎麼寫，可以先查一下遠端有哪些：

```bash
git ls-remote --tags https://git.espressif.com.cn/espressif/esp-idf.git 'v6.0*'
```

### 裝完怎麼驗證

```bash
eim list
# 應該能看到 v6.0.2 (selected)

source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py --version
# 輸出 ESP-IDF v6.0.2 說明裝好了
```

### 裝完之後東西都在哪

EIM 裝出來的目錄結構和傳統方式不太一樣，後面所有設定都要引用這幾個路徑，先心裡有個數：

```
IDF 原始碼     ~/.espressif/v6.0.2/esp-idf
工具鏈         ~/.espressif/tools/
Python venv    ~/.espressif/tools/python/v6.0.2/venv
啟用腳本       ~/.espressif/tools/activate_idf_v6.0.2.sh
EIM 安裝清單   ~/.espressif/tools/eim_idf.json
```

要特別提一下 Python 虛擬環境的位置，它藏在 `tools/python/v6.0.2/venv` 裡，不是舊版本裡常見的專案根目錄下的 `python_env/`，第一次找的時候很容易懵。

---

## 第 2 步：在 VSCode 裡裝 ESP-IDF 擴充功能

命令列這邊裝好之後，回到 VSCode，打開擴充功能面板（`Cmd+Shift+X`），搜尋 "ESP-IDF"。

> **這一步很多人會裝錯，務必核對清楚發布者。** 搜尋結果裡會出現好幾個名稱相似、圖示也差不多的擴充功能，光看名稱很容易點錯。核對下面這幾個資訊，確認是同一個再點安裝：

| 欄位 | 內容 |
|---|---|
| 擴充功能名稱 | ESP-IDF |
| 發布者 | Espressif Systems |
| 發布者首頁 | espressif.com |
| 安裝量 | 1,582,039 |
| 評分 | 145 條評價 |
| 簡介 | Develop and debug applications for Espressif chips with ESP-IDF |

**認擴充功能認發布者，不要只認名稱。** 發布者一欄必須是 **Espressif Systems**，網域是 **espressif.com**，安裝量在百萬級別——這幾個是這款官方擴充功能比較明顯的特徵。裝錯擴充功能的話，後面第 4 步講的那些設定項（`idf.eimIdfJsonPath`、`idf.currentSetup` 等）可能根本不存在，或者行為完全對不上，排查起來會很莫名其妙，本質原因其實是一開始就裝錯了擴充功能。

裝好之後，重啟一下 VSCode（或者 `Cmd+Shift+P` → `Reload Window`），讓擴充功能生效，再往下走。

---

## 第 3 步：專案是從 Windows 搬過來的，先清三個檔案

**如果你的專案是全新建的，這一步可以直接跳過。** 但如果是從 Windows 電腦拷過來的專案，幾乎一定會踩這一節的坑——有三個檔案裡藏著 Windows 專屬的路徑，拷到 macOS 上直接失效。

### ① `.vscode/settings.json`

把裡面 `C:\...` 這種 Windows 路徑、串埠名（比如 `COM22`）、舊版本號，全部換成 macOS 這邊的實際值：

```jsonc
{
  "idf.espIdfPath": "/Users/shawn/.espressif/v6.0.2/esp-idf",
  "idf.toolsPath":  "/Users/shawn/.espressif",
  "idf.pythonInstallPath": "/Users/shawn/.espressif/tools/python/v6.0.2/venv/bin/python",
  "idf.port": "/dev/cu.usbmodemXXXXXXXXXXX",
  "idf.customExtraVars": { "IDF_TARGET": "esp32s3" },
  "idf.flashType": "UART"
}
```

自己的串埠裝置名用這條命令查：

```bash
ls /dev/cu.usb*
```

### ② `.vscode/c_cpp_properties.json`

`compilerPath` 裡原來指向的是 Windows 版的 `xtensa-esp32s3-elf-gcc.exe`，而且工具鏈版本號大概率也是舊的，要換成 Mac 上實際裝的那個版本。建議別把路徑寫死，跟著 `toolsPath` 這個變數走，以後升級也不用改：

```jsonc
"compilerPath": "${config:idf.toolsPath}/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc"
```

`esp-15.2.0_20251204` 這段版本號不是隨便抄的，要去 `~/.espressif/tools/xtensa-esp-elf/` 目錄下看看實際裝的是哪個資料夾，照實際的填。

### ③ `dependencies.lock` —— 最容易漏掉的一個

這是 idf-component-manager（組件管理器）生成的鎖定檔，Windows 上生成的是舊的 v2.0.0 格式，裡面會把本地 component 的**絕對路徑**也記進去，比如原作者電腦上的目錄：

```yaml
espressif/esp_lcd_touch:
  source:
    path: C:\Users\PC\Desktop\...\espressif__esp_lcd_touch
    type: local
```

到 Mac 上跑 reconfigure 的時候這個路徑當然不存在，會報：

```
CMake Error: The "path" field in the manifest file ... does not point to a directory.
```

這個檔案本質是自動生成的快取檔，刪掉讓它自己重建最省事：

```bash
rm dependencies.lock
rm -rf build
source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py reconfigure
```

重新生成後會變成 v3.0.0 格式，路徑變成本地化的，registry 裡的組件會重新下載到 `managed_components/` 目錄下。

**到這一步，命令列的 `idf.py build` 應該已經能正常跑起來了。** 如果還跑不過，說明問題不在這幾個檔案裡，得到別的地方查。

---

## 第 4 步：VSCode 擴充功能說 "setup not found"（真正卡人的地方）

命令列一切正常之後，我以為大功告成，結果打開 VSCode，狀態列一直顯示這句話：

```
Current ESP-IDF setup is not found.
```

Reload 了兩次視窗，改了幾個看起來相關的設定項，都沒用。後來把擴充功能的原始碼（`dist/extension.js`）翻出來看了一下，才搞明白它找 setup 的完整邏輯：

1. 從 `idf.eimIdfJsonPath` 指向的 `eim_idf.json` 檔案裡，讀出一份已安裝的 setup 清單；
2. 拿 `idf.currentSetup` 的值去這份清單裡按路徑匹配；
3. 匹配不到就把清單挨個遍歷一遍，看有沒麼能驗證通過的；
4. 全部失敗，才報那句 "not found"。

這套邏輯能成立的前提是第 1 步那份清單得先載入出來。我走了兩條彎路才找到根因，第一條其實是白折騰、不用照做，第二條才是真正要動手改的地方，先說明白，免得跟著文章操作的時候拿不準該不該動：

- **彎路一：不需要操作，看看原理就好，跳過即可；**
- **彎路二：需要操作，這才是真正的修復步驟。**

### 彎路一（不用管，了解一下即可）：`idf.currentSetup` 到底該填什麼

這個設定項官方描述寫的是 "Current ESP-IDF setup id in eim_idf.json path"，字面上看像是要填一個 ID（編號）。但翻原始碼，擴充功能自己選中某個 setup 之後，實際寫進去的其實是這樣：

```js
await _o("idf.currentSetup", c.idfPath, ConfigurationTarget.WorkspaceFolder, e)
```

寫進去的是 `idfPath`，也就是一段**路徑**，不是編號。所以如果這一項自己出現在工作區設定裡，應該長這樣：

```jsonc
"idf.currentSetup": "/Users/shawn/.espressif/v6.0.2/esp-idf"
```

但這一項**不需要你手動去改**——它不是根因。只要下面彎路二那份 setup 清單能正常載入出來，擴充功能會自己遍歷找到唯一裝著的 v6.0.2，然後把路徑自動回寫進 `currentSetup`，這一步是擴充功能自己完成的。這裡放出來純粹是解釋原理，方便你看到這個欄位時知道它是做什麼用的，不用因為它「看起來不對」就去手動修改。真正要動手修的是下面這條。

### 彎路二（真正要操作的地方）：`idf.eimIdfJsonPath` 的作用域不對

VSCode 的設定項分好幾種作用域（scope），`idf.eimIdfJsonPath` 這一項的作用域是 **`application`**——意味著它**只在全域的 User settings.json 裡生效**，寫在專案自己的 `.vscode/settings.json` 裡是完全不會被讀取的，寫了也是白寫。

我之前一直把 `eimIdfJsonPath` 寫在專案的工作區設定裡，導致擴充功能根本載入不到 `eim_idf.json` 這個檔案，第 1 步說的那份 setup 清單永遠是空的——空清單意味著不管 `currentSetup` 怎麼填都匹配不上，這才是前兩次 Reload 都不見效的真正原因。

> **修復方法：把 `idf.eimIdfJsonPath` 挪到全域設定檔裡。**

macOS 上 VSCode 的全域設定檔路徑是：

```
~/Library/Application Support/Code/User/settings.json
```

用編輯器打開這個檔案，加入這一行：

```jsonc
"idf.eimIdfJsonPath": "/Users/shawn/.espressif/tools/eim_idf.json"
```

工作區的 `.vscode/settings.json` 裡只留 `idf.currentSetup`（填成 idf 的路徑），千萬別把 `eimIdfJsonPath` 也放在工作區裡——放了也不生效，白白讓人誤以為已經設定對了。

改完之後，`Cmd+Shift+P` 打開命令面板，選 **Reload Window**。重新載入完，狀態列能正常顯示 ESP-IDF 版本號和目標晶片，就說明擴充功能終於認到了。

如果 Reload 之後還有問題，可以看擴充功能自己的即時紀錄：`Cmd+Shift+P` → `Output`，在輸出面板右上角的下拉選單裡選 **ESP-IDF** 這個頻道，報錯訊息會比狀態列那句話詳細得多。

### 不確定某個設定項的作用域？直接查，不用猜

VSCode 擴充功能的作用域資訊都寫在它自己的 `package.json` 裡，與其猜，不如寫幾行腳本直接查：

```bash
python3 -c "
import json
p = json.load(open('/Users/shawn/.vscode/extensions/espressif.esp-idf-extension-2.1.0/package.json'))
cfg = p['contributes']['configuration']
props = {}
if isinstance(cfg, list):
    for c in cfg:
        props.update(c.get('properties', {}))
else:
    props = cfg.get('properties', {})
for k in ['idf.eimIdfJsonPath', 'idf.currentSetup', 'idf.espIdfPath']:
    print(k, '->', props.get(k, {}).get('scope', 'window(預設)'))
"
```

---

## 速查表

### 設定項該寫在哪

| 設定項 | 作用域（scope） | 該寫在哪 |
|---|---|---|
| `idf.eimIdfJsonPath` | application | 全域 User settings |
| `idf.currentSetup` | resource | 工作區 `.vscode/settings.json` |
| `idf.espIdfPath` / `idf.toolsPath` / `idf.pythonInstallPath` | window | 工作區或全域都可以 |

### 關鍵路徑

```
IDF 原始碼     ~/.espressif/v6.0.2/esp-idf
工具鏈         ~/.espressif/tools/
xtensa gcc     ~/.espressif/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc
Python venv    ~/.espressif/tools/python/v6.0.2/venv/bin/python
啟用腳本       source ~/.espressif/tools/activate_idf_v6.0.2.sh
EIM 安裝清單   ~/.espressif/tools/eim_idf.json
全域 settings  ~/Library/Application Support/Code/User/settings.json
```

### 常用命令

```bash
brew tap espressif/eim                              # 新增官方 tap
brew trust espressif/eim                             # 首次使用第三方 tap 需要信任
brew install eim                                     # 安裝 eim 本身

eim list                                              # 查看已裝版本
eim install -i v6.0.2 -t esp32s3 -n true ...          # 安裝 ESP-IDF（參數見第 1 步）

source ~/.espressif/tools/activate_idf_v6.0.2.sh      # 在當前 shell 啟用 ESP-IDF 環境
idf.py set-target esp32s3                             # 設定目標晶片
idf.py reconfigure                                    # 只跑 cmake 設定，生成 compile_commands.json
idf.py build                                          # 編譯
idf.py -p /dev/cu.usbmodemXXXX flash monitor          # 燒錄並打開串口監視
```

---

## 排查順序：卡住了先按這個縮小範圍

不知道從哪下手的話，按這個順序一層層排除，比瞎試快得多：

1. **`brew install eim` 能不能裝上？** 裝不上，看提示是不是要求 `brew trust` —— 是的話直接信任即可，見第 0 步；
2. **`idf.py --version` 能不能跑？** 跑不了 → 問題在安裝或啟用這一層，見第 1 步；
3. **VSCode 擴充功能面板裡搜出來的東西對不對？** 裝完發現設定項對不上、或者擴充功能功能跟這篇文章描述的完全不一樣 → 先確認發布者是不是 Espressif Systems，很可能一開始就裝錯了擴充功能，見第 2 步；
4. **`idf.py reconfigure` 能不能跑通？** 跑不通 → 問題在專案檔案，重點查 `dependencies.lock`，見第 3 步；
5. **命令列都正常，VSCode 卻報 setup not found？** → 問題在擴充功能設定，重點查 `eimIdfJsonPath` 的作用域，見第 4 步。

兩個容易走偏的方向提前說一下，省得白折騰：

- v6.0.2 這個 tag 本身就沒有附帶 `version.txt` 檔案，這**不是** clone 漏了檔案，擴充功能本來也不讀這個檔案，看到缺失不用慌；
- `idf.currentSetup` 的值基本不是 setup not found 的根因，遇到這個報錯先別急著改它，優先確認 `eimIdfJsonPath` 是不是寫在了全域 settings 而不是工作區設定裡。

---

如果照著走完還是卡住，八成是版本對不上——ESP-IDF 的安裝方式、VSCode 擴充功能找 setup 的邏輯，這幾年變了不止一輪，舊教程未必適用於新版本。建議把你本地實際的 ESP-IDF 版本、EIM 版本、擴充功能版本，連同具體的報錯訊息，一起丟給 AI，對照這篇文章「裝工具 → 裝 IDF → 清專案檔案 → 設定擴充功能」這四步的思路去排查，通常比直接搜報錯關鍵字更快定位到底是哪一層出的問題。
