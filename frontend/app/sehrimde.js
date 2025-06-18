// app/sehrimde.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem as getSecureItem } from '../src/utils/storage';
import { useMemo } from 'react';

const cities = [
  "Adana", "Adıyaman", "Afyon", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın",
  "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı",
  "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep",
  "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars",
  "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa",
  "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun",
  "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van",
  "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", "Bartın",
  "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];


const PRIMARY = '#7B2CBF';
const TEXT = '#333';

export default function Sehrimde() {
  const citiesMemo = useMemo(() => cities, []);
  useEffect(() => {
  const checkLogin = async () => {
    const token = await getSecureItem('accessToken');
    if (!token) {
      router.replace('/login');
    }
  };
  checkLogin();
}, []);
  const handleCitySelect = (city) => {
    router.push({ pathname: '/arama-sonuclari', params: { sehir: city } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Şehir Seç</Text>
      <FlatList
        data={citiesMemo}
        keyExtractor={(item) => item}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.cityButton, { flex: 1, marginHorizontal: 6 }]} onPress={() => handleCitySelect(item)}>
            <Text style={styles.cityText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#fff',
  },
header: {
  fontSize: 24,
  fontWeight: 'bold',
  marginBottom: 20,
  textAlign: 'center',
  color: TEXT,
},
cityButton: {
  backgroundColor: PRIMARY,
  paddingVertical: 16,
  paddingHorizontal: 12,
  marginBottom: 12,
  borderRadius: 12,
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
},
cityText: {
  color: '#fff',
  textAlign: 'center',
  fontWeight: '600',
  fontSize: 16,
  letterSpacing: 0.5,
},
});
