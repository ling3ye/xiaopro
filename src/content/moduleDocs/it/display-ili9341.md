---
moduleId: display/ili9341
---

## Descrizione del componente

![2.4-tft-uno-display](https://img.lingshunlab.com/2.4-tft-uno-display.jpg?imageView2/0/q/75|watermark/2/text/TGluZ1NodW5sYWIuY29tIOWHjOmhuuWunumqjOWupA==/font/5b6u6L2v6ZuF6buR/fontsize/260/fill/IzAwMDAwMA==/dissolve/66/gravity/SouthEast/dx/10/dy/10|imageslim)

### Caratteristiche del prodotto

- Si inserisce direttamente in schede come Arduino UNO e Mega2560, senza bisogno di fili — comodo e senza complicazioni
- Risoluzione 320x240, display nitido, con supporto al touch
- Supporta visualizzazione a 16 bit RGB 65K colori per una resa cromatica ricca e vivace
- Utilizza un bus parallelo a 8 bit, molto più veloce dell'aggiornamento tramite SPI seriale
- Circuiti integrati di conversione di livello 5V/3.3V onboard, compatibile con entrambe le tensioni di funzionamento
- Slot per scheda SD integrato per facilitare esperimenti ed espansioni
- Fornisce librerie Arduino con numerosi programmi di esempio
- Standard di qualità industriale per un funzionamento stabile a lungo termine
- Supporto tecnico per il driver di basso livello disponibile

### Specifiche tecniche

| Nome | Parametro |
|--------|--------|
| Colori display | RGB 65K colori |
| Dimensione | 2.4(pollici) |
| Tipo | TFT |
| Chip driver | ILI9341 |
| Risoluzione | 320*240 (Pixel) |
| Interfaccia modulo | 8-bit parallel interface |
| Area di visualizzazione attiva | 48.96*36.72(mm) |
| Dimensioni PCB modulo | 72.20*52.7(mm) |
| Temperatura di funzionamento | -20℃~60℃ |
| Temperatura di conservazione | -30℃~70℃ |
| Tensione di funzionamento | 5V/3.3V |
| Peso del prodotto (con imballaggio) | 39(g) |

<div style="height:6em"></div>

## Descrizione dei pin

| Etichetta pin | Descrizione pin |
|-----------|-----------------|
| LCD_RST | Segnale di reset del bus LCD, reset a livello basso<br>Segnale di reset del bus LCD, reset a livello basso |
| LCD_CS | Segnale di chip select del bus LCD, attivo a livello basso<br>Segnale di chip select del bus LCD, attivo a livello basso |
| LCD_RS | Segnale di selezione comando/dati del bus LCD, livello basso: comando, livello alto: dati<br>Segnale di selezione comando/dati del bus LCD, livello basso: comando, livello alto: dati |
| LCD_WR | Segnale di scrittura del bus LCD<br>Segnale di scrittura del bus LCD |
| LCD_RD | Segnale di lettura del bus LCD<br>Segnale di lettura del bus LCD |
| GND | Massa dell'alimentazione<br>Massa dell'alimentazione |
| 5V | Ingresso alimentazione 5V<br>Ingresso alimentazione 5V |
| 3V3 | Ingresso alimentazione 3.3V, questo pin può essere lasciato scollegato<br>Ingresso alimentazione 3.3V, questo pin può essere lasciato scollegato |
| LCD_D0 | LCD dati 8-bit Bit0<br>LCD dati 8-bit Bit0 |
| LCD_D1 | LCD dati 8-bit Bit1<br>LCD dati 8-bit Bit1 |
| LCD_D2 | LCD dati 8-bit Bit2<br>LCD dati 8-bit Bit2 |
| LCD_D3 | LCD dati 8-bit Bit3<br>LCD dati 8-bit Bit3 |
| LCD_D4 | LCD dati 8-bit Bit4<br>LCD dati 8-bit Bit4 |
| LCD_D5 | LCD dati 8-bit Bit5<br>LCD dati 8-bit Bit5 |
| LCD_D6 | LCD dati 8-bit Bit6<br>LCD dati 8-bit Bit6 |
| LCD_D7 | LCD dati 8-bit Bit7<br>LCD dati 8-bit Bit7 |
| SD_SS | Segnale di chip select del bus SPI della scheda SD, attivo a livello basso<br>Segnale di chip select del bus SPI della scheda SD, attivo a livello basso |
| SD_DI | Segnale MOSI del bus SPI della scheda SD<br>Segnale MOSI del bus SPI della scheda SD |
| SD_DO | Segnale MISO del bus SPI della scheda SD<br>Segnale MISO del bus SPI della scheda SD |
| SD_SCK | Segnale di clock del bus SPI della scheda SD<br>Segnale di clock del bus SPI della scheda SD |

## Suggerimenti per l'uso

1. **Scelta dell'alimentazione**: il modulo supporta doppio ingresso di tensione a 5V e 3.3V, seleziona quella appropriata in base alla scheda di sviluppo che stai utilizzando
2. **Inserimento diretto su Arduino**: questo modulo è progettato specificamente per Arduino UNO e Mega2560, si inserisce direttamente senza bisogno di cablaggio aggiuntivo
3. **Utilizzo della scheda SD**: se vuoi usare la funzionalità SD, assicurati di collegare correttamente i pin dell'interfaccia SPI
4. **Funzionalità touch**: il modulo supporta il touch, ma richiede il controller touch e il driver appropriati

## Domande frequenti

**D: Posso usarlo con un ESP32?**
R: Certo, ma non puoi inserirlo direttamente — dovrai collegare l'interfaccia del bus parallelo a 8 bit tramite fili DuPont.

**D: Lo schermo non mostra nulla, cosa faccio?**
R: Controlla che l'alimentazione sia collegata correttamente, verifica che il pin LCD_RST sia connesso al pin di reset della scheda, e assicurati che il codice di inizializzazione venga eseguito correttamente.
