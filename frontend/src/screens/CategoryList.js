import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import axiosClient from '../api/axiosClient';
import FastImage from 'expo-fast-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import qs from 'qs';
import handleApiError from '../utils/handleApiError';

const PRIMARY = '#7B2CBF';
const SECONDARY = '#FFD54F';

const cities = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır",
  "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay",
  "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli",
  "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde",
  "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli",
  "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman",
  "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];

const toISODate = (str) => {
  if (!str || typeof str !== 'string' || !str.includes('.')) return undefined;
  const [gun, ay, yil] = str.trim().split('.');
  if (!gun || !ay || !yil) return undefined;
  return `${yil}-${ay.padStart(2, '0')}-${gun.padStart(2, '0')}`;
};

const CategoryList = ({ category, typeOptions = [], emptyMessage = 'Uygun etkinlik bulunamadı.' }) => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    tur: [],
    sehir: '',
    minPrice: 0,
    maxPrice: 22104,
    baslangicTarihi: '',
    bitisTarihi: ''
  });
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setMinPriceInput(selectedFilters.minPrice.toString());
    setMaxPriceInput(selectedFilters.maxPrice.toString());
  }, [selectedFilters.minPrice, selectedFilters.maxPrice]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = {
          kategori: category,
          page,
          limit: 12,
          ...(selectedFilters.sehir ? { sehir: selectedFilters.sehir } : {}),
          ...(selectedFilters.tur.length > 0 ? { tur: selectedFilters.tur } : {}),
          ...(selectedFilters.minPrice > 0 ? { fiyatMin: selectedFilters.minPrice } : {}),
          ...(selectedFilters.maxPrice < 22104 ? { fiyatMax: selectedFilters.maxPrice } : {}),
          ...(selectedFilters.baslangicTarihi ? { baslangic: toISODate(selectedFilters.baslangicTarihi) } : {}),
          ...(selectedFilters.bitisTarihi ? { bitis: toISODate(selectedFilters.bitisTarihi) } : {})
        };

        const res = await axiosClient.get('/etkinlik/tum', {
          params,
          paramsSerializer: p => qs.stringify(p, { arrayFormat: 'repeat' })
        });

        const yeni = res.data.data.map(e => ({
          ...e,
          _id: e._id?.toString() || e.id?.toString(),
          gorsel: e.gorsel ? `https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net${e.gorsel}` : null,
        }));

        if (res.data.hasMore !== undefined) {
          setHasMore(res.data.hasMore);
          setEvents(prev => {
            const mevcutIdler = new Set(prev.map(e => e._id));
            const filtreliYeni = yeni.filter(e => !mevcutIdler.has(e._id));
            return page === 1 ? yeni : [...prev, ...filtreliYeni];
          });
        } else {
          setHasMore(false);
          setEvents(yeni);
        }
      } catch (err) {
        handleApiError(err, 'Etkinlik çekme hatası');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page, selectedFilters, category]);

  const filteredEvents = useMemo(() => {
    return selectedFilters.sehir
      ? events.filter(e => e.sehir?.toLowerCase() === selectedFilters.sehir.toLowerCase())
      : events;
  }, [events, selectedFilters.sehir]);

  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/etkinlik/[id]', params: { id: item._id } })}
      style={{
        backgroundColor: '#fff',
        marginBottom: 16,
        padding: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FastImage
          uri={item.gorsel || 'https://via.placeholder.com/150'}
          cacheKey={item._id}
          style={{
            width: 80,
            height: 80,
            borderRadius: 12,
            backgroundColor: PRIMARY,
            marginRight: 12
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#333' }}>{item.baslik}</Text>
          <Text style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{item.sehir}</Text>
          {item.tarih && (
            <Text style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
              {new Date(item.tarih).toLocaleDateString('tr-TR')}
            </Text>
          )}
          <Text style={{ fontSize: 14, color: PRIMARY, marginTop: 4 }}>
            {item.fiyat && item.fiyat !== '0' && item.fiyat !== 0 ? `${item.fiyat} ₺` : 'Ücretsiz'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [router]);

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
      data={filteredEvents}
      keyExtractor={(item, index) => `${item._id || 'fallback'}-${index}`}
      initialNumToRender={6}
      maxToRenderPerBatch={10}
      windowSize={10}
      removeClippedSubviews
      onEndReached={() => {
        if (hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      }}
      onEndReachedThreshold={0.4}
      renderItem={renderItem}
      ListHeaderComponent={
        <>
          <TouchableOpacity
            onPress={() => setFiltersOpen(!filtersOpen)}
            style={{
              backgroundColor: PRIMARY,
              padding: 12,
              borderRadius: 10,
              marginBottom: 16
            }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
              {filtersOpen ? 'Filtreleri Gizle' : 'Filtreleri Göster'}
            </Text>
          </TouchableOpacity>

          {filtersOpen && (
            <>
              <View style={{
                marginBottom: 16,
                backgroundColor: '#f9f9f9',
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ddd'
              }}>
                <Text style={{ fontWeight: '600', color: '#333', marginBottom: 6 }}>Şehir</Text>
                <View style={{
                  maxHeight: 200,
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#ddd',
                  padding: 8,
                  marginBottom: 16
                }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                    {cities.map(item => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => {
                          setSelectedFilters(prev => ({ ...prev, sehir: item }));
                          setPage(1);
                          setEvents([]);
                        }}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor: selectedFilters.sehir === item ? PRIMARY : '#eee',
                          marginBottom: 6
                        }}
                      >
                        <Text style={{
                          textAlign: 'center',
                          color: selectedFilters.sehir === item ? '#fff' : '#000',
                          fontWeight: '600'
                        }}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={{
                marginBottom: 16,
                backgroundColor: '#f9f9f9',
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ddd'
              }}>
                <Text style={{ fontWeight: '600', color: '#333', marginBottom: 6 }}>Ücret Aralığı</Text>
                <TextInput
                  value={minPriceInput}
                  onChangeText={setMinPriceInput}
                  onEndEditing={() => {
                    setSelectedFilters(prev => ({
                      ...prev,
                      minPrice: parseFloat(minPriceInput) || 0
                    }));
                    setPage(1);
                    setEvents([]);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                    backgroundColor: '#fff'
                  }}
                />
                <TextInput
                  value={maxPriceInput}
                  onChangeText={setMaxPriceInput}
                  onEndEditing={() => {
                    setSelectedFilters(prev => ({
                      ...prev,
                      maxPrice: parseFloat(maxPriceInput) || 22104
                    }));
                    setPage(1);
                    setEvents([]);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#fff'
                  }}
                />
              </View>

              <View style={{
                marginBottom: 16,
                backgroundColor: '#f9f9f9',
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ddd'
              }}>
                <Text style={{ fontWeight: '600', color: '#333', marginBottom: 6 }}>Tür</Text>
                {typeOptions.map(tur => (
                  <TouchableOpacity
                    key={tur}
                    onPress={() => {
                      setSelectedFilters(prev => ({
                        ...prev,
                        tur: prev.tur.includes(tur)
                          ? prev.tur.filter(t => t !== tur)
                          : [...prev.tur, tur]
                      }));
                      setPage(1);
                      setEvents([]);
                    }}
                    style={{
                      padding: 8,
                      marginVertical: 4,
                      backgroundColor: selectedFilters.tur.includes(tur) ? PRIMARY : '#eee',
                      borderRadius: 8
                    }}
                  >
                    <Text style={{ color: selectedFilters.tur.includes(tur) ? '#fff' : '#000' }}>{tur}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{
                marginBottom: 16,
                backgroundColor: '#f9f9f9',
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ddd'
              }}>
                <Text style={{ fontWeight: '600', color: '#333', marginBottom: 6 }}>Tarih Aralığı</Text>
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#fff',
                    marginBottom: 8
                  }}
                >
                  <Text>{selectedFilters.baslangicTarihi || 'Başlangıç Tarihi Seç'}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowStartPicker(Platform.OS === 'ios');
                      if (date) {
                        const gun = String(date.getDate()).padStart(2, '0');
                        const ay = String(date.getMonth() + 1).padStart(2, '0');
                        const yil = date.getFullYear();
                        const formatted = `${gun}.${ay}.${yil}`;
                        setSelectedFilters(prev => ({ ...prev, baslangicTarihi: formatted }));
                        setPage(1);
                        setEvents([]);
                      }
                    }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#fff'
                  }}
                >
                  <Text>{selectedFilters.bitisTarihi || 'Bitiş Tarihi Seç'}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowEndPicker(Platform.OS === 'ios');
                      if (date) {
                        const gun = String(date.getDate()).padStart(2, '0');
                        const ay = String(date.getMonth() + 1).padStart(2, '0');
                        const yil = date.getFullYear();
                        const formatted = `${gun}.${ay}.${yil}`;
                        setSelectedFilters(prev => ({ ...prev, bitisTarihi: formatted }));
                        setPage(1);
                        setEvents([]);
                      }
                    }}
                  />
                )}
              </View>

              <TouchableOpacity
                onPress={() => {
                  setSelectedFilters({
                    tur: [],
                    sehir: '',
                    minPrice: 0,
                    maxPrice: 22104,
                    baslangicTarihi: '',
                    bitisTarihi: ''
                  });
                  setPage(1);
                  setEvents([]);
                }}
                style={{
                  borderWidth: 1,
                  borderColor: PRIMARY,
                  backgroundColor: '#fff',
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 16
                }}
              >
                <Text style={{ color: PRIMARY, textAlign: 'center', fontWeight: 'bold', fontSize: 15 }}>
                  Filtreleri Sıfırla
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      }
      ListFooterComponent={loading ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Yükleniyor...</Text>
      ) : null}
      ListEmptyComponent={!loading && filteredEvents.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>{emptyMessage}</Text>
      ) : null}
    />
  );
};

export default CategoryList;