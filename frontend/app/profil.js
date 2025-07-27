// Profil.js (Expo React Native)
import DateTimePicker from '@react-native-community/datetimepicker';
import axiosClient from '../src/api/axiosClient';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Linking } from 'react-native';
import { deleteItems } from '../src/utils/storage';
import { setCachedToken } from '../src/api/axiosClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem as getSecureItem } from '../src/utils/storage';
import logger from '../src/utils/logger';
import useAuth from '../src/hooks/useAuth';
const PRIMARY = '#7B2CBF';
const TEXT = '#333';
const BG = '#FFFFFF';


function Profil() {
  const { username: authUsername, email: authEmail, userId, token, image: authImage, setImage: setAuthImage } = useAuth();
    const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    username: '',
    fullname: '',
    email: '',
    city: '',
    birthDate: '',
    image: '',
  });

const loadUser = useCallback(async () => {
  try {

    const city = await AsyncStorage.getItem('city') || '';
    const birthDate = await AsyncStorage.getItem('birthDate') || '';
    const fullname = await AsyncStorage.getItem('fullname') || '';
    const image = await AsyncStorage.getItem('image') || '';

    setFormData({
      userId,
      username: authUsername,
      email: authEmail,
      city,
      birthDate,
      fullname,
      image,
    });

    logger.log('🧠 Profil verisi yüklendi:', {
      userId, username: authUsername, email: authEmail, city, birthDate, fullname, image,
    });

  } catch (err) {
    logger.error('Profil bilgisi yüklenemedi:', err);
  }
}, [authUsername, authEmail, userId]);

useEffect(() => {
  loadUser();
}, [loadUser]);

const handleChange = useCallback((name, value) => {
  setFormData(prev => ({ ...prev, [name]: value }));
}, []);

const handleImageUpload = useCallback(async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (!result.canceled && !result.cancelled) {

    const uri = result.assets[0].uri;
    setFormData(prev => ({ ...prev, image: uri }));
  }
}, []);

const handleUpdate = useCallback(async () => {
  try {
    const token = await getSecureItem('accessToken');

    const formDataToSend = new FormData();
    formDataToSend.append("email", String(formData.email));
    formDataToSend.append("fullname", String(formData.fullname));
    formDataToSend.append("city", String(formData.city));
    formDataToSend.append("birthDate", String(formData.birthDate));

    if (formData.image && !formData.image.startsWith("http")) {
      const uriParts = formData.image.split(".");
      const fileType = uriParts[uriParts.length - 1];

      formDataToSend.append("image", {
        uri: formData.image,
        name: `profile.${fileType}`,
        type: `image/${fileType}`,
      });
    }

    const res = await axiosClient.put("/users/update", formDataToSend, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    });

    const updatedUser = res.data.user;

    // AsyncStorage güncellemeleri
    if (updatedUser.username) await AsyncStorage.setItem("username", updatedUser.username);
    if (updatedUser.email) await AsyncStorage.setItem("email", updatedUser.email);
    if (updatedUser.fullname) await AsyncStorage.setItem("fullname", updatedUser.fullname);
    if (updatedUser.city) await AsyncStorage.setItem("city", updatedUser.city);
    if (updatedUser.birthDate) await AsyncStorage.setItem("birthDate", updatedUser.birthDate);
    if (updatedUser._id) await AsyncStorage.setItem("userId", updatedUser._id);

    // 🔥 KRİTİK: Hem HTTP hem yerel URI'ler için setAuthImage çağır
    if (updatedUser.image) {
      await AsyncStorage.setItem("image", updatedUser.image);
      setAuthImage(updatedUser.image); // Bu satır her durumda çalışmalı
      
      // Yerel state'i de güncelle
      setFormData(prev => ({ ...prev, image: updatedUser.image }));
    }

    Alert.alert("Başarılı", "Bilgiler başarıyla güncellendi!");
    
    // 🔥 EK: Profil verilerini yeniden yükle
    await loadUser();
    
  } catch (err) {
    logger.error('Güncelleme hatası:', err?.response || err);
    Alert.alert("Hata", err.response?.data?.message || err.message);
  }
}, [loadUser, setAuthImage, formData]);



const handleContact = useCallback(() => {
  Linking.openURL('mailto:rotaolusturofficial@gmail.com');
}, []);

const handleDeleteAccount = useCallback(() => {
  Alert.alert('Hesabımı Sil', 'Hesabınızı kalıcı olarak silmek istiyor musunuz?', [
    { text: 'Vazgeç', style: 'cancel' },
    {
      text: 'Evet, Sil',
      style: 'destructive',
      onPress: async () => {
        try {
          const token = await getSecureItem('accessToken');
          await axiosClient.delete('/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          await deleteItems(['accessToken', 'refreshToken']);
          await AsyncStorage.multiRemove([
            'username',
            'email',
            'role',
            'fullname',
            'birthDate',
            'city',
            'image',
            'userId',
          ]);
          setCachedToken(null);
                    setAuthImage('');
          router.push('/login');
        } catch (err) {
          logger.error('Hesap silme hatası:', err?.response || err);
          Alert.alert('Hata', err.response?.data?.message || err.message);
        }
      },
    },
  ]);
}, [setAuthImage]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileImageContainer}>
        <Image
          source={{ uri: formData.image || 'https://via.placeholder.com/120' }}
          style={styles.profileImage}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.uploadButton} onPress={handleImageUpload}>
          <Text style={styles.uploadButtonText}>Profil Fotoğrafı Yükle</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.username}>{formData.username}</Text>
      <Text style={styles.email}>{formData.email}</Text>

   

      <View style={styles.inputGroup}>
        <Text style={styles.label}>E-posta</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => handleChange('email', text)}
        />
      </View>




      <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
        <Text style={styles.saveButtonText}>Bilgileri Güncelle</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton}
            onPress={() => router.push('/change-password')}>
        <Text style={styles.linkButtonText}>Şifreyi Değiştir</Text>
      </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={handleContact}>
        <Text style={styles.linkButtonText}>İletişim / Destek</Text>
      </TouchableOpacity>

<TouchableOpacity onPress={handleDeleteAccount}>
  <Text style={styles.deleteText}>
    Hesabımı silmek istiyorum
  </Text>
</TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f2f2f2',
  },
profileImageContainer: {
  alignItems: 'center',
  marginBottom: 28,
},
profileImage: {
  width: 120,
  height: 120,
  borderRadius: 60,
  borderWidth: 2,
  borderColor: PRIMARY,
  backgroundColor: '#eee',
},
uploadButton: {
  backgroundColor: PRIMARY,
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 20,
  marginTop: 8,
},
uploadButtonText: {
  fontSize: 14,
  color: '#fff',
  fontWeight: '600',
},
username: {
  textAlign: 'center',
  fontSize: 20,
  fontWeight: '700',
  color: TEXT,
},
email: {
  textAlign: 'center',
  color: '#888',
  fontSize: 14,
  marginBottom: 24,
},
inputGroup: {
  marginBottom: 16,
},
label: {
  fontWeight: '600',
  color: TEXT,
  marginBottom: 6,
},
input: {
  backgroundColor: BG,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 8,
  fontSize: 15,
  borderWidth: 1,
  borderColor: '#ccc',
},
saveButton: {
  backgroundColor: PRIMARY,
  padding: 15,
  borderRadius: 8,
  marginTop: 12,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 6,
  elevation: 2,
},
saveButtonText: {
  color: '#fff',
  fontWeight: '600',
  fontSize: 15,
},
linkButton: {
  padding: 14,
  borderRadius: 8,
  marginTop: 12,
  borderWidth: 1,
  borderColor: PRIMARY,
  alignItems: 'center',
},
  linkButtonText: {
    color: PRIMARY,
    fontWeight: '600',
    fontSize: 15,
  },
  deleteButton: {
    backgroundColor: '#d63031',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  deleteText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
  },
});

export default Profil;