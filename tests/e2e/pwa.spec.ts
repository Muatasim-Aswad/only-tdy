import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('only-tdy:language:v1', 'en');
  });
});

/** No API fixture: the cached shell must offer recovery before exposing tasks. */
async function expectShellRendered(page: Page) {
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText(
    'Could not connect. Check your connection and try again.',
  );
  await expect(page.getByRole('combobox')).toHaveCount(0);
}

test('canonicalizes /only-tdy once and emits working base-path assets and manifest identity', async ({
  page,
}) => {
  const failedAssets: string[] = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/only-tdy/') && response.status() >= 400) {
      failedAssets.push(`${String(response.status())} ${url.pathname}`);
    }
  });
  await page.goto('/only-tdy');
  await expect(page).toHaveURL(/\/only-tdy\/$/);
  await page.reload();
  await expectShellRendered(page);

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    );
    if (link === null) throw new Error('Manifest link missing.');
    return (await fetch(link.href)).json() as Promise<Record<string, unknown>>;
  });
  expect(manifest).toMatchObject({
    name: 'only-tdy',
    short_name: 'only-tdy',
    id: '/only-tdy/',
    start_url: '/only-tdy/',
    scope: '/only-tdy/',
    display: 'standalone',
  });
  expect(failedAssets).toEqual([]);
});

test('controls only /only-tdy/ and keeps API requests out of caches', async ({
  browser,
  baseURL,
}) => {
  if (baseURL === undefined) throw new Error('Test base URL is required.');
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  await context.addInitScript(() => {
    localStorage.setItem('only-tdy:language:v1', 'en');
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/only-tdy/`);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ''),
    )
    .toContain('/only-tdy/sw.js');

  const evidence = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const cacheNames = await caches.keys();
    const cachedUrls = (
      await Promise.all(
        cacheNames.map(async (name) =>
          (await caches.open(name))
            .keys()
            .then((requests) => requests.map((request) => request.url)),
        ),
      )
    ).flat();
    return {
      scope: registration.scope,
      cacheNames,
      cachedUrls,
      workerSource: await fetch(
        registration.active?.scriptURL ?? '/only-tdy/sw.js',
      ).then((response) => response.text()),
    };
  });

  expect(evidence.scope).toBe(`${baseURL}/only-tdy/`);
  expect(evidence.cacheNames.length).toBeGreaterThan(0);
  expect(
    evidence.cacheNames.every((name) => name.startsWith('only-tdy-')),
  ).toBe(true);
  expect(
    evidence.cachedUrls.some((url) =>
      new URL(url).pathname.startsWith('/api/'),
    ),
  ).toBe(false);
  expect(evidence.workerSource).not.toMatch(
    /background.?sync|sync\.register|BackgroundSyncPlugin/i,
  );

  await context.setOffline(true);
  await page.reload();
  await expectShellRendered(page);

  /*
   * A task's own page is a navigation to a path the cache has never seen.
   * Only the worker's navigation route can answer it, so a deep link is the
   * one thing that proves the installed app is more than its home screen.
   */
  await page.goto(`${baseURL}/only-tdy/task/task-invoice`);
  await expect(page).toHaveURL(/\/only-tdy\/task\/task-invoice$/);
  await expect(page.getByRole('main')).toBeVisible();
  await page.goto(`${baseURL}/only-tdy/`);

  await context.setOffline(false);
  await page.evaluate(async () => {
    await Promise.all((await caches.keys()).map((name) => caches.delete(name)));
  });
  await page.reload();
  await expectShellRendered(page);
  await context.close();
});
