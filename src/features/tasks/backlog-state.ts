import type { UseQueryResult } from '@tanstack/react-query';

import type { SearchRequest, Task, TaskListState } from './contracts.ts';
import { TududiApiError } from '../../infra/tududi-client.ts';
import { orderTasks, sortOpenTasks } from './domain/task-order.ts';

function isUnauthorized(error: unknown): boolean {
  return error instanceof TududiApiError && error.kind === 'unauthorized';
}

/**
 * What the backlog page's list is showing.
 *
 * Two queries feed it and only ever one at a time: the whole backlog while the
 * field is empty, and a narrowed one while a term is in force. Which is which
 * is decided by the request rather than by whichever happens to hold data, so
 * a stale result from a term that has since been cleared can never be shown as
 * though it were the backlog.
 *
 * A term that cannot be sent — a project name still being looked up, or one
 * that names no project — is not an error state. The first is still loading
 * and the second found nothing; the reason it found nothing is said on the
 * line above the list, where the question was asked.
 */
export function deriveBacklogListState(
  sessionExpired: boolean,
  request: SearchRequest,
  backlog: UseQueryResult<readonly Task[]>,
  search: UseQueryResult<readonly Task[]>,
): TaskListState {
  if (request.kind === 'pending') return { kind: 'loading' };
  if (request.kind === 'refused') return { kind: 'empty' };

  const query = request.kind === 'none' ? backlog : search;

  if (sessionExpired || isUnauthorized(query.error)) {
    return { kind: 'session-expired' };
  }
  if (query.isError) return { kind: 'error' };
  if (!query.isSuccess) return { kind: 'loading' };
  if (query.data.length === 0) return { kind: 'empty' };

  return { kind: 'ready', list: 'backlog', tasks: orderTasks(query.data) };
}

/**
 * The backlog list with the chosen rows lifted to the top, in the order the
 * list already had them.
 *
 * A backlog is long and a search narrows it, so the tasks picked for today can
 * end up scattered down a screen or scrolled off it entirely — and the one
 * thing worth seeing before pressing Move is exactly which ones are going.
 * Lifting them collects that answer at the top of the list, next to the count
 * that says how many there are.
 *
 * Both halves keep the list's own order rather than the order they were
 * picked in, so taking a choice back puts its row where it would have been if
 * it had never been made.
 */
export function orderBySelection(
  tasks: readonly Task[],
  selectedUids: ReadonlySet<string>,
): readonly Task[] {
  if (selectedUids.size === 0) return tasks;

  const chosen = tasks.filter((task) => selectedUids.has(task.uid));
  if (chosen.length === 0 || chosen.length === tasks.length) return tasks;

  return [...chosen, ...tasks.filter((task) => !selectedUids.has(task.uid))];
}

const NO_TASKS: readonly Task[] = [];

/* What Tududi's Today holds: planned, and the two open statuses beyond it. */
function isOnToday(task: Task): boolean {
  return (
    task.status === 'planned' ||
    task.status === 'in_progress' ||
    task.status === 'waiting'
  );
}

/**
 * A backlog search split into the backlog's own matches and Today's.
 *
 * The backlog page's field searches everything open, so the answer can hold
 * tasks already on Today. Those are shown under the backlog's rows as a group
 * of their own — there is nothing to choose them for — and the backlog's list
 * is what is left. Only a search can hold Today's tasks at all: the unfiltered
 * backlog is asked for without them.
 */
export function splitBacklogSearch(state: TaskListState): {
  readonly backlog: TaskListState;
  readonly today: readonly Task[];
} {
  if (state.kind !== 'ready') return { backlog: state, today: NO_TASKS };
  const today = state.tasks.filter(isOnToday);
  if (today.length === 0) return { backlog: state, today: NO_TASKS };

  const rest = state.tasks.filter((task) => !isOnToday(task));
  return {
    backlog: rest.length === 0 ? { kind: 'empty' } : { ...state, tasks: rest },
    today: sortOpenTasks(today),
  };
}
