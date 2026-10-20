import type { Task, TaskDetail, TaskDraft } from '../../contracts.ts';

export const rawTodayTask = {
  id: 11,
  uid: 'task-today',
  name: 'Write status update',
  original_name: 'Write status update',
  status: 6,
  priority: 1,
  tags: [{ id: 4, uid: 'tag-work', name: 'Work' }],
  Project: { id: 7, uid: 'project-work', name: 'Work' },
  note: 'Task note',
};

export const rawBacklogTask = {
  ...rawTodayTask,
  id: 12,
  uid: 'task-backlog',
  name: 'Book dentist',
  original_name: 'Book dentist',
  status: 0,
  priority: 0,
  tags: [],
  Project: null,
};

export const todayTask: Task = {
  uid: 'task-today',
  title: 'Write status update',
  note: 'Task note',
  status: 'planned',
  priority: 'medium',
  tags: ['Work'],
  projectName: 'Work',
};

export const backlogTask: Task = {
  uid: 'task-backlog',
  title: 'Book dentist',
  note: 'Task note',
  status: 'not_started',
  priority: 'low',
  tags: [],
};

export const backlogDraft: TaskDraft = {
  title: 'Book dentist',
  status: 'not_started',
  priority: 'low',
  tags: [],
};

/**
 * One task as `GET /api/task/:uid` returns it: the row's fields plus the four
 * only its own page shows.
 *
 * `defer_until` is left unset here. Tududi sends it as an absolute instant
 * and the control holds an account-local date. The timezone conversion is
 * checked separately.
 */
export const rawTaskDetail = {
  ...rawTodayTask,
  note: 'Attach the timesheet.',
  due_date: '2026-10-01',
  due_time: null,
  defer_until: null,
  project_uid: 'project-work',
};

export const taskDetail: TaskDetail = {
  ...todayTask,
  note: 'Attach the timesheet.',
  dueDate: '2026-10-01',
  deferUntil: '',
  projectUid: 'project-work',
};
