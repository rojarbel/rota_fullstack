
import { getItem as getSecureItem } from '../utils/storage';
import logger from '../utils/logger';

export const isAuthenticated = async () => {
  try {
  const token = await getSecureItem("accessToken");
  return !!token;
  } catch (err) {
        logger.error('Auth kontrol hatası:', err);
    return false;
  }
};