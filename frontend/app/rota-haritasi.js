import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';

export default function RotaHaritasi() {
  const { lat, lng, baslik } = useLocalSearchParams();
  const [konum, setKonum] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setKonum(location.coords);
    })();
  }, []);

  if (!konum) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  const hedefKonum = {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
  };

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: konum.latitude,
        longitude: konum.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      <Marker coordinate={konum} title="Benim Konumum" pinColor="blue" />
      <Marker coordinate={hedefKonum} title={baslik || 'Etkinlik'} pinColor="red" />
      <Polyline
        coordinates={[konum, hedefKonum]}
        strokeColor="#7B2CBF"
        strokeWidth={4}
      />
    </MapView>
  );
}
