---
title: "智能电池监控系统"
boardId: "rp2040"
moduleIds:
  - "power/lipo"
  - "sensor/bme280"
  - "display/ssd1306"
difficulty: "Medium"
intro: "创建一个完整的锂电池电池管理系统，监控电压、温度、容量，并提供保护功能。"
---

## 项目简介

本系统使用 Raspberry Pi Pico 监测 18650 锂电池组的状态，包括电压、电流、温度和剩余容量，通过 OLED 屏幕实时显示，并在异常情况时报警。

## 硬件清单

| 组件 | 数量 |
|------|------|
| Raspberry Pi Pico | 1 |
| 18650 电池 x4 | 4 |
| 电池保护板 | 1 |
| BME280 温湿度传感器 | 1 |
| SSD1306 OLED 显示屏 | 1 |
| ACS712 电流传感器 (20A) | 1 |
| 蜂鸣器 | 1 |
| 1kΩ 电阻 x2 | 2 |
| 面包板 + 杜邦线 | 若干 |

## 系统功能

1. **电池参数监测**
   - 总电压监测
   - 单体电压平衡监测
   - 充电/放电电流
   - 电池温度

2. **容量估算**
   - 剩余容量计算
   - 循环次数记录
   - 健康度评估

3. **安全保护**
   - 过压/欠压保护
   - 过流保护
   - 过温保护
   - 蜂鸣器报警

4. **数据显示**
   - OLED 实时显示
   - 历史曲线图

## 系统接线

```
电池组 (+) → 电池保护板 (+) → 负载
             ↓
         ACS712 (5V)
             ↓
         负载 (-)

电压分压:
电池 (+) → 10kΩ → Pico GP26 → 1kΩ → GND

电流测量:
ACS712 OUT → Pico GP27 (ADC1)

温度监测:
BME280 SDA → Pico GP0
BME280 SCL → Pico GP1
```

## 核心代码 (MicroPython)

```python
import machine
import time
import math
from machine import Pin, I2C, ADC, PWM
import ssd1306
import bme280

# ADC 配置
adc_voltage = ADC(26)   # 电压测量
adc_current = ADC(27)   # 电流测量

# 传感器 I2C
i2c = I2C(0, sda=Pin(0), scl=Pin(1))
bme = bme280.BME280(i2c=i2c)

# OLED 显示
oled = ssd1306.SSD1306_I2C(128, 64, i2c)

# 蜂鸣器
buzzer = PWM(Pin(2), freq=2000)

# 常量
BATTERY_CELLS = 4
CELL_VOLTAGE_MAX = 4.2
CELL_VOLTAGE_MIN = 3.0
VOLTAGE_DIVIDER_RATIO = 11  # 10k:1k = 11:1
CURRENT_SENSITIVITY = 0.1  # V/A (20A 型号)

# 电池状态
battery_voltage = 0
battery_current = 0
battery_capacity = 100.0  # 初始容量百分比
battery_temp = 0
battery_health = 100.0

# 报警状态
alarm_active = False

def read_voltage():
    """读取电池电压"""
    raw = adc_voltage.read_u16()
    voltage = (raw * 3.3 / 65535) * VOLTAGE_DIVIDER_RATIO
    return voltage

def read_current():
    """读取充放电电流"""
    raw = adc_current.read_u16()
    voltage = (raw * 3.3 / 65535)
    # ACS712: 2.5V = 0A, 偏移 2.5V
    current = (voltage - 2.5) / CURRENT_SENSITIVITY
    return current

def estimate_capacity(voltage, current):
    """估算剩余容量"""
    avg_voltage = voltage / BATTERY_CELLS
    # 使用简单的线性近似
    capacity = (avg_voltage - CELL_VOLTAGE_MIN) / (CELL_VOLTAGE_MAX - CELL_VOLTAGE_MIN) * 100
    return max(0, min(100, capacity))

def update_display():
    """更新 OLED 显示"""
    oled.fill(0)

    # 标题
    oled.text("电池监控系统", 10, 0)

    # 电压
    oled.text(f"电压: {battery_voltage:.2f}V", 0, 15)
    oled.text(f"单芯: {battery_voltage/BATTERY_CELLS:.2f}V", 0, 25)

    # 电流
    if battery_current > 0.1:
        status = f"放电: {battery_current:.2f}A"
    elif battery_current < -0.1:
        status = f"充电: {abs(battery_current):.2f}A"
    else:
        status = "待机"
    oled.text(status, 0, 35)

    # 容量和温度
    oled.text(f"容量: {battery_capacity:.1f}%", 70, 15)
    oled.text(f"温度: {battery_temp:.1f}°C", 70, 25)

    # 容量条
    bar_width = int(battery_capacity / 100 * 50)
    oled.rect(0, 50, bar_width, 8, 1)
    oled.rect(0, 50, 50, 8, 0)

    oled.show()

def check_protections():
    """检查电池保护状态"""
    global alarm_active

    avg_cell = battery_voltage / BATTERY_CELLS
    need_alarm = False

    # 过压保护
    if avg_cell > CELL_VOLTAGE_MAX:
        need_alarm = True
        oled.text("过压警告!", 0, 60)

    # 欠压保护
    elif avg_cell < CELL_VOLTAGE_MIN:
        need_alarm = True
        oled.text("欠压警告!", 0, 60)

    # 过流保护
    elif abs(battery_current) > 15:
        need_alarm = True
        oled.text("过流警告!", 0, 60)

    # 过温保护
    elif battery_temp > 50:
        need_alarm = True
        oled.text("过温警告!", 0, 60)

    # 控制蜂鸣器
    if need_alarm:
        if not alarm_active:
            alarm_active = True
            buzzer.duty_u16(16384)
    else:
        alarm_active = False
        buzzer.duty_u16(0)

def main():
    global battery_voltage, battery_current, battery_capacity, battery_temp

    while True:
        # 读取传感器数据
        battery_voltage = read_voltage()
        battery_current = read_current()

        _, pressure, humidity = bme.read_compensated_data()
        battery_temp = pressure / 100  # 温度

        # 计算容量
        battery_capacity = estimate_capacity(battery_voltage, battery_current)

        # 更新显示
        update_display()

        # 检查保护
        check_protections()

        # 打印调试信息
        print(f"电压: {battery_voltage:.2f}V, 电流: {battery_current:.2f}A, 容量: {battery_capacity:.1f}%, 温度: {battery_temp:.1f}°C")

        time.sleep(1)

if __name__ == "__main__":
    main()
```

## 容量估算算法

### Peukert 方程

考虑放电率对容量的影响：

```python
PEUKERT_EXPONENT = 1.3

def peukert_capacity(current, rated_capacity):
    """使用 Peukert 方程计算有效容量"""
    effective_hours = rated_capacity / (current ** PEUKERT_EXPONENT)
    return effective_hours * current
```

### 库仑计数法

累计充放电量：

```python
discharged_mah = 0
rated_capacity = 3000  # 3000mAh

def coulomb_count(current):
    """库仑计数法估算容量"""
    global discharged_mah
    if current > 0:  # 放电
        discharged_mah += current * (1/3600)  # 每秒
    else:  # 充电
        discharged_mah += current * (1/3600)

    remaining = (rated_capacity + discharged_mah) / rated_capacity * 100
    return max(0, min(100, remaining))
```

## 报警阈值配置

```python
ALARM_THRESHOLDS = {
    'over_voltage': 4.25,      # 过压 (V/Cell)
    'under_voltage': 2.7,       # 欠压 (V/Cell)
    'over_current': 15.0,      # 过流 (A)
    'over_temperature': 50.0,  # 过温 (°C)
    'low_temperature': -10.0,  # 低温 (°C)
}
```

## 扩展功能

- 添加 EEPROM 存储历史数据
- 实现 USB 充电管理
- 添加蓝牙数据传输
- 创建容量校准功能
- 多电池组并联支持
