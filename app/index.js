import { Text, View, StyleSheet, TextInput, Alert, TouchableOpacity, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';

export default function Index() {

  const [text, setText] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    if (text.trim().length === 0) {
      Alert.alert('Error', 'Please enter your username first.');
      return;
    }
    router.push('/home');
  };
  return (

    <View style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={{ width: 100, height: 100 }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Memonic</Text>
      </View>

      <View style={styles.card}>

        <Text style={styles.text}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="User Name"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity onPress={handleLogin} style={styles.button}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

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
    fontFamily: 'Garamond-Bold', // Ensure this font is correctly loaded in your project
    fontSize: 64,               // Increased size to make it "big"
    fontWeight: 'bold',
    color: '#fff',              // Added white color so it's visible on your dark background
  },
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,

  },
  card: {
    backgroundColor: '#1e2124', // Semi-transparent white
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,

    // Android Shadow
    elevation: 10,
    padding: 40,
    borderRadius: 40,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)', // Subtle border
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
});

