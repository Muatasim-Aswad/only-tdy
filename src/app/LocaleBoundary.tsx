import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../shared/PageShell.tsx';
import { Select } from '../shared/Select.tsx';
import { ActionButton } from '../shared/ActionButton.tsx';
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
        className="ps-rail flex flex-col items-start gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          confirmLocale(appLocale());
          setConfirmed(true);
        }}
      >
        <label htmlFor="welcome-language" className="text-meta text-muted">
          {t('language.label')}
        </label>
        <Select
          id="welcome-language"
          className="w-fit"
          controlClassName="min-h-11"
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
        <ActionButton type="submit">{t('language.continue')}</ActionButton>
      </form>
    </PageShell>
  );
}
