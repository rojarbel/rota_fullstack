import { Alert } from 'react-native';
import logger from './logger';

const statusMessages: Record<number, string> = {
  400: 'İstek hatalı.',
  401: 'Oturum açmanız gerekiyor.',
  403: 'Bu işlem için yetkiniz yok.',
  404: 'İstenen kaynak bulunamadı.',
  500: 'Sunucu hatası, lütfen tekrar deneyin.',
};

export default function handleApiError(error: any, fallback = 'Bir hata oluştu.') {
  logger.error(fallback, error);
  const message =
    error?.userMessage ||
    statusMessages[error?.response?.status] ||
    fallback;
  Alert.alert('Hata', message);
}