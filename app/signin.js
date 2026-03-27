import {
  Text, View, StyleSheet, TextInput, Alert, TouchableOpacity, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { COLORS, SHADOWS } from './theme';
import { API_URL } from './config';

export default function SignIn() {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    if (userName.trim().length === 0 || password.trim().length === 0) {
      Alert.alert('Error', 'Please fill in all fields.'); return;
    }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: userName, password: password }),
      });
      const textResponse = await response.text();
      let data;
      try { data = JSON.parse(textResponse); } catch (e) {
        Alert.alert("Server Error", "Received an invalid response."); return;
      }
      if (response.ok) {
        Alert.alert('Account Created! 🎉', `Welcome, ${data.user_name}!`,
          [{ text: 'Go to Login', onPress: () => router.replace('/') }]);
      } else {
        Alert.alert('Sign Up Failed', data?.detail || 'Something went wrong.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to Memonic Server.');
    } finally { setLoading(false); }
  };

  const player = useVideoPlayer(require('../assets/logo_bg.mp4'), (p) => {
    p.loop = true; p.muted = true; p.play();
  });

  return (
    <View style={styles.container}>
      <VideoView player={player} style={StyleSheet.absoluteFillObject} nativeControls={false} contentFit="cover" />
      <View style={styles.overlay} />

      <Image source={require('../assets/logo.png')} style={{ width: 100, height: 100 }} />
      <Text style={styles.title}>Memonic</Text>
      <Text style={styles.sub_title}>Create Your Account</Text>

      <View style={styles.cardContainer}>
        <View style={styles.card_bg} />
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Sign Up</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>New</Text></View>
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={16} color={COLORS.icon} style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="Username" placeholderTextColor={COLORS.textMuted}
              value={userName} onChangeText={setUserName} autoCapitalize="none" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.icon} style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={COLORS.textMuted}
              value={password} onChangeText={setPassword} secureTextEntry />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.icon} style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor={COLORS.textMuted}
              value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          </View>

          <TouchableOpacity onPress={handleSignIn} style={styles.primaryButton} disabled={loading}>
            {loading ? (
              <Text style={styles.primaryButtonText}>Creating account...</Text>
            ) : (
              <><Ionicons name="sparkles-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Create Account</Text></>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => router.replace('/')} style={styles.secondaryButton}>
            <Ionicons name="arrow-back-outline" size={18} color={COLORS.icon} style={{ marginRight: 8 }} />
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(44, 50, 64, 0.55)' },
  title: { fontFamily: 'Garamond-Bold', fontSize: 52, fontWeight: 'bold', color: '#fff' },
  sub_title: {
    fontFamily: 'Garamond-Regular', fontSize: 18, fontWeight: '600', color: COLORS.text,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  cardContainer: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    position: 'relative', marginTop: 20,
  },
  card: {
    backgroundColor: COLORS.surface, padding: 28, borderRadius: 32,
    width: '85%', zIndex: 2, ...SHADOWS.card,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 10 },
  cardTitle: { color: COLORS.text, fontSize: 24, fontFamily: 'Garamond-Bold' },
  badge: { backgroundColor: COLORS.accentSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceDeep, borderRadius: 16, marginBottom: 14, paddingHorizontal: 14,
  },
  input: { flex: 1, height: 48, color: COLORS.text, fontFamily: 'Garamond-Regular', fontSize: 15 },
  primaryButton: {
    backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', width: '100%', flexDirection: 'row',
    marginBottom: 10, ...SHADOWS.button, shadowColor: COLORS.accent, shadowOpacity: 0.25,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dividerText: { color: COLORS.textMuted, marginHorizontal: 12, fontSize: 13 },
  secondaryButton: {
    backgroundColor: COLORS.surfaceDeep, paddingVertical: 14, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', width: '100%', flexDirection: 'row',
  },
  secondaryButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  card_bg: {
    position: 'absolute', backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 50, width: '95%', height: '160%', zIndex: 1, top: -15,
  },
});
