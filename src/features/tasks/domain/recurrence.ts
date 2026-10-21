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

export function recurrenceLabel(recurrence: Recurrence): string {
  const { type, interval } = recurrence;
  const unit = type === 'daily' ? 'day' : type === 'weekly' ? 'week' : 'month';
  const every =
    interval === 1 ? `Every ${unit}` : `Every ${String(interval)} ${unit}s`;
  const when =
    type === 'weekly'
      ? recurrence.weekdays.map((day) => WEEKDAYS[day]).join(', ')
      : type === 'monthly'
        ? `day ${String(recurrence.monthDay)}`
        : type === 'monthly_last_day'
          ? 'the last day'
          : type === 'monthly_weekday'
            ? `${['', 'first', 'second', 'third', 'fourth', 'fifth'][recurrence.weekOfMonth] ?? 'last'} ${WEEKDAYS[recurrence.weekdays[0] ?? 0] ?? 'Monday'}`
            : '';
  return `${every}${when ? ` on ${when}` : ''}${recurrence.completionBased ? ' after completion' : ''}`;
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
