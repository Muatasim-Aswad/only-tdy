import { describe, expect, it } from 'vitest';
import {
  applyDateRules,
  currentDate,
  dateAtMidnight,
  resolveDate,
} from './task-dates.ts';
import { parseQuickEntry } from './quick-entry.ts';
import type { TaskEdit } from '../contracts.ts';

const context = {
  now: new Date('2026-10-10T10:00:00Z'),
  timezone: 'Europe/Amsterdam',
};
const edit: TaskEdit = {
  title: 'Task',
  note: '',
  status: 'not_started',
  priority: 'low',
  projectUid: '',
  tags: [],
  dueDate: '',
  deferUntil: '',
};

describe('date grammar', () => {
  it.each([
    ['15', '2026-10-15'],
    ['15-11', '2026-11-15'],
    ['15-11-2027', '2027-11-15'],
    ['tomorrow', '2026-10-11'],
    ['today', '2026-10-10'],
    ['+3', '2026-10-13'],
    ['+3d', '2026-10-13'],
    ['+3days', '2026-10-13'],
    ['5', '2026-10-05'],
    ['+25', '2026-11-04'],
  ])('resolves %s as %s', (value, expected) => {
    expect(resolveDate(value, context)).toBe(expected);
  });
  it.each([
    '31-02-2026',
    '0',
    '32',
    '15-13',
    '2026-10-15',
    '+-3',
    '15T09:00',
    '+999999999',
  ])('rejects %s', (value) => {
    expect(resolveDate(value, context)).toBeUndefined();
  });
  it('uses the account day across a UTC midnight', () => {
    expect(
      currentDate({
        now: new Date('2026-10-09T23:30:00Z'),
        timezone: 'Europe/Amsterdam',
      }),
    ).toBe('2026-10-10');
    expect(
      resolveDate('tomorrow', {
        now: new Date('2026-12-31T20:00:00Z'),
        timezone: 'Europe/Amsterdam',
      }),
    ).toBe('2027-01-01');
  });
  it.each([
    ['2026-10-10', '2026-10-09T22:00:00.000Z'],
    ['2026-10-26', '2026-10-25T23:00:00.000Z'],
    ['2026-03-30', '2026-03-29T22:00:00.000Z'],
  ])('stores %s at account midnight through DST', (date, instant) => {
    expect(dateAtMidnight(date, 'Europe/Amsterdam')).toBe(instant);
  });
  it('reads both dates while retaining ordinary capture metadata', () => {
    const result = parseQuickEntry(
      'Call +Home #errand !3 /due:15 /hide:+3',
      [{ uid: 'home', name: 'Home' }],
      context,
    );
    expect(result).toMatchObject({
      ok: true,
      draft: {
        title: 'Call',
        projectUid: 'home',
        priority: 'high',
        dueDate: '2026-10-15',
        deferUntil: '2026-10-13',
        status: 'not_started',
      },
    });
  });
  it('promotes due capture and clears hide in the same draft', () => {
    expect(parseQuickEntry('Task /due:5 /hide:+3', [], context)).toMatchObject({
      ok: true,
      draft: { status: 'planned', deferUntil: '' },
    });
  });
  it('rejects duplicate dates and hiding beyond a future deadline', () => {
    expect(parseQuickEntry('Task /due:15 /due:16', [], context).ok).toBe(false);
    expect(parseQuickEntry('Task /hide:15 /hide:16', [], context).ok).toBe(
      false,
    );
    expect(parseQuickEntry('Task /due:15 /hide:16', [], context).ok).toBe(
      false,
    );
  });
});

describe('save rules', () => {
  it('allows an explicit move from Backlog to Today with a future deadline', () => {
    expect(
      applyDateRules(
        { ...edit, status: 'planned', dueDate: '2026-10-15' },
        '',
        context,
        'not_started',
      ).status,
    ).toBe('planned');
  });
  it('promotes due backlog, but never completed tasks', () => {
    expect(
      applyDateRules(
        { ...edit, dueDate: '2026-10-10', deferUntil: '2026-10-15' },
        '',
        context,
      ),
    ).toMatchObject({ status: 'planned', deferUntil: '' });
    expect(
      applyDateRules(
        { ...edit, status: 'done', dueDate: '2026-10-01' },
        '',
        context,
      ).status,
    ).toBe('done');
  });
  it('returns Today to Backlog only when its date changes to the future', () => {
    const task = {
      ...edit,
      status: 'in_progress' as const,
      dueDate: '2026-10-15',
    };
    expect(applyDateRules(task, '2026-10-10', context).status).toBe(
      'not_started',
    );
    expect(applyDateRules(task, '2026-10-15', context).status).toBe(
      'in_progress',
    );
    expect(
      applyDateRules({ ...task, dueDate: '' }, '2026-10-15', context).status,
    ).toBe('in_progress');
  });
});
