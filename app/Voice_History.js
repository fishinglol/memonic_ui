import {
    Text, View, StyleSheet, TouchableOpacity, FlatList, RefreshControl,
    ActivityIndicator, Alert, Animated
} from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { AI_URL } from '../constants/config';
import { COLORS, SHADOWS } from '../constants/theme';
import { useRelay } from '../context/RelayContext';
import AddMemberSheet from '../components/sub_member';

function emotionColor(emotion) {
    switch (emotion) {
        case 'Happy':   return { color: '#34c759' };
        case 'Sad':     return { color: '#5e9ef4' };
        case 'Angry':   return { color: COLORS.danger };
        default:        return { color: COLORS.textMuted };
    }
}

const POLL_LIVE_MS  = 1000;   // streaming → fast poll
const POLL_IDLE_MS  = 8000;   // idle → slow poll
const NEW_FLASH_MS  = 2500;

export default function VoiceHistory() {
    const router  = useRouter();
    const relay   = useRelay();

    const [memories, setMemories]             = useState([]);
    const [refreshing, setRefreshing]         = useState(false);
    const [loading, setLoading]               = useState(true);
    const [reRecordStatus, setReRecordStatus] = useState('idle');
    const [streaming, setStreaming]           = useState(false);
    const [newIds, setNewIds]                 = useState(new Set());
    const [enrollSheetVisible, setEnrollSheetVisible] = useState(false);

    // Audio playback state
    const [playingId, setPlayingId]       = useState(null);  // memory id currently playing
    const soundRef                         = useRef(null);

    const knownIdsRef  = useRef(new Set());
    const latestIdRef  = useRef(0);          // highest id seen (for after_id polling)
    const pollTimerRef = useRef(null);

    // ── Fetch memories ─────────────────────────────────────────────
    const fetchMemories = useCallback(async (silent = false) => {
        try {
            const userId = await AsyncStorage.getItem('user_id');
            let url = `${AI_URL}/api/memories?limit=50`;
            if (userId) url += `&user_id=${userId}`;
            const response = await fetch(url);
            if (!response.ok) return;
            const data = await response.json();
            const list = Array.isArray(data) ? data : data.memories || [];

            // Track new IDs for flash highlight
            const fresh = new Set();
            for (const m of list) {
                if (m.id != null && !knownIdsRef.current.has(m.id)) {
                    fresh.add(m.id);
                    if (m.id > latestIdRef.current) latestIdRef.current = m.id;
                }
            }
            knownIdsRef.current = new Set(list.map(m => m.id).filter(x => x != null));

            if (!silent && fresh.size > 0 && memories.length > 0) {
                setNewIds(prev => {
                    const next = new Set(prev);
                    fresh.forEach(id => next.add(id));
                    return next;
                });
                setTimeout(() => {
                    setNewIds(prev => {
                        const next = new Set(prev);
                        fresh.forEach(id => next.delete(id));
                        return next;
                    });
                }, NEW_FLASH_MS);
            }

            setMemories(list);
        } catch (error) {
            console.error('Error fetching memories:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [memories.length]);

    // ── Polling loop ──────────────────────────────────────────────
    useEffect(() => {
        fetchMemories(true);
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        const interval = streaming ? POLL_LIVE_MS : POLL_IDLE_MS;
        pollTimerRef.current = setInterval(() => fetchMemories(false), interval);
        return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
    }, [streaming]);

    // ── Pull-to-refresh ───────────────────────────────────────────
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMemories(true);
    }, []);

    // ── Live stream toggle ────────────────────────────────────────
    const toggleStream = async () => {
        const endpoint = streaming ? 'stop' : 'start';
        try {
            const res = await fetch(`${AI_URL}/api/bracelet/stream/${endpoint}`, { method: 'POST' });
            if (res.ok) {
                setStreaming(!streaming);
            } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Stream', err.detail || 'Bracelet not connected.');
            }
        } catch (e) {
            Alert.alert('Stream', 'Could not reach Memonic server.');
        }
    };

    // ── 5s manual recording ───────────────────────────────────────
    const handleReRecord = async () => {
        if (reRecordStatus === 'recording') return;
        setReRecordStatus('recording');
        try {
            const res = await fetch(`${AI_URL}/api/bracelet/record`, { method: 'POST' });
            if (res.ok) {
                setReRecordStatus('done');
                setTimeout(() => { setReRecordStatus('idle'); fetchMemories(false); }, 6000);
            } else {
                setReRecordStatus('error');
                setTimeout(() => setReRecordStatus('idle'), 3000);
                Alert.alert('Re-record', 'Bracelet not connected or busy.');
            }
        } catch (e) {
            setReRecordStatus('error');
            setTimeout(() => setReRecordStatus('idle'), 3000);
        }
    };

    // ── Audio playback ────────────────────────────────────────────
    const stopAudio = async () => {
        if (soundRef.current) {
            try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
            soundRef.current = null;
        }
        setPlayingId(null);
    };

    const handlePlayAudio = async (item) => {
        // If same item tapped — stop
        if (playingId === item.id) {
            await stopAudio();
            return;
        }
        // Stop any existing playback first
        await stopAudio();

        if (!item.audio_path) {
            Alert.alert('No audio', 'This memory has no saved audio file.');
            return;
        }

        try {
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
            const { sound } = await Audio.Sound.createAsync(
                { uri: `${AI_URL}/api/audio/${item.audio_path}` },
                { shouldPlay: true }
            );
            soundRef.current = sound;
            setPlayingId(item.id);
            sound.setOnPlaybackStatusUpdate(status => {
                if (status.didJustFinish) {
                    soundRef.current = null;
                    setPlayingId(null);
                }
            });
        } catch (e) {
            console.error('Audio play error:', e);
            Alert.alert('Playback Error', 'Could not play this audio file.');
            setPlayingId(null);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => { stopAudio(); };
    }, []);

    // ── Render row ────────────────────────────────────────────────
    const renderItem = ({ item }) => {
        const time = item.timestamp
            ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        const speaker = (item.speaker && item.speaker !== 'Unknown' && item.speaker !== 'unknown')
            ? item.speaker : 'Unknown';
        const emotion = item.emotion || 'Neutral';
        const isNew     = newIds.has(item.id);
        const isPlaying = playingId === item.id;

        return (
            <View style={[styles.historyCard, isNew && styles.newCard]}>
                {isNew && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                )}
                <View style={styles.rowTop}>
                    <Text style={styles.timeText}>{time}</Text>
                    <Text style={styles.speakerText}>{speaker}:</Text>
                    <Text style={[styles.emotionBadge, emotionColor(emotion)]}>{emotion}</Text>

                    {/* Play / Stop button */}
                    <TouchableOpacity
                        onPress={() => handlePlayAudio(item)}
                        style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                    >
                        <Ionicons
                            name={isPlaying ? 'stop' : 'play'}
                            size={13}
                            color={isPlaying ? '#fff' : COLORS.accent}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={styles.transcriptText}>{item.transcript || 'No transcript'}</Text>

                {/* Mini playing indicator */}
                {isPlaying && (
                    <View style={styles.playingBadge}>
                        <View style={styles.playingDot} />
                        <Text style={styles.playingText}>Playing…</Text>
                    </View>
                )}
            </View>
        );
    };

    const reRecordLabel = reRecordStatus === 'recording' ? 'Recording…'
        : reRecordStatus === 'done' ? 'Done!'
        : reRecordStatus === 'error' ? 'Failed'
        : 'Re-record';

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.pillButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.icon} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Voice History</Text>

                {/* Enroll button */}
                <TouchableOpacity
                    onPress={() => setEnrollSheetVisible(true)}
                    style={styles.enrollBtn}
                >
                    <Ionicons name="person-add-outline" size={16} color={COLORS.accent} />
                    <Text style={styles.enrollText}>Enroll</Text>
                </TouchableOpacity>

                {/* Live toggle */}
                <TouchableOpacity
                    onPress={toggleStream}
                    style={[styles.streamBtn, streaming && styles.streamBtnActive]}
                >
                    <View style={[styles.liveDot, streaming && styles.liveDotActive]} />
                    <Text style={[styles.streamText, streaming && { color: '#fff' }]}>
                        {streaming ? 'LIVE' : 'Live'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Relay status */}
            <View style={styles.relayBanner}>
                <View style={[styles.relayDot, {
                    backgroundColor: (relay?.udpReady && relay?.wsReady) ? '#34c759' : COLORS.danger,
                }]} />
                <Text style={styles.relayText}>
                    Phone IP: {relay?.phoneIP || '—'}:{relay?.udpListenPort || 5005}  •
                    UDP {relay?.udpReady ? 'ON' : 'OFF'}  •
                    WSS {relay?.wsReady ? 'ON' : 'OFF'}
                    {relay?.esp32Addr ? `  •  ESP32: ${relay.esp32Addr.ip}` : '  •  no ESP32'}
                </Text>
            </View>

            {/* Live banner */}
            {streaming && (
                <View style={styles.liveBanner}>
                    <View style={styles.liveBannerDot} />
                    <Text style={styles.liveBannerText}>Streaming • new memories appear automatically</Text>
                </View>
            )}

            {/* Re-record (idle mode) */}
            {!streaming && (
                <View style={styles.subHeader}>
                    <TouchableOpacity
                        onPress={handleReRecord}
                        disabled={reRecordStatus === 'recording'}
                        style={styles.reRecordBtn}
                    >
                        <Ionicons
                            name={reRecordStatus === 'recording' ? 'radio-outline' : 'mic-outline'}
                            size={16}
                            color={reRecordStatus === 'recording' ? COLORS.danger : COLORS.accent}
                        />
                        <Text style={[
                            styles.reRecordText,
                            reRecordStatus === 'recording' && { color: COLORS.danger },
                            reRecordStatus === 'done' && { color: '#34c759' },
                            reRecordStatus === 'error' && { color: COLORS.danger },
                        ]}>{reRecordLabel}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            ) : memories.length > 0 ? (
                <FlatList
                    data={memories}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
                    }
                />
            ) : (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="mic-off-outline" size={48} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No Memories</Text>
                    <Text style={styles.emptySubtitle}>
                        {streaming
                            ? 'Listening… speak to create your first memory.'
                            : 'Tap LIVE to start, or use Re-record for a single clip.'}
                    </Text>
                    {!streaming && (
                        <TouchableOpacity
                            onPress={handleReRecord}
                            style={styles.emptyReRecordBtn}
                            disabled={reRecordStatus === 'recording'}
                        >
                            <Ionicons name="mic-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.emptyReRecordText}>Start Recording</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Enroll sheet */}
            <AddMemberSheet
                visible={enrollSheetVisible}
                onClose={() => setEnrollSheetVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    header: {
        marginTop: 60, paddingHorizontal: 24, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    pillButton: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.button,
    },
    headerTitle: {
        flex: 1, color: COLORS.text, fontSize: 22,
        fontFamily: 'Garamond-Bold', fontWeight: 'bold',
    },
    enrollBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: COLORS.accentSoft, borderRadius: 16,
        paddingHorizontal: 12, paddingVertical: 8,
    },
    enrollText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },

    streamBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: COLORS.surface, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 10, ...SHADOWS.button,
    },
    streamBtnActive: { backgroundColor: COLORS.danger },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },
    liveDotActive: { backgroundColor: '#fff' },
    streamText: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },

    relayBanner: {
        marginHorizontal: 24, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 7,
        backgroundColor: COLORS.surfaceDeep, borderRadius: 10,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    relayDot: { width: 7, height: 7, borderRadius: 4 },
    relayText: { color: COLORS.textMuted, fontSize: 11, flex: 1 },

    liveBanner: {
        marginHorizontal: 24, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 8,
        backgroundColor: 'rgba(255, 69, 58, 0.10)', borderRadius: 14,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    liveBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger },
    liveBannerText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },

    subHeader: { paddingHorizontal: 24, marginBottom: 12, alignItems: 'flex-end' },
    reRecordBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: COLORS.surface, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 10, ...SHADOWS.button,
    },
    reRecordText: { color: COLORS.accent, fontSize: 13, fontFamily: 'Garamond-Regular', fontWeight: '600' },

    listContent: { paddingHorizontal: 24, paddingBottom: 40 },

    historyCard: {
        backgroundColor: COLORS.surface, borderRadius: 20, padding: 16,
        marginBottom: 10, ...SHADOWS.card, position: 'relative',
    },
    newCard: {
        borderWidth: 1.5, borderColor: COLORS.accent,
        backgroundColor: 'rgba(232, 115, 74, 0.08)',
    },
    newBadge: {
        position: 'absolute', top: -7, right: 12,
        backgroundColor: COLORS.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    },
    newBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    timeText: { color: COLORS.accent, fontSize: 13, fontFamily: 'Garamond-Bold', fontWeight: '600', minWidth: 50 },
    speakerText: { color: COLORS.text, fontSize: 14, fontFamily: 'Garamond-Bold', fontWeight: '700' },
    emotionBadge: { fontSize: 12, fontFamily: 'Garamond-Regular', fontWeight: '600' },

    playBtn: {
        marginLeft: 'auto', width: 28, height: 28, borderRadius: 9,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
    },
    playBtnActive: { backgroundColor: COLORS.accent },

    transcriptText: {
        color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular', lineHeight: 20,
    },
    playingBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8,
    },
    playingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
    playingText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 28,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        marginBottom: 16, ...SHADOWS.card,
    },
    emptyTitle: { color: COLORS.text, fontSize: 20, fontFamily: 'Garamond-Bold', marginTop: 16 },
    emptySubtitle: {
        color: COLORS.textMuted, fontSize: 15, fontFamily: 'Garamond-Regular',
        marginTop: 6, marginBottom: 24, textAlign: 'center', paddingHorizontal: 30,
    },
    emptyReRecordBtn: {
        backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, ...SHADOWS.button,
    },
    emptyReRecordText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
