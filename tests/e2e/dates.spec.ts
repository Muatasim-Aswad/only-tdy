import { expect, test } from '@playwright/test';
import { installApi, installTaskApi, INVOICE_DETAIL } from './fixtures.ts';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-09T23:30:00Z'));
});

test('loads the guide on a cold visit and explains the date grammar', async ({
  page,
}) => {
  await installApi(page);
  await page.goto('/only-tdy/guide');
  await expect(
    page.getByRole('heading', { name: 'Capturing a task' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Date tokens' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'N calendar days from today. +3 means three days; +3d and +3days also work.',
    ),
  ).toBeVisible();
});

test('loads About on cold visits and preserves old Version links', async ({
  page,
}, testInfo) => {
  await installApi(page);
  for (const path of ['/only-tdy/about', '/only-tdy/version']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/only-tdy\/about$/);
    await expect(
      page.getByRole('heading', { name: 'About only-tdy' }),
    ).toBeVisible();
    await expect(page.getByText('App version', { exact: true })).toBeVisible();
    await expect(page.getByText('Revision', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'About', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const intro = await page.locator('.focus-about').boundingBox();
    const facts = await page.locator('.focus-version').boundingBox();
    if (intro === null || facts === null)
      throw new Error('About content is missing.');
    expect(intro.y + intro.height).toBeLessThan(facts.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(async () => document.fonts.ready);
    await page.screenshot({
      path: testInfo.outputPath(`about-${String(width)}.png`),
      fullPage: true,
    });
  }
});

test('allows an explicit move from Backlog to Today with a changed future deadline', async ({
  page,
}) => {
  await installApi(page);
  await installTaskApi(page, {
    ...INVOICE_DETAIL,
    status: 0,
    due_date: '2026-10-15',
    defer_until: '2026-10-14T22:00:00Z',
  });
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/task/task-invoice', async (route) => {
    if (route.request().method() === 'GET') return route.fallback();
    body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: {
        ...INVOICE_DETAIL,
        status: 6,
        due_date: body.due_date,
        defer_until: null,
      },
    });
  });
  await page.goto('/only-tdy/task/task-invoice');
  await expect(page.getByLabel('Hide until')).toBeVisible();
  await page.getByLabel('Status').selectOption('planned');
  await page.getByLabel('Due date').fill('2026-10-20');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect
    .poll(() => body)
    .toMatchObject({
      status: 'planned',
      due_date: '2026-10-20',
      defer_until: null,
    });
});

test('previews date completion, accepts Tab, and resolves relative capture dates on submit', async ({
  page,
}) => {
  await installApi(page);
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/task', async (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: {
        ...INVOICE_DETAIL,
        uid: 'new-date',
        status: 0,
        name: body.name,
        original_name: body.name,
        due_date: body.due_date,
        defer_until: body.defer_until,
      },
    });
  });
  await page.goto('/only-tdy/');
  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  await expect(page.getByText('Send the invoice')).toBeVisible();
  await capture.fill('Book trip /due:15');
  await expect(page.getByRole('option')).toContainText('15-10-2026');
  await capture.press('Tab');
  await expect(capture).toHaveValue('Book trip /due:15-10-2026 ');
  await capture.fill('Book trip /due:+7 /hide:+3days');
  await expect(page.getByRole('option')).toContainText('13-10-2026');
  await capture.press('Enter');
  await expect
    .poll(() => body)
    .toMatchObject({
      name: 'Book trip',
      status: 'not_started',
      due_date: '2026-10-17',
      defer_until: '2026-10-12T22:00:00.000Z',
    });
});

test('title grammar saves the future deadline and Backlog status together', async ({
  page,
}) => {
  await installApi(page);
  await installTaskApi(page);
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/task/task-invoice', async (route) => {
    if (route.request().method() === 'GET') return route.fallback();
    body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: {
        ...INVOICE_DETAIL,
        status: 0,
        due_date: body.due_date,
        name: body.name,
        original_name: body.name,
        defer_until: body.defer_until,
      },
    });
  });
  await page.goto('/only-tdy/task/task-invoice');
  const title = page.getByRole('combobox', { name: 'Title' });
  await expect(title).toHaveValue('Send the invoice');
  await expect(page.getByLabel('Hide until')).toHaveCount(0);
  await title.fill('Send later /due:tomorrow');
  await expect(
    page.getByRole('listbox', { name: 'Title suggestions' }),
  ).toContainText('11-10-2026');
  await title.press('Enter');
  await expect
    .poll(() => body)
    .toMatchObject({
      name: 'Send later',
      status: 'not_started',
      due_date: '2026-10-11',
      defer_until: null,
    });
});

test('Hide until is date-only and its draft survives unsaved status changes', async ({
  page,
}) => {
  await installApi(page);
  await installTaskApi(page, {
    ...INVOICE_DETAIL,
    status: 0,
    due_date: '2026-10-20',
    defer_until: '2026-10-14T22:00:00Z',
  });
  await page.goto('/only-tdy/task/task-invoice');
  const hide = page.getByLabel('Hide until');
  await expect(hide).toHaveAttribute('type', 'date');
  await expect(hide).toHaveValue('2026-10-15');
  await page.getByLabel('Status').selectOption('planned');
  await expect(hide).toHaveCount(0);
  await page.getByLabel('Status').selectOption('not_started');
  await expect(hide).toHaveValue('2026-10-15');
  await page.screenshot({
    path: '/tmp/only-tdy-date-form.png',
    fullPage: true,
  });
});

test('enables due promotion by default and remembers when it is turned off', async ({
  page,
}) => {
  await installApi(page);
  let promotions = 0;
  let writes = 0;
  await page.route('**/api/tasks?*', (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('order_by') === 'due_date:asc') promotions += 1;
    return route.fulfill({ json: { tasks: [] } });
  });
  await page.route('**/api/task/*', (route) => {
    writes += 1;
    return route.fulfill({ json: INVOICE_DETAIL });
  });
  await page.goto('/only-tdy/');
  await expect(page.getByText('Today is clear.')).toBeVisible();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  const setting = page.getByRole('combobox', {
    name: 'Move due tasks to Today',
    exact: true,
  });
  await expect(setting).toHaveValue('auto');
  await expect.poll(() => promotions).toBeGreaterThan(0);
  expect(writes).toBe(0);
  await setting.selectOption('manual');
  await expect(setting).toHaveValue('manual');
  await expect(page.getByRole('status')).toHaveText('Saved');
  const beforeReload = promotions;
  await page.reload();
  await expect(setting).toHaveValue('manual');
  expect(promotions).toBe(beforeReload);
  await setting.selectOption('auto');
  await expect(setting).toHaveValue('auto');
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect.poll(() => promotions).toBeGreaterThan(beforeReload);
  expect(writes).toBe(0);
});

test('default due sync promotes a hidden Backlog task and clears its hide value', async ({
  page,
}) => {
  await installApi(page);
  let moved = false;
  let writes = 0;
  await page.route('**/api/tasks?*', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('status') === 'done')
      return route.fulfill({ json: { tasks: [] } });
    if (params.get('type') === 'today')
      return route.fulfill({
        json: {
          tasks: moved
            ? [{ ...INVOICE_DETAIL, status: 6, defer_until: null }]
            : [],
        },
      });
    return route.fulfill({
      json: {
        tasks: [
          {
            ...INVOICE_DETAIL,
            status: moved ? 6 : 0,
            due_date: '2026-10-10',
            defer_until: '2026-10-10T10:00:00Z',
          },
        ],
        pagination: { hasMore: false },
      },
    });
  });
  await page.route('**/api/task/task-invoice', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      status: 'planned',
      defer_until: null,
    });
    moved = true;
    writes += 1;
    await route.fulfill({
      json: {
        ...INVOICE_DETAIL,
        status: 6,
        due_date: '2026-10-10',
        defer_until: null,
      },
    });
  });
  await page.goto('/only-tdy/');
  await expect(page.getByText('Send the invoice')).toBeVisible();
  expect(writes).toBe(1);
});
