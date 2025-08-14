import { Slot, ExpoRouterProvider } from 'expo-router';
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import mobileAds, {
  MaxAdContentRating,
  AdsConsent,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import linking from './linking';

export default function App() {
  useEffect(() => {
    async function init() {
            const { isInternetReachable } = await NetInfo.fetch();
      console.log(isInternetReachable);
      try {
        await AdsConsent.requestInfoUpdate();
        await AdsConsent.loadAndShowConsentFormIfRequired();
      } catch (e) {
        // Still attempt to request ads if gathering consent fails
        console.error('Consent flow failed', e);
      }

      const { status, canRequestAds } = await AdsConsent.getConsentInfo();
      const requestConfiguration = {
        maxAdContentRating: MaxAdContentRating.T,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: status !== AdsConsentStatus.OBTAINED,
      };

      await mobileAds().setRequestConfiguration(requestConfiguration);

      if (canRequestAds) {
        await mobileAds().initialize();
      }
    }

    init();
  }, []);

  return (
    <ExpoRouterProvider linking={linking}>
      <Slot />
    </ExpoRouterProvider>
  );
}
