import Constants from 'expo-constants';

export const IMAGE_BASE_URL =
  Constants.expoConfig?.extra?.imageCdnUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  '';