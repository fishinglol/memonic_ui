import { Stack } from 'expo-router';
import { BLEProvider } from '../context/BLEContext';
import { RelayProvider } from '../context/RelayContext';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, EBGaramond_400Regular, EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

// ── Auth gate: redirect based on stored session + PIN ────────────
function AuthGate() {
    const router   = useRouter();
    const segments = useSegments();

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem('user_id');
                const hasPin = await AsyncStorage.getItem('app_pin');
                const inAuth = segments[0] === 'index' || segments[0] === 'signin'
                            || segments[0] === 'pin'   || segments[0] === 'setup-pin';

                if (!userId) {
                    // Not logged in → go to login
                    if (!inAuth) router.replace('/');
                } else if (!hasPin) {
                    // Logged in but no PIN set yet → setup PIN
                    if (segments[0] !== 'setup-pin') router.replace('/setup-pin');
                } else {
                    // Logged in + has PIN → PIN unlock screen (skip full login)
                    if (segments[0] === 'index' || segments[0] === 'signin') {
                        router.replace('/pin');
                    }
                }
            } catch {}
        })();
    }, []);

    return null;
}

export default function RootLayout() {
    const [loaded, error] = useFonts({
        'Garamond-Regular': EBGaramond_400Regular,
        'Garamond-Bold': EBGaramond_700Bold,
    });

    useEffect(() => {
        if (loaded || error) SplashScreen.hideAsync();
    }, [loaded, error]);

    if (!loaded && !error) return null;

    return (
        <RelayProvider>
        <BLEProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="member" />
                <Stack.Screen name="account" />
                <Stack.Screen name="signin" />
                <Stack.Screen name="pin" />
                <Stack.Screen name="setup-pin" />
            </Stack>
            <AuthGate />
        </BLEProvider>
        </RelayProvider>
    );
}
