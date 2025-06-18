import 'dotenv/config';

export default {
  expo: {
    name: 'rota_mobil',
    slug: 'rota_mobil',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'rotamobil',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.roj.routemobile',
      buildNumber: '1.0.0'
    },
    android: {
      package: 'com.roj.routemobile',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      }
      },
extra: {
  apiUrl: process.env.API_URL,
  eas: {
    projectId: "7c8d246c-100b-4e00-a19e-0f2be95e9e6b"
  }
},
    runtimeVersion: {
      policy: 'appVersion'
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
      ]
    ],
    experiments: {
      typedRoutes: true
    }
  }
};
