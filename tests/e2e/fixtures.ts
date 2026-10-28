import type { Page, Route } from '@playwright/test';

export const GUIDANCE_LESSONS = [
  'capture',
  'backlog',
  'backlog-tools',
  'today',
  'editor',
  'compact',
  'switch',
  'tokens',
  'more',
  'all',
  'reference',
] as const;
export const GUIDANCE_COMPLETE = JSON.stringify({
  version: 1,
  done: GUIDANCE_LESSONS,
  used: [],
  later: {},
  startedVisit: 'fixture-complete',
});

export interface ApiScenario {
  readonly confirmLanguage?: boolean;
  readonly today?: readonly RawTask[];
  readonly backlog?: readonly RawTask[];
  readonly history?: readonly RawTask[];
  readonly all?: readonly RawTask[];
  readonly todayStatus?: number;
  readonly backlogStatus?: number;
  readonly projects?: readonly RawProject[];
  /** Tag names the suggestion lists complete against. */
  readonly tags?: readonly string[];
  /** What `GET /api/search` answers with, wrapped as that endpoint wraps it. */
  readonly searchResults?: readonly RawTask[];
}

/** One task in full, as `GET /api/task/:uid` answers for its own page. */
export interface RawTaskDetail extends RawTask {
  readonly note: string | null;
  readonly due_date: string | null;
  readonly defer_until: string | null;
  readonly project_uid: string | null;
}

export interface RawProject {
  readonly uid: string;
  readonly name: string;
}

export interface RawTask {
  readonly uid: string;
  readonly name: string;
  readonly original_name: string;
  readonly status: number;
  readonly priority: number;
  readonly tags: readonly { readonly name: string }[];
  readonly Project?: { readonly name: string };
  /** When Tududi recorded the task as done. Only completed tasks carry one. */
  readonly completed_at?: string;
  readonly defer_until?: string | null;
}

export const TODAY_TASKS: readonly RawTask[] = [
  {
    uid: 'task-invoice',
    name: 'Send the invoice',
    original_name: 'Send the invoice',
    status: 1,
    priority: 2,
    tags: [{ name: 'finance' }],
    Project: { name: 'Work' },
  },
  {
    uid: 'task-appointment',
    name: 'Book the appointment',
    original_name: 'Book the appointment',
    status: 6,
    priority: 1,
    tags: [],
  },
  {
    uid: 'task-wrap',
    name: 'Read the tenancy agreement end to end and write down every date that needs a reminder before the renewal window closes',
    original_name:
      'Read the tenancy agreement end to end and write down every date that needs a reminder before the renewal window closes',
    status: 4,
    priority: 0,
    tags: [],
  },
];

/** The first Today task, in full, for its own page. */
export const INVOICE_DETAIL: RawTaskDetail = {
  uid: 'task-invoice',
  name: 'Send the invoice',
  original_name: 'Send the invoice',
  status: 1,
  priority: 2,
  tags: [{ name: 'finance' }],
  Project: { name: 'Work' },
  note: 'Attach the signed timesheet.',
  due_date: '2026-10-01',
  defer_until: null,
  project_uid: 'project-work',
};

export const BACKLOG_TASKS: readonly RawTask[] = [
  {
    uid: 'task-bulb',
    name: 'Replace the hallway bulb',
    original_name: 'Replace the hallway bulb',
    status: 0,
    priority: 0,
    tags: [{ name: 'home' }],
  },
  {
    uid: 'task-taps',
    name: 'Descale the bathroom taps',
    original_name: 'Descale the bathroom taps',
    status: 0,
    priority: 1,
    tags: [],
    Project: { name: 'House' },
  },
];

/**
 * Completed tasks as Tududi returns them for history: newest first.
 *
 * Both were finished before today, so the record is the record and nothing
 * here leaks onto the open list. A test that wants the day's own completions
 * says so with `DONE_TODAY`.
 */
export const HISTORY_TASKS: readonly RawTask[] = [
  {
    uid: 'task-filed',
    name: 'File the tax return',
    original_name: 'File the tax return',
    status: 2,
    priority: 1,
    tags: [],
    completed_at: '2026-01-14T16:04:00.000Z',
  },
  {
    uid: 'task-posted',
    name: 'Post the parcel',
    original_name: 'Post the parcel',
    status: 2,
    priority: 0,
    tags: [],
    completed_at: '2026-01-11T09:20:00.000Z',
  },
];

export const FIXTURE_NOW = '2026-10-20T12:00:00Z';

function earlierToday(hour = 9): string {
  const at = new Date(FIXTURE_NOW);
  at.setUTCHours(hour, 0, 0, 0);
  return at.toISOString();
}

/** One task finished today, for the record the open list shows under it. */
export const DONE_TODAY: RawTask = {
  uid: 'task-standup',
  name: 'Run the stand-up',
  original_name: 'Run the stand-up',
  status: 2,
  priority: 1,
  tags: [],
  completed_at: earlierToday(),
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installApi(page: Page, scenario: ApiScenario = {}) {
  await page.route('**/api/tasks?*', (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('type') === 'today') {
      const status = scenario.todayStatus ?? 200;
      return json(
        route,
        status === 200
          ? { tasks: scenario.today ?? TODAY_TASKS }
          : { error: 'Session expired' },
        status,
      );
    }
    if (url.searchParams.get('status') === 'done') {
      return json(route, { tasks: scenario.history ?? HISTORY_TASKS });
    }
    if (url.searchParams.get('status') === 'all') {
      const tasks = scenario.all ?? [
        ...(scenario.today ?? TODAY_TASKS),
        ...(scenario.backlog ?? BACKLOG_TASKS),
        ...(scenario.history ?? HISTORY_TASKS),
      ];
      const offset = Number(url.searchParams.get('offset') ?? '0');
      const limit = Number(url.searchParams.get('limit') ?? '50');
      return json(route, {
        tasks: tasks.slice(offset, offset + limit),
        pagination: { hasMore: offset + limit < tasks.length },
      });
    }
    const status = scenario.backlogStatus ?? 200;
    return json(
      route,
      status === 200
        ? { tasks: scenario.backlog ?? BACKLOG_TASKS }
        : { error: 'Backlog failed' },
      status,
    );
  });
  await page.route('**/api/search?*', (route) =>
    json(route, {
      results: (
        scenario.searchResults ??
        scenario.backlog ??
        BACKLOG_TASKS
      ).map((task) => ({ type: 'Task', ...task })),
    }),
  );
  await page.route('**/api/projects', (route) =>
    json(route, {
      projects: scenario.projects ?? [{ uid: 'project-home', name: 'Home' }],
    }),
  );
  await page.route('**/api/tags', (route) =>
    json(route, {
      tags: (scenario.tags ?? ['home', 'finance', 'next week']).map((name) => ({
        name,
      })),
    }),
  );
  await installProfileApi(page, scenario.confirmLanguage);
  await page.route('**/api/csrf-token', (route) =>
    json(route, { csrfToken: 'csrf-e2e' }),
  );
}

export async function installProfileApi(page: Page, confirmLanguage = true) {
  if (confirmLanguage)
    await page.addInitScript(() => {
      localStorage.setItem('only-tdy:language:v1', 'en');
    });
  await page.route('**/api/current_user', (route) =>
    json(route, { user: { uid: 'user-e2e' } }),
  );
  await page.route('**/api/password-auth-status', (route) =>
    json(route, { enabled: true }),
  );
  let uiSettings: Record<string, unknown> = {
    onlyTdy: { guidance: GUIDANCE_COMPLETE },
  };
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as {
        readonly ui_settings: Record<string, unknown>;
      };
      uiSettings = body.ui_settings;
    }
    await json(route, {
      uid: 'user-e2e',
      timezone: 'Europe/Amsterdam',
      ui_settings: uiSettings,
    });
  });
}

/**
 * The task page's own endpoints. Kept separate from `installApi` so a test
 * can route one of the three itself and still get the other two.
 */
export async function installTaskApi(
  page: Page,
  detail: RawTaskDetail = INVOICE_DETAIL,
) {
  await page.route('**/api/task/*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      return json(route, detail);
    }
    if (request.method() === 'DELETE') {
      return json(route, { message: 'Task successfully deleted' });
    }
    const patch = request.postDataJSON() as Record<string, unknown>;
    return json(route, {
      ...detail,
      name: typeof patch.name === 'string' ? patch.name : detail.name,
      original_name:
        typeof patch.name === 'string' ? patch.name : detail.original_name,
      status:
        typeof patch.status === 'string'
          ? ({
              not_started: 0,
              in_progress: 1,
              done: 2,
              waiting: 4,
              planned: 6,
            }[patch.status] ?? detail.status)
          : detail.status,
      defer_until: (patch.defer_until ?? null) as string | null,
      note: (patch.note ?? detail.note) as string | null,
      due_date: (patch.due_date === undefined
        ? detail.due_date
        : patch.due_date) as string | null,
      project_uid: (patch.project_uid ?? null) as string | null,
      tags: Array.isArray(patch.tags)
        ? patch.tags.map((name) => ({ name: String(name) }))
        : detail.tags,
    });
  });
}
