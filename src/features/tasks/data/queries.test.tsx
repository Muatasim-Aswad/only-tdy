import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { PropsWithChildren } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  todayQueryOptions,
  useBacklogQuery,
  useSearchQuery,
  useHistoryQuery,
  useProjectsQuery,
  useTaskListQueries,
} from './queries.ts';
import { createTududiApi } from './tududi-api.ts';
import {
  backlogTask,
  rawBacklogTask,
  rawTodayTask,
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
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('Tududi queries', () => {
  it('fetches Today before enabling an empty-Today Backlog', async () => {
    const order: string[] = [];
    server.use(
      http.get('/api/tasks', ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        order.push(type ?? 'missing');
        return type === 'today'
          ? HttpResponse.json({ tasks: [] })
          : HttpResponse.json({ tasks: [rawBacklogTask] });
      }),
    );
    const api = createTududiApi(resolvedFetch);
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useTaskListQueries(api), { wrapper });

    await waitFor(() => {
      expect(result.current.backlog.isSuccess).toBe(true);
    });

    expect(order).toEqual(['today', 'all']);
    expect(result.current.backlog.data?.[0]?.uid).toBe('task-backlog');
  });

  it('never requests Backlog when Today has a visible task', async () => {
    let backlogRequests = 0;
    server.use(
      http.get('/api/tasks', ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (
          type === 'all' &&
          !new URL(request.url).searchParams.has('order_by')
        )
          backlogRequests += 1;
        return HttpResponse.json({ tasks: [rawTodayTask] });
      }),
    );
    const api = createTududiApi(resolvedFetch);
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useTaskListQueries(api), { wrapper });

    await waitFor(() => {
      expect(result.current.today.isSuccess).toBe(true);
    });

    expect(result.current.backlog.fetchStatus).toBe('idle');
    expect(backlogRequests).toBe(0);
  });

  it('fetches projects only after project syntax appears', async () => {
    let projectRequests = 0;
    server.use(
      http.get('/api/projects', () => {
        projectRequests += 1;
        return HttpResponse.json({
          projects: [
            { uid: 'project-home', name: 'Home', description: 'extra' },
          ],
        });
      }),
    );
    const api = createTududiApi(resolvedFetch);
    const { wrapper } = createHarness();
    const { result, rerender } = renderHook(
      ({ input }) => useProjectsQuery(input, api),
      { initialProps: { input: 'Book dentist' }, wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(projectRequests).toBe(0);

    rerender({ input: 'Book dentist +' });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(projectRequests).toBe(1);
    expect(result.current.data).toEqual([
      { uid: 'project-home', name: 'Home' },
    ]);
  });

  it.each([
    [401, 'expired session'],
    [400, 'validation failure'],
  ])('does not retry %s query responses (%s)', async (status) => {
    let requests = 0;
    server.use(
      http.get('/api/tasks', () => {
        requests += 1;
        return HttpResponse.json({ error: 'rejected' }, { status });
      }),
    );
    const { queryClient } = createHarness();

    await expect(
      queryClient.query(todayQueryOptions(createTududiApi(resolvedFetch))),
    ).rejects.toBeTruthy();
    expect(requests).toBe(1);
  });

  it('asks for completed tasks newest first, and only once history is open', async () => {
    const requested: string[] = [];
    server.use(
      http.get('/api/tasks', ({ request }) => {
        requested.push(new URL(request.url).search);
        return HttpResponse.json({
          tasks: [{ ...rawBacklogTask, status: 2 }],
        });
      }),
    );
    const api = createTududiApi(resolvedFetch);
    const { wrapper } = createHarness();
    const { result, rerender } = renderHook(
      ({ enabled }) => useHistoryQuery(enabled, api),
      { initialProps: { enabled: false }, wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(requested).toEqual([]);

    rerender({ enabled: true });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(requested).toHaveLength(1);
    const params = new URLSearchParams(requested[0]);
    expect(params.get('type')).toBe('all');
    expect(params.get('status')).toBe('done');
    expect(params.get('order_by')).toBe('completed_at:desc');
    expect(params.get('limit')).toBe('50');
    expect(result.current.data?.[0]?.status).toBe('done');
  });

  it('asks for the whole backlog on its own page, whatever Today holds', async () => {
    const requested: string[] = [];
    server.use(
      http.get('/api/tasks', ({ request }) => {
        requested.push(new URL(request.url).search);
        return HttpResponse.json({ tasks: [rawBacklogTask] });
      }),
    );
    const api = createTududiApi(resolvedFetch);
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useBacklogQuery(true, api), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // No Today request preceded it: the page asks for the backlog directly.
    expect(requested).toHaveLength(1);
    expect(new URLSearchParams(requested[0]).get('order_by')).toBeNull();
    expect(result.current.data).toEqual([backlogTask]);
  });

  it('sends each kind of term to the endpoint that can answer it', async () => {
    const asked: string[] = [];
    server.use(
      http.get('/api/tasks', ({ request }) => {
        asked.push(`tasks${new URL(request.url).search}`);
        return HttpResponse.json({ tasks: [rawBacklogTask] });
      }),
      http.get('/api/search', ({ request }) => {
        asked.push(`search${new URL(request.url).search}`);
        return HttpResponse.json({
          results: [{ type: 'Task', ...rawBacklogTask }],
        });
      }),
    );
    const api = createTududiApi(resolvedFetch);
    const { wrapper } = createHarness();

    for (const request of [
      { kind: 'tag', name: 'home' },
      { kind: 'project', projectUid: 'project-work' },
      { kind: 'text', query: 'dentist' },
    ] as const) {
      const { result } = renderHook(
        () => useSearchQuery('backlog', request, api),
        {
          wrapper,
        },
      );
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual([backlogTask]);
    }

    expect(asked.map((entry) => entry.split('?')[0])).toEqual([
      'tasks',
      'tasks',
      'search',
    ]);
  });

  /* Each of the three sends nothing: no term, a name still being looked up,
     and a name that matches no project. */
  it('asks nothing at all for a term that cannot be sent', () => {
    let requests = 0;
    server.use(
      http.get('/api/tasks', () => {
        requests += 1;
        return HttpResponse.json({ tasks: [] });
      }),
      http.get('/api/search', () => {
        requests += 1;
        return HttpResponse.json({ results: [] });
      }),
    );
    const api = createTududiApi(resolvedFetch);
    const { wrapper } = createHarness();

    for (const request of [
      { kind: 'none' },
      { kind: 'pending' },
      { kind: 'refused', message: 'No project named “Hous”.' },
    ] as const) {
      const { result } = renderHook(
        () => useSearchQuery('backlog', request, api),
        {
          wrapper,
        },
      );
      expect(result.current.fetchStatus).toBe('idle');
    }

    expect(requests).toBe(0);
  });
});
