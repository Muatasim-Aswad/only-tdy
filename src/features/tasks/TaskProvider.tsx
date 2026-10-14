import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { accountTimezoneQueryOptions } from './data/queries.ts';
import { DateTimezoneContext } from './date-timezone.ts';
import { DEFAULT_TIMEZONE } from './domain/task-dates.ts';
import { subscribeDuePromotion } from './due-promotion.ts';
import { TaskSessionContext } from './task-session.ts';

export function TaskProvider({ children }: { readonly children: ReactNode }) {
  const timezone = useQuery(accountTimezoneQueryOptions());
  const client = useQueryClient();
  const [captureValue, onCaptureChange] = useState('');
  const session = useMemo(
    () => ({ captureValue, onCaptureChange }),
    [captureValue],
  );
  useEffect(
    () =>
      subscribeDuePromotion(() => {
        void client.invalidateQueries({ queryKey: ['task-date-sync'] });
        void client.invalidateQueries({ queryKey: ['tasks'] });
      }),
    [client],
  );
  return (
    <TaskSessionContext value={session}>
      <DateTimezoneContext value={timezone.data ?? DEFAULT_TIMEZONE}>
        {children}
      </DateTimezoneContext>
    </TaskSessionContext>
  );
}
