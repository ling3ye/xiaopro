---
title: "TFT 触摸交互面板"
boardId: "rp2040"
moduleIds:
  - "display/st7735"
  - "actuator/relay"
difficulty: "Medium"
intro: "基于 Pico 和 ST7735 TFT 屏幕的可触摸交互控制面板。"
---

## 项目简介

本项目创建一个基于 Raspberry Pi Pico 的彩色 TFT 交互面板，支持触摸控制多个继电器设备。面板显示实时状态，并提供直观的开关按钮。

## 硬件清单

| 组件 | 数量 |
|------|------|
| Raspberry Pi Pico | 1 |
| ST7735 TFT 1.8" 显示屏 | 1 |
| 触摸面板模块 (XPT2046) | 1 |
| 5V 继电器模块 x4 | 4 |
| 面包板 + 杜邦线 | 若干 |

## 系统功能

1. **彩色界面显示**
   - 实时显示各设备状态
   - 温度/湿度信息展示
   - 系统时间显示

2. **触摸控制**
   - 屏幕触摸按钮控制继电器
   - 滑动条调节参数
   - 菜单导航

3. **状态管理**
   - 自动保存配置
   - 断电恢复

## 核心代码 (MicroPython)

```python
import machine
import time
import math
from machine import Pin, SPI
import st7735
import xpt2046

# 初始化显示屏
spi = machine.SPI(1, baudrate=40000000, polarity=0, phase=0)
tft = st7735.ST7735(spi, 128, 160, reset=machine.Pin(8, machine.Pin.OUT),
                    dc=machine.Pin(3, machine.Pin.OUT), cs=machine.Pin(5, machine.Pin.OUT))
tft.initr(st7735.INITR_BLACKTAB)
tft.rotation(1)

# 初始化触摸屏
touch = xpt2046.XPT2046(spi, cs=machine.Pin(4, machine.Pin.OUT))

# 继电器控制
relays = [
    machine.Pin(20, machine.Pin.OUT),
    machine.Pin(21, machine.Pin.OUT),
    machine.Pin(22, machine.Pin.OUT),
    machine.Pin(28, machine.Pin.OUT)
]

# 状态管理
relay_states = [False, False, False, False]

def draw_button(index, state, x, y, w, h):
    """绘制开关按钮"""
    color = st7735.GREEN if state else st7735.RED
    text = "开" if state else "关"

    tft.fill_rect(x, y, w, h, color)
    tft.text(f"设备{index+1}", x+5, y+5, st7735.BLACK)
    tft.text(text, x+5, y+30, st7735.BLACK)

def draw_ui():
    """绘制主界面"""
    tft.fill(st7735.BLACK)

    # 标题
    tft.text("智能控制面板", 10, 5, st7735.WHITE)
    tft.line(0, 25, 160, 25, st7735.WHITE)

    # 绘制开关按钮
    button_width = 70
    button_height = 50

    draw_button(0, relay_states[0], 5, 35, button_width, button_height)
    draw_button(1, relay_states[1], 85, 35, button_width, button_height)
    draw_button(2, relay_states[2], 5, 95, button_width, button_height)
    draw_button(3, relay_states[3], 85, 95, button_width, button_height)

def check_touch():
    """检测触摸事件"""
    while True:
        touch_data = touch.read()
        if touch_data:
            x, y = touch_data
            handle_touch(x, y)
        time.sleep(0.1)

def handle_touch(x, y):
    """处理触摸事件"""
    global relay_states

    # 根据触摸位置判断点击了哪个按钮
    if 35 <= y <= 85:
        if 5 <= x <= 75:
            relay_states[0] = not relay_states[0]
            relays[0].value(relay_states[0])
        elif 85 <= x <= 155:
            relay_states[1] = not relay_states[1]
            relays[1].value(relay_states[1])
    elif 95 <= y <= 145:
        if 5 <= x <= 75:
            relay_states[2] = not relay_states[2]
            relays[2].value(relay_states[2])
        elif 85 <= x <= 155:
            relay_states[3] = not relay_states[3]
            relays[3].value(relay_states[3])

    draw_ui()

# 主程序
draw_ui()
check_touch()
```

## 扩展功能

- 添加温度传感器显示
- 支持定时任务
- WiFi 远程控制
- 屏幕亮度调节
- 动画效果

## 部署建议

- 使用 3D 打印外壳
- 考虑使用外部 5V 电源
- 添加蜂鸣器提示音
