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
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Chat() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);

    // ข้อมูลจำลองสำหรับ History Drawer
    const historyItems = [
        { id: '1', title: 'Styling React Native Chat Input', icon: 'chatbubble-outline' },
        { id: '2', title: 'Startup Dev Log: Memonic Day 6', icon: 'document-text-outline' },
        { id: '3', title: 'ESP32 Hardware AES Encryption', icon: 'hardware-chip-outline' },
        { id: '4', title: 'LLM Access to YouTube Watch...', icon: 'logo-youtube' },
    ];

    // ฟังก์ชันสร้างแชทใหม่ (เคลียร์หน้าจอแบบ ChatGPT)
    const handleNewChat = () => {
        setMessages([]);
        setHistoryVisible(false);
    };

    // ฟังก์ชันดึงประวัติแชทด้านบน (Pull to refresh)
    const loadHistory = () => {
        setIsFetchingHistory(true);
        setTimeout(() => {
            const oldMessages = [
                { id: `old_1_${Date.now()}`, text: "Previous conversation from yesterday..." },
                { id: `old_2_${Date.now()}`, text: "Older AI response..." }
            ];
            setMessages(prev => [...oldMessages, ...prev]);
            setIsFetchingHistory(false);
        }, 1500);
    };

    // ฟังก์ชันส่งข้อความ
    const handleSend = () => {
        if (message.trim().length > 0) {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: message }]);
            setMessage('');
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
            {/* --- ส่วน Header --- */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Memonic</Text>
                <TouchableOpacity style={styles.iconButtonHeader} onPress={handleNewChat}>
                    <Ionicons name="create-outline" size={26} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* --- พื้นที่แสดงข้อความ --- */}
            <ScrollView
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
                {/* คำทักทาย (จะหายไปเมื่อเริ่มแชท) */}
                {messages.length === 0 && (
                    <View style={styles.welcomeContainer}>
                        <Ionicons name="sparkles" size={40} color="#ffd33d" style={styles.welcomeLogo} />
                        <Text style={styles.welcomeText}>
                            Hi, Fais Putama{"\n"}
                            <Text style={styles.welcomeSubText}>How can I help you?</Text>
                        </Text>
                    </View>
                )}

                {/* บับเบิลข้อความ */}
                {messages.map((msg) => (
                    <View key={msg.id} style={styles.userMessageBubble}>
                        <Text style={styles.messageText}>{msg.text}</Text>
                    </View>
                ))}
            </ScrollView>

            {/* --- HISTORY MODAL (DRAWER) --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={historyVisible}
                onRequestClose={() => setHistoryVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    {/* พื้นที่ว่างด้านบน แตะเพื่อปิด */}
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
                            {historyItems.map((item) => (
                                <TouchableOpacity key={item.id} style={styles.historyItem} onPress={() => setHistoryVisible(false)}>
                                    <View style={styles.historyIconCircle}>
                                        <Ionicons name={item.icon} size={18} color="#8e8e93" />
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

            {/* --- พื้นที่พิมพ์ข้อความ (Input Area) --- */}
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
                    />
                </View>

                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Ionicons name="send" size={18} color="#25292e" />
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
    userMessageBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#ffd33d',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
        marginTop: 10,
        maxWidth: '80%',
    },
    messageText: {
        color: '#25292e',
        fontSize: 16,
        fontFamily: 'Garamond-Regular',
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
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 15,
        marginBottom: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
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