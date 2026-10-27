import { useTranslation } from 'react-i18next';
import { appLocale, t as commonT, type Locale } from '../../shared/i18n.ts';
import { t } from './messages.ts';
import { PageShell } from '../../shared/PageShell.tsx';
import { useState } from 'react';
import { routePath } from '../../config/routes.ts';
import {
  handleLinkNavigation,
  pageReturnPath,
} from '../../infra/navigation.ts';
import { HelpTip } from '../../shared/HelpTip.tsx';
import { Select } from '../../shared/Select.tsx';
import { BackLink } from './components/BackLink.tsx';
import { DEFAULT_PREFERENCES, type Preferences } from './preferences/model.ts';
import {
  preferencesStore,
  type PreferencesState,
} from './preferences/store.ts';
import { usePreferences } from './preferences/usePreferences.ts';

export function SettingsPage() {
  useTranslation('tasks');
  const PROMOTION_HELP = t('settingsPage.automaticallyMovesDueAndOverdueTasks');
  const BACKLOG_HELP = t('settingsPage.hiddenTasksRemainAvailableInAll');
  const { settings, status, account, cached } = usePreferences();
  const [daysDraft, setDaysDraft] = useState({
    source: settings.daysBeforeDue,
    value: String(settings.daysBeforeDue),
  });
  const days =
    daysDraft.source === settings.daysBeforeDue
      ? daysDraft.value
      : String(settings.daysBeforeDue);
  const daysError = !validDays(days);
  const update = (changes: Partial<Preferences>) => {
    preferencesStore.update(changes);
  };
  const backHref = pageReturnPath(routePath({ kind: 'tasks' }));
  const disabled = account === null || status === 'loading';

  return (
    <PageShell>
      <header className="focus-head flex items-center justify-between gap-4 mb-2">
        <BackLink
          label={t('settingsPage.backLabel')}
          href={backHref}
          onNavigate={(event) => {
            handleLinkNavigation(event, backHref);
          }}
        />
        <span
          className="focus-head__action flex items-center justify-end min-w-0 -me-2 focus-settings__save-state me-0 text-muted text-meta"
          role="status"
        >
          {settings.datedBacklog === 'before' && daysError
            ? t('settingsPage.notSaved')
            : status === 'synced'
              ? t('settingsPage.saved')
              : status === 'saving'
                ? t('settingsPage.saving')
                : status === 'loading'
                  ? t('settingsPage.loading')
                  : t('settingsPage.notSynced')}
        </span>
      </header>
      {status === 'local' || status === 'unavailable' || !cached ? (
        <div className="focus-settings__sync-error [&_p]:m-0 [&_button]:min-h-11 [&_button]:text-accent [&_button]:cursor-pointer [&_button:focus-visible]:text-accent hover:[&_button]:text-accent ms-rail text-muted text-meta">
          <p>{syncMessage(status, cached)}</p>
          {status === 'local' || status === 'unavailable' ? (
            <button
              type="button"
              className="text-action"
              onClick={() => {
                void preferencesStore.sync();
              }}
            >
              {t('settingsPage.retrySync')}
            </button>
          ) : null}
        </div>
      ) : null}
      <section
        className="focus-settings__section ms-rail mt-7"
        aria-label={commonT('language.label')}
      >
        <div className="focus-settings__field py-3 flex flex-col gap-1">
          <label
            htmlFor="settings-language"
            className="flex items-center min-h-11 text-muted text-meta"
          >
            {commonT('language.label')}
          </label>
          <Select
            id="settings-language"
            value={settings.locale ?? appLocale()}
            disabled={disabled}
            onChange={(value) => {
              update({ locale: value as Locale });
            }}
          >
            <option value="en" lang="en">
              English
            </option>
            <option value="ar" lang="ar">
              العربية
            </option>
          </Select>
        </div>
      </section>
      <section
        className="focus-settings__section ms-rail mt-7 [&+section]:mt-0"
        aria-label={t('settingsPage.appearanceLabel')}
      >
        <div className="focus-settings__field min-w-0 m-0 py-3 px-0 border-0 focus-settings__field--stack flex flex-col items-stretch gap-1">
          <label
            htmlFor="settings-theme"
            className="flex items-center min-h-11 text-muted text-meta"
          >
            {t('settingsPage.theme')}
          </label>
          <Select
            className="flex-auto"
            controlClassName="flex-auto min-h-11"
            id="settings-theme"
            value={settings.theme}
            disabled={disabled}
            onChange={(value) => {
              update({ theme: value as Preferences['theme'] });
            }}
          >
            <option value="system">{t('settingsPage.system')}</option>
            <option value="light">{t('settingsPage.light')}</option>
            <option value="dark">{t('settingsPage.dark')}</option>
          </Select>
        </div>
      </section>
      <section
        className="focus-settings__section ms-rail mt-7 [&+section]:mt-0"
        aria-label={t('settingsPage.planningLabel')}
      >
        <div className="focus-settings__field min-w-0 m-0 py-3 px-0 border-0 border-t border-line">
          <div className="focus-settings__field--stack flex flex-col items-stretch gap-1">
            <div className="focus-settings__label flex items-center gap-1 min-h-11 text-muted">
              <label htmlFor="settings-promotion" className="text-meta">
                {t('settingsPage.moveDueTasksToToday')}
              </label>
              <HelpTip
                label={t('settingsPage.aboutMovingDueTasksToTodayLabel')}
                text={PROMOTION_HELP}
              />
            </div>
            <Select
              className="flex-auto"
              controlClassName="flex-auto min-h-11"
              id="settings-promotion"
              value={settings.autoDuePromotion ? 'auto' : 'manual'}
              disabled={disabled}
              description={PROMOTION_HELP}
              onChange={(value) => {
                update({ autoDuePromotion: value === 'auto' });
              }}
            >
              <option value="auto">{t('settingsPage.automatically')}</option>
              <option value="manual">{t('settingsPage.manually')}</option>
            </Select>
          </div>
        </div>
        <div className="focus-settings__field min-w-0 m-0 py-3 px-0 border-0 border-t border-line">
          <div className="focus-settings__field--stack flex flex-col items-stretch gap-1">
            <div className="focus-settings__label flex items-center gap-1 min-h-11 text-muted">
              <label htmlFor="settings-dated" className="text-meta">
                {t('settingsPage.showDatedTasksInBacklog')}
              </label>
              <HelpTip
                label={t('settingsPage.aboutDatedTasksInBacklogLabel')}
                text={BACKLOG_HELP}
              />
            </div>
            <div className="focus-settings__dated-control flex items-center gap-3">
              {settings.datedBacklog === 'before' ? (
                <input
                  id="settings-days"
                  className="focus-settings__number focus-visible:border-accent flex-none min-h-11 p-2 border border-line rounded-fill bg-surface text-ink tabular-nums [appearance:textfield] text-task"
                  type="number"
                  min="1"
                  max="365000"
                  step="1"
                  inputMode="numeric"
                  aria-label={t('settingsPage.daysBeforeDueLabel')}
                  disabled={disabled}
                  value={days}
                  style={{
                    width: `calc(${String(Math.max(1, days.length))}ch + 18px)`,
                  }}
                  aria-invalid={daysError || undefined}
                  aria-describedby={
                    daysError ? 'settings-days-error' : undefined
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    const number = Number(value);
                    const valid = validDays(value);
                    setDaysDraft({
                      source: valid ? number : settings.daysBeforeDue,
                      value,
                    });
                    if (valid) update({ daysBeforeDue: number });
                  }}
                />
              ) : null}
              <Select
                className="flex-auto"
                controlClassName="flex-auto min-h-11"
                id="settings-dated"
                value={settings.datedBacklog}
                disabled={disabled}
                description={BACKLOG_HELP}
                onChange={(value) => {
                  update({
                    datedBacklog: value as Preferences['datedBacklog'],
                  });
                }}
              >
                <option value="always">{t('settingsPage.always')}</option>
                <option value="before">
                  {settings.datedBacklog === 'before'
                    ? t('settingsPage.daysBeforeDueText')
                    : t('settingsPage.nDaysBeforeDue')}
                </option>
                <option value="due">{t('settingsPage.onTheDueDate')}</option>
              </Select>
            </div>
            {settings.datedBacklog === 'before' && daysError ? (
              <p
                id="settings-days-error"
                className="focus-settings__days-error mt-1 me-0 mb-0 ms-0 text-priority-high text-meta"
              >
                {t('settingsPage.enterAWholeNumberFrom1')}
              </p>
            ) : null}
          </div>
        </div>
      </section>
      <section
        className="ms-rail mt-4 py-4 border-t border-line"
        aria-labelledby="settings-tips-label"
      >
        <div className="flex items-center justify-between gap-5">
          <div>
            <p id="settings-tips-label" className="text-action">
              {t('settingsPage.tips')}
            </p>
            <p id="settings-tips-help" className="text-meta text-muted mt-1">
              {t('settingsPage.tipsHelp')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-meta text-muted" aria-hidden="true">
              {t(
                settings.guidanceTips
                  ? 'settingsPage.tipsOn'
                  : 'settingsPage.tipsOff',
              )}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.guidanceTips}
              aria-labelledby="settings-tips-label"
              aria-describedby="settings-tips-help"
              disabled={disabled}
              className="inline-flex items-center justify-center min-h-11 min-w-11 cursor-pointer rounded-[6px] enabled:hover:opacity-85 focus-visible:[outline:2px_solid_var(--accent)] focus-visible:[outline-offset:3px] enabled:active:opacity-70 disabled:opacity-50 disabled:cursor-default"
              onClick={() => {
                update({ guidanceTips: !settings.guidanceTips });
              }}
            >
              <span
                aria-hidden="true"
                className={`flex items-center w-11 h-6 p-[3px] border rounded-full ${settings.guidanceTips ? 'justify-end bg-accent border-accent' : 'justify-start bg-selection border-line'}`}
              >
                <span
                  className={`block size-4 rounded-full ${settings.guidanceTips ? 'bg-canvas' : 'bg-muted'}`}
                />
              </span>
            </button>
          </div>
        </div>
      </section>
      <div className="focus-settings__reset [&_button]:min-h-11 [&_button]:text-priority-high [&_button]:cursor-pointer [&_button]:transition-[color] [&_button]:duration-120 [&_button]:ease-focus [&_button:focus-visible]:underline [&_button:focus-visible]:underline-offset-[3px] hover:[&_button]:underline hover:[&_button]:underline-offset-[3px] [&_button:disabled]:cursor-default [&_button:disabled]:opacity-50 ms-rail mt-7">
        <button
          type="button"
          className="text-action"
          disabled={disabled}
          onClick={() => {
            setDaysDraft({
              source: DEFAULT_PREFERENCES.daysBeforeDue,
              value: String(DEFAULT_PREFERENCES.daysBeforeDue),
            });
            update({
              ...DEFAULT_PREFERENCES,
              locale: settings.locale,
              guidance: settings.guidance,
            });
          }}
        >
          {t('settingsPage.resetSettings')}
        </button>
      </div>
    </PageShell>
  );
}

function validDays(value: string): boolean {
  const number = Number(value);
  return (
    value !== '' &&
    Number.isSafeInteger(number) &&
    number >= 1 &&
    number <= 365_000
  );
}

function syncMessage(
  status: PreferencesState['status'],
  cached: boolean,
): string {
  switch (status) {
    case 'synced':
      return cached
        ? t('settingsPage.syncMessage.saved')
        : t('settingsPage.syncMessage.savedToYourAccountBrowserStorage');
    case 'saving':
      return t('settingsPage.syncMessage.saving');
    case 'local':
      return cached
        ? t('settingsPage.syncMessage.usingBrowserSettingsChangesHavenT')
        : t('settingsPage.syncMessage.changesAreOnlyAvailableInThis');
    case 'unavailable':
      return t('settingsPage.syncMessage.couldnTLoadYourSettingsConnect');
    case 'loading':
      return t('settingsPage.syncMessage.loadingSettings');
  }
}
