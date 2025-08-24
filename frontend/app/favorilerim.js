import FastImage from 'expo-fast-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import axiosClient from '../src/api/axiosClient';
import { getItem as getSecureItem } from '../src/utils/storage';
import logger from '../src/utils/logger';
import { IMAGE_BASE_URL } from '../src/constants';

const Favorilerim = () => {
  const [favoriler, setFavoriler] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkLoginAndFetch = async () => {
      const token = await getSecureItem('accessToken');
      if (!token) {
        router.replace('/login');
        return;
      }
      try {
        const { data } = await axiosClient.get('/etkinlik/favorilerim');
        console.log("Favorilerim API dönüşü:", data); // <-- Debug için
        setFavoriler(data);
      } catch (err) {
        logger.warn('Favorilerim çekilemedi:', err);
        setFavoriler([]);
        setError("Favorilerim listesi çekilemedi! Lütfen bağlantınızı ve giriş durumunuzu kontrol edin.");
      }
    };
    checkLoginAndFetch();
  }, []);

  const detayGoster = (etkinlik) => {
    router.push(`/etkinlik/${etkinlik._id || etkinlik.id}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Favori Etkinliklerim</Text>

      {error !== "" ? (
        <Text style={[styles.empty, { color: 'red' }]}>{error}</Text>
      ) : favoriler.length === 0 ? (
        <Text style={styles.empty}>
          Favorilerin henüz boş. Beğendiğin etkinlikleri buradan görebilirsin.
        </Text>
      ) : (
        favoriler.map((etkinlik) => (
          <TouchableOpacity key={etkinlik._id || etkinlik.id} style={styles.card} onPress={() => detayGoster(etkinlik)}>
            <FastImage
              uri={
                etkinlik.gorselUrl
                  ? etkinlik.gorselUrl
                  : `${IMAGE_BASE_URL}${String(etkinlik.gorsel || '').startsWith('/') ? '' : '/'}${etkinlik.gorsel || ''}`
              }
              cacheKey={etkinlik._id || etkinlik.id}
              style={styles.image}
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{etkinlik.baslik}</Text>
              <Text style={styles.cardText}>{etkinlik.sehir}</Text>
              <Text style={styles.cardText}>
                {new Date(etkinlik.tarih).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.cardText}>{etkinlik.kategori} - {etkinlik.tur}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f2f2f2',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#5f5f5f',
    marginBottom: 24,
  },
  empty: {
    textAlign: 'center',
    fontSize: 15,
    color: '#888',
    marginTop: 40,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 260,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#222',
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default Favorilerim;
