import { Text, View, StyleSheet, TextInput, Alert, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

export default function Index() {
  // 1. แยก State ให้ชัดเจน และเพิ่ม State สำหรับ Password
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // 2. ไม่ต้องใส่ Parameter ในวงเล็บ เพราะเราดึงค่าจากตัวแปร State ด้านบนได้เลย
  const handleLogin = async () => {

    if (userName.trim().length === 0 || password.trim().length === 0) {
      Alert.alert('Error', 'Please enter your username and password.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
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

      // 3. Now check if the status code was 200 OK
      if (response.ok) {
        // Save user name so other screens (like Account) know who logged in
        await AsyncStorage.setItem('user_name', userName);
        if (data?.user_id) {
          await AsyncStorage.setItem('user_id', String(data.user_id));
        }

        // เมื่อ Login สำเร็จ ควรไปหน้า Chat ที่เราสร้างไว้ (สมมติว่าชื่อไฟล์คือ /chat)
        router.push('/chat');
      } else {
        // ถ้าใส่รหัสผิด ให้โชว์ detail ที่ FastAPI ส่งกลับมา
        Alert.alert('Login Failed', data?.detail || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      Alert.alert('Error', 'Failed to connect to Memonic Server.');
    }
    // 4. ลบ router.push() บรรทัดสุดท้ายที่เคยวางผิดที่ออกไปแล้ว
  };

  const player = useVideoPlayer(require('../assets/logo_bg.mp4'), player => {
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
      <Image
        source={require('../assets/logo.png')}
        style={{ width: 100, height: 100 }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Memonic</Text>
      </View>
      <View style={styles.sub_header}>
        <Text style={styles.sub_title}>Welcome To Make Your Life Memorable</Text>
      </View>

      <View style={styles.cardContainer}>
        {/* The Background Layer */}
        <View style={styles.card_bg} pointerEvents="none" />

        {/* The Main Login Card */}
        <View style={styles.card}>
          <Text style={styles.text}>Login</Text>

          {/* ช่องกรอก Username */}
          <TextInput
            style={styles.input}
            placeholder="User Name"
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="none" // ป้องกันมือถือพิมพ์ตัวใหญ่ให้อัตโนมัติ (เดี๋ยว login ไม่ผ่าน)
          />

          {/* ช่องกรอก Password ที่เพิ่มเข้ามาใหม่ */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true} // ซ่อนรหัสผ่านเป็นจุดดำๆ
          />

          <TouchableOpacity onPress={handleLogin} style={styles.button}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Ionicons name="key-outline" size={20} color="#25292e" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Login with your passkey</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <TouchableOpacity
            onPress={() => router.push('/signin')}
            style={styles.signUpLink}
          >
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

  header: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 10,
  },
  title: {
    fontFamily: 'Garamond-Bold',
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
  },
  sub_title: {
    fontFamily: 'Garamond-Regular',
    fontSize: 20,
    fontWeight: '600',
    color: '#070707ff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)', // สีของเงา (ดำโปร่งแสง)
    textShadowOffset: { width: 1, height: 1 }, // ทิศทางของเงา (กว้าง, สูง)
    textShadowRadius: 3, // ความฟุ้งของเงา
  },
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 50,
  },
  card: {
    backgroundColor: '#1e2124',
    padding: 40,
    borderRadius: 40,
    width: '85%',
    zIndex: 2,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    marginTop: -65,
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Garamond-Bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#25292e',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontFamily: 'Garamond-Bold',
    marginBottom: 20,
    width: '100%',
    backgroundColor: '#fff',
  },
  card_bg: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    width: '95%',
    height: '250%',
    zIndex: 1,
    top: -15,
    marginTop: -110,
  },
  signUpLink: {
    alignItems: 'center',
    marginTop: 4,
  },
  signUpText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Garamond-Regular',
  },
  signUpHighlight: {
    color: '#fff',
    fontFamily: 'Garamond-Bold',
    fontWeight: '700',
  },
});
