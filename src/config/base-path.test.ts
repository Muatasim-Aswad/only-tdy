import { describe, expect, it, vi } from 'vitest';

import {
  APP_BASE_PATH,
  canonicalAppUrl,
  canonicalizeAppPath,
} from './base-path.ts';

describe('canonicalAppUrl', () => {
  const cases: readonly (readonly [
    name: string,
    input: readonly [string, string?, string?],
    expected: string | null,
  ])[] = [
    ['redirects the exact unslashed path', ['/only-tdy'], '/only-tdy/'],
    ['keeps the query string', ['/only-tdy', '?a=1'], '/only-tdy/?a=1'],
    ['keeps the hash', ['/only-tdy', '', '#x'], '/only-tdy/#x'],
    [
      'keeps query and hash together',
      ['/only-tdy', '?a=1', '#x'],
      '/only-tdy/?a=1#x',
    ],
    ['leaves the canonical path alone', ['/only-tdy/'], null],
    ['leaves a nested path alone', ['/only-tdy/settings'], null],
    ['leaves a similarly named path alone', ['/only-tdyx'], null],
    ['moves the legacy unslashed path', ['/focus'], '/only-tdy/'],
    ['moves the legacy base', ['/focus/', '?a=1', '#x'], '/only-tdy/?a=1#x'],
    ['moves a legacy deep link', ['/focus/task/abc'], '/only-tdy/task/abc'],
    ['leaves a similarly named legacy path alone', ['/focused'], null],
    ['leaves the Tududi root alone', ['/'], null],
    ['leaves Tududi routes alone', ['/today'], null],
    ['leaves the API alone', ['/api/tasks'], null],
  ];

  it.each(cases)('%s', (_name, input, expected) => {
    expect(canonicalAppUrl(...input)).toBe(expected);
  });
});

describe('canonicalizeAppPath', () => {
  it('replaces the history entry exactly once for /only-tdy', () => {
    const replace = vi.fn();
    const redirected = canonicalizeAppPath({
      pathname: '/only-tdy',
      search: '',
      hash: '',
      replace,
    });

    expect(redirected).toBe(true);
    expect(replace).toHaveBeenCalledExactlyOnceWith(APP_BASE_PATH);
  });

  it('does not redirect the canonical path', () => {
    const replace = vi.fn();
    const redirected = canonicalizeAppPath({
      pathname: APP_BASE_PATH,
      search: '',
      hash: '',
      replace,
    });

    expect(redirected).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });
});
