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

const PROMOTION_HELP =
  'Automatically moves due and overdue tasks when the task lists refresh. Due-date rules still apply when adding or saving tasks.';
const BACKLOG_HELP =
  'Hidden tasks remain available in All. A task’s Hide until date takes precedence. This setting does not move tasks to Today.';

export function SettingsPage() {
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
          label="Back"
          href={backHref}
          onNavigate={(event) => {
            handleLinkNavigation(event, backHref);
          }}
        />
        <span
          className="focus-head__action flex items-center justify-end min-w-0 -mr-2 focus-settings__save-state mr-0 text-muted text-meta"
          role="status"
        >
          {settings.datedBacklog === 'before' && daysError
            ? 'Not saved'
            : status === 'synced'
              ? 'Saved'
              : status === 'saving'
                ? 'Saving…'
                : status === 'loading'
                  ? 'Loading…'
                  : 'Not synced'}
        </span>
      </header>
      {status === 'local' || status === 'unavailable' || !cached ? (
        <div className="focus-settings__sync-error [&_p]:m-0 [&_button]:min-h-11 [&_button]:text-accent [&_button]:cursor-pointer [&_button:focus-visible]:text-accent hover:[&_button]:text-accent ml-rail text-muted text-meta">
          <p>{syncMessage(status, cached)}</p>
          {status === 'local' || status === 'unavailable' ? (
            <button
              type="button"
              className="text-action"
              onClick={() => {
                void preferencesStore.sync();
              }}
            >
              Retry sync
            </button>
          ) : null}
        </div>
      ) : null}
      <section
        className="focus-settings__section ml-rail mt-7 [&+section]:mt-0"
        aria-label="Appearance"
      >
        <div className="focus-settings__field min-w-0 m-0 py-3 px-0 border-0 focus-settings__field--stack flex flex-col items-stretch gap-1">
          <label
            htmlFor="settings-theme"
            className="flex items-center min-h-11 text-muted text-meta"
          >
            Theme
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
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </div>
      </section>
      <section
        className="focus-settings__section ml-rail mt-7 [&+section]:mt-0"
        aria-label="Planning"
      >
        <div className="focus-settings__field min-w-0 m-0 py-3 px-0 border-0 border-t border-line">
          <div className="focus-settings__field--stack flex flex-col items-stretch gap-1">
            <div className="focus-settings__label flex items-center gap-1 min-h-11 text-muted">
              <label htmlFor="settings-promotion" className="text-meta">
                Move due tasks to Today
              </label>
              <HelpTip
                label="About moving due tasks to Today"
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
              <option value="auto">Automatically</option>
              <option value="manual">Manually</option>
            </Select>
          </div>
        </div>
        <div className="focus-settings__field min-w-0 m-0 py-3 px-0 border-0 border-t border-line">
          <div className="focus-settings__field--stack flex flex-col items-stretch gap-1">
            <div className="focus-settings__label flex items-center gap-1 min-h-11 text-muted">
              <label htmlFor="settings-dated" className="text-meta">
                Show dated tasks in Backlog
              </label>
              <HelpTip
                label="About dated tasks in Backlog"
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
                  aria-label="Days before due"
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
                <option value="always">Always</option>
                <option value="before">
                  {settings.datedBacklog === 'before'
                    ? 'days before due'
                    : 'N days before due'}
                </option>
                <option value="due">On the due date</option>
              </Select>
            </div>
            {settings.datedBacklog === 'before' && daysError ? (
              <p
                id="settings-days-error"
                className="focus-settings__days-error mt-1 mr-0 mb-0 ml-0 text-priority-high text-meta"
              >
                Enter a whole number from 1 to 365000.
              </p>
            ) : null}
          </div>
        </div>
      </section>
      <div className="focus-settings__reset [&_button]:min-h-11 [&_button]:text-priority-high [&_button]:cursor-pointer [&_button]:transition-[color] [&_button]:duration-120 [&_button]:ease-focus [&_button:focus-visible]:underline [&_button:focus-visible]:underline-offset-[3px] hover:[&_button]:underline hover:[&_button]:underline-offset-[3px] [&_button:disabled]:cursor-default [&_button:disabled]:opacity-50 ml-rail mt-7">
        <button
          type="button"
          className="text-action"
          disabled={disabled}
          onClick={() => {
            setDaysDraft({
              source: DEFAULT_PREFERENCES.daysBeforeDue,
              value: String(DEFAULT_PREFERENCES.daysBeforeDue),
            });
            update(DEFAULT_PREFERENCES);
          }}
        >
          Reset settings
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
        ? 'Saved.'
        : 'Saved to your account. Browser storage is unavailable.';
    case 'saving':
      return 'Saving…';
    case 'local':
      return cached
        ? 'Using browser settings. Changes haven’t synced.'
        : 'Changes are only available in this session. Sync failed and browser storage is unavailable.';
    case 'unavailable':
      return 'Couldn’t load your settings. Connect to Tududi and try again.';
    case 'loading':
      return 'Loading settings…';
  }
}
