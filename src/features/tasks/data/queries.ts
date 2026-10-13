import { readDuePromotion } from '../due-promotion.ts';
import {
  queryOptions,
  useQuery,
  type QueryKey,
  type QueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  DoneCount,
  Project,
  SearchList,
  SearchRequest,
  SentSearchRequest,
  Task,
  TaskDetail,
  TaskFilter,
} from '../contracts.ts';
import { TASK_PAGE_LIMIT } from '../../../config/app.ts';
import {
  containsProjectSyntax,
  containsTagSyntax,
} from '../domain/entry-tokens.ts';
import { searchRequestKey } from '../domain/task-search.ts';
import { tududiApi } from './tududi-api.ts';
import { TududiApiError } from '../../../infra/tududi-client.ts';
import type { TududiApi } from '../api-contract.ts';

export const queryKeys = {
  today: ['tasks', 'today'] as const,
  backlog: ['tasks', 'backlog'] as const,
  history: ['tasks', 'history'] as const,
  all: ['tasks', 'all'] as const,
  allSearch: ['tasks', 'search', 'all'] as const,
  /** A filtered list, keyed by which list it is and the term that filtered it. */
  search: (list: SearchList, key: string) =>
    ['tasks', 'search', list, key] as const,
  projects: ['projects'] as const,
  tags: ['tags'] as const,
  /** One task in full, keyed by uid, for its own page. */
  task: (uid: string) => ['task', uid] as const,
};

/** Every list a task can appear in, and so every cache a write must reach. */
export const TASK_LIST_KEYS: readonly QueryKey[] = [
  queryKeys.today,
  queryKeys.backlog,
  queryKeys.history,
  queryKeys.all,
];

/**
 * The prefix every filtered list shares, whichever list it filtered. A write
 * cannot know which term is on screen, so it reaches all of them at once —
 * which is why this key is a sibling of the three lists rather than nested
 * under them, where the exact invalidation they use would step straight past
 * it.
 */
export const SEARCH_KEY: QueryKey = ['tasks', 'search'];

/**
 * The backlog search's count of finished matches. Kept apart from
 * `SEARCH_KEY`, whose caches all hold lists of tasks that writes edit in place.
 */
export const DONE_COUNT_KEY: QueryKey = ['tasks', 'done-count'];

/**
 * TanStack passes the number of failures already observed, starting at zero.
 * Three kinds are answers rather than accidents — the session is gone, the
 * request was refused, the task is not there — and asking again would only
 * delay saying so.
 */
export function retryTududiQuery(failureCount: number, error: Error): boolean {
  if (
    error instanceof TududiApiError &&
    (error.kind === 'unauthorized' ||
      error.kind === 'validation' ||
      error.kind === 'not-found')
  ) {
    return false;
  }
  return failureCount < 2;
}

export function accountTimezoneQueryOptions(api: TududiApi = tududiApi) {
  return queryOptions({
    queryKey: ['account', 'timezone'],
    queryFn: api.fetchAccountTimezone,
    staleTime: Number.POSITIVE_INFINITY,
    retry: retryTududiQuery,
  });
}

async function syncBeforeRead<T>(
  client: QueryClient,
  api: TududiApi,
  read: () => Promise<T>,
): Promise<T> {
  if (!readDuePromotion()) return read();
  await client.query(
    queryOptions({
      queryKey: ['task-date-sync'],
      staleTime: 1_000,
      retry: false,
      queryFn: async () => {
        const moved = await api.syncDueTasks();
        if (moved.length > 0) {
          const byUid = new Map(moved.map((task) => [task.uid, task]));
          client.setQueryData<readonly Task[]>(queryKeys.today, (current) =>
            current === undefined
              ? undefined
              : [...current.filter((task) => !byUid.has(task.uid)), ...moved],
          );
          client.setQueryData<readonly Task[]>(queryKeys.backlog, (current) =>
            current?.filter((task) => !byUid.has(task.uid)),
          );
          client.setQueryData<readonly Task[]>(queryKeys.all, (current) =>
            current?.map((task) => byUid.get(task.uid) ?? task),
          );
          client.setQueriesData<readonly Task[]>(
            { queryKey: SEARCH_KEY },
            (current) => current?.map((task) => byUid.get(task.uid) ?? task),
          );
        }
        return moved;
      },
    }),
  );
  return read();
}

export function todayQueryOptions(api: TududiApi = tududiApi, enabled = true) {
  return queryOptions({
    queryKey: queryKeys.today,
    queryFn: ({ client }) => syncBeforeRead(client, api, api.fetchTodayTasks),
    enabled,
    retry: retryTududiQuery,
  });
}

export function backlogQueryOptions(
  enabled: boolean,
  api: TududiApi = tududiApi,
) {
  return queryOptions({
    queryKey: queryKeys.backlog,
    queryFn: ({ client }) => syncBeforeRead(client, api, api.fetchBacklogTasks),
    enabled,
    retry: retryTududiQuery,
  });
}

/**
 * One list, narrowed by whatever its search field asked for.
 *
 * Each term is a different Tududi endpoint, so the request is chosen here
 * rather than by the caller, and the three that cannot be sent — no term, a
 * project name still being looked up, a name that resolves to nothing — simply
 * leave the query disabled. The unfiltered list keeps its own key, so clearing
 * the field returns to a list that is already loaded.
 *
 * The two lists are the same three questions over different rows, so they
 * share this one shape rather than each growing its own: `list` picks the pair
 * of endpoints, and is also what keeps a search of the backlog and a search of
 * the record for the same word in two caches.
 */
export function searchQueryOptions(
  list: SearchList,
  request: SearchRequest,
  api: TududiApi = tududiApi,
) {
  const backlog = list === 'backlog';
  return queryOptions({
    queryKey: queryKeys.search(list, searchRequestKey(request)),
    queryFn: ({ client }) => {
      if (!isSent(request)) {
        throw new Error('A search without a term cannot be sent.');
      }
      return backlog
        ? syncBeforeRead(client, api, async () =>
            (await api.searchOpenTasks(request)).filter(
              (task) => task.status === 'not_started',
            ),
          )
        : list === 'all'
          ? syncBeforeRead(client, api, () => api.searchAllTasks(request))
          : api.searchDoneTasks(request);
    },
    enabled: isSent(request),
    retry: retryTududiQuery,
  });
}

/**
 * Completed tasks. Tududi orders them by completion date descending and only-tdy
 * keeps that order exactly: the record reads newest first, capped at the same
 * page limit as every other list.
 *
 * Two screens want this one list and they want it for different reasons — the
 * record is all of it, and the open list takes the part of it finished today —
 * so it is one query under one key rather than two asking the same question.
 * Whichever screen is reached first pays for it and the other finds it loaded.
 */
/** True when the request names something Tududi can be asked. */
function isSent(request: SearchRequest): request is SentSearchRequest {
  return (
    request.kind === 'tag' ||
    request.kind === 'project' ||
    request.kind === 'priority' ||
    request.kind === 'text'
  );
}

function isFilter(request: SearchRequest): request is TaskFilter {
  return isSent(request) && request.kind !== 'text';
}

/**
 * How many finished tasks a backlog search also matched, for the line that
 * points at them. A filter is counted by Tududi itself — one row asked for,
 * the total read off the answer. A phrase cannot be: the search endpoint takes
 * no status filter, so the phrase is asked of the record the same way the
 * record's own field asks it, which is also the answer that link opens onto.
 */
export function useDoneCount(
  request: SearchRequest,
  api: TududiApi = tududiApi,
): DoneCount | undefined {
  const text = request.kind === 'text';
  const filtered = isFilter(request);

  const count = useQuery({
    queryKey: [...DONE_COUNT_KEY, searchRequestKey(request)],
    queryFn: () => {
      if (!isFilter(request)) {
        throw new Error('Only a filter is counted this way.');
      }
      return api.countDoneTasks(request);
    },
    enabled: filtered,
    retry: retryTududiQuery,
  });
  const found = useQuery({
    ...searchQueryOptions('history', request, api),
    enabled: text,
  });

  if (filtered) {
    return count.isSuccess ? { count: count.data, capped: false } : undefined;
  }
  if (text && found.isSuccess) {
    const done = found.data.filter((task) => task.status === 'done').length;
    return { count: done, capped: done >= TASK_PAGE_LIMIT };
  }
  return undefined;
}

export function historyQueryOptions(
  enabled: boolean,
  api: TududiApi = tududiApi,
) {
  return queryOptions({
    queryKey: queryKeys.history,
    queryFn: api.fetchDoneTasks,
    enabled,
    retry: retryTududiQuery,
  });
}

export function allQueryOptions(enabled: boolean, api: TududiApi = tududiApi) {
  return queryOptions({
    queryKey: queryKeys.all,
    queryFn: ({ client }) => syncBeforeRead(client, api, api.fetchAllTasks),
    enabled,
    retry: retryTududiQuery,
  });
}

export function useAllTasksQuery(enabled: boolean, api: TududiApi = tududiApi) {
  return useQuery(allQueryOptions(enabled, api));
}

export function projectsQueryOptions(
  enabled: boolean,
  api: TududiApi = tududiApi,
) {
  return queryOptions({
    queryKey: queryKeys.projects,
    queryFn: api.fetchProjects,
    enabled,
    retry: retryTududiQuery,
  });
}

/**
 * Every tag name the account has used. Fetched on the same terms as the
 * project list — only once the mark that needs it has been typed — because a
 * suggestion list is the only thing that reads it, and a field nobody has put
 * a `#` in has nothing to suggest.
 */
export function tagsQueryOptions(enabled: boolean, api: TududiApi = tududiApi) {
  return queryOptions({
    queryKey: queryKeys.tags,
    queryFn: api.fetchTags,
    enabled,
    retry: retryTududiQuery,
  });
}

/**
 * One task in full. The task page mounts this and the project list together
 * rather than one after the other: the project names are needed to label the
 * project control, not to build the request for the task, so making the
 * second wait on the first would be a waterfall for nothing.
 */
export function taskQueryOptions(uid: string, api: TududiApi = tududiApi) {
  return queryOptions({
    queryKey: queryKeys.task(uid),
    queryFn: () => api.fetchTask(uid),
    retry: retryTududiQuery,
  });
}

export interface TaskListQueries {
  readonly today: UseQueryResult<readonly Task[]>;
  /** Asked for only while Today is clear, to say how much is waiting. */
  readonly backlog: UseQueryResult<readonly Task[]>;
  /** Today has answered and nothing on it is still open. */
  readonly todayClear: boolean;
}

export function useTaskListQueries(
  api: TududiApi = tududiApi,
  enabled = true,
): TaskListQueries {
  const today = useQuery(todayQueryOptions(api, enabled));
  /*
   * Clear is what Today counts in open rows, not rows. The cache keeps a
   * ticked task in place until the next load, and a Today holding only tasks
   * that are already finished is a Today with nothing left to do — so the
   * backlog is counted then, for the way onto it. The backlog page asks for
   * the same list unconditionally, so following that way finds it cached.
   */
  const todayClear =
    today.isSuccess && !today.data.some((task) => task.status !== 'done');
  const backlog = useQuery(backlogQueryOptions(enabled && todayClear, api));
  return { today, backlog, todayClear };
}

/** The same list, unconditionally, for the backlog's own page. */
export function useBacklogQuery(
  enabled: boolean,
  api: TududiApi = tududiApi,
): UseQueryResult<readonly Task[]> {
  return useQuery(backlogQueryOptions(enabled, api));
}

export function useSearchQuery(
  list: SearchList,
  request: SearchRequest,
  api: TududiApi = tududiApi,
): UseQueryResult<readonly Task[]> {
  return useQuery(searchQueryOptions(list, request, api));
}

export function useHistoryQuery(
  enabled: boolean,
  api: TududiApi = tududiApi,
): UseQueryResult<readonly Task[]> {
  return useQuery(historyQueryOptions(enabled, api));
}

/** Fetched only while quick entry contains a project token. */
export function useProjectsQuery(
  input: string,
  api: TududiApi = tududiApi,
): UseQueryResult<readonly Project[]> {
  return useQuery(projectsQueryOptions(containsProjectSyntax(input), api));
}

/** Fetched only while the field being typed in contains a tag mark. */
export function useTagsQuery(
  input: string,
  api: TududiApi = tududiApi,
): UseQueryResult<readonly string[]> {
  return useQuery(tagsQueryOptions(containsTagSyntax(input), api));
}

/** The same names, unconditionally, for the task page's tag field. */
export function useTagListQuery(
  enabled: boolean,
  api: TududiApi = tududiApi,
): UseQueryResult<readonly string[]> {
  return useQuery(tagsQueryOptions(enabled, api));
}

/** The same list, unconditionally, for the task page's project control. */
export function useProjectListQuery(
  enabled: boolean,
  api: TududiApi = tududiApi,
): UseQueryResult<readonly Project[]> {
  return useQuery(projectsQueryOptions(enabled, api));
}

export function useTaskQuery(
  uid: string,
  api: TududiApi = tududiApi,
): UseQueryResult<TaskDetail> {
  return useQuery(taskQueryOptions(uid, api));
}
