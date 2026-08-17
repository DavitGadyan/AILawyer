import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * SecureStore is the right home for a JWT on device, but it has no web
 * implementation — so web falls back to AsyncStorage (localStorage).
 */
const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  try {
    return isWeb ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) await AsyncStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    /* storage is best-effort — a failure just means the user signs in again */
  }
}

export async function deleteItem(key: string): Promise<void> {
  try {
    if (isWeb) await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

export const KEYS = {
  token: 'ailawyer.token',
  locale: 'ailawyer.locale',
  practice: 'ailawyer.practice',
  // Jurisdiction is remembered per practice — immigration and tax rarely share one.
  jurisdiction: 'ailawyer.jurisdiction',
  jurisdictionTax: 'ailawyer.jurisdiction.tax',
  disclaimer: 'ailawyer.disclaimerAccepted',
} as const;
