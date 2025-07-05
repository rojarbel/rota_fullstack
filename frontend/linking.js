    import * as Linking from 'expo-linking';

export default {
  prefixes: ['rotamobil://', 'https://rota.app'],
  config: {
    screens: { 'etkinlik/[id]': 'etkinlik/:id' }
  }
};