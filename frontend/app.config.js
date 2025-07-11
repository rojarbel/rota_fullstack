import 'dotenv/config';

export default {
  name: "UrbanRota",
  slug: "urbanrota",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.rojar.urbanrota",
    associatedDomains: ["applinks:rota.app"],
    supportsTablet: true,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS
    }
  },
  android: {
    package: "com.rojar.urbanrota",
    permissions: [],
    newArchEnabled: false,
    intentFilters: [
      {
        action: "VIEW",
        data: { scheme: "https", host: "rota.app", pathPrefix: "/etkinlik" },
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID
        }
      }
        },
  extra: {
    apiUrl: process.env.API_URL,
    imageCdnUrl: process.env.IMAGE_CDN_URL,
    googleMapsApiKey:
      process.env.GOOGLE_MAPS_API_KEY_ANDROID ||
      process.env.GOOGLE_MAPS_API_KEY_IOS,
    eas: {
      projectId: "92308120-fad1-43c5-875a-ca78967dbf13"
    }
  },

  plugins: [
    "expo-router",
    "expo-splash-screen",
    "./plugins/withGoogleMapsString"
  ],
  experiments: {
    typedRoutes: true
  },
    scheme: "urbanrota",
};
