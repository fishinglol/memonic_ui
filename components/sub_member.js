import {
    Text, View, StyleSheet, TouchableOpacity, Modal,
    Animated, Dimensions, TextInput, KeyboardAvoidingView,
    Platform, ScrollView, Alert
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AI_URL } from '../app/config';
let Audio = null;
try {
    Audio = require('expo-av').Audio;
} catch (e) {
    console.warn('expo-av native module not available. Voice enrollment will not work in Expo Go.');
}


const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
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

    // ── pulse animation for recording ────────────────────────────
    useEffect(() => {
        if (isRecording) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.25,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();

            const glow = Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 700,
                        useNativeDriver: false,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0,
                        duration: 700,
                        useNativeDriver: false,
                    }),
                ])
            );
            glow.start();

            return () => {
                pulse.stop();
                glow.stop();
                pulseAnim.setValue(1);
                glowAnim.setValue(0);
            };
        }
    }, [isRecording]);

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

            timerRef.current = setInterval(async () => {
                setElapsed(prev => {
                    const next = prev + 1;
                    if (next >= MAX_SECONDS) {
                        clearInterval(timerRef.current);
                        stopRecording();
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
                type: 'audio/mp4',
            });

            const response = await fetch(`${AI_URL}/api/enroll`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: formData,
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
    const timerColor = elapsed < MIN_SECONDS ? '#ffd33d' : '#34d399';
    const timerProgress = Math.min(elapsed / MAX_SECONDS, 1);

    // ── format time display ──────────────────────────────────────
    const formatTime = (seconds) => {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

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
                    {/* Handle & Header */}
                    <View style={styles.handleBar} />

                    <View style={styles.sheetHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIconContainer}>
                                <LinearGradient
                                    colors={['#ffd33d', '#f7b733']}
                                    style={styles.headerIconGradient}
                                >
                                    <Ionicons name="person-add" size={18} color="#1e2124" />
                                </LinearGradient>
                            </View>
                            <View>
                                <Text style={styles.sheetTitle}>Add Member</Text>
                                <Text style={styles.sheetSubtitle}>Enroll a new voice profile</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Ionicons name="close" size={18} color="#8e8e93" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>

                        {/* ── Name Input Section ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="person-outline" size={16} color="#ffd33d" />
                                <Text style={styles.sectionLabel}>Member Name</Text>
                            </View>
                            <TextInput
                                style={styles.sheetInput}
                                placeholder="Enter member name"
                                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                                value={memberName}
                                onChangeText={setMemberName}
                            />
                        </View>

                        {/* ── Voice Enrollment Section ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="mic-outline" size={16} color="#ffd33d" />
                                <Text style={styles.sectionLabel}>Voice Enrollment</Text>
                            </View>

                            <View style={styles.voiceContainer}>
                                {/* Mic Button */}
                                <View style={styles.micArea}>
                                    {isRecording && (
                                        <Animated.View
                                            style={[
                                                styles.pulseRing,
                                                {
                                                    transform: [{ scale: pulseAnim }],
                                                    opacity: glowAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.4, 0.1],
                                                    }),
                                                },
                                            ]}
                                        />
                                    )}
                                    <TouchableOpacity
                                        style={[
                                            styles.voiceButton,
                                            isRecording && styles.voiceButtonRecording,
                                            recordingDone && styles.voiceButtonDone,
                                        ]}
                                        onPress={handleMicPress}
                                        activeOpacity={0.7}
                                    >
                                        <LinearGradient
                                            colors={
                                                isRecording
                                                    ? ['#ff3b30', '#ff6b5e']
                                                    : recordingDone
                                                        ? ['#34d399', '#059669']
                                                        : ['rgba(255, 211, 61, 0.15)', 'rgba(247, 183, 51, 0.08)']
                                            }
                                            style={styles.voiceGradient}
                                        >
                                            <Ionicons
                                                name={
                                                    isRecording ? 'stop'
                                                        : recordingDone ? 'checkmark-circle' : 'mic'
                                                }
                                                size={isRecording ? 26 : recordingDone ? 30 : 28}
                                                color={
                                                    isRecording ? '#fff'
                                                        : recordingDone ? '#fff' : '#ffd33d'
                                                }
                                            />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>

                                {/* Status Area */}
                                <View style={styles.voiceStatus}>
                                    {!isRecording && !recordingDone && (
                                        <View>
                                            <Text style={styles.voicePromptTitle}>
                                                Tap the mic to start
                                            </Text>
                                            <Text style={styles.voicePromptBody}>
                                                Read aloud:
                                            </Text>
                                            <View style={styles.quoteCard}>
                                                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#ffd33d" style={{ marginRight: 8, marginTop: 2 }} />
                                                <Text style={styles.quoteText}>
                                                    "Hi one two three, I am so happy to see you"
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {isRecording && (
                                        <View>
                                            <View style={styles.recordingBadge}>
                                                <View style={styles.recordingDot} />
                                                <Text style={styles.recordingBadgeText}>Recording</Text>
                                            </View>

                                            <Text style={styles.timerText}>
                                                {formatTime(elapsed)}
                                                <Text style={styles.timerMax}> / {formatTime(MAX_SECONDS)}</Text>
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
                                                <View style={styles.progressMarker} />
                                            </View>

                                            <View style={styles.progressLabels}>
                                                <Text style={styles.progressLabelText}>0s</Text>
                                                <Text style={[
                                                    styles.progressLabelText,
                                                    elapsed >= MIN_SECONDS && { color: '#34d399' }
                                                ]}>
                                                    {MIN_SECONDS}s min
                                                </Text>
                                                <Text style={styles.progressLabelText}>{MAX_SECONDS}s</Text>
                                            </View>

                                            {elapsed >= MIN_SECONDS && (
                                                <View style={styles.goodBadge}>
                                                    <Ionicons name="checkmark-circle" size={14} color="#34d399" />
                                                    <Text style={styles.goodBadgeText}>Good length! Tap stop when ready.</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {recordingDone && (
                                        <View>
                                            <View style={styles.doneBadge}>
                                                <Ionicons name="checkmark-circle" size={16} color="#34d399" />
                                                <Text style={styles.doneBadgeText}>Voice Recorded</Text>
                                            </View>
                                            <Text style={styles.doneDetail}>
                                                Duration: {elapsed}s
                                            </Text>
                                            <TouchableOpacity style={styles.reRecordBtn} onPress={handleMicPress}>
                                                <Ionicons name="refresh" size={14} color="#ffd33d" />
                                                <Text style={styles.reRecordText}>Re-record</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* ── Divider with OR ── */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* ── Search History ── */}
                        <TouchableOpacity
                            style={styles.historyItem}
                            onPress={() => {
                                handleClose();
                                router.push('/Voice_History');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.historyIconContainer}>
                                <Ionicons name="time-outline" size={18} color="#ffd33d" />
                            </View>
                            <View style={styles.historyTextContainer}>
                                <Text style={styles.historyItemTitle}>Search History</Text>
                                <Text style={styles.historyItemSub}>Browse previous voice enrollments</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>

                        {/* ── Add Button ── */}
                        <TouchableOpacity
                            style={[styles.addButton, enrolling && { opacity: 0.6 }]}
                            onPress={handleAddMember}
                            disabled={enrolling}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#ffd33d', '#f7b733']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.addButtonGradient}
                            >
                                {enrolling ? (
                                    <View style={styles.enrollingRow}>
                                        <Ionicons name="sync" size={18} color="#1e2124" style={{ marginRight: 8 }} />
                                        <Text style={styles.addButtonText}>Enrolling...</Text>
                                    </View>
                                ) : (
                                    <View style={styles.enrollingRow}>
                                        <Ionicons name="person-add" size={18} color="#1e2124" style={{ marginRight: 8 }} />
                                        <Text style={styles.addButtonText}>Add Member</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={{ height: 30 }} />
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_HEIGHT,
        backgroundColor: '#1a1d21',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 211, 61, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.5,
        shadowRadius: 25,
        elevation: 25,
    },
    handleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 18,
    },

    // ── Header ──
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconContainer: {
        marginRight: 14,
    },
    headerIconGradient: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetTitle: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    sheetSubtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
        marginTop: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetContent: {
        flex: 1,
    },

    // ── Section Card ──
    sectionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontFamily: 'Garamond-Regular',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginLeft: 8,
    },
    sheetInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 14,
        padding: 15,
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Garamond-Regular',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },

    // ── Voice Section ──
    voiceContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    micArea: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        width: 72,
        height: 72,
    },
    pulseRing: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#ff3b30',
    },
    voiceButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 211, 61, 0.25)',
    },
    voiceButtonRecording: {
        borderColor: 'rgba(255, 59, 48, 0.6)',
        borderWidth: 2,
    },
    voiceButtonDone: {
        borderColor: 'rgba(52, 211, 153, 0.5)',
        borderWidth: 1.5,
    },
    voiceGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voiceStatus: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },

    // ── Voice prompts ──
    voicePromptTitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
        marginBottom: 4,
    },
    voicePromptBody: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
        marginBottom: 8,
    },
    quoteCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 211, 61, 0.06)',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 211, 61, 0.12)',
    },
    quoteText: {
        color: '#ffd33d',
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
        fontStyle: 'italic',
        flex: 1,
        lineHeight: 18,
    },

    // ── Recording active ──
    recordingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff3b30',
        marginRight: 6,
    },
    recordingBadgeText: {
        color: '#ff6b5e',
        fontSize: 13,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    timerText: {
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    timerMax: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 14,
        fontWeight: 'normal',
    },
    progressTrack: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressMarker: {
        position: 'absolute',
        left: '50%',   // 5s out of 10s = 50%
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    progressLabelText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 10,
        fontFamily: 'Garamond-Regular',
    },
    goodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: 'rgba(52, 211, 153, 0.08)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    goodBadgeText: {
        color: '#34d399',
        fontSize: 12,
        fontFamily: 'Garamond-Regular',
        marginLeft: 5,
    },

    // ── Done state ──
    doneBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    doneBadgeText: {
        color: '#34d399',
        fontSize: 15,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
        marginLeft: 6,
    },
    doneDetail: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
        marginBottom: 10,
    },
    reRecordBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 211, 61, 0.2)',
        backgroundColor: 'rgba(255, 211, 61, 0.05)',
    },
    reRecordText: {
        color: '#ffd33d',
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
        marginLeft: 5,
    },

    // ── Divider ──
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    dividerText: {
        color: 'rgba(255, 255, 255, 0.25)',
        fontSize: 12,
        fontFamily: 'Garamond-Regular',
        letterSpacing: 1,
        marginHorizontal: 16,
    },

    // ── History ──
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    historyIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 211, 61, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    historyTextContainer: {
        flex: 1,
    },
    historyItemTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
    },
    historyItemSub: {
        color: 'rgba(255, 255, 255, 0.35)',
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
        marginTop: 2,
    },

    // ── Add Button ──
    addButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#ffd33d',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
    },
    addButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 16,
    },
    enrollingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#1e2124',
        fontSize: 17,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
});
