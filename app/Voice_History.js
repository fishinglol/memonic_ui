import { Text, View, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
                    <Ionicons name="person" size={22} color="#ffd33d" />
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
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Voice History</Text>
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
                    <Ionicons name="mic-off-outline" size={64} color="rgba(255, 255, 255, 0.15)" />
                    <Text style={styles.emptyTitle}>No Voice History</Text>
                    <Text style={styles.emptySubtitle}>Voice enrollments will appear here.</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
    },
    header: {
        marginTop: 60,
        paddingHorizontal: 20,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 15,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 34,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    historyCard: {
        backgroundColor: '#1e2124',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 211, 61, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    cardInfo: {
        flex: 1,
    },
    cardName: {
        color: '#fff',
        fontSize: 17,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
    },
    cardDate: {
        color: '#8e8e93',
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statusEnrolled: {
        backgroundColor: 'rgba(52, 199, 89, 0.15)',
    },
    statusPending: {
        backgroundColor: 'rgba(255, 211, 61, 0.15)',
    },
    statusText: {
        fontSize: 13,
        fontFamily: 'Garamond-Regular',
        fontWeight: '600',
    },
    statusTextEnrolled: {
        color: '#34c759',
    },
    statusTextPending: {
        color: '#ffd33d',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 80,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Garamond-Bold',
        marginTop: 16,
    },
    emptySubtitle: {
        color: '#8e8e93',
        fontSize: 15,
        fontFamily: 'Garamond-Regular',
        marginTop: 6,
    },
});
