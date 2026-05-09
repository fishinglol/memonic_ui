import {
    Text, View, StyleSheet, TouchableOpacity, Modal,
    Animated, Dimensions, TextInput, KeyboardAvoidingView,
    Platform, ScrollView, Alert
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AI_URL } from '../constants/config';

const C = {
    bg: '#2c3240', surface: '#323848', surfaceDeep: '#262c38',
    shadowDark: '#1e222c', text: '#e4e7ed', textMuted: '#8a92a6',
    icon: '#ffffff', accent: '#e8734a', accentSoft: 'rgba(232, 115, 74, 0.12)',
    danger: '#ff453a', dangerSoft: 'rgba(255, 69, 58, 0.10)',
    divider: 'rgba(255, 255, 255, 0.04)', success: '#34d399', successSoft: 'rgba(52, 211, 153, 0.10)',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT  = SCREEN_HEIGHT * 0.82;
const RECORD_SECONDS = 2; 

import { useMemonicBLE } from '../hooks/useMemonicBLE';

export default function AddMemberSheet({ visible, onClose }) {
    const {
        isConnected,
        isReceiving: isBLEReceiving,
        lastMemory,
        sendEnrollCommand,
        sendResetCommand,
        setAutoRecordEnabled,
        reconnect,
    } = useMemonicBLE();

    const router    = useRouter();
    const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim  = useRef(new Animated.Value(0)).current;

    const [memberName,    setMemberName]    = useState('');
    const [recordingDone, setRecordingDone] = useState(false);
    const [elapsed,       setElapsed]       = useState(0);
    const [enrolling,     setEnrolling]     = useState(false);

    const timerRef = useRef(null);

    // ── Sheet open/close ──────────────────────────────────────
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14,
            }).start();
            if (isConnected) setAutoRecordEnabled(false);
        } else {
            slideAnim.setValue(SHEET_HEIGHT);
            resetState();
            if (isConnected) setAutoRecordEnabled(true);
        }
    }, [visible, isConnected]);

    // ── Track BLE recording state ─────────────────────────────
    const prevReceiving = useRef(false);
    useEffect(() => {
        if (isBLEReceiving) {
            setRecordingDone(false);
            setElapsed(0);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setElapsed(prev => prev + 1);
            }, 1000);
        } else if (prevReceiving.current) {
            setRecordingDone(true);
            if (timerRef.current) clearInterval(timerRef.current);
        }
        prevReceiving.current = isBLEReceiving;
    }, [isBLEReceiving]);

    // ── Pulse animation while recording ──────────────────────
    useEffect(() => {
        if (!isBLEReceiving) return;
        const pulse = Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ]));
        const glow = Animated.loop(Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]));
        pulse.start();
        glow.start();
        return () => {
            pulse.stop(); glow.stop();
            pulseAnim.setValue(1); glowAnim.setValue(0);
        };
    }, [isBLEReceiving]);

    // ── Helpers ───────────────────────────────────────────────
    const resetState = () => {
        setRecordingDone(false);
        setElapsed(0);
        setEnrolling(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleClose = () => {
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true })
            .start(() => onClose());
    };

    const handleMicPress = async () => {
        if (!isConnected) {
            reconnect();
            Alert.alert(
                'Connecting...',
                'Scanning for your Memonic bracelet. Please make sure it is turned on and nearby.'
            );
            return;
        }

        if (!memberName.trim()) {
            Alert.alert('Missing name', 'Please enter a member name first.');
            return;
        }

        if (isBLEReceiving) return; 

        resetState();
        sendEnrollCommand(memberName.trim());
    };

    const handleAddMember = async () => {
        if (!memberName.trim()) {
            Alert.alert('Missing name', 'Please enter a member name.');
            return;
        }

        if (isBLEReceiving) {
            Alert.alert('Processing', 'Please wait for the recording to complete.');
            return;
        }

        if (!recordingDone) {
            Alert.alert('No voice', 'Please record your voice first.');
            return;
        }

        if (lastMemory?.includes("SUCCESS")) {
            Alert.alert('Success! 🎉', `${memberName} has been enrolled.`);
            resetState();
            setMemberName('');
            handleClose();
        } else if (lastMemory?.startsWith("ERROR")) {
            Alert.alert('Failed', `Enrollment error: ${lastMemory}`);
            resetState();
        } else {
            Alert.alert('Processing', 'Voice profile is still being processed. Please wait.');
        }
    };

    const timerProgress = Math.min(elapsed / RECORD_SECONDS, 1);
    const formatTime    = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const enrolledOK       = recordingDone && lastMemory?.includes("SUCCESS");
    const isWaitingForBLE  = isConnected && recordingDone && !enrolledOK && !lastMemory?.startsWith("ERROR");
    const isProcessing     = enrolling || isWaitingForBLE;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose} />
                <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.handleBar} />

                    <View style={styles.sheetHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIconWrap}>
                                <Ionicons name="person-add" size={18} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.sheetTitle}>Add Member</Text>
                                <Text style={styles.sheetSubtitle}>Enroll a new voice profile</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.connBadge, { backgroundColor: isConnected ? C.successSoft : C.dangerSoft }]}>
                                <View style={[styles.connDot, { backgroundColor: isConnected ? C.success : C.danger }]} />
                                <Text style={[styles.connText, { color: isConnected ? C.success : C.danger }]}>
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={18} color={C.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

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
                                    editable={!isBLEReceiving}
                                />
                            </View>
                        </View>

                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="mic-outline" size={16} color={C.icon} />
                                <Text style={styles.sectionLabel}>VOICE ENROLLMENT</Text>
                            </View>

                            <View style={styles.voiceContainer}>
                                <View style={styles.micArea}>
                                    {isBLEReceiving && (
                                        <Animated.View style={[styles.pulseRing, {
                                            transform: [{ scale: pulseAnim }],
                                            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.1] }),
                                        }]} />
                                    )}
                                    <TouchableOpacity
                                        style={[
                                            styles.voiceButton,
                                            isBLEReceiving && { backgroundColor: C.danger },
                                            enrolledOK      && { backgroundColor: C.success },
                                            !isBLEReceiving && !enrolledOK && { backgroundColor: C.surfaceDeep },
                                        ]}
                                        onPress={handleMicPress}
                                        activeOpacity={0.7}
                                        disabled={isBLEReceiving}
                                    >
                                        <Ionicons
                                            name={isBLEReceiving ? 'stop' : enrolledOK ? 'checkmark-circle' : 'mic'}
                                            size={isBLEReceiving ? 26 : enrolledOK ? 30 : 28}
                                            color={isBLEReceiving || enrolledOK ? '#fff' : C.icon}
                                        />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.voiceStatus}>
                                    {!isBLEReceiving && !recordingDone && (
                                        <View>
                                            <Text style={styles.voicePromptTitle}>Record Reference Voice</Text>
                                            <Text style={styles.voicePromptBody}>Tap mic and say:</Text>
                                            <View style={styles.quoteCard}>
                                                <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.accent} style={{ marginRight: 8, marginTop: 2 }} />
                                                <Text style={styles.quoteText}>"Hi one two three, I am so happy to see you"</Text>
                                            </View>
                                        </View>
                                    )}

                                    {isBLEReceiving && (
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

                                    {recordingDone && !isBLEReceiving && (
                                        <View>
                                            <View style={styles.doneBadge}>
                                                <Ionicons
                                                    name={enrolledOK ? "checkmark-circle" : lastMemory?.startsWith("ERROR") ? "close-circle" : "sync-outline"}
                                                    size={16}
                                                    color={enrolledOK ? C.success : lastMemory?.startsWith("ERROR") ? C.danger : C.accent}
                                                />
                                                <Text style={[
                                                    styles.doneBadgeText,
                                                    !enrolledOK && { color: lastMemory?.startsWith("ERROR") ? C.danger : C.accent }
                                                ]}>
                                                    {enrolledOK
                                                        ? "Voice Enrolled"
                                                        : lastMemory?.startsWith("ERROR")
                                                            ? lastMemory
                                                            : "Processing..."}
                                                </Text>
                                            </View>
                                            <Text style={styles.doneDetail}>
                                                {enrolledOK
                                                    ? `Profile for "${memberName}" is ready`
                                                    : lastMemory?.startsWith("ERROR")
                                                        ? "Tap mic to try again"
                                                        : "Sending to server..."}
                                            </Text>
                                            {(enrolledOK || lastMemory?.startsWith("ERROR")) && (
                                                <TouchableOpacity style={styles.reRecordBtn} onPress={handleMicPress}>
                                                    <Ionicons name="refresh" size={14} color={C.icon} />
                                                    <Text style={styles.reRecordText}>Re-record</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.addButton, isProcessing && { opacity: 0.6 }]}
                            onPress={handleAddMember}
                            disabled={isProcessing}
                            activeOpacity={0.85}
                        >
                            <View style={styles.addButtonInner}>
                                <Ionicons
                                    name={isProcessing ? "sync" : "person-add"}
                                    size={18}
                                    color="#fff"
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={styles.addButtonText}>
                                    {enrolling ? 'Enrolling...' : isWaitingForBLE ? 'Processing Voice...' : 'Add Member'}
                                </Text>
                            </View>
                        </TouchableOpacity>

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
    connBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginRight: 10 },
    connDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    connText: { fontSize: 12, fontWeight: 'bold' },
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
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    sectionLabel: { color: C.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginLeft: 8 },
    inputBox: { backgroundColor: C.surfaceDeep, borderRadius: 16, overflow: 'hidden' },
    sheetInput: { padding: 15, color: C.text, fontSize: 16 },
    voiceContainer: { flexDirection: 'row', alignItems: 'flex-start' },
    micArea: { position: 'relative', justifyContent: 'center', alignItems: 'center', width: 72, height: 72 },
    pulseRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: C.danger },
    voiceButton: { width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    voiceStatus: { flex: 1, marginLeft: 16, justifyContent: 'center' },
    voicePromptTitle: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
    voicePromptBody: { color: C.textMuted, fontSize: 13, marginBottom: 8 },
    quoteCard: { flexDirection: 'row', backgroundColor: C.accentSoft, borderRadius: 14, padding: 12 },
    quoteText: { color: C.accent, fontSize: 13, fontStyle: 'italic', flex: 1, lineHeight: 18 },
    recordingBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger, marginRight: 6 },
    recordingBadgeText: { color: C.danger, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
    timerText: { color: C.text, fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    timerMax: { color: C.textMuted, fontSize: 14, fontWeight: 'normal' },
    progressTrack: { height: 6, backgroundColor: C.surfaceDeep, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    doneBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    doneBadgeText: { color: C.success, fontSize: 15, fontWeight: '600', marginLeft: 6 },
    doneDetail: { color: C.textMuted, fontSize: 13, marginBottom: 10 },
    reRecordBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.surfaceDeep },
    reRecordText: { color: C.text, fontSize: 13, marginLeft: 5 },
    addButton: {
        borderRadius: 20, overflow: 'hidden',
        shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
    },
    addButtonInner: { backgroundColor: C.accent, paddingVertical: 16, alignItems: 'center', borderRadius: 20, flexDirection: 'row', justifyContent: 'center' },
    addButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
