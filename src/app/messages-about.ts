import { i18n } from '../shared/i18n.ts';
import type { TOptions } from 'i18next';
export const english = {
  'versionScreen.aboutOnlyTdy': 'About only-tdy',
  'versionScreen.captureTasksQuicklyChooseWhatMatters':
    'Capture tasks quickly, choose what matters today, and leave the rest in Backlog. A minimalist daily task manager for people overwhelmed by complicated productivity apps, without the overhead of managing an entire productivity system.',
  'copy.versionApp': 'App version',
  'copy.versionReleased': 'Released',
  'copy.versionBuilt': 'Built',
  'copy.versionRevision': 'Revision',
  'copy.versionChecking': 'Checking for updates…',
  'copy.versionCurrent': 'Up to date.',
  'copy.versionUnknown': 'Couldn’t check for updates.',
  'copy.versionReload': 'Reload',
  'copy.versionAvailable': 'Update available: {{label}}.',
} as const;
export const arabic: Readonly<Record<keyof typeof english, string>> = {
  'versionScreen.aboutOnlyTdy': 'عن only-tdy',
  'versionScreen.captureTasksQuicklyChooseWhatMatters':
    'دوّن مهامك بسرعة، واختر ما تريد إنجازه اليوم، واترك الباقي في قائمة الانتظار. يساعدك only-tdy على تنظيم يومك ببساطة، دون أن تنشغل بتعقيدات تطبيقات الإنتاجية وكثرة أدواتها.',
  'copy.versionApp': 'إصدار التطبيق',
  'copy.versionReleased': 'تاريخ الإصدار',
  'copy.versionBuilt': 'تاريخ البناء',
  'copy.versionRevision': 'معرّف النسخة',
  'copy.versionChecking': 'جارٍ البحث عن تحديثات…',
  'copy.versionCurrent': 'لديك أحدث إصدار.',
  'copy.versionUnknown': 'تعذّر البحث عن تحديثات.',
  'copy.versionReload': 'إعادة تحميل الصفحة',
  'copy.versionAvailable': 'تحديث متاح: {{label}}.',
};
i18n.addResourceBundle('en', 'about', english);
i18n.addResourceBundle('ar', 'about', arabic);
export const t = i18n.getFixedT(null, 'about') as (
  key: keyof typeof english,
  options?: TOptions,
) => string;
