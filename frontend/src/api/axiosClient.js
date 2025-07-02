import axios from 'axios';
import { getItem as getSecureItem, setItem as setSecureItem } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import qs from 'qs';
import logger from '../utils/logger';
import Constants from 'expo-constants';

let cachedToken = null;

// ✅ API URL artık expo.config.js içindeki extra alanından alınır
const API_BASE_URL = `${Constants.manifest?.extra?.apiUrl || 'https://rotabackend-f4gqewcbfcfud4ac.qatarcentral-01.azurewebsites.net'}/api`;


const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

axiosClient.interceptors.request.use(async (config) => {
  if (!cachedToken) {
    cachedToken = await getSecureItem('accessToken');
  }
  if (cachedToken) {
    config.headers.Authorization = `Bearer ${cachedToken}`;
  }
  return config;
});

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
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getWithCache(url, options = {}, ttl = DEFAULT_CACHE_TTL) {
  try {
    const paramsString = options.params
      ? qs.stringify(options.params, { arrayFormat: 'repeat' })
      : '';
    const cacheKey = `cache:${url}?${paramsString}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < ttl) {
        return { data: parsed.data };
      }
      await AsyncStorage.removeItem(cacheKey);
    }
    const response = await axiosClient.get(url, options);
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({ timestamp: Date.now(), data: response.data })
    );
    return response;
  } catch (err) {
    // Fallback to normal request if cache fails
    return axiosClient.get(url, options);
  }
}
export default axiosClient;
