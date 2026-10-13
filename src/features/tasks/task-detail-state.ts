import type { UseQueryResult } from '@tanstack/react-query';

import type { TaskDetail, TaskDetailState } from './contracts.ts';
import { isNotFound, isUnauthorized } from '../../infra/tududi-client.ts';

/**
 * The same shape as the list states, derived during render from query state
 * rather than stored, with one state the lists have no use for: a task that
 * is not there. Tududi answers 404 for a task that was deleted elsewhere and
 * for a uid that never existed, and both mean the same thing to the person
 * holding the link — so it is a destination, not a failure to retry.
 */
export function deriveTaskDetailState(
  sessionExpired: boolean,
  task: UseQueryResult<TaskDetail>,
): TaskDetailState {
  if (sessionExpired || isUnauthorized(task.error)) {
    return { kind: 'session-expired' };
  }
  if (isNotFound(task.error)) return { kind: 'not-found' };
  if (task.isError) return { kind: 'error' };
  if (!task.isSuccess) return { kind: 'loading' };
  return { kind: 'ready', task: task.data };
}
