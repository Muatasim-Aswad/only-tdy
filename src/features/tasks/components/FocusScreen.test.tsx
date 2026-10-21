import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FocusDestination } from '../contracts.ts';

import { FocusScreen, type FocusScreenProps } from './FocusScreen.tsx';
import {
  LIST_STATES,
  SCENARIOS,
  type ScenarioName,
} from './testing/fixtures.ts';

const CALLBACKS = {
  onCaptureChange: vi.fn<(value: string) => void>(),
  onCaptureSubmit: vi.fn<() => void>(),
  onSearchChange: vi.fn<(value: string) => void>(),
  onSearchSubmit: vi.fn<() => void>(),
  onToggle: vi.fn<(uid: string) => void>(),
  onNavigate: vi.fn<(destination: FocusDestination) => void>(),
  onRetry: vi.fn<() => void>(),
};

function renderScreen(props: Partial<FocusScreenProps> = {}) {
  render(
    <FocusScreen
      captureValue=""
      searchValue=""
      feedback={{ kind: 'none' }}
      listState={LIST_STATES.today}
      {...CALLBACKS}
      {...props}
    />,
  );
}

describe('FocusScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads in the order it is used: capture, list, way out while feedback floats', () => {
    renderScreen({
      feedback: { kind: 'added-to-backlog', uid: 'task-created' },
    });

    const shell = document.querySelector('.focus-shell');
    const order = [...(shell?.children ?? [])].map(
      (child) => `${child.tagName.toLowerCase()}.${child.classList[0] ?? ''}`,
    );
    expect(order).toEqual([
      'form.focus-capture',
      'div.focus-listing',
      'footer.focus-footer',
    ]);
  });

  it('says Today is clear and links to the backlog with its count', () => {
    renderScreen({
      listState: LIST_STATES.todayWithDone,
      todayClear: { backlogCount: 3 },
    });

    expect(screen.getByRole('status')).toHaveTextContent('Today is clear.');
    expect(
      screen.getByRole('link', { name: 'Plan from Backlog (3)' }),
    ).toHaveAttribute('href', '/only-tdy/backlog');
  });

  it('offers no way to an empty backlog', () => {
    renderScreen({ todayClear: { backlogCount: 0 } });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Today is clear. Nothing waiting in the backlog.',
    );
    expect(
      screen.queryByRole('link', { name: /Plan from Backlog/ }),
    ).toBeNull();
  });

  it('says nothing about clearness while Today has open tasks', () => {
    renderScreen();

    expect(screen.queryByText('Today is clear.', { exact: false })).toBeNull();
  });

  it('parts one finished row from the next in the record', () => {
    renderScreen({ view: 'history', listState: LIST_STATES.backlog });

    expect(screen.getByRole('list')).toHaveClass('focus-list--ruled');
  });

  it('leaves Today unruled: spacing is enough for a short list', () => {
    renderScreen();

    expect(screen.getByRole('list')).not.toHaveClass('focus-list--ruled');
  });

  it('puts the capture field before any task in the tab order', () => {
    renderScreen();

    const focusable = [
      ...document.querySelectorAll<HTMLElement>('a, button, input, textarea'),
    ];
    const captureIndex = focusable.indexOf(
      screen.getByRole('combobox', { name: 'What needs doing?' }),
    );
    const firstCompleteIndex = focusable.findIndex((element) =>
      element.getAttribute('aria-label')?.startsWith('Complete '),
    );

    expect(captureIndex).toBeGreaterThanOrEqual(0);
    expect(captureIndex).toBeLessThan(firstCompleteIndex);
  });

  it('blocks saving but keeps what is typed when offline', () => {
    renderScreen({ ...SCENARIOS.offline });

    // The field stays editable; only the two ways to save are closed.
    expect(
      screen.getByRole('combobox', { name: 'What needs doing?' }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    for (const button of screen.getAllByRole('button', {
      name: /^Complete “/,
    })) {
      expect(button).toBeDisabled();
    }
    expect(
      screen.getByText(
        'You\u2019re offline. Reconnect to load and save tasks.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the entered value after a validation failure', () => {
    renderScreen({ ...SCENARIOS['today-validation-error'] });

    expect(
      screen.getByRole('combobox', { name: 'What needs doing?' }),
    ).toHaveValue('Call the dentist +Hous');
    expect(
      screen.getByText(SCENARIOS['today-validation-error'].feedback.message),
    ).toBeInTheDocument();
  });

  it('renders every scenario in the visual acceptance matrix', () => {
    const names = Object.keys(SCENARIOS) as ScenarioName[];
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const { unmount } = render(
        <FocusScreen {...CALLBACKS} {...SCENARIOS[name]} />,
      );
      expect(document.querySelector('.focus-shell')).not.toBeNull();
      unmount();
    }
  });

  it('asks the record its own question and keeps the way out', () => {
    renderScreen({ ...SCENARIOS.history });

    expect(
      screen.queryByRole('combobox', { name: 'What needs doing?' }),
    ).toBeNull();
    expect(
      screen.getByRole('combobox', { name: 'Search completed tasks' }),
    ).toBeInTheDocument();

    /* Search, list, then the way out. */
    const shell = document.querySelector('.focus-shell');
    const order = [...(shell?.children ?? [])].map(
      (child) => `${child.tagName.toLowerCase()}.${child.classList[0] ?? ''}`,
    );
    expect(order).toEqual([
      'form.focus-capture',
      'div.focus-listing',
      'footer.focus-footer',
    ]);
    expect(screen.getByRole('button', { name: 'Completed tasks' })).toHaveClass(
      'focus-history--active',
    );
  });

  it('keeps the search feedback empty at rest', () => {
    renderScreen({ ...SCENARIOS.history });

    expect(document.querySelector('.focus-feedback')).toBeEmptyDOMElement();
  });

  it('keeps the search feedback empty when no tasks are shown', () => {
    renderScreen({ ...SCENARIOS['history-empty'] });

    expect(document.querySelector('.focus-feedback')).toBeEmptyDOMElement();
  });

  it('shows a refused search in a floating notification', () => {
    renderScreen({
      ...SCENARIOS.history,
      searchMessage: 'No project named \u201CHous\u201D.',
    });

    expect(
      screen.getByText('No project named \u201CHous\u201D.'),
    ).toBeInTheDocument();
  });

  it('reports the record\u2019s search without owning the field', async () => {
    const user = userEvent.setup();
    renderScreen({ ...SCENARIOS.history, searchValue: '#finance' });

    await user.click(
      screen.getByRole('combobox', { name: 'Search completed tasks' }),
    );
    await user.keyboard('{Enter}');

    expect(CALLBACKS.onSearchSubmit).toHaveBeenCalled();
  });

  it('says nothing matched rather than nothing was finished', () => {
    renderScreen({
      ...SCENARIOS['history-empty'],
      searching: true,
      searchValue: 'bulb',
    });

    expect(
      screen.getByText('Nothing completed matches that.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Nothing completed yet.')).toBeNull();
  });

  it('brings the capture field back when history closes', () => {
    renderScreen({ view: 'tasks', captureValue: 'Half a thought' });

    expect(
      screen.getByRole('combobox', { name: 'What needs doing?' }),
    ).toHaveValue('Half a thought');
    expect(screen.getByRole('button', { name: 'More' })).not.toHaveClass(
      'focus-history--active',
    );
  });

  it('says nothing has been completed rather than inviting capture', () => {
    renderScreen({ ...SCENARIOS['history-empty'] });

    expect(screen.getByText('Nothing completed yet.')).toBeInTheDocument();
    expect(
      screen.queryByText('Nothing waiting. Capture the next thing above.'),
    ).toBeNull();
  });
});
