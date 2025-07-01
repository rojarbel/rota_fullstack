import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import axiosClient from "../src/api/axiosClient";
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, ScrollView, Platform } from "react-native";

const PRIMARY = '#7B2CBF';
const ACCENT = '#FFD54F';
const TEXT = '#333';

const RegisterScreen = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Hata", "Şifreler uyuşmuyor");
      return;
    }

    try {
      await axiosClient.post("/auth/register", {
        username,
        email,
        password,
      });

      Alert.alert("Başarılı", "Kayıt başarılı! Giriş yapabilirsiniz.", [
        { text: "Tamam", onPress: () => router.push("/login") },
      ]);
    } catch (err) {
      Alert.alert("Hata", err.response?.data?.message || "Kayıt başarısız");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <Text style={styles.title}>Kayıt Ol</Text>

        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı"
          value={username}
          onChangeText={(text) => setUsername(text.replace(/\s/g, ''))}
        />

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={{ position: 'relative' }}>
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={{ position: 'relative' }}>
          <TextInput
            style={styles.input}
            placeholder="Şifre (tekrar)"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Kayıt Ol</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.link}>Zaten hesabınız var mı? Giriş Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f9f9fb",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: "#333",
    marginBottom: 32,
    textAlign: "center",
      },
  input: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: TEXT,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: -5,
    height: '100%',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: PRIMARY,
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    paddingVertical: 16,
    addingHorizontal: 18,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    color: PRIMARY,
    textAlign: "center",
    fontSize: 14,
    marginTop: 24,
    textDecorationLine: 'underline',
  }
});

export default RegisterScreen;
