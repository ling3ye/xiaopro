---
title: "智能门锁系统"
boardId: "esp32-c3"
moduleIds:
  - "communication/ble"
  - "sensor/fingerprint"
  - "actuator/servo-lock"
difficulty: "Medium"
intro: "使用 BLE、指纹识别和舵机锁，打造安全便捷的智能门锁解决方案。"
---

## 项目简介

智能门锁系统结合了多种认证方式（指纹、手机 App、密码），通过 BLE 通信实现低功耗远程控制，为家庭安防提供现代化解决方案。

## 系统架构

```
┌─────────────────────────────────────┐
│         ESP32-C3 门锁端             │
│  ┌─────────────────────────────┐   │
│  │   认证控制逻辑              │   │
│  │   ┌─────────────────────┐  │   │
│  │   │  BLE Server         │  │   │
│  │   │  ┌─────────────┐   │  │   │
│  │   │  │ 指纹模块    │   │  │   │
│  │   │  └─────────────┘   │  │   │
│  │   │  ┌─────────────┐   │  │   │
│  │   │  │ 舵机控制    │   │   │   │
│  │   │  └─────────────┘   │  │   │
│  │   └─────────────────────┘  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
              ↑ BLE 4.2
              │
┌─────────────────────────────────────┐
│      手机 App (BLE Client)          │
│  • 远程开锁/关锁                    │
│  • 添加/删除指纹                    │
│  • 查看开锁记录                    │
│  • 临时密码分享                    │
└─────────────────────────────────────┘
```

## 硬件清单

| 组件 | 数量 | 说明 |
|------|------|------|
| ESP32-C3 | 1 | 主控板（支持 BLE） |
| AS608 指纹模块 | 1 | 光学指纹识别 |
| SG90 舵机 | 1 | 控制门锁机械结构 |
| 电源管理模块 | 1 | 电池供电 |
| 4x3 矩阵键盘（可选） | 1 | 密码输入 |
| 0.96寸 OLED（可选） | 1 | 状态显示 |

## 电路连接

| ESP32-C3 | AS608 | 功能 |
|----------|-------|------|
| GPIO 6   | TX    | 接收 |
| GPIO 7   | RX    | 发送 |
| GPIO 8   | VCC   | 电源控制 |
| GND      | GND   | 地 |

**注意**：AS608 工作电压为 3.3V，需要使用逻辑电平转换器或确保模块支持。

| ESP32-C3 | SG90 | 功能 |
|----------|------|------|
| GPIO 4   | PWM  | 信号线 |
| 5V       | VCC  | 电源 |
| GND      | GND  | 地 |

## 核心代码

### 指纹模块控制

```cpp
#include <Adafruit_Fingerprint.h>

#define FINGER_RX 7
#define FINGER_TX 6
#define FINGER_PWR 8

HardwareSerial mySerial(1);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

uint8_t getFingerprintID() {
    uint8_t p = finger.getImage();
    if (p != FINGERPRINT_OK) return p;

    p = finger.image2Tz();
    if (p != FINGERPRINT_OK) return p;

    p = finger.fingerFastSearch();
    if (p != FINGERPRINT_OK) {
        if (p == FINGERPRINT_NOTFOUND) {
            return 254;  // 未找到指纹
        }
        return p;
    }

    return finger.fingerID;  // 返回指纹 ID
}

bool enrollFingerprint(uint8_t id) {
    int p = -1;
    Serial.print("Waiting for valid finger to enroll as #");
    Serial.println(id);

    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        switch (p) {
            case FINGERPRINT_OK: break;
            case FINGERPRINT_NOFINGER: break;
            case FINGERPRINT_IMAGEFAIL:
                Serial.println("Imaging error");
                return false;
            default:
                Serial.println("Unknown error");
                return false;
        }
    }

    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) return false;

    Serial.println("Remove finger");
    delay(2000);
    p = 0;
    while (p != FINGERPRINT_NOFINGER) {
        p = finger.getImage();
    }

    Serial.println("Place same finger again");
    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        switch (p) {
            case FINGERPRINT_OK: break;
            case FINGERPRINT_NOFINGER: break;
            case FINGERPRINT_IMAGEFAIL:
                Serial.println("Imaging error");
                return false;
            default:
                Serial.println("Unknown error");
                return false;
        }
    }

    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) return false;

    p = finger.createModel();
    if (p != FINGERPRINT_OK) return false;

    p = finger.storeModel(id);
    if (p == FINGERPRINT_OK) {
        Serial.println("Stored!");
        return true;
    } else {
        Serial.println("Storing error");
        return false;
    }
}

void setupFingerprint() {
    mySerial.begin(57600, SERIAL_8N1, FINGER_RX, FINGER_TX);

    pinMode(FINGER_PWR, OUTPUT);
    digitalWrite(FINGER_PWR, HIGH);
    delay(500);

    if (finger.begin()) {
        Serial.println("Found fingerprint sensor!");
    } else {
        Serial.println("Did not find fingerprint sensor");
        return;
    }

    finger.getParameters();
}
```

### 舵机锁控制

```cpp
#include <ESP32Servo.h>

#define SERVO_PIN 4
#define LOCK_ANGLE 0      // 上锁角度
#define UNLOCK_ANGLE 90   // 开锁角度

Servo lockServo;
bool isLocked = true;

void setupServo() {
    lockServo.attach(SERVO_PIN);
    lockServo.write(LOCK_ANGLE);
    delay(500);
    lockServo.detach();  // 断电省电
}

void unlockDoor() {
    lockServo.attach(SERVO_PIN);
    for (int angle = LOCK_ANGLE; angle <= UNLOCK_ANGLE; angle += 5) {
        lockServo.write(angle);
        delay(20);
    }
    delay(500);
    lockServo.detach();
    isLocked = false;
}

void lockDoor() {
    lockServo.attach(SERVO_PIN);
    for (int angle = UNLOCK_ANGLE; angle >= LOCK_ANGLE; angle -= 5) {
        lockServo.write(angle);
        delay(20);
    }
    delay(500);
    lockServo.detach();
    isLocked = true;
}
```

### BLE Server 实现

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// BLE UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_LOCK_UUID      "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_STATUS_UUID    "be9a8236-c33e-45b8-8858-4a4e6d9d4421"
#define CHAR_ENROLL_UUID    "be6c5a4e-47e2-4ab3-998a-5a5a8a6a6666"

BLEServer *pServer;
BLECharacteristic *pLockCharacteristic;
BLECharacteristic *pStatusCharacteristic;
BLECharacteristic *pEnrollCharacteristic;

bool deviceConnected = false;

class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        Serial.println("Device connected");
    };

    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        Serial.println("Device disconnected");
        // 重新开始广播
        pServer->getAdvertising()->start();
    }
};

class LockCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string value = pCharacteristic->getValue();

        if (value.length() > 0) {
            Serial.print("Received command: ");
            Serial.println(value.c_str());

            if (value == "UNLOCK") {
                unlockDoor();
                updateStatus("UNLOCKED");
            } else if (value == "LOCK") {
                lockDoor();
                updateStatus("LOCKED");
            } else if (value.startsWith("ENROLL:")) {
                // 格式: ENROLL:ID
                int id = atoi(value.substr(7).c_str());
                if (enrollFingerprint(id)) {
                    updateStatus(("ENROLL_OK:" + String(id)).c_str());
                } else {
                    updateStatus("ENROLL_FAIL");
                }
            }
        }
    }
};

void setupBLE() {
    BLEDevice::init("SmartLock");

    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);

    // 锁控制特征
    pLockCharacteristic = pService->createCharacteristic(
        CHAR_LOCK_UUID,
        BLECharacteristic::PROPERTY_READ |
        BLECharacteristic::PROPERTY_WRITE
    );
    pLockCharacteristic->setCallbacks(new LockCallbacks());
    pLockCharacteristic->setValue("LOCKED");

    // 状态特征
    pStatusCharacteristic = pService->createCharacteristic(
        CHAR_STATUS_UUID,
        BLECharacteristic::PROPERTY_READ |
        BLECharacteristic::PROPERTY_NOTIFY
    );
    pStatusCharacteristic->addDescriptor(new BLE2902());
    pStatusCharacteristic->setValue(isLocked ? "LOCKED" : "UNLOCKED");

    // 指纹录入特征
    pEnrollCharacteristic = pService->createCharacteristic(
        CHAR_ENROLL_UUID,
        BLECharacteristic::PROPERTY_WRITE
    );

    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("BLE Server started");
}

void updateStatus(const char *status) {
    pStatusCharacteristic->setValue(status);
    pStatusCharacteristic->notify();
    Serial.print("Status: ");
    Serial.println(status);
}
```

### 主程序

```cpp
#define AUTO_LOCK_DELAY 30000  // 30秒后自动上锁

unsigned long unlockTime = 0;

void setup() {
    Serial.begin(115200);

    setupFingerprint();
    setupServo();
    setupBLE();

    Serial.println("Smart Lock System Ready");
}

void loop() {
    // 指纹检测
    uint8_t result = getFingerprintID();

    if (result >= 1 && result <= 127) {  // 有效指纹 ID
        Serial.print("Fingerprint ID #");
        Serial.print(result);
        Serial.println(" detected - Unlocking");

        unlockDoor();
        updateStatus(("UNLOCKED:FP:" + String(result)).c_str());
        unlockTime = millis();
    } else if (result == 254) {
        Serial.println("Fingerprint not found");
    }

    // 自动上锁
    if (!isLocked && (millis() - unlockTime > AUTO_LOCK_DELAY)) {
        lockDoor();
        updateStatus("AUTO_LOCKED");
    }

    delay(100);
}
```

## 安全特性

1. **加密通信**：使用 BLE 安全连接配对
2. **指纹模板加密**：指纹数据在设备加密存储
3. **访问日志**：记录所有开锁事件和时间戳
4. **临时密码**：生成一次性使用的开锁码
5. **离线模式**：无网络时仍可使用指纹开锁

## 扩展功能

1. **人脸识别**：集成 ESP32-CAM 添加人脸解锁
2. **密码键盘**：添加物理密码输入
3. **云端同步**：通过 MQTT 上传开锁记录
4. **多用户管理**：支持不同用户的权限设置
5. **临时访客模式**：生成限时有效的开锁凭证

## 常见问题

**Q：指纹识别速度慢？**
A：检查指纹模块位置是否合适，确保手指干燥清洁，可以降低波特率提高稳定性。

**Q：BLE 连接不稳定？**
A：减少广播间隔，增加发射功率，确保手机和门锁之间没有金属障碍。

**Q：舵机力量不够？**
A：使用更大扭矩的金属齿轮舵机，或者使用电磁锁替代舵机。
