import type { Task, TaskPriority } from '../contracts.ts';

/** The tag that lifts a task above its equals. Matched case-insensitively. */
export const URGENT_TAG = 'urgent';

const PRIORITY_RANK: Readonly<Record<TaskPriority, number>> = {
  high: 0,
  medium: 1,
  low: 2,
};

function isUrgent(task: Task): boolean {
  return task.tags.some((tag) => tag.toLocaleLowerCase() === URGENT_TAG);
}

/** When the task was made, or last when Tududi did not say. */
function creationTime(task: Task): number {
  if (task.createdAt === undefined) return Number.POSITIVE_INFINITY;
  const at = Date.parse(task.createdAt);
  return Number.isNaN(at) ? Number.POSITIVE_INFINITY : at;
}

/**
 * The order an open list reads in: highest priority first, then `#urgent`
 * within a priority, then the oldest first — so what has waited longest is
 * what the eye reaches first among equals.
 */
export function compareOpenTasks(left: Task, right: Task): number {
  const byPriority =
    PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
  if (byPriority !== 0) return byPriority;

  const byUrgent = Number(isUrgent(right)) - Number(isUrgent(left));
  if (byUrgent !== 0) return byUrgent;

  const leftAt = creationTime(left);
  const rightAt = creationTime(right);
  /* Two unknown times are equal, not NaN apart — the sort is stable, so the
     server's order stands between them. */
  return leftAt === rightAt ? 0 : leftAt < rightAt ? -1 : 1;
}

/** Open tasks in reading order, or the same array when it already is. */
export function sortOpenTasks(tasks: readonly Task[]): readonly Task[] {
  const sorted = [...tasks].sort(compareOpenTasks);
  return sorted.every((task, index) => task === tasks[index]) ? tasks : sorted;
}

/**
 * Open tasks in reading order, then done tasks, which sink. The done group
 * keeps the order it came in, so the list reads as "what is left, most
 * pressing first" followed by "what you have just ticked off, in the order you
 * ticked it".
 *
 * A completed task is not removed from the screen: it keeps its row, struck
 * through, at the bottom. Nothing the person did disappears out from under the
 * pointer that did it.
 */
export function orderTasks(tasks: readonly Task[]): readonly Task[] {
  const open: Task[] = [];
  const done: Task[] = [];
  for (const task of tasks) {
    (task.status === 'done' ? done : open).push(task);
  }
  const ordered = [...sortOpenTasks(open), ...done];
  return ordered.every((task, index) => task === tasks[index])
    ? tasks
    : ordered;
}
