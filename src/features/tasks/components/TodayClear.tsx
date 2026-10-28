import { t } from '../messages.ts';
import type { MouseEvent } from 'react';

import { routePath } from '../../../config/routes.ts';

export interface TodayClearProps {
  /** How many tasks wait in the backlog, once known. */
  readonly backlogCount?: number | undefined;
  readonly onNavigate?:
    ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined;
}

/**
 * Said above Today once nothing on it is open. Today stays Today; the way to
 * fill it is the backlog's page, where tasks are moved onto it. A backlog
 * known to be empty has no way to offer, so the line says so instead.
 */
export function TodayClear({ backlogCount, onNavigate }: TodayClearProps) {
  return (
    <p className="focus-state ps-rail py-4 text-muted text-task" role="status">
      {t('copy.todayClear')}{' '}
      {backlogCount === 0 ? (
        t('copy.backlogEmpty')
      ) : (
        <a
          className="focus-state__action inline-block py-3 -my-3 focus-visible:underline focus-visible:underline-offset-[3px] text-accent no-underline cursor-pointer"
          href={routePath({ kind: 'backlog' })}
          onClick={onNavigate}
        >
          {backlogCount === undefined
            ? t('copy.planFromBacklog')
            : t('copy.planFromBacklogCount', { count: backlogCount })}
        </a>
      )}
    </p>
  );
}
