/**
 * The one scanner behind quick entry.
 *
 * The grammar used to be read twice — once by the parser splitting on
 * whitespace, once by whatever else wanted to know what had been typed. Now it
 * is read once, into tokens that carry where they sit in the line, because
 * three things need that position: the parser, the chips painted behind the
 * text, and the suggestion list, which has to know which token the caret is
 * in before it can offer anything for it.
 *
 * Every mark reads the same way: the mark, then one token. A token is one word,
 * or several inside parentheses — `+(Home renovation)` is one project,
 * `#(next week)` is one tag, `*(ask about the boiler)` is one note. An opening
 * parenthesis that is never closed still scans to the end of the line, because
 * a name is half-typed far more often than it is finished, and suggestions are
 * worth nothing if they stop at the bracket.
 *
 * Parentheses rather than quotes, for three reasons: a note is prose and prose
 * holds quotation marks, a phone keyboard curls `"` into `“` where the parser
 * cannot match it, and an open bracket is a different character from a closing
 * one — so a half-typed name and a finished one never look alike.
 *
 * The first `)` closes the pair; there is no nesting and no escaping. A name
 * that wraps and holds a `)` is therefore unsayable, and such names are kept
 * out of the suggestion list rather than offered and then mis-parsed. An
 * unbalanced `)` inside a note ends it early — which the chips show as it is
 * typed, so the line can be fixed where it is written.
 */

/** Which mark started the token, or that nothing did. */
export type EntryTokenKind =
  'project' | 'tag' | 'note' | 'priority' | 'command' | 'word';

/** A mark that names something, as opposed to the words of the title. */
export type NamedTokenKind = Exclude<EntryTokenKind, 'word'>;

export interface EntryToken {
  readonly kind: EntryTokenKind;
  /** Index of the first character of the token in the input. */
  readonly start: number;
  /** Index one past the last character of the token. */
  readonly end: number;
  /** The token exactly as typed, mark and brackets included. */
  readonly text: string;
  /**
   * What the mark names, unwrapped. Empty when only the mark has been typed,
   * which is the state a suggestion list opens in.
   */
  readonly value: string;
  /** True when the name was written inside brackets. */
  readonly wrapped: boolean;
  /** True when a bracket was opened and the line ended before it closed. */
  readonly unterminated: boolean;
}

const MARKS: Readonly<Record<string, NamedTokenKind>> = {
  '+': 'project',
  '#': 'tag',
  '*': 'note',
  '!': 'priority',
  '/': 'command',
};

const OPEN = '(';
const CLOSE = ')';

function isSpace(character: string): boolean {
  return /\s/.test(character);
}

/**
 * Every token in the line, in order, with the span each one covers. Whitespace
 * between tokens belongs to no token, so the spans never touch unless the
 * characters do.
 */
export function scanEntryTokens(input: string): readonly EntryToken[] {
  const tokens: EntryToken[] = [];
  let index = 0;

  while (index < input.length) {
    const character = input[index] ?? '';
    if (isSpace(character)) {
      index += 1;
      continue;
    }

    const start = index;
    const kind = MARKS[character];

    if (kind === undefined) {
      while (index < input.length && !isSpace(input[index] ?? '')) index += 1;
      const text = input.slice(start, index);
      tokens.push({
        kind: 'word',
        start,
        end: index,
        text,
        value: text,
        wrapped: false,
        unterminated: false,
      });
      continue;
    }

    index += 1;
    const wrapped = input[index] === OPEN;
    let unterminated = false;

    if (wrapped) index += 1;
    const nameStart = index;

    if (wrapped) {
      while (index < input.length && input[index] !== CLOSE) index += 1;
    } else {
      while (index < input.length && !isSpace(input[index] ?? '')) index += 1;
    }

    const value = input.slice(nameStart, index);

    if (wrapped) {
      if (index < input.length) {
        index += 1;
      } else {
        unterminated = true;
      }
    }

    tokens.push({
      kind,
      start,
      end: index,
      text: input.slice(start, index),
      value,
      wrapped,
      unterminated,
    });
  }

  return tokens;
}

/**
 * True when the token names something rather than merely starting to. A lone
 * `+`, `#`, `*`, `!` or `/` is a mark waiting for a name — enough to open a
 * suggestion list, never enough to file a task.
 */
export function isNamedToken(token: EntryToken): boolean {
  return token.kind !== 'word' && token.value !== '';
}

/** True when a name has to be bracketed to be read back as one token. */
function needsBrackets(name: string): boolean {
  return /\s/.test(name) || name.startsWith(OPEN);
}

/**
 * Whether a name can be written in this grammar at all. Only a bracketed name
 * is at risk: a bare one runs to the next space, so a `)` inside it is just
 * another character.
 */
export function isWritableName(name: string): boolean {
  return !needsBrackets(name) || !name.includes(CLOSE);
}

/**
 * A name as the line has to spell it: bare when it is one word, bracketed when
 * it holds whitespace. Brackets are not added where they are not needed, so the
 * common case stays the plain text the grammar was always meant to be.
 */
export function writeTokenName(name: string): string {
  return needsBrackets(name) ? `${OPEN}${name}${CLOSE}` : name;
}

/** The mark a token of this kind is written with. */
export function tokenMark(kind: NamedTokenKind): string {
  switch (kind) {
    case 'project':
      return '+';
    case 'tag':
      return '#';
    case 'note':
      return '*';
    case 'priority':
      return '!';
    case 'command':
      return '/';
  }
}

/** True as soon as a project mark has been typed, named or not. */
export function containsProjectSyntax(input: string): boolean {
  return scanEntryTokens(input).some((token) => token.kind === 'project');
}

/** The same for a tag mark, which is what a tag list is fetched for. */
export function containsTagSyntax(input: string): boolean {
  return scanEntryTokens(input).some((token) => token.kind === 'tag');
}
