import { Text, View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AddMemberSheet from '../components/sub_member';
import { AI_URL } from './config';

export default function Member() {
    const router = useRouter();
    const [sheetVisible, setSheetVisible] = useState(false);
    const [members, setMembers] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMembers = useCallback(async () => {
        try {
            const response = await fetch(`${AI_URL}/api/members`);
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

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#ffd33d"
                    />
                }
            >





                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Registered Members</Text>
                    <TouchableOpacity onPress={onRefresh}>
                        <Ionicons name="refresh" size={18} color="#ffd33d" />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    {members.length > 0 ? (
                        members.map((member, index) => (
                            <SettingItem
                                key={index}
                                icon="person-circle-outline"
                                title={member}
                            />
                        ))
                    ) : (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Ionicons name="people-outline" size={48} color="rgba(255, 255, 255, 0.1)" />
                            <Text style={{ color: '#8e8e93', marginTop: 10, fontStyle: 'italic' }}>
                                No members registered yet
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <SettingItem 
                        icon="person-outline" 
                        title="Account" 
                        onPress={() => router.push('/account')}
                    />
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
    sectionTitle: {
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 10,
    },
    section: {
        backgroundColor: '#1e2124',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
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


