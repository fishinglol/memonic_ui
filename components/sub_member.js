import {
    Text, View, StyleSheet, TouchableOpacity, Modal,
    Animated, Dimensions, TextInput, KeyboardAvoidingView,
    Platform, ScrollView, Alert
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { AI_URL } from '../constants/config';

const C = {
    bg: '#2c3240', surface: '#323848', surfaceDeep: '#262c38',
    shadowDark: '#1e222c', text: '#e4e7ed', textMuted: '#8a92a6',
    icon: '#ffffff', accent: '#e8734a', accentSoft: 'rgba(232, 115, 74, 0.12)',
    danger: '#ff453a', dangerSoft: 'rgba(255, 69, 58, 0.10)',
    divider: 'rgba(255, 255, 255, 0.04)', success: '#34d399', successSoft: 'rgba(52, 211, 153, 0.10)',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;
const RECORD_SECONDS = 4;   // seconds to record per sample

export default function AddMemberSheet({ visible, onClose }) {
    const slideAnim  = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const pulseAnim  = useRef(new Animated.Value(1)).current;
    const glowAnim   = useRef(new Animated.Value(0)).current;

    const [memberName, setMemberName]       = useState('');
    const [phase, setPhase]                 = useState('idle');  // idle | recording | processing | done | error
    const [elapsed, setElapsed]             = useState(0);
    const [resultMsg, setResultMsg]         = useState('');
    const [sampleCount, setSampleCount]     = useState(0);

    const recordingRef  = useRef(null);
    const timerRef      = useRef(null);

    // ── Sheet animation ────────────────────────────────────────────
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14,
            }).start();
        } else {
            slideAnim.setValue(SHEET_HEIGHT);
            resetState();
        }
    }, [visible]);

    // ── Pulse animation while recording ───────────────────────────
    useEffect(() => {
        if (phase !== 'recording') return;
        const pulse = Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]));
        const glow = Animated.loop(Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]));
        pulse.start();
        glow.start();
        return () => { pulse.stop(); glow.stop(); pulseAnim.setValue(1); glowAnim.setValue(0); };
    }, [phase]);

    const resetState = () => {
        setPhase('idle');
        setElapsed(0);
        setResultMsg('');
        if (timerRef.current) clearInterval(timerRef.current);
        // Stop any ongoing recording
        if (recordingRef.current) {
            recordingRef.current.stopAndUnloadAsync().catch(() => {});
            recordingRef.current = null;
        }
    };

    const handleClose = () => {
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true })
            .start(() => onClose());
    };

    // ── Record via phone mic ───────────────────────────────────────
    const handleMicPress = async () => {
        if (phase === 'recording') return;
        if (!memberName.trim()) {
            Alert.alert('Missing name', 'Please enter a member name first.');
            return;
        }

        // Request mic permission
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Microphone access is required to enroll a voice.');
            return;
        }

        setPhase('recording');
        setElapsed(0);
        setResultMsg('');

        // Set audio mode for recording
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        try {
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            recordingRef.current = recording;

            // Live countdown timer
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setElapsed(prev => prev + 1);
            }, 1000);

            // Auto-stop after RECORD_SECONDS
            setTimeout(async () => {
                if (timerRef.current) clearInterval(timerRef.current);
                await finishRecording();
            }, RECORD_SECONDS * 1000);

        } catch (e) {
            console.error('Recording start error:', e);
            setPhase('error');
            setResultMsg('Could not start recording.');
        }
    };

    const finishRecording = async () => {
        const rec = recordingRef.current;
        if (!rec) return;

        setPhase('processing');
        try {
            await rec.stopAndUnloadAsync();
            recordingRef.current = null;

            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

            const uri = rec.getURI();
            if (!uri) throw new Error('No recording URI');

            // Convert to base64
            const { FileSystem } = await import('expo-file-system');
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

            // Send to backend
            const res = await fetch(`${AI_URL}/api/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: memberName.trim(),
                    audio_base_64: base64,
                    file_ext: '.m4a',
                }),
            });

            const data = await res.json();
            if (res.ok && data.status === 'ok') {
                const newCount = sampleCount + 1;
                setSampleCount(newCount);
                setPhase('done');
                setResultMsg(`Sample ${newCount} enrolled ✓`);
            } else {
                throw new Error(data.detail || data.message || 'Enrollment failed');
            }
        } catch (e) {
            console.error('Enrollment error:', e);
            setPhase('error');
            setResultMsg(`Error: ${e.message}`);
        }
    };

    const enrolledOK  = phase === 'done';
    const isRecording = phase === 'recording';
    const isProcessing = phase === 'processing';

    const timerProgress = Math.min(elapsed / RECORD_SECONDS, 1);
    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose} />
                <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIconWrap}>
                                <Ionicons name="person-add" size={18} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.sheetTitle}>Add Member</Text>
                                <Text style={styles.sheetSubtitle}>Record voice with your phone mic</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={18} color={C.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

                        {/* Name input */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="person-outline" size={16} color={C.icon} />
                                <Text style={styles.sectionLabel}>MEMBER NAME</Text>
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={styles.sheetInput}
                                    placeholder="Enter member name"
                                    placeholderTextColor={C.textMuted}
                                    value={memberName}
                                    onChangeText={setMemberName}
                                    editable={!isRecording && !isProcessing}
                                />
                            </View>
                        </View>

                        {/* Voice enrollment */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="mic-outline" size={16} color={C.icon} />
                                <Text style={styles.sectionLabel}>VOICE ENROLLMENT</Text>
                                {sampleCount > 0 && (
                                    <View style={styles.sampleBadge}>
                                        <Text style={styles.sampleBadgeText}>{sampleCount} sample{sampleCount > 1 ? 's' : ''}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.voiceContainer}>
                                {/* Mic button */}
                                <View style={styles.micArea}>
                                    {isRecording && (
                                        <Animated.View style={[styles.pulseRing, {
                                            transform: [{ scale: pulseAnim }],
                                            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.1] }),
                                        }]} />
                                    )}
                                    <TouchableOpacity
                                        style={[
                                            styles.voiceButton,
                                            isRecording && { backgroundColor: C.danger },
                                            enrolledOK && { backgroundColor: C.success },
                                            isProcessing && { backgroundColor: C.accent },
                                            !isRecording && !enrolledOK && !isProcessing && { backgroundColor: C.surfaceDeep },
                                        ]}
                                        onPress={handleMicPress}
                                        activeOpacity={0.7}
                                        disabled={isRecording || isProcessing}
                                    >
                                        <Ionicons
                                            name={isRecording ? 'stop' : isProcessing ? 'sync' : enrolledOK ? 'checkmark-circle' : 'mic'}
                                            size={28}
                                            color={(isRecording || enrolledOK || isProcessing) ? '#fff' : C.icon}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Status area */}
                                <View style={styles.voiceStatus}>
                                    {/* Idle */}
                                    {phase === 'idle' && (
                                        <View>
                                            <Text style={styles.voicePromptTitle}>Record Reference Voice</Text>
                                            <Text style={styles.voicePromptBody}>Tap mic and say:</Text>
                                            <View style={styles.quoteCard}>
                                                <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.accent} style={{ marginRight: 8, marginTop: 2 }} />
                                                <Text style={styles.quoteText}>"Hi one two three, I am so happy to see you"</Text>
                                            </View>
                                            <Text style={styles.hintText}>🔁 Record multiple times for better accuracy</Text>
                                        </View>
                                    )}

                                    {/* Recording */}
                                    {isRecording && (
                                        <View>
                                            <View style={styles.recordingBadge}>
                                                <View style={styles.recordingDot} />
                                                <Text style={styles.recordingBadgeText}>Recording</Text>
                                            </View>
                                            <Text style={styles.timerText}>
                                                {formatTime(elapsed)}
                                                <Text style={styles.timerMax}> / {formatTime(RECORD_SECONDS)}</Text>
                                            </Text>
                                            <View style={styles.progressTrack}>
                                                <View style={[styles.progressFill, {
                                                    width: `${timerProgress * 100}%`,
                                                    backgroundColor: C.danger,
                                                }]} />
                                            </View>
                                        </View>
                                    )}

                                    {/* Processing */}
                                    {isProcessing && (
                                        <View>
                                            <Text style={styles.voicePromptTitle}>Processing…</Text>
                                            <Text style={styles.voicePromptBody}>Sending to server</Text>
                                        </View>
                                    )}

                                    {/* Done */}
                                    {(enrolledOK || phase === 'error') && (
                                        <View>
                                            <View style={styles.doneBadge}>
                                                <Ionicons
                                                    name={enrolledOK ? 'checkmark-circle' : 'close-circle'}
                                                    size={16}
                                                    color={enrolledOK ? C.success : C.danger}
                                                />
                                                <Text style={[styles.doneBadgeText, !enrolledOK && { color: C.danger }]}>
                                                    {resultMsg}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.reRecordBtn}
                                                onPress={() => setPhase('idle')}
                                            >
                                                <Ionicons name="refresh" size={14} color={C.icon} />
                                                <Text style={styles.reRecordText}>Record another sample</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Confirm Add */}
                        {sampleCount > 0 && (
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => {
                                    Alert.alert('Success! 🎉', `${memberName} enrolled with ${sampleCount} sample${sampleCount > 1 ? 's' : ''}.`);
                                    resetState();
                                    setMemberName('');
                                    setSampleCount(0);
                                    handleClose();
                                }}
                                activeOpacity={0.85}
                            >
                                <View style={styles.addButtonInner}>
                                    <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.addButtonText}>Save Member</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        <View style={{ height: 30 }} />
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT,
        backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 22, paddingBottom: 30,
        shadowColor: C.shadowDark, shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.5, shadowRadius: 25, elevation: 25,
    },
    handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.surfaceDeep, alignSelf: 'center', marginTop: 10, marginBottom: 18 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerIconWrap: {
        width: 40, height: 40, borderRadius: 14, backgroundColor: C.accent,
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
        shadowColor: C.accent, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
    },
    sheetTitle: { color: C.text, fontSize: 20, fontWeight: 'bold' },
    sheetSubtitle: { color: C.textMuted, fontSize: 13, marginTop: 1 },
    closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },

    sectionCard: {
        backgroundColor: C.surface, borderRadius: 22, padding: 18, marginBottom: 16,
        shadowColor: C.shadowDark, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
    sectionLabel: { color: C.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, flex: 1 },
    sampleBadge: {
        backgroundColor: C.successSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
    },
    sampleBadgeText: { color: C.success, fontSize: 11, fontWeight: '700' },

    inputBox: { backgroundColor: C.surfaceDeep, borderRadius: 16, overflow: 'hidden' },
    sheetInput: { padding: 15, color: C.text, fontSize: 16 },

    voiceContainer: { flexDirection: 'row', alignItems: 'flex-start' },
    micArea: { position: 'relative', justifyContent: 'center', alignItems: 'center', width: 72, height: 72 },
    pulseRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: C.danger },
    voiceButton: { width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    voiceStatus: { flex: 1, marginLeft: 16, justifyContent: 'center' },

    voicePromptTitle: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
    voicePromptBody: { color: C.textMuted, fontSize: 13, marginBottom: 8 },
    quoteCard: { flexDirection: 'row', backgroundColor: C.accentSoft, borderRadius: 14, padding: 12, marginBottom: 8 },
    quoteText: { color: C.accent, fontSize: 13, fontStyle: 'italic', flex: 1, lineHeight: 18 },
    hintText: { color: C.textMuted, fontSize: 12, marginTop: 4 },

    recordingBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger, marginRight: 6 },
    recordingBadgeText: { color: C.danger, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
    timerText: { color: C.text, fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    timerMax: { color: C.textMuted, fontSize: 14, fontWeight: 'normal' },
    progressTrack: { height: 6, backgroundColor: C.surfaceDeep, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },

    doneBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
    doneBadgeText: { color: C.success, fontSize: 15, fontWeight: '600' },
    reRecordBtn: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.surfaceDeep, gap: 5,
    },
    reRecordText: { color: C.text, fontSize: 13 },

    addButton: {
        borderRadius: 20, overflow: 'hidden',
        shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
    },
    addButtonInner: {
        backgroundColor: C.accent, paddingVertical: 16, alignItems: 'center',
        borderRadius: 20, flexDirection: 'row', justifyContent: 'center',
    },
    addButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});