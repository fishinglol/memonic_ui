import { Text, View, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

export default function AddMemberSheet({ visible, onClose }) {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    // Trigger animation when visibility changes
    React.useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
                speed: 14,
            }).start();
        } else {
            slideAnim.setValue(SHEET_HEIGHT);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: SHEET_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Dark overlay */}
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                {/* Sheet */}
                <Animated.View
                    style={[
                        styles.bottomSheet,
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Handle bar */}
                    <View style={styles.handleBar} />

                    {/* Sheet Header */}
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Add Member</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close-circle" size={28} color="#8e8e93" />
                        </TouchableOpacity>
                    </View>

                    {/* Sheet Content */}
                    <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.inputLabel}>Name</Text>
                        <TextInput
                            style={styles.sheetInput}
                            placeholder="Enter member name"
                            placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        />

                        <Text style={styles.inputLabel}>Member Icon</Text>
                        <View style={styles.iconSelectionRow}>
                            <TouchableOpacity
                                style={styles.addIconButton}
                                onPress={() => console.log("Open Gallery or Icon Picker")}
                            >
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                                    style={styles.iconGradient}
                                >
                                    <Ionicons name="add" size={32} color="#ffd33d" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <Text style={styles.helperText}>Tap to upload photo or choose icon</Text>
                        </View>

                        <View style={styles.voiceSection}>
                            <Text style={styles.inputLabel}>Enroll Voice</Text>
                            <View style={styles.voiceRow}>
                                <TouchableOpacity
                                    style={styles.voiceButton}
                                    onPress={() => console.log("Starting Voice Enrollment...")}
                                >
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                                        style={styles.voiceGradient}
                                    >
                                        <Ionicons name="mic-outline" size={28} color="#ffd33d" />
                                    </LinearGradient>
                                </TouchableOpacity>
                                <Text style={styles.helperText}>
                                    Tap to record and Say:{"\n"}
                                    <Text style={styles.quoteText}>"Hi one two three, i am so happy to see you"</Text>
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.voiceSection, { marginBottom: 5 }]}>
                            <Text style={styles.inputLabel}>OR Search History</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.historyItem}
                            onPress={() => {
                                handleClose();
                                router.push('/Voice_History');
                            }}
                        >
                            <Ionicons name="people-circle-outline" size={22} color="#ffd33d" style={{ marginRight: 15 }} />
                            <Text style={styles.historyItemText}>Search History</Text>
                            <Ionicons name="chevron-forward" size={20} color="#8e8e93" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.addButton} onPress={handleClose}>
                            <LinearGradient
                                colors={['#ffd33d', '#f7b733']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.addButtonGradient}
                            >
                                <Text style={styles.addButtonText}>Add Member</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_HEIGHT,
        backgroundColor: '#1e2124',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingHorizontal: 20,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 20,
    },
    skipButton: {
        marginTop: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
    },
    skipText: {
        color: '#8e8e93',
        fontSize: 17,
        fontWeight: '600',
    },
    iconSelectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    addIconButton: {
        width: 80,
        height: 80,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderStyle: 'dashed', // Gives it that "upload here" look
        borderColor: 'rgba(255, 211, 61, 0.4)',
    },
    iconGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    helperText: {
        marginLeft: 15,
        color: '#8e8e93',
        fontSize: 14,
        fontFamily: 'Garamond-Regular',
        flex: 1,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 15,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    sheetTitle: {
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    sheetContent: {
        flex: 1,
    },
    inputLabel: {
        color: '#8e8e93',
        fontSize: 14,
        fontFamily: 'Garamond-Regular',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sheetInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 15,
        padding: 15,
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Garamond-Regular',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    addButton: {
        marginTop: 10,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#ffd33d',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    addButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 20,
    },
    addButtonText: {
        color: '#25292e',
        fontSize: 17,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    voiceSection: {
        marginBottom: 25,
    },
    voiceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    voiceButton: {
        width: 60,
        height: 60,
        borderRadius: 30, // Circular button for voice
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 211, 61, 0.3)',
    },
    voiceGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // You can reuse the helperText style from the previous Icon section
    helperText: {
        marginLeft: 15,
        color: '#8e8e93',
        fontSize: 14,
        fontFamily: 'Garamond-Regular',
        flex: 1,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginTop: 5,
        marginBottom: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    historyItemText: {
        color: '#fff',
        fontSize: 17,
        fontFamily: 'Garamond-Regular',
    },
});
