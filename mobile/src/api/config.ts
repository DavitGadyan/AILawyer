import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8000;

/**
 * Resolve the backend URL.
 *
 * Set EXPO_PUBLIC_API_URL to override (required once you deploy). Otherwise we
 * infer it: localhost on web, and on a physical device the same LAN host Metro
 * is being served from — so `expo start --tunnel` and a real phone just work.
 */
function resolveBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/$/, '');

  if (Platform.OS === 'web') return `http://localhost:${API_PORT}`;

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;

  // Android emulator maps the host machine to 10.0.2.2.
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
