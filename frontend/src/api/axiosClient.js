import axios from 'axios';
import { getItem as getSecureItem, setItem as setSecureItem } from '../utils/storage';
import logger from '../utils/logger';
import Constants from 'expo-constants';

let cachedToken = null;

const API_BASE_URL = `${Constants.expoConfig.extra.apiUrl}/api`;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

// Access token ekle - tokenu bellekte tut
axiosClient.interceptors.request.use(async (config) => {
  if (!cachedToken) {
    cachedToken = await getSecureItem('accessToken');
  }
  if (cachedToken) {
    config.headers.Authorization = `Bearer ${cachedToken}`;
  }
  return config;
});

// Token yenileme
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await getSecureItem('refreshToken');
      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );
        await setSecureItem('accessToken', data.accessToken);
        cachedToken = data.accessToken;
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        logger.log('Token yenileme başarısız');
        return Promise.reject(refreshError);
      }
    }
        const map = {
      400: 'İstek hatalı.',
      401: 'Oturum açmanız gerekiyor.',
      403: 'Bu işlem için yetkiniz yok.',
      404: 'İstenen kaynak bulunamadı.',
      500: 'Sunucu hatası, lütfen tekrar deneyin.',
    };
    error.userMessage = map[error.response?.status] || 'Bir hata oluştu.';
    return Promise.reject(error);
  }
  );

export const setCachedToken = (newToken) => {
  cachedToken = newToken;
};

export default axiosClient;
