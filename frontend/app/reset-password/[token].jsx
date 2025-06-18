import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import axiosClient from "../../src/api/axiosClient";

import { router, useLocalSearchParams } from "expo-router";

const ResetPasswordScreen = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const { token } = useLocalSearchParams();

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("Şifreler uyuşmuyor.");
      return;
    }

    try {
      await axiosClient.post(`/auth/reset-password/${token}`, {
        newPassword,
      });
      setMessage("Şifre başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setMessage("Şifre güncellenemedi veya bağlantı süresi dolmuş.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yeni Şifre Belirle</Text>

      <TextInput
        style={styles.input}
        placeholder="Yeni şifre"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Yeni şifre (tekrar)"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Şifreyi Güncelle</Text>
      </TouchableOpacity>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity onPress={() => router.push("/login")}> 
        <Text style={styles.link}>Giriş sayfasına dönmek için buraya tıklayın</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  message: {
    color: "green",
    textAlign: "center",
    marginTop: 12,
  },
  link: {
    color: "#007bff",
    textAlign: "center",
    marginTop: 16,
  },
});

export default ResetPasswordScreen;
