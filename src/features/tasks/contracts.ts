/**
 * Shared contracts for only-tdy.
 *
 * Fields only-tdy displays, edits, or uses for list rules. Raw Tududi payloads
 * stay inside the data layer.
 */

/** Priority as only-tdy names it. Quick entry writes !1/!2/!3; rows never show either spelling. */
export type TaskPriority = 'low' | 'medium' | 'high';

/** The Tududi statuses only-tdy reads or writes. */
export type TaskStatus =
  'not_started' | 'planned' | 'in_progress' | 'waiting' | 'done';

export interface Recurrence {
  readonly type:
    'daily' | 'weekly' | 'monthly' | 'monthly_weekday' | 'monthly_last_day';
  readonly interval: number;
  readonly weekdays: readonly number[];
  readonly monthDay: number;
  readonly weekOfMonth: number;
  readonly completionBased: boolean;
  readonly endDate: string;
}

/** A task as rendered in a row, with the dates used for list rules. */
export interface Task {
  /** Tududi's stable identifier, used for completion and cache keys. */
  readonly uid: string;
  readonly recurrence?: Recurrence;
  readonly recurringParentUid?: string;
  /** A completed occurrence opens its live task, but cannot reopen the series. */
  readonly sourceTaskUid?: string;
  /** The saved title, with quick-entry tokens already removed. */
  readonly title: string;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly note?: string;
  readonly dueDate?: string;
  readonly deferUntil?: string;
  /** Project name for the metadata line; absent when the task has no project. */
  readonly projectName?: string;
  /** Tag names in Tududi's order, already deduplicated. */
  readonly tags: readonly string[];
  /**
   * When Tududi recorded the task as finished, as the ISO instant it sent.
   * Absent on an open task, and absent on a task only-tdy has only just ticked —
   * the answer to a write does not always carry it, and the row is already
   * where it belongs by then.
   */
  readonly completedAt?: string;
  /**
   * When Tududi created the task, as the ISO instant it sent. It is the last
   * word in the open lists' order, so an absent or unreadable one sorts as
   * the newest rather than failing the row.
   */
  readonly createdAt?: string;
}

/**
 * A task with everything its own page can edit, including its project uid.
 *
 * Absent values are empty strings rather than `undefined`, because every one
 * of them is bound straight to a text, date, or select control, and a control
 * that switches between undefined and a string is an uncontrolled one.
 */
export interface TaskDetail extends Task {
  /** Tududi's `note`: the body of the task. */
  readonly note: string;
  /** Date only, `YYYY-MM-DD`, in the Tududi account's timezone. */
  readonly dueDate: string;
  /** Date only, `YYYY-MM-DD`, in the account timezone. */
  readonly deferUntil: string;
  /** The project's uid, which is what a write has to send. */
  readonly projectUid: string;
}

/** Editable fields for one save. Empty values clear server values; unchanged
    due dates are omitted from the PATCH to preserve their time. */
export interface TaskEdit {
  readonly recurrence?: Recurrence | null;
  readonly title: string;
  readonly note: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  /** Empty clears the project. */
  readonly projectUid: string;
  readonly newProjectName?: string;
  /** Empty clears the date. */
  readonly dueDate: string;
  /** Empty clears the defer-until. */
  readonly deferUntil: string;
  /** Empty clears every tag. */
  readonly tags: readonly string[];
}

/** A project, fetched only while quick entry contains a project token. */
export interface Project {
  readonly uid: string;
  readonly name: string;
}

/** Which list the screen is showing. only-tdy shows one at a time, never both. */
export type TaskListKind = 'today' | 'backlog' | 'history' | 'all';

export type TaskScope = 'completed' | 'all';

/** The main task-list pages, each with add and search modes. */
export type FocusView = 'tasks' | 'history' | 'all' | 'repeating';

/**
 * The three pages the marks at the foot of the screen lead to. `tasks` is
 * home, and it has a mark of its own at the head of the rail; pressing the lit
 * mark of either other page also returns there, which is what makes those two
 * read as toggles rather than as a tab bar.
 */
export type FocusDestination =
  'tasks' | 'backlog' | 'history' | 'all' | 'guide' | 'version' | 'repeating';

/** Lists searched through Tududi; Today searches its displayed tasks locally. */
export type SearchList = 'backlog' | 'history' | 'all';

/**
 * What a search field was asking for, once it has been read.
 *
 * only-tdy asks Tududi only what Tududi can actually answer, so the four terms
 * are exactly the four server-side operations that exist: one exact tag name,
 * one project, one priority, or a substring of a task's title or note.
 * Nothing combines, because no endpoint combines them.
 */
export type SearchTerm =
  | { readonly kind: 'none' }
  | { readonly kind: 'tag'; readonly name: string }
  | { readonly kind: 'project'; readonly name: string }
  /** What followed `!`, as typed; only `1`–`3` resolve. */
  | { readonly kind: 'priority'; readonly value: string }
  | { readonly kind: 'text'; readonly query: string };

/**
 * A term with everything a request needs, or the reason there is no request.
 *
 * Only a project can be `pending`: its name has to become a uid before it can
 * be sent, and Tududi ignores a project filter it does not recognise rather
 * than refusing it — so an unresolved name has to stop here instead of
 * quietly listing the whole list as if it had matched. A priority other than
 * `!1`–`!3` is `refused` for the same reason.
 */
export type SearchRequest =
  | { readonly kind: 'none' }
  | { readonly kind: 'tag'; readonly name: string }
  | { readonly kind: 'project'; readonly projectUid: string }
  | { readonly kind: 'priority'; readonly priority: TaskPriority }
  | { readonly kind: 'text'; readonly query: string }
  | { readonly kind: 'pending' }
  | { readonly kind: 'refused'; readonly message: string };

/** A request that can actually be sent. */
export type SentSearchRequest = Extract<
  SearchRequest,
  { readonly kind: 'tag' | 'project' | 'priority' | 'text' }
>;

/** A filter Tududi's task list applies itself — every term but a phrase. */
export type TaskFilter = Extract<
  SentSearchRequest,
  { readonly kind: 'tag' | 'project' | 'priority' }
>;

/**
 * How many finished tasks a backlog search also matched. `capped` when the
 * count is only a lower bound — a phrase search is answered a page at a time.
 */
export interface DoneCount {
  readonly count: number;
  readonly capped: boolean;
}

/** A parsed quick-entry line, ready to become a create mutation. */
export interface TaskDraft {
  readonly recurrence?: Recurrence;
  readonly title: string;
  readonly priority: TaskPriority;
  /** `planned` with /today or a due/overdue date, otherwise `not_started`. */
  readonly status: Extract<TaskStatus, 'planned' | 'not_started'>;
  readonly tags: readonly string[];
  readonly projectUid?: string;
  /** A `+` name no project has yet: the project is created before the task. */
  readonly newProjectName?: string;
  readonly dueDate?: string;
  readonly deferUntil?: string;
  /** What `*` named, absent when the line had no note in it. */
  readonly note?: string;
}

/** Why quick entry refused a line. The raw input is always preserved. */
export type TaskDraftErrorKind =
  | 'empty-title'
  | 'conflicting-priority'
  | 'unknown-priority'
  | 'unknown-command'
  | 'invalid-date'
  | 'multiple-dates'
  | 'multiple-projects'
  | 'multiple-notes'
  | 'ambiguous-project';

export interface TaskDraftError {
  readonly kind: TaskDraftErrorKind;
  /** Message shown below the capture rule, in interface voice. */
  readonly message: string;
}

/** Result of parsing a quick-entry line. */
export type TaskDraftResult =
  | { readonly ok: true; readonly draft: TaskDraft; readonly repeating?: true }
  | { readonly ok: false; readonly error: TaskDraftError };

/**
 * What the list area is showing. Derived during render from query state, never
 * stored in an effect, and deliberately distinct from `ready` with zero tasks so
 * the screen can hold its space while Backlog resolves.
 */
export type TaskListState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready';
      readonly list: TaskListKind;
      readonly tasks: readonly Task[];
    }
  | { readonly kind: 'empty' }
  | { readonly kind: 'error' }
  | { readonly kind: 'session-expired' };

/** Floating capture feedback. */
export type CaptureFeedback =
  | { readonly kind: 'none' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'added-to-backlog'; readonly uid: string }
  | { readonly kind: 'offline' };

/**
 * What the task page is showing. `not-found` is its own state rather than an
 * error: a task that has been deleted elsewhere is an ordinary outcome, and
 * the way out of it is a list, not a retry.
 */
export type TaskDetailState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly task: TaskDetail }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error' }
  | { readonly kind: 'session-expired' };

/** Floating feedback from the task editor. */
export type SaveFeedback =
  | { readonly kind: 'none' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'offline' };
