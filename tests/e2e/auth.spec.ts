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
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toHaveCount(0);
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
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('friend@example.com');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(capture).toHaveValue('Unfinished private draft');
  await page
    .getByRole('button', { name: 'Complete “Send the invoice”' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
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
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  expect(taskRequests).toBe(0);
  await page.getByLabel('Email', { exact: true }).fill('friend@example.com');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  const signIn = page.getByRole('button', { name: 'Sign in', exact: true });
  await signIn.hover();
  await expect(signIn).toHaveCSS('opacity', '0.85');
  await page.getByLabel('Password', { exact: true }).press('Tab');
  await expect(signIn).toBeFocused();
  await expect(signIn).toHaveCSS('outline-style', 'solid');
  await signIn.click();
  await expect(page.getByText('Replace the hallway bulb')).toBeVisible();
  await expect(page).toHaveURL(/\/only-tdy\/backlog$/);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  const signOut = page.getByRole('button', { name: 'Sign out', exact: true });
  const resting = await signOut.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  await signOut.hover();
  await expect(signOut).not.toHaveCSS('background-color', resting);
  await expect(signOut).toHaveCSS('cursor', 'pointer');
  await signOut.click();
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
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

for (const locale of ['en', 'ar']) {
  test(`pads the filled ${locale} sign-in fields inside their edges`, async ({
    page,
  }, testInfo) => {
    await installApi(page);
    await page.route('**/api/current_user', (route) =>
      route.fulfill({ json: { user: null } }),
    );
    await page.addInitScript((language) => {
      localStorage.setItem('only-tdy:language:v1', language);
    }, locale);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/only-tdy/');
      const email = page.locator('input[name=email]');
      const password = page.locator('input[name=password]');
      await email.fill('sample@example.com');
      await password.fill('synthetic-password');
      await email.focus();
      for (const field of [email, password]) {
        const metrics = await field.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            start: parseFloat(style.paddingInlineStart),
            end: parseFloat(style.paddingInlineEnd),
            height: element.getBoundingClientRect().height,
          };
        });
        expect(metrics.start).toBeGreaterThanOrEqual(8);
        expect(metrics.end).toBeGreaterThanOrEqual(8);
        expect(metrics.height).toBeGreaterThanOrEqual(44);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(async () => document.fonts.ready);
      await page.screenshot({
        path: testInfo.outputPath(`filled-login-${String(width)}.png`),
      });
      await email.press('Tab');
      await expect(password).toBeFocused();
      await password.press('Tab');
      await expect(
        page.getByRole('button', {
          name: locale === 'ar' ? 'تسجيل الدخول' : 'Sign in',
          exact: true,
        }),
      ).toBeFocused();
    }
  });
}
