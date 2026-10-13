import { describe, expect, it } from 'vitest';

import {
  adaptBacklogTaskList,
  adaptDoneTaskList,
  adaptOpenSearchList,
  adaptProjectList,
  adaptTask,
  adaptTaskDetail,
  adaptTaskList,
  adaptTaskTotal,
  TududiShapeError,
} from './adapters.ts';
import { TASK_PAGE_LIMIT } from '../../../config/app.ts';

const rawTask = {
  id: 41,
  uid: 'task-41',
  name: 'Daily',
  original_name: 'Take vitamins',
  status: 6,
  priority: 2,
  note: 'server-only detail',
  recurrence_type: 'daily',
  tags: [
    { id: 2, uid: 'tag-health', name: 'Health', color: '#fff' },
    { id: 3, uid: 'tag-health-duplicate', name: 'health', color: '#000' },
  ],
  Project: { id: 9, uid: 'project-home', name: 'Home', status: 'planned' },
};

describe('Tududi adapters', () => {
  it('exposes only task fields rendered by only-tdy', () => {
    expect(adaptTask(rawTask)).toEqual({
      uid: 'task-41',
      title: 'Take vitamins',
      note: 'server-only detail',
      priority: 'high',
      status: 'planned',
      projectName: 'Home',
      tags: ['Health'],
    });
  });

  it('caps a list at the page limit even when Tududi ignores it', () => {
    const tasks = adaptTaskList({
      tasks: Array.from({ length: TASK_PAGE_LIMIT + 10 }, (_item, index) => ({
        ...rawTask,
        uid: `task-${String(index)}`,
      })),
    });

    expect(tasks).toHaveLength(TASK_PAGE_LIMIT);
    expect(tasks.at(-1)?.uid).toBe(`task-${String(TASK_PAGE_LIMIT - 1)}`);
  });

  it('accepts all active Today statuses and preserves server order', () => {
    const tasks = adaptTaskList({
      tasks: [
        { ...rawTask, uid: 'planned', status: 6 },
        { ...rawTask, uid: 'progress', status: 1 },
        { ...rawTask, uid: 'waiting', status: 4 },
        {
          ...rawTask,
          uid: 'recurring-instance',
          status: 0,
          recurring_parent_uid: 'recurring-parent',
        },
      ],
    });

    expect(tasks.map((task) => [task.uid, task.status])).toEqual([
      ['planned', 'planned'],
      ['progress', 'in_progress'],
      ['waiting', 'waiting'],
      ['recurring-instance', 'not_started'],
    ]);
  });

  it('retains only not-started Backlog tasks without reordering', () => {
    const tasks = adaptBacklogTaskList({
      tasks: [
        { ...rawTask, uid: 'newest', status: 0 },
        { ...rawTask, uid: 'progress', status: 1 },
        { ...rawTask, uid: 'older', status: 0 },
        { ...rawTask, uid: 'planned', status: 6 },
      ],
    });

    expect(tasks.map((task) => task.uid)).toEqual(['newest', 'older']);
  });

  it('narrows the project envelope', () => {
    expect(
      adaptProjectList({
        projects: [
          {
            id: 3,
            uid: 'project-3',
            name: 'Work',
            description: 'server-only detail',
          },
        ],
      }),
    ).toEqual([{ uid: 'project-3', name: 'Work' }]);
  });

  it('rejects a changed response envelope', () => {
    expect(() => adaptTaskList([rawTask])).toThrow(TududiShapeError);
    expect(() => adaptProjectList({ data: [] })).toThrow(TududiShapeError);
  });

  it('keeps only completed tasks in history, in the order Tududi sent them', () => {
    const tasks = adaptDoneTaskList({
      tasks: [
        { ...rawTask, uid: 'newest', status: 2 },
        // Archived and cancelled share the done filter server-side. only-tdy has
        // no name for either, so they are dropped rather than failing the list.
        { ...rawTask, uid: 'archived', status: 3 },
        { ...rawTask, uid: 'cancelled', status: 5 },
        { ...rawTask, uid: 'oldest', status: 'done' },
      ],
    });

    expect(tasks.map((task) => task.uid)).toEqual(['newest', 'oldest']);
    expect(tasks.every((task) => task.status === 'done')).toBe(true);
  });

  /*
   * `/api/search` has no status filter of any kind, so everything it can
   * answer with has to be turned away here. The archived and cancelled rows
   * matter most: only-tdy has no name for either, and adapting one would fail
   * the whole list rather than one row.
   */
  it('keeps only open tasks out of a search answer', () => {
    const tasks = adaptOpenSearchList({
      results: [
        { type: 'Task', ...rawTask, uid: 'waiting-bulb', status: 0 },
        {
          type: 'Task',
          ...rawTask,
          uid: 'named-status',
          status: 'not_started',
        },
        { type: 'Task', ...rawTask, uid: 'today', status: 6 },
        { type: 'Task', ...rawTask, uid: 'finished', status: 2 },
        { type: 'Task', ...rawTask, uid: 'archived', status: 3 },
        { type: 'Task', ...rawTask, uid: 'cancelled', status: 5 },
        { type: 'Project', uid: 'project-1', name: 'Work' },
        { type: 'Note', uid: 'note-1', name: 'Nothing to do with tasks' },
      ],
    });

    expect(tasks.map((task) => task.uid)).toEqual([
      'waiting-bulb',
      'named-status',
      'today',
    ]);
  });

  it('reads a list’s total from its pagination, or counts the rows', () => {
    expect(adaptTaskTotal({ tasks: [], pagination: { total: 12 } })).toBe(12);
    expect(adaptTaskTotal({ tasks: [rawTask, rawTask] })).toBe(2);
    expect(() => adaptTaskTotal({})).toThrow(TududiShapeError);
  });

  it('caps a search answer at the page limit and refuses a changed envelope', () => {
    const tasks = adaptOpenSearchList({
      results: Array.from({ length: TASK_PAGE_LIMIT + 5 }, (_item, index) => ({
        type: 'Task',
        ...rawTask,
        uid: `match-${String(index)}`,
        status: 0,
      })),
    });

    expect(tasks).toHaveLength(TASK_PAGE_LIMIT);
    expect(() => adaptOpenSearchList({ tasks: [] })).toThrow(TududiShapeError);
  });

  it('caps history at the page limit too', () => {
    const tasks = adaptDoneTaskList({
      tasks: Array.from({ length: TASK_PAGE_LIMIT + 5 }, (_item, index) => ({
        ...rawTask,
        uid: `done-${String(index)}`,
        status: 2,
      })),
    });

    expect(tasks).toHaveLength(TASK_PAGE_LIMIT);
  });
});

describe('adaptTaskDetail', () => {
  it('carries the four fields a row has no use for', () => {
    expect(
      adaptTaskDetail({
        ...rawTask,
        note: 'Buy the chewable ones.',
        due_date: '2026-10-01',
        defer_until: null,
        project_uid: 'project-9',
      }),
    ).toEqual({
      ...adaptTask(rawTask),
      note: 'Buy the chewable ones.',
      dueDate: '2026-10-01',
      deferUntil: '',
      projectUid: 'project-9',
    });
  });

  it('reads an absent field as empty rather than missing', () => {
    const withoutNote: Record<string, unknown> = { ...rawTask };
    delete withoutNote.note;
    const task = adaptTaskDetail(withoutNote);

    expect(task.note).toBe('');
    expect(task.dueDate).toBe('');
    expect(task.deferUntil).toBe('');
    expect(task.projectUid).toBe('');
  });

  it('still refuses a task only-tdy cannot represent', () => {
    expect(() => adaptTaskDetail({ ...rawTask, status: 3 })).toThrow(
      TududiShapeError,
    );
    expect(() => adaptTaskDetail({ ...rawTask, note: 7 })).toThrow(
      TududiShapeError,
    );
  });
});

describe('Hide until date conversion', () => {
  it('uses the account date rather than the browser date', () => {
    expect(
      adaptTaskDetail(
        { ...rawTask, defer_until: '2026-10-09T22:00:00Z' },
        'Europe/Amsterdam',
      ).deferUntil,
    ).toBe('2026-10-10');
    expect(
      adaptTaskDetail(
        { ...rawTask, defer_until: '2026-10-09T22:00:00Z' },
        'America/New_York',
      ).deferUntil,
    ).toBe('2026-10-09');
  });
  it('discards the time on a legacy Hide until value', () => {
    expect(
      adaptTaskDetail(
        { ...rawTask, defer_until: '2026-10-10T14:30:00Z' },
        'Europe/Amsterdam',
      ).deferUntil,
    ).toBe('2026-10-10');
  });
  it('leaves missing or unreadable values empty', () => {
    expect(adaptTaskDetail({ ...rawTask, defer_until: null }).deferUntil).toBe(
      '',
    );
    expect(
      adaptTaskDetail({ ...rawTask, defer_until: 'not a date' }).deferUntil,
    ).toBe('');
  });
});
