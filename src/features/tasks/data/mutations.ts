import {
  mutationOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import { currentDate } from '../domain/task-dates.ts';
import { isRepeating, recurringCompletion } from '../domain/recurrence.ts';
import type {
  Task,
  TaskDetail,
  TaskDraft,
  TaskEdit,
  TaskStatus,
} from '../contracts.ts';
import {
  DONE_COUNT_KEY,
  queryKeys,
  SEARCH_KEY,
  TASK_LIST_KEYS,
} from './queries.ts';
import { tududiApi } from './tududi-api.ts';
import type { TududiApi } from '../api-contract.ts';

export interface CreateTaskVariables {
  /** Retained by the caller until the mutation succeeds. */
  readonly input: string;
  readonly draft: TaskDraft;
  readonly projectName?: string;
}

export interface SetTaskStatusVariables {
  readonly task: Task;
  /** `done` ticks the row; any open status reopens it. */
  readonly status: TaskStatus;
}

export interface MoveTasksToTodayVariables {
  /** The whole task, because a failure has to name the row it belongs to. */
  readonly tasks: readonly Task[];
}

/**
 * What a move actually did. Tududi has no endpoint that moves several tasks at
 * once, so a move is several writes, and several writes can land differently —
 * saying so is the only honest result type.
 */
export interface MoveTasksToTodayResult {
  readonly moved: readonly Task[];
  readonly failed: readonly { readonly task: Task; readonly error: unknown }[];
}

export interface UpdateTaskVariables {
  readonly previousDueDate?: string | undefined;
  readonly previousStatus?: TaskStatus | undefined;
  readonly uid: string;
  readonly edit: TaskEdit;
}

export interface DeleteTaskVariables {
  readonly uid: string;
}

interface CreateContext {
  readonly key: QueryKey;
  readonly optimisticUid: string;
}

interface SetTaskStatusContext {
  /** Every list the task was found in, so a failure can put each one back. */
  readonly restored: readonly { readonly key: QueryKey; readonly task: Task }[];
  /**
   * The open list a reopened task had to be put into because no list on screen
   * was holding it, so a failure can take it back out again. Absent whenever
   * the task was already listed somewhere, which is every tick and most
   * reopens.
   */
  readonly inserted?: QueryKey;
}

let optimisticSequence = 0;

function nextOptimisticUid(): string {
  optimisticSequence += 1;
  return `focus-optimistic-${String(optimisticSequence)}`;
}

/**
 * The draft with its new project made real. A `+` name nobody has yet is
 * created first, so the task can be filed under the uid Tududi gives it.
 */
async function withProject(
  draft: TaskDraft,
  api: TududiApi,
): Promise<TaskDraft> {
  const { newProjectName, ...rest } = draft;
  if (newProjectName === undefined) return draft;
  const project = await api.createProject(newProjectName);
  return { ...rest, projectUid: project.uid };
}

function listKeyForDraft(draft: TaskDraft): QueryKey {
  return draft.recurrence
    ? queryKeys.repeating
    : listKeyForStatus(draft.status);
}

/** Which of the two open lists a status puts a task on. */
function listKeyForStatus(status: TaskStatus): QueryKey {
  return status === 'planned' ? queryKeys.today : queryKeys.backlog;
}

/** Two keys naming the same cache. Compared by value: a key read back out of
    the client is an equal array rather than the same one. */
function sameKey(left: QueryKey, right: QueryKey): boolean {
  return (
    left.length === right.length &&
    left.every((part, index) => part === right[index])
  );
}

/**
 * Every cache holding a list of tasks right now: the three lists, plus each
 * narrowed one that has been searched for.
 *
 * A search result is a list on screen like any other, so a row ticked in one
 * has to move in it too — the record's field is what makes this matter, since
 * unticking a found task is exactly how it leaves the record. The searched
 * ones are looked up rather than listed because their keys are not known until
 * something has been searched for.
 */
function listedTaskKeys(queryClient: QueryClient): readonly QueryKey[] {
  return [
    ...TASK_LIST_KEYS,
    ...queryClient
      .getQueriesData<readonly Task[]>({ queryKey: SEARCH_KEY })
      .map(([key]) => key),
  ];
}

export function createTaskMutationOptions(
  queryClient: QueryClient,
  api: TududiApi = tududiApi,
) {
  return mutationOptions<Task, Error, CreateTaskVariables, CreateContext>({
    mutationKey: ['task', 'create'],
    mutationFn: async ({ draft }) =>
      api.createTask(await withProject(draft, api)),
    retry: false,
    onMutate: async (variables) => {
      const timezone = await api.fetchAccountTimezone();
      const hidden =
        variables.draft.status === 'not_started' &&
        (variables.draft.deferUntil ?? '') > currentDate({ timezone });
      const key = listKeyForDraft(variables.draft);
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const optimisticUid = nextOptimisticUid();
      const optimisticTask: Task = {
        ...(variables.draft.recurrence
          ? { recurrence: variables.draft.recurrence }
          : {}),
        uid: optimisticUid,
        title: variables.draft.title,
        priority: variables.draft.priority,
        status: variables.draft.status,
        tags: variables.draft.tags,
        ...(variables.draft.dueDate === undefined
          ? {}
          : { dueDate: variables.draft.dueDate }),
        ...(variables.draft.deferUntil === undefined
          ? {}
          : { deferUntil: variables.draft.deferUntil }),
        ...(variables.projectName === undefined
          ? {}
          : { projectName: variables.projectName }),
      };
      if (!hidden)
        queryClient.setQueryData<readonly Task[]>(key, (current = []) => [
          optimisticTask,
          ...current,
        ]);
      return { key, optimisticUid };
    },
    onError: (_error, _variables, context) => {
      if (context === undefined) return;
      queryClient.setQueryData<readonly Task[]>(context.key, (current = []) =>
        current.filter((task) => task.uid !== context.optimisticUid),
      );
    },
    onSuccess: (task, _variables, context) => {
      queryClient.setQueryData<readonly Task[]>(context.key, (current = []) =>
        current.map((item) =>
          item.uid === context.optimisticUid ? task : item,
        ),
      );
    },
    onSettled: async (_task, _error, variables) => {
      /* A project may exist now even when the task after it failed, so the
         list is asked for again either way and a retry files under it. */
      if (variables.draft.newProjectName !== undefined) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      }
      await queryClient.invalidateQueries({
        queryKey: listKeyForDraft(variables.draft),
        exact: true,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allSearch }),
      ]);
    },
  });
}

/**
 * The one write a row makes. Completing and reopening are the same operation
 * with a different target status, so they share one optimistic path: the task
 * is restatused in place in every list that holds it, and a failure puts it
 * back exactly as it was.
 *
 * History keeps its done tasks by the same rule. It is rendered from the tasks
 * whose status is still `done`, so reopening one drops it out of the record
 * the moment the box is unticked, and a failed reopen returns it to its place.
 * A narrowed record is the same list under a term, so it is written the same
 * way and a row reopened from a search leaves it just as promptly.
 *
 * The day's record on the open list is what makes reopening need one thing
 * more. A task ticked before this page loaded is held only by the completed
 * list, so restatusing it in place takes it out of the record and puts it into
 * no list at all — the row would simply vanish under the pointer that
 * unticked it. So when nothing open is holding it, it is put into the list its
 * new status names, at the end, which is where it already was.
 */
export function setTaskStatusMutationOptions(
  queryClient: QueryClient,
  api: TududiApi = tududiApi,
) {
  return mutationOptions<
    Task,
    Error,
    SetTaskStatusVariables,
    SetTaskStatusContext
  >({
    mutationKey: ['task', 'status'],
    mutationFn: async ({ task, status }) => {
      if (task.sourceTaskUid)
        throw new Error(
          'Completed occurrences cannot reopen a repeating task.',
        );
      const timezone = await api.fetchAccountTimezone();
      const target =
        status === 'not_started' &&
        task.dueDate &&
        task.dueDate <= currentDate({ timezone })
          ? 'planned'
          : status;
      return api.setTaskStatus(task.uid, target);
    },
    retry: false,
    /*
     * The task is restatused in place rather than taken out of the list. It
     * keeps its row and its identity; `orderTasks` is what moves it to the
     * bottom when the list is rendered.
     */
    onMutate: async ({ task, status }) => {
      const keys = listedTaskKeys(queryClient);
      await Promise.all(
        keys.map((key) =>
          queryClient.cancelQueries({ queryKey: key, exact: true }),
        ),
      );

      const restored: { key: QueryKey; task: Task }[] = [];
      for (const key of keys) {
        queryClient.setQueryData<readonly Task[]>(key, (current = []) => {
          const previous = current.find((item) => item.uid === task.uid);
          if (previous === undefined) return current;
          restored.push({ key, task: previous });
          return current.map((item) =>
            item.uid === task.uid ? { ...item, status } : item,
          );
        });
      }

      if (status === 'done') return { restored };

      /* A reopen, and the open lists may not have this row. A cache that does
         not exist is still left alone: an unmounted list must load for real
         the first time it is opened rather than inherit one row. */
      const openKeys: readonly QueryKey[] = [
        queryKeys.today,
        queryKeys.backlog,
      ];
      const held = restored.some((entry) =>
        openKeys.some((key) => sameKey(entry.key, key)),
      );
      if (held) return { restored };

      const key = listKeyForStatus(status);
      if (queryClient.getQueryData<readonly Task[]>(key) === undefined) {
        return { restored };
      }
      const reopened: Task = { ...task, status };
      Reflect.deleteProperty(reopened, 'completedAt');
      queryClient.setQueryData<readonly Task[]>(key, (current = []) => [
        ...current,
        reopened,
      ]);
      return { restored, inserted: key };
    },
    /*
     * A failure puts the task back exactly as it was and resyncs every list,
     * because at that point the cache is the thing that cannot be trusted.
     */
    onError: (_error, variables, context) => {
      if (context !== undefined) {
        for (const entry of context.restored) {
          queryClient.setQueryData<readonly Task[]>(entry.key, (current = []) =>
            current.map((item) =>
              item.uid === entry.task.uid ? entry.task : item,
            ),
          );
        }
        if (context.inserted !== undefined) {
          queryClient.setQueryData<readonly Task[]>(
            context.inserted,
            (current = []) =>
              current.filter((item) => item.uid !== variables.task.uid),
          );
        }
      }
      void Promise.all([
        ...TASK_LIST_KEYS.map((key) =>
          queryClient.invalidateQueries({ queryKey: key, exact: true }),
        ),
        queryClient.invalidateQueries({ queryKey: SEARCH_KEY }),
        queryClient.invalidateQueries({ queryKey: DONE_COUNT_KEY }),
      ]);
    },
    /*
     * The answer is written everywhere the task is held, and then only what
     * can safely be asked again is asked again.
     *
     * A tick refetches the record and nothing else. The open lists answer with
     * open tasks, so refetching one here would take the row off the screen in
     * the moment between that answer and the record's — the row would blink
     * out and come back. They are left holding it, the record is made real,
     * and the duplicate the two now make is dropped when the list is drawn.
     *
     * A reopen is the other way round: the record has to lose the row and an
     * open list has to gain it, so both are asked, and the row is already in
     * the right list optimistically while they answer.
     */
    onSuccess: (task, variables, context) => {
      if (variables.status === 'done' && isRepeating(variables.task)) {
        const completed = recurringCompletion(
          variables.task,
          task.completedAt ?? new Date().toISOString(),
        );
        for (const key of listedTaskKeys(queryClient)) {
          queryClient.setQueryData<readonly Task[]>(key, (current) =>
            current?.filter((item) => item.uid !== task.uid),
          );
        }
        queryClient.setQueryData<readonly Task[]>(queryKeys.today, (current) =>
          current === undefined ? undefined : [...current, completed],
        );
        queryClient.setQueryData<readonly Task[]>(
          queryKeys.history,
          (current = []) => [completed, ...current],
        );
        void queryClient.invalidateQueries({ queryKey: ['tasks'] });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.task(task.uid),
        });
        return;
      }
      for (const entry of context.restored) {
        queryClient.setQueryData<readonly Task[]>(entry.key, (current = []) =>
          current.map((item) => (item.uid === task.uid ? task : item)),
        );
      }
      if (context.inserted !== undefined) {
        queryClient.setQueryData<readonly Task[]>(
          context.inserted,
          (current = []) =>
            current.map((item) => (item.uid === task.uid ? task : item)),
        );
      }

      if (variables.status === 'done') {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.history,
          exact: true,
        });
        return;
      }
      void Promise.all([
        ...TASK_LIST_KEYS.map((key) =>
          queryClient.invalidateQueries({ queryKey: key, exact: true }),
        ),
        queryClient.invalidateQueries({ queryKey: SEARCH_KEY }),
        queryClient.invalidateQueries({ queryKey: DONE_COUNT_KEY }),
      ]);
    },
  });
}

/**
 * Moving chosen backlog tasks onto Today.
 *
 * `planned` is what Today means to Tududi: its today view answers with the
 * in-progress, waiting, and planned tasks that are not deferred into the
 * future. So the move is exactly the write a row already makes, aimed at a
 * different status, and there is nothing invented on top of it.
 *
 * The writes go out together rather than one after another, and every one of
 * them is awaited before anything is reported: a partial result is a real
 * outcome here, and the rows that did not move must stay chosen so the next
 * press retries only those.
 *
 * Nothing is optimistic. A moved row leaves the backlog the moment Tududi
 * confirms it, and a row that failed never left, so there is no state to put
 * back.
 */
export function moveTasksToTodayMutationOptions(
  queryClient: QueryClient,
  api: TududiApi = tududiApi,
) {
  return mutationOptions<
    MoveTasksToTodayResult,
    Error,
    MoveTasksToTodayVariables
  >({
    mutationKey: ['task', 'move-to-today'],
    mutationFn: async ({ tasks }) => {
      const settled = await Promise.allSettled(
        tasks.map((task) => api.setTaskStatus(task.uid, 'planned')),
      );

      const moved: Task[] = [];
      const failed: { task: Task; error: unknown }[] = [];
      settled.forEach((outcome, index) => {
        const task = tasks[index];
        if (task === undefined) return;
        if (outcome.status === 'fulfilled') moved.push(outcome.value);
        else failed.push({ task, error: outcome.reason });
      });
      return { moved, failed };
    },
    retry: false,
    onSuccess: ({ moved }) => {
      if (moved.length === 0) return;
      const movedUids = new Set(moved.map((task) => task.uid));

      /* Every list already on screen is corrected in place, so both views are
         right before anything is refetched. A cache that does not exist is
         left alone rather than seeded: an unmounted list must load for real
         the first time it is opened, not inherit a fragment of one. */
      queryClient.setQueryData<readonly Task[]>(queryKeys.today, (current) =>
        current === undefined
          ? undefined
          : [...current.filter((task) => !movedUids.has(task.uid)), ...moved],
      );
      for (const key of [queryKeys.backlog, queryKeys.history]) {
        queryClient.setQueryData<readonly Task[]>(key, (current) =>
          current?.filter((task) => !movedUids.has(task.uid)),
        );
      }
      /* A search result keeps the row and takes the new status: the backlog
         page's search shows Today's matches under the backlog's, so a moved
         task changes group rather than leaving. */
      const movedByUid = new Map(moved.map((task) => [task.uid, task]));
      queryClient.setQueryData<readonly Task[]>(queryKeys.all, (current) =>
        current?.map((task) => movedByUid.get(task.uid) ?? task),
      );
      queryClient.setQueriesData<readonly Task[]>(
        { queryKey: SEARCH_KEY },
        (current) => current?.map((task) => movedByUid.get(task.uid) ?? task),
      );

      void Promise.all([
        ...TASK_LIST_KEYS.map((key) =>
          queryClient.invalidateQueries({ queryKey: key, exact: true }),
        ),
        queryClient.invalidateQueries({ queryKey: SEARCH_KEY }),
        queryClient.invalidateQueries({ queryKey: DONE_COUNT_KEY }),
      ]);
    },
  });
}

/**
 * A save from the task's own page.
 *
 * Nothing is optimistic here. The form is the source of what was typed and it
 * keeps every character until the server answers, so there is no cache to put
 * back on a failure — which is the whole reason a failed save cannot lose
 * work. What the answer does is replace the task everywhere it is held.
 *
 * List membership is corrected immediately from the confirmed response.
 * Lists are marked stale for their next load without another request here.
 */
export function updateTaskMutationOptions(
  queryClient: QueryClient,
  api: TududiApi = tududiApi,
) {
  return mutationOptions<TaskDetail, Error, UpdateTaskVariables>({
    mutationKey: ['task', 'update'],
    onSettled: async (_task, _error, variables) => {
      if (variables.edit.newProjectName !== undefined) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      }
    },
    mutationFn: ({ uid, edit, previousDueDate, previousStatus }) =>
      api.updateTask(uid, edit, previousDueDate, previousStatus),
    retry: false,
    onSuccess: async (task) => {
      const timezone = await api.fetchAccountTimezone();
      queryClient.setQueryData(queryKeys.task(task.uid), task);
      for (const key of TASK_LIST_KEYS) {
        queryClient.setQueryData<readonly Task[]>(key, (current) => {
          if (current === undefined) return undefined;
          const belongs =
            key === queryKeys.repeating
              ? isRepeating(task)
              : key === queryKeys.all
                ? true
                : key === queryKeys.history || key === queryKeys.fullHistory
                  ? task.status === 'done'
                  : key === queryKeys.backlog
                    ? !isRepeating(task) &&
                      task.status === 'not_started' &&
                      (!task.deferUntil ||
                        task.deferUntil <= currentDate({ timezone }))
                    : task.status !== 'not_started' && task.status !== 'done';
          const others = current.filter((item) => item.uid !== task.uid);
          if (!belongs) return others;
          return current.some((item) => item.uid === task.uid)
            ? current.map((item) => (item.uid === task.uid ? task : item))
            : [...others, task];
        });
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects,
        refetchType: 'none',
      });
      for (const [key] of queryClient.getQueriesData<readonly Task[]>({
        queryKey: SEARCH_KEY,
      })) {
        queryClient.setQueryData<readonly Task[]>(key, (current) =>
          current?.flatMap((item) => {
            if (item.uid !== task.uid) return [item];
            return key[2] !== 'all' &&
              task.status === 'not_started' &&
              task.deferUntil > currentDate({ timezone })
              ? []
              : [task];
          }),
        );
      }
      void Promise.all([
        ...TASK_LIST_KEYS.map((key) =>
          queryClient.invalidateQueries({
            queryKey: key,
            exact: true,
            refetchType: 'none',
          }),
        ),
        queryClient.invalidateQueries({
          queryKey: SEARCH_KEY,
          refetchType: 'none',
        }),
        queryClient.invalidateQueries({
          queryKey: DONE_COUNT_KEY,
          refetchType: 'none',
        }),
      ]);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.history,
        refetchType: 'none',
      });
    },
  });
}

export function useSkipOccurrenceMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: tududiApi.skipOccurrence,
    retry: false,
    onSuccess: async (task) => {
      client.setQueryData(queryKeys.task(task.uid), undefined);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['tasks'] }),
        client.invalidateQueries({ queryKey: queryKeys.task(task.uid) }),
      ]);
    },
  });
}

/**
 * A delete from the task's own page. The row goes from every list at once so
 * the list behind is already correct when the page returns to it, and the
 * lists are refetched for real — unlike a save, there is no row left on
 * screen for a refetch to pull out from under anyone.
 */
export function deleteTaskMutationOptions(
  queryClient: QueryClient,
  api: TududiApi = tududiApi,
) {
  // The generics are inferred here: naming `void` as the result type is what
  // the linter reads as a value type, and it is only ever a return.
  return mutationOptions({
    mutationKey: ['task', 'delete'],
    mutationFn: ({ uid }: DeleteTaskVariables) => api.deleteTask(uid),
    retry: false,
    onSuccess: (_result, { uid }) => {
      queryClient.removeQueries({ queryKey: queryKeys.task(uid), exact: true });
      for (const key of TASK_LIST_KEYS) {
        queryClient.setQueryData<readonly Task[]>(key, (current) =>
          current?.filter((item) => item.uid !== uid),
        );
      }
      queryClient.setQueriesData<readonly Task[]>(
        { queryKey: SEARCH_KEY },
        (current) => current?.filter((item) => item.uid !== uid),
      );
      void Promise.all([
        ...TASK_LIST_KEYS.map((key) =>
          queryClient.invalidateQueries({ queryKey: key, exact: true }),
        ),
        queryClient.invalidateQueries({ queryKey: SEARCH_KEY }),
        queryClient.invalidateQueries({ queryKey: DONE_COUNT_KEY }),
      ]);
    },
  });
}

export function useCreateTaskMutation(api: TududiApi = tududiApi) {
  const queryClient = useQueryClient();
  const options = useMemo(
    () => createTaskMutationOptions(queryClient, api),
    [api, queryClient],
  );
  return useMutation(options);
}

export function useSetTaskStatusMutation(api: TududiApi = tududiApi) {
  const queryClient = useQueryClient();
  const options = useMemo(
    () => setTaskStatusMutationOptions(queryClient, api),
    [api, queryClient],
  );
  return useMutation(options);
}

export function useMoveTasksToTodayMutation(api: TududiApi = tududiApi) {
  const queryClient = useQueryClient();
  const options = useMemo(
    () => moveTasksToTodayMutationOptions(queryClient, api),
    [api, queryClient],
  );
  return useMutation(options);
}

export function useUpdateTaskMutation(api: TududiApi = tududiApi) {
  const queryClient = useQueryClient();
  const options = useMemo(
    () => updateTaskMutationOptions(queryClient, api),
    [api, queryClient],
  );
  return useMutation(options);
}

export function useDeleteTaskMutation(api: TududiApi = tududiApi) {
  const queryClient = useQueryClient();
  const options = useMemo(
    () => deleteTaskMutationOptions(queryClient, api),
    [api, queryClient],
  );
  return useMutation(options);
}
