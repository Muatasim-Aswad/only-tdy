import { describe, expect, it } from 'vitest';

import type { Project } from '../contracts.ts';
import { parseQuickEntry } from './quick-entry.ts';

const projects: readonly Project[] = [
  { uid: 'project-home', name: 'Home' },
  { uid: 'project-work', name: 'Work' },
  { uid: 'project-office', name: 'Home Office' },
];

describe('parseQuickEntry', () => {
  it.each([
    {
      name: 'metadata in any order',
      input: '#Errands !3 Buy milk /today +Home',
      expected: {
        title: 'Buy milk',
        priority: 'high',
        status: 'planned',
        tags: ['Errands'],
        projectUid: 'project-home',
      },
    },
    {
      name: 'collapsed whitespace and default priority',
      input: '  Buy\t oat   milk  ',
      expected: {
        title: 'Buy oat milk',
        priority: 'low',
        status: 'not_started',
        tags: [],
      },
    },
    {
      name: 'case-insensitive tag deduplication preserves first spelling',
      input: 'Read #Books #books #BOOKS #Later',
      expected: {
        title: 'Read',
        priority: 'low',
        status: 'not_started',
        tags: ['Books', 'Later'],
      },
    },
    {
      name: 'duplicate identical priorities are not conflicting',
      input: 'Call !2 !2',
      expected: {
        title: 'Call',
        priority: 'medium',
        status: 'not_started',
        tags: [],
      },
    },
    {
      name: 'the first letter is capitalised and nothing else is touched',
      input: 'do groceries #Errands',
      expected: {
        title: 'Do groceries',
        priority: 'low',
        status: 'not_started',
        tags: ['Errands'],
      },
    },
    {
      name: 'only the first letter is touched, whatever follows it',
      input: 'iOS build +Work',
      expected: {
        title: 'IOS build',
        priority: 'low',
        status: 'not_started',
        tags: [],
        projectUid: 'project-work',
      },
    },
    {
      name: 'today token can lead the line',
      input: '/today Plan week',
      expected: {
        title: 'Plan week',
        priority: 'low',
        status: 'planned',
        tags: [],
      },
    },
    {
      name: 'project matching ignores case',
      input: 'Paint +hOmE',
      expected: {
        title: 'Paint',
        priority: 'low',
        status: 'not_started',
        tags: [],
        projectUid: 'project-home',
      },
    },
    {
      name: 'only one token belongs to the project',
      input: 'Review +Work proposal',
      expected: {
        title: 'Review proposal',
        priority: 'low',
        status: 'not_started',
        tags: [],
        projectUid: 'project-work',
      },
    },
    {
      name: 'a bracketed name is one token, spaces and all',
      input: 'Rewire the hall +(Home Office) #(next week)',
      expected: {
        title: 'Rewire the hall',
        priority: 'low',
        status: 'not_started',
        tags: ['next week'],
        projectUid: 'project-office',
      },
    },
    {
      name: 'a bracket left open still names the rest of the line',
      input: 'Rewire the hall +(Home Office',
      expected: {
        title: 'Rewire the hall',
        priority: 'low',
        status: 'not_started',
        tags: [],
        projectUid: 'project-office',
      },
    },
    {
      name: 'a mark with no name after it stays in the title',
      input: 'Grade + and # alone',
      expected: {
        title: 'Grade + and # alone',
        priority: 'low',
        status: 'not_started',
        tags: [],
      },
    },
    {
      name: 'a note is a token like any other, one word or bracketed',
      input: 'Call the landlord *(ask about the boiler) +Home !2',
      expected: {
        title: 'Call the landlord',
        priority: 'medium',
        status: 'not_started',
        tags: [],
        projectUid: 'project-home',
        note: 'ask about the boiler',
      },
    },
    {
      name: 'a one-word note needs no brackets',
      input: 'Call the plumber *boiler',
      expected: {
        title: 'Call the plumber',
        priority: 'low',
        status: 'not_started',
        tags: [],
        note: 'boiler',
      },
    },
    {
      name: 'a mark at the end of a word is part of the word',
      input: 'Ship it! 5*3 read/write',
      expected: {
        title: 'Ship it! 5*3 read/write',
        priority: 'low',
        status: 'not_started',
        tags: [],
      },
    },
    {
      name: 'a project nobody has yet is named for creation',
      input: 'Plan the move +(New flat)',
      expected: {
        title: 'Plan the move',
        priority: 'low',
        status: 'not_started',
        tags: [],
        newProjectName: 'New flat',
      },
    },
    {
      name: 'an existing project is matched whatever its case, not created',
      input: 'Call +work',
      expected: {
        title: 'Call',
        priority: 'low',
        status: 'not_started',
        tags: [],
        projectUid: 'project-work',
      },
    },
  ])('$name', ({ input, expected }) => {
    expect(parseQuickEntry(input, projects)).toEqual({
      ok: true,
      draft: expected,
    });
  });

  it.each([
    ['empty-title', '#tag +Home !1 /today', projects, 'empty-title'],
    ['conflicting-priority', 'Task !1 !3', projects, 'conflicting-priority'],
    ['multiple-projects', 'Task +Home +Work', projects, 'multiple-projects'],
    [
      'ambiguous-project',
      'Task +HOME',
      [...projects, { uid: 'project-home-2', name: 'home' }],
      'ambiguous-project',
    ],
    ['multiple-notes', 'Task *one *two', projects, 'multiple-notes'],
    /* A mark commits: a line that looks like it set something either sets it
       or says it could not. */
    ['unknown-priority', 'Task !high', projects, 'unknown-priority'],
    ['priority out of range', 'Task !4', projects, 'unknown-priority'],
    ['unknown-command', 'Task /tomorrow', projects, 'unknown-command'],
  ] as const)('%s', (_name, input, availableProjects, errorKind) => {
    const original = input;
    const result = parseQuickEntry(input, availableProjects);

    expect(result).toMatchObject({ ok: false, error: { kind: errorKind } });
    expect(input).toBe(original);
  });
});
