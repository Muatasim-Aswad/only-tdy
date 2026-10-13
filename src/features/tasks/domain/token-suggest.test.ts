import { describe, expect, it } from 'vitest';

import { isTagListWritable } from './tag-list.ts';
import {
  applyEntrySuggestion,
  applyTagListSuggestion,
  entrySuggestionTarget,
  isNewProjectName,
  rankSuggestions,
  searchSuggestionTarget,
  tagListSuggestionTarget,
} from './token-suggest.ts';

/** Narrows a target the test has just asserted exists. */
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected a suggestion target.');
  return value;
}

it('leaves the caret after a completed date command so its value can be typed', () => {
  const input = 'Task /du';
  const target = required(entrySuggestionTarget(input, input.length));
  expect(applyEntrySuggestion(input, target, 'due:')).toEqual({
    value: 'Task /due:',
    caret: 10,
  });
});

/** `|` marks the caret; it is removed before the input is read. */
function at(marked: string): { input: string; caret: number } {
  const caret = marked.indexOf('|');
  return { input: marked.replace('|', ''), caret };
}

function targetOf(marked: string) {
  const { input, caret } = at(marked);
  return entrySuggestionTarget(input, caret);
}

describe('entrySuggestionTarget', () => {
  it.each([
    [
      'a project being typed',
      'Buy milk +Ho|',
      { kind: 'project', query: 'Ho' },
    ],
    ['a bare mark', 'Buy milk +|', { kind: 'project', query: '' }],
    [
      'a tag being typed',
      'Buy milk #err|ands',
      { kind: 'tag', query: 'errands' },
    ],
    [
      'inside an open bracket',
      'Task +(Home Off|',
      { kind: 'project', query: 'Home Off' },
    ],
    [
      'inside a closed bracket',
      'Task +(Home |Office)',
      { kind: 'project', query: 'Home Office' },
    ],
    ['a priority', 'Task !|', { kind: 'priority', query: '' }],
    ['a command', 'Task /to|', { kind: 'command', query: 'to' }],
  ] as const)('targets %s', (_name, marked, expected) => {
    expect(targetOf(marked)).toMatchObject(expected);
  });

  it.each([
    ['a plain word', 'Buy mi|lk'],
    ['the caret before the mark', 'Buy milk |+Home'],
    ['a name the person already closed', 'Task +(Home Office)|'],
    ['a note, which names nothing only-tdy knows', 'Call *(ring her|'],
    ['a different token', 'Task +Home |milk'],
  ])('offers nothing for %s', (_name, marked) => {
    expect(targetOf(marked)).toBeUndefined();
  });
});

describe('applyEntrySuggestion', () => {
  it.each([
    ['at the end of the line', 'Buy milk +Ho|', 'Home', 'Buy milk +Home '],
    [
      'mid line, keeping the space that is there',
      'Buy +Ho| milk',
      'Home',
      'Buy +Home milk',
    ],
    [
      'bracketing a name that needs it',
      'Buy +Ho|',
      'Home Office',
      'Buy +(Home Office) ',
    ],
    ['over a bare mark', 'Buy #|', 'errands', 'Buy #errands '],
    [
      'over an open bracket',
      'Buy +(Home Off|',
      'Home Office',
      'Buy +(Home Office) ',
    ],
  ] as const)('writes the name %s', (_name, marked, pick, expected) => {
    const { input, caret } = at(marked);
    const target = entrySuggestionTarget(input, caret);

    expect(applyEntrySuggestion(input, required(target), pick).value).toBe(
      expected,
    );
  });

  it('leaves the caret past the token, so the list closes', () => {
    const { input, caret } = at('Buy milk +Ho|');
    const target = required(entrySuggestionTarget(input, caret));
    const applied = applyEntrySuggestion(input, target, 'Home');

    expect(applied.caret).toBe(applied.value.length);
    expect(entrySuggestionTarget(applied.value, applied.caret)).toBeUndefined();
  });
});

describe('the tag field’s comma grammar', () => {
  it.each([
    ['the segment being typed', 'work, err|', 'err'],
    ['the empty segment after a comma', 'work,|', ''],
    ['a leading hash', 'work, #err|', 'err'],
  ])('targets %s', (_name, marked, query) => {
    const { input, caret } = at(marked);

    expect(tagListSuggestionTarget(input, caret)).toMatchObject({
      kind: 'tag',
      query,
    });
  });

  it('writes the name without closing up the space after the comma', () => {
    const { input, caret } = at('work, err|');
    const target = required(tagListSuggestionTarget(input, caret));

    expect(applyTagListSuggestion(input, target, 'errands').value).toBe(
      'work, errands, ',
    );
  });

  it('adds no separator when another tag follows', () => {
    const { input, caret } = at('work, err|, home');
    const target = required(tagListSuggestionTarget(input, caret));

    expect(applyTagListSuggestion(input, target, 'errands').value).toBe(
      'work, errands, home',
    );
  });
});

describe('rankSuggestions', () => {
  const names = ['Home', 'Home Office', 'Homework', 'At home', 'Work'];

  it('puts names that start with the query before names that merely contain it', () => {
    expect(rankSuggestions(names, 'home').map((match) => match.name)).toEqual([
      'Home',
      'Home Office',
      'Homework',
      'At home',
    ]);
  });

  it('offers everything for a bare mark', () => {
    expect(rankSuggestions(names, '')).toHaveLength(names.length);
  });

  it('offers nothing when the only match is the name already typed', () => {
    /* Suppressed only when it stands alone: here “Homework” still contains
       the query, so there is something left to choose between. */
    expect(rankSuggestions(names, 'work')).toMatchObject([
      { name: 'Work' },
      { name: 'Homework' },
    ]);
    expect(rankSuggestions(['Work'], 'work')).toEqual([]);
  });

  it('marks the matched span so the row can show it', () => {
    expect(rankSuggestions(['At home'], 'ho')).toEqual([
      { name: 'At home', matchStart: 3, matchEnd: 5 },
    ]);
  });

  it('never offers a name the field cannot spell', () => {
    expect(rankSuggestions(['the (big) one', 'Home'], '')).toMatchObject([
      { name: 'Home' },
    ]);
    expect(
      rankSuggestions(['a,b', 'Home'], '', { sayable: isTagListWritable }),
    ).toMatchObject([{ name: 'Home' }]);
  });

  it('stops at the limit', () => {
    expect(rankSuggestions(names, '', { limit: 2 })).toHaveLength(2);
  });
});

describe('isNewProjectName', () => {
  const projects = ['Home', 'Home Office'];

  it('is new when no project has the name, case folded', () => {
    expect(isNewProjectName(projects, 'Hom')).toBe(true);
    expect(isNewProjectName(projects, 'home office')).toBe(false);
  });

  it('is nothing while only the mark is typed', () => {
    expect(isNewProjectName(projects, '')).toBe(false);
    expect(isNewProjectName(projects, ' ')).toBe(false);
  });
});

describe('searchSuggestionTarget', () => {
  it.each([
    ['#fin', { kind: 'tag', query: 'fin' }],
    ['+Ho', { kind: 'project', query: 'Ho' }],
    ['!2', { kind: 'priority', query: '2' }],
  ] as const)('targets %s', (value, expected) => {
    expect(searchSuggestionTarget(value)).toMatchObject(expected);
  });

  it('offers nothing for words', () => {
    expect(searchSuggestionTarget('bulb')).toBeUndefined();
  });
});
