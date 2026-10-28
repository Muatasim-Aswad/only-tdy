import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../shared/PageShell.tsx';
import { Select } from '../shared/Select.tsx';
import { SubmitButton } from '../shared/SubmitButton.tsx';
import { appLocale, applyLocale, t, type Locale } from '../shared/i18n.ts';
import {
  confirmedLocale,
  initialLocale,
  confirmLocale,
} from '../infra/locale.ts';

// The bootstrap choice is separate from authenticated, account-scoped preferences.
applyLocale(initialLocale());

export function LocaleBoundary({ children }: { readonly children: ReactNode }) {
  useTranslation('common');
  const [confirmed, setConfirmed] = useState(() => confirmedLocale() !== null);
  if (confirmed) return children;
  return (
    <PageShell>
      <form
        className="ps-rail flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          confirmLocale(appLocale());
          setConfirmed(true);
        }}
      >
        <p className="text-meta text-muted mb-2" dir="ltr">
          only-tdy
        </p>
        <h1 className="text-input">{t('language.question')}</h1>
        <p className="text-action text-muted">{t('language.suggestion')}</p>
        <label htmlFor="welcome-language" className="text-meta text-muted">
          {t('language.label')}
        </label>
        <Select
          id="welcome-language"
          value={appLocale()}
          onChange={(value) => {
            applyLocale(value as Locale);
          }}
        >
          <option lang="en" value="en">
            English
          </option>
          <option lang="ar" value="ar">
            العربية
          </option>
        </Select>
        <div className="flex justify-end">
          <SubmitButton>{t('language.continue')}</SubmitButton>
        </div>
      </form>
    </PageShell>
  );
}
