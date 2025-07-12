import Constants from 'expo-constants';

export const IMAGE_BASE_URL =
  Constants.expoConfig?.extra?.imageCdnUrl ||
  Constants.manifest?.extra?.imageCdnUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  '';