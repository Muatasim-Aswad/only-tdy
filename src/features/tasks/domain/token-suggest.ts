/**
 * What can be offered for the token the caret is sitting in.
 *
 * Two fields in only-tdy take names that already exist somewhere — quick entry,
 * where `+` names a project and `#` names a tag, and the task page's tag
 * field, where commas do the same work. Both ask the same question of the
 * caret: which name is being typed right now, and which of the known ones
 * start like it. Only the spelling differs, so only the reading and the
 * writing back are written twice; the ranking is written once.
 *
 * Nothing here decides whether a list is shown. That is the field's business,
 * and it needs one more fact this module deliberately does not have: whether
 * the person is still typing or has already picked.
 */

import {
  isWritableName,
  scanEntryTokens,
  tokenMark,
  writeTokenName,
  type EntryToken,
} from './entry-tokens.ts';
import { scanTagSegments } from './tag-list.ts';

/** How many names a list offers before it stops being a list and starts being the whole account. */
export const SUGGESTION_LIMIT = 6;

/** The marks a suggestion can complete: the names only-tdy knows, and the
    fixed words `!` and `/` take. A note is prose, so it is never one. */
export type SuggestionKind = 'project' | 'tag' | 'priority' | 'command';

/** The token a suggestion would complete, and where it sits in the field. */
export interface SuggestionTarget {
  readonly kind: SuggestionKind;
  /** What has been typed after the mark, which may be nothing. */
  readonly query: string;
  readonly start: number;
  readonly end: number;
}

/** A name, with the part of it the query already accounts for. */
export interface Suggestion {
  readonly name: string;
  /** Index of the query inside the name, case folded. `0` for a prefix match. */
  readonly matchStart: number;
  readonly matchEnd: number;
  /** The mark the name is written after, shown in front of it in the list. */
  readonly mark?: string;
  /** A word after the name saying what it means, for the terse ones (`!2`). */
  readonly detail?: string;
}

function caretIsInside(token: EntryToken, caret: number): boolean {
  /* The mark itself is not part of what is being named: a caret between the
     `+` and the character before it belongs to whatever came first. The end
     is inclusive, because the caret sits past the last character while the
     name is still being typed. */
  return caret > token.start && caret <= token.end;
}

/**
 * The quick-entry token under the caret, when it is one that names something.
 * A word is never a target: only-tdy completes names it knows, and the title is
 * not one of them.
 */
export function entrySuggestionTarget(
  input: string,
  caret: number,
): SuggestionTarget | undefined {
  for (const token of scanEntryTokens(input)) {
    /* A note is prose, not a name only-tdy knows, so there is nothing to offer
       for it — and a word is the title, which is not a name either. */
    if (token.kind === 'note' || token.kind === 'word') continue;
    if (!caretIsInside(token, caret)) continue;
    /* A closed bracket has been finished on purpose. Completing past it would
       mean rewriting a name the person already ended. */
    if (token.wrapped && !token.unterminated && caret === token.end) continue;
    return {
      kind: token.kind,
      query: token.value,
      start: token.start,
      end: token.end,
    };
  }
  return undefined;
}

/** The line with the target rewritten as `name`, and where the caret lands. */
export function applyEntrySuggestion(
  input: string,
  target: SuggestionTarget,
  name: string,
): { readonly value: string; readonly caret: number } {
  const written = `${tokenMark(target.kind)}${writeTokenName(name)}`;
  const rest = input.slice(target.end);
  /* One space after the token, so the next word is typed rather than run into
     the name and the caret lands outside the token — which is what closes the
     list. Not added when the line already provides one. */
  const datePrefix =
    target.kind === 'command' && /^(due|hide|استحقاق|إخفاء):$/.test(name);
  const separator = datePrefix || rest.startsWith(' ') ? '' : ' ';
  const head = `${input.slice(0, target.start)}${written}${separator}`;
  return {
    value: `${head}${rest}`,
    caret: head.length + (!datePrefix && rest.startsWith(' ') ? 1 : 0),
  };
}

/**
 * The same for the task page's tag field, where the grammar is commas. Every
 * segment is a tag, so every segment is a target — there is no mark to look
 * for and no word to skip.
 */
export function tagListSuggestionTarget(
  value: string,
  caret: number,
): SuggestionTarget | undefined {
  for (const segment of scanTagSegments(value)) {
    if (caret < segment.start || caret > segment.end) continue;
    return {
      kind: 'tag',
      query: value.slice(segment.start, segment.end).trim().replace(/^#+/, ''),
      start: segment.start,
      end: segment.end,
    };
  }
  return undefined;
}

export function applyTagListSuggestion(
  value: string,
  target: SuggestionTarget,
  name: string,
): { readonly value: string; readonly caret: number } {
  const rest = value.slice(target.end);
  /* The span starts right after the comma, so it owns the space that follows
     it. Writing the name over the whole span would close that space up. */
  const typed = value.slice(target.start, target.end);
  const indent = typed.slice(0, typed.length - typed.trimStart().length);
  const head = `${value.slice(0, target.start)}${indent}${name}`;
  /* A finished tag is followed by its separator, so the next one can be typed
     straight away — but only when this was the last segment. */
  const separator = rest === '' ? ', ' : '';
  return {
    value: `${head}${separator}${rest}`,
    caret: head.length + separator.length,
  };
}

const SEARCH_MARKS: Readonly<Record<string, SuggestionKind>> = {
  '+': 'project',
  '#': 'tag',
  '!': 'priority',
};

/**
 * The search field's term, when it is one that names something.
 *
 * Both searchable pages read the whole line as one term — a tag or a project
 * may contain a space, and searching for the first word of a name is not what
 * was asked — so there is no token to find and the caret does not come into
 * it. Either the line starts with a mark, in which case everything after it
 * is the name being typed, or it is words to look for and there is nothing to
 * complete.
 */
export function searchSuggestionTarget(
  value: string,
): SuggestionTarget | undefined {
  const mark = value.trimStart().charAt(0);
  const kind = SEARCH_MARKS[mark];
  if (kind === undefined) return undefined;

  const start = value.length - value.trimStart().length;
  return {
    kind,
    query: value.slice(start + 1).trim(),
    start,
    end: value.length,
  };
}

/** The field with the term rewritten as `name`, and where the caret lands. */
export function applySearchSuggestion(
  value: string,
  target: SuggestionTarget,
  name: string,
): { readonly value: string; readonly caret: number } {
  const written = `${value.slice(0, target.start)}${tokenMark(target.kind)}${name}`;
  return { value: written, caret: written.length };
}

/**
 * Whether a `+` name is one no project has yet, so capturing it would create
 * one. Matched with case folded, the same way capture matches a name.
 */
export function isNewProjectName(
  projects: readonly string[],
  query: string,
): boolean {
  if (query.trim() === '') return false;
  const typed = query.toLocaleLowerCase();
  return !projects.some((name) => name.toLocaleLowerCase() === typed);
}

/**
 * The names worth offering for a query, best first.
 *
 * A name that starts with what was typed comes before one that merely
 * contains it, because the first is what someone typing a name is reaching
 * for and the second is a coincidence often enough to matter. Within each
 * group the order is the account's own, which is alphabetical from Tududi and
 * stable between keystrokes either way.
 *
 * An exact match on its own is not a suggestion: there is nothing left to
 * complete, and offering it would put a list under a name already finished —
 * where the return key means save, not accept.
 */
export function rankSuggestions(
  names: readonly string[],
  query: string,
  options: {
    readonly limit?: number;
    /** Whether the field's own grammar can spell the name at all. */
    readonly sayable?: (name: string) => boolean;
  } = {},
): readonly Suggestion[] {
  const { limit = SUGGESTION_LIMIT, sayable = isWritableName } = options;
  const needle = query.toLocaleLowerCase();
  const prefixed: Suggestion[] = [];
  const contained: Suggestion[] = [];

  for (const name of names) {
    if (!sayable(name)) continue;

    if (needle === '') {
      prefixed.push({ name, matchStart: 0, matchEnd: 0 });
      continue;
    }

    const index = name.toLocaleLowerCase().indexOf(needle);
    if (index < 0) continue;

    const suggestion = {
      name,
      matchStart: index,
      matchEnd: index + query.length,
    };
    (index === 0 ? prefixed : contained).push(suggestion);
  }

  const ranked = [...prefixed, ...contained];
  if (
    ranked.length === 1 &&
    ranked[0]?.name.toLocaleLowerCase() === needle &&
    needle !== ''
  ) {
    return [];
  }

  return ranked.slice(0, limit);
}
