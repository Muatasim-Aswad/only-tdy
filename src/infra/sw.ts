/// <reference lib="webworker" />

import { clientsClaim, setCacheNameDetails } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

import { CACHE_PREFIX, LEGACY_CACHE_PREFIX } from '../config/app.ts';
import { APP_BASE_PATH, LEGACY_BASE_PATH } from '../config/base-path.ts';

declare const self: ServiceWorkerGlobalScope & {
  readonly __WB_MANIFEST: readonly (PrecacheEntry | string)[];
};

interface PrecacheEntry {
  readonly url: string;
  readonly revision?: string | null;
}

setCacheNameDetails({ prefix: CACHE_PREFIX.replace(/-$/, '') });
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

/*
 * only-tdy now has more than one address, and only the shell is precached. A
 * task's own page is a navigation to a path the cache has never seen, so
 * without this a deep link would reach the network or nothing at all —
 * installed and offline, it would reach nothing. Every navigation below the
 * base is answered with the shell, which is exactly what the server does.
 */
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(`${APP_BASE_PATH}index.html`), {
    allowlist: [new RegExp(`^${APP_BASE_PATH}`)],
    // The deployed build's record, opened by hand, must be the file itself.
    denylist: [/\/version\.json$/],
  }),
);

clientsClaim();

self.addEventListener('install', () => {
  void self.skipWaiting();
});

/*
 * A device that installed the app under its old name still has a worker at
 * the old scope and the old caches. That worker updates to this script; once
 * active it clears the old caches and steps aside, so the old address reaches
 * the network and the shell moves it to the new base.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(retireLegacyInstall());
});

async function retireLegacyInstall(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(LEGACY_CACHE_PREFIX))
      .map((name) => caches.delete(name)),
  );
  if (new URL(self.registration.scope).pathname === LEGACY_BASE_PATH) {
    await self.registration.unregister();
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
  }
});
