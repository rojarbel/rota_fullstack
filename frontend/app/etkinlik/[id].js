import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem as getSecureItem } from '../../src/utils/storage';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from '../../src/context/AuthContext';
import { router } from 'expo-router';
import FastImage from 'expo-fast-image';
import axiosClient from '../../src/api/axiosClient';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { KeyboardAvoidingView } from 'react-native';
import CommentCard from '../../src/components/CommentCard';
import logger from '../../src/utils/logger';
import formatDate from '../../src/utils/formatDate';
import { IMAGE_BASE_URL } from '../../src/constants';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

const PRIMARY = '#7B2CBF';
const ACCENT = '#FFD54F';
const TEXT = '#333';
const backendURL = IMAGE_BASE_URL;

export default function EtkinlikDetay() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const scrollViewRef = useRef(null);

  const getYanitlar = (parentId) => yorumlar.filter(y => y.ustYorumId === parentId);

  const [etkinlik, setEtkinlik] = useState(null);
  const [favorideMi, setFavorideMi] = useState(false);
  const auth = useContext(AuthContext);
  const isAdmin = auth?.role?.toLowerCase() === 'admin';
  const [yorumlar, setYorumlar] = useState([]);
  const [favorileyenler, setFavorileyenler] = useState([]);
  const [favoriSayisi, setFavoriSayisi] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [yeniYorum, setYeniYorum] = useState("");
  const [yanitId, setYanitId] = useState(null);
  const [yanitlar, setYanitlar] = useState({});




  const fetchFavorileyenler = async (isMounted = () => true) => {
    if (!etkinlik) return;

    try {
      const { data } = await axiosClient.get(`/etkinlik/${etkinlik.id}/favorileyenler`);
      let users = data.users || [];
      users = await Promise.all(
        users.map(async (u) => {
          if (u.image || u.avatarUrl) return u;
          try {
            const { data: info } = await axiosClient.get(`/users/${u.id}`);
            return { ...u, image: info.image || info.avatarUrl };
          } catch {
            return u;
          }
        })
      );
      if (isMounted()) {
        setFavorileyenler(users);
        setFavoriSayisi(data.toplam || users.length);
      }
    } catch {
      if (isMounted()) {
        setFavorileyenler([]);
        setFavoriSayisi(0);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadFavorileyenler = async () => {
      await fetchFavorileyenler(() => isMounted);
    };
    loadFavorileyenler();
    return () => {
      isMounted = false;
    };
  }, [etkinlik]);

  const paylas = async (tip) => {
    const url = `https://rota.app/etkinlik/${etkinlik.id}`;
    const mesaj = `${etkinlik.baslik} - ${formatDate(etkinlik.tarih)}\n${url}`;


    try {
      switch (tip) {
          case "instagram": {
          try {
            const permission = await MediaLibrary.requestPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("İzin Gerekli", "Paylaşım için galeri izni gerekli.");
              return;
            }

            const imageUrl = etkinlik.gorsel?.startsWith('http')
              ? etkinlik.gorsel
              : `${IMAGE_BASE_URL}${etkinlik.gorsel}`;

            const localPath = FileSystem.documentDirectory + `story_${Date.now()}.jpg`;
            const download = FileSystem.createDownloadResumable(imageUrl, localPath);
            const { uri } = await download.downloadAsync();

            // Görseli galeriye kaydet
            await MediaLibrary.createAssetAsync(uri);
            
            Alert.alert(
              "Paylaşım Hazır",
              "Instagram, güvenlik nedenleriyle direkt story paylaşımını kısıtladı. Artık sadece görseli galeriye kaydedip kullanıcının manuel olarak Instagram'da paylaşmasını sağlayabiliyoruz.",
              [
                { text: "Tamam", style: "default" },
                { 
                  text: "Instagram'ı Aç", 
                  onPress: () => {
                    Linking.openURL('instagram://app').catch(() => {
                      Linking.openURL('https://www.instagram.com');
                    });
                  }
                }
              ]
            );
          } catch (err) {
            console.error('Instagram paylaşım hatası:', err);
            Alert.alert("Hata", "Instagram paylaşımı gerçekleştirilemedi.");
          }
          break;
        }
        case "facebook":
          await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
          break;
        case "twitter":
          await Linking.openURL(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(etkinlik.baslik)}`);
          break;
        case "whatsapp":
          await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(mesaj)}`);
          break;
        case "email":
          await Linking.openURL(`mailto:?subject=${encodeURIComponent(etkinlik.baslik)}&body=${encodeURIComponent(mesaj)}`);
          break;
        case "kopyala":
          await Clipboard.setStringAsync(url);
          Alert.alert("Kopyalandı", "Bağlantı panoya kopyalandı");
          break;
        default:
          Alert.alert("Paylaşım başarısız", "Geçersiz paylaşım tipi");
          break;
      }
    } catch (err) {
      Alert.alert("Hata", "Paylaşım gerçekleştirilemedi.");
    }
  };



const yanitGonder = async (yorumId) => {
  const metin = yanitlar[yorumId]?.trim();
  if (!metin) return;

  // Optimistic UI - hemen yanıt ekle
  const tempYanit = {
    _id: `temp-yanit-${Date.now()}`,
    yorum: metin,
    kullanici: auth?.username || 'Kullanıcı',
    avatarUrl: await AsyncStorage.getItem('image') || '',
    tarih: new Date().toISOString(),
    ustYorumId: yorumId,
    tempYorum: true
  };
  
  setYorumlar(prev => [...prev, tempYanit]);
  const eskiMetin = metin;
  setYanitlar(prev => ({ ...prev, [yorumId]: '' }));
  setYanitId(null);

  try {
    const token = await getSecureItem('accessToken'); 
    const image = await AsyncStorage.getItem('image');

    const { data } = await axiosClient.post('/yorum', {
      etkinlikId: etkinlik.id,
      yorum: eskiMetin,
      yanitId: yorumId,
      avatarUrl: image,
    });

    // Geçici yanıtı gerçek yanıtla değiştir
    setYorumlar(prev => prev.map(y => 
      y._id === tempYanit._id ? data : y
    ));
  } catch (err) {
    // Hata durumunda geçici yanıtı kaldır
    setYorumlar(prev => prev.filter(y => y._id !== tempYanit._id));
    setYanitlar(prev => ({ ...prev, [yorumId]: eskiMetin }));
    setYanitId(yorumId);
    Alert.alert("Hata", "Yanıt gönderilemedi.");
  }
};



  useEffect(() => {
        let isMounted = true;
    const yorumlariGetir = async () => {
      try {
        const { data } = await axiosClient.get(`/yorum/${id}`);
        if (isMounted) setYorumlar(data);
      } catch (err) {
        logger.log('Yorumlar alınamadı', err);
      }
    };
    if (etkinlik) yorumlariGetir();
        return () => {
      isMounted = false;
    };
  }, [etkinlik]);

const yorumGonder = async () => {
  if (!yeniYorum.trim()) return;

  // Optimistic UI - hemen yorum ekle
  const tempYorum = {
    _id: `temp-${Date.now()}`,
    yorum: yeniYorum,
    kullanici: auth?.username || 'Kullanıcı',
    avatarUrl: await AsyncStorage.getItem('image') || '',
    tarih: new Date().toISOString(),
    tempYorum: true // geçici yorum işareti
  };
  
  setYorumlar(prev => [tempYorum, ...prev]);
  const eskiYorum = yeniYorum;
  setYeniYorum("");

  try {
    const token = await getSecureItem('accessToken');
    const image = await AsyncStorage.getItem('image');
    const { data } = await axiosClient.post('/yorum', {
      etkinlikId: etkinlik.id,
      yorum: eskiYorum,
      avatarUrl: image,
    });

    // Geçici yorumu gerçek yorumla değiştir
    setYorumlar(prev => prev.map(y => 
      y._id === tempYorum._id ? data : y
    ));
  } catch (err) {
    // Hata durumunda geçici yorumu kaldır ve input'u geri getir
    setYorumlar(prev => prev.filter(y => y._id !== tempYorum._id));
    setYeniYorum(eskiYorum);
    Alert.alert("Hata", "Yorum gönderilemedi.");
  }
};

  useEffect(() => {
        let isMounted = true;
    const fetchEtkinlik = async () => {
      try {
        const { data } = await axiosClient.get(`/etkinlik/${id}`);

        if (data._id && !data.id) data.id = data._id;
        if (isMounted) setEtkinlik(data);
      } catch (err) {
        logger.error('Etkinlik verisi alınamadı', err);
      }
    };
    fetchEtkinlik();
        return () => {
      isMounted = false;
    };
  }, [id]);

    useEffect(() => {
      if (etkinlik) checkFavori();
    }, [etkinlik]);

const [favoriLoading, setFavoriLoading] = useState(false); // State tanımlamasına ekle

const favoriToggle = async () => {
  // Eğer işlem devam ediyorsa, yeni işlem başlatma
  if (favoriLoading) return;
  
  const token = await getSecureItem('accessToken');
  if (!token) {
    router.replace('/login');
    return;
  }
  
  setFavoriLoading(true); // Loading başlat
  
  // Optimistic UI - hemen güncelle
  const eskiFavoriDurumu = favorideMi;
  const eskiFavoriSayisi = favoriSayisi;
  
  setFavorideMi(!favorideMi);
  setFavoriSayisi(prev => favorideMi ? prev - 1 : prev + 1);
  
  try {
    const etkinlikId = etkinlik._id || etkinlik.id;
    
    if (favorideMi) {
      await axiosClient.delete(`/etkinlik/favori/${etkinlikId}`);
    } else {
      await axiosClient.post('/etkinlik/favori', { etkinlikId });
    }
    
    await fetchFavorileyenler();
    setTimeout(checkFavori, 500);
    
  } catch (err) {
    console.error('Favori toggle hatası:', err);
    // Hata durumunda eski haline döndür
    setFavorideMi(eskiFavoriDurumu);
    setFavoriSayisi(eskiFavoriSayisi);
    Alert.alert("Hata", "Favori işlemi başarısız oldu. Lütfen tekrar deneyin.");
  } finally {
    setFavoriLoading(false); // Loading bitir
  }
};

    const checkFavori = async () => {
      if (!etkinlik) return;
      try {
        const { data } = await axiosClient.get(`/etkinlik/${etkinlik.id}/favorileyenler`);
        const mevcut = data.users?.some(u => u.id === auth.userId);
        setFavorideMi(mevcut);
      } catch (err) {
        setFavorideMi(false);
      }
    };

  const etkinlikSil = async () => {
    Alert.alert('Sil?', 'Etkinliği silmek istiyor musun?', [
      {
        text: 'İptal', style: 'cancel'
      },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            const token = await getSecureItem('accessToken');
            await axiosClient.delete(`/etkinlik/${etkinlik.id}`);

            Alert.alert('Silindi', 'Etkinlik silindi.');
            navigation.navigate('AnaSayfa');
          } catch (err) {
            Alert.alert('Hata', 'Silme başarısız.');
          }
        }
      }
    ]);
  };

  if (!etkinlik) {
    return <Text style={{ textAlign: 'center', marginTop: 20 }}>Etkinlik yükleniyor...</Text>;
  }


const gorselSrc = etkinlik.gorsel?.startsWith('http') ? etkinlik.gorsel : `${backendURL}${etkinlik.gorsel}`;

  return (
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  style={{ flex: 1 }}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
>
<ScrollView
  ref={scrollViewRef}
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="interactive"
  contentInsetAdjustmentBehavior="automatic"
  contentContainerStyle={{
    padding: 16,
    paddingBottom: 200,
    backgroundColor: '#f2f2f2' // AÇIK GRİ ARKA PLAN
  }}
>
        <FastImage
          uri={gorselSrc}
          cacheKey={etkinlik.id}
          style={{
            width: '100%',
            height: 300,
            borderRadius: 16,
            backgroundColor: '#e0e0e0',
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        />

        <View
          style={{
            marginTop: 24,
            backgroundColor: '#fff',
            borderRadius: 14,
            padding: 20,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '700', lineHeight: 30, color: '#111' }}>
            {etkinlik.baslik}
          </Text>
          <Text style={{ fontSize: 15, color: '#666', marginTop: 6 }}>
            {etkinlik.kategori}
          </Text>

          <Text style={{ color: '#666', marginBottom: 2 }}>🏷️ {etkinlik.tur}</Text>
          <Text style={{ color: '#666', marginBottom: 2 }}>📍 {etkinlik.sehir}</Text>
          <Text style={{ color: '#666', marginBottom: 2 }}>📅 {formatDate(etkinlik.tarih)}</Text>
                    <Text style={{ color: PRIMARY, fontWeight: '600' }}>
            💰 {(etkinlik.fiyat && etkinlik.fiyat !== '0') ? `${etkinlik.fiyat} ₺` : 'Ücretsiz'}
          </Text>

          <TouchableOpacity
            onPress={favoriToggle}
              disabled={favoriLoading}
            style={{
              marginTop: 24,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: favoriLoading ? '#ccc' : PRIMARY, // Loading sırasında gri
              shadowColor: '#000',
              shadowOpacity: 0.04,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 4,
              elevation: 2,
            }}
          >
              <Text style={{
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '600',
                color: '#fff',
              }}>
              {favorideMi ? 'Favoriden Çıkar' : 'Favorilere Ekle'}
            </Text>
          </TouchableOpacity>

          {isAdmin && (
            <View style={{ marginTop: 24, gap: 12 }}>
              <TouchableOpacity
                onPress={async () => {
                  const token = await getSecureItem('accessToken');
                  router.push({
                    pathname: '/admin/duzenle',
                    params: { ...etkinlik, token },
                  });
                }}
                style={{
                  backgroundColor: '#00cec9',
                  paddingVertical: 14,
                  borderRadius: 10,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
                  ✏️ Etkinliği Düzenle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={etkinlikSil}
                style={{
                  backgroundColor: '#d63031',
                  paddingVertical: 14,
                  borderRadius: 10,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
                  🗑️ Etkinliği Sil
                </Text>
              </TouchableOpacity>
            </View>
          )}

<View
  style={{
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 12,
    columnGap: 16
  }}
>
  {[
    { tip: 'instagram', Icon: FontAwesome, name: 'instagram' },
    { tip: 'facebook', Icon: FontAwesome, name: 'facebook' },
    { tip: 'twitter', Icon: FontAwesome, name: 'twitter' },
    { tip: 'whatsapp', Icon: FontAwesome, name: 'whatsapp' },
    { tip: 'email', Icon: MaterialCommunityIcons, name: 'email-outline' },
    { tip: 'kopyala', Icon: FontAwesome, name: 'link' },
  ].map(({ tip, Icon, name }) => (
    <TouchableOpacity
      key={tip}
      onPress={() => paylas(tip)}
      style={{
        width: 39,
        height: 39,
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Icon name={name} size={20} color="#444" />
    </TouchableOpacity>
  ))}
</View>
        </View>

        <View style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 16,
          marginTop: 24,
        }}>
          <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 6, color: TEXT }}>Açıklama</Text>
          <Text style={{ color: '#666', lineHeight: 22 }}>
            {etkinlik.aciklama || 'Açıklama eklenmemiş.'}
          </Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 24 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 12, color: TEXT }}>Favoriye Ekleyenler</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {favorileyenler.slice(0, 6).map(user => {
              const raw = user.avatarUrl || user.image || user.avatar || '';
              const avatar = raw && raw.trim() !== ''
                ? (raw.startsWith('http') ? raw : `${backendURL}${raw}`)
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.kullanici || user.username || 'Kullanıcı')}`;

              return (
                <Image
                  key={user.id}
                  source={{ uri: avatar }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              );
            })}
          </View>
          <Text style={{ marginTop: 12, color: '#666' }}>{favoriSayisi} kişi favorilere ekledi</Text>
          {favoriSayisi > 6 && (
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={{ marginTop: 6, color: PRIMARY, fontWeight: '600' }}>Tümünü Gör</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 16,
          marginTop: 24,
        }}>
          <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 12, color: TEXT }}>
            Yorumlar
          </Text>

          {yorumlar.length === 0 ? (
            <Text style={{ color: '#aaa' }}>Henüz yorum yapılmamış.</Text>
          ) : (
            yorumlar.filter(y => !y.ustYorumId).map(y => (
                            <CommentCard
                key={y._id}
                yorum={y}
                level={0}
                getYanitlar={getYanitlar}
                yanitId={yanitId}
                setYanitId={setYanitId}
                yanitlar={yanitlar}
                setYanitlar={setYanitlar}
                yanitGonder={yanitGonder}
                setYorumlar={setYorumlar}
              />
            ))
          )}

          {auth?.token ? (
            <View style={{ marginTop: 16, paddingBottom: 40 }}>
              <TextInput
                placeholder="Yorumunuzu yazın..."
                value={yeniYorum}
                onChangeText={setYeniYorum}
              multiline
              scrollEnabled={false}
                style={{
                 borderColor: '#ddd',
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  minHeight: 70,
                }}
              
              />
              <TouchableOpacity
                onPress={yorumGonder}
                style={{
                  backgroundColor: PRIMARY,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignSelf: 'flex-end',
                  width: 120,
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
                  Gönder
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={{ color: '#999', marginTop: 12 }}>
              Yorum yapmak için giriş yapmalısınız.
            </Text>
          )}
        </View>

        {modalVisible && (
          <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '85%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: TEXT }}>Tüm Favorileyenler</Text>
              <ScrollView>


                {favorileyenler.map(user => {
                  const raw = user.avatarUrl || user.image || user.avatar || '';
                  const avatar = raw && raw.trim() !== '' ? (raw.startsWith('http') ? raw : `${backendURL}${raw}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.kullanici || user.username)}`;
                  return (
                    <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Image
                        source={{ uri: avatar }}
                        style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                      />
                      <Text style={{ fontSize: 16 }}>{user.kullanici}</Text>
                    </View>
                  );
                })}
              </ScrollView>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 12, backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 10 }}>
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
       </ScrollView>
</KeyboardAvoidingView>
  );
}