import { View, TouchableOpacity, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

const BottomTabBar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: 'Ana Sayfa', icon: 'home-outline', path: '/' },
    { name: 'Şehrimde', icon: 'location-outline', path: '/sehrimde' },
    { name: 'Favorilerim', icon: 'heart-outline', path: '/favorilerim' },
    { name: 'Etkinlik Ekle', icon: 'add-circle-outline', path: '/etkinlik-ekle' },
  ];

  return (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingVertical: Platform.OS === 'ios' ? 24 : 16,
          paddingBottom: Platform.OS === 'ios' ? 12 : 8,
          paddingHorizontal: 12,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 6,
        }}>
      {tabs.map((tab, index) => (
        <TouchableOpacity key={index} onPress={() => router.push(tab.path)} style={{ alignItems: 'center' }}>
        <Ionicons
          name={tab.icon}
          size={pathname === tab.path ? 26 : 24}
          color={pathname === tab.path ? '#6c5ce7' : 'gray'}
          style={{ marginBottom: 2 }}
        />
        <Text style={{
          fontSize: 11,
          fontWeight: pathname === tab.path ? '600' : '400',

          color: pathname === tab.path ? '#6c5ce7' : 'gray'
        }}>
          {tab.name}
        </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default BottomTabBar;
