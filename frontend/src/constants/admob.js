import { Platform } from 'react-native';

export const BANNER_ID =
  Platform.OS === 'android'
    ? 'ca-app-pub-1780309959690745/3835867215' // Android banner ID
    : 'ca-app-pub-1780309959690745/6286770732'
