import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import axiosClient from '../src/api/axiosClient';
import { IMAGE_BASE_URL } from '../src/constants';
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

  // Koordinat doğrulama fonksiyonu - memoized
  const isValidCoordinate = useCallback((lat, lng) => {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' && 
      !isNaN(lat) && 
      !isNaN(lng) &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  }, []);

  // Görsel URL'ini güvenli şekilde oluştur - memoized
  const getImageUrl = useCallback((gorsel) => {
    if (!gorsel || typeof gorsel !== 'string') {
      return 'https://via.placeholder.com/200x100/cccccc/666666?text=Etkinlik';
    }
    
    if (gorsel.startsWith('http')) return gorsel;
    if (gorsel.startsWith('/')) {
      const baseUrl = IMAGE_BASE_URL || 'https://your-domain.com';
      return `${baseUrl}${gorsel}`;
    }
    
    return gorsel;
  }, []);

  // Yakındaki etkinlikleri getir - memoized
  const fetchNearbyEvents = useCallback(async (lat, lon, radiusKm) => {
    try {
      setLoading(true);
      setError(null);
      
      // Parametreleri doğrula
      if (!isValidCoordinate(lat, lon)) {
        throw new Error('Geçersiz koordinatlar');
      }

      console.log(`🔍 API çağrısı: lat=${lat}, lng=${lon}, radius=${radiusKm}km`);
      
      // Backend'e konum ve yarıçap gönder (metre cinsinden)
      const { data } = await axiosClient.get('/yakindaki', {
        params: { 
          lat: lat,
          lng: lon,
          radius: radiusKm * 1000 // km'yi metre'ye çevir
        },
        timeout: 15000 // 15 saniye timeout
      });

      console.log('📍 API yanıtı:', data);

      // Veri yapısını kontrol et - backend'den gelen yapıya uygun
      let eventList = [];
      if (data?.etkinlikler && Array.isArray(data.etkinlikler)) {
        eventList = data.etkinlikler;
      } else if (Array.isArray(data)) {
        eventList = data;
      } else {
        console.warn('Beklenmeyen veri yapısı:', data);
        eventList = [];
      }

      // Koordinat verilerini işle ve güvenli parse et
      const coordCounter = {};
      const processedEvents = eventList
        .map(e => {
          // Backend'den gelen veri yapısına göre koordinat alanlarını kontrol et
          const lat = parseFloat(e.latitude || e.lat);
          const lon = parseFloat(e.longitude || e.lng || e.lon);
          
          return {
            ...e,
            lat: isNaN(lat) ? null : lat,
            lon: isNaN(lon) ? null : lon,
            // ID alanını normalize et
            id: e.id || e._id?.toString?.() || e._id,
          };
        })
        .filter(e => {
          // Geçerli koordinatları olan etkinlikleri filtrele
          return e.lat !== null && e.lon !== null && isValidCoordinate(e.lat, e.lon);
        })
        .map(e => {
          // Aynı koordinatlarda birden fazla etkinlik varsa daha belirgin kaydır
          const key = `${e.lat.toFixed(5)},${e.lon.toFixed(5)}`;
          const count = coordCounter[key] || 0;
          coordCounter[key] = count + 1;
          
          if (count > 0) {
            // Offset'i artırdık ki görsel olarak ayrılabilsin
            const offset = 0.0005 * count; // Offset'i artırdım
            const angle = (count * 60) * (Math.PI / 180); // 60 derece aralıklarla dağıt
            return { 
              ...e, 
              lat: e.lat + (Math.cos(angle) * offset), 
              lon: e.lon + (Math.sin(angle) * offset),
              offsetApplied: true
            };
          }
          return e;
        });

      console.log(`✅ ${processedEvents.length} geçerli etkinlik işlendi`);
      setEvents(processedEvents);

      if (processedEvents.length === 0) {
        setError(`${radiusKm}km yarıçapında etkinlik bulunamadı`);
      }

    } catch (error) {
      console.error('❌ Yakındaki etkinlikler hatası:', error);
      let errorMessage = 'Bilinmeyen hata';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError('Etkinlikler yüklenemedi: ' + errorMessage);
      
      // Network hatası kontrolü
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        Alert.alert('Zaman Aşımı', 'İstek zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
      } else {
        Alert.alert('Hata', 'Yakındaki etkinlikler yüklenirken sorun oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }, [isValidCoordinate]);

  // Konum izni alma ve kullanıcı konumunu belirleme
  useEffect(() => {
    const requestLocationAndFetch = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Konum izni iste
        const { status } = await Location.requestForegroundPermissionsAsync();
        setPermissionStatus(status);
        
        if (status !== 'granted') {
          setError('Konum izni verilmedi');
          Alert.alert(
            'Konum İzni Gerekli',
            'Yakınındaki etkinlikleri gösterebilmek için konum iznine ihtiyacımız var.',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Tekrar Dene', onPress: () => requestLocationAndFetch() }
            ]
          );
          setLoading(false);
          return;
        }

        // Kullanıcının mevcut konumunu al
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 20000, // 20 saniye timeout
          maximumAge: 60000, // 1 dakika cache
        });

        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        // Koordinat doğrulaması
        if (!isValidCoordinate(userCoords.latitude, userCoords.longitude)) {
          throw new Error('Geçersiz konum koordinatları alındı');
        }

        console.log('📍 Kullanıcı konumu:', userCoords);
        setUserLocation(userCoords);
        
        // Harita bölgesini ayarla
        setRegion({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });

        // Yakındaki etkinlikleri getir
        await fetchNearbyEvents(userCoords.latitude, userCoords.longitude, radius);

      } catch (error) {
        console.error('Konum alınamadı:', error);
        let errorMessage = 'Konum bilgisi alınamadı';
        
        if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
          errorMessage = 'Konum servisleri kapalı. Lütfen GPS\'inizi açın.';
        } else if (error.code === 'E_LOCATION_TIMEOUT') {
          errorMessage = 'Konum belirleme zaman aşımına uğradı.';
        } else if (error.message) {
          errorMessage += ': ' + error.message;
        }
        
        setError(errorMessage);
        Alert.alert('Konum Hatası', errorMessage);
        setLoading(false);
      }
    };

    requestLocationAndFetch();
  }, []); // Sadece mount'ta çalışsın

  // Radius değişikliklerini dinle
  useEffect(() => {
    if (userLocation && radius && !loading) {
      fetchNearbyEvents(userLocation.latitude, userLocation.longitude, radius);
    }
  }, [radius, userLocation, fetchNearbyEvents, loading]);

  // Yarıçapı değiştir
  const changeRadius = useCallback(async (newRadius) => {
    if (userLocation && newRadius !== radius && !loading) {
      setRadius(newRadius);
      // fetchNearbyEvents useEffect ile otomatik çağrılacak
    }
  }, [userLocation, radius, loading]);

  // Konumu yenile
  const refreshLocation = useCallback(async () => {
    if (permissionStatus === 'granted' && !loading) {
      try {
        setLoading(true);
        setError(null);
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 20000,
          maximumAge: 5000, // 5 saniye cache
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
        console.error('Konum yenilenemedi:', error);
        setError('Konum yenilenemedi: ' + error.message);
        Alert.alert('Hata', 'Konum yenilenemedi. GPS ayarlarınızı kontrol edin.');
      }
    }
  }, [permissionStatus, radius, fetchNearbyEvents, isValidCoordinate, loading]);

  // Etkinlik detayına git
  const goToEventDetail = useCallback((event) => {
    const eventId = event.id || event._id;
    console.log('Etkinlik detayına gidiliyor:', eventId);
    
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
    return events.map((event) => {
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
          console.warn('Tarih formatlanamadı:', event.tarih);
        }
      }

      return (
        <Marker
          key={`${event.id}-${event.lat}-${event.lon}`}
          coordinate={{ latitude: event.lat, longitude: event.lon }}
          title={event.baslik || 'Etkinlik'}
          description={`📅 ${formattedDate}\n📍 ${event.sehir || 'Şehir Bilinmiyor'}${event.mesafe ? `\n🚶 ${event.mesafe} km uzaklıkta` : ''}`}
          onCalloutPress={() => goToEventDetail(event)}
        >
          <View style={styles.markerWrapper}>
            <Image
              source={{ uri: getImageUrl(event.gorsel) }}
              style={styles.markerImage}
              onError={(e) => {
                console.warn('Marker görseli yüklenemedi:', event.gorsel, e.nativeEvent.error);
              }}
              defaultSource={{ uri: 'https://via.placeholder.com/40x40/cccccc/666666?text=E' }}
            />
            {event.mesafe && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{event.mesafe}km</Text>
              </View>
            )}
          </View>
        </Marker>
      );
    });
  }, [events, getImageUrl, goToEventDetail]);

  // İzin verilmemişse
  if (permissionStatus === 'denied' || (error && error.includes('izin'))) {
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
        <Text style={styles.loadingText}>Yakındaki etkinlikler aranıyor...</Text>
        <Text style={styles.loadingSubText}>Bu işlem birkaç saniye sürebilir</Text>
      </View>
    );
  }

  // Hata durumu
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

  return (
    <View style={{ flex: 1 }}>
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
      {region && (
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
    top: 60,
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