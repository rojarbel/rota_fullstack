import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import EtkinlikOnay from '../src/components/admin/EtkinlikOnay';
import Kullanicilar from '../src/components/admin/Kullanicilar';

const AdminPanel = () => {
  const [aktifSekme, setAktifSekme] = useState('etkinlik');



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Paneli</Text>
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, aktifSekme === 'etkinlik' && styles.activeButton]}
          onPress={() => setAktifSekme('etkinlik')}
        >
          <Text style={styles.buttonText}>Etkinlik Onay</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, aktifSekme === 'kullanici' && styles.activeButton]}
          onPress={() => setAktifSekme('kullanici')}
        >
          <Text style={styles.buttonText}>Kullanıcılar</Text>
        </TouchableOpacity>
      </View>

      {aktifSekme === 'etkinlik' && <EtkinlikOnay />}
      {aktifSekme === 'kullanici' && <Kullanicilar />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  button: {
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  activeButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
});

export default AdminPanel;
