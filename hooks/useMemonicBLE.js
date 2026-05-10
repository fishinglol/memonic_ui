// hooks/useMemonicBLE.js
// Thin wrapper รอบ BLEContext — ทำให้ component import จากที่เดียวได้เลย

import { useBLE } from '../context/BLEContext';

export const useMemonicBLE = () => {
    const ble = useBLE();
    return {
        isConnected:          ble.isConnected,
        isReceiving:          ble.isReceiving,       // ✅ ค่าจริงจาก BLEContext
        lastMemory:           ble.lastMemory,
        sendEnrollCommand:    ble.sendEnrollCommand,
        sendResetCommand:     ble.sendResetCommand,
        setAutoRecordEnabled: ble.setAutoRecordEnabled,
        startMemoryRecording: ble.startMemoryRecording,
        reconnect:            ble.reconnect,         // ✅ ไม่ missing อีกต่อไป
    };
};
