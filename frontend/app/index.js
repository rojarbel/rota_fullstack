import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import axiosClient from '../src/api/axiosClient';
import SafeFlatList from '../src/components/SafeFlatList'; // yolunu kendi dizinine göre ayarla
import FastImage from 'expo-fast-image';
import { useCallback } from 'react';
import logger from '../src/utils/logger';


const Index = () => {
    const router = useRouter();
    const isFetching = useRef(false);

  const [etkinlikler, setEtkinlikler] = useState([]);
  const [aktifSekme, setAktifSekme] = useState('tum');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);


  useEffect(() => {
    
const fetchEtkinlikler = async () => {
  if (isFetching.current) return;
  isFetching.current = true;

  try {
    setLoadingMore(true);

    const res = await axiosClient.get(`/etkinlik/tum?page=${page}&limit=12&filter=${aktifSekme}`);
    const yeniEtkinlikler = res.data?.data || [];


    const etkinliklerMaplenmis = yeniEtkinlikler.map(e => ({
      ...e,
      _id: e._id || e.id,
    }));

    if (page === 1) {
      setEtkinlikler(etkinliklerMaplenmis);
    } else {
      setEtkinlikler(prev => {
        const yeniIdler = new Set(prev.map(e => e?._id));
        const filtreliYeni = etkinliklerMaplenmis.filter(e => e && e._id && !yeniIdler.has(e._id));
        return [...prev, ...filtreliYeni];
      });
    }

   const hasMoreData = res.data?.hasMore;
    setHasMore(hasMoreData);
  } catch (err) {
    logger.error('Veri alınamadı:', err);
    setHasMore(false);
  } finally {
    setLoading(false);
    setLoadingMore(false);
    isFetching.current = false;
  }
};

  fetchEtkinlikler();
}, [page, aktifSekme]);
  
useEffect(() => {
  setEtkinlikler([]);
  setHasMore(true);
  setTimeout(() => setPage(1), 0);
}, [aktifSekme]);
  const filtrelenmisEtkinlikler = useMemo(() => {
    const list = etkinlikler
      .filter((etk) => {
        if (aktifSekme === "tum") return true;

        if (aktifSekme === "ucretsiz") {
          const fiyatStr = (etk.fiyat ?? "").toString().toLowerCase().trim();
          return (
            fiyatStr === "" ||
            fiyatStr === "0" ||
            fiyatStr === "0.0" ||
            fiyatStr === "0.00" ||
            fiyatStr === "ücretsiz" ||
            fiyatStr === "free"
          );
        }
        
        if (aktifSekme === "yaklasan") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const etkinlikTarihi = new Date(etk.tarih);
          if (isNaN(etkinlikTarihi)) return false;
          etkinlikTarihi.setHours(0, 0, 0, 0);
          return etkinlikTarihi >= today;
        }
        if (aktifSekme === "populer") {
          return etk.populer === true || etk.populer === "true";
        }
        return true;
      })
      .sort((a, b) => {
        if (aktifSekme === "tum") {
          return a.baslik.localeCompare(b.baslik, "tr", { sensitivity: "base" });
        } else {
          return new Date(a.tarih) - new Date(b.tarih);
        }
      });
    return list;
  }, [etkinlikler, aktifSekme]);
  
const renderEtkinlik = useCallback(({ item }) => {
  try {
    if (!item || typeof item !== 'object') return null;

      const gorselUrl =
        typeof item.gorsel === 'string' &&
        item.gorsel.trim().length > 0 &&
        !item.gorsel.startsWith('data:image') &&
        item.gorsel.startsWith('/')
          ? `https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net${item.gorsel}`
          : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          item._id &&
          router.push({ pathname: '/etkinlik/[id]', params: { id: item._id } })
        }
      >
        {gorselUrl ? (
          <FastImage uri={gorselUrl} cacheKey={item._id} style={styles.image} />
        ) : (
          <Image
            source={require('../assets/placeholder.png')}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        <Text style={styles.title}>{item.baslik || 'Başlık yok'}</Text>
        <Text style={styles.meta}>
          {(item.kategori || 'Kategori yok')} | {(item.tarih || 'Tarih yok')}
        </Text>
        <Text numberOfLines={3} style={styles.aciklama}>
          {item.fiyat && item.fiyat !== '0' ? `${item.fiyat} ₺` : 'Ücretsiz'}
        </Text>
      </TouchableOpacity>
    );
  } catch (error) {
    logger.warn('renderEtkinlik crash:', error);
    return null;
  }
}, []);

  
  
  

  return (
    <View style={{ flex: 1 }}>

  <SafeFlatList
  data={filtrelenmisEtkinlikler}
  initialNumToRender={6}
  maxToRenderPerBatch={10}
  windowSize={10}
  removeClippedSubviews={true}
  renderItem={renderEtkinlik}
  keyExtractor={(item, index) => {
    try {
      if (!item || typeof item !== "object") return `key-${index}`;
      if (!item._id) return `key-${index}`;
      return item._id.toString();
    } catch (e) {
      return `fallback-${index}`;
    }
  }}
  onEndReached={() => {
    try {
      if (!hasMore || loadingMore || isFetching.current) return;
      setPage(prev => prev + 1);
    } catch (e) {
      logger.warn('onEndReached crash:', e);
    }
  }}
  onEndReachedThreshold={0.4}
  ListHeaderComponent={
    <>


    <View style={styles.tabContainer}>
      {['tum', 'yaklasan', 'ucretsiz', 'populer'].map(id => {
        const labels = {
          tum: 'Tümü',
          yaklasan: 'Yaklaşan',
          ucretsiz: 'Ücretsiz',
          populer: 'Popüler'
        };
        const aktif = aktifSekme === id;
        return (
          <TouchableOpacity
            key={id}
            style={[styles.tab, aktif && styles.activeTab]}
            onPress={() => setAktifSekme(id)}
          >
            <Text style={[styles.tabText, aktif && styles.activeTabText]}>{labels[id]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
      {loading && (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 40 }} />
      )}
    </>
  }
  ListFooterComponent={
    <>
      {loadingMore && (
        <ActivityIndicator size="small" color={PRIMARY} style={{ marginVertical: 20 }} />
      )}
     
    </>
  }
  />
  </View>
  );
};

const PRIMARY = '#7B2CBF';
const SECONDARY = '#FFD54F';
const BG = '#FFFFFF';
const TEXT = '#333333';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    backgroundColor: BG,
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  tab: {
  backgroundColor: '#eee',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 20,
  marginHorizontal: 6,
  marginBottom: 8,
},
activeTab: {
  backgroundColor: PRIMARY,
},
tabText: {
  color: PRIMARY,
  fontWeight: '600',
},
activeTabText: {
  color: 'white',
},

card: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 8,
  elevation: 3,
},
  image: {
    width: '100%',
    height: 270,
    borderRadius: 10,
    marginBottom: 8,
  },
title: {
  fontSize: 18,
  fontWeight: '700',
  color: PRIMARY,
  marginBottom: 4,
},
meta: {
  fontSize: 13,
  color: '#777',
  marginBottom: 6,
},
aciklama: {
  fontSize: 14,
  color: TEXT,
  lineHeight: 20,
},
});

export default Index;
