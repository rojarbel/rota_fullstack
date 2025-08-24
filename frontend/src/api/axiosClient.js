import axios from 'axios';
import { getItem as getSecureItem, setItem as setSecureItem } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import qs from 'qs';
import logger from '../utils/logger';
import Constants from 'expo-constants';

// 🔗 API BASE: .env / eas.json → app.config.js → extra.apiUrl
// Fallback'ı Azure yerine Render yapıyoruz.
const EXTRA = Constants.expoConfig?.extra || Constants.manifest?.extra;
const API_ORIGIN =
  EXTRA?.apiUrl ||
  'https://rota-backend-dlyy.onrender.com'; // <- Render URL'in (gerekirse kendi URL'inle değiştir)

const API_BASE_URL = `${API_ORIGIN.replace(/\/+$/, '')}/api`;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
});

// İsteklere token ekle
axiosClient.interceptors.request.use(async (config) => {
  const token = await getSecureItem('accessToken'); // SecureStore/AsyncStorage wrapper
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → refresh akışı
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getSecureItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        // Refresh'i baseURL ile çağır (axiosClient değil → interceptor loop olmasın)
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { timeout: 15000, headers: { Accept: 'application/json' } }
        );

        // Yeni accessToken'ı sakla
        await setSecureItem('accessToken', data.accessToken);

        // Orijinal isteği yeni token ile tekrar dene
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        logger.log('Token yenileme başarısız, çıkış yapılıyor');
        // Tokenları sil → (opsiyonel) kullanıcıyı Login ekranına yönlendir
        await setSecureItem('accessToken', '');
        await setSecureItem('refreshToken', '');
        return Promise.reject(refreshErr);
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

export const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 dk

// Basit GET cache
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
  } catch {
    // Cache patlarsa normal istek
    return axiosClient.get(url, options);
  }
}

export default axiosClient;
