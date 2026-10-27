import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'Europe/Amsterdam' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(FIXTURE_NOW));
  await installProfileApi(page);
});

import {
  BACKLOG_TASKS,
  DONE_TODAY,
  FIXTURE_NOW,
  HISTORY_TASKS,
  installApi,
  installProfileApi,
  installTaskApi,
  INVOICE_DETAIL,
  TODAY_TASKS,
} from './fixtures.ts';

/** The record sits behind the three dots at the end of the rail. */
async function openHistory(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'More' }).click();
  await page
    .locator('.focus-more__panel')
    .getByRole('button', { name: 'Completed tasks' })
    .click();
}

async function expectNoSeriousAxeViolations(
  page: import('@playwright/test').Page,
) {
  // Audit settled colors rather than an intermediate opacity fade.
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);
}

test('loads Today first and never requests Backlog while Today has tasks', async ({
  page,
}) => {
  let todayRequests = 0;
  let backlogRequests = 0;
  await installApi(page);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname !== '/api/tasks') return;
    if (url.searchParams.get('type') === 'today') todayRequests += 1;
    /* The record is a `type=all` request too, and this screen does ask for
       it — what it must not ask for while Today has tasks is the backlog. */
    if (
      url.searchParams.get('type') === 'all' &&
      url.searchParams.get('status') !== 'done' &&
      !url.searchParams.has('order_by')
    ) {
      backlogRequests += 1;
    }
  });

  await page.goto('/only-tdy/');
  await expect(page.getByText('Send the invoice')).toBeVisible();
  // The foot of the page names its marks to a pointer and nowhere else.
  await expect(
    page.getByRole('button', { name: 'Today', exact: true }),
  ).toHaveAttribute('title', 'Today');
  await expect(
    page.getByRole('button', { name: 'Today', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Backlog' })).toHaveAttribute(
    'title',
    'Backlog',
  );
  await expect(page.getByRole('button', { name: 'More' })).toHaveAttribute(
    'title',
    'More',
  );
  expect(todayRequests).toBe(1);
  expect(backlogRequests).toBe(0);
});

test('keeps an empty Today on screen and offers the backlog', async ({
  page,
}) => {
  await installApi(page, { today: [], backlog: BACKLOG_TASKS });

  await page.goto('/only-tdy/');
  await expect(
    page.getByText('Today is clear.', { exact: false }),
  ).toBeVisible();
  const plan = page.getByRole('link', {
    name: `Plan from Backlog (${String(BACKLOG_TASKS.length)})`,
  });
  await expect(plan).toBeVisible();
  // The backlog is counted, never listed, on Today.
  await expect(page.getByText('Replace the hallway bulb')).toHaveCount(0);

  await plan.click();
  await expect(page).toHaveURL(/\/only-tdy\/backlog$/);
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
});

test('fetches projects only for project syntax and creates with credentials and CSRF', async ({
  page,
  context,
}) => {
  let projectRequests = 0;
  let postedBody: unknown;
  let postedCsrf: string | undefined;
  let postedCookie: string | undefined;
  await context.addCookies([
    { name: 'session', value: 'signed-in', url: 'http://127.0.0.1:4173' },
  ]);
  await installApi(page);
  await page.route('**/api/projects', async (route) => {
    projectRequests += 1;
    await route.fulfill({
      json: { projects: [{ uid: 'project-home', name: 'Home' }] },
    });
  });
  await page.route('**/api/task', async (route) => {
    postedBody = route.request().postDataJSON();
    postedCsrf = route.request().headers()['x-csrf-token'];
    postedCookie = route.request().headers().cookie;
    await route.fulfill({
      json: {
        uid: 'task-created',
        name: 'Call the dentist',
        original_name: 'Call the dentist',
        status: 6,
        priority: 1,
        tags: [{ name: 'health' }],
        Project: { name: 'Home' },
      },
    });
  });

  await page.goto('/only-tdy/');
  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  await capture.fill('Call the dentist');
  await page.waitForTimeout(100);
  expect(projectRequests).toBe(0);
  await capture.fill('Call the dentist #health +Home !2 /today');
  await expect.poll(() => projectRequests).toBe(1);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(capture).toHaveValue('');

  expect(postedBody).toEqual({
    name: 'Call the dentist',
    status: 'planned',
    priority: 'medium',
    tags: ['health'],
    project_uid: 'project-home',
  });
  expect(postedCsrf).toBe('csrf-e2e');
  expect(postedCookie).toContain('session=signed-in');
});

test('preserves parser and server failures in the capture field', async ({
  page,
}) => {
  let posts = 0;
  await installApi(page);
  await page.route('**/api/task', async (route) => {
    posts += 1;
    await route.fulfill({
      status: 422,
      json: { error: 'That task already exists.' },
    });
  });
  await page.goto('/only-tdy/');
  const capture = page.getByRole('combobox', { name: 'What needs doing?' });

  await capture.fill('!1 !3');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(
    page.getByText('Choose one priority: !1, !2, or !3.'),
  ).toBeVisible();
  await expect(capture).toHaveValue('!1 !3');
  expect(posts).toBe(0);

  await capture.fill('Duplicate task');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(
    page.getByText(
      'Tududi could not accept this change. Check the fields and try again.',
    ),
  ).toBeVisible();
  await expect(capture).toHaveValue('Duplicate task');
});

test('shows hidden-Backlog confirmation for eight seconds', async ({
  page,
}) => {
  await installApi(page);
  await page.route('**/api/task', (route) =>
    route.fulfill({
      json: {
        uid: 'task-hidden',
        name: 'Replace filter',
        original_name: 'Replace filter',
        status: 0,
        priority: 0,
        tags: [],
      },
    }),
  );
  await page.goto('/only-tdy/');
  await page
    .getByRole('combobox', { name: 'What needs doing?' })
    .fill('Replace filter');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Added to Backlog')).toBeVisible();
  // The new task is hidden: Today is still what is on screen, unchanged.
  await expect(page.getByText('Replace filter')).toHaveCount(0);
  await expect(page.getByText('Added to Backlog')).toBeHidden({
    timeout: 9_000,
  });
});

test('floats capture feedback without moving the list, supports dismiss, and opens the added task editor', async ({
  page,
}) => {
  await installApi(page);
  const detail = {
    ...INVOICE_DETAIL,
    uid: 'task-toast-edit',
    name: 'Replace filter',
    original_name: 'Replace filter',
    status: 0,
  };
  await installTaskApi(page, detail);
  await page.route('**/api/task', (route) => route.fulfill({ json: detail }));
  await page.goto('/only-tdy/');
  await expect(page.getByText('Send the invoice')).toBeVisible();
  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  const list = page.locator('.focus-listing');
  const before = await list.boundingBox();

  await capture.fill('!1 !3');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(
    page.getByText('Choose one priority: !1, !2, or !3.'),
  ).toBeVisible();
  expect(await list.boundingBox()).toEqual(before);
  await expect(page.locator('#toast-root')).toHaveCSS('position', 'fixed');
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(page.locator('.focus-toast')).toHaveCount(0);
  await expect(capture).toHaveValue('!1 !3');
  expect(await list.boundingBox()).toEqual(before);

  await capture.fill('Replace filter');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Added to Backlog')).toBeVisible();
  expect(await list.boundingBox()).toEqual(before);
  await expectNoSeriousAxeViolations(page);
  await page.getByRole('link', { name: 'Edit task' }).click();
  await expect(page).toHaveURL(/\/only-tdy\/task\/task-toast-edit$/);
  await expect(page.getByRole('combobox', { name: 'Title' })).toHaveValue(
    'Replace filter',
  );
  await expect(page.getByText('Added to Backlog')).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Title' })
    .fill('Replace filter monthly');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/only-tdy\/$/);
});

test('stacks floating notifications within mobile and desktop viewports', async ({
  page,
}, testInfo) => {
  await installApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('only-tdy:seen-revision', 'previous-build');
  });
  await page.route('**/api/task', (route) =>
    route.fulfill({
      json: {
        ...INVOICE_DETAIL,
        uid: 'task-responsive-toast',
        name: 'Replace filter',
        original_name: 'Replace filter',
        status: 0,
      },
    }),
  );

  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/only-tdy/');
      await page
        .getByRole('combobox', { name: 'What needs doing?' })
        .fill('Replace filter');
      await page.getByRole('button', { name: 'Add' }).click();
      await expect(page.getByText('Added to Backlog')).toBeVisible();
      const update = page.locator('.focus-update-feedback .focus-toast');
      const added = page.locator('.focus-feedback .focus-toast');
      await expect(update).toBeVisible();
      await added.hover();
      const updateBox = await update.boundingBox();
      const addedBox = await added.boundingBox();
      if (updateBox === null || addedBox === null)
        throw new Error('Missing toast');
      expect(
        updateBox.y + updateBox.height <= addedBox.y ||
          addedBox.y + addedBox.height <= updateBox.y,
      ).toBe(true);
      for (const box of [updateBox, addedBox]) {
        expect(box.x).toBeGreaterThanOrEqual(16);
        expect(box.x + box.width).toBeLessThanOrEqual(width - 16);
      }
      await expectNoSeriousAxeViolations(page);
      await page.screenshot({
        path: testInfo.outputPath(
          `toast-stack-${String(width)}-${colorScheme}.png`,
        ),
        fullPage: true,
      });
      await added.getByRole('button', { name: 'Dismiss notification' }).click();
      await expect(added).toHaveCount(0);
      await expect(update).toBeVisible();
      await update
        .getByRole('button', { name: 'Dismiss notification' })
        .click();
      await expect(page).toHaveURL(/\/only-tdy\/$/);
      await expect(page.locator('.focus-toast')).toHaveCount(0);
    }
  }
});

test('sinks a completed task instead of removing it, and restores a failed one', async ({
  page,
}) => {
  let shouldFail = false;
  await installApi(page);
  await page.route('**/api/task/*', async (route) => {
    const uid = route.request().url().split('/').at(-1) ?? '';
    if (shouldFail) {
      await route.fulfill({
        status: 500,
        json: { error: 'Completion failed' },
      });
      return;
    }
    await route.fulfill({ json: { ...TODAY_TASKS[0], uid, status: 2 } });
  });
  await page.goto('/only-tdy/');

  const titles = () => page.locator('.focus-row__title').allTextContents();
  const invoice = page.getByText('Send the invoice');
  await expect.poll(async () => (await titles())[0]).toBe('Send the invoice');

  await page
    .getByRole('button', { name: 'Complete “Send the invoice”' })
    .click();

  // Still on screen, struck through, and now last in the list.
  await expect(invoice).toBeVisible();
  await expect(invoice).toHaveCSS('text-decoration-line', 'line-through');
  await expect
    .poll(async () => (await titles()).at(-1))
    .toBe('Send the invoice');
  // The tick can be taken back: the same box now offers to reopen the task.
  await expect(
    page.getByRole('button', { name: 'Reopen “Send the invoice”' }),
  ).toBeEnabled();

  shouldFail = true;
  const appointment = page.getByText('Book the appointment');
  await page
    .getByRole('button', { name: 'Complete “Book the appointment”' })
    .click();
  await expect(
    page.getByText('Task wasn’t completed. Try again.'),
  ).toBeVisible();
  await expect(appointment).toBeVisible();
  await expect(appointment).not.toHaveCSS(
    'text-decoration-line',
    'line-through',
  );
  await expect(
    page.getByRole('button', { name: 'Complete “Book the appointment”' }),
  ).toBeEnabled();
});

test('keeps what was finished today under the open list, across a reload', async ({
  page,
}) => {
  /* A Tududi that actually answers the write: the record loses the task the
     moment it is reopened, and Today gains it. Without that the reopen would
     be judged against a server still insisting the task is done. */
  let done = true;
  await installApi(page);
  await page.route('**/api/tasks?*', (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('status') === 'done') {
      return route.fulfill({ json: { tasks: done ? [DONE_TODAY] : [] } });
    }
    if (params.get('type') === 'today') {
      return route.fulfill({
        json: {
          tasks: done
            ? TODAY_TASKS
            : [...TODAY_TASKS, { ...DONE_TODAY, status: 6 }],
        },
      });
    }
    return route.fallback();
  });
  await page.route('**/api/task/*', (route) => {
    const uid = route.request().url().split('/').at(-1) ?? '';
    const patch = route.request().postDataJSON() as { status?: string };
    done = patch.status === 'done';
    return route.fulfill({
      json: { ...DONE_TODAY, uid, status: patch.status ?? 'planned' },
    });
  });
  await page.goto('/only-tdy/');

  const titles = () => page.locator('.focus-row__title').allTextContents();
  const standup = page.getByText('Run the stand-up');

  // Ticked this morning, before this page existed, and still at the foot of
  // the open list — where a tick in this session would also have left it.
  await expect(standup).toBeVisible();
  await expect(standup).toHaveCSS('text-decoration-line', 'line-through');
  await expect
    .poll(async () => (await titles()).at(-1))
    .toBe('Run the stand-up');
  // Yesterday's record stays in the record.
  await expect(page.getByText('File the tax return')).toHaveCount(0);

  // The whole point: a reload does not forget it.
  await page.reload();
  await expect(page.getByText('Run the stand-up')).toBeVisible();

  /* Undone on Today, it stays on Today rather than disappearing into the
     backlog — the row is where the person is looking, and it is still there
     once the lists have been asked again. */
  await page.getByRole('button', { name: 'Reopen “Run the stand-up”' }).click();
  await expect(standup).toBeVisible();
  await expect(standup).not.toHaveCSS('text-decoration-line', 'line-through');
  await expect(
    page.getByRole('button', { name: 'Complete “Run the stand-up”' }),
  ).toBeEnabled();
  await expect.poll(async () => await titles()).toContain('Run the stand-up');
});

test('disables saves offline and replaces the list for an expired session', async ({
  page,
  context,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/');
  await expect(
    page.getByRole('button', { name: 'Complete “Send the invoice”' }),
  ).toBeEnabled();
  await context.setOffline(true);
  await expect(
    page.getByText('You’re offline. Reconnect to load and save tasks.'),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'What needs doing?' })
    .fill('Keep this thought');
  await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: /Complete/ }).first(),
  ).toBeDisabled();

  await context.setOffline(false);
  await page.unrouteAll({ behavior: 'wait' });
  await installApi(page, { todayStatus: 401 });
  await page.reload();
  await expect(page.getByText('Your Tududi session expired.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('has no serious or critical accessibility violations in primary states', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/');
  await expectNoSeriousAxeViolations(page);

  await page.unrouteAll({ behavior: 'wait' });
  await installApi(page, { today: [], backlog: [] });
  await page.reload();
  await expect(
    page.getByText('Today is clear. Nothing waiting in the backlog.'),
  ).toBeVisible();
  await expectNoSeriousAxeViolations(page);

  await page.unrouteAll({ behavior: 'wait' });
  await installApi(page, { todayStatus: 401 });
  await page.reload();
  await expect(page.getByText('Your Tududi session expired.')).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test('unticks a done task from the same box and puts it back where it was', async ({
  page,
}) => {
  const patched: { uid: string; status: unknown }[] = [];
  await installApi(page);
  await page.route('**/api/task/*', async (route) => {
    const uid = route.request().url().split('/').at(-1) ?? '';
    const status = (route.request().postDataJSON() as { status: unknown })
      .status;
    patched.push({ uid, status });
    await route.fulfill({ json: { ...TODAY_TASKS[0], uid, status } });
  });
  await page.goto('/only-tdy/');

  const titles = () => page.locator('.focus-row__title').allTextContents();
  const invoice = page.getByText('Send the invoice');

  await page
    .getByRole('button', { name: 'Complete “Send the invoice”' })
    .click();
  await expect
    .poll(async () => (await titles()).at(-1))
    .toBe('Send the invoice');

  await page.getByRole('button', { name: 'Reopen “Send the invoice”' }).click();

  // Open again, unstruck, and back at the head of the list it was ticked from.
  await expect(invoice).not.toHaveCSS('text-decoration-line', 'line-through');
  await expect.poll(async () => (await titles())[0]).toBe('Send the invoice');
  await expect(
    page.getByRole('button', { name: 'Complete “Send the invoice”' }),
  ).toBeEnabled();
  /* Reopening puts the task on the list it was reopened on. Nothing is
     remembered about what it was before, because most done rows on this
     screen were ticked before the page existed. */
  expect(patched).toEqual([
    { uid: 'task-invoice', status: 'done' },
    { uid: 'task-invoice', status: 'planned' },
  ]);
});

test('history swaps the list for the record and takes the capture field with it', async ({
  page,
}) => {
  let historyRequests = 0;
  await installApi(page);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.pathname === '/api/tasks' &&
      url.searchParams.get('status') === 'done'
    ) {
      historyRequests += 1;
    }
  });
  await page.goto('/only-tdy/');

  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  await capture.fill('Half a thought');
  /* The open list shows the day's own completions, so the record is asked for
     on load — once, under one key, for both screens. */
  await expect.poll(() => historyRequests).toBe(1);

  const history = page.getByRole('button', { name: 'More' });
  await openHistory(page);

  await expect(page.getByText('File the tax return')).toBeVisible();
  await expect(page.getByText('Send the invoice')).toHaveCount(0);
  await expect(capture).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Completed tasks', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  // Newest first, exactly as Tududi ordered it.
  expect(await page.locator('.focus-row__title').allTextContents()).toEqual([
    'File the tax return',
    'Post the parcel',
  ]);
  // The new page refreshes the shared record while keeping cached rows visible.
  await expect.poll(() => historyRequests).toBe(2);

  await page.getByRole('button', { name: 'Today', exact: true }).click();

  await expect(page.getByText('Send the invoice')).toBeVisible();
  await expect(history).not.toHaveClass(/focus-history--active/);
  // The half-typed line survived the round trip.
  await expect(
    page.getByRole('combobox', { name: 'What needs doing?' }),
  ).toHaveValue('Half a thought');
});

test('reopening from history drops the task out of the record', async ({
  page,
}) => {
  await installApi(page);
  let reopened = false;
  await page.route('**/api/tasks?*', (route) => {
    if (new URL(route.request().url()).searchParams.get('status') !== 'done')
      return route.fallback();
    return route.fulfill({
      json: {
        tasks: HISTORY_TASKS.filter(
          (task) => !reopened || task.uid !== 'task-posted',
        ),
      },
    });
  });
  await page.route('**/api/task/*', async (route) => {
    const uid = route.request().url().split('/').at(-1) ?? '';
    const status = (route.request().postDataJSON() as { status: unknown })
      .status;
    reopened = true;
    await route.fulfill({ json: { ...TODAY_TASKS[0], uid, status } });
  });
  await page.goto('/only-tdy/');
  await openHistory(page);
  await expect(page.getByText('Post the parcel')).toBeVisible();

  await page.getByRole('button', { name: 'Reopen “Post the parcel”' }).click();

  await expect(page.getByText('Post the parcel')).toHaveCount(0);
  await expect(page.getByText('File the tax return')).toBeVisible();
});

test('capitalises the first letter before and after a delayed create request', async ({
  page,
}) => {
  let postedName: unknown;
  let releaseToken: (() => void) | undefined;
  const tokenReady = new Promise<void>((resolve) => {
    releaseToken = resolve;
  });
  await installApi(page);
  await page.route('**/api/csrf-token', async (route) => {
    await tokenReady;
    await route.fulfill({ json: { csrfToken: 'csrf-e2e' } });
  });
  await page.route('**/api/tasks?*', (route) => {
    if (new URL(route.request().url()).searchParams.get('type') !== 'today')
      return route.fallback();
    return route.fulfill({
      json: {
        tasks:
          postedName === undefined
            ? TODAY_TASKS
            : [
                ...TODAY_TASKS,
                {
                  uid: 'task-groceries',
                  name: 'Do groceries',
                  original_name: 'Do groceries',
                  status: 6,
                  priority: 0,
                  tags: [],
                },
              ],
      },
    });
  });
  await page.route('**/api/task', async (route) => {
    postedName = (route.request().postDataJSON() as { name: unknown }).name;
    await route.fulfill({
      json: {
        uid: 'task-groceries',
        name: 'Do groceries',
        original_name: 'Do groceries',
        status: 6,
        priority: 0,
        tags: [],
      },
    });
  });
  await page.goto('/only-tdy/');
  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  const groceries = page.getByRole('link', { name: 'Do groceries' });
  await expect(groceries).toHaveCount(0);
  await capture.fill('do groceries /today');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(groceries).toBeVisible();
  expect(postedName).toBeUndefined();
  releaseToken?.();

  await expect.poll(() => postedName).toBe('Do groceries');
  await expect(capture).toHaveValue('');
  await expect(groceries).toHaveAttribute(
    'href',
    '/only-tdy/task/task-groceries',
  );
});

test('opens a task on a page of its own, never over the list', async ({
  page,
}) => {
  await installApi(page);
  await installTaskApi(page);
  await page.goto('/only-tdy/');

  await page.getByRole('link', { name: 'Send the invoice' }).click();

  await expect(page).toHaveURL(/\/only-tdy\/task\/task-invoice$/);
  // A page, not an overlay: the list is gone rather than covered.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[aria-modal]')).toHaveCount(0);
  await expect(
    page.getByRole('combobox', { name: 'What needs doing?' }),
  ).toHaveCount(0);

  await expect(page.getByRole('combobox', { name: 'Title' })).toHaveValue(
    'Send the invoice',
  );
  await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue(
    'Attach the signed timesheet.',
  );
  await expect(page.getByLabel('Status')).toHaveValue('in_progress');
  await expect(page.getByLabel('Priority')).toHaveValue('high');
  await expect(page.getByLabel('Project')).toHaveValue('project-work');
  await expect(page.getByLabel('Due date')).toHaveValue('2026-10-01');
  await expect(page.getByLabel('Tags')).toHaveValue('finance');
  await expectNoSeriousAxeViolations(page);
});

test('survives a direct link, a refresh, and the back button', async ({
  page,
}) => {
  await installApi(page);
  await installTaskApi(page);

  await page.goto('/only-tdy/task/task-invoice');
  await expect(page.getByRole('combobox', { name: 'Title' })).toHaveValue(
    'Send the invoice',
  );

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Title' })).toHaveValue(
    'Send the invoice',
  );

  await page.goto('/only-tdy/');
  await page.getByRole('link', { name: 'Send the invoice' }).click();
  await expect(page.getByRole('combobox', { name: 'Title' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/only-tdy\/$/);
  await expect(
    page.getByRole('combobox', { name: 'What needs doing?' }),
  ).toBeVisible();
});

test('round-trips every editable field through the real data layer', async ({
  page,
}) => {
  let patched: unknown;
  await installApi(page);
  await installTaskApi(page);
  await page.route('**/api/task/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    patched = route.request().postDataJSON();
    await route.fulfill({
      json: {
        ...INVOICE_DETAIL,
        name: 'Send the final invoice',
        original_name: 'Send the final invoice',
        note: '',
        due_date: null,
        project_uid: null,
        Project: null,
        tags: [{ name: 'finance' }, { name: 'next quarter' }],
        status: 6,
        priority: 0,
      },
    });
  });
  await page.goto('/only-tdy/task/task-invoice');

  await page
    .getByRole('combobox', { name: 'Title' })
    .fill('Send the final invoice');
  await page.getByRole('textbox', { name: 'Notes' }).fill('');
  await page.getByLabel('Status').selectOption('planned');
  await page.getByLabel('Priority').selectOption('low');
  await page.getByLabel('Project').selectOption('');
  await page.getByLabel('Due date').fill('');
  await page.getByLabel('Tags').fill('finance, next quarter');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/only-tdy\/$/);
  expect(patched).toEqual({
    name: 'Send the final invoice',
    note: '',
    status: 'planned',
    priority: 'low',
    project_uid: '',
    due_date: '',
    defer_until: null,
    tags: ['finance', 'next quarter'],
  });
  // Replaced, so Back does not reopen the finished edit.
  await page.goBack();
  await expect(page).not.toHaveURL(/\/task\//);
});

test('keeps what was entered when the save is refused', async ({ page }) => {
  await installApi(page);
  await installTaskApi(page);
  await page.route('**/api/task/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    await route.fulfill({
      status: 400,
      json: { error: 'Defer until date cannot be after the due date.' },
    });
  });
  await page.goto('/only-tdy/task/task-invoice');

  await page.getByRole('combobox', { name: 'Title' }).fill('Send it twice');
  await page.getByLabel('Tags').fill('finance, urgent');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(
    page.getByText(
      'Tududi could not accept this change. Check the fields and try again.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Title' })).toHaveValue(
    'Send it twice',
  );
  await expect(page.getByLabel('Tags')).toHaveValue('finance, urgent');
  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
});

test('refuses to save an empty title and says so without sending anything', async ({
  page,
}) => {
  let patches = 0;
  await installApi(page);
  await installTaskApi(page);
  await page.route('**/api/task/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    patches += 1;
    await route.fulfill({ json: INVOICE_DETAIL });
  });
  await page.goto('/only-tdy/task/task-invoice');

  await page.getByRole('combobox', { name: 'Title' }).fill('   ');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Type a task before saving it.')).toBeVisible();
  expect(patches).toBe(0);
});

test('deletes only after confirming, then returns to the list without it', async ({
  page,
}) => {
  let deletes = 0;
  await installApi(page);
  await installTaskApi(page);
  await page.route('**/api/task/*', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    deletes += 1;
    // What the list answers from here on no longer has the task in it.
    await page.unroute('**/api/tasks?*');
    await installApi(page, { today: [], backlog: [] });
    await route.fulfill({ json: { message: 'Task successfully deleted' } });
  });

  // Opened from the list, so there is a history entry to check Back against.
  await page.goto('/only-tdy/');
  await page.getByRole('link', { name: 'Send the invoice' }).click();
  await expect(page.getByRole('combobox', { name: 'Title' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Delete?')).toBeVisible();
  expect(deletes).toBe(0);

  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page).toHaveURL(/\/only-tdy\/$/);
  await expect(
    page.getByText('Today is clear. Nothing waiting in the backlog.'),
  ).toBeVisible();
  expect(deletes).toBe(1);

  // Replaced, not pushed: Back must not return to a task that is gone.
  await page.goBack();
  await expect(page).not.toHaveURL(/\/only-tdy\/task\//);
});

test('names a task that is gone and offers the list instead of a retry', async ({
  page,
}) => {
  await installApi(page);
  await page.route('**/api/task/*', (route) =>
    route.fulfill({ status: 404, json: { error: 'Task not found.' } }),
  );
  await page.goto('/only-tdy/task/missing');

  await expect(page.getByText('That task is gone.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to the list' }).first().click();

  await expect(page).toHaveURL(/\/only-tdy\/$/);
  await expect(page.getByText('Send the invoice')).toBeVisible();
});

test('sends an expired session to sign in rather than to an empty form', async ({
  page,
}) => {
  await installApi(page);
  await page.route('**/api/task/*', (route) =>
    route.fulfill({ status: 401, json: { error: 'Session expired' } }),
  );
  await page.goto('/only-tdy/task/task-invoice');

  await expect(page.getByText('Your Tududi session expired.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test('stops the writes offline and keeps the fields editable', async ({
  page,
  context,
}) => {
  await installApi(page);
  await installTaskApi(page);
  await page.goto('/only-tdy/task/task-invoice');
  await expect(page.getByRole('combobox', { name: 'Title' })).toBeVisible();

  await context.setOffline(true);
  await expect(
    page.getByText('You’re offline. Reconnect to save this task.'),
  ).toBeVisible();

  await expect(page.getByRole('button', { name: 'Delete' })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Title' }).fill('Written offline');
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Title' })).toHaveValue(
    'Written offline',
  );
  await context.setOffline(false);
});

test('reaches and saves the task from the keyboard alone', async ({ page }) => {
  await installApi(page);
  await installTaskApi(page);
  await page.goto('/only-tdy/task/task-invoice');
  await expect(page.getByRole('combobox', { name: 'Title' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Title' }).focus();
  await page.keyboard.press('End');
  await page.keyboard.type(' today');
  // Enter ends a title, exactly as it does in the capture field.
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/only-tdy\/$/);
});

test('gives the record an address and the task page a way back to it', async ({
  page,
}) => {
  await installApi(page);
  await installTaskApi(page, {
    ...INVOICE_DETAIL,
    uid: 'task-filed',
    name: 'File the tax return',
    original_name: 'File the tax return',
    status: 2,
  });
  await page.goto('/only-tdy/');

  await openHistory(page);
  await expect(page).toHaveURL(/\/only-tdy\/history$/);

  await page.getByRole('link', { name: 'File the tax return' }).click();
  await expect(page).toHaveURL(/\/only-tdy\/task\/task-filed$/);
  // A done task belongs in the record, so that is where Back goes.
  await page.getByRole('link', { name: 'Back to the list' }).click();

  await expect(page).toHaveURL(/\/only-tdy\/history$/);
  await expect(
    page.getByRole('button', { name: 'Completed tasks', exact: true }),
  ).toHaveClass(/focus-history--active/);
});

test('corrects an address only-tdy cannot read, leaving nothing behind it', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/nowhere');

  await expect(page).toHaveURL(/\/only-tdy\/$/);
  await expect(page.getByText('Send the invoice')).toBeVisible();
});

test('opens a task in its own tab when the click asks for one', async ({
  page,
  context,
}) => {
  await installApi(page);
  await installTaskApi(page);
  await page.goto('/only-tdy/');

  const link = page.getByRole('link', { name: 'Send the invoice' });
  await expect(link).toHaveAttribute('href', '/only-tdy/task/task-invoice');

  const opened = context.waitForEvent('page');
  await link.click({ modifiers: ['ControlOrMeta'] });
  const tab = await opened;

  await expect(tab).toHaveURL(/\/only-tdy\/task\/task-invoice$/);
  // The list is still there, untouched, in the tab the click came from.
  await expect(page.getByText('Book the appointment')).toBeVisible();
  await tab.close();
});

test('gives the backlog its own address, mark, and page', async ({ page }) => {
  await installApi(page);
  await page.goto('/only-tdy/');

  // Today has tasks, so the list page never shows the backlog on its own.
  await expect(page.getByText('Send the invoice')).toBeVisible();
  await expect(page.getByText('Replace the hallway bulb')).toHaveCount(0);

  const backlog = page.getByRole('button', { name: 'Backlog' });
  await backlog.click();

  await expect(page).toHaveURL(/\/only-tdy\/backlog$/);
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expect(page.getByText('Descale the bathroom taps')).toBeVisible();
  await expect(backlog).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'More' })).not.toHaveClass(
    /focus-history--active/,
  );
  // One field at the top of every page: here it searches rather than captures.
  await expect(
    page.getByRole('combobox', { name: 'What needs doing?' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('combobox', { name: 'Search the backlog' }),
  ).toHaveAttribute('placeholder', '.....');

  // The lit mark is a toggle: pressing it again comes home.
  await backlog.click();
  await expect(page).toHaveURL(/\/only-tdy\/$/);
  await expect(page.getByText('Send the invoice')).toBeVisible();
});

test('comes home from either other page on one press of the house', async ({
  page,
}) => {
  await installApi(page);
  const home = page.getByRole('button', { name: 'Today', exact: true });

  await page.goto('/only-tdy/backlog');
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expect(home).toHaveAttribute('aria-pressed', 'false');

  await home.click();
  await expect(page).toHaveURL(/\/only-tdy\/$/);
  await expect(page.getByText('Send the invoice')).toBeVisible();
  await expect(home).toHaveAttribute('aria-pressed', 'true');

  await openHistory(page);
  await expect(page).toHaveURL(/\/only-tdy\/history$/);
  await expect(home).toHaveAttribute('aria-pressed', 'false');

  await home.click();
  await expect(page).toHaveURL(/\/only-tdy\/$/);
  await expect(page.getByText('Send the invoice')).toBeVisible();
});

test('survives a direct backlog link, a refresh, and the back button', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/backlog');

  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();

  await openHistory(page);
  await expect(page).toHaveURL(/\/only-tdy\/history$/);
  await page.goBack();

  await expect(page).toHaveURL(/\/only-tdy\/backlog$/);
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Backlog' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('sends each kind of search to the endpoint that can answer it', async ({
  page,
}) => {
  const asked: string[] = [];
  const firstBacklogTask = BACKLOG_TASKS[0];
  if (firstBacklogTask === undefined)
    throw new Error('Backlog fixture is empty.');
  await installApi(page, { searchResults: [firstBacklogTask] });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.pathname === '/api/tasks' &&
      url.searchParams.get('type') === 'all'
    ) {
      const tag = url.searchParams.get('tag');
      const project = url.searchParams.get('project_uid');
      if (tag !== null) asked.push(`tag=${tag}`);
      if (project !== null) asked.push(`project_uid=${project}`);
    }
    if (url.pathname === '/api/search') {
      asked.push(`q=${url.searchParams.get('q') ?? ''}`);
    }
  });
  await page.goto('/only-tdy/backlog');

  const field = page.getByRole('combobox', { name: 'Search the backlog' });
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();

  await field.fill('#home');
  await field.press('Enter');
  await expect(field).not.toBeFocused();
  await expect.poll(() => asked).toContain('tag=home');

  await field.fill('+Home');
  await field.press('Enter');
  await expect.poll(() => asked).toContain('project_uid=project-home');

  await field.fill('bulb');
  await field.press('Enter');
  await expect.poll(() => asked).toContain('q=bulb');
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expect(page.getByText('Descale the bathroom taps')).toHaveCount(0);

  // Emptying the field is its own submission: the whole backlog returns.
  await field.fill('');
  await expect(page.getByText('Descale the bathroom taps')).toBeVisible();
});

test('refuses a project name Tududi would answer with everything', async ({
  page,
}) => {
  let filtered = 0;
  await installApi(page);
  page.on('request', (request) => {
    if (new URL(request.url()).searchParams.get('project_uid') !== null) {
      filtered += 1;
    }
  });
  await page.goto('/only-tdy/backlog');

  const field = page.getByRole('combobox', { name: 'Search the backlog' });
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await field.fill('+Hous');
  await field.press('Enter');

  await expect(page.getByText('No project named “Hous”.')).toBeVisible();
  await expect(
    page.getByText('Nothing in the backlog matches that.'),
  ).toBeVisible();
  expect(filtered).toBe(0);
});

test('moves chosen tasks to Today and updates both lists without a reload', async ({
  page,
}) => {
  const moved = new Set<string>();
  await installApi(page);
  await page.route('**/api/tasks?*', async (route) => {
    const url = new URL(route.request().url());
    const today = TODAY_TASKS.filter((task) => !moved.has(task.uid));
    const backlog = BACKLOG_TASKS.filter((task) => !moved.has(task.uid));
    const promoted = BACKLOG_TASKS.filter((task) => moved.has(task.uid)).map(
      (task) => ({ ...task, status: 6 }),
    );
    if (url.searchParams.get('type') === 'today') {
      await route.fulfill({ json: { tasks: [...today, ...promoted] } });
      return;
    }
    if (url.searchParams.get('status') === 'done') {
      await route.fulfill({ json: { tasks: [] } });
      return;
    }
    await route.fulfill({ json: { tasks: backlog } });
  });
  await page.route('**/api/task/*', async (route) => {
    const uid = route.request().url().split('/').at(-1) ?? '';
    const body = route.request().postDataJSON() as { status: unknown };
    expect(body.status).toBe('planned');
    moved.add(uid);
    await route.fulfill({ json: { ...BACKLOG_TASKS[0], uid, status: 6 } });
  });
  await page.goto('/only-tdy/backlog');

  await page
    .getByRole('button', { name: 'Add “Replace the hallway bulb” to Today' })
    .click();
  await page
    .getByRole('button', { name: 'Add “Descale the bathroom taps” to Today' })
    .click();
  await expect(page.getByText('2 selected')).toBeVisible();

  await page.getByRole('button', { name: 'Move to Today' }).click();

  // Gone from the backlog, and the line has nothing left to offer.
  await expect(page.getByText('Nothing waiting in the backlog.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move to Today' })).toHaveCount(
    0,
  );

  // And on Today, without the page having been reloaded.
  await page.getByRole('button', { name: 'Backlog' }).click();
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expect(page.getByText('Descale the bathroom taps')).toBeVisible();
});

test('keeps a refused move chosen and retryable', async ({ page }) => {
  await installApi(page);
  await page.route('**/api/task/*', (route) =>
    route.fulfill({ status: 500, json: { error: 'Move failed' } }),
  );
  await page.goto('/only-tdy/backlog');

  await page
    .getByRole('button', { name: 'Add “Replace the hallway bulb” to Today' })
    .click();
  await page.getByRole('button', { name: 'Move to Today' }).click();

  await expect(page.getByText('Nothing moved. Try again.')).toBeVisible();
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Leave “Replace the hallway bulb” in Backlog',
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Move to Today' }),
  ).toBeEnabled();
});

test('reaches the search, a row, and the move from the keyboard alone', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/backlog');
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();

  // The mode switch precedes the input.
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Switch to add' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('combobox', { name: 'Search the backlog' }),
  ).toBeFocused();

  // Rows read by priority, so the medium-priority taps come first.
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', {
      name: 'Add “Descale the bathroom taps” to Today',
    }),
  ).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByText('1 selected')).toBeVisible();
  await page.getByRole('button', { name: 'Move to Today' }).focus();
  await expect(
    page.getByRole('button', { name: 'Move to Today' }),
  ).toBeFocused();
});

test('stops choosing and moving offline without hiding the backlog', async ({
  page,
  context,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/backlog');
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();

  await context.setOffline(true);
  await expect(
    page.getByText('You’re offline. Reconnect to move tasks to Today.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Add “Replace the hallway bulb” to Today',
    }),
  ).toBeDisabled();
  // The list itself is still there to read.
  await expect(page.getByText('Descale the bathroom taps')).toBeVisible();
});

test('has no serious or critical accessibility violations on the backlog page', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/backlog');
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expectNoSeriousAxeViolations(page);

  await page
    .getByRole('button', { name: 'Add “Replace the hallway bulb” to Today' })
    .click();
  await expect(page.getByText('1 selected')).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

/* ------------------------------------------------------------------ mobile */

/**
 * Representative phone viewports, at the height a browser leaves once its own
 * toolbars are showing — the smallest the screen ever is, which is the case
 * the navigation has to survive.
 */
const PHONES = [
  { name: 'small', width: 320, height: 568 },
  { name: 'android', width: 360, height: 640 },
  { name: 'iphone', width: 390, height: 664 },
  { name: 'landscape', width: 667, height: 375 },
] as const;

function manyTasks(count: number) {
  return Array.from({ length: count }, (_unused, index) => ({
    uid: `task-${String(index)}`,
    name: `Task number ${String(index)}`,
    original_name: `Task number ${String(index)}`,
    status: 1,
    priority: 0,
    tags: [],
  }));
}

/** Where the foot of the page is, relative to what is on screen. */
async function footerBox(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const rect = document
      .querySelector('.focus-footer')
      ?.getBoundingClientRect();
    if (rect === undefined) throw new Error('no footer');
    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      innerHeight: window.innerHeight,
    };
  });
}

async function expectNavInViewport(
  page: import('@playwright/test').Page,
  where: string,
) {
  const box = await footerBox(page);
  expect(box.top, `${where}: nav top`).toBeGreaterThanOrEqual(0);
  expect(box.bottom, `${where}: nav bottom`).toBeLessThanOrEqual(
    box.innerHeight,
  );
  // Reachable, not merely present: every mark is hit-testable.
  for (const name of ['Today', 'Backlog', 'More']) {
    await expect(
      page.getByRole('button', { name, exact: true }),
    ).toBeInViewport({ ratio: 1 });
  }
}

test('keeps the navigation inside every phone viewport on empty, short, and long lists', async ({
  page,
}) => {
  for (const phone of PHONES) {
    await page.setViewportSize({ width: phone.width, height: phone.height });

    for (const [label, tasks] of [
      ['empty', []],
      ['short', manyTasks(3)],
      ['long', manyTasks(40)],
    ] as const) {
      await installApi(page, { today: tasks, backlog: [] });
      await page.goto('/only-tdy/');
      await expect(
        page
          .getByText('Task number 0')
          .or(
            page.getByText('Today is clear. Nothing waiting in the backlog.'),
          ),
      ).toBeVisible();

      await expectNavInViewport(page, `${phone.name}/${label} at rest`);

      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await expectNavInViewport(page, `${phone.name}/${label} at the end`);
    }
  }
});

test('keeps the navigation on screen when the viewport unit overshoots the screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await installApi(page, { today: [], backlog: [] });
  await page.goto('/only-tdy/');
  await expect(
    page.getByText('Today is clear. Nothing waiting in the backlog.'),
  ).toBeVisible();

  /*
   * The defect, isolated. A phone browser's toolbars moving is permitted to
   * leave a viewport unit resolving larger than what is on screen, and the
   * column used to start at exactly that size — which put its own foot below
   * the fold on a page with nothing in it to scroll back up. 56px is a
   * typical toolbar. The foot now stays put whatever the column does.
   */
  await page.addStyleTag({
    content: '.focus-shell { min-height: calc(100svh + 56px) !important; }',
  });

  await expectNavInViewport(page, 'overshot column');
});

test('keeps the navigation on screen across an update-like reload and a viewport change', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await installApi(page, { today: manyTasks(40), backlog: [] });
  await page.goto('/only-tdy/');
  await expect(page.getByText('Task number 0')).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expectNavInViewport(page, 'scrolled');

  // What an auto-updating service worker does once a new build lands.
  await page.reload();
  await expect(page.getByText('Task number 0')).toBeVisible();
  await expectNavInViewport(page, 'after the reload');

  // The screen growing and shrinking under the page, as toolbars do.
  await page.setViewportSize({ width: 390, height: 720 });
  await expectNavInViewport(page, 'taller screen');
  await page.setViewportSize({ width: 390, height: 664 });
  await expectNavInViewport(page, 'back to the smaller screen');
});

test('leaves the last row and its box reachable above the navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await installApi(page, { today: manyTasks(40), backlog: [] });
  await page.route('**/api/task/*', async (route) => {
    const uid = route.request().url().split('/').at(-1) ?? '';
    await route.fulfill({
      json: {
        uid,
        name: 'Task number 39',
        original_name: 'Task number 39',
        status: 2,
        priority: 0,
        tags: [],
      },
    });
  });
  await page.goto('/only-tdy/');
  await expect(page.getByText('Task number 0')).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

  const last = page.getByRole('listitem').last();
  await expect(last).toContainText('Task number 39');
  const gap = await page.evaluate(() => {
    const rows = document.querySelectorAll('.focus-row');
    const row = rows[rows.length - 1]?.getBoundingClientRect();
    const footer = document
      .querySelector('.focus-footer')
      ?.getBoundingClientRect();
    if (row === undefined || footer === undefined) throw new Error('missing');
    return {
      rowBottom: Math.round(row.bottom),
      footerTop: Math.round(footer.top),
    };
  });
  // Nothing of the last row is under the foot of the page.
  expect(gap.rowBottom).toBeLessThanOrEqual(gap.footerTop);

  // And its controls answer a real press rather than the footer taking it.
  const box = page.getByRole('button', { name: 'Complete “Task number 39”' });
  await expect(box).toBeInViewport({ ratio: 1 });
  await box.click();
  await expect(
    page.getByRole('button', { name: 'Reopen “Task number 39”' }),
  ).toBeVisible();
});

test('stops a focused row above the navigation rather than under it', async ({
  page,
}) => {
  /*
   * Focused from the page itself, not from the test runner: what is being
   * checked is the browser's own scroll-into-view, which is what a Tab press
   * triggers and what the scroll padding steers.
   */
  async function clearanceBelowFocused(name: string) {
    return page.evaluate((target) => {
      const link = [...document.querySelectorAll('.focus-row__title')].find(
        (node): node is HTMLElement => node.textContent === target,
      );
      link?.focus();
      const rect = link?.getBoundingClientRect();
      const footer = document
        .querySelector('.focus-footer')
        ?.getBoundingClientRect();
      if (rect === undefined || footer === undefined)
        throw new Error('missing');
      return Math.round(footer.top - rect.bottom);
    }, name);
  }

  await page.setViewportSize({ width: 390, height: 664 });
  await installApi(page, { today: manyTasks(40), backlog: [] });

  await page.goto('/only-tdy/');
  await expect(page.getByText('Task number 0')).toBeVisible();
  expect(await clearanceBelowFocused('Task number 8')).toBeGreaterThanOrEqual(
    0,
  );

  /*
   * And that clearance is the page's doing rather than luck: without the
   * scroll padding the browser brings a row to the foot of the screen, which
   * is now where the navigation is, and the row lands underneath it.
   */
  await page.goto('/only-tdy/');
  await expect(page.getByText('Task number 0')).toBeVisible();
  await page.addStyleTag({
    content: 'html { scroll-padding-bottom: 0 !important; }',
  });
  expect(await clearanceBelowFocused('Task number 8')).toBeLessThan(0);
});

test('keeps the backlog navigation on screen on a long page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await installApi(page, {
    today: [],
    backlog: manyTasks(40).map((task) => ({ ...task, status: 0 })),
  });
  await page.goto('/only-tdy/backlog');
  await expect(page.getByText('Task number 0')).toBeVisible();
  await expectNavInViewport(page, 'backlog at rest');
});

/*
 * The task page is the one page whose way out is at the head rather than the
 * foot, and it has no foot at all. The way back is the first thing on the
 * page, reached by going up rather than by staying put. Delete shares that
 * first line, at the other edge, and gives it to Save once something changes.
 */
test('opens the task page with the way back, above everything else', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await installApi(page);
  await installTaskApi(page, {
    ...INVOICE_DETAIL,
    note: 'A note long enough to push the page past the screen. '.repeat(40),
  });
  await page.goto('/only-tdy/task/task-invoice');
  await expect(page.getByRole('combobox', { name: 'Title' })).toBeVisible();

  const back = page.getByRole('link', { name: 'Back to the list' });
  await expect(back).toBeInViewport({ ratio: 1 });
  await expect(back).toHaveText('Back to the list');

  const order = await page.evaluate(() => {
    const shell = document.querySelector('.focus-shell');
    const head = shell?.firstElementChild;
    return {
      head: head?.className ?? '',
      first: head?.firstElementChild?.className ?? '',
    };
  });
  expect(order.head).toContain('focus-head');
  expect(order.first).toContain('focus-back');

  // Deleting is on that same first line, at the edge the way back is not.
  const del = page.getByRole('button', { name: 'Delete' });
  await expect(del).toBeInViewport({ ratio: 1 });
  expect(
    await del.evaluate((node) => node.closest('.focus-head') !== null),
  ).toBe(true);

  await expect(
    page.getByRole('button', { name: 'Compact form' }),
  ).toBeVisible();

  // An edit puts Save where Delete was.
  await page
    .getByRole('combobox', { name: 'Title' })
    .fill('Send the invoice now');
  const save = page.getByRole('button', { name: 'Save' });
  await expect(save).toBeInViewport({ ratio: 1 });
  expect(
    await save.evaluate((node) => node.closest('.focus-head') !== null),
  ).toBe(true);
  await expect(del).toHaveCount(0);
});

for (const compact of [false, true]) {
  test(`preserves a Tududi due time through the ${compact ? 'compact' : 'normal'} editor`, async ({
    page,
  }) => {
    await installApi(page);
    let stored = {
      ...INVOICE_DETAIL,
      due_date: '2026-11-03',
      due_time: '14:30' as string | null,
    };
    await page.route('**/api/task/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        const patch = route.request().postDataJSON() as Record<string, unknown>;
        stored = {
          ...stored,
          ...(typeof patch.name === 'string'
            ? { name: patch.name, original_name: patch.name }
            : {}),
          ...(patch.due_date === undefined
            ? {}
            : {
                due_date:
                  typeof patch.due_date === 'string' ? patch.due_date : '',
                due_time:
                  typeof patch.due_time === 'string' ? patch.due_time : null,
              }),
        };
      }
      await route.fulfill({ json: stored });
    });
    await page.goto('/only-tdy/task/task-invoice');
    if (compact) {
      await page.getByRole('button', { name: 'Compact form' }).click();
    }
    await page
      .getByRole('combobox', { name: 'Title' })
      .fill('Send the updated invoice');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/\/only-tdy\/$/);
    const saved = await page.evaluate(async () => {
      const response = await fetch('/api/task/task-invoice');
      return (await response.json()) as {
        readonly name: string;
        readonly due_date: string;
        readonly due_time: string | null;
      };
    });
    expect(saved.name).toBe('Send the updated invoice');
    expect(saved.due_date).toBe('2026-11-03');
    expect(saved.due_time).toBe('14:30');
  });
}

test('changes the palette in Settings and keeps it across reloads', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/');
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();

  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await expect(theme).toHaveValue('system');
  const attribute = () =>
    page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(await attribute()).toBeNull();

  await theme.selectOption('light');
  expect(await attribute()).toBe('light');

  await theme.selectOption('dark');
  expect(await attribute()).toBe('dark');
  await expect(page.getByRole('status')).toHaveText('Saved');

  // It survives a reload, and the document is already right on first paint.
  await page.reload();
  expect(await attribute()).toBe('dark');
  await expect(theme).toHaveValue('dark');

  // And three presses come back to where it started.
  await theme.selectOption('system');
  expect(await attribute()).toBeNull();
});

test('searches the record with the same marks the backlog is searched with', async ({
  page,
}) => {
  const asked: string[] = [];
  await installApi(page);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.pathname === '/api/tasks' &&
      url.searchParams.get('status') === 'done'
    ) {
      asked.push(url.search);
    }
  });

  await page.goto('/only-tdy/history');
  await expect(page.getByText('File the tax return')).toBeVisible();

  const field = page.getByRole('combobox', { name: 'Search completed tasks' });
  await field.fill('#finance');
  await field.press('Enter');

  await expect
    .poll(() => asked.some((search) => search.includes('tag=finance')))
    .toBe(true);

  // Emptying the field is its own submission: the whole record, immediately.
  await field.fill('');
  await expect(page.getByText('File the tax return')).toBeVisible();
});

/*
 * The one part of a select `appearance: none` never reached.
 *
 * A legacy select's dropdown is painted outside the document as a platform
 * widget, and on Linux Chrome draws that widget itself, unthemed: a black
 * hairline, a system-blue bar, and every option jammed against the edge with
 * no inset at all. Padding written on `option` is dropped there without a
 * word, so the only evidence that the list is really styled is that it is
 * inside the page — an element with a box, holding options with an inset of
 * their own. That is what this measures, and what a return to the platform
 * list would fail.
 */
test('opens the choices as a list inside the page, inset from its own edge', async ({
  page,
}) => {
  await installApi(page);
  await installTaskApi(page);
  await page.goto('/only-tdy/task/task-invoice');

  const status = page.getByLabel('Status');
  await expect(status).toHaveValue('in_progress');
  expect(
    await status.evaluate((node) => getComputedStyle(node).appearance),
  ).toBe('base-select');

  await status.click();

  const chosen = page.getByRole('option', { name: 'In progress' });
  await expect(chosen).toBeVisible();

  const measured = await status.evaluate((node) => {
    const select = node as HTMLSelectElement;
    const option = select.querySelector('option');
    if (option === null) throw new Error('The select has no options.');
    const box = option.getBoundingClientRect();
    return {
      width: box.width,
      height: box.height,
      left: box.left,
      // What is actually painted where the first option is drawn.
      hit:
        document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        )?.tagName ?? '',
      // Where the list's leading edge would be if it were not inset.
      edge: select.getBoundingClientRect().left,
      inset: getComputedStyle(option).paddingInlineStart,
    };
  });

  // An option with a box the page can hit-test is an option the page drew.
  expect(measured.width).toBeGreaterThan(0);
  expect(measured.height).toBeGreaterThanOrEqual(40);
  expect(measured.hit).toBe('OPTION');
  // And one held off the edge rather than jammed against it.
  expect(measured.inset).not.toBe('0px');
  expect(measured.left).toBeGreaterThan(measured.edge);

  // Choosing from it still writes through the select, as a select must.
  await page.getByRole('option', { name: 'Backlog' }).click();
  await expect(status).toHaveValue('not_started');
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});

test('completes a project and a tag as they are typed, and files the task under them', async ({
  page,
}) => {
  let posted: Record<string, unknown> | undefined;
  await installApi(page, {
    projects: [
      { uid: 'project-home', name: 'Home' },
      { uid: 'project-office', name: 'Home Office' },
    ],
    tags: ['finance', 'fittings'],
  });
  await page.route('**/api/task', async (route) => {
    posted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: {
        uid: 'task-desk',
        name: 'Order the desk',
        original_name: 'Order the desk',
        status: 6,
        priority: 0,
        tags: [{ name: 'fittings' }],
      },
    });
  });
  await page.goto('/only-tdy/');

  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  await capture.click();
  await capture.pressSequentially('Order the desk +Ho');

  // Both names are offered, best match first, and the first is ready to take.
  const list = page.getByRole('listbox');
  await expect(list.getByRole('option')).toHaveText([
    'Home',
    'Home Office',
    '+Ho new project',
  ]);
  await expect(capture).toHaveAttribute('aria-expanded', 'true');

  // A name with a space in it is written back bracketed, so the line still parses.
  await capture.press('ArrowDown');
  await capture.press('Enter');
  await expect(capture).toHaveValue('Order the desk +(Home Office) ');

  // The same field, the same list, for a tag.
  await capture.pressSequentially('#fit');
  await expect(page.getByRole('option', { name: 'fittings' })).toBeVisible();
  await page.getByRole('option', { name: 'fittings' }).click();
  await expect(capture).toHaveValue('Order the desk +(Home Office) #fittings ');

  // Each token is painted as a chip behind the line it is still part of.
  await expect(page.locator('.focus-chip')).toHaveText([
    '+(Home Office)',
    '#fittings',
  ]);

  await page.getByRole('button', { name: 'Add' }).click();
  // No /today, so it lands in the backlog and the line says so.
  await expect(page.getByText('Added to Backlog')).toBeVisible();
  expect(posted).toMatchObject({
    name: 'Order the desk',
    project_uid: 'project-office',
    tags: ['fittings'],
  });
});

test('creates a project nobody has yet and files the task under it', async ({
  page,
}) => {
  let projectBody: unknown;
  let taskBody: Record<string, unknown> | undefined;
  await installApi(page, { projects: [{ uid: 'project-home', name: 'Home' }] });
  await page.route('**/api/project', async (route) => {
    projectBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      json: { uid: 'project-garden', name: 'Garden' },
    });
  });
  await page.route('**/api/task', async (route) => {
    taskBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: {
        uid: 'task-weed',
        name: 'Weed the beds',
        original_name: 'Weed the beds',
        status: 0,
        priority: 0,
        tags: [],
        Project: { uid: 'project-garden', name: 'Garden' },
      },
    });
  });
  await page.goto('/only-tdy/');

  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  await capture.click();
  await capture.pressSequentially('Weed the beds +Garden');

  // The list says what return will do before anything is created.
  await expect(page.getByRole('option')).toHaveText(['+Garden new project']);
  await capture.press('Enter');

  await expect(capture).toHaveValue('');
  await expect(capture).not.toBeFocused();
  expect(projectBody).toEqual({ name: 'Garden' });
  expect(taskBody).toMatchObject({
    name: 'Weed the beds',
    project_uid: 'project-garden',
  });
});

test('leaves the return key to the field once a name is typed in full', async ({
  page,
}) => {
  let posts = 0;
  await installApi(page, {
    projects: [
      { uid: 'project-home', name: 'Home' },
      { uid: 'project-office', name: 'Home Office' },
    ],
  });
  await page.route('**/api/task', async (route) => {
    posts += 1;
    await route.fulfill({
      json: {
        uid: 'task-new',
        name: 'Hang the shelf',
        original_name: 'Hang the shelf',
        status: 0,
        priority: 0,
        tags: [],
      },
    });
  });
  await page.goto('/only-tdy/');

  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  await capture.click();
  /* A name typed in full, with another still matching it: the list is open
     but has nothing left to finish. */
  await capture.pressSequentially('Hang the shelf +Home');
  await expect(page.getByRole('listbox')).toBeVisible();

  // A list is open but the name is finished, so return adds the task.
  await capture.press('Enter');
  await expect(page.getByText('Added to Backlog')).toBeVisible();
  expect(posts).toBe(1);
});

/* ------------------------------------------------ search everything */

test('searches only the backlog even when other lists match', async ({
  page,
}) => {
  const bulb = BACKLOG_TASKS[0];
  if (bulb === undefined) throw new Error('Fixture missing.');
  const porch = {
    ...bulb,
    uid: 'task-porch',
    name: 'Replace the porch bulb',
    original_name: 'Replace the porch bulb',
    status: 6,
  };
  const shed = {
    ...bulb,
    uid: 'task-shed',
    name: 'Fit the shed bulb',
    original_name: 'Fit the shed bulb',
    status: 2,
  };
  await installApi(page, { searchResults: [bulb, porch, shed] });
  await page.goto('/only-tdy/backlog');
  const field = page.getByRole('combobox', { name: 'Search the backlog' });
  await field.fill('bulb');
  await page.getByRole('button', { name: 'Search Backlog' }).click();
  await expect(
    page.getByRole('link', { name: 'Replace the hallway bulb' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Replace the porch bulb' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Fit the shed bulb' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'View completed tasks' }),
  ).toHaveCount(0);
});

test('narrows the backlog as the term is typed, before it is sent', async ({
  page,
}) => {
  const searches: string[] = [];
  await installApi(page);
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/search')
      searches.push(request.url());
  });
  await page.goto('/only-tdy/backlog');
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();

  await page.getByRole('combobox', { name: 'Search the backlog' }).fill('tap');

  await expect(page.getByText('Descale the bathroom taps')).toBeVisible();
  await expect(page.getByText('Replace the hallway bulb')).toHaveCount(0);
  expect(searches).toEqual([]);
});

test('gives All tasks its own page with hidden, open and completed tasks', async ({
  page,
}) => {
  const base = BACKLOG_TASKS[0];
  if (base === undefined) throw new Error('Missing backlog fixture.');
  const hidden = {
    ...base,
    uid: 'task-hidden',
    name: 'Hidden task',
    original_name: 'Hidden task',
    defer_until: '2099-01-01T00:00:00.000Z',
  };
  await installApi(page, {
    all: [...TODAY_TASKS, ...BACKLOG_TASKS, ...HISTORY_TASKS, hidden],
  });
  await page.goto('/only-tdy/history');
  await expect(page.getByText('File the tax return')).toBeVisible();
  await expect(page.getByText('Send the invoice')).toHaveCount(0);

  await page.getByRole('button', { name: 'All tasks', exact: true }).click();
  await expect(page).toHaveURL(/\/only-tdy\/all$/);
  await expect(page.getByText('Hidden task', { exact: true })).toBeVisible();
  await expect(page.getByText('Send the invoice')).toBeVisible();
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expect(page.getByText('File the tax return')).toBeVisible();
  await expectNoSeriousAxeViolations(page);
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: 'Search all tasks' }),
  ).toBeVisible();
  await expect(page.getByText('Hidden task', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await openHistory(page);
  await expect(page.getByText('Hidden task', { exact: true })).toHaveCount(0);
});

test('searches each task page independently and keeps All tasks read-only', async ({
  page,
}) => {
  const completed = HISTORY_TASKS[0];
  const backlog = BACKLOG_TASKS[0];
  if (completed === undefined || backlog === undefined)
    throw new Error('Missing task fixtures.');
  const done = {
    ...completed,
    name: 'Invoice filed',
    original_name: 'Invoice filed',
  };
  const hidden = {
    ...backlog,
    uid: 'hidden-invoice',
    name: 'Invoice later',
    original_name: 'Invoice later',
    defer_until: '2099-01-01',
  };
  await installApi(page, {
    history: [done],
    searchResults: [...TODAY_TASKS.slice(0, 1), done, hidden],
  });
  await page.goto('/only-tdy/history');
  const completedSearch = page.getByRole('combobox', {
    name: 'Search completed tasks',
  });
  await completedSearch.fill('invoice');
  await completedSearch.press('Enter');
  await expect(page.getByText('Invoice filed', { exact: true })).toBeVisible();
  await expect(page.getByText('Send the invoice')).toHaveCount(0);

  await page.getByRole('button', { name: 'All tasks', exact: true }).click();
  const allSearch = page.getByRole('combobox', { name: 'Search all tasks' });
  await expect(allSearch).toHaveValue('');
  await allSearch.fill('invoice');
  await allSearch.press('Enter');
  await expect(page.getByText('Send the invoice')).toBeVisible();
  await expect(page.getByText('Invoice later', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Complete|Reopen/ }),
  ).toHaveCount(0);

  await openHistory(page);
  await expect(
    page.getByRole('combobox', { name: 'Search completed tasks' }),
  ).toHaveValue('');
  await expect(page.getByText('Invoice filed', { exact: true })).toBeVisible();
  await expect(page.getByText('Invoice later', { exact: true })).toHaveCount(0);
});

test('switches Today between add and scoped search, and clears either input', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/');
  await expect(page.getByText('Send the invoice')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to search' }).click();
  const search = page.getByRole('combobox', { name: 'Search Today' });
  await search.fill('invoice');
  await page.getByRole('button', { name: 'Search Today', exact: true }).click();
  await expect(page.getByText('Send the invoice')).toBeVisible();
  await expect(page.getByText('Book the appointment')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear input' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByText('Book the appointment')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to add' }).click();
  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  await capture.fill('New thought');
  await page.getByRole('button', { name: 'Clear input' }).click();
  await expect(capture).toHaveValue('');
});

test('captures from All and Backlog without leaving the page', async ({
  page,
}) => {
  await installApi(page);
  await page.route('**/api/task', (route) =>
    route.fulfill({
      json: {
        ...BACKLOG_TASKS[0],
        uid: 'captured-task',
        name: 'New task',
        original_name: 'New task',
      },
    }),
  );
  for (const destination of ['all', 'backlog']) {
    await page.goto(`/only-tdy/${destination}`);
    await page.getByRole('button', { name: 'Switch to add' }).click();
    const capture = page.getByRole('combobox', { name: 'What needs doing?' });
    await capture.fill('New task');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(capture).toHaveValue('');
    await expect(page).toHaveURL(new RegExp(`/only-tdy/${destination}$`));
  }
});

test('shows All card details and saves a compact edit back to All', async ({
  page,
}, testInfo) => {
  const detail = {
    ...INVOICE_DETAIL,
    status: 0,
    due_date: '2099-12-20',
    defer_until: '2099-12-10',
  };
  await installApi(page, { all: [detail] });
  await installTaskApi(page, detail);
  await page.goto('/only-tdy/all');
  await expect(page.getByText('Hide until 10-12-2099')).toBeVisible();
  await expect(page.getByText('Due 20-12-2099')).toBeVisible();
  await expect(page.getByText(detail.note ?? '')).toBeVisible();
  await expect(
    page.locator('.focus-row__badge').getByText('Backlog', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Send the invoice' }).click();
  await page.getByRole('button', { name: 'Compact form' }).click();
  await expect(page.getByRole('combobox', { name: 'Priority' })).toHaveValue(
    'high',
  );
  await expect(page.getByRole('combobox', { name: 'Tags' })).toHaveValue(
    '#finance',
  );
  await expectNoSeriousAxeViolations(page);
  await page.screenshot({
    path: testInfo.outputPath('compact-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('compact-mobile.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('textbox', { name: 'Notes' }).fill('Updated note');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/only-tdy\/all$/);
  await page.getByRole('link', { name: 'Send the invoice' }).click();
  await expect(
    page.getByRole('button', { name: 'Compact form' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('shows the selected Guide and About icons in the footer', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/');
  for (const name of ['Guide', 'About']) {
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('link', { name, exact: true }).click();
    await expect(
      page.getByRole('button', { name, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('link', { name: 'Back to the list' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'More', exact: true }),
    ).not.toHaveClass(/focus-history--active/);
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page).toHaveURL(/\/only-tdy\/$/);
  }
});

test('keeps All in the footer with the shared active style and no completion controls', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/');
  const all = page.getByRole('button', { name: 'All tasks', exact: true });
  await expect(all).toBeVisible();
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  const homeStyle = await page
    .getByRole('button', { name: 'Today', exact: true })
    .evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        color: getComputedStyle(node.querySelector('svg') ?? node).color,
        opacity: style.opacity,
      };
    });
  await expect(
    page.getByRole('link', { name: 'Send the invoice' }),
  ).toBeVisible();
  const priorities = await page.locator('.focus-row').evaluateAll((rows) =>
    rows.map((row) => {
      const box = row.querySelector('.focus-complete__box');
      if (box === null) throw new Error('Today checkbox is missing.');
      return {
        title: row.querySelector('.focus-row__title')?.textContent ?? '',
        color: getComputedStyle(box).borderTopColor,
      };
    }),
  );
  await all.click();
  await expect(
    page.getByRole('link', { name: 'Send the invoice' }),
  ).toBeVisible();
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: 'High priority' })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Medium priority' }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Low priority' }).first(),
  ).toBeVisible();
  for (const priority of priorities) {
    const row = page.locator('.focus-row').filter({
      has: page.getByRole('link', { name: priority.title, exact: true }),
    });
    expect(
      await row
        .getByRole('img', { name: /priority/ })
        .evaluate((node) => getComputedStyle(node).color),
    ).toBe(priority.color);
  }
  await page.getByRole('button', { name: 'Backlog', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Replace the hallway bulb' }),
  ).toBeVisible();
  const backlogPriorities = await page
    .locator('.focus-row')
    .evaluateAll((rows) =>
      rows.map((row) => {
        const box = row.querySelector('.focus-complete__box');
        if (box === null) throw new Error('Backlog checkbox is missing.');
        return {
          title: row.querySelector('.focus-row__title')?.textContent ?? '',
          color: getComputedStyle(box).borderTopColor,
        };
      }),
    );
  await all.click();
  for (const priority of backlogPriorities) {
    const row = page.locator('.focus-row').filter({
      has: page.getByRole('link', { name: priority.title, exact: true }),
    });
    expect(
      await row
        .getByRole('img', { name: /priority/ })
        .evaluate((node) => getComputedStyle(node).color),
    ).toBe(priority.color);
  }
  const badgeColors = await page
    .locator('.focus-row__badge--list')
    .evaluateAll((badges) =>
      badges.map((badge) => getComputedStyle(badge).borderTopColor),
    );
  expect(new Set(badgeColors).size).toBe(1);
  await expect
    .poll(() =>
      all.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          color: getComputedStyle(node.querySelector('svg') ?? node).color,
          opacity: style.opacity,
        };
      }),
    )
    .toEqual(homeStyle);
  await expect(
    page
      .locator('.focus-listing')
      .getByRole('button', { name: /Complete|Reopen/ }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'More' }).click();
  await expect(
    page
      .locator('.focus-more__panel')
      .getByRole('button', { name: 'All tasks' }),
  ).toHaveCount(0);
});

test('keeps compact form geometry and its page footer consistent with the normal form', async ({
  page,
}, testInfo) => {
  await installApi(page);
  await installTaskApi(page, {
    ...INVOICE_DETAIL,
    status: 0,
    due_date: '2099-12-20',
    defer_until: '2099-12-10',
  });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/only-tdy/task/task-invoice');
    const toggle = page.getByRole('button', { name: 'Compact form' });
    await expect(toggle).toBeVisible();
    if ((await toggle.getAttribute('aria-pressed')) === 'true')
      await toggle.click();
    const geometry = async () =>
      page.locator('.focus-detail').evaluate((form) => ({
        fields: [...form.querySelectorAll('.focus-field')].map((field) => {
          const style = getComputedStyle(field);
          return {
            paddingLeft: style.paddingLeft,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            minHeight: style.minHeight,
            direction: style.flexDirection,
            gap: style.gap,
          };
        }),
        groups: [...form.querySelectorAll('.focus-group')].map((group) => {
          const style = getComputedStyle(group);
          return { display: style.display, marginTop: style.marginTop };
        }),
      }));
    const normal = await geometry();
    await toggle.click();
    expect(await geometry()).toEqual(normal);
    expect(
      await toggle.evaluate(
        (node) => node.closest('footer')?.parentElement?.tagName,
      ),
    ).toBe('MAIN');
    expect(await toggle.evaluate((node) => node.closest('form'))).toBeNull();
    const footer = await page.locator('.focus-footer').boundingBox();
    if (footer === null) throw new Error('Page footer is missing.');
    expect(footer.y + footer.height).toBeGreaterThanOrEqual(899);
    expect(footer.y + footer.height).toBeLessThanOrEqual(900);
    await expectNoSeriousAxeViolations(page);
    await page.screenshot({
      path: testInfo.outputPath(`compact-${String(width)}.png`),
      fullPage: true,
    });
  }
});

test('collapses empty status rows beneath the entry field', async ({
  page,
}) => {
  await installApi(page);
  const expectNoGap = async () => {
    const input = await page.locator('.focus-capture').boundingBox();
    const list = await page.locator('.focus-listing').boundingBox();
    if (input === null || list === null)
      throw new Error('Input or list is missing.');
    expect(list.y - input.y - input.height).toBeCloseTo(0, 1);
  };
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/only-tdy/',
      '/only-tdy/backlog',
      '/only-tdy/all',
      '/only-tdy/history',
    ]) {
      await page.goto(path);
      await expect(page.locator('.focus-row__title').first()).toBeVisible();
      await expectNoGap();
      if (path === '/only-tdy/backlog') {
        await page.getByRole('button', { name: 'Switch to add' }).click();
        await expectNoGap();
        await page
          .getByRole('button', {
            name: 'Add “Replace the hallway bulb” to Today',
          })
          .click();
        await expect(page.getByText('1 selected')).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Move to Today' }),
        ).toBeVisible();
        await page
          .getByRole('button', {
            name: 'Leave “Replace the hallway bulb” in Backlog',
          })
          .click();
        await expectNoGap();
      }
    }
  }
});
