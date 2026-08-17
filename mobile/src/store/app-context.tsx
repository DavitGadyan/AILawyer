import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api, ApiError } from '@/api/client';
import { deleteItem, getItem, KEYS, setItem } from '@/api/storage';
import type { Jurisdiction, Practice, User } from '@/api/types';
import { deviceLocale, type Locale } from '@/i18n';
import { jurisdictionsFor } from '@/theme/tokens';

interface AppState {
  ready: boolean;
  user: User | null;
  locale: Locale;
  practice: Practice;
  jurisdiction: Jurisdiction;
  disclaimerAccepted: boolean;
  aiEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  setPractice: (p: Practice) => Promise<void>;
  setJurisdiction: (j: Jurisdiction) => Promise<void>;
  acceptDisclaimer: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [locale, setLocaleState] = useState<Locale>('en');
  const [practice, setPracticeState] = useState<Practice>('immigration');
  const [jurisdiction, setJurisdictionState] = useState<Jurisdiction>('US');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  // Boot: restore locale/practice/jurisdiction/session, then probe the backend.
  useEffect(() => {
    (async () => {
      const [storedLocale, storedPractice, storedJ, storedJTax, storedDisclaimer, token] =
        await Promise.all([
          getItem(KEYS.locale),
          getItem(KEYS.practice),
          getItem(KEYS.jurisdiction),
          getItem(KEYS.jurisdictionTax),
          getItem(KEYS.disclaimer),
          getItem(KEYS.token),
        ]);

      const initialLocale = (storedLocale as Locale) ?? deviceLocale();
      setLocaleState(initialLocale);
      await i18n.changeLanguage(initialLocale);

      const initialPractice = (storedPractice as Practice) ?? 'immigration';
      setPracticeState(initialPractice);

      const stored = initialPractice === 'tax' ? storedJTax : storedJ;
      setJurisdictionState(
        (stored as Jurisdiction) ?? jurisdictionsFor[initialPractice][0],
      );
      if (storedDisclaimer === 'true') setDisclaimerAccepted(true);

      if (token) {
        try {
          setUser(await api.me());
        } catch {
          await deleteItem(KEYS.token); // expired or invalid
        }
      }

      try {
        const health = await api.health();
        setAiEnabled(health.ai_enabled);
      } catch {
        setAiEnabled(false);
      }

      setReady(true);
    })();
    // i18n is stable for the lifetime of the app
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistAuth = useCallback(
    async (res: { access_token: string; user: User }) => {
      await setItem(KEYS.token, res.access_token);
      setUser(res.user);
      if (res.user.locale === 'en' || res.user.locale === 'es') {
        setLocaleState(res.user.locale);
        await i18n.changeLanguage(res.user.locale);
      }
      if (res.user.accepted_disclaimer) setDisclaimerAccepted(true);
    },
    [i18n],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      persistAuth(await api.login({ email: email.trim(), password }));
    },
    [persistAuth],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      persistAuth(
        await api.register({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          locale,
        }),
      );
    },
    [persistAuth, locale],
  );

  const signOut = useCallback(async () => {
    await deleteItem(KEYS.token);
    setUser(null);
  }, []);

  const setLocale = useCallback(
    async (next: Locale) => {
      setLocaleState(next);
      await i18n.changeLanguage(next);
      await setItem(KEYS.locale, next);
      if (user) {
        try {
          await api.updateMe({ locale: next });
        } catch {
          /* the local preference is what matters for the UI */
        }
      }
    },
    [i18n, user],
  );

  const setJurisdiction = useCallback(
    async (next: Jurisdiction) => {
      setJurisdictionState(next);
      await setItem(
        practice === 'tax' ? KEYS.jurisdictionTax : KEYS.jurisdiction,
        next,
      );
    },
    [practice],
  );

  const setPractice = useCallback(async (next: Practice) => {
    setPracticeState(next);
    await setItem(KEYS.practice, next);

    // Restore the jurisdiction last used in this practice, else its default.
    const stored = await getItem(
      next === 'tax' ? KEYS.jurisdictionTax : KEYS.jurisdiction,
    );
    const allowed = jurisdictionsFor[next];
    const resolved =
      stored && (allowed as readonly string[]).includes(stored)
        ? (stored as Jurisdiction)
        : allowed[0];
    setJurisdictionState(resolved);
  }, []);

  const acceptDisclaimer = useCallback(async () => {
    setDisclaimerAccepted(true);
    await setItem(KEYS.disclaimer, 'true');
    if (user) {
      try {
        await api.updateMe({ accepted_disclaimer: true });
      } catch {
        /* non-critical */
      }
    }
  }, [user]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      user,
      locale,
      practice,
      jurisdiction,
      disclaimerAccepted,
      aiEnabled,
      signIn,
      signUp,
      signOut,
      setLocale,
      setPractice,
      setJurisdiction,
      acceptDisclaimer,
    }),
    [
      ready,
      user,
      locale,
      practice,
      jurisdiction,
      disclaimerAccepted,
      aiEnabled,
      signIn,
      signUp,
      signOut,
      setLocale,
      setPractice,
      setJurisdiction,
      acceptDisclaimer,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export { ApiError };
