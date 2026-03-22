---
title: "微信直接聊 AI？OpenClaw 接入 ClawBot 實測教學（官方支援，不封號）"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-22
intro: "微信官方已開放外掛機制，用微信的 ClawBot 與 OpenClaw 對接聊天。本文提供完整安裝流程和常見問題解決方案。"
image: "https://img.lingflux.com/2026/03/e0160b21b299a1ed5acdb00b763871a7.png"
tags: ["openclaw", "clawbot", "微信外掛", "WeChat AI", "OpenClaw 教學", "微信 AI"]
---

微信官方已經開放了外掛機制，可以把 OpenClaw 的 ClawBot 直接掛進微信——不用第三方破解，不用擔心封號，更新到 v8.0.70 就能用。

本文記錄的是我自己跑通的完整流程，包括卡死的坑和繞過去的辦法。

---

## 前置條件：微信版本必須是 v8.0.70 或以上

外掛入口是新版本才有的功能，版本不夠就找不到。

更新完之後**手動關閉微信再重新打開**，不是後台切換，是真正退出重啟。我一開始就是因為沒重啟，在設定裡翻了半天找不到外掛入口，重啟一下就出來了。

---

## 方法一：官方流程（順利的話 5 分鐘）

### 第一步：找到你的專屬安裝指令

手機微信按這個路徑進去：

**「我」→「設定」→「外掛」→ 找到 ClawBot →「詳細」**

![ClawBot外掛詳情頁面](https://img.lingflux.com/2026/03/f78858448a52037587812f6a540d9166.png)

這裡會顯示一條專屬指令，格式是：

```bash
npx -y @tencent-weixin/openclaw-weixin-cli@latest install
```

每個帳號生成的指令略有不同，複製你自己頁面上的那條。

### 第二步：在執行 OpenClaw 的設備上執行指令

打開終端機，貼上指令，按 Enter，等安裝走完。

![終端機執行安裝指令](https://img.lingflux.com/2026/03/9118db862fbd4f96c48fe012cec2241c.png)

### 第三步：掃碼配對

安裝結束後，終端機裡會彈出一個二維碼，用微信掃一掃，手機上點確認授權。

### 第四步：回微信找 ClawBot 發訊息

配對成功後微信裡會出現 ClawBot，直接發訊息就能用了。

---

## 方法二：安裝卡死時的手動方案

如果你的終端機在「正在安裝外掛...」這裡停住超過兩三分鐘沒有任何動靜——不用再等了，程序卡死了。`Ctrl+C` 取消或者直接關掉終端機視窗，改用下面這套手動流程，我自己就是用這個跑通的。

### 第一步：停掉 OpenClaw Gateway

```bash
openclaw gateway stop
```

### 第二步：確認程序徹底退出

```bash
pkill -f openclaw
```

### 第三步：用 npm 方式手動安裝外掛

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
```

### 第四步：啟用外掛

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

### 第五步：觸發掃碼綁定（關鍵步驟）

```bash
openclaw channels login --channel openclaw-weixin
```

終端機彈出二維碼 → 微信掃一掃 → 手機確認授權 → 看到「與微信連接成功」就說明綁定好了。

![微信連接成功提示](https://img.lingflux.com/2026/03/b6e5065e87d9175a8499d84e32cf0964.png)

### 第六步：重啟 Gateway

這步容易被跳過，但不重啟的話 ClawBot 不會回應訊息。

```bash
openclaw gateway restart
```

---

## 驗證是否成功

回到微信，找到 ClawBot，隨手發一句話。收到回覆說明全部跑通了。

![ClawBot在微信中正常回覆](https://img.lingflux.com/2026/03/6a7c383c20c33490baa5b8cbcba4f1d0.png)

---

## 常見問題速查

| 問題現象 | 處理方式 |
|---|---|
| 安裝指令卡在「正在安裝外掛...」不動 | 放棄等待，直接走方法二 |
| 掃碼後手機無反應 | 完全退出微信再重新打開，重試掃碼 |
| Gateway 重啟後 ClawBot 沒有回覆 | 確認第四步的外掛 enabled 配置有沒有寫進去 |

---

以上流程在 macOS 上實測通過，Windows 命令列操作相同，路徑寫法注意用反斜線。
