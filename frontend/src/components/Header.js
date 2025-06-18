import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteItems } from '../utils/storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axiosClient from '../api/axiosClient';
import useAuth from '../hooks/useAuth';
import { Platform, StatusBar } from 'react-native';
import { setCachedToken } from '../api/axiosClient';
import FastImage from 'expo-fast-image';
import handleApiError from '../utils/handleApiError';
import { Ionicons } from '@expo/vector-icons';
import { TouchableWithoutFeedback, Keyboard } from 'react-native';


const Header = ({ onHamburgerClick, onSearchChange }) => {
const [profilePhoto, setProfilePhoto] = useState(null);

  // 📦 STATE TANIMLARI (tam liste)
  const [selectedCity, setSelectedCity] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [bekleyenSayisi, setBekleyenSayisi] = useState(0);
  const [bekleyenEtkinlikler, setBekleyenEtkinlikler] = useState([]);
  const auth = useAuth();
  const { isLoggedIn, username, role } = auth || {};
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [bildirimler, setBildirimler] = useState([]);
  const [bildirimPanelAcik, setBildirimPanelAcik] = useState(false);

  // 🔍 Etkinlik arama fonksiyonu
  const fetchSearchResults = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await axiosClient.get(`/etkinlik/search?q=${encodeURIComponent(query)}`);

      setSearchResults(res.data);
    } catch (err) {
      handleApiError(err, 'Arama sonuçları alınamadı');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 🌆 Şehir seçimi sonrası yönlendirme
  const handleShowEvents = () => {
    if (!selectedCity) {
      Alert.alert('Lütfen bir şehir seçin!');
      return;
    }
    router.push({ pathname: '/arama-sonuclari', params: { sehir: selectedCity } });
    setIsModalVisible(false);
  };

  // 🔑 Giriş yapılmadan yönlendirme engeli
  const handleProtectedClick = (path) => {
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      router.push(`/${path}`);
    }
  };


  // 🧠 Admin bekleyen etkinlik sayısı
  useEffect(() => {
    const fetchBekleyenler = async () => {
      if (role !== 'admin') return;
      try {
        const res = await axiosClient.get('/etkinlik/bekleyen');
        setBekleyenSayisi(res.data.length);
        setBekleyenEtkinlikler(res.data);
      } catch (err) {
        handleApiError(err, 'Bekleyen etkinlikler alınamadı');

      }
    };

    fetchBekleyenler();
  }, [role]);

useEffect(() => {
  if (isLoggedIn) {
    const fetchProfilePhoto = async () => {
      const image = await AsyncStorage.getItem('image');
      setProfilePhoto(image);
    };
    fetchProfilePhoto();
  } else {
    setProfilePhoto(null); // 🔥 Kullanıcı çıkış yaptıysa sıfırla
  }
}, [isLoggedIn]); // sadece giriş durumu değişince çalışır

useEffect(() => {
  if (bildirimPanelAcik) {
    axiosClient.put("/bildirim/okundu")
      .then(() => {
        setBildirimler(prev =>
          prev.map(b => ({ ...b, okunduMu: true }))
        );
      })
      .catch(err => handleApiError(err, 'Bildirim okundu işaretlenemedi'));
  }
}, [bildirimPanelAcik]);

useEffect(() => {
  const fetchBildirimler = async () => {
    try {
      await axiosClient.get("/etkinlik/favori-bildirim");
      const res = await axiosClient.get("/bildirim");
      setBildirimler(res.data || []);
    } catch (err) {
      handleApiError(err, 'Bildirimler alınamadı');

    }
  };

  if (isLoggedIn) fetchBildirimler();
}, [isLoggedIn]);

const handleBildirimTikla = async (bildirim) => {
if ((bildirim.tip === 'yanit' || bildirim.tip === 'begeni') && bildirim.yorumId) {
  try {
    const res = await axiosClient.get(`/yorum/tek/${bildirim.yorumId}`);
    const etkinlikId = res.data.etkinlikId;
    if (etkinlikId) {
      router.push(`/etkinlik/${etkinlikId}`);
    } else {
      Alert.alert("Etkinlik bulunamadı");
    }
  } catch (err) {
   handleApiError(err, 'Yorum verisi alınamadı');
  }
}

if (bildirim.tip === 'favori' && bildirim.etkinlikId) {
  const id = typeof bildirim.etkinlikId === 'object' ? bildirim.etkinlikId._id : bildirim.etkinlikId;
  if (id) router.push(`/etkinlik/${id}`);
}
};

  return (
   <View style={styles.header}>
    {bildirimPanelAcik && (
    <TouchableWithoutFeedback>
      <View style={[styles.bildirimDisiKapan, { zIndex: 50 }]} pointerEvents="none" />
    </TouchableWithoutFeedback>
    )}

    <View style={styles.topBar}>
  <Image source={require('../assets/logo.png')} style={styles.logo} />

  <TextInput
    style={styles.searchInput}
    placeholder="Etkinlik Ara"
    value={searchQuery}
    onChangeText={(text) => {
      setSearchQuery(text);
      setShowDropdown(true);
      fetchSearchResults(text);
    }}
    onSubmitEditing={() => {
      if (searchQuery.trim()) {
        router.push({ pathname: "/arama-sonuclari", params: { q: searchQuery.trim() } });
        setShowDropdown(false);
      }
    }}
  />
{isLoggedIn && (
  <TouchableOpacity
    onPress={async () => {
  setBildirimPanelAcik(!bildirimPanelAcik);
  try {
    await axiosClient.put('/bildirim/okundu');
    setBildirimler(prev =>
      prev.map(b => ({ ...b, okunduMu: true }))
    );
  } catch (err) {
    handleApiError(err, 'Bildirim okundu işaretlenemedi');
  }
}}
    style={styles.notificationButton}
  >
    <Ionicons name="notifications-outline" style={styles.bell} />
    {bildirimler.some(b => !b.okunduMu) && (
      <View style={styles.notificationBadge}>
        <Text style={styles.notificationCount}>
          {bildirimler.filter(b => !b.okunduMu).length}
        </Text>
      </View>
    )}
  </TouchableOpacity>
)}

{isLoggedIn && (
  <View style={{ position: 'relative' }}>
    <TouchableOpacity onPress={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
      <View style={styles.avatar}>
        {profilePhoto ? (
          <Image
            source={{ uri: profilePhoto }}
            style={{ width: 32, height: 32, borderRadius: 16 }}
            resizeMode="cover"
          />
        ) : (
<Text style={styles.avatarText}>
  {isLoggedIn && username ? username[0].toUpperCase() : ''}
</Text>
        )}
      </View>
    </TouchableOpacity>

    {isProfileDropdownOpen && (
      <View style={styles.dropdownMenu}>
        <TouchableOpacity onPress={() => {
          setIsProfileDropdownOpen(false);
          router.push('/profil');
        }}>
          <Text style={styles.dropdownItem}>Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={async () => {
          await deleteItems(['accessToken', 'refreshToken']);
          await AsyncStorage.multiRemove(['user', 'image']);
          setProfilePhoto(null);
          setCachedToken(null);
          setIsProfileDropdownOpen(false);
          auth.setIsLoggedIn(false); 
          auth.setUsername(null);
          router.push('/login');
        }}>
          <Text style={styles.dropdownItem}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
)}

{!isLoggedIn && (
  <View>
    <TouchableOpacity onPress={() => setIsAuthOpen(!isAuthOpen)}>
      <Text style={styles.loginText}>Giriş Yap</Text>
    </TouchableOpacity>

    {isAuthOpen && (
      <View style={styles.dropdownMenu}>
<TouchableOpacity onPress={() => {
  setIsAuthOpen(false); // 🔥 sekmeyi kapat
  router.push('/login');
}}>
  <Text style={styles.dropdownItem}>Giriş Yap</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => {
  setIsAuthOpen(false); // 🔥 sekmeyi kapat
  router.push('/register');
}}>
  <Text style={styles.dropdownItem}>Üye Ol</Text>
</TouchableOpacity>
      </View>
    )}
  </View>
)}

</View>

      {/* Dropdown Arama Sonuçları */}
      {showDropdown && searchQuery.length >= 2 && (
        <View style={styles.dropdown}>
          {isSearching ? (
            <ActivityIndicator size="small" color="#888" />
          ) : searchResults.length > 0 ? (
            <FlatList
            scrollEnabled={true}
              data={searchResults}
              keyExtractor={(item) => item._id || item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItemContainer}
                  onPress={() => {
                  router.push({
                    pathname: "/etkinlik/[id]",
                    params: { id: item._id || item.id },
                  });
                    setShowDropdown(false);
                  }}
                >
                  <FastImage
                    uri={item.gorsel && item.gorsel !== 'null'
                     ? `https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net${item.gorsel}`
                      : 'https://via.placeholder.com/100'}
                    cacheKey={item._id || item.id || `search-${item.baslik}`}
                    style={styles.eventImage}
                  />
                  <View style={styles.eventTextContainer}>
                    <Text style={styles.eventTitle}>{item.baslik}</Text>
                    <Text style={styles.eventSubtitle}>{item.sehir} – {item.tarih}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <Text style={styles.dropdownItem}>Sonuç bulunamadı.</Text>
          )}
        </View>
      )}

      {/* 👤 Giriş / Üye Ol ya da Profil + Çıkış */}
      {isLoggedIn ? (
        <View style={styles.loggedInArea}>

          {role === 'admin' && (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => router.push('/admin-panel')}
              >
                <Text style={styles.dropdownTriggerText}>Admin Paneli</Text>
              </TouchableOpacity>
            </View>
          )}



        </View>
      ) : (
        <View />
      )}
{bildirimPanelAcik && (
  <View style={[styles.notificationPanel, { marginTop: 12 }]}>

    <Text style={styles.panelTitle}>Bildirimler</Text>
    {bildirimler.length === 0 ? (
      <Text style={styles.panelEmpty}>Henüz bildirimin yok.</Text>
    ) : (
<View style={{ maxHeight: 220 }}>
  <FlatList
    data={bildirimler.slice(0, 12)} 
    keyExtractor={(item, index) => index.toString()}
    showsVerticalScrollIndicator={true}
    style={{ maxHeight: 220 }}
    contentContainerStyle={{ paddingBottom: 20 }}
    renderItem={({ item, index }) => {
        const etkinlik = item.etkinlikId || item.etkinlik || {};
         const gorsel = etkinlik.gorsel;
      return (
        <TouchableOpacity onPress={() => handleBildirimTikla(item)}>
          <View style={styles.panelItemContainer}>
          <FastImage
            uri={
              gorsel
                ? `https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net${gorsel}`
                : 'https://via.placeholder.com/100'
            }
            style={styles.panelImage}
            cacheKey={`bildirim-${etkinlik._id || etkinlik.id || index}`}
          />
            
            <View style={{ flex: 1 }}>
              <Text style={styles.panelEventTitle}>
                {(item.etkinlik?.baslik || item.etkinlikId?.baslik) || "Etkinlik"}
              </Text>
              <Text style={styles.panelEventText}>
                {(item.tip === 'yanit' || item.tip === 'begeni') && (item.etkinlik?.baslik || item.etkinlikId?.baslik)
                  ? `Etkinliğinde yaptığın yoruma bir yanıt geldi.`
                  : item.mesaj}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }}
  />
</View>

    )}
  </View>
)}
</View>
    
  );
};
  const styles = StyleSheet.create({
header: {
  paddingHorizontal: 12,
  backgroundColor: '#fff',
  zIndex: 10,
  position: 'relative',
},

    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logo: {
      width: 50,
      height: 50,
      resizeMode: 'contain',
    },
    tagline: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: 'bold',
    },
    searchInput: {
      flex: 1,
      marginHorizontal: 8,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      paddingLeft: 12,
      paddingVertical: 8,
    },
    dropdown: {
      marginTop: 4,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 6,
      maxHeight: 250,
    },
    dropdownItemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderBottomWidth: 1,
      borderColor: '#eee',
    },
    eventImage: {
      width: 50,
      height: 50,
      borderRadius: 6,
      marginRight: 10,
    },
    eventTextContainer: {
      flex: 1,
    },
    eventTitle: {
      fontWeight: '600',
    },
    eventSubtitle: {
      color: '#888',
      fontSize: 12,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: 'white',
      padding: 20,
      borderRadius: 10,
      width: '85%',
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 18,
      marginBottom: 10,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    cityItem: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderColor: '#eee',
    },
    cityItemSelected: {
      backgroundColor: '#eee',
    },
    cityItemText: {
      fontSize: 16,
    },
    modalButton: {
      backgroundColor: '#6c5ce7',
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 12,
    },
    modalButtonText: {
      color: '#fff',
      textAlign: 'center',
      fontWeight: 'bold',
    },
    modalClose: {
      marginTop: 8,
      paddingVertical: 10,
    },
    modalCloseText: {
      textAlign: 'center',
      color: '#888',
    },
      notificationButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f1f1',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      },
    bell: {
      fontSize: 20,
    },
    notificationBadge: {
      position: 'absolute',
      top: -5,
      right: -5,
      backgroundColor: 'red',
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    notificationCount: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    notificationPanel: {
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 10,
      padding: 10,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    panelTitle: {
      fontWeight: 'bold',
      marginBottom: 8,
    },
    panelItem: {
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderColor: '#eee',
    },
    panelEmpty: {
      color: '#888',
      fontStyle: 'italic',
    },
    dropdownContainer: {
      marginTop: 12,
    },
    dropdownTrigger: {
      paddingVertical: 10,
      backgroundColor: '#f1f1f1',
      borderRadius: 6,
    },
    dropdownTriggerText: {
      textAlign: 'center',
      fontWeight: '600',
      color: '#333',
    },
dropdownMenu: {
  position: 'absolute',
  top: 45,
  right: 0,
  zIndex: 100,
  backgroundColor: '#fff',
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#ccc',
  paddingVertical: 4,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 5,
  width: 150,          // 🔥 EKLENDİ
  minWidth: 120,       // 🔥 EKLENDİ (güvence)
},
    dropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderColor: '#eee',
      fontSize: 14,
      color: '#444',
    },
    loggedInArea: {
      flexDirection: 'column',
      gap: 8,
    },
    welcome: {
      fontSize: 16,
      fontWeight: '500',
    },
    username: {
      fontSize: 16,
      color: '#0984e3',
      fontWeight: '600',
    },
    logoutButton: {
      marginTop: 12,
      backgroundColor: '#d63031',
      paddingVertical: 10,
      borderRadius: 6,
    },
    logoutText: {
      color: '#fff',
      textAlign: 'center',
      fontWeight: 'bold',
    },
    topBar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},

avatar: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#6c5ce7',
  alignItems: 'center',
  justifyContent: 'center',
},

avatarText: {
  color: '#fff',
  fontWeight: 'bold',
},

loginText: {
  color: '#6c5ce7',
  fontWeight: 'bold',
},
bildirimDisiKapan: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 5,
},
panelItemContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderColor: '#eee',
  gap: 10,
},
panelImage: {
  width: 50,
  height: 50,
  borderRadius: 6,
},
panelEventTitle: {
  fontWeight: 'bold',
  fontSize: 14,
  marginBottom: 2,
},
panelEventText: {
  fontSize: 13,
  color: '#444',
}

  });
  export default Header;
  