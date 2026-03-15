import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, EBGaramond_400Regular, EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond';

// ป้องกัน Splash Screen หายก่อน Font โหลดเสร็จ
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        'Garamond-Regular': EBGaramond_400Regular,
        'Garamond-Bold': EBGaramond_700Bold,
    });

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    if (!loaded && !error) {
        return null;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            {/* 1. หน้า Login อยู่ข้างนอก (ไม่มี Tab) */}
            <Stack.Screen name="index" />

            {/* 2. เมื่อ Login แล้วจะวิ่งเข้าโฟลเดอร์นี้ (ที่มี Tab) */}
            <Stack.Screen name="(tabs)" />

            {/* 3. Member page (full page) */}
            <Stack.Screen name="member" />

            {/* 4. Sign Up / Register page */}
            <Stack.Screen name="signin" />
        </Stack>
    );
}