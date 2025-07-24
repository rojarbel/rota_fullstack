import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';

export default function RotaHaritasi() {
  const { lat, lng, baslik } = useLocalSearchParams();
  const [konum, setKonum] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getLocationAndRoute = async () => {
      try {
        // Konum izni kontrol et
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Konum İzni', 'Konum izni gerekli');
          setLoading(false);
          return;
        }

        // Mevcut konumu al
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const origin = location.coords;
        setKonum(origin);

        // Hedef konum
        const destination = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        };

        // API key kontrol et
        const GOOGLE_API_KEY =
          Constants.expoConfig?.extra?.googleMapsApiKey ||
          Constants.expoConfig?.extra?.googleMapsApiKeyAndroid ||
          Constants.expoConfig?.extra?.googleMapsApiKeyIos ||
          '';

        if (!GOOGLE_API_KEY) {
          console.error('Google Maps API key bulunamadı');
          setLoading(false);
          return;
        }

        // Directions API çağrısı
        const originStr = `${origin.latitude},${origin.longitude}`;
        const destinationStr = `${destination.latitude},${destination.longitude}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=walking&key=${GOOGLE_API_KEY}`;

        console.log('API çağrısı yapılıyor:', url.replace(GOOGLE_API_KEY, 'API_KEY_HIDDEN'));

        const response = await fetch(url);
        const json = await response.json();

        console.log('API yanıtı:', json);

        // Yanıt kontrolleri
        if (json.status === 'REQUEST_DENIED') {
          console.error('API isteği reddedildi:', json.error_message);
          Alert.alert('Hata', 'Google Maps API erişimi reddedildi');
        } else if (json.status === 'ZERO_RESULTS') {
          console.error('Rota bulunamadı');
          Alert.alert('Hata', 'Bu konumlar arasında rota bulunamadı');
        } else if (json.status === 'OVER_QUERY_LIMIT') {
          console.error('API sorgu limiti aşıldı');
          Alert.alert('Hata', 'API sorgu limiti aşıldı');
        } else if (json.routes?.length) {
          const points = decodePolyline(json.routes[0].overview_polyline.points);
          setRouteCoordinates(points);
          console.log('Rota koordinatları yüklendi:', points.length, 'nokta');
        } else {
          console.error('Beklenmeyen API yanıtı:', json);
        }

      } catch (err) {
        console.error('Rota alınamadı:', err);
        Alert.alert('Hata', 'Rota alınırken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    // lat ve lng parametrelerinin varlığını kontrol et
    if (lat && lng) {
      getLocationAndRoute();
    } else {
      console.error('Gerekli parametreler eksik: lat, lng');
      setLoading(false);
    }
  }, [lat, lng]);

  const decodePolyline = (encodedPolyline) => {
    try {
      return polyline.decode(encodedPolyline).map(([latitude, longitude]) => ({ 
        latitude, 
        longitude 
      }));
    } catch (error) {
      console.error('Polyline decode hatası:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B2CBF" />
      </View>
    );
  }

  if (!konum || !lat || !lng) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B2CBF" />
      </View>
    );
  }

  const hedefKonum = {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
  };

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={{ flex: 1 }}
      googleMapsApiKey={
        Platform.OS === 'ios'
          ? Constants.expoConfig?.extra?.googleMapsApiKeyIos
          : Constants.expoConfig?.extra?.googleMapsApiKeyAndroid
      }
      initialRegion={{
        latitude: konum.latitude,
        longitude: konum.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      showsUserLocation={true}
      showsMyLocationButton={true}
    >
      <Marker 
        coordinate={konum} 
        title="Benim Konumum" 
        pinColor="blue" 
        identifier="origin"
      />
      <Marker 
        coordinate={hedefKonum} 
        title={baslik || 'Etkinlik'} 
        pinColor="red" 
        identifier="destination"
      />

      {routeCoordinates.length > 0 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#7B2CBF"
          strokeWidth={5}
          lineDashPattern={[1]}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});