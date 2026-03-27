import { Text, View, StyleSheet, TextInput, Alert, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';
import { COLORS, SHADOWS } from './theme';

export default function Index() {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (userName.trim().length === 0 || password.trim().length === 0) {
      Alert.alert('Error', 'Please enter your username and password.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: userName, password: password }),
      });
      const textResponse = await response.text();
      let data;
      try { data = JSON.parse(textResponse); } catch (e) {
        Alert.alert("Server Error", "Received an invalid response from the server.");
        return;
      }
      if (response.ok) {
        await AsyncStorage.setItem('user_name', userName);
        if (data?.user_id) await AsyncStorage.setItem('user_id', String(data.user_id));
        router.push('/chat');
      } else {
        Alert.alert('Login Failed', data?.detail || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to Memonic Server.');
    }
  };

  const player = useVideoPlayer(require('../assets/logo_bg.mp4'), player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <View style={styles.container}>
      <VideoView player={player} style={StyleSheet.absoluteFillObject} nativeControls={false} contentFit="cover" />
      <View style={styles.overlay} />

      <Image source={require('../assets/logo.png')} style={{ width: 100, height: 100 }} />

      <View style={styles.header}>
        <Text style={styles.title}>Memonic</Text>
      </View>
      <View style={styles.sub_header}>
        <Text style={styles.sub_title}>Welcome To Make Your Life Memorable</Text>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.card_bg} pointerEvents="none" />
        <View style={styles.card}>
          <Text style={styles.text}>Login</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="User Name" placeholderTextColor={COLORS.textMuted}
              value={userName} onChangeText={setUserName} autoCapitalize="none" />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={COLORS.textMuted}
              value={password} onChangeText={setPassword} secureTextEntry={true} />
          </View>

          <TouchableOpacity onPress={handleLogin} style={styles.button}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="key-outline" size={20} color={COLORS.text} style={{ marginRight: 10 }} />
            <Text style={styles.secondaryButtonText}>Login with your passkey</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/signin')} style={styles.signUpLink}>
            <Text style={styles.signUpText}>
              Don't have an account?{' '}
              <Text style={styles.signUpHighlight}>Sign Up</Text>
            </Text>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 50, 64, 0.55)',
  },
  header: {
    height: 240, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 10,
  },
  title: {
    fontFamily: 'Garamond-Bold', fontSize: 64, fontWeight: 'bold', color: '#fff',
  },
  sub_header: {},
  sub_title: {
    fontFamily: 'Garamond-Regular', fontSize: 20, fontWeight: '600', color: COLORS.text,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  cardContainer: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    position: 'relative', marginTop: 50,
  },
  card: {
    backgroundColor: COLORS.surface, padding: 40, borderRadius: 36,
    width: '85%', zIndex: 2,
    ...SHADOWS.card,
    marginTop: -65,
  },
  text: {
    color: COLORS.text, fontSize: 24, fontFamily: 'Garamond-Bold', marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceDeep, borderRadius: 16,
    marginBottom: 16, paddingHorizontal: 14,
  },
  input: {
    flex: 1, height: 48, color: COLORS.text, fontFamily: 'Garamond-Regular', fontSize: 15,
  },
  button: {
    backgroundColor: COLORS.accent, paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    width: '100%', flexDirection: 'row', marginBottom: 14,
    ...SHADOWS.button,
    shadowColor: COLORS.accent, shadowOpacity: 0.25,
  },
  buttonText: {
    color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Garamond-Bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceDeep, paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    width: '100%', flexDirection: 'row', marginBottom: 14,
  },
  secondaryButtonText: {
    color: COLORS.text, fontSize: 16, fontWeight: '600',
  },
  signUpLink: { alignItems: 'center', marginTop: 4 },
  signUpText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Garamond-Regular' },
  signUpHighlight: { color: '#fff', fontFamily: 'Garamond-Bold', fontWeight: '700' },
  card_bg: {
    position: 'absolute', backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 50, width: '95%', height: '250%',
    zIndex: 1, top: -15, marginTop: -110,
  },
});
