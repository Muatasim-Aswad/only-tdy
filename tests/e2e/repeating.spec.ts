import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FIXTURE_NOW, installApi } from './fixtures.ts';

async function installRepeatingApi(page: Page) {
  await page.clock.setFixedTime(new Date(FIXTURE_NOW));
  await installApi(page);
  const base = {
    note: '',
    defer_until: null,
    project_uid: null,
    priority: 0,
    tags: [],
    created_at: '2026-10-01T09:00:00Z',
  };
  const tasks: Record<string, unknown>[] = [
    {
      ...base,
      uid: 'ordinary',
      name: 'Choose a desk lamp',
      original_name: 'Choose a desk lamp',
      status: 0,
      due_date: null,
    },
    {
      ...base,
      uid: 'weekly',
      name: 'Review the week',
      original_name: 'Review the week',
      status: 0,
      due_date: '2026-10-23',
      recurrence_type: 'weekly',
      recurrence_interval: 1,
      recurrence_weekdays: [5],
    },
    {
      ...base,
      uid: 'plants',
      name: 'Water the plants',
      original_name: 'Water the plants',
      status: 6,
      due_date: '2026-10-20',
      recurrence_type: 'daily',
      recurrence_interval: 3,
      completion_based: true,
    },
  ];
  const completed: Record<string, unknown>[] = [];
  const patches: Record<string, unknown>[] = [];
  let skipped = 0;
  await page.route('**/api/tasks?*', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const rows =
      params.get('type') === 'today'
        ? tasks.filter((task) => [1, 4, 6].includes(Number(task.status)))
        : params.get('status') === 'done'
          ? tasks.filter((task) => task.status === 2)
          : params.get('status') === 'active'
            ? tasks.filter((task) => task.status !== 2)
            : tasks;
    await route.fulfill({
      json: {
        tasks: rows,
        tasks_completed_today: completed,
        pagination: { hasMore: false },
      },
    });
  });
  await page.route('**/api/task/*/timeline', async (route) => {
    const uid = route.request().url().split('/').at(-2);
    await route.fulfill({
      json: completed
        .filter((task) => task.uid === uid)
        .map((task) => ({
          event_type: 'recurring_occurrence_completed',
          created_at: task.completed_at,
          metadata: { original_due_date: task.due_date },
        })),
    });
  });
  await page.route('**/api/task/*/skip-occurrence', async (route) => {
    const entry = tasks.find(
      (task) => task.uid === route.request().url().split('/').at(-2),
    );
    if (!entry) throw new Error('Missing fixture task');
    skipped += 1;
    entry.due_date = '2026-11-06';
    entry.status = 0;
    await route.fulfill({ json: entry });
  });
  await page.route('**/api/task', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const entry = {
      ...base,
      ...body,
      tags: (body.tags as string[]).map((name) => ({ name })),
      uid: 'new-series',
      original_name: body.name,
      status: body.status === 'planned' ? 6 : 0,
    };
    tasks.push(entry);
    patches.push(body);
    await route.fulfill({ status: 201, json: entry });
  });
  await page.route('**/api/task/*', async (route) => {
    const entry = tasks.find(
      (task) => task.uid === route.request().url().split('/').at(-1),
    );
    if (!entry) throw new Error('Missing fixture task');
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON() as Record<string, unknown>;
      patches.push(patch);
      if (
        patch.status === 'done' &&
        entry.recurrence_type &&
        entry.recurrence_type !== 'none'
      ) {
        completed.push({ ...entry, status: 2, completed_at: FIXTURE_NOW });
        entry.status = 0;
        entry.due_date = '2026-10-23';
      } else {
        Object.assign(entry, patch, {
          status:
            patch.status === 'planned'
              ? 6
              : patch.status === 'done'
                ? 2
                : patch.status === 'not_started'
                  ? 0
                  : entry.status,
        });
        if (typeof patch.name === 'string') entry.original_name = patch.name;
      }
    }
    await route.fulfill({ json: entry });
  });
  return { patches, completed, skipped: () => skipped };
}

test('separates schedules from Backlog, advances completion, and keeps a durable read-only record', async ({
  page,
}) => {
  const api = await installRepeatingApi(page);
  await page.goto('/only-tdy/');
  await expect(
    page.getByRole('button', { name: 'Complete “Water the plants”' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('link', { name: 'Repeating', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Repeating', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Review the week Repeating', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^Complete/ })).toHaveCount(0);
  await page.goto('/only-tdy/backlog');
  await expect(
    page.getByRole('link', { name: 'Choose a desk lamp', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Review the week/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('link', { name: /Water the plants/ }),
  ).toHaveCount(0);
  await page.goto('/only-tdy/');
  await page
    .getByRole('button', { name: 'Complete “Water the plants”' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Complete “Water the plants”' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Reopen “Water the plants”' }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel('Completed “Water the plants”', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel('Completed “Water the plants”', { exact: true }),
  ).toBeVisible();
  expect(api.completed).toHaveLength(1);
  await page.goto('/only-tdy/history');
  await expect(
    page.getByLabel('Completed “Water the plants”', { exact: true }),
  ).toBeVisible();
  await page.goto('/only-tdy/repeating');
  await page
    .getByRole('link', { name: 'Review the week Repeating', exact: true })
    .click();
  await page.getByRole('button', { name: 'Skip this occurrence' }).click();
  await expect(
    page.getByRole('button', { name: 'Repeating', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Due 06-11-2026', { exact: true })).toBeVisible();
  expect(api.skipped()).toBe(1);
  expect(api.completed).toHaveLength(1);
});

test('enables and stops repeating through the ordinary editor without explanatory alerts', async ({
  page,
}) => {
  const api = await installRepeatingApi(page);
  await page.goto('/only-tdy/task/ordinary');
  await page
    .getByRole('combobox', { name: 'Repeat', exact: true })
    .selectOption('weekly');
  await page.getByRole('button', { name: 'Monday', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Every', exact: true }).fill('2');
  await page
    .getByRole('combobox', { name: 'Based on', exact: true })
    .selectOption('completion');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText(/changes affect future/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/only-tdy\/$/);
  expect(api.patches.at(-1)).toMatchObject({
    recurrence_type: 'weekly',
    recurrence_interval: 2,
    recurrence_weekdays: [1, 2],
    completion_based: true,
  });
  await page.goto('/only-tdy/repeating');
  await page
    .getByRole('link', { name: 'Choose a desk lamp Repeating', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Repeat', exact: true })
    .selectOption('none');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/only-tdy\/repeating$/);
  await expect(
    page.getByRole('link', { name: 'Review the week Repeating', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Choose a desk lamp/ }),
  ).toHaveCount(0);
  expect(api.patches.at(-1)).toMatchObject({ recurrence_type: 'none' });
});

test('uses the standard footer and add/search flow without saving an unfinished schedule', async ({
  page,
}) => {
  const api = await installRepeatingApi(page);
  await page.goto('/only-tdy/repeating');
  await expect(
    page.getByRole('button', { name: 'Today', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Backlog', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Switch to add', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'What needs doing?', exact: true })
    .fill('Clean the filters');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page).toHaveURL(/repeating\/new$/);
  expect(api.patches).toHaveLength(0);
  await expect(
    page.getByRole('combobox', { name: 'Title', exact: true }),
  ).toHaveValue('Clean the filters');
  await expect(
    page.getByRole('textbox', { name: 'Notes', exact: true }),
  ).toHaveCount(0);
  for (const name of ['Tags', 'Project', 'Status']) {
    await expect(page.getByRole('combobox', { name, exact: true })).toHaveCount(
      0,
    );
  }
  await page
    .getByRole('combobox', { name: 'Repeat', exact: true })
    .selectOption('monthly');
  await page
    .getByRole('spinbutton', { name: 'Day of month', exact: true })
    .fill('15');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/repeating$/);
  await expect(
    page.getByRole('link', {
      name: 'Clean the filters Repeating',
      exact: true,
    }),
  ).toBeVisible();
  expect(api.patches.at(-1)).toMatchObject({
    recurrence_type: 'monthly',
    recurrence_month_day: 15,
  });
  await page
    .getByRole('combobox', { name: 'Search repeating tasks', exact: true })
    .fill('filters');
  await expect(page.getByRole('link', { name: /Review the week/ })).toHaveCount(
    0,
  );
});

for (const path of [
  '/only-tdy/',
  '/only-tdy/backlog',
  '/only-tdy/all',
  '/only-tdy/repeating',
]) {
  test(`opens the repeating draft from ${path} capture and preserves the way back`, async ({
    page,
  }) => {
    const api = await installRepeatingApi(page);
    await page.goto(path);
    if (path !== '/only-tdy/') {
      await page
        .getByRole('button', { name: 'Switch to add', exact: true })
        .click();
    }
    const input = 'Clean filters /repeating #home /due:23-10-2026';
    await page
      .getByRole('combobox', { name: 'What needs doing?', exact: true })
      .fill(input);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page).toHaveURL(/repeating\/new$/);
    await expect(
      page.getByRole('combobox', { name: 'Title', exact: true }),
    ).toHaveValue('Clean filters');
    await expect(
      page.getByRole('combobox', { name: 'Tags', exact: true }),
    ).toHaveValue('home');
    expect(api.patches).toHaveLength(0);
    await page
      .getByRole('link', { name: 'Back to the list', exact: true })
      .click();
    expect(new URL(page.url()).pathname).toBe(path);
    if (path !== '/only-tdy/') {
      await page
        .getByRole('button', { name: 'Switch to add', exact: true })
        .click();
    }
    await expect(
      page.getByRole('combobox', { name: 'What needs doing?', exact: true }),
    ).toHaveValue(input);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/repeating$/);
    expect(api.patches).toHaveLength(1);
    expect(api.patches[0]).toMatchObject({
      name: 'Clean filters',
      recurrence_type: 'daily',
      tags: ['home'],
    });
  });
}

test('opens an empty repeating draft from the command and requires a title before saving', async ({
  page,
}) => {
  const api = await installRepeatingApi(page);
  await page.goto('/only-tdy/');
  await page
    .getByRole('combobox', { name: 'What needs doing?', exact: true })
    .fill('/repeating');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page).toHaveURL(/repeating\/new$/);
  await expect(
    page.getByRole('combobox', { name: 'Title', exact: true }),
  ).toHaveValue('');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByText('Type a task before saving it.', { exact: true }),
  ).toBeVisible();
  expect(api.patches).toHaveLength(0);
  await page
    .getByRole('combobox', { name: 'Title', exact: true })
    .fill('Clean filters');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/repeating$/);
  expect(api.patches).toHaveLength(1);
});

for (const project of [
  { name: 'Home', uid: 'project-home' },
  { name: 'Maintenance', uid: 'project-maintenance' },
]) {
  test(`keeps captured metadata editable and saves the ${project.name} project`, async ({
    page,
  }) => {
    const api = await installRepeatingApi(page);
    await page.route('**/api/project', async (route) => {
      await route.fulfill({ json: { uid: project.uid, name: project.name } });
    });
    await page.goto('/only-tdy/repeating');
    await page
      .getByRole('button', { name: 'Switch to add', exact: true })
      .click();
    await page
      .getByRole('combobox', { name: 'What needs doing?', exact: true })
      .fill(`Clean the filters *brush #home +${project.name} /due:23-10-2026`);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(
      page.getByRole('textbox', { name: 'Notes', exact: true }),
    ).toHaveValue('brush');
    await expect(
      page.getByRole('combobox', { name: 'Tags', exact: true }),
    ).toHaveValue('home');
    await expect(
      page
        .getByRole('combobox', { name: 'Project', exact: true })
        .locator('option:checked'),
    ).toHaveText(project.name);
    await page
      .getByRole('textbox', { name: 'Notes', exact: true })
      .fill('Use the brush');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/repeating$/);
    expect(api.patches.at(-1)).toMatchObject({
      note: 'Use the brush',
      tags: ['home'],
      project_uid: project.uid,
      status: 'not_started',
    });
  });
}

test('aligns every conditional recurrence field with the form columns', async ({
  page,
}) => {
  await installRepeatingApi(page);
  await page.goto('/only-tdy/task/weekly');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const type of [
      'daily',
      'weekly',
      'monthly',
      'monthly_weekday',
      'monthly_last_day',
    ]) {
      await page
        .getByRole('combobox', { name: 'Repeat', exact: true })
        .selectOption(type);
      const positions = await page
        .locator('.focus-repeat-fields .focus-field')
        .evaluateAll((rows) =>
          rows.map((row) => ({
            label: row
              .querySelector('.focus-field__label')
              ?.getBoundingClientRect().left,
            value: row
              .querySelector('input, select, .focus-repeat-fields__days')
              ?.getBoundingClientRect().left,
          })),
        );
      const first = positions[0];
      for (const position of positions) {
        expect(
          position.label,
          `${type} label at ${String(width)}px`,
        ).toBeCloseTo(first?.label ?? 0, 0);
        expect(
          position.value,
          `${type} value at ${String(width)}px`,
        ).toBeCloseTo(first?.value ?? 0, 0);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test('keeps Skip in the editor footer with focus and pending feedback', async ({
  page,
}) => {
  await installRepeatingApi(page);
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route('**/api/task/*/skip-occurrence', async (route) => {
    await pending;
    await route.fulfill({
      json: {
        uid: 'weekly',
        name: 'Review the week',
        original_name: 'Review the week',
        status: 0,
        priority: 0,
        tags: [],
        due_date: '2026-10-30',
        recurrence_type: 'weekly',
        recurrence_interval: 1,
        recurrence_weekdays: [5],
      },
    });
  });
  await page.goto('/only-tdy/task/weekly');
  const skip = page
    .locator('footer')
    .getByRole('button', { name: 'Skip this occurrence', exact: true });
  await expect(skip).toBeVisible();
  const resting = await skip.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  await skip.focus();
  await expect(skip).toBeFocused();
  expect(
    await skip.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe(resting);
  expect(
    await skip.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toBe('underline');
  await skip.click();
  await expect(
    page
      .locator('footer')
      .getByRole('button', { name: 'Skipping…', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Delete', exact: true }),
  ).toBeDisabled();
  finish();
  await expect(page).toHaveURL(/repeating$/);
});

test('keeps Repeating and its editor accessible in both themes and narrow layouts', async ({
  page,
}) => {
  await installRepeatingApi(page);
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/only-tdy/repeating');
      await expect(
        page.getByRole('link', {
          name: 'Review the week Repeating',
          exact: true,
        }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot(
        `repeating-${String(width)}-${scheme}.png`,
        { fullPage: true },
      );
      if (width === 390 || width === 1440) {
        await page
          .getByRole('link', { name: 'Review the week Repeating', exact: true })
          .click();
        await expect(
          page.getByRole('combobox', { name: 'Repeat', exact: true }),
        ).toHaveValue('weekly');
        await expect(page).toHaveScreenshot(
          `repeat-editor-${String(width)}-${scheme}.png`,
          { fullPage: true },
        );
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      (violation) =>
        violation.impact === 'critical' || violation.impact === 'serious',
    ),
  ).toEqual([]);
});
