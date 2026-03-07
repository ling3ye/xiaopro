---
moduleId: display/ili9341
---

## コンポーネント説明

![2.4-tft-uno-display](https://img.lingshunlab.com/2.4-tft-uno-display.jpg?imageView2/0/q/75|watermark/2/text/TGluZ1NodW5sYWIuY29tIOWHjOmhuuWunumqjOWupA==/font/5b6u6L2v6ZuF6buR/fontsize/260/fill/IzAwMDAwMA==/dissolve/66/gravity/SouthEast/dx/10/dy/10|imageslim)

### 製品特徴

- Arduino UNO や Mega2560 などの開発ボードに直接挿入して使用可能、配線不要、シンプルで便利
- 320×240 解像度、鮮明な表示、タッチ機能対応
- 16ビット RGB 65K 色表示対応、豊富な色彩表現
- 8ビットパラレルバス採用、シリアル SPI よりも高速リフレッシュ
- オンボード 5V/3.3V レベル変換 IC、5V/3.3V 動作電圧に対応
- SD カードスロット搭載、拡張実験に便利
- Arduino ライブラリ提供、豊富なサンプルプログラム付き
- 軍事級工法基準、長期安定動作
- 低レベルドライバー技術サポート提供

### 技術仕様

| 名称 | パラメータ |
|--------|--------|
| 表示色 | RGB 65K カラー |
| サイズ | 2.4(inch) |
| タイプ | TFT |
| ドライバチップ | ILI9341 |
| 解像度 | 320*240 (Pixel) |
| モジュールインターフェース | 8-bit parallel interface |
| 有効表示エリア | 48.96*36.72(mm) |
| モジュール PCB サイズ | 72.20*52.7(mm) |
| 動作温度 | -20℃~60℃ |
| 保存温度 | -30℃~70℃ |
| 動作電圧 | 5V/3.3V |
| 製品重量(梱包含む) | 39(g) |

<div style="height:6em"></div>

## ピン説明

| ピンラベル | ピン説明 |
|-----------|-----------------|
| LCD_RST | LCD bus reset signal, low level reset<br>LCD バスリセット信号、ローレベルでリセット |
| LCD_CS | LCD bus chip select signal, low level enable<br>LCD バスチップ選択信号、ローレベルで有効 |
| LCD_RS | LCD bus command / data selection signal,low level: command, high level: data<br>LCD バスコマンド/データ選択信号、ローレベル：コマンド、ハイレベル：データ |
| LCD_WR | LCD bus write signal<br>LCD バス書き込み信号 |
| LCD_RD | LCD bus read signal<br>LCD バス読み取り信号 |
| GND | Power ground<br>電源グランド |
| 5V | 5V power input<br>5V 電源入力 |
| 3V3 | 3.3V power input, this pin can be disconnected<br>3.3V 電源入力、このピンは接続不要 |
| LCD_D0 | LCD 8-bit data Bit0<br>LCD 8ビットデータ Bit0 |
| LCD_D1 | LCD 8-bit data Bit1<br>LCD 8ビットデータ Bit1 |
| LCD_D2 | LCD 8-bit data Bit2<br>LCD 8ビットデータ Bit2 |
| LCD_D3 | LCD 8-bit data Bit3<br>LCD 8ビットデータ Bit3 |
| LCD_D4 | LCD 8-bit data Bit4<br>LCD 8ビットデータ Bit4 |
| LCD_D5 | LCD 8-bit data Bit5<br>LCD 8ビットデータ Bit5 |
| LCD_D6 | LCD 8-bit data Bit6<br>LCD 8ビットデータ Bit6 |
| LCD_D7 | LCD 8-bit data Bit7<br>LCD 8ビットデータ Bit7 |
| SD_SS | SD card SPI bus chip select signal, low level enable<br>SD カード SPI バスチップ選択信号、ローレベルで有効 |
| SD_DI | SD card SPI bus MOSI signal<br>SD カード SPI バス MOSI 信号 |
| SD_DO | SD card SPI bus MISO signal<br>SD カード SPI バス MISO 信号 |
| SD_SCK | SD card SPI bus clock signal<br>SD カード SPI バスクロック信号 |

## 使用上のヒント

1. **電源選択**：モジュールは 5V と 3.3V のデュアル電圧入力をサポート、開発ボードの要件に応じて適切な電圧を選択してください
2. **Arduino 直挿入**：このモジュールは Arduino UNO と Mega2560 専用に設計されており、追加配線なしで直接挿入して使用できます
3. **SD カード使用**：SD カード機能を使用する場合、SPI インターフェースピンを正しく接続してください
4. **タッチ機能**：モジュールはタッチ機能をサポート、対応するタッチコントローラーとドライバコードが必要です

## よくある質問

**Q: ESP32 で使用できますか？**
A: はい、使用可能ですが、ESP32 は直接挿入できません。ジャンパー線を使用して 8 ビットパラレルバスインターフェースに接続する必要があります。

**Q: 画面が表示されない場合はどうすればいいですか？**
A: 電源接続が正しいか確認し、LCD_RST ピンが開発ボードのリセットピンに正しく接続されていることを確認し、初期化コードが正しく実行されていることを確認してください。
