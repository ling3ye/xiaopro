---
title: "WeChatで直接AIとチャット？OpenClawのClawBot接続実践チュートリアル（公式対応、アカウント停止なし）"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-22
intro: "WeChatが公式にプラグイン機構を解放しました。WeChatのClawBotを使ってOpenClawと接続してチャットできます。本記事では完全なインストール手順とよくある問題の解決策を提供します。"
image: "https://img.lingflux.com/2026/03/e0160b21b299a1ed5acdb00b763871a7.png"
tags: ["openclaw", "clawbot", "wechat plugin", "WeChat AI", "OpenClaw チュートリアル"]
---

WeChatが公式にプラグイン機構を解放しました。これでOpenClawのClawBotをWeChatに直接接続できます—サードパーティのクラッキングは不要、アカウント停止の心配もありません。v8.0.70にアップデートするだけで使えます。

この記事では、私が実際に動作確認した完全な手順を記録しています。ハマった罠と回避方法も含めて紹介します。

---

## 前提条件：WeChatのバージョンはv8.0.70以上必須

プラグインの入口は新しいバージョンでしか利用できません。バージョンが足りないと見つかりません。

アップデート後、**WeChatを手動で閉じて再起動してください**—バックグラウンドの切り替えではなく、完全に終了して再起動することです。最初、再起動し忘れて設定画面でプラグイン入口を探すのに時間を浪費しましたが、再起動するとすぐに表示されました。

---

## 方法1：公式の手順（順調なら5分で完了）

### ステップ1：専用インストールコマンドを探す

スマホのWeChatで以下のパスに進みます：

**「私」→「設定」→「プラグイン」→ ClawBotを探す →「詳細」**

![ClawBotプラグイン詳細ページ](https://img.lingflux.com/2026/03/f78858448a52037587812f6a540d9166.png)

ここに専用コマンドが表示されます。形式は以下の通りです：

```bash
npx -y @tencent-weixin/openclaw-weixin-cli@latest install
```

アカウントごとに生成されるコマンドは若干異なります。自分のページに表示されているコマンドをコピーしてください。

### ステップ2：OpenClawを実行しているデバイスでコマンドを実行

ターミナルを開き、コマンドを貼り付け、Enterキーを押してインストールが完了するのを待ちます。

![ターミナルでのインストールコマンド実行](https://img.lingflux.com/2026/03/9118db862fbd4f96c48fe012cec2241c.png)

### ステップ3：QRコードをスキャンしてペアリング

インストール完了後、ターミナルにQRコードが表示されます。WeChatでスキャンし、スマホで認証を確認してください。

### ステップ4：WeChatに戻ってClawBotにメッセージを送信

ペアリング成功後、WeChatにClawBotが表示されます。すぐにメッセージを送信して使用できます。

---

## 方法2：インストールが固まった時の手動解決策

ターミナルが「プラグインをインストール中...」で2〜3分以上動かない場合—これ以上待つ必要はありません。プロセスがハマっています。`Ctrl+C`でキャンセルするか、ターミナルウィンドウを直接閉じて、以下の手動手順に切り替えてください。私もこれで動作させました。

### ステップ1：OpenClaw Gatewayを停止

```bash
openclaw gateway stop
```

### ステップ2：プロセスが完全に終了したことを確認

```bash
pkill -f openclaw
```

### ステップ3：npm方式でプラグインを手動インストール

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
```

### ステップ4：プラグインを有効化

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

### ステップ5：QRコードスキャンによるバインドをトリガー（重要）

```bash
openclaw channels login --channel openclaw-weixin
```

ターミナルにQRコードが表示 → WeChatでスキャン → スマホで認証確認 →「WeChatとの接続に成功しました」と表示されればバインド完了です。

![WeChat接続成功の表示](https://img.lingflux.com/2026/03/b6e5065e87d9175a8499d84e32cf0964.png)

### ステップ6：Gatewayを再起動

このステップは見落とされがちですが、再起動しないとClawBotがメッセージに応答しません。

```bash
openclaw gateway restart
```

---

## 成功したか確認する

WeChatに戻り、ClawBotを見つけて適当なメッセージを送信します。返信が来ればすべて正常に動作しています。

![WeChatでClawBotが正常に返信](https://img.lingflux.com/2026/03/6a7c383c20c33490baa5b8cbcba4f1d0.png)

---

## よくある問題のクイックリファレンス

| 問題 | 解決策 |
|---|---|
| インストールコマンドが「プラグインをインストール中...」で固まる | 待つのをやめて、方法2に進む |
| QRコードスキャン後スマホが反応しない | WeChatを完全に終了して再起動し、スキャンを再試行 |
| Gateway再起動後もClawBotが返信しない | ステップ4のプラグインenabled設定が保存されているか確認 |

---

上記の手順はmacOSで動作確認済みです。Windowsのコマンドライン操作も同じですが、パスの区切り文字に注意してください。
