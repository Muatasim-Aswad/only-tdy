import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { MouseEvent } from 'react';

import type { Task } from '../contracts.ts';

import {
  DONE_TASK,
  MANY_TAGS_TASK,
  MEDIUM_TASK,
  PROJECT_TASK,
  SHORT_TASK,
} from './testing/fixtures.ts';
import { TaskRow, type TaskRowProps } from './TaskRow.tsx';

function renderRow(task: Task, props: Partial<TaskRowProps> = {}) {
  const onToggle = vi.fn<(uid: string) => void>();
  render(
    <ul>
      <TaskRow task={task} onToggle={onToggle} {...props} />
    </ul>,
  );
  return { onToggle };
}

describe('TaskRow', () => {
  it('names the completion control after the task it completes', () => {
    renderRow(PROJECT_TASK);

    expect(
      screen.getByRole('button', {
        name: 'Complete “Send the invoice”',
      }),
    ).toBeInTheDocument();
  });

  it('reports the toggled task by uid', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderRow(PROJECT_TASK);

    await user.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledExactlyOnceWith(PROJECT_TASK.uid);
  });

  it('completes from the keyboard alone', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderRow(SHORT_TASK);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onToggle).toHaveBeenCalledExactlyOnceWith(SHORT_TASK.uid);
  });

  it('disables completion without hiding it', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderRow(SHORT_TASK, { disabled: true });

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await user.click(button);

    expect(onToggle).not.toHaveBeenCalled();
  });

  it('announces high priority and colours the box with it', () => {
    renderRow(PROJECT_TASK);

    expect(screen.getByText('High priority')).toBeInTheDocument();
    expect(document.querySelector('.focus-complete__box--high')).not.toBeNull();
  });

  it('announces medium priority and colours the box with it', () => {
    renderRow(MEDIUM_TASK);

    expect(screen.getByText('Medium priority')).toBeInTheDocument();
    expect(
      document.querySelector('.focus-complete__box--medium'),
    ).not.toBeNull();
  });

  it('gives low priority a plain box and nothing to announce', () => {
    renderRow(SHORT_TASK);

    const box = document.querySelector('.focus-complete__box');
    expect(box).not.toBeNull();
    expect(box?.className).toBe('focus-complete__box');
    for (const word of ['low', 'Low priority', '!3']) {
      expect(screen.queryByText(word)).toBeNull();
    }
  });

  it('carries priority on the row rather than in a mark beside it', () => {
    renderRow(PROJECT_TASK);

    expect(document.querySelector('.focus-priority')).toBeNull();
  });

  it('never prints a priority token or a status name', () => {
    renderRow(PROJECT_TASK);

    const row = document.querySelector('.focus-row');
    expect(row?.textContent).not.toMatch(/!1|!2|!3|in_progress|not_started/);
  });

  it('lists at most two tags and counts the rest', () => {
    renderRow(MANY_TAGS_TASK);

    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('#flights')).toBeInTheDocument();
    expect(screen.getByText('#budget')).toBeInTheDocument();
    expect(screen.queryByText('#visas')).toBeNull();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('omits the metadata line when there is nothing to say', () => {
    renderRow(SHORT_TASK);

    expect(document.querySelector('.focus-row__meta')).toBeNull();
    expect(document.querySelector('.focus-row--metadata')).toBeNull();
  });

  it('opens the task from its title and offers nothing else in the body', () => {
    renderRow(PROJECT_TASK);

    // Two targets: the box that ticks it, and the title that opens it.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(
      screen.getByRole('link', { name: 'Send the invoice' }),
    ).toHaveAttribute('href', '/only-tdy/task/task-project');
    // The metadata and the empty space around it stay inert.
    expect(screen.getByText('Work').closest('a')).toBeNull();
    expect(screen.getByText('#finance').closest('a')).toBeNull();
  });

  it('reports the opened task by uid without leaving the app', async () => {
    const user = userEvent.setup();
    // The real handler takes the click so the app is not reloaded to reach a
    // page it is already running.
    const onOpen = vi.fn((event: MouseEvent, uid: string) => {
      event.preventDefault();
      return uid;
    });
    renderRow(SHORT_TASK, { onOpen });

    await user.click(screen.getByRole('link', { name: 'Put bins out' }));

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen.mock.calls[0]?.[1]).toBe(SHORT_TASK.uid);
  });

  it('reaches the title from the keyboard, after the box', async () => {
    const user = userEvent.setup();
    renderRow(SHORT_TASK);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Put bins out' })).toHaveFocus();
  });

  it('percent-encodes a uid so the address stays one segment', () => {
    renderRow({ ...SHORT_TASK, uid: 'a/b c' });

    expect(screen.getByRole('link', { name: 'Put bins out' })).toHaveAttribute(
      'href',
      '/only-tdy/task/a%2Fb%20c',
    );
  });

  it('carries no Today action in Backlog', () => {
    renderRow({ ...SHORT_TASK, status: 'not_started' });

    expect(screen.queryByRole('button', { name: /today/i })).toBeNull();
    expect(
      screen.getByRole('button', { name: /^Complete/ }),
    ).toBeInTheDocument();
  });

  it('keeps a done task on screen, ticked and struck through', () => {
    renderRow(DONE_TASK);

    const row = document.querySelector('.focus-row');
    expect(row).toHaveClass('focus-row--done');
    expect(screen.getByText(DONE_TASK.title)).toBeInTheDocument();
  });

  it('unticks a done task from the same box that ticked it', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderRow(DONE_TASK);

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName('Reopen “Send the invoice”');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toBeEnabled();

    await user.click(button);

    expect(onToggle).toHaveBeenCalledExactlyOnceWith(DONE_TASK.uid);
  });

  it('marks the row with the class for each motion state', () => {
    const cases = [
      ['inserted', 'focus-row--inserted'],
      ['restoring', 'focus-row--restoring'],
    ] as const;

    for (const [motion, className] of cases) {
      const { unmount } = render(
        <ul>
          <TaskRow task={SHORT_TASK} onToggle={vi.fn()} motion={motion} />
        </ul>,
      );
      expect(document.querySelector('.focus-row')).toHaveClass(className);
      unmount();
    }
  });

  it('floats a completion failure while restoring its row', () => {
    renderRow(PROJECT_TASK, {
      motion: 'restoring',
      errorMessage: 'Task wasn’t completed. Try again.',
    });

    expect(document.querySelector('.focus-row')).toHaveClass(
      'focus-row--restoring',
    );
    expect(
      screen.getByText('Task wasn’t completed. Try again.'),
    ).toBeInTheDocument();
  });

  it('turns the box into a choice where choosing is what the page is for', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderRow(SHORT_TASK, { mode: 'select' });

    const button = screen.getByRole('button', {
      name: 'Add “Put bins out” to Today',
    });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    // Completion is not offered here; it belongs to Today and to the task page.
    expect(screen.queryByRole('button', { name: /^Complete “/ })).toBeNull();

    await user.click(button);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(SHORT_TASK.uid);
  });

  it('marks a chosen row and says what taking the choice back would do', () => {
    renderRow(SHORT_TASK, { mode: 'select', selected: true });

    expect(document.querySelector('.focus-row')).toHaveClass(
      'focus-row--selected',
    );
    expect(
      screen.getByRole('button', { name: 'Leave “Put bins out” in Backlog' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  /* `selected` is meaningless outside a list that chooses, and a stray true
     must not put a tick on a row that is only being read. */
  it('ignores a selection it was not asked to show', () => {
    renderRow(SHORT_TASK, { selected: true });

    expect(document.querySelector('.focus-row')).not.toHaveClass(
      'focus-row--selected',
    );
    expect(
      screen.getByRole('button', { name: 'Complete “Put bins out”' }),
    ).toBeInTheDocument();
  });

  it('keeps priority on the box while it is choosing', () => {
    renderRow(MEDIUM_TASK, { mode: 'select' });

    expect(document.querySelector('.focus-complete__box')).toHaveClass(
      'focus-complete__box--medium',
    );
  });
});

it('shows list, dates and notes in detailed rows', () => {
  renderRow(
    {
      ...SHORT_TASK,
      status: 'not_started',
      dueDate: '2026-12-20',
      deferUntil: '2026-12-10',
      note: 'Bring the receipt.',
    },
    { details: true },
  );
  expect(screen.getByText('Backlog')).toBeInTheDocument();
  expect(screen.getByText('Due 20-12-2026')).toBeInTheDocument();
  expect(screen.getByText('Hide until 10-12-2026')).toBeInTheDocument();
  expect(screen.getByText('Bring the receipt.')).toBeInTheDocument();
});

it('does not give completed detailed rows a list badge', () => {
  renderRow(DONE_TASK, { details: true });
  expect(screen.queryByText('Backlog')).toBeNull();
  expect(screen.queryByText('Today')).toBeNull();
});

it('shows a priority indicator in the rail of an All card without completion controls', () => {
  renderRow(PROJECT_TASK, { mode: 'view', details: true });
  expect(
    screen.getByRole('img', { name: 'High priority' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button')).toBeNull();
});
