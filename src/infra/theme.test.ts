import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyTheme,
  nextTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
} from './theme.ts';

function head(html: string): void {
  document.head.innerHTML = html;
}

const METAS = `
  <meta name="color-scheme" content="light dark" />
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F4F6F5" />
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#151A17" />
`;

function themeColors(): { media: string; content: string }[] {
  return [
    ...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  ].map((meta) => ({
    media: meta.getAttribute('media') ?? '',
    content: meta.content,
  }));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  head(METAS);
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  head('');
});

describe('nextTheme', () => {
  it('comes back to where it started in three presses', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});

describe('readStoredTheme', () => {
  it('answers system when nothing has been chosen', () => {
    expect(readStoredTheme()).toBe('system');
  });

  it('reads back exactly what was chosen', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    expect(readStoredTheme()).toBe('dark');
  });

  /* A value from another version, or another tab's idea of the key, is not a
     palette this build knows how to paint. It falls back rather than throws. */
  it('ignores a stored value it does not recognise', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

    expect(readStoredTheme()).toBe('system');
  });
});

describe('applyTheme', () => {
  it('writes the choice where the stylesheet can see it', () => {
    applyTheme('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  /*
   * The important one. `system` is the absence of an answer, and the media
   * query in tokens.css only gets to answer while the attribute is gone — so
   * coming back to system has to remove it rather than write its name.
   */
  it('takes the choice back rather than naming it', () => {
    applyTheme('light');
    applyTheme('system');

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('narrows the browser chrome to the palette in force', () => {
    applyTheme('dark');

    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
        ?.content,
    ).toBe('dark');
    expect(themeColors()).toEqual([
      { media: 'not all', content: '#F4F6F5' },
      { media: 'all', content: '#151A17' },
    ]);
  });

  /* Both colours stay in the document, so handing them back to the system is
     a matter of restoring each one's own query rather than of re-adding it. */
  it('hands both colours back to their own queries on system', () => {
    applyTheme('dark');
    applyTheme('system');

    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
        ?.content,
    ).toBe('light dark');
    expect(themeColors()).toEqual([
      { media: '(prefers-color-scheme: light)', content: '#F4F6F5' },
      { media: '(prefers-color-scheme: dark)', content: '#151A17' },
    ]);
  });

  it('paints the palette even where storage is refused', () => {
    const refuse = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });

    try {
      expect(() => {
        applyTheme('dark');
      }).not.toThrow();
      expect(document.documentElement.dataset.theme).toBe('dark');
    } finally {
      refuse.mockRestore();
    }
  });
});
