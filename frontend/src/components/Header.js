import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteItems } from '../utils/storage';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
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
import { IMAGE_BASE_URL } from '../constants';
import useAuth from '../hooks/useAuth';
import { Platform, StatusBar } from 'react-native';
import { setCachedToken } from '../api/axiosClient';
import FastImage from 'expo-fast-image';
import handleApiError from '../utils/handleApiError';
import { Ionicons } from '@expo/vector-icons';
import { TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';



const Header = ({ onHamburgerClick, onSearchChange }) => {
  const auth = useAuth();
  const { isLoggedIn, username, role } = auth || {};
  const [profilePhoto, setProfilePhoto] = useState(auth.image || null);

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
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [bildirimler, setBildirimler] = useState([]);
  const [bildirimPanelAcik, setBildirimPanelAcik] = useState(false);

    const toggleProfileDropdown = useCallback(() => {
    setIsProfileDropdownOpen(prev => !prev);
  }, []);
  useEffect(() => {
    const images = searchResults
      .map(item => {
        if (item.gorsel && item.gorsel !== 'null') {
          return {
            uri: `${IMAGE_BASE_URL}${item.gorsel}`,
            cacheKey: item._id || item.id || `search-${item.baslik}`,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (images.length > 0) {
      try {
        FastImage.preload(images);
      } catch (e) {
        console.warn('preload search results failed', e);
      }
    }
  }, [searchResults]);
  const closeProfileDropdown = useCallback(() => setIsProfileDropdownOpen(false), []);

  const toggleAuthMenu = useCallback(() => {
    setIsAuthOpen(prev => !prev);
  }, []);

  const closeAuthMenu = useCallback(() => setIsAuthOpen(false), []);

  const handleLogout = useCallback(async () => {
    await deleteItems(['accessToken', 'refreshToken']);
    await AsyncStorage.multiRemove(['user', 'image']);
    auth.setIsLoggedIn(false);
    auth.setUsername(null);
    auth.setImage(null);
    setProfilePhoto(null);
    setCachedToken(null);
    closeProfileDropdown();
    router.replace('/login');
  }, [auth, closeProfileDropdown, router]);

  const handleNotificationPress = useCallback(async () => {
    setBildirimPanelAcik(prev => !prev);
    try {
      await axiosClient.put('/bildirim/okundu');
      setBildirimler(prev => prev.map(b => ({ ...b, okunduMu: true })));
    } catch (err) {
      handleApiError(err, 'Bildirim okundu işaretlenemedi');
    }
  }, [bildirimPanelAcik]);
  // 🔍 Etkinlik arama fonksiyonu
  const fetchSearchResults = useCallback(async (query) => {
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
  }, []);

  // 🌆 Şehir seçimi sonrası yönlendirme
 const handleShowEvents = useCallback(() => {
    if (!selectedCity) {
      Alert.alert('Lütfen bir şehir seçin!');
      return;
    }
    router.push({ pathname: '/arama-sonuclari', params: { sehir: selectedCity } });
    setIsModalVisible(false);
  }, [selectedCity]);

  // 🔑 Giriş yapılmadan yönlendirme engeli
  const handleProtectedClick = useCallback((path) => {
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      router.push(`/${path}`);
    }
  }, [isLoggedIn]);

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
  const refreshProfilePhoto = async () => {
    try {
      // AsyncStorage'dan direkt oku
      const storedImage = await AsyncStorage.getItem('image');
      
      // Önce auth.image'i kontrol et, yoksa AsyncStorage'dan al
      const finalImage = auth.image || storedImage || null;
      
      setProfilePhoto(finalImage);
      
      // Eğer auth.image ile AsyncStorage farklıysa, auth'u güncelle
      if (storedImage && storedImage !== auth.image && auth.setImage) {
        auth.setImage(storedImage);
      }
    } catch (error) {
      console.error('Profil fotoğrafı yüklenemedi:', error);
      setProfilePhoto(null);
    }
  };

  refreshProfilePhoto();
}, [auth.image, auth.isLoggedIn]);

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
useEffect(() => {
  const images = bildirimler
    .map((b, idx) => {
      const etkinlik = b.etkinlikId || b.etkinlik || {};
      const gorsel = etkinlik.gorsel;
      if (gorsel) {
        return {
          uri: `${IMAGE_BASE_URL}${gorsel}`,
          cacheKey: `bildirim-${etkinlik._id || etkinlik.id || idx}`,
        };
      }
      return null;
    })
    .filter(Boolean);

  if (images.length > 0) {
    try {
      FastImage.preload(images);
    } catch (e) {
      console.warn('preload notifications failed', e);
    }
  }
}, [bildirimler]);

useFocusEffect(
  React.useCallback(() => {
    const refreshOnFocus = async () => {
      const storedImage = await AsyncStorage.getItem('image');
      if (storedImage) {
        setProfilePhoto(storedImage);
      }
    };
    
    refreshOnFocus();
  }, [])
);

const handleBildirimTikla = useCallback(async (bildirim) => {
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
}, [router]);

  return (
    <View>
    {bildirimPanelAcik && (
    <TouchableWithoutFeedback>
      <View style={[styles.bildirimDisiKapan, { zIndex: 50 }]} pointerEvents="none" />
    </TouchableWithoutFeedback>
    )}

    <View style={styles.topBar}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
      </View>

  <TextInput
    style={styles.searchInput}
    placeholder="Etkinlik Ara"
    placeholderTextColor="#999"
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
    onPress={handleNotificationPress}
    style={styles.notificationButton}
  >
<View style={styles.notificationIconWrapper}>
  <Ionicons name="notifications-outline" style={styles.bell} />
  {bildirimler.some(b => !b.okunduMu) && (
    <View style={styles.notificationBadge}>
      <Text style={styles.notificationCount}>
        {bildirimler.filter(b => !b.okunduMu).length}
      </Text>
    </View>
  )}
</View>
  </TouchableOpacity>
)}

{isLoggedIn && (
  <View style={styles.relative}>
      <TouchableOpacity
        onPress={toggleProfileDropdown}
        activeOpacity={0.8}
      >
      <View style={styles.avatar}>
        {profilePhoto ? (
          <Image
            source={{ uri: profilePhoto }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              borderWidth: 2,
              borderColor: '#6c5ce7',
            }}
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
          closeProfileDropdown();
          router.push('/profil');
        }}>
          <Text style={styles.dropdownItem}>Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout}>
        <View style={styles.dropdownRow}>

          <Text style={styles.dropdownText}>Çıkış Yap</Text>
        </View>
      </TouchableOpacity>
      </View>
    )}
  </View>
)}

{!isLoggedIn && (
  <View>
    <TouchableOpacity onPress={toggleAuthMenu}>

      <Text style={styles.loginText}>Giriş Yap</Text>
    </TouchableOpacity>

    {isAuthOpen && (
      <View style={styles.dropdownMenu}>
<TouchableOpacity onPress={() => {
  closeAuthMenu();
  router.push('/login');
}}>
  <Text style={styles.dropdownItem}>Giriş Yap</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => {
  closeAuthMenu();
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
                     ? `${IMAGE_BASE_URL}${item.gorsel}`
                      : 'https://via.placeholder.com/100'}
                    cacheKey={item._id || item.id || `search-${item.baslik}`}
                    priority="high"
                    resizeMode="cover"
                    style={styles.eventImage}
                  />
                  <View style={styles.eventTextContainer}>
                    <Text style={styles.eventTitle}>{item.baslik}</Text>
                <Text style={styles.eventSubtitle}>
                  {item.sehir} – {new Date(item.tarih).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
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
<View style={styles.maxHeight220}>
  <FlatList
    data={bildirimler.slice(0, 12)} 
    keyExtractor={(item, index) => index.toString()}
    showsVerticalScrollIndicator={true}
    style={styles.maxHeight220}
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
                ? `${IMAGE_BASE_URL}${gorsel}`
                : 'https://via.placeholder.com/100'
            }
            style={styles.panelImage}
            cacheKey={`bildirim-${etkinlik._id || etkinlik.id || index}`}
            priority="high"
resizeMode="cover"
          />
            
            <View style={styles.flex1}>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
    zIndex: 10,
    position: 'relative',
  },

    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logo: {
      width: 80,
      height: 40,
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
      borderColor: '#E0E0E0',
      borderRadius: 12,
      paddingLeft: 16,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      backgroundColor: '#FAFAFA',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
      fontSize: 15,
    },
    dropdown: {
      marginTop: 4,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 6,
      maxHeight: 250,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      paddingBottom: 8,
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
      borderWidth: 0.5,
      borderColor: '#ddd',
      shadowColor: '#000',
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 3,
    },
    eventTextContainer: {
      flex: 1,
    },
    eventTitle: {
      fontWeight: '600',
    },
    eventSubtitle: {
      color: '#888',
      fontSize: 13,
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
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 4,
        position: 'relative',

    },
    bell: {
      fontSize: 20,
    },
    notificationBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: '#ff3b30',
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      justifyContent: 'center',
      alignItems: 'center',
      transform: [{ translateX: 6 }, { translateY: -6 }],
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
  zIndex: Platform.OS === 'android' ? 50 : 1000,
  backgroundColor: '#fff',
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#ccc',
  paddingVertical: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 6,
  width: 150,          // 🔥 EKLENDİ
  minWidth: 120,       // 🔥 EKLENDİ (güvence)
  
},
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      textAlign: 'left',
      color: '#333',
      fontSize: 15,
      fontWeight: '500',
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
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 12,
      backgroundColor: '#fff',
    },

    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#6c5ce7',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 3,
    },

avatarText: {
  color: '#fff',
  fontWeight: 'bold',
},

loginText: {
  color: '#6c5ce7',
  fontWeight: 'bold',
  fontSize: 15,
  padding: 4,
  borderRadius: 6,
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
},
notificationIconWrapper: {
  position: 'relative',
  width: 24,
  height: 24,
  justifyContent: 'center',
  alignItems: 'center',
},
relative: {
  position: 'relative',
},
dropdownRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 12,
},
dropdownText: {
  color: '#333',
  fontSize: 15,
  fontWeight: '500',
},
maxHeight220: {
  maxHeight: 220,
},
flex1: {
  flex: 1,
},

  });
  export default Header;
  