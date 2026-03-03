import { Slot } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function RootLayout() {
    return (
        <View style={{ flex: 1, backgroundColor: '#25292e' }}>
            <Slot />
        </View>
    );
}