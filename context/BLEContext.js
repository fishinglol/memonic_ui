import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { fromByteArray, toByteArray } from 'base64-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AI_URL } from '../constants/config';

const BLEContext = createContext();

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const CHARACTERISTIC_UUID = "abcd1234-ab12-ab12-ab12-abcdef123456";

export const BLEProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMemory, setLastMemory] = useState(null);

    const managerRef = useRef(null);
    const deviceRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            if (Platform.Version >= 31) {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);
                return (
                    granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
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

        const heartbeatInterval = setInterval(async () => {
            if (deviceRef.current && isConnected) {
                const cmd = 'HEARTBEAT';
                const base64Cmd = fromByteArray(new Uint8Array(cmd.split('').map(c => c.charCodeAt(0))));
                try {
                    await deviceRef.current.writeCharacteristicWithResponseForService(SERVICE_UUID, CHARACTERISTIC_UUID, base64Cmd);
                } catch (e) {
                    // Ignore heartbeat failure
                }
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

    const scanAndConnect = () => {
        if (!managerRef.current) return;
        managerRef.current.startDeviceScan([SERVICE_UUID], null, (error, device) => {
            if (error) {
                scheduleReconnect();
                return;
            }
            if (device) {
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

            managerRef.current?.onDeviceDisconnected(device.id, () => {
                setIsConnected(false);
                deviceRef.current = null;
                scheduleReconnect();
            });

            setupNotifications(connectedDevice);
        } catch (e) {
            scheduleReconnect();
        }
    };

    const scheduleReconnect = () => {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
            scanAndConnect();
        }, 5000);
    };

    const setupNotifications = (device) => {
        device.monitorCharacteristicForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            (error, characteristic) => {
                if (!error && characteristic?.value) {
                    const decoded = toByteArray(characteristic.value);
                    const textStr = String.fromCharCode.apply(null, Array.from(decoded));
                    
                    // Display status messages from ESP32 (e.g., "OK: Enrolled", "ERROR: Upload Failed")
                    if (textStr.includes(':')) {
                        setLastMemory(textStr);
                    }
                }
            }
        );
    };

    const sendEnrollCommand = async (name) => {
        if (!deviceRef.current) return;
        setLastMemory("Triggering enrollment...");
        const cmd = `ENROLL ${name}`;
        const base64Cmd = fromByteArray(new Uint8Array(cmd.split('').map(c => c.charCodeAt(0))));
        try {
            await deviceRef.current.writeCharacteristicWithResponseForService(SERVICE_UUID, CHARACTERISTIC_UUID, base64Cmd);
        } catch (error) {
            console.error('Failed to send enroll command:', error);
        }
    };

    const sendResetCommand = async () => {
        if (!deviceRef.current) return;
        const cmd = `RESET`;
        const base64Cmd = fromByteArray(new Uint8Array(cmd.split('').map(c => c.charCodeAt(0))));
        try {
            await deviceRef.current.writeCharacteristicWithResponseForService(SERVICE_UUID, CHARACTERISTIC_UUID, base64Cmd);
        } catch (error) {
            console.error('Failed to send reset command:', error);
        }
    };

    const setAutoRecordEnabled = async (enabled) => {
        if (!deviceRef.current || !isConnected) return;
        const cmd = enabled ? 'ENABLE_AUTO' : 'DISABLE_AUTO';
        const base64Cmd = fromByteArray(new Uint8Array(cmd.split('').map(c => c.charCodeAt(0))));
        try {
            await deviceRef.current.writeCharacteristicWithResponseForService(SERVICE_UUID, CHARACTERISTIC_UUID, base64Cmd);
        } catch (error) {
            console.warn('Failed to toggle auto-record:', error);
        }
    };

    const startMemoryRecording = async () => {
        if (!deviceRef.current || !isConnected) return;
        setLastMemory("Starting recording...");
        const cmd = 'START';
        const base64Cmd = fromByteArray(new Uint8Array(cmd.split('').map(c => c.charCodeAt(0))));
        try {
            await deviceRef.current.writeCharacteristicWithResponseForService(SERVICE_UUID, CHARACTERISTIC_UUID, base64Cmd);
        } catch (error) {
            console.error('Failed to start memory recording:', error);
        }
    };

    const reconnect = () => {
        if (managerRef.current) {
            managerRef.current.stopDeviceScan();
            setIsConnected(false);
            deviceRef.current = null;
            scanAndConnect();
        }
    };

    return (
        <BLEContext.Provider value={{ isConnected, isReceiving: false, lastMemory, sendEnrollCommand, sendResetCommand, setAutoRecordEnabled, startMemoryRecording, reconnect }}>
            {children}
        </BLEContext.Provider>
    );
};

export const useBLE = () => useContext(BLEContext);
