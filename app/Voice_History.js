import { Text, View, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';
import { COLORS, SHADOWS } from './theme';

export default function VoiceHistory() {
    const router = useRouter();

    const [memories, setMemories] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchMemories = async () => {
        try {
            const userId = await AsyncStorage.getItem('user_id');
            let url = `${API_URL}/api/memories`;
            if (userId) {
                url += `?user_id=${userId}`;
            }
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

    const renderItem = ({ item }) => (
        <View style={styles.historyCard}>
            <View style={styles.cardLeft}>
                <View style={styles.avatarCircle}>
                    <Ionicons name="mic" size={20} color={COLORS.icon} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={2}>{item.transcript || 'No transcript'}</Text>
                    <Text style={styles.cardDate}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now'} · {item.speaker || 'Unknown'}
                    </Text>
                </View>
            </View>
            <View style={[styles.statusBadge, styles.statusEnrolled]}>
                <Text style={[styles.statusText, styles.statusTextEnrolled]}>
                    {item.emotion || 'Neutral'}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.pillButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.icon} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Voice History</Text>
                <View style={{ width: 44 }} />
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
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        marginTop: 60, paddingHorizontal: 24, marginBottom: 20,
        flexDirection: 'row', alignItems: 'center',
    },
    pillButton: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.button,
    },
    headerTitle: {
        flex: 1, color: COLORS.text, fontSize: 28,
        fontFamily: 'Garamond-Bold', fontWeight: 'bold', textAlign: 'center',
    },
    listContent: { paddingHorizontal: 24, paddingBottom: 40 },

    historyCard: {
        backgroundColor: COLORS.surface, borderRadius: 22, padding: 18,
        marginBottom: 12, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', ...SHADOWS.card,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 16,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginRight: 14, ...SHADOWS.small,
    },
    cardInfo: { flex: 1 },
    cardName: { color: COLORS.text, fontSize: 17, fontFamily: 'Garamond-Bold', fontWeight: '600' },
    cardDate: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular', marginTop: 2 },

    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusEnrolled: { backgroundColor: 'rgba(52, 199, 89, 0.12)' },
    statusPending: { backgroundColor: COLORS.accentSoft },
    statusText: { fontSize: 13, fontFamily: 'Garamond-Regular', fontWeight: '600' },
    statusTextEnrolled: { color: '#34c759' },
    statusTextPending: { color: COLORS.accent },

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 28,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        marginBottom: 16, ...SHADOWS.card,
    },
    emptyTitle: { color: COLORS.text, fontSize: 20, fontFamily: 'Garamond-Bold', marginTop: 16 },
    emptySubtitle: { color: COLORS.textMuted, fontSize: 15, fontFamily: 'Garamond-Regular', marginTop: 6 },
});
