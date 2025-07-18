import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import axiosClient from '../src/api/axiosClient';
import { router } from 'expo-router';
import useAuth from '../src/hooks/useAuth';

const ChangePasswordScreen = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const { userId } = useAuth();
  const handleSubmit = async () => {
    try {
await axiosClient.put('/users/change-password', {
  userId,
  currentPassword,
  newPassword,
}); 
      setMessage('Şifre başarıyla güncellendi.');
    } catch (err) {
      setMessage('Şifre güncellenemedi. Lütfen tekrar deneyin.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şifre Değiştir</Text>
      <Text style={styles.label}>Mevcut Şifre</Text>
      <TextInput
        style={styles.input}
        placeholder="Mevcut şifre"
        placeholderTextColor="#999"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />
      <Text style={styles.label}>Yeni Şifre</Text>
      <TextInput
        style={styles.input}
        placeholder="Yeni şifre"
        placeholderTextColor="#999"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Şifreyi Güncelle</Text>
      </TouchableOpacity>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Geri dön</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: "#f9f9fb",
  },
title: {
  fontSize: 24,
  fontWeight: "800",
  color: "#5f5f5f",
  letterSpacing: 0.3,
  textAlign: "center",
  marginBottom: 24,
},
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
input: {
  borderWidth: 1,
  borderColor: "#ddd",
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: "#f9f9f9",
  fontSize: 15,
  marginBottom: 16,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 2,
},
button: {
  backgroundColor: "#7B2CBF",
  paddingVertical: 16,
  borderRadius: 14,
  alignItems: "center",
  marginTop: 8,
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
  paddingHorizontal: 18,

},
buttonText: {
  color: "white",
  fontSize: 16,
  fontWeight: "600",
},
  message: {
    color: "green",
    textAlign: "center",
    marginTop: 12,
  },
  link: {
    color: "#7B2CBF",
    textAlign: "center",
fontSize: 14,
marginTop: 24,
textDecorationLine: 'underline',
  },
});

export default ChangePasswordScreen;