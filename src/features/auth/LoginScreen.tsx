import { t } from './messages.ts';
import { useState, type SubmitEvent } from 'react';
import { PageShell } from '../../shared/PageShell.tsx';
import { ActionButton } from '../../shared/ActionButton.tsx';
import { TUDUDI_LOGIN_PATH } from '../../config/app.ts';
import { APP_BASE_PATH } from '../../config/base-path.ts';
import { AuthError, signIn, type AuthFailure } from './api.ts';

const ERRORS: Record<AuthFailure, string> = {
  get credentials() {
    return t('loginScreen.credentials');
  },
  get unverified() {
    return t('loginScreen.unverified');
  },
  get disabled() {
    return t('loginScreen.disabled');
  },
  get limited() {
    return t('loginScreen.limited');
  },
  get connection() {
    return t('loginScreen.connection');
  },
};

export function LoginScreen({
  enabled,
  expired,
  onSignedIn,
}: {
  readonly enabled: boolean;
  readonly expired: boolean;
  readonly onSignedIn: (uid: string) => void;
}) {
  const [error, setError] = useState<AuthFailure | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get('email');
    const passwordValue = data.get('password');
    if (typeof email !== 'string' || typeof passwordValue !== 'string') return;
    setBusy(true);
    setError(null);
    try {
      const uid = await signIn(email.trim(), passwordValue);
      form.reset();
      onSignedIn(uid);
    } catch (failure) {
      setError(failure instanceof AuthError ? failure.reason : 'connection');
      const password = form.elements.namedItem('password');
      if (password instanceof HTMLInputElement) password.value = '';
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageShell>
      <div className="ps-rail mb-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3">
            <img
              src={`${APP_BASE_PATH}icons/favicon.svg`}
              alt=""
              width="40"
              height="40"
              className="flex-none"
            />
            <p className="text-product" dir="ltr">
              only-tdy
            </p>
          </div>
          <p className="text-meta text-muted">{t('loginScreen.motto')}</p>
        </div>
        {expired && (
          <p className="text-action text-muted mt-3">
            {t('loginScreen.yourTududiSessionExpired')}
          </p>
        )}
      </div>
      {enabled && error !== 'disabled' ? (
        <form
          className="ps-rail flex flex-col gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <label className="flex flex-col gap-2 text-meta text-muted">
            {t('loginScreen.email')}
            <input
              className="min-h-11 w-full border-b border-line bg-transparent text-ink text-task outline-none focus:border-accent"
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              dir="ltr"
              required
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-2 text-meta text-muted">
            {t('loginScreen.password')}
            <input
              className="min-h-11 w-full border-b border-line bg-transparent text-ink text-task outline-none focus:border-accent"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={busy}
            />
          </label>
          {error !== null && (
            <p role="alert" className="text-action text-danger">
              {ERRORS[error]}
            </p>
          )}
          <div className="flex justify-end">
            <ActionButton
              primary
              type="submit"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? t('loginScreen.signingIn') : t('loginScreen.signIn')}
            </ActionButton>
          </div>
        </form>
      ) : (
        <div className="ps-rail">
          <p className="text-action text-muted mb-3">
            {t('loginScreen.passwordSignInIsUnavailableOn')}
          </p>
          <a
            className="text-accent underline min-h-11 inline-flex items-center"
            href={TUDUDI_LOGIN_PATH}
          >
            {t('loginScreen.continueThroughTududi')}
          </a>
        </div>
      )}
    </PageShell>
  );
}
