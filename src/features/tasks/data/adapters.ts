import type {
  Project,
  Task,
  TaskDetail,
  TaskPriority,
  TaskStatus,
} from '../contracts.ts';
import { DEFAULT_TIMEZONE, hideDate } from '../domain/task-dates.ts';
import { TASK_PAGE_LIMIT } from '../../../config/app.ts';

type JsonRecord = Readonly<Record<string, unknown>>;

const STATUS_BY_NUMBER: Readonly<Record<number, TaskStatus | undefined>> = {
  0: 'not_started',
  1: 'in_progress',
  2: 'done',
  4: 'waiting',
  6: 'planned',
};

const PRIORITY_BY_NUMBER: Readonly<Record<number, TaskPriority | undefined>> = {
  0: 'low',
  1: 'medium',
  2: 'high',
};

export class TududiShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TududiShapeError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(record: JsonRecord, field: string): string {
  const value = record[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new TududiShapeError(
      `Expected Tududi field “${field}” to be a string.`,
    );
  }
  return value;
}

function adaptStatus(value: unknown): TaskStatus {
  if (
    value === 'not_started' ||
    value === 'planned' ||
    value === 'in_progress' ||
    value === 'waiting' ||
    value === 'done'
  ) {
    return value;
  }
  if (typeof value === 'number' && STATUS_BY_NUMBER[value] !== undefined) {
    return STATUS_BY_NUMBER[value];
  }
  throw new TududiShapeError(
    'Expected an only-tdy-supported Tududi task status.',
  );
}

function adaptPriority(value: unknown): TaskPriority {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  if (value === null || value === undefined) {
    return 'low';
  }
  if (typeof value === 'number' && PRIORITY_BY_NUMBER[value] !== undefined) {
    return PRIORITY_BY_NUMBER[value];
  }
  throw new TududiShapeError('Expected a Tududi task priority.');
}

function adaptTags(value: unknown): readonly string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TududiShapeError('Expected Tududi task tags to be an array.');
  }

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const rawTag of value) {
    if (!isRecord(rawTag)) {
      throw new TududiShapeError('Expected each Tududi tag to be an object.');
    }
    const name = requiredString(rawTag, 'name');
    const normalizedName = name.toLocaleLowerCase();
    if (!seen.has(normalizedName)) {
      seen.add(normalizedName);
      tags.push(name);
    }
  }
  return tags;
}

export function adaptTask(value: unknown): Task {
  if (!isRecord(value)) {
    throw new TududiShapeError('Expected a Tududi task object.');
  }

  const project = value.Project;
  let projectName: string | undefined;
  if (project !== undefined && project !== null) {
    if (!isRecord(project)) {
      throw new TududiShapeError('Expected Tududi Project to be an object.');
    }
    projectName = requiredString(project, 'name');
  }

  const completedAt = value.completed_at;
  const createdAt = value.created_at;

  return {
    uid: requiredString(value, 'uid'),
    title:
      typeof value.original_name === 'string' && value.original_name.length > 0
        ? value.original_name
        : requiredString(value, 'name'),
    priority: adaptPriority(value.priority),
    status: adaptStatus(value.status),
    tags: adaptTags(value.tags),
    ...(typeof value.note === 'string' ? { note: value.note } : {}),
    ...(typeof value.due_date === 'string' && value.due_date !== ''
      ? { dueDate: value.due_date }
      : {}),
    ...(typeof value.defer_until === 'string' && value.defer_until !== ''
      ? { deferUntil: value.defer_until }
      : {}),
    ...(projectName === undefined ? {} : { projectName }),
    /* Carried only when Tududi sent one. It is what the day's record is cut
       by, so a malformed or missing value has to read as "no time known"
       rather than as an instant at the epoch. */
    ...(typeof completedAt === 'string' && completedAt.length > 0
      ? { completedAt }
      : {}),
    ...(typeof createdAt === 'string' && createdAt.length > 0
      ? { createdAt }
      : {}),
  };
}

function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new TududiShapeError(
      `Expected Tududi field “${field}” to be a string.`,
    );
  }
  return value;
}

/**
 * A full editable task, with Hide until reduced to the account-local date.
 */
export function adaptTaskDetail(
  value: unknown,
  timezone: string = DEFAULT_TIMEZONE,
): TaskDetail {
  // `adaptTask` has already refused anything that is not a record.
  const task = adaptTask(value);
  const record = value as JsonRecord;
  const deferUntil = optionalString(record.defer_until, 'defer_until');

  return {
    ...task,
    note: optionalString(record.note, 'note'),
    dueDate: optionalString(record.due_date, 'due_date'),
    deferUntil: hideDate(deferUntil, timezone),
    projectUid: optionalString(record.project_uid, 'project_uid'),
  };
}

export function adaptTaskList(value: unknown): readonly Task[] {
  if (!isRecord(value) || !Array.isArray(value.tasks)) {
    throw new TududiShapeError(
      'Expected Tududi task response `{ tasks: [...] }`.',
    );
  }
  // The page cap is applied here as well as sent, so a Tududi that ignores the
  // parameter still cannot hand this screen an unbounded list.
  return value.tasks.slice(0, TASK_PAGE_LIMIT).map(adaptTask);
}

export function adaptBacklogTaskList(value: unknown): readonly Task[] {
  return adaptTaskList(value).filter(
    (task) => task.status === 'not_started' || task.status === 'done',
  );
}

/**
 * The rows of one list inside a universal-search answer.
 *
 * `GET /api/search` takes no status filter at all: it answers with every task
 * whose title or note matches, open and done and archived and cancelled alike.
 * A page asked about its own list, so everything else is dropped here — and
 * dropping it first is also what keeps an archived task, which only-tdy has no
 * name for, from failing the whole list.
 */
function adaptSearchResults(
  value: unknown,
  keeps: (status: unknown) => boolean,
  limit: number = TASK_PAGE_LIMIT,
): readonly Task[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new TududiShapeError(
      'Expected Tududi search response `{ results: [...] }`.',
    );
  }
  return value.results
    .filter(
      (result) =>
        isRecord(result) && result.type === 'Task' && keeps(result.status),
    )
    .slice(0, limit)
    .map(adaptTask);
}

/** Not started, in progress, waiting, or planned — anything still open. */
function isOpen(status: unknown): boolean {
  return (
    status === 0 ||
    status === 1 ||
    status === 4 ||
    status === 6 ||
    status === 'not_started' ||
    status === 'in_progress' ||
    status === 'waiting' ||
    status === 'planned'
  );
}

function isDone(status: unknown): boolean {
  return status === 2 || status === 'done';
}

export function adaptAllTaskList(value: unknown): readonly Task[] {
  if (!isRecord(value) || !Array.isArray(value.tasks)) {
    throw new TududiShapeError(
      'Expected Tududi task response `{ tasks: [...] }`.',
    );
  }
  return value.tasks
    .filter(
      (task) => isRecord(task) && (isOpen(task.status) || isDone(task.status)),
    )
    .map(adaptTask);
}

export function adaptAllSearchList(value: unknown): readonly Task[] {
  return adaptSearchResults(
    value,
    (status) => isOpen(status) || isDone(status),
    Number.POSITIVE_INFINITY,
  );
}

/**
 * The open rows of a search answer. The backlog page's search looks past the
 * backlog into Today too, and splits the two by status when it draws them.
 */
export function adaptOpenSearchList(value: unknown): readonly Task[] {
  return adaptSearchResults(value, isOpen);
}

/**
 * An `active` task list, every open status kept — the backlog page's filtered
 * search, which shows Today's matches under the backlog's own.
 */
export function adaptOpenTaskList(value: unknown): readonly Task[] {
  if (!isRecord(value) || !Array.isArray(value.tasks)) {
    throw new TududiShapeError(
      'Expected Tududi task response `{ tasks: [...] }`.',
    );
  }
  return value.tasks
    .filter((task) => isRecord(task) && isOpen(task.status))
    .slice(0, TASK_PAGE_LIMIT)
    .map(adaptTask);
}

/**
 * How many tasks a paged list says it holds in all, not how many it sent.
 * Tududi reports it as `pagination.total` whenever a limit is asked for; an
 * answer without it falls back to the rows it did send.
 */
export function adaptTaskTotal(value: unknown): number {
  if (!isRecord(value)) {
    throw new TududiShapeError('Expected a Tududi task response object.');
  }
  const pagination = value.pagination;
  if (isRecord(pagination) && typeof pagination.total === 'number') {
    return pagination.total;
  }
  if (Array.isArray(value.tasks)) return value.tasks.length;
  throw new TududiShapeError('Expected Tududi `pagination.total` or `tasks`.');
}

/** The completed rows of a search answer, for the record's own field. */
export function adaptDoneSearchList(value: unknown): readonly Task[] {
  return adaptSearchResults(value, isDone);
}

/**
 * History is completed tasks and nothing else. Tududi answers `status=done`
 * with archived tasks alongside the done ones, and only-tdy has no name for
 * archived, so those records are dropped before adaptation rather than
 * failing the whole list on a status this screen never shows.
 */
export function adaptDoneTaskList(value: unknown): readonly Task[] {
  if (!isRecord(value) || !Array.isArray(value.tasks)) {
    throw new TududiShapeError(
      'Expected Tududi task response `{ tasks: [...] }`.',
    );
  }
  return value.tasks
    .filter((task) => isRecord(task) && isDone(task.status))
    .slice(0, TASK_PAGE_LIMIT)
    .map(adaptTask);
}

export function adaptProjectList(value: unknown): readonly Project[] {
  if (!isRecord(value) || !Array.isArray(value.projects)) {
    throw new TududiShapeError(
      'Expected Tududi project response `{ projects: [...] }`.',
    );
  }
  return value.projects.map(adaptProject);
}

export function adaptProject(value: unknown): Project {
  if (!isRecord(value)) {
    throw new TududiShapeError('Expected a Tududi project object.');
  }
  return {
    uid: requiredString(value, 'uid'),
    name: requiredString(value, 'name'),
  };
}

/**
 * The account's tag names, for the suggestion list.
 *
 * Tududi answers this one in two shapes depending on version — a bare array
 * of tags, or the same array under a `tags` key like every other list — so
 * both are read. Only the name is kept: a tag is its name everywhere in
 * only-tdy, and nothing here addresses one by id.
 *
 * A tag without a usable name is dropped rather than refused. This list only
 * ever feeds suggestions, and one unreadable row is no reason to withhold
 * every other name from someone halfway through typing one.
 */
export function adaptTagList(value: unknown): readonly string[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.tags)
      ? value.tags
      : undefined;

  if (rows === undefined) {
    throw new TududiShapeError(
      'Expected Tududi tag response `[...]` or `{ tags: [...] }`.',
    );
  }

  const names: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const name =
      typeof row === 'string' ? row : isRecord(row) ? row.name : undefined;
    if (typeof name !== 'string' || name === '') continue;

    const normalized = name.toLocaleLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    names.push(name);
  }

  return names;
}
