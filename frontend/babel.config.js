module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel', // 🚨 En başta olmalı
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@api': './src/api',
            '@context': './src/context',
          },
        },
      ],
      'react-native-reanimated/plugin' // 🚨 En sonda olmalı
    ],
  };
};
