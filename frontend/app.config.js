// dotenv'i güvenli şekilde import et
let dotenv;
try {
  dotenv = require('dotenv');
  dotenv.config();
} catch (error) {
  console.warn('dotenv not found, using environment variables');
}

export default {
  name: 'Rota',
  slug: 'urbanrota',
  version: '1.0.8',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  updates: {
    fallbackToCacheTimeout: 0
    // url: "https://u.expo.dev/92308120-fad1-43c5-875a-ca78967dbf13" // ⛔ eski projectId — SİLİNDİ
  },
  runtimeVersion: {
    policy: "appVersion"
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.rojar.rota',
    buildNumber: '8',
    supportsTablet: true,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS || 'YOUR_IOS_API_KEY',
    },
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Required to upload profile pictures and event images.",
      NSCameraUsageDescription: "The app does not use the camera.",
      NSLocationWhenInUseUsageDescription: "Used to show nearby events. Location data is not stored.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "This app does not track location in the background. Location access is used only while the app is open to show nearby events. The data is not stored or shared.",
    },
  },
android: {
  package: 'com.rojar.rota',
  permissions: ['ACCESS_FINE_LOCATION', 'READ_MEDIA_IMAGES', 'ACCESS_COARSE_LOCATION'],
  adaptiveIcon: {
    foregroundImage: './assets/images/adaptive-icon.png',
    backgroundColor: '#ffffff',
  },
  edgeToEdgeEnabled: true,
  compileSdkVersion: 35,
  targetSdkVersion: 35,
  intentFilters: [
    {
      action: 'VIEW',
      data: {
        scheme: 'urbanrota',
        host: 'etkinlik'
      },
      category: ['BROWSABLE', 'DEFAULT'],
    },
  ],
  config: {
    googleMaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID || 'YOUR_ANDROID_API_KEY',
    },
  },
},

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
extra: {
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
  googleMapsApiKeyAndroid: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
  googleMapsApiKeyIos: process.env.GOOGLE_MAPS_API_KEY_IOS,
  apiUrl: process.env.API_URL,
  imageCdnUrl: process.env.IMAGE_CDN_URL,
  eas: {
    projectId: '81fe7a04-a148-44d3-9753-bda2ea2752e6',
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff'
      }
    ],
    [
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: false,
          enableShrinkResourcesInReleaseBuilds: false,
          compileSdkVersion: 35,
          targetSdkVersion: 35
        }
      }
    ],
['react-native-google-mobile-ads', {
  androidAppId: 'ca-app-pub-1780309959690745~9976973421',
  iosAppId:     'ca-app-pub-1780309959690745~3609223231'
}],

    './plugins/withGoogleMapsString',
  ],
  experiments: {
    typedRoutes: true,
  },
  scheme: 'urbanrota',
};
