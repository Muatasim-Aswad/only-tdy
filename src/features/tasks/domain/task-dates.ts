import { dateValue } from './token-language.ts';
import { formattingLocale } from '../../../shared/i18n.ts';
import { t } from '../messages.ts';
import { PublicError } from '../../../shared/PublicError.ts';
import type { TaskEdit, TaskStatus } from '../contracts.ts';

export const DEFAULT_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export interface DateContext {
  readonly now?: Date;
  readonly timezone?: string;
}

export function currentDate({
  now = new Date(),
  timezone = DEFAULT_TIMEZONE,
}: DateContext = {}): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((name) => parts.find((part) => part.type === name)?.value)
    .join('-');
}

export function resolveDate(
  value: string,
  context: DateContext = {},
): string | undefined {
  value = dateValue(value);
  const today = currentDate(context);
  const relative = /^\+(\d+)(?:d|days)?$/i.exec(value);
  if (value.toLowerCase() === 'today') return today;
  if (value.toLowerCase() === 'tomorrow' || relative !== null) {
    const days = relative === null ? 1 : Number(relative[1]);
    if (!Number.isSafeInteger(days) || days > 365_000) return undefined;
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
  const match = /^(\d{1,2})(?:-(\d{1,2}))?(?:-(\d{4}))?$/.exec(value);
  if (match === null) return undefined;
  const [yearNow, monthNow] = today.split('-');
  const year = Number(match[3] ?? yearNow);
  const month = Number(match[2] ?? monthNow);
  const day = Number(match[1]);
  if (year < 1000 || year > 9999) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return undefined;
  return date.toISOString().slice(0, 10);
}

export function displayDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parts = new Intl.DateTimeFormat(formattingLocale(), {
    calendar: 'gregory',
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  return ['day', 'month', 'year']
    .map((type) => parts.find((part) => part.type === type)?.value ?? '')
    .join('-');
}

export function dateAtMidnight(date: string, timezone: string): string | null {
  if (date === '') return null;
  const target = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(target))
    throw new PublicError(t('taskDates.dateAtMidnight.chooseAValidDate'));
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const get = (name: string) =>
      Number(parts.find((part) => part.type === name)?.value);
    const local = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second'),
    );
    const difference = target - local;
    if (difference === 0) return new Date(instant).toISOString();
    instant += difference;
  }
  return new Date(instant).toISOString();
}

export function hideDate(value: string, timezone: string): string {
  if (value === '') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : currentDate({ now: date, timezone });
}

export function isTodayStatus(status: TaskStatus): boolean {
  return (
    status === 'planned' || status === 'in_progress' || status === 'waiting'
  );
}

export function applyDateRules(
  edit: TaskEdit,
  previousDueDate: string | undefined,
  context: DateContext = {},
  previousStatus: TaskStatus = edit.status,
): TaskEdit {
  if (edit.status === 'done') return edit;
  const today = currentDate(context);
  let status = edit.status;
  if (status === 'not_started' && edit.dueDate !== '' && edit.dueDate <= today)
    status = 'planned';
  else if (
    isTodayStatus(status) &&
    isTodayStatus(previousStatus) &&
    previousDueDate !== undefined &&
    edit.dueDate !== previousDueDate &&
    edit.dueDate > today
  )
    status = 'not_started';
  return {
    ...edit,
    status,
    deferUntil: isTodayStatus(status) ? '' : edit.deferUntil,
  };
}

export function validateHideDate(dueDate: string, deferUntil: string): void {
  if (dueDate !== '' && deferUntil !== '' && deferUntil > dueDate) {
    throw new PublicError(
      t('taskDates.validateHideDate.hideUntilCannotBeAfterThe'),
    );
  }
}
