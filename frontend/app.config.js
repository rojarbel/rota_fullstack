import 'dotenv/config';

export default {
  name: "rota-mobil",
  slug: "rota-mobil",
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
    supportsTablet: true,
    bundleIdentifier: "com.roj.rotamobile",
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    }
  },
  android: {
    package: "com.roj.rotamobile",
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    }
  },
extra: {
  apiUrl: process.env.API_URL,
  imageCdnUrl: process.env.IMAGE_CDN_URL,
  eas: {
    projectId: "3c87c4d6-e8cc-44eb-bd5e-b2fed77ac837"
  }
},
  plugins: [
    "expo-router",
    "expo-splash-screen"
  ],
  experiments: {
    typedRoutes: true
  },
};
