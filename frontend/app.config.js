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
  version: '1.0.0',
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
    associatedDomains: ['applinks:rota.app'],
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
    permissions: ['ACCESS_FINE_LOCATION', "READ_MEDIA_IMAGES", 'ACCESS_COARSE_LOCATION'],
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    edgeToEdgeEnabled: true,
    compileSdkVersion: 35,
    targetSdkVersion: 35,
    intentFilters: [
      {
        action: 'VIEW',
        data: {
          scheme: 'https',
          host: 'rota.app',
          pathPrefix: '/etkinlik',
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
    apiUrl: process.env.API_URL || 'https://your-api-url.com',
    imageCdnUrl: process.env.IMAGE_CDN_URL || 'https://your-cdn-url.com',
    googleMapsApiKeyAndroid: process.env.GOOGLE_MAPS_API_KEY_ANDROID || 'YOUR_ANDROID_API_KEY',
    googleMapsApiKeyIos: process.env.GOOGLE_MAPS_API_KEY_IOS || 'YOUR_IOS_API_KEY',
    eas: {
      projectId: "81fe7a04-a148-44d3-9753-bda2ea2752e6"
    }
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
    // './plugins/withGoogleMapsString',
  ],
  experiments: {
    typedRoutes: true,
  },
  scheme: 'urbanrota',
};
