import { describe, expect, it } from 'vitest';

import {
  canonicalRoutePath,
  parseRoute,
  routePath,
  taskPath,
  type Route,
} from './routes.ts';

describe('parseRoute', () => {
  it('reads every destination only-tdy has', () => {
    expect(parseRoute('/only-tdy/')).toEqual({ kind: 'tasks' });
    expect(parseRoute('/only-tdy/backlog')).toEqual({ kind: 'backlog' });
    expect(parseRoute('/only-tdy/history')).toEqual({ kind: 'history' });
    expect(parseRoute('/only-tdy/all')).toEqual({ kind: 'all' });
    expect(parseRoute('/only-tdy/about')).toEqual({ kind: 'version' });
    expect(parseRoute('/only-tdy/guide')).toEqual({ kind: 'guide' });
    expect(parseRoute('/only-tdy/task/abc')).toEqual({
      kind: 'task',
      uid: 'abc',
    });
  });

  it('tolerates one trailing slash rather than calling it a dead end', () => {
    expect(parseRoute('/only-tdy/backlog/')).toEqual({ kind: 'backlog' });
    expect(parseRoute('/only-tdy/history/')).toEqual({ kind: 'history' });
    expect(parseRoute('/only-tdy/all/')).toEqual({ kind: 'all' });
    expect(parseRoute('/only-tdy/about/')).toEqual({ kind: 'version' });
    expect(parseRoute('/only-tdy/guide/')).toEqual({ kind: 'guide' });
    expect(parseRoute('/only-tdy/task/abc/')).toEqual({
      kind: 'task',
      uid: 'abc',
    });
  });

  it('decodes a uid that had to be escaped to fit in one segment', () => {
    expect(parseRoute('/only-tdy/task/a%2Fb%20c')).toEqual({
      kind: 'task',
      uid: 'a/b c',
    });
  });

  it('survives an escape that cannot be decoded', () => {
    expect(parseRoute('/only-tdy/task/%E0%A4%A')).toEqual({
      kind: 'task',
      uid: '%E0%A4%A',
    });
  });

  it('reports anything else below the base rather than guessing', () => {
    expect(parseRoute('/only-tdy/task/')).toEqual({ kind: 'unknown' });
    expect(parseRoute('/only-tdy/task/a/b')).toEqual({ kind: 'unknown' });
    expect(parseRoute('/only-tdy/nowhere')).toEqual({ kind: 'unknown' });
  });

  it('reads a path outside the base as the list, for tests and the dev server', () => {
    expect(parseRoute('/')).toEqual({ kind: 'tasks' });
  });
});

describe('routePath', () => {
  it('round-trips every real destination', () => {
    const routes: readonly Route[] = [
      { kind: 'tasks' },
      { kind: 'backlog' },
      { kind: 'history' },
      { kind: 'all' },
      { kind: 'version' },
      { kind: 'guide' },
      { kind: 'task', uid: 'abc' },
      { kind: 'task', uid: 'a/b c' },
    ];

    for (const route of routes) {
      expect(parseRoute(routePath(route))).toEqual(route);
    }
  });

  it('sends an address only-tdy cannot read back to the list', () => {
    expect(routePath({ kind: 'unknown' })).toBe('/only-tdy/');
  });

  it('keeps a uid inside one segment', () => {
    expect(taskPath('a/b c')).toBe('/only-tdy/task/a%2Fb%20c');
  });
});

describe('canonicalRoutePath', () => {
  it('leaves an address that already says what it shows', () => {
    expect(canonicalRoutePath('/only-tdy/')).toBeNull();
    expect(canonicalRoutePath('/only-tdy/backlog')).toBeNull();
    expect(canonicalRoutePath('/only-tdy/history')).toBeNull();
    expect(canonicalRoutePath('/only-tdy/about')).toBeNull();
    expect(canonicalRoutePath('/only-tdy/task/abc')).toBeNull();
  });

  it('corrects a trailing slash and a path that means nothing', () => {
    expect(canonicalRoutePath('/only-tdy/backlog/')).toBe('/only-tdy/backlog');
    expect(canonicalRoutePath('/only-tdy/history/')).toBe('/only-tdy/history');
    expect(canonicalRoutePath('/only-tdy/nowhere')).toBe('/only-tdy/');
  });

  it('keeps old Version links working through About', () => {
    expect(canonicalRoutePath('/only-tdy/version')).toBe('/only-tdy/about');
    expect(canonicalRoutePath('/only-tdy/version/')).toBe('/only-tdy/about');
  });
});
