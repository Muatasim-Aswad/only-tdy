import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { PropsWithChildren } from 'react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import type { Task } from '../contracts.ts';
import { setDuePromotion } from '../due-promotion.ts';
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useMoveTasksToTodayMutation,
  useSetTaskStatusMutation,
  useUpdateTaskMutation,
} from './mutations.ts';
import {
  historyQueryOptions,
  queryKeys,
  todayQueryOptions,
} from './queries.ts';
import { createTududiApi } from './tududi-api.ts';
import {
  backlogDraft,
  backlogTask,
  rawBacklogTask,
  rawTaskDetail,
  rawTodayTask,
  todayTask,
} from './testing/fixtures.ts';

const server = setupServer(
  http.get('/api/profile', () => HttpResponse.json({ timezone: 'UTC' })),
);
function absoluteInput(input: RequestInfo | URL): RequestInfo | URL {
  return typeof input === 'string'
    ? new URL(input, window.location.origin)
    : input;
}
const resolvedFetch: typeof fetch = (input, init) =>
  globalThis.fetch(absoluteInput(input), init);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
beforeEach(() => {
  setDuePromotion(false);
});
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => {
  server.close();
});

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const concurrentTask: Task = {
  uid: 'task-concurrent',
  title: 'Concurrent task',
  status: 'not_started',
  priority: 'medium',
  tags: [],
};

describe('optimistic mutations', () => {
  it('rolls back only the failed optimistic create and preserves the input', async () => {
    let releaseResponse: (() => void) | undefined;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.post('/api/task', async () => {
        await responseGate;
        return HttpResponse.json({ error: 'failed' }, { status: 500 });
      }),
    );
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.backlog, [backlogTask]);
    const api = createTududiApi(resolvedFetch);
    const { result } = renderHook(() => useCreateTaskMutation(api), {
      wrapper,
    });
    const variables = { input: 'Book dentist', draft: backlogDraft } as const;

    const mutation = result.current
      .mutateAsync(variables)
      .catch((error: unknown) => error);
    await waitFor(() => {
      const tasks = queryClient.getQueryData<readonly Task[]>(
        queryKeys.backlog,
      );
      expect(tasks?.[0]?.uid).toMatch(/^focus-optimistic-/);
    });
    queryClient.setQueryData<readonly Task[]>(
      queryKeys.backlog,
      (current = []) => [...current, concurrentTask],
    );

    releaseResponse?.();
    await expect(mutation).resolves.toBeTruthy();

    expect(variables.input).toBe('Book dentist');
    expect(
      queryClient
        .getQueryData<readonly Task[]>(queryKeys.backlog)
        ?.map((task) => task.uid),
    ).toEqual(['task-backlog', 'task-concurrent']);
  });

  it('creates a new project first and files the task under it', async () => {
    const posted: { path: string; body: unknown }[] = [];
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.get('/api/projects', () => HttpResponse.json({ projects: [] })),
      http.post('/api/project', async ({ request }) => {
        posted.push({ path: '/api/project', body: await request.json() });
        return HttpResponse.json(
          { uid: 'project-garden', name: 'Garden' },
          { status: 201 },
        );
      }),
      http.post('/api/task', async ({ request }) => {
        posted.push({ path: '/api/task', body: await request.json() });
        return HttpResponse.json(rawBacklogTask, { status: 201 });
      }),
      http.get('/api/tasks', () => HttpResponse.json({ tasks: [] })),
    );
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.projects, []);
    const api = createTududiApi(resolvedFetch);
    const { result } = renderHook(() => useCreateTaskMutation(api), {
      wrapper,
    });

    await result.current.mutateAsync({
      input: 'Weed +Garden',
      draft: { ...backlogDraft, newProjectName: 'Garden' },
      projectName: 'Garden',
    });

    expect(posted).toEqual([
      { path: '/api/project', body: { name: 'Garden' } },
      {
        path: '/api/task',
        body: {
          name: 'Book dentist',
          status: 'not_started',
          priority: 'low',
          tags: [],
          project_uid: 'project-garden',
        },
      },
    ]);
    expect(queryClient.getQueryState(queryKeys.projects)?.isInvalidated).toBe(
      true,
    );
  });

  it('keeps a completed task in the list, marked done', async () => {
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.patch('/api/task/:uid', () =>
        HttpResponse.json({
          uid: backlogTask.uid,
          name: backlogTask.title,
          original_name: backlogTask.title,
          status: 2,
          priority: 0,
          tags: [],
        }),
      ),
    );
    const { queryClient, wrapper } = createHarness();
    const otherTask: Task = {
      ...backlogTask,
      uid: 'task-other',
      title: 'Other',
    };
    queryClient.setQueryData(queryKeys.backlog, [backlogTask, otherTask]);
    const api = createTududiApi(resolvedFetch);
    const { result } = renderHook(() => useSetTaskStatusMutation(api), {
      wrapper,
    });

    await result.current.mutateAsync({ task: backlogTask, status: 'done' });

    // Still there, still in place: only the status changed. Sinking it below
    // the open tasks is the list's job, not the cache's.
    const tasks = queryClient.getQueryData<readonly Task[]>(queryKeys.backlog);
    expect(tasks?.map((task) => task.uid)).toEqual([
      'task-backlog',
      'task-other',
    ]);
    expect(tasks?.[0]?.status).toBe('done');
    expect(tasks?.[1]?.status).toBe(otherTask.status);
  });

  it('restores exactly the failed completion without clobbering concurrent data', async () => {
    let releaseResponse: (() => void) | undefined;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.patch('/api/task/:uid', async () => {
        await responseGate;
        return HttpResponse.json({ error: 'failed' }, { status: 500 });
      }),
    );
    const { queryClient, wrapper } = createHarness();
    const otherTask: Task = {
      ...backlogTask,
      uid: 'task-other',
      title: 'Other',
    };
    queryClient.setQueryData(queryKeys.backlog, [backlogTask, otherTask]);
    const api = createTududiApi(resolvedFetch);
    const { result } = renderHook(() => useSetTaskStatusMutation(api), {
      wrapper,
    });

    const mutation = result.current
      .mutateAsync({ task: backlogTask, status: 'done' })
      .catch((error: unknown) => error);
    await waitFor(() => {
      expect(
        queryClient.getQueryData<readonly Task[]>(queryKeys.backlog)?.[0]
          ?.status,
      ).toBe('done');
    });
    queryClient.setQueryData<readonly Task[]>(
      queryKeys.backlog,
      (current = []) => [...current, concurrentTask],
    );

    releaseResponse?.();
    await expect(mutation).resolves.toBeTruthy();

    const tasks = queryClient.getQueryData<readonly Task[]>(queryKeys.backlog);
    expect(tasks?.map((task) => task.uid)).toEqual([
      'task-backlog',
      'task-other',
      'task-concurrent',
    ]);
    // The failed task goes back to exactly the status it had, in place.
    expect(tasks?.[0]?.status).toBe(backlogTask.status);
  });

  it('reopens a done task and drops it out of the record', async () => {
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.patch('/api/task/:uid', async ({ request }) => {
        const body = (await request.json()) as { status: string };
        return HttpResponse.json({
          uid: backlogTask.uid,
          name: backlogTask.title,
          original_name: backlogTask.title,
          status: body.status,
          priority: 0,
          tags: [],
        });
      }),
    );
    const { queryClient, wrapper } = createHarness();
    const doneTask: Task = { ...backlogTask, status: 'done' };
    queryClient.setQueryData(queryKeys.backlog, [doneTask]);
    queryClient.setQueryData(queryKeys.history, [doneTask]);
    const api = createTududiApi(resolvedFetch);
    const { result } = renderHook(() => useSetTaskStatusMutation(api), {
      wrapper,
    });

    await result.current.mutateAsync({ task: doneTask, status: 'not_started' });

    // The row is open again in both caches. History renders only what is still
    // done, so the record loses it without the cache having to delete it.
    for (const key of [queryKeys.backlog, queryKeys.history]) {
      const tasks = queryClient.getQueryData<readonly Task[]>(key);
      expect(tasks?.map((task) => task.uid)).toEqual(['task-backlog']);
      expect(tasks?.[0]?.status).toBe('not_started');
    }
  });

  it('puts a failed reopen back into the record exactly as it was', async () => {
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.patch('/api/task/:uid', () =>
        HttpResponse.json({ error: 'failed' }, { status: 500 }),
      ),
    );
    const { queryClient, wrapper } = createHarness();
    const doneTask: Task = { ...backlogTask, status: 'done' };
    queryClient.setQueryData(queryKeys.history, [doneTask]);
    queryClient.setQueryData(queryKeys.all, [doneTask, todayTask]);
    queryClient.setQueryData(queryKeys.search('all', 'text:dentist'), [
      doneTask,
    ]);
    const api = createTududiApi(resolvedFetch);
    const { result } = renderHook(() => useSetTaskStatusMutation(api), {
      wrapper,
    });

    await expect(
      result.current
        .mutateAsync({ task: doneTask, status: 'not_started' })
        .catch((error: unknown) => error),
    ).resolves.toBeTruthy();

    expect(
      queryClient.getQueryData<readonly Task[]>(queryKeys.history)?.[0]?.status,
    ).toBe('done');
    expect(queryClient.getQueryData<readonly Task[]>(queryKeys.all)).toEqual([
      doneTask,
      todayTask,
    ]);
    expect(
      queryClient.getQueryData<readonly Task[]>(
        queryKeys.search('all', 'text:dentist'),
      ),
    ).toEqual([doneTask]);
  });

  /*
   * The day's record lives on the open list now, so a done row on screen is
   * often one no cache of open tasks has ever held. Restatusing it in place
   * would take it out of the record and put it into nothing.
   */
  it('puts a task reopened out of the record into the list its status names', async () => {
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.patch('/api/task/:uid', async ({ request }) => {
        const body = (await request.json()) as { status: string };
        return HttpResponse.json({
          uid: backlogTask.uid,
          name: backlogTask.title,
          original_name: backlogTask.title,
          status: body.status,
          priority: 0,
          tags: [],
        });
      }),
    );
    const { queryClient, wrapper } = createHarness();
    const doneTask: Task = {
      ...backlogTask,
      status: 'done',
      completedAt: '2026-09-21T09:00:00.000Z',
    };
    queryClient.setQueryData(queryKeys.history, [doneTask]);
    queryClient.setQueryData(queryKeys.today, [todayTask]);
    const api = createTududiApi(resolvedFetch);
    const { result } = renderHook(() => useSetTaskStatusMutation(api), {
      wrapper,
    });

    await result.current.mutateAsync({ task: doneTask, status: 'planned' });

    // On Today, at the end: the place it already occupied under the open rows.
    const today = queryClient.getQueryData<readonly Task[]>(queryKeys.today);
    expect(today?.map((task) => task.uid)).toEqual([
      'task-today',
      'task-backlog',
    ]);
    expect(today?.[1]?.status).toBe('planned');
    // And no longer carrying a completion it no longer has.
    expect(today?.[1]?.completedAt).toBeUndefined();
    // The record keeps the row until it is drawn, where a task that is not
    // done is simply not shown.
    expect(
      queryClient.getQueryData<readonly Task[]>(queryKeys.history)?.[0]?.status,
    ).toBe('planned');
  });

  it('takes a failed reopen back out of the list it was put into', async () => {
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.patch('/api/task/:uid', () =>
        HttpResponse.json({ error: 'failed' }, { status: 500 }),
      ),
    );
    const { queryClient, wrapper } = createHarness();
    const doneTask: Task = { ...backlogTask, status: 'done' };
    queryClient.setQueryData(queryKeys.history, [doneTask]);
    queryClient.setQueryData(queryKeys.today, [todayTask]);
    const api = createTududiApi(resolvedFetch);
    const { result } = renderHook(() => useSetTaskStatusMutation(api), {
      wrapper,
    });

    await expect(
      result.current
        .mutateAsync({ task: doneTask, status: 'planned' })
        .catch((error: unknown) => error),
    ).resolves.toBeTruthy();

    expect(
      queryClient
        .getQueryData<readonly Task[]>(queryKeys.today)
        ?.map((task) => task.uid),
    ).toEqual(['task-today']);
    expect(
      queryClient.getQueryData<readonly Task[]>(queryKeys.history)?.[0]?.status,
    ).toBe('done');
  });

  /*
   * The open lists answer with open tasks. Asking one again in the moment
   * between the tick and the record's own answer would take the row off the
   * screen and put it back, so only the record is asked.
   */
  it('asks the record again after a tick, and the open list not at all', async () => {
    const requests: string[] = [];
    server.use(
      http.get('/api/tasks', ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        requests.push(status ?? 'today');
        return HttpResponse.json({
          tasks: status === 'done' ? [] : [rawTodayTask],
        });
      }),
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.patch('/api/task/:uid', () =>
        HttpResponse.json({ ...rawTodayTask, status: 2 }),
      ),
    );
    const api = createTududiApi(resolvedFetch);
    const { wrapper } = createHarness();

    const { result } = renderHook(
      () => ({
        today: useQuery(todayQueryOptions(api)),
        record: useQuery(historyQueryOptions(true, api)),
        status: useSetTaskStatusMutation(api),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.today.isSuccess).toBe(true);
      expect(result.current.record.isSuccess).toBe(true);
    });
    expect(requests).toEqual(expect.arrayContaining(['today', 'done']));

    await result.current.status.mutateAsync({
      task: todayTask,
      status: 'done',
    });
    await waitFor(() => {
      expect(requests).toHaveLength(3);
      expect(requests.filter((request) => request === 'done')).toHaveLength(2);
    });
    // And still nothing more once everything has had time to settle.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requests.filter((each) => each === 'today')).toHaveLength(1);
  });

  it('replaces the saved task everywhere it is held, without a refetch', async () => {
    let listRequests = 0;
    server.use(
      http.get('/api/tasks', () => {
        listRequests += 1;
        return HttpResponse.json({ tasks: [rawTodayTask] });
      }),
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.patch('/api/task/:uid', () =>
        HttpResponse.json({ ...rawTaskDetail, original_name: 'Renamed' }),
      ),
    );
    const api = createTududiApi(resolvedFetch);
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData<readonly Task[]>(queryKeys.history, [backlogTask]);

    const { result } = renderHook(
      () => ({
        today: useQuery(todayQueryOptions(api)),
        update: useUpdateTaskMutation(api),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.today.isSuccess).toBe(true);
    });
    expect(listRequests).toBe(1);

    await result.current.update.mutateAsync({
      uid: todayTask.uid,
      edit: {
        title: 'Renamed',
        note: '',
        status: 'planned',
        priority: 'medium',
        projectUid: 'project-work',
        dueDate: '',
        deferUntil: '',
        tags: ['Work'],
      },
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<readonly Task[]>(queryKeys.today)?.[0]?.title,
      ).toBe('Renamed');
    });
    // The detail cache is the same answer, so reopening the page shows it.
    expect(
      queryClient.getQueryData<Task>(queryKeys.task(todayTask.uid))?.title,
    ).toBe('Renamed');
    // A list the task is not in is left exactly as it was.
    expect(
      queryClient.getQueryData<readonly Task[]>(queryKeys.history),
    ).toEqual([backlogTask]);
    /* Stale, so the next load resyncs — but not refetched even though the
       list is on screen, because a status change would take the row off it
       the moment it was saved. */
    expect(queryClient.getQueryState(queryKeys.today)?.isInvalidated).toBe(
      true,
    );
    expect(listRequests).toBe(1);
  });

  it('keeps the entered work when a save is refused', async () => {
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.patch('/api/task/:uid', () =>
        HttpResponse.json(
          { error: 'That task already exists.' },
          { status: 422 },
        ),
      ),
    );
    const api = createTududiApi(resolvedFetch);
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData<readonly Task[]>(queryKeys.today, [todayTask]);

    const { result } = renderHook(() => useUpdateTaskMutation(api), {
      wrapper,
    });
    await expect(
      result.current.mutateAsync({
        uid: todayTask.uid,
        edit: {
          title: 'Renamed',
          note: '',
          status: 'planned',
          priority: 'medium',
          projectUid: '',
          dueDate: '',
          deferUntil: '',
          tags: [],
        },
      }),
    ).rejects.toThrow(
      'Tududi could not accept this change. Check the fields and try again.',
    );

    // Nothing was optimistic, so there is nothing to have put back.
    expect(queryClient.getQueryData<readonly Task[]>(queryKeys.today)).toEqual([
      todayTask,
    ]);
  });

  it('takes a deleted task out of every list and reloads them', async () => {
    let listRequests = 0;
    server.use(
      http.get('/api/tasks', ({ request }) => {
        if (new URL(request.url).searchParams.has('order_by'))
          return HttpResponse.json({ tasks: [] });
        listRequests += 1;
        return HttpResponse.json({
          tasks: listRequests === 1 ? [rawTodayTask] : [],
        });
      }),
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.delete('/api/task/:uid', () =>
        HttpResponse.json({ message: 'Task successfully deleted' }),
      ),
    );
    const api = createTududiApi(resolvedFetch);
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.task(todayTask.uid), todayTask);

    const { result } = renderHook(
      () => ({
        today: useQuery(todayQueryOptions(api)),
        remove: useDeleteTaskMutation(api),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.today.data).toEqual([todayTask]);
    });

    await result.current.remove.mutateAsync({ uid: todayTask.uid });

    // Gone from the list straight away, so the page behind is already right.
    await waitFor(() => {
      expect(
        queryClient.getQueryData<readonly Task[]>(queryKeys.today),
      ).toEqual([]);
    });
    expect(
      queryClient.getQueryData(queryKeys.task(todayTask.uid)),
    ).toBeUndefined();
    // Unlike a save, there is no row left for a reload to pull out from under
    // anyone, so the lists really are fetched again.
    await waitFor(() => {
      expect(listRequests).toBe(2);
    });
  });

  it('moves chosen tasks to Today and corrects both lists at once', async () => {
    const sent: { uid: string; status: unknown }[] = [];
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.get('/api/tasks', () => HttpResponse.json({ tasks: [] })),
      http.patch('/api/task/:uid', async ({ params, request }) => {
        const body = (await request.json()) as { status: unknown };
        sent.push({ uid: String(params.uid), status: body.status });
        return HttpResponse.json({ ...rawTodayTask, uid: String(params.uid) });
      }),
    );
    const api = createTududiApi(resolvedFetch);
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.today, [todayTask]);
    queryClient.setQueryData(queryKeys.backlog, [backlogTask, concurrentTask]);
    queryClient.setQueryData(queryKeys.search('backlog', 'tag:home'), [
      backlogTask,
    ]);

    const { result } = renderHook(() => useMoveTasksToTodayMutation(api), {
      wrapper,
    });
    const outcome = await result.current.mutateAsync({ tasks: [backlogTask] });

    // Today means `planned` to Tududi; nothing else about the task is touched.
    expect(sent).toEqual([{ uid: backlogTask.uid, status: 'planned' }]);
    expect(outcome.failed).toEqual([]);
    expect(outcome.moved.map((task) => task.uid)).toEqual([backlogTask.uid]);

    expect(
      queryClient
        .getQueryData<readonly Task[]>(queryKeys.backlog)
        ?.map((task) => task.uid),
    ).toEqual([concurrentTask.uid]);
    // A backlog search keeps the row, now planned: it moves to Today's group.
    expect(
      queryClient
        .getQueryData<readonly Task[]>(queryKeys.search('backlog', 'tag:home'))
        ?.map((task) => [task.uid, task.status]),
    ).toEqual([[backlogTask.uid, 'planned']]);
    expect(
      queryClient
        .getQueryData<readonly Task[]>(queryKeys.today)
        ?.map((task) => task.uid),
    ).toEqual([todayTask.uid, backlogTask.uid]);
  });

  it('reports a partial move honestly and leaves what failed where it was', async () => {
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.get('/api/tasks', () => HttpResponse.json({ tasks: [] })),
      http.patch('/api/task/:uid', ({ params }) =>
        params.uid === concurrentTask.uid
          ? HttpResponse.json({ error: 'Task not found.' }, { status: 404 })
          : HttpResponse.json({ ...rawTodayTask, uid: String(params.uid) }),
      ),
    );
    const api = createTududiApi(resolvedFetch);
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.backlog, [backlogTask, concurrentTask]);

    const { result } = renderHook(() => useMoveTasksToTodayMutation(api), {
      wrapper,
    });
    const outcome = await result.current.mutateAsync({
      tasks: [backlogTask, concurrentTask],
    });

    expect(outcome.moved.map((task) => task.uid)).toEqual([backlogTask.uid]);
    expect(outcome.failed.map((entry) => entry.task.uid)).toEqual([
      concurrentTask.uid,
    ]);
    // The one that did not move never left the backlog, so there is nothing
    // to put back and the next press retries exactly it.
    expect(
      queryClient
        .getQueryData<readonly Task[]>(queryKeys.backlog)
        ?.map((task) => task.uid),
    ).toEqual([concurrentTask.uid]);
  });

  it('leaves a list it has never loaded to load for real', async () => {
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.get('/api/tasks', () => HttpResponse.json({ tasks: [] })),
      http.patch('/api/task/:uid', ({ params }) =>
        HttpResponse.json({ ...rawTodayTask, uid: String(params.uid) }),
      ),
    );
    const api = createTududiApi(resolvedFetch);
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.backlog, [backlogTask]);

    const { result } = renderHook(() => useMoveTasksToTodayMutation(api), {
      wrapper,
    });
    await result.current.mutateAsync({ tasks: [backlogTask] });

    // Seeding it would hand the Today page one row and call it the list.
    expect(queryClient.getQueryData(queryKeys.today)).toBeUndefined();
  });
});
