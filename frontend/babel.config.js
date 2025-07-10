module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
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
            'expo-router/babel',
      'react-native-reanimated/plugin',
    ],
  };
};
