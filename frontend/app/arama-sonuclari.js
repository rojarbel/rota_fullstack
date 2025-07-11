// app/arama-sonuclari.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axiosClient from "../src/api/axiosClient";
import { IMAGE_BASE_URL } from '../src/constants';
import { useCallback } from 'react';
import logger from '../src/utils/logger';
import formatDate from '../src/utils/formatDate';
import FastImage from 'expo-fast-image';
export default function AramaSonuclari() {
  const { q, sehir } = useLocalSearchParams();
  const [etkinlikler, setEtkinlikler] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

useEffect(() => {
  const fetch = async () => {
    try {
      let endpoint = '';
      if (sehir) {
        endpoint = `/etkinlik?sehir=${encodeURIComponent(sehir)}`;
      } else if (q) {
        endpoint = `/etkinlik/search?q=${encodeURIComponent(q)}`;
      }

      const res = await axiosClient.get(endpoint);

      const etkinlikler = res.data.map(e => ({
        ...e,
        id: e.id || e._id?.toString(),
      }));

      setEtkinlikler(etkinlikler);
    } catch (err) {
      logger.error('Etkinlik alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  fetch();
}, [q, sehir]);

const renderItem = useCallback(({ item }) => {
  const gorselUrl =
    typeof item.gorsel === 'string' &&
    item.gorsel.trim().length > 0 &&
    !item.gorsel.startsWith('data:image') &&
    item.gorsel.startsWith('/')
      ? `${IMAGE_BASE_URL}${item.gorsel}`
      : null;
        return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/etkinlik/[id]', params: { id: item.id } })}
      style={{
        backgroundColor: '#fff',
        padding: 14,
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      {gorselUrl ? (
        <FastImage uri={gorselUrl} cacheKey={item.id} style={{ width: '100%', height: 240, borderRadius: 12 }} />
      ) : (
        <Image
          source={require('../assets/placeholder.png')}
          style={{ width: '100%', height: 240, borderRadius: 12 }}
          resizeMode="cover"
        />
      )}
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#111', marginTop: 10 }}>
        {item.baslik}
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginTop: 6 }}>
        {item.sehir} • {formatDate(item.tarih)}
      </Text>
      <Text style={{ marginTop: 8, color: '#000', fontWeight: '600' }}>
        {(item.fiyat && item.fiyat !== '0') ? `${item.fiyat} ₺` : 'Ücretsiz'} • {item.kategori}
      </Text>
    </TouchableOpacity>
  );
}, []);

  return (
    <View style={{ padding: 16, backgroundColor: '#fff', flex: 1 }}>

    <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 20, color: '#222' }}>
      “{q || sehir}” için sonuçlar
    </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6c5ce7" />
      ) : etkinlikler.length === 0 ? (
        <Text style={{ color: '#888' }}>Etkinlik bulunamadı.</Text>
      ) : (
      <FlatList
        data={etkinlikler}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />
      )}
    </View>
  );
}

