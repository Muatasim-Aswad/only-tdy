import type { UseQueryResult } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import type { TaskDetail } from './contracts.ts';
import { deriveTaskDetailState } from './task-detail-state.ts';
import { TududiApiError } from '../../infra/tududi-client.ts';

const TASK: TaskDetail = {
  uid: 'task-1',
  title: 'Send the invoice',
  priority: 'high',
  status: 'in_progress',
  tags: ['finance'],
  note: '',
  dueDate: '',
  deferUntil: '',
  projectUid: '',
};

function query(
  overrides: Partial<UseQueryResult<TaskDetail>>,
): UseQueryResult<TaskDetail> {
  return {
    isSuccess: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as UseQueryResult<TaskDetail>;
}

function apiError(status: number) {
  return new TududiApiError(
    status,
    status === 401 ? 'unauthorized' : 'not-found',
    'nope',
  );
}

describe('deriveTaskDetailState', () => {
  it('holds the loading state until the task resolves', () => {
    expect(deriveTaskDetailState(false, query({}))).toEqual({
      kind: 'loading',
    });
  });

  it('hands over the task once it is there', () => {
    expect(
      deriveTaskDetailState(false, query({ isSuccess: true, data: TASK })),
    ).toEqual({ kind: 'ready', task: TASK });
  });

  it('calls a missing task missing rather than failed', () => {
    expect(
      deriveTaskDetailState(
        false,
        query({ isError: true, error: apiError(404) }),
      ),
    ).toEqual({ kind: 'not-found' });
  });

  it('reports anything else as an error, which is the one thing to retry', () => {
    expect(
      deriveTaskDetailState(
        false,
        query({ isError: true, error: new Error('offline') }),
      ),
    ).toEqual({ kind: 'error' });
  });

  it('puts an expired session ahead of every other answer', () => {
    expect(
      deriveTaskDetailState(
        false,
        query({ isError: true, error: apiError(401) }),
      ),
    ).toEqual({ kind: 'session-expired' });
    expect(
      deriveTaskDetailState(true, query({ isSuccess: true, data: TASK })),
    ).toEqual({ kind: 'session-expired' });
  });
});
