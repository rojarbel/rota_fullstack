import { Slot, useRouter } from 'expo-router';
import { View, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Header from '../src/components/Header';
import Menu from '../src/components/Menu';
import BottomTabBar from '../src/components/BottomTabBar';
import { AuthProvider } from '../src/context/AuthContext';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import useAuth from '../src/hooks/useAuth';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

function AppLayoutInner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const auth = useAuth();

useEffect(() => {
  const handleDeepLink = ({ url }) => {
    const { path, queryParams } = Linking.parse(url);
    // Debug:
    // console.log('Deep link geldi:', { path, queryParams });

    // Şifre sıfırlama deep linki ise:
    if (path) {
      // Diğer linkler eski gibi çalışsın
      router.push('/' + path);
    }
  };

  const sub = Linking.addEventListener('url', handleDeepLink);

  // App ilk açılışta deep link ile açılmış mı kontrolü
  Linking.getInitialURL().then(url => {
    if (url) handleDeepLink({ url });
  });

  return () => sub.remove();
}, [router]);

useEffect(() => {
  mobileAds()
    .setRequestConfiguration({
      // Emülatör ve fiziksel cihaz test ID’leri
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    })
    .then(() => mobileAds().initialize());
}, []);
  
  const handleSwipeBack = (event) => {
    // Gesture tamamlandığında kontrol et
    if (event.nativeEvent.state === State.END && Platform.OS === 'ios') {
      const { translationX, velocityX } = event.nativeEvent;
      
      // Sağa kaydırma hareketi ve yeterli hız varsa geri git
      if (translationX > 100 && velocityX > 0) {
        if (router.canGoBack()) {
          router.back();
        }
      }
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <Header key={auth.isLoggedIn ? 'user' : 'guest'} />

        <Menu />
        <PanGestureHandler
          onHandlerStateChange={handleSwipeBack}
          activeOffsetX={[-10, 10]} // Düzeltme: [negatif, pozitif]
          failOffsetY={[-5, 5]} // Dikey hareketi engelle
        >
          <View style={{ flex: 1 }}>
            <Slot />
          </View>
        </PanGestureHandler>
        <View style={{ paddingBottom: insets.bottom }}>
          <BottomTabBar />
        </View>
      </View>
    </GestureHandlerRootView>
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