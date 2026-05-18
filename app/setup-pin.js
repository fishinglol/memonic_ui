/**
 * setup-pin.js
 * Set a 4-digit PIN after first login/register.
 * PIN is stored in AsyncStorage — used for quick unlock on next open.
 */
import { Text, View, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function SetupPin() {
    const router = useRouter();
    const [pin, setPin]         = useState('');
    const [confirm, setConfirm] = useState('');
    const [step, setStep]       = useState('set');  // 'set' | 'confirm'
    const [error, setError]     = useState('');

    const handleDigit = (d) => {
        if (d === '') return;  // empty cell (bottom-left placeholder)
        setError('');
        if (d === '⌫') {
            if (step === 'set')     setPin(p => p.slice(0, -1));
            else                    setConfirm(c => c.slice(0, -1));
            return;
        }
        if (step === 'set') {
            const next = pin + d;
            setPin(next);
            if (next.length === 4) setStep('confirm');
        } else {
            const next = confirm + d;
            setConfirm(next);
            if (next.length === 4) {
                if (next === pin) {
                    // PINs match — save and go home
                    AsyncStorage.setItem('app_pin', next).then(() => {
                        router.replace('/(tabs)/home');
                    });
                } else {
                    Vibration.vibrate(300);
                    setError("PINs don't match — try again");
                    setConfirm('');
                    setPin('');
                    setStep('set');
                }
            }
        }
    };

    const current = step === 'set' ? pin : confirm;

    return (
        <View style={styles.container}>
            <View style={styles.top}>
                <View style={styles.iconWrap}>
                    <Ionicons name="lock-closed-outline" size={36} color={COLORS.accent} />
                </View>
                <Text style={styles.title}>
                    {step === 'set' ? 'Set Your PIN' : 'Confirm PIN'}
                </Text>
                <Text style={styles.sub}>
                    {step === 'set'
                        ? 'Choose a 4-digit PIN to unlock Memonic'
                        : 'Enter your PIN again to confirm'}
                </Text>

                {/* Dot indicators */}
                <View style={styles.dots}>
                    {[0,1,2,3].map(i => (
                        <View key={i} style={[styles.dot, i < current.length && styles.dotFilled]} />
                    ))}
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Numpad */}
            <View style={styles.pad}>
                {DIGITS.map((d, i) => (
                    <TouchableOpacity
                        key={i}
                        onPress={() => handleDigit(d)}
                        style={[styles.key, d === '' && { opacity: 0 }]}
                        disabled={d === ''}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.keyText, d === '⌫' && { fontSize: 22 }]}>{d}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={styles.skip}>
                <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 60 },
    top: { alignItems: 'center', gap: 12 },
    iconWrap: {
        width: 72, height: 72, borderRadius: 24,
        backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
        marginBottom: 8, ...SHADOWS.card,
    },
    title: { color: COLORS.text, fontSize: 26, fontFamily: 'Garamond-Bold', fontWeight: 'bold' },
    sub: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular', textAlign: 'center', paddingHorizontal: 40 },
    dots: { flexDirection: 'row', gap: 16, marginTop: 24 },
    dot: {
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.textMuted,
    },
    dotFilled: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    errorText: { color: COLORS.danger, fontSize: 13, marginTop: 8 },

    pad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, gap: 0 },
    key: {
        width: 280/3, height: 80,
        justifyContent: 'center', alignItems: 'center',
    },
    keyText: { color: COLORS.text, fontSize: 28, fontWeight: '300' },

    skip: { paddingVertical: 8 },
    skipText: { color: COLORS.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
