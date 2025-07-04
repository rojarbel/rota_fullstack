// app/etkinlik-ekle.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axiosClient from '../src/api/axiosClient';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import useAuth from '../src/hooks/useAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import logger from '../src/utils/logger';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { ActivityIndicator } from 'react-native';



const kategorilerVeTurler = {
  Aktivizm: [
    'Hayvan Hakları', 'İklim ve Ekoloji', 'İşçi Hakları', 'Kadın Hakları',
    'LGBTİ+ Etkinlikleri', 'Mülteci Hakları'
  ],
  Atölye: ['Fotoğraf Atölyesi', 'Hikâye Anlatımı', 'Kodlama', 'Müzik Atölyesi', 'Sanat Atölyesi', 'Zanaat'],
  Dans: ['Breakdance', 'Halk Dansları', 'Modern Dans', 'Salsa / Bachata', 'Swing', 'Tango'],
  Konferans: ['Akademik Konferans', 'Çevre ve Sürdürülebilirlik', 'Girişimcilik & İnovasyon', 'Kent ve Mekân', 'Kültürel Çalışmalar', 'Psikoloji', 'Toplumsal Cinsiyet ve Eşitlik'],
  Konser: ['Arabesk', 'Elektronik', 'Halk Müziği', 'Jazz', 'Pop', 'Rap', 'Rock', 'Sanat Müziği'],
  Sergi: ['Fotoğraf Sergisi', 'İllüstrasyon & Grafik', 'Heykel', 'Karma Sergi', 'Modern Sanat'],
  Sinema: ['Açık Hava', 'Bağımsız Film', 'Festival Gösterimi', 'Gala Gösterimi', 'Kısa Film Gecesi'],
  Spor: ['Bisiklet', 'Ekstrem Sporlar', 'E-Spor', 'İzleyici Etkinliği', 'Kamp', 'Su Sporları', 'Trekking', 'Yoga / Meditasyon'],
  Tiyatro: ['Çocuk', 'Dram', 'Komedi', 'Müzikal', 'Stand-Up', 'Trajedi']
};

const EtkinlikEkleScreen = () => {
  const router = useRouter();
  const { isLoggedIn, authLoaded } = useAuth();

  useEffect(() => {
    if (authLoaded && !isLoggedIn) {
      router.replace('/login');
    }
  }, [authLoaded, isLoggedIn]);

useEffect(() => {
  let isMounted = true;
  const fetchLocation = async (retries = 3) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Konum izni reddedildi');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      if (isMounted) {
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      if (retries > 0) {
        setTimeout(() => fetchLocation(retries - 1), 1500);
      } else {
        alert('Konum alınamadı, lütfen tekrar deneyin.');
      }
    }
  };

  fetchLocation();

  return () => {
    isMounted = false;
  };
}, []);

  const [location, setLocation] = useState(null);
  const [markerCoords, setMarkerCoords] = useState(null);
  const [baslik, setBaslik] = useState('');
  const [sehir, setSehir] = useState(''); // ✅ Zaten boş string
  const [tarih, setTarih] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [selectedKategori, setSelectedKategori] = useState(''); // ✅ Zaten boş string
  const [selectedTur, setSelectedTur] = useState(''); // ✅ Zaten boş string
  const [fiyat, setFiyat] = useState('');
  const [gorsel, setGorsel] = useState(null);
  const [gorselPreview, setGorselPreview] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());


  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Galeriye erişim izni gerekli.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!pickerResult.cancelled) {
      const uri = pickerResult.assets[0].uri;
      setGorsel(uri);
      setGorselPreview(uri);
    }
  };

const handleSubmit = async () => {
  if (!markerCoords) {
  alert("Lütfen haritada etkinliğin konumunu seçin.");
  return;}
  const formData = new FormData();
  formData.append('baslik', baslik);
  formData.append('sehir', sehir);
  formData.append('kategori', selectedKategori);
  formData.append('tur', selectedTur);
  formData.append('tarih', tarih);
  formData.append('fiyat', fiyat);
  formData.append('aciklama', aciklama);
  if (markerCoords) {
  formData.append('latitude', markerCoords.latitude);
  formData.append('longitude', markerCoords.longitude);
}
  if (gorsel) {
    const fileName = gorsel.split('/').pop();
    const fileType = fileName.split('.').pop();
    const mime = `image/${fileType || 'jpeg'}`;

    // ✅ Dosya URI'yi blob'a çevir ve append et
    const fileInfo = await FileSystem.getInfoAsync(gorsel);
    if (fileInfo.exists) {
      formData.append('gorsel', {
        uri: fileInfo.uri,
        name: fileName,
        type: mime,
      });
    } else {
      alert("Görsel dosyası bulunamadı.");
      return;
    }
  }

  try {
   const res = await axiosClient.post('/etkinlik', formData, {
   headers: { 'Content-Type': 'multipart/form-data' }
 });

    alert('Etkinlik başarıyla gönderildi!');
    setBaslik('');
    setSehir('');
    setSelectedKategori('');
    setSelectedTur('');
    setTarih('');
    setFiyat('');
    setAciklama('');
    setGorsel(null);
    setGorselPreview(null);
    setMarkerCoords(null); // ✅ Harita marker'ını da sıfırla
    router.push('/');
  } catch (error) {
    logger.error('Etkinlik gönderme hatası:', error.response?.data || error.message);
    alert('Gönderim sırasında bir hata oluştu.');
  }
};
  
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.title}>Etkinlik Ekle</Text>

      <TextInput
        style={styles.input}
        placeholder="Etkinlik Başlığı"
        placeholderTextColor="#999"
        value={baslik}
        onChangeText={setBaslik}
      />

<View style={styles.pickerWrapper}>
  <Picker
    selectedValue={sehir || ''} // ✅ Boş string garantisi
    onValueChange={(val) => setSehir(val)}
    style={{ flex: 1 }}
  >
    <Picker.Item label="Şehir Seçin" value="" />
    {[  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın",
    "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı",
    "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep",
    "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars",
    "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa",
    "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun",
    "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van",
    "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", "Bartın",
    "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"].map(city => (
      <Picker.Item key={city} label={city} value={city} />
    ))}
  </Picker>
</View>

<View style={styles.pickerWrapper}>
  <Picker
    selectedValue={selectedKategori || ''} // ✅ Boş string garantisi
    onValueChange={(itemValue) => {
      setSelectedKategori(itemValue);
      setSelectedTur(''); // Tür'ü sıfırla
    }}
    style={{ flex: 1 }}
  >
    <Picker.Item label="Kategori Seçin" value="" />
    {Object.keys(kategorilerVeTurler).map((kategori) => (
      <Picker.Item key={kategori} label={kategori} value={kategori} />
    ))}
  </Picker>
</View>

{selectedKategori !== '' && (
  <View style={styles.pickerWrapper}>
    <Picker
      selectedValue={selectedTur || ''} // ✅ Boş string garantisi
      onValueChange={(itemValue) => setSelectedTur(itemValue)}
      style={{ flex: 1 }}
    >
      <Picker.Item label="Tür Seçin" value="" />
      {kategorilerVeTurler[selectedKategori]?.map((tur) => ( // ✅ Optional chaining eklendi
        <Picker.Item key={tur} label={tur} value={tur} />
      ))}
    </Picker>
  </View>
)}

            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: tarih ? '#000' : '#aaa' }}>
                {tarih || 'Tarih Seçin'}
              </Text>
            </TouchableOpacity>

{showDatePicker && (
  <DateTimePicker
    value={selectedDate}
    mode="date"
    display="default"
    onChange={(event, selectedDate) => {
      // Android için picker'ı her zaman kapat
      // iOS için sadece kullanıcı "Done" dediğinde kapat
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
      
      // Her iki platform için de: eğer tarih seçildiyse kaydet
      if (selectedDate && selectedDate instanceof Date) {
        const gun = String(selectedDate.getDate()).padStart(2, '0');
        const ay = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const yil = selectedDate.getFullYear();
        const formatted = `${yil}-${ay}-${gun}`;
        setTarih(formatted);
        setSelectedDate(selectedDate);
        
        // iOS için de picker'ı kapat (isteğe bağlı)
        if (Platform.OS === 'ios') {
          setShowDatePicker(false);
        }
      }
    }}
  />
)}

      <TextInput
        style={styles.input}
        placeholder="Fiyat (₺)"
        placeholderTextColor="#999"
        value={fiyat}
        onChangeText={setFiyat}
        keyboardType="numeric"
      />

      <TouchableOpacity onPress={handleImagePick} style={styles.imageButton}>
        <Text style={styles.imageButtonText}>Görsel Seç</Text>
      </TouchableOpacity>

      {gorselPreview && (
        <Image
          source={{ uri: gorselPreview }}
          style={styles.imagePreview}
          resizeMode="cover"
        />
      )}

      <TextInput
        style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
        placeholder="Açıklama"
        placeholderTextColor="#999"
        value={aciklama}
        onChangeText={setAciklama}
        multiline
        numberOfLines={6}
      />
        <Text style={styles.label}>Etkinlik Konumu</Text>

{location ? (
  <View style={{ height: 250, marginBottom: 16 }}>
    <MapView
      style={{ flex: 1, borderRadius: 10 }}
      initialRegion={location}
      onPress={(e) => setMarkerCoords(e.nativeEvent.coordinate)}
    >
      {markerCoords && (
        <Marker coordinate={markerCoords} title="Etkinlik Konumu" />
      )}
    </MapView>
    <Text style={{ marginTop: 6, fontSize: 14, color: '#666' }}>
      Haritaya dokunarak etkinliğin yerini seçin.
    </Text>
  </View>
) : (
  <View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: 'gray', marginBottom: 10 }}>Konum yükleniyor...</Text>
    <ActivityIndicator size="large" color="#7B2CBF" />
  </View>
)}

<TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
  <Text style={styles.submitButtonText}>Gönder</Text>
</TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f2f2f2',
  },
title: {
  fontSize: 26,
  fontWeight: '800',
  color: '#333',
  marginBottom: 28,
  textAlign: 'center',
},
input: {
  backgroundColor: '#fff',
  paddingVertical: 14,
  paddingHorizontal: 16,
  fontSize: 16,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#ddd',
  marginBottom: 16,
},
label: {
  fontWeight: '600',
  color: '#555',
  marginBottom: 6,
  marginTop: 6,
},
picker: {
  backgroundColor: '#fff',
  borderRadius: 10,
  borderColor: '#ddd',
  borderWidth: 1,
  paddingHorizontal: 6,
  marginBottom: 16,
},
imageButton: {
  backgroundColor: '#7B2CBF',
  paddingVertical: 12,
  borderRadius: 10,
  marginBottom: 14,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
},
  imageButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  submitButton: {
  backgroundColor: '#7B2CBF',
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: 'center',
  marginTop: 8,
},
submitButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
},
pickerWrapper: {
  backgroundColor: '#fff',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#ddd',
  marginBottom: 16,
  height: 52,
  justifyContent: 'center',
},

});

export default EtkinlikEkleScreen;
