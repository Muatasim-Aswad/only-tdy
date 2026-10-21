import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';

import {
  isNamedToken,
  isWritableName,
  scanEntryTokens,
  tokenMark,
} from '../domain/entry-tokens.ts';
import {
  CAPTURE_COMMANDS,
  COMMANDS,
  PRIORITY_VALUES,
} from '../domain/quick-entry.ts';
import { isTagListWritable, scanTagSegments } from '../domain/tag-list.ts';
import {
  applyEntrySuggestion,
  isNewProjectName,
  applySearchSuggestion,
  applyTagListSuggestion,
  entrySuggestionTarget,
  rankSuggestions,
  searchSuggestionTarget,
  tagListSuggestionTarget,
  type Suggestion,
  type SuggestionKind,
  type SuggestionTarget,
} from '../domain/token-suggest.ts';

import { useDateTimezone } from '../date-timezone.ts';
import { currentDate, displayDate, resolveDate } from '../domain/task-dates.ts';
import { COPY, PRIORITY_NAME } from './copy.ts';
import type { ChipSpan } from './TokenChips.tsx';

const PRIORITY_NAMES: readonly string[] = Object.keys(PRIORITY_VALUES);

/** What each priority digit means, said beside it in the list. */
function describe(kind: SuggestionKind, name: string): string | undefined {
  if (kind !== 'priority') return undefined;
  const priority = PRIORITY_VALUES[name as keyof typeof PRIORITY_VALUES];
  return PRIORITY_NAME[priority];
}

/**
 * Which grammar the field speaks: quick entry's marks, the tag field's
 * commas, or the search field's whole-line term.
 */
export type SuggestionGrammar = 'entry' | 'tag-list' | 'search';

/** Either control this can drive. Only the tag and capture fields paint chips. */
type Field = HTMLInputElement | HTMLTextAreaElement;

export interface UseSuggestionsOptions {
  readonly grammar: SuggestionGrammar;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** Project names, for `+`. Empty until the list has been fetched. */
  readonly projects?: readonly string[];
  /** Tag names, for `#` and for the tag field. */
  readonly tags?: readonly string[];
  /**
   * Whether a `+` name no project has yet is offered as a new one. Only once
   * the list has been fetched — before that, every name would look new.
   */
  readonly offersNewProject?: boolean;
  readonly allowRepeating?: boolean;
}

export interface Suggestions<T extends Field = Field> {
  readonly ref: React.RefObject<T | null>;
  readonly open: boolean;
  readonly items: readonly Suggestion[];
  /** The row return and tab take: the first one while a name is half typed. */
  readonly activeIndex: number;
  readonly listId: string;
  readonly optionId: (index: number) => string;
  /** The spans the chips are painted over, whether or not a list is open. */
  readonly spans: readonly ChipSpan[];
  readonly pick: (name: string) => void;
  /**
   * Called from the field's own `onChange`, after the new value has been
   * reported. The caret has to be read from the same event that carried the
   * character, because the list is answering where the caret is now.
   */
  readonly noteCaret: (event: SyntheticEvent<T>) => void;
  /** Every handler the field has to hand on for any of this to work. */
  readonly fieldProps: {
    readonly ref: React.RefObject<T | null>;
    readonly role: 'combobox';
    readonly 'aria-expanded': boolean;
    readonly 'aria-autocomplete': 'list';
    readonly 'aria-controls': string | undefined;
    readonly 'aria-activedescendant': string | undefined;
    readonly onFocus: () => void;
    readonly onBlur: () => void;
    readonly onSelect: (event: SyntheticEvent<T>) => void;
    readonly onClick: (event: SyntheticEvent<T>) => void;
    readonly onKeyDown: (event: KeyboardEvent<T>) => void;
  };
}

const NO_NAMES: readonly string[] = [];

/** What each grammar can spell: quotes are quick entry's problem, commas the tag field's. */
const SAYABLE: Readonly<Record<SuggestionGrammar, (name: string) => boolean>> =
  {
    entry: isWritableName,
    'tag-list': isTagListWritable,
    /* The whole line is the term, so anything can be searched for. */
    search: () => true,
  };

/**
 * Where the target is, per grammar. The search field is the odd one: its
 * term is the whole line, so the caret has nothing to say about it.
 */
function readTarget(
  grammar: SuggestionGrammar,
  value: string,
  caret: number,
): SuggestionTarget | undefined {
  switch (grammar) {
    case 'entry':
      return entrySuggestionTarget(value, caret);
    case 'tag-list':
      return tagListSuggestionTarget(value, caret);
    case 'search':
      return searchSuggestionTarget(value);
  }
}

function writeTarget(
  grammar: SuggestionGrammar,
  value: string,
  target: SuggestionTarget,
  name: string,
): { readonly value: string; readonly caret: number } {
  switch (grammar) {
    case 'entry':
      return applyEntrySuggestion(value, target, name);
    case 'tag-list':
      return applyTagListSuggestion(value, target, name);
    case 'search':
      return applySearchSuggestion(value, target, name);
  }
}

function chipSpans(grammar: SuggestionGrammar, value: string): ChipSpan[] {
  /* The search field's term is the whole line, so only a marked term is a
     token: the pill runs from the mark to the last character typed. Plain
     words are a phrase, not a token, and get no pill. */
  if (grammar === 'search') {
    const target = searchSuggestionTarget(value);
    if (target === undefined || target.query === '') return [];
    const end = value.trimEnd().length;
    return [{ start: target.start, end, kind: target.kind }];
  }

  if (grammar === 'entry') {
    return scanEntryTokens(value)
      .filter(isNamedToken)
      .map((token) => ({
        start: token.start,
        end: token.end,
        kind: token.kind as ChipSpan['kind'],
      }));
  }

  /* A comma-separated tag is a chip over what was typed, not over the
     whitespace the separator left behind. */
  const spans: ChipSpan[] = [];
  for (const segment of scanTagSegments(value)) {
    const text = value.slice(segment.start, segment.end);
    const lead = text.length - text.trimStart().length;
    const trimmed = text.trim();
    if (trimmed === '') continue;
    spans.push({
      start: segment.start + lead,
      end: segment.start + lead + trimmed.length,
      kind: 'tag',
    });
  }
  return spans;
}

/**
 * A suggestion list over a plain text field.
 *
 * The field stays the source of truth: this reads the caret, works out which
 * token it is in, and offers the names that would complete it. Nothing is
 * written until a row is chosen, and choosing one rewrites exactly that
 * token, leaving the rest of the line alone.
 *
 * The keyboard contract is the delicate part. While a name is half typed,
 * the first row is already active, so one key finishes it: tab on a
 * keyboard, return on a phone, which has no tab. Return goes back to the
 * field — adding the task or saving the edit — once nothing is left to
 * finish: nothing typed after the mark yet, the name already typed in full,
 * or the list put away with escape or by stepping above its first row.
 */
export function useSuggestions<T extends Field = Field>({
  grammar,
  value,
  onValueChange,
  projects = NO_NAMES,
  tags = NO_NAMES,
  offersNewProject = false,
  allowRepeating = false,
}: UseSuggestionsOptions): Suggestions<T> {
  const timezone = useDateTimezone();
  const ref = useRef<T | null>(null);
  const listId = useId();
  const [caret, setCaret] = useState<number | undefined>(undefined);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  /* `undefined` until an arrow key moves: the row then follows the typing. */
  const [steppedIndex, setSteppedIndex] = useState<number | undefined>(
    undefined,
  );
  /* Where the caret has to be put after a pick, applied once the field has
     re-rendered with the rewritten value. */
  const pendingCaret = useRef<number | undefined>(undefined);

  /* Where the caret goes is already state; this only tells the control,
     once it holds the rewritten value. */
  useLayoutEffect(() => {
    const next = pendingCaret.current;
    if (next === undefined) return;
    pendingCaret.current = undefined;
    ref.current?.setSelectionRange(next, next);
  });

  const target = focused
    ? readTarget(grammar, value, caret ?? value.length)
    : undefined;

  const known =
    target === undefined
      ? NO_ITEMS
      : (target.kind === 'command' && /^(due|hide):/i.test(target.query)
          ? dateSuggestions(target.query, timezone)
          : rankSuggestions(namesFor(target.kind), target.query, {
              sayable: SAYABLE[grammar],
            })
        ).map((item) => {
          /* The fixed words are shown with their mark, since `1` alone says
             nothing; names only-tdy knows are shown bare, as they always were. */
          if (target.kind !== 'priority' && target.kind !== 'command') {
            return item;
          }
          const detail = describe(target.kind, item.name);
          return {
            ...item,
            mark: tokenMark(target.kind),
            ...(detail === undefined ? {} : { detail }),
          };
        });

  const items = offersNewProject
    ? withNewProject(known, target, projects)
    : known;

  function namesFor(kind: SuggestionKind): readonly string[] {
    switch (kind) {
      case 'project':
        return projects;
      case 'tag':
        return tags;
      case 'priority':
        return PRIORITY_NAMES;
      case 'command':
        /* Search has no commands: `/` is only quick entry's. */
        return grammar === 'entry'
          ? allowRepeating
            ? CAPTURE_COMMANDS
            : COMMANDS
          : NO_NAMES;
    }
  }

  const open = !dismissed && items.length > 0;
  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (
        !(target instanceof Node) ||
        ref.current?.contains(target) ||
        document.getElementById(listId)?.contains(target)
      )
        return;
      setDismissed(true);
      setSteppedIndex(undefined);
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
    };
  }, [open, listId]);
  const typedIndex = completesTyping(items, target) ? 0 : -1;
  /* Clamped rather than reset: the list shortens as more is typed, and a
     keyboard position past its end would point at nothing. */
  const active = open
    ? Math.min(steppedIndex ?? typedIndex, items.length - 1)
    : -1;

  const optionId = useCallback(
    (index: number) => `${listId}-option-${String(index)}`,
    [listId],
  );

  const readCaret = useCallback((event: SyntheticEvent<T>) => {
    const position = event.currentTarget.selectionStart;
    if (position === null) return;
    setCaret(position);
    /* Moving the caret is a new question, so a list put away for the last one
       comes back and no row is preselected. */
    setDismissed(false);
    setSteppedIndex(undefined);
  }, []);

  const pick = useCallback(
    (name: string) => {
      if (target === undefined) return;
      const applied = writeTarget(grammar, value, target, name);

      pendingCaret.current = applied.caret;
      setCaret(applied.caret);
      setSteppedIndex(undefined);
      onValueChange(applied.value);
    },
    [grammar, onValueChange, target, value],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<T>) => {
      if (event.defaultPrevented || event.nativeEvent.isComposing) return;
      if (items.length === 0) return;

      if (event.key === 'Escape') {
        if (!open) return;
        event.preventDefault();
        setDismissed(true);
        setSteppedIndex(undefined);
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setDismissed(false);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const count = items.length;
        /* Wrapping through “no row” rather than straight round, so the
           keyboard can always get back to a state where return submits. */
        setSteppedIndex((current) => {
          const next = (current ?? typedIndex) + step;
          if (next >= count) return -1;
          if (next < -1) return count - 1;
          return next;
        });
        return;
      }

      if (active < 0) return;

      if (
        event.key === 'Enter' &&
        target?.kind === 'command' &&
        /^(due|hide):/i.test(target.query) &&
        steppedIndex === undefined
      )
        return;

      if (event.key === 'Enter' || event.key === 'Tab') {
        const chosen = items[active];
        if (chosen === undefined) return;
        event.preventDefault();
        pick(chosen.name);
      }
    },
    [active, items, open, pick, typedIndex, target, steppedIndex],
  );

  return {
    ref,
    open,
    items,
    activeIndex: active,
    listId,
    optionId,
    spans: chipSpans(grammar, value),
    pick,
    noteCaret: readCaret,
    fieldProps: {
      ref,
      role: 'combobox',
      'aria-expanded': open,
      'aria-autocomplete': 'list',
      'aria-controls': open ? listId : undefined,
      'aria-activedescendant': active >= 0 ? optionId(active) : undefined,
      onFocus: () => {
        setFocused(true);
      },
      onBlur: () => {
        setFocused(false);
        setSteppedIndex(undefined);
      },
      onSelect: readCaret,
      onClick: readCaret,
      onKeyDown,
    },
  };
}

const NO_ITEMS: readonly Suggestion[] = [];

/**
 * The list with a last row saying the typed `+` name will become a project.
 * Its name is the typed one, so it never finishes anything: return still adds
 * the task, and that is what creates the project.
 */
function withNewProject(
  items: readonly Suggestion[],
  target: SuggestionTarget | undefined,
  projects: readonly string[],
): readonly Suggestion[] {
  if (target?.kind !== 'project') return items;
  if (!isNewProjectName(projects, target.query)) return items;
  return [
    ...items,
    {
      name: target.query,
      matchStart: 0,
      matchEnd: target.query.length,
      mark: tokenMark('project'),
      detail: COPY.newProject,
    },
  ];
}

/**
 * Whether the first row would finish what is being typed. A bare mark has
 * nothing typed to finish, and a name already typed in full leaves nothing,
 * so return keeps adding the task in both.
 */
function completesTyping(
  items: readonly Suggestion[],
  target: SuggestionTarget | undefined,
): boolean {
  const first = items[0];
  if (first === undefined || target === undefined) return false;
  const typed = target.query.toLocaleLowerCase();
  return typed !== '' && first.name.toLocaleLowerCase() !== typed;
}

function dateSuggestions(
  query: string,
  timezone: string,
): readonly Suggestion[] {
  const separator = query.indexOf(':');
  const value = query.slice(separator + 1);
  const date = resolveDate(value, { timezone });
  if (date === undefined) return [];
  const name = `${query.slice(0, separator + 1)}${displayDate(date)}`;
  if (name === query) return [];
  const days = Math.round(
    (Date.parse(`${date}T12:00:00Z`) -
      Date.parse(`${currentDate({ timezone })}T12:00:00Z`)) /
      86_400_000,
  );
  const detail =
    days === 0
      ? 'today'
      : days === 1
        ? 'tomorrow'
        : days > 0
          ? `in ${String(days)} days`
          : `${String(-days)} days ago`;
  return [{ name, matchStart: 0, matchEnd: 0, detail }];
}
