# Memonic Project Development Skills & Philosophy

ไฟล์นี้รวบรวมบทเรียนและการตัดสินใจสำคัญในการพัฒนาโปรเจกต์ Memonic เพื่อป้องกันความผิดพลาดซ้ำเดิมและกำชับให้ AI "คิดให้ลึก" ก่อนลงมือแก้โค้ด

## 🚀 1. Architecture Transition (The Big Pivot)
เราเปลี่ยนจาก **BLE Audio Streaming** เป็น **Direct-to-Cloud Wi-Fi**
- **เหตุผล:** ข้อมูลเสียง 224KB (16bit Mono, 7s) ใหญ่เกินไปสำหรับ BLE stack บน Android ทำให้ JS Thread ค้างและแอปหลุด
- **หน้าที่ปัจจุบัน:**
    - **BLE:** ใช้สำหรับ "Remote Control" (ส่งคำสั่ง START, ENROLL) เท่านั้น เพราะ latency ต่ำและไม่ต้องต่อเน็ตก็สั่งงานได้
    - **Wi-Fi:** ใช้สำหรับ "Heavy Data" (อัปโหลดไฟล์เสียงตรงเข้า Cloud) และ "Status Reporting" (Heartbeat)

## 🧠 2. "Think Deeper" Philosophy (กฎเหล็กการแก้ปัญหา)
ห้ามแก้ปัญหาแบบ "ขอไปที" หรือ "แก้ทีละจุด" ให้ใช้หลักการดังนี้:

### ก. Sync the Status
ถ้าแก้ทางเดินข้อมูล (Data Path) ต้องกลับมาดูระบบสถานะ (Status UI) เสมอ:
- **ตัวอย่าง:** เมื่อเปลี่ยนให้ ESP32 ส่งเสียงผ่าน Wi-Fi ตรงเข้า Cloud -> Cloud จะรู้สถานะเครื่องก่อนแอป -> ดังนั้น ESP32 ต้องส่ง Heartbeat ไปที่ Cloud เพื่อให้แอป (หน้า Settings) แสดงผลว่า "Connected" ได้ถูกต้อง

### ข. Zero Dead-ends UI
ห้ามทิ้ง User ไว้กับ Alert Error ที่ไปต่อไม่ได้:
- **ตัวอย่าง:** แทนที่จะเด้ง Alert "Bracelet Required" แล้วจบ -> ให้เปลี่ยนเป็น "Connecting..." และสั่ง `reconnect()` อัตโนมัติ พร้อมแสดงสถานะการเชื่อมต่อ (Badge) ให้เห็นชัดเจนในหน้างานนั้นๆ

### ค. Cross-Device Impact
การแก้ Firmware (C++) มีผลต่อความคาดหวังของ App (JS) เสมอ:
- **ตัวอย่าง:** ถ้า Firmware เปลี่ยน Gain เสียง -> AI Backend ต้องปรับ Threshold การจำเสียงตาม -> UI ในแอปต้องมีปุ่ม Re-Enroll ถ้าเสียงเปลี่ยนไปมาก

## 🛠️ 3. Technical Wisdom (สิ่งที่ห้ามลืม)

### บลูทูธ (BLE)
- **Discovery:** การสแกนหา UUID ใน Android ไม่เสถียร ให้สแกนหาชื่ออุปกรณ์ **"Memonic"** โดยตรงแทน
- **Handshake:** การส่งคำสั่งผ่าน BLE ควรมีการตอบกลับ (Notify/Indication) สั้นๆ เพื่อให้ UI ในแอป Update สถานะได้ทันที

### การจัดการพลังงานและ RAM (ESP32)
- **Buffer:** ข้อมูลเสียง 7 วินาทีใช้ RAM ประมาณ 224KB ซึ่งเกือบเต็ม Heap ของ ESP32-S3 -> ต้อง `malloc` เมื่อจะใช้ และ `free` ทันทีที่ส่งเสร็จ เพื่อป้องกันเครื่อง Reboot

### ระบบรายงานตัว (Heartbeat)
- เครื่องต้องรายงานตัว (POST /update) ทุกๆ 30 วินาที เพื่อให้ Cloud ทราบว่าเครื่องยังออนไลน์อยู่ และหน้า Settings ในแอปจะไม่แสดงผลเป็น "Disconnected"

## ⚠️ 4. Future Impact Warning
- **WiFi Config:** ในอนาคตต้องมีระบบ WiFi Provisioning (เช่น ESP-Touch หรือ BLE Config) เพื่อไม่ให้รหัสผ่าน WiFi ค้างอยู่ในโค้ด
- **Battery Life:** การต่อ WiFi ตลอดเวลาใช้ไฟมาก ถ้าเปลี่ยนเป็นใส่แบตเตอรี่ ต้องสลับเป็นระบบ Deep Sleep หรือลดความถี่ Heartbeat ลง
