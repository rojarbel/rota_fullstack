import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import axiosClient from '../src/api/axiosClient';
// IMAGE_BASE_URL yerine doğrudan tanımlayın veya constants dosyasını kontrol edin
const IMAGE_BASE_URL = 'https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net';
import { useRouter } from 'expo-router';

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

  // Koordinat doğrulama fonksiyonu - daha esnek
  const isValidCoordinate = useCallback((lat, lng) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    return (
      !isNaN(latitude) && 
      !isNaN(longitude) &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      latitude !== 0 && longitude !== 0 // 0,0 koordinatını geçersiz say
    );
  }, []);

  // Görsel URL'ini güvenli şekilde oluştur
  const getImageUrl = useCallback((gorsel) => {
    if (!gorsel || typeof gorsel !== 'string') {
      return 'https://via.placeholder.com/40x40/cccccc/666666?text=E';
    }
    
    if (gorsel.startsWith('http')) return gorsel;
    if (gorsel.startsWith('/')) {
      return `${IMAGE_BASE_URL}${gorsel}`;
    }
    
    return gorsel;
  }, []);

  // Yakındaki etkinlikleri getir - iyileştirilmiş
  const fetchNearbyEvents = useCallback(async (lat, lon, radiusKm) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 API çağrısı başlıyor: lat=${lat}, lng=${lon}, radius=${radiusKm}km`);
      
      // API çağrısı - daha kısa timeout
      const response = await axiosClient.get('/etkinlik/yakindaki', {
        params: { 
          lat: lat.toString(),
          lng: lon.toString(),
          radius: (radiusKm * 1000).toString() // km'yi metre'ye çevir
        },
        timeout: 8000 // 8 saniye timeout
      });

      console.log('📍 API yanıtı alındı:', response.data);

      // Backend'den gelen veri yapısını kontrol et
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
        .map((event, index) => {
          const processedEvent = {
            ...event,
            // ID'yi normalize et
            id: event.id || event._id?.toString?.() || event._id || `event_${index}`,
            // Koordinatları güvenli parse et - Backend'deki field isimleriyle uyumlu
            lat: parseFloat(event.latitude) || null,
            lon: parseFloat(event.longitude) || null,
            // Diğer alanları temizle
            baslik: event.baslik || 'İsimsiz Etkinlik',
            sehir: event.sehir || 'Bilinmeyen Şehir',
            mesafe: event.mesafe ? parseFloat(event.mesafe) : null
          };

          console.log(`📍 Etkinlik ${index + 1}: ${processedEvent.baslik} - Koordinat: ${processedEvent.lat}, ${processedEvent.lon}`);
          return processedEvent;
        })
        .filter(event => {
          const isValid = event.lat !== null && event.lon !== null && 
                          isValidCoordinate(event.lat, event.lon);
          
          if (!isValid) {
            console.warn(`❌ Geçersiz koordinat filtre edildi: ${event.baslik} - ${event.lat}, ${event.lon}`);
          }
          
          return isValid;
        });

      console.log(`✅ ${processedEvents.length} geçerli etkinlik işlendi`);

      // Aynı koordinatlarda birden fazla etkinlik varsa offset uygula
      const coordCounter = {};
      const finalEvents = processedEvents.map(event => {
        const key = `${event.lat.toFixed(4)},${event.lon.toFixed(4)}`;
        const count = coordCounter[key] || 0;
        coordCounter[key] = count + 1;
        
        if (count > 0) {
          const offset = 0.001 * count;
          const angle = (count * 45) * (Math.PI / 180);
          return { 
            ...event, 
            lat: event.lat + (Math.cos(angle) * offset), 
            lon: event.lon + (Math.sin(angle) * offset),
            offsetApplied: true
          };
        }
        return event;
      });

      setEvents(finalEvents);

      if (finalEvents.length === 0) {
        setError(`${radiusKm}km yarıçapında koordinatı olan etkinlik bulunamadı`);
      }

    } catch (error) {
      console.error('❌ Yakındaki etkinlikler hatası:', error);
      
      let errorMessage = 'Bilinmeyen hata';
      
      if (error.response) {
        // HTTP hata kodu
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
      
      // Kullanıcıya uygun alert göster
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        Alert.alert('Zaman Aşımı', 'İstek zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  }, [isValidCoordinate]); // fetchNearbyEvents dependency'lerini minimal tutun

  // Konum izni alma ve kullanıcı konumunu belirleme
  useEffect(() => {
    const requestLocationAndFetch = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📍 Konum izni isteniyor...');
        
        // Konum izni iste
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('📍 Konum izni durumu:', status);
        setPermissionStatus(status);
        
        if (status !== 'granted') {
          setError('Konum izni verilmedi');
          setLoading(false);
          return;
        }

        console.log('📍 Kullanıcı konumu alınıyor...');
        
        // Kullanıcının mevcut konumunu al
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
          maximumAge: 60000,
        });

        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        console.log('📍 Kullanıcı konumu alındı:', userCoords);

        // Koordinat doğrulaması
        if (!isValidCoordinate(userCoords.latitude, userCoords.longitude)) {
          throw new Error('Geçersiz konum koordinatları alındı');
        }

        setUserLocation(userCoords);
        
        // Harita bölgesini ayarla
        setRegion({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });

        console.log('📍 Yakındaki etkinlikler aranıyor...');
        
        // Yakındaki etkinlikleri getir
        await fetchNearbyEvents(userCoords.latitude, userCoords.longitude, DEFAULT_RADIUS);

      } catch (error) {
        console.error('❌ Konum alma hatası:', error);
        
        let errorMessage = 'Konum bilgisi alınamadı';
        
        if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
          errorMessage = 'Konum servisleri kapalı. Lütfen GPS\'inizi açın.';
        } else if (error.code === 'E_LOCATION_TIMEOUT') {
          errorMessage = 'Konum belirleme zaman aşımına uğradı.';
        } else if (error.message) {
          errorMessage += ': ' + error.message;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    requestLocationAndFetch();
  }, []); // Sadece mount'ta çalışsın

  // Radius değişikliklerini dinle - fetchNearbyEvents dependency'sini kaldırdık
  useEffect(() => {
    if (userLocation && radius && !loading && permissionStatus === 'granted') {
      console.log(`🔄 Radius değişti: ${radius}km`);
      // Doğrudan çağır, dependency olarak ekleme
      fetchNearbyEvents(userLocation.latitude, userLocation.longitude, radius);
    }
  }, [radius]); // Sadece radius değişikliklerini dinle

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
  }, [permissionStatus, radius, isValidCoordinate]);

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

  // Memoized marker components
  const eventMarkers = useMemo(() => {
    console.log(`🗺️ ${events.length} marker oluşturuluyor`);
    
    return events.map((event, index) => {
      // Tarih formatlama
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
          key={`${event.id}-${index}`}
          coordinate={{ latitude: event.lat, longitude: event.lon }}
          title={event.baslik || 'Etkinlik'}
          description={description}
          onCalloutPress={() => goToEventDetail(event)}
        >
          <View style={styles.markerWrapper}>
            <Image
              source={{ uri: getImageUrl(event.gorsel) }}
              style={styles.markerImage}
              onError={(e) => {
                console.warn('⚠️ Marker görseli yüklenemedi:', event.gorsel);
              }}
            />
            {event.mesafe && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{event.mesafe.toFixed(1)}km</Text>
              </View>
            )}
          </View>
        </Marker>
      );
    });
  }, [events, getImageUrl, goToEventDetail]);

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
            // Konum iznini tekrar iste
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
      {/* Debug Bilgisi (sadece development için) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Debug: User: {userLocation ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'null'} | 
            Events: {events.length} | 
            Radius: {radius}km
          </Text>
        </View>
      )}

      {/* Kontrol Paneli */}
      <View style={styles.controlPanel}>
        <View style={styles.radiusControls}>
          <Text style={styles.radiusLabel}>Arama Yarıçapı:</Text>
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
        
        <TouchableOpacity 
          style={[styles.refreshButton, loading && styles.refreshButtonDisabled]} 
          onPress={refreshLocation}
          disabled={loading}
        >
          <Text style={styles.refreshButtonText}>
            {loading ? '⏳' : '🔄'} Yenile
          </Text>
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
          style={StyleSheet.absoluteFillObject}
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
              radius={radius * 1000} // km'yi metre'ye çevir
              strokeColor="rgba(123, 44, 191, 0.5)"
              fillColor="rgba(123, 44, 191, 0.1)"
              strokeWidth={2}
            />
          )}

          {/* Etkinlik işaretleri */}
          {eventMarkers}
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
  debugInfo: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 2000,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  controlPanel: {
    position: 'absolute',
    top: __DEV__ ? 80 : 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
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
  },
  radiusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  radiusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  radiusButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  radiusButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
  },
  refreshButtonDisabled: {
    backgroundColor: '#ccc',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
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
  },
  markerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#f0f0f0',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  distanceText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
});