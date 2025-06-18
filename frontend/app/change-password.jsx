import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import axiosClient from '../src/api/axiosClient';
import { router } from 'expo-router';

const ChangePasswordScreen = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    try {
      await axiosClient.post('/auth/change-password', {
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
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />
      <Text style={styles.label}>Yeni Şifre</Text>
      <TextInput
        style={styles.input}
        placeholder="Yeni şifre"
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
    backgroundColor: "#FFFFFF",
  },
title: {
  fontSize: 28,
  fontWeight: "800",
  color: "#333",
  textAlign: "center",
  marginBottom: 28,
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
  borderRadius: 10,
  backgroundColor: "#f9f9f9",
  fontSize: 15,
  marginBottom: 16,
},
button: {
  backgroundColor: "#7B2CBF",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 8,
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
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
    marginTop: 16,
  },
});

export default ChangePasswordScreen;