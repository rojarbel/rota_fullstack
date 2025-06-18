// app/favorilerim.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import FastImage from 'expo-fast-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import axiosClient from '../src/api/axiosClient';
import { getItem as getSecureItem } from '../src/utils/storage';
import logger from '../src/utils/logger';

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
              uri={`https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net${etkinlik.gorsel}`}
              cacheKey={etkinlik.id}
              style={styles.image}
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{etkinlik.baslik}</Text>
              <Text style={styles.cardText}>{etkinlik.sehir}</Text>
              <Text style={styles.cardText}>{etkinlik.tarih}</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: 'gray',
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 270,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardText: {
    fontSize: 14,
    color: '#555',
  },
});

export default Favorilerim;
