import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const PRIMARY = '#7B2CBF';

const Menu = ({ isMobile }) => {
  const router = useRouter();
  const currentPath = usePathname();

  const categories = [
        { path: '/konser', label: 'Konser' },
           { path: '/tiyatro', label: 'Tiyatro' },
    { path: '/atolye', label: 'Atölye' },
    { path: '/sergi', label: 'Sergi' },
    { path: '/dans', label: 'Dans' },
    { path: '/spor', label: 'Spor' },
        { path: '/sinema', label: 'Sinema' },
        { path: '/konferans', label: 'Konferans' },
        { path: '/aktivizm', label: 'Aktivizm' }

  ];

  return (
    <View style={[styles.tabBar, isMobile && styles.mobileBar]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6 }}>
        {categories.map((cat) => {
          const isActive = currentPath === cat.path;
          return (
            <TouchableOpacity
              key={cat.path}
              onPress={() => router.push(cat.path)}
              style={[styles.tabItem, isActive && styles.activeTabItem]}
            >
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
tabBar: {
  flexDirection: 'row',
  backgroundColor: '#fff',
  paddingVertical: 8,
  paddingHorizontal: 8,
  borderRadius: 10,
    },
  mobileBar: {
    backgroundColor: '#f9f9f9',
  },
  tabItem: {
    marginHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTabItem: {
    borderColor: PRIMARY,
    backgroundColor: '#F4EDFA', // Açık mor tonu
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  tabLabel: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    paddingBottom: 2,
  },
  activeTabLabel: {
    color: PRIMARY,
  },
});

export default Menu;