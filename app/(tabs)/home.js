import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS } from '../../constants/theme';
import { AI_URL } from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Emotion → bar color
function emotionBarColor(emotion) {
    switch (emotion) {
        case 'Happy':   return '#34c759';
        case 'Sad':     return '#5e9ef4';
        case 'Angry':   return COLORS.danger;
        default:        return COLORS.accent;
    }
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

function getFormattedDate() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

export default function Home() {
    const router = useRouter();
    const [userName, setUserName] = useState('');

    // Today's summary state
    const [summary, setSummary] = useState('Loading your day...');
    const [summaryMeta, setSummaryMeta] = useState(null);   // { total_memories, speakers_seen, dominant_emotion, emoji, time_range }
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryUpdatedAt, setSummaryUpdatedAt] = useState(null);

    // Mood state
    const [moodData, setMoodData] = useState(null);

    // Voice records (preview)
    const [voiceRecords, setVoiceRecords] = useState([]);

    // Upcoming events
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(true);

    // AI tasks
    const [aiTasks, setAiTasks] = useState([]);

    // Re-record quick action
    const [reRecordStatus, setReRecordStatus] = useState('idle');

    // ── Load username ────────────────────────────────────────────
    useEffect(() => {
        AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
    }, []);

    // ── Fetch today-summary ──────────────────────────────────────
    const fetchSummary = useCallback(async (forceRefresh = false) => {
        setSummaryLoading(true);
        try {
            const url = `${AI_URL}/api/today-summary/fish${forceRefresh ? '?refresh=true' : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            setSummary(data.summary || 'Start talking to Memonic to see your daily recap.');
            setSummaryMeta({
                total_memories: data.total_memories ?? 0,
                speakers_seen: data.speakers_seen ?? [],
                dominant_emotion: data.dominant_emotion ?? 'Neutral',
                emoji: data.emoji ?? '😌',
                time_range: data.time_range ?? null,
            });
            setSummaryUpdatedAt(data.updated_at ?? null);
        } catch (e) {
            setSummary('Connect to Memonic Server to see your highlights.');
            setSummaryMeta(null);
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    // ── Fetch mood ───────────────────────────────────────────────
    const fetchMood = useCallback(async () => {
        try {
            const res = await fetch(`${AI_URL}/api/get-mood/fish`);
            const data = await res.json();
            setMoodData(data);
        } catch (e) { /* silent */ }
    }, []);

    // ── Fetch voice records preview ──────────────────────────────
    const fetchVoiceRecords = useCallback(async () => {
        try {
            const res = await fetch(`${AI_URL}/api/memories?limit=5`);
            const data = await res.json();
            setVoiceRecords(Array.isArray(data) ? data : data.memories || []);
        } catch (e) { /* silent */ }
    }, []);

    // ── Fetch AI tasks via home-data (ChromaDB) ──────────────────
    const fetchAiTasks = useCallback(async () => {
        try {
            const res = await fetch(`${AI_URL}/api/get-home-data/fish`);
            const data = await res.json();
            if (res.ok && !data.error) {
                setAiTasks((data.tasks || []).map((text, i) => ({ id: String(i + 1), text, done: false })));
            }
        } catch (e) { /* silent */ }
    }, []);

    // ── Initial load ─────────────────────────────────────────────
    useEffect(() => {
        fetchSummary();
        fetchMood();
        fetchVoiceRecords();
        fetchAiTasks();

        // Upcoming events
        const fetchEvents = async () => {
            try {
                const res = await fetch(`${AI_URL}/api/get-events/fish`);
                const data = await res.json();
                setUpcomingEvents(data.events || []);
            } catch (e) { /* silent */ }
            finally { setEventsLoading(false); }
        };
        fetchEvents();

        // Popup check every 10s
        const popupInterval = setInterval(async () => {
            try {
                const res = await fetch(`${AI_URL}/api/check-popup/fish`);
                const data = await res.json();
                if (data.has_popup) Alert.alert('Memonic', data.message);
            } catch (e) { /* silent */ }
        }, 10000);

        // Refresh summary + mood every 5 min
        const refreshInterval = setInterval(() => {
            fetchSummary();
            fetchMood();
            fetchVoiceRecords();
        }, 5 * 60 * 1000);

        return () => { clearInterval(popupInterval); clearInterval(refreshInterval); };
    }, []);

    // ── Quick re-record ──────────────────────────────────────────
    const handleReRecord = async () => {
        if (reRecordStatus === 'recording') return;
        setReRecordStatus('recording');
        try {
            const res = await fetch(`${AI_URL}/api/bracelet/record`, { method: 'POST' });
            if (res.ok) {
                setReRecordStatus('done');
                setTimeout(() => { setReRecordStatus('idle'); fetchVoiceRecords(); }, 6000);
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

    // ── Task toggle ──────────────────────────────────────────────
    const toggleTask = (id) => {
        setAiTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    const completedCount = aiTasks.filter(t => t.done).length;

    // ── Mood bar chart data ──────────────────────────────────────
    const moodBars = moodData?.hourly_moods?.length > 0
        ? moodData.hourly_moods
        : [];

    const updatedMinAgo = summaryUpdatedAt
        ? Math.max(0, Math.round((Date.now() / 1000 - summaryUpdatedAt) / 60))
        : null;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Greeting */}
                <View style={styles.greetingSection}>
                    <Text style={styles.greetingText}>{getGreeting()}{userName ? `, ${userName}` : ''}</Text>
                    <Text style={styles.dateText}>{getFormattedDate()}</Text>
                </View>

                {/* ── Today's Highlights (dynamic) ── */}
                <View style={styles.highlightCard}>
                    <View style={styles.highlightHeader}>
                        <View style={styles.highlightIconWrap}>
                            <Text style={{ fontSize: 16 }}>{summaryMeta?.emoji || '✨'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.highlightTitle}>Today's Summary</Text>
                        </View>
                        <TouchableOpacity onPress={() => fetchSummary(true)} style={styles.refreshBtn}>
                            <Ionicons name="refresh-outline" size={16} color={COLORS.accent} />
                        </TouchableOpacity>
                    </View>

                    {summaryLoading ? (
                        <ActivityIndicator size="small" color={COLORS.accent} style={{ marginVertical: 12 }} />
                    ) : (
                        <Text style={styles.highlightBody}>{summary}</Text>
                    )}

                    {/* Metadata row */}
                    {summaryMeta && summaryMeta.total_memories > 0 && (
                        <View style={styles.metaRow}>
                            <View style={styles.metaBadge}>
                                <Ionicons name="mic-outline" size={11} color={COLORS.accent} />
                                <Text style={styles.metaBadgeText}>{summaryMeta.total_memories} memories</Text>
                            </View>
                            {summaryMeta.speakers_seen?.length > 0 && (
                                <View style={styles.metaBadge}>
                                    <Ionicons name="people-outline" size={11} color={COLORS.accent} />
                                    <Text style={styles.metaBadgeText}>{summaryMeta.speakers_seen.join(', ')}</Text>
                                </View>
                            )}
                            {summaryMeta.time_range && (
                                <View style={styles.metaBadge}>
                                    <Ionicons name="time-outline" size={11} color={COLORS.accent} />
                                    <Text style={styles.metaBadgeText}>{summaryMeta.time_range}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.highlightMeta}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.highlightMetaText}>
                            {updatedMinAgo !== null
                                ? updatedMinAgo === 0 ? 'Just updated' : `Updated ${updatedMinAgo} min ago`
                                : 'Tap ↺ to generate'}
                        </Text>
                    </View>
                </View>

                {/* ── Voice Records preview ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Voice Records</Text>
                    <View style={styles.voiceHeaderActions}>
                        <TouchableOpacity
                            onPress={handleReRecord}
                            disabled={reRecordStatus === 'recording'}
                            style={styles.reRecordBtn}
                        >
                            <Ionicons
                                name={reRecordStatus === 'recording' ? 'radio-outline' : 'mic-outline'}
                                size={13}
                                color={reRecordStatus === 'recording' ? COLORS.danger : COLORS.accent}
                            />
                            <Text style={[
                                styles.reRecordText,
                                reRecordStatus === 'recording' && { color: COLORS.danger },
                                reRecordStatus === 'done' && { color: '#34c759' },
                                reRecordStatus === 'error' && { color: COLORS.danger },
                            ]}>
                                {reRecordStatus === 'recording' ? 'Recording…' :
                                    reRecordStatus === 'done' ? 'Done!' :
                                    reRecordStatus === 'error' ? 'Failed' : 'Re-record'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/Voice_History')}>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.voiceRecordsCard}>
                    {voiceRecords.length === 0 ? (
                        <View style={styles.voiceEmptyRow}>
                            <Ionicons name="mic-off-outline" size={16} color={COLORS.textMuted} />
                            <Text style={styles.voiceEmptyText}>No voice records yet.</Text>
                        </View>
                    ) : voiceRecords.map((item, idx) => {
                        const time = item.timestamp
                            ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--:--';
                        const speaker = (item.speaker && item.speaker !== 'Unknown' && item.speaker !== 'unknown')
                            ? item.speaker : 'Unknown';
                        return (
                            <View
                                key={item.id != null ? String(item.id) : String(idx)}
                                style={[styles.voiceRow, idx < voiceRecords.length - 1 && styles.voiceRowBorder]}
                            >
                                <Text style={styles.voiceTime}>{time}</Text>
                                <Text style={styles.voiceSpeaker}>{speaker}:</Text>
                                <Text style={styles.voiceTranscript} numberOfLines={1}>
                                    {item.transcript || '—'}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* ── Upcoming Events ── */}
                <View style={[styles.sectionHeader, { marginTop: 28 }]}>
                    <Text style={styles.sectionTitle}>Upcoming</Text>
                    <TouchableOpacity><Text style={styles.seeAllText}>See all</Text></TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingScroll}>
                    {eventsLoading ? (
                        [1, 2, 3].map(i => <View key={i} style={[styles.eventCard, styles.skeletonCard]} />)
                    ) : upcomingEvents.length === 0 ? (
                        <View style={styles.eventCard}>
                            <View style={styles.eventIconWrap}>
                                <Ionicons name="mic-outline" size={20} color={COLORS.icon} />
                            </View>
                            <Text style={styles.eventTitle}>Talk to Memonic</Text>
                            <Text style={styles.eventLocation}>to see your events</Text>
                        </View>
                    ) : (
                        upcomingEvents.map((event) => (
                            <View key={event.id} style={styles.eventCard}>
                                <View style={styles.eventIconWrap}>
                                    <Ionicons name={event.icon || 'calendar-outline'} size={20} color={COLORS.icon} />
                                </View>
                                <Text style={styles.eventTime}>{event.time}</Text>
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                <Text style={styles.eventLocation}>{event.location}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* ── Mood Timeline (real data) ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Mood Timeline</Text>
                    {moodData?.label && (
                        <Text style={styles.moodLabel}>{moodData.emoji} {moodData.label}</Text>
                    )}
                </View>
                <View style={styles.moodGraphContainer}>
                    <View style={styles.moodYAxis}>
                        <Text style={styles.moodYText}>Tense</Text>
                        <Text style={styles.moodYText}>Calm</Text>
                        <Text style={styles.moodYText}>Happy</Text>
                    </View>
                    <View style={styles.moodGraphArea}>
                        <View style={[styles.graphGuide, { top: '10%' }]} />
                        <View style={[styles.graphGuide, { top: '45%' }]} />
                        <View style={[styles.graphGuide, { top: '80%' }]} />
                        <View style={styles.barsRow}>
                            {moodBars.length > 0 ? (
                                moodBars.map((item, idx) => (
                                    <View key={idx} style={styles.barCol}>
                                        <View style={styles.barTrack}>
                                            <View style={[styles.barFill, {
                                                height: `${(item.val * 0.7 + 0.1) * 100}%`,
                                                backgroundColor: emotionBarColor(item.emotion),
                                            }]} />
                                        </View>
                                        <Text style={styles.moodXText}>{item.time}</Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.moodEmpty}>
                                    <Text style={styles.moodEmptyText}>
                                        {moodData ? 'No mood data today yet' : 'Connecting...'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* ── AI Tasks ── */}
                {aiTasks.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>AI Tasks</Text>
                            <Text style={styles.taskCount}>{completedCount}/{aiTasks.length}</Text>
                        </View>
                        <View style={styles.tasksCard}>
                            {aiTasks.map((task, index) => (
                                <TouchableOpacity
                                    key={task.id}
                                    style={[styles.taskRow, index < aiTasks.length - 1 && styles.taskRowBorder]}
                                    onPress={() => toggleTask(task.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
                                        {task.done && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                    <Text style={[styles.taskText, task.done && styles.taskTextDone]}>
                                        {task.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scrollContent: { paddingHorizontal: 24, paddingTop: 110, paddingBottom: 40 },

    greetingSection: { marginBottom: 28 },
    greetingText: { color: COLORS.text, fontSize: 30, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    dateText: { color: COLORS.textMuted, fontSize: 15, fontFamily: 'Garamond-Regular', marginTop: 4 },

    // ── Highlights ──
    highlightCard: {
        backgroundColor: COLORS.surface, borderRadius: 28, padding: 22,
        marginBottom: 28, ...SHADOWS.card,
    },
    highlightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    highlightIconWrap: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.small,
    },
    highlightTitle: { color: COLORS.text, fontSize: 18, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    refreshBtn: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
    },
    highlightBody: {
        color: COLORS.textMuted, fontSize: 15, fontFamily: 'Garamond-Regular', lineHeight: 22, marginBottom: 12,
    },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    metaBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.accentSoft, borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    metaBadgeText: { color: COLORS.accent, fontSize: 11, fontFamily: 'Garamond-Regular' },
    highlightMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    highlightMetaText: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Garamond-Regular' },

    // ── Section headers ──
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
    },
    sectionTitle: { color: COLORS.text, fontSize: 20, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    seeAllText: { color: COLORS.accent, fontSize: 14, fontFamily: 'Garamond-Regular' },

    // ── Voice records ──
    voiceHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    reRecordBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: COLORS.surfaceDeep, borderRadius: 12,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    reRecordText: { color: COLORS.accent, fontSize: 13, fontFamily: 'Garamond-Regular', fontWeight: '600' },
    voiceRecordsCard: { backgroundColor: COLORS.surface, borderRadius: 24, overflow: 'hidden', ...SHADOWS.card },
    voiceRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, gap: 6,
    },
    voiceRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
    voiceTime: { color: COLORS.accent, fontSize: 12, fontFamily: 'Garamond-Regular', fontWeight: '600', minWidth: 48 },
    voiceSpeaker: { color: COLORS.text, fontSize: 13, fontFamily: 'Garamond-Bold', fontWeight: '700', minWidth: 54 },
    voiceTranscript: { flex: 1, color: COLORS.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular', lineHeight: 18 },
    voiceEmptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 18, justifyContent: 'center' },
    voiceEmptyText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular' },

    // ── Upcoming events ──
    upcomingScroll: { paddingBottom: 4, marginBottom: 24 },
    eventCard: {
        backgroundColor: COLORS.surface, borderRadius: 24, padding: 20,
        width: SCREEN_WIDTH * 0.42, marginRight: 12, ...SHADOWS.card,
    },
    skeletonCard: { width: 130, height: 120, backgroundColor: COLORS.surfaceDeep, borderRadius: 24, marginRight: 12 },
    eventIconWrap: {
        width: 40, height: 40, borderRadius: 14,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginBottom: 12, ...SHADOWS.small,
    },
    eventTime: { color: COLORS.accent, fontSize: 13, fontFamily: 'Garamond-Bold', fontWeight: '600', marginBottom: 4 },
    eventTitle: { color: COLORS.text, fontSize: 16, fontFamily: 'Garamond-Bold', fontWeight: '600', marginBottom: 4 },
    eventLocation: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular' },

    // ── Mood timeline ──
    moodLabel: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular' },
    moodGraphContainer: { flexDirection: 'row', height: 160, marginBottom: 28, paddingRight: 10 },
    moodYAxis: { justifyContent: 'space-between', paddingVertical: 18, paddingRight: 10 },
    moodYText: { color: COLORS.textMuted, fontSize: 10, fontFamily: 'Garamond-Regular', textAlign: 'right' },
    moodGraphArea: { flex: 1, position: 'relative' },
    graphGuide: {
        position: 'absolute', left: 0, right: 0,
        borderTopWidth: 1, borderTopColor: COLORS.divider,
    },
    barsRow: {
        flex: 1, flexDirection: 'row', alignItems: 'flex-end',
        justifyContent: 'space-between', paddingBottom: 22,
    },
    barCol: { alignItems: 'center', flex: 1 },
    barTrack: { flex: 1, justifyContent: 'flex-end', width: 14, marginBottom: 8 },
    barFill: { width: '100%', borderRadius: 7 },
    moodXText: { color: COLORS.textMuted, fontSize: 10, fontFamily: 'Garamond-Regular', textAlign: 'center' },
    moodEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    moodEmptyText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular' },

    // ── AI Tasks ──
    taskCount: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular' },
    tasksCard: { backgroundColor: COLORS.surface, borderRadius: 24, overflow: 'hidden', ...SHADOWS.card },
    taskRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    taskRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
    checkbox: {
        width: 24, height: 24, borderRadius: 8,
        borderWidth: 1.5, borderColor: COLORS.textMuted,
        marginRight: 14, justifyContent: 'center', alignItems: 'center',
    },
    checkboxDone: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    taskText: { color: COLORS.text, fontSize: 15, fontFamily: 'Garamond-Regular', flex: 1, lineHeight: 20 },
    taskTextDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
});
