import { Text, View, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_URL } from '../constants/config';
import { COLORS, SHADOWS } from '../constants/theme';

function emotionColor(emotion) {
    switch (emotion) {
        case 'Happy':   return { color: '#34c759' };
        case 'Sad':     return { color: '#5e9ef4' };
        case 'Angry':   return { color: COLORS.danger };
        default:        return { color: COLORS.textMuted };
    }
}

export default function VoiceHistory() {
    const router = useRouter();

    const [memories, setMemories] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [reRecordStatus, setReRecordStatus] = useState('idle'); // idle | recording | done | error

    const fetchMemories = async () => {
        try {
            const userId = await AsyncStorage.getItem('user_id');
            let url = `${AI_URL}/api/memories?limit=50`;
            if (userId) url += `&user_id=${userId}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setMemories(Array.isArray(data) ? data : data.memories || []);
            }
        } catch (error) {
            console.error('Error fetching memories:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMemories();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMemories();
    }, []);

    const handleReRecord = async () => {
        if (reRecordStatus === 'recording') return;
        setReRecordStatus('recording');
        try {
            const res = await fetch(`${AI_URL}/api/bracelet/record`, { method: 'POST' });
            if (res.ok) {
                setReRecordStatus('done');
                setTimeout(() => {
                    setReRecordStatus('idle');
                    fetchMemories();
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

    const renderItem = ({ item }) => {
        const time = item.timestamp
            ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        const speaker = (item.speaker && item.speaker !== 'Unknown' && item.speaker !== 'unknown')
            ? item.speaker : 'Unknown';
        const emotion = item.emotion || 'Neutral';

        return (
            <View style={styles.historyCard}>
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
                    <Text style={styles.emptySubtitle}>Your recorded memories will appear here.</Text>
                    <TouchableOpacity
                        onPress={handleReRecord}
                        style={styles.emptyReRecordBtn}
                        disabled={reRecordStatus === 'recording'}
                    >
                        <Ionicons name="mic-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.emptyReRecordText}>Start Recording</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    header: {
        marginTop: 60, paddingHorizontal: 24, marginBottom: 20,
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
    },
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
        marginTop: 6, marginBottom: 24,
    },
    emptyReRecordBtn: {
        backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, ...SHADOWS.button,
    },
    emptyReRecordText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
