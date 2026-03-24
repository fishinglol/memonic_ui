import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';



export default function Settings() {
    const router = useRouter();

    const DeviceStatus = ({ icon, label, value, color }) => (
        <View style={styles.statusItem}>
            <Ionicons name={icon} size={28} color={color} />
            <Text style={styles.statusLabel}>{label}</Text>
            <Text style={styles.statusValue}>{value}</Text>
        </View>
    );

    const SettingItem = ({ icon, title, onPress }) => (
        <TouchableOpacity style={styles.item} onPress={onPress}>
            <View style={styles.itemIconCircle}>
                <Ionicons name={icon} size={20} color="#ffd33d" />
            </View>
            <Text style={styles.itemText}>{title}</Text>
            <Ionicons name="chevron-forward" size={18} color="#48484a" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Page Title */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            {/* Device Status Card */}
            <View style={styles.statusCard}>
                <DeviceStatus
                    icon="battery-charging"
                    label="Bracelet"
                    value="85%"
                    color="#4cd964"
                />
                <View style={styles.verticalDivider} />
                <DeviceStatus
                    icon="hardware-chip-outline"
                    label="Dock (CPU)"
                    value="Connected"
                    color="#ffd33d"
                />
            </View>

            {/* Main Settings Group */}
            <View style={styles.settingsGroup}>
                <SettingItem
                    icon="person-outline"
                    title="Account"
                    onPress={() => router.push('/account')}
                />
                <SettingItem
                    icon="people-circle-outline"
                    title="Member"
                    onPress={() => router.push('/member')}
                />
                <SettingItem icon="notifications-outline" title="Notifications" />
                <SettingItem icon="help-circle-outline" title="Help & Support" />
            </View>

            {/* Log Out Button */}
            <TouchableOpacity style={styles.logoutButton}>
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111417',
        paddingHorizontal: 20,
    },
    header: {
        marginTop: 130, // Adjusted for the top tab bar
        marginBottom: 25,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 42,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    statusCard: {
        backgroundColor: '#1c1c1e',
        borderRadius: 25,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 30,
        height: 120,
    },
    statusItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verticalDivider: {
        width: 1,
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusLabel: {
        color: '#8e8e93',
        fontSize: 13,
        marginTop: 8,
        fontFamily: 'Garamond-Regular',
    },
    statusValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'Garamond-Bold',
        marginTop: 2,
    },
    settingsGroup: {
        backgroundColor: '#1c1c1e',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 40,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    itemIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    itemText: {
        color: '#fff',
        fontSize: 19,
        fontFamily: 'Garamond-Regular',
        flex: 1,
    },
    logoutButton: {
        backgroundColor: '#2e1c1c',
        height: 55,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: {
        color: '#ff453a',
        fontSize: 19,
        fontWeight: '700',
    },
});
