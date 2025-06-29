import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, Image, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Callout } from 'react-native-maps';
import axiosClient from '../src/api/axiosClient';
import { IMAGE_BASE_URL } from '../src/constants';
import { useRouter } from 'expo-router';
const PRIMARY = '#7B2CBF';
const BLUE = '#3498db';

const cities = [
  "Adana", "Adıyaman", "Afyon", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın",
  "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı",
  "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep",
  "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars",
  "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa",
  "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun",
  "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van",
  "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", "Bartın",
  "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];

export default function Yakindaki() {

  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState(null);
  const [events, setEvents] = useState([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const citiesMemo = useMemo(() => cities, []);
  const markersRef = useRef({});

  const handleCitySelect = (city) => {
    setSelectedCity(city);
  };

  useEffect(() => {
    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationGranted(status === 'granted');
      } catch (err) {
        console.log('Konum izni alınamadı:', err);
      }
    };
    requestLocation();
  }, []);

  useEffect(() => {
    if (!selectedCity) return;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data } = await axiosClient.get('/etkinlik', {
          params: { sehir: selectedCity },
        });

        let list = Array.isArray(data) ? data : [];
        const coordCounter = {};
        list = list
          .map(e => ({
            ...e,
            lat: parseFloat(e.latitude),
            lon: parseFloat(e.longitude),
          }))
          .filter(e => !Number.isNaN(e.lat) && !Number.isNaN(e.lon))
          .map(e => {
            const key = `${e.lat},${e.lon}`;
            const count = coordCounter[key] || 0;
            coordCounter[key] = count + 1;
            if (count) {
              const offset = 0.0001 * count;
              return { ...e, lat: e.lat + offset, lon: e.lon + offset };
            }
            return e;
          });

        setEvents(list);

        if (list.length > 0) {
          setRegion({
            latitude: list[0].lat,
            longitude: list[0].lon,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        } else {
          setRegion(null);
        }
      } catch (err) {
        console.log('Etkinlikler alınamadı:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedCity]);

  if (!selectedCity) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Şehir Seç</Text>
        <FlatList
          data={citiesMemo}
          keyExtractor={(item) => item}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.cityButton, { flex: 1, marginHorizontal: 6 }]}
              onPress={() => handleCitySelect(item)}
            >
              <Text style={styles.cityText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {region && (
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={region}
          showsUserLocation={locationGranted}
          showsMyLocationButton={locationGranted}
        >
          {events.map((e) => {
            // Debug için console log
            console.log('Event data:', e);
            
            return (
              <Marker
                key={e._id || e.id}
                coordinate={{ latitude: e.lat, longitude: e.lon }}
                title={e.baslik || 'Etkinlik'}
                description={`📅 ${e.tarih ? new Date(e.tarih).toLocaleDateString('tr-TR') : 'Tarih Bilinmiyor'} \n📍 ${e.sehir || selectedCity}`}
                onCalloutPress={() => {
                  console.log('Callout pressed for event:', e._id || e.id);
                  router.push({ 
                    pathname: '/etkinlik/[id]', 
                    params: { id: e._id || e.id } 
                  });
                }}
              >
                <View style={styles.markerWrapper}>
                  <Image
                    source={{
                      uri: e.gorsel?.startsWith('/')
                        ? `${IMAGE_BASE_URL}${e.gorsel}`
                        : (e.gorsel || 'https://via.placeholder.com/200x100?text=Etkinlik')
                    }}
                    style={styles.markerImage}
                  />
                </View>
              </Marker>
            );
          })}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  cityButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cityText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BLUE,
  },
  markerImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },

  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});