import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { TaskDetail, TaskDetailState, TaskEdit } from '../contracts.ts';

import {
  TaskDetailScreen,
  type TaskDetailScreenProps,
} from './TaskDetailScreen.tsx';

const TASK: TaskDetail = {
  uid: 'task-invoice',
  title: 'Send the invoice',
  priority: 'high',
  status: 'in_progress',
  tags: [],
  note: '',
  dueDate: '',
  deferUntil: '',
  projectUid: '',
};

function renderScreen(props: Partial<TaskDetailScreenProps> = {}) {
  const onRetry = vi.fn<() => void>();
  const onDelete = vi.fn<() => void>();
  const onSave = vi.fn<(edit: TaskEdit) => Promise<TaskDetail | undefined>>(
    (edit) => Promise.resolve({ ...TASK, ...edit }),
  );
  render(
    <TaskDetailScreen
      state={{ kind: 'ready', task: TASK }}
      projects={[]}
      backHref="/only-tdy/"
      onSave={onSave}
      onDelete={onDelete}
      onRetry={onRetry}
      feedback={{ kind: 'none' }}
      {...props}
    />,
  );
  return { onRetry, onDelete, onSave };
}

describe('TaskDetailScreen', () => {
  it('is a page, with no overlay anywhere in it', () => {
    renderScreen();

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('[aria-modal]')).toBeNull();
  });

  /*
   * The one page that opens with the way out. It ends in Save alone, and a
   * way to leave does not belong in a row with the verb that keeps the task.
   */
  it('opens with the way back, above the first field', () => {
    renderScreen();

    const back = screen.getByRole('link', { name: 'Back to the list' });
    expect(back).toHaveAttribute('href', '/only-tdy/');
    expect(back).toHaveClass('focus-back');

    const shell = document.querySelector('.focus-shell');
    const head = document.querySelector('.focus-head');
    expect(shell?.firstElementChild).toBe(head);
    expect(head?.firstElementChild).toBe(back);
    expect(document.querySelector('.focus-footer a')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Open Tududi' })).toBeNull();
  });

  it('asks to delete at the head of the page', () => {
    renderScreen();

    const head = document.querySelector('.focus-head');
    const del = screen.getByRole('button', { name: 'Delete' });
    expect(head?.contains(del)).toBe(true);
  });

  /* Once a field changes, Save takes Delete's place at the head and Delete
     leaves; saving brings Delete back. */
  it('swaps Delete for Save at the head while there is an unsaved edit', async () => {
    const user = userEvent.setup();
    const { onSave } = renderScreen();

    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();

    await user.type(screen.getByRole('combobox', { name: 'Title' }), ' now');

    const head = document.querySelector('.focus-head');
    const save = screen.getByRole('button', { name: 'Save' });
    expect(head?.contains(save)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();

    await user.click(save);

    expect(onSave).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('offers nothing to delete until there is a task to delete', () => {
    renderScreen({ state: { kind: 'loading' } });

    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('deletes on the second press, never the first', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderScreen();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('stops the delete offline, where nothing can be written', () => {
    renderScreen({ disabled: true, feedback: { kind: 'offline' } });

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('offers a compact layout toggle at the foot', () => {
    renderScreen();

    const toggle = screen.getByRole('button', { name: 'Compact form' });
    expect(toggle.closest('footer')?.parentElement).toBe(
      screen.getByRole('main'),
    );
    expect(toggle.closest('form')).toBeNull();
  });

  it('sends a done task back to the record instead of the open list', () => {
    renderScreen({ backHref: '/only-tdy/history' });

    expect(
      screen.getByRole('link', { name: 'Back to the list' }),
    ).toHaveAttribute('href', '/only-tdy/history');
  });

  it('holds its space while the task loads', () => {
    renderScreen({ state: { kind: 'loading' } });

    expect(screen.getByText('Loading the task…')).toBeInTheDocument();
    expect(document.querySelector('.focus-listing')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('offers a list rather than a retry for a task that is gone', () => {
    renderScreen({ state: { kind: 'not-found' }, backHref: '/only-tdy/' });

    expect(screen.getByText('That task is gone.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(
      screen.getAllByRole('link', { name: 'Back to the list' }),
    ).toHaveLength(2);
  });

  it('offers a retry for a failure, which is the one thing worth repeating', () => {
    const { onRetry } = renderScreen({ state: { kind: 'error' } });

    screen.getByRole('button', { name: 'Try again' }).click();

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('replaces the task with the way back in for an expired session', () => {
    renderScreen({ state: { kind: 'session-expired' } });

    expect(
      screen.getByText('Your Tududi session expired.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open Tududi to sign in' }),
    ).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull();
  });

  it('starts a different task from its own values', () => {
    const first: TaskDetailState = { kind: 'ready', task: TASK };
    const second: TaskDetailState = {
      kind: 'ready',
      task: { ...TASK, uid: 'task-bulb', title: 'Bulb' },
    };
    const { rerender } = render(
      <TaskDetailScreen
        state={first}
        projects={[]}
        backHref="/only-tdy/"
        onSave={() => Promise.resolve(undefined)}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
        feedback={{ kind: 'none' }}
      />,
    );
    rerender(
      <TaskDetailScreen
        state={second}
        projects={[]}
        backHref="/only-tdy/"
        onSave={() => Promise.resolve(undefined)}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
        feedback={{ kind: 'none' }}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Title' })).toHaveValue('Bulb');
  });
});
