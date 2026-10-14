import type { TaskPriority } from '../contracts.ts';

/** Task feedback, labels and field names. */
export const COPY = {
  loading: 'Loading tasks…',
  empty: 'Nothing waiting. Capture the next thing above.',
  todayClear: 'Today is clear.',
  planFromBacklog: (count?: number) =>
    count === undefined
      ? 'Plan from Backlog'
      : `Plan from Backlog (${String(count)})`,
  offline: 'You’re offline. Reconnect to load and save tasks.',
  loadFailed: 'Tasks couldn’t load.',
  retry: 'Try again',
  addedToBacklog: 'Added to Backlog',
  /* Said beside a `+` name nobody has yet: capturing it creates the project. */
  newProject: 'new project',
  completionFailed: 'Task wasn’t completed. Try again.',
  reopenFailed: 'Task wasn’t reopened. Try again.',
  /* The mark for the page only-tdy opens on, which is always Today. */
  home: 'Today',
  history: 'Completed tasks',
  allTasks: 'All tasks',
  allEmpty: 'No tasks yet.',
  allSearchEmpty: 'No tasks match that.',
  allSearchLabel: 'Search all tasks',
  /* The three dots at the end of the rail, which hold the record and the
     palette. */
  more: 'More',
  historyEmpty: 'Nothing completed yet.',

  /* The field both long lists carry. It asks and answers the same way on each,
     so only the name it gives itself and the nothing it finds differ. */
  searchPlaceholder: '.....',
  searchSubmit: 'Search',
  backlogSearchLabel: 'Search the backlog',
  backlogSearchEmpty: 'Nothing in the backlog matches that.',
  historySearchLabel: 'Search completed tasks',
  historySearchEmpty: 'Nothing completed matches that.',

  /* The backlog's own page. */
  backlog: 'Backlog',
  backlogEmpty: 'Nothing waiting in the backlog.',
  moveToToday: 'Move to Today',
  moveFailed: 'Nothing moved. Try again.',
  movePartlyFailed: 'Some tasks didn’t move. Try again.',
  moveOffline: 'You’re offline. Reconnect to move tasks to Today.',
  sessionExpired: 'Your Tududi session expired.',
  signIn: 'Open Tududi to sign in',

  /* The palette mark says which of the three answers is in force, not which
     one the next press would reach. */
  themeSystem: 'Theme: system',
  themeLight: 'Theme: light',
  themeDark: 'Theme: dark',

  /* The task's own page. */
  taskLoading: 'Loading the task…',
  taskLoadFailed: 'The task couldn’t load.',
  taskMissing: 'That task is gone.',
  backToList: 'Back to the list',
  titleRequired: 'Type a task before saving it.',
  titleLabel: 'Title',
  noteLabel: 'Notes',
  /* The one placeholder the page uses, in both fields that have one: four
     dots that say a line is empty without naming anything to put in it. */
  placeholder: '....',
  save: 'Save',
  saveFailed: 'The task wasn’t saved. Try again.',
  saveOffline: 'You’re offline. Reconnect to save this task.',
  delete: 'Delete',
  deleteConfirm: 'Delete?',
  deleteYes: 'Yes',
  deleteKeep: 'Keep',
  deleteFailed: 'The task wasn’t deleted. Try again.',
  /* The empty choice, said twice: a mark for the eye, and a word for a screen
     reader, which can make nothing of a dash. The word is only the choice —
     the field it belongs to is already named beside it. */
  noValue: '—',
  noValueName: 'None',
  /* What an empty date field says. The platform's own empty text is a format
     to obey and, on a phone, is often nothing at all; this is the shape of a
     date, said once, in the weight the page keeps for a prompt. */
  datePlaceholder: 'dd-mm-yyyy',

  about: 'About',

  /* The guide page, reached only from the three dots. */
  guide: 'Guide',
} as const;

export const PRIORITY_NAME: Readonly<Record<TaskPriority, string>> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
