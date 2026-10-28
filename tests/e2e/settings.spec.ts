import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  FIXTURE_NOW,
  GUIDANCE_COMPLETE,
  installApi,
  type RawTask,
} from './fixtures.ts';

const DEFAULTS = {
  theme: 'system',
  autoDuePromotion: true,
  datedBacklog: 'always',
  daysBeforeDue: 1,
  editorLayout: 'full',
  guidance: GUIDANCE_COMPLETE,
  guidanceTips: true,
  locale: 'en',
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(FIXTURE_NOW));
  await installApi(page);
});

test('uses the form picker for Theme and supports choosing with the pointer', async ({
  page,
}) => {
  await page.goto('/only-tdy/settings');
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await expect(theme).toHaveValue('system');
  for (const name of [
    'Theme',
    'Move due tasks to Today',
    'Show dated tasks in Backlog',
  ]) {
    expect(
      await page
        .getByRole('combobox', { name, exact: true })
        .evaluate((node) => getComputedStyle(node).textAlign),
    ).toBe('start');
  }
  expect(
    await theme.evaluate((node) => getComputedStyle(node).appearance),
  ).toBe('base-select');
  await theme.click();
  await page.getByRole('option', { name: 'Dark', exact: true }).click();
  await expect(theme).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.reload();
  await expect(theme).toHaveValue('dark');
});

test('keeps explanations behind keyboard-accessible help and status in the header', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/only-tdy/settings');
  await expect(
    page.getByRole('link', { name: 'Back', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText('Your preferences, across devices.')).toHaveCount(
    0,
  );
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const help = page.getByRole('button', {
    name: 'About dated tasks in Backlog',
  });
  await help.hover();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tooltip')).toContainText(
    'Hidden tasks remain available in All.',
  );
  const box = await page.getByRole('tooltip').boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(help).toBeFocused();
  const reset = page.getByRole('button', { name: 'Reset settings' });
  const restingColor = await reset.evaluate(
    (node) => getComputedStyle(node).color,
  );
  await reset.focus();
  await expect(reset).toBeFocused();
  expect(await reset.evaluate((node) => getComputedStyle(node).color)).toBe(
    restingColor,
  );
  expect(
    await reset.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toBe('underline');
  await help.focus();
  await reset.hover();
  expect(await reset.evaluate((node) => getComputedStyle(node).color)).toBe(
    restingColor,
  );
  expect(
    await reset.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toBe('underline');
  const status = await page.getByRole('status').boundingBox();
  const back = await page
    .getByRole('link', { name: 'Back', exact: true })
    .boundingBox();
  expect(Math.abs((status?.y ?? 0) - (back?.y ?? 0))).toBeLessThan(20);
  await expect(page.locator('header').getByRole('status')).toHaveText('Saved');
  await expect(
    page.getByRole('combobox', {
      name: 'Show dated tasks in Backlog',
      exact: true,
    }),
  ).toHaveValue('always');
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);
});

test('filters dated Backlog rows and counts while keeping All and explicit hide dates intact', async ({
  page,
}) => {
  const row = (
    uid: string,
    due_date?: string,
    defer_until?: string,
  ): RawTask & { due_date?: string } => ({
    uid,
    name: uid,
    original_name: uid,
    status: 0,
    priority: 0,
    tags: [],
    ...(due_date === undefined ? {} : { due_date }),
    ...(defer_until === undefined ? {} : { defer_until }),
  });
  const tasks = [
    row('Undated'),
    row('Due today', '2026-10-20'),
    row('Due tomorrow', '2026-10-21'),
    row('Due later', '2026-10-25'),
    row('Explicitly released', '2026-11-30', '2026-10-20'),
    row('Explicitly hidden', '2026-10-21', '2026-10-21'),
  ];
  await installApi(page, {
    today: [],
    backlog: tasks,
    all: tasks,
    searchResults: tasks,
  });
  let settings: Record<string, unknown> = {
    onlyTdy: { ...DEFAULTS, autoDuePromotion: false },
  };
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'PATCH')
      settings = (
        route.request().postDataJSON() as {
          ui_settings: Record<string, unknown>;
        }
      ).ui_settings;
    await route.fulfill({
      json: {
        uid: 'user-settings',
        timezone: 'Europe/Amsterdam',
        ui_settings: settings,
      },
    });
  });
  await page.goto('/only-tdy/settings');
  await page
    .getByRole('combobox', { name: 'Show dated tasks in Backlog', exact: true })
    .selectOption('before');
  await expect(
    page.getByRole('spinbutton', { name: 'Days before due' }),
  ).toHaveValue('1');
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.goto('/only-tdy/backlog');
  await expect(
    page.getByRole('link', { name: 'Due tomorrow', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Due later', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Explicitly released', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Explicitly hidden', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Plan from Backlog (4)' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'All tasks', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Due later', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Explicitly hidden', exact: true }),
  ).toBeVisible();
  await page.goto('/only-tdy/settings');
  await page
    .getByRole('combobox', { name: 'Show dated tasks in Backlog', exact: true })
    .selectOption('due');
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.goto('/only-tdy/backlog');
  await expect(
    page.getByRole('link', { name: 'Due today', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Due tomorrow', exact: true }),
  ).toHaveCount(0);
});

test('recovers a missing server namespace and retries only pending local changes', async ({
  page,
}) => {
  let failWrites = false;
  let uiSettings: Record<string, unknown> = {
    project: { details: { showMetrics: false } },
    onlyTdy: { ...DEFAULTS },
  };
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'PATCH') {
      if (failWrites) {
        await route.fulfill({ status: 503, json: { error: 'Unavailable' } });
        return;
      }
      uiSettings = (
        route.request().postDataJSON() as {
          ui_settings: Record<string, unknown>;
        }
      ).ui_settings;
    }
    await route.fulfill({
      json: {
        uid: 'user-settings',
        timezone: 'Europe/Amsterdam',
        ui_settings: uiSettings,
      },
    });
  });
  await page.goto('/only-tdy/settings');
  failWrites = true;
  await page
    .getByRole('combobox', { name: 'Show dated tasks in Backlog', exact: true })
    .selectOption('before');
  await expect(page.getByRole('status')).toHaveText('Not synced');
  await page.reload();
  await expect(
    page.getByRole('combobox', {
      name: 'Show dated tasks in Backlog',
      exact: true,
    }),
  ).toHaveValue('before');
  await expect(page.getByRole('status')).toHaveText('Not synced');
  uiSettings = {
    ...uiSettings,
    onlyTdy: { ...DEFAULTS, theme: 'dark', daysBeforeDue: 5 },
  };
  failWrites = false;
  await page.getByRole('button', { name: 'Retry sync' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await expect(
    page.getByRole('combobox', { name: 'Theme', exact: true }),
  ).toHaveValue('dark');
  await expect(
    page.getByRole('spinbutton', { name: 'Days before due' }),
  ).toHaveValue('5');
  expect(uiSettings.project).toEqual({ details: { showMetrics: false } });
  delete uiSettings.onlyTdy;
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Saved');
  expect(uiSettings.onlyTdy).toEqual({
    ...DEFAULTS,
    theme: 'dark',
    datedBacklog: 'before',
    daysBeforeDue: 5,
  });
  await page.getByRole('button', { name: 'Reset settings' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  expect(uiSettings.onlyTdy).toEqual(DEFAULTS);
});

test('uses the form back link without a footer and returns to the source list', async ({
  page,
}) => {
  await page.goto('/only-tdy/backlog');
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  const back = page.getByRole('link', {
    name: 'Back',
    exact: true,
  });
  await expect(back).toHaveAttribute('href', '/only-tdy/backlog');
  await expect(page.locator('.focus-footer')).toHaveCount(0);
  await page.reload();
  await back.click();
  await expect(page).toHaveURL(/\/only-tdy\/backlog$/);
  await page.goto('/only-tdy/settings');
  await expect(back).toHaveAttribute('href', '/only-tdy/');
  await back.click();
  await expect(page).toHaveURL(/\/only-tdy\/$/);
});

test('fits the unlabelled day count before its dropdown and grows with the digits', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/only-tdy/settings');
  const dated = page.getByRole('combobox', {
    name: 'Show dated tasks in Backlog',
    exact: true,
  });
  await dated.selectOption('before');
  await expect(dated.locator('option:checked')).toHaveText('days before due');
  const days = page.getByRole('spinbutton', { name: 'Days before due' });
  await expect(days).toHaveValue('1');
  await expect(page.getByText('Days before due', { exact: true })).toHaveCount(
    0,
  );
  const single = await days.boundingBox();
  await days.fill('365000');
  const multiple = await days.boundingBox();
  const dropdown = await dated.boundingBox();
  if (single === null || multiple === null || dropdown === null)
    throw new Error('The days input and dropdown must be visible.');
  expect(multiple.width).toBeGreaterThan(single.width);
  expect(multiple.x + multiple.width).toBeLessThan(dropdown.x);
  expect(Math.abs(multiple.y - dropdown.y)).toBeLessThan(2);
  expect(dropdown.x + dropdown.width).toBeLessThanOrEqual(320);
  await expect(page.getByRole('status')).toHaveText('Saved');
  await days.fill('0');
  await expect(page.getByRole('status')).toHaveText('Not saved');
  await expect(days).toHaveAttribute('aria-invalid', 'true');
});

test('enables contextual tips by default and saves the Settings switch', async ({
  page,
}) => {
  await page.goto('/only-tdy/settings');
  const tips = page.getByRole('switch', {
    name: 'Tips as you go',
    exact: true,
  });
  await expect(tips).toHaveAttribute('aria-checked', 'true');
  await tips.click();
  await expect(tips).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.reload();
  await expect(tips).toHaveAttribute('aria-checked', 'false');
  await tips.click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.reload();
  await expect(tips).toHaveAttribute('aria-checked', 'true');
});
