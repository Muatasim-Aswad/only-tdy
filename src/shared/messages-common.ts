export const english = {
  'display.noValue': '—',
  'feedbackToast.ToastContent.dismissNotificationLabel': 'Dismiss notification',
  'feedbackToast.ToastContent.dismissLabel': 'Dismiss',
  'language.label': 'Language',
  'language.continue': 'Continue',
  'language.english': 'English',
  'language.arabic': 'العربية',
} as const;
export const arabic: Readonly<Record<keyof typeof english, string>> = {
  'display.noValue': '—',
  'feedbackToast.ToastContent.dismissNotificationLabel': 'إغلاق الإشعار',
  'feedbackToast.ToastContent.dismissLabel': 'إغلاق',
  'language.label': 'اللغة',
  'language.continue': 'متابعة',
  'language.english': 'English',
  'language.arabic': 'العربية',
};
