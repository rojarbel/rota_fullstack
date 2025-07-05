// app/etkinlik-ekle.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Platform, Alert, Modal, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axiosClient from '../src/api/axiosClient';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import useAuth from '../src/hooks/useAuth';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as FileSystem from 'expo-file-system';
import logger from '../src/utils/logger';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Switch } from 'react-native';


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

const sehirListesi = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın",
  "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı",
  "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep",
  "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars",
  "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa",
  "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun",
  "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van",
  "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", "Bartın",
  "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];



// ... kategorilerVeTurler ve sehirListesi aynı kalıyor ...

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
          Alert.alert('Uyarı', 'Konum izni reddedildi');
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
          Alert.alert('Hata', 'Konum alınamadı, lütfen tekrar deneyin.');
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
  const [sehir, setSehir] = useState('');
  const [tarih, setTarih] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('');
  const [selectedTur, setSelectedTur] = useState('');
  const [fiyat, setFiyat] = useState('');
  const [gorsel, setGorsel] = useState(null);
  const [gorselPreview, setGorselPreview] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [gizli, setGizli] = useState(false);


  const formatDate = (date) => {
    const gun = String(date.getDate()).padStart(2, '0');
    const ay = String(date.getMonth() + 1).padStart(2, '0');
    const yil = date.getFullYear();
    return `${yil}-${ay}-${gun}`;
  };

  const handleConfirm = (date) => {
    if (date && date instanceof Date && !isNaN(date)) {
      const formatted = formatDate(date);
      setTarih(formatted);
      setSelectedDate(date);
    }
    setShowDatePicker(false);
  };

  const handleCancel = () => {
    setShowDatePicker(false);
  };

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Uyarı', 'Galeriye erişim izni gerekli.');
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
    Alert.alert('Uyarı', 'Lütfen haritada etkinliğin konumunu seçin.');
    return;
  }

  const formData = new FormData();
  formData.append('baslik', baslik);
  formData.append('sehir', sehir);
  formData.append('kategori', selectedKategori);
  formData.append('tur', selectedTur);
  formData.append('tarih', tarih);
  formData.append('fiyat', fiyat);
  formData.append('aciklama', aciklama);
  formData.append('gizli', gizli); // Gizli durumunu ekle

  if (markerCoords) {
    formData.append('latitude', markerCoords.latitude);
    formData.append('longitude', markerCoords.longitude);
  }

  if (gorsel) {
    const fileName = gorsel.split('/').pop();
    const fileType = fileName.split('.').pop();
    const mime = `image/${fileType || 'jpeg'}`;

    const fileInfo = await FileSystem.getInfoAsync(gorsel);
    if (fileInfo.exists) {
      formData.append('gorsel', {
        uri: fileInfo.uri,
        name: fileName,
        type: mime,
      });
    } else {
      Alert.alert('Hata', 'Görsel dosyası bulunamadı.');
      return;
    }
  }

  try {
    const res = await axiosClient.post('/etkinlik', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Başarı mesajını gizli etkinlik durumuna göre ayarla
    const successMessage = gizli 
      ? 'Gizli etkinlik başarıyla oluşturuldu! Sadece direkt linkle erişilebilir.'
      : 'Etkinlik başarıyla gönderildi!';
    
    Alert.alert('Başarılı', successMessage);
    
    // Form alanlarını temizle
    setBaslik('');
    setSehir('');
    setSelectedKategori('');
    setSelectedTur('');
    setTarih('');
    setFiyat('');
    setAciklama('');
    setGorsel(null);
    setGorselPreview(null);
    setMarkerCoords(null);
    setGizli(false);

    // Etkinlik sayfasına yönlendir (hem gizli hem normal etkinlikler için)
    if (res.data && res.data._id) {
      router.push(`/etkinlik/${res.data._id}`);
    } else {
      // Eğer ID yoksa ana sayfaya yönlendir
      router.push('/');
    }
  } catch (error) {
    logger.error('Etkinlik gönderme hatası:', error.response?.data || error.message);
    Alert.alert('Hata', 'Gönderim sırasında bir hata oluştu.');
  }
};







  return (
<ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEnabled={!showDatePicker}
    >
      <Text style={styles.title}>Etkinlik Ekle</Text>

      <TextInput
        style={styles.input}
        placeholder="Etkinlik Başlığı"
        placeholderTextColor="#999"
        value={baslik}
        onChangeText={setBaslik}
      />

      {/* Şehir Seçimi */}
      <View style={styles.pickerContainer}>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={sehir}
            onValueChange={(itemValue) => setSehir(itemValue)}
            style={Platform.OS === 'ios' ? styles.pickerIOS : styles.pickerAndroid}
            itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : {}}
          >
            <Picker.Item label="Şehir Seçin" value="" />
            {sehirListesi.map((city) => (
              <Picker.Item key={city} label={city} value={city} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Kategori Seçimi */}
      <View style={styles.pickerContainer}>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedKategori}
            onValueChange={(itemValue) => {
              setSelectedKategori(itemValue);
              setSelectedTur('');
            }}
            style={Platform.OS === 'ios' ? styles.pickerIOS : styles.pickerAndroid}
            itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : {}}
          >
            <Picker.Item label="Kategori Seçin" value="" />
            {Object.keys(kategorilerVeTurler).map((kategori) => (
              <Picker.Item key={kategori} label={kategori} value={kategori} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Tür Seçimi */}
      {selectedKategori !== '' && (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Tür</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedTur}
              onValueChange={(itemValue) => setSelectedTur(itemValue)}
              style={Platform.OS === 'ios' ? styles.pickerIOS : styles.pickerAndroid}
              itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : {}}
            >
              <Picker.Item label="Tür Seçin" value="" />
              {kategorilerVeTurler[selectedKategori]?.map((tur) => (
                <Picker.Item key={tur} label={tur} value={tur} />
              ))}
            </Picker>
          </View>
        </View>
      )}

      {/* Tarih Seçimi */}
<View style={styles.dateContainer}>
  <TouchableOpacity
    style={styles.dateButton}
    onPress={() => setShowDatePicker(true)}
    disabled={showDatePicker}
  >
    <Text style={[styles.dateButtonText, { color: tarih ? '#333' : '#999' }]}>
      {tarih || 'Tarih Seçin'}
    </Text>
  </TouchableOpacity>
  <DateTimePickerModal
    isVisible={showDatePicker}
    mode="date"
    onConfirm={handleConfirm}
    onCancel={handleCancel}
    date={selectedDate}
    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
    confirmText="Onayla"
    cancelText="İptal"
    headerTextIOS="Tarih Seçin"
    minimumDate={new Date()} // Geçmiş tarihleri engelle
  />
</View>

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
      
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#5f5f5f', flex: 1 }}>
          Gizli Etkinlik
        </Text>
        <Switch
          value={gizli}
          onValueChange={(value) => setGizli(value)}
          trackColor={{ false: '#ccc', true: '#7B2CBF' }}
          thumbColor={gizli ? '#fff' : '#f4f3f4'}
        />
      </View>

      {gizli && (
        <View style={{ padding: 10, backgroundColor: '#FFF3CD', borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ color: '#856404', fontSize: 14 }}>
            Bu etkinlik gizlidir. Sadece bağlantısını bilenler erişebilir. Etkinlik linkini kaydetmeyi veya favorilere eklemeyi unutmayın.
          </Text>
        </View>
      )}



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
          <Text style={{ marginTop: 6, fontSize: 14, color: '#5f5f5f' }}>
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
    fontSize: 24,
    fontWeight: '600',
    color: '#5f5f5f',
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
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    ...Platform.select({
      ios: { height: 120 },
      android: { height: 52, justifyContent: 'center' },
    }),
  },
  pickerIOS: {
    height: 180,
    backgroundColor: 'transparent',
  },
  pickerAndroid: {
    height: 52,
    backgroundColor: 'transparent',
  },
  pickerItemIOS: {
    fontSize: 16,
    color: '#333',
    height: 120,
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
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
});

export default EtkinlikEkleScreen;