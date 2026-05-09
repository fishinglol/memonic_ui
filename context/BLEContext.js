import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { fromByteArray, toByteArray } from 'base64-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AI_URL } from '../constants/config';

const BLEContext = createContext();

const SERVICE_UUID        = "12345678-1234-1234-1234-123456789abc";
const CHARACTERISTIC_UUID = "abcd1234-ab12-ab12-ab12-abcdef123456";

export const BLEProvider = ({ children }) => {
    const [isConnected, setIsConnected]   = useState(false);
    const [isReceiving, setIsReceiving]   = useState(false); 
    const [lastMemory,  setLastMemory]    = useState(null);

    const managerRef        = useRef(null);
    const deviceRef         = useRef(null);
    const reconnectTimerRef = useRef(null);

    // ── Permissions ───────────────────────────────────────────
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            if (Platform.Version >= 31) {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);
                return (
                    granted['android.permission.BLUETOOTH_SCAN']   === PermissionsAndroid.RESULTS.GRANTED &&
                    granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
                );
            } else {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
        }
        return true;
    };

    // ── Init ──────────────────────────────────────────────────
    useEffect(() => {
        if (Platform.OS === 'web') return;

        const initBLE = async () => {
            const hasPermission = await requestPermissions();
            if (!hasPermission) return;

            const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
            if (isExpoGo) return;

            try {
                if (!managerRef.current) {
                    managerRef.current = new BleManager();
                }
                scanAndConnect();
            } catch (e) {
                console.error("BLE Initialization failed", e);
            }
        };

        initBLE();

        // Heartbeat to backend via WiFi (to keep Cloud status Connected)
        const heartbeatInterval = setInterval(async () => {
            if (deviceRef.current && isConnected) {
                try {
                    await fetch(`${AI_URL}/update`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bracelet: "Connected", dock: "Connected" })
                    });
                } catch (e) {}
            }
        }, 10000);

        return () => {
            clearInterval(heartbeatInterval);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (deviceRef.current) {
                managerRef.current?.cancelDeviceConnection(deviceRef.current.id).catch(() => {});
            }
        };
    }, []);

    // ── Scan & Connect ────────────────────────────────────────
    const scanAndConnect = () => {
        if (!managerRef.current) return;
        managerRef.current.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.warn("Scan error:", error);
                scheduleReconnect();
                return;
            }
            if (device && (device.name === 'Memonic' || device.localName === 'Memonic')) {
                console.log("📍 Found Memonic via BLE!");
                managerRef.current?.stopDeviceScan();
                connectToDevice(device);
            }
        });
    };

    const connectToDevice = async (device) => {
        try {
            const connectedDevice = await device.connect();
            await connectedDevice.requestMTU(512);
            await connectedDevice.discoverAllServicesAndCharacteristics();
            deviceRef.current = connectedDevice;
            setIsConnected(true);
            setIsReceiving(false);

            managerRef.current?.onDeviceDisconnected(device.id, () => {
                setIsConnected(false);
                setIsReceiving(false);
                deviceRef.current = null;
                scheduleReconnect();
            });

            setupNotifications(connectedDevice);
        } catch (e) {
            console.warn("Connection failed:", e);
            scheduleReconnect();
        }
    };

    const scheduleReconnect = () => {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
            scanAndConnect();
        }, 5000);
    };

    // ── Notifications ─────────────────────────────────────────
    const setupNotifications = (device) => {
        device.monitorCharacteristicForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            (error, characteristic) => {
                if (error) {
                    console.warn("Notification error:", error);
                    return;
                }
                if (!characteristic?.value) return;

                const decoded = toByteArray(characteristic.value);
                const msg     = String.fromCharCode.apply(null, Array.from(decoded));
                console.log("📨 ESP32 →", msg);

                setLastMemory(msg);

                // หากได้รับผลลัพธ์ (SUCCESS หรือ ERROR) ให้จบสถานะ Receiving
                const isDone = msg.startsWith("SUCCESS") || msg.startsWith("ERROR");
                if (isDone) {
                    setIsReceiving(false);
                }
            }
        );
    };

    // ── Commands ──────────────────────────────────────────────
    const writeBLE = async (cmd) => {
        if (!deviceRef.current) {
            console.warn("writeBLE: no device connected");
            return false;
        }
        const base64Cmd = fromByteArray(
            new Uint8Array(cmd.split('').map(c => c.charCodeAt(0)))
        );
        try {
            await deviceRef.current.writeCharacteristicWithResponseForService(
                SERVICE_UUID, CHARACTERISTIC_UUID, base64Cmd
            );
            return true;
        } catch (e) {
            console.error(`writeBLE "${cmd}" failed:`, e);
            return false;
        }
    };

    const sendEnrollCommand = async (name) => {
        setLastMemory(null);
        setIsReceiving(true);
        const ok = await writeBLE(`ENROLL ${name}`);
        if (!ok) setIsReceiving(false);
    };

    const startMemoryRecording = async () => {
        setLastMemory(null);
        setIsReceiving(true);
        const ok = await writeBLE('START');
        if (!ok) setIsReceiving(false);
    };

    const sendResetCommand = async () => {
        setIsReceiving(false);
        await writeBLE('RESET');
    };

    const setAutoRecordEnabled = async (enabled) => {
        await writeBLE(enabled ? 'ENABLE_AUTO' : 'DISABLE_AUTO');
    };

    const reconnect = () => {
        if (!managerRef.current) return;
        managerRef.current.stopDeviceScan();
        setIsConnected(false);
        setIsReceiving(false);
        deviceRef.current = null;
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        scanAndConnect();
    };

    return (
        <BLEContext.Provider value={{
            isConnected,
            isReceiving,
            lastMemory,
            sendEnrollCommand,
            sendResetCommand,
            setAutoRecordEnabled,
            startMemoryRecording,
            reconnect,
        }}>
            {children}
        </BLEContext.Provider>
    );
};

export const useBLE = () => useContext(BLEContext);
