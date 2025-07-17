import * as Linking from 'expo-linking';
import { router } from 'expo-router';

export const initializeDeepLinking = () => {
  const handleDeepLink = ({ url }) => {
    const { path } = Linking.parse(url);
    if (path) {
      router.push('/' + path);
    }
  };

  const sub = Linking.addEventListener('url', handleDeepLink);

  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink({ url });
  });

  return () => sub.remove();
};