import React, { useEffect, useRef, useState, useContext } from 'react';
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';
import handleApiError from '../utils/handleApiError';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#7B2CBF';

const zamanFarki = (tarih) => {
  const simdi = new Date();
  const yorumTarihi = new Date(tarih);
  const saniye = Math.floor((simdi - yorumTarihi) / 1000);
  if (saniye < 60) return `${saniye} sn önce`;
  const dakika = Math.floor(saniye / 60);
  if (dakika < 60) return `${dakika} dk önce`;
  const saat = Math.floor(dakika / 60);
  if (saat < 24) return `${saat} sa önce`;
  const gun = Math.floor(saat / 24);
  return `${gun} gün önce`;
};

const touchableIcon = (liked, onPress, count, tarih, disabled = false) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={18}
        color={disabled ? '#ccc' : (liked ? PRIMARY : '#999')}
        onPress={onPress}
      />
    </TouchableOpacity>
    <Text style={{ fontSize: 12, color: disabled ? '#ccc' : '#888' }}>{count}</Text>
    <Text style={{ fontSize: 12, color: '#aaa' }}>· {zamanFarki(tarih)}</Text>
  </View>
);

function CommentCard({
  yorum,
  level = 0,
  getYanitlar,
  yanitId,
  setYanitId,
  yanitlar,
  setYanitlar,
  yanitGonder,
  setYorumlar,
}) {
  const auth = useContext(AuthContext);
  const inputRef = useRef(null);

  useEffect(() => {
    if (yanitId !== yorum._id) return;
    const timeout = setTimeout(() => {
      if (inputRef.current?.isFocused?.() === false) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [yanitId, yorum._id]);

  const altYorumlar = getYanitlar(yorum._id);
  const isAltYorum = level === 1;
  const isUser = auth?.userId === yorum.kullaniciId?.toString();

  const [duzenleModu, setDuzenleModu] = useState(false);
  const [duzenlenenMetin, setDuzenlenenMetin] = useState(yorum.yorum);

  const yorumuGuncelle = async () => {
    try {
      const { data } = await axiosClient.put(`/yorum/${yorum._id}`, {
        yorum: duzenlenenMetin,
      });
      setYorumlar(prev => prev.map(y => (y._id === yorum._id ? data : y)));
      setDuzenleModu(false);
    } catch (err) {
      handleApiError(err, 'Yorum güncellenemedi');
    }
  };

  const yorumuSil = async () => {
    Alert.alert('Yorum silinsin mi?', 'Bu işlem geri alınamaz', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosClient.delete(`/yorum/${yorum._id}`);
            setYorumlar(prev => prev.filter(y => y._id !== yorum._id));
          } catch (err) {
            handleApiError(err, 'Silme başarısız');
          }
        },
      },
    ]);
  };

  return (
  <View key={yorum._id} style={{ 
    marginBottom: 12,
    opacity: yorum.tempYorum ? 0.7 : 1,
    backgroundColor: yorum.tempYorum ? '#f8f8f8' : 'transparent'
  }}>
    <View style={{ flexDirection: 'row', paddingLeft: isAltYorum ? 48 : 0 }}>
        <Image source={{ uri: yorum.avatarUrl || `https://ui-avatars.com/api/?name=${yorum.kullanici}` }} style={{
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: 10,
  borderWidth: 1,
  borderColor: '#eee',
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
}} />
        <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>{yorum.kullanici}</Text>
          {yorum.tempYorum && (
            <Text style={{ 
              fontSize: 11, 
              color: '#999', 
              fontStyle: 'italic',
              backgroundColor: '#e8e8e8',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8
            }}>
              Gönderiliyor...
            </Text>
          )}
        </View>

        {duzenleModu ? (
            <>
              <TextInput
                value={duzenlenenMetin}
                onChangeText={setDuzenlenenMetin}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginVertical: 4 }}
                multiline
              />
              <TouchableOpacity onPress={yorumuGuncelle} style={{ backgroundColor: PRIMARY, padding: 6, borderRadius: 6 }}>
                <Text style={{ color: '#fff' }}>Kaydet</Text>
              </TouchableOpacity>
            </>
          ) : (
          <Text style={{ color: '#444', fontSize: 15, lineHeight: 20, marginVertical: 6 }}>{yorum.yorum}</Text>

          )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {touchableIcon(
            yorum.begendinMi,
            yorum.tempYorum ? () => {} : async () => {
              try {
                const { data: updated } = await axiosClient.put(`/yorum/begen/${yorum._id}`);
                setYorumlar(prev => prev.map(item => (item._id === updated._id ? updated : item)));
              } catch (err) {
                handleApiError(err, 'Beğenme işlemi başarısız');
              }
            },
            yorum.begeni || 0,
            yorum.tarih
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              disabled={yorum.tempYorum}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                backgroundColor: yorum.tempYorum ? '#e8e8e8' : '#f5f5f5',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                opacity: yorum.tempYorum ? 0.5 : 1,
              }}
              onPress={() => !yorum.tempYorum && setYanitId(yorum._id)}
            >
              <Text style={{ color: yorum.tempYorum ? '#999' : PRIMARY, fontWeight: '500' }}>
                Yanıtla
              </Text>
            </TouchableOpacity>
          </View>
        </View>

          <View style={{ marginTop: 8, display: String(yanitId) === String(yorum._id) ? 'flex' : 'none' }}>
            <TextInput
              ref={inputRef}
              value={yanitlar[yorum._id] || ''}
              onChangeText={text => {
                if (yanitlar[yorum._id] !== text) {
                  setYanitlar(prev => ({ ...prev, [yorum._id]: text }));
                }
              }}
              placeholder="Yanıtınızı yazın..."
              multiline
              scrollEnabled
              blurOnSubmit={false}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 15,
                backgroundColor: '#fafafa',
              }}
            />
            <TouchableOpacity
              onPress={() => yanitGonder(yorum._id)}
              style={{
                backgroundColor: PRIMARY,
                borderRadius: 8,
                paddingVertical: 10,
                marginTop: 10,
                alignSelf: 'flex-end',
                width: 100,
              }}
            >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 15 }}>Yanıtla</Text>

            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={{ height: 0.6, backgroundColor: '#ddd', marginVertical: 12 }} />
      {altYorumlar.map(alt => (
        <CommentCard
          key={alt._id}
          yorum={alt}
          level={1}
          getYanitlar={getYanitlar}
          yanitId={yanitId}
          setYanitId={setYanitId}
          yanitlar={yanitlar}
          setYanitlar={setYanitlar}
          yanitGonder={yanitGonder}
          setYorumlar={setYorumlar}
        />
      ))}
    </View>
  );
}

export default React.memo(CommentCard);