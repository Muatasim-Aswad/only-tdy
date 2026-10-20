import { describe, expect, it } from 'vitest';
import type { Task } from '../contracts.ts';
import { DEFAULT_PREFERENCES } from '../preferences/model.ts';
import { visibleBacklogTasks } from './backlog-visibility.ts';

const context = {
  timezone: 'Europe/Amsterdam',
  now: new Date('2026-10-24T22:30:00Z'),
};
const task = (uid: string, dueDate?: string, deferUntil?: string): Task => ({
  uid,
  title: uid,
  status: 'not_started',
  priority: 'low',
  tags: [],
  ...(dueDate === undefined ? {} : { dueDate }),
  ...(deferUntil === undefined ? {} : { deferUntil }),
});
const rows = [
  task('undated'),
  task('overdue', '2026-10-24'),
  task('due', '2026-10-25'),
  task('tomorrow', '2026-10-26'),
  task('later', '2026-10-27'),
];

describe('dated Backlog visibility', () => {
  it('keeps all dates visible by default', () => {
    expect(visibleBacklogTasks(rows, DEFAULT_PREFERENCES, context)).toEqual(
      rows,
    );
  });

  it('shows tasks one calendar day before due across daylight-saving changes', () => {
    expect(
      visibleBacklogTasks(
        rows,
        { ...DEFAULT_PREFERENCES, datedBacklog: 'before' },
        context,
      ).map((row) => row.uid),
    ).toEqual(['undated', 'overdue', 'due', 'tomorrow']);
  });

  it('uses the chosen number of days', () => {
    expect(
      visibleBacklogTasks(
        rows,
        { ...DEFAULT_PREFERENCES, datedBacklog: 'before', daysBeforeDue: 2 },
        context,
      ),
    ).toEqual(rows);
  });

  it('keeps due and overdue tasks visible when promotion is disabled', () => {
    expect(
      visibleBacklogTasks(
        rows,
        {
          ...DEFAULT_PREFERENCES,
          datedBacklog: 'due',
          autoDuePromotion: false,
        },
        context,
      ).map((row) => row.uid),
    ).toEqual(['undated', 'overdue', 'due']);
  });

  it('lets explicit Hide until dates override the automatic window', () => {
    const explicit = [
      task('released', '2026-11-30', '2026-10-25'),
      task('hidden', '2026-10-26', '2026-10-26'),
    ];
    expect(
      visibleBacklogTasks(
        explicit,
        { ...DEFAULT_PREFERENCES, datedBacklog: 'due' },
        context,
      ).map((row) => row.uid),
    ).toEqual(['released']);
  });

  it('does not hide tasks already on Today', () => {
    const planned: Task = {
      ...task('planned', '2026-11-30'),
      status: 'planned',
    };
    expect(
      visibleBacklogTasks(
        [planned],
        { ...DEFAULT_PREFERENCES, datedBacklog: 'due' },
        context,
      ),
    ).toEqual([planned]);
  });
});
