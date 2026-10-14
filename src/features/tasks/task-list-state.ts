import type { UseQueryResult } from '@tanstack/react-query';

import type {
  SearchRequest,
  Task,
  TaskListState,
  TaskScope,
} from './contracts.ts';
import { TududiApiError } from '../../infra/tududi-client.ts';
import { withCompletedToday } from './domain/done-today.ts';
import { orderTasks } from './domain/task-order.ts';

const NO_TASKS: readonly Task[] = [];

function isUnauthorized(error: unknown): boolean {
  return error instanceof TududiApiError && error.kind === 'unauthorized';
}

/**
 * Today, with the day's finished tasks joined onto the end of it.
 *
 * The screen is Today and nothing else, even once nothing on it is open: the
 * backlog has a page of its own, where tasks can be moved onto Today, and a
 * list that swapped itself for another under the last tick would leave no way
 * to tell which one was showing. A Today with nothing in it is a ready list
 * with no rows — the page says it is clear and points at the backlog.
 *
 * The completed query never gates this. It is the smaller half of the answer
 * and the list is worth showing without it, so a record still loading or one
 * that failed outright is simply a list with no tail — not a spinner, and not
 * an error over a Today that arrived perfectly well.
 */
export function deriveTaskListState(
  sessionExpired: boolean,
  today: UseQueryResult<readonly Task[]>,
  completed: UseQueryResult<readonly Task[]>,
  now: Date = new Date(),
): TaskListState {
  if (
    sessionExpired ||
    isUnauthorized(today.error) ||
    isUnauthorized(completed.error)
  ) {
    return { kind: 'session-expired' };
  }
  if (today.isError) return { kind: 'error' };
  if (!today.isSuccess) return { kind: 'loading' };

  const done = completed.data ?? NO_TASKS;
  return {
    kind: 'ready',
    list: 'today',
    tasks: withCompletedToday(today.data, done, now),
  };
}

/**
 * History is the same states over one query, with two differences: Tududi's
 * newest-first order is kept as it came, and only tasks that are still done
 * are shown — so a row reopened from here leaves the record immediately
 * rather than sitting in it unticked.
 *
 * Two queries feed it and only ever one at a time: the whole record while the
 * field is empty, and a narrowed one while a term is in force. Which is which
 * is decided by the request rather than by whichever happens to hold data, so
 * a stale result from a term that has since been cleared can never be shown as
 * though it were the record. A term that cannot be sent is not an error state:
 * a project name still being looked up is still loading, and one that names no
 * project found nothing, with the reason said above the list.
 */
export function deriveHistoryListState(
  sessionExpired: boolean,
  request: SearchRequest,
  history: UseQueryResult<readonly Task[]>,
  search: UseQueryResult<readonly Task[]>,
  scope: TaskScope = 'completed',
): TaskListState {
  if (request.kind === 'pending') return { kind: 'loading' };
  if (request.kind === 'refused') return { kind: 'empty' };

  const query = request.kind === 'none' ? history : search;

  if (sessionExpired || isUnauthorized(query.error)) {
    return { kind: 'session-expired' };
  }
  if (query.isError) return { kind: 'error' };
  if (!query.isSuccess) return { kind: 'loading' };

  const tasks =
    scope === 'all'
      ? orderTasks(query.data)
      : query.data.filter((task) => task.status === 'done');
  if (tasks.length === 0) return { kind: 'empty' };
  return { kind: 'ready', list: scope === 'all' ? 'all' : 'history', tasks };
}

/**
 * A ready list with only the rows `keep` accepts — the search field's answer
 * while it is still being typed. A list narrowed to nothing is empty, so the
 * page says so instead of drawing an empty ledger.
 */
export function narrowListState(
  state: TaskListState,
  keep: (task: Task) => boolean,
): TaskListState {
  if (state.kind !== 'ready') return state;
  const tasks = state.tasks.filter(keep);
  if (tasks.length === state.tasks.length) return state;
  return tasks.length === 0 ? { kind: 'empty' } : { ...state, tasks };
}
