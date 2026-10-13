import { describe, expect, it } from 'vitest';

import type { Task } from '../contracts.ts';
import {
  completedToday,
  startOfDay,
  withCompletedToday,
} from './done-today.ts';

const NOW = new Date('2026-09-21T14:00:00');

function open(uid: string): Task {
  return {
    uid,
    title: uid,
    status: 'not_started',
    priority: 'low',
    tags: [],
  };
}

function done(uid: string, completedAt?: string): Task {
  return {
    uid,
    title: uid,
    status: 'done',
    priority: 'low',
    tags: [],
    ...(completedAt === undefined ? {} : { completedAt }),
  };
}

/** A local wall clock as the ISO instant Tududi would have sent for it. */
function at(local: string): string {
  return new Date(local).toISOString();
}

describe('startOfDay', () => {
  it('is midnight this morning, by the reader’s own clock', () => {
    expect(startOfDay(NOW)).toBe(new Date('2026-09-21T00:00:00').getTime());
  });
});

describe('completedToday', () => {
  it('keeps what was finished since midnight and drops the rest', () => {
    const tasks = [
      done('this-morning', at('2026-09-21T09:15:00')),
      done('one-minute-past', at('2026-09-21T00:01:00')),
      done('last-night', at('2026-09-20T23:40:00')),
      done('last-week', at('2026-09-14T11:00:00')),
    ];

    expect(completedToday(tasks, NOW).map((task) => task.uid)).toEqual([
      'this-morning',
      'one-minute-past',
    ]);
  });

  it('is a day rather than a rolling window', () => {
    // Twenty hours ago, and so inside a rolling day but outside this one.
    const tasks = [done('yesterday-evening', at('2026-09-20T18:00:00'))];
    expect(completedToday(tasks, NOW)).toEqual([]);
  });

  it('refuses a record row that does not say when it was finished', () => {
    // The record reaches back as far as the page limit allows, so no time
    // means unknown age, not a moment ago.
    expect(completedToday([done('no-time')], NOW)).toEqual([]);
  });

  it('refuses anything that is not done, whatever time it carries', () => {
    const reopened: Task = {
      ...open('reopened'),
      completedAt: at('2026-09-21T09:00:00'),
    };
    expect(completedToday([reopened], NOW)).toEqual([]);
  });
});

describe('withCompletedToday', () => {
  it('puts the day’s record under what is still open', () => {
    const listed = [open('first'), open('second')];
    const completed = [done('finished', at('2026-09-21T09:00:00'))];

    expect(
      withCompletedToday(listed, completed, NOW).map((task) => task.uid),
    ).toEqual(['first', 'second', 'finished']);
  });

  it('reads oldest tick first, so the newest sits at the bottom', () => {
    const completed = [
      done('third', at('2026-09-21T13:00:00')),
      done('second', at('2026-09-21T11:00:00')),
      done('first', at('2026-09-21T08:00:00')),
    ];

    expect(
      withCompletedToday([], completed, NOW).map((task) => task.uid),
    ).toEqual(['first', 'second', 'third']);
  });

  it('shows a task ticked a moment ago once, not twice', () => {
    // The open list still holds the row only-tdy ticked; the record now reports
    // the same task. One row, and it is the listed one.
    const listed = [open('other'), done('just-ticked')];
    const completed = [done('just-ticked', at('2026-09-21T13:59:00'))];

    const merged = withCompletedToday(listed, completed, NOW);
    expect(merged.map((task) => task.uid)).toEqual(['other', 'just-ticked']);
    expect(merged[1]).toBe(listed[1]);
  });

  it('puts a tick with no time of its own last', () => {
    const listed = [done('just-ticked')];
    const completed = [done('this-morning', at('2026-09-21T09:00:00'))];

    expect(
      withCompletedToday(listed, completed, NOW).map((task) => task.uid),
    ).toEqual(['this-morning', 'just-ticked']);
  });

  it('keeps a row ticked before midnight rather than taking it off the screen', () => {
    // Ticked at one minute to midnight and still on screen a minute later:
    // the listed copy is kept whatever the cut says.
    const listed = [done('ticked-last-night', at('2026-09-20T23:59:00'))];

    expect(
      withCompletedToday(listed, [], new Date('2026-09-21T00:00:30')).map(
        (task) => task.uid,
      ),
    ).toEqual(['ticked-last-night']);
  });

  it('is the list itself when nothing was finished today', () => {
    const listed = [open('first')];
    const completed = [done('last-week', at('2026-09-14T11:00:00'))];

    expect(withCompletedToday(listed, completed, NOW)).toBe(listed);
  });
});
