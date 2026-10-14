import { describe, expect, it, vi } from 'vitest';
import { promoteDueTasks } from './task-sync.ts';
import { currentDate } from '../domain/task-dates.ts';
import type { Task } from '../contracts.ts';

const today = currentDate({ timezone: 'UTC' });
const task = (
  uid: string,
  dueDate: string,
  status: Task['status'] = 'not_started',
): Task => ({ uid, title: uid, priority: 'low', tags: [], status, dueDate });

describe('due synchronization', () => {
  it('reads the complete due prefix before writing and stops at the future boundary', async () => {
    const order: string[] = [];
    const page = vi.fn((offset: number) => {
      order.push(`read:${String(offset)}`);
      return Promise.resolve(
        offset === 0
          ? {
              tasks: [
                task('old', '2000-01-01'),
                task('on-today', today, 'planned'),
              ],
              hasMore: true,
            }
          : {
              tasks: [task('due', today), task('future', '9999-12-31')],
              hasMore: true,
            },
      );
    });
    const move = vi.fn((item: Task) => {
      order.push(`move:${item.uid}`);
      return Promise.resolve({ ...item, status: 'planned' as const });
    });
    expect(
      (await promoteDueTasks(page, move, 'UTC')).map((item) => item.uid),
    ).toEqual(['old', 'due']);
    expect(order.slice(0, 2)).toEqual(['read:0', 'read:2']);
    expect(page).toHaveBeenCalledTimes(2);
  });
  it('makes one read and no writes for undated or future tasks', async () => {
    const page = vi.fn(() =>
      Promise.resolve({
        tasks: [task('future', '9999-12-31'), task('none', '')],
        hasMore: true,
      }),
    );
    const move = vi.fn();
    expect(await promoteDueTasks(page, move, 'UTC')).toEqual([]);
    expect(page).toHaveBeenCalledTimes(1);
    expect(move).not.toHaveBeenCalled();
  });
  it('does not let a future hide date prevent due promotion', async () => {
    const move = vi.fn((item: Task) =>
      Promise.resolve({ ...item, status: 'planned' as const, deferUntil: '' }),
    );
    await promoteDueTasks(
      () =>
        Promise.resolve({
          tasks: [{ ...task('hidden', today), deferUntil: '9999-12-31' }],
          hasMore: false,
        }),
      move,
      'UTC',
    );
    expect(move).toHaveBeenCalledTimes(1);
  });
  it('refuses overlapping pages before making any writes', async () => {
    const move = vi.fn();
    await expect(
      promoteDueTasks(
        () => Promise.resolve({ tasks: [task('same', today)], hasMore: true }),
        move,
        'UTC',
      ),
    ).rejects.toThrow('overlapping');
    expect(move).not.toHaveBeenCalled();
  });
  it('awaits the whole write batch and reports a failure for retry', async () => {
    const finished: string[] = [];
    await expect(
      promoteDueTasks(
        () =>
          Promise.resolve({
            tasks: [task('fails', today), task('works', today)],
            hasMore: false,
          }),
        (item) => {
          if (item.uid === 'fails')
            return Promise.reject(new Error('Write refused'));
          finished.push(item.uid);
          return Promise.resolve(item);
        },
        'UTC',
      ),
    ).rejects.toThrow('Write refused');
    expect(finished).toEqual(['works']);
  });
});
