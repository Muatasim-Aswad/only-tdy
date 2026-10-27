import { readBrowserStorage, writeBrowserStorage } from './browser-storage.ts';
import { applyLocale, suggestedLocale, type Locale } from '../shared/i18n.ts';

const LANGUAGE_KEY = 'only-tdy:language:v1';
const LANGUAGE_INTENT_KEY = 'only-tdy:language-intent:v1';
let intent: Locale | null = null;
export function confirmedLocale(): Locale | null {
  const value = readBrowserStorage(LANGUAGE_KEY);
  return value === 'en' || value === 'ar' ? value : null;
}
export function initialLocale(): Locale {
  return confirmedLocale() ?? suggestedLocale(navigator.languages);
}
export function rememberLocale(locale: Locale): void {
  writeBrowserStorage(LANGUAGE_KEY, locale);
  applyLocale(locale);
}

/** An explicit pre-login choice overrides an older preference after sign-in. */
export function confirmLocale(locale: Locale): void {
  intent = locale;
  writeBrowserStorage(LANGUAGE_INTENT_KEY, locale);
  rememberLocale(locale);
}

function pendingLocale(): Locale | null {
  const stored = readBrowserStorage(LANGUAGE_INTENT_KEY);
  return intent ?? (stored === 'en' || stored === 'ar' ? stored : null);
}

export function applyAccountLocale(locale: Locale): void {
  if (pendingLocale() === null) rememberLocale(locale);
}

export function takeLocaleIntent(): Locale | null {
  const chosen = pendingLocale();
  intent = null;
  writeBrowserStorage(LANGUAGE_INTENT_KEY, '');
  return chosen;
}
