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

const PRIMARY = '#7B2CBF';
const ACCENT = '#FFD54F';
const TEXT = '#333';
const backendURL = 'https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net';

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

  const fetchFavorileyenler = async () => {
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
      setFavorileyenler(users);
      setFavoriSayisi(data.toplam || users.length);
    } catch {
      setFavorileyenler([]);
      setFavoriSayisi(0);
    }
  };

  useEffect(() => {
    fetchFavorileyenler();
  }, [etkinlik]);

  const paylaş = async (tip) => {
    const url = `https://rota.app/etkinlik/${etkinlik.id}`;
    const mesaj = `${etkinlik.baslik} - ${etkinlik.tarih}\n${url}`;


    try {
      switch (tip) {
        case "instagram":
          await Linking.openURL(`https://www.instagram.com/?url=${encodeURIComponent(url)}`);
          break;
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

    try {
      const token = await getSecureItem('accessToken'); 
      const image = await AsyncStorage.getItem('image');

      const { data } = await axiosClient.post('/yorum', {
        etkinlikId: etkinlik.id,
        yorum: metin,
        yanitId: yorumId,
        avatarUrl: image,
      });

      setYorumlar(prev => [...prev, data]);
      setYanitlar(prev => ({ ...prev, [yorumId]: '' }));
      setYanitId(null);
    } catch (err) {
      Alert.alert("Hata", "Yanıt gönderilemedi.");
    }
  };



  useEffect(() => {
    const yorumlariGetir = async () => {
      try {
        const { data } = await axiosClient.get(`/yorum/${id}`);
        setYorumlar(data);
      } catch (err) {
        logger.log('Yorumlar alınamadı', err);
      }
    };
    if (etkinlik) yorumlariGetir();
  }, [etkinlik]);

  const yorumGonder = async () => {
    if (!yeniYorum.trim()) return;

    try {
      const token = await getSecureItem('accessToken');
      const image = await AsyncStorage.getItem('image');
      const { data } = await axiosClient.post('/yorum', {
        etkinlikId: etkinlik.id,
        yorum: yeniYorum,
        avatarUrl: image,
      });

      setYorumlar(prev => [data, ...prev]);
      setYeniYorum("");
    } catch (err) {
      Alert.alert("Hata", "Yorum gönderilemedi.");
    }
  };

  useEffect(() => {
    const fetchEtkinlik = async () => {
      try {
        const { data } = await axiosClient.get(`/etkinlik/${id}`);

        if (data._id && !data.id) data.id = data._id;
        setEtkinlik(data);
      } catch (err) {
        logger.error('Etkinlik verisi alınamadı', err);
      }
    };
    fetchEtkinlik();
  }, [id]);

  useEffect(() => {
    const checkFavori = async () => {
      const favoriler = JSON.parse(await AsyncStorage.getItem('favoriler')) || [];
      const varMi = favoriler.find(e => e.id === etkinlik?.id);
      setFavorideMi(!!varMi);
    };
    if (etkinlik) checkFavori();
  }, [etkinlik]);

  const favoriToggle = async () => {
    const token = await getSecureItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const favoriler = JSON.parse(await AsyncStorage.getItem('favoriler')) || [];
      let guncelFavoriler = [...favoriler];

      if (favorideMi) {
        await axiosClient.delete(`/etkinlik/favori/${etkinlik.id}`);
        guncelFavoriler = favoriler.filter(e => e.id !== etkinlik.id);
      } else {
        await axiosClient.post('/etkinlik/favori', { etkinlikId: etkinlik.id });
        guncelFavoriler.push(etkinlik);
      }

      await AsyncStorage.setItem('favoriler', JSON.stringify(guncelFavoriler));
      setFavorideMi(!favorideMi);

      await fetchFavorileyenler();
    } catch (err) {
      Alert.alert("Hata", "Favori işlemi başarısız oldu.");
    }
  };

  const checkFavori = async () => {
    try {
      const favoriler = JSON.parse(await AsyncStorage.getItem('favoriler')) || [];
      const varMi = favoriler.find(e => e.id === etkinlik?.id);

      if (varMi) {
        setFavorideMi(true);
      } else {
        const { data } = await axiosClient.get(`/etkinlik/${etkinlik.id}/favorileyenler`);
        const mevcut = data.users?.some(u => u.id === auth.userId);
        setFavorideMi(mevcut);
      }
    } catch {
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
            height: 330,
            borderRadius: 16,
            marginTop: 12,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          }}
        />

        <View style={{ marginTop: 20, backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: TEXT, marginBottom: 4 }}>
            {etkinlik.baslik}
          </Text>
          <Text style={{ color: '#666', marginBottom: 2 }}>📂 {etkinlik.kategori}</Text>
          <Text style={{ color: '#666', marginBottom: 2 }}>🏷️ {etkinlik.tur}</Text>
          <Text style={{ color: '#666', marginBottom: 2 }}>📍 {etkinlik.sehir}</Text>
          <Text style={{ color: '#666', marginBottom: 2 }}>📅 {etkinlik.tarih}</Text>
          <Text style={{ color: PRIMARY, fontWeight: '600' }}>
            💰 {(etkinlik.fiyat && etkinlik.fiyat !== '0') ? `${etkinlik.fiyat} ₺` : 'Ücretsiz'}
          </Text>

          <TouchableOpacity
            onPress={favoriToggle}
            style={{
              marginTop: 20,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: favorideMi ? '#f8f4ff' : '#fff',
              borderWidth: 1,
              borderColor: PRIMARY,
            }}
          >
            <Text style={{ textAlign: 'center', color: PRIMARY, fontWeight: '600' }}>
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
              gap: 18,
            }}
          >
            {[
              { tip: 'instagram', icon: '📸' },
              { tip: 'facebook', icon: '📘' },
              { tip: 'twitter', icon: '🐦' },
              { tip: 'whatsapp', icon: '💬' },
              { tip: 'email', icon: '📧' },
              { tip: 'kopyala', icon: '🔗' },
            ].map(({ tip, icon }) => (
              <TouchableOpacity
                key={tip}
                onPress={() => paylaş(tip)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: '#f0f0f0',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 22 }}>{icon}</Text>
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
                  borderColor: '#ccc',
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