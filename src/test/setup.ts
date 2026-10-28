import { beforeEach } from 'vitest';
import { applyLocale } from '../shared/i18n.ts';
import '@testing-library/jest-dom/vitest';

import { afterEach } from 'vitest';
import { preferencesStore } from '../features/tasks/preferences/store.ts';

/**
 * jsdom has no matchMedia. only-tdy reads media state for the system theme and for
 * reduced motion, so tests get a controllable stub that reports "does not match"
 * unless a test overrides it.
 */
const mediaQueryMatches = new Map<string, boolean>();

/** Makes `query` report as matching for the rest of the current test. */
export function setMediaQuery(query: string, matches: boolean): void {
  mediaQueryMatches.set(query, matches);
}

function createMediaQueryList(query: string): MediaQueryList {
  const listeners = new Set<EventListener>();
  return {
    media: query,
    get matches() {
      return mediaQueryMatches.get(query) ?? false;
    },
    onchange: null,
    addEventListener: (_type: string, listener: EventListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: EventListener) => {
      listeners.delete(listener);
    },
    addListener: (listener: EventListener) => {
      listeners.add(listener);
    },
    removeListener: (listener: EventListener) => {
      listeners.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      for (const listener of listeners) {
        listener(event);
      }
      return true;
    },
  } satisfies MediaQueryList;
}

// jsdom provides no implementation, so the stub is installed unconditionally and
// every test sees the same controllable media state.
window.matchMedia = createMediaQueryList;

// jsdom has no scrolling either. Navigating to a new page scrolls it to the
// top, which is behaviour the browser suite checks and jsdom only warns about.
window.scrollTo = () => undefined;

afterEach(() => {
  mediaQueryMatches.clear();
  preferencesStore.stop();
});

beforeEach(() => {
  localStorage.setItem('only-tdy:language:v1', 'en');
  applyLocale('en');
});
