import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AI_BASE_URL = 'https://8000-01kkh2et3bdjymj2fjq6jabg8k.cloudspaces.litng.ai';

const MOCK_MOOD_HISTORY = [
    { time: '9a', val: 0.2 },
    { time: '11a', val: 0.5 },
    { time: '1p', val: 0.8 },
    { time: '3p', val: 0.9 }, // stress
    { time: '5p', val: 0.6 },
    { time: 'Now', val: 0.3 }, // sad
];

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
    const [highlights, setHighlights] = useState('Loading...');
    const [aiTasks, setAiTasks] = useState([]);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [moodData, setMoodData] = useState(null);

    const fetchHomeData = async () => {
        try {
            const res = await fetch(`${AI_BASE_URL}/api/get-home-data/fish`);
            const data = await res.json();
            if (res.ok) {
                setHighlights(data.highlights);
                setAiTasks(data.tasks.map((text, i) => ({ id: String(i + 1), text, done: false })));
                setUpdatedAt(data.updated_at);
            }
        } catch (e) {
            console.error('Failed to fetch home data:', e);
            setHighlights('Connect to Memonic Server to see your highlights.');
        }
    };

    useEffect(() => {
        fetchHomeData();

        const fetchEvents = async () => {
            try {
                const res = await fetch(`${AI_BASE_URL}/api/get-events/fish`);
                const data = await res.json();
                setUpcomingEvents(data.events || []);
            } catch (err) { console.error('Failed to fetch events:', err); }
            finally { setEventsLoading(false); }
        };
        fetchEvents();

        const fetchMood = async () => {
            try {
                const res = await fetch(`${AI_BASE_URL}/api/get-mood/fish`);
                const data = await res.json();
                setMoodData(data);
            } catch (err) { console.error('Failed to fetch mood:', err); }
        };
        fetchMood();

        const popupInterval = setInterval(async () => {
            try {
                const res = await fetch(`${AI_BASE_URL}/api/check-popup/fish`);
                const data = await res.json();
                if (data.has_popup) Alert.alert('Memonic', data.message);
            } catch (e) { /* silent */ }
        }, 10000);

        const homeInterval = setInterval(fetchHomeData, 5 * 60 * 1000);
        return () => { clearInterval(popupInterval); clearInterval(homeInterval); };
    }, []);

    const toggleTask = async (id) => {
        const targetTask = aiTasks.find(t => t.id === id);
        if (!targetTask) return;
        const newStatus = !targetTask.done;
        setAiTasks(prev => prev.map(t => t.id === id ? { ...t, done: newStatus } : t));
        try {
            await fetch(`${AI_BASE_URL}/api/update-task/fish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: id, done: newStatus }),
            });
        } catch (error) { console.error('Failed to sync task status:', error); }
    };

    const completedCount = aiTasks.filter(t => t.done).length;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Greeting */}
                <View style={styles.greetingSection}>
                    <Text style={styles.greetingText}>{getGreeting()}, Fais</Text>
                    <Text style={styles.dateText}>{getFormattedDate()}</Text>
                </View>

                {/* Highlights */}
                <View style={styles.highlightCard}>
                    <View style={styles.highlightHeader}>
                        <View style={styles.highlightIconWrap}>
                            <Ionicons name="sparkles" size={18} color={COLORS.icon} />
                        </View>
                        <Text style={styles.highlightTitle}>Today's Highlights</Text>
                    </View>
                    <Text style={styles.highlightBody}>{highlights}</Text>
                    <View style={styles.highlightMeta}>
                        <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                        <Text style={styles.highlightMetaText}>
                            {updatedAt
                                ? `Updated ${Math.round((Date.now() / 1000 - updatedAt) / 60)} min ago`
                                : 'Loading...'}
                        </Text>
                    </View>
                </View>

                {/* Upcoming */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Upcoming</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAllText}>See all</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingScroll}>
                    {eventsLoading ? (
                        [1, 2, 3].map(i => (
                            <View key={i} style={[styles.eventCard, styles.skeletonCard]} />
                        ))
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
                                    <Ionicons name={event.icon} size={20} color={COLORS.icon} />
                                </View>
                                <Text style={styles.eventTime}>{event.time}</Text>
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                <Text style={styles.eventLocation}>{event.location}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* Mood & Energy */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Mood Timeline</Text>
                </View>
                <View style={styles.moodGraphContainer}>
                    <View style={styles.moodYAxis}>
                        <Text style={styles.moodYText}>Stress</Text>
                        <Text style={styles.moodYText}>Valid</Text>
                        <Text style={styles.moodYText}>Sad</Text>
                    </View>
                    <View style={styles.moodGraphArea}>
                        {/* Horizontal guide lines */}
                        <View style={[styles.graphGuide, { top: '10%' }]} />
                        <View style={[styles.graphGuide, { top: '45%' }]} />
                        <View style={[styles.graphGuide, { top: '80%' }]} />
                        
                        <View style={styles.barsRow}>
                            {MOCK_MOOD_HISTORY.map((item, idx) => {
                                let color = COLORS.accent;
                                if (item.val >= 0.8) color = COLORS.danger;
                                else if (item.val <= 0.3) color = COLORS.textMuted;
                                
                                return (
                                    <View key={idx} style={styles.barCol}>
                                        <View style={styles.barTrack}>
                                            <View style={[styles.barFill, { height: `${(item.val * 0.7 + 0.1) * 100}%`, backgroundColor: color }]} />
                                        </View>
                                        <Text style={styles.moodXText}>{item.time}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* AI Tasks */}
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

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scrollContent: { paddingHorizontal: 24, paddingTop: 110, paddingBottom: 40 },

    // ── Greeting ──
    greetingSection: { marginBottom: 28 },
    greetingText: { color: COLORS.text, fontSize: 30, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    dateText: { color: COLORS.textMuted, fontSize: 15, fontFamily: 'Garamond-Regular', marginTop: 4 },

    // ── Highlights ──
    highlightCard: {
        backgroundColor: COLORS.surface, borderRadius: 28, padding: 22,
        marginBottom: 28, ...SHADOWS.card,
    },
    highlightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    highlightIconWrap: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginRight: 10, ...SHADOWS.small,
    },
    highlightTitle: { color: COLORS.text, fontSize: 18, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    highlightBody: {
        color: COLORS.textMuted, fontSize: 15, fontFamily: 'Garamond-Regular', lineHeight: 22, marginBottom: 12,
    },
    highlightMeta: { flexDirection: 'row', alignItems: 'center' },
    highlightMetaText: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Garamond-Regular', marginLeft: 5 },

    // ── Section Headers ──
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
    },
    sectionTitle: { color: COLORS.text, fontSize: 20, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    seeAllText: { color: COLORS.accent, fontSize: 14, fontFamily: 'Garamond-Regular' },

    // ── Upcoming Events ──
    upcomingScroll: { paddingBottom: 4, marginBottom: 24 },
    eventCard: {
        backgroundColor: COLORS.surface, borderRadius: 24, padding: 20,
        width: SCREEN_WIDTH * 0.42, marginRight: 12, ...SHADOWS.card,
    },
    eventIconWrap: {
        width: 40, height: 40, borderRadius: 14,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginBottom: 12, ...SHADOWS.small,
    },
    eventTime: { color: COLORS.accent, fontSize: 13, fontFamily: 'Garamond-Bold', fontWeight: '600', marginBottom: 4 },
    eventTitle: { color: COLORS.text, fontSize: 16, fontFamily: 'Garamond-Bold', fontWeight: '600', marginBottom: 4 },
    eventLocation: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular' },

    // ── Mood Graph ──
    moodGraphContainer: {
        flexDirection: 'row', height: 160, marginBottom: 28, paddingRight: 10,
    },
    moodYAxis: {
        justifyContent: 'space-between', paddingVertical: 18, paddingRight: 10,
    },
    moodYText: {
        color: COLORS.textMuted, fontSize: 10, fontFamily: 'Garamond-Regular', textAlign: 'right',
    },
    moodGraphArea: {
        flex: 1, position: 'relative',
    },
    graphGuide: {
        position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderTopColor: COLORS.divider, borderStyle: 'solid',
    },
    barsRow: {
        flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 22,
    },
    barCol: { alignItems: 'center', width: 28 },
    barTrack: { flex: 1, justifyContent: 'flex-end', width: 14, marginBottom: 8 },
    barFill: { width: '100%', borderRadius: 7 },
    moodXText: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'Garamond-Regular', textAlign: 'center' },

    // ── Tasks ──
    taskCount: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular' },
    tasksCard: {
        backgroundColor: COLORS.surface, borderRadius: 24, overflow: 'hidden',
        ...SHADOWS.card,
    },
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
    skeletonCard: {
        width: 130, height: 120, backgroundColor: COLORS.surfaceDeep, borderRadius: 24, marginRight: 12,
    },
});