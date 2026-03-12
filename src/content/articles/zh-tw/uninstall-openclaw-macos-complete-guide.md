---
title: "MacOS 徹底卸載 OpenClaw 的正確姿勢（別刪一半留一半）"
domain: ai
platforms: ["mac"]
format: "tutorial"
date: 2026-03-12
intro: "你以為點了「卸載」就完事了？OpenClaw 在 MacOS 上其實會在三個地方留下痕跡：工作空間目錄、npm 全域命令、以及 .zshrc 環境變數配置。任何一處沒清乾淨，輕則終端機報錯，重則新工具安裝異常。本文記錄完整的清除步驟，附截圖，5 分鐘搞定，不留殘留。"
image: "https://img.lingflux.com/2026/03/57911d1d24d0ad3cb8aadbf57ea7fafc.jpg"
tags: ["OpenClaw uninstall", "OpenClaw 卸載", "MacOS 徹底刪除", "npm 全域卸載"]
---

很多人卸載 OpenClaw 之後，重新打開終端機還是會看到一堆報錯，或者裝新工具時環境變數莫名衝突。原因很簡單：**你只刪掉了「表面」，還有三個地方藏著殘留檔案。**

本文記錄完整的清除步驟，附截圖說明，5 分鐘搞定，徹底不留痕跡。



## 卸載前的工作

⚠️ 開始之前：先備份你的工作檔案

請到 OpenClaw 的工作空間（預設位置在 MacOS 的：~/.openclaw/workspace），備份裡面的檔案：裡面可能包含你之前設定好的**設定檔、skill 技能檔案、專案檔案**等。

卸載過程會自動清除這個目錄。所以在動手之前，先把需要留存的檔案複製到其他地方。



## 開始卸載

打開終端機，輸入以下命令：

```bash
openclaw uninstall
```

執行後，程式會詢問你要刪除哪些元件。**建議全部勾選**（按空白鍵選中），這樣清除得最徹底。

選完之後按 Enter，會再次詢問「是否確認刪除」，選擇 **Yes** 確認。

卸載程式隨即執行，大概會看到如下畫面：

![ScreenShot_2026-03-12_204743_136 (1)](https://img.lingflux.com/2026/03/cdb2215144cdaa58c3d7f26b61bee3a6.png)

注意看提示資訊——這裡會告訴你，**CLI 中的 OpenClaw 命令還沒有被刪除**。這是第一個容易漏掉的地方，需要單獨處理。



## 使用 NPM 命令刪除 CLI 中的 OpenClaw

為什麼需要單獨刪？因為 OpenClaw 的命令列工具是透過 npm 全域安裝的，它不屬於應用本體，官方卸載程式不會替你處理這部分。

在命令列輸入：

```bash
npm uninstall openclaw -g
```

這樣就會刪除 CLI 中的 openclaw 命令，執行完大概如下圖：

![Weixin Image_20260312205126_397_55 (1)](https://img.lingflux.com/2026/03/6d07540cdb4de7cd36eddf7b9cb627be.png)

這一步完成後，`openclaw` 命令就從你的系統裡消失了。但還沒完——



## 清理 .zshrc 裡的 OpenClaw 環境變數配置

這是**最容易被忽略、也最容易引發後續問題**的一步。

OpenClaw 安裝時會在 `~/.zshrc` 檔案末尾自動寫入一段設定，用於載入命令補完腳本。即使前兩步都做完了，這段程式碼還留在那裡，每次打開終端機都會嘗試去載入一個已經不存在的檔案，進而報錯。

MacOS 系統上，找到使用者目錄的 .zshrc 檔案（~/.zshrc），這是隱藏檔案，需要顯示隱藏檔案，例如在使用者目錄下按快速鍵（shift + command + .）顯示隱藏檔案，使用文字編輯軟體打開也可以（或者在命令列 `nano ~/.zshrc`，開啟後編輯）。



找到下面這段程式碼，整段刪除：

```tex
# OpenClaw Completion
source "/Users/{你的使用者名稱}/.openclaw/completions/openclaw.zsh"
```

找到下面這段程式碼，整段刪除：

![ScreenShot_2026-03-12_205815_641 (1)](https://img.lingflux.com/2026/03/eb7706d1300a594edd849b787c740a8c.png)

刪除後儲存檔案。如果用的是 nano，按 `Control + X`，然後按 `Y` 確認儲存。

關閉終端機（命令列工具）。

當你再次打開終端機（命令列工具）的時候，已經在系統上完全刪除 OpenClaw，這隻龍蝦了。



## 結束

總結卸載 OpenClaw 需要清理三個地方，缺一不可：

1. **執行 `openclaw uninstall`**，刪除應用主體和工作空間
2. **執行 `npm uninstall openclaw -g`**，刪除全域 CLI 命令
3. **編輯 `~/.zshrc`**，刪除自動補完的設定程式碼

整個過程 5 分鐘以內，按順序做完就能徹底告別這隻龍蝦 🦞，不留任何殘留。

### 驗證是否卸載乾淨

做完以上三步，可以用下面這個命令確認 OpenClaw 是否已經完全從系統移除：

```bash
which openclaw
```

如果沒有任何輸出，說明卸載乾淨了。如果還有路徑返回，檢查 npm 全域目錄是否還有殘留：

```bash
npm list -g --depth=0
```

在輸出列表裡確認沒有 `openclaw` 即可。

如果這篇文章幫到了你，歡迎收藏轉發給同樣在用 OpenClaw 的朋友。
