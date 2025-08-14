import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

export const BANNER_ID = __DEV__
  ? TestIds.BANNER
  : Platform.OS === 'ios'
    ? 'ca-app-pub-1780309959690745/8953851581'
    : 'ca-app-pub-1780309959690745/8289939937';