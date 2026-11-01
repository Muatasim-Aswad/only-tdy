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

function fixtureTasks(count: number, status?: number) {
  return Array.from({ length: count }, (_, index) => {
    const task = TODAY_TASKS[index % TODAY_TASKS.length];
    if (!task) throw new Error('Missing synthetic task fixture');
    return {
      ...task,
      uid: `bounds-${String(index)}`,
      status: status ?? task.status,
    };
  });
}

async function expectReachableLesson(page: Page) {
  await expect(tip(page)).toBeVisible();
  await expect
    .poll(async () =>
      tip(page).evaluate((dialog) => {
        const viewport = window.visualViewport;
        const left = viewport?.offsetLeft ?? 0;
        const top = viewport?.offsetTop ?? 0;
        const right = left + (viewport?.width ?? innerWidth);
        const bottom = top + (viewport?.height ?? innerHeight);
        const popup = dialog.getBoundingClientRect();
        return [dialog, ...dialog.querySelectorAll('button')].every(
          (element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              rect.left >= left &&
              rect.top >= top &&
              rect.right <= right &&
              rect.bottom <= bottom &&
              rect.left >= popup.left &&
              rect.top >= popup.top &&
              rect.right <= popup.right &&
              rect.bottom <= popup.bottom
            );
          },
        );
      }),
    )
    .toBe(true);
}

for (const locale of ['en', 'ar']) {
  for (const [lesson, count, height] of [
    ['capture', 0, 480],
    ['tokens', 0, 480],
    ['tokens', 1, 480],
    ['reference', 0, 480],
    ['reference', 0, 720],
    ['backlog-tools', 1, 480],
    ['backlog-tools', 5, 720],
    ['backlog-tools', 10, 720],
  ] as const) {
    test(`popup bounds: ${lesson}, ${locale}, ${String(count)} tasks, 390x${String(height)}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height });
      const tasks = fixtureTasks(count, lesson === 'backlog-tools' ? 0 : 1);
      const saved = await setup(
        page,
        initial({
          done: GUIDANCE_LESSONS.filter((id) => id !== lesson),
        }),
        locale,
        { today: tasks, backlog: tasks, history: [] },
      );
      await page.goto(
        lesson === 'backlog-tools' ? '/only-tdy/backlog' : '/only-tdy/',
      );
      if (lesson === 'tokens' || lesson === 'reference') {
        await page.getByRole('combobox').click();
      }
      await expect(tip(page)).toHaveAttribute(
        'aria-labelledby',
        `guidance-${lesson}`,
      );
      await expectReachableLesson(page);
      expect(saved().done).not.toContain(lesson);
      await page.keyboard.press('Escape');
      await expect(tip(page)).toHaveCount(0);
      await expect(page.locator('.react-joyride__overlay')).toHaveCount(0);
      await expect.poll(() => saved().done).toContain(lesson);
      await page.getByRole('combobox').click();
    });
  }
}

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
    for (let index = 0; index < GUIDANCE_LESSONS.length; index++) {
      await expect(tip(page)).toBeVisible();
      await expect(tip(page)).toHaveAttribute(
        'aria-labelledby',
        `guidance-${GUIDANCE_LESSONS[index] ?? ''}`,
      );
      await expectReachableLesson(page);
      await expect.poll(() => saved().done).toContain(GUIDANCE_LESSONS[index]);
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
              ? index === GUIDANCE_LESSONS.length - 1
                ? 'إنهاء'
                : 'التالي'
              : index === GUIDANCE_LESSONS.length - 1
                ? 'Finish'
                : 'Next',
          exact: true,
        })
        .click();
    }
    await expect(tip(page)).toHaveCount(0);
    expect(saved().done).toHaveLength(GUIDANCE_LESSONS.length);
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
  await expectReachableLesson(page);
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
  await expect(tip(page)).toBeInViewport({ ratio: 1 });
  for (const action of await tip(page).getByRole('button').all())
    await expect(action).toBeInViewport({ ratio: 1 });
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

for (const locale of ['en', 'ar']) {
  for (const count of [0, 10]) {
    test(`keeps every full-tour lesson reachable at 320x480, ${locale}, ${String(count)} tasks`, async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: 320, height: 480 });
      const tasks = fixtureTasks(count);
      const saved = await setup(page, initial(), locale, {
        today: tasks,
        backlog: tasks.map((task) => ({ ...task, status: 0 })),
        history: [],
      });
      await page.goto('/only-tdy/guide');
      await page
        .getByRole('button', {
          name: locale === 'ar' ? 'ابدأ الجولة' : 'Start tour',
          exact: true,
        })
        .click();
      for (const lesson of GUIDANCE_LESSONS) {
        await expect(tip(page)).toHaveAttribute(
          'aria-labelledby',
          `guidance-${lesson}`,
        );
        await expectReachableLesson(page);
        await expect.poll(() => saved().done).toContain(lesson);
        await tip(page).locator('[data-action="primary"]').click();
      }
      await expect(tip(page)).toHaveCount(0);
      await expect(page.locator('.react-joyride__overlay')).toHaveCount(0);
    });
  }
}

test('keeps an open lesson reachable through scrolling, layout changes, resizing and visual viewport zoom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 720 });
  const tasks = fixtureTasks(30);
  const saved = await setup(
    page,
    initial({ done: GUIDANCE_LESSONS.filter((id) => id !== 'capture') }),
    'en',
    { today: tasks, history: [] },
  );
  await page.goto('/only-tdy/');
  await expectReachableLesson(page);
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await expectReachableLesson(page);
  await page.setViewportSize({ width: 320, height: 320 });
  await expectReachableLesson(page);
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.style.paddingTop = '100px';
  });
  await expectReachableLesson(page);
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.5 });
  await expect
    .poll(() => page.evaluate(() => window.visualViewport?.width ?? innerWidth))
    .toBeLessThan(320);
  await expectReachableLesson(page);
  expect(saved().done).not.toContain('capture');
  await page.keyboard.press('Tab');
  expect(
    await tip(page).evaluate((dialog) =>
      dialog.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(tip(page)).toHaveCount(0);
  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Guide', exact: true }),
  ).toBeVisible();
});

test('defers an unsuccessful presentation without learning it or leaving a blocking overlay', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 480 });
  const saved = await setup(
    page,
    initial({ done: GUIDANCE_LESSONS.filter((id) => id !== 'tokens') }),
    'en',
    { today: [], history: [] },
  );
  await page.goto('/only-tdy/');
  await page.getByRole('combobox').click();
  await expectReachableLesson(page);
  await page.setViewportSize({ width: 320, height: 100 });
  await expect(tip(page)).toHaveCount(0);
  await expect(page.locator('.react-joyride__overlay')).toHaveCount(0);
  expect(saved().done).not.toContain('tokens');
  await expect.poll(() => saved().later.tokens).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 480 });
  await page.reload();
  await page.getByRole('combobox').click();
  await expectReachableLesson(page);
  await tip(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await expect.poll(() => saved().done).toContain('tokens');
});

test('ignores an off-screen target and releases guidance if its target disappears', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 480 });
  const saved = await setup(
    page,
    initial({ done: GUIDANCE_LESSONS.filter((id) => id !== 'capture') }),
    'en',
    { today: [], history: [] },
  );
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.id = 'offscreen-fixture';
      style.textContent = '.focus-capture { transform: translateY(-2000px) }';
      document.head.append(style);
    });
  });
  await page.goto('/only-tdy/');
  await expect(page.getByRole('combobox')).toBeAttached();
  await page.clock.install();
  await page.clock.runFor(1000);
  await expect(tip(page)).toHaveCount(0);
  await expect(page.locator('.react-joyride__overlay')).toHaveCount(0);
  expect(saved().done).not.toContain('capture');
  await page.clock.resume();
  await page.evaluate(() => {
    document.querySelector('#offscreen-fixture')?.remove();
  });
  await page.getByRole('combobox').click();
  await expectReachableLesson(page);
  await page.locator('.focus-capture').evaluate((element) => {
    (element as HTMLElement).style.display = 'none';
  });
  await expect(tip(page)).toHaveCount(0);
  await expect(page.locator('.react-joyride__overlay')).toHaveCount(0);
  expect(saved().done).not.toContain('capture');
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Guide', exact: true }),
  ).toBeVisible();
});

test('does not learn a full-tour lesson that cannot be presented', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  const saved = await setup(page, initial(), 'en', {
    today: [],
    backlog: [],
    history: [],
  });
  await page.goto('/only-tdy/guide');
  await page.addStyleTag({
    content: '.guidance-tooltip { max-block-size: 1px !important }',
  });
  await page.getByRole('button', { name: 'Start tour', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Tour ended.' }),
  ).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
  await expect(page.locator('.react-joyride__overlay')).toHaveCount(0);
  expect(saved().done).not.toContain('capture');
});

for (const locale of ['en', 'ar']) {
  test(`scrolls long ${locale} lesson content by keyboard while its actions stay visible`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 320 });
    await setup(
      page,
      initial({ done: GUIDANCE_LESSONS.filter((id) => id !== 'tokens') }),
      locale,
      { today: [], history: [] },
    );
    await page.goto('/only-tdy/');
    await page.getByRole('combobox').click();
    await expectReachableLesson(page);
    await expect(tip(page).locator('[data-action=primary]')).toBeFocused();
    const content = tip(page).getByRole('region');
    expect(
      await content.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    await content.focus();
    await page.keyboard.press('End');
    await expect
      .poll(() => content.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await expectReachableLesson(page);
    await page.keyboard.press('Tab');
    expect(
      await tip(page).evaluate((dialog) =>
        dialog.contains(document.activeElement),
      ),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(tip(page)).toHaveCount(0);
  });
}

test('releases an automatic lesson when browser navigation removes its target', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 480 });
  const saved = await setup(
    page,
    initial({ done: GUIDANCE_LESSONS.filter((id) => id !== 'capture') }),
  );
  await page.goto('/only-tdy/backlog');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expectReachableLesson(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/only-tdy\/backlog$/);
  await expect(tip(page)).toHaveCount(0);
  await expect(page.locator('.react-joyride__overlay')).toHaveCount(0);
  expect(saved().done).not.toContain('capture');
  await page
    .getByRole('button', {
      name: 'Add “Replace the hallway bulb” to Today',
      exact: true,
    })
    .click();
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible();
});
