import { Text, View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS } from './theme';

// Placeholder data — replace with real data later
const VOICE_HISTORY = [
    { id: '1', name: 'John', date: 'Mar 5, 2026', duration: '0:32', status: 'Enrolled' },
    { id: '2', name: 'Sarah', date: 'Mar 4, 2026', duration: '0:28', status: 'Enrolled' },
    { id: '3', name: 'Mike', date: 'Mar 3, 2026', duration: '0:45', status: 'Pending' },
];

export default function VoiceHistory() {
    const router = useRouter();

    const renderItem = ({ item }) => (
        <View style={styles.historyCard}>
            <View style={styles.cardLeft}>
                <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={20} color={COLORS.icon} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardDate}>{item.date} · {item.duration}</Text>
                </View>
            </View>
            <View style={[
                styles.statusBadge,
                item.status === 'Enrolled' ? styles.statusEnrolled : styles.statusPending,
            ]}>
                <Text style={[
                    styles.statusText,
                    item.status === 'Enrolled' ? styles.statusTextEnrolled : styles.statusTextPending,
                ]}>{item.status}</Text>
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

            {VOICE_HISTORY.length > 0 ? (
                <FlatList
                    data={VOICE_HISTORY}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="mic-off-outline" size={48} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No Voice History</Text>
                    <Text style={styles.emptySubtitle}>Voice enrollments will appear here.</Text>
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
