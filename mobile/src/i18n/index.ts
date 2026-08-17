import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './en.json';
import es from './es.json';

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function deviceLocale(): Locale {
  try {
    const tag = getLocales()[0]?.languageCode;
    return tag === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  // React Native has no Intl plural rules in every engine; keep it simple.
  compatibilityJSON: 'v4',
});

export default i18n;
