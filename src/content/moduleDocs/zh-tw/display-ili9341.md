---
moduleId: display/ili9341
---

## 元件說明

![2.4-tft-uno-display](https://img.lingshunlab.com/2.4-tft-uno-display.jpg?imageView2/0/q/75|watermark/2/text/TGluZ1NodW5sYWIuY29tIOWHjOmhuuWunumqjOWupA==/font/5b6u6L2v6ZuF6buR/fontsize/260/fill/IzAwMDAwMA==/dissolve/66/gravity/SouthEast/dx/10/dy/10|imageslim)

### 產品特點

- 支援 Arduino UNO 和 Mega2560 等開發板直插使用，無需接線，簡單方便
- 320X240 解析度，顯示效果清晰，支援觸控功能
- 支援 16 位元 RGB 65K 顏色顯示，顯示色彩豐富
- 採用 8 位元並列匯流排，比串列 SPI 重新整理速度快
- 板載 5V/3.3V 電位轉換 IC，相容 5V/3.3V 工作電壓
- 帶 SD 卡槽方便擴充實驗
- 提供 Arduino 函式庫，提供豐富的範例程式
- 軍用級工藝標準，長期穩定工作
- 提供底層驅動技術支援

### 技術規格

| 名稱 | 參數 |
|--------|--------|
| 顯示顏色 | RGB 65K 彩色 |
| 尺寸 | 2.4(inch) |
| 類型 | TFT |
| 驅動晶片 | ILI9341 |
| 解析度 | 320*240 (Pixel) |
| 模組介面 | 8-bit parallel interface |
| 有效顯示區域 | 48.96*36.72(mm) |
| 模組 PCB 尺寸 | 72.20*52.7(mm) |
| 工作溫度 | -20℃~60℃ |
| 儲存溫度 | -30℃~70℃ |
| 工作電壓 | 5V/3.3V |
| 產品重量(含包裝) | 39(g) |

<div style="height:6em"></div>

## 接腳說明

| 接腳標籤 | 接腳說明 |
|-----------|-----------------|
| LCD_RST | LCD bus reset signal, low level reset<br>LCD匯流排重置信號，低電位重置 |
| LCD_CS | LCD bus chip select signal, low level enable<br>LCD匯流排片選信號，低電位致能 |
| LCD_RS | LCD bus command / data selection signal,low level: command, high level: data<br>LCD匯流排指令/資料選擇信號，低電位：指令，高電位：資料 |
| LCD_WR | LCD bus write signal<br>LCD匯流排寫入信號 |
| LCD_RD | LCD bus read signal<br>LCD匯流排讀取信號 |
| GND | Power ground<br>電源地 |
| 5V | 5V power input<br>5V 電源輸入 |
| 3V3 | 3.3V power input, this pin can be disconnected<br>3.3V 電源輸入，此接腳可不接 |
| LCD_D0 | LCD 8-bit data Bit0<br>LCD 8 位元資料 Bit0 |
| LCD_D1 | LCD 8-bit data Bit1<br>LCD 8 位元資料 Bit1 |
| LCD_D2 | LCD 8-bit data Bit2<br>LCD 8 位元資料 Bit2 |
| LCD_D3 | LCD 8-bit data Bit3<br>LCD 8 位元資料 Bit3 |
| LCD_D4 | LCD 8-bit data Bit4<br>LCD 8 位元資料 Bit4 |
| LCD_D5 | LCD 8-bit data Bit5<br>LCD 8 位元資料 Bit5 |
| LCD_D6 | LCD 8-bit data Bit6<br>LCD 8 位元資料 Bit6 |
| LCD_D7 | LCD 8-bit data Bit7<br>LCD 8 位元資料 Bit7 |
| SD_SS | SD card SPI bus chip select signal, low level enable<br>SD 卡 SPI 匯流排片選信號，低電位致能 |
| SD_DI | SD card SPI bus MOSI signal<br>SD 卡 SPI 匯流排 MOSI 信號 |
| SD_DO | SD card SPI bus MISO signal<br>SD 卡 SPI 匯流排 MISO 信號 |
| SD_SCK | SD card SPI bus clock signal<br>SD 卡 SPI 匯流排時脈信號 |

## 使用建議

1. **電源選擇**：模組支援 5V 和 3.3V 雙電壓輸入，根據開發板需求選擇合適的電壓
2. **Arduino 直插**：該模組專為 Arduino UNO 和 Mega2560 設計，可直接插入使用，無需額外接線
3. **SD 卡使用**：如需使用 SD 卡功能，確保正確連接 SPI 介面接腳
4. **觸控功能**：模組支援觸控，需要相應的觸控控制器和驅動程式碼

## 常見問題

**Q: 可以用在 ESP32 上嗎？**
A: 可以，但 ESP32 不能直插使用，需要透過杜邦線連接 8 位元並列匯流排介面。

**Q: 螢幕無顯示怎麼辦？**
A: 檢查電源連接是否正確，確認 LCD_RST 接腳已正確連接到開發板重置接腳，確保初始化程式碼正確執行。
