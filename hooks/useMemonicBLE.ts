import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import * as FileSystem from 'expo-file-system/legacy';
import { toByteArray, fromByteArray } from 'base64-js';
import { API_URL, AI_URL } from '../app/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const CHARACTERISTIC_UUID = "abcd1234-ab12-ab12-ab12-abcdef123456";

export const useMemonicBLE = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);
    const [lastMemory, setLastMemory] = useState<string | null>(null);

    const managerRef = useRef<BleManager | null>(null);
    const deviceRef = useRef<Device | null>(null);
    const audioBufferRef = useRef<number[]>([]);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (Platform.OS === 'web') {
            console.log('Bluetooth is not supported on web. Mocking BLE connection.');
            return;
        }

        managerRef.current = new BleManager();
        scanAndConnect();

        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (deviceRef.current) {
                managerRef.current?.cancelDeviceConnection(deviceRef.current.id).catch(() => {});
            }
            managerRef.current?.destroy();
        };
    }, []);

    const scanAndConnect = () => {
        if (!managerRef.current) return;
        managerRef.current.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.error('Scan error:', error);
                scheduleReconnect();
                return;
            }

            if (device?.name === 'Memonic' || device?.localName === 'Memonic') {
                managerRef.current?.stopDeviceScan();
                connectToDevice(device);
            }
        });
    };

    const connectToDevice = async (device: Device) => {
        try {
            const connectedDevice = await device.connect();
            await connectedDevice.discoverAllServicesAndCharacteristics();
            deviceRef.current = connectedDevice;
            setIsConnected(true);

            managerRef.current?.onDeviceDisconnected(device.id, (error, dev) => {
                setIsConnected(false);
                setIsReceiving(false);
                deviceRef.current = null;
                scheduleReconnect();
            });

            setupNotifications(connectedDevice);
        } catch (e) {
            console.error('Connection error:', e);
            scheduleReconnect();
        }
    };

    const scheduleReconnect = () => {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
            scanAndConnect();
        }, 5000);
    };

    const setupNotifications = (device: Device) => {
        device.monitorCharacteristicForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            (error, characteristic) => {
                if (error) {
                    console.error('Notification error:', error);
                    return;
                }

                if (characteristic?.value) {
                    handleIncomingData(characteristic.value);
                }
            }
        );
    };

    const [currentMode, setCurrentMode] = useState<string | null>(null);

    const handleIncomingData = async (base64Data: string) => {
        const decoded = toByteArray(base64Data);
        
        // Convert to string to check if it's a command
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

        // It's binary audio data
        setIsReceiving(true);
        audioBufferRef.current.push(...Array.from(decoded));
    };

    const createWavHeader = (dataLength: number) => {
        const header = new Uint8Array(44);
        const view = new DataView(header.buffer);
        
        view.setUint32(0, 1380533830, false); // "RIFF"
        view.setUint32(4, 36 + dataLength, true); // Chunk size
        view.setUint32(8, 1463899717, false); // "WAVE"
        view.setUint32(12, 1718449184, false); // "fmt "
        view.setUint32(16, 16, true); // Subchunk1Size
        view.setUint16(20, 1, true); // AudioFormat
        view.setUint16(22, 1, true); // NumChannels
        view.setUint32(24, 16000, true); // SampleRate
        view.setUint32(28, 16000 * 2, true); // ByteRate
        view.setUint16(32, 2, true); // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample
        view.setUint32(36, 1684108385, false); // "data"
        view.setUint32(40, dataLength, true); // Subchunk2Size
        
        return header;
    };

    const processAudioBuffer = async (mode: string | null) => {
        if (audioBufferRef.current.length === 0) return;

        const pcmData = new Uint8Array(audioBufferRef.current);
        audioBufferRef.current = []; // clear buffer

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

    const uploadAudio = async (fileUri: string, mode: string | null) => {
        const userId = await AsyncStorage.getItem('user_id');
        
        const formData = new FormData();
        formData.append('file', {
            uri: fileUri,
            name: 'memory.wav',
            type: 'audio/wav',
        } as any);

        if (mode && mode.startsWith('ENROLL')) {
            const enrollName = mode.replace('ENROLL', '').trim();
            formData.append('enroll_user', enrollName);
        }

        if (userId) {
            formData.append('user_id', userId);
        }

        try {
            const response = await fetch(`${AI_URL}/audio`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                if (result && result.transcript) {
                    setLastMemory(result.transcript);
                } else if (result && result.text) {
                    setLastMemory(result.text);
                } else {
                    setLastMemory("Memory processed successfully");
                }
            } else {
                console.error('Upload failed with status', response.status);
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    return { isConnected, isReceiving, lastMemory };
};
