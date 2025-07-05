// app/favorilerim.js
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      const token = await getSecureItem('accessToken');
      if (!token) {
        router.replace('/login');
      }
    };
    checkLogin();
  }, []);

  useEffect(() => {
    const fetchFavoriler = async () => {
      const kayitli = await AsyncStorage.getItem('favoriler');
      if (!kayitli) return;

      const parsedFavoriler = JSON.parse(kayitli);
      const gecerliFavoriler = [];

      for (const etkinlik of parsedFavoriler) {
        try {

          const { data } = await axiosClient.get(`/etkinlik/${etkinlik.id}`);
          const item = { ...data };
          if (item._id && !item.id) item.id = item._id;
          gecerliFavoriler.push(item);

        } catch (err) {
          logger.warn(`Etkinlik ${etkinlik.id} getirilemedi, yereldeki veriler kullanılacak.`);
          gecerliFavoriler.push(etkinlik);
        }
      }

      setFavoriler(gecerliFavoriler);
      await AsyncStorage.setItem('favoriler', JSON.stringify(gecerliFavoriler));
    };

    fetchFavoriler();
  }, []);

  const detayGoster = (etkinlik) => {
    router.push(`/etkinlik/${etkinlik.id}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Favori Etkinliklerim</Text>

      {favoriler.length === 0 ? (
        <Text style={styles.empty}>Favorilerin henüz boş. Beğendiğin etkinlikleri buradan görebilirsin.</Text>
      ) : (
        favoriler.map((etkinlik) => (
          <TouchableOpacity key={etkinlik.id} style={styles.card} onPress={() => detayGoster(etkinlik)}>
            <FastImage
              uri={`${IMAGE_BASE_URL}${etkinlik.gorsel}`}
              cacheKey={etkinlik.id}
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
