/**
 * The browser half of routing: history, the current address, and what a link
 * click means.
 *
 * `useSyncExternalStore` is the whole subscription. The address is external
 * state that React does not own, so reading it through the store keeps it out
 * of an effect and out of a second render pass — the route is correct on the
 * first paint after a navigation, including the very first one.
 */

import { useSyncExternalStore, type MouseEvent } from 'react';

import { APP_BASE_PATH } from '../config/base-path.ts';
import { parseRoute, type Route } from '../config/routes.ts';

/**
 * `popstate` covers the back and forward buttons; pushing and replacing fire
 * nothing of their own, so `navigate` announces itself on this event.
 */
const NAVIGATION_EVENT = 'only-tdy:navigation';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener(NAVIGATION_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener(NAVIGATION_EVENT, onStoreChange);
  };
}

function readPathname(): string {
  return window.location.pathname;
}

export interface NavigateOptions {
  /** Replaces the current entry instead of adding one. Used after a delete,
      so Back never returns to a task that no longer exists. */
  readonly replace?: boolean;
}

export function navigate(path: string, options: NavigateOptions = {}): void {
  if (path === window.location.pathname + window.location.search) return;

  const currentPath = window.location.pathname + window.location.search;
  const destination = parseRoute(path.split('?')[0] ?? path).kind;
  const current = parseRoute(window.location.pathname).kind;
  const state =
    destination === 'task' || destination === 'settings'
      ? {
          returnTo:
            current === 'task' || current === 'settings'
              ? pageReturnPath(APP_BASE_PATH)
              : currentPath,
        }
      : null;

  if (options.replace === true) {
    window.history.replaceState(state, '', path);
  } else {
    window.history.pushState(state, '', path);
    // A new page starts at its top. Back and forward are left alone: the
    // browser restores their scroll position itself for same-document entries.
    window.scrollTo(0, 0);
  }
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

/** The current destination, recomputed whenever the address changes. */
export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, readPathname);
  return parseRoute(pathname);
}

/**
 * What an in-app link does. Everything the browser would do better is left to
 * the browser: a middle click, a modified click, and an explicit target all
 * fall through untouched, so opening a task in a new tab still works.
 */
export function handleLinkNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  path: string,
): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const target = event.currentTarget.target;
  if (target !== '' && target !== '_self') return;

  event.preventDefault();
  navigate(path);
}

export function pageReturnPath(fallback: string): string {
  const state: unknown = window.history.state;
  const path: unknown =
    typeof state === 'object' && state !== null && 'returnTo' in state
      ? state.returnTo
      : undefined;
  if (typeof path !== 'string' || !path.startsWith(APP_BASE_PATH))
    return fallback;
  const route = parseRoute(path.split('?')[0] ?? path);
  return route.kind === 'task' ||
    route.kind === 'settings' ||
    route.kind === 'unknown'
    ? fallback
    : path;
}
