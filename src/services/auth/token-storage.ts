import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * SecureStore no soporta web (docs.expo.dev/versions/v57.0.0/sdk/securestore).
 * En web cae a localStorage — mismo storage que ya usa client/ para sus
 * tokens, no es una regresión de seguridad respecto a lo que ya existe.
 */
const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // no-op: sin storage disponible (ej. modo privado) no hay mucho más que hacer
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // no-op
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = { getItem, setItem, deleteItem };
