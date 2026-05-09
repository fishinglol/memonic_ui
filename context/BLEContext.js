import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import * as FileSystem from 'expo-file-system/legacy';
import { toByteArray, fromByteArray } from 'base64-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { API_URL, AI_URL } from '../constants/config';

const BLEContext = createContext();

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const CHARACTERISTIC_UUID = "abcd1234-ab12-ab12-ab12-abcdef123456";

export const BLEProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);
    const [lastMemory, setLastMemory] = useState(null);
    const [currentMode, setCurrentMode] = useState(null);

    const managerRef = useRef(null);
    const deviceRef = useRef(null);
    const audioBufferRef = useRef([]);
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
            await connectedDevice.discoverAllServicesAndCharacteristics();
            deviceRef.current = connectedDevice;
            setIsConnected(true);

            // Notify backend about connection
            fetch(`${AI_URL}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bracelet: "Connected", dock: "Connected" })
            }).catch(err => console.error("Heartbeat update failed", err));

            managerRef.current?.onDeviceDisconnected(device.id, () => {
                setIsConnected(false);
                setIsReceiving(false);
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
                    handleIncomingData(characteristic.value);
                }
            }
        );
    };

    const handleIncomingData = async (base64Data) => {
        const decoded = toByteArray(base64Data);
        const textStr = String.fromCharCode.apply(null, Array.from(decoded));

        if (textStr.startsWith('START')) {
            setIsReceiving(true);
            setCurrentMode('START');
            audioBufferRef.current = [];
            return;
        }
        if (textStr.startsWith('ENROLL')) {
            setIsReceiving(true);
            setCurrentMode(textStr);
            audioBufferRef.current = [];
            return;
        }
        if (textStr.startsWith('END')) {
            setIsReceiving(false);
            const modeToProcess = currentMode;
            setCurrentMode(null);
            await processAudioBuffer(modeToProcess);
            return;
        }
        if (textStr.startsWith('RESET')) {
            setIsReceiving(false);
            setCurrentMode(null);
            audioBufferRef.current = [];
            return;
        }

        // Only push data if we are in a recording mode
        if (currentMode) {
            setIsReceiving(true);
            audioBufferRef.current.push(...Array.from(decoded));
        }
    };

    const processAudioBuffer = async (mode) => {
        if (audioBufferRef.current.length === 0) return;
        const pcmData = new Uint8Array(audioBufferRef.current);
        audioBufferRef.current = [];

        const wavHeader = createWavHeader(pcmData.length);
        const wavData = new Uint8Array(wavHeader.length + pcmData.length);
        wavData.set(wavHeader, 0);
        wavData.set(pcmData, wavHeader.length);

        const base64Wav = fromByteArray(wavData);
        const fileUri = FileSystem.cacheDirectory + 'memory_audio.wav';

        try {
            await FileSystem.writeAsStringAsync(fileUri, base64Wav, {
                encoding: FileSystem.EncodingType.Base64,
            });
            await uploadAudio(fileUri, mode);
        } catch (error) {
            console.error('Error saving or uploading audio:', error);
        }
    };

    const createWavHeader = (dataLength) => {
        const header = new Uint8Array(44);
        const view = new DataView(header.buffer);
        view.setUint32(0, 1380533830, false); // "RIFF"
        view.setUint32(4, 36 + dataLength, true);
        view.setUint32(8, 1463899717, false); // "WAVE"
        view.setUint32(12, 1718449184, false); // "fmt "
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, 16000, true);
        view.setUint32(28, 16000 * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        view.setUint32(36, 1684108385, false); // "data"
        view.setUint32(40, dataLength, true);
        return header;
    };

    const uploadAudio = async (fileUri, mode) => {
        const userId = await AsyncStorage.getItem('user_id');
        const formData = new FormData();
        formData.append('file', { uri: fileUri, name: 'memory.wav', type: 'audio/wav' });
        if (mode && mode.startsWith('ENROLL')) {
            formData.append('enroll_user', mode.replace('ENROLL', '').trim());
        }
        if (userId) formData.append('user_id', userId);

        try {
            const response = await fetch(`${AI_URL}/audio`, { method: 'POST', body: formData });
            if (response.ok) {
                const result = await response.json();
                let displayMsg = "";
                if (result.speaker && result.speaker !== "Unknown") {
                    displayMsg = `[${result.speaker}] `;
                }
                displayMsg += result.transcript || result.text || "Memory processed";
                if (result.emotion && result.emotion !== "Unknown") {
                    displayMsg += ` (${result.emotion})`;
                }
                setLastMemory(displayMsg);
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    const sendEnrollCommand = async (name) => {
        if (!deviceRef.current) return;
        setLastMemory(null); // Clear previous status
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
            setIsReceiving(false);
            setCurrentMode(null);
            audioBufferRef.current = [];
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
        setLastMemory(null);
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
            setIsReceiving(false);
            deviceRef.current = null;
            scanAndConnect();
        }
    };

    return (
        <BLEContext.Provider value={{ isConnected, isReceiving, lastMemory, sendEnrollCommand, sendResetCommand, setAutoRecordEnabled, startMemoryRecording, reconnect }}>
            {children}
        </BLEContext.Provider>
    );
};

export const useBLE = () => useContext(BLEContext);
