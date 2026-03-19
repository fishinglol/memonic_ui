import {
    Text,
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
    RefreshControl,
    Modal,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

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

    // Fetch chat sessions on mount
    useEffect(() => {
        fetchSessions();
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollViewRef.current && messages.length > 0) {
            setTimeout(() => {
                scrollViewRef.current.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    // Fetch all chat sessions for the History Drawer
    const fetchSessions = async () => {
        try {
            const res = await fetch(`${API_URL}/api/chat/sessions`);
            if (res.ok) {
                const data = await res.json();
                setHistorySessions(data);
            }
        } catch (err) {
            console.log("Failed to fetch sessions:", err);
        }
    };

    // Load messages for a specific session
    const loadSession = async (sid) => {
        try {
            const res = await fetch(`${API_URL}/api/chat/sessions/${sid}`);
            if (res.ok) {
                const data = await res.json();
                const formatted = data.map((m, i) => ({
                    id: `${sid}_${i}`,
                    text: m.content,
                    role: m.role,
                }));
                setMessages(formatted);
                setSessionId(sid);
                setHistoryVisible(false);
            }
        } catch (err) {
            console.log("Failed to load session:", err);
        }
    };

    // Start a new chat (clear screen like ChatGPT)
    const handleNewChat = () => {
        setMessages([]);
        setSessionId(null);
        setHistoryVisible(false);
    };

    // Pull to refresh — reload chat sessions
    const loadHistory = () => {
        setIsFetchingHistory(true);
        fetchSessions().finally(() => setIsFetchingHistory(false));
    };

    // Send message to backend and get AI reply
    const handleSend = async () => {
        if (message.trim().length === 0 || isLoading) return;

        const userText = message.trim();
        setMessage('');

        // Optimistically add user message
        const userMsg = { id: `user_${Date.now()}`, text: userText, role: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: userText,
                }),
            });

            const data = await res.json();

            // Set session ID if this was the first message
            if (!sessionId && data.session_id) {
                setSessionId(data.session_id);
            }

            // Add AI response
            const aiMsg = { id: `ai_${Date.now()}`, text: data.reply, role: 'ai' };
            setMessages(prev => [...prev, aiMsg]);

            // Refresh sessions list in background
            fetchSessions();
        } catch (err) {
            const errorMsg = {
                id: `err_${Date.now()}`,
                text: '⚠️ Failed to connect to server. Please check your connection.',
                role: 'ai',
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScroll = (event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

        if (contentSize.height <= layoutMeasurement.height) {
            if (contentOffset.y > 60) {
                setHistoryVisible(true);
            }
        } else {
            const paddingToBottom = 20;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height + paddingToBottom) {
                setHistoryVisible(true);
            }
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* --- Header --- */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Memonic</Text>
                <TouchableOpacity style={styles.iconButtonHeader} onPress={handleNewChat}>
                    <Ionicons name="create-outline" size={26} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* --- Messages Area --- */}
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
                        tintColor="#ffd33d"
                        title="Loading History..."
                        titleColor="#8e8e93"
                    />
                }
            >
                {/* Welcome message (hidden when chatting) */}
                {messages.length === 0 && (
                    <View style={styles.welcomeContainer}>
                        <Ionicons name="sparkles" size={40} color="#ffd33d" style={styles.welcomeLogo} />
                        <Text style={styles.welcomeText}>
                            Hi, Fais Putama{"\n"}
                            <Text style={styles.welcomeSubText}>How can I help you?</Text>
                        </Text>
                    </View>
                )}

                {/* Message bubbles */}
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={msg.role === 'user' ? styles.userMessageBubble : styles.aiMessageBubble}
                    >
                        {msg.role === 'ai' && (
                            <View style={styles.aiAvatarRow}>
                                <Ionicons name="sparkles" size={14} color="#ffd33d" />
                                <Text style={styles.aiLabel}>Memonic</Text>
                            </View>
                        )}
                        <Text style={msg.role === 'user' ? styles.userMessageText : styles.aiMessageText}>
                            {msg.text}
                        </Text>
                    </View>
                ))}

                {/* Loading indicator while AI is thinking */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <View style={styles.aiAvatarRow}>
                            <Ionicons name="sparkles" size={14} color="#ffd33d" />
                            <Text style={styles.aiLabel}>Memonic</Text>
                        </View>
                        <ActivityIndicator size="small" color="#ffd33d" style={{ marginTop: 8 }} />
                    </View>
                )}
            </ScrollView>

            {/* --- HISTORY MODAL (DRAWER) --- */}
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
                            <TouchableOpacity onPress={handleNewChat}>
                                <Ionicons name="add-circle" size={26} color="#ffd33d" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {historySessions.length === 0 && (
                                <View style={styles.emptyHistory}>
                                    <Ionicons name="chatbubbles-outline" size={40} color="#444" />
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
                                >
                                    <View style={styles.historyIconCircle}>
                                        <Ionicons name="chatbubble-outline" size={18} color="#8e8e93" />
                                    </View>
                                    <Text style={styles.historyItemText} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Ionicons name="ellipsis-horizontal" size={18} color="#444" style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* --- Input Area --- */}
            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.iconButtonInput} onPress={() => { console.log("Attach Image!"); }}>
                    <Ionicons name="image" size={24} color="#aaa" />
                </TouchableOpacity>

                <View style={styles.glassInputWrapper}>
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.shineOverlay}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Type your message..."
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
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
                    <Ionicons name="send" size={18} color={isLoading ? "#999" : "#25292e"} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 15,
        backgroundColor: '#25292e',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    iconButtonHeader: {
        padding: 5,
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    messagesContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    welcomeContainer: {
        flex: 1,
        marginTop: SCREEN_HEIGHT * 0.2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    welcomeLogo: {
        marginBottom: 20,
    },
    welcomeText: {
        color: '#fff',
        fontSize: 32,
        fontFamily: 'Garamond-Bold',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    welcomeSubText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 24,
        fontFamily: 'Garamond-Regular',
    },
    // User message (right-aligned, gold)
    userMessageBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#ffd33d',
        padding: 12,
        borderRadius: 20,
        borderBottomRightRadius: 4,
        marginBottom: 10,
        marginTop: 10,
        maxWidth: '80%',
    },
    userMessageText: {
        color: '#25292e',
        fontSize: 16,
        fontFamily: 'Garamond-Regular',
    },
    // AI message (left-aligned, dark)
    aiMessageBubble: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        padding: 14,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        marginBottom: 10,
        marginTop: 10,
        maxWidth: '88%',
    },
    aiAvatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 5,
    },
    aiLabel: {
        color: '#ffd33d',
        fontSize: 12,
        fontFamily: 'Garamond-Bold',
        fontWeight: '600',
    },
    aiMessageText: {
        color: '#e0e0e0',
        fontSize: 16,
        fontFamily: 'Garamond-Regular',
        lineHeight: 24,
    },
    loadingContainer: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        padding: 14,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        marginBottom: 10,
        marginTop: 10,
        minWidth: 80,
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 12,
    },
    iconButtonInput: {
        padding: 5,
        marginBottom: 30,
    },
    glassInputWrapper: {
        flex: 1,
        marginHorizontal: 10,
        marginBottom: 30,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        overflow: 'hidden',
    },
    shineOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    input: {
        paddingHorizontal: 18,
        paddingTop: 12,
        minHeight: 45,
        maxHeight: 120,
        color: '#fff',
        backgroundColor: '#1e2124',
        borderRadius: 40,
    },
    sendButton: {
        backgroundColor: '#fff',
        width: 45,
        height: 45,
        borderRadius: 22.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    closeArea: {
        flex: 1,
    },
    historySheet: {
        backgroundColor: '#171717',
        height: '80%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 20,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 20,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 5,
    },
    sheetHeader: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Garamond-Bold',
        fontWeight: 'bold',
    },
    emptyHistory: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 8,
    },
    emptyHistoryText: {
        color: '#888',
        fontSize: 16,
        fontFamily: 'Garamond-Bold',
    },
    emptyHistorySubText: {
        color: '#555',
        fontSize: 14,
        fontFamily: 'Garamond-Regular',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 15,
        marginBottom: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    historyItemActive: {
        backgroundColor: 'rgba(255, 211, 61, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 211, 61, 0.2)',
    },
    historyIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyItemText: {
        color: '#ececec',
        fontSize: 16,
        fontFamily: 'Garamond-Regular',
        flex: 1,
    },
});