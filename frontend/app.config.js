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
    eas: {
      projectId: "7c80246c-10b0-4600-a19e-9f20e59e96ab"
    }
  },
  runtimeVersion: {
    policy: "appVersion"
  },
  plugins: [
    "expo-router",
    "expo-splash-screen"
  ],
  experiments: {
    typedRoutes: true
  }
};
