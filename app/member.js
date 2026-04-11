import { Text, View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AddMemberSheet from '../components/sub_member';
import { AI_URL } from './config';
import { COLORS, SHADOWS } from './theme';

export default function Member() {
    const router = useRouter();
    const [sheetVisible, setSheetVisible] = useState(false);
    const [members, setMembers] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMembers = useCallback(async () => {
        try {
            const response = await fetch(`${AI_URL}/api/members_voice`);
            const data = await response.json();
            setMembers(data);
        } catch (error) {
            console.error("Error fetching members:", error);
        }
    }, []);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchMembers();
        setRefreshing(false);
    }, [fetchMembers]);

    const MemberRow = ({ icon, title, onPress, isAdd }) => (
        <TouchableOpacity
            style={[styles.memberRow, isAdd && styles.memberRowAccent]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconCircle, isAdd && styles.iconCircleAccent]}>
                <Ionicons name={icon} size={20} color={isAdd ? '#fff' : COLORS.icon} />
            </View>
            <Text style={[styles.memberRowText, isAdd && styles.memberRowTextBold]}>
                {title}
            </Text>
            <View style={styles.chevronCircle}>
                <Ionicons
                    name={isAdd ? "add" : "chevron-forward"}
                    size={isAdd ? 20 : 16}
                    color={COLORS.textMuted}
                />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} style={styles.pillButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.icon} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Members</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.pillButton}>
                    <Ionicons name="refresh-outline" size={20} color={COLORS.icon} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textMuted} />
                }
            >
                <View style={styles.countCard}>
                    <View style={styles.countIconWrap}>
                        <Ionicons name="people-outline" size={28} color={COLORS.icon} />
                    </View>
                    <View style={styles.countInfo}>
                        <Text style={styles.countNumber}>{members.length}</Text>
                        <Text style={styles.countLabel}>Registered Voices</Text>
                    </View>
                </View>

                <Text style={styles.sectionLabel}>VOICE PROFILES</Text>

                <View style={styles.card}>
                    {members.length > 0 ? (
                        members.map((member, index) => (
                            <View key={index}>
                                <MemberRow icon="person-circle-outline" title={member} />
                                {index < members.length - 1 && <View style={styles.rowDivider} />}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="mic-off-outline" size={36} color={COLORS.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>No voices yet</Text>
                            <Text style={styles.emptySubtitle}>Enroll your first member below</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.sectionLabel}>ACTIONS</Text>

                <View style={styles.card}>
                    <MemberRow
                        icon="person-add-outline"
                        title="Add Member"
                        isAdd={true}
                        onPress={() => setSheetVisible(true)}
                    />
                </View>

                <View style={styles.footerInfo}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.footerText}>Your next renewal is on April 6, 2026</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <AddMemberSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        marginTop: 60, paddingHorizontal: 24, paddingBottom: 8,
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
    scrollContent: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 },
    countCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surface, borderRadius: 28, padding: 24, marginBottom: 32,
        ...SHADOWS.card,
    },
    countIconWrap: {
        width: 56, height: 56, borderRadius: 20,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginRight: 20, ...SHADOWS.small,
    },
    countInfo: { flex: 1 },
    countNumber: { color: COLORS.text, fontSize: 36, fontFamily: 'Garamond-Bold', fontWeight: 'bold', lineHeight: 40 },
    countLabel: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular', marginTop: 2 },
    sectionLabel: {
        color: COLORS.textMuted, fontSize: 12, fontFamily: 'Garamond-Regular',
        textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14,
    },
    card: {
        backgroundColor: COLORS.surface, borderRadius: 24, overflow: 'hidden', marginBottom: 28,
        ...SHADOWS.card,
    },
    memberRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20,
    },
    memberRowAccent: {},
    iconCircle: {
        width: 40, height: 40, borderRadius: 14,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginRight: 16, ...SHADOWS.small,
    },
    iconCircleAccent: { backgroundColor: COLORS.accent, shadowColor: COLORS.accent, shadowOpacity: 0.3 },
    memberRowText: { flex: 1, color: COLORS.text, fontSize: 17, fontFamily: 'Garamond-Regular' },
    memberRowTextBold: { fontFamily: 'Garamond-Bold', fontWeight: '600' },
    chevronCircle: {
        width: 32, height: 32, borderRadius: 12,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
    },
    rowDivider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: 20 },
    emptyState: { paddingVertical: 48, alignItems: 'center' },
    emptyIconWrap: {
        width: 72, height: 72, borderRadius: 24,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginBottom: 16, ...SHADOWS.small,
    },
    emptyTitle: { color: COLORS.text, fontSize: 18, fontFamily: 'Garamond-Bold', fontWeight: '600', marginBottom: 6 },
    emptySubtitle: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular' },
    footerInfo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
    footerText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular', marginLeft: 6 },
});
