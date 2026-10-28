import { t } from '../messages.ts';
import { appLocale } from '../../../shared/i18n.ts';
import type { Recurrence, Task } from '../contracts.ts';
import { currentDate } from './task-dates.ts';

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function isRepeating(task: Task): boolean {
  return task.recurrence !== undefined || task.recurringParentUid !== undefined;
}

export function defaultRecurrence(
  type: Recurrence['type'],
  dueDate: string,
): Recurrence {
  const date = new Date(`${dueDate || currentDate()}T12:00:00Z`);
  return {
    type,
    interval: 1,
    weekdays: [date.getUTCDay()],
    monthDay: date.getUTCDate(),
    weekOfMonth: Math.min(5, Math.ceil(date.getUTCDate() / 7)),
    completionBased: false,
    endDate: '',
  };
}

export function weekdayName(day: number, short = false): string {
  return new Intl.DateTimeFormat(appLocale(), {
    weekday: short ? 'short' : 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 2 + day)));
}

export function recurrenceLabel(recurrence: Recurrence): string {
  const { type, interval } = recurrence;
  const names = recurrence.weekdays.map((day) => weekdayName(day));
  const days =
    appLocale() === 'en'
      ? names.join(', ')
      : new Intl.ListFormat(appLocale(), { type: 'conjunction' }).format(names);
  const ordinals = [
    'last',
    'first',
    'second',
    'third',
    'fourth',
    'fifth',
  ] as const;
  const ordinal = ordinals[recurrence.weekOfMonth] ?? 'last';
  return t(`recurrence.${type}`, {
    count: interval,
    context: recurrence.completionBased ? 'completion' : undefined,
    days,
    day: recurrence.monthDay,
    week: t(`recurrence.ordinal.${ordinal}`),
    weekday: weekdayName(recurrence.weekdays[0] ?? 1),
  });
}

export function recurringCompletion(
  task: Task,
  completedAt: string,
  dueDate?: string,
): Task {
  return {
    ...task,
    uid: `${task.uid}:completed:${completedAt}`,
    sourceTaskUid: task.uid,
    status: 'done',
    completedAt,
    ...(dueDate === undefined ? {} : { dueDate }),
  };
}
