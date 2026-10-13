import type {
  Project,
  SentSearchRequest,
  Task,
  TaskDetail,
  TaskDraft,
  TaskEdit,
  TaskFilter,
  TaskStatus,
} from './contracts.ts';

export interface TududiApi {
  readonly fetchAccountTimezone: () => Promise<string>;
  readonly syncDueTasks: () => Promise<readonly Task[]>;
  readonly fetchTodayTasks: () => Promise<readonly Task[]>;
  readonly fetchBacklogTasks: () => Promise<readonly Task[]>;
  /**
   * Every open task matching a term — the backlog's and Today's alike, told
   * apart by status when they are drawn.
   */
  readonly searchOpenTasks: (
    request: SentSearchRequest,
  ) => Promise<readonly Task[]>;
  /** Completed tasks, newest first, for the history view. */
  readonly fetchDoneTasks: () => Promise<readonly Task[]>;
  readonly fetchAllTasks: () => Promise<readonly Task[]>;
  readonly searchAllTasks: (
    request: SentSearchRequest,
  ) => Promise<readonly Task[]>;
  /** Completed tasks matching a term, newest first where Tududi orders them. */
  readonly searchDoneTasks: (
    request: SentSearchRequest,
  ) => Promise<readonly Task[]>;
  /** How many completed tasks a filter matches, without fetching them. */
  readonly countDoneTasks: (filter: TaskFilter) => Promise<number>;
  readonly fetchProjects: () => Promise<readonly Project[]>;
  readonly createProject: (name: string) => Promise<Project>;
  /** Every tag name the account has used, for the suggestion list. */
  readonly fetchTags: () => Promise<readonly string[]>;
  /** One task in full, for its own page. */
  readonly fetchTask: (uid: string) => Promise<TaskDetail>;
  readonly createTask: (draft: TaskDraft) => Promise<Task>;
  /** The one write a row can make: `done` to tick it, anything else to reopen. */
  readonly setTaskStatus: (uid: string, status: TaskStatus) => Promise<Task>;
  /** Every editable field at once, from the task's own page. */
  readonly updateTask: (
    uid: string,
    edit: TaskEdit,
    previousDueDate?: string,
    previousStatus?: TaskStatus,
  ) => Promise<TaskDetail>;
  readonly deleteTask: (uid: string) => Promise<void>;
  readonly clearCsrfToken: () => void;
}
