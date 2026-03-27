import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SHADOWS } from '../theme';
import { AI_URL } from '../config';

// Re-export theme values from the parent config
// (we import from ../app/theme via a small bridge)

export default function Settings() {
    const router = useRouter();

    // ── Live device status from ESP32 (via backend) ──
    const [bracelet, setBracelet] = useState('Checking…');
    const [dock, setDock]       = useState('Checking…');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${AI_URL}/device-status`);
                const data = await res.json();
                setBracelet(data.bracelet);
                setDock('Connected');    // If fetch succeeds, the dock (backend server) is reachable.
            } catch {
                setBracelet('Disconnected');
                setDock('Disconnected'); // If fetch fails, the dock (backend server) is offline.
            }
        };
        fetchStatus();                          // fetch immediately
        const interval = setInterval(fetchStatus, 5000);  // then every 5s
        return () => clearInterval(interval);   // cleanup
    }, []);

    const DeviceStatus = ({ icon, label, value }) => (
        <View style={styles.statusItem}>
            <View style={styles.statusIconWrap}>
                <Ionicons name={icon} size={24} color={COLORS.icon} />
            </View>
            <Text style={styles.statusLabel}>{label}</Text>
            <Text style={styles.statusValue}>{value}</Text>
        </View>
    );

    const SettingItem = ({ icon, title, onPress }) => (
        <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.itemIconCircle}>
                <Ionicons name={icon} size={20} color={COLORS.icon} />
            </View>
            <Text style={styles.itemText}>{title}</Text>
            <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            {/* Device Status Card — live from ESP32 */}
            <View style={styles.statusCard}>
                <DeviceStatus icon="watch-outline" label="Bracelet" value={bracelet} />
                <View style={styles.verticalDivider} />
                <DeviceStatus icon="hardware-chip-outline" label="Dock (CPU)" value={dock} />
            </View>

            {/* Settings Group */}
            <View style={styles.settingsGroup}>
                <SettingItem icon="person-outline" title="Account" onPress={() => router.push('/account')} />
                <View style={styles.rowDivider} />
                <SettingItem icon="people-circle-outline" title="Member" onPress={() => router.push('/member')} />
                <View style={styles.rowDivider} />
                <SettingItem icon="notifications-outline" title="Notifications" />
                <View style={styles.rowDivider} />
                <SettingItem icon="help-circle-outline" title="Help & Support" />
            </View>

            {/* Log Out */}
            <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.7}
                onPress={async () => {
                    await AsyncStorage.clear();
                    router.replace('/');
                }}
            >
                <Ionicons name="log-out-outline" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 24 },
    header: { marginTop: 130, marginBottom: 28 },
    headerTitle: {
        color: COLORS.text, fontSize: 36, fontFamily: 'Garamond-Bold', fontWeight: 'bold',
    },

    // ── Device Status ──
    statusCard: {
        backgroundColor: COLORS.surface, borderRadius: 28,
        paddingVertical: 24, flexDirection: 'row', alignItems: 'center',
        marginBottom: 28, ...SHADOWS.card,
    },
    statusItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statusIconWrap: {
        width: 48, height: 48, borderRadius: 18,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginBottom: 8, ...SHADOWS.small,
    },
    verticalDivider: {
        width: 1, height: '50%', backgroundColor: COLORS.divider,
    },
    statusLabel: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Garamond-Regular', marginTop: 4 },
    statusValue: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', fontFamily: 'Garamond-Bold', marginTop: 2 },

    // ── Settings Group ──
    settingsGroup: {
        backgroundColor: COLORS.surface, borderRadius: 24,
        overflow: 'hidden', marginBottom: 32, ...SHADOWS.card,
    },
    item: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 18, paddingHorizontal: 20,
    },
    itemIconCircle: {
        width: 40, height: 40, borderRadius: 14,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginRight: 16, ...SHADOWS.small,
    },
    itemText: { color: COLORS.text, fontSize: 17, fontFamily: 'Garamond-Regular', flex: 1 },
    chevronCircle: {
        width: 32, height: 32, borderRadius: 12,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
    },
    rowDivider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: 20 },

    // ── Log Out ──
    logoutButton: {
        backgroundColor: COLORS.dangerSoft, height: 56, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
        ...SHADOWS.card,
    },
    logoutText: { color: COLORS.danger, fontSize: 17, fontWeight: '700', fontFamily: 'Garamond-Bold' },
});
