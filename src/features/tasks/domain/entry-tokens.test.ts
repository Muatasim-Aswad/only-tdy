import { describe, expect, it } from 'vitest';

import {
  containsProjectSyntax,
  containsTagSyntax,
  isNamedToken,
  isWritableName,
  scanEntryTokens,
  writeTokenName,
} from './entry-tokens.ts';

describe('scanEntryTokens', () => {
  it('spans every token over the characters it covers', () => {
    const input = 'Buy milk +Home #errands';

    expect(
      scanEntryTokens(input).map((token) =>
        input.slice(token.start, token.end),
      ),
    ).toEqual(['Buy', 'milk', '+Home', '#errands']);
  });

  it('reads a bracketed name as one token', () => {
    expect(scanEntryTokens('Task +(Home Office) now')).toMatchObject([
      { kind: 'word', value: 'Task' },
      {
        kind: 'project',
        value: 'Home Office',
        wrapped: true,
        unterminated: false,
      },
      { kind: 'word', value: 'now' },
    ]);
  });

  it('runs an unclosed bracket to the end of the line', () => {
    expect(scanEntryTokens('Task +(Home Off')).toMatchObject([
      { kind: 'word', value: 'Task' },
      { kind: 'project', value: 'Home Off', wrapped: true, unterminated: true },
    ]);
  });

  it('reads a note the same way every other mark is read', () => {
    expect(scanEntryTokens('Call *(ask about the boiler) #home')).toMatchObject(
      [
        { kind: 'word', value: 'Call' },
        { kind: 'note', value: 'ask about the boiler', wrapped: true },
        { kind: 'tag', value: 'home' },
      ],
    );
  });

  it('ends a bracketed token at the first closing bracket', () => {
    expect(
      scanEntryTokens('Call *(ring her (the landlord) later)'),
    ).toMatchObject([
      { kind: 'word', value: 'Call' },
      { kind: 'note', value: 'ring her (the landlord', unterminated: false },
      { kind: 'word', value: 'later)' },
    ]);
  });

  it('keeps a mark with no name as a token waiting for one', () => {
    const tokens = scanEntryTokens('Task +');

    expect(tokens).toMatchObject([
      { kind: 'word', value: 'Task' },
      { kind: 'project', value: '' },
    ]);
    expect(tokens.filter(isNamedToken)).toEqual([]);
  });

  it('only reads a mark that starts a token', () => {
    expect(scanEntryTokens('C++ email+alias #a')).toMatchObject([
      { kind: 'word', value: 'C++' },
      { kind: 'word', value: 'email+alias' },
      { kind: 'tag', value: 'a' },
    ]);
  });
});

describe('writeTokenName', () => {
  it.each([
    ['Home', 'Home'],
    ['Home Office', '(Home Office)'],
    ['(parenthetical)', '((parenthetical))'],
  ])('writes %s as %s', (name, expected) => {
    expect(writeTokenName(name)).toBe(expected);
  });

  it('refuses a name the grammar cannot spell', () => {
    expect(isWritableName('the (big) one')).toBe(false);
    expect(isWritableName('Home Office')).toBe(true);
    /* A bare name runs to the next space, so a bracket inside one is just
       another character. */
    expect(isWritableName('C)')).toBe(true);
  });
});

describe('containsProjectSyntax', () => {
  it.each([
    ['bare token', 'Task +'],
    ['named token', 'Task +Ho'],
    ['leading token', '+Home task'],
    ['bracketed token', 'Task +(Home Off'],
  ])('detects project syntax for %s', (_name, input) => {
    expect(containsProjectSyntax(input)).toBe(true);
  });

  it.each(['Task', 'C++ task', 'Task email+alias'])(
    'does not detect embedded plus syntax in %s',
    (input) => {
      expect(containsProjectSyntax(input)).toBe(false);
    },
  );
});

describe('containsTagSyntax', () => {
  it.each(['Task #', 'Task #err', '#err task'])(
    'detects tag syntax in %s',
    (input) => {
      expect(containsTagSyntax(input)).toBe(true);
    },
  );

  it.each(['Task', 'issue#4', 'C# task'])(
    'does not detect an embedded hash in %s',
    (input) => {
      expect(containsTagSyntax(input)).toBe(false);
    },
  );
});
