import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';

export default function SignIn() {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    // --- Validation ---
    if (userName.trim().length === 0 || password.trim().length === 0) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://8001-01kkh2et3bdjymj2fjq6jabg8k.cloudspaces.litng.ai/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: userName,
          password: password,
        }),
      });

      // 1. Get the raw text first
      const textResponse = await response.text();
      let data;

      // 2. Safely try to parse it as JSON
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        // If it fails to parse, the server probably sent an HTML error page
        console.error("Server returned non-JSON:", textResponse);
        Alert.alert("Server Error", "Received an invalid response from the server.");
        return;
      }

      // 3. Check if the status code was 200 OK
      if (response.ok) {
        Alert.alert(
          'Account Created! 🎉',
          `Welcome to Memonic, ${data.user_name}! Please log in to continue.`,
          [{ text: 'Go to Login', onPress: () => router.replace('/') }]
        );
      } else {
        // FastAPI returns detail on error (e.g. "User already exists")
        Alert.alert('Sign Up Failed', data?.detail || 'Something went wrong.');
      }
    } catch (error) {
      console.error('Error signing up:', error);
      Alert.alert('Error', 'Failed to connect to Memonic Server.');
    } finally {
      setLoading(false);
    }
  };

  const player = useVideoPlayer(require('../assets/logo_bg.mp4'), (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <View style={styles.container}>
      {/* Video Background */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        nativeControls={false}
        contentFit="cover"
      />

      {/* Overlay for readability */}
      <View style={styles.overlay} />

      <Image
        source={require('../assets/logo.png')}
        style={{ width: 100, height: 100 }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Memonic</Text>
      </View>
      <View style={styles.sub_header}>
        <Text style={styles.sub_title}>Create Your Account</Text>
      </View>

      <View style={styles.cardContainer}>
        {/* Background glow layer */}
        <View style={styles.card_bg} />

        {/* Main Sign-Up Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.text}>Sign Up</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>New</Text>
            </View>
          </View>

          {/* Username */}
          <View style={styles.inputWrapper}>
            <Ionicons
              name="person-outline"
              size={16}
              color="#aaa"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#888"
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color="#aaa"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color="#aaa"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={true}
            />
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            style={[styles.button, styles.primaryButton]}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.buttonText}>Creating account...</Text>
            ) : (
              <>
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color="#25292e"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>Create Account</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={[styles.button, styles.secondaryButton]}
          >
            <Ionicons
              name="arrow-back-outline"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
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
    gap: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Garamond-Bold',
    fontSize: 52,
    fontWeight: 'bold',
    color: '#fff',
  },
  sub_header: {
    alignItems: 'center',
  },
  sub_title: {
    fontFamily: 'Garamond-Regular',
    fontSize: 18,
    fontWeight: '600',
    color: '#e0e0e0',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 20,
  },
  card: {
    backgroundColor: '#1e2124',
    padding: 28,
    borderRadius: 36,
    width: '85%',
    zIndex: 2,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 10,
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Garamond-Bold',
  },
  badge: {
    backgroundColor: 'rgba(110, 231, 183, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.4)',
  },
  badgeText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2e33',
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontFamily: 'Garamond-Regular',
    fontSize: 15,
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexDirection: 'row',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#25292e',
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: '#666',
    marginHorizontal: 12,
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  card_bg: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 50,
    width: '95%',
    height: '160%',
    zIndex: 1,
    top: -15,
  },
});
