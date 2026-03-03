import { Text, View, StyleSheet, TextInput, Button } from 'react-native';

export default function Chat() {
    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Type your message..."
                placeholderTextColor="#aaa"
            />
            <View style={{ marginTop: 10, width: '80%' }}>
                <Button
                    title="Send"
                    onPress={() => { }}
                    color="#ffd33d"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    input: {
        width: '80%',
        height: 50,
        backgroundColor: '#1e2124',
        borderRadius: 10,
        paddingHorizontal: 15,
        color: '#fff',
        fontFamily: 'Garamond-Regular',
        borderWidth: 1,
        borderColor: '#444',
    },
    text: {
        color: '#fff',
        fontSize: 24,
        fontFamily: 'Garamond-Bold',
    },
});
