import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  GUIDANCE_LESSONS,
  installApi,
  installTaskApi,
  TODAY_TASKS,
  type ApiScenario,
} from './fixtures.ts';
interface Progress {
  version: 1;
  used: string[];
  done: string[];
  later: Record<string, string>;
  startedVisit: string;
}
const initial = (changes: Partial<Progress> = {}): Progress => ({
  version: 1,
  used: [],
  done: [],
  later: {},
  startedVisit: '',
  ...changes,
});
async function setup(
  page: Page,
  progress = initial(),
  locale = 'en',
  scenario: ApiScenario = {},
) {
  await installApi(page, scenario);
  let settings = { onlyTdy: { guidance: JSON.stringify(progress), locale } };
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'PATCH')
      settings = (
        route.request().postDataJSON() as { ui_settings: typeof settings }
      ).ui_settings;
    await route.fulfill({
      json: { uid: 'user-e2e', timezone: 'UTC', ui_settings: settings },
    });
  });
  return () => JSON.parse(settings.onlyTdy.guidance) as Progress;
}
const tip = (page: Page) => page.getByRole('alertdialog');

test('starts tips automatically and offers the full tour from Guide', async ({
  page,
}) => {
  await setup(page, initial(), 'en', { today: [], backlog: [], history: [] });
  await page.goto('/only-tdy/');
  await expect(
    tip(page).getByRole('heading', { name: 'Add your first task' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await tip(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('link', { name: 'Guide', exact: true }).click();
  await page.getByRole('button', { name: 'Start tour', exact: true }).click();
  await expect(
    tip(page).getByRole('heading', { name: 'Add your first task' }),
  ).toBeVisible();
});

for (const locale of ['en', 'ar']) {
  test(`completes the full ${locale} tour with empty lists and no task writes`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({
      width: locale === 'ar' ? 320 : 1440,
      height: 900,
    });
    const saved = await setup(page, initial(), locale, {
      today: [],
      backlog: [],
      history: [],
    });
    const writes: string[] = [];
    page.on('request', (request) => {
      if (
        request.method() !== 'GET' &&
        /\/api\/task(?:s|\/|\?|$)/.test(request.url())
      )
        writes.push(request.url());
    });
    await page.goto('/only-tdy/guide');
    await page
      .getByRole('button', {
        name: locale === 'ar' ? 'ابدأ الجولة' : 'Start tour',
        exact: true,
      })
      .click();
    for (let index = 0; index < 12; index++) {
      await expect(tip(page)).toBeVisible();
      await expect(tip(page)).toHaveAttribute(
        'aria-labelledby',
        `guidance-${GUIDANCE_LESSONS[index] ?? ''}`,
      );
      if (index === 4) {
        await expect(page).toHaveURL(/\/only-tdy\/tour\/task$/);
        await expect(
          page.getByRole('combobox', {
            name: locale === 'ar' ? 'العنوان' : 'Title',
            exact: true,
          }),
        ).toHaveValue(locale === 'ar' ? 'اتصل بالمكتبة' : 'Call the library');
      }
      if (index === 5) {
        const compact = page.locator('[data-tour="compact"]');
        await compact.click();
        await expect(compact).toHaveAttribute('aria-pressed', 'true');
      }
      if (index === 5 || index === 7) {
        await page.evaluate(async () => document.fonts.ready);
        await expect(page).toHaveScreenshot(
          `guidance-${index === 5 ? 'compact' : 'tokens'}-${locale}.png`,
        );
        const result = await new AxeBuilder({ page }).analyze();
        expect(
          result.violations.filter((v) =>
            ['serious', 'critical'].includes(v.impact ?? ''),
          ),
        ).toEqual([]);
      }
      await tip(page)
        .getByRole('button', {
          name:
            locale === 'ar'
              ? index === 11
                ? 'إنهاء'
                : 'التالي'
              : index === 11
                ? 'Finish'
                : 'Next',
          exact: true,
        })
        .click();
    }
    await expect(tip(page)).toHaveCount(0);
    expect(saved().done).toHaveLength(12);
    expect(writes).toEqual([]);
  });
}

test('introduces capture, then Backlog after a successful first addition without conflicting tips', async ({
  page,
}) => {
  await setup(page, initial(), 'en', { today: [], backlog: [], history: [] });
  const firstTask = {
    ...TODAY_TASKS[0],
    uid: 'first-task',
    name: 'First task',
    original_name: 'First task',
    status: 0,
  };
  let created = false;
  await page.route('**/api/task', (route) => {
    created = true;
    return route.fulfill({ json: firstTask });
  });
  await page.route('**/api/tasks?*', (route) => {
    const url = new URL(route.request().url());
    if (
      url.searchParams.get('type') === 'today' ||
      ['done', 'all'].includes(url.searchParams.get('status') ?? '')
    )
      return route.fallback();
    return route.fulfill({ json: { tasks: created ? [firstTask] : [] } });
  });
  await page.goto('/only-tdy/');
  await expect(
    tip(page).getByRole('heading', { name: 'Add your first task' }),
  ).toBeVisible();
  await tip(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(tip(page)).toHaveCount(0);
  const field = page.getByRole('combobox', { name: 'What needs doing?' });
  await field.fill('First task');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(
    tip(page).getByRole('heading', { name: 'Find it in Backlog' }),
  ).toBeVisible();
  await tip(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(tip(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Backlog', exact: true }).click();
  await expect(
    tip(page).getByRole('heading', { name: 'Select, move, and search' }),
  ).toBeVisible();
  await expect(tip(page)).toHaveCount(1);
  await expect(
    tip(page).getByText('Tokens let you add details', { exact: false }),
  ).toHaveCount(0);
  await tip(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(tip(page)).toHaveCount(0);
});

test('reminds only on a later visit and never automatically repeats a dismissed lesson', async ({
  page,
}) => {
  const saved = await setup(page, initial(), 'en', {
    today: [],
    backlog: [],
    history: [],
  });
  await page.goto('/only-tdy/');
  await tip(page).getByRole('button', { name: 'Remind me later' }).click();
  await expect.poll(() => saved().later.capture).toBeTruthy();
  await page.getByRole('button', { name: 'Backlog', exact: true }).click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(tip(page)).toHaveCount(0);
  await page.reload();
  await expect(
    tip(page).getByRole('heading', { name: 'Add your first task' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip(page)).toHaveCount(0);
  await expect.poll(() => saved().done).toContain('capture');
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: 'What needs doing?' }),
  ).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
});

const core = ['captured', 'backlog-populated', 'selected', 'moved', 'searched'];
test('waits for an empty field and teaches only unused token parts', async ({
  page,
}) => {
  await setup(
    page,
    initial({
      used: [
        ...core,
        'switch',
        'token-today',
        'token-tag',
        'suggestion',
        'more',
      ],
      done: ['today', 'editor', 'all'],
    }),
    'en',
    { today: [], history: [] },
  );
  await page.goto('/only-tdy/');
  const field = page.getByRole('combobox', { name: 'What needs doing?' });
  await field.fill('A draft that must not be interrupted');
  await field.click();
  await expect(tip(page)).toHaveCount(0);
  await field.fill('');
  await field.click();
  await expect(
    tip(page).getByRole('heading', { name: 'Add details as you type' }),
  ).toBeVisible();
  await expect(tip(page).getByText('!3', { exact: true })).toBeVisible();
  await expect(
    tip(page).getByText('/due:tomorrow', { exact: true }),
  ).toBeVisible();
  await expect(tip(page).getByText('/today', { exact: true })).toHaveCount(0);
  await expect(tip(page).getByText('#tag', { exact: true })).toHaveCount(0);
  await expect(
    tip(page).getByText('Tokens let you add details directly in the field.', {
      exact: true,
    }),
  ).toBeVisible();
});

test('shows compact guidance on a later editor visit and ends a full tour without resume', async ({
  page,
}) => {
  const saved = await setup(
    page,
    initial({ used: [...core, 'editor', 'saved-full'] }),
  );
  await installTaskApi(page);
  await page.goto('/only-tdy/task/task-invoice');
  await expect(
    tip(page).getByRole('heading', { name: 'Try the compact form' }),
  ).toBeVisible();
  await tip(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await page.goto('/only-tdy/guide');
  await page.getByRole('button', { name: 'Start tour', exact: true }).click();
  await tip(page).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    tip(page).getByRole('heading', { name: 'Find it in Backlog' }),
  ).toBeVisible();
  await tip(page)
    .getByRole('button', { name: 'End tour', exact: true })
    .click();
  await expect(tip(page)).toHaveCount(0);
  expect(saved().done).toEqual(expect.arrayContaining(['capture', 'backlog']));
  await page.goto('/only-tdy/guide');
  await expect(
    page.getByRole('button', { name: /Resume|Start over/ }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Start tour', exact: true }).click();
  await expect(
    tip(page).getByRole('heading', { name: 'Add your first task' }),
  ).toBeVisible();
});

test('keeps Arabic guidance usable in a short dark viewport and traps keyboard shortcuts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await setup(
    page,
    initial({
      used: [...core, 'switch', 'more'],
      done: ['today', 'editor', 'all'],
    }),
    'ar',
    { today: [], history: [] },
  );
  await page.goto('/only-tdy/');
  const field = page.getByRole('combobox', { name: 'ما الذي تريد إنجازه؟' });
  await field.click();
  await expect(tip(page)).toBeVisible();
  await expect(
    tip(page).getByRole('button', { name: 'فهمت', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Control+/');
  await expect(field).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(
      await tip(page).evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page).toHaveScreenshot('guidance-tokens-ar-short-dark.png');
  await tip(page).getByRole('button', { name: 'فهمت', exact: true }).click();
  await expect(tip(page)).toHaveCount(0);
});

test('keeps Guide focused on one tour action and skips viewed lessons afterward', async ({
  page,
}) => {
  const saved = await setup(page);
  await page.goto('/only-tdy/guide');
  const start = page.getByRole('button', { name: 'Start tour', exact: true });
  await expect(page.getByRole('switch')).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: /Resume|Start over|Learn as I go|No guidance/,
    }),
  ).toHaveCount(0);
  await start.hover();
  await expect(start).toHaveCSS('opacity', '0.85');
  await start.click();
  await expect(
    tip(page).getByRole('heading', { name: 'Add your first task' }),
  ).toBeVisible();
  await expect.poll(() => saved().done).toContain('capture');
  await tip(page)
    .getByRole('button', { name: 'End tour', exact: true })
    .click();
  await expect(tip(page)).toHaveCount(0);
  await page.getByRole('combobox', { name: 'What needs doing?' }).click();
  await expect(
    tip(page).getByRole('heading', { name: 'Add your first task' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Backlog', exact: true }).click();
  await expect(
    tip(page).getByRole('heading', { name: 'Select, move, and search' }),
  ).toBeVisible();
});

test('Settings can turn off automatic tips while the manual tour stays available', async ({
  page,
}) => {
  await setup(page, initial(), 'en', { today: [], backlog: [], history: [] });
  await page.goto('/only-tdy/settings');
  const tips = page.getByRole('switch', {
    name: 'Tips as you go',
    exact: true,
  });
  await expect(tips).toHaveAttribute('aria-checked', 'true');
  await tips.click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.goto('/only-tdy/');
  const field = page.getByRole('combobox', { name: 'What needs doing?' });
  await expect(field).toBeVisible();
  await page.clock.install();
  await field.click();
  await page.clock.runFor(1000);
  await expect(tip(page)).toHaveCount(0);
  await page.goto('/only-tdy/guide');
  await page.getByRole('button', { name: 'Start tour', exact: true }).click();
  await expect(
    tip(page).getByRole('heading', { name: 'Add your first task' }),
  ).toBeVisible();
});
