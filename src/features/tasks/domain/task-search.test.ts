import { describe, expect, it } from 'vitest';

import type { Project, Task } from '../contracts.ts';

import {
  matchesTask,
  parseSearch,
  resolveSearch,
  sameSearchTerm,
  searchRequestKey,
} from './task-search.ts';

const PROJECTS: readonly Project[] = [
  { uid: 'project-work', name: 'Work' },
  { uid: 'project-home', name: 'Home' },
];

describe('parseSearch', () => {
  it('reads the same two marks the capture field writes', () => {
    expect(parseSearch('#finance')).toEqual({
      kind: 'tag',
      name: 'finance',
    });
    expect(parseSearch('+Work')).toEqual({
      kind: 'project',
      name: 'Work',
    });
  });

  it('treats anything else as words to look for', () => {
    expect(parseSearch('hallway bulb')).toEqual({
      kind: 'text',
      query: 'hallway bulb',
    });
  });

  it('takes the rest of the line whole, because a name may contain a space', () => {
    expect(parseSearch('#next actions')).toEqual({
      kind: 'tag',
      name: 'next actions',
    });
    expect(parseSearch('+Side project')).toEqual({
      kind: 'project',
      name: 'Side project',
    });
  });

  it('asks for nothing when the field holds nothing to ask with', () => {
    for (const input of ['', '   ', '#', '+', '#  ', '+  ']) {
      expect(parseSearch(input)).toEqual({ kind: 'none' });
    }
  });

  it('ignores whitespace either side of what was meant', () => {
    expect(parseSearch('  bulb  ')).toEqual({
      kind: 'text',
      query: 'bulb',
    });
  });
});

describe('resolveSearch', () => {
  it('passes a tag and a phrase straight through: neither needs looking up', () => {
    const tag = { kind: 'tag', name: 'finance' } as const;
    const text = { kind: 'text', query: 'bulb' } as const;

    expect(resolveSearch(tag, [], false)).toEqual(tag);
    expect(resolveSearch(text, [], false)).toEqual(text);
  });

  it('turns a project name into the uid a request can carry', () => {
    expect(
      resolveSearch({ kind: 'project', name: 'work' }, PROJECTS, true),
    ).toEqual({ kind: 'project', projectUid: 'project-work' });
  });

  it('waits rather than deciding while the project list is still loading', () => {
    expect(resolveSearch({ kind: 'project', name: 'Work' }, [], false)).toEqual(
      { kind: 'pending' },
    );
  });

  /*
   * The important one. Tududi drops a project filter it cannot resolve and
   * answers with the whole list, so sending an unknown name would show every
   * backlog task as if it had matched.
   */
  it('refuses a name that matches no project instead of asking anyway', () => {
    expect(
      resolveSearch({ kind: 'project', name: 'Hous' }, PROJECTS, true),
    ).toEqual({ kind: 'refused', message: 'No project named “Hous”.' });
  });

  it('refuses a name that matches more than one project', () => {
    const twins: readonly Project[] = [
      { uid: 'project-a', name: 'Admin' },
      { uid: 'project-b', name: 'admin' },
    ];

    expect(
      resolveSearch({ kind: 'project', name: 'Admin' }, twins, true),
    ).toEqual({
      kind: 'refused',
      message: 'More than one project is named “Admin”.',
    });
  });
});

describe('searchRequestKey', () => {
  it('keeps two terms of different kinds in different caches', () => {
    const keys = [
      searchRequestKey({ kind: 'tag', name: 'work' }),
      searchRequestKey({ kind: 'project', projectUid: 'work' }),
      searchRequestKey({ kind: 'text', query: 'work' }),
    ];

    expect(new Set(keys).size).toBe(3);
  });

  it('gives every request that cannot be sent the same empty key', () => {
    expect(searchRequestKey({ kind: 'none' })).toBe('');
    expect(searchRequestKey({ kind: 'pending' })).toBe('');
    expect(searchRequestKey({ kind: 'refused', message: 'no' })).toBe('');
  });
});

describe('priority search', () => {
  it('reads ! as a priority and resolves only 1 to 3', () => {
    expect(parseSearch('!2')).toEqual({ kind: 'priority', value: '2' });
    expect(resolveSearch(parseSearch('!3'), [], true)).toEqual({
      kind: 'priority',
      priority: 'high',
    });
    expect(resolveSearch(parseSearch('!9'), [], true)).toEqual({
      kind: 'refused',
      message: 'Priority is !1, !2, or !3.',
    });
    expect(searchRequestKey({ kind: 'priority', priority: 'medium' })).toBe(
      'priority:medium',
    );
  });
});

describe('matchesTask', () => {
  const task: Task = {
    uid: 'task-invoice',
    title: 'Send the invoice',
    priority: 'medium',
    status: 'not_started',
    projectName: 'Work',
    tags: ['finance'],
  };

  it.each([
    ['a phrase inside the title', 'invo', true],
    ['a phrase not in it', 'bulb', false],
    ['half a tag', '#fin', true],
    ['another tag', '#home', false],
    ['half a project', '+wo', true],
    ['its priority', '!2', true],
    ['another priority', '!3', false],
    ['a priority still being typed', '!', true],
  ])('narrows by %s', (_name, typed, expected) => {
    expect(matchesTask(task, parseSearch(typed))).toBe(expected);
  });

  it('tells a changed term from the one in force', () => {
    expect(sameSearchTerm(parseSearch('#a'), parseSearch(' #a '))).toBe(true);
    expect(sameSearchTerm(parseSearch('#a'), parseSearch('#ab'))).toBe(false);
  });
});
