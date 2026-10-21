import type { Task } from '../contracts.ts';
import { isRepeating } from './recurrence.ts';
import type { Preferences } from '../preferences/model.ts';
import {
  currentDate,
  DEFAULT_TIMEZONE,
  hideDate,
  type DateContext,
} from './task-dates.ts';

export function visibleBacklogTasks(
  tasks: readonly Task[],
  settings: Preferences,
  context: DateContext = {},
): readonly Task[] {
  const today = currentDate(context);
  const threshold = new Date(`${today}T12:00:00Z`);
  threshold.setUTCDate(
    threshold.getUTCDate() +
      (settings.datedBacklog === 'before' ? settings.daysBeforeDue : 0),
  );
  const through = threshold.toISOString().slice(0, 10);
  return tasks.filter((task) => {
    if (isRepeating(task)) return false;
    if (task.status !== 'not_started') return true;
    const explicit = hideDate(
      task.deferUntil ?? '',
      context.timezone ?? DEFAULT_TIMEZONE,
    );
    if (explicit !== '') return explicit <= today;
    return (
      settings.datedBacklog === 'always' ||
      !task.dueDate ||
      task.dueDate.slice(0, 10) <= through
    );
  });
}
