import { commandValue, tokenDigits } from './token-language.ts';
import { t } from '../messages.ts';
import type {
  Project,
  TaskDraft,
  TaskDraftError,
  TaskDraftResult,
  TaskPriority,
} from '../contracts.ts';

import { isNamedToken, scanEntryTokens } from './entry-tokens.ts';
import {
  applyDateRules,
  resolveDate,
  validateHideDate,
  type DateContext,
} from './task-dates.ts';
import { matchProjectByName } from './project-lookup.ts';

/* Graphemes, not code units: an accented or emoji first character has to stay
   one character when the title is recased. */
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** What `!` accepts, by the name written after it. */
export const PRIORITY_VALUES = {
  '1': 'low',
  '2': 'medium',
  '3': 'high',
} as const satisfies Readonly<Record<string, TaskPriority>>;

/* Every word `/` accepts. It is one word, and it is here rather than inline so
   the parser can tell an unknown command from a known one in the same breath. */
export const COMMANDS = ['today', 'due:', 'hide:'] as const;
export const CAPTURE_COMMANDS = [...COMMANDS, 'repeating'] as const;

function failure(
  kind: TaskDraftError['kind'],
  message: string,
): TaskDraftResult {
  return { ok: false, error: { kind, message } };
}

/**
 * Sentence case, applied to the first character and nothing else, so “do
 * groceries” is saved as “Do groceries”. Every other letter is left as typed:
 * the rule is deliberately dumb, because guessing which lines are acronyms or
 * brand names would be wrong more often than the one capital is.
 */
function capitalizeTitle(title: string): string {
  const first = GRAPHEMES.segment(title)[Symbol.iterator]().next().value;
  if (first === undefined) return title;
  return first.segment.toLocaleUpperCase() + title.slice(first.segment.length);
}

/**
 * Parses the deliberately small only-tdy grammar, over the tokens the scanner
 * found. Every mark takes one token — one word, or several inside brackets;
 * escaping and inferred multi-word names are still absent.
 *
 * A mark commits. `!` is a priority and `/` is a command, so `!high` and
 * `/tomorrow` are refused rather than quietly kept as words of the title: a
 * line that looks like it set something has to either set it or say it could
 * not. A bare `!` or `/` with nothing after it is just the character, and the
 * title keeps it — `Ship it!` is a title, not a broken priority.
 */
export function parseQuickEntry(
  input: string,
  projects: readonly Project[] = [],
  context: DateContext & {
    readonly capitalize?: boolean;
    readonly allowRepeating?: boolean;
  } = {},
): TaskDraftResult {
  const tokens = scanEntryTokens(input);
  const titleTokens: string[] = [];
  const tags: string[] = [];
  const seenTags = new Set<string>();
  const projectTokens: string[] = [];
  const noteTokens: string[] = [];
  const priorities = new Set<TaskPriority>();
  let isToday = false;
  let repeating = false;
  let dueDate: string | undefined;
  let deferUntil: string | undefined;

  for (const token of tokens) {
    /* A mark with no name after it is not a token of that kind yet — it is
       the character itself, and the line keeps it as typed. */
    if (!isNamedToken(token)) {
      titleTokens.push(token.text);
      continue;
    }

    if (token.kind === 'priority') {
      const value = tokenDigits(token.value);
      const priority = Object.hasOwn(PRIORITY_VALUES, value)
        ? PRIORITY_VALUES[value as keyof typeof PRIORITY_VALUES]
        : undefined;
      if (token.wrapped || priority === undefined) {
        return failure(
          'unknown-priority',
          t('quickEntry.parseQuickEntry.priorityIs12Or3'),
        );
      }
      priorities.add(priority);
      continue;
    }

    if (token.kind === 'command') {
      const value = commandValue(token.value);
      if (!token.wrapped && value === 'repeating' && context.allowRepeating) {
        repeating = true;
        continue;
      }
      if (!token.wrapped && value === 'today') {
        isToday = true;
        continue;
      }
      const dateToken = /^(due|hide):(.*)$/i.exec(value);
      if (!token.wrapped && dateToken !== null) {
        const date = resolveDate(dateToken[2] ?? '', context);
        if (date === undefined)
          return failure(
            'invalid-date',
            t('quickEntry.parseQuickEntry.useAValidDateDdMm'),
          );
        if (dateToken[1]?.toLowerCase() === 'due') {
          if (dueDate !== undefined)
            return failure(
              'multiple-dates',
              t('quickEntry.parseQuickEntry.chooseOneDueDate'),
            );
          dueDate = date;
        } else {
          if (deferUntil !== undefined)
            return failure(
              'multiple-dates',
              t('quickEntry.parseQuickEntry.chooseOneHideUntilDate'),
            );
          deferUntil = date;
        }
        continue;
      }
      return failure(
        'unknown-command',
        context.allowRepeating
          ? t('quickEntry.parseQuickEntry.commandsAreTodayDueDateHide')
          : t('quickEntry.parseQuickEntry.commandsAreTodayDueDateAnd'),
      );
    }

    if (token.kind === 'tag') {
      const normalizedTag = token.value.toLocaleLowerCase();
      if (!seenTags.has(normalizedTag)) {
        seenTags.add(normalizedTag);
        tags.push(token.value);
      }
      continue;
    }

    if (token.kind === 'note') {
      noteTokens.push(token.value);
      continue;
    }

    projectTokens.push(token.value);
  }

  if (priorities.size > 1) {
    return failure(
      'conflicting-priority',
      t('quickEntry.parseQuickEntry.chooseOnePriority12Or'),
    );
  }

  if (projectTokens.length > 1) {
    return failure(
      'multiple-projects',
      t('quickEntry.parseQuickEntry.chooseOneProject'),
    );
  }

  if (noteTokens.length > 1) {
    return failure(
      'multiple-notes',
      t('quickEntry.parseQuickEntry.chooseOneNote'),
    );
  }

  const plainTitle = titleTokens.join(' ');
  const title =
    context.capitalize === false ? plainTitle : capitalizeTitle(plainTitle);
  if (title.length === 0 && !repeating) {
    return failure(
      'empty-title',
      t('quickEntry.parseQuickEntry.addATaskTitle'),
    );
  }

  let projectUid: string | undefined;
  let newProjectName: string | undefined;
  if (projectTokens.length === 1) {
    const projectToken = projectTokens[0];
    if (projectToken === undefined) {
      throw new Error('Project token invariant failed.');
    }
    const match = matchProjectByName(projects, projectToken);
    if (match.status === 'ambiguous') {
      return failure(
        'ambiguous-project',
        t('search.ambiguousProject', { name: projectToken }),
      );
    }
    if (match.status === 'found') projectUid = match.project.uid;
    else newProjectName = projectToken;
  }

  const priority = priorities.values().next().value ?? 'low';
  const note = noteTokens[0];
  const dated = applyDateRules(
    {
      title,
      note: note ?? '',
      projectUid: projectUid ?? '',
      priority,
      status: isToday ? 'planned' : 'not_started',
      tags,
      dueDate: dueDate ?? '',
      deferUntil: deferUntil ?? '',
    },
    undefined,
    context,
  );
  try {
    validateHideDate(dated.dueDate, dated.deferUntil);
  } catch (error) {
    return failure('invalid-date', (error as Error).message);
  }
  const draft: TaskDraft = {
    title,
    priority,
    status: dated.status as TaskDraft['status'],
    tags,
    ...(projectUid === undefined ? {} : { projectUid }),
    ...(newProjectName === undefined ? {} : { newProjectName }),
    ...(note === undefined ? {} : { note }),
    ...(dueDate === undefined ? {} : { dueDate }),
    ...(deferUntil === undefined ? {} : { deferUntil: dated.deferUntil }),
  };

  return { ok: true, draft, ...(repeating ? { repeating: true } : {}) };
}
