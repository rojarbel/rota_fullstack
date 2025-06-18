import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import axiosClient from "../src/api/axiosClient";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setItem as setSecureItem } from "../src/utils/storage";
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from "../src/context/AuthContext";
import { KeyboardAvoidingView, ScrollView, Platform } from 'react-native';



const PRIMARY = '#7B2CBF';
const ACCENT = '#FFD54F';
const TEXT = '#333';

const LoginScreen = () => {
const { setIsLoggedIn, setUsername, setRole, setEmail: setAuthEmail,setToken } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
   
    try {

const res = await axiosClient.post("/auth/login", {
        email,
        password, 
      });

const accessToken = res.data.token;
const refreshToken = res.data.refreshToken;
const user = res.data.user;

await setSecureItem("accessToken", accessToken);


await setSecureItem("refreshToken", refreshToken);

await AsyncStorage.setItem("username", user.username);
await AsyncStorage.setItem("email", user.email);
await AsyncStorage.setItem("role", user.role || 'user');
await AsyncStorage.setItem("fullname", user.fullname || '');
await AsyncStorage.setItem("birthDate", user.birthDate || '');
await AsyncStorage.setItem("city", user.city || '');
await AsyncStorage.setItem("image", user.image || '');
await AsyncStorage.setItem("userId", user._id || '');

      setIsLoggedIn(true);
setUsername(user.username);
setRole(user.role);
setAuthEmail(user.email);
setToken(accessToken);

      Alert.alert("Başarılı", "Giriş başarılı!", [
        {
          text: "Tamam",
          onPress: () => router.push("/"),
        },
      ]);
    } catch (err) {
      Alert.alert("Hata", err.response?.data?.message || "Giriş başarısız");
    }
  };

  return (
    <KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
>
  <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      <Text style={styles.title}>Giriş Yap</Text>

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
    style={{
      position: 'absolute',
      right: 16,
      top: -5,
      height: '100%',
      justifyContent: 'center',
    }}
  >
    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#999" />
  </TouchableOpacity>
</View>


      <TouchableOpacity onPress={() => router.push("/forgot-password")}>
        <Text style={styles.link}>Parolanızı mı unuttunuz?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Giriş Yap</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/register")}>
        <Text style={styles.link}>Hesabınız yok mu? Kayıt olun</Text>
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
    backgroundColor: "#fff",
  },
title: {
  fontSize: 26,
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: 32,
  color: TEXT,
},
input: {
  backgroundColor: '#fafafa',
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 14,
  fontSize: 15,
  color: TEXT,
  marginBottom: 16,
},
button: {
  backgroundColor: PRIMARY,
  padding: 15,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 20,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 6,
  elevation: 3,
},
buttonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
link: {
  color: PRIMARY,
  textAlign: 'center',
  marginTop: 16,
  fontSize: 13,
}
});

export default LoginScreen;
