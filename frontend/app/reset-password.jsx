import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import axiosClient from "../src/api/axiosClient";
import { router } from "expo-router";

const ResetPasswordScreen = () => {
  const { token } = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      Alert.alert("Hata", "Geçersiz sıfırlama bağlantısı");
      router.push("/login");
    }
  }, [token]);

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("Şifreler eşleşmiyor!");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Şifre en az 6 karakter olmalıdır!");
      return;
    }

    setIsLoading(true);
    try {
      await axiosClient.post("/auth/reset-password", {
        token,
        newPassword
      });

      Alert.alert("Başarılı", "Şifreniz başarıyla sıfırlandı", [
        { text: "Giriş Yap", onPress: () => router.push("/login") }
      ]);
    } catch (err) {
      setMessage("Şifre sıfırlama başarısız. Token geçersiz veya süresi dolmuş.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yeni Şifre Belirle</Text>

      <Text style={styles.label}>Yeni Şifre</Text>
      <TextInput
        style={styles.input}
        placeholder="Yeni şifrenizi girin"
        placeholderTextColor="#999"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />

      <Text style={styles.label}>Şifre Tekrar</Text>
      <TextInput
        style={styles.input}
        placeholder="Şifrenizi tekrar girin"
        placeholderTextColor="#999"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
        </Text>
      </TouchableOpacity>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
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
    fontWeight: "600",
    letterSpacing: 0.3,
    color: "#5f5f5f",
    marginBottom: 24,
    textAlign: "center",
    fontSize: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: "#5f5f5f",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
    marginBottom: 16,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    backgroundColor: "#7B2CBF",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  message: {
    color: "red",
    textAlign: "center",
    marginTop: 12,
  },
});

export default ResetPasswordScreen;