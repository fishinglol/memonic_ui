import {
    Text, View, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Dimensions,
    RefreshControl, Modal, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { COLORS, SHADOWS } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Chat() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);
    const [historySessions, setHistorySessions] = useState([]);
    const scrollViewRef = useRef(null);

    useEffect(() => { fetchSessions(); }, []);

    useEffect(() => {
        if (scrollViewRef.current && messages.length > 0) {
            setTimeout(() => { scrollViewRef.current.scrollToEnd({ animated: true }); }, 100);
        }
    }, [messages]);

    const fetchSessions = async () => {
        try {
            const res = await fetch(`${API_URL}/api/chat/sessions`);
            if (res.ok) { const data = await res.json(); setHistorySessions(data); }
        } catch (err) { console.log("Failed to fetch sessions:", err); }
    };

    const loadSession = async (sid) => {
        try {
            const res = await fetch(`${API_URL}/api/chat/sessions/${sid}`);
            if (res.ok) {
                const data = await res.json();
                const formatted = data.map((m, i) => ({ id: `${sid}_${i}`, text: m.content, role: m.role }));
                setMessages(formatted);
                setSessionId(sid);
                setHistoryVisible(false);
            }
        } catch (err) { console.log("Failed to load session:", err); }
    };

    const handleNewChat = () => { setMessages([]); setSessionId(null); setHistoryVisible(false); };

    const loadHistory = () => {
        setIsFetchingHistory(true);
        fetchSessions().finally(() => setIsFetchingHistory(false));
    };

    const handleSend = async () => {
        if (message.trim().length === 0 || isLoading) return;
        const userText = message.trim();
        setMessage('');
        const userMsg = { id: `user_${Date.now()}`, text: userText, role: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: userText }),
            });
            const data = await res.json();
            if (!sessionId && data.session_id) setSessionId(data.session_id);
            const aiMsg = { id: `ai_${Date.now()}`, text: data.reply, role: 'ai' };
            setMessages(prev => [...prev, aiMsg]);
            fetchSessions();
        } catch (err) {
            const errorMsg = { id: `err_${Date.now()}`, text: '⚠️ Failed to connect to server.', role: 'ai' };
            setMessages(prev => [...prev, errorMsg]);
        } finally { setIsLoading(false); }
    };

    const handleScroll = (event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        if (contentSize.height <= layoutMeasurement.height) {
            if (contentOffset.y > 60) setHistoryVisible(true);
        } else {
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height + 20) setHistoryVisible(true);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="add" size={24} color={COLORS.icon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={handleNewChat}>
                    <Ionicons name="create-outline" size={22} color={COLORS.icon} />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                alwaysBounceVertical={true}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetchingHistory}
                        onRefresh={loadHistory}
                        tintColor={COLORS.textMuted}
                        title="Loading History..."
                        titleColor={COLORS.textMuted}
                    />
                }
            >
                {messages.length === 0 && (
                    <View style={styles.welcomeContainer}>
                        <View style={styles.welcomeIconWrap}>
                            <Ionicons name="sparkles" size={32} color={COLORS.icon} />
                        </View>
                        <Text style={styles.welcomeText}>
                            Hi, Fais Putama{"\n"}
                            <Text style={styles.welcomeSubText}>How can I help you?</Text>
                        </Text>
                    </View>
                )}

                {messages.map((msg) => (
                    <View key={msg.id} style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                        {msg.role === 'ai' && (
                            <View style={styles.aiAvatarRow}>
                                <Ionicons name="sparkles" size={14} color={COLORS.icon} />
                                <Text style={styles.aiLabel}>Memonic</Text>
                            </View>
                        )}
                        <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>
                            {msg.text}
                        </Text>
                    </View>
                ))}

                {isLoading && (
                    <View style={styles.loadingBubble}>
                        <View style={styles.aiAvatarRow}>
                            <Ionicons name="sparkles" size={14} color={COLORS.icon} />
                            <Text style={styles.aiLabel}>Memonic</Text>
                        </View>
                        <ActivityIndicator size="small" color={COLORS.textMuted} style={{ marginTop: 8 }} />
                    </View>
                )}
            </ScrollView>

            {/* History Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={historyVisible}
                onRequestClose={() => setHistoryVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.closeArea}
                        onPress={() => setHistoryVisible(false)}
                        activeOpacity={1}
                    />
                    <View style={styles.historySheet}>
                        <View style={styles.handle} />
                        <View style={styles.sheetHeaderRow}>
                            <Text style={styles.sheetHeader}>Chats</Text>
                            <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
                                <Ionicons name="add" size={20} color={COLORS.icon} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {historySessions.length === 0 && (
                                <View style={styles.emptyHistory}>
                                    <View style={styles.emptyHistoryIconWrap}>
                                        <Ionicons name="chatbubbles-outline" size={36} color={COLORS.textMuted} />
                                    </View>
                                    <Text style={styles.emptyHistoryText}>No conversations yet</Text>
                                    <Text style={styles.emptyHistorySubText}>Start a new chat to see it here</Text>
                                </View>
                            )}
                            {historySessions.map((item) => (
                                <TouchableOpacity
                                    key={item.session_id}
                                    style={[
                                        styles.historyItem,
                                        sessionId === item.session_id && styles.historyItemActive,
                                    ]}
                                    onPress={() => loadSession(item.session_id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.historyIconCircle}>
                                        <Ionicons name="chatbubble-outline" size={16} color={COLORS.icon} />
                                    </View>
                                    <Text style={styles.historyItemText} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Input Area */}
            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.attachButton} onPress={() => console.log("Attach Image!")}>
                    <Ionicons name="image-outline" size={22} color={COLORS.icon} />
                </TouchableOpacity>

                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type your message..."
                        placeholderTextColor={COLORS.textMuted}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        editable={!isLoading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={isLoading}
                >
                    <Ionicons name="send" size={18} color={isLoading ? COLORS.textMuted : '#fff'} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    // ── Header ──
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15,
        backgroundColor: COLORS.bg,
    },
    headerTitle: { color: COLORS.text, fontSize: 18, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    headerButton: {
        width: 40, height: 40, borderRadius: 14,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.small,
    },

    // ── Messages ──
    messagesContainer: { flex: 1, paddingHorizontal: 20 },
    messagesContent: { flexGrow: 1, paddingBottom: 20 },

    welcomeContainer: {
        flex: 1, marginTop: SCREEN_HEIGHT * 0.2, alignItems: 'center', justifyContent: 'center',
    },
    welcomeIconWrap: {
        width: 64, height: 64, borderRadius: 22,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        marginBottom: 20, ...SHADOWS.card,
    },
    welcomeText: {
        color: COLORS.text, fontSize: 32, fontFamily: 'Garamond-Bold',
        textAlign: 'center', fontWeight: 'bold',
    },
    welcomeSubText: { color: COLORS.textMuted, fontSize: 24, fontFamily: 'Garamond-Regular' },

    // ── Bubbles ──
    userBubble: {
        alignSelf: 'flex-end', backgroundColor: COLORS.accent,
        padding: 14, borderRadius: 22, borderBottomRightRadius: 6,
        marginBottom: 10, marginTop: 10, maxWidth: '80%',
        ...SHADOWS.small, shadowColor: COLORS.accent, shadowOpacity: 0.2,
    },
    userText: { color: '#fff', fontSize: 16, fontFamily: 'Garamond-Regular' },
    aiBubble: {
        alignSelf: 'flex-start', backgroundColor: COLORS.surface,
        padding: 14, borderRadius: 22, borderBottomLeftRadius: 6,
        marginBottom: 10, marginTop: 10, maxWidth: '88%',
        ...SHADOWS.small,
    },
    aiAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 5 },
    aiLabel: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Garamond-Bold', fontWeight: '600' },
    aiText: { color: COLORS.text, fontSize: 16, fontFamily: 'Garamond-Regular', lineHeight: 24 },
    loadingBubble: {
        alignSelf: 'flex-start', backgroundColor: COLORS.surface,
        padding: 14, borderRadius: 22, borderBottomLeftRadius: 6,
        marginBottom: 10, marginTop: 10, minWidth: 80,
        ...SHADOWS.small,
    },

    // ── Input ──
    inputArea: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    attachButton: {
        width: 44, height: 44, borderRadius: 16,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        marginBottom: 30, ...SHADOWS.small,
    },
    inputWrapper: {
        flex: 1, marginHorizontal: 10, marginBottom: 30,
        borderRadius: 22, backgroundColor: COLORS.surface, overflow: 'hidden',
        ...SHADOWS.small,
    },
    input: {
        paddingHorizontal: 18, paddingTop: 12, minHeight: 45, maxHeight: 120,
        color: COLORS.text, backgroundColor: COLORS.surfaceDeep, borderRadius: 22,
        fontFamily: 'Garamond-Regular',
    },
    sendButton: {
        backgroundColor: COLORS.accent, width: 44, height: 44, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center', marginBottom: 30,
        ...SHADOWS.button, shadowColor: COLORS.accent, shadowOpacity: 0.3,
    },
    sendButtonDisabled: { backgroundColor: COLORS.surfaceDeep, shadowOpacity: 0 },

    // ── History Modal ──
    modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
    closeArea: { flex: 1 },
    historySheet: {
        backgroundColor: COLORS.surface, height: '80%',
        borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20,
        ...SHADOWS.card,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: COLORS.divider, alignSelf: 'center', marginBottom: 20,
    },
    sheetHeaderRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, paddingHorizontal: 5,
    },
    sheetHeader: { color: COLORS.text, fontSize: 20, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    newChatButton: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
    },
    emptyHistory: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
    emptyHistoryIconWrap: {
        width: 64, height: 64, borderRadius: 22,
        backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
        marginBottom: 8, ...SHADOWS.small,
    },
    emptyHistoryText: { color: COLORS.text, fontSize: 16, fontFamily: 'Garamond-Bold' },
    emptyHistorySubText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular' },
    historyItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 14,
        borderRadius: 18, marginBottom: 6, backgroundColor: COLORS.surfaceDeep,
    },
    historyItemActive: { backgroundColor: COLORS.accentSoft },
    historyIconCircle: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    historyItemText: { color: COLORS.text, fontSize: 15, fontFamily: 'Garamond-Regular', flex: 1 },
});