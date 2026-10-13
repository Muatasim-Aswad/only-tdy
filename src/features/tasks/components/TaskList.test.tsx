import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BACKLOG_TASKS, LIST_STATES, TODAY_TASKS } from './testing/fixtures.ts';
import { TaskList, type TaskListProps } from './TaskList.tsx';

function renderList(props: Partial<TaskListProps> = {}) {
  const onToggle = vi.fn<(uid: string) => void>();
  const onRetry = vi.fn<() => void>();
  render(
    <TaskList
      state={LIST_STATES.today}
      onToggle={onToggle}
      onRetry={onRetry}
      {...props}
    />,
  );
  return { onToggle, onRetry };
}

describe('TaskList', () => {
  it('announces its changes politely rather than interrupting', () => {
    renderList();

    expect(document.querySelector('.focus-listing')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('shows one quiet line while tasks load', () => {
    renderList({ state: LIST_STATES.loading });

    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('invites capture when both lists are empty', () => {
    renderList({ state: LIST_STATES.empty });

    expect(
      screen.getByText('Nothing waiting. Capture the next thing above.'),
    ).toBeInTheDocument();
  });

  it('offers a retry when loading failed', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderList({ state: LIST_STATES.error });

    expect(screen.getByText(/Tasks couldn’t load\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('replaces the list when the session expired', () => {
    renderList({ state: LIST_STATES.sessionExpired });

    expect(
      screen.getByText(/Your Tududi session expired\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open Tududi to sign in' }),
    ).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('shows Today in Tududi order', () => {
    renderList({ state: LIST_STATES.today });

    const titles = screen
      .getAllByRole('listitem')
      .map((row) => row.querySelector('.focus-row__title')?.textContent);
    expect(titles).toEqual(TODAY_TASKS.map((task) => task.title));
  });

  it('shows Backlog with the same row and no extra action', () => {
    renderList({ state: LIST_STATES.backlog });

    expect(screen.getAllByRole('listitem')).toHaveLength(BACKLOG_TASKS.length);
    expect(screen.queryByRole('button', { name: /today/i })).toBeNull();

    // Every row still offers exactly one control, and it is completion.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(BACKLOG_TASKS.length);
    for (const button of buttons) {
      expect(button).toHaveAccessibleName(/^Complete/);
    }
  });

  it('leaves the rows unruled unless the page asks', () => {
    renderList({ state: LIST_STATES.today });

    expect(screen.getByRole('list')).not.toHaveClass('focus-list--ruled');
  });

  it('rules the gaps between rows when the page asks', () => {
    renderList({ state: LIST_STATES.backlog, ruled: true });

    expect(screen.getByRole('list')).toHaveClass('focus-list--ruled');
  });

  it('never shows both lists at once, and titles neither', () => {
    renderList({ state: LIST_STATES.today });

    expect(screen.getAllByRole('list')).toHaveLength(1);
    // No section title and no count: the rows are the whole of the list.
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByText(String(TODAY_TASKS.length))).toBeNull();
  });

  it('completes the row that was pressed', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderList({ state: LIST_STATES.backlog });

    const target = BACKLOG_TASKS[1];
    if (target === undefined) {
      throw new Error('fixture changed');
    }
    await user.click(
      screen.getByRole('button', {
        name: `Complete “${target.title}”`,
      }),
    );

    expect(onToggle).toHaveBeenCalledExactlyOnceWith(target.uid);
  });

  it('disables every completion at once when offline', () => {
    renderList({ state: LIST_STATES.today, disabled: true });

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });

  it('applies motion and errors to the row they belong to', () => {
    const first = TODAY_TASKS[0];
    if (first === undefined) {
      throw new Error('fixture changed');
    }
    renderList({
      state: LIST_STATES.today,
      rowMotion: { [first.uid]: 'restoring' },
      rowErrors: { [first.uid]: 'Task wasn’t completed. Try again.' },
    });

    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveClass('focus-row--restoring');
    expect(rows[1]).not.toHaveClass('focus-row--restoring');
    expect(
      screen.getAllByText('Task wasn’t completed. Try again.'),
    ).toHaveLength(1);
  });
});
