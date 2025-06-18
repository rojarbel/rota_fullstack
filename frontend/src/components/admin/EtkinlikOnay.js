// src/components/admin/EtkinlikOnay.jsx
import axiosClient from '../../api/axiosClient';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getItem as getSecureItem } from '../../utils/storage';
import logger from '../../utils/logger';
import handleApiError from '../../utils/handleApiError';

const EtkinlikOnay = () => {
  const [bekleyenEtkinlikler, setBekleyenEtkinlikler] = useState([]);

  const getBekleyenEtkinlikler = async () => {
    try {
      const token = await getSecureItem('accessToken');
      const response = await axiosClient.get(
        '/etkinlik/bekleyen',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setBekleyenEtkinlikler(response.data);
    } catch (error) {
      handleApiError(error, 'Etkinlikler alınamadı'); 

    }
  };

  useEffect(() => {
    getBekleyenEtkinlikler();
  }, []);

  const handleEtkinlikOnayla = async (id) => {
    try {
        const token = await getSecureItem('accessToken');
        await axiosClient.put(`/etkinlik/onayla/${id}`, null, {

          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
      Alert.alert('Başarılı', 'Etkinlik onaylandı');
      getBekleyenEtkinlikler();
    } catch (error) {
      handleApiError(error, 'Etkinlik onaylanamadı');

    }
  };

  const handleEtkinlikSil = async (id) => {
    try {
        const token = await getSecureItem('accessToken');
        await axiosClient.delete(`/etkinlik/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      Alert.alert('Silindi', 'Etkinlik silindi');
      getBekleyenEtkinlikler();
    } catch (error) {
      handleApiError(error, 'Etkinlik silinemedi');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
        {bekleyenEtkinlikler.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 32, fontSize: 16 }}>
            Bekleyen etkinlik yok.
        </Text>
        ) : (
        bekleyenEtkinlikler.map((etkinlik) => (
            <View key={etkinlik.id || etkinlik._id} style={styles.card}>
            <Image
              source={{ uri: `https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net/img/${etkinlik.gorsel?.split('/').pop()}` }}
              style={{ width: 200, height: 200 }}
              onError={() => logger.log('Görsel yüklenemedi')}

            />
            <Text style={styles.title}>{etkinlik.baslik}</Text>
            <Text style={styles.text}>{etkinlik.sehir} - {etkinlik.tarih}</Text>
            <View style={styles.buttonGroup}>
                <Button title="Onayla" onPress={() => handleEtkinlikOnayla(etkinlik.id || etkinlik._id)} />

                <Button title="Sil" color="red" onPress={() => handleEtkinlikSil(etkinlik.id || etkinlik._id)} />
            </View>
            </View>
        ))
        )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  text: {
    fontSize: 14,
    color: '#555',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});

export default EtkinlikOnay;