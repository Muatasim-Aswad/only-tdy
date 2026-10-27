import { expect, test } from '@playwright/test';
import { installApi } from './fixtures.ts';

test('keeps a verified capture editable when a focus check cannot connect', async ({
  page,
}) => {
  await installApi(page);
  let checks = 0;
  await page.route('**/api/current_user', (route) => {
    checks += 1;
    return checks === 1
      ? route.fulfill({ json: { user: { uid: 'user-e2e' } } })
      : route.abort('internetdisconnected');
  });
  await page.goto('/only-tdy/');
  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  await capture.fill('Keep this offline draft');
  const failed = page.waitForEvent(
    'requestfailed',
    (request) => new URL(request.url()).pathname === '/api/current_user',
  );
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await failed;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            resolve();
          }),
        ),
      ),
  );
  await expect(capture).toBeVisible();
  await expect(capture).toHaveValue('Keep this offline draft');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
});

test('retains an unfinished capture only when the same account signs back in', async ({
  page,
}) => {
  await installApi(page);
  let authenticated = true;
  let uid = 'user-e2e';
  await page.route('**/api/current_user', (route) =>
    route.fulfill({ json: { user: authenticated ? { uid } : null } }),
  );
  await page.route('**/api/task/*', (route) => {
    authenticated = false;
    return route.fulfill({ status: 401, json: {} });
  });
  await page.route('**/api/login', (route) => {
    authenticated = true;
    return route.fulfill({ json: {} });
  });
  await page.goto('/only-tdy/');
  const capture = page.getByRole('combobox', { name: 'What needs doing?' });
  await capture.fill('Unfinished private draft');
  await page
    .getByRole('button', { name: 'Complete “Send the invoice”' })
    .click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('friend@example.com');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(capture).toHaveValue('Unfinished private draft');
  await page
    .getByRole('button', { name: 'Complete “Send the invoice”' })
    .click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  uid = 'another-user';
  await page.getByLabel('Email', { exact: true }).fill('another@example.com');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(capture).toHaveValue('');
});

test('requires sign-in before task requests, resumes the address, and signs out', async ({
  page,
}) => {
  await installApi(page);
  let authenticated = false;
  let taskRequests = 0;
  await page.route('**/api/current_user', (route) =>
    route.fulfill({
      json: { user: authenticated ? { uid: 'user-e2e' } : null },
    }),
  );
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/tasks') taskRequests += 1;
  });
  await page.route('**/api/login', async (route) => {
    const data = route.request().postDataJSON() as {
      email: string;
      password: string;
    };
    expect(data).toEqual({
      email: 'friend@example.com',
      password: 'synthetic-password',
    });
    authenticated = true;
    await route.fulfill({ json: { message: 'Success' } });
  });
  await page.route('**/api/logout', async (route) => {
    authenticated = false;
    await route.fulfill({ json: { message: 'Logged out successfully' } });
  });
  await page.goto('/only-tdy/backlog');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(taskRequests).toBe(0);
  await page.getByLabel('Email', { exact: true }).fill('friend@example.com');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expect(page).toHaveURL(/\/only-tdy\/backlog$/);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('Replace the hallway bulb')).toHaveCount(0);
});

test('clears a rejected password and shows safe errors without backend details', async ({
  page,
}) => {
  await installApi(page);
  await page.route('**/api/current_user', (route) =>
    route.fulfill({ json: { user: null } }),
  );
  await page.route('**/api/login', (route) =>
    route.fulfill({
      status: 401,
      json: { errors: ['private server details'] },
    }),
  );
  await page.goto('/only-tdy/');
  await page.getByLabel('Email', { exact: true }).fill('friend@example.com');
  await page.getByLabel('Password', { exact: true }).fill('incorrect');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'The email or password is incorrect.',
  );
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
});

test('offers the existing Tududi flow when password authentication is disabled', async ({
  page,
}) => {
  await installApi(page);
  await page.route('**/api/current_user', (route) =>
    route.fulfill({ json: { user: null } }),
  );
  await page.route('**/api/password-auth-status', (route) =>
    route.fulfill({ json: { enabled: false } }),
  );
  await page.goto('/only-tdy/');
  await expect(
    page.getByRole('link', { name: 'Continue through Tududi' }),
  ).toHaveAttribute('href', '/login');
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
});
