import type { Task, TaskFilter } from '../contracts.ts';
import { TASK_PAGE_LIMIT } from '../../../config/app.ts';
import {
  adaptAllSearchList,
  adaptAllTaskList,
  adaptBacklogTaskList,
  adaptDoneSearchList,
  adaptDoneTaskList,
  adaptOpenSearchList,
  adaptOpenTaskList,
  adaptProject,
  adaptProjectList,
  adaptTagList,
  adaptTask,
  adaptTaskDetail,
  adaptTaskList,
  adaptTaskTotal,
  TududiShapeError,
} from './adapters.ts';

import {
  applyDateRules,
  dateAtMidnight,
  isTodayStatus,
  validateHideDate,
} from '../domain/task-dates.ts';
import {
  createTududiClient,
  type Fetch,
  type TududiClient,
} from '../../../infra/tududi-client.ts';
import type { TududiApi } from '../api-contract.ts';
import { visibleBacklogTasks } from '../domain/backlog-visibility.ts';
import { preferencesStore } from '../preferences/store.ts';

/**
 * Every backlog request starts here: open tasks, capped at the page limit. The
 * filters below append to it, so a filtered backlog is the same list narrowed
 * rather than a different question asked.
 */
function backlogPath(): string {
  return `/api/tasks?type=all&status=active&limit=${String(TASK_PAGE_LIMIT)}`;
}

/**
 * The same for the record: completed tasks, newest first, capped the same way.
 * Tududi's ordering is part of the request rather than something only-tdy redoes,
 * so a narrowed record still reads newest first.
 */
function donePath(): string {
  return `/api/tasks?type=all&status=done&order_by=completed_at:desc&limit=${String(TASK_PAGE_LIMIT)}`;
}

function allPath(): string {
  return `/api/tasks?type=all&status=all&order_by=created_at:desc&limit=${String(TASK_PAGE_LIMIT)}`;
}

/**
 * The one text search Tududi has. It is the universal endpoint, so it is
 * narrowed to tasks, to whole tasks rather than subtasks, and to the same page
 * cap as every other list; `q` matches a task's name or its note. It takes no
 * status filter, so which rows a page keeps is decided by its adapter.
 */
/** The query string a filter adds to a task list request. */
function filterParam(filter: TaskFilter): string {
  switch (filter.kind) {
    case 'tag':
      return `&tag=${encodeURIComponent(filter.name)}`;
    case 'project':
      return `&project_uid=${encodeURIComponent(filter.projectUid)}`;
    case 'priority':
      return `&priority=${filter.priority}`;
  }
}

/**
 * The record's count: the same question as `donePath` asked for one row, so
 * Tududi pages it in the database and answers with the total alongside.
 */
function doneCountPath(filter: TaskFilter): string {
  return `/api/tasks?type=all&status=done&limit=1${filterParam(filter)}`;
}

function searchPath(query: string): string {
  return `/api/search?q=${encodeURIComponent(query)}&filters=Task&excludeSubtasks=true&limit=${String(TASK_PAGE_LIMIT)}`;
}

export function createTududiApi(
  fetcher?: Fetch,
  {
    transport = createTududiClient(fetcher),
    now = () => new Date(),
  }: { readonly transport?: TududiClient; readonly now?: () => Date } = {},
): TududiApi {
  const { request, mutate, clearCsrfToken } = transport;

  let timezoneRequest: Promise<string> | undefined;
  const fetchAccountTimezone = (): Promise<string> => {
    timezoneRequest ??= request('/api/profile')
      .then((payload) => {
        if (
          typeof payload !== 'object' ||
          payload === null ||
          !('timezone' in payload) ||
          typeof payload.timezone !== 'string'
        ) {
          throw new Error('Tududi returned no account timezone.');
        }
        new Intl.DateTimeFormat('en', { timeZone: payload.timezone }).format();
        return payload.timezone;
      })
      .catch((error: unknown) => {
        timezoneRequest = undefined;
        throw error;
      });
    return timezoneRequest;
  };
  const visibleBacklog = async (
    tasks: readonly Task[],
  ): Promise<readonly Task[]> => {
    const timezone = await fetchAccountTimezone();
    return visibleBacklogTasks(tasks, preferencesStore.getSnapshot().settings, {
      timezone,
      now: now(),
    });
  };

  const readAllPages = async (
    path: string,
    adapt: (payload: unknown) => readonly Task[],
    rowsKey: 'tasks' | 'results',
  ): Promise<readonly Task[]> => {
    const found = new Map<string, Task>();
    let offset = 0;
    let previousPage = '';
    for (;;) {
      const payload = await request(`${path}&offset=${String(offset)}`);
      const tasks = adapt(payload);
      const body = payload as Record<string, unknown>;
      const rows = body[rowsKey] as readonly unknown[];
      const pagination = body.pagination;
      const hasMore =
        typeof pagination === 'object' &&
        pagination !== null &&
        'hasMore' in pagination &&
        typeof pagination.hasMore === 'boolean'
          ? pagination.hasMore
          : rows.length === TASK_PAGE_LIMIT;
      const previousSize = found.size;
      for (const task of tasks) found.set(task.uid, task);
      if (!hasMore || rows.length === 0) return [...found.values()];
      const page = JSON.stringify(rows);
      if (
        page === previousPage ||
        (tasks.length > 0 && found.size === previousSize)
      ) {
        throw new Error('Tududi did not advance to the next task page.');
      }
      previousPage = page;
      offset += rows.length;
    }
  };

  return {
    fetchAccountTimezone,
    syncDueTasks: async () => {
      const { promoteDueTasks } = await import('./task-sync.ts');
      return promoteDueTasks(
        async (offset) => {
          const payload = await request(
            `${backlogPath()}&order_by=due_date:asc&offset=${String(offset)}`,
          );
          const tasks = adaptTaskList(payload);
          const pagination =
            typeof payload === 'object' &&
            payload !== null &&
            'pagination' in payload
              ? payload.pagination
              : undefined;
          const hasMore =
            typeof pagination === 'object' &&
            pagination !== null &&
            'hasMore' in pagination &&
            typeof pagination.hasMore === 'boolean'
              ? pagination.hasMore
              : tasks.length === TASK_PAGE_LIMIT;
          return { tasks, hasMore };
        },
        async (task) =>
          adaptTask(
            await mutate(`/api/task/${encodeURIComponent(task.uid)}`, 'PATCH', {
              status: 'planned',
              defer_until: null,
            }),
          ),
        await fetchAccountTimezone(),
        now(),
      );
    },
    fetchTodayTasks: async () =>
      adaptTaskList(
        await request(`/api/tasks?type=today&limit=${String(TASK_PAGE_LIMIT)}`),
      ),
    fetchBacklogTasks: async () =>
      visibleBacklog(adaptBacklogTaskList(await request(backlogPath()))),
    /*
     * Tududi's own filters, and exactly as exact as they are: the tag subquery
     * compares `tags.name` for equality, so the name must be spelled and cased
     * the way it is in Tududi. only-tdy does not fold the case here, because
     * folding it in the browser would only produce a request the server
     * answers differently than the field promised.
     */
    searchOpenTasks: async (search) =>
      visibleBacklog(
        search.kind === 'text'
          ? adaptOpenSearchList(await request(searchPath(search.query)))
          : adaptOpenTaskList(
              await request(`${backlogPath()}${filterParam(search)}`),
            ),
      ),
    fetchDoneTasks: async () => adaptDoneTaskList(await request(donePath())),
    fetchAllTasks: () => readAllPages(allPath(), adaptAllTaskList, 'tasks'),
    searchAllTasks: (search) =>
      search.kind === 'text'
        ? readAllPages(searchPath(search.query), adaptAllSearchList, 'results')
        : readAllPages(
            `${allPath()}${filterParam(search)}`,
            adaptAllTaskList,
            'tasks',
          ),
    /*
     * The record narrows through the same filters. Only the list being
     * narrowed differs, which is why this is the open search with a different
     * base path.
     */
    searchDoneTasks: async (search) =>
      search.kind === 'text'
        ? adaptDoneSearchList(await request(searchPath(search.query)))
        : adaptDoneTaskList(
            await request(`${donePath()}${filterParam(search)}`),
          ),
    countDoneTasks: async (filter) =>
      adaptTaskTotal(await request(doneCountPath(filter))),
    fetchProjects: async () => adaptProjectList(await request('/api/projects')),
    createProject: async (name) =>
      adaptProject(await mutate('/api/project', 'POST', { name })),

    fetchTags: async () => adaptTagList(await request('/api/tags')),
    createTask: async (draft) => {
      const timezone = await fetchAccountTimezone();
      const dated = applyDateRules(
        {
          ...draft,
          note: draft.note ?? '',
          projectUid: draft.projectUid ?? '',
          dueDate: draft.dueDate ?? '',
          deferUntil: draft.deferUntil ?? '',
        },
        undefined,
        { timezone, now: now() },
      );
      validateHideDate(dated.dueDate, dated.deferUntil);
      return adaptTask(
        await mutate('/api/task', 'POST', {
          name: draft.title,
          status: dated.status,
          priority: draft.priority,
          tags: [...draft.tags],
          ...(draft.projectUid === undefined
            ? {}
            : { project_uid: draft.projectUid }),
          ...(draft.note === undefined ? {} : { note: draft.note }),
          ...(draft.dueDate === undefined ? {} : { due_date: dated.dueDate }),
          ...(draft.deferUntil === undefined
            ? {}
            : { defer_until: dateAtMidnight(dated.deferUntil, timezone) }),
        }),
      );
    },
    fetchTask: async (uid) => {
      const [payload, timezone] = await Promise.all([
        request(`/api/task/${encodeURIComponent(uid)}`),
        fetchAccountTimezone(),
      ]);
      return adaptTaskDetail(payload, timezone);
    },
    setTaskStatus: async (uid, status) =>
      adaptTask(
        await mutate(`/api/task/${encodeURIComponent(uid)}`, 'PATCH', {
          status,
          ...(isTodayStatus(status) ? { defer_until: null } : {}),
        }),
      ),
    /*
     * Tududi's PATCH merges omitted fields. Leave an unchanged due date
     * untouched so a date-only save cannot remove its time.
     */
    updateTask: async (uid, edit, previousDueDate, previousStatus) => {
      const timezone = await fetchAccountTimezone();
      const dated = applyDateRules(
        edit,
        previousDueDate,
        { timezone, now: now() },
        previousStatus,
      );
      validateHideDate(dated.dueDate, dated.deferUntil);
      const path = `/api/task/${encodeURIComponent(uid)}`;
      const dueDateChanged = dated.dueDate !== previousDueDate;
      let dueTime: string | undefined;
      if (dueDateChanged && dated.dueDate !== '') {
        const current = await request(path);
        if (
          typeof current !== 'object' ||
          current === null ||
          Array.isArray(current)
        ) {
          throw new TududiShapeError('Expected a Tududi task object.');
        }
        const time = 'due_time' in current ? current.due_time : undefined;
        if (time !== undefined && time !== null && typeof time !== 'string') {
          throw new TududiShapeError(
            'Expected Tududi due_time to be a string.',
          );
        }
        if (typeof time === 'string') dueTime = time;
      }
      const projectUid =
        edit.newProjectName === undefined
          ? edit.projectUid
          : adaptProject(
              await mutate('/api/project', 'POST', {
                name: edit.newProjectName,
              }),
            ).uid;
      const payload = await mutate(path, 'PATCH', {
        name: dated.title,
        note: dated.note,
        status: dated.status,
        priority: dated.priority,
        project_uid: projectUid,
        ...(dueDateChanged ? { due_date: dated.dueDate } : {}),
        ...(dueTime === undefined ? {} : { due_time: dueTime }),
        defer_until: dateAtMidnight(dated.deferUntil, timezone),
        tags: [...dated.tags],
      });
      return adaptTaskDetail(payload, timezone);
    },
    deleteTask: async (uid) => {
      await mutate(`/api/task/${encodeURIComponent(uid)}`, 'DELETE');
    },
    clearCsrfToken,
  };
}

export const tududiApi = createTududiApi();
