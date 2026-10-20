import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FocusDestination } from '../contracts.ts';

import { FocusFooter } from './FocusFooter.tsx';

function marks(): readonly HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '.focus-footer > button, .focus-more > button',
    ),
  ];
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('FocusFooter', () => {
  it('reads outward from home: home, waiting, then the rest behind three dots', () => {
    render(<FocusFooter current="tasks" onNavigate={vi.fn()} />);

    expect(marks().map((mark) => mark.getAttribute('aria-label'))).toEqual([
      'Today',
      'Backlog',
      'All tasks',
      'More',
    ]);
    expect(
      screen.queryByRole('button', { name: 'Completed tasks' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /^Theme: / })).toBeNull();
  });

  it('lights only the mark of the page on screen', () => {
    render(<FocusFooter current="backlog" onNavigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Backlog' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'More' })).not.toHaveClass(
      'focus-history--active',
    );
  });

  it('shows the record icon while its page is on screen', () => {
    render(<FocusFooter current="history" onNavigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'More' })).not.toHaveClass(
      'focus-history--active',
    );
    expect(
      screen.getByRole('button', { name: 'Completed tasks' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps All tasks on the rail and uses the shared active state', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn<(destination: FocusDestination) => void>();
    const { unmount } = render(
      <FocusFooter current="tasks" onNavigate={onNavigate} />,
    );
    expect(screen.getByRole('button', { name: 'All tasks' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await user.click(screen.getByRole('button', { name: 'All tasks' }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('all');
    unmount();

    render(<FocusFooter current="all" onNavigate={onNavigate} />);
    expect(screen.getByRole('button', { name: 'All tasks' })).toHaveClass(
      'focus-history--active',
    );
    expect(screen.getByRole('button', { name: 'All tasks' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getAllByRole('button', { name: 'All tasks' })).toHaveLength(
      1,
    );
    expect(
      await screen.findByRole('button', { name: 'Completed tasks' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('asks for the main page when home is pressed from another list', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn<(destination: FocusDestination) => void>();
    render(<FocusFooter current="history" onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: 'Today' }));

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('tasks');
  });

  it('opens the record from the menu and closes behind it', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn<(destination: FocusDestination) => void>();
    render(<FocusFooter current="tasks" onNavigate={onNavigate} />);

    const more = screen.getByRole('button', { name: 'More' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');

    await user.click(
      await screen.findByRole('button', { name: 'Completed tasks' }),
    );

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('history');
    expect(
      screen.queryByRole('button', { name: 'Completed tasks' }),
    ).toBeNull();
  });

  it('puts preferences behind one Settings destination', async () => {
    const user = userEvent.setup();
    render(<FocusFooter current="tasks" onNavigate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(
      await screen.findByRole('link', { name: 'Settings' }),
    ).toHaveAttribute('href', '/only-tdy/settings');
    expect(screen.queryByRole('button', { name: /^Theme: / })).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: 'Automatically move due tasks to Today',
      }),
    ).toBeNull();
  });

  it('closes on Escape and hands focus back to the dots', async () => {
    const user = userEvent.setup();
    render(<FocusFooter current="tasks" onNavigate={vi.fn()} />);

    const more = screen.getByRole('button', { name: 'More' });
    await user.click(more);
    await user.keyboard('{Escape}');

    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveFocus();
  });
});
