import {
    Text,
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Chat() {
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Message History Placeholder */}
            <ScrollView style={styles.messagesContainer}>
                <Text style={styles.placeholderText}>Chat history will appear here...</Text>
            </ScrollView>

            {/* Input Area anchored to the bottom */}
            <View style={styles.inputArea}>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => { console.log("Attach Image!"); }}
                >
                    <Ionicons name="image" size={24} color="#aaa" />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Type your message..."
                    placeholderTextColor="#aaa"
                    multiline
                />

                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={() => { console.log("Sent!"); }}
                >
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
    messagesContainer: {
        flex: 1,
        padding: 20,
    },
    placeholderText: {
        color: '#aaa',
        textAlign: 'center',
        marginTop: 50,
        fontFamily: 'Garamond-Regular',
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 12,
        backgroundColor: '#1e2124',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100, // Allows input to grow slightly if text is long
        backgroundColor: '#2a2e33',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingTop: 10, // Important for multiline alignment
        color: '#fff',
        fontFamily: 'Garamond-Regular',
        marginHorizontal: 10,
    },
    iconButton: {
        padding: 5,
    },
    sendButton: {
        backgroundColor: '#ffd33d',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
});