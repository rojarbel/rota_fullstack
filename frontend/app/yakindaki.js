import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Image, StyleSheet } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import axiosClient from '../src/api/axiosClient';
import { IMAGE_BASE_URL } from '../src/constants';
const PRIMARY = '#7B2CBF';

export default function Yakindaki() {
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [region, setRegion] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPermissionDenied(true);
          setLoading(false);
          return;
        }

        const { coords } = await Location.getCurrentPositionAsync({});
        const lat = coords.latitude;
        const lng = coords.longitude;
                const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const cityName = geo?.[0]?.city;

        setRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });

        const { data } = await axiosClient.get('/etkinlik', {
          params: { sehir: cityName },
        });
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.log('Konum veya etkinlikler alınamadı:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.center}>
        <Text>Konum izni verilmedi.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {region && (
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={region}
          showsUserLocation
        >
          {events.map((e) => {
                        const lat = parseFloat(e.latitude);
            const lon = parseFloat(e.longitude);
            if (Number.isNaN(lat) || Number.isNaN(lon)) {
              return null;
            }
            const img =
              e.gorsel && e.gorsel.startsWith('/')
                ? `${IMAGE_BASE_URL}${e.gorsel}`
                : null;
            return (
              <Marker
                key={e._id || e.id}
                coordinate={{ latitude: lat, longitude: lon }}

                
              >
              
                {img && <Image source={{ uri: img }} style={styles.markerImage} />}
                <Callout tooltip>
                  <View style={styles.callout}>
                    {img && (
                      <Image source={{ uri: img }} style={styles.calloutImage} />
                    )}
                    <Text style={styles.calloutTitle}>{e.baslik}</Text>
                    {e.sehir && (
                      <Text style={styles.calloutText}>{e.sehir}</Text>
                    )}
                    {e.tarih && (
                      <Text style={styles.calloutText}>
                        {new Date(e.tarih).toLocaleDateString('tr-TR')}
                      </Text>
                    )}
                  </View>
                </Callout>
              </Marker>
            );
          })}
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
  },
  markerImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  callout: {
    width: 200,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
  },
  calloutImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 6,
  },
  calloutTitle: {
    fontWeight: '700',
    marginBottom: 4,
    color: PRIMARY,
  },
  calloutText: {
    fontSize: 12,
    color: '#333',
  },
});