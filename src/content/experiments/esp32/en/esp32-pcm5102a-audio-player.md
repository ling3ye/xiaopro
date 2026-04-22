---
title: "ESP32-S3 + PCM5102A MP3 Player | I2S Wiring + Arduino Code Tutorial"
boardId: esp32s3
moduleId: audio/pcm5102a
category: esp32
date: 2026-04-22
intro: "Connect the PCM5102A DAC module to an ESP32-S3 via the I2S interface and use the ESP32-audioI2S library to stream MP3 audio over Wi-Fi. Fewer than 10 wires, under 50 lines of code — beginner-friendly and ready to go."
image: "https://img.lingflux.com/2026/04/0c35d50bc32e0bd67636e15a21d5e2ed.png"
---

# ESP32-S3 + PCM5102A MP3 Player — Full Tutorial (I2S Wiring + Arduino Code)

> **TL;DR**: Use an ESP32-S3 development board, connect it to a PCM5102A DAC module via the I2S interface, and leverage the ESP32-audioI2S library to stream MP3 audio over Wi-Fi. Fewer than 10 wires, under 50 lines of code — beginner-friendly right out of the box.

---

## Quick Start

Just want the essentials? Here's the shortcut:

1. Connect ESP32-S3 GPIO17 (BCK), GPIO16 (LCK), and GPIO15 (DIN) to the PCM5102A's BCK, LCK, and DIN respectively.
2. Connect PCM5102A's XMT pin to 3.3V (or drive it high via GPIO7 in code). Tie all other control pins (FMT/SCL/DMP/FLT) to GND.
3. Install the Arduino library: **ESP32-audioI2S** (by schreibfaul1).
4. Copy the code below, update your Wi-Fi credentials, flash the board, and enjoy the music.

---

**ESP32-S3 + PCM5102A** is one of the best value combinations for DIY audio projects: the ESP32-S3 handles Wi-Fi connectivity, MP3 streaming, and audio decoding, while the PCM5102A converts the digital signal into analog audio (note: DAC-only output, no built-in amplifier — an external amp module is needed for speakers). The entire setup costs just a few dollars, yet the audio quality far exceeds what you'd expect at this price point.

All wiring diagrams and code in this article have been tested and verified. Follow the steps below and you'll have it working in no time.

---

## Result

Once powered on, the ESP32-S3 automatically connects to Wi-Fi, fetches an MP3 audio stream from the internet, decodes it through the PCM5102A, and plays sound through headphones or an external amplifier + speakers. No touchscreen, no button presses — it starts playing as soon as it boots.

<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/CjGkTj7KaQo?si=y2DN_3PwYmIfS5K_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

## PCM5102A Audio Module Overview

### What Is the PCM5102A?

The **PCM5102A** is a high-performance stereo **DAC chip** (Digital-to-Analog Converter) made by Texas Instruments.

Your ESP32-S3 outputs **digital audio signals** (I2S-formatted 0s and 1s), but amplifiers, headphones and other audio equipment don't understand digital — they only respond to **analog voltage signals** (waveforms that vary over time). The PCM5102A acts as a real-time translator between the two, converting digital signals into analog audio that your audio equipment can actually play.

### PCM5102A Key Specifications

| Parameter | Specification |
|---|---|
| Interface | I2S (natively compatible with ESP32) |
| Supported Sample Rates | 8kHz – 384kHz |
| Dynamic Range | 112dB (detailed sound, extremely low noise floor) |
| Operating Voltage | 3.3V single supply (perfect match for ESP32) |
| MCLK | Built-in PLL, no external master clock required |
| Output | Differential line-level output (no amplifier, cannot drive speakers directly) |

**Why choose the PCM5102A?** It's affordable, easy to use, runs on 3.3V directly, doesn't need an external clock, and its 112dB dynamic range is excellent for microcontroller-based audio — making it the most popular I2S DAC companion for ESP32 projects.

> **⚠️ Important: The PCM5102A is a DAC-only module — it has no amplifier!**
>
> The PCM5102A only converts digital signals to analog (Line Level). **It has no amplification capability whatsoever.**
>
> - **Never connect speakers directly**: Speaker impedance is low (typically 4Ω–8Ω). The PCM5102A cannot supply enough current, and a direct connection will **destroy the module**.
> - **Headphones are also risky**: Most headphones have low impedance (16Ω–32Ω). The PCM5102A's line-level output is not designed to drive headphones — prolonged use may damage the module. High-impedance headphones (≥250Ω) are less risky but still not recommended.
> - **Correct approach**: To drive speakers, add an **amplifier module** between the PCM5102A and the speaker (e.g., PAM8403, MAX98357, TPA2016). For testing, use high-impedance headphones and keep the volume low.

### PCM5102A Pin Reference

| Pin Label | Function | ESP32-S3 Connection | Notes |
|---|---|---|---|
| **3.3V** | Logic power (3.3V) | Connect to ESP32 3.3V | Required |
| **GND** | Ground | Connect to ESP32 GND | Required — common ground is critical |
| **BCK** | I2S bit clock | Connect to GPIO17 | Core I2S signal |
| **LCK** | I2S left/right channel clock (LRCK/WS) | Connect to GPIO16 | Core I2S signal |
| **DIN** | I2S audio data input | Connect to GPIO15 | Core I2S signal |
| **XMT** | Soft mute control (High = normal output) | Connect to 3.3V or GPIO7 | **Must be driven high, otherwise no sound** |
| **FMT** | Audio format select (Low = I2S) | Connect to GND | Just tie to ground |
| **SCL** | System master clock (built-in PLL makes this optional) | Connect to GND | Just tie to ground |
| **DMP** | De-emphasis control | Connect to GND | Just tie to ground |
| **FLT** | Digital filter mode | Connect to GND | Just tie to ground |

> **Rule of thumb:** Tie all four control pins — FMT, SCL, DMP, and FLT — to GND. Simple, stable, and foolproof.

---

## Bill of Materials (BOM)

| Component | Qty | Notes |
|---|---|---|
| ESP32-S3 development board | x 1 | Any ESP32-S3 DevKit will work |
| PCM5102A audio module | x 1 | Widely available online, roughly $1–2 |
| Jumper wires (Dupont) | As needed | Male-to-male or male-to-female depending on your board |
| High-impedance headphones | x 1 | For testing, ≥64Ω recommended; low-impedance headphones or speakers require an external amplifier module (e.g., PAM8403) |

---

## ESP32-S3 to PCM5102A Wiring

Wiring is the step where mistakes are most likely. After connecting everything, double-check **pin by pin** against the table below — this alone will save you 80% of troubleshooting time.

| ESP32-S3 GPIO | PCM5102A Pin | Function |
|---|---|---|
| 3.3V | **3.3V** | Logic power |
| GND | **GND** | Ground (must share common ground!) |
| **GPIO 17** | **BCK** | I2S bit clock |
| **GPIO 16** | **LCK** | I2S left/right channel clock (LRCK/WS) |
| **GPIO 15** | **DIN** | I2S audio data input |
| **GPIO 7** | **XMT** | Soft mute control (driven high in code; can also tie directly to 3.3V) |
| GND | FMT / SCL / DMP / FLT | Format and control pins (all tied to ground) |

---

## Required Arduino Library

Search for and install in the Arduino IDE Library Manager:

**ESP32-audioI2S** (by schreibfaul1)

If you can't find it, download the ZIP from GitHub and install manually: [https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

---

## Complete Arduino Code (Tested & Verified)

The following code has been tested on ESP32-S3 + PCM5102A. Just copy it, update your Wi-Fi credentials, and upload:

```cpp
// More experiments at www.lingflux.com

#include <Arduino.h>
#include <WiFi.h>
#include <Audio.h>

// -- Wi-Fi Configuration (change to your own) -------------------------
const char* ssid     = "your_wifi_name";
const char* password = "your_wifi_password";

// -- I2S Pin Definitions -----------------------------------------------
#define I2S_BCLK  17   // BCK: bit clock
#define I2S_LRCK  16   // LCK: left/right channel clock
#define I2S_DOUT  15   // DIN: audio data
#define XMT        7   // XMT: soft mute control (HIGH = normal output)

Audio audio;

void setup() {
  Serial.begin(115200);

  // Step 1: Drive XMT high to unmute the PCM5102A
  pinMode(XMT, OUTPUT);
  digitalWrite(XMT, HIGH);

  // Step 2: Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connected!");

  // Step 3: Configure I2S pins and volume
  audio.setPinout(I2S_BCLK, I2S_LRCK, I2S_DOUT);
  audio.setVolume(12);  // Volume range: 0–21, start around 10 and increase gradually to avoid damaging headphones or module

  // Step 4: Start streaming online MP3
  audio.connecttohost("https://pixabay.com/music/download/id-219731.mp3");
  Serial.println("Audio playback started...");
}

void loop() {
  // Must be called continuously to maintain audio decoding and playback (do not remove!)
  audio.loop();
}

// Debug callback: prints library status (useful for troubleshooting)
void audio_info(const char *info) {
  Serial.print("Audio Info: ");
  Serial.println(info);
}
```

**Code Notes:**

- `audio.setVolume(12)`: Volume ranges from 0 to 21. Start around 10 and increase gradually. High volume increases output current and may damage the module when using headphones.
- `connecttohost()`: Supports HTTP/HTTPS direct MP3 links. If a URL stops working, simply swap in another one.
- `audio.loop()`: Must be called continuously inside `loop()` — it handles audio stream decoding and output. Do not remove it, and avoid adding long-blocking operations nearby.

---

## Frequently Asked Questions (FAQ)

### Q: No sound at all after wiring and powering on — how do I troubleshoot?

No sound is the most common issue for beginners. Check the following in order — this resolves 90% of cases:

**1. Check common ground** The ESP32-S3 and PCM5102A GND pins must be connected together with a jumper wire. Without a common ground, the signal circuit is incomplete and no sound will ever come through. This is the single most overlooked step.

**2. Verify I2S pin wiring** BCK, LCK, and DIN — if any of these three wires is connected to the wrong pin or swapped with another, you'll get either complete silence or persistent static/noise. Double-check against the table below:

| ESP32-S3 GPIO | PCM5102A Pin |
| ------------- | ------------- |
| GPIO 17       | BCK           |
| GPIO 16       | LCK           |
| GPIO 15       | DIN           |

**3. Check that XMT is driven high** XMT is the PCM5102A's soft mute control: LOW = muted, HIGH = normal playback. If it's left floating or pulled low, the chip stays muted regardless of all other settings. Fix: add `digitalWrite(7, HIGH)` in your code, or tie XMT directly to 3.3V with a jumper wire.

### Q: Hearing faint "tick tick" or "click click" popping sounds during playback — what causes this?

This is one of the most discussed issues in ESP32 audio projects. There are several possible causes — here they are, ordered from most to least likely:

**Cause 1: I2S Buffer Underrun (most likely)**

When the ESP32 is decoding MP3 or reading data from the network/SD card, a sudden CPU load spike, undersized buffer, or decode speed falling behind the I2S output rate can cause brief data interruptions. When the PCM5102A receives continuous clock signals but the data line momentarily drops to zero, it produces repeatable popping sounds.

Fix: Increase `dma_buf_count` (recommended: 8–16) and `dma_buf_len` (recommended: 256–1024) in `i2s_config`. If using `xTaskCreate` for the audio task, raise its priority.

**Cause 2: Sample Rate or Bit Depth Mismatch**

This happens when the audio file's sample rate (44.1kHz / 48kHz) doesn't match the ESP32 I2S configuration, or when 24-bit and 16-bit formats are mixed.

Fix: Batch-convert all audio files to 44.1kHz, 16-bit, Stereo (you can use ffmpeg for this). In your I2S configuration, explicitly set `bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT`.

**Cause 3: Hardware Signal Integrity Issues**

If I2S wires are too long or lack series damping resistors, signal edges can ring, causing click sounds. ESP32 Wi-Fi/CPU activity can also inject noise through the shared 3.3V power rail.

Fix: Add 33–100Ω series resistors on the BCK, LCK, and DIN signal lines. Add dedicated 10μF + 0.1μF decoupling capacitors to the PCM5102A's power supply.

**Cause 4: PCM5102A Internal Auto-Mute Triggering**

When DIN data is briefly zero or held low, the chip's smart mute logic activates, producing a subtle pop.

Fix: Insert fade-in/fade-out transitions at the start and end of playback.

### Q: Online playback stutters or cuts out — what can I do?

Online streaming depends on network quality. Weak signal or unstable bandwidth will cause interruptions. Try a faster MP3 direct link first. If your network is otherwise fine, switch to reading local audio files from an SD card or SPIFFS.

### Q: Can I use different GPIO pins for I2S on the ESP32-S3?

Yes. The ESP32-S3 I2S peripheral supports GPIO remapping — just change the values of `I2S_BCLK`, `I2S_LRCK`, and `I2S_DOUT` in your code.

### Q: What sample rates does the PCM5102A support?

The PCM5102A supports 8kHz, 16kHz, 32kHz, 44.1kHz, 48kHz, 96kHz, 192kHz, and 384kHz — fully covering all standard MP3 playback needs (typically 44.1kHz).

### Q: Can the PCM5102A be powered with 5V?

Some PCM5102A modules include an onboard LDO that accepts 5V input and steps it down to 3.3V internally. However, 3.3V power is recommended for better stability and a perfect logic-level match with the ESP32-S3.

### Q: Does MP3 playback on the ESP32-S3 use a lot of CPU?

The ESP32-audioI2S library takes advantage of the ESP32-S3's dual-core architecture, running audio decoding on a separate core with minimal impact on the main loop. Typical CPU usage is around 10%–30%.

### Q: Can I play audio and drive a TFT screen at the same time?

Yes. The ESP32-S3 has plenty of performance to handle both I2S audio output and SPI TFT display simultaneously. Just make sure your `loop()` doesn't contain any long-blocking operations.

### Q: Can I connect speakers or headphones directly to the PCM5102A output?

**Never connect speakers directly, and use headphones with caution.** The PCM5102A is a DAC-only module — its output is line-level with no amplification. Connecting speakers directly (4Ω–8Ω) will **destroy the module** due to excessive current draw. Low-impedance headphones (16Ω–32Ω) also pose a risk of damage over time.

To drive speakers, you must add an amplifier module between the PCM5102A output and the speaker. Recommended options: PAM8403 (3W×2, cheap and effective), MAX98357 (I2S input, built-in DAC — can replace the PCM5102A entirely), TPA2016 (2W×2, with AGC). For debugging, use high-impedance headphones (≥64Ω) and keep the volume low.

### Q: What's the difference between the ESP32-S3 and a regular ESP32 for I2S audio?

The ESP32-S3 runs at 240MHz dual-core (higher than earlier ESP32 variants), making MP3 decoding smoother with fewer dropped frames and less popping.

---

## References

- **PCM5102A Datasheet (Texas Instruments):**
  [https://www.ti.com/lit/ds/symlink/pcm5102a.pdf](https://www.ti.com/lit/ds/symlink/pcm5102a.pdf)

- **ESP32-audioI2S Library (GitHub, by schreibfaul1):**
  [https://github.com/schreibfaul1/ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S)

- **Espressif ESP32-S3 Technical Documentation:**
  [https://www.espressif.com/en/products/socs/esp32-s3](https://www.espressif.com/en/products/socs/esp32-s3)

---

*For more ESP32 experiments and tutorials, visit [www.lingflux.com](http://www.lingflux.com)*
