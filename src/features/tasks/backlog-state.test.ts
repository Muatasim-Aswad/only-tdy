import type { UseQueryResult } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  deriveBacklogListState,
  orderBySelection,
  splitBacklogSearch,
} from './backlog-state.ts';
import type { SearchRequest, Task } from './contracts.ts';
import { TududiApiError } from '../../infra/tududi-client.ts';

const BULB: Task = {
  uid: 'task-bulb',
  title: 'Replace the hallway bulb',
  priority: 'low',
  status: 'not_started',
  tags: [],
};

const TAPS: Task = {
  uid: 'task-taps',
  title: 'Descale the taps',
  priority: 'low',
  status: 'not_started',
  tags: [],
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

const IDLE = query();
const NONE: SearchRequest = { kind: 'none' };
const TAG: SearchRequest = { kind: 'tag', name: 'home' };

function unauthorized() {
  return new TududiApiError(401, 'unauthorized', 'Session expired');
}

describe('deriveBacklogListState', () => {
  it('shows the whole backlog while no term is in force', () => {
    const backlog = query({ isSuccess: true, data: [BULB, TAPS] });

    expect(deriveBacklogListState(false, NONE, backlog, IDLE)).toEqual({
      kind: 'ready',
      list: 'backlog',
      tasks: [BULB, TAPS],
    });
  });

  /*
   * The two queries have separate caches, so the unfiltered backlog is still
   * loaded while a term is on screen. Reading the wrong one would show the
   * whole backlog as though it had matched.
   */
  it('reads the narrowed list, not the loaded one, once a term is in force', () => {
    const backlog = query({ isSuccess: true, data: [BULB, TAPS] });
    const search = query({ isSuccess: true, data: [TAPS] });

    expect(deriveBacklogListState(false, TAG, backlog, search)).toEqual({
      kind: 'ready',
      list: 'backlog',
      tasks: [TAPS],
    });
  });

  it('is still loading while a project name is being looked up', () => {
    const loaded = query({ isSuccess: true, data: [BULB] });

    expect(
      deriveBacklogListState(false, { kind: 'pending' }, loaded, loaded),
    ).toEqual({ kind: 'loading' });
  });

  it('shows nothing, not everything, for a name that matches no project', () => {
    const loaded = query({ isSuccess: true, data: [BULB, TAPS] });

    expect(
      deriveBacklogListState(
        false,
        { kind: 'refused', message: 'No project named “Hous”.' },
        loaded,
        loaded,
      ),
    ).toEqual({ kind: 'empty' });
  });

  it('separates a list that resolved empty from one still resolving', () => {
    expect(
      deriveBacklogListState(
        false,
        NONE,
        query({ isSuccess: true, data: [] }),
        IDLE,
      ),
    ).toEqual({ kind: 'empty' });
    expect(deriveBacklogListState(false, NONE, IDLE, IDLE)).toEqual({
      kind: 'loading',
    });
  });

  it('reports a failure against whichever list was asked for', () => {
    const failed = query({ isError: true, error: new Error('nope') });

    expect(deriveBacklogListState(false, NONE, failed, IDLE)).toEqual({
      kind: 'error',
    });
    expect(deriveBacklogListState(false, TAG, IDLE, failed)).toEqual({
      kind: 'error',
    });
  });

  it('answers an expired session the same way every other screen does', () => {
    const expired = query({ isError: true, error: unauthorized() });

    expect(deriveBacklogListState(false, NONE, expired, IDLE)).toEqual({
      kind: 'session-expired',
    });
    expect(deriveBacklogListState(true, NONE, IDLE, IDLE)).toEqual({
      kind: 'session-expired',
    });
  });
});

describe('orderBySelection', () => {
  const NAILS: Task = {
    ...BULB,
    uid: 'task-nails',
    title: 'Buy picture nails',
  };

  it('lifts the chosen rows and keeps the list’s own order inside each half', () => {
    expect(
      orderBySelection([BULB, TAPS, NAILS], new Set(['task-nails'])),
    ).toEqual([NAILS, BULB, TAPS]);
    expect(
      orderBySelection(
        [BULB, TAPS, NAILS],
        new Set(['task-nails', 'task-bulb']),
      ),
    ).toEqual([BULB, NAILS, TAPS]);
  });

  it('returns the list untouched when lifting would change nothing', () => {
    const list = [BULB, TAPS];

    expect(orderBySelection(list, new Set())).toBe(list);
    expect(orderBySelection(list, new Set(['task-gone']))).toBe(list);
    expect(orderBySelection(list, new Set(['task-bulb', 'task-taps']))).toBe(
      list,
    );
  });
});

describe('splitBacklogSearch', () => {
  it('lifts Today’s matches out of the backlog’s, most pressing first', () => {
    const planned: Task = { ...TAPS, uid: 'task-planned', status: 'planned' };
    const urgent: Task = {
      ...TAPS,
      uid: 'task-urgent',
      status: 'in_progress',
      priority: 'high',
    };
    const split = splitBacklogSearch({
      kind: 'ready',
      list: 'backlog',
      tasks: [BULB, planned, urgent],
    });

    expect(split.backlog).toEqual({
      kind: 'ready',
      list: 'backlog',
      tasks: [BULB],
    });
    expect(split.today.map((task) => task.uid)).toEqual([
      'task-urgent',
      'task-planned',
    ]);
  });

  it('leaves the backlog empty, not missing, when only Today matched', () => {
    const planned: Task = { ...TAPS, status: 'planned' };
    const split = splitBacklogSearch({
      kind: 'ready',
      list: 'backlog',
      tasks: [planned],
    });

    expect(split.backlog).toEqual({ kind: 'empty' });
    expect(split.today).toEqual([planned]);
  });
});
