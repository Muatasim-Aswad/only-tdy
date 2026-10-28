import { expect, test } from '@playwright/test';

import {
  BACKLOG_TASKS,
  HISTORY_TASKS,
  installApi,
  installProfileApi,
  TODAY_TASKS,
} from '../e2e/fixtures.ts';

const WIDTHS = [320, 390, 768, 1440] as const;
const SCHEMES = ['light', 'dark'] as const;
const SCENARIOS = [
  'today',
  'today-clear',
  'backlog-page',
  'backlog-chosen',
  'backlog-search-empty',
  'empty',
  'input-focus',
  'validation',
  'hidden-success',
  'loading',
  'offline',
  'expired',
  'rollback',
  'done',
  'history',
  'history-empty',
  'zoom-200',
  'keyboard-focus',
  'reduced-motion',
  'forced-colors',
] as const;

type Scenario = (typeof SCENARIOS)[number];

test('matches the reviewed visual acceptance matrix', async ({
  page,
  context,
}) => {
  test.setTimeout(360_000);
  let scenario: Scenario = 'today';
  await installProfileApi(page);

  await page.route('**/api/tasks?*', async (route) => {
    if (scenario === 'loading') return new Promise<void>(() => undefined);
    if (scenario === 'expired') {
      await route.fulfill({ status: 401, json: { error: 'Session expired' } });
      return;
    }
    const url = new URL(route.request().url());
    if (url.searchParams.get('status') === 'done') {
      const done = scenario === 'history-empty' ? [] : HISTORY_TASKS;
      await route.fulfill({ json: { tasks: done } });
      return;
    }
    if (url.searchParams.get('status') === 'all') {
      await route.fulfill({
        json: {
          tasks: [...TODAY_TASKS, ...BACKLOG_TASKS, ...HISTORY_TASKS],
          pagination: { hasMore: false },
        },
      });
      return;
    }
    const isToday = url.searchParams.get('type') === 'today';
    const todayTasks =
      scenario === 'today-clear' || scenario === 'empty' ? [] : TODAY_TASKS;
    const backlogTasks =
      scenario === 'empty' || url.searchParams.get('tag') !== null
        ? []
        : BACKLOG_TASKS;
    await route.fulfill({
      json: { tasks: isToday ? todayTasks : backlogTasks },
    });
  });
  await page.route('**/api/projects', (route) =>
    route.fulfill({
      json: { projects: [{ uid: 'project-home', name: 'Home' }] },
    }),
  );
  await page.route('**/api/csrf-token', (route) =>
    route.fulfill({ json: { csrfToken: 'visual-token' } }),
  );
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
  await page.route('**/api/task/*', async (route) => {
    if (scenario === 'rollback') {
      await route.fulfill({
        status: 500,
        json: { error: 'Completion failed' },
      });
      return;
    }
    await route.fulfill({ json: { ...TODAY_TASKS[0], status: 2 } });
  });

  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      for (const nextScenario of SCENARIOS) {
        scenario = nextScenario;
        await context.setOffline(false);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({
          colorScheme: scheme,
          forcedColors: nextScenario === 'forced-colors' ? 'active' : 'none',
          reducedMotion:
            nextScenario === 'reduced-motion' ? 'reduce' : 'no-preference',
        });
        const backlogPage = nextScenario.startsWith('backlog-');
        await page.goto(backlogPage ? '/only-tdy/backlog' : '/only-tdy/');

        const capture = page.getByRole('combobox', {
          name: 'What needs doing?',
        });
        if (backlogPage) {
          const search = page.getByRole('combobox', {
            name: 'Search the backlog',
          });
          await expect(search).toBeVisible();

          if (nextScenario === 'backlog-search-empty') {
            await search.fill('#nothing');
            await search.press('Enter');
            await expect(
              page.getByText('Nothing in the backlog matches that.'),
            ).toBeVisible();
          } else {
            await expect(
              page.getByText('Replace the hallway bulb'),
            ).toBeVisible();
          }

          if (nextScenario === 'backlog-chosen') {
            await page
              .getByRole('button', {
                name: 'Add “Replace the hallway bulb” to Today',
              })
              .click();
            await expect(page.getByText('1 selected')).toBeVisible();
          }

          await page.evaluate(async () => document.fonts.ready);
          await expect(page).toHaveScreenshot(
            `${nextScenario}-${String(width)}-${scheme}.png`,
            { fullPage: true },
          );
          continue;
        }

        if (nextScenario === 'expired') {
          await expect(
            page.getByRole('button', { name: 'Sign in', exact: true }),
          ).toBeVisible();
          await page.evaluate(async () => document.fonts.ready);
          await expect(page).toHaveScreenshot(
            `${nextScenario}-${String(width)}-${scheme}.png`,
            { fullPage: true },
          );
          continue;
        }
        await expect(capture).toBeVisible();
        if (nextScenario !== 'loading' && nextScenario !== 'history-empty') {
          await expect(
            page
              .getByRole('listitem')
              .or(page.getByText('Today is clear.', { exact: false }))
              .first(),
          ).toBeVisible();
        }

        if (nextScenario === 'input-focus') await capture.focus();
        if (nextScenario === 'validation') {
          await capture.fill('Write the proposal !1 !3');
          await page.getByRole('button', { name: 'Add' }).click();
          await expect(
            page.getByText('Choose one priority: !1, !2, or !3.'),
          ).toBeVisible();
        }
        if (nextScenario === 'hidden-success') {
          await capture.fill('Replace filter');
          await page.getByRole('button', { name: 'Add' }).click();
          await expect(page.getByText('Added to Backlog')).toBeVisible();
        }
        if (nextScenario === 'offline') {
          await capture.fill('Book the MOT');
          await context.setOffline(true);
          await expect(
            page.getByText('You’re offline. Reconnect to load and save tasks.'),
          ).toBeVisible();
        }
        if (nextScenario === 'rollback') {
          await page
            .getByRole('button', { name: 'Complete “Send the invoice”' })
            .click();
          await expect(
            page.getByText('Task wasn’t completed. Try again.'),
          ).toBeVisible();
        }
        if (nextScenario === 'done') {
          await page
            .getByRole('button', { name: 'Complete “Send the invoice”' })
            .click();
          await expect(
            page.getByRole('button', { name: 'Reopen “Send the invoice”' }),
          ).toBeVisible();
        }
        if (nextScenario === 'history' || nextScenario === 'history-empty') {
          await page.getByRole('button', { name: 'More' }).click();
          await page.getByRole('button', { name: 'Completed tasks' }).click();
          await expect(
            page
              .getByText('File the tax return')
              .or(page.getByText('Nothing completed yet.')),
          ).toBeVisible();
        }
        if (nextScenario === 'zoom-200') {
          await page.evaluate(() => {
            document.documentElement.style.zoom = '2';
          });
          await expect
            .poll(() =>
              page.evaluate(() => document.documentElement.style.zoom),
            )
            .toBe('2');
        }
        if (nextScenario === 'keyboard-focus') {
          await page.keyboard.press('Tab');
          await expect(
            page.getByRole('button', { name: 'Switch to search' }),
          ).toBeFocused();
          await page.keyboard.press('Tab');
          await expect(capture).toBeFocused();
        }
        if (nextScenario === 'loading') {
          await expect(page.getByText('Loading tasks…')).toBeVisible();
        }

        await page.evaluate(async () => document.fonts.ready);
        /*
         * Every scenario but one fits the screen, so a full-page capture is
         * the whole page. `zoom-200` does not, and the foot of the page is
         * now pinned to the foot of the screen — which a full-page capture
         * cannot show, because it renders a stuck element where it is stuck
         * and then carries on past it. That one is reviewed as the screen.
         */
        await expect(page).toHaveScreenshot(
          `${nextScenario}-${String(width)}-${scheme}.png`,
          { fullPage: nextScenario !== 'zoom-200' },
        );
      }
    }
  }
});

/**
 * The foot of the page, on a phone, at the two sizes the rest of the matrix
 * covers as widths. These are viewport screenshots rather than full-page ones
 * on purpose: what is under review is where the navigation sits relative to
 * the screen, which a full-page capture is by definition unable to show.
 */
test('keeps the navigation at the foot of the phone screen', async ({
  page,
}) => {
  test.setTimeout(120_000);

  const PHONES = [
    { name: '320', width: 320, height: 568 },
    { name: '390', width: 390, height: 664 },
  ] as const;

  const longList = Array.from({ length: 40 }, (_unused, index) => ({
    uid: `task-${String(index)}`,
    name: `Task number ${String(index)}`,
    original_name: `Task number ${String(index)}`,
    status: 1,
    priority: 0,
    tags: [],
  }));

  for (const scheme of SCHEMES) {
    for (const phone of PHONES) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: phone.width, height: phone.height });

      await installApi(page, { today: [], backlog: [] });
      await page.goto('/only-tdy/');
      await expect(
        page.getByText('Today is clear. Nothing waiting in the backlog.'),
      ).toBeVisible();
      await page.evaluate(async () => document.fonts.ready);
      await expect(page).toHaveScreenshot(
        `phone-nav-empty-${phone.name}-${scheme}.png`,
      );

      await installApi(page, { today: longList, backlog: [] });
      await page.goto('/only-tdy/');
      await expect(page.getByText('Task number 0')).toBeVisible();
      await page.evaluate(async () => document.fonts.ready);
      await expect(page).toHaveScreenshot(
        `phone-nav-long-top-${phone.name}-${scheme}.png`,
      );

      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await expect(page.getByText('Task number 39')).toBeVisible();
      await expect(page).toHaveScreenshot(
        `phone-nav-long-end-${phone.name}-${scheme}.png`,
      );
    }
  }
});

test('keeps the token guide readable on phones and desktop', async ({
  page,
}) => {
  await installProfileApi(page);
  for (const scheme of SCHEMES) {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/only-tdy/guide');
      await expect(
        page.getByRole('heading', { name: 'Date tokens' }),
      ).toBeVisible();
      await page.evaluate(async () => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await expect(page).toHaveScreenshot(
        `guide-${String(width)}-${scheme}.png`,
        { fullPage: true },
      );
    }
  }
});

test('keeps All priority indicators and neutral badges readable at every width', async ({
  page,
}) => {
  await installProfileApi(page);
  await installApi(page);
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/only-tdy/all');
      await expect(
        page.getByRole('link', { name: 'Send the invoice' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'File the tax return' }),
      ).toBeVisible();
      await expect(
        page.getByRole('img', { name: 'High priority' }),
      ).toBeVisible();
      await page.evaluate(async () => document.fonts.ready);
      await expect(page).toHaveScreenshot(
        `all-${String(width)}-${scheme}.png`,
        { fullPage: true },
      );
    }
  }
});

test('keeps Settings and its shared picker readable at every width', async ({
  page,
}) => {
  await installApi(page);
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/only-tdy/settings');
      await page
        .getByRole('combobox', {
          name: 'Show dated tasks in Backlog',
          exact: true,
        })
        .selectOption('before');
      await expect(page.getByRole('status')).toHaveText('Saved');
      await page.getByRole('spinbutton', { name: 'Days before due' }).fill('1');
      await page
        .getByRole('spinbutton', { name: 'Days before due' })
        .evaluate((node) => {
          node.blur();
        });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await expect(page).toHaveScreenshot(
        `settings-${String(width)}-${scheme}.png`,
        { fullPage: true },
      );
      if (width === 390) {
        await page
          .getByRole('combobox', { name: 'Theme', exact: true })
          .click();
        await expect(
          page.getByRole('option', { name: 'Dark', exact: true }),
        ).toBeVisible();
        await expect(page).toHaveScreenshot(
          `settings-theme-${String(width)}-${scheme}.png`,
          { fullPage: true },
        );
        await page.keyboard.press('Escape');
      }
    }
  }
});
