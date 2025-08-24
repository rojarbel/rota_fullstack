// index.js
// Tek noktadan API ve Görsel URL çözümü (Expo)

import Constants from 'expo-constants';

// app.config.js → extra.apiUrl / extra.imageCdnUrl değerlerini oku
const EXTRA = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

/** API origin (sondaki / temizlenir) */
export const API_BASE_URL = String(EXTRA.apiUrl || '')
  .replace(/\/+$/, '');

/**
 * IMAGE_BASE_URL:
 * - Yeni kayıtlar R2 'gorselUrl' ile TAM URL döndürüyor → base gerekmiyor
 * - Eski kayıtlar (relatif /img/...) için fallback olarak imageCdnUrl, o yoksa apiUrl kullanılır
 */
export const IMAGE_BASE_URL = String(
  EXTRA.imageCdnUrl || EXTRA.apiUrl || ''
).replace(/\/+$/, '');

/** Absolut URL mi? */
export function isAbsoluteUrl(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u);
}

/** Base + path güvenli birleştirme */
export function joinUrl(base, path) {
  if (!path) return base || null;
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path).replace(/^\/+/, '');
  return b ? `${b}/${p}` : `/${p}`;
}

/**
 * Görsel URL çözümü
 * - Objeyse: gorselUrl > gorsel > imageUrl > image
 * - Stringse: doğrudan kullan
 * - Absolutsa: direkt dön
 * - Relatifse: IMAGE_BASE_URL ile birleştir
 */
export function resolveImageUrl(src) {
  if (!src) return null;

  // String verildiyse
  if (typeof src === 'string') {
    return isAbsoluteUrl(src) ? src : joinUrl(IMAGE_BASE_URL, src);
  }

  // Obje verildiyse (etkinlik vb.)
  const candidate =
    src.gorselUrl ??
    src.gorsel ??
    src.imageUrl ??
    src.image ??
    null;

  if (!candidate) return null;
  return isAbsoluteUrl(candidate)
    ? candidate
    : joinUrl(IMAGE_BASE_URL, candidate);
}
