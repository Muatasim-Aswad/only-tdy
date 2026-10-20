/**
 * Every address only-tdy answers to, in one place.
 *
 * only-tdy has a handful of destinations and no router library. A dependency would buy
 * nested layouts, loaders, and data revalidation that this app already gets
 * from TanStack Query, and would cost more bytes than the whole navigation
 * surface described here. What is needed instead is exactly this: parse a
 * pathname into a destination, and print a destination back as a pathname.
 *
 * Both functions are pure and know nothing about history, the document, or
 * React. `src/infra/navigation.ts` owns everything that touches the browser.
 */

import { APP_BASE_PATH } from './base-path.ts';

/** Where only-tdy is. `unknown` is any other path below the base. */
export type Route =
  | { readonly kind: 'tasks' }
  | { readonly kind: 'backlog' }
  | { readonly kind: 'history' }
  | { readonly kind: 'all' }
  | { readonly kind: 'version' }
  | { readonly kind: 'guide' }
  | { readonly kind: 'settings' }
  | { readonly kind: 'task'; readonly uid: string }
  | { readonly kind: 'unknown' };

const BACKLOG_SEGMENT = 'backlog';
const HISTORY_SEGMENT = 'history';
const ALL_SEGMENT = 'all';
const ABOUT_SEGMENT = 'about';
const GUIDE_SEGMENT = 'guide';
const SETTINGS_SEGMENT = 'settings';
const TASK_SEGMENT = 'task/';

/** The path of a single task, which every list row links to. */
export function taskPath(uid: string): string {
  return `${APP_BASE_PATH}${TASK_SEGMENT}${encodeURIComponent(uid)}`;
}

/** The one canonical pathname for a destination. */
export function routePath(route: Route): string {
  switch (route.kind) {
    case 'task':
      return taskPath(route.uid);
    case 'backlog':
      return `${APP_BASE_PATH}${BACKLOG_SEGMENT}`;
    case 'history':
      return `${APP_BASE_PATH}${HISTORY_SEGMENT}`;
    case 'all':
      return `${APP_BASE_PATH}${ALL_SEGMENT}`;
    case 'version':
      return `${APP_BASE_PATH}${ABOUT_SEGMENT}`;
    case 'guide':
      return `${APP_BASE_PATH}${GUIDE_SEGMENT}`;
    case 'settings':
      return `${APP_BASE_PATH}${SETTINGS_SEGMENT}`;
    case 'tasks':
    case 'unknown':
      return APP_BASE_PATH;
  }
}

/**
 * Reads a pathname as a destination. A single trailing slash is tolerated so
 * `/only-tdy/history/` is the record rather than a dead end, and anything else
 * below the base is `unknown` — reported rather than quietly treated as the
 * list, so the caller can correct the address instead of lying about it.
 *
 * A path outside the base cannot happen in the browser, since the app is only
 * ever served below it. It reads as the list so tests and the dev server do
 * not have to fake a pathname before rendering.
 */
export function parseRoute(pathname: string): Route {
  if (!pathname.startsWith(APP_BASE_PATH)) return { kind: 'tasks' };

  const rest = pathname.slice(APP_BASE_PATH.length).replace(/\/$/, '');
  if (rest === '') return { kind: 'tasks' };
  if (rest === BACKLOG_SEGMENT) return { kind: 'backlog' };
  if (rest === HISTORY_SEGMENT) return { kind: 'history' };
  if (rest === ALL_SEGMENT) return { kind: 'all' };
  if (rest === ABOUT_SEGMENT || rest === 'version') return { kind: 'version' };
  if (rest === GUIDE_SEGMENT) return { kind: 'guide' };
  if (rest === SETTINGS_SEGMENT) return { kind: 'settings' };

  if (rest.startsWith(TASK_SEGMENT)) {
    const encoded = rest.slice(TASK_SEGMENT.length);
    if (encoded !== '' && !encoded.includes('/')) {
      return { kind: 'task', uid: safeDecode(encoded) };
    }
  }

  return { kind: 'unknown' };
}

/**
 * The canonical pathname for whatever `pathname` turned out to mean, or `null`
 * when it is already canonical. Used once before React starts, so a shared or
 * mistyped link lands somewhere real with an address that matches.
 */
export function canonicalRoutePath(pathname: string): string | null {
  const canonical = routePath(parseRoute(pathname));
  return canonical === pathname ? null : canonical;
}

/** A malformed escape is a uid only-tdy cannot look up, but it must not throw. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
