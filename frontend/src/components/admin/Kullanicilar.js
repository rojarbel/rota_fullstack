// src/components/admin/Kullanicilar.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getItem as getSecureItem } from '../../utils/storage';
import axiosClient from '../../api/axiosClient';
import { FlatList } from 'react-native';
import handleApiError from '../../utils/handleApiError';

const Kullanicilar = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const fetchTokenAndUsers = async () => {
      try {
        const storedToken = await getSecureItem('accessToken');
        setToken(storedToken);
        const res = await axiosClient.get('/users', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        setUsers(res.data);
      } catch (err) {
        handleApiError(err, 'Kullanıcıları çekerken hata oluştu');

      } finally {
        setLoading(false);
      }
    };
    fetchTokenAndUsers();
  }, []);

  const handleDelete = async (id) => {
    Alert.alert(
      'Kullanıcı Sil',
      'Bu kullanıcıyı silmek istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosClient.delete(`/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setUsers(users.filter((user) => user.id !== id));
            } catch (err) {
              handleApiError(err, 'Kullanıcı silme hatası');
            }
          },
        },
      ]
    );
  };

  const handleRoleChange = async (id, newRole) => {
    try {
    await axiosClient.put(
      `/users/change-role/${id}`,
        { role: newRole },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, role: newRole } : user))
      );
    } catch (err) {
      handleApiError(err, 'Rol güncelleme hatası');
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 50 }} />;

  return (
<View style={styles.container}>
  <Text style={styles.header}>Kullanıcı Listesi</Text>

  <FlatList
    data={users}
    keyExtractor={(item) => item.id || item._id}
    ListEmptyComponent={<Text>Şu anda kullanıcı bulunmuyor.</Text>}
    renderItem={({ item: user }) => (
      <View style={styles.card}>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.meta}>Kayıt: {new Date(user.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.meta}>Rol: {user.role}</Text>

        <Picker
          selectedValue={user.role}
          onValueChange={(value) => handleRoleChange(user.id, value)}
          style={styles.picker}
        >
          <Picker.Item label="user" value="user" />
          <Picker.Item label="admin" value="admin" />
        </Picker>

        <Button title="Sil" color="red" onPress={() => handleDelete(user.id)} />
      </View>
    )}
    contentContainerStyle={{ paddingBottom: 32 }}
    initialNumToRender={8}
    maxToRenderPerBatch={12}
    windowSize={10}
    removeClippedSubviews={true}
  />
</View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  email: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  meta: {
    fontSize: 14,
    color: '#555',
  },
  picker: {
    marginTop: 8,
    marginBottom: 12,
  },
});

export default Kullanicilar;
