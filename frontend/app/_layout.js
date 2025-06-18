import { Slot } from 'expo-router';
import { View, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../src/components/Header';
import Menu from '../src/components/Menu';
import BottomTabBar from '../src/components/BottomTabBar';
import { AuthProvider } from '../src/context/AuthContext';

function AppLayoutInner() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Header />
      <Menu />
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <View style={{ paddingBottom: insets.bottom }}>
        <BottomTabBar />
      </View>
    </View>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <AppLayoutInner />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
