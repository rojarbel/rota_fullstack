import * as Linking from 'expo-linking';

export default {
  prefixes: [
    'urbanrota://',          // Custom scheme
    'https://rotalinks.github.io/link/' // GitHub Pages link
  ],
  config: {
    screens: {
      // Eğer dosyanız etkinlik/[id].js konumundaysa:
      'etkinlik/[id]': 'etkinlik/:id',
      
      // Eğer dosyanız sadece [id].js ise (root seviyede):
      '[id]': ':id',
      
      // Veya tam yol belirtmek isterseniz:
      '(tabs)/etkinlik/[id]': 'etkinlik/:id'
    }
  }
};