import { Slot, ExpoRouterProvider } from 'expo-router';
import { useEffect } from 'react';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import linking from './linking';

export default function App() {
  useEffect(() => {
    mobileAds()
      .setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.T,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      })
      .then(() => mobileAds().initialize());
  }, []);

  return (
    <ExpoRouterProvider linking={linking}>
      <Slot />
    </ExpoRouterProvider>
  );
}
