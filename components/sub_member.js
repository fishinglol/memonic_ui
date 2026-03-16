import {
    Text, View, StyleSheet, TouchableOpacity, Modal,
    Animated, Dimensions, TextInput, KeyboardAvoidingView,
    Platform, ScrollView, Alert
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
let Audio = null;
try {
    Audio = require('expo-av').Audio;
} catch (e) {
    console.warn('expo-av native module not available. Voice enrollment will not work in Expo Go.');
}


const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

// 🔧 Change this to your backend IP when testing on device
const API_BASE = 'https://8000-01kkh2et3bdjymj2fjq6jabg8k.cloudspaces.litng.ai';

const MIN_SECONDS = 5;
const MAX_SECONDS = 10;

export default function AddMemberSheet({ visible, onClose }) {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    const [memberName, setMemberName] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDone, setRecordingDone] = useState(false);
    const [elapsed, setElapsed] = useState(0);          // seconds elapsed
    const [enrolling, setEnrolling] = useState(false);

    const recordingRef = useRef(null);   // expo-av Recording object
    const timerRef = useRef(null);
    const recordingUriRef = useRef(null);

    // ── slide animation ──────────────────────────────────────────
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
                speed: 14,
            }).start();
        } else {
            slideAnim.setValue(SHEET_HEIGHT);
            resetRecordingState();
        }
    }, [visible]);

    const resetRecordingState = () => {
        setIsRecording(false);
        setRecordingDone(false);
        setElapsed(0);
        setEnrolling(false);
        recordingUriRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: SHEET_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    // ── recording logic ──────────────────────────────────────────
    const startRecording = async () => {
        try {
            if (!Audio) {
                Alert.alert(
                    'Not Available',
                    'Voice recording requires a Development Build. It does not work in Expo Go.'
                );
                return;
            }
            // Ask for mic permission
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) {
                Alert.alert('Permission denied', 'Microphone access is required.');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            recordingRef.current = recording;
            setIsRecording(true);
            setRecordingDone(false);
            setElapsed(0);

            // Start timer — auto-stop at MAX_SECONDS
            timerRef.current = setInterval(async () => {
                setElapsed(prev => {
                    const next = prev + 1;
                    if (next >= MAX_SECONDS) {
                        clearInterval(timerRef.current);
                        stopRecording();  // auto-stop
                    }
                    return next;
                });
            }, 1000);

        } catch (err) {
            console.error('Failed to start recording:', err);
            Alert.alert('Error', 'Could not start recording.');
        }
    };

    const stopRecording = async () => {
        try {
            if (timerRef.current) clearInterval(timerRef.current);
            if (!recordingRef.current) return;

            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingUriRef.current = uri;
            recordingRef.current = null;

            setIsRecording(false);
            setRecordingDone(true);
        } catch (err) {
            console.error('Failed to stop recording:', err);
        }
    };

    const handleMicPress = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // ── enroll: POST audio to backend ────────────────────────────
    const handleAddMember = async () => {
        if (!memberName.trim()) {
            Alert.alert('Missing name', 'Please enter a member name.');
            return;
        }
        if (!recordingDone || !recordingUriRef.current) {
            Alert.alert('No voice recorded', 'Please record your voice first.');
            return;
        }
        if (elapsed < MIN_SECONDS) {
            Alert.alert(
                'Too short',
                `Recording is only ${elapsed}s. Please record at least ${MIN_SECONDS} seconds.`
            );
            return;
        }

        setEnrolling(true);
        try {
            const formData = new FormData();
            formData.append('user_id', memberName.trim());
            formData.append('file', {
                uri: recordingUriRef.current,
                name: 'voiceprint.m4a',
                type: 'audio/m4a',
            });

            const response = await fetch(`${API_BASE}/api/enroll`, {
                method: 'POST',
                body: formData,
                // Don't set Content-Type manually — let FormData set the boundary
            });

            const data = await response.json();

            if (!response.ok) {
                Alert.alert('Enrollment failed', data.detail || 'Unknown error');
                return;
            }

            Alert.alert('Success! 🎉', `${memberName} has been enrolled.`);
            resetRecordingState();
            setMemberName('');
            handleClose();

        } catch (err) {
            console.error('Enroll error:', err);
            Alert.alert('Network error', 'Could not reach the server.');
        } finally {
            setEnrolling(false);
        }
    };

    // ── timer bar color ──────────────────────────────────────────
    const timerColor = elapsed < MIN_SECONDS ? '#ffd33d' : '#4cd964';  // yellow → green once past 5s
    const timerProgress = Math.min(elapsed / MAX_SECONDS, 1);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose} />

                <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.handleBar} />

                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Add Member</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close-circle" size={28} color="#8e8e93" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.inputLabel}>Name</Text>
                        <TextInput
                            style={styles.sheetInput}
                            placeholder="Enter member name"
                            placeholderTextColor="rgba(255, 255, 255, 0.3)"
                            value={memberName}
                            onChangeText={setMemberName}
                        />

                        {/* ── Voice Enrollment ── */}
                        <View style={styles.voiceSection}>
                            <Text style={styles.inputLabel}>Enroll Voice</Text>

                            <View style={styles.voiceRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.voiceButton,
                                        isRecording && styles.voiceButtonRecording,
                                        recordingDone && styles.voiceButtonDone,
                                    ]}
                                    onPress={handleMicPress}
                                >
                                    <LinearGradient
                                        colors={
                                            isRecording
                                                ? ['rgba(255, 59, 48, 0.3)', 'rgba(255, 59, 48, 0.1)']
                                                : recordingDone
                                                    ? ['rgba(76, 217, 100, 0.2)', 'rgba(76, 217, 100, 0.05)']
                                                    : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                                        }
                                        style={styles.voiceGradient}
                                    >
                                        <Ionicons
                                            name={
                                                isRecording ? 'stop' :
                                                    recordingDone ? 'checkmark' : 'mic-outline'
                                            }
                                            size={28}
                                            color={
                                                isRecording ? '#ff3b30' :
                                                    recordingDone ? '#4cd964' : '#ffd33d'
                                            }
                                        />
                                    </LinearGradient>
                                </TouchableOpacity>

                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    {!isRecording && !recordingDone && (
                                        <Text style={styles.helperText}>
                                            Tap to record and say:{"\n"}
                                            <Text style={styles.quoteText}>"Hi one two three, I am so happy to see you"</Text>
                                        </Text>
                                    )}

                                    {isRecording && (
                                        <View>
                                            <Text style={{ color: '#ff3b30', fontSize: 14, marginBottom: 8 }}>
                                                🔴 Recording... {elapsed}s / {MAX_SECONDS}s{elapsed >= MIN_SECONDS ? '  ✓ Good!' : ''}
                                            </Text>
                                            {/* Progress bar */}
                                            <View style={styles.progressTrack}>
                                                <Animated.View
                                                    style={[
                                                        styles.progressFill,
                                                        {
                                                            width: `${timerProgress * 100}%`,
                                                            backgroundColor: timerColor,
                                                        }
                                                    ]}
                                                />
                                                {/* 5s marker */}
                                                <View style={styles.progressMarker} />
                                            </View>
                                            <Text style={{ color: '#8e8e93', fontSize: 12, marginTop: 4 }}>
                                                Tap stop when done (min {MIN_SECONDS}s)
                                            </Text>
                                        </View>
                                    )}

                                    {recordingDone && (
                                        <Text style={{ color: '#4cd964', fontSize: 14 }}>
                                            ✅ Voice recorded ({elapsed}s){"\n"}
                                            <Text style={{ color: '#8e8e93', fontSize: 12 }}>
                                                Tap mic to re-record
                                            </Text>
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* ── Search History ── */}
                        <View style={[styles.voiceSection, { marginBottom: 5 }]}>
                            <Text style={styles.inputLabel}>OR Search History</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.historyItem}
                            onPress={() => {
                                handleClose();
                                router.push('/Voice_History');
                            }}
                        >
                            <Ionicons name="people-circle-outline" size={22} color="#ffd33d" style={{ marginRight: 15 }} />
                            <Text style={styles.historyItemText}>Search History</Text>
                            <Ionicons name="chevron-forward" size={20} color="#8e8e93" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>

                        {/* ── Add Button ── */}
                        <TouchableOpacity
                            style={[styles.addButton, enrolling && { opacity: 0.6 }]}
                            onPress={handleAddMember}
                            disabled={enrolling}
                        >
                            <LinearGradient
                                colors={['#ffd33d', '#f7b733']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.addButtonGradient}
                            >
                                <Text style={styles.addButtonText}>
                                    {enrolling ? 'Enrolling...' : 'Add Member'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: SHEET_HEIGHT, backgroundColor: '#1e2124',
        borderTopLeftRadius: 25, borderTopRightRadius: 25,
        paddingHorizontal: 20, paddingBottom: 30,
        borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 20,
    },
    handleBar: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignSelf: 'center', marginTop: 10, marginBottom: 15,
    },
    sheetHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 25,
    },
    sheetTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    sheetContent: { flex: 1 },
    inputLabel: {
        color: '#8e8e93', fontSize: 14,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
    },
    sheetInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 15, padding: 15, color: '#fff', fontSize: 16,
        marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    voiceSection: { marginBottom: 25 },
    voiceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    voiceButton: {
        width: 60, height: 60, borderRadius: 30, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(255, 211, 61, 0.3)',
    },
    voiceButtonRecording: { borderColor: 'rgba(255, 59, 48, 0.6)' },
    voiceButtonDone: { borderColor: 'rgba(76, 217, 100, 0.5)' },
    voiceGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    helperText: { color: '#8e8e93', fontSize: 14, flex: 1 },
    quoteText: { color: '#ffd33d', fontStyle: 'italic' },
    progressTrack: {
        height: 6, backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3, overflow: 'hidden', position: 'relative',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    progressMarker: {
        position: 'absolute', left: '50%',   // 5s out of 10s = 50%
        top: 0, bottom: 0, width: 2,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    addButton: {
        marginTop: 10, borderRadius: 20, overflow: 'hidden',
        shadowColor: '#ffd33d', shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    },
    addButtonGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 20 },
    addButtonText: { color: '#25292e', fontSize: 17, fontWeight: 'bold' },
    historyItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        marginTop: 5, marginBottom: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    historyItemText: { color: '#fff', fontSize: 17 },
});
