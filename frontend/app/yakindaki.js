import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text, Image, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';

import * as Location from 'expo-location';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

import Constants from 'expo-constants';
import axiosClient from '../src/api/axiosClient';
import { IMAGE_BASE_URL } from '../src/constants';
import { useRouter } from 'expo-router';
import { getItem as getSecureItem } from '../src/utils/storage';

const PRIMARY = '#7B2CBF';
const BLUE = '#3498db';
const DEFAULT_RADIUS = 50; // km

export default function Yakindaki() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(null);
  const [events, setEvents] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [error, setError] = useState(null);
  const [isLoginChecked, setIsLoginChecked] = useState(false);

  // Koordinat doğrulama fonksiyonu
  const isValidCoordinate = useCallback((lat, lng) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    return (
      !isNaN(latitude) && 
      !isNaN(longitude) &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      latitude !== 0 && longitude !== 0
    );
  }, []);

  // Görsel URL'ini güvenli şekilde oluştur
  const getImageUrl = useCallback((gorsel) => {
    if (!gorsel || typeof gorsel !== 'string') {
      return `${IMAGE_BASE_URL}/placeholder.png`;
    }
    
    if (gorsel.startsWith('http')) return gorsel;
    const normalized = gorsel.startsWith('/') ? gorsel : `/${gorsel}`;
    return `${IMAGE_BASE_URL}${normalized}`;
  }, []);

  // Çakışan markerları offset ile ayır - İYİLEŞTİRİLMİŞ VERSİYON
  const offsetMarkers = useCallback((markers) => {
    const offset = 0.0005; // Offset değeri artırıldı (yaklaşık 50 metre)
    const grouped = {};

    // Aynı koordinattaki markerları grupla (daha hassas tespit için toFixed(4) kullan)
    markers.forEach(marker => {
      const key = `${marker.lat.toFixed(4)}_${marker.lon.toFixed(4)}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(marker);
    });

    const adjustedMarkers = [];

    // Her grup için markerları daire şeklinde dağıt
    Object.values(grouped).forEach(group => {
      if (group.length === 1) {
        // Tek marker varsa olduğu gibi bırak
        adjustedMarkers.push(group[0]);
      } else {
        // Çoklu marker varsa daire şeklinde dağıt
        console.log(`🎯 ${group.length} adet çakışan marker tespit edildi, dağıtılıyor...`);
        
        group.forEach((marker, index) => {
          const angle = (index / group.length) * 2 * Math.PI; // 360 derece eşit dağılım
          const distance = offset * (1 + Math.floor(index / 8) * 0.5); // 8'den fazlaysa daha uzağa yerleştir
          
          adjustedMarkers.push({
            ...marker,
            lat: marker.lat + distance * Math.cos(angle),
            lon: marker.lon + distance * Math.sin(angle),
          });
        });
      }
    });

    console.log(`📍 ${markers.length} marker işlendi, ${adjustedMarkers.length} marker döndürülüyor`);
    return adjustedMarkers;
  }, []);

  // Yakındaki etkinlikleri getir
  const fetchNearbyEvents = useCallback(async (lat, lon, radiusKm) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 API çağrısı başlıyor: lat=${lat}, lng=${lon}, radius=${radiusKm}km`);
      
      const response = await axiosClient.get('/etkinlik/yakindaki', {
        params: { 
          lat: lat.toString(),
          lng: lon.toString(),
          radius: (radiusKm * 1000).toString()
        },
        timeout: 8000
      });

      console.log('📍 API çağrısı yapıldı:', {
        lat: lat.toString(),
        lng: lon.toString(),
        radius: (radiusKm * 1000).toString()
      });

      const data = response.data;
      let eventList = [];

      if (data?.etkinlikler && Array.isArray(data.etkinlikler)) {
        eventList = data.etkinlikler;
      } else if (Array.isArray(data)) {
        eventList = data;
      } else {
        console.warn('⚠️ Beklenmeyen veri yapısı:', data);
        throw new Error('Sunucudan geçersiz veri formatı alındı');
      }

      console.log(`📊 Toplam ${eventList.length} etkinlik alındı`);

      // Etkinlikleri işle ve filtrele
      const processedEvents = eventList
        .map((event, index) => ({
          ...event,
          id: event.id || event._id?.toString?.() || event._id || `event_${index}`,
          lat: parseFloat(event.latitude) || null,
          lon: parseFloat(event.longitude) || null,
          baslik: event.baslik || 'İsimsiz Etkinlik',
          sehir: event.sehir || 'Bilinmeyen Şehir',
          mesafe: event.mesafe ? parseFloat(event.mesafe) : null
        }))
        .filter(event => {
          const isValid = event.lat !== null && event.lon !== null && 
                          isValidCoordinate(event.lat, event.lon);
          
          if (!isValid) {
            console.warn(`❌ Geçersiz koordinat filtre edildi: ${event.baslik} - ${event.lat}, ${event.lon}`);
          }
          
          return isValid;
        });

      console.log(`✅ ${processedEvents.length} geçerli etkinlik işlendi`);

      // Offset uygula ve clustering bilgisi ekle
      const offsetEvents = offsetMarkers(processedEvents);
      
      // Clustering bilgisi ekle (aynı yerde kaç etkinlik var)
      const eventsWithClustering = offsetEvents.map(event => {
        const sameLocationEvents = processedEvents.filter(e => 
          Math.abs(e.lat - event.lat) < 0.001 && Math.abs(e.lon - event.lon) < 0.001
        );
        
        return {
          ...event,
          location: { latitude: event.lat, longitude: event.lon },
          clusterCount: sameLocationEvents.length > 1 ? sameLocationEvents.length : null
        };
      });

      setEvents(eventsWithClustering);

      if (eventsWithClustering.length === 0) {
        setError(`${radiusKm}km yarıçapında koordinatı olan etkinlik bulunamadı`);
      }

    } catch (error) {
      console.error('❌ Yakındaki etkinlikler hatası:', error);
      
      let errorMessage = 'Bilinmeyen hata';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          errorMessage = data?.message || 'Geçersiz parametre';
        } else if (status === 404) {
          errorMessage = 'API endpoint bulunamadı';
        } else if (status === 500) {
          errorMessage = 'Sunucu hatası';
        } else {
          errorMessage = `HTTP ${status}: ${data?.message || 'Sunucu hatası'}`;
        }
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'İstek zaman aşımına uğradı';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'İnternet bağlantısı sorunu';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        Alert.alert('Zaman Aşımı', 'İstek zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  }, [isValidCoordinate, offsetMarkers]);

  // Login kontrolü
  useEffect(() => {
    const checkLogin = async () => {
      const token = await getSecureItem('accessToken');
      if (!token) {
        router.replace('/login');
      } else {
        setIsLoginChecked(true);
      }
    };
    checkLogin();
  }, [router]);
      
  // Konum izni alma ve kullanıcı konumunu belirleme
  useEffect(() => {
    if (!isLoginChecked) return;

    const requestLocationAndFetch = async (retryCount = 3) => {
      try {
        setLoading(true);
        setError(null);

        const { status } = await Location.requestForegroundPermissionsAsync();
        setPermissionStatus(status);

        if (status !== 'granted') {
          setError('Konum izni verilmedi');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 10000,
          maximumAge: 10000,
        });

        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        if (!isValidCoordinate(userCoords.latitude, userCoords.longitude)) {
          throw new Error('Geçersiz koordinat');
        }

        setUserLocation(userCoords);
        setRegion({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });

        await fetchNearbyEvents(userCoords.latitude, userCoords.longitude, DEFAULT_RADIUS);

      } catch (error) {
        console.error('❌ Konum hatası:', error.message);

        if (retryCount > 0) {
          console.log(`🔁 Yeniden denenecek... Kalan: ${retryCount}`);
          setTimeout(() => requestLocationAndFetch(retryCount - 1), 1500);
        } else {
          setError('Konum alınamadı. Lütfen tekrar deneyin.');
        }
      } finally {
        setLoading(false);
      }
    };

    requestLocationAndFetch();
  }, [isLoginChecked, isValidCoordinate, fetchNearbyEvents]);

  // Radius değişikliklerini dinle
  useEffect(() => {
    if (userLocation && radius && !loading && permissionStatus === 'granted') {
      console.log(`🔄 Radius değişti: ${radius}km`);
      fetchNearbyEvents(userLocation.latitude, userLocation.longitude, radius);
    }
  }, [radius, userLocation, loading, permissionStatus, fetchNearbyEvents]);

  // Yarıçapı değiştir
  const changeRadius = useCallback((newRadius) => {
    if (userLocation && newRadius !== radius && !loading) {
      console.log(`🎯 Radius değiştiriliyor: ${radius}km -> ${newRadius}km`);
      setRadius(newRadius);
    }
  }, [userLocation, radius, loading]);

  // Konumu yenile
  const refreshLocation = useCallback(async () => {
    if (permissionStatus === 'granted' && !loading) {
      console.log('🔄 Konum yenileniyor...');
      
      try {
        setLoading(true);
        setError(null);
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
          maximumAge: 5000,
        });

        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        if (!isValidCoordinate(userCoords.latitude, userCoords.longitude)) {
          throw new Error('Geçersiz konum koordinatları');
        }

        setUserLocation(userCoords);
        setRegion({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });

        await fetchNearbyEvents(userCoords.latitude, userCoords.longitude, radius);
      } catch (error) {
        console.error('❌ Konum yenileme hatası:', error);
        setError('Konum yenilenemedi: ' + error.message);
        setLoading(false);
      }
    }
  }, [permissionStatus, radius, isValidCoordinate, fetchNearbyEvents]);

  // Etkinlik detayına git
  const goToEventDetail = useCallback((event) => {
    const eventId = event.id || event._id;
    console.log('📱 Etkinlik detayına gidiliyor:', eventId);
    
    if (eventId) {
      router.push({ 
        pathname: '/etkinlik/[id]', 
        params: { id: eventId } 
      });
    } else {
      Alert.alert('Hata', 'Etkinlik bilgisi bulunamadı');
    }
  }, [router]);

  // Event marker render fonksiyonu - Clustering desteği ile
  const renderEventMarker = useCallback((event, index) => {
    let formattedDate = 'Tarih Bilinmiyor';
    if (event.tarih) {
      try {
        const date = new Date(event.tarih);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      } catch (e) {
        console.warn('⚠️ Tarih formatlanamadı:', event.tarih);
      }
    }

    const description = [
      `📅 ${formattedDate}`,
      `📍 ${event.sehir || 'Şehir Bilinmiyor'}`,
      event.mesafe ? `🚶 ${event.mesafe} km uzaklıkta` : null
    ].filter(Boolean).join('\n');

    return (
      <Marker
        key={`${event.id}_${index}`} // Unique key için index ekle
        coordinate={{ latitude: event.lat, longitude: event.lon }}
        title={event.baslik || 'Etkinlik'}
        description={description}
        onCalloutPress={() => goToEventDetail(event)}
      >
        <View style={styles.markerWrapper}>
          <Image
            source={{ uri: getImageUrl(event.gorsel) }}
            style={styles.markerImage}
            onError={() => {
              console.warn('⚠️ Marker görseli yüklenemedi:', event.gorsel);
            }}
          />
          {/* Eğer aynı yerde birden fazla etkinlik varsa sayıyı göster */}
          {event.clusterCount && event.clusterCount > 1 && (
            <View style={styles.clusterBadge}>
              <Text style={styles.clusterBadgeText}>{event.clusterCount}</Text>
            </View>
          )}
        </View>
      </Marker>
    );
  }, [getImageUrl, goToEventDetail]);

  // İzin verilmemişse
  if (permissionStatus === 'denied') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>🗺️ Konum İzni Gerekli</Text>
        <Text style={styles.errorSubText}>
          Yakınındaki etkinlikleri görebilmek için konum iznine ihtiyacımız var.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            setError(null);
            setPermissionStatus('undetermined');
            Location.requestForegroundPermissionsAsync();
          }}
        >
          <Text style={styles.retryButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Yükleniyor
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>
          {!userLocation ? 'Konum belirleniyor...' : 'Yakındaki etkinlikler aranıyor...'}
        </Text>
        <Text style={styles.loadingSubText}>Bu işlem birkaç saniye sürebilir</Text>
      </View>
    );
  }

  // Hata durumu - konum alınamadıysa
  if (error && !userLocation) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ Bir sorun oluştu</Text>
        <Text style={styles.errorSubText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={refreshLocation}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Ana görünüm
  return (
    <View style={{ flex: 1 }}>
      {/* Kontrol Paneli */}
      <View style={styles.controlPanel}>
        <View style={styles.radiusControls}>
          <View style={styles.radiusButtons}>
            {[25, 50, 100].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.radiusButton,
                  radius === r && styles.radiusButtonActive
                ]}
                onPress={() => changeRadius(r)}
                disabled={loading}
              >
                <Text style={[
                  styles.radiusButtonText,
                  radius === r && styles.radiusButtonTextActive
                ]}>
                  {r}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Yenileme butonu */}
        <TouchableOpacity
          style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
          onPress={refreshLocation}
          disabled={loading}
        >
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Etkinlik Sayısı ve Hata Mesajı */}
      <View style={styles.eventCount}>
        {error && events.length === 0 ? (
          <Text style={styles.errorCountText}>⚠️ {error}</Text>
        ) : (
          <Text style={styles.eventCountText}>
            📍 {radius}km içinde {events.length} etkinlik bulundu
          </Text>
        )}
      </View>

      {/* Harita */}
      {region ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          googleMapsApiKey={
            Platform.OS === 'ios'
              ? Constants.expoConfig?.extra?.googleMapsApiKeyIos
              : Constants.expoConfig?.extra?.googleMapsApiKeyAndroid
          }
          initialRegion={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={false}
          loadingEnabled={true}
          onMapReady={() => console.log('🗺️ Harita hazır')}
          onError={(error) => console.error('🗺️ Harita hatası:', error)}
        >
          {/* Kullanıcı konumu etrafında arama yarıçapı çemberi */}
          {userLocation && (
            <Circle
              center={userLocation}
              radius={radius * 1000}
              strokeColor="rgba(123, 44, 191, 0.5)"
              fillColor="rgba(123, 44, 191, 0.1)"
              strokeWidth={2}
            />
          )}

          {/* Etkinlik işaretleri */}
          {events.map((event, index) => renderEventMarker(event, index))}
        </MapView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorText}>Harita yüklenemedi</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshLocation}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loadingSubText: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
  },
  retryButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  controlPanel: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  radiusControls: {
    flex: 1,
    alignItems: 'center',
  },
  radiusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 6,
  },
  radiusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  radiusButtonTextActive: {
    color: '#fff',
  },
  refreshButton: {
    backgroundColor: BLUE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonDisabled: {
    backgroundColor: '#ccc',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventCount: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 12,
    zIndex: 1000,
  },
  eventCountText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  errorCountText: {
    color: '#ffcccb',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
    position: 'relative', // Badge positioning için
  },
  markerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clusterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  clusterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});