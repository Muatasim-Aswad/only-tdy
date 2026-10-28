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
    'تعذّر الاتصال. تحقّق من اتصالك بالشبكة وحاول مجددًا.',
  'authBoundary.tryAgain': 'إعادة المحاولة',
  'loginScreen.credentials':
    'بيانات الدخول غير صحيحة. تحقّق من البريد الإلكتروني وكلمة المرور.',
  'loginScreen.unverified':
    'يجب تأكيد بريدك الإلكتروني أولًا. تواصل مع مسؤول الخادم للمساعدة.',
  'loginScreen.disabled':
    'تسجيل الدخول بكلمة المرور غير متاح. سجّل الدخول عبر Tududi.',
  'loginScreen.limited':
    'حاولت تسجيل الدخول مرات كثيرة. انتظر قليلًا ثم حاول مجددًا.',
  'loginScreen.connection':
    'تعذّر الاتصال. تحقّق من اتصالك بالشبكة وحاول مجددًا.',
  'loginScreen.signIn': 'تسجيل الدخول',
  'loginScreen.yourTududiSessionExpired':
    'انتهت جلسة Tududi. سجّل الدخول مجددًا.',
  'loginScreen.email': 'البريد الإلكتروني',
  'loginScreen.password': 'كلمة المرور',
  'loginScreen.signingIn': 'جارٍ تسجيل الدخول…',
  'loginScreen.passwordSignInIsUnavailableOn':
    'تسجيل الدخول بكلمة المرور غير متاح على هذا الخادم.',
  'loginScreen.continueThroughTududi': 'تسجيل الدخول عبر Tududi',
};

i18n.addResourceBundle('en', 'auth', english);
i18n.addResourceBundle('ar', 'auth', arabic);

export const t = i18n.getFixedT(null, 'auth') as (
  key: keyof typeof english,
  options?: TOptions,
) => string;
