import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { App } from './App.tsx';

const server = setupServer(
  http.get('/api/current_user', () =>
    HttpResponse.json({ user: { uid: 'user-app' } }),
  ),
  http.get('/api/password-auth-status', () =>
    HttpResponse.json({ enabled: true }),
  ),
  http.get('/api/profile', () =>
    HttpResponse.json({
      uid: 'user-app',
      timezone: 'UTC',
      ui_settings: { onlyTdy: {} },
    }),
  ),
  http.patch('/api/profile', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      uid: 'user-app',
      timezone: 'UTC',
      ...(body as object),
    });
  }),
  http.get('/api/tags', () => HttpResponse.json({ tags: [] })),
);

/*
 * The app builds same-origin `/api/` paths, which `fetch` in jsdom will not
 * resolve on its own. The same shim the data tests use makes them absolute.
 */
const originalFetch = globalThis.fetch;
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  originalFetch(
    typeof input === 'string' ? new URL(input, window.location.origin) : input,
    init,
  );

const RAW_TODAY = {
  uid: 'task-invoice',
  name: 'Send the invoice',
  original_name: 'Send the invoice',
  status: 1,
  priority: 2,
  tags: [{ name: 'finance' }],
  Project: { uid: 'project-work', name: 'Work' },
};

const RAW_BACKLOG = {
  uid: 'task-bulb',
  name: 'Replace the hallway bulb',
  original_name: 'Replace the hallway bulb',
  status: 0,
  priority: 0,
  tags: [{ name: 'home' }],
  Project: null,
};

const RAW_DETAIL = {
  ...RAW_TODAY,
  note: 'Attach the timesheet.',
  due_date: '2026-10-01',
  defer_until: null,
  project_uid: 'project-work',
};

type Handler = Parameters<typeof server.use>[number];

/* Overrides go first: msw answers with the first handler that matches. */
function installApi(...overrides: readonly Handler[]) {
  server.use(
    ...overrides,
    http.get('/api/tasks', ({ request }) => {
      const type = new URL(request.url).searchParams.get('type');
      return HttpResponse.json({ tasks: type === 'today' ? [RAW_TODAY] : [] });
    }),
    http.get('/api/projects', () =>
      HttpResponse.json({ projects: [{ uid: 'project-work', name: 'Work' }] }),
    ),
    http.get('/api/csrf-token', () =>
      HttpResponse.json({ csrfToken: 'token-1' }),
    ),
    http.get('/api/task/:uid', () => HttpResponse.json(RAW_DETAIL)),
  );
}

function renderApp(path = '/only-tdy/') {
  window.history.replaceState(null, '', path);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  window.history.replaceState(null, '', '/only-tdy/');
});
afterAll(() => {
  server.close();
  globalThis.fetch = originalFetch;
});

describe('App routing', () => {
  it('opens a task at its own address, with no overlay over the list', async () => {
    const user = userEvent.setup();
    installApi();
    renderApp();

    await user.click(
      await screen.findByRole('link', { name: 'Send the invoice' }),
    );

    expect(window.location.pathname).toBe('/only-tdy/task/task-invoice');
    expect(await screen.findByRole('combobox', { name: 'Title' })).toHaveValue(
      'Send the invoice',
    );
    // The list is gone, not covered.
    expect(
      screen.queryByRole('combobox', { name: 'What needs doing?' }),
    ).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('loads the task straight from its address', async () => {
    installApi();
    renderApp('/only-tdy/task/task-invoice');

    expect(await screen.findByRole('textbox', { name: 'Notes' })).toHaveValue(
      'Attach the timesheet.',
    );
  });

  it('goes back to the list the browser button was pressed from', async () => {
    const user = userEvent.setup();
    installApi();
    renderApp();

    await user.click(
      await screen.findByRole('link', { name: 'Send the invoice' }),
    );
    await screen.findByRole('combobox', { name: 'Title' });

    window.history.replaceState(null, '', '/only-tdy/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(
      await screen.findByRole('combobox', { name: 'What needs doing?' }),
    ).toBeInTheDocument();
  });

  it('keeps a half-typed capture line across the trip into a task', async () => {
    const user = userEvent.setup();
    installApi();
    renderApp();

    const capture = await screen.findByRole('combobox', {
      name: 'What needs doing?',
    });
    await user.type(capture, 'Half a thought');
    await user.click(screen.getByRole('link', { name: 'Send the invoice' }));
    await screen.findByRole('combobox', { name: 'Title' });

    await user.click(screen.getByRole('link', { name: 'Back to the list' }));

    expect(
      await screen.findByRole('combobox', { name: 'What needs doing?' }),
    ).toHaveValue('Half a thought');
  });

  it('gives the record an address of its own', async () => {
    const user = userEvent.setup();
    installApi(
      http.get('/api/tasks', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('status') === 'done') {
          return HttpResponse.json({
            tasks: [{ ...RAW_TODAY, uid: 'task-filed', status: 2 }],
          });
        }
        return HttpResponse.json({
          tasks: url.searchParams.get('type') === 'today' ? [RAW_TODAY] : [],
        });
      }),
    );
    renderApp();

    await user.click(await screen.findByRole('button', { name: 'More' }));
    await user.click(
      await screen.findByRole('button', { name: 'Completed tasks' }),
    );

    expect(window.location.pathname).toBe('/only-tdy/history');
    expect(screen.getByRole('button', { name: 'Completed tasks' })).toHaveClass(
      'focus-history--active',
    );
  });

  it('saves the whole task and returns to the list', async () => {
    const user = userEvent.setup();
    let patched: unknown;
    installApi(
      http.patch('/api/task/:uid', async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ ...RAW_DETAIL, original_name: 'Renamed' });
      }),
    );
    renderApp('/only-tdy/task/task-invoice');

    const title = await screen.findByRole('combobox', { name: 'Title' });
    await user.clear(title);
    await user.type(title, 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByRole('combobox', { name: 'What needs doing?' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/only-tdy/');
    expect(patched).toMatchObject({
      name: 'Renamed',
      note: 'Attach the timesheet.',
    });
  });

  it('refuses an empty title without sending anything or losing the field', async () => {
    const user = userEvent.setup();
    let patches = 0;
    installApi(
      http.patch('/api/task/:uid', () => {
        patches += 1;
        return HttpResponse.json(RAW_DETAIL);
      }),
    );
    renderApp('/only-tdy/task/task-invoice');

    await user.clear(await screen.findByRole('combobox', { name: 'Title' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Type a task before saving it.'),
    ).toBeInTheDocument();
    expect(patches).toBe(0);
  });

  it('deletes only after the second press, then returns to the list', async () => {
    const user = userEvent.setup();
    let deletes = 0;
    installApi(
      http.delete('/api/task/:uid', () => {
        deletes += 1;
        return HttpResponse.json({ message: 'Task successfully deleted' });
      }),
    );
    renderApp('/only-tdy/task/task-invoice');

    await screen.findByRole('combobox', { name: 'Title' });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deletes).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/only-tdy/');
    });
    expect(deletes).toBe(1);
    expect(
      await screen.findByRole('combobox', { name: 'What needs doing?' }),
    ).toBeInTheDocument();
  });

  it('says a task is gone rather than offering to fetch it again', async () => {
    installApi(
      http.get('/api/task/:uid', () =>
        HttpResponse.json({ error: 'Task not found.' }, { status: 404 }),
      ),
    );
    renderApp('/only-tdy/task/missing');

    expect(await screen.findByText('That task is gone.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('replaces the task with the way back in for an expired session', async () => {
    installApi(
      http.get('/api/task/:uid', () =>
        HttpResponse.json({ error: 'Session expired' }, { status: 401 }),
      ),
    );
    renderApp('/only-tdy/task/task-invoice');

    expect(
      await screen.findByText('Your Tududi session expired.'),
    ).toBeInTheDocument();
  });

  it('gives the backlog an address, a page, and its own mark', async () => {
    const user = userEvent.setup();
    installApi(
      http.get('/api/tasks', ({ request }) => {
        const url = new URL(request.url);
        return HttpResponse.json({
          tasks:
            url.searchParams.get('type') === 'today'
              ? [RAW_TODAY]
              : [RAW_BACKLOG],
        });
      }),
    );
    renderApp();

    // Today has tasks, so the list page never shows the backlog on its own.
    await screen.findByText('Send the invoice');
    expect(screen.queryByText('Replace the hallway bulb')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Backlog' }));

    expect(window.location.pathname).toBe('/only-tdy/backlog');
    expect(
      await screen.findByText('Replace the hallway bulb'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Backlog' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The capture field is not on this page; the search field is.
    expect(
      screen.queryByRole('combobox', { name: 'What needs doing?' }),
    ).toBeNull();
    expect(
      screen.getByRole('combobox', { name: 'Search the backlog' }),
    ).toHaveAttribute('placeholder', '.....');
  });

  it('comes home when the lit mark is pressed again', async () => {
    const user = userEvent.setup();
    installApi(
      http.get('/api/tasks', ({ request }) =>
        HttpResponse.json({
          tasks:
            new URL(request.url).searchParams.get('type') === 'today'
              ? [RAW_TODAY]
              : [RAW_BACKLOG],
        }),
      ),
    );
    renderApp('/only-tdy/backlog');

    await screen.findByText('Replace the hallway bulb');
    await user.click(screen.getByRole('button', { name: 'Backlog' }));

    expect(window.location.pathname).toBe('/only-tdy/');
    expect(await screen.findByText('Send the invoice')).toBeInTheDocument();
  });

  it('sends each search to the endpoint that can answer it', async () => {
    const user = userEvent.setup();
    const asked: string[] = [];
    installApi(
      http.get('/api/tasks', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('type') === 'today') {
          return HttpResponse.json({ tasks: [RAW_TODAY] });
        }
        asked.push(
          `tasks ${url.searchParams.get('tag') ?? '-'} ${url.searchParams.get('project_uid') ?? '-'}`,
        );
        return HttpResponse.json({ tasks: [RAW_BACKLOG] });
      }),
      http.get('/api/search', ({ request }) => {
        asked.push(
          `search ${new URL(request.url).searchParams.get('q') ?? ''}`,
        );
        return HttpResponse.json({
          results: [{ type: 'Task', ...RAW_BACKLOG }],
        });
      }),
    );
    renderApp('/only-tdy/backlog');

    const field = await screen.findByRole('combobox', {
      name: 'Search the backlog',
    });
    await screen.findByText('Replace the hallway bulb');

    await user.type(field, '#home{Enter}');
    await waitFor(() => {
      expect(asked).toContain('tasks home -');
    });

    await user.clear(field);
    await user.type(field, '+Work{Enter}');
    await waitFor(() => {
      expect(asked).toContain('tasks - project-work');
    });

    await user.clear(field);
    await user.type(field, 'bulb{Enter}');
    await waitFor(() => {
      expect(asked).toContain('search bulb');
    });
  });

  /*
   * Tududi answers a project filter it cannot resolve with the whole list, so
   * the request must never leave: only-tdy would otherwise show every backlog
   * task as though the name had matched all of them.
   */
  it('refuses a project name that matches nothing, and asks nothing', async () => {
    const user = userEvent.setup();
    let filtered = 0;
    installApi(
      http.get('/api/tasks', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('project_uid') !== null) filtered += 1;
        return HttpResponse.json({
          tasks:
            url.searchParams.get('type') === 'today'
              ? [RAW_TODAY]
              : [RAW_BACKLOG],
        });
      }),
    );
    renderApp('/only-tdy/backlog');

    const field = await screen.findByRole('combobox', {
      name: 'Search the backlog',
    });
    await screen.findByText('Replace the hallway bulb');
    await user.type(field, '+Hous{Enter}');

    expect(
      await screen.findByText('No project named “Hous”.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Nothing in the backlog matches that.'),
    ).toBeInTheDocument();
    expect(filtered).toBe(0);
  });

  it('restores the whole backlog the moment the field is emptied', async () => {
    const user = userEvent.setup();
    installApi(
      http.get('/api/tasks', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('type') === 'today') {
          return HttpResponse.json({ tasks: [RAW_TODAY] });
        }
        return HttpResponse.json({
          tasks: url.searchParams.get('tag') === 'nothing' ? [] : [RAW_BACKLOG],
        });
      }),
    );
    renderApp('/only-tdy/backlog');

    const field = await screen.findByRole('combobox', {
      name: 'Search the backlog',
    });
    await screen.findByText('Replace the hallway bulb');

    await user.type(field, '#nothing{Enter}');
    expect(
      await screen.findByText('Nothing in the backlog matches that.'),
    ).toBeInTheDocument();

    await user.clear(field);

    expect(
      await screen.findByText('Replace the hallway bulb'),
    ).toBeInTheDocument();
  });

  it('moves a chosen task to Today and takes it out of the backlog', async () => {
    const user = userEvent.setup();
    let patched: { uid: string; status: unknown } | undefined;
    installApi(
      http.get('/api/tasks', ({ request }) =>
        HttpResponse.json({
          tasks:
            new URL(request.url).searchParams.get('type') === 'today'
              ? [RAW_TODAY]
              : patched === undefined
                ? [RAW_BACKLOG]
                : [],
        }),
      ),
      http.patch('/api/task/:uid', async ({ params, request }) => {
        const body = (await request.json()) as { status: unknown };
        patched = { uid: String(params.uid), status: body.status };
        return HttpResponse.json({ ...RAW_BACKLOG, status: 6 });
      }),
    );
    renderApp('/only-tdy/backlog');

    await user.click(
      await screen.findByRole('button', {
        name: 'Add “Replace the hallway bulb” to Today',
      }),
    );
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Move to Today' }));

    await waitFor(() => {
      expect(patched).toEqual({ uid: 'task-bulb', status: 'planned' });
    });
    expect(
      await screen.findByText('Nothing waiting in the backlog.'),
    ).toBeInTheDocument();
    // Nothing is chosen any more, so the line has nothing to offer.
    expect(screen.queryByRole('button', { name: 'Move to Today' })).toBeNull();
  });

  it('keeps a refused move recoverable, chosen, and named', async () => {
    const user = userEvent.setup();
    installApi(
      http.get('/api/tasks', ({ request }) =>
        HttpResponse.json({
          tasks:
            new URL(request.url).searchParams.get('type') === 'today'
              ? [RAW_TODAY]
              : [RAW_BACKLOG],
        }),
      ),
      http.patch('/api/task/:uid', () =>
        HttpResponse.json({ error: 'Task not found.' }, { status: 404 }),
      ),
    );
    renderApp('/only-tdy/backlog');

    await user.click(
      await screen.findByRole('button', {
        name: 'Add “Replace the hallway bulb” to Today',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Move to Today' }));

    expect(
      await screen.findByText('Nothing moved. Try again.'),
    ).toBeInTheDocument();
    // Still on the backlog, still chosen, still one press from retrying.
    expect(
      screen.getByRole('button', {
        name: 'Leave “Replace the hallway bulb” in Backlog',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Move to Today' })).toBeEnabled();
  });
});

it('returns a saved edit to All, even when its status changes', async () => {
  const user = userEvent.setup();
  installApi(
    http.get('/api/tasks', () => HttpResponse.json({ tasks: [RAW_TODAY] })),
    http.patch('/api/task/:uid', () =>
      HttpResponse.json({ ...RAW_DETAIL, status: 0 }),
    ),
  );
  renderApp('/only-tdy/all');
  await user.click(
    await screen.findByRole('link', { name: 'Send the invoice' }),
  );
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Status' }),
    'not_started',
  );
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => {
    expect(window.location.pathname).toBe('/only-tdy/all');
  });
});
