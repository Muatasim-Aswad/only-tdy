export const LESSONS = [
  'capture',
  'backlog',
  'backlog-tools',
  'today',
  'editor',
  'compact',
  'switch',
  'tokens',
  'more',
  'all',
  'reference',
] as const;
export type Lesson = (typeof LESSONS)[number];
export const FACTS = [
  'captured',
  'captured-backlog',
  'backlog-populated',
  'selected',
  'moved',
  'searched',
  'completed',
  'editor',
  'saved-full',
  'later-editor',
  'compact',
  'switch',
  'token-today',
  'token-tag',
  'token-priority',
  'token-due',
  'token-repeating',
  'token-note',
  'suggestion',
  'more',
  'all-populated',
  'guide',
] as const;
export type Fact = (typeof FACTS)[number];
export interface Progress {
  readonly version: 1;
  readonly done: readonly Lesson[];
  readonly used: readonly Fact[];
  readonly later: Partial<Record<Lesson, string>>;
  readonly startedVisit: string;
}
export const EMPTY_PROGRESS: Progress = {
  version: 1,
  done: [],
  used: [],
  later: {},
  startedVisit: '',
};
const list = <T extends string>(value: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(value) ? allowed.filter((item) => value.includes(item)) : [];
export function readProgress(value: string): Progress {
  try {
    if (value.length > 8192) return EMPTY_PROGRESS;
    const raw: unknown = JSON.parse(value);
    if (
      typeof raw !== 'object' ||
      raw === null ||
      !('version' in raw) ||
      raw.version !== 1
    )
      return EMPTY_PROGRESS;
    const p = raw as Record<string, unknown>;
    return {
      version: 1,
      done: list(p.done, LESSONS),
      used: list(p.used, FACTS),
      later: Object.fromEntries(
        LESSONS.flatMap((id) => {
          const v =
            typeof p.later === 'object' && p.later !== null
              ? (p.later as Record<string, unknown>)[id]
              : undefined;
          return typeof v === 'string' && v.length <= 64 ? [[id, v]] : [];
        }),
      ),
      startedVisit:
        typeof p.startedVisit === 'string' ? p.startedVisit.slice(0, 64) : '',
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}
export function addFacts(p: Progress, facts: readonly Fact[]): Progress {
  return {
    ...p,
    used: FACTS.filter((f) => p.used.includes(f) || facts.includes(f)),
  };
}
export const TOKEN_FACTS: readonly Fact[] = [
  'token-today',
  'token-tag',
  'token-priority',
  'token-due',
  'token-repeating',
  'token-note',
];
const SATISFIED: Record<Lesson, readonly Fact[]> = {
  capture: ['captured'],
  backlog: ['backlog-populated'],
  'backlog-tools': ['selected', 'moved', 'searched'],
  today: ['completed'],
  editor: ['editor'],
  compact: ['compact'],
  switch: ['switch'],
  tokens: [...TOKEN_FACTS, 'suggestion'],
  more: ['more'],
  all: ['all-populated'],
  reference: ['guide'],
};
export function satisfied(p: Progress, lesson: Lesson): boolean {
  return (
    p.done.includes(lesson) ||
    SATISFIED[lesson].every((f) => p.used.includes(f))
  );
}
export interface PageContext {
  readonly kind:
    | 'tasks'
    | 'backlog'
    | 'all'
    | 'history'
    | 'repeating'
    | 'task'
    | 'new-repeating'
    | 'guide'
    | 'settings'
    | 'version';
  readonly populated: boolean;
  readonly olderCompleted?: boolean;
}
export type Signal =
  | { readonly kind: 'page'; readonly page: PageContext }
  | { readonly kind: 'facts'; readonly facts: readonly Fact[] }
  | { readonly kind: 'field'; readonly mode: 'add' | 'search' };
export function observe(p: Progress, signal: Signal): Progress {
  if (signal.kind === 'facts') return addFacts(p, signal.facts);
  if (signal.kind !== 'page') return p;
  const { kind, populated } = signal.page;
  const facts: Fact[] = [];
  if (populated && kind === 'backlog') facts.push('backlog-populated');
  if (populated && kind === 'all') facts.push('all-populated');
  if (kind === 'guide') facts.push('guide');
  if (kind === 'task') {
    if (p.used.includes('saved-full')) facts.push('later-editor');
    facts.push('editor');
  }
  return addFacts(p, facts);
}
/** One eligible lesson, in tour order. Progress changes alone never call this. */
export function nextLesson(
  p: Progress,
  page: PageContext,
  signal: Signal,
  visit: string,
): Lesson | null {
  const core = satisfied(p, 'capture') && satisfied(p, 'backlog-tools');
  const listPage = page.kind === 'tasks' || page.kind === 'backlog';
  const field = signal.kind === 'field';
  const eligible: Record<Lesson, boolean> = {
    capture:
      page.kind === 'tasks' &&
      (signal.kind === 'page' || (field && signal.mode === 'add')),
    backlog:
      listPage &&
      page.kind !== 'backlog' &&
      p.used.includes('captured-backlog'),
    'backlog-tools':
      page.kind === 'backlog' && page.populated && signal.kind === 'page',
    today:
      core && page.kind === 'tasks' && page.populated && signal.kind === 'page',
    editor:
      core &&
      listPage &&
      page.populated &&
      signal.kind === 'page' &&
      satisfied(p, 'today'),
    compact:
      page.kind === 'task' &&
      p.used.includes('later-editor') &&
      signal.kind === 'page',
    switch: core && listPage && field,
    tokens:
      core &&
      listPage &&
      field &&
      signal.mode === 'add' &&
      satisfied(p, 'switch'),
    more:
      core && listPage && p.startedVisit !== visit && signal.kind === 'page',
    all: listPage && page.olderCompleted === true && signal.kind === 'page',
    reference: core && satisfied(p, 'tokens') && listPage && field,
  };
  return (
    LESSONS.find(
      (id) => eligible[id] && !satisfied(p, id) && p.later[id] !== visit,
    ) ?? null
  );
}
export function resolveLesson(
  p: Progress,
  lesson: Lesson,
  visit: string,
  later: boolean,
): Progress {
  return later
    ? { ...p, later: { ...p.later, [lesson]: visit } }
    : {
        ...p,
        done: LESSONS.filter((id) => id === lesson || p.done.includes(id)),
      };
}
