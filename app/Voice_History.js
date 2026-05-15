import { Text, View, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert, Animated } from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_URL } from '../constants/config';
import { COLORS, SHADOWS } from '../constants/theme';
import { useRelay } from '../context/RelayContext';

function emotionColor(emotion) {
    switch (emotion) {
        case 'Happy':   return { color: '#34c759' };
        case 'Sad':     return { color: '#5e9ef4' };
        case 'Angry':   return { color: COLORS.danger };
        default:        return { color: COLORS.textMuted };
    }
}

// Poll cadence
const POLL_LIVE_MS   = 2000;   // when streaming → poll fast
const POLL_IDLE_MS   = 8000;   // when idle → poll slow
const NEW_FLASH_MS   = 2500;   // duration to flash a new memory

export default function VoiceHistory() {
    const router = useRouter();
    const relay  = useRelay();

    const [memories, setMemories]           = useState([]);
    const [refreshing, setRefreshing]       = useState(false);
    const [loading, setLoading]             = useState(true);
    const [reRecordStatus, setReRecordStatus] = useState('idle');
    const [streaming, setStreaming]         = useState(false);   // live stream on/off
    const [newIds, setNewIds]               = useState(new Set());  // ids that just arrived

    // Refs for polling logic
    const knownIdsRef = useRef(new Set());
    const pollTimerRef = useRef(null);

    // ── Fetch ─────────────────────────────────────────────────
    const fetchMemories = async (silent = false) => {
        try {
            const userId = await AsyncStorage.getItem('user_id');
            let url = `${AI_URL}/api/memories?limit=50`;
            if (userId) url += `&user_id=${userId}`;
            const response = await fetch(url);
            if (!response.ok) return;
            const data = await response.json();
            const list = Array.isArray(data) ? data : data.memories || [];

            // Detect new memories (compare IDs)
            const fresh = new Set();
            for (const m of list) {
                if (m.id != null && !knownIdsRef.current.has(m.id)) {
                    fresh.add(m.id);
                }
            }

            // Update known IDs
            knownIdsRef.current = new Set(list.map(m => m.id).filter(x => x != null));

            // Only flash if we already loaded once (skip first load)
            if (!silent && fresh.size > 0 && memories.length > 0) {
                setNewIds(prev => {
                    const next = new Set(prev);
                    fresh.forEach(id => next.add(id));
                    return next;
                });
                // Auto-clear flash after a moment
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
    };

    // ── Polling loop ─────────────────────────────────────────
    useEffect(() => {
        fetchMemories(true); // first load (silent — don't flash)
        // (re-)start poll loop whenever streaming flag changes
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        const interval = streaming ? POLL_LIVE_MS : POLL_IDLE_MS;
        pollTimerRef.current = setInterval(() => fetchMemories(false), interval);
        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, [streaming]);

    // ── Pull-to-refresh ──────────────────────────────────────
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMemories(true);
    }, []);

    // ── Live stream toggle ───────────────────────────────────
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

    // ── 5s manual recording ──────────────────────────────────
    const handleReRecord = async () => {
        if (reRecordStatus === 'recording') return;
        setReRecordStatus('recording');
        try {
            const res = await fetch(`${AI_URL}/api/bracelet/record`, { method: 'POST' });
            if (res.ok) {
                setReRecordStatus('done');
                setTimeout(() => {
                    setReRecordStatus('idle');
                    fetchMemories(false);
                }, 6000);
            } else {
                setReRecordStatus('error');
                setTimeout(() => setReRecordStatus('idle'), 3000);
                Alert.alert('Re-record', 'Bracelet not connected or busy.');
            }
        } catch (e) {
            setReRecordStatus('error');
            setTimeout(() => setReRecordStatus('idle'), 3000);
            Alert.alert('Re-record', 'Could not reach the Memonic server.');
        }
    };

    // ── Render row ───────────────────────────────────────────
    const renderItem = ({ item }) => {
        const time = item.timestamp
            ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        const speaker = (item.speaker && item.speaker !== 'Unknown' && item.speaker !== 'unknown')
            ? item.speaker : 'Unknown';
        const emotion = item.emotion || 'Neutral';
        const isNew = newIds.has(item.id);

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
                </View>
                <Text style={styles.transcriptText}>{item.transcript || 'No transcript'}</Text>
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

                {/* Live stream toggle */}
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

            {/* Relay status banner — shows phone IP for ESP32 config */}
            <View style={styles.relayBanner}>
                <View style={[styles.relayDot, {
                    backgroundColor: (relay?.udpReady && relay?.wsReady) ? '#34c759' : COLORS.danger,
                }]} />
                <Text style={styles.relayText}>
                    Phone IP: {relay?.phoneIP || '—'}:{relay?.udpListenPort || 5005}  •
                    UDP {relay?.udpReady ? 'ON' : 'OFF'}  •
                    WSS {relay?.wsReady ? 'ON' : 'OFF'}
                    {relay?.esp32Addr ? `  •  ESP32: ${relay.esp32Addr.ip}` : '  •  no ESP32 yet'}
                </Text>
            </View>

            {/* Live stream banner */}
            {streaming && (
                <View style={styles.liveBanner}>
                    <View style={styles.liveBannerDot} />
                    <Text style={styles.liveBannerText}>
                        Streaming • new memories appear automatically
                    </Text>
                </View>
            )}

            {/* Re-record button (only when not streaming) */}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    header: {
        marginTop: 60, paddingHorizontal: 24, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    pillButton: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.button,
    },
    headerTitle: {
        flex: 1, color: COLORS.text, fontSize: 24,
        fontFamily: 'Garamond-Bold', fontWeight: 'bold', textAlign: 'center',
    },

    // Live stream toggle
    streamBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: COLORS.surface, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 10, ...SHADOWS.button,
    },
    streamBtnActive: { backgroundColor: COLORS.danger },
    liveDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: COLORS.textMuted,
    },
    liveDotActive: { backgroundColor: '#fff' },
    streamText: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },

    // Relay banner
    relayBanner: {
        marginHorizontal: 24, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 7,
        backgroundColor: COLORS.surfaceDeep || COLORS.surface, borderRadius: 10,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    relayDot: { width: 7, height: 7, borderRadius: 4 },
    relayText: { color: COLORS.textMuted, fontSize: 11, flex: 1 },

    // Live banner
    liveBanner: {
        marginHorizontal: 24, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 8,
        backgroundColor: 'rgba(255, 69, 58, 0.10)', borderRadius: 14,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    liveBannerDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger,
    },
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
        marginBottom: 10, ...SHADOWS.card,
        position: 'relative',
    },
    newCard: {
        borderWidth: 1.5,
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(232, 115, 74, 0.08)',
    },
    newBadge: {
        position: 'absolute', top: -7, right: 12,
        backgroundColor: COLORS.accent, paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 8,
    },
    newBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    timeText: {
        color: COLORS.accent, fontSize: 13, fontFamily: 'Garamond-Bold',
        fontWeight: '600', minWidth: 50,
    },
    speakerText: {
        color: COLORS.text, fontSize: 14, fontFamily: 'Garamond-Bold', fontWeight: '700',
    },
    emotionBadge: {
        marginLeft: 'auto', fontSize: 12, fontFamily: 'Garamond-Regular', fontWeight: '600',
    },
    transcriptText: {
        color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular', lineHeight: 20,
    },

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
