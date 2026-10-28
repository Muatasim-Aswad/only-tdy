import { i18n } from '../shared/i18n.ts';
import type { TOptions } from 'i18next';
export const english = {
  'tududiClient.responseError.yourTududiSessionExpired':
    'Your Tududi session expired.',
  'tududiClient.responseError.thatTaskIsGone': 'That task is gone.',
  'tududiClient.responseError.tududiCouldNotAcceptThisChange':
    'Tududi could not accept this change. Check the fields and try again.',
  'tududiClient.responseError.yourSessionCouldNotVerifyThis':
    'Your session could not verify this change. Reload and try again.',
  'tududiClient.responseError.tududiCouldNotCompleteTheRequest':
    'Tududi could not complete the request. Try again.',
  'tududiClient.createTududiClient.requestTimedOutRefreshBeforeRetrying':
    'Request timed out. Refresh before retrying a change.',
  'tududiClient.createTududiClient.yourTududiSessionExpired':
    'Your Tududi session expired.',
  'tududiClient.createTududiClient.tududiReturnedAnUnreadableResponseRefresh':
    'Tududi returned an unreadable response. Refresh before retrying a change.',
  'tududiClient.createTududiClient.couldNotReachTududiRefreshBefore':
    'Could not reach Tududi. Refresh before retrying a change.',
  'tududiClient.createTududiClient.yourSessionCouldNotVerifyThis':
    'Your session could not verify this change. Reload and try again.',
} as const;
export const arabic: Readonly<Record<keyof typeof english, string>> = {
  'tududiClient.responseError.yourTududiSessionExpired':
    'انتهت جلسة Tududi. سجّل الدخول مجددًا.',
  'tududiClient.responseError.thatTaskIsGone': 'لم تعد هذه المهمة موجودة.',
  'tududiClient.responseError.tududiCouldNotAcceptThisChange':
    'تعذّر حفظ التغيير في Tududi. راجع البيانات التي أدخلتها وحاول مجددًا.',
  'tududiClient.responseError.yourSessionCouldNotVerifyThis':
    'تعذّر التحقّق من صلاحية جلستك لإجراء التغيير. أعد تحميل الصفحة وحاول مجددًا.',
  'tududiClient.responseError.tududiCouldNotCompleteTheRequest':
    'تعذّر على Tududi إكمال الطلب. حاول مجددًا.',
  'tududiClient.createTududiClient.requestTimedOutRefreshBeforeRetrying':
    'استغرق الطلب وقتًا أطول من المتوقع. حدّث الصفحة قبل محاولة إجراء التغيير مجددًا.',
  'tududiClient.createTududiClient.yourTududiSessionExpired':
    'انتهت جلسة Tududi. سجّل الدخول مجددًا.',
  'tududiClient.createTududiClient.tududiReturnedAnUnreadableResponseRefresh':
    'تعذّر فهم الردّ من Tududi. حدّث الصفحة قبل محاولة إجراء التغيير مجددًا.',
  'tududiClient.createTududiClient.couldNotReachTududiRefreshBefore':
    'تعذّر الاتصال بـ Tududi. حدّث الصفحة قبل محاولة إجراء التغيير مجددًا.',
  'tududiClient.createTududiClient.yourSessionCouldNotVerifyThis':
    'تعذّر التحقّق من صلاحية جلستك لإجراء التغيير. أعد تحميل الصفحة وحاول مجددًا.',
};
i18n.addResourceBundle('en', 'transport', english);
i18n.addResourceBundle('ar', 'transport', arabic);
export const t = i18n.getFixedT(null, 'transport') as (
  key: keyof typeof english,
  options?: TOptions,
) => string;
