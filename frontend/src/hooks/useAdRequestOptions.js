import { useEffect, useState } from 'react';
import { AdsConsent } from 'react-native-google-mobile-ads';

export default function useAdRequestOptions() {
  const [requestOptions, setRequestOptions] = useState({
    requestNonPersonalizedAdsOnly: false, // güvenli varsayılan
  });

  useEffect(() => {
    let cancelled = false;

    AdsConsent.getUserChoices()
      .then(({ selectPersonalisedAds }) => {
        if (!cancelled) {
          setRequestOptions({ requestNonPersonalizedAdsOnly: !selectPersonalisedAds });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRequestOptions({ requestNonPersonalizedAdsOnly: false });
        }
      });

    return () => { cancelled = true; };
  }, []);

  return requestOptions;
}
