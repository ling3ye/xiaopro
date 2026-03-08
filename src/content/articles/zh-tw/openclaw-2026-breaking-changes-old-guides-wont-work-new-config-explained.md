---
title: "養龍蝦避坑手冊｜OpenClaw從安裝到操控瀏覽器，一篇全搞定"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-06
intro: "你有沒有試過裝完 OpenClaw 什麼都幹不了？本文作者親歷10次卸載重裝，徹底摸透了 OpenClaw 2026.3.2 版本的配置邏輯——從 API 接入、自定義服務商，到開放瀏覽器控制、文件讀寫權限，每一步都有截圖和命令對照。適合 macOS 用戶、新手入坑，以及被舊教程坑過的老用戶。"
image: "https://img.lingflux.com/2026/03/015705fbca42171bdf09fabe9220b546.webp"
tags: ["openclaw config guide", "openclaw 2026 setup", "openclaw tools profile", "OpenClaw 配置教學", "OpenClaw 權限設置", "OpenClaw 最新版本"]
---

大家養龍蝦都有一段時間了，感覺現在的版本應該比較穩定了，之前就名字都可以給我搞到一頭煙，明明是ClawdBot的網址，但安裝指令是install MoltBot，轉過頭又叫OpenClaw。這不是 bug，這是開源專案的傳統：先做，收到律師信再改名。（Claude 告 ClawBot 發音太像 Claude，從此Claw就更出名了）

這幾天在測試的時候，感覺天天都在更新，因為我為了搞明白配置的邏輯，我刪了又裝，裝了又刪，從

2026.2.25
2026.2.26
2026.3.1
2026.3.2
....

這更新的速度也太密集了，尤其是我測試最新版本2026.3.2（截稿日期為2026年3月6日）發現配置的方式有所改變，導致之前測試的行不通。這個版本感覺預設配置的安全性提高了，需要自己手動去配置更高權限。

OpenClaw我喜歡它可以操作瀏覽器，可以操作系統檔案，當然這也帶來很多安全問題，所以也必須要小心使用。要養好這個小龍蝦，就得花點時間學習怎麼配置。



## 在開始之前：你的 API 餘額夠用嗎？

OpenClaw 本身是開源免費的，但它要"動手"，得靠 AI 模型在背後驅動，而這需要 API token。

如果你的 token 快見底了，或者還沒配過，以下兩個平台目前性價比不錯，按需選擇：

- **智譜 GLM**：支援 Claude Code、Cline 等 20+ 工具，有限時訂閱優惠 → [連結](https://www.bigmodel.cn/glm-coding?ic=IPWNTCEXE2) （我現在正在用這個，注意這不是廣告！！！這不是廣告！！！這不是廣告！！！沒收錢的，廣告位正在招租）

​	![image-20260306102449045](https://img.lingflux.com/2026/03/52e663b49875f0ab36c9fc1f2ff806dd.png)

​	1，你的API KEY ：在控制中心找到API key 進行複製
​	2，GML的地址：https://open.bigmodel.cn/api/anthropic （適配Cladue code的地址）
​	3，模型名稱：GLM-4.7

​	以上3個資訊請先過目一下，在接下來的配置會需要用到

- **阿里雲百煉**：全量大模型，新用戶有免費額度 → [連結](https://www.aliyun.com/benefit/ai/aistar?clubBiz=subTask..12406352..10263..) （這個也不錯的，注意這也不是廣告！！！）

準備好之後，我們開始。





## 安裝OpenClaw開始吧

我的是macOS系統，這是養龍蝦的最好系統，因為作者就是用macOS系統開發的，問題是最少點，其他的windows，Raspberry PI OS，linux，可能會有點不一樣。但這個專案的貢獻者眾多，有大問題也能很快解決。

但我看從高到低最好的順序應該如下：

macOS > Linux > Windows > others

先去官網看看，有多種安裝方法：https://openclaw.ai/

### macOS快速安裝

在macOS系統中，官方有提供APP下載，但是我不知道為什麼我就是裝不上APP。用那個一條自動安裝的指令`curl -fsSL https://openclaw.ai/install.sh | bash`，又不是每次都成功，所以我選擇使用npm的安裝方式，指令行輸入：

```bash
# Install OpenClaw  | 安裝 OpenClaw
npm i -g openclaw
```

耐心等待安裝完成，之後繼續輸入：

```bash
# Meet your lobster ｜ 配置 OpenClaw
openclaw onboard
```

之後就是配置精靈的介面，慢慢查看一步一步選擇和配置API即可，大概過程如下：



### 1，這是在問你這的使用場景：

- **Personal（個人使用）**：只有你一個人用這台 Mac Mini → 選 **Yes**
- **Shared/multi-user（多人共用）**：多個用戶帳號共用這台機器，需要額外的權限管控 → 選 No

**你直接選 Yes 就好**，按回車確認繼續。

![image-20260306103540426](https://img.lingflux.com/2026/03/f4a9f8ac970e447eadd09b4533d4c6c0.png)



### 2，這是問你選擇哪種**安裝配置方式**：

- **QuickStart（快速開始）**：先快速裝好，細節配置（API密鑰、模型選擇等）之後再慢慢設置
- **Manual（手動）**：現在就一步步手動配置所有細節

------

**建議選 QuickStart**，原因：

- 可以先跑起來，之後再用 `openclaw config set` 慢慢調整
- 省時省力



![image-20260306104637473](https://img.lingflux.com/2026/03/e3a2171975e988818fbaf4a59195d72d.png)



### 3，關鍵：選擇**用哪家 AI 模型**來驅動 OpenClaw 的大腦。

簡單說就是：**OpenClaw 本身不提供 AI，需要你接入一個 AI 服務商**。

------

常見選項說明

| 選項                   | 說明                          |
| ---------------------- | ----------------------------- |
| **OpenAI**             | GPT-4o 等，最主流             |
| **Google**             | Gemini 系列                   |
| **XAI (Grok)**         | 馬斯克的 AI                   |
| **Moonshot AI (Kimi)** | 國產，支援中文很好            |
| **Mistral AI**         | 歐洲開源模型                  |
| **OpenRouter**         | 聚合平台，一個 key 用多個模型 |
| **Qianfan**            | 百度文心                      |
| **Volcano Engine**     | 字節跳動火山引擎              |
| **Hugging Face**       | 開源模型平台                  |

這裡的選擇非常關鍵，因為看網上說即使你選擇的是國內模型，但由於國內模型有分國內版本和國外版本的，所以你如果直接選擇這個列表中的國內模型供應商例如（Qwen，Z.AI等等）可能模型的入口url會有所出入。

所以我建議選擇 `Custom Provider`, 按下回車。（這樣模型的入口就是由你自己定義，一定不會錯）



![image-20260306104908514](https://img.lingflux.com/2026/03/f0f7b7cf1b38d23375a9c9d36a8abea8.png)



之後會見到，需要你輸入API Base URL ，這裡複製你對應的URL即可，演示中我的就複製剛才讓你過目的地址：
https://open.bigmodel.cn/api/anthropic   （輸入完成，按回車）

![image-20260306105524813](https://img.lingflux.com/2026/03/1bcc60387a3ba29b530e1bb53be24bf8.png)

問是否現在就輸入API KEY？選擇Paste API key now （現在輸入），按回車即可

![](https://img.lingflux.com/2026/03/05a5eca5b5fa006180662a65d2ae9381.png)

現在就把你的API KEY 複製後回車

![image-20260306105827355](https://img.lingflux.com/2026/03/291d99669c65b615d719844ddf743cee.png)

之後，這是問你選擇的 AI 服務商用的是**哪種介面格式**：

- **OpenAI-compatible**：介面格式跟 OpenAI 一樣，大多數模型服務商都支援這個格式（OpenRouter、Kimi、火山引擎、Mistral 等）
- **Anthropic-compatible**：介面格式跟 Anthropic（Claude）一樣

由於我的URL是兼容Claude Code的，所以選擇「Anthropic-compatible」即可

![image-20260306110230234](https://img.lingflux.com/2026/03/b515ca0d12b745463dee0ae52c35b1ab.png)

再之後，會讓你輸入模型ID，這個需要查看你的AI供應商API上的指定名稱是什麼，

演示這裡使用的GLM-4.7（實際上現在已經支援到GLM-5.0，請根據模型名稱輸入），按回車

![image-20260306110457127](https://img.lingflux.com/2026/03/403f089e93c1d87df6cad0021532f953.png)

等待一下，就會進行API連通性測試，測試成功就會顯示 「Verification successful」，恭喜你完成了配置過程中最複雜的一步了。

![image-20260306110630506](https://img.lingflux.com/2026/03/3d695e4ca1951bb4247a8e87c66f1295.png)

之後會叫你輸入Endpoint ID（給這個 AI 服務商配置起一個**唯一的名字**，方便區分）， 直接預設值即可，直接回車

之後會叫你輸入Model alias （給模型起一個**簡短的暱稱**，方便以後切換時少打字），直接預設空也行，輸入也行，回車



### 4，選擇**通過哪個聊天軟體來跟 AI 對話**。

簡單說就是：你想在哪裡跟你的 AI 機器人聊天？

------

常見選項說明

| 選項             | 說明                       |
| ---------------- | -------------------------- |
| **Telegram**     | 推薦✅ 最容易設置，新手友好 |
| **Discord**      | 適合遊戲/社群用戶          |
| **Slack**        | 適合工作場景               |
| **飛書/Lark**    | 國內企業常用               |
| **LINE**         | 日本/東南亞常用            |
| **iMessage**     | 蘋果用戶                   |
| **Signal**       | 注重隱私                   |
| **Skip for now** | 先跳過，以後再配置         |

這裡先選擇跳過「Skip for now」，因為篇幅有限，下回分解。

![image-20260306111140666](https://img.lingflux.com/2026/03/d1d97190310ba6be3e243af0b89ce93c.png)

### 5，選擇是否配置技能（skills）

同樣，選擇NO，因為篇幅有限，下回分解。

![image-20260306111359363](https://img.lingflux.com/2026/03/2fbc070efc12fe983d83711229631147.png)



### 6，之後有一連串API配置，全NO跳過

這是在問你要不要配置一些**額外的功能插件**，每個都需要對應的 API Key：

------

| 提示                           | 功能                        | 需要什麼             |
| ------------------------------ | --------------------------- | -------------------- |
| **GOOGLE_PLACES_API_KEY**      | 地圖/地點搜索（Google地圖） | Google Cloud API Key |
| **GEMINI_API_KEY**             | 用 Gemini AI 模型           | Google AI Studio Key |
| **NOTION_API_KEY**             | 連接你的 Notion 筆記        | Notion 集成 Token    |
| **OPENAI_API_KEY (image-gen)** | AI 生成圖片（DALL-E）       | OpenAI API Key       |
| **OPENAI_API_KEY (whisper)**   | 語音轉文字                  | OpenAI API Key       |
| **ELEVENLABS_API_KEY**         | AI 語音合成（文字轉語音）   | ElevenLabs Key       |

------

怎麼處理？**現在直接全部選 No/跳過就好**，原因：

- 這些都是可選功能，不影響基本使用
- 沒有對應帳號的話強行填也用不了
- 之後隨時可以回來配置

![image-20260306111518497](https://img.lingflux.com/2026/03/66c6830490fd101cd8bc45b7b3bf041c.png)

### 7，**Hooks 是自動化觸發器**，當特定事件發生時自動執行某些操作。

| 選項                      | 作用                                         |
| ------------------------- | -------------------------------------------- |
| **Skip for now**          | 全部跳過                                     |
| **boot-md**               | 啟動時自動載入某些指令/提示詞                |
| **bootstrap-extra-files** | 啟動時自動載入額外檔案                       |
| **command-logger**        | 記錄所有操作日誌                             |
| **session-memory**        | 發 `/new` 或 `/reset` 時自動保存當前對話記憶 |

------

建議**只勾選 `session-memory`** 就夠了，最實用，能讓 AI 記住之前聊過的內容。

其他的初次使用先跳過，之後熟悉了再開啟。

用**空白鍵勾選**，回車確認。

![image-20260306111717358](https://img.lingflux.com/2026/03/ef24d76177a3e999293f7e0da00389da.png)



### 8，用哪種方式來啟動和使用你的機器人：

- **Hatch in TUI**：在終端裡直接用，指令行介面。
- **Open the Web UI**：（推薦）在瀏覽器裡打開網頁介面操作。
- **Do this later**：稍後再說。

這裡選擇「Open the Web UI」，選擇並回車

![image-20260306112107760](https://img.lingflux.com/2026/03/3244eb382e44133d4cc81f6ec18e57af.png)

這時候，瀏覽器會自動彈出OpenClaw的Web UI 介面，

## 和你的小龍蝦（OpenClaw）第一次對話

![image-20260306112419909](https://img.lingflux.com/2026/03/f40a3a5c08362eecb739689dbcba3139.png)

見到OpenClaw 有回應則表示，現在你已經安裝成功，並且正常運行中。

恭喜！

但是現在，你養的小龍蝦只能嗷嗷待哺，沒有手腳，你讓它幹嘛幹嘛不成（打不開瀏覽器，改不了檔案）。

![image-20260306113036590](https://img.lingflux.com/2026/03/833a2ec19f73a2caab5a9aeb5138a0d2.png)





## 配置操作瀏覽器和檔案操作權限

請注意：以下的操作會讓你的OpenClaw提升使用權限，請詳細閱讀相關內容，保持學習。

### OpenClaw控制瀏覽器有2個模式

1，（獨立模式）使用openClaw內建的瀏覽器，完全隔離本地系統，有獨立的登陸資訊。

2，（擴展模式）使用本地Chrome瀏覽器，安裝openclaw browser Relay擴展插件，共用本地的登陸資訊。

>  本次例子演示的是使用**擴展模式**，使用本地Chrome瀏覽器



### 找到OpenClaw gateway token KEY

OpenClaw gateway token KEY 要好像密碼那樣對待，好好保管。

獲取OpenClaw gateway token KEY的方法有以下2個：

#### 1，直接在配置檔案中找到

macOS的配置檔案在使用者目錄下，隱藏檔案，需要顯示隱藏檔案才能找到`.openclaw`資料夾，打開進入打開openclaw.json檔案，裡面在「gateway」那段中找到token

![image-20260306122344215](https://img.lingflux.com/2026/03/537f4f44ca08c446ef9ede6549ddb90d.png)

#### 2，在Web UI中查看 （這個方法最簡單）

點擊「Overview」，在「Gateway Token」下就是，非常簡單可以看到。

![image-20260306122950056](https://img.lingflux.com/2026/03/54be336e2aaa6342c1289fc5370c270a.png)





### 1，Chrome安裝瀏覽器接管插件

在Chrome的插件市場（https://chromewebstore.google.com/）搜索「OpenClaw Browser Relay」

（截稿的時候已經到了v2.7版本），並安裝。（注意，現在很多OpenClaw Browser 請看清楚，別安裝錯了）

安裝完成則會彈出一個頁面，要你輸入token KEY 驗證，這裡輸入的是OpenClaw的gateway token KEY，不是AI API KEY不要搞錯。

設置完即可，順便可以置頂顯示該插件，方便操作。（等下還要手動操作的，記住了）

![image-20260306114923386](https://img.lingflux.com/2026/03/9b0e0c0e5bc27812210d0b9886a1962d.png)



### 2，開啟開發者模式

瀏覽器再次輸入 chrome://extensions/ ，回車，進入插件管理頁，在頁面的右上角有一個開關「Developer mode」(開發者模式)，檢查是否已經啟用，如果沒有啟用的請啟用。



### 3，配置OpenClaw 支援瀏覽器和檔案操作

使用CLI配置，打開終端（指令行工具），輸入以下指令：

```bash
# 把openclaw的權限提升 coding 級別
openclaw config set tools.profile coding

# 確保瀏覽器功能開啟
openclaw config set browser.enabled true

# 切換到系統 Chrome（這就是"系統預設 Chrome"的官方方式）
openclaw config set browser.defaultProfile "chrome"

# 清空 allowlist（讓 coding profile 自動暴露正確檔案工具，這是關鍵！）
openclaw config set tools.allow '[]'

# 配置完成，重啟openclaw gateway（必做）
openclaw gateway restart
```

如下圖顯示：

![image-20260306113653129](https://img.lingflux.com/2026/03/02f6c0258cc846cf7699cd372bbb8a03.png)

重啟完之後。。。

1，打開瀏覽器，隨便訪問一個頁面，例如 https://lingshunlab.com ，然後點擊剛才安裝的插件，那個龍蝦，點擊距會顯示「ON」的小標記，表示工作正常。

![image-20260306124413421](https://img.lingflux.com/2026/03/4ef9d1f4eb78a3ca6b2463ed0e809f89.png)

2，進入OpenClaw Web UI 頁面，進行「Chat」對話，但對話前請先「New session」，然後發送類似「瀏覽器打開bilibili.com」。

一切正常的話，這個時候，瀏覽器就會自動打開bilibili的網址。

![image-20260306123830087](https://img.lingflux.com/2026/03/7580e05a2df8e32d72a7370d3fa964a5.png)

此時，你也可以試試檔案操作的功能，發送類似「幫我在使用者目錄下創建一個檔案，測試創建檔案的功能」，小龍蝦就能幫你成功創建一個檔案，

![image-20260306124032376](https://img.lingflux.com/2026/03/3532062bde99391b12d64eb1c8e2de3b.png)



一切正常，恭喜但是。。。感覺到有點恐怖了吧，萬一。。。

所以我需要把檔案操作的權限保留在「workspace」工作空間目錄中，而這個工作空間目錄在哪裡？可以查看openclaw.json配置，也可以在Web UI 的 「Agents」的「Overview」查看到。

![image-20260306125311134](https://img.lingflux.com/2026/03/6b0ba79477058ff2819ac69caca95fb3.png)



### 4，限制檔案操作僅在工作空間目錄

使用CLI配置的方式，打開終端（指令行工具），輸入以下指令：

```bash
# 配置檔案操作僅在工作空間目錄
openclaw config set tools.fs.workspaceOnly true
```

重啟gateway即可

```bash
openclaw gateway restart
```





## 結語

現在，龍蝦已經有手了。

它可以打開瀏覽器、點擊頁面、在你劃定的工作區裡讀寫檔案——這聽起來簡單，但背後能做的事其實非常多。

下一篇，我會示範怎麼把它接入飛書，這樣不管你在哪，都能遠端"雲養蝦"。

感興趣的話，關注我的頻道，我會持續更新：

- 🎬 **YouTube**：[lingshunlab](https://www.youtube.com/@lingshunlab)
- 📺 **Bilibili**：[凌順實驗室](https://space.bilibili.com/456183128)



## 參考

### **`tools.profile`** 權限

https://docs.openclaw.ai/tools#tool-profiles-base-allowlist

OpenClaw（2026.3.2 及近期版本）中的 **`tools.profile`** 是工具權限的**基礎預設（base allowlist）**，這個配置項**強烈影響安全性**：新安裝預設是 `"messaging"`（從 2026.3.x 開始的重大安全升級），舊版本很多用戶習慣的 broad/coding 現在需要顯式設置。

### 權限對比（核心差異一覽）

| 維度                                            | minimal               | messaging                 | coding                                     | full                  |
| ----------------------------------------------- | --------------------- | ------------------------- | ------------------------------------------ | --------------------- |
| **檔案操作** (fs.read/write/edit/apply_patch)   | ✗ 完全禁止            | ✗ 禁止                    | ✓ 允許（可進一步用 fs.workspaceOnly 限制） | ✓ 允許                |
| **Shell 執行** (exec/runtime/process)           | ✗ 禁止                | ✗ 禁止                    | ✓ 允許（可加 approvals.exec 審批）         | ✓ 允許                |
| **瀏覽器** (browser)                            | ✗ 禁止                | ✗ 禁止                    | ✓ 允許                                     | ✓ 允許                |
| **訊息/會話管理** (sessions_*, messaging group) | 只允許 session_status | ✓ 完整支援                | ✓ 完整支援                                 | ✓ 完整支援            |
| **圖像/記憶體工具** (image, memory_*)             | ✗ 禁止                | ✗ 禁止                    | ✓ 部分支援                                 | ✓ 完整支援            |
| **其他高危險工具** (cron, gateway, nodes 等)      | ✗ 禁止                | ✗ 禁止                    | ✗ 大部分禁止（需 allow）                   | ✓ 可能開放            |
| **預設新安裝**                                  | ✗ 不預設              | ✓ 是（2026.3.x 重大變更） | ✗ 需要手動設置                             | ✗ 需要手動設置        |
| **推薦人群**                                    | 極致安全、只聊天      | 普通用戶、新手、聊天為主  | 開發者、代碼/檔案重度用戶                  | 測試、POC、信任模型時 |

###


### browser常用指令列表

https://docs.openclaw.ai/tools/browser


