import { i18n } from '../shared/i18n.ts';
import type { TOptions } from 'i18next';
export const english = {
  'app.Page.loadingTask': 'Loading task…',
  'app.Page.loadingTasks': 'Loading tasks…',
  'app.Page.loading': 'Loading…',
  'errorBoundary.onlyTdyCouldnTDisplayThisText':
    'only-tdy couldn’t display this page.',
  'errorBoundary.reloadToTryAgainUnsavedDrafts':
    'Reload to try again. Unsaved drafts will be lost.',
  'errorBoundary.reload': 'Reload',
  'updateToast.details': 'Details',
  'copy.updated': 'Updated to {{label}}',
} as const;
export const arabic: Readonly<Record<keyof typeof english, string>> = {
  'app.Page.loadingTask': 'جارٍ تحميل المهمة…',
  'app.Page.loadingTasks': 'جارٍ تحميل المهام…',
  'app.Page.loading': 'جارٍ التحميل…',
  'errorBoundary.onlyTdyCouldnTDisplayThisText':
    'تعذّر عرض هذه الصفحة في only-tdy.',
  'errorBoundary.reloadToTryAgainUnsavedDrafts':
    'أعد التحميل للمحاولة مجددًا. ستفقد المسودات غير المحفوظة.',
  'errorBoundary.reload': 'إعادة التحميل',
  'updateToast.details': 'التفاصيل',
  'copy.updated': 'تم التحديث إلى {{label}}',
};
i18n.addResourceBundle('en', 'app', english);
i18n.addResourceBundle('ar', 'app', arabic);
export const t = i18n.getFixedT(null, 'app') as (
  key: keyof typeof english,
  options?: TOptions,
) => string;
