import { i18n } from '../../shared/i18n.ts';
import type { TOptions } from 'i18next';

export const english = {
  'authBoundary.connecting': 'Connecting…',
  'authBoundary.couldNotConnectCheckYourConnection':
    'Could not connect. Check your connection and try again.',
  'authBoundary.tryAgain': 'Try again',
  'loginScreen.credentials': 'The email or password is incorrect.',
  'loginScreen.unverified':
    'This account needs email verification. Ask your administrator for help.',
  'loginScreen.disabled':
    'Password sign-in is unavailable. Continue through Tududi.',
  'loginScreen.limited':
    'Too many attempts. Wait a little before trying again.',
  'loginScreen.connection':
    'Could not connect. Check your connection and try again.',
  'loginScreen.signIn': 'Sign in',
  'loginScreen.yourTududiSessionExpired': 'Your Tududi session expired.',
  'loginScreen.email': 'Email',
  'loginScreen.password': 'Password',
  'loginScreen.signingIn': 'Signing in…',
  'loginScreen.passwordSignInIsUnavailableOn':
    'Password sign-in is unavailable on this server.',
  'loginScreen.continueThroughTududi': 'Continue through Tududi',
} as const;
export const arabic: Readonly<Record<keyof typeof english, string>> = {
  'authBoundary.connecting': 'جارٍ الاتصال…',
  'authBoundary.couldNotConnectCheckYourConnection':
    'تعذّر الاتصال. تحقّق من اتصالك وحاول مجددًا.',
  'authBoundary.tryAgain': 'حاول مجددًا',
  'loginScreen.credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'loginScreen.unverified':
    'هذا الحساب يحتاج إلى تأكيد البريد الإلكتروني. اطلب المساعدة من مسؤول الخادم.',
  'loginScreen.disabled': 'تسجيل الدخول بكلمة مرور غير متاح. تابع عبر Tududi.',
  'loginScreen.limited': 'محاولات كثيرة. انتظر قليلًا قبل المحاولة مجددًا.',
  'loginScreen.connection': 'تعذّر الاتصال. تحقّق من اتصالك وحاول مجددًا.',
  'loginScreen.signIn': 'تسجيل الدخول',
  'loginScreen.yourTududiSessionExpired':
    'انتهت جلسة Tududi. سجّل الدخول مجددًا.',
  'loginScreen.email': 'البريد الإلكتروني',
  'loginScreen.password': 'كلمة المرور',
  'loginScreen.signingIn': 'جارٍ تسجيل الدخول…',
  'loginScreen.passwordSignInIsUnavailableOn':
    'تسجيل الدخول بكلمة مرور غير متاح على هذا الخادم.',
  'loginScreen.continueThroughTududi': 'المتابعة عبر Tududi',
};

i18n.addResourceBundle('en', 'auth', english);
i18n.addResourceBundle('ar', 'auth', arabic);

export const t = i18n.getFixedT(null, 'auth') as (
  key: keyof typeof english,
  options?: TOptions,
) => string;
