import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from "react-native";
import axiosClient from '../../src/api/axiosClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import FastImage from 'expo-fast-image';
import logger from '../../src/utils/logger';

const kategoriler = {
  Aktivizm: ["Hayvan Hakları", "İklim ve Ekoloji", "İşçi Hakları", "Kadın Hakları", "LGBTİ+ Etkinlikleri", "Mülteci Hakları"],
  Atölye: ["Fotoğraf Atölyesi", "Hikâye Anlatımı", "Kodlama", "Müzik Atölyesi", "Sanat Atölyesi", "Zanaat"],
  Dans: ["Breakdance", "Halk Dansları", "Modern Dans", "Salsa / Bachata", "Swing", "Tango"],
  Konferans: ["Akademik Konferans", "Çevre ve Sürdürülebilirlik", "Girişimcilik & İnovasyon", "Kent ve Mekân", "Kültürel Çalışmalar", "Psikoloji", "Toplumsal Cinsiyet ve Eşitlik"],
  Konser: ["Arabesk", "Elektronik", "Halk Müziği", "Jazz", "Pop", "Rap", "Rock", "Sanat Müziği"],
  Sergi: ["Fotoğraf Sergisi", "İllüstrasyon & Grafik", "Heykel", "Karma Sergi", "Modern Sanat"],
  Sinema: ["Açık Hava", "Bağımsız Film", "Festival Gösterimi", "Gala Gösterimi", "Kısa Film Gecesi"],
  Spor: ["Bisiklet", "Ekstrem Sporlar", "E-Spor", "İzleyici Etkinliği", "Kamp", "Su Sporları", "Trekking", "Yoga / Meditasyon"],
  Tiyatro: ["Çocuk", "Dram", "Komedi", "Müzikal", "Stand-Up", "Trajedi"]
};

export default function DuzenleEtkinlik() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const etkinlik = params || {};

  const [form, setForm] = useState({
    baslik: etkinlik.baslik || "",
    sehir: etkinlik.sehir || "",
    tarih: etkinlik.tarih || "",
    fiyat: etkinlik.fiyat || "",
    kategori: etkinlik.kategori || "",
    tur: etkinlik.tur || "",
    gorsel: etkinlik.gorsel || "",
    aciklama: etkinlik.aciklama || ""
  });

  const [turListesi, setTurListesi] = useState(kategoriler[etkinlik.kategori] || []);

  useEffect(() => {
    setTurListesi(kategoriler[form.kategori] || []);
  }, [form.kategori]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === "kategori") {
      setTurListesi(kategoriler[value] || []);
      setForm(prev => ({ ...prev, tur: "" }));
    }
  };

const handleSubmit = async () => {
  try {
    await axiosClient.put(`/etkinlik/${etkinlik._id || etkinlik.id}`, form);
    Alert.alert("Başarılı", "Etkinlik güncellendi");
    router.back();
  } catch (err) {
    logger.error(err);
    Alert.alert("Hata", "Etkinlik güncellenemedi");
  }
};

const handleDelete = () => {
  Alert.alert("Sil", "Bu etkinliği silmek istiyor musun?", [
    { text: "İptal", style: "cancel" },
    {
      text: "Sil",
      style: "destructive",
      onPress: async () => {
        try {
          await axiosClient.delete(`/etkinlik/${etkinlik._id || etkinlik.id}`);
          Alert.alert("Silindi", "Etkinlik başarıyla silindi");
          router.replace("/");
        } catch (err) {
          logger.error(err);
          Alert.alert("Hata", "Etkinlik silinemedi");
        }
      }
    }
  ]);
};

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>Etkinliği Düzenle</Text>

      <Text>Başlık</Text>
      <TextInput value={form.baslik} onChangeText={text => handleChange("baslik", text)} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />

      <Text>Şehir</Text>
      <TextInput value={form.sehir} onChangeText={text => handleChange("sehir", text)} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />

      <Text>Tarih</Text>
      <TextInput value={form.tarih} onChangeText={text => handleChange("tarih", text)} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} placeholder="yyyy-mm-dd" />

      <Text>Fiyat</Text>
      <TextInput value={form.fiyat} onChangeText={text => handleChange("fiyat", text)} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />

      <Text>Kategori</Text>
      <Picker selectedValue={form.kategori} onValueChange={(val) => handleChange("kategori", val)}>
        <Picker.Item label="Kategori Seç" value="" />
        {Object.keys(kategoriler).map(kat => (
          <Picker.Item key={kat} label={kat} value={kat} />
        ))}
      </Picker>

      <Text>Tür</Text>
      <Picker selectedValue={form.tur} onValueChange={(val) => handleChange("tur", val)}>
        <Picker.Item label="Tür Seç" value="" />
        {turListesi.map(tur => (
          <Picker.Item key={tur} label={tur} value={tur} />
        ))}
      </Picker>

      <Text>Görsel URL</Text>
      <TextInput value={form.gorsel} onChangeText={text => handleChange("gorsel", text)} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      {form.gorsel?.length > 5 && (
      <FastImage
        uri={form.gorsel}
        cacheKey={form.gorsel}
        style={{ width: '100%', height: 220, borderRadius: 12, marginBottom: 12 }}
      />
    )}

      <Text>Açıklama</Text>
      <TextInput multiline numberOfLines={4} value={form.aciklama} onChangeText={text => handleChange("aciklama", text)} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />

      <TouchableOpacity onPress={handleSubmit} style={{ backgroundColor: '#6c5ce7', padding: 12, borderRadius: 8, marginBottom: 10 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Güncelle</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleDelete} style={{ backgroundColor: '#d63031', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Etkinliği Sil</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
