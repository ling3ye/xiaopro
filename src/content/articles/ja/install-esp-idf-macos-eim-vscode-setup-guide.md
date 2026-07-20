---
title:      "macOS に ESP-IDF v6.0.2 を入れる：`brew install` のエラーから VSCode が setup を認識するまで（5 つの罠、全部踏んだ）"
domain:     hardware
platforms:  ["mac"]
format:     "tutorial"
relatedBoards: ["esp32s3"]
date:       2026-07-20
intro:      "コマンドラインで ESP-IDF を入れるのは順調なのに、VSCode 拡張は死んでも setup not found を訴えてくる——そんな経験ありませんか？この記事は、Homebrew で eim を入れるところから、EIM で ESP-IDF v6.0.2 をインストールし、Windows から持ち込んだプロジェクト残留ファイルを掃除し、さらに VSCode 拡張が「setup が見つからない」と言い続ける本当の原因（設定項目のスコープ違い）まで、実際に踏んだ穴をそのまま記録したものです。コマンドとエラーはすべて実機で走らせたものなので、同じエラーが出たらそのままコピーして検索できます。"
tags:       ["ESP-IDF インストール", "ESP-IDF macOS", "EIM", "ESP32-S3", "VSCode setup not found", "ESP-IDF 設定"]
image: https://img.lingflux.com/2026/07/79ed5dc15e35419e612ab982e595d127.png
---

# macOS に ESP-IDF v6.0.2 を入れる：`brew install` のエラーから VSCode が setup を認識するまで（5 つの罠、全部踏んだ）

以前、手動で ESP-IDF を 2 回入れたことがあるんですが、どちらも途中で引っかかって放置していました。今回は一から全部やり直して、エラーの根っこをすべて掘り出してみました。終わってみて気づいたんですが、実は「ESP-IDF を入れる」という行為そのものが難しいわけじゃなくて、5 つの無関係な場所に穴が散らばっていた、というだけの話でした。Homebrew でツールを入れるところ、EIM のネットワークアクセス、VSCode で正しい拡張を入れること、プロジェクトに Windows 由来のファイルが残っていること、そして VSCode 拡張が設定を読み込む方法。コマンドラインのインストール自体は問題なく終わるのに、VSCode 拡張だけが「setup not found」を吐き続ける——これが一番時間がかかったところで、この記事のメインでもあります。

この記事は自分が踏んだ穴をそのまま記録したものです。コマンドもエラーメッセージもすべて実際に手元で走らせたものなので、同じエラーが出たときはそのままコピーして検索してもいいですし、この記事を自分のエラーと一緒に AI に投げて、「この思路で原因を特定して」とお願いしてもいいです。

> **作業を始める前に、まずバージョンを確認しておきましょう。** ESP-IDF は v5.x から v6.0.2 の間に、インストール方式が従来の `install.sh` から EIM に切り替わっています。VSCode 拡張も 1.x から 2.x の間に、setup を探すロジックがまるごと書き直されました。バージョンが違うと、特に第 4 ステップの拡張設定まわりは、まるで当てはまらない可能性があります。

## 環境バージョン

| 項目 | バージョン |
|---|---|
| システム | macOS、Apple Silicon（M シリーズチップ） |
| ESP-IDF | v6.0.2 |
| インストールツール | EIM 0.17.1 |
| VSCode 拡張 | espressif.esp-idf-extension 2.1.0 |
| ターゲットチップ | ESP32-S3 |

記事内のパスは私のローカルのユーザー名 `shawn` で書いています。コマンドをそのまま使うときは自分のユーザー名に読み替えてください（ターミナルで `whoami` を打てば確認できます）。それと、私はローカルで Clash プロキシを動かしていて、`127.0.0.1:7890` 経由で接続しています。プロキシが要らない場合は、コマンド中の `PROXY` という文字が入った環境変数と `--mirror` パラメータを外せば OK です。メインの流れには影響しません。

## 全体の流れ

5 つのステップで、後になるほど見つけにくくなります：

| ステップ | やること | よくある状況 |
|---|---|---|
| 0 | Homebrew で `eim` というツール本体を入れる | 信頼確認のプロンプトが 1 つ出て、エラーと勘違いしやすい |
| 1 | `eim` で ESP-IDF v6.0.2 を入れる | ネットワークとバージョン番号で 2 つ穴がある |
| 2 | VSCode に ESP-IDF 拡張を入れる | 同名のプラグインが多く、間違えやすい |
| 3 | プロジェクト内の Windows 由来のファイルを掃除する | Windows から持ってきたプロジェクトでのみ遭遇する |
| 4 | VSCode 拡張にインストール済みの setup を認識させる | 記事中で一番見つけにくく、一番時間を食われる穴 |

---

## ステップ 0：まず `eim` というツールを入れる

`eim` は ESP-IDF Manager の略で、Espressif 公式のインストール管理ツールです。古い `install.sh` より便利なのは、ESP-IDF の複数バージョンを互いに衝突せずにインストールできるところ。これ自体を入れるには、まず Homebrew の tap（サードパーティのソフトウェアソース）を追加してから、インストールします：

EIM公式インストールガイド：
https://dl.espressif.com/dl/eim/index.html

```bash
brew tap espressif/eim
brew install eim
```

初めて `brew install eim` を走らせたとき、私はこんなメッセージに出会いました：

```
Error: Refusing to load formula espressif/eim/eim from untrusted tap espressif/eim.
Run `brew trust --formula espressif/eim/eim` or `brew trust espressif/eim` to trust it.
```

> **これはインストール失敗ではなく、Homebrew のセキュリティ確認です。** 比較的新しい Homebrew は、サードパーティの tap（公式リポジトリにないソフトウェアソース）をデフォルトでは信頼しない仕様になっています。初めてある tap の中身を使うときは、毎回こういう一文が出て、「本当にこれ信頼していいの？」と確認してきます。espressif の tap は公式なので、安心して信頼して大丈夫です：

```bash
brew trust espressif/eim
```

これを走らせてからもう一度 `brew install eim` を実行すれば、正常にインストールできます。もし `brew install` の前に、eim と全然関係ないソフトウェアのリスト（メニューバーのアプレットとか、AI リネームツールとか）がズラッと出てきたなら、それは Homebrew が「今、こんなにパッケージが古くなってるよ」みたいな無関係な情報を表示しているだけです。気にせず下にスクロールして、本当のエラー行を探してください。

インストールが終わったら検証してみましょう：

```bash
eim --version
```

バージョン番号が正常に出力されれば、このステップはクリアです。次に進んで ESP-IDF をインストールしましょう。

---

## ステップ 1：EIM で ESP-IDF v6.0.2 を入れる

ツールが入ったら、コマンド 1 本で ESP-IDF をインストールします：

```bash
HTTPS_PROXY=http://127.0.0.1:7890 \
HTTP_PROXY=http://127.0.0.1:7890 \
ALL_PROXY=socks5://127.0.0.1:7890 \
eim install -i v6.0.2 -t esp32s3 -n true \
  --idf-mirror https://git.espressif.com.cn \
  --pypi-mirror https://pypi.mirrors.ustc.edu.cn/simple
```

各パラメータの意味：

- `-i v6.0.2`：インストールするバージョン番号。**必ず `v` 接頭辞をつけること**。理由は後述；
- `-t esp32s3`：ターゲットチップ；
- `-n true`：非インタラクティブモード。これを入れないと、ターミナルの質問で Enter を押すのを待たされて止まります；
- `--idf-mirror` / `--pypi-mirror`：国内ミラー。ソースコードは Espressif 公式の中国ミラー、Python パッケージは中科大（USTC）ミラーを使います。不要なら外して OK；
- 3 つの `PROXY` 環境変数：EIM が内部で git にアクセスするために使います。理由は後述の「罠 1」を参照。

このコマンド、一見シンプルに見えますが、初回実行時に私は 2 つの穴を踏みました。どちらも「表面は正常にインストールが進んでいるように見えるけど、実は内部でこっそり遠回りしている」というタイプのやつです。

### 罠 1：git にプロキシを書いても意味がない、EIM は見てくれない

EIM は内部的に Rust の `gix` ライブラリを使って IDF ソースコードを取得します。このライブラリは `git config --global http.proxy` のような伝統的な設定方法を認識せず、`HTTPS_PROXY`、`HTTP_PROXY`、`ALL_PROXY` というシステム環境変数だけを見ます。もしプロキシを git の設定ファイルにだけ書いて、対応する環境変数を用意していないと、`gix` は直接接続を試みて、取得過程で何度も失敗を繰り返します。ログにはこんなものが流れます：

```
WARN - Attempt N failed: "Failed to fetch: Failed to consume the pack sent by the remote"
```

3 回失敗すると `gix` は自動的にシステム標準の git にフォールバックします（システムの git は git config を認識するので、プロキシ経由で正常に動きます）。なので最終的にはたぶんインストールできますが、無駄に数分待たされる上、フォールバックで作られた clone の状態はあまりきれいではありません。手っ取り早いのは、最初からプロキシ変数をコマンドに直接入れて、`gix` を一発で通すことです。3 回失敗してからフォールバックするのを待つ必要はありません。

### 罠 2：バージョン番号の `v` を省くとエラーになる

Espressif 公式リポジトリの release tag はすべて `v6.0.2` のような `v` つきフォーマットで、EIM の `-i` パラメータはそのまま git tag 名として使われます。もし `-i 6.0.2`（v なし）と書くと、次のようなエラーが出ます：

```
fatal: Remote branch 6.0.2 not found in upstream origin
```

このエラーも、実は `gix` が失敗したあとにシステム git がフォールバックで受け身になって出したものです。git がリモートに `6.0.2`（v なし）という名前のブランチを見つけられなかった、ということ。`-i v6.0.2` と書けば問題ありません。あるバージョンの tag の書き方が分からないときは、先にリモートでどんな tag があるか調べてみるといいです：

```bash
git ls-remote --tags https://git.espressif.com.cn/espressif/esp-idf.git 'v6.0*'
```

### インストール後の確認方法

```bash
eim list
# v6.0.2 (selected) が見えれば OK

source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py --version
# 出力が ESP-IDF v6.0.2 ならインストール成功
```

### インストール後、ファイルはどこにある？

EIM が作るディレクトリ構造は従来の方式とちょっと違います。このあとの設定は全部これらのパスを参照することになるので、まず頭に入れておきましょう：

```
IDF ソース       ~/.espressif/v6.0.2/esp-idf
ツールチェーン   ~/.espressif/tools/
Python venv      ~/.espressif/tools/python/v6.0.2/venv
アクティベートスクリプト   ~/.espressif/tools/activate_idf_v6.0.2.sh
EIM インストール情報   ~/.espressif/tools/eim_idf.json
```

Python の仮想環境の位置について補足しておきます。`tools/python/v6.0.2/venv` の中に隠れていて、古いバージョンでよくあったプロジェクトルート直下の `python_env/` ではありません。最初に探すときは結構焦ります。

---

## ステップ 2：VSCode に ESP-IDF 拡張を入れる

コマンドライン側のインストールが終わったら、VSCode に戻ります。拡張パネル（`Cmd+Shift+X`）を開いて、「ESP-IDF」で検索します。

> **このステップで間違える人が多いので、必ず公開者を確認してください。** 検索結果には、名前もアイコンも似ているプラグインがいくつも出てきます。名前だけで選ぶと間违えやすいです。以下の情報を照らし合わせて、同じものであることを確認してからインストールをクリックしてください：

| 項目 | 内容 |
|---|---|
| プラグイン名 | ESP-IDF |
| 公開者 | Espressif Systems |
| 公開者のページ | espressif.com |
| インストール数 | 1,582,039 |
| 評価 | 145 件のレビュー |
| 概要 | Develop and debug applications for Espressif chips with ESP-IDF |

**プラグインは名前じゃなくて公開者で判断しましょう。** 公開者の欄は必ず **Espressif Systems**、ドメインは **espressif.com**、インストール数は百万級——これらがこの公式プラグインの分かりやすい特徴です。間違ったプラグインを入れると、このあとの第 4 ステップで説明する設定項目（`idf.eimIdfJsonPath`、`idf.currentSetup` など）がそもそも存在しなかったり、挙動がまったく違ったりして、トラブルシューティングがとても分かりにくくなります。本質的な原因は「最初にプラグインを間違えた」だった、ということになります。

インストールが終わったら、VSCode を再起動します（または `Cmd+Shift+P` → `Reload Window`）。プラグインを有効化してから次に進みましょう。

---

## ステップ 3：プロジェクトが Windows 由来なら、まず 3 つのファイルを掃除する

**プロジェクトを新規に作ったなら、このステップはスキップして OK です。** ただし Windows PC から持ってきたプロジェクトなら、ほぼ確実にこの節の穴を踏みます——3 つのファイルに Windows 専用のパスが隠れていて、そのまま macOS に持ってくると効きません。

### ① `.vscode/settings.json`

中の `C:\...` という Windows パス、シリアルポート名（`COM22` とか）、古いバージョン番号を、すべて macOS 側の実際の値に置き換えます：

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

自分のシリアルデバイス名はこのコマンドで調べます：

```bash
ls /dev/cu.usb*
```

### ② `.vscode/c_cpp_properties.json`

`compilerPath` が元々指していたのは Windows 版の `xtensa-esp32s3-elf-gcc.exe` で、しかもツールチェーンのバージョン番号もたぶん古いです。Mac に実際にインストールしたバージョンに置き換えましょう。パスを直接書くのではなく、`toolsPath` という変数を参照するのがおすすめ。あとでバージョンアップしても書き換えずに済みます：

```jsonc
"compilerPath": "${config:idf.toolsPath}/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc"
```

`esp-15.2.0_20251204` というバージョン番号は適当にコピペするのではなく、`~/.espressif/tools/xtensa-esp-elf/` ディレクトリを見て、実際に入っているフォルダ名で書いてください。

### ③ `dependencies.lock` —— 一番見落としやすいやつ

これは idf-component-manager（コンポーネントマネージャ）が生成するロックファイルです。Windows 上で生成されたものは古い v2.0.0 フォーマットで、中にローカル component の **絶対パス** も記録されています。たとえば原作者の PC のディレクトリがそのまま入っていたりします：

```yaml
espressif/esp_lcd_touch:
  source:
    path: C:\Users\PC\Desktop\...\espressif__esp_lcd_touch
    type: local
```

Mac に持ってきて reconfigure を走らせると、当然このパスは存在しないので、次のようなエラーが出ます：

```
CMake Error: The "path" field in the manifest file ... does not point to a directory.
```

このファイルは本質的に自動生成されたキャッシュなので、削除して再構築させるのが一番手っ取り早いです：

```bash
rm dependencies.lock
rm -rf build
source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py reconfigure
```

再生成されると v3.0.0 フォーマットになり、パスもローカルな形に変わります。registry の component は `managed_components/` ディレクトリに再ダウンロードされます。

**ここまで来れば、コマンドラインの `idf.py build` はもう正常に動くはずです。** もしまだ動かないなら、問題はこれらのファイルではなく、別の場所を探す必要があります。

---

## ステップ 4：VSCode 拡張が "setup not found" と言う（本当の難所）

コマンドラインがすべて正常に動いたので、これで終わりだと思ったら、VSCode を開くとステータスバーがずっとこう表示し続けています：

```
Current ESP-IDF setup is not found.
```

2 回 Reload Window をして、関連ありそうな設定項目をいくつか変えても、効果なし。後になって拡張のソース（`dist/extension.js`）を開いて読んでみて、ようやく setup を探す完全なロジックが分かりました：

1. `idf.eimIdfJsonPath` が指す `eim_idf.json` ファイルから、インストール済みの setup リストを読み込む；
2. `idf.currentSetup` の値で、このリストの中をパスでマッチングする；
3. マッチしなければ、リストを順番に走査して、検証を通過できるものがないか探す；
4. すべて失敗したら、"not found" と報告する。

このロジックが成り立つ前提は、第 1 ステップのリストが先に読み込まれていることです。私は 2 つの遠回りをしてようやく根因にたどり着きました。1 つ目は実は何もしなくていい、2 つ目が本当に直すべきところ。記事を読みながら作業するとき、「これっていじるべき？」と迷わないように、先に言っておきます：

- **遠回り 1：操作不要。原理だけ見てスキップして OK；**
- **遠回り 2：操作必要。これが本当の修正ステップ。**

### 遠回り 1（気にしなくていい、原理だけ）：`idf.currentSetup` には何を入れるべきか

この設定項目の公式説明は「Current ESP-IDF setup id in eim_idf.json path」で、文字通りには ID（番号）を入れなければならないように見えます。でもソースを読むと、拡張が自分で setup を選んだあと、実際に書き込むのはこういう値です：

```js
await _o("idf.currentSetup", c.idfPath, ConfigurationTarget.WorkspaceFolder, e)
```

書き込まれるのは `idfPath`、つまり **パス** であって、番号じゃありません。なので、もしこの項目がワークスペース設定に現れるとしたら、こういう形であるべきです：

```jsonc
"idf.currentSetup": "/Users/shawn/.espressif/v6.0.2/esp-idf"
```

でもこれ、**手動で書き換える必要はありません**——根因はここじゃありません。後述の「遠回り 2」の setup リストが正常に読み込まれさえすれば、拡張は自分でリストを走査して、唯一インストールされている v6.0.2 を見つけ、パスを自動的に `currentSetup` に書き戻します。このステップは拡張が自力でやります。ここで説明したのは純粋に原理の解説で、このフィールドを見たときに「何のためのものか」を知っておいてほしかったからです。「見た目が変だ」という理由で手動で書き換える必要はありません。本当に直すべきなのは次のほうです。

### 遠回り 2（本当に直すところ）：`idf.eimIdfJsonPath` のスコープが違う

VSCode の設定項目にはいくつかのスコープ（scope）があって、`idf.eimIdfJsonPath` のスコープは **`application`** です。つまり、**グローバルの User settings.json でしか効きません**。プロジェクト自身の `.vscode/settings.json` に書いても、まったく読み込まれません。書いたところで無駄です。

私はずっと `eimIdfJsonPath` をプロジェクトのワークスペース設定に書いていて、そのせいで拡張が `eim_idf.json` をロードできず、第 1 ステップで言っていた setup リストが永遠に空っぽになっていました。空リストということは、`currentSetup` に何を入れてもマッチしない、ということ。これこそが、2 回 Reload しても効かなかった本当の原因です。

> **修正方法：`idf.eimIdfJsonPath` をグローバル設定ファイルに移す。**

macOS での VSCode のグローバル設定ファイルのパスは：

```
~/Library/Application Support/Code/User/settings.json
```

エディタでこのファイルを開いて、次の 1 行を追加します：

```jsonc
"idf.eimIdfJsonPath": "/Users/shawn/.espressif/tools/eim_idf.json"
```

ワークスペースの `.vscode/settings.json` には `idf.currentSetup`（値は IDF のパス）だけを残してください。`eimIdfJsonPath` までワークスペースに置かないように——置いても効かないのに、「設定したつもり」になってしまい、無駄な時間を過ごすことになります。

変更が終わったら、`Cmd+Shift+P` でコマンドパレットを開き、**Reload Window** を選びます。再読み込みが終わって、ステータスバーが ESP-IDF のバージョン番号とターゲットチップを正常に表示すれば、拡張がようやく認識した合図です。

Reload 後もまだ問題があるなら、拡張自身のリアルタイムログを見られます：`Cmd+Shift+P` → `Output`、出力パネル右上のドロップダウンで **ESP-IDF** チャンネルを選ぶと、ステータスバーの一文よりずっと詳しいエラー情報が出ます。

### 設定項目のスコープが分からない？ 推測しないで直接調べよう

VSCode 拡張のスコープ情報は、すべてその拡張自身の `package.json` に書いてあります。推測するより、数行のスクリプトで直接調べるほうが早いです：

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
    print(k, '->', props.get(k, {}).get('scope', 'window(デフォルト)'))
"
```

---

## クイックリファレンス

### 設定項目はどこに書くべきか

| 設定項目 | スコープ（scope） | どこに書く |
|---|---|---|
| `idf.eimIdfJsonPath` | application | グローバル User settings |
| `idf.currentSetup` | resource | ワークスペース `.vscode/settings.json` |
| `idf.espIdfPath` / `idf.toolsPath` / `idf.pythonInstallPath` | window | ワークスペースでもグローバルでも OK |

### 主要パス

```
IDF ソース       ~/.espressif/v6.0.2/esp-idf
ツールチェーン   ~/.espressif/tools/
xtensa gcc       ~/.espressif/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc
Python venv      ~/.espressif/tools/python/v6.0.2/venv/bin/python
アクティベート   source ~/.espressif/tools/activate_idf_v6.0.2.sh
EIM インストール情報   ~/.espressif/tools/eim_idf.json
グローバル settings  ~/Library/Application Support/Code/User/settings.json
```

### よく使うコマンド

```bash
brew tap espressif/eim                              # 公式 tap を追加
brew trust espressif/eim                             # サードパーティ tap の初回使用時に信頼が必要
brew install eim                                     # eim 本体をインストール

eim list                                              # インストール済みバージョンを確認
eim install -i v6.0.2 -t esp32s3 -n true ...          # ESP-IDF をインストール（パラメータは第 1 ステップを参照）

source ~/.espressif/tools/activate_idf_v6.0.2.sh      # 現在のシェルで ESP-IDF 環境をアクティベート
idf.py set-target esp32s3                             # ターゲットチップを設定
idf.py reconfigure                                    # cmake の設定だけ走らせて compile_commands.json を生成
idf.py build                                          # ビルド
idf.py -p /dev/cu.usbmodemXXXX flash monitor          # 書き込み＆シリアルモニタを開く
```

---

## トラブルシューティングの順番：詰まったらまずここで範囲を絞る

どこから手をつければいいか分からないときは、この順番で一段ずつ消していくと、当てずっぽうに試すよりずっと早いです：

1. **`brew install eim` はインストールできるか？** できないなら、`brew trust` を要求されているか確認 —— そうならそのまま信頼すれば OK。第 0 ステップを参照；
2. **`idf.py --version` は動くか？** 動かない → インストールかアクティベートのレイヤーの問題。第 1 ステップを参照；
3. **VSCode 拡張パネルの検索結果は合ってるか？** インストールしてみて設定項目が合わなかったり、プラグインの機能がこの記事の説明とまったく違ったりしたら → まず公開者が Espressif Systems か確認。たぶん最初から間違ったプラグインを入れてます。第 2 ステップを参照；
4. **`idf.py reconfigure` は通るか？** 通らない → プロジェクトファイルの問題。重点的に `dependencies.lock` を確認。第 3 ステップを参照；
5. **コマンドラインは全部正常なのに VSCode が setup not found と報告する？** → 拡張設定の問題。重点的に `eimIdfJsonPath` のスコープを確認。第 4 ステップを参照。

よく脱線しがちな方向を 2 つ先に言っておきます、無駄な遠回りをしないために：

- v6.0.2 という tag 自体に `version.txt` ファイルはついてきていません。これは clone でファイルが欠けたわけでは**ありません**。そもそも拡張もこのファイルは読みません。欠落を見ても慌てないでください；
- `idf.currentSetup` の値は基本的に setup not found の根因じゃありません。このエラーに出会ったら、急いでこれを直そうとせず、まず `eimIdfJsonPath` がワークスペース設定ではなくグローバル settings に書かれているかを優先して確認してください。

---

もしこの順番でやってもまだ詰まるなら、十中八九バージョンの不一致です——ESP-IDF のインストール方式も、VSCode 拡張が setup を探すロジックも、ここ数年で何度も変わっています。古いチュートリアルが新バージョンに当てはまるとは限りません。手元の ESP-IDF、EIM、拡張の実際のバージョンと、具体的なエラーメッセージをまとめて AI に投げて、この記事の「ツールを入れる → IDF を入れる → プロジェクトファイルを掃除する → 拡張を設定する」という 4 ステップの思路と照らし合わせて検討するのが、エラーキーワードを直接検索するより早く原因のレイヤーを特定できます。
