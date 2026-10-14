/**
 * Stable fixtures for the visual acceptance matrix.
 *
 * These are only-tdy domain objects, not Tududi payloads: the component tests
 * render them directly, and the browser suite can serve the equivalent
 * responses through MSW so no production-only route or query parameter has to
 * exist for a screenshot to be taken.
 *
 * Titles and names are deliberately fixed so a screenshot diff means a visual
 * change and nothing else.
 */

import type { CaptureFeedback, Task, TaskListState } from '../../contracts.ts';

import { COPY } from '../copy.ts';
import type { FocusScreenProps } from '../FocusScreen.tsx';
import type { TaskRowMotion } from '../TaskRow.tsx';

export const SHORT_TASK: Task = {
  uid: 'task-short',
  title: 'Put bins out',
  priority: 'low',
  status: 'planned',
  tags: [],
};

export const PROJECT_TASK: Task = {
  uid: 'task-project',
  title: 'Send the invoice',
  priority: 'high',
  status: 'in_progress',
  projectName: 'Work',
  tags: ['finance'],
};

export const MEDIUM_TASK: Task = {
  uid: 'task-medium',
  title: 'Book the appointment',
  priority: 'medium',
  status: 'planned',
  tags: [],
};

export const WAITING_TASK: Task = {
  uid: 'task-waiting',
  title: 'Chase the surveyor for the boundary drawing',
  priority: 'low',
  status: 'waiting',
  projectName: 'House',
  tags: [],
};

/** Long enough to wrap at every reviewed width, including 1440px. */
export const WRAPPING_TASK: Task = {
  uid: 'task-wrapping',
  title:
    'Read the tenancy agreement end to end and write down every date that needs a reminder before the renewal window closes',
  priority: 'low',
  status: 'planned',
  tags: [],
};

/** Exercises the two-tag ceiling and the overflow count. */
export const MANY_TAGS_TASK: Task = {
  uid: 'task-many-tags',
  title: 'Plan the spring trip',
  priority: 'medium',
  status: 'planned',
  projectName: 'Travel',
  tags: ['flights', 'budget', 'visas', 'packing'],
};

/** Already ticked off: it keeps its row and sorts below everything open. */
export const DONE_TASK: Task = {
  uid: 'task-done',
  title: 'Send the invoice',
  priority: 'high',
  status: 'done',
  projectName: 'Work',
  tags: ['finance'],
};

export const BACKLOG_TASK: Task = {
  uid: 'task-backlog',
  title: 'Replace the hallway bulb',
  priority: 'low',
  status: 'not_started',
  tags: [],
};

export const TODAY_TASKS: readonly Task[] = [
  PROJECT_TASK,
  MEDIUM_TASK,
  WRAPPING_TASK,
  SHORT_TASK,
];

/** What Today looks like once something on it has been ticked off. */
export const TODAY_WITH_DONE_TASKS: readonly Task[] = [
  MEDIUM_TASK,
  WRAPPING_TASK,
  SHORT_TASK,
  DONE_TASK,
];

export const BACKLOG_TASKS: readonly Task[] = [
  BACKLOG_TASK,
  MANY_TAGS_TASK,
  WAITING_TASK,
];

/** The record, newest first, exactly as Tududi returns it. */
export const HISTORY_TASKS: readonly Task[] = [
  DONE_TASK,
  { ...BACKLOG_TASK, uid: 'task-done-bulb', status: 'done' },
  { ...MEDIUM_TASK, uid: 'task-done-appointment', status: 'done' },
];

export const LIST_STATES = {
  loading: { kind: 'loading' },
  today: { kind: 'ready', list: 'today', tasks: TODAY_TASKS },
  todayWithDone: {
    kind: 'ready',
    list: 'today',
    tasks: TODAY_WITH_DONE_TASKS,
  },
  todayClear: { kind: 'ready', list: 'today', tasks: [] },
  backlog: { kind: 'ready', list: 'backlog', tasks: BACKLOG_TASKS },
  history: { kind: 'ready', list: 'history', tasks: HISTORY_TASKS },
  empty: { kind: 'empty' },
  error: { kind: 'error' },
  sessionExpired: { kind: 'session-expired' },
} as const satisfies Readonly<Record<string, TaskListState>>;

export const FEEDBACK = {
  none: { kind: 'none' },
  addedToBacklog: { kind: 'added-to-backlog', uid: 'task-created' },
  offline: { kind: 'offline' },
  unknownProject: {
    kind: 'error',
    message: 'No project matches +Hous. Check the name in Tududi.',
  },
  emptyTitle: { kind: 'error', message: 'Type a task before adding it.' },
} as const satisfies Readonly<Record<string, CaptureFeedback>>;

/** The props a scenario fixes; the caller still supplies the callbacks. */
export type FocusScreenScenario = Omit<
  FocusScreenProps,
  | 'onCaptureChange'
  | 'onCaptureSubmit'
  | 'onSearchChange'
  | 'onSearchSubmit'
  | 'onToggle'
  | 'onNavigate'
  | 'onRetry'
>;

const RESTORING: Readonly<Record<string, TaskRowMotion>> = {
  [PROJECT_TASK.uid]: 'restoring',
};

const INSERTED: Readonly<Record<string, TaskRowMotion>> = {
  [SHORT_TASK.uid]: 'inserted',
};

/**
 * One entry per row of the visual acceptance matrix. The key is stable and is
 * meant to be used as the screenshot name.
 */
export const SCENARIOS = {
  'today-populated': {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.today,
  },
  'today-capture-typed': {
    searchValue: '',
    captureValue: 'Call the dentist #health +Admin !2',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.today,
  },
  'today-validation-error': {
    searchValue: '',
    captureValue: 'Call the dentist +Hous',
    feedback: FEEDBACK.unknownProject,
    listState: LIST_STATES.today,
  },
  'today-task-inserted': {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.today,
    rowMotion: INSERTED,
  },
  'today-task-done': {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.todayWithDone,
  },
  'today-completion-rollback': {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.today,
    rowMotion: RESTORING,
    rowErrors: { [PROJECT_TASK.uid]: COPY.completionFailed },
  },
  history: {
    view: 'history',
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.history,
  },
  'history-empty': {
    view: 'history',
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.empty,
  },
  'today-clear': {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.todayClear,
    todayClear: { backlogCount: BACKLOG_TASKS.length },
  },
  'backlog-hidden-success': {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.addedToBacklog,
    listState: LIST_STATES.today,
  },
  loading: {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.loading,
  },
  empty: {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.empty,
  },
  offline: {
    searchValue: '',
    captureValue: 'Book the MOT',
    feedback: FEEDBACK.offline,
    listState: LIST_STATES.today,
    disabled: true,
  },
  'load-failed': {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.error,
  },
  'session-expired': {
    searchValue: '',
    captureValue: '',
    feedback: FEEDBACK.none,
    listState: LIST_STATES.sessionExpired,
  },
} as const satisfies Readonly<Record<string, FocusScreenScenario>>;

export type ScenarioName = keyof typeof SCENARIOS;

/** The four widths the matrix is reviewed at, in both system schemes. */
export const REVIEW_WIDTHS = [320, 390, 768, 1440] as const;
