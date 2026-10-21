import { expect, test } from '@playwright/test';
import { FIXTURE_NOW, installApi, installTaskApi } from './fixtures.ts';

test.use({ hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(FIXTURE_NOW));
  await installApi(page);
});

for (const route of ['', 'backlog', 'history', 'all', 'repeating']) {
  test(`types and switches modes with separate drafts on /${route}`, async ({
    page,
  }) => {
    await page.goto(`/only-tdy/${route}`);
    const field = page.getByRole('combobox');
    await expect(field).toBeVisible();
    const startsInSearch = route !== '';
    if (startsInSearch) await page.keyboard.press('Control+/');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.type('Buy milk');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('Buy milk');
    await page.keyboard.press('Control+/');
    await expect(field).toHaveAttribute('type', 'search');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('');
    await page.keyboard.type('invoice');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+/');
    await expect(field).toHaveValue('Buy milk');
    await expect(field).toBeFocused();
    await page.keyboard.press('Control+/');
    await expect(field).toHaveValue('invoice');
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.keyboard.press('Control+/');
    await expect(field).toHaveAttribute('type', 'search');
    await expect(
      page.getByRole('button', { name: 'More', exact: true }),
    ).toHaveAttribute('aria-expanded', 'true');
  });
}

test('closes tag suggestions by touch, click and Escape and saves Notes with Ctrl+Enter', async ({
  page,
}) => {
  await installTaskApi(page);
  await page.goto('/only-tdy/task/task-invoice');
  const tags = page.getByRole('combobox', { name: 'Tags', exact: true });
  const suggestions = page.getByRole('listbox', {
    name: 'Tags already in use',
  });
  const notes = page.getByRole('textbox', { name: 'Notes', exact: true });
  await tags.fill('fi');
  await expect(suggestions).toBeVisible();
  await notes.click();
  await expect(suggestions).toHaveCount(0);
  await tags.click();
  await expect(suggestions).toBeVisible();
  await tags.press('Escape');
  await expect(suggestions).toHaveCount(0);
  await expect(tags).toHaveValue('fi');
  await tags.click();
  await expect(suggestions).toBeVisible();
  await notes.tap();
  await expect(suggestions).toHaveCount(0);
  await notes.fill('Attach the receipt.');
  const write = page.waitForRequest(
    (request) =>
      request.method() === 'PATCH' &&
      request.url().includes('/api/task/task-invoice'),
  );
  await notes.press('Control+Enter');
  expect((await write).postDataJSON()).toMatchObject({
    note: 'Attach the receipt.',
    tags: ['fi'],
  });
});
