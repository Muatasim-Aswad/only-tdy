import { describe, expect, it } from 'vitest';

import type { Task } from '../contracts.ts';
import { orderTasks } from './task-order.ts';

function task(
  uid: string,
  status: Task['status'],
  extra: Partial<Task> = {},
): Task {
  return { uid, title: uid, priority: 'low', status, tags: [], ...extra };
}

describe('orderTasks', () => {
  it('sinks done tasks below everything still open', () => {
    const ordered = orderTasks([
      task('a', 'done'),
      task('b', 'planned'),
      task('c', 'done'),
      task('d', 'not_started'),
    ]);

    expect(ordered.map((item) => item.uid)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('keeps Tududi order within each group', () => {
    const ordered = orderTasks([
      task('first', 'in_progress'),
      task('second', 'waiting'),
      task('third', 'done'),
    ]);

    expect(ordered.map((item) => item.uid)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('returns the same array when there is nothing to move', () => {
    const open = [task('a', 'planned'), task('b', 'planned')];
    const done = [task('c', 'done')];

    // Identity matters: an unchanged list must not re-render every row.
    expect(orderTasks(open)).toBe(open);
    expect(orderTasks(done)).toBe(done);
    expect(orderTasks([])).toEqual([]);
  });

  it('reads open tasks by priority, then #urgent, then oldest first', () => {
    const ordered = orderTasks([
      task('low-old', 'planned', { createdAt: '2026-01-01T00:00:00Z' }),
      task('medium-new', 'planned', {
        priority: 'medium',
        createdAt: '2026-09-01T00:00:00Z',
      }),
      task('medium-old', 'planned', {
        priority: 'medium',
        createdAt: '2026-02-01T00:00:00Z',
      }),
      task('medium-urgent', 'planned', {
        priority: 'medium',
        tags: ['Urgent'],
        createdAt: '2026-09-02T00:00:00Z',
      }),
      task('high', 'planned', { priority: 'high' }),
      task('done-high', 'done', { priority: 'high' }),
    ]);

    expect(ordered.map((item) => item.uid)).toEqual([
      'high',
      'medium-urgent',
      'medium-old',
      'medium-new',
      'low-old',
      'done-high',
    ]);
  });

  it('keeps Tududi order between tasks it cannot tell apart', () => {
    const ordered = orderTasks([task('a', 'planned'), task('b', 'planned')]);

    expect(ordered.map((item) => item.uid)).toEqual(['a', 'b']);
  });
});
