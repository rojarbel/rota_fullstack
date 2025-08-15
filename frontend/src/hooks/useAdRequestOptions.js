import { useEffect, useState } from 'react';
import { AdsConsent } from 'react-native-google-mobile-ads';

/**
 * Returns ad request options based on the user's consent preferences.
 * Defaults to requesting personalised ads unless the user opts out.
 */
export default function useAdRequestOptions() {
  const [requestOptions, setRequestOptions] = useState();

  useEffect(() => {
    AdsConsent.getUserChoices()
      .then(({ selectPersonalisedAds }) => {
        setRequestOptions({ requestNonPersonalizedAdsOnly: !selectPersonalisedAds });
      })
      .catch(() => {
        setRequestOptions({ requestNonPersonalizedAdsOnly: false });
      });
  }, []);

  return requestOptions;
}