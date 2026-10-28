export const english = {
  'display.noValue': '—',
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
  'display.noValue': '—',
  'feedbackToast.ToastContent.dismissNotificationLabel': 'إغلاق الإشعار',
  'feedbackToast.ToastContent.dismissLabel': 'إغلاق',
  'language.question': 'هل نتابع بالعربية؟',
  'language.suggestion':
    'اختر اللغة التي تفضّلها. يمكنك تغييرها لاحقًا من الإعدادات.',
  'language.label': 'اللغة',
  'language.continue': 'متابعة',
  'language.english': 'English',
  'language.arabic': 'العربية',
};
