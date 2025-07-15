import { Linking } from 'react-native';
import { router } from 'expo-router';

export const initializeDeepLinking = () => {
  // Uygulama kapalıyken gelen link'i yakala
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url);
    }
  });

  // Uygulama açıkken gelen link'i yakala
  const handleUrl = (event) => {
    handleDeepLink(event.url);
  };

  Linking.addEventListener('url', handleUrl);

  return () => {
    Linking.removeEventListener('url', handleUrl);
  };
};

const handleDeepLink = (url) => {

};