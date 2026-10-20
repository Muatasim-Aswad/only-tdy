import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createTududiApi } from './tududi-api.ts';
import { currentDate, resolveDate } from '../domain/task-dates.ts';
import {
  backlogDraft,
  backlogTask,
  rawBacklogTask,
  rawTaskDetail,
  rawTodayTask,
} from './testing/fixtures.ts';

const server = setupServer(
  http.get('/api/profile', () => HttpResponse.json({ timezone: 'UTC' })),
  http.get('/api/task/:uid', ({ params }) =>
    HttpResponse.json({ ...rawTaskDetail, uid: params.uid }),
  ),
);

function absoluteInput(input: RequestInfo | URL): RequestInfo | URL {
  return typeof input === 'string'
    ? new URL(input, window.location.origin)
    : input;
}

const resolvedFetch: typeof fetch = (input, init) => {
  return globalThis.fetch(absoluteInput(input), init);
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('Tududi API', () => {
  it('applies date rules using the injected clock and transport', async () => {
    const transport = {
      request: vi.fn(() => Promise.resolve({ timezone: 'UTC' })),
      mutate: vi.fn(() => Promise.resolve(rawBacklogTask)),
      clearCsrfToken: vi.fn(),
    };
    const api = createTududiApi(undefined, {
      transport,
      now: () => new Date('2020-01-01T12:00:00Z'),
    });
    await api.createTask({ ...backlogDraft, dueDate: '2021-01-01' });
    expect(transport.mutate).toHaveBeenCalledWith(
      '/api/task',
      'POST',
      expect.objectContaining({
        status: 'not_started',
        due_date: '2021-01-01',
      }),
    );
  });

  it('reads every All page, keeps hidden and completed tasks, and skips unsupported statuses', async () => {
    const offsets: string[] = [];
    const first = Array.from({ length: 50 }, (_, index) => ({
      ...rawBacklogTask,
      uid: `open-${String(index)}`,
      defer_until: '2099-01-01T00:00:00.000Z',
    }));
    server.use(
      http.get('/api/tasks', ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('status')).toBe('all');
        expect(params.get('limit')).toBe('50');
        offsets.push(params.get('offset') ?? '');
        return params.get('offset') === '0'
          ? HttpResponse.json({ tasks: first, pagination: { hasMore: true } })
          : HttpResponse.json({
              tasks: [
                { ...rawTodayTask, status: 2 },
                { uid: 'archived', status: 3 },
                { uid: 'cancelled', status: 5 },
              ],
              pagination: { hasMore: false },
            });
      }),
    );

    const tasks = await createTududiApi(resolvedFetch).fetchAllTasks();
    expect(tasks).toHaveLength(51);
    expect(tasks[0]?.deferUntil).toBe('2099-01-01T00:00:00.000Z');
    expect(tasks.at(-1)?.status).toBe('done');
    expect(offsets).toEqual(['0', '50']);
  });

  it('reads every All text-search page without hiding open or deferred results', async () => {
    const offsets: string[] = [];
    server.use(
      http.get('/api/search', ({ request }) => {
        const params = new URL(request.url).searchParams;
        offsets.push(params.get('offset') ?? '');
        expect(params.get('q')).toBe('dentist');
        const results =
          params.get('offset') === '0'
            ? [{ type: 'Task', ...rawBacklogTask, defer_until: '2099-01-01' }]
            : [{ type: 'Task', ...rawTodayTask, status: 2 }];
        return HttpResponse.json({
          results,
          pagination: { hasMore: offsets.length === 1 },
        });
      }),
    );

    const tasks = await createTududiApi(resolvedFetch).searchAllTasks({
      kind: 'text',
      query: 'dentist',
    });
    expect(tasks.map((task) => task.status)).toEqual(['not_started', 'done']);
    expect(offsets).toEqual(['0', '1']);
  });

  it('refuses a non-advancing All page instead of reading it forever', async () => {
    server.use(
      http.get('/api/tasks', () =>
        HttpResponse.json({
          tasks: [{ ...rawBacklogTask }],
          pagination: { hasMore: true },
        }),
      ),
    );
    await expect(
      createTududiApi(resolvedFetch).fetchAllTasks(),
    ).rejects.toThrow('Tududi did not advance to the next task page.');
  });

  it('saves a changed future deadline and Backlog status together in one PATCH', async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.patch('/api/task/:uid', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        bodies.push(body);
        return HttpResponse.json({
          ...rawTaskDetail,
          status: 0,
          due_date: body.due_date,
        });
      }),
    );
    const future = resolveDate('+7', { timezone: 'UTC' }) ?? '';
    await createTududiApi(resolvedFetch).updateTask(
      'task-today',
      {
        title: 'Task',
        note: '',
        status: 'planned',
        priority: 'low',
        projectUid: '',
        dueDate: future,
        deferUntil: '',
        tags: [],
      },
      currentDate({ timezone: 'UTC' }),
    );
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      status: 'not_started',
      due_date: future,
      defer_until: null,
    });
  });

  it('reads every due page before moving tasks and clears defer in each promotion', async () => {
    const events: string[] = [];
    const today = currentDate({ timezone: 'UTC' });
    const tasks = Array.from({ length: 51 }, (_, index) => ({
      ...rawBacklogTask,
      uid: `due-${String(index)}`,
      due_date: today,
      defer_until: '9999-12-31T00:00:00Z',
    }));
    server.use(
      http.get('/api/tasks', ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('order_by')).toBe('due_date:asc');
        const offset = Number(params.get('offset'));
        events.push(`read:${String(offset)}`);
        return HttpResponse.json({
          tasks: tasks.slice(offset, offset + 50),
          pagination: { hasMore: offset + 50 < tasks.length },
        });
      }),
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token' }),
      ),
      http.patch('/api/task/:uid', async ({ request, params }) => {
        expect(await request.json()).toEqual({
          status: 'planned',
          defer_until: null,
        });
        events.push(`write:${String(params.uid)}`);
        return HttpResponse.json({
          ...rawTodayTask,
          uid: params.uid,
          due_date: today,
        });
      }),
    );
    expect(await createTududiApi(resolvedFetch).syncDueTasks()).toHaveLength(
      51,
    );
    expect(events.slice(0, 2)).toEqual(['read:0', 'read:50']);
  });

  it('hides future Backlog dates while keeping Today tasks visible in search', async () => {
    server.use(
      http.get('/api/tasks', () =>
        HttpResponse.json({
          tasks: [
            rawBacklogTask,
            {
              ...rawBacklogTask,
              uid: 'hidden',
              defer_until: '9999-12-31T00:00:00Z',
            },
          ],
        }),
      ),
      http.get('/api/search', () =>
        HttpResponse.json({
          results: [
            {
              type: 'Task',
              ...rawTodayTask,
              defer_until: '9999-12-31T00:00:00Z',
            },
            {
              type: 'Task',
              ...rawBacklogTask,
              defer_until: '9999-12-31T00:00:00Z',
            },
          ],
        }),
      ),
    );
    const api = createTududiApi(resolvedFetch);
    expect((await api.fetchBacklogTasks()).map((task) => task.uid)).toEqual([
      rawBacklogTask.uid,
    ]);
    expect(
      (await api.searchOpenTasks({ kind: 'text', query: 'Task' })).map(
        (task) => task.uid,
      ),
    ).toEqual([rawTodayTask.uid]);
  });
  it('uses same-origin credentials and preserves Today semantics and order', async () => {
    let credentials: RequestCredentials | undefined;
    server.use(
      http.get('/api/tasks', ({ request }) => {
        credentials = request.credentials;
        const todayUrl = new URL(request.url);
        expect(todayUrl.searchParams.get('type')).toBe('today');
        expect(todayUrl.searchParams.get('limit')).toBe('50');
        return HttpResponse.json({
          tasks: [
            rawTodayTask,
            { ...rawTodayTask, uid: 'progress', status: 1 },
            { ...rawTodayTask, uid: 'waiting', status: 4 },
            {
              ...rawTodayTask,
              uid: 'recurring',
              status: 0,
              recurring_parent_uid: 'parent',
            },
          ],
        });
      }),
    );

    const tasks = await createTududiApi(resolvedFetch).fetchTodayTasks();

    expect(credentials).toBe('include');
    expect(tasks.map((task) => task.uid)).toEqual([
      'task-today',
      'progress',
      'waiting',
      'recurring',
    ]);
  });

  it('requests active tasks for Backlog and keeps not_started and done', async () => {
    server.use(
      http.get('/api/tasks', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('type')).toBe('all');
        expect(url.searchParams.get('status')).toBe('active');
        expect(url.searchParams.get('limit')).toBe('50');
        return HttpResponse.json({
          tasks: [
            rawBacklogTask,
            { ...rawTodayTask, uid: 'progress', status: 1 },
            { ...rawBacklogTask, uid: 'ticked', status: 2 },
            { ...rawBacklogTask, uid: 'older' },
          ],
        });
      }),
    );

    const tasks = await createTududiApi(resolvedFetch).fetchBacklogTasks();
    // A task ticked off in this session stays in the list; only tasks that were
    // never in Backlog to begin with are filtered out.
    expect(tasks.map((task) => task.uid)).toEqual([
      'task-backlog',
      'ticked',
      'older',
    ]);
  });

  it('deduplicates concurrent CSRF requests and sends the exact create body', async () => {
    let csrfRequests = 0;
    const postedBodies: unknown[] = [];
    server.use(
      http.get('/api/csrf-token', ({ request }) => {
        csrfRequests += 1;
        expect(request.credentials).toBe('include');
        return HttpResponse.json({ csrfToken: 'shared-token' });
      }),
      http.post('/api/task', async ({ request }) => {
        expect(request.credentials).toBe('include');
        expect(request.headers.get('x-csrf-token')).toBe('shared-token');
        postedBodies.push(await request.json());
        return HttpResponse.json(rawBacklogTask, { status: 201 });
      }),
    );
    const api = createTududiApi(resolvedFetch);

    await Promise.all([
      api.createTask(backlogDraft),
      api.createTask(backlogDraft),
    ]);

    expect(csrfRequests).toBe(1);
    expect(postedBodies).toEqual([
      {
        name: 'Book dentist',
        status: 'not_started',
        priority: 'low',
        tags: [],
      },
      {
        name: 'Book dentist',
        status: 'not_started',
        priority: 'low',
        tags: [],
      },
    ]);
  });

  it('sends a drafted note with the task it belongs to', async () => {
    let posted: unknown;
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'shared-token' }),
      ),
      http.post('/api/task', async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(rawBacklogTask, { status: 201 });
      }),
    );

    await createTududiApi(resolvedFetch).createTask({
      ...backlogDraft,
      note: 'ask about the boiler',
    });

    expect(posted).toMatchObject({ note: 'ask about the boiler' });
  });

  it('refreshes CSRF once after rejection and retries the mutation once', async () => {
    let csrfRequests = 0;
    let mutationRequests = 0;
    server.use(
      http.get('/api/csrf-token', () => {
        csrfRequests += 1;
        return HttpResponse.json({
          csrfToken: `token-${String(csrfRequests)}`,
        });
      }),
      http.patch('/api/task/:uid', async ({ request, params }) => {
        mutationRequests += 1;
        expect(params.uid).toBe('task-today');
        expect(request.headers.get('x-csrf-token')).toBe(
          `token-${String(mutationRequests)}`,
        );
        expect(await request.json()).toEqual({ status: 'done' });
        if (mutationRequests === 1) {
          return HttpResponse.json(
            { error: 'invalid csrf token' },
            { status: 403 },
          );
        }
        return HttpResponse.json({ ...rawTodayTask, status: 2 });
      }),
    );

    await expect(
      createTududiApi(resolvedFetch).setTaskStatus('task-today', 'done'),
    ).resolves.toMatchObject({ uid: 'task-today', status: 'done' });
    expect(csrfRequests).toBe(2);
    expect(mutationRequests).toBe(2);
  });

  it.each([
    [401, 'unauthorized'],
    [400, 'validation'],
  ] as const)('does not retry a %s mutation response', async (status, kind) => {
    let csrfRequests = 0;
    let mutationRequests = 0;
    server.use(
      http.get('/api/csrf-token', () => {
        csrfRequests += 1;
        return HttpResponse.json({ csrfToken: 'token' });
      }),
      http.post('/api/task', () => {
        mutationRequests += 1;
        return HttpResponse.json({ error: 'rejected' }, { status });
      }),
    );

    const result = createTududiApi(resolvedFetch).createTask(backlogDraft);
    await expect(result).rejects.toMatchObject({ kind, status });
    expect(csrfRequests).toBe(1);
    expect(mutationRequests).toBe(1);
  });

  it('fetches one task in full for its own page', async () => {
    server.use(
      http.get('/api/task/:uid', ({ params }) => {
        expect(params.uid).toBe('task-today');
        return HttpResponse.json(rawTaskDetail);
      }),
    );

    const task = await createTududiApi(resolvedFetch).fetchTask('task-today');

    expect(task.title).toBe('Write status update');
    expect(task.note).toBe('Attach the timesheet.');
    expect(task.dueDate).toBe('2026-10-01');
    expect(task.projectUid).toBe('project-work');
  });

  it('names a task that is not there rather than calling it a server error', async () => {
    server.use(
      http.get('/api/task/:uid', () =>
        HttpResponse.json({ error: 'Task not found.' }, { status: 404 }),
      ),
    );

    await expect(
      createTududiApi(resolvedFetch).fetchTask('gone'),
    ).rejects.toMatchObject({
      kind: 'not-found',
      message: 'That task is gone.',
    });
  });

  it('clears emptied editable fields', async () => {
    let body: unknown;
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.patch('/api/task/:uid', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(rawTaskDetail);
      }),
    );

    await createTududiApi(resolvedFetch).updateTask('task-today', {
      title: 'Write the status update',
      note: '',
      status: 'waiting',
      priority: 'high',
      projectUid: '',
      dueDate: '',
      deferUntil: '',
      tags: [],
    });

    expect(body).toEqual({
      name: 'Write the status update',
      note: '',
      status: 'waiting',
      priority: 'high',
      project_uid: '',
      due_date: '',
      defer_until: null,
      tags: [],
    });
  });

  it.each([
    ['saving unrelated details', '14:30', '2026-10-01', '14:30'],
    ['changing the due date', '14:30', '2026-11-03', '14:30'],
    ['clearing the due date', '14:30', '', null],
    ['changing an all-day date', null, '2026-11-03', null],
  ] as const)(
    'keeps due-time semantics when %s',
    async (_action, initialTime, dueDate, dueTime) => {
      let stored = { ...rawTaskDetail, due_time: initialTime as string | null };
      server.use(
        http.get('/api/csrf-token', () =>
          HttpResponse.json({ csrfToken: 'token' }),
        ),
        http.get('/api/task/:uid', () => HttpResponse.json(stored)),
        http.patch('/api/task/:uid', async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          stored = {
            ...stored,
            ...(typeof body.name === 'string' ? { name: body.name } : {}),
            ...(body.due_date === undefined
              ? {}
              : {
                  due_date:
                    typeof body.due_date === 'string' ? body.due_date : '',
                  due_time:
                    typeof body.due_time === 'string' ? body.due_time : null,
                }),
          };
          return HttpResponse.json(stored);
        }),
      );
      const api = createTududiApi(resolvedFetch, {
        now: () => new Date('2026-10-01T12:00:00Z'),
      });
      const before = await api.fetchTask('task-today');
      await api.updateTask(
        before.uid,
        {
          title: 'Updated title',
          note: 'Updated notes',
          status: before.status,
          priority: 'high',
          projectUid: before.projectUid,
          dueDate,
          deferUntil: before.deferUntil,
          tags: ['edited'],
        },
        before.dueDate,
        before.status,
      );
      const saved = (await (
        await resolvedFetch('/api/task/task-today')
      ).json()) as {
        readonly due_date: string;
        readonly due_time: string | null;
      };
      expect(saved.due_date).toBe(dueDate);
      expect(saved.due_time).toBe(dueTime);
    },
  );

  it('does not save a task when reading its existing due time fails', async () => {
    let writes = 0;
    server.use(
      http.get('/api/task/:uid', () =>
        HttpResponse.json({ error: 'Unavailable' }, { status: 503 }),
      ),
      http.patch('/api/task/:uid', () => {
        writes += 1;
        return HttpResponse.json(rawTaskDetail);
      }),
    );
    await expect(
      createTududiApi(resolvedFetch).updateTask(
        'task-today',
        {
          title: 'Updated task',
          note: '',
          status: 'not_started',
          priority: 'low',
          projectUid: '',
          dueDate: '2030-01-20',
          deferUntil: '',
          tags: [],
        },
        '2030-01-19',
      ),
    ).rejects.toMatchObject({ status: 503, kind: 'http' });
    expect(writes).toBe(0);
  });

  it('sends Hide until as midnight in the account timezone', async () => {
    let body: { readonly defer_until?: unknown } | undefined;
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.patch('/api/task/:uid', async ({ request }) => {
        body = (await request.json()) as { readonly defer_until?: unknown };
        return HttpResponse.json(rawTaskDetail);
      }),
    );

    await createTududiApi(resolvedFetch).updateTask('task-today', {
      title: 'Write status update',
      note: '',
      status: 'not_started',
      priority: 'low',
      projectUid: '',
      dueDate: '',
      deferUntil: '2026-09-28',
      tags: [],
    });

    expect(body?.defer_until).toBe('2026-09-28T00:00:00.000Z');
  });

  it('deletes a task through the guarded verb', async () => {
    let method: string | undefined;
    let csrf: string | null | undefined;
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.delete('/api/task/:uid', ({ request }) => {
        method = request.method;
        csrf = request.headers.get('x-csrf-token');
        return HttpResponse.json({ message: 'Task successfully deleted' });
      }),
    );

    await expect(
      createTududiApi(resolvedFetch).deleteTask('task-today'),
    ).resolves.toBeUndefined();
    expect(method).toBe('DELETE');
    expect(csrf).toBe('token-1');
  });

  it('retries a delete once the CSRF token is refused', async () => {
    let tokens = 0;
    let attempts = 0;
    server.use(
      http.get('/api/csrf-token', () => {
        tokens += 1;
        return HttpResponse.json({ csrfToken: `token-${String(tokens)}` });
      }),
      http.delete('/api/task/:uid', () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
          : HttpResponse.json({ message: 'Task successfully deleted' });
      }),
    );

    await createTududiApi(resolvedFetch).deleteTask('task-today');

    expect(attempts).toBe(2);
    expect(tokens).toBe(2);
  });

  it('keeps Tududi\u2019s own message on a refused save', async () => {
    server.use(
      http.get('/api/csrf-token', () =>
        HttpResponse.json({ csrfToken: 'token-1' }),
      ),
      http.patch('/api/task/:uid', () =>
        HttpResponse.json(
          { error: 'Defer until date cannot be after the due date.' },
          { status: 400 },
        ),
      ),
    );

    await expect(
      createTududiApi(resolvedFetch).updateTask('task-today', {
        title: 'Write status update',
        note: '',
        status: 'planned',
        priority: 'low',
        projectUid: '',
        dueDate: '2026-09-01',
        deferUntil: '2026-09-28T09:30',
        tags: [],
      }),
    ).rejects.toMatchObject({
      kind: 'validation',
      status: 400,
      message:
        'Tududi could not accept this change. Check the fields and try again.',
    });
  });

  it('narrows the backlog with Tududi’s own filters, spelled its way', async () => {
    const asked: string[] = [];
    server.use(
      http.get('/api/tasks', ({ request }) => {
        asked.push(new URL(request.url).search);
        return HttpResponse.json({ tasks: [rawBacklogTask] });
      }),
    );

    const api = createTududiApi(resolvedFetch);
    expect(
      await api.searchOpenTasks({ kind: 'tag', name: 'next actions' }),
    ).toEqual([backlogTask]);
    expect(
      await api.searchOpenTasks({
        kind: 'project',
        projectUid: 'project-work',
      }),
    ).toEqual([backlogTask]);
    expect(
      await api.searchOpenTasks({ kind: 'priority', priority: 'medium' }),
    ).toEqual([backlogTask]);

    // The same backlog request either way, with one filter appended to it.
    for (const search of asked) {
      const params = new URLSearchParams(search);
      expect(params.get('type')).toBe('all');
      expect(params.get('status')).toBe('active');
      expect(params.get('limit')).toBe('50');
    }
    expect(new URLSearchParams(asked[0]).get('tag')).toBe('next actions');
    expect(new URLSearchParams(asked[1]).get('project_uid')).toBe(
      'project-work',
    );
    expect(new URLSearchParams(asked[2]).get('priority')).toBe('medium');
  });

  it('counts the record under a filter from one row and its total', async () => {
    let asked: URLSearchParams | undefined;
    server.use(
      http.get('/api/tasks', ({ request }) => {
        asked = new URL(request.url).searchParams;
        return HttpResponse.json({ tasks: [], pagination: { total: 7 } });
      }),
    );

    const count = await createTududiApi(resolvedFetch).countDoneTasks({
      kind: 'tag',
      name: 'finance',
    });

    expect(count).toBe(7);
    expect(asked?.get('status')).toBe('done');
    expect(asked?.get('limit')).toBe('1');
    expect(asked?.get('tag')).toBe('finance');
  });

  it('asks the one text search Tududi has, narrowed to whole tasks', async () => {
    let asked: URLSearchParams | undefined;
    server.use(
      http.get('/api/search', ({ request }) => {
        asked = new URL(request.url).searchParams;
        return HttpResponse.json({
          results: [
            { type: 'Task', ...rawBacklogTask },
            // Search answers about every kind of thing and every status.
            { type: 'Task', ...rawTodayTask },
            { type: 'Note', uid: 'note-1', name: 'Book dentist' },
          ],
        });
      }),
    );

    const tasks = await createTududiApi(resolvedFetch).searchOpenTasks({
      kind: 'text',
      query: 'book dentist',
    });

    // Open tasks of both lists; the page splits them by status.
    expect(tasks.map((task) => task.uid)).toEqual([
      backlogTask.uid,
      rawTodayTask.uid,
    ]);
    expect(asked?.get('q')).toBe('book dentist');
    expect(asked?.get('filters')).toBe('Task');
    expect(asked?.get('excludeSubtasks')).toBe('true');
    expect(asked?.get('limit')).toBe('50');
  });
});
