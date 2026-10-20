import type { Connect, Plugin } from 'vite';

/**
 * A Tududi stand-in for the dev server.
 *
 * only-tdy has no backend of its own: every screen is a view of a Tududi that
 * answers on the same origin. Without one there is nothing to run `mise run
 * dev` against — the list never resolves and the task page never opens — so
 * the only way to look at a change used to be the test suite.
 *
 * This answers the nine calls `src/features/tasks/data/tududi-api.ts` makes, from a store
 * held in the server process. It is a fixture, not a reimplementation: the
 * filters are the ones only-tdy actually sends, the writes really do change the
 * store so a save, a tick and a capture all behave, and everything is
 * forgotten when the server stops.
 *
 * It is mounted only by `vite --mode seeded`, never by a build and never by
 * the preview server, so nothing here can reach a deployed only-tdy. The tests
 * keep their own fixtures in `tests/e2e/fixtures.ts`: a suite that asserts on
 * a list has to state that list itself, and sharing one seed between the two
 * would make every change to this file a change to what the tests assert.
 */

/** Tududi's status numbers, as `src/features/tasks/data/adapters.ts` reads them. */
const STATUS = {
  not_started: 0,
  in_progress: 1,
  done: 2,
  waiting: 4,
  planned: 6,
} as const;

type StatusName = keyof typeof STATUS;

/** Tududi's priority numbers, in the same reading. */
const PRIORITY = { low: 0, medium: 1, high: 2 } as const;

type PriorityName = keyof typeof PRIORITY;

interface SeedProject {
  readonly uid: string;
  readonly name: string;
}

/** One task, in the shape Tududi answers with. */
interface SeedTask {
  uid: string;
  name: string;
  original_name: string;
  status: number;
  priority: number;
  tags: { name: string }[];
  note: string | null;
  due_date: string | null;
  defer_until: string | null;
  project_uid: string | null;
  /** What `order_by=completed_at:desc` sorts the record by. */
  completed_at: string | null;
  /** What the open lists' oldest-first order reads. */
  created_at: string;
}

/**
 * Nine this morning, or now if the day is younger than that. The open list
 * shows what was finished today under what is still open, so the seed has to
 * contain a completion that is actually today whenever the server is started.
 */
function earlierToday(): string {
  const now = new Date();
  const nine = new Date(now);
  nine.setHours(9, 0, 0, 0);
  return (nine.getTime() < now.getTime() ? nine : now).toISOString();
}

const PROJECTS: readonly SeedProject[] = [
  { uid: 'project-work', name: 'Website launch' },
  { uid: 'project-home', name: 'Renovation' },
  {
    uid: 'project-tenancy',
    name: 'Apartment move',
  },
];

function task(
  uid: string,
  title: string,
  status: StatusName,
  priority: PriorityName,
  rest: Partial<
    Omit<SeedTask, 'uid' | 'name' | 'original_name' | 'status' | 'priority'>
  > = {},
): SeedTask {
  return {
    uid,
    name: title,
    original_name: title,
    status: STATUS[status],
    priority: PRIORITY[priority],
    tags: [],
    note: null,
    due_date: null,
    defer_until: null,
    project_uid: null,
    completed_at: null,
    created_at: nextCreatedAt(),
    ...rest,
  };
}

/* Each seeded task a day younger than the one before, so oldest-first has
   something to sort by. */
let seedDay = 0;
function nextCreatedAt(): string {
  seedDay += 1;
  return new Date(Date.UTC(2026, 7, seedDay)).toISOString();
}

/*
 * A compact synthetic mix of statuses, priorities, projects, tags and notes.
 */
function seed(): SeedTask[] {
  return [
    task('task-invoice', 'Send the invoice', 'in_progress', 'high', {
      tags: [{ name: 'finance' }],
      project_uid: 'project-work',
      note: 'Attach the signed timesheet.',
      due_date: '2026-10-01',
      defer_until: '2026-09-28T08:30:00.000Z',
    }),
    task('task-appointment', 'Book the appointment', 'planned', 'medium'),
    task('task-tenancy', 'Review tenancy dates', 'waiting', 'low', {
      project_uid: 'project-tenancy',
      note: 'Read the tenancy agreement end to end and write down every date that needs a reminder before the renewal window closes.',
      tags: [{ name: 'home' }, { name: 'admin' }],
    }),
    task('task-bulb', 'Replace the hallway bulb', 'not_started', 'low', {
      project_uid: 'project-home',
      tags: [{ name: 'home' }],
    }),
    task('task-passport', 'Renew the passport', 'not_started', 'high', {
      due_date: '2026-11-14',
      note: 'The old one expires in January.',
    }),
    task('task-shelf', 'Put the shelf back up', 'not_started', 'low', {
      project_uid: 'project-home',
    }),
    task('task-standup', 'Run the stand-up', 'done', 'medium', {
      project_uid: 'project-work',
      completed_at: earlierToday(),
    }),
    task('task-return', 'File the tax return', 'done', 'high', {
      project_uid: 'project-work',
      tags: [{ name: 'finance' }],
      completed_at: '2026-09-18T16:04:00.000Z',
    }),
    task('task-boiler', 'Service the boiler', 'done', 'low', {
      project_uid: 'project-home',
      completed_at: '2026-09-11T09:20:00.000Z',
    }),
  ];
}

/** The two statuses `status=active` means: everything not finished. */
function isActive(value: number): boolean {
  return value !== STATUS.done;
}

function matches(entry: SeedTask, query: string): boolean {
  const needle = query.toLocaleLowerCase();
  return (
    entry.name.toLocaleLowerCase().includes(needle) ||
    (entry.note ?? '').toLocaleLowerCase().includes(needle)
  );
}

/** Tududi answers a write with the whole task, which is what only-tdy adapts. */
function readBody(request: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('error', reject);
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw === '') {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('The seeded API was sent a body that is not JSON.'));
      }
    });
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(
  value: unknown,
  table: Readonly<Record<string, number>>,
  fallback: number,
): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value in table) {
    return table[value] ?? fallback;
  }
  return fallback;
}

function asTags(value: unknown): { name: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => (typeof tag === 'string' ? tag : asRecord(tag).name))
    .filter((name): name is string => typeof name === 'string' && name !== '')
    .map((name) => ({ name }));
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

export function seededTududiApi(): Plugin {
  let tasks = seed();
  let projects = PROJECTS;
  let profileSettings: Record<string, unknown> = {};
  let created = 0;

  return {
    name: 'only-tdy-seeded-tududi-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://only-tdy-seeded');
        if (!url.pathname.startsWith('/api/')) {
          next();
          return;
        }

        const send = (status: number, body: unknown): void => {
          response.statusCode = status;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(body));
        };

        void handle(url, request, send).catch((error: unknown) => {
          send(500, { error: String(error) });
        });
      });

      async function handle(
        url: URL,
        request: Connect.IncomingMessage,
        send: (status: number, body: unknown) => void,
      ): Promise<void> {
        const method = request.method ?? 'GET';

        if (url.pathname === '/api/csrf-token') {
          send(200, { csrfToken: 'seeded-dev-token' });
          return;
        }

        if (url.pathname === '/api/profile') {
          if (method === 'PATCH') {
            const body = asRecord(await readBody(request));
            profileSettings = asRecord(body.ui_settings);
          }
          send(200, {
            uid: 'seeded-user',
            timezone: 'Europe/Amsterdam',
            ui_settings: profileSettings,
          });
          return;
        }

        if (url.pathname === '/api/projects') {
          send(200, { projects });
          return;
        }

        if (url.pathname === '/api/project' && method === 'POST') {
          const body = asRecord(await readBody(request));
          if (typeof body.name !== 'string' || body.name.trim() === '') {
            send(400, { error: 'Project name is required' });
            return;
          }
          const project = {
            uid: `project-new-${String(projects.length + 1)}`,
            name: body.name.trim(),
          };
          projects = [...projects, project];
          send(201, project);
          return;
        }

        /* Every tag on a seeded task, plus a couple nothing carries yet: a
           suggestion list is judged by what it offers, not by what happens to
           be in use today. */
        if (url.pathname === '/api/tags') {
          const used = new Set(
            tasks.flatMap((entry) => entry.tags.map((tag) => tag.name)),
          );
          for (const spare of ['repairs', 'next week', 'reading'])
            used.add(spare);
          send(200, { tags: [...used].sort().map((name) => ({ name })) });
          return;
        }

        if (url.pathname === '/api/tasks') {
          send(200, listTasks(url));
          return;
        }

        /*
         * The universal search: no status filter at all, which is exactly why
         * the backlog and the record each drop what is not theirs in
         * `src/features/tasks/data/adapters.ts`. Answering with both is what exercises that.
         */
        if (url.pathname === '/api/search') {
          const query = url.searchParams.get('q') ?? '';
          send(200, {
            results: tasks
              .filter((entry) => matches(entry, query))
              .map((entry) => ({ ...decorate(entry), type: 'Task' })),
          });
          return;
        }

        if (url.pathname === '/api/task' && method === 'POST') {
          const body = asRecord(await readBody(request));
          created += 1;
          const entry = task(
            `task-new-${String(created)}`,
            typeof body.name === 'string' ? body.name : 'Untitled',
            'not_started',
            'low',
            { created_at: new Date().toISOString() },
          );
          entry.status = asNumber(body.status, STATUS, STATUS.not_started);
          entry.priority = asNumber(body.priority, PRIORITY, PRIORITY.low);
          entry.tags = asTags(body.tags);
          entry.project_uid = asNullableString(body.project_uid);
          if (typeof body.note === 'string') entry.note = body.note;
          entry.due_date = asNullableString(body.due_date);
          entry.defer_until = asNullableString(body.defer_until);
          tasks = [entry, ...tasks];
          send(201, decorate(entry));
          return;
        }

        if (url.pathname.startsWith('/api/task/')) {
          const uid = decodeURIComponent(
            url.pathname.slice('/api/task/'.length),
          );
          const entry = tasks.find((candidate) => candidate.uid === uid);
          if (entry === undefined) {
            send(404, { error: 'No such task.' });
            return;
          }

          if (method === 'DELETE') {
            tasks = tasks.filter((candidate) => candidate !== entry);
            send(200, { ok: true });
            return;
          }

          if (method === 'PATCH') {
            apply(entry, asRecord(await readBody(request)));
            send(200, decorate(entry));
            return;
          }

          send(200, decorate(entry));
          return;
        }

        send(404, { error: 'The seeded API does not answer that path.' });
      }
    },
  };

  /** The filters only-tdy actually sends, and nothing it does not. */
  function listTasks(url: URL): Record<string, unknown> {
    const params = url.searchParams;
    const status = params.get('status');
    const tag = params.get('tag');
    const projectUid = params.get('project_uid');
    const priority = params.get('priority');
    const limit = Number(params.get('limit') ?? '100');

    let rows = tasks;
    if (params.get('type') === 'today') {
      // Today is what is neither waiting in the backlog nor already finished.
      rows = rows.filter(
        (entry) =>
          entry.status !== STATUS.not_started &&
          entry.status !== STATUS.done &&
          (!entry.defer_until || Date.parse(entry.defer_until) <= Date.now()),
      );
    }
    if (status === 'active')
      rows = rows.filter((entry) => isActive(entry.status));
    if (status === 'done')
      rows = rows.filter((entry) => entry.status === STATUS.done);
    if (tag !== null) {
      rows = rows.filter((entry) =>
        entry.tags.some((each) => each.name === tag),
      );
    }
    if (projectUid !== null) {
      rows = rows.filter((entry) => entry.project_uid === projectUid);
    }
    if (priority !== null && priority in PRIORITY) {
      const level = PRIORITY[priority as PriorityName];
      rows = rows.filter((entry) => entry.priority === level);
    }
    if (params.get('order_by') === 'completed_at:desc') {
      rows = [...rows].sort((a, b) =>
        (b.completed_at ?? '').localeCompare(a.completed_at ?? ''),
      );
    }
    if (params.get('order_by') === 'due_date:asc') {
      rows = [...rows].sort((a, b) =>
        (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'),
      );
    }
    const offset = Number(params.get('offset') ?? '0');
    /* Tududi reports the whole count beside a limited page. */
    return {
      tasks: rows
        .slice(offset, offset + (Number.isFinite(limit) ? limit : rows.length))
        .map(decorate),
      pagination: {
        total: rows.length,
        limit,
        offset,
        hasMore: offset + limit < rows.length,
      },
    };
  }

  /** Tududi nests the project's name on the task; only-tdy's rows read it there. */
  function decorate(entry: SeedTask): Record<string, unknown> {
    const project = projects.find((each) => each.uid === entry.project_uid);
    return project === undefined
      ? { ...entry }
      : { ...entry, Project: { name: project.name } };
  }

  /*
   * Tududi's PATCH is a merge, and only-tdy leans on that: a row's tick sends the
   * status alone, while the task page sends every field it owns. Only what
   * arrived is written, which is what keeps the two writes from overwriting
   * each other's fields.
   */
  function apply(entry: SeedTask, body: Record<string, unknown>): void {
    if (typeof body.name === 'string') {
      entry.name = body.name;
      entry.original_name = body.name;
    }
    if ('note' in body) entry.note = asNullableString(body.note);
    if ('status' in body) {
      entry.status = asNumber(body.status, STATUS, entry.status);
      entry.completed_at =
        entry.status === STATUS.done ? new Date().toISOString() : null;
    }
    if ('priority' in body) {
      entry.priority = asNumber(body.priority, PRIORITY, entry.priority);
    }
    if ('project_uid' in body)
      entry.project_uid = asNullableString(body.project_uid);
    if ('due_date' in body) entry.due_date = asNullableString(body.due_date);
    if ('defer_until' in body)
      entry.defer_until = asNullableString(body.defer_until);
    if ('tags' in body) entry.tags = asTags(body.tags);
  }
}
