import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BacklogScreen, type BacklogScreenProps } from './BacklogScreen.tsx';
import {
  BACKLOG_TASK,
  BACKLOG_TASKS,
  LIST_STATES,
  MANY_TAGS_TASK,
  WAITING_TASK,
} from './testing/fixtures.ts';

const CALLBACKS = {
  onSearchChange: vi.fn<(value: string) => void>(),
  onSearchSubmit: vi.fn<() => void>(),
  onToggleSelection: vi.fn<(uid: string) => void>(),
  onMove: vi.fn<() => void>(),
  onRetry: vi.fn<() => void>(),
  onNavigate: vi.fn(),
};

function renderScreen(props: Partial<BacklogScreenProps> = {}) {
  render(
    <BacklogScreen
      searchValue=""
      listState={LIST_STATES.backlog}
      searching={false}
      selectedUids={new Set()}
      {...CALLBACKS}
      {...props}
    />,
  );
}

const moveButton = () => screen.getByRole('button', { name: 'Move to Today' });
const queryMoveButton = () =>
  screen.queryByRole('button', { name: 'Move to Today' });

describe('BacklogScreen', () => {
  it('reads in the order it is used: field, what is chosen, list, way out', () => {
    renderScreen();

    const shell = document.querySelector('.focus-shell');
    const order = [...(shell?.children ?? [])].map(
      (child) => `${child.tagName.toLowerCase()}.${child.classList[0] ?? ''}`,
    );
    expect(order).toEqual([
      'form.focus-capture',
      'div.focus-backlog__actions',
      'div.focus-listing',
      'footer.focus-footer',
    ]);
  });

  it('parts one row from the next, so a choice is made against a list', () => {
    renderScreen();

    expect(screen.getByRole('list')).toHaveClass('focus-list--ruled');
  });

  it('lights the backlog mark and leaves the record’s alone', () => {
    renderScreen();

    expect(screen.getByRole('button', { name: 'Backlog' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'More' })).not.toHaveClass(
      'focus-history--active',
    );
    expect(screen.getByRole('button', { name: 'Backlog' })).toHaveAttribute(
      'title',
      'Backlog',
    );
  });

  it('chooses rather than ticks, and says what the next press will do', () => {
    renderScreen();

    expect(
      screen.getByRole('button', {
        name: `Add “${BACKLOG_TASK.title}” to Today`,
      }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /^Complete “/ })).toBeNull();
  });

  it('keeps the action line empty until something is chosen', () => {
    renderScreen();

    expect(
      document.querySelector('.focus-backlog__status'),
    ).toBeEmptyDOMElement();
  });

  it('keeps the action line empty on a list with nothing to select', () => {
    renderScreen({ listState: LIST_STATES.empty });

    expect(
      document.querySelector('.focus-backlog__status'),
    ).toBeEmptyDOMElement();
  });

  it('draws the choice as a circle rather than the completion box', () => {
    renderScreen();

    const mark = screen
      .getByRole('button', { name: `Add “${BACKLOG_TASK.title}” to Today` })
      .querySelector('.focus-complete__box');
    expect(mark).toHaveClass('focus-complete__box--choice');
  });

  it('lifts the chosen rows to the top of the list', () => {
    renderScreen({ selectedUids: new Set([WAITING_TASK.uid]) });

    const titles = [...document.querySelectorAll('.focus-row__title')].map(
      (node) => node.textContent,
    );
    expect(titles[0]).toBe(WAITING_TASK.title);
    expect(titles).toHaveLength(BACKLOG_TASKS.length);
  });

  it('offers the move only once something is chosen, and counts it', async () => {
    const user = userEvent.setup();
    renderScreen({ selectedUids: new Set([BACKLOG_TASK.uid]) });

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(moveButton()).toBeEnabled();

    await user.click(moveButton());
    expect(CALLBACKS.onMove).toHaveBeenCalledOnce();
  });

  it('keeps the line’s height so choosing a row never moves the list', () => {
    renderScreen();

    expect(queryMoveButton()).toBeNull();
    // The region is in the document at rest, empty and already spaced for.
    expect(
      document.querySelector('.focus-backlog__actions'),
    ).toBeInTheDocument();
    expect(document.querySelector('.focus-backlog__status')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('marks a chosen row and leaves the rest of the list alone', () => {
    renderScreen({ selectedUids: new Set([MANY_TAGS_TASK.uid]) });

    const rows = [...document.querySelectorAll('.focus-row')];
    const selected = rows.filter((row) =>
      row.classList.contains('focus-row--selected'),
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]?.textContent).toContain(MANY_TAGS_TASK.title);
    expect(
      screen.getByRole('button', {
        name: `Leave “${MANY_TAGS_TASK.title}” in Backlog`,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('says which kind of empty an empty list is', () => {
    renderScreen({ listState: LIST_STATES.empty });
    expect(
      screen.getByText('Nothing waiting in the backlog.'),
    ).toBeInTheDocument();
  });

  it('says a search found nothing rather than that the backlog is empty', () => {
    renderScreen({ listState: LIST_STATES.empty, searching: true });
    expect(
      screen.getByText('Nothing in the backlog matches that.'),
    ).toBeInTheDocument();
  });

  it('puts a refused search where the question was asked', () => {
    renderScreen({
      listState: LIST_STATES.empty,
      searching: true,
      message: 'No project named “Hous”.',
      searchValue: '+Hous',
    });

    expect(screen.getByText('No project named “Hous”.')).toBeInTheDocument();
  });

  it('withholds choosing and moving offline without hiding either', () => {
    renderScreen({
      selectedUids: new Set([BACKLOG_TASK.uid]),
      disabled: true,
      message: 'You’re offline. Reconnect to move tasks to Today.',
    });

    expect(moveButton()).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: `Leave “${BACKLOG_TASK.title}” in Backlog`,
      }),
    ).toBeDisabled();
    expect(screen.getByText(/You’re offline/)).toBeInTheDocument();
  });

  it('holds the move while it is in flight', () => {
    renderScreen({
      selectedUids: new Set([BACKLOG_TASK.uid]),
      moving: true,
    });

    expect(moveButton()).toBeDisabled();
  });

  it('offers the way out of an expired session, not a retry', () => {
    renderScreen({ listState: LIST_STATES.sessionExpired });

    expect(
      screen.getByRole('link', { name: 'Open Tududi to sign in' }),
    ).toHaveAttribute('href', '/login');
  });

  it('every row still opens its own page', () => {
    renderScreen();

    expect(
      screen.getByRole('link', { name: BACKLOG_TASK.title }),
    ).toHaveAttribute('href', `/only-tdy/task/${BACKLOG_TASK.uid}`);
  });

  it('keeps search results within the backlog', () => {
    renderScreen();
    expect(screen.queryByRole('heading', { name: 'Today' })).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'View completed tasks' }),
    ).toBeNull();
  });
});
