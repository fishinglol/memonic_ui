import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AddMemberSheet from '../components/sub_member';

export default function Member() {
    const router = useRouter();
    const [sheetVisible, setSheetVisible] = useState(false);

    const SettingItem = ({ icon, title, onPress, isAdd }) => (
        <TouchableOpacity style={styles.item} onPress={onPress}>
            <Ionicons name={icon} size={22} color="#ffd33d" style={{ marginRight: 15 }} />
            <Text style={styles.itemText}>{title}</Text>
            <Ionicons
                name={isAdd ? "add" : "chevron-forward"}
                size={isAdd ? 26 : 20}
                color="#8e8e93"
                style={{ marginLeft: 'auto' }}
            />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Member</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>





                <View style={styles.section}>
                    <SettingItem icon="person-outline" title="Account" />
                    <SettingItem
                        icon="person-add-outline"
                        title="Add Member"
                        isAdd={true}
                        onPress={() => setSheetVisible(true)}
                    />
                </View>

                {/* Subscription Info */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>Your next renewal is on April 6, 2026.</Text>
                </View>
            </ScrollView>

            {/* Bottom Sheet from sub_member.js */}
            <AddMemberSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
            />
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
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    membershipCard: {
        borderRadius: 25,
        padding: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: "#ffd33d",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    cardInfo: {
        flex: 1,
    },
    membershipLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontFamily: 'Garamond-Regular',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    membershipLevel: {
        color: '#fff',
        fontSize: 28,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
        marginTop: 5,
    },
    sectionBenefit: {
        backgroundColor: '#1e2124',
        borderRadius: 25,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    section: {
        backgroundColor: '#1e2124',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Garamond-Bold',
        marginBottom: 20,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    benefitTextContent: {
        marginLeft: 15,
        flex: 1,
    },
    benefitTitle: {
        color: '#fff',
        fontSize: 17,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
    },
    benefitDescription: {
        color: '#8e8e93',
        fontSize: 14,
        fontFamily: 'Garamond-Regular',
        marginTop: 2,
    },
    infoBox: {
        padding: 20,
        alignItems: 'center',
    },
    infoText: {
        color: '#8e8e93',
        fontSize: 14,
        fontFamily: 'Garamond-Regular',
        textAlign: 'center',
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
});


