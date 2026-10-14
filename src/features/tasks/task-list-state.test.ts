import type { UseQueryResult } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import type { Task } from './contracts.ts';
import { deriveTaskListState } from './task-list-state.ts';
import { TududiApiError } from '../../infra/tududi-client.ts';

const NOW = new Date('2026-09-21T14:00:00');

const INVOICE: Task = {
  uid: 'task-invoice',
  title: 'Send the invoice',
  priority: 'high',
  status: 'planned',
  tags: [],
};

const BOILER: Task = {
  uid: 'task-boiler',
  title: 'Service the boiler',
  priority: 'low',
  status: 'done',
  tags: [],
  completedAt: new Date('2026-09-21T09:00:00').toISOString(),
};

const RETURN: Task = {
  uid: 'task-return',
  title: 'File the tax return',
  priority: 'high',
  status: 'done',
  tags: [],
  completedAt: new Date('2026-09-14T11:00:00').toISOString(),
};

function query(
  overrides: Partial<UseQueryResult<readonly Task[]>> = {},
): UseQueryResult<readonly Task[]> {
  return {
    isSuccess: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as UseQueryResult<readonly Task[]>;
}

function ready(tasks: readonly Task[]): UseQueryResult<readonly Task[]> {
  return query({ isSuccess: true, data: tasks });
}

const IDLE = query();

function unauthorized() {
  return new TududiApiError(401, 'unauthorized', 'Session expired');
}

describe('deriveTaskListState', () => {
  it('shows today with the day’s record under it', () => {
    expect(
      deriveTaskListState(
        false,
        ready([INVOICE]),
        ready([BOILER, RETURN]),
        NOW,
      ),
    ).toEqual({ kind: 'ready', list: 'today', tasks: [INVOICE, BOILER] });
  });

  /*
   * Today stays Today once nothing on it is open. The backlog has a page of
   * its own, and the screen saying it is clear points there.
   */
  it('keeps today on screen once it holds only finished tasks', () => {
    const ticked: Task = { ...INVOICE, status: 'done' };

    expect(deriveTaskListState(false, ready([ticked]), ready([]), NOW)).toEqual(
      { kind: 'ready', list: 'today', tasks: [ticked] },
    );
  });

  it('shows the day’s record under an empty today', () => {
    expect(deriveTaskListState(false, ready([]), ready([BOILER]), NOW)).toEqual(
      { kind: 'ready', list: 'today', tasks: [BOILER] },
    );
  });

  it('is a today with no rows when nothing is open and nothing was finished today', () => {
    expect(deriveTaskListState(false, ready([]), ready([RETURN]), NOW)).toEqual(
      { kind: 'ready', list: 'today', tasks: [] },
    );
  });

  it('loads until today answers', () => {
    expect(deriveTaskListState(false, IDLE, ready([]), NOW)).toEqual({
      kind: 'loading',
    });
  });

  /*
   * The record is the smaller half of the answer and the list is worth showing
   * without it. A tail that failed is a list with no tail.
   */
  it('shows the list when the record fails', () => {
    const failed = query({ isError: true, error: new Error('nope') });

    expect(deriveTaskListState(false, ready([INVOICE]), failed, NOW)).toEqual({
      kind: 'ready',
      list: 'today',
      tasks: [INVOICE],
    });
  });

  it('shows the list while the record is still loading', () => {
    expect(deriveTaskListState(false, ready([INVOICE]), IDLE, NOW)).toEqual({
      kind: 'ready',
      list: 'today',
      tasks: [INVOICE],
    });
  });

  it('offers the door when the record is the query that lost the session', () => {
    const expired = query({ isError: true, error: unauthorized() });

    expect(deriveTaskListState(false, ready([INVOICE]), expired, NOW)).toEqual({
      kind: 'session-expired',
    });
  });
});
