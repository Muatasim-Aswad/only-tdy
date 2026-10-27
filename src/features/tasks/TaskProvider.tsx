import { PageShell } from '../../shared/PageShell.tsx';
import { useAuthSession } from '../auth/session.ts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { accountTimezoneQueryOptions } from './data/queries.ts';
import { DateTimezoneContext } from './date-timezone.ts';
import { DEFAULT_TIMEZONE } from './domain/task-dates.ts';
import { subscribeDuePromotion } from './due-promotion.ts';
import { TaskSessionContext } from './task-session.ts';
import { preferencesStore } from './preferences/store.ts';
import { usePreferences } from './preferences/usePreferences.ts';

export function TaskProvider({ children }: { readonly children: ReactNode }) {
  const account = useAuthSession()?.uid;
  const timezone = useQuery(accountTimezoneQueryOptions());
  const client = useQueryClient();
  const preferences = usePreferences();
  const [captureValue, onCaptureChange] = useState('');
  useEffect(() => {
    void preferencesStore.start(account ?? undefined);
    const synchronize = () => {
      void preferencesStore.sync();
    };
    window.addEventListener('online', synchronize);
    window.addEventListener('focus', synchronize);
    return () => {
      window.removeEventListener('online', synchronize);
      window.removeEventListener('focus', synchronize);
      preferencesStore.stop();
    };
  }, [account]);
  const session = useMemo(
    () => ({ captureValue, onCaptureChange }),
    [captureValue],
  );
  useEffect(() => {
    let previous = preferencesStore.getSnapshot().settings;
    const stopSettings = preferencesStore.subscribe(() => {
      const next = preferencesStore.getSnapshot().settings;
      if (
        previous.datedBacklog !== next.datedBacklog ||
        previous.daysBeforeDue !== next.daysBeforeDue
      ) {
        void client.invalidateQueries({ queryKey: ['tasks'] });
      }
      previous = next;
    });
    const stopPromotion = subscribeDuePromotion(() => {
      void client.invalidateQueries({ queryKey: ['task-date-sync'] });
      void client.invalidateQueries({ queryKey: ['tasks'] });
    });
    return () => {
      stopSettings();
      stopPromotion();
    };
  }, [client]);
  return (
    <TaskSessionContext value={session}>
      <DateTimezoneContext value={timezone.data ?? DEFAULT_TIMEZONE}>
        {preferences.status !== 'loading' ? (
          children
        ) : (
          <PageShell>
            <div className="focus-listing mt-0 min-h-30" aria-live="polite">
              Loading…
            </div>
          </PageShell>
        )}
      </DateTimezoneContext>
    </TaskSessionContext>
  );
}
