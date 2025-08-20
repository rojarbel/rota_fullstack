import { Slot, ExpoRouterProvider } from 'expo-router';
import { useEffect } from 'react';
import mobileAds, {
  MaxAdContentRating,
  AdsConsent,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import NetInfo from '@react-native-community/netinfo';
import linking from './linking';


export default function App() {
  useEffect(() => {
    async function init() {
      try {
        await AdsConsent.requestInfoUpdate();
        await AdsConsent.loadAndShowConsentFormIfRequired();
      } catch (e) {
        // Still attempt to request ads if gathering consent fails
        console.error('Consent flow failed', e);
      }

      const { status, canRequestAds } = await AdsConsent.getConsentInfo();
          global.canShowAds = canRequestAds;
const requestConfiguration = {
  maxAdContentRating: MaxAdContentRating.G,
  tagForChildDirectedTreatment: false,
  tagForUnderAgeOfConsent: false,

};

      await mobileAds().setRequestConfiguration(requestConfiguration);

      const netState = await NetInfo.fetch();
      console.log('NetInfo isInternetReachable', netState.isInternetReachable);
// Test/teşhis: consent ne olursa olsun SDK’yı başlat
await mobileAds().initialize();
console.log('AdMob initialized (forced init for testing)');
    }

    init();
  }, []);

  return (
    <ExpoRouterProvider linking={linking}>
      <Slot />
    </ExpoRouterProvider>
  );
}