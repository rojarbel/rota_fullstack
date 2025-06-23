import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import axiosClient from '../src/api/axiosClient';

export default function Yakindaki() {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Konum izni reddedildi');
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        setCoords({ latitude, longitude });
        await fetchEvents(latitude, longitude);
      } catch (err) {
        setError('Konum alınamadı');
        setLoading(false);
      }
    })();
  }, []);

  const fetchEvents = async (latitude, longitude) => {
    try {
      const { data } = await axiosClient.get('/etkinlik/yakindaki', {
        params: { lat: latitude, lng: longitude },
      });
      const list = Array.isArray(data)
        ? data.map(e => ({ ...e, id: e._id || e.id }))
        : [];
      setEvents(list);
    } catch (err) {
      setError('Etkinlikler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7B2CBF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {coords && (
        <MapView
          style={StyleSheet.absoluteFill}
          showsUserLocation
          initialRegion={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {events.map(ev =>
            ev.latitude && ev.longitude ? (
              <Marker
                key={ev.id}
                coordinate={{ latitude: ev.latitude, longitude: ev.longitude }}
                onPress={() => router.push({ pathname: '/etkinlik/[id]', params: { id: ev.id } })}
              >
                <View style={styles.markerWrapper}>
                  <Image
                    source={{ uri: `https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net${ev.gorsel}` }}
                    style={styles.markerImage}
                  />
                </View>
              </Marker>
            ) : null
          )}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerWrapper: {
    borderWidth: 1,
    borderColor: '#7B2CBF',
    borderRadius: 18,
    padding: 2,
    backgroundColor: '#fff',
  },
  markerImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});