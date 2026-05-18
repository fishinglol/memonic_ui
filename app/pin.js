/**
 * pin.js
 * Quick PIN unlock screen — shown instead of full login when user is already logged in.
 * 4-digit PIN, 5 tries then falls back to full login.
 */
import { Text, View, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';

const MAX_TRIES = 5;
const DIGITS    = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinUnlock() {
    const router = useRouter();
    const [pin, setPin]     = useState('');
    const [tries, setTries] = useState(0);
    const [shake, setShake] = useState(false);
    const [userName, setUserName] = useState('');

    React.useEffect(() => {
        AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
    }, []);

    const handleDigit = async (d) => {
        if (d === '') return;
        if (d === '⌫') { setPin(p => p.slice(0, -1)); return; }
        const next = pin + d;
        setPin(next);
        if (next.length < 4) return;

        // Check PIN
        const saved = await AsyncStorage.getItem('app_pin');
        if (next === saved) {
            router.replace('/(tabs)/home');
        } else {
            const newTries = tries + 1;
            setTries(newTries);
            Vibration.vibrate(400);
            setPin('');
            if (newTries >= MAX_TRIES) {
                // Too many attempts — go back to full login
                await AsyncStorage.multiRemove(['user_id', 'user_name', 'app_pin']);
                router.replace('/');
            }
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['user_id', 'user_name', 'app_pin']);
        router.replace('/');
    };

    const remaining = MAX_TRIES - tries;

    return (
        <View style={styles.container}>
            <View style={styles.top}>
                <View style={styles.iconWrap}>
                    <Ionicons name="person-circle-outline" size={44} color={COLORS.accent} />
                </View>
                <Text style={styles.greeting}>Welcome back</Text>
                {!!userName && <Text style={styles.name}>{userName}</Text>}
                <Text style={styles.sub}>Enter your 4-digit PIN</Text>

                {/* Dot indicators */}
                <View style={styles.dots}>
                    {[0,1,2,3].map(i => (
                        <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
                    ))}
                </View>

                {tries > 0 && (
                    <Text style={styles.triesText}>
                        Incorrect PIN — {remaining} attempt{remaining !== 1 ? 's' : ''} left
                    </Text>
                )}
            </View>

            {/* Numpad */}
            <View style={styles.pad}>
                {DIGITS.map((d, i) => (
                    <TouchableOpacity
                        key={i}
                        onPress={() => handleDigit(d)}
                        style={[styles.key, d === '' && { opacity: 0 }]}
                        disabled={d === ''}
                        activeOpacity={0.65}
                    >
                        <Text style={[styles.keyText, d === '⌫' && { fontSize: 22 }]}>{d}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity onPress={handleLogout} style={styles.logout}>
                <Ionicons name="log-out-outline" size={15} color={COLORS.textMuted} />
                <Text style={styles.logoutText}>Use different account</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 60 },
    top: { alignItems: 'center', gap: 8 },
    iconWrap: {
        width: 80, height: 80, borderRadius: 28,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        marginBottom: 8, ...SHADOWS.card,
    },
    greeting: { color: COLORS.textMuted, fontSize: 15, fontFamily: 'Garamond-Regular' },
    name: { color: COLORS.text, fontSize: 24, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    sub: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular', marginTop: 4 },
    dots: { flexDirection: 'row', gap: 16, marginTop: 28 },
    dot: {
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.textMuted,
    },
    dotFilled: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    triesText: { color: COLORS.danger, fontSize: 13, marginTop: 8 },

    pad: { flexDirection: 'row', flexWrap: 'wrap', width: 280 },
    key: { width: 280/3, height: 80, justifyContent: 'center', alignItems: 'center' },
    keyText: { color: COLORS.text, fontSize: 28, fontWeight: '300' },

    logout: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
    logoutText: { color: COLORS.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
