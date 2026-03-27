import {
    Text, View, StyleSheet, TouchableOpacity, Modal,
    Animated, Dimensions, TextInput, KeyboardAvoidingView,
    Platform, ScrollView, Alert
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { AI_URL } from '../app/config';

let Audio = null;
try { Audio = require('expo-av').Audio; } catch (e) {
    console.warn('expo-av native module not available.');
}

const C = {
    bg: '#2c3240', surface: '#323848', surfaceDeep: '#262c38',
    shadowDark: '#1e222c', text: '#e4e7ed', textMuted: '#8a92a6',
    icon: '#ffffff', accent: '#e8734a', accentSoft: 'rgba(232, 115, 74, 0.12)',
    danger: '#ff453a', dangerSoft: 'rgba(255, 69, 58, 0.10)',
    divider: 'rgba(255, 255, 255, 0.04)', success: '#34d399', successSoft: 'rgba(52, 211, 153, 0.10)',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;
const MIN_SECONDS = 5;
const MAX_SECONDS = 10;

export default function AddMemberSheet({ visible, onClose }) {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    const [memberName, setMemberName] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDone, setRecordingDone] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [enrolling, setEnrolling] = useState(false);

    const recordingRef = useRef(null);
    const timerRef = useRef(null);
    const recordingUriRef = useRef(null);

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }).start();
        } else { slideAnim.setValue(SHEET_HEIGHT); resetRecordingState(); }
    }, [visible]);

    useEffect(() => {
        if (isRecording) {
            const pulse = Animated.loop(Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ]));
            pulse.start();
            const glow = Animated.loop(Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
                Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
            ]));
            glow.start();
            return () => { pulse.stop(); glow.stop(); pulseAnim.setValue(1); glowAnim.setValue(0); };
        }
    }, [isRecording]);

    const resetRecordingState = () => {
        setIsRecording(false); setRecordingDone(false); setElapsed(0); setEnrolling(false);
        recordingUriRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleClose = () => {
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true })
            .start(() => onClose());
    };

    const startRecording = async () => {
        try {
            if (!Audio) { Alert.alert('Not Available', 'Voice recording requires a Development Build.'); return; }
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) { Alert.alert('Permission denied', 'Microphone access is required.'); return; }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            recordingRef.current = recording;
            setIsRecording(true); setRecordingDone(false); setElapsed(0);
            timerRef.current = setInterval(() => {
                setElapsed(prev => {
                    const next = prev + 1;
                    if (next >= MAX_SECONDS) { clearInterval(timerRef.current); stopRecording(); }
                    return next;
                });
            }, 1000);
        } catch (err) { Alert.alert('Error', 'Could not start recording.'); }
    };

    const stopRecording = async () => {
        try {
            if (timerRef.current) clearInterval(timerRef.current);
            if (!recordingRef.current) return;
            await recordingRef.current.stopAndUnloadAsync();
            recordingUriRef.current = recordingRef.current.getURI();
            recordingRef.current = null;
            setIsRecording(false); setRecordingDone(true);
        } catch (err) { console.error('Failed to stop recording:', err); }
    };

    const handleMicPress = () => { isRecording ? stopRecording() : startRecording(); };

    const handleAddMember = async () => {
        if (!memberName.trim()) { Alert.alert('Missing name', 'Please enter a member name.'); return; }
        if (!recordingDone || !recordingUriRef.current) { Alert.alert('No voice', 'Please record your voice first.'); return; }
        if (elapsed < MIN_SECONDS) { Alert.alert('Too short', `Please record at least ${MIN_SECONDS}s.`); return; }

        setEnrolling(true);
        try {
            let audioBase64;
            if (Platform.OS === 'web') {
                const res = await fetch(recordingUriRef.current);
                const blob = await res.blob();
                audioBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject; reader.readAsDataURL(blob);
                });
            } else {
                audioBase64 = await FileSystem.readAsStringAsync(recordingUriRef.current, { encoding: 'base64' });
            }
            const response = await fetch(`${AI_URL}/api/enroll`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: memberName.trim(), file_ext: '.m4a', audio_base64: audioBase64 }),
            });
            const data = await response.json();
            if (!response.ok) { Alert.alert('Failed', data.detail || 'Unknown error'); return; }
            Alert.alert('Success! 🎉', `${memberName} has been enrolled.`);
            resetRecordingState(); setMemberName(''); handleClose();
        } catch (err) { Alert.alert('Network error', 'Could not reach the server.'); }
        finally { setEnrolling(false); }
    };

    const timerColor = elapsed < MIN_SECONDS ? C.accent : C.success;
    const timerProgress = Math.min(elapsed / MAX_SECONDS, 1);
    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={18} color={C.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                        {/* Name */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="person-outline" size={16} color={C.icon} />
                                <Text style={styles.sectionLabel}>MEMBER NAME</Text>
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.sheetInput} placeholder="Enter member name"
                                    placeholderTextColor={C.textMuted} value={memberName} onChangeText={setMemberName} />
                            </View>
                        </View>

                        {/* Voice */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="mic-outline" size={16} color={C.icon} />
                                <Text style={styles.sectionLabel}>VOICE ENROLLMENT</Text>
                            </View>
                            <View style={styles.voiceContainer}>
                                <View style={styles.micArea}>
                                    {isRecording && (
                                        <Animated.View style={[styles.pulseRing, {
                                            transform: [{ scale: pulseAnim }],
                                            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.1] }),
                                        }]} />
                                    )}
                                    <TouchableOpacity
                                        style={[styles.voiceButton,
                                            isRecording && { backgroundColor: C.danger },
                                            recordingDone && { backgroundColor: C.success },
                                            !isRecording && !recordingDone && { backgroundColor: C.surfaceDeep },
                                        ]}
                                        onPress={handleMicPress} activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={isRecording ? 'stop' : recordingDone ? 'checkmark-circle' : 'mic'}
                                            size={isRecording ? 26 : recordingDone ? 30 : 28}
                                            color={isRecording || recordingDone ? '#fff' : C.icon}
                                        />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.voiceStatus}>
                                    {!isRecording && !recordingDone && (
                                        <View>
                                            <Text style={styles.voicePromptTitle}>Tap the mic to start</Text>
                                            <Text style={styles.voicePromptBody}>Read aloud:</Text>
                                            <View style={styles.quoteCard}>
                                                <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.accent} style={{ marginRight: 8, marginTop: 2 }} />
                                                <Text style={styles.quoteText}>"Hi one two three, I am so happy to see you"</Text>
                                            </View>
                                        </View>
                                    )}
                                    {isRecording && (
                                        <View>
                                            <View style={styles.recordingBadge}>
                                                <View style={styles.recordingDot} />
                                                <Text style={styles.recordingBadgeText}>Recording</Text>
                                            </View>
                                            <Text style={styles.timerText}>{formatTime(elapsed)}<Text style={styles.timerMax}> / {formatTime(MAX_SECONDS)}</Text></Text>
                                            <View style={styles.progressTrack}>
                                                <Animated.View style={[styles.progressFill, { width: `${timerProgress * 100}%`, backgroundColor: timerColor }]} />
                                                <View style={styles.progressMarker} />
                                            </View>
                                            <View style={styles.progressLabels}>
                                                <Text style={styles.progressLabelText}>0s</Text>
                                                <Text style={[styles.progressLabelText, elapsed >= MIN_SECONDS && { color: C.success }]}>{MIN_SECONDS}s min</Text>
                                                <Text style={styles.progressLabelText}>{MAX_SECONDS}s</Text>
                                            </View>
                                            {elapsed >= MIN_SECONDS && (
                                                <View style={styles.goodBadge}>
                                                    <Ionicons name="checkmark-circle" size={14} color={C.success} />
                                                    <Text style={styles.goodBadgeText}>Good length! Tap stop.</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                    {recordingDone && (
                                        <View>
                                            <View style={styles.doneBadge}>
                                                <Ionicons name="checkmark-circle" size={16} color={C.success} />
                                                <Text style={styles.doneBadgeText}>Voice Recorded</Text>
                                            </View>
                                            <Text style={styles.doneDetail}>Duration: {elapsed}s</Text>
                                            <TouchableOpacity style={styles.reRecordBtn} onPress={handleMicPress}>
                                                <Ionicons name="refresh" size={14} color={C.icon} />
                                                <Text style={styles.reRecordText}>Re-record</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity style={styles.historyItem} onPress={() => { handleClose(); router.push('/Voice_History'); }} activeOpacity={0.7}>
                            <View style={styles.historyIconWrap}>
                                <Ionicons name="time-outline" size={18} color={C.icon} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.historyTitle}>Search History</Text>
                                <Text style={styles.historySub}>Browse previous enrollments</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.addButton, enrolling && { opacity: 0.6 }]} onPress={handleAddMember} disabled={enrolling} activeOpacity={0.85}>
                            <View style={styles.addButtonInner}>
                                <Ionicons name={enrolling ? "sync" : "person-add"} size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.addButtonText}>{enrolling ? 'Enrolling...' : 'Add Member'}</Text>
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
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerIconWrap: {
        width: 40, height: 40, borderRadius: 14, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', marginRight: 14,
        shadowColor: C.accent, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
    },
    sheetTitle: { color: C.text, fontSize: 20, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    sheetSubtitle: { color: C.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular', marginTop: 1 },
    closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
    sectionCard: {
        backgroundColor: C.surface, borderRadius: 22, padding: 18, marginBottom: 16,
        shadowColor: C.shadowDark, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    sectionLabel: { color: C.textMuted, fontSize: 11, fontFamily: 'Garamond-Regular', textTransform: 'uppercase', letterSpacing: 1.2, marginLeft: 8 },
    inputBox: { backgroundColor: C.surfaceDeep, borderRadius: 16, overflow: 'hidden' },
    sheetInput: { padding: 15, color: C.text, fontSize: 16, fontFamily: 'Garamond-Regular' },

    voiceContainer: { flexDirection: 'row', alignItems: 'flex-start' },
    micArea: { position: 'relative', justifyContent: 'center', alignItems: 'center', width: 72, height: 72 },
    pulseRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: C.danger },
    voiceButton: { width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    voiceStatus: { flex: 1, marginLeft: 16, justifyContent: 'center' },
    voicePromptTitle: { color: C.text, fontSize: 15, fontFamily: 'Garamond-Bold', fontWeight: '600', marginBottom: 4 },
    voicePromptBody: { color: C.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular', marginBottom: 8 },
    quoteCard: { flexDirection: 'row', backgroundColor: C.accentSoft, borderRadius: 14, padding: 12 },
    quoteText: { color: C.accent, fontSize: 13, fontFamily: 'Garamond-Regular', fontStyle: 'italic', flex: 1, lineHeight: 18 },
    recordingBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger, marginRight: 6 },
    recordingBadgeText: { color: C.danger, fontSize: 13, fontFamily: 'Garamond-Bold', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
    timerText: { color: C.text, fontSize: 22, fontFamily: 'Garamond-Bold', fontWeight: 'bold', marginBottom: 10 },
    timerMax: { color: C.textMuted, fontSize: 14, fontWeight: 'normal' },
    progressTrack: { height: 6, backgroundColor: C.surfaceDeep, borderRadius: 3, overflow: 'hidden', position: 'relative' },
    progressFill: { height: '100%', borderRadius: 3 },
    progressMarker: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: C.textMuted },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    progressLabelText: { color: C.textMuted, fontSize: 10, fontFamily: 'Garamond-Regular' },
    goodBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: C.successSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
    goodBadgeText: { color: C.success, fontSize: 12, fontFamily: 'Garamond-Regular', marginLeft: 5 },
    doneBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    doneBadgeText: { color: C.success, fontSize: 15, fontFamily: 'Garamond-Bold', fontWeight: '600', marginLeft: 6 },
    doneDetail: { color: C.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular', marginBottom: 10 },
    reRecordBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.surfaceDeep },
    reRecordText: { color: C.text, fontSize: 13, fontFamily: 'Garamond-Regular', marginLeft: 5 },
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    dividerLine: { flex: 1, height: 1, backgroundColor: C.divider },
    dividerText: { color: C.textMuted, fontSize: 12, fontFamily: 'Garamond-Regular', letterSpacing: 1, marginHorizontal: 16 },
    historyItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 20,
        backgroundColor: C.surface, borderRadius: 18,
        shadowColor: C.shadowDark, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
    historyIconWrap: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.surfaceDeep, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    historyTitle: { color: C.text, fontSize: 16, fontFamily: 'Garamond-Bold', fontWeight: '600' },
    historySub: { color: C.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular', marginTop: 2 },
    addButton: {
        borderRadius: 20, overflow: 'hidden',
        shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
    },
    addButtonInner: { backgroundColor: C.accent, paddingVertical: 16, alignItems: 'center', borderRadius: 20, flexDirection: 'row', justifyContent: 'center' },
    addButtonText: { color: '#fff', fontSize: 17, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
});
