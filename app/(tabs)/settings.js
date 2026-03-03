import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function Settings() {
    const SettingItem = ({ icon, title }) => (
        <TouchableOpacity style={styles.item}>
            <Ionicons name={icon} size={22} color="#ffd33d" style={{ marginRight: 15 }} />
            <Text style={styles.itemText}>{title}</Text>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <View style={styles.statusCard}>
                {/* ส่วนแสดง Battery */}
                <View style={styles.statusItem}>
                    <Ionicons name="battery-charging" size={24} color="#4cd964" />
                    <Text style={styles.statusLabel}>Bracelet</Text>
                    <Text style={styles.statusValue}>85%</Text>
                </View>

                {/* เส้นคั่นกลางจางๆ */}
                <View style={styles.divider} />

                {/* ส่วนแสดง CPU/Dock Connection */}
                <View style={styles.statusItem}>
                    <Ionicons name="hardware-chip-outline" size={24} color="#ffd33d" />
                    <Text style={styles.statusLabel}>Dock (CPU)</Text>
                    <Text style={styles.statusValue}>Connected</Text>
                </View>
            </View>

            <View style={styles.section}>
                <SettingItem icon="person-outline" title="Account" />
                <SettingItem icon="notifications-outline" title="Notifications" />
                <SettingItem icon="lock-closed-outline" title="Privacy" />
                <SettingItem icon="help-circle-outline" title="Help & Support" />
            </View>

            <TouchableOpacity style={styles.logoutButton}>
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
        paddingHorizontal: 20,
    },
    header: {
        marginTop: 60,
        marginBottom: 30,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 34,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: '#1e2124',
        borderRadius: 20,
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2c2f33',
    },
    itemText: {
        color: '#fff',
        fontSize: 17,
        fontFamily: 'Garamond-Regular',
    },
    logoutButton: {
        marginTop: 40,
        backgroundColor: 'rgba(255, 69, 58, 0.1)',
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
    },
    logoutText: {
        color: '#ff453a',
        fontSize: 17,
        fontWeight: '600',
    },
    statusCard: {
        backgroundColor: '#1e2124', // สีเดียวกับ Section อื่นๆ ของคุณ
        borderRadius: 25,
        padding: 20,
        flexDirection: 'row',        // จัดวาง Battery และ CPU ขนานกัน
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',

        // เพิ่มเงาให้มีมิติ
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    statusItem: {
        alignItems: 'center',        // จัด Icon และ Text ให้อยู่ตรงกลางของแต่ละฝั่ง
        flex: 1,
    },
    divider: {
        width: 1,
        height: '60%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusLabel: {
        color: '#8e8e93',
        fontSize: 12,
        marginTop: 5,
        fontFamily: 'Garamond-Regular',
    },
    statusValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Garamond-Bold',
    },

});
