import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installApi, installTaskApi, TODAY_TASKS } from './fixtures.ts';

for (const [locale, heading] of [
  ['ar-EG', 'هل تريد المتابعة بهذه اللغة؟'],
  ['fr-FR', 'Continue in this language?'],
] as const) {
  test(`confirms a supported language before sign-in for ${locale}`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    await page.route('**/api/current_user', (route) =>
      route.fulfill({ json: { user: null } }),
    );
    await page.route('**/api/password-auth-status', (route) =>
      route.fulfill({ json: { enabled: true } }),
    );
    await page.goto(`${baseURL ?? ''}/only-tdy/`);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await page.locator('#welcome-language').selectOption('en');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Sign in', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Sign in', exact: true }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await context.close();
  });
}

test('honors a newly confirmed language over an older account preference', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ locale: 'ar-EG' });
  const page = await context.newPage();
  await installApi(page, { confirmLanguage: false });
  let saved: unknown;
  await page.route('**/api/profile', async (route) => {
    const settings =
      route.request().method() === 'PATCH'
        ? (
            route.request().postDataJSON() as {
              ui_settings: Record<string, unknown>;
            }
          ).ui_settings
        : { onlyTdy: { locale: 'en' } };
    if (route.request().method() === 'PATCH') saved = settings;
    await route.fulfill({
      json: { uid: 'user-e2e', timezone: 'UTC', ui_settings: settings },
    });
  });
  await page.goto(`${baseURL ?? ''}/only-tdy/`);
  await expect(
    page.getByRole('heading', { name: 'هل تريد المتابعة بهذه اللغة؟' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'متابعة', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'ما الذي تريد إنجازه؟' }),
  ).toBeVisible();
  await expect.poll(() => saved).toMatchObject({ onlyTdy: { locale: 'ar' } });
  await context.close();
});

async function arabicAccount(page: Parameters<typeof installApi>[0]) {
  await installApi(page);
  let settings: Record<string, unknown> = { onlyTdy: { locale: 'ar' } };
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'PATCH')
      settings = (
        route.request().postDataJSON() as {
          ui_settings: Record<string, unknown>;
        }
      ).ui_settings;
    await route.fulfill({
      json: {
        uid: 'user-e2e',
        timezone: 'Europe/Amsterdam',
        ui_settings: settings,
      },
    });
  });
}

test('captures Arabic tokens without rewriting Arabic user content', async ({
  page,
}) => {
  await arabicAccount(page);
  let posted: Record<string, unknown> | undefined;
  await page.route('**/api/task', async (route) => {
    posted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: {
        ...TODAY_TASKS[0],
        uid: 'task-arabic',
        name: posted.name,
        original_name: posted.name,
        status: 6,
        priority: 2,
        tags: [{ name: 'مشاوير' }],
      },
    });
  });
  await page.goto('/only-tdy/');
  const capture = page.getByRole('combobox', { name: 'ما الذي تريد إنجازه؟' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await capture.fill('اتصل ٣ مرات #مشاوير !٣ /اليوم');
  await page.getByRole('button', { name: 'إضافة', exact: true }).click();
  await expect
    .poll(() => posted)
    .toMatchObject({
      name: 'اتصل ٣ مرات',
      priority: 'high',
      status: 'planned',
      tags: ['مشاوير'],
    });
});

test('shows Arabic suggestions and preserves a capture draft while changing language', async ({
  page,
}) => {
  await arabicAccount(page);
  await page.goto('/only-tdy/');
  const capture = page.getByRole('combobox', { name: 'ما الذي تريد إنجازه؟' });
  await capture.fill('مهمة /');
  await expect(page.getByRole('option', { name: '/اليوم' })).toBeVisible();
  await capture.fill('مهمة /today');
  await expect(capture).toHaveValue('مهمة /today');
  await page.getByRole('button', { name: 'المزيد', exact: true }).click();
  await page.getByRole('link', { name: 'الإعدادات', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'اللغة', exact: true })
    .selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'What needs doing?' }),
  ).toHaveValue('مهمة /today');
});

test('keeps Arabic pages accessible and within narrow and desktop viewports', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await arabicAccount(page);
  await installTaskApi(page);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '',
      'backlog',
      'all',
      'guide',
      'settings',
      'repeating',
      'task/task-invoice',
    ]) {
      await page.goto(`/only-tdy/${path}`);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByRole('main')).toBeVisible();
      await page.evaluate(async () => document.fonts.ready);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter((violation) =>
          ['serious', 'critical'].includes(violation.impact ?? ''),
        ),
      ).toEqual([]);
      await expect(page).toHaveScreenshot(
        `arabic-${(path || 'today').replaceAll('/', '-')}-${String(width)}.png`,
        { fullPage: true },
      );
    }
  }
});

test('aligns mixed-direction token mirrors with native editable fields', async ({
  page,
}) => {
  await arabicAccount(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/only-tdy/');
  const capture = page.getByRole('combobox', { name: 'ما الذي تريد إنجازه؟' });
  for (const [name, value, direction] of [
    ['rtl', 'راجع العرض مع Alex #مشاوير !٣ /due:tomorrow', 'rtl'],
    ['ltr', 'Review المسودة #مشاوير +Home !٣ /استحقاق:غدًا', 'ltr'],
  ] as const) {
    await capture.fill(value);
    await capture.press('Escape');
    await page.evaluate(async () => document.fonts.ready);
    const geometry = await capture.evaluate((field) => {
      const mirror = field.parentElement?.querySelector('.focus-chips');
      if (mirror === null || mirror === undefined)
        throw new Error('Missing text mirror');
      return {
        field: getComputedStyle(field).direction,
        mirror: getComputedStyle(mirror).direction,
        height: field.getBoundingClientRect().height,
        mirrorHeight: mirror.getBoundingClientRect().height,
      };
    });
    expect(geometry.field).toBe(direction);
    expect(geometry.mirror).toBe(direction);
    expect(geometry.height).toBe(geometry.mirrorHeight);
    await expect(capture).toHaveValue(value);
    await expect(page).toHaveScreenshot(`arabic-mixed-${name}.png`, {
      fullPage: true,
    });
  }
});
