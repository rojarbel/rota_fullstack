import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import axiosClient from "../src/api/axiosClient";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigation = useNavigation();
  const [isPressed, setIsPressed] = useState(false);

  const handleSubmit = async () => {
    try {
      await axiosClient.post("/auth/reset-password-request", { email });

      setMessage("Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi.");
    } catch (err) {
      setMessage("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şifre Sıfırla</Text>

      <Text style={styles.label}>Kayıtlı E-posta Adresiniz</Text>
      <TextInput
        style={styles.input}
        placeholder="ornek@mail.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

<TouchableOpacity
  activeOpacity={0.8}
  style={[styles.button, isPressed && styles.buttonPressed]}
  onPressIn={() => setIsPressed(true)}
  onPressOut={() => setIsPressed(false)}
  onPress={handleSubmit}
>
  <Text style={styles.buttonText}>Şifre Sıfırlama Bağlantısı Gönder</Text>
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
    backgroundColor: "#f9f9fb",

  },
title: {
  fontWeight: "600",
  letterSpacing: 0.3,
  color: "#333",
  marginBottom: 24,
  textAlign: "center",
  fontSize: 24,
},
  label: {
    fontSize: 14,
    marginBottom: 8,
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
  color: "#7B2CBF",
  textAlign: "center",
  fontSize: 14,
  marginTop: 24,
  textDecorationLine: 'underline',
},
buttonPressed: {
  transform: [{ scale: 0.98 }],
  shadowOpacity: 0.2,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
}
});

export default ForgotPasswordScreen;