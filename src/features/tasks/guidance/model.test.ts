import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  addFacts,
  nextLesson,
  observe,
  readProgress,
  resolveLesson,
  satisfied,
  type PageContext,
  type Progress,
} from './model.ts';
import { tokenFacts } from './token-facts.ts';
const today: PageContext = { kind: 'tasks', populated: false };
const base: Progress = {
  ...EMPTY_PROGRESS,
  startedVisit: 'first',
};
const page = (value: PageContext) => ({ kind: 'page', page: value }) as const;
const core = addFacts(base, [
  'captured',
  'backlog-populated',
  'selected',
  'moved',
  'searched',
]);
describe('guidance scheduling', () => {
  it('starts with capture and never queues two lessons together', () => {
    expect(nextLesson(base, today, page(today), 'first')).toBe('capture');
    const added = addFacts(base, ['captured', 'captured-backlog']);
    expect(
      nextLesson(added, today, { kind: 'facts', facts: ['captured'] }, 'first'),
    ).toBe('backlog');
  });
  it('only counts populated page discoveries', () => {
    expect(
      observe(base, page({ kind: 'backlog', populated: false })).used,
    ).not.toContain('backlog-populated');
    const visited = observe(base, page({ kind: 'backlog', populated: true }));
    expect(satisfied(visited, 'backlog')).toBe(true);
    expect(
      nextLesson(
        visited,
        { kind: 'backlog', populated: true },
        page({ kind: 'backlog', populated: true }),
        'first',
      ),
    ).toBe('backlog-tools');
    expect(
      satisfied(observe(base, page({ kind: 'all', populated: false })), 'all'),
    ).toBe(false);
    expect(
      satisfied(observe(base, page({ kind: 'all', populated: true })), 'all'),
    ).toBe(true);
  });
  it('defers until a different app visit and skips actual use in between', () => {
    const p = resolveLesson(base, 'capture', 'first', true);
    expect(nextLesson(p, today, page(today), 'first')).toBeNull();
    expect(nextLesson(p, today, page(today), 'second')).toBe('capture');
    expect(
      nextLesson(addFacts(p, ['captured']), today, page(today), 'second'),
    ).toBeNull();
  });
  it('does not repeat a dismissed lesson', () => {
    expect(
      nextLesson(
        resolveLesson(base, 'capture', 'first', false),
        today,
        page(today),
        'another',
      ),
    ).toBeNull();
  });
  it('lets separate actions satisfy separate lesson parts', () => {
    expect(
      satisfied(addFacts(base, ['selected', 'moved']), 'backlog-tools'),
    ).toBe(false);
    expect(
      satisfied(
        addFacts(base, ['selected', 'moved', 'searched']),
        'backlog-tools',
      ),
    ).toBe(true);
  });
  it('teaches compact mode only on a later editor visit after a normal save', () => {
    const first = observe(base, page({ kind: 'task', populated: true }));
    expect(first.used).not.toContain('later-editor');
    const later = observe(
      addFacts(first, ['saved-full']),
      page({ kind: 'task', populated: true }),
    );
    expect(
      nextLesson(
        later,
        { kind: 'task', populated: true },
        page({ kind: 'task', populated: true }),
        'first',
      ),
    ).toBe('compact');
  });
  it('does not introduce All just because a task was checked off today', () => {
    const p = { ...core, done: ['today', 'editor', 'more'] as const };
    expect(
      nextLesson(p, { ...today, populated: true }, page(today), 'first'),
    ).toBeNull();
    expect(
      nextLesson(p, { ...today, olderCompleted: true }, page(today), 'first'),
    ).toBe('all');
  });
  it('waits for a later visit for More, and prioritizes the relevant earlier lesson', () => {
    const p = { ...core, done: ['today', 'editor'] as const };
    expect(nextLesson(p, today, page(today), 'first')).toBeNull();
    expect(nextLesson(p, today, page(today), 'second')).toBe('more');
    expect(
      nextLesson(core, { ...today, populated: true }, page(today), 'second'),
    ).toBe('today');
  });
  it('requires a new field interaction for switch, then tokens', () => {
    expect(nextLesson(core, today, page(today), 'first')).toBeNull();
    expect(
      nextLesson(core, today, { kind: 'field', mode: 'add' }, 'first'),
    ).toBe('switch');
    expect(
      nextLesson(
        addFacts(core, ['switch']),
        today,
        { kind: 'field', mode: 'add' },
        'first',
      ),
    ).toBe('tokens');
  });
  it('enables contextual tips by default and skips lessons viewed in a tour', () => {
    expect(nextLesson(EMPTY_PROGRESS, today, page(today), 'first')).toBe(
      'capture',
    );
    const seen = resolveLesson(base, 'capture', 'first', false);
    expect(nextLesson(seen, today, page(today), 'second')).toBeNull();
  });
  it('bounds and validates persisted progress', () => {
    expect(readProgress('invalid')).toEqual(EMPTY_PROGRESS);
    expect(readProgress(JSON.stringify({ version: 99 }))).toEqual(
      EMPTY_PROGRESS,
    );
    expect(
      readProgress(
        JSON.stringify({
          version: 1,
          used: ['editor', 'private task text'],
          fullIndex: 999,
        }),
      ),
    ).toMatchObject({ used: ['editor'] });
  });
  it('records only token categories from English and Arabic successful input', () => {
    expect(tokenFacts('Personal title #خاص !٣ /اليوم /استحقاق:غدا')).toEqual([
      'token-tag',
      'token-priority',
      'token-today',
      'token-due',
    ]);
    expect(tokenFacts('Name /today #tag !3 /due:tomorrow')).toEqual([
      'token-today',
      'token-tag',
      'token-priority',
      'token-due',
    ]);
  });
});
