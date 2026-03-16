import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- AI Backend URL ---
const AI_BASE_URL = 'https://8000-01kkh2et3bdjymj2fjq6jabg8k.cloudspaces.litng.ai';



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
            // Using the live AI Backend URL
            const res = await fetch(`${AI_BASE_URL}/api/get-home-data/fish`);
            const data = await res.json();

            if (res.ok) {
                setHighlights(data.highlights);
                setAiTasks(data.tasks.map((text, i) => ({
                    id: String(i + 1),
                    text,
                    done: false // You might want to pull this from the backend later if tasks have a saved state
                })));
                setUpdatedAt(data.updated_at);
            }
        } catch (e) {
            console.error('Failed to fetch home data:', e);
            setHighlights('Connect to Memonic Server to see your highlights.');
        }
    };

    useEffect(() => {
        // Initial load
        fetchHomeData();

        // Fetch upcoming events
        const fetchEvents = async () => {
            try {
                const res = await fetch(`${AI_BASE_URL}/api/get-events/fish`);
                const data = await res.json();
                setUpcomingEvents(data.events || []);
            } catch (err) {
                console.error('Failed to fetch events:', err);
            } finally {
                setEventsLoading(false);
            }
        };
        fetchEvents();

        // Fetch mood data
        const fetchMood = async () => {
            try {
                const res = await fetch(`${AI_BASE_URL}/api/get-mood/fish`);
                const data = await res.json();
                setMoodData(data);
            } catch (err) {
                console.error('Failed to fetch mood:', err);
            }
        };
        fetchMood();

        // Popup polling every 10 seconds
        const popupInterval = setInterval(async () => {
            try {
                const res = await fetch(`${AI_BASE_URL}/api/check-popup/fish`);
                const data = await res.json();
                if (data.has_popup) {
                    Alert.alert('Memonic', data.message);
                }
            } catch (e) {
                // Silently fail if server is unreachable so it doesn't interrupt the UI
            }
        }, 10000);

        // Refresh home data every 5 minutes
        const homeInterval = setInterval(fetchHomeData, 5 * 60 * 1000);

        return () => {
            clearInterval(popupInterval);
            clearInterval(homeInterval);
        };
    }, []);

    // Upgraded task toggle: Updates UI instantly, then syncs to backend
    const toggleTask = async (id) => {
        // 1. Find the target task
        const targetTask = aiTasks.find(t => t.id === id);
        if (!targetTask) return;

        const newStatus = !targetTask.done;

        // 2. Optimistic UI Update (Update screen instantly so it feels fast)
        setAiTasks(prev =>
            prev.map(t => t.id === id ? { ...t, done: newStatus } : t)
        );

        // 3. Send update to your FastAPI backend
        try {
            // NOTE: Make sure you create this endpoint in your api.py file!
            await fetch(`${AI_BASE_URL}/api/update-task/fish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_id: id,
                    done: newStatus
                }),
            });
        } catch (error) {
            console.error('Failed to sync task status with Memonic:', error);
            // If the server fails, optionally revert the checkbox here
        }
    };

    const completedCount = aiTasks.filter(t => t.done).length;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Greeting Header ─── */}
                <View style={styles.greetingSection}>
                    <Text style={styles.greetingText}>{getGreeting()}, Fais</Text>
                    <Text style={styles.dateText}>{getFormattedDate()}</Text>
                </View>

                {/* ─── Today's Highlights ─── */}
                <View style={styles.highlightCard}>
                    <LinearGradient
                        colors={['rgba(255, 211, 61, 0.12)', 'rgba(255, 211, 61, 0.03)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.highlightGradient}
                    >
                        <View style={styles.highlightHeader}>
                            <Ionicons name="sparkles" size={18} color="#ffd33d" />
                            <Text style={styles.highlightTitle}>Today's Highlights</Text>
                        </View>
                        <Text style={styles.highlightBody}>
                            {highlights}
                        </Text>
                        <View style={styles.highlightMeta}>
                            <Ionicons name="time-outline" size={13} color="#8e8e93" />
                            <Text style={styles.highlightMetaText}>
                                {updatedAt
                                    ? `Updated ${Math.round((Date.now() / 1000 - updatedAt) / 60)} min ago`
                                    : 'Loading...'}
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* ─── Upcoming ─── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Upcoming</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAllText}>See all</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.upcomingScroll}
                >
                    {eventsLoading ? (
                        [1, 2, 3].map(i => (
                            <View key={i} style={[styles.eventCard, styles.skeletonCard]} />
                        ))
                    ) : upcomingEvents.length === 0 ? (
                        <View style={styles.eventCard}>
                            <Ionicons name="mic-outline" size={20} color="#ffd33d" />
                            <Text style={styles.eventTitle}>Talk to Memonic</Text>
                            <Text style={styles.eventLocation}>to see your events</Text>
                        </View>
                    ) : (
                        upcomingEvents.map((event) => (
                            <View key={event.id} style={styles.eventCard}>
                                <View style={styles.eventIconWrap}>
                                    <Ionicons name={event.icon} size={20} color="#ffd33d" />
                                </View>
                                <Text style={styles.eventTime}>{event.time}</Text>
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                <Text style={styles.eventLocation}>{event.location}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* ─── Mood & Energy ─── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Mood & Energy</Text>
                </View>
                <View style={styles.moodCard}>
                    <View style={styles.moodLeft}>
                        <View style={styles.moodEmojiWrap}>
                            <Text style={styles.moodEmoji}>
                                {moodData?.emoji ?? '😌'}
                            </Text>
                        </View>
                        <View style={styles.moodInfo}>
                            <Text style={styles.moodLabel}>
                                {moodData?.label ?? 'Loading...'}
                            </Text>
                            <Text style={styles.moodSub}>
                                {moodData?.sub ?? 'Analyzing your voice...'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.moodBarContainer}>
                        <View style={styles.moodBarTrack}>
                            <LinearGradient
                                colors={['#34c759', '#ffd33d', '#ff453a']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.moodBarFill}
                            />
                            <View style={[
                                styles.moodIndicator,
                                { left: `${(moodData?.indicator_position ?? 0.5) * 100}%` }
                            ]} />
                        </View>
                        <View style={styles.moodBarLabels}>
                            <Text style={styles.moodBarLabelText}>Calm</Text>
                            <Text style={styles.moodBarLabelText}>Neutral</Text>
                            <Text style={styles.moodBarLabelText}>Stressed</Text>
                        </View>
                    </View>
                </View>

                {/* ─── AI Tasks ─── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>AI Tasks</Text>
                    <Text style={styles.taskCount}>{completedCount}/{aiTasks.length}</Text>
                </View>
                <View style={styles.tasksCard}>
                    {aiTasks.map((task, index) => (
                        <TouchableOpacity
                            key={task.id}
                            style={[
                                styles.taskRow,
                                index < aiTasks.length - 1 && styles.taskRowBorder,
                            ]}
                            onPress={() => toggleTask(task.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
                                {task.done && <Ionicons name="checkmark" size={14} color="#25292e" />}
                            </View>
                            <Text style={[styles.taskText, task.done && styles.taskTextDone]}>
                                {task.text}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Bottom spacer for tab bar */}
                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
}

// ... Keep all your existing styles below this ...
const styles = StyleSheet.create({
    // ... (Your styles remain exactly the same)
    container: {
        flex: 1,
        backgroundColor: '#25292e',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 110,
        paddingBottom: 40,
    },

    // ─── Greeting ───
    greetingSection: {
        marginBottom: 28,
    },
    greetingText: {
        color: '#fff',
        fontSize: 30,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    dateText: {
        color: '#8e8e93',
        fontSize: 15,
        fontFamily: 'Garamond-Regular',
        marginTop: 4,
    },

    // ─── Highlights ───
    highlightCard: {
        borderRadius: 40,
        overflow: 'hidden',
        marginBottom: 28,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    highlightGradient: {
        padding: 20,
    },
    highlightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    highlightTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    highlightBody: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 15,
        fontFamily: 'Garamond-Regular',
        lineHeight: 22,
        marginBottom: 12,
    },
    highlightMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    highlightMetaText: {
        color: '#8e8e93',
        fontSize: 12,
        fontFamily: 'Garamond-Regular',
        marginLeft: 5,
    },

    // ─── Section Headers ───
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    seeAllText: {
        color: '#ffd33d',
        fontSize: 14,
        fontFamily: 'Garamond-Regular',
    },

    // ─── Upcoming Events ───
    upcomingScroll: {
        paddingBottom: 4,
        marginBottom: 24,
    },
    eventCard: {
        backgroundColor: '#1e2124',
        borderRadius: 40,
        padding: 20,
        width: SCREEN_WIDTH * 0.42,
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    eventIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 211, 61, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    eventTime: {
        color: '#ffd33d',
        fontSize: 13,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
        marginBottom: 4,
    },
    eventTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
        marginBottom: 4,
    },
    eventLocation: {
        color: '#8e8e93',
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
    },

    // ─── Mood ───
    moodCard: {
        backgroundColor: '#1e2124',
        borderRadius: 40,
        padding: 25,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    moodLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    moodEmojiWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 211, 61, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    moodEmoji: {
        fontSize: 26,
    },
    moodInfo: {},
    moodLabel: {
        color: '#fff',
        fontSize: 17,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
    },
    moodSub: {
        color: '#8e8e93',
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
        marginTop: 2,
    },
    moodBarContainer: {
        paddingHorizontal: 4,
    },
    moodBarTrack: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    moodBarFill: {
        flex: 1,
        borderRadius: 4,
    },
    moodIndicator: {
        position: 'absolute',
        top: -3,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#34c759',
    },
    moodBarLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    moodBarLabelText: {
        color: '#8e8e93',
        fontSize: 11,
        fontFamily: 'Garamond-Regular',
    },

    // ─── AI Tasks ───
    taskCount: {
        color: '#8e8e93',
        fontSize: 14,
        fontFamily: 'Garamond-Regular',
    },
    tasksCard: {
        backgroundColor: '#1e2124',
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    taskRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        marginRight: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxDone: {
        backgroundColor: '#ffd33d',
        borderColor: '#ffd33d',
    },
    taskText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Garamond-Regular',
        flex: 1,
        lineHeight: 20,
    },
    taskTextDone: {
        color: '#8e8e93',
        textDecorationLine: 'line-through',
    },
    skeletonCard: {
        width: 130,
        height: 120,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        marginRight: 12,
    },
});