import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import axiosClient from '../src/api/axiosClient';
import { router, useLocalSearchParams } from 'expo-router';

const VerifyResetCodeScreen = () => {
  const { email: emailParam } = useLocalSearchParams();
  const [email, setEmail] = useState(emailParam || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    try {
      await axiosClient.post('/auth/verify-reset-code', { email, code, newPassword });
      setMessage('Şifre güncellendi. Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Kod doğrulanamadı.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kod Doğrulama</Text>
      <Text style={styles.label}>E-posta</Text>
      <TextInput
        style={styles.input}
        placeholder="email@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={styles.label}>6 Haneli Kod</Text>
      <TextInput
        style={styles.input}
        placeholder="000000"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
      />
      <Text style={styles.label}>Yeni Şifre</Text>
      <TextInput
        style={styles.input}
        placeholder="Yeni şifre"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Şifreyi Güncelle</Text>
      </TouchableOpacity>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>Giriş ekranına dön</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f9f9fb'
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    color: '#5f5f5f'
  },
  label: {
    fontSize: 14,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    fontSize: 15,
    marginBottom: 16,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  button: {
    backgroundColor: '#7B2CBF',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center'
  },
  buttonText: {
    color: 'white',
    fontSize: 16
  },
  message: {
    color: 'green',
    textAlign: 'center',
    marginTop: 12
  },
  link: {
    color: '#7B2CBF',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 24,
    textDecorationLine: 'underline'
  }
});

export default VerifyResetCodeScreen;