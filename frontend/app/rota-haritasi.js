import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';
export default function RotaHaritasi() {
  const { lat, lng, baslik } = useLocalSearchParams();
  const [konum, setKonum] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);



  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const origin = location.coords;
      setKonum(origin);

      const destination = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      };

      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;
      const GOOGLE_API_KEY =
        Constants.expoConfig?.extra?.googleMapsApiKey ||
        Constants.expoConfig?.extra?.googleMapsApiKeyAndroid ||
        Constants.expoConfig?.extra?.googleMapsApiKeyIos ||
        '';
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=walking&key=${GOOGLE_API_KEY}`;

      try {
        const response = await fetch(url);
        const json = await response.json();

        if (json.routes?.length) {
          const points = decodePolyline(json.routes[0].overview_polyline.points);
          setRouteCoordinates(points);
        }
      } catch (err) {
        console.error('Rota alınamadı:', err);
      }
    })();
  }, []);

  const decodePolyline = (t) => {
    return polyline.decode(t).map(([latitude, longitude]) => ({ latitude, longitude }));
  };

  if (!konum || !lat || !lng) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

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
    >
      <Marker coordinate={konum} title="Benim Konumum" pinColor="blue" />
      <Marker coordinate={hedefKonum} title={baslik || 'Etkinlik'} pinColor="red" />

      {routeCoordinates.length > 0 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#7B2CBF"
          strokeWidth={5}
        />
      )}
    </MapView>
  );
}
