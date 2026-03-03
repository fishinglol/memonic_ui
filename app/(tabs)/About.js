import { Text, View, StyleSheet } from 'react-native';
import React from 'react';

export default function About() {
    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>About Memonic</Text>
                <Text style={styles.text}>Version 1.0.0</Text>
                <Text style={styles.description}>
                    Memonic is your personal memory assistant, helping you organize and recap your daily highlights.
                </Text>
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
    },
    card: {
        backgroundColor: '#1e2124',
        padding: 30,
        borderRadius: 30,
        width: '85%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        color: '#ffd33d',
        fontSize: 28,
        fontFamily: 'Garamond-Bold',
        marginBottom: 10,
    },
    text: {
        color: '#ccc',
        fontSize: 16,
        marginBottom: 20,
    },
    description: {
        color: '#fff',
        fontSize: 18,
        lineHeight: 24,
        fontFamily: 'Garamond-Regular',
    },
});
