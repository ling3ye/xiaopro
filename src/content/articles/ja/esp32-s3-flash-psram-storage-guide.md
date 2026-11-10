---
title: "購入前に必ず確認：ESP32-S3 の接尾辞、Flash、PSRAM、おおよその価格（人民元、C3 対照付き）"
domain: hardware
platforms: ["cross-platform"]
format: "cheatsheet"
date: 2026-11-10
intro: "N4、N8R2、N16R8 のような接尾辞が伝えるのは容量だけ：N の後ろは Flash、R の後ろは PSRAM。よく使われる 5 枚のボードの容量とおおよその価格（人民元）を 1 枚の表にまとめ、選び方も解説する。"
tags: ["ESP32-S3", "ESP32-C3", "PSRAM", "Flash", "開発ボード選定", "ESP-IDF"]
relatedBoards: ["esp32s3"]
image: "https://img.lingflux.com/2026/11/bf80e841c5e9fb342ebc387e1e68edf8.jpg"
---

> 早見表。5 枚とも USB-C に挿すだけで使える完成済みボード。容量は公称値、価格はおおよその目安（中国元＝人民元、CNY）で、数量級を横に比べるためだけのもの。

## 00 まず覚えておきたい 3 つ

1. **接尾辞が伝えるのは容量だけ。** `N16R8` = 16 MB Flash + 8 MB PSRAM。`N` は Flash、`R` は PSRAM、数字はそのまま MB。「世代」や「上級グレード」とは関係ない。
2. **Flash はメモリではない。** Flash はハードディスクで、電源を切っても内容は消えず、ファームウェアやリソースを置く。`malloc()` で確保できるのはオンチップ SRAM（S3 は 512 KB）と PSRAM だけ。だから Flash をどれだけ増やしても「PSRAM がない」状態は救えない。
3. **同じ容量 ≠ 同じ価格。** 約 ¥26 と約 ¥62 の 2 枚は Flash も PSRAM も同じ。差額は RF、品質管理、資料に使われる（第 04 節）。

この記事の 5 枚：**ESP32-S3 が 4 枚**——S3 SuperMini FH4R2、S3 N16R8 MINI、XIAO S3 / Sense、XIAO S3 Plus。**ESP32-C3 が 1 枚**——C3 SuperMini。C3 は別アーキテクチャの対照組で、同格の代替品ではない。型番の先頭の `S3` / `C3` はチップの系統を示すので、後ろの容量接尾辞と混同しないように。

## 01 3 つの層、3 つの空間

「ESP32-S3」という言葉は、実際には 3 つの異なるものを指しうる：

- **チップ**：ESP32-S3FH4R2、ESP32-S3R8、ESP32-C3FN4。QFN の裸ダイで、Flash と PSRAM はチップ内に封入できる。これだけ手に入れても、基板設計、RF マッチング、アンテナは自分でやる必要がある。
- **モジュール**：WROOM-1 など。チップ＋実装 Flash＋水晶発振子＋シールドキャップ＋PCB アンテナ＋RF 認証。WROOM と付く名前はだいたいこの層。
- **開発ボード**：さらに USB-C、LDO、ボタン、ピンヘッダ、アンテナを加え、挿したらすぐ使える。**この記事の 5 枚はすべてこの層**。モジュール単体は含まない。同じ層同士で比べて初めて、価格や GPIO 数の比較が意味を持つ。

<svg viewBox="0 0 900 350" width="100%" style="height:auto" role="img" aria-label="チップ・モジュール・開発ボードの 3 層構造と、3 つのボード名がそれぞれどの層に当たるか">
  <title>図 1 · 3 層構造と命名の読み方</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">同じ「ESP32-S3」という名前が、まったく異なる 3 つのものを指しうる　·　この記事の対象：S3 系 4 枚 + C3 対照 1 枚</text>
  <rect x="20" y="40" width="860" height="52" rx="8" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="38" y="62" font-size="13" font-weight="600" fill="var(--ink)">① チップ（die）</text>
  <text x="38" y="80" font-size="12" fill="var(--ink-2)">ESP32-S3FH4R2 / ESP32-S3R8 / ESP32-C3FN4 · QFN パッケージ · Flash と PSRAM はチップ内に封入できる</text>
  <text x="862" y="70" font-size="12" text-anchor="end" fill="var(--pen)">目に見えず、基板設計が必要</text>
  <rect x="20" y="102" width="860" height="52" rx="8" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="38" y="124" font-size="13" font-weight="600" fill="var(--ink)">② モジュール</text>
  <text x="38" y="142" font-size="12" fill="var(--ink-2)">WROOM-1 = チップ + 実装 Flash + 水晶発振子 + シールドキャップ + PCB アンテナ + RF 認証</text>
  <text x="862" y="132" font-size="12" text-anchor="end" fill="var(--accent)">5 枚のどれでもない</text>
  <rect x="20" y="164" width="860" height="52" rx="8" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="38" y="186" font-size="13" font-weight="600" fill="var(--ink)">③ 開発ボード</text>
  <text x="38" y="204" font-size="12" fill="var(--ink-2)">裸ダイまたはモジュール + USB-C + LDO + ボタン + ピンヘッダ + アンテナ = 挿したらすぐ使える</text>
  <text x="862" y="194" font-size="12" text-anchor="end" fill="var(--green)">この記事の 5 枚はすべてここ</text>
  <line x1="20" y1="234" x2="880" y2="234" stroke="var(--line-2)" stroke-width="1"/>
  <text x="20" y="256" font-size="13" fill="var(--ink-2)">命名の解読：接尾辞が意味するのは「容量」であって「型番グレード」ではない</text>
  <rect x="20" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="288" font-size="12" font-weight="600" fill="var(--ink)">ESP32-S3FH4R2</text>
  <text x="34" y="306" font-size="11" fill="var(--ink-2)">F = パッケージ内 Flash · H = 高温グレードダイ</text>
  <text x="34" y="322" font-size="11" fill="var(--ink-2)">4 = 4 MB Flash · R2 = 2 MB PSRAM</text>
  <rect x="312" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="326" y="288" font-size="12" font-weight="600" fill="var(--ink)">S3 N16R8 MINI</text>
  <text x="326" y="306" font-size="11" fill="var(--ink-2)">ESP32-S3R8 裸ダイ + 実装 16 MB Flash</text>
  <text x="326" y="322" font-size="11" fill="var(--ink-2)">N16 は実装 Flash であり WROOM モジュールではない</text>
  <rect x="604" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="618" y="288" font-size="12" font-weight="600" fill="var(--ink)">XIAO S3 Plus</text>
  <text x="618" y="306" font-size="11" fill="var(--ink-2)">同じ ESP32-S3R8 ダイ + 16 MB Flash</text>
  <text x="618" y="322" font-size="11" fill="var(--ink-2)">差額はサイズ / アンテナ端子 / エコシステム</text>
</svg>

> **図 1** · 同じ「ESP32-S3」が指しうる 3 つのもの。接尾辞が伝えるのは容量であって型番のグレードではない。

**3 つの空間**を混同しないこと：

- **Flash = ハードディスク。** ファームウェア、フォント、Web リソースを置き、電源を切っても消えない。Quad SPI で公称最大 80 MHz。**メモリではない。**
- **PSRAM = 外付けのメモリストリップ。** 大きな配列、フレームバッファ、TLS や JSON バッファを置く。電源を切ると消え、オンチップより遅い。さらに Flash の消去・書き込み中は一時的にアクセスできなくなる。
- **オンチップ SRAM = ポケット。** 最速で最小。S3 の 4 枚はすべて **512 KB**（さらに 384 KB ROM、16 KB RTC SRAM）。C3 は **400 KB**（うち 16 KB をキャッシュに使用）+ 384 KB ROM + 8 KB RTC SRAM。

つまり商品ページの「内蔵 8 MB PSRAM & 8 MB Flash」という一文では、PSRAM はチップパッケージ内にあり、Flash は基板上に別途実装された Quad SPI ダイ。**Flash がどれだけ大きくても、`malloc()` できる空間にはならない。**

仕様書で最も読み違えやすい 3 箇所：

| よくある表記 | 正しい読み方 | 自分で確かめる方法 |
|---|---|---|
| S3 ボードに「512 KB SRAM」と書かれている | S3 は 512 KB。ESP32-C3 は 400 KB | CPU を確認：Xtensa LX7 デュアルコア 240 MHz が S3、RISC-V シングルコア 160 MHz が C3 |
| 「内蔵 8 MB Flash」 | ほとんどの場合は実装品でチップ封入ではない | 完全な型番を調べる。`F` が付くものだけが封入 Flash |
| 「WROOM が付いていればモジュール」 | 容量コードの転用の可能性もある | 基板上にシールドキャップ付きの小さなモジュールがあるか確認。裸ダイ設計では主チップが直接見える |

## 02 接尾辞の解読：9 つのコードは 3×3

9 つの発注コードは 9 種類のように見えて、実際には 3×3 の表の 1 枚：

- **`N` = 実装 Flash**：`N4` 4 MB、`N8` 8 MB、`N16` 16 MB。ダイはモジュールの PCB 上に実装され、Quad SPI 接続で、電源を切っても消えない。
- **`R` = チップ内封入の PSRAM**：`R2` 2 MB（Quad、4 ライン）、`R8` 8 MB（Octal、8 ライン）。`R` がなければ PSRAM はなし。
- Flash 3 段 × PSRAM 3 段 = 9 モデル。

価格比較で最も見間違えやすい点：`N8R8` と `N16R8` の PSRAM は同じ大きさで、差は Flash だけ。

<svg viewBox="0 0 900 406" width="100%" style="height:auto" role="img" aria-label="ESP32-S3-WROOM-1 の N16R8 接尾辞の分解と、Flash 4/8/16 × PSRAM なし/2/8 の 9 モデル行列">
  <title>図 2 · 接尾辞の分解と 9 モデルの 3×3 行列</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">1 つの接尾辞が伝えるのは 2 つだけ：N の後ろは Flash 容量、R の後ろは PSRAM 容量。各軸 3 段で 9 モデルになる</text>
  <rect x="20" y="42" width="246" height="64" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">ESP32-S3-WROOM-1</text>
  <text x="34" y="84" font-size="11" fill="var(--ink-2)">モジュールシリーズ自体：PCB アンテナ</text>
  <text x="34" y="100" font-size="11" fill="var(--ink-2)">U 付きの 1U は U.FL アンテナ端子に変更</text>
  <rect x="274" y="42" width="290" height="64" rx="7" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="288" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">N16　→　Flash 16 MB</text>
  <text x="288" y="84" font-size="11" fill="var(--ink-2)">実装 Quad SPI ダイ（モジュール PCB 上）</text>
  <text x="288" y="100" font-size="11" fill="var(--ink-2)">電源を切っても消えず、ファームウェアとリソースを格納</text>
  <rect x="572" y="42" width="308" height="64" rx="7" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="586" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">R8　→　PSRAM 8 MB</text>
  <text x="586" y="84" font-size="11" fill="var(--ink-2)">チップパッケージ内の Octal PSRAM、8 ライン</text>
  <text x="586" y="100" font-size="11" fill="var(--ink-2)">電源を切ると消え、フレームバッファとヒープ用</text>
  <text x="20" y="136" font-size="11" fill="var(--ink-3)">行 = PSRAM 段　列 = Flash 段</text>
  <text x="276" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 4 MB</text>
  <text x="498" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 8 MB</text>
  <text x="720" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 16 MB</text>
  <rect x="20" y="166" width="5" height="20" rx="2" fill="var(--accent)"/>
  <text x="34" y="181" font-size="12.5" font-weight="600" fill="var(--ink)">PSRAM なし</text>
  <rect x="20" y="230" width="5" height="20" rx="2" fill="var(--pen)"/>
  <text x="34" y="245" font-size="12.5" font-weight="600" fill="var(--ink)">2 MB Quad</text>
  <rect x="20" y="294" width="5" height="20" rx="2" fill="var(--green)"/>
  <text x="34" y="309" font-size="12.5" font-weight="600" fill="var(--ink)">8 MB Octal</text>
  <rect x="170" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="276" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4</text>
  <text x="276" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">実行時 0.5 MB</text>
  <rect x="392" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="498" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8</text>
  <text x="498" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">実行時 0.5 MB</text>
  <rect x="614" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="720" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16</text>
  <text x="720" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">実行時 0.5 MB</text>
  <rect x="170" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="276" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R2</text>
  <text x="276" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">実行時 2.5 MB</text>
  <rect x="392" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="498" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R2</text>
  <text x="498" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">実行時 2.5 MB</text>
  <rect x="614" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="720" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R2</text>
  <text x="720" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">実行時 2.5 MB</text>
  <rect x="170" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="276" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R8</text>
  <text x="276" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">実行時 8.5 MB</text>
  <rect x="392" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="498" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R8</text>
  <text x="498" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">実行時 8.5 MB</text>
  <rect x="614" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="2.5"/>
  <text x="720" y="300" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R8</text>
  <text x="720" y="318" font-size="11" text-anchor="middle" fill="var(--ink-2)">実行時 8.5 MB</text>
  <rect x="760" y="284" width="44" height="18" rx="4" fill="var(--card)" stroke="var(--green)" stroke-width="1"/>
  <text x="782" y="297" font-size="10.5" text-anchor="middle" fill="var(--green)">基準</text>
  <text x="20" y="358" font-size="12" fill="var(--ink-2)">R8 の 3 マス：GPIO33~37 を占有、周囲温度上限 65 °C。その他 6 マス：GPIO33~37 使用可、上限 85 °C。</text>
  <text x="20" y="378" font-size="12" fill="var(--ink-2)">R8 は PSRAM を 8 ライン化するだけで、Flash は 4 ライン Quad SPI のまま。Flash も 8 ラインなのは WROOM-2。</text>
  <text x="20" y="398" font-size="12" fill="var(--ink-3)">実行時メモリ = オンチップ SRAM 512 KB + PSRAM 容量。Flash はメモリに含めない。</text>
</svg>

> **図 2** · 9 モデルはちょうどこの 9 マスで、10 個目はない。容量最大のマス（`N16R8`）ほど温度上限は低い。

この 9 マス以外にもいくつか表記があって、代理店ページでは混在しがち：

| 表記 | 9 つの組み合わせとの関係 | Flash | PSRAM | 周囲温度 |
|---|---|---|---|---|
| `-1U`（例：`1U-N16R8`） | 9 マスはすべて成立。PCB アンテナを U.FL 端子に変更しただけ | 同左 | 同左 | 同左 |
| `H4` | PSRAM なしの高温グレード品 | 4 MB Quad | なし | −40~105 °C |
| `N16R16VA` | 枠外の超大容量。SPI は 1.8 V | 16 MB Quad | 16 MB Octal | −40~65 °C |
| WROOM-2 の `N16R8V` / `N32R8V` / `N32R16V` | 別の製品ライン。Flash も 8 ライン | 16 / 32 MB Octal | 8 / 16 MB Octal | −40~65 °C |

`1U` と `U` なしの違いはアンテナだけ：`U` ありは U.FL 端子で外部アンテナ、18.0×19.2×3.2 mm。`U` なしは PCB 実装アンテナ、18.0×25.5×3.1 mm。ケースに収めてアンテナを外部に引き出すなら前者を選ぶ。容量表は同じだが、キープアウトと製品全体の認証経路は異なる。

落とし穴が 2 つ：

- **`R8` は PSRAM だけを 8 ライン化し、Flash は 4 ライン Quad SPI のまま。** 型番の「Octal」は PSRAM を指す。Flash も 8 ラインなのは WROOM-2 の話。
- **公式コードに `N6` はない。** WROOM-1 の Flash は 4 / 8 / 16 MB の 3 段だけ。枠外の接尾辞に出会ったら、名前で推測せず完全な型番をデータシートで確認する。

`N16R8` を基準に並べ直すと：

| 組み合わせ | Flash | PSRAM | `N16R8` との差 | 実行時メモリ | 周囲温度上限 |
|---|---|---|---|---|---|
| `N16R8` | 16 MB | 8 MB Octal | 基準 | 8.5 MB | 65 °C |
| `N8R8` | 8 MB | 8 MB Octal | Flash が 8 MB 少ない | 8.5 MB | 65 °C |
| `N4R8` | 4 MB | 8 MB Octal | Flash が 12 MB 少ない | 8.5 MB | 65 °C |
| `N16R2` | 16 MB | 2 MB Quad | PSRAM が 6 MB 少なく、8 ライン→4 ライン | 2.5 MB | 85 °C |
| `N8R2` | 8 MB | 2 MB Quad | PSRAM が 6 MB 少なく、Flash も 8 MB 少ない | 2.5 MB | 85 °C |
| `N4R2` | 4 MB | 2 MB Quad | PSRAM が 6 MB 少なく、Flash も 12 MB 少ない | 2.5 MB | 85 °C |
| `N16` | 16 MB | なし | PSRAM が 8 MB 少ない | 0.5 MB | 85 °C |
| `N8` | 8 MB | なし | PSRAM が 8 MB 少なく、Flash も 8 MB 少ない | 0.5 MB | 85 °C |
| `N4` | 4 MB | なし | PSRAM が 8 MB 少なく、Flash も 12 MB 少ない | 0.5 MB | 85 °C |

3 つの要点：

1. **PSRAM が大きな跳躍。** 0 → 2 → 8 MB で実行時メモリは 0.5 / 2.5 / 8.5 MB。`N16` → `N16R2` で 5 倍、`N16R2` → `N16R8` でさらに 3.4 倍。Quad から Octal へはデータラインも 4 本から 8 本に増える。
2. **Flash は等差。** 4 / 8 / 16 MB で、実行時メモリへの影響はゼロ。大きくする意味はファームウェア、フォント、Web リソースを多く置けることだけ。つまり `N16R2` と `N8R8` のどちらが「大きい」という話ではなく、一方はディスクが広く、もう一方はメモリが広い。
3. **容量と制限は逆に動く。** R8 行は容量が最大だが温度上限が最低（65 °C）で、GPIO33~37 を占有する。PSRAM なしの品は 85 °C に届き、ピンも最も揃っている。8 MB PSRAM と 85 °C を両立したければ、この 9 マスでは無理。R2 に下げるか、R8 で ECC を有効化する（容量がさらに 1/16 減る）。

5 枚のボードはちょうど表に収まる：

- `S3 N16R8 MINI`、`XIAO S3 Plus` → `N16R8` と同等
- `XIAO S3 / Sense` → `N8R8` と同等
- `S3 SuperMini FH4R2` → `N4R2` と同等。ただし Flash もチップ内に封入されており（型番の `F`）、ダイ自体も高温グレード（`H`）
- `C3 SuperMini` → 表の外。ESP32-C3 は別アーキテクチャの系統で、4 MB Flash、PSRAM なし（チップ自体が非対応）

## 03 容量の全体像

5 枚の完成ボードがそれぞれ 1 マスずつ取る：`N16R8`、`N8R8`、`N4R2`、それから枠外の C3。S3 の 4 枚（Xtensa LX7 デュアルコア 240 MHz、FPU とベクトル命令付き）。C3 の 1 枚（RISC-V シングルコア 160 MHz、PSRAM なし、チップ非対応）。後ろの 3 枚の S3 はすべて同じ ESP32-S3R8 ダイを使い、実装 Flash が 8 MB か 16 MB かだけが違う。

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="5 枚の開発ボードと WROOM-1 の 9 つのモジュール組み合わせの Flash + PSRAM 総容量の積み上げ棒グラフ（同一スケール、最大 24 MB）">
  <title>図 3 · Flash + PSRAM 総容量：5 枚の完成ボードと 9 つのモジュール組み合わせ（同一スケール、単位 MB）</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">青 = Flash（ハードディスク）　緑 = PSRAM（メモリ）　橙 = Flash のみ、PSRAM なし</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">完成ボード · この記事の 5 枚</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="420" y1="48" x2="420" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="820" y1="48" x2="820" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="100" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="69" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="69" font-size="11.0" fill="var(--accent)">PSRAM なし</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="100" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="111" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="94" width="50" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="111" font-size="11.0" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="111" font-size="11.0" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="200" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="153" font-size="11.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="136" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="153" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="153" font-size="11.0" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="195" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="178" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="195" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="195" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="237" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="220" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="237" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="237" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">モジュール組み合わせ · WROOM-1 9 種</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">同一スケール：S3 完成ボード 4 枚は 3 マスと長さが一致</text>
  <text x="206" y="301" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="301" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="288" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="301" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="301" font-size="10.5" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="331" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="331" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="318" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="331" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="331" font-size="10.5" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="361" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="361" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="348" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="420" y="361" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="529" y="361" font-size="10.5" fill="var(--ink-3)">12 MB</text>
  <text x="206" y="391" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="391" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="378" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="645" y="391" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="679" y="391" font-size="10.5" fill="var(--ink-3)">18 MB</text>
  <text x="206" y="421" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="421" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="408" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="445" y="421" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="479" y="421" font-size="10.5" fill="var(--ink-3)">10 MB</text>
  <text x="206" y="451" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="451" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="438" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="451" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="451" font-size="10.5" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="481" font-size="11.5" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="400" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="420" y="481" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <text x="629" y="481" font-size="10.5" fill="var(--accent)">PSRAM なし</text>
  <text x="206" y="511" font-size="11.5" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="200" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="320" y="511" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="429" y="511" font-size="10.5" fill="var(--accent)">PSRAM なし</text>
  <text x="206" y="541" font-size="11.5" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="100" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="541" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="541" font-size="10.5" fill="var(--accent)">PSRAM なし</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="420" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">16</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">24 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">上下の棒の長さは 1 対 1 で一致。完成ボードはストレージを追加しない——使うモジュールが上限を決める。C3 と N16 / N8 / N4 は PSRAM なし。</text>
</svg>

> **図 3** · 上段が 5 枚の完成ボード、下段が 9 つのモジュール組み合わせ。棒の長さは 1 対 1 で対応。総量は最大 6 倍の差があるが、青い部分はハードディスクでメモリではない。

「実行時メモリ」（オンチップ SRAM + PSRAM）がプログラムから実際に確保できる量で、棒の長さは PSRAM だけで決まる：

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="5 枚の開発ボードと 9 つのモジュール組み合わせの実行時使用可能メモリ棒グラフ（0.4、0.5、2.5、8.5 MB の 4 段階）">
  <title>図 4 · 実行時に実際にメモリとして使える空間：5 枚の完成ボードと 9 つのモジュール組み合わせ</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">オンチップ SRAM + PSRAM。Flash はメモリに含めない。橙 = 0.4~0.5 MB　青 = 2.5 MB　緑 = 8.5 MB</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">完成ボード · この記事の 5 枚</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="353" y1="48" x2="353" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="487" y1="48" x2="487" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="753" y1="48" x2="753" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="26.7" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="256" y="69" font-size="12.0" fill="var(--accent)">0.4 MB（オンチップ SRAM のみ）</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="166.7" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="111" font-size="12.0" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="153" font-size="12.0" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="195" font-size="12.0" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="237" font-size="12.0" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">モジュール組み合わせ · WROOM-1 9 種</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">同一スケール：0.5 / 2.5 / 8.5 MB の 3 段、完成ボードと 1 対 1 対応</text>
  <text x="206" y="301" font-size="11" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="301" font-size="10.5" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="331" font-size="11" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="331" font-size="10.5" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="361" font-size="11" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="361" font-size="10.5" text-anchor="end" fill="var(--ink)">8.5 MB</text>
  <text x="206" y="391" font-size="11" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="391" font-size="10.5" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="421" font-size="11" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="421" font-size="10.5" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="451" font-size="11" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="451" font-size="10.5" text-anchor="end" fill="var(--ink)">2.5 MB</text>
  <text x="206" y="481" font-size="11" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="481" font-size="10.5" fill="var(--accent)">0.5 MB</text>
  <text x="206" y="511" font-size="11" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="511" font-size="10.5" fill="var(--accent)">0.5 MB</text>
  <text x="206" y="541" font-size="11" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="541" font-size="10.5" fill="var(--accent)">0.5 MB</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="353" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">2</text>
  <text x="487" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">4</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">6</text>
  <text x="753" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">9 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">最大段は最小段の約 21 倍。余分な 0.5 MB はオンチップ SRAM 由来なので、N4 / N8 / N16 と C3 の差は 0.1 MB だけ。</text>
</svg>

> **図 4** · `malloc()` できるのは実行時メモリ：0.4 / 0.5 / 2.5 / 8.5 MB の 4 段階で、最大約 21 倍の差。`R` のない型番はオンチップ SRAM の小さな部分だけになる。

数量感の目安：320×240 の RGB565 フレーム 1 枚が約 150 KB。2 MB PSRAM なら約 13 枚、8 MB なら約 53 枚。16 kHz / 16 bit モノラル音声 10 秒が約 320 KB。2 MB で約 60 秒、8 MB で約 250 秒をバッファできる。「Flash が十分大きい」は「メモリが十分」にはならない。

| 項目 | S3 SuperMini FH4R2 | S3 N16R8 MINI | XIAO S3 / Sense | XIAO S3 Plus | C3 SuperMini |
|---|---|---|---|---|---|
| **シリーズ** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-C3**（対照） |
| 主チップ | ESP32-S3FH4R2 | ESP32-S3R8 | ESP32-S3R8 | ESP32-S3R8 | ESP32-C3FN4 |
| CPU | デュアルコア 240 MHz | デュアルコア 240 MHz | デュアルコア 240 MHz | デュアルコア 240 MHz | シングルコア 160 MHz |
| Flash | 4 MB（封入） | 16 MB（実装） | 8 MB（実装） | 16 MB（実装） | 4 MB（封入） |
| PSRAM | 2 MB Quad | 8 MB Octal | 8 MB Octal | 8 MB Octal | なし（非対応） |
| オンチップメモリ | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 400 KB SRAM |
| 実行時メモリ | 2.5 MB | 8.5 MB | 8.5 MB | 8.5 MB | 0.4 MB |
| ストレージ総量 | 6 MB | 24 MB | 16 MB | 24 MB | 4 MB |
| 使用可能 GPIO | 約 11 | 約 20 | 11（Sense は +2） | 18 | 11 |
| 動作温度 | −40~85 °C | −40~65 °C | −20~65 °C | −20~65 °C | −40~85 °C |
| おおよその価格 | 約 ¥22 | 約 ¥26 | 約 ¥54 | 約 ¥62 | 約 ¥12 |

S3 の 4 枚のオンチップメモリはまったく同じで、違うのは Flash と PSRAM だけ。C3 はまったく別のアーキテクチャ系統：USB OTG も LCD / カメラインターフェースもベクトル命令もなく、外付け Flash を増やしても PSRAM は補えない。代替品としてではなく、アーキテクチャの違いを示すために置いている。

## 04 価格を加える

> **価格の根拠**：**約 ¥12 / ¥22 / ¥26 / ¥54 / ¥62**（中国元＝人民元）は 2026-11 時点の公開小売チャネルから取得。税、送料、セール、セット販売の差を吸収するよう丸めてある。公式価格でもリアルタイム価格でもなく、数量級を横に比べるためだけのもの。市場や時期によって数倍の差が出るため、必ず現地の実勢価格で確認すること。

<svg viewBox="0 0 900 320" width="100%" style="height:auto" role="img" aria-label="5 枚の開発ボードのおおよその価格の横棒グラフ（約 12 元〜約 62 元）">
  <title>図 5 · おおよその価格と容量：同一容量帯での価格差（同一スケール）</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">棒の長さ = おおよその価格、棒の内側 = その価格で買える総ストレージ / 実行時メモリ。品質はこの図には含まない</text>
  <rect x="220" y="38" width="600" height="242" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="391" y1="38" x2="391" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="563" y1="38" x2="563" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="734" y1="38" x2="734" y2="280" stroke="var(--line)" stroke-width="1"/>
  <text x="20" y="70" font-size="13" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="103" height="26" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="230" y="70" font-size="12" fill="var(--ink)">4 MB · 0.4 MB</text>
  <text x="331" y="70" font-size="12" fill="var(--accent)">約 ¥12</text>
  <text x="20" y="114" font-size="13" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="96" width="189" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="114" font-size="12" fill="var(--ink)">6 MB · 2.5 MB</text>
  <text x="417" y="114" font-size="12" fill="var(--pen)">約 ¥22</text>
  <text x="20" y="158" font-size="13" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="140" width="223" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="158" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="451" y="158" font-size="12" fill="var(--pen)">約 ¥26</text>
  <text x="20" y="202" font-size="13" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="184" width="463" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="202" font-size="12" fill="var(--ink)">16 MB · 8.5 MB</text>
  <text x="691" y="202" font-size="12" fill="var(--pen)">約 ¥54</text>
  <text x="20" y="246" font-size="13" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="228" width="531" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="246" font-size="12" fill="var(--ink)">24 MB · 8.5 MB</text>
  <text x="759" y="246" font-size="12" fill="var(--pen)">約 ¥62</text>
  <text x="220" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="391" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥20</text>
  <text x="563" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥40</text>
  <text x="734" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥60</text>
  <text x="20" y="316" font-size="12" fill="var(--ink-3)">価格帯は 12〜62 元で最大約 5.2 倍。棒の長さが価格のみを反映し、RF、一貫性、資料はスケールに含まれない。</text>
</svg>

> **図 5** · 容量と構成がまったく同じ 2 枚の価格差は約 ¥36。この差は容量表の外に由来し、図だけでは優劣は判断できない。

最も分かりやすい例：**約 ¥26 の S3 N16R8 MINI と約 ¥62 の XIAO S3 Plus は、Flash、PSRAM、実行時メモリ、ファームウェア構成がすべて同じ**にもかかわらず、約 ¥36（58%）の価格差がある。メモリ容量あたりに換算すると約 ¥3.06 / MB と約 ¥7.29 / MB。差額は容量表の外のものに使われている。

その他 3 点：

1. **単価と絶対価格はしばしば逆方向。** C3 の絶対価格は最も安いが、PSRAM がないため 0.4 MB で約 ¥30 / MB。8 MB Octal 帯の 10 倍になる。C3 はそもそも低消費電力と小型化のためのチップだ。
2. **同シリーズ内にもトレードオフがある。** 約 ¥54 の XIAO 標準版 / Sense は Plus より約 ¥8 安く、Flash は半分、GPIO は 7 本少ない。ただし Sense はカメラ・マイク・SD カード付きで、標準版はさらに小型で U.FL 端子を持つ。
3. **アーキテクチャをまたぐジャンプが最大。** C3 → S3 SuperMini FH4R2 で約 ¥10 高くなり、実行時メモリは 0.4 → 2.5 MB（6.25 倍）。同時にデュアルコア 240 MHz、ベクトル命令、USB OTG を得る。これは上位互換ではなくアーキテクチャの変更だ。

<svg viewBox="0 0 900 420" width="100%" style="height:auto" role="img" aria-label="おおよその価格と実行時メモリの分布散布図。価格とメモリの 2 次元のみを表示し、品質情報は含まない">
  <title>図 6 · おおよその価格 × 実行時メモリ：2 次元の分布</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">この図には価格とメモリの 2 次元しかない。RF 性能、ボードの一貫性、エコシステム、長期メンテナンスは軸に含まれない</text>
  <rect x="120" y="50" width="700" height="290" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="108" x2="820" y2="108" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="166" x2="820" y2="166" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="224" x2="820" y2="224" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="282" x2="820" y2="282" stroke="var(--line)" stroke-width="1"/>
  <line x1="320" y1="50" x2="320" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="520" y1="50" x2="520" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="720" y1="50" x2="720" y2="340" stroke="var(--line)" stroke-width="1"/>
  <rect x="132" y="60" width="178" height="42" rx="5" fill="var(--card)" stroke="var(--line-2)" stroke-width="1"/>
  <text x="144" y="78" font-size="11" fill="var(--ink)">この図は価格とメモリだけ</text>
  <text x="144" y="94" font-size="11" fill="var(--ink)">品質の次元は含まない</text>
  <circle cx="240" cy="328" r="5" fill="var(--accent)"/>
  <text x="252" y="332" font-size="12" fill="var(--accent)">C3 SuperMini 約 ¥12 · 0.4 MB</text>
  <circle cx="340" cy="268" r="5" fill="var(--pen)"/>
  <text x="352" y="272" font-size="12" fill="var(--pen)">S3 SuperMini FH4R2 約 ¥22 · 2.5 MB</text>
  <circle cx="380" cy="94" r="5" fill="var(--pen)"/>
  <text x="392" y="80" font-size="12" fill="var(--pen)">S3 N16R8 MINI 約 ¥26 · 8.5 MB</text>
  <circle cx="660" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="650" y="118" font-size="12" fill="var(--ink-2)">XIAO S3 / Sense 約 ¥54 · 8.5 MB</text>
  <circle cx="740" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="880" y="76" font-size="12" text-anchor="end" fill="var(--ink-2)">XIAO S3 Plus 約 ¥62 · 8.5 MB</text>
  <text x="120" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="320" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥20</text>
  <text x="520" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥40</text>
  <text x="720" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥60</text>
  <text x="820" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">約 ¥70</text>
  <text x="112" y="54" font-size="12" text-anchor="end" fill="var(--ink-3)">10</text>
  <text x="112" y="112" font-size="12" text-anchor="end" fill="var(--ink-3)">8</text>
  <text x="112" y="170" font-size="12" text-anchor="end" fill="var(--ink-3)">6</text>
  <text x="112" y="228" font-size="12" text-anchor="end" fill="var(--ink-3)">4</text>
  <text x="112" y="286" font-size="12" text-anchor="end" fill="var(--ink-3)">2</text>
  <text x="112" y="344" font-size="12" text-anchor="end" fill="var(--ink-3)">0</text>
  <text x="20" y="400" font-size="12" fill="var(--ink-3)">↑ 実行時メモリ（MB）　→ おおよその価格（元）　8.5 MB の 3 点が同一水平線上にある：価格差はストレージ容量に由来しない。</text>
</svg>

> **図 6** · 3 点が同じ 8.5 MB の水平線上にある。価格差はストレージ容量に由来しない。図に見えない RF、品質管理、資料こそが差額の原因であることが多い。

表にまとめる（最後の列は容量あたり単価）：

| 型番 | おおよその価格 | ストレージ総量 | 実行時メモリ | 容量あたり単価（約 ¥ / 実行時 MB） | 価格の相対倍率 |
|---|---|---|---|---|---|
| C3 SuperMini | 約 ¥12 | 4 MB | 0.4 MB | 約 ¥30.00 | 1.00× |
| S3 SuperMini FH4R2 | 約 ¥22 | 6 MB | 2.5 MB | 約 ¥8.80 | 1.83× |
| S3 N16R8 MINI | 約 ¥26 | 24 MB | 8.5 MB | 約 ¥3.06 | 2.17× |
| XIAO S3 / Sense | 約 ¥54 | 16 MB | 8.5 MB | 約 ¥6.35 | 4.50× |
| XIAO S3 Plus | 約 ¥62 | 24 MB | 8.5 MB | 約 ¥7.29 | 5.17× |

### 差額が買うもの

**横に比べられるのは価格だけで、品質ではない。** 同じ 16 MB Flash + 8 MB Octal PSRAM をボードにしても、差はこのあたりに出る：

- **RF とアンテナ**：マッチング、キープアウト、調整が WiFi / BLE の実性能を決め、U.FL 端子の有無はさらに別の話。低コストボードでよく見られる「信号が弱く、壁を隔てると接続が不安定」という不満は仕様表では分からず、設計と認証、実測 RSSI でしか判断できない。
- **品質管理**：電源と USB の保護、はんだ付け、板材、ロット間のばらつき。長期安定動作に影響し、デバッグ中に不可解な問題にぶつかるかどうかを左右する。
- **資料とメンテナンス**：回路図、ピン配置、サンプルファームウェア、コミュニティサポート、供給の継続性。XIAO のようなブランドボードが高いのは通常ここであって、Flash や PSRAM が高いのではない。
- **コンプライアンス**：裸ダイ設計ではモジュールの RF 認証に頼れないため、ボードレベルの RF コンプライアンスを個別に確認する必要がある。

「安物買いの銭失い」はだいたい正しいが、**逆は使えない**。高い＝すべてが良いわけではなく、ブランドプレミアム、チャネルマージン、セット差も存在する。白物ボードは市場をまたいで数倍の差が出る一方、ブランドボードの公式価格は世界でほぼ一貫している。比較は自分のいる市場でやり直すこと。

より安全な順序：**まず容量、PSRAM モード、ファームウェア構成で「動かせる」ボードを絞り込み、次に RF、安定性、資料、供給で比較し、最後に価格を見る。**

## 05 容量を構成に落とす

仕様書の容量はそのまま動くファームウェアにならない。購入前に計算できるスイッチが 5 つある：

1. **Flash サイズを実物に合わせる。** `CONFIG_ESPTOOLPY_FLASHSIZE_4MB / 8MB / 16MB`（または Arduino の Flash Size）は実装ダイと一致させる。大きく設定すると、OTA やファイルシステムの初期化で存在しないアドレスを踏む。
2. **PSRAM モードを配線に合わせる。** 封入型 2 MB Quad は `CONFIG_SPIRAM_MODE_QUAD`、8 MB Octal は `CONFIG_SPIRAM_MODE_OCT`。Arduino では `QSPI PSRAM` / `OPI PSRAM`。**ここを間違えると動作が遅くなるのではなく、起動時に直接 abort する。**
3. **パーティションテーブルは先に足し算する。** Flash ≠ ファームウェアが使える領域。パーティションテーブル、nvs、otadata、phy_init が先に一部を占め、残りを app とデータパーティションで分ける。**デュアル OTA では次のバージョンと同じ大きさの領域が必要**で、おおよそ `app × 2 + データパーティション + 固定オーバーヘッド` を占める。プロトコルスタックとグラフィックスライブラリを載せたファームウェアは一般的に 1〜2 MB。デュアル OTA で倍にすると 4 MB 近くになり、さらに 1 MB をフォントや画像に確保すると領域オーバーになる。これが 4 MB ボードで最も起こりやすい失敗パターンだ。まず自分のファームウェアの実サイズで足し算をし、収まらなければ 16 MB に上げるか、単一 OTA に戻す。
4. **PSRAM バッファの予算を立てる。** フレームバッファ、TLS ハンドシェイクバッファ、JSON や画像デコードのヒープはすべて PSRAM を使う。同時に常駐するピークバッファの合計 × 1.3 を見積もり、2 MB / 8 MB のどちらの段に収まるか確認する。DMA バッファ、タスクスタック、静的変数は既定では PSRAM に置けず、明示的な設定が必要。
5. **アーキテクチャをまたぐ場合はターゲットを切り替える。** C3 は RISC-V、S3 は Xtensa。`CONFIG_IDF_TARGET`、ツールチェーン、SDK 構成を一式変更する。`CONFIG_SPIRAM_*` は C3 ではすべて無効なので書かなくていい。

16 MB + Octal の典型的な構成は次のとおり：

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
```

| 容量帯 | 設定項目 | 実際の影響 |
|---|---|---|
| 16 MB Flash + 8 MB Octal | `FLASHSIZE_16MB` + `MODE_OCT` + `SPEED_80M` | デュアル OTA とデータパーティションが両立し、リソースにも余裕 |
| 8 MB Flash + 8 MB Octal | 上記と同じだが Flash サイズを `8MB` に | デュアル OTA は維持できるがデータパーティションの余裕が明らかに減り、フォントや画像は計画的に配置 |
| 4 MB Flash + 2 MB Quad | `FLASHSIZE_4MB` + `MODE_QUAD` + 4 MB パーティションテーブル | デュアル OTA は通常収まらず単一 OTA が基本。PSRAM バッファ予算を 2 MB 基準で再計算 |
| 4 MB Flash、PSRAM なし（C3） | `IDF_TARGET=esp32c3` + 4 MB パーティションテーブル | `SPIRAM_*` はすべて非適用。メモリ予算はオンチップ SRAM だけで立てる |

ひとことでまとめると：**選定前に 3 つの計算をしよう**——Flash にファームウェアとリソースが収まるか、PSRAM にピークバッファが収まるか、構成項目が実物と一致するか。3 つともクリアして初めて、そのボードは使える。

## 06 選び方と避けるべき落とし穴

**まずプログラムが必要とするものから逆算して容量を決め、クリアできるボードの中から選ぶ。** 価格やスペックの数字で順位を付けてはいけない：

| プログラムの実際の要求 | 足りる最低ライン | 理由 |
|---|---|---|
| カラー/グレースケールの全画面リフレッシュ、複数レイヤーのフレームバッファ、ローカルのフォントと画像、音声ストリーミング、デュアル OTA ＋ファイルシステム | 16 MB Flash + 8 MB Octal PSRAM | 8.5 MB の実行時メモリがフレームバッファと TLS の両方に余裕を持たせ、Flash に 2 個の app と 1 個のリソース領域を収められる |
| モノクロ全画面リフレッシュ、センサー集約、単一 OTA、少量の JSON | 4 MB Flash + 2 MB Quad PSRAM | 2.5 MB の実行時メモリで回るが、フォントと画像は小さいものを選ぶ必要がある |
| 通信によるデータ送信のみ、GUI なし、消費電力とサイズ優先 | 4 MB Flash、PSRAM なし（C3） | 0.4 MB はプロトコルスタック＋小さなバッファにちょうど足り、低消費電力と最小サイズと交換できる |
| カメラ / マイク / SD カードが必要、あるいはウェアラブルサイズの制約 | 8 MB Flash の XIAO 標準版 / Sense | 制約の核心は容量ではなく基板レベルの統合とピン数にある |

表にはないが、特定のボードを即却下できるもう 1 つの条件：**広い温度範囲**。8 MB Octal PSRAM の温度範囲は −40~65 °C。85 °C で動かすには封入型 Quad の品番に切り替えるか、ECC を有効にする（使用容量がさらに 1/16 減る）。この点では `S3 SuperMini FH4R2` の方が幅広い。

落とし穴チェックリスト：

- 8 MB Octal PSRAM は **GPIO33~37** を占有する。資料に「他の機能に使用不可」と書かれたピンは使い回さない。
- `FH4R2` の `H` は Flash ダイが高温グレードであることだけを示し、**チップ全体が 105 °C に届くという意味ではない**。現行データシートの温度範囲は −40~85 °C。
- 裸ダイ設計ではモジュールの RF 認証に頼れないため、製品化する際は基板レベルの RF コンプライアンスを個別に確認する。`ESP32-C3FN4` は乐鑫（Espressif）の公式サイトで EOL と記載されており、新規設計では量産中の代替品を選ぶ。
- 封入型 Flash と PSRAM は同一の SPI ラインを共有し、ピンは完全に占有されている。**外部ストレージの拡張は不可能**。ストレージをカスタマイズするには封入のない品番から基板を新規設計する必要がある。
- 実装アンテナの実性能が仕様表に書かれることはない。接続が不安定、壁を隔てて切断される場合は、まずアンテナのキープアウトと U.FL 端子の有無を確認し、次に RSSI を実測する。一部の低コストボードでこの種の報告がよく見られ、いきなりファームウェアのバグとして何度も掘り返さないこと。

### 価格以外のコスト

小売のおおよその価格はハードウェアの出発点にすぎない。「点灯するボード」から「長年安定して動く製品」までには、さらに 4 種類のコストがかかり、どれも「Flash が何 MB、PSRAM が何 MB」とは無関係だ。**ハードウェアエンジニアリング**（構造と放熱、電源とバッテリー、アンテナ調整、製品全体の EMC）、**ソフトウェアエンジニアリング**（ドライバ適合、スリープとウェイクアップ、異常回復、アップグレードとロールバック、長期互換性）、**コンプライアンス認証**（製品全体の EMC / RF、市場准入）、**量産とアフターサービス**（歩留まり、ロットの一貫性、修理用予備部品）。

その量は製品の形態によって極端に変わり、商品ページに載ることもない。したがってこの記事が比較しているのは**選定時点のハードウェアスペック**であって、完成品のコスト構造ではない。スペックを正しく読めれば間違ったボードを買うのは防げる。ボードが到着した後に何に投資するかは、プロジェクトそのものが決める。

---

**出典と根拠**：Espressif『ESP32-S3 Series Datasheet v2.2』表 1-1 / 2-14 / 5-11 / 5-12、『ESP32-C3 Series Datasheet』、『ESP32-S3-WROOM-1 & 1U Datasheet』表 1-1 / 1-2（9 つの発注コード、Flash と PSRAM の種類、温度範囲、モジュール寸法）、『ESP32-S3-WROOM-2 Datasheet』（1.8 V SPI と 32 MB Flash 帯）、Seeed Studio XIAO ESP32-S3 シリーズ公式 wiki と製品仕様書、S3 N16R8 MINI 開発ボードのメーカー公開資料、ESP-IDF『Support for External RAM』および Arduino-ESP32 ボード構成ドキュメント。容量は公称値で、実際に `malloc()` できるヒープはやや小さい。PSRAM の帯域、温度範囲、GPIO 占有は各型番の最新データシートに従うこと。文中の価格は 2026-11 時点の公開小売チャネルによる**おおよその価格（中国元＝人民元）**で、根拠は第 04 節を参照。品質評価や購入助言ではない。
