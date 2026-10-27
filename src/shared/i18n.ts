import { createInstance, type TOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';

export type Locale = 'en' | 'ar';
export const english = {
  'feedbackToast.ToastContent.dismissNotificationLabel': 'Dismiss notification',
  'feedbackToast.ToastContent.dismissLabel': 'Dismiss',
  'language.question': 'Continue in this language?',
  'language.suggestion':
    'Choose the language for only-tdy. You can change it later in Settings.',
  'language.label': 'Language',
  'language.continue': 'Continue',
  'language.english': 'English',
  'language.arabic': 'العربية',
} as const;
export const arabic: Readonly<Record<keyof typeof english, string>> = {
  'feedbackToast.ToastContent.dismissNotificationLabel': 'إغلاق الإشعار',
  'feedbackToast.ToastContent.dismissLabel': 'إغلاق',
  'language.question': 'هل تريد المتابعة بهذه اللغة؟',
  'language.suggestion':
    'اختر لغة only-tdy. يمكنك تغييرها لاحقًا من الإعدادات.',
  'language.label': 'اللغة',
  'language.continue': 'متابعة',
  'language.english': 'English',
  'language.arabic': 'العربية',
};

export const i18n = createInstance();
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'ar'],
  defaultNS: 'common',
  keySeparator: false,
  initAsync: false,
  interpolation: { escapeValue: false },
  resources: { en: { common: english }, ar: { common: arabic } },
  react: { useSuspense: false },
});

i18n.services.formatter?.addCached('number', (language) => {
  const formatter = new Intl.NumberFormat(
    language === 'ar' ? 'ar-u-nu-arab' : 'en',
  );
  return (value: unknown) => formatter.format(Number(value));
});

export const t = i18n.getFixedT(null, 'common') as (
  key: keyof typeof english,
  options?: TOptions,
) => string;

export function appLocale(): Locale {
  return i18n.resolvedLanguage === 'ar' ? 'ar' : 'en';
}

export function applyLocale(locale: Locale): void {
  if (i18n.resolvedLanguage !== locale) void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function suggestedLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base === 'ar') return 'ar';
    if (base === 'en') return 'en';
  }
  return 'en';
}

export function formattingLocale(): string {
  return appLocale() === 'ar' ? 'ar-u-nu-arab' : 'en';
}
