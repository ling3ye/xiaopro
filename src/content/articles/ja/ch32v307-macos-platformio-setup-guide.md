---
title: "Mac で CH32V307 をゼロから征圧する：『Windows のウイルスを大量コンパイル』から『LED が点いて、シリアルが喋る』までの罠全記録"
domain: hardware
platforms: ["mac"]
format: "tutorial"
date: 2026-08-08
intro: "Mac で CH32V307 の開発環境をゼロから構築しようとしたら、PlatformIO のプラットフォームを入れた途端、ツールチェーンとして Windows 用の .exe を大量に送り込まれた——そんな経験ありませんか？本記事は実際にハマった道のりをそのまま記録したものです。macOS ネイティブの RISC-V ツールチェーンへの手動差し替え、Gatekeeper の隔離解除、オンボード WCH-Link 経由の書き込み開通までを追いかけた末、「コンパイルも書き込みも成功し、シリアルも出力が出るのに LED だけがどうしても点かない」という本当の原因——オンボード LED は工場出荷時から MCU に接続されていない——に到達します。すべてのコマンドとエラーは実機で走らせたもので、出会った 10 個の罠を一切省略せず並べています。Arduino/ESP から移ってきたあなたに、予防線を張るための記事です。"
tags: ["CH32V307", "CH32V macOS 開発", "PlatformIO", "WCH-Link", "WCH", "RISC-V マイコン", "組み込み macOS 開発"]
image: https://img.lingflux.com/2026/08/d9106f173bc51c93033527dd5e206b04.png
---

> Lingshun Lab · 組み込み罠踏み日記シリーズ
>
> ハードウェア：**CH32V307V-EVT-R1**（オンボード WCH-Link デバッガ、WCH 製 RISC-V チップ）
> OS：**macOS（Apple Silicon, arm64）**
> ツール：VSCode + PlatformIO
> ゴール：開発環境をゼロから組み立て、LED を 1 個点滅させ、シリアルを喋らせる——組み込み界隈で公認の「Hello World」

## はじめに：なぜこの記事を書いたのか

まずこの記事の「書き手の立ち位置」を明かしておきます。そうしないと、読み進めるうちに「こいつ、本当はマイコン書いたことないんじゃ」と思いたくなるような操作が出てくるので——。

僕は Arduino と ESP-IDF を何年も触ってきて、L チカ、Wi-Fi 接続、MQTT とかはもう筋肉記憶になっていて、目をつぶっても LED を点けられます。だからこの CH32V307 を手にしたときも「チップが変わるだけだし、L チカのどこが難しいの？」くらいに思ってました。

で、現実から叩きのめされました。CH32 系の生態の「出荷時設定」は、Arduino や ESP の「挿して書き込んで、コードが合えば点く」という世界観とは別物でした。

- **プログラムを書き込むのに専用ライタのお出ましが必要**：Arduino や ESP32 は USB ケーブル 1 本で電力供給・書き込み・シリアルを兼務してくれます。それが CH32 では **wlink** というオンボードデバッガがいて、「なぜこいつがファームをチップに流し込めるのか」を理解するだけで何周も遠回りしました。
- **オンボード LED がまさかの MCU 未接続**：Arduino のオンボード LED は 13 番ピンにハードはんだ付けされていて、`digitalWrite(13, HIGH)` 一発で点灯します。でもこのボードのユーザ LED は……**工場出荷時から「端っこが切れた」状態で、どのピンにも繋がっていません**。ジャンパワイヤ 1 本を自分で飛ばしてやって、やっと LED が点いてくれます。
- **シリアルも「正しい入口」を当てないと出てこない**：ESP32 は挿せば即 USB シリアル、WYSIWYG（見たまま）。一方 CH32 のデフォルトはデバッガが仮想化した USART1 を通るので、ポートを間違えると完全な沈黙。「ボード壊れた？」とモニタに向かって疑い続ける羽目になります。

その瞬間、「ベテランがまさかの転び方」の滋味を心底味わいました——10 年以上 L チカしてきたのに、1 颗の RISC-V マイコンの前で自己紹介したくなるほど詰まるとは。今まで学んできた組み込み、全部犬に食われたかと思いました。

なので本記事は単なる「チュートリアル」ではなく、Arduino/ESP ユーザが初めて CH32 に触ったときの**罠踏み日記**です。熟練者から見れば「やばすぎる」レベルの初歩的ミスも、全部そのまま並べます——同じく Arduino/ESP から移ってきたあなたにとっては、同じ罠をそのまま踏む可能性が高いからです。予防線を張っておけば、後で出会う罠がぐっと身近に感じられるはず。

---

立ち位置の話はここまでにして、本題へ。検索窓で「CH32V307 + Windows」と打てば、公式の MounRiver Studio がヒットしてインストールするだけで動きます。「CH32V307 + Linux」も公式ツールチェーンがきっちり面倒を見てくれます。

でも「CH32V307 + macOS」で検索すると……たぶん沈黙します。情報は断片的で、地面には隠し穴だらけ。このチップ自体は優秀なんです——32 ビット RISC-V コア、最大 144MHz、コスパでは ARM マイコンの多くをぶっ叩くレベル——なのに Mac だと「親に見放された子」状態なんですよね。

本記事は、僕が Mac で CH32V307 の開発環境をゼロから組み立て、罠を踏んでは埋め、最終的に LED 点灯 + シリアル開通まで到達した全過程の記録です。**どんな罠もスキップしません**。あなたも同じ穴に落ちる可能性が高いので、全部並べておけば回り道を大きく減らせるはず。具体的なコードは GitHub に置いてあります（リンクは文末）。本記事は「なぜこうするのか」を徹底的に語る担当です。

最終形を先にチラ見せしておくと、コンパイル成功、書き込み成功、ボード上の LED が一定のリズムで点滅し、シリアルモニタに同期してこんな行が流れます：

```
CH32V307 起動完了、SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

「何もない状態」からこの画面にたどり着くまで、少なくとも **8 個の罠**を踏みました。以下、一つ残らずさらしていきます。

### 目次

- [一、主役紹介：CH32V307V-EVT-R1](#一主役紹介ch32v307v-evt-r1)
- [二、全体像：このツールチェーンはどうなってるのか](#二全体像このツールチェーンはどうなってるのか)
- [三、作業開始：VSCode のインストールから pio コマンドの理解まで](#三作業開始vscode-のインストールから-pio-コマンドの理解まで)
- [四、CH32V プラットフォームのインストール（そして最初の小さな罠）](#四ch32v-プラットフォームのインストールそして最初の小さな罠)
- [五、大罠の現場：なぜ .exe ばかりインストールされるのか](#五大罠の現場なぜ-exe-ばかりインストールされるのか)
- [六、罠抜け：macOS ネイティブのツールチェーンに差し替える](#六罠抜けmacos-ネイティブのツールチェーンに差し替える)
- [七、Gatekeeper の隔離を解除する（しないと macOS に「ウイルス」として遮断される）](#七gatekeeper-の隔離を解除するしないと-macos-にウイルスとして遮断される)
- [八、ツールチェーンが本当に動くか検証する](#八ツールチェーンが本当に動くか検証する)
- [九、最初のプロジェクト作成：platformio.ini を知る](#九最初のプロジェクト作成platformioini-を知る)
- [十、最初のコンパイル](#十最初のコンパイル)
- [十一、pio をグローバルコマンドにする](#十一pio-をグローバルコマンドにする)
- [十二、ハードウェアの接続と書き込み](#十二ハードウェアの接続と書き込み)
- [十三、罠①：コンパイルも書き込みも成功、でもシリアルは死の静寂](#十三罠コンパイルも書き込みも成功でもシリアルは死の静寂)
- [十四、罠②（本記事最大の罠）：シリアルは喋るのに LED だけがどうしても点かない](#十四罠本記事最大の罠シリアルは喋るのに-led-だけがどうしても点かない)
- [十五、動くようになった後の完全な main.c の姿](#十五動くようになった後の完全な-mainc-の姿)
- [十六、罠まとめ表](#十六罠まとめ表)
- [十七、主要コマンド & ファイルパス早見表](#十七主要コマンド---ファイルパス早見表)
- [十八、自分なりの「CH32 開発のメンタルモデル」を作る——次に新プロジェクトを入手したらそのままコピペでいける](#十八自分なりのch32-開発のメンタルモデルを作る次に新プロジェクトを入手したらそのままコピペでいける)
- [十九、よくある質問 FAQ](#十九よくある質問-faq)
- [二十、動くようになった後、次に遊べること](#二十動くようになった後次に遊べること)
- [二十一、参考資料](#二十一参考資料)

---

## 一、主役紹介：CH32V307V-EVT-R1

作業に入る前に、このボードと 2 分だけ仲良くなっておきましょう。この後の罠の 90% は、こいつの「個性」に由来します。

| 特徴 | 説明 |
| --- | --- |
| メインチップ | CH32V307VCT6、WCH QingKe V4F コア、32 ビット RISC-V、最大 **144MHz**、LQFP80 パッケージ |
| Flash の実容量 | **288KB**（ただし PlatformIO はデフォルトで 256KB Flash + 64KB SRAM としてコンパイルします。なぜ変更不要かは後述） |
| オンボードデバッガ | **WCH-Link**（実際には CH32V305 チップ 1 颗で「兼役」実装されていて、公式の WCH-LinkE と同等に扱えます） |
| USB インターフェース | USB-C 1 本で電力供給・デバッグ・仮想シリアルを兼務 |
| ユーザ LED | LED1、LED2 の 2 颗——**⚠️ デフォルトは浮いていて、MCU に接続されていません！**（本記事最大の罠、第十四章で詳述） |
| ユーザボタン KEY | 同じくデフォルトで浮き状態 |
| 電源 LED | 1 颗、通電すると常時点灯。コードとは無関係——通電した瞬間にこの LED が点いたのを見て「L チカ成功！」と勘違いする人が続出しますが、ただの電源ランプです |

ボード上にもう一つ見落としやすいディテールがあります。オンボードデバッガチップ（CH32V305）とターゲットチップ（CH32V307）の間は、工場出荷時 **4 個のジャンパハット**（シルクはそれぞれ `RX1-TX0`、`TX1-RX0`、`DIO-DIO0`、`CLK-CLK0`）でブリッジされており、デバッガの SWIO 信号とシリアル信号を「橋渡し」してターゲットチップへ届けています。

> ⚠️ **この 4 個のジャンパハットは工場出荷時から接続済みです、絶対に手癖で外さないでください**。外すと軽くはプログラムが書き込めない、重いとシリアルが即座に行方不明になります。自分のコードを疑って半日探って、最終的にジャンパハットのせいだと分かったときの絶望感は……聞かないでください。

よし、顔合わせは終わり。環境構築に入りましょう。

---

## 二、全体像：このツールチェーンはどうなってるのか

まず「全家福」を一枚。各コンポーネントの上下関係を整理します：

```
┌──────────────────────────────────────────────────────────┐
│  VSCode + PlatformIO IDE 拡張（GUI：コンパイル/書き込み/デバッグ/シリアル）│
│                          │                                │
│                   PlatformIO Core（pio コマンドライン）        │
│                          │                                │
│            ┌─────────────┴──────────────┐                 │
│       ch32v プラットフォーム（コミュニティ維持：Community-PIO-CH32V）│
│            │                             │                 │
│   ┌────────┼─────────┬───────────┐       │                 │
│ toolchain  wlink    openocd    board     │                 │
│(RISC-V GCC)(書き込み)(デバッグ) (ボード定義)│                 │
└──────────────────────────────────────────┘
                     │ USB
        CH32V307V-EVT-R1（オンボード WCH-Link）
```

![](https://img.lingflux.com/2026/08/73dff7f41fe1d3c38d06447b98a39f2b.png)

**一句で整理**：VSCode の PlatformIO プラグインがフロントエンドの UI、実際に仕事をするのはコマンドラインツール `pio` です。`pio` は `Community-PIO-CH32V` というコミュニティプラットフォームに依存し、このプラットフォームが「コンパイラ（toolchain）＋ 書き込みツール（wlink）＋ デバッグツール（openocd）＋ ボードパラメータ（board）」をひとまとめにしています。理論上は 1 回インストールすれば動くはず、という構成です。

このコミュニティプラットフォーム、実はかなり豪華で、CH32V003/103/203/30x 全シリーズをネイティブサポートし、WCH 公式ペリフェラルライブラリ（noneos-sdk）、FreeRTOS、RT-Thread、Arduino、ch32fun など好きなフレームワークを選べます。

が——ここが本記事最大の転換点——**このプラットフォーム、デフォルトは Windows ユーザの習慣で設定されています**。macOS ユーザがインストールを終えた瞬間、たぶん呆然とすることになります。具体的にどう呆然とするか、すぐに明かしましょう。

---

## 三、作業開始：VSCode のインストールから pio コマンドの理解まで

### Step 0：基本環境の確認

ターミナルを開いて、まず現状把握から：

```bash
python3 --version          # 3.x が必要
brew --version              # Homebrew、必須ではないが入れておくことを強く推奨
uname -m                    # Apple Silicon なら arm64、Intel Mac なら x86_64 が出力される
```

続いて VSCode + PlatformIO 拡張を入れます：

1. https://code.visualstudio.com/ から VSCode をダウンロードしてインストール。
2. VSCode を開き、左の「拡張機能」アイコン → `PlatformIO IDE` を検索 → Install。
3. 拡張を入れると `~/.platformio/` ディレクトリ配下に PlatformIO Core 本体（数百 MB、専用の Python 仮想環境付き）が自動ダウンロードされます。右下にプログレスバーが出るので数分待ちます。

インストールが終わると、左サイドバーにアリのアイコンが出現します。これが PlatformIO のロゴ（マスコットは本当にアリです）。

### Step 1：隠された pio コマンドを見つける

拡張を入れ終えると、コマンドラインツール `pio` はもう存在しています。ただシステム PATH に追加されていないので、ターミナルで素で `pio` と打っても見つかりません。実際はここに潜んでいます：

```bash
~/.platformio/penv/bin/pio
```

確認してみましょう：

```bash
~/.platformio/penv/bin/pio --version
# PlatformIO Core, version 6.1.19
```

今後のコマンド入力を楽にするため、一時変数を設定しておきます（現在のターミナルウィンドウのみ有効）：

```bash
PIO=~/.platformio/penv/bin/pio
```

本記事でこれ以降 `$PIO` と書く箇所は、すべてこのパスを指します。全部終わった後、第 9 ステップでグローバルコマンド化して、以降は単に `pio` と打てば済むようにします。

---

## 四、CH32V プラットフォームのインストール（そして最初の小さな罠）

PlatformIO のパッケージ管理コマンドで、コミュニティプラットフォームを入れます：

```bash
$PIO pkg install -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git
```

このステップには、ちょっとした引っ掛けポイントが 2 つあります：

> **罠①：組織名を打ち間違えやすい。** 正しい GitHub 組織名は `Community-PIO-CH32V`（中央に **PIO** の 3 文字が入って、かつ大文字です）。ネット上の古い記事や古い投稿では `community-ch32v`（PIO 抜け）と書かれていることが多く、その通りに打つととても切ないエラーが出ます：
> ```
> remote: Repository not found.
> ```
> 必ず `Community-PIO-CH32V` をそのまま写してください。

> **罠②：コマンドが古い。** 初期のチュートリアルでは `pio platform install ...` と書かれていることが多いですが、このコマンドは新しい PlatformIO では**非推奨**になっていて、`This command is deprecated` と表示されます。現在は `pio pkg install -g -p <アドレス>` の書き方に統一されています。

コマンドが走り始めると、プラットフォーム本体、RISC-V ツールチェーン、openocd、wlink の 4 パッケージを順に引っ張ってきます。ログもエラーも出ず、一見すべて正常。**ですがシャンペンを開けるのはまだ早いです**——本当の大罠はこの後に待っています。

---

## 五、大罠の現場：なぜ `.exe` ばかりインストールされるのか

本記事で最も含金量が高く、絶大多数の macOS ユーザがここで立ち止まり、自己紹介したくなるセクションです。

プラットフォームのインストールが終わったら、実際にローカルへ落としてきたツールチェーンの姿を確認してみましょう：

```bash
ls ~/.platformio/packages/toolchain-riscv/bin/ | head
# riscv-none-embed-addr2line.exe
# riscv-none-embed-ar.exe
# riscv-none-embed-as.exe
# ...
```

書き込みツール wlink も確認します：

```bash
file ~/.platformio/packages/tool-wlink/wlink.exe
# PE32 executable (console) Intel 80386, for MS Windows
```

ほら、全部 **`.exe`** です——生粋の Windows PE32 バイナリ。macOS 上ではただの鉄屑で、ダブルクリックしても開けないし、ましてやコードのコンパイルなんてできません。これを初めて見たときの心境は、「私、Mac にいるんだけど、Windows のもの送ってくるの、どういうこと？」といった感じ。

### 根因を掘る：`platform.json` が問題

このプラットフォームの設定ファイルを開いてみましょう：

```bash
cat ~/.platformio/platforms/ch32v/platform.json | python3 -m json.tool | grep -A3 toolchain-riscv
```

結果はこうなります：

```json
"toolchain-riscv": {
  "type": "toolchain",
  "owner": "platformio",
  "version": "https://github.com/Community-PIO-CH32V/toolchain-riscv-windows.git"
}
```

**真相大白**：このプラットフォームの設定ファイルは、ツールチェーンの取得元を `toolchain-riscv-windows.git` に**固定で**書いてあります。書き込みツールの wlink も同じく `#windows` ブランチに固定。PlatformIO はインストール時に「あなたがどの OS を使っているか」を賢く判定してくれません。設定ファイルに書かれたものを、Mac ユーザに対しても唐突に送りつけてきます。

**良いニュース**：同じ `Community-PIO-CH32V` 組織は、実は随分前に macOS ネイティブ版のリポジトリも用意していて、デフォルトにされていないだけです。根因さえ分かれば、対処は自然と決まります——**この 2 つの Windows パッケージを macOS ネイティブ版に手動で差し替える**だけ。具体的な手順と注意点は、次の章で実践します。

---

## 六、罠抜け：macOS ネイティブのツールチェーンに差し替える

### 6.1 RISC-V コンパイラを差し替える

まず誤った Windows 版を削除します：

```bash
rm -rf ~/.platformio/packages/toolchain-riscv
```

続いて macOS ネイティブ版を入れます：

```bash
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/toolchain-riscv-mac.git
```

成功するとこんなメッセージが出ます：

```
Tool Manager: toolchain-riscv@1.80200.190731+sha.99cb62f has been installed!
```

インストール後、確認してみましょう。`package.json` には `"system": ["darwin_x86_64", "darwin_arm64"]` と書かれていて、これが macOS 用だと分かります。パッケージ名も `toolchain-riscv` のままで、元の Windows 版をシームレスに置き換えられます。

> **なぜこのステップでは `main` ブランチを使うのか？ より新しそうな `gcc12` ブランチではなく？**
>
> ここにはとても地味な技術ディテールが隠れています。プラットフォームのビルドスクリプト（`builder/main.py`）に、こういうロジックがあります：
> ```python
> is_gcc_12 = platform.get_package_version("toolchain-riscv").split(".")[1].startswith("12")
> compiler_triple = "riscv-wch-elf" if is_gcc_12 else "riscv-none-embed"
> ```
> 人間の言葉に訳すと、スクリプトはインストールされたツールチェーンの**バージョン番号の第 2 セグメント**を見て、`1.8.x` ならコンパイラの実行ファイル接頭辞は `riscv-none-embed-gcc` だと判断、`1.12.x` なら `riscv-wch-elf-gcc` だと判断します。この 2 系統の接頭辞は互いに異なる実行ファイル名に対応していて、選び方を間違えると、ビルドスクリプトが呼ぶコマンドがディスク上に見つからず、即座にエラーになります。
>
> `main` ブランチから入るバージョン番号はちょうど `1.80200.190731`（gcc 8.2.0 に対応）で、プラットフォームが元々固定していた Windows 版のバージョン番号と一致します。つまり `riscv-none-embed` のパスを踏むので、スクリプトの想定と完全に合致、リスクほぼゼロで一番安定、というわけです。

インストール後に一つ注意点が：

> ⚠️ **この gcc8 版のコンパイラ、本体は実は x86_64 アーキテクチャです**。つまり Intel Mac 向けにビルドされていて、Apple Silicon ネイティブの arm64 ではありません。理由は単純で、xPack（ツールチェーンの上流パッケージ元）が gcc8 の時代には arm64 版をまだ出していなかったからです。なので M シリーズチップの Mac では、このコンパイラは **Rosetta 2** 経由でトランスレート実行されます。「ネイティブじゃない」と不安になりますが、実測ではコンパイルは全く問題なく動きます。精神的負担は不要です。初回実行時に Rosetta のインストールを促されるので、入れれば終わり。

### 6.2 書き込みツール wlink を差し替える

同じ要領で、Windows 版 wlink を macOS ネイティブ版にします：

```bash
rm -rf ~/.platformio/packages/tool-wlink
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_arm64
```

> Intel チップの古い Mac を使っている場合は、ブランチ名を `mac_x64` に変えてください：
> ```bash
> $PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_x64
> ```

インストール完了メッセージ：

```
Tool Manager: tool-wlink@0.23.241116+sha.0c802d4 has been installed!
```

> **openocd は気にしなくて OK、これは正常です。** デバッグ用の `openocd` は PlatformIO の公式レジストリから来るもので、`Community-PIO-CH32V` から直接引っ張ってくるわけではありません。レジストリ自体が OS ごとにアーキテクチャを自動マッチする能力を持っているので、Apple Silicon に入る時点で arm64 ネイティブ版になっています。一応確認できます：
> ```bash
> file ~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd
> # Mach-O 64-bit executable arm64  ✅ 安心、これは問題なし
> ```

### 6.3 重要な修正：最終的に安定動作するのは gcc12 / arm64 ネイティブ版

ここまで書いて、ひとつ正直に——かつ**自己修正**として——添えておかなければならないことがあります。上記 6.1 節の「なぜ main ブランチ（gcc8）を使うのか」という推理は、僕が初期にプラットフォームのビルドスクリプトをただ読んで得た**理論上の判断**です。スクリプトのロジック自体は間違っていませんが、「どのバージョンを入れるのが安定か」という問いについては、コードを読むだけでは足りず、結局は実機でコンパイル、書き込み、実行を通さないと確定できません。

**実際に実機テスト、コンパイル、書き込みをすべて通した最終環境を逆調査した結果、本当に安定して使い勝手が良く、かつ Apple Silicon ネイティブ arm64（Rosetta のトランスレートが一切不要）なバージョンは、gcc 12.2.0、実行ファイル接頭辞 `riscv-wch-elf-gcc` でした。** 以前心配していた「gcc12 ブランチは罠を踏みやすい、対応する実行ファイルが存在しないかもしれない」という懸念は、実測では成り立ちません——この版のツールチェーンは存在するだけでなく、一連のコンパイラの中で最も完全・最新・最も軽快に動き、おまけに GDB デバッガまで同梱されていて、1 回のインストールで全部揃います。

というわけで結論は逆転します：**今から新しく入れるなら、gcc 12.2.0 / arm64 ネイティブ / `riscv-wch-elf-gcc` のセットを目標にしてください**。前の 6.1 節にあった gcc8/x86_64 + Rosetta で動く経路は、「もしまさにそのバージョンが入ってしまっても、慌てなくていい、そのままでも動く」というフォールバック説明として残しておけばよく、あえてそちらを目指す必要はありません。

この「推測が外れて書き直した」過程を、こっそり直してなかったことにするのではなく、あえて記事に残しているのには理由があります。これはそれ自体が価値ある経験だからです——**ビルドスクリプトを読み、バージョン番号の法則を見ることで「なぜこうなるか」を理解できますが、「どのバージョンを入れるべきか」という結論的判断は、最終的に実際にコンパイル・書き込んで走らせて検証しないと出てこない、コードの推理だけだと過度に保守的な結論に傾く、ということです。**

### 6.4 最終環境の確認：完全な技術スペック

以下は、実際にコンパイル＆アップロードに成功した環境を、細部まで洗い直して取得した完全情報です。このセットを目標にして照らし合わせることをお勧めします：

| カテゴリ | コンポーネント / フィールド | 値 |
| --- | --- | --- |
| コンパイラ | 名称 | xPack GNU RISC-V Embedded GCC（**WCH カスタム版**、MounRiver Studio 同梱版と同一） |
| コンパイラ | 実行ファイル名 | `riscv-wch-elf-gcc`（ツール一式は `riscv-wch-elf-` の共通接頭辞） |
| コンパイラ | GCC バージョン | **12.2.0** |
| コンパイラ | ターゲット triple | `riscv-wch-elf` |
| コンパイラ | ビルド/実行 host | `aarch64-apple-darwin23.6.0`（**Apple Silicon ネイティブ**、Rosetta 不経由） |
| コンパイラ | デフォルト ABI | `ilp32`（32 ビット、ソフト浮動小数点呼出規約） |
| コンパイラ | デフォルト ARCH | `rv32imac`（I 整数 / M 乗除算 / A アトミック / C 圧縮命令） |
| コンパイラ | ISA spec | 2.2、multilib 有効 |
| コンパイラ | スレッドモデル | single（ベアメタル、OS なし） |
| コンパイラ | C 標準ライブラリ | **newlib 4.2.0**（`printf` などの標準ライブラリ関数はこれが提供） |
| コンパイラ | binutils（アセンブラ/リンカ一式） | **GNU binutils 2.38**（`as`、`ld.bfd`、`objcopy` はすべてここ由来） |
| コンパイラ | デバッガ | ツールチェーンに `riscv-wch-elf-gdb` が同梱、追加インストール不要 |
| コンパイラ | バイナリのパス | `~/.platformio/packages/toolchain-riscv/bin/` |
| コンパイラ | sysroot | `~/.platformio/packages/toolchain-riscv/riscv-wch-elf/` |
| コンパイラ | PIO パッケージ名 / バージョン | `toolchain-riscv` @ `1.120200.220829` |
| コンパイラ | ソース | xPack（`riscv-none-elf-gcc-xpack`）、上流 GCC 12.2.0 ベースでビルド |
| ビルド環境 | PlatformIO Core | 6.1.19 |
| ビルド環境 | プラットフォーム platform-ch32v | 1.1.0（Community-PIO-CH32V 保守） |
| ビルド環境 | フレームワーク framework-wch-noneos-sdk | 2.30000.0（WCH 標準ペリフェラルライブラリ、ベアメタル） |
| ビルド環境 | ビルドシステム | PlatformIO 内蔵（SCons + Python ベース） |
| ビルド環境 | ターゲットチップ | CH32V307VCT6、ChipID `0x30700568`、QingKe V4F @144MHz |
| アップロード環境 | アップロードツール | **wlink 0.1.1**（現在実際に使用中、PIO パッケージ `tool-wlink` @ `0.23.241116`） |
| アップロード環境 | アップロードプロトコル | `wlink`（`platformio.ini` の `upload_protocol` に対応） |
| アップロード環境 | デバッガファームウェア | WCH-Link v2.18 (v38)、ハードウェアは CH32V305 ベース |
| アップロード環境 | 代替：OpenOCD | `0.11.0+dev-snapshot`（2026-02-28）、PIO パッケージ `2.1100.260228` |
| アップロード環境 | 代替：wchisp | `0.2.3`、PIO パッケージ `0.23.240914` |
| アップロード環境 | 代替：minichlink | `0.1.0` |

> 区別に注意：**コンパイラの実際のバージョンは GCC 12.2.0** です。`1.120200.220829` は PlatformIO がこのパッケージに付けた番号（ほぼ `1.` + `12.2.0` + `0` + パッケージ日付 `220829` を繋いだもの）で、コンパイラ自体のバージョン番号ではありません。両者を混同しないでください。

**完全なツールチェーン一式**（すべて `riscv-wch-elf-` 接頭辞で統一、計 30 個の実行ファイル、1 回のインストールで全部揃う）：

- **コンパイル/リンクでよく使う**：`gcc` `g++` `c++` `cpp` `ld` `ld.bfd` `as`
- **バイナリ処理**：`objcopy` `objdump` `readelf` `nm` `size` `strip` `strings` `addr2line`
- **アーカイブツール**：`ar` `ranlib` `gcc-ar` `gcc-nm` `gcc-ranlib`
- **デバッグ/解析**：`gdb` `gdb-py3` `gprof` `gcov` `gcov-tool` `gcov-dump`
- **その他**：`gfortran` `elfedit` `c++filt` `lto-dump`

このリストを普段から暗記する必要はありません。辞書的に引ければ OK です——例えば将来「ある関数がコンパイル後どれだけサイズを食ったか」を見たいときは `riscv-wch-elf-size` を探す。生成された命令を逆アセンブルして読みたければ `riscv-wch-elf-objdump -d` を使う。こうしたツールは全部、ツールチェーンを入れた瞬間に `~/.platformio/packages/toolchain-riscv/bin/` の中で静かに待機しています。

### 6.5 コンパイラのバージョン追跡とアップグレード：最新版はどこで見るか、どう上げるか

ツールチェーンは一度入れれば永遠、ではなく、コミュニティ版は更新され続けています。でも「最新版をどう追うか」を理解するには、まず人をよく混乱させる事実を認識する必要があります：**あなたのコンパイラは実は「3 段重ねのロシア人形」で、しかも「最新版」が 2 つ存在します。**

**まず認識：3 層構造 + 2 つの「最新」**

| 層 | 何か | 現在の最新 | 更新の早さ |
| --- | --- | --- | --- |
| ① あなたが PIO で実際に使っている（WCH カスタム版） | `riscv-wch-elf` triple + WCH が QingKe コア用に当てた専用パッチ付き | **GCC 12.2.0**（あなたが入れたのはこれ） | **ほぼ動かない**、長期 12.2.0 で停滞 |
| ② ① のパッケージ元 | Community-PIO-CH32V が ① を PIO パッケージとして再パッケージしたもの | 同上（release 名 `riscv-none-embed-gcc 12.2.0-3`） | ① に追従 |
| ③ 最上流（vanilla） | xPack の汎用 RISC-V GCC、**WCH パッチなし** | **GCC 15.2.0**（2025-10-23） | 継続更新、上流 GNU GCC を密追跡 |

> **重要な注意**：ネットでよく言われる「コミュニティ版は更新され続けている」が指しているのは第 ③ 層（xPack、既に 15.2.0）です。あなたが CH32V で実際に使っている第 ① 層（WCH カスタム版、まだ 12.2.0 のまま）ではありません。この 2 系統は**混ぜて追ってはいけません**——xPack 15.2.0 で今のコンパイラをそのまま置き換えると、WCH が QingKe コア用に加えた専用パッチが失われ、CH32V 上の一部機能が効かなくなる可能性があります。**CH32V 開発において正しいのは ①② に追うことで、③ の最新を盲追いすることではないのです。**
>
> ついでに小技：あなたのコンパイラの完全な身分文字列 `riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0` は、3 つの情報点として一目で読めます——`wch-elf` が WCH カスタムの標識、`xPack` が上流パッケージ元、`arm64` が Apple Silicon ネイティブ版を示します。

**自分が今どの版を入れたか確認する方法**

```bash
# 1. PIO パッケージのバージョンを見る（PlatformIO 独自の番号で、コンパイラのバージョンとは別物）
pio pkg list | grep -i riscv

# 2. コンパイラの完全な身分を見る（バージョン、ターゲット triple、ABI、ARCH、ビルド host が全部載る、これを覚えるのが一番おすすめ）
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc -v

# 3. C ライブラリ（newlib）のバージョンを見る——printf はこれが実装している
grep "_NEWLIB_VERSION" ~/.platformio/packages/toolchain-riscv/riscv-wch-elf/include/_newlib_version.h

# 4. binutils（アセンブラ/リンカ）のバージョンを見る
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-ld.bfd --version

# 5. platform.json がツールチェーンをどのソースに「固定」しているか見る（アップグレード時にどのリポジトリを引くかを決める）
grep -A3 '"toolchain-riscv"' ~/.platformio/platforms/ch32v/platform.json
```

**最新版はどこで見るか（3 つの窓口、関連度順）**

- **窓口 1：WCH 公式 / MounRiver（WCH カスタム版の真の上流、最も関連）**。`riscv-wch-elf` という triple と WCH のコアパッチの源流は、WCH 公式の MounRiver Studio にあります——あなたのコンパイラのビルド情報にはビルドパス `/Users/mrs/...`（mrs = MounRiver Studio）と書かれていますが、それがこの出自です。公式ダウンロードページ `www.mounriver.com`（「MounRiver Studio」と「Toolchain 工具链」を探す）、公式 SDK リポジトリは `github.com/openwch`。現在の MRS ツールチェーンシリーズは v1.91（Community-PIO-CH32V の release ノートにも "Update toolchain to v1.91" と書かれています）。
- **窓口 2：Community-PIO-CH32V パッケージ版（あなたが PIO で実際に使っているもの）**。これは本質的に MounRiver の WCH ツールチェーンを PlatformIO パッケージに詰め直したもの。releases をウォッチすれば、PIO 側が新版に追従するタイミングをいち早く知れます：`github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`。通知を即座に受け取りたいなら、ページ右上の Watch → Custom → Releases にチェックを入れるか、RSS を購読：`github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases.atom`。
- **窓口 3：xPack 上流（vanilla、更新最速、参考用）**：releases は `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack/releases`、バージョン履歴が最も揃っているのは `npmjs.com/package/@xpack-dev-tools/riscv-none-elf-gcc`。現在の最新は 15.2.0-1.1。

**アップグレード方法（と、絶対に避けるべき罠）**

```bash
# ch32v プラットフォーム全体をアップグレード（フレームワーク、ツールチェーン含む——Community-PIO-CH32V が新版を出したときに初めて本当に更新される）
pio pkg update -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git

# あるいはツールチェーンのパッケージだけを個別にアップグレード
pio pkg update -g -t toolchain-riscv
```

> ⚠️ **アップグレード時に避けるべき罠（第 19 章 FAQ の Q3 と呼応）**：第 5 章で掘った通り、`platform.json` はツールチェーンの取得元を**Windows リポジトリにハードコード**しています。つまり `pio pkg update` を走らせたりプラットフォームを再インストールしたりすると、苦労して手動で差し替えた macOS ネイティブ版が**Windows 版に上書きされてしまう**ことが珍しくありません。もし遭遇したら、6.1 / 6.2 の差し替え手順をもう一度なぞれば OK。根本解決したいなら、プラットフォームのリポジトリを自分で fork して `platform.json` をデフォルトで macOS 版を指すように書き換え、完全に根治しましょう。
>
> もう一度方向を強調：アップグレードは Community-PIO-CH32V が追従した新版の **WCH カスタムツールチェーン**を取得するためであって、xPack の 15.2.0 を追うためではありません。PIO で CH32V を扱うなら、常に ①②（WCH カスタム版）を基準にしてください。

---

## 七、Gatekeeper の隔離を解除する（しないと macOS に「ウイルス」として遮断される）

macOS にはセキュリティ機構があり、実行ファイルがネットワーク経由でダウンロードされたもの（`git clone` も該当）だと、`com.apple.quarantine` という隔離タグを自動で付与します。この手のファイルは Apple の署名認証を通っていないと、実行時に遮断されます。エラーはだいたいこんな形：

```
"xxx" cannot be opened because the developer cannot be verified
```

あるいは、もっと単純乱暴に：

```
killed: 9
```

今回インストールしたコンパイラやライタは、まさに「署名なし・ネットワーク経由ダウンロード」の典型例なので、事前に隔離属性をクリアしておきます：

```bash
xattr -dr com.apple.quarantine ~/.platformio/packages/toolchain-riscv
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-wlink
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-openocd-riscv-wch
```

> `-r` は再帰オプションで、ディレクトリ内の全ファイルの隔離属性を一括クリアします。あるファイルに元々この属性が付いていなくてもエラーにはなりません。「やっておいて損はない」予防操作なので安心して実行してください。

---

## 八、ツールチェーンが本当に動くか検証する

インストールが終わったら、すぐプロジェクトを始める前に 10 秒だけ使って、主要 3 点がちゃんと実行できるか確認しましょう：

```bash
# コンパイラ（第 6 章で確認した最終版、gcc12.2.0、arm64 ネイティブ、Rosetta 不要）
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0

# もしインストールされたのが gcc8/x86_64 の古いバージョンだったら、コマンドと出力はこう切り替えて：
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
# riscv-none-embed-gcc (xPack GNU RISC-V Embedded GCC x86_64) 8.2.0

# 書き込みツール（arm64 ネイティブ）
~/.platformio/packages/tool-wlink/wlink --version
# wlink 0.1.1

# デバッグツール（任意、arm64 ネイティブ）
~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd --version
```

> **Rosetta に関する小さな注意**：gcc12/arm64 ネイティブ版なら理論上 Rosetta は完全に不要です。でももし gcc8/x86_64 の古いバージョンが入ってしまった場合は、初回呼出時にシステムが Rosetta 2 を入れるか尋ねてくることがあります。確認して入れれば OK、1 回限りの操作で、以降は二度と尋ねられません。上記のコマンドが正常にバージョン番号を返せば、環境は開通しています。

---

## 九、最初のプロジェクト作成：platformio.ini を知る

### 9.1 プロジェクト構造はどんな姿

最もシンプルな PlatformIO プロジェクトは、骨組みだけで 2 つしかありません：

```
ch32v307-test/
├── platformio.ini      # プロジェクト設定ファイル。「どのチップ、どのフレームワーク、どう書き込むか」は全部ここに書く
└── src/
    └── main.c           # あなたのファームウェアコード、プログラムの入口
```

コマンドラインで空のプロジェクトを作っても OK（VSCode の「New Project」GUI から作っても全く同じです）：

```bash
$PIO project init -d ~/ch32v307-test --board ch32v307_evt
```

### 9.2 `platformio.ini` を行ごとに分解

プロジェクト全体で最も重要な設定ファイルで、新規プロジェクトを立てるたびに付き合うことになるので、行ごと説き明かす価値があります。内容はだいたいこんな感じ：

```ini
[env]
platform = ch32v
framework = noneos-sdk
monitor_speed = 115200
; オンボード WCH-Link デバッガ。wlink は macOS arm64 をネイティブサポートする書き込みツール
upload_protocol = wlink

[env:ch32v307_evt]
board = ch32v307_evt
; EVT-R1 の工場出荷時デフォルト：Flash 256K + SRAM 64K（board のデフォルトと一致、上書き不要）
; 288K Flash / 32K SRAM など別のレイアウトに切り替えたい場合は、まず WCH ツールで option bytes を変更し、
; ここでコメントアウトを解除して同期すること：
; board_upload.maximum_size = 294912
; board_upload.maximum_ram_size = 32768
```

1 行ずつ見ていきます：

- **`[env]`**：これは「共通設定エリア」で、配下に書いたものはすべての環境（env）に効きます。将来的に複数のボードを同時サポートするプロジェクトにする場合、共通パラメータをここに書けば重複を減らせます。
- **`platform = ch32v`**：PlatformIO にどのプラットフォームを使うか伝えます。私たちが前章まで悪戦苦闘して入れた `Community-PIO-CH32V` コミュニティプラットフォームのことです。
- **`framework = noneos-sdk`**：WCH 公式の標準ペリフェラルライブラリを選択（ベアメタル開発、OS のスケジューリングなし）。これが最も古典的で資料も豊富な入門フレームワークで、対応するパッケージは `framework-wch-noneos-sdk`、本記事で実測確認できたバージョンは `2.30000.0` です。将来マルチタスクを遊びたくなったら、この行を `freertos` か `rt-thread` に変えるだけで OK、他の設定はほぼ変えなくて済みます——これも PlatformIO 生態の利点の一つ。
- **`monitor_speed = 115200`**：シリアルモニタ（`pio device monitor`）が使うボーレート。**この数値は、コード内で `USART_Printf_Init()` に渡す引数と一致していないといけません**。両者がズレると、シリアルからは文字化けの塊が出てきます。初心者がよくハマる小さな罠です。
- **`upload_protocol = wlink`**：PlatformIO にどのツールでボードへ書き込むか伝えます。選べるプロトコルはこれ一つではなく（後の第 12 章で対照表を出します）、macOS arm64 ユーザは `wlink` が一番省ストレス。ネイティブサポートされているからです。
- **`[env:ch32v307_evt]`**：これは具体的な「環境」定義で、名前は自由ですが、慣習的にボード型番と合わせておくと管理しやすいです。
- **`board = ch32v307_evt`**：具体的なボード型番を指定すると、PlatformIO はこれに基づいて、対応するピン定義、Flash/RAM サイズ、デフォルトクロックなど一式パラメータをロードします。
- **Flash/RAM のコメント行**：ここには人を悩ませるディテールが隠れています——EVT-R1 ボードのチップは実際には **288KB** の Flash を積んでいるのに、`board` のデフォルトは **256KB** です。でも急いで変更しないでください、これはバグではありません：工場出荷時の option bytes 設定が 256KB Flash + 64KB SRAM で区分けされていて、`board` のデフォルト値とちょうど合うからです。入門段階ではこの 2 行のコメントは触らなくて OK。将来本当に Flash を 288KB まで使い切りたくなったときには、WCH 公式ツールでチップの option bytes を変更してから、戻ってきてこの 2 行の設定を同期させる——という上級操作になります。入門段階では放置で OK です。

### 9.3 PlatformIO が生成した `main.c` テンプレートを読み解く——「CH32 開発のメンタルモデル」を作る

この節は重中之重です。初めて PlatformIO が自動生成した `main.c` を開くと、冒頭のわさっとした `#if defined(...)` に撃退され、「複雑すぎ」と思う人が多いです。怖がらなくて大丈夫、分解して見ていけば、実はそれほど恐ろしくないと分かりますし、これを理解すれば、今後 WCH のどんなチップに替えても筋が一瞬で分かります。

テンプレートの冒頭はこんな姿（抜粋）：

```c
// ① コンパイル時マクロに基づいて、現在のチップに対応するヘッダを自動選択
#if defined(CH32V003)
#include <ch32v00x.h>
#elif defined(CH32V10X)
#include <ch32v10x.h>
#elif defined(CH32V30X) || defined(CH32V31X)
#include <ch32v30x.h>
// ... 後ろに V20X / X035 / L103 / H417 などブランチが続く
#endif
#include <debug.h>   // ← この行がキー：シリアル初期化、ディレイ、printf のリダイレクトを提供
```

**このコード、なぜこんな姿をしているのか？** PlatformIO のテンプレートは WCH の**全シリーズチップ**に通用する 1 つのコードだからです。`CH32V003`、`CH32V307`、`CH32X035`……数十種類のチップが同じ `main.c` 骨格を共有し、コンパイル時に一連の `#if defined(...)` で「あなたがどのチップを使っているか」を自動推定し、対応するメーカー提供ヘッダを `#include` します。これらのマクロは `platform = ch32v` + `board = ch32v307_evt` という設定が背後で自動的に定義してくれるので、手書きする必要はありません。

**私たちの CH32V307 にとって**、本当に効いているのは実は 2 行だけです：

```c
#include <ch32v30x.h>   // CH32V30X シリーズのペリフェラル定義（レジスタ、GPIO_InitTypeDef などはすべてここから）
#include <debug.h>      // キーとなるデバッグ補助ライブラリ
```

これが分かると、あのわさっとした `#if defined` はもう「複雑なロジック」ではなく「多択一のスイッチ」になります。この筋さえ理解すれば、今後 CH32 シリーズの新しいボードを手にして、似たテンプレートコードを見ても慌てません。**これがいわゆる「CH32 開発のメンタルモデル」：まずボードがどのシリーズのヘッダに対応するかを見て、次に `debug.h` がどんな補助関数を提供しているかを見る、という順序です。**

### 9.4 `debug.h` には何が隠れているのか

このヘッダは WCH 公式 SDK に同梱されていて、ほぼすべての CH32 プロジェクトで使われます。前もってこれが提供する関数を知っておけば、回り道を大幅に減らせます：

```c
void Delay_Init(void);                        // ディレイ用システムタイマの初期化
void Delay_Us(uint32_t n);                    // マイクロ秒単位のディレイ
void Delay_Ms(uint32_t n);                    // ミリ秒単位のディレイ
void USART_Printf_Init(uint32_t baudrate);    // USART1 を初期化し、printf をこれへリダイレクト
```

対になる `debug.c`（同じく SDK 同梱、自作不要）には、C 標準ライブラリが要求する最下層の `_write()` 関数が実装され、それが USART1 に接続されています。**つまりリダイレクトコードを自力で書く必要は全くなく、`USART_Printf_Init(115200)` を 1 回呼ぶだけで、以降は `printf(...)` を書けばシリアルから出力が見えます**——多くのマイコン初心者が見落としがちな、それでいて極めて便利な機能です。後述の「シリアル出力が出ない」罠を踏むと、この 1 行の印象がぐっと強くなります。

### 9.5 「コンパイルは通るけど何もしない」最小サンプル

Hello World に深入りする前に、最も基礎的な L チカコードで、CH32 の GPIO 操作の基本形を味わっておきましょう：

```c
#include <ch32v30x.h>   // CH32V30X シリーズのヘッダ、board 設定で自動的にどれを引き込むか決まる
#include <debug.h>

#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);   // 割込優先度グループの設定（定番の最初の動作）
    SystemCoreClockUpdate();                          // システムクロック変数をリフレッシュ（同じく定番動作）
    Delay_Init();                                     // ディレイ機能の初期化

    GPIO_InitTypeDef GPIO_InitStructure = {0};

    BLINKY_CLOCK_ENABLE;                               // ① まず GPIOA ペリフェラルに「通電」（クロック有効化）
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;           // ② PA0 ピンを選ぶ
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;    // ③ モード：プッシュプル出力
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;   // ④ 立ち上がり/立ち下がり速度
    GPIO_Init(GPIOA, &GPIO_InitStructure);              // ⑤ 設定を実際にレジスタへ書き込む

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(GPIOA, GPIO_Pin_0, ledState);   // PA0 のレベルを ledState に設定
        ledState ^= 1;                                 // レベルを反転、次のラウンドは逆に
        Delay_Ms(500);                                  // 500ms 停止、「点滅」の見え方を作る
    }
}
```

**この GPIO 初期化の定番 4 ステップを覚えてしまいましょう**。今後書く CH32 プロジェクトのペリフェラル初期化は、すべてこのパターンの変形です：

1. **クロックを有効化**：STM32 系チップ（CH32 のペリフェラルライブラリはほぼ STM32 標準ライブラリの写し）には、すべてのペリフェラルがデフォルトで「通電オフ」状態という特徴があります。使う前に必ず `RCC_XXXClockCmd(...)` で対応するクロックを有効化します。これを忘れるとペリフェラルは飾りで、どう設定しても反応しません。
2. **構造体に詰める**：`XXX_InitTypeDef` 構造体を宣言し、欲しいモードや速度などを 1 つずつ設定。
3. **`XXX_Init()` を呼ぶ**：構造体を対応する初期化関数に「食わせ」て、初めてパラメータがチップのレジスタに書き込まれます。
4. **`while(1)` の中で仕事**：対応する読み書き関数（例えば `GPIO_WriteBit`）でペリフェラルを操作。

よし、理論は終わり。次に実際にコンパイル、書き込んでみると——理論上問題ないコードでも、実操作だと「予想外」の罠に遭遇することに気づきます。

---

## 十、最初のコンパイル

準備万端、コンパイルを走らせます：

```bash
$PIO run -d ~/ch32v307-test        # もしくはプロジェクトディレクトリに cd してから pio run
```

初回コンパイルでは、WCH の `noneos-sdk` フレームワーク（ペリフェラルドライバのフルソースコード入り）が自動ダウンロードされ、少し時間がかかります、30〜60 秒程度。コンパイル成功時の出力はこんな感じ：

```
Linking .pio/build/ch32v307_evt/firmware.elf
RAM:   [          ]   3.2% (used 2080 bytes from 65536 bytes)
Flash: [          ]   0.7% (used 1728 bytes from 262144 bytes)
Building .pio/build/ch32v307_evt/firmware.bin
========================= [SUCCESS] Took 47.36 seconds =========================
```

緑色の `[SUCCESS]` が見えたら、VSCode、pio、macOS ネイティブコンパイラまで、ツールチェーン全体が完全に開通した証拠。自分で拍手してあげましょう。コンパイル産物は `.pio/build/ch32v307_evt/` ディレクトリにあります：

- `firmware.elf`：完全なデバッグシンボル付き、デバッグ時に使用。
- `firmware.bin`：純粋なバイナリ、書き込み時に使うのはこれ。

2 本のプログレスバー（RAM/Flash の使用率）には一瞥の価値があります。後で `printf` 機能を追加すると、Flash 使用量が明確に一段階増えますが、正常な現象なので慌てなくて OK。第 13 章で理由を説明します。

---

## 十一、`pio` をグローバルコマンドにする

毎回 `~/.platformio/penv/bin/pio` と打つのは面倒なので、システム PATH 内のディレクトリにシンボリックリンクを張ります。Apple Silicon の Mac では、Homebrew はデフォルトで `/opt/homebrew/bin` に入り、このディレクトリは通常、現在のユーザ（admin グループ所属）に書き込み権限があります：

```bash
if [ -w /opt/homebrew/bin ]; then
  ln -sf ~/.platformio/penv/bin/pio /opt/homebrew/bin/pio
  ln -sf "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" /opt/homebrew/bin/code
fi
```

確認：

```bash
pio --version      # PlatformIO Core, version 6.1.19
code --version     # VSCode のバージョン番号
```

> `/opt/homebrew/bin` に書き込み権限がない場合は（珍しいですが）、自分の書き込み可能なディレクトリに変えます。例えば `~/.local/bin` を作り、それを shell の PATH に追加：
> ```bash
> mkdir -p ~/.local/bin
> ln -sf ~/.platformio/penv/bin/pio ~/.local/bin/pio
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
> ```
> `~/.zshrc` を変えた後は、新しいターミナルウィンドウを開くか `source ~/.zshrc` を実行して設定を有効化するのを忘れないでください。

これで以降、本記事で `$PIO` や `~/.platformio/penv/bin/pio` と書かれている箇所は、すべて単に `pio` と書いて OK です。

---

## 十二、ハードウェアの接続と書き込み

### 12.1 接続：正しい USB ポートに挿す

EVT-R1 ボードには通常 USB ポートが 2 つあります。**書き込み・デバッグには、オンボード WCH-Link に繋がっている方のポートを挿します**（ボードのシルクにたいてい DEBUG / Link / WCH-Link と書いてあります）。USB-Device と印字されている方ではないので注意。2 つのポートは機能が全く異なり、挿し間違えるとデバイスマネージャにすら現れません。macOS は CDC シリアルドライバを内蔵しているので、挿せばすぐ使え、ドライバ追加インストール不要。この点は Windows よりずっと楽です。

### 12.2 WCH-Link の 2 つのモード

WCH-Link というデバッガチップには 2 つの動作モードがあります：**RV モード**（RISC-V チップ向け）と **DAP モード**（ARM チップ向け）。私たちの CH32V307 は RISC-V コアなので、正常に書き込むにはデバッガが **RV モード** でなければなりません。ボードは工場出荷時デフォルトで RV モードになっているのが普通です。もし書き込みが一向に成功しない場合は、`wlink` コマンドか WCH 公式ツールでモードを切り替えて確認してみましょう：

```bash
# 現在接続されている WCH-Link デバイスを一覧表示
pio pkg exec -- wlink list          # もしくはパスが PATH に入っていれば wlink list を直接叩く
```

### 12.3 いよいよ書き込み

**方法 1：コマンドライン**

```bash
cd ~/ch32v307-test
pio run -t upload
```

先ほど `platformio.ini` で設定した `upload_protocol = wlink` がこのステップで効いてきます——PlatformIO は macOS ネイティブの wlink ツールを呼び出し、WCH-Link 経由で `firmware.bin` をチップに書き込みます。

**方法 2：VSCode の GUI**

プロジェクトフォルダを開くと、左下の PlatformIO ツールバーにアイコンが並びます。矢印アイコン（Upload）をクリックするだけ。コマンドラインと同じ効果。マウス派手の方はこちらで。

書き込み成功時、`wlink` はデバッガとチップの詳細情報を出力してくれて、参考になります：

```
04:17:53 [INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
04:17:53 [INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
04:17:53 [INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
04:17:54 [INFO] Flash done
04:17:54 [INFO] Now reset...
```

1 行目の `v2.18(v38)` がこの WCH-Link デバッガ自体のファームウェアバージョン。3 行目ではチップの実際の Flash 容量が 288KB であることが確認でき（第 9 章で触れたディテールと呼応）、チップ固有の UID も見えます。プロダクトのシリアライズに使えるかもしれません。

### 12.4 書き込みプロトコルの選び方

`board` 定義では実は何種類かの書き込みプロトコルをサポートしており、必要に応じて切り替えられます：

| プロトコル | 基層ツール | 説明 |
|---|---|---|
| `wch-link` | openocd（`0.11.0+dev-snapshot`、PIO パッケージ `2.1100.260228`） | デフォルトプロトコル、openocd 経由で WCH-Link にアクセス |
| `wlink` | wlink（ツールバージョン `0.1.1`、PIO パッケージ `tool-wlink@0.23.241116`） | **macOS ユーザにはこれをお勧め**。ネイティブ、軽量、高速、本記事でも実際に使っている |
| `minichlink` | minichlink（`0.1.0`） | コミュニティ保守のもう一つの軽量ツール、選択肢 |
| `isp` | wchisp（`0.2.3`、PIO パッケージ `0.23.240914`） | USB Bootloader モードで書き込み。BOOT0 ピンを High にして bootloader に入る必要あり。WCH-Link がないシナリオ向け |

### 12.5 デバッグ（ブレークポイント、ステップ実行）

VSCode で **F5** を押すだけでデバッグセッションが起動します（基層は openocd + RISC-V GDB が連携）。ブレークポイント、ステップ実行、変数やレジスタのリアルタイム値確認が可能。ボード対応の SVD レジスタ記述ファイル（`CH32V307xx.svd`）は board 設定で既に指定されているので、ペリフェラルレジスタの可視化確認も箱から出してすぐ使え、追加設定不要。このテーマは広げるともう 1 本書けるので、ここでは要点だけ。必要十分です。

---

## 十三、罠①：コンパイルも書き込みも成功、でもシリアルは死の静寂

ツールチェーンが開通し、書き込みも成功した後、多くの人が「ついに完成」とシリアルモニタを期待を込めて開いて——絶望します。

### 現象

```bash
pio run              # コンパイル成功 ✅
pio run -t upload    # 書き込み成功 ✅
pio device monitor   # シリアルモニタを開く → 真っ白、幽霊の影もない
```

コンパイルエラーなし、書き込みも成功を確認、シリアルモニタも確かにその `/dev/cu.usbmodem***`（オンボード WCH-Link が仮想化したシリアルデバイス）に繋がっている——それなのに**1 文字も受信できない**。ここでボーレートを疑い、ドライバを疑い、ボード坏ったんじゃと疑い始めます。

### 根因：実はめちゃくちゃ単純

コードを開けば一瞬で分かります——**PlatformIO がデフォルトで生成したテンプレートコードには、シリアルの初期化が一行もありません。コード内に `printf` も一行もありません**。純粋に「GPIO を設定 → while ループでレベルを反転 → ディレイ」をするだけの L チカプログラムで、最初から最後までシリアルへ 1 バイトも送っていません。シリアルに何も届かないのは当然——回路が坏れたのではなく、コードがそもそも喋る気がないだけ。

> オンボード WCH-Link が仮想化したシリアル（業界では VCP、仮想シリアルポートと呼ばれる）は、デフォルトでターゲットチップの **USART1（対応 PA9 = TX、PA10 = RX）** にブリッジされています。ハードウェアの経路は完全に繋がっています。プログラム自身が何も送っていないだけ。

### 解決：初期化 + printf を足す

第 9 章で `debug.h` の `USART_Printf_Init()` 関数を紹介しました。これを正式に使います、2 行で解決：

```c
Delay_Init();

// USART1 (PA9/PA10) はオンボード WCH-Link の仮想シリアル経由。SDK の _write が既に printf をここへリダイレクト済み
USART_Printf_Init(115200);
printf("CH32V307 起動完了、SystemCoreClock = %lu Hz\r\n", SystemCoreClock);
```

さらに `while(1)` ループにも 1 行 printing を足しておけば、プログラムが走っているかリアルタイムに分かります：

```c
while (1) {
    GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
    printf("LED %u\r\n", ledState);
    ledState ^= 1;
    Delay_Ms(100);
}
```

再コンパイル＆書き込みすると、シリアルが即座に生き返ります：

```
CH32V307 起動完了、SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

> **小さなポイント**：`printf` を足すと、Flash 使用量は 0.7%（1728 バイト）前後から 2.8% 程度（7440 バイト前後）まで跳ね上がります。`printf` がフォーマット文字列処理の一式をファームウェアにリンクしてしまうからです。これは正常な現象で、`printf` は決して「無料」ではありません。空間をデバッグ体験に替えるだけの話。慌てなくて OK、この数 KB を気に病む必要もありません。

### 以後、シリアルに出力がないときはこの順で切り分け

今回の経験を、汎用的な切り分けリストにまとめて保存しておきましょう。似た問題にぶつかったらこれを当たります：

1. **コードの中に本当に `USART_Printf_Init` の呼び出しと `printf` の記述があるか？**（本記事で最も一般的、かつ最も見落とされやすい罠。まずこれを疑え）
2. **ボーレートは合っているか？** コード内の `USART_Printf_Init(115200)` は `platformio.ini` の `monitor_speed` と一致が必要。どちらかを変えて同期し忘れると、文字化けか空白になります。
3. **WCH-Link の仮想シリアル機能が意図せず Off になっていないか？**（WCH 公式の WCH-LinkUtility ツールで確認可能）
4. **本当によりたいのは「チップ自身が USB シリアルになる」（USB CDC）機能ではないか？** そうだとしたら、それは USB プロトコルスタックが必要な別のファームウェア方案で、ここで扱っている「USART1 + WCH-Link ブリッジ」とは全く別の経路です。混同しないでください。

---

## 十四、罠②（本記事最大の罠）：シリアルは喋るのに LED だけがどうしても点かない

悪戦苦闘の全過程で最も発狂させられた罠がこれ。**ソフトウェアとほぼ無関係**で、純粋なハードウェア設計の問題なので、コードをどれだけ正しく書いても解決しません。少々辛抱して本節を読み切れば、コードを前に髪をかきむしる 30 分を節約できます。

### 現象

この時点でシリアルは正常に出力できています（ファームウェアが正常に動いている証拠。固まってもいないし HardFault でもない）。**それなのにボード上ではどんなに探しても LED が点滅していない**。

### 根因：オンボードユーザ LED は工場出荷時から「端っこ切れた」状態

**このボードの 2 颗のユーザ LED（シルク LED1、LED2）は、工場出荷時から MCU のピンに繋がっていません、完全に浮いています。** 具体的には、片方の端だけが GND に接続され、もう一方の端はぽつんとした裸のランドかピンヘッダの穴のままで、あなたが自ら配線するのを待っています——これは特定ボードの個体品質の問題ではなく、WCH 公式回路図（`CH32V30xSCH.pdf`）がそもそもこう設計されています。

つまり：**あなたのコードが PC1、PD0、PA0 のどれを反転させていようと、实体のジャンパワイヤ 1 本でそのピンを LED ランドに接続しない限り、LED は永遠に点きません。これは純ハードウェアの問題で、ソフトウェアコードをどんなに飾っても無駄。**

この罠は僕だけが踏んだわけではなく、複数の独立情報源で裏付けが取れます：Zephyr 公式ドキュメントのこのボードの説明には「オンボード LED は回路設計上 SoC に接続されていない」と明記されています。中国語の WCH CH32V307EVT-R1 使用説明書でも、ボードの 2 颗のユーザ LED はどの GPIO ピンにも接続されておらず、ユーザ自身が手配線しないと点灯しない、と指摘されています。オンボードのユーザボタン KEY も同様、やはり浮いていて、同じ罠をもう一度踏むことに。

> **ボード上で唯一デフォルトで接続済み、通電すると点くのは電源 LED** だけ——USB を挿した瞬間に常時点灯するあれです。コードとは全く無関係で、「L チカ成功！」と勘違いしやすいのですが、実は MCU の制御下には一切ありません。

### 修正：ソフト＋ハードの 2 ステップ

**第 1 ステップ：反転させるピンを選ぶ**

WCH 公式の GPIO サンプルコードでは **PA0** ピンを定番で使います。資料が最も豊富、コミュニティ議論も最多、追加の罠を踏みにくいので、コード内の L チカ用ピンを PA0 に統一します：

```c
// EVT-R1 のユーザ LED はデフォルトで浮いていて（MCU 未接続）、ジャンパワイヤ 1 本で PA0 を LED1 にブリッジしないと点かない
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)
```

> ⚠️ **連鎖する小さな罠**：他のポート（例えばテンプレート元の PC1）から PA0 に変える場合、**クロック有効化の行も忘れずに `RCC_APB2Periph_GPIOA` に同期して変える**こと。ここでガチで罠を踏みました：ピン定義だけ変えて、クロック有効化を対応する GPIOA に変え忘れた結果、GPIOA ペリフェラルのクロックが開かず、PA0 のレベルがピクリとも動かない。コードロジックを半日程追って、最終的に「一箇所直して一箇所忘れ」の典型ミスだと分かりました。ポート設定を変えた後は、関連するすべてのマクロ定義を全体で点検してください。半分直して半分残さないように。

**第 2 ステップ：实体のジャンパワイヤを 1 本接続（どちらかを選ぶ）**

- **方案 A（オンボード LED1 を使う、WCH 公式推奨）**：ジャンパワイヤ 1 本を用意し、片方を **PA0**（Arduino ヘッダの `A0` と印字された穴）に、もう片方をボード上で `LED1` とシルク表示されたランドに接続。ランドの具体的な位置は、EVT 資料パックの `CH32V30xSCH.pdf` 回路図を参照してください。
- **方案 B（外部 LED を自分で接ぐ、最も確実で最も直感的）**：普通の LED 1 颗と、330Ω〜1kΩの電流制限抵抗を直列に繋ぎ、**PA0 と GND** の間に接続。極性を逆に挿しても大丈夫、コードは絶えず高低レベルを反転しているので、正逆どちらかの向きで必ず点灯します。違うのは「どの半周期で光るか」だけです。

配線が終わったら `pio run -t upload` を再実行。LED1 が 100ms のリズムで点滅し始め、同時にシリアルにも同期して `LED 0 / LED 1` が流れます。ここで初めて本当の意味で「Hello World」が動いた、と言えます。🎉

> **なぜ WCH は LED を浮いたまま設計したのか？** おそらく「開発者に自由度を」の配慮でしょう——LED やボタンを、プロジェクトで使いたい任意の GPIO に接げるように、工場出荷時のはんだ固定ピンに縛られないように。出発点は悪くないのですが、初めて手にする入門者には極めて不親切です。ボードを開いた人の第一反応は「まず配線が必要とは思いもよらず」「きっとコードがどこかおかしい」となるからです。

### さらに深い教訓：ソフトウェアの問題かハードウェアの問題か、まず切り分ける

この罠の本当の価値は、「PA0 にジャンパワイヤを繋ぐこと」のような具体ディテールの暗記ではなく、組み込みデバッグで汎用的な切り分けの考え方を教えてくれる点にあります。

**「反応ない」＝「コードが間違っている」ではありません。** ペリフェラルが反応しないに遭ったら、まずやるべきは「ファームウェアが本当にそのロジックまで到達しているか」を証明することであって、すぐにコードロジックと格闘し始めることではありません。今回ソフトウェアではなくハードウェアの問題だと素早く特定できたのは、**シリアルが先に文字を出した**からです——シリアルが正常に出力できていれば、メインループは正常に回っていて、固まったりはしていない。まず「ソフトウェアは正常に動いている」を確定しておけば、残る「反応ない」はほぼハードウェアの経路に絞り込めます。これが、新規プロジェクトではまずシリアルを開通させるのを勧める理由——不具合の切り分けで最速かつ最も直感的な物差しだからです。

---

## 十五、動くようになった後の完全な `main.c` の姿

前の 2 つの罠の修正を合わせると、最終的に正常に動く完全なコードは以下の通り。PlatformIO が生成した素のテンプレートより、シリアル初期化と printing 文が増えています：

```c
#include <ch32v30x.h>
#include <debug.h>

// EVT-R1 のユーザ LED はデフォルトで浮いていて（MCU 未接続）、ジャンパワイヤ 1 本で PA0 を LED1 にブリッジしないと点かない
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

    // USART1 (PA9/PA10) はオンボード WCH-Link の仮想シリアル経由。SDK の _write が既に printf をここへリダイレクト済み
    USART_Printf_Init(115200);
    printf("CH32V307 起動完了、SystemCoreClock = %lu Hz\r\n", SystemCoreClock);

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

末尾の 2 つの割込ハンドラについて一言。`NMI_Handler` と `HardFault_Handler` は RISC-V/ARM マイコンで非常によく見る 2 つの「異常の保险」関数で、`__attribute__((interrupt("WCH-Interrupt-fast")))` はコンパイラに「これは割込サービス関数だから、割込向けのコードを生成して（レジスタの自動退避・復帰など）」と伝える修飾子です。ここの実装はとてもシンプル——`HardFault_Handler` は即座に `while(1){}` で停止する、保守的だが有効な保险戦略です。万一プログラムが本当に暴走してハードウェア例外を起こしたら、チップにエラー状態を抱えたまま暴れ続けるより、ここで止まってデバッガを接続して当時の状態を確認できる方がマシ、という判断。プロジェクトが大きくなったら、ここにエラーログや LED 警告などのロジックを足せば OK、今は役割だけ知っていれば十分です。

完全なプロジェクトコード（`platformio.ini` 含む）は GitHub に置いてあります。リンクは文末。そのまま clone して走らせられます。

---

## 十六、罠まとめ表

本記事の全罠を 1 箇所に集めた一覧です。後から見返すのに便利：

| # | 現象 | 根因 | 解決 |
| --- | --- | --- | --- |
| 1 | プラットフォームインストールで `repository not found` | GitHub 組織名の打ち間違い。正しくは `Community-PIO-CH32V`（PIO 含む、大文字） | 正しい組織名のアドレスを使う |
| 2 | `pio platform install` が deprecated を提示 | 新しい PlatformIO は `pkg` サブコマンドに統一 | `pio pkg install -g -p <アドレス>` に切り替え |
| 3（核心） | プラットフォームはインストール成功したのにツールチェーンディレクトリが `.exe` だらけでコンパイルが必ず失敗する | `platform.json` がツールチェーン取得元を Windows リポジトリにハードコード、インストール時に OS を見ない | Windows 版を削除し、`toolchain-riscv-mac` と `tool-wlink`（`mac_arm64` / `mac_x64` ブランチ）を手動でインストール |
| 4 | ツールチェーンのブランチを間違えてコンパイラ実行ファイルが見つからないエラー | ビルドスクリプトがツールチェーンのバージョン番号第 2 セグメントに基づいてコンパイラ接頭辞を自動選択（`1.8.x`→`riscv-none-embed`、`1.12.x`→`riscv-wch-elf`）。インストールした版と実際に存在する実行ファイルが合わない | まず `ls` で実際にインストールされた実行ファイルの名前を確認し、それに合わせて使う |
| 5 | コンパイラ/ライタ実行時に「デベロッパを確認できない」や `killed: 9` | macOS がネットワーク経由でダウンロードした未署名バイナリに隔離属性を付与 | `xattr -dr com.apple.quarantine <ディレクトリ>` |
| 6 | x86_64 アーキテクチャのコンパイラが Apple Silicon で「水土地不服」になるのではと心配 | xPack は初期に arm64 版を出しておらず、Rosetta 2 のトランスレートが必要 | 問題なし、Rosetta を入れればコンパイルは完全に正常 |
| 7 | `pio` を `/usr/local/bin` にシンボリックリンクしようとして失敗 | このディレクトリは root 所有で、一般ユーザに書き込み権限がない | 代わりに `/opt/homebrew/bin` を使うか、`~/.local/bin` を自作して PATH に追加 |
| 8 | コンパイルも書き込みも成功、シリアルモニタは真っ白 | テンプレートコードは純粋な L チカループのみ、**シリアル初期化も `printf` もない** | `USART_Printf_Init(115200)` を呼び出し、普通に `printf` を使う（SDK が既にそれを USART1 へリダイレクト済み） |
| 9（本記事最大の罠） | シリアルは正常に出力できるのに、ボード上で LED が点滅しない | **オンボードユーザ LED は工場出荷時から浮いていて、MCU ピンに接続されていない** | ジャンパワイヤ 1 本で PA0 を LED1 にブリッジ（もしくは外部 LED + 電流制限抵抗を GND へ） |
| 10（派生罠） | PA0 に切り替えたのに LED がまだ点かない | ポート変更時に**対応するクロック有効化マクロの変更を漏らした** | ポート定義とクロック有効化は同時に変更、変更後に全体を点検 |

**今回の罠踏みで最大の収穫を、一句に圧縮すると**：組み込み開発において「反応ない」は決して「コードが間違っている」と同義ではなく、まず**ソフトウェアの問題**（ファームウェアが本当にそのロジックまで実行しているか）か**ハードウェアの問題**（物理経路は通じているか、ペリフェラルは本当に接がれているか）かを切り分ける手段を講じるのが先。シリアルを先に喋らせるのは、不具合の切り分けで最速・最も省ストレスな一手で、常に最優先で開通させるべきです。

---

## 十七、主要コマンド & ファイルパス早見表

日常開発で最もよく使うコマンド群：

```bash
# === コンパイル / 書き込み / モニタ ===
pio run                # コンパイルのみ
pio run -t upload      # コンパイル + 書き込み
pio device monitor      # シリアルモニタを開く（Ctrl+C で終了）

# === WCH-Link デバッガのファームウェアバージョン & 接続中チップ情報を確認（接続トラブル時に最も重宝）===
~/.platformio/packages/tool-wlink/wlink status

# === 各ツールのバージョン確認 ===
~/.platformio/packages/tool-wlink/wlink --version    # 書き込みツールのバージョン
pio --version                                          # PlatformIO Core のバージョン

# === コンパイラのバージョン確認（最終確認環境に基づき、接頭辞は riscv-wch-elf-）===
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# もし古い gcc8/x86_64 版が入っていたら、ファイル名はこう切り替えて：
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
```

`wlink status` の典型的な出力。デバッガのファームウェアバージョン、ターゲットチップの型番、実際の Flash 容量、チップ UID などが一目で分かり、接続トラブルの切り分けにめちゃくちゃ便利：

```
[INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
[INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
[INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
[INFO] Flash protected: false
[INFO] RISC-V ISA(misa): Some("RV32ACFIMUX")
[INFO] RISC-V arch(marchid): Some("WCH-V4F")
```

> WCH-Link デバッガ自体のファームウェアをアップグレードしたい場合は、公式の **WCH-LinkUtility** ツールが必要です。現在このツールは Windows 版のみで Mac 版はなく、これも macOS 生態がまだ完全ではない点の一つです。

主要なファイルパスも一覧にしておくと、トラブル時にすぐ定位できます：

| 用途 | パス |
|---|---|
| PlatformIO Core 本体 | `~/.platformio/penv/bin/pio` |
| インストール済みプラットフォーム | `~/.platformio/platforms/ch32v/` |
| ツールチェーン / 書き込み / デバッグツール | `~/.platformio/packages/{toolchain-riscv,tool-wlink,tool-openocd-riscv-wch}` |
| board 定義ファイル | `~/.platformio/platforms/ch32v/boards/ch32v307_evt.json` |
| プラットフォームのビルドスクリプト（前章で triple ロジックを掘った場所） | `~/.platformio/platforms/ch32v/builder/main.py` |
| コンパイル産物 | `<プロジェクトディレクトリ>/.pio/build/ch32v307_evt/firmware.{elf,bin}` |

`ch32v307_evt` という board 定義内の主要パラメータも、ついでにまとめておきます：

| フィールド | 値 |
|---|---|
| MCU 型番 | CH32V307VCT6 |
| メインクロック | 144 MHz |
| march / mabi（コンパイルターゲット ABI） | rv32imacxw / ilp32 |
| Flash / SRAM（board デフォルト値） | 256 KB / 64 KB（チップは実際には 288KB Flash、第 9 章の説明を参照） |
| オンボードデバッガ | WCH-Link |
| USB VID:PID | 1a86:8010 |
| サポートする書き込みプロトコル | wch-link, wlink, minichlink, isp |

---

## 十八、自分なりの「CH32 開発のメンタルモデル」を作る——次に新プロジェクトを入手したらそのままコピペでいける

一通り悪戦苦闘してみて、最も価値があるのは、いくつの具体的コマンドを覚えたかではなく、再利用できる思考フレームワークができたことです。今後 CH32V307 を引き続き遊ぶにせよ、CH32 シリーズの新しいチップや新しいボードに替えるにせよ、この筋で進められます：

1. **まず「プラットフォーム + フレームワーク + ボード」の 3 点セットを確認**：対応するのは `platformio.ini` の `platform`、`framework`、`board` の 3 行。この 3 行が決まれば、PlatformIO はどこからツールチェーンをダウンロードするか、どのピン定義でコンパイルするかを把握します。
2. **プラットフォームを入れた後、コードを書く前に、ツールチェーンが「正しい国籍」か確認**：特にコミュニティ保守で、公式が一次サポートしないプラットフォームでは、デフォルトで Windows や Linux にしか合っていないことが珍しくありません。インストール後にツールチェーンディレクトリを `ls` で一瞥し、主要バイナリを `file` してアーキテクチャを確認するだけで、切り分け時間を大幅に節約できます。
3. **未署名バイナリの実行エラーに遭ったら、まず Gatekeeper を疑う**：`cannot be opened` / `killed: 9` 系のエラーは 8 割方隔離属性の仕業。`xattr -dr com.apple.quarantine` で一括処理。
4. **書き込み/コンパイルが成功してもペリフェラルが反応しないなら、ソフトかハードかを先に切り分ける**：シリアルを先に開通させるのが最速の消去法——シリアルに出力が出れば、ファームウェアは正常に実行されている。出力が出なければ、初期化漏れに戻って点検。
5. **ボード上の「ユーザペリフェラル」がデフォルトで接続済みと信用しない**：LED やボタン系のオンボードペリフェラルは、多くの評価ボードが柔軟性確保のため工場出荷時には接続していません。使う前に回路図と照合して確認を。急いでコードを疑わない。
6. **`debug.h`（もしくは対応フレームワークのデバッグ補助ライブラリ）を活用**：ほぼ全メーカーの SDK が、ディレイ関数と `printf` リダイレクトを用意してくれています。自作不要。
7. **バージョン番号は変わるが、切り分けの思路こそが持ち運べる**：コミュニティのツールチェーンは更新され続けるので、あなたが入れる時点での具体的バージョン番号がチュートリアルと違うのは普通。理解すべきは「なぜ」であり、「何」を暗記することではありません——この点、本記事自体が生きた見本です。

この思路を覚えておけば、次に新しい組み込み開発ボードを手にしたときも、概ねこの順序で素早く道筋をつかめます。

---

## 十九、よくある質問 FAQ

**Q1：なぜ公式の MounRiver Studio をそのまま使わない？ Mac 版もあるよね？**

A：MounRiver Studio は確かに Mac 版を出していますが、コミュニティの反応によると、内蔵の OpenOCD は Mac では問題が多く、Mac 向けの真面目な最適化・テストを経ていない印象です。さらに比較的閉じた一体型 IDE で、ツールチェーンのバージョンを自分で制御できません。PlatformIO は VSCode ベースで、ツールチェーン完全制御可能、コミュニティも活発、クロスプラットフォームで開発体験を揃えられる点を総合すると、この一手間をかける価値があります。

**Q2：Homebrew で RISC-V ツールチェーンを入れて代替し、手動差し替えを省けない？**

A：技術的には可能ですが、このプラットフォームではお勧めしません。プラットフォーム自身のビルドスクリプトは、PlatformIO のパッケージ管理機構でツールチェーンディレクトリを定位しています（`get_package_dir("toolchain-riscv")` 之类的の呼出）。Homebrew で入れたツールチェーンに切るには、デフォルト動作を上書きする追加設定を書く必要があり、むしろ面倒です。本記事で触れた `toolchain-riscv-mac` パッケージを大人しく使うのが最も省ストレスです。

**Q3：ツールチェーンは今後プラットフォームをアップグレードしたら Windows 版に戻されたりしない？**

A：可能性はあります。今後 `pio pkg update` を実行したりプラットフォーム全体を再インストールしたりすると、`platform.json` のデフォルトは依然として Windows リポジトリを指しているので、手動で差し替えた macOS 版が上書きされるかもしれません。その際は第 6 章の差し替え手順をもう一度なぞれば OK。もっと彻底したいなら、プラットフォームのリポジトリを fork して `platform.json` をデフォルトで macOS 版を指すように書き換えれば、一劳永逸。

**Q4：コンパイルがリンクエラーを吐く、あるいはあるコンパイラコマンドが見つからないと出るのはなぜ？**

A：高確率で、ツールチェーンのバージョンとコンパイラ実行ファイルの接頭辞が合っていません（第 16 章の罠 4 に対応）。まず実際にインストールされたコンパイラの名前を確認しましょう（`riscv-wch-elf-gcc` か、古い `riscv-none-embed-gcc` か）。コマンドと実際のファイルが合致していることを确保してください。具体的には第 6 章の最終確認環境表を参照。

**Q5：書き込みで「WCH-Link デバイスが見つからない」と言われたら？**

A：この順で切り分けてみてください：① 挿しているのが WCH-Link 側の USB ポートか確認（USB-Device ポートではない）② デバッガが DAP モードではなく RV モードになっているか確認 ③ `system_profiler SPUSBDataType | grep -A5 1a86` でシステムが USB デバイスを正常に認識しているか見る（`1a86:8010` がこのデバッガの VID:PID）。

**Q6：このプラットフォームはどのチップと開発フレームワークをサポートしている？ 将来別のボードに替えるのは楽？**

A：チップは CH32V003/103/203/30x、CH32X035、CH56x/57x/58x/59x など広くカバー。フレームワークは本記事で使った noneos-sdk のほか、FreeRTOS、RT-Thread、TencentOS、Harmony LiteOS、Arduino、ch32fun、Zephyr などをサポート。ボードの切り替えは基本的に `platformio.ini` の `board` と `framework` の 2 行を書き換えるだけ。他の罠の切り分け経験（ツールチェーンのアーキテクチャ、Gatekeeper の隔離、ペリフェラルのデフォルト浮き）はおおむね汎用的に効くはずです。

---

## 二十、動くようになった後、次に遊べること

Hello World は出発点でしかありません。動くようになった後は、さらに下の領域を探検できます：

- **多路 GPIO / ボタン割込**：オンボードのユーザボタン KEY も同様に浮いています。配線すれば EXTI 外部割込の使い方を練習できます。
- **USB CDC**：CH32V307 自身を USB シリアルデバイスとして列挙させ、WCH-Link ブリッジの USART1 に頼らない——これは別の USB プロトコルスタックが必要なファームウェア方案で、上級編。
- **288KB Flash を使い切る**：まず WCH 公式ツールでチップの option bytes を変更し、それから `platformio.ini` の `board_upload.maximum_size` 周辺のコメント行を同期して修正。
- **FreeRTOS / RT-Thread に挑む**：`framework` を対応する RTOS に変えて、マルチタスクスケジューリングを体験。
- **デバッグを真面目に学ぶ**：OpenOCD + GDB を使い F5 のブレークポイントデバッグ（`pio debug`）で、組み込みデバッグという職芸を磨く。

---

## 二十一、参考資料

- Community-PIO-CH32V プラットフォームリポジトリ：`github.com/Community-PIO-CH32V/platform-ch32v`
- macOS ツールチェーンパッケージ：`github.com/Community-PIO-CH32V/toolchain-riscv-mac`
- ツールチェーン releases（PIO 側の新版をウォッチ）：`github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`
- WCH 公式 MounRiver（WCH カスタムツールチェーン + IDE の源流）：`www.mounriver.com`
- wlink（macOS ブランチ）：`github.com/Community-PIO-CH32V/tool-wlink`（ブランチ `mac_arm64` / `mac_x64`）
- 公式ドキュメント：`pio-ch32v.readthedocs.io`
- xPack RISC-V GCC（ツールチェーン上流）：`github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack`
- wlink オリジナルプロジェクト：`github.com/ch32-rs/wlink`
- WCH 公式製品ページ：`www.wch.cn/products/CH32V307.html`
- OpenWCH 公式 SDK / 例程：`github.com/openwch/ch32v307`
- Zephyr 公式ドキュメントの、このボードの LED 浮きに関する説明
- PlatformIO 公式ドキュメント：`docs.platformio.org`

---

*完全なプロジェクトコードは GitHub にも同期公開しています。clone してそのまま走らせてください。もしあなたが自分の悪戦苦闘の中で本記事がカバーしていない新たな罠に出会ったら、ぜひコメント欄で交流してください——Mac で CH32V を扱う資料はまだ少なすぎて、一人経験をシェアする人が増えれば、後に来る人が一つ罠を減らせます。あなたの LED が早く点きますように！🎉*

https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/CH32V/CH32V307-EVT-R1/01%20HelloWorld
