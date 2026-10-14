import { describe, expect, it } from 'vitest';

import type { Project } from '../contracts.ts';

import { matchProjectByName } from './project-lookup.ts';

const PROJECTS: readonly Project[] = [
  { uid: 'project-work', name: 'Work' },
  { uid: 'project-home', name: 'Home' },
];

describe('matchProjectByName', () => {
  it('matches the whole name once case is folded', () => {
    expect(matchProjectByName(PROJECTS, 'work')).toEqual({
      status: 'found',
      project: PROJECTS[0],
    });
  });

  it('does not match a prefix: Tududi’s own filter is exact', () => {
    expect(matchProjectByName(PROJECTS, 'Wor')).toEqual({ status: 'unknown' });
  });

  it('reports two projects of the same name rather than picking one', () => {
    const twins: readonly Project[] = [
      { uid: 'project-a', name: 'Admin' },
      { uid: 'project-b', name: 'admin' },
    ];

    expect(matchProjectByName(twins, 'ADMIN')).toEqual({ status: 'ambiguous' });
  });

  it('finds nothing in an empty list', () => {
    expect(matchProjectByName([], 'Work')).toEqual({ status: 'unknown' });
  });
});
