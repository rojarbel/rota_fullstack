import * as SecureStore from 'expo-secure-store';

export async function setItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string) {
  await SecureStore.deleteItemAsync(key);
}

export async function deleteItems(keys: string[]) {
  await Promise.all(keys.map((k) => SecureStore.deleteItemAsync(k)));
}